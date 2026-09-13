(module
  ;; effect: stdlib.string
  (import "host" "__str_concat" (func $host___str_concat (param $p0 i32) (param $p1 i32) (result i32)))
  ;; effect: stdlib.string
  (import "host" "__str_length" (func $host___str_length (param $p0 i32) (result i32)))
  ;; effect: stdlib.string
  (import "host" "__str_char_at" (func $host___str_char_at (param $p0 i32) (param $p1 i32) (result i32)))
  ;; effect: stdlib.string
  (import "host" "__str_char_at_option_v2" (func $host___str_char_at_option_v2 (param $p0 i32) (param $p1 i32) (result i32)))
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

  ;; strict-trapping checked helper — signed overflow / non-finite float traps (unreachable)
  (func $fungi_checked_sub_i32 (param $a i32) (param $b i32) (result i32)
    (local $r i32)
    (local.set $r (i32.sub (local.get $a) (local.get $b)))
    ;; signed overflow iff (a^b) & (a^r) < 0
    (if (i32.lt_s (i32.and (i32.xor (local.get $a) (local.get $b)) (i32.xor (local.get $a) (local.get $r))) (i32.const 0)) (then unreachable))
    (local.get $r))

  ;; pure flow: charCodeAt
  (func $charCodeAt (param $p0 i32) (param $p1 i32) (result i32)
    (local $characterOpt i32)
    (local $__fungi_match_0 i32)
    (local $__fungi_match_1 i32)
    (local.set $characterOpt (call $host___str_char_at_option_v2 (local.get $p0) (local.get $p1)))
    (local.set $__fungi_match_0 (local.get $characterOpt))
    (if (call $host___option_is_none_v2 (local.get $__fungi_match_0))
      (then
        (return (i32.const -1))
      )
      (else
        (local.set $__fungi_match_1 (call $host___option_value_v2 (local.get $__fungi_match_0)))
        (return (local.get $__fungi_match_1))
      )
    )
    (unreachable) ;; #160: all match/while arms return — implicit [i32] tail
  )
  (export "charCodeAt" (func $charCodeAt))

  ;; pure flow: isSchemaNameCharacter
  (func $isSchemaNameCharacter (param $p0 i32) (result i32)
    (if (i32.and (i32.ge_s (local.get $p0) (i32.const 48)) (i32.le_s (local.get $p0) (i32.const 57)))
      (then
        (return (i32.const 1))
      )
    )
    (if (i32.and (i32.ge_s (local.get $p0) (i32.const 65)) (i32.le_s (local.get $p0) (i32.const 90)))
      (then
        (return (i32.const 1))
      )
    )
    (if (i32.and (i32.ge_s (local.get $p0) (i32.const 97)) (i32.le_s (local.get $p0) (i32.const 122)))
      (then
        (return (i32.const 1))
      )
    )
    (if (i32.or (i32.or (i32.eq (local.get $p0) (i32.const 46)) (i32.eq (local.get $p0) (i32.const 95))) (i32.eq (local.get $p0) (i32.const 45)))
      (then
        (return (i32.const 1))
      )
    )
    (i32.const 0)
  )
  (export "isSchemaNameCharacter" (func $isSchemaNameCharacter))

  ;; pure flow: sanitizeSchemaName
  (func $sanitizeSchemaName (param $p0 i32) (result i32)
    (local $cleaned i32)
    (local $index i32)
    (local $inInvalidRun i32)
    (local $__while_fuel_0 i32)
    (local $characterOpt i32)
    (local $__fungi_match_1 i32)
    (local $__fungi_match_2 i32)
    (local $first i32)
    (local $__while_fuel_3 i32)
    (local $last i32)
    (local $__while_fuel_4 i32)
    (local $result i32)
    (local $resultIndex i32)
    (local $__while_fuel_5 i32)
    (local $__fungi_match_6 i32)
    (local $__fungi_match_7 i32)
    (local.set $cleaned (i32.const 0))
    (local.set $index (i32.const 0))
    (local.set $inInvalidRun (i32.const 0))
    (block $while_exit_0
      (loop $while_loop_0
        (br_if $while_exit_0 (i32.ge_s (local.get $index) (call $host___str_length (local.get $p0))))
        (local.set $__while_fuel_0 (i32.add (local.get $__while_fuel_0) (i32.const 1)))
        (if (i32.gt_u (local.get $__while_fuel_0) (i32.const 100000)) (then unreachable))
        (local.set $characterOpt (call $host___str_char_at_option_v2 (local.get $p0) (local.get $index)))
        (local.set $__fungi_match_1 (local.get $characterOpt))
        (if (call $host___option_is_none_v2 (local.get $__fungi_match_1))
          (then
          )
          (else
            (local.set $__fungi_match_2 (call $host___option_value_v2 (local.get $__fungi_match_1)))
            (if (call $isSchemaNameCharacter (local.get $__fungi_match_2))
              (then
                (local.set $cleaned (call $host___str_concat (local.get $cleaned) (call $host___char_to_string (local.get $__fungi_match_2))))
                (local.set $inInvalidRun (i32.const 0))
              )
              (else
                (if (i32.eq (local.get $inInvalidRun) (i32.const 0))
                  (then
                    (local.set $cleaned (call $host___str_concat (local.get $cleaned) (i32.const 1)))
                    (local.set $inInvalidRun (i32.const 1))
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
    (local.set $first (i32.const 0))
    (block $while_exit_3
      (loop $while_loop_3
        (br_if $while_exit_3 (i32.eqz (i32.and (i32.lt_s (local.get $first) (call $host___str_length (local.get $cleaned))) (i32.eq (call $charCodeAt (local.get $cleaned) (local.get $first)) (i32.const 95)))))
        (local.set $__while_fuel_3 (i32.add (local.get $__while_fuel_3) (i32.const 1)))
        (if (i32.gt_u (local.get $__while_fuel_3) (i32.const 100000)) (then unreachable))
        (local.set $first (call $fungi_checked_add_i32 (local.get $first) (i32.const 1)))
        (br $while_loop_3)
      )
    )
    (local.set $last (call $fungi_checked_sub_i32 (call $host___str_length (local.get $cleaned)) (i32.const 1)))
    (block $while_exit_4
      (loop $while_loop_4
        (br_if $while_exit_4 (i32.eqz (i32.and (i32.ge_s (local.get $last) (i32.const 0)) (i32.eq (call $charCodeAt (local.get $cleaned) (local.get $last)) (i32.const 95)))))
        (local.set $__while_fuel_4 (i32.add (local.get $__while_fuel_4) (i32.const 1)))
        (if (i32.gt_u (local.get $__while_fuel_4) (i32.const 100000)) (then unreachable))
        (local.set $last (call $fungi_checked_sub_i32 (local.get $last) (i32.const 1)))
        (br $while_loop_4)
      )
    )
    (if (i32.gt_s (local.get $first) (local.get $last))
      (then
        (return (i32.const 2))
      )
    )
    (local.set $result (i32.const 0))
    (local.set $resultIndex (local.get $first))
    (block $while_exit_5
      (loop $while_loop_5
        (br_if $while_exit_5 (i32.gt_s (local.get $resultIndex) (local.get $last)))
        (local.set $__while_fuel_5 (i32.add (local.get $__while_fuel_5) (i32.const 1)))
        (if (i32.gt_u (local.get $__while_fuel_5) (i32.const 100000)) (then unreachable))
        (local.set $characterOpt (call $host___str_char_at_option_v2 (local.get $cleaned) (local.get $resultIndex)))
        (local.set $__fungi_match_6 (local.get $characterOpt))
        (if (call $host___option_is_none_v2 (local.get $__fungi_match_6))
          (then
          )
          (else
            (local.set $__fungi_match_7 (call $host___option_value_v2 (local.get $__fungi_match_6)))
            (local.set $result (call $host___str_concat (local.get $result) (call $host___char_to_string (local.get $__fungi_match_7))))
          )
        )
        (local.set $resultIndex (call $fungi_checked_add_i32 (local.get $resultIndex) (i32.const 1)))
        (br $while_loop_5)
      )
    )
    (local.get $result)
  )
  (export "sanitizeSchemaName" (func $sanitizeSchemaName))

)