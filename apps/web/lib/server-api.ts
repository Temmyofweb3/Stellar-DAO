import 'server-only';

import type {
  AssetRegistryEntry,
  HealthResponse,
  ListTransactionsResponse,
  ListAssetsResponse,
  Transaction,
  SourceChainId,
} from '@stellardao/shared';

const DEFAULT_BASE = process.env.NEXT_PUBLIC_API_BASE_URL ?? 'http://localhost:4000';

type Query = Record<string, string | number | undefined>;

const buildQueryString = (q?: Query) => {
  if (!q) return '';
  const url = new URLSearchParams();
  for (const [k, v] of Object.entries(q)) {
    if (v !== undefined) url.set(k, String(v));
  }
  const s = url.toString();
  return s ? `?${s}` : '';
};

export const serverApi = {
  baseUrl: DEFAULT_BASE,

  async listAssets(): Promise<ListAssetsResponse> {
    return fetch(`${DEFAULT_BASE}/assets${buildQueryString()}`).then(
      (r) => (r.ok ? (r.json() as Promise<ListAssetsResponse>) : { assets: [] as AssetRegistryEntry[] }),
    );
  },

  async listTransactions(opts: { limit?: number; sourceChain?: SourceChainId } = {}): Promise<ListTransactionsResponse> {
    return fetch(`${DEFAULT_BASE}/transactions${buildQueryString({ ...opts })}`).then(
      (r) =>
        r.ok
          ? (r.json() as Promise<ListTransactionsResponse>)
          : { transactions: [] as Transaction[] },
    );
  },

  async health(): Promise<HealthResponse | null> {
    try {
      const r = await fetch(`${DEFAULT_BASE}/health`, { cache: 'no-store' });
      if (!r.ok) return null;
      return (await r.json()) as HealthResponse;
    } catch {
      return null;
    }
  },
};
