import type { FastifyInstance } from 'fastify';
import { z } from 'zod';
import type { MintRequest, BurnRequest } from '@stellardao/shared';

import { bridge } from '../soroban/index.js';

/**
 * Zod schemas mirror the `MintRequest` / `BurnRequest` shared types so
 * the routes return 400 (not 500) on malformed input. Without these,
 * `buildMint({})` reaches the SDK and crashes on `new Address(undefined)
 * .toScVal()` — the route returns 500, which is a worse signal to
 * integrators than a structured 400.
 */
const LockPayloadSchema = z.object({
  sourceChain: z.string(),
  sourceToken: z.string(),
  wrapperToken: z.string(),
  recipient: z.string(),
  amount: z.string(),
  nonce: z.string(),
});

const UnlockPayloadSchema = z.object({
  sourceChain: z.string(),
  wrapperToken: z.string(),
  sourceAddress: z.string(),
  amount: z.string(),
  nonce: z.string(),
});

const SignedAttestationSchema = z.object({
  publicKey: z.string(),
  signature: z.string(),
});

const MintRequestSchema = z.object({
  relayer: z.string(),
  wrapperToken: z.string(),
  payload: LockPayloadSchema,
  attestations: z.array(SignedAttestationSchema).min(1),
});

const BurnRequestSchema = z.object({
  relayer: z.string(),
  wrapperToken: z.string(),
  payload: UnlockPayloadSchema,
  attestations: z.array(SignedAttestationSchema).min(1),
});

export const bridgeRoutes = async (app: FastifyInstance): Promise<void> => {
  app.post<{ Body: MintRequest }>('/mint', async (req, reply) => {
    const parsed = MintRequestSchema.safeParse(req.body);
    if (!parsed.success) return reply.badRequest(parsed.error.message);
    const request = parsed.data;
    const bridgeContract = bridge();
    const op = bridgeContract.buildMint(request);
    const txHash = await bridgeContract.simulateAndSubmit(
      {
        bridgeContractId: bridgeContract.contractId,
        sourceKeypair: app.sorobanSigner,
        networkPassphrase: app.networkPassphrase,
        sorobanRpcUrl: app.sorobanRpcUrl,
      },
      op,
    );
    reply.code(202).send({ txHash });
  });

  app.post<{ Body: BurnRequest }>('/burn', async (req, reply) => {
    const parsed = BurnRequestSchema.safeParse(req.body);
    if (!parsed.success) return reply.badRequest(parsed.error.message);
    const request = parsed.data;
    const bridgeContract = bridge();
    const op = bridgeContract.buildBurn(
      request.wrapperToken,
      request.relayer,
      request.payload,
      request.attestations,
    );
    const txHash = await bridgeContract.simulateAndSubmit(
      {
        bridgeContractId: bridgeContract.contractId,
        sourceKeypair: app.sorobanSigner,
        networkPassphrase: app.networkPassphrase,
        sorobanRpcUrl: app.sorobanRpcUrl,
      },
      op,
    );
    reply.code(202).send({ txHash });
  });
};
