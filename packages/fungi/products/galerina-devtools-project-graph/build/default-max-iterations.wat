(module
  (memory 2 2048)
  (export "memory" (memory 0))

  ;; pure flow: defaultMaxIterations
  (func $defaultMaxIterations (result i32)
    (i32.const 1000)
  )
  (export "defaultMaxIterations" (func $defaultMaxIterations))

)