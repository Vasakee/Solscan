import { useMemo } from 'react';

// Legacy hook — kept for backward compatibility with existing tests.
// New code should use useSwapPnL (hooks/useSwapPnL.ts) which calls the
// full async PnL engine in src/utils/pnl.ts.
export function usePnL(transactions, solPrice) {
  return useMemo(() => {
    if (!transactions.length || !solPrice) {
      return { totalIn: 0, totalOut: 0, netPnl: 0, swapCount: 0 };
    }

    let totalIn = 0;
    let totalOut = 0;
    let swapCount = 0;

    transactions.forEach((tx) => {
      if (tx.err) return;
      if (tx.solDelta > 0) totalIn  += tx.solDelta * solPrice;
      else if (tx.solDelta < 0) totalOut += Math.abs(tx.solDelta) * solPrice;
      if (tx.category === 'Swap') swapCount++;
    });

    return { totalIn, totalOut, netPnl: totalIn - totalOut, swapCount };
  }, [transactions, solPrice]);
}
