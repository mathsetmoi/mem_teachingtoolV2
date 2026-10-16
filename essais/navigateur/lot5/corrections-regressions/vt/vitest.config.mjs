import { RACINE_ESSAIS, RACINE_DEPOT } from '../../../commun/racines.mjs'
import { defineConfig } from 'vitest/config'
export default defineConfig({
  root: `${RACINE_DEPOT}`,
  test: { include: [`${RACINE_ESSAIS}/lot5/corrections-regressions/vt/*.test.ts`], environment: 'node', testTimeout: 600000 },
  server: { fs: { allow: ['/'] } },
})
