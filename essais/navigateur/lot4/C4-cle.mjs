// ESSAI DU MORCEAU C4-cle (lot 4) : l'enregistrement automatique dans un
// fichier de la clé (Chrome, Edge, aussi en file://), avec ses garde-fous.
// Sans fenêtre : showSaveFilePicker et showOpenFilePicker rendent des
// poignées de l'OPFS (navigator.storage.getDirectory()) ; queryPermission
// lit window.__permission ; requestPermission ne rend « granted » que si
// navigator.userActivation.isActive (un vrai geste) ; createWritable est
// enveloppé (pannes simulées, heures notées).
// A. Le serveur de développement, horloge simulée (page.clock) : l'entrée du
//    menu, l'activation et sa première écriture ; l'écriture 20 s après le
//    dernier changement, au plus tard 2 min après le premier, jamais
//    pendant un trait de 30 s ; Ctrl + S aussitôt sur la clé ; « une copie » ;
//    les échecs (clé retirée, pleine, lecture seule) : rien n'est perdu, le
//    fichier intact, les réessais à 30 s, 1 min, 2 min, 5 min, la reprise ;
//    les garde-fous (un autre classeur, un fichier modifié ailleurs,
//    « Remplacer quand même », « Choisir un autre fichier… ») ; les refus à
//    l'activation ; le rechargement (accord gardé ; « prompt » : le bandeau,
//    aucun requestPermission sans geste, le clic, Ctrl + S) ; Arrêter.
// R. « Remplacer » prend l'identité du fichier, et la case « Enregistrer
//    automatiquement les changements dans ce fichier » ; un .memc d'avant le
//    lot 4 (sans id) ; un fichier dont l'id est pris ; l'accord refusé.
// O. Ouvrir par showOpenFilePicker : AbortError (rien), une autre erreur
//    (le choix de fichier d'avant), un fichier illisible.
// D. Deux onglets sur un classeur : un seul écrit, l'autre annonce ses
//    changements et prend la suite ; deux classeurs, deux fichiers ; un
//    fichier déjà pris.
// G. 60 pages (18 Mo) : l'écriture automatique sans tâche longue ; ouvrir le
//    fichier de 18 Mo sans tâche longue.
// (B. L'histoire perdue, avec la version d'avant : retirée, voir plus bas.)
// F. La version d'un seul fichier (dist/index.html) en file:// : une
//    poignée factice en mémoire ; l'entrée, l'écriture par le travailleur,
//    DataCloneError rattrapé, Web Locks.
// N. Firefox, l'iPad (pas de showSaveFilePicker) : pas d'entrée, « impossible ».
import { RACINE_ESSAIS, RACINE_DEPOT } from '../commun/racines.mjs'
import { lancerPersistant } from '../commun/playwright.mjs'
import * as Y from 'yjs'
import { mkdirSync, mkdtempSync, rmSync, symlinkSync, unlinkSync, writeFileSync } from 'node:fs'
import { spawn } from 'node:child_process'
import { gunzipSync, gzipSync } from 'node:zlib'

const S = `${RACINE_ESSAIS}`
const R = `${RACINE_DEPOT}`
const ICI = S + '/lot4/C4/'
const SITE = ICI + 'site/'
const DEV = 'http://localhost:5173/'
mkdirSync(ICI, { recursive: true })

let echecs = 0
const ok = (c, m, detail) => { if (!c) echecs++; console.log(c ? '✓' : '✗ ÉCHEC', m, !c && detail !== undefined ? '— ' + JSON.stringify(detail).slice(0, 1500) : '') }
const dort = ms => new Promise(r => setTimeout(r, ms))
const norm = t => (t || '').replace(/[\u00a0\u202f]/g, ' ')
const seul = (section) => process.argv.length <= 2 || process.argv.slice(2).includes(section)

const erreurs = []
const suivre = (p, nom) => {
  p.on('pageerror', e => erreurs.push(`${nom}: ${e.message}`))
  p.on('console', m => { if (m.type() === 'error' && !/Failed to load resource|ERR_CERT|net::/.test(m.text())) erreurs.push(`${nom}: ${m.text()}`) })
}
const pret = async p => {
  await p.waitForFunction(() => window.__surveillance && 'cle' in window.__app.ui && document.querySelector('.rang')?.textContent?.includes('/'), null, { timeout: 30000 })
  await p.evaluate(() => window.__cle?.pret)
}
async function ecrire(p, x0, y0, n = 10) {
  await p.mouse.move(x0, y0); await p.mouse.down()
  for (let i = 1; i <= n; i++) await p.mouse.move(x0 + i * 10, y0 + Math.sin(i / 2) * 16)
  await p.mouse.up(); await p.waitForTimeout(80)
}

/** Les poignées de l'OPFS, les permissions simulées, les écritures notées */
const INIT = () => {
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
  const H = window.FileSystemHandle?.prototype
  if (!H) return
  H.queryPermission = async function () { window.__appels.push({ quoi: 'query', actif: navigator.userActivation.isActive }); return window.__permission }
  H.requestPermission = async function () {
    const actif = navigator.userActivation.isActive
    const r = window.__refus ? 'denied' : actif ? 'granted' : window.__permission
    window.__appels.push({ quoi: 'request', actif, rendu: r })
    // Gardé le temps d'un rechargement (« Remplacer » recharge la page)
    try { const l = JSON.parse(sessionStorage.getItem('__requetes') || '[]'); l.push({ actif, rendu: r }); sessionStorage.setItem('__requetes', JSON.stringify(l)) } catch { /* rien */ }
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
    return {
      write: async d => {
        if (window.__panne === 'QuotaExceededError') { e.echec = 'QuotaExceededError'; throw new DOMException('plus de place', 'QuotaExceededError') }
        e.taille = d.size
        return w.write(d)
      },
      close: async () => { await w.close(); e.fin = Date.now() },
      abort: async r => { e.abandon = true; return w.abort(r) },
    }
  }
  window.showSaveFilePicker = async o => {
    const dir = await navigator.storage.getDirectory()
    const nom = window.__nomChoisi || o?.suggestedName || 'sans-nom.memc'
    window.__choix.push({ quoi: 'save', nom, o: JSON.parse(JSON.stringify(o ?? {})), actif: navigator.userActivation.isActive })
    return dir.getFileHandle(nom, { create: true })
  }
  window.showOpenFilePicker = async o => {
    const dir = await navigator.storage.getDirectory()
    window.__choix.push({ quoi: 'open', nom: window.__aOuvrir, o: JSON.parse(JSON.stringify(o ?? {})) })
    if (window.__ouvrirPanne) throw new DOMException('simulé', window.__ouvrirPanne)
    return [await dir.getFileHandle(window.__aOuvrir)]
  }
}
// Lot 4 (C9) : « Ouvrir un classeur » AJOUTE d'abord le classeur d'un fichier à la bibliothèque
// (une première fenêtre : [Annuler] [Remplacer « … »…] [Ajouter à la bibliothèque]). Ces essais
// remplacent celui qui est ouvert : on y choisit « Remplacer « … »… », et la question du lot 1,
// celle qu'ils vérifient, suit (adaptation de C9 : un comportement changé volontairement)
const AUTO_REMPLACER = () => { new MutationObserver(() => { const b = document.querySelector('dialog[open] [data-a="remplacer-ouvert"]'); if (b) b.click() }).observe(document, { childList: true, subtree: true }) }
const ECOUTER_TOASTS = () => {
  window.__toasts = []
  let dernier = ''
  setInterval(() => { const t = (document.querySelector('.toast')?.textContent || '').replace(/[\u00a0\u202f]/g, ' '); if (t && t !== dernier) { dernier = t; window.__toasts.push(t) } }, 15)
}
const toasts = p => p.evaluate(() => window.__toasts.splice(0))

/** Ce que montrent la clé, le bouton, le bandeau */
const ETAT = () => {
  const band = document.querySelector('.bandeau-sauvegarde')
  return {
    cle: window.__cle ? { ...window.__cle.etat, ...(window.__cle.etat.message ? { message: window.__cle.etat.message.replace(/[\u00a0\u202f]/g, ' ') } : {}) } : null,
    court: (document.querySelector('.etat-classeur')?.textContent || '').replace(/[\u00a0\u202f]/g, ' '),
    bandeau: band.hidden ? null : {
      raison: band.dataset.raison,
      texte: (band.querySelector('.texte-bandeau')?.textContent || '').replace(/[\u00a0\u202f]/g, ' '),
      boutons: [...band.querySelectorAll('.bouton-bandeau')].map(x => x.textContent), fermer: !!band.querySelector('.fermer-bandeau'),
    },
    lignes: (window.__surveillance?.texte.lignes ?? []).filter(l => l.quoi === 'cle').map(l => (l.texte || '').replace(/[\u00a0\u202f]/g, ' ')),
  }
}
const etat = p => p.evaluate(ETAT)
/** Les entrées du menu ⋯ (data-action), et le bloc de l'état */
async function menu(p) {
  await p.click('.barre-haut .bouton.points'); await p.waitForTimeout(150)
  const m = await p.evaluate(() => {
    const m = [...document.querySelectorAll('.menu-flottant')].find(x => !x.hidden)
    return {
      // (Adapté au lot 5, morceau K9 : « Cet appareil » et ses deux cases entrent volontairement au bout du menu ⋯ ; lot5/K9-affichage.mjs les vérifie)
      entrees: [...m.querySelectorAll('.menu-item:not([data-action="contraste"]):not([data-action="noms-outils"]):not([data-action="nouvelle-seance"]):not([data-action="renommer-seance"]):not([data-action="seance-precedente"]):not([data-action="retour-aujourdhui"])')].map(e => e.dataset.action ?? ('etat:' + e.dataset.etatAction)),
      libelles: Object.fromEntries([...m.querySelectorAll('.menu-item[data-action]')].map(e => [e.dataset.action, { texte: e.querySelector('.libelle')?.firstChild?.textContent, aide: e.querySelector('small')?.textContent ?? null, touche: e.querySelector('.touche')?.textContent ?? null }])),
      cle: [...m.querySelectorAll('.bloc-lignes li[data-ligne="cle"]')].map(li => ({ texte: (li.querySelector('.texte-ligne')?.textContent || '').replace(/[\u00a0\u202f]/g, ' '), boutons: [...li.querySelectorAll('button')].map(b => b.textContent) })),
    }
  })
  return m
}
async function entree(p, action) {
  await p.click('.barre-haut .bouton.points'); await p.waitForTimeout(120)
  await p.click(`.menu-flottant:not([hidden]) .menu-item[data-action="${action}"]`)
}
const fermerMenu = p => p.keyboard.press('Escape')
const DIALOGUES = () => [...document.querySelectorAll('dialog[open]')].map(d => ({
  titre: d.querySelector('h2')?.textContent, texte: (d.querySelector('p')?.textContent || '').replace(/[\u00a0\u202f]/g, ' '),
  boutons: [...d.querySelectorAll('.actions button')].map(b => b.textContent),
  case: d.querySelector('.case-cle input') ? { coche: d.querySelector('.case-cle input').checked, texte: d.querySelector('.case-cle span').textContent } : null,
}))
const dialogues = p => p.evaluate(DIALOGUES)

/** L'OPFS : lire, écrire (sans passer par l'enveloppe), effacer */
const opfsLire = async (p, nom) => {
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
const opfsEcrire = (p, nom, octets) => p.evaluate(async ({ nom, b64 }) => {
  const h = await (await navigator.storage.getDirectory()).getFileHandle(nom, { create: true })
  const w = await window.__cwOrig.call(h)
  await w.write(Uint8Array.from(atob(b64), c => c.charCodeAt(0)))
  await w.close()
}, { nom, b64: Buffer.from(octets).toString('base64') })

/** Un .memc lu sous Node */
function lireMemc(o) {
  const fin = o.indexOf(0x0a)
  const entete = JSON.parse(o.subarray(0, fin).toString('utf8'))
  const d = new Y.Doc({ gc: false })
  Y.applyUpdate(d, new Uint8Array(gunzipSync(o.subarray(fin + 1))))
  const ordre = d.getArray('ordre').toArray()
  const ids = ordre.flatMap(id => [...(d.getMap('pages').get(id)?.get('formes')?.keys() ?? [])])
  return { entete, ids, pages: ordre.length, entier: !d.store.pendingStructs && !d.store.pendingDs, vecteur: [...Y.encodeStateVector(d)], doc: d }
}
/** Un .memc fait sous Node : l'en-tête, puis l'état (gzip) */
function faireMemc(etat, entete) {
  const tete = Buffer.from(JSON.stringify({ format: 'mem-tableau', v: 1, app: 'MEM teachingtool', ...entete }) + '\n')
  return Buffer.concat([tete, gzipSync(Buffer.from(etat))])
}
/** Un classeur d'essai : n pages, k traits par page */
function unClasseur(n = 1, k = 1, prefixe = 'X') {
  const d = new Y.Doc({ gc: false })
  const ordre = []
  for (let i = 0; i < n; i++) {
    const p = new Y.Map(); p.set('fond', 'carreaux')
    const f = new Y.Map()
    for (let j = 0; j < k; j++) f.set(`${prefixe}${i}-${j}`, { id: `${prefixe}${i}-${j}`, type: 'trait', x: 10 * j, y: 10, z: j, auteur: 'essai', pts: [0, 0, 0.5, 30, 10, 0.5], couleur: '#1b2230', taille: 3, opacite: 1, pression: false })
    p.set('formes', f)
    d.getMap('pages').set('p' + i, p); ordre.push('p' + i)
  }
  d.getArray('ordre').push(ordre)
  return d
}
/** L'état du classeur de la page (le document en mémoire, par ecrireTableau) */
const etatDeLaPage = async p => {
  const b64 = await p.evaluate(async () => {
    const f = await import('/src/fichier.ts')
    const o = new Uint8Array(await f.ecrireTableau(window.__app.tableau.doc, 1).arrayBuffer())
    let s = ''; for (let i = 0; i < o.length; i += 0x8000) s += String.fromCharCode.apply(null, o.subarray(i, i + 0x8000))
    return btoa(s)
  })
  const o = Buffer.from(b64, 'base64')
  return new Uint8Array(gunzipSync(o.subarray(o.indexOf(0x0a) + 1)))
}
const ficheDe = p => p.evaluate(async () => {
  const f = await window.__registre.classeur(window.__app.classeur.id)
  if (!f) return null
  const c = f.cle ? { ...f.cle, vecteur: f.cle.vecteur ? [...f.cle.vecteur] : undefined } : undefined
  return { ...f, vecteur: undefined, cle: c, poignee: (await window.__registre.poignee(f.id))?.name ?? null }
})
const nbEcrites = p => p.evaluate(() => window.__ecritures.filter(e => e.fin).length)
const attendreEcrites = (p, n, timeout = 30000) => p.waitForFunction(n => window.__ecritures.filter(e => e.fin).length >= n, n, { timeout }).then(() => true, () => false)
const formesIds = p => p.evaluate(() => window.__app.formes.map(f => f.id))
/** Le texte d'une date comme dateLisible (« le samedi 10 octobre 2026 à 14 h 05 ») */
const JOURS = ['dimanche', 'lundi', 'mardi', 'mercredi', 'jeudi', 'vendredi', 'samedi']
const MOIS = ['janvier', 'février', 'mars', 'avril', 'mai', 'juin', 'juillet', 'août', 'septembre', 'octobre', 'novembre', 'décembre']
const dateLisible = t => { const d = new Date(t); return `le ${JOURS[d.getDay()]} ${d.getDate() === 1 ? '1er' : d.getDate()} ${MOIS[d.getMonth()]} ${d.getFullYear()} à ${d.getHours()} h ${String(d.getMinutes()).padStart(2, '0')}` }

// lancerPersistant, et non chromium.launch : voir commun/playwright.mjs (la poignée de la clé relue depuis IndexedDB)
const nav = await lancerPersistant({ env: { ...process.env, LANG: 'C.UTF-8', LC_ALL: 'C.UTF-8' } })
async function contexte(o = {}) {
  const ctx = await nav.newContext({ viewport: { width: 1366, height: 768 }, acceptDownloads: true, ...o })
  await ctx.addInitScript(INIT)
  await ctx.addInitScript(AUTO_REMPLACER)
  await ctx.addInitScript(ECOUTER_TOASTS)
  return ctx
}
async function ouvrir(ctx, chemin = '', nom = 'dev', horloge = false) {
  const p = await ctx.newPage(); suivre(p, nom)
  if (horloge) await p.clock.install()
  await p.goto(DEV + chemin); await pret(p); await p.waitForTimeout(400)
  return p
}
/** Crée un classeur par creerClasseur et creerBase(etatNeuf) (comme C1) */
const creer = (p, nom) => p.evaluate(async nom => {
  const dem = await import('/src/classeurs/demarrage.ts'), bases = await import('/src/classeurs/bases.ts'), neuf = await import('/src/classeurs/neuf.ts')
  const id = dem.idClasseur()
  const fiche = { id, base: dem.baseDe(id), nom, dossier: null, etiquettes: [], cree: Date.now(), modifie: Date.now(), ouvert: 0, pages: 1 }
  return window.__registre.creerClasseur(fiche, async base => bases.creerBase(base, await neuf.etatNeuf('seyes'), { id, nom }))
}, nom)

// =====================================================================
// A. LE SERVEUR DE DÉVELOPPEMENT, HORLOGE SIMULÉE
// =====================================================================
if (seul('A')) {
  console.log('=== A. l\'enregistrement automatique (serveur de développement, horloge simulée) ===')
  const ctx = await contexte()
  const p = await ouvrir(ctx, '', 'A', true)
  const id = await p.evaluate(() => window.__app.classeur.id)
  const FICHIER = 'Premier classeur.memc'

  // ---- A1. L'entrée du menu ----
  let m = await menu(p)
  // (Adapté au lot 4, morceau C5 : « Bibliothèque des classeurs… » en tête du menu)
  // (Adapté au lot 4, morceau C10 : « Copie sur le Drive… » (copie-drive) entre volontairement dans le menu ⋯, avant « Ouvrir un classeur… » ;
// adapté au lot 7 : « Enregistrer sur le Drive ou ailleurs… » (enregistrer-ailleurs) aussi, juste après)
  ok(JSON.stringify(m.entrees) === '["bibliotheque","enregistrer","activer-cle","copie-drive","enregistrer-ailleurs","ouvrir","exporter-pdf"]'
    && m.libelles['activer-cle'].texte === 'Enregistrer automatiquement dans un fichier…'
    && m.libelles['activer-cle'].aide === 'Sur la clé USB ou dans un dossier : le classeur s\'y enregistre tout seul, peu après chaque changement.',
    'A1) le menu ⋯ : « Enregistrer automatiquement dans un fichier… » (data-action activer-cle), avec son aide, après « Enregistrer le classeur… »', m)
  ok(m.cle.length === 1 && m.cle[0].texte === 'Pas d\'enregistrement automatique sur une clé' && m.cle[0].boutons.length === 0,
    '   … la ligne de la clé, sans bouton (l\'entrée juste dessous le fait)', m.cle)
  await fermerMenu(p)

  // ---- A2. L'activation, et la première écriture ----
  await entree(p, 'activer-cle')
  ok(await attendreEcrites(p, 1), 'A2) l\'activation : une première écriture tout de suite')
  await p.waitForTimeout(300)
  const choix = await p.evaluate(() => window.__choix[0])
  ok(choix?.quoi === 'save' && choix.o.suggestedName === FICHIER && choix.o.id === 'mem-classeurs' && choix.o.types?.[0]?.description === 'Classeur (MEM teachingtool)'
    && JSON.stringify(choix.o.types[0].accept) === '{"application/octet-stream":[".memc"]}' && choix.actif,
    `   … showSaveFilePicker({ suggestedName: « ${choix?.o?.suggestedName} », id: mem-classeurs, types }), dans le geste`, choix)
  let octets = await opfsLire(p, FICHIER)
  let lu = lireMemc(octets)
  let fiche = await ficheDe(p)
  ok(lu.entete.id === id && lu.entete.nom === 'Premier classeur' && lu.entier && lu.pages === 1,
    `   … le fichier « ${FICHIER} » : l'en-tête du classeur (id, nom), entier`, lu.entete)
  ok(fiche.cle?.nom === FICHIER && fiche.cle.date === lu.entete.date && fiche.cle.taille === octets.length && JSON.stringify(fiche.cle.vecteur) === JSON.stringify(lu.vecteur) && fiche.cle.t > 0 && fiche.poignee === FICHIER,
    '   … la fiche garde { nom, t, date de l\'en-tête, taille, vecteur } ; la poignée est dans « poignees »', fiche.cle)
  let e = await etat(p)
  ok(e.cle.etat === 'ok' && e.court === 'Clé : à l\'instant' && e.lignes[0] === `Sur la clé (${FICHIER}) : à l'instant` && !e.bandeau,
    `   … l'état : « ${e.court} », « ${e.lignes[0]} »`, e)
  const t0 = await toasts(p)
  ok(t0.includes(`Le classeur s'enregistre maintenant tout seul dans « ${FICHIER} ».`), '   … le message', t0)
  ok(Number(await p.evaluate(() => localStorage.getItem('mem-dernier-enregistrement'))) === lu.entete.date, '   … le classeur est dans un fichier depuis cette date (mem-dernier-enregistrement)')
  m = await menu(p)
  ok(JSON.stringify(m.entrees) === '["bibliotheque","enregistrer-cle","enregistrer","arreter-cle","copie-drive","enregistrer-ailleurs","ouvrir","exporter-pdf"]'
    && m.libelles['enregistrer-cle'].texte === 'Enregistrer maintenant sur la clé' && m.libelles['enregistrer-cle'].touche === 'Ctrl + S'
    && m.libelles['enregistrer'].texte === 'Enregistrer une copie dans un fichier…' && m.libelles['enregistrer'].touche === null
    && m.libelles['arreter-cle'].texte === 'Arrêter l\'enregistrement automatique sur la clé',
    '   … le menu : « Enregistrer maintenant sur la clé » (Ctrl + S), « Enregistrer une copie dans un fichier… », « Arrêter l\'enregistrement automatique sur la clé »', m)
  await fermerMenu(p)

  // ---- A3. Quand : 20 s après le dernier changement ----
  let n = await nbEcrites(p)
  await ecrire(p, 300, 250)
  const tTrait = await p.evaluate(() => Date.now())
  const idTrait = (await formesIds(p)).at(-1)
  await p.clock.fastForward(18500); await p.waitForTimeout(500)
  ok(await nbEcrites(p) === n, 'A3) un trait, puis 18,5 s : rien n\'est encore écrit')
  await p.clock.fastForward(2500)
  ok(await attendreEcrites(p, n + 1), '   … 20 s après le dernier changement : l\'écriture')
  let w = await p.evaluate(() => window.__ecritures.at(-1))
  octets = await opfsLire(p, FICHIER); lu = lireMemc(octets)
  ok(w.debut - tTrait >= 20000 && w.debut - tTrait < 23000 && lu.ids.includes(idTrait) && lu.entier,
    `   … écrite ${((w.debut - tTrait) / 1000).toFixed(1)} s après le trait, avec lui (relue : ${lu.ids.length} formes)`, { d: w.debut - tTrait, ids: lu.ids, idTrait })

  // ---- A3b. Au plus tard 2 min après le premier changement ----
  n = await nbEcrites(p)
  const tPremier = await p.evaluate(() => Date.now())
  // Un trait toutes les 13 s (jamais 20 s sans changement), seconde par seconde
  for (let i = 0; i < 12 && await nbEcrites(p) === n; i++) {
    await ecrire(p, 250 + i * 8, 300 + i * 5, 4)
    for (let k = 0; k < 13 && await nbEcrites(p) === n; k++) { await p.clock.fastForward(1000); await p.waitForTimeout(40) }
  }
  await attendreEcrites(p, n + 1, 15000)
  const ws = (await p.evaluate(() => window.__ecritures)).slice(n).filter(x => x.fin)
  ok(ws.length >= 1 && ws[0].debut - tPremier >= 119000 && ws[0].debut - tPremier < 122500,
    `A3b) un trait toutes les 13 s : la première écriture ${ws[0] ? ((ws[0].debut - tPremier) / 1000).toFixed(1) : '—'} s après le premier changement (au plus tard 2 min), pas avant`, ws.map(x => x.debut - tPremier))
  await p.clock.fastForward(25000); await attendreEcrites(p, n + 2, 10000)

  // ---- A3c. L'échéance des 2 min tombe pendant un trait de 32 s ----
  await p.waitForTimeout(500)
  n = await nbEcrites(p)
  const tc = await p.evaluate(() => Date.now())
  for (let i = 0; i < 8; i++) { await ecrire(p, 250 + i * 8, 200 + i * 5, 4); await p.clock.fastForward(13000); await p.waitForTimeout(60) }
  await p.mouse.move(420, 320); await p.mouse.down()
  const tBas = await p.evaluate(() => Date.now())
  // Un vrai trait bouge sans cesse (immobile 550 ms, le Stylo poserait sa
  // figure) : un point toutes les 200 ms, pendant 32 s
  let enGeste = true
  for (let i = 0; i < 160; i++) {
    await p.mouse.move(420 + (i % 80) * 4, 320 + Math.sin(i / 5) * 40 + (i >= 80 ? 60 : 0))
    await p.clock.fastForward(200)
    if (i % 20 === 19) enGeste = enGeste && await p.evaluate(() => !!window.__app.enGeste)
  }
  const pendant = (await p.evaluate(() => window.__ecritures)).slice(n)
  await p.mouse.up()
  const tHaut = await p.evaluate(() => Date.now())
  await p.clock.fastForward(1000); await p.waitForTimeout(300)
  const justeApres = (await p.evaluate(() => window.__ecritures)).slice(n)
  await p.clock.fastForward(1200)
  await attendreEcrites(p, n + 1, 15000)
  w = (await p.evaluate(() => window.__ecritures)).slice(n)[0]
  ok(enGeste && tBas - tc < 119000 && tHaut - tc > 121000 && pendant.length === 0 && justeApres.length === 0 && w && w.debut >= tHaut + 1500 && w.debut < tHaut + 4500,
    `A3c) l'échéance des 2 min tombe pendant un trait de 32 s : rien pendant le trait, ni dans la seconde qui suit ; l'écriture part ${w ? ((w.debut - tHaut) / 1000).toFixed(1) : '—'} s après le lever (au calme : 1,5 s)`, { enGeste, pendant, justeApres, w, tHaut: tHaut - tc, tBas: tBas - tc })
  octets = await opfsLire(p, FICHIER); lu = lireMemc(octets)
  ok(lu.ids.includes((await formesIds(p)).at(-1)), '   … avec le long trait')
  // Après une écriture, un trait : 20 s après lui
  await p.waitForTimeout(500)
  n = await nbEcrites(p)
  await ecrire(p, 500, 300)
  const tApres = await p.evaluate(() => Date.now())
  await p.clock.fastForward(18500); await p.waitForTimeout(300)
  const rien = await nbEcrites(p) === n
  await p.clock.fastForward(2500)
  await attendreEcrites(p, n + 1, 15000)
  w = (await p.evaluate(() => window.__ecritures)).slice(n)[0]
  ok(rien && w && w.debut - tApres >= 20000 && w.debut - tApres < 23000, '   … puis un trait : l\'écriture 20 s après lui', { rien, w, tApres })
  await p.waitForTimeout(500)

  // ---- A4. Ctrl + S : aussitôt sur la clé ; « une copie » ----
  n = await nbEcrites(p)
  const choixAvant = (await p.evaluate(() => window.__choix.length))
  await ecrire(p, 300, 400)
  const idS = (await formesIds(p)).at(-1)
  await p.keyboard.press('Control+s')
  ok(await attendreEcrites(p, n + 1, 8000), 'A4) Ctrl + S : écrit aussitôt sur la clé')
  await p.waitForTimeout(300)
  octets = await opfsLire(p, FICHIER); lu = lireMemc(octets)
  let msg = await toasts(p)
  ok(lu.ids.includes(idS) && (await p.evaluate(() => window.__choix.length)) === choixAvant && msg.some(t => new RegExp(`^Classeur enregistré sur la clé : ${FICHIER.replace('.', '\\.')} \\(\\d+ Ko\\)\\.$`).test(t)),
    '   … avec le dernier trait, sans demander de fichier, « Classeur enregistré sur la clé : … (N Ko). »', { msg, ids: lu.ids, idS, choix: await p.evaluate(() => window.__choix), choixAvant })
  await p.evaluate(() => { window.__nomChoisi = 'copie.memc' })
  await entree(p, 'enregistrer')
  await p.waitForFunction(() => window.__ecritures.some(e => e.nom === 'copie.memc' && e.fin), null, { timeout: 15000 }).catch(() => {})
  await p.waitForTimeout(300)
  const copie = await opfsLire(p, 'copie.memc')
  msg = await toasts(p)
  ok(copie && lireMemc(copie).entier && msg.some(t => /^Classeur enregistré : copie\.memc \(/.test(t)) && (await etat(p)).cle.nom === FICHIER,
    '   … « Enregistrer une copie dans un fichier… » : un autre fichier (choisi), la clé ne change pas', msg)
  await p.evaluate(() => { window.__nomChoisi = null })

  // ---- A5. Les échecs : rien n'est perdu ----
  // a) la clé retirée (NotFoundError), puis les réessais
  let avant = await opfsLire(p, FICHIER)
  await p.evaluate(() => { window.__panne = 'NotFoundError' })
  await ecrire(p, 350, 450)
  let tent = await p.evaluate(() => window.__tentatives)
  await p.clock.fastForward(21000)
  await p.waitForFunction(() => window.__cle.etat.etat === 'erreur', null, { timeout: 15000 }).catch(() => {})
  e = await etat(p)
  ok(e.cle.etat === 'erreur' && e.cle.message === 'la clé n\'est plus là, ou le fichier a été déplacé' && e.court === 'Clé : pas à jour'
    && e.lignes[0] === 'Sur la clé : la clé n\'est plus là, ou le fichier a été déplacé'
    && e.lignes[1] === 'Rien n\'est perdu : le classeur est dans ce navigateur ; l\'enregistrement reprendra dès que possible.',
    `A5) la clé retirée : « ${e.court} », « ${e.lignes[0]} », « ${e.lignes[1]} »`, e)
  ok(e.bandeau?.raison === 'cle-erreur' && e.bandeau.texte === 'L\'enregistrement sur la clé a échoué (la clé n\'est plus là, ou le fichier a été déplacé). Rien n\'est perdu.'
    && JSON.stringify(e.bandeau.boutons) === '["Choisir un autre fichier…"]' && e.bandeau.fermer,
    `   … le bandeau : « ${e.bandeau?.texte} » [Choisir un autre fichier…] ×`, e.bandeau)
  ok(Buffer.compare(await opfsLire(p, FICHIER), avant) === 0, '   … le fichier de la clé est intact')
  // Les réessais : 30 s, 1 min, 2 min, puis toutes les 5 min
  const essais = []
  let t1 = await p.evaluate(() => window.__tentatives)
  for (const [attente, quoi] of [[30000, '30 s'], [60000, '1 min'], [120000, '2 min'], [300000, '5 min'], [300000, '5 min']]) {
    await p.clock.fastForward(attente - 1500); await p.waitForTimeout(400)
    const pasEncore = (await p.evaluate(() => window.__tentatives)) === t1
    await p.clock.fastForward(2500)
    await p.waitForFunction(t => window.__tentatives > t, t1, { timeout: 10000 }).catch(() => {})
    await p.waitForTimeout(300)
    const t2 = await p.evaluate(() => window.__tentatives)
    essais.push({ quoi, pasEncore, une: t2 === t1 + 1 })
    t1 = t2
  }
  ok(essais.every(x => x.pasEncore && x.une) && tent > 0, `   … les réessais : ${essais.map(x => x.quoi).join(', ')} (un à chaque fois, pas avant)`, essais)
  // La clé revient
  await p.evaluate(() => { window.__panne = null })
  n = await nbEcrites(p)
  await p.clock.fastForward(301000)
  ok(await attendreEcrites(p, n + 1, 15000), '   … la clé revient : le réessai suivant écrit')
  await p.waitForTimeout(400)
  e = await etat(p); msg = await toasts(p)
  ok(e.cle.etat === 'ok' && !e.bandeau && msg.includes('Enregistrement sur la clé repris.'), '   … « Enregistrement sur la clé repris. », l\'état revient, le bandeau s\'en va', { e, msg })
  // b) la clé pleine pendant l'écriture : abort, le fichier d'avant reste entier
  avant = await opfsLire(p, FICHIER)
  await p.evaluate(() => { window.__panne = 'QuotaExceededError' })
  await ecrire(p, 380, 470)
  n = (await p.evaluate(() => window.__ecritures.length))
  await p.clock.fastForward(21000)
  await p.waitForFunction(() => window.__cle.etat.etat === 'erreur', null, { timeout: 15000 }).catch(() => {})
  e = await etat(p)
  const wq = await p.evaluate(() => window.__ecritures.at(-1))
  const apres = await opfsLire(p, FICHIER)
  ok(e.cle.message === 'la clé est pleine' && wq.echec === 'QuotaExceededError' && wq.abandon && Buffer.compare(apres, avant) === 0 && lireMemc(apres).entier,
    `   … la clé pleine au milieu de l'écriture : « ${e.cle.message} », l'écriture abandonnée (abort), le fichier d'avant intact et entier`, { e, wq })
  await p.evaluate(() => { window.__panne = null })
  await p.clock.fastForward(31000)
  await p.waitForFunction(() => window.__cle.etat.etat === 'ok', null, { timeout: 15000 }).catch(() => {})
  // c) en lecture seule
  await p.evaluate(() => { window.__panne = 'NoModificationAllowedError' })
  await ecrire(p, 300, 480)
  await p.clock.fastForward(21000)
  await p.waitForFunction(() => window.__cle.etat.etat === 'erreur', null, { timeout: 15000 }).catch(() => {})
  e = await etat(p)
  ok(e.cle.message === 'le fichier est en lecture seule, ou ouvert dans un autre logiciel', `   … en lecture seule : « ${e.cle.message} »`, e)
  await p.evaluate(() => { window.__panne = null })
  await p.clock.fastForward(31000)
  await p.waitForFunction(() => window.__cle.etat.etat === 'ok', null, { timeout: 15000 }).catch(() => {})
  await p.waitForTimeout(300)
  await toasts(p)

  // ---- A6. Les garde-fous ----
  // a) le fichier contient un autre classeur
  const autre = faireMemc(Y.encodeStateAsUpdate(unClasseur(1, 2, 'A')), { date: 1_700_000_000_000, pages: 1, nom: 'Autre classeur', id: 'feedfacefeedface' })
  await opfsEcrire(p, FICHIER, autre)
  await ecrire(p, 320, 300)
  n = await p.evaluate(() => window.__tentatives)
  await p.clock.fastForward(21000)
  await p.waitForFunction(() => window.__cle.etat.etat === 'conflit', null, { timeout: 15000 }).catch(() => {})
  e = await etat(p)
  ok(e.cle.etat === 'conflit' && e.cle.message === `Le fichier « ${FICHIER} » contient un autre classeur (« Autre classeur ») : il n'est pas remplacé.`
    && e.court === 'Clé : pas à jour' && e.bandeau?.raison === 'cle-conflit' && JSON.stringify(e.bandeau.boutons) === '["Ouvrir le fichier de la clé","Choisir un autre fichier…","Remplacer quand même"]',
    `A6a) un autre classeur dans le fichier : « ${e.cle.message} », [Ouvrir le fichier de la clé] (C9) [Choisir un autre fichier…] [Remplacer quand même]`, e)
  ok(Buffer.compare(await opfsLire(p, FICHIER), autre) === 0 && (await p.evaluate(() => window.__tentatives)) === n, '   … le fichier n\'est pas touché (aucune écriture commencée)')
  await ecrire(p, 330, 320); await p.clock.fastForward(25000); await p.waitForTimeout(400)
  ok(Buffer.compare(await opfsLire(p, FICHIER), autre) === 0, '   … un autre changement : toujours rien (le conflit attend un clic)')
  m = await menu(p)
  ok(m.cle[0]?.texte === e.cle.message && JSON.stringify(m.cle[0]?.boutons) === '["Ouvrir le fichier de la clé","Choisir un autre fichier…","Remplacer quand même"]', '   … la ligne du menu ⋯ porte les boutons (et, depuis C9, « Ouvrir le fichier de la clé »)', m.cle)
  await fermerMenu(p)
  // « Remplacer quand même » : une confirmation, puis l'écriture
  await p.click('.bouton-bandeau[data-etat-action="forcer-cle"]')
  await p.waitForTimeout(200)
  const dq = await dialogues(p)
  ok(dq.length === 1 && dq[0].titre === 'Remplacer le fichier de la clé ?' && dq[0].texte === `« ${FICHIER} » sera remplacé par ce classeur : ce qu'il contient de plus sera perdu. Pour le garder, choisissez plutôt un autre fichier, ou ouvrez-le (Ctrl + O).`
    && JSON.stringify(dq[0].boutons) === '["Annuler","Remplacer"]', '   … [Remplacer quand même] : une question d\'abord', dq)
  n = await nbEcrites(p)
  await p.click('dialog[open] [data-a="oui"]')
  ok(await attendreEcrites(p, n + 1, 10000), '   … [Remplacer] : le fichier est remplacé')
  await p.waitForTimeout(300)
  lu = lireMemc(await opfsLire(p, FICHIER)); e = await etat(p)
  ok(lu.entete.id === id && e.cle.etat === 'ok' && !e.bandeau, '   … par ce classeur, et tout repart', { entete: lu.entete, e })
  // b) le fichier modifié ailleurs (même classeur, une autre date)
  fiche = await ficheDe(p)
  const ailleurs = faireMemc(new Uint8Array(gunzipSync((await opfsLire(p, FICHIER)).subarray((await opfsLire(p, FICHIER)).indexOf(0x0a) + 1))), { date: fiche.cle.date + 3_600_000, pages: lu.pages, nom: 'Premier classeur', id })
  await opfsEcrire(p, FICHIER, ailleurs)
  await ecrire(p, 340, 340)
  await p.clock.fastForward(21000)
  await p.waitForFunction(() => window.__cle.etat.etat === 'conflit', null, { timeout: 15000 }).catch(() => {})
  e = await etat(p)
  ok(e.cle.message === `Le fichier de la clé a été modifié ailleurs (${dateLisible(fiche.cle.date + 3_600_000)}) depuis le dernier enregistrement d'ici : il n'est pas remplacé.` && Buffer.compare(await opfsLire(p, FICHIER), ailleurs) === 0,
    `A6b) modifié ailleurs : « ${e.cle.message} », le fichier n'est pas touché`, { cle: e.cle, attendu: dateLisible(fiche.cle.date + 3_600_000), meme: Buffer.compare(await opfsLire(p, FICHIER), ailleurs) })
  // [Choisir un autre fichier…] : un nouveau fichier, celui en conflit reste tel quel
  await p.evaluate(() => { window.__nomChoisi = 'autre-cle.memc' })
  n = await nbEcrites(p)
  await p.click('.bouton-bandeau[data-etat-action="choisir-cle"]')
  ok(await attendreEcrites(p, n + 1, 10000), '   … [Choisir un autre fichier…] : le classeur s\'écrit dans le nouveau fichier')
  await p.waitForTimeout(300)
  fiche = await ficheDe(p); e = await etat(p)
  ok(fiche.cle.nom === 'autre-cle.memc' && fiche.poignee === 'autre-cle.memc' && e.cle.etat === 'ok' && lireMemc(await opfsLire(p, 'autre-cle.memc')).entete.id === id && Buffer.compare(await opfsLire(p, FICHIER), ailleurs) === 0,
    '   … la fiche et la poignée le suivent ; le fichier en conflit reste tel quel', { fiche: fiche.cle, e })
  await p.evaluate(() => { window.__nomChoisi = null })
  await toasts(p)
  // c) les refus à l'activation (Choisir un autre fichier…)
  const etatIci = await etatDeLaPage(p)
  const refus = async (nom, octets) => {
    if (octets) await opfsEcrire(p, nom, octets)
    await p.evaluate(n => { window.__nomChoisi = n }, nom)
    const ecr = await p.evaluate(() => window.__tentatives)
    await p.evaluate(() => window.__cle.choisirUnAutre())
    await p.waitForTimeout(300)
    return { msg: await toasts(p), cle: (await ficheDe(p)).cle.nom, touche: (await p.evaluate(() => window.__tentatives)) !== ecr }
  }
  let r = await refus('pas-un.memc', Buffer.from('bonjour, ceci n\'est pas un classeur\n'))
  ok(r.msg.includes('Ce fichier n\'est pas un classeur : choisissez un fichier .memc, ou un autre nom.') && r.cle === 'autre-cle.memc' && !r.touche,
    'A6c) choisir un fichier qui n\'est pas un classeur : « Ce fichier n\'est pas un classeur : choisissez un fichier .memc, ou un autre nom. »', r)
  r = await refus('autre-id.memc', autre)
  ok(r.msg.includes('Ce fichier contient un autre classeur (« Autre classeur ») : choisissez un autre nom.') && r.cle === 'autre-cle.memc' && !r.touche,
    '   … un autre classeur : « Ce fichier contient un autre classeur (« Autre classeur ») : choisissez un autre nom. »', r)
  const plus = new Y.Doc({ gc: false }); Y.applyUpdate(plus, etatIci)
  plus.getMap('pages').get(plus.getArray('ordre').get(0)).get('formes').set('EN-PLUS', { id: 'EN-PLUS', type: 'trait', x: 0, y: 0, z: 1, auteur: 'ailleurs', pts: [0, 0, 0.5, 9, 9, 0.5], couleur: '#000', taille: 3, opacite: 1, pression: false })
  r = await refus('plus-riche.memc', faireMemc(Y.encodeStateAsUpdate(plus), { date: 1_791_000_000_000, pages: 1, nom: 'Premier classeur', id }))
  ok(r.msg.includes('Ce fichier contient des changements que ce classeur n\'a pas : il n\'est pas remplacé. Pour les retrouver, ouvrez-le (Ctrl + O).') && r.cle === 'autre-cle.memc' && !r.touche,
    '   … le même classeur avec des changements de plus : refusé (« Ce fichier contient des changements que ce classeur n\'a pas… »)', r)
  const moins = faireMemc(etatIci, { date: 1_791_111_111_111, pages: 1, nom: 'Premier classeur', id })
  await ecrire(p, 360, 360)
  await opfsEcrire(p, 'moins.memc', moins)
  await p.evaluate(() => { window.__nomChoisi = 'moins.memc' })
  n = await nbEcrites(p)
  await p.evaluate(() => window.__cle.choisirUnAutre())
  await attendreEcrites(p, n + 1, 10000); await p.waitForTimeout(300)
  fiche = await ficheDe(p); lu = lireMemc(await opfsLire(p, 'moins.memc'))
  ok(fiche.cle.nom === 'moins.memc' && lu.entete.date > 1_791_111_111_111 && lu.ids.length === (await formesIds(p)).length,
    '   … le même classeur avec moins (« contenu ») : accepté, puis remplacé par tout le classeur', { cle: fiche.cle, ids: lu.ids.length })
  await p.evaluate(() => { window.__nomChoisi = null })
  await toasts(p)

  // ---- A7. Après un rechargement ----
  await p.reload(); await pret(p); await p.waitForTimeout(500)
  e = await etat(p)
  let appels = await p.evaluate(() => window.__appels)
  ok(e.cle.etat === 'ok' && !e.bandeau && !appels.some(a => a.quoi === 'request'), 'A7) rechargé, l\'accord gardé par le navigateur : tout repart seul (aucun requestPermission)', { e, appels })
  await p.evaluate(() => sessionStorage.setItem('__permissionDepart', 'prompt'))
  await p.reload(); await pret(p); await p.waitForTimeout(500)
  e = await etat(p)
  ok(e.cle.etat === 'permission' && e.court === 'Clé en pause' && e.bandeau?.raison === 'cle-permission' && e.bandeau.texte === 'L\'enregistrement sur la clé attend votre accord.'
    && JSON.stringify(e.bandeau.boutons) === '["Reprendre l\'enregistrement sur la clé"]' && e.bandeau.fermer && e.lignes[0] === 'Sur la clé : en pause, le navigateur attend votre accord',
    `   … rechargé, le navigateur redemande : « ${e.court} », le bandeau « ${e.bandeau?.texte} » [Reprendre l'enregistrement sur la clé]`, e)
  n = await nbEcrites(p)
  await ecrire(p, 300, 500)
  const idR = (await formesIds(p)).at(-1)
  await p.clock.fastForward(25000); await p.waitForTimeout(500)
  appels = await p.evaluate(() => window.__appels)
  ok(await nbEcrites(p) === n && !appels.some(a => a.quoi === 'request'), '   … un trait, 25 s : rien n\'est écrit, et rien n\'est demandé sans un clic', appels)
  await p.click('.bouton-bandeau[data-etat-action="reprendre-cle"]')
  ok(await attendreEcrites(p, n + 1, 10000), '   … [Reprendre l\'enregistrement sur la clé] : l\'écriture due part')
  await p.waitForTimeout(300)
  appels = await p.evaluate(() => window.__appels.filter(a => a.quoi === 'request'))
  e = await etat(p); msg = await toasts(p)
  ok(appels.length === 1 && appels[0].actif && appels[0].rendu === 'granted' && e.cle.etat === 'ok' && !e.bandeau && msg.includes('Enregistrement sur la clé repris.')
    && lireMemc(await opfsLire(p, 'moins.memc')).ids.includes(idR),
    '   … un seul requestPermission, dans le geste ; « Enregistrement sur la clé repris. » ; le trait est sur la clé', { appels, e, msg })
  // Ctrl + S compte comme un geste
  await p.reload(); await pret(p); await p.waitForTimeout(500)
  ok((await etat(p)).cle.etat === 'permission', '   … rechargé de nouveau : en pause')
  n = await nbEcrites(p)
  await p.keyboard.press('Control+s')
  ok(await attendreEcrites(p, n + 1, 10000), '   … Ctrl + S : l\'accord demandé dans la touche, puis l\'écriture')
  appels = await p.evaluate(() => window.__appels.filter(a => a.quoi === 'request'))
  ok(appels.length === 1 && appels[0].actif && (await etat(p)).cle.etat === 'ok', '   … un requestPermission, dans le geste', appels)
  await p.evaluate(() => sessionStorage.removeItem('__permissionDepart'))
  await toasts(p)

  // ---- A8. Arrêter ----
  await entree(p, 'arreter-cle')
  await p.waitForTimeout(400)
  fiche = await ficheDe(p); e = await etat(p); msg = await toasts(p)
  ok(!fiche.cle && fiche.poignee === null && e.cle.etat === 'absente' && msg.includes('L\'enregistrement automatique sur la clé est arrêté. « moins.memc » garde le classeur tel qu\'il était à sa dernière écriture.'),
    'A8) « Arrêter l\'enregistrement automatique sur la clé » : la fiche et la poignée l\'oublient ; le message', { fiche, e, msg })
  n = await nbEcrites(p)
  await ecrire(p, 300, 520); await p.clock.fastForward(130000); await p.waitForTimeout(500)
  m = await menu(p)
  ok(await nbEcrites(p) === n && m.entrees.includes('activer-cle') && !m.entrees.includes('arreter-cle'), '   … plus rien ne s\'écrit ; le menu propose de nouveau de l\'activer', m.entrees)
  await fermerMenu(p)
  await ctx.close()
}

// =====================================================================
// R. « REMPLACER » PREND L'IDENTITÉ DU FICHIER ; LA CASE DE LA FENÊTRE
// =====================================================================
if (seul('R')) {
  console.log('\n=== R. « Remplacer » prend l\'identité du fichier ; la case « Enregistrer automatiquement… » ===')
  const ctx = await contexte()
  const p = await ouvrir(ctx, '', 'R')
  const avant = await p.evaluate(() => ({ ...window.__app.classeur }))
  // Le premier s'enregistre sur la clé (la question dira que cela s'arrête)
  await p.evaluate(() => { window.__nomChoisi = 'premier.memc' })
  await entree(p, 'activer-cle')
  await attendreEcrites(p, 1); await p.waitForTimeout(300)
  await p.evaluate(() => { window.__nomChoisi = null })
  const premierAvant = await opfsLire(p, 'premier.memc')
  // Le fichier à ouvrir : un classeur « Symétrie centrale », d'id inconnu ici
  const ID_S = 'abcdef0123456789', DATE_S = 1_791_000_000_000
  const sym = unClasseur(2, 3, 'S')
  await opfsEcrire(p, 'symetrie.memc', faireMemc(Y.encodeStateAsUpdate(sym), { date: DATE_S, pages: 2, nom: 'Symétrie centrale', id: ID_S }))
  // Un autre onglet sur le même classeur écoute le canal
  const p2 = await ouvrir(ctx, '', 'R2')
  await p2.evaluate(() => { window.__canal = []; const c = new BroadcastChannel('mem-teachingtool-classeur'); c.onmessage = e => window.__canal.push(e.data) })
  await p.bringToFront()
  await p.evaluate(() => { window.__aOuvrir = 'symetrie.memc' })
  await p.keyboard.press('Control+o')
  await p.waitForSelector('dialog[open] [data-a="remplacer"]', { timeout: 10000 })
  let d = (await dialogues(p))[0]
  const ouv = await p.evaluate(() => window.__choix.filter(c => c.quoi === 'open'))
  // (C9 : plusieurs fichiers à la fois, des classeurs et des bibliothèques)
  ok(ouv.length === 1 && ouv[0].o.id === 'mem-classeurs' && ouv[0].o.multiple === true && ouv[0].o.types?.[0]?.description === 'Classeur, bibliothèque ou ancien tableau (MEM teachingtool)',
    'R1) Ctrl + O : showOpenFilePicker({ id: mem-classeurs, plusieurs fichiers, types : « Classeur, bibliothèque ou ancien tableau (MEM teachingtool) » })', ouv)
  ok(d.titre === 'Ouvrir ce classeur ?' && d.texte.endsWith('Pour garder celui-ci, enregistrez-le d\'abord. L\'enregistrement automatique dans « premier.memc » s\'arrête : ce fichier garde le classeur d\'avant.')
    && d.case?.coche === true && d.case.texte === 'Enregistrer automatiquement les changements dans ce fichier' && JSON.stringify(d.boutons) === '["Annuler","Enregistrer d\'abord","Remplacer"]',
    '   … la question : la clé du classeur d\'avant s\'arrête ; la case « Enregistrer automatiquement les changements dans ce fichier », cochée', d)
  await p.evaluate(() => sessionStorage.removeItem('__requetes'))
  await Promise.all([p.waitForNavigation({ timeout: 20000 }), p.click('dialog[open] [data-a="remplacer"]')])
  await pret(p); await p.waitForTimeout(800)
  const apres = await p.evaluate(() => ({ ...window.__app.classeur, url: location.search, titre: document.title, formes: window.__app.formes.length, pages: window.__app.pages.length }))
  const fiches = await p.evaluate(() => window.__registre.classeurs().then(l => l.map(f => ({ id: f.id, base: f.base, nom: f.nom, recu: f.recu, cle: f.cle ? { nom: f.cle.nom, date: f.cle.date, v: !!f.cle.vecteur } : null }))))
  const poignees = await p.evaluate(() => window.__registre.poignees().then(l => l.map(x => [x.id, x.poignee.name])))
  const cles = await p.evaluate(() => ({ dernier: localStorage.getItem('mem-dernier-enregistrement'), classeur: JSON.parse(localStorage.getItem('mem-teachingtool-dernier-classeur')) }))
  const msg = await toasts(p)
  const req = await p.evaluate(() => JSON.parse(sessionStorage.getItem('__requetes') || '[]'))
  ok(apres.id === ID_S && apres.base === 'mem-tableau-local' && apres.nom === 'Symétrie centrale' && apres.url === '?classeur=' + ID_S && apres.titre === 'Symétrie centrale — MEM teachingtool' && apres.pages === 2 && apres.formes === 3,
    `R2) Remplacer : le classeur prend l'identité du fichier (id ${apres.id}, « ${apres.nom} »), la base ne change pas (${apres.base}) ; l'adresse ?classeur=<id>`, apres)
  ok(fiches.length === 1 && fiches[0].id === ID_S && fiches[0].recu === DATE_S && fiches[0].cle?.nom === 'symetrie.memc' && fiches[0].cle.date === DATE_S && fiches[0].cle.v,
    '   … une seule fiche, avec reçu = la date du fichier ; sa clé : le fichier ouvert (nom, date de son en-tête, vecteur)', fiches)
  ok(JSON.stringify(poignees) === JSON.stringify([[ID_S, 'symetrie.memc']]), '   … la poignée du fichier ouvert est gardée ; celle de « premier.memc » oubliée', poignees)
  ok(Number(cles.dernier) === DATE_S && cles.classeur.id === ID_S && cles.classeur.nom === 'Symétrie centrale', '   … la date du dernier enregistrement = celle du fichier ; le dernier classeur, la nouvelle identité', cles)
  // Contrôle final du lot 4 (adaptation voulue) : l'accord n'est plus demandé dans le clic sur
  // « Remplacer » (Chrome l'oublie au rechargement, et le redemandait) ; au retour, la clé vérifiée
  // dit ce qu'il en est : ici le navigateur le permet (simulé : « à chaque visite »), voir CF1-accord.mjs
  ok(req.length === 0 && msg.includes('Classeur ouvert : 2 pages. Il s\'enregistre automatiquement dans « symetrie.memc ».'),
    '   … rien n\'est demandé avant le rechargement ; au retour, le navigateur le permettant : « Classeur ouvert : 2 pages. Il s\'enregistre automatiquement dans « symetrie.memc ». »', { req, msg })
  const canal = await p2.evaluate(() => window.__canal)
  const d2 = await dialogues(p2)
  ok(canal.some(m => m.type === 'remplace' && m.base === 'mem-tableau-local' && m.id === ID_S) && d2.length === 1 && d2[0].titre === 'Le classeur a changé',
    '   … l\'autre onglet reçoit { type: remplace, base, id: <la nouvelle identité> } et le dit', { canal, d2 })
  await Promise.all([p2.waitForNavigation({ timeout: 15000 }), p2.click('dialog[open] .actions button')])
  await pret(p2)
  ok(await p2.evaluate(() => location.search) === '?classeur=' + ID_S, '   … son « Recharger » va vers la nouvelle identité')
  await p2.close()
  ok(Buffer.compare(await opfsLire(p, 'premier.memc'), premierAvant) === 0, '   … « premier.memc » garde le classeur d\'avant (rien n\'y est écrit)')
  let e = await etat(p)
  ok(e.cle.etat === 'ok' && e.cle.nom === 'symetrie.memc', '   … la clé : le fichier ouvert, à jour', e)
  // Un changement : écrit dans le fichier ouvert (le garde-fou passe : même id, même date)
  const n = await nbEcrites(p)
  await ecrire(p, 400, 300)
  ok(await attendreEcrites(p, n + 1, 30000), 'R3) un trait : l\'écriture automatique dans le fichier ouvert (le garde-fou passe)')
  await p.waitForTimeout(300)
  let lu = lireMemc(await opfsLire(p, 'symetrie.memc'))
  ok(lu.entete.id === ID_S && lu.entete.date > DATE_S && lu.ids.length === 7 && lu.entete.nom === 'Symétrie centrale', '   … le fichier a maintenant le trait, et l\'en-tête du classeur', { entete: lu.entete, ids: lu.ids, formes: await formesIds(p), ecritures: await p.evaluate(() => window.__ecritures) })
  await toasts(p)

  // Un .memc d'avant le lot 4 (sans nom ni id), ouvert avec la case
  const DATE_A = 1_790_000_000_000
  await opfsEcrire(p, 'ancien.memc', faireMemc(Y.encodeStateAsUpdate(unClasseur(1, 2, 'V')), { date: DATE_A, pages: 1 }))
  await p.evaluate(() => { window.__aOuvrir = 'ancien.memc' })
  await p.keyboard.press('Control+o')
  await p.waitForSelector('dialog[open] [data-a="remplacer"]', { timeout: 10000 })
  d = (await dialogues(p))[0]
  ok(d.case?.coche && d.texte.endsWith('L\'enregistrement automatique dans « symetrie.memc » s\'arrête : ce fichier garde le classeur d\'avant.'), 'R4) un .memc d\'avant le lot 4 (sans id) : la case est offerte', d)
  await Promise.all([p.waitForNavigation({ timeout: 20000 }), p.click('dialog[open] [data-a="remplacer"]')])
  await pret(p); await p.waitForTimeout(800)
  const a2 = await p.evaluate(() => ({ ...window.__app.classeur }))
  let f = await ficheDe(p)
  ok(/^[0-9a-f]{16}$/.test(a2.id) && a2.id !== ID_S && a2.nom === 'Symétrie centrale' && f.cle?.nom === 'ancien.memc' && f.cle.date === DATE_A && f.poignee === 'ancien.memc',
    `   … une identité neuve (${a2.id}), le nom ne change pas ; la clé : « ancien.memc », à sa date`, { a2, cle: f.cle })
  const n2 = await nbEcrites(p)
  await ecrire(p, 420, 320)
  ok(await attendreEcrites(p, n2 + 1, 30000), '   … un trait : écrit dans le fichier sans id (accepté : sa date est la bonne)')
  await p.waitForTimeout(300)
  lu = lireMemc(await opfsLire(p, 'ancien.memc'))
  ok(lu.entete.id === a2.id && lu.ids.length === 3, '   … qui porte maintenant l\'id du classeur', lu.entete)
  ok(lireMemc(await opfsLire(p, 'symetrie.memc')).ids.length === 7, '   … « symetrie.memc » garde le classeur d\'avant')
  await toasts(p)

  // Un fichier dont l'id est celui d'un autre classeur de la bibliothèque : pas de case, identité neuve
  const B = await creer(p, 'Classeur B')
  await opfsEcrire(p, 'b.memc', faireMemc(Y.encodeStateAsUpdate(unClasseur(1, 1, 'B')), { date: DATE_A + 5, pages: 1, nom: 'Classeur B', id: B.id }))
  // C9 : le fichier d'un classeur de la bibliothèque est reconnu (« déjà dans la
  // bibliothèque ») et ne remplace plus celui qui est ouvert ; son id reste pris
  // quand ce classeur est dans la corbeille, où l'on peut encore remplacer
  await p.evaluate(id => window.__registre.modifierClasseur(id, x => { x.corbeille = { t: Date.now() } }), B.id)
  await p.evaluate(() => { window.__aOuvrir = 'b.memc' })
  await p.keyboard.press('Control+o')
  await p.waitForSelector('dialog[open] [data-a="remplacer"]', { timeout: 10000 })
  d = (await dialogues(p))[0]
  ok(d.case === null, 'R5) le fichier d\'un autre classeur de la bibliothèque (son id est pris) : pas de case', d)
  await Promise.all([p.waitForNavigation({ timeout: 20000 }), p.click('dialog[open] [data-a="remplacer"]')])
  await pret(p); await p.waitForTimeout(800)
  const a3 = await p.evaluate(() => ({ ...window.__app.classeur }))
  f = await ficheDe(p)
  const fB = await p.evaluate(id => window.__registre.classeur(id), B.id)
  ok(a3.id !== B.id && a3.id !== a2.id && a3.nom === 'Symétrie centrale' && !f.cle && f.poignee === null && fB?.nom === 'Classeur B' && fB.base === B.base,
    '   … une identité neuve, le nom ne change pas, plus de clé ; la fiche de B intacte', { a3, f: { cle: f.cle, poignee: f.poignee }, fB })
  await p.evaluate(id => window.__registre.modifierClasseur(id, x => { delete x.corbeille }), B.id)
  e = await etat(p)
  ok(e.cle.etat === 'absente', '   … l\'état : pas d\'enregistrement automatique', e.cle)
  await toasts(p)

  // L'accord refusé ; la case décochée. Contrôle final du lot 4 (adaptation voulue) : l'accord se
  // demande au retour, en un clic ([Autoriser]) ; le refuser laisse la clé en pause, et c'est dit
  await p.evaluate(() => { window.__aOuvrir = 'symetrie.memc'; sessionStorage.setItem('__permissionDepart', 'prompt') })
  await p.keyboard.press('Control+o')
  await p.waitForSelector('dialog[open] [data-a="remplacer"]', { timeout: 10000 })
  await Promise.all([p.waitForNavigation({ timeout: 20000 }), p.click('dialog[open] [data-a="remplacer"]')])
  await pret(p); await p.waitForTimeout(800)
  let m = await toasts(p)
  ok(m.some(t => t.includes('Classeur ouvert : 2 pages. Pour qu\'il s\'enregistre tout seul dans « symetrie.memc », le navigateur demande votre accord.Autoriser')) && !m.some(t => t.includes('s\'enregistre automatiquement')),
    'R6) au retour, le navigateur sans l\'accord : « Classeur ouvert : 2 pages. Pour qu\'il s\'enregistre tout seul dans « symetrie.memc », le navigateur demande votre accord. » [Autoriser]', m)
  await p.evaluate(() => { window.__refus = true; sessionStorage.removeItem('__permissionDepart') })
  await p.click('.toast button.action:has-text("Autoriser")')
  await p.waitForTimeout(600)
  f = await ficheDe(p)
  m = await toasts(p)
  e = await etat(p)
  ok(f.id === ID_S && f.cle?.nom === 'symetrie.memc' && f.poignee === 'symetrie.memc' && e.cle.etat === 'permission' && m.some(t => t.includes('Le navigateur n\'a pas permis d\'écrire dans « symetrie.memc » : l\'enregistrement sur la clé reste en pause.')),
    '   … l\'accord refusé : « Le navigateur n\'a pas permis d\'écrire dans « symetrie.memc » : l\'enregistrement sur la clé reste en pause. » (l\'identité du fichier ; la clé gardée, en pause)', { f: { id: f.id, cle: f.cle?.nom, poignee: f.poignee }, e: e.cle, m })
  await p.evaluate(() => { window.__aOuvrir = 'ancien.memc' })
  await p.keyboard.press('Control+o')
  await p.waitForSelector('dialog[open] [data-a="remplacer"]', { timeout: 10000 })
  await p.uncheck('dialog[open] .case-cle input')
  await Promise.all([p.waitForNavigation({ timeout: 20000 }), p.click('dialog[open] [data-a="remplacer"]')])
  await pret(p); await p.waitForTimeout(800)
  f = await ficheDe(p); m = await toasts(p)
  ok(!f.cle && m.includes('Classeur ouvert : 1 page.') && (await p.evaluate(() => window.__appels.filter(a => a.quoi === 'request').length)) === 0,
    '   … la case décochée : « Classeur ouvert : 1 page. », pas de clé, rien n\'est demandé', { f: f.cle, m })
  await ctx.close()
}

// =====================================================================
// O. OUVRIR PAR showOpenFilePicker
// =====================================================================
if (seul('O')) {
  console.log('\n=== O. Ouvrir un classeur : showOpenFilePicker, son AbortError, ses autres erreurs ===')
  const ctx = await contexte()
  const p = await ouvrir(ctx, '', 'O')
  // AbortError (on a renoncé) : rien, pas le choix de fichier d'avant
  await p.evaluate(() => { window.__ouvrirPanne = 'AbortError' })
  let fc = p.waitForEvent('filechooser', { timeout: 1500 }).then(() => true, () => false)
  await entree(p, 'ouvrir')
  ok(!(await fc) && (await dialogues(p)).length === 0 && (await toasts(p)).length === 0, 'O1) showOpenFilePicker rejette AbortError (on a renoncé) : rien (ni fenêtre, ni message, ni l\'ancien choix de fichier)')
  // Une autre erreur (une page intégrée…) : le choix de fichier d'avant
  await p.evaluate(() => { window.__ouvrirPanne = 'SecurityError' })
  fc = p.waitForEvent('filechooser', { timeout: 3000 }).then(x => x, () => null)
  await entree(p, 'ouvrir')
  const choix = await fc
  ok(!!choix, 'O2) une autre erreur (SecurityError) : le choix de fichier d\'avant')
  if (choix) {
    writeFileSync(ICI + 'o-un.memc', faireMemc(Y.encodeStateAsUpdate(unClasseur(1, 2, 'O')), { date: 1_791_000_000_000, pages: 1, nom: 'Par le champ' }))
    await choix.setFiles(ICI + 'o-un.memc')
    await p.waitForSelector('dialog[open] [data-a="remplacer"]', { timeout: 10000 })
    const d = (await dialogues(p))[0]
    ok(d.case === null, '   … le fichier s\'ouvre ; sans poignée, pas de case', d)
    await p.click('dialog[open] [data-a="annuler"]')
  }
  // Un fichier qui n'est pas un classeur, lu par le travailleur : son message
  await p.evaluate(() => { window.__ouvrirPanne = null; window.__aOuvrir = 'pas-un.memc' })
  await opfsEcrire(p, 'pas-un.memc', Buffer.from('{"format":"mem-revoir","v":1}\nrien'))
  await entree(p, 'ouvrir'); await p.waitForTimeout(800)
  let msg = await toasts(p)
  ok(msg.some(t => t.startsWith('Ce fichier est un film pour les élèves (.mem)')) && (await dialogues(p)).length === 0, 'O3) un film élève : son message (lu dans le travailleur), aucune fenêtre', msg)
  await opfsEcrire(p, 'pas-un.memc', Buffer.from('bonjour\n'))
  await entree(p, 'ouvrir'); await p.waitForTimeout(800)
  msg = await toasts(p)
  ok(msg.includes('Ce fichier n\'est pas un classeur enregistré par MEM teachingtool (fichier .memc).'), '   … un fichier quelconque : « Ce fichier n\'est pas un classeur enregistré par MEM teachingtool (fichier .memc). »', msg)
  const abime = faireMemc(Y.encodeStateAsUpdate(unClasseur(1, 2, 'Z')), { date: 1, pages: 1 })
  abime[abime.length - 20] ^= 0xff
  await opfsEcrire(p, 'pas-un.memc', abime)
  await entree(p, 'ouvrir'); await p.waitForTimeout(800)
  msg = await toasts(p)
  ok(msg.includes('Ce fichier .memc est abîmé : il ne peut pas être ouvert. Le classeur actuel n\'a pas changé.'), '   … un .memc abîmé (un octet changé) : « Ce fichier .memc est abîmé… »', msg)
  const mode = await p.evaluate(() => window.__ecrivain.mode)
  ok(mode === 'travailleur', `   … l'écrivain est resté dans son travailleur (mode ${mode})`)
  await ctx.close()
}

// =====================================================================
// D. DEUX ONGLETS, DEUX CLASSEURS
// =====================================================================
if (seul('D')) {
  console.log('\n=== D. deux onglets sur un classeur ; deux classeurs, deux fichiers ===')
  const ctx = await contexte()
  const a = await ouvrir(ctx, '', 'D-a')
  await a.evaluate(() => { window.__nomChoisi = 'cours.memc' })
  await entree(a, 'activer-cle')
  await attendreEcrites(a, 1); await a.waitForTimeout(300)
  const b = await ouvrir(ctx, '', 'D-b')
  await b.waitForFunction(() => window.__cle.etat.etat === 'autre-onglet', null, { timeout: 5000 }).catch(() => {})
  let eb = await etat(b)
  ok(eb.cle.etat === 'autre-onglet' && eb.court === 'Clé : par l\'autre onglet' && eb.lignes[0] === 'Sur la clé : c\'est l\'autre onglet ouvert sur ce classeur qui enregistre' && !eb.bandeau,
    `D1) le second onglet sur le même classeur n'écrit pas : « ${eb.court} », « ${eb.lignes[0]} »`, eb)
  const verrous = await b.evaluate(async () => (await navigator.locks.query()).held.map(l => l.name).concat((await navigator.locks.query()).pending.map(l => 'attente:' + l.name)))
  const idA = await a.evaluate(() => window.__app.classeur.id)
  ok(verrous.includes('mem-teachingtool-cle:' + idA) && verrous.includes('attente:mem-teachingtool-cle:' + idA), '   … Web Locks : le premier tient « mem-teachingtool-cle:<id> », le second attend', verrous)
  // Le second annonce ses changements (au plus toutes les 5 s) ; le premier les écrit
  await a.evaluate(() => { window.__annonces = []; const c = new BroadcastChannel('mem-teachingtool-classeur'); c.onmessage = e => { if (e.data?.type === 'change') window.__annonces.push(Date.now()) } })
  const na = await nbEcrites(a)
  for (let i = 0; i < 6; i++) await ecrire(b, 300 + i * 20, 250 + i * 15, 4)
  const idB = (await formesIds(b)).at(-1)
  await b.waitForTimeout(6500)
  const annonces = await a.evaluate(() => window.__annonces)
  ok(annonces.length >= 1 && annonces.length <= 3 && annonces.every((t, i) => i === 0 || t - annonces[i - 1] >= 4900), `   … six traits dans le second : ${annonces.length} annonce(s) { type: change } (au plus toutes les 5 s)`, annonces)
  ok(await attendreEcrites(a, na + 1, 40000), '   … le premier écrit la clé')
  await a.waitForTimeout(300)
  let lu = lireMemc(await opfsLire(a, 'cours.memc'))
  ok(lu.ids.includes(idB) && (await b.evaluate(() => window.__ecritures.length)) === 0, '   … avec les traits du second (lus dans la base) ; le second n\'a rien écrit', { ids: lu.ids, idB })
  // Le premier en pause (le navigateur redemande l'accord) : le second le dit, sans prétendre que la clé est à jour
  await a.evaluate(() => { window.__permission = 'prompt' })
  await ecrire(a, 600, 200)
  await a.waitForFunction(() => window.__cle.etat.etat === 'permission', null, { timeout: 40000 }).catch(() => {})
  await b.waitForFunction(() => window.__cle.etat.etat === 'erreur', null, { timeout: 5000 }).catch(() => {})
  eb = await etat(b)
  const protegeB = await b.evaluate(() => window.__surveillance.texte.niveau)
  ok(eb.court === 'Clé : pas à jour' && eb.lignes[0] === 'Sur la clé : l\'autre onglet ouvert sur ce classeur attend votre accord pour écrire sur la clé (son bandeau : « Reprendre l\'enregistrement sur la clé »)' && !eb.bandeau && protegeB === 'attention',
    `D1b) le premier onglet en pause : le second le dit (« ${eb.court} », « ${eb.lignes[0]} »), sans bouton ici`, { eb, protegeB })
  const na2 = await nbEcrites(a)
  await a.bringToFront()
  await a.click('.bouton-bandeau[data-etat-action="reprendre-cle"]')
  ok(await attendreEcrites(a, na2 + 1, 15000), '   … [Reprendre l\'enregistrement sur la clé] dans le premier : il écrit (avec son dernier trait)')
  await b.waitForFunction(() => window.__cle.etat.etat === 'autre-onglet', null, { timeout: 5000 }).catch(() => {})
  eb = await etat(b)
  ok(eb.cle.etat === 'autre-onglet' && eb.court === 'Clé : par l\'autre onglet', '   … et le second revient à « Clé : par l\'autre onglet »', eb)
  await b.bringToFront()
  // Le premier se ferme : le second prend la suite (sa mémoire n'a pas le
  // dernier trait du premier, la base l'a : pas de faux conflit)
  await a.close()
  await b.waitForFunction(() => window.__cle.etat.etat === 'ok', null, { timeout: 10000 }).catch(() => {})
  eb = await etat(b)
  await b.waitForTimeout(1500)
  const repriseEcrit = await nbEcrites(b)
  ok(eb.cle.etat === 'ok' && eb.court.startsWith('Clé : ') && repriseEcrit === 0, `D2) le premier onglet se ferme : le second prend la suite (« ${eb.court} ») ; tout ce qu'il avait est déjà sur la clé, il n'écrit rien de plus`, { eb, repriseEcrit })
  const nb = await nbEcrites(b)
  await ecrire(b, 500, 400)
  const idB2 = (await formesIds(b)).at(-1)
  ok(await attendreEcrites(b, nb + 1, 40000), '   … et écrit ses changements')
  await b.waitForTimeout(300)
  lu = lireMemc(await opfsLire(b, 'cours.memc'))
  ok(lu.ids.includes(idB2) && lu.ids.includes(idB), '   … le fichier a tout', lu.ids)
  // Deux classeurs, deux fichiers
  const C = await creer(b, 'Fractions')
  const c = await ouvrir(ctx, '?classeur=' + C.id, 'D-c')
  // Le fichier du premier classeur : refusé (il sert déjà)
  await c.evaluate(() => { window.__nomChoisi = 'cours.memc' })
  await entree(c, 'activer-cle'); await c.waitForTimeout(600)
  let msg = await toasts(c)
  ok(msg.includes('Ce fichier sert déjà à l\'enregistrement automatique de « Premier classeur » : choisissez un autre nom.') && (await etat(c)).cle.etat === 'absente',
    'D3) un second classeur ne peut pas prendre le fichier du premier : « Ce fichier sert déjà à l\'enregistrement automatique de « Premier classeur »… »', msg)
  await c.evaluate(() => { window.__nomChoisi = 'fractions.memc' })
  await entree(c, 'activer-cle')
  await attendreEcrites(c, 1); await c.waitForTimeout(300)
  await ecrire(c, 300, 300); await ecrire(b, 320, 460)
  const ncC = await nbEcrites(c), ncB = await nbEcrites(b)
  ok(await attendreEcrites(c, ncC + 1, 40000) && await attendreEcrites(b, ncB + 1, 40000), '   … un autre fichier : chaque classeur écrit le sien, depuis son onglet')
  await c.waitForTimeout(300)
  const lc = lireMemc(await opfsLire(c, 'fractions.memc')), lb = lireMemc(await opfsLire(b, 'cours.memc'))
  ok(lc.entete.id === C.id && lc.entete.nom === 'Fractions' && lb.entete.id === idA && lc.ids.every(i => !lb.ids.includes(i)), '   … deux fichiers, deux classeurs', { c: lc.entete, b: lb.entete })
  await ctx.close()
}

// =====================================================================
// G. 60 PAGES (18 Mo)
// =====================================================================
if (seul('G')) {
  console.log('\n=== G. 60 pages de 300 traits : sans tâche longue ===')
  const ctx = await contexte()
  const p0 = await ouvrir(ctx, '', 'G0')
  const G = await creer(p0, 'Soixante pages')
  await p0.close()
  const p = await ouvrir(ctx, '?classeur=' + G.id, 'G')
  const t0 = Date.now()
  await p.evaluate(async () => {
    const t = window.__app.tableau
    const attendre = ms => new Promise(r => setTimeout(r, ms))
    const trait = (x, y) => { const pts = []; for (let i = 0; i < 60; i++) pts.push(i * 6 + Math.random(), Math.sin(i / 3) * 30 + Math.random(), 0.5); return { id: 'T' + Math.random().toString(36).slice(2), type: 'trait', x, y, z: Date.now(), auteur: t.moi, pts, couleur: '#1b2230', taille: 4, opacite: 1, pression: false } }
    let page = t.ordre.get(0)
    for (let k = 0; k < 60; k++) {
      if (k) page = t.ajouterPage('carreaux', k)
      t.pageVue = page
      t.doc.transact(() => { for (let i = 0; i < 300; i++) t.poser(page, trait((i % 20) * 40, Math.floor(i / 20) * 40)) })
      await attendre(0)
    }
    await t.attendreEcritures(); await attendre(2000); await t.attendreEcritures()
  })
  console.log(`   (60 pages posées en ${Math.round((Date.now() - t0) / 1000)} s)`)
  await p.reload(); await pret(p); await p.waitForTimeout(3000)
  await p.evaluate(() => { window.__nomChoisi = 'soixante.memc' })
  await entree(p, 'activer-cle')
  ok(await attendreEcrites(p, 1, 90000), 'G1) l\'activation sur 60 pages : la première écriture')
  await p.waitForTimeout(500)
  await p.evaluate(() => {
    window.__longues = []
    new PerformanceObserver(l => { for (const e of l.getEntries()) window.__longues.push({ debut: Math.round(e.startTime), duree: Math.round(e.duration) }) }).observe({ type: 'longtask', buffered: false })
  })
  await p.evaluate(() => { setTimeout(() => { const t = performance.now(); while (performance.now() - t < 150) { /* occupé */ } }, 0) })
  await p.waitForTimeout(400)
  const temoin = await p.evaluate(() => window.__longues.splice(0))
  ok(temoin.some(e => e.duree >= 140), '   … le témoin : l\'observateur des tâches longues voit une tâche de 150 ms', temoin)
  // Une écriture automatique, seule
  let n = await nbEcrites(p)
  await ecrire(p, 300, 300)
  const debutSeule = await p.evaluate(() => performance.now()) + 1000
  await attendreEcrites(p, n + 1, 60000); await p.waitForTimeout(800)
  const seules = (await p.evaluate(() => window.__longues)).filter(e => e.debut >= debutSeule)
  ok(!seules.some(e => e.duree > 100), `G2) une écriture automatique sur 60 pages : aucune tâche de plus de 100 ms (la plus longue : ${Math.max(0, ...seules.map(e => e.duree))} ms ; ${seules.length} au-delà de 50 ms)`, seules)
  n = await nbEcrites(p)
  const debut = await p.evaluate(() => performance.now())
  await ecrire(p, 300, 300)
  // Pendant que l'écriture automatique tourne (vers 20 s), on continue d'écrire
  const tEcr = Date.now()
  let pendantTraits = 0
  while (await nbEcrites(p) === n && Date.now() - tEcr < 60000) {
    if (Date.now() - tEcr > 19500 && pendantTraits < 6) { await ecrire(p, 300 + pendantTraits * 30, 420, 6); pendantTraits++ }
    await p.waitForTimeout(250)
  }
  await attendreEcrites(p, n + 1, 60000); await p.waitForTimeout(500)
  const longues = (await p.evaluate(() => window.__longues)).filter(e => e.debut >= debut)
  const w = await p.evaluate(() => window.__ecritures.at(-1))
  const v = await p.evaluate(async () => {
    const f = await (await (await navigator.storage.getDirectory()).getFileHandle('soixante.memc')).getFile()
    const lu = (await import('/src/fichier.ts')).lireTableau(new Uint8Array(await f.arrayBuffer()))
    return { pages: lu.pages, taille: f.size }
  })
  ok(v.pages === 60 && v.taille > 15_000_000, `   … une autre, en écrivant pendant qu'elle tourne : le fichier relu a ses 60 pages (${(v.taille / 1048576).toFixed(1)} Mo, écrit en ${w.fin - w.debut} ms)`, v)
  ok(!longues.some(e => e.duree > 100), `   … aucune tâche de plus de 100 ms pendant ce temps, en écrivant (la plus longue : ${Math.max(0, ...longues.map(e => e.duree))} ms ; ${longues.length} au-delà de 50 ms)`, longues)
  // Ouvrir ce fichier de 18 Mo (dans un autre classeur) : lu dans le travailleur
  const H = await creer(p, 'Vide')
  const q = await ouvrir(ctx, '?classeur=' + H.id, 'G-ouvrir')
  await q.evaluate(() => {
    window.__longues = []
    new PerformanceObserver(l => { for (const e of l.getEntries()) window.__longues.push({ debut: Math.round(e.startTime), duree: Math.round(e.duration) }) }).observe({ type: 'longtask', buffered: false })
  })
  const dq = await q.evaluate(() => performance.now())
  await q.evaluate(() => { window.__aOuvrir = 'soixante.memc' })
  await entree(q, 'ouvrir')
  // (C9 : ce fichier est celui d'un classeur de la bibliothèque : la fenêtre le reconnaît)
  await q.waitForSelector('dialog[open] [data-a="annuler"]', { timeout: 60000 })
  const lq = (await q.evaluate(() => window.__longues)).filter(e => e.debut >= dq)
  const dd = (await dialogues(q))[0]
  ok(/^« soixante\.memc » : 60 pages, enregistré /.test(dd.texte) && !lq.some(e => e.duree > 100),
    `G3) ouvrir le fichier de 18 Mo : « Ouvrir ce classeur ? » (60 pages), sans tâche de plus de 100 ms (la plus longue : ${Math.max(0, ...lq.map(e => e.duree))} ms)`, { dd, lq })
  await q.click('dialog[open] [data-a="annuler"]')
  await ctx.close()
}

// (B. L'histoire perdue, la version d'avant sur la même origine : retirée en
// rangeant la batterie dans le dépôt ; la version d'avant se construisait depuis
// un commit qui n'existe plus.)

// =====================================================================
// F. LA VERSION D'UN SEUL FICHIER, EN file://
// =====================================================================
if (seul('F')) {
  console.log('\n=== F. la version d\'un seul fichier (dist/index.html) en file:// ===')
  const ctx = await nav.newContext({ viewport: { width: 1366, height: 768 } })
  await ctx.addInitScript(ECOUTER_TOASTS)
  await ctx.addInitScript(() => {
    window.__natif = { save: typeof window.showSaveFilePicker, open: typeof window.showOpenFilePicker, locks: !!navigator.locks, secure: isSecureContext }
    // Les travailleurs créés par la page
    window.__travailleurs = []
    const W = window.Worker
    window.Worker = class extends W { constructor(u, o) { super(u, o); window.__travailleurs.push(String(u).slice(0, 5)) } }
    // Une poignée factice, en mémoire (l'OPFS est refusé en file://)
    window.__memoire = { octets: new Uint8Array(0), ecritures: 0 }
    const poignee = nom => {
      const h = {
        name: nom, kind: 'file',
        getFile: async () => new File([window.__memoire.octets], nom),
        createWritable: async () => {
          const morceaux = []
          return {
            write: async b => { morceaux.push(new Uint8Array(await b.arrayBuffer())) },
            close: async () => { const n = morceaux.reduce((s, m) => s + m.length, 0), o = new Uint8Array(n); let i = 0; for (const m of morceaux) { o.set(m, i); i += m.length } window.__memoire.octets = o; window.__memoire.ecritures++ },
            abort: async () => {},
          }
        },
        isSameEntry: async x => x === h,
      }
      return h
    }
    window.showSaveFilePicker = async o => poignee(o.suggestedName)
  })
  const p = await ctx.newPage(); suivre(p, 'F')
  await p.goto('file://' + R + '/dist/index.html')
  await p.waitForFunction(() => document.querySelector('.rang')?.textContent?.includes('/'), null, { timeout: 30000 }); await p.waitForTimeout(1500)
  const natif = await p.evaluate(() => window.__natif)
  ok(natif.save === 'function' && natif.open === 'function' && natif.locks && natif.secure, 'F1) file:// dans Chromium : showSaveFilePicker, showOpenFilePicker, Web Locks, contexte sûr', natif)
  const m = await menu(p)
  ok(m.entrees.includes('activer-cle'), '   … l\'entrée « Enregistrer automatiquement dans un fichier… »', m.entrees)
  await fermerMenu(p)
  await entree(p, 'activer-cle')
  await p.waitForFunction(() => window.__memoire.ecritures >= 1, null, { timeout: 30000 }).catch(() => {})
  await p.waitForTimeout(500)
  let msg = await toasts(p)
  const mem = await p.evaluate(() => { const o = window.__memoire.octets; let s = ''; for (let i = 0; i < o.length; i += 0x8000) s += String.fromCharCode.apply(null, o.subarray(i, i + 0x8000)); return btoa(s) })
  const lu = lireMemc(Buffer.from(mem, 'base64'))
  ok(msg.includes('Le classeur s\'enregistre maintenant tout seul dans « Premier classeur.memc ». Après un rechargement, il faudra choisir de nouveau le fichier.') && lu.entier && /^[0-9a-f]{16}$/.test(lu.entete.id),
    'F2) l\'activation : la poignée ne se range pas (DataCloneError, rattrapé) : « … Après un rechargement, il faudra choisir de nouveau le fichier. » ; le fichier écrit', msg)
  const tr = await p.evaluate(() => window.__travailleurs)
  ok(tr.length >= 1 && tr.every(u => u === 'blob:'), `   … l'écriture par le travailleur intégré (${tr.join(', ')})`, tr)
  const verrous = await p.evaluate(async () => (await navigator.locks.query()).held.map(l => l.name))
  ok(verrous.includes('mem-teachingtool-cle:' + lu.entete.id), '   … Web Locks : « mem-teachingtool-cle:<id> » tenu', verrous)
  await ecrire(p, 300, 300)
  await p.waitForFunction(() => window.__memoire.ecritures >= 2, null, { timeout: 40000 }).catch(() => {})
  ok(await p.evaluate(() => window.__memoire.ecritures) >= 2, '   … un trait : l\'écriture automatique, 20 s après')
  const court = await p.evaluate(() => (document.querySelector('.etat-classeur')?.textContent || '').replace(/[  ]/g, ' '))
  ok(court === 'Clé : à l\'instant' || /^Clé : il y a/.test(court), `   … l'état : « ${court} »`)
  await p.reload()
  await p.waitForFunction(() => document.querySelector('.rang')?.textContent?.includes('/'), null, { timeout: 30000 }); await p.waitForTimeout(1500)
  const m2 = await menu(p)
  ok(m2.cle[0]?.texte === 'Sur la clé : le fichier « Premier classeur.memc » est à choisir de nouveau (ce navigateur ne le garde pas après un rechargement)' && m2.entrees.includes('activer-cle'),
    '   … rechargé : « le fichier … est à choisir de nouveau », et l\'entrée pour le choisir', m2.cle)
  await fermerMenu(p)
  await ctx.close()
}

// =====================================================================
// N. FIREFOX, L'iPAD : PAS DE showSaveFilePicker
// =====================================================================
if (seul('N')) {
  console.log('\n=== N. Firefox, Safari, l\'iPad (pas de showSaveFilePicker) ===')
  const ctx = await nav.newContext({ viewport: { width: 1024, height: 768 } })
  await ctx.addInitScript(() => { delete window.showSaveFilePicker; delete window.showOpenFilePicker; try { delete Window.prototype.showSaveFilePicker; delete Window.prototype.showOpenFilePicker } catch { /* rien */ } window.showSaveFilePicker = undefined; window.showOpenFilePicker = undefined })
  const p = await ouvrir(ctx, '', 'N')
  const m = await menu(p)
  const e = await etat(p)
  ok(!m.entrees.includes('activer-cle') && m.cle[0]?.texte === 'Ce navigateur ne sait pas enregistrer tout seul dans un fichier : enregistrez le classeur (Ctrl + S) de temps en temps.' && await p.evaluate(() => window.__surveillance.etat.cle.etat === 'impossible' && window.__cle.disponible === false),
    'N1) pas d\'entrée ; « Ce navigateur ne sait pas enregistrer tout seul dans un fichier… »', { m, e })
  await fermerMenu(p)
  const fc = p.waitForEvent('filechooser', { timeout: 3000 }).then(() => true, () => false)
  await entree(p, 'ouvrir')
  ok(await fc, '   … Ouvrir un classeur : le choix de fichier d\'avant')
  await ctx.close()
}

// ESSAI-SUITE
console.log(`\nErreurs JS : ${erreurs.length}`)
ok(erreurs.length === 0, 'aucune erreur JS', erreurs)
await nav.close()
console.log(echecs ? `\n${echecs} ÉCHEC(S)` : '\nTout est vert.')
process.exit(echecs ? 1 : 0)
