import type { AssetId, AssetRegistryEntry } from '@stellardao/shared';

/**
 * Asset repo — placeholder for the future Postgres-backed registry.
 * Today it lives in-memory so the API can boot and tests can run without
 * a database. The swap to Postgres is one `map` -> `db.insert` away.
 */
const store = new Map<string, AssetRegistryEntry>();

const keyFor = (source: AssetId) => `${source.chain}:${source.address.toLowerCase()}`;

export const assetRepository = {
  async upsertBySource(input: Omit<AssetRegistryEntry, 'id'> & { id?: string }): Promise<AssetRegistryEntry> {
    const id = input.id ?? keyFor(input.source);
    const entry: AssetRegistryEntry = { id, ...input };
    store.set(id, entry);
    return entry;
  },

  async listAll(): Promise<AssetRegistryEntry[]> {
    return [...store.values()];
  },

  async findBySource(chain: AssetId['chain'], address: string): Promise<AssetRegistryEntry | null> {
    return store.get(keyFor({ chain, address })) ?? null;
  },

  /** Test-only: clear the in-memory store between specs. */
  __clearForTest(): void {
    store.clear();
  },
};
