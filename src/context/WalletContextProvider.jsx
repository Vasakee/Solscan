import React, { useMemo } from 'react';
import { ConnectionProvider, WalletProvider } from '@solana/wallet-adapter-react';
import { WalletModalProvider } from '@solana/wallet-adapter-react-ui';
import { SolflareWalletAdapter } from '@solana/wallet-adapter-solflare';
import { SOLANA_RPC_URL, rpcFetch } from '../config/rpc';

// Import wallet adapter styles
import '@solana/wallet-adapter-react-ui/styles.css';

export default function WalletContextProvider({ children }) {
  const wallets = useMemo(() => [new SolflareWalletAdapter()], []);
  const connectionConfig = useMemo(() => ({ fetch: rpcFetch }), []);

  return (
    <ConnectionProvider endpoint={SOLANA_RPC_URL} config={connectionConfig}>
      <WalletProvider wallets={wallets} autoConnect={false}>
        <WalletModalProvider>
          {children}
        </WalletModalProvider>
      </WalletProvider>
    </ConnectionProvider>
  );
}
