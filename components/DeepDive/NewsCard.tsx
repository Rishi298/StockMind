'use client';

import { useEffect, useState } from 'react';
import { Newspaper, ExternalLink, Clock } from 'lucide-react';

interface Article {
  title: string;
  link: string;
  pubDate: string;
  source: string;
}

function timeAgo(dateStr: string): string {
  const ms = Date.now() - new Date(dateStr).getTime();
  const h = Math.floor(ms / 3600000);
  const m = Math.floor(ms / 60000);
  if (h > 48) return `${Math.floor(h / 24)}d ago`;
  if (h > 0)  return `${h}h ago`;
  if (m > 0)  return `${m}m ago`;
  return 'just now';
}

export function NewsCard({ ticker }: { ticker: string }) {
  const [articles, setArticles] = useState<Article[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    fetch(`/api/news/ticker?ticker=${ticker}`)
      .then((r) => r.json())
      .then((d) => {
        if (Array.isArray(d)) setArticles(d);
        else setError('No news available');
      })
      .catch(() => setError('Could not load news'))
      .finally(() => setLoading(false));
  }, [ticker]);

  return (
    <div className="bg-stone-900 border border-stone-800 rounded-2xl p-5">
      <div className="flex items-center gap-2 mb-4">
        <Newspaper className="h-4 w-4 text-amber-400" />
        <h2 className="font-semibold text-stone-200">Latest News</h2>
        <span className="text-xs text-stone-600 ml-1">via Google News</span>
      </div>

      {loading && (
        <div className="space-y-3">
          {[1,2,3].map((i) => (
            <div key={i} className="animate-pulse">
              <div className="h-3 bg-stone-800 rounded w-4/5 mb-1.5" />
              <div className="h-2.5 bg-stone-800 rounded w-1/3" />
            </div>
          ))}
        </div>
      )}

      {error && !loading && (
        <p className="text-xs text-stone-600 py-4 text-center">{error}</p>
      )}

      {!loading && !error && articles.length === 0 && (
        <p className="text-xs text-stone-600 py-4 text-center">No recent news found for {ticker}</p>
      )}

      <div className="space-y-3">
        {articles.map((a, i) => (
          <a
            key={i}
            href={a.link}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-start gap-3 group hover:bg-stone-800/50 rounded-lg p-2 -mx-2 transition-colors"
          >
            <div className="flex-1 min-w-0">
              <p className="text-sm text-stone-300 group-hover:text-stone-100 transition-colors line-clamp-2 leading-snug">
                {a.title}
              </p>
              <div className="flex items-center gap-2 mt-1">
                {a.source && <span className="text-[11px] text-stone-500 truncate max-w-[120px]">{a.source}</span>}
                {a.source && a.pubDate && <span className="text-stone-700">·</span>}
                {a.pubDate && (
                  <span className="flex items-center gap-1 text-[11px] text-stone-600">
                    <Clock className="h-2.5 w-2.5" />
                    {timeAgo(a.pubDate)}
                  </span>
                )}
              </div>
            </div>
            <ExternalLink className="h-3.5 w-3.5 text-stone-600 group-hover:text-amber-400 transition-colors shrink-0 mt-0.5" />
          </a>
        ))}
      </div>
    </div>
  );
}
