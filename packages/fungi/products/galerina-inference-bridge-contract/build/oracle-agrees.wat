(module
  (memory 2 2048)
  (export "memory" (memory 0))

  ;; pure flow: oracleAgrees
  (func $oracleAgrees (param $p0 i32) (param $p1 i32) (result i32)
    (if (i32.eq (local.get $p0) (local.get $p1))
      (then
        (return (i32.const 1))
      )
    )
    (i32.const 0)
  )
  (export "oracleAgrees" (func $oracleAgrees))

)