import type { Transaction } from '@stellardao/shared';

/**
 * Transaction repo — same in-memory stub strategy as the asset registry.
 * Real impl persists every bridge event observed via the SSE bridge.
 */
const byId = new Map<string, Transaction>();

export const transactionRepository = {
  async upsert(tx: Transaction): Promise<Transaction> {
    byId.set(tx.id, tx);
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
};
