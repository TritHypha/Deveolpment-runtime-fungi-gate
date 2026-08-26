// mark-core-change.js
// PostToolUse hook (Write|Edit): writes a sentinel file when any relevant
// file is edited during a Claude turn. Watched paths:
//
//   packages-ts/galerina-core*           — all galerina-core packages
//   packages-ts/galerina-devtools-graph-project — now depends on fungi-graph
//   FUNGI-Graph/src                          — the standalone library itself
//
// The Stop hook reads this sentinel to decide whether to run tests.

'use strict';

const fs = require('fs');
const path = require('path');

const SENTINEL = path.join(__dirname, '..', '.claude', '.core-changed');

const chunks = [];
process.stdin.on('data', chunk => chunks.push(chunk));
process.stdin.on('end', () => {
  try {
    const input = JSON.parse(Buffer.concat(chunks).toString('utf8'));
    const rawPath = input.tool_input?.file_path || '';
    const filePath = rawPath.replace(/\\/g, '/');

    const isRelevant =
      /packages-ts\/galerina-core/.test(filePath) ||
      /packages-ts\/galerina-devtools-graph-project/.test(filePath) ||
      /FUNGI-Graph[\\/]src/.test(filePath);

    if (isRelevant) {
      fs.writeFileSync(SENTINEL, new Date().toISOString(), 'utf8');
    }
  } catch {
    // Malformed stdin — do nothing. Never block the hook.
  }
});
