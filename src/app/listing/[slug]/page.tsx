'use client';

import useSWR from 'swr';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import type {
    NormalizedPayload,
    ListingBundle,
    NormalizedReview,
} from '@/types/reviews'; // adjust the path if you don't use '@' alias

// typed fetcher for SWR
const fetcher = <T,>(url: string) => fetch(url).then(res => res.json() as Promise<T>);

export default function ListingPage() {
    const params = useParams<{ slug: string }>();
    const slug = typeof params?.slug === 'string' ? params.slug : '';

    const { data } = useSWR<NormalizedPayload>(
        slug ? `/api/reviews/hostaway?listing=${encodeURIComponent(slug)}&approved=true` : null,
        fetcher
    );

    const listing: ListingBundle | undefined = data?.listings?.[0];

    return (
        <div className="container">
            <Link href="/" className="btn">← Back to Dashboard</Link>
            <div className="hero" style={{ marginTop: 16 }}>
                {listing?.listingName || 'Property'}
            </div>
            <div className="subtitle">
                This layout approximates the Flex Living property page. Reviews below are manager-approved only.
            </div>

            <div className="card" style={{ marginTop: 16 }}>
                <h2 style={{ marginTop: 0 }}>Guest Reviews</h2>
                {!listing || listing.reviews.length === 0 ? (
                    <div className="note">No approved reviews yet.</div>
                ) : (
                    <div className="grid" style={{ gridTemplateColumns: 'repeat(2,1fr)' }}>
                        {listing.reviews.map((r: NormalizedReview) => (
                            <div key={r.id} className="card">
                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                    <strong>{r.guest?.name || 'Guest'}</strong>
                                    <div>
                                        <strong>{r.rating5 ?? '—'}★</strong>{' '}
                                        <span className="note">({r.rating10 ?? '—'}/10)</span>
                                    </div>
                                </div>
                                <div className="note" style={{ marginTop: 4 }}>
                                    {r.submittedDate} • {r.channel}
                                </div>
                                <p style={{ marginTop: 10, lineHeight: 1.5 }}>
                                    {r.text || <i>No comment provided.</i>}
                                </p>
                            </div>
                        ))}
                    </div>
                )}
            </div>
        </div>
    );
}