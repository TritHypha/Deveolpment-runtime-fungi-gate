use galerina_registry_durability_native::{
    assess_static_link_profile, embedded_static_link_profile, StaticLinkProfileClaim,
    StaticLinkProfileVerdict,
};
use std::process::ExitCode;

fn main() -> ExitCode {
    let embedded = embedded_static_link_profile();
    let claim = StaticLinkProfileClaim {
        schema: embedded.schema,
        abi: embedded.abi,
        adapter_source_sha256: embedded.adapter_source_sha256.clone(),
        fungi_contract_sha256: embedded.fungi_contract_sha256.clone(),
        build_profile: embedded.build_profile,
        adapter_is_statically_linked: embedded.adapter_is_statically_linked,
        external_adapter_loader_present: embedded.external_adapter_loader_present,
        fault_injection_present: embedded.fault_injection_present,
    };
    let (verdict, reason, success) = match assess_static_link_profile(&claim) {
        StaticLinkProfileVerdict::Candidate(_) => ("CANDIDATE", "NONE", true),
        StaticLinkProfileVerdict::Deny(code) => ("DENY", code, false),
    };

    println!(
        concat!(
            "{{\"schema\":\"{}\",\"verdict\":\"{}\",\"reason\":\"{}\",",
            "\"abi\":\"{}\",\"adapterSourceSha256\":\"{}\",",
            "\"fungiContractSha256\":\"{}\",\"buildProfile\":\"{}\",",
            "\"adapterIsStaticallyLinked\":{},\"externalAdapterLoaderPresent\":{},",
            "\"faultInjectionPresent\":{},\"productionAuthorizing\":false}}"
        ),
        embedded.schema,
        verdict,
        reason,
        embedded.abi,
        embedded.adapter_source_sha256,
        embedded.fungi_contract_sha256,
        embedded.build_profile,
        embedded.adapter_is_statically_linked,
        embedded.external_adapter_loader_present,
        embedded.fault_injection_present,
    );

    if success {
        ExitCode::SUCCESS
    } else {
        ExitCode::from(2)
    }
}
