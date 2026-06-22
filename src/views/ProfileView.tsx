import { useState, useEffect, useRef, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Grid, Bookmark, Award, LogOut, Edit3, Loader2, MapPin, Calendar, Shield, CheckCircle2, Compass, Plus, Trash2, XCircle } from "lucide-react";
import L from "leaflet";
import { useAuth } from "@/contexts/AuthContext";
import { useFootprints } from "@/hooks/useFootprints";
import { useDrafts } from "@/hooks/useDrafts";
import { Avatar } from "@/components/ui/Avatar";
import { supabase } from "@/supabase/client";
import { cn } from "@/lib/cn";
import type { Place, Profile, PlaceCategory } from "@/types/database";
import type { TrackPoint } from "@/hooks/useLocationTracker";

const LIGHT_TILES = "https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png";
const DARK_TILES = "https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png";

function getDistance(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 6371e3; // metres
  const φ1 = (lat1 * Math.PI) / 180;
  const φ2 = (lat2 * Math.PI) / 180;
  const Δφ = ((lat2 - lat1) * Math.PI) / 180;
  const Δλ = ((lon2 - lon1) * Math.PI) / 180;

  const a =
    Math.sin(Δφ / 2) * Math.sin(Δφ / 2) +
    Math.cos(φ1) * Math.cos(φ2) * Math.sin(Δλ / 2) * Math.sin(Δλ / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

  return R * c; // in metres
}

interface ProfileViewProps {
  onViewOnMap: (place: Place) => void;
  isDark: boolean;
}

export function ProfileView({ onViewOnMap, isDark }: ProfileViewProps) {
  const { user, profile, isDemo, signOut, updateProfile } = useAuth();
  const { places, createFootprint } = useFootprints();
  const { pending, approveDraft, dismissDraft } = useDrafts();
  const [activeTab, setActiveTab] = useState<"posts" | "drafts" | "conquered">("posts");

  const [allDbProfiles, setAllDbProfiles] = useState<Profile[]>([]);

  // Load all DB profiles to dynamically calculate followers count
  useEffect(() => {
    async function loadProfiles() {
      if (isDemo || !user) return;
      const { data } = await supabase.from("profiles").select("*");
      if (data) {
        setAllDbProfiles(data);
      }
    }
    loadProfiles();
  }, [user, isDemo, profile]);

  // Parse metadata from profile avatar_url JSON
  const metadata = useMemo(() => {
    let bioText = "🗺️ Pinning my steps and sharing stories. Track my trails and see where I go next!";
    let websiteUrl = "";
    let following = [] as string[];
    let tracksList = [] as TrackPoint[];

    try {
      if (profile?.avatar_url && profile.avatar_url.startsWith("{")) {
        const meta = JSON.parse(profile.avatar_url);
        if (meta.bio !== undefined) bioText = meta.bio;
        if (meta.website !== undefined) websiteUrl = meta.website;
        if (meta.followingList !== undefined) following = meta.followingList;
        if (Array.isArray(meta.tracks)) tracksList = meta.tracks;
      }
    } catch {
      console.warn("[ProfileView] Metadata parse failed");
    }

    return { bio: bioText, website: websiteUrl, followingList: following, userTracks: tracksList };
  }, [profile]);

  const { bio, website, followingList, userTracks } = metadata;

  // Post Footprint modal state
  const [isPostOpen, setIsPostOpen] = useState(false);
  const [postVenueName, setPostVenueName] = useState("");
  const [postAddress, setPostAddress] = useState("");
  const [postCategory, setPostCategory] = useState<PlaceCategory>("cafe");
  const [postReviewText, setPostReviewText] = useState("");
  const [postPhotoUrl, setPostPhotoUrl] = useState("");
  const [postLatitude, setPostLatitude] = useState("28.6139");
  const [postLongitude, setPostLongitude] = useState("77.2090");
  const [postLoading, setPostLoading] = useState(false);
  const [postError, setPostError] = useState<string | null>(null);

  const handlePostSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setPostLoading(true);
    setPostError(null);

    if (!postVenueName.trim()) {
      setPostError("Venue name cannot be empty");
      setPostLoading(false);
      return;
    }

    const lat = parseFloat(postLatitude);
    const lng = parseFloat(postLongitude);
    if (isNaN(lat) || isNaN(lng)) {
      setPostError("Invalid coordinates");
      setPostLoading(false);
      return;
    }

    try {
      const { error } = await createFootprint({
        venue_name: postVenueName.trim(),
        address: postAddress.trim() || "Unknown address",
        category: postCategory,
        latitude: lat,
        longitude: lng,
        review_text: postReviewText.trim(),
        photo_urls: postPhotoUrl.trim() ? [postPhotoUrl.trim()] : ["from-sky-400 to-indigo-600"],
      });

      if (error) {
        setPostError(error);
      } else {
        // Reset form and close
        setPostVenueName("");
        setPostAddress("");
        setPostCategory("cafe");
        setPostReviewText("");
        setPostPhotoUrl("");
        setPostLatitude("28.6139");
        setPostLongitude("77.2090");
        setIsPostOpen(false);
      }
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : "Failed to publish post";
      setPostError(errorMsg);
    } finally {
      setPostLoading(false);
    }
  };

  const conqueredMiniMapRef = useRef<L.Map | null>(null);
  const conqueredMiniMapContainerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    // Only initialize if tab is "conquered", container exists
    if (activeTab !== "conquered" || !conqueredMiniMapContainerRef.current) return;

    // Load tracks to draw
    let tracksList: TrackPoint[] = userTracks;
    if (tracksList.length === 0) {
      const saved = localStorage.getItem("conquer_tracks");
      if (saved) {
        try {
          const parsed = JSON.parse(saved);
          if (Array.isArray(parsed)) tracksList = parsed;
        } catch {
          console.warn("Parse saved tracks failed");
        }
      }
    }

    if (tracksList.length === 0) return;

    // Destroy existing map instance
    if (conqueredMiniMapRef.current) {
      conqueredMiniMapRef.current.remove();
      conqueredMiniMapRef.current = null;
    }

    const firstPt = tracksList[0];
    const map = L.map(conqueredMiniMapContainerRef.current, {
      center: [firstPt.lat, firstPt.lng],
      zoom: 13,
      zoomControl: false,
      attributionControl: false,
    });

    const tileUrl = isDark ? DARK_TILES : LIGHT_TILES;
    L.tileLayer(tileUrl, { maxZoom: 18 }).addTo(map);

    // Split tracks into segments if consecutive points are > 5 km apart
    const segments: L.LatLngExpression[][] = [];
    let currentSegment: L.LatLngExpression[] = [];

    for (let i = 0; i < tracksList.length; i++) {
      const pt = tracksList[i];
      const latlng: L.LatLngExpression = [pt.lat, pt.lng];

      if (currentSegment.length > 0) {
        const lastPt = tracksList[i - 1];
        const dist = getDistance(lastPt.lat, lastPt.lng, pt.lat, pt.lng);
        if (dist > 5000) {
          segments.push(currentSegment);
          currentSegment = [];
        }
      }
      currentSegment.push(latlng);
    }
    if (currentSegment.length > 0) {
      segments.push(currentSegment);
    }

    // Draw the cyan trail polyline for each segment
    segments.forEach((seg) => {
      if (seg.length < 2) return;
      L.polyline(seg, {
        color: "#0ea5e9",
        weight: 6,
        opacity: 0.4,
        lineCap: "round",
        lineJoin: "round",
      }).addTo(map);

      L.polyline(seg, {
        color: "#38bdf8",
        weight: 2,
        opacity: 0.85,
        lineCap: "round",
        lineJoin: "round",
      }).addTo(map);
    });

    // Fit map bounds to show the entire trail
    const allLatLngs = segments.flat();
    if (allLatLngs.length > 1) {
      const bounds = L.latLngBounds(allLatLngs);
      map.fitBounds(bounds.pad(0.15));
    }

    conqueredMiniMapRef.current = map;

    return () => {
      if (conqueredMiniMapRef.current) {
        conqueredMiniMapRef.current.remove();
        conqueredMiniMapRef.current = null;
      }
    };
  }, [activeTab, profile, isDark, userTracks]);

  // Edit Profile modal state
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [editFullName, setEditFullName] = useState(profile?.full_name ?? "");
  const [editUsername, setEditUsername] = useState(profile?.username ?? "");
  const [editBio, setEditBio] = useState(bio);
  const [editWebsite, setEditWebsite] = useState(website);
  const [editLoading, setEditLoading] = useState(false);
  const [editError, setEditError] = useState<string | null>(null);

  // User footprints
  const userPlaces = places.filter((p) => p.userId === user?.id);

  const fullName = profile?.full_name ?? user?.user_metadata?.full_name ?? "Explorer";
  const username = profile?.username ?? "explorer";
  const initials = fullName
    .split(" ")
    .map((n: string) => n[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);

  const handleEditSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setEditLoading(true);
    setEditError(null);

    if (!editUsername.trim()) {
      setEditError("Username cannot be empty");
      setEditLoading(false);
      return;
    }

    if (!updateProfile) {
      setEditError("Profile update is not available.");
      setEditLoading(false);
      return;
    }

    const { error } = await updateProfile(editFullName, editUsername, editBio, editWebsite, followingList);
    setEditLoading(false);

    if (error) {
      setEditError(error);
    } else {
      setIsEditOpen(false);
    }
  };

  const handleLogout = async () => {
    await signOut();
  };

  // Compute stats
  const followersCount = isDemo ? 142 : allDbProfiles.filter((p) => {
    try {
      if (p.avatar_url && p.avatar_url.startsWith("{")) {
        const meta = JSON.parse(p.avatar_url);
        return Array.isArray(meta.followingList) && meta.followingList.includes(user?.id);
      }
    } catch (err) {
      console.warn("[ProfileView] Followers parse failed", err);
    }
    return false;
  }).length;

  const followingCount = isDemo ? 98 : followingList.length;
  // Compute conquered area based on actual tracks
  let tracksCount = userTracks.length;
  if (tracksCount === 0) {
    const saved = localStorage.getItem("conquer_tracks");
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed)) {
          tracksCount = parsed.length;
        }
      } catch {
        console.warn("Parse saved tracks count failed");
      }
    }
  }
  const conqueredArea = (tracksCount === 0 ? 0 : 0.045 + (tracksCount - 1) * 0.012).toFixed(3);

  return (
    <div className="h-full overflow-y-auto pb-24 lg:pb-6 bg-[var(--bg-primary)]">
      {/* Top Header */}
      <div className="sticky top-0 z-10 glass-heavy border-b border-[var(--border-primary)] py-3 px-4 flex items-center justify-between">
        <div className="flex items-center gap-1.5">
          <span className="text-base">📸</span>
          <h2 className="text-sm font-black text-[var(--text-primary)] tracking-wide">@{username}</h2>
        </div>
        <button
          onClick={handleLogout}
          className="h-8 px-3 rounded-xl hover:bg-rose-500/10 text-rose-500 flex items-center gap-1.5 cursor-pointer text-xs font-bold transition-all active:scale-95"
        >
          <LogOut className="h-4 w-4" />
          <span>Sign Out</span>
        </button>
      </div>

      <div className="max-w-2xl mx-auto px-4 py-6 space-y-6">
        {/* Instagram Profile Section */}
        <div className="flex items-start justify-between gap-6 md:gap-10 pb-4">
          {/* Avatar on Left */}
          <div className="relative shrink-0 mt-2">
            <div className="h-20 w-20 md:h-24 md:w-24 rounded-full p-[3px] bg-gradient-to-tr from-yellow-500 via-red-500 to-purple-600 shadow-lg flex items-center justify-center">
              <div className="h-full w-full rounded-full bg-[var(--bg-primary)] p-0.5">
                <Avatar
                  initials={initials}
                  colorClass="bg-gradient-to-br from-sky-400 to-indigo-600 font-extrabold text-xl md:text-2xl text-white"
                  size="xl"
                />
              </div>
            </div>
          </div>

          {/* Stats on Right */}
          <div className="flex-1 flex flex-col gap-3">
            <div className="flex items-center justify-around text-center py-2">
              <div>
                <p className="text-base font-black text-[var(--text-primary)]">{userPlaces.length}</p>
                <p className="text-[10px] md:text-xs text-[var(--text-tertiary)] font-medium">Posts</p>
              </div>
              <div>
                <p className="text-base font-black text-[var(--text-primary)]">{followersCount}</p>
                <p className="text-[10px] md:text-xs text-[var(--text-tertiary)] font-medium">Followers</p>
              </div>
              <div>
                <p className="text-base font-black text-[var(--text-primary)]">{followingCount}</p>
                <p className="text-[10px] md:text-xs text-[var(--text-tertiary)] font-medium">Following</p>
              </div>
            </div>

            {/* Action buttons */}
            <div className="flex gap-2">
              <button
                onClick={() => {
                  setEditFullName(profile?.full_name ?? "");
                  setEditUsername(profile?.username ?? "");
                  setEditBio(bio);
                  setEditWebsite(website);
                  setEditError(null);
                  setIsEditOpen(true);
                }}
                className="flex-1 py-1.5 border border-[var(--border-primary)] hover:bg-[var(--bg-tertiary)] text-[var(--text-primary)] font-bold rounded-lg text-xs flex items-center justify-center gap-1.5 shadow-sm transition-all active:scale-[0.98] cursor-pointer"
              >
                <Edit3 className="h-3.5 w-3.5" />
                <span>Edit Profile</span>
              </button>
              <button
                onClick={() => setIsPostOpen(true)}
                className="flex-1 py-1.5 bg-brand-500 hover:bg-brand-600 text-white font-bold rounded-lg text-xs flex items-center justify-center gap-1.5 shadow-sm transition-all active:scale-[0.98] cursor-pointer"
              >
                <Plus className="h-3.5 w-3.5" />
                <span>Post Footprint</span>
              </button>
            </div>
          </div>
        </div>

        {/* Bio Details */}
        <div className="space-y-1 px-1">
          <h1 className="text-sm font-black text-[var(--text-primary)]">{fullName}</h1>
          <p className="text-xs text-[var(--text-tertiary)]">Traveler & Footprints Explorer</p>
          <p className="text-xs text-[var(--text-secondary)] font-medium leading-relaxed pt-1 whitespace-pre-line">
            {bio}
          </p>
          {website && (
            <div className="flex items-center gap-1.5 pt-2 text-[11px] font-semibold text-brand-500">
              <span className="text-[10px]">🔗</span>
              <a href={website.startsWith("http") ? website : `https://${website}`} target="_blank" rel="noreferrer" className="hover:underline">{website}</a>
            </div>
          )}
        </div>

        {/* Guest vs Sync Banner */}
        <div className="px-1 pt-2">
          {isDemo ? (
            <div className="rounded-2xl border border-amber-500/20 bg-amber-500/5 p-3 flex items-start gap-2.5">
              <Shield className="h-4.5 w-4.5 text-amber-500 shrink-0 mt-0.5" />
              <div>
                <h4 className="text-[10px] font-bold text-amber-500 uppercase tracking-wider">Guest Sandbox Mode</h4>
                <p className="text-[10px] text-[var(--text-secondary)] mt-0.5 leading-normal">
                  Your data is locally stored. Connect your Supabase database in `.env` to sync permanently.
                </p>
              </div>
            </div>
          ) : (
            <div className="rounded-2xl border border-emerald-500/20 bg-emerald-500/5 p-3 flex items-start gap-2.5">
              <CheckCircle2 className="h-4.5 w-4.5 text-emerald-500 shrink-0 mt-0.5" />
              <div>
                <h4 className="text-[10px] font-bold text-emerald-500 uppercase tracking-wider">Connected & Synced</h4>
                <p className="text-[10px] text-[var(--text-secondary)] mt-0.5 leading-normal">
                  Profile is connected with Supabase. Footprints and trails are stored securely.
                </p>
              </div>
            </div>
          )}
        </div>

        <hr className="border-[var(--border-primary)]" />

        {/* Tab Controls (Instagram Style) */}
        <div className="flex justify-center border-b border-[var(--border-primary)]">
          <button
            onClick={() => setActiveTab("posts")}
            className={cn(
              "flex-1 md:flex-none md:w-32 py-3.5 flex items-center justify-center gap-2 border-b-2 font-bold text-xs transition-all cursor-pointer",
              activeTab === "posts"
                ? "border-[var(--text-primary)] text-[var(--text-primary)]"
                : "border-transparent text-[var(--text-tertiary)] hover:text-[var(--text-secondary)]"
            )}
          >
            <Grid className="h-4 w-4" />
            <span className="hidden sm:inline">POSTS</span>
          </button>
          <button
            onClick={() => setActiveTab("drafts")}
            className={cn(
              "flex-1 md:flex-none md:w-32 py-3.5 flex items-center justify-center gap-2 border-b-2 font-bold text-xs transition-all cursor-pointer",
              activeTab === "drafts"
                ? "border-[var(--text-primary)] text-[var(--text-primary)]"
                : "border-transparent text-[var(--text-tertiary)] hover:text-[var(--text-secondary)]"
            )}
          >
            <Bookmark className="h-4 w-4" />
            <span className="hidden sm:inline">DRAFTS</span>
          </button>
          <button
            onClick={() => setActiveTab("conquered")}
            className={cn(
              "flex-1 md:flex-none md:w-32 py-3.5 flex items-center justify-center gap-2 border-b-2 font-bold text-xs transition-all cursor-pointer",
              activeTab === "conquered"
                ? "border-[var(--text-primary)] text-[var(--text-primary)]"
                : "border-transparent text-[var(--text-tertiary)] hover:text-[var(--text-secondary)]"
            )}
          >
            <Award className="h-4 w-4" />
            <span className="hidden sm:inline">CONQUERED</span>
          </button>
        </div>

        {/* Grid Content */}
        <div>
          {activeTab === "posts" && (
            <div>
              {userPlaces.length === 0 ? (
                <div className="text-center py-16 px-4">
                  <div className="h-16 w-16 rounded-full border-2 border-dashed border-[var(--border-primary)] flex items-center justify-center mx-auto mb-4 text-[var(--text-tertiary)]">
                    <MapPin className="h-6 w-6" />
                  </div>
                  <h3 className="text-sm font-bold text-[var(--text-primary)]">No Footprints Shared Yet</h3>
                  <p className="text-xs text-[var(--text-tertiary)] mt-1 max-w-xs mx-auto">
                    Go to the Explore Map to pin your first location and it will appear on your grid.
                  </p>
                </div>
              ) : (
                <div className="grid grid-cols-3 gap-1 md:gap-2">
                  {userPlaces.map((place) => (
                    <div
                      key={place.id}
                      onClick={() => onViewOnMap(place)}
                      className={cn(
                        "relative aspect-square rounded-lg md:rounded-xl bg-gradient-to-br flex items-center justify-center cursor-pointer group overflow-hidden border border-[var(--border-primary)] shadow-sm active:scale-95 transition-all duration-150",
                        place.photoColor
                      )}
                    >
                      {/* Category icon */}
                      <span className="text-3xl filter drop-shadow-md group-hover:scale-110 transition-transform duration-200">
                        {place.category === "cafe" ? "☕" : place.category === "park" ? "🌳" : place.category === "restaurant" ? "🍜" : "⛩️"}
                      </span>

                      {/* Hover Overlay */}
                      <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity duration-200 flex flex-col items-center justify-center p-2 text-center">
                        <p className="text-white text-[10px] md:text-xs font-black truncate w-full px-1">{place.name}</p>
                        <div className="flex items-center gap-1 text-[8px] md:text-[10px] text-white/80 mt-1">
                          <Calendar className="h-3 w-3 shrink-0" />
                          <span>{place.visitDate}</span>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {activeTab === "drafts" && (
            <div className="space-y-3">
              {pending.length === 0 ? (
                <div className="text-center py-16 px-4">
                  <div className="h-16 w-16 rounded-full border-2 border-dashed border-[var(--border-primary)] flex items-center justify-center mx-auto mb-4 text-[var(--text-tertiary)]">
                    <Bookmark className="h-6 w-6" />
                  </div>
                  <h3 className="text-sm font-bold text-[var(--text-primary)]">No Pending Drafts</h3>
                  <p className="text-xs text-[var(--text-tertiary)] mt-1">
                    Your location history is clear! New automatic tracking logs will show up here.
                  </p>
                </div>
              ) : (
                <div className="grid grid-cols-1 gap-3">
                  {pending.map((d) => (
                    <div
                      key={d.id}
                      className="glass border border-[var(--border-primary)] rounded-2xl p-4 flex items-center justify-between gap-4 shadow-sm"
                    >
                      <div className="min-w-0 flex-1">
                        <h4 className="text-xs font-black text-[var(--text-primary)] truncate">{d.venue_name}</h4>
                        <p className="text-[10px] text-[var(--text-secondary)] mt-0.5 truncate">{d.address}</p>
                        <p className="text-[9px] text-[var(--text-tertiary)] mt-1">Visited: {new Date(d.visited_at).toLocaleDateString()}</p>
                      </div>
                      <div className="flex items-center gap-2 shrink-0">
                        <button
                          onClick={() => approveDraft(d.id)}
                          className="h-8 px-2.5 bg-emerald-500 hover:bg-emerald-600 text-white font-bold rounded-lg text-[10px] flex items-center gap-1 shadow-sm transition-all active:scale-95 cursor-pointer"
                        >
                          <CheckCircle2 className="h-3 w-3" />
                          <span>Approve</span>
                        </button>
                        <button
                          onClick={() => dismissDraft(d.id)}
                          className="h-8 px-2.5 bg-[var(--bg-tertiary)] hover:bg-rose-500/10 hover:text-rose-500 text-[var(--text-secondary)] border border-[var(--border-primary)] font-bold rounded-lg text-[10px] flex items-center gap-1 shadow-sm transition-all active:scale-95 cursor-pointer"
                        >
                          <XCircle className="h-3 w-3" />
                          <span>Dismiss</span>
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {activeTab === "conquered" && (
            <div className="glass rounded-3xl p-5 border border-[var(--border-primary)] space-y-4">
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 rounded-xl bg-gradient-to-br from-sky-400 to-indigo-600 flex items-center justify-center shadow-md">
                  <Award className="h-5 w-5 text-white" />
                </div>
                <div>
                  <h3 className="text-sm font-black text-[var(--text-primary)]">Conquer Statistics</h3>
                  <p className="text-[10px] text-[var(--text-tertiary)]">Area explored and milestones unlocked</p>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3 pt-2">
                <div className="bg-[var(--bg-secondary)] border border-[var(--border-primary)] rounded-2xl p-4 text-center">
                  <p className="text-[10px] uppercase font-black text-[var(--text-tertiary)] tracking-wider">Area Explored</p>
                  <p className="text-2xl font-black text-brand-500 mt-1.5 flex items-baseline justify-center gap-0.5">
                    {conqueredArea}
                    <span className="text-xs font-semibold text-[var(--text-secondary)]">km²</span>
                  </p>
                </div>
                <div className="bg-[var(--bg-secondary)] border border-[var(--border-primary)] rounded-2xl p-4 text-center">
                  <p className="text-[10px] uppercase font-black text-[var(--text-tertiary)] tracking-wider">Conquered Pins</p>
                  <p className="text-2xl font-black text-amber-500 mt-1.5">{userPlaces.length}</p>
                </div>
              </div>

              {/* Conquered Trail Mini-Map */}
              {tracksCount > 0 && (
                <div className="space-y-2 pt-2">
                  <div className="flex items-center justify-between px-1">
                    <div className="flex items-center gap-1.5">
                      <Compass className="h-4.5 w-4.5 text-brand-500" />
                      <span className="text-xs font-bold text-[var(--text-primary)]">Your Conquered Trail Map</span>
                    </div>
                    <button
                      onClick={async () => {
                        localStorage.removeItem("conquer_tracks");
                        if (!isDemo && updateProfile && profile) {
                          await updateProfile(
                            profile.full_name ?? "",
                            profile.username,
                            bio,
                            website,
                            followingList,
                            []
                          );
                        }
                        window.location.reload();
                      }}
                      className="text-[10px] text-rose-500 hover:text-rose-600 font-bold flex items-center gap-1 cursor-pointer transition-colors"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                      <span>Clear Trail</span>
                    </button>
                  </div>
                  <div className="glass rounded-3xl overflow-hidden border border-[var(--border-primary)] p-1.5">
                    <div
                      ref={conqueredMiniMapContainerRef}
                      id="profile-conquered-mini-map"
                      className="h-44 w-full rounded-2xl overflow-hidden relative z-0"
                    />
                  </div>
                </div>
              )}

              <p className="text-xs text-[var(--text-secondary)] leading-relaxed pt-2">
                Activate <strong>Conquer Mode</strong> from the main map view to track your movements in real-time. Walking around expands your coverage area and locks/unlocks nearby historical spots automatically!
              </p>
            </div>
          )}
        </div>
      </div>

      {/* Edit Profile Modal */}
      <AnimatePresence>
        {isEditOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            {/* Backdrop */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsEditOpen(false)}
              className="absolute inset-0 bg-black/60 backdrop-blur-md"
            />

            {/* Card */}
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 15 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 15 }}
              className="relative w-full max-w-sm glass-heavy border border-[var(--border-primary)] rounded-3xl p-6 shadow-2xl z-10 space-y-4 max-h-[90vh] overflow-y-auto"
            >
              <h3 className="text-base font-black text-[var(--text-primary)]">Edit Profile</h3>

              <form onSubmit={handleEditSubmit} className="space-y-4">
                <div className="space-y-1.5">
                  <label className="text-[10px] uppercase tracking-wider font-extrabold text-[var(--text-tertiary)]">Full Name</label>
                  <input
                    type="text"
                    value={editFullName}
                    onChange={(e) => setEditFullName(e.target.value)}
                    className="w-full bg-[var(--bg-secondary)] text-xs text-[var(--text-primary)] px-4 py-3.5 rounded-2xl border border-[var(--border-primary)] focus:border-brand-500 outline-none text-[var(--text-primary)] placeholder-[var(--text-tertiary)]"
                    placeholder="E.g. Jane Doe"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-[10px] uppercase tracking-wider font-extrabold text-[var(--text-tertiary)]">Username</label>
                  <input
                    type="text"
                    value={editUsername}
                    onChange={(e) => setEditUsername(e.target.value)}
                    className="w-full bg-[var(--bg-secondary)] text-xs text-[var(--text-primary)] px-4 py-3.5 rounded-2xl border border-[var(--border-primary)] focus:border-brand-500 outline-none text-[var(--text-primary)] placeholder-[var(--text-tertiary)]"
                    placeholder="E.g. janedoe"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-[10px] uppercase tracking-wider font-extrabold text-[var(--text-tertiary)]">Bio</label>
                  <textarea
                    value={editBio}
                    onChange={(e) => setEditBio(e.target.value)}
                    className="w-full bg-[var(--bg-secondary)] text-xs text-[var(--text-primary)] px-4 py-3 rounded-2xl border border-[var(--border-primary)] focus:border-brand-500 outline-none text-[var(--text-primary)] placeholder-[var(--text-tertiary)] min-h-[60px]"
                    placeholder="Tell us about yourself..."
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-[10px] uppercase tracking-wider font-extrabold text-[var(--text-tertiary)]">Website</label>
                  <input
                    type="text"
                    value={editWebsite}
                    onChange={(e) => setEditWebsite(e.target.value)}
                    className="w-full bg-[var(--bg-secondary)] text-xs text-[var(--text-primary)] px-4 py-3.5 rounded-2xl border border-[var(--border-primary)] focus:border-brand-500 outline-none text-[var(--text-primary)] placeholder-[var(--text-tertiary)]"
                    placeholder="E.g. mywebsite.com"
                  />
                </div>

                {editError && (
                  <p className="text-[11px] font-bold text-rose-500">{editError}</p>
                )}

                <div className="flex gap-2.5 pt-2">
                  <button
                    type="button"
                    onClick={() => setIsEditOpen(false)}
                    className="flex-1 py-3 border border-[var(--border-primary)] hover:bg-[var(--bg-tertiary)] text-[var(--text-primary)] font-bold rounded-2xl text-xs cursor-pointer text-center"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={editLoading}
                    className="flex-1 py-3 bg-brand-500 hover:bg-brand-600 text-white font-bold rounded-2xl text-xs flex items-center justify-center gap-1.5 shadow-md cursor-pointer"
                  >
                    {editLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : "Save Changes"}
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Post Footprint Modal */}
      <AnimatePresence>
        {isPostOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            {/* Backdrop */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsPostOpen(false)}
              className="absolute inset-0 bg-black/60 backdrop-blur-md"
            />

            {/* Card */}
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 15 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 15 }}
              className="relative w-full max-w-md glass-heavy border border-[var(--border-primary)] rounded-3xl p-6 shadow-2xl z-10 space-y-4 max-h-[90vh] overflow-y-auto"
            >
              <h3 className="text-base font-black text-[var(--text-primary)]">Post Explored Footprint</h3>

              <form onSubmit={handlePostSubmit} className="space-y-3">
                <div className="space-y-1">
                  <label className="text-[10px] uppercase tracking-wider font-extrabold text-[var(--text-tertiary)]">Venue Name</label>
                  <input
                    type="text"
                    required
                    value={postVenueName}
                    onChange={(e) => setPostVenueName(e.target.value)}
                    className="w-full bg-[var(--bg-secondary)] text-xs text-[var(--text-primary)] px-4 py-3 rounded-xl border border-[var(--border-primary)] focus:border-brand-500 outline-none placeholder-[var(--text-tertiary)]"
                    placeholder="E.g. Downtown Cafe"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-[10px] uppercase tracking-wider font-extrabold text-[var(--text-tertiary)]">Address</label>
                  <input
                    type="text"
                    value={postAddress}
                    onChange={(e) => setPostAddress(e.target.value)}
                    className="w-full bg-[var(--bg-secondary)] text-xs text-[var(--text-primary)] px-4 py-3 rounded-xl border border-[var(--border-primary)] focus:border-brand-500 outline-none placeholder-[var(--text-tertiary)]"
                    placeholder="E.g. 123 Main Street"
                  />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <label className="text-[10px] uppercase tracking-wider font-extrabold text-[var(--text-tertiary)]">Category</label>
                    <select
                      value={postCategory}
                      onChange={(e) => setPostCategory(e.target.value as PlaceCategory)}
                      className="w-full bg-[var(--bg-secondary)] text-xs text-[var(--text-primary)] px-3 py-3 rounded-xl border border-[var(--border-primary)] focus:border-brand-500 outline-none"
                    >
                      <option value="cafe">☕ Cafe</option>
                      <option value="park">🌳 Park</option>
                      <option value="restaurant">🍜 Restaurant</option>
                      <option value="landmark">⛩️ Landmark</option>
                      <option value="museum">🎨 Museum</option>
                      <option value="bar">🍸 Bar</option>
                      <option value="hotel">🏨 Hotel</option>
                    </select>
                  </div>

                  <div className="space-y-1">
                    <label className="text-[10px] uppercase tracking-wider font-extrabold text-[var(--text-tertiary)]">Photo URL</label>
                    <input
                      type="text"
                      value={postPhotoUrl}
                      onChange={(e) => setPostPhotoUrl(e.target.value)}
                      className="w-full bg-[var(--bg-secondary)] text-xs text-[var(--text-primary)] px-4 py-3 rounded-xl border border-[var(--border-primary)] focus:border-brand-500 outline-none placeholder-[var(--text-tertiary)]"
                      placeholder="Https://images.unsplash.com/..."
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <label className="text-[10px] uppercase tracking-wider font-extrabold text-[var(--text-tertiary)]">Latitude</label>
                    <input
                      type="number"
                      step="any"
                      required
                      value={postLatitude}
                      onChange={(e) => setPostLatitude(e.target.value)}
                      className="w-full bg-[var(--bg-secondary)] text-xs text-[var(--text-primary)] px-4 py-3 rounded-xl border border-[var(--border-primary)] focus:border-brand-500 outline-none"
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="text-[10px] uppercase tracking-wider font-extrabold text-[var(--text-tertiary)]">Longitude</label>
                    <input
                      type="number"
                      step="any"
                      required
                      value={postLongitude}
                      onChange={(e) => setPostLongitude(e.target.value)}
                      className="w-full bg-[var(--bg-secondary)] text-xs text-[var(--text-primary)] px-4 py-3 rounded-xl border border-[var(--border-primary)] focus:border-brand-500 outline-none"
                    />
                  </div>
                </div>

                <div className="space-y-1">
                  <label className="text-[10px] uppercase tracking-wider font-extrabold text-[var(--text-tertiary)]">Description / Story</label>
                  <textarea
                    value={postReviewText}
                    onChange={(e) => setPostReviewText(e.target.value)}
                    className="w-full bg-[var(--bg-secondary)] text-xs text-[var(--text-primary)] px-4 py-3 rounded-xl border border-[var(--border-primary)] focus:border-brand-500 outline-none placeholder-[var(--text-tertiary)] min-h-[60px]"
                    placeholder="Tell us about this place..."
                  />
                </div>

                {postError && (
                  <p className="text-[11px] font-bold text-rose-500">{postError}</p>
                )}

                <div className="flex gap-2.5 pt-2">
                  <button
                    type="button"
                    onClick={() => setIsPostOpen(false)}
                    className="flex-1 py-3 border border-[var(--border-primary)] hover:bg-[var(--bg-tertiary)] text-[var(--text-primary)] font-bold rounded-xl text-xs cursor-pointer text-center"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={postLoading}
                    className="flex-1 py-3 bg-brand-500 hover:bg-brand-600 text-white font-bold rounded-xl text-xs flex items-center justify-center gap-1.5 shadow-md cursor-pointer"
                  >
                    {postLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : "Publish Footprint"}
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
