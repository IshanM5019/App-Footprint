import { useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, LogOut, Mail, Shield, AlertTriangle, CheckCircle2 } from "lucide-react";
import { Avatar } from "@/components/ui/Avatar";
import { Button } from "@/components/ui/Button";
import { useAuth } from "@/contexts/AuthContext";
import { hasCustomEnv } from "@/supabase/client";

interface ProfileModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export function ProfileModal({ isOpen, onClose }: ProfileModalProps) {
  const { user, profile, isDemo, signOut } = useAuth();

  // Escape key to close modal
  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        onClose();
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  // Derive display details
  const fullName = profile?.full_name ?? user?.user_metadata?.full_name ?? "Explorer";
  const username = profile?.username ?? "explorer";
  const email = user?.email ?? "explorer@footprints.app";
  const initials = fullName
    .split(" ")
    .map((n: string) => n[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);

  const handleLogoutClick = async () => {
    onClose();
    await signOut();
  };

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
        {/* Overlay backdrop */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={onClose}
          className="absolute inset-0 bg-black/60 backdrop-blur-md"
        />

        {/* Modal card */}
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 15 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 15 }}
          transition={{ type: "spring", duration: 0.4 }}
          className="relative w-full max-w-md glass-heavy rounded-3xl p-6 shadow-[var(--shadow-xl)] overflow-hidden z-10"
        >
          {/* Top decoration gradient */}
          <div className="absolute top-0 left-0 right-0 h-2 bg-gradient-to-r from-sky-400 via-blue-500 to-indigo-600" />

          {/* Close button */}
          <button
            onClick={onClose}
            className="absolute top-5 right-5 h-8 w-8 rounded-full flex items-center justify-center bg-[var(--bg-tertiary)] hover:bg-[var(--border-primary)] text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition-all cursor-pointer"
          >
            <X className="h-4.5 w-4.5" />
          </button>

          {/* Header */}
          <div className="text-center mt-4 mb-6">
            <div className="relative inline-block mb-3">
              <Avatar
                initials={initials}
                colorClass="bg-gradient-to-br from-sky-400 to-indigo-600 text-xl font-bold"
                size="lg"
                online
              />
            </div>
            <h2 className="text-xl font-bold text-[var(--text-primary)] leading-snug">
              {fullName}
            </h2>
            <p className="text-sm text-[var(--text-tertiary)] mt-0.5">@{username}</p>
          </div>

          {/* Details list */}
          <div className="space-y-3.5 mb-6">
            <div className="flex items-center gap-3 px-4 py-3 rounded-2xl bg-[var(--bg-tertiary)] border border-[var(--border-secondary)]">
              <Mail className="h-4.5 w-4.5 text-[var(--text-tertiary)] shrink-0" />
              <div className="min-w-0 flex-1">
                <p className="text-[10px] uppercase tracking-wider font-semibold text-[var(--text-tertiary)]">
                  Email Address
                </p>
                <p className="text-sm text-[var(--text-primary)] truncate font-medium">{email}</p>
              </div>
            </div>

            {/* Mode status card */}
            {isDemo ? (
              <div className="rounded-2xl border border-amber-500/20 bg-amber-500/5 p-4 space-y-2">
                <div className="flex items-center gap-2 text-amber-500">
                  <Shield className="h-4.5 w-4.5 shrink-0" />
                  <span className="text-xs font-bold uppercase tracking-wider">Guest Account (Sandbox)</span>
                </div>
                <p className="text-xs text-[var(--text-secondary)] leading-relaxed">
                  You are exploring with mock data. Changes made during guest mode are stored locally in state and will reset.
                </p>

                {/* Developer warning if credentials aren't in .env */}
                {!hasCustomEnv && (
                  <div className="mt-3 pt-3 border-t border-amber-500/10 flex items-start gap-2.5 bg-amber-500/8 px-3 py-2.5 rounded-xl">
                    <AlertTriangle className="h-4 w-4 text-amber-500 shrink-0 mt-0.5" />
                    <div>
                      <h4 className="text-[11px] font-bold text-amber-600 dark:text-amber-400 uppercase tracking-wide">
                        Developer Notice
                      </h4>
                      <p className="text-[10px] text-[var(--text-secondary)] mt-0.5 leading-normal">
                        To link live authentication and database hosting, define <code className="font-mono text-amber-600 dark:text-amber-400 bg-black/10 px-1 rounded">VITE_SUPABASE_URL</code> and <code className="font-mono text-amber-600 dark:text-amber-400 bg-black/10 px-1 rounded">VITE_SUPABASE_ANON_KEY</code> inside your <code className="font-mono bg-black/10 px-1 rounded">.env</code> file.
                      </p>
                    </div>
                  </div>
                )}
              </div>
            ) : (
              <div className="rounded-2xl border border-emerald-500/20 bg-emerald-500/5 p-4">
                <div className="flex items-center gap-2 text-emerald-500">
                  <CheckCircle2 className="h-4.5 w-4.5 shrink-0" />
                  <span className="text-xs font-bold uppercase tracking-wider">Connected Account</span>
                </div>
                <p className="text-xs text-[var(--text-secondary)] leading-relaxed mt-1">
                  Connected to Supabase. Your pinned places, drafts, and inquiries are securely sync'd across all sessions.
                </p>
              </div>
            )}
          </div>

          {/* Footer actions */}
          <div className="flex gap-3">
            <Button
              variant="outline"
              className="flex-1 rounded-2xl"
              onClick={onClose}
            >
              Close
            </Button>
            <Button
              variant="danger"
              className="flex-1 rounded-2xl gap-2 font-semibold shadow-md bg-gradient-to-r from-rose-500 to-red-600 hover:from-rose-600 hover:to-red-700"
              onClick={handleLogoutClick}
            >
              <LogOut className="h-4.5 w-4.5" />
              Sign Out
            </Button>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
}
