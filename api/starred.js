const GIST_ID = process.env.GIST_ID;
const GITHUB_TOKEN = process.env.GITHUB_TOKEN;
const FILENAME = 'starred.json';
const GIST_API = `https://api.github.com/gists/${GIST_ID}`;

const headers = {
  Authorization: `token ${GITHUB_TOKEN}`,
  Accept: 'application/vnd.github.v3+json',
  'User-Agent': 'tokyo-guide',
};

export default async function handler(req, res) {
  res.setHeader('Cache-Control', 'no-store');

  if (req.method === 'GET') {
    const r = await fetch(GIST_API, { headers });
    if (!r.ok) return res.status(500).json({ error: 'Failed to read' });
    const gist = await r.json();
    const content = gist.files?.[FILENAME]?.content || '[]';
    return res.status(200).json(JSON.parse(content));
  }

  if (req.method === 'POST') {
    const body = req.body;
    if (!Array.isArray(body)) return res.status(400).json({ error: 'Expected array' });
    const r = await fetch(GIST_API, {
      method: 'PATCH',
      headers: { ...headers, 'Content-Type': 'application/json' },
      body: JSON.stringify({ files: { [FILENAME]: { content: JSON.stringify(body) } } }),
    });
    if (!r.ok) return res.status(500).json({ error: 'Failed to write' });
    return res.status(200).json({ ok: true });
  }

  res.status(405).end();
}
