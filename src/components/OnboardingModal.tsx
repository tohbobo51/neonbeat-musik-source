import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Music, Check, ArrowRight, Sparkles } from 'lucide-react';

interface Props {
  onDone: () => void;
}

export default function OnboardingModal({ onDone }: Props) {
  const [genres, setGenres] = useState<any[]>([]);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [step, setStep] = useState<'welcome' | 'genres' | 'done'>('welcome');

  useEffect(() => {
    fetch('/api/genres').then(r => r.json()).then(d => { if (Array.isArray(d)) setGenres(d); });
  }, []);

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

        {/* Welcome step */}
        {step === 'welcome' && (
          <motion.div key="welcome"
            initial={{ opacity: 0, scale: 0.9, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.9, y: -20 }}
            className="text-center max-w-sm w-full">
            <div className="w-20 h-20 rounded-3xl bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center mx-auto mb-6 shadow-[0_0_40px_rgba(147,51,234,0.6)]">
              <Music size={36} className="text-white" />
            </div>
            <h1 className="text-3xl font-black text-white mb-2" style={{ fontFamily: 'Orbitron, monospace' }}>
              Selamat Datang!
            </h1>
            <p className="text-purple-300/60 mb-8 leading-relaxed">
              NeonBeat adalah platform musik digitalmu. Mari kita setup pengalaman musik yang personal untukmu.
            </p>
            <motion.button whileHover={{ scale: 1.04 }} whileTap={{ scale: 0.96 }}
              onClick={() => setStep('genres')}
              className="w-full py-4 bg-gradient-to-r from-purple-600 to-pink-600 rounded-2xl text-white font-bold text-lg flex items-center justify-center gap-2 shadow-[0_0_24px_rgba(147,51,234,0.5)]">
              Mulai <ArrowRight size={20} />
            </motion.button>
            <button onClick={handleFinish} className="mt-3 text-purple-300/30 text-sm hover:text-purple-300/60 transition-colors">
              Lewati
            </button>
          </motion.div>
        )}

        {/* Genre selection step */}
        {step === 'genres' && (
          <motion.div key="genres"
            initial={{ opacity: 0, x: 40 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -40 }}
            className="max-w-md w-full">
            <div className="text-center mb-6">
              <div className="w-12 h-12 rounded-2xl bg-purple-500/20 border border-purple-500/30 flex items-center justify-center mx-auto mb-4">
                <Sparkles size={22} className="text-purple-400" />
              </div>
              <h2 className="text-2xl font-black text-white mb-1">Pilih Genre Favoritmu</h2>
              <p className="text-purple-300/50 text-sm">Pilih minimal 1 untuk rekomendasi yang relevan</p>
            </div>

            {genres.length === 0 ? (
              <div className="grid grid-cols-2 gap-3 mb-6">
                {[...Array(6)].map((_, i) => <div key={i} className="h-16 bg-purple-900/20 rounded-xl animate-pulse" />)}
              </div>
            ) : (
              <div className="grid grid-cols-2 gap-3 mb-6">
                {genres.map(genre => {
                  const isOn = selected.has(genre.id);
                  return (
                    <motion.button key={genre.id} whileHover={{ scale: 1.03 }} whileTap={{ scale: 0.97 }}
                      onClick={() => toggleGenre(genre.id)}
                      className={`relative p-4 rounded-xl border-2 font-bold text-sm transition-all flex items-center justify-between ${
                        isOn ? 'border-current text-white' : 'border-purple-500/20 text-purple-300/60 bg-[#12001f]/60'
                      }`}
                      style={isOn ? { borderColor: genre.color, background: `${genre.color}20`, color: genre.color } : {}}>
                      <span>{genre.name}</span>
                      {isOn && (
                        <motion.div initial={{ scale: 0 }} animate={{ scale: 1 }}
                          className="w-5 h-5 rounded-full flex items-center justify-center"
                          style={{ background: genre.color }}>
                          <Check size={12} className="text-white" />
                        </motion.div>
                      )}
                    </motion.button>
                  );
                })}
              </div>
            )}

            <motion.button whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}
              onClick={handleFinish}
              className="w-full py-4 bg-gradient-to-r from-purple-600 to-pink-600 rounded-2xl text-white font-bold flex items-center justify-center gap-2 shadow-[0_0_20px_rgba(147,51,234,0.4)] disabled:opacity-40"
              disabled={selected.size === 0}>
              {selected.size === 0 ? 'Pilih minimal 1 genre' : `Lanjutkan (${selected.size} dipilih)`}
              <ArrowRight size={18} />
            </motion.button>
            <button onClick={handleFinish} className="w-full mt-2 text-purple-300/30 text-sm hover:text-purple-300/60 transition-colors py-2">
              Lewati
            </button>
          </motion.div>
        )}

        {/* Done step */}
        {step === 'done' && (
          <motion.div key="done"
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            className="text-center">
            <motion.div
              animate={{ rotate: [0, 10, -10, 0], scale: [1, 1.2, 1] }}
              transition={{ duration: 0.5 }}
              className="w-20 h-20 rounded-full bg-gradient-to-br from-green-500 to-emerald-500 flex items-center justify-center mx-auto mb-4 shadow-[0_0_30px_rgba(34,197,94,0.5)]">
              <Check size={36} className="text-white" />
            </motion.div>
            <p className="text-white font-bold text-xl">Siap Bermusik! 🎵</p>
          </motion.div>
        )}

      </AnimatePresence>
    </div>
  );
}
