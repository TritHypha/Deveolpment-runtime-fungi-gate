(module
  ;; effect: stdlib.string
  (import "host" "__str_concat" (func $host___str_concat (param $p0 i32) (param $p1 i32) (result i32)))
  ;; effect: stdlib.string
  (import "host" "__int_to_str" (func $host___int_to_str (param $p0 i32) (result i32)))
  ;; effect: stdlib.char
  (import "host" "__char_from_code" (func $host___char_from_code (param $p0 i32) (result i32)))

  (memory 2 2048)
  (export "memory" (memory 0))

  ;; pure flow: capabilityPreimage
  (func $capabilityPreimage (param $p0 i32) (result i32)
    (local $quote i32)
    (local.set $quote (call $host___int_to_str (call $host___char_from_code (i32.const 34))))
    (call $host___str_concat (call $host___str_concat (call $host___str_concat (call $host___str_concat (call $host___str_concat (call $host___str_concat (call $host___str_concat (call $host___str_concat (call $host___str_concat (call $host___str_concat (call $host___str_concat (call $host___str_concat (call $host___str_concat (call $host___str_concat (call $host___str_concat (call $host___str_concat (i32.const 1) (local.get $quote)) (i32.const 2)) (local.get $quote)) (i32.const 3)) (local.get $quote)) (i32.const 4)) (local.get $quote)) (i32.const 5)) (local.get $quote)) (i32.const 6)) (local.get $quote)) (i32.const 3)) (local.get $quote)) (local.get $p0)) (local.get $quote)) (i32.const 7))
  )
  (export "capabilityPreimage" (func $capabilityPreimage))

)