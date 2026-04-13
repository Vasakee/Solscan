import { PROXY_API } from '../config';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface TokenDelta {
  mint: string;
  symbol: string;
  delta: number;
  decimals: number;
}

export interface ParsedTx {
  signature: string;
  blockTime: Date | null;
  fee: number;
  err: unknown;
  solDelta: number;
  category: string;
  tokenDeltas: TokenDelta[];
  raw?: unknown;
}

export interface SwapLeg {
  mint: string;
  symbol: string;
  amount: number;   // absolute value
  usdValue: number; // amount * price; 0 if price unavailable
  priceUsd: number; // per-token price; 0 if unavailable
}

export interface SwapResult {
  signature: string;
  timestamp: Date | null;
  tokenIn: SwapLeg;
  tokenOut: SwapLeg;
  /** (valueOut - valueIn) in USD. null when either leg has no price data. */
  realizedPnlUsd: number | null;
}

export interface PnLSummary {
  totalIn: number;
  totalOut: number;
  netPnl: number;
  tradeCount: number;
  /** Swap with highest realizedPnlUsd. null if no priced swaps. */
  bestTrade: SwapResult | null;
  /** Swap with lowest realizedPnlUsd. null if no priced swaps. */
  worstTrade: SwapResult | null;
  /** Number of swaps where price data was unavailable for at least one leg. */
  unpricedCount: number;
}

// ---------------------------------------------------------------------------
// Jupiter price API
// ---------------------------------------------------------------------------

/** In-memory cache: mint → { priceUsd, ts } */
const priceCache = new Map<string, { priceUsd: number; ts: number }>();
const PRICE_TTL_MS = 60_000;

/**
 * Fetch current USD prices for a batch of token mints from Jupiter Price API v2.
 * Results are cached for PRICE_TTL_MS to avoid redundant requests.
 *
 * NOTE: Jupiter /price/v2 returns the *current* price, not the historical price
 * at the time of the transaction. For a production system, replace this with a
 * historical price feed (e.g. Birdeye /defi/history_price) keyed on blockTime.
 *
 * @param mints - Array of SPL token mint addresses.
 * @returns Map of mint → USD price. Missing entries mean price unavailable.
 */
async function fetchPrices(mints: string[]): Promise<Map<string, number>> {
  const result = new Map<string, number>();
  const now = Date.now();

  const toFetch = mints.filter((m) => {
    const cached = priceCache.get(m);
    if (cached && now - cached.ts < PRICE_TTL_MS) {
      result.set(m, cached.priceUsd);
      return false;
    }
    return true;
  });

  if (toFetch.length === 0) return result;

  try {
    const ids = toFetch.join(',');
    const url = `https://api.jup.ag/price/v2?ids=${ids}`;
    const res = await fetch(PROXY_API(url));
    if (!res.ok) return result;

    const json = await res.json();
    const data: Record<string, { price: string } | null> = json?.data ?? {};

    for (const mint of toFetch) {
      const price = parseFloat(data[mint]?.price ?? '');
      if (!isNaN(price) && price > 0) {
        priceCache.set(mint, { priceUsd: price, ts: now });
        result.set(mint, price);
      }
    }
  } catch {
    // Price fetch failed — callers handle missing entries gracefully
  }

  return result;
}

// ---------------------------------------------------------------------------
// Swap extraction
// ---------------------------------------------------------------------------

/** SOL mint address used as a synthetic mint for native SOL legs. */
const SOL_MINT = 'So11111111111111111111111111111111111111112';

/**
 * Extract the token-in and token-out legs from a parsed swap transaction.
 *
 * Strategy: use tokenDeltas (SPL changes) first. If a swap has only one SPL
 * leg, the other leg is native SOL (solDelta). If there are no SPL deltas at
 * all, treat the SOL movement as a SOL→SOL transfer and skip it.
 *
 * @param tx - A parsed transaction with category === 'Swap'.
 * @returns [inLeg, outLeg] mints+amounts, or null if the shape is unrecognisable.
 */
function extractSwapLegs(tx: ParsedTx): { inMint: string; inAmount: number; inSymbol: string; outMint: string; outAmount: number; outSymbol: string } | null {
  const debits  = tx.tokenDeltas.filter((d) => d.delta < 0);
  const credits = tx.tokenDeltas.filter((d) => d.delta > 0);

  // Standard SPL↔SPL swap
  if (debits.length >= 1 && credits.length >= 1) {
    const inn = debits[0];
    const out = credits[0];
    return {
      inMint: inn.mint, inAmount: Math.abs(inn.delta), inSymbol: inn.symbol,
      outMint: out.mint, outAmount: out.delta, outSymbol: out.symbol,
    };
  }

  // SOL→SPL: solDelta < 0, one SPL credit
  if (debits.length === 0 && credits.length >= 1 && tx.solDelta < 0) {
    const out = credits[0];
    return {
      inMint: SOL_MINT, inAmount: Math.abs(tx.solDelta), inSymbol: 'SOL',
      outMint: out.mint, outAmount: out.delta, outSymbol: out.symbol,
    };
  }

  // SPL→SOL: one SPL debit, solDelta > 0
  if (debits.length >= 1 && credits.length === 0 && tx.solDelta > 0) {
    const inn = debits[0];
    return {
      inMint: inn.mint, inAmount: Math.abs(inn.delta), inSymbol: inn.symbol,
      outMint: SOL_MINT, outAmount: tx.solDelta, outSymbol: 'SOL',
    };
  }

  return null;
}

// ---------------------------------------------------------------------------
// Main engine
// ---------------------------------------------------------------------------

/**
 * Calculate realized PnL across all swap transactions.
 *
 * For each swap:
 *  1. Extract token-in / token-out legs via tokenDeltas + solDelta.
 *  2. Fetch current USD prices from Jupiter for all unique mints in one batch.
 *  3. Compute realizedPnlUsd = (outAmount × outPrice) - (inAmount × inPrice).
 *     If either price is unavailable, realizedPnlUsd is null (unpriced trade).
 *  4. Aggregate totals, find best/worst trades.
 *
 * @param transactions - Full transaction list (all categories). Non-swap and
 *   failed transactions are filtered out internally.
 * @returns PnLSummary with totals, best/worst trade, and unpriced count.
 */
export async function calculatePnL(transactions: ParsedTx[]): Promise<PnLSummary> {
  const swaps = transactions.filter((tx) => tx.category === 'Swap' && !tx.err);

  if (swaps.length === 0) {
    return { totalIn: 0, totalOut: 0, netPnl: 0, tradeCount: 0, bestTrade: null, worstTrade: null, unpricedCount: 0 };
  }

  // Collect all unique mints across all swaps for a single batched price fetch
  const allMints = new Set<string>();
  const legMap = new Map<string, ReturnType<typeof extractSwapLegs>>();

  for (const tx of swaps) {
    const legs = extractSwapLegs(tx);
    legMap.set(tx.signature, legs);
    if (legs) {
      allMints.add(legs.inMint);
      allMints.add(legs.outMint);
    }
  }

  const prices = await fetchPrices([...allMints]);

  // Build SwapResult for each swap
  const results: SwapResult[] = [];
  let totalIn = 0;
  let totalOut = 0;
  let unpricedCount = 0;

  for (const tx of swaps) {
    const legs = legMap.get(tx.signature);
    if (!legs) continue;

    const inPrice  = prices.get(legs.inMint)  ?? 0;
    const outPrice = prices.get(legs.outMint) ?? 0;
    const inValue  = legs.inAmount  * inPrice;
    const outValue = legs.outAmount * outPrice;
    const hasPrices = inPrice > 0 && outPrice > 0;

    const swap: SwapResult = {
      signature: tx.signature,
      timestamp: tx.blockTime,
      tokenIn:  { mint: legs.inMint,  symbol: legs.inSymbol,  amount: legs.inAmount,  usdValue: inValue,  priceUsd: inPrice  },
      tokenOut: { mint: legs.outMint, symbol: legs.outSymbol, amount: legs.outAmount, usdValue: outValue, priceUsd: outPrice },
      realizedPnlUsd: hasPrices ? outValue - inValue : null,
    };

    results.push(swap);

    if (hasPrices) {
      totalIn  += inValue;
      totalOut += outValue;
    } else {
      unpricedCount++;
    }
  }

  const pricedResults = results.filter((r) => r.realizedPnlUsd !== null);

  const bestTrade  = pricedResults.length > 0
    ? pricedResults.reduce((a, b) => (b.realizedPnlUsd! > a.realizedPnlUsd! ? b : a))
    : null;

  const worstTrade = pricedResults.length > 0
    ? pricedResults.reduce((a, b) => (b.realizedPnlUsd! < a.realizedPnlUsd! ? b : a))
    : null;

  return {
    totalIn,
    totalOut,
    netPnl: totalOut - totalIn,
    tradeCount: results.length,
    bestTrade,
    worstTrade,
    unpricedCount,
  };
}
