(module
  ;; effect: stdlib.array
  (import "host" "__array_create" (func $host___array_create (result i32)))
  ;; effect: stdlib.array
  (import "host" "__array_append" (func $host___array_append (param $p0 i32) (param $p1 i32) (result i32)))
  ;; effect: stdlib.string
  (import "host" "__str_concat" (func $host___str_concat (param $p0 i32) (param $p1 i32) (result i32)))
  ;; effect: stdlib.string
  (import "host" "__str_length" (func $host___str_length (param $p0 i32) (result i32)))
  ;; effect: stdlib.string
  (import "host" "__str_char_at" (func $host___str_char_at (param $p0 i32) (param $p1 i32) (result i32)))
  ;; effect: stdlib.string
  (import "host" "__str_char_at_option_v2" (func $host___str_char_at_option_v2 (param $p0 i32) (param $p1 i32) (result i32)))
  ;; effect: stdlib.string
  (import "host" "__int_to_str" (func $host___int_to_str (param $p0 i32) (result i32)))
  ;; effect: stdlib.string
  (import "host" "__str_eq" (func $host___str_eq (param $p0 i32) (param $p1 i32) (result i32)))
  ;; effect: stdlib.string
  (import "host" "__str_trim" (func $host___str_trim (param $p0 i32) (result i32)))
  ;; effect: stdlib.char
  (import "host" "__char_is_whitespace" (func $host___char_is_whitespace (param $p0 i32) (result i32)))
  ;; effect: stdlib.char
  (import "host" "__char_from_code" (func $host___char_from_code (param $p0 i32) (result i32)))
  ;; effect: stdlib.result
  (import "host" "__option_is_none_v2" (func $host___option_is_none_v2 (param $p0 i32) (result i32)))
  ;; effect: stdlib.result
  (import "host" "__option_value_v2" (func $host___option_value_v2 (param $p0 i32) (result i32)))

  (memory 2 2048)
  (export "memory" (memory 0))

  ;; P9.4b: bump-allocator heap pointer for record struct layout
  (global $__fungi_heap (mut i32) (i32.const 1024))

  ;; strict-trapping checked helper — signed overflow / non-finite float traps (unreachable)
  (func $fungi_checked_add_i32 (param $a i32) (param $b i32) (result i32)
    (local $r i32)
    (local.set $r (i32.add (local.get $a) (local.get $b)))
    ;; signed overflow iff (a^r) & (b^r) < 0
    (if (i32.lt_s (i32.and (i32.xor (local.get $a) (local.get $r)) (i32.xor (local.get $b) (local.get $r))) (i32.const 0)) (then unreachable))
    (local.get $r))

  ;; pure flow: hasInlineCredentialUri
  (func $hasInlineCredentialUri (param $p0 i32) (result i32)
    (local $length i32)
    (local $marker i32)
    (local $__while_fuel_0 i32)
    (local $firstOpt i32)
    (local $secondOpt i32)
    (local $thirdOpt i32)
    (local $markerFound i32)
    (local $__fungi_match_1 i32)
    (local $__fungi_match_2 i32)
    (local $__fungi_match_3 i32)
    (local $__fungi_match_4 i32)
    (local $__fungi_match_5 i32)
    (local $__fungi_match_6 i32)
    (local $userPos i32)
    (local $userLength i32)
    (local $stopped i32)
    (local $__while_fuel_7 i32)
    (local $userCharOpt i32)
    (local $__fungi_match_8 i32)
    (local $__fungi_match_9 i32)
    (local $partPos i32)
    (local $partLength i32)
    (local $partStopped i32)
    (local $__while_fuel_10 i32)
    (local $partCharOpt i32)
    (local $__fungi_match_11 i32)
    (local $__fungi_match_12 i32)
    (local $atOpt i32)
    (local $__fungi_match_13 i32)
    (local $__fungi_match_14 i32)
    (local.set $length (call $host___str_length (local.get $p0)))
    (local.set $marker (i32.const 0))
    (block $while_exit_0
      (loop $while_loop_0
        (br_if $while_exit_0 (i32.gt_s (call $fungi_checked_add_i32 (local.get $marker) (i32.const 3)) (local.get $length)))
        (local.set $__while_fuel_0 (i32.add (local.get $__while_fuel_0) (i32.const 1)))
        (if (i32.gt_u (local.get $__while_fuel_0) (i32.const 100000)) (then unreachable))
        (local.set $firstOpt (call $host___str_char_at_option_v2 (local.get $p0) (local.get $marker)))
        (local.set $secondOpt (call $host___str_char_at_option_v2 (local.get $p0) (call $fungi_checked_add_i32 (local.get $marker) (i32.const 1))))
        (local.set $thirdOpt (call $host___str_char_at_option_v2 (local.get $p0) (call $fungi_checked_add_i32 (local.get $marker) (i32.const 2))))
        (local.set $markerFound (i32.const 0))
        (local.set $__fungi_match_1 (local.get $firstOpt))
        (if (call $host___option_is_none_v2 (local.get $__fungi_match_1))
          (then
          )
          (else
            (local.set $__fungi_match_2 (call $host___option_value_v2 (local.get $__fungi_match_1)))
            (local.set $__fungi_match_3 (local.get $secondOpt))
            (if (call $host___option_is_none_v2 (local.get $__fungi_match_3))
              (then
              )
              (else
                (local.set $__fungi_match_4 (call $host___option_value_v2 (local.get $__fungi_match_3)))
                (local.set $__fungi_match_5 (local.get $thirdOpt))
                (if (call $host___option_is_none_v2 (local.get $__fungi_match_5))
                  (then
                  )
                  (else
                    (local.set $__fungi_match_6 (call $host___option_value_v2 (local.get $__fungi_match_5)))
                    (if (i32.and (i32.and (i32.eq (local.get $__fungi_match_2) (call $host___char_from_code (i32.const 58))) (i32.eq (local.get $__fungi_match_4) (call $host___char_from_code (i32.const 47)))) (i32.eq (local.get $__fungi_match_6) (call $host___char_from_code (i32.const 47))))
                      (then
                        (local.set $markerFound (i32.const 1))
                      )
                    )
                  )
                )
              )
            )
          )
        )
        (if (i32.eq (local.get $markerFound) (i32.const 1))
          (then
            (local.set $userPos (call $fungi_checked_add_i32 (local.get $marker) (i32.const 3)))
            (local.set $userLength (i32.const 0))
            (local.set $stopped (i32.const 0))
            (block $while_exit_7
              (loop $while_loop_7
                (br_if $while_exit_7 (i32.eqz (i32.and (i32.lt_s (local.get $userPos) (local.get $length)) (i32.eq (local.get $stopped) (i32.const 0)))))
                (local.set $__while_fuel_7 (i32.add (local.get $__while_fuel_7) (i32.const 1)))
                (if (i32.gt_u (local.get $__while_fuel_7) (i32.const 100000)) (then unreachable))
                (local.set $userCharOpt (call $host___str_char_at_option_v2 (local.get $p0) (local.get $userPos)))
                (local.set $__fungi_match_8 (local.get $userCharOpt))
                (if (call $host___option_is_none_v2 (local.get $__fungi_match_8))
                  (then
                    (local.set $stopped (i32.const 1))
                  )
                  (else
                    (local.set $__fungi_match_9 (call $host___option_value_v2 (local.get $__fungi_match_8)))
                    (if (i32.or (i32.or (i32.eq (local.get $__fungi_match_9) (call $host___char_from_code (i32.const 47))) (i32.eq (local.get $__fungi_match_9) (call $host___char_from_code (i32.const 64)))) (call $host___char_is_whitespace (local.get $__fungi_match_9)))
                      (then
                        (local.set $stopped (i32.const 1))
                      )
                    )
                    (if (i32.eq (local.get $stopped) (i32.const 0))
                      (then
                        (if (i32.and (i32.eq (local.get $__fungi_match_9) (call $host___char_from_code (i32.const 58))) (i32.gt_s (local.get $userLength) (i32.const 0)))
                          (then
                            (local.set $partPos (call $fungi_checked_add_i32 (local.get $userPos) (i32.const 1)))
                            (local.set $partLength (i32.const 0))
                            (local.set $partStopped (i32.const 0))
                            (block $while_exit_10
                              (loop $while_loop_10
                                (br_if $while_exit_10 (i32.eqz (i32.and (i32.lt_s (local.get $partPos) (local.get $length)) (i32.eq (local.get $partStopped) (i32.const 0)))))
                                (local.set $__while_fuel_10 (i32.add (local.get $__while_fuel_10) (i32.const 1)))
                                (if (i32.gt_u (local.get $__while_fuel_10) (i32.const 100000)) (then unreachable))
                                (local.set $partCharOpt (call $host___str_char_at_option_v2 (local.get $p0) (local.get $partPos)))
                                (local.set $__fungi_match_11 (local.get $partCharOpt))
                                (if (call $host___option_is_none_v2 (local.get $__fungi_match_11))
                                  (then
                                    (local.set $partStopped (i32.const 1))
                                  )
                                  (else
                                    (local.set $__fungi_match_12 (call $host___option_value_v2 (local.get $__fungi_match_11)))
                                    (if (i32.or (i32.eq (local.get $__fungi_match_12) (call $host___char_from_code (i32.const 64))) (call $host___char_is_whitespace (local.get $__fungi_match_12)))
                                      (then
                                        (local.set $partStopped (i32.const 1))
                                      )
                                    )
                                    (if (i32.eq (local.get $partStopped) (i32.const 0))
                                      (then
                                        (local.set $partLength (call $fungi_checked_add_i32 (local.get $partLength) (i32.const 1)))
                                        (local.set $partPos (call $fungi_checked_add_i32 (local.get $partPos) (i32.const 1)))
                                      )
                                    )
                                  )
                                )
                                (br $while_loop_10)
                              )
                            )
                            (if (i32.and (i32.gt_s (local.get $partLength) (i32.const 0)) (i32.lt_s (local.get $partPos) (local.get $length)))
                              (then
                                (local.set $atOpt (call $host___str_char_at_option_v2 (local.get $p0) (local.get $partPos)))
                                (local.set $__fungi_match_13 (local.get $atOpt))
                                (if (call $host___option_is_none_v2 (local.get $__fungi_match_13))
                                  (then
                                  )
                                  (else
                                    (local.set $__fungi_match_14 (call $host___option_value_v2 (local.get $__fungi_match_13)))
                                    (if (i32.eq (local.get $__fungi_match_14) (call $host___char_from_code (i32.const 64)))
                                      (then
                                        (return (i32.const 1))
                                      )
                                    )
                                  )
                                )
                              )
                            )
                          )
                        )
                        (local.set $userLength (call $fungi_checked_add_i32 (local.get $userLength) (i32.const 1)))
                        (local.set $userPos (call $fungi_checked_add_i32 (local.get $userPos) (i32.const 1)))
                      )
                    )
                  )
                )
                (br $while_loop_7)
              )
            )
          )
        )
        (local.set $marker (call $fungi_checked_add_i32 (local.get $marker) (i32.const 1)))
        (br $while_loop_0)
      )
    )
    (i32.const 0)
  )
  (export "hasInlineCredentialUri" (func $hasInlineCredentialUri))

  ;; pure flow: validatePostgresCredentialRef
  (func $validatePostgresCredentialRef (param $p0 i32) (param $p1 i32) (result i32)
    (local $diagnostics i32)
    (local $__fungi_rec_0 i32)
    (local $__fungi_rec_1 i32)
    (local $__fungi_rec_2 i32)
    (local.set $diagnostics (call $host___array_create))
    (if (i32.eqz (call $host___str_eq (i32.load (i32.add (local.get $p0) (i32.const 0))) (i32.const 1)))
      (then
        (local.set $diagnostics (call $host___array_append (local.get $diagnostics) (block (result i32)
      (local.set $__fungi_rec_0 (global.get $__fungi_heap))
      (global.set $__fungi_heap (i32.add (global.get $__fungi_heap) (i32.const 16)))
      (i32.store (i32.add (local.get $__fungi_rec_0) (i32.const 0)) (i32.const 2)) ;; .code
      (i32.store (i32.add (local.get $__fungi_rec_0) (i32.const 4)) (i32.const 3)) ;; .severity
      (i32.store (i32.add (local.get $__fungi_rec_0) (i32.const 8)) (call $host___str_concat (call $host___str_concat (call $host___str_concat (call $host___str_concat (call $host___str_concat (call $host___str_concat (call $host___str_concat (call $host___str_concat (i32.const 4) (call $host___int_to_str (call $host___char_from_code (i32.const 34)))) (i32.load (i32.add (local.get $p0) (i32.const 0)))) (call $host___int_to_str (call $host___char_from_code (i32.const 34)))) (i32.const 5)) (call $host___int_to_str (call $host___char_from_code (i32.const 34)))) (i32.const 1)) (call $host___int_to_str (call $host___char_from_code (i32.const 34)))) (i32.const 6))) ;; .message
      (i32.store (i32.add (local.get $__fungi_rec_0) (i32.const 12)) (call $host___str_concat (local.get $p1) (i32.const 7))) ;; .path
      (local.get $__fungi_rec_0)
    )))
      )
    )
    (if (i32.eq (call $host___str_length (call $host___str_trim (i32.load (i32.add (local.get $p0) (i32.const 4))))) (i32.const 0))
      (then
        (local.set $diagnostics (call $host___array_append (local.get $diagnostics) (block (result i32)
      (local.set $__fungi_rec_1 (global.get $__fungi_heap))
      (global.set $__fungi_heap (i32.add (global.get $__fungi_heap) (i32.const 16)))
      (i32.store (i32.add (local.get $__fungi_rec_1) (i32.const 0)) (i32.const 8)) ;; .code
      (i32.store (i32.add (local.get $__fungi_rec_1) (i32.const 4)) (i32.const 3)) ;; .severity
      (i32.store (i32.add (local.get $__fungi_rec_1) (i32.const 8)) (i32.const 9)) ;; .message
      (i32.store (i32.add (local.get $__fungi_rec_1) (i32.const 12)) (call $host___str_concat (local.get $p1) (i32.const 10))) ;; .path
      (local.get $__fungi_rec_1)
    )))
      )
    )
    (if (i32.and (i32.gt_s (call $host___str_length (call $host___str_trim (i32.load (i32.add (local.get $p0) (i32.const 4))))) (i32.const 0)) (call $hasInlineCredentialUri (i32.load (i32.add (local.get $p0) (i32.const 4)))))
      (then
        (local.set $diagnostics (call $host___array_append (local.get $diagnostics) (block (result i32)
      (local.set $__fungi_rec_2 (global.get $__fungi_heap))
      (global.set $__fungi_heap (i32.add (global.get $__fungi_heap) (i32.const 16)))
      (i32.store (i32.add (local.get $__fungi_rec_2) (i32.const 0)) (i32.const 11)) ;; .code
      (i32.store (i32.add (local.get $__fungi_rec_2) (i32.const 4)) (i32.const 3)) ;; .severity
      (i32.store (i32.add (local.get $__fungi_rec_2) (i32.const 8)) (i32.const 12)) ;; .message
      (i32.store (i32.add (local.get $__fungi_rec_2) (i32.const 12)) (call $host___str_concat (local.get $p1) (i32.const 10))) ;; .path
      (local.get $__fungi_rec_2)
    )))
      )
    )
    (local.get $diagnostics)
  )
  (export "validatePostgresCredentialRef" (func $validatePostgresCredentialRef))

  ;; pure flow: validatePostgresCredentialRefDefault
  (func $validatePostgresCredentialRefDefault (param $p0 i32) (result i32)
    ;; B2 (R&D 0055): per-flow arena reset — reclaim the previous invocation's heap (leaf entry-point)
    (global.set $__fungi_heap (i32.const 1024))
    (call $validatePostgresCredentialRef (local.get $p0) (i32.const 13))
  )
  (export "validatePostgresCredentialRefDefault" (func $validatePostgresCredentialRefDefault))

)