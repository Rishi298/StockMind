'use client';

import { useState } from 'react';
import { RefreshCw, CheckCircle, AlertCircle, KeyRound, Activity, ChevronDown, ChevronUp, Zap } from 'lucide-react';

interface ResolveResult {
  resolved: number;
  cached: number;
  total: number;
  failed: string[];
  message: string;
}

export function AngelOnePanel({ onSynced }: { onSynced: () => void }) {
  const [resolving, setResolving] = useState(false);
  const [resolveResult, setResolveResult] = useState<ResolveResult | null>(null);
  const [resolveError, setResolveError] = useState('');

  const [showLogin, setShowLogin] = useState(false);
  const [clientCode, setClientCode] = useState('');
  const [pin, setPin] = useState('');
  const [totp, setTotp] = useState('');
  const [logging, setLogging] = useState(false);
  const [loginMsg, setLoginMsg] = useState('');
  const [loginOk, setLoginOk] = useState(false);

  async function handleResolveTokens() {
    setResolving(true);
    setResolveError('');
    setResolveResult(null);
    try {
      const res = await fetch('/api/angel-one/resolve-tokens', { method: 'POST' });
      const data = await res.json() as ResolveResult & { error?: string };
      if (!res.ok) throw new Error(data.error ?? 'Failed');
      setResolveResult(data);
      onSynced(); // refresh portfolio overview with Angel One prices
    } catch (e) {
      setResolveError(e instanceof Error ? e.message : 'Failed to resolve tokens');
    } finally {
      setResolving(false);
    }
  }

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault();
    setLogging(true);
    setLoginMsg('');
    setLoginOk(false);
    try {
      const res = await fetch('/api/angel-one/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ clientCode, pin, totp }),
      });
      const data = await res.json() as { ok?: boolean; message?: string; error?: string };
      if (!res.ok) throw new Error(data.error ?? 'Login failed');
      setLoginOk(true);
      setLoginMsg(data.message ?? 'Session refreshed');
      setTotp('');
      setShowLogin(false);
    } catch (e) {
      setLoginMsg(e instanceof Error ? e.message : 'Login failed');
    } finally {
      setLogging(false);
    }
  }

  return (
    <div className="bg-stone-900 border border-stone-800 rounded-xl p-4">
      <div className="flex items-center gap-2 mb-3">
        <div className="h-6 w-6 rounded bg-orange-500/15 border border-orange-500/30 flex items-center justify-center">
          <Activity className="h-3.5 w-3.5 text-orange-400" />
        </div>
        <h3 className="text-sm font-semibold text-stone-300">Angel One</h3>
        <span className="text-[10px] text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 rounded px-1.5 py-0.5 font-semibold ml-auto">
          Live Prices
        </span>
      </div>

      <p className="text-xs text-stone-500 mb-3">
        Use Angel One SmartAPI for real-time NSE prices on all your holdings — covers SME stocks that Yahoo Finance doesn&apos;t serve.
      </p>

      <div className="flex flex-wrap gap-2 mb-3">
        <button
          onClick={handleResolveTokens}
          disabled={resolving}
          className="flex items-center gap-1.5 px-3 py-1.5 bg-orange-500 hover:bg-orange-400 text-stone-950 font-semibold text-xs rounded-lg disabled:opacity-60"
        >
          {resolving
            ? <RefreshCw className="h-3.5 w-3.5 animate-spin" />
            : <Zap className="h-3.5 w-3.5" />}
          {resolving ? 'Fetching prices...' : 'Enable Angel One Prices'}
        </button>
        <button
          onClick={() => setShowLogin((v) => !v)}
          className="flex items-center gap-1 px-3 py-1.5 text-xs text-stone-400 hover:text-stone-200 border border-stone-700 rounded-lg"
        >
          <KeyRound className="h-3.5 w-3.5" />
          Refresh Token
          {showLogin ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />}
        </button>
      </div>

      {resolveResult && (
        <div className="mb-3 bg-emerald-500/10 border border-emerald-500/20 rounded-lg px-3 py-2.5 text-xs">
          <div className="flex items-center gap-1.5 text-emerald-400 font-semibold mb-1">
            <CheckCircle className="h-3.5 w-3.5" /> {resolveResult.message}
          </div>
          <p className="text-stone-500">
            {resolveResult.cached}/{resolveResult.total} stocks now using Angel One live prices.
            {resolveResult.failed.length > 0 && (
              <span className="text-amber-500"> Couldn&apos;t resolve: {resolveResult.failed.join(', ')}</span>
            )}
          </p>
        </div>
      )}

      {resolveError && (
        <div className="mb-3 flex items-start gap-2 text-xs text-red-400 bg-red-500/10 border border-red-500/20 rounded-lg px-3 py-2">
          <AlertCircle className="h-3.5 w-3.5 shrink-0 mt-0.5" />
          <span>{resolveError}</span>
        </div>
      )}

      {showLogin && (
        <form onSubmit={handleLogin} className="border border-stone-700 rounded-xl p-4 space-y-3 bg-stone-950/50">
          <p className="text-xs font-medium text-stone-400">Refresh Angel One session token</p>
          <p className="text-[11px] text-stone-600">
            Token expires daily. Enter your Angel One credentials to generate a fresh session.
          </p>
          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className="text-[10px] text-stone-500 mb-1 block">Client Code</label>
              <input
                value={clientCode}
                onChange={(e) => setClientCode(e.target.value)}
                placeholder="e.g. A12345"
                required
                className="w-full bg-stone-800 border border-stone-700 rounded-lg px-3 py-1.5 text-xs text-stone-200 focus:outline-none focus:border-orange-500"
              />
            </div>
            <div>
              <label className="text-[10px] text-stone-500 mb-1 block">PIN</label>
              <input
                type="password"
                value={pin}
                onChange={(e) => setPin(e.target.value)}
                placeholder="Angel One PIN"
                required
                className="w-full bg-stone-800 border border-stone-700 rounded-lg px-3 py-1.5 text-xs text-stone-200 focus:outline-none focus:border-orange-500"
              />
            </div>
          </div>
          <div>
            <label className="text-[10px] text-stone-500 mb-1 block">TOTP (6 digits from authenticator)</label>
            <input
              value={totp}
              onChange={(e) => setTotp(e.target.value.replace(/\D/g, '').slice(0, 6))}
              placeholder="000000"
              maxLength={6}
              required
              className="w-full bg-stone-800 border border-stone-700 rounded-lg px-3 py-1.5 text-xs text-stone-200 font-mono tracking-widest focus:outline-none focus:border-orange-500"
            />
          </div>
          {loginMsg && (
            <p className={`text-xs ${loginOk ? 'text-emerald-400' : 'text-red-400'}`}>{loginMsg}</p>
          )}
          <button
            type="submit"
            disabled={logging || totp.length !== 6}
            className="w-full bg-orange-500 hover:bg-orange-400 text-stone-950 font-semibold text-xs rounded-lg py-1.5 disabled:opacity-50"
          >
            {logging ? 'Generating token...' : 'Generate New Session Token'}
          </button>
        </form>
      )}
    </div>
  );
}
