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

  ;; strict-trapping checked helper — signed overflow / non-finite float traps (unreachable)
  (func $fungi_assert_finite_f64 (param $v f64) (result f64)
    ;; (v - v) = 0 for a finite v but NaN for NaN/±Inf → f64.ne(…,0) traps on any non-finite value
    (if (f64.ne (f64.sub (local.get $v) (local.get $v)) (f64.const 0)) (then unreachable))
    (local.get $v))

  ;; pure flow: validateBenchmarkConfigAtPath
  (func $validateBenchmarkConfigAtPath (param $p0 i32) (param $p1 i32) (result i32)
    (local $diagnostics i32)
    (local $__fungi_rec_0 i32)
    (local $__fungi_rec_1 i32)
    (local $__fungi_rec_2 i32)
    (local $__fungi_rec_3 i32)
    (local $__fungi_rec_4 i32)
    (local $__fungi_rec_5 i32)
    (local $anyTargetEnabled i32)
    (local $targetIndex i32)
    (local $__while_fuel_0 i32)
    (local $targetOpt i32)
    (local $__fungi_match_1 i32)
    (local $__fungi_match_2 i32)
    (local $__fungi_rec_6 i32)
    (local.set $diagnostics (call $host___array_create))
    (if (i32.eq (f64.gt (call $fungi_assert_finite_f64 (f64.load (i32.add (local.get $p0) (i32.const 0)))) (call $fungi_assert_finite_f64 (f64.const 0.0))) (i32.const 0))
      (then
        (local.set $diagnostics (call $host___array_append (local.get $diagnostics) (block (result i32)
      (local.set $__fungi_rec_0 (global.get $__fungi_heap))
      (global.set $__fungi_heap (i32.add (global.get $__fungi_heap) (i32.const 16)))
      (i32.store (i32.add (local.get $__fungi_rec_0) (i32.const 0)) (i32.const 1)) ;; .code
      (i32.store (i32.add (local.get $__fungi_rec_0) (i32.const 4)) (i32.const 2)) ;; .severity
      (i32.store (i32.add (local.get $__fungi_rec_0) (i32.const 8)) (i32.const 3)) ;; .message
      (i32.store (i32.add (local.get $__fungi_rec_0) (i32.const 12)) (call $host___str_concat (local.get $p1) (i32.const 4))) ;; .path
      (local.get $__fungi_rec_0)
    )))
      )
    )
    (if (i32.eq (f64.gt (call $fungi_assert_finite_f64 (f64.load (i32.add (local.get $p0) (i32.const 8)))) (call $fungi_assert_finite_f64 (f64.const 0.0))) (i32.const 0))
      (then
        (local.set $diagnostics (call $host___array_append (local.get $diagnostics) (block (result i32)
      (local.set $__fungi_rec_1 (global.get $__fungi_heap))
      (global.set $__fungi_heap (i32.add (global.get $__fungi_heap) (i32.const 16)))
      (i32.store (i32.add (local.get $__fungi_rec_1) (i32.const 0)) (i32.const 5)) ;; .code
      (i32.store (i32.add (local.get $__fungi_rec_1) (i32.const 4)) (i32.const 2)) ;; .severity
      (i32.store (i32.add (local.get $__fungi_rec_1) (i32.const 8)) (i32.const 6)) ;; .message
      (i32.store (i32.add (local.get $__fungi_rec_1) (i32.const 12)) (call $host___str_concat (local.get $p1) (i32.const 7))) ;; .path
      (local.get $__fungi_rec_1)
    )))
      )
    )
    (if (i32.and (f64.gt (call $fungi_assert_finite_f64 (f64.load (i32.add (local.get $p0) (i32.const 8)))) (call $fungi_assert_finite_f64 (f64.const 0.0))) (f64.gt (call $fungi_assert_finite_f64 (f64.load (i32.add (local.get $p0) (i32.const 0)))) (call $fungi_assert_finite_f64 (f64.const 0.0))))
      (then
        (if (f64.gt (call $fungi_assert_finite_f64 (f64.load (i32.add (local.get $p0) (i32.const 8)))) (call $fungi_assert_finite_f64 (f64.load (i32.add (local.get $p0) (i32.const 0)))))
          (then
            (local.set $diagnostics (call $host___array_append (local.get $diagnostics) (block (result i32)
      (local.set $__fungi_rec_2 (global.get $__fungi_heap))
      (global.set $__fungi_heap (i32.add (global.get $__fungi_heap) (i32.const 16)))
      (i32.store (i32.add (local.get $__fungi_rec_2) (i32.const 0)) (i32.const 8)) ;; .code
      (i32.store (i32.add (local.get $__fungi_rec_2) (i32.const 4)) (i32.const 2)) ;; .severity
      (i32.store (i32.add (local.get $__fungi_rec_2) (i32.const 8)) (i32.const 9)) ;; .message
      (i32.store (i32.add (local.get $__fungi_rec_2) (i32.const 12)) (call $host___str_concat (local.get $p1) (i32.const 7))) ;; .path
      (local.get $__fungi_rec_2)
    )))
          )
        )
      )
    )
    (if (i32.eq (i32.load (i32.add (i32.load (i32.add (local.get $p0) (i32.const 16))) (i32.const 0))) (i32.const 1))
      (then
        (local.set $diagnostics (call $host___array_append (local.get $diagnostics) (block (result i32)
      (local.set $__fungi_rec_3 (global.get $__fungi_heap))
      (global.set $__fungi_heap (i32.add (global.get $__fungi_heap) (i32.const 16)))
      (i32.store (i32.add (local.get $__fungi_rec_3) (i32.const 0)) (i32.const 10)) ;; .code
      (i32.store (i32.add (local.get $__fungi_rec_3) (i32.const 4)) (i32.const 2)) ;; .severity
      (i32.store (i32.add (local.get $__fungi_rec_3) (i32.const 8)) (i32.const 11)) ;; .message
      (i32.store (i32.add (local.get $__fungi_rec_3) (i32.const 12)) (call $host___str_concat (local.get $p1) (i32.const 12))) ;; .path
      (local.get $__fungi_rec_3)
    )))
      )
    )
    (if (i32.eq (i32.load (i32.add (i32.load (i32.add (local.get $p0) (i32.const 16))) (i32.const 4))) (i32.const 1))
      (then
        (local.set $diagnostics (call $host___array_append (local.get $diagnostics) (block (result i32)
      (local.set $__fungi_rec_4 (global.get $__fungi_heap))
      (global.set $__fungi_heap (i32.add (global.get $__fungi_heap) (i32.const 16)))
      (i32.store (i32.add (local.get $__fungi_rec_4) (i32.const 0)) (i32.const 10)) ;; .code
      (i32.store (i32.add (local.get $__fungi_rec_4) (i32.const 4)) (i32.const 2)) ;; .severity
      (i32.store (i32.add (local.get $__fungi_rec_4) (i32.const 8)) (i32.const 13)) ;; .message
      (i32.store (i32.add (local.get $__fungi_rec_4) (i32.const 12)) (call $host___str_concat (local.get $p1) (i32.const 14))) ;; .path
      (local.get $__fungi_rec_4)
    )))
      )
    )
    (if (i32.eq (i32.load (i32.add (i32.load (i32.add (local.get $p0) (i32.const 16))) (i32.const 8))) (i32.const 1))
      (then
        (local.set $diagnostics (call $host___array_append (local.get $diagnostics) (block (result i32)
      (local.set $__fungi_rec_5 (global.get $__fungi_heap))
      (global.set $__fungi_heap (i32.add (global.get $__fungi_heap) (i32.const 16)))
      (i32.store (i32.add (local.get $__fungi_rec_5) (i32.const 0)) (i32.const 10)) ;; .code
      (i32.store (i32.add (local.get $__fungi_rec_5) (i32.const 4)) (i32.const 2)) ;; .severity
      (i32.store (i32.add (local.get $__fungi_rec_5) (i32.const 8)) (i32.const 15)) ;; .message
      (i32.store (i32.add (local.get $__fungi_rec_5) (i32.const 12)) (call $host___str_concat (local.get $p1) (i32.const 16))) ;; .path
      (local.get $__fungi_rec_5)
    )))
      )
    )
    (local.set $anyTargetEnabled (i32.const 0))
    (local.set $targetIndex (i32.const 0))
    (block $while_exit_0
      (loop $while_loop_0
        (br_if $while_exit_0 (i32.eqz (i32.and (i32.lt_s (local.get $targetIndex) (call $host___array_length (i32.load (i32.add (local.get $p0) (i32.const 20))))) (i32.eq (local.get $anyTargetEnabled) (i32.const 0)))))
        (local.set $__while_fuel_0 (i32.add (local.get $__while_fuel_0) (i32.const 1)))
        (if (i32.gt_u (local.get $__while_fuel_0) (i32.const 100000)) (then unreachable))
        (local.set $targetOpt (call $host___array_get_option_v2 (i32.load (i32.add (local.get $p0) (i32.const 20))) (local.get $targetIndex)))
        (local.set $__fungi_match_1 (local.get $targetOpt))
        (if (call $host___option_is_none_v2 (local.get $__fungi_match_1))
          (then
          )
          (else
            (local.set $__fungi_match_2 (call $host___option_value_v2 (local.get $__fungi_match_1)))
            (if (i32.or (i32.load (i32.add (local.get $__fungi_match_2) (i32.const 0))) (i32.load (i32.add (local.get $__fungi_match_2) (i32.const 4))))
              (then
                (local.set $anyTargetEnabled (i32.const 1))
              )
            )
          )
        )
        (local.set $targetIndex (call $fungi_checked_add_i32 (local.get $targetIndex) (i32.const 1)))
        (br $while_loop_0)
      )
    )
    (if (i32.eq (local.get $anyTargetEnabled) (i32.const 0))
      (then
        (local.set $diagnostics (call $host___array_append (local.get $diagnostics) (block (result i32)
      (local.set $__fungi_rec_6 (global.get $__fungi_heap))
      (global.set $__fungi_heap (i32.add (global.get $__fungi_heap) (i32.const 16)))
      (i32.store (i32.add (local.get $__fungi_rec_6) (i32.const 0)) (i32.const 17)) ;; .code
      (i32.store (i32.add (local.get $__fungi_rec_6) (i32.const 4)) (i32.const 2)) ;; .severity
      (i32.store (i32.add (local.get $__fungi_rec_6) (i32.const 8)) (i32.const 18)) ;; .message
      (i32.store (i32.add (local.get $__fungi_rec_6) (i32.const 12)) (call $host___str_concat (local.get $p1) (i32.const 19))) ;; .path
      (local.get $__fungi_rec_6)
    )))
      )
    )
    (local.get $diagnostics)
  )
  (export "validateBenchmarkConfigAtPath" (func $validateBenchmarkConfigAtPath))

  ;; pure flow: validateBenchmarkConfig
  (func $validateBenchmarkConfig (param $p0 i32) (result i32)
    ;; B2 (R&D 0055): per-flow arena reset — reclaim the previous invocation's heap (leaf entry-point)
    (global.set $__fungi_heap (i32.const 1024))
    (call $validateBenchmarkConfigAtPath (local.get $p0) (i32.const 20))
  )
  (export "validateBenchmarkConfig" (func $validateBenchmarkConfig))

)