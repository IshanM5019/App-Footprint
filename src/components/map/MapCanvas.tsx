import { useMap } from "@/hooks/useMap";
import { FloatingActions } from "@/components/map/FloatingActions";
import type { Place } from "@/types/database";
import type { TrackPoint } from "@/hooks/useLocationTracker";
import { Compass, Loader2 } from "lucide-react";

interface MapCanvasProps {
  places: Place[];
  isDark: boolean;
  onMarkerClick: (place: Place) => void;
  notificationCount?: number;
  onFilterChange?: (filter: "all" | "friends" | "public") => void;
  currentFilter?: "all" | "friends" | "public";
  conquerMode?: boolean;
  conquerTracks?: TrackPoint[];
  mapType?: "standard" | "satellite";
  onMapTypeChange?: (mapType: "standard" | "satellite") => void;
  selectedPlace?: Place | null;
}

export function MapCanvas({
  places,
  isDark,
  onMarkerClick,
  notificationCount = 3,
  onFilterChange,
  currentFilter = "all",
  conquerMode = false,
  conquerTracks = [],
  mapType = "standard",
  onMapTypeChange,
  selectedPlace = null,
}: MapCanvasProps) {
  const { containerRef, locateMe, locatingStatus, searchNearby, poiLoading } = useMap({
    places,
    isDark,
    onMarkerClick,
    conquerMode,
    conquerTracks,
    mapType,
    selectedPlace,
  });

  return (
    <>
      <div
        ref={containerRef}
        className="absolute inset-0 w-full h-full z-0"
        id="map-canvas"
      />
      {/* Search Nearby POIs Button */}
      <div className="absolute top-20 left-1/2 -translate-x-1/2 z-20 pointer-events-auto">
        <button
          onClick={searchNearby}
          disabled={poiLoading}
          className="glass-heavy hover:bg-[var(--bg-elevated)] border border-brand-500/20 hover:border-brand-500/40 shadow-[var(--shadow-md)] rounded-full px-4 py-2 flex items-center gap-1.5 transition-all duration-200 active:scale-95 cursor-pointer text-xs font-bold text-[var(--text-primary)] disabled:opacity-80"
        >
          {poiLoading ? (
            <Loader2 className="h-3.5 w-3.5 animate-spin text-brand-500" />
          ) : (
            <Compass className="h-3.5 w-3.5 text-brand-500" />
          )}
          <span>{poiLoading ? "Searching Area..." : "Search This Area"}</span>
        </button>
      </div>
      <FloatingActions
        notificationCount={notificationCount}
        onQuickPin={() => {}}
        onFilterChange={onFilterChange ?? (() => {})}
        currentFilter={currentFilter}
        onLocateMe={locateMe}
        locatingStatus={locatingStatus}
        mapType={mapType}
        onMapTypeChange={onMapTypeChange}
      />
    </>
  );
}
