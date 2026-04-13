import React from 'react';
import { WalletMultiButton } from '@solana/wallet-adapter-react-ui';
import { useWallet } from '@solana/wallet-adapter-react';
import { useSolPrice } from '../hooks/useSolPrice';
import { useCurrency, CURRENCIES } from '../context/CurrencyContext';
import RpcStatus from './RpcStatus';

function PriceTag({ price }) {
  const { fmt } = useCurrency();
  if (!price) return null;
  const up = price.change24h >= 0;
  return (
    <div className="hidden sm:flex items-center gap-2 bg-sol-card border border-sol-border rounded-lg px-3 py-1.5">
      <span className="text-gray-400 text-xs">SOL</span>
      <span className="font-num text-sm font-medium text-white">{fmt(price.value)}</span>
      <span className={`font-num text-xs ${up ? 'text-sol-teal' : 'text-red-400'}`}>
        {up ? '+' : ''}{price.change24h.toFixed(2)}%
      </span>
    </div>
  );
}

function CurrencySwitcher() {
  const { currency, setCurrency } = useCurrency();
  return (
    <select
      value={currency}
      onChange={(e) => setCurrency(e.target.value)}
      className="bg-sol-card border border-sol-border text-gray-400 text-xs rounded-lg px-2 py-1.5 focus:outline-none focus:border-sol-purple transition-colors cursor-pointer"
      aria-label="Select currency"
    >
      {Object.entries(CURRENCIES).map(([code, { label }]) => (
        <option key={code} value={code}>{label}</option>
      ))}
    </select>
  );
}

export default function Header({ onShare = null }) {
  const { connected, publicKey } = useWallet();
  const { currency } = useCurrency();
  const { price } = useSolPrice(currency);

  const shortAddress = publicKey
    ? `${publicKey.toString().slice(0, 4)}…${publicKey.toString().slice(-4)}`
    : null;

  return (
    <header className="sticky top-0 z-50 border-b border-sol-border bg-sol-bg/90 backdrop-blur-sm">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between">
        {/* Logo */}
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-sol-purple to-sol-teal flex items-center justify-center shadow-lg glow-purple">
            <svg viewBox="0 0 24 24" className="w-5 h-5" fill="none">
              <path d="M4 18h16M4 12h12M4 6h16" stroke="white" strokeWidth="2.5" strokeLinecap="round" />
            </svg>
          </div>
          <div>
            <span className="text-white font-bold text-lg tracking-tight">SolScan</span>
            <span className="ml-2 text-xs text-gray-500 font-mono hidden sm:inline">mainnet-beta</span>
          </div>
        </div>

        {/* Right side */}
        <div className="flex items-center gap-2 sm:gap-3">
          <PriceTag price={price} />
          <CurrencySwitcher />
          <RpcStatus />

          {connected && shortAddress && (
            <div className="hidden md:flex items-center gap-1.5 bg-sol-card border border-sol-border rounded-lg px-3 py-1.5">
              <div className="w-1.5 h-1.5 rounded-full bg-sol-teal animate-pulse-slow" />
              <span className="font-num text-xs text-gray-400">{shortAddress}</span>
            </div>
          )}

          {connected && onShare && (
            <button
              onClick={onShare}
              className="hidden sm:flex items-center gap-1.5 bg-sol-card border border-sol-border hover:border-sol-purple text-gray-400 hover:text-sol-purple text-xs font-medium px-3 py-1.5 rounded-lg transition-colors"
              title="Share portfolio"
            >
              <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.368 2.684 3 3 0 00-5.368-2.684z" />
              </svg>
              Share
            </button>
          )}

          <WalletMultiButton
            style={{
              background: 'linear-gradient(135deg, #9945FF, #7A31D4)',
              borderRadius: '8px',
              fontSize: '14px',
              fontFamily: 'Inter, sans-serif',
              fontWeight: '600',
              height: '36px',
              padding: '0 16px',
              border: 'none',
              boxShadow: '0 0 20px #9945FF33',
            }}
          />
        </div>
      </div>
    </header>
  );
}
