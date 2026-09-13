(module
  (memory 2 2048)
  (export "memory" (memory 0))

  ;; pure flow: circuitId
  (func $circuitId (result i32)
    (i32.const 1)
  )
  (export "circuitId" (func $circuitId))

)