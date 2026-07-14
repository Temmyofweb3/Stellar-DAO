/**
 * Typed Horizon REST client.
 *
 * Keeps the rest of the codebase off `fetch()` so we can:
 *   1. Centralize the URL/headers/timeout behaviour.
 *   2. Surface typed errors when Horizon is down (real-time feed needs to know).
 *   3. Apply simple retry budgets for read endpoints.
 *
 * Note: stellar-sdk v12 dropped `Horizon.Server.networkPassphrase` as a
 * public field. We track the network passphrase locally based on the
 * `network` constructor option and derive `network` from it.
 */
import { Horizon, Networks } from '@stellar/stellar-sdk';
import { z } from 'zod';

import type { StellarNetwork } from '@stellardao/shared';

const HorizonErrorSchema = z.object({
  status: z.number(),
  title: z.string(),
  detail: z.string().optional(),
  extras: z.record(z.unknown()).optional(),
});
export type HorizonError = z.infer<typeof HorizonErrorSchema>;

export type HorizonClientOptions = {
  baseUrl: string;
  network: StellarNetwork;
  fetchTimeoutMs?: number;
};

const PASSPHRASES: Record<StellarNetwork, string> = {
  PUBLIC: Networks.PUBLIC,
  TESTNET: Networks.TESTNET,
  FUTURENET: Networks.FUTURENET,
} as const;

export class HorizonClient {
  private readonly server: Horizon.Server;
  private readonly passphrase: string;
  private readonly _network: StellarNetwork;
  private readonly baseUrl: string;
  private readonly fetchTimeoutMs: number;

  constructor(opts: HorizonClientOptions) {
    this.server = new Horizon.Server(opts.baseUrl, {
      allowHttp: false,
    });
    // Under noUncheckedIndexedAccess, indexing `Networks` directly gives
    // `string | undefined`, so use a typed local map.
    this.passphrase = PASSPHRASES[opts.network];
    this._network = opts.network;
    this.baseUrl = opts.baseUrl;
    this.fetchTimeoutMs = opts.fetchTimeoutMs ?? 10_000;
  }

  get network(): StellarNetwork {
    return this._network;
  }

  /** Network passphrase used when signing client-side transactions. */
  get networkPassphrase(): string {
    return this.passphrase;
  }

  /** Lightweight liveness probe — used by /api/health and the UI banner. */
  async ping(): Promise<boolean> {
    try {
      const ctrl = new AbortController();
      const t = setTimeout(() => ctrl.abort(), this.fetchTimeoutMs);
      const res = await fetch(`${this.baseUrl}/`, { signal: ctrl.signal });
      clearTimeout(t);
      return res.ok;
    } catch {
      return false;
    }
  }

  /** Stream Soroban contract events for a contract id. Returns an AsyncIterator. */
  async *streamContractEvents(contractId: string, cursor: string = 'now') {
    let nextCursor: string | undefined = cursor;
    while (nextCursor !== undefined) {
      const url = new URL(`${this.baseUrl}/contracts/${contractId}/events`);
      url.searchParams.set('cursor', nextCursor);
      url.searchParams.set('limit', '100');
      const ctrl = new AbortController();
      const t = setTimeout(() => ctrl.abort(), this.fetchTimeoutMs);
      const res = await fetch(url, { signal: ctrl.signal });
      clearTimeout(t);
      if (!res.ok) {
        const err = await res.text();
        throw new Error(`horizon /events failed: ${res.status} ${err}`);
      }
      const body = (await res.json()) as {
        _embedded: { records: unknown[] };
        _links: { next: { href: string } | null };
      };
      nextCursor = body._links.next?.href ? extractCursor(body._links.next.href) : undefined;
      for (const record of body._embedded.records) {
        yield record;
      }
    }
  }

  /** Direct Horizon call passthrough for ad-hoc types we don't want to model yet. */
  raw(pathname: string, init: RequestInit = {}): Promise<Response> {
    const ctrl = new AbortController();
    const t = setTimeout(() => ctrl.abort(), this.fetchTimeoutMs);
    return fetch(`${this.baseUrl}${pathname}`, { ...init, signal: ctrl.signal }).finally(() =>
      clearTimeout(t),
    );
  }

  parseError(json: unknown): HorizonError {
    return HorizonErrorSchema.parse(json);
  }
}

const extractCursor = (href: string): string => {
  const url = new URL(href);
  return url.searchParams.get('cursor') ?? 'now';
};
