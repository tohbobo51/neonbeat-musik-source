import React, { createContext, useContext, useEffect, useState } from 'react';
import supabase from '../lib/supabase';

export type UserRole = 'guest' | 'user' | 'artist' | 'admin';

export interface Profile {
  id: string;
  user_id: string;
  username: string;
  full_name?: string;
  bio: string;
  avatar_url: string;
  is_artist: boolean;
  is_verified?: boolean;
  role: UserRole;
  follower_count?: number;
  following_count?: number;
  created_at: string;
}

interface AuthContextType {
  user: any;
  profile: Profile | null;
  loading: boolean;
  isGuest: boolean;
  isAdmin: boolean;
  isArtist: boolean;
  refreshProfile: () => Promise<void>;
  signOut: () => Promise<void>;
  continueAsGuest: () => void;
  displayName: string;
}

const AuthContext = createContext<AuthContextType>(null!);
export const useAuth = () => useContext(AuthContext);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<any>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);
  const [isGuest, setIsGuest] = useState(false);

  const fetchOrCreateProfile = async (supabaseUser: any) => {
    try {
      const res = await fetch(`/api/profiles?user_id=${supabaseUser.id}`);
      const data = await res.json();

      if (data && data.user_id) {
        setProfile(data);
      } else {
        const rawName =
          supabaseUser.user_metadata?.name ||
          supabaseUser.user_metadata?.full_name ||
          supabaseUser.email?.split('@')[0] ||
          'user';
        const username = rawName
          .toLowerCase()
          .replace(/\s+/g, '_')
          .replace(/[^a-z0-9_]/g, '')
          .replace(/^_+|_+$/g, '')
          .slice(0, 30) || 'user';

        const avatarUrl =
          supabaseUser.user_metadata?.avatar_url ||
          supabaseUser.user_metadata?.picture ||
          '';

        const createRes = await fetch('/api/profiles', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            user_id: supabaseUser.id,
            username,
            full_name: rawName,
            avatar_url: avatarUrl,
            bio: '',
            role: 'user',
            is_artist: false,
          }),
        });
        const newProfile = await createRes.json();
        if (newProfile && newProfile.user_id) {
          setProfile(newProfile);
          // Mark as new user for onboarding
          if (!localStorage.getItem('neonbeat_onboarded')) {
            localStorage.setItem('neonbeat_is_new_user', 'true');
          }
        }
      }
    } catch (e) {
      console.error('Profile fetch/create error:', e);
    }
  };

  const refreshProfile = async () => {
    if (user) await fetchOrCreateProfile(user);
  };

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setUser(session?.user ?? null);
      if (session?.user) fetchOrCreateProfile(session.user);
      setLoading(false);
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
      setUser(session?.user ?? null);
      setIsGuest(false);
      if (session?.user) {
        await fetchOrCreateProfile(session.user);
      } else {
        setProfile(null);
      }
      if (event === 'SIGNED_IN' && window.location.hash) {
        window.history.replaceState({}, document.title, window.location.pathname);
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  const signOut = async () => {
    await supabase.auth.signOut();
    setUser(null);
    setProfile(null);
    setIsGuest(false);
  };

  const continueAsGuest = () => {
    setIsGuest(true);
    setUser(null);
    setProfile(null);
  };

  const isAdmin = profile?.role === 'admin';
  const isArtist = profile?.role === 'artist' || profile?.is_artist === true || isAdmin;
  const displayName = profile?.full_name || profile?.username || 'User';

  return (
    <AuthContext.Provider value={{ user, profile, loading, isGuest, isAdmin, isArtist, refreshProfile, signOut, continueAsGuest, displayName }}>
      {children}
    </AuthContext.Provider>
  );
}
