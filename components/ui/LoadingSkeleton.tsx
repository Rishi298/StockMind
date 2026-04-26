'use client';

import clsx from 'clsx';

interface SkeletonProps {
  className?: string;
  style?: React.CSSProperties;
}

export function Skeleton({ className, style }: SkeletonProps) {
  return (
    <div
      className={clsx(
        'animate-pulse rounded bg-stone-800',
        className
      )}
      style={style}
    />
  );
}

export function ScreenerRowSkeleton() {
  return (
    <tr className="border-b border-stone-800">
      {Array.from({ length: 9 }).map((_, i) => (
        <td key={i} className="px-4 py-3">
          <Skeleton className="h-4 w-full" />
        </td>
      ))}
    </tr>
  );
}

export function CardSkeleton({ lines = 3 }: { lines?: number }) {
  return (
    <div className="rounded-xl border border-stone-800 bg-stone-900 p-6 space-y-3">
      <Skeleton className="h-5 w-1/3" />
      {Array.from({ length: lines }).map((_, i) => (
        <Skeleton key={i} className="h-3 w-full" style={{ width: `${70 + Math.random() * 30}%` }} />
      ))}
    </div>
  );
}

export function HeroSkeleton() {
  return (
    <div className="bg-stone-900 border-b border-stone-800 px-6 py-8">
      <div className="max-w-7xl mx-auto">
        <div className="flex items-start justify-between">
          <div className="space-y-3">
            <Skeleton className="h-8 w-48" />
            <Skeleton className="h-5 w-72" />
            <Skeleton className="h-12 w-32" />
          </div>
          <div className="space-y-2 text-right">
            <Skeleton className="h-4 w-24 ml-auto" />
            <Skeleton className="h-4 w-32 ml-auto" />
            <Skeleton className="h-4 w-28 ml-auto" />
          </div>
        </div>
      </div>
    </div>
  );
}

export function ChartSkeleton() {
  return (
    <div className="rounded-xl border border-stone-800 bg-stone-900 p-6">
      <Skeleton className="h-5 w-32 mb-4" />
      <Skeleton className="h-64 w-full" />
    </div>
  );
}
