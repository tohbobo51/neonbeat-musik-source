import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { ListMusic, Play, Disc3, X, ArrowLeft, Trash2 } from 'lucide-react';
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
            <div className="h-10 w-48 bg-[#12001f]/60 rounded-xl animate-pulse" />
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
            {/* Header */}
            <div className="flex items-center justify-between mb-8">
              <div className="flex items-center gap-4">
                <div className="w-20 h-20 rounded-2xl overflow-hidden bg-gradient-to-br from-purple-900 to-pink-900 flex items-center justify-center border border-purple-500/30 flex-shrink-0">
                  {playlist.cover_url
                    ? <img src={playlist.cover_url} alt="" className="w-full h-full object-cover" />
                    : <ListMusic size={32} className="text-purple-400" />}
                </div>
                <div>
                  <h1 className="text-3xl font-black text-white">{playlist.name}</h1>
                  <p className="text-purple-300/50 text-sm mt-1">{songs.length} lagu</p>
                </div>
              </div>
              {songs.length > 0 && (
                <motion.button
                  whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}
                  onClick={() => playSong(songs[0], songs)}
                  className="flex items-center gap-2 px-5 py-2.5 bg-gradient-to-r from-purple-600 to-pink-600 rounded-xl text-white font-semibold shadow-[0_0_20px_rgba(147,51,234,0.4)] hover:shadow-[0_0_30px_rgba(147,51,234,0.6)] transition-all"
                >
                  <Play size={16} /> Putar Semua
                </motion.button>
              )}
            </div>

            {/* Songs */}
            {songs.length === 0 ? (
              <div className="text-center py-20">
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
                    className="flex items-center gap-4 p-3 bg-[#12001f]/60 border border-purple-500/10 rounded-xl hover:border-purple-500/30 hover:bg-[#12001f]/80 transition-all cursor-pointer group"
                    onClick={() => playSong(song, songs)}
                  >
                    <span className="text-purple-300/30 text-sm w-5 text-right flex-shrink-0">{i + 1}</span>
                    <div className="w-11 h-11 rounded-lg overflow-hidden flex-shrink-0">
                      {song.cover_url
                        ? <img src={song.cover_url} alt="" className="w-full h-full object-cover" />
                        : <div className="w-full h-full bg-gradient-to-br from-purple-900 to-pink-900 flex items-center justify-center"><Disc3 size={18} className="text-purple-400" /></div>}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-white font-semibold truncate">{song.title}</p>
                      <p className="text-purple-300/50 text-sm truncate">{song.artist_name}</p>
                    </div>
                    {song.genres && (
                      <span className="hidden sm:inline-block px-2 py-0.5 rounded-full text-xs font-semibold flex-shrink-0"
                        style={{ background: `${song.genres.color}25`, color: song.genres.color, border: `1px solid ${song.genres.color}40` }}>
                        {song.genres.name}
                      </span>
                    )}
                    <motion.button
                      whileHover={{ scale: 1.1 }} whileTap={{ scale: 0.9 }}
                      onClick={e => { e.stopPropagation(); removeSong(song.id); }}
                      disabled={removing === song.id}
                      className="opacity-0 group-hover:opacity-100 p-2 rounded-lg text-red-400/60 hover:text-red-400 hover:bg-red-500/10 transition-all disabled:opacity-40"
                    >
                      {removing === song.id
                        ? <div className="w-4 h-4 border-2 border-red-400 border-t-transparent rounded-full animate-spin" />
                        : <X size={16} />}
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
