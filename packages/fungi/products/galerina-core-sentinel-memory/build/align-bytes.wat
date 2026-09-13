(module
  (memory 2 2048)
  (export "memory" (memory 0))

  ;; pure flow: alignBytes
  (func $alignBytes (result i32)
    (i32.const 16)
  )
  (export "alignBytes" (func $alignBytes))

)