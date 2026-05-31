import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import { isSupabaseConfigured, supabase } from "../lib/supabase.js";

const AuthContext = createContext(null);

const defaultProfileSettings = {
  showLocation: true,
  showWebsite: true,
  showOrganizations: true,
  showJoinDate: true,
  showStats: true,
  showActivity: true,
};

function deriveUsername(email, displayName) {
  const fromEmail = String(email || "")
    .split("@")[0]
    .replace(/[^a-zA-Z0-9_]/g, "_")
    .slice(0, 50);
  if (fromEmail) return fromEmail;

  return String(displayName || "user")
    .trim()
    .toLowerCase()
    .replace(/\s+/g, "_")
    .replace(/[^a-z0-9_]/g, "")
    .slice(0, 50) || "user";
}

function parseSettings(raw) {
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) {
    return { ...defaultProfileSettings };
  }
  return { ...defaultProfileSettings, ...raw };
}

function usernameFromHandle(handle) {
  return String(handle || "")
    .trim()
    .replace(/^@/, "")
    .replace(/[^a-zA-Z0-9_]/g, "_")
    .slice(0, 50);
}

function mapProfile(user, profile) {
  const metadata = user?.user_metadata || {};
  const displayName =
    profile?.display_name ||
    metadata.display_name ||
    metadata.full_name ||
    user?.email?.split("@")[0] ||
    "Atlas user";

  return {
    id: user?.id,
    email: profile?.email || user?.email || "",
    username: profile?.username || metadata.username || deriveUsername(user?.email, displayName),
    displayName,
    bio: profile?.bio || "",
    avatar_url: profile?.avatar_url || "",
    banner_url: profile?.banner_url || "",
    location: profile?.location || "",
    website: profile?.website || "",
    role: profile?.role || "Contributor",
    settings: parseSettings(profile?.settings),
    createdAt: profile?.created_at || user?.created_at,
    updatedAt: profile?.updated_at,
  };
}

const profileColumns =
  "id, email, username, display_name, bio, avatar_url, banner_url, location, website, role, settings, created_at, updated_at";

export function AuthProvider({ children }) {
  const [session, setSession] = useState(null);
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(isSupabaseConfigured);

  const loadProfile = useCallback(async (user) => {
    if (!supabase || !user) {
      setProfile(null);
      return null;
    }

    try {
      const { data, error } = await supabase
        .from("profiles")
        .select(profileColumns)
        .eq("id", user.id)
        .maybeSingle();

      if (error) {
        console.warn("Could not load profile:", error.message);
      }

      const nextProfile = mapProfile(user, data);
      setProfile(nextProfile);
      return nextProfile;
    } catch (error) {
      console.warn("Profile load failed:", error);
      const nextProfile = mapProfile(user, null);
      setProfile(nextProfile);
      return nextProfile;
    }
  }, []);

  const applySession = useCallback(
    (nextSession) => {
      setSession(nextSession);
      setLoading(false);
      if (nextSession?.user) {
        void loadProfile(nextSession.user);
      } else {
        setProfile(null);
      }
    },
    [loadProfile],
  );

  useEffect(() => {
    if (!supabase) {
      setLoading(false);
      return undefined;
    }

    let ignore = false;

    async function init() {
      const { data, error } = await supabase.auth.getSession();
      if (ignore) return;

      if (error) {
        console.warn("Auth session error:", error.message);
      }

      applySession(data?.session ?? null);
    }

    init();

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, nextSession) => {
      if (ignore) return;
      applySession(nextSession);
    });

    return () => {
      ignore = true;
      subscription.unsubscribe();
    };
  }, [applySession]);

  const signIn = useCallback(async ({ email, password }) => {
    if (!supabase) {
      throw new Error("Supabase is not configured. Add VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY.");
    }

    const { data, error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) throw error;
    if (data.session) {
      applySession(data.session);
    }
    return data;
  }, [applySession]);

  const signUp = useCallback(async ({ email, password, displayName }) => {
    if (!supabase) {
      throw new Error("Supabase is not configured. Add VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY.");
    }

    const username = deriveUsername(email, displayName);
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: {
          display_name: displayName.trim(),
          username,
        },
      },
    });

    if (error) throw error;
    if (data.session) {
      applySession(data.session);
    }
    return data;
  }, [applySession]);

  const signInWithProvider = useCallback(async (provider) => {
    if (!supabase) {
      throw new Error("Supabase is not configured. Add VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY.");
    }

    const { error } = await supabase.auth.signInWithOAuth({
      provider,
      options: {
        redirectTo: window.location.origin,
      },
    });

    if (error) throw error;
  }, []);

  const signOut = useCallback(async () => {
    if (!supabase) return;
    const { error } = await supabase.auth.signOut();
    if (error) throw error;
  }, []);

  const updateProfile = useCallback(
    async (patch) => {
      if (!supabase || !session?.user) {
        throw new Error("Sign in to save profile changes.");
      }

      const user = session.user;
      const current = mapProfile(user, null);
      const mergedSettings = patch.settings
        ? { ...parseSettings(profile?.settings), ...patch.settings }
        : undefined;

      const row = {
        id: user.id,
        email: user.email,
        display_name: (patch.displayName ?? patch.name ?? profile?.displayName ?? current.displayName).trim(),
        username:
          patch.username ??
          (usernameFromHandle(patch.handle) || profile?.username || current.username),
        bio: patch.bio ?? profile?.bio ?? "",
        avatar_url: patch.avatar_url ?? patch.avatar ?? profile?.avatar_url ?? "",
        banner_url: patch.banner_url ?? patch.banner ?? profile?.banner_url ?? "",
        location: patch.location ?? profile?.location ?? "",
        website: patch.website ?? profile?.website ?? "",
        role: patch.role ?? profile?.role ?? "Contributor",
        settings: mergedSettings ?? profile?.settings ?? defaultProfileSettings,
        updated_at: new Date().toISOString(),
      };

      const { data, error } = await supabase
        .from("profiles")
        .upsert(row, { onConflict: "id" })
        .select(profileColumns)
        .single();

      if (error) throw error;

      const nextProfile = mapProfile(user, data);
      setProfile(nextProfile);
      return nextProfile;
    },
    [profile, session],
  );

  const value = useMemo(
    () => ({
      configured: isSupabaseConfigured,
      loading,
      session,
      user: session?.user ?? null,
      profile,
      signIn,
      signUp,
      signInWithProvider,
      signOut,
      updateProfile,
      getAccessToken: () => session?.access_token ?? null,
    }),
    [loading, profile, session, signIn, signInWithProvider, signOut, signUp, updateProfile],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within AuthProvider");
  }
  return context;
}
