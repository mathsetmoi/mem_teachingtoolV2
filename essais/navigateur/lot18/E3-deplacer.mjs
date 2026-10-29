// ESSAI DU LOT 18 : « Déplacer le classeur… », le fichier suit. Quand un
// classeur change de place dans la bibliothèque (le menu ⋯ du classeur, une
// carte, un glisser, « Annuler »), son fichier .memc change de place avec lui :
// écrit en entier au nouvel endroit, l'ancien examiné puis retiré, les .mem du
// chapitre avec lui, l'ancien dossier retiré s'il est vide ; jamais une perte.
// Le serveur de développement (port 5173, ou DEV=…) et la version hors ligne
// (dist/index.html en file:// : `npm run build` d'abord). Les dossiers de
// l'ordinateur sont des dossiers de l'OPFS (showDirectoryPicker,
// showSaveFilePicker simulés, comme lot18/E1-ranger.mjs) ; queryPermission et
// requestPermission rendent « granted » et chaque demande est notée avec
// navigator.userActivation.isActive : aucune hors d'un geste. Sans accents
// dans les noms que l'essai choisit (voir l'en-tête de E1).
// Le déplaceur (deplacer-fichier.ts) est celui que main.ts branche à la
// bibliothèque (`window.__deplaceur`, en développement) ; s'il n'y est pas
// encore, l'essai le construit depuis la page de la même façon.
// `node lot18/E3-deplacer.mjs A` : la suite A à I seule ; `J` : la version hors
// ligne seule.
// A. Le classeur de l'onglet, « Fractions » dans « 5eme » (LFB classeurs › 5) :
//    la fenêtre (le titre, la ligne « Son fichier ira dans … » qui suit la
//    destination, « Un autre dossier de l'ordinateur… »), le déplacement vers
//    « 4eme » (MEM classeurs › 4) : le nouveau fichier écrit et lisible,
//    fiche.cle.chemin, l'ancien retiré, l'ancien dossier du chapitre retiré,
//    l'état à l'écran, la clé de l'onglet écrit ensuite dans le NOUVEAU
//    fichier (un trait → 20 s), le message ; aucune permission hors d'un geste.
// B. Les .mem du chapitre suivent ; « Annuler » ramène le classeur et le fichier.
// C. Vers un niveau pas rangé : le fichier reste, la ligne et le message le
//    disent ; de retour à sa place : « Son fichier est déjà dans … ».
// D. Un fichier choisi à la main : il reste, « Ne plus l'enregistrer dans un
//    fichier » présent, et il arrête l'enregistrement.
// E. L'ancien fichier modifié ailleurs : le nouveau est écrit, l'ancien n'est
//    PAS retiré, le message le dit.
// F. Un fichier plus riche (ce classeur a perdu une partie de son histoire) :
//    rien ne bouge, le message.
// G. Depuis une carte (« Déplacer vers… ») et par glisser-déposer : le fichier
//    suit ; un classeur fermé dont l'onglet est ouvert ailleurs : le fichier
//    n'est pas touché, le message.
// H. « Un autre dossier de l'ordinateur… » : le fichier directement dans le
//    dossier choisi, chemin = [dossier], le classeur ne bouge pas ; Publier
//    propose ce dossier ; puis le retour dans un niveau rangé, les .mem avec.
// I. Un classeur sans fichier déplacé vers un niveau rangé reçoit son fichier.
// J. La version hors ligne (file://), avec un faux système de fichiers.
// Une ligne « ✓ » ou « ✗ ÉCHEC » par vérification ; code de sortie 1 s'il y
// a un échec ou une erreur JS.
import { RACINE_DEPOT } from '../commun/racines.mjs'
import { lancerPersistant } from '../commun/playwright.mjs'
import { existsSync } from 'node:fs'
import { join } from 'node:path'
import { pathToFileURL } from 'node:url'

const DEV = process.env.DEV ?? 'http://localhost:5173/'
const seul = section => process.argv.length <= 2 || process.argv.slice(2).includes(section)
let echecs = 0
const ok = (c, m, detail) => { if (!c) echecs++; console.log(c ? '✓' : '✗ ÉCHEC', m, !c && detail !== undefined ? '— ' + JSON.stringify(detail).slice(0, 1500) : '') }
const erreurs = []
const suivre = (p, nom) => {
  p.on('pageerror', e => erreurs.push(`${nom}: ${e.message}`))
  p.on('console', m => { if (m.type() === 'error' && !/Failed to load resource|ERR_CERT|net::|ERR_INTERNET_DISCONNECTED/.test(m.text())) erreurs.push(`${nom}: ${m.text()}`) })
}

// ---------- La page ----------
/** Les permissions (accordées, chaque demande notée avec le geste), les choix
 *  de dossiers dans l'OPFS, les écritures notées dans sessionStorage, l'heure
 *  du départ (pagehide) : la recette de lot18/E1-ranger.mjs */
const INIT = () => {
  window.__dossierChoisi = null
  const note = (cle, x) => { try { const l = JSON.parse(sessionStorage.getItem(cle) || '[]'); l.push(x); sessionStorage.setItem(cle, JSON.stringify(l)) } catch { /* rien */ } }
  addEventListener('pagehide', () => { try { sessionStorage.setItem('__parti', String(Date.now())) } catch { /* rien */ } })
  const H = window.FileSystemHandle?.prototype
  if (!H) return
  H.queryPermission = async function () { return 'granted' }
  H.requestPermission = async function () { note('__demandes', { nom: this.name, actif: navigator.userActivation.isActive, t: Date.now() }); return 'granted' }
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
/** Dans la page : des classeurs et des dossiers dans la bibliothèque, un .memc
 *  neuf dans l'OPFS, un fichier texte, le contenu d'un dossier, l'en-tête
 *  d'un .memc, le déplaceur branché à la bibliothèque */
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
  window.__texte = async (chemin, nomFichier, texte) => {
    const h = await (await window.__racineOpfs(chemin)).getFileHandle(nomFichier, { create: true })
    const w = await h.createWritable(); await w.write(new Blob([texte])); await w.close()
  }
  window.__retirer = async (chemin, nom) => { const d = await window.__racineOpfs(chemin); await d.removeEntry(nom, { recursive: true }).catch(() => {}) }
  window.__dossier = async (nom, o = {}) => {
    const dem = await import('/src/classeurs/demarrage.ts')
    const d = { id: dem.idClasseur(), nom, parent: o.parent ?? null, couleur: o.couleur ?? '#3b6fb6', cree: Date.now(), ...(o.etiquette ? { etiquette: o.etiquette } : {}) }
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
  /** L'en-tête d'un .memc de l'OPFS (id, nom, date, pages) ; null s'il n'est pas lisible */
  window.__entete = async (chemin, nomFichier) => {
    const fichier = await import('/src/fichier.ts')
    try {
      const h = await (await window.__racineOpfs(chemin)).getFileHandle(nomFichier)
      const f = await h.getFile()
      const e = fichier.lireEntete(new Uint8Array(await f.slice(0, 4096).arrayBuffer()))
      return e ? { id: e.id, nom: e.nom, date: e.date, pages: e.pages, taille: f.size } : null
    } catch { return null }
  }
  /** Le déplaceur : celui que main.ts a branché (window.__deplaceur, en
   *  développement) ; sinon construit ici de la même façon, et branché */
  window.__brancherDeplaceur = async () => {
    if (window.__deplaceur) return true
    const m = await import('/src/classeurs/deplacer-fichier.ts')
    const d = new m.DeplacerClasseur({
      registre: window.__registre, bibliotheque: window.__bibliotheque, cle: window.__cle ?? null,
      message: (t, a) => window.__app.ui.message(t, a), classeur: () => window.__app.classeur,
      avantDEcrire: async f => { if (f.id !== window.__app.classeur.id) return; window.__app.poserCeQuiAttend(); window.__app.piste.vider(); await window.__app.tableau.attendreEcritures() },
    })
    window.__bibliotheque.brancherDeplaceur(d)
    return !!window.__deplaceur
  }
}
/** La version hors ligne (file://) n'a pas d'OPFS : le faux système de
 *  fichiers de lot18/E1-ranger.mjs (en mémoire, gardé dans sessionStorage ;
 *  les poignées rangées dans IndexedDB en ressortent vivantes) */
const FAUX_FS = () => {
  const CLE = '__fauxFS'
  const note = (cle, x) => { try { const l = JSON.parse(sessionStorage.getItem(cle) || '[]'); l.push(x); sessionStorage.setItem(cle, JSON.stringify(l)) } catch { /* rien */ } }
  const lire = () => { try { return JSON.parse(sessionStorage.getItem(CLE) || '{}') } catch { return {} } }
  const garder = () => { try { sessionStorage.setItem(CLE, JSON.stringify(arbre)) } catch { /* rien */ } }
  let arbre = lire()
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
/** La fenêtre « Déplacer vers… » telle qu'elle est */
const FENETRE = () => {
  const d = document.querySelector('dialog.dialogue-deplacer[open]')
  if (!d) return null
  const n = t => (t || '').replace(/[  ]/g, ' ')
  const ligne = d.querySelector('.vers-fichier'), autre = d.querySelector('.vers-autre'), arreter = d.querySelector('[data-a="arreter"]')
  return {
    titre: n(d.querySelector('h2')?.textContent),
    lignes: [...d.querySelectorAll('.vers-dossier')].map(b => ({ id: b.dataset.dossier, texte: n(b.textContent), gris: b.disabled })),
    ligne: ligne && !ligne.hidden ? n(ligne.textContent) : null,
    autre: autre && !autre.hidden ? { libelle: n(autre.querySelector('button').textContent), aide: n(autre.querySelector('small').textContent) } : null,
    arreter: arreter && !arreter.hidden ? n(arreter.textContent) : null,
    focus: document.activeElement?.dataset?.dossier ?? document.activeElement?.dataset?.a ?? null,
  }
}
const toasts = p => p.evaluate(() => (window.__toasts || []).splice(0))
const attendreToast = (p, re, timeout = 20000) => p.waitForFunction(s => (window.__toasts || []).some(t => new RegExp(s).test(t)), re.source, { timeout }).then(() => true, () => false)
const notes = (p, cle) => p.evaluate(c => JSON.parse(sessionStorage.getItem(c) || '[]'), cle)
const oublier = (p, ...cles) => p.evaluate(cs => { for (const c of cs) sessionStorage.removeItem(c) }, cles)
const fiche = (p, id) => p.evaluate(async id => { const f = await window.__registre.classeur(id); return f ? { id: f.id, nom: f.nom, dossier: f.dossier, corbeille: !!f.corbeille, cle: f.cle ? { nom: f.cle.nom, chemin: f.cle.chemin ?? null, date: f.cle.date ?? null } : null } : null }, id)
const etatCle = p => p.evaluate(() => { const c = window.__surveillance.etat.cle; return { etat: c.etat, nom: c.nom ?? null, chemin: c.chemin ?? null } })
const lister = (p, chemin) => p.evaluate(c => window.__lister(c), chemin)
const entete = (p, chemin, nom) => p.evaluate(({ chemin, nom }) => window.__entete(chemin, nom), { chemin, nom })
/** Attend que le fichier `nom` du dossier dépasse `avant` octets (sondé d'ici, toutes les 500 ms) ; sa taille, ou null */
const attendreTaille = async (p, chemin, nom, avant, timeout = 60000) => {
  const fin = Date.now() + timeout
  while (Date.now() < fin) { const c = await lister(p, chemin); if ((c?.[nom] ?? 0) > avant) return c[nom]; await p.waitForTimeout(500) }
  return null
}
const M1 = '{"seance":1}', M2 = '{"seance":2,"code":"re34G"}'
const fenetre = p => p.evaluate(FENETRE)
const reglage = (p, cle) => p.evaluate(async c => { const x = await window.__registre.reglage(c); return x && typeof x === 'object' && typeof x.getDirectoryHandle === 'function' ? { poignee: x.name } : x && typeof x === 'object' && x.poignee ? { poignee: x.poignee.name, compte: x.compte ?? null } : x ?? null }, cle)
/** Le classeur `id` reçoit son fichier à sa place (sans geste : l'accord est déjà là dans l'OPFS simulé) ; celui de l'onglet : sa clé repart dessus */
const donnerSonFichier = (p, id) => p.evaluate(async id => {
  const f = await window.__registre.classeur(id)
  const c = await window.__ranger.donnerSonFichier(f, { geste: false })
  if (window.__app?.classeur?.id === id) { await window.__cle.resynchroniser(); await window.__cle.pret }
  return c ?? null
}, id)

const navigateur = await lancerPersistant()
async function contexte() {
  const ctx = await navigateur.newContext({ viewport: { width: 1366, height: 768 } })
  await ctx.addInitScript(INIT)
  await ctx.addInitScript(ECOUTER_TOASTS)
  await ctx.addInitScript(OUTILS)
  return ctx
}
const pret = p => p.waitForFunction(() => (window.__surveillance && window.__bibliotheque && document.querySelector('.rang')?.textContent?.includes('/'))
  || (window.__bibliotheque && !window.__app && !document.querySelector('.bibliotheque').hidden), null, { timeout: 30000 })
async function ouvrirPage(ctx, chemin = '', nom = 'p') {
  const p = await ctx.newPage(); suivre(p, nom)
  await p.goto(DEV + chemin); await pret(p)
  await p.evaluate(() => Promise.all([window.__cle?.pret, window.__drive?.pret]))
  return p
}
const voirBibliotheque = async (p, dossier) => {
  await p.evaluate(() => { if (!window.__bibliotheque.ouvert) window.__app.ui.ouvrirBibliotheque() })
  await p.waitForFunction(() => window.__bibliotheque.ouvert)
  await p.evaluate(() => window.__bibliotheque.charger())
  await p.waitForTimeout(200)
  if (dossier !== undefined) { await p.evaluate(d => window.__bibliotheque.allerA(d), dossier); await p.waitForTimeout(300) }
}
const fermerBibliotheque = async p => { await p.evaluate(() => { if (window.__bibliotheque.ouvert) window.__bibliotheque.fermer() }); await p.waitForTimeout(200) }
const fermerDialogues = async p => { await p.evaluate(() => { for (const d of document.querySelectorAll('dialog[open]')) d.close() }); await p.waitForTimeout(200) }
/** La fenêtre « Déplacer « X » vers… » du classeur de l'onglet (le menu ⋯ appelle deplaceur.ouvrir()) */
const ouvrirFenetre = async p => {
  await p.mouse.move(8, 8)
  await p.evaluate(() => { void window.__deplaceur.ouvrir() })
  await p.waitForSelector('dialog.dialogue-deplacer[open]', { timeout: 10000 })
  await p.waitForTimeout(150)
}
const choisirDans = async (p, dossierId) => { await p.click(`dialog.dialogue-deplacer[open] .vers-dossier[data-dossier="${dossierId ?? ''}"]`) }
const survoler = async (p, dossierId) => { await p.hover(`dialog.dialogue-deplacer[open] .vers-dossier[data-dossier="${dossierId ?? ''}"]`); await p.waitForTimeout(80) }
const sel = (cle, l = 'tous') => `.grille-classeurs.${l} li[data-cle="${cle}"]`
const menuCarte = async (p, cle) => { await p.click(`${sel(cle)} .options-classeur`); await p.waitForTimeout(150) }
const entreeMenu = async (p, action) => { await p.click(`.menu-flottant:not([hidden]) [data-action="${action}"]`); await p.waitForTimeout(300) }
async function trait(p, x0, y0, n = 8) {
  await p.mouse.move(x0, y0); await p.mouse.down()
  for (let i = 1; i <= n; i++) await p.mouse.move(x0 + i * 12, y0 + Math.sin(i / 2) * 16)
  await p.mouse.up(); await p.waitForTimeout(100)
}
/** Un glisser à la souris, du centre de la carte a sur la carte b (comme lot4/C7) */
async function glisserSouris(p, de, vers) {
  const a = await p.locator(de).boundingBox(), b = await p.locator(vers).boundingBox()
  const x0 = a.x + a.width / 2, y0 = a.y + Math.min(60, a.height / 2), x1 = b.x + b.width / 2, y1 = b.y + b.height / 2
  await p.mouse.move(x0, y0); await p.mouse.down()
  for (let i = 1; i <= 12; i++) { await p.mouse.move(x0 + (x1 - x0) * i / 12, y0 + (y1 - y0) * i / 12); await new Promise(r => setTimeout(r, 16)) }
  await p.mouse.up()
  await p.waitForTimeout(500)
}

try {
  if (seul('A')) {
  // =====================================================================
  console.log('\n— A. Le classeur de l\'onglet : la fenêtre, « 5eme » → « 4eme », le fichier suit')
  const ctx = await contexte()
  const p = await ouvrirPage(ctx, '', 'A')
  // Deux niveaux rangés dans deux établissements (les réglages, avec de vraies poignées de l'OPFS), un niveau pas rangé
  const { d5, d4, d3, id } = await p.evaluate(async () => {
    const r = window.__registre, t = Date.now()
    const d5 = await window.__dossier('5eme', { etiquette: '5eme' }), d4 = await window.__dossier('4eme', { etiquette: '4eme', couleur: '#2f8a57' }), d3 = await window.__dossier('3eme', { etiquette: '3eme', couleur: '#c24a4a' })
    await r.ecrireReglage('etablissements', [{ id: '0123456789abcdef', nom: 'LFB classeurs', cree: t }, { id: '0123456789abcdee', nom: 'MEM classeurs', cree: t }])
    await r.ecrireReglage('etablissement-poignee:0123456789abcdef', await window.__racineOpfs('LFB classeurs'))
    await r.ecrireReglage('etablissement-poignee:0123456789abcdee', await window.__racineOpfs('MEM classeurs'))
    await r.ecrireReglage('emplacements', [
      { id: 'fedcba9876543210', genre: 'ordinateur', dossier: d5, nom: '5', cree: t, etablissement: '0123456789abcdef' },
      { id: 'fedcba9876543211', genre: 'ordinateur', dossier: d4, nom: '4', cree: t, etablissement: '0123456789abcdee' },
    ])
    await r.ecrireReglage('emplacement-poignee:fedcba9876543210', await window.__racineOpfs('LFB classeurs/5'))
    await r.ecrireReglage('emplacement-poignee:fedcba9876543211', await window.__racineOpfs('MEM classeurs/4'))
    // Le classeur de l'onglet : « Fractions », dans « 5eme »
    const id = window.__app.classeur.id
    await r.modifierClasseur(id, f => { f.dossier = d5; f.nom = 'Fractions' })
    window.__app.classeur.nom = 'Fractions'
    return { d5, d4, d3, id }
  })
  await trait(p, 500, 300)
  await p.waitForTimeout(300)
  const c0 = await donnerSonFichier(p, id)
  await p.waitForFunction(() => window.__surveillance?.etat?.cle?.etat === 'ok', null, { timeout: 15000 }).catch(() => {})
  let f = await fiche(p, id)
  ok(c0 && JSON.stringify(f.cle?.chemin) === '["LFB classeurs","5","Fractions"]' && (await etatCle(p)).etat === 'ok', 'A0) Départ : « Fractions » a son fichier dans « LFB classeurs › 5 › Fractions », la clé active', { c0, f, etat: await etatCle(p) })
  ok(await p.evaluate(() => window.__brancherDeplaceur()), 'A1) Le déplaceur est construit depuis la page et branché à la bibliothèque (window.__deplaceur)')
  await oublier(p, '__demandes', '__ecritures', '__choixDossier')
  await toasts(p)
  await ouvrirFenetre(p)
  let w = await fenetre(p)
  ok(w?.titre === 'Déplacer « Fractions » vers…', 'A2) La fenêtre « Déplacer « Fractions » vers… »', w?.titre)
  ok(w?.lignes[0].texte === 'Bibliothèque (la racine)' && w.lignes.slice(1).map(l => `${l.texte}${l.gris ? '*' : ''}`).sort().join(' | ') === '3eme | 4eme | 5eme(ici)*', '   … l\'arbre : la racine, 3eme, 4eme, 5eme (ici, grisé)', w?.lignes)
  ok(w?.focus === '' && w.ligne === 'La racine de la bibliothèque n\'a pas de dossier : le fichier reste où il est.', '   … le focus sur la racine, et la ligne : « La racine de la bibliothèque n\'a pas de dossier : le fichier reste où il est. »', { focus: w?.focus, ligne: w?.ligne })
  ok(w?.autre?.libelle === 'Un autre dossier de l\'ordinateur…' && /Vous choisissez vous-même le dossier de ce classeur/.test(w.autre.aide) && w.arreter === null,
    '   … « Un autre dossier de l\'ordinateur… » en bas de l\'arbre, avec son explication ; pas de « Ne plus l\'enregistrer » (le fichier est rangé par l\'outil)', w)
  await survoler(p, d4)
  w = await fenetre(p)
  ok(w?.ligne === 'Son fichier ira dans « MEM classeurs › 4 › Fractions ». L\'ancien sera retiré une fois le nouveau écrit.', 'A3) Sur « 4eme » : « Son fichier ira dans « MEM classeurs › 4 › Fractions ». L\'ancien sera retiré une fois le nouveau écrit. »', w?.ligne)
  await p.keyboard.press('ArrowDown')
  w = await fenetre(p)
  ok(w?.focus === d3 && w.ligne === 'Le niveau « 3eme » n\'est pas rangé dans un dossier : le fichier reste où il est.', '   … ↓ : « 3eme », la ligne suit le focus : « Le niveau « 3eme » n\'est pas rangé dans un dossier : le fichier reste où il est. »', w)
  const avantA = await lister(p, '')
  await choisirDans(p, d4)
  ok(await attendreToast(p, /Son fichier aussi, dans « MEM classeurs › 4 › Fractions »/, 30000), 'A4) Le message du déplacement arrive')
  const tA = await toasts(p)
  ok(tA.some(t => t.includes('« Fractions » déplacé dans « 4eme » : il porte maintenant l\'étiquette « 4eme » (et plus « 5eme »). Son fichier aussi, dans « MEM classeurs › 4 › Fractions ».') && t.includes('Aller à « 4eme »') && t.includes('Annuler')),
    '   … « « Fractions » déplacé dans « 4eme » : … Son fichier aussi, dans « MEM classeurs › 4 › Fractions ». » [Aller à « 4eme »] [Annuler]', tA)
  ok(tA.some(t => /Déplacement du fichier de « Fractions »…/.test(t)), '   … pendant l\'écriture : « Déplacement du fichier de « Fractions »… »', tA)
  let contenu = await lister(p, '')
  ok(contenu?.['MEM classeurs']?.['4']?.Fractions?.['Fractions.memc'] > 0, 'A5) MEM classeurs/4/Fractions/Fractions.memc est écrit', contenu?.['MEM classeurs'])
  ok(contenu?.['LFB classeurs']?.['5'] && !('Fractions' in contenu['LFB classeurs']['5']), '   … l\'ancien fichier est retiré, et l\'ancien dossier du chapitre (vide) aussi ; le dossier « 5 » reste', contenu?.['LFB classeurs'])
  const eA = await entete(p, 'MEM classeurs/4/Fractions', 'Fractions.memc')
  ok(eA && eA.id === id && eA.nom === 'Fractions' && eA.pages === 1 && eA.taille === avantA['LFB classeurs']['5'].Fractions['Fractions.memc'] || (eA && eA.id === id && eA.taille > 0),
    `A6) Le nouveau fichier est lisible : l'en-tête porte cet id, « Fractions », 1 page (${eA?.taille} octets)`, { eA, avant: avantA?.['LFB classeurs']?.['5']?.Fractions })
  f = await fiche(p, id)
  ok(f.dossier === d4 && f.cle?.nom === 'Fractions.memc' && JSON.stringify(f.cle.chemin) === '["MEM classeurs","4","Fractions"]' && f.cle.date === eA?.date,
    'A7) La fiche : dans « 4eme », son fichier et son chemin [« MEM classeurs », « 4 », « Fractions »], la date écrite', f)
  const eC = await etatCle(p)
  ok(eC.etat === 'ok' && eC.nom === 'Fractions.memc' && JSON.stringify(eC.chemin) === '["MEM classeurs","4","Fractions"]', 'A8) L\'état à l\'écran : la clé active, le nouveau chemin (le bouton dit « Enregistré dans MEM classeurs › 4 › Fractions »)', eC)
  const poigneeA = await p.evaluate(async id => (await window.__registre.poignee(id))?.name ?? null, id)
  ok(poigneeA === 'Fractions.memc', '   … la poignée gardée dans l\'index est celle du nouveau fichier', poigneeA)
  // La clé de l'onglet écrit ensuite dans le NOUVEAU fichier : un trait, puis 20 s
  await oublier(p, '__ecritures')
  const tailleAvant = contenu['MEM classeurs']['4'].Fractions['Fractions.memc']
  await trait(p, 500, 400)
  const ecrit = await attendreTaille(p, 'MEM classeurs/4/Fractions', 'Fractions.memc', tailleAvant)
  contenu = await lister(p, '')
  const ecritures = await notes(p, '__ecritures')
  ok(ecrit && ecritures.some(x => x.nom === 'Fractions.memc') && !contenu['LFB classeurs']['5'].Fractions,
    `A9) Un trait, puis la clé écrit d'elle-même dans le nouveau fichier (${tailleAvant} → ${contenu?.['MEM classeurs']?.['4']?.Fractions?.['Fractions.memc']} octets) ; rien dans l'ancien dossier`, { ecrit, ecritures, lfb: contenu?.['LFB classeurs'] })
  let dem = await notes(p, '__demandes')
  ok(dem.every(x => x.actif), `A10) ${dem.length} demande(s) d'accord au navigateur, toutes dans un geste`, dem)

  // =====================================================================
  console.log('\n— B. Les .mem du chapitre suivent ; « Annuler » ramène tout')
  await p.evaluate(([a, b]) => Promise.all([window.__texte('MEM classeurs/4/Fractions', 'Seance 1.mem', a), window.__texte('MEM classeurs/4/Fractions', 'Seance 2 [re34G].mem', b)]), [M1, M2])
  await toasts(p)
  await ouvrirFenetre(p)
  await choisirDans(p, d5)
  ok(await attendreToast(p, /Son fichier aussi, dans « LFB classeurs › 5 › Fractions »/, 30000), 'B1) Le déplacement vers « 5eme »')
  let tB = await toasts(p)
  ok(tB.some(t => t.includes('Son fichier aussi, dans « LFB classeurs › 5 › Fractions » (avec 2 fichiers .mem).')), '   … « Son fichier aussi, dans « LFB classeurs › 5 › Fractions » (avec 2 fichiers .mem). »', tB)
  contenu = await lister(p, '')
  const ch5 = contenu?.['LFB classeurs']?.['5']?.Fractions
  ok(ch5?.['Fractions.memc'] > 0 && ch5['Seance 1.mem'] === M1.length && ch5['Seance 2 [re34G].mem'] === M2.length && Object.keys(ch5).length === 3, 'B2) LFB classeurs/5/Fractions : le .memc et les deux .mem (leur taille relue)', ch5)
  ok(contenu?.['MEM classeurs']?.['4'] && !('Fractions' in contenu['MEM classeurs']['4']), '   … l\'ancien dossier du chapitre, vidé, est retiré', contenu?.['MEM classeurs']?.['4'])
  // « Annuler » : le classeur revient, et son fichier avec lui
  await p.click('.toast button.action:has-text("Annuler")')
  ok(await attendreToast(p, /est revenu dans « 4eme »/, 30000), 'B3) « Annuler » : « Fractions » revient dans « 4eme »')
  tB = await toasts(p)
  ok(tB.some(t => t.includes('« Fractions » est revenu dans « 4eme ». Son fichier aussi, dans « MEM classeurs › 4 › Fractions » (avec 2 fichiers .mem).')), '   … « « Fractions » est revenu dans « 4eme ». Son fichier aussi, dans « MEM classeurs › 4 › Fractions » (avec 2 fichiers .mem). »', tB)
  contenu = await lister(p, '')
  const ch4 = contenu?.['MEM classeurs']?.['4']?.Fractions
  f = await fiche(p, id)
  ok(ch4?.['Fractions.memc'] > 0 && ch4['Seance 1.mem'] === M1.length && ch4['Seance 2 [re34G].mem'] === M2.length && !('Fractions' in (contenu?.['LFB classeurs']?.['5'] ?? {})) && f.dossier === d4 && JSON.stringify(f.cle?.chemin) === '["MEM classeurs","4","Fractions"]',
    'B4) Tout est revenu dans MEM classeurs/4/Fractions ; la fiche le dit', { ch4, lfb5: contenu?.['LFB classeurs']?.['5'], f })

  // =====================================================================
  console.log('\n— C. Vers un niveau pas rangé : le fichier reste ; de retour : « déjà dans »')
  await toasts(p)
  await ouvrirFenetre(p)
  await survoler(p, d3)
  w = await fenetre(p)
  ok(w?.ligne === 'Le niveau « 3eme » n\'est pas rangé dans un dossier : le fichier reste où il est.', 'C1) La ligne pour « 3eme »', w?.ligne)
  await oublier(p, '__ecritures')
  await choisirDans(p, d3)
  ok(await attendreToast(p, /déplacé dans « 3eme ».*Son fichier reste/, 20000), 'C2) Le message')
  let tC = await toasts(p)
  ok(tC.some(t => t.includes('« Fractions » déplacé dans « 3eme » : il porte maintenant l\'étiquette « 3eme » (et plus « 4eme »). Son fichier reste dans « MEM classeurs › 4 › Fractions ».')), '   … « … Son fichier reste dans « MEM classeurs › 4 › Fractions ». »', tC)
  contenu = await lister(p, '')
  f = await fiche(p, id)
  ok(f.dossier === d3 && JSON.stringify(f.cle?.chemin) === '["MEM classeurs","4","Fractions"]' && contenu?.['MEM classeurs']?.['4']?.Fractions?.['Fractions.memc'] > 0 && (await notes(p, '__ecritures')).length === 0 && JSON.stringify((await etatCle(p)).chemin) === '["MEM classeurs","4","Fractions"]',
    'C3) Dans « 3eme » ; le fichier n\'a pas bougé, rien n\'a été écrit, l\'état dit toujours son chemin', { f, ecritures: await notes(p, '__ecritures') })
  await ouvrirFenetre(p)
  await survoler(p, d4)
  w = await fenetre(p)
  ok(w?.ligne === 'Son fichier est déjà dans « MEM classeurs › 4 › Fractions ».', 'C4) De retour vers « 4eme » : « Son fichier est déjà dans « MEM classeurs › 4 › Fractions ». »', w?.ligne)
  await choisirDans(p, d4)
  ok(await attendreToast(p, /déjà dans/, 20000), '   … le message le dit aussi')
  tC = await toasts(p)
  f = await fiche(p, id)
  ok(tC.some(t => t.includes('« Fractions » déplacé dans « 4eme »') && t.includes('Son fichier est déjà dans « MEM classeurs › 4 › Fractions ».')) && f.dossier === d4 && (await notes(p, '__ecritures')).length === 0, '   … rien d\'écrit', { tC, f })

  // =====================================================================
  console.log('\n— D. Un fichier choisi à la main : il reste ; « Ne plus l\'enregistrer dans un fichier »')
  const okD = await p.evaluate(() => window.__cle.choisirUnAutre())
  await p.waitForFunction(() => window.__surveillance?.etat?.cle?.etat === 'ok' && !window.__surveillance.etat.cle.chemin, null, { timeout: 15000 }).catch(() => {})
  f = await fiche(p, id)
  ok(okD && f.cle?.nom === 'Fractions.memc' && f.cle.chemin === null && (await lister(p, ''))?.['Fractions.memc'] > 0, 'D1) « Choisir un autre fichier… » (showSaveFilePicker simulé) : « Fractions.memc » à la racine de l\'OPFS, sans chemin dans la fiche', { okD, f })
  await toasts(p)
  await ouvrirFenetre(p)
  await survoler(p, d5)
  w = await fenetre(p)
  ok(w?.ligne === '« Fractions.memc » a été choisi à la main : il reste où il est.' && w.arreter === 'Ne plus l\'enregistrer dans un fichier' && w.autre !== null,
    'D2) La ligne : « « Fractions.memc » a été choisi à la main : il reste où il est. » ; le bouton « Ne plus l\'enregistrer dans un fichier » ; « Un autre dossier… »', w)
  await choisirDans(p, d5)
  ok(await attendreToast(p, /choisi à la main/, 20000), 'D3) Le message')
  let tD = await toasts(p)
  contenu = await lister(p, '')
  f = await fiche(p, id)
  ok(tD.some(t => t.includes('« Fractions » déplacé dans « 5eme »') && t.includes('Son fichier « Fractions.memc » (choisi à la main) reste où il est.')) && contenu?.['Fractions.memc'] > 0 && contenu['MEM classeurs']['4'].Fractions['Fractions.memc'] > 0 && f.dossier === d5 && f.cle.chemin === null,
    '   … « Son fichier « Fractions.memc » (choisi à la main) reste où il est. » ; rien n\'est retiré (ni lui, ni le fichier rangé d\'avant)', { tD, f })
  await ouvrirFenetre(p)
  await p.click('dialog.dialogue-deplacer[open] [data-a="arreter"]')
  ok(await attendreToast(p, /ne s'enregistre plus dans « Fractions\.memc »/, 20000), 'D4) « Ne plus l\'enregistrer dans un fichier » : « Le classeur ne s\'enregistre plus dans « Fractions.memc » … »')
  await p.waitForFunction(() => window.__surveillance?.etat?.cle?.etat === 'absente', null, { timeout: 10000 }).catch(() => {})
  f = await fiche(p, id)
  ok(f.cle === null && (await etatCle(p)).etat === 'absente' && !(await fenetre(p)), '   … plus de fichier dans la fiche, l\'état « absente », la fenêtre fermée', { f, etat: await etatCle(p) })
  // Le fichier rangé d'avant (MEM classeurs/4/Fractions/Fractions.memc) ne sert plus : on le retire pour la suite (les .mem restent là) ; le classeur reçoit son fichier à sa place (5eme)
  await p.evaluate(() => window.__retirer('MEM classeurs/4/Fractions', 'Fractions.memc'))
  const cD = await donnerSonFichier(p, id)
  await p.waitForFunction(() => window.__surveillance?.etat?.cle?.etat === 'ok', null, { timeout: 15000 }).catch(() => {})
  f = await fiche(p, id)
  ok(cD && JSON.stringify(f.cle?.chemin) === '["LFB classeurs","5","Fractions"]' && (await etatCle(p)).etat === 'ok', 'D5) (Pour la suite : il reçoit son fichier dans « LFB classeurs › 5 › Fractions », la clé repart)', { cD, f, etat: await etatCle(p) })

  // =====================================================================
  console.log('\n— E. L\'ancien fichier modifié ailleurs : le nouveau est écrit, l\'ancien reste')
  await p.evaluate(() => window.__memcNeuf('LFB classeurs/5/Fractions', 'Fractions.memc', 'Autre chose'))
  const eAvant = await entete(p, 'LFB classeurs/5/Fractions', 'Fractions.memc')
  ok(eAvant && eAvant.id !== id, 'E1) Le fichier de la clé est remplacé dans l\'OPFS par un autre classeur (son en-tête a changé)', eAvant)
  await toasts(p)
  await ouvrirFenetre(p)
  await choisirDans(p, d4)
  ok(await attendreToast(p, /a changé ailleurs depuis le dernier enregistrement/, 30000), 'E2) Le déplacement vers « 4eme » se fait')
  const tE = await toasts(p)
  ok(tE.some(t => t.includes('Son fichier aussi, dans « MEM classeurs › 4 › Fractions ». L\'ancien fichier « Fractions.memc » a changé ailleurs depuis le dernier enregistrement d\'ici : il reste dans « LFB classeurs › 5 › Fractions ».')),
    '   … « Son fichier aussi, dans « MEM classeurs › 4 › Fractions ». L\'ancien fichier « Fractions.memc » a changé ailleurs depuis le dernier enregistrement d\'ici : il reste dans « LFB classeurs › 5 › Fractions ». »', tE)
  contenu = await lister(p, '')
  const eApres = await entete(p, 'LFB classeurs/5/Fractions', 'Fractions.memc')
  const eNeuf = await entete(p, 'MEM classeurs/4/Fractions', 'Fractions.memc')
  ok(eApres && eApres.id === eAvant.id && eApres.taille === eAvant.taille && eNeuf?.id === id, 'E3) L\'ancien fichier (l\'autre classeur) est intact à sa place ; le nouveau porte cet id', { eApres, eNeuf })
  f = await fiche(p, id)
  ok(f.dossier === d4 && JSON.stringify(f.cle?.chemin) === '["MEM classeurs","4","Fractions"]' && (await etatCle(p)).etat === 'ok', '   … la fiche et l\'état suivent le nouveau fichier', { f, etat: await etatCle(p) })
  await p.evaluate(() => window.__retirer('LFB classeurs/5', 'Fractions'))

  // =====================================================================
  console.log('\n— F. Un fichier plus riche (l\'histoire perdue) : rien ne bouge')
  // La fiche dit que le fichier a l'histoire d'un appareil que ce classeur n'a pas (le vecteur [1, 7, 5] : un appareil 7, 5 changements)
  await p.evaluate(async id => {
    const f = await window.__registre.classeur(id)
    window.__vecteurSauve = f.cle.vecteur
    await window.__registre.modifierClasseur(id, x => { x.cle = { ...x.cle, vecteur: new Uint8Array([1, 7, 5]), t: Date.now() + 5000 } })
  }, id)
  await toasts(p)
  await oublier(p, '__ecritures')
  await ouvrirFenetre(p)
  await choisirDans(p, d5)
  ok(await attendreToast(p, /a des changements que ce classeur n'a pas/, 30000), 'F1) Le message')
  const tF = await toasts(p)
  ok(tF.some(t => t.includes('« Fractions » déplacé dans « 5eme »') && t.includes('Le fichier « Fractions.memc » a des changements que ce classeur n\'a pas : il n\'est pas déplacé. Ouvrez-le d\'abord (Ctrl + O).')),
    '   … « Le fichier « Fractions.memc » a des changements que ce classeur n\'a pas : il n\'est pas déplacé. Ouvrez-le d\'abord (Ctrl + O). »', tF)
  contenu = await lister(p, '')
  f = await fiche(p, id)
  ok(contenu?.['MEM classeurs']?.['4']?.Fractions?.['Fractions.memc'] > 0 && !contenu?.['LFB classeurs']?.['5']?.Fractions && (await notes(p, '__ecritures')).length === 0 && f.dossier === d5 && JSON.stringify(f.cle?.chemin) === '["MEM classeurs","4","Fractions"]',
    'F2) Rien n\'a été écrit ni retiré ; le classeur est dans « 5eme », son fichier toujours dans MEM classeurs/4/Fractions', { contenu, f })
  // Le vrai vecteur revient ; la clé revérifie ; le classeur retourne à sa place
  await p.evaluate(async id => { await window.__registre.modifierClasseur(id, x => { x.cle = { ...x.cle, vecteur: window.__vecteurSauve, t: Date.now() + 6000 } }); await window.__cle.resynchroniser() }, id)
  await p.waitForFunction(() => window.__surveillance?.etat?.cle?.etat === 'ok', null, { timeout: 15000 }).catch(() => {})
  await p.evaluate(({ id, d4 }) => window.__bibliotheque.deplacerVers(id, d4), { id, d4 })
  await p.waitForTimeout(500)
  f = await fiche(p, id)
  ok((await etatCle(p)).etat === 'ok' && f.dossier === d4, 'F3) (Le vrai vecteur revenu : la clé repart ; le classeur de retour dans « 4eme »)', { etat: await etatCle(p), f })

  // =====================================================================
  console.log('\n— G. Depuis une carte, par un glisser ; un classeur ouvert dans un autre onglet')
  const [idSym] = await p.evaluate(d => window.__creer([{ nom: 'Symetrie', dossier: d }]), d5)
  const cG = await donnerSonFichier(p, idSym)
  ok(cG && (await lister(p, 'LFB classeurs/5/Symetrie'))?.['Symetrie.memc'] > 0, 'G0) « Symetrie », fermé, dans « 5eme », son fichier dans LFB classeurs/5/Symetrie', cG)
  await voirBibliotheque(p, d5)
  await toasts(p)
  await menuCarte(p, idSym)
  await entreeMenu(p, 'deplacer')
  await p.waitForSelector('dialog.dialogue-deplacer[open]', { timeout: 10000 })
  await survoler(p, d4)
  w = await fenetre(p)
  ok(w?.titre === 'Déplacer « Symetrie » vers…' && w.ligne === 'Son fichier ira dans « MEM classeurs › 4 › Symetrie ». L\'ancien sera retiré une fois le nouveau écrit.' && w.autre === null && w.arreter === null,
    'G1) Depuis la carte : la fenêtre, la ligne pour « 4eme » ; ni « Un autre dossier… » ni « Ne plus l\'enregistrer » (seulement pour le classeur de l\'onglet)', w)
  await oublier(p, '__demandes')
  await choisirDans(p, d4)
  ok(await attendreToast(p, /« Symetrie » déplacé dans « 4eme ».*Son fichier aussi/, 30000), 'G2) Le fichier suit (sous le verrou du classeur)')
  let tG = await toasts(p)
  contenu = await lister(p, '')
  let fs = await fiche(p, idSym)
  ok(tG.some(t => t.includes('« Symetrie » déplacé dans « 4eme »') && t.includes('Son fichier aussi, dans « MEM classeurs › 4 › Symetrie ».')) && contenu?.['MEM classeurs']?.['4']?.Symetrie?.['Symetrie.memc'] > 0 && !contenu?.['LFB classeurs']?.['5']?.Symetrie && JSON.stringify(fs.cle?.chemin) === '["MEM classeurs","4","Symetrie"]',
    '   … MEM classeurs/4/Symetrie/Symetrie.memc, l\'ancien retiré, la fiche', { tG, fs, contenu })
  const eG = await entete(p, 'MEM classeurs/4/Symetrie', 'Symetrie.memc')
  ok(eG?.id === idSym && eG.date === fs.cle?.date, '   … le nouveau fichier porte l\'id de « Symetrie » et la date notée dans la fiche', { eG, fs })
  // Par un glisser : sur la carte du sous-dossier « Geo » de « 4eme »
  const dGeo = await p.evaluate(d => window.__dossier('Geo', { parent: d }), d4)
  await voirBibliotheque(p, d4)
  await toasts(p)
  await glisserSouris(p, sel(idSym), sel('d:' + dGeo))
  ok(await attendreToast(p, /« Symetrie » déplacé dans « Geo ».*Son fichier aussi/, 30000), 'G3) Glissé sur « Geo » : le fichier suit')
  tG = await toasts(p)
  contenu = await lister(p, 'MEM classeurs/4')
  fs = await fiche(p, idSym)
  ok(tG.some(t => t.includes('« Symetrie » déplacé dans « Geo »') && t.includes('Son fichier aussi, dans « MEM classeurs › 4 › Geo › Symetrie ».')) && contenu?.Geo?.Symetrie?.['Symetrie.memc'] > 0 && !contenu?.Symetrie && fs.dossier === dGeo && JSON.stringify(fs.cle?.chemin) === '["MEM classeurs","4","Geo","Symetrie"]',
    '   … MEM classeurs/4/Geo/Symetrie/Symetrie.memc ; l\'ancien dossier retiré ; la fiche', { tG, contenu, fs })
  dem = await notes(p, '__demandes')
  ok(dem.every(x => x.actif), `G4) ${dem.length} demande(s) d'accord, toutes dans un geste`, dem)
  // Un classeur fermé ici, ouvert dans un autre onglet : son fichier n'est pas touché
  const q = await ouvrirPage(ctx, '?classeur=' + idSym, 'G-autre')
  const nomQ = await q.evaluate(() => window.__app.classeur.nom)
  ok(nomQ === 'Symetrie' && (await etatCle(q)).etat === 'ok', 'G5) Un deuxième onglet ouvre « Symetrie » (sa clé y est active)', { nomQ, etat: await etatCle(q) })
  await toasts(p)
  await p.evaluate(({ id, d }) => window.__bibliotheque.deplacerVers(id, d), { id: idSym, d: d5 })
  ok(await attendreToast(p, /un autre onglet est ouvert sur ce classeur/, 30000), 'G6) Depuis le premier onglet, « Symetrie » vers « 5eme » : « Son fichier n\'a pas été déplacé : un autre onglet est ouvert sur ce classeur. Fermez-le, puis recommencez. »')
  contenu = await lister(p, '')
  fs = await fiche(p, idSym)
  ok(contenu?.['MEM classeurs']?.['4']?.Geo?.Symetrie?.['Symetrie.memc'] > 0 && !contenu?.['LFB classeurs']?.['5']?.Symetrie && fs.dossier === d5 && JSON.stringify(fs.cle?.chemin) === '["MEM classeurs","4","Geo","Symetrie"]',
    '   … le fichier n\'a pas bougé (le classeur, lui, est dans « 5eme ») ; l\'autre onglet l\'écrit toujours', { contenu, fs })
  await q.close()
  await fermerBibliotheque(p)

  // =====================================================================
  console.log('\n— H. « Un autre dossier de l\'ordinateur… »')
  f = await fiche(p, id)
  ok(f.dossier === d4 && JSON.stringify(f.cle?.chemin) === '["MEM classeurs","4","Fractions"]' && (await lister(p, 'MEM classeurs/4/Fractions'))?.['Seance 1.mem'] === M1.length, 'H0) « Fractions » est dans « 4eme », son fichier et ses deux .mem dans MEM classeurs/4/Fractions', f)
  await toasts(p)
  await oublier(p, '__demandes', '__choixDossier')
  await ouvrirFenetre(p)
  await p.evaluate(() => { window.__dossierChoisi = 'Drive LFB/2_13_Proba' })
  await p.click('dialog.dialogue-deplacer[open] .vers-autre-dossier')
  ok(await attendreToast(p, /est maintenant dans « 2_13_Proba »/, 30000), 'H1) Le message arrive')
  const tH = await toasts(p)
  ok(tH.some(t => t.includes('Le fichier de « Fractions » est maintenant dans « 2_13_Proba » (avec 2 fichiers .mem). Publier y rangera aussi ses replays.')), '   … « Le fichier de « Fractions » est maintenant dans « 2_13_Proba » (avec 2 fichiers .mem). Publier y rangera aussi ses replays. »', tH)
  const choix = await notes(p, '__choixDossier')
  ok(choix.length === 1 && choix[0].id === 'mem-chapitre' && choix[0].actif, '   … le choix du dossier s\'est ouvert dans le clic (id « mem-chapitre »)', choix)
  contenu = await lister(p, '')
  const proba = contenu?.['Drive LFB']?.['2_13_Proba']
  f = await fiche(p, id)
  ok(proba?.['Fractions.memc'] > 0 && proba['Seance 1.mem'] === M1.length && proba['Seance 2 [re34G].mem'] === M2.length && Object.keys(proba).length === 3, 'H2) Drive LFB/2_13_Proba : Fractions.memc directement dedans (pas de sous-dossier), avec les deux .mem', proba)
  ok(contenu?.['MEM classeurs']?.['4'] && !('Fractions' in contenu['MEM classeurs']['4']) && f.dossier === d4 && JSON.stringify(f.cle?.chemin) === '["2_13_Proba"]' && JSON.stringify((await etatCle(p)).chemin) === '["2_13_Proba"]',
    'H3) L\'ancien dossier retiré ; le classeur reste dans « 4eme » ; chemin = [« 2_13_Proba »] dans la fiche et à l\'écran', { mem4: contenu?.['MEM classeurs']?.['4'], f, etat: await etatCle(p) })
  const retenuH = await reglage(p, 'replay-dossier:' + id)
  ok(retenuH?.poignee === '2_13_Proba', 'H4) Le dossier retenu pour les replays de ce classeur : « 2_13_Proba »', retenuH)
  await p.evaluate(() => window.__app.ui.publication.ouvrir({ complet: true }))
  await p.waitForSelector('.dialogue-publier[open]', { timeout: 10000 })
  const pubH = await p.evaluate(() => document.querySelector('.p-chemin')?.textContent ?? null)
  ok(pubH === '2_13_Proba', '   … Publier propose « 2_13_Proba »', pubH)
  await p.keyboard.press('Escape'); await p.waitForTimeout(200)
  await fermerDialogues(p)
  dem = await notes(p, '__demandes')
  ok(dem.every(x => x.actif), `H5) ${dem.length} demande(s) d'accord, toutes dans un geste`, dem)
  // De là vers un niveau rangé : l'ancien dossier (choisi) est retrouvé par le réglage des replays ; il n'est pas retiré (ce n'est pas un dossier de l'outil) ; Publier suit
  await toasts(p)
  await ouvrirFenetre(p)
  await survoler(p, d5)
  w = await fenetre(p)
  ok(w?.ligne === 'Son fichier ira dans « LFB classeurs › 5 › Fractions ». L\'ancien sera retiré une fois le nouveau écrit.', 'H6) Vers « 5eme » : la ligne', w?.ligne)
  await choisirDans(p, d5)
  ok(await attendreToast(p, /« Fractions » déplacé dans « 5eme ».*Son fichier aussi, dans « LFB classeurs › 5 › Fractions »/, 30000), '   … le déplacement')
  const tH2 = await toasts(p)
  contenu = await lister(p, '')
  f = await fiche(p, id)
  ok(tH2.some(t => t.includes('Son fichier aussi, dans « LFB classeurs › 5 › Fractions » (avec 2 fichiers .mem).')) && contenu?.['LFB classeurs']?.['5']?.Fractions?.['Seance 1.mem'] === M1.length && contenu['LFB classeurs']['5'].Fractions['Fractions.memc'] > 0,
    'H7) LFB classeurs/5/Fractions : le .memc et les deux .mem', { tH2, lfb: contenu?.['LFB classeurs']?.['5'] })
  ok(contenu?.['Drive LFB']?.['2_13_Proba'] && Object.keys(contenu['Drive LFB']['2_13_Proba']).length === 0 && JSON.stringify(f.cle?.chemin) === '["LFB classeurs","5","Fractions"]',
    '   … le dossier choisi « 2_13_Proba » est vidé mais reste (il n\'est pas à l\'outil) ; la fiche', { proba: contenu?.['Drive LFB'], f })
  const retenuH2 = await reglage(p, 'replay-dossier:' + id)
  ok(retenuH2 && !retenuH2.poignee, 'H8) Le dossier retenu pour les replays (« 2_13_Proba ») est oublié : le fichier l\'a quitté', retenuH2)
  await p.evaluate(() => window.__app.ui.publication.ouvrir({ complet: true }))
  await p.waitForSelector('.dialogue-publier[open]', { timeout: 10000 })
  const pubH2 = await p.evaluate(() => document.querySelector('.p-chemin')?.textContent ?? null)
  ok(pubH2 === 'LFB classeurs › 5 › Fractions', '   … Publier propose de nouveau le dossier du chapitre : « LFB classeurs › 5 › Fractions »', pubH2)
  await p.keyboard.press('Escape'); await p.waitForTimeout(200)
  await fermerDialogues(p)

  // =====================================================================
  console.log('\n— I. Un classeur sans fichier déplacé vers un niveau rangé reçoit son fichier')
  const [idAngles] = await p.evaluate(() => window.__creer([{ nom: 'Angles', dossier: null }]))
  await voirBibliotheque(p, null)
  await toasts(p)
  await menuCarte(p, idAngles)
  await entreeMenu(p, 'deplacer')
  await p.waitForSelector('dialog.dialogue-deplacer[open]', { timeout: 10000 })
  await survoler(p, d5)
  w = await fenetre(p)
  ok(w?.ligne === 'Il recevra son fichier dans « LFB classeurs › 5 › Angles », écrit tout seul.', 'I1) La ligne : « Il recevra son fichier dans « LFB classeurs › 5 › Angles », écrit tout seul. »', w?.ligne)
  await survoler(p, d3)
  w = await fenetre(p)
  ok(w?.ligne === null, '   … pour « 3eme » (pas rangé) : rien à dire', w?.ligne)
  await choisirDans(p, d5)
  ok(await attendreToast(p, /Son fichier est écrit dans/, 30000), 'I2) Le message')
  const tI = await toasts(p)
  const fI = await fiche(p, idAngles)
  ok(tI.some(t => t.includes('« Angles » déplacé dans « 5eme »') && t.includes('Son fichier est écrit dans « LFB classeurs › 5 › Angles ».')) && (await lister(p, 'LFB classeurs/5/Angles'))?.['Angles.memc'] > 0 && JSON.stringify(fI.cle?.chemin) === '["LFB classeurs","5","Angles"]',
    '   … « Son fichier est écrit dans « LFB classeurs › 5 › Angles ». » ; le fichier, la fiche', { tI, fI })
  dem = await notes(p, '__demandes')
  ok(dem.every(x => x.actif), `I3) ${dem.length} demande(s) d'accord, toutes dans un geste`, dem)
  await ctx.close()
  }

  // =====================================================================
  console.log('\n— J. La version hors ligne (file://)')
  const DIST = join(RACINE_DEPOT, 'dist/index.html')
  if (!seul('J')) { /* pas demandée */ }
  else if (!existsSync(DIST)) ok(false, 'J) dist/index.html manque : npm run build')
  else {
    const ctxJ = await contexte()
    await ctxJ.addInitScript(FAUX_FS)
    await ctxJ.route(/^https?:/, r => r.abort())
    const h = await ctxJ.newPage(); suivre(h, 'J')
    const pretJ = async () => { await h.waitForSelector('button[title^="Importer une image ou un PDF"]', { state: 'attached', timeout: 30000 }); await h.waitForTimeout(800); await fermerDialogues(h) }
    await h.goto(pathToFileURL(DIST).href)
    await pretJ()
    /** Un niveau créé puis rangé chez « LyFEL classeurs › <nom> », et un classeur créé dedans (la page change) */
    const nouveauNiveauEtClasseur = async (niveau, nomDossier, classeur) => {
      await h.evaluate(() => { if (document.querySelector('.bibliotheque').hidden) document.querySelector('.bouton-classeur')?.click() })
      await h.waitForSelector('.biblio-actions [data-action="nouveau-dossier"]', { timeout: 10000 })
      await h.evaluate(() => { const b = document.querySelector('.biblio-fil li button'); b?.click() })
      await h.waitForTimeout(300)
      await h.click('.biblio-actions [data-action="nouveau-dossier"]')
      await h.waitForSelector('dialog.dialogue-dossier[open]')
      await h.fill('dialog[open] input[name="nom"]', niveau)
      await h.click('dialog[open] [data-a="creer"]')
      await h.waitForSelector(`.grille-classeurs.tous li[data-cle^="d:"]:has-text("${niveau}") .dossier-icone`, { timeout: 10000 })
      await h.click(`.grille-classeurs.tous li[data-cle^="d:"]:has-text("${niveau}") .dossier-icone`)
      await h.waitForTimeout(400)
      await h.click('.biblio-nouveau')
      await h.waitForSelector('dialog.dialogue-ranger[open]', { timeout: 10000 })
      const dejaLa = await h.evaluate(() => !!document.querySelector('dialog.dialogue-ranger[open] label.r-etab'))
      if (!dejaLa) {
        await h.evaluate(() => { window.__dossierChoisi = 'LyFEL classeurs' })
        await h.click('dialog[open] .r-choisir-dossier')
        await h.waitForFunction(() => document.querySelector('dialog.dialogue-ranger[open] label.r-etab input:checked'), null, { timeout: 10000 })
      }
      await h.fill('dialog[open] input[name="niveau"]', nomDossier)
      await h.click('dialog[open] .r-ok')
      await h.waitForSelector('dialog.dialogue-nouveau[open]', { timeout: 20000 })
      await h.fill('dialog[open] input[name="nom"]', classeur)
      await Promise.all([h.waitForNavigation({ timeout: 30000 }), h.click('dialog[open] [data-a="creer"]')])
      await pretJ()
      await h.waitForFunction(n => new RegExp('^' + n + ' — ').test(document.title), classeur, { timeout: 15000 }).catch(() => {})
      await h.waitForTimeout(1200)
    }
    await nouveauNiveauEtClasseur('Seconde', '2', 'Suites')
    await nouveauNiveauEtClasseur('Premiere', '1', 'Fonctions')
    let arbre = await h.evaluate(() => Object.keys(window.__fauxArbre()).sort())
    ok(arbre.includes('LyFEL classeurs/2/Suites/Suites.memc') && arbre.includes('LyFEL classeurs/1/Fonctions/Fonctions.memc') && /^Fonctions — /.test(await h.title()),
      'J1) Deux niveaux rangés (LyFEL classeurs › 2, › 1), « Suites » dans le premier (fermé), « Fonctions » dans le second (ouvert)', arbre)
    // Depuis la bibliothèque de « Fonctions » : la carte de « Suites » → « Déplacer vers… » → « Premiere »
    await h.evaluate(() => document.querySelector('.bouton-classeur')?.click())
    await h.waitForSelector('.biblio-actions [data-action="nouveau-dossier"]', { timeout: 10000 })
    await h.evaluate(() => { document.querySelector('.biblio-fil li button')?.click() })
    await h.waitForTimeout(300)
    await h.click('.grille-classeurs.tous li[data-cle^="d:"]:has-text("Seconde") .dossier-icone')
    await h.waitForSelector('.grille-classeurs.tous li:has-text("Suites") .options-classeur', { timeout: 10000 })
    await h.click('.grille-classeurs.tous li:has-text("Suites") .options-classeur')
    await h.waitForTimeout(200)
    await h.click('.menu-flottant:not([hidden]) [data-action="deplacer"]')
    await h.waitForSelector('dialog.dialogue-deplacer[open]', { timeout: 10000 })
    await h.hover('dialog.dialogue-deplacer[open] .vers-dossier:has-text("Premiere")')
    await h.waitForTimeout(100)
    let wJ = await h.evaluate(FENETRE)
    ok(wJ?.titre === 'Déplacer « Suites » vers…' && wJ.ligne === 'Son fichier ira dans « LyFEL classeurs › 1 › Suites ». L\'ancien sera retiré une fois le nouveau écrit.', 'J2) Version hors ligne : la fenêtre, la ligne « Son fichier ira dans « LyFEL classeurs › 1 › Suites »… »', wJ)
    await h.evaluate(() => { window.__toasts.length = 0 })
    await h.click('dialog.dialogue-deplacer[open] .vers-dossier:has-text("Premiere")')
    ok(await attendreToast(h, /« Suites » déplacé dans « Premiere ».*Son fichier aussi/, 30000), 'J3) Le fichier suit')
    const tJ = await h.evaluate(() => window.__toasts.slice())
    arbre = await h.evaluate(() => Object.keys(window.__fauxArbre()).sort())
    ok(tJ.some(t => t.includes('« Suites » déplacé dans « Premiere »') && t.includes('Son fichier aussi, dans « LyFEL classeurs › 1 › Suites ».')) && arbre.includes('LyFEL classeurs/1/Suites/Suites.memc') && !arbre.some(c => c.startsWith('LyFEL classeurs/2/Suites')),
      '   … « Son fichier aussi, dans « LyFEL classeurs › 1 › Suites ». » ; LyFEL classeurs/1/Suites/Suites.memc ; l\'ancien dossier retiré', { tJ, arbre })
    const demJ = await h.evaluate(() => JSON.parse(sessionStorage.getItem('__demandes') || '[]'))
    ok(demJ.every(x => x.actif), `J4) ${demJ.length} demande(s) d'accord, toutes dans un geste`, demJ)
    await ctxJ.close()
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
