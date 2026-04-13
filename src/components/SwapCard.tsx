import React, { useState, useEffect, useMemo } from 'react';
import { useWallet } from '@solana/wallet-adapter-react';
import { useDFlow } from '../hooks/useDFlow';
import { useCurrency } from '../context/CurrencyContext';
import { useToast } from '../context/ToastContext';
import { PROXY_API } from '../config';

const SOL_MINT = 'So11111111111111111111111111111111111111112';
const USDC_MINT = 'EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v';

interface TokenMeta { mint: string; symbol: string; decimals: number; logoURI?: string; }

function Skeleton({ className }: { className: string }) {
  return <div className={`skeleton rounded ${className}`} />;
}

function TokenSelect({
  tokens, value, onChange, label,
}: {
  tokens: TokenMeta[]; value: string; onChange: (v: string) => void; label: string;
}) {
  return (
    <div>
      <div className="text-gray-500 text-xs uppercase tracking-wider mb-1.5">{label}</div>
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="w-full bg-sol-surface border border-sol-border text-gray-300 text-sm rounded-lg px-3 py-2.5 focus:outline-none focus:border-sol-purple transition-colors"
      >
        {tokens.map((t) => (
          <option key={t.mint} value={t.mint}>{t.symbol}</option>
        ))}
      </select>
    </div>
  );
}

export default function SwapCard({ onSimulate }: { onSimulate?: (txBase64: string) => void }) {
  const { publicKey } = useWallet();
  const { quote, getQuote, executeSwap, loading, error, clearQuote } = useDFlow();
  const { fmt } = useCurrency();
  const { toast } = useToast();

  const [tokens, setTokens] = useState<TokenMeta[]>([]);
  const [inputMint, setInputMint] = useState(SOL_MINT);
  const [outputMint, setOutputMint] = useState(USDC_MINT);
  const [amountStr, setAmountStr] = useState('');
  const [executing, setExecuting] = useState(false);

  // Load token list (reuse Jupiter list already used by usePortfolio)
  useEffect(() => {
    fetch(PROXY_API('https://tokens.jup.ag/tokens?tags=verified'))
      .then((r) => r.json())
      .then((list: any[]) => {
        const mapped: TokenMeta[] = list.slice(0, 200).map((t) => ({
          mint: t.address,
          symbol: t.symbol,
          decimals: t.decimals,
          logoURI: t.logoURI,
        }));
        // Ensure SOL is first
        const sol = mapped.find((t) => t.mint === SOL_MINT);
        const rest = mapped.filter((t) => t.mint !== SOL_MINT);
        setTokens(sol ? [sol, ...rest] : mapped);
      })
      .catch(() => {
        setTokens([
          { mint: SOL_MINT, symbol: 'SOL', decimals: 9 },
          { mint: USDC_MINT, symbol: 'USDC', decimals: 6 },
        ]);
      });
  }, []);

  const inputToken = useMemo(() => tokens.find((t) => t.mint === inputMint), [tokens, inputMint]);
  const amount = parseFloat(amountStr) || 0;
  const rawAmount = Math.round(amount * 10 ** (inputToken?.decimals ?? 9));

  const handleQuote = () => {
    if (!amount || !inputMint || !outputMint) return;
    clearQuote();
    getQuote(inputMint, outputMint, rawAmount);
  };

  const handleSimulate = () => {
    if (!quote?.swapTransaction) return;
    onSimulate?.(quote.swapTransaction);
    toast('Transaction loaded in Simulator', 'info');
  };

  const handleSwap = async () => {
    if (!quote) return;
    setExecuting(true);
    const sig = await executeSwap(quote);
    setExecuting(false);
    if (sig) {
      toast('Swap executed via DFlow ✓', 'success');
      clearQuote();
      setAmountStr('');
    }
  };

  const outAmount = quote
    ? (parseInt(quote.outAmount) / 10 ** (tokens.find((t) => t.mint === outputMint)?.decimals ?? 6)).toFixed(6)
    : null;

  return (
    <div className="bg-sol-card border border-sol-border rounded-2xl overflow-hidden">
      <div className="flex items-center gap-2 px-5 py-4 border-b border-sol-border">
        <div className="w-2 h-2 rounded-full bg-sol-teal" style={{ boxShadow: '0 0 6px #14F195' }} />
        <span className="text-white font-semibold text-sm">Swap</span>
        <span className="ml-auto text-xs px-2 py-0.5 rounded-full bg-teal-900/40 text-sol-teal border border-teal-500/30">
          MEV Protected via DFlow
        </span>
      </div>

      <div className="p-5 space-y-4">
        {tokens.length === 0 ? (
          <Skeleton className="h-40 w-full rounded-xl" />
        ) : (
          <>
            <TokenSelect tokens={tokens} value={inputMint} onChange={(v) => { setInputMint(v); clearQuote(); }} label="You Pay" />

            <div>
              <div className="text-gray-500 text-xs uppercase tracking-wider mb-1.5">Amount</div>
              <input
                type="number"
                min="0"
                step="any"
                value={amountStr}
                onChange={(e) => { setAmountStr(e.target.value); clearQuote(); }}
                placeholder="0.00"
                className="w-full bg-sol-surface border border-sol-border rounded-lg px-3 py-2.5 text-sm font-num text-gray-300 placeholder-gray-600 focus:outline-none focus:border-sol-purple transition-colors"
              />
            </div>

            {/* Swap direction arrow */}
            <div className="flex justify-center">
              <button
                onClick={() => { setInputMint(outputMint); setOutputMint(inputMint); clearQuote(); }}
                className="text-gray-600 hover:text-sol-purple transition-colors"
                title="Flip tokens"
              >
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16V4m0 0L3 8m4-4l4 4M17 8v12m0 0l4-4m-4 4l-4-4" />
                </svg>
              </button>
            </div>

            <TokenSelect tokens={tokens} value={outputMint} onChange={(v) => { setOutputMint(v); clearQuote(); }} label="You Receive" />

            <button
              onClick={handleQuote}
              disabled={loading || !amount || inputMint === outputMint}
              className="w-full bg-sol-surface border border-sol-border hover:border-sol-purple text-gray-300 hover:text-white text-sm font-medium py-2.5 rounded-lg transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
            >
              {loading ? 'Getting quote…' : 'Get Quote'}
            </button>

            {error && (
              <div className="bg-red-900/30 border border-red-500/40 rounded-lg px-3 py-2 text-red-300 text-xs">
                {error}
              </div>
            )}

            {quote && outAmount && (
              <div className="bg-sol-surface border border-sol-border rounded-xl p-4 space-y-2">
                <div className="flex justify-between text-sm">
                  <span className="text-gray-500">Expected output</span>
                  <span className="font-num text-white font-medium">{outAmount} {tokens.find((t) => t.mint === outputMint)?.symbol}</span>
                </div>
                <div className="flex justify-between text-xs">
                  <span className="text-gray-600">Price impact</span>
                  <span className={`font-num ${quote.priceImpactPct > 1 ? 'text-red-400' : 'text-gray-400'}`}>
                    {quote.priceImpactPct.toFixed(3)}%
                  </span>
                </div>
                {quote.routePlan.filter(Boolean).length > 0 && (
                  <div className="flex justify-between text-xs">
                    <span className="text-gray-600">Route</span>
                    <span className="text-gray-400 truncate max-w-[180px] text-right">
                      {quote.routePlan.filter(Boolean).join(' → ')}
                    </span>
                  </div>
                )}
                <div className="flex items-center gap-1.5 pt-1">
                  <div className="w-1.5 h-1.5 rounded-full bg-sol-teal" />
                  <span className="text-sol-teal text-xs">MEV Protected via DFlow</span>
                </div>

                <div className="flex gap-2 pt-2">
                  {onSimulate && quote.swapTransaction && (
                    <button
                      onClick={handleSimulate}
                      className="flex-1 bg-sol-card border border-sol-border hover:border-sol-purple text-gray-400 hover:text-white text-xs font-medium py-2 rounded-lg transition-colors"
                    >
                      🔬 Simulate
                    </button>
                  )}
                  <button
                    onClick={handleSwap}
                    disabled={executing || !publicKey}
                    className="flex-1 bg-sol-purple hover:bg-violet-600 disabled:opacity-40 disabled:cursor-not-allowed text-white text-sm font-semibold py-2 rounded-lg transition-colors flex items-center justify-center gap-2"
                  >
                    {executing && (
                      <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                      </svg>
                    )}
                    {executing ? 'Swapping…' : 'Swap via DFlow'}
                  </button>
                </div>
              </div>
            )}

            {!quote && !loading && !error && (
              <div className="text-center py-6 text-gray-600 text-sm">
                <div className="text-2xl mb-2">⇄</div>
                <p>Select tokens and enter an amount to get a MEV-protected quote</p>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
