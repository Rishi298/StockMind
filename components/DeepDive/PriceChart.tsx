'use client';

import { useState, useEffect, useRef } from 'react';
import {
  createChart,
  ColorType,
  CrosshairMode,
  CandlestickSeries,
  HistogramSeries,
  LineSeries,
  type IChartApi,
  type ISeriesApi,
  type SeriesType,
  type Time,
} from 'lightweight-charts';
import type { HistoryBar } from '@/lib/yahoo';
import clsx from 'clsx';

function rollingDMA(closes: number[], period: number): number[] {
  return closes.map((_, i) => {
    if (i + 1 < period) return 0;
    const slice = closes.slice(i + 1 - period, i + 1);
    return +(slice.reduce((a, b) => a + b, 0) / period).toFixed(2);
  });
}

const PERIODS = ['1mo', '3mo', '6mo', '1y'] as const;
type Period = (typeof PERIODS)[number];

interface Props {
  bars: HistoryBar[];
  ticker: string;
  currentPrice: number;
  stopLoss?: number;
  target1?: number;
}

function filterByPeriod(bars: HistoryBar[], period: Period): HistoryBar[] {
  const daysMap: Record<Period, number> = { '1mo': 30, '3mo': 90, '6mo': 180, '1y': 365 };
  const cutoff = new Date();
  cutoff.setDate(cutoff.getDate() - daysMap[period]);
  return bars.filter((b) => new Date(b.date) >= cutoff);
}

function toTime(date: Date | string): Time {
  const d = new Date(date);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}` as Time;
}

export default function PriceChart({ bars, ticker, currentPrice, stopLoss, target1 }: Props) {
  const [period, setPeriod] = useState<Period>('1y');
  const [showDMA, setShowDMA] = useState(true);
  const chartRef     = useRef<HTMLDivElement>(null);
  const chartApiRef  = useRef<IChartApi | null>(null);
  const candleRef    = useRef<ISeriesApi<SeriesType> | null>(null);
  const volumeRef    = useRef<ISeriesApi<SeriesType> | null>(null);
  const dma50Ref     = useRef<ISeriesApi<SeriesType> | null>(null);
  const dma200Ref    = useRef<ISeriesApi<SeriesType> | null>(null);

  useEffect(() => {
    if (!chartRef.current) return;

    const chart = createChart(chartRef.current, {
      layout: { background: { type: ColorType.Solid, color: '#1c1917' }, textColor: '#a8a29e' },
      grid: { vertLines: { color: '#292524' }, horzLines: { color: '#292524' } },
      crosshair: { mode: CrosshairMode.Normal },
      rightPriceScale: { borderColor: '#44403c', scaleMargins: { top: 0.1, bottom: 0.3 } },
      timeScale: { borderColor: '#44403c', timeVisible: true, secondsVisible: false },
      width: chartRef.current.clientWidth,
      height: 420,
    });

    candleRef.current = chart.addSeries(CandlestickSeries, {
      upColor: '#22c55e', downColor: '#ef4444',
      borderUpColor: '#22c55e', borderDownColor: '#ef4444',
      wickUpColor: '#22c55e', wickDownColor: '#ef4444',
    });

    volumeRef.current = chart.addSeries(HistogramSeries, {
      color: '#f59e0b', priceFormat: { type: 'volume' }, priceScaleId: 'volume',
    });
    chart.priceScale('volume').applyOptions({ scaleMargins: { top: 0.8, bottom: 0 } });

    dma50Ref.current  = chart.addSeries(LineSeries, { color: '#f59e0b', lineWidth: 1, title: '50 DMA' });
    dma200Ref.current = chart.addSeries(LineSeries, { color: '#60a5fa', lineWidth: 1, title: '200 DMA' });

    chartApiRef.current = chart;

    const resizer = new ResizeObserver(() => {
      if (chartRef.current) chart.applyOptions({ width: chartRef.current.clientWidth });
    });
    resizer.observe(chartRef.current);

    return () => { resizer.disconnect(); chart.remove(); chartApiRef.current = null; };
  }, []);

  useEffect(() => {
    if (!chartApiRef.current || !candleRef.current || !volumeRef.current) return;

    const filtered = filterByPeriod(bars, period)
      .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
    if (!filtered.length) return;

    const candleData = filtered.map((b) => ({
      time: toTime(b.date), open: b.open, high: b.high, low: b.low, close: b.close,
    }));
    const volumeData = filtered.map((b) => ({
      time: toTime(b.date), value: b.volume,
      color: b.close >= b.open ? '#22c55e40' : '#ef444440',
    }));

    const closes = filtered.map((b) => b.close);
    const dma50arr  = rollingDMA(closes, 50);
    const dma200arr = rollingDMA(closes, 200);
    const dma50Data  = dma50arr.map((v, i) => ({ time: toTime(filtered[i].date), value: v })).filter((d) => d.value > 0);
    const dma200Data = dma200arr.map((v, i) => ({ time: toTime(filtered[i].date), value: v })).filter((d) => d.value > 0);

    candleRef.current.setData(candleData);
    volumeRef.current.setData(volumeData);
    dma50Ref.current?.setData(dma50Data);
    dma200Ref.current?.setData(dma200Data);
    dma50Ref.current?.applyOptions({ visible: showDMA });
    dma200Ref.current?.applyOptions({ visible: showDMA });

    if (stopLoss && stopLoss > 0) candleRef.current.createPriceLine({ price: stopLoss, color: '#ef4444', lineWidth: 1, lineStyle: 2, title: 'Stop' });
    if (target1  && target1  > 0) candleRef.current.createPriceLine({ price: target1,  color: '#22c55e', lineWidth: 1, lineStyle: 2, title: 'Target' });

    chartApiRef.current.timeScale().fitContent();
  }, [bars, period, stopLoss, target1, showDMA]);

  useEffect(() => {
    dma50Ref.current?.applyOptions({ visible: showDMA });
    dma200Ref.current?.applyOptions({ visible: showDMA });
  }, [showDMA]);

  return (
    <div className="bg-stone-900 border border-stone-800 rounded-2xl p-5">
      <div className="flex items-center justify-between mb-4 flex-wrap gap-2">
        <div>
          <h2 className="font-serif text-lg font-semibold text-stone-200">{ticker} — Price Chart</h2>
          <p className="text-xs text-stone-500 mt-0.5">OHLCV candlestick · Angel One / Yahoo Finance</p>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          <button onClick={() => setShowDMA((v) => !v)} className={clsx('text-xs px-2.5 py-1 rounded-lg border transition-all', showDMA ? 'border-amber-500 text-amber-400 bg-amber-500/10' : 'border-stone-700 text-stone-500')}>
            DMA 50/200
          </button>
          {PERIODS.map((p) => (
            <button key={p} onClick={() => setPeriod(p)} className={clsx('text-xs px-2.5 py-1 rounded-lg border transition-all', period === p ? 'border-amber-500 text-amber-400 bg-amber-500/10' : 'border-stone-700 text-stone-500 hover:border-stone-600')}>
              {p}
            </button>
          ))}
        </div>
      </div>

      <div className="flex items-center gap-4 text-[11px] text-stone-600 mb-3 flex-wrap">
        <span className="flex items-center gap-1.5"><span className="h-2.5 w-2.5 rounded-sm bg-emerald-500 inline-block" />Bullish</span>
        <span className="flex items-center gap-1.5"><span className="h-2.5 w-2.5 rounded-sm bg-red-500 inline-block" />Bearish</span>
        {showDMA && <><span className="flex items-center gap-1.5"><span className="h-0.5 w-5 bg-amber-400 inline-block" />50 DMA</span><span className="flex items-center gap-1.5"><span className="h-0.5 w-5 bg-blue-400 inline-block" />200 DMA</span></>}
        {stopLoss && stopLoss > 0 && <span className="flex items-center gap-1.5"><span className="h-0.5 w-5 bg-red-500 inline-block" />Stop ₹{stopLoss.toFixed(0)}</span>}
        {target1 && target1 > 0 && <span className="flex items-center gap-1.5"><span className="h-0.5 w-5 bg-emerald-500 inline-block" />Target ₹{target1.toFixed(0)}</span>}
      </div>

      <div ref={chartRef} className="w-full" />
    </div>
  );
}
