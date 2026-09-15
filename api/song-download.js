function safeFilename(value) {
    const cleaned = String(value || 'neonbeat-song')
      .normalize('NFKD')
      .replace(/[\u0000-\u001f\\/:*?"<>|]/g, ' ')
      .replace(/\s+/g, ' ')
      .trim()
      .slice(0, 140);
    return (cleaned || 'neonbeat-song').replace(/\.mp3$/i, '') + '.mp3';
    }

    export default async function handler(req, res) {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

    if (req.method === 'OPTIONS') return res.status(204).end();
    if (req.method !== 'GET') return res.status(405).json({ error: 'Method not allowed' });

    const url = req.query.url;
    if (!url) return res.status(400).json({ error: 'URL audio diperlukan' });

    let target;
    try {
      target = new URL(String(url));
    } catch {
      return res.status(400).json({ error: 'URL audio tidak valid' });
    }

    if (target.protocol !== 'https:') {
      return res.status(400).json({ error: 'URL audio harus HTTPS' });
    }

    const configuredUrls = [
      process.env.VITE_SUPABASE_URL,
      process.env.NEXT_PUBLIC_SUPABASE_URL,
      process.env.SUPABASE_URL,
    ].filter(Boolean);
    const allowedHosts = configuredUrls
      .map(value => {
        try { return new URL(value).hostname; } catch { return ''; }
      })
      .filter(Boolean);

    if (!allowedHosts.includes(target.hostname)) {
      return res.status(403).json({ error: 'Sumber audio tidak diizinkan' });
    }

    try {
      const upstream = await fetch(target.toString(), {
        headers: { 'User-Agent': 'NeonBeat/1.0' },
      });
      if (!upstream.ok) {
        return res.status(upstream.status).json({ error: 'Gagal mengambil audio: ' + upstream.status });
      }

      const buffer = Buffer.from(await upstream.arrayBuffer());
      const downloadName = safeFilename(req.query.filename);
      const fallback = downloadName.replace(/[^\x20-\x7E]/g, '').replace(/"/g, '') || 'neonbeat-song.mp3';

      res.setHeader('Content-Type', upstream.headers.get('content-type') || 'audio/mpeg');
      res.setHeader('Content-Length', buffer.length);
      res.setHeader(
        'Content-Disposition',
        'attachment; filename="' + fallback + '"; filename*=UTF-8\'\'' + encodeURIComponent(downloadName),
      );
      res.setHeader('Cache-Control', 'private, no-store');
      return res.status(200).send(buffer);
    } catch (err) {
      return res.status(500).json({ error: err instanceof Error ? err.message : 'Gagal mengunduh audio' });
    }
    }
    