(module
  ;; effect: stdlib.array
  (import "host" "__array_create" (func $host___array_create (result i32)))
  ;; effect: stdlib.array
  (import "host" "__array_append" (func $host___array_append (param $p0 i32) (param $p1 i32) (result i32)))
  ;; effect: stdlib.array
  (import "host" "__array_get" (func $host___array_get (param $p0 i32) (param $p1 i32) (result i32)))
  ;; effect: stdlib.array
  (import "host" "__array_get_option_v2" (func $host___array_get_option_v2 (param $p0 i32) (param $p1 i32) (result i32)))
  ;; effect: stdlib.array
  (import "host" "__array_length" (func $host___array_length (param $p0 i32) (result i32)))
  ;; effect: stdlib.string
  (import "host" "__str_concat" (func $host___str_concat (param $p0 i32) (param $p1 i32) (result i32)))
  ;; effect: stdlib.string
  (import "host" "__str_length" (func $host___str_length (param $p0 i32) (result i32)))
  ;; effect: stdlib.string
  (import "host" "__str_eq" (func $host___str_eq (param $p0 i32) (param $p1 i32) (result i32)))
  ;; effect: stdlib.string
  (import "host" "__str_trim" (func $host___str_trim (param $p0 i32) (result i32)))
  ;; effect: stdlib.char
  (import "host" "__char_to_string" (func $host___char_to_string (param $p0 i32) (result i32)))
  ;; effect: stdlib.char
  (import "host" "__char_from_code" (func $host___char_from_code (param $p0 i32) (result i32)))
  ;; effect: stdlib.result
  (import "host" "__option_is_none_v2" (func $host___option_is_none_v2 (param $p0 i32) (result i32)))
  ;; effect: stdlib.result
  (import "host" "__option_value_v2" (func $host___option_value_v2 (param $p0 i32) (result i32)))

  (memory 2 2048)
  (export "memory" (memory 0))

  ;; P9.4b: bump-allocator heap pointer for record struct layout
  (global $__fungi_heap (mut i32) (i32.const 1024))

  ;; strict-trapping checked helper — signed overflow / non-finite float traps (unreachable)
  (func $fungi_checked_add_i32 (param $a i32) (param $b i32) (result i32)
    (local $r i32)
    (local.set $r (i32.add (local.get $a) (local.get $b)))
    ;; signed overflow iff (a^r) & (b^r) < 0
    (if (i32.lt_s (i32.and (i32.xor (local.get $a) (local.get $r)) (i32.xor (local.get $b) (local.get $r))) (i32.const 0)) (then unreachable))
    (local.get $r))

  ;; pure flow: validateGpuKernelPlan
  (func $validateGpuKernelPlan (param $p0 i32) (param $p1 i32) (param $p2 i32) (result i32)
    (local $diagnostics i32)
    (local $__fungi_rec_0 i32)
    (local $knownBackend i32)
    (local $__fungi_rec_1 i32)
    (local $available i32)
    (local $capabilityIndex i32)
    (local $__while_fuel_0 i32)
    (local $capabilityOpt i32)
    (local $__fungi_match_1 i32)
    (local $__fungi_match_2 i32)
    (local $quote i32)
    (local $__fungi_rec_2 i32)
    (local $__fungi_rec_3 i32)
    (local.set $diagnostics (call $host___array_create))
    (if (i32.eq (call $host___str_length (call $host___str_trim (i32.load (i32.add (local.get $p0) (i32.const 0))))) (i32.const 0))
      (then
        (local.set $diagnostics (call $host___array_append (local.get $diagnostics) (block (result i32)
      (local.set $__fungi_rec_0 (global.get $__fungi_heap))
      (global.set $__fungi_heap (i32.add (global.get $__fungi_heap) (i32.const 16)))
      (i32.store (i32.add (local.get $__fungi_rec_0) (i32.const 0)) (i32.const 1)) ;; .code
      (i32.store (i32.add (local.get $__fungi_rec_0) (i32.const 4)) (i32.const 2)) ;; .severity
      (i32.store (i32.add (local.get $__fungi_rec_0) (i32.const 8)) (i32.const 3)) ;; .message
      (i32.store (i32.add (local.get $__fungi_rec_0) (i32.const 12)) (call $host___str_concat (local.get $p2) (i32.const 4))) ;; .path
      (local.get $__fungi_rec_0)
    )))
      )
    )
    (local.set $knownBackend (i32.const 0))
    (if (call $host___str_eq (i32.load (i32.add (local.get $p0) (i32.const 4))) (i32.const 5))
      (then
        (local.set $knownBackend (i32.const 1))
      )
      (else
    (if (call $host___str_eq (i32.load (i32.add (local.get $p0) (i32.const 4))) (i32.const 6))
      (then
        (local.set $knownBackend (i32.const 1))
      )
      (else
    (if (call $host___str_eq (i32.load (i32.add (local.get $p0) (i32.const 4))) (i32.const 7))
      (then
        (local.set $knownBackend (i32.const 1))
      )
      (else
    (if (call $host___str_eq (i32.load (i32.add (local.get $p0) (i32.const 4))) (i32.const 8))
      (then
        (local.set $knownBackend (i32.const 1))
      )
      (else
    (if (call $host___str_eq (i32.load (i32.add (local.get $p0) (i32.const 4))) (i32.const 9))
      (then
        (local.set $knownBackend (i32.const 1))
      )
      (else
      )
    )
      )
    )
      )
    )
      )
    )
      )
    )
    (if (i32.eq (local.get $knownBackend) (i32.const 0))
      (then
        (local.set $diagnostics (call $host___array_append (local.get $diagnostics) (block (result i32)
      (local.set $__fungi_rec_1 (global.get $__fungi_heap))
      (global.set $__fungi_heap (i32.add (global.get $__fungi_heap) (i32.const 16)))
      (i32.store (i32.add (local.get $__fungi_rec_1) (i32.const 0)) (i32.const 10)) ;; .code
      (i32.store (i32.add (local.get $__fungi_rec_1) (i32.const 4)) (i32.const 2)) ;; .severity
      (i32.store (i32.add (local.get $__fungi_rec_1) (i32.const 8)) (i32.const 11)) ;; .message
      (i32.store (i32.add (local.get $__fungi_rec_1) (i32.const 12)) (call $host___str_concat (local.get $p2) (i32.const 12))) ;; .path
      (local.get $__fungi_rec_1)
    )))
      )
    )
    (if (i32.eq (local.get $knownBackend) (i32.const 1))
      (then
        (local.set $available (i32.const 0))
        (local.set $capabilityIndex (i32.const 0))
        (block $while_exit_0
          (loop $while_loop_0
            (br_if $while_exit_0 (i32.ge_s (local.get $capabilityIndex) (call $host___array_length (local.get $p1))))
            (local.set $__while_fuel_0 (i32.add (local.get $__while_fuel_0) (i32.const 1)))
            (if (i32.gt_u (local.get $__while_fuel_0) (i32.const 100000)) (then unreachable))
            (local.set $capabilityOpt (call $host___array_get_option_v2 (local.get $p1) (local.get $capabilityIndex)))
            (local.set $__fungi_match_1 (local.get $capabilityOpt))
            (if (call $host___option_is_none_v2 (local.get $__fungi_match_1))
              (then
              )
              (else
                (local.set $__fungi_match_2 (call $host___option_value_v2 (local.get $__fungi_match_1)))
                (if (call $host___str_eq (i32.load (i32.add (local.get $__fungi_match_2) (i32.const 4))) (i32.load (i32.add (local.get $p0) (i32.const 4))))
                  (then
                    (local.set $available (i32.const 1))
                  )
                )
              )
            )
            (local.set $capabilityIndex (call $fungi_checked_add_i32 (local.get $capabilityIndex) (i32.const 1)))
            (br $while_loop_0)
          )
        )
        (if (i32.eq (local.get $available) (i32.const 0))
          (then
            (local.set $quote (call $host___char_from_code (i32.const 34)))
            (local.set $diagnostics (call $host___array_append (local.get $diagnostics) (block (result i32)
      (local.set $__fungi_rec_2 (global.get $__fungi_heap))
      (global.set $__fungi_heap (i32.add (global.get $__fungi_heap) (i32.const 16)))
      (i32.store (i32.add (local.get $__fungi_rec_2) (i32.const 0)) (i32.const 13)) ;; .code
      (i32.store (i32.add (local.get $__fungi_rec_2) (i32.const 4)) (i32.const 2)) ;; .severity
      (i32.store (i32.add (local.get $__fungi_rec_2) (i32.const 8)) (call $host___str_concat (call $host___str_concat (call $host___str_concat (call $host___str_concat (i32.const 14) (call $host___char_to_string (local.get $quote))) (i32.load (i32.add (local.get $p0) (i32.const 4)))) (call $host___char_to_string (local.get $quote))) (i32.const 15))) ;; .message
      (i32.store (i32.add (local.get $__fungi_rec_2) (i32.const 12)) (call $host___str_concat (local.get $p2) (i32.const 12))) ;; .path
      (local.get $__fungi_rec_2)
    )))
          )
        )
      )
    )
    (if (i32.eq (call $host___array_length (i32.load (i32.add (local.get $p0) (i32.const 8)))) (i32.const 0))
      (then
        (local.set $diagnostics (call $host___array_append (local.get $diagnostics) (block (result i32)
      (local.set $__fungi_rec_3 (global.get $__fungi_heap))
      (global.set $__fungi_heap (i32.add (global.get $__fungi_heap) (i32.const 16)))
      (i32.store (i32.add (local.get $__fungi_rec_3) (i32.const 0)) (i32.const 16)) ;; .code
      (i32.store (i32.add (local.get $__fungi_rec_3) (i32.const 4)) (i32.const 2)) ;; .severity
      (i32.store (i32.add (local.get $__fungi_rec_3) (i32.const 8)) (i32.const 17)) ;; .message
      (i32.store (i32.add (local.get $__fungi_rec_3) (i32.const 12)) (call $host___str_concat (local.get $p2) (i32.const 18))) ;; .path
      (local.get $__fungi_rec_3)
    )))
      )
    )
    (local.get $diagnostics)
  )
  (export "validateGpuKernelPlan" (func $validateGpuKernelPlan))

  ;; pure flow: validateGpuKernelPlanDefault
  (func $validateGpuKernelPlanDefault (param $p0 i32) (param $p1 i32) (result i32)
    ;; B2 (R&D 0055): per-flow arena reset — reclaim the previous invocation's heap (leaf entry-point)
    (global.set $__fungi_heap (i32.const 1024))
    (call $validateGpuKernelPlan (local.get $p0) (local.get $p1) (i32.const 19))
  )
  (export "validateGpuKernelPlanDefault" (func $validateGpuKernelPlanDefault))

)