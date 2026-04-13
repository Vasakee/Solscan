import { useEffect, useRef } from 'react';
import { useWallet } from '@solana/wallet-adapter-react';
import { SOLANA_RPC_URL } from '../config/rpc';

const WSS_URL = SOLANA_RPC_URL.replace(/^https/, 'wss');

/**
 * Subscribes to accountNotifications for the connected wallet over QuickNode WSS.
 * Calls onNewTransaction whenever a notification arrives.
 * Auto-reconnects on close/error with 2s backoff.
 */
export function useWebSocket(onNewTransaction: () => void) {
  const { publicKey } = useWallet();
  const wsRef = useRef<WebSocket | null>(null);
  const subIdRef = useRef<number | null>(null);
  const reconnectTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const mountedRef = useRef(true);

  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
      if (reconnectTimer.current) clearTimeout(reconnectTimer.current);
      wsRef.current?.close();
    };
  }, []);

  useEffect(() => {
    if (!publicKey) return;

    let id = 0; // incrementing request id

    function connect() {
      if (!mountedRef.current) return;
      const ws = new WebSocket(WSS_URL);
      wsRef.current = ws;

      ws.onopen = () => {
        id++;
        subIdRef.current = id;
        ws.send(JSON.stringify({
          jsonrpc: '2.0',
          id,
          method: 'accountSubscribe',
          params: [
            publicKey!.toString(),
            { encoding: 'base64', commitment: 'confirmed' },
          ],
        }));
      };

      ws.onmessage = (ev) => {
        try {
          const msg = JSON.parse(ev.data as string);
          // Ignore subscription confirmation; fire on actual notifications
          if (msg.method === 'accountNotification') {
            onNewTransaction();
          }
        } catch { /* ignore parse errors */ }
      };

      ws.onclose = () => {
        if (mountedRef.current) {
          reconnectTimer.current = setTimeout(connect, 2000);
        }
      };

      ws.onerror = () => ws.close();
    }

    connect();

    return () => {
      if (reconnectTimer.current) clearTimeout(reconnectTimer.current);
      wsRef.current?.close();
    };
  }, [publicKey?.toString()]); // eslint-disable-line react-hooks/exhaustive-deps
}
