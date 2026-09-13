(module
  ;; effect: stdlib.string
  (import "host" "__str_eq" (func $host___str_eq (param $p0 i32) (param $p1 i32) (result i32)))

  (memory 2 2048)
  (export "memory" (memory 0))

  ;; pure flow: requiresLowBitKernel
  (func $requiresLowBitKernel (param $p0 i32) (param $p1 i32) (result i32)
    (if (call $host___str_eq (local.get $p0) (i32.const 1))
      (then
        (return (i32.const 1))
      )
    )
    (if (call $host___str_eq (local.get $p0) (i32.const 2))
      (then
        (return (i32.const 1))
      )
    )
    (if (call $host___str_eq (local.get $p1) (i32.const 3))
      (then
        (return (i32.const 1))
      )
    )
    (if (call $host___str_eq (local.get $p1) (i32.const 4))
      (then
        (return (i32.const 1))
      )
    )
    (i32.const 0)
  )
  (export "requiresLowBitKernel" (func $requiresLowBitKernel))

)