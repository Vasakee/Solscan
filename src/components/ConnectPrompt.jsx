import React from 'react';
import { WalletMultiButton } from '@solana/wallet-adapter-react-ui';

export default function ConnectPrompt() {
  return (
    <div className="flex flex-col items-center justify-center min-h-[70vh] px-4 text-center">
      {/* Glowing orb */}
      <div className="relative mb-10">
        <div className="absolute inset-0 rounded-full bg-sol-purple opacity-20 blur-3xl scale-150" />
        <div className="relative w-28 h-28 rounded-full bg-gradient-to-br from-sol-purple via-violet-600 to-sol-teal flex items-center justify-center shadow-2xl glow-purple">
          <svg viewBox="0 0 24 24" className="w-14 h-14" fill="none">
            <path
              d="M21 18.5L12.5 21L3 18.5V5.5L12.5 3L21 5.5V18.5Z"
              stroke="white"
              strokeWidth="1.5"
              strokeLinejoin="round"
            />
            <path d="M12.5 3V21" stroke="white" strokeWidth="1.5" strokeLinecap="round" />
            <path d="M3 12H21" stroke="white" strokeWidth="1.5" strokeLinecap="round" />
          </svg>
        </div>
      </div>

      <h1 className="text-4xl font-bold text-white mb-3 tracking-tight">
        Welcome to SolScan
      </h1>
      <p className="text-gray-400 text-lg mb-2 max-w-md">
        Your complete Solana wallet dashboard
      </p>
      <p className="text-gray-500 text-sm mb-10 max-w-sm">
        Connect your Solflare wallet to view your portfolio, track transactions, analyze PnL, and simulate transactions.
      </p>

      {/* Feature pills */}
      <div className="flex flex-wrap gap-2 justify-center mb-10">
        {[
          { icon: '◎', label: 'SOL & Token Balances' },
          { icon: '📈', label: 'PnL Tracking' },
          { icon: '🔁', label: 'Transaction History' },
          { icon: '🔬', label: 'Tx Simulation' },
          { icon: '🌿', label: 'Kamino Yield Tracking' },
          { icon: '⇄', label: 'DFlow MEV-Protected Swaps' },
          { icon: '⚡', label: 'Live Updates via QuickNode' },
          { icon: '🖼', label: 'NFT Holdings via QuickNode DAS' },
        ].map(({ icon, label }) => (
          <div
            key={label}
            className="flex items-center gap-2 bg-sol-card border border-sol-border rounded-full px-4 py-2 text-sm text-gray-300"
          >
            <span>{icon}</span>
            <span>{label}</span>
          </div>
        ))}
      </div>

      <WalletMultiButton
        style={{
          background: 'linear-gradient(135deg, #9945FF, #7A31D4)',
          borderRadius: '12px',
          fontSize: '16px',
          fontFamily: 'Inter, sans-serif',
          fontWeight: '600',
          height: '52px',
          padding: '0 32px',
          border: 'none',
          boxShadow: '0 0 30px #9945FF44',
        }}
      />

      <p className="text-gray-600 text-xs mt-6">
        Read-only view — no signing required to browse
      </p>
    </div>
  );
}
