(module
  ;; effect: stdlib.array
  (import "host" "__array_create" (func $host___array_create (result i32)))
  ;; effect: stdlib.array
  (import "host" "__array_append" (func $host___array_append (param $p0 i32) (param $p1 i32) (result i32)))
  ;; effect: stdlib.string
  (import "host" "__str_concat" (func $host___str_concat (param $p0 i32) (param $p1 i32) (result i32)))
  ;; effect: stdlib.string
  (import "host" "__float_to_str" (func $host___float_to_str (param $p0 f64) (result i32)))
  ;; effect: stdlib.string
  (import "host" "__str_contains" (func $host___str_contains (param $p0 i32) (param $p1 i32) (result i32)))

  (memory 2 2048)
  (export "memory" (memory 0))

  ;; P9.4b: bump-allocator heap pointer for record struct layout
  (global $__fungi_heap (mut i32) (i32.const 1024))

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

  ;; pure flow: validateMatrixType
  (func $validateMatrixType (param $p0 i32) (param $p1 i32) (result i32)
    (local $diagnostics i32)
    (local $__fungi_rec_0 i32)
    (local $__fungi_rec_1 i32)
    ;; B2 (R&D 0055): per-flow arena reset — reclaim the previous invocation's heap (leaf entry-point)
    (global.set $__fungi_heap (i32.const 1024))
    (local.set $diagnostics (call $host___array_create))
    (if (i32.eq (call $isPositiveSafeInteger (f64.load (i32.add (i32.load (i32.add (local.get $p0) (i32.const 4))) (i32.const 0)))) (i32.const 0))
      (then
        (local.set $diagnostics (call $host___array_append (local.get $diagnostics) (block (result i32)
      (local.set $__fungi_rec_0 (global.get $__fungi_heap))
      (global.set $__fungi_heap (i32.add (global.get $__fungi_heap) (i32.const 16)))
      (i32.store (i32.add (local.get $__fungi_rec_0) (i32.const 0)) (i32.const 4)) ;; .code
      (i32.store (i32.add (local.get $__fungi_rec_0) (i32.const 4)) (i32.const 5)) ;; .severity
      (i32.store (i32.add (local.get $__fungi_rec_0) (i32.const 8)) (i32.const 6)) ;; .message
      (i32.store (i32.add (local.get $__fungi_rec_0) (i32.const 12)) (call $host___str_concat (local.get $p1) (i32.const 7))) ;; .path
      (local.get $__fungi_rec_0)
    )))
      )
    )
    (if (i32.eq (call $isPositiveSafeInteger (f64.load (i32.add (i32.load (i32.add (local.get $p0) (i32.const 4))) (i32.const 8)))) (i32.const 0))
      (then
        (local.set $diagnostics (call $host___array_append (local.get $diagnostics) (block (result i32)
      (local.set $__fungi_rec_1 (global.get $__fungi_heap))
      (global.set $__fungi_heap (i32.add (global.get $__fungi_heap) (i32.const 16)))
      (i32.store (i32.add (local.get $__fungi_rec_1) (i32.const 0)) (i32.const 8)) ;; .code
      (i32.store (i32.add (local.get $__fungi_rec_1) (i32.const 4)) (i32.const 5)) ;; .severity
      (i32.store (i32.add (local.get $__fungi_rec_1) (i32.const 8)) (i32.const 9)) ;; .message
      (i32.store (i32.add (local.get $__fungi_rec_1) (i32.const 12)) (call $host___str_concat (local.get $p1) (i32.const 10))) ;; .path
      (local.get $__fungi_rec_1)
    )))
      )
    )
    (local.get $diagnostics)
  )
  (export "validateMatrixType" (func $validateMatrixType))

)