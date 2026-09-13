(module
  (memory 2 2048)
  (export "memory" (memory 0))

  ;; pure flow: defaultTimeoutMs
  (func $defaultTimeoutMs (result i32)
    (i32.const 600000)
  )
  (export "defaultTimeoutMs" (func $defaultTimeoutMs))

)