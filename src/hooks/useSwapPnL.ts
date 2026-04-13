import { useState, useEffect } from 'react';
import { calculatePnL } from '../utils/pnl';
import type { ParsedTx, PnLSummary } from '../utils/pnl';

const EMPTY: PnLSummary = {
  totalIn: 0, totalOut: 0, netPnl: 0,
  tradeCount: 0, bestTrade: null, worstTrade: null, unpricedCount: 0,
};

/**
 * Async hook that runs the PnL engine whenever the transaction list changes.
 * Returns the latest PnLSummary plus a loading flag for the price-fetch phase.
 */
export function useSwapPnL(transactions: ParsedTx[]) {
  const [pnl, setPnl]       = useState<PnLSummary>(EMPTY);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!transactions.length) { setPnl(EMPTY); return; }

    let cancelled = false;
    setLoading(true);

    calculatePnL(transactions).then((result) => {
      if (!cancelled) { setPnl(result); setLoading(false); }
    }).catch(() => {
      if (!cancelled) setLoading(false);
    });

    return () => { cancelled = true; };
  }, [transactions]);

  return { pnl, loading };
}
