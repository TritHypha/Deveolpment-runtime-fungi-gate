(module
  (memory 2 2048)
  (export "memory" (memory 0))

  ;; pure flow: integrityVerdict
  (func $integrityVerdict (param $p0 i32) (result i32)
    (if (i32.eq (local.get $p0) (i32.const 0))
      (then
        (return (i32.const 1))
      )
    )
    (i32.const 2)
  )
  (export "integrityVerdict" (func $integrityVerdict))

)