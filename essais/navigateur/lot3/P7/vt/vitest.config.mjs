import { RACINE_ESSAIS, RACINE_DEPOT } from '../../../commun/racines.mjs'
import { defineConfig } from 'vitest/config'
export default defineConfig({
  root: `${RACINE_DEPOT}`,
  test: { include: [`${RACINE_ESSAIS}/lot3/P7/vt/*.test.ts`], environment: 'node' },
  server: { fs: { allow: ['/'] } },
})
