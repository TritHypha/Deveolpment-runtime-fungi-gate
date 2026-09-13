(module
  (memory 2 2048)
  (export "memory" (memory 0))

  ;; pure flow: restoreVerdictExportName
  (func $restoreVerdictExportName (result i32)
    (i32.const 1)
  )
  (export "restoreVerdictExportName" (func $restoreVerdictExportName))

)