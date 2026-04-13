import React, { useState, useMemo } from 'react';

const CATEGORY_STYLES = {
  Swap:     { pill: 'badge-swap',     icon: '⇄' },
  Transfer: { pill: 'badge-transfer', icon: '↑' },
  NFT:      { pill: 'badge-nft',      icon: '◈' },
  DeFi:     { pill: 'badge-defi',     icon: '⬡' },
  Failed:   { pill: 'badge-failed',   icon: '✕' },
  Unknown:  { pill: 'badge-unknown',  icon: '?' },
};

function Skeleton({ className }) {
  return <div className={`skeleton rounded ${className}`} />;
}

function TxRow({ tx, onSimulate }) {
  const [expanded, setExpanded] = useState(false);
  const style = CATEGORY_STYLES[tx.category] || CATEGORY_STYLES.Unknown;

  const timeStr = tx.blockTime
    ? tx.blockTime.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })
    : '—';
  const dateStr = tx.blockTime
    ? tx.blockTime.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
    : '—';

  const solDeltaStr = tx.solDelta !== 0
    ? `${tx.solDelta > 0 ? '+' : ''}${tx.solDelta.toFixed(6)} SOL`
    : null;

  const isFailed = tx.category === 'Failed';

  return (
    <div className={`border-b border-sol-border/60 last:border-0 transition-colors ${isFailed ? 'bg-red-900/5' : ''}`}>
      {/* Main row */}
      <div
        className="flex items-center gap-3 px-4 py-3 cursor-pointer hover:bg-sol-surface/40 transition-colors"
        onClick={() => setExpanded(!expanded)}
      >
        {/* Icon */}
        <div className={`w-8 h-8 rounded-lg flex items-center justify-center text-sm flex-shrink-0 ${
          isFailed ? 'bg-red-900/40 text-red-400' : 'bg-sol-surface text-gray-300'
        }`}>
          {style.icon}
        </div>

        {/* Center */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${style.pill}`}>
              {tx.category}
            </span>
          </div>
          <div className="font-num text-xs text-gray-500 mt-0.5 truncate">
            {tx.signature.slice(0, 16)}…
          </div>
        </div>

        {/* Right side */}
        <div className="text-right flex-shrink-0">
          {solDeltaStr && (
            <div className={`font-num text-xs font-medium ${tx.solDelta > 0 ? 'text-sol-teal' : 'text-red-400'}`}>
              {solDeltaStr}
            </div>
          )}
          <div className="text-gray-500 text-xs">{dateStr}</div>
          <div className="text-gray-600 text-xs">{timeStr}</div>
        </div>

        {/* Expand chevron */}
        <svg
          className={`w-4 h-4 text-gray-600 flex-shrink-0 transition-transform ${expanded ? 'rotate-180' : ''}`}
          fill="none" viewBox="0 0 24 24" stroke="currentColor"
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </div>

      {/* Expanded details */}
      {expanded && (
        <div className="px-4 pb-4 bg-sol-surface/20">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-3">
            {/* Signature */}
            <div>
              <div className="text-gray-600 text-xs uppercase tracking-wider mb-1">Signature</div>
              <a
                href={`https://solscan.io/tx/${tx.signature}`}
                target="_blank"
                rel="noopener noreferrer"
                className="font-num text-xs text-sol-purple hover:text-violet-300 break-all transition-colors"
                onClick={(e) => e.stopPropagation()}
              >
                {tx.signature}
              </a>
            </div>

            {/* Fee */}
            <div>
              <div className="text-gray-600 text-xs uppercase tracking-wider mb-1">Network Fee</div>
              <div className="font-num text-xs text-gray-400">{tx.fee.toFixed(6)} SOL</div>
            </div>

            {/* Token deltas */}
            {tx.tokenDeltas.length > 0 && (
              <div className="sm:col-span-2">
                <div className="text-gray-600 text-xs uppercase tracking-wider mb-1">Token Changes</div>
                <div className="flex flex-wrap gap-2">
                  {tx.tokenDeltas.map((d, i) => (
                    <span
                      key={i}
                      className={`font-num text-xs px-2 py-1 rounded-md ${
                        d.delta > 0 ? 'bg-teal-900/30 text-teal-300' : 'bg-red-900/30 text-red-300'
                      }`}
                    >
                      {d.delta > 0 ? '+' : ''}{d.delta.toFixed(4)} {d.symbol || d.mint.slice(0, 6) + '…'}
                    </span>
                  ))}
                </div>
              </div>
            )}

            {/* Counterparty */}
            {tx.counterparty && (
              <div>
                <div className="text-gray-600 text-xs uppercase tracking-wider mb-1">Counterparty</div>
                <a
                  href={`https://solscan.io/account/${tx.counterparty}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="font-num text-xs text-gray-500 hover:text-sol-purple transition-colors break-all"
                  onClick={(e) => e.stopPropagation()}
                >
                  {tx.counterparty}
                </a>
              </div>
            )}
          </div>

          {/* Simulate button */}
          <button
            onClick={(e) => { e.stopPropagation(); onSimulate(tx); }}
            className="mt-3 text-xs text-sol-purple hover:text-violet-300 transition-colors flex items-center gap-1"
          >
            <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 3H5a2 2 0 00-2 2v4m6-6h10a2 2 0 012 2v4M9 3v18m0 0h10a2 2 0 002-2V9M9 21H5a2 2 0 01-2-2V9m0 0h18" />
            </svg>
            Analyze this transaction
          </button>
        </div>
      )}
    </div>
  );
}

const FILTERS = ['All', 'Swap', 'Transfer', 'NFT', 'DeFi', 'Unknown', 'Failed'];

export default function TransactionFeed({ transactions, loading, error, onRefresh, onSimulate }) {
  const [filter, setFilter] = useState('All');
  const [search, setSearch] = useState('');

  const filtered = useMemo(() => {
    let txs = transactions;
    if (filter === 'Failed') {
      txs = txs.filter((t) => t.category === 'Failed');
    } else if (filter !== 'All') {
      txs = txs.filter((t) => t.category === filter);
    }
    if (search.trim()) {
      const q = search.trim().toLowerCase();
      txs = txs.filter(
        (t) =>
          t.signature.toLowerCase().includes(q) ||
          t.category.toLowerCase().includes(q) ||
          (t.counterparty || '').toLowerCase().includes(q)
      );
    }
    return txs;
  }, [transactions, filter, search]);

  return (
    <div className="bg-sol-card border border-sol-border rounded-2xl overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between px-5 py-4 border-b border-sol-border">
        <div className="flex items-center gap-2">
          <div className="w-2 h-2 rounded-full bg-blue-400" style={{ boxShadow: '0 0 6px #60a5fa' }} />
          <span className="text-white font-semibold text-sm">Transactions</span>
          {!loading && transactions.length > 0 && (
            <span className="bg-sol-border text-gray-400 text-xs font-num px-2 py-0.5 rounded-full ml-1">
              {transactions.length}
            </span>
          )}
        </div>
        <button
          onClick={onRefresh}
          disabled={loading}
          className="text-gray-500 hover:text-sol-purple transition-colors disabled:opacity-40"
        >
          <svg className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
          </svg>
        </button>
      </div>

      {/* Search */}
      <div className="px-4 py-3 border-b border-sol-border">
        <input
          type="text"
          placeholder="Search by signature, category, or address…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="w-full bg-sol-surface border border-sol-border rounded-lg px-3 py-2 text-sm text-gray-300 placeholder-gray-600 focus:outline-none focus:border-sol-purple transition-colors"
        />
      </div>

      {/* Filters */}
      <div className="px-4 py-2 border-b border-sol-border flex gap-1.5 overflow-x-auto scrollbar-thin">
        {FILTERS.map((f) => (
          <button
            key={f}
            onClick={() => setFilter(f)}
            className={`text-xs px-3 py-1.5 rounded-full whitespace-nowrap transition-colors ${
              filter === f
                ? 'bg-sol-purple text-white'
                : 'bg-sol-surface text-gray-400 hover:text-gray-200 border border-sol-border'
            }`}
          >
            {f}
          </button>
        ))}
      </div>

      {/* List */}
      <div className="divide-y divide-transparent">
        {loading ? (
          <div className="divide-y divide-sol-border/40">
            {[...Array(8)].map((_, i) => (
              <div key={i} className="flex items-center gap-3 px-4 py-3">
                <Skeleton className="w-8 h-8 rounded-lg flex-shrink-0" />
                <div className="flex-1">
                  <Skeleton className="h-4 w-20 mb-1.5" />
                  <Skeleton className="h-3 w-32" />
                </div>
                <div className="text-right">
                  <Skeleton className="h-3 w-16 mb-1 ml-auto" />
                  <Skeleton className="h-3 w-12 ml-auto" />
                </div>
              </div>
            ))}
          </div>
        ) : error ? (
          <div className="text-center py-12 text-red-400 text-sm px-4">{error}</div>
        ) : filtered.length === 0 ? (
          <div className="text-center py-12 text-gray-600 text-sm">
            {transactions.length === 0 ? 'No transactions found' : 'No results for this filter'}
          </div>
        ) : (
          filtered.map((tx) => (
            <TxRow key={tx.signature} tx={tx} onSimulate={onSimulate} />
          ))
        )}
      </div>
    </div>
  );
}
