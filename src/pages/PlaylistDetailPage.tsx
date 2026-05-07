import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { ListMusic, Play, Disc3, ArrowLeft, Trash2 } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { usePlayer } from '../context/PlayerContext';
import { useNavigate, useParams } from 'react-router-dom';

export default function PlaylistDetailPage() {
  const { id } = useParams<{ id: string }>();
  const { user } = useAuth();
  const { playSong } = usePlayer();
  const navigate = useNavigate();

  const [playlist, setPlaylist] = useState<any | null>(null);
  const [loading, setLoading] = useState(true);
  const [removing, setRemoving] = useState<string | null>(null);
  const [deletingPlaylist, setDeletingPlaylist] = useState(false);

  const fetchDetail = async () => {
    if (!id) return;
    setLoading(true);
    try {
      const res = await fetch(`/api/playlists?id=${id}`);
      const data = await res.json();
      setPlaylist(data);
    } catch {}
    setLoading(false);
  };

  useEffect(() => { fetchDetail(); }, [id]);

  const removeSong = async (songId: string) => {
    if (!id) return;
    setRemoving(songId);
    try {
      await fetch('/api/playlists', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ playlist_id: id, song_id: songId }),
      });
      fetchDetail();
    } catch {}
    setRemoving(null);
  };

  const handleDeletePlaylist = async () => {
    if (!id) return;
    setDeletingPlaylist(true);
    try {
      await fetch('/api/playlists', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id }),
      });
      navigate('/playlists');
    } catch {}
    setDeletingPlaylist(false);
  };

  const songs = playlist?.playlist_songs?.map((ps: any) => ps.songs).filter(Boolean) || [];

  return (
    <div className="min-h-screen bg-[#0a0010] pt-20 pb-32">
      <div className="max-w-3xl mx-auto px-4 py-8">

        {/* Back */}
        <button
          onClick={() => navigate('/playlists')}
          className="flex items-center gap-2 text-purple-300/60 hover:text-purple-300 transition-colors mb-6 group"
        >
          <ArrowLeft size={18} className="group-hover:-translate-x-1 transition-transform" />
          <span className="text-sm">Kembali ke Playlist</span>
        </button>

        {loading ? (
          <div className="space-y-4">
            <div className="h-28 bg-[#12001f]/60 rounded-2xl animate-pulse" />
            {[...Array(5)].map((_, i) => (
              <div key={i} className="h-16 bg-[#12001f]/60 rounded-xl animate-pulse" />
            ))}
          </div>
        ) : !playlist ? (
          <div className="text-center py-20">
            <ListMusic size={64} className="text-purple-500/30 mx-auto mb-4" />
            <p className="text-purple-300/50">Playlist tidak ditemukan</p>
          </div>
        ) : (
          <>
            {/* Header card */}
            <div className="bg-[#12001f]/60 border border-purple-500/20 rounded-2xl p-4 sm:p-6 mb-6">
              <div className="flex items-center gap-4">
                {/* Cover */}
                <div className="w-16 h-16 sm:w-20 sm:h-20 rounded-xl overflow-hidden bg-gradient-to-br from-purple-900 to-pink-900 flex items-center justify-center border border-purple-500/30 flex-shrink-0">
                  {playlist.cover_url
                    ? <img src={playlist.cover_url} alt="" className="w-full h-full object-cover" />
                    : <ListMusic size={28} className="text-purple-400" />}
                </div>

                {/* Name + count */}
                <div className="flex-1 min-w-0">
                  <h1 className="text-xl sm:text-2xl font-black text-white truncate">{playlist.name}</h1>
                  <p className="text-purple-300/50 text-sm mt-1">{songs.length} lagu</p>
                </div>
              </div>

              {/* Action buttons inside the card */}
              <div className="flex items-center gap-2 mt-4 pt-4 border-t border-purple-500/10">
                {songs.length > 0 && (
                  <motion.button
                    whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.97 }}
                    onClick={() => playSong(songs[0], songs)}
                    className="flex-1 flex items-center justify-center gap-2 py-2.5 bg-gradient-to-r from-purple-600 to-pink-600 rounded-xl text-white font-semibold shadow-[0_0_15px_rgba(147,51,234,0.4)] hover:shadow-[0_0_25px_rgba(147,51,234,0.6)] transition-all text-sm"
                  >
                    <Play size={16} /> Putar Semua
                  </motion.button>
                )}
                <motion.button
                  whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.97 }}
                  onClick={handleDeletePlaylist}
                  disabled={deletingPlaylist}
                  className="flex items-center justify-center gap-2 px-4 py-2.5 bg-red-500/10 border border-red-500/30 hover:bg-red-500/20 hover:border-red-500/60 rounded-xl text-red-400 font-semibold transition-all text-sm disabled:opacity-50"
                >
                  {deletingPlaylist
                    ? <div className="w-4 h-4 border-2 border-red-400 border-t-transparent rounded-full animate-spin" />
                    : <Trash2 size={15} />}
                  Hapus Playlist
                </motion.button>
              </div>
            </div>

            {/* Songs */}
            {songs.length === 0 ? (
              <div className="text-center py-16">
                <Disc3 size={56} className="text-purple-500/20 mx-auto mb-4" />
                <p className="text-purple-300/40 text-lg font-semibold">Playlist masih kosong</p>
                <p className="text-purple-300/30 text-sm mt-1">Tambahkan lagu lewat tombol playlist saat memutar musik</p>
              </div>
            ) : (
              <div className="space-y-2">
                {songs.map((song: any, i: number) => (
                  <motion.div
                    key={song.id}
                    initial={{ opacity: 0, y: 12 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: i * 0.04 }}
                    className="flex items-center gap-3 p-3 bg-[#12001f]/60 border border-purple-500/10 rounded-xl hover:border-purple-500/30 hover:bg-[#12001f]/80 transition-all cursor-pointer"
                    onClick={() => playSong(song, songs)}
                  >
                    {/* Number */}
                    <span className="text-purple-300/30 text-sm w-5 text-right flex-shrink-0">{i + 1}</span>

                    {/* Cover */}
                    <div className="w-11 h-11 rounded-lg overflow-hidden flex-shrink-0">
                      {song.cover_url
                        ? <img src={song.cover_url} alt="" className="w-full h-full object-cover" />
                        : <div className="w-full h-full bg-gradient-to-br from-purple-900 to-pink-900 flex items-center justify-center">
                            <Disc3 size={18} className="text-purple-400" />
                          </div>}
                    </div>

                    {/* Title + artist */}
                    <div className="flex-1 min-w-0">
                      <p className="text-white font-semibold truncate text-sm">{song.title}</p>
                      <p className="text-purple-300/50 text-xs truncate">{song.artist_name}</p>
                    </div>

                    {/* Genre badge — hidden on very small screens */}
                    {song.genres && (
                      <span className="hidden sm:inline-block px-2 py-0.5 rounded-full text-xs font-semibold flex-shrink-0"
                        style={{ background: `${song.genres.color}25`, color: song.genres.color, border: `1px solid ${song.genres.color}40` }}>
                        {song.genres.name}
                      </span>
                    )}

                    {/* Remove from playlist — always visible */}
                    <motion.button
                      whileHover={{ scale: 1.1 }} whileTap={{ scale: 0.9 }}
                      onClick={e => { e.stopPropagation(); removeSong(song.id); }}
                      disabled={removing === song.id}
                      className="p-2 rounded-lg text-red-400/50 hover:text-red-400 hover:bg-red-500/10 transition-all disabled:opacity-40 flex-shrink-0"
                      title="Hapus dari playlist"
                    >
                      {removing === song.id
                        ? <div className="w-4 h-4 border-2 border-red-400 border-t-transparent rounded-full animate-spin" />
                        : <Trash2 size={15} />}
                    </motion.button>
                  </motion.div>
                ))}
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
