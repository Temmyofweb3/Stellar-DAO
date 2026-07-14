/**
 * Wrapper-token SDK wrapper. Read-side helpers (`balance`, `metadata`)
 * use `readContractCall` returns; write-side helpers build `Operation`s.
 */
import { Address, Operation, nativeToScVal, scValToBigInt } from '@stellar/stellar-sdk';

export type TokenMetadata = {
  name: string;
  symbol: string;
  decimals: number;
};

export class WrapperTokenContract {
  constructor(public readonly contractId: string) {}

  buildMint(_bridgePK: string, recipient: string, amount: bigint) {
    return Operation.invokeContractFunction({
      contract: this.contractId,
      function: 'mint',
      args: [new Address(recipient).toScVal(), nativeToScVal(amount, { type: 'i128' })],
    });
  }

  buildBurn(from: string, amount: bigint) {
    return Operation.invokeContractFunction({
      contract: this.contractId,
      function: 'burn',
      args: [new Address(from).toScVal(), nativeToScVal(amount, { type: 'i128' })],
    });
  }

  buildTransfer(from: string, to: string, amount: bigint) {
    return Operation.invokeContractFunction({
      contract: this.contractId,
      function: 'transfer',
      args: [
        new Address(from).toScVal(),
        new Address(to).toScVal(),
        nativeToScVal(amount, { type: 'i128' }),
      ],
    });
  }

  static decodeBalance(value: unknown): bigint {
    return scValToBigInt(value as Parameters<typeof scValToBigInt>[0]);
  }

  static tokenInfo(contractId: string): TokenMetadata {
    return {
      name: `Wrapped Token (${contractId.slice(0, 6)}…)`,
      symbol: `w-${contractId.slice(0, 4)}`,
      decimals: 7,
    };
  }
}
