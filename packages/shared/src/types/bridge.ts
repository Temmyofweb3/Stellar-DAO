import type { AssetId } from './chain.js';

/** Mirrors `contracts/bridge/src/storage.rs::LockPayload`. */
export type LockPayload = {
  sourceChain: string;
  sourceToken: string;
  wrapperToken: string; // 32-byte hex contract id
  recipient: string;
  amount: string; // serialised bigint as string — JSON-safe
  nonce: string; // 32-byte hex
};

/** Mirrors `contracts/bridge/src/storage.rs::UnlockPayload`. */
export type UnlockPayload = {
  sourceChain: string;
  wrapperToken: string;
  sourceAddress: string;
  amount: string;
  nonce: string;
};

export type SignedAttestation = {
  publicKey: string; // 32-byte hex (secp256k1 / ed25519 — verifier decides)
  signature: string; // 64-byte hex
};

/** Relayer → bridge RPC envelope. */
export type MintRequest = {
  relayer: string;
  wrapperToken: string;
  payload: LockPayload;
  attestations: SignedAttestation[];
};

export type BurnRequest = {
  relayer: string;
  wrapperToken: string;
  payload: UnlockPayload;
  attestations: SignedAttestation[];
};

export type AssetIdLike = AssetId;
