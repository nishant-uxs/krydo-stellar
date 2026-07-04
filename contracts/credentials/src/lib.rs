#![no_std]
//! KrydoCredentials — anchors credential hashes and revocations on Soroban.
//!
//! Only accounts whitelisted in `KrydoAuthority` may issue. The plaintext claim
//! stays off-chain (encrypted in Firestore); on-chain we store just the 32-byte
//! content hash plus provenance so any verifier can confirm issuance + status.

use soroban_sdk::{
    contract, contractevent, contracterror, contractimpl, contracttype, vec, Address, BytesN, Env,
    IntoVal, String, Symbol,
};

/// Emitted on issuance. Topics: `["cred", "issued", hash]`.
#[contractevent(topics = ["cred", "issued"])]
#[derive(Clone)]
pub struct CredentialIssued {
    #[topic]
    pub hash: BytesN<32>,
    pub issuer: Address,
    pub holder: Address,
    pub timestamp: u64,
}

/// Emitted on revocation. Topics: `["cred", "revoked", hash]`.
#[contractevent(topics = ["cred", "revoked"])]
#[derive(Clone)]
pub struct CredentialRevoked {
    #[topic]
    pub hash: BytesN<32>,
    pub revoker: Address,
    pub timestamp: u64,
}

#[contracttype]
#[derive(Clone, Copy, PartialEq, Eq)]
#[repr(u32)]
pub enum CredentialStatus {
    Active = 0,
    Revoked = 1,
}

#[contracttype]
#[derive(Clone)]
pub struct Credential {
    pub issuer: Address,
    pub holder: Address,
    pub claim_type: String,
    pub claim_summary: String,
    pub status: CredentialStatus,
    pub issued_at: u64,
    pub revoked_at: u64,
}

/// Flattened verification result returned to off-chain verifiers.
#[contracttype]
#[derive(Clone)]
pub struct VerifyResult {
    pub valid: bool,
    pub issuer: Address,
    pub holder: Address,
    pub claim_type: String,
    pub claim_summary: String,
    pub issued_at: u64,
    pub issuer_active: bool,
}

#[contracttype]
pub enum DataKey {
    Authority,
    Credential(BytesN<32>),
}

#[contracterror]
#[derive(Copy, Clone, Debug, Eq, PartialEq, PartialOrd, Ord)]
#[repr(u32)]
pub enum Error {
    NotInitialized = 1,
    NotIssuer = 2,
    AlreadyExists = 3,
    NotFound = 4,
    NotAuthorized = 5,
}

#[contract]
pub struct KrydoCredentials;

#[contractimpl]
impl KrydoCredentials {
    /// Deploy-time constructor. `authority` is the KrydoAuthority contract id.
    pub fn __constructor(env: Env, authority: Address) {
        env.storage().instance().set(&DataKey::Authority, &authority);
    }

    /// The linked KrydoAuthority contract id.
    pub fn authority(env: Env) -> Address {
        env.storage()
            .instance()
            .get(&DataKey::Authority)
            .expect("not initialized")
    }

    /// Issue a credential. `issuer` must have signed (require_auth) and must be
    /// an active issuer in KrydoAuthority.
    pub fn issue_credential(
        env: Env,
        issuer: Address,
        hash: BytesN<32>,
        holder: Address,
        claim_type: String,
        claim_summary: String,
    ) -> Result<(), Error> {
        issuer.require_auth();

        let authority: Address = env
            .storage()
            .instance()
            .get(&DataKey::Authority)
            .ok_or(Error::NotInitialized)?;

        let active: bool = env.invoke_contract(
            &authority,
            &Symbol::new(&env, "is_issuer"),
            vec![&env, issuer.clone().into_val(&env)],
        );
        if !active {
            return Err(Error::NotIssuer);
        }

        let key = DataKey::Credential(hash.clone());
        if env.storage().persistent().has(&key) {
            return Err(Error::AlreadyExists);
        }

        let cred = Credential {
            issuer: issuer.clone(),
            holder: holder.clone(),
            claim_type,
            claim_summary,
            status: CredentialStatus::Active,
            issued_at: env.ledger().timestamp(),
            revoked_at: 0,
        };
        env.storage().persistent().set(&key, &cred);

        CredentialIssued {
            hash,
            issuer,
            holder,
            timestamp: env.ledger().timestamp(),
        }
        .publish(&env);
        Ok(())
    }

    /// Revoke a credential. Allowed for the original issuer or the authority root.
    pub fn revoke_credential(env: Env, caller: Address, hash: BytesN<32>) -> Result<(), Error> {
        caller.require_auth();

        let key = DataKey::Credential(hash.clone());
        let mut cred: Credential = env
            .storage()
            .persistent()
            .get(&key)
            .ok_or(Error::NotFound)?;

        if caller != cred.issuer {
            let authority: Address = env
                .storage()
                .instance()
                .get(&DataKey::Authority)
                .ok_or(Error::NotInitialized)?;
            let root: Address =
                env.invoke_contract(&authority, &Symbol::new(&env, "root"), vec![&env]);
            if caller != root {
                return Err(Error::NotAuthorized);
            }
        }

        cred.status = CredentialStatus::Revoked;
        cred.revoked_at = env.ledger().timestamp();
        env.storage().persistent().set(&key, &cred);

        CredentialRevoked {
            hash,
            revoker: caller,
            timestamp: env.ledger().timestamp(),
        }
        .publish(&env);
        Ok(())
    }

    /// Raw credential record, or None if the hash was never anchored.
    pub fn get_credential(env: Env, hash: BytesN<32>) -> Option<Credential> {
        env.storage().persistent().get(&DataKey::Credential(hash))
    }

    /// Verify a credential: confirms it exists, is Active, and its issuer is
    /// still whitelisted. Returns None only when the hash is unknown.
    pub fn verify_credential(env: Env, hash: BytesN<32>) -> Option<VerifyResult> {
        let cred: Credential = env.storage().persistent().get(&DataKey::Credential(hash))?;

        let authority: Address = env
            .storage()
            .instance()
            .get(&DataKey::Authority)
            .expect("not initialized");
        let issuer_active: bool = env.invoke_contract(
            &authority,
            &Symbol::new(&env, "is_issuer"),
            vec![&env, cred.issuer.clone().into_val(&env)],
        );

        Some(VerifyResult {
            valid: cred.status == CredentialStatus::Active && issuer_active,
            issuer: cred.issuer,
            holder: cred.holder,
            claim_type: cred.claim_type,
            claim_summary: cred.claim_summary,
            issued_at: cred.issued_at,
            issuer_active,
        })
    }
}
