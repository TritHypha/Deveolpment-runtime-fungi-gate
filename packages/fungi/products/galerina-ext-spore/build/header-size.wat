(module
  (memory 2 2048)
  (export "memory" (memory 0))

  ;; pure flow: headerSize
  (func $headerSize (result i32)
    (i32.const 56)
  )
  (export "headerSize" (func $headerSize))

)