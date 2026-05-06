import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { History, Trash2, Disc3 } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { usePlayer, Song } from '../context/PlayerContext';
import { Link } from 'react-router-dom';

export default function HistoryPage() {
  const { user, isGuest } = useAuth();
  const { playSong } = usePlayer();
  const [history, setHistory] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchHistory = async () => {
    if (!user) return;
    const res = await fetch(`/api/history?user_id=${user.id}`);
    const data = await res.json();
    setHistory(Array.isArray(data) ? data : []);
    setLoading(false);
  };

  useEffect(() => { fetchHistory(); }, [user]);

  const clearHistory = async () => {
    if (!user) return;
    await fetch('/api/history', { method: 'DELETE', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ user_id: user.id }) });
    setHistory([]);
  };

  if (isGuest || !user) {
    return (
      <div className="min-h-screen bg-[#0a0010] pt-20 flex items-center justify-center">
        <div className="text-center">
          <History size={64} className="text-purple-500/30 mx-auto mb-4" />
          <h2 className="text-2xl font-bold text-white mb-2">Riwayat Tidak Tersedia</h2>
          <p className="text-purple-300/50 mb-6">Masuk untuk melihat riwayat pemutaran kamu</p>
          <Link to="/auth" className="px-6 py-3 bg-gradient-to-r from-purple-600 to-pink-600 rounded-xl text-white font-semibold">Masuk Sekarang</Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#0a0010] pt-20 pb-32">
      <div className="max-w-4xl mx-auto px-4 py-8">
        <div className="flex items-center justify-between mb-8">
          <div className="flex items-center gap-3">
            <History size={28} className="text-purple-400" />
            <h1 className="text-3xl font-black text-white">Riwayat</h1>
          </div>
          {history.length > 0 && (
            <button onClick={clearHistory} className="flex items-center gap-2 px-4 py-2 border border-red-500/30 text-red-400 rounded-xl hover:bg-red-500/10 transition-all">
              <Trash2 size={16} /> Hapus Semua
            </button>
          )}
        </div>

        {loading ? (
          <div className="space-y-3">{[...Array(5)].map((_, i) => <div key={i} className="h-16 bg-[#12001f]/60 rounded-xl animate-pulse" />)}</div>
        ) : history.length === 0 ? (
          <div className="text-center py-20">
            <History size={48} className="text-purple-500/30 mx-auto mb-4" />
            <p className="text-purple-300/40">Belum ada riwayat pemutaran</p>
          </div>
        ) : (
          <div className="space-y-2">
            {history.map((item, i) => (
              <motion.div key={item.id} initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: i * 0.03 }}
                className="flex items-center gap-4 p-3 bg-[#12001f]/60 border border-purple-500/10 rounded-xl hover:border-purple-500/30 transition-all cursor-pointer"
                onClick={() => playSong(item.songs, [item.songs])}>
                <div className="w-12 h-12 rounded-lg overflow-hidden flex-shrink-0">
                  {item.songs?.cover_url ? <img src={item.songs.cover_url} alt="" className="w-full h-full object-cover" /> : <div className="w-full h-full bg-gradient-to-br from-purple-900 to-pink-900 flex items-center justify-center"><Disc3 size={20} className="text-purple-400" /></div>}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-white font-semibold truncate">{item.songs?.title}</p>
                  <p className="text-purple-300/50 text-sm truncate">{item.songs?.artist_name}</p>
                </div>
                <span className="text-purple-300/30 text-xs flex-shrink-0">{new Date(item.played_at).toLocaleDateString('id-ID')}</span>
              </motion.div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
