import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  ArrowLeft, User, Palette, ListMusic, Bell, Info, ChevronRight,
  AlertTriangle, Music, Globe, Lock, Users, Check, Trash2, LogOut, Shield
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useNavigate } from 'react-router-dom';
import ThemeSelector from '../components/ThemeSelector';

type Section = 'akun' | 'tema' | 'playlist' | 'notifikasi' | 'tentang' | null;

const VISIBILITY_OPTIONS = [
  { value: 'public', label: 'Publik', desc: 'Semua orang bisa melihat', icon: Globe },
  { value: 'private', label: 'Privat', desc: 'Hanya kamu yang bisa lihat', icon: Lock },
  { value: 'friends', label: 'Teman', desc: 'Hanya orang yang kamu setujui', icon: Users },
];

export default function SettingsPage() {
  const { user, profile, isArtist, signOut, refreshProfile } = useAuth();
  const navigate = useNavigate();
  const [activeSection, setActiveSection] = useState<Section>(null);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [becomingArtist, setBecomingArtist] = useState(false);
  const [defaultPlaylistVisibility, setDefaultPlaylistVisibility] = useState<string>(() =>
    localStorage.getItem('defaultPlaylistVisibility') || 'public'
  );
  const [notifEnabled, setNotifEnabled] = useState<boolean>(() =>
    localStorage.getItem('notifEnabled') !== 'false'
  );

  const handleBecomeArtist = async () => {
    if (!user) return;
    setBecomingArtist(true);
    await fetch('/api/profiles', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ user_id: user.id, is_artist: true, role: 'artist' }),
    });
    await refreshProfile();
    setBecomingArtist(false);
  };

  const handleDeleteAccount = async () => {
    if (!user) return;
    setDeleting(true);
    await fetch('/api/profiles', {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ user_id: user.id }),
    });
    await signOut();
    navigate('/');
  };

  const setVisibility = (v: string) => {
    setDefaultPlaylistVisibility(v);
    localStorage.setItem('defaultPlaylistVisibility', v);
  };

  const toggleNotif = () => {
    const next = !notifEnabled;
    setNotifEnabled(next);
    localStorage.setItem('notifEnabled', String(next));
  };

  if (!user || !profile) return null;

  const sections = [
    { key: 'akun', label: 'Akun', icon: User, desc: 'Kelola akun dan keamanan' },
    { key: 'tema', label: 'Tema', icon: Palette, desc: 'Sesuaikan tampilan aplikasi' },
    { key: 'playlist', label: 'Privasi Playlist', icon: ListMusic, desc: 'Atur visibilitas playlist' },
    { key: 'notifikasi', label: 'Notifikasi', icon: Bell, desc: 'Atur notifikasi aplikasi' },
    { key: 'tentang', label: 'Tentang', icon: Info, desc: 'Informasi aplikasi' },
  ] as const;

  return (
    <div className="min-h-screen bg-[#0a0010] pt-20 pb-32">
      <div className="max-w-lg mx-auto px-4 py-6">

        {/* Header */}
        <div className="flex items-center gap-4 mb-8">
          {activeSection ? (
            <button onClick={() => setActiveSection(null)} className="p-2 rounded-xl text-purple-300/60 hover:text-purple-300 hover:bg-purple-500/10 transition-all">
              <ArrowLeft size={22} />
            </button>
          ) : (
            <button onClick={() => navigate(-1)} className="p-2 rounded-xl text-purple-300/60 hover:text-purple-300 hover:bg-purple-500/10 transition-all">
              <ArrowLeft size={22} />
            </button>
          )}
          <h1 className="text-2xl font-black text-white">
            {activeSection ? sections.find(s => s.key === activeSection)?.label : 'Pengaturan'}
          </h1>
        </div>

        <AnimatePresence mode="wait">

          {/* Main menu */}
          {!activeSection && (
            <motion.div key="main" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} className="space-y-2">
              {sections.map(({ key, label, icon: Icon, desc }) => (
                <motion.button key={key} whileHover={{ x: 4 }} whileTap={{ scale: 0.98 }}
                  onClick={() => setActiveSection(key as Section)}
                  className="w-full flex items-center gap-4 p-4 bg-[#12001f]/60 border border-purple-500/10 rounded-2xl hover:border-purple-500/30 hover:bg-[#12001f]/90 transition-all text-left">
                  <div className="w-11 h-11 rounded-xl bg-purple-500/10 border border-purple-500/20 flex items-center justify-center flex-shrink-0">
                    <Icon size={20} className="text-purple-400" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-white font-semibold">{label}</p>
                    <p className="text-purple-300/40 text-sm">{desc}</p>
                  </div>
                  <ChevronRight size={18} className="text-purple-300/30" />
                </motion.button>
              ))}

              {/* Logout */}
              <motion.button whileHover={{ x: 4 }} whileTap={{ scale: 0.98 }}
                onClick={() => { signOut(); navigate('/'); }}
                className="w-full flex items-center gap-4 p-4 bg-[#12001f]/60 border border-purple-500/10 rounded-2xl hover:border-red-500/30 hover:bg-red-500/5 transition-all text-left mt-4">
                <div className="w-11 h-11 rounded-xl bg-red-500/10 border border-red-500/20 flex items-center justify-center flex-shrink-0">
                  <LogOut size={20} className="text-red-400" />
                </div>
                <div className="flex-1">
                  <p className="text-red-400 font-semibold">Keluar</p>
                  <p className="text-red-400/50 text-sm">Logout dari akun</p>
                </div>
              </motion.button>
            </motion.div>
          )}

          {/* Akun section */}
          {activeSection === 'akun' && (
            <motion.div key="akun" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} className="space-y-4">
              {/* Profile info */}
              <div className="bg-[#12001f]/60 border border-purple-500/10 rounded-2xl p-4 flex items-center gap-4">
                <div className="w-14 h-14 rounded-full overflow-hidden flex-shrink-0 border-2 border-purple-500/30">
                  {profile.avatar_url
                    ? <img src={profile.avatar_url} alt="" className="w-full h-full object-cover" />
                    : <div className="w-full h-full bg-gradient-to-br from-purple-700 to-pink-700 flex items-center justify-center">
                        <span className="text-xl font-black text-white">{(profile.full_name || profile.username).charAt(0).toUpperCase()}</span>
                      </div>}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-white font-bold truncate">{profile.full_name || profile.username}</p>
                  <p className="text-purple-300/50 text-sm">@{profile.username}</p>
                </div>
              </div>

              {/* Edit profile */}
              <button onClick={() => navigate('/profile/edit')}
                className="w-full flex items-center gap-4 p-4 bg-[#12001f]/60 border border-purple-500/10 rounded-2xl hover:border-purple-500/30 transition-all text-left">
                <User size={18} className="text-purple-400" />
                <span className="text-white font-medium flex-1">Edit Profil</span>
                <ChevronRight size={16} className="text-purple-300/30" />
              </button>

              {/* Become artist */}
              {!isArtist && (
                <div className="bg-[#12001f]/60 border border-purple-500/10 rounded-2xl p-4">
                  <div className="flex items-center gap-3 mb-3">
                    <Music size={18} className="text-purple-400" />
                    <div>
                      <p className="text-white font-semibold">Bergabung sebagai Artis</p>
                      <p className="text-purple-300/40 text-xs">Upload musikmu ke NeonBeat</p>
                    </div>
                  </div>
                  <motion.button whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}
                    onClick={handleBecomeArtist} disabled={becomingArtist}
                    className="px-5 py-2.5 bg-gradient-to-r from-purple-600 to-pink-600 rounded-xl text-white font-semibold text-sm disabled:opacity-50">
                    {becomingArtist ? 'Memproses...' : 'Jadilah Artis'}
                  </motion.button>
                </div>
              )}

              {isArtist && (
                <div className="bg-[#12001f]/60 border border-purple-500/20 rounded-2xl p-4 flex items-center gap-3">
                  <div className="w-9 h-9 rounded-xl bg-purple-500/20 flex items-center justify-center">
                    <Music size={16} className="text-purple-400" />
                  </div>
                  <div>
                    <p className="text-white font-semibold">Status Artis Aktif</p>
                    <p className="text-purple-300/40 text-xs">Kamu bisa upload musik</p>
                  </div>
                  <div className="ml-auto">
                    <span className="px-2 py-0.5 bg-purple-500/20 text-purple-300 rounded-full text-xs font-bold border border-purple-500/30">Artis</span>
                  </div>
                </div>
              )}

              {/* Delete account */}
              <div className="bg-[#12001f]/60 border border-red-500/20 rounded-2xl p-4">
                <div className="flex items-center gap-3 mb-3">
                  <AlertTriangle size={18} className="text-red-400" />
                  <div>
                    <p className="text-red-400 font-semibold">Hapus Akun</p>
                    <p className="text-red-400/50 text-xs">Tindakan ini tidak dapat dibatalkan</p>
                  </div>
                </div>
                {!showDeleteConfirm ? (
                  <button onClick={() => setShowDeleteConfirm(true)}
                    className="px-5 py-2.5 border border-red-500/30 text-red-400 rounded-xl hover:bg-red-500/10 transition-all text-sm font-semibold">
                    Hapus Akun
                  </button>
                ) : (
                  <div className="space-y-2">
                    <p className="text-red-400/70 text-sm">Yakin ingin menghapus akun? Semua data akan hilang permanen.</p>
                    <div className="flex gap-2">
                      <button onClick={handleDeleteAccount} disabled={deleting}
                        className="px-5 py-2.5 bg-red-600 text-white rounded-xl hover:bg-red-500 transition-all font-semibold text-sm disabled:opacity-50">
                        {deleting ? 'Menghapus...' : 'Ya, Hapus Akun'}
                      </button>
                      <button onClick={() => setShowDeleteConfirm(false)}
                        className="px-5 py-2.5 border border-purple-500/30 text-purple-300 rounded-xl hover:bg-purple-500/10 transition-all text-sm">
                        Batal
                      </button>
                    </div>
                  </div>
                )}
              </div>
            </motion.div>
          )}

          {/* Tema section */}
          {activeSection === 'tema' && (
            <motion.div key="tema" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }}>
              <ThemeSelector />
            </motion.div>
          )}

          {/* Playlist privacy section */}
          {activeSection === 'playlist' && (
            <motion.div key="playlist" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} className="space-y-4">
              <div className="bg-[#12001f]/60 border border-purple-500/10 rounded-2xl p-4">
                <p className="text-white font-semibold mb-1">Visibilitas Default Playlist</p>
                <p className="text-purple-300/40 text-sm mb-4">Pilih siapa yang bisa melihat playlist barumu</p>
                <div className="space-y-2">
                  {VISIBILITY_OPTIONS.map(({ value, label, desc, icon: Icon }) => (
                    <motion.button key={value} whileHover={{ x: 3 }} whileTap={{ scale: 0.98 }}
                      onClick={() => setVisibility(value)}
                      className={`w-full flex items-center gap-3 p-3 rounded-xl border transition-all text-left ${
                        defaultPlaylistVisibility === value
                          ? 'border-purple-500/50 bg-purple-500/10'
                          : 'border-purple-500/10 hover:border-purple-500/20 bg-[#1a0030]/40'
                      }`}>
                      <Icon size={18} className={defaultPlaylistVisibility === value ? 'text-purple-400' : 'text-purple-300/40'} />
                      <div className="flex-1">
                        <p className={`font-semibold text-sm ${defaultPlaylistVisibility === value ? 'text-white' : 'text-purple-300/70'}`}>{label}</p>
                        <p className="text-purple-300/40 text-xs">{desc}</p>
                      </div>
                      {defaultPlaylistVisibility === value && (
                        <div className="w-5 h-5 rounded-full bg-purple-500/30 flex items-center justify-center">
                          <Check size={12} className="text-purple-400" />
                        </div>
                      )}
                    </motion.button>
                  ))}
                </div>
              </div>

              <div className="bg-[#12001f]/60 border border-purple-500/10 rounded-2xl p-4">
                <p className="text-purple-300/40 text-sm">
                  Pengaturan ini berlaku untuk playlist yang kamu buat ke depannya. Playlist yang sudah ada bisa diubah satu per satu dari halaman playlist.
                </p>
              </div>
            </motion.div>
          )}

          {/* Notifikasi section */}
          {activeSection === 'notifikasi' && (
            <motion.div key="notifikasi" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} className="space-y-4">
              <div className="bg-[#12001f]/60 border border-purple-500/10 rounded-2xl p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-white font-semibold">Notifikasi Aplikasi</p>
                    <p className="text-purple-300/40 text-sm">Aktifkan/nonaktifkan notifikasi</p>
                  </div>
                  <motion.button whileTap={{ scale: 0.9 }} onClick={toggleNotif}
                    className={`w-12 h-6 rounded-full transition-all relative ${notifEnabled ? 'bg-purple-500' : 'bg-purple-900/60'}`}>
                    <motion.div animate={{ x: notifEnabled ? 24 : 2 }}
                      className="absolute top-1 w-4 h-4 rounded-full bg-white shadow-sm" />
                  </motion.button>
                </div>
              </div>
              <div className="bg-[#12001f]/60 border border-purple-500/10 rounded-2xl p-4 space-y-3">
                {[
                  { label: 'Pengikut baru', key: 'notif_follow' },
                  { label: 'Lagu baru dari artis yang diikuti', key: 'notif_new_song' },
                  { label: 'Like pada lagu kamu', key: 'notif_like' },
                ].map(({ label, key }) => {
                  const enabled = localStorage.getItem(key) !== 'false';
                  return (
                    <div key={key} className="flex items-center justify-between py-1">
                      <p className="text-purple-300/70 text-sm">{label}</p>
                      <motion.button whileTap={{ scale: 0.9 }}
                        onClick={() => {
                          localStorage.setItem(key, String(!enabled));
                          setNotifEnabled(v => !v === v ? v : v); // force re-render
                        }}
                        className={`w-10 h-5 rounded-full transition-all relative ${enabled && notifEnabled ? 'bg-purple-500' : 'bg-purple-900/60'}`}>
                        <motion.div animate={{ x: enabled && notifEnabled ? 20 : 2 }}
                          className="absolute top-0.5 w-4 h-4 rounded-full bg-white shadow-sm" />
                      </motion.button>
                    </div>
                  );
                })}
              </div>
            </motion.div>
          )}

          {/* Tentang section */}
          {activeSection === 'tentang' && (
            <motion.div key="tentang" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} className="space-y-4">
              <div className="bg-[#12001f]/60 border border-purple-500/10 rounded-2xl p-6 text-center">
                <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center mx-auto mb-4 shadow-[0_0_20px_rgba(147,51,234,0.5)]">
                  <Music size={28} className="text-white" />
                </div>
                <h2 className="text-white font-black text-xl mb-1" style={{ fontFamily: 'Orbitron, monospace' }}>NeonBeat</h2>
                <p className="text-purple-300/50 text-sm mb-4">Platform musik digital</p>
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between py-2 border-b border-purple-500/10">
                    <span className="text-purple-300/50">Versi</span>
                    <span className="text-white font-semibold">1.0.0</span>
                  </div>
                  <div className="flex justify-between py-2 border-b border-purple-500/10">
                    <span className="text-purple-300/50">Stack</span>
                    <span className="text-white font-semibold">React + Supabase</span>
                  </div>
                  <div className="flex justify-between py-2">
                    <span className="text-purple-300/50">Deploy</span>
                    <span className="text-white font-semibold">Vercel</span>
                  </div>
                </div>
              </div>
              <div className="bg-[#12001f]/60 border border-purple-500/10 rounded-2xl p-4 flex items-center gap-3">
                <Shield size={18} className="text-purple-400" />
                <div>
                  <p className="text-white font-semibold text-sm">Privasi & Keamanan</p>
                  <p className="text-purple-300/40 text-xs">Data kamu aman bersama kami</p>
                </div>
              </div>
            </motion.div>
          )}

        </AnimatePresence>
      </div>
    </div>
  );
}
