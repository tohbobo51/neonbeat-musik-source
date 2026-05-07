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

    // Normalize artist/channel from any possible field name the external API might use
    if (data && data.result) {
      const r = data.result;
      const priorityFields = [
        'channel_name', 'channel', 'author', 'uploader', 'creator',
        'artist', 'owner', 'artist_name', 'uploader_name', 'channelTitle',
        'channel_title', 'publisher', 'performer',
      ];
      let artist = '';
      for (const field of priorityFields) {
        const val = r[field];
        if (val && typeof val === 'string' && val.trim() && !val.startsWith('http')) {
          artist = val.trim();
          break;
        }
      }
      // Last resort: scan all string fields excluding known non-name fields
      if (!artist) {
        const skipFields = new Set(['title', 'ext', 'id', 'format', 'url', 'download', 'thumbnail', 'webpage_url', 'description', 'license']);
        for (const [key, val] of Object.entries(r)) {
          if (
            typeof val === 'string' &&
            !skipFields.has(key) &&
            !val.startsWith('http') &&
            val.trim().length > 0 &&
            val.trim().length < 100
          ) {
            artist = val.trim();
            break;
          }
        }
      }
      data.result._artist = artist;
    }

    return res.status(response.status).json(data);
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
}
