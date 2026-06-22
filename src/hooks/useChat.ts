import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { demoConversations, demoMessages } from "@/data/demoData";
import type { Message, ConversationWithContext } from "@/types/database";

// ── Helpers ───────────────────────────────────────────────────

/** Returns true for demo/mock IDs that should never hit the DB */
function isDemoId(id: string): boolean {
  // Demo conversation IDs look like "c1", "c2", etc. (short, no hyphens)
  // Real Supabase UUIDs are 36 chars with hyphens: xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx
  return !id.includes("-");
}

// ── useConversations: list all conversations ─────────────────

export function useConversations() {
  const { user, isDemo } = useAuth();
  const [conversations, setConversations] = useState<ConversationWithContext[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) {
      const t = setTimeout(() => {
        setConversations([]);
        setLoading(false);
      }, 0);
      return () => clearTimeout(t);
    }

    // Demo mode → use local data
    if (isDemo) {
      const t = setTimeout(() => {
        setConversations(demoConversations);
        setLoading(false);
      }, 0);
      return () => clearTimeout(t);
    }

    const fetchAll = async () => {
      setLoading(true);

      // Get conversations where the current user is a participant
      const { data: participations, error: pErr } = await supabase
        .from("conversation_participants")
        .select("conversation_id")
        .eq("user_id", user.id);

      if (pErr) {
        console.error("[useChat] Failed to load participations:", pErr.message);
        setConversations([]);
        setLoading(false);
        return;
      }

      if (!participations || participations.length === 0) {
        // No DB conversations yet — show demo conversations as fallback
        setConversations(demoConversations);
        setLoading(false);
        return;
      }

      const convoIds = participations.map((p) => p.conversation_id);

      // Fetch full conversation data with footprint join
      const { data: convos, error: cErr } = await supabase
        .from("conversations")
        .select(`
          id,
          footprint_id,
          created_at,
          public_footprints!conversations_footprint_id_fkey (
            id, venue_name, address, category, latitude, longitude, photo_urls
          )
        `)
        .in("id", convoIds)
        .order("created_at", { ascending: false });

      if (cErr || !convos) {
        console.error("[useChat] Failed to load conversations:", cErr?.message);
        setConversations([]);
        setLoading(false);
        return;
      }

      // For each conversation, get the other participant and last message
      const enriched: ConversationWithContext[] = [];

      for (const convo of convos) {
        // Find the other participant's user_id from the participants table.
        // The participants_select RLS only lets us see our own row, so we
        // fetch all participants for this convo and the DB returns only ours.
        // Instead, we look up footprint owner via the footprint itself.
        const footprint = convo.public_footprints as unknown as ConversationWithContext["footprint"];
        if (!footprint) continue;

        // Get all participant IDs for this conversation using the footprint owner
        // approach: fetch participants for this convo (we can see our own row),
        // then get the other user from the footprint owner field via profiles.
        const { data: allParticipants } = await supabase
          .from("conversation_participants")
          .select("user_id")
          .eq("conversation_id", convo.id);

        // Find the other user's ID (not ours)
        const otherUserId = allParticipants
          ?.map((p) => p.user_id)
          .find((id) => id !== user.id);

        let otherUser: ConversationWithContext["otherUser"] | undefined;

        if (otherUserId) {
          // Fetch other user's profile directly
          const { data: profile } = await supabase
            .from("profiles")
            .select("id, username, full_name, avatar_url")
            .eq("id", otherUserId)
            .single();
          if (profile) {
            otherUser = profile as ConversationWithContext["otherUser"];
          }
        }

        // If RLS blocks seeing other participant, fallback: get footprint owner's profile
        if (!otherUser) {
          const { data: fpOwner } = await supabase
            .from("public_footprints")
            .select("user_id")
            .eq("id", convo.footprint_id)
            .single();

          if (fpOwner && fpOwner.user_id !== user.id) {
            const { data: profile } = await supabase
              .from("profiles")
              .select("id, username, full_name, avatar_url")
              .eq("id", fpOwner.user_id)
              .single();
            if (profile) {
              otherUser = profile as ConversationWithContext["otherUser"];
            }
          }
        }

        // Get last message
        const { data: lastMsgArr } = await supabase
          .from("messages")
          .select("text_content, created_at, sender_id")
          .eq("conversation_id", convo.id)
          .order("created_at", { ascending: false })
          .limit(1);

        const lastMessage = lastMsgArr?.[0] ?? null;

        // Count messages from others (unread approximation)
        const { count } = await supabase
          .from("messages")
          .select("id", { count: "exact", head: true })
          .eq("conversation_id", convo.id)
          .neq("sender_id", user.id);

        if (otherUser && footprint) {
          enriched.push({
            id: convo.id,
            footprint_id: convo.footprint_id,
            created_at: convo.created_at,
            footprint,
            otherUser,
            lastMessage,
            unreadCount: Math.min(count ?? 0, 9),
          });
        }
      }

      // Merge demo conversations so mock travelers are always available
      const enrichedIds = new Set(enriched.map((c) => c.id));
      const mergedConvos = [...enriched, ...demoConversations.filter((dc) => !enrichedIds.has(dc.id))];
      setConversations(mergedConvos);
      setLoading(false);
    };

    fetchAll();
  }, [user, isDemo]);

  return { conversations, loading };
}

// ── useMessages: messages for a specific conversation ────────

export function useMessages(conversationId: string | null) {
  const { user, isDemo } = useAuth();
  const [messages, setMessages] = useState<Message[]>([]);
  const [loading, setLoading] = useState(false);

  // Fetch existing messages
  useEffect(() => {
    if (!conversationId || !user) {
      const t = setTimeout(() => {
        setMessages([]);
      }, 0);
      return () => clearTimeout(t);
    }

    // Demo mode or mock conversation ID → use local data
    if (isDemo || isDemoId(conversationId)) {
      const t = setTimeout(() => {
        setMessages(demoMessages[conversationId] ?? []);
        setLoading(false);
      }, 0);
      return () => clearTimeout(t);
    }

    const fetchMessages = async () => {
      setLoading(true);
      const { data, error } = await supabase
        .from("messages")
        .select("*")
        .eq("conversation_id", conversationId)
        .order("created_at", { ascending: true });

      if (error) {
        console.error("[useChat] Failed to load messages:", error.message);
      }

      setMessages((data as Message[]) ?? []);
      setLoading(false);
    };

    fetchMessages();

    // Realtime subscription for new messages in this conversation
    const channel = supabase
      .channel(`messages-${conversationId}-${Math.random().toString(36).substring(2, 9)}`)
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "messages",
          filter: `conversation_id=eq.${conversationId}`,
        },
        (payload) => {
          const newMsg = payload.new as Message;
          setMessages((prev) => {
            // Deduplicate
            if (prev.some((m) => m.id === newMsg.id)) return prev;
            return [...prev, newMsg];
          });
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [conversationId, user, isDemo]);

  // Send a message
  const sendMessage = useCallback(
    async (text: string) => {
      if (!conversationId || !user) return;

      // Demo mode or mock conversation ID → just add to local state
      if (isDemo || isDemoId(conversationId)) {
        const demoMsg: Message = {
          id: `demo-${Date.now()}`,
          conversation_id: conversationId,
          sender_id: user.id,
          text_content: text,
          created_at: new Date().toISOString(),
        };
        setMessages((prev) => [...prev, demoMsg]);
        return;
      }

      const { error } = await supabase.from("messages").insert({
        conversation_id: conversationId,
        sender_id: user.id,
        text_content: text,
      });

      if (error) {
        console.error("Failed to send message:", error.message);
      }
      // Real-time subscription will pick up the new message automatically
    },
    [conversationId, user, isDemo]
  );

  return { messages, loading, sendMessage };
}

// ── startInquiry: find or create a conversation ──────────────

export function useInquiry() {
  const { isDemo } = useAuth();
  const [loading, setLoading] = useState(false);

  const startInquiry = useCallback(async (footprintId: string) => {
    // Demo mode or mock footprint ID → find matching demo conversation
    // Always check demo IDs first (even for DB users) since feed merges demo places
    if (isDemo || isDemoId(footprintId)) {
      const match = demoConversations.find((c) => c.footprint_id === footprintId);
      if (match) {
        return { conversationId: match.id, error: null };
      }
      // If no demo conversation match, fall through to DB if not in demo mode
      if (isDemo) {
        return { conversationId: null, error: null };
      }
    }

    setLoading(true);
    const { data, error } = await supabase.rpc("get_or_create_conversation", {
      p_footprint_id: footprintId,
    });

    setLoading(false);

    if (error) {
      console.error("Failed to start inquiry:", error.message);
      return { conversationId: null, error: error.message };
    }

    return { conversationId: data as string, error: null };
  }, [isDemo]);

  return { startInquiry, loading };
}
