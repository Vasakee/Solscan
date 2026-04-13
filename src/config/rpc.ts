const RPC_TIMEOUT_MS = 10_000;
const RPC_MAX_RETRIES = 3;
const IS_DEV = import.meta.env.DEV;

export const SOLANA_RPC_URL: string =
  import.meta.env.VITE_SOLANA_RPC_URL ||
  'https://your-quicknode-endpoint.solana-mainnet.quiknode.pro/YOUR_TOKEN/';

async function fetchWithTimeout(url: string, options: RequestInit): Promise<Response> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), RPC_TIMEOUT_MS);
  try {
    return await fetch(url, { ...options, signal: controller.signal });
  } finally {
    clearTimeout(timer);
  }
}

/**
 * Resilient fetch for @solana/web3.js Connection.
 * Retries up to RPC_MAX_RETRIES times with exponential backoff.
 * Logs RPC latency in development mode.
 */
export async function rpcFetch(url: string, options: RequestInit): Promise<Response> {
  let attempt = 0;
  while (true) {
    const t0 = IS_DEV ? performance.now() : 0;
    try {
      const res = await fetchWithTimeout(url, options);
      if (IS_DEV) {
        console.debug(`[RPC] ${res.status} — ${(performance.now() - t0).toFixed(1)}ms (attempt ${attempt + 1})`);
      }
      return res;
    } catch (err) {
      attempt++;
      if (attempt > RPC_MAX_RETRIES) throw err;
      const backoff = 200 * 2 ** (attempt - 1); // 200ms, 400ms, 800ms
      if (IS_DEV) {
        console.warn(`[RPC] Request failed, retrying in ${backoff}ms (attempt ${attempt}/${RPC_MAX_RETRIES})`, err);
      }
      await new Promise((r) => setTimeout(r, backoff));
    }
  }
}
