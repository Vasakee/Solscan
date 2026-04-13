import React from 'react';
import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

// ──────────────────────────────────────────────────────────────────────────────
// Mock wallet adapter hooks so components don't need a real Solana connection
// ──────────────────────────────────────────────────────────────────────────────
vi.mock('@solana/wallet-adapter-react', () => ({
  useWallet: () => ({ connected: false, publicKey: null }),
  useConnection: () => ({ connection: {} }),
  ConnectionProvider: ({ children }) => children,
  WalletProvider: ({ children }) => children,
}));

vi.mock('@solana/wallet-adapter-react-ui', () => ({
  WalletModalProvider: ({ children }) => children,
  WalletMultiButton: () => <button>Connect Wallet</button>,
}));

// ──────────────────────────────────────────────────────────────────────────────
// ConnectPrompt
// ──────────────────────────────────────────────────────────────────────────────
import ConnectPrompt from '../components/ConnectPrompt';

describe('ConnectPrompt', () => {
  it('renders welcome heading', () => {
    render(<ConnectPrompt />);
    expect(screen.getByText('Welcome to SolScan')).toBeInTheDocument();
  });

  it('renders connect wallet button', () => {
    render(<ConnectPrompt />);
    expect(screen.getByRole('button', { name: /connect wallet/i })).toBeInTheDocument();
  });

  it('renders feature pills', () => {
    render(<ConnectPrompt />);
    expect(screen.getByText('SOL & Token Balances')).toBeInTheDocument();
    expect(screen.getByText('PnL Tracking')).toBeInTheDocument();
    expect(screen.getByText('Transaction History')).toBeInTheDocument();
    expect(screen.getByText('Tx Simulation')).toBeInTheDocument();
  });
});

// ──────────────────────────────────────────────────────────────────────────────
// PortfolioCard
// ──────────────────────────────────────────────────────────────────────────────
import PortfolioCard from '../components/PortfolioCard';

describe('PortfolioCard', () => {
  const defaultProps = {
    portfolio: null,
    loading: false,
    error: null,
    solPrice: { usd: 150, change24h: 2.5 },
    onRefresh: vi.fn(),
  };

  it('renders Portfolio heading', () => {
    render(<PortfolioCard {...defaultProps} />);
    expect(screen.getByText('Portfolio')).toBeInTheDocument();
  });

  it('shows loading skeleton when loading=true', () => {
    render(<PortfolioCard {...defaultProps} loading={true} />);
    // The skeleton divs have class "skeleton"
    const skeletons = document.querySelectorAll('.skeleton');
    expect(skeletons.length).toBeGreaterThan(0);
  });

  it('renders SOL balance when portfolio is provided', () => {
    const portfolio = { sol: 3.5, tokens: [], totalUsd: 0 };
    render(<PortfolioCard {...defaultProps} portfolio={portfolio} />);
    expect(screen.getByText('SOL')).toBeInTheDocument();
    expect(screen.getByText('3.5')).toBeInTheDocument();
  });

  it('shows error message when error is provided', () => {
    render(<PortfolioCard {...defaultProps} error="RPC failed" />);
    expect(screen.getByText('RPC failed')).toBeInTheDocument();
  });

  it('shows no tokens message for empty token list', () => {
    const portfolio = { sol: 1, tokens: [], totalUsd: 0 };
    render(<PortfolioCard {...defaultProps} portfolio={portfolio} />);
    expect(screen.getByText('No SPL tokens found')).toBeInTheDocument();
  });

  it('calls onRefresh when refresh button clicked', async () => {
    const onRefresh = vi.fn();
    render(<PortfolioCard {...defaultProps} onRefresh={onRefresh} />);
    const btn = document.querySelector('button[title="Refresh"]');
    await userEvent.click(btn);
    expect(onRefresh).toHaveBeenCalledTimes(1);
  });

  it('renders token rows when tokens are provided', () => {
    const portfolio = {
      sol: 1,
      totalUsd: 500,
      tokens: [
        { mint: 'abc123', symbol: 'USDC', name: 'USD Coin', balance: 100, usdValue: 100, logoURI: null },
      ],
    };
    render(<PortfolioCard {...defaultProps} portfolio={portfolio} />);
    expect(screen.getByText('USDC')).toBeInTheDocument();
    expect(screen.getByText('USD Coin')).toBeInTheDocument();
  });
});

// ──────────────────────────────────────────────────────────────────────────────
// PnLCard
// ──────────────────────────────────────────────────────────────────────────────
import PnLCard from '../components/PnLCard';

describe('PnLCard', () => {
  const defaultPnl = { totalIn: 500, totalOut: 300, netPnl: 200, swapCount: 3 };
  const defaultTxs = [
    { err: null, category: 'Swap' },
    { err: null, category: 'Transfer' },
    { err: { code: 1 }, category: 'Unknown' },
  ];

  it('renders PnL & Activity heading', () => {
    render(<PnLCard pnl={defaultPnl} transactions={defaultTxs} loading={false} solPrice={{ usd: 150 }} />);
    expect(screen.getByText('PnL & Activity')).toBeInTheDocument();
  });

  it('renders net PnL with positive sign', () => {
    render(<PnLCard pnl={defaultPnl} transactions={defaultTxs} loading={false} solPrice={{ usd: 150 }} />);
    expect(screen.getByText('+$200.00')).toBeInTheDocument();
  });

  it('renders negative net PnL', () => {
    const pnl = { totalIn: 100, totalOut: 400, netPnl: -300, swapCount: 0 };
    render(<PnLCard pnl={pnl} transactions={[]} loading={false} solPrice={{ usd: 150 }} />);
    expect(screen.getByText('-$300.00')).toBeInTheDocument();
  });

  it('renders swap count stat', () => {
    render(<PnLCard pnl={defaultPnl} transactions={defaultTxs} loading={false} solPrice={{ usd: 150 }} />);
    expect(screen.getByText('3')).toBeInTheDocument();
  });

  it('renders category breakdown', () => {
    render(<PnLCard pnl={defaultPnl} transactions={defaultTxs} loading={false} solPrice={{ usd: 150 }} />);
    expect(screen.getByText('Transaction Types')).toBeInTheDocument();
  });

  it('shows sol price note', () => {
    render(<PnLCard pnl={defaultPnl} transactions={defaultTxs} loading={false} solPrice={{ usd: 150 }} />);
    expect(screen.getByText('SOL price: $150.00 USD')).toBeInTheDocument();
  });
});

// ──────────────────────────────────────────────────────────────────────────────
// TransactionFeed
// ──────────────────────────────────────────────────────────────────────────────
import TransactionFeed from '../components/TransactionFeed';

const makeTx = (overrides = {}) => ({
  signature: 'abc123def456abc123def456abc123def456abc123def456abc123def456abc12',
  blockTime: new Date('2024-01-15T10:30:00Z'),
  fee: 0.000005,
  err: null,
  solDelta: -0.001,
  counterparty: null,
  tokenDeltas: [],
  category: 'Transfer',
  raw: {},
  ...overrides,
});

describe('TransactionFeed', () => {
  it('renders Transactions heading', () => {
    render(
      <TransactionFeed
        transactions={[]}
        loading={false}
        error={null}
        onRefresh={vi.fn()}
        onSimulate={vi.fn()}
      />
    );
    expect(screen.getByText('Transactions')).toBeInTheDocument();
  });

  it('shows loading skeletons', () => {
    render(
      <TransactionFeed
        transactions={[]}
        loading={true}
        error={null}
        onRefresh={vi.fn()}
        onSimulate={vi.fn()}
      />
    );
    const skeletons = document.querySelectorAll('.skeleton');
    expect(skeletons.length).toBeGreaterThan(0);
  });

  it('shows empty state for no transactions', () => {
    render(
      <TransactionFeed
        transactions={[]}
        loading={false}
        error={null}
        onRefresh={vi.fn()}
        onSimulate={vi.fn()}
      />
    );
    expect(screen.getByText('No transactions found')).toBeInTheDocument();
  });

  it('renders transaction rows', () => {
    const txs = [makeTx(), makeTx({ signature: 'xyz789xyz789xyz789xyz789xyz789xyz789xyz789xyz789xyz789xyz789xyz7', category: 'Swap' })];
    render(
      <TransactionFeed
        transactions={txs}
        loading={false}
        error={null}
        onRefresh={vi.fn()}
        onSimulate={vi.fn()}
      />
    );
    expect(screen.getByText('Transfer')).toBeInTheDocument();
    expect(screen.getByText('Swap')).toBeInTheDocument();
  });

  it('renders filter buttons', () => {
    render(
      <TransactionFeed
        transactions={[]}
        loading={false}
        error={null}
        onRefresh={vi.fn()}
        onSimulate={vi.fn()}
      />
    );
    expect(screen.getByRole('button', { name: 'All' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Swap' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Failed' })).toBeInTheDocument();
  });

  it('shows error message when error is provided', () => {
    render(
      <TransactionFeed
        transactions={[]}
        loading={false}
        error="Network error"
        onRefresh={vi.fn()}
        onSimulate={vi.fn()}
      />
    );
    expect(screen.getByText('Network error')).toBeInTheDocument();
  });

  it('filters to Failed transactions', async () => {
    const txs = [
      makeTx({ category: 'Transfer' }),
      makeTx({ signature: 'fail111fail111fail111fail111fail111fail111fail111fail111fail111fa', err: { code: 1 }, category: 'Unknown' }),
    ];
    render(
      <TransactionFeed
        transactions={txs}
        loading={false}
        error={null}
        onRefresh={vi.fn()}
        onSimulate={vi.fn()}
      />
    );
    await userEvent.click(screen.getByRole('button', { name: 'Failed' }));
    // Transfer row should be hidden, only failed row shown
    expect(screen.queryByText('No results for this filter')).not.toBeInTheDocument();
  });

  it('shows transaction count badge', () => {
    const txs = [makeTx()];
    render(
      <TransactionFeed
        transactions={txs}
        loading={false}
        error={null}
        onRefresh={vi.fn()}
        onSimulate={vi.fn()}
      />
    );
    expect(screen.getByText('1')).toBeInTheDocument();
  });
});

// ──────────────────────────────────────────────────────────────────────────────
// SimulationPanel
// ──────────────────────────────────────────────────────────────────────────────
import SimulationPanel from '../components/SimulationPanel';

describe('SimulationPanel', () => {
  it('renders Transaction Simulator heading', () => {
    render(<SimulationPanel />);
    expect(screen.getByText('Transaction Simulator')).toBeInTheDocument();
  });

  it('renders textarea for base64 input when no preloadTx', () => {
    render(<SimulationPanel />);
    expect(screen.getByPlaceholderText(/paste a base64/i)).toBeInTheDocument();
  });

  it('renders simulate button', () => {
    render(<SimulationPanel />);
    expect(screen.getByRole('button', { name: /simulate transaction/i })).toBeInTheDocument();
  });

  it('simulate button is disabled when input is empty', () => {
    render(<SimulationPanel />);
    const btn = screen.getByRole('button', { name: /simulate transaction/i });
    expect(btn).toBeDisabled();
  });

  it('renders close button when onClose is provided', () => {
    const onClose = vi.fn();
    render(<SimulationPanel onClose={onClose} />);
    // close button is the SVG X button
    const closeBtn = document.querySelector('button svg');
    expect(closeBtn).toBeTruthy();
  });

  it('shows preloaded tx info when preloadTx is passed', () => {
    const tx = {
      signature: 'abc123def456abc123def456abc123def456abc123def456abc123def456abc12',
      category: 'Swap',
      err: null,
      fee: 0.000005,
      solDelta: -0.5,
      tokenDeltas: [],
      raw: { transaction: { message: { accountKeys: [] } }, meta: { logMessages: [] } },
    };
    render(<SimulationPanel preloadTx={tx} />);
    expect(screen.getByText('Analyzing Transaction')).toBeInTheDocument();
    expect(screen.getByText('Swap')).toBeInTheDocument();
    expect(screen.getByText('Success')).toBeInTheDocument();
  });

  it('shows empty state hint when no input and no preload', () => {
    render(<SimulationPanel />);
    expect(screen.getByText(/paste a base64 transaction/i)).toBeInTheDocument();
  });
});
