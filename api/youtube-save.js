import supabase from './_supabase.js';

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') return res.status(204).end();

  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const { downloadUrl } = req.body;
  if (!downloadUrl) return res.status(400).json({ error: 'downloadUrl diperlukan' });

  try {
    const audioRes = await fetch(downloadUrl, {
      headers: { 'User-Agent': 'Mozilla/5.0' },
    });
    if (!audioRes.ok) throw new Error(`Gagal download audio: ${audioRes.status}`);

    const buffer = await audioRes.arrayBuffer();
    const safeName = `yt-${Date.now()}-${Math.random().toString(36).slice(2)}.mp3`;

    const { data, error } = await supabase.storage
      .from('music')
      .upload(safeName, Buffer.from(buffer), {
        contentType: 'audio/mpeg',
        upsert: false,
      });
    if (error) throw error;

    const { data: urlData, error: urlError } = await supabase.storage
      .from('music')
      .createSignedUrl(data.path, 315360000);
    if (urlError) throw urlError;

    return res.status(200).json({ url: urlData.signedUrl, path: data.path });
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
}
