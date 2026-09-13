(module
  (memory 2 2048)
  (export "memory" (memory 0))

  ;; pure flow: devtoolsPciVersion
  (func $devtoolsPciVersion (result i32)
    (i32.const 1)
  )
  (export "devtoolsPciVersion" (func $devtoolsPciVersion))

)