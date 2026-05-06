import { motion } from 'framer-motion';
import { Palette } from 'lucide-react';
import { useTheme } from '../context/ThemeContext';

export default function ThemeSelector() {
  const { theme, setTheme, allThemes } = useTheme();

  return (
    <div className="bg-[#12001f]/80 border border-purple-500/20 rounded-2xl p-5">
      <div className="flex items-center gap-2 mb-4">
        <Palette size={18} className="text-purple-400" />
        <h3 className="text-white font-bold">Tema Tampilan</h3>
      </div>
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
        {(Object.entries(allThemes) as any[]).map(([key, cfg]) => (
          <motion.button key={key} whileHover={{ scale: 1.03 }} whileTap={{ scale: 0.97 }}
            onClick={() => setTheme(key as any)}
            className={`relative p-3 rounded-xl border-2 transition-all text-left ${
              theme === key ? 'border-white/40 shadow-lg' : 'border-transparent hover:border-white/10'
            }`}
            style={{ background: cfg.surface, borderColor: theme === key ? cfg.accent : undefined, boxShadow: theme === key ? `0 0 16px ${cfg.accent}60` : undefined }}>
            <div className="flex items-center gap-2 mb-2">
              <div className="w-5 h-5 rounded-full" style={{ background: cfg.accent, boxShadow: `0 0 8px ${cfg.accent}` }} />
              <span className="text-white text-xs font-semibold">{cfg.label}</span>
            </div>
            <div className="flex gap-1">
              {[cfg.bg, cfg.surface, cfg.accent].map((c, i) => (
                <div key={i} className="flex-1 h-2 rounded-full" style={{ background: c }} />
              ))}
            </div>
            {theme === key && (
              <div className="absolute top-2 right-2 w-4 h-4 rounded-full bg-white/20 flex items-center justify-center">
                <div className="w-2 h-2 rounded-full" style={{ background: cfg.accent }} />
              </div>
            )}
          </motion.button>
        ))}
      </div>
    </div>
  );
}
