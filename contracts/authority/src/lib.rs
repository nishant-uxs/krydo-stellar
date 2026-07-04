#![no_std]
//! KrydoAuthority — the root of Krydo's trust hierarchy on Soroban.
//!
//! Owns the issuer whitelist. Only the root authority (the deploying account)
//! may add or revoke issuers. `KrydoCredentials` reads `is_issuer` cross-contract
//! before accepting an issuance, so this contract is the single source of truth
//! for "who is allowed to issue".

use soroban_sdk::{
    contract, contractevent, contracterror, contractimpl, contracttype, Address, Env, String, Vec,
};

/// Metadata stored per whitelisted issuer.
#[contracttype]
#[derive(Clone)]
pub struct IssuerInfo {
    pub active: bool,
    pub name: String,
    pub approved_at: u64,
    pub revoked_at: u64,
}

/// Emitted when an issuer is whitelisted. Topics: `["issuer", "approved", issuer]`.
#[contractevent(topics = ["issuer", "approved"])]
#[derive(Clone)]
pub struct IssuerApproved {
    #[topic]
    pub issuer: Address,
    pub name: String,
    pub timestamp: u64,
}

/// Emitted when an issuer is revoked. Topics: `["issuer", "revoked", issuer]`.
#[contractevent(topics = ["issuer", "revoked"])]
#[derive(Clone)]
pub struct IssuerRevoked {
    #[topic]
    pub issuer: Address,
    pub timestamp: u64,
}

#[contracttype]
pub enum DataKey {
    Root,
    Issuer(Address),
    IssuerList,
}

#[contracterror]
#[derive(Copy, Clone, Debug, Eq, PartialEq, PartialOrd, Ord)]
#[repr(u32)]
pub enum Error {
    NotInitialized = 1,
    AlreadyActive = 2,
    NotActive = 3,
}

#[contract]
pub struct KrydoAuthority;

#[contractimpl]
impl KrydoAuthority {
    /// Deploy-time constructor. The deploying account becomes the immutable root.
    pub fn __constructor(env: Env, root: Address) {
        env.storage().instance().set(&DataKey::Root, &root);
        env.storage()
            .instance()
            .set(&DataKey::IssuerList, &Vec::<Address>::new(&env));
    }

    /// The root authority address.
    pub fn root(env: Env) -> Address {
        env.storage()
            .instance()
            .get(&DataKey::Root)
            .expect("not initialized")
    }

    /// Whitelist `issuer` under a human-readable `name`. Root-only.
    pub fn add_issuer(env: Env, issuer: Address, name: String) -> Result<(), Error> {
        let root: Address = env
            .storage()
            .instance()
            .get(&DataKey::Root)
            .ok_or(Error::NotInitialized)?;
        root.require_auth();

        let key = DataKey::Issuer(issuer.clone());
        if let Some(info) = env.storage().persistent().get::<_, IssuerInfo>(&key) {
            if info.active {
                return Err(Error::AlreadyActive);
            }
        }

        let info = IssuerInfo {
            active: true,
            name: name.clone(),
            approved_at: env.ledger().timestamp(),
            revoked_at: 0,
        };
        env.storage().persistent().set(&key, &info);

        let mut list: Vec<Address> = env
            .storage()
            .instance()
            .get(&DataKey::IssuerList)
            .unwrap_or_else(|| Vec::new(&env));
        if !list.contains(&issuer) {
            list.push_back(issuer.clone());
            env.storage().instance().set(&DataKey::IssuerList, &list);
        }

        IssuerApproved {
            issuer,
            name,
            timestamp: env.ledger().timestamp(),
        }
        .publish(&env);
        Ok(())
    }

    /// Revoke a previously whitelisted issuer. Root-only.
    pub fn revoke_issuer(env: Env, issuer: Address) -> Result<(), Error> {
        let root: Address = env
            .storage()
            .instance()
            .get(&DataKey::Root)
            .ok_or(Error::NotInitialized)?;
        root.require_auth();

        let key = DataKey::Issuer(issuer.clone());
        let mut info: IssuerInfo = env
            .storage()
            .persistent()
            .get(&key)
            .ok_or(Error::NotActive)?;
        if !info.active {
            return Err(Error::NotActive);
        }
        info.active = false;
        info.revoked_at = env.ledger().timestamp();
        env.storage().persistent().set(&key, &info);

        IssuerRevoked {
            issuer,
            timestamp: env.ledger().timestamp(),
        }
        .publish(&env);
        Ok(())
    }

    /// True if `addr` is currently an active issuer.
    pub fn is_issuer(env: Env, addr: Address) -> bool {
        env.storage()
            .persistent()
            .get::<_, IssuerInfo>(&DataKey::Issuer(addr))
            .map(|i| i.active)
            .unwrap_or(false)
    }

    /// Full issuer record (present even after revocation), or None if never added.
    pub fn get_issuer_info(env: Env, addr: Address) -> Option<IssuerInfo> {
        env.storage().persistent().get(&DataKey::Issuer(addr))
    }

    /// Every address that has ever been whitelisted (active or revoked).
    pub fn get_issuers(env: Env) -> Vec<Address> {
        env.storage()
            .instance()
            .get(&DataKey::IssuerList)
            .unwrap_or_else(|| Vec::new(&env))
    }
}

#[cfg(test)]
mod test {
    use super::*;
    use soroban_sdk::{testutils::Address as _, Env};

    #[test]
    fn whitelist_lifecycle() {
        let env = Env::default();
        env.mock_all_auths();

        let root = Address::generate(&env);
        let contract_id = env.register(KrydoAuthority, (root.clone(),));
        let client = KrydoAuthorityClient::new(&env, &contract_id);

        let issuer = Address::generate(&env);
        assert!(!client.is_issuer(&issuer));

        client.add_issuer(&issuer, &String::from_str(&env, "CIBIL"));
        assert!(client.is_issuer(&issuer));
        assert_eq!(client.get_issuers().len(), 1);

        client.revoke_issuer(&issuer);
        assert!(!client.is_issuer(&issuer));

        let info = client.get_issuer_info(&issuer).unwrap();
        assert!(!info.active);
        assert!(info.revoked_at > 0 || info.revoked_at == 0);
    }
}
