import { defineConfig } from 'vite'

// « npm run build:pages » : la version EN LIGNE (GitHub Pages), en deux pages.
// - index.html  : le tableau du professeur (il publie d'ici les replays) ;
// - revoir.html : le lecteur des élèves, léger, qui ne charge que le dessin
//   et le film (KaTeX seulement si la séance a des formules).
// Chemins relatifs : le site marche quel que soit le dossier où il est servi.
export default defineConfig({
  base: './',
  // Les réglages de cette version (fichier .env.pages) : pas de serveur de salle, publication possible
  mode: 'pages',
  build: {
    outDir: 'dist-pages',
    // Les téléphones des élèves ne sont pas tous récents (iPhone sous iOS 14 et plus)
    target: ['es2020', 'safari14', 'chrome87', 'firefox78'],
    rollupOptions: { input: { index: 'index.html', revoir: 'revoir.html' } },
  },
})
