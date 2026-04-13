import React, { useState } from 'react';
import { useCurrency } from '../context/CurrencyContext';
import { useNFTs } from '../hooks/useNFTs';

function Skeleton({ className }) {
  return <div className={`skeleton rounded ${className}`} />;
}

function TokenRow({ token }) {
  const { fmt } = useCurrency();
  const hasLogo = token.logoURI && !token.logoURI.includes('undefined');

  return (
    <div className="flex items-center justify-between py-3 border-b border-sol-border/60 last:border-0 hover:bg-sol-surface/40 px-1 rounded transition-colors">
      <div className="flex items-center gap-3">
        <div className="w-9 h-9 rounded-full bg-sol-border flex items-center justify-center overflow-hidden flex-shrink-0">
          {hasLogo ? (
            <img src={token.logoURI} alt={token.symbol} className="w-full h-full object-cover" />
          ) : (
            <span className="text-gray-400 text-xs font-bold">{token.symbol.slice(0, 2)}</span>
          )}
        </div>
        <div>
          <div className="text-white text-sm font-medium">{token.symbol}</div>
          <div className="text-gray-500 text-xs truncate max-w-[160px]">{token.name}</div>
        </div>
      </div>
      <div className="text-right">
        <div className="font-num text-sm text-white">
          {token.balance.toLocaleString('en-US', { maximumFractionDigits: 4 })}
        </div>
        {token.usdValue > 0 ? (
          <div className="font-num text-xs text-gray-400">{fmt(token.usdValue)}</div>
        ) : (
          <div className="font-num text-xs text-gray-600">—</div>
        )}
      </div>
    </div>
  );
}

export default function PortfolioCard({ portfolio, loading, error, solPrice, onRefresh }) {
  const [showAll, setShowAll] = useState(false);
  const { fmt } = useCurrency();
  const { nfts } = useNFTs();

  const solValue = portfolio ? portfolio.sol * (solPrice?.value || 0) : 0;
  const totalValue = solValue + (portfolio?.totalUsd || 0);

  const tokens = portfolio?.tokens || [];
  const visibleTokens = showAll ? tokens : tokens.slice(0, 8);

  return (
    <div className="bg-sol-card border border-sol-border rounded-2xl overflow-hidden">
      {/* Card header */}
      <div className="flex items-center justify-between px-5 py-4 border-b border-sol-border">
        <div className="flex items-center gap-2">
          <div className="w-2 h-2 rounded-full bg-sol-teal glow-teal" />
          <span className="text-white font-semibold text-sm">Portfolio</span>
          {nfts.length > 0 && (
            <span className="bg-sol-border text-gray-400 text-xs font-num px-2 py-0.5 rounded-full">
              {nfts.length} NFTs
            </span>
          )}
        </div>
        <button
          onClick={onRefresh}
          disabled={loading}
          className="text-gray-500 hover:text-sol-purple transition-colors disabled:opacity-40"
          title="Refresh"
        >
          <svg className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
          </svg>
        </button>
      </div>

      <div className="p-5">
        {/* Total value */}
        <div className="mb-6">
          <div className="text-gray-500 text-xs mb-1 uppercase tracking-wider">Total Value</div>
          {loading ? (
            <Skeleton className="h-9 w-44" />
          ) : (
            <div className="font-num text-3xl font-bold text-white">
              {fmt(totalValue)}
            </div>
          )}
        </div>

        {/* SOL balance row */}
        <div className="flex items-center justify-between py-3 border-b border-sol-border/60 mb-2">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-full bg-gradient-to-br from-sol-purple to-sol-teal flex items-center justify-center flex-shrink-0">
              <span className="text-white text-sm font-bold">◎</span>
            </div>
            <div>
              <div className="text-white text-sm font-medium">SOL</div>
              <div className="text-gray-500 text-xs">Solana</div>
            </div>
          </div>
          <div className="text-right">
            {loading ? (
              <>
                <Skeleton className="h-4 w-20 mb-1 ml-auto" />
                <Skeleton className="h-3 w-16 ml-auto" />
              </>
            ) : (
              <>
                <div className="font-num text-sm text-white">
                  {(portfolio?.sol || 0).toLocaleString('en-US', { maximumFractionDigits: 6 })}
                </div>
                <div className="font-num text-xs text-gray-400">{fmt(solValue)}</div>
              </>
            )}
          </div>
        </div>

        {/* Token list */}
        {loading ? (
          <div className="space-y-3 mt-2">
            {[...Array(4)].map((_, i) => (
              <div key={i} className="flex items-center justify-between py-2">
                <div className="flex items-center gap-3">
                  <Skeleton className="w-9 h-9 rounded-full" />
                  <div>
                    <Skeleton className="h-4 w-16 mb-1" />
                    <Skeleton className="h-3 w-24" />
                  </div>
                </div>
                <div className="text-right">
                  <Skeleton className="h-4 w-20 mb-1 ml-auto" />
                  <Skeleton className="h-3 w-14 ml-auto" />
                </div>
              </div>
            ))}
          </div>
        ) : error ? (
          <div className="text-center py-8 text-red-400 text-sm">{error}</div>
        ) : tokens.length === 0 ? (
          <div className="text-center py-8 text-gray-600 text-sm">No SPL tokens found</div>
        ) : (
          <>
            {visibleTokens.map((t) => <TokenRow key={t.mint} token={t} />)}
            {tokens.length > 8 && (
              <button
                onClick={() => setShowAll(!showAll)}
                className="w-full mt-3 text-xs text-sol-purple hover:text-violet-300 transition-colors py-2"
              >
                {showAll ? '↑ Show less' : `↓ Show ${tokens.length - 8} more tokens`}
              </button>
            )}
          </>
        )}
      </div>
    </div>
  );
}
