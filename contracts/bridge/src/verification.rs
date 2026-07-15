use soroban_sdk::{BytesN, Env, Map, Vec};

#[derive(Clone, Debug, Eq, PartialEq)]
pub enum AttestationError {
    /// Fewer valid signatures than required threshold.
    InsufficientSignatures,
    /// Signature recovered an address that is not in the verifier set.
    UnknownSigner,
    /// Recovered the same signer twice (signatures must be unique).
    DuplicateSigner,
}

/// Pluggable verifier trait. Implementations may use secp256k1, ed25519,
/// BLS, or a Wormhole/LayerZero proof — the bridge contract only depends on
/// this trait.
pub trait AttestationVerifier {
    fn verify(
        env: &Env,
        public_key: &BytesN<32>,
        digest: &BytesN<32>,
        signature: &BytesN<64>,
    ) -> bool;
}

/// Default verifier implementation — secp256k1 over the secp256k1 curve as
/// used by EVM chains (Ethereum, Polygon). Each operator off the bridge
/// holds an EVM key that signs `(digest)` to attest that they observed the
/// underlying `Lock`/`Unlock` event on the source chain.
///
/// Soroban protocol 22 / `soroban-sdk` 22.x exposes `Env::crypto()
/// .secp256k1_verify(...)` as a host function. The signature must be the
/// 64-byte `(r || s)` compact form produced by the standard Ethereum
/// signing pipeline.
///
/// Wraps `Secp256k1Verifier::verify` with a stable name so route handlers
/// in `apps/api/src/routes/bridge.ts` can reference a single concrete
/// verifier instead of having to know the trait plumbing on
/// `AttestationVerifier`. NOTE: until the 65-byte signature migration
/// described in `Secp256k1Verifier::verify` lands, this ALWAYS returns
/// `false` — guards the bridge from accepting silently-bogus signatures.
pub fn verify_attestation(
    env: &Env,
    public_key: &BytesN<32>,
    digest: &BytesN<32>,
    signature: &BytesN<64>,
) -> bool {
    Secp256k1Verifier::verify(env, public_key, digest, signature)
}

pub struct Secp256k1Verifier;

impl AttestationVerifier for Secp256k1Verifier {
    fn verify(
        env: &Env,
        public_key: &BytesN<32>,
        digest: &BytesN<32>,
        signature: &BytesN<64>,
    ) -> bool {
        // SECURITY STUB — returns false on every call.
        //
        // soroban-sdk 21.x renames the host function to `secp256r1_verify`
        // AND expects a 65-byte signature (`r || s || v`, recovery-id byte),
        // not the 64-byte `r || s` compact form that the relayer (and the
        // upstream Ethereum ecosystem) produces. Migrating to 65-byte
        // signatures is a cross-cutting change:
        //   * this verifier needs to deserialize the recovery byte
        //   * `packages/sdk/src/attestation.ts` needs to encode 65 bytes
        //   * `apps/relayer/src/operator/signer.ts` needs to produce 65
        //     bytes (probably via `@noble/curves/secp256k1` recovery param)
        //   * `apps/sdk/src/contracts/bridge.ts::buildMint` payload types
        //     and SDK methods need a new optional `recoveryId: u8` field
        //
        // Until that migration lands, attempting to call the host function
        // would either:
        //   (a) silently accept bogus sigs if we feed it a 64-byte value
        //       coerced to 65 (zero-padded), or
        //   (b) panic on type mismatch in the host.
        //
        // Returning false is the safe intermediate: every sign threshold is
        // unreachable, every brute-force mint attempt is rejected, and the
        // CI contract compile check passes without misleading future
        // maintainers into thinking sig verification works.
        //
        // See followup: "Migrate bridge attestation signing from 64-byte
        // r||s to 65-byte r||s||v against soroban-sdk 21.7.7."
        let _ = public_key;
        let _ = digest;
        let _ = signature;
        let _ = env;
        false
    }
}

pub fn verify_threshold(
    env: &Env,
    operators: &Vec<BytesN<32>>,
    threshold: u32,
    digest: &BytesN<32>,
    attestations: &Vec<(BytesN<32>, BytesN<64>)>,
) -> Result<(), AttestationError> {
    let mut seen: Map<BytesN<32>, bool> = Map::new(env);
    let mut valid = 0u32;

    for (pubkey, sig) in attestations.iter() {
        // soroban-sdk 21.x `Map::contains_key(K)` takes the key by value
        // (no `&K` overload until 22.x). `BytesN<32>: Clone`, so we hand
        // the map an owned copy.
        if seen.contains_key(pubkey.clone()) {
            return Err(AttestationError::DuplicateSigner);
        }
        if !operators.contains(&pubkey) {
            return Err(AttestationError::UnknownSigner);
        }
        if Secp256k1Verifier::verify(env, &pubkey, digest, &sig) {
            valid += 1;
            seen.set(pubkey, true);
        }
        if valid >= threshold {
            return Ok(());
        }
    }

    Err(AttestationError::InsufficientSignatures)
}
