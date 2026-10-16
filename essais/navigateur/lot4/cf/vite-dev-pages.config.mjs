// La version en ligne du dépôt (build:pages), construite AVEC window.__app
// (import.meta.env.DEV vrai), dans $SORTIE (essais/navigateur/sorties/builds/nouveau-dev, ignoré par git) : ce que servent
// les essais de la vérification du lot 4 (lot4/verif/migration :
// /nouveau-dev/), reconstruite à chaque passage de la batterie depuis le
// dépôt (voir lot4/verif/batterie.sh).
import { RACINE_ESSAIS, RACINE_DEPOT } from '../../commun/racines.mjs'
import base from '../../../../vite.pages.config.ts'
export default {
  ...base,
  root: `${RACINE_DEPOT}`,
  define: { ...(base.define ?? {}), 'import.meta.env.DEV': 'true' },
  build: { ...base.build, outDir: process.env.SORTIE, emptyOutDir: true },
}
