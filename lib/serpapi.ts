/**
 * SerpApi — Google Trends client
 * Docs    : https://serpapi.com/google-trends-interest-over-time
 * Pricing : starts at $50/month for 5,000 searches
 *
 * JSON response structure:
 * {
 *   interest_over_time: {
 *     timeline_data: [{ date, timestamp, values: [{ query, value, extracted_value }] }],
 *     averages: [{ query, value }]
 *   }
 * }
 *
 * geo codes: FR, ES, US (ISO 3166-1 alpha-2)
 * date parameter: 'today 3-m', 'today 12-m', 'now 7-d', etc.
 */

export type MarketId = 'fr' | 'es' | 'com';

export const SERPAPI_GEO: Record<MarketId, string> = {
  fr: 'FR',
  es: 'ES',
  com: 'US',
};

const SERPAPI_BASE = 'https://serpapi.com/search.json';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface TrendPoint {
  date: string;
  timestamp: string;
  value: number;
}

export interface TrendsResult {
  keyword: string;
  /** 0-100, average search interest over the period */
  average: number;
  /**
   * Trend direction: positive = rising, negative = falling
   * Calculated as % change from older half to recent half of the period
   */
  trend: number;
  timeline: TrendPoint[];
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function avg(arr: number[]): number {
  if (arr.length === 0) return 0;
  return arr.reduce((a, b) => a + b, 0) / arr.length;
}

/** Calculate slope: compares first half vs second half of the timeline */
function calcTrend(timeline: TrendPoint[]): number {
  if (timeline.length < 4) return 0;
  const half = Math.floor(timeline.length / 2);
  const older = timeline.slice(0, half).map((p) => p.value);
  const recent = timeline.slice(half).map((p) => p.value);
  const avgOlder = avg(older);
  const avgRecent = avg(recent);
  if (avgOlder === 0) return avgRecent > 0 ? 100 : 0;
  return Math.round(((avgRecent - avgOlder) / avgOlder) * 100);
}

/**
 * Extract a short, Google Trends-friendly keyword from a product name.
 * Product names like "MIXA - Autobronzant - Lait Corps Nourrissant ..." are too long.
 * Strategy: take the first segment before " - ", then truncate to 60 chars.
 * e.g. "MIXA - Autobronzant - Lait Corps..." → "MIXA Autobronzant"
 */
export function cleanKeyword(name: string): string {
  if (!name) return '';

  function cleanStr(s: string): string {
    return s
      .replace(/\([^)]*\)/g, ' ')                              // remove (parens)
      .replace(/\d+\s*(ml|cl|g|kg|cm|mm|pouces?|pack|lot)/gi, ' ') // units
      .replace(/\d+/g, ' ')                                // standalone numbers
      .replace(/[^\w\sÀ-ÿ]/g, ' ')                             // keep letters+accents
      .replace(/\s+/g, ' ')
      .trim();
  }

  // Split on any separator: " - ", " – ", " : ", ","
  const segments = name.split(/\s*[-–:,]\s*/);
  const first = cleanStr(segments[0] ?? '');
  const firstWords = first.split(' ').filter(w => w.length > 1);

  let base: string;
  if (firstWords.length >= 2) {
    // First segment already has brand + type (e.g. "Apple AirTag", "Amazon Fire TV Stick HD")
    base = first;
  } else {
    // First segment is just a brand (e.g. "MIXA", "CeraVe") — add second segment
    const second = cleanStr(segments[1] ?? '');
    base = (first + ' ' + second).trim();
  }

  // Max 4 significant words
  const words = base.split(' ').filter(w => w.length > 1);
  return words.slice(0, 4).join(' ');
}

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

/**
 * Fetch Google Trends interest over time for up to 5 keywords.
 * Gracefully degrades to default values when API key is not set.
 *
 * @param keywords  - Product names / search terms (max 5)
 * @param marketId  - Market to get geo-specific trends for
 * @param timeframe - 'today 3-m' | 'today 12-m' | 'now 7-d' | 'now 30-d'
 */
export async function getTrendsInterest(
  keywords: string[],
  marketId: MarketId = 'fr',
  timeframe = 'today 3-m',
  apiKey = process.env.SERPAPI_KEY
): Promise<TrendsResult[]> {
  // Graceful fallback — neutral score when key not configured
  if (!apiKey) {
    console.warn('[SerpApi] SERPAPI_KEY not set — using neutral trend scores');
    return keywords.map((keyword) => ({
      keyword,
      average: 50,
      trend: 0,
      timeline: [],
    }));
  }

  const batch = keywords.slice(0, 5); // Google Trends max: 5 terms
  const geo = SERPAPI_GEO[marketId];

  const params = new URLSearchParams({
    engine: 'google_trends',
    q: batch.join(','),
    geo,
    date: timeframe,
    data_type: 'TIMESERIES',
    api_key: apiKey,
  });

  const res = await fetch(`${SERPAPI_BASE}?${params}`, {
    cache: 'no-store',
    headers: { Accept: 'application/json' },
  });

  if (!res.ok) {
    throw new Error(`[SerpApi] HTTP ${res.status}: ${res.statusText}`);
  }

  const data = await res.json();

  if (data.error) {
    throw new Error(`[SerpApi] API error: ${data.error}`);
  }

  const timelineData: {
    date: string;
    timestamp: string;
    values: { query: string; value: string; extracted_value: number }[];
  }[] = data.interest_over_time?.timeline_data ?? [];

  const averages: { query: string; value: number }[] =
    data.interest_over_time?.averages ?? [];

  return batch.map((keyword) => {
    const kwLower = keyword.toLowerCase();

    // Build per-keyword timeline
    const timeline: TrendPoint[] = timelineData
      .map((point) => {
        const match = point.values.find(
          (v) => v.query.toLowerCase() === kwLower
        );
        return match
          ? {
              date: point.date,
              timestamp: point.timestamp,
              value: match.extracted_value,
            }
          : null;
      })
      .filter((p): p is TrendPoint => p !== null);

    // Average from SerpApi (already computed server-side)
    const serpAvg =
      averages.find((a) => a.query.toLowerCase() === kwLower)?.value ?? 50;

    // Fallback: calculate average from timeline when SerpApi averages is empty
    // (happens with single-term queries)
    const calculatedAvg = timeline.length > 0
      ? Math.round(timeline.reduce((s, p) => s + p.value, 0) / timeline.length)
      : 50;
    const finalAvg = serpAvg !== 50 ? serpAvg : calculatedAvg || 50;

    return {
      keyword,
      average: finalAvg,
      trend: calcTrend(timeline),
      timeline,
    };
  });
}

/**
 * Get trending NOW searches for a market — useful for the "Trending" section
 */
export async function getTrendingNow(
  marketId: MarketId = 'fr',
  apiKey = process.env.SERPAPI_KEY
): Promise<string[]> {
  if (!apiKey) return [];

  const geo = SERPAPI_GEO[marketId];
  const params = new URLSearchParams({
    engine: 'google_trends_trending_now',
    geo,
    hours: '24',
    api_key: apiKey,
  });

  const res = await fetch(`${SERPAPI_BASE}?${params}`, { cache: 'no-store' });
  if (!res.ok) return [];

  const data = await res.json();
  const searches: { query: string }[] = data.trending_searches ?? [];
  return searches.map((s) => s.query).slice(0, 20);
}
