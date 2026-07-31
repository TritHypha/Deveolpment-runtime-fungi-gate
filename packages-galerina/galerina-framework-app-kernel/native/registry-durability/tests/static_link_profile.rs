use galerina_registry_durability_native::{
    assess_static_link_profile, embedded_static_link_profile, sha256, StaticLinkProfileClaim,
    StaticLinkProfileVerdict, STATIC_LINK_PROFILE_ABI, STATIC_LINK_PROFILE_SCHEMA,
};

fn exact_claim() -> StaticLinkProfileClaim {
    let embedded = embedded_static_link_profile();
    StaticLinkProfileClaim {
        schema: STATIC_LINK_PROFILE_SCHEMA,
        abi: STATIC_LINK_PROFILE_ABI,
        adapter_source_sha256: embedded.adapter_source_sha256,
        fungi_contract_sha256: embedded.fungi_contract_sha256,
        build_profile: embedded.build_profile,
        adapter_is_statically_linked: true,
        external_adapter_loader_present: false,
        fault_injection_present: false,
    }
}

#[test]
fn sha256_matches_published_vectors() {
    assert_eq!(
        sha256(b""),
        "e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855"
    );
    assert_eq!(
        sha256(b"abc"),
        "ba7816bf8f01cfea414140de5dae2223b00361a396177a9cb410ff61f20015ad"
    );
}

#[test]
fn embedded_profile_binds_exact_source_contract_and_abi() {
    let embedded = embedded_static_link_profile();
    assert_eq!(embedded.schema, STATIC_LINK_PROFILE_SCHEMA);
    assert_eq!(embedded.abi, STATIC_LINK_PROFILE_ABI);
    assert_eq!(embedded.adapter_source_sha256.len(), 64);
    assert_eq!(embedded.fungi_contract_sha256.len(), 64);
    assert!(embedded.adapter_is_statically_linked);
    assert!(!embedded.external_adapter_loader_present);
    assert_eq!(embedded.build_profile, "debug");
    #[cfg(not(feature = "fault-injection"))]
    assert_eq!(
        assess_static_link_profile(&exact_claim()),
        StaticLinkProfileVerdict::Deny("STATIC_PROFILE_NOT_RELEASE")
    );
    #[cfg(feature = "fault-injection")]
    {
        assert!(embedded.fault_injection_present);
        assert_eq!(
            assess_static_link_profile(&exact_claim()),
            StaticLinkProfileVerdict::Deny("STATIC_PROFILE_FAULT_INJECTION_PRESENT")
        );
    }
}

#[test]
fn substituted_or_dynamic_claims_fail_closed() {
    let exact = exact_claim();
    let cases = [
        StaticLinkProfileClaim {
            schema: "unknown",
            ..exact.clone()
        },
        StaticLinkProfileClaim {
            abi: "galerina.registry.durability.abi.v2",
            ..exact.clone()
        },
        StaticLinkProfileClaim {
            adapter_source_sha256: "0".repeat(64),
            ..exact.clone()
        },
        StaticLinkProfileClaim {
            fungi_contract_sha256: "f".repeat(64),
            ..exact.clone()
        },
        StaticLinkProfileClaim {
            build_profile: "unknown",
            ..exact.clone()
        },
        StaticLinkProfileClaim {
            adapter_is_statically_linked: false,
            ..exact.clone()
        },
        StaticLinkProfileClaim {
            external_adapter_loader_present: true,
            ..exact.clone()
        },
        StaticLinkProfileClaim {
            fault_injection_present: true,
            ..exact
        },
    ];

    for claim in cases {
        assert!(matches!(
            assess_static_link_profile(&claim),
            StaticLinkProfileVerdict::Deny(_)
        ));
    }
}
