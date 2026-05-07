import supabase from './_supabase.js';

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  if (req.method === 'OPTIONS') return res.status(204).end();

  try {
    if (req.method === 'GET') {
      // Tidak pakai join — ambil genres saja lalu hitung songs terpisah
      const { data: genres, error } = await supabase
        .from('genres')
        .select('*')
        .order('name', { ascending: true });
      if (error) throw error;
      return res.status(200).json(genres || []);
    }

    if (req.method === 'POST') {
      const { name, color, description } = req.body;
      const { data, error } = await supabase
        .from('genres')
        .insert({ name, color: color || '#9333ea', description })
        .select()
        .single();
      if (error) throw error;
      return res.status(201).json(data);
    }

    if (req.method === 'PUT') {
      const { id, name, color, description } = req.body;
      const { data, error } = await supabase
        .from('genres')
        .update({ name, color, description })
        .eq('id', id)
        .select()
        .single();
      if (error) throw error;
      return res.status(200).json(data);
    }

    if (req.method === 'DELETE') {
      const { id } = req.body;
      const { error } = await supabase.from('genres').delete().eq('id', id);
      if (error) throw error;
      return res.status(200).json({ ok: true });
    }

    res.status(405).json({ error: 'Method not allowed' });
  } catch (err) {
    console.error('Genres API error:', err);
    res.status(500).json({ error: err.message });
  }
}
