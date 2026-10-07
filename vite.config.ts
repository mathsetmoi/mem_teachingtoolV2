import { defineConfig } from 'vite'
import { viteSingleFile } from 'vite-plugin-singlefile'

// « npm run build » produit UN SEUL fichier HTML (code, styles et polices
// KaTeX inclus) : il s'ouvre depuis une clé USB, sans connexion.
export default defineConfig({
  plugins: [viteSingleFile()],
  server: { host: true },   // accessible depuis les tablettes du même Wi-Fi
})
