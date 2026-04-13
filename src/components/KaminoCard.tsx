import React from 'react';
import { useKamino } from '../hooks/useKamino';
import { useCurrency } from '../context/CurrencyContext';

function Skeleton({ className }: { className: string }) {
  return <div className={`skeleton rounded ${className}`} />;
}

function HealthBar({ value }: { value: number | null }) {
  if (value == null) return <span className="text-gray-600 font-num text-xs">—</span>;
  const color = value > 1.5 ? 'text-sol-teal' : value > 1.1 ? 'text-yellow-400' : 'text-red-400';
  return <span className={`font-num text-xs font-medium ${color}`}>{value.toFixed(2)}</span>;
}

export default function KaminoCard() {
  const { positions, opportunities, loading, error } = useKamino();
  const { fmt } = useCurrency();

  return (
    <div className="bg-sol-card border border-sol-border rounded-2xl overflow-hidden">
      <div className="flex items-center gap-2 px-5 py-4 border-b border-sol-border">
        <div className="w-2 h-2 rounded-full bg-teal-400" style={{ boxShadow: '0 0 6px #2dd4bf' }} />
        <span className="text-white font-semibold text-sm">Kamino Yield</span>
        <a
          href="https://app.kamino.finance"
          target="_blank"
          rel="noopener noreferrer"
          className="ml-auto text-xs text-gray-600 hover:text-sol-teal transition-colors"
        >
          Open Kamino ↗
        </a>
      </div>

      <div className="p-5 space-y-4">
        {loading ? (
          <div className="space-y-3">
            {[...Array(3)].map((_, i) => <Skeleton key={i} className="h-14 w-full rounded-xl" />)}
          </div>
        ) : error ? (
          <div className="text-red-400 text-sm text-center py-4">{error}</div>
        ) : (
          <>
            {/* Active positions */}
            {positions.length > 0 ? (
              <div>
                <div className="text-gray-500 text-xs uppercase tracking-wider mb-2">Your Positions</div>
                <div className="space-y-2">
                  {positions.map((p, i) => (
                    <div key={i} className="bg-sol-surface border border-sol-border rounded-xl p-3">
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-white text-sm font-medium">{p.symbol}</span>
                        <span className="text-sol-teal text-xs font-num font-medium">
                          {p.apy.toFixed(2)}% APY
                        </span>
                      </div>
                      <div className="grid grid-cols-3 gap-2 text-xs">
                        <div>
                          <div className="text-gray-600 mb-0.5">Deposited</div>
                          <div className="font-num text-gray-300">{fmt(p.deposited)}</div>
                        </div>
                        <div>
                          <div className="text-gray-600 mb-0.5">Borrowed</div>
                          <div className="font-num text-gray-300">{fmt(p.borrowed)}</div>
                        </div>
                        <div>
                          <div className="text-gray-600 mb-0.5">Health</div>
                          <HealthBar value={p.healthFactor} />
                        </div>
                      </div>
                      <a
                        href={p.marketUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="mt-2 text-xs text-gray-600 hover:text-sol-teal transition-colors block"
                      >
                        Manage position ↗
                      </a>
                    </div>
                  ))}
                </div>
              </div>
            ) : (
              <div className="text-center py-4 text-gray-600 text-sm">
                No active Kamino positions — explore yield opportunities below
              </div>
            )}

            {/* Opportunities */}
            {opportunities.length > 0 && (
              <div>
                <div className="text-gray-500 text-xs uppercase tracking-wider mb-2">Top Opportunities</div>
                <div className="space-y-2">
                  {opportunities.map((o, i) => (
                    <div key={i} className="flex items-center justify-between bg-sol-surface border border-sol-border rounded-xl px-3 py-2.5">
                      <div>
                        <div className="text-white text-xs font-medium truncate max-w-[140px]">{o.name}</div>
                        <div className="text-gray-600 text-xs font-num">
                          TVL {o.tvl > 1e6 ? `$${(o.tvl / 1e6).toFixed(1)}M` : `$${(o.tvl / 1e3).toFixed(0)}K`}
                        </div>
                      </div>
                      <div className="flex items-center gap-3">
                        <span className="text-sol-teal font-num text-sm font-bold">{o.apy.toFixed(2)}%</span>
                        <a
                          href={o.url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-xs text-gray-600 hover:text-sol-teal transition-colors"
                        >
                          ↗
                        </a>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
