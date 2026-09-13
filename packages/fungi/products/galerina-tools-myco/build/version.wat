(module
  (memory 2 2048)
  (export "memory" (memory 0))

  ;; pure flow: mycoVersion
  (func $mycoVersion (result i32)
    (i32.const 1)
  )
  (export "mycoVersion" (func $mycoVersion))

)