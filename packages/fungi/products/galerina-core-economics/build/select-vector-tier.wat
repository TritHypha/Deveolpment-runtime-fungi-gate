(module
  (memory 2 2048)
  (export "memory" (memory 0))

  ;; pure flow: selectVectorTier
  (func $selectVectorTier (param $p0 i32) (result i32)
    (local.get $p0)
  )
  (export "selectVectorTier" (func $selectVectorTier))

)