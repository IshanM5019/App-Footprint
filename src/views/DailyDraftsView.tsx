import { motion, AnimatePresence } from "framer-motion";
import { CheckCircle2, XCircle, Shield, Clock, MapPin, Eye, EyeOff, Loader2, Compass } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { categoryIcons } from "@/data/mock";
import { useDrafts } from "@/hooks/useDrafts";
import { cn } from "@/lib/cn";
import type { LocationDraft, PlaceCategory } from "@/types/database";
import { Avatar } from "@/components/ui/Avatar";
import { useAuth } from "@/contexts/AuthContext";

interface DailyDraftsViewProps {
  onOpenProfile?: () => void;
}

export function DailyDraftsView({ onOpenProfile }: DailyDraftsViewProps) {
  const { pending, approved, dismissed, loading, approveDraft, dismissDraft } = useDrafts();
  const { user, profile } = useAuth();

  const todayPendingDraftsCount = pending.filter((d) => {
    const visitedDate = new Date(d.visited_at);
    const today = new Date();
    return (
      visitedDate.getDate() === today.getDate() &&
      visitedDate.getMonth() === today.getMonth() &&
      visitedDate.getFullYear() === today.getFullYear()
    );
  }).length;

  const fullName = profile?.full_name ?? user?.user_metadata?.full_name ?? "Explorer";
  const initials = fullName
    .split(" ")
    .map((n: string) => n[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);

  const handleApprove = async (id: string) => {
    await approveDraft(id);
  };

  const handleDismiss = async (id: string) => {
    await dismissDraft(id);
  };

  return (
    <div className="h-full overflow-y-auto pb-24 lg:pb-6">
      {/* Header */}
      <div className="sticky top-0 z-10 glass-heavy">
        <div className="px-5 lg:px-8 py-5 border-b border-[var(--border-primary)]">
          <div className="flex items-center justify-between mb-1">
            <div className="flex items-center gap-3">
              <div className="h-9 w-9 rounded-xl bg-gradient-to-br from-amber-400 to-orange-500 flex items-center justify-center shadow-md">
                <Shield className="h-5 w-5 text-white" />
              </div>
              <div>
                <h2 className="text-lg font-bold text-[var(--text-primary)]">Daily Drafts</h2>
                <p className="text-xs text-[var(--text-tertiary)]">Review your location history before it goes public</p>
              </div>
            </div>

            {/* Mobile profile avatar trigger */}
            <button
              onClick={onOpenProfile}
              className="lg:hidden h-10 w-10 rounded-full border border-[var(--border-primary)] shadow-[var(--shadow-sm)] flex items-center justify-center cursor-pointer transition-all active:scale-95 bg-[var(--bg-glass-heavy)] outline-none"
            >
              <Avatar initials={initials} colorClass="bg-gradient-to-br from-sky-400 to-blue-600" size="sm" />
            </button>
          </div>

          {/* Stats */}
          <div className="flex gap-3 mt-4">
            <StatChip
              icon={<Clock className="h-3.5 w-3.5" />}
              label="Pending"
              count={pending.length}
              color="text-amber-500 bg-amber-500/10"
            />
            <StatChip
              icon={<Eye className="h-3.5 w-3.5" />}
              label="Approved"
              count={approved.length}
              color="text-accent-500 bg-accent-500/10"
            />
            <StatChip
              icon={<EyeOff className="h-3.5 w-3.5" />}
              label="Private"
              count={dismissed.length}
              color="text-surface-400 bg-surface-400/10"
            />
          </div>
        </div>
      </div>

      {/* Draft Cards */}
      <div className="px-4 lg:px-8 py-4 space-y-3 max-w-2xl mx-auto">
        {/* Daily Tracker Banner */}
        {!loading && todayPendingDraftsCount > 0 && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            className="glass border-brand-500/20 bg-brand-500/5 rounded-2xl p-4 shadow-[var(--shadow-sm)] flex items-center gap-3.5"
          >
            <div className="h-10 w-10 rounded-xl bg-brand-500/10 text-brand-500 flex items-center justify-center shrink-0 border border-brand-500/20">
              <Compass className="h-5.5 w-5.5 animate-pulse" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-[10px] font-bold text-brand-500 uppercase tracking-wider">Background Tracker</p>
              <p className="text-xs text-[var(--text-secondary)] mt-0.5 leading-relaxed">
                We detected <span className="font-bold text-[var(--text-primary)]">{todayPendingDraftsCount} new place{todayPendingDraftsCount > 1 ? "s" : ""}</span> you visited today. Review and approve them to pin on your map!
              </p>
            </div>
          </motion.div>
        )}

        {/* Loading */}
        {loading && (
          <div className="flex items-center justify-center py-16">
            <Loader2 className="h-6 w-6 animate-spin text-brand-500" />
          </div>
        )}

        {!loading && pending.length === 0 && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="text-center py-16"
          >
            <div className="h-16 w-16 rounded-full bg-accent-500/10 flex items-center justify-center mx-auto mb-4">
              <CheckCircle2 className="h-8 w-8 text-accent-500" />
            </div>
            <p className="text-base font-semibold text-[var(--text-primary)]">All caught up!</p>
            <p className="text-sm text-[var(--text-tertiary)] mt-1">No pending drafts to review.</p>
          </motion.div>
        )}

        <AnimatePresence mode="popLayout">
          {pending.map((draft) => (
            <DraftCard
              key={draft.id}
              draft={draft}
              onApprove={() => handleApprove(draft.id)}
              onDismiss={() => handleDismiss(draft.id)}
            />
          ))}
        </AnimatePresence>

        {/* Processed section */}
        {(approved.length > 0 || dismissed.length > 0) && (
          <div className="pt-4">
            <p className="text-xs font-semibold uppercase tracking-widest text-[var(--text-tertiary)] mb-3 px-1">
              Processed
            </p>
            <div className="space-y-2">
              {[...approved, ...dismissed].map((draft) => (
                <ProcessedCard key={draft.id} draft={draft} />
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

// ── Sub-components ───────────────────────────────────────────

function StatChip({ icon, label, count, color }: { icon: React.ReactNode; label: string; count: number; color: string }) {
  return (
    <div className={cn("flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold", color)}>
      {icon}
      <span>{count}</span>
      <span className="opacity-70">{label}</span>
    </div>
  );
}

function formatTimestamp(ts: string): string {
  const d = new Date(ts);
  const now = new Date();
  const diffMs = now.getTime() - d.getTime();
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

  const time = d.toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit", hour12: true });

  if (diffDays === 0) return `Today at ${time}`;
  if (diffDays === 1) return `Yesterday at ${time}`;
  return `${diffDays} days ago at ${time}`;
}

function DraftCard({ draft, onApprove, onDismiss }: { draft: LocationDraft; onApprove: () => void; onDismiss: () => void }) {
  const cat = (draft.category ?? "landmark") as PlaceCategory;
  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, x: -200, transition: { duration: 0.3 } }}
      className="rounded-2xl border border-[var(--border-primary)] bg-[var(--bg-elevated)] shadow-[var(--shadow-sm)] overflow-hidden hover:shadow-[var(--shadow-md)] transition-shadow duration-200"
    >
      <div className="p-4">
        <div className="flex items-start gap-3">
          <div className="h-11 w-11 rounded-xl bg-[var(--bg-tertiary)] flex items-center justify-center text-lg shrink-0">
            {categoryIcons[cat] ?? "📍"}
          </div>
          <div className="flex-1 min-w-0">
            <h3 className="text-sm font-semibold text-[var(--text-primary)] truncate">{draft.venue_name}</h3>
            <div className="flex items-center gap-1.5 mt-0.5 text-xs text-[var(--text-tertiary)]">
              <MapPin className="h-3 w-3 shrink-0" />
              <span className="truncate">{draft.address ?? "Unknown address"}</span>
            </div>
            <div className="flex items-center gap-1.5 mt-1 text-xs text-[var(--text-tertiary)]">
              <Clock className="h-3 w-3 shrink-0" />
              <span>{formatTimestamp(draft.visited_at)}</span>
            </div>
          </div>
        </div>

        <div className="flex gap-2 mt-4">
          <Button variant="accent" size="sm" className="flex-1 text-xs" onClick={onApprove}>
            <CheckCircle2 className="h-3.5 w-3.5" />
            Approve & Pin
          </Button>
          <Button variant="muted" size="sm" className="flex-1 text-xs" onClick={onDismiss}>
            <XCircle className="h-3.5 w-3.5" />
            Keep Private
          </Button>
        </div>
      </div>
    </motion.div>
  );
}

function ProcessedCard({ draft }: { draft: LocationDraft }) {
  const isApproved = draft.status === "approved";
  const cat = (draft.category ?? "landmark") as PlaceCategory;
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className={cn(
        "flex items-center gap-3 px-4 py-3 rounded-xl border transition-all",
        isApproved
          ? "border-accent-500/20 bg-accent-500/5"
          : "border-[var(--border-secondary)] bg-[var(--bg-tertiary)] opacity-60"
      )}
    >
      <span className="text-base">{categoryIcons[cat] ?? "📍"}</span>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium text-[var(--text-primary)] truncate">{draft.venue_name}</p>
        <p className="text-xs text-[var(--text-tertiary)]">{formatTimestamp(draft.visited_at)}</p>
      </div>
      <div className={cn("flex items-center gap-1 text-xs font-medium", isApproved ? "text-accent-500" : "text-surface-400")}>
        {isApproved ? <Eye className="h-3.5 w-3.5" /> : <EyeOff className="h-3.5 w-3.5" />}
        <span>{isApproved ? "Public" : "Private"}</span>
      </div>
    </motion.div>
  );
}
