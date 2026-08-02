use super::*;
use std::collections::VecDeque;

struct SequenceNonce {
    values: VecDeque<Result<[u8; 16], NonceFailure>>,
}

impl SequenceNonce {
    fn from_nonces(values: impl IntoIterator<Item = [u8; 16]>) -> Self {
        Self {
            values: values.into_iter().map(Ok).collect(),
        }
    }

    fn refusing(failure_id: &'static str) -> Self {
        Self {
            values: VecDeque::from([Err(NonceFailure::new(failure_id))]),
        }
    }
}

impl NonceSource for SequenceNonce {
    fn next_nonce(&mut self) -> Result<[u8; 16], NonceFailure> {
        self.values
            .pop_front()
            .unwrap_or_else(|| Err(NonceFailure::new("VOK_TEST_NONCE_EXHAUSTED")))
    }
}

fn context(seed: u8, policy_epoch: u64, revocation_epoch: u64) -> AuthorityContext {
    AuthorityContext::new(
        [seed; 32],
        [seed.wrapping_add(1); 32],
        [seed.wrapping_add(2); 32],
        policy_epoch,
        revocation_epoch,
    )
}

fn mint_request(gates: [Trit; 8], bytes: Vec<u8>) -> MintRequest {
    MintRequest::new(
        AuthorityTag::parse("slide.vok.execute.v1").expect("canonical test tag"),
        context(7, 3, 5),
        gates,
        bytes,
    )
}

fn all_admit() -> [Trit; 8] {
    [Trit::Admit; 8]
}

#[test]
fn trit_accepts_only_the_closed_k3_domain() {
    assert_eq!(Trit::try_from(-1), Ok(Trit::Refuse));
    assert_eq!(Trit::try_from(0), Ok(Trit::Unknown));
    assert_eq!(Trit::try_from(1), Ok(Trit::Admit));

    for malformed in [i32::MIN, -2, 2, 7, i32::MAX] {
        let error = Trit::try_from(malformed).expect_err("malformed trit must refuse");
        assert_eq!(error.outcome(), Trit::Refuse);
        assert_eq!(error.failure_id(), "VOK_TRIT_INVALID");
    }
}

#[test]
fn authority_tag_is_bounded_and_canonical() {
    let tag = AuthorityTag::parse("slide.vok.execute.v1").expect("canonical tag");
    assert_eq!(tag.as_str(), "slide.vok.execute.v1");

    for malformed in [
        "",
        ".slide",
        "SLIDE.vok.execute.v1",
        "slide/vok",
        "slide..vok",
        "slide.vok.",
    ] {
        let error = AuthorityTag::parse(malformed).expect_err("malformed tag must refuse");
        assert_eq!(error.outcome(), Trit::Refuse);
        assert_eq!(error.failure_id(), "VOK_TAG_INVALID");
    }

    let oversized = "a".repeat(MAX_AUTHORITY_TAG_BYTES + 1);
    let error = AuthorityTag::parse(&oversized).expect_err("oversized tag must refuse");
    assert_eq!(error.failure_id(), "VOK_TAG_TOO_LARGE");
}

#[test]
fn authority_context_preserves_every_exact_identity_and_epoch() {
    let context = AuthorityContext::new([1; 32], [2; 32], [3; 32], 17, 29);
    assert_eq!(context.target_digest(), &[1; 32]);
    assert_eq!(context.policy_digest(), &[2; 32]);
    assert_eq!(context.verifier_digest(), &[3; 32]);
    assert_eq!(context.policy_epoch(), 17);
    assert_eq!(context.revocation_epoch(), 29);
}

#[test]
fn injected_nonce_source_has_a_stable_fail_close_error() {
    struct RefusingNonce;

    impl NonceSource for RefusingNonce {
        fn next_nonce(&mut self) -> Result<[u8; 16], NonceFailure> {
            Err(NonceFailure::new("VOK_NONCE_UNAVAILABLE"))
        }
    }

    let error = RefusingNonce
        .next_nonce()
        .expect_err("nonce source refusal must remain explicit");
    assert_eq!(error.outcome(), Trit::Refuse);
    assert_eq!(error.failure_id(), "VOK_NONCE_UNAVAILABLE");
}

#[test]
fn opaque_handle_debug_output_reveals_no_authority_material() {
    let tag = AuthorityTag::parse("slide.vok.execute.v1").expect("canonical tag");
    let admitted = AdmittedObjectHandle {
        table_nonce: [0x11; 16],
        slot: 42,
        generation: 9,
        object_nonce: [0x22; 16],
        tag: tag.clone(),
        thread_marker: Default::default(),
    };
    let lease = LeaseHandle {
        table_nonce: [0x33; 16],
        slot: 7,
        generation: 11,
        object_nonce: [0x44; 16],
        tag,
        thread_marker: Default::default(),
    };

    assert_eq!(format!("{admitted:?}"), "AdmittedObjectHandle(REDACTED)");
    assert_eq!(format!("{lease:?}"), "LeaseHandle(REDACTED)");

    let request = mint_request(all_admit(), b"secret-object-bytes".to_vec());
    let request_debug = format!("{request:?}");
    assert!(request_debug.contains("REDACTED"));
    assert!(!request_debug.contains("secret-object-bytes"));
}

#[test]
fn table_configuration_is_bounded_before_nonce_intake() {
    for (capacity, byte_ceiling, failure_id) in [
        (0, 1, "VOK_CAPACITY_INVALID"),
        (MAX_TABLE_CAPACITY + 1, 1, "VOK_CAPACITY_INVALID"),
        (1, 0, "VOK_BYTE_CEILING_INVALID"),
        (1, MAX_OBJECT_BYTES_LIMIT + 1, "VOK_BYTE_CEILING_INVALID"),
    ] {
        let error = AuthorityTable::new(
            capacity,
            byte_ceiling,
            context(7, 3, 5),
            SequenceNonce::from_nonces([]),
        )
        .expect_err("invalid table configuration must refuse");
        assert_eq!(error.outcome(), Trit::Refuse);
        assert_eq!(error.failure_id(), failure_id);
    }
}

#[test]
fn table_requires_an_injected_nonzero_instance_nonce() {
    let missing = AuthorityTable::new(
        1,
        8,
        context(7, 3, 5),
        SequenceNonce::refusing("VOK_NONCE_UNAVAILABLE"),
    )
    .expect_err("nonce source refusal must block table construction");
    assert_eq!(missing.failure_id(), "VOK_NONCE_UNAVAILABLE");

    let zero = AuthorityTable::new(
        1,
        8,
        context(7, 3, 5),
        SequenceNonce::from_nonces([[0; 16]]),
    )
    .expect_err("zero table nonce must refuse");
    assert_eq!(zero.failure_id(), "VOK_NONCE_ZERO");
}

#[test]
fn mint_requires_exact_context_and_bounded_nonempty_bytes() {
    let mut table = AuthorityTable::new(
        2,
        4,
        context(7, 3, 5),
        SequenceNonce::from_nonces([[1; 16], [2; 16]]),
    )
    .expect("valid bounded table");

    let empty = table
        .mint_admitted(mint_request(all_admit(), vec![]))
        .expect_err("empty object must refuse");
    assert_eq!(empty.failure_id(), "VOK_OBJECT_EMPTY");

    let oversized = table
        .mint_admitted(mint_request(all_admit(), vec![0; 5]))
        .expect_err("oversized object must refuse");
    assert_eq!(oversized.failure_id(), "VOK_OBJECT_TOO_LARGE");

    let wrong_context = MintRequest::new(
        AuthorityTag::parse("slide.vok.execute.v1").expect("canonical test tag"),
        context(8, 3, 5),
        all_admit(),
        vec![1],
    );
    let mismatch = table
        .mint_admitted(wrong_context)
        .expect_err("wrong context must refuse");
    assert_eq!(mismatch.failure_id(), "VOK_CONTEXT_MISMATCH");
    assert_eq!(table.live_len(), 0);
}

#[test]
fn all_eight_k3_admission_gates_are_exhaustive_and_only_one_vector_mints() {
    let mut table = AuthorityTable::new(
        1,
        8,
        context(7, 3, 5),
        SequenceNonce::from_nonces([[1; 16], [2; 16]]),
    )
    .expect("valid bounded table");
    let values = [Trit::Refuse, Trit::Unknown, Trit::Admit];
    let mut admitted = 0;
    let mut vectors = 0;

    for ordinal in 0..3_usize.pow(8) {
        let mut remainder = ordinal;
        let mut gates = [Trit::Refuse; 8];
        for gate in &mut gates {
            *gate = values[remainder % 3];
            remainder /= 3;
        }
        let expected = gates.iter().copied().min().expect("eight gates");
        match table.mint_admitted(mint_request(gates, vec![1])) {
            Ok(_) => {
                assert_eq!(expected, Trit::Admit);
                admitted += 1;
            }
            Err(error) => {
                assert_eq!(error.outcome(), expected);
                assert_eq!(error.failure_id(), "VOK_ADMISSION_GATES_BLOCKED");
            }
        }
        vectors += 1;
    }

    assert_eq!(vectors, 6_561);
    assert_eq!(admitted, 1);
    assert_eq!(table.live_len(), 1);
}

#[test]
fn mint_refuses_missing_zero_and_repeated_object_nonces_without_mutation() {
    let mut missing = AuthorityTable::new(
        1,
        8,
        context(7, 3, 5),
        SequenceNonce::from_nonces([[1; 16]]),
    )
    .expect("valid table before object nonce intake");
    let error = missing
        .mint_admitted(mint_request(all_admit(), vec![1]))
        .expect_err("missing object nonce must refuse");
    assert_eq!(error.failure_id(), "VOK_TEST_NONCE_EXHAUSTED");
    assert_eq!(missing.live_len(), 0);

    let mut zero = AuthorityTable::new(
        1,
        8,
        context(7, 3, 5),
        SequenceNonce::from_nonces([[1; 16], [0; 16]]),
    )
    .expect("valid table before zero object nonce");
    let error = zero
        .mint_admitted(mint_request(all_admit(), vec![1]))
        .expect_err("zero object nonce must refuse");
    assert_eq!(error.failure_id(), "VOK_NONCE_ZERO");
    assert_eq!(zero.live_len(), 0);

    let mut repeated = AuthorityTable::new(
        2,
        8,
        context(7, 3, 5),
        SequenceNonce::from_nonces([[1; 16], [2; 16], [2; 16]]),
    )
    .expect("valid table before repeated object nonce");
    let first = repeated
        .mint_admitted(mint_request(all_admit(), vec![1]))
        .expect("first unique object nonce");
    assert_eq!(format!("{first:?}"), "AdmittedObjectHandle(REDACTED)");
    let error = repeated
        .mint_admitted(mint_request(all_admit(), vec![2]))
        .expect_err("repeated object nonce must refuse");
    assert_eq!(error.failure_id(), "VOK_NONCE_REPEATED");
    assert_eq!(repeated.live_len(), 1);
}

#[test]
fn fixed_capacity_exhaustion_is_unknown_and_does_not_request_more_entropy() {
    let mut table = AuthorityTable::new(
        1,
        8,
        context(7, 3, 5),
        SequenceNonce::from_nonces([[1; 16], [2; 16]]),
    )
    .expect("valid single-slot table");
    let _handle = table
        .mint_admitted(mint_request(all_admit(), vec![1]))
        .expect("first mint fills capacity");
    let error = table
        .mint_admitted(mint_request(all_admit(), vec![2]))
        .expect_err("full table must block");
    assert_eq!(error.outcome(), Trit::Unknown);
    assert_eq!(error.failure_id(), "VOK_CAPACITY_EXHAUSTED");
    assert_eq!(table.live_len(), 1);
}
