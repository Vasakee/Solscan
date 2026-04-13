import { describe, it, expect } from 'vitest';
import { PROXY_API, SOLANA_RPC_URL, PRICE_CACHE_TTL, BALANCE_CACHE_TTL, TX_CACHE_TTL } from '../config';

describe('config', () => {
  it('PROXY_API constructs a URL string', () => {
    const url = PROXY_API('https://api.coingecko.com/test');
    expect(typeof url).toBe('string');
    expect(url).toContain('proxy-api');
    expect(url).toContain(encodeURIComponent('https://api.coingecko.com/test'));
  });

  it('SOLANA_RPC_URL is a valid URL string', () => {
    expect(typeof SOLANA_RPC_URL).toBe('string');
    expect(SOLANA_RPC_URL).toMatch(/^https?:\/\//);
  });

  it('PRICE_CACHE_TTL is a positive number', () => {
    expect(PRICE_CACHE_TTL).toBeGreaterThan(0);
  });

  it('BALANCE_CACHE_TTL is a positive number', () => {
    expect(BALANCE_CACHE_TTL).toBeGreaterThan(0);
  });

  it('TX_CACHE_TTL is a positive number', () => {
    expect(TX_CACHE_TTL).toBeGreaterThan(0);
  });
});
