(module
  ;; effect: stdlib.array
  (import "host" "__array_create" (func $host___array_create (result i32)))
  ;; effect: stdlib.array
  (import "host" "__array_append" (func $host___array_append (param $p0 i32) (param $p1 i32) (result i32)))
  ;; effect: stdlib.result
  (import "host" "__option_none" (func $host___option_none (result i32)))
  ;; effect: stdlib.result
  (import "host" "__option_none_v2" (func $host___option_none_v2 (result i32)))

  (memory 2 2048)
  (export "memory" (memory 0))

  ;; P9.4b: bump-allocator heap pointer for record struct layout
  (global $__fungi_heap (mut i32) (i32.const 1024))

  ;; pure flow: createPackageNode
  (func $createPackageNode (param $p0 i32) (param $p1 i32) (param $p2 i32) (param $p3 i32) (result i32)
    (local $tags i32)
    (local $__fungi_rec_0 i32)
    (local.set $tags (call $host___array_append (call $host___array_create) (i32.const 1)))
    (block (result i32)
      (local.set $__fungi_rec_0 (global.get $__fungi_heap))
      (global.set $__fungi_heap (i32.add (global.get $__fungi_heap) (i32.const 24)))
      (i32.store (i32.add (local.get $__fungi_rec_0) (i32.const 0)) (local.get $p0)) ;; .id
      (i32.store (i32.add (local.get $__fungi_rec_0) (i32.const 4)) (i32.const 2)) ;; .kind
      (i32.store (i32.add (local.get $__fungi_rec_0) (i32.const 8)) (local.get $p1)) ;; .label
      (i32.store (i32.add (local.get $__fungi_rec_0) (i32.const 12)) (local.get $p2)) ;; .sourcePath
      (i32.store (i32.add (local.get $__fungi_rec_0) (i32.const 16)) (local.get $p3)) ;; .summary
      (i32.store (i32.add (local.get $__fungi_rec_0) (i32.const 20)) (local.get $tags)) ;; .tags
      (local.get $__fungi_rec_0)
    )
  )
  (export "createPackageNode" (func $createPackageNode))

  ;; pure flow: createPackageNodeDefault
  (func $createPackageNodeDefault (param $p0 i32) (param $p1 i32) (param $p2 i32) (result i32)
    ;; B2 (R&D 0055): per-flow arena reset — reclaim the previous invocation's heap (leaf entry-point)
    (global.set $__fungi_heap (i32.const 1024))
    (call $createPackageNode (local.get $p0) (local.get $p1) (local.get $p2) (call $host___option_none_v2))
  )
  (export "createPackageNodeDefault" (func $createPackageNodeDefault))

)