import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { MapPin, Filter, Bell, X, Navigation, Loader2, Layers } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { cn } from "@/lib/cn";

interface FloatingActionsProps {
  notificationCount: number;
  onQuickPin: () => void;
  onFilterChange: (filter: "all" | "friends" | "public") => void;
  currentFilter: "all" | "friends" | "public";
  onLocateMe: () => void;
  locatingStatus: "idle" | "locating" | "found" | "error";
  mapType?: "standard" | "satellite";
  onMapTypeChange?: (mapType: "standard" | "satellite") => void;
}

export function FloatingActions({
  notificationCount,
  onQuickPin,
  onFilterChange,
  currentFilter,
  onLocateMe,
  locatingStatus,
  mapType = "standard",
  onMapTypeChange,
}: FloatingActionsProps) {
  const [showFilter, setShowFilter] = useState(false);

  const filters: { id: "all" | "friends" | "public"; label: string }[] = [
    { id: "all", label: "All Pins" },
    { id: "friends", label: "Friends Only" },
    { id: "public", label: "Public" },
  ];

  return (
    <div className="absolute bottom-24 lg:bottom-6 right-4 z-30 flex flex-col items-end gap-3">
      {/* Filter Panel */}
      <AnimatePresence>
        {showFilter && (
          <motion.div
            initial={{ opacity: 0, scale: 0.9, y: 8 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.9, y: 8 }}
            className="glass-heavy rounded-2xl p-2 shadow-[var(--shadow-lg)] mb-1"
          >
            <div className="flex flex-col gap-1">
              {filters.map((f) => (
                <button
                  key={f.id}
                  onClick={() => {
                    onFilterChange(f.id);
                    setShowFilter(false);
                  }}
                  className={cn(
                    "px-4 py-2 rounded-xl text-sm font-medium transition-all duration-150 whitespace-nowrap cursor-pointer text-left",
                    currentFilter === f.id
                      ? "bg-brand-500/15 text-brand-500"
                      : "text-[var(--text-secondary)] hover:bg-[var(--bg-tertiary)]"
                  )}
                >
                  {f.label}
                </button>
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Notification Bell */}
      <Button
        variant="glass"
        size="icon-lg"
        className="rounded-full shadow-[var(--shadow-lg)] relative"
        onClick={() => {}}
      >
        <Bell className="h-5 w-5" />
        {notificationCount > 0 && (
          <Badge count={notificationCount} className="absolute -top-1 -right-1" />
        )}
      </Button>

      {/* Filter */}
      <Button
        variant="glass"
        size="icon-lg"
        className={cn(
          "rounded-full shadow-[var(--shadow-lg)]",
          showFilter && "bg-brand-500/15 text-brand-500"
        )}
        onClick={() => setShowFilter(!showFilter)}
      >
        {showFilter ? <X className="h-5 w-5" /> : <Filter className="h-5 w-5" />}
      </Button>

      {/* Map Type Toggle */}
      {onMapTypeChange && (
        <Button
          variant="glass"
          size="icon-lg"
          className={cn(
            "rounded-full shadow-[var(--shadow-lg)] transition-all duration-200",
            mapType === "satellite" && "bg-brand-500/15 text-brand-500 border-brand-500/30"
          )}
          onClick={() => onMapTypeChange(mapType === "satellite" ? "standard" : "satellite")}
          title="Toggle Satellite View"
        >
          <Layers className="h-5 w-5" />
        </Button>
      )}

      {/* My Location */}
      <Button
        variant="glass"
        size="icon-lg"
        className={cn(
          "rounded-full shadow-[var(--shadow-lg)]",
          locatingStatus === "found" && "text-brand-500 border-brand-500/30"
        )}
        onClick={onLocateMe}
        disabled={locatingStatus === "locating"}
      >
        {locatingStatus === "locating" ? (
          <Loader2 className="h-5 w-5 animate-spin" />
        ) : (
          <Navigation
            className={cn("h-5 w-5", locatingStatus === "found" && "fill-brand-500")}
          />
        )}
      </Button>

      {/* Quick Pin */}
      <Button
        variant="primary"
        size="icon-lg"
        className="rounded-full shadow-[var(--shadow-lg)] bg-gradient-to-br from-sky-400 to-blue-600 hover:from-sky-500 hover:to-blue-700"
        onClick={onQuickPin}
      >
        <MapPin className="h-5 w-5" />
      </Button>
    </div>
  );
}
