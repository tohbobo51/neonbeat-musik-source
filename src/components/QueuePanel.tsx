import { useState } from 'react';
  import { motion, AnimatePresence, Reorder, useDragControls } from 'framer-motion';
  import { ListMusic, X, Trash2, Disc3, GripVertical, Music2, ChevronUp } from 'lucide-react';
  import { usePlayer, Song } from '../context/PlayerContext';

  function QueueItem({
    song,
    index,
    isCurrent,
    isPast,
    onPlay,
    onRemove,
  }: {
    song: Song;
    index: number;
    isCurrent: boolean;
    isPast: boolean;
    onPlay: () => void;
    onRemove: () => void;
  }) {
    const controls = useDragControls();

    return (
      <Reorder.Item
        value={song}
        dragListener={false}
        dragControls={controls}
        className={`flex items-center gap-2.5 p-2.5 rounded-xl mb-1 cursor-pointer group transition-all select-none ${
          isCurrent
            ? 'bg-purple-500/25 border border-purple-500/40'
            : isPast
            ? 'opacity-40 hover:opacity-70 hover:bg-white/5'
            : 'hover:bg-purple-500/10'
        }`}
        onClick={onPlay}
      >
        {/* Drag handle */}
        <div
          className="touch-none cursor-grab active:cursor-grabbing p-1 -ml-1 text-purple-400/30 hover:text-purple-400/70 transition-colors flex-shrink-0"
          onPointerDown={e => { e.stopPropagation(); controls.start(e); }}
          onClick={e => e.stopPropagation()}
        >
          <GripVertical size={14} />
        </div>

        {/* Cover */}
        <div className="w-9 h-9 rounded-lg overflow-hidden flex-shrink-0 relative">
          {song.cover_url
            ? <img src={song.cover_url} alt="" className="w-full h-full object-cover" />
            : <div className="w-full h-full bg-gradient-to-br from-purple-900 to-pink-900 flex items-center justify-center"><Disc3 size={14} className="text-purple-400" /></div>}
          {isCurrent && (
            <div className="absolute inset-0 bg-purple-900/60 flex items-center justify-center">
              <Music2 size={12} className="text-purple-300 animate-pulse" />
            </div>
          )}
        </div>

        {/* Info */}
        <div className="flex-1 min-w-0">
          <p className={`text-sm font-medium truncate ${isCurrent ? 'text-purple-200' : 'text-white'}`}>
            {song.title}
          </p>
          <p className="text-purple-300/40 text-xs truncate">{song.artist_name}</p>
        </div>

        {/* Remove button */}
        <button
          onClick={e => { e.stopPropagation(); onRemove(); }}
          className="opacity-0 group-hover:opacity-100 flex-shrink-0 w-6 h-6 flex items-center justify-center rounded-full text-red-400/60 hover:text-red-400 hover:bg-red-500/10 transition-all"
        >
          <X size={12} />
        </button>
      </Reorder.Item>
    );
  }

  export default function QueuePanel({ open, onClose }: { open: boolean; onClose: () => void }) {
    const { queue, queueIndex, currentSong, playSong, removeFromQueue, reorderQueue } = usePlayer();
    const [showPast, setShowPast] = useState(false);

    const pastSongs = queue.slice(0, queueIndex);
    const upcomingSongs = queue.slice(queueIndex + 1);
    const currentSongInQueue = queue[queueIndex] ?? currentSong;

    const handleReorder = (section: 'past' | 'upcoming', newOrder: Song[]) => {
      let newQueue: Song[];
      if (section === 'upcoming') {
        newQueue = [...queue.slice(0, queueIndex + 1), ...newOrder];
      } else {
        newQueue = [...newOrder, ...queue.slice(queueIndex)];
      }
      reorderQueue(newQueue);
    };

    const handleRemove = (absoluteIndex: number) => {
      removeFromQueue(absoluteIndex);
    };

    return (
      <AnimatePresence>
        {open && (
          <>
            {/* Backdrop */}
            <motion.div
              initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              className="fixed inset-0 z-[60] bg-black/50 backdrop-blur-[2px]"
              onClick={onClose}
            />

            {/* Panel */}
            <motion.div
              initial={{ x: '100%' }} animate={{ x: 0 }} exit={{ x: '100%' }}
              transition={{ type: 'spring', damping: 28, stiffness: 220 }}
              className="fixed right-0 top-0 bottom-0 z-[61] w-80 bg-[#0d0018]/95 backdrop-blur-xl border-l border-purple-500/20 flex flex-col"
            >
              {/* Header */}
              <div className="p-4 border-b border-purple-500/20 flex items-center justify-between flex-shrink-0">
                <div className="flex items-center gap-2">
                  <ListMusic size={18} className="text-purple-400" />
                  <h3 className="text-white font-bold">Antrian</h3>
                  <span className="px-1.5 py-0.5 bg-purple-500/20 rounded-full text-purple-300/60 text-xs font-medium">{queue.length}</span>
                </div>
                <div className="flex gap-1">
                  {queue.length > 0 && (
                    <button
                      onClick={() => reorderQueue([])}
                      title="Hapus semua"
                      className="p-1.5 text-red-400/40 hover:text-red-400 hover:bg-red-500/10 rounded-lg transition-all"
                    >
                      <Trash2 size={15} />
                    </button>
                  )}
                  <button onClick={onClose} className="p-1.5 text-purple-300/40 hover:text-purple-300 hover:bg-purple-500/10 rounded-lg transition-all">
                    <X size={17} />
                  </button>
                </div>
              </div>

              {/* Body */}
              <div className="flex-1 overflow-y-auto px-2 py-2 space-y-4">
                {queue.length === 0 ? (
                  <div className="text-center py-20">
                    <ListMusic size={44} className="text-purple-500/15 mx-auto mb-3" />
                    <p className="text-purple-300/25 text-sm">Antrian kosong</p>
                    <p className="text-purple-300/15 text-xs mt-1">Tambah lagu untuk mulai</p>
                  </div>
                ) : (
                  <>
                    {/* Past songs (collapsible) */}
                    {pastSongs.length > 0 && (
                      <div>
                        <button
                          onClick={() => setShowPast(v => !v)}
                          className="flex items-center gap-1.5 w-full px-2 py-1 text-purple-400/40 hover:text-purple-400/70 text-xs font-semibold uppercase tracking-widest transition-colors"
                        >
                          <ChevronUp size={13} className={`transition-transform ${showPast ? '' : 'rotate-180'}`} />
                          Sudah diputar ({pastSongs.length})
                        </button>
                        <AnimatePresence>
                          {showPast && (
                            <motion.div
                              initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }}
                              transition={{ duration: 0.2 }} className="overflow-hidden"
                            >
                              <Reorder.Group
                                axis="y"
                                values={pastSongs}
                                onReorder={order => handleReorder('past', order)}
                                className="mt-1"
                              >
                                {pastSongs.map((song, i) => (
                                  <QueueItem
                                    key={song.id + '-past-' + i}
                                    song={song}
                                    index={i}
                                    isCurrent={false}
                                    isPast={true}
                                    onPlay={() => playSong(song, queue)}
                                    onRemove={() => handleRemove(i)}
                                  />
                                ))}
                              </Reorder.Group>
                            </motion.div>
                          )}
                        </AnimatePresence>
                      </div>
                    )}

                    {/* Currently playing */}
                    {currentSongInQueue && (
                      <div>
                        <p className="px-2 text-xs font-semibold uppercase tracking-widest text-purple-400/50 mb-2">Sedang diputar</p>
                        <div className="flex items-center gap-2.5 p-2.5 rounded-xl bg-purple-500/25 border border-purple-500/40">
                          <div className="p-1 -ml-1 text-transparent flex-shrink-0"><GripVertical size={14} /></div>
                          <div className="w-9 h-9 rounded-lg overflow-hidden flex-shrink-0 relative">
                            {currentSongInQueue.cover_url
                              ? <img src={currentSongInQueue.cover_url} alt="" className="w-full h-full object-cover" />
                              : <div className="w-full h-full bg-gradient-to-br from-purple-900 to-pink-900 flex items-center justify-center"><Disc3 size={14} className="text-purple-400" /></div>}
                            <div className="absolute inset-0 bg-purple-900/60 flex items-center justify-center">
                              <Music2 size={12} className="text-purple-300 animate-pulse" />
                            </div>
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-bold truncate text-purple-200">{currentSongInQueue.title}</p>
                            <p className="text-purple-300/50 text-xs truncate">{currentSongInQueue.artist_name}</p>
                          </div>
                        </div>
                      </div>
                    )}

                    {/* Upcoming songs — draggable */}
                    {upcomingSongs.length > 0 && (
                      <div>
                        <p className="px-2 text-xs font-semibold uppercase tracking-widest text-purple-400/50 mb-2">
                          Selanjutnya ({upcomingSongs.length})
                        </p>
                        <Reorder.Group
                          axis="y"
                          values={upcomingSongs}
                          onReorder={order => handleReorder('upcoming', order)}
                        >
                          {upcomingSongs.map((song, i) => (
                            <QueueItem
                              key={song.id + '-up-' + i}
                              song={song}
                              index={i}
                              isCurrent={false}
                              isPast={false}
                              onPlay={() => playSong(song, queue)}
                              onRemove={() => handleRemove(queueIndex + 1 + i)}
                            />
                          ))}
                        </Reorder.Group>
                      </div>
                    )}
                  </>
                )}
              </div>

              {/* Footer hint */}
              {queue.length > 1 && (
                <div className="px-4 py-2.5 border-t border-purple-500/10 flex-shrink-0">
                  <p className="text-purple-400/25 text-xs text-center">Seret ≡ untuk ubah urutan</p>
                </div>
              )}
            </motion.div>
          </>
        )}
      </AnimatePresence>
    );
  }
  