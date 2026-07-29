# 212 — Policy purpose mismatch

**Concept:** Declared purpose does not match observed template use

The policy declares purpose `appointment_reminder` but the flow uses `Template.marketingOffer`. The governance verifier classifies both semantic families and raises `FUNGI-GOV-005`. The example validates and seals the protected email and carries explicit egress authority so the purpose contradiction is the only lesson.

**AI rule:** The template used in a communication flow must match the declared purpose.
