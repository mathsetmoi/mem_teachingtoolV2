// Outils communs des vérifications « données » : lire un .memc et la base
// IndexedDB d'une page, en faire un document Yjs (sous Node), comparer.
import { RACINE_ESSAIS, RACINE_DEPOT } from '../../commun/racines.mjs'
import * as Y from 'yjs'
import { gunzipSync } from 'fflate'
import { createHash } from 'node:crypto'

export { Y }
export const R = `${RACINE_ESSAIS}/lot1/verif`
export const DEV = 'http://localhost:5173/'
export const PAGES = 'http://127.0.0.1:4180/'
// La version hors ligne : le build courant du dépôt (npm run build), pas
// une copie figée (lot1/verif/dist-un était celle du lot 1)
export const UN = `file://${RACINE_DEPOT}/dist/index.html`

const resultats = []
export function verifier(nom, ok, detail = '') {
  resultats.push({ nom, ok: !!ok })
  console.log(`${ok ? 'OK   ' : 'ÉCHEC'} ${nom}${detail ? ' — ' + (typeof detail === 'string' ? detail : JSON.stringify(detail)) : ''}`)
}
export function bilan() {
  const ko = resultats.filter(r => !r.ok)
  console.log(`${resultats.length - ko.length} / ${resultats.length} vérifications réussies`)
  return ko.length
}

/** Le fichier .memc : en-tête et document */
export function lireMemc(octets) {
  const fin = octets.indexOf(0x0a)
  const entete = JSON.parse(Buffer.from(octets.subarray(0, fin)).toString('utf8'))
  const etat = gunzipSync(new Uint8Array(octets.subarray(fin + 1)))
  const doc = new Y.Doc({ gc: false })
  Y.applyUpdate(doc, etat)
  return { entete, etat, doc }
}

/** Les mises à jour rangées dans la base 'mem-tableau-local' de la page (en base64) */
export async function idb(page) {
  return page.evaluate(async () => {
    const db = await new Promise((ok, ko) => { const r = indexedDB.open('mem-tableau-local'); r.onsuccess = () => ok(r.result); r.onerror = () => ko(r.error) })
    const tr = db.transaction(['updates'], 'readonly')
    const tout = await new Promise((ok, ko) => { const r = tr.objectStore('updates').getAll(); r.onsuccess = () => ok(r.result); r.onerror = () => ko(r.error) })
    db.close()
    const b64 = u => { let s = ''; for (let i = 0; i < u.length; i += 0x8000) s += String.fromCharCode(...u.subarray(i, i + 0x8000)); return btoa(s) }
    return tout.map(u => b64(u))
  })
}
export function docIdb(liste) {
  const doc = new Y.Doc({ gc: false })
  for (const u of liste) Y.applyUpdate(doc, new Uint8Array(Buffer.from(u, 'base64')))
  return doc
}

const h = o => createHash('sha1').update(Buffer.from(o)).digest('hex').slice(0, 12)

/** Tout ce que contient le document, racine par racine */
export function resume(doc) {
  const film = doc.getArray('film').toArray()
  return {
    ordre: doc.getArray('ordre').toJSON(),
    pages: doc.getMap('pages').toJSON(),
    film: film.length,
    filmEmpreinte: h(Buffer.concat(film.map(e => Buffer.concat([Buffer.from(JSON.stringify({ t: e.t, page: e.page, ms: e.ms ?? null })), Buffer.from(e.s)])))),
    piste: doc.getArray('piste').toJSON(),
    instruments: doc.getMap('instruments').toJSON(),
    images: Object.fromEntries([...doc.getMap('images').entries()].map(([k, v]) => [k, h(Buffer.from(String(v)))])),
    publications: doc.getMap('publications').toJSON(),
    racines: [...doc.share.keys()].sort(),
  }
}
export const empreinteEtat = doc => h(Y.encodeStateAsUpdate(doc))
export const vecteur = doc => Object.fromEntries([...Y.decodeStateVector(Y.encodeStateVector(doc))].sort((a, b) => a[0] - b[0]))

/** a contient-il tout b (structures et effacements) ? */
export function contient(a, b) {
  const manque = Y.encodeStateAsUpdate(b, Y.encodeStateVector(a))
  // Ce qui manquerait à a : rien, à part les effacements de b
  const d = Y.decodeUpdate(manque)
  const dsB = Y.createDeleteSetFromStructStore(b.store), dsA = Y.createDeleteSetFromStructStore(a.store)
  let effManque = 0
  for (const [c, l] of dsB.clients) for (const it of l) {
    for (let k = it.clock; k < it.clock + it.len; k++) {
      const la = dsA.clients.get(c) || []
      if (!la.some(x => k >= x.clock && k < x.clock + x.len)) effManque++
    }
  }
  return { structs: d.structs.length, effManque }
}

/** Ce qui diffère entre deux résumés (les clés seulement) */
export function ecarts(ra, rb) {
  const e = []
  for (const k of Object.keys(ra)) if (JSON.stringify(ra[k]) !== JSON.stringify(rb[k])) e.push(k)
  return e
}

export const dort = ms => new Promise(r => setTimeout(r, ms))
