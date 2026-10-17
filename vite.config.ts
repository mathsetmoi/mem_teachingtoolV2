import { defineConfig } from 'vite'
import { viteSingleFile } from 'vite-plugin-singlefile'

// « npm run build » produit UN SEUL fichier HTML (code, styles et polices
// KaTeX inclus) : il s'ouvre hors ligne, comme un simple fichier.
export default defineConfig({
  plugins: [viteSingleFile()],
  server: { host: true },   // accessible depuis une tablette du même Wi-Fi
})
