#![no_std]

//! # Bridge Contract
//!
//! Single entry point for cross-chain wrap/unwrap operations.
//!
//! Responsibilities:
//!   * Maintain a verifier set (operators) with a configurable signing threshold
//!     for source-chain attestations.
//!   * Verify signed `(nonce, source_chain, source_token, recipient, amount, wrapper_token_id)`
//!     payloads produced by [`apps/relayer`](../apps/relayer).
//!   * Prevent replay attacks by tracking consumed nonces.
//!   * On a verified `Lock` event, charge mint authority to the corresponding
//!     `wrapper-token` contract.
//!   * On a verified `Unlock` event, burn on the wrapper-token and record the
//!     outbound transfer for the relayer to act on.
//!
//! The signature scheme is intentionally pluggable: the relayer produces
//! secp256k1 signatures today (cheap, broadly supported on EVM chains) but
//! the verifier interface can be swapped for ed25519 or a Wormhole/LayerZero
//! proof without changing the contract surface.

use soroban_sdk::{
    contract, contractimpl, vec, Address, BytesN, Env, Symbol, Vec,
};

mod storage;
mod verification;

pub use storage::{DataKey, LockPayload, UnlockPayload};
pub use verification::{verify_attestation, AttestationError, AttestationVerifier};

#[contract]
pub struct Bridge;

#[contractimpl]
impl Bridge {
    /// Initialize the bridge with a verifier set and threshold.
    /// Can only be called once.
    pub fn initialize(
        env: Env,
        admin: Address,
        operators: Vec<BytesN<32>>,
        threshold: u32,
    ) {
        if env.storage().instance().has(&DataKey::Initialized) {
            panic!("bridge already initialized");
        }
        admin.require_auth();

        assert!(!operators.is_empty(), "operators must not be empty");
        assert!(
            threshold as usize >= 1 && threshold as usize <= operators.len(),
            "invalid threshold",
        );

        env.storage().instance().set(&DataKey::Admin, &admin);
        env.storage().instance().set(&DataKey::Operators, &operators);
        env.storage()
            .instance()
            .set(&DataKey::Threshold, &threshold);
        env.storage()
            .instance()
            .set(&DataKey::Initialized, &true);
    }

    pub fn admin(env: Env) -> Address {
        env.storage()
            .instance()
            .get(&DataKey::Admin)
            .expect("bridge not initialized")
    }

    pub fn threshold(env: Env) -> u32 {
        env.storage()
            .instance()
            .get(&DataKey::Threshold)
            .expect("bridge not initialized")
    }

    pub fn operators(env: Env) -> Vec<BytesN<32>> {
        env.storage()
            .instance()
            .get(&DataKey::Operators)
            .expect("bridge not initialized")
    }

    /// Update the verifier set and threshold. Callable by admin only.
    pub fn set_verifiers(
        env: Env,
        operators: Vec<BytesN<32>>,
        threshold: u32,
    ) {
        let admin: Address = env
            .storage()
            .instance()
            .get(&DataKey::Admin)
            .expect("bridge not initialized");
        admin.require_auth();

        assert!(!operators.is_empty(), "operators must not be empty");
        assert!(
            threshold as usize >= 1 && threshold as usize <= operators.len(),
            "invalid threshold",
        );

        env.storage().instance().set(&DataKey::Operators, &operators);
        env.storage()
            .instance()
            .set(&DataKey::Threshold, &threshold);
    }

    /// Wrap (mint) entry point — called by the relayer after observing a `Lock`
    /// event on a source chain.
    ///
    /// `wrapper_token` MUST be a contract previously created by the
    /// [`factory`](../factory) for the `(source_chain, source_token)` pair
    /// declared in `payload`.
    pub fn mint_with_attestation(
        env: Env,
        relayer: Address,
        wrapper_token: Address,
        payload: LockPayload,
        attestations: Vec<(BytesN<32>, BytesN<64>)>,
    ) {
        relayer.require_auth();

        // CRITICAL: verify signatures BEFORE persisting the nonce. The
        // previous ordering let any caller spamm pre-computed payloads to
        // exhaust persistent storage rent.
        Self::verify_lock(env.clone(), &payload, &attestations);
        assert!(
            !env.storage().persistent().has(&payload.nonce),
            "nonce reused"
        );

        // Cross-contract auth: tell the host this contract authorizes the
        // bridge address to act on its behalf, then call wrapper-token.mint,
        // which does `bridge.require_auth()`. The auth tree handles the
        // delegation.
        Self::auth_self(&env);
        env.invoke_contract::<()>(
            &wrapper_token,
            &Symbol::new(&env, "mint"),
            vec![
                &env,
                payload.recipient.to_val(),
                payload.amount.to_val(),
            ],
        );

        env.storage().persistent().set(&payload.nonce, &true);

        env.events().publish(
            (Symbol::new(&env, "bridge"), Symbol::new(&env, "MintRequested")),
            (
                wrapper_token.clone(),
                payload.recipient.clone(),
                payload.amount,
                payload.source_chain.to_string(),
                payload.source_token.clone(),
                payload.nonce.clone(),
            ),
        );
    }

    /// Unwrap (burn) entry point — called by a user wanting to redeem their
    /// wrapped tokens back to the source chain. Burns on Stellar, the relayer
    /// notices the `BurnRequested` event and submits the matching `Unlock`
    /// transaction on the source chain.
    pub fn burn_with_attestation(
        env: Env,
        relayer: Address,
        wrapper_token: Address,
        payload: UnlockPayload,
        attestations: Vec<(BytesN<32>, BytesN<64>)>,
    ) {
        relayer.require_auth();

        Self::verify_unlock(env.clone(), &payload, &attestations);
        assert!(
            !env.storage().persistent().has(&payload.nonce),
            "nonce reused"
        );

        Self::auth_self(&env);
        env.invoke_contract::<()>(
            &wrapper_token,
            &Symbol::new(&env, "burn"),
            vec![
                &env,
                payload.source_address.to_val(),
                payload.amount.to_val(),
            ],
        );

        env.storage().persistent().set(&payload.nonce, &true);

        env.events().publish(
            (Symbol::new(&env, "bridge"), Symbol::new(&env, "BurnRequested")),
            (
                wrapper_token.clone(),
                payload.source_address.clone(),
                payload.amount,
                payload.nonce.clone(),
            ),
        );
    }

    /// Authorize the bridge contract to act on its own behalf before
    /// `invoke_contract` calls. Required because the wrapper-token uses
    /// `bridge.require_auth()` in mint/burn.
    fn auth_self(env: &Env) {
        let self_addr = env.current_contract_address();
        env.authorize_as_current_contract(self_addr);
    }

    fn verify_lock(
        env: Env,
        payload: &LockPayload,
        attestations: &Vec<(BytesN<32>, BytesN<64>)>,
    ) {
        let operators: Vec<BytesN<32>> = env
            .storage()
            .instance()
            .get(&DataKey::Operators)
            .expect("bridge not initialized");
        let threshold: u32 = env
            .storage()
            .instance()
            .get(&DataKey::Threshold)
            .expect("bridge not initialized");

        let digest = payload.digest(&env);
        verify_threshold(&env, &operators, threshold, &digest, attestations)
            .unwrap_or_else(|err| panic!("attestation rejected: {:?}", err));
    }

    fn verify_unlock(
        env: Env,
        payload: &UnlockPayload,
        attestations: &Vec<(BytesN<32>, BytesN<64>)>,
    ) {
        let operators: Vec<BytesN<32>> = env
            .storage()
            .instance()
            .get(&DataKey::Operators)
            .expect("bridge not initialized");
        let threshold: u32 = env
            .storage()
            .instance()
            .get(&DataKey::Threshold)
            .expect("bridge not initialized");

        let digest = payload.digest(&env);
        verify_threshold(&env, &operators, threshold, &digest, attestations)
            .unwrap_or_else(|err| panic!("attestation rejected: {:?}", err));
    }
}
