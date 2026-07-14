/**
 * Factory SDK wrapper. Wraps create_wrapper() with a typed helper.
 */
import {
  Account,
  Address,
  type Keypair,
  Operation,
  SorobanRpc,
  TransactionBuilder,
  nativeToScVal,
} from '@stellar/stellar-sdk';
import type { AssetId } from '@stellardao/shared';

export type CreateWrapperInput = {
  sourceChain: AssetId['chain'];
  sourceToken: string;
  name: string;
  symbol: string;
  decimals: number;
};

export type FactoryInvokeOptions = {
  factoryContractId: string;
  sourceKeypair: Keypair;
  networkPassphrase: string;
  sorobanRpcUrl: string;
  fee?: number;
};

export class FactoryContract {
  constructor(public readonly contractId: string) {}

  buildCreateWrapperAsset(developerPK: string, input: CreateWrapperInput) {
    return Operation.invokeContractFunction({
      contract: this.contractId,
      function: 'create_wrapper',
      args: [
        new Address(developerPK).toScVal(),
        nativeToScVal(input.sourceChain, { type: 'symbol' }),
        nativeToScVal(Buffer.from(input.sourceToken.replace(/^0x/, ''), 'hex')),
        nativeToScVal(Buffer.from(input.name)),
        nativeToScVal(Buffer.from(input.symbol)),
        nativeToScVal(input.decimals, { type: 'u32' }),
      ],
    });
  }

  async simulateAndSubmit(
    opts: FactoryInvokeOptions,
    op: ReturnType<typeof Operation.invokeContractFunction>,
  ): Promise<string> {
    const tx = new TransactionBuilder(
      new Account(opts.sourceKeypair.publicKey(), '0'),
      {
        networkPassphrase: opts.networkPassphrase,
        fee: (opts.fee ?? 100).toString(),
      },
    )
      .setTimeout(30)
      .addOperation(op)
      .build();

    const server = new SorobanRpc.Server(opts.sorobanRpcUrl);
    const simulated = await server.simulateTransaction(tx);
    if (SorobanRpc.Api.isSimulationError(simulated)) {
      throw new Error(`factory simulation failed: ${simulated.error}`);
    }
    const prepared = SorobanRpc.assembleTransaction(tx, simulated).build();
    prepared.sign(opts.sourceKeypair);
    const sent = await server.sendTransaction(prepared);
    return sent.hash;
  }
}
