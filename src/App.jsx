import React, { useEffect, useState } from 'react';
import { BrowserRouter, Routes, Route, useNavigate } from 'react-router-dom';
import { useWallet } from '@solana/wallet-adapter-react';
import WalletContextProvider from './context/WalletContextProvider';
import { ToastProvider, useToast } from './context/ToastContext';
import { CurrencyProvider, useCurrency } from './context/CurrencyContext';
import ErrorBoundary from './components/ErrorBoundary';
import Header from './components/Header';
import ConnectPrompt from './components/ConnectPrompt';
import PortfolioCard from './components/PortfolioCard';
import PnLCard from './components/PnLCard';
import TransactionFeed from './components/TransactionFeed';
import SimulationPanel from './components/SimulationPanel';
import KaminoCard from './components/KaminoCard';
import SwapCard from './components/SwapCard';
import SharePage from './pages/SharePage';
import { usePortfolio } from './hooks/usePortfolio';
import { useTransactions } from './hooks/useTransactions';
import { useSolPrice } from './hooks/useSolPrice';
import { useSwapPnL } from './hooks/useSwapPnL';
import { useWebSocket } from './hooks/useWebSocket';
import { encodeSharePayload } from './utils/share';

function Dashboard() {
  const navigate = useNavigate();
  const { toast } = useToast();
  const { currency } = useCurrency();
  const { connected, publicKey } = useWallet();
  const { price: solPrice } = useSolPrice(currency);
  const { portfolio, loading: portfolioLoading, error: portfolioError, refresh: refreshPortfolio } = usePortfolio(currency);
  const { transactions, loading: txLoading, error: txError, refresh: refreshTx } = useTransactions();
  const { pnl, loading: pnlLoading } = useSwapPnL(transactions);

  const [simulateTx, setSimulateTx] = useState(null);
  const [simulateTxBase64, setSimulateTxBase64] = useState(null);
  const [activeTab, setActiveTab] = useState('overview');

  // WebSocket: live transaction notifications via QuickNode
  useWebSocket(() => {
    refreshTx();
    toast('New transaction detected', 'info');
  });

  // Page title — includes short wallet address when connected
  useEffect(() => {
    if (publicKey) {
      const short = `${publicKey.toString().slice(0, 4)}…${publicKey.toString().slice(-4)}`;
      document.title = `SolScan — ${short}`;
      let desc = document.querySelector('meta[name="description"]');
      if (desc) desc.setAttribute('content', `Solana portfolio for ${publicKey.toString()}`);
    } else {
      document.title = 'SolScan — Solana Dashboard';
    }
  }, [publicKey]);

  // Surface RPC errors as toasts
  useEffect(() => { if (portfolioError) toast(portfolioError, 'error'); }, [portfolioError]);
  useEffect(() => { if (txError)        toast(txError, 'error'); }, [txError]);

  const handleShare = () => {
    if (!publicKey || !portfolio) {
      toast('Portfolio not loaded yet', 'error');
      return;
    }
    const encoded = encodeSharePayload({
      w: publicKey.toString(),
      s: portfolio.sol,
      t: (portfolio.sol * (solPrice?.value ?? 0)) + portfolio.totalUsd,
      tk: portfolio.tokens.slice(0, 10).map((t) => ({ sym: t.symbol, bal: t.balance, usd: t.usdValue })),
      pnl: pnl.netPnl,
      swaps: pnl.tradeCount,
      ts: Math.floor(Date.now() / 1000),
      cur: currency,
    });
    navigate(`/share?data=${encoded}`);
    toast('Share link created', 'success');
  };

  const handleSimulate = (tx) => {
    setSimulateTx(tx);
    setSimulateTxBase64(null);
    setActiveTab('simulate');
  };

  const handleSimulateBase64 = (base64) => {
    setSimulateTxBase64(base64);
    setSimulateTx(null);
    setActiveTab('simulate');
  };

  const handleRefreshPortfolio = () => {
    refreshPortfolio();
    toast('Portfolio refreshed', 'success');
  };

  const handleRefreshTx = () => {
    refreshTx();
    toast('Transactions refreshed', 'success');
  };

  if (!connected) {
    return (
      <div>
        <Header />
        <main className="max-w-7xl mx-auto px-4 sm:px-6 py-8">
          <ConnectPrompt />
        </main>
      </div>
    );
  }

  return (
    <div>
      <Header onShare={handleShare} />

      {/* Tab bar */}
      <div className="border-b border-sol-border bg-sol-bg/60 backdrop-blur-sm sticky top-16 z-40">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 flex gap-1 overflow-x-auto scrollbar-none">
          {[
            { id: 'overview', label: 'Overview' },
            { id: 'swap', label: 'Swap' },
            { id: 'simulate', label: 'Simulator' },
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`px-4 py-3 text-sm font-medium border-b-2 transition-colors -mb-px whitespace-nowrap ${
                activeTab === tab.id
                  ? 'border-sol-purple text-sol-purple'
                  : 'border-transparent text-gray-500 hover:text-gray-300'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 py-6 sm:py-8">
        {activeTab === 'overview' && (
          <div className="grid grid-cols-1 xl:grid-cols-3 gap-4 sm:gap-6">
            <div className="xl:col-span-1 space-y-4 sm:space-y-6">
              <ErrorBoundary label="Portfolio failed to render">
                <PortfolioCard
                  portfolio={portfolio}
                  loading={portfolioLoading}
                  error={portfolioError}
                  solPrice={solPrice}
                  onRefresh={handleRefreshPortfolio}
                />
              </ErrorBoundary>
              <ErrorBoundary label="PnL card failed to render">
                <PnLCard
                  pnl={pnl}
                  transactions={transactions}
                  loading={txLoading || pnlLoading}
                  solPrice={solPrice}
                />
              </ErrorBoundary>
              <ErrorBoundary label="Kamino Yield">
                <KaminoCard />
              </ErrorBoundary>
            </div>
            <div className="xl:col-span-2">
              <ErrorBoundary label="Transaction feed failed to render">
                <TransactionFeed
                  transactions={transactions}
                  loading={txLoading}
                  error={txError}
                  onRefresh={handleRefreshTx}
                  onSimulate={handleSimulate}
                />
              </ErrorBoundary>
            </div>
          </div>
        )}

        {activeTab === 'swap' && (
          <div className="max-w-2xl mx-auto">
            <ErrorBoundary label="DFlow Swap">
              <SwapCard onSimulate={handleSimulateBase64} />
            </ErrorBoundary>
          </div>
        )}

        {activeTab === 'simulate' && (
          <div className="max-w-2xl mx-auto">
            <ErrorBoundary label="Simulator failed to render">
              <SimulationPanel
                preloadTx={simulateTx}
                preloadBase64={simulateTxBase64}
                onClose={() => { setSimulateTx(null); setSimulateTxBase64(null); }}
              />
            </ErrorBoundary>
          </div>
        )}
      </main>
    </div>
  );
}

export default function App() {
  return (
    <BrowserRouter>
      <CurrencyProvider>
        <ToastProvider>
          <Routes>
            <Route path="/share" element={<SharePage />} />
            <Route
              path="*"
              element={
                <WalletContextProvider>
                  <Dashboard />
                </WalletContextProvider>
              }
            />
          </Routes>
        </ToastProvider>
      </CurrencyProvider>
    </BrowserRouter>
  );
}
