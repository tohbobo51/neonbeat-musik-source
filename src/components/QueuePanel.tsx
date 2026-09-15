import { motion, AnimatePresence, Reorder, useDragControls } from 'framer-motion';
import { ListMusic, X, Trash2, Disc3, GripVertical, Music2 } from 'lucide-react';
import { usePlayer, Song } from '../context/PlayerContext';

function QueueItem({ song, index, isCurrent, isPast, onPlay, onRemove }: { song: Song; index: number; isCurrent: boolean; isPast: boolean; onPlay: () => void; onRemove: () => void; }) {
  const controls = useDragControls();
  return (
    <Reorder.Item value={song} dragListener={false} dragControls={controls} layout
      className={'flex items-center gap-2.5 p-3 rounded-xl mb-1.5 cursor-pointer group transition-all select-none ' + (isCurrent ? 'bg-purple-500/25 border border-purple-500/50 shadow-[0_0_14px_rgba(147,51,234,0.16)]' : isPast ? 'opacity-45 hover:opacity-80 hover:bg-white/5' : 'hover:bg-purple-500/10')} onClick={onPlay}>
      <button type="button" aria-label={'Geser ' + song.title} className="touch-none cursor-grab active:cursor-grabbing p-2 -ml-1 rounded-lg text-purple-300/45 hover:text-purple-200 hover:bg-purple-500/15 transition-colors flex-shrink-0" onPointerDown={e => { e.stopPropagation(); controls.start(e); }} onClick={e => e.stopPropagation()}>
        <GripVertical size={18} />
      </button>
      <div className="w-10 h-10 rounded-lg overflow-hidden flex-shrink-0 relative">
        {song.cover_url ? <img src={song.cover_url} alt="" className="w-full h-full object-cover" /> : <div className="w-full h-full bg-gradient-to-br from-purple-900 to-pink-900 flex items-center justify-center"><Disc3 size={15} className="text-purple-400" /></div>}
        {isCurrent && <div className="absolute inset-0 bg-purple-900/60 flex items-center justify-center"><Music2 size={13} className="text-purple-300 animate-pulse" /></div>}
      </div>
      <div className="flex-1 min-w-0"><p className={'text-sm font-semibold truncate ' + (isCurrent ? 'text-purple-200' : 'text-white')}>{song.title}</p><p className="text-purple-300/45 text-xs truncate">{song.artist_name}</p></div>
      <span className="text-purple-300/20 text-[10px] flex-shrink-0">{index + 1}</span>
      <button type="button" onClick={e => { e.stopPropagation(); onRemove(); }} aria-label="Hapus dari antrean" className="opacity-0 group-hover:opacity-100 flex-shrink-0 w-7 h-7 flex items-center justify-center rounded-full text-red-400/60 hover:text-red-400 hover:bg-red-500/10 transition-all"><X size={13} /></button>
    </Reorder.Item>
  );
}

export default function QueuePanel({ open, onClose }: { open: boolean; onClose: () => void }) {
  const { queue, queueIndex, currentSong, playSong, removeFromQueue, reorderQueue } = usePlayer();
  const activeSong = queue[queueIndex] ?? currentSong;
  return (
    <AnimatePresence>
      {open && <>
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 z-[60] bg-black/50 backdrop-blur-[2px]" onClick={onClose} />
        <motion.div initial={{ x: '100%' }} animate={{ x: 0 }} exit={{ x: '100%' }} transition={{ type: 'spring', damping: 28, stiffness: 220 }} className="fixed right-0 top-0 bottom-0 z-[61] w-80 sm:w-96 bg-[#0d0018]/95 backdrop-blur-xl border-l border-purple-500/20 flex flex-col">
          <div className="p-4 border-b border-purple-500/20 flex items-center justify-between flex-shrink-0"><div className="flex items-center gap-2"><ListMusic size={18} className="text-purple-400" /><h3 className="text-white font-bold">Antrian</h3><span className="px-1.5 py-0.5 bg-purple-500/20 rounded-full text-purple-300/60 text-xs font-medium">{queue.length}</span></div><div className="flex gap-1">{queue.length > 0 && <button onClick={() => reorderQueue([])} title="Hapus semua" className="p-1.5 text-red-400/40 hover:text-red-400 hover:bg-red-500/10 rounded-lg transition-all"><Trash2 size={15} /></button>}<button onClick={onClose} className="p-1.5 text-purple-300/40 hover:text-purple-300 hover:bg-purple-500/10 rounded-lg transition-all"><X size={17} /></button></div></div>
          <div className="flex-1 overflow-y-auto px-2 py-3">
            {queue.length === 0 ? <div className="text-center py-20"><ListMusic size={44} className="text-purple-500/15 mx-auto mb-3" /><p className="text-purple-300/25 text-sm">Antrian kosong</p><p className="text-purple-300/15 text-xs mt-1">Tambah lagu untuk mulai</p></div> : <>
              <p className="px-2 pb-2 text-purple-400/50 text-xs font-semibold uppercase tracking-widest">Seret lagu ke posisi yang kamu mau</p>
              <Reorder.Group axis="y" values={queue} onReorder={reorderQueue} layoutScroll className="space-y-0.5">
                {queue.map((song, index) => <QueueItem key={song.id + '-' + index} song={song} index={index} isCurrent={song.id === activeSong?.id && index === queueIndex} isPast={index < queueIndex} onPlay={() => playSong(song, queue)} onRemove={() => removeFromQueue(index)} />)}
              </Reorder.Group>
            </>}
          </div>
          {queue.length > 1 && <div className="px-4 py-2.5 border-t border-purple-500/10 flex-shrink-0"><p className="text-purple-400/30 text-xs text-center">Pegang ikon ⋮⋮ lalu seret — tidak perlu tekan naik/turun</p></div>}
        </motion.div>
      </>}
    </AnimatePresence>
  );
}
