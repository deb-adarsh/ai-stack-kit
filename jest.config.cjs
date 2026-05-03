/**
 * Jest defaults treat `src/types/spec.ts` as a test file (`*spec.ts`).
 * This repo has no Jest suite yet — keep `npm test` green and avoid scanning `dist/`.
 * @type {import('jest').Config}
 */
module.exports = {
  roots: ['<rootDir>/src'],
  testMatch: ['**/__tests__/**/*.test.ts'],
  testPathIgnorePatterns: ['/node_modules/', '/dist/', '<rootDir>/src/types/spec\\.ts$'],
  passWithNoTests: true,
};
