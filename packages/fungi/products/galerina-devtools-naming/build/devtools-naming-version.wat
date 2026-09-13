(module
  (memory 2 2048)
  (export "memory" (memory 0))

  ;; pure flow: devtoolsNamingVersion
  (func $devtoolsNamingVersion (result i32)
    (i32.const 1)
  )
  (export "devtoolsNamingVersion" (func $devtoolsNamingVersion))

)