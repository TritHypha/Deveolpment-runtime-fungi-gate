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
  (import "host" "__str_eq" (func $host___str_eq (param $p0 i32) (param $p1 i32) (result i32)))
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

  ;; pure flow: validateNativeTargetAtPath
  (func $validateNativeTargetAtPath (param $p0 i32) (param $p1 i32) (result i32)
    (local $diagnostics i32)
    (local $__fungi_rec_0 i32)
    (local $__fungi_rec_1 i32)
    (local $__fungi_rec_2 i32)
    (local $__fungi_match_0 i32)
    (local $__fungi_match_1 i32)
    (local $knownAbi i32)
    (local $__fungi_rec_3 i32)
    (local $knownExecutionMode i32)
    (local $__fungi_rec_4 i32)
    (local.set $diagnostics (call $host___array_create))
    (if (i32.eq (call $host___str_length (call $host___str_trim (i32.load (i32.add (local.get $p0) (i32.const 0))))) (i32.const 0))
      (then
        (local.set $diagnostics (call $host___array_append (local.get $diagnostics) (block (result i32)
      (local.set $__fungi_rec_0 (global.get $__fungi_heap))
      (global.set $__fungi_heap (i32.add (global.get $__fungi_heap) (i32.const 16)))
      (i32.store (i32.add (local.get $__fungi_rec_0) (i32.const 0)) (i32.const 1)) ;; .code
      (i32.store (i32.add (local.get $__fungi_rec_0) (i32.const 4)) (i32.const 2)) ;; .severity
      (i32.store (i32.add (local.get $__fungi_rec_0) (i32.const 8)) (i32.const 3)) ;; .message
      (i32.store (i32.add (local.get $__fungi_rec_0) (i32.const 12)) (call $host___str_concat (local.get $p1) (i32.const 4))) ;; .path
      (local.get $__fungi_rec_0)
    )))
      )
    )
    (if (i32.eq (call $host___str_length (call $host___str_trim (i32.load (i32.add (local.get $p0) (i32.const 4))))) (i32.const 0))
      (then
        (local.set $diagnostics (call $host___array_append (local.get $diagnostics) (block (result i32)
      (local.set $__fungi_rec_1 (global.get $__fungi_heap))
      (global.set $__fungi_heap (i32.add (global.get $__fungi_heap) (i32.const 16)))
      (i32.store (i32.add (local.get $__fungi_rec_1) (i32.const 0)) (i32.const 1)) ;; .code
      (i32.store (i32.add (local.get $__fungi_rec_1) (i32.const 4)) (i32.const 2)) ;; .severity
      (i32.store (i32.add (local.get $__fungi_rec_1) (i32.const 8)) (i32.const 5)) ;; .message
      (i32.store (i32.add (local.get $__fungi_rec_1) (i32.const 12)) (call $host___str_concat (local.get $p1) (i32.const 6))) ;; .path
      (local.get $__fungi_rec_1)
    )))
      )
    )
    (if (i32.eq (call $host___str_length (call $host___str_trim (i32.load (i32.add (local.get $p0) (i32.const 8))))) (i32.const 0))
      (then
        (local.set $diagnostics (call $host___array_append (local.get $diagnostics) (block (result i32)
      (local.set $__fungi_rec_2 (global.get $__fungi_heap))
      (global.set $__fungi_heap (i32.add (global.get $__fungi_heap) (i32.const 16)))
      (i32.store (i32.add (local.get $__fungi_rec_2) (i32.const 0)) (i32.const 1)) ;; .code
      (i32.store (i32.add (local.get $__fungi_rec_2) (i32.const 4)) (i32.const 2)) ;; .severity
      (i32.store (i32.add (local.get $__fungi_rec_2) (i32.const 8)) (i32.const 7)) ;; .message
      (i32.store (i32.add (local.get $__fungi_rec_2) (i32.const 12)) (call $host___str_concat (local.get $p1) (i32.const 8))) ;; .path
      (local.get $__fungi_rec_2)
    )))
      )
    )
    (local.set $__fungi_match_0 (i32.load (i32.add (local.get $p0) (i32.const 12))))
    (if (call $host___option_is_none_v2 (local.get $__fungi_match_0))
      (then
      )
      (else
        (local.set $__fungi_match_1 (call $host___option_value_v2 (local.get $__fungi_match_0)))
        (local.set $knownAbi (i32.const 0))
        (if (call $host___str_eq (local.get $__fungi_match_1) (i32.const 9))
          (then
            (local.set $knownAbi (i32.const 1))
          )
          (else
        (if (call $host___str_eq (local.get $__fungi_match_1) (i32.const 10))
          (then
            (local.set $knownAbi (i32.const 1))
          )
          (else
        (if (call $host___str_eq (local.get $__fungi_match_1) (i32.const 11))
          (then
            (local.set $knownAbi (i32.const 1))
          )
          (else
        (if (call $host___str_eq (local.get $__fungi_match_1) (i32.const 12))
          (then
            (local.set $knownAbi (i32.const 1))
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
        (if (i32.eq (local.get $knownAbi) (i32.const 0))
          (then
            (local.set $diagnostics (call $host___array_append (local.get $diagnostics) (block (result i32)
      (local.set $__fungi_rec_3 (global.get $__fungi_heap))
      (global.set $__fungi_heap (i32.add (global.get $__fungi_heap) (i32.const 16)))
      (i32.store (i32.add (local.get $__fungi_rec_3) (i32.const 0)) (i32.const 13)) ;; .code
      (i32.store (i32.add (local.get $__fungi_rec_3) (i32.const 4)) (i32.const 2)) ;; .severity
      (i32.store (i32.add (local.get $__fungi_rec_3) (i32.const 8)) (i32.const 14)) ;; .message
      (i32.store (i32.add (local.get $__fungi_rec_3) (i32.const 12)) (call $host___str_concat (local.get $p1) (i32.const 15))) ;; .path
      (local.get $__fungi_rec_3)
    )))
          )
        )
      )
    )
    (local.set $knownExecutionMode (i32.const 0))
    (if (call $host___str_eq (i32.load (i32.add (local.get $p0) (i32.const 16))) (i32.const 16))
      (then
        (local.set $knownExecutionMode (i32.const 1))
      )
      (else
    (if (call $host___str_eq (i32.load (i32.add (local.get $p0) (i32.const 16))) (i32.const 17))
      (then
        (local.set $knownExecutionMode (i32.const 1))
      )
      (else
      )
    )
      )
    )
    (if (i32.eq (local.get $knownExecutionMode) (i32.const 0))
      (then
        (local.set $diagnostics (call $host___array_append (local.get $diagnostics) (block (result i32)
      (local.set $__fungi_rec_4 (global.get $__fungi_heap))
      (global.set $__fungi_heap (i32.add (global.get $__fungi_heap) (i32.const 16)))
      (i32.store (i32.add (local.get $__fungi_rec_4) (i32.const 0)) (i32.const 18)) ;; .code
      (i32.store (i32.add (local.get $__fungi_rec_4) (i32.const 4)) (i32.const 2)) ;; .severity
      (i32.store (i32.add (local.get $__fungi_rec_4) (i32.const 8)) (i32.const 19)) ;; .message
      (i32.store (i32.add (local.get $__fungi_rec_4) (i32.const 12)) (call $host___str_concat (local.get $p1) (i32.const 20))) ;; .path
      (local.get $__fungi_rec_4)
    )))
      )
    )
    (local.get $diagnostics)
  )
  (export "validateNativeTargetAtPath" (func $validateNativeTargetAtPath))

  ;; pure flow: validateNativeTarget
  (func $validateNativeTarget (param $p0 i32) (result i32)
    ;; B2 (R&D 0055): per-flow arena reset — reclaim the previous invocation's heap (leaf entry-point)
    (global.set $__fungi_heap (i32.const 1024))
    (call $validateNativeTargetAtPath (local.get $p0) (i32.const 21))
  )
  (export "validateNativeTarget" (func $validateNativeTarget))

)