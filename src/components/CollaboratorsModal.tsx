import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Users, Search, UserPlus, Trash2, Crown, Eye, Edit3, Check, Clock, XCircle } from 'lucide-react';
import { useAuth } from '../context/AuthContext';

interface Collaborator {
  id: string;
  user_id: string;
  role: 'editor' | 'viewer';
  status: 'pending' | 'accepted' | 'rejected';
  invited_by: string;
  profile: { username: string; avatar_url: string; full_name?: string } | null;
}

interface Props {
  playlistId: string;
  playlistName: string;
  ownerId: string;
  onClose: () => void;
}

export default function CollaboratorsModal({ playlistId, playlistName, ownerId, onClose }: Props) {
  const { user, profile } = useAuth();
  const isOwner = user?.id === ownerId;

  const [collaborators, setCollaborators] = useState<Collaborator[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<any[]>([]);
  const [searching, setSearching] = useState(false);
  const [inviting, setInviting] = useState<string | null>(null);
  const [removing, setRemoving] = useState<string | null>(null);

  const fetchCollaborators = async () => {
    try {
      const res = await fetch(`/api/playlists?collaborators=${playlistId}`);
      const data = await res.json();
      setCollaborators(Array.isArray(data) ? data : []);
    } catch {}
    setLoading(false);
  };

  useEffect(() => { fetchCollaborators(); }, [playlistId]);

    // Fetch owner profile
    useEffect(() => {
      fetch(`/api/profiles?user_id=${ownerId}`)
        .then(r => r.json())
        .then(d => { if (d?.user_id) setOwnerProfile(d); })
        .catch(() => {});
    }, [ownerId]);

  useEffect(() => {
    if (!searchQuery.trim()) { setSearchResults([]); return; }
    const t = setTimeout(async () => {
      setSearching(true);
      try {
        const res = await fetch(`/api/profiles?search=${encodeURIComponent(searchQuery)}`);
        const data = await res.json();
        // Exclude owner and already-invited users
        const existingIds = new Set([ownerId, ...collaborators.map(c => c.user_id)]);
        setSearchResults(Array.isArray(data) ? data.filter((p: any) => !existingIds.has(p.user_id)) : []);
      } catch { setSearchResults([]); }
      setSearching(false);
    }, 400);
    return () => clearTimeout(t);
  }, [searchQuery, collaborators]);

  const inviteUser = async (targetUserId: string, role: 'editor' | 'viewer' = 'editor') => {
    if (!user) return;
    setInviting(targetUserId);
    try {
      await fetch('/api/playlists', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'invite_collaborator',
          playlist_id: playlistId,
          invited_user_id: targetUserId,
          role,
          invited_by: user.id,
        }),
      });
      setSearchQuery('');
      setSearchResults([]);
      await fetchCollaborators();
    } catch {}
    setInviting(null);
  };

  const removeCollaborator = async (collabId: string) => {
    setRemoving(collabId);
    try {
      await fetch('/api/playlists', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ collab_id: collabId }),
      });
      await fetchCollaborators();
    } catch {}
    setRemoving(null);
  };

  const updateRole = async (collabId: string, role: 'editor' | 'viewer') => {
    try {
      await fetch('/api/playlists', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'update_collab_role', collab_id: collabId, role }),
      });
      await fetchCollaborators();
    } catch {}
  };

  const statusBadge = (status: string) => {
    if (status === 'accepted') return <span className="flex items-center gap-1 text-green-400 text-xs"><Check size={11} /> Diterima</span>;
    if (status === 'pending') return <span className="flex items-center gap-1 text-yellow-400 text-xs"><Clock size={11} /> Menunggu</span>;
    if (status === 'rejected') return <span className="flex items-center gap-1 text-red-400 text-xs"><XCircle size={11} /> Ditolak</span>;
    return null;
  };

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-end sm:items-center justify-center p-0 sm:p-4"
        onClick={e => { if (e.target === e.currentTarget) onClose(); }}
      >
        <motion.div
          initial={{ opacity: 0, y: 40 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: 40 }}
          className="w-full sm:max-w-lg bg-[#0e0020] border border-purple-500/20 rounded-t-3xl sm:rounded-2xl overflow-hidden max-h-[85vh] flex flex-col"
        >
          {/* Header */}
          <div className="flex items-center justify-between p-5 border-b border-purple-500/10">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-xl bg-purple-500/20 flex items-center justify-center">
                <Users size={18} className="text-purple-400" />
              </div>
              <div>
                <h2 className="text-white font-bold text-base leading-tight">Kolaborasi Playlist</h2>
                <p className="text-purple-300/50 text-xs truncate max-w-[180px]">{playlistName}</p>
              </div>
            </div>
            <button onClick={onClose} className="p-2 rounded-xl text-purple-300/50 hover:text-purple-300 hover:bg-purple-500/10 transition-all">
              <X size={20} />
            </button>
          </div>

          <div className="overflow-y-auto flex-1 p-5 space-y-5">
            {/* Invite section (owner only) */}
            {isOwner && (
              <div>
                <label className="text-purple-300/70 text-sm font-semibold mb-2 block flex items-center gap-2">
                  <UserPlus size={14} /> Undang Pengguna
                </label>
                <div className="relative">
                  <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-purple-400/60" />
                  <input
                    value={searchQuery}
                    onChange={e => setSearchQuery(e.target.value)}
                    placeholder="Cari username atau nama..."
                    className="w-full bg-[#1a0030] border border-purple-500/30 rounded-xl pl-9 pr-4 py-2.5 text-white placeholder-purple-300/30 focus:outline-none focus:border-purple-400 text-sm transition-all"
                  />
                </div>

                {/* Search results */}
                {(searching || searchResults.length > 0) && (
                  <div className="mt-2 bg-[#12001f] border border-purple-500/20 rounded-xl overflow-hidden">
                    {searching && (
                      <div className="p-3 text-center text-purple-300/40 text-sm">Mencari...</div>
                    )}
                    {!searching && searchResults.length === 0 && searchQuery.trim() && (
                      <div className="p-3 text-center text-purple-300/40 text-sm">Pengguna tidak ditemukan</div>
                    )}
                    {searchResults.map(p => (
                      <div key={p.user_id} className="flex items-center gap-3 px-3 py-2.5 hover:bg-purple-500/5 transition-all border-b border-purple-500/5 last:border-0">
                        <div className="w-8 h-8 rounded-full overflow-hidden flex-shrink-0">
                          {p.avatar_url
                            ? <img src={p.avatar_url} alt="" className="w-full h-full object-cover" />
                            : <div className="w-full h-full bg-gradient-to-br from-purple-700 to-pink-700 flex items-center justify-center text-white font-bold text-xs">
                                {(p.full_name || p.username).charAt(0).toUpperCase()}
                              </div>}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-white text-sm font-semibold truncate">{p.full_name || p.username}</p>
                          <p className="text-purple-300/40 text-xs">@{p.username}</p>
                        </div>
                        <div className="flex gap-1.5">
                          <button
                            onClick={() => inviteUser(p.user_id, 'editor')}
                            disabled={inviting === p.user_id}
                            className="px-2.5 py-1 bg-purple-600/80 hover:bg-purple-600 text-white text-xs rounded-lg flex items-center gap-1 transition-all disabled:opacity-50"
                          >
                            <Edit3 size={11} /> Editor
                          </button>
                          <button
                            onClick={() => inviteUser(p.user_id, 'viewer')}
                            disabled={inviting === p.user_id}
                            className="px-2.5 py-1 bg-[#1a0030] hover:bg-purple-500/20 border border-purple-500/30 text-purple-300 text-xs rounded-lg flex items-center gap-1 transition-all disabled:opacity-50"
                          >
                            <Eye size={11} /> Viewer
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* Collaborators list */}
            <div>
              <h3 className="text-purple-300/70 text-sm font-semibold mb-3 flex items-center gap-2">
                <Users size={14} /> Kolaborator ({collaborators.length})
              </h3>

              {loading ? (
                <div className="space-y-2">
                  {[...Array(3)].map((_, i) => (
                    <div key={i} className="h-14 bg-[#12001f]/60 rounded-xl animate-pulse" />
                  ))}
                </div>
              ) : collaborators.length === 0 ? (
                <div className="text-center py-8">
                  <Users size={36} className="text-purple-500/20 mx-auto mb-3" />
                  <p className="text-purple-300/40 text-sm">Belum ada kolaborator</p>
                  {isOwner && <p className="text-purple-300/25 text-xs mt-1">Undang pengguna di atas</p>}
                </div>
              ) : (
                <div className="space-y-2">
                  {/* Owner row */}
                  <div className="flex items-center gap-3 px-3 py-2.5 bg-purple-500/5 border border-purple-500/15 rounded-xl">
                    <Crown size={14} className="text-yellow-400 flex-shrink-0" />
                    <div className="flex-1 min-w-0">
                      <p className="text-white text-sm font-semibold">@{profile?.username || 'owner'}</p>
                      <p className="text-yellow-400/60 text-xs">Pemilik Playlist</p>
                    </div>
                  </div>

                  {collaborators.map(c => (
                    <div key={c.id} className="flex items-center gap-3 px-3 py-2.5 bg-[#12001f]/60 border border-purple-500/10 rounded-xl">
                      <div className="w-8 h-8 rounded-full overflow-hidden flex-shrink-0">
                        {c.profile?.avatar_url
                          ? <img src={c.profile.avatar_url} alt="" className="w-full h-full object-cover" />
                          : <div className="w-full h-full bg-gradient-to-br from-purple-700 to-pink-700 flex items-center justify-center text-white font-bold text-xs">
                              {(c.profile?.full_name || c.profile?.username || '?').charAt(0).toUpperCase()}
                            </div>}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-white text-sm font-semibold truncate">
                          {c.profile?.full_name || c.profile?.username || 'Pengguna'}
                        </p>
                        <div className="flex items-center gap-2">
                          {statusBadge(c.status)}
                        </div>
                      </div>

                      {isOwner && (
                        <div className="flex items-center gap-1.5 flex-shrink-0">
                          {/* Role toggle */}
                          {c.status === 'accepted' && (
                            <button
                              onClick={() => updateRole(c.id, c.role === 'editor' ? 'viewer' : 'editor')}
                              className="px-2 py-1 text-xs rounded-lg border border-purple-500/30 text-purple-300 hover:border-purple-400 transition-all flex items-center gap-1"
                              title={`Ubah ke ${c.role === 'editor' ? 'viewer' : 'editor'}`}
                            >
                              {c.role === 'editor' ? <><Edit3 size={11} /> Editor</> : <><Eye size={11} /> Viewer</>}
                            </button>
                          )}
                          <button
                            onClick={() => removeCollaborator(c.id)}
                            disabled={removing === c.id}
                            className="p-1.5 rounded-lg text-red-400/50 hover:text-red-400 hover:bg-red-500/10 transition-all disabled:opacity-40"
                          >
                            {removing === c.id
                              ? <div className="w-3.5 h-3.5 border border-red-400 border-t-transparent rounded-full animate-spin" />
                              : <Trash2 size={14} />}
                          </button>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Role legend */}
            <div className="bg-[#12001f]/40 rounded-xl p-3 space-y-1.5">
              <p className="text-purple-300/40 text-xs font-semibold mb-2">Keterangan Role</p>
              <div className="flex items-center gap-2 text-xs text-purple-300/50">
                <Edit3 size={11} className="text-purple-400" />
                <span><strong className="text-purple-300">Editor</strong> — bisa tambah & hapus lagu dari playlist</span>
              </div>
              <div className="flex items-center gap-2 text-xs text-purple-300/50">
                <Eye size={11} className="text-purple-400" />
                <span><strong className="text-purple-300">Viewer</strong> — hanya bisa melihat & memutar playlist</span>
              </div>
            </div>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}
