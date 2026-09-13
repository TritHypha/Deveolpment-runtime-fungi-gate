(module
  (memory 2 2048)
  (export "memory" (memory 0))

  ;; pure flow: artifactReferenceSchema
  (func $artifactReferenceSchema (result i32)
    (i32.const 1)
  )
  (export "artifactReferenceSchema" (func $artifactReferenceSchema))

)