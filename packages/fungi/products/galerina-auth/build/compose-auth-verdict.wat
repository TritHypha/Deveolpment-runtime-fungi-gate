(module
  ;; effect: stdlib.array
  (import "host" "__array_get" (func $host___array_get (param $p0 i32) (param $p1 i32) (result i32)))
  ;; effect: stdlib.array
  (import "host" "__array_get_option_v2" (func $host___array_get_option_v2 (param $p0 i32) (param $p1 i32) (result i32)))
  ;; effect: stdlib.array
  (import "host" "__array_length" (func $host___array_length (param $p0 i32) (result i32)))
  ;; effect: stdlib.result
  (import "host" "__option_is_none_v2" (func $host___option_is_none_v2 (param $p0 i32) (result i32)))
  ;; effect: stdlib.result
  (import "host" "__option_value_v2" (func $host___option_value_v2 (param $p0 i32) (result i32)))

  (memory 2 2048)
  (export "memory" (memory 0))

  ;; strict-trapping checked helper — signed overflow / non-finite float traps (unreachable)
  (func $fungi_checked_add_i32 (param $a i32) (param $b i32) (result i32)
    (local $r i32)
    (local.set $r (i32.add (local.get $a) (local.get $b)))
    ;; signed overflow iff (a^r) & (b^r) < 0
    (if (i32.lt_s (i32.and (i32.xor (local.get $a) (local.get $r)) (i32.xor (local.get $b) (local.get $r))) (i32.const 0)) (then unreachable))
    (local.get $r))

  ;; pure flow: composeAuthVerdict
  (func $composeAuthVerdict (param $p0 i32) (result i32)
    (local $firstOpt i32)
    (local $verdict i32)
    (local $__fungi_match_0 i32)
    (local $__fungi_match_1 i32)
    (local $index i32)
    (local $__while_fuel_2 i32)
    (local $factorOpt i32)
    (local $__fungi_match_3 i32)
    (local $__fungi_match_4 i32)
    (if (i32.eq (call $host___array_length (local.get $p0)) (i32.const 0))
      (then
        (return (i32.const 0))
      )
    )
    (local.set $firstOpt (call $host___array_get_option_v2 (local.get $p0) (i32.const 0)))
    (local.set $verdict (i32.const 0))
    (local.set $__fungi_match_0 (local.get $firstOpt))
    (if (call $host___option_is_none_v2 (local.get $__fungi_match_0))
      (then
        (return (i32.const 0))
      )
      (else
        (local.set $__fungi_match_1 (call $host___option_value_v2 (local.get $__fungi_match_0)))
        (local.set $verdict (local.get $__fungi_match_1))
      )
    )
    (local.set $index (i32.const 1))
    (block $while_exit_2
      (loop $while_loop_2
        (br_if $while_exit_2 (i32.ge_s (local.get $index) (call $host___array_length (local.get $p0))))
        (local.set $__while_fuel_2 (i32.add (local.get $__while_fuel_2) (i32.const 1)))
        (if (i32.gt_u (local.get $__while_fuel_2) (i32.const 100000)) (then unreachable))
        (local.set $factorOpt (call $host___array_get_option_v2 (local.get $p0) (local.get $index)))
        (local.set $__fungi_match_3 (local.get $factorOpt))
        (if (call $host___option_is_none_v2 (local.get $__fungi_match_3))
          (then
          )
          (else
            (local.set $__fungi_match_4 (call $host___option_value_v2 (local.get $__fungi_match_3)))
            (if (i32.lt_s (local.get $__fungi_match_4) (local.get $verdict))
              (then
                (local.set $verdict (local.get $__fungi_match_4))
              )
            )
          )
        )
        (local.set $index (call $fungi_checked_add_i32 (local.get $index) (i32.const 1)))
        (br $while_loop_2)
      )
    )
    (local.get $verdict)
  )
  (export "composeAuthVerdict" (func $composeAuthVerdict))

)