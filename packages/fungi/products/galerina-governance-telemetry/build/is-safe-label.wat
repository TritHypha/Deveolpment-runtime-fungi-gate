(module
  ;; effect: stdlib.string
  (import "host" "__str_length" (func $host___str_length (param $p0 i32) (result i32)))
  ;; effect: stdlib.string
  (import "host" "__str_char_at" (func $host___str_char_at (param $p0 i32) (param $p1 i32) (result i32)))
  ;; effect: stdlib.string
  (import "host" "__str_char_at_option_v2" (func $host___str_char_at_option_v2 (param $p0 i32) (param $p1 i32) (result i32)))
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

  ;; pure flow: isSafeLabelCharacter
  (func $isSafeLabelCharacter (param $p0 i32) (result i32)
    (local $codePoint i32)
    (local.set $codePoint (local.get $p0))
    (if (i32.and (i32.ge_s (local.get $codePoint) (i32.const 48)) (i32.le_s (local.get $codePoint) (i32.const 57)))
      (then
        (return (i32.const 1))
      )
    )
    (if (i32.and (i32.ge_s (local.get $codePoint) (i32.const 65)) (i32.le_s (local.get $codePoint) (i32.const 90)))
      (then
        (return (i32.const 1))
      )
    )
    (if (i32.and (i32.ge_s (local.get $codePoint) (i32.const 97)) (i32.le_s (local.get $codePoint) (i32.const 122)))
      (then
        (return (i32.const 1))
      )
    )
    (if (i32.or (i32.or (i32.or (i32.eq (local.get $codePoint) (i32.const 95)) (i32.eq (local.get $codePoint) (i32.const 46))) (i32.eq (local.get $codePoint) (i32.const 58))) (i32.eq (local.get $codePoint) (i32.const 45)))
      (then
        (return (i32.const 1))
      )
    )
    (i32.const 0)
  )
  (export "isSafeLabelCharacter" (func $isSafeLabelCharacter))

  ;; pure flow: isSafeLabel
  (func $isSafeLabel (param $p0 i32) (result i32)
    (local $length i32)
    (local $index i32)
    (local $__while_fuel_0 i32)
    (local $characterOpt i32)
    (local $__fungi_match_1 i32)
    (local $__fungi_match_2 i32)
    (local.set $length (call $host___str_length (local.get $p0)))
    (if (i32.or (i32.lt_s (local.get $length) (i32.const 1)) (i32.gt_s (local.get $length) (i32.const 80)))
      (then
        (return (i32.const 0))
      )
    )
    (local.set $index (i32.const 0))
    (block $while_exit_0
      (loop $while_loop_0
        (br_if $while_exit_0 (i32.ge_s (local.get $index) (local.get $length)))
        (local.set $__while_fuel_0 (i32.add (local.get $__while_fuel_0) (i32.const 1)))
        (if (i32.gt_u (local.get $__while_fuel_0) (i32.const 100000)) (then unreachable))
        (local.set $characterOpt (call $host___str_char_at_option_v2 (local.get $p0) (local.get $index)))
        (local.set $__fungi_match_1 (local.get $characterOpt))
        (if (call $host___option_is_none_v2 (local.get $__fungi_match_1))
          (then
            (return (i32.const 0))
          )
          (else
            (local.set $__fungi_match_2 (call $host___option_value_v2 (local.get $__fungi_match_1)))
            (if (i32.eq (call $isSafeLabelCharacter (local.get $__fungi_match_2)) (i32.const 0))
              (then
                (return (i32.const 0))
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
  (export "isSafeLabel" (func $isSafeLabel))

)