(module
  (memory 2 2048)
  (export "memory" (memory 0))

  ;; pure flow: staleDays
  (func $staleDays (result i32)
    (i32.const 7)
  )
  (export "staleDays" (func $staleDays))

)