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
  (import "host" "__str_ends_with" (func $host___str_ends_with (param $p0 i32) (param $p1 i32) (result i32)))
  ;; effect: stdlib.string
  (import "host" "__str_to_lower" (func $host___str_to_lower (param $p0 i32) (result i32)))
  ;; effect: stdlib.string
  (import "host" "__str_trim" (func $host___str_trim (param $p0 i32) (result i32)))
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

  ;; pure flow: isPositiveStaticDimension
  (func $isPositiveStaticDimension (param $p0 i32) (result i32)
    (i32.gt_s (local.get $p0) (i32.const 0))
  )
  (export "isPositiveStaticDimension" (func $isPositiveStaticDimension))

  ;; pure flow: validateAiAcceleratorModel
  (func $validateAiAcceleratorModel (param $p0 i32) (result i32)
    (local $diagnostics i32)
    (local $__fungi_rec_0 i32)
    (local $__fungi_rec_1 i32)
    (local $tensorIndex i32)
    (local $__while_fuel_0 i32)
    (local $tensorOpt i32)
    (local $__fungi_match_1 i32)
    (local $__fungi_match_2 i32)
    (local $shapeInvalid i32)
    (local $dimensionIndex i32)
    (local $__while_fuel_3 i32)
    (local $dimensionOpt i32)
    (local $__fungi_match_4 i32)
    (local $__fungi_match_5 i32)
    (local $__fungi_rec_2 i32)
    ;; B2 (R&D 0055): per-flow arena reset — reclaim the previous invocation's heap (leaf entry-point)
    (global.set $__fungi_heap (i32.const 1024))
    (local.set $diagnostics (call $host___array_create))
    (if (i32.eq (call $host___str_length (call $host___str_trim (i32.load (i32.add (local.get $p0) (i32.const 0))))) (i32.const 0))
      (then
        (local.set $diagnostics (call $host___array_append (local.get $diagnostics) (block (result i32)
      (local.set $__fungi_rec_0 (global.get $__fungi_heap))
      (global.set $__fungi_heap (i32.add (global.get $__fungi_heap) (i32.const 16)))
      (i32.store (i32.add (local.get $__fungi_rec_0) (i32.const 0)) (i32.const 1)) ;; .code
      (i32.store (i32.add (local.get $__fungi_rec_0) (i32.const 4)) (i32.const 2)) ;; .severity
      (i32.store (i32.add (local.get $__fungi_rec_0) (i32.const 8)) (i32.const 3)) ;; .message
      (i32.store (i32.add (local.get $__fungi_rec_0) (i32.const 12)) (i32.const 4)) ;; .path
      (local.get $__fungi_rec_0)
    )))
      )
    )
    (if (i32.and (call $host___str_eq (i32.load (i32.add (local.get $p0) (i32.const 4))) (i32.const 5)) (i32.eq (call $host___str_ends_with (call $host___str_to_lower (i32.load (i32.add (local.get $p0) (i32.const 0)))) (i32.const 6)) (i32.const 0)))
      (then
        (local.set $diagnostics (call $host___array_append (local.get $diagnostics) (block (result i32)
      (local.set $__fungi_rec_1 (global.get $__fungi_heap))
      (global.set $__fungi_heap (i32.add (global.get $__fungi_heap) (i32.const 16)))
      (i32.store (i32.add (local.get $__fungi_rec_1) (i32.const 0)) (i32.const 7)) ;; .code
      (i32.store (i32.add (local.get $__fungi_rec_1) (i32.const 4)) (i32.const 2)) ;; .severity
      (i32.store (i32.add (local.get $__fungi_rec_1) (i32.const 8)) (i32.const 8)) ;; .message
      (i32.store (i32.add (local.get $__fungi_rec_1) (i32.const 12)) (i32.const 4)) ;; .path
      (local.get $__fungi_rec_1)
    )))
      )
    )
    (local.set $tensorIndex (i32.const 0))
    (block $while_exit_0
      (loop $while_loop_0
        (br_if $while_exit_0 (i32.ge_s (local.get $tensorIndex) (call $host___array_length (i32.load (i32.add (local.get $p0) (i32.const 8))))))
        (local.set $__while_fuel_0 (i32.add (local.get $__while_fuel_0) (i32.const 1)))
        (if (i32.gt_u (local.get $__while_fuel_0) (i32.const 100000)) (then unreachable))
        (local.set $tensorOpt (call $host___array_get_option_v2 (i32.load (i32.add (local.get $p0) (i32.const 8))) (local.get $tensorIndex)))
        (local.set $__fungi_match_1 (local.get $tensorOpt))
        (if (call $host___option_is_none_v2 (local.get $__fungi_match_1))
          (then
          )
          (else
            (local.set $__fungi_match_2 (call $host___option_value_v2 (local.get $__fungi_match_1)))
            (local.set $shapeInvalid (i32.const 0))
            (local.set $dimensionIndex (i32.const 0))
            (block $while_exit_3
              (loop $while_loop_3
                (br_if $while_exit_3 (i32.eqz (i32.and (i32.lt_s (local.get $dimensionIndex) (call $host___array_length (i32.load (i32.add (local.get $__fungi_match_2) (i32.const 0))))) (i32.eq (local.get $shapeInvalid) (i32.const 0)))))
                (local.set $__while_fuel_3 (i32.add (local.get $__while_fuel_3) (i32.const 1)))
                (if (i32.gt_u (local.get $__while_fuel_3) (i32.const 100000)) (then unreachable))
                (local.set $dimensionOpt (call $host___array_get_option_v2 (i32.load (i32.add (local.get $__fungi_match_2) (i32.const 0))) (local.get $dimensionIndex)))
                (local.set $__fungi_match_4 (local.get $dimensionOpt))
                (if (call $host___option_is_none_v2 (local.get $__fungi_match_4))
                  (then
                    (local.set $shapeInvalid (i32.const 1))
                  )
                  (else
                    (local.set $__fungi_match_5 (call $host___option_value_v2 (local.get $__fungi_match_4)))
                    (if (i32.eq (call $isPositiveStaticDimension (local.get $__fungi_match_5)) (i32.const 0))
                      (then
                        (local.set $shapeInvalid (i32.const 1))
                      )
                    )
                  )
                )
                (local.set $dimensionIndex (call $fungi_checked_add_i32 (local.get $dimensionIndex) (i32.const 1)))
                (br $while_loop_3)
              )
            )
            (if (i32.eq (local.get $shapeInvalid) (i32.const 1))
              (then
                (local.set $diagnostics (call $host___array_append (local.get $diagnostics) (block (result i32)
      (local.set $__fungi_rec_2 (global.get $__fungi_heap))
      (global.set $__fungi_heap (i32.add (global.get $__fungi_heap) (i32.const 16)))
      (i32.store (i32.add (local.get $__fungi_rec_2) (i32.const 0)) (i32.const 9)) ;; .code
      (i32.store (i32.add (local.get $__fungi_rec_2) (i32.const 4)) (i32.const 2)) ;; .severity
      (i32.store (i32.add (local.get $__fungi_rec_2) (i32.const 8)) (i32.const 10)) ;; .message
      (i32.store (i32.add (local.get $__fungi_rec_2) (i32.const 12)) (call $host___str_concat (call $host___str_concat (i32.const 11) (call $host___int_to_str (local.get $tensorIndex))) (i32.const 12))) ;; .path
      (local.get $__fungi_rec_2)
    )))
              )
            )
          )
        )
        (local.set $tensorIndex (call $fungi_checked_add_i32 (local.get $tensorIndex) (i32.const 1)))
        (br $while_loop_0)
      )
    )
    (local.get $diagnostics)
  )
  (export "validateAiAcceleratorModel" (func $validateAiAcceleratorModel))

)