import { describe, it, expect } from 'vitest';
import { renderHook } from '@testing-library/react';
import { usePnL } from '../hooks/usePnL';

const makeTx = (overrides = {}) => ({
  err: null,
  solDelta: 0,
  category: 'Transfer',
  tokenDeltas: [],
  ...overrides,
});

describe('usePnL', () => {
  it('returns zero values when no transactions provided', () => {
    const { result } = renderHook(() => usePnL([], 150));
    expect(result.current.totalIn).toBe(0);
    expect(result.current.totalOut).toBe(0);
    expect(result.current.netPnl).toBe(0);
    expect(result.current.swapCount).toBe(0);
  });

  it('returns zero values when solPrice is null', () => {
    const txs = [makeTx({ solDelta: 1 })];
    const { result } = renderHook(() => usePnL(txs, null));
    expect(result.current.netPnl).toBe(0);
  });

  it('calculates inflow correctly', () => {
    const txs = [makeTx({ solDelta: 2 })]; // +2 SOL
    const { result } = renderHook(() => usePnL(txs, 100));
    expect(result.current.totalIn).toBeCloseTo(200);
    expect(result.current.totalOut).toBe(0);
    expect(result.current.netPnl).toBeCloseTo(200);
  });

  it('calculates outflow correctly', () => {
    const txs = [makeTx({ solDelta: -3 })]; // -3 SOL
    const { result } = renderHook(() => usePnL(txs, 100));
    expect(result.current.totalIn).toBe(0);
    expect(result.current.totalOut).toBeCloseTo(300);
    expect(result.current.netPnl).toBeCloseTo(-300);
  });

  it('counts swaps', () => {
    const txs = [
      makeTx({ category: 'Swap' }),
      makeTx({ category: 'Swap' }),
      makeTx({ category: 'Transfer' }),
    ];
    const { result } = renderHook(() => usePnL(txs, 100));
    expect(result.current.swapCount).toBe(2);
  });

  it('ignores failed transactions', () => {
    const txs = [makeTx({ err: { code: 1 }, solDelta: 10 })];
    const { result } = renderHook(() => usePnL(txs, 100));
    expect(result.current.totalIn).toBe(0);
    expect(result.current.netPnl).toBe(0);
  });

  it('aggregates multiple transactions', () => {
    const txs = [
      makeTx({ solDelta: 5 }),
      makeTx({ solDelta: -2 }),
      makeTx({ solDelta: 1 }),
    ];
    const { result } = renderHook(() => usePnL(txs, 100));
    expect(result.current.totalIn).toBeCloseTo(600);   // 5*100 + 1*100
    expect(result.current.totalOut).toBeCloseTo(200);  // 2*100
    expect(result.current.netPnl).toBeCloseTo(400);
  });
});
