(module
  (memory 2 2048)
  (export "memory" (memory 0))

  ;; pure flow: flowgraphVersion
  (func $flowgraphVersion (result i32)
    (i32.const 1)
  )
  (export "flowgraphVersion" (func $flowgraphVersion))

)