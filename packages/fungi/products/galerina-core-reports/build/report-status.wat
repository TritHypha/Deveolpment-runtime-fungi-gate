(module
  (memory 2 2048)
  (export "memory" (memory 0))

  ;; P9.4b: bump-allocator heap pointer for record struct layout
  (global $__fungi_heap (mut i32) (i32.const 1024))

  ;; pure flow: selectReportStatus
  (func $selectReportStatus (param $p0 i32) (result i32)
    (if (i32.gt_s (i32.load (i32.add (local.get $p0) (i32.const 8))) (i32.const 0))
      (then
        (return (i32.const 1))
      )
    )
    (if (i32.gt_s (i32.load (i32.add (local.get $p0) (i32.const 4))) (i32.const 0))
      (then
        (return (i32.const 2))
      )
    )
    (if (i32.gt_s (i32.load (i32.add (local.get $p0) (i32.const 0))) (i32.const 0))
      (then
        (return (i32.const 3))
      )
    )
    (i32.const 4)
  )
  (export "selectReportStatus" (func $selectReportStatus))

  ;; pure flow: selectReportStatusCounts
  (func $selectReportStatusCounts (param $p0 i32) (param $p1 i32) (param $p2 i32) (result i32)
    (local $__fungi_rec_0 i32)
    (local $input i32)
    ;; B2 (R&D 0055): per-flow arena reset — reclaim the previous invocation's heap (leaf entry-point)
    (global.set $__fungi_heap (i32.const 1024))
    (local.set $input (block (result i32)
      (local.set $__fungi_rec_0 (global.get $__fungi_heap))
      (global.set $__fungi_heap (i32.add (global.get $__fungi_heap) (i32.const 12)))
      (i32.store (i32.add (local.get $__fungi_rec_0) (i32.const 0)) (local.get $p0)) ;; .warnings
      (i32.store (i32.add (local.get $__fungi_rec_0) (i32.const 4)) (local.get $p1)) ;; .errors
      (i32.store (i32.add (local.get $__fungi_rec_0) (i32.const 8)) (local.get $p2)) ;; .critical
      (local.get $__fungi_rec_0)
    ))
    (call $selectReportStatus (local.get $input))
  )
  (export "selectReportStatusCounts" (func $selectReportStatusCounts))

)