(module
  (memory 2 2048)
  (export "memory" (memory 0))

  ;; pure flow: wRep
  (func $wRep (result i32)
    (i32.const 40)
  )
  (export "wRep" (func $wRep))

)