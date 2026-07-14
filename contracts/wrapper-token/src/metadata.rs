use soroban_sdk::{contracttype, Address, Bytes};

#[contracttype]
#[derive(Clone, Debug, Eq, PartialEq)]
pub enum DataKey {
    Admin,
    Bridge,
    Name,
    Symbol,
    Decimals,
    TotalSupply,
    AllowanceExpiry,
}

/// Convenience: balance key is just the address — Soroban uses
/// `Env::storage().persistent().set(&address, ...)` directly.
pub fn balance_key(addr: &Address) -> Address {
    addr.clone()
}

/// Convenience alias to disambiguate the SEP-41 `decimals()` return type.
pub type Decimals = u32;

/// Convenience alias for the metadata blob.
pub type MetadataBytes = Bytes;
