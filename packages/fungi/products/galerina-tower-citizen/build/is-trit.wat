(module
  (memory 2 2048)
  (export "memory" (memory 0))

  ;; strict-trapping checked helper — signed overflow / non-finite float traps (unreachable)
  (func $fungi_assert_finite_f64 (param $v f64) (result f64)
    ;; (v - v) = 0 for a finite v but NaN for NaN/±Inf → f64.ne(…,0) traps on any non-finite value
    (if (f64.ne (f64.sub (local.get $v) (local.get $v)) (f64.const 0)) (then unreachable))
    (local.get $v))

  ;; pure flow: isTrit
  (func $isTrit (param $p0 f64) (result i32)
    (if (i32.or (i32.or (f64.eq (local.get $p0) (call $fungi_assert_finite_f64 (f64.neg (f64.const 1.0)))) (f64.eq (local.get $p0) (f64.const 0.0))) (f64.eq (local.get $p0) (f64.const 1.0)))
      (then
        (return (i32.const 1))
      )
    )
    (i32.const 0)
  )
  (export "isTrit" (func $isTrit))

)