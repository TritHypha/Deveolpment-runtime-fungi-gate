import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const WORKFLOW = new URL("../../.github/workflows/rd0873-pinned-upload-format-observation.yml", import.meta.url);

// This is an intentionally closed source lock, not a general YAML parser.
// The approved Task 3 source shape has no alternate valid spelling: a source
// change must make this test red until independently re-reviewed.
const FIXED_WORKFLOW = `name: rd0873-pinned-upload-format-observation-v1

on:
  workflow_dispatch: {}

permissions:
  contents: read

jobs:
  observe:
    environment: rd0873-task6-evidence
    runs-on: ubuntu-24.04
    timeout-minutes: 15
    steps:
      - name: Checkout dispatched application revision without retained credentials
        uses: actions/checkout@34e114876b0b11c390a56381ad16ebd13914f8d5
        with:
          ref: \${{ github.sha }}
          persist-credentials: false
          submodules: false
          lfs: false

      - name: Prove exact dispatched branch and revision
        shell: bash
        env:
          RD0873_FORMAT_WORKFLOW_SHA: \${{ vars.RD0873_FORMAT_WORKFLOW_SHA }}
        run: |
          set -euo pipefail
          [[ "$GITHUB_REF" == "refs/heads/codex/rd0873-pinned-upload-format-observation-source" ]]
          [[ "$GITHUB_SHA" =~ ^[0-9a-f]{40}$ ]]
          [[ "$RD0873_FORMAT_WORKFLOW_SHA" =~ ^[0-9a-f]{40}$ ]]
          [[ "$GITHUB_SHA" == "$RD0873_FORMAT_WORKFLOW_SHA" ]]
          [[ "$(git rev-parse HEAD)" == "$GITHUB_SHA" ]]
          [[ "$(git status --porcelain)" == "" ]]

      - name: Install exact Node without cache
        uses: actions/setup-node@49933ea5288caeca8642d1e84afbd3f7d6820020
        with:
          node-version: "24.18.0"

      - name: Mint RD-0873 read-only artifact token
        id: rd0873-artifact-token
        uses: actions/create-github-app-token@bcd2ba49218906704ab6c1aa796996da409d3eb1
        with:
          client-id: \${{ vars.RD0873_ARTIFACT_APP_CLIENT_ID }}
          private-key: \${{ secrets.RD0873_ARTIFACT_APP_PRIVATE_KEY }}
          owner: TritHypha
          repositories: |
            Deveolpment-runtime-fungi-gate
            AGENTS-SKILLS-AND-TOOLS
          permission-actions: read
          permission-contents: read

      - name: Checkout fixed AGENTS execution source
        uses: actions/checkout@34e114876b0b11c390a56381ad16ebd13914f8d5
        with:
          repository: TritHypha/AGENTS-SKILLS-AND-TOOLS
          ref: b5c46bee785320ed61683001934dd7b259af4117
          path: rd0873-agents-source
          fetch-depth: 7
          persist-credentials: false
          submodules: false
          lfs: false
          token: \${{ steps.rd0873-artifact-token.outputs.token }}

      - name: Scrub AGENTS checkout credentials and prove fixed provenance
        shell: bash
        run: |
          set -euo pipefail
          agents_dir="$GITHUB_WORKSPACE/rd0873-agents-source"
          expected_origin="https://github.com/TritHypha/AGENTS-SKILLS-AND-TOOLS"
          environment_names="$(compgen -e)"
          while IFS= read -r name; do
            case "$name" in
              ACTIONS_RUNTIME_TOKEN) ;;
              GIT_CONFIG_*|GIT_ASKPASS|SSH_ASKPASS|GIT_TERMINAL_PROMPT|GITHUB_TOKEN|GH_TOKEN|GH_ENTERPRISE_TOKEN|RD0873_*|*TOKEN*|*PRIVATE_KEY*|*PASSWORD*|*SECRET*|*CREDENTIAL*|*AUTH*) exit 1 ;;
            esac
          done <<< "$environment_names"
          [[ "$(git -C "$agents_dir" rev-parse HEAD)" == "b5c46bee785320ed61683001934dd7b259af4117" ]]
          [[ "$(git -C "$agents_dir" remote get-url origin)" == "$expected_origin" ]]
          agents_status="$(git -C "$agents_dir" status --porcelain)"
          [[ "$agents_status" == "" ]]
          config_keys="$(git -C "$agents_dir" config --local --name-only --list)"
          while IFS= read -r config_key; do
            case "\${config_key,,}" in
              http.*.extraheader|credential.helper|core.askpass) git -C "$agents_dir" config --local --unset-all "$config_key" ;;
              credential.*) exit 1 ;;
            esac
          done <<< "$config_keys"
          git_dir="$(git -C "$agents_dir" rev-parse --absolute-git-dir)"
          test ! -e "$agents_dir/.git-credentials"
          test ! -e "$git_dir/credentials"
          remaining_config_keys="$(git -C "$agents_dir" config --local --name-only --list)"
          while IFS= read -r config_key; do
            case "\${config_key,,}" in
              http.*.extraheader|credential.*|core.askpass) exit 1 ;;
            esac
          done <<< "$remaining_config_keys"
          [[ "$(git -C "$agents_dir" rev-parse bc22960337f20fb3e0c17863432f6ba823af1608^{tree})" == "95d5937ada1117b8f99ea7b11cfe60a5188b8f80" ]]

      - name: Create fixed payload and receipt directories
        shell: bash
        run: |
          set -euo pipefail
          payload_parent="$RUNNER_TEMP/rd0873-format-payload-parent"
          receipt_parent="$RUNNER_TEMP/rd0873-format-receipt-parent"
          payload_dir="$payload_parent/payload"
          receipt_dir="$receipt_parent/receipt"
          agents_dir="$GITHUB_WORKSPACE/rd0873-agents-source"
          test ! -e "$payload_parent"
          test ! -L "$payload_parent"
          test ! -e "$receipt_parent"
          test ! -L "$receipt_parent"
          mkdir -- "$payload_parent" "$receipt_parent"
          mkdir -- "$payload_dir" "$receipt_dir"
          test -d "$payload_parent"
          test ! -L "$payload_parent"
          test -d "$receipt_parent"
          test ! -L "$receipt_parent"
          test -d "$payload_dir"
          test ! -L "$payload_dir"
          test -d "$receipt_dir"
          test ! -L "$receipt_dir"
          producer_tree="$(git rev-parse "$GITHUB_SHA^{tree}")"
          agents_tree="$(git -C "$agents_dir" rev-parse "bc22960337f20fb3e0c17863432f6ba823af1608^{tree}")"
          printf '%s\\n' 'RD0873-FORMAT-OBSERVATION-FRAME-V1' > "$payload_dir/frame.gaaf"
          printf '%s\\n' '{"schema":"rd0873-format-profile-v1"}' > "$payload_dir/profile.json"
          printf '%s\\n' '{"schema":"rd0873-format-platform-v1"}' > "$receipt_dir/platform-receipt.json"
          printf '%s\\n' '{"schema":"rd0873-format-resource-v1"}' > "$receipt_dir/resource-receipt.json"
          printf '%s\\n' 'PROCESS_TREE_OBSERVER_OK' > "$receipt_dir/native-build.log"
          printf '{"schema":"rd0873-artifact-binding-v1","runId":"%s","runAttempt":"%s","producerCommit":"%s","producerTree":"%s","agentsCommit":"bc22960337f20fb3e0c17863432f6ba823af1608","agentsTree":"%s","artifactName":"rd0873-task6-full-frame-linux-x64","artifactKind":"payload"}\\n' "$GITHUB_RUN_ID" "$GITHUB_RUN_ATTEMPT" "$GITHUB_SHA" "$producer_tree" "$agents_tree" > "$payload_dir/rd0873-artifact-binding.json"
          printf '{"schema":"rd0873-artifact-binding-v1","runId":"%s","runAttempt":"%s","producerCommit":"%s","producerTree":"%s","agentsCommit":"bc22960337f20fb3e0c17863432f6ba823af1608","agentsTree":"%s","artifactName":"rd0873-task6-receipt-linux-x64","artifactKind":"receipt"}\\n' "$GITHUB_RUN_ID" "$GITHUB_RUN_ATTEMPT" "$GITHUB_SHA" "$producer_tree" "$agents_tree" > "$receipt_dir/rd0873-artifact-binding.json"

      - name: Upload fixed payload format observation
        id: upload-payload
        uses: actions/upload-artifact@ea165f8d65b6e75b540449e92b4886f43607fa02
        with:
          name: rd0873-task6-full-frame-linux-x64
          path: \${{ runner.temp }}/rd0873-format-payload-parent/payload
          retention-days: 1
          if-no-files-found: error
          compression-level: 0

      - name: Upload fixed receipt format observation
        id: upload-receipt
        uses: actions/upload-artifact@ea165f8d65b6e75b540449e92b4886f43607fa02
        with:
          name: rd0873-task6-receipt-linux-x64
          path: \${{ runner.temp }}/rd0873-format-receipt-parent/receipt
          retention-days: 1
          if-no-files-found: error
          compression-level: 0

      - name: Remove fixed artifact directories and require cleanup
        shell: bash
        run: |
          set -euo pipefail
          payload_parent="$RUNNER_TEMP/rd0873-format-payload-parent"
          receipt_parent="$RUNNER_TEMP/rd0873-format-receipt-parent"
          payload_dir="$payload_parent/payload"
          receipt_dir="$receipt_parent/receipt"
          rm -rf "$payload_dir" "$receipt_dir"
          test ! -e "$payload_dir"
          test ! -e "$receipt_dir"
          rmdir "$payload_parent" "$receipt_parent"
          test ! -e "$payload_parent"
          test ! -e "$receipt_parent"

      - name: Verify exactly one pinned upload format observation
        shell: bash
        env:
          RD0873_ACTIONS_READ_TOKEN: \${{ steps.rd0873-artifact-token.outputs.token }}
          RD0873_FORMAT_OBSERVATION_MODE: actual-v1
          RD0873_FORMAT_PAYLOAD_ID: \${{ steps.upload-payload.outputs.artifact-id }}
          RD0873_FORMAT_PAYLOAD_DIGEST: \${{ steps.upload-payload.outputs.artifact-digest }}
          RD0873_FORMAT_PAYLOAD_NAME: rd0873-task6-full-frame-linux-x64
          RD0873_FORMAT_RECEIPT_ID: \${{ steps.upload-receipt.outputs.artifact-id }}
          RD0873_FORMAT_RECEIPT_DIGEST: \${{ steps.upload-receipt.outputs.artifact-digest }}
          RD0873_FORMAT_RECEIPT_NAME: rd0873-task6-receipt-linux-x64
          RD0873_FORMAT_PRODUCER_COMMIT: \${{ github.sha }}
          RD0873_FORMAT_AGENTS_COMMIT: bc22960337f20fb3e0c17863432f6ba823af1608
          RD0873_FORMAT_RUN_ID: \${{ github.run_id }}
          RD0873_FORMAT_RUN_ATTEMPT: \${{ github.run_attempt }}
          RD0873_FORMAT_CLEANUP: success
        run: node --test --test-isolation=none --test-name-pattern='^RD0873_PINNED_UPLOAD_FORMAT_OBSERVATION_V1$' "$GITHUB_WORKSPACE/rd0873-agents-source/tools/rd0873-pinned-upload-format-observation.test.mjs"
`;

function assertFixedSource(source) {
  assert.equal(source, FIXED_WORKFLOW, "workflow source must match the closed Task 3 source lock exactly");
}

function mutate(source, from, to) {
  assert.ok(source.includes(from), `test mutation precondition missing: ${from}`);
  return source.replace(from, to);
}

test("rd0873 pinned upload format observation workflow accepts only its fixed source shape", async () => {
  const source = await readFile(WORKFLOW, "utf8");
  assertFixedSource(source);

  const mutations = [
    ["broader job permission", "contents: read", "contents: write"],
    ["retained checkout credential", "persist-credentials: false", "persist-credentials: true"],
    ["non-event application ref", "ref: ${{ github.sha }}", "ref: refs/heads/main"],
    ["wrong dispatched branch", "refs/heads/codex/rd0873-pinned-upload-format-observation-source", "refs/heads/main"],
    ["missing protected workflow commit binding", "          [[ \"$GITHUB_SHA\" == \"$RD0873_FORMAT_WORKFLOW_SHA\" ]]", "          true"],
    ["missing application checkout proof", "          [[ \"$(git rev-parse HEAD)\" == \"$GITHUB_SHA\" ]]", "          true"],
    ["third App repository", "            AGENTS-SKILLS-AND-TOOLS\n          permission-actions", "            AGENTS-SKILLS-AND-TOOLS\n            untrusted-third-repository\n          permission-actions"],
    ["extra application Node command before scrub", "          expected_origin=", "          node --version\n          expected_origin="],
    ["missing payload cleanup assertion", "          test ! -e \"$payload_dir\"", "          true"],
    ["missing receipt cleanup assertion", "          test ! -e \"$receipt_dir\"", "          true"],
    ["unclean AGENTS source acceptance", "          [[ \"$agents_status\" == \"\" ]]", "          true"],
    ["relative AGENTS git directory", "--absolute-git-dir", "--git-dir"],
    ["broader artifact retention", "          retention-days: 1", "          retention-days: 90"],
    ["retained arbitrary Git extraheader", "              http.*.extraheader|credential.*|core.askpass) exit 1 ;;", "              credential.*|core.askpass) exit 1 ;;"],
    ["retained Git config override", "              GIT_CONFIG_*|GIT_ASKPASS", "              GIT_ASKPASS"],
    ["non-fail-closed environment listing", "          environment_names=\"$(compgen -e)\"", "          environment_names=\"\""],
    ["unbound private-key environment", "RD0873_*|*TOKEN*", "RD0873_*|"],
    ["destructive pre-existing artifact cleanup", "          test ! -e \"$payload_parent\"", "          rm -rf \"$payload_parent\""],
    ["payload parent symlink accepted", "          test ! -L \"$payload_parent\"", "          true"],
    ["receipt parent symlink accepted", "          test ! -L \"$receipt_parent\"", "          true"],
    ["wrong fixed frame bytes", "RD0873-FORMAT-OBSERVATION-FRAME-V1", "RD0873-FORMAT-OBSERVATION-FRAME-V2"],
  ];
  for (const [label, from, to] of mutations) {
    assert.throws(() => assertFixedSource(mutate(source, from, to)), { name: "AssertionError" }, label);
  }
});
