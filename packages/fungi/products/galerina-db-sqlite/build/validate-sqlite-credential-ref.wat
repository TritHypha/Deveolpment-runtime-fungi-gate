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
  ;; effect: stdlib.string
  (import "host" "__str_slice" (func $host___str_slice (param $p0 i32) (param $p1 i32) (param $p2 i32) (result i32)))
  ;; effect: stdlib.char
  (import "host" "__char_to_string" (func $host___char_to_string (param $p0 i32) (result i32)))
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

  ;; pure flow: isCredentialWhitespace
  (func $isCredentialWhitespace (param $p0 i32) (result i32)
    (local $codePoint i32)
    (local.set $codePoint (local.get $p0))
    (if (i32.or (i32.or (i32.or (i32.or (i32.eq (local.get $codePoint) (i32.const 9)) (i32.eq (local.get $codePoint) (i32.const 10))) (i32.eq (local.get $codePoint) (i32.const 11))) (i32.eq (local.get $codePoint) (i32.const 12))) (i32.eq (local.get $codePoint) (i32.const 13)))
      (then
        (return (i32.const 1))
      )
    )
    (if (i32.or (i32.or (i32.eq (local.get $codePoint) (i32.const 32)) (i32.eq (local.get $codePoint) (i32.const 160))) (i32.eq (local.get $codePoint) (i32.const 5760)))
      (then
        (return (i32.const 1))
      )
    )
    (if (i32.and (i32.ge_s (local.get $codePoint) (i32.const 8192)) (i32.le_s (local.get $codePoint) (i32.const 8202)))
      (then
        (return (i32.const 1))
      )
    )
    (if (i32.or (i32.or (i32.or (i32.or (i32.eq (local.get $codePoint) (i32.const 8232)) (i32.eq (local.get $codePoint) (i32.const 8233))) (i32.eq (local.get $codePoint) (i32.const 8239))) (i32.eq (local.get $codePoint) (i32.const 8287))) (i32.eq (local.get $codePoint) (i32.const 65279)))
      (then
        (return (i32.const 1))
      )
    )
    (if (i32.eq (local.get $codePoint) (i32.const 12288))
      (then
        (return (i32.const 1))
      )
    )
    (i32.const 0)
  )
  (export "isCredentialWhitespace" (func $isCredentialWhitespace))

  ;; pure flow: hasInlineCredentialString
  (func $hasInlineCredentialString (param $p0 i32) (result i32)
    (local $markerIndex i32)
    (local $found i32)
    (local $__while_fuel_0 i32)
    (local $usernameIndex i32)
    (local $__while_fuel_1 i32)
    (local $usernameOpt i32)
    (local $__fungi_match_2 i32)
    (local $__fungi_match_3 i32)
    (local $usernameText i32)
    (local $payloadIndex i32)
    (local $payloadHasChar i32)
    (local $payloadClosed i32)
    (local $__while_fuel_4 i32)
    (local $payloadOpt i32)
    (local $__fungi_match_5 i32)
    (local $__fungi_match_6 i32)
    (local $payloadText i32)
    (local.set $markerIndex (i32.const 0))
    (local.set $found (i32.const 0))
    (block $while_exit_0
      (loop $while_loop_0
        (br_if $while_exit_0 (i32.eqz (i32.and (i32.lt_s (call $fungi_checked_add_i32 (local.get $markerIndex) (i32.const 2)) (call $host___str_length (local.get $p0))) (i32.eq (local.get $found) (i32.const 0)))))
        (local.set $__while_fuel_0 (i32.add (local.get $__while_fuel_0) (i32.const 1)))
        (if (i32.gt_u (local.get $__while_fuel_0) (i32.const 100000)) (then unreachable))
        (if (call $host___str_eq (call $host___str_slice (local.get $p0) (local.get $markerIndex) (call $fungi_checked_add_i32 (local.get $markerIndex) (i32.const 3))) (i32.const 1))
          (then
            (local.set $usernameIndex (call $fungi_checked_add_i32 (local.get $markerIndex) (i32.const 3)))
            (block $while_exit_1
              (loop $while_loop_1
                (br_if $while_exit_1 (i32.eqz (i32.and (i32.lt_s (local.get $usernameIndex) (call $host___str_length (local.get $p0))) (i32.eq (local.get $found) (i32.const 0)))))
                (local.set $__while_fuel_1 (i32.add (local.get $__while_fuel_1) (i32.const 1)))
                (if (i32.gt_u (local.get $__while_fuel_1) (i32.const 100000)) (then unreachable))
                (local.set $usernameOpt (call $host___str_char_at_option_v2 (local.get $p0) (local.get $usernameIndex)))
                (local.set $__fungi_match_2 (local.get $usernameOpt))
                (if (call $host___option_is_none_v2 (local.get $__fungi_match_2))
                  (then
                    (local.set $usernameIndex (call $host___str_length (local.get $p0)))
                  )
                  (else
                    (local.set $__fungi_match_3 (call $host___option_value_v2 (local.get $__fungi_match_2)))
                    (local.set $usernameText (call $host___char_to_string (local.get $__fungi_match_3)))
                    (if (i32.or (i32.or (call $isCredentialWhitespace (local.get $__fungi_match_3)) (call $host___str_eq (local.get $usernameText) (i32.const 2))) (call $host___str_eq (local.get $usernameText) (i32.const 3)))
                      (then
                        (local.set $usernameIndex (call $host___str_length (local.get $p0)))
                      )
                    )
                    (if (i32.and (i32.and (i32.lt_s (local.get $usernameIndex) (call $host___str_length (local.get $p0))) (i32.gt_s (local.get $usernameIndex) (call $fungi_checked_add_i32 (local.get $markerIndex) (i32.const 3)))) (call $host___str_eq (local.get $usernameText) (i32.const 4)))
                      (then
                        (local.set $payloadIndex (call $fungi_checked_add_i32 (local.get $usernameIndex) (i32.const 1)))
                        (local.set $payloadHasChar (i32.const 0))
                        (local.set $payloadClosed (i32.const 0))
                        (block $while_exit_4
                          (loop $while_loop_4
                            (br_if $while_exit_4 (i32.eqz (i32.and (i32.and (i32.lt_s (local.get $payloadIndex) (call $host___str_length (local.get $p0))) (i32.eq (local.get $found) (i32.const 0))) (i32.eq (local.get $payloadClosed) (i32.const 0)))))
                            (local.set $__while_fuel_4 (i32.add (local.get $__while_fuel_4) (i32.const 1)))
                            (if (i32.gt_u (local.get $__while_fuel_4) (i32.const 100000)) (then unreachable))
                            (local.set $payloadOpt (call $host___str_char_at_option_v2 (local.get $p0) (local.get $payloadIndex)))
                            (local.set $__fungi_match_5 (local.get $payloadOpt))
                            (if (call $host___option_is_none_v2 (local.get $__fungi_match_5))
                              (then
                                (local.set $payloadClosed (i32.const 1))
                              )
                              (else
                                (local.set $__fungi_match_6 (call $host___option_value_v2 (local.get $__fungi_match_5)))
                                (local.set $payloadText (call $host___char_to_string (local.get $__fungi_match_6)))
                                (if (call $host___str_eq (local.get $payloadText) (i32.const 3))
                                  (then
                                    (if (i32.eq (local.get $payloadHasChar) (i32.const 1))
                                      (then
                                        (local.set $found (i32.const 1))
                                      )
                                    )
                                    (local.set $payloadClosed (i32.const 1))
                                  )
                                )
                                (if (i32.and (i32.eqz (call $host___str_eq (local.get $payloadText) (i32.const 3))) (call $isCredentialWhitespace (local.get $__fungi_match_6)))
                                  (then
                                    (local.set $payloadClosed (i32.const 1))
                                  )
                                )
                                (if (i32.and (i32.eqz (call $host___str_eq (local.get $payloadText) (i32.const 3))) (i32.eq (call $isCredentialWhitespace (local.get $__fungi_match_6)) (i32.const 0)))
                                  (then
                                    (local.set $payloadHasChar (i32.const 1))
                                  )
                                )
                              )
                            )
                            (local.set $payloadIndex (call $fungi_checked_add_i32 (local.get $payloadIndex) (i32.const 1)))
                            (br $while_loop_4)
                          )
                        )
                      )
                    )
                  )
                )
                (local.set $usernameIndex (call $fungi_checked_add_i32 (local.get $usernameIndex) (i32.const 1)))
                (br $while_loop_1)
              )
            )
          )
        )
        (local.set $markerIndex (call $fungi_checked_add_i32 (local.get $markerIndex) (i32.const 1)))
        (br $while_loop_0)
      )
    )
    (local.get $found)
  )
  (export "hasInlineCredentialString" (func $hasInlineCredentialString))

  ;; pure flow: validateSqliteCredentialRefAtPath
  (func $validateSqliteCredentialRefAtPath (param $p0 i32) (param $p1 i32) (result i32)
    (local $diagnostics i32)
    (local $__fungi_rec_0 i32)
    (local $__fungi_rec_1 i32)
    (local $__fungi_rec_2 i32)
    (local.set $diagnostics (call $host___array_create))
    (if (i32.eqz (call $host___str_eq (i32.load (i32.add (local.get $p0) (i32.const 0))) (i32.const 5)))
      (then
        (local.set $diagnostics (call $host___array_append (local.get $diagnostics) (block (result i32)
      (local.set $__fungi_rec_0 (global.get $__fungi_heap))
      (global.set $__fungi_heap (i32.add (global.get $__fungi_heap) (i32.const 16)))
      (i32.store (i32.add (local.get $__fungi_rec_0) (i32.const 0)) (i32.const 6)) ;; .code
      (i32.store (i32.add (local.get $__fungi_rec_0) (i32.const 4)) (i32.const 7)) ;; .severity
      (i32.store (i32.add (local.get $__fungi_rec_0) (i32.const 8)) (call $host___str_concat (call $host___str_concat (call $host___str_concat (call $host___str_concat (call $host___str_concat (call $host___str_concat (call $host___str_concat (call $host___str_concat (i32.const 8) (call $host___int_to_str (call $host___char_from_code (i32.const 34)))) (i32.load (i32.add (local.get $p0) (i32.const 0)))) (call $host___int_to_str (call $host___char_from_code (i32.const 34)))) (i32.const 9)) (call $host___int_to_str (call $host___char_from_code (i32.const 34)))) (i32.const 5)) (call $host___int_to_str (call $host___char_from_code (i32.const 34)))) (i32.const 10))) ;; .message
      (i32.store (i32.add (local.get $__fungi_rec_0) (i32.const 12)) (call $host___str_concat (local.get $p1) (i32.const 11))) ;; .path
      (local.get $__fungi_rec_0)
    )))
      )
    )
    (if (i32.eq (call $host___str_length (call $host___str_trim (i32.load (i32.add (local.get $p0) (i32.const 4))))) (i32.const 0))
      (then
        (local.set $diagnostics (call $host___array_append (local.get $diagnostics) (block (result i32)
      (local.set $__fungi_rec_1 (global.get $__fungi_heap))
      (global.set $__fungi_heap (i32.add (global.get $__fungi_heap) (i32.const 16)))
      (i32.store (i32.add (local.get $__fungi_rec_1) (i32.const 0)) (i32.const 12)) ;; .code
      (i32.store (i32.add (local.get $__fungi_rec_1) (i32.const 4)) (i32.const 7)) ;; .severity
      (i32.store (i32.add (local.get $__fungi_rec_1) (i32.const 8)) (i32.const 13)) ;; .message
      (i32.store (i32.add (local.get $__fungi_rec_1) (i32.const 12)) (call $host___str_concat (local.get $p1) (i32.const 14))) ;; .path
      (local.get $__fungi_rec_1)
    )))
      )
    )
    (if (i32.and (i32.ne (call $host___str_length (call $host___str_trim (i32.load (i32.add (local.get $p0) (i32.const 4))))) (i32.const 0)) (call $hasInlineCredentialString (i32.load (i32.add (local.get $p0) (i32.const 4)))))
      (then
        (local.set $diagnostics (call $host___array_append (local.get $diagnostics) (block (result i32)
      (local.set $__fungi_rec_2 (global.get $__fungi_heap))
      (global.set $__fungi_heap (i32.add (global.get $__fungi_heap) (i32.const 16)))
      (i32.store (i32.add (local.get $__fungi_rec_2) (i32.const 0)) (i32.const 15)) ;; .code
      (i32.store (i32.add (local.get $__fungi_rec_2) (i32.const 4)) (i32.const 7)) ;; .severity
      (i32.store (i32.add (local.get $__fungi_rec_2) (i32.const 8)) (i32.const 16)) ;; .message
      (i32.store (i32.add (local.get $__fungi_rec_2) (i32.const 12)) (call $host___str_concat (local.get $p1) (i32.const 14))) ;; .path
      (local.get $__fungi_rec_2)
    )))
      )
    )
    (local.get $diagnostics)
  )
  (export "validateSqliteCredentialRefAtPath" (func $validateSqliteCredentialRefAtPath))

  ;; pure flow: validateSqliteCredentialRef
  (func $validateSqliteCredentialRef (param $p0 i32) (result i32)
    ;; B2 (R&D 0055): per-flow arena reset — reclaim the previous invocation's heap (leaf entry-point)
    (global.set $__fungi_heap (i32.const 1024))
    (call $validateSqliteCredentialRefAtPath (local.get $p0) (i32.const 17))
  )
  (export "validateSqliteCredentialRef" (func $validateSqliteCredentialRef))

)