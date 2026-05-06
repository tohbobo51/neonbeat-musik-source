import supabase from './supabase';

// Login Google langsung lewat Supabase OAuth milik kamu sendiri
export async function signInWithGoogle(_appName = 'NeonBeat') {
  const { error } = await supabase.auth.signInWithOAuth({
    provider: 'google',
    options: {
      redirectTo: window.location.origin,
      queryParams: {
        access_type: 'offline',
        prompt: 'select_account',
      },
    },
  });
  if (error) console.error('[google-auth] OAuth error:', error.message);
}

// Tidak perlu redirect handler lagi karena Supabase handle otomatis
export async function handleGoogleRedirect() {
  // Supabase JS otomatis handle callback dari OAuth redirect
  // Tidak perlu logic manual
}
