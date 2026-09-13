(module
  (memory 2 2048)
  (export "memory" (memory 0))

  ;; pure flow: watHeapBase
  (func $watHeapBase (result i32)
    (i32.const 1024)
  )
  (export "watHeapBase" (func $watHeapBase))

)