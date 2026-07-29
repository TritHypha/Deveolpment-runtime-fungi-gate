# 207 — Protected data sharing missing authority

**Concept:** Sending protected data externally without uthority block

Sending a validated and sealed patient referral to an external endpoint without an authority block is still a governance violation. Sealing provides transport protection; it does not grant disclosure permission. The governance verifier raises `FUNGI-GOV-025` unless the protected egress flow carries explicit, reasoned authority.

**AI rule:** Protected data cannot be sent externally without an authority block granting permission.
