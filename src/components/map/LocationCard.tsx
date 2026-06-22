import { motion } from "framer-motion";
import { X, MessageSquare, Calendar, MapPin, User, Flag } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Avatar } from "@/components/ui/Avatar";
import type { Place } from "@/types/database";
import { categoryIcons } from "@/data/mock";

interface LocationCardProps {
  place: Place;
  onClose: () => void;
  onInquire: (place: Place) => void;
  onConquer?: (place: Place) => void;
}

export function LocationCard({ place, onClose, onInquire, onConquer }: LocationCardProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 100, scale: 0.95 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, y: 100, scale: 0.95 }}
      transition={{ type: "spring", damping: 25, stiffness: 300 }}
      className="absolute bottom-24 lg:bottom-6 left-4 right-20 lg:left-6 lg:right-auto lg:w-[400px] z-40"
    >
      <div className="glass-heavy rounded-2xl shadow-[var(--shadow-xl)] overflow-hidden">
        {/* Photo Banner */}
        <div className={`h-32 bg-gradient-to-br ${place.photoColor} relative`}>
          <div className="absolute inset-0 bg-black/20" />
          <div className="absolute top-3 left-3 flex items-center gap-1.5 bg-black/40 backdrop-blur-sm rounded-full px-2.5 py-1">
            <span className="text-sm">{categoryIcons[place.category]}</span>
            <span className="text-xs text-white/90 font-medium capitalize">{place.category}</span>
          </div>
          <button
            onClick={onClose}
            className="absolute top-3 right-3 h-8 w-8 rounded-full bg-black/40 backdrop-blur-sm flex items-center justify-center text-white/90 hover:bg-black/60 transition-colors cursor-pointer"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Content */}
        <div className="p-4 space-y-3">
          <div>
            <h3 className="text-base font-bold text-[var(--text-primary)] leading-tight">{place.name}</h3>
            <div className="flex items-center gap-1.5 mt-1 text-xs text-[var(--text-tertiary)]">
              <MapPin className="h-3 w-3 shrink-0" />
              <span className="truncate">{place.address}</span>
            </div>
          </div>

          <p className="text-sm text-[var(--text-secondary)] leading-relaxed line-clamp-2">
            {place.userId === "poi"
              ? "Discoverable local spot. Click 'Conquer & Pin' below to write your review and share your travel memories!"
              : place.description}
          </p>

          {/* Visitor Info */}
          {place.userId !== "poi" && (
            <div className="flex items-center gap-3 py-2 border-t border-b border-[var(--border-secondary)]">
              <Avatar initials={place.visitorAvatar} size="sm" colorClass="bg-brand-500" />
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-1.5 text-sm">
                  <User className="h-3 w-3 text-[var(--text-tertiary)]" />
                  <span className="font-medium text-[var(--text-primary)]">{place.visitor}</span>
                </div>
                <div className="flex items-center gap-1.5 text-xs text-[var(--text-tertiary)]">
                  <Calendar className="h-3 w-3" />
                  <span>{place.visitDate}</span>
                </div>
              </div>
            </div>
          )}

          {/* Photo Grid Placeholder */}
          <div className="grid grid-cols-3 gap-1.5">
            {[0, 1, 2].map((i) => (
              <div
                key={i}
                className={`aspect-square rounded-lg bg-gradient-to-br ${place.photoColor} opacity-${70 - i * 20}`}
              />
            ))}
          </div>

          {/* CTA */}
          {place.userId === "poi" ? (
            <Button
              variant="primary"
              className="w-full bg-gradient-to-r from-purple-500 to-indigo-600 hover:from-purple-600 hover:to-indigo-700"
              onClick={() => onConquer?.(place)}
            >
              <Flag className="h-4 w-4" />
              Conquer & Pin Place
            </Button>
          ) : (
            <Button
              variant="primary"
              className="w-full bg-gradient-to-r from-sky-400 to-blue-600 hover:from-sky-500 hover:to-blue-700"
              onClick={() => onInquire(place)}
            >
              <MessageSquare className="h-4 w-4" />
              Inquire About This Place
            </Button>
          )}
        </div>
      </div>
    </motion.div>
  );
}
