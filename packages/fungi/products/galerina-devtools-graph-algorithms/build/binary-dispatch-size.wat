(module
  (memory 2 2048)
  (export "memory" (memory 0))

  ;; pure flow: binaryDispatchSize
  (func $binaryDispatchSize (result i32)
    (i32.const 48)
  )
  (export "binaryDispatchSize" (func $binaryDispatchSize))

)