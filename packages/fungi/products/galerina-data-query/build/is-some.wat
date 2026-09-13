(module
  ;; effect: stdlib.result
  (import "host" "__option_is_none_v2" (func $host___option_is_none_v2 (param $p0 i32) (result i32)))
  ;; effect: stdlib.result
  (import "host" "__option_value_v2" (func $host___option_value_v2 (param $p0 i32) (result i32)))

  (memory 2 2048)
  (export "memory" (memory 0))

  ;; pure flow: isSome
  (func $isSome (param $p0 i32) (result i32)
    (local $__fungi_match_0 i32)
    (local $__fungi_match_1 i32)
    (local.set $__fungi_match_0 (local.get $p0))
    (if (call $host___option_is_none_v2 (local.get $__fungi_match_0))
      (then
        (return (i32.const 0))
      )
      (else
        (local.set $__fungi_match_1 (call $host___option_value_v2 (local.get $__fungi_match_0)))
        (return (i32.const 1))
      )
    )
    (unreachable) ;; #160: all match/while arms return — implicit [i32] tail
  )
  (export "isSome" (func $isSome))

)