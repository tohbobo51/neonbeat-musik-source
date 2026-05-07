export default async function handler(req, res) {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
    if (req.method === 'OPTIONS') return res.status(204).end();
    const { url } = req.query;
    if (!url) return res.status(400).json({ error: 'URL diperlukan' });
    try {
      const response = await fetch(decodeURIComponent(url), {
        headers: { 'User-Agent': 'Mozilla/5.0' }
      });
      if (!response.ok) throw new Error(`Gagal download: ${response.status}`);
      const buffer = await response.arrayBuffer();
      res.setHeader('Content-Type', response.headers.get('content-type') || 'audio/mpeg');
      res.setHeader('Content-Length', buffer.byteLength);
      res.status(200).send(Buffer.from(buffer));
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  }
  