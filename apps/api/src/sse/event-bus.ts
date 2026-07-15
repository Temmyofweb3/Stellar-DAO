/**
 * In-process pub-sub for the API's SSE relay.
 *
 * Currently a single channel ("transaction-update"). Every call to
 * `broadcastTransaction` fans out to every active `/events` SSE
 * subscriber. The dashboard's TransactionFeed prepends the received
 * `Transaction` onto its live feed; the wrap panel watches events for
 * its own txId to advance the lifecycle UI (`pending → attesting →
 * minting → completed`).
 *
 * Why an EventEmitter instead of a real broker (Redis pub/sub, NATS):
 * the SSE relay only has to back a single Fastify process under
 * `pnpm dev`. Adding infra would buy us nothing — we'd still fan out
 * within one process. The seam here is small enough to swap for an
 * out-of-process broker later: the consumers only see the Listener
 * type, and the producer only has to provide `transaction-update`
 * events in order.
 */
import { EventEmitter } from 'node:events';
import type { Transaction } from '@stellardao/shared';

export type TransactionEvent = {
  transaction: Transaction;
};

type Listener = (event: TransactionEvent) => void;

const emitter = new EventEmitter();

/** Push a transaction update to every connected subscriber. */
export const broadcastTransaction = (tx: Transaction): void => {
  emitter.emit('transaction-update', { transaction: tx });
};

/** Subscribe to transaction updates; returns an unsubscribe function. */
export const subscribeTransactions = (handler: Listener): (() => void) => {
  emitter.on('transaction-update', handler);
  return () => {
    emitter.off('transaction-update', handler);
  };
};

/** Test-only: wipe listeners so a worker can start from a clean bus. */
export const __resetEventBusForTest = (): void => {
  emitter.removeAllListeners();
};
