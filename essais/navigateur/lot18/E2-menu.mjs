// ESSAI DU LOT 18 (le menu ⋯ réduit) : le menu ⋯ dit une seule chose du
// fichier du classeur, « Autres sauvegardes… » réunit le reste.
// Le serveur de développement (port 5173, ou DEV=…) et la version hors ligne
// (dist/index.html en file:// : `npm run build` d'abord). Les dossiers de
// l'ordinateur sont des dossiers de l'OPFS (showDirectoryPicker,
// showSaveFilePicker simulés, comme lot18/E1-ranger.mjs) ; queryPermission et
// requestPermission rendent « granted » et chaque demande est notée avec
// navigator.userActivation.isActive : aucune hors d'un geste. Sans accents
// dans les noms que l'essai choisit (l'OPFS de Chromium en refuse parfois).
// `node lot18/E2-menu.mjs A` : la suite A à E seule ; `F` ou `G` : cette
// section seule (elles ont chacune leur contexte).
// A. Les trois états du menu ⋯ (les data-action exacts, les aides) : sans
//    fichier à la racine (activer-cle), sans fichier dans un niveau pas rangé
//    (« Ranger « 5eme » dans un dossier… »), le navigateur qui ne sait pas
//    écrire un fichier tout seul (sans showSaveFilePicker) ; plus d'entrée
//    « Copie sur le Drive… », « Enregistrer sur le Drive ou ailleurs… »,
//    « Enregistrer maintenant sur la clé », « Arrêter… ».
// C. « Ranger « 5eme » dans un dossier… » ouvre la fenêtre « Où ranger… » ;
//    rangé, les fichiers sont écrits et la clé de l'onglet repart sur le
//    sien ; le menu passe à l'état (1) : « Enregistrer une copie… »,
//    « Déplacer le classeur… », PDF, « Autres sauvegardes… », Ouvrir.
// B. Ctrl + S écrit dans le fichier (l'OPFS le montre, « Enregistré dans …
//    (… Ko). ») ; « Enregistrer une copie… » propose le dossier du chapitre
//    (startIn vu par le picker simulé) et un nom daté.
// D. Un classeur sans fichier dans un niveau rangé : le bandeau « Ce classeur
//    n'a pas encore son fichier dans « LFB classeurs › 5 ». » [Lui donner son
//    fichier], la ligne et l'entrée du menu ; l'entrée écrit le fichier et
//    la clé démarre (l'état ok, le bouton « Enregistré … ») ; le bouton du
//    bandeau aussi.
// E. « Autres sauvegardes… » : les quatre blocs, « Choisir le compte ou
//    arrêter… » ouvre la fenêtre du Drive, « Enregistrer… » lance le .memb
//    (picker simulé), les niveaux sur le Drive listés avec « Mettre à jour »
//    et « Retirer », « Relier un niveau… » ouvre la fenêtre « Enregistrer »
//    du lot 7 sur le niveau.
// F. La version hors ligne (file://) : le menu (2), « Autres sauvegardes… »
//    avec les blocs grisés et leurs textes.
// G. Le téléphone (390 × 844) : le menu « Plus » a les nouvelles entrées,
//    rien ne déborde de l'écran.
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

// Les textes du menu (src/ui.ts, src/classeurs/cle.ts, autres-sauvegardes.ts)
const AIDE_ENREGISTRER = 'Un fichier .memc avec toutes les pages et tout l\'historique, à garder ou à ouvrir ailleurs. Il garde aussi ce qui a été effacé : ne le donnez pas aux élèves (pour eux : Publier).'
const AIDE_COPIE = 'Un autre fichier .memc, daté, avec toutes les pages et tout l\'historique. Ne le donnez pas aux élèves (pour eux : Publier).'
const AIDE_ACTIVER = 'Un fichier .memc, choisi une fois : le classeur s\'y enregistre tout seul, peu après chaque changement.'
const AIDE_RANGER = 'Dites une fois où vont les classeurs de ce niveau (le Drive du MEM, du LFB, du LyFEL, ou un dossier à part) : chacun y a son fichier, écrit tout seul.'
const AIDE_AUTRES = 'La copie sur le Drive par connexion Google, toute la bibliothèque dans un fichier, récupérer une sauvegarde.'
const AIDE_DEPLACER = 'Dans un autre niveau ou un autre dossier : son fichier suit.'
const ANCIENNES = ['copie-drive', 'enregistrer-ailleurs', 'enregistrer-cle', 'arreter-cle']

// ---------- La page ----------
/** Les permissions (accordées, chaque demande notée avec le geste), les choix
 *  de fichiers et de dossiers dans l'OPFS (showSaveFilePicker note ce qu'on
 *  lui propose : le nom, le dossier de départ), les écritures notées dans
 *  sessionStorage */
const INIT = () => {
  window.__dossierChoisi = null
  const note = (cle, x) => { try { const l = JSON.parse(sessionStorage.getItem(cle) || '[]'); l.push(x); sessionStorage.setItem(cle, JSON.stringify(l)) } catch { /* rien */ } }
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
  window.showSaveFilePicker = async o => {
    note('__choix', { suggestedName: o?.suggestedName ?? null, startIn: o?.startIn?.name ?? null, id: o?.id ?? null, actif: navigator.userActivation.isActive })
    return (await navigator.storage.getDirectory()).getFileHandle(o?.suggestedName || 'x.memc', { create: true })
  }
  window.showDirectoryPicker = async o => {
    const c = window.__dossierChoisi
    window.__dossierChoisi = null
    note('__choixDossier', { id: o?.id, actif: navigator.userActivation.isActive, dossier: c })
    if (!c) throw new DOMException('rien', 'AbortError')
    return racine(c)
  }
}
/** Le navigateur qui ne sait pas écrire un fichier tout seul (iPad, Firefox, Safari) */
const SANS_PICKER = () => {
  Object.defineProperty(window, 'showSaveFilePicker', { value: undefined, configurable: true })
  Object.defineProperty(window, 'showDirectoryPicker', { value: undefined, configurable: true })
}
const ECOUTER_TOASTS = () => {
  window.__toasts = []
  let dernier = ''
  setInterval(() => { const t = [...document.querySelectorAll('.toast')].map(x => x.textContent).join('|').replace(/[\u00a0\u202f]/g, ' '); if (t && t !== dernier) { dernier = t; window.__toasts.push(t) } }, 15)
}
/** Dans la page : des classeurs et des dossiers dans la bibliothèque, le contenu d'un dossier de l'OPFS */
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
  window.__dossier = async (nom, o = {}) => {
    const dem = await import('/src/classeurs/demarrage.ts')
    const d = { id: dem.idClasseur(), nom, parent: o.parent ?? null, couleur: '#3b6fb6', cree: Date.now() }
    await window.__registre.ajouterDossier(d)
    return d.id
  }
  window.__lister = async chemin => {
    const voir = async d => { const o = {}; for await (const [n, h] of d.entries()) o[n] = h.kind === 'directory' ? await voir(h) : (await h.getFile()).size; return o }
    try {
      let d = await navigator.storage.getDirectory()
      for (const n of chemin.split('/').filter(Boolean)) d = await d.getDirectoryHandle(n)
      return voir(d)
    } catch { return null }
  }
}
/** La version hors ligne (file://) n'a pas d'OPFS : un faux système de
 *  fichiers en mémoire (comme lot18/E1-ranger.mjs, en plus court : rien ne
 *  survit au départ vers un autre classeur ici) */
const FAUX_FS = () => {
  const note = (cle, x) => { try { const l = JSON.parse(sessionStorage.getItem(cle) || '[]'); l.push(x); sessionStorage.setItem(cle, JSON.stringify(l)) } catch { /* rien */ } }
  const arbre = {}
  const erreur = (nom, m) => new DOMException(m, nom)
  class Poignee {
    constructor(chemin, kind) { this.name = chemin.split('/').pop(); this.kind = kind; Object.defineProperty(this, '__chemin', { value: chemin, enumerable: false }) }
    async isSameEntry(x) { return !!x && x.__chemin === this.__chemin }
    async queryPermission() { return 'granted' }
    async requestPermission() { note('__demandes', { nom: this.name, actif: navigator.userActivation.isActive }); return 'granted' }
  }
  class Dossier extends Poignee {
    constructor(chemin) { super(chemin, 'directory') }
    async getDirectoryHandle(n, o) {
      const c = this.__chemin + '/' + n, x = arbre[c]
      if (x) { if (x.kind !== 'directory') throw erreur('TypeMismatchError', 'pas un dossier'); return new Dossier(c) }
      if (!o?.create) throw erreur('NotFoundError', 'absent')
      arbre[c] = { kind: 'directory' }
      return new Dossier(c)
    }
    async getFileHandle(n, o) {
      const c = this.__chemin + '/' + n, x = arbre[c]
      if (x) { if (x.kind !== 'file') throw erreur('TypeMismatchError', 'pas un fichier'); return new Fichier(c) }
      if (!o?.create) throw erreur('NotFoundError', 'absent')
      arbre[c] = { kind: 'file', octets: new Uint8Array(0), t: Date.now() }
      return new Fichier(c)
    }
    async removeEntry(n) { const c = this.__chemin + '/' + n; for (const k of Object.keys(arbre)) if (k === c || k.startsWith(c + '/')) delete arbre[k] }
  }
  class Fichier extends Poignee {
    constructor(chemin) { super(chemin, 'file') }
    async getFile() { const x = arbre[this.__chemin]; if (!x) throw erreur('NotFoundError', 'absent'); return new File([x.octets], this.name, { lastModified: x.t }) }
    async createWritable() {
      const chemin = this.__chemin, morceaux = []
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
          arbre[chemin] = { kind: 'file', octets: total, t: Date.now() }
          note('__ecritures', { nom: chemin.split('/').pop(), t: Date.now() })
        },
        abort: async () => {}, truncate: async () => {}, seek: async () => {},
      }
    }
  }
  window.__fauxArbre = () => Object.fromEntries(Object.entries(arbre).map(([k, v]) => [k, v.kind === 'file' ? v.octets.length : 'dossier']))
  window.showSaveFilePicker = async o => {
    note('__choix', { suggestedName: o?.suggestedName ?? null, startIn: o?.startIn?.name ?? null, actif: navigator.userActivation.isActive })
    return new Dossier('').getFileHandle(o?.suggestedName || 'x.memc', { create: true })
  }
  window.showDirectoryPicker = async () => { throw erreur('AbortError', 'rien') }
}

/** Le menu ⋯ ouvert : ses entrées (data-action, sans celles de l'appareil
 *  et des séances), les libellés, le bloc de l'état, son nom accessible */
const MENU = () => {
  const m = [...document.querySelectorAll('.menu-flottant')].find(x => !x.hidden)
  if (!m) return null
  const n = t => (t || '').replace(/[\u00a0\u202f]/g, ' ')
  const r = m.getBoundingClientRect()
  return {
    label: m.getAttribute('aria-label'),
    entrees: [...m.querySelectorAll('.menu-item[data-action]:not([data-action="contraste"]):not([data-action="noms-outils"]):not([data-action="nouvelle-seance"]):not([data-action="renommer-seance"]):not([data-action="seance-precedente"]):not([data-action="retour-aujourdhui"])')].map(e => e.dataset.action),
    toutes: [...m.querySelectorAll('.menu-item[data-action]')].map(e => e.dataset.action),
    libelles: Object.fromEntries([...m.querySelectorAll('.menu-item[data-action]')].map(e => [e.dataset.action, { texte: n(e.querySelector('.libelle')?.firstChild?.textContent), aide: e.querySelector('small') ? n(e.querySelector('small').textContent) : null, touche: n(e.querySelector('.touche')?.textContent) || null, inactif: e.getAttribute('aria-disabled') === 'true' }])),
    lignes: [...m.querySelectorAll('.bloc-lignes li')].map(li => ({ quoi: li.dataset.ligne, texte: n(li.querySelector('.texte-ligne')?.textContent), boutons: [...li.querySelectorAll('button')].map(b => n(b.textContent)) })),
    boite: { gauche: Math.round(r.left), haut: Math.round(r.top), droite: Math.round(r.right), bas: Math.round(r.bottom), fenetre: { l: innerWidth, h: innerHeight }, contenu: m.scrollHeight, place: m.clientHeight },
  }
}
const ETAT = () => {
  const n = t => (t || '').replace(/[\u00a0\u202f]/g, ' ')
  const band = document.querySelector('.bandeau-sauvegarde')
  return {
    cle: window.__surveillance ? { ...window.__surveillance.etat.cle } : null,
    court: n(document.querySelector('.etat-classeur')?.textContent),
    bandeau: !band || band.hidden ? null : { raison: band.dataset.raison, texte: n(band.querySelector('.texte-bandeau')?.textContent), boutons: [...band.querySelectorAll('.bouton-bandeau')].map(x => n(x.textContent)), fermer: !!band.querySelector('.fermer-bandeau') },
    lignes: (window.__surveillance?.texte.lignes ?? []).map(l => `${l.quoi}:${l.niveau}:${n(l.texte)}${l.action ? ':' + l.action : ''}`),
  }
}
const AUTRES = () => {
  const d = document.querySelector('dialog.dialogue-autres[open]')
  if (!d) return null
  const n = t => (t || '').replace(/[\u00a0\u202f]/g, ' ')
  const b = s => { const x = d.querySelector(s); return x ? { texte: n(x.textContent), inactif: x.disabled, cache: x.hidden, title: x.title || null } : null }
  const hors = s => { const x = d.querySelector(s); return x && !x.hidden ? n(x.textContent) : null }
  return {
    titre: n(d.querySelector('h2')?.textContent), h3: [...d.querySelectorAll('h3')].map(x => n(x.textContent)),
    blocs: [...d.querySelectorAll('.as-bloc')].map(x => x.dataset.bloc),
    etatDrive: n(d.querySelector('.as-etat-drive')?.textContent), horsDrive: hors('[data-bloc="drive"] .as-hors'), horsNiveaux: hors('[data-bloc="niveaux"] .as-hors'),
    compte: b('.as-compte'), memb: b('.as-memb'), recuperer: b('.as-recuperer'), relier: b('.as-relier'), fermer: b('.as-fermer'),
    niveaux: [...d.querySelectorAll('.as-niveaux li')].map(li => ({ texte: n(li.querySelector('.texte')?.textContent ?? li.textContent), boutons: [...li.querySelectorAll('button')].map(x => n(x.textContent)), inactifs: [...li.querySelectorAll('button')].map(x => x.disabled) })),
  }
}
const toasts = p => p.evaluate(() => (window.__toasts || []).splice(0))
const attendreToast = (p, re, timeout = 20000) => p.waitForFunction(s => (window.__toasts || []).some(t => new RegExp(s).test(t)), re.source, { timeout }).then(() => true, () => false)
const notes = (p, cle) => p.evaluate(c => JSON.parse(sessionStorage.getItem(c) || '[]'), cle)
const oublier = (p, ...cles) => p.evaluate(cs => { for (const c of cs) sessionStorage.removeItem(c) }, cles)
const lister = (p, chemin) => p.evaluate(c => window.__lister(c), chemin)
const fiche = (p, id) => p.evaluate(async i => { const f = await window.__registre.classeur(i); return f && { nom: f.nom, dossier: f.dossier, cle: f.cle ? { nom: f.cle.nom, chemin: f.cle.chemin ?? null } : null } }, id)
const etat = p => p.evaluate(ETAT)
const autres = p => p.evaluate(AUTRES)
async function menu(p) {
  await p.click('.barre-haut .bouton.points'); await p.waitForTimeout(200)
  return p.evaluate(MENU)
}
async function entree(p, action) {
  await p.click('.barre-haut .bouton.points'); await p.waitForTimeout(150)
  await p.click(`.menu-flottant:not([hidden]) .menu-item[data-action="${action}"]`)
}
const fermerMenu = async p => { await p.keyboard.press('Escape'); await p.waitForTimeout(150) }
const fermerDialogues = async p => { await p.evaluate(() => { for (const d of document.querySelectorAll('dialog[open]')) d.close() }); await p.waitForTimeout(200) }
async function trait(p, x0, y0, n = 8) {
  await p.mouse.move(x0, y0); await p.mouse.down()
  for (let i = 1; i <= n; i++) await p.mouse.move(x0 + i * 12, y0 + Math.sin(i / 2) * 16)
  await p.mouse.up(); await p.waitForTimeout(100)
}
/** Les anciennes entrées n'y sont plus */
const sansAnciennes = m => ANCIENNES.every(a => !m.toutes.includes(a))

// lancerPersistant, et non chromium.launch : voir commun/playwright.mjs (les poignées relues depuis IndexedDB)
const navigateur = await lancerPersistant()
async function contexte(o = {}) {
  const ctx = await navigateur.newContext({ viewport: { width: 1366, height: 768 }, ...o })
  await ctx.addInitScript(INIT)
  await ctx.addInitScript(ECOUTER_TOASTS)
  await ctx.addInitScript(OUTILS)
  return ctx
}
const pret = p => p.waitForFunction(() => window.__surveillance && window.__bibliotheque && document.querySelector('.rang')?.textContent?.includes('/'), null, { timeout: 30000 })
async function ouvrirPage(ctx, nom = 'p', url = DEV) {
  const p = await ctx.newPage(); suivre(p, nom)
  await p.goto(url); await pret(p)
  await p.evaluate(() => Promise.all([window.__cle?.pret, window.__drive?.pret]))
  await p.waitForTimeout(300)
  return p
}
/** Aller à un autre classeur (la page change) */
async function allerA(p, id) {
  await p.goto(DEV + '?classeur=' + id); await pret(p)
  await p.evaluate(() => Promise.all([window.__cle?.pret, window.__drive?.pret]))
  await p.waitForTimeout(400)
}

try {
  if (seul('A')) {
  // =====================================================================
  console.log('\n— A. Les trois états du menu ⋯')
  const ctx = await contexte()
  const p = await ouvrirPage(ctx, 'A')
  let m = await menu(p)
  ok(JSON.stringify(m.entrees) === '["bibliotheque","enregistrer","activer-cle","exporter-pdf","autres-sauvegardes","ouvrir"]' && sansAnciennes(m),
    'A1) Sans fichier, à la racine (état 2) : bibliotheque, enregistrer, activer-cle, exporter-pdf, autres-sauvegardes, ouvrir ; plus d\'anciennes entrées', m.toutes)
  ok(m.libelles.enregistrer?.texte === 'Enregistrer le classeur…' && m.libelles.enregistrer.touche === 'Ctrl + S' && m.libelles.enregistrer.aide === AIDE_ENREGISTRER,
    '   … « Enregistrer le classeur… » Ctrl + S, son aide sans le mot « clé »', m.libelles.enregistrer)
  ok(m.libelles['activer-cle']?.texte === 'Enregistrer automatiquement dans un fichier…' && m.libelles['activer-cle'].aide === AIDE_ACTIVER, '   … « Enregistrer automatiquement dans un fichier… » et son aide', m.libelles['activer-cle'])
  ok(m.libelles['autres-sauvegardes']?.texte === 'Autres sauvegardes…' && m.libelles['autres-sauvegardes'].aide === AIDE_AUTRES && !m.libelles['autres-sauvegardes'].inactif, '   … « Autres sauvegardes… » et son aide', m.libelles['autres-sauvegardes'])
  ok(m.libelles.ouvrir?.touche === 'Ctrl + O' && m.libelles['exporter-pdf']?.texte === 'Exporter le classeur en PDF…', '   … « Ouvrir un classeur… » Ctrl + O, le PDF', m.libelles)
  await fermerMenu(p)
  // Dans un niveau pas rangé
  const d5 = await p.evaluate(() => window.__dossier('5eme'))
  const [idFractions, idSymetrie] = await p.evaluate(d => window.__creer([{ nom: 'Fractions', dossier: d }, { nom: 'Symetrie', dossier: d }]), d5)
  await allerA(p, idFractions)
  await p.waitForFunction(() => window.__surveillance?.etat?.cle?.rangeable, null, { timeout: 10000 }).catch(() => {})
  let e = await etat(p)
  ok(e.cle?.etat === 'absente' && e.cle.rangeable?.niveau === '5eme' && !e.cle.rangeDans && !e.bandeau && e.lignes[0] === 'navigateur:ok:Seulement dans ce navigateur', 'A2) « Fractions » dans « 5eme », pas rangé : l\'état sait le niveau à ranger, sans bandeau', e)
  m = await menu(p)
  ok(JSON.stringify(m.entrees) === '["bibliotheque","enregistrer","ranger-niveau","exporter-pdf","autres-sauvegardes","ouvrir"]' && sansAnciennes(m),
    'A3) Le menu (état 2, niveau à ranger) : enregistrer, ranger-niveau, exporter-pdf, autres-sauvegardes, ouvrir', m.toutes)
  ok(m.libelles['ranger-niveau']?.texte === 'Ranger « 5eme » dans un dossier…' && m.libelles['ranger-niveau'].aide === AIDE_RANGER && !m.libelles['ranger-niveau'].inactif, '   … « Ranger « 5eme » dans un dossier… » et son aide', m.libelles['ranger-niveau'])
  ok(!m.lignes.some(l => l.quoi === 'cle') && m.lignes[0]?.texte === 'Seulement dans ce navigateur', '   … le bloc de l\'état : aucune ligne du fichier, « Seulement dans ce navigateur »', m.lignes)
  await fermerMenu(p)
  // Le navigateur qui ne sait pas écrire un fichier tout seul
  const ctx3 = await navigateur.newContext({ viewport: { width: 1366, height: 768 } })
  await ctx3.addInitScript(SANS_PICKER); await ctx3.addInitScript(ECOUTER_TOASTS)
  const p3 = await ctx3.newPage(); suivre(p3, 'A3')
  await p3.goto(DEV); await pret(p3); await p3.waitForTimeout(500)
  const m3 = await menu(p3)
  ok(JSON.stringify(m3.entrees) === '["bibliotheque","enregistrer","exporter-pdf","autres-sauvegardes","ouvrir"]' && sansAnciennes(m3) && m3.libelles.enregistrer.touche === 'Ctrl + S',
    'A4) Sans showSaveFilePicker (état 3) : enregistrer (Ctrl + S), exporter-pdf, autres-sauvegardes, ouvrir, rien d\'autre', m3.toutes)
  const e3 = await etat(p3)
  ok(e3.cle?.etat === 'impossible' && m3.lignes.some(l => l.quoi === 'cle' && /ne sait pas enregistrer tout seul/.test(l.texte)), '   … la ligne « Ce navigateur ne sait pas enregistrer tout seul dans un fichier… »', m3.lignes)
  await fermerMenu(p3)
  await ctx3.close()

  // =====================================================================
  console.log('\n— C. « Ranger « 5eme » dans un dossier… » depuis le menu ⋯')
  await oublier(p, '__demandes', '__ecritures', '__choixDossier')
  await entree(p, 'ranger-niveau')
  await p.waitForSelector('dialog.dialogue-ranger[open]', { timeout: 10000 })
  const titre = await p.evaluate(() => document.querySelector('dialog.dialogue-ranger[open] h2')?.textContent)
  ok(titre === 'Où ranger les classeurs de « 5eme » ?', 'C1) La fenêtre « Où ranger les classeurs de « 5eme » ? » s\'ouvre', titre)
  await p.evaluate(() => { window.__dossierChoisi = 'LFB classeurs' })
  await p.click('dialog[open] .r-choisir-dossier')
  await p.waitForFunction(() => document.querySelector('dialog.dialogue-ranger[open] label.r-etab input:checked'), null, { timeout: 10000 })
  await p.fill('dialog[open] input[name="niveau"]', '5')
  await toasts(p)
  await p.click('dialog[open] .r-ok')
  ok(await attendreToast(p, /Les classeurs de « 5eme » se rangent dans « LFB classeurs › 5 » : 2 écrits\./, 30000), 'C2) « Les classeurs de « 5eme » se rangent dans « LFB classeurs › 5 » : 2 écrits. »', await toasts(p))
  await p.waitForFunction(() => window.__surveillance?.etat?.cle?.etat === 'ok', null, { timeout: 15000 }).catch(() => {})
  let contenu = await lister(p, 'LFB classeurs')
  ok(contenu?.['5']?.Fractions?.['Fractions.memc'] > 0 && contenu['5'].Symetrie?.['Symetrie.memc'] > 0, 'C3) LFB classeurs/5/Fractions/Fractions.memc et LFB classeurs/5/Symetrie/Symetrie.memc', contenu)
  e = await etat(p)
  ok(e.cle?.etat === 'ok' && e.cle.nom === 'Fractions.memc' && JSON.stringify(e.cle.chemin) === '["LFB classeurs","5","Fractions"]' && e.court === 'Enregistré à l\'instant' && !e.bandeau,
    `C4) La clé de l'onglet repart sur « Fractions.memc » : « ${e.court} »`, e)
  ok(!e.cle?.rangeable && !e.cle?.rangeDans, '   … plus rien à ranger dans l\'état', e.cle)
  let dem = await notes(p, '__demandes')
  ok(dem.every(x => x.actif), `C5) ${dem.length} demande(s) d'accord, toutes dans un geste`, dem)
  m = await menu(p)
  ok(JSON.stringify(m.entrees) === '["bibliotheque","enregistrer","deplacer-classeur","exporter-pdf","autres-sauvegardes","ouvrir"]' && sansAnciennes(m),
    'C6) Le menu (état 1) : enregistrer, deplacer-classeur, exporter-pdf, autres-sauvegardes, ouvrir', m.toutes)
  ok(m.libelles.enregistrer?.texte === 'Enregistrer une copie…' && m.libelles.enregistrer.touche === null && m.libelles.enregistrer.aide === AIDE_COPIE, '   … « Enregistrer une copie… », sans raccourci (Ctrl + S écrit dans le fichier), son aide', m.libelles.enregistrer)
  const deplaceur = await p.evaluate(() => !!window.__app.ui.deplacerClasseur)
  ok(m.libelles['deplacer-classeur']?.texte === 'Déplacer le classeur…' && m.libelles['deplacer-classeur'].aide === AIDE_DEPLACER && m.libelles['deplacer-classeur'].inactif === !deplaceur,
    `   … « Déplacer le classeur… » et son aide${deplaceur ? '' : ' (grisé : le morceau C2 n\'est pas branché)'}`, m.libelles['deplacer-classeur'])
  ok(m.lignes[0]?.quoi === 'cle' && /^Enregistré dans LFB classeurs › 5 › Fractions \(Fractions\.memc\) : /.test(m.lignes[0].texte), '   … le bloc : « Enregistré dans LFB classeurs › 5 › Fractions (Fractions.memc) : … » en premier', m.lignes)
  await fermerMenu(p)

  // =====================================================================
  console.log('\n— B. Ctrl + S écrit dans le fichier ; « Enregistrer une copie… » propose le dossier du chapitre')
  await oublier(p, '__ecritures', '__choix')
  await trait(p, 400, 300)
  await toasts(p)
  await p.keyboard.press('Control+s')
  ok(await attendreToast(p, /^Enregistré dans LFB classeurs › 5 › Fractions \(Fractions\.memc\) \([\d,]+ [kKM]o\)\.$/, 15000), 'B1) Ctrl + S : « Enregistré dans LFB classeurs › 5 › Fractions (Fractions.memc) (… Ko). »', await toasts(p))
  let ecr = await notes(p, '__ecritures')
  ok(ecr.some(x => x.nom === 'Fractions.memc') && (await notes(p, '__choix')).length === 0, '   … le fichier « Fractions.memc » est écrit, sans fenêtre du navigateur', ecr)
  await toasts(p)
  await entree(p, 'enregistrer')
  ok(await attendreToast(p, /^Classeur enregistré : Fractions \d{4}-\d{2}-\d{2} \d\dh\d\d\.memc/, 15000), 'B2) « Enregistrer une copie… » : « Classeur enregistré : Fractions <date>.memc (…) »', await toasts(p))
  const choix = await notes(p, '__choix')
  ok(choix.length === 1 && choix[0].startIn === 'Fractions' && /^Fractions \d{4}-\d{2}-\d{2} \d\dh\d\d\.memc$/.test(choix[0].suggestedName) && choix[0].actif,
    `   … la fenêtre du navigateur s'ouvre dans le dossier du chapitre (startIn « ${choix[0]?.startIn} »), le nom daté, dans le geste`, choix)
  e = await etat(p)
  ok(e.cle?.etat === 'ok' && e.cle.nom === 'Fractions.memc', '   … la clé reste sur « Fractions.memc »', e.cle)

  // =====================================================================
  console.log('\n— D. Un classeur sans fichier dans un niveau rangé : « Lui donner son fichier »')
  const [idThales, idPythagore] = await p.evaluate(d => window.__creer([{ nom: 'Thales', dossier: d }, { nom: 'Pythagore', dossier: d }]), d5)
  await allerA(p, idThales)
  await p.waitForFunction(() => window.__surveillance?.etat?.cle?.rangeDans, null, { timeout: 10000 }).catch(() => {})
  e = await etat(p)
  ok(e.cle?.etat === 'absente' && e.cle.rangeDans === 'LFB classeurs › 5' && !e.cle.rangeable, 'D1) « Thales » (sans fichier) dans « 5eme » rangé : l\'état sait où irait son fichier (« LFB classeurs › 5 »)', e.cle)
  ok(e.bandeau?.raison === 'cle-a-donner' && e.bandeau.texte === 'Ce classeur n\'a pas encore son fichier dans « LFB classeurs › 5 ».' && JSON.stringify(e.bandeau.boutons) === '["Lui donner son fichier"]' && e.bandeau.fermer,
    'D2) Le bandeau « Ce classeur n\'a pas encore son fichier dans « LFB classeurs › 5 ». » [Lui donner son fichier], avec ×', e.bandeau)
  ok(e.lignes.includes('cle:info:Pas encore de fichier dans « LFB classeurs › 5 »:donner-fichier'), '   … la ligne « Pas encore de fichier dans « LFB classeurs › 5 » » dans l\'état', e.lignes)
  m = await menu(p)
  ok(JSON.stringify(m.entrees) === '["bibliotheque","enregistrer","donner-fichier","exporter-pdf","autres-sauvegardes","ouvrir"]', 'D3) Le menu (état 2, niveau rangé) : enregistrer, donner-fichier, exporter-pdf, autres-sauvegardes, ouvrir', m.toutes)
  ok(m.libelles['donner-fichier']?.texte === 'Lui donner son fichier' && m.libelles['donner-fichier'].aide === 'Son fichier ira dans « LFB classeurs › 5 › Thales », écrit tout seul.', '   … « Lui donner son fichier » : « Son fichier ira dans « LFB classeurs › 5 › Thales », écrit tout seul. »', m.libelles['donner-fichier'])
  ok(m.lignes.some(l => l.quoi === 'cle' && l.texte === 'Pas encore de fichier dans « LFB classeurs › 5 »' && l.boutons.length === 0), '   … dans le bloc, la ligne sans bouton (l\'entrée est juste dessous)', m.lignes)
  await fermerMenu(p)
  await oublier(p, '__demandes', '__ecritures')
  await toasts(p)
  await entree(p, 'donner-fichier')
  await p.waitForFunction(() => window.__surveillance?.etat?.cle?.etat === 'ok', null, { timeout: 15000 }).catch(() => {})
  await p.waitForTimeout(300)
  contenu = await lister(p, 'LFB classeurs/5/Thales')
  ok(contenu?.['Thales.memc'] > 0, 'D4) Le fichier LFB classeurs/5/Thales/Thales.memc est écrit', contenu)
  const fT = await fiche(p, idThales)
  ok(JSON.stringify(fT?.cle) === JSON.stringify({ nom: 'Thales.memc', chemin: ['LFB classeurs', '5', 'Thales'] }), '   … la fiche : le fichier et son chemin', fT)
  e = await etat(p)
  ok(e.cle?.etat === 'ok' && e.cle.nom === 'Thales.memc' && e.court === 'Enregistré à l\'instant' && !e.bandeau && !e.cle.rangeDans,
    `D5) La clé démarre : l'état ok, le bouton « ${e.court} », plus de bandeau`, e)
  const tD = await toasts(p)
  ok(tD.some(t => t === '« Thales » s\'enregistre maintenant tout seul dans LFB classeurs › 5 › Thales (Thales.memc).'), 'D6) « « Thales » s\'enregistre maintenant tout seul dans LFB classeurs › 5 › Thales (Thales.memc). »', tD)
  dem = await notes(p, '__demandes')
  ok(dem.every(x => x.actif), `   … ${dem.length} demande(s) d'accord, toutes dans un geste`, dem)
  m = await menu(p)
  ok(m.entrees[1] === 'enregistrer' && m.entrees[2] === 'deplacer-classeur' && m.libelles.enregistrer.texte === 'Enregistrer une copie…', 'D7) Le menu passe à l\'état 1', m.toutes)
  await fermerMenu(p)
  // Par le bouton du bandeau
  await allerA(p, idPythagore)
  await p.waitForFunction(() => !document.querySelector('.bandeau-sauvegarde').hidden && document.querySelector('.bandeau-sauvegarde').dataset.raison === 'cle-a-donner', null, { timeout: 10000 }).catch(() => {})
  await oublier(p, '__demandes')
  await p.click('.bandeau-sauvegarde .bouton-bandeau[data-etat-action="donner-fichier"]')
  await p.waitForFunction(() => window.__surveillance?.etat?.cle?.etat === 'ok', null, { timeout: 15000 }).catch(() => {})
  e = await etat(p)
  contenu = await lister(p, 'LFB classeurs/5/Pythagore')
  dem = await notes(p, '__demandes')
  ok(contenu?.['Pythagore.memc'] > 0 && e.cle?.etat === 'ok' && e.cle.nom === 'Pythagore.memc' && !e.bandeau && dem.every(x => x.actif), 'D8) Le bouton du bandeau fait la même chose pour « Pythagore »', { contenu, e, dem })

  // =====================================================================
  console.log('\n— E. « Autres sauvegardes… »')
  await entree(p, 'autres-sauvegardes')
  await p.waitForSelector('dialog.dialogue-autres[open]', { timeout: 10000 })
  let a = await autres(p)
  ok(a?.titre === 'Autres sauvegardes' && JSON.stringify(a.h3) === JSON.stringify(['Copie sur le Drive (connexion Google)', 'Toute la bibliothèque dans un fichier', 'Retrouver une copie', 'Un niveau sur le Drive par connexion']) && JSON.stringify(a.blocs) === '["drive","bibliotheque","recuperer","niveaux"]',
    'E1) La fenêtre « Autres sauvegardes » : ses quatre blocs', a)
  ok(/^(Sur le Drive|Pas de copie sur le Drive)/.test(a?.etatDrive ?? '') && a.compte?.texte === 'Choisir le compte ou arrêter…' && !a.compte.inactif && !a.horsDrive,
    `   … la ligne du Drive (« ${a?.etatDrive} ») et « Choisir le compte ou arrêter… »`, a)
  ok(a?.memb?.texte === 'Enregistrer…' && !a.memb.inactif && a.recuperer?.texte === 'Récupérer une sauvegarde du Drive…' && !a.recuperer.inactif && a.relier?.texte === 'Relier un niveau…' && !a.relier.inactif && a.fermer?.texte === 'Fermer',
    '   … « Enregistrer… » (.memb), « Récupérer une sauvegarde du Drive… », « Relier un niveau… », « Fermer »', a)
  ok(a?.niveaux.length === 1 && /^Aucun niveau n'est relié au Drive par connexion\./.test(a.niveaux[0].texte), '   … aucun niveau sur le Drive pour l\'instant', a?.niveaux)
  await p.click('dialog.dialogue-autres[open] .as-compte')
  await p.waitForSelector('dialog.dialogue-drive[open]', { timeout: 10000 })
  const fenDrive = await p.evaluate(() => ({ titre: document.querySelector('dialog.dialogue-drive[open] h2')?.textContent, autres: !!document.querySelector('dialog.dialogue-autres') }))
  ok(fenDrive.titre === 'Copie sur le Drive' && !fenDrive.autres, 'E2) « Choisir le compte ou arrêter… » ouvre la fenêtre « Copie sur le Drive » (« Autres sauvegardes » refermée)', fenDrive)
  await fermerDialogues(p)
  // Le .memb
  await oublier(p, '__choix', '__ecritures')
  await toasts(p)
  await entree(p, 'autres-sauvegardes')
  await p.waitForSelector('dialog.dialogue-autres[open]')
  await p.click('dialog.dialogue-autres[open] .as-memb')
  ok(await p.waitForFunction(() => JSON.parse(sessionStorage.getItem('__ecritures') || '[]').some(x => /\.memb$/.test(x.nom)), null, { timeout: 30000 }).then(() => true, () => false), 'E3) « Enregistrer… » : le fichier .memb est écrit')
  const choixMemb = await notes(p, '__choix')
  ok(choixMemb.length === 1 && /\.memb$/.test(choixMemb[0].suggestedName) && choixMemb[0].actif && !(await p.evaluate(() => !!document.querySelector('dialog[open]'))), `   … le choix du fichier dans le geste (« ${choixMemb[0]?.suggestedName} »), la fenêtre refermée`, choixMemb)
  // Un niveau sur le Drive par connexion (un emplacement 'drive', comme le lot 7 l'écrit)
  await p.evaluate(async d => {
    const { garderEmplacement } = await import('/src/classeurs/emplacements.ts')
    await garderEmplacement(window.__registre, { id: 'ab12cd34ef567890', genre: 'drive', dossier: d, nom: '5eme', compte: 'mem', cree: Date.now() })
  }, d5)
  await entree(p, 'autres-sauvegardes')
  await p.waitForSelector('dialog.dialogue-autres[open]')
  a = await autres(p)
  ok(a?.niveaux.length === 1 && a.niveaux[0].texte === '« 5eme » → Drive personnel › MEM - Classeurs › 5eme' && JSON.stringify(a.niveaux[0].boutons) === '["Mettre à jour","Retirer"]' && !a.niveaux[0].inactifs[0],
    'E4) Le niveau sur le Drive : « « 5eme » → Drive personnel › MEM - Classeurs › 5eme » [Mettre à jour] [Retirer]', a?.niveaux)
  await p.click('dialog.dialogue-autres[open] .as-relier')
  await p.waitForSelector('dialog.dialogue-enregistrer-ailleurs[open]', { timeout: 10000 })
  const relier = await p.evaluate(() => ({ classe: document.querySelector('dialog[open] input[name=e-quoi][value=classe]')?.checked ?? null, autres: !!document.querySelector('dialog.dialogue-autres') }))
  ok(relier.classe === true && !relier.autres, 'E5) « Relier un niveau… » ouvre la fenêtre « Enregistrer » du lot 7 sur « Le dossier du niveau »', relier)
  await fermerDialogues(p)
  await toasts(p)
  await entree(p, 'autres-sauvegardes')
  await p.waitForSelector('dialog.dialogue-autres[open]')
  await p.click('dialog.dialogue-autres[open] .as-niveaux .as-retirer')
  await p.waitForFunction(() => /Aucun niveau/.test(document.querySelector('dialog.dialogue-autres[open] .as-niveaux')?.textContent ?? ''), null, { timeout: 10000 }).catch(() => {})
  a = await autres(p)
  const tE = await toasts(p)
  ok(a?.niveaux.length === 1 && /^Aucun niveau/.test(a.niveaux[0].texte) && tE.some(t => /« 5eme » n'est plus relié au Drive/.test(t)) && (await p.evaluate(async () => (await window.__registre.reglage('emplacements')).length)) === 1,
    'E6) « Retirer » : le niveau quitte la liste (la fenêtre reste), le message ; l\'emplacement du dossier de l\'ordinateur reste', { a: a?.niveaux, tE })
  await p.click('dialog.dialogue-autres[open] .as-fermer')
  ok(!(await p.evaluate(() => !!document.querySelector('dialog[open]'))), '   … « Fermer »')
  await ctx.close()
  }

  // =====================================================================
  if (seul('F')) {
  console.log('\n— F. La version hors ligne (file://)')
  const dist = join(RACINE_DEPOT, 'dist/index.html')
  if (!existsSync(dist)) { ok(false, 'F) dist/index.html manque : `npm run build` d\'abord') } else {
    const ctx = await navigateur.newContext({ viewport: { width: 1366, height: 768 } })
    await ctx.addInitScript(FAUX_FS); await ctx.addInitScript(ECOUTER_TOASTS)
    const f = await ctx.newPage(); suivre(f, 'F')
    const versGoogle = []
    ctx.on('request', r => { if (/accounts\.google\.com|www\.googleapis\.com|script\.google\.com/.test(r.url())) versGoogle.push(r.url()) })
    await ctx.route(/^https?:/, r => r.abort())
    await f.goto(pathToFileURL(dist).href)
    // (pas de __surveillance dans la version construite : on attend la barre)
    await f.waitForSelector('button[title^="Importer une image ou un PDF"]', { state: 'attached', timeout: 30000 })
    await f.waitForTimeout(800)
    await fermerDialogues(f)
    const m = await menu(f)
    ok(JSON.stringify(m.entrees) === '["bibliotheque","enregistrer","activer-cle","exporter-pdf","autres-sauvegardes","ouvrir"]' && sansAnciennes(m) && !m.libelles['autres-sauvegardes'].inactif,
      'F1) file:// : le menu (état 2) : enregistrer, activer-cle, exporter-pdf, autres-sauvegardes, ouvrir', m.toutes)
    await fermerMenu(f)
    await entree(f, 'autres-sauvegardes')
    await f.waitForSelector('dialog.dialogue-autres[open]', { timeout: 10000 })
    const a = await autres(f)
    ok(a?.horsDrive === 'Le Drive marche seulement depuis la version en ligne (mathsetmoi.github.io).' && a.compte?.inactif && a.compte.title === 'Seulement depuis la version en ligne (mathsetmoi.github.io).',
      'F2) Le bloc du Drive : « Le Drive marche seulement depuis la version en ligne (mathsetmoi.github.io). », le bouton grisé', a)
    ok(/seulement depuis la version en ligne/.test(a?.etatDrive ?? ''), `   … sa ligne d'état : « ${a?.etatDrive} »`, a?.etatDrive)
    ok(a?.recuperer?.inactif && a.horsNiveaux === 'Seulement depuis la version en ligne.' && a.relier?.inactif && !a.memb?.inactif,
      'F3) « Récupérer… » grisé ; les niveaux : « Seulement depuis la version en ligne. », « Relier un niveau… » grisé ; le .memb reste possible', a)
    await f.click('dialog.dialogue-autres[open] .as-fermer')
    ok(versGoogle.length === 0, 'F4) Aucune requête vers Google', versGoogle)
    await ctx.close()
  }
  }

  // =====================================================================
  if (seul('G')) {
  console.log('\n— G. Le téléphone (390 × 844) : le menu « Plus »')
  const ctx = await navigateur.newContext({ viewport: { width: 390, height: 844 }, screen: { width: 390, height: 844 }, hasTouch: true, isMobile: true, deviceScaleFactor: 2 })
  await ctx.addInitScript(INIT); await ctx.addInitScript(ECOUTER_TOASTS)
  const t = await ctx.newPage(); suivre(t, 'G')
  await t.goto(DEV); await pret(t)
  await t.evaluate(() => Promise.all([window.__cle?.pret, window.__drive?.pret]))
  await t.waitForTimeout(500)
  await t.evaluate(() => window.__app.ui.boutonFichier.click()); await t.waitForTimeout(400)
  const m = await t.evaluate(MENU)
  const ordre = ['enregistrer', 'activer-cle', 'exporter-pdf', 'autres-sauvegardes', 'ouvrir'].map(a => m?.entrees.indexOf(a) ?? -1)
  ok(m?.label === 'Plus' && ordre.every((x, i) => x >= 0 && (i === 0 || x > ordre[i - 1])) && sansAnciennes(m),
    'G1) « Plus » a enregistrer, activer-cle, exporter-pdf, autres-sauvegardes, ouvrir, dans cet ordre, sans les anciennes entrées', m?.entrees)
  ok(m && m.boite.gauche >= 0 && m.boite.haut >= 0 && m.boite.droite <= m.boite.fenetre.l && m.boite.bas <= m.boite.fenetre.h,
    `G2) Rien ne déborde de l'écran (${m?.boite.contenu} px de contenu pour ${m?.boite.place} px de place : il défile)`, m?.boite)
  await t.keyboard.press('Escape'); await t.waitForTimeout(200)
  await t.tap('.barre-haut .bouton.points'); await t.waitForTimeout(300)
  await t.tap('.menu-flottant:not([hidden]) .menu-item[data-action="autres-sauvegardes"]')
  await t.waitForSelector('dialog.dialogue-autres[open]', { timeout: 10000 })
  const deb = await t.evaluate(() => { const r = document.querySelector('dialog.dialogue-autres[open]').getBoundingClientRect(); return { l: Math.round(r.left), t: Math.round(r.top), r: Math.round(r.right), b: Math.round(r.bottom), w: innerWidth, h: innerHeight } })
  ok(deb.l >= 0 && deb.t >= 0 && deb.r <= deb.w && deb.b <= deb.h, 'G3) « Autres sauvegardes » tient dans l\'écran du téléphone', deb)
  await ctx.close()
  }
} catch (e) {
  echecs++
  console.log('✗ ÉCHEC (exception)', e?.stack ?? e)
} finally {
  await navigateur.close().catch(() => {})
}
if (erreurs.length) { echecs++; console.log('✗ ÉCHEC erreurs JS :', erreurs) }
console.log(echecs ? `\n${echecs} échec(s)` : '\nTout passe.')
process.exit(echecs ? 1 : 0)
