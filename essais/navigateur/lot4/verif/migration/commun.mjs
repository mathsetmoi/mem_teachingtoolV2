// Outils communs des essais « reprise et données » (lot 4, vérification).
// Une seule origine (http://127.0.0.1:4410) sert la version actuelle
// (/nouveau/ construite par build:pages, /nouveau-dev/ la même avec
// window.__app ; site/ : des liens que refait lot4/verif/batterie.sh, ignorés
// par git). Rangé dans le dépôt : la version d'avant le lot 4 (/ancien/,
// construite depuis un commit qui n'existe plus) et les essais qui la
// remplissaient avant de migrer ses données sont retirés.
import { RACINE_ESSAIS, RACINE_DEPOT } from '../../../commun/racines.mjs'
import { chromium } from '../../../commun/playwright.mjs'
import * as Y from 'yjs'
import { spawn } from 'node:child_process'
import { writeFileSync, mkdtempSync } from 'node:fs'
import { createHash } from 'node:crypto'

export { chromium, Y }
export const M = `${RACINE_ESSAIS}/lot4/verif/migration/`
export const SITE = M + 'site/'
export const PORT = Number(process.env.PORT_ESSAI || 4410)
export const O = `http://127.0.0.1:${PORT}`
export const BASE_PREMIER = 'mem-tableau-local', INDEX = 'mem-teachingtool-bibliotheque', PREFIXE = 'mem-teachingtool-classeur-'

export let echecs = 0
export const constats = []
export const ok = (c, m, detail) => {
  if (!c) { echecs++; constats.push(m + (detail !== undefined ? ' — ' + JSON.stringify(detail) : '')) }
  console.log(c ? '✓' : '✗ ÉCHEC', m, !c && detail !== undefined ? '— ' + JSON.stringify(detail).slice(0, 1500) : '')
}
export const dort = ms => new Promise(r => setTimeout(r, ms))
export const norm = t => (t || '').replace(/[  ]/g, ' ')
export const sha = b => createHash('sha256').update(b).digest('hex').slice(0, 16)

// ---------- L'outil qui lit les bases SANS jamais en créer ----------
writeFileSync(SITE + 'outil.html', `<!doctype html><meta charset="utf-8"><title>Outil</title>
<script>
const req = r => new Promise((ok, ko) => { r.onsuccess = () => ok(r.result); r.onerror = () => ko(r.error) })
const b64 = u => { let s = ''; for (let i = 0; i < u.length; i += 0x8000) s += String.fromCharCode(...u.subarray(i, i + 0x8000)); return btoa(s) }
window.bases = async () => (await indexedDB.databases()).map(d => d.name).sort()
async function ouvrir(nom) {
  if (!(await window.bases()).includes(nom)) return null
  const r = indexedDB.open(nom)
  r.onupgradeneeded = () => r.transaction.abort()
  try { return await req(r) } catch { return null }
}
window.base = async nom => {
  const db = await ouvrir(nom)
  if (!db) return null
  const res = { version: db.version, magasins: [...db.objectStoreNames] }
  if (db.objectStoreNames.contains('updates')) {
    const s = db.transaction(['updates']).objectStore('updates')
    res.cles = await req(s.getAllKeys())
    res.entrees = (await req(s.getAll())).map(b64)
  }
  if (db.objectStoreNames.contains('custom')) {
    const s = db.transaction(['custom']).objectStore('custom')
    const cles = await req(s.getAllKeys()), vals = await req(s.getAll())
    res.custom = Object.fromEntries(cles.map((k, i) => [k, vals[i]]))
  }
  db.close()
  return res
}
const enJson = v => JSON.parse(JSON.stringify(v, (c, x) => x instanceof Uint8Array ? 'u8:' + b64(x) : x instanceof Blob ? 'blob:' + x.size : (typeof FileSystemHandle !== 'undefined' && x instanceof FileSystemHandle) ? 'poignee:' + x.name : x))
window.index = async () => {
  const db = await ouvrir('${INDEX}')
  if (!db) return null
  const res = { version: db.version, magasins: [...db.objectStoreNames].sort() }
  for (const m of res.magasins) {
    const s = db.transaction([m]).objectStore(m)
    const cles = await req(s.getAllKeys()), vals = await req(s.getAll())
    res[m] = cles.map((k, i) => [k, enJson(vals[i])])
  }
  db.close()
  return res
}
window.stockage = () => { const o = {}; for (let i = 0; i < localStorage.length; i++) { const k = localStorage.key(i); o[k] = localStorage.getItem(k) } return o }
// Écrire une entrée brute dans une base existante (pour l'abîmer)
window.ajouterEntree = async (nom, octets) => {
  const db = await ouvrir(nom); if (!db) return 'absente'
  const t = db.transaction(['updates'], 'readwrite'); t.objectStore('updates').add(new Uint8Array(octets))
  await new Promise((ok, ko) => { t.oncomplete = ok; t.onabort = () => ko(t.error) }); db.close(); return 'ok'
}
</script>`)

export function serveur() {
  const s = spawn('python3', ['-m', 'http.server', String(PORT), '--bind', '127.0.0.1', '--directory', SITE], { stdio: 'ignore' })
  return s
}

export async function attendreServeur() {
  for (let i = 0; i < 50; i++) {
    try { const r = await fetch(O + '/outil.html'); if (r.ok) return } catch { /* pas encore */ }
    await dort(100)
  }
  throw new Error('serveur absent')
}

export const erreurs = []
export const suivre = (p, nom) => {
  p.on('pageerror', e => erreurs.push(`${nom}: ${e.message}`))
  p.on('console', m => { if (m.type() === 'error' && !/Failed to load resource|ERR_CERT|net::|favicon/.test(m.text())) erreurs.push(`${nom}: ${m.text()}`) })
}

export const pret = (p, t = 20000) => p.waitForFunction(() => document.querySelector('.rang')?.textContent?.includes('/'), null, { timeout: t })
export const rang = async p => norm((await p.textContent('.rang')) || '').trim()

export function profil() { return mkdtempSync(M + 'profils/p-') }
export const lancer = (dir, o = {}) => chromium.launchPersistentContext(dir, { viewport: { width: 1366, height: 768 }, acceptDownloads: true, ...o })

export async function outil(ctx) { const q = await ctx.newPage(); await q.goto(O + '/outil.html'); return q }

// ---------- Les documents ----------
export const u8 = e => new Uint8Array(Buffer.from(e, 'base64'))
export function docDe(entrees) {
  const d = new Y.Doc({ gc: false })
  for (const e of entrees) Y.applyUpdate(d, typeof e === 'string' ? u8(e) : e)
  return d
}
/** Un résumé lisible du contenu d'un document de classeur */
export function resume(d) {
  const ordre = d.getArray('ordre').toArray()
  const pages = d.getMap('pages')
  const formes = {}
  pages.forEach((p, id) => { formes[id] = p.get('formes')?.size ?? -1 })
  return {
    ordre, formes,
    noms: d.getMap('nomsPages').toJSON(),
    corbeille: Object.keys(d.getMap('corbeille').toJSON()),
    film: d.getArray('film').length,
    piste: d.getArray('piste').length,
    publications: Object.keys(d.getMap('publications').toJSON()),
    instruments: d.getMap('instruments').toJSON(),
    images: d.getMap('images').size,
  }
}
/** a contient-il b (toute l'histoire de b est dans a) ? */
export function contient(a, b) {
  const va = Y.decodeStateVector(Y.encodeStateVector(a)), vb = Y.decodeStateVector(Y.encodeStateVector(b))
  for (const [c, n] of vb) if ((va.get(c) ?? 0) < n) return false
  // et les effacements de b sont dans a
  const da = Y.encodeStateAsUpdate(a), db = Y.encodeStateAsUpdate(b)
  const fusion = Y.mergeUpdates([da, db])
  const d2 = docDe([fusion])
  return Buffer.compare(Buffer.from(Y.encodeStateAsUpdate(d2)), Buffer.from(da)) === 0
}
export const octets = d => Buffer.from(Y.encodeStateAsUpdate(d))
export const egaux = (a, b) => Buffer.compare(octets(a), octets(b)) === 0
