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
  (import "host" "__str_to_lower" (func $host___str_to_lower (param $p0 i32) (result i32)))
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

  ;; pure flow: isHexDigit
  (func $isHexDigit (param $p0 i32) (result i32)
    (local $codePoint i32)
    (local.set $codePoint (local.get $p0))
    (if (i32.and (i32.ge_s (local.get $codePoint) (i32.const 48)) (i32.le_s (local.get $codePoint) (i32.const 57)))
      (then
        (return (i32.const 1))
      )
    )
    (if (i32.and (i32.ge_s (local.get $codePoint) (i32.const 97)) (i32.le_s (local.get $codePoint) (i32.const 102)))
      (then
        (return (i32.const 1))
      )
    )
    (i32.const 0)
  )
  (export "isHexDigit" (func $isHexDigit))

  ;; pure flow: validateChecksumRef
  (func $validateChecksumRef (param $p0 i32) (param $p1 i32) (result i32)
    (local $expectedLength i32)
    (local $__fungi_rec_0 i32)
    (local $digest i32)
    (local $__fungi_rec_1 i32)
    (local $valid i32)
    (local $index i32)
    (local $__while_fuel_0 i32)
    (local $characterOpt i32)
    (local $__fungi_match_1 i32)
    (local $__fungi_match_2 i32)
    (local $__fungi_rec_2 i32)
    (local.set $expectedLength (i32.const 0))
    (if (call $host___str_eq (i32.load (i32.add (local.get $p0) (i32.const 0))) (i32.const 1))
      (then
        (local.set $expectedLength (i32.const 64))
      )
      (else
    (if (call $host___str_eq (i32.load (i32.add (local.get $p0) (i32.const 0))) (i32.const 2))
      (then
        (local.set $expectedLength (i32.const 96))
      )
      (else
    (if (call $host___str_eq (i32.load (i32.add (local.get $p0) (i32.const 0))) (i32.const 3))
      (then
        (local.set $expectedLength (i32.const 128))
      )
      (else
    (if (call $host___str_eq (i32.load (i32.add (local.get $p0) (i32.const 0))) (i32.const 4))
      (then
        (local.set $expectedLength (i32.const 64))
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
    (if (i32.eq (local.get $expectedLength) (i32.const 0))
      (then
        (return (call $host___array_append (call $host___array_create) (block (result i32)
      (local.set $__fungi_rec_0 (global.get $__fungi_heap))
      (global.set $__fungi_heap (i32.add (global.get $__fungi_heap) (i32.const 16)))
      (i32.store (i32.add (local.get $__fungi_rec_0) (i32.const 0)) (i32.const 5)) ;; .code
      (i32.store (i32.add (local.get $__fungi_rec_0) (i32.const 4)) (i32.const 6)) ;; .severity
      (i32.store (i32.add (local.get $__fungi_rec_0) (i32.const 8)) (call $host___str_concat (call $host___str_concat (i32.const 7) (i32.load (i32.add (local.get $p0) (i32.const 0)))) (i32.const 8))) ;; .message
      (i32.store (i32.add (local.get $__fungi_rec_0) (i32.const 12)) (call $host___str_concat (local.get $p1) (i32.const 9))) ;; .path
      (local.get $__fungi_rec_0)
    )))
      )
    )
    (local.set $digest (call $host___str_to_lower (i32.load (i32.add (local.get $p0) (i32.const 4)))))
    (if (i32.ne (call $host___str_length (local.get $digest)) (local.get $expectedLength))
      (then
        (return (call $host___array_append (call $host___array_create) (block (result i32)
      (local.set $__fungi_rec_1 (global.get $__fungi_heap))
      (global.set $__fungi_heap (i32.add (global.get $__fungi_heap) (i32.const 16)))
      (i32.store (i32.add (local.get $__fungi_rec_1) (i32.const 0)) (i32.const 10)) ;; .code
      (i32.store (i32.add (local.get $__fungi_rec_1) (i32.const 4)) (i32.const 6)) ;; .severity
      (i32.store (i32.add (local.get $__fungi_rec_1) (i32.const 8)) (call $host___str_concat (call $host___str_concat (call $host___str_concat (call $host___str_concat (i32.const 11) (call $host___int_to_str (local.get $expectedLength))) (i32.const 12)) (i32.load (i32.add (local.get $p0) (i32.const 0)))) (i32.const 13))) ;; .message
      (i32.store (i32.add (local.get $__fungi_rec_1) (i32.const 12)) (call $host___str_concat (local.get $p1) (i32.const 14))) ;; .path
      (local.get $__fungi_rec_1)
    )))
      )
    )
    (local.set $valid (i32.const 1))
    (local.set $index (i32.const 0))
    (block $while_exit_0
      (loop $while_loop_0
        (br_if $while_exit_0 (i32.ge_s (local.get $index) (local.get $expectedLength)))
        (local.set $__while_fuel_0 (i32.add (local.get $__while_fuel_0) (i32.const 1)))
        (if (i32.gt_u (local.get $__while_fuel_0) (i32.const 100000)) (then unreachable))
        (local.set $characterOpt (call $host___str_char_at_option_v2 (local.get $digest) (local.get $index)))
        (local.set $__fungi_match_1 (local.get $characterOpt))
        (if (call $host___option_is_none_v2 (local.get $__fungi_match_1))
          (then
            (local.set $valid (i32.const 0))
          )
          (else
            (local.set $__fungi_match_2 (call $host___option_value_v2 (local.get $__fungi_match_1)))
            (if (i32.eq (call $isHexDigit (local.get $__fungi_match_2)) (i32.const 0))
              (then
                (local.set $valid (i32.const 0))
              )
            )
          )
        )
        (local.set $index (call $fungi_checked_add_i32 (local.get $index) (i32.const 1)))
        (br $while_loop_0)
      )
    )
    (if (i32.eq (local.get $valid) (i32.const 0))
      (then
        (return (call $host___array_append (call $host___array_create) (block (result i32)
      (local.set $__fungi_rec_2 (global.get $__fungi_heap))
      (global.set $__fungi_heap (i32.add (global.get $__fungi_heap) (i32.const 16)))
      (i32.store (i32.add (local.get $__fungi_rec_2) (i32.const 0)) (i32.const 10)) ;; .code
      (i32.store (i32.add (local.get $__fungi_rec_2) (i32.const 4)) (i32.const 6)) ;; .severity
      (i32.store (i32.add (local.get $__fungi_rec_2) (i32.const 8)) (call $host___str_concat (call $host___str_concat (call $host___str_concat (call $host___str_concat (i32.const 11) (call $host___int_to_str (local.get $expectedLength))) (i32.const 12)) (i32.load (i32.add (local.get $p0) (i32.const 0)))) (i32.const 13))) ;; .message
      (i32.store (i32.add (local.get $__fungi_rec_2) (i32.const 12)) (call $host___str_concat (local.get $p1) (i32.const 14))) ;; .path
      (local.get $__fungi_rec_2)
    )))
      )
    )
    (call $host___array_create)
  )
  (export "validateChecksumRef" (func $validateChecksumRef))

  ;; pure flow: validateChecksumRefDefault
  (func $validateChecksumRefDefault (param $p0 i32) (result i32)
    ;; B2 (R&D 0055): per-flow arena reset — reclaim the previous invocation's heap (leaf entry-point)
    (global.set $__fungi_heap (i32.const 1024))
    (call $validateChecksumRef (local.get $p0) (i32.const 15))
  )
  (export "validateChecksumRefDefault" (func $validateChecksumRefDefault))

)