import type { AssetId } from './chain.js';
import type { Transaction } from './transaction.js';

export type CreateAssetRequest = {
  source: AssetId;
  name: string;
  symbol: string;
  decimals: number;
};

export type CreateAssetResponse = {
  wrapperToken: string;
  txHash: string;
};

export type ListAssetsResponse = {
  assets: Array<{
    id: string;
    source: AssetId;
    wrapperToken: string;
    symbol: string;
    name: string;
    decimals: number;
  }>;
};

export type GetTransactionResponse = {
  transaction: Transaction;
};

export type ListTransactionsResponse = {
  transactions: Transaction[];
};

export type HealthResponse = {
  status: 'ok';
  network: string;
  horizon: 'reachable' | 'down';
  contracts: {
    bridge: string;
    factory: string;
    wrapperTokenTemplate: string;
  };
};
