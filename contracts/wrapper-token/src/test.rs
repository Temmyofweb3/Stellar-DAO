#![cfg(test)]

use super::*;
use soroban_sdk::{testutils::Address as _, vec, Address, Bytes, Env, IntoVal, Symbol};

fn deploy_token(env: &Env) -> (Address, Address, Address) {
    let admin = Address::generate(env);
    let bridge = Address::generate(env);
    let token = env.register_contract(None, WrapperToken);
    let client = WrapperTokenClient::new(env, &token);
    client.initialize(
        &admin,
        &bridge,
        &Bytes::from_slice(env, b"Stellar Wrapped USD"),
        &Bytes::from_slice(env, b"wUSD"),
        &6,
    );
    (token, admin, bridge)
}

#[test]
fn metadata_round_trips() {
    let env = Env::default();
    let (token, _admin, _bridge) = deploy_token(&env);
    let client = WrapperTokenClient::new(&env, &token);
    let name = client.name();
    let symbol = client.symbol();
    let decimals = client.decimals();
    assert_eq!(name, Bytes::from_slice(&env, b"Stellar Wrapped USD"));
    assert_eq!(symbol, Bytes::from_slice(&env, b"wUSD"));
    assert_eq!(decimals, 6);
}

#[test]
fn mint_increases_balance_and_supply() {
    let env = Env::default();
    env.mock_all_auths();
    let (token, _admin, bridge) = deploy_token(&env);
    let client = WrapperTokenClient::new(&env, &token);
    let user = Address::generate(&env);
    client.mint(&user, &1_000_000);
    assert_eq!(client.balance(&user), 1_000_000);
    assert_eq!(client.total_supply(), 1_000_000);
    let _ = bridge; // captured only for clarity
}

#[test]
fn mint_rejects_non_bridge_caller() {
    // No auth mocks — the bridge address is not signed in, so mint's
    // `bridge.require_auth()` panics regardless of how the test client
    // invokes the function.
    let env = Env::default();
    let (token, _admin, _bridge) = deploy_token(&env);
    let client = WrapperTokenClient::new(&env, &token);
    let user = Address::generate(&env);
    let res = std::panic::catch_unwind(|| client.mint(&user, &1));
    assert!(
        res.is_err(),
        "mint must reject callers that aren't the bridge"
    );
}

#[test]
fn burn_reduces_supply() {
    let env = Env::default();
    env.mock_all_auths();
    let (token, _admin, _bridge) = deploy_token(&env);
    let client = WrapperTokenClient::new(&env, &token);
    let user = Address::generate(&env);
    client.mint(&user, &5);
    client.burn(&user, &2);
    assert_eq!(client.balance(&user), 3);
    assert_eq!(client.total_supply(), 3);
}
