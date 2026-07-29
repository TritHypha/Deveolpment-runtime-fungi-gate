# 356 — AI missing audit

**Concept:** secure AI flow that declares audit.write but omits the AuditLog.write call

Declaring `audit.write` in the effects list creates a governance obligation. The compiler verifies that audit evidence is produced. Omitting the call triggers `FUNGI-AUDIT-001`.

**AI rule:** If a `secure flow` declares `audit.write`, it must call `AuditLog.write` before returning.
