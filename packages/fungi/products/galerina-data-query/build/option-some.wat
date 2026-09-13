(module
  ;; effect: stdlib.result
  (import "host" "__option_some" (func $host___option_some (param $p0 i32) (result i32)))
  ;; effect: stdlib.result
  (import "host" "__option_some_v2" (func $host___option_some_v2 (param $p0 i32) (result i32)))

  (memory 2 2048)
  (export "memory" (memory 0))

  ;; pure flow: optionSome
  (func $optionSome (param $p0 i32) (result i32)
    (call $host___option_some_v2 (local.get $p0))
  )
  (export "optionSome" (func $optionSome))

)