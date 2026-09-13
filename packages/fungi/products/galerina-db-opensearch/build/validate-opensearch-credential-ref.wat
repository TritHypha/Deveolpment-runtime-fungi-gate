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

  ;; pure flow: isRegexWhitespace
  (func $isRegexWhitespace (param $p0 i32) (result i32)
    (if (i32.or (i32.or (i32.or (i32.or (i32.eq (local.get $p0) (i32.const 9)) (i32.eq (local.get $p0) (i32.const 10))) (i32.eq (local.get $p0) (i32.const 11))) (i32.eq (local.get $p0) (i32.const 12))) (i32.eq (local.get $p0) (i32.const 13)))
      (then
        (return (i32.const 1))
      )
    )
    (if (i32.or (i32.or (i32.eq (local.get $p0) (i32.const 32)) (i32.eq (local.get $p0) (i32.const 160))) (i32.eq (local.get $p0) (i32.const 5760)))
      (then
        (return (i32.const 1))
      )
    )
    (if (i32.and (i32.ge_s (local.get $p0) (i32.const 8192)) (i32.le_s (local.get $p0) (i32.const 8202)))
      (then
        (return (i32.const 1))
      )
    )
    (if (i32.or (i32.or (i32.or (i32.or (i32.or (i32.eq (local.get $p0) (i32.const 8232)) (i32.eq (local.get $p0) (i32.const 8233))) (i32.eq (local.get $p0) (i32.const 8239))) (i32.eq (local.get $p0) (i32.const 8287))) (i32.eq (local.get $p0) (i32.const 12288))) (i32.eq (local.get $p0) (i32.const 65279)))
      (then
        (return (i32.const 1))
      )
    )
    (i32.const 0)
  )
  (export "isRegexWhitespace" (func $isRegexWhitespace))

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

  ;; pure flow: containsInlineCredential
  (func $containsInlineCredential (param $p0 i32) (result i32)
    (local $start i32)
    (local $__while_fuel_0 i32)
    (local $userIndex i32)
    (local $userLength i32)
    (local $userValid i32)
    (local $__while_fuel_1 i32)
    (local $codePoint i32)
    (local $passwordIndex i32)
    (local $passwordLength i32)
    (local $passwordValid i32)
    (local $__while_fuel_2 i32)
    (local.set $start (i32.const 0))
    (block $while_exit_0
      (loop $while_loop_0
        (br_if $while_exit_0 (i32.ge_s (call $fungi_checked_add_i32 (local.get $start) (i32.const 2)) (call $host___str_length (local.get $p0))))
        (local.set $__while_fuel_0 (i32.add (local.get $__while_fuel_0) (i32.const 1)))
        (if (i32.gt_u (local.get $__while_fuel_0) (i32.const 100000)) (then unreachable))
        (if (i32.and (i32.and (i32.eq (call $charCodeAt (local.get $p0) (local.get $start)) (i32.const 58)) (i32.eq (call $charCodeAt (local.get $p0) (call $fungi_checked_add_i32 (local.get $start) (i32.const 1))) (i32.const 47))) (i32.eq (call $charCodeAt (local.get $p0) (call $fungi_checked_add_i32 (local.get $start) (i32.const 2))) (i32.const 47)))
          (then
            (local.set $userIndex (call $fungi_checked_add_i32 (local.get $start) (i32.const 3)))
            (local.set $userLength (i32.const 0))
            (local.set $userValid (i32.const 1))
            (block $while_exit_1
              (loop $while_loop_1
                (br_if $while_exit_1 (i32.eqz (i32.and (i32.and (i32.lt_s (local.get $userIndex) (call $host___str_length (local.get $p0))) (local.get $userValid)) (i32.ne (call $charCodeAt (local.get $p0) (local.get $userIndex)) (i32.const 58)))))
                (local.set $__while_fuel_1 (i32.add (local.get $__while_fuel_1) (i32.const 1)))
                (if (i32.gt_u (local.get $__while_fuel_1) (i32.const 100000)) (then unreachable))
                (local.set $codePoint (call $charCodeAt (local.get $p0) (local.get $userIndex)))
                (if (i32.or (i32.or (i32.eq (local.get $codePoint) (i32.const 47)) (i32.eq (local.get $codePoint) (i32.const 64))) (call $isRegexWhitespace (local.get $codePoint)))
                  (then
                    (local.set $userValid (i32.const 0))
                  )
                  (else
                    (local.set $userLength (call $fungi_checked_add_i32 (local.get $userLength) (i32.const 1)))
                  )
                )
                (local.set $userIndex (call $fungi_checked_add_i32 (local.get $userIndex) (i32.const 1)))
                (br $while_loop_1)
              )
            )
            (if (i32.and (i32.and (i32.and (local.get $userValid) (i32.gt_s (local.get $userLength) (i32.const 0))) (i32.lt_s (local.get $userIndex) (call $host___str_length (local.get $p0)))) (i32.eq (call $charCodeAt (local.get $p0) (local.get $userIndex)) (i32.const 58)))
              (then
                (local.set $passwordIndex (call $fungi_checked_add_i32 (local.get $userIndex) (i32.const 1)))
                (local.set $passwordLength (i32.const 0))
                (local.set $passwordValid (i32.const 1))
                (block $while_exit_2
                  (loop $while_loop_2
                    (br_if $while_exit_2 (i32.eqz (i32.and (i32.and (i32.lt_s (local.get $passwordIndex) (call $host___str_length (local.get $p0))) (local.get $passwordValid)) (i32.ne (call $charCodeAt (local.get $p0) (local.get $passwordIndex)) (i32.const 64)))))
                    (local.set $__while_fuel_2 (i32.add (local.get $__while_fuel_2) (i32.const 1)))
                    (if (i32.gt_u (local.get $__while_fuel_2) (i32.const 100000)) (then unreachable))
                    (local.set $codePoint (call $charCodeAt (local.get $p0) (local.get $passwordIndex)))
                    (if (call $isRegexWhitespace (local.get $codePoint))
                      (then
                        (local.set $passwordValid (i32.const 0))
                      )
                      (else
                        (local.set $passwordLength (call $fungi_checked_add_i32 (local.get $passwordLength) (i32.const 1)))
                      )
                    )
                    (local.set $passwordIndex (call $fungi_checked_add_i32 (local.get $passwordIndex) (i32.const 1)))
                    (br $while_loop_2)
                  )
                )
                (if (i32.and (i32.and (i32.and (local.get $passwordValid) (i32.gt_s (local.get $passwordLength) (i32.const 0))) (i32.lt_s (local.get $passwordIndex) (call $host___str_length (local.get $p0)))) (i32.eq (call $charCodeAt (local.get $p0) (local.get $passwordIndex)) (i32.const 64)))
                  (then
                    (return (i32.const 1))
                  )
                )
              )
            )
          )
        )
        (local.set $start (call $fungi_checked_add_i32 (local.get $start) (i32.const 1)))
        (br $while_loop_0)
      )
    )
    (i32.const 0)
  )
  (export "containsInlineCredential" (func $containsInlineCredential))

  ;; pure flow: validateOpenSearchCredentialRef
  (func $validateOpenSearchCredentialRef (param $p0 i32) (param $p1 i32) (result i32)
    (local $diagnostics i32)
    (local $__fungi_rec_0 i32)
    (local $__fungi_rec_1 i32)
    (local $__fungi_rec_2 i32)
    ;; B2 (R&D 0055): per-flow arena reset — reclaim the previous invocation's heap (leaf entry-point)
    (global.set $__fungi_heap (i32.const 1024))
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
      (else
        (if (call $containsInlineCredential (i32.load (i32.add (local.get $p0) (i32.const 4))))
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
      )
    )
    (local.get $diagnostics)
  )
  (export "validateOpenSearchCredentialRef" (func $validateOpenSearchCredentialRef))

)