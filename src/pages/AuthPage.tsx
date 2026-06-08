import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Music, Mail, Lock, User, Eye, EyeOff, Chrome, Check, X } from 'lucide-react';
import supabase from '../lib/supabase';
import { signInWithGoogle } from '../lib/googleAuth';
import { useAuth } from '../context/AuthContext';

function sanitizeUsername(raw: string) {
  return raw
    .toLowerCase()
    .replace(/\s+/g, '_')
    .replace(/[^a-z0-9_]/g, '')
    .replace(/^_+|_+$/g, '')
    .slice(0, 30);
}

export default function AuthPage() {
  const { continueAsGuest } = useAuth();
  const [mode, setMode] = useState<'login' | 'signup'>('login');

  // Form daftar
  const [regUsername, setRegUsername] = useState('');
  const [regUsernameClean, setRegUsernameClean] = useState('');
  const [regUsernameStatus, setRegUsernameStatus] = useState<'idle'|'checking'|'available'|'taken'|'short'>('idle');
  const [regEmail, setRegEmail] = useState('');
  const [regPassword, setRegPassword] = useState('');

  // Form masuk — pakai username atau email
  const [loginUsername, setLoginUsername] = useState('');
  const [loginPassword, setLoginPassword] = useState('');

  const [showPw, setShowPw] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  // Cek ketersediaan username saat daftar
  useEffect(() => {
    if (mode !== 'signup') return;
    const clean = sanitizeUsername(regUsername);
    setRegUsernameClean(clean);
    if (!clean) { setRegUsernameStatus('idle'); return; }
    if (clean.length < 3) { setRegUsernameStatus('short'); return; }
    setRegUsernameStatus('checking');
    const t = setTimeout(async () => {
      try {
        const res = await fetch(`/api/profiles?check_username=${encodeURIComponent(clean)}`);
        const data = await res.json();
        setRegUsernameStatus(data.available ? 'available' : 'taken');
      } catch { setRegUsernameStatus('idle'); }
    }, 500);
    return () => clearTimeout(t);
  }, [regUsername, mode]);

  const handleSignup = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(''); setSuccess(''); setLoading(true);
    try {
      if (!regUsernameClean || regUsernameClean.length < 3) {
        setError('Username minimal 3 karakter'); return;
      }
      if (regUsernameStatus === 'taken') {
        setError('Username sudah dipakai, coba yang lain'); return;
      }
      const { data, error: signUpErr } = await supabase.auth.signUp({
        email: regEmail,
        password: regPassword,
      });
      if (signUpErr) throw signUpErr;
      if (data.user) {
        await fetch('/api/profiles', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            user_id: data.user.id,
            username: regUsernameClean,
            role: 'user',
            is_artist: false,
          }),
        });
      }
      setSuccess('Akun berhasil dibuat! Silakan masuk.');
      setMode('login');
      setLoginUsername(regUsernameClean);
    } catch (err: any) {
      setError(err.message || 'Terjadi kesalahan');
    } finally { setLoading(false); }
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(''); setLoading(true);
    try {
      const isEmail = loginUsername.includes('@');

      if (isEmail) {
        // Login langsung pakai email (untuk admin atau akun dibuat via Supabase)
        const { error: loginErr } = await supabase.auth.signInWithPassword({
          email: loginUsername.trim(),
          password: loginPassword,
        });
        if (loginErr) throw loginErr;
      } else {
        // Cari email berdasarkan username
        const clean = sanitizeUsername(loginUsername);
        if (!clean) { setError('Masukkan username atau email'); return; }

        const res = await fetch(`/api/profiles?username=${encodeURIComponent(clean)}`);
        const profile = await res.json();

        if (!profile || !profile.user_id) {
          setError('Username tidak ditemukan'); return;
        }

        // Ambil email dari Supabase auth via API
        const emailRes = await fetch(`/api/profiles?get_email=1&user_id=${profile.user_id}`);
        const emailData = await emailRes.json();

        if (!emailData?.email) {
          setError('Akun tidak ditemukan'); return;
        }

        const { error: loginErr } = await supabase.auth.signInWithPassword({
          email: emailData.email,
          password: loginPassword,
        });
        if (loginErr) throw loginErr;
      }
    } catch (err: any) {
      if (err.message?.includes('Invalid login')) {
        setError('Username/email atau password salah');
      } else {
        setError(err.message || 'Terjadi kesalahan');
      }
    } finally { setLoading(false); }
  };

  return (
    <div className="min-h-screen bg-[#0a0010] flex items-center justify-center p-4 relative overflow-hidden">
      {/* Background animasi */}
      <div className="absolute inset-0 overflow-hidden">
        {[...Array(20)].map((_, i) => (
          <motion.div key={i} className="absolute rounded-full opacity-10"
            style={{
              width: Math.random() * 300 + 50, height: Math.random() * 300 + 50,
              background: `radial-gradient(circle, ${['#9333ea','#a855f7','#7c3aed','#c026d3','#db2777'][i % 5]}, transparent)`,
              left: `${Math.random() * 100}%`, top: `${Math.random() * 100}%`,
            }}
            animate={{ scale: [1, 1.3, 1], opacity: [0.05, 0.15, 0.05] }}
            transition={{ duration: 3 + Math.random() * 4, repeat: Infinity, delay: Math.random() * 2 }}
          />
        ))}
      </div>

      <motion.div initial={{ opacity: 0, y: 30 }} animate={{ opacity: 1, y: 0 }} className="relative z-10 w-full max-w-md">
        {/* Logo */}
        <div className="text-center mb-8">
          <motion.div animate={{ rotate: [0, 360] }} transition={{ duration: 8, repeat: Infinity, ease: 'linear' }} className="inline-block mb-4">
            <div className="w-16 h-16 rounded-full bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center shadow-[0_0_30px_#9333ea]">
              <Music size={32} className="text-white" />
            </div>
          </motion.div>
          <h1 className="text-4xl font-black text-transparent bg-clip-text bg-gradient-to-r from-purple-400 via-pink-400 to-purple-600" style={{ fontFamily: 'Orbitron, monospace' }}>NeonBeat</h1>
          <p className="text-purple-300/60 text-sm mt-1">Musik tanpa batas</p>
        </div>

        <div className="bg-[#12001f]/80 backdrop-blur-xl border border-purple-500/20 rounded-2xl p-8 shadow-[0_0_60px_rgba(147,51,234,0.15)]">
          {/* Tab */}
          <div className="flex mb-6 bg-[#1a0030] rounded-xl p-1">
            {(['login', 'signup'] as const).map(m => (
              <button key={m} onClick={() => { setMode(m); setError(''); setSuccess(''); }}
                className={`flex-1 py-2 rounded-lg text-sm font-semibold transition-all ${
                  mode === m
                    ? 'bg-gradient-to-r from-purple-600 to-pink-600 text-white shadow-[0_0_15px_rgba(147,51,234,0.4)]'
                    : 'text-purple-300/60 hover:text-purple-300'
                }`}>
                {m === 'login' ? 'Masuk' : 'Daftar'}
              </button>
            ))}
          </div>

          {error && <div className="mb-4 p-3 bg-red-500/10 border border-red-500/30 rounded-lg text-red-400 text-sm">{error}</div>}
          {success && <div className="mb-4 p-3 bg-green-500/10 border border-green-500/30 rounded-lg text-green-400 text-sm">{success}</div>}

          {/* ── FORM MASUK ── */}
          {mode === 'login' && (
            <form onSubmit={handleLogin} className="space-y-4">
              {/* Username */}
              <div className="relative">
                <User size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-purple-400" />
                <input
                  type="text"
                  placeholder="Username"
                  value={loginUsername}
                  onChange={e => setLoginUsername(e.target.value)}
                  autoComplete="username"
                  className="w-full bg-[#1a0030] border border-purple-500/30 rounded-xl pl-10 pr-4 py-3 text-white placeholder-purple-300/40 focus:outline-none focus:border-purple-400 transition-all"
                />
              </div>
              {/* Password */}
              <div className="relative">
                <Lock size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-purple-400" />
                <input
                  type={showPw ? 'text' : 'password'}
                  placeholder="Password"
                  value={loginPassword}
                  onChange={e => setLoginPassword(e.target.value)}
                  autoComplete="current-password"
                  className="w-full bg-[#1a0030] border border-purple-500/30 rounded-xl pl-10 pr-10 py-3 text-white placeholder-purple-300/40 focus:outline-none focus:border-purple-400 transition-all"
                />
                <button type="button" onClick={() => setShowPw(!showPw)} className="absolute right-3 top-1/2 -translate-y-1/2 text-purple-400">
                  {showPw ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
              <motion.button type="submit" disabled={loading}
                whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}
                className="w-full py-3 bg-gradient-to-r from-purple-600 to-pink-600 rounded-xl text-white font-bold shadow-[0_0_20px_rgba(147,51,234,0.4)] hover:shadow-[0_0_30px_rgba(147,51,234,0.6)] transition-all disabled:opacity-50">
                {loading ? 'Memproses...' : 'Masuk'}
              </motion.button>
            </form>
          )}

          {/* ── FORM DAFTAR ── */}
          {mode === 'signup' && (
            <form onSubmit={handleSignup} className="space-y-4">
              {/* Username */}
              <div>
                <div className="relative">
                  <User size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-purple-400" />
                  <input
                    type="text"
                    placeholder="Username"
                    value={regUsername}
                    onChange={e => setRegUsername(e.target.value)}
                    className="w-full bg-[#1a0030] border border-purple-500/30 rounded-xl pl-10 pr-10 py-3 text-white placeholder-purple-300/40 focus:outline-none focus:border-purple-400 transition-all"
                  />
                  <div className="absolute right-3 top-1/2 -translate-y-1/2">
                    {regUsernameStatus === 'checking' && <div className="w-4 h-4 border-2 border-purple-400 border-t-transparent rounded-full animate-spin" />}
                    {regUsernameStatus === 'available' && <Check size={16} className="text-green-400" />}
                    {(regUsernameStatus === 'taken' || regUsernameStatus === 'short') && <X size={16} className="text-red-400" />}
                  </div>
                </div>
                {regUsername.length > 0 && (
                  <div className="mt-1.5 px-1 space-y-0.5">
                    {regUsernameStatus === 'short' && <p className="text-red-400 text-xs">Minimal 3 karakter</p>}
                    {regUsernameStatus === 'taken' && <p className="text-red-400 text-xs">Username sudah dipakai orang lain</p>}
                    {regUsernameStatus === 'available' && <p className="text-green-400 text-xs">✓ Username tersedia</p>}
                    {regUsernameClean && regUsernameClean !== regUsername && (
                      <p className="text-purple-300/50 text-xs">Disimpan sebagai: <span className="text-purple-300 font-medium">@{regUsernameClean}</span></p>
                    )}
                    <p className="text-purple-300/30 text-xs">Huruf kecil, angka, dan underscore saja</p>
                  </div>
                )}
              </div>
              {/* Email */}
              <div className="relative">
                <Mail size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-purple-400" />
                <input
                  type="email"
                  placeholder="Email"
                  value={regEmail}
                  onChange={e => setRegEmail(e.target.value)}
                  className="w-full bg-[#1a0030] border border-purple-500/30 rounded-xl pl-10 pr-4 py-3 text-white placeholder-purple-300/40 focus:outline-none focus:border-purple-400 transition-all"
                />
              </div>
              {/* Password */}
              <div className="relative">
                <Lock size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-purple-400" />
                <input
                  type={showPw ? 'text' : 'password'}
                  placeholder="Password (min. 6 karakter)"
                  value={regPassword}
                  onChange={e => setRegPassword(e.target.value)}
                  className="w-full bg-[#1a0030] border border-purple-500/30 rounded-xl pl-10 pr-10 py-3 text-white placeholder-purple-300/40 focus:outline-none focus:border-purple-400 transition-all"
                />
                <button type="button" onClick={() => setShowPw(!showPw)} className="absolute right-3 top-1/2 -translate-y-1/2 text-purple-400">
                  {showPw ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
              <motion.button type="submit"
                disabled={loading || regUsernameStatus === 'taken' || regUsernameStatus === 'short' || regUsernameStatus === 'checking'}
                whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}
                className="w-full py-3 bg-gradient-to-r from-purple-600 to-pink-600 rounded-xl text-white font-bold shadow-[0_0_20px_rgba(147,51,234,0.4)] hover:shadow-[0_0_30px_rgba(147,51,234,0.6)] transition-all disabled:opacity-50">
                {loading ? 'Memproses...' : 'Daftar'}
              </motion.button>
            </form>
          )}

          <div className="my-4 flex items-center gap-3">
            <div className="flex-1 h-px bg-purple-500/20" />
            <span className="text-purple-300/40 text-xs">atau</span>
            <div className="flex-1 h-px bg-purple-500/20" />
          </div>

          <div className="space-y-3">
            <motion.button whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}
              onClick={() => signInWithGoogle('NeonBeat')}
              className="w-full py-3 bg-[#1a0030] border border-purple-500/30 rounded-xl text-white font-semibold flex items-center justify-center gap-3 hover:border-purple-400 hover:shadow-[0_0_15px_rgba(147,51,234,0.2)] transition-all">
              <Chrome size={18} className="text-purple-400" />
              Masuk dengan Google
            </motion.button>
            <motion.button whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}
              onClick={() => signInWithGoogle('NeonBeat')}
              className="w-full py-3 bg-[#1a0030] border border-blue-500/30 rounded-xl text-white font-semibold flex items-center justify-center gap-3 hover:border-blue-400 hover:shadow-[0_0_15px_rgba(59,130,246,0.2)] transition-all">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="#4267B2"><path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"/></svg>
              Masuk dengan Facebook
            </motion.button>
          </div>

          <div className="mt-4 text-center">
            <button onClick={continueAsGuest} className="text-purple-300/50 text-sm hover:text-purple-300 transition-colors underline">
              Lanjut sebagai Tamu
            </button>
          </div>
        </div>
      </motion.div>
    </div>
  );
}
