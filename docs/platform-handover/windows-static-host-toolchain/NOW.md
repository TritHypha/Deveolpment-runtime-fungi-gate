# Windows static-host toolchain — actions to do now

Status: **one elevated Visual Studio prerequisite remains; no production authority**.

The Galerina preflight is fail-closed and currently reports
`STATIC_HOST_CLANG_COMPONENTS_ABSENT`. Portable NASM 3.02 is already present;
its official archive and executable hashes are pinned in the repository build
recipe. Do not reinstall NASM or run a command copied from an older document.

## Do now

1. Open **Visual Studio Installer** yourself and accept its administrator
   elevation prompt.
2. Choose **Modify** for the installed Visual Studio Community 2026 instance.
3. Under **Individual components**, select both:
   - **C++ Clang Compiler for Windows**
     (`Microsoft.VisualStudio.Component.VC.Llvm.Clang`)
   - **MSBuild support for LLVM (clang-cl) toolset**
     (`Microsoft.VisualStudio.Component.VC.Llvm.ClangToolset`)
4. Apply the modification and let Visual Studio Installer finish.
5. After the Visual Studio modification finishes, close and reopen PowerShell,
   change to the Galerina repository, and run only:

   ```powershell
   $NasmDirectory = (Resolve-Path `
     "..\external-git-projects\nasm-3.02-portable\nasm-3.02").Path
   $env:PATH = "$NasmDirectory;$env:PATH"
   node scripts/verify-registry-static-host-toolchain.mjs
   ```

## Expected result

The command must print a JSON record with `"verdict":"CANDIDATE"` and
`"productionAuthorizing":false`. `CANDIDATE` means only that a host build may
start. It is not a signature, admission receipt, release result, or permission
to enable production rotation.

If the result is `REFUSED`, do not improvise or disable assembly, verification,
or warnings. Return the complete public JSON result; the preflight never prints
private key material.

Microsoft's official component catalogue and Clang documentation identify the
two component names and their expected Visual Studio LLVM path:

- <https://learn.microsoft.com/en-us/visualstudio/install/workload-component-id-vs-build-tools?view=vs-2022>
- <https://learn.microsoft.com/en-us/cpp/build/clang-support-msbuild?view=msvc-170>
