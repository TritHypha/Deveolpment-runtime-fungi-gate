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
  (import "host" "__int_to_str" (func $host___int_to_str (param $p0 i32) (result i32)))
  ;; effect: stdlib.string
  (import "host" "__float_to_str" (func $host___float_to_str (param $p0 f64) (result i32)))
  ;; effect: stdlib.string
  (import "host" "__str_eq" (func $host___str_eq (param $p0 i32) (param $p1 i32) (result i32)))
  ;; effect: stdlib.string
  (import "host" "__str_contains" (func $host___str_contains (param $p0 i32) (param $p1 i32) (result i32)))
  ;; effect: stdlib.string
  (import "host" "__str_trim" (func $host___str_trim (param $p0 i32) (result i32)))
  ;; effect: stdlib.char
  (import "host" "__char_from_code" (func $host___char_from_code (param $p0 i32) (result i32)))
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

  ;; strict-trapping checked helper — signed overflow / non-finite float traps (unreachable)
  (func $fungi_is_finite_f64 (param $v f64) (result i32)
    ;; NaN fails equality with itself; abs(±Inf) is greater than the largest finite f64.
    (i32.and
      (f64.eq (local.get $v) (local.get $v))
      (f64.le (f64.abs (local.get $v)) (f64.const 1.7976931348623157e+308)))
  )

  ;; pure flow: isPositiveSafeInteger
  (func $isPositiveSafeInteger (param $p0 f64) (result i32)
    (local $rendered i32)
    (if (i32.eq (call $fungi_is_finite_f64 (local.get $p0)) (i32.const 0))
      (then
        (return (i32.const 0))
      )
    )
    (if (f64.le (call $fungi_assert_finite_f64 (local.get $p0)) (call $fungi_assert_finite_f64 (f64.const 0.0)))
      (then
        (return (i32.const 0))
      )
    )
    (if (f64.ge (call $fungi_assert_finite_f64 (local.get $p0)) (call $fungi_assert_finite_f64 (f64.const 9007199254740992.0)))
      (then
        (return (i32.const 0))
      )
    )
    (local.set $rendered (call $host___float_to_str (local.get $p0)))
    (if (call $host___str_contains (local.get $rendered) (i32.const 1))
      (then
        (return (i32.const 0))
      )
    )
    (if (i32.or (call $host___str_contains (local.get $rendered) (i32.const 2)) (call $host___str_contains (local.get $rendered) (i32.const 3)))
      (then
        (return (i32.const 0))
      )
    )
    (i32.const 1)
  )
  (export "isPositiveSafeInteger" (func $isPositiveSafeInteger))

  ;; pure flow: isNonNegativeSafeInteger
  (func $isNonNegativeSafeInteger (param $p0 f64) (result i32)
    (local $rendered i32)
    (if (i32.eq (call $fungi_is_finite_f64 (local.get $p0)) (i32.const 0))
      (then
        (return (i32.const 0))
      )
    )
    (if (f64.lt (call $fungi_assert_finite_f64 (local.get $p0)) (call $fungi_assert_finite_f64 (f64.const 0.0)))
      (then
        (return (i32.const 0))
      )
    )
    (if (f64.ge (call $fungi_assert_finite_f64 (local.get $p0)) (call $fungi_assert_finite_f64 (f64.const 9007199254740992.0)))
      (then
        (return (i32.const 0))
      )
    )
    (local.set $rendered (call $host___float_to_str (local.get $p0)))
    (if (call $host___str_contains (local.get $rendered) (i32.const 1))
      (then
        (return (i32.const 0))
      )
    )
    (if (i32.or (call $host___str_contains (local.get $rendered) (i32.const 2)) (call $host___str_contains (local.get $rendered) (i32.const 3)))
      (then
        (return (i32.const 0))
      )
    )
    (i32.const 1)
  )
  (export "isNonNegativeSafeInteger" (func $isNonNegativeSafeInteger))

  ;; pure flow: validateSearchQuery
  (func $validateSearchQuery (param $p0 i32) (result i32)
    (local $diagnostics i32)
    (local $__fungi_rec_0 i32)
    (local $__fungi_rec_1 i32)
    (local $__fungi_match_0 i32)
    (local $__fungi_match_1 f64)
    (local $__fungi_rec_2 i32)
    (local $filterIndex i32)
    (local $__while_fuel_2 i32)
    (local $filterOpt i32)
    (local $__fungi_match_3 i32)
    (local $__fungi_match_4 i32)
    (local $__fungi_rec_3 i32)
    (local $knownOperator i32)
    (local $__fungi_rec_4 i32)
    ;; B2 (R&D 0055): per-flow arena reset — reclaim the previous invocation's heap (leaf entry-point)
    (global.set $__fungi_heap (i32.const 1024))
    (local.set $diagnostics (call $host___array_create))
    (if (i32.eq (call $host___str_length (call $host___str_trim (i32.load (i32.add (local.get $p0) (i32.const 0))))) (i32.const 0))
      (then
        (local.set $diagnostics (call $host___array_append (local.get $diagnostics) (block (result i32)
      (local.set $__fungi_rec_0 (global.get $__fungi_heap))
      (global.set $__fungi_heap (i32.add (global.get $__fungi_heap) (i32.const 16)))
      (i32.store (i32.add (local.get $__fungi_rec_0) (i32.const 0)) (i32.const 4)) ;; .code
      (i32.store (i32.add (local.get $__fungi_rec_0) (i32.const 4)) (i32.const 5)) ;; .severity
      (i32.store (i32.add (local.get $__fungi_rec_0) (i32.const 8)) (i32.const 6)) ;; .message
      (i32.store (i32.add (local.get $__fungi_rec_0) (i32.const 12)) (i32.const 7)) ;; .path
      (local.get $__fungi_rec_0)
    )))
      )
    )
    (if (i32.eq (call $isPositiveSafeInteger (f64.load (i32.add (local.get $p0) (i32.const 16)))) (i32.const 0))
      (then
        (local.set $diagnostics (call $host___array_append (local.get $diagnostics) (block (result i32)
      (local.set $__fungi_rec_1 (global.get $__fungi_heap))
      (global.set $__fungi_heap (i32.add (global.get $__fungi_heap) (i32.const 16)))
      (i32.store (i32.add (local.get $__fungi_rec_1) (i32.const 0)) (i32.const 8)) ;; .code
      (i32.store (i32.add (local.get $__fungi_rec_1) (i32.const 4)) (i32.const 5)) ;; .severity
      (i32.store (i32.add (local.get $__fungi_rec_1) (i32.const 8)) (i32.const 9)) ;; .message
      (i32.store (i32.add (local.get $__fungi_rec_1) (i32.const 12)) (i32.const 10)) ;; .path
      (local.get $__fungi_rec_1)
    )))
      )
    )
    (local.set $__fungi_match_0 (i32.load (i32.add (local.get $p0) (i32.const 24))))
    (if (call $host___option_is_none_v2 (local.get $__fungi_match_0))
      (then
      )
      (else
        (local.set $__fungi_match_1 (call $host___option_value_f64_v2 (local.get $__fungi_match_0)))
        (if (i32.eq (call $isNonNegativeSafeInteger (local.get $__fungi_match_1)) (i32.const 0))
          (then
            (local.set $diagnostics (call $host___array_append (local.get $diagnostics) (block (result i32)
      (local.set $__fungi_rec_2 (global.get $__fungi_heap))
      (global.set $__fungi_heap (i32.add (global.get $__fungi_heap) (i32.const 16)))
      (i32.store (i32.add (local.get $__fungi_rec_2) (i32.const 0)) (i32.const 11)) ;; .code
      (i32.store (i32.add (local.get $__fungi_rec_2) (i32.const 4)) (i32.const 5)) ;; .severity
      (i32.store (i32.add (local.get $__fungi_rec_2) (i32.const 8)) (i32.const 12)) ;; .message
      (i32.store (i32.add (local.get $__fungi_rec_2) (i32.const 12)) (i32.const 13)) ;; .path
      (local.get $__fungi_rec_2)
    )))
          )
        )
      )
    )
    (local.set $filterIndex (i32.const 0))
    (block $while_exit_2
      (loop $while_loop_2
        (br_if $while_exit_2 (i32.ge_s (local.get $filterIndex) (call $host___array_length (i32.load (i32.add (local.get $p0) (i32.const 8))))))
        (local.set $__while_fuel_2 (i32.add (local.get $__while_fuel_2) (i32.const 1)))
        (if (i32.gt_u (local.get $__while_fuel_2) (i32.const 100000)) (then unreachable))
        (local.set $filterOpt (call $host___array_get_option_v2 (i32.load (i32.add (local.get $p0) (i32.const 8))) (local.get $filterIndex)))
        (local.set $__fungi_match_3 (local.get $filterOpt))
        (if (call $host___option_is_none_v2 (local.get $__fungi_match_3))
          (then
          )
          (else
            (local.set $__fungi_match_4 (call $host___option_value_v2 (local.get $__fungi_match_3)))
            (if (i32.eq (call $host___str_length (call $host___str_trim (i32.load (i32.add (local.get $__fungi_match_4) (i32.const 0))))) (i32.const 0))
              (then
                (local.set $diagnostics (call $host___array_append (local.get $diagnostics) (block (result i32)
      (local.set $__fungi_rec_3 (global.get $__fungi_heap))
      (global.set $__fungi_heap (i32.add (global.get $__fungi_heap) (i32.const 16)))
      (i32.store (i32.add (local.get $__fungi_rec_3) (i32.const 0)) (i32.const 14)) ;; .code
      (i32.store (i32.add (local.get $__fungi_rec_3) (i32.const 4)) (i32.const 5)) ;; .severity
      (i32.store (i32.add (local.get $__fungi_rec_3) (i32.const 8)) (i32.const 15)) ;; .message
      (i32.store (i32.add (local.get $__fungi_rec_3) (i32.const 12)) (call $host___str_concat (call $host___str_concat (i32.const 16) (call $host___int_to_str (local.get $filterIndex))) (i32.const 17))) ;; .path
      (local.get $__fungi_rec_3)
    )))
              )
            )
            (local.set $knownOperator (i32.const 0))
            (if (call $host___str_eq (i32.load (i32.add (local.get $__fungi_match_4) (i32.const 4))) (i32.const 18))
              (then
                (local.set $knownOperator (i32.const 1))
              )
              (else
            (if (call $host___str_eq (i32.load (i32.add (local.get $__fungi_match_4) (i32.const 4))) (i32.const 19))
              (then
                (local.set $knownOperator (i32.const 1))
              )
              (else
            (if (call $host___str_eq (i32.load (i32.add (local.get $__fungi_match_4) (i32.const 4))) (i32.const 20))
              (then
                (local.set $knownOperator (i32.const 1))
              )
              (else
            (if (call $host___str_eq (i32.load (i32.add (local.get $__fungi_match_4) (i32.const 4))) (i32.const 21))
              (then
                (local.set $knownOperator (i32.const 1))
              )
              (else
            (if (call $host___str_eq (i32.load (i32.add (local.get $__fungi_match_4) (i32.const 4))) (i32.const 22))
              (then
                (local.set $knownOperator (i32.const 1))
              )
              (else
            (if (call $host___str_eq (i32.load (i32.add (local.get $__fungi_match_4) (i32.const 4))) (i32.const 23))
              (then
                (local.set $knownOperator (i32.const 1))
              )
              (else
            (if (call $host___str_eq (i32.load (i32.add (local.get $__fungi_match_4) (i32.const 4))) (i32.const 24))
              (then
                (local.set $knownOperator (i32.const 1))
              )
              (else
            (if (call $host___str_eq (i32.load (i32.add (local.get $__fungi_match_4) (i32.const 4))) (i32.const 25))
              (then
                (local.set $knownOperator (i32.const 1))
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
              )
            )
              )
            )
              )
            )
            (if (i32.eq (local.get $knownOperator) (i32.const 0))
              (then
                (local.set $diagnostics (call $host___array_append (local.get $diagnostics) (block (result i32)
      (local.set $__fungi_rec_4 (global.get $__fungi_heap))
      (global.set $__fungi_heap (i32.add (global.get $__fungi_heap) (i32.const 16)))
      (i32.store (i32.add (local.get $__fungi_rec_4) (i32.const 0)) (i32.const 26)) ;; .code
      (i32.store (i32.add (local.get $__fungi_rec_4) (i32.const 4)) (i32.const 5)) ;; .severity
      (i32.store (i32.add (local.get $__fungi_rec_4) (i32.const 8)) (call $host___str_concat (call $host___str_concat (call $host___str_concat (call $host___str_concat (i32.const 27) (call $host___int_to_str (call $host___char_from_code (i32.const 34)))) (i32.load (i32.add (local.get $__fungi_match_4) (i32.const 4)))) (call $host___int_to_str (call $host___char_from_code (i32.const 34)))) (i32.const 28))) ;; .message
      (i32.store (i32.add (local.get $__fungi_rec_4) (i32.const 12)) (call $host___str_concat (call $host___str_concat (i32.const 16) (call $host___int_to_str (local.get $filterIndex))) (i32.const 29))) ;; .path
      (local.get $__fungi_rec_4)
    )))
              )
            )
          )
        )
        (local.set $filterIndex (call $fungi_checked_add_i32 (local.get $filterIndex) (i32.const 1)))
        (br $while_loop_2)
      )
    )
    (local.get $diagnostics)
  )
  (export "validateSearchQuery" (func $validateSearchQuery))

)