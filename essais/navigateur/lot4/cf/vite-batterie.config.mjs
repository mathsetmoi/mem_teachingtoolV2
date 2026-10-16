// Le serveur de développement de la batterie (essais/navigateur/tout.sh) :
// neuf à chaque passage (un serveur resté ouvert depuis la veille rendait
// test46-lecteur instable sur ses seuils de temps), sans rechargement à chaud
// ni surveillance des fichiers (un fichier du dépôt changé pendant le passage
// ne recharge pas les pages des essais en cours). Le reste : vite.config.ts.
// Il sert le dossier d'où on le lance (la racine du dépôt pour tout.sh). Son
// cache des dépendances est à part, dans essais/navigateur/sorties (ignoré
// par git), pour ne pas se disputer celui du serveur ordinaire.
import base from '../../../../vite.config.ts'
import { fileURLToPath } from 'node:url'
const SORTIES = fileURLToPath(new URL('../../sorties/', import.meta.url))
export default {
  ...base,
  root: process.cwd(),
  cacheDir: `${SORTIES}vite-cache/${process.cwd().replace(/[^A-Za-z0-9]+/g, '_')}`,
  server: { ...base.server, hmr: false, watch: null },
}
