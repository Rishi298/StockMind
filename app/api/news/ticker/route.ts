import { NextRequest, NextResponse } from 'next/server';
import { XMLParser } from 'fast-xml-parser';

export async function GET(req: NextRequest) {
  const ticker = new URL(req.url).searchParams.get('ticker')?.toUpperCase() ?? '';
  if (!ticker) return NextResponse.json({ error: 'ticker required' }, { status: 400 });

  const query = encodeURIComponent(`${ticker} NSE stock India`);
  const url = `https://news.google.com/rss/search?q=${query}&hl=en-IN&gl=IN&ceid=IN:en`;

  try {
    const res = await fetch(url, {
      headers: { 'User-Agent': 'Mozilla/5.0 (compatible; StockMindBot/1.0)' },
      next: { revalidate: 900 }, // 15 min cache
    });

    if (!res.ok) throw new Error(`RSS fetch failed: ${res.status}`);

    const xml = await res.text();
    const parser = new XMLParser({ ignoreAttributes: false, attributeNamePrefix: '@_' });
    const parsed = parser.parse(xml) as { rss?: { channel?: { item?: Array<{ title: string; link: string; pubDate: string; source?: { '#text'?: string; '@_url'?: string } | string }> } } };

    const items = parsed?.rss?.channel?.item ?? [];
    const articles = items.slice(0, 8).map((item) => ({
      title: String(item.title ?? '').replace(/<[^>]+>/g, '').trim(),
      link:  String(item.link ?? ''),
      pubDate: String(item.pubDate ?? ''),
      source: typeof item.source === 'object'
        ? (item.source?.['#text'] ?? '')
        : String(item.source ?? ''),
    })).filter((a) => a.title && a.link);

    return NextResponse.json(articles, {
      headers: { 'Cache-Control': 'public, s-maxage=900, stale-while-revalidate=300' },
    });
  } catch (err) {
    return NextResponse.json({ error: err instanceof Error ? err.message : 'News fetch failed' }, { status: 500 });
  }
}
