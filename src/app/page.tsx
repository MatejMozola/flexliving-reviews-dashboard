'use client';

import useSWR from 'swr';
import Link from 'next/link';
import { useMemo, useState } from 'react';
import type {
  NormalizedReview as Review,
  ListingBundle as Listing,
  NormalizedPayload as Payload,
} from '@/types/reviews';

const fetcher = (url: string) => fetch(url).then(r => r.json());

export default function Dashboard() {
  const { data, mutate } = useSWR<Payload>('/api/reviews/hostaway', fetcher);
  const [query, setQuery] = useState('');
  const [minRating, setMinRating] = useState<number>(0);
  const [channel, setChannel] = useState('');
  const [approvedOnly, setApprovedOnly] = useState(false);

  const listings: Listing[] = useMemo(() => {
    if (!data) return [];
    let L = data.listings;

    if (query) {
      const q = query.toLowerCase();
      L = L.filter(l => l.listingName.toLowerCase().includes(q));
    }

    if (channel) {
      L = L.map(l => ({ ...l, reviews: l.reviews.filter((r: Review) => r.channel === channel) }))
          .filter(l => l.reviews.length > 0);
    }

    if (minRating > 0) {
      L = L.map(l => ({ ...l, reviews: l.reviews.filter((r: Review) => (r.rating10 ?? 0) >= minRating) }))
          .filter(l => l.reviews.length > 0);
    }

    if (approvedOnly) {
      L = L.map(l => ({ ...l, reviews: l.reviews.filter((r: Review) => r.approved) }))
          .filter(l => l.reviews.length > 0);
    }

    // recompute shown metrics
    L = L.map(l => {
      const rs: Review[] = l.reviews;
      const ratings = rs.map(r => r.rating10).filter((x): x is number => typeof x === 'number');
      const avg10 = ratings.length
          ? Math.round((ratings.reduce((a, b) => a + b, 0) / ratings.length) * 10) / 10
          : null;

      return {
        ...l,
        metrics: {
          ...l.metrics,
          reviewsCount: rs.length,
          ratingAvg10: avg10,
          ratingAvg5: avg10 ? Math.round((avg10 / 2) * 10) / 10 : null,
        },
      };
    });
    return L.sort((a, b) => (b.metrics.ratingAvg10 ?? 0) - (a.metrics.ratingAvg10 ?? 0));
  }, [data, query, minRating, channel, approvedOnly]);

  async function toggleApprove(id: number, approved: boolean) {
    await fetch('/api/reviews/approve', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id, approved }),
    });
    mutate();
  }

  return (
      <div className="container">
        <h1 style={{ marginBottom: 6 }}>Reviews Dashboard</h1>
        <div className="subtitle">
          Assess property performance, spot trends, and curate which reviews appear on the public page.
        </div>

        <div className="grid" style={{ gridTemplateColumns: 'repeat(3,1fr)', marginTop: 16 }}>
          <div className="kpi">
            <div className="label">Total Reviews</div>
            <div className="value">{data?.totals?.reviewsCount ?? '—'}</div>
          </div>
          <div className="kpi">
            <div className="label">Properties</div>
            <div className="value">{data?.totals?.listingsCount ?? '—'}</div>
          </div>
          <div className="kpi">
            <div className="label">Last Updated</div>
            <div className="value">{data ? new Date(data.fetchedAt).toLocaleString() : '—'}</div>
          </div>
        </div>

        <div className="card" style={{ marginTop: 16 }}>
          <div className="filterbar">
            <input className="input" placeholder="Search listings…" value={query} onChange={e => setQuery(e.target.value)} />
            <select className="select" value={channel} onChange={e => setChannel(e.target.value)}>
              <option value="">All channels</option>
              <option value="airbnb">Airbnb</option>
              <option value="booking">Booking</option>
              <option value="hostaway">Hostaway</option>
              <option value="google">Google</option>
            </select>
            <select className="select" value={String(minRating)} onChange={e => setMinRating(Number(e.target.value))}>
              <option value="0">Min rating</option>
              <option value="6">6+</option>
              <option value="7">7+</option>
              <option value="8">8+</option>
              <option value="9">9+</option>
            </select>
            <label style={{ display: 'inline-flex', alignItems: 'center', gap: 8 }}>
              <input type="checkbox" checked={approvedOnly} onChange={e => setApprovedOnly(e.target.checked)} />
              Approved only
            </label>
            <Link href="/listing/camden-loft---canal-view" className="btn">Open example property</Link>
          </div>

          <table className="table">
            <thead>
            <tr>
              <th>Property</th>
              <th>Avg (10)</th>
              <th>Count</th>
              <th>Top categories</th>
              <th>Actions</th>
            </tr>
            </thead>
            <tbody>
            {listings.map(l => (
                <tr key={l.slug}>
                  <td>
                    <div style={{ display: 'flex', flexDirection: 'column' }}>
                      <strong>{l.listingName}</strong>
                      <span className="note">{l.metrics.last30Count} new in last 30 days</span>
                    </div>
                  </td>
                  <td>
                    {l.metrics.ratingAvg10 ?? '—'} <span className="note">({l.metrics.ratingAvg5 ?? '—'}★)</span>
                  </td>
                  <td>{l.metrics.reviewsCount}</td>
                  <td>
                    {Object.entries(l.metrics.categoriesAvg)
                        .slice(0, 3)
                        .map(([k, v]) => (
                            <span key={k} className="badge" style={{ marginRight: 6 }}>
                        {k}: {v}
                      </span>
                        ))}
                  </td>
                  <td>
                    <Link href={`/listing/${l.slug}`} className="btn ghost">
                      View property
                    </Link>
                  </td>
                </tr>
            ))}
            </tbody>
          </table>

          <div style={{ marginTop: 12 }} className="note">
            Click a property to manage individual reviews.
          </div>

          {listings.map(l => (
              <details key={l.slug} className="collapsible">
                <summary>Manage reviews for {l.listingName}</summary>
                <table className="table" style={{ marginTop: 10 }}>
                  <thead>
                  <tr>
                    <th>Date</th>
                    <th>Guest</th>
                    <th>Rating</th>
                    <th>Channel</th>
                    <th>Text</th>
                    <th>Approved</th>
                    <th></th>
                  </tr>
                  </thead>
                  <tbody>
                  {l.reviews.map((r: Review) => (
                      <tr key={r.id}>
                        <td>{r.submittedDate}</td>
                        <td>{r.guest?.name ?? '—'}</td>
                        <td>
                          {r.rating10 ?? '—'} <span className="note">({r.rating5 ?? '—'}★)</span>
                        </td>
                        <td>
                          <span className="badge">{r.channel}</span>
                        </td>
                        <td>{r.text || <i className="note">—</i>}</td>
                        <td className={r.approved ? 'approved' : 'not-approved'}>{r.approved ? 'Yes' : 'No'}</td>
                        <td>
                          {r.approved ? (
                              <button className="btn" onClick={() => toggleApprove(r.id, false)}>
                                Hide
                              </button>
                          ) : (
                              <button className="btn primary" onClick={() => toggleApprove(r.id, true)}>
                                Approve
                              </button>
                          )}
                        </td>
                      </tr>
                  ))}
                  </tbody>
                </table>
              </details>
          ))}
        </div>
      </div>
  );
}