import { defineConfig } from 'vitest/config'

// Les tests tournent sous Node, sans navigateur : le format du film, l'exporteur,
// la bobine. Le reste se vérifie dans le navigateur.
export default defineConfig({
  test: { include: ['tests/**/*.test.ts'], environment: 'node' },
})
