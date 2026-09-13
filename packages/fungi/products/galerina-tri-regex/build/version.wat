(module
  (memory 2 2048)
  (export "memory" (memory 0))

  ;; pure flow: triRegexVersion
  (func $triRegexVersion (result i32)
    (i32.const 1)
  )
  (export "triRegexVersion" (func $triRegexVersion))

)