import supabase from './_supabase.js';

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  if (req.method === 'OPTIONS') return res.status(204).end();

  try {
    if (req.method === 'POST') {
      const { filename, contentType, bucket } = req.body;
      const ext = filename.split('.').pop();
      const safeName = `${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`;
      const { data, error } = await supabase.storage
        .from(bucket || 'music')
        .createSignedUploadUrl(safeName);
      if (error) throw error;
      return res.status(200).json({ signedUrl: data.signedUrl, path: data.path, token: data.token });
    }
    res.status(405).json({ error: 'Method not allowed' });
  } catch (err) {
    console.error('Upload error:', err);
    res.status(500).json({ error: err.message });
  }
}
