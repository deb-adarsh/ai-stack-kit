/**
 * Legacy Jest config (optional). Primary test runner: `npm test` → `node --test` on compiled `dist/`.
 * @type {import('jest').Config}
 */
module.exports = {
  testPathIgnorePatterns: ['/node_modules/', '/dist/'],
  passWithNoTests: true,
};
