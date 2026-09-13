(module
  ;; effect: stdlib.string
  (import "host" "__str_concat" (func $host___str_concat (param $p0 i32) (param $p1 i32) (result i32)))
  ;; effect: stdlib.result
  (import "host" "__result_ok" (func $host___result_ok (param $p0 i32) (result i32)))
  ;; effect: stdlib.result
  (import "host" "__result_err" (func $host___result_err (param $p0 i32) (result i32)))
  ;; effect: stdlib.string
  (import "host" "__float_to_str" (func $host___float_to_str (param $p0 f64) (result i32)))

  (memory 2 2048)
  (export "memory" (memory 0))

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

  ;; pure flow: validateEnvelope
  (func $validateEnvelope (param $p0 i32) (result i32)
    (local $finite i32)
    (local $ordered i32)
    (local $valid i32)
    (local $messageStart i32)
    (local $messageWithThrottle i32)
    (local $messageWithSafe i32)
    (local $message i32)
    (local.set $finite (i32.and (i32.and (call $fungi_is_finite_f64 (f64.load (i32.add (local.get $p0) (i32.const 0)))) (call $fungi_is_finite_f64 (f64.load (i32.add (local.get $p0) (i32.const 8))))) (call $fungi_is_finite_f64 (f64.load (i32.add (local.get $p0) (i32.const 16))))))
    (local.set $ordered (i32.and (i32.and (f64.lt (call $fungi_assert_finite_f64 (f64.const 0.0)) (call $fungi_assert_finite_f64 (f64.load (i32.add (local.get $p0) (i32.const 0))))) (f64.lt (call $fungi_assert_finite_f64 (f64.load (i32.add (local.get $p0) (i32.const 0)))) (call $fungi_assert_finite_f64 (f64.load (i32.add (local.get $p0) (i32.const 8)))))) (f64.lt (call $fungi_assert_finite_f64 (f64.load (i32.add (local.get $p0) (i32.const 8)))) (call $fungi_assert_finite_f64 (f64.load (i32.add (local.get $p0) (i32.const 16)))))))
    (local.set $valid (i32.and (local.get $finite) (local.get $ordered)))
    (if (i32.eq (local.get $valid) (i32.const 1))
      (then
        (return (call $host___result_ok (i32.const 1)))
      )
    )
    (local.set $messageStart (i32.const 1))
    (local.set $messageWithThrottle (call $host___str_concat (call $host___str_concat (local.get $messageStart) (i32.const 2)) (call $host___float_to_str (f64.load (i32.add (local.get $p0) (i32.const 0))))))
    (local.set $messageWithSafe (call $host___str_concat (call $host___str_concat (local.get $messageWithThrottle) (i32.const 3)) (call $host___float_to_str (f64.load (i32.add (local.get $p0) (i32.const 8))))))
    (local.set $message (call $host___str_concat (call $host___str_concat (local.get $messageWithSafe) (i32.const 4)) (call $host___float_to_str (f64.load (i32.add (local.get $p0) (i32.const 16))))))
    (call $host___result_err (local.get $message))
  )
  (export "validateEnvelope" (func $validateEnvelope))

)