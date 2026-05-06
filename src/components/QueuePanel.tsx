import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ListMusic, X, Trash2, Disc3, GripVertical } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { usePlayer } from '../context/PlayerContext';

export default function QueuePanel({ open, onClose }: { open: boolean; onClose: () => void }) {
  const { user } = useAuth();
  const { playSong, queue, currentSong } = usePlayer();
  const [dbQueue, setDbQueue] = useState<any[]>([]);

  const fetchQueue = async () => {
    if (!user) return;
    const res = await fetch(`/api/extras?route=queue&user_id=${user.id}`);
    const data = await res.json();
    setDbQueue(Array.isArray(data) ? data : []);
  };

  useEffect(() => { if (open) fetchQueue(); }, [open, user]);

  const removeFromQueue = async (id: string) => {
    await fetch('/api/extras?route=queue', { method: 'DELETE', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ id }) });
    fetchQueue();
  };

  const clearQueue = async () => {
    if (!user) return;
    await fetch('/api/extras?route=queue', { method: 'DELETE', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ user_id: user.id }) });
    setDbQueue([]);
  };

  // Gabungkan queue player + db queue
  const displayQueue = queue.length > 0 ? queue : dbQueue.map(q => q.song).filter(Boolean);

  return (
    <AnimatePresence>
      {open && (
        <>
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 z-[60] bg-black/50" onClick={onClose} />
          <motion.div initial={{ x: '100%' }} animate={{ x: 0 }} exit={{ x: '100%' }} transition={{ type: 'spring', damping: 25, stiffness: 200 }}
            className="fixed right-0 top-0 bottom-0 z-[61] w-80 bg-[#0d0018] border-l border-purple-500/20 flex flex-col">
            <div className="p-4 border-b border-purple-500/20 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <ListMusic size={18} className="text-purple-400" />
                <h3 className="text-white font-bold">Antrian</h3>
                <span className="text-purple-300/40 text-sm">({displayQueue.length})</span>
              </div>
              <div className="flex gap-2">
                {dbQueue.length > 0 && (
                  <button onClick={clearQueue} className="text-red-400/50 hover:text-red-400 p-1"><Trash2 size={16} /></button>
                )}
                <button onClick={onClose} className="text-purple-300/50 hover:text-purple-300 p-1"><X size={18} /></button>
              </div>
            </div>
            <div className="flex-1 overflow-y-auto p-2">
              {displayQueue.length === 0 ? (
                <div className="text-center py-16">
                  <ListMusic size={40} className="text-purple-500/20 mx-auto mb-3" />
                  <p className="text-purple-300/30 text-sm">Antrian kosong</p>
                </div>
              ) : displayQueue.map((song: any, i: number) => (
                <div key={song.id + i}
                  className={`flex items-center gap-3 p-2.5 rounded-xl mb-1 cursor-pointer transition-all group ${
                    currentSong?.id === song.id ? 'bg-purple-500/20 border border-purple-500/30' : 'hover:bg-purple-500/10'
                  }`}
                  onClick={() => playSong(song, displayQueue)}>
                  <span className="text-purple-300/30 text-xs w-4 text-center flex-shrink-0">{i + 1}</span>
                  <div className="w-9 h-9 rounded-lg overflow-hidden flex-shrink-0">
                    {song.cover_url ? <img src={song.cover_url} alt="" className="w-full h-full object-cover" /> : <div className="w-full h-full bg-gradient-to-br from-purple-900 to-pink-900 flex items-center justify-center"><Disc3 size={14} className="text-purple-400" /></div>}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className={`text-sm font-medium truncate ${currentSong?.id === song.id ? 'text-purple-300' : 'text-white'}`}>{song.title}</p>
                    <p className="text-purple-300/40 text-xs truncate">{song.artist_name}</p>
                  </div>
                  {dbQueue.length > 0 && (
                    <button onClick={e => { e.stopPropagation(); const q = dbQueue.find(q => q.song_id === song.id); if (q) removeFromQueue(q.id); }}
                      className="opacity-0 group-hover:opacity-100 text-red-400/60 hover:text-red-400 p-1 transition-all">
                      <X size={14} />
                    </button>
                  )}
                </div>
              ))}
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
