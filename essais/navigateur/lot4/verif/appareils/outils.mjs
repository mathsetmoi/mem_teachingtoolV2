// Outils communs des essais « appareils » du lot 4 (vérification).
import { RACINE_ESSAIS, RACINE_DEPOT } from '../../../commun/racines.mjs'
import { chromium, lancerPersistant } from '../../../commun/playwright.mjs'
import { mkdirSync } from 'node:fs'

export const S = `${RACINE_ESSAIS}`
export const ICI = S + '/lot4/verif/appareils/'
export const CAPTURES = ICI + 'captures/'
export const DEV = process.env.DEV || 'http://localhost:5173/'
mkdirSync(CAPTURES, { recursive: true })

export let echecs = 0
export const ok = (c, m, detail) => { if (!c) echecs++; console.log(c ? '✓' : '✗ ÉCHEC', m, detail !== undefined ? '— ' + JSON.stringify(detail).slice(0, 1800) : '') }
export const info = (m, d) => console.log('·', m, d !== undefined ? JSON.stringify(d).slice(0, 2500) : '')
export const dort = ms => new Promise(r => setTimeout(r, ms))
export const norm = t => (t || '').replace(/[  ]/g, ' ')

export const erreurs = []
export const suivre = (p, nom) => {
  p.on('pageerror', e => erreurs.push(`${nom}: ${e.message}`))
  p.on('console', m => { if (m.type() === 'error' && !/Failed to load resource|ERR_CERT|net::/.test(m.text())) erreurs.push(`${nom}: ${m.text()}`) })
}
export const pret = p => p.waitForFunction(() => (window.__surveillance && window.__bibliotheque && document.querySelector('.rang')?.textContent?.includes('/'))
  || (window.__bibliotheque && !window.__app && !document.querySelector('.bibliotheque').hidden), null, { timeout: 30000 })
export const ECOUTER_TOASTS = () => {
  window.__toasts = []
  let dernier = ''
  setInterval(() => { const t = [...document.querySelectorAll('.toast')].map(x => x.textContent).join('|').replace(/[  ]/g, ' '); if (t && t !== dernier) { dernier = t; window.__toasts.push(t) } }, 15)
}
export const toasts = p => p.evaluate(() => window.__toasts.splice(0))

/** `persistant: true` pour une sonde qui relit la poignée de la clé depuis IndexedDB (voir commun/playwright.mjs) */
export async function lancer({ persistant = false, ...o } = {}) {
  const options = { env: { ...process.env, LANG: 'C.UTF-8', LC_ALL: 'C.UTF-8' }, ...o }
  return persistant ? lancerPersistant(options) : chromium.launch(options)
}
export async function contexte(nav, o = {}) {
  const ctx = await nav.newContext({ viewport: { width: 1366, height: 768 }, ...o })
  await ctx.addInitScript(ECOUTER_TOASTS)
  return ctx
}
export async function ouvrir(ctx, chemin = '', nom = 'dev', base = DEV) {
  const p = await ctx.newPage(); suivre(p, nom)
  await p.goto(base + chemin); await pret(p); await p.waitForTimeout(300)
  return p
}
/** n classeurs, comme les crée la bibliothèque */
export const creerPlusieurs = (p, n, o = {}) => p.evaluate(async ({ n, o }) => {
  const dem = await import('/src/classeurs/demarrage.ts'), bases = await import('/src/classeurs/bases.ts'), neuf = await import('/src/classeurs/neuf.ts')
  const etat = await neuf.etatNeuf('carreaux'), T = Date.now(), ids = []
  for (let i = 0; i < n; i++) {
    const id = dem.idClasseur()
    const nom = o.noms?.[i] ?? `${o.prefixe ?? 'Chapitre'} ${i + 1}`
    const fiche = { id, base: dem.baseDe(id), nom, dossier: o.dossier ?? null, etiquettes: o.etiquettes ?? [], cree: T - (n - i) * 3600e3, modifie: T - (n - i) * 600e3, ouvert: o.jamais ? 0 : T - (n - i) * 60e3, pages: 1 }
    await window.__registre.creerClasseur(fiche, b => bases.creerBase(b, etat, { id, nom }))
    ids.push(id)
  }
  return ids
}, { n, o })
export const creerDossier = (p, nom, o = {}) => p.evaluate(async ({ nom, o }) => {
  const dem = await import('/src/classeurs/demarrage.ts')
  const d = { id: dem.idClasseur(), nom, parent: o.parent ?? null, couleur: o.couleur ?? '#3b6fb6', cree: Date.now(), ...(o.etiquette ? { etiquette: o.etiquette } : {}) }
  await window.__registre.ajouterDossier(d)
  return d.id
}, { nom, o })
export const ecrireTraits = (p, n, o = {}) => p.evaluate(async ({ n, o }) => {
  const t = window.__app.tableau
  const page = o.page ?? t.ordre.get(0)
  const trait = (x, y) => { const pts = []; for (let i = 0; i < 60; i++) pts.push(i * 6 + Math.random(), Math.sin(i / 3) * 30 + Math.random(), 0.5); return { id: 'T' + Math.random().toString(36).slice(2), type: 'trait', x, y, z: Date.now(), auteur: t.moi, pts, couleur: o.couleur ?? '#1b2230', taille: 4, opacite: 1, pression: false } }
  t.nouveauGeste()
  t.doc.transact(() => { for (let i = 0; i < n; i++) t.poser(page, trait((i % 20) * 40, Math.floor(i / 20) * 40)) })
  await t.attendreEcritures()
}, { n, o })
export const sel = (cle, l = 'tous') => `.grille-classeurs.${l} li[data-cle="${cle}"]`
export const fiche = (p, id) => p.evaluate(id => window.__registre.classeur(id), id)
export const recharger = async p => { await p.evaluate(() => window.__bibliotheque.charger()); await p.waitForTimeout(150) }
export async function attendreQue(p, f, arg, ms = 15000) {
  const fin = Date.now() + ms
  let v
  do { v = await p.evaluate(f, arg); if (v) return v; await dort(250) } while (Date.now() < fin)
  return v
}
/** Ce qui dépasse de l'écran (visible, pas dans un conteneur qui défile) */
export const DEBORDE = (racineSel) => {
  const W = innerWidth, H = innerHeight, r = []
  const racine = racineSel ? document.querySelector(racineSel) : document.body
  if (!racine) return ['(pas de racine ' + racineSel + ')']
  const defile = el => { for (let x = el.parentElement; x; x = x.parentElement) { const s = getComputedStyle(x); if (/(auto|scroll)/.test(s.overflowX + s.overflowY) && (x.scrollHeight > x.clientHeight + 1 || x.scrollWidth > x.clientWidth + 1)) return true } return false }
  for (const el of racine.querySelectorAll('button, a, input, select, [role=menuitem], h1, h2, h3, p, label, .carte-nom-classeur')) {
    if (!el.getClientRects().length) continue
    const s = getComputedStyle(el)
    if (s.visibility === 'hidden' || s.display === 'none') continue
    const b = el.getBoundingClientRect()
    if (b.width === 0 || b.height === 0) continue
    if ((b.left < -1 || b.right > W + 1 || b.top < -1 || b.bottom > H + 1) && !defile(el)) r.push(`${el.tagName}.${el.className}:${(el.textContent || el.getAttribute('aria-label') || '').trim().slice(0, 30)} [${Math.round(b.left)},${Math.round(b.top)},${Math.round(b.right)},${Math.round(b.bottom)}]`)
  }
  if (document.documentElement.scrollWidth > W + 1) r.push('page plus large que l\'écran : ' + document.documentElement.scrollWidth)
  return r
}
