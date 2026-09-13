(module
  (memory 2 2048)
  (export "memory" (memory 0))

  ;; strict-trapping checked helper — signed overflow / non-finite float traps (unreachable)
  (func $fungi_assert_finite_f64 (param $v f64) (result f64)
    ;; (v - v) = 0 for a finite v but NaN for NaN/±Inf → f64.ne(…,0) traps on any non-finite value
    (if (f64.ne (f64.sub (local.get $v) (local.get $v)) (f64.const 0)) (then unreachable))
    (local.get $v))

  ;; pure flow: flipProbability
  (func $flipProbability (param $p0 i32) (result f64)
    (local $raw f64)
    (local.set $raw (call $fungi_assert_finite_f64 (f64.add (call $fungi_assert_finite_f64 (f64.add (call $fungi_assert_finite_f64 (f64.mul (f64.load (i32.add (local.get $p0) (i32.const 0))) (f64.const 1.0))) (call $fungi_assert_finite_f64 (f64.mul (f64.load (i32.add (local.get $p0) (i32.const 8))) (f64.const 0.5))))) (call $fungi_assert_finite_f64 (f64.mul (f64.load (i32.add (local.get $p0) (i32.const 24))) (f64.const 0.5))))))
    (if (f64.lt (call $fungi_assert_finite_f64 (local.get $raw)) (call $fungi_assert_finite_f64 (f64.const 0.0)))
      (then
        (return (f64.const 0.0))
      )
    )
    (if (f64.gt (call $fungi_assert_finite_f64 (local.get $raw)) (call $fungi_assert_finite_f64 (f64.const 1.0)))
      (then
        (return (f64.const 1.0))
      )
    )
    (local.get $raw)
  )
  (export "flipProbability" (func $flipProbability))

)