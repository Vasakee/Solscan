import { useState, useEffect, useRef } from 'react';
import { useWallet, useConnection } from '@solana/wallet-adapter-react';
import { PublicKey } from '@solana/web3.js';
import { PROXY_API } from '../config';

export interface KaminoPosition {
  market: string;
  symbol: string;
  deposited: number;
  borrowed: number;
  apy: number;
  healthFactor: number | null;
  marketUrl: string;
}

export interface KaminoOpportunity {
  name: string;
  apy: number;
  tvl: number;
  url: string;
}

const cache: { data: { positions: KaminoPosition[]; opportunities: KaminoOpportunity[] }; ts: number } | null = null;
let _cache = cache;
const TTL = 60_000;

export function useKamino() {
  const { publicKey } = useWallet();
  const [positions, setPositions] = useState<KaminoPosition[]>([]);
  const [opportunities, setOpportunities] = useState<KaminoOpportunity[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const mountedRef = useRef(true);

  useEffect(() => {
    mountedRef.current = true;
    return () => { mountedRef.current = false; };
  }, []);

  useEffect(() => {
    if (_cache && Date.now() - _cache.ts < TTL) {
      setPositions(_cache.data.positions);
      setOpportunities(_cache.data.opportunities);
      return;
    }

    setLoading(true);
    setError(null);

    async function load() {
      try {
        // Fetch top markets for opportunities
        const marketsRes = await fetch(PROXY_API('https://api.kamino.finance/kamino-market/markets'));
        const markets = marketsRes.ok ? await marketsRes.json() : [];

        const opportunities: KaminoOpportunity[] = (Array.isArray(markets) ? markets : [])
          .slice(0, 3)
          .map((m: any) => ({
            name: m.name ?? m.lendingMarket ?? 'Kamino Market',
            apy: parseFloat(m.supplyInterestAPY ?? m.apy ?? 0) * 100,
            tvl: parseFloat(m.totalValueLocked ?? m.tvl ?? 0),
            url: `https://app.kamino.finance/lending/${m.lendingMarket ?? ''}`,
          }));

        let userPositions: KaminoPosition[] = [];

        if (publicKey) {
          const posRes = await fetch(
            PROXY_API(`https://api.kamino.finance/user-metadata/${publicKey.toString()}/obligations`)
          );
          if (posRes.ok) {
            const posData = await posRes.json();
            userPositions = (Array.isArray(posData) ? posData : []).map((o: any) => ({
              market: o.lendingMarket ?? '',
              symbol: o.symbol ?? o.collateralMint?.slice(0, 6) ?? 'Unknown',
              deposited: parseFloat(o.depositedValue ?? o.deposited ?? 0),
              borrowed: parseFloat(o.borrowedValue ?? o.borrowed ?? 0),
              apy: parseFloat(o.supplyAPY ?? o.apy ?? 0) * 100,
              healthFactor: o.loanToValue ? 1 / parseFloat(o.loanToValue) : null,
              marketUrl: `https://app.kamino.finance/lending/${o.lendingMarket ?? ''}`,
            }));
          }
        }

        const result = { positions: userPositions, opportunities };
        _cache = { data: result, ts: Date.now() };

        if (mountedRef.current) {
          setPositions(userPositions);
          setOpportunities(opportunities);
          setLoading(false);
        }
      } catch (err: any) {
        if (mountedRef.current) {
          setError(err.message ?? 'Failed to load Kamino data');
          setLoading(false);
        }
      }
    }

    load();
  }, [publicKey?.toString()]); // eslint-disable-line react-hooks/exhaustive-deps

  return { positions, opportunities, loading, error };
}
