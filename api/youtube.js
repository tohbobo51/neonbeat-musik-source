export default async function handler(req, res) {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
    if (req.method === 'OPTIONS') return res.status(204).end();
    const { url } = req.query;
    if (!url) return res.status(400).json({ error: 'URL diperlukan' });
    try {
      const apiUrl = `https://api.naze.biz.id/download/youtube?url=${encodeURIComponent(url)}&format=mp3&apikey=nz-6d5d29dc61`;
      const response = await fetch(apiUrl);
      const data = await response.json();
      return res.status(response.status).json(data);
    } catch (err) {
      return res.status(500).json({ error: err.message });
    }
  }
  