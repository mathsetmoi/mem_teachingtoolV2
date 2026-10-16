import { RACINE_ESSAIS, RACINE_DEPOT } from '../../../../commun/racines.mjs'
import { defineConfig } from 'vitest/config'
export default defineConfig({
  root: `${RACINE_DEPOT}`,
  test: { include: [`${RACINE_ESSAIS}/lot3/verif/donnees/vt/*.test.ts`], environment: 'node', testTimeout: 600000 },
  server: { fs: { allow: ['/'] } },
})
