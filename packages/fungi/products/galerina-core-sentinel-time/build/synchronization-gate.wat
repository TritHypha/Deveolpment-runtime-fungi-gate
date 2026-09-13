(module
  (memory 2 2048)
  (export "memory" (memory 0))

  ;; pure flow: driftGateVerdict
  (func $driftGateVerdict (param $p0 i32) (param $p1 i32) (param $p2 i32) (result i32)
    (if (i32.eq (local.get $p0) (i32.const 0))
      (then
        (return (i32.const -1))
      )
    )
    (if (i32.gt_s (local.get $p1) (local.get $p2))
      (then
        (return (i32.const -1))
      )
    )
    (i32.const 1)
  )
  (export "driftGateVerdict" (func $driftGateVerdict))

)