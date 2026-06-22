-- ============================================================
-- COMPLETE RESET — Run this to fix "Database error saving new user"
-- This drops ALL Footprints tables and recreates them WITHOUT
-- the problematic trigger. Profile creation is handled by the app.
-- ============================================================

-- Drop everything in reverse dependency order
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
DROP FUNCTION IF EXISTS handle_new_user();
DROP FUNCTION IF EXISTS handle_updated_at();
DROP FUNCTION IF EXISTS approve_draft(UUID);
DROP FUNCTION IF EXISTS get_or_create_conversation(UUID);

DROP TABLE IF EXISTS messages CASCADE;
DROP TABLE IF EXISTS conversation_participants CASCADE;
DROP TABLE IF EXISTS conversations CASCADE;
DROP TABLE IF EXISTS public_footprints CASCADE;
DROP TABLE IF EXISTS location_drafts CASCADE;
DROP TABLE IF EXISTS profiles CASCADE;

-- ── 1. Profiles ──────────────────────────────────────────────

CREATE TABLE profiles (
  id         UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  username   TEXT UNIQUE NOT NULL,
  full_name  TEXT,
  avatar_url TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- ── 2. Location Drafts ───────────────────────────────────────

CREATE TABLE location_drafts (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id    UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  venue_name TEXT NOT NULL,
  address    TEXT,
  category   TEXT CHECK (category IN ('cafe','park','restaurant','landmark','museum','bar')),
  latitude   FLOAT8 NOT NULL,
  longitude  FLOAT8 NOT NULL,
  visited_at TIMESTAMPTZ DEFAULT now(),
  status     TEXT DEFAULT 'pending' CHECK (status IN ('pending','approved','dismissed')),
  created_at TIMESTAMPTZ DEFAULT now()
);

-- ── 3. Public Footprints ─────────────────────────────────────

CREATE TABLE public_footprints (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  draft_id    UUID UNIQUE REFERENCES location_drafts(id),
  venue_name  TEXT NOT NULL,
  address     TEXT,
  category    TEXT CHECK (category IN ('cafe','park','restaurant','landmark','museum','bar')),
  latitude    FLOAT8 NOT NULL,
  longitude   FLOAT8 NOT NULL,
  review_text TEXT,
  photo_urls  TEXT[] DEFAULT '{}',
  pinned_at   TIMESTAMPTZ DEFAULT now()
);

-- ── 4. Conversations ─────────────────────────────────────────

CREATE TABLE conversations (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  footprint_id UUID NOT NULL REFERENCES public_footprints(id) ON DELETE CASCADE,
  created_at   TIMESTAMPTZ DEFAULT now()
);

-- ── 5. Conversation Participants ─────────────────────────────

CREATE TABLE conversation_participants (
  conversation_id UUID NOT NULL REFERENCES conversations(id) ON DELETE CASCADE,
  user_id         UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  joined_at       TIMESTAMPTZ DEFAULT now(),
  PRIMARY KEY (conversation_id, user_id)
);

-- ── 6. Messages ──────────────────────────────────────────────

CREATE TABLE messages (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  conversation_id UUID NOT NULL REFERENCES conversations(id) ON DELETE CASCADE,
  sender_id       UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  text_content    TEXT NOT NULL,
  created_at      TIMESTAMPTZ DEFAULT now()
);

-- ============================================================
-- ROW LEVEL SECURITY
-- ============================================================

ALTER TABLE profiles                 ENABLE ROW LEVEL SECURITY;
ALTER TABLE location_drafts          ENABLE ROW LEVEL SECURITY;
ALTER TABLE public_footprints        ENABLE ROW LEVEL SECURITY;
ALTER TABLE conversations            ENABLE ROW LEVEL SECURITY;
ALTER TABLE conversation_participants ENABLE ROW LEVEL SECURITY;
ALTER TABLE messages                 ENABLE ROW LEVEL SECURITY;

-- Profiles
CREATE POLICY "profiles_select" ON profiles FOR SELECT TO authenticated USING (true);
CREATE POLICY "profiles_insert" ON profiles FOR INSERT TO authenticated WITH CHECK (id = auth.uid());
CREATE POLICY "profiles_update" ON profiles FOR UPDATE TO authenticated USING (id = auth.uid()) WITH CHECK (id = auth.uid());
CREATE POLICY "profiles_delete" ON profiles FOR DELETE TO authenticated USING (id = auth.uid());

-- Location Drafts (PRIVATE)
CREATE POLICY "drafts_select" ON location_drafts FOR SELECT TO authenticated USING (user_id = auth.uid());
CREATE POLICY "drafts_insert" ON location_drafts FOR INSERT TO authenticated WITH CHECK (user_id = auth.uid());
CREATE POLICY "drafts_update" ON location_drafts FOR UPDATE TO authenticated USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());
CREATE POLICY "drafts_delete" ON location_drafts FOR DELETE TO authenticated USING (user_id = auth.uid());

-- Public Footprints
CREATE POLICY "footprints_select" ON public_footprints FOR SELECT TO authenticated USING (true);
CREATE POLICY "footprints_insert" ON public_footprints FOR INSERT TO authenticated WITH CHECK (user_id = auth.uid());
CREATE POLICY "footprints_update" ON public_footprints FOR UPDATE TO authenticated USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());
CREATE POLICY "footprints_delete" ON public_footprints FOR DELETE TO authenticated USING (user_id = auth.uid());

-- Conversations
CREATE POLICY "convos_select" ON conversations FOR SELECT TO authenticated
  USING (EXISTS (SELECT 1 FROM conversation_participants cp WHERE cp.conversation_id = id AND cp.user_id = auth.uid()));

-- Conversation Participants
CREATE POLICY "participants_select" ON conversation_participants FOR SELECT TO authenticated USING (user_id = auth.uid());

-- Messages
CREATE POLICY "messages_select" ON messages FOR SELECT TO authenticated
  USING (EXISTS (SELECT 1 FROM conversation_participants cp WHERE cp.conversation_id = messages.conversation_id AND cp.user_id = auth.uid()));
CREATE POLICY "messages_insert" ON messages FOR INSERT TO authenticated
  WITH CHECK (sender_id = auth.uid() AND EXISTS (SELECT 1 FROM conversation_participants cp WHERE cp.conversation_id = messages.conversation_id AND cp.user_id = auth.uid()));

-- ============================================================
-- FUNCTIONS (no triggers!)
-- ============================================================

CREATE OR REPLACE FUNCTION approve_draft(p_draft_id UUID)
RETURNS public_footprints
LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE
  v_draft  location_drafts;
  v_result public_footprints;
BEGIN
  SELECT * INTO v_draft FROM location_drafts WHERE id = p_draft_id AND user_id = auth.uid();
  IF NOT FOUND THEN RAISE EXCEPTION 'Draft not found or not owned by you'; END IF;
  IF v_draft.status != 'pending' THEN RAISE EXCEPTION 'Draft is not pending'; END IF;
  UPDATE location_drafts SET status = 'approved' WHERE id = p_draft_id;
  INSERT INTO public_footprints (user_id, draft_id, venue_name, address, category, latitude, longitude)
  VALUES (v_draft.user_id, v_draft.id, v_draft.venue_name, v_draft.address, v_draft.category, v_draft.latitude, v_draft.longitude)
  RETURNING * INTO v_result;
  RETURN v_result;
END;
$$;

CREATE OR REPLACE FUNCTION get_or_create_conversation(p_footprint_id UUID)
RETURNS UUID
LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE
  v_footprint_owner UUID;
  v_convo_id UUID;
  v_current_user UUID := auth.uid();
BEGIN
  SELECT user_id INTO v_footprint_owner FROM public_footprints WHERE id = p_footprint_id;
  IF NOT FOUND THEN RAISE EXCEPTION 'Footprint not found'; END IF;
  IF v_footprint_owner = v_current_user THEN RAISE EXCEPTION 'Cannot start a conversation with yourself'; END IF;
  SELECT c.id INTO v_convo_id FROM conversations c JOIN conversation_participants cp ON cp.conversation_id = c.id WHERE c.footprint_id = p_footprint_id AND cp.user_id = v_current_user;
  IF FOUND THEN RETURN v_convo_id; END IF;
  INSERT INTO conversations (footprint_id) VALUES (p_footprint_id) RETURNING id INTO v_convo_id;
  INSERT INTO conversation_participants (conversation_id, user_id) VALUES (v_convo_id, v_current_user), (v_convo_id, v_footprint_owner);
  RETURN v_convo_id;
END;
$$;

-- Realtime
ALTER PUBLICATION supabase_realtime ADD TABLE messages;
ALTER PUBLICATION supabase_realtime ADD TABLE public_footprints;
