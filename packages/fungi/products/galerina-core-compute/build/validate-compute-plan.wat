(module
  ;; effect: stdlib.array
  (import "host" "__array_create" (func $host___array_create (result i32)))
  ;; effect: stdlib.array
  (import "host" "__array_append" (func $host___array_append (param $p0 i32) (param $p1 i32) (result i32)))
  ;; effect: stdlib.array
  (import "host" "__array_contains" (func $host___array_contains (param $p0 i32) (param $p1 i32) (result i32)))
  ;; effect: stdlib.array
  (import "host" "__array_contains_str" (func $host___array_contains_str (param $p0 i32) (param $p1 i32) (result i32)))
  ;; effect: stdlib.string
  (import "host" "__str_length" (func $host___str_length (param $p0 i32) (result i32)))
  ;; effect: stdlib.string
  (import "host" "__str_trim" (func $host___str_trim (param $p0 i32) (result i32)))
  ;; effect: stdlib.result
  (import "host" "__option_is_none_v2" (func $host___option_is_none_v2 (param $p0 i32) (result i32)))
  ;; effect: stdlib.result
  (import "host" "__option_value_v2" (func $host___option_value_v2 (param $p0 i32) (result i32)))
  ;; effect: stdlib.result
  (import "host" "__option_value_f64_v2" (func $host___option_value_f64_v2 (param $p0 i32) (result f64)))

  (memory 2 2048)
  (export "memory" (memory 0))

  ;; P9.4b: bump-allocator heap pointer for record struct layout
  (global $__fungi_heap (mut i32) (i32.const 1024))

  ;; strict-trapping checked helper — signed overflow / non-finite float traps (unreachable)
  (func $fungi_assert_finite_f64 (param $v f64) (result f64)
    ;; (v - v) = 0 for a finite v but NaN for NaN/±Inf → f64.ne(…,0) traps on any non-finite value
    (if (f64.ne (f64.sub (local.get $v) (local.get $v)) (f64.const 0)) (then unreachable))
    (local.get $v))

  ;; pure flow: validateComputePlan
  (func $validateComputePlan (param $p0 i32) (result i32)
    (local $diagnostics i32)
    (local $__fungi_rec_0 i32)
    (local $__fungi_rec_1 i32)
    (local $__fungi_match_0 i32)
    (local $__fungi_match_1 i32)
    (local $__fungi_match_2 i32)
    (local $__fungi_match_3 f64)
    (local $__fungi_rec_2 i32)
    (local $__fungi_match_4 i32)
    (local $__fungi_match_5 f64)
    (local $__fungi_rec_3 i32)
    ;; B2 (R&D 0055): per-flow arena reset — reclaim the previous invocation's heap (leaf entry-point)
    (global.set $__fungi_heap (i32.const 1024))
    (local.set $diagnostics (call $host___array_create))
    (if (i32.eq (call $host___str_length (call $host___str_trim (i32.load (i32.add (local.get $p0) (i32.const 0))))) (i32.const 0))
      (then
        (local.set $diagnostics (call $host___array_append (local.get $diagnostics) (block (result i32)
      (local.set $__fungi_rec_0 (global.get $__fungi_heap))
      (global.set $__fungi_heap (i32.add (global.get $__fungi_heap) (i32.const 16)))
      (i32.store (i32.add (local.get $__fungi_rec_0) (i32.const 0)) (i32.const 1)) ;; .code
      (i32.store (i32.add (local.get $__fungi_rec_0) (i32.const 4)) (i32.const 2)) ;; .severity
      (i32.store (i32.add (local.get $__fungi_rec_0) (i32.const 8)) (i32.const 3)) ;; .message
      (i32.store (i32.add (local.get $__fungi_rec_0) (i32.const 12)) (i32.const 4)) ;; .path
      (local.get $__fungi_rec_0)
    )))
      )
    )
    (if (call $host___array_contains_str (i32.load (i32.add (local.get $p0) (i32.const 12))) (i32.load (i32.add (local.get $p0) (i32.const 8))))
      (then
        (local.set $diagnostics (call $host___array_append (local.get $diagnostics) (block (result i32)
      (local.set $__fungi_rec_1 (global.get $__fungi_heap))
      (global.set $__fungi_heap (i32.add (global.get $__fungi_heap) (i32.const 16)))
      (i32.store (i32.add (local.get $__fungi_rec_1) (i32.const 0)) (i32.const 5)) ;; .code
      (i32.store (i32.add (local.get $__fungi_rec_1) (i32.const 4)) (i32.const 6)) ;; .severity
      (i32.store (i32.add (local.get $__fungi_rec_1) (i32.const 8)) (i32.const 7)) ;; .message
      (i32.store (i32.add (local.get $__fungi_rec_1) (i32.const 12)) (i32.const 8)) ;; .path
      (local.get $__fungi_rec_1)
    )))
      )
    )
    (local.set $__fungi_match_0 (i32.load (i32.add (local.get $p0) (i32.const 16))))
    (if (call $host___option_is_none_v2 (local.get $__fungi_match_0))
      (then
      )
      (else
        (local.set $__fungi_match_1 (call $host___option_value_v2 (local.get $__fungi_match_0)))
        (local.set $__fungi_match_2 (i32.load (i32.add (local.get $__fungi_match_1) (i32.const 0))))
        (if (call $host___option_is_none_v2 (local.get $__fungi_match_2))
          (then
          )
          (else
            (local.set $__fungi_match_3 (call $host___option_value_f64_v2 (local.get $__fungi_match_2)))
            (if (f64.le (call $fungi_assert_finite_f64 (local.get $__fungi_match_3)) (call $fungi_assert_finite_f64 (f64.const 0.0)))
              (then
                (local.set $diagnostics (call $host___array_append (local.get $diagnostics) (block (result i32)
      (local.set $__fungi_rec_2 (global.get $__fungi_heap))
      (global.set $__fungi_heap (i32.add (global.get $__fungi_heap) (i32.const 16)))
      (i32.store (i32.add (local.get $__fungi_rec_2) (i32.const 0)) (i32.const 9)) ;; .code
      (i32.store (i32.add (local.get $__fungi_rec_2) (i32.const 4)) (i32.const 2)) ;; .severity
      (i32.store (i32.add (local.get $__fungi_rec_2) (i32.const 8)) (i32.const 10)) ;; .message
      (i32.store (i32.add (local.get $__fungi_rec_2) (i32.const 12)) (i32.const 11)) ;; .path
      (local.get $__fungi_rec_2)
    )))
              )
            )
          )
        )
        (local.set $__fungi_match_4 (i32.load (i32.add (local.get $__fungi_match_1) (i32.const 4))))
        (if (call $host___option_is_none_v2 (local.get $__fungi_match_4))
          (then
          )
          (else
            (local.set $__fungi_match_5 (call $host___option_value_f64_v2 (local.get $__fungi_match_4)))
            (if (f64.le (call $fungi_assert_finite_f64 (local.get $__fungi_match_5)) (call $fungi_assert_finite_f64 (f64.const 0.0)))
              (then
                (local.set $diagnostics (call $host___array_append (local.get $diagnostics) (block (result i32)
      (local.set $__fungi_rec_3 (global.get $__fungi_heap))
      (global.set $__fungi_heap (i32.add (global.get $__fungi_heap) (i32.const 16)))
      (i32.store (i32.add (local.get $__fungi_rec_3) (i32.const 0)) (i32.const 12)) ;; .code
      (i32.store (i32.add (local.get $__fungi_rec_3) (i32.const 4)) (i32.const 2)) ;; .severity
      (i32.store (i32.add (local.get $__fungi_rec_3) (i32.const 8)) (i32.const 13)) ;; .message
      (i32.store (i32.add (local.get $__fungi_rec_3) (i32.const 12)) (i32.const 14)) ;; .path
      (local.get $__fungi_rec_3)
    )))
              )
            )
          )
        )
      )
    )
    (local.get $diagnostics)
  )
  (export "validateComputePlan" (func $validateComputePlan))

)