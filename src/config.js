const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'https://api.eitherway.ai';

export const PROXY_API = (url) =>
  `${API_BASE_URL}/api/proxy-api?url=${encodeURIComponent(url)}`;

export const PROXY_CDN = (url) =>
  `${API_BASE_URL}/api/proxy-cdn?url=${encodeURIComponent(url)}`;

export const DIALECT_PROXY = `${API_BASE_URL}/api/dialect`;

// Solana RPC — sourced from dedicated config
export { SOLANA_RPC_URL } from './config/rpc';

// Cache TTLs (ms)
export const PRICE_CACHE_TTL = 60_000;       // 1 min
export const BALANCE_CACHE_TTL = 30_000;     // 30 sec
export const TX_CACHE_TTL = 60_000;          // 1 min
