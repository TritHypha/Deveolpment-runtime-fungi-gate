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
  (import "host" "__str_starts_with" (func $host___str_starts_with (param $p0 i32) (param $p1 i32) (result i32)))
  ;; effect: stdlib.string
  (import "host" "__str_to_lower" (func $host___str_to_lower (param $p0 i32) (result i32)))
  ;; effect: stdlib.string
  (import "host" "__str_trim" (func $host___str_trim (param $p0 i32) (result i32)))
  ;; effect: stdlib.char
  (import "host" "__char_to_string" (func $host___char_to_string (param $p0 i32) (result i32)))
  ;; effect: stdlib.char
  (import "host" "__char_from_code" (func $host___char_from_code (param $p0 i32) (result i32)))
  ;; effect: stdlib.result
  (import "host" "__option_some" (func $host___option_some (param $p0 i32) (result i32)))
  ;; effect: stdlib.result
  (import "host" "__option_none" (func $host___option_none (result i32)))
  ;; effect: stdlib.result
  (import "host" "__option_some_v2" (func $host___option_some_v2 (param $p0 i32) (result i32)))
  ;; effect: stdlib.result
  (import "host" "__option_none_v2" (func $host___option_none_v2 (result i32)))
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

  ;; pure flow: compactLink
  (func $compactLink (param $p0 i32) (result i32)
    (local $compact i32)
    (local $index i32)
    (local $__while_fuel_0 i32)
    (local $characterOpt i32)
    (local $__fungi_match_1 i32)
    (local $__fungi_match_2 i32)
    (local $codePoint i32)
    (local.set $compact (i32.const 0))
    (local.set $index (i32.const 0))
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
            (local.set $codePoint (local.get $__fungi_match_2))
            (if (i32.gt_s (local.get $codePoint) (i32.const 32))
              (then
                (local.set $compact (call $host___str_concat (local.get $compact) (call $host___char_to_string (local.get $__fungi_match_2))))
              )
            )
          )
        )
        (local.set $index (call $fungi_checked_add_i32 (local.get $index) (i32.const 1)))
        (br $while_loop_0)
      )
    )
    (call $host___str_to_lower (local.get $compact))
  )
  (export "compactLink" (func $compactLink))

  ;; pure flow: extractScheme
  (func $extractScheme (param $p0 i32) (result i32)
    (local $first i32)
    (local $scheme i32)
    (local $index i32)
    (local $valid i32)
    (local $__while_fuel_0 i32)
    (local $codePoint i32)
    (local $characterOpt i32)
    (local $__fungi_match_1 i32)
    (local $__fungi_match_2 i32)
    (local $__fungi_match_3 i32)
    (local $__fungi_match_4 i32)
    (if (i32.eq (call $host___str_length (local.get $p0)) (i32.const 0))
      (then
        (return (call $host___option_none_v2))
      )
    )
    (local.set $first (call $charCodeAt (local.get $p0) (i32.const 0)))
    (if (i32.or (i32.lt_s (local.get $first) (i32.const 97)) (i32.gt_s (local.get $first) (i32.const 122)))
      (then
        (return (call $host___option_none_v2))
      )
    )
    (local.set $scheme (i32.const 0))
    (local.set $index (i32.const 0))
    (local.set $valid (i32.const 1))
    (block $while_exit_0
      (loop $while_loop_0
        (br_if $while_exit_0 (i32.eqz (i32.and (i32.lt_s (local.get $index) (call $host___str_length (local.get $p0))) (local.get $valid))))
        (local.set $__while_fuel_0 (i32.add (local.get $__while_fuel_0) (i32.const 1)))
        (if (i32.gt_u (local.get $__while_fuel_0) (i32.const 100000)) (then unreachable))
        (local.set $codePoint (call $charCodeAt (local.get $p0) (local.get $index)))
        (if (i32.and (i32.ge_s (local.get $codePoint) (i32.const 97)) (i32.le_s (local.get $codePoint) (i32.const 122)))
          (then
            (local.set $characterOpt (call $host___str_char_at_option_v2 (local.get $p0) (local.get $index)))
            (local.set $__fungi_match_1 (local.get $characterOpt))
            (if (call $host___option_is_none_v2 (local.get $__fungi_match_1))
              (then
                (local.set $valid (i32.const 0))
              )
              (else
                (local.set $__fungi_match_2 (call $host___option_value_v2 (local.get $__fungi_match_1)))
                (local.set $scheme (call $host___str_concat (local.get $scheme) (call $host___char_to_string (local.get $__fungi_match_2))))
              )
            )
          )
          (else
            (if (i32.or (i32.or (i32.or (i32.and (i32.ge_s (local.get $codePoint) (i32.const 48)) (i32.le_s (local.get $codePoint) (i32.const 57))) (i32.eq (local.get $codePoint) (i32.const 43))) (i32.eq (local.get $codePoint) (i32.const 45))) (i32.eq (local.get $codePoint) (i32.const 46)))
              (then
                (local.set $characterOpt (call $host___str_char_at_option_v2 (local.get $p0) (local.get $index)))
                (local.set $__fungi_match_3 (local.get $characterOpt))
                (if (call $host___option_is_none_v2 (local.get $__fungi_match_3))
                  (then
                    (local.set $valid (i32.const 0))
                  )
                  (else
                    (local.set $__fungi_match_4 (call $host___option_value_v2 (local.get $__fungi_match_3)))
                    (local.set $scheme (call $host___str_concat (local.get $scheme) (call $host___char_to_string (local.get $__fungi_match_4))))
                  )
                )
              )
              (else
                (if (i32.eq (local.get $codePoint) (i32.const 58))
                  (then
                    (if (i32.gt_s (call $host___str_length (local.get $scheme)) (i32.const 0))
                      (then
                        (return (call $host___option_some_v2 (local.get $scheme)))
                      )
                    )
                    (return (call $host___option_none_v2))
                  )
                )
                (return (call $host___option_none_v2))
              )
            )
          )
        )
        (local.set $index (call $fungi_checked_add_i32 (local.get $index) (i32.const 1)))
        (br $while_loop_0)
      )
    )
    (call $host___option_none_v2)
  )
  (export "extractScheme" (func $extractScheme))

  ;; pure flow: httpHostIsLocalhost
  (func $httpHostIsLocalhost (param $p0 i32) (result i32)
    (local $authority_ i32)
    (local $index i32)
    (local $__while_fuel_0 i32)
    (local $characterOpt i32)
    (local $__fungi_match_1 i32)
    (local $__fungi_match_2 i32)
    (local $atIndex i32)
    (local $authorityIndex i32)
    (local $__while_fuel_3 i32)
    (local $hostStart i32)
    (local $host i32)
    (local $hostIndex i32)
    (local $__while_fuel_4 i32)
    (local $__fungi_match_5 i32)
    (local $__fungi_match_6 i32)
    (local $__while_fuel_7 i32)
    (local $__fungi_match_8 i32)
    (local $__fungi_match_9 i32)
    (if (i32.eq (call $host___str_starts_with (local.get $p0) (i32.const 1)) (i32.const 0))
      (then
        (return (i32.const 0))
      )
    )
    (local.set $authority_ (i32.const 0))
    (local.set $index (i32.const 7))
    (block $while_exit_0
      (loop $while_loop_0
        (br_if $while_exit_0 (i32.eqz (i32.and (i32.and (i32.and (i32.lt_s (local.get $index) (call $host___str_length (local.get $p0))) (i32.ne (call $charCodeAt (local.get $p0) (local.get $index)) (i32.const 47))) (i32.ne (call $charCodeAt (local.get $p0) (local.get $index)) (i32.const 63))) (i32.ne (call $charCodeAt (local.get $p0) (local.get $index)) (i32.const 35)))))
        (local.set $__while_fuel_0 (i32.add (local.get $__while_fuel_0) (i32.const 1)))
        (if (i32.gt_u (local.get $__while_fuel_0) (i32.const 100000)) (then unreachable))
        (local.set $characterOpt (call $host___str_char_at_option_v2 (local.get $p0) (local.get $index)))
        (local.set $__fungi_match_1 (local.get $characterOpt))
        (if (call $host___option_is_none_v2 (local.get $__fungi_match_1))
          (then
          )
          (else
            (local.set $__fungi_match_2 (call $host___option_value_v2 (local.get $__fungi_match_1)))
            (local.set $authority_ (call $host___str_concat (local.get $authority_) (call $host___char_to_string (local.get $__fungi_match_2))))
          )
        )
        (local.set $index (call $fungi_checked_add_i32 (local.get $index) (i32.const 1)))
        (br $while_loop_0)
      )
    )
    (local.set $atIndex (i32.const -1))
    (local.set $authorityIndex (i32.const 0))
    (block $while_exit_3
      (loop $while_loop_3
        (br_if $while_exit_3 (i32.ge_s (local.get $authorityIndex) (call $host___str_length (local.get $authority_))))
        (local.set $__while_fuel_3 (i32.add (local.get $__while_fuel_3) (i32.const 1)))
        (if (i32.gt_u (local.get $__while_fuel_3) (i32.const 100000)) (then unreachable))
        (if (i32.eq (call $charCodeAt (local.get $authority_) (local.get $authorityIndex)) (i32.const 64))
          (then
            (local.set $atIndex (local.get $authorityIndex))
          )
        )
        (local.set $authorityIndex (call $fungi_checked_add_i32 (local.get $authorityIndex) (i32.const 1)))
        (br $while_loop_3)
      )
    )
    (local.set $hostStart (i32.const 0))
    (if (i32.ge_s (local.get $atIndex) (i32.const 0))
      (then
        (local.set $hostStart (call $fungi_checked_add_i32 (local.get $atIndex) (i32.const 1)))
      )
    )
    (if (i32.ge_s (local.get $hostStart) (call $host___str_length (local.get $authority_)))
      (then
        (return (i32.const 0))
      )
    )
    (local.set $host (i32.const 0))
    (if (i32.eq (call $charCodeAt (local.get $authority_) (local.get $hostStart)) (i32.const 91))
      (then
        (local.set $hostIndex (call $fungi_checked_add_i32 (local.get $hostStart) (i32.const 1)))
        (block $while_exit_4
          (loop $while_loop_4
            (br_if $while_exit_4 (i32.eqz (i32.and (i32.lt_s (local.get $hostIndex) (call $host___str_length (local.get $authority_))) (i32.ne (call $charCodeAt (local.get $authority_) (local.get $hostIndex)) (i32.const 93)))))
            (local.set $__while_fuel_4 (i32.add (local.get $__while_fuel_4) (i32.const 1)))
            (if (i32.gt_u (local.get $__while_fuel_4) (i32.const 100000)) (then unreachable))
            (local.set $characterOpt (call $host___str_char_at_option_v2 (local.get $authority_) (local.get $hostIndex)))
            (local.set $__fungi_match_5 (local.get $characterOpt))
            (if (call $host___option_is_none_v2 (local.get $__fungi_match_5))
              (then
              )
              (else
                (local.set $__fungi_match_6 (call $host___option_value_v2 (local.get $__fungi_match_5)))
                (local.set $host (call $host___str_concat (local.get $host) (call $host___char_to_string (local.get $__fungi_match_6))))
              )
            )
            (local.set $hostIndex (call $fungi_checked_add_i32 (local.get $hostIndex) (i32.const 1)))
            (br $while_loop_4)
          )
        )
      )
      (else
        (local.set $hostIndex (local.get $hostStart))
        (block $while_exit_7
          (loop $while_loop_7
            (br_if $while_exit_7 (i32.eqz (i32.and (i32.lt_s (local.get $hostIndex) (call $host___str_length (local.get $authority_))) (i32.ne (call $charCodeAt (local.get $authority_) (local.get $hostIndex)) (i32.const 58)))))
            (local.set $__while_fuel_7 (i32.add (local.get $__while_fuel_7) (i32.const 1)))
            (if (i32.gt_u (local.get $__while_fuel_7) (i32.const 100000)) (then unreachable))
            (local.set $characterOpt (call $host___str_char_at_option_v2 (local.get $authority_) (local.get $hostIndex)))
            (local.set $__fungi_match_8 (local.get $characterOpt))
            (if (call $host___option_is_none_v2 (local.get $__fungi_match_8))
              (then
              )
              (else
                (local.set $__fungi_match_9 (call $host___option_value_v2 (local.get $__fungi_match_8)))
                (local.set $host (call $host___str_concat (local.get $host) (call $host___char_to_string (local.get $__fungi_match_9))))
              )
            )
            (local.set $hostIndex (call $fungi_checked_add_i32 (local.get $hostIndex) (i32.const 1)))
            (br $while_loop_7)
          )
        )
      )
    )
    (if (call $host___str_eq (local.get $host) (i32.const 2))
      (then
        (return (i32.const 1))
      )
      (else
    (if (call $host___str_eq (local.get $host) (i32.const 3))
      (then
        (return (i32.const 1))
      )
      (else
    (if (call $host___str_eq (local.get $host) (i32.const 4))
      (then
        (return (i32.const 1))
      )
      (else
    (return (i32.const 0))
      )
    )
      )
    )
      )
    )
    (unreachable) ;; #160: all match/while arms return — implicit [i32] tail
  )
  (export "httpHostIsLocalhost" (func $httpHostIsLocalhost))

  ;; pure flow: validateLinkTarget
  (func $validateLinkTarget (param $p0 i32) (param $p1 i32) (result i32)
    (local $diagnostics i32)
    (local $trimmed i32)
    (local $__fungi_rec_0 i32)
    (local $compact i32)
    (local $__fungi_rec_1 i32)
    (local $schemeOpt i32)
    (local $__fungi_match_0 i32)
    (local $__fungi_match_1 i32)
    (local $__fungi_rec_2 i32)
    (local $__fungi_rec_3 i32)
    (local $__fungi_rec_4 i32)
    (local $__fungi_rec_5 i32)
    (local $__fungi_rec_6 i32)
    ;; B2 (R&D 0055): per-flow arena reset — reclaim the previous invocation's heap (leaf entry-point)
    (global.set $__fungi_heap (i32.const 1024))
    (local.set $diagnostics (call $host___array_create))
    (local.set $trimmed (call $host___str_trim (local.get $p0)))
    (if (i32.eq (call $host___str_length (local.get $trimmed)) (i32.const 0))
      (then
        (return (call $host___array_append (local.get $diagnostics) (block (result i32)
      (local.set $__fungi_rec_0 (global.get $__fungi_heap))
      (global.set $__fungi_heap (i32.add (global.get $__fungi_heap) (i32.const 16)))
      (i32.store (i32.add (local.get $__fungi_rec_0) (i32.const 0)) (i32.const 5)) ;; .code
      (i32.store (i32.add (local.get $__fungi_rec_0) (i32.const 4)) (i32.const 6)) ;; .severity
      (i32.store (i32.add (local.get $__fungi_rec_0) (i32.const 8)) (i32.const 7)) ;; .message
      (i32.store (i32.add (local.get $__fungi_rec_0) (i32.const 12)) (local.get $p1)) ;; .path
      (local.get $__fungi_rec_0)
    )))
      )
    )
    (local.set $compact (call $compactLink (local.get $trimmed)))
    (if (call $host___str_starts_with (local.get $compact) (i32.const 8))
      (then
        (return (call $host___array_append (local.get $diagnostics) (block (result i32)
      (local.set $__fungi_rec_1 (global.get $__fungi_heap))
      (global.set $__fungi_heap (i32.add (global.get $__fungi_heap) (i32.const 16)))
      (i32.store (i32.add (local.get $__fungi_rec_1) (i32.const 0)) (i32.const 9)) ;; .code
      (i32.store (i32.add (local.get $__fungi_rec_1) (i32.const 4)) (i32.const 6)) ;; .severity
      (i32.store (i32.add (local.get $__fungi_rec_1) (i32.const 8)) (call $host___str_concat (call $host___str_concat (call $host___str_concat (call $host___str_concat (i32.const 10) (call $host___int_to_str (call $host___char_from_code (i32.const 34)))) (local.get $trimmed)) (call $host___int_to_str (call $host___char_from_code (i32.const 34)))) (i32.const 11))) ;; .message
      (i32.store (i32.add (local.get $__fungi_rec_1) (i32.const 12)) (local.get $p1)) ;; .path
      (local.get $__fungi_rec_1)
    )))
      )
    )
    (local.set $schemeOpt (call $extractScheme (local.get $compact)))
    (local.set $__fungi_match_0 (local.get $schemeOpt))
    (if (call $host___option_is_none_v2 (local.get $__fungi_match_0))
      (then
        (return (local.get $diagnostics))
      )
      (else
        (local.set $__fungi_match_1 (call $host___option_value_v2 (local.get $__fungi_match_0)))
        (if (call $host___str_eq (local.get $__fungi_match_1) (i32.const 16))
          (then
            (return (call $host___array_append (local.get $diagnostics) (block (result i32)
      (local.set $__fungi_rec_2 (global.get $__fungi_heap))
      (global.set $__fungi_heap (i32.add (global.get $__fungi_heap) (i32.const 16)))
      (i32.store (i32.add (local.get $__fungi_rec_2) (i32.const 0)) (i32.const 12)) ;; .code
      (i32.store (i32.add (local.get $__fungi_rec_2) (i32.const 4)) (i32.const 6)) ;; .severity
      (i32.store (i32.add (local.get $__fungi_rec_2) (i32.const 8)) (call $host___str_concat (call $host___str_concat (call $host___str_concat (call $host___str_concat (call $host___str_concat (i32.const 13) (call $host___int_to_str (call $host___char_from_code (i32.const 34)))) (local.get $__fungi_match_1)) (i32.const 14)) (call $host___int_to_str (call $host___char_from_code (i32.const 34)))) (i32.const 15))) ;; .message
      (i32.store (i32.add (local.get $__fungi_rec_2) (i32.const 12)) (local.get $p1)) ;; .path
      (local.get $__fungi_rec_2)
    )))
          )
          (else
        (if (call $host___str_eq (local.get $__fungi_match_1) (i32.const 17))
          (then
            (return (call $host___array_append (local.get $diagnostics) (block (result i32)
      (local.set $__fungi_rec_3 (global.get $__fungi_heap))
      (global.set $__fungi_heap (i32.add (global.get $__fungi_heap) (i32.const 16)))
      (i32.store (i32.add (local.get $__fungi_rec_3) (i32.const 0)) (i32.const 12)) ;; .code
      (i32.store (i32.add (local.get $__fungi_rec_3) (i32.const 4)) (i32.const 6)) ;; .severity
      (i32.store (i32.add (local.get $__fungi_rec_3) (i32.const 8)) (call $host___str_concat (call $host___str_concat (call $host___str_concat (call $host___str_concat (call $host___str_concat (i32.const 13) (call $host___int_to_str (call $host___char_from_code (i32.const 34)))) (local.get $__fungi_match_1)) (i32.const 14)) (call $host___int_to_str (call $host___char_from_code (i32.const 34)))) (i32.const 15))) ;; .message
      (i32.store (i32.add (local.get $__fungi_rec_3) (i32.const 12)) (local.get $p1)) ;; .path
      (local.get $__fungi_rec_3)
    )))
          )
          (else
        (if (call $host___str_eq (local.get $__fungi_match_1) (i32.const 18))
          (then
            (return (call $host___array_append (local.get $diagnostics) (block (result i32)
      (local.set $__fungi_rec_4 (global.get $__fungi_heap))
      (global.set $__fungi_heap (i32.add (global.get $__fungi_heap) (i32.const 16)))
      (i32.store (i32.add (local.get $__fungi_rec_4) (i32.const 0)) (i32.const 12)) ;; .code
      (i32.store (i32.add (local.get $__fungi_rec_4) (i32.const 4)) (i32.const 6)) ;; .severity
      (i32.store (i32.add (local.get $__fungi_rec_4) (i32.const 8)) (call $host___str_concat (call $host___str_concat (call $host___str_concat (call $host___str_concat (call $host___str_concat (i32.const 13) (call $host___int_to_str (call $host___char_from_code (i32.const 34)))) (local.get $__fungi_match_1)) (i32.const 14)) (call $host___int_to_str (call $host___char_from_code (i32.const 34)))) (i32.const 15))) ;; .message
      (i32.store (i32.add (local.get $__fungi_rec_4) (i32.const 12)) (local.get $p1)) ;; .path
      (local.get $__fungi_rec_4)
    )))
          )
          (else
        (if (call $host___str_eq (local.get $__fungi_match_1) (i32.const 19))
          (then
            (return (local.get $diagnostics))
          )
          (else
        (if (call $host___str_eq (local.get $__fungi_match_1) (i32.const 20))
          (then
            (return (local.get $diagnostics))
          )
          (else
        (if (call $host___str_eq (local.get $__fungi_match_1) (i32.const 23))
          (then
            (if (i32.eq (call $httpHostIsLocalhost (local.get $compact)) (i32.const 0))
              (then
                (return (call $host___array_append (local.get $diagnostics) (block (result i32)
      (local.set $__fungi_rec_5 (global.get $__fungi_heap))
      (global.set $__fungi_heap (i32.add (global.get $__fungi_heap) (i32.const 16)))
      (i32.store (i32.add (local.get $__fungi_rec_5) (i32.const 0)) (i32.const 21)) ;; .code
      (i32.store (i32.add (local.get $__fungi_rec_5) (i32.const 4)) (i32.const 6)) ;; .severity
      (i32.store (i32.add (local.get $__fungi_rec_5) (i32.const 8)) (call $host___str_concat (call $host___str_concat (call $host___str_concat (call $host___str_concat (i32.const 10) (call $host___int_to_str (call $host___char_from_code (i32.const 34)))) (local.get $trimmed)) (call $host___int_to_str (call $host___char_from_code (i32.const 34)))) (i32.const 22))) ;; .message
      (i32.store (i32.add (local.get $__fungi_rec_5) (i32.const 12)) (local.get $p1)) ;; .path
      (local.get $__fungi_rec_5)
    )))
              )
            )
            (return (local.get $diagnostics))
          )
          (else
        (return (call $host___array_append (local.get $diagnostics) (block (result i32)
      (local.set $__fungi_rec_6 (global.get $__fungi_heap))
      (global.set $__fungi_heap (i32.add (global.get $__fungi_heap) (i32.const 16)))
      (i32.store (i32.add (local.get $__fungi_rec_6) (i32.const 0)) (i32.const 24)) ;; .code
      (i32.store (i32.add (local.get $__fungi_rec_6) (i32.const 4)) (i32.const 6)) ;; .severity
      (i32.store (i32.add (local.get $__fungi_rec_6) (i32.const 8)) (call $host___str_concat (call $host___str_concat (call $host___str_concat (call $host___str_concat (call $host___str_concat (i32.const 13) (call $host___int_to_str (call $host___char_from_code (i32.const 34)))) (local.get $__fungi_match_1)) (i32.const 14)) (call $host___int_to_str (call $host___char_from_code (i32.const 34)))) (i32.const 25))) ;; .message
      (i32.store (i32.add (local.get $__fungi_rec_6) (i32.const 12)) (local.get $p1)) ;; .path
      (local.get $__fungi_rec_6)
    )))
          )
        )
          )
        )
          )
        )
          )
        )
          )
        )
          )
        )
      )
    )
    (unreachable) ;; #160: all match/while arms return — implicit [i32] tail
  )
  (export "validateLinkTarget" (func $validateLinkTarget))

)