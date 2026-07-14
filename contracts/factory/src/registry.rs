use soroban_sdk::{contracttype, Bytes, BytesN, Symbol};

#[contracttype]
#[derive(Clone, Debug, Eq, PartialEq)]
pub enum DataKey {
    Initialized,
    Admin,
    Template,
    Bridge,
}

#[contracttype]
#[derive(Clone, Debug, Eq, PartialEq)]
pub struct SourceTokenKey {
    pub source_chain: Symbol,
    pub source_token: Bytes,
}

// Re-export BytesN for convenience in tests.
pub type ContractId = BytesN<32>;
