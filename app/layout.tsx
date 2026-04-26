import type { Metadata, Viewport } from 'next';
import './globals.css';
import Link from 'next/link';
import { Activity } from 'lucide-react';
import { ClerkProvider } from '@clerk/nextjs';
import { NavbarAuthButtons } from '@/components/NavbarAuthButtons';

export const metadata: Metadata = {
  title: 'StockMind Terminal — NSE Screener & Deep Analysis',
  description: 'AI-powered stock screener for Indian equities. Fundamental, technical, moat, and growth analysis for NSE-listed companies.',
  keywords: 'NSE screener, Indian stocks, stock analysis, Nifty 50, fundamental analysis, technical analysis',
  manifest: '/manifest.json',
  appleWebApp: { capable: true, statusBarStyle: 'black-translucent', title: 'StockMind' },
};

export const viewport: Viewport = {
  themeColor: '#f59e0b',
};

function Navbar() {
  return (
    <nav className="sticky top-0 z-40 border-b border-stone-800 bg-stone-950/95 backdrop-blur-md">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-14">
          <Link href="/" className="flex items-center gap-2.5 group">
            <div className="h-7 w-7 rounded-lg bg-amber-500/15 border border-amber-500/30 flex items-center justify-center group-hover:bg-amber-500/25 transition-colors">
              <Activity className="h-4 w-4 text-amber-400" />
            </div>
            <span className="font-serif font-bold text-stone-100 tracking-tight">StockMind Terminal</span>
            <span className="text-[10px] text-stone-600 border border-stone-700 px-1.5 py-0.5 rounded font-mono hidden sm:block">NSE</span>
          </Link>

          <div className="flex items-center gap-4">
            <Link href="/" className="text-xs text-stone-400 hover:text-stone-200 transition-colors hidden sm:block">Screener</Link>
            <NavbarAuthButtons />
          </div>
        </div>
      </div>
    </nav>
  );
}

function Footer() {
  return (
    <footer className="border-t border-stone-800 mt-16">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <Activity className="h-4 w-4 text-amber-400" />
            <span className="font-serif text-stone-400 text-sm">StockMind Terminal</span>
          </div>
          <p className="text-xs text-stone-600 max-w-xl">
            <span className="text-amber-500 font-semibold">⚠ Educational research only.</span>{' '}
            Not investment advice. Data from Angel One SmartAPI & Yahoo Finance.
            Consult a SEBI-registered investment advisor before making any investment decisions.
          </p>
        </div>
        <div className="mt-4 pt-4 border-t border-stone-900 flex flex-wrap gap-4 text-[10px] text-stone-700">
          <span>Prices: Angel One SmartAPI (real-time NSE)</span>
          <span>Fundamentals: Yahoo Finance</span>
          <span>MF NAV: MFAPI.in</span>
          <span>© {new Date().getFullYear()} StockMind Terminal</span>
        </div>
      </div>
    </footer>
  );
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <ClerkProvider>
    <html lang="en" className="dark">
      <head>
        <meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover" />
        <link rel="apple-touch-icon" href="/icon-192.png" />
        <script dangerouslySetInnerHTML={{ __html: `if ('serviceWorker' in navigator) navigator.serviceWorker.register('/sw.js');` }} />
      </head>
      <body className="min-h-screen bg-stone-950 text-stone-100 antialiased">
        <Navbar />
        <main className="min-h-[calc(100vh-56px)]">
          {children}
        </main>
        <Footer />
      </body>
    </html>
    </ClerkProvider>
  );
}
