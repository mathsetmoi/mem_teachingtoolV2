// Aide partagée des essais « affichage et sorties » (vérification du lot 5).
import { RACINE_ESSAIS, RACINE_DEPOT } from '../../../../commun/racines.mjs'
import { chromium } from '../../../../commun/playwright.mjs'
import { mkdirSync } from 'node:fs'

export const S = `${RACINE_ESSAIS}`
export const V = S + '/lot5/verif/affichage'
export const OUT = V + '/sorties'
export const DEV = 'http://localhost:5173/'
mkdirSync(OUT, { recursive: true })

export let echecs = 0
export const ok = (c, m, d) => { if (!c) echecs++; console.log(c ? '✓' : '✗ ÉCHEC', m, (!c || process.env.DETAIL) && d !== undefined ? '— ' + JSON.stringify(d).slice(0, 2000) : '') }
export const note = (m, d) => console.log('  ·', m, d !== undefined ? JSON.stringify(d).slice(0, 2500) : '')
export const erreurs = []
export const suivre = (p, nom) => {
  p.on('pageerror', e => erreurs.push(`${nom}: ${e.message}`))
  p.on('console', m => { if (m.type() === 'error' && !/Failed to load resource|ERR_CERT|net::|accounts\.google|fonts\.g/.test(m.text())) erreurs.push(`${nom}: ${m.text()}`) })
}
export const pret = p => p.waitForFunction(() => document.querySelector('.rang')?.textContent?.includes('/') && window.__app?.page, null, { timeout: 30000 })

export async function lancer() {
  return chromium.launch({ env: { ...process.env, LANG: 'C.UTF-8', LC_ALL: 'C.UTF-8' } })
}
export async function contexte(nav, o = {}) {
  const c = await nav.newContext({ viewport: { width: 1366, height: 768 }, acceptDownloads: true, ...o })
  await c.addInitScript(() => { window.showOpenFilePicker = undefined })
  await c.route(/accounts\.google\.com|apis\.google\.com/, r => r.fulfill({ contentType: 'text/javascript', body: '' }))
  return c
}
export async function ouvrir(ctx, nom = 'page') {
  const p = await ctx.newPage(); suivre(p, nom)
  await p.goto(DEV); await pret(p)
  await p.waitForTimeout(500)
  await p.evaluate(async () => {
    const a = window.__app
    a.reconnaissance = false
    window.__msgs = []
    const m = a.ui.message.bind(a.ui)
    a.ui.message = (t, x, d) => { window.__msgs.push(t); return m(t, x, d) }
  })
  return p
}
export const FONDS = ['blanc', 'carreaux', 'grands-carreaux', 'seyes', 'millimetre', 'pointe', 'iso', 'repere']
export const fin = async nav => {
  await nav.close()
  ok(erreurs.length === 0, 'Aucune erreur JS', erreurs)
  console.log(echecs ? `\n${echecs} ÉCHEC(S)` : '\nTout est vert')
  process.exit(echecs ? 1 : 0)
}
