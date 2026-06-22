import { useState, useEffect, useRef, useCallback, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Search, Send, UserCheck, UserPlus, ArrowLeft, Landmark, Compass, Loader2 } from "lucide-react";
import L from "leaflet";
import { useFootprints } from "@/hooks/useFootprints";
import { useInquiry } from "@/hooks/useChat";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/supabase/client";
import { demoPlaces } from "@/data/demoData";

import { cn } from "@/lib/cn";
import type { Place, Profile } from "@/types/database";
import type { TrackPoint } from "@/hooks/useLocationTracker";

interface SearchViewProps {
  onViewOnMap: (place: Place) => void;
  onNavigateToInbox: (conversationId?: string) => void;
  onOpenProfile: () => void;
  isDark: boolean;
}

interface travelerProfile {
  userId: string;
  username: string;
  fullName: string;
  initials: string;
  bio: string;
  followers: number;
  following: number;
  conqueredArea: string;
  tracks?: TrackPoint[];
}

const MOCK_TRAVELERS: travelerProfile[] = [
  { userId: "demo-alex", username: "alexchen", fullName: "Alex Chen", initials: "AC", bio: "History photographer & monument crawler. Mapping local heritage.", followers: 142, following: 98, conqueredArea: "0.220" },
  { userId: "demo-maya", username: "mayapark", fullName: "Maya Park", initials: "MP", bio: "Coffee enthusiast. Finding the absolute best cold brews & cafe workspaces.", followers: 231, following: 140, conqueredArea: "0.280" },
  { userId: "demo-ravi", username: "ravipatel", fullName: "Ravi Patel", initials: "RP", bio: "Food explorer. Tracking down legendary street food stalls around the city.", followers: 88, following: 120, conqueredArea: "0.090" },
  { userId: "demo-sophie", username: "sophielaurent", fullName: "Sophie Laurent", initials: "SL", bio: "Art history major. Reviewing modern galleries and museum artifacts.", followers: 195, following: 160, conqueredArea: "0.080" },
  { userId: "demo-james", username: "jameswilson", fullName: "James Wilson", initials: "JW", bio: "Live jazz listener & late night cocktail lounge critic.", followers: 104, following: 80, conqueredArea: "0.070" },
  { userId: "demo-yuki", username: "yukitanaka", fullName: "Yuki Tanaka", initials: "YT", bio: "Solo traveler wandering through historical arches and streets.", followers: 156, following: 110, conqueredArea: "0.110" }
];

const LIGHT_TILES = "https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png";
const DARK_TILES = "https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png";

export function SearchView({ onViewOnMap, onNavigateToInbox, onOpenProfile, isDark }: SearchViewProps) {
  const { places } = useFootprints();
  const { startInquiry } = useInquiry();

  const { user, profile, isDemo, updateProfile } = useAuth();

  // Combine database places and demoPlaces for mock profile exploration and messaging
  const allPlaces = useMemo(() => {
    const combined = [...places];
    demoPlaces.forEach((dp) => {
      let mappedUserId = dp.userId;
      if (!isDemo) {
        if (dp.userId === "demo-alex") mappedUserId = "00000000-0000-0000-0000-000000000002";
        else if (dp.userId === "demo-maya") mappedUserId = "00000000-0000-0000-0000-000000000003";
        else if (dp.userId === "demo-ravi") mappedUserId = "00000000-0000-0000-0000-000000000004";
        else if (dp.userId === "demo-sophie") mappedUserId = "00000000-0000-0000-0000-000000000005";
        else if (dp.userId === "demo-james") mappedUserId = "00000000-0000-0000-0000-000000000006";
        else if (dp.userId === "demo-yuki") mappedUserId = "00000000-0000-0000-0000-000000000007";
      }

      if (!combined.some((p) => p.id === dp.id)) {
        combined.push({ ...dp, userId: mappedUserId });
      }
    });
    return combined;
  }, [places, isDemo]);

  const [searchQuery, setSearchQuery] = useState("");
  const [rawDbProfiles, setRawDbProfiles] = useState<Profile[]>([]);
  const [dbTravelers, setDbTravelers] = useState<travelerProfile[]>([]);
  const [selectedtraveler, setSelectedtraveler] = useState<travelerProfile | null>(null);
  const [followingState, setFollowingState] = useState<Record<string, boolean>>({});
  const [messageLoading, setMessageLoading] = useState(false);

  const miniMapRef = useRef<L.Map | null>(null);
  const miniMapContainerRef = useRef<HTMLDivElement>(null);

  // Fetch real users from Supabase profiles table
  useEffect(() => {
    async function fetchDbTravelers() {
      if (!user || isDemo) {
        setDbTravelers([]);
        return;
      }
      try {
        const { data, error } = await supabase
          .from("profiles")
          .select("*");

        if (error) {
          console.error("[SearchView] Error fetching database profiles:", error.message);
          return;
        }

        if (data) {
          setRawDbProfiles(data);

          const mapped: travelerProfile[] = data
            .filter((p) => p.id !== user.id)
            .map((p) => {
              const initials = p.full_name
                ? p.full_name.split(" ").map((n: string) => n[0]).join("").toUpperCase().slice(0, 2)
                : p.username.slice(0, 2).toUpperCase();

              // Parse bio from metadata
              let bioText = "Traveler sharing stories on the map.";
              let followingList: string[] = [];
              let tracksList: TrackPoint[] = [];
              try {
                if (p.avatar_url && p.avatar_url.startsWith("{")) {
                  const meta = JSON.parse(p.avatar_url);
                  if (meta.bio !== undefined) bioText = meta.bio;
                  if (meta.followingList !== undefined) followingList = meta.followingList;
                  if (Array.isArray(meta.tracks)) tracksList = meta.tracks;
                }
              } catch (err) {
                console.warn("[SearchView] Metadata parse failed", err);
              }

              return {
                userId: p.id,
                username: p.username,
                fullName: p.full_name ?? p.username,
                initials,
                bio: bioText,
                followers: 0,
                following: followingList.length,
                conqueredArea: "0.000",
                tracks: tracksList,
              };
            });
          setDbTravelers(mapped);
        }
      } catch (err) {
        console.error("Failed to load profiles:", err);
      }
    }
    fetchDbTravelers();
  }, [user, isDemo]);

  const isFollowingTraveler = useCallback((travelerId: string) => {
    if (isDemo) {
      return !!followingState[travelerId];
    }
    const currentUserProfile = rawDbProfiles.find(p => p.id === user?.id);
    if (currentUserProfile?.avatar_url && currentUserProfile.avatar_url.startsWith("{")) {
      try {
        const meta = JSON.parse(currentUserProfile.avatar_url);
        return Array.isArray(meta.followingList) && meta.followingList.includes(travelerId);
      } catch (err) {
        console.warn("[SearchView] Follow check parse failed", err);
      }
    }
    return false;
  }, [rawDbProfiles, user?.id, isDemo, followingState]);

  const getFollowersCount = useCallback((traveler: travelerProfile) => {
    if (traveler.userId.startsWith("demo-")) {
      return traveler.followers + (followingState[traveler.userId] ? 1 : 0);
    }
    return rawDbProfiles.filter((p) => {
      try {
        if (p.avatar_url && p.avatar_url.startsWith("{")) {
          const meta = JSON.parse(p.avatar_url);
          return Array.isArray(meta.followingList) && meta.followingList.includes(traveler.userId);
        }
      } catch (err) {
        console.warn("[SearchView] Followers list parse failed", err);
      }
      return false;
    }).length;
  }, [rawDbProfiles, followingState]);

  const getConqueredArea = useCallback((t: travelerProfile) => {
    if (t.userId.startsWith("demo-")) {
      return t.conqueredArea;
    }
    const trackCount = t.tracks?.length ?? 0;
    if (trackCount > 0) {
      return (0.045 + (trackCount - 1) * 0.012).toFixed(3);
    }
    const count = allPlaces.filter((p) => p.userId === t.userId).length;
    return (count === 0 ? 0 : 0.045 + (count - 1) * 0.012).toFixed(3);
  }, [allPlaces]);

  const allTravelers = [
    ...dbTravelers,
    ...MOCK_TRAVELERS.filter((m) => !dbTravelers.some((d) => d.userId === m.userId || d.username === m.username)),
  ];

  // Filter travelers based on search query
  const filteredtravelers = allTravelers.filter(
    (t) =>
      t.fullName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      t.username.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const handleFollowToggle = useCallback(async (travelerId: string) => {
    if (isDemo) {
      setFollowingState((prev) => ({
        ...prev,
        [travelerId]: !prev[travelerId],
      }));
      return;
    }

    if (!updateProfile || !user) return;

    const currentUserProfile = rawDbProfiles.find(p => p.id === user.id);
    let followingList: string[] = [];
    let currentBio = "";
    let currentWebsite = "";

    if (currentUserProfile?.avatar_url && currentUserProfile.avatar_url.startsWith("{")) {
      try {
        const meta = JSON.parse(currentUserProfile.avatar_url);
        followingList = meta.followingList || [];
        currentBio = meta.bio || "";
        currentWebsite = meta.website || "";
      } catch (err) {
        console.warn("[SearchView] Follow list extraction failed", err);
      }
    }

    let nextFollowingList: string[];
    if (followingList.includes(travelerId)) {
      nextFollowingList = followingList.filter(id => id !== travelerId);
    } else {
      nextFollowingList = [...followingList, travelerId];
    }

    const { error } = await updateProfile(
      profile?.full_name ?? user?.user_metadata?.full_name ?? "",
      profile?.username ?? "",
      currentBio,
      currentWebsite,
      nextFollowingList
    );

    if (!error) {
      const { data } = await supabase.from("profiles").select("*");
      if (data) {
        setRawDbProfiles(data);
      }
    }
  }, [user, profile, rawDbProfiles, isDemo, updateProfile]);

  const handleSendMessage = useCallback(
    async (traveler: travelerProfile) => {
      // Find a place pinned by this traveler to hook the message thread context
      const travelerPlace = allPlaces.find((p) => p.userId === traveler.userId);
      if (!travelerPlace) return; // Need at least one shared footprint to start chat in this UI

      setMessageLoading(true);
      const { conversationId } = await startInquiry(travelerPlace.id);
      setMessageLoading(false);
      if (conversationId) {
        onNavigateToInbox(conversationId);
      }
    },
    [allPlaces, startInquiry, onNavigateToInbox]
  );

  // Initialize mini-map when selected traveler changes
  useEffect(() => {
    if (!selectedtraveler || !miniMapContainerRef.current) return;

    // Destroy existing map instance
    if (miniMapRef.current) {
      miniMapRef.current.remove();
      miniMapRef.current = null;
    }

    const travelerPlaces = allPlaces.filter((p) => p.userId === selectedtraveler.userId);
    if (travelerPlaces.length === 0) return;

    // Center map around traveler's first place
    const firstPlace = travelerPlaces[0];
    const map = L.map(miniMapContainerRef.current, {
      center: [firstPlace.lat, firstPlace.lng],
      zoom: 12,
      zoomControl: false,
      attributionControl: false,
    });

    const tileUrl = isDark ? DARK_TILES : LIGHT_TILES;
    L.tileLayer(tileUrl, { maxZoom: 18 }).addTo(map);

    // Add markers for all their pinned locations
    const markers: L.Marker[] = [];
    travelerPlaces.forEach((p) => {
      const color = p.category === "cafe" ? "#0ea5e9" : p.category === "park" ? "#10b981" : "#ef4444";
      const icon = L.divIcon({
        className: "",
        html: `
          <div class="h-6 w-6 rounded-full border-2 border-white shadow-md flex items-center justify-center text-[10px]" style="background: ${color}; color: white;">
            📍
          </div>
        `,
        iconSize: [24, 24],
        iconAnchor: [12, 12],
      });

      const m = L.marker([p.lat, p.lng], { icon }).addTo(map);
      markers.push(m);
    });

    // Fit map bounds to show all their pins if they have multiple
    if (markers.length > 1) {
      const group = L.featureGroup(markers);
      map.fitBounds(group.getBounds().pad(0.1));
    }

    miniMapRef.current = map;

    return () => {
      if (miniMapRef.current) {
        miniMapRef.current.remove();
        miniMapRef.current = null;
      }
    };
  }, [selectedtraveler, allPlaces, isDark]);

  return (
    <div className="h-full overflow-hidden relative bg-[var(--bg-primary)] flex flex-col">
      <AnimatePresence mode="wait">
        {!selectedtraveler ? (
          /* Search Main View */
          <motion.div
            key="search-list"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="flex-1 flex flex-col h-full"
          >
            {/* Header */}
            <div className="glass-heavy border-b border-[var(--border-primary)] shrink-0">
              <div className="px-5 lg:px-8 py-4 flex items-center justify-between max-w-2xl mx-auto">
                <div className="flex items-center gap-3">
                  <div className="h-9 w-9 rounded-xl bg-gradient-to-br from-sky-400 to-blue-600 flex items-center justify-center shadow-md">
                    <span className="text-white text-base">🔍</span>
                  </div>
                  <div>
                    <h2 className="text-base font-bold text-[var(--text-primary)]">Search Profiles</h2>
                    <p className="text-[10px] text-[var(--text-tertiary)]">Discover other travelers and follow them</p>
                  </div>
                </div>

                {/* Mobile Profile Trigger */}
                <button
                  onClick={onOpenProfile}
                  className="lg:hidden h-9 w-9 rounded-full border border-[var(--border-primary)] shadow-sm bg-[var(--bg-elevated)] flex items-center justify-center cursor-pointer transition-all active:scale-95 outline-none"
                >
                  <span className="text-xs font-semibold text-brand-500">
                    {(profile?.full_name ?? user?.user_metadata?.full_name ?? "EX")
                      .split(" ")
                      .map((n: string) => n[0])
                      .join("")
                      .toUpperCase()
                      .slice(0, 2)}
                  </span>
                </button>
              </div>
            </div>

            {/* Search Input */}
            <div className="px-4 pt-4 max-w-md w-full mx-auto shrink-0">
              <div className="relative">
                <Search className="absolute left-3.5 top-3.5 h-4.5 w-4.5 text-[var(--text-tertiary)]" />
                <input
                  type="text"
                  placeholder="Search by name or username..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full bg-[var(--bg-secondary)] text-xs text-[var(--text-primary)] pl-10 pr-4 py-3.5 rounded-2xl border border-[var(--border-primary)] focus:border-brand-500 outline-none placeholder-[var(--text-tertiary)]"
                />
              </div>
            </div>

            {/* Results List */}
            <div className="flex-1 overflow-y-auto px-4 py-4 max-w-md w-full mx-auto space-y-2">
              {filteredtravelers.length === 0 ? (
                <div className="text-center py-20">
                  <p className="text-xs text-[var(--text-tertiary)] font-medium">No travelers found matching "{searchQuery}"</p>
                </div>
              ) : (
                filteredtravelers.map((traveler) => (
                  <motion.div
                    key={traveler.userId}
                    onClick={() => setSelectedtraveler(traveler)}
                    className="glass rounded-2xl p-3 flex items-center gap-3.5 hover:border-brand-500/20 hover:bg-[var(--bg-tertiary)]/30 transition-all duration-200 cursor-pointer border border-[var(--border-primary)] active:scale-[0.99]"
                  >
                    <div className="h-10 w-10 rounded-full bg-gradient-to-br from-sky-400 to-indigo-600 flex items-center justify-center font-black text-white text-xs shadow-inner">
                      {traveler.initials}
                    </div>
                    <div className="flex-1 min-w-0">
                      <h4 className="text-xs font-bold text-[var(--text-primary)] truncate">{traveler.fullName}</h4>
                      <p className="text-[10px] text-[var(--text-tertiary)] truncate">@{traveler.username}</p>
                    </div>
                    <ArrowLeft className="h-4 w-4 text-[var(--text-tertiary)] rotate-180 shrink-0" />
                  </motion.div>
                ))
              )}
            </div>
          </motion.div>
        ) : (
          /* Profile Detail View */
          <motion.div
            key="profile-detail"
            initial={{ opacity: 0, x: 50 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: 50 }}
            transition={{ type: "spring", damping: 25, stiffness: 220 }}
            className="flex-1 flex flex-col h-full overflow-y-auto"
          >
            {/* Header / Back */}
            <div className="glass-heavy border-b border-[var(--border-primary)] sticky top-0 z-10">
              <div className="px-4 py-3 flex items-center gap-3.5 max-w-xl mx-auto">
                <button
                  onClick={() => setSelectedtraveler(null)}
                  className="h-8 w-8 rounded-full hover:bg-[var(--bg-tertiary)] flex items-center justify-center text-[var(--text-secondary)] hover:text-[var(--text-primary)] cursor-pointer transition-colors"
                >
                  <ArrowLeft className="h-5 w-5" />
                </button>
                <div className="min-w-0">
                  <h3 className="text-xs font-bold text-[var(--text-primary)] truncate">{selectedtraveler.fullName}</h3>
                  <p className="text-[9px] text-[var(--text-tertiary)]">@{selectedtraveler.username}</p>
                </div>
              </div>
            </div>

            {/* Profile Content */}
            <div className="flex-1 max-w-xl w-full mx-auto px-4 py-6 space-y-6 pb-24">
              {/* Bio Card */}
              <div className="glass rounded-3xl p-5 border border-[var(--border-primary)] flex flex-col gap-4">
                <div className="flex items-center gap-4">
                  <div className="h-16 w-16 rounded-full bg-gradient-to-br from-brand-500 to-indigo-600 flex items-center justify-center font-black text-white text-lg shadow-md shrink-0">
                    {selectedtraveler.initials}
                  </div>
                  <div className="min-w-0 flex-1">
                    <h3 className="text-base font-extrabold text-[var(--text-primary)]">{selectedtraveler.fullName}</h3>
                    <p className="text-xs text-[var(--text-tertiary)]">@{selectedtraveler.username}</p>
                    <p className="text-xs text-[var(--text-secondary)] mt-2 leading-relaxed font-medium">
                      {selectedtraveler.bio}
                    </p>
                  </div>
                </div>

                {/* Follow/Message/Explore buttons */}
                <div className="flex gap-2">
                  <button
                    onClick={() => handleFollowToggle(selectedtraveler.userId)}
                    className={cn(
                      "flex-1 py-2.5 rounded-xl text-xs font-bold flex items-center justify-center gap-2 shadow-sm transition-all active:scale-[0.98] cursor-pointer",
                      isFollowingTraveler(selectedtraveler.userId)
                        ? "bg-[var(--bg-tertiary)] text-[var(--text-primary)] border border-[var(--border-primary)]"
                        : "bg-brand-500 text-white hover:bg-brand-600"
                    )}
                  >
                    {isFollowingTraveler(selectedtraveler.userId) ? (
                      <>
                        <UserCheck className="h-4 w-4" />
                        <span>Following</span>
                      </>
                    ) : (
                      <>
                        <UserPlus className="h-4 w-4" />
                        <span>Follow</span>
                      </>
                    )}
                  </button>

                  {(() => {
                    const hasPins = allPlaces.some((p) => p.userId === selectedtraveler.userId);
                    return (
                      <button
                        onClick={() => handleSendMessage(selectedtraveler)}
                        disabled={messageLoading || !hasPins}
                        className={cn(
                          "flex-1 py-2.5 text-white font-bold rounded-xl text-xs flex items-center justify-center gap-2 shadow-md transition-all active:scale-[0.98] cursor-pointer",
                          hasPins
                            ? "bg-gradient-to-br from-sky-400 to-blue-600 hover:from-sky-500 hover:to-blue-700"
                            : "bg-gray-400 opacity-60 cursor-not-allowed"
                        )}
                        title={!hasPins ? "Need at least one public footprint to start chat" : undefined}
                      >
                        {messageLoading ? (
                          <Loader2 className="h-4.5 w-4.5 animate-spin" />
                        ) : (
                          <Send className="h-4 w-4" />
                        )}
                        <span>Message</span>
                      </button>
                    );
                  })()}

                  {(() => {
                    const travelerPlaces = allPlaces.filter((p) => p.userId === selectedtraveler.userId);
                    const hasPins = travelerPlaces.length > 0;
                    return (
                      <button
                        onClick={() => {
                          if (hasPins) {
                            onViewOnMap(travelerPlaces[0]);
                          }
                        }}
                        disabled={!hasPins}
                        className={cn(
                          "flex-1 py-2.5 text-white font-bold rounded-xl text-xs flex items-center justify-center gap-2 shadow-md transition-all active:scale-[0.98] cursor-pointer",
                          hasPins
                            ? "bg-gradient-to-br from-emerald-500 to-teal-600 hover:from-emerald-600 hover:to-teal-700"
                            : "bg-gray-400 opacity-60 cursor-not-allowed"
                        )}
                        title={!hasPins ? "No public footprints to explore" : undefined}
                      >
                        <Compass className="h-4 w-4" />
                        <span>Explore</span>
                      </button>
                    );
                  })()}
                </div>
              </div>

              {/* Stats Counters */}
              <div className="grid grid-cols-3 gap-3">
                <div className="bg-[var(--bg-secondary)] rounded-2xl p-3.5 border border-[var(--border-primary)] text-center">
                  <p className="text-[9px] uppercase tracking-wider font-extrabold text-[var(--text-tertiary)]">Pins Pinned</p>
                  <p className="text-xl font-black text-[var(--text-primary)] mt-1">
                    {allPlaces.filter((p) => p.userId === selectedtraveler.userId).length}
                  </p>
                </div>
                <div className="bg-[var(--bg-secondary)] rounded-2xl p-3.5 border border-[var(--border-primary)] text-center">
                  <p className="text-[9px] uppercase tracking-wider font-extrabold text-[var(--text-tertiary)]">Conquered</p>
                  <p className="text-xl font-black text-[var(--text-primary)] mt-1 flex items-baseline justify-center gap-0.5">
                    {getConqueredArea(selectedtraveler)}
                    <span className="text-[9px] font-medium text-[var(--text-secondary)]">km²</span>
                  </p>
                </div>
                <div className="bg-[var(--bg-secondary)] rounded-2xl p-3.5 border border-[var(--border-primary)] text-center">
                  <p className="text-[9px] uppercase tracking-wider font-extrabold text-[var(--text-tertiary)]">Followers</p>
                  <p className="text-xl font-black text-[var(--text-primary)] mt-1">
                    {getFollowersCount(selectedtraveler)}
                  </p>
                </div>
              </div>

              {/* Interactive Traveler Map */}
              <div className="space-y-2">
                <div className="flex items-center gap-1.5 px-1">
                  <Compass className="h-4.5 w-4.5 text-brand-500" />
                  <span className="text-xs font-bold text-[var(--text-primary)]">Public Traveler Map</span>
                </div>
                <div className="glass rounded-3xl overflow-hidden border border-[var(--border-primary)] p-1.5">
                  <div
                    ref={miniMapContainerRef}
                    className="h-44 w-full rounded-2xl overflow-hidden relative z-0"
                    id="profile-mini-map"
                  />
                </div>
              </div>

              {/* Traveler Places Grid */}
              <div className="space-y-2">
                <div className="flex items-center gap-1.5 px-1">
                  <Landmark className="h-4.5 w-4.5 text-amber-500" />
                  <span className="text-xs font-bold text-[var(--text-primary)]">Places Visited</span>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  {allPlaces
                    .filter((p) => p.userId === selectedtraveler.userId)
                    .map((place) => (
                      <div
                        key={place.id}
                        onClick={() => onViewOnMap(place)}
                        className="glass rounded-2xl overflow-hidden border border-[var(--border-primary)] hover:border-brand-500/20 cursor-pointer flex flex-col h-full shadow-[var(--shadow-sm)]"
                      >
                        <div className={cn("h-20 w-full bg-gradient-to-br flex items-center justify-center", place.photoColor)}>
                          <span className="text-2xl filter drop-shadow-md">
                            {place.category === "cafe" ? "☕" : place.category === "park" ? "🌳" : "⛩️"}
                          </span>
                        </div>
                        <div className="p-3 flex-1 flex flex-col justify-between">
                          <div>
                            <h4 className="text-xs font-bold text-[var(--text-primary)] line-clamp-1">{place.name}</h4>
                            <p className="text-[9px] text-[var(--text-tertiary)] line-clamp-1 mt-0.5">{place.address}</p>
                          </div>
                          <p className="text-[10px] text-[var(--text-secondary)] italic mt-2 line-clamp-2">
                            "{place.description}"
                          </p>
                        </div>
                      </div>
                    ))}
                </div>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
