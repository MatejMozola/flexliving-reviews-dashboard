// Channels you expect to see
export type ReviewChannel = 'airbnb' | 'booking' | 'hostaway' | 'google';

// Hostaway/raw enums
export type ReviewType = 'host-to-guest' | 'guest-to-host' | string;
export type ReviewStatus = 'published' | 'pending' | 'hidden' | string;

/** Raw Hostaway shapes (pre-normalization) */
export interface HostawayCategory {
    category: string;
    rating: number;
}

export interface HostawayReview {
    id: number;
    type: ReviewType;
    status: ReviewStatus;
    rating: number | null;            // overall (may be null)
    publicReview: string | null;
    reviewCategory?: HostawayCategory[];
    submittedAt: string;              // 'YYYY-MM-DD HH:mm:ss'
    guestName?: string;
    listingId?: number | null;
    listingName?: string;
    channel?: string | null;
}

/** Normalized review used by the frontend */
export interface NormalizedReview {
    id: number;
    type: ReviewType;
    status: ReviewStatus;
    channel: ReviewChannel | string;

    /** 0..10 scale (derived from categories if missing) */
    rating10: number | null;
    /** 0..5 stars (derived from rating10) */
    rating5: number | null;

    text: string;
    categories: Record<string, number>;

    submittedAt: string;    // ISO string
    submittedDate: string;  // YYYY-MM-DD

    guest: { name?: string | null };
    listing: { id?: number | null; name: string; slug: string };

    /** Manager toggle */
    approved: boolean;

    /** Provenance tag */
    source: 'hostaway' | 'google';
}

/** Per-listing aggregate + reviews */
export interface ListingMetrics {
    reviewsCount: number;
    ratingAvg10: number | null;
    ratingAvg5: number | null;
    categoriesAvg: Record<string, number>;
    last30Count: number;
}

export interface ListingBundle {
    listingId?: number | null;
    listingName: string;
    slug: string;
    metrics: ListingMetrics;
    reviews: NormalizedReview[];
}

/** API payload returned by GET /api/reviews/hostaway */
export interface NormalizedTotals {
    reviewsCount: number;
    listingsCount: number;
    channels: Record<string, number>;
}

export interface NormalizedPayload {
    status: 'ok';
    source: 'hostaway';
    fetchedAt: string;
    totals: NormalizedTotals;
    listings: ListingBundle[];
}

/** Approve API */
export interface ApproveBody {
    id: number;
    approved: boolean;
}
export interface ApproveResponse {
    status: 'ok';
    id: number;
    approved: boolean;
}