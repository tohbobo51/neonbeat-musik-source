import { useState, useRef, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Upload, Music, Image, X, Check, Loader } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import ImageCropper from '../components/ImageCropper';
import { useNavigate } from 'react-router-dom';
import supabase from '../lib/supabase';

export default function UploadPage() {
  const { user, profile, isArtist } = useAuth();
  const navigate = useNavigate();
  const [title, setTitle] = useState('');
  const [authorName, setAuthorName] = useState(profile?.username || '');
  const [genreId, setGenreId] = useState('');
  const [genres, setGenres] = useState<any[]>([]);
  const [audioFile, setAudioFile] = useState<File | null>(null);
  const [coverBlob, setCoverBlob] = useState<Blob | null>(null);
  const [coverPreview, setCoverPreview] = useState<string | null>(null);
  const [cropSrc, setCropSrc] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [done, setDone] = useState(false);
  const [error, setError] = useState('');
  const audioRef = useRef<HTMLInputElement>(null);
  const coverRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    fetch('/api/genres').then(r => r.json()).then(data => {
      if (Array.isArray(data)) setGenres(data);
    });
    if (profile?.username) setAuthorName(profile.username);
  }, [profile]);

  if (!isArtist) {
    return (
      <div className="min-h-screen bg-[#0a0010] pt-20 flex items-center justify-center">
        <div className="text-center">
          <Music size={64} className="text-purple-500/30 mx-auto mb-4" />
          <h2 className="text-2xl font-bold text-white mb-2">Hanya untuk Artis</h2>
          <p className="text-purple-300/50 mb-6">Jadilah artis di halaman profil untuk upload musik</p>
          <button onClick={() => navigate('/profile')} className="px-6 py-3 bg-gradient-to-r from-purple-600 to-pink-600 rounded-xl text-white font-semibold">Ke Profil</button>
        </div>
      </div>
    );
  }

  const handleCoverSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => setCropSrc(reader.result as string);
    reader.readAsDataURL(file);
    e.target.value = '';
  };

  const handleCrop = (blob: Blob) => {
    setCoverBlob(blob);
    setCoverPreview(URL.createObjectURL(blob));
    setCropSrc(null);
  };

  const uploadFile = async (blob: Blob | File, filename: string, bucket: string, contentType: string) => {
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

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!audioFile || !title.trim() || !user) return;
    
    // Check if user has verified email
    if (!user.email_confirmed_at) {
      setError('Anda harus memverifikasi alamat email Anda sebelum dapat mengunggah lagu. Silakan periksa kotak masuk email Anda.');
      return;
    }
    
    setUploading(true);
    setError('');
    try {
      setProgress(20);
      let coverUrl = '';
      if (coverBlob) {
        coverUrl = await uploadFile(coverBlob, 'cover.jpg', 'covers', 'image/jpeg');
      }
      setProgress(60);
      const audioUrl = await uploadFile(audioFile, audioFile.name, 'music', audioFile.type || 'audio/mpeg');
      setProgress(90);
      await fetch('/api/songs', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title, artist_name: authorName || profile?.username,
          audio_url: audioUrl, cover_url: coverUrl,
          genre_id: genreId || null, artist_id: user.id,
        }),
      });
      setProgress(100);
      setDone(true);
      setTimeout(() => navigate('/'), 2000);
    } catch (err: any) {
      setError(err.message || 'Upload gagal');
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#0a0010] pt-20 pb-32">
      <div className="max-w-2xl mx-auto px-4 py-8">
        <h1 className="text-3xl font-black text-white mb-8">Upload Musik</h1>

        {done ? (
          <motion.div initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }}
            className="text-center py-20">
            <div className="w-20 h-20 rounded-full bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center mx-auto mb-4 shadow-[0_0_30px_rgba(147,51,234,0.6)]">
              <Check size={36} className="text-white" />
            </div>
            <h2 className="text-2xl font-bold text-white mb-2">Upload Berhasil!</h2>
            <p className="text-purple-300/60">Lagu kamu sudah tersedia di NeonBeat</p>
          </motion.div>
        ) : (
          <>
            {user && !user.email_confirmed_at && (
              <div className="bg-red-500/10 border border-red-500/30 rounded-xl p-4 mb-6 flex items-start gap-3">
                <div className="mt-0.5 text-red-400">
                  <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m21.73 18-8-14a2 2 0 0 0-3.48 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3Z"/><path d="M12 9v4"/><path d="M12 17h.01"/></svg>
                </div>
                <div>
                  <h4 className="text-red-400 font-bold mb-1">Email Belum Diverifikasi</h4>
                  <p className="text-red-300/80 text-sm">Anda harus memverifikasi alamat email Anda sebelum dapat mengunggah lagu. Silakan periksa kotak masuk email Anda.</p>
                </div>
              </div>
            )}
            
            {progress > 0 && progress < 100 && (
              <div className="w-full bg-[#12001f] rounded-full h-2 mb-6 overflow-hidden">
                <div className="bg-gradient-to-r from-purple-500 to-pink-500 h-2 rounded-full transition-all duration-300" style={{ width: `${progress}%` }} />
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-6">
            {/* Cover Art */}
            <div className="bg-[#12001f]/80 border border-purple-500/20 rounded-2xl p-6">
              <h2 className="text-white font-bold mb-4 flex items-center gap-2"><Image size={18} className="text-purple-400" /> Cover Art</h2>
              <div className="flex items-center gap-4">
                <div
                  className="w-32 h-32 rounded-xl overflow-hidden border-2 border-dashed border-purple-500/30 flex items-center justify-center cursor-pointer hover:border-purple-400 transition-colors bg-[#1a0030]"
                  onClick={() => coverRef.current?.click()}>
                  {coverPreview ? (
                    <img src={coverPreview} alt="" className="w-full h-full object-cover" />
                  ) : (
                    <div className="text-center">
                      <Image size={24} className="text-purple-400/50 mx-auto mb-1" />
                      <p className="text-purple-300/40 text-xs">Pilih Gambar</p>
                    </div>
                  )}
                </div>
                <div className="flex-1">
                  <p className="text-purple-300/70 text-sm mb-2">Klik untuk memilih gambar cover</p>
                  <p className="text-purple-300/40 text-xs">Akan ada pilihan crop manual (persegi) atau auto-fit</p>
                  {coverPreview && (
                    <button type="button" onClick={() => { setCoverPreview(null); setCoverBlob(null); }}
                      className="mt-2 text-red-400/70 text-xs hover:text-red-400 flex items-center gap-1">
                      <X size={12} /> Hapus gambar
                    </button>
                  )}
                </div>
              </div>
              <input ref={coverRef} type="file" accept="image/*" onChange={handleCoverSelect} className="hidden" />
            </div>

            {/* Song Info */}
            <div className="bg-[#12001f]/80 border border-purple-500/20 rounded-2xl p-6 space-y-4">
              <h2 className="text-white font-bold flex items-center gap-2"><Music size={18} className="text-purple-400" /> Informasi Lagu</h2>
              <div>
                <label className="text-purple-300/70 text-sm mb-1 block">Judul Lagu *</label>
                <input value={title} onChange={e => setTitle(e.target.value)} required
                  className="w-full bg-[#1a0030] border border-purple-500/30 rounded-xl px-4 py-3 text-white placeholder-purple-300/40 focus:outline-none focus:border-purple-400 transition-all"
                  placeholder="Masukkan judul lagu"
                />
              </div>
              <div>
                <label className="text-purple-300/70 text-sm mb-1 block">Nama Artis/Pembuat</label>
                <input value={authorName} onChange={e => setAuthorName(e.target.value)}
                  className="w-full bg-[#1a0030] border border-purple-500/30 rounded-xl px-4 py-3 text-white placeholder-purple-300/40 focus:outline-none focus:border-purple-400 transition-all"
                  placeholder="Nama artis"
                />
              </div>
              <div>
                <label className="text-purple-300/70 text-sm mb-1 block">Genre</label>
                <select value={genreId} onChange={e => setGenreId(e.target.value)}
                  className="w-full bg-[#1a0030] border border-purple-500/30 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-purple-400 transition-all">
                  <option value="">Pilih Genre</option>
                  {genres.map(g => <option key={g.id} value={g.id}>{g.name}</option>)}
                </select>
              </div>
            </div>

            {/* Audio File */}
            <div className="bg-[#12001f]/80 border border-purple-500/20 rounded-2xl p-6">
              <h2 className="text-white font-bold mb-4 flex items-center gap-2"><Upload size={18} className="text-purple-400" /> File Audio</h2>
              <div
                className={`border-2 border-dashed rounded-xl p-8 text-center cursor-pointer transition-all ${
                  audioFile ? 'border-purple-500/60 bg-purple-500/10' : 'border-purple-500/30 hover:border-purple-400 bg-[#1a0030]'
                }`}
                onClick={() => audioRef.current?.click()}>
                {audioFile ? (
                  <div>
                    <Music size={32} className="text-purple-400 mx-auto mb-2" />
                    <p className="text-white font-semibold">{audioFile.name}</p>
                    <p className="text-purple-300/50 text-sm">{(audioFile.size / 1024 / 1024).toFixed(2)} MB</p>
                    <button type="button" onClick={e => { e.stopPropagation(); setAudioFile(null); }}
                      className="mt-2 text-red-400/70 text-xs hover:text-red-400 flex items-center gap-1 mx-auto">
                      <X size={12} /> Hapus file
                    </button>
                  </div>
                ) : (
                  <div>
                    <Upload size={32} className="text-purple-400/50 mx-auto mb-2" />
                    <p className="text-purple-300/70">Klik untuk memilih file audio</p>
                    <p className="text-purple-300/40 text-sm">MP3, WAV, FLAC, AAC, OGG</p>
                  </div>
                )}
              </div>
              <input ref={audioRef} type="file" accept="audio/*" onChange={e => setAudioFile(e.target.files?.[0] || null)} className="hidden" />
            </div>

            {error && <div className="p-3 bg-red-500/10 border border-red-500/30 rounded-xl text-red-400 text-sm">{error}</div>}

            {uploading && (
              <div className="bg-[#12001f]/80 border border-purple-500/20 rounded-2xl p-4">
                <div className="flex items-center gap-3 mb-2">
                  <Loader size={16} className="text-purple-400 animate-spin" />
                  <span className="text-purple-300 text-sm">Mengupload... {progress}%</span>
                </div>
                <div className="h-2 bg-purple-900/40 rounded-full">
                  <motion.div className="h-full bg-gradient-to-r from-purple-500 to-pink-500 rounded-full" style={{ width: `${progress}%` }} />
                </div>
              </div>
            )}

            <button
              type="submit"
              disabled={uploading || (!user?.email_confirmed_at)}
              className="w-full py-4 rounded-xl font-bold text-white bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-500 hover:to-pink-500 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 transition-all shadow-[0_0_20px_rgba(147,51,234,0.3)] hover:shadow-[0_0_30px_rgba(147,51,234,0.5)]"
            >
              {uploading ? (
                <><Loader className="animate-spin" size={20} /> Mengunggah... {progress}%</>
              ) : (
                <><Upload size={20} /> Upload Lagu</>
              )}
            </button>
          </form>
          </>
        )}
      </div>
      {cropSrc && <ImageCropper imageSrc={cropSrc} onCrop={handleCrop} onCancel={() => setCropSrc(null)} />}
    </div>
  );
}
