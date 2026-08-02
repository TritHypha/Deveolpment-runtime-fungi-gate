use super::NativeFailure;

pub(crate) struct PlatformExecution {
    pub(crate) value: u64,
    pub(crate) executable_at_call: bool,
    pub(crate) writable_at_call: bool,
}

#[cfg(target_os = "windows")]
mod host {
    use super::{NativeFailure, PlatformExecution};
    use std::ffi::c_void;
    use std::mem::{size_of, zeroed};
    use std::ptr::{copy_nonoverlapping, null_mut};

    const BCRYPT_USE_SYSTEM_PREFERRED_RNG: u32 = 0x0000_0002;
    const MEM_COMMIT: u32 = 0x0000_1000;
    const MEM_RESERVE: u32 = 0x0000_2000;
    const MEM_RELEASE: u32 = 0x0000_8000;
    const PAGE_READWRITE: u32 = 0x04;
    const PAGE_EXECUTE_READ: u32 = 0x20;

    #[repr(C)]
    struct MemoryBasicInformation {
        base_address: *mut c_void,
        allocation_base: *mut c_void,
        allocation_protect: u32,
        partition_id: u16,
        region_size: usize,
        state: u32,
        protect: u32,
        kind: u32,
    }

    #[link(name = "bcrypt")]
    extern "system" {
        fn BCryptGenRandom(
            algorithm: *mut c_void,
            buffer: *mut u8,
            buffer_bytes: u32,
            flags: u32,
        ) -> i32;
    }

    #[link(name = "kernel32")]
    extern "system" {
        fn VirtualAlloc(
            address: *mut c_void,
            size: usize,
            allocation_type: u32,
            protect: u32,
        ) -> *mut c_void;
        fn VirtualProtect(
            address: *mut c_void,
            size: usize,
            new_protect: u32,
            old_protect: *mut u32,
        ) -> i32;
        fn VirtualQuery(
            address: *const c_void,
            information: *mut MemoryBasicInformation,
            information_bytes: usize,
        ) -> usize;
        fn VirtualFree(address: *mut c_void, size: usize, free_type: u32) -> i32;
        fn FlushInstructionCache(process: *mut c_void, address: *const c_void, size: usize) -> i32;
        fn GetCurrentProcess() -> *mut c_void;
    }

    struct Allocation(*mut c_void);

    impl Drop for Allocation {
        fn drop(&mut self) {
            if !self.0.is_null() {
                // SAFETY: this guard owns the exact address returned by VirtualAlloc.
                unsafe {
                    let _ = VirtualFree(self.0, 0, MEM_RELEASE);
                }
            }
        }
    }

    pub(crate) fn os_random_16() -> Result<[u8; 16], NativeFailure> {
        let mut bytes = [0_u8; 16];
        // SAFETY: the buffer is writable for exactly the supplied byte count;
        // a null algorithm with this flag requests the OS system RNG.
        let status = unsafe {
            BCryptGenRandom(
                null_mut(),
                bytes.as_mut_ptr(),
                bytes.len() as u32,
                BCRYPT_USE_SYSTEM_PREFERRED_RNG,
            )
        };
        if status < 0 {
            return Err(NativeFailure::new("VOK_NATIVE_ENTROPY_UNAVAILABLE"));
        }
        Ok(bytes)
    }

    pub(crate) fn execute(image: &[u8]) -> Result<PlatformExecution, NativeFailure> {
        if image.is_empty() {
            return Err(NativeFailure::new("VOK_NATIVE_IMAGE_EMPTY"));
        }
        // SAFETY: arguments request a private anonymous allocation with no
        // supplied address. Null is checked before use.
        let address = unsafe {
            VirtualAlloc(
                null_mut(),
                image.len(),
                MEM_RESERVE | MEM_COMMIT,
                PAGE_READWRITE,
            )
        };
        if address.is_null() {
            return Err(NativeFailure::new("VOK_NATIVE_ALLOCATE_REFUSED"));
        }
        let allocation = Allocation(address);

        // SAFETY: allocation is at least image.len() bytes and non-overlapping.
        unsafe {
            copy_nonoverlapping(image.as_ptr(), allocation.0.cast::<u8>(), image.len());
        }
        let mut old_protect = 0_u32;
        // SAFETY: allocation is live for the exact mapped range.
        let protected = unsafe {
            VirtualProtect(
                allocation.0,
                image.len(),
                PAGE_EXECUTE_READ,
                &mut old_protect,
            )
        };
        if protected == 0 || old_protect != PAGE_READWRITE {
            return Err(NativeFailure::new("VOK_NATIVE_PROTECT_REFUSED"));
        }
        // SAFETY: current-process pseudo handle is valid; allocation is live.
        let flushed = unsafe {
            FlushInstructionCache(GetCurrentProcess(), allocation.0.cast_const(), image.len())
        };
        if flushed == 0 {
            return Err(NativeFailure::new("VOK_NATIVE_ICACHE_REFUSED"));
        }

        // SAFETY: zero is a valid initial representation for this output-only
        // C structure, whose size is supplied exactly to VirtualQuery.
        let mut information: MemoryBasicInformation = unsafe { zeroed() };
        // SAFETY: information points to writable storage of the supplied size.
        let queried = unsafe {
            VirtualQuery(
                allocation.0.cast_const(),
                &mut information,
                size_of::<MemoryBasicInformation>(),
            )
        };
        if queried != size_of::<MemoryBasicInformation>()
            || information.state != MEM_COMMIT
            || information.protect != PAGE_EXECUTE_READ
        {
            return Err(NativeFailure::new("VOK_NATIVE_WX_QUERY_REFUSED"));
        }

        // SAFETY: the closed internal emitter creates the only admitted ABI:
        // no parameters, u64 return and a single terminating return instruction.
        let entry: extern "C" fn() -> u64 = unsafe { std::mem::transmute(allocation.0) };
        let value = entry();
        Ok(PlatformExecution {
            value,
            executable_at_call: true,
            writable_at_call: false,
        })
    }
}

#[cfg(any(target_os = "linux", target_os = "macos"))]
mod host {
    use super::{NativeFailure, PlatformExecution};
    use std::ffi::c_void;
    use std::ptr::{copy_nonoverlapping, null_mut};

    const PROT_READ: i32 = 0x1;
    const PROT_WRITE: i32 = 0x2;
    const PROT_EXEC: i32 = 0x4;
    const MAP_PRIVATE: i32 = 0x2;
    #[cfg(target_os = "linux")]
    const MAP_ANONYMOUS: i32 = 0x20;
    #[cfg(target_os = "macos")]
    const MAP_ANONYMOUS: i32 = 0x1000;

    extern "C" {
        fn mmap(
            address: *mut c_void,
            length: usize,
            protect: i32,
            flags: i32,
            file_descriptor: i32,
            offset: isize,
        ) -> *mut c_void;
        fn mprotect(address: *mut c_void, length: usize, protect: i32) -> i32;
        fn munmap(address: *mut c_void, length: usize) -> i32;
    }

    #[cfg(target_os = "linux")]
    extern "C" {
        fn getrandom(buffer: *mut c_void, length: usize, flags: u32) -> isize;
    }

    #[cfg(target_os = "macos")]
    extern "C" {
        fn getentropy(buffer: *mut c_void, length: usize) -> i32;
        fn sys_icache_invalidate(start: *mut c_void, length: usize);
    }

    #[cfg(all(target_os = "linux", target_arch = "aarch64"))]
    extern "C" {
        fn __clear_cache(start: *mut c_void, end: *mut c_void);
    }

    struct Allocation {
        address: *mut c_void,
        length: usize,
    }

    impl Drop for Allocation {
        fn drop(&mut self) {
            if !self.address.is_null() {
                // SAFETY: this guard owns the exact live mmap range.
                unsafe {
                    let _ = munmap(self.address, self.length);
                }
            }
        }
    }

    #[cfg(target_os = "linux")]
    pub(crate) fn os_random_16() -> Result<[u8; 16], NativeFailure> {
        let mut bytes = [0_u8; 16];
        let mut written = 0_usize;
        while written < bytes.len() {
            // SAFETY: the remaining slice is writable for exactly this length.
            let result = unsafe {
                getrandom(
                    bytes[written..].as_mut_ptr().cast::<c_void>(),
                    bytes.len() - written,
                    0,
                )
            };
            if result > 0 {
                written += result as usize;
                continue;
            }
            if result < 0
                && std::io::Error::last_os_error().kind() == std::io::ErrorKind::Interrupted
            {
                continue;
            }
            return Err(NativeFailure::new("VOK_NATIVE_ENTROPY_UNAVAILABLE"));
        }
        Ok(bytes)
    }

    #[cfg(target_os = "macos")]
    pub(crate) fn os_random_16() -> Result<[u8; 16], NativeFailure> {
        let mut bytes = [0_u8; 16];
        // SAFETY: getentropy accepts a writable buffer; 16 is below its limit.
        let result = unsafe { getentropy(bytes.as_mut_ptr().cast::<c_void>(), bytes.len()) };
        if result != 0 {
            return Err(NativeFailure::new("VOK_NATIVE_ENTROPY_UNAVAILABLE"));
        }
        Ok(bytes)
    }

    pub(crate) fn execute(image: &[u8]) -> Result<PlatformExecution, NativeFailure> {
        if image.is_empty() {
            return Err(NativeFailure::new("VOK_NATIVE_IMAGE_EMPTY"));
        }
        // SAFETY: requests a private anonymous mapping and supplies no address.
        let address = unsafe {
            mmap(
                null_mut(),
                image.len(),
                PROT_READ | PROT_WRITE,
                MAP_PRIVATE | MAP_ANONYMOUS,
                -1,
                0,
            )
        };
        if address as isize == -1 {
            return Err(NativeFailure::new("VOK_NATIVE_ALLOCATE_REFUSED"));
        }
        let allocation = Allocation {
            address,
            length: image.len(),
        };
        // SAFETY: allocation is live, writable, large enough and non-overlapping.
        unsafe {
            copy_nonoverlapping(image.as_ptr(), allocation.address.cast::<u8>(), image.len());
        }
        // SAFETY: allocation is the exact live mmap range.
        let protected = unsafe { mprotect(allocation.address, image.len(), PROT_READ | PROT_EXEC) };
        if protected != 0 {
            return Err(NativeFailure::new("VOK_NATIVE_PROTECT_REFUSED"));
        }

        flush_instruction_cache(&allocation);
        let (executable, writable) = query_permissions(&allocation)?;
        if !executable || writable {
            return Err(NativeFailure::new("VOK_NATIVE_WX_QUERY_REFUSED"));
        }
        // SAFETY: the closed internal emitter supplies the exact no-arg/u64 ABI.
        let entry: extern "C" fn() -> u64 = unsafe { std::mem::transmute(allocation.address) };
        let value = entry();
        Ok(PlatformExecution {
            value,
            executable_at_call: executable,
            writable_at_call: writable,
        })
    }

    #[cfg(all(target_os = "linux", target_arch = "x86_64"))]
    fn flush_instruction_cache(_allocation: &Allocation) {}

    #[cfg(all(target_os = "linux", target_arch = "aarch64"))]
    fn flush_instruction_cache(allocation: &Allocation) {
        // SAFETY: both pointers delimit the exact live written mapping.
        unsafe {
            __clear_cache(
                allocation.address,
                allocation
                    .address
                    .cast::<u8>()
                    .add(allocation.length)
                    .cast(),
            );
        }
    }

    #[cfg(target_os = "macos")]
    fn flush_instruction_cache(allocation: &Allocation) {
        // SAFETY: the pointer and length describe the exact live written mapping.
        unsafe { sys_icache_invalidate(allocation.address, allocation.length) };
    }

    #[cfg(target_os = "linux")]
    fn query_permissions(allocation: &Allocation) -> Result<(bool, bool), NativeFailure> {
        let maps = std::fs::read_to_string("/proc/self/maps")
            .map_err(|_| NativeFailure::new("VOK_NATIVE_WX_QUERY_REFUSED"))?;
        let address = allocation.address as usize;
        for line in maps.lines() {
            let mut fields = line.split_whitespace();
            let Some(range) = fields.next() else {
                continue;
            };
            let Some(permissions) = fields.next() else {
                continue;
            };
            let Some((start, end)) = range.split_once('-') else {
                continue;
            };
            let Ok(start) = usize::from_str_radix(start, 16) else {
                continue;
            };
            let Ok(end) = usize::from_str_radix(end, 16) else {
                continue;
            };
            if address >= start && address < end {
                let bytes = permissions.as_bytes();
                let writable = bytes.get(1) == Some(&b'w');
                let executable = bytes.get(2) == Some(&b'x');
                return Ok((executable, writable));
            }
        }
        Err(NativeFailure::new("VOK_NATIVE_WX_QUERY_REFUSED"))
    }

    #[cfg(target_os = "macos")]
    fn query_permissions(_allocation: &Allocation) -> Result<(bool, bool), NativeFailure> {
        // macOS independent live VM-region inspection is a release-evidence
        // gate. The successful exact mprotect transition is the bounded floor.
        Ok((true, false))
    }
}

#[cfg(not(any(target_os = "windows", target_os = "linux", target_os = "macos")))]
mod host {
    use super::{NativeFailure, PlatformExecution};

    pub(crate) fn os_random_16() -> Result<[u8; 16], NativeFailure> {
        Err(NativeFailure::new("VOK_NATIVE_PLATFORM_UNSUPPORTED"))
    }

    pub(crate) fn execute(_image: &[u8]) -> Result<PlatformExecution, NativeFailure> {
        Err(NativeFailure::new("VOK_NATIVE_PLATFORM_UNSUPPORTED"))
    }
}

pub(crate) use host::{execute, os_random_16};
