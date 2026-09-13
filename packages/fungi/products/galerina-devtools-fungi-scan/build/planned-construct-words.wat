(module
  ;; effect: stdlib.array
  (import "host" "__array_create" (func $host___array_create (result i32)))
  ;; effect: stdlib.array
  (import "host" "__array_append" (func $host___array_append (param $p0 i32) (param $p1 i32) (result i32)))

  (memory 2 2048)
  (export "memory" (memory 0))

  ;; pure flow: plannedConstructWords
  (func $plannedConstructWords (result i32)
    (local $words i32)
    (local.set $words (call $host___array_create))
    (local.set $words (call $host___array_append (local.get $words) (i32.const 1)))
    (local.set $words (call $host___array_append (local.get $words) (i32.const 2)))
    (local.set $words (call $host___array_append (local.get $words) (i32.const 3)))
    (local.set $words (call $host___array_append (local.get $words) (i32.const 4)))
    (local.set $words (call $host___array_append (local.get $words) (i32.const 5)))
    (local.set $words (call $host___array_append (local.get $words) (i32.const 6)))
    (local.set $words (call $host___array_append (local.get $words) (i32.const 7)))
    (local.set $words (call $host___array_append (local.get $words) (i32.const 8)))
    (local.set $words (call $host___array_append (local.get $words) (i32.const 9)))
    (local.set $words (call $host___array_append (local.get $words) (i32.const 10)))
    (local.set $words (call $host___array_append (local.get $words) (i32.const 11)))
    (local.set $words (call $host___array_append (local.get $words) (i32.const 12)))
    (local.set $words (call $host___array_append (local.get $words) (i32.const 13)))
    (local.set $words (call $host___array_append (local.get $words) (i32.const 14)))
    (local.set $words (call $host___array_append (local.get $words) (i32.const 15)))
    (local.get $words)
  )
  (export "plannedConstructWords" (func $plannedConstructWords))

)