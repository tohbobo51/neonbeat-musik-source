import { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Music, Plus, Edit2, Trash2, X, Check, Upload, Image, Loader, Disc3, AlertTriangle } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import ImageCropper from '../components/ImageCropper';
import { useNavigate } from 'react-router-dom';
import supabase from '../lib/supabase';

export default function MyMusicPage() {
  const { user, profile, isArtist } = useAuth();
  const navigate = useNavigate();
  const [songs, setSongs] = useState<any[]>([]);
  const [genres, setGenres] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  // Edit modal state
  const [editModal, setEditModal] = useState(false);
  const [editSong, setEditSong] = useState<any>(null);
  const [editTitle, setEditTitle] = useState('');
  const [editArtist, setEditArtist] = useState('');
  const [editGenreId, setEditGenreId] = useState('');
  const [editCoverBlob, setEditCoverBlob] = useState<Blob | null>(null);
  const [editCoverPreview, setEditCoverPreview] = useState<string | null>(null);
  const [cropSrc, setCropSrc] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  // Delete confirm
  const [deleteId, setDeleteId] = useState<string | null>(null);

  const coverRef = useRef<HTMLInputElement>(null);

  const fetchMySongs = async () => {
    if (!user) return;
    setLoading(true);
    const res = await fetch(`/api/songs?artist_id=${user.id}`);
    const data = await res.json();
    setSongs(Array.isArray(data) ? data : []);
    setLoading(false);
  };

  useEffect(() => {
    fetchMySongs();
    fetch('/api/genres').then(r => r.json()).then(d => { if (Array.isArray(d)) setGenres(d); });
  }, [user]);

  if (!isArtist) {
    return (
      <div className="min-h-screen bg-[#0a0010] pt-20 flex items-center justify-center">
        <div className="text-center px-4">
          <Music size={64} className="text-purple-500/30 mx-auto mb-4" />
          <h2 className="text-2xl font-bold text-white mb-2">Hanya untuk Artis</h2>
          <p className="text-purple-300/50 mb-6">Jadilah artis di halaman profil untuk mengelola musik</p>
          <button onClick={() => navigate('/profile')}
            className="px-6 py-3 bg-gradient-to-r from-purple-600 to-pink-600 rounded-xl text-white font-semibold">
            Ke Profil
          </button>
        </div>
      </div>
    );
  }

  const openEdit = (song: any) => {
    setEditSong(song);
    setEditTitle(song.title);
    setEditArtist(song.artist_name);
    setEditGenreId(song.genre_id || '');
    setEditCoverPreview(song.cover_url || null);
    setEditCoverBlob(null);
    setEditModal(true);
  };

  const handleCoverSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => setCropSrc(reader.result as string);
    reader.readAsDataURL(file);
    e.target.value = '';
  };

  const handleCrop = (blob: Blob) => {
    setEditCoverBlob(blob);
    setEditCoverPreview(URL.createObjectURL(blob));
    setCropSrc(null);
  };

  const uploadFile = async (blob: Blob, filename: string, bucket: string, contentType: string) => {
    const res = await fetch('/api/upload', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ filename, contentType, bucket }),
    });
    const { signedUrl, path } = await res.json();
    await fetch(signedUrl, { method: 'PUT', body: blob, headers: { 'Content-Type': contentType } });
    const { data: { publicUrl } } = supabase.storage.from(bucket).getPublicUrl(path);
    return publicUrl;
  };

  const handleSave = async () => {
    if (!editSong || !editTitle.trim()) return;
    setSaving(true);
    try {
      let coverUrl = editSong.cover_url;
      if (editCoverBlob) {
        coverUrl = await uploadFile(editCoverBlob, 'cover.jpg', 'covers', 'image/jpeg');
      }
      await fetch('/api/songs', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: editSong.id,
          title: editTitle,
          artist_name: editArtist,
          genre_id: editGenreId || null,
          cover_url: coverUrl,
        }),
      });
      setEditModal(false);
      fetchMySongs();
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: string) => {
    await fetch('/api/songs', {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id }),
    });
    setDeleteId(null);
    fetchMySongs();
  };

  return (
    <div className="min-h-screen bg-[#0a0010] pt-20 pb-32">
      <div className="max-w-4xl mx-auto px-4 py-8">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-3xl font-black text-white">Musik Saya</h1>
            <p className="text-purple-300/50 text-sm mt-1">{songs.length} lagu diunggah</p>
          </div>
          <motion.button
            whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}
            onClick={() => navigate('/upload')}
            className="flex items-center gap-2 px-4 py-2.5 bg-gradient-to-r from-purple-600 to-pink-600 rounded-xl text-white font-semibold shadow-[0_0_15px_rgba(147,51,234,0.4)]"
          >
            <Plus size={18} /> Upload Lagu
          </motion.button>
        </div>

        {loading ? (
          <div className="space-y-3">
            {[...Array(5)].map((_, i) => (
              <div key={i} className="h-20 bg-[#12001f]/60 rounded-xl animate-pulse" />
            ))}
          </div>
        ) : songs.length === 0 ? (
          <div className="text-center py-20">
            <Disc3 size={64} className="text-purple-500/20 mx-auto mb-4" />
            <p className="text-purple-300/40 text-lg mb-2">Belum ada lagu</p>
            <p className="text-purple-300/30 text-sm mb-6">Upload musik pertamamu!</p>
            <button onClick={() => navigate('/upload')}
              className="px-6 py-3 bg-gradient-to-r from-purple-600 to-pink-600 rounded-xl text-white font-semibold">
              Upload Sekarang
            </button>
          </div>
        ) : (
          <div className="space-y-3">
            {songs.map((song, i) => (
              <motion.div
                key={song.id}
                initial={{ opacity: 0, y: 16 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.04 }}
                className="flex items-center gap-4 p-4 bg-[#12001f]/70 border border-purple-500/10 rounded-xl hover:border-purple-500/30 transition-all group"
              >
                {/* Cover */}
                <div className="w-14 h-14 rounded-lg overflow-hidden flex-shrink-0 border border-purple-500/20">
                  {song.cover_url ? (
                    <img src={song.cover_url} alt="" className="w-full h-full object-cover" />
                  ) : (
                    <div className="w-full h-full bg-gradient-to-br from-purple-900 to-pink-900 flex items-center justify-center">
                      <Disc3 size={20} className="text-purple-400" />
                    </div>
                  )}
                </div>

                {/* Info */}
                <div className="flex-1 min-w-0">
                  <p className="text-white font-semibold truncate">{song.title}</p>
                  <p className="text-purple-300/50 text-sm truncate">{song.artist_name}</p>
                  <div className="flex items-center gap-2 mt-1">
                    {song.genres && (
                      <span className="text-xs px-2 py-0.5 rounded-full"
                        style={{ background: `${song.genres.color}20`, color: song.genres.color }}>
                        {song.genres.name}
                      </span>
                    )}
                    <span className="text-purple-300/30 text-xs">{song.play_count || 0} plays</span>
                  </div>
                </div>

                {/* Actions */}
                <div className="flex items-center gap-2 opacity-60 group-hover:opacity-100 transition-opacity">
                  <motion.button
                    whileHover={{ scale: 1.1 }} whileTap={{ scale: 0.9 }}
                    onClick={() => openEdit(song)}
                    className="p-2 rounded-lg bg-purple-500/10 text-purple-400 hover:bg-purple-500/20 transition-all"
                    title="Edit lagu"
                  >
                    <Edit2 size={16} />
                  </motion.button>
                  <motion.button
                    whileHover={{ scale: 1.1 }} whileTap={{ scale: 0.9 }}
                    onClick={() => setDeleteId(song.id)}
                    className="p-2 rounded-lg bg-red-500/10 text-red-400 hover:bg-red-500/20 transition-all"
                    title="Hapus lagu"
                  >
                    <Trash2 size={16} />
                  </motion.button>
                </div>
              </motion.div>
            ))}
          </div>
        )}
      </div>

      {/* Edit Modal */}
      <AnimatePresence>
        {editModal && editSong && (
          <div className="fixed inset-0 z-[80] bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0, scale: 0.9, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: 20 }}
              className="w-full max-w-md bg-[#12001f] border border-purple-500/30 rounded-2xl overflow-hidden shadow-[0_0_60px_rgba(147,51,234,0.3)]"
            >
              <div className="p-4 border-b border-purple-500/20 flex items-center justify-between">
                <h3 className="text-white font-bold flex items-center gap-2">
                  <Edit2 size={16} className="text-purple-400" /> Edit Lagu
                </h3>
                <button onClick={() => setEditModal(false)} className="text-purple-300/60 hover:text-purple-300 transition-colors">
                  <X size={20} />
                </button>
              </div>

              <div className="p-6 space-y-4">
                {/* Cover */}
                <div>
                  <label className="text-purple-300/70 text-sm mb-2 block">Cover Art</label>
                  <div className="flex items-center gap-4">
                    <div
                      className="w-20 h-20 rounded-xl overflow-hidden border-2 border-dashed border-purple-500/30 cursor-pointer hover:border-purple-400 transition-colors bg-[#1a0030] flex items-center justify-center flex-shrink-0"
                      onClick={() => coverRef.current?.click()}
                    >
                      {editCoverPreview ? (
                        <img src={editCoverPreview} alt="" className="w-full h-full object-cover" />
                      ) : (
                        <Image size={24} className="text-purple-400/40" />
                      )}
                    </div>
                    <div>
                      <button
                        type="button"
                        onClick={() => coverRef.current?.click()}
                        className="px-3 py-2 border border-purple-500/30 text-purple-300 rounded-xl text-sm hover:bg-purple-500/10 transition-colors block mb-1"
                      >
                        Ganti Gambar
                      </button>
                      <p className="text-purple-300/30 text-xs">Akan muncul pilihan crop</p>
                    </div>
                  </div>
                  <input ref={coverRef} type="file" accept="image/*" onChange={handleCoverSelect} className="hidden" />
                </div>

                {/* Title */}
                <div>
                  <label className="text-purple-300/70 text-sm mb-1 block">Judul Lagu</label>
                  <input
                    value={editTitle}
                    onChange={e => setEditTitle(e.target.value)}
                    className="w-full bg-[#1a0030] border border-purple-500/30 rounded-xl px-4 py-2.5 text-white placeholder-purple-300/40 focus:outline-none focus:border-purple-400 transition-all"
                    placeholder="Judul lagu"
                  />
                </div>

                {/* Artist */}
                <div>
                  <label className="text-purple-300/70 text-sm mb-1 block">Nama Artis</label>
                  <input
                    value={editArtist}
                    onChange={e => setEditArtist(e.target.value)}
                    className="w-full bg-[#1a0030] border border-purple-500/30 rounded-xl px-4 py-2.5 text-white placeholder-purple-300/40 focus:outline-none focus:border-purple-400 transition-all"
                    placeholder="Nama artis"
                  />
                </div>

                {/* Genre */}
                <div>
                  <label className="text-purple-300/70 text-sm mb-1 block">Genre</label>
                  <select
                    value={editGenreId}
                    onChange={e => setEditGenreId(e.target.value)}
                    className="w-full bg-[#1a0030] border border-purple-500/30 rounded-xl px-4 py-2.5 text-white focus:outline-none focus:border-purple-400 transition-all"
                  >
                    <option value="">Pilih Genre</option>
                    {genres.map(g => <option key={g.id} value={g.id}>{g.name}</option>)}
                  </select>
                </div>

                {/* Buttons */}
                <div className="flex gap-3 pt-2">
                  <motion.button
                    whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}
                    onClick={handleSave}
                    disabled={saving || !editTitle.trim()}
                    className="flex-1 py-2.5 bg-gradient-to-r from-purple-600 to-pink-600 rounded-xl text-white font-semibold flex items-center justify-center gap-2 shadow-[0_0_15px_rgba(147,51,234,0.4)] disabled:opacity-50"
                  >
                    {saving ? <><Loader size={16} className="animate-spin" /> Menyimpan...</> : <><Check size={16} /> Simpan</>}
                  </motion.button>
                  <button
                    onClick={() => setEditModal(false)}
                    className="px-4 py-2.5 border border-purple-500/30 text-purple-300 rounded-xl hover:bg-purple-500/10 transition-colors"
                  >
                    Batal
                  </button>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Delete Confirm Modal */}
      <AnimatePresence>
        {deleteId && (
          <div className="fixed inset-0 z-[90] bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.9 }}
              className="w-full max-w-sm bg-[#12001f] border border-red-500/30 rounded-2xl p-6 shadow-[0_0_40px_rgba(239,68,68,0.2)]"
            >
              <div className="flex items-center gap-3 mb-4">
                <div className="w-10 h-10 rounded-full bg-red-500/20 flex items-center justify-center">
                  <AlertTriangle size={20} className="text-red-400" />
                </div>
                <h3 className="text-white font-bold">Hapus Lagu?</h3>
              </div>
              <p className="text-purple-300/60 text-sm mb-6">
                Tindakan ini tidak dapat dibatalkan. Lagu akan dihapus permanen dari NeonBeat.
              </p>
              <div className="flex gap-3">
                <button
                  onClick={() => handleDelete(deleteId)}
                  className="flex-1 py-2.5 bg-red-600 text-white rounded-xl font-semibold hover:bg-red-500 transition-colors"
                >
                  Ya, Hapus
                </button>
                <button
                  onClick={() => setDeleteId(null)}
                  className="flex-1 py-2.5 border border-purple-500/30 text-purple-300 rounded-xl hover:bg-purple-500/10 transition-colors"
                >
                  Batal
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Image Cropper */}
      {cropSrc && (
        <ImageCropper
          imageSrc={cropSrc}
          onCrop={handleCrop}
          onCancel={() => setCropSrc(null)}
        />
      )}
    </div>
  );
}
