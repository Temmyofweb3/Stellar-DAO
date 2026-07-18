use soroban_sdk::contracterror;

#[contracterror]
#[derive(Copy, Clone, Debug, Eq, PartialEq)]
pub enum GovTokenError {
    AlreadyInitialized = 1,
    NotInitialized = 2,
    InvalidAmount = 3,
    InsufficientBalance = 4,
    InsufficientAllowance = 5,
    Overflow = 6,
    AllowanceExpired = 7,
    NotDelegated = 8,
    SelfDelegationNotAllowed = 9,
    DelegationNotActive = 10,
}
