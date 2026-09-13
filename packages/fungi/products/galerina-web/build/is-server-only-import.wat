(module
  ;; effect: stdlib.string
  (import "host" "__str_eq" (func $host___str_eq (param $p0 i32) (param $p1 i32) (result i32)))
  ;; effect: stdlib.string
  (import "host" "__str_starts_with" (func $host___str_starts_with (param $p0 i32) (param $p1 i32) (result i32)))
  ;; effect: stdlib.string
  (import "host" "__str_trim" (func $host___str_trim (param $p0 i32) (result i32)))

  (memory 2 2048)
  (export "memory" (memory 0))

  ;; pure flow: isServerOnlyImport
  (func $isServerOnlyImport (param $p0 i32) (result i32)
    (local $s i32)
    (local $known i32)
    (local.set $s (call $host___str_trim (local.get $p0)))
    (if (call $host___str_starts_with (local.get $s) (i32.const 1))
      (then
        (return (i32.const 1))
      )
    )
    (local.set $known (i32.const 0))
    (if (call $host___str_eq (local.get $s) (i32.const 2))
      (then
        (local.set $known (i32.const 1))
      )
      (else
    (if (call $host___str_eq (local.get $s) (i32.const 3))
      (then
        (local.set $known (i32.const 1))
      )
      (else
    (if (call $host___str_eq (local.get $s) (i32.const 4))
      (then
        (local.set $known (i32.const 1))
      )
      (else
    (if (call $host___str_eq (local.get $s) (i32.const 5))
      (then
        (local.set $known (i32.const 1))
      )
      (else
    (if (call $host___str_eq (local.get $s) (i32.const 6))
      (then
        (local.set $known (i32.const 1))
      )
      (else
    (if (call $host___str_eq (local.get $s) (i32.const 7))
      (then
        (local.set $known (i32.const 1))
      )
      (else
    (if (call $host___str_eq (local.get $s) (i32.const 8))
      (then
        (local.set $known (i32.const 1))
      )
      (else
    (if (call $host___str_eq (local.get $s) (i32.const 9))
      (then
        (local.set $known (i32.const 1))
      )
      (else
    (if (call $host___str_eq (local.get $s) (i32.const 10))
      (then
        (local.set $known (i32.const 1))
      )
      (else
    (if (call $host___str_eq (local.get $s) (i32.const 11))
      (then
        (local.set $known (i32.const 1))
      )
      (else
    (if (call $host___str_eq (local.get $s) (i32.const 12))
      (then
        (local.set $known (i32.const 1))
      )
      (else
    (if (call $host___str_eq (local.get $s) (i32.const 13))
      (then
        (local.set $known (i32.const 1))
      )
      (else
    (if (call $host___str_eq (local.get $s) (i32.const 14))
      (then
        (local.set $known (i32.const 1))
      )
      (else
    (if (call $host___str_eq (local.get $s) (i32.const 15))
      (then
        (local.set $known (i32.const 1))
      )
      (else
    (if (call $host___str_eq (local.get $s) (i32.const 16))
      (then
        (local.set $known (i32.const 1))
      )
      (else
    (if (call $host___str_eq (local.get $s) (i32.const 17))
      (then
        (local.set $known (i32.const 1))
      )
      (else
    (if (call $host___str_eq (local.get $s) (i32.const 18))
      (then
        (local.set $known (i32.const 1))
      )
      (else
    (if (call $host___str_eq (local.get $s) (i32.const 19))
      (then
        (local.set $known (i32.const 1))
      )
      (else
    (if (call $host___str_eq (local.get $s) (i32.const 20))
      (then
        (local.set $known (i32.const 1))
      )
      (else
    (if (call $host___str_eq (local.get $s) (i32.const 21))
      (then
        (local.set $known (i32.const 1))
      )
      (else
    (if (call $host___str_eq (local.get $s) (i32.const 22))
      (then
        (local.set $known (i32.const 1))
      )
      (else
    (if (call $host___str_eq (local.get $s) (i32.const 23))
      (then
        (local.set $known (i32.const 1))
      )
      (else
    (if (call $host___str_eq (local.get $s) (i32.const 24))
      (then
        (local.set $known (i32.const 1))
      )
      (else
    (if (call $host___str_eq (local.get $s) (i32.const 25))
      (then
        (local.set $known (i32.const 1))
      )
      (else
    (if (call $host___str_eq (local.get $s) (i32.const 26))
      (then
        (local.set $known (i32.const 1))
      )
      (else
    (if (call $host___str_eq (local.get $s) (i32.const 27))
      (then
        (local.set $known (i32.const 1))
      )
      (else
    (if (call $host___str_eq (local.get $s) (i32.const 28))
      (then
        (local.set $known (i32.const 1))
      )
      (else
    (if (call $host___str_eq (local.get $s) (i32.const 29))
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
    (local.get $known)
  )
  (export "isServerOnlyImport" (func $isServerOnlyImport))

)