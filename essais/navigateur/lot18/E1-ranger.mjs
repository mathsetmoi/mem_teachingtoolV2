// ESSAI DU LOT 18 : un seul endroit pour chaque classeur. La fenêtre « Où
// ranger les classeurs de « 5eme » ? », les établissements, le dossier du
// niveau au nom tapé, un dossier par classeur, et chaque classeur qui arrive
// dans un niveau rangé reçoit son fichier à sa place.
// Le serveur de développement (port 5173, ou DEV=…) et la version hors ligne
// (dist/index.html en file:// : `npm run build` d'abord). Les dossiers de
// l'ordinateur sont des dossiers de l'OPFS (showDirectoryPicker,
// showOpenFilePicker, showSaveFilePicker simulés, comme lot7/E1-ailleurs.mjs) ;
// queryPermission et requestPermission rendent « granted » et chaque demande
// est notée avec navigator.userActivation.isActive : aucune hors d'un geste.
// Sans accents dans les noms que l'essai choisit, et l'OPFS simulé retire
// ceux des noms que l'outil lui demande (« Séances isolées » devient
// « Seances isolees ») : l'OPFS de Chromium refuse parfois « Symétrie.memc »
// dans un dossier qui existe déjà (« The path supplied exists, but was not an
// entry of requested type ») ; un vrai dossier garde les accents.
// `node lot18/E1-ranger.mjs A` : la suite A à J seule ; `E` ou `K` : cette
// section seule (elles ont chacune leur contexte).
// A. Premier « Nouveau classeur » dans un niveau pas rangé : la fenêtre (le
//    titre, aucun établissement, « Choisir un dossier… » crée « LFB classeurs »
//    sélectionné, le champ propose « 5eme », on tape « 5 »), le bouton
//    « Ranger dans « LFB classeurs › 5 » », les classeurs du niveau écrits
//    dans LFB classeurs/5/<classeur>/<classeur>.memc, cle.chemin, le
//    message du bilan, les réglages ; aucun requestPermission hors geste.
// B. La fenêtre « Nouveau classeur » qui suit : pas de case, « Son fichier ira
//    dans … » qui suit le nom ; le fichier écrit avant de partir, la clé
//    active à l'arrivée, le chemin dans la fiche.
// C. Un deuxième niveau : « LFB classeurs » proposé, « MEM classeurs » ajouté
//    par « Choisir un dossier… » ; « Mes emplacements » : la ligne des
//    établissements, « 5eme → LFB classeurs › 5 » avec « Changer… ».
// D. « Plus tard » sur un troisième niveau : rien, noté, plus de fenêtre au
//    « Nouveau classeur » suivant ; dans ce dossier, « 3eme → pas encore
//    rangé dans un dossier » [Ranger…] rouvre la fenêtre.
// F. Un .memc ajouté (Ouvrir → Ajouter, sans la case) dans un niveau rangé
//    reçoit son fichier ; le même fichier déjà à sa place est adopté (pas de
//    « (2) »).
// G. Un classeur remis de la corbeille reçoit son fichier.
// H. « Un autre dossier, pour ce niveau seul… » : un emplacement sans
//    établissement, « Cet ordinateur › Cle 3eme », chemin = [dossier, classeur].
// I. « Changer… » vers un autre établissement : les nouveaux fichiers écrits,
//    les anciens toujours là, le message le dit.
// J. Publier → « Enregistrer le fichier » dans un niveau rangé : le .mem sans
//    code dans le dossier du chapitre, le message.
// E. « Séances isolées » (le lien de « Bonjour ! ») dans un niveau rangé
//    reçoit son fichier (un contexte à part, avec l'horloge de Playwright ;
//    après J pour ne pas mêler l'horloge au reste).
// K. La version hors ligne : la fenêtre marche avec le picker simulé.
// CAPTURES=<dossier> : une capture PNG de la fenêtre « Où ranger… ».
// Une ligne « ✓ » ou « ✗ ÉCHEC » par vérification ; code de sortie 1 s'il y
// a un échec ou une erreur JS.
import { RACINE_DEPOT } from '../commun/racines.mjs'
import { lancerPersistant } from '../commun/playwright.mjs'
import { existsSync, mkdirSync } from 'node:fs'
import { join } from 'node:path'
import { pathToFileURL } from 'node:url'

const DEV = process.env.DEV ?? 'http://localhost:5173/'
const CAPTURES = process.env.CAPTURES ?? null
if (CAPTURES) mkdirSync(CAPTURES, { recursive: true })
const seul = section => process.argv.length <= 2 || process.argv.slice(2).includes(section)
let echecs = 0
const ok = (c, m, detail) => { if (!c) echecs++; console.log(c ? '✓' : '✗ ÉCHEC', m, !c && detail !== undefined ? '— ' + JSON.stringify(detail).slice(0, 1500) : '') }
const norm = t => (t || '').replace(/[  ]/g, ' ')
const erreurs = []
const suivre = (p, nom) => {
  p.on('pageerror', e => erreurs.push(`${nom}: ${e.message}`))
  p.on('console', m => { if (m.type() === 'error' && !/Failed to load resource|ERR_CERT|net::|ERR_INTERNET_DISCONNECTED/.test(m.text())) erreurs.push(`${nom}: ${m.text()}`) })
}
const H = 3600_000
const T0 = new Date('2026-10-12T08:00:00').getTime()

// ---------- La page ----------
/** Les permissions (accordées, et chaque demande notée avec le geste), les
 *  choix de fichiers et de dossiers dans l'OPFS, les écritures notées dans
 *  sessionStorage (elles survivent au départ vers un autre classeur), l'heure
 *  du départ (pagehide) */
const INIT = () => {
  window.__aOuvrir = null
  window.__dossierChoisi = null
  const note = (cle, x) => { try { const l = JSON.parse(sessionStorage.getItem(cle) || '[]'); l.push(x); sessionStorage.setItem(cle, JSON.stringify(l)) } catch { /* rien */ } }
  addEventListener('pagehide', () => { try { sessionStorage.setItem('__parti', String(Date.now())) } catch { /* rien */ } })
  const H = window.FileSystemHandle?.prototype
  if (!H) return
  H.queryPermission = async function () { return 'granted' }
  H.requestPermission = async function () { note('__demandes', { nom: this.name, actif: navigator.userActivation.isActive, t: Date.now() }); return 'granted' }
  // L'OPFS refuse parfois un nom accentué (voir l'en-tête) : les noms que
  // l'outil demande perdent leurs accents (un vrai dossier les garde)
  const D = window.FileSystemDirectoryHandle?.prototype
  const sansAccents = n => String(n).normalize('NFD').replace(/[̀-ͯ]/g, '')
  for (const m of ['getDirectoryHandle', 'getFileHandle', 'removeEntry']) { const o = D[m]; D[m] = function (n, ...a) { return o.call(this, sansAccents(n), ...a) } }
  const F = window.FileSystemFileHandle?.prototype
  const cw = F.createWritable
  F.createWritable = async function (...a) {
    const w = await cw.apply(this, a)
    const nom = this.name
    return { write: d => w.write(d), close: async () => { await w.close(); note('__ecritures', { nom, t: Date.now() }) }, abort: r => w.abort(r) }
  }
  const racine = async chemin => { let d = await navigator.storage.getDirectory(); for (const n of chemin.split('/').filter(Boolean)) d = await d.getDirectoryHandle(n, { create: true }); return d }
  window.__racineOpfs = racine
  window.showOpenFilePicker = async () => {
    const chemins = [].concat(window.__aOuvrir ?? [])
    window.__aOuvrir = null
    if (!chemins.length) throw new DOMException('rien', 'AbortError')
    return Promise.all(chemins.map(async c => { const i = c.lastIndexOf('/'); return (await racine(i < 0 ? '' : c.slice(0, i))).getFileHandle(i < 0 ? c : c.slice(i + 1)) }))
  }
  window.showSaveFilePicker = async o => (await navigator.storage.getDirectory()).getFileHandle(o?.suggestedName || 'x.memc', { create: true })
  window.showDirectoryPicker = async o => {
    const c = window.__dossierChoisi
    window.__dossierChoisi = null
    note('__choixDossier', { id: o?.id, actif: navigator.userActivation.isActive, dossier: c })
    if (!c) throw new DOMException('rien', 'AbortError')
    return racine(c)
  }
}
const ECOUTER_TOASTS = () => {
  window.__toasts = []
  let dernier = ''
  setInterval(() => { const t = [...document.querySelectorAll('.toast')].map(x => x.textContent).join('|').replace(/[  ]/g, ' '); if (t && t !== dernier) { dernier = t; window.__toasts.push(t) } }, 15)
}
/** Dans la page : des classeurs et des dossiers dans la bibliothèque (comme
 *  lot7/E1), un .memc neuf dans l'OPFS, le contenu d'un dossier de l'OPFS */
const OUTILS = () => {
  const trait = (auteur, x, y, id) => ({ id, type: 'trait', x, y, z: Date.now() + Math.random(), auteur, pts: [0, 0, 0.5, 40, 5, 0.5, 80, 0, 0.5], couleur: '#1b2230', taille: 3, opacite: 1, pression: false })
  window.__creer = async (liste) => {
    const dem = await import('/src/classeurs/demarrage.ts'), bases = await import('/src/classeurs/bases.ts')
    const { Tableau } = await import('/src/document.ts'), fichier = await import('/src/fichier.ts')
    const T = Date.now(), r = []
    for (const o of liste) {
      const t = new Tableau(null)
      const a = t.ajouterPage('blanche', 0); await Promise.resolve(); t.pageVue = a
      t.nouveauGeste(); t.poser(a, trait(t.moi, 10, 10, 't' + Math.random().toString(36).slice(2))); await Promise.resolve()
      const { etat } = fichier.lireTableau(new Uint8Array(await fichier.ecrireTableau(t.doc).arrayBuffer()))
      t.doc.destroy()
      const id = dem.idClasseur(), nom = o.nom
      const fiche = { id, base: dem.baseDe(id), nom, dossier: o.dossier ?? null, etiquettes: [], cree: T - 3600e3, modifie: T - 600e3, ouvert: 0, pages: 1 }
      await window.__registre.creerClasseur(fiche, b => bases.creerBase(b, etat, { id, nom }))
      r.push(id)
    }
    return r
  }
  window.__memcNeuf = async (chemin, nomFichier, nom) => {
    const dem = await import('/src/classeurs/demarrage.ts')
    const { Tableau } = await import('/src/document.ts'), fichier = await import('/src/fichier.ts')
    const t = new Tableau(null)
    const a = t.ajouterPage('blanche', 0); await Promise.resolve(); t.pageVue = a
    t.nouveauGeste(); t.poser(a, trait(t.moi, 20, 20, 'n' + Math.random().toString(36).slice(2))); await Promise.resolve()
    const blob = fichier.ecrireTableau(t.doc, Date.now(), { nom, id: dem.idClasseur() })
    t.doc.destroy()
    const h = await (await window.__racineOpfs(chemin)).getFileHandle(nomFichier, { create: true })
    const w = await h.createWritable(); await w.write(blob); await w.close()
  }
  window.__dossier = async (nom, o = {}) => {
    const dem = await import('/src/classeurs/demarrage.ts')
    const d = { id: dem.idClasseur(), nom, parent: o.parent ?? null, couleur: '#3b6fb6', cree: Date.now(), ...(o.etiquette ? { etiquette: o.etiquette } : {}) }
    await window.__registre.ajouterDossier(d)
    return d.id
  }
  /** Ce qu'il y a dans un dossier de l'OPFS : nom → taille (les sous-dossiers en objets) ; null s'il n'existe pas */
  window.__lister = async chemin => {
    const voir = async d => { const o = {}; for await (const [n, h] of d.entries()) o[n] = h.kind === 'directory' ? await voir(h) : (await h.getFile()).size; return o }
    try {
      let d = await navigator.storage.getDirectory()
      for (const n of chemin.split('/').filter(Boolean)) d = await d.getDirectoryHandle(n)
      return voir(d)
    } catch { return null }
  }
}
/** La version hors ligne (file://) n'a pas d'OPFS (SecurityError) : un faux
 *  système de fichiers en mémoire, gardé dans sessionStorage (le contenu en
 *  base64), qui survit au départ vers le classeur créé. Les poignées que
 *  l'outil range dans IndexedDB y entrent comme des repères
 *  { __fauxPoignee: chemin } (IDBObjectStore.put) et en ressortent vivantes
 *  (IDBRequest.result), dans cette page comme dans la suivante. */
const FAUX_FS = () => {
  const CLE = '__fauxFS'
  const note = (cle, x) => { try { const l = JSON.parse(sessionStorage.getItem(cle) || '[]'); l.push(x); sessionStorage.setItem(cle, JSON.stringify(l)) } catch { /* rien */ } }
  const lire = () => { try { return JSON.parse(sessionStorage.getItem(CLE) || '{}') } catch { return {} } }
  const garder = () => { try { sessionStorage.setItem(CLE, JSON.stringify(arbre)) } catch { /* rien */ } }
  let arbre = lire() // chemin → { kind: 'directory' } | { kind: 'file', b64, t }
  const enB64 = u8 => { let s = ''; for (let i = 0; i < u8.length; i += 0x8000) s += String.fromCharCode(...u8.subarray(i, i + 0x8000)); return btoa(s) }
  const deB64 = s => Uint8Array.from(atob(s || ''), c => c.charCodeAt(0))
  const erreur = (nom, m) => new DOMException(m, nom)
  class Poignee {
    constructor(chemin, kind) { this.name = chemin.split('/').pop(); this.kind = kind; Object.defineProperty(this, '__chemin', { value: chemin, enumerable: false }) }
    async isSameEntry(x) { return !!x && x.__chemin === this.__chemin }
    async queryPermission() { return 'granted' }
    async requestPermission() { note('__demandes', { nom: this.name, actif: navigator.userActivation.isActive, t: Date.now() }); return 'granted' }
  }
  class Dossier extends Poignee {
    constructor(chemin) { super(chemin, 'directory') }
    enfants() { const p = this.__chemin + '/'; return Object.keys(arbre).filter(k => k.startsWith(p) && !k.slice(p.length).includes('/')).sort() }
    async getDirectoryHandle(n, o) {
      const c = this.__chemin + '/' + n, x = arbre[c]
      if (x) { if (x.kind !== 'directory') throw erreur('TypeMismatchError', 'pas un dossier'); return new Dossier(c) }
      if (!o?.create) throw erreur('NotFoundError', 'absent')
      arbre[c] = { kind: 'directory' }; garder()
      return new Dossier(c)
    }
    async getFileHandle(n, o) {
      const c = this.__chemin + '/' + n, x = arbre[c]
      if (x) { if (x.kind !== 'file') throw erreur('TypeMismatchError', 'pas un fichier'); return new Fichier(c) }
      if (!o?.create) throw erreur('NotFoundError', 'absent')
      arbre[c] = { kind: 'file', b64: '', t: Date.now() }; garder()
      return new Fichier(c)
    }
    async removeEntry(n) {
      const c = this.__chemin + '/' + n
      if (!arbre[c]) throw erreur('NotFoundError', 'absent')
      for (const k of Object.keys(arbre)) if (k === c || k.startsWith(c + '/')) delete arbre[k]
      garder()
    }
    async *entries() { for (const k of this.enfants()) yield [k.split('/').pop(), vivante(k)] }
    async *values() { for (const k of this.enfants()) yield vivante(k) }
    async *keys() { for (const k of this.enfants()) yield k.split('/').pop() }
    [Symbol.asyncIterator]() { return this.entries() }
  }
  class Fichier extends Poignee {
    constructor(chemin) { super(chemin, 'file') }
    async getFile() { const x = arbre[this.__chemin]; if (!x) throw erreur('NotFoundError', 'absent'); return new File([deB64(x.b64)], this.name, { lastModified: x.t ?? Date.now() }) }
    async createWritable(o) {
      const chemin = this.__chemin, morceaux = o?.keepExistingData ? [deB64(arbre[chemin]?.b64)] : []
      const octets = async d => {
        if (d && typeof d === 'object' && !(d instanceof Blob) && !ArrayBuffer.isView(d) && !(d instanceof ArrayBuffer) && 'data' in d) d = d.data
        if (d instanceof Blob) return new Uint8Array(await d.arrayBuffer())
        if (d instanceof ArrayBuffer) return new Uint8Array(d)
        if (ArrayBuffer.isView(d)) return new Uint8Array(d.buffer, d.byteOffset, d.byteLength)
        return new TextEncoder().encode(String(d))
      }
      return {
        write: async d => { morceaux.push(await octets(d)) },
        close: async () => {
          const total = new Uint8Array(morceaux.reduce((s, x) => s + x.length, 0))
          let i = 0; for (const m of morceaux) { total.set(m, i); i += m.length }
          arbre[chemin] = { kind: 'file', b64: enB64(total), t: Date.now() }; garder()
          note('__ecritures', { nom: chemin.split('/').pop(), t: Date.now() })
        },
        abort: async () => {}, truncate: async () => {}, seek: async () => {},
      }
    }
  }
  const vivante = chemin => (arbre[chemin]?.kind === 'file' ? new Fichier(chemin) : new Dossier(chemin))
  window.__fauxArbre = () => lire()
  window.__dossierChoisi = null
  window.showDirectoryPicker = async o => {
    const c = window.__dossierChoisi
    window.__dossierChoisi = null
    note('__choixDossier', { id: o?.id, actif: navigator.userActivation.isActive, dossier: c })
    if (!c) throw erreur('AbortError', 'rien')
    if (!arbre[c]) { arbre[c] = { kind: 'directory' }; garder() }
    return new Dossier(c)
  }
  // IndexedDB : les repères à l'écriture, les poignées vivantes à la lecture
  const plain = v => v && typeof v === 'object' && Object.getPrototypeOf(v) === Object.prototype
  const remplacer = v => {
    if (v instanceof Poignee) return { __fauxPoignee: v.__chemin }
    if (Array.isArray(v)) { let c = null; v.forEach((x, i) => { const y = remplacer(x); if (y !== x) { c ??= v.slice(); c[i] = y } }); return c ?? v }
    if (plain(v)) { let c = null; for (const k of Object.keys(v)) { const y = remplacer(v[k]); if (y !== v[k]) { c ??= { ...v }; c[k] = y } } return c ?? v }
    return v
  }
  const restaurer = v => {
    if (Array.isArray(v)) { v.forEach((x, i) => { v[i] = restaurer(x) }); return v }
    if (plain(v)) {
      if (typeof v.__fauxPoignee === 'string') return vivante(v.__fauxPoignee)
      for (const k of Object.keys(v)) v[k] = restaurer(v[k])
    }
    return v
  }
  for (const m of ['put', 'add']) { const o = IDBObjectStore.prototype[m]; IDBObjectStore.prototype[m] = function (v, ...a) { return o.call(this, remplacer(v), ...a) } }
  const desc = Object.getOwnPropertyDescriptor(IDBRequest.prototype, 'result')
  Object.defineProperty(IDBRequest.prototype, 'result', { configurable: true, get() { return restaurer(desc.get.call(this)) } })
}
const RANGER = () => {
  const d = document.querySelector('dialog.dialogue-ranger[open]')
  if (!d) return null
  const n = t => (t || '').replace(/[  ]/g, ' ')
  return {
    titre: n(d.querySelector('h2')?.textContent),
    etabs: [...d.querySelectorAll('label.r-etab')].map(l => ({ nom: l.querySelector('span').textContent, id: l.dataset.id, coche: l.querySelector('input').checked })),
    autre: d.querySelector('input[name="r-etab"][value="autre"]').checked,
    champ: d.querySelector('input[name="niveau"]').value, champCache: d.querySelector('.r-niveau').hidden,
    libelle: n(d.querySelector('.r-niveau-libelle')?.textContent),
    ok: n(d.querySelector('.r-ok').textContent), okGris: d.querySelector('.r-ok').disabled,
    plusTard: n(d.querySelector('.r-plus-tard').textContent), choisir: n(d.querySelector('.r-choisir-dossier').textContent),
    explication: n(d.querySelector('.r-explication').textContent),
    erreur: d.querySelector('.erreur').hidden ? null : n(d.querySelector('.erreur').textContent),
  }
}
const EMPLACEMENTS = () => {
  const s = document.querySelector('.emplacements')
  if (!s || s.hidden) return null
  const n = t => (t || '').replace(/[  ]/g, ' ')
  const e = s.querySelector('.etablissements')
  return {
    titre: s.querySelector('h3')?.textContent,
    etabs: e ? { entete: e.querySelector('strong')?.textContent, aucun: e.querySelector('.aucun')?.textContent ?? null, noms: [...e.querySelectorAll('.etablissement .nom')].map(x => x.textContent), retirer: e.querySelectorAll('.e-retirer-etab').length, ajouter: e.querySelector('.e-ajouter')?.textContent ?? null } : null,
    lignes: [...s.querySelectorAll('li.emplacement')].map(li => ({ genre: li.dataset.genre, dossier: li.dataset.dossier ?? null, texte: n(li.querySelector('.texte')?.textContent), boutons: [...li.querySelectorAll('button')].map(b => b.textContent) })),
  }
}
const DIALOGUE = () => {
  const d = document.querySelector('dialog[open]')
  return d ? { titre: d.querySelector('h2')?.textContent, classe: d.className, texte: (d.textContent || '').replace(/[  ]/g, ' ') } : null
}
const toasts = p => p.evaluate(() => (window.__toasts || []).splice(0))
const attendreToast = (p, re, timeout = 20000) => p.waitForFunction(s => (window.__toasts || []).some(t => new RegExp(s).test(t)), re.source, { timeout }).then(() => true, () => false)
const notes = (p, cle) => p.evaluate(c => JSON.parse(sessionStorage.getItem(c) || '[]'), cle)
const oublier = (p, ...cles) => p.evaluate(cs => { for (const c of cs) sessionStorage.removeItem(c) }, cles)
const fiches = p => p.evaluate(async () => (await window.__registre.classeurs()).map(f => ({ id: f.id, nom: f.nom, dossier: f.dossier, corbeille: !!f.corbeille, cle: f.cle ? { nom: f.cle.nom, chemin: f.cle.chemin ?? null } : null })))
const reglage = (p, cle) => p.evaluate(async c => { const x = await window.__registre.reglage(c); return x && typeof x === 'object' && typeof x.getDirectoryHandle === 'function' ? { poignee: x.name } : x ?? null }, cle)
const lister = (p, chemin) => p.evaluate(c => window.__lister(c), chemin)
const ranger = p => p.evaluate(RANGER)
const emplacements = p => p.evaluate(EMPLACEMENTS)
const dialogue = p => p.evaluate(DIALOGUE)

// lancerPersistant, et non chromium.launch : voir commun/playwright.mjs (les poignées relues depuis IndexedDB)
const navigateur = await lancerPersistant()
async function contexte() {
  const ctx = await navigateur.newContext({ viewport: { width: 1366, height: 768 } })
  await ctx.addInitScript(INIT)
  await ctx.addInitScript(ECOUTER_TOASTS)
  await ctx.addInitScript(OUTILS)
  return ctx
}
/** Prêt : un classeur chargé (son état, sa bibliothèque), ou la bibliothèque seule */
const pret = p => p.waitForFunction(() => (window.__surveillance && window.__bibliotheque && document.querySelector('.rang')?.textContent?.includes('/'))
  || (window.__bibliotheque && !window.__app && !document.querySelector('.bibliotheque').hidden), null, { timeout: 30000 })
async function ouvrirPage(ctx, nom = 'p') {
  const p = await ctx.newPage(); suivre(p, nom)
  await p.goto(DEV); await pret(p)
  await p.evaluate(() => Promise.all([window.__cle?.pret, window.__drive?.pret]))
  return p
}
/** Un clic qui mène à un autre classeur (la page change) */
async function allerPar(p, faire) {
  await Promise.all([p.waitForNavigation({ timeout: 30000 }), faire()])
  await pret(p)
  await p.evaluate(() => Promise.all([window.__cle?.pret, window.__drive?.pret]))
  await p.waitForTimeout(400)
}
const voirBibliotheque = async (p, dossier) => {
  await p.evaluate(() => { if (!window.__bibliotheque.ouvert) window.__app.ui.ouvrirBibliotheque() })
  await p.waitForFunction(() => window.__bibliotheque.ouvert)
  await p.evaluate(() => window.__bibliotheque.charger())
  await p.waitForTimeout(200)
  if (dossier !== undefined) { await p.evaluate(d => window.__bibliotheque.allerA(d), dossier); await p.waitForTimeout(300) }
}
const fermerDialogues = async p => { await p.evaluate(() => { for (const d of document.querySelectorAll('dialog[open]')) d.close() }); await p.waitForTimeout(200) }
async function trait(p, x0, y0, n = 8) {
  await p.mouse.move(x0, y0); await p.mouse.down()
  for (let i = 1; i <= n; i++) await p.mouse.move(x0 + i * 12, y0 + Math.sin(i / 2) * 16)
  await p.mouse.up(); await p.waitForTimeout(100)
}

try {
  if (seul('A')) {
  // =====================================================================
  console.log('\n— A. La fenêtre « Où ranger les classeurs de « 5eme » ? »')
  const ctx = await contexte()
  const p = await ouvrirPage(ctx, 'A')
  const d5 = await p.evaluate(() => window.__dossier('5eme'))
  const d4 = await p.evaluate(() => window.__dossier('4eme'))
  const d3 = await p.evaluate(() => window.__dossier('3eme'))
  const [idFractions, idSymetrie] = await p.evaluate(d => window.__creer([{ nom: 'Fractions', dossier: d }, { nom: 'Symetrie', dossier: d }]), d5)
  const [idThales] = await p.evaluate(d => window.__creer([{ nom: 'Thales', dossier: d }]), d4)
  await voirBibliotheque(p, d5)
  await oublier(p, '__demandes', '__choixDossier', '__ecritures')
  await p.click('.biblio-nouveau')
  await p.waitForSelector('dialog.dialogue-ranger[open]', { timeout: 10000 })
  let r = await ranger(p)
  ok(r.titre === 'Où ranger les classeurs de « 5eme » ?' && r.etabs.length === 0 && !r.autre, 'A1) Le titre ; aucun établissement encore, rien de choisi', r)
  ok(r.champ === '5eme' && r.libelle === 'Dossier du niveau :' && r.ok === 'Ranger' && r.okGris && r.plusTard === 'Plus tard' && r.choisir === 'Choisir un dossier…', 'A2) Le champ propose « 5eme » ; « Ranger » grisé tant qu\'aucun dossier n\'est choisi ; « Plus tard »', r)
  ok(/« LFB classeurs › 5eme › (Fractions|Symetrie) › \1\.memc »/.test(r.explication) && /écrit tout seul/.test(r.explication), 'A3) L\'explication, avec l\'exemple « LFB classeurs › 5eme › Fractions › Fractions.memc »', r.explication)
  await p.evaluate(() => { window.__dossierChoisi = 'LFB classeurs' })
  await p.click('dialog[open] .r-choisir-dossier')
  await p.waitForFunction(() => document.querySelector('dialog.dialogue-ranger[open] label.r-etab input:checked'), null, { timeout: 10000 })
  r = await ranger(p)
  ok(r.etabs.length === 1 && r.etabs[0].nom === 'LFB classeurs' && r.etabs[0].coche && r.libelle === 'Dossier du niveau dans « LFB classeurs » :' && r.ok === 'Ranger dans « LFB classeurs › 5eme »' && !r.okGris,
    'A4) « Choisir un dossier… » : l\'établissement « LFB classeurs » paraît, sélectionné ; le bouton dit « Ranger dans « LFB classeurs › 5eme » »', r)
  const choix = await notes(p, '__choixDossier')
  ok(choix.length === 1 && choix[0].id === 'mem-etablissements' && choix[0].actif, 'A5) Le choix du dossier s\'est ouvert dans le clic (id « mem-etablissements »)', choix)
  await p.fill('dialog[open] input[name="niveau"]', '5')
  r = await ranger(p)
  ok(r.ok === 'Ranger dans « LFB classeurs › 5 »' && /« LFB classeurs › 5 › /.test(r.explication), 'A6) On tape « 5 » : « Ranger dans « LFB classeurs › 5 » », l\'exemple suit', r)
  if (CAPTURES) await p.screenshot({ path: join(CAPTURES, 'ou-ranger.png') })
  await toasts(p)
  await p.click('dialog[open] .r-ok')
  ok(await attendreToast(p, /Les classeurs de « 5eme » se rangent dans/, 30000), 'A7) Le message du bilan arrive')
  const tA = await toasts(p)
  ok(tA.some(t => t.includes('Les classeurs de « 5eme » se rangent dans « LFB classeurs › 5 » : 2 écrits.')), '   … « Les classeurs de « 5eme » se rangent dans « LFB classeurs › 5 » : 2 écrits. »', tA)
  await p.waitForSelector('dialog.dialogue-nouveau[open]', { timeout: 10000 })
  let contenu = await lister(p, 'LFB classeurs')
  ok(contenu?.['5']?.Fractions?.['Fractions.memc'] > 0 && contenu['5'].Symetrie?.['Symetrie.memc'] > 0 && Object.keys(contenu['5']).sort().join('|') === 'Fractions|Symetrie',
    'A8) LFB classeurs/5/Fractions/Fractions.memc et LFB classeurs/5/Symetrie/Symetrie.memc, rien d\'autre', contenu)
  let fs = await fiches(p)
  const fr = fs.find(f => f.id === idFractions), sy = fs.find(f => f.id === idSymetrie)
  ok(fr?.cle?.nom === 'Fractions.memc' && JSON.stringify(fr.cle.chemin) === '["LFB classeurs","5","Fractions"]' && sy?.cle?.nom === 'Symetrie.memc' && JSON.stringify(sy.cle.chemin) === '["LFB classeurs","5","Symetrie"]',
    'A9) Chaque fiche : le fichier de sa clé, et son chemin [« LFB classeurs », « 5 », classeur]', { fr, sy })
  const etabs = await reglage(p, 'etablissements')
  const idLFB = etabs?.[0]?.id
  ok(Array.isArray(etabs) && etabs.length === 1 && etabs[0].nom === 'LFB classeurs' && /^[0-9a-f]{16}$/.test(idLFB ?? '') && etabs[0].cree > 0, 'A10) Le réglage « etablissements » : « LFB classeurs », son id', etabs)
  ok((await reglage(p, 'etablissement-poignee:' + idLFB))?.poignee === 'LFB classeurs', '   … et sa poignée (« etablissement-poignee:<id> »)')
  let em = await reglage(p, 'emplacements')
  ok(em?.length === 1 && em[0].genre === 'ordinateur' && em[0].dossier === d5 && em[0].nom === '5' && em[0].etablissement === idLFB, 'A11) L\'emplacement du niveau : cet ordinateur, « 5 », chez « LFB classeurs »', em)
  ok((await reglage(p, 'emplacement-poignee:' + em?.[0]?.id))?.poignee === '5', '   … sa poignée : le dossier « 5 »')
  let dem = await notes(p, '__demandes')
  ok(dem.length >= 1 && dem.every(x => x.actif), `A12) ${dem.length} demande(s) d'accord au navigateur, toutes dans un geste`, dem)

  // =====================================================================
  console.log('\n— B. « Nouveau classeur » dans un niveau rangé')
  let b = await p.evaluate(() => { const d = document.querySelector('dialog.dialogue-nouveau[open]'); return { caseCle: !!d.querySelector('.case-cle'), ou: d.querySelector('.ou-fichier')?.textContent.replace(/[  ]/g, ' ') ?? null, nom: d.querySelector('input[name="nom"]').value } })
  ok(!b.caseCle && b.ou === `Son fichier ira dans « LFB classeurs › 5 › ${b.nom} », écrit tout seul.`, 'B1) Pas de case : « Son fichier ira dans « LFB classeurs › 5 › Nouveau classeur », écrit tout seul. »', b)
  await p.fill('dialog[open] input[name="nom"]', 'Probabilites')
  b = await p.evaluate(() => document.querySelector('dialog.dialogue-nouveau[open] .ou-fichier')?.textContent.replace(/[  ]/g, ' '))
  ok(b === 'Son fichier ira dans « LFB classeurs › 5 › Probabilites », écrit tout seul.', 'B2) La ligne suit le nom tapé', b)
  await oublier(p, '__ecritures', '__demandes')
  await allerPar(p, () => p.click('dialog[open] [data-a="creer"]'))
  await p.waitForFunction(() => window.__surveillance?.etat?.cle?.etat === 'ok', null, { timeout: 15000 }).catch(() => {})
  const arriveeB = await p.evaluate(async () => {
    const f = await window.__registre.classeur(window.__app.classeur.id)
    return { nom: window.__app.classeur.nom, cle: window.__surveillance.etat.cle, fiche: f.cle ? { nom: f.cle.nom, chemin: f.cle.chemin ?? null } : null, ecritures: JSON.parse(sessionStorage.getItem('__ecritures') || '[]'), parti: Number(sessionStorage.getItem('__parti')), titre: document.title }
  })
  const eB = arriveeB.ecritures.find(x => x.nom === 'Probabilites.memc')
  ok(arriveeB.nom === 'Probabilites' && eB && arriveeB.parti && eB.t <= arriveeB.parti, `B3) « Créer et ouvrir » : le fichier « Probabilites.memc » est écrit AVANT de partir (${arriveeB.parti - (eB?.t ?? 0)} ms avant)`, arriveeB)
  ok(arriveeB.cle?.etat === 'ok' && arriveeB.cle.nom === 'Probabilites.memc', 'B4) À l\'arrivée, la clé est active sur ce fichier', arriveeB.cle)
  ok(JSON.stringify(arriveeB.fiche) === JSON.stringify({ nom: 'Probabilites.memc', chemin: ['LFB classeurs', '5', 'Probabilites'] }), 'B5) La fiche : le fichier et son chemin', arriveeB.fiche)
  contenu = await lister(p, 'LFB classeurs/5/Probabilites')
  ok(contenu?.['Probabilites.memc'] > 0 && Object.keys(contenu).length === 1, 'B6) LFB classeurs/5/Probabilites/Probabilites.memc', contenu)
  const tB = await toasts(p)
  ok(tB.some(t => /Classeur « Probabilites » créé\./.test(t)) && tB.some(t => /s'enregistre automatiquement dans « Probabilites\.memc »/.test(t)), 'B7) Le message d\'arrivée : créé, « Il s\'enregistre automatiquement dans « Probabilites.memc ». »', tB)
  dem = await notes(p, '__demandes')
  ok(dem.every(x => x.actif), `B8) ${dem.length} demande(s) d'accord, toutes dans un geste`, dem)

  // =====================================================================
  console.log('\n— C. Un deuxième niveau, un deuxième établissement ; « Mes emplacements »')
  await voirBibliotheque(p, d4)
  await p.click('.biblio-nouveau')
  await p.waitForSelector('dialog.dialogue-ranger[open]', { timeout: 10000 })
  r = await ranger(p)
  ok(r.titre === 'Où ranger les classeurs de « 4eme » ?' && r.etabs.map(e => `${e.nom}:${e.coche}`).join('|') === 'LFB classeurs:true' && r.champ === '4eme' && r.ok === 'Ranger dans « LFB classeurs › 4eme »',
    'C1) Pour « 4eme » : « LFB classeurs » proposé, sélectionné ; le champ « 4eme »', r)
  await p.evaluate(() => { window.__dossierChoisi = 'MEM classeurs' })
  await p.click('dialog[open] .r-choisir-dossier')
  await p.waitForFunction(() => document.querySelectorAll('dialog.dialogue-ranger[open] label.r-etab').length === 2, null, { timeout: 10000 })
  r = await ranger(p)
  ok(r.etabs.map(e => `${e.nom}:${e.coche}`).join('|') === 'LFB classeurs:false|MEM classeurs:true' && r.ok === 'Ranger dans « MEM classeurs › 4eme »', 'C2) « MEM classeurs » ajouté, sélectionné, après « LFB classeurs »', r)
  await p.fill('dialog[open] input[name="niveau"]', '4')
  await toasts(p)
  await p.click('dialog[open] .r-ok')
  ok(await attendreToast(p, /Les classeurs de « 4eme » se rangent dans « MEM classeurs › 4 » : 1 écrit\./, 30000), 'C3) « Les classeurs de « 4eme » se rangent dans « MEM classeurs › 4 » : 1 écrit. »', await toasts(p))
  await p.waitForSelector('dialog.dialogue-nouveau[open]', { timeout: 10000 })
  await p.keyboard.press('Escape'); await p.waitForTimeout(300)
  contenu = await lister(p, 'MEM classeurs')
  fs = await fiches(p)
  ok(contenu?.['4']?.Thales?.['Thales.memc'] > 0 && JSON.stringify(fs.find(f => f.id === idThales)?.cle?.chemin) === '["MEM classeurs","4","Thales"]', 'C4) MEM classeurs/4/Thales/Thales.memc, le chemin dans la fiche', { contenu, f: fs.find(f => f.id === idThales) })
  const idMEM = (await reglage(p, 'etablissements')).find(e => e.nom === 'MEM classeurs')?.id
  await voirBibliotheque(p, null)
  let e = await emplacements(p)
  ok(e?.titre === 'Mes emplacements' && e.etabs?.entete === 'Établissements :' && e.etabs.noms.join(' · ') === 'LFB classeurs · MEM classeurs' && e.etabs.retirer === 2 && e.etabs.ajouter === 'Ajouter un dossier…',
    'C5) « Mes emplacements » : « Établissements : LFB classeurs · MEM classeurs », « Retirer » pour chacun, « Ajouter un dossier… »', e)
  ok(e?.lignes.map(l => `${l.texte} [${l.boutons.join(', ')}]`).join(' ; ') === '4eme → MEM classeurs › 4 [Mettre à jour, Changer…] ; 5eme → LFB classeurs › 5 [Mettre à jour, Changer…]',
    'C6) « 4eme → MEM classeurs › 4 », « 5eme → LFB classeurs › 5 », chacun avec « Mettre à jour » et « Changer… »', e?.lignes)

  // =====================================================================
  console.log('\n— D. « Plus tard »')
  await voirBibliotheque(p, d3)
  await p.click('.biblio-nouveau')
  await p.waitForSelector('dialog.dialogue-ranger[open]', { timeout: 10000 })
  r = await ranger(p)
  ok(r.titre === 'Où ranger les classeurs de « 3eme » ?' && r.etabs.map(e => `${e.nom}:${e.coche}`).join('|') === 'LFB classeurs:true|MEM classeurs:false', 'D1) Pour « 3eme » : les deux établissements, le premier sélectionné', r)
  await p.click('dialog[open] .r-plus-tard')
  await p.waitForSelector('dialog.dialogue-nouveau[open]', { timeout: 10000 })
  let dl = await p.evaluate(() => ({ ranger: !!document.querySelector('dialog.dialogue-ranger'), caseCle: document.querySelector('dialog.dialogue-nouveau[open] .case-cle span')?.textContent ?? null, ou: !!document.querySelector('dialog.dialogue-nouveau[open] .ou-fichier') }))
  const tard = await reglage(p, 'ranger-plus-tard')
  ok(!dl.ranger && /^Enregistrer automatiquement dans un fichier/.test(dl.caseCle ?? '') && !dl.ou, 'D2) « Plus tard » : la fenêtre « Nouveau classeur » vient, avec sa case « Enregistrer automatiquement dans un fichier » (le niveau n\'est pas rangé)', dl)
  ok(JSON.stringify(tard) === JSON.stringify([d3]), '   … noté dans « ranger-plus-tard »', tard)
  ok(!(await lister(p, 'LFB classeurs'))?.['3eme'] && (await reglage(p, 'emplacements')).length === 2, '   … rien d\'écrit, pas d\'emplacement', await reglage(p, 'emplacements'))
  await p.keyboard.press('Escape'); await p.waitForTimeout(300)
  await p.click('.biblio-nouveau'); await p.waitForTimeout(600)
  dl = await dialogue(p)
  ok(dl && /dialogue-nouveau/.test(dl.classe) && !/dialogue-ranger/.test(dl.classe), 'D3) Le « Nouveau classeur » suivant n\'ouvre plus la fenêtre « Où ranger… »', dl)
  await p.keyboard.press('Escape'); await p.waitForTimeout(300)
  e = await emplacements(p)
  const ligne3 = e?.lignes.find(l => l.dossier === d3)
  ok(ligne3 && ligne3.genre === 'aucun' && ligne3.texte === '3eme → pas encore rangé dans un dossier' && ligne3.boutons.join() === 'Ranger…', 'D4) Dans « 3eme », « Mes emplacements » : « 3eme → pas encore rangé dans un dossier » [Ranger…]', e)
  await p.click('.emplacements li.pas-range .e-ranger')
  await p.waitForSelector('dialog.dialogue-ranger[open]', { timeout: 10000 })
  r = await ranger(p)
  ok(r.titre === 'Où ranger les classeurs de « 3eme » ?', 'D5) « Ranger… » rouvre la fenêtre', r)
  await p.click('dialog[open] .r-plus-tard'); await p.waitForTimeout(300)
  ok(!(await dialogue(p)), '   … « Plus tard » la ferme, sans autre fenêtre')

  // =====================================================================
  console.log('\n— F. Un .memc ajouté (Ouvrir → Ajouter) dans un niveau rangé')
  await p.evaluate(() => window.__memcNeuf('', 'Vecteurs.memc', 'Vecteurs'))
  await voirBibliotheque(p, d5)
  await p.click('.biblio-bouton[data-action="ouvrir-fichier"]')
  await p.waitForSelector('dialog.dialogue-ouvrir-ailleurs[open]')
  await p.evaluate(() => { window.__aOuvrir = ['Vecteurs.memc'] })
  await p.click('dialog[open] .a-fichiers')
  await p.waitForSelector('dialog[open]:not(.dialogue-ouvrir-ailleurs)', { timeout: 20000 })
  dl = await dialogue(p)
  const caseF = await p.evaluate(() => { const c = document.querySelector('dialog[open] .case-cle input'); return c ? c.checked : null })
  ok(/Ouvrir ce classeur/.test(dl?.titre ?? '') && caseF === true, 'F1) « Ouvrir ce classeur ? », la case « Enregistrer automatiquement les changements dans ce fichier » cochée : on la décoche', { dl: dl?.titre, caseF })
  await p.uncheck('dialog[open] .case-cle input')
  await oublier(p, '__ecritures', '__demandes')
  await allerPar(p, () => p.click('dialog[open] [data-a="ajouter"]'))
  await p.waitForFunction(() => window.__surveillance?.etat?.cle?.etat === 'ok', null, { timeout: 15000 }).catch(() => {})
  let arrivee = await p.evaluate(async () => { const f = await window.__registre.classeur(window.__app.classeur.id); return { nom: f.nom, dossier: f.dossier, cle: f.cle ? { nom: f.cle.nom, chemin: f.cle.chemin ?? null } : null, etat: window.__surveillance.etat.cle.etat } })
  ok(arrivee.nom === 'Vecteurs' && arrivee.dossier === d5 && JSON.stringify(arrivee.cle) === JSON.stringify({ nom: 'Vecteurs.memc', chemin: ['LFB classeurs', '5', 'Vecteurs'] }) && arrivee.etat === 'ok',
    'F2) Ajouté dans « 5eme » : son fichier « LFB classeurs › 5 › Vecteurs › Vecteurs.memc », la clé active', arrivee)
  contenu = await lister(p, '')
  ok(contenu?.['Vecteurs.memc'] > 0 && contenu['LFB classeurs']?.['5']?.Vecteurs?.['Vecteurs.memc'] > 0, 'F3) Le fichier ouvert reste où il était ; le sien est dans le dossier du chapitre', { racine: contenu?.['Vecteurs.memc'], chapitre: contenu?.['LFB classeurs']?.['5']?.Vecteurs })
  let tF = await toasts(p)
  ok(tF.some(t => /Classeur ajouté à la bibliothèque : « Vecteurs »/.test(t)) && tF.some(t => /s'enregistre automatiquement dans « Vecteurs\.memc »/.test(t)), 'F4) Le message d\'arrivée le dit', tF)
  // Le même fichier, déjà à sa place : adopté
  await p.evaluate(() => window.__memcNeuf('LFB classeurs/5/Probas', 'Probas.memc', 'Probas'))
  await voirBibliotheque(p, d5)
  await p.click('.biblio-bouton[data-action="ouvrir-fichier"]')
  await p.waitForSelector('dialog.dialogue-ouvrir-ailleurs[open]')
  await p.evaluate(() => { window.__aOuvrir = ['LFB classeurs/5/Probas/Probas.memc'] })
  await p.click('dialog[open] .a-fichiers')
  await p.waitForSelector('dialog[open]:not(.dialogue-ouvrir-ailleurs)', { timeout: 20000 })
  await p.uncheck('dialog[open] .case-cle input')
  await oublier(p, '__ecritures')
  await allerPar(p, () => p.click('dialog[open] [data-a="ajouter"]'))
  await p.waitForFunction(() => window.__surveillance?.etat?.cle?.etat === 'ok', null, { timeout: 15000 }).catch(() => {})
  arrivee = await p.evaluate(async () => { const f = await window.__registre.classeur(window.__app.classeur.id); return { id: f.id, nom: f.nom, cle: f.cle ? { nom: f.cle.nom, chemin: f.cle.chemin ?? null } : null, etat: window.__surveillance.etat.cle.etat, ecritures: JSON.parse(sessionStorage.getItem('__ecritures') || '[]').map(x => x.nom) } })
  contenu = await lister(p, 'LFB classeurs/5/Probas')
  ok(arrivee.nom === 'Probas' && JSON.stringify(arrivee.cle) === JSON.stringify({ nom: 'Probas.memc', chemin: ['LFB classeurs', '5', 'Probas'] }) && Object.keys(contenu ?? {}).join() === 'Probas.memc' && arrivee.etat === 'ok',
    'F5) Un .memc ouvert depuis son propre dossier de chapitre : adopté tel quel (pas de « Probas (2).memc »), la clé active', { arrivee, contenu })
  tF = await toasts(p)
  ok(tF.some(t => t.includes('Son fichier « Probas.memc » était déjà dans « LFB classeurs › 5 › Probas » : il le garde.')), 'F6) « Son fichier « Probas.memc » était déjà dans « LFB classeurs › 5 › Probas » : il le garde. »', tF)
  dem = await notes(p, '__demandes')
  ok(dem.every(x => x.actif), `F7) ${dem.length} demande(s) d'accord, toutes dans un geste`, dem)

  // =====================================================================
  console.log('\n— G. Remis de la corbeille')
  const [idAngles] = await p.evaluate(d => window.__creer([{ nom: 'Angles', dossier: d }]), d5)
  await voirBibliotheque(p, d5)
  await p.evaluate(id => window.__bibliotheque.supprimer(id), idAngles)
  await p.waitForTimeout(300)
  await p.click('[data-action="corbeille"]')
  await p.waitForSelector(`.carte-corbeille-biblio[data-cle="${idAngles}"] [data-action="remettre"]`, { timeout: 10000 })
  await toasts(p)
  await p.click(`.carte-corbeille-biblio[data-cle="${idAngles}"] [data-action="remettre"]`)
  ok(await attendreToast(p, /« Angles » remis dans « 5eme »/, 20000), 'G1) « Angles » remis dans « 5eme »')
  const tG = await toasts(p)
  ok(tG.some(t => t.includes('« Angles » remis dans « 5eme » Son fichier est écrit dans « LFB classeurs › 5 › Angles ».')), '   … « Son fichier est écrit dans « LFB classeurs › 5 › Angles ». »', tG)
  fs = await fiches(p)
  contenu = await lister(p, 'LFB classeurs/5/Angles')
  ok(JSON.stringify(fs.find(f => f.id === idAngles)?.cle) === JSON.stringify({ nom: 'Angles.memc', chemin: ['LFB classeurs', '5', 'Angles'] }) && contenu?.['Angles.memc'] > 0 && !fs.find(f => f.id === idAngles).corbeille,
    'G2) Sa fiche a le fichier et son chemin ; LFB classeurs/5/Angles/Angles.memc', { f: fs.find(f => f.id === idAngles), contenu })
  await p.keyboard.press('Escape'); await p.waitForTimeout(200)

  // =====================================================================
  console.log('\n— H. « Un autre dossier, pour ce niveau seul… »')
  await voirBibliotheque(p, d3)
  await p.click('.emplacements li.pas-range .e-ranger')
  await p.waitForSelector('dialog.dialogue-ranger[open]', { timeout: 10000 })
  await p.check('dialog[open] input[name="r-etab"][value="autre"]')
  r = await ranger(p)
  ok(r.autre && r.champCache && r.ok === 'Choisir le dossier et ranger…' && !r.okGris, 'H1) « Un autre dossier… » : plus de champ, « Choisir le dossier et ranger… »', r)
  await p.evaluate(() => { window.__dossierChoisi = 'Cle 3eme' })
  await toasts(p)
  await p.click('dialog[open] .r-ok')
  ok(await attendreToast(p, /Les classeurs de « 3eme » iront dans « Cle 3eme » \(il n'y en a pas encore\)\./, 20000), 'H2) « Les classeurs de « 3eme » iront dans « Cle 3eme » (il n\'y en a pas encore). »', await toasts(p))
  em = await reglage(p, 'emplacements')
  const e3 = em.find(x => x.dossier === d3)
  ok(e3 && e3.genre === 'ordinateur' && e3.nom === 'Cle 3eme' && !('etablissement' in e3), 'H3) L\'emplacement : « Cle 3eme », sans établissement', e3)
  await p.waitForFunction(() => [...document.querySelectorAll('.emplacements li.emplacement')].some(li => /Cet ordinateur › Cle 3eme/.test(li.textContent)), null, { timeout: 10000 }).catch(() => {})
  e = await emplacements(p)
  ok(e?.lignes.map(l => `${l.texte} [${l.boutons.join(', ')}]`).join(' ; ') === '3eme → Cet ordinateur › Cle 3eme [Mettre à jour, Retirer]', 'H4) « 3eme → Cet ordinateur › Cle 3eme » [Mettre à jour, Retirer] (pas de « Changer… »)', e?.lignes)
  const [idThales3] = await p.evaluate(d => window.__creer([{ nom: 'Thales3', dossier: d }]), d3)
  await voirBibliotheque(p, d3)
  await toasts(p)
  await p.click('.emplacements li.emplacement .e-maj')
  ok(await attendreToast(p, /« 3eme » est relié au dossier « Cle 3eme »/, 20000), 'H5) « Mettre à jour » : le message du lot 7', await toasts(p))
  fs = await fiches(p)
  contenu = await lister(p, 'Cle 3eme')
  ok(JSON.stringify(fs.find(f => f.id === idThales3)?.cle) === JSON.stringify({ nom: 'Thales3.memc', chemin: ['Cle 3eme', 'Thales3'] }) && contenu?.Thales3?.['Thales3.memc'] > 0, 'H6) Un classeur de « 3eme » : chemin = [« Cle 3eme », « Thales3 »], le fichier dans Cle 3eme/Thales3/', { f: fs.find(f => f.id === idThales3), contenu })

  // =====================================================================
  console.log('\n— I. « Changer… » : « 5eme » de « LFB classeurs » à « MEM classeurs »')
  await voirBibliotheque(p, null)
  const dans5 = (await fiches(p)).filter(f => f.dossier === d5 && !f.corbeille)
  await p.click('.emplacements li.emplacement:has(strong:text-is("5eme")) .e-changer')
  await p.waitForSelector('dialog.dialogue-ranger[open]', { timeout: 10000 })
  r = await ranger(p)
  ok(r.titre === 'Où ranger les classeurs de « 5eme » ?' && r.etabs.map(e => `${e.nom}:${e.coche}`).join('|') === 'LFB classeurs:true|MEM classeurs:false' && r.champ === '5', 'I1) La fenêtre : « LFB classeurs » (l\'actuel) sélectionné, le champ « 5 » (le nom donné)', r)
  await p.check(`dialog[open] input[name="r-etab"][value="${idMEM}"]`)
  r = await ranger(p)
  ok(r.ok === 'Ranger dans « MEM classeurs › 5 »', 'I2) « MEM classeurs » choisi : « Ranger dans « MEM classeurs › 5 » »', r)
  await oublier(p, '__demandes')
  await toasts(p)
  await p.click('dialog[open] .r-ok')
  ok(await attendreToast(p, /Les classeurs de « 5eme » se rangent dans « MEM classeurs › 5 »/, 60000), 'I3) Le message du bilan arrive')
  const tI = await toasts(p)
  ok(tI.some(t => t.includes(`Les classeurs de « 5eme » se rangent dans « MEM classeurs › 5 » : ${dans5.length} écrits. Les fichiers d'avant restent dans « LFB classeurs › 5 ».`)),
    `   … « … se rangent dans « MEM classeurs › 5 » : ${dans5.length} écrits. Les fichiers d'avant restent dans « LFB classeurs › 5 ». »`, tI)
  contenu = await lister(p, '')
  const nomsMEM = Object.keys(contenu?.['MEM classeurs']?.['5'] ?? {}).sort(), nomsLFB = Object.keys(contenu?.['LFB classeurs']?.['5'] ?? {}).sort()
  const attendus = dans5.map(f => f.nom).sort()
  ok(JSON.stringify(nomsMEM) === JSON.stringify(attendus) && attendus.every(n => contenu['MEM classeurs']['5'][n]?.[n + '.memc'] > 0), `I4) MEM classeurs/5 : un dossier par classeur avec son .memc (${attendus.join(', ')})`, { nomsMEM, attendus })
  ok(JSON.stringify(nomsLFB) === JSON.stringify(attendus) && attendus.every(n => contenu['LFB classeurs']['5'][n]?.[n + '.memc'] > 0), 'I5) Les fichiers d\'avant sont toujours dans LFB classeurs/5', nomsLFB)
  fs = await fiches(p)
  ok(fs.filter(f => f.dossier === d5 && !f.corbeille).every(f => f.cle?.chemin?.[0] === 'MEM classeurs' && f.cle.chemin[1] === '5' && f.cle.nom === f.nom + '.memc'), 'I6) Chaque fiche de « 5eme » a maintenant son fichier de « MEM classeurs › 5 »', fs.filter(f => f.dossier === d5).map(f => [f.nom, f.cle]))
  em = await reglage(p, 'emplacements')
  ok(em.filter(x => x.dossier === d5).length === 1 && em.find(x => x.dossier === d5).etablissement === idMEM && em.find(x => x.dossier === d5).nom === '5', 'I7) Un seul emplacement pour « 5eme », chez « MEM classeurs »', em)
  await p.waitForFunction(() => [...document.querySelectorAll('.emplacements li.emplacement')].some(li => /5eme → MEM classeurs › 5/.test(li.textContent.replace(/[  ]/g, ' '))), null, { timeout: 10000 }).catch(() => {})
  e = await emplacements(p)
  ok(e?.lignes.some(l => l.texte === '5eme → MEM classeurs › 5'), 'I8) « Mes emplacements » : « 5eme → MEM classeurs › 5 »', e?.lignes)
  dem = await notes(p, '__demandes')
  ok(dem.length >= 1 && dem.every(x => x.actif), `I9) ${dem.length} demande(s) d'accord, toutes dans un geste`, dem)

  // =====================================================================
  console.log('\n— J. Publier → « Enregistrer le fichier » : le .mem dans le dossier du chapitre')
  // Le classeur de l'onglet est « Probas » (5eme, rangé chez « MEM classeurs › 5 » depuis I)
  await p.keyboard.press('Escape')
  await p.evaluate(() => { if (window.__bibliotheque.ouvert) window.__bibliotheque.fermer?.() })
  await p.waitForTimeout(300)
  await trait(p, 500, 300)
  await p.waitForTimeout(500)
  await p.evaluate(() => window.__app.ui.publication.ouvrir({ complet: true }))
  await p.waitForSelector('.dialogue-publier[open]', { timeout: 10000 })
  const pub = await p.evaluate(() => ({ chemin: document.querySelector('.p-chemin')?.textContent, classeur: window.__app.classeur.nom, fichierGris: document.querySelector('.p-fichier')?.disabled }))
  ok(pub.classeur === 'Probas' && pub.chemin === 'MEM classeurs › 5 › Probas' && pub.fichierGris === false, 'J1) Publier propose le dossier du chapitre « MEM classeurs › 5 › Probas »', pub)
  await p.fill('.dialogue-publier[open] .p-titre', 'Seance test')
  await oublier(p, '__ecritures', '__demandes')
  await p.click('.dialogue-publier[open] .p-fichier')
  await p.waitForFunction(() => /enregistré|téléchargé|Fichier/.test(document.querySelector('.dialogue-publier[open] .p-etat')?.textContent ?? ''), null, { timeout: 20000 }).catch(() => {})
  const etatJ = await p.evaluate(() => (document.querySelector('.dialogue-publier[open] .p-etat')?.textContent ?? '').replace(/[  ]/g, ' '))
  ok(/^Fichier séance enregistré dans « MEM classeurs › 5 › Probas » : Seance test\.mem \([\d,.]+ [kK]o\)\.$/.test(etatJ), 'J2) « Fichier séance enregistré dans « MEM classeurs › 5 › Probas » : Seance test.mem (… Ko). »', etatJ)
  contenu = await lister(p, 'MEM classeurs/5/Probas')
  ok(contenu?.['Seance test.mem'] > 0 && contenu['Probas.memc'] > 0, 'J3) Le .mem sans code, à côté du .memc, dans le dossier du chapitre', contenu)
  dem = await notes(p, '__demandes')
  ok(dem.every(x => x.actif), `J4) ${dem.length} demande(s) d'accord, toutes dans un geste`, dem)
  await p.keyboard.press('Escape'); await p.waitForTimeout(200)
  await ctx.close()
  }

  if (seul('E')) {
  // =====================================================================
  console.log('\n— E. « Séances isolées » dans un niveau rangé (le lien de « Bonjour ! »)')
  const ctxE = await contexte()
  const q = await ctxE.newPage(); suivre(q, 'E')
  await q.clock.install({ time: T0 })
  const pretE = async () => { await q.waitForFunction(() => window.__app?.page && window.__registre && window.__surveillance); await q.clock.runFor(1500); await q.waitForTimeout(200) }
  await q.goto(DEV); await pretE()
  const d5E = await q.evaluate(async () => {
    const r = window.__registre, app = window.__app
    const dem = await import('/src/classeurs/demarrage.ts')
    const t = Date.now(), d5 = dem.idClasseur()
    await r.ajouterDossier({ id: d5, nom: '5eme', parent: null, couleur: '#3b6fb6', etiquette: '5eme', cree: t })
    await r.modifierClasseur(app.classeur.id, f => { f.dossier = d5; f.nom = 'Fractions' })
    // Le niveau déjà rangé chez « LFB classeurs › 5 » : les réglages, avec de vraies poignées de l'OPFS (relues depuis IndexedDB : lancerPersistant)
    await r.ecrireReglage('etablissements', [{ id: '0123456789abcdef', nom: 'LFB classeurs', cree: t }])
    await r.ecrireReglage('etablissement-poignee:0123456789abcdef', await window.__racineOpfs('LFB classeurs'))
    await r.ecrireReglage('emplacements', [{ id: 'fedcba9876543210', genre: 'ordinateur', dossier: d5, nom: '5', cree: t, etablissement: '0123456789abcdef' }])
    await r.ecrireReglage('emplacement-poignee:fedcba9876543210', await window.__racineOpfs('LFB classeurs/5'))
    return d5
  })
  await q.mouse.move(500, 300); await q.mouse.down(); await q.mouse.move(590, 336, { steps: 6 }); await q.mouse.up(); await q.clock.runFor(700)
  await q.clock.runFor(40_000)
  await q.clock.setSystemTime(T0 + 30 * H)
  await q.reload(); await pretE()
  const accueil = await q.evaluate(() => ({ dlg: !!document.querySelector('dialog.dialogue-accueil[open]'), lien: document.querySelector('.accueil-seance-isolee')?.textContent ?? null }))
  ok(accueil.dlg && accueil.lien === 'Séance isolée', 'E1) Le lendemain, « Bonjour ! » depuis Fractions a le lien « Séance isolée »', accueil)
  await oublier(q, '__demandes', '__ecritures')
  await q.evaluate(() => { window.__toasts.length = 0 })
  await q.click('.accueil-seance-isolee')
  for (let k = 0; k < 80 && (await q.evaluate(() => window.__app?.classeur?.nom).catch(() => null)) !== 'Séances isolées'; k++) {
    await q.clock.runFor(500).catch(() => {}); await q.waitForTimeout(100)
  }
  await pretE()
  await q.clock.runFor(3000); await q.waitForTimeout(300)
  const arriveeE = await q.evaluate(async () => {
    const f = await window.__registre.classeur(window.__app.classeur.id)
    return { nom: f.nom, dossier: f.dossier, cle: f.cle ? { nom: f.cle.nom, chemin: f.cle.chemin ?? null } : null, etat: window.__surveillance.etat.cle.etat, toasts: window.__toasts.slice(), contenu: await window.__lister('LFB classeurs/5') }
  })
  ok(arriveeE.nom === 'Séances isolées' && arriveeE.dossier === d5E, 'E2) Le classeur « Séances isolées » est créé dans « 5eme » et s\'ouvre', arriveeE)
  // (le fichier s'appelle « Seances isolees.memc » : l'OPFS simulé retire les accents, voir l'en-tête ; la fiche note le chemin voulu)
  ok(JSON.stringify(arriveeE.cle) === JSON.stringify({ nom: 'Seances isolees.memc', chemin: ['LFB classeurs', '5', 'Séances isolées'] }) && arriveeE.contenu?.['Seances isolees']?.['Seances isolees.memc'] > 0,
    'E3) Il a reçu son fichier : LFB classeurs/5/Séances isolées/Séances isolées.memc (sans accents dans l\'OPFS), le chemin dans la fiche', { cle: arriveeE.cle, contenu: arriveeE.contenu })
  ok(arriveeE.etat === 'ok', 'E4) La clé est active à l\'arrivée', arriveeE.etat)
  ok(arriveeE.toasts.some(t => /Classeur « Séances isolées » créé en 5eme : vos séances hors chapitre iront là\./.test(t)) && arriveeE.toasts.some(t => /s'enregistre automatiquement dans « Seances isolees\.memc »/.test(t)),
    'E5) Le message d\'arrivée : créé en 5eme, « Il s\'enregistre automatiquement dans « Séances isolées.memc ». »', arriveeE.toasts)
  const demE = await notes(q, '__demandes')
  ok(demE.every(x => x.actif), `E6) ${demE.length} demande(s) d'accord, toutes dans un geste`, demE)
  await ctxE.close()
  }

  // =====================================================================
  console.log('\n— K. La version hors ligne (file://)')
  const DIST = join(RACINE_DEPOT, 'dist/index.html')
  if (!seul('K')) { /* pas demandée */ }
  else if (!existsSync(DIST)) ok(false, 'K) dist/index.html manque : npm run build')
  else {
    const ctxK = await contexte()
    await ctxK.addInitScript(FAUX_FS)
    await ctxK.route(/^https?:/, r => r.abort())
    const h = await ctxK.newPage(); suivre(h, 'K')
    await h.goto(pathToFileURL(DIST).href)
    await h.waitForSelector('button[title^="Importer une image ou un PDF"]', { state: 'attached', timeout: 30000 })
    await h.waitForTimeout(800)
    await fermerDialogues(h)
    await h.evaluate(() => document.querySelector('.bouton-classeur')?.click())
    await h.waitForSelector('.biblio-actions [data-action="nouveau-dossier"]', { timeout: 10000 })
    await h.click('.biblio-actions [data-action="nouveau-dossier"]')
    await h.waitForSelector('dialog.dialogue-dossier[open]')
    await h.fill('dialog[open] input[name="nom"]', 'Seconde')
    await h.click('dialog[open] [data-a="creer"]')
    await h.waitForSelector('.grille-classeurs.tous li[data-cle^="d:"] .carte-dossier', { timeout: 10000 })
    await h.click('.grille-classeurs.tous li[data-cle^="d:"]:has-text("Seconde") .dossier-icone')
    await h.waitForTimeout(400)
    await h.click('.biblio-nouveau')
    await h.waitForSelector('dialog.dialogue-ranger[open]', { timeout: 10000 })
    let r = await h.evaluate(RANGER)
    ok(r.titre === 'Où ranger les classeurs de « Seconde » ?' && r.etabs.length === 0 && r.champ === 'Seconde', 'K1) Version hors ligne : la fenêtre « Où ranger les classeurs de « Seconde » ? »', r)
    await h.evaluate(() => { window.__dossierChoisi = 'LyFEL classeurs' })
    await h.click('dialog[open] .r-choisir-dossier')
    await h.waitForFunction(() => { const d = document.querySelector('dialog.dialogue-ranger[open]'); return d && (d.querySelector('label.r-etab input:checked') || !d.querySelector('.erreur').hidden) }, null, { timeout: 10000 }).catch(() => {})
    await h.fill('dialog[open] input[name="niveau"]', '2')
    r = await h.evaluate(RANGER)
    ok(r.etabs.map(e => `${e.nom}:${e.coche}`).join('|') === 'LyFEL classeurs:true' && r.ok === 'Ranger dans « LyFEL classeurs › 2 »', 'K2) « LyFEL classeurs » choisi, « Ranger dans « LyFEL classeurs › 2 » »', r)
    await h.evaluate(() => { window.__toasts.length = 0 })
    await h.click('dialog[open] .r-ok')
    ok(await attendreToast(h, /Les classeurs de « Seconde » iront dans « LyFEL classeurs › 2 » \(il n'y en a pas encore\)\./, 20000), 'K3) « Les classeurs de « Seconde » iront dans « LyFEL classeurs › 2 » (il n\'y en a pas encore). »', await h.evaluate(() => window.__toasts.slice()))
    await h.waitForSelector('dialog.dialogue-nouveau[open]', { timeout: 10000 })
    const ouK = await h.evaluate(() => ({ caseCle: !!document.querySelector('dialog.dialogue-nouveau[open] .case-cle'), ou: document.querySelector('dialog.dialogue-nouveau[open] .ou-fichier')?.textContent.replace(/[  ]/g, ' ') ?? null }))
    ok(!ouK.caseCle && ouK.ou === 'Son fichier ira dans « LyFEL classeurs › 2 › Nouveau classeur », écrit tout seul.', 'K4) « Nouveau classeur » : « Son fichier ira dans « LyFEL classeurs › 2 › Nouveau classeur », écrit tout seul. »', ouK)
    await h.fill('dialog[open] input[name="nom"]', 'Suites')
    await h.evaluate(() => { sessionStorage.removeItem('__ecritures') })
    await Promise.all([h.waitForNavigation({ timeout: 30000 }), h.click('dialog[open] [data-a="creer"]')])
    await h.waitForSelector('button[title^="Importer une image ou un PDF"]', { state: 'attached', timeout: 30000 })
    await h.waitForFunction(() => /^Suites — /.test(document.title), null, { timeout: 15000 }).catch(() => {})
    await h.waitForTimeout(1500)
    const arriveeK = await h.evaluate(() => {
      const arbre = window.__fauxArbre(), f = arbre['LyFEL classeurs/2/Suites/Suites.memc']
      return { titre: document.title, chemins: Object.keys(arbre).sort(), taille: f ? atob(f.b64).length : 0, ecritures: JSON.parse(sessionStorage.getItem('__ecritures') || '[]'), parti: Number(sessionStorage.getItem('__parti')), toasts: window.__toasts.slice(), etat: document.querySelector('.etat-classeur')?.textContent.replace(/[  ]/g, ' ') ?? null }
    })
    const eK = arriveeK.ecritures.find(x => x.nom === 'Suites.memc')
    ok(/^Suites — MEM teachingtool$/.test(arriveeK.titre) && arriveeK.chemins.join('|') === 'LyFEL classeurs|LyFEL classeurs/2|LyFEL classeurs/2/Suites|LyFEL classeurs/2/Suites/Suites.memc' && arriveeK.taille > 100 && eK && arriveeK.parti && eK.t <= arriveeK.parti,
      `K5) « Suites » créé et ouvert ; son fichier LyFEL classeurs/2/Suites/Suites.memc (${arriveeK.taille} octets) écrit avant de partir`, arriveeK)
    ok(arriveeK.toasts.some(t => /s'enregistre automatiquement dans « Suites\.memc »/.test(t)), 'K6) Le message d\'arrivée : « Il s\'enregistre automatiquement dans « Suites.memc ». »', arriveeK.toasts)
    await ctxK.close()
  }
} catch (e) {
  echecs++
  console.log('✗ ÉCHEC (exception)', e?.stack ?? e)
} finally {
  await navigateur.close()
}
ok(erreurs.length === 0, 'Aucune erreur dans les pages', erreurs)
console.log(`\n${echecs ? `✗ ${echecs} échec(s)` : '✓ Tout est passé'}`)
process.exit(echecs ? 1 : 0)
