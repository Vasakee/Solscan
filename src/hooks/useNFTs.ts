import { useState, useEffect, useRef } from 'react';
import { useWallet } from '@solana/wallet-adapter-react';
import { SOLANA_RPC_URL } from '../config/rpc';

export interface NFTItem {
  mint: string;
  name: string;
  image: string;
  collection: string;
}

const cache: Record<string, { data: NFTItem[]; ts: number }> = {};
const TTL = 60_000;

export function useNFTs() {
  const { publicKey } = useWallet();
  const [nfts, setNfts] = useState<NFTItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const mountedRef = useRef(true);

  useEffect(() => {
    mountedRef.current = true;
    return () => { mountedRef.current = false; };
  }, []);

  useEffect(() => {
    if (!publicKey) { setNfts([]); return; }

    const key = publicKey.toString();
    if (cache[key] && Date.now() - cache[key].ts < TTL) {
      setNfts(cache[key].data);
      return;
    }

    setLoading(true);
    setError(null);

    fetch(SOLANA_RPC_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        jsonrpc: '2.0',
        id: 1,
        method: 'getAssetsByOwner',
        params: {
          ownerAddress: key,
          page: 1,
          limit: 100,
          displayOptions: { showFungible: false, showNativeBalance: false },
        },
      }),
    })
      .then((r) => r.json())
      .then((json) => {
        const items: NFTItem[] = (json?.result?.items ?? []).map((a: any) => ({
          mint: a.id,
          name: a.content?.metadata?.name ?? 'Unknown NFT',
          image: a.content?.links?.image ?? '',
          collection: a.grouping?.find((g: any) => g.group_key === 'collection')?.group_value ?? '',
        }));
        cache[key] = { data: items, ts: Date.now() };
        if (mountedRef.current) { setNfts(items); setLoading(false); }
      })
      .catch((err) => {
        if (mountedRef.current) { setError(err.message); setLoading(false); }
      });
  }, [publicKey?.toString()]); // eslint-disable-line react-hooks/exhaustive-deps

  return { nfts, loading, error };
}
