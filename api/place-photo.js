const GOOGLE_KEY = process.env.GOOGLE_MAPS_API_KEY;

// In-memory cache survives warm function instances (saves API quota)
const cache = new Map();

export default async function handler(req, res) {
  const { name, address } = req.query;
  if (!name) return res.status(400).end();

  if (cache.has(name)) {
    res.setHeader('Cache-Control', 'public, max-age=604800');
    return res.redirect(302, cache.get(name));
  }

  try {
    const input = [name, address, 'Tokyo'].filter(Boolean).join(', ');
    const findUrl = `https://maps.googleapis.com/maps/api/place/findplacefromtext/json?input=${encodeURIComponent(input)}&inputtype=textquery&fields=photos&key=${GOOGLE_KEY}`;

    const findRes = await fetch(findUrl);
    const findData = await findRes.json();
    const photoRef = findData.candidates?.[0]?.photos?.[0]?.photo_reference;

    if (!photoRef) return res.status(404).end();

    // Follow the redirect manually so the API key never reaches the client
    const photoApiUrl = `https://maps.googleapis.com/maps/api/place/photo?maxwidth=600&photoreference=${photoRef}&key=${GOOGLE_KEY}`;
    const photoRes = await fetch(photoApiUrl, { redirect: 'manual' });
    const cdnUrl = photoRes.headers.get('location');

    if (!cdnUrl) return res.status(404).end();

    cache.set(name, cdnUrl);
    res.setHeader('Cache-Control', 'public, max-age=604800');
    res.redirect(302, cdnUrl);
  } catch (e) {
    res.status(500).end();
  }
}
