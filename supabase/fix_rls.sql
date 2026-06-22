-- ============================================================
-- Fix: Allow participants to see ALL rows in a conversation
--      they belong to (needed to find the other user's ID)
-- ============================================================

-- Drop the overly restrictive policy that only shows your own row
DROP POLICY IF EXISTS "participants_select" ON conversation_participants;

-- New policy: you can see any participant row if you are also
-- a participant in that same conversation
CREATE POLICY "participants_select" ON conversation_participants
  FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM conversation_participants cp2
      WHERE cp2.conversation_id = conversation_participants.conversation_id
        AND cp2.user_id = auth.uid()
    )
  );
