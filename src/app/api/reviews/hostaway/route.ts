import { NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';
import { fetchHostawayRaw } from '@/lib/hostaway';
import { normalizeHostaway } from '@/lib/utils';
import { HostawayReview } from '@/lib/types';

const APPROVED_PATH = path.join(process.cwd(), 'src', 'data', 'approved.json');

function readApproved(): Record<string, boolean> {
  try {
    const raw = fs.readFileSync(APPROVED_PATH, 'utf-8');
    return JSON.parse(raw);
  } catch {
    return {};
  }
}

export async function GET(req: Request) {
  const url = new URL(req.url);
  const raw: HostawayReview[] = await fetchHostawayRaw();
  const approvedMap = readApproved();
  const payload = normalizeHostaway(raw, approvedMap);

  // server-side filters
  const listing = url.searchParams.get('listing');
  const channel = url.searchParams.get('channel');
  const minRating = url.searchParams.get('minRating');
  const from = url.searchParams.get('from');
  const to = url.searchParams.get('to');
  const approved = url.searchParams.get('approved');

  let listings = payload.listings;

  if (listing) {
    const q = listing.toLowerCase();
    listings = listings.filter(l => l.slug === q || l.listingName.toLowerCase().includes(q));
  }

  if (channel) {
    listings = listings
        .map(l => ({ ...l, reviews: l.reviews.filter(r => r.channel === channel) }))
        .filter(l => l.reviews.length > 0);
  }

  if (minRating) {
    const mr = parseFloat(minRating);
    listings = listings
        .map(l => ({ ...l, reviews: l.reviews.filter(r => (r.rating10 ?? 0) >= mr) }))
        .filter(l => l.reviews.length > 0);
  }

  if (approved) {
    const want = approved === 'true';
    listings = listings
        .map(l => ({ ...l, reviews: l.reviews.filter(r => r.approved === want) }))
        .filter(l => l.reviews.length > 0);
  }

  if (from || to) {
    const fromD = from ? new Date(from) : null;
    const toD = to ? new Date(to) : null;
    listings = listings
        .map(l => ({
          ...l,
          reviews: l.reviews.filter(r => {
            const d = new Date(r.submittedAt);
            if (fromD && d < fromD) return false;
            if (toD && d > toD) return false;
            return true;
          }),
        }))
        .filter(l => l.reviews.length > 0);
  }

  return NextResponse.json({ ...payload, listings });
}