(module
  ;; effect: stdlib.array
  (import "host" "__array_get" (func $host___array_get (param $p0 i32) (param $p1 i32) (result i32)))
  ;; effect: stdlib.array
  (import "host" "__array_get_option_v2" (func $host___array_get_option_v2 (param $p0 i32) (param $p1 i32) (result i32)))
  ;; effect: stdlib.array
  (import "host" "__array_length" (func $host___array_length (param $p0 i32) (result i32)))
  ;; effect: stdlib.string
  (import "host" "__str_eq" (func $host___str_eq (param $p0 i32) (param $p1 i32) (result i32)))
  ;; effect: stdlib.result
  (import "host" "__option_is_none_v2" (func $host___option_is_none_v2 (param $p0 i32) (result i32)))
  ;; effect: stdlib.result
  (import "host" "__option_value_f64_v2" (func $host___option_value_f64_v2 (param $p0 i32) (result f64)))

  (memory 2 2048)
  (export "memory" (memory 0))

  ;; strict-trapping checked helper — signed overflow / non-finite float traps (unreachable)
  (func $fungi_checked_add_i32 (param $a i32) (param $b i32) (result i32)
    (local $r i32)
    (local.set $r (i32.add (local.get $a) (local.get $b)))
    ;; signed overflow iff (a^r) & (b^r) < 0
    (if (i32.lt_s (i32.and (i32.xor (local.get $a) (local.get $r)) (i32.xor (local.get $b) (local.get $r))) (i32.const 0)) (then unreachable))
    (local.get $r))

  ;; pure flow: isSameTensorShape
  (func $isSameTensorShape (param $p0 i32) (param $p1 i32) (result i32)
    (local $index i32)
    (local $__while_fuel_0 i32)
    (local $leftDimension i32)
    (local $rightDimension i32)
    (local $__fungi_match_1 i32)
    (local $__fungi_match_2 f64)
    (local $__fungi_match_3 i32)
    (local $__fungi_match_4 f64)
    (if (i32.eqz (call $host___str_eq (i32.load (i32.add (local.get $p0) (i32.const 0))) (i32.load (i32.add (local.get $p1) (i32.const 0)))))
      (then
        (return (i32.const 0))
      )
    )
    (if (i32.ne (call $host___array_length (i32.load (i32.add (i32.load (i32.add (local.get $p0) (i32.const 4))) (i32.const 0)))) (call $host___array_length (i32.load (i32.add (i32.load (i32.add (local.get $p1) (i32.const 4))) (i32.const 0)))))
      (then
        (return (i32.const 0))
      )
    )
    (local.set $index (i32.const 0))
    (block $while_exit_0
      (loop $while_loop_0
        (br_if $while_exit_0 (i32.ge_s (local.get $index) (call $host___array_length (i32.load (i32.add (i32.load (i32.add (local.get $p0) (i32.const 4))) (i32.const 0))))))
        (local.set $__while_fuel_0 (i32.add (local.get $__while_fuel_0) (i32.const 1)))
        (if (i32.gt_u (local.get $__while_fuel_0) (i32.const 100000)) (then unreachable))
        (local.set $leftDimension (call $host___array_get_option_v2 (i32.load (i32.add (i32.load (i32.add (local.get $p0) (i32.const 4))) (i32.const 0))) (local.get $index)))
        (local.set $rightDimension (call $host___array_get_option_v2 (i32.load (i32.add (i32.load (i32.add (local.get $p1) (i32.const 4))) (i32.const 0))) (local.get $index)))
        (local.set $__fungi_match_1 (local.get $leftDimension))
        (if (call $host___option_is_none_v2 (local.get $__fungi_match_1))
          (then
            (return (i32.const 0))
          )
          (else
            (local.set $__fungi_match_2 (call $host___option_value_f64_v2 (local.get $__fungi_match_1)))
            (local.set $__fungi_match_3 (local.get $rightDimension))
            (if (call $host___option_is_none_v2 (local.get $__fungi_match_3))
              (then
                (return (i32.const 0))
              )
              (else
                (local.set $__fungi_match_4 (call $host___option_value_f64_v2 (local.get $__fungi_match_3)))
                (if (f64.ne (local.get $__fungi_match_2) (local.get $__fungi_match_4))
                  (then
                    (return (i32.const 0))
                  )
                )
              )
            )
          )
        )
        (local.set $index (call $fungi_checked_add_i32 (local.get $index) (i32.const 1)))
        (br $while_loop_0)
      )
    )
    (i32.const 1)
  )
  (export "isSameTensorShape" (func $isSameTensorShape))

)