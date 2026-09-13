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
  (import "host" "__str_char_at" (func $host___str_char_at (param $p0 i32) (param $p1 i32) (result i32)))
  ;; effect: stdlib.string
  (import "host" "__str_char_at_option_v2" (func $host___str_char_at_option_v2 (param $p0 i32) (param $p1 i32) (result i32)))
  ;; effect: stdlib.string
  (import "host" "__str_trim" (func $host___str_trim (param $p0 i32) (result i32)))
  ;; effect: stdlib.char
  (import "host" "__char_to_string" (func $host___char_to_string (param $p0 i32) (result i32)))
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

  ;; pure flow: readEgressLedger
  (func $readEgressLedger (param $p0 i32) (result i32)
    (local $out i32)
    (local $lines i32)
    (local $currentLine i32)
    (local $scanIndex i32)
    (local $__while_fuel_0 i32)
    (local $characterOpt i32)
    (local $__fungi_match_1 i32)
    (local $__fungi_match_2 i32)
    (local $index i32)
    (local $__while_fuel_3 i32)
    (local $lineOpt i32)
    (local $__fungi_match_4 i32)
    (local $__fungi_match_5 i32)
    (local $trimmed i32)
    (local.set $out (call $host___array_create))
    (local.set $lines (call $host___array_create))
    (local.set $currentLine (i32.const 0))
    (local.set $scanIndex (i32.const 0))
    (block $while_exit_0
      (loop $while_loop_0
        (br_if $while_exit_0 (i32.ge_s (local.get $scanIndex) (call $host___str_length (local.get $p0))))
        (local.set $__while_fuel_0 (i32.add (local.get $__while_fuel_0) (i32.const 1)))
        (if (i32.gt_u (local.get $__while_fuel_0) (i32.const 100000)) (then unreachable))
        (local.set $characterOpt (call $host___str_char_at_option_v2 (local.get $p0) (local.get $scanIndex)))
        (local.set $__fungi_match_1 (local.get $characterOpt))
        (if (call $host___option_is_none_v2 (local.get $__fungi_match_1))
          (then
          )
          (else
            (local.set $__fungi_match_2 (call $host___option_value_v2 (local.get $__fungi_match_1)))
            (if (i32.eq (local.get $__fungi_match_2) (i32.const 10))
              (then
                (local.set $lines (call $host___array_append (local.get $lines) (local.get $currentLine)))
                (local.set $currentLine (i32.const 0))
              )
            )
            (if (i32.ne (local.get $__fungi_match_2) (i32.const 10))
              (then
                (local.set $currentLine (call $host___str_concat (local.get $currentLine) (call $host___char_to_string (local.get $__fungi_match_2))))
              )
            )
          )
        )
        (local.set $scanIndex (call $fungi_checked_add_i32 (local.get $scanIndex) (i32.const 1)))
        (br $while_loop_0)
      )
    )
    (local.set $lines (call $host___array_append (local.get $lines) (local.get $currentLine)))
    (local.set $index (i32.const 0))
    (block $while_exit_3
      (loop $while_loop_3
        (br_if $while_exit_3 (i32.ge_s (local.get $index) (call $host___array_length (local.get $lines))))
        (local.set $__while_fuel_3 (i32.add (local.get $__while_fuel_3) (i32.const 1)))
        (if (i32.gt_u (local.get $__while_fuel_3) (i32.const 100000)) (then unreachable))
        (local.set $lineOpt (call $host___array_get_option_v2 (local.get $lines) (local.get $index)))
        (local.set $__fungi_match_4 (local.get $lineOpt))
        (if (call $host___option_is_none_v2 (local.get $__fungi_match_4))
          (then
          )
          (else
            (local.set $__fungi_match_5 (call $host___option_value_v2 (local.get $__fungi_match_4)))
            (local.set $trimmed (call $host___str_trim (local.get $__fungi_match_5)))
            (if (i32.gt_s (call $host___str_length (local.get $trimmed)) (i32.const 0))
              (then
                (local.set $out (call $host___array_append (local.get $out) (local.get $trimmed)))
              )
            )
          )
        )
        (local.set $index (call $fungi_checked_add_i32 (local.get $index) (i32.const 1)))
        (br $while_loop_3)
      )
    )
    (local.get $out)
  )
  (export "readEgressLedger" (func $readEgressLedger))

)