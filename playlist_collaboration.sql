-- ============================================================
-- NeonBeat — Playlist Collaboration Feature
-- Jalankan script ini di Supabase SQL Editor
-- ============================================================

-- Tabel playlist_collaborators
CREATE TABLE IF NOT EXISTS playlist_collaborators (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  playlist_id   UUID NOT NULL REFERENCES playlists(id) ON DELETE CASCADE,
  user_id       UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role          TEXT NOT NULL DEFAULT 'editor' CHECK (role IN ('editor', 'viewer')),
  status        TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'accepted', 'rejected')),
  invited_by    UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(playlist_id, user_id)
);

-- Index untuk query yang sering dipakai
CREATE INDEX IF NOT EXISTS idx_playlist_collaborators_playlist_id
  ON playlist_collaborators(playlist_id);

CREATE INDEX IF NOT EXISTS idx_playlist_collaborators_user_id
  ON playlist_collaborators(user_id);

CREATE INDEX IF NOT EXISTS idx_playlist_collaborators_status
  ON playlist_collaborators(status);

-- ============================================================
-- Row Level Security (RLS)
-- ============================================================

ALTER TABLE playlist_collaborators ENABLE ROW LEVEL SECURITY;

-- Kolaborator bisa melihat record kolaborasi miliknya sendiri
CREATE POLICY "collab_select_own"
  ON playlist_collaborators FOR SELECT
  USING (
    auth.uid() = user_id
    OR auth.uid() = invited_by
    OR auth.uid() IN (
      SELECT user_id FROM playlists WHERE id = playlist_id
    )
  );

-- Hanya pemilik playlist yang bisa mengundang (insert)
CREATE POLICY "collab_insert_owner"
  ON playlist_collaborators FOR INSERT
  WITH CHECK (
    auth.uid() IN (
      SELECT user_id FROM playlists WHERE id = playlist_id
    )
  );

-- Pemilik playlist bisa update semua record; user yang diundang hanya bisa update status miliknya
CREATE POLICY "collab_update"
  ON playlist_collaborators FOR UPDATE
  USING (
    auth.uid() IN (
      SELECT user_id FROM playlists WHERE id = playlist_id
    )
    OR auth.uid() = user_id
  );

-- Pemilik playlist bisa hapus; user yang diundang bisa hapus dirinya sendiri
CREATE POLICY "collab_delete"
  ON playlist_collaborators FOR DELETE
  USING (
    auth.uid() IN (
      SELECT user_id FROM playlists WHERE id = playlist_id
    )
    OR auth.uid() = user_id
  );

-- ============================================================
-- Pastikan kolom visibility ada di tabel playlists
-- (mungkin sudah ada — jalankan aman dengan IF NOT EXISTS logic)
-- ============================================================

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'playlists' AND column_name = 'visibility'
  ) THEN
    ALTER TABLE playlists
      ADD COLUMN visibility TEXT NOT NULL DEFAULT 'public'
      CHECK (visibility IN ('public', 'private', 'unlisted'));
  END IF;
END;
$$;

-- ============================================================
-- Verifikasi hasil
-- ============================================================

SELECT
  table_name,
  column_name,
  data_type,
  is_nullable
FROM information_schema.columns
WHERE table_name = 'playlist_collaborators'
ORDER BY ordinal_position;
