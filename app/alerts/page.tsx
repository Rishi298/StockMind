'use client';

import { useState, useEffect } from 'react';
import { Bell, Trash2, CheckCheck, TrendingDown, RotateCcw, Activity, AlertTriangle } from 'lucide-react';

interface Alert {
  id: number;
  type: string;
  title: string;
  message: string;
  severity: string;
  isRead: boolean;
  relatedSymbol: string;
  createdAt: string;
}

const TYPE_ICON: Record<string, React.ReactNode> = {
  STOP_LOSS_BREACH: <TrendingDown className="h-4 w-4 text-red-400" />,
  MF_UNDERPERFORM: <TrendingDown className="h-4 w-4 text-amber-400" />,
  REBALANCE_DUE: <RotateCcw className="h-4 w-4 text-amber-400" />,
  NEW_52W_HIGH: <Activity className="h-4 w-4 text-emerald-400" />,
  PRICE_TARGET_HIT: <Activity className="h-4 w-4 text-blue-400" />,
  NAV_DROP: <TrendingDown className="h-4 w-4 text-red-400" />,
};

const SEVERITY_COLOR: Record<string, string> = {
  high: 'border-red-500/30 bg-red-500/5',
  medium: 'border-amber-500/20 bg-amber-500/5',
  low: 'border-stone-700 bg-stone-900/50',
};

function timeAgo(dateStr: string) {
  const ms = Date.now() - new Date(dateStr).getTime();
  const h = Math.floor(ms / 3600000);
  const m = Math.floor(ms / 60000);
  if (h > 48) return `${Math.floor(h / 24)}d ago`;
  if (h > 0) return `${h}h ago`;
  if (m > 0) return `${m}m ago`;
  return 'just now';
}

export default function AlertsPage() {
  const [alerts, setAlerts] = useState<Alert[]>([]);
  const [unread, setUnread] = useState(0);
  const [filter, setFilter] = useState<'all' | 'unread'>('all');
  const [loading, setLoading] = useState(true);
  const [sendingDigest, setSendingDigest] = useState(false);
  const [digestMsg, setDigestMsg] = useState('');

  async function load() {
    setLoading(true);
    try {
      const res = await fetch('/api/alerts?limit=100');
      const data = await res.json() as { alerts: Alert[]; unreadCount: number };
      setAlerts(data.alerts ?? []);
      setUnread(data.unreadCount ?? 0);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { load(); }, []);

  async function markAllRead() {
    await fetch('/api/alerts', { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ action: 'markAllRead' }) });
    load();
  }

  async function deleteAlert(id: number) {
    await fetch(`/api/alerts?id=${id}`, { method: 'DELETE' });
    setAlerts((prev) => prev.filter((a) => a.id !== id));
  }

  async function sendDigest() {
    setSendingDigest(true);
    setDigestMsg('');
    try {
      const res = await fetch('/api/email/digest', { method: 'POST' });
      const d = await res.json() as { ok?: boolean; error?: string };
      setDigestMsg(d.ok ? 'Email sent successfully!' : (d.error ?? 'Failed'));
    } finally {
      setSendingDigest(false);
    }
  }

  const displayed = filter === 'unread' ? alerts.filter((a) => !a.isRead) : alerts;

  return (
    <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <div className="h-9 w-9 rounded-xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center">
            <Bell className="h-4 w-4 text-amber-400" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-stone-100">Alerts</h1>
            <p className="text-xs text-stone-500">{unread} unread</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={sendDigest}
            disabled={sendingDigest}
            className="text-xs text-stone-400 hover:text-stone-200 border border-stone-700 rounded-lg px-3 py-1.5 disabled:opacity-50"
          >
            {sendingDigest ? 'Sending...' : 'Email Digest'}
          </button>
          {unread > 0 && (
            <button onClick={markAllRead} className="flex items-center gap-1.5 text-xs text-stone-400 hover:text-stone-200 border border-stone-700 rounded-lg px-3 py-1.5">
              <CheckCheck className="h-3.5 w-3.5" /> Mark all read
            </button>
          )}
        </div>
      </div>

      {digestMsg && (
        <div className={`mb-4 text-xs rounded-lg px-4 py-3 ${digestMsg.includes('success') ? 'text-emerald-400 bg-emerald-500/10 border border-emerald-500/20' : 'text-red-400 bg-red-500/10 border border-red-500/20'}`}>
          {digestMsg}
        </div>
      )}

      <div className="flex gap-2 mb-5">
        {(['all', 'unread'] as const).map((f) => (
          <button
            key={f}
            onClick={() => setFilter(f)}
            className={`text-xs px-3 py-1.5 rounded-lg border transition-colors ${filter === f ? 'border-amber-500 text-amber-400 bg-amber-500/10' : 'border-stone-700 text-stone-500 hover:text-stone-300'}`}
          >
            {f === 'all' ? 'All' : `Unread (${unread})`}
          </button>
        ))}
      </div>

      {loading && (
        <div className="space-y-3">
          {[1,2,3].map((i) => <div key={i} className="h-20 bg-stone-900 border border-stone-800 rounded-xl animate-pulse" />)}
        </div>
      )}

      {!loading && displayed.length === 0 && (
        <div className="text-center py-16 text-stone-500">
          <AlertTriangle className="h-10 w-10 mx-auto mb-3 opacity-20" />
          <p className="text-sm">No {filter === 'unread' ? 'unread ' : ''}alerts</p>
        </div>
      )}

      <div className="space-y-3">
        {displayed.map((a) => (
          <div
            key={a.id}
            className={`border rounded-xl p-4 ${SEVERITY_COLOR[a.severity] ?? SEVERITY_COLOR.low} ${!a.isRead ? 'ring-1 ring-stone-700' : 'opacity-80'}`}
          >
            <div className="flex items-start gap-3">
              <div className="mt-0.5 shrink-0">{TYPE_ICON[a.type] ?? <Bell className="h-4 w-4 text-stone-500" />}</div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1">
                  <p className="text-sm font-semibold text-stone-200">{a.title}</p>
                  {!a.isRead && <span className="h-1.5 w-1.5 rounded-full bg-red-400 shrink-0" />}
                  <span className={`text-[10px] font-bold uppercase rounded px-1.5 py-0.5 ml-auto ${a.severity === 'high' ? 'text-red-400 bg-red-500/10' : a.severity === 'medium' ? 'text-amber-400 bg-amber-500/10' : 'text-stone-500 bg-stone-800'}`}>
                    {a.severity}
                  </span>
                </div>
                <p className="text-xs text-stone-400 mb-1">{a.message}</p>
                <p className="text-[11px] text-stone-600">{timeAgo(a.createdAt)}</p>
              </div>
              <button onClick={() => deleteAlert(a.id)} className="text-stone-700 hover:text-red-400 transition-colors shrink-0 mt-0.5">
                <Trash2 className="h-4 w-4" />
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
