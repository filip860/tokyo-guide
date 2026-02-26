const GIST_ID = process.env.GIST_ID;
const GITHUB_TOKEN = process.env.GITHUB_TOKEN;
const GOOGLE_KEY = process.env.GOOGLE_MAPS_API_KEY;
const GIST_API = `https://api.github.com/gists/${GIST_ID}`;
const RATINGS_FILE = 'ratings.json';
const CACHE_TTL = 7 * 24 * 60 * 60 * 1000; // 7 days

const gistHeaders = {
  Authorization: `token ${GITHUB_TOKEN}`,
  Accept: 'application/vnd.github.v3+json',
  'User-Agent': 'tokyo-guide',
};

async function getGistRatings() {
  const r = await fetch(GIST_API, { headers: gistHeaders });
  if (!r.ok) return null;
  const gist = await r.json();
  const content = gist.files?.[RATINGS_FILE]?.content;
  if (!content) return null;
  try {
    const parsed = JSON.parse(content);
    if (Date.now() - (parsed._ts || 0) < CACHE_TTL) return parsed.data;
  } catch (e) {}
  return null;
}

async function saveGistRatings(data) {
  await fetch(GIST_API, {
    method: 'PATCH',
    headers: { ...gistHeaders, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      files: { [RATINGS_FILE]: { content: JSON.stringify({ _ts: Date.now(), data }) } }
    }),
  });
}

async function fetchRating(name, address) {
  const input = [name, address, 'Tokyo'].filter(Boolean).join(', ');
  const url = `https://maps.googleapis.com/maps/api/place/findplacefromtext/json?input=${encodeURIComponent(input)}&inputtype=textquery&fields=rating&key=${GOOGLE_KEY}`;
  try {
    const r = await fetch(url);
    const d = await r.json();
    return d.candidates?.[0]?.rating ?? null;
  } catch (e) {
    return null;
  }
}

export default async function handler(req, res) {
  res.setHeader('Cache-Control', 'no-store');

  if (req.method === 'GET') {
    const cached = await getGistRatings();
    if (cached) return res.status(200).json(cached);
    return res.status(204).end();
  }

  if (req.method === 'POST') {
    const places = req.body;
    if (!Array.isArray(places)) return res.status(400).end();

    const results = await Promise.all(
      places.map(({ name, address }) =>
        fetchRating(name, address).then(rating => ({ name, rating }))
      )
    );

    const data = {};
    results.forEach(({ name, rating }) => { if (rating != null) data[name] = rating; });

    saveGistRatings(data).catch(() => {});
    return res.status(200).json(data);
  }

  res.status(405).end();
}
