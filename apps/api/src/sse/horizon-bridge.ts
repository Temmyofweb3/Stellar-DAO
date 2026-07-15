/**
 * Server-Sent Events bridge.
 *
 * Fans out two streams over the same `/events` endpoint using SSE's
 * `event:` discriminator so the dashboard can open a single EventSource
 * and listen for both:
 *
 *   • `contract-event`     — every Soroban event observed on the bridge
 *                            contract via Horizon's
 *                            `/contracts/:id/events` stream.
 *   • `transaction-update` — every successful `transactionRepository.upsert`
 *                            call (covers wrap submissions, lifecycle
 *                            walks, future relayer webhooks).
 *
 * Bus-driven events are kept lossless: whatever code path calls
 * `transactionRepository.upsert` automatically fans out here, with no
 * extra plumbing on the producer side.
 */
import type { FastifyInstance } from 'fastify';
import { parseEnv } from '@stellardao/shared';
import { HorizonClient } from '@stellardao/sdk';

import { subscribeTransactions } from './event-bus.js';

export const registerSseBridge = async (app: FastifyInstance): Promise<void> => {
  const env = parseEnv.api();
  const horizon = new HorizonClient({
    baseUrl: env.HORIZON_URL,
    network: env.STELLAR_NETWORK,
  });

  app.get('/events', async (req, reply) => {
    reply.raw.setHeader('Content-Type', 'text/event-stream');
    reply.raw.setHeader('Cache-Control', 'no-cache');
    reply.raw.setHeader('Connection', 'keep-alive');
    reply.hijack();

    const writeEvent = (event: string, data: unknown) => {
      reply.raw.write(`event: ${event}\n`);
      reply.raw.write(`data: ${JSON.stringify(data)}\n\n`);
    };

    writeEvent('hello', { ts: Date.now() });

    if (!env.BRIDGE_CONTRACT_ID) {
      writeEvent('warning', { message: 'BRIDGE_CONTRACT_ID not configured' });
      return;
    }

    // Subscribe to the in-process transaction bus. Every
    // transactionRepository.upsert call from the wrap route (and from
    // future mint / webhook paths) fires here.
    const unsubscribe = subscribeTransactions(({ transaction }) => {
      writeEvent('transaction-update', transaction);
    });

    req.raw.on('close', () => {
      unsubscribe();
      reply.raw.end();
    });

    try {
      for await (const record of horizon.streamContractEvents(env.BRIDGE_CONTRACT_ID)) {
        writeEvent('contract-event', record);
      }
    } catch (err) {
      writeEvent('error', { message: (err as Error).message });
    }
  });
};
