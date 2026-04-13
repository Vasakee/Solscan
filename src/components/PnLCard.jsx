import React from 'react';
import { useCurrency } from '../context/CurrencyContext';

function StatBox({ label, value, sub, color }) {
  return (
    <div className="bg-sol-surface border border-sol-border rounded-xl p-4">
      <div className="text-gray-500 text-xs uppercase tracking-wider mb-2">{label}</div>
      <div className={`font-num text-xl font-bold ${color}`}>{value}</div>
      {sub && <div className="text-gray-600 text-xs mt-1 font-num">{sub}</div>}
    </div>
  );
}

function Skeleton({ className }) {
  return <div className={`skeleton rounded ${className}`} />;
}

function TradeRow({ label, trade }) {
  const { fmt } = useCurrency();
  if (!trade) return null;
  const pnl = trade.realizedPnlUsd;
  const isPos = pnl >= 0;
  return (
    <div className="flex items-center justify-between text-xs py-1.5 border-b border-sol-border/40 last:border-0">
      <span className="text-gray-500">{label}</span>
      <div className="text-right">
        <div className={`font-num font-medium ${isPos ? 'text-sol-teal' : 'text-red-400'}`}>
          {isPos ? '+' : ''}{fmt(Math.abs(pnl))}
        </div>
        <div className="text-gray-600 font-num">
          {trade.tokenIn.symbol} → {trade.tokenOut.symbol}
        </div>
      </div>
    </div>
  );
}

export default function PnLCard({ pnl, transactions, loading, solPrice }) {
  const { fmt } = useCurrency();
  const up = pnl.netPnl >= 0;

  const failedTxs  = transactions.filter((t) => t.category === 'Failed').length;
  const successTxs = transactions.length - failedTxs;
  const successRate = transactions.length > 0 ? (successTxs / transactions.length) * 100 : 0;

  const categories = {};
  transactions.forEach((t) => {
    categories[t.category] = (categories[t.category] || 0) + 1;
  });

  const categoryColors = {
    Swap:     'bg-violet-500',
    Transfer: 'bg-blue-500',
    NFT:      'bg-pink-500',
    DeFi:     'bg-teal-500',
    Failed:   'bg-red-500',
    Unknown:  'bg-gray-500',
  };

  const totalTx = Object.values(categories).reduce((a, b) => a + b, 0);

  return (
    <div className="bg-sol-card border border-sol-border rounded-2xl overflow-hidden">
      <div className="flex items-center gap-2 px-5 py-4 border-b border-sol-border">
        <div className="w-2 h-2 rounded-full bg-sol-purple" style={{ boxShadow: '0 0 6px #9945FF' }} />
        <span className="text-white font-semibold text-sm">PnL & Activity</span>
      </div>

      <div className="p-5 space-y-4">
        {/* Net PnL hero */}
        <div className="bg-sol-surface border border-sol-border rounded-xl p-4 text-center">
          <div className="text-gray-500 text-xs uppercase tracking-wider mb-2">Net Realized PnL</div>
          {loading ? (
            <Skeleton className="h-10 w-36 mx-auto" />
          ) : (
            <div className={`font-num text-3xl font-bold ${up ? 'text-sol-teal' : 'text-red-400'}`}>
              {up ? '+' : '-'}{fmt(Math.abs(pnl.netPnl))}
            </div>
          )}
          <div className="text-gray-600 text-xs mt-1">
            {pnl.unpricedCount > 0 ? `${pnl.unpricedCount} swap${pnl.unpricedCount > 1 ? 's' : ''} excluded (no price data)` : 'Based on last 50 transactions'}
          </div>
        </div>

        {/* Stats grid */}
        <div className="grid grid-cols-2 gap-3">
          {loading ? (
            <>
              <Skeleton className="h-20 rounded-xl" />
              <Skeleton className="h-20 rounded-xl" />
              <Skeleton className="h-20 rounded-xl" />
              <Skeleton className="h-20 rounded-xl" />
            </>
          ) : (
            <>
              <StatBox label="Inflow"  value={`+${fmt(pnl.totalIn)}`}  color="text-sol-teal" />
              <StatBox label="Outflow" value={`-${fmt(pnl.totalOut)}`} color="text-red-400" />
              <StatBox
                label="Swap Count"
                value={pnl.tradeCount.toString()}
                sub="DEX swaps"
                color="text-violet-300"
              />
              <StatBox
                label="Success Rate"
                value={`${successRate.toFixed(0)}%`}
                sub={`${failedTxs} failed`}
                color={successRate >= 90 ? 'text-sol-teal' : successRate >= 70 ? 'text-yellow-400' : 'text-red-400'}
              />
            </>
          )}
        </div>

        {/* Best / worst trades */}
        {!loading && (pnl.bestTrade || pnl.worstTrade) && (
          <div className="bg-sol-surface border border-sol-border rounded-xl p-3">
            <div className="text-gray-500 text-xs uppercase tracking-wider mb-2">Notable Trades</div>
            <TradeRow label="Best"  trade={pnl.bestTrade} />
            <TradeRow label="Worst" trade={pnl.worstTrade} />
          </div>
        )}

        {/* Category breakdown */}
        {!loading && totalTx > 0 && (
          <div>
            <div className="text-gray-500 text-xs uppercase tracking-wider mb-3">Transaction Types</div>
            <div className="space-y-2">
              {Object.entries(categories)
                .sort((a, b) => b[1] - a[1])
                .map(([cat, count]) => {
                  const pct = (count / totalTx) * 100;
                  return (
                    <div key={cat}>
                      <div className="flex justify-between text-xs text-gray-400 mb-1">
                        <span>{cat}</span>
                        <span className="font-num">{count} ({pct.toFixed(0)}%)</span>
                      </div>
                      <div className="h-1.5 bg-sol-border rounded-full overflow-hidden">
                        <div
                          className={`h-full rounded-full transition-all ${categoryColors[cat] || 'bg-gray-500'}`}
                          style={{ width: `${pct}%` }}
                        />
                      </div>
                    </div>
                  );
                })}
            </div>
          </div>
        )}

        {solPrice && (
          <div className="text-gray-600 text-xs font-num text-center pt-1">
            SOL price: {fmt(solPrice.value)}
          </div>
        )}
      </div>
    </div>
  );
}
