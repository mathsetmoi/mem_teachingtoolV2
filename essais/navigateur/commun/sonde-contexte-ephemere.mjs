// Sonde du contournement lancerPersistant() (voir commun/playwright.mjs) :
// le Chromium de Playwright tombe-t-il encore quand une poignée de fichier
// rangée dans IndexedDB est relue dans un contexte éphémère ? Aucun code de
// l'outil, aucun serveur : une page vide, servie par Playwright lui-même sur
// l'origine http://localhost:5173/ (il faut une origine sûre pour l'OPFS).
//   node commun/sonde-contexte-ephemere.mjs
// Sortie 0 : le navigateur survit, le contournement peut être retiré.
// Sortie 3 : il tombe encore dans un contexte éphémère (et survit dans un
//            profil sur disque) : le contournement reste nécessaire.
// Sortie 4 : il tombe aussi dans un profil sur disque : c'est autre chose.
import { chromium, lancerPersistant } from './playwright.mjs'

const ORIGINE = 'http://localhost:5173/'
const PAGE = '<!doctype html><meta charset="utf-8"><title>sonde</title><p>sonde</p>'
const SCENARIO = async () => {
  const attendre = r => new Promise((bien, mal) => { r.onsuccess = () => bien(r.result); r.onerror = () => mal(r.error) })
  const ouvrir = async () => { const q = indexedDB.open('sonde-poignee', 1); q.onupgradeneeded = () => q.result.createObjectStore('p'); return attendre(q) }
  const racine = await navigator.storage.getDirectory()
  const poignee = await racine.getFileHandle('sonde.memc', { create: true })
  const base = await ouvrir()
  const t = base.transaction('p', 'readwrite'); t.objectStore('p').put(poignee, 'f')
  await new Promise((bien, mal) => { t.oncomplete = bien; t.onabort = () => mal(t.error) })
  // C'est cette relecture qui tue Chromium 153 dans un contexte éphémère
  const relue = await attendre(base.transaction('p').objectStore('p').get('f'))
  base.close()
  return { type: relue?.constructor.name, nom: relue?.name, meme: await relue.isSameEntry(poignee) }
}

async function jouer(nom, ctx) {
  await ctx.route(ORIGINE + 'sonde.html', r => r.fulfill({ contentType: 'text/html', body: PAGE }))
  const p = await ctx.newPage()
  await p.goto(ORIGINE + 'sonde.html')
  try {
    const r = await p.evaluate(SCENARIO)
    console.log(`· ${nom} : la poignée se relit`, JSON.stringify(r))
    return true
  } catch (e) {
    console.log(`· ${nom} : ${e.message.split('\n')[0]}`)
    return false
  }
}

const nav = await chromium.launch()
console.log('· Chromium', nav.version())
const ephemere = await jouer('contexte éphémère (browser.newContext)', await nav.newContext())
await nav.close().catch(() => {})
const persistant = await lancerPersistant()
const surDisque = await jouer('profil sur disque (lancerPersistant)', await persistant.newContext())
await persistant.close()

if (ephemere) { console.log('Le navigateur survit : le contournement lancerPersistant() peut être retiré des essais.'); process.exit(0) }
if (surDisque) { console.log('Le navigateur tombe encore dans un contexte éphémère : le contournement lancerPersistant() reste nécessaire.'); process.exit(3) }
console.log('Le navigateur tombe aussi dans un profil sur disque : ce n’est plus le même défaut.'); process.exit(4)
