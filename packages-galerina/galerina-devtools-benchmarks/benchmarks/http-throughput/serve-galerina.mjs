import { pathToFileURL } from "node:url";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { readFileSync } from "node:fs";

const __dir  = dirname(fileURLToPath(import.meta.url));
const lnRoot = join(__dir, "../../../galerina-core-compiler");

// ESM on Windows needs file:// URLs
const indexUrl = pathToFileURL(join(lnRoot, "dist/index.js")).href;

const { serve } = await import(indexUrl);

const healthFungi = join(lnRoot, "../../examples/auth-service/healthCheck.fungi");
const source = readFileSync(healthFungi, "utf8");
const server = await serve(source, "healthCheck.fungi", {
  port: 0, host: "127.0.0.1", mode: "dev", rateLimit: 100000,
});

process.stdout.write(JSON.stringify({ port: server.port }) + "\n");
process.on("SIGTERM", () => { server.close().then(() => process.exit(0)); });
process.on("SIGINT",  () => { server.close().then(() => process.exit(0)); });
