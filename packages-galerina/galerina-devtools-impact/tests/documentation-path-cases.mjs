export const DOCUMENTATION_PATH_CASES = Object.freeze([
  Object.freeze({ path: "docs/TODO.md", expected: true }),
  Object.freeze({ path: "docs/nested/guide.md", expected: true }),
  Object.freeze({ path: "README.md", expected: true }),
  Object.freeze({ path: "AGENTS.md", expected: true }),
  Object.freeze({ path: "SECURITY.md", expected: true }),
  Object.freeze({ path: "docs", expected: false }),
  Object.freeze({ path: "docs2/file.md", expected: false }),
  Object.freeze({ path: "nested/README.md", expected: false }),
  Object.freeze({ path: "packages-galerina/galerina-b/src/b.mjs", expected: false }),
  Object.freeze({ path: "packages-galerina/galerina-b/src/é.mjs", expected: false }),
]);
