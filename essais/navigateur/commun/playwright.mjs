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
import { mkdtempSync, rmSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'

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

// Contournement d'un défaut du Chromium 153.0.8010.12 livré avec Playwright
// 1.63 : le navigateur entier tombe (SIGTRAP ; pour l'essai, « Target page,
// context or browser has been closed ») dès qu'une poignée de fichier
// (FileSystemHandle, de l'OPFS comme du disque) rangée dans IndexedDB est
// RELUE dans un contexte éphémère, celui que rend browser.newContext(). Dans
// un profil sur disque, la même poignée se relit sans mal : c'est ainsi que
// Chrome travaille en classe. Les essais qui simulent la clé USB (une poignée
// de l'OPFS gardée dans IndexedDB, que l'outil relit au démarrage et à
// l'activation) lancent donc leur navigateur par lancerPersistant() : chaque
// newContext() ouvre un Chromium à part, sur un profil temporaire effacé à la
// fermeture. L'objet rendu a la forme de celui de chromium.launch() pour ce
// qu'en font les essais : newContext(options), contexts(), version(),
// isConnected(), close(). Les options de lancement (env…) et celles du
// contexte (viewport, hasTouch…) passent toutes à launchPersistentContext.
// Coût : un processus par contexte, environ une demi-seconde de plus chacun.
// À retirer quand le Chromium des sessions ne tombera plus :
// `node commun/sonde-contexte-ephemere.mjs` le dit en quelques secondes.
const profils = new Set()
// Effacer un profil : Chromium peut encore y écrire juste après la fermeture
// du contexte (ENOTEMPTY), d'où quelques reprises ; ce qui reste part à la
// sortie du processus, et jamais une erreur d'ici ne fait tomber un essai.
function effacer(dossier, reprises = 6) {
  try { rmSync(dossier, { recursive: true, force: true }); profils.delete(dossier) }
  catch { if (reprises > 0) setTimeout(() => effacer(dossier, reprises - 1), 300).unref() }
}
process.on('exit', () => { for (const d of profils) { try { rmSync(d, { recursive: true, force: true }) } catch {} } })
export async function lancerPersistant(optionsLancement = {}) {
  const contextes = new Set()
  let version = null
  return {
    async newContext(optionsContexte = {}) {
      const profil = mkdtempSync(join(tmpdir(), 'mem-teachingtool-essai-'))
      profils.add(profil)
      const ctx = await chromium.launchPersistentContext(profil, { ...optionsLancement, ...optionsContexte })
      version = ctx.browser()?.version() ?? version
      // Un contexte persistant s'ouvre avec un onglet about:blank : on le ferme,
      // pour que ctx.pages() soit vide comme après browser.newContext()
      for (const page of ctx.pages()) await page.close().catch(() => {})
      contextes.add(ctx)
      ctx.once('close', () => {
        contextes.delete(ctx)
        const navigateur = ctx.browser()
        if (navigateur?.isConnected()) navigateur.once('disconnected', () => effacer(profil)); else effacer(profil)
      })
      return ctx
    },
    contexts: () => [...contextes],
    version: () => version,
    isConnected: () => contextes.size > 0,
    async close() { for (const c of [...contextes]) await c.close().catch(() => {}) },
  }
}
