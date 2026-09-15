function getString(value, keys) {
  if (!value || typeof value !== 'object') return '';
  for (const key of keys) {
    const candidate = value[key];
    if (typeof candidate === 'string' && candidate.trim()) return candidate.trim();
  }
  return '';
}

function collectUrls(value, key, output) {
  output = output || [];
  key = key || '';
  if (typeof value === 'string' && /^https?:\/\//i.test(value)) {
    output.push({ key: key.toLowerCase(), url: value });
    return output;
  }
  if (Array.isArray(value)) {
    for (const item of value) collectUrls(item, key, output);
    return output;
  }
  if (value && typeof value === 'object') {
    for (const entry of Object.entries(value)) collectUrls(entry[1], entry[0], output);
  }
  return output;
}

function findAudioUrl(payload) {
  const candidates = collectUrls(payload).filter(function (item) { return !/(thumbnail|cover|avatar|image|icon|logo|webpage)/i.test(item.key); });
  candidates.sort(function (a, b) {
    function score(item) {
      let value = 0;
      if (/(download|audio|mp3|m4a|music)/i.test(item.key)) value += 10;
      if (/(video|stream)/i.test(item.key)) value -= 2;
      return value;
    }
    return score(b) - score(a);
  });
  return candidates[0] ? candidates[0].url : '';
}

function findThumbnail(payload) {
  const candidates = collectUrls(payload);
  const match = candidates.find(function (item) { return /(thumbnail|cover|image|thumb)/i.test(item.key); });
  return match ? match.url : '';
}

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  if (req.method === 'OPTIONS') return res.status(204).end();
  if (req.method !== 'GET') return res.status(405).json({ error: 'Method not allowed' });
  const url = req.query.url;
  if (!url) return res.status(400).json({ error: 'URL diperlukan' });
  const apiKey = process.env.ALYACHAN_API_KEY;
  if (!apiKey) return res.status(500).json({ error: 'ALYACHAN_API_KEY belum dikonfigurasi di server' });
  try {
    const apiUrl = 'https://api.alyachan.dev/api/downloader/aio?url=' + encodeURIComponent(url);
    const response = await fetch(apiUrl, { headers: { Authorization: 'Bearer ' + apiKey, Accept: 'application/json' } });
    const raw = await response.json().catch(function () { return {}; });
    if (!response.ok || raw.status === false || raw.success === false) {
      const message = raw.message || raw.msg || raw.error || ('AlyaChan error ' + response.status);
      return res.status(response.ok ? 502 : response.status).json({ error: message });
    }
    const payload = raw.result || raw.data || raw;
    const title = getString(payload, ['title', 'name', 'video_title', 'videoTitle']) || 'YouTube audio';
    const thumbnail = getString(payload, ['thumbnail', 'thumbnail_url', 'thumbnailUrl', 'cover', 'image']) || findThumbnail(payload);
    const download = findAudioUrl(payload);
    if (!download) return res.status(502).json({ error: 'AlyaChan tidak mengembalikan URL audio' });
    const artist = getString(payload, ['channel_name', 'channel', 'author', 'uploader', 'artist', 'artist_name', 'uploader_name']);
    return res.status(200).json({ success: true, result: { title: title, thumbnail: thumbnail, download: download, _artist: artist } });
  } catch (err) {
    return res.status(500).json({ error: err instanceof Error ? err.message : 'Gagal menghubungi AlyaChan' });
  }
}
