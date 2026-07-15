import type { Transaction } from '@stellardao/shared';

import { broadcastTransaction } from '../../sse/event-bus.js';

/**
 * Transaction repo — same in-memory stub strategy as the asset registry.
 * Real impl persists every bridge event observed via the SSE bridge.
 *
 * `upsert` is the *only* write path, so we hook the SSE broadcast here:
 * every code path that mutates a Transaction (wrap route, relayer
 * webhook, mint listener) routes through `upsert` and therefore fans
 * out to SSE without remembering to call the broadcaster.
 */
const byId = new Map<string, Transaction>();

export const transactionRepository = {
  async upsert(tx: Transaction): Promise<Transaction> {
    byId.set(tx.id, tx);
    broadcastTransaction(tx);
    return tx;
  },

  async findById(id: string): Promise<Transaction | null> {
    return byId.get(id) ?? null;
  },

  async listRecent(limit: number): Promise<Transaction[]> {
    return [...byId.values()]
      .sort((a, b) => Date.parse(b.createdAt) - Date.parse(a.createdAt))
      .slice(0, limit);
  },

  /** Test-only: wipe the in-memory map between vitest runs. */
  __clearForTest(): void {
    byId.clear();
  },
};
