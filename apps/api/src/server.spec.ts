import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { MockInstance } from 'vitest';
import { Keypair } from '@stellar/stellar-sdk';
import { __resetEnvCache } from '@stellardao/shared';
import { FactoryContract } from '@stellardao/sdk';

import { createServer } from './server.js';
import { __resetContractInstances } from './soroban/index.js';
import { assetRepository } from './db/repositories/asset-repository.js';

/**
 * Vitest env stubs.
 *
 * `vi.stubEnv` calls at module top are hoisted (like `vi.mock`), so the
 * stubs land BEFORE `server.ts` is imported — meaning the first call to
 * `parseEnv.api()` inside `createServer` reads valid values into its
 * module-level cache.
 *
 * `__resetEnvCache()` in `beforeEach` defeats cache pollution from any
 * other spec that runs in the same Vitest worker (Fastify tests, the
 * shared env module, etc.). The combination guarantees every test starts
 * from a parseEnv cache that's freshly built from the stubs below.
 */
vi.stubEnv('STELLAR_NETWORK', 'TESTNET');
vi.stubEnv('STELLAR_NETWORK_PASSPHRASE', 'Test SDF Network ; September 2015');
vi.stubEnv('HORIZON_URL', 'https://horizon-testnet.stellar.org');
vi.stubEnv('SOROBAN_RPC_URL', 'https://soroban-testnet.stellar.org');
vi.stubEnv('ETHEREUM_RPC_URL', 'https://eth.llamarpc.com');
vi.stubEnv('SOLANA_RPC_URL', 'https://api.mainnet-beta.solana.com');
vi.stubEnv('POLYGON_RPC_URL', 'https://polygon-rpc.com');
// `BRIDGE_CONTRACT_ID` / `FACTORY_CONTRACT_ID` / `WRAPPER_TOKEN_TEMPLATE_ID`
// are validated as C-prefixed contract addresses by the zod schema. Empty
// defaults would fail `.startsWith('C')`, so we stub the same test address
// Stellar uses for the friendbot contract on testnet.
vi.stubEnv('BRIDGE_CONTRACT_ID', 'CAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAD2KM');
vi.stubEnv('FACTORY_CONTRACT_ID', 'CAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAD2KM');
vi.stubEnv('WRAPPER_TOKEN_TEMPLATE_ID', 'CAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAD2KM');

// `assetRepository` is backed by a module-level `Map`. The happy-path
// POST /assets test writes to it; clear after each test so the Map
// doesn't accumulate phantom entries across runs.
afterEach(() => {
  assetRepository.__clearForTest();
});

describe('GET /health', () => {
  beforeEach(() => {
    __resetEnvCache();
    __resetContractInstances();
  });

  it('returns ok with horizon status', async () => {
    const app = await createServer();
    const res = await app.inject({ method: 'GET', url: '/health/' });
    expect(res.statusCode).toBe(200);
    const body = res.json();
    expect(body.status).toBe('ok');
    expect(body.network).toMatch(/PUBLIC|TESTNET|FUTURENET/);
    await app.close();
  });
});

describe('GET /assets/:chain/:address (not found)', () => {
  beforeEach(() => {
    __resetEnvCache();
    __resetContractInstances();
  });

  it('returns 404 for an unknown asset', async () => {
    const app = await createServer();
    const res = await app.inject({
      method: 'GET',
      url: '/assets/ethereum/0x0000000000000000000000000000000000000000',
    });
    expect(res.statusCode).toBe(404);
    await app.close();
  });
});

describe('POST /assets (happy path)', () => {
  /**
   * Spy on `FactoryContract.prototype.simulateAndSubmit` to stub the
   * soroban-rpc round-trip. The real implementation builds a
   * `TransactionBuilder`, calls `server.simulateTransaction`, assembles,
   * signs, and submits — every step of which would fail in a unit test
   * with no live Soroban RPC. Spying on the prototype intercepts calls
   * on ANY `FactoryContract` instance the route lazily constructs.
   */
  let simulateAndSubmitSpy: MockInstance;

  beforeEach(() => {
    __resetEnvCache();
    __resetContractInstances();
    simulateAndSubmitSpy = vi
      .spyOn(FactoryContract.prototype, 'simulateAndSubmit')
      .mockResolvedValue('a'.repeat(64));
  });

  afterEach(() => {
    simulateAndSubmitSpy.mockRestore();
  });

  it('returns 202 with wrapperToken + txHash for a valid body + x-developer-public-key header', async () => {
    // Use a real G-address from a randomly-generated keypair so the
    // stellar-sdk `Address` constructor's strkey checksum validation
    // passes inside `buildCreateWrapperAsset` (the SDK throws on bad
    // checksums, which would surface as a 500 from the route).
    const developerPK = Keypair.random().publicKey();

    const app = await createServer();
    const res = await app.inject({
      method: 'POST',
      url: '/assets/',
      headers: {
        'x-developer-public-key': developerPK,
      },
      payload: {
        source: {
          chain: 'ethereum',
          address: '0xabababababababababababababababababababab',
        },
        name: 'Wrapped AB',
        symbol: 'wAB',
        decimals: 18,
      },
    });
    expect(res.statusCode).toBe(202);
    const body = res.json();
    expect(body).toMatchObject({ txHash: 'a'.repeat(64) });
    expect(body).toHaveProperty('wrapperToken');
    await app.close();
  });
});

describe('POST /assets (validation)', () => {
  beforeEach(() => {
    __resetEnvCache();
    __resetContractInstances();
  });

  it('returns 400 when required fields are missing', async () => {
    const app = await createServer();
    const res = await app.inject({
      method: 'POST',
      url: '/assets/',
      payload: { source: { chain: 'ethereum', address: '0xab' } }, // name/symbol/decimals missing
    });
    expect(res.statusCode).toBe(400);
    await app.close();
  });

  it('returns 400 when x-developer-public-key header is missing', async () => {
    const app = await createServer();
    const res = await app.inject({
      method: 'POST',
      url: '/assets/',
      payload: {
        source: {
          chain: 'ethereum',
          address: '0xabababababababababababababababababababab',
        },
        name: 'Wrapped AB',
        symbol: 'wAB',
        decimals: 18,
      },
    });
    expect(res.statusCode).toBe(400);
    expect(res.body).toMatch(/x-developer-public-key/);
    await app.close();
  });
});

describe('POST /bridge/mint (body validation)', () => {
  beforeEach(() => {
    __resetEnvCache();
    __resetContractInstances();
  });

  it('returns 400 when body is empty (MintRequest zod schema fires)', async () => {
    const app = await createServer();
    const res = await app.inject({
      method: 'POST',
      url: '/bridge/mint',
      payload: {},
    });
    expect(res.statusCode).toBe(400);
    await app.close();
  });

  it('returns 400 when attestations array is missing', async () => {
    const app = await createServer();
    // Use a real G-address so future SDK bumps that add Address validation
    // upstream of the zod schema don't silently break this assertion.
    const validRelayer = Keypair.random().publicKey();
    const res = await app.inject({
      method: 'POST',
      url: '/bridge/mint',
      payload: {
        relayer: validRelayer,
        wrapperToken: 'CAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAD2KM',
        payload: {
          sourceChain: 'ethereum',
          sourceToken: '0xabababababababababababababababababababab',
          wrapperToken: 'CAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAD2KM',
          recipient: Keypair.random().publicKey(),
          amount: '1000',
          nonce: '0'.repeat(64),
        },
        // attestations missing
      },
    });
    expect(res.statusCode).toBe(400);
    await app.close();
  });
});
