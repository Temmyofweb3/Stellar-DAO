/**
 * Status lifecycle for a single wrap or unwrap operation.
 *
 *   pending   — seen by the relayer, lock detected, awaiting attestation threshold
 *   attesting — operators signing the payload digest
 *   minting   — bridge accepted the attestation, mint tx submitted to Stellar
 *   completed — Soroban tx landed, mint event visible on Horizon
 *   failed    — attestation rejected / insufficient sigs / tx reverted
 *   refunded  — if the mint fails on Stellar, the source-chain lock is unlocked
 */
export type TxStatus =
  | 'pending'
  | 'attesting'
  | 'minting'
  | 'completed'
  | 'failed'
  | 'refunded';

export type Transaction = {
  id: string; // uuid (relayer-side)
  type: 'wrap' | 'unwrap';
  sourceChain: 'ethereum' | 'solana' | 'polygon';
  sourceToken: string;
  wrapperToken: string;
  recipient: string;
  amount: string;
  status: TxStatus;
  sourceTxHash: string | null;
  stellarTxHash: string | null;
  nonce: string;
  createdAt: string;
  updatedAt: string;
  error?: string;
};

export const isTerminalStatus = (status: TxStatus): boolean =>
  status === 'completed' || status === 'failed' || status === 'refunded';
