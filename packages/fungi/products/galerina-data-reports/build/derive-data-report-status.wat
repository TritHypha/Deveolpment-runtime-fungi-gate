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

  ;; pure flow: deriveDataReportStatus
  (func $deriveDataReportStatus (param $p0 i32) (result i32)
    (local $hasWarning i32)
    (local $index i32)
    (local $__while_fuel_0 i32)
    (local $diagnosticOpt i32)
    (local $__fungi_match_1 i32)
    (local $__fungi_match_2 i32)
    (local.set $hasWarning (i32.const 0))
    (local.set $index (i32.const 0))
    (block $while_exit_0
      (loop $while_loop_0
        (br_if $while_exit_0 (i32.ge_s (local.get $index) (call $host___array_length (local.get $p0))))
        (local.set $__while_fuel_0 (i32.add (local.get $__while_fuel_0) (i32.const 1)))
        (if (i32.gt_u (local.get $__while_fuel_0) (i32.const 100000)) (then unreachable))
        (local.set $diagnosticOpt (call $host___array_get_option_v2 (local.get $p0) (local.get $index)))
        (local.set $__fungi_match_1 (local.get $diagnosticOpt))
        (if (call $host___option_is_none_v2 (local.get $__fungi_match_1))
          (then
          )
          (else
            (local.set $__fungi_match_2 (call $host___option_value_v2 (local.get $__fungi_match_1)))
            (if (call $host___str_eq (i32.load (i32.add (local.get $__fungi_match_2) (i32.const 0))) (i32.const 1))
              (then
                (return (i32.const 2))
              )
            )
            (if (call $host___str_eq (i32.load (i32.add (local.get $__fungi_match_2) (i32.const 0))) (i32.const 3))
              (then
                (local.set $hasWarning (i32.const 1))
              )
            )
          )
        )
        (local.set $index (call $fungi_checked_add_i32 (local.get $index) (i32.const 1)))
        (br $while_loop_0)
      )
    )
    (if (i32.eq (local.get $hasWarning) (i32.const 1))
      (then
        (return (i32.const 4))
      )
    )
    (i32.const 5)
  )
  (export "deriveDataReportStatus" (func $deriveDataReportStatus))

)