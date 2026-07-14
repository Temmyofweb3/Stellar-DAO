import type { AssetId, SourceChainId } from './chain.js';

/**
 * A wrapped asset as the rest of the system sees it.
 *  - `id`        — pipeline-friendly id made from chain+address.
 *  - `wrapperToken` — Stellar contract id of the cloned wrapper-token.
 *  - `decimals`  — source decimals, preserved 1:1 on Stellar.
 */
export type WrappedAsset = {
  id: string;
  source: AssetId;
  wrapperToken: string;
  symbol: string;
  name: string;
  decimals: number;
  totalSupply: string;
  deployedAt: string; // ISO-8601 from factory WrapperCreated event
};

/** Lightweight row used by the asset registry listing endpoint. */
export type AssetRegistryEntry = Pick<
  WrappedAsset,
  'id' | 'symbol' | 'name' | 'source' | 'wrapperToken'
> & { decimals: number };

export const assetIdFor = (chain: SourceChainId, address: string): string =>
  `${chain}:${address.toLowerCase()}`;
