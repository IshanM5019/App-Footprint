import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, Image, MessageSquare, Check, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { categoryIcons } from "@/data/mock";
import { cn } from "@/lib/cn";
import type { Place } from "@/types/database";

interface ConquerPostModalProps {
  isOpen: boolean;
  onClose: () => void;
  place: Place | null;
  onSubmit: (reviewText: string, photoColor: string) => Promise<{ error: string | null }>;
}

const GRADIENTS = [
  { id: "g1", name: "Deep Ocean", colorClass: "from-sky-400 to-indigo-600" },
  { id: "g2", name: "Emerald Forest", colorClass: "from-emerald-400 to-teal-600" },
  { id: "g3", name: "Sunset Blaze", colorClass: "from-orange-400 to-red-500" },
  { id: "g4", name: "Royal Orchid", colorClass: "from-purple-500 to-indigo-700" },
  { id: "g5", name: "Sunfire Gold", colorClass: "from-amber-400 to-orange-600" },
  { id: "g6", name: "Rose Quartz", colorClass: "from-red-500 to-rose-600" },
];

export function ConquerPostModal({ isOpen, onClose, place, onSubmit }: ConquerPostModalProps) {
  const [reviewText, setReviewText] = useState("");
  const [selectedGradient, setSelectedGradient] = useState(GRADIENTS[0].colorClass);
  const [submitting, setSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Sync default gradient based on place category on mount/load
  useEffect(() => {
    if (place) {
      const t = setTimeout(() => {
        setReviewText("");
        setErrorMsg(null);
        setSelectedGradient(place.photoColor);
      }, 0);
      return () => clearTimeout(t);
    }
  }, [place]);

  if (!place) return null;

  const handlePublish = async () => {
    if (!reviewText.trim()) {
      setErrorMsg("Please write a story or review to share your footprints!");
      return;
    }

    setSubmitting(true);
    setErrorMsg(null);
    try {
      const { error } = await onSubmit(reviewText, selectedGradient);
      if (error) {
        setErrorMsg(error);
      } else {
        onClose();
      }
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "An unexpected error occurred.";
      setErrorMsg(message);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 overflow-hidden pointer-events-auto">
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 0.6 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="absolute inset-0 bg-black/60 backdrop-blur-sm"
          />

          {/* Modal Container */}
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 20 }}
            transition={{ type: "spring", damping: 25, stiffness: 300 }}
            className="w-full max-w-md glass-heavy rounded-3xl overflow-hidden shadow-[var(--shadow-xl)] border-brand-500/20 flex flex-col max-h-[90vh] z-10"
          >
            {/* Header */}
            <div className={`p-5 bg-gradient-to-br ${selectedGradient} relative text-white shrink-0`}>
              <div className="absolute inset-0 bg-black/10" />
              <div className="absolute top-4 right-4 z-10">
                <button
                  onClick={onClose}
                  className="h-8 w-8 rounded-full bg-black/30 backdrop-blur-sm flex items-center justify-center text-white/95 hover:bg-black/50 transition-colors cursor-pointer"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>

              <div className="relative flex items-center gap-2 bg-white/20 backdrop-blur-sm rounded-full px-3 py-1 w-fit mb-3">
                <span className="text-sm">{categoryIcons[place.category] ?? "📍"}</span>
                <span className="text-[10px] font-bold uppercase tracking-wider">{place.category}</span>
              </div>
              <h3 className="relative text-lg font-black tracking-tight drop-shadow-md">{place.name}</h3>
              <p className="relative text-[10px] text-white/80 truncate mt-1 drop-shadow-sm">{place.address}</p>
            </div>

            {/* Scrollable Form Body */}
            <div className="flex-1 overflow-y-auto p-5 space-y-4">
              {errorMsg && (
                <div className="bg-rose-500/10 border border-rose-500/20 text-rose-500 rounded-xl p-3 text-xs font-semibold">
                  {errorMsg}
                </div>
              )}

              {/* Textarea review */}
              <div className="space-y-1.5">
                <label className="text-[10px] uppercase font-extrabold tracking-widest text-[var(--text-tertiary)] flex items-center gap-1">
                  <MessageSquare className="h-3 w-3" />
                  <span>Share Your Travel Story</span>
                </label>
                <textarea
                  rows={4}
                  placeholder="What did you do here? Share your favorite memories, tips for other travelers, or reviews..."
                  value={reviewText}
                  onChange={(e) => setReviewText(e.target.value)}
                  className="w-full bg-[var(--bg-tertiary)]/50 text-xs text-[var(--text-primary)] p-3.5 rounded-2xl border border-[var(--border-primary)] focus:border-brand-500 outline-none placeholder-[var(--text-tertiary)] resize-none"
                />
              </div>

              {/* Gradient Selector */}
              <div className="space-y-2">
                <label className="text-[10px] uppercase font-extrabold tracking-widest text-[var(--text-tertiary)] flex items-center gap-1">
                  <Image className="h-3 w-3" />
                  <span>Choose Post Cover Gradient</span>
                </label>
                <div className="grid grid-cols-3 gap-2">
                  {GRADIENTS.map((g) => {
                    const isSelected = selectedGradient === g.colorClass;
                    return (
                      <button
                        key={g.id}
                        onClick={() => setSelectedGradient(g.colorClass)}
                        className={cn(
                          "h-14 rounded-xl bg-gradient-to-br border flex items-center justify-center cursor-pointer transition-all active:scale-95 shadow-sm",
                          g.colorClass,
                          isSelected ? "border-white scale-[1.03] ring-2 ring-brand-500/40" : "border-transparent opacity-70 hover:opacity-100"
                        )}
                      >
                        {isSelected && (
                          <div className="h-5 w-5 rounded-full bg-white flex items-center justify-center shadow-md">
                            <Check className="h-3.5 w-3.5 text-brand-500 font-bold" />
                          </div>
                        )}
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>

            {/* Footer buttons */}
            <div className="p-4 border-t border-[var(--border-primary)] bg-[var(--bg-secondary)] flex gap-2 shrink-0">
              <Button
                variant="muted"
                className="flex-1 py-2.5 rounded-xl text-xs font-bold"
                onClick={onClose}
                disabled={submitting}
              >
                Cancel
              </Button>
              <Button
                variant="primary"
                className="flex-1 py-2.5 rounded-xl text-xs font-bold bg-gradient-to-r from-purple-500 to-indigo-600 hover:from-purple-600 hover:to-indigo-700"
                onClick={handlePublish}
                disabled={submitting}
              >
                {submitting ? (
                  <span>Publishing...</span>
                ) : (
                  <>
                    <Sparkles className="h-3.5 w-3.5 fill-white" />
                    <span>Publish Post</span>
                  </>
                )}
              </Button>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
