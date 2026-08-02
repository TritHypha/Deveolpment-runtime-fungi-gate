# Post-SLIDE signed authority receipts implementation plan

### Task 1: closed predicates

- [ ] Add RED tests for exact Fungi-execution and host-ownership statements.
- [ ] Derive and validate every closed predicate field and exact subject.
- [ ] Refuse surplus, missing, copied, wrong-path and wrong-digest evidence.

### Task 2: hybrid authority composition

- [ ] Compose predicate validation only after the existing hybrid envelope and
      root delegation verify.
- [ ] Prove either signature half, role, key, serial, time or revocation failure
      refuses.
- [ ] Keep signing helpers test-only; production verification reads public
      material only.

### Task 3: terminal-ledger integration

- [ ] Advance the ledger schema with pinned authority and receipt paths.
- [ ] Reopen and independently hash every source/evidence/receipt input.
- [ ] Return exact executed/owned path sets only for complete verified entries.
- [ ] Preserve empty production lanes as valid K3 `0`, not implicit authority.

### Task 4: closure

- [ ] Run focused hostile tests and the unchanged retirement-gate mutants.
- [ ] Update roadmap/TODO with verifier implementation green and actual
      production admission blue.
- [ ] Record R&D maths/Tri-1/zero-trust adjudication in the Knowledge Base.
