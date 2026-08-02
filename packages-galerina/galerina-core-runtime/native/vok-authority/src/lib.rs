#![forbid(unsafe_code)]

use std::collections::BTreeSet;
use std::fmt;
use std::marker::PhantomData;
use std::rc::Rc;

pub const MAX_AUTHORITY_TAG_BYTES: usize = 96;
pub const MAX_TABLE_CAPACITY: usize = 65_536;
pub const MAX_OBJECT_BYTES_LIMIT: usize = 64 * 1024 * 1024;

#[derive(Clone, Copy, Debug, Eq, Ord, PartialEq, PartialOrd)]
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

pub struct MintRequest {
    tag: AuthorityTag,
    context: AuthorityContext,
    gates: [Trit; 8],
    bytes: Vec<u8>,
}

impl fmt::Debug for MintRequest {
    fn fmt(&self, formatter: &mut fmt::Formatter<'_>) -> fmt::Result {
        formatter
            .debug_struct("MintRequest")
            .field("tag", &self.tag)
            .field("context", &self.context)
            .field("gates", &self.gates)
            .field("bytes", &"REDACTED")
            .finish()
    }
}

impl Drop for MintRequest {
    fn drop(&mut self) {
        self.bytes.fill(0);
        self.bytes.clear();
    }
}

impl MintRequest {
    #[must_use]
    pub fn new(
        tag: AuthorityTag,
        context: AuthorityContext,
        gates: [Trit; 8],
        bytes: Vec<u8>,
    ) -> Self {
        Self {
            tag,
            context,
            gates,
            bytes,
        }
    }
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
#[must_use = "dropping an admitted handle cannot authorize execution"]
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

impl Drop for AdmittedObjectHandle {
    fn drop(&mut self) {
        self.table_nonce.fill(0);
        self.slot = usize::MAX;
        self.generation = u64::MAX;
        self.object_nonce.fill(0);
        self.tag.0.clear();
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
#[must_use = "dropping a lease cannot produce an execution receipt"]
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

impl Drop for LeaseHandle {
    fn drop(&mut self) {
        self.table_nonce.fill(0);
        self.slot = usize::MAX;
        self.generation = u64::MAX;
        self.object_nonce.fill(0);
        self.tag.0.clear();
    }
}

#[expect(
    dead_code,
    reason = "Task 4 consumes tag and context during exact lease admission"
)]
struct AdmittedEntry {
    object_nonce: [u8; 16],
    tag: AuthorityTag,
    context: AuthorityContext,
    bytes: Vec<u8>,
}

impl AdmittedEntry {
    fn clear(&mut self) {
        self.object_nonce.fill(0);
        self.bytes.fill(0);
        self.bytes.clear();
    }
}

struct Slot {
    generation: u64,
    admitted: Option<AdmittedEntry>,
}

pub struct AuthorityTable<N: NonceSource> {
    nonce_source: N,
    table_nonce: [u8; 16],
    seen_nonces: BTreeSet<[u8; 16]>,
    current_context: AuthorityContext,
    byte_ceiling: usize,
    slots: Vec<Slot>,
    free_slots: Vec<usize>,
    live_count: usize,
    thread_marker: PhantomData<Rc<()>>,
}

impl<N: NonceSource> AuthorityTable<N> {
    pub fn new(
        capacity: usize,
        byte_ceiling: usize,
        current_context: AuthorityContext,
        mut nonce_source: N,
    ) -> Result<Self, VokFailure> {
        if capacity == 0 || capacity > MAX_TABLE_CAPACITY {
            return Err(VokFailure::new(Trit::Refuse, "VOK_CAPACITY_INVALID"));
        }
        if byte_ceiling == 0 || byte_ceiling > MAX_OBJECT_BYTES_LIMIT {
            return Err(VokFailure::new(Trit::Refuse, "VOK_BYTE_CEILING_INVALID"));
        }

        let table_nonce = nonce_source.next_nonce().map_err(Self::nonce_error)?;
        if table_nonce == [0; 16] {
            return Err(VokFailure::new(Trit::Refuse, "VOK_NONCE_ZERO"));
        }

        let mut seen_nonces = BTreeSet::new();
        seen_nonces.insert(table_nonce);
        let slots = (0..capacity)
            .map(|_| Slot {
                generation: 0,
                admitted: None,
            })
            .collect();
        let free_slots = (0..capacity).rev().collect();
        Ok(Self {
            nonce_source,
            table_nonce,
            seen_nonces,
            current_context,
            byte_ceiling,
            slots,
            free_slots,
            live_count: 0,
            thread_marker: PhantomData,
        })
    }

    /// Mints only from the typed, closed request surface.
    ///
    /// A Boolean, score, evidence record or receipt cannot substitute for the
    /// complete request.
    ///
    /// ```compile_fail
    /// use galerina_vok_authority::{AuthorityContext, AuthorityTable, NonceFailure, NonceSource};
    /// struct Source;
    /// impl NonceSource for Source {
    ///     fn next_nonce(&mut self) -> Result<[u8; 16], NonceFailure> { Ok([1; 16]) }
    /// }
    /// let mut table = AuthorityTable::new(
    ///     1,
    ///     1,
    ///     AuthorityContext::new([1; 32], [2; 32], [3; 32], 0, 0),
    ///     Source,
    /// ).unwrap();
    /// table.mint_admitted(true).unwrap();
    /// ```
    pub fn mint_admitted(
        &mut self,
        mut request: MintRequest,
    ) -> Result<AdmittedObjectHandle, VokFailure> {
        if request.bytes.is_empty() {
            return Err(VokFailure::new(Trit::Refuse, "VOK_OBJECT_EMPTY"));
        }
        if request.bytes.len() > self.byte_ceiling {
            return Err(VokFailure::new(Trit::Refuse, "VOK_OBJECT_TOO_LARGE"));
        }
        if request.context != self.current_context {
            return Err(VokFailure::new(Trit::Refuse, "VOK_CONTEXT_MISMATCH"));
        }

        let gate_outcome = request
            .gates
            .into_iter()
            .min()
            .expect("the fixed admission gate array is nonempty");
        if gate_outcome != Trit::Admit {
            return Err(VokFailure::new(gate_outcome, "VOK_ADMISSION_GATES_BLOCKED"));
        }

        let slot_index = self
            .free_slots
            .last()
            .copied()
            .ok_or_else(|| VokFailure::new(Trit::Unknown, "VOK_CAPACITY_EXHAUSTED"))?;
        match self.slots.get(slot_index) {
            Some(slot) if slot.admitted.is_none() => {}
            _ => return Err(VokFailure::new(Trit::Refuse, "VOK_TABLE_INVARIANT")),
        }
        let object_nonce = self.next_unique_nonce()?;
        let popped = self.free_slots.pop();
        if popped != Some(slot_index) {
            return Err(VokFailure::new(Trit::Refuse, "VOK_TABLE_INVARIANT"));
        }
        let slot = self
            .slots
            .get_mut(slot_index)
            .expect("the private free-list contains only constructed slots");

        let handle_tag = request.tag.clone();
        let entry_tag = request.tag.clone();
        let entry_context = request.context.clone();
        let entry_bytes = std::mem::take(&mut request.bytes);
        let handle = AdmittedObjectHandle {
            table_nonce: self.table_nonce,
            slot: slot_index,
            generation: slot.generation,
            object_nonce,
            tag: handle_tag,
            thread_marker: PhantomData,
        };
        slot.admitted = Some(AdmittedEntry {
            object_nonce,
            tag: entry_tag,
            context: entry_context,
            bytes: entry_bytes,
        });
        self.live_count += 1;
        Ok(handle)
    }

    #[must_use]
    pub const fn live_len(&self) -> usize {
        self.live_count
    }

    fn next_unique_nonce(&mut self) -> Result<[u8; 16], VokFailure> {
        let nonce = self.nonce_source.next_nonce().map_err(Self::nonce_error)?;
        if nonce == [0; 16] {
            return Err(VokFailure::new(Trit::Refuse, "VOK_NONCE_ZERO"));
        }
        if !self.seen_nonces.insert(nonce) {
            return Err(VokFailure::new(Trit::Refuse, "VOK_NONCE_REPEATED"));
        }
        Ok(nonce)
    }

    fn nonce_error(error: NonceFailure) -> VokFailure {
        VokFailure::new(Trit::Refuse, error.failure_id())
    }
}

impl<N: NonceSource> fmt::Debug for AuthorityTable<N> {
    fn fmt(&self, formatter: &mut fmt::Formatter<'_>) -> fmt::Result {
        formatter
            .debug_struct("AuthorityTable")
            .field("capacity", &self.slots.len())
            .field("live_count", &self.live_count)
            .field("authority_material", &"REDACTED")
            .finish()
    }
}

impl<N: NonceSource> Drop for AuthorityTable<N> {
    fn drop(&mut self) {
        for slot in &mut self.slots {
            if let Some(entry) = &mut slot.admitted {
                entry.clear();
            }
            slot.admitted = None;
        }
        self.table_nonce.fill(0);
        self.seen_nonces.clear();
        self.live_count = 0;
    }
}

#[cfg(test)]
mod tests;
