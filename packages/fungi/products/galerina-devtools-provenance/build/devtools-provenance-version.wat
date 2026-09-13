(module
  (memory 2 2048)
  (export "memory" (memory 0))

  ;; pure flow: devtoolsProvenanceVersion
  (func $devtoolsProvenanceVersion (result i32)
    (i32.const 1)
  )
  (export "devtoolsProvenanceVersion" (func $devtoolsProvenanceVersion))

)