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

  ;; pure flow: validateResponseMapping
  (func $validateResponseMapping (param $p0 i32) (param $p1 i32) (param $p2 i32) (result i32)
    (local $diagnostics i32)
    (local $__fungi_rec_0 i32)
    (local $__fungi_rec_1 i32)
    (local $__fungi_rec_2 i32)
    (local $seenTargets i32)
    (local $entryIndex i32)
    (local $__while_fuel_0 i32)
    (local $entryOpt i32)
    (local $__fungi_match_1 i32)
    (local $__fungi_match_2 i32)
    (local $__fungi_rec_3 i32)
    (local $duplicateTarget i32)
    (local $seenIndex i32)
    (local $__while_fuel_3 i32)
    (local $seenOpt i32)
    (local $__fungi_match_4 i32)
    (local $__fungi_match_5 i32)
    (local $__fungi_rec_4 i32)
    (local $found i32)
    (local $classification i32)
    (local $fieldIndex i32)
    (local $__while_fuel_6 i32)
    (local $fieldOpt i32)
    (local $__fungi_match_7 i32)
    (local $__fungi_match_8 i32)
    (local $__fungi_rec_5 i32)
    (local $known i32)
    (local $__fungi_rec_6 i32)
    (local $__fungi_rec_7 i32)
    (local $__fungi_rec_8 i32)
    (local.set $diagnostics (call $host___array_create))
    (if (i32.eq (call $host___str_length (call $host___str_trim (i32.load (i32.add (local.get $p0) (i32.const 0))))) (i32.const 0))
      (then
        (local.set $diagnostics (call $host___array_append (local.get $diagnostics) (block (result i32)
      (local.set $__fungi_rec_0 (global.get $__fungi_heap))
      (global.set $__fungi_heap (i32.add (global.get $__fungi_heap) (i32.const 16)))
      (i32.store (i32.add (local.get $__fungi_rec_0) (i32.const 0)) (i32.const 1)) ;; .code
      (i32.store (i32.add (local.get $__fungi_rec_0) (i32.const 4)) (i32.const 2)) ;; .severity
      (i32.store (i32.add (local.get $__fungi_rec_0) (i32.const 8)) (i32.const 3)) ;; .message
      (i32.store (i32.add (local.get $__fungi_rec_0) (i32.const 12)) (call $host___str_concat (local.get $p2) (i32.const 4))) ;; .path
      (local.get $__fungi_rec_0)
    )))
      )
    )
    (if (i32.eq (call $host___str_length (call $host___str_trim (i32.load (i32.add (local.get $p0) (i32.const 4))))) (i32.const 0))
      (then
        (local.set $diagnostics (call $host___array_append (local.get $diagnostics) (block (result i32)
      (local.set $__fungi_rec_1 (global.get $__fungi_heap))
      (global.set $__fungi_heap (i32.add (global.get $__fungi_heap) (i32.const 16)))
      (i32.store (i32.add (local.get $__fungi_rec_1) (i32.const 0)) (i32.const 5)) ;; .code
      (i32.store (i32.add (local.get $__fungi_rec_1) (i32.const 4)) (i32.const 2)) ;; .severity
      (i32.store (i32.add (local.get $__fungi_rec_1) (i32.const 8)) (i32.const 6)) ;; .message
      (i32.store (i32.add (local.get $__fungi_rec_1) (i32.const 12)) (call $host___str_concat (local.get $p2) (i32.const 7))) ;; .path
      (local.get $__fungi_rec_1)
    )))
      )
    )
    (if (i32.eq (call $host___array_length (i32.load (i32.add (local.get $p0) (i32.const 8)))) (i32.const 0))
      (then
        (local.set $diagnostics (call $host___array_append (local.get $diagnostics) (block (result i32)
      (local.set $__fungi_rec_2 (global.get $__fungi_heap))
      (global.set $__fungi_heap (i32.add (global.get $__fungi_heap) (i32.const 16)))
      (i32.store (i32.add (local.get $__fungi_rec_2) (i32.const 0)) (i32.const 8)) ;; .code
      (i32.store (i32.add (local.get $__fungi_rec_2) (i32.const 4)) (i32.const 9)) ;; .severity
      (i32.store (i32.add (local.get $__fungi_rec_2) (i32.const 8)) (i32.const 10)) ;; .message
      (i32.store (i32.add (local.get $__fungi_rec_2) (i32.const 12)) (call $host___str_concat (local.get $p2) (i32.const 11))) ;; .path
      (local.get $__fungi_rec_2)
    )))
      )
    )
    (local.set $seenTargets (call $host___array_create))
    (local.set $entryIndex (i32.const 0))
    (block $while_exit_0
      (loop $while_loop_0
        (br_if $while_exit_0 (i32.ge_s (local.get $entryIndex) (call $host___array_length (i32.load (i32.add (local.get $p0) (i32.const 8))))))
        (local.set $__while_fuel_0 (i32.add (local.get $__while_fuel_0) (i32.const 1)))
        (if (i32.gt_u (local.get $__while_fuel_0) (i32.const 100000)) (then unreachable))
        (local.set $entryOpt (call $host___array_get_option_v2 (i32.load (i32.add (local.get $p0) (i32.const 8))) (local.get $entryIndex)))
        (local.set $__fungi_match_1 (local.get $entryOpt))
        (if (call $host___option_is_none_v2 (local.get $__fungi_match_1))
          (then
          )
          (else
            (local.set $__fungi_match_2 (call $host___option_value_v2 (local.get $__fungi_match_1)))
            (if (i32.or (i32.eq (call $host___str_length (call $host___str_trim (i32.load (i32.add (local.get $__fungi_match_2) (i32.const 0))))) (i32.const 0)) (i32.eq (call $host___str_length (call $host___str_trim (i32.load (i32.add (local.get $__fungi_match_2) (i32.const 4))))) (i32.const 0)))
              (then
                (local.set $diagnostics (call $host___array_append (local.get $diagnostics) (block (result i32)
      (local.set $__fungi_rec_3 (global.get $__fungi_heap))
      (global.set $__fungi_heap (i32.add (global.get $__fungi_heap) (i32.const 16)))
      (i32.store (i32.add (local.get $__fungi_rec_3) (i32.const 0)) (i32.const 12)) ;; .code
      (i32.store (i32.add (local.get $__fungi_rec_3) (i32.const 4)) (i32.const 2)) ;; .severity
      (i32.store (i32.add (local.get $__fungi_rec_3) (i32.const 8)) (i32.const 13)) ;; .message
      (i32.store (i32.add (local.get $__fungi_rec_3) (i32.const 12)) (call $host___str_concat (call $host___str_concat (local.get $p2) (i32.const 14)) (call $host___int_to_str (local.get $entryIndex)))) ;; .path
      (local.get $__fungi_rec_3)
    )))
              )
            )
            (if (i32.and (i32.gt_s (call $host___str_length (call $host___str_trim (i32.load (i32.add (local.get $__fungi_match_2) (i32.const 0))))) (i32.const 0)) (i32.gt_s (call $host___str_length (call $host___str_trim (i32.load (i32.add (local.get $__fungi_match_2) (i32.const 4))))) (i32.const 0)))
              (then
                (local.set $duplicateTarget (i32.const 0))
                (local.set $seenIndex (i32.const 0))
                (block $while_exit_3
                  (loop $while_loop_3
                    (br_if $while_exit_3 (i32.ge_s (local.get $seenIndex) (call $host___array_length (local.get $seenTargets))))
                    (local.set $__while_fuel_3 (i32.add (local.get $__while_fuel_3) (i32.const 1)))
                    (if (i32.gt_u (local.get $__while_fuel_3) (i32.const 100000)) (then unreachable))
                    (local.set $seenOpt (call $host___array_get_option_v2 (local.get $seenTargets) (local.get $seenIndex)))
                    (local.set $__fungi_match_4 (local.get $seenOpt))
                    (if (call $host___option_is_none_v2 (local.get $__fungi_match_4))
                      (then
                      )
                      (else
                        (local.set $__fungi_match_5 (call $host___option_value_v2 (local.get $__fungi_match_4)))
                        (if (call $host___str_eq (local.get $__fungi_match_5) (i32.load (i32.add (local.get $__fungi_match_2) (i32.const 4))))
                          (then
                            (local.set $duplicateTarget (i32.const 1))
                          )
                        )
                      )
                    )
                    (local.set $seenIndex (call $fungi_checked_add_i32 (local.get $seenIndex) (i32.const 1)))
                    (br $while_loop_3)
                  )
                )
                (if (i32.eq (local.get $duplicateTarget) (i32.const 1))
                  (then
                    (local.set $diagnostics (call $host___array_append (local.get $diagnostics) (block (result i32)
      (local.set $__fungi_rec_4 (global.get $__fungi_heap))
      (global.set $__fungi_heap (i32.add (global.get $__fungi_heap) (i32.const 16)))
      (i32.store (i32.add (local.get $__fungi_rec_4) (i32.const 0)) (i32.const 15)) ;; .code
      (i32.store (i32.add (local.get $__fungi_rec_4) (i32.const 4)) (i32.const 2)) ;; .severity
      (i32.store (i32.add (local.get $__fungi_rec_4) (i32.const 8)) (call $host___str_concat (call $host___str_concat (i32.const 16) (i32.load (i32.add (local.get $__fungi_match_2) (i32.const 4)))) (i32.const 17))) ;; .message
      (i32.store (i32.add (local.get $__fungi_rec_4) (i32.const 12)) (call $host___str_concat (call $host___str_concat (call $host___str_concat (local.get $p2) (i32.const 14)) (call $host___int_to_str (local.get $entryIndex))) (i32.const 18))) ;; .path
      (local.get $__fungi_rec_4)
    )))
                  )
                )
                (local.set $seenTargets (call $host___array_append (local.get $seenTargets) (i32.load (i32.add (local.get $__fungi_match_2) (i32.const 4)))))
                (local.set $found (i32.const 0))
                (local.set $classification (i32.const 0))
                (local.set $fieldIndex (i32.const 0))
                (block $while_exit_6
                  (loop $while_loop_6
                    (br_if $while_exit_6 (i32.ge_s (local.get $fieldIndex) (call $host___array_length (local.get $p1))))
                    (local.set $__while_fuel_6 (i32.add (local.get $__while_fuel_6) (i32.const 1)))
                    (if (i32.gt_u (local.get $__while_fuel_6) (i32.const 100000)) (then unreachable))
                    (local.set $fieldOpt (call $host___array_get_option_v2 (local.get $p1) (local.get $fieldIndex)))
                    (local.set $__fungi_match_7 (local.get $fieldOpt))
                    (if (call $host___option_is_none_v2 (local.get $__fungi_match_7))
                      (then
                      )
                      (else
                        (local.set $__fungi_match_8 (call $host___option_value_v2 (local.get $__fungi_match_7)))
                        (if (call $host___str_eq (i32.load (i32.add (local.get $__fungi_match_8) (i32.const 0))) (i32.load (i32.add (local.get $__fungi_match_2) (i32.const 0))))
                          (then
                            (local.set $found (i32.const 1))
                            (local.set $classification (i32.load (i32.add (local.get $__fungi_match_8) (i32.const 4))))
                          )
                        )
                      )
                    )
                    (local.set $fieldIndex (call $fungi_checked_add_i32 (local.get $fieldIndex) (i32.const 1)))
                    (br $while_loop_6)
                  )
                )
                (if (i32.eq (local.get $found) (i32.const 0))
                  (then
                    (local.set $diagnostics (call $host___array_append (local.get $diagnostics) (block (result i32)
      (local.set $__fungi_rec_5 (global.get $__fungi_heap))
      (global.set $__fungi_heap (i32.add (global.get $__fungi_heap) (i32.const 16)))
      (i32.store (i32.add (local.get $__fungi_rec_5) (i32.const 0)) (i32.const 19)) ;; .code
      (i32.store (i32.add (local.get $__fungi_rec_5) (i32.const 4)) (i32.const 2)) ;; .severity
      (i32.store (i32.add (local.get $__fungi_rec_5) (i32.const 8)) (call $host___str_concat (call $host___str_concat (i32.const 20) (i32.load (i32.add (local.get $__fungi_match_2) (i32.const 0)))) (i32.const 21))) ;; .message
      (i32.store (i32.add (local.get $__fungi_rec_5) (i32.const 12)) (call $host___str_concat (call $host___str_concat (call $host___str_concat (local.get $p2) (i32.const 14)) (call $host___int_to_str (local.get $entryIndex))) (i32.const 22))) ;; .path
      (local.get $__fungi_rec_5)
    )))
                  )
                )
                (if (i32.eq (local.get $found) (i32.const 1))
                  (then
                    (local.set $known (i32.const 0))
                    (if (call $host___str_eq (local.get $classification) (i32.const 23))
                      (then
                        (local.set $known (i32.const 1))
                      )
                      (else
                    (if (call $host___str_eq (local.get $classification) (i32.const 24))
                      (then
                        (local.set $known (i32.const 1))
                      )
                      (else
                    (if (call $host___str_eq (local.get $classification) (i32.const 25))
                      (then
                        (local.set $known (i32.const 1))
                      )
                      (else
                    (if (call $host___str_eq (local.get $classification) (i32.const 26))
                      (then
                        (local.set $known (i32.const 1))
                      )
                      (else
                    (if (call $host___str_eq (local.get $classification) (i32.const 27))
                      (then
                        (local.set $known (i32.const 1))
                      )
                      (else
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
                    (if (i32.eq (local.get $known) (i32.const 0))
                      (then
                        (local.set $diagnostics (call $host___array_append (local.get $diagnostics) (block (result i32)
      (local.set $__fungi_rec_6 (global.get $__fungi_heap))
      (global.set $__fungi_heap (i32.add (global.get $__fungi_heap) (i32.const 16)))
      (i32.store (i32.add (local.get $__fungi_rec_6) (i32.const 0)) (i32.const 28)) ;; .code
      (i32.store (i32.add (local.get $__fungi_rec_6) (i32.const 4)) (i32.const 2)) ;; .severity
      (i32.store (i32.add (local.get $__fungi_rec_6) (i32.const 8)) (call $host___str_concat (call $host___str_concat (call $host___str_concat (call $host___str_concat (call $host___str_concat (call $host___str_concat (call $host___str_concat (call $host___str_concat (i32.const 29) (call $host___int_to_str (call $host___char_from_code (i32.const 34)))) (i32.load (i32.add (local.get $__fungi_match_2) (i32.const 0)))) (call $host___int_to_str (call $host___char_from_code (i32.const 34)))) (i32.const 30)) (call $host___int_to_str (call $host___char_from_code (i32.const 34)))) (local.get $classification)) (call $host___int_to_str (call $host___char_from_code (i32.const 34)))) (i32.const 21))) ;; .message
      (i32.store (i32.add (local.get $__fungi_rec_6) (i32.const 12)) (call $host___str_concat (call $host___str_concat (call $host___str_concat (local.get $p2) (i32.const 14)) (call $host___int_to_str (local.get $entryIndex))) (i32.const 22))) ;; .path
      (local.get $__fungi_rec_6)
    )))
                      )
                    )
                    (if (i32.or (call $host___str_eq (local.get $classification) (i32.const 26)) (call $host___str_eq (local.get $classification) (i32.const 27)))
                      (then
                        (local.set $diagnostics (call $host___array_append (local.get $diagnostics) (block (result i32)
      (local.set $__fungi_rec_7 (global.get $__fungi_heap))
      (global.set $__fungi_heap (i32.add (global.get $__fungi_heap) (i32.const 16)))
      (i32.store (i32.add (local.get $__fungi_rec_7) (i32.const 0)) (i32.const 31)) ;; .code
      (i32.store (i32.add (local.get $__fungi_rec_7) (i32.const 4)) (i32.const 2)) ;; .severity
      (i32.store (i32.add (local.get $__fungi_rec_7) (i32.const 8)) (call $host___str_concat (call $host___str_concat (call $host___str_concat (call $host___str_concat (call $host___str_concat (call $host___str_concat (i32.const 29) (call $host___int_to_str (call $host___char_from_code (i32.const 34)))) (i32.load (i32.add (local.get $__fungi_match_2) (i32.const 0)))) (call $host___int_to_str (call $host___char_from_code (i32.const 34)))) (i32.const 32)) (local.get $classification)) (i32.const 33))) ;; .message
      (i32.store (i32.add (local.get $__fungi_rec_7) (i32.const 12)) (call $host___str_concat (call $host___str_concat (call $host___str_concat (local.get $p2) (i32.const 14)) (call $host___int_to_str (local.get $entryIndex))) (i32.const 22))) ;; .path
      (local.get $__fungi_rec_7)
    )))
                      )
                    )
                    (if (call $host___str_eq (local.get $classification) (i32.const 25))
                      (then
                        (local.set $diagnostics (call $host___array_append (local.get $diagnostics) (block (result i32)
      (local.set $__fungi_rec_8 (global.get $__fungi_heap))
      (global.set $__fungi_heap (i32.add (global.get $__fungi_heap) (i32.const 16)))
      (i32.store (i32.add (local.get $__fungi_rec_8) (i32.const 0)) (i32.const 34)) ;; .code
      (i32.store (i32.add (local.get $__fungi_rec_8) (i32.const 4)) (i32.const 9)) ;; .severity
      (i32.store (i32.add (local.get $__fungi_rec_8) (i32.const 8)) (call $host___str_concat (call $host___str_concat (call $host___str_concat (call $host___str_concat (i32.const 29) (call $host___int_to_str (call $host___char_from_code (i32.const 34)))) (i32.load (i32.add (local.get $__fungi_match_2) (i32.const 0)))) (call $host___int_to_str (call $host___char_from_code (i32.const 34)))) (i32.const 35))) ;; .message
      (i32.store (i32.add (local.get $__fungi_rec_8) (i32.const 12)) (call $host___str_concat (call $host___str_concat (call $host___str_concat (local.get $p2) (i32.const 14)) (call $host___int_to_str (local.get $entryIndex))) (i32.const 22))) ;; .path
      (local.get $__fungi_rec_8)
    )))
                      )
                    )
                  )
                )
              )
            )
          )
        )
        (local.set $entryIndex (call $fungi_checked_add_i32 (local.get $entryIndex) (i32.const 1)))
        (br $while_loop_0)
      )
    )
    (local.get $diagnostics)
  )
  (export "validateResponseMapping" (func $validateResponseMapping))

  ;; pure flow: validateResponseMappingDefault
  (func $validateResponseMappingDefault (param $p0 i32) (param $p1 i32) (result i32)
    ;; B2 (R&D 0055): per-flow arena reset — reclaim the previous invocation's heap (leaf entry-point)
    (global.set $__fungi_heap (i32.const 1024))
    (call $validateResponseMapping (local.get $p0) (local.get $p1) (i32.const 36))
  )
  (export "validateResponseMappingDefault" (func $validateResponseMappingDefault))

)