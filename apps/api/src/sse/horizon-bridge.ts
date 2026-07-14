/**
 * Server-Sent Events bridge for Horizon events.
 *
 * The dashboard connects to /events and we fan-out every contract event
 * we read from Horizon. In production the frontend connects directly to
 * Horizon, but having an SSE relay in the API gives us:
 *   * Single origin (no CORS pain on public RPCs)
 *   * Server-side filtering by topic
 *   * A natural place to plug relayer-internal state (queued attestations,
 *     operator health) into the same stream.
 */
import type { FastifyInstance } from 'fastify';

import { parseEnv } from '@stellardao/shared';
import { HorizonClient } from '@stellardao/sdk';

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

    try {
      for await (const record of horizon.streamContractEvents(env.BRIDGE_CONTRACT_ID)) {
        writeEvent('contract-event', record);
      }
    } catch (err) {
      writeEvent('error', { message: (err as Error).message });
    }

    req.raw.on('close', () => {
      reply.raw.end();
    });
  });
};
