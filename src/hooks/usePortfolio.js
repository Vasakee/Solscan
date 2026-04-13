import { useState, useEffect, useRef } from 'react';
import { useConnection, useWallet } from '@solana/wallet-adapter-react';
import { LAMPORTS_PER_SOL, PublicKey } from '@solana/web3.js';
import { PROXY_API, BALANCE_CACHE_TTL } from '../config';

// Token metadata from Jupiter
const tokenCache = {};
const portfolioCache = {};

async function fetchTokenMetadata(mints) {
  const unknown = mints.filter((m) => !tokenCache[m]);
  if (!unknown.length) return;

  try {
    const url = 'https://tokens.jup.ag/tokens?tags=verified';
    const res = await fetch(PROXY_API(url));
    if (!res.ok) return;
    const tokens = await res.json();
    tokens.forEach((t) => {
      tokenCache[t.address] = {
        symbol: t.symbol,
        name: t.name,
        decimals: t.decimals,
        logoURI: t.logoURI,
      };
    });
  } catch (e) {
    // silently fail — use mint address as fallback
  }
}

async function fetchTokenPrices(mints, currency) {
  if (!mints.length) return {};
  try {
    const ids = mints.join(',');
    const url = `https://api.coingecko.com/api/v3/simple/token_price/solana?contract_addresses=${ids}&vs_currencies=${currency}`;
    const res = await fetch(PROXY_API(url));
    if (!res.ok) return {};
    return await res.json();
  } catch {
    return {};
  }
}

export function usePortfolio(currency = 'usd') {
  const { connection } = useConnection();
  const { publicKey } = useWallet();
  const [portfolio, setPortfolio] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [refreshTick, setRefreshTick] = useState(0);
  const mountedRef = useRef(true);

  useEffect(() => {
    mountedRef.current = true;
    return () => { mountedRef.current = false; };
  }, []);

  useEffect(() => {
    if (!publicKey) {
      setPortfolio(null);
      return;
    }

    // Cache key includes currency so switching re-fetches prices
    const cacheKey = `${publicKey.toString()}-${currency}`;
    const now = Date.now();
    if (portfolioCache[cacheKey] && now - portfolioCache[cacheKey].ts < BALANCE_CACHE_TTL) {
      setPortfolio(portfolioCache[cacheKey].data);
      return;
    }

    async function fetchPortfolio() {
      try {
        setLoading(true);
        setError(null);

        // Fetch SOL balance
        const lamports = await connection.getBalance(publicKey);
        const solBalance = lamports / LAMPORTS_PER_SOL;

        // Fetch SPL token accounts
        const tokenAccounts = await connection.getParsedTokenAccountsByOwner(publicKey, {
          programId: new PublicKey('TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA'),
        });

        const tokens = tokenAccounts.value
          .map((acc) => {
            const info = acc.account.data.parsed.info;
            const amount = info.tokenAmount;
            return {
              mint: info.mint,
              balance: parseFloat(amount.uiAmountString || '0'),
              decimals: amount.decimals,
              raw: amount.amount,
            };
          })
          .filter((t) => t.balance > 0);

        const mints = tokens.map((t) => t.mint);
        await fetchTokenMetadata(mints);

        const prices = await fetchTokenPrices(mints, currency);

        const tokenRows = tokens.map((t) => {
          const meta = tokenCache[t.mint] || {};
          const priceData = prices[t.mint.toLowerCase()];
          const tokenPrice = priceData?.[currency] || 0;
          const tokenValue = t.balance * tokenPrice;
          return {
            mint: t.mint,
            symbol: meta.symbol || t.mint.slice(0, 6) + '…',
            name: meta.name || 'Unknown Token',
            logoURI: meta.logoURI || null,
            balance: t.balance,
            decimals: t.decimals,
            usdPrice: tokenPrice,
            usdValue: tokenValue,
          };
        }).sort((a, b) => b.usdValue - a.usdValue);

        const result = {
          sol: solBalance,
          tokens: tokenRows,
          totalUsd: tokenRows.reduce((sum, t) => sum + t.usdValue, 0),
        };

        portfolioCache[cacheKey] = { data: result, ts: Date.now() };

        if (mountedRef.current) {
          setPortfolio(result);
        }
      } catch (err) {
        if (mountedRef.current) setError(err.message || 'Failed to load portfolio');
      } finally {
        if (mountedRef.current) setLoading(false);
      }
    }

    fetchPortfolio();
  }, [publicKey, connection, refreshTick, currency]);

  const refresh = () => {
    if (publicKey) {
      // Clear all currency variants for this wallet
      Object.keys(portfolioCache).forEach((k) => {
        if (k.startsWith(publicKey.toString())) delete portfolioCache[k];
      });
    }
    setRefreshTick((t) => t + 1);
  };

  return { portfolio, loading, error, refresh };
}
