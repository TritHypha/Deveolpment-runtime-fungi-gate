# Windows static-host toolchain — actions to do now

Status: **manual prerequisite only; no production authority**.

The Galerina preflight is fail-closed and currently reports
`STATIC_HOST_CLANG_COMPONENTS_ABSENT`. The earlier command-line installer
attempt changed nothing. Do not run any command copied from an older ceremony
or planning document.

## Do now

1. Open **Visual Studio Installer** yourself.
2. Choose **Modify** for the installed Visual Studio 2022 Community instance.
3. Under **Individual components**, select both:
   - **C++ Clang Compiler for Windows**
     (`Microsoft.VisualStudio.Component.VC.Llvm.Clang`)
   - **MSBuild support for LLVM (clang-cl) toolset**
     (`Microsoft.VisualStudio.Component.VC.Llvm.ClangToolset`)
4. Apply the modification and let Visual Studio Installer finish.
5. Obtain the Windows x64 NASM archive only from the official NASM site:
   <https://www.nasm.us/pub/nasm/releasebuilds/3.02/win64/nasm-3.02-win64.zip>
6. Extract it to a stable tools directory and add the directory containing
   `nasm.exe` to the user or system `PATH`.
7. Close and reopen PowerShell, change to the Galerina repository, and run only:

   ```powershell
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
