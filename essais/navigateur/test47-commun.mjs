// Outils communs aux essais « casser la revue » (test47)
import { RACINE_ESSAIS, RACINE_DEPOT } from './commun/racines.mjs'
import { chromium } from './commun/playwright.mjs'
import { mkdirSync } from 'node:fs'

export const URL0 = 'http://localhost:5173/'
export const DOSSIER = `${RACINE_ESSAIS}/shots47`
mkdirSync(DOSSIER, { recursive: true })

export const resultats = []
export function verifier(nom, ok, detail = '') {
  resultats.push({ nom, ok: !!ok, detail })
  console.log(`${ok ? 'OK   ' : 'ÉCHEC'} ${nom}${detail ? ' — ' + detail : ''}`)
}
export const dort = ms => new Promise(r => setTimeout(r, ms))
export const erreurs = []
export function surveiller(page, nom) {
  page.on('console', m => { if (m.type() === 'error' && !(/Failed to load resource/.test(m.text()) && !/localhost/.test(m.location().url))) erreurs.push(`${nom}: ${m.text()} @ ${m.location().url}`) })
  page.on('pageerror', e => erreurs.push(`${nom}: ${e.message}`))
}

export const navigateur = await chromium.launch()

export async function ouvrirPage(opts = {}) {
  const ctx = await navigateur.newContext({ viewport: { width: 1280, height: 800 }, ...opts })
  if (opts.horloge !== undefined) await ctx.addInitScript(HORLOGE, opts.horloge)
  const page = await ctx.newPage(); surveiller(page, opts.nom || 'page')
  await page.goto(URL0)
  await page.waitForFunction(() => window.__app && window.__revue && window.__app.page)
  await page.waitForTimeout(200)
  return { ctx, page }
}

/** Horloge du tableau décalée */
export const HORLOGE = (decalage) => {
  const vrai = Date.now.bind(Date)
  window.__decalage = decalage
  Date.now = () => vrai() + window.__decalage
}

/** L'état du document, octet pour octet : la mise à jour entière, et ce que voit le tableau */
export const ETAT = async () => {
  const url = performance.getEntriesByType('resource').map(e => e.name).find(n => /\/deps\/yjs\.js/.test(n))
  const Y = await import(url)
  const app = window.__app, t = app.tableau
  const maj = Y.encodeStateAsUpdate(t.doc)
  let h = 0
  for (let i = 0; i < maj.length; i++) h = (h * 31 + maj[i]) | 0
  return {
    octets: maj.length, empreinte: h,
    sv: Array.from(Y.encodeStateVector(t.doc)).join(','),
    film: t.film.length,
    pages: JSON.stringify(t.doc.getMap('pages').toJSON()),
    ordre: JSON.stringify(t.ordre.toArray()),
    pageVue: t.pageVue,
    appPage: app.page,
    cam: [app.cam.x, app.cam.y, app.cam.z].join(','),
    selection: [...app.selection].join(','),
    outil: app.outil,
    instruments: JSON.stringify([...app.instruments]),
    annulables: t.annulation.undoStack.length,
  }
}

export const REVUE = () => {
  const r = window.__revue
  const b = r.bande
  return {
    ouvert: r.ouvert, k: r.k, n: b ? b.images.length : 0, enMarche: r.enMarche, mode: r.mode, arret: r.arret,
    trace: !!r.trace, boucle: r.boucle, allure: r.allure, vue: r.vue, glisse: r.glisse,
    parties: b ? b.parties.length : 0, total: b ? b.total : 0,
    portion: b ? { genre: b.portion.genre, page: b.portion.page } : null,
    bandeau: r.bandeau.hidden ? '' : r.bandeau.textContent,
    ligne1: document.querySelector('.revue-ou .ligne1')?.textContent,
  }
}

export const BOUTON = 'Revoir la construction : une page, une séance, pas à pas'

/** Un trait à la souris, avec l'outil courant */
export async function tracer(page, x, y, l = 120, pas = 12) {
  await page.mouse.move(x, y)
  await page.mouse.down()
  for (let i = 1; i <= pas; i++) await page.mouse.move(x + l * i / pas, y + Math.sin(i / 2) * 15)
  await page.mouse.up()
  await page.waitForTimeout(60)
}

export async function fin() {
  console.log('')
  const ko = resultats.filter(r => !r.ok)
  console.log(`${resultats.length - ko.length} / ${resultats.length} vérifications passent`)
  if (erreurs.length) console.log('Erreurs de console :\n  ' + erreurs.join('\n  '))
  await navigateur.close()
}
