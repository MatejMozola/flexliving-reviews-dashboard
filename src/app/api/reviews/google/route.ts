import { NextResponse } from 'next/server';

export async function GET(req: Request) {
  const url = new URL(req.url);
  const placeId = url.searchParams.get('placeId');
  if (!placeId) return NextResponse.json({ error: 'Missing placeId query param' }, { status: 400 });

  const key = process.env.GOOGLE_PLACES_API_KEY;
  if (!key) return NextResponse.json({ status: 'disabled', reason: 'GOOGLE_PLACES_API_KEY not set' });

  const api = new URL('https://maps.googleapis.com/maps/api/place/details/json');
  api.searchParams.set('place_id', placeId);
  api.searchParams.set('fields', 'name,rating,user_ratings_total,reviews');
  api.searchParams.set('reviews_sort', 'newest');
  api.searchParams.set('key', key);

  const r = await fetch(api.toString());
  const j = await r.json();

  if (j.status !== 'OK') {
    return NextResponse.json({ status: 'error', upstream: j.status, message: j.error_message }, { status: 502 });
  }

  const name: string = j.result.name;
  const reviews = (j.result.reviews || []).map((rv: any, idx: number) => ({
    id: rv.time || idx,
    type: 'guest-to-host',
    status: 'published',
    channel: 'google',
    rating10: typeof rv.rating === 'number' ? Math.round(rv.rating * 2 * 10) / 10 : null,
    rating5: typeof rv.rating === 'number' ? rv.rating : null,
    text: rv.text || '',
    categories: {} as Record<string, number>,
    submittedAt: new Date(rv.time * 1000).toISOString(),
    submittedDate: new Date(rv.time * 1000).toISOString().slice(0, 10),
    guest: { name: rv.author_name || null },
    listing: { id: null, name, slug: name.toLowerCase().replace(/[^a-z0-9]+/g, '-') },
    approved: true,
    source: 'hostaway', // keep schema compatible; distinguish via channel
  }));

  return NextResponse.json({
    status: 'ok',
    source: 'google',
    fetchedAt: new Date().toISOString(),
    totals: { reviewsCount: reviews.length },
    listingName: name,
    reviews,
  });
}