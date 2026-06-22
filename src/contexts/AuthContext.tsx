import {
  createContext,
  useContext,
  useEffect,
  useState,
  useCallback,
  type ReactNode,
} from "react";
import type { Session, User } from "@supabase/supabase-js";
import { supabase, isSupabaseConfigured } from "@/supabase/client";
import type { Profile } from "@/types/database";
import type { TrackPoint } from "@/hooks/useLocationTracker";

// ── Context Shape ────────────────────────────────────────────

interface AuthContextValue {
  user: User | null;
  profile: Profile | null;
  session: Session | null;
  loading: boolean;
  isDemo: boolean;
  signUp: (email: string, password: string, fullName: string) => Promise<{ error: string | null }>;
  signIn: (email: string, password: string) => Promise<{ error: string | null }>;
  signOut: () => Promise<void>;
  enterDemoMode: () => void;
  updateProfile?: (
    fullName: string,
    username: string,
    bio?: string,
    website?: string,
    followingList?: string[],
    tracks?: TrackPoint[]
  ) => Promise<{ error: string | null }>;
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

// ── Demo User ────────────────────────────────────────────────

const DEMO_USER_ID = "demo-user";

const demoUser = {
  id: DEMO_USER_ID,
  email: "explorer@footprints.app",
  aud: "authenticated",
  role: "authenticated",
  app_metadata: {},
  user_metadata: { full_name: "Explorer" },
  created_at: new Date().toISOString(),
} as unknown as User;

const demoProfile: Profile = {
  id: DEMO_USER_ID,
  username: "explorer",
  full_name: "Explorer",
  avatar_url: null,
  created_at: new Date().toISOString(),
  updated_at: new Date().toISOString(),
};

// ── Provider ─────────────────────────────────────────────────

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(isSupabaseConfigured);
  const [isDemo, setIsDemo] = useState(false);

  // Fetch user profile from DB
  const fetchProfile = useCallback(async (userId: string) => {
    const { data } = await supabase
      .from("profiles")
      .select("*")
      .eq("id", userId)
      .single();
    setProfile(data);
  }, []);

  // Listen for auth state changes (only when Supabase is configured)
  useEffect(() => {
    if (!isSupabaseConfigured) {
      return;
    }

    // Get initial session
    supabase.auth.getSession().then(({ data: { session: s } }) => {
      setSession(s);
      setUser(s?.user ?? null);
      if (s?.user) {
        fetchProfile(s.user.id);
      }
      setLoading(false);
    });

    // Subscribe to changes
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, s) => {
      setSession(s);
      setUser(s?.user ?? null);
      if (s?.user) {
        fetchProfile(s.user.id);
      } else {
        setProfile(null);
      }
      setLoading(false);
    });

    return () => subscription.unsubscribe();
  }, [fetchProfile]);

  // ── Auth Methods ───────────────────────────────────────────

  const signUp = useCallback(
    async (email: string, password: string, fullName: string) => {
      if (!isSupabaseConfigured) {
        return { error: "Supabase is not configured. Use 'Continue as Guest' or add your .env credentials." };
      }

      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: { full_name: fullName },
        },
      });

      if (error) return { error: error.message };

      // Create profile row directly (no trigger dependency)
      if (data.user) {
        const username = email.split("@")[0].replace(/[^a-zA-Z0-9_]/g, "") + "_" + data.user.id.slice(0, 6);
        const { error: profileError } = await supabase
          .from("profiles")
          .upsert({
            id: data.user.id,
            username,
            full_name: fullName,
          }, { onConflict: "id" });

        if (profileError) {
          console.warn("[Footprints] Profile creation failed:", profileError.message);
          // Don't block signup — profile can be created later
        }
      }

      return { error: null };
    },
    []
  );

  const signIn = useCallback(async (email: string, password: string) => {
    if (!isSupabaseConfigured) {
      return { error: "Supabase is not configured. Use 'Continue as Guest' or add your .env credentials." };
    }
    const { error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });
    return { error: error?.message ?? null };
  }, []);

  const signOut = useCallback(async () => {
    if (isDemo) {
      setUser(null);
      setProfile(null);
      setIsDemo(false);
      return;
    }
    await supabase.auth.signOut();
    setUser(null);
    setProfile(null);
    setSession(null);
  }, [isDemo]);

  const enterDemoMode = useCallback(() => {
    setUser(demoUser);
    setProfile(demoProfile);
    setIsDemo(true);
    setLoading(false);
  }, []);

  const updateProfile = useCallback(
    async (
      fullName: string,
      username: string,
      bio?: string,
      website?: string,
      followingList?: string[],
      tracks?: TrackPoint[]
    ) => {
      if (isDemo) {
        setProfile((prev) => {
          if (!prev) return null;
          let meta = { avatarUrl: null as string | null, bio: "", website: "", followingList: [] as string[], tracks: [] as TrackPoint[] };
          try {
            if (prev.avatar_url && prev.avatar_url.startsWith("{")) {
              meta = JSON.parse(prev.avatar_url);
            } else {
              meta.avatarUrl = prev.avatar_url;
            }
          } catch (err) {
            console.warn("[AuthContext] Metadata parse failed", err);
          }

          if (bio !== undefined) meta.bio = bio;
          if (website !== undefined) meta.website = website;
          if (followingList !== undefined) meta.followingList = followingList;
          if (tracks !== undefined) meta.tracks = tracks;

          return {
            ...prev,
            full_name: fullName,
            username,
            avatar_url: JSON.stringify(meta),
          };
        });
        return { error: null };
      }

      // Read current profile to keep avatarUrl
      const { data: currentProfile } = await supabase
        .from("profiles")
        .select("avatar_url")
        .eq("id", user?.id)
        .single();

      let meta = { avatarUrl: null as string | null, bio: "", website: "", followingList: [] as string[], tracks: [] as TrackPoint[] };
      try {
        if (currentProfile?.avatar_url && currentProfile.avatar_url.startsWith("{")) {
          meta = JSON.parse(currentProfile.avatar_url);
        } else {
          meta.avatarUrl = currentProfile?.avatar_url ?? null;
        }
      } catch (err) {
        console.warn("[AuthContext] Metadata parse failed", err);
      }

      if (bio !== undefined) meta.bio = bio;
      if (website !== undefined) meta.website = website;
      if (followingList !== undefined) meta.followingList = followingList;
      if (tracks !== undefined) meta.tracks = tracks;

      const { error } = await supabase
        .from("profiles")
        .update({
          full_name: fullName,
          username,
          avatar_url: JSON.stringify(meta),
          updated_at: new Date().toISOString(),
        })
        .eq("id", user?.id);

      if (error) {
        return { error: error.message };
      }

      if (user) {
        await fetchProfile(user.id);
      }

      return { error: null };
    },
    [isDemo, user, fetchProfile]
  );

  return (
    <AuthContext.Provider
      value={{ user, profile, session, loading, isDemo, signUp, signIn, signOut, enterDemoMode, updateProfile }}
    >
      {children}
    </AuthContext.Provider>
  );
}

// ── Hook ─────────────────────────────────────────────────────

// eslint-disable-next-line react-refresh/only-export-components
export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within <AuthProvider>");
  return ctx;
}
