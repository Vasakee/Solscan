import { useState, useEffect, useRef } from 'react';
import { useConnection } from '@solana/wallet-adapter-react';

export type RpcHealth = 'good' | 'degraded' | 'poor';

export function useRpcStatus() {
  const { connection } = useConnection();
  const [latencyMs, setLatencyMs] = useState<number | null>(null);
  const [status, setStatus] = useState<RpcHealth>('good');
  const mountedRef = useRef(true);

  useEffect(() => {
    mountedRef.current = true;
    return () => { mountedRef.current = false; };
  }, []);

  useEffect(() => {
    async function ping() {
      const t0 = performance.now();
      try {
        await connection.getSlot();
        const ms = Math.round(performance.now() - t0);
        if (!mountedRef.current) return;
        setLatencyMs(ms);
        setStatus(ms < 300 ? 'good' : ms < 800 ? 'degraded' : 'poor');
      } catch {
        if (mountedRef.current) setStatus('poor');
      }
    }

    ping();
    const id = setInterval(ping, 30_000);
    return () => clearInterval(id);
  }, [connection]);

  return { latencyMs, status };
}
