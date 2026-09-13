(module
  ;; effect: stdlib.result
  (import "host" "__option_is_none_v2" (func $host___option_is_none_v2 (param $p0 i32) (result i32)))
  ;; effect: stdlib.result
  (import "host" "__option_value_v2" (func $host___option_value_v2 (param $p0 i32) (result i32)))

  (memory 2 2048)
  (export "memory" (memory 0))

  ;; P9.4b: bump-allocator heap pointer for record struct layout
  (global $__fungi_heap (mut i32) (i32.const 1024))

  ;; pure flow: defineAiSafetyPolicy
  (func $defineAiSafetyPolicy (param $p0 i32) (result i32)
    (local $outputTrust i32)
    (local $allowSecurityDecisions i32)
    (local $requireHumanReviewForHighImpact i32)
    (local $redactSecretsFromPrompts i32)
    (local $logPrompts i32)
    (local $__fungi_match_0 i32)
    (local $__fungi_match_1 i32)
    (local $__fungi_match_2 i32)
    (local $__fungi_match_3 i32)
    (local $__fungi_match_4 i32)
    (local $__fungi_match_5 i32)
    (local $__fungi_match_6 i32)
    (local $__fungi_match_7 i32)
    (local $__fungi_match_8 i32)
    (local $__fungi_match_9 i32)
    (local $__fungi_rec_0 i32)
    ;; B2 (R&D 0055): per-flow arena reset — reclaim the previous invocation's heap (leaf entry-point)
    (global.set $__fungi_heap (i32.const 1024))
    (local.set $outputTrust (i32.const 1))
    (local.set $allowSecurityDecisions (i32.const 0))
    (local.set $requireHumanReviewForHighImpact (i32.const 1))
    (local.set $redactSecretsFromPrompts (i32.const 1))
    (local.set $logPrompts (i32.const 0))
    (local.set $__fungi_match_0 (i32.load (i32.add (local.get $p0) (i32.const 0))))
    (if (call $host___option_is_none_v2 (local.get $__fungi_match_0))
      (then
      )
      (else
        (local.set $__fungi_match_1 (call $host___option_value_v2 (local.get $__fungi_match_0)))
        (local.set $outputTrust (local.get $__fungi_match_1))
      )
    )
    (local.set $__fungi_match_2 (i32.load (i32.add (local.get $p0) (i32.const 4))))
    (if (call $host___option_is_none_v2 (local.get $__fungi_match_2))
      (then
      )
      (else
        (local.set $__fungi_match_3 (call $host___option_value_v2 (local.get $__fungi_match_2)))
        (local.set $allowSecurityDecisions (local.get $__fungi_match_3))
      )
    )
    (local.set $__fungi_match_4 (i32.load (i32.add (local.get $p0) (i32.const 8))))
    (if (call $host___option_is_none_v2 (local.get $__fungi_match_4))
      (then
      )
      (else
        (local.set $__fungi_match_5 (call $host___option_value_v2 (local.get $__fungi_match_4)))
        (local.set $requireHumanReviewForHighImpact (local.get $__fungi_match_5))
      )
    )
    (local.set $__fungi_match_6 (i32.load (i32.add (local.get $p0) (i32.const 12))))
    (if (call $host___option_is_none_v2 (local.get $__fungi_match_6))
      (then
      )
      (else
        (local.set $__fungi_match_7 (call $host___option_value_v2 (local.get $__fungi_match_6)))
        (local.set $redactSecretsFromPrompts (local.get $__fungi_match_7))
      )
    )
    (local.set $__fungi_match_8 (i32.load (i32.add (local.get $p0) (i32.const 16))))
    (if (call $host___option_is_none_v2 (local.get $__fungi_match_8))
      (then
      )
      (else
        (local.set $__fungi_match_9 (call $host___option_value_v2 (local.get $__fungi_match_8)))
        (local.set $logPrompts (local.get $__fungi_match_9))
      )
    )
    (block (result i32)
      (local.set $__fungi_rec_0 (global.get $__fungi_heap))
      (global.set $__fungi_heap (i32.add (global.get $__fungi_heap) (i32.const 20)))
      (i32.store (i32.add (local.get $__fungi_rec_0) (i32.const 0)) (local.get $outputTrust)) ;; .outputTrust
      (i32.store (i32.add (local.get $__fungi_rec_0) (i32.const 4)) (local.get $allowSecurityDecisions)) ;; .allowSecurityDecisions
      (i32.store (i32.add (local.get $__fungi_rec_0) (i32.const 8)) (local.get $requireHumanReviewForHighImpact)) ;; .requireHumanReviewForHighImpact
      (i32.store (i32.add (local.get $__fungi_rec_0) (i32.const 12)) (local.get $redactSecretsFromPrompts)) ;; .redactSecretsFromPrompts
      (i32.store (i32.add (local.get $__fungi_rec_0) (i32.const 16)) (local.get $logPrompts)) ;; .logPrompts
      (local.get $__fungi_rec_0)
    )
  )
  (export "defineAiSafetyPolicy" (func $defineAiSafetyPolicy))

)