import { useState, useCallback, useEffect } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { MapCanvas } from "@/components/map/MapCanvas";
import { LocationCard } from "@/components/map/LocationCard";
import { ConquerPostModal } from "@/components/map/ConquerPostModal";
import { useFootprints } from "@/hooks/useFootprints";
import { useInquiry } from "@/hooks/useChat";
import type { Place } from "@/types/database";
import { Avatar } from "@/components/ui/Avatar";
import { useAuth } from "@/contexts/AuthContext";
import { useLocationTracker } from "@/hooks/useLocationTracker";
import { Activity, Award, Compass, Play, Square, Trash2, X, Sparkles } from "lucide-react";
import { cn } from "@/lib/cn";

interface MapViewProps {
  isDark: boolean;
  onNavigateToInbox?: (conversationId?: string) => void;
  onOpenProfile?: () => void;
  initialSelectedPlace?: Place | null;
}

export function MapView({ isDark, onNavigateToInbox, onOpenProfile, initialSelectedPlace }: MapViewProps) {
  const { places, loading, createFootprint } = useFootprints();
  const { startInquiry } = useInquiry();
  const { user, profile } = useAuth();
  const [selectedPlace, setSelectedPlace] = useState<Place | null>(initialSelectedPlace ?? null);

  useEffect(() => {
    if (initialSelectedPlace) {
      const t = setTimeout(() => {
        setSelectedPlace(initialSelectedPlace);
      }, 0);
      return () => clearTimeout(t);
    }
  }, [initialSelectedPlace]);
  const [filter, setFilter] = useState<"all" | "friends" | "public">("all");
  const [conquerActive, setConquerActive] = useState(false);
  const [mapType, setMapType] = useState<"standard" | "satellite">("standard");

  const [isConquerModalOpen, setIsConquerModalOpen] = useState(false);
  const [poiToConquer, setPoiToConquer] = useState<Place | null>(null);

  const handleOpenConquer = useCallback((place: Place) => {
    setPoiToConquer(place);
    setIsConquerModalOpen(true);
  }, []);

  const handlePublishConquerPost = useCallback(
    async (reviewText: string, photoColor: string) => {
      if (!poiToConquer) return { error: "No place selected to conquer" };

      const { error } = await createFootprint({
        venue_name: poiToConquer.name,
        address: poiToConquer.address,
        category: poiToConquer.category,
        latitude: poiToConquer.lat,
        longitude: poiToConquer.lng,
        review_text: reviewText,
        photo_urls: [photoColor],
      });

      if (!error) {
        setSelectedPlace(null);
        setPoiToConquer(null);
      }

      return { error: error ?? null };
    },
    [poiToConquer, createFootprint]
  );

  const {
    tracks,
    isTracking,
    isSimulating,
    simStep,
    simTotalSteps,
    simLoading,
    lastDiscovered,
    setLastDiscovered,
    startSimulation,
    stopSimulation,
    clearTracks,
    unlockedLandmarksCount,
    totalLandmarksCount,
    conqueredArea,
  } = useLocationTracker();

  const handleToggleConquer = useCallback(() => {
    setConquerActive((prev) => {
      const next = !prev;
      if (!next) {
        stopSimulation();
      }
      return next;
    });
  }, [stopSimulation]);

  const fullName = profile?.full_name ?? user?.user_metadata?.full_name ?? "Explorer";
  const initials = fullName
    .split(" ")
    .map((n: string) => n[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);

  const filteredPlaces = places.filter((p) => {
    if (filter === "all") return true;
    if (filter === "public") return p.isPublic;
    if (filter === "friends") return !p.isPublic;
    return true;
  });

  const handleMarkerClick = useCallback((place: Place) => {
    setSelectedPlace(place);
  }, []);

  const handleInquire = useCallback(
    async (place: Place) => {
      // Find the footprint ID from the place
      const { conversationId } = await startInquiry(place.id);
      setSelectedPlace(null);
      if (conversationId) {
        onNavigateToInbox?.(conversationId);
      }
    },
    [startInquiry, onNavigateToInbox]
  );

  return (
    <div className="relative w-full h-full overflow-hidden">
      {/* Map + Floating Actions (including My Location) */}
      <MapCanvas
        places={filteredPlaces}
        isDark={isDark}
        onMarkerClick={handleMarkerClick}
        notificationCount={3}
        onFilterChange={setFilter}
        currentFilter={filter}
        conquerMode={conquerActive}
        conquerTracks={tracks}
        mapType={mapType}
        onMapTypeChange={setMapType}
        selectedPlace={selectedPlace}
      />

      {/* Map Overlay Header */}
      <div className="absolute top-4 left-4 right-4 z-20 flex items-center justify-between pointer-events-none">
        <div className="glass-heavy rounded-2xl px-4 py-2.5 shadow-[var(--shadow-md)] pointer-events-auto flex items-center gap-3 max-w-sm">
          <div className="h-7 w-7 rounded-lg bg-gradient-to-br from-sky-400 to-blue-600 flex items-center justify-center lg:hidden">
            <span className="text-white text-xs">👣</span>
          </div>
          <div>
            <p className="text-sm font-semibold text-[var(--text-primary)]">
              {loading ? "Loading…" : "Exploring Map"}
            </p>
            <div className="flex items-center gap-1.5">
              <p className="text-[11px] text-[var(--text-tertiary)]">{filteredPlaces.length} pins nearby</p>
              {isTracking && (
                <span className="flex items-center gap-1 text-[9px] text-emerald-500 font-medium">
                  <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 pulse-dot" />
                  Tracking
                </span>
              )}
            </div>
          </div>
        </div>

        {/* Mobile profile avatar trigger */}
        <button
          onClick={onOpenProfile}
          className="lg:hidden pointer-events-auto h-10 w-10 rounded-full border border-[var(--border-primary)] shadow-[var(--shadow-md)] bg-[var(--bg-glass-heavy)] hover:bg-[var(--bg-elevated)] flex items-center justify-center cursor-pointer transition-all active:scale-95 outline-none"
        >
          <Avatar initials={initials} colorClass="bg-gradient-to-br from-sky-400 to-blue-600" size="sm" />
        </button>
      </div>

      {/* Conquer Mode floating trigger/panel */}
      <div className="absolute top-20 left-4 z-20 pointer-events-auto">
        {!conquerActive ? (
          <button
            onClick={handleToggleConquer}
            className="glass-heavy hover:bg-[var(--bg-elevated)] border border-[var(--border-primary)] shadow-[var(--shadow-md)] rounded-2xl px-4 py-2.5 flex items-center gap-2.5 transition-all duration-200 active:scale-95 cursor-pointer text-xs font-bold text-[var(--text-secondary)] hover:text-[var(--text-primary)]"
          >
            <span className="text-base animate-pulse">🚩</span>
            <span>Conquer Mode</span>
          </button>
        ) : (
          <motion.div
            initial={{ opacity: 0, x: -20, scale: 0.95 }}
            animate={{ opacity: 1, x: 0, scale: 1 }}
            className="w-[calc(100vw-2rem)] sm:w-[320px] glass-heavy rounded-2xl p-4 shadow-[var(--shadow-lg)] border-brand-500/20 flex flex-col gap-3.5"
          >
            {/* Header */}
            <div className="flex items-center justify-between pb-2 border-b border-[var(--border-primary)]">
              <div className="flex items-center gap-2">
                <span className="text-base">🚩</span>
                <div>
                  <h3 className="text-xs font-bold text-[var(--text-primary)]">Conquer Mode</h3>
                  <div className="flex items-center gap-1 mt-0.5">
                    <span className={cn(
                      "h-1.5 w-1.5 rounded-full",
                      isTracking ? "bg-emerald-500 pulse-dot" : "bg-amber-500"
                    )} />
                    <span className="text-[9px] text-[var(--text-secondary)] font-medium">
                      {isTracking ? "Always-On Tracker Active" : "Tracker Starting…"}
                    </span>
                  </div>
                </div>
              </div>
              <button
                onClick={handleToggleConquer}
                className="h-6 w-6 rounded-full hover:bg-[var(--bg-tertiary)] flex items-center justify-center text-[var(--text-tertiary)] hover:text-[var(--text-primary)] transition-colors cursor-pointer"
              >
                <X className="h-3.5 w-3.5" />
              </button>
            </div>

            {/* Stats */}
            <div className="grid grid-cols-2 gap-2">
              <div className="bg-[var(--bg-tertiary)]/50 rounded-xl p-2.5 flex flex-col gap-0.5 border border-[var(--border-secondary)]">
                <div className="flex items-center gap-1 text-[var(--text-tertiary)]">
                  <Activity className="h-3 w-3 text-brand-500" />
                  <span className="text-[9px] font-semibold uppercase tracking-wider">Conquered</span>
                </div>
                <div className="flex items-baseline gap-0.5 mt-0.5">
                  <span className="text-sm font-black text-[var(--text-primary)]">{conqueredArea}</span>
                  <span className="text-[9px] font-medium text-[var(--text-secondary)]">km²</span>
                </div>
              </div>

              <div className="bg-[var(--bg-tertiary)]/50 rounded-xl p-2.5 flex flex-col gap-0.5 border border-[var(--border-secondary)]">
                <div className="flex items-center gap-1 text-[var(--text-tertiary)]">
                  <Award className="h-3 w-3 text-amber-500" />
                  <span className="text-[9px] font-semibold uppercase tracking-wider">Landmarks</span>
                </div>
                <div className="flex items-baseline gap-0.5 mt-0.5">
                  <span className="text-sm font-black text-[var(--text-primary)]">{unlockedLandmarksCount}</span>
                  <span className="text-[9px] font-medium text-[var(--text-secondary)]">/ {totalLandmarksCount}</span>
                </div>
              </div>
            </div>

            {/* Simulation Controls */}
            <div className="flex flex-col gap-2.5 bg-[var(--bg-secondary)]/80 rounded-xl p-3 border border-[var(--border-secondary)]">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-1.5">
                  <Compass className="h-3.5 w-3.5 text-brand-500" />
                  <span className="text-xs font-bold text-[var(--text-primary)]">Walking Simulation</span>
                </div>
                {isSimulating && (
                  <span className="text-[9px] bg-brand-500/10 text-brand-500 font-bold px-1.5 py-0.5 rounded-full animate-pulse">
                    Step {simStep + 1}/{simTotalSteps}
                  </span>
                )}
                {simLoading && (
                  <span className="text-[9px] bg-amber-500/10 text-amber-500 font-bold px-1.5 py-0.5 rounded-full animate-pulse">
                    Loading route…
                  </span>
                )}
              </div>

              {isSimulating ? (
                <div className="flex flex-col gap-2">
                  <div className="w-full bg-[var(--bg-tertiary)] rounded-full h-1 overflow-hidden">
                    <div
                      className="bg-gradient-to-r from-sky-400 to-blue-500 h-full rounded-full transition-all duration-500"
                      style={{ width: `${((simStep + 1) / simTotalSteps) * 100}%` }}
                    />
                  </div>
                  <p className="text-[10px] text-[var(--text-secondary)] italic">
                    Simulating walk...
                  </p>
                  <button
                    onClick={stopSimulation}
                    className="w-full py-1.5 bg-rose-500 hover:bg-rose-600 text-white font-semibold rounded-lg text-xs flex items-center justify-center gap-1.5 shadow-[var(--shadow-sm)] active:scale-95 transition-all cursor-pointer"
                  >
                    <Square className="h-3 w-3 fill-white" />
                    Stop Simulation
                  </button>
                </div>
              ) : (
                <div className="flex flex-col gap-2">
                  <p className="text-[10px] text-[var(--text-tertiary)]">
                    Simulate a walking tour along real roads to unlock discoverable landmarks.
                  </p>
                  <button
                    onClick={startSimulation}
                    className="w-full py-1.5 bg-brand-500 hover:bg-brand-600 text-white font-semibold rounded-lg text-xs flex items-center justify-center gap-1.5 shadow-[var(--shadow-sm)] active:scale-95 transition-all cursor-pointer"
                  >
                    <Play className="h-3 w-3 fill-white" />
                    Start Simulation Walk
                  </button>
                </div>
              )}
            </div>

            {/* Clear history */}
            {tracks.length > 0 && (
              <div className="flex items-center justify-between pt-0.5">
                <p className="text-[9px] text-[var(--text-tertiary)]">
                  {tracks.length} points tracked
                </p>
                <button
                  onClick={clearTracks}
                  className="text-[9px] text-rose-500 hover:text-rose-600 font-semibold flex items-center gap-1 cursor-pointer transition-colors"
                >
                  <Trash2 className="h-2.5 w-2.5" />
                  Clear Trail
                </button>
              </div>
            )}
          </motion.div>
        )}
      </div>

      {/* Discovery Alert Overlay */}
      <AnimatePresence>
        {lastDiscovered && (
          <motion.div
            initial={{ opacity: 0, y: -20, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -20, scale: 0.95 }}
            className="absolute top-24 left-1/2 -translate-x-1/2 z-50 glass-heavy rounded-2xl px-4 py-3.5 shadow-[var(--shadow-xl)] border-brand-500/30 flex items-center gap-3 max-w-sm w-[calc(100%-2rem)]"
          >
            <div className="h-8 w-8 rounded-full bg-brand-500/20 text-brand-500 flex items-center justify-center shrink-0 animate-bounce">
              <Sparkles className="h-4 w-4" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-[10px] font-bold text-brand-500 uppercase tracking-wider">New Discovery</p>
              <h4 className="text-xs font-bold text-[var(--text-primary)] truncate">{lastDiscovered}</h4>
              <p className="text-[9px] text-[var(--text-tertiary)]">Added to your Daily Drafts to review later!</p>
            </div>
            <button
              onClick={() => setLastDiscovered(null)}
              className="text-[var(--text-tertiary)] hover:text-[var(--text-primary)] shrink-0 transition-colors p-1 cursor-pointer"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Location Card */}
      <AnimatePresence>
        {selectedPlace && (
          <LocationCard
            place={selectedPlace}
            onClose={() => setSelectedPlace(null)}
            onInquire={handleInquire}
            onConquer={handleOpenConquer}
          />
        )}
      </AnimatePresence>

      {/* Conquer Post Modal */}
      <ConquerPostModal
        isOpen={isConquerModalOpen}
        onClose={() => {
          setIsConquerModalOpen(false);
          setPoiToConquer(null);
        }}
        place={poiToConquer}
        onSubmit={handlePublishConquerPost}
      />
    </div>
  );
}
