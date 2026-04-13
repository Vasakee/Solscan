import { useState, useEffect, useRef } from 'react';
import { PROXY_API, PRICE_CACHE_TTL } from '../config';

// Cache keyed by currency so switching doesn't serve stale data
const cache = {};

export function useSolPrice(currency = 'usd') {
  const cacheKey = currency;
  const [price, setPrice] = useState(cache[cacheKey]?.price || null);
  const [loading, setLoading] = useState(!cache[cacheKey]?.price);
  const [error, setError] = useState(null);
  const mountedRef = useRef(true);

  useEffect(() => {
    mountedRef.current = true;
    return () => { mountedRef.current = false; };
  }, []);

  useEffect(() => {
    const now = Date.now();
    const cached = cache[cacheKey];
    if (cached && now - cached.ts < PRICE_CACHE_TTL) {
      setPrice(cached.price);
      setLoading(false);
      return;
    }

    async function fetchPrice() {
      try {
        setLoading(true);
        const url = `https://api.coingecko.com/api/v3/simple/price?ids=solana&vs_currencies=${currency}&include_24hr_change=true`;
        const res = await fetch(PROXY_API(url));
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const data = await res.json();
        const p = {
          value: data?.solana?.[currency] ?? 0,
          change24h: data?.solana?.[`${currency}_24h_change`] ?? 0,
        };
        cache[cacheKey] = { price: p, ts: Date.now() };
        if (mountedRef.current) { setPrice(p); setError(null); }
      } catch (err) {
        if (mountedRef.current) setError(err.message);
      } finally {
        if (mountedRef.current) setLoading(false);
      }
    }

    fetchPrice();
    const interval = setInterval(fetchPrice, PRICE_CACHE_TTL);
    return () => clearInterval(interval);
  }, [currency, cacheKey]);

  return { price, loading, error };
}
