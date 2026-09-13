(module
  ;; effect: stdlib.string
  (import "host" "__str_eq" (func $host___str_eq (param $p0 i32) (param $p1 i32) (result i32)))

  (memory 2 2048)
  (export "memory" (memory 0))

  ;; pure flow: isTaskEffectCore
  (func $isTaskEffectCore (param $p0 i32) (result i32)
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
  (export "isTaskEffectCore" (func $isTaskEffectCore))

  ;; pure flow: isTaskEffectExtended
  (func $isTaskEffectExtended (param $p0 i32) (result i32)
    (if (call $host___str_eq (local.get $p0) (i32.const 5))
      (then
        (return (i32.const 1))
      )
      (else
    (if (call $host___str_eq (local.get $p0) (i32.const 6))
      (then
        (return (i32.const 1))
      )
      (else
    (if (call $host___str_eq (local.get $p0) (i32.const 7))
      (then
        (return (i32.const 1))
      )
      (else
    (if (call $host___str_eq (local.get $p0) (i32.const 8))
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
  (export "isTaskEffectExtended" (func $isTaskEffectExtended))

  ;; pure flow: isTaskEffect
  (func $isTaskEffect (param $p0 i32) (result i32)
    (if (call $isTaskEffectCore (local.get $p0))
      (then
        (return (i32.const 1))
      )
    )
    (call $isTaskEffectExtended (local.get $p0))
  )
  (export "isTaskEffect" (func $isTaskEffect))

)