(module
  (memory 2 2048)
  (export "memory" (memory 0))

  ;; pure flow: maxRateWindows
  (func $maxRateWindows (result i32)
    (i32.const 10000)
  )
  (export "maxRateWindows" (func $maxRateWindows))

)