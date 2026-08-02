use super::*;

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
}
