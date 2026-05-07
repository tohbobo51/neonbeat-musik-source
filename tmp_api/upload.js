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
        const targetBucket = bucket || 'music';

        const { data, error } = await supabase.storage
          .from(targetBucket)
          .createSignedUploadUrl(safeName);
        if (error) throw error;

        // Buat signed download URL dengan masa berlaku 10 tahun (tidak perlu bucket public)
        const { data: downloadData, error: downloadError } = await supabase.storage
          .from(targetBucket)
          .createSignedUrl(data.path, 315360000);
        if (downloadError) throw downloadError;

        return res.status(200).json({
          signedUrl: data.signedUrl,
          path: data.path,
          token: data.token,
          downloadUrl: downloadData.signedUrl,
        });
      }
      res.status(405).json({ error: 'Method not allowed' });
    } catch (err) {
      console.error('Upload error:', err);
      res.status(500).json({ error: err.message });
    }
  }
  