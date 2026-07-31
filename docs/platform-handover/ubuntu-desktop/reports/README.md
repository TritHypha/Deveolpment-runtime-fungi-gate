# Ubuntu Desktop returned evidence

Place completed Ubuntu reports and their raw JSON receipts in this folder.

Required paired names:

```text
ubuntu-desktop-static-profile-YYYY-MM-DD-<12-char-commit>.md
ubuntu-desktop-static-profile-YYYY-MM-DD-<12-char-commit>.receipt.json
```

The Markdown report is copied from `../REPORT-TEMPLATE.md`. The JSON file is
the unedited stdout of `scripts/verify-registry-static-profile.mjs`. Neither
file authorizes production. Never place private keys, environment files,
signing commands containing private paths, or secret material here.

If a run fails before a JSON receipt exists, return the Markdown report with
the exact failure and do not invent or hand-edit a receipt.
