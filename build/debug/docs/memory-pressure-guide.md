# Memory Pressure Guide

Generated from Galerina build output.

## Core Rule

Limit long-lived memory. Protect normal execution. Spill only approved non-secret data. Fail safely before uncontrolled out-of-memory.

## Cache Limit vs Total Memory Pressure

| Situation | Behaviour |
|---|---|
| Cache limit hit | Calculate and return the result, then bypass cache storage |
| Queue buffer full | Apply the declared overflow policy |
| Soft memory limit reached | Start memory pressure actions |
| Hard memory limit reached | Reject new work or fail gracefully |
| Disk spill limit reached | Stop spilling and move to the next fallback |

## Runtime Policy

- Soft limit: not declared
- Hard limit: not declared
- Pressure actions: not declared

## Memory Pressure Ladder

1. free_short_lived_finished_values: Clean up local values after the flow or scope no longer needs them.
2. evict_eligible_caches: Evict cache entries that are safe to rebuild.
3. bypass_cache_storage: Calculate and return results without adding new cache entries.
4. apply_backpressure: Slow, pause or reject queue and channel intake before memory grows without bounds.
5. spill_approved_data_to_disk: Write only explicitly approved, non-secret temporary data to bounded spill storage.
6. reject_new_work_safely: Reject new API, queue or webhook work with retryable errors where possible.
7. graceful_failure: Stop before uncontrolled out-of-memory, flush reports and preserve source-mapped diagnostics.

## Cache Bypass

When a cached pure flow reaches its cache memory limit, Galerina should:

- calculate_result
- return_result
- do_not_store_result_in_cache
- record_cache_bypass_warning
- recommend_cache_change_if_repeated

Correctness rule: A cache memory limit must not change the calculated result.

## Disk Spill

- Enabled: false
- Path: not declared
- Max disk: not declared
- TTL: not declared
- Encryption: false
- Redact secrets: true

### Approved Spill Data

- cache_entries
- queue_events
- json_stream_buffers
- build_cache
- dead_letter_events
- temporary_batch_data
- large_sort_or_transform_intermediates

### Denied Spill Data

- SecureString
- APIKey
- PaymentToken
- SessionToken
- PrivateKey
- Password
- WebhookSecret
- RequestContext
- database_connections
- file_handles
- network_sockets
- thread_handles
- sensitive_gpu_buffers
- sensitive_photonic_target_buffers

## Secret Spill Rule

Secrets must not be spilled to disk by default.

## Compile Checks

- hard_limit_above_soft_limit
- spill_path_declared_when_spill_enabled
- spill_max_disk_declared_when_spill_enabled
- spill_ttl_declared_when_spill_enabled
- spill_redacts_secrets
- spill_denies_secure_types
- queues_have_overflow_policies
- caches_have_memory_limits_or_on_limit_actions

## Recommendations

- increase_app_memory_when_pressure_is_repeated
- reduce_or_remove_low_value_caches
- stream_large_json_payloads
- reduce_queue_buffer_size_or_add_backpressure
- move_batch_jobs_to_worker_mode
- increase_spill_disk_limit_only_for_approved_non_secret_data
- reduce_spill_ttl_to_limit_disk_growth

## Generated Outputs

- app.memory-report.json
- app.runtime-report.json
- docs/memory-pressure-guide.md
- docs/runtime-guide.md
- app.map-manifest.json
- app.ai-guide.md
