(module
  (memory 2 2048)
  (export "memory" (memory 0))

  ;; pure flow: modalityStructured
  (func $modalityStructured (result i32)
    (i32.const 9)
  )
  (export "modalityStructured" (func $modalityStructured))

)