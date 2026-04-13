import { useState, useEffect, useRef, useCallback } from 'react';
import { useConnection, useWallet } from '@solana/wallet-adapter-react';
import { LAMPORTS_PER_SOL } from '@solana/web3.js';
import { TX_CACHE_TTL } from '../config';
import { categorizeTransaction } from '../utils/categorize';

const txCache = {};

function parseTx(tx, walletAddress) {
  const signature = tx.transaction?.signatures?.[0] || '';
  const blockTime = tx.blockTime ? new Date(tx.blockTime * 1000) : null;
  const fee = (tx.meta?.fee || 0) / LAMPORTS_PER_SOL;
  const err = tx.meta?.err;

  const accounts = tx.transaction?.message?.accountKeys || [];
  const walletIdx = accounts.findIndex(
    (a) => a.pubkey?.toString() === walletAddress || a.toString() === walletAddress
  );

  const preBalances = tx.meta?.preBalances || [];
  const postBalances = tx.meta?.postBalances || [];

  let solDelta = 0;
  if (walletIdx >= 0) {
    solDelta = ((postBalances[walletIdx] || 0) - (preBalances[walletIdx] || 0)) / LAMPORTS_PER_SOL;
  }

  // Find counterparty (first non-wallet, non-program account)
  let counterparty = null;
  for (let i = 0; i < accounts.length; i++) {
    if (i === walletIdx) continue;
    const addr = accounts[i].pubkey?.toString() || accounts[i].toString();
    if (addr && addr !== '11111111111111111111111111111111') {
      counterparty = addr;
      break;
    }
  }

  // Token balance changes
  const preTokenBals = tx.meta?.preTokenBalances || [];
  const postTokenBals = tx.meta?.postTokenBalances || [];
  const tokenDeltas = [];

  postTokenBals.forEach((post) => {
    const pre = preTokenBals.find(
      (p) => p.accountIndex === post.accountIndex && p.mint === post.mint
    );
    const preAmt = parseFloat(pre?.uiTokenAmount?.uiAmountString || '0');
    const postAmt = parseFloat(post.uiTokenAmount?.uiAmountString || '0');
    const delta = postAmt - preAmt;
    if (Math.abs(delta) > 0.000001) {
      tokenDeltas.push({
        mint: post.mint,
        symbol: post.uiTokenAmount?.symbol || post.mint.slice(0, 6) + '…',
        delta,
        decimals: post.uiTokenAmount?.decimals || 0,
      });
    }
  });

  const category = categorizeTransaction(tx);

  return {
    signature,
    blockTime,
    fee,
    err,
    solDelta,
    counterparty,
    tokenDeltas,
    category,
    raw: tx,
  };
}

export function useTransactions() {
  const { connection } = useConnection();
  const { publicKey } = useWallet();
  const [transactions, setTransactions] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const mountedRef = useRef(true);

  useEffect(() => {
    mountedRef.current = true;
    return () => { mountedRef.current = false; };
  }, []);

  const fetchTransactions = useCallback(async (force = false) => {
    if (!publicKey) return;

    const cacheKey = publicKey.toString();
    const now = Date.now();
    if (!force && txCache[cacheKey] && now - txCache[cacheKey].ts < TX_CACHE_TTL) {
      setTransactions(txCache[cacheKey].data);
      return;
    }

    try {
      setLoading(true);
      setError(null);

      // Get last 50 signatures
      const signatures = await connection.getSignaturesForAddress(publicKey, { limit: 50 });

      if (!signatures.length) {
        if (mountedRef.current) setTransactions([]);
        return;
      }

      // Fetch parsed transactions in batches
      const sigs = signatures.map((s) => s.signature);
      const batchSize = 10;
      const parsed = [];

      for (let i = 0; i < sigs.length; i += batchSize) {
        const batch = sigs.slice(i, i + batchSize);
        try {
          const txs = await connection.getParsedTransactions(batch, {
            maxSupportedTransactionVersion: 0,
          });
          txs.forEach((tx) => {
            if (tx) parsed.push(parseTx(tx, publicKey.toString()));
          });
        } catch {
          // skip failed batch
        }
      }

      txCache[cacheKey] = { data: parsed, ts: Date.now() };

      if (mountedRef.current) setTransactions(parsed);
    } catch (err) {
      if (mountedRef.current) setError(err.message || 'Failed to load transactions');
    } finally {
      if (mountedRef.current) setLoading(false);
    }
  }, [publicKey, connection]);

  useEffect(() => {
    if (publicKey) {
      fetchTransactions();
    } else {
      setTransactions([]);
    }
  }, [publicKey, fetchTransactions]);

  const refresh = () => {
    if (publicKey) delete txCache[publicKey.toString()];
    fetchTransactions(true);
  };

  return { transactions, loading, error, refresh };
}
