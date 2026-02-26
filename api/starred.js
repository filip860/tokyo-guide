import { kv } from '@vercel/kv';

const KEY = 'tokyo-starred';

export default async function handler(req, res) {
  res.setHeader('Cache-Control', 'no-store');

  if (req.method === 'GET') {
    const data = await kv.get(KEY);
    return res.status(200).json(data || []);
  }

  if (req.method === 'POST') {
    const body = req.body;
    if (!Array.isArray(body)) return res.status(400).json({ error: 'Expected array' });
    await kv.set(KEY, body);
    return res.status(200).json({ ok: true });
  }

  res.status(405).end();
}
