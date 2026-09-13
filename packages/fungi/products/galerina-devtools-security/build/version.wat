(module
  (memory 2 2048)
  (export "memory" (memory 0))

  ;; pure flow: devtoolsSecurityVersion
  (func $devtoolsSecurityVersion (result i32)
    (i32.const 1)
  )
  (export "devtoolsSecurityVersion" (func $devtoolsSecurityVersion))

)