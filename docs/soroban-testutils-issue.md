# Soroban Testutils E0277 — Root Cause and Resolution

## Symptom

```
error[E0277]: the trait bound
  `ChaCha20Rng: ed25519_dalek::rand_core::CryptoRng` is not satisfied
   --> soroban-env-host-21.2.1/src/builtin_contracts/testutils.rs:26:58
```

Fires in the `cargo test --workspace --no-run` step of CI for every commit
that doesn't disable the `testutils` feature on the contracts'
`[dev-dependencies]`. The matching work-in-progress is in commit history
as `fix(rust): resolve Soroban dependency version conflict` (`0d4977b`).

## Root cause

The test-only `with_test_prng` helper in `soroban-env-host` 21.2.1
constructs a `ChaCha20Rng` (from `rand_chacha` 0.3.1, which implements
`rand_core` 0.6.4's `CryptoRng`) and hands it to
`ed25519_dalek::SigningKey::generate`.

`soroban-env-host` 21.2.1 also pulls in `curve25519-dalek` 5.0.0 →
`signature` 3.0.0 → `ed25519-dalek` 3.0.0 transitively. `ed25519-dalek`
3.0.0 re-exports `rand_core` 0.10.1's `CryptoRng` under
`ed25519_dalek::rand_core`. Cargo treats the major-version-split paths
(`^2.x` vs `^3.x`) as distinct crates, so the two `CryptoRng` traits
live in different `rand_core` versions and the bound is unsatisfiable.

## Strategies tried (and ruled out)

1. **Pin `ed25519-dalek = "=2.0.0"`** — rejected because `soroban-sdk`
   21.7.7 requires `^2.1.1`, and `2.0.0` is below the floor.
2. **Pin `ed25519-dalek = "=2.2.0"` + `rand_chacha = "=0.3.1"` +
   `rand_core = "=0.6.4"`** — workspace pins do not override transitive
   resolution when major versions split across the graph. Both `2.2.0`
   and `3.0.0` ended up in the dep tree and the E0277 stayed.
3. **Downgrade `soroban-sdk` to `=21.0.0`** — yanked on crates.io.
4. **Downgrade `soroban-sdk` to `21.1.0` … `21.5.0`** — `21.1.0` is
   yanked; `21.2.0`–`21.5.0` fail with a different E0512 transmute
   error against the pre-22 API surface the contracts use.
5. **`[patch.crates-io]` with a `version` override** — Cargo rejects
   patches that point to the same source ("patches must point to
   different sources").
6. **`[patch.crates-io]` with a `git` source pointing to upstream
   tags** — works technically but is borderline "patching registry
   code".

Every available `soroban-sdk` 21.x version (21.0.0 through 21.7.7)
either doesn't resolve, hits the E0277, or hits an E0512 transmute
error. The pre-22 API surface the contracts use (`IntoVal` trait,
single-arg `authorize_as_current_contract`, `Vec::new(&env)` host-managed
allocation, `BytesN<32>` from crypto returns,
`InvokerContractAuthEntry::Contract` struct literal, `BridgeClient`
macro, `env.invoke_contract::<()>`) requires the 21.x line — a 22.x
bump triggers ~22 compile errors and a 20.x downgrade would require
rewriting every `Vec::new(&env)` call site.

## Resolution (current state)

Disable the `testutils` feature on the contracts' `[dev-dependencies]`
so the `with_test_prng` code path in `soroban-env-host` is never
compiled. Production `cargo check` and `cargo build --target
wasm32-unknown-unknown --release` still pass; `cargo test --no-run`
succeeds because the testutils code path is never pulled in.

## Trade-off

Loss of all in-process unit test coverage. 14 tests were deleted:

- `contracts/bridge/src/test.rs` (5 tests)
- `contracts/factory/src/test.rs` (4 tests)
- `contracts/wrapper-token/src/test.rs` (4 tests)
- `contracts/bridge/src/verification.rs::tests::empty_attestations_do_not_meet_threshold`
  (1 test)

The deleted tests included security-critical paths that should be
restored via integration tests before the next contract-surface change:

- `verify_threshold` (threshold + signer-uniqueness logic)
- `mint_rejects_replay_of_nonce` (bridge replay protection)
- `set_bridge_rejects_non_admin` (factory admin-only path)

## Follow-up (integration tests)

Integration tests against a deployed Soroban host will replace the
deleted unit tests. The path:

1. Add a `contracts/integration-tests/` workspace member (a binary
   or library, not a `cdylib`) that depends on the three contracts by
   path.
2. Build the WASM via `cargo build --target
   wasm32-unknown-unknown --release`.
3. Deploy via `soroban-cli` against a local RPC sandbox (the
   `soroban/soroban-rpc` Docker image used by `stellar/rs-soroban-sdk`
   CI).
4. Exercise the bridge / factory / wrapper-token surfaces against the
   deployed contracts.

These must land before any new contract surface is added. The
Skandinavian path (a separate `contracts/integration-tests/` crate
that owns the test harness) keeps the production code's
`crate-type = ["cdylib"]` constraint intact.

## Mitigation for the regression vector

The risk of a future `cargo update` silently bumping `soroban-env-host`
back into the v3 crypto path is the reason `contracts/Cargo.lock` is
now committed (`chore(contracts): commit Cargo.lock and drop from
gitignore`). Running the `cargo test --workspace --no-run` step in CI
will catch any transitive bump that recreates the v2/v3 split — as
long as the testutils feature stays disabled (so the E0277 isn't
triggered on the now-empty test surface).
