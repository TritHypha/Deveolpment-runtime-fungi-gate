(module
  (memory 2 2048)
  (export "memory" (memory 0))

  ;; pure flow: selectTernaryBridgeTechnique
  (func $selectTernaryBridgeTechnique (result i32)
    (i32.const 1)
  )
  (export "selectTernaryBridgeTechnique" (func $selectTernaryBridgeTechnique))

)