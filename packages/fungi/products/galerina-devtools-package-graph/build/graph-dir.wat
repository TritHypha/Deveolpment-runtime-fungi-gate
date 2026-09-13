(module
  (memory 2 2048)
  (export "memory" (memory 0))

  ;; pure flow: graphDir
  (func $graphDir (result i32)
    (i32.const 1)
  )
  (export "graphDir" (func $graphDir))

)