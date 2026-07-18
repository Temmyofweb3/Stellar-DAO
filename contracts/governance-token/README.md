# Governance Token

SEP-41 compliant governance token with voting delegation and checkpointing.

## Features

- **ERC-20 / SEP-41 compatible**: transfer, approve, transfer_from
- **Delegation**: token holders can delegate voting power to any address
- **Checkpointing**: balances and voting power are checkpointed at each block/ledger
  so governance proposals always read a consistent historical snapshot
- **Mint/Burn**: restricted to the governance contract address

## Interface

| Function             | Auth        | Description                                  |
|----------------------|-------------|----------------------------------------------|
| `initialize`         | caller      | One-shot: set admin, name, symbol, decimals  |
| `mint`              | admin       | Mint tokens (governance distribution)        |
| `transfer`           | from        | SEP-41 transfer                              |
| `approve`            | owner       | SEP-41 approve spender                       |
| `transfer_from`      | spender     | SEP-41 allowance transfer                    |
| `delegate`           | delegator   | Delegate voting power to `to`                |
| `get_votes`          | —           | Current voting power of `account`            |
| `get_past_votes`     | —           | Historical voting power at `ledger`          |

## Deployment

```bash
soroban contract deploy \
  --wasm target/wasm32-unknown-unknown/release/governance_token.wasm \
  --source S... \
  --network testnet
```
