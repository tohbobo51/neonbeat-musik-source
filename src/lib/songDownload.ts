import type { Song } from '../context/PlayerContext';

    export function getSongFilename(title: string) {
    const cleaned = String(title || 'neonbeat-song')
      .normalize('NFKD')
      .replace(/[\u0000-\u001f\\/:*?"<>|]/g, ' ')
      .replace(/\s+/g, ' ')
      .trim()
      .slice(0, 140);
    return (cleaned || 'neonbeat-song').replace(/\.mp3$/i, '') + '.mp3';
    }

    export async function downloadSong(song: Pick<Song, 'title' | 'audio_url'>) {
    const filename = getSongFilename(song.title);
    const response = await fetch(
      '/api/song-download?url=' + encodeURIComponent(song.audio_url) + '&filename=' + encodeURIComponent(filename),
    );

    if (!response.ok) {
      const data = await response.json().catch(() => ({}));
      throw new Error(data.error || 'Gagal mengunduh lagu');
    }

    const blob = await response.blob();
    const objectUrl = URL.createObjectURL(blob);
    const anchor = document.createElement('a');
    anchor.href = objectUrl;
    anchor.download = filename;
    document.body.appendChild(anchor);
    anchor.click();
    anchor.remove();
    URL.revokeObjectURL(objectUrl);
    }
    