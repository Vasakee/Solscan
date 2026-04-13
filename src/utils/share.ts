/** Compact schema stored in the URL — keep field names short to minimise URL length. */
export interface SharePayload {
  /** Wallet address */
  w: string;
  /** SOL balance */
  s: number;
  /** Total portfolio value */
  t: number;
  /** Top tokens (up to 10) */
  tk: Array<{ sym: string; bal: number; usd: number }>;
  /** Net PnL */
  pnl: number;
  /** Number of swaps */
  swaps: number;
  /** Unix timestamp (seconds) when snapshot was taken */
  ts: number;
  /** Currency code, e.g. 'usd', 'eur' */
  cur?: string;
}

/** Serialise a portfolio snapshot into a URL-safe base64 string. */
export function encodeSharePayload(payload: SharePayload): string {
  const json = JSON.stringify(payload);
  // btoa requires a binary string — encode via TextEncoder → Uint8Array → binary string
  const bytes = new TextEncoder().encode(json);
  let binary = '';
  bytes.forEach((b) => (binary += String.fromCharCode(b)));
  return btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

/** Decode a URL-safe base64 string back into a SharePayload. Returns null on any error. */
export function decodeSharePayload(encoded: string): SharePayload | null {
  try {
    const base64 = encoded.replace(/-/g, '+').replace(/_/g, '/');
    const binary = atob(base64);
    const bytes = Uint8Array.from(binary, (c) => c.charCodeAt(0));
    const json = new TextDecoder().decode(bytes);
    return JSON.parse(json) as SharePayload;
  } catch {
    return null;
  }
}
