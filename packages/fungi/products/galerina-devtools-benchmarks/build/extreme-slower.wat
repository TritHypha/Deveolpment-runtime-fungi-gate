(module
  (memory 2 2048)
  (export "memory" (memory 0))

  ;; pure flow: extremeSlower
  (func $extremeSlower (result i32)
    (i32.const 10000)
  )
  (export "extremeSlower" (func $extremeSlower))

)