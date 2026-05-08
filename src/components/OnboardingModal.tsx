import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Music, Check, ArrowRight, Sparkles, AtSign, Loader, AlertCircle } from 'lucide-react';

interface Props {
  onDone: () => void;
  userId?: string;
  initialUsername?: string;
}

export default function OnboardingModal({ onDone, userId, initialUsername }: Props) {
  const [genres, setGenres] = useState<any[]>([]);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [step, setStep] = useState<'username' | 'welcome' | 'genres' | 'done'>('username');

  // Username step state
  const [username, setUsername] = useState(initialUsername || '');
  const [usernameError, setUsernameError] = useState('');
  const [usernameOk, setUsernameOk] = useState(false);
  const [checkingUsername, setCheckingUsername] = useState(false);
  const [savingUsername, setSavingUsername] = useState(false);

  useEffect(() => {
    fetch('/api/genres').then(r => r.json()).then(d => { if (Array.isArray(d)) setGenres(d); });
  }, []);

  // If no userId, skip username step
  useEffect(() => {
    if (!userId) setStep('welcome');
  }, [userId]);

  const validateUsername = (val: string) => {
    if (val.length < 3) return 'Minimal 3 karakter';
    if (val.length > 30) return 'Maksimal 30 karakter';
    if (!/^[a-z0-9_]+$/.test(val)) return 'Hanya huruf kecil, angka, dan underscore';
    return '';
  };

  useEffect(() => {
    const trimmed = username.trim().toLowerCase().replace(/\s+/g, '_').replace(/[^a-z0-9_]/g, '');
    const err = validateUsername(trimmed);
    if (err) { setUsernameError(err); setUsernameOk(false); return; }
    setUsernameError('');

    // Debounce availability check
    const t = setTimeout(async () => {
      if (!trimmed || trimmed === initialUsername) { setUsernameOk(true); return; }
      setCheckingUsername(true);
      try {
        const userIdParam = userId ? `&user_id=${userId}` : '';
        const res = await fetch(`/api/profiles?check_username=${trimmed}${userIdParam}`);
        const data = await res.json();
        if (!data.available) {
          setUsernameError('Username sudah dipakai');
          setUsernameOk(false);
        } else {
          setUsernameOk(true);
          setUsernameError('');
        }
      } catch {
        setUsernameOk(true);
      }
      setCheckingUsername(false);
    }, 600);
    return () => clearTimeout(t);
  }, [username, initialUsername]);

  const handleUsernameChange = (val: string) => {
    const clean = val.toLowerCase().replace(/\s+/g, '_').replace(/[^a-z0-9_]/g, '');
    setUsername(clean);
  };

  const saveUsername = async () => {
    if (!userId || !usernameOk) return;
    const trimmed = username.trim();
    if (!trimmed || trimmed === initialUsername) { setStep('welcome'); return; }
    setSavingUsername(true);
    try {
      await fetch('/api/profiles', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ user_id: userId, username: trimmed }),
      });
    } catch {}
    setSavingUsername(false);
    setStep('welcome');
  };

  const toggleGenre = (id: string) => {
    setSelected(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const handleFinish = () => {
    localStorage.setItem('neonbeat_onboarded', 'true');
    localStorage.setItem('neonbeat_fav_genres', JSON.stringify([...selected]));
    localStorage.removeItem('neonbeat_is_new_user');
    setStep('done');
    setTimeout(onDone, 1200);
  };

  return (
    <div className="fixed inset-0 z-[100] bg-[#0a0010]/95 backdrop-blur-xl flex items-center justify-center p-4">
      <AnimatePresence mode="wait">

        {/* Username step */}
        {step === 'username' && (
          <motion.div key="username"
            initial={{ opacity: 0, scale: 0.9, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.9, y: -20 }}
            className="w-full max-w-md bg-[#12001f] border border-purple-500/30 rounded-3xl p-8 text-center"
          >
            <div className="w-16 h-16 rounded-full bg-gradient-to-br from-purple-600 to-pink-600 flex items-center justify-center mx-auto mb-6 shadow-[0_0_30px_rgba(147,51,234,0.5)]">
              <AtSign size={28} className="text-white" />
            </div>
            <h2 className="text-2xl font-black text-white mb-2">Pilih Username</h2>
            <p className="text-purple-300/60 text-sm mb-6">
              Username bersifat permanen dan tidak bisa diubah setelah ini. Pilih dengan bijak!
            </p>

            <div className="relative mb-2">
              <div className="absolute left-4 top-1/2 -translate-y-1/2 text-purple-400 font-bold">@</div>
              <input
                value={username}
                onChange={e => handleUsernameChange(e.target.value)}
                placeholder="username_kamu"
                maxLength={30}
                className="w-full bg-[#0a0010] border border-purple-500/30 rounded-xl pl-9 pr-12 py-3 text-white placeholder-purple-300/30 focus:outline-none focus:border-purple-500 text-center font-mono"
              />
              <div className="absolute right-4 top-1/2 -translate-y-1/2">
                {checkingUsername && <Loader size={16} className="text-purple-400 animate-spin" />}
                {!checkingUsername && usernameOk && !usernameError && (
                  <Check size={16} className="text-green-400" />
                )}
                {!checkingUsername && usernameError && (
                  <AlertCircle size={16} className="text-red-400" />
                )}
              </div>
            </div>

            {usernameError && (
              <p className="text-red-400 text-xs mb-4 text-left">{usernameError}</p>
            )}
            {usernameOk && !usernameError && username && (
              <p className="text-green-400 text-xs mb-4 text-left">✓ Username tersedia</p>
            )}

            <p className="text-purple-300/40 text-xs mb-6">
              Hanya huruf kecil, angka, dan underscore ( _ )
            </p>

            <motion.button
              whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}
              onClick={saveUsername}
              disabled={!usernameOk || !!usernameError || savingUsername || !username}
              className="w-full py-3 bg-gradient-to-r from-purple-600 to-pink-600 rounded-xl text-white font-bold flex items-center justify-center gap-2 disabled:opacity-40 disabled:cursor-not-allowed shadow-[0_0_20px_rgba(147,51,234,0.4)]"
            >
              {savingUsername
                ? <><Loader size={18} className="animate-spin" /> Menyimpan...</>
                : <><span>Konfirmasi Username</span> <ArrowRight size={18} /></>
              }
            </motion.button>

            <button onClick={() => setStep('welcome')} className="mt-3 text-purple-300/40 text-xs hover:text-purple-300 transition-colors">
              Lewati, gunakan username otomatis
            </button>
          </motion.div>
        )}

        {/* Welcome step */}
        {step === 'welcome' && (
          <motion.div key="welcome"
            initial={{ opacity: 0, scale: 0.9, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.9, y: -20 }}
            className="w-full max-w-md bg-[#12001f] border border-purple-500/30 rounded-3xl p-8 text-center"
          >
            <motion.div
              animate={{ rotate: [0, -10, 10, -5, 5, 0] }}
              transition={{ delay: 0.3, duration: 0.8 }}
              className="w-20 h-20 rounded-full bg-gradient-to-br from-purple-600 to-pink-600 flex items-center justify-center mx-auto mb-6 shadow-[0_0_40px_rgba(147,51,234,0.6)]"
            >
              <Music size={36} className="text-white" />
            </motion.div>
            <h2 className="text-3xl font-black text-white mb-2">
              Selamat Datang di{' '}
              <span className="bg-gradient-to-r from-purple-400 to-pink-400 bg-clip-text text-transparent">NeonBeat</span>!
            </h2>
            <p className="text-purple-300/60 mb-8">Platform musik terbaik untuk karya Indonesia</p>
            <motion.button
              whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}
              onClick={() => setStep('genres')}
              className="w-full py-3 bg-gradient-to-r from-purple-600 to-pink-600 rounded-xl text-white font-bold flex items-center justify-center gap-2 shadow-[0_0_20px_rgba(147,51,234,0.4)]"
            >
              Mulai <ArrowRight size={18} />
            </motion.button>
          </motion.div>
        )}

        {/* Genres step */}
        {step === 'genres' && (
          <motion.div key="genres"
            initial={{ opacity: 0, scale: 0.9, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.9, y: -20 }}
            className="w-full max-w-md bg-[#12001f] border border-purple-500/30 rounded-3xl p-8"
          >
            <div className="flex items-center gap-2 mb-2">
              <Sparkles size={20} className="text-pink-400" />
              <h2 className="text-2xl font-black text-white">Genre Favoritmu</h2>
            </div>
            <p className="text-purple-300/60 text-sm mb-6">Pilih satu atau lebih untuk rekomendasi personal</p>
            <div className="grid grid-cols-2 gap-2 mb-6 max-h-64 overflow-y-auto">
              {genres.map(g => (
                <button key={g.id} onClick={() => toggleGenre(g.id)}
                  className={`p-3 rounded-xl text-sm font-semibold transition-all border ${
                    selected.has(g.id)
                      ? 'border-purple-500 text-white shadow-[0_0_12px_rgba(147,51,234,0.3)]'
                      : 'border-purple-500/20 text-purple-300/60 hover:border-purple-500/40'
                  }`}
                  style={selected.has(g.id) ? { background: `${g.color}22`, borderColor: g.color } : {}}
                >
                  {selected.has(g.id) && <Check size={12} className="inline mr-1" />}
                  {g.name}
                </button>
              ))}
            </div>
            <motion.button
              whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}
              onClick={handleFinish}
              className="w-full py-3 bg-gradient-to-r from-purple-600 to-pink-600 rounded-xl text-white font-bold flex items-center justify-center gap-2 shadow-[0_0_20px_rgba(147,51,234,0.4)]"
            >
              {selected.size > 0 ? `Lanjut dengan ${selected.size} genre` : 'Lewati'} <ArrowRight size={18} />
            </motion.button>
          </motion.div>
        )}

        {/* Done step */}
        {step === 'done' && (
          <motion.div key="done"
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            className="w-full max-w-md bg-[#12001f] border border-purple-500/30 rounded-3xl p-8 text-center"
          >
            <motion.div
              initial={{ scale: 0 }} animate={{ scale: 1 }}
              transition={{ type: 'spring', stiffness: 300 }}
              className="w-20 h-20 rounded-full bg-gradient-to-br from-green-500 to-emerald-600 flex items-center justify-center mx-auto mb-6 shadow-[0_0_30px_rgba(34,197,94,0.5)]"
            >
              <Check size={36} className="text-white" />
            </motion.div>
            <h2 className="text-2xl font-black text-white mb-2">Siap Beraksi!</h2>
            <p className="text-purple-300/60">Selamat menikmati musik di NeonBeat</p>
          </motion.div>
        )}

      </AnimatePresence>
    </div>
  );
}
