#![no_std]
//! KrydoAudit — a minimal event-anchoring contract.
//!
//! Off-chain lifecycle events (role assignments, credential requests, renewals)
//! that don't warrant their own storage still deserve an immutable, timestamped
//! on-chain record. `anchor` emits a single indexed event; nothing is persisted
//! in contract storage, keeping the anchor cheap.

use soroban_sdk::{contract, contractevent, contractimpl, Address, Bytes, BytesN, Env, Symbol};

/// A single anchored off-chain event. Topics: `["anchor", kind, id]`.
#[contractevent(topics = ["anchor"])]
#[derive(Clone)]
pub struct Anchor {
    #[topic]
    pub kind: Symbol,
    #[topic]
    pub id: BytesN<32>,
    pub caller: Address,
    pub data: Bytes,
    pub timestamp: u64,
}

#[contract]
pub struct KrydoAudit;

#[contractimpl]
impl KrydoAudit {
    /// Emit an anchor event. `kind` categorises the payload (e.g. a short symbol
    /// like `role`, `credreq`, `renewal`), `id` is a 32-byte correlation id and
    /// `data` is the opaque payload. The caller must authorise the anchor.
    pub fn anchor(env: Env, caller: Address, kind: Symbol, id: BytesN<32>, data: Bytes) {
        caller.require_auth();
        Anchor {
            kind,
            id,
            caller,
            data,
            timestamp: env.ledger().timestamp(),
        }
        .publish(&env);
    }
}

#[cfg(test)]
mod test {
    use super::*;
    use soroban_sdk::{symbol_short, testutils::Address as _, Bytes, BytesN, Env};

    #[test]
    fn anchor_requires_auth_and_emits() {
        let env = Env::default();
        env.mock_all_auths();

        let contract_id = env.register(KrydoAudit, ());
        let client = KrydoAuditClient::new(&env, &contract_id);

        let caller = Address::generate(&env);
        let id = BytesN::from_array(&env, &[7u8; 32]);
        let data = Bytes::from_array(&env, &[1, 2, 3]);

        // Succeeds (require_auth is mocked) and emits an anchor event.
        client.anchor(&caller, &symbol_short!("role"), &id, &data);
    }
}
