import { createClient } from "@supabase/supabase-js";

// Default credentials (anon key is public/safe to expose in browser code)
const DEFAULT_URL = "https://towxndlgqtrrubzlizud.supabase.co";
const DEFAULT_ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InRvd3huZGxncXRycnViemxpenVkIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODEyODA5MzYsImV4cCI6MjA5Njg1NjkzNn0.9HnhFscWOfrV6G7C6l1A1JmNk0t_n8LyG9zF0-nOnuY";

const supabaseUrl = (import.meta.env.VITE_SUPABASE_URL as string) || DEFAULT_URL;
const supabaseAnonKey = (import.meta.env.VITE_SUPABASE_ANON_KEY as string) || DEFAULT_ANON_KEY;

/** True when Supabase URL and anon key are available (either from env or fallback defaults) */
export const isSupabaseConfigured = !!supabaseUrl && !!supabaseAnonKey;

/** True when custom environment variables are provided */
export const hasCustomEnv = !!(
  import.meta.env.VITE_SUPABASE_URL &&
  import.meta.env.VITE_SUPABASE_ANON_KEY
);

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: true,
  },
});
