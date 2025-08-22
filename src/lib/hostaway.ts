import fs from 'fs';
import path from 'path';
import { HostawayReview } from './types';

const MOCK_PATH = path.join(process.cwd(), 'src', 'data', 'mock-hostaway.json');

export async function fetchHostawayRaw(): Promise<HostawayReview[]> {
  // Real Hostaway fetch (sandbox likely returns empty; mock-first approach)
  const accountId = process.env.HOSTAWAY_ACCOUNT_ID;
  const apiKey = process.env.HOSTAWAY_API_KEY;

  // Attempt real fetch if keys exist; ignore errors (sandbox often empty)
  try {
    if (accountId && apiKey) {
      // NOTE: This is a generic example; adjust endpoint/headers to your actual sandbox docs if needed.
      const url = `https://api.hostaway.com/v1/reviews?accountId=${encodeURIComponent(accountId)}`;
      const res = await fetch(url, {
        headers: {
          'Authorization': `Bearer ${apiKey}`,
          'Content-Type': 'application/json',
        },
        // next: { revalidate: 60 } // if using app router
      });
      if (res.ok) {
        const data = await res.json();
        if (Array.isArray(data?.result) && data.result.length > 0) {
          return data.result as HostawayReview[];
        }
      }
    }
  } catch (e) {
    // swallow and proceed to mock
  }

  // Fallback to mock data
  const raw = fs.readFileSync(MOCK_PATH, 'utf-8');
  const json = JSON.parse(raw);
  return (json.result || []) as HostawayReview[];
}
