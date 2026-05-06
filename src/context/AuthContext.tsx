import React, { createContext, useContext, useEffect, useState } from 'react';
import supabase from '../lib/supabase';

export type UserRole = 'guest' | 'user' | 'artist' | 'admin';

export interface Profile {
  id: string;
  user_id: string;
  username: string;
  bio: string;
  avatar_url: string;
  is_artist: boolean;
  role: UserRole;
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
}

const AuthContext = createContext<AuthContextType>(null!);
export const useAuth = () => useContext(AuthContext);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<any>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);
  const [isGuest, setIsGuest] = useState(false);

  // Ambil atau buat profile untuk user
  const fetchOrCreateProfile = async (supabaseUser: any) => {
    try {
      const res = await fetch(`/api/profiles?user_id=${supabaseUser.id}`);
      const data = await res.json();

      if (data && data.user_id) {
        setProfile(data);
      } else {
        // User baru (misal dari Google OAuth) — buat profile otomatis
        // Ambil nama lalu sanitasi: huruf kecil, hapus spasi & karakter aneh
        const rawName =
          supabaseUser.user_metadata?.name ||
          supabaseUser.user_metadata?.full_name ||
          supabaseUser.email?.split('@')[0] ||
          'user';
        // Sanitasi: huruf kecil, spasi jadi underscore, hapus karakter selain a-z 0-9 _
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
            avatar_url: avatarUrl,
            bio: '',
            role: 'user',
            is_artist: false,
          }),
        });
        const newProfile = await createRes.json();
        if (newProfile && newProfile.user_id) setProfile(newProfile);
      }
    } catch (e) {
      console.error('Profile fetch/create error:', e);
    }
  };

  const refreshProfile = async () => {
    if (user) await fetchOrCreateProfile(user);
  };

  useEffect(() => {
    // Cek session awal
    supabase.auth.getSession().then(({ data: { session } }) => {
      setUser(session?.user ?? null);
      if (session?.user) fetchOrCreateProfile(session.user);
      setLoading(false);
    });

    // Listen perubahan auth (login, logout, OAuth callback)
    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
      setUser(session?.user ?? null);
      setIsGuest(false);

      if (session?.user) {
        await fetchOrCreateProfile(session.user);
      } else {
        setProfile(null);
      }

      // Setelah OAuth redirect selesai, hapus params dari URL
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

  return (
    <AuthContext.Provider value={{ user, profile, loading, isGuest, isAdmin, isArtist, refreshProfile, signOut, continueAsGuest }}>
      {children}
    </AuthContext.Provider>
  );
}
