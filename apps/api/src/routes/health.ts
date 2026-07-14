import type { FastifyInstance } from 'fastify';
import type { HealthResponse } from '@stellardao/shared';
import { parseEnv } from '@stellardao/shared';
import { HorizonClient } from '@stellardao/sdk';

export const healthRoutes = async (app: FastifyInstance): Promise<void> => {
  app.get('/', async () => {
    const env = parseEnv.api();
    const horizon = new HorizonClient({
      baseUrl: env.HORIZON_URL,
      network: env.STELLAR_NETWORK,
    });
    const horizonOK = await horizon.ping();
    const body: HealthResponse = {
      status: 'ok',
      network: env.STELLAR_NETWORK,
      horizon: horizonOK ? 'reachable' : 'down',
      contracts: {
        bridge: env.BRIDGE_CONTRACT_ID || 'unset',
        factory: env.FACTORY_CONTRACT_ID || 'unset',
        wrapperTokenTemplate: env.WRAPPER_TOKEN_TEMPLATE_ID || 'unset',
      },
    };
    return body;
  });
};
