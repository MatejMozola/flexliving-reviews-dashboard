export type HostawayCategory = {
  category: string;
  rating: number;
};

export type HostawayReview = {
  id: number;
  type: 'host-to-guest' | 'guest-to-host' | string;
  status: 'published' | 'pending' | 'hidden' | string;
  rating: number | null;
  publicReview: string | null;
  reviewCategory?: HostawayCategory[];
  submittedAt: string; // 'YYYY-MM-DD HH:mm:ss'
  guestName?: string;
  listingId?: number | null;
  listingName?: string;
  channel?: string | null;
};

export type NormalizedReview = {
  id: number;
  type: 'host-to-guest' | 'guest-to-host' | string;
  status: string;
  channel: string;
  rating10: number | null; // 0..10
  rating5: number | null;  // 0..5
  text: string;
  categories: Record<string, number>;
  submittedAt: string;     // ISO 8601
  submittedDate: string;   // YYYY-MM-DD
  guest: { name?: string | null };
  listing: { id?: number | null; name: string; slug: string };
  approved: boolean;
  source: 'hostaway' | 'google';
};

export type ListingBundle = {
  listingId?: number | null;
  listingName: string;
  slug: string;
  metrics: {
    reviewsCount: number;
    ratingAvg10: number | null;
    ratingAvg5: number | null;
    categoriesAvg: Record<string, number>;
    last30Count: number;
  };
  reviews: NormalizedReview[];
};

export type NormalizedPayload = {
  status: 'ok';
  source: 'hostaway';
  fetchedAt: string;
  totals: {
    reviewsCount: number;
    listingsCount: number;
    channels: Record<string, number>;
  };
  listings: ListingBundle[];
};
