import pino from 'pino';

import type { SourceChainId } from '@stellardao/shared';
import type { LockEvent } from './sources/types.js';

const log = pino({ transport: { target: 'pino-pretty' } });

/**
 * Detector loop.
 *
 * Owns one source-chain watcher at a time. Re-connects on errors so a
 * single chain outage doesn't kill the relayer; per-chain restart uses
 * exponential backoff up to 60s.
 */
export const detector = async (
  chain: SourceChainId,
  factory: () => Promise<unknown>,
  emit: (event: LockEvent) => void | Promise<void>,
): Promise<void> => {
  let attempt = 0;
  for (;;) {
    try {
      const adapter = (await factory()) as {
        watch: (rpcUrl: string, cb: (e: LockEvent) => void) => Promise<void>;
      };
      await adapter.watch(process.env[`${chain.toUpperCase()}_RPC_URL`] ?? '', emit);
      attempt = 0; // reset on healthy attach
    } catch (err) {
      attempt += 1;
      const delay = Math.min(60_000, 1000 * 2 ** attempt);
      log.warn({ chain, attempt, delay, err: (err as Error).message }, 'reconnecting to source chain');
      await new Promise((r) => setTimeout(r, delay));
    }
  }
};
