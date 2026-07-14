import crypto from 'node:crypto';

import pino from 'pino';
import { Keypair } from '@stellar/stellar-sdk';
import { parseEnv, type SourceChainId, type Transaction } from '@stellardao/shared';
import {
  BridgeContract,
  buildLockDigest,
  signSecp256k1,
} from '@stellardao/sdk';

import { ethereumWatcher } from './sources/ethereum.js';
import { solanaWatcher } from './sources/solana.js';
import { polygonWatcher } from './sources/polygon.js';
import { detector } from './detector.js';
import { eventQueue } from './state/event-queue.js';
import { signer } from './operator/signer.js';
import type { LockEvent } from './sources/types.js';

const log = pino({
  level: process.env.LOG_LEVEL ?? 'info',
  transport: { target: 'pino-pretty' },
});

const env = parseEnv.api();

/**
 * Build a `Transaction` envelope from a `LockEvent` + chain id.
 * Fills in the fields the API + dashboard expect (`id`, `type`,
 * `sourceChain`) and marks `sourceTxHash` / `stellarTxHash` as `null`
 * until the upstream systems populate them — the relayer's role here is
 * to track the in-flight attestation, not the source-chain/hash state.
 */
function envelope(event: LockEvent, chain: SourceChainId): Transaction {
  const now = new Date().toISOString();
  return {
    id: crypto.randomUUID(),
    type: 'wrap',
    sourceChain: chain,
    sourceToken: event.sourceToken,
    wrapperToken: event.wrapperToken,
    recipient: event.recipient,
    amount: event.amount,
    nonce: event.nonce,
    status: 'attesting',
    sourceTxHash: null,
    stellarTxHash: null,
    createdAt: now,
    updatedAt: now,
  };
}

async function main() {
  log.info({ network: env.STELLAR_NETWORK }, 'StellarDAO relayer starting');

  if (!env.RELAYER_PUBLIC_KEY || !env.RELAYER_SECRET_KEY) {
    log.warn('relayer signing key not set — submissions will be dry-run');
  }

  const bridge = new BridgeContract(env.BRIDGE_CONTRACT_ID ?? '');
  const sourceKeypair = env.RELAYER_SECRET_KEY
    ? Keypair.fromSecret(env.RELAYER_SECRET_KEY)
    : Keypair.random();

  const networkSources: Record<SourceChainId, (rpcUrl: string) => Promise<unknown>> = {
    ethereum: (rpcUrl) => ethereumWatcher(rpcUrl),
    solana: (rpcUrl) => solanaWatcher(rpcUrl),
    polygon: (rpcUrl) => polygonWatcher(rpcUrl),
  };

  // `env` is `ApiEnv`; the three RPC URLs are `ETHEREUM_RPC_URL`,
  // `SOLANA_RPC_URL`, `POLYGON_RPC_URL`. The template-literal index
  // `${chain}_RPC_URL` can't be statically resolved against the
  // `ApiEnv` key set (TS7053), so we narrow via a typed lookup.
  const rpcUrlFor = (chain: SourceChainId): string => {
    switch (chain) {
      case 'ethereum':
        return env.ETHEREUM_RPC_URL;
      case 'solana':
        return env.SOLANA_RPC_URL;
      case 'polygon':
        return env.POLYGON_RPC_URL;
    }
  };

  for (const chain of Object.keys(networkSources) as SourceChainId[]) {
    void detector(
      chain,
      async () => networkSources[chain](rpcUrlFor(chain)),
      async (event: LockEvent) => {
        log.info({ chain }, 'attesting lock event');

        const tx = envelope(event, chain);
        eventQueue.push(tx);

        const digest = buildLockDigest({
          sourceChain: chain,
          sourceToken: event.sourceToken,
          // `buildLockDigest` expects `wrapperToken` as a hex string and
          // decodes it internally — passing a Buffer here was a type
          // drift leftover from an earlier draft.
          wrapperToken: event.wrapperToken,
          recipient: event.recipient,
          amount: event.amount,
          // `nonce` is typed as Uint8Array (Buffer extends Uint8Array, so
          // the assignment is valid and cheap to keep in Buffer form for
          // hex-on-the-wire encoding).
          nonce: Buffer.from(event.nonce, 'hex'),
        });

        const signature = env.RELAYER_SECRET_KEY
          ? await signSecp256k1(digest, env.RELAYER_SECRET_KEY)
          : new Uint8Array(64);

        try {
          const stellarTxHash = await signer.submitMintToBridge({
            bridgeContract: bridge,
            sourceKeypair,
            relayerPK: env.RELAYER_PUBLIC_KEY ?? '',
            payload: { ...event, sourceChain: chain },
            signature,
            networkPassphrase: env.STELLAR_NETWORK_PASSPHRASE,
            sorobanRpcUrl: env.SOROBAN_RPC_URL,
          });

          eventQueue.updateById(chain, event.nonce, { status: 'minting', stellarTxHash });
        } catch (err) {
          const message = (err as Error).message;
          log.error({ chain, err: message }, 'mint submission failed');
          eventQueue.updateById(chain, event.nonce, { status: 'failed', error: message });
        }
      },
    );
  }
}

main().catch((err) => log.error(err));
