# RD-0873 Fungi waves 10–11: tasks and sentinel state

Two Luna – High workers completed one bounded leaf each in the direct package
tree. The original TypeScript remains the differential shadow and no CI,
hosted build or Git operation was used.

| Wave | Source and symbol | Direct target | Evidence |
| --- | --- | --- | --- |
| 10 | `packages-ts/galerina-core-tasks/src/load-tasks.ts#isTaskEffect` | `packages/fungi/products/galerina-core-tasks/task-effect.fungi` | strict check/build PASS; parity **2/2** |
| 11 | `packages-ts/galerina-core-sentinel-state/src/cold-boot.ts#RESTORE_VERDICT_EXPORT_NAME` | `packages/fungi/products/galerina-core-sentinel-state/restore-verdict-export-name.fungi` | strict check/build PASS; constant interpreter/Wasm PASS |

Both direct targets are within the wave limits and grant no production
authority. Task host marshalling and sentinel-state cold-boot,
persistence/cryptography and key-provider behavior remain explicit boundaries;
the leaves do not complete their containing packages.

