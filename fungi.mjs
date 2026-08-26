#!/usr/bin/env node

// Preserve the generic entrypoint identity in process.argv[1]. The shared CLI
// implementation performs the closed product admission and requires --product.
await import("./galerina.mjs");
