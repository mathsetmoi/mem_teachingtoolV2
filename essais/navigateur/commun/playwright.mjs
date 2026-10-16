// Playwright pour les essais du navigateur, trouvé sans être une dépendance du
// dépôt (package.json n'en dit rien) :
// 1. `import('playwright')`, s'il est installé là où Node le trouve (le dépôt,
//    un dossier parent, NODE_PATH ne compte pas pour import) ;
// 2. sinon la variable d'environnement PLAYWRIGHT_MODULE : le chemin du
//    fichier d'entrée du paquet, par exemple
//    PLAYWRIGHT_MODULE=/usr/lib/node_modules/playwright/index.mjs ;
// 3. sinon, en dernier recours, /opt/node22/lib/node_modules/playwright/index.mjs
//    (là où le met l'environnement des sessions en ligne).
// Le navigateur (Chromium) doit déjà être installé pour cette version de
// Playwright : les essais ne lancent jamais `playwright install`.
import { pathToFileURL } from 'node:url'

const DERNIER_RECOURS = '/opt/node22/lib/node_modules/playwright/index.mjs'

async function charger() {
  const essais = []
  try { return await import('playwright') } catch (e) { essais.push(`import('playwright') : ${e.code ?? e.message}`) }
  const chemins = [process.env.PLAYWRIGHT_MODULE, DERNIER_RECOURS].filter(Boolean)
  for (const c of chemins) {
    try { return await import(c.startsWith('file:') ? c : pathToFileURL(c).href) } catch (e) { essais.push(`${c} : ${e.code ?? e.message}`) }
  }
  throw new Error('Playwright introuvable (voir essais/navigateur/README.md) :\n  ' + essais.join('\n  '))
}

const pw = await charger()
const m = pw.default ?? pw
export const chromium = pw.chromium ?? m.chromium
export const firefox = pw.firefox ?? m.firefox
export const webkit = pw.webkit ?? m.webkit
export const devices = pw.devices ?? m.devices
export const request = pw.request ?? m.request
export const selectors = pw.selectors ?? m.selectors
export const errors = pw.errors ?? m.errors
export default m
