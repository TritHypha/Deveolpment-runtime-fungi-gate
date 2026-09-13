(module
  (memory 2 2048)
  (export "memory" (memory 0))

  ;; pure flow: defaultMaxRoutes
  (func $defaultMaxRoutes (result i32)
    (i32.const 1000)
  )
  (export "defaultMaxRoutes" (func $defaultMaxRoutes))

)