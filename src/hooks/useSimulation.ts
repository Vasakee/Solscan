import { useState, useCallback } from 'react';
import { useConnection, useWallet } from '@solana/wallet-adapter-react';
import { VersionedTransaction, Transaction, LAMPORTS_PER_SOL } from '@solana/web3.js';
import {
  SWAP_PROGRAMS, NFT_PROGRAMS, DEFI_PROGRAMS,
  SYSTEM_PROGRAM, TOKEN_PROGRAM, TOKEN_2022, ASSOCIATED_TOKEN, COMPUTE_BUDGET,
} from '../constants/programs';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface TokenBalanceDiff {
  mint: string;
  symbol: string;
  before: number;
  after: number;
  delta: number;
}

export interface RiskFlag {
  level: 'safe' | 'warning' | 'danger';
  label: string;
  detail: string;
}

export interface SimulationResult {
  success: boolean;
  /** Network fee in SOL */
  fee: number;
  /** Fee in USD (null if SOL price unavailable) */
  feeUsd: number | null;
  /** Estimated compute units consumed */
  computeUnits: number | null;
  solBefore: number;
  solAfter: number;
  solDelta: number;
  tokenDiffs: TokenBalanceDiff[];
  programIds: string[];
  risks: RiskFlag[];
  logs: string[];
  /** Raw simulation error object, if any */
  simError: unknown;
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const ALL_KNOWN = new Set([
  ...SWAP_PROGRAMS, ...NFT_PROGRAMS, ...DEFI_PROGRAMS,
  SYSTEM_PROGRAM, TOKEN_PROGRAM, TOKEN_2022, ASSOCIATED_TOKEN, COMPUTE_BUDGET,
]);

function buildRiskFlags(
  programIds: string[],
  solDelta: number,
  tokenDiffs: TokenBalanceDiff[],
  simError: unknown,
): RiskFlag[] {
  const flags: RiskFlag[] = [];

  if (simError) {
    flags.push({
      level: 'danger',
      label: 'Simulation Error',
      detail: typeof simError === 'object' ? JSON.stringify(simError) : String(simError),
    });
  }

  const unverified = programIds.filter((p) => !ALL_KNOWN.has(p));
  if (unverified.length > 0) {
    flags.push({
      level: 'warning',
      label: 'Unverified Program',
      detail: `${unverified[0].slice(0, 8)}… and ${unverified.length - 1} other(s) are not recognised protocols`,
    });
  }

  const semanticPrograms = programIds.filter(
    (p) => ![SYSTEM_PROGRAM, TOKEN_PROGRAM, TOKEN_2022, ASSOCIATED_TOKEN, COMPUTE_BUDGET].includes(p),
  );
  if (semanticPrograms.length > 3) {
    flags.push({
      level: 'warning',
      label: 'Many Programs Involved',
      detail: `${semanticPrograms.length} programs invoked — complex transactions carry higher risk`,
    });
  }

  if (Math.abs(solDelta) > 10) {
    flags.push({ level: 'danger',  label: 'Large SOL Transfer', detail: `${Math.abs(solDelta).toFixed(4)} SOL will change hands` });
  } else if (Math.abs(solDelta) > 1) {
    flags.push({ level: 'warning', label: 'Significant SOL Amount', detail: `${Math.abs(solDelta).toFixed(4)} SOL will change hands` });
  }

  const drains = tokenDiffs.filter((t) => t.delta < 0);
  if (drains.length > 3) {
    flags.push({ level: 'danger', label: 'Multiple Token Drains', detail: `${drains.length} tokens leaving wallet` });
  }

  if (flags.length === 0) {
    flags.push({ level: 'safe', label: 'No Risk Flags', detail: 'Transaction looks standard' });
  }

  return flags;
}

/** Parse pre/post token balances from a simulation response into diffs. */
function parseTokenDiffs(
  pre: any[],
  post: any[],
  walletIndex: number,
): TokenBalanceDiff[] {
  const diffs: TokenBalanceDiff[] = [];
  const seen = new Set<string>();

  for (const p of post) {
    if (p.accountIndex !== walletIndex) continue;
    const mint = p.mint as string;
    if (seen.has(mint)) continue;
    seen.add(mint);

    const preEntry = pre.find((x) => x.accountIndex === walletIndex && x.mint === mint);
    const before = parseFloat(preEntry?.uiTokenAmount?.uiAmountString ?? '0');
    const after  = parseFloat(p.uiTokenAmount?.uiAmountString ?? '0');
    const delta  = after - before;

    if (Math.abs(delta) < 1e-9) continue;

    diffs.push({
      mint,
      symbol: p.uiTokenAmount?.symbol ?? mint.slice(0, 6) + '…',
      before,
      after,
      delta,
    });
  }

  return diffs;
}

// ---------------------------------------------------------------------------
// Hook
// ---------------------------------------------------------------------------

export function useSimulation() {
  const { connection } = useConnection();
  const { publicKey } = useWallet();
  const [result, setResult]   = useState<SimulationResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError]     = useState<string | null>(null);

  const simulate = useCallback(async (txBase64: string | null, solPriceUsd: number | null = null) => {
    if (!publicKey) { setError('Connect your wallet first'); return; }
    if (!txBase64?.trim()) { setError('Paste a base64-encoded transaction'); return; }

    setLoading(true);
    setError(null);
    setResult(null);

    try {
      const buf = Buffer.from(txBase64.trim(), 'base64');

      let tx: VersionedTransaction | Transaction;
      let isVersioned = false;
      try {
        tx = VersionedTransaction.deserialize(buf);
        isVersioned = true;
      } catch {
        tx = Transaction.from(buf);
      }

      // Always use a fresh blockhash so stale transactions don't fail with BlockhashNotFound
      const { blockhash } = await connection.getLatestBlockhash();
      if (isVersioned) {
        (tx as VersionedTransaction).message.recentBlockhash = blockhash;
      } else {
        const legacy = tx as Transaction;
        legacy.feePayer = publicKey;
        legacy.recentBlockhash = blockhash;
      }

      const simRes = isVersioned
        ? await connection.simulateTransaction(tx as VersionedTransaction, {
            sigVerify: false,
            accounts: { encoding: 'base64', addresses: [publicKey.toString()] },
          })
        : await connection.simulateTransaction(tx as Transaction, { sigVerify: false });

      const val = simRes.value;

      // Extract program IDs
      const programIds: string[] = isVersioned
        ? (tx as VersionedTransaction).message.staticAccountKeys.map((k) => k.toString())
        : (tx as Transaction).instructions.map((ix) => ix.programId.toString());

      const uniquePrograms = [...new Set(programIds)];

      // SOL balance diff — index 0 of accounts is the fee payer
      const solBefore = (val.accounts?.[0]?.lamports ?? 0) / LAMPORTS_PER_SOL;
      const fee       = 5000 / LAMPORTS_PER_SOL; // base fee; actual may vary
      const solAfter  = solBefore - fee;
      const solDelta  = solAfter - solBefore;

      // Token diffs — wallet is account index 0 in the accounts array
      const tokenDiffs = parseTokenDiffs(
        val.preTokenBalances ?? [],
        val.postTokenBalances ?? [],
        0,
      );

      const computeUnits = val.unitsConsumed ?? null;
      const feeUsd = solPriceUsd != null ? fee * solPriceUsd : null;

      const risks = buildRiskFlags(uniquePrograms, solDelta, tokenDiffs, val.err ?? null);

      setResult({
        success: !val.err,
        fee,
        feeUsd,
        computeUnits,
        solBefore,
        solAfter,
        solDelta,
        tokenDiffs,
        programIds: uniquePrograms,
        risks,
        logs: val.logs ?? [],
        simError: val.err ?? null,
      });
    } catch (err: any) {
      const msg: string = err?.message ?? 'Simulation failed';
      // Surface user-friendly messages for common failures
      if (msg.includes('base64') || msg.includes('deserialize') || msg.includes('Invalid')) {
        setError('Invalid transaction — make sure you pasted a valid base64-encoded serialized transaction.');
      } else if (msg.includes('blockhash')) {
        setError('Blockhash expired. The transaction is too old to simulate.');
      } else {
        setError(msg);
      }
    } finally {
      setLoading(false);
    }
  }, [connection, publicKey]);

  const clear = useCallback(() => { setResult(null); setError(null); }, []);

  return { simulate, result, loading, error, clear };
}
