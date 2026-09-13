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
  (import "host" "__str_starts_with" (func $host___str_starts_with (param $p0 i32) (param $p1 i32) (result i32)))
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

  ;; pure flow: isServerOnlyImport
  (func $isServerOnlyImport (param $p0 i32) (result i32)
    (local $value i32)
    (local.set $value (call $host___str_trim (local.get $p0)))
    (if (call $host___str_starts_with (local.get $value) (i32.const 1))
      (then
        (return (i32.const 1))
      )
    )
    (if (call $host___str_eq (local.get $value) (i32.const 2))
      (then
        (return (i32.const 1))
      )
      (else
    (if (call $host___str_eq (local.get $value) (i32.const 3))
      (then
        (return (i32.const 1))
      )
      (else
    (if (call $host___str_eq (local.get $value) (i32.const 4))
      (then
        (return (i32.const 1))
      )
      (else
    (if (call $host___str_eq (local.get $value) (i32.const 5))
      (then
        (return (i32.const 1))
      )
      (else
    (if (call $host___str_eq (local.get $value) (i32.const 6))
      (then
        (return (i32.const 1))
      )
      (else
    (if (call $host___str_eq (local.get $value) (i32.const 7))
      (then
        (return (i32.const 1))
      )
      (else
    (if (call $host___str_eq (local.get $value) (i32.const 8))
      (then
        (return (i32.const 1))
      )
      (else
    (if (call $host___str_eq (local.get $value) (i32.const 9))
      (then
        (return (i32.const 1))
      )
      (else
    (if (call $host___str_eq (local.get $value) (i32.const 10))
      (then
        (return (i32.const 1))
      )
      (else
    (if (call $host___str_eq (local.get $value) (i32.const 11))
      (then
        (return (i32.const 1))
      )
      (else
    (if (call $host___str_eq (local.get $value) (i32.const 12))
      (then
        (return (i32.const 1))
      )
      (else
    (if (call $host___str_eq (local.get $value) (i32.const 13))
      (then
        (return (i32.const 1))
      )
      (else
    (if (call $host___str_eq (local.get $value) (i32.const 14))
      (then
        (return (i32.const 1))
      )
      (else
    (if (call $host___str_eq (local.get $value) (i32.const 15))
      (then
        (return (i32.const 1))
      )
      (else
    (if (call $host___str_eq (local.get $value) (i32.const 16))
      (then
        (return (i32.const 1))
      )
      (else
    (if (call $host___str_eq (local.get $value) (i32.const 17))
      (then
        (return (i32.const 1))
      )
      (else
    (if (call $host___str_eq (local.get $value) (i32.const 18))
      (then
        (return (i32.const 1))
      )
      (else
    (if (call $host___str_eq (local.get $value) (i32.const 19))
      (then
        (return (i32.const 1))
      )
      (else
    (if (call $host___str_eq (local.get $value) (i32.const 20))
      (then
        (return (i32.const 1))
      )
      (else
    (if (call $host___str_eq (local.get $value) (i32.const 21))
      (then
        (return (i32.const 1))
      )
      (else
    (if (call $host___str_eq (local.get $value) (i32.const 22))
      (then
        (return (i32.const 1))
      )
      (else
    (if (call $host___str_eq (local.get $value) (i32.const 23))
      (then
        (return (i32.const 1))
      )
      (else
    (if (call $host___str_eq (local.get $value) (i32.const 24))
      (then
        (return (i32.const 1))
      )
      (else
    (if (call $host___str_eq (local.get $value) (i32.const 25))
      (then
        (return (i32.const 1))
      )
      (else
    (if (call $host___str_eq (local.get $value) (i32.const 26))
      (then
        (return (i32.const 1))
      )
      (else
    (if (call $host___str_eq (local.get $value) (i32.const 27))
      (then
        (return (i32.const 1))
      )
      (else
    (if (call $host___str_eq (local.get $value) (i32.const 28))
      (then
        (return (i32.const 1))
      )
      (else
    (if (call $host___str_eq (local.get $value) (i32.const 29))
      (then
        (return (i32.const 1))
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
      )
    )
      )
    )
    (i32.const 0)
  )
  (export "isServerOnlyImport" (func $isServerOnlyImport))

  ;; pure flow: validateJsOutputPlan
  (func $validateJsOutputPlan (param $p0 i32) (param $p1 i32) (result i32)
    (local $diagnostics i32)
    (local $__fungi_rec_0 i32)
    (local $runtimeKnown i32)
    (local $__fungi_rec_1 i32)
    (local $moduleFormatKnown i32)
    (local $__fungi_rec_2 i32)
    (local $__fungi_rec_3 i32)
    (local $importIndex i32)
    (local $__while_fuel_0 i32)
    (local $specifierOpt i32)
    (local $__fungi_match_1 i32)
    (local $__fungi_match_2 i32)
    (local $__fungi_rec_4 i32)
    (local $__fungi_rec_5 i32)
    (local $__fungi_rec_6 i32)
    (local $sourceMapModeKnown i32)
    (local $__fungi_rec_7 i32)
    (local $__fungi_rec_8 i32)
    (local $__fungi_rec_9 i32)
    ;; B2 (R&D 0055): per-flow arena reset — reclaim the previous invocation's heap (leaf entry-point)
    (global.set $__fungi_heap (i32.const 1024))
    (local.set $diagnostics (call $host___array_create))
    (if (i32.eq (call $host___str_length (call $host___str_trim (i32.load (i32.add (local.get $p0) (i32.const 0))))) (i32.const 0))
      (then
        (local.set $diagnostics (call $host___array_append (local.get $diagnostics) (block (result i32)
      (local.set $__fungi_rec_0 (global.get $__fungi_heap))
      (global.set $__fungi_heap (i32.add (global.get $__fungi_heap) (i32.const 16)))
      (i32.store (i32.add (local.get $__fungi_rec_0) (i32.const 0)) (i32.const 30)) ;; .code
      (i32.store (i32.add (local.get $__fungi_rec_0) (i32.const 4)) (i32.const 31)) ;; .severity
      (i32.store (i32.add (local.get $__fungi_rec_0) (i32.const 8)) (i32.const 32)) ;; .message
      (i32.store (i32.add (local.get $__fungi_rec_0) (i32.const 12)) (call $host___str_concat (local.get $p1) (i32.const 33))) ;; .path
      (local.get $__fungi_rec_0)
    )))
      )
    )
    (local.set $runtimeKnown (i32.const 0))
    (if (call $host___str_eq (i32.load (i32.add (local.get $p0) (i32.const 4))) (i32.const 34))
      (then
        (local.set $runtimeKnown (i32.const 1))
      )
      (else
    (if (call $host___str_eq (i32.load (i32.add (local.get $p0) (i32.const 4))) (i32.const 35))
      (then
        (local.set $runtimeKnown (i32.const 1))
      )
      (else
      )
    )
      )
    )
    (if (i32.eq (local.get $runtimeKnown) (i32.const 0))
      (then
        (local.set $diagnostics (call $host___array_append (local.get $diagnostics) (block (result i32)
      (local.set $__fungi_rec_1 (global.get $__fungi_heap))
      (global.set $__fungi_heap (i32.add (global.get $__fungi_heap) (i32.const 16)))
      (i32.store (i32.add (local.get $__fungi_rec_1) (i32.const 0)) (i32.const 36)) ;; .code
      (i32.store (i32.add (local.get $__fungi_rec_1) (i32.const 4)) (i32.const 31)) ;; .severity
      (i32.store (i32.add (local.get $__fungi_rec_1) (i32.const 8)) (i32.const 37)) ;; .message
      (i32.store (i32.add (local.get $__fungi_rec_1) (i32.const 12)) (call $host___str_concat (local.get $p1) (i32.const 38))) ;; .path
      (local.get $__fungi_rec_1)
    )))
        (return (local.get $diagnostics))
      )
    )
    (local.set $moduleFormatKnown (i32.const 0))
    (if (call $host___str_eq (i32.load (i32.add (local.get $p0) (i32.const 8))) (i32.const 39))
      (then
        (local.set $moduleFormatKnown (i32.const 1))
      )
      (else
    (if (call $host___str_eq (i32.load (i32.add (local.get $p0) (i32.const 8))) (i32.const 40))
      (then
        (local.set $moduleFormatKnown (i32.const 1))
      )
      (else
      )
    )
      )
    )
    (if (i32.eq (local.get $moduleFormatKnown) (i32.const 0))
      (then
        (local.set $diagnostics (call $host___array_append (local.get $diagnostics) (block (result i32)
      (local.set $__fungi_rec_2 (global.get $__fungi_heap))
      (global.set $__fungi_heap (i32.add (global.get $__fungi_heap) (i32.const 16)))
      (i32.store (i32.add (local.get $__fungi_rec_2) (i32.const 0)) (i32.const 41)) ;; .code
      (i32.store (i32.add (local.get $__fungi_rec_2) (i32.const 4)) (i32.const 31)) ;; .severity
      (i32.store (i32.add (local.get $__fungi_rec_2) (i32.const 8)) (i32.const 42)) ;; .message
      (i32.store (i32.add (local.get $__fungi_rec_2) (i32.const 12)) (call $host___str_concat (local.get $p1) (i32.const 43))) ;; .path
      (local.get $__fungi_rec_2)
    )))
      )
      (else
        (if (i32.and (call $host___str_eq (i32.load (i32.add (local.get $p0) (i32.const 4))) (i32.const 34)) (i32.eqz (call $host___str_eq (i32.load (i32.add (local.get $p0) (i32.const 8))) (i32.const 39))))
          (then
            (local.set $diagnostics (call $host___array_append (local.get $diagnostics) (block (result i32)
      (local.set $__fungi_rec_3 (global.get $__fungi_heap))
      (global.set $__fungi_heap (i32.add (global.get $__fungi_heap) (i32.const 16)))
      (i32.store (i32.add (local.get $__fungi_rec_3) (i32.const 0)) (i32.const 44)) ;; .code
      (i32.store (i32.add (local.get $__fungi_rec_3) (i32.const 4)) (i32.const 31)) ;; .severity
      (i32.store (i32.add (local.get $__fungi_rec_3) (i32.const 8)) (i32.const 45)) ;; .message
      (i32.store (i32.add (local.get $__fungi_rec_3) (i32.const 12)) (call $host___str_concat (local.get $p1) (i32.const 43))) ;; .path
      (local.get $__fungi_rec_3)
    )))
          )
        )
      )
    )
    (if (call $host___str_eq (i32.load (i32.add (local.get $p0) (i32.const 4))) (i32.const 34))
      (then
        (local.set $importIndex (i32.const 0))
        (block $while_exit_0
          (loop $while_loop_0
            (br_if $while_exit_0 (i32.ge_s (local.get $importIndex) (call $host___array_length (i32.load (i32.add (local.get $p0) (i32.const 12))))))
            (local.set $__while_fuel_0 (i32.add (local.get $__while_fuel_0) (i32.const 1)))
            (if (i32.gt_u (local.get $__while_fuel_0) (i32.const 100000)) (then unreachable))
            (local.set $specifierOpt (call $host___array_get_option_v2 (i32.load (i32.add (local.get $p0) (i32.const 12))) (local.get $importIndex)))
            (local.set $__fungi_match_1 (local.get $specifierOpt))
            (if (call $host___option_is_none_v2 (local.get $__fungi_match_1))
              (then
              )
              (else
                (local.set $__fungi_match_2 (call $host___option_value_v2 (local.get $__fungi_match_1)))
                (if (call $isServerOnlyImport (local.get $__fungi_match_2))
                  (then
                    (local.set $diagnostics (call $host___array_append (local.get $diagnostics) (block (result i32)
      (local.set $__fungi_rec_4 (global.get $__fungi_heap))
      (global.set $__fungi_heap (i32.add (global.get $__fungi_heap) (i32.const 16)))
      (i32.store (i32.add (local.get $__fungi_rec_4) (i32.const 0)) (i32.const 46)) ;; .code
      (i32.store (i32.add (local.get $__fungi_rec_4) (i32.const 4)) (i32.const 31)) ;; .severity
      (i32.store (i32.add (local.get $__fungi_rec_4) (i32.const 8)) (call $host___str_concat (call $host___str_concat (call $host___str_concat (call $host___str_concat (i32.const 47) (call $host___int_to_str (call $host___char_from_code (i32.const 34)))) (local.get $__fungi_match_2)) (call $host___int_to_str (call $host___char_from_code (i32.const 34)))) (i32.const 48))) ;; .message
      (i32.store (i32.add (local.get $__fungi_rec_4) (i32.const 12)) (call $host___str_concat (call $host___str_concat (local.get $p1) (i32.const 49)) (call $host___int_to_str (local.get $importIndex)))) ;; .path
      (local.get $__fungi_rec_4)
    )))
                  )
                )
              )
            )
            (local.set $importIndex (call $fungi_checked_add_i32 (local.get $importIndex) (i32.const 1)))
            (br $while_loop_0)
          )
        )
        (if (i32.eq (i32.load (i32.add (local.get $p0) (i32.const 16))) (i32.const 1))
          (then
            (local.set $diagnostics (call $host___array_append (local.get $diagnostics) (block (result i32)
      (local.set $__fungi_rec_5 (global.get $__fungi_heap))
      (global.set $__fungi_heap (i32.add (global.get $__fungi_heap) (i32.const 16)))
      (i32.store (i32.add (local.get $__fungi_rec_5) (i32.const 0)) (i32.const 50)) ;; .code
      (i32.store (i32.add (local.get $__fungi_rec_5) (i32.const 4)) (i32.const 31)) ;; .severity
      (i32.store (i32.add (local.get $__fungi_rec_5) (i32.const 8)) (i32.const 51)) ;; .message
      (i32.store (i32.add (local.get $__fungi_rec_5) (i32.const 12)) (call $host___str_concat (local.get $p1) (i32.const 52))) ;; .path
      (local.get $__fungi_rec_5)
    )))
          )
        )
        (if (i32.eq (i32.load (i32.add (local.get $p0) (i32.const 20))) (i32.const 1))
          (then
            (local.set $diagnostics (call $host___array_append (local.get $diagnostics) (block (result i32)
      (local.set $__fungi_rec_6 (global.get $__fungi_heap))
      (global.set $__fungi_heap (i32.add (global.get $__fungi_heap) (i32.const 16)))
      (i32.store (i32.add (local.get $__fungi_rec_6) (i32.const 0)) (i32.const 53)) ;; .code
      (i32.store (i32.add (local.get $__fungi_rec_6) (i32.const 4)) (i32.const 31)) ;; .severity
      (i32.store (i32.add (local.get $__fungi_rec_6) (i32.const 8)) (i32.const 54)) ;; .message
      (i32.store (i32.add (local.get $__fungi_rec_6) (i32.const 12)) (call $host___str_concat (local.get $p1) (i32.const 55))) ;; .path
      (local.get $__fungi_rec_6)
    )))
          )
        )
      )
    )
    (local.set $sourceMapModeKnown (i32.const 0))
    (if (call $host___str_eq (i32.load (i32.add (i32.load (i32.add (local.get $p0) (i32.const 24))) (i32.const 0))) (i32.const 56))
      (then
        (local.set $sourceMapModeKnown (i32.const 1))
      )
      (else
    (if (call $host___str_eq (i32.load (i32.add (i32.load (i32.add (local.get $p0) (i32.const 24))) (i32.const 0))) (i32.const 57))
      (then
        (local.set $sourceMapModeKnown (i32.const 1))
      )
      (else
    (if (call $host___str_eq (i32.load (i32.add (i32.load (i32.add (local.get $p0) (i32.const 24))) (i32.const 0))) (i32.const 58))
      (then
        (local.set $sourceMapModeKnown (i32.const 1))
      )
      (else
      )
    )
      )
    )
      )
    )
    (if (i32.eq (local.get $sourceMapModeKnown) (i32.const 0))
      (then
        (local.set $diagnostics (call $host___array_append (local.get $diagnostics) (block (result i32)
      (local.set $__fungi_rec_7 (global.get $__fungi_heap))
      (global.set $__fungi_heap (i32.add (global.get $__fungi_heap) (i32.const 16)))
      (i32.store (i32.add (local.get $__fungi_rec_7) (i32.const 0)) (i32.const 59)) ;; .code
      (i32.store (i32.add (local.get $__fungi_rec_7) (i32.const 4)) (i32.const 31)) ;; .severity
      (i32.store (i32.add (local.get $__fungi_rec_7) (i32.const 8)) (i32.const 60)) ;; .message
      (i32.store (i32.add (local.get $__fungi_rec_7) (i32.const 12)) (call $host___str_concat (local.get $p1) (i32.const 61))) ;; .path
      (local.get $__fungi_rec_7)
    )))
      )
      (else
        (if (i32.and (i32.load (i32.add (i32.load (i32.add (local.get $p0) (i32.const 24))) (i32.const 8))) (call $host___str_eq (i32.load (i32.add (local.get $p0) (i32.const 4))) (i32.const 34)))
          (then
            (if (call $host___str_eq (i32.load (i32.add (i32.load (i32.add (local.get $p0) (i32.const 24))) (i32.const 0))) (i32.const 57))
              (then
                (local.set $diagnostics (call $host___array_append (local.get $diagnostics) (block (result i32)
      (local.set $__fungi_rec_8 (global.get $__fungi_heap))
      (global.set $__fungi_heap (i32.add (global.get $__fungi_heap) (i32.const 16)))
      (i32.store (i32.add (local.get $__fungi_rec_8) (i32.const 0)) (i32.const 62)) ;; .code
      (i32.store (i32.add (local.get $__fungi_rec_8) (i32.const 4)) (i32.const 63)) ;; .severity
      (i32.store (i32.add (local.get $__fungi_rec_8) (i32.const 8)) (i32.const 64)) ;; .message
      (i32.store (i32.add (local.get $__fungi_rec_8) (i32.const 12)) (call $host___str_concat (local.get $p1) (i32.const 61))) ;; .path
      (local.get $__fungi_rec_8)
    )))
              )
            )
            (if (i32.and (i32.load (i32.add (i32.load (i32.add (local.get $p0) (i32.const 24))) (i32.const 4))) (i32.eqz (call $host___str_eq (i32.load (i32.add (i32.load (i32.add (local.get $p0) (i32.const 24))) (i32.const 0))) (i32.const 58))))
              (then
                (local.set $diagnostics (call $host___array_append (local.get $diagnostics) (block (result i32)
      (local.set $__fungi_rec_9 (global.get $__fungi_heap))
      (global.set $__fungi_heap (i32.add (global.get $__fungi_heap) (i32.const 16)))
      (i32.store (i32.add (local.get $__fungi_rec_9) (i32.const 0)) (i32.const 65)) ;; .code
      (i32.store (i32.add (local.get $__fungi_rec_9) (i32.const 4)) (i32.const 31)) ;; .severity
      (i32.store (i32.add (local.get $__fungi_rec_9) (i32.const 8)) (i32.const 66)) ;; .message
      (i32.store (i32.add (local.get $__fungi_rec_9) (i32.const 12)) (call $host___str_concat (local.get $p1) (i32.const 67))) ;; .path
      (local.get $__fungi_rec_9)
    )))
              )
            )
          )
        )
      )
    )
    (local.get $diagnostics)
  )
  (export "validateJsOutputPlan" (func $validateJsOutputPlan))

)