(module
  (memory 2 2048)
  (export "memory" (memory 0))

  ;; pure flow: devtoolsContextVersion
  (func $devtoolsContextVersion (result i32)
    (i32.const 1)
  )
  (export "devtoolsContextVersion" (func $devtoolsContextVersion))

)