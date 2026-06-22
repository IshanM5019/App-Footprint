import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { demoDrafts } from "@/data/demoData";
import type { LocationDraft } from "@/types/database";

export function useDrafts() {
  const { user, isDemo } = useAuth();
  const [drafts, setDrafts] = useState<LocationDraft[]>([]);
  const [loading, setLoading] = useState(true);

  // Fetch drafts
  useEffect(() => {
    if (!user) {
      const t = setTimeout(() => {
        setDrafts([]);
        setLoading(false);
      }, 0);
      return () => clearTimeout(t);
    }

    // Demo mode → use local data
    if (isDemo) {
      const t = setTimeout(() => {
        setDrafts(demoDrafts);
        setLoading(false);
      }, 0);
      return () => clearTimeout(t);
    }

    const fetchDrafts = async () => {
      setLoading(true);
      const { data, error } = await supabase
        .from("location_drafts")
        .select("*")
        .eq("user_id", user.id)
        .order("visited_at", { ascending: false });

      if (!error && data) {
        setDrafts(data as LocationDraft[]);
      }
      setLoading(false);
    };

    fetchDrafts();

    // Realtime subscription for draft status changes
    const channel = supabase
      .channel(`drafts-changes-${Math.random().toString(36).substring(2, 9)}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "location_drafts",
          filter: `user_id=eq.${user.id}`,
        },
        (payload) => {
          if (payload.eventType === "INSERT") {
            setDrafts((prev) => [payload.new as LocationDraft, ...prev]);
          } else if (payload.eventType === "UPDATE") {
            setDrafts((prev) =>
              prev.map((d) =>
                d.id === (payload.new as LocationDraft).id
                  ? (payload.new as LocationDraft)
                  : d
              )
            );
          } else if (payload.eventType === "DELETE") {
            setDrafts((prev) =>
              prev.filter((d) => d.id !== (payload.old as { id: string }).id)
            );
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user, isDemo]);

  // Derived state
  const pending = drafts.filter((d) => d.status === "pending");
  const approved = drafts.filter((d) => d.status === "approved");
  const dismissed = drafts.filter((d) => d.status === "dismissed");

  // Approve draft → creates public footprint (server-side atomic)
  const approveDraft = useCallback(
    async (draftId: string) => {
      // Optimistic update
      setDrafts((prev) =>
        prev.map((d) => (d.id === draftId ? { ...d, status: "approved" as const } : d))
      );

      // In demo mode, just keep the local state change
      if (isDemo) return { error: null };

      const { error } = await supabase.rpc("approve_draft", {
        p_draft_id: draftId,
      });

      if (error) {
        // Rollback
        setDrafts((prev) =>
          prev.map((d) =>
            d.id === draftId ? { ...d, status: "pending" as const } : d
          )
        );
        console.error("Failed to approve draft:", error.message);
        return { error: error.message };
      }

      return { error: null };
    },
    [isDemo]
  );

  // Dismiss draft
  const dismissDraft = useCallback(
    async (draftId: string) => {
      // Optimistic update
      setDrafts((prev) =>
        prev.map((d) =>
          d.id === draftId ? { ...d, status: "dismissed" as const } : d
        )
      );

      // In demo mode, just keep the local state change
      if (isDemo) return { error: null };

      const { error } = await supabase
        .from("location_drafts")
        .update({ status: "dismissed" })
        .eq("id", draftId);

      if (error) {
        // Rollback
        setDrafts((prev) =>
          prev.map((d) =>
            d.id === draftId ? { ...d, status: "pending" as const } : d
          )
        );
        console.error("Failed to dismiss draft:", error.message);
        return { error: error.message };
      }

      return { error: null };
    },
    [isDemo]
  );

  // Create new draft (called by background location tracker)
  const createDraft = useCallback(
    async (draft: Omit<LocationDraft, "id" | "user_id" | "created_at" | "status">) => {
      if (!user) return { data: null, error: "Not logged in" };

      const newDraft: LocationDraft = {
        id: `draft-${Date.now()}`,
        user_id: user.id,
        venue_name: draft.venue_name,
        address: draft.address,
        category: draft.category,
        latitude: draft.latitude,
        longitude: draft.longitude,
        visited_at: draft.visited_at,
        status: "pending",
        created_at: new Date().toISOString(),
      };

      if (isDemo) {
        setDrafts((prev) => [newDraft, ...prev]);
        return { data: newDraft, error: null };
      }

      const { data, error } = await supabase
        .from("location_drafts")
        .insert({
          user_id: user.id,
          venue_name: draft.venue_name,
          address: draft.address,
          category: draft.category,
          latitude: draft.latitude,
          longitude: draft.longitude,
          visited_at: draft.visited_at,
          status: "pending",
        })
        .select()
        .single();

      if (error) {
        console.error("Failed to create draft:", error.message);
        return { data: null, error: error.message };
      }

      setDrafts((prev) => {
        if (prev.some((d) => d.id === data.id)) return prev;
        return [data as LocationDraft, ...prev];
      });

      return { data: data as LocationDraft, error: null };
    },
    [user, isDemo]
  );

  return { drafts, pending, approved, dismissed, loading, approveDraft, dismissDraft, createDraft };
}
