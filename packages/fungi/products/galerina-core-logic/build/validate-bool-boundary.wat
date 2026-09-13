(module
  ;; effect: stdlib.array
  (import "host" "__array_create" (func $host___array_create (result i32)))
  ;; effect: stdlib.array
  (import "host" "__array_append" (func $host___array_append (param $p0 i32) (param $p1 i32) (result i32)))
  ;; effect: stdlib.array
  (import "host" "__array_get" (func $host___array_get (param $p0 i32) (param $p1 i32) (result i32)))
  ;; effect: stdlib.array
  (import "host" "__array_get_option_v2" (func $host___array_get_option_v2 (param $p0 i32) (param $p1 i32) (result i32)))
  ;; effect: stdlib.array
  (import "host" "__array_length" (func $host___array_length (param $p0 i32) (result i32)))
  ;; effect: stdlib.string
  (import "host" "__str_concat" (func $host___str_concat (param $p0 i32) (param $p1 i32) (result i32)))
  ;; effect: stdlib.string
  (import "host" "__str_eq" (func $host___str_eq (param $p0 i32) (param $p1 i32) (result i32)))
  ;; effect: stdlib.result
  (import "host" "__option_some" (func $host___option_some (param $p0 i32) (result i32)))
  ;; effect: stdlib.result
  (import "host" "__option_none" (func $host___option_none (result i32)))
  ;; effect: stdlib.result
  (import "host" "__option_some_v2" (func $host___option_some_v2 (param $p0 i32) (result i32)))
  ;; effect: stdlib.result
  (import "host" "__option_none_v2" (func $host___option_none_v2 (result i32)))
  ;; effect: stdlib.result
  (import "host" "__option_is_none_v2" (func $host___option_is_none_v2 (param $p0 i32) (result i32)))
  ;; effect: stdlib.result
  (import "host" "__option_value_v2" (func $host___option_value_v2 (param $p0 i32) (result i32)))

  (memory 2 2048)
  (export "memory" (memory 0))

  ;; P9.4b: bump-allocator heap pointer for record struct layout
  (global $__fungi_heap (mut i32) (i32.const 1024))

  ;; strict-trapping checked helper — signed overflow / non-finite float traps (unreachable)
  (func $fungi_checked_add_i32 (param $a i32) (param $b i32) (result i32)
    (local $r i32)
    (local.set $r (i32.add (local.get $a) (local.get $b)))
    ;; signed overflow iff (a^r) & (b^r) < 0
    (if (i32.lt_s (i32.and (i32.xor (local.get $a) (local.get $r)) (i32.xor (local.get $b) (local.get $r))) (i32.const 0)) (then unreachable))
    (local.get $r))

  ;; pure flow: validateBoolBoundary
  (func $validateBoolBoundary (param $p0 i32) (param $p1 i32) (result i32)
    (local $__fungi_rec_0 i32)
    (local $__fungi_rec_1 i32)
    (local $diagnostics i32)
    (local $__fungi_rec_2 i32)
    (local $index i32)
    (local $__while_fuel_0 i32)
    (local $reasonOpt i32)
    (local $__fungi_match_1 i32)
    (local $__fungi_match_2 i32)
    (local $__fungi_rec_3 i32)
    (local $__fungi_rec_4 i32)
    (local $__fungi_rec_5 i32)
    (local $__fungi_rec_6 i32)
    (local $__fungi_rec_7 i32)
    (local $__while_fuel_3 i32)
    (local $__fungi_match_4 i32)
    (local $__fungi_match_5 i32)
    (local $__fungi_rec_8 i32)
    (local $__fungi_rec_9 i32)
    ;; B2 (R&D 0055): per-flow arena reset — reclaim the previous invocation's heap (leaf entry-point)
    (global.set $__fungi_heap (i32.const 1024))
    (if (i32.eq (i32.load (i32.add (local.get $p0) (i32.const 0))) (i32.const 1))
      (then
        (if (call $host___str_eq (i32.load (i32.add (local.get $p0) (i32.const 4))) (i32.const 1))
          (then
            (return (block (result i32)
      (local.set $__fungi_rec_0 (global.get $__fungi_heap))
      (global.set $__fungi_heap (i32.add (global.get $__fungi_heap) (i32.const 16)))
      (i32.store (i32.add (local.get $__fungi_rec_0) (i32.const 0)) (i32.const 1)) ;; .allowed
      (i32.store (i32.add (local.get $__fungi_rec_0) (i32.const 4)) (i32.const 1)) ;; .value
      (i32.store (i32.add (local.get $__fungi_rec_0) (i32.const 8)) (call $host___array_create)) ;; .diagnostics
      (i32.store (i32.add (local.get $__fungi_rec_0) (i32.const 12)) (i32.const 2)) ;; .reason
      (local.get $__fungi_rec_0)
    ))
          )
        )
        (if (call $host___str_eq (i32.load (i32.add (local.get $p0) (i32.const 4))) (i32.const 3))
          (then
            (return (block (result i32)
      (local.set $__fungi_rec_1 (global.get $__fungi_heap))
      (global.set $__fungi_heap (i32.add (global.get $__fungi_heap) (i32.const 16)))
      (i32.store (i32.add (local.get $__fungi_rec_1) (i32.const 0)) (i32.const 1)) ;; .allowed
      (i32.store (i32.add (local.get $__fungi_rec_1) (i32.const 4)) (i32.const 0)) ;; .value
      (i32.store (i32.add (local.get $__fungi_rec_1) (i32.const 8)) (call $host___array_create)) ;; .diagnostics
      (i32.store (i32.add (local.get $__fungi_rec_1) (i32.const 12)) (i32.const 4)) ;; .reason
      (local.get $__fungi_rec_1)
    ))
          )
        )
        (local.set $diagnostics (call $host___array_create))
        (local.set $diagnostics (call $host___array_append (local.get $diagnostics) (block (result i32)
      (local.set $__fungi_rec_2 (global.get $__fungi_heap))
      (global.set $__fungi_heap (i32.add (global.get $__fungi_heap) (i32.const 20)))
      (i32.store (i32.add (local.get $__fungi_rec_2) (i32.const 0)) (i32.const 5)) ;; .code
      (i32.store (i32.add (local.get $__fungi_rec_2) (i32.const 4)) (i32.const 6)) ;; .name
      (i32.store (i32.add (local.get $__fungi_rec_2) (i32.const 8)) (i32.const 7)) ;; .severity
      (i32.store (i32.add (local.get $__fungi_rec_2) (i32.const 12)) (call $host___str_concat (call $host___str_concat (i32.const 8) (i32.load (i32.add (local.get $p1) (i32.const 0)))) (i32.const 9))) ;; .message
      (i32.store (i32.add (local.get $__fungi_rec_2) (i32.const 16)) (call $host___option_some_v2 (i32.load (i32.add (local.get $p1) (i32.const 0))))) ;; .path
      (local.get $__fungi_rec_2)
    )))
        (local.set $index (i32.const 0))
        (block $while_exit_0
          (loop $while_loop_0
            (br_if $while_exit_0 (i32.ge_s (local.get $index) (call $host___array_length (i32.load (i32.add (local.get $p0) (i32.const 12))))))
            (local.set $__while_fuel_0 (i32.add (local.get $__while_fuel_0) (i32.const 1)))
            (if (i32.gt_u (local.get $__while_fuel_0) (i32.const 100000)) (then unreachable))
            (local.set $reasonOpt (call $host___array_get_option_v2 (i32.load (i32.add (local.get $p0) (i32.const 12))) (local.get $index)))
            (local.set $__fungi_match_1 (local.get $reasonOpt))
            (if (call $host___option_is_none_v2 (local.get $__fungi_match_1))
              (then
              )
              (else
                (local.set $__fungi_match_2 (call $host___option_value_v2 (local.get $__fungi_match_1)))
                (local.set $diagnostics (call $host___array_append (local.get $diagnostics) (block (result i32)
      (local.set $__fungi_rec_3 (global.get $__fungi_heap))
      (global.set $__fungi_heap (i32.add (global.get $__fungi_heap) (i32.const 20)))
      (i32.store (i32.add (local.get $__fungi_rec_3) (i32.const 0)) (i32.const 10)) ;; .code
      (i32.store (i32.add (local.get $__fungi_rec_3) (i32.const 4)) (i32.const 11)) ;; .name
      (i32.store (i32.add (local.get $__fungi_rec_3) (i32.const 8)) (i32.const 12)) ;; .severity
      (i32.store (i32.add (local.get $__fungi_rec_3) (i32.const 12)) (call $host___str_concat (call $host___str_concat (call $host___str_concat (i32.const 13) (i32.load (i32.add (local.get $__fungi_match_2) (i32.const 0)))) (i32.const 14)) (i32.load (i32.add (local.get $__fungi_match_2) (i32.const 4))))) ;; .message
      (i32.store (i32.add (local.get $__fungi_rec_3) (i32.const 16)) (call $host___option_none_v2)) ;; .path
      (local.get $__fungi_rec_3)
    )))
              )
            )
            (local.set $index (call $fungi_checked_add_i32 (local.get $index) (i32.const 1)))
            (br $while_loop_0)
          )
        )
        (return (block (result i32)
      (local.set $__fungi_rec_4 (global.get $__fungi_heap))
      (global.set $__fungi_heap (i32.add (global.get $__fungi_heap) (i32.const 16)))
      (i32.store (i32.add (local.get $__fungi_rec_4) (i32.const 0)) (i32.const 0)) ;; .allowed
      (i32.store (i32.add (local.get $__fungi_rec_4) (i32.const 4)) (i32.const 0)) ;; .value
      (i32.store (i32.add (local.get $__fungi_rec_4) (i32.const 8)) (local.get $diagnostics)) ;; .diagnostics
      (i32.store (i32.add (local.get $__fungi_rec_4) (i32.const 12)) (call $host___str_concat (call $host___str_concat (i32.const 15) (i32.load (i32.add (local.get $p1) (i32.const 0)))) (i32.const 16))) ;; .reason
      (local.get $__fungi_rec_4)
    ))
      )
    )
    (if (call $host___str_eq (i32.load (i32.add (local.get $p0) (i32.const 4))) (i32.const 17))
      (then
        (return (block (result i32)
      (local.set $__fungi_rec_5 (global.get $__fungi_heap))
      (global.set $__fungi_heap (i32.add (global.get $__fungi_heap) (i32.const 16)))
      (i32.store (i32.add (local.get $__fungi_rec_5) (i32.const 0)) (i32.const 1)) ;; .allowed
      (i32.store (i32.add (local.get $__fungi_rec_5) (i32.const 4)) (i32.const 1)) ;; .value
      (i32.store (i32.add (local.get $__fungi_rec_5) (i32.const 8)) (call $host___array_create)) ;; .diagnostics
      (i32.store (i32.add (local.get $__fungi_rec_5) (i32.const 12)) (i32.load (i32.add (local.get $p0) (i32.const 8)))) ;; .reason
      (local.get $__fungi_rec_5)
    ))
      )
    )
    (if (call $host___str_eq (i32.load (i32.add (local.get $p0) (i32.const 4))) (i32.const 18))
      (then
        (return (block (result i32)
      (local.set $__fungi_rec_6 (global.get $__fungi_heap))
      (global.set $__fungi_heap (i32.add (global.get $__fungi_heap) (i32.const 16)))
      (i32.store (i32.add (local.get $__fungi_rec_6) (i32.const 0)) (i32.const 1)) ;; .allowed
      (i32.store (i32.add (local.get $__fungi_rec_6) (i32.const 4)) (i32.const 0)) ;; .value
      (i32.store (i32.add (local.get $__fungi_rec_6) (i32.const 8)) (call $host___array_create)) ;; .diagnostics
      (i32.store (i32.add (local.get $__fungi_rec_6) (i32.const 12)) (i32.load (i32.add (local.get $p0) (i32.const 8)))) ;; .reason
      (local.get $__fungi_rec_6)
    ))
      )
    )
    (local.set $diagnostics (call $host___array_create))
    (local.set $diagnostics (call $host___array_append (local.get $diagnostics) (block (result i32)
      (local.set $__fungi_rec_7 (global.get $__fungi_heap))
      (global.set $__fungi_heap (i32.add (global.get $__fungi_heap) (i32.const 20)))
      (i32.store (i32.add (local.get $__fungi_rec_7) (i32.const 0)) (i32.const 5)) ;; .code
      (i32.store (i32.add (local.get $__fungi_rec_7) (i32.const 4)) (i32.const 6)) ;; .name
      (i32.store (i32.add (local.get $__fungi_rec_7) (i32.const 8)) (i32.const 7)) ;; .severity
      (i32.store (i32.add (local.get $__fungi_rec_7) (i32.const 12)) (call $host___str_concat (call $host___str_concat (call $host___str_concat (call $host___str_concat (i32.const 19) (i32.load (i32.add (local.get $p0) (i32.const 4)))) (i32.const 20)) (i32.load (i32.add (local.get $p1) (i32.const 0)))) (i32.const 9))) ;; .message
      (i32.store (i32.add (local.get $__fungi_rec_7) (i32.const 16)) (call $host___option_some_v2 (i32.load (i32.add (local.get $p1) (i32.const 0))))) ;; .path
      (local.get $__fungi_rec_7)
    )))
    (if (call $host___str_eq (i32.load (i32.add (local.get $p0) (i32.const 4))) (i32.const 21))
      (then
        (local.set $index (i32.const 0))
        (block $while_exit_3
          (loop $while_loop_3
            (br_if $while_exit_3 (i32.ge_s (local.get $index) (call $host___array_length (i32.load (i32.add (local.get $p0) (i32.const 16))))))
            (local.set $__while_fuel_3 (i32.add (local.get $__while_fuel_3) (i32.const 1)))
            (if (i32.gt_u (local.get $__while_fuel_3) (i32.const 100000)) (then unreachable))
            (local.set $reasonOpt (call $host___array_get_option_v2 (i32.load (i32.add (local.get $p0) (i32.const 16))) (local.get $index)))
            (local.set $__fungi_match_4 (local.get $reasonOpt))
            (if (call $host___option_is_none_v2 (local.get $__fungi_match_4))
              (then
              )
              (else
                (local.set $__fungi_match_5 (call $host___option_value_v2 (local.get $__fungi_match_4)))
                (local.set $diagnostics (call $host___array_append (local.get $diagnostics) (block (result i32)
      (local.set $__fungi_rec_8 (global.get $__fungi_heap))
      (global.set $__fungi_heap (i32.add (global.get $__fungi_heap) (i32.const 20)))
      (i32.store (i32.add (local.get $__fungi_rec_8) (i32.const 0)) (i32.const 10)) ;; .code
      (i32.store (i32.add (local.get $__fungi_rec_8) (i32.const 4)) (i32.const 11)) ;; .name
      (i32.store (i32.add (local.get $__fungi_rec_8) (i32.const 8)) (i32.const 12)) ;; .severity
      (i32.store (i32.add (local.get $__fungi_rec_8) (i32.const 12)) (call $host___str_concat (call $host___str_concat (call $host___str_concat (i32.const 13) (i32.load (i32.add (local.get $__fungi_match_5) (i32.const 0)))) (i32.const 14)) (i32.load (i32.add (local.get $__fungi_match_5) (i32.const 4))))) ;; .message
      (i32.store (i32.add (local.get $__fungi_rec_8) (i32.const 16)) (call $host___option_none_v2)) ;; .path
      (local.get $__fungi_rec_8)
    )))
              )
            )
            (local.set $index (call $fungi_checked_add_i32 (local.get $index) (i32.const 1)))
            (br $while_loop_3)
          )
        )
      )
    )
    (block (result i32)
      (local.set $__fungi_rec_9 (global.get $__fungi_heap))
      (global.set $__fungi_heap (i32.add (global.get $__fungi_heap) (i32.const 16)))
      (i32.store (i32.add (local.get $__fungi_rec_9) (i32.const 0)) (i32.const 0)) ;; .allowed
      (i32.store (i32.add (local.get $__fungi_rec_9) (i32.const 4)) (i32.const 0)) ;; .value
      (i32.store (i32.add (local.get $__fungi_rec_9) (i32.const 8)) (local.get $diagnostics)) ;; .diagnostics
      (i32.store (i32.add (local.get $__fungi_rec_9) (i32.const 12)) (call $host___str_concat (call $host___str_concat (call $host___str_concat (call $host___str_concat (call $host___str_concat (i32.const 22) (i32.load (i32.add (local.get $p0) (i32.const 4)))) (i32.const 23)) (i32.load (i32.add (local.get $p1) (i32.const 0)))) (i32.const 24)) (i32.load (i32.add (local.get $p0) (i32.const 8))))) ;; .reason
      (local.get $__fungi_rec_9)
    )
  )
  (export "validateBoolBoundary" (func $validateBoolBoundary))

)