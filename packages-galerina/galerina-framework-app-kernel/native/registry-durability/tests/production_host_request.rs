use galerina_registry_durability_native::{
    assess_production_host_request, production_host_generation_id, ProductionHostRequestVerdict,
    MAX_PRODUCTION_GENERATION_BYTES,
};

fn canonical_generation() -> Vec<u8> {
    br#"{"delegationSerial":1,"index":{"entries":[],"issuedAt":"2026-08-01T00:00:00.000Z","registry":"https://registry.invalid","schema":"galerina-registry-index/v2","signature":{"ed25519":"x","keyId":"f3172a48372bfb23","mlDsa65":"y"}},"manifests":[],"operationalKeyId":"f3172a48372bfb23","schema":"galerina-registry-generation/v1"}"#.to_vec()
}

#[test]
fn exact_domain_separated_generation_identity_is_admitted() {
    let bytes = canonical_generation();
    let generation_id = production_host_generation_id(&bytes);
    let directory = std::env::temp_dir();

    let verdict = assess_production_host_request(
        directory.to_str().expect("temporary path is UTF-8"),
        &generation_id,
        &bytes,
    );

    assert!(matches!(
        verdict,
        ProductionHostRequestVerdict::Candidate(_)
    ));
}

#[test]
fn identity_or_path_ambiguity_denies_before_publication() {
    let bytes = canonical_generation();
    let generation_id = production_host_generation_id(&bytes);
    let directory = std::env::temp_dir();
    let absolute = directory.to_str().expect("temporary path is UTF-8");

    let cases = [
        (
            "relative",
            generation_id.as_str(),
            "PRODUCTION_HOST_DIRECTORY_NOT_ABSOLUTE",
        ),
        (absolute, "0", "PRODUCTION_HOST_GENERATION_ID_MALFORMED"),
        (
            absolute,
            &generation_id.to_ascii_uppercase(),
            "PRODUCTION_HOST_GENERATION_ID_MALFORMED",
        ),
        (
            absolute,
            "0000000000000000000000000000000000000000000000000000000000000000",
            "PRODUCTION_HOST_GENERATION_ID_MISMATCH",
        ),
    ];

    for (path, id, expected) in cases {
        assert_eq!(
            assess_production_host_request(path, id, &bytes).denial_code(),
            Some(expected),
        );
    }
    assert_eq!(
        assess_production_host_request("C:\0host", &generation_id, &bytes).denial_code(),
        Some("PRODUCTION_HOST_DIRECTORY_NUL"),
    );
}

#[test]
fn byte_bounds_are_closed() {
    let directory = std::env::temp_dir();
    let absolute = directory.to_str().expect("temporary path is UTF-8");
    let empty_id = production_host_generation_id(&[]);
    assert_eq!(
        assess_production_host_request(absolute, &empty_id, &[]).denial_code(),
        Some("PRODUCTION_HOST_GENERATION_EMPTY"),
    );

    let oversized = vec![0_u8; MAX_PRODUCTION_GENERATION_BYTES + 1];
    let oversized_id = production_host_generation_id(&oversized);
    assert_eq!(
        assess_production_host_request(absolute, &oversized_id, &oversized).denial_code(),
        Some("PRODUCTION_HOST_GENERATION_TOO_LARGE"),
    );
}
