(module
  ;; effect: stdlib.string
  (import "host" "__str_eq" (func $host___str_eq (param $p0 i32) (param $p1 i32) (result i32)))

  (memory 2 2048)
  (export "memory" (memory 0))

  ;; pure flow: isTerminalScope
  (func $isTerminalScope (param $p0 i32) (result i32)
    (if (call $host___str_eq (local.get $p0) (i32.const 1))
      (then
        (return (i32.const 1))
      )
      (else
    (if (call $host___str_eq (local.get $p0) (i32.const 2))
      (then
        (return (i32.const 1))
      )
      (else
    (if (call $host___str_eq (local.get $p0) (i32.const 3))
      (then
        (return (i32.const 1))
      )
      (else
    (if (call $host___str_eq (local.get $p0) (i32.const 4))
      (then
        (return (i32.const 1))
      )
      (else
    (return (i32.const 0))
      )
    )
      )
    )
      )
    )
      )
    )
    (unreachable) ;; #160: all match/while arms return — implicit [i32] tail
  )
  (export "isTerminalScope" (func $isTerminalScope))

)