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
  (import "host" "__int_to_str" (func $host___int_to_str (param $p0 i32) (result i32)))
  ;; effect: stdlib.string
  (import "host" "__str_eq" (func $host___str_eq (param $p0 i32) (param $p1 i32) (result i32)))
  ;; effect: stdlib.string
  (import "host" "__str_trim" (func $host___str_trim (param $p0 i32) (result i32)))
  ;; effect: stdlib.char
  (import "host" "__char_from_code" (func $host___char_from_code (param $p0 i32) (result i32)))

  (memory 2 2048)
  (export "memory" (memory 0))

  ;; P9.4b: bump-allocator heap pointer for record struct layout
  (global $__fungi_heap (mut i32) (i32.const 1024))

  ;; pure flow: validateRenderableContent
  (func $validateRenderableContent (param $p0 i32) (param $p1 i32) (result i32)
    (local $diagnostics i32)
    (local $knownKind i32)
    (local $__fungi_rec_0 i32)
    (local $__fungi_rec_1 i32)
    ;; B2 (R&D 0055): per-flow arena reset — reclaim the previous invocation's heap (leaf entry-point)
    (global.set $__fungi_heap (i32.const 1024))
    (local.set $diagnostics (call $host___array_create))
    (local.set $knownKind (i32.const 0))
    (if (call $host___str_eq (i32.load (i32.add (local.get $p0) (i32.const 0))) (i32.const 1))
      (then
        (local.set $knownKind (i32.const 1))
      )
      (else
    (if (call $host___str_eq (i32.load (i32.add (local.get $p0) (i32.const 0))) (i32.const 2))
      (then
        (local.set $knownKind (i32.const 1))
      )
      (else
      )
    )
      )
    )
    (if (i32.eq (local.get $knownKind) (i32.const 0))
      (then
        (local.set $diagnostics (call $host___array_append (local.get $diagnostics) (block (result i32)
      (local.set $__fungi_rec_0 (global.get $__fungi_heap))
      (global.set $__fungi_heap (i32.add (global.get $__fungi_heap) (i32.const 16)))
      (i32.store (i32.add (local.get $__fungi_rec_0) (i32.const 0)) (i32.const 3)) ;; .code
      (i32.store (i32.add (local.get $__fungi_rec_0) (i32.const 4)) (i32.const 4)) ;; .severity
      (i32.store (i32.add (local.get $__fungi_rec_0) (i32.const 8)) (call $host___str_concat (call $host___str_concat (call $host___str_concat (call $host___str_concat (call $host___str_concat (call $host___str_concat (call $host___str_concat (call $host___str_concat (call $host___str_concat (call $host___str_concat (call $host___str_concat (call $host___str_concat (i32.const 5) (call $host___int_to_str (call $host___char_from_code (i32.const 34)))) (i32.load (i32.add (local.get $p0) (i32.const 0)))) (call $host___int_to_str (call $host___char_from_code (i32.const 34)))) (i32.const 6)) (call $host___int_to_str (call $host___char_from_code (i32.const 34)))) (i32.const 1)) (call $host___int_to_str (call $host___char_from_code (i32.const 34)))) (i32.const 7)) (call $host___int_to_str (call $host___char_from_code (i32.const 34)))) (i32.const 2)) (call $host___int_to_str (call $host___char_from_code (i32.const 34)))) (i32.const 8))) ;; .message
      (i32.store (i32.add (local.get $__fungi_rec_0) (i32.const 12)) (call $host___str_concat (local.get $p1) (i32.const 9))) ;; .path
      (local.get $__fungi_rec_0)
    )))
        (return (local.get $diagnostics))
      )
    )
    (if (i32.and (call $host___str_eq (i32.load (i32.add (local.get $p0) (i32.const 0))) (i32.const 2)) (i32.eq (call $host___str_length (call $host___str_trim (i32.load (i32.add (local.get $p0) (i32.const 4))))) (i32.const 0)))
      (then
        (local.set $diagnostics (call $host___array_append (local.get $diagnostics) (block (result i32)
      (local.set $__fungi_rec_1 (global.get $__fungi_heap))
      (global.set $__fungi_heap (i32.add (global.get $__fungi_heap) (i32.const 16)))
      (i32.store (i32.add (local.get $__fungi_rec_1) (i32.const 0)) (i32.const 10)) ;; .code
      (i32.store (i32.add (local.get $__fungi_rec_1) (i32.const 4)) (i32.const 4)) ;; .severity
      (i32.store (i32.add (local.get $__fungi_rec_1) (i32.const 8)) (i32.const 11)) ;; .message
      (i32.store (i32.add (local.get $__fungi_rec_1) (i32.const 12)) (call $host___str_concat (local.get $p1) (i32.const 12))) ;; .path
      (local.get $__fungi_rec_1)
    )))
      )
    )
    (local.get $diagnostics)
  )
  (export "validateRenderableContent" (func $validateRenderableContent))

)