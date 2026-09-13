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
  (import "host" "__str_compare" (func $host___str_compare (param $p0 i32) (param $p1 i32) (result i32)))
  ;; effect: stdlib.result
  (import "host" "__unwrap_or" (func $host___unwrap_or (param $p0 i32) (param $p1 i32) (result i32)))
  ;; effect: stdlib.result
  (import "host" "__unwrap_or_v2" (func $host___unwrap_or_v2 (param $p0 i32) (param $p1 i32) (result i32)))

  (memory 2 2048)
  (export "memory" (memory 0))

  ;; strict-trapping checked helper — signed overflow / non-finite float traps (unreachable)
  (func $fungi_checked_add_i32 (param $a i32) (param $b i32) (result i32)
    (local $r i32)
    (local.set $r (i32.add (local.get $a) (local.get $b)))
    ;; signed overflow iff (a^r) & (b^r) < 0
    (if (i32.lt_s (i32.and (i32.xor (local.get $a) (local.get $r)) (i32.xor (local.get $b) (local.get $r))) (i32.const 0)) (then unreachable))
    (local.get $r))

  ;; pure flow: sig
  (func $sig (param $p0 i32) (result i32)
    (local $sorted i32)
    (local $outer i32)
    (local $__while_fuel_0 i32)
    (local $current i32)
    (local $next i32)
    (local $inserted i32)
    (local $inner i32)
    (local $__while_fuel_1 i32)
    (local $item i32)
    (local $joined i32)
    (local $index i32)
    (local $__while_fuel_2 i32)
    (local.set $sorted (call $host___array_create))
    (local.set $outer (i32.const 0))
    (block $while_exit_0
      (loop $while_loop_0
        (br_if $while_exit_0 (i32.ge_s (local.get $outer) (call $host___array_length (local.get $p0))))
        (local.set $__while_fuel_0 (i32.add (local.get $__while_fuel_0) (i32.const 1)))
        (if (i32.gt_u (local.get $__while_fuel_0) (i32.const 100000)) (then unreachable))
        (local.set $current (call $host___unwrap_or_v2 (call $host___array_get_option_v2 (local.get $p0) (local.get $outer)) (i32.const 0)))
        (local.set $next (call $host___array_create))
        (local.set $inserted (i32.const 0))
        (local.set $inner (i32.const 0))
        (block $while_exit_1
          (loop $while_loop_1
            (br_if $while_exit_1 (i32.ge_s (local.get $inner) (call $host___array_length (local.get $sorted))))
            (local.set $__while_fuel_1 (i32.add (local.get $__while_fuel_1) (i32.const 1)))
            (if (i32.gt_u (local.get $__while_fuel_1) (i32.const 100000)) (then unreachable))
            (local.set $item (call $host___unwrap_or_v2 (call $host___array_get_option_v2 (local.get $sorted) (local.get $inner)) (i32.const 0)))
            (if (i32.and (i32.eq (local.get $inserted) (i32.const 0)) (i32.lt_s (call $host___str_compare (local.get $current) (local.get $item)) (i32.const 0)))
              (then
                (local.set $next (call $host___array_append (local.get $next) (local.get $current)))
                (local.set $inserted (i32.const 1))
              )
            )
            (local.set $next (call $host___array_append (local.get $next) (local.get $item)))
            (local.set $inner (call $fungi_checked_add_i32 (local.get $inner) (i32.const 1)))
            (br $while_loop_1)
          )
        )
        (if (i32.eq (local.get $inserted) (i32.const 0))
          (then
            (local.set $next (call $host___array_append (local.get $next) (local.get $current)))
          )
        )
        (local.set $sorted (local.get $next))
        (local.set $outer (call $fungi_checked_add_i32 (local.get $outer) (i32.const 1)))
        (br $while_loop_0)
      )
    )
    (local.set $joined (i32.const 0))
    (local.set $index (i32.const 0))
    (block $while_exit_2
      (loop $while_loop_2
        (br_if $while_exit_2 (i32.ge_s (local.get $index) (call $host___array_length (local.get $sorted))))
        (local.set $__while_fuel_2 (i32.add (local.get $__while_fuel_2) (i32.const 1)))
        (if (i32.gt_u (local.get $__while_fuel_2) (i32.const 100000)) (then unreachable))
        (if (i32.gt_s (local.get $index) (i32.const 0))
          (then
            (local.set $joined (call $host___str_concat (local.get $joined) (i32.const 1)))
          )
        )
        (local.set $joined (call $host___str_concat (local.get $joined) (call $host___unwrap_or_v2 (call $host___array_get_option_v2 (local.get $sorted) (local.get $index)) (i32.const 0))))
        (local.set $index (call $fungi_checked_add_i32 (local.get $index) (i32.const 1)))
        (br $while_loop_2)
      )
    )
    (local.get $joined)
  )
  (export "sig" (func $sig))

)