(module
  (memory 2 2048)
  (export "memory" (memory 0))

  ;; pure flow: bm25K1
  (func $bm25K1 (result f64)
    (f64.const 1.5)
  )
  (export "bm25K1" (func $bm25K1))

)