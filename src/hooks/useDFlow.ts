import { useState, useCallback } from 'react';
import { useWallet, useConnection } from '@solana/wallet-adapter-react';
import { VersionedTransaction } from '@solana/web3.js';

const JUPITER_BASE = 'https://api.jup.ag/swap/v1';

export interface DFlowQuote {
  inputMint: string;
  outputMint: string;
  inAmount: string;
  outAmount: string;
  priceImpactPct: number;
  routePlan: string[];
  swapTransaction: string; // base64
  _raw?: unknown; // full Jupiter quote response for /swap POST
}

export function useDFlow() {
  const { publicKey, signTransaction } = useWallet();
  const { connection } = useConnection();
  const [quote, setQuote] = useState<DFlowQuote | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const getQuote = useCallback(async (
    inputMint: string,
    outputMint: string,
    amount: number,
  ) => {
    if (!publicKey) { setError('Connect wallet first'); return null; }
    setLoading(true);
    setError(null);
    setQuote(null);
    try {
      const params = new URLSearchParams({
        inputMint,
        outputMint,
        amount: String(Math.round(amount)),
        slippageBps: '50',
        restrictIntermediateTokens: 'true',
      });
      const res = await fetch(`${JUPITER_BASE}/quote?${params}`);
      if (!res.ok) throw new Error(`DFlow quote failed: ${res.status}`);
      const data = await res.json();
      const q: DFlowQuote = {
        inputMint,
        outputMint,
        inAmount: data.inAmount ?? String(amount),
        outAmount: data.outAmount ?? '0',
        priceImpactPct: parseFloat(data.priceImpactPct ?? '0'),
        routePlan: data.routePlan?.map((r: any) => r.swapInfo?.label ?? r.label ?? '') ?? [],
        swapTransaction: data.swapTransaction ?? '',
        _raw: data,
      };
      setQuote(q);
      return q;
    } catch (err: any) {
      setError(err.message ?? 'Quote failed');
      return null;
    } finally {
      setLoading(false);
    }
  }, [publicKey]);

  /** Returns the base64 transaction for simulation, or executes it if sign=true */
  const executeSwap = useCallback(async (q: DFlowQuote): Promise<string | null> => {
    if (!publicKey || !signTransaction) { setError('Wallet not connected'); return null; }
    setLoading(true);
    setError(null);
    try {
      // Always fetch swap tx from Jupiter using the full raw quote response
      const swapRes = await fetch(`${JUPITER_BASE}/swap`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ quoteResponse: q._raw ?? q, userPublicKey: publicKey.toString() }),
      });
      if (!swapRes.ok) throw new Error(`Swap tx fetch failed: ${swapRes.status}`);
      const swapData = await swapRes.json();
      const swapTxBase64: string = swapData.swapTransaction;
      const buf = Buffer.from(swapTxBase64, 'base64');
      let tx = VersionedTransaction.deserialize(buf);
      const { blockhash } = await connection.getLatestBlockhash();
      tx.message.recentBlockhash = blockhash;
      const signed = await signTransaction(tx as any);
      const sig = await connection.sendRawTransaction((signed as any).serialize());
      await connection.confirmTransaction(sig, 'confirmed');
      return sig;
    } catch (err: any) {
      setError(err.message ?? 'Swap failed');
      return null;
    } finally {
      setLoading(false);
    }
  }, [publicKey, signTransaction, connection]);

  return { quote, getQuote, executeSwap, loading, error, clearQuote: () => setQuote(null) };
}
