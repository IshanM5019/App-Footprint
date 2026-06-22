import { useState } from "react";
import { motion } from "framer-motion";
import { MapPin, Mail, Lock, User, ArrowRight, Loader2, Compass } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { useAuth } from "@/contexts/AuthContext";
import { isSupabaseConfigured } from "@/supabase/client";
import { cn } from "@/lib/cn";

export function AuthView() {
  const { signIn, signUp, enterDemoMode } = useAuth();
  const [mode, setMode] = useState<"login" | "signup">("login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [fullName, setFullName] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [success, setSuccess] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccess(null);
    setSubmitting(true);

    if (mode === "signup") {
      if (!fullName.trim()) {
        setError("Please enter your name.");
        setSubmitting(false);
        return;
      }
      const { error: err } = await signUp(email, password, fullName);
      if (err) {
        setError(err);
      } else {
        setSuccess("Account created! Check your email to confirm, then log in.");
        setMode("login");
      }
    } else {
      const { error: err } = await signIn(email, password);
      if (err) {
        setError(err);
      }
    }
    setSubmitting(false);
  };

  return (
    <div className="h-full flex items-center justify-center bg-[var(--bg-primary)] relative overflow-hidden">
      {/* Background decoration */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-32 -right-32 w-96 h-96 rounded-full bg-sky-500/5 blur-3xl" />
        <div className="absolute -bottom-32 -left-32 w-96 h-96 rounded-full bg-blue-500/5 blur-3xl" />
      </div>

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="relative w-full max-w-md mx-4"
      >
        {/* Branding */}
        <div className="text-center mb-8">
          <div className="h-16 w-16 rounded-2xl bg-gradient-to-br from-sky-400 to-blue-600 flex items-center justify-center shadow-lg mx-auto mb-4">
            <MapPin className="h-8 w-8 text-white" />
          </div>
          <h1 className="text-2xl font-bold text-[var(--text-primary)]">Footprints</h1>
          <p className="text-sm text-[var(--text-tertiary)] mt-1">Your Social Atlas</p>
        </div>

        {/* Card */}
        <div className="glass-heavy rounded-2xl p-6 shadow-[var(--shadow-lg)]">
          {/* Mode Toggle */}
          <div className="flex rounded-xl bg-[var(--bg-tertiary)] p-1 mb-6">
            {(["login", "signup"] as const).map((m) => (
              <button
                key={m}
                onClick={() => {
                  setMode(m);
                  setError(null);
                  setSuccess(null);
                }}
                className={cn(
                  "flex-1 py-2 rounded-lg text-sm font-medium transition-all duration-200 cursor-pointer",
                  mode === m
                    ? "bg-[var(--bg-elevated)] text-[var(--text-primary)] shadow-[var(--shadow-sm)]"
                    : "text-[var(--text-tertiary)] hover:text-[var(--text-secondary)]"
                )}
              >
                {m === "login" ? "Log In" : "Sign Up"}
              </button>
            ))}
          </div>

          {/* Form */}
          <form onSubmit={handleSubmit} className="space-y-4">
            {mode === "signup" && (
              <div className="relative">
                <User className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-[var(--text-tertiary)]" />
                <input
                  type="text"
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  placeholder="Full name"
                  className="w-full h-11 pl-10 pr-4 rounded-xl bg-[var(--bg-tertiary)] border border-[var(--border-primary)] text-sm text-[var(--text-primary)] placeholder:text-[var(--text-tertiary)] outline-none focus:border-brand-500/50 focus:ring-1 focus:ring-brand-500/25 transition-all"
                />
              </div>
            )}

            <div className="relative">
              <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-[var(--text-tertiary)]" />
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="Email address"
                required
                className="w-full h-11 pl-10 pr-4 rounded-xl bg-[var(--bg-tertiary)] border border-[var(--border-primary)] text-sm text-[var(--text-primary)] placeholder:text-[var(--text-tertiary)] outline-none focus:border-brand-500/50 focus:ring-1 focus:ring-brand-500/25 transition-all"
              />
            </div>

            <div className="relative">
              <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-[var(--text-tertiary)]" />
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Password"
                required
                minLength={6}
                className="w-full h-11 pl-10 pr-4 rounded-xl bg-[var(--bg-tertiary)] border border-[var(--border-primary)] text-sm text-[var(--text-primary)] placeholder:text-[var(--text-tertiary)] outline-none focus:border-brand-500/50 focus:ring-1 focus:ring-brand-500/25 transition-all"
              />
            </div>

            {/* Error */}
            {error && (
              <motion.p
                initial={{ opacity: 0, y: -4 }}
                animate={{ opacity: 1, y: 0 }}
                className="text-xs text-danger-500 bg-danger-500/10 px-3 py-2 rounded-lg"
              >
                {error}
              </motion.p>
            )}

            {/* Success */}
            {success && (
              <motion.p
                initial={{ opacity: 0, y: -4 }}
                animate={{ opacity: 1, y: 0 }}
                className="text-xs text-accent-500 bg-accent-500/10 px-3 py-2 rounded-lg"
              >
                {success}
              </motion.p>
            )}

            <Button
              type="submit"
              variant="primary"
              className="w-full bg-gradient-to-r from-sky-400 to-blue-600 hover:from-sky-500 hover:to-blue-700"
              disabled={submitting}
            >
              {submitting ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <>
                  {mode === "login" ? "Log In" : "Create Account"}
                  <ArrowRight className="h-4 w-4" />
                </>
              )}
            </Button>
          </form>

          {/* Divider */}
          <div className="flex items-center gap-3 my-5">
            <div className="flex-1 h-px bg-[var(--border-primary)]" />
            <span className="text-xs text-[var(--text-tertiary)]">or</span>
            <div className="flex-1 h-px bg-[var(--border-primary)]" />
          </div>

          {/* Demo Mode */}
          <Button
            type="button"
            variant="muted"
            className="w-full"
            onClick={enterDemoMode}
          >
            <Compass className="h-4 w-4" />
            Continue as Guest
          </Button>

          {!isSupabaseConfigured && (
            <p className="text-[11px] text-amber-500/80 bg-amber-500/10 px-3 py-2 rounded-lg mt-3">
              Supabase not configured — guest mode uses local demo data.
              To enable real accounts, add your credentials to .env
            </p>
          )}
        </div>

        {/* Footer */}
        <p className="text-center text-xs text-[var(--text-tertiary)] mt-6">
          By continuing, you agree to Footprints' Terms of Service and Privacy Policy.
        </p>
      </motion.div>
    </div>
  );
}
