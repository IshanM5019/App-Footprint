import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { demoPlaces } from "@/data/demoData";
import type { FootprintWithProfile, Place, PlaceCategory } from "@/types/database";
import { footprintToPlace } from "@/types/database";

export function useFootprints() {
  const { user, isDemo, profile } = useAuth();
  const [footprints, setFootprints] = useState<FootprintWithProfile[]>([]);
  const [places, setPlaces] = useState<Place[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) {
      const t = setTimeout(() => {
        setFootprints([]);
        setPlaces([]);
        setLoading(false);
      }, 0);
      return () => clearTimeout(t);
    }

    // Demo mode → use local data
    if (isDemo) {
      const t = setTimeout(() => {
        setPlaces(demoPlaces);
        setLoading(false);
      }, 0);
      return () => clearTimeout(t);
    }

    const fetchFootprints = async () => {
      setLoading(true);
      const { data, error } = await supabase
        .from("public_footprints")
        .select(`
          *,
          profiles!public_footprints_user_id_fkey (
            id, username, full_name, avatar_url
          )
        `)
        .order("pinned_at", { ascending: false });

      if (!error && data) {
        const fps = data as FootprintWithProfile[];
        setFootprints(fps);
        const dbPlaces = fps.map(footprintToPlace);
        // Merge demo places as community content so the feed is never empty
        const dbIds = new Set(dbPlaces.map((p) => p.id));
        const merged = [...dbPlaces, ...demoPlaces.filter((dp) => !dbIds.has(dp.id))];
        setPlaces(merged);
      } else {
        // DB error or no data → show demo places as fallback
        setPlaces(demoPlaces);
      }
      setLoading(false);
    };

    fetchFootprints();

    // Realtime: new footprints appearing on the map
    const channel = supabase
      .channel(`footprints-realtime-${Math.random().toString(36).substring(2, 9)}`)
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "public_footprints",
        },
        async (payload) => {
          // Fetch the full row with profile join
          const { data } = await supabase
            .from("public_footprints")
            .select(`
              *,
              profiles!public_footprints_user_id_fkey (
                id, username, full_name, avatar_url
              )
            `)
            .eq("id", (payload.new as { id: string }).id)
            .single();

          if (data) {
            const fp = data as FootprintWithProfile;
            setFootprints((prev) => [fp, ...prev]);
            setPlaces((prev) => [footprintToPlace(fp), ...prev]);
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user, isDemo]);

  const createFootprint = useCallback(
    async (footprint: {
      venue_name: string;
      address: string;
      category: PlaceCategory;
      latitude: number;
      longitude: number;
      review_text: string;
      photo_urls: string[];
    }) => {
      if (!user) return { data: null, error: "Not logged in" };

      if (isDemo) {
        const id = `fp-${Date.now()}`;
        const profileName = profile?.full_name ?? user?.user_metadata?.full_name ?? "You";
        const initials = profileName.split(" ").map((n: string) => n[0]).join("").toUpperCase().slice(0, 2);

        const newPlace: Place = {
          id,
          name: footprint.venue_name,
          address: footprint.address,
          lat: footprint.latitude,
          lng: footprint.longitude,
          visitor: profileName,
          visitorAvatar: initials,
          visitDate: new Date().toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" }),
          description: footprint.review_text,
          photoColor: footprint.photo_urls[0] ?? "from-purple-500 to-indigo-700",
          category: footprint.category,
          isPublic: true,
          userId: user.id,
        };

        setPlaces((prev) => [newPlace, ...prev]);
        return { data: newPlace, error: null };
      }

      const { data, error } = await supabase
        .from("public_footprints")
        .insert({
          user_id: user.id,
          venue_name: footprint.venue_name,
          address: footprint.address,
          category: footprint.category,
          latitude: footprint.latitude,
          longitude: footprint.longitude,
          review_text: footprint.review_text,
          photo_urls: footprint.photo_urls,
        })
        .select()
        .single();

      if (error) {
        console.error("Failed to publish footprint:", error.message);
        return { data: null, error: error.message };
      }

      return { data, error: null };
    },
    [user, isDemo, profile?.full_name]
  );

  return { footprints, places, loading, createFootprint };
}
