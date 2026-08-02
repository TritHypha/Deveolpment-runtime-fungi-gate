#![forbid(unsafe_code)]

use std::fmt;
use std::marker::PhantomData;
use std::rc::Rc;

pub const MAX_AUTHORITY_TAG_BYTES: usize = 96;

#[derive(Clone, Copy, Debug, Eq, PartialEq)]
#[repr(i8)]
pub enum Trit {
    Refuse = -1,
    Unknown = 0,
    Admit = 1,
}

impl TryFrom<i32> for Trit {
    type Error = VokFailure;

    fn try_from(value: i32) -> Result<Self, Self::Error> {
        match value {
            -1 => Ok(Self::Refuse),
            0 => Ok(Self::Unknown),
            1 => Ok(Self::Admit),
            _ => Err(VokFailure::new(Self::Refuse, "VOK_TRIT_INVALID")),
        }
    }
}

#[derive(Clone, Debug, Eq, PartialEq)]
pub struct VokFailure {
    outcome: Trit,
    failure_id: &'static str,
}

impl VokFailure {
    #[must_use]
    pub const fn new(outcome: Trit, failure_id: &'static str) -> Self {
        Self {
            outcome,
            failure_id,
        }
    }

    #[must_use]
    pub const fn outcome(&self) -> Trit {
        self.outcome
    }

    #[must_use]
    pub const fn failure_id(&self) -> &'static str {
        self.failure_id
    }
}

impl fmt::Display for VokFailure {
    fn fmt(&self, formatter: &mut fmt::Formatter<'_>) -> fmt::Result {
        formatter.write_str(self.failure_id)
    }
}

impl std::error::Error for VokFailure {}

#[derive(Clone, Debug, Eq, PartialEq)]
pub struct NonceFailure {
    failure_id: &'static str,
}

impl NonceFailure {
    #[must_use]
    pub const fn new(failure_id: &'static str) -> Self {
        Self { failure_id }
    }

    #[must_use]
    pub const fn outcome(&self) -> Trit {
        Trit::Refuse
    }

    #[must_use]
    pub const fn failure_id(&self) -> &'static str {
        self.failure_id
    }
}

impl fmt::Display for NonceFailure {
    fn fmt(&self, formatter: &mut fmt::Formatter<'_>) -> fmt::Result {
        formatter.write_str(self.failure_id)
    }
}

impl std::error::Error for NonceFailure {}

pub trait NonceSource {
    fn next_nonce(&mut self) -> Result<[u8; 16], NonceFailure>;
}

#[derive(Clone, Debug, Eq, PartialEq)]
pub struct AuthorityTag(String);

impl AuthorityTag {
    pub fn parse(value: &str) -> Result<Self, VokFailure> {
        if value.len() > MAX_AUTHORITY_TAG_BYTES {
            return Err(VokFailure::new(Trit::Refuse, "VOK_TAG_TOO_LARGE"));
        }

        let valid = !value.is_empty()
            && value.split('.').all(|segment| {
                let mut bytes = segment.bytes();
                matches!(bytes.next(), Some(b'a'..=b'z'))
                    && bytes.all(|byte| {
                        byte.is_ascii_lowercase()
                            || byte.is_ascii_digit()
                            || matches!(byte, b'-' | b'_')
                    })
            });
        if !valid {
            return Err(VokFailure::new(Trit::Refuse, "VOK_TAG_INVALID"));
        }

        Ok(Self(value.to_owned()))
    }

    #[must_use]
    pub fn as_str(&self) -> &str {
        &self.0
    }
}

#[derive(Clone, Debug, Eq, PartialEq)]
pub struct AuthorityContext {
    target_digest: [u8; 32],
    policy_digest: [u8; 32],
    verifier_digest: [u8; 32],
    policy_epoch: u64,
    revocation_epoch: u64,
}

impl AuthorityContext {
    #[must_use]
    pub const fn new(
        target_digest: [u8; 32],
        policy_digest: [u8; 32],
        verifier_digest: [u8; 32],
        policy_epoch: u64,
        revocation_epoch: u64,
    ) -> Self {
        Self {
            target_digest,
            policy_digest,
            verifier_digest,
            policy_epoch,
            revocation_epoch,
        }
    }

    #[must_use]
    pub const fn target_digest(&self) -> &[u8; 32] {
        &self.target_digest
    }

    #[must_use]
    pub const fn policy_digest(&self) -> &[u8; 32] {
        &self.policy_digest
    }

    #[must_use]
    pub const fn verifier_digest(&self) -> &[u8; 32] {
        &self.verifier_digest
    }

    #[must_use]
    pub const fn policy_epoch(&self) -> u64 {
        self.policy_epoch
    }

    #[must_use]
    pub const fn revocation_epoch(&self) -> u64 {
        self.revocation_epoch
    }
}

/// Opaque, flow-local authority over an admitted object.
///
/// Safe callers cannot construct, copy, clone or move this value between
/// threads.
///
/// ```compile_fail
/// use galerina_vok_authority::{AdmittedObjectHandle, AuthorityTag};
/// let handle = AdmittedObjectHandle {
///     table_nonce: [1; 16],
///     slot: 0,
///     generation: 0,
///     object_nonce: [2; 16],
///     tag: AuthorityTag::parse("slide.vok.execute.v1").unwrap(),
///     thread_marker: Default::default(),
/// };
/// ```
///
/// ```compile_fail
/// use galerina_vok_authority::AdmittedObjectHandle;
/// fn require_clone<T: Clone>() {}
/// require_clone::<AdmittedObjectHandle>();
/// ```
///
/// ```compile_fail
/// use galerina_vok_authority::AdmittedObjectHandle;
/// fn require_copy<T: Copy>() {}
/// require_copy::<AdmittedObjectHandle>();
/// ```
///
/// ```compile_fail
/// use galerina_vok_authority::AdmittedObjectHandle;
/// fn require_send<T: Send>() {}
/// require_send::<AdmittedObjectHandle>();
/// ```
///
/// ```compile_fail
/// use galerina_vok_authority::AdmittedObjectHandle;
/// fn require_sync<T: Sync>() {}
/// require_sync::<AdmittedObjectHandle>();
/// ```
#[expect(
    dead_code,
    reason = "Task 3 consumes every opaque identity field during exact table lookup"
)]
pub struct AdmittedObjectHandle {
    table_nonce: [u8; 16],
    slot: usize,
    generation: u64,
    object_nonce: [u8; 16],
    tag: AuthorityTag,
    thread_marker: PhantomData<Rc<()>>,
}

impl fmt::Debug for AdmittedObjectHandle {
    fn fmt(&self, formatter: &mut fmt::Formatter<'_>) -> fmt::Result {
        formatter.write_str("AdmittedObjectHandle(REDACTED)")
    }
}

/// Opaque, flow-local authority over one open execution lease.
///
/// ```compile_fail
/// use galerina_vok_authority::{AuthorityTag, LeaseHandle};
/// let handle = LeaseHandle {
///     table_nonce: [1; 16],
///     slot: 0,
///     generation: 0,
///     object_nonce: [2; 16],
///     tag: AuthorityTag::parse("slide.vok.execute.v1").unwrap(),
///     thread_marker: Default::default(),
/// };
/// ```
///
/// ```compile_fail
/// use galerina_vok_authority::LeaseHandle;
/// fn require_clone<T: Clone>() {}
/// require_clone::<LeaseHandle>();
/// ```
///
/// ```compile_fail
/// use galerina_vok_authority::LeaseHandle;
/// fn require_copy<T: Copy>() {}
/// require_copy::<LeaseHandle>();
/// ```
///
/// ```compile_fail
/// use galerina_vok_authority::LeaseHandle;
/// fn require_send<T: Send>() {}
/// require_send::<LeaseHandle>();
/// ```
///
/// ```compile_fail
/// use galerina_vok_authority::LeaseHandle;
/// fn require_sync<T: Sync>() {}
/// require_sync::<LeaseHandle>();
/// ```
#[expect(
    dead_code,
    reason = "Task 3 consumes every opaque identity field during exact table lookup"
)]
pub struct LeaseHandle {
    table_nonce: [u8; 16],
    slot: usize,
    generation: u64,
    object_nonce: [u8; 16],
    tag: AuthorityTag,
    thread_marker: PhantomData<Rc<()>>,
}

impl fmt::Debug for LeaseHandle {
    fn fmt(&self, formatter: &mut fmt::Formatter<'_>) -> fmt::Result {
        formatter.write_str("LeaseHandle(REDACTED)")
    }
}

#[cfg(test)]
mod tests;
