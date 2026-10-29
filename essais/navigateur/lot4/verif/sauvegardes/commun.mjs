// Outils communs des essais « sauvegardes » (lot 4, vérification) : copiés de
// S/lot4/C4-cle.mjs (l'OPFS à la place du choix de fichier, les permissions
// simulées, les écritures notées) et lisant les .memc sous Node.
import { RACINE_ESSAIS, RACINE_DEPOT } from '../../../commun/racines.mjs'
import { chromium, lancerPersistant } from '../../../commun/playwright.mjs'
import * as Y from 'yjs'
import { gunzipSync, gzipSync } from 'node:zlib'
export { chromium, lancerPersistant, Y, gunzipSync, gzipSync }
export const V = `${RACINE_ESSAIS}/lot4/verif/sauvegardes/`
export const DEV = 'http://localhost:5173/'
export let echecs = 0
export const ok = (c, m, detail) => { if (!c) echecs++; console.log(c ? '✓' : '✗ ÉCHEC', m, !c && detail !== undefined ? '— ' + JSON.stringify(detail).slice(0, 2000) : (c && detail !== undefined && process.env.DETAIL ? '— ' + JSON.stringify(detail).slice(0, 600) : '')) }
export const info = (m, d) => console.log('·', m, d === undefined ? '' : JSON.stringify(d).slice(0, 2000))
export const dort = ms => new Promise(r => setTimeout(r, ms))
export const norm = t => (t || '').replace(/[  ]/g, ' ')
export const erreurs = []
export const suivre = (p, nom) => {
  p.on('pageerror', e => erreurs.push(`${nom}: ${e.message}`))
  p.on('console', m => { if (m.type() === 'error' && !/Failed to load resource|ERR_CERT|net::|ERR_INTERNET_DISCONNECTED|favicon/.test(m.text())) erreurs.push(`${nom}: ${m.text()}`) })
}
export const pret = async p => {
  await p.waitForFunction(() => window.__surveillance && document.querySelector('.rang')?.textContent?.includes('/'), null, { timeout: 30000 })
  await p.evaluate(() => Promise.all([window.__cle?.pret, window.__drive?.pret]))
}
export async function ecrire(p, x0, y0, n = 10) {
  await p.mouse.move(x0, y0); await p.mouse.down()
  for (let i = 1; i <= n; i++) await p.mouse.move(x0 + i * 10, y0 + Math.sin(i / 2) * 16)
  await p.mouse.up(); await p.waitForTimeout(80)
}
/** Les poignées de l'OPFS, les permissions simulées, les écritures notées */
export const INIT = () => {
  let depart = null
  try { depart = sessionStorage.getItem('__permissionDepart') } catch { /* rien */ }
  window.__permission = depart || 'granted'
  window.__refus = false
  window.__appels = []
  window.__ecritures = []
  window.__tentatives = 0
  window.__panne = null
  window.__nomChoisi = null
  window.__aOuvrir = null
  window.__choix = []
  window.__retarderClose = 0
  const H = window.FileSystemHandle?.prototype
  if (!H) return
  H.queryPermission = async function () { window.__appels.push({ quoi: 'query', actif: navigator.userActivation.isActive }); return window.__permission }
  H.requestPermission = async function () {
    const actif = navigator.userActivation.isActive
    const r = window.__refus ? 'denied' : actif ? 'granted' : window.__permission
    window.__appels.push({ quoi: 'request', actif, rendu: r })
    if (r === 'granted') window.__permission = 'granted'
    return r
  }
  const F = FileSystemFileHandle.prototype
  const cw = F.createWritable
  window.__cwOrig = cw
  F.createWritable = async function (...a) {
    window.__tentatives++
    const panne = window.__panne
    if (panne === 'NotFoundError' || panne === 'NoModificationAllowedError' || panne === 'NotAllowedError') throw new DOMException('panne simulée', panne)
    const w = await cw.apply(this, a)
    const e = { nom: this.name, debut: Date.now() }
    window.__ecritures.push(e)
    try { localStorage.setItem('__ecritureCommencee', String(Date.now())) } catch {}
    return {
      write: async d => {
        if (window.__panne === 'QuotaExceededError') { e.echec = 'QuotaExceededError'; throw new DOMException('plus de place', 'QuotaExceededError') }
        e.taille = d.size
        return w.write(d)
      },
      close: async () => {
        if (window.__retarderClose) { e.attente = true; await new Promise(r => setTimeout(r, window.__retarderClose)) }
        await w.close(); e.fin = Date.now()
        try { localStorage.setItem('__ecritureFinie', String(Date.now())) } catch {}
      },
      abort: async r => { e.abandon = true; return w.abort(r) },
    }
  }
  window.showSaveFilePicker = async o => {
    const dir = await navigator.storage.getDirectory()
    const nom = window.__nomChoisi || o?.suggestedName || 'sans-nom.memc'
    window.__choix.push({ quoi: 'save', nom, actif: navigator.userActivation.isActive })
    return dir.getFileHandle(nom, { create: true })
  }
  window.showOpenFilePicker = async o => {
    const dir = await navigator.storage.getDirectory()
    window.__choix.push({ quoi: 'open', nom: window.__aOuvrir })
    return [await dir.getFileHandle(window.__aOuvrir)]
  }
  document.addEventListener('visibilitychange', () => { try { localStorage.setItem('__visibilite', document.visibilityState + ' ' + Date.now()) } catch {} })
}
export const ECOUTER_TOASTS = () => {
  window.__toasts = []
  let dernier = ''
  setInterval(() => { const t = (document.querySelector('.toast')?.textContent || '').replace(/[  ]/g, ' '); if (t && t !== dernier) { dernier = t; window.__toasts.push(t) } }, 15)
}
export const toasts = p => p.evaluate(() => window.__toasts.splice(0))
export const ETAT = () => {
  const band = document.querySelector('.bandeau-sauvegarde')
  const n = s => (s || '').replace(/[  ]/g, ' ')
  return {
    cle: window.__cle ? { ...window.__cle.etat, message: n(window.__cle.etat.message) } : null,
    drive: window.__drive ? { ...window.__drive.etat, message: n(window.__drive.etat.message) } : null,
    court: n(document.querySelector('.etat-classeur')?.textContent),
    niveau: window.__surveillance?.texte.niveau,
    point: [...document.querySelectorAll('.point-etat')].some(x => !x.hidden),
    bandeau: !band || band.hidden ? null : { raison: band.dataset.raison, texte: n(band.querySelector('.texte-bandeau')?.textContent), boutons: [...band.querySelectorAll('.bouton-bandeau')].map(x => x.textContent) },
    lignes: (window.__surveillance?.texte.lignes ?? []).map(l => `${l.quoi}:${l.niveau}:${n(l.texte)}`),
    description: n(document.getElementById('etat-classeur-description')?.textContent || ''),
  }
}
export const etat = p => p.evaluate(ETAT)
export async function entree(p, action) {
  await p.click('.barre-haut .bouton.points'); await p.waitForTimeout(150)
  await p.click(`.menu-flottant:not([hidden]) .menu-item[data-action="${action}"]`)
}
export const opfsLire = async (p, nom) => {
  const b64 = await p.evaluate(async nom => {
    try {
      const f = await (await (await navigator.storage.getDirectory()).getFileHandle(nom)).getFile()
      const o = new Uint8Array(await f.arrayBuffer())
      let s = ''; for (let i = 0; i < o.length; i += 0x8000) s += String.fromCharCode.apply(null, o.subarray(i, i + 0x8000))
      return btoa(s)
    } catch { return null }
  }, nom)
  return b64 === null ? null : Buffer.from(b64, 'base64')
}
export function lireMemc(o) {
  const fin = o.indexOf(0x0a)
  const entete = JSON.parse(o.subarray(0, fin).toString('utf8'))
  const d = new Y.Doc({ gc: false })
  Y.applyUpdate(d, new Uint8Array(gunzipSync(o.subarray(fin + 1))))
  const ordre = d.getArray('ordre').toArray()
  const ids = ordre.flatMap(id => [...(d.getMap('pages').get(id)?.get('formes')?.keys() ?? [])])
  return { entete, ids, pages: ordre.length, entier: !d.store.pendingStructs && !d.store.pendingDs, doc: d }
}
/** Le document de la page (l'état complet, en mémoire) */
export const etatDeLaPage = async p => {
  const b64 = await p.evaluate(() => {
    const Yp = window.__app.tableau.doc.constructor
    return null
  })
  const r = await p.evaluate(async () => {
    const f = await import('/src/fichier.ts')
    const o = new Uint8Array(await f.ecrireTableau(window.__app.tableau.doc, 1).arrayBuffer())
    let s = ''; for (let i = 0; i < o.length; i += 0x8000) s += String.fromCharCode.apply(null, o.subarray(i, i + 0x8000))
    return btoa(s)
  })
  return lireMemc(Buffer.from(r, 'base64')).doc
}
export const octets = d => Buffer.from(Y.encodeStateAsUpdate(d))
/** Deux documents ont exactement le même contenu (mêmes structures, même effacements) */
export function memeContenu(a, b) {
  const fa = Y.mergeUpdates([Y.encodeStateAsUpdate(a)]), fb = Y.mergeUpdates([Y.encodeStateAsUpdate(b)])
  const da = new Y.Doc({ gc: false }); Y.applyUpdate(da, fa)
  const db = new Y.Doc({ gc: false }); Y.applyUpdate(db, fb)
  Y.applyUpdate(da, fb); Y.applyUpdate(db, fa)
  return Buffer.compare(Buffer.from(Y.encodeStateVector(da)), Buffer.from(Y.encodeStateVector(a))) === 0
    && Buffer.compare(Buffer.from(Y.encodeStateVector(db)), Buffer.from(Y.encodeStateVector(b))) === 0
    && JSON.stringify(a.getMap('pages').toJSON()) === JSON.stringify(b.getMap('pages').toJSON())
    && JSON.stringify(a.getArray('ordre').toJSON()) === JSON.stringify(b.getArray('ordre').toJSON())
    && Buffer.compare(Buffer.from(Y.encodeStateAsUpdate(da)), Buffer.from(Y.encodeStateAsUpdate(db))) === 0
}
export const formesIds = p => p.evaluate(() => window.__app.formes.map(f => f.id))
export const nbEcrites = p => p.evaluate(() => window.__ecritures.filter(e => e.fin).length)
export const attendreEcrites = (p, n, timeout = 30000) => p.waitForFunction(n => window.__ecritures.filter(e => e.fin).length >= n, n, { timeout }).then(() => true, () => false)
