// ============================================================
// Footprints — Database Types (mirrors Supabase schema)
// ============================================================

// ── Row Types (match DB columns exactly) ─────────────────────

export interface Profile {
  id: string;           // UUID, references auth.users
  username: string;
  full_name: string | null;
  avatar_url: string | null;
  created_at: string;
  updated_at: string;
}

export interface LocationDraft {
  id: string;
  user_id: string;
  venue_name: string;
  address: string | null;
  category: PlaceCategory;
  latitude: number;
  longitude: number;
  visited_at: string;
  status: DraftStatus;
  created_at: string;
}

export interface PublicFootprint {
  id: string;
  user_id: string;
  draft_id: string | null;
  venue_name: string;
  address: string | null;
  category: PlaceCategory;
  latitude: number;
  longitude: number;
  review_text: string | null;
  photo_urls: string[];
  pinned_at: string;
}

export interface Conversation {
  id: string;
  footprint_id: string;
  created_at: string;
}

export interface ConversationParticipant {
  conversation_id: string;
  user_id: string;
  joined_at: string;
}

export interface Message {
  id: string;
  conversation_id: string;
  sender_id: string;
  text_content: string;
  created_at: string;
}

// ── Enum Types ───────────────────────────────────────────────

export type PlaceCategory = "cafe" | "park" | "restaurant" | "landmark" | "museum" | "bar" | "hotel";
export type DraftStatus = "pending" | "approved" | "dismissed";

// ── Joined / View-model Types (for frontend use) ─────────────

/** A footprint joined with the visitor's profile — used on the map */
export interface FootprintWithProfile extends PublicFootprint {
  profiles: Pick<Profile, "id" | "username" | "full_name" | "avatar_url">;
}

/** A conversation joined with context footprint + the other participant's profile + last message */
export interface ConversationWithContext {
  id: string;
  footprint_id: string;
  created_at: string;
  // Joined footprint info
  footprint: Pick<PublicFootprint, "id" | "venue_name" | "address" | "category" | "latitude" | "longitude" | "photo_urls">;
  // The other user in the conversation
  otherUser: Pick<Profile, "id" | "username" | "full_name" | "avatar_url">;
  // Last message preview
  lastMessage: Pick<Message, "text_content" | "created_at" | "sender_id"> | null;
  unreadCount: number;
}

/** A message with sender profile info for display */
export interface MessageWithSender extends Message {
  profiles: Pick<Profile, "id" | "username" | "avatar_url">;
}

// ── Legacy-compatible Place type (used by map components) ────
// Maps FootprintWithProfile → the shape the existing MapView/LocationCard expects

export interface Place {
  id: string;
  name: string;
  address: string;
  lat: number;
  lng: number;
  visitor: string;
  visitorAvatar: string;
  visitDate: string;
  description: string;
  photoColor: string;
  category: PlaceCategory;
  isPublic: boolean;
  userId: string;
}

// ── Helpers ──────────────────────────────────────────────────

const photoColorMap: Record<PlaceCategory, string> = {
  cafe: "from-sky-400 to-indigo-600",
  park: "from-emerald-400 to-teal-600",
  restaurant: "from-orange-400 to-red-500",
  landmark: "from-red-500 to-rose-600",
  museum: "from-sky-400 to-blue-600",
  bar: "from-amber-400 to-orange-600",
  hotel: "from-purple-500 to-indigo-700",
};

/** Convert a DB footprint row (with profile join) to the frontend Place shape */
export function footprintToPlace(fp: FootprintWithProfile): Place {
  const profile = fp.profiles;
  const initials = profile.full_name
    ? profile.full_name.split(" ").map((n) => n[0]).join("").toUpperCase().slice(0, 2)
    : profile.username.slice(0, 2).toUpperCase();

  return {
    id: fp.id,
    name: fp.venue_name,
    address: fp.address ?? "",
    lat: fp.latitude,
    lng: fp.longitude,
    visitor: profile.full_name ?? profile.username,
    visitorAvatar: initials,
    visitDate: new Date(fp.pinned_at).toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
    }),
    description: fp.review_text ?? "",
    photoColor: photoColorMap[fp.category] ?? "from-sky-400 to-blue-600",
    category: fp.category,
    isPublic: true,
    userId: fp.user_id,
  };
}
