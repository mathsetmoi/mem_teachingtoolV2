import { defineConfig } from 'vite'

// « npm run build:pages » : la version EN LIGNE (GitHub Pages), en deux pages.
// - index.html  : le tableau du professeur (il publie d'ici les replays) ;
// - revoir.html : le lecteur des élèves, léger, qui ne charge que le dessin
//   et le film (KaTeX seulement si la séance a des formules).
// Chemins relatifs : le site marche quel que soit le dossier où il est servi.
export default defineConfig({
  base: './',
  build: {
    outDir: 'dist-pages',
    rollupOptions: { input: { index: 'index.html', revoir: 'revoir.html' } },
  },
})
