import React, { useState } from 'react';
import { useSimulation } from '../hooks/useSimulation';
import { useSolPrice } from '../hooks/useSolPrice';
import { useCurrency } from '../context/CurrencyContext';
import type { SimulationResult, RiskFlag, TokenBalanceDiff } from '../hooks/useSimulation';

// ---------------------------------------------------------------------------
// Sub-components
// ---------------------------------------------------------------------------

const RISK_STYLES = {
  safe:    { wrap: 'bg-teal-900/30 border-teal-500/40',     dot: 'bg-teal-400',    text: 'text-teal-300',    icon: '✓' },
  warning: { wrap: 'bg-yellow-900/30 border-yellow-500/40', dot: 'bg-yellow-400',  text: 'text-yellow-300',  icon: '!' },
  danger:  { wrap: 'bg-red-900/30 border-red-500/40',       dot: 'bg-red-400',     text: 'text-red-300',     icon: '✕' },
};

function RiskBadge({ flag }: { flag: RiskFlag }) {
  const s = RISK_STYLES[flag.level];
  return (
    <div className={`flex items-start gap-2.5 p-3 rounded-lg border ${s.wrap}`}>
      <div className={`w-4 h-4 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5 ${s.dot}`}>
        <span className="text-xs font-bold text-black leading-none">{s.icon}</span>
      </div>
      <div>
        <div className={`text-sm font-medium ${s.text}`}>{flag.label}</div>
        <div className="text-gray-500 text-xs mt-0.5">{flag.detail}</div>
      </div>
    </div>
  );
}

function DiffRow({ label, before, after, delta, unit = '' }: {
  label: string; before: number; after: number; delta: number; unit?: string;
}) {
  const isPos = delta > 0;
  const isZero = Math.abs(delta) < 1e-9;
  return (
    <div className="flex items-center justify-between gap-2 px-3 py-2 bg-sol-surface rounded-lg text-xs flex-wrap">
      <span className="text-gray-400 min-w-0 truncate">{label}</span>
      <div className="flex items-center gap-1.5 font-num flex-shrink-0">
        <span className="text-gray-500">{before.toFixed(6)}{unit}</span>
        <span className="text-gray-600">→</span>
        <span className="text-white">{after.toFixed(6)}{unit}</span>
        {!isZero && (
          <span className={`font-medium ${isPos ? 'text-sol-teal' : 'text-red-400'}`}>
            ({isPos ? '+' : ''}{delta.toFixed(6)})
          </span>
        )}
      </div>
    </div>
  );
}

function TokenDiffRow({ diff }: { diff: TokenBalanceDiff }) {
  return (
    <DiffRow
      label={diff.symbol}
      before={diff.before}
      after={diff.after}
      delta={diff.delta}
    />
  );
}

function StatPill({ label, value, sub }: { label: string; value: string; sub?: string }) {
  return (
    <div className="bg-sol-surface border border-sol-border rounded-lg p-3">
      <div className="text-gray-500 text-xs mb-1">{label}</div>
      <div className="font-num text-sm text-white">{value}</div>
      {sub && <div className="text-gray-600 text-xs font-num mt-0.5">{sub}</div>}
    </div>
  );
}

function ResultView({ result, solPriceUsd }: { result: SimulationResult; solPriceUsd: number | null }) {
  const [showLogs, setShowLogs] = useState(false);
  const { fmt } = useCurrency();

  const overallLevel = result.risks.some((r) => r.level === 'danger')
    ? 'danger' : result.risks.some((r) => r.level === 'warning') ? 'warning' : 'safe';

  const bannerStyle = {
    danger:  'bg-red-900/30 border-red-500/40 text-red-300',
    warning: 'bg-yellow-900/30 border-yellow-500/40 text-yellow-300',
    safe:    'bg-teal-900/30 border-teal-500/40 text-teal-300',
  }[overallLevel];

  const bannerIcon  = { danger: '⚠', warning: '⚡', safe: '✓' }[overallLevel];
  const bannerTitle = {
    danger:  result.success ? 'Risk Detected' : 'Transaction Would Fail',
    warning: 'Caution Advised',
    safe:    'Looks Safe',
  }[overallLevel];

  const feeUsd = result.feeUsd ?? (solPriceUsd != null ? result.fee * solPriceUsd : null);

  return (
    <div className="space-y-4">
      {/* Status banner */}
      <div className={`flex items-center gap-3 p-3 rounded-lg border ${bannerStyle}`}>
        <span className="text-2xl">{bannerIcon}</span>
        <div>
          <div className="font-medium text-sm">{bannerTitle}</div>
          <div className="text-xs opacity-70">Live simulation complete</div>
        </div>
      </div>

      {/* Fee / compute stats */}
      <div className="grid grid-cols-2 gap-2">
        <StatPill
          label="Network Fee"
          value={`${result.fee.toFixed(6)} SOL`}
          sub={feeUsd != null ? `≈ ${fmt(feeUsd, { decimals: 4 })}` : undefined}
        />
        <StatPill
          label="Compute Units"
          value={result.computeUnits != null ? result.computeUnits.toLocaleString() : '—'}
          sub={result.computeUnits != null ? `of 1,400,000 max` : undefined}
        />
      </div>

      {/* Balance diffs */}
      <div>
        <div className="text-gray-500 text-xs uppercase tracking-wider mb-2">Balance Changes</div>
        <div className="space-y-1.5">
          <DiffRow
            label="SOL"
            before={result.solBefore}
            after={result.solAfter}
            delta={result.solDelta}
            unit=" SOL"
          />
          {result.tokenDiffs.map((d) => (
            <TokenDiffRow key={d.mint} diff={d} />
          ))}
          {result.tokenDiffs.length === 0 && (
            <div className="text-gray-600 text-xs px-3 py-2">No token balance changes detected</div>
          )}
        </div>
      </div>

      {/* Risk flags */}
      <div>
        <div className="text-gray-500 text-xs uppercase tracking-wider mb-2">Risk Analysis</div>
        <div className="space-y-2">
          {result.risks.map((flag, i) => <RiskBadge key={i} flag={flag} />)}
        </div>
      </div>

      {/* Programs */}
      {result.programIds.length > 0 && (
        <div>
          <div className="text-gray-500 text-xs uppercase tracking-wider mb-2">
            Programs Involved ({result.programIds.length})
          </div>
          <div className="space-y-1 max-h-28 overflow-y-auto">
            {result.programIds.map((pid) => (
              <div key={pid} className="font-num text-xs text-gray-500 bg-sol-surface rounded px-3 py-1.5 truncate">
                {pid}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Logs */}
      {result.logs.length > 0 && (
        <div>
          <button
            onClick={() => setShowLogs((v) => !v)}
            className="text-xs text-gray-500 hover:text-gray-300 transition-colors flex items-center gap-1"
          >
            <svg className={`w-3 h-3 transition-transform ${showLogs ? 'rotate-180' : ''}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
            </svg>
            {showLogs ? 'Hide' : 'Show'} program logs ({result.logs.length})
          </button>
          {showLogs && (
            <div className="mt-2 bg-sol-surface border border-sol-border rounded-lg p-3 max-h-48 overflow-y-auto space-y-0.5">
              {result.logs.map((line, i) => {
                const isErr = /error|failed/i.test(line);
                const isOk  = /success|ok/i.test(line);
                return (
                  <div key={i} className={`font-num text-xs ${isErr ? 'text-red-400' : isOk ? 'text-teal-400' : 'text-gray-500'}`}>
                    {line}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Main component
// ---------------------------------------------------------------------------

interface Props {
  /** Pre-loaded tx from history — if provided, the base64 input is hidden */
  preloadTx?: any | null;
  /** Pre-loaded base64 tx from SwapCard */
  preloadBase64?: string | null;
  onClose?: () => void;
}

export default function SimulationPanel({ preloadTx = null, preloadBase64 = null, onClose }: Props) {
  const [txInput, setTxInput] = useState(preloadBase64 ?? '');
  const { simulate, result, loading, error, clear } = useSimulation();
  const { currency } = useCurrency();
  const { price: solPrice } = useSolPrice(currency);
  const solPriceUsd = solPrice?.value ?? null;

  // If a base64 tx is injected from SwapCard, populate the input
  React.useEffect(() => {
    if (preloadBase64) setTxInput(preloadBase64);
  }, [preloadBase64]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    // For preloaded txs we don't have the raw serialized bytes — show a note
    simulate(txInput.trim() || null, solPriceUsd);
  };

  return (
    <div className="bg-sol-card border border-sol-border rounded-2xl overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between px-5 py-4 border-b border-sol-border">
        <div className="flex items-center gap-2">
          <div className="w-2 h-2 rounded-full bg-yellow-400" style={{ boxShadow: '0 0 6px #facc15' }} />
          <span className="text-white font-semibold text-sm">Transaction Simulator</span>
        </div>
        {onClose && (
          <button onClick={onClose} className="text-gray-500 hover:text-gray-300 transition-colors">
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        )}
      </div>

      <div className="p-5">
        {/* Preloaded tx info banner */}
        {preloadTx && (
          <div className="mb-4 bg-sol-surface border border-sol-border rounded-lg p-3">
            <div className="text-gray-500 text-xs uppercase tracking-wider mb-1">From Transaction History</div>
            <div className="font-num text-xs text-sol-purple break-all">{preloadTx.signature}</div>
            <div className="flex items-center gap-3 mt-2 text-xs">
              <span className="text-gray-500">Category: <span className="text-gray-300">{preloadTx.category}</span></span>
              <span className={preloadTx.category === 'Failed' ? 'text-red-400' : 'text-teal-400'}>
                {preloadTx.category === 'Failed' ? 'Failed on-chain' : 'Succeeded on-chain'}
              </span>
            </div>
            <p className="text-gray-600 text-xs mt-2">
              Paste the base64 transaction below to re-simulate it, or simulate a different transaction.
            </p>
          </div>
        )}

        {/* Input form */}
        {!result && (
          <form onSubmit={handleSubmit} className="mb-4">
            <label className="block text-gray-500 text-xs uppercase tracking-wider mb-2">
              Base64-Encoded Transaction
            </label>
            <textarea
              value={txInput}
              onChange={(e) => setTxInput(e.target.value)}
              placeholder="Paste a base64-encoded serialized transaction…"
              rows={4}
              className="w-full bg-sol-surface border border-sol-border rounded-lg px-3 py-2.5 text-xs font-num text-gray-300 placeholder-gray-600 focus:outline-none focus:border-sol-purple transition-colors resize-none"
            />
            <button
              type="submit"
              disabled={loading || !txInput.trim()}
              className="mt-2 w-full bg-sol-purple hover:bg-violet-600 disabled:opacity-40 disabled:cursor-not-allowed text-white text-sm font-semibold py-2.5 rounded-lg transition-colors flex items-center justify-center gap-2"
            >
              {loading && (
                <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                </svg>
              )}
              {loading ? 'Simulating…' : 'Simulate Transaction'}
            </button>
          </form>
        )}

        {/* Error */}
        {error && (
          <div className="bg-red-900/30 border border-red-500/40 rounded-lg p-3 mb-4">
            <div className="text-red-300 text-sm font-medium mb-0.5">Simulation Failed</div>
            <div className="text-red-400/80 text-xs">{error}</div>
          </div>
        )}

        {/* Results */}
        {result && <ResultView result={result} solPriceUsd={solPriceUsd} />}

        {/* Clear / empty state */}
        {result && (
          <button
            onClick={clear}
            className="mt-4 w-full text-xs text-gray-600 hover:text-gray-400 transition-colors py-1"
          >
            ← Simulate another transaction
          </button>
        )}

        {!result && !loading && !error && !preloadTx && (
          <div className="text-center py-8 text-gray-600 text-sm">
            <div className="text-3xl mb-3">🔬</div>
            <p>Paste a base64 transaction above to simulate it before signing</p>
          </div>
        )}
      </div>
    </div>
  );
}
