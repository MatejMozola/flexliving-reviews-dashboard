import { HostawayReview, NormalizedReview, ListingBundle, NormalizedPayload } from './types';

export function slugify(name: string) {
  return name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
}

export function toISO(input: string): string {
  // input like '2020-08-21 22:45:14' -> ISO
  const s = input.replace(' ', 'T') + 'Z'; // treat as UTC for simplicity
  return s;
}

export function ratingFromCategories(categories: Record<string, number> | undefined): number | null {
  if (!categories) return null;
  const values = Object.values(categories);
  if (!values.length) return null;
  const avg = values.reduce((a, b) => a + b, 0) / values.length;
  return Math.round(avg * 10) / 10;
}

export function normalizeHostaway(reviews: HostawayReview[], approvedMap: Record<string, boolean> = {}): NormalizedPayload {
  const normalized: NormalizedReview[] = reviews.map(r => {
    const categoriesObj: Record<string, number> = {};
    (r.reviewCategory || []).forEach(c => {
      if (typeof c.rating === 'number') categoriesObj[c.category] = c.rating;
    });
    const rating10 = typeof r.rating === 'number' && !Number.isNaN(r.rating) ? r.rating : ratingFromCategories(categoriesObj);
    const rating5 = typeof rating10 === 'number' ? Math.round((rating10 / 2) * 10) / 10 : null;
    const listingName = r.listingName || 'Unknown Listing';
    const slug = slugify(listingName);
    const iso = toISO(r.submittedAt);
    const submittedDate = iso.slice(0, 10);
    const idKey = String(r.id);
    return {
      id: r.id,
      type: r.type,
      status: r.status,
      channel: r.channel || 'hostaway',
      rating10,
      rating5,
      text: r.publicReview || '',
      categories: categoriesObj,
      submittedAt: iso,
      submittedDate,
      guest: { name: r.guestName || null },
      listing: { id: r.listingId ?? null, name: listingName, slug },
      approved: Boolean(approvedMap[idKey] === true),
      source: 'hostaway' as const,
    };
  });

  const byListing: Record<string, ListingBundle> = {};
  const channels: Record<string, number> = {};
  const now = new Date();

  for (const n of normalized) {
    channels[n.channel] = (channels[n.channel] || 0) + 1;
    const key = n.listing.slug;
    if (!byListing[key]) {
      byListing[key] = {
        listingId: n.listing.id,
        listingName: n.listing.name,
        slug: n.listing.slug,
        metrics: {
          reviewsCount: 0,
          ratingAvg10: null,
          ratingAvg5: null,
          categoriesAvg: {},
          last30Count: 0,
        },
        reviews: [],
      };
    }
    byListing[key].reviews.push(n);
    byListing[key].metrics.reviewsCount += 1;
    // last 30 days count
    const d = new Date(n.submittedAt);
    const diffDays = (Number(now) - Number(d)) / 86400000;
    if (diffDays <= 30) byListing[key].metrics.last30Count += 1;
  }

  // compute averages
  for (const key of Object.keys(byListing)) {
    const b = byListing[key];
    const ratings = b.reviews.map(r => r.rating10).filter((x): x is number => typeof x === 'number');
    const avg10 = ratings.length ? Math.round((ratings.reduce((a,b)=>a+b,0)/ratings.length) * 10) / 10 : null;
    const avg5 = typeof avg10 === 'number' ? Math.round((avg10/2)*10)/10 : null;
    b.metrics.ratingAvg10 = avg10;
    b.metrics.ratingAvg5 = avg5;

    const catSums: Record<string, {sum:number, count:number}> = {};
    for (const r of b.reviews) {
      for (const [k,v] of Object.entries(r.categories)) {
        if (!catSums[k]) catSums[k] = {sum:0,count:0};
        catSums[k].sum += v;
        catSums[k].count += 1;
      }
    }
    const catAvg: Record<string, number> = {};
    for (const [k,vc] of Object.entries(catSums)) {
      catAvg[k] = Math.round((vc.sum / vc.count) * 10) / 10;
    }
    b.metrics.categoriesAvg = catAvg;
  }

  const payload: NormalizedPayload = {
    status: 'ok',
    source: 'hostaway',
    fetchedAt: new Date().toISOString(),
    totals: {
      reviewsCount: normalized.length,
      listingsCount: Object.keys(byListing).length,
      channels,
    },
    listings: Object.values(byListing).sort((a,b)=> (b.metrics.ratingAvg10 ?? 0) - (a.metrics.ratingAvg10 ?? 0)),
  };
  return payload;
}
