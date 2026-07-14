import type { FastifyInstance } from 'fastify';
import { z } from 'zod';
import type {
  ListAssetsResponse,
  CreateAssetRequest,
  CreateAssetResponse,
  AssetRegistryEntry,
  SourceChainId,
} from '@stellardao/shared';

import { factory } from '../soroban/index.js';
import { assetRepository } from '../db/repositories/asset-repository.js';

const ChainEnum = z.enum(['ethereum', 'solana', 'polygon']);

const CreateAssetSchema = z.object({
  source: z.object({
    chain: z.enum(['ethereum', 'solana', 'polygon']),
    address: z.string().min(8),
  }),
  name: z.string().min(2).max(64),
  symbol: z.string().min(1).max(16),
  decimals: z.number().int().min(0).max(18),
});

export const assetRoutes = async (app: FastifyInstance): Promise<void> => {
  app.get('/', async (): Promise<ListAssetsResponse> => {
    const assets = await assetRepository.listAll();
    return {
      assets: assets.map(({ wrapperToken, source, symbol, name, decimals }) => ({
        wrapperToken,
        source,
        symbol,
        name,
        decimals,
      })),
    };
  });

  app.get<{ Params: { chain: string; address: string } }>(
    '/:chain/:address',
    async (req, reply) => {
      const { chain, address } = req.params;
      const parsedChain = ChainEnum.safeParse(chain);
      if (!parsedChain.success) {
        return reply.badRequest('unsupported chain');
      }
      const typedChain: SourceChainId = parsedChain.data;
      const entry: AssetRegistryEntry | null = await assetRepository.findBySource(typedChain, address);
      if (!entry) return reply.notFound('no wrapper deployed for this source token');
      return entry;
    },
  );

  app.post<{ Body: CreateAssetRequest }>('/', async (req, reply) => {
    const parsed = CreateAssetSchema.safeParse(req.body);
    if (!parsed.success) return reply.badRequest(parsed.error.message);
    const { source, name, symbol, decimals } = parsed.data;

    const developerPK = req.headers['x-developer-public-key'];
    if (typeof developerPK !== 'string' || !developerPK.startsWith('G')) {
      return reply.badRequest('missing or invalid x-developer-public-key header');
    }

    const factoryContract = factory();
    const op = factoryContract.buildCreateWrapperAsset(developerPK, {
      sourceChain: source.chain,
      sourceToken: source.address,
      name,
      symbol,
      decimals,
    });

    const txHash = await factoryContract.simulateAndSubmit(
      {
        factoryContractId: factoryContract.contractId,
        sourceKeypair: app.sorobanSigner,
        networkPassphrase: app.networkPassphrase,
        sorobanRpcUrl: app.sorobanRpcUrl,
      },
      op,
    );

    const entry = await assetRepository.upsertBySource({
      wrapperToken: '',
      source,
      symbol,
      name,
      decimals,
    });

    const body: CreateAssetResponse = { wrapperToken: entry.wrapperToken, txHash };
    reply.code(202).send(body);
  });
};
