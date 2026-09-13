(module
  (memory 2 2048)
  (export "memory" (memory 0))

  ;; pure flow: defaultRequestTimeoutMs
  (func $defaultRequestTimeoutMs (result i32)
    (i32.const 30000)
  )
  (export "defaultRequestTimeoutMs" (func $defaultRequestTimeoutMs))

)