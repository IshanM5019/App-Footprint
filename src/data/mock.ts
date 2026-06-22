// ============================================================
// Footprints — Utilities (formerly mock data)
// ============================================================
// The hardcoded mock arrays have been replaced by Supabase queries.
// This file now only contains static utility maps.

import type { PlaceCategory } from "@/types/database";

// ── Category Icons (emoji) ───────────────────────────────────
export const categoryIcons: Record<PlaceCategory, string> = {
  cafe: "☕",
  park: "🌳",
  restaurant: "🍜",
  landmark: "⛩️",
  museum: "🎨",
  bar: "🍸",
  hotel: "🏨",
};
