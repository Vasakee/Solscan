import React, { useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { decodeSharePayload } from '../utils/share';
import type { SharePayload } from '../utils/share';
import { CURRENCIES } from '../context/CurrencyContext';
import type { Currency } from '../context/CurrencyContext';

function fmtCurrency(value: number, currency: string, decimals?: number): string {
  const cur = (CURRENCIES[currency as Currency] ?? CURRENCIES.usd);
  const fractionDigits = decimals ?? (currency === 'jpy' ? 0 : 2);
  return new Intl.NumberFormat(cur.locale, {
    style: 'currency',
    currency: cur.label,
    minimumFractionDigits: fractionDigits,
    maximumFractionDigits: fractionDigits,
  }).format(value);
}

function StatBox({ label, value, color = 'text-white' }: { label: string; value: string; color?: string }) {
  return (
    <div className="bg-sol-surface border border-sol-border rounded-xl p-4">
      <div className="text-gray-500 text-xs uppercase tracking-wider mb-1">{label}</div>
      <div className={`font-num text-xl font-bold ${color}`}>{value}</div>
    </div>
  );
}

function CopyButton({ url }: { url: string }) {
  const [copied, setCopied] = useState(false);
  const copy = async () => {
    await navigator.clipboard.writeText(url);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };
  return (
    <button
      onClick={copy}
      className="flex items-center gap-2 bg-sol-purple hover:bg-violet-600 text-white text-sm font-semibold px-4 py-2 rounded-lg transition-colors"
    >
      {copied ? (
        <>
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
          </svg>
          Copied!
        </>
      ) : (
        <>
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
          </svg>
          Copy Link
        </>
      )}
    </button>
  );
}

export default function SharePage() {
  const [params] = useSearchParams();
  const encoded = params.get('data');
  const payload: SharePayload | null = encoded ? decodeSharePayload(encoded) : null;

  const pageUrl = window.location.href;
  const shortAddr = payload
    ? `${payload.w.slice(0, 4)}…${payload.w.slice(-4)}`
    : null;

  const snapshotDate = payload
    ? new Date(payload.ts * 1000).toLocaleString('en-US', { dateStyle: 'medium', timeStyle: 'short' })
    : null;

  // Inject OG meta tags dynamically (works for Discord/Telegram; Twitter requires SSR)
  useEffect(() => {
    if (!payload) return;

    const title = `SolScan — ${shortAddr} Portfolio`;
    const description = `Portfolio: ${fmtCurrency(payload.t, payload.cur ?? 'usd')} · Net PnL: ${payload.pnl >= 0 ? '+' : ''}${fmtCurrency(Math.abs(payload.pnl), payload.cur ?? 'usd')} · ${payload.swaps} swaps`;

    document.title = title;

    const setMeta = (property: string, content: string) => {
      let el = document.querySelector<HTMLMetaElement>(`meta[property="${property}"]`);
      if (!el) {
        el = document.createElement('meta');
        el.setAttribute('property', property);
        document.head.appendChild(el);
      }
      el.setAttribute('content', content);
    };

    setMeta('og:title', title);
    setMeta('og:description', description);
    setMeta('og:url', pageUrl);
    setMeta('og:type', 'website');
    setMeta('og:site_name', 'SolScan');

    // Twitter card
    let twitterCard = document.querySelector<HTMLMetaElement>('meta[name="twitter:card"]');
    if (!twitterCard) {
      twitterCard = document.createElement('meta');
      twitterCard.setAttribute('name', 'twitter:card');
      document.head.appendChild(twitterCard);
    }
    twitterCard.setAttribute('content', 'summary');
  }, [payload, pageUrl, shortAddr]);

  if (!encoded) {
    return (
      <div className="min-h-screen bg-sol-bg flex items-center justify-center text-gray-500 text-sm">
        No portfolio data in URL.
      </div>
    );
  }

  if (!payload) {
    return (
      <div className="min-h-screen bg-sol-bg flex items-center justify-center text-red-400 text-sm">
        Invalid or corrupted share link.
      </div>
    );
  }

  const pnlUp = payload.pnl >= 0;

  return (
    <div className="min-h-screen bg-sol-bg text-white">
      {/* Header */}
      <header className="border-b border-sol-border bg-sol-bg/90 backdrop-blur-sm">
        <div className="max-w-2xl mx-auto px-4 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-sol-purple to-sol-teal flex items-center justify-center">
              <svg viewBox="0 0 24 24" className="w-5 h-5" fill="none">
                <path d="M4 18h16M4 12h12M4 6h16" stroke="white" strokeWidth="2.5" strokeLinecap="round" />
              </svg>
            </div>
            <span className="font-bold text-lg tracking-tight">SolScan</span>
            <span className="text-xs text-gray-500 font-mono hidden sm:inline">shared portfolio</span>
          </div>
          <CopyButton url={pageUrl} />
        </div>
      </header>

      <main className="max-w-2xl mx-auto px-4 py-8 space-y-6">
        {/* Wallet identity */}
        <div className="bg-sol-card border border-sol-border rounded-2xl p-5">
          <div className="text-gray-500 text-xs uppercase tracking-wider mb-1">Wallet</div>
          <div className="font-num text-sm text-sol-purple break-all">{payload.w}</div>
          {snapshotDate && (
            <div className="text-gray-600 text-xs mt-2">Snapshot taken {snapshotDate}</div>
          )}
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 gap-3">
          <StatBox
            label="Total Value"
            value={fmtCurrency(payload.t, payload.cur ?? 'usd')}
          />
          <StatBox
            label="SOL Balance"
            value={`${payload.s.toLocaleString('en-US', { maximumFractionDigits: 4 })} SOL`}
          />
          <StatBox
            label="Net PnL"
            value={`${pnlUp ? '+' : '-'}${fmtCurrency(Math.abs(payload.pnl), payload.cur ?? 'usd')}`}
            color={pnlUp ? 'text-sol-teal' : 'text-red-400'}
          />
          <StatBox
            label="Swaps"
            value={payload.swaps.toString()}
            color="text-violet-300"
          />
        </div>

        {/* Token list */}
        {payload.tk.length > 0 && (
          <div className="bg-sol-card border border-sol-border rounded-2xl overflow-hidden">
            <div className="px-5 py-4 border-b border-sol-border">
              <span className="text-white font-semibold text-sm">Token Holdings</span>
            </div>
            <div className="divide-y divide-sol-border/60">
              {payload.tk.map((t) => (
                <div key={t.sym} className="flex items-center justify-between px-5 py-3">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-full bg-sol-border flex items-center justify-center">
                      <span className="text-gray-400 text-xs font-bold">{t.sym.slice(0, 2)}</span>
                    </div>
                    <span className="text-white text-sm font-medium">{t.sym}</span>
                  </div>
                  <div className="text-right">
                    <div className="font-num text-sm text-white">
                      {t.bal.toLocaleString('en-US', { maximumFractionDigits: 4 })}
                    </div>
                    {t.usd > 0 && (
                      <div className="font-num text-xs text-gray-400">
                        {fmtCurrency(t.usd, payload.cur ?? 'usd')}
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* CTA */}
        <div className="text-center py-4">
          <a
            href="/"
            className="inline-flex items-center gap-2 text-sol-purple hover:text-violet-300 text-sm transition-colors"
          >
            View your own portfolio on SolScan →
          </a>
        </div>
      </main>
    </div>
  );
}
