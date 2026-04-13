import React, { useState } from 'react';
import { useRpcStatus } from '../hooks/useRpcStatus';

export default function RpcStatus() {
  const { latencyMs, status } = useRpcStatus();
  const [show, setShow] = useState(false);

  const dot = { good: 'bg-sol-teal', degraded: 'bg-yellow-400', poor: 'bg-red-400' }[status];
  const glow = { good: '0 0 6px #14F195', degraded: '0 0 6px #facc15', poor: '0 0 6px #f87171' }[status];

  return (
    <div className="relative hidden md:flex items-center">
      <button
        onMouseEnter={() => setShow(true)}
        onMouseLeave={() => setShow(false)}
        className="flex items-center gap-1.5 bg-sol-card border border-sol-border rounded-lg px-2.5 py-1.5"
        aria-label="RPC status"
      >
        <div className={`w-1.5 h-1.5 rounded-full ${dot}`} style={{ boxShadow: glow }} />
        <span className="font-num text-xs text-gray-500">
          {latencyMs != null ? `${latencyMs}ms` : '…'}
        </span>
      </button>

      {show && (
        <div className="absolute top-full right-0 mt-1.5 z-50 bg-sol-card border border-sol-border rounded-lg px-3 py-2 text-xs whitespace-nowrap shadow-xl">
          <div className="text-white font-medium mb-0.5">
            {status === 'good' ? 'RPC Healthy' : status === 'degraded' ? 'RPC Degraded' : 'RPC Poor'}
          </div>
          <div className="text-gray-500">
            {latencyMs != null ? `${latencyMs}ms latency` : 'Measuring…'}
          </div>
          <div className="text-gray-600 mt-1">Powered by QuickNode</div>
        </div>
      )}
    </div>
  );
}
