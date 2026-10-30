// ESSAI DU MORCEAU C9-fichiers (lot 4) : ouvrir un classeur (l'ajouter, le
// reconnaître, le mettre à jour sans perte, ou remplacer), plusieurs
// fichiers et le glisser ; toute la bibliothèque dans un .memb.
// Sans fenêtre : showSaveFilePicker et showOpenFilePicker rendent des
// poignées de l'OPFS (navigator.storage.getDirectory()) ; les permissions
// sont simulées (accordées). L'OPFS est à chaque profil : pour passer un
// fichier d'un profil à l'autre, ses octets passent par Node.
// A. Un fichier nouveau : la fenêtre (texte, boutons, focus), « Ajouter à la
//    bibliothèque » (son id, son nom, le dossier qu'on regarde, l'arrivée),
//    « Remplacer « … »… » (la question du lot 1), un .memc d'avant le lot 4
//    (son nom d'après le nom du fichier) ; les menus (l'aide, « Ouvrir… »,
//    Ctrl + O dans la bibliothèque, la bibliothèque seule).
// B. Le même classeur : égal (« Ouvrir celui de la bibliothèque »), plus
//    récent (« Mettre à jour le classeur » : la base garde tout, une entrée
//    de plus, le film dans l'ordre ; ouvert ici : rechargé), divergent
//    (« Ajouter comme copie », « Remplacer celui de la bibliothèque… ») ;
//    dans la corbeille (un id neuf).
// C. « Mettre à jour » quand un autre onglet a écrit entre-temps : on bascule
//    sur « ont changé chacun de leur côté », rien n'est perdu.
// D. Plusieurs fichiers (la fenêtre qui dit tout, le bilan) ; le glisser sur
//    la bibliothèque (le cadre) et sur le tableau ; un .mem, un fichier
//    quelconque.
// E. Toute la bibliothèque : enregistrer (le zip, unzip -t, l'index), ouvrir
//    dans un AUTRE profil (dossiers, étiquettes, aperçus), rouvrir (déjà là,
//    pas touchés), la case des plus récents, un .memb tronqué, un .memc
//    abîmé au milieu, le quota dépassé au milieu.
// (F. Avec la version d'avant : retirée, voir plus bas.)
// G. Le conflit de la clé : [Ouvrir le fichier de la clé], « Mettre à jour »,
//    la clé reprend.
// H. 30 classeurs dont un de 60 pages : enregistrer et ouvrir la
//    bibliothèque, aucune tâche de plus de 100 ms.
// I. Firefox (sans les choix de fichiers) : le choix d'avant, plusieurs, et
//    le téléchargement ; l'iPad (sans accept).
// J. Pendant la revue : refusé.
// K. La version d'un seul fichier (file://) : Ctrl + O, Ajouter.
// Il faut avoir construit les deux versions (npm run build, npm run
// build:pages) ; tout.sh le fait.
import { RACINE_ESSAIS, RACINE_DEPOT } from '../commun/racines.mjs'
import { lancerPersistant } from '../commun/playwright.mjs'
import * as Y from 'yjs'
import { gunzipSync, gzipSync } from 'node:zlib'
import { execFileSync, spawn } from 'node:child_process'
import { mkdirSync, symlinkSync, unlinkSync, writeFileSync } from 'node:fs'

const S = `${RACINE_ESSAIS}`
const R = `${RACINE_DEPOT}`
const ICI = S + '/lot4/C9/'
const TRAVAIL = ICI + 'travail/'
const SITE = ICI + 'site/'
const DEV = process.env.DEV ?? 'http://localhost:5173/'
const O = 'http://127.0.0.1:4306'
const PREFIXE = 'mem-teachingtool-classeur-'
mkdirSync(TRAVAIL, { recursive: true })

let echecs = 0
const ok = (c, m, detail) => { if (!c) echecs++; console.log(c ? '✓' : '✗ ÉCHEC', m, !c && detail !== undefined ? '— ' + JSON.stringify(detail).slice(0, 1800) : '') }
const dort = ms => new Promise(r => setTimeout(r, ms))
const norm = t => (t || '').replace(/[  ]/g, ' ')
const seul = section => process.argv.length <= 2 || process.argv.slice(2).includes(section)

const erreurs = []
const suivre = (p, nom) => {
  p.on('pageerror', e => erreurs.push(`${nom}: ${e.message}`))
  p.on('console', m => { if (m.type() === 'error' && !/Failed to load resource|ERR_CERT|net::/.test(m.text())) erreurs.push(`${nom}: ${m.text()}`) })
}
const pret = p => p.waitForFunction(() => (window.__surveillance && window.__fichiers && document.querySelector('.rang')?.textContent?.includes('/'))
  || (window.__fichiers && !window.__app && !document.querySelector('.bibliotheque').hidden), null, { timeout: 30000 })

/** Les poignées de l'OPFS, les permissions simulées, les choix notés */
const INIT = () => {
  window.__choix = []
  window.__aOuvrir = null
  window.__nomChoisi = null
  window.__requetes = []
  const H = window.FileSystemHandle?.prototype
  if (!H) return
  H.queryPermission = async function () { return 'granted' }
  H.requestPermission = async function () { window.__requetes.push({ actif: navigator.userActivation.isActive }); return 'granted' }
  window.showSaveFilePicker = async o => {
    const dir = await navigator.storage.getDirectory()
    const nom = window.__nomChoisi || o?.suggestedName || 'sans-nom'
    window.__nomChoisi = null
    window.__choix.push({ quoi: 'save', nom, o: JSON.parse(JSON.stringify(o ?? {})), actif: navigator.userActivation.isActive })
    return dir.getFileHandle(nom, { create: true })
  }
  window.showOpenFilePicker = async o => {
    const dir = await navigator.storage.getDirectory()
    const noms = [].concat(window.__aOuvrir ?? [])
    window.__aOuvrir = null
    window.__choix.push({ quoi: 'open', noms, o: JSON.parse(JSON.stringify(o ?? {})) })
    if (!noms.length) throw new DOMException('rien', 'AbortError')
    return Promise.all(noms.map(n => dir.getFileHandle(n)))
  }
}
const ECOUTER_TOASTS = () => {
  window.__toasts = []
  let dernier = ''
  setInterval(() => { const t = [...document.querySelectorAll('.toast')].map(x => x.textContent).join('|').replace(/[  ]/g, ' '); if (t && t !== dernier) { dernier = t; window.__toasts.push(t) } }, 15)
}
const toasts = p => p.evaluate(() => window.__toasts.splice(0))
const attendreToast = (p, re, timeout = 20000) => p.waitForFunction(s => (window.__toasts || []).some(t => new RegExp(s).test(t)), re.source, { timeout }).then(() => true, () => false)

/** Les outils de la page (en développement) : des classeurs, leurs fichiers, leurs bases */
const OUTILS = () => {
  const trait = (auteur, x, y, id) => ({ id: id ?? 'T' + Math.random().toString(36).slice(2), type: 'trait', x, y, z: Date.now() + Math.random(), auteur, pts: [0, 0, 0.5, 40, 5, 0.5, 80, 0, 0.5], couleur: '#1b2230', taille: 3, opacite: 1, pression: false })
  /** Un état neuf : une page, des traits (ids donnés) */
  window.__etat = async (ids = []) => {
    const { Tableau } = await import('/src/document.ts'), fichier = await import('/src/fichier.ts')
    const t = new Tableau(null)
    const a = t.ajouterPage('carreaux', 0); await Promise.resolve(); t.pageVue = a
    for (const id of ids) { t.nouveauGeste(); t.poser(a, trait(t.moi, 10, 10, id)); await Promise.resolve() }
    const { etat } = fichier.lireTableau(new Uint8Array(await fichier.ecrireTableau(t.doc).arrayBuffer()))
    t.doc.destroy()
    return etat
  }
  /** Des classeurs comme les crée la bibliothèque, chacun avec ses traits */
  window.__creer = async (liste) => {
    const dem = await import('/src/classeurs/demarrage.ts'), bases = await import('/src/classeurs/bases.ts')
    const T = Date.now(), r = []
    for (const o of liste) {
      const etat = await window.__etat(o.traits ?? [])
      const id = o.id ?? dem.idClasseur(), nom = o.nom
      const fiche = { id, base: dem.baseDe(id), nom, dossier: o.dossier ?? null, etiquettes: o.etiquettes ?? [], cree: T - 3600e3, modifie: T - 600e3, ouvert: 0, pages: 1 }
      await window.__registre.creerClasseur(fiche, b => bases.creerBase(b, etat, { id, nom }))
      r.push(id)
    }
    return r
  }
  window.__dossier = async (nom, o = {}) => {
    const dem = await import('/src/classeurs/demarrage.ts')
    const d = { id: o.id ?? dem.idClasseur(), nom, parent: o.parent ?? null, couleur: o.couleur ?? '#3b6fb6', cree: Date.now(), ...(o.etiquette ? { etiquette: o.etiquette } : {}) }
    await window.__registre.ajouterDossier(d)
    return d.id
  }
  /** Le .memc d'un classeur, fabriqué depuis sa base, rangé dans l'OPFS */
  window.__memcDe = async (id, nomFichier, date = Date.now()) => {
    const f = await window.__registre.classeur(id)
    const { fabriquerFichier } = await import('/src/classeurs/ecrivain.ts')
    const { fichier } = await fabriquerFichier(f.base, { nom: f.nom, id: f.id }, date)
    await window.__opfsEcrire(nomFichier, fichier)
    return fichier.size
  }
  /** Un .memc plus récent d'un classeur : sa base rejouée ailleurs (un autre
   *  appareil), des traits en plus ; sansId : un fichier d'avant le lot 4 */
  window.__memcPlusRecent = async (id, nomFichier, ids, o = {}) => {
    const f = await window.__registre.classeur(id)
    const b = await import('/src/classeurs/bases.ts'), fichier = await import('/src/fichier.ts'), pur = await import('/src/classeurs/ecrivain-pur.ts')
    const { Tableau } = await import('/src/document.ts')
    const { mises } = await b.lireMisesAJour(f.base)
    const { etat } = fichier.lireTableau(pur.fabriquer(mises, { date: 1 }).octets)
    const t = new Tableau(null)
    await window.__appliquer(t.doc, etat)
    const page = t.ordre.get(0); t.pageVue = page
    for (const x of ids) { t.nouveauGeste(); t.poser(page, trait(t.moi, 50, 50, x)); await Promise.resolve() }
    const blob = fichier.ecrireTableau(t.doc, o.date ?? Date.now(), o.sansId ? undefined : { nom: f.nom, id: f.id })
    t.doc.destroy()
    await window.__opfsEcrire(nomFichier, blob)
    return blob.size
  }
  window.__opfsEcrire = async (nom, blob) => {
    const h = await (await navigator.storage.getDirectory()).getFileHandle(nom, { create: true })
    const w = await h.createWritable(); await w.write(blob); await w.close()
  }
  window.__opfsB64 = async nom => {
    try {
      const f = await (await (await navigator.storage.getDirectory()).getFileHandle(nom)).getFile()
      const o = new Uint8Array(await f.arrayBuffer())
      let s = ''; for (let i = 0; i < o.length; i += 0x8000) s += String.fromCharCode.apply(null, o.subarray(i, i + 0x8000))
      return btoa(s)
    } catch { return null }
  }
  window.__opfsDepuisB64 = async (nom, b64) => window.__opfsEcrire(nom, new Blob([Uint8Array.from(atob(b64), c => c.charCodeAt(0))]))
  /** Ce que garde une base : ses entrées, ses formes, son film (sans rien écrire) */
  window.__examiner = async base => {
    const b = await import('/src/classeurs/bases.ts'), pur = await import('/src/classeurs/ecrivain-pur.ts')
    try {
      const { mises } = await b.lireMisesAJour(base)
      const x = pur.examinerMisesAJour(mises)
      return { entrees: x.entrees, formes: x.formes, pages: x.pages, film: x.film, incomplet: x.incomplet }
    } catch (e) { return { erreur: e.raison ?? e.message } }
  }
  /** La base en .memc (base64), pour la lire sous Node */
  window.__baseB64 = async base => {
    const b = await import('/src/classeurs/bases.ts'), pur = await import('/src/classeurs/ecrivain-pur.ts')
    const { mises } = await b.lireMisesAJour(base)
    const o = pur.fabriquer(mises, { date: 1 }).octets
    let s = ''; for (let i = 0; i < o.length; i += 0x8000) s += String.fromCharCode.apply(null, o.subarray(i, i + 0x8000))
    return btoa(s)
  }
  window.__bases = async () => (await indexedDB.databases()).map(d => d.name).sort()
}
/** Y.applyUpdate dans la page : le Tableau ne l'expose pas ; on passe par
 *  remplacerPar sur un document neuf en mémoire (lot 1 : la même opération) */
const APPLIQUER = () => {
  window.__appliquer = async (doc, etat) => {
    // Le paquet yjs de la page, par le module du document (qui l'importe)
    const vecteurs = await import('/src/classeurs/vecteurs.ts')
    if (!window.__Y) {
      const src = await (await fetch('/src/classeurs/vecteurs.ts')).text()
      const m = /from ["']([^"']*yjs[^"']*)["']/.exec(src)
      window.__Y = await import(m[1])
    }
    window.__Y.applyUpdate(doc, etat, 'film')
    return vecteurs
  }
}

const DIALOGUES = () => [...document.querySelectorAll('dialog[open]')].map(d => ({
  titre: d.querySelector('h2')?.textContent,
  textes: [...d.querySelectorAll('.corps > p')].map(p => (p.textContent || '').replace(/[  ]/g, ' ')),
  boutons: [...d.querySelectorAll('.actions button')].map(b => ({ a: b.dataset.a, t: (b.textContent || '').replace(/[\u00a0\u202f]/g, ' '), principal: b.classList.contains('principal') })),
  focus: document.activeElement?.dataset?.a ?? null,
  case: d.querySelector('.case input') ? { coche: d.querySelector('.case input').checked, texte: d.querySelector('.case span')?.textContent } : null,
}))
const dialogues = p => p.evaluate(DIALOGUES)
const dialogue = async (p, timeout = 30000) => { await p.waitForSelector('dialog[open]', { timeout }); await p.waitForTimeout(150); return (await dialogues(p))[0] }
const cliquer = (p, a) => p.click(`dialog[open] [data-a="${a}"]`)
const boutons = d => d?.boutons.map(b => b.t).join(' | ')

/** Un .memc lu sous Node */
function lireMemc(o) {
  const fin = o.indexOf(0x0a)
  const entete = JSON.parse(o.subarray(0, fin).toString('utf8'))
  const d = new Y.Doc({ gc: false })
  Y.applyUpdate(d, new Uint8Array(gunzipSync(o.subarray(fin + 1))))
  const ordre = d.getArray('ordre').toArray()
  const ids = ordre.flatMap(id => [...(d.getMap('pages').get(id)?.get('formes')?.keys() ?? [])])
  const film = d.getArray('film').toArray().map(e => e?.t ?? 0)
  return { entete, ids, pages: ordre.length, film, vecteur: Y.encodeStateVector(d), doc: d }
}
const enOrdre = l => l.every((t, i) => !i || t >= l[i - 1])
/** Un .memc fait sous Node : l'en-tête, puis l'état (gzip) */
function faireMemc(etat, entete) {
  const tete = Buffer.from(JSON.stringify({ format: 'mem-tableau', v: 1, app: 'MEM teachingtool', ...entete }) + '\n')
  return Buffer.concat([tete, gzipSync(Buffer.from(etat))])
}
/** Un classeur fait sous Node : une page, des traits */
function unClasseur(ids) {
  const d = new Y.Doc({ gc: false })
  const p = new Y.Map(); p.set('fond', 'carreaux')
  const f = new Y.Map()
  ids.forEach((id, j) => f.set(id, { id, type: 'trait', x: 10 * j, y: 10, z: j, auteur: 'essai', pts: [0, 0, 0.5, 30, 10, 0.5], couleur: '#1b2230', taille: 3, opacite: 1, pression: false }))
  p.set('formes', f)
  d.getMap('pages').set('p0', p)
  d.getArray('ordre').push(['p0'])
  d.getArray('film').push([{ t: Date.now(), page: 'p0' }])
  return d
}
const opfsLire = async (p, nom) => { const b = await p.evaluate(n => window.__opfsB64(n), nom); return b === null ? null : Buffer.from(b, 'base64') }
const opfsEcrire = (p, nom, octets) => p.evaluate(({ nom, b64 }) => window.__opfsDepuisB64(nom, b64), { nom, b64: Buffer.from(octets).toString('base64') })
const fiche = (p, id) => p.evaluate(id => window.__registre.classeur(id).then(f => f ? { ...f, vecteur: undefined, cle: f.cle ? { ...f.cle, vecteur: undefined } : undefined } : null), id)
const fiches = p => p.evaluate(() => window.__registre.classeurs().then(l => l.map(f => ({ id: f.id, nom: f.nom, base: f.base, dossier: f.dossier, etiquettes: f.etiquettes, pages: f.pages, recu: f.recu ?? null, corbeille: f.corbeille ?? null, cle: f.cle ? f.cle.nom : null }))))
const baseDeNode = async (p, base) => lireMemc(Buffer.from(await p.evaluate(b => window.__baseB64(b), base), 'base64'))

// lancerPersistant, et non chromium.launch : voir commun/playwright.mjs (la poignée de la clé relue depuis IndexedDB)
const nav = await lancerPersistant({ env: { ...process.env, LANG: 'C.UTF-8', LC_ALL: 'C.UTF-8' } })
async function contexte(o = {}) {
  const ctx = await nav.newContext({ viewport: { width: 1366, height: 768 }, ...o })
  await ctx.addInitScript(INIT)
  await ctx.addInitScript(ECOUTER_TOASTS)
  await ctx.addInitScript(OUTILS)
  await ctx.addInitScript(APPLIQUER)
  return ctx
}
async function ouvrir(ctx, chemin = '', nom = 'dev') {
  const p = await ctx.newPage(); suivre(p, nom)
  await p.goto(DEV + chemin); await pret(p); await p.waitForTimeout(300)
  return p
}
/** Ctrl + O, avec ces fichiers de l'OPFS à choisir */
async function ctrlO(p, noms) {
  await p.evaluate(n => { window.__aOuvrir = n }, noms)
  await p.keyboard.press('Control+o')
}
const ouvrirBiblio = async p => {
  await p.evaluate(() => { const b = document.querySelector('.bouton-classeur'); if (b && b.getClientRects().length) b.click(); else window.__app.ui.ouvrirBibliotheque() })
  await p.waitForFunction(() => window.__bibliotheque.ouvert && document.querySelectorAll('.grille-classeurs li, .biblio-vide-dossier:not([hidden]), .biblio-vide:not([hidden])').length > 0, null, { timeout: 10000 })
  await p.waitForTimeout(250)
}
const attendreChargement = async p => { await p.waitForEvent('load', { timeout: 30000 }).catch(() => {}); await pret(p); await p.waitForTimeout(400) }

// =====================================================================
// A. UN FICHIER NOUVEAU
// =====================================================================
if (seul('A')) {
  console.log('\n=== A. Un fichier nouveau : Ajouter, Remplacer, un .memc d\'avant le lot 4, les menus ===')
  const ctx = await contexte()
  const p = await ouvrir(ctx, '', 'A')
  // Un classeur d'une autre machine : un .memc fait sous Node, avec son id
  const D = Date.now() - 3 * 86400e3
  const autre = unClasseur(['N1', 'N2'])
  await opfsEcrire(p, 'Symétrie centrale 2026-10-07 14h05.memc', faireMemc(Y.encodeStateAsUpdate(autre), { date: D, pages: 1, nom: 'Symétrie centrale', id: 'a1a1a1a1a1a1a1a1' }))
  // Le menu ⋯ : l'aide d'« Ouvrir un classeur… »
  await p.click('.barre-haut .bouton.points'); await p.waitForTimeout(150)
  const aide = await p.evaluate(() => document.querySelector('.menu-flottant:not([hidden]) .menu-item[data-action="ouvrir"] small')?.textContent)
  await p.keyboard.press('Escape')
  ok(aide === 'Ajoute un classeur enregistré (.memc) à la bibliothèque, ou remplace celui-ci. Reprend aussi un ancien tableau (.prof).', 'A1) Le menu ⋯ : « Ouvrir un classeur… » (Ajoute un classeur enregistré (.memc) à la bibliothèque, ou remplace celui-ci. Reprend aussi un ancien tableau (.prof).)', aide)
  await ctrlO(p, 'Symétrie centrale 2026-10-07 14h05.memc')
  const d = await dialogue(p)
  const choix = await p.evaluate(() => window.__choix.at(-1))
  ok(choix?.o?.multiple === true && choix.o.id === 'mem-classeurs' && JSON.stringify(choix.o.types) === JSON.stringify([{ description: 'Classeur, bibliothèque ou ancien tableau (MEM teachingtool)', accept: { 'application/octet-stream': ['.memc', '.memb', '.prof'] } }]),
    'A2) Ctrl + O : showOpenFilePicker({ multiple: true, id: mem-classeurs, types : .memc, .memb et .prof })', choix)
  ok(d?.titre === 'Ouvrir ce classeur ?' && /^« Symétrie centrale 2026-10-07 14h05\.memc » : 1 page, enregistré le \S+ \d+(er)? \S+ \d{4} à \d+ h \d\d\.$/.test(d.textes[0]) && d.textes.length === 1,
    `A3) « Ouvrir ce classeur ? » : « ${d?.textes[0]} »`, d)
  ok(boutons(d) === 'Annuler | Remplacer « Premier classeur »… | Ajouter à la bibliothèque' && d.boutons[2].principal && !d.boutons[1].principal && d.focus === 'ajouter',
    '   … [Annuler] [Remplacer « Premier classeur »…] (secondaire) [Ajouter à la bibliothèque] (principal, le focus)', d)
  ok(d.case?.coche === true && d.case.texte === 'Enregistrer automatiquement les changements dans ce fichier', '   … la case de la clé (le fichier de showOpenFilePicker, son id libre), cochée', d.case)
  // Remplacer « … »… : la question du lot 1
  await cliquer(p, 'remplacer-ouvert')
  await p.waitForTimeout(400)
  const d2 = await dialogue(p)
  ok(d2?.titre === 'Ouvrir ce classeur ?' && /Il remplace le classeur « Premier classeur » de ce navigateur \(1 page\) et tout son historique\. Pour garder celui-ci, enregistrez-le d'abord\.$/.test(d2.textes[0])
    && boutons(d2) === 'Annuler | Enregistrer d\'abord | Remplacer' && d2.case?.coche === true,
    'A4) [Remplacer « Premier classeur »…] : la question du lot 1 (ce qui est remplacé, Enregistrer d\'abord, la case)', d2)
  await cliquer(p, 'annuler'); await p.waitForTimeout(200)
  // Ajouter à la bibliothèque : son id, son nom, à la racine (depuis le tableau), puis on y va
  await ctrlO(p, 'Symétrie centrale 2026-10-07 14h05.memc')
  await dialogue(p)
  const avantId = await p.evaluate(() => window.__app.classeur.id)
  await Promise.all([p.waitForEvent('load', { timeout: 30000 }), (async () => { await p.evaluate(() => { document.querySelector('dialog[open] .case input').checked = false }); await cliquer(p, 'ajouter') })()])
  await pret(p); await p.waitForTimeout(800)
  const ici = await p.evaluate(() => ({ id: window.__app.classeur.id, nom: window.__app.classeur.nom, formes: window.__app.formes.length, url: location.search }))
  const fa = await fiche(p, 'a1a1a1a1a1a1a1a1')
  const ta = await toasts(p)
  ok(ici.id === 'a1a1a1a1a1a1a1a1' && ici.nom === 'Symétrie centrale' && ici.formes === 2 && ici.url === '?classeur=a1a1a1a1a1a1a1a1',
    'A5) « Ajouter à la bibliothèque » : un nouveau classeur, sous l\'id et le nom du fichier, et l\'on y va (?classeur=…)', ici)
  ok(fa && fa.dossier === null && fa.recu === D && fa.pages === 1 && fa.modifie === D && !fa.cle && fa.base === PREFIXE + 'a1a1a1a1a1a1a1a1', '   … sa fiche : à la racine, reçu et modifié à la date du fichier, ses pages', fa)
  ok(ta.some(t => t.includes('Classeur ajouté à la bibliothèque : « Symétrie centrale » (1 page). L\'enregistrement automatique n\'est pas activé.') || t.includes('Classeur ajouté à la bibliothèque : « Symétrie centrale » (1 page).')), '   … à l\'arrivée : « Classeur ajouté à la bibliothèque : « Symétrie centrale » (1 page). »', ta)
  ok(await p.evaluate(id => window.__registre.classeur(id).then(f => !!f), avantId), '   … l\'ancien classeur est toujours là (rien n\'est remplacé)')
  ok(await p.evaluate(() => window.__surveillance.etat.fichier) === D, '   … et il est dans un fichier depuis la date de celui-ci (l\'état de la sauvegarde)', await p.evaluate(() => window.__surveillance.etat.fichier))
  // Dans le dossier qu'on regarde : la bibliothèque ouverte, un dossier, Ctrl + O, Ajouter (la case cochée : la clé)
  const dossier = await p.evaluate(() => window.__dossier('5e B', { etiquette: '5e B' }))
  await ouvrirBiblio(p)
  await p.evaluate(id => window.__bibliotheque.allerA(id), dossier); await p.waitForTimeout(300)
  await opfsEcrire(p, 'Fractions.memc', faireMemc(Y.encodeStateAsUpdate(unClasseur(['F1'])), { date: D, pages: 1, nom: 'Fractions', id: 'b2b2b2b2b2b2b2b2' }))
  // « Ouvrir… » du bandeau : son titre, puis le même choix
  const titreOuvrir = await p.evaluate(() => { const b = document.querySelector('.biblio-bouton[data-action="ouvrir-fichier"]'); return b && !b.hidden ? b.title : null })
  ok(titreOuvrir === 'Ouvrir un classeur ou une bibliothèque (Ctrl + O)', 'A6) Le bandeau : « Ouvrir… » (Ouvrir un classeur ou une bibliothèque (Ctrl + O))', titreOuvrir)
  await p.evaluate(() => { window.__aOuvrir = 'Fractions.memc' })
  await p.click('.biblio-bouton[data-action="ouvrir-fichier"]')
  // (Adapté au lot 7 : « Ouvrir… » montre d'abord la fenêtre « Ouvrir » ;
  // son « Choisir des fichiers… » est le choix d'avant)
  await p.click('dialog.dialogue-ouvrir-ailleurs[open] .a-fichiers')
  const d3 = await dialogue(p)
  ok(d3?.case?.coche === true, '   … la fenêtre, avec la case cochée', d3)
  await Promise.all([p.waitForEvent('load', { timeout: 30000 }), cliquer(p, 'ajouter')])
  await pret(p); await p.waitForTimeout(800)
  const fb = await fiche(p, 'b2b2b2b2b2b2b2b2')
  const tb = await toasts(p)
  const req = await p.evaluate(() => window.__requetes)
  ok(fb?.dossier === dossier && fb.cle?.nom === 'Fractions.memc' && fb.cle.date === D, 'A7) Ajouté dans le dossier qu\'on regardait (« 5e B ») ; la case cochée : le fichier devient celui de la clé', fb)
  ok(tb.some(t => t.includes('Classeur ajouté à la bibliothèque : « Fractions » (1 page). Il s\'enregistre automatiquement dans « Fractions.memc ».')), '   … « Il s\'enregistre automatiquement dans « Fractions.memc ». »', tb)
  ok(req.length === 0 || req.every(r => r.actif), '   … l\'accord demandé dans le clic', req)
  await p.waitForFunction(() => window.__cle?.etat.etat === 'ok', null, { timeout: 30000 }).catch(() => {})
  ok(await p.evaluate(() => window.__cle?.etat.etat) === 'ok', '   … et la clé est en marche à l\'arrivée', await p.evaluate(() => window.__cle?.etat))
  // Un .memc d'avant le lot 4 (sans nom ni id) : son nom d'après le nom du fichier
  await opfsEcrire(p, 'tableau-2026-10-07-14h05.memc', faireMemc(Y.encodeStateAsUpdate(unClasseur(['V1'])), { date: D, pages: 1 }))
  await ctrlO(p, 'tableau-2026-10-07-14h05.memc')
  const d4 = await dialogue(p)
  ok(boutons(d4).endsWith('Ajouter à la bibliothèque'), 'A8) Un .memc d\'avant le lot 4, d\'un autre tableau : nouveau', d4)
  await Promise.all([p.waitForEvent('load', { timeout: 30000 }), cliquer(p, 'ajouter')])
  await pret(p); await p.waitForTimeout(600)
  const nomV = await p.evaluate(() => window.__app.classeur.nom)
  ok(nomV === 'Tableau du 7 octobre 2026' && /^[0-9a-f]{16}$/.test(await p.evaluate(() => window.__app.classeur.id)), `   … il s'appelle « ${nomV} » (le nom du fichier), un id neuf`, nomV)
  // Ctrl + O dans la bibliothèque seule
  const s = await ouvrir(ctx, '?bibliotheque', 'A-seule')
  await opfsEcrire(s, 'Seul.memc', faireMemc(Y.encodeStateAsUpdate(unClasseur(['S1'])), { date: D, pages: 1, nom: 'Seul', id: 'c3c3c3c3c3c3c3c3' }))
  await ctrlO(s, 'Seul.memc')
  const d5 = await dialogue(s)
  ok(boutons(d5) === 'Annuler | Ajouter à la bibliothèque', 'A9) La bibliothèque seule : Ctrl + O, la fenêtre sans « Remplacer » (aucun classeur ouvert)', d5)
  await Promise.all([s.waitForEvent('load', { timeout: 30000 }), cliquer(s, 'ajouter')])
  await pret(s); await s.waitForTimeout(500)
  ok(await s.evaluate(() => window.__app?.classeur.id) === 'c3c3c3c3c3c3c3c3', '   … Ajouter : on y va')
  // Renoncer : rien
  await ctrlO(s, [])
  await s.waitForTimeout(600)
  ok((await dialogues(s)).length === 0, 'A10) Renoncer (AbortError) : rien')
  await ctx.close()
}

// =====================================================================
// B. LE MÊME CLASSEUR : ÉGAL, PLUS RÉCENT, DIVERGENT ; LA CORBEILLE
// =====================================================================
if (seul('B')) {
  console.log('\n=== B. Le même classeur : égal, plus récent, divergent ; la corbeille ===')
  const ctx = await contexte()
  const p = await ouvrir(ctx, '', 'B')
  const [X, Z] = await p.evaluate(() => window.__creer([{ nom: 'Symétrie', traits: ['X1', 'X2'] }, { nom: 'Pythagore', traits: ['Z1'] }]))
  await p.evaluate(id => window.__memcDe(id, 'symetrie.memc'), X)
  // Égal (il n'est pas ouvert ici)
  await ctrlO(p, 'symetrie.memc')
  let d = await dialogue(p)
  ok(d?.textes[1] && /^Ce classeur est déjà dans la bibliothèque : « Symétrie » \(modifié aujourd'hui à \d+ h \d\d\)\.$/.test(d.textes[1]) && d.textes[2] === 'Celui de la bibliothèque contient déjà tout ce fichier.',
    `B1) Le même (son id) : « ${d?.textes[1]} » « ${d?.textes[2]} »`, d)
  ok(boutons(d) === 'Annuler | Ajouter quand même comme copie | Ouvrir celui de la bibliothèque' && d.focus === 'ouvrir-biblio' && d.case?.coche === true,
    '   … [Annuler] [Ajouter quand même comme copie] [Ouvrir celui de la bibliothèque] (principal, le focus) ; la case (il n\'a pas de clé)', d)
  await cliquer(p, 'annuler'); await p.waitForTimeout(200)
  // Plus récent : Mettre à jour (pas ouvert ici) : une entrée de plus, rien d'effacé
  const avant = await p.evaluate(id => window.__examiner('mem-teachingtool-classeur-' + id), X)
  await p.evaluate(id => window.__memcPlusRecent(id, 'symetrie-plus.memc', ['X3', 'X4']), X)
  await ctrlO(p, 'symetrie-plus.memc')
  d = await dialogue(p)
  ok(d?.textes[2] === 'Le fichier est plus récent : il contient tout ce que la bibliothèque a de ce classeur, et plus.' && boutons(d) === 'Annuler | Ajouter comme copie | Mettre à jour le classeur' && d.focus === 'mettre-a-jour',
    'B2) Plus récent : « Le fichier est plus récent… » [Annuler] [Ajouter comme copie] [Mettre à jour le classeur] (le focus)', d)
  await p.evaluate(() => { const c = document.querySelector('dialog[open] .case input'); if (c) c.checked = false })
  await cliquer(p, 'mettre-a-jour')
  ok(await attendreToast(p, /« Symétrie » mis à jour depuis le fichier \(1 page\)\./), '   … « « Symétrie » mis à jour depuis le fichier (1 page). »', await toasts(p))
  const apres = await p.evaluate(id => window.__examiner('mem-teachingtool-classeur-' + id), X)
  const lu = await baseDeNode(p, PREFIXE + X)
  ok(apres.entrees === avant.entrees + 1 && apres.formes === 4 && !apres.incomplet && ['X1', 'X2', 'X3', 'X4'].every(i => lu.ids.includes(i)) && enOrdre(lu.film),
    `   … sans rien perdre : la base a une entrée de plus (${avant.entrees} → ${apres.entrees}, add sans clear), les 4 traits, le film dans l'ordre du temps`, { avant, apres, film: lu.film })
  const fx = await fiche(p, X)
  ok(fx.recu > 0 && fx.pages === 1, '   … la fiche : reçu, pages', fx)
  // Divergent : la base a un trait, le fichier un autre
  await p.evaluate(id => window.__memcPlusRecent(id, 'symetrie-div.memc', ['X5']), X)
  // La bibliothèque écrit de son côté (le classeur ouvert dans un autre onglet)
  const q = await ouvrir(ctx, '?classeur=' + X, 'B-X')
  await q.evaluate(async () => { const t = window.__app.tableau; t.pageVue = window.__app.page; t.nouveauGeste(); t.poser(window.__app.page, { id: 'X6', type: 'trait', x: 5, y: 5, z: 9, auteur: t.moi, pts: [0, 0, 0.5, 9, 9, 0.5], couleur: '#1b2230', taille: 3, opacite: 1, pression: false }); await t.attendreEcritures() })
  await ctrlO(p, 'symetrie-div.memc')
  d = await dialogue(p)
  ok(d?.textes[2] === 'Le fichier et celui de la bibliothèque ont changé chacun de leur côté.' && boutons(d) === 'Annuler | Remplacer celui de la bibliothèque… | Ajouter comme copie' && d.focus === 'copie' && !d.case,
    'B3) Divergent : « … ont changé chacun de leur côté. » [Annuler] [Remplacer celui de la bibliothèque…] [Ajouter comme copie] (le focus) ; pas de case', d)
  // Ajouter comme copie : un id neuf, « Symétrie (copie) », et l'on y va
  await Promise.all([p.waitForEvent('load', { timeout: 30000 }), cliquer(p, 'copie')])
  await pret(p); await p.waitForTimeout(600)
  const copie = await p.evaluate(() => ({ id: window.__app.classeur.id, nom: window.__app.classeur.nom, ids: [...window.__app.formes].map(f => f.id).sort() }))
  ok(copie.id !== X && copie.nom === 'Symétrie (copie)' && copie.ids.includes('X5') && !copie.ids.includes('X6'), '   … [Ajouter comme copie] : « Symétrie (copie) », un id neuf, le contenu du fichier', copie)
  const ex = await baseDeNode(p, PREFIXE + X)
  ok(ex.ids.includes('X6') && !ex.ids.includes('X5'), '   … l\'original n\'a pas changé', ex.ids)
  // Remplacer celui de la bibliothèque… : la question du lot 1, puis remplacé (l'onglet ouvert dessus l'apprend)
  await ctrlO(p, 'symetrie-div.memc')
  d = await dialogue(p)
  await cliquer(p, 'remplacer-biblio'); await p.waitForTimeout(300)
  d = await dialogue(p)
  ok(d?.titre === 'Ouvrir ce classeur ?' && /Il remplace le classeur « Symétrie » de ce navigateur \(1 page\) et tout son historique\. Pour garder celui-ci, enregistrez-le d'abord\.$/.test(d.textes[0]) && boutons(d) === 'Annuler | Enregistrer d\'abord | Remplacer' && d.focus === 'annuler',
    'B4) [Remplacer celui de la bibliothèque…] : la question du lot 1 (le focus sur Annuler)', d)
  await cliquer(p, 'remplacer')
  ok(await attendreToast(p, /« Symétrie » remplacé par le fichier \(1 page\)\./), '   … « « Symétrie » remplacé par le fichier (1 page). »', await toasts(p))
  const er = await baseDeNode(p, PREFIXE + X)
  ok(er.ids.includes('X5') && !er.ids.includes('X6') && (await fiche(p, X))?.id === X, '   … sa base a le contenu du fichier ; il garde son identité', er.ids)
  await q.waitForTimeout(500)
  const dq = (await dialogues(q))[0]
  ok(dq?.titre === 'Le classeur a changé', '   … l\'onglet ouvert sur lui l\'apprend (« Le classeur a changé ») et cesse d\'écrire', dq)
  // Ouvert ici, plus récent : « Mettre à jour », la page se recharge
  const r = await ouvrir(ctx, '?classeur=' + Z, 'B-Z')
  await r.evaluate(id => window.__memcPlusRecent(id, 'pyth-plus.memc', ['Z2']), Z)
  await ctrlO(r, 'pyth-plus.memc')
  d = await dialogue(r)
  await r.evaluate(() => { const c = document.querySelector('dialog[open] .case input'); if (c) c.checked = false })
  await Promise.all([r.waitForEvent('load', { timeout: 30000 }), cliquer(r, 'mettre-a-jour')])
  await pret(r); await r.waitForTimeout(800)
  const rz = await r.evaluate(() => ({ id: window.__app.classeur.id, ids: [...window.__app.formes].map(f => f.id).sort() }))
  ok(rz.id === Z && JSON.stringify(rz.ids) === '["Z1","Z2"]' && (await toasts(r)).some(t => t.includes('« Pythagore » mis à jour depuis le fichier (1 page).')),
    'B5) Ouvert ici : « Mettre à jour » coupe l\'onglet, met à jour la base, et la page se recharge sur lui (« … mis à jour depuis le fichier »)', rz)
  // Égal, ouvert ici : « Ouvrir celui de la bibliothèque » : il est ouvert
  await r.evaluate(id => window.__memcDe(id, 'pyth.memc'), Z)
  await ctrlO(r, 'pyth.memc')
  d = await dialogue(r)
  await r.evaluate(() => { const c = document.querySelector('dialog[open] .case input'); if (c) c.checked = false })
  await cliquer(r, 'ouvrir-biblio')
  ok(await attendreToast(r, /« Pythagore » est ouvert : il contient déjà tout ce fichier\./), 'B6) Égal et ouvert ici : « « Pythagore » est ouvert : il contient déjà tout ce fichier. »')
  // La corbeille : un id neuf
  await r.evaluate(id => window.__registre.modifierClasseur(id, x => { x.corbeille = { t: Date.now() } }), Z)
  const p2 = await ouvrir(ctx, '?classeur=' + X, 'B-corbeille')
  await ctrlO(p2, 'pyth.memc')
  d = await dialogue(p2)
  ok(d?.textes[1] === '(Un classeur de même origine est dans la corbeille.)' && boutons(d).endsWith('Ajouter à la bibliothèque') && !d.case, 'B7) Dans la corbeille : « (Un classeur de même origine est dans la corbeille.) » [Ajouter à la bibliothèque], sans case (un id neuf)', d)
  await Promise.all([p2.waitForEvent('load', { timeout: 30000 }), cliquer(p2, 'ajouter')])
  await pret(p2); await p2.waitForTimeout(500)
  const idNeuf = await p2.evaluate(() => window.__app.classeur.id)
  ok(idNeuf !== Z && /^[0-9a-f]{16}$/.test(idNeuf) && (await fiche(p2, Z))?.corbeille, '   … ajouté sous un id neuf ; celui de la corbeille y reste', idNeuf)
  await ctx.close()
}

// =====================================================================
// C. « METTRE À JOUR » QUAND UN AUTRE ONGLET A ÉCRIT ENTRE-TEMPS
// =====================================================================
if (seul('C')) {
  console.log('\n=== C. Mettre à jour quand un autre onglet a écrit entre-temps ===')
  const ctx = await contexte()
  const p = await ouvrir(ctx, '', 'C')
  const [X] = await p.evaluate(() => window.__creer([{ nom: 'Vecteurs', traits: ['V1'] }]))
  await p.evaluate(id => window.__memcPlusRecent(id, 'vect-plus.memc', ['V2']), X)
  const b = await ouvrir(ctx, '?classeur=' + X, 'C-B')
  await ctrlO(p, 'vect-plus.memc')
  let d = await dialogue(p)
  ok(boutons(d).endsWith('Mettre à jour le classeur'), 'C1) Le fichier est plus récent (la fenêtre propose « Mettre à jour »)', d)
  // Entre la comparaison et le clic, l'autre onglet écrit
  await b.evaluate(async () => { const t = window.__app.tableau; t.pageVue = window.__app.page; t.nouveauGeste(); t.poser(window.__app.page, { id: 'V9', type: 'trait', x: 5, y: 5, z: 9, auteur: t.moi, pts: [0, 0, 0.5, 9, 9, 0.5], couleur: '#1b2230', taille: 3, opacite: 1, pression: false }); await t.attendreEcritures() })
  const avant = await p.evaluate(id => window.__examiner('mem-teachingtool-classeur-' + id), X)
  await p.evaluate(() => { const c = document.querySelector('dialog[open] .case input'); if (c) c.checked = false })
  await cliquer(p, 'mettre-a-jour')
  await p.waitForTimeout(1200)
  d = (await dialogues(p))[0]
  ok(d?.textes[2] === 'Le fichier et celui de la bibliothèque ont changé chacun de leur côté.' && boutons(d) === 'Annuler | Remplacer celui de la bibliothèque… | Ajouter comme copie',
    'C2) On bascule sur « … ont changé chacun de leur côté » (rien n\'a été écrit)', d)
  const apres = await p.evaluate(id => window.__examiner('mem-teachingtool-classeur-' + id), X)
  const lu = await baseDeNode(p, PREFIXE + X)
  ok(apres.entrees === avant.entrees && lu.ids.includes('V9') && !lu.ids.includes('V2'), '   … la base n\'a pas changé : le trait de l\'autre onglet y est, celui du fichier n\'y est pas (on ne fusionne pas deux histoires)', { avant, apres, ids: lu.ids })
  await cliquer(p, 'annuler')
  await b.waitForTimeout(400)
  const db = (await dialogues(b))[0]
  ok(db?.titre === 'Le classeur a changé', '   … l\'autre onglet, prévenu avant, a cessé d\'écrire (il rechargera et retrouvera tout)', db)
  await b.reload(); await pret(b); await b.waitForTimeout(500)
  ok((await b.evaluate(() => [...window.__app.formes].map(f => f.id).sort())).join() === 'V1,V9', '   … rechargé : ses deux traits')
  await ctx.close()
}

// =====================================================================
// D. PLUSIEURS FICHIERS ; LE GLISSER
// =====================================================================
if (seul('D')) {
  console.log('\n=== D. Plusieurs fichiers ; le glisser sur la bibliothèque et sur le tableau ===')
  const ctx = await contexte()
  const p = await ouvrir(ctx, '', 'D')
  const [X, Yi] = await p.evaluate(() => window.__creer([{ nom: 'Symétrie', traits: ['X1'] }, { nom: 'Aire', traits: ['Y1'] }]))
  const D = Date.now() - 86400e3
  await opfsEcrire(p, 'n1.memc', faireMemc(Y.encodeStateAsUpdate(unClasseur(['A1'])), { date: D, pages: 1, nom: 'Neuf un', id: 'd1d1d1d1d1d1d1d1' }))
  await opfsEcrire(p, 'n2.memc', faireMemc(Y.encodeStateAsUpdate(unClasseur(['A2'])), { date: D, pages: 1, nom: 'Neuf deux', id: 'd2d2d2d2d2d2d2d2' }))
  await p.evaluate(id => window.__memcDe(id, 'x.memc'), X)
  await p.evaluate(id => window.__memcPlusRecent(id, 'y-plus.memc', ['Y2']), Yi)
  const bon = faireMemc(Y.encodeStateAsUpdate(unClasseur(['B1'])), { date: D, pages: 1, nom: 'Abîmé', id: 'e1e1e1e1e1e1e1e1' })
  bon[bon.length - 30] ^= 0x22
  await opfsEcrire(p, 'abime.memc', bon)
  await opfsEcrire(p, 'film.mem', Buffer.from('{"format":"mem-revoir","v":1}\n{}'))
  await ctrlO(p, ['n1.memc', 'n2.memc', 'x.memc', 'y-plus.memc', 'abime.memc', 'film.mem'])
  let d = await dialogue(p, 60000)
  ok(d?.titre === 'Ouvrir ces fichiers ?' && d.textes[0] === '6 fichiers : 2 classeurs à ajouter ; 1 déjà dans la bibliothèque (rien à faire) ; 1 plus récent dans le fichier (mis à jour) ; 2 illisibles : « abime.memc » : ce fichier .memc est abîmé ; « film.mem » : c\'est un film pour les élèves (.mem), pas un classeur.'
    && boutons(d) === 'Annuler | Ajouter' && d.focus === 'ajouter', `D1) Plusieurs fichiers : « ${d?.textes[0]} » [Annuler] [Ajouter]`, d)
  await cliquer(p, 'ajouter')
  ok(await attendreToast(p, /^2 classeurs ajoutés à la bibliothèque, 1 mis à jour ; 2 illisibles \(« abime\.memc » : ce fichier \.memc est abîmé ; « film\.mem » : c'est un film/, 30000), '   … « 2 classeurs ajoutés à la bibliothèque, 1 mis à jour ; 2 illisibles (…) », et la bibliothèque ne s\'ouvre que si on le demande (Voir la bibliothèque)', await toasts(p))
  const fs = await fiches(p)
  const ly = await baseDeNode(p, PREFIXE + Yi)
  ok(fs.some(f => f.id === 'd1d1d1d1d1d1d1d1' && f.nom === 'Neuf un') && fs.some(f => f.id === 'd2d2d2d2d2d2d2d2') && !fs.some(f => f.id === 'e1e1e1e1e1e1e1e1') && fs.filter(f => f.nom === 'Symétrie').length === 1
    && ly.ids.includes('Y2') && ly.ids.includes('Y1'), '   … les deux nouveaux ajoutés, « Aire » mis à jour (Y1 et Y2), « Symétrie » pas en double, l\'abîmé pas ajouté', fs.map(f => f.nom))
  // Le même classeur deux fois dans un lot : une seule fois
  await opfsEcrire(p, 'n3a.memc', faireMemc(Y.encodeStateAsUpdate(unClasseur(['C1'])), { date: D, pages: 1, nom: 'Deux fois', id: 'd3d3d3d3d3d3d3d3' }))
  await opfsEcrire(p, 'n3b.memc', await opfsLire(p, 'n3a.memc'))
  await ctrlO(p, ['n3a.memc', 'n3b.memc'])
  d = await dialogue(p, 60000)
  ok(d?.textes[0] === '2 fichiers : 1 classeur à ajouter ; 1 déjà dans la bibliothèque (rien à faire).', 'D2) Le même classeur deux fois : « 1 classeur à ajouter ; 1 déjà dans la bibliothèque »', d)
  await cliquer(p, 'ajouter')
  await attendreToast(p, /classeur ajouté/)
  ok((await fiches(p)).filter(f => f.id === 'd3d3d3d3d3d3d3d3').length === 1, '   … une seule fiche')
  // Le glisser sur la bibliothèque : le cadre, puis la fenêtre
  await ouvrirBiblio(p)
  const lacher = async (selecteur, fichiers, sansDrop = false) => p.evaluate(async ({ selecteur, fichiers, sansDrop }) => {
    const dt = new DataTransfer()
    for (const [nom, b64] of fichiers) dt.items.add(new File([Uint8Array.from(atob(b64), c => c.charCodeAt(0))], nom))
    const el = document.querySelector(selecteur)
    el.dispatchEvent(new DragEvent('dragenter', { dataTransfer: dt, bubbles: true, cancelable: true }))
    el.dispatchEvent(new DragEvent('dragover', { dataTransfer: dt, bubbles: true, cancelable: true }))
    const depot = document.querySelector('.biblio-depot')
    const vu = depot && !depot.hidden ? { texte: depot.textContent, r: depot.getBoundingClientRect().width } : null
    if (!sansDrop) el.dispatchEvent(new DragEvent('drop', { dataTransfer: dt, bubbles: true, cancelable: true }))
    return { vu, apres: depot ? !depot.hidden : null }
  }, { selecteur, fichiers, sansDrop })
  const b64 = async n => (await opfsLire(p, n)).toString('base64')
  await opfsEcrire(p, 'n4.memc', faireMemc(Y.encodeStateAsUpdate(unClasseur(['G1'])), { date: D, pages: 1, nom: 'Glissé un', id: 'f1f1f1f1f1f1f1f1' }))
  await opfsEcrire(p, 'n5.memc', faireMemc(Y.encodeStateAsUpdate(unClasseur(['G2'])), { date: D, pages: 1, nom: 'Glissé deux', id: 'f2f2f2f2f2f2f2f2' }))
  const g = await lacher('.biblio-corps', [['n4.memc', await b64('n4.memc')], ['n5.memc', await b64('n5.memc')]])
  ok(g.vu?.texte === 'Lâchez pour ajouter à la bibliothèque' && g.vu.r > 300 && g.apres === false, 'D3) Des fichiers au-dessus de la bibliothèque : le cadre « Lâchez pour ajouter à la bibliothèque », parti au lâcher', g)
  d = await dialogue(p, 60000)
  ok(d?.textes[0] === '2 fichiers : 2 classeurs à ajouter.', `   … lâchés : « ${d?.textes[0]} »`, d)
  await cliquer(p, 'ajouter')
  await attendreToast(p, /2 classeurs ajoutés à la bibliothèque\./)
  await p.waitForTimeout(600)
  const cartes = await p.evaluate(() => [...document.querySelectorAll('.grille-classeurs.tous .carte-nom-classeur')].map(x => x.textContent))
  ok(cartes.includes('Glissé un') && cartes.includes('Glissé deux'), '   … ajoutés, et leurs cartes paraissent dans la bibliothèque ouverte', cartes)
  // Un fichier qui n'est pas un classeur, lâché
  await opfsEcrire(p, 'notes.txt', Buffer.from('bonjour'))
  await lacher('.biblio-corps', [['notes.txt', await b64('notes.txt')]])
  ok(await attendreToast(p, /Ce fichier n'est ni un classeur \(\.memc\) ni une bibliothèque \(\.memb\)\./), 'D4) Un fichier quelconque lâché : « Ce fichier n\'est ni un classeur (.memc) ni une bibliothèque (.memb). »', await toasts(p))
  // … ou choisi seul (son extension changée)
  await opfsEcrire(p, 'faux.memc', Buffer.from('bonjour'))
  await p.keyboard.press('Escape'); await p.waitForTimeout(300)
  await ctrlO(p, 'faux.memc')
  ok(await attendreToast(p, /Ce fichier n'est pas un classeur enregistré par MEM teachingtool \(fichier \.memc\)\./), '   … choisi : « Ce fichier n\'est pas un classeur enregistré par MEM teachingtool (fichier .memc). »', await toasts(p))
  // Un fichier lâché sur le tableau : la fenêtre d'un fichier
  await opfsEcrire(p, 'n6.memc', faireMemc(Y.encodeStateAsUpdate(unClasseur(['T1'])), { date: D, pages: 1, nom: 'Sur le tableau', id: 'f3f3f3f3f3f3f3f3' }))
  await p.evaluate(async b64 => {
    const dt = new DataTransfer()
    dt.items.add(new File([Uint8Array.from(atob(b64), c => c.charCodeAt(0))], 'n6.memc'))
    const z = document.getElementById('zone')
    z.dispatchEvent(new DragEvent('dragover', { dataTransfer: dt, bubbles: true, cancelable: true }))
    z.dispatchEvent(new DragEvent('drop', { dataTransfer: dt, bubbles: true, cancelable: true }))
  }, await b64('n6.memc'))
  d = await dialogue(p)
  ok(d?.titre === 'Ouvrir ce classeur ?' && /^« n6\.memc » : 1 page/.test(d.textes[0]) && boutons(d).endsWith('Ajouter à la bibliothèque') && !d.case, 'D5) Lâché sur le tableau : « Ouvrir ce classeur ? » (sans case : pas de poignée)', d)
  await cliquer(p, 'annuler')
  await ctx.close()
}

// =====================================================================
// E. TOUTE LA BIBLIOTHÈQUE DANS UN FICHIER
// =====================================================================
async function enregistrerBiblio(p, nom) {
  await ouvrirBiblio(p)
  await p.evaluate(n => { window.__nomChoisi = n }, nom ?? null)
  await p.click('.biblio-tete [data-action="menu-bibliotheque"]'); await p.waitForTimeout(150)
  await p.click('.menu-flottant:not([hidden]) .menu-item[data-action="enregistrer-bibliotheque"]')
  return attendreToast(p, /^Bibliothèque enregistrée : /, 120000)
}
async function ouvrirBiblioFichier(p, nom) {
  await ctrlO(p, nom)
  return dialogue(p, 120000)
}
/** Ce que contient un .memb (sous Node : unzip) */
function contenuMemb(chemin) {
  const liste = execFileSync('unzip', ['-Z1', chemin]).toString().trim().split('\n')
  const test = execFileSync('unzip', ['-t', chemin]).toString()
  const index = JSON.parse(execFileSync('unzip', ['-p', chemin, 'bibliotheque.json']).toString())
  return { liste, test, index, memc: n => lireMemc(execFileSync('unzip', ['-p', chemin, n], { maxBuffer: 1 << 28 })) }
}
if (seul('E')) {
  console.log('\n=== E. Toute la bibliothèque dans un fichier : enregistrer, ouvrir ailleurs, rouvrir ===')
  const ctx = await contexte()
  const p = await ouvrir(ctx, '', 'E')
  const classe = await p.evaluate(() => window.__dossier('5e B', { etiquette: '5e B', couleur: '#2f8a57' }))
  const geo = await p.evaluate(id => window.__dossier('Géométrie', { parent: id, couleur: '#c24a4a' }), classe)
  const jete = await p.evaluate(() => window.__dossier('Jeté'))
  const [S1, F1] = await p.evaluate(({ geo }) => window.__creer([{ nom: 'Symétrie', traits: ['S1', 'S2'], dossier: geo, etiquettes: ['Soutien'] }, { nom: 'Fractions', traits: ['F1'] }]), { geo })
  const [J1] = await p.evaluate(({ jete }) => window.__creer([{ nom: 'Dans la corbeille', traits: ['J1'], dossier: jete }]), { jete })
  await p.evaluate(id => window.__registre.modifierDossier(id, d => { d.corbeille = { t: Date.now() } }), jete)
  // Un aperçu pour « Symétrie »
  await p.evaluate(async id => {
    const c = document.createElement('canvas'); c.width = 32; c.height = 20
    const g = c.getContext('2d'); g.fillStyle = '#3b6fb6'; g.fillRect(0, 0, 32, 20)
    const b = await new Promise(ok => c.toBlob(ok, 'image/png'))
    await window.__registre.ecrireApercu(id, b)
  }, S1)
  // Le menu ⋯ du bandeau : « Enregistrer toute la bibliothèque… », son aide
  await ouvrirBiblio(p)
  await p.click('.biblio-tete [data-action="menu-bibliotheque"]'); await p.waitForTimeout(150)
  const m = await p.evaluate(() => { const e = document.querySelector('.menu-flottant:not([hidden]) .menu-item[data-action="enregistrer-bibliotheque"]'); return e ? { t: e.querySelector('.libelle')?.firstChild?.textContent, aide: e.querySelector('small')?.textContent } : null })
  await p.keyboard.press('Escape'); await p.waitForTimeout(150)
  ok(m?.t === 'Enregistrer toute la bibliothèque…' && m.aide === 'Un seul fichier .memb avec tous les classeurs (sans la corbeille) et les dossiers : pour changer d\'ordinateur, ou garder une copie de tout.', 'E1) Le menu ⋯ du bandeau : « Enregistrer toute la bibliothèque… » et son aide', m)
  await p.keyboard.press('Escape'); await p.waitForTimeout(200)
  const enr = await enregistrerBiblio(p, null)
  const t = (await p.evaluate(() => window.__toasts)).find(x => x.startsWith('Bibliothèque enregistrée'))
  ok(enr, 'E2) Enregistrer toute la bibliothèque : « Bibliothèque enregistrée : … »', t)
  const ch = await p.evaluate(() => window.__choix.filter(c => c.quoi === 'save').at(-1))
  ok(/^Bibliothèque \d{4}-\d\d-\d\d \d\dh\d\d\.memb$/.test(ch?.nom) && ch.o.id === 'mem-classeurs' && JSON.stringify(ch.o.types) === JSON.stringify([{ description: 'Bibliothèque (MEM teachingtool)', accept: { 'application/octet-stream': ['.memb'] } }]) && ch.actif,
    `   … le nom proposé « ${ch?.nom} », .memb, dans le clic`, ch)
  ok(new RegExp(`^Bibliothèque enregistrée : ${ch.nom.replace(/[.()]/g, '\\$&')} \\(3 classeurs, \\d+ Ko\\)\\.$`).test(norm(t)), `   … « ${t} »`, t)
  const octets = await opfsLire(p, ch.nom)
  const chemin = TRAVAIL + 'E-bibliotheque.memb'
  writeFileSync(chemin, octets)
  const c = contenuMemb(chemin)
  ok(/No errors detected/.test(c.test) && c.liste[0] === 'bibliotheque.json' && c.liste.filter(x => x.startsWith('classeurs/')).length === 3 && c.liste.includes(`apercus/${S1}.png`) && !c.liste.some(x => x.includes(J1)),
    'E3) Le .memb : unzip -t passe ; bibliotheque.json d\'abord, 3 classeurs (pas celui de la corbeille), l\'aperçu', c.liste)
  const ci = c.index.classeurs.find(x => x.id === S1)
  ok(c.index.format === 'mem-bibliotheque' && c.index.v === 1 && c.index.app === 'MEM teachingtool' && c.index.dossiers.length === 2 && !c.index.dossiers.some(d => d.id === jete)
    && ci?.dossier === geo && JSON.stringify(ci.etiquettes) === '["Soutien"]' && ci.fichier === `classeurs/${S1}.memc` && ci.apercu === `apercus/${S1}.png` && !('vecteur' in ci),
    '   … l\'index : format, v, app, les dossiers (sans la corbeille), le dossier et les étiquettes des classeurs, leurs fichiers, sans vecteurs', c.index)
  const ms = c.memc(`classeurs/${S1}.memc`)
  ok(ms.entete.id === S1 && ms.entete.nom === 'Symétrie' && ms.ids.sort().join() === 'S1,S2', '   … chaque .memc s\'ouvre seul (unzip -p) : son en-tête, ses traits', ms.entete)
  const dates = await p.evaluate(ids => ids.map(id => localStorage.getItem('mem-dernier-enregistrement:' + id)), [S1, F1])
  ok(dates.every(x => Number(x) > 0), '   … chaque classeur est noté enregistré dans un fichier', dates)
  // « Enregistrer dans un fichier… » (le menu d'un classeur)
  await ouvrirBiblio(p)
  await p.click(`.grille-classeurs.tous li[data-cle="${F1}"] .options-classeur`); await p.waitForTimeout(200)
  const entrees = await p.evaluate(() => [...document.querySelectorAll('.menu-flottant:not([hidden]) .menu-item')].map(e => e.dataset.action))
  ok(JSON.stringify(entrees) === JSON.stringify(['ouvrir-classeur', 'renommer', 'etiquettes', 'deplacer', 'dupliquer', 'enregistrer-classeur', 'supprimer']), 'E4) Le menu d\'un classeur gagne « Enregistrer dans un fichier… »', entrees)
  await p.click('.menu-flottant:not([hidden]) .menu-item[data-action="enregistrer-classeur"]')
  ok(await attendreToast(p, /^Classeur enregistré : Fractions \d{4}-\d\d-\d\d \d\dh\d\d\.memc/), '   … « Classeur enregistré : Fractions … .memc »', await toasts(p))
  // Ouvrir la bibliothèque dans un AUTRE profil
  const ctx2 = await contexte()
  const q = await ouvrir(ctx2, '', 'E2')
  await opfsEcrire(q, 'tout.memb', octets)
  let d = await ouvrirBiblioFichier(q, 'tout.memb')
  ok(d?.titre === 'Ouvrir cette bibliothèque ?' && /^« tout\.memb » : 3 classeurs et 2 dossiers, enregistrée le .+\. À ajouter : 3\.$/.test(d.textes[0]) && boutons(d) === 'Annuler | Ajouter' && !d.case,
    `E5) Dans un autre profil : « ${d?.textes[0]} » [Annuler] [Ajouter]`, d)
  await cliquer(q, 'ajouter')
  ok(await attendreToast(q, /^Bibliothèque ouverte : 3 classeurs ajoutés\./, 60000), '   … « Bibliothèque ouverte : 3 classeurs ajoutés. »', await toasts(q))
  const fq = await fiches(q)
  const dq = await q.evaluate(() => window.__registre.dossiers())
  const sq = fq.find(f => f.id === S1)
  const geoQ = dq.find(x => x.nom === 'Géométrie'), classeQ = dq.find(x => x.nom === '5e B')
  ok(sq && sq.dossier === geoQ?.id && geoQ.parent === classeQ?.id && classeQ.etiquette === '5e B' && classeQ.couleur === '#2f8a57' && geoQ.couleur === '#c24a4a' && JSON.stringify(sq.etiquettes) === '["Soutien"]',
    '   … les dossiers (5e B › Géométrie, leurs couleurs, l\'étiquette de niveau), « Symétrie » dans le sien avec son étiquette', { sq, dq })
  ok(fq.some(f => f.id === F1 && f.dossier === null) && fq.some(f => f.nom === 'Premier classeur' && f.base.startsWith(PREFIXE)) && (await q.evaluate(id => window.__registre.apercu(id).then(b => b?.size ?? 0), S1)) > 0,
    '   … « Fractions » à la racine, le premier de l\'autre profil comme un classeur à part, l\'aperçu repris', fq)
  ok((await baseDeNode(q, PREFIXE + S1)).ids.sort().join() === 'S1,S2', '   … ses traits')
  // Rouvrir : tout est déjà là, rien n'est touché
  d = await ouvrirBiblioFichier(q, 'tout.memb')
  ok(/Déjà dans ce navigateur : 3 \(ils ne sont pas touchés\)\. À ajouter : 0\.$/.test(d?.textes[0]) && boutons(d) === 'Fermer', 'E6) Rouverte : « Déjà dans ce navigateur : 3 (ils ne sont pas touchés). À ajouter : 0. » [Fermer]', d)
  await cliquer(q, 'annuler')
  // Plus récent dans le fichier : la case, décochée
  const pf = await ouvrir(ctx, '?classeur=' + F1, 'E-F')
  await pf.evaluate(async () => { const t = window.__app.tableau; t.pageVue = window.__app.page; t.nouveauGeste(); t.poser(window.__app.page, { id: 'F2', type: 'trait', x: 5, y: 5, z: 9, auteur: t.moi, pts: [0, 0, 0.5, 9, 9, 0.5], couleur: '#1b2230', taille: 3, opacite: 1, pression: false }); await t.attendreEcritures() })
  ok(await enregistrerBiblio(pf, 'deux.memb'), '   (une deuxième bibliothèque, « Fractions » y a un trait de plus)')
  const octets2 = await opfsLire(pf, 'deux.memb')
  await opfsEcrire(q, 'deux.memb', octets2)
  d = await ouvrirBiblioFichier(q, 'deux.memb')
  ok(/Déjà dans ce navigateur : 3 \(ils ne sont pas touchés\)\. À ajouter : 0\.$/.test(d?.textes[0]) && d.case?.coche === false && d.case.texte === 'Mettre aussi à jour le classeur plus récent dans le fichier (il contient tout ce que ce navigateur en a : rien n\'est perdu)' && boutons(d) === 'Annuler | Ajouter',
    'E7) Un classeur plus récent dans le fichier : la case « Mettre aussi à jour le classeur plus récent… », décochée', d)
  await cliquer(q, 'ajouter')
  await attendreToast(q, /^Bibliothèque ouverte/)
  ok(!(await baseDeNode(q, PREFIXE + F1)).ids.includes('F2'), '   … sans la case : rien n\'est touché (jamais un classeur d\'ici remplacé sans elle)')
  d = await ouvrirBiblioFichier(q, 'deux.memb')
  await q.evaluate(() => { document.querySelector('dialog[open] .case input').checked = true })
  await cliquer(q, 'ajouter')
  ok(await attendreToast(q, /^Bibliothèque ouverte : 0 classeur ajouté, 1 mis à jour\./, 60000), '   … la case cochée : « Bibliothèque ouverte : 0 classeur ajouté, 1 mis à jour. »', await toasts(q))
  ok((await baseDeNode(q, PREFIXE + F1)).ids.sort().join() === 'F1,F2', '   … « Fractions » a son trait de plus (rien de perdu)')
  // Un .memb tronqué : ce qui est entier avant la coupure
  const ctx3 = await contexte()
  const r = await ouvrir(ctx3, '?bibliotheque', 'E3')
  // Le nom paraît dans l'index, puis dans l'en-tête local de l'entrée, puis dans le répertoire
  const nomS = Buffer.from(`classeurs/${S1}.memc`)
  const posS = octets.indexOf(nomS, octets.indexOf(nomS) + 1)
  const entS = c.liste.indexOf(`classeurs/${S1}.memc`)
  ok(posS > 0 && entS > 0, '   (la position du dernier classeur dans le fichier)')
  await opfsEcrire(r, 'coupe.memb', octets.subarray(0, posS + 200))
  d = await ouvrirBiblioFichier(r, 'coupe.memb')
  const coupeOrdre = c.liste.filter(x => x.startsWith('classeurs/'))
  const dernier = c.index.classeurs.find(x => x.fichier === coupeOrdre.at(-1))?.nom
  ok(new RegExp(`À ajouter : 2\\. Illisible : 1 \\(« ${dernier} » : il manque au fichier, qui est incomplet\\)\\.$`).test(d?.textes[0]), `E8) Un .memb tronqué : « ${d?.textes[0]} »`, d)
  await cliquer(r, 'ajouter')
  ok(await attendreToast(r, /^Bibliothèque ouverte : 2 classeurs ajoutés ; 1 illisible/, 60000), '   … les deux entiers sont ajoutés, le coupé est dit', await toasts(r))
  // Un .memc abîmé au milieu d'un .memb
  const ctx4 = await contexte()
  const s = await ouvrir(ctx4, '?bibliotheque', 'E4')
  const memcF = execFileSync('unzip', ['-p', chemin, `classeurs/${F1}.memc`])
  const posF = octets.indexOf(memcF)
  const abime = Buffer.from(octets); abime[posF + Math.floor(memcF.length / 2)] ^= 0x40
  await opfsEcrire(s, 'abime.memb', abime)
  d = await ouvrirBiblioFichier(s, 'abime.memb')
  ok(posF > 0 && /À ajouter : 2\. Illisible : 1 \(« Fractions » : ce classeur est abîmé dans la bibliothèque : il ne peut pas être ouvert\)\.$/.test(d?.textes[0]), `E9) Un .memc abîmé au milieu : « ${d?.textes[0]} » (sa somme ne va pas)`, d)
  await cliquer(s, 'ajouter')
  await attendreToast(s, /^Bibliothèque ouverte : 2 classeurs ajoutés ; 1 illisible/, 60000)
  ok(!(await fiches(s)).some(f => f.id === F1), '   … les autres ajoutés, pas lui')
  // Le quota dépassé au milieu : ce qui est fait reste, ce qui manque est dit
  const ctx5 = await contexte()
  const u = await ouvrir(ctx5, '?bibliotheque', 'E5')
  await opfsEcrire(u, 'tout.memb', octets)
  await u.evaluate(() => {
    const reg = window.__registre, orig = reg.creerClasseur.bind(reg)
    let n = 0
    reg.creerClasseur = async (f, remplir) => { if (++n >= 2) throw new DOMException('plus de place', 'QuotaExceededError'); return orig(f, remplir) }
  })
  d = await ouvrirBiblioFichier(u, 'tout.memb')
  await cliquer(u, 'ajouter')
  ok(await attendreToast(u, /^Bibliothèque ouverte : 1 classeur ajouté ; plus de place dans ce navigateur : 2 classeurs n'ont pas été ajoutés \(« .+ », « .+ »\)\.$/, 60000), 'E10) Plus de place au milieu : « … 1 classeur ajouté ; plus de place dans ce navigateur : 2 classeurs n\'ont pas été ajoutés (…). »', await toasts(u))
  ok((await fiches(u)).length === 2, '   … ce qui est fait reste (le premier de ce profil, et un ajouté)', await fiches(u))
  for (const x of [ctx, ctx2, ctx3, ctx4, ctx5]) await x.close()
}

// (F. La version d'avant sur la même origine : retirée en rangeant la batterie
// dans le dépôt ; la version d'avant se construisait depuis un commit qui
// n'existe plus.)
const pretConstruit = p => p.waitForFunction(() => document.querySelector('.rang')?.textContent?.includes('/') || (document.querySelector('.bibliotheque') && !document.querySelector('.bibliotheque').hidden), null, { timeout: 30000 })

// =====================================================================
// G. LE CONFLIT DE LA CLÉ : OUVRIR SON FICHIER
// =====================================================================
if (seul('G')) {
  console.log('\n=== G. Le conflit de la clé : [Ouvrir le fichier de la clé], Mettre à jour, la clé reprend ===')
  const ctx = await contexte()
  const p0 = await ouvrir(ctx, '', 'G0')
  const [K] = await p0.evaluate(() => window.__creer([{ nom: 'Clé', traits: ['K1'] }]))
  await p0.close()
  let p = await ouvrir(ctx, '?classeur=' + K, 'G')
  await p.evaluate(() => { window.__nomChoisi = 'cle.memc' })
  await p.click('.barre-haut .bouton.points'); await p.waitForTimeout(150)
  await p.click('.menu-flottant:not([hidden]) .menu-item[data-action="activer-cle"]')
  await p.waitForFunction(() => window.__cle?.etat.etat === 'ok', null, { timeout: 30000 })
  // Le fichier de la clé modifié ailleurs (le soir, sur une autre machine) : un trait de plus, une autre date
  await p.evaluate(id => window.__memcPlusRecent(id, 'cle.memc', ['K2'], { date: Date.now() + 60000 }), K)
  await p.reload(); await pret(p)
  await p.waitForFunction(() => window.__cle?.etat.etat === 'conflit', null, { timeout: 30000 }).catch(() => {})
  await p.waitForTimeout(500)
  const band = await p.evaluate(() => { const b = document.querySelector('.bandeau-sauvegarde'); return b && !b.hidden ? { raison: b.dataset.raison, boutons: [...b.querySelectorAll('.bouton-bandeau')].map(x => x.textContent) } : null })
  ok(band?.raison === 'cle-conflit' && JSON.stringify(band.boutons) === JSON.stringify(['Ouvrir le fichier', 'Choisir un autre fichier…', 'Remplacer quand même']),
    'G1) Le fichier de la clé modifié ailleurs : le bandeau [Ouvrir le fichier] [Choisir un autre fichier…] [Remplacer quand même] (lot 18 : sans le mot « clé »)', band)
  await p.click('.bandeau-sauvegarde .bouton-bandeau:first-of-type')
  const d = await dialogue(p)
  ok(d?.textes[2] === 'Le fichier est plus récent : il contient tout ce que la bibliothèque a de ce classeur, et plus.' && boutons(d) === 'Annuler | Ajouter comme copie | Mettre à jour le classeur' && !d.case,
    'G2) Son fichier, comparé : « Le fichier est plus récent… » [Mettre à jour le classeur] (sans case : c\'est déjà celui de la clé)', d)
  await Promise.all([p.waitForEvent('load', { timeout: 30000 }), cliquer(p, 'mettre-a-jour')])
  await pret(p); await p.waitForTimeout(1500)
  const ids = await p.evaluate(() => [...window.__app.formes].map(f => f.id).sort())
  const tg = await toasts(p)
  ok(ids.join() === 'K1,K2' && tg.some(t => t.includes('« Clé » mis à jour depuis le fichier (1 page). L\'enregistrement dans « cle.memc » reprend.')), 'G3) Mis à jour sans perte (K1, K2) : « … L\'enregistrement dans « cle.memc » reprend. »', { ids, tg })
  await p.waitForFunction(() => window.__cle?.etat.etat === 'ok', null, { timeout: 30000 }).catch(() => {})
  ok(await p.evaluate(() => window.__cle.etat.etat) === 'ok', '   … la clé n\'est plus en conflit', await p.evaluate(() => window.__cle.etat))
  await p.evaluate(async () => { const t = window.__app.tableau; t.pageVue = window.__app.page; t.nouveauGeste(); t.poser(window.__app.page, { id: 'K3', type: 'trait', x: 5, y: 5, z: 9, auteur: t.moi, pts: [0, 0, 0.5, 9, 9, 0.5], couleur: '#1b2230', taille: 3, opacite: 1, pression: false }); await t.attendreEcritures() })
  await p.keyboard.press('Control+s')
  ok(await attendreToast(p, /Enregistré dans « cle\.memc »/), '   … Ctrl + S écrit dans le fichier (« Enregistré dans « cle.memc » … », lot 18)', await toasts(p))
  const lu = lireMemc(await opfsLire(p, 'cle.memc'))
  ok(lu.ids.sort().join() === 'K1,K2,K3' && lu.entete.id === K, '   … le fichier de la clé a tout : K1, K2, K3', lu.ids)
  // Un autre fichier de ce classeur, qui a divergé : « Remplacer celui de la
  // bibliothèque… » dit que le fichier de la clé sera remplacé lui aussi
  await p.evaluate(id => window.__memcPlusRecent(id, 'div.memc', ['K9']), K)
  await p.evaluate(async () => { const t = window.__app.tableau; t.pageVue = window.__app.page; t.nouveauGeste(); t.poser(window.__app.page, { id: 'K8', type: 'trait', x: 5, y: 5, z: 9, auteur: t.moi, pts: [0, 0, 0.5, 9, 9, 0.5], couleur: '#1b2230', taille: 3, opacite: 1, pression: false }); await t.attendreEcritures() })
  await ctrlO(p, 'div.memc')
  let dv = await dialogue(p)
  await cliquer(p, 'remplacer-biblio'); await p.waitForTimeout(300)
  dv = await dialogue(p)
  ok(dv?.textes[1] === 'Son fichier « cle.memc » sera remplacé lui aussi.', 'G4) Un fichier qui a divergé, Remplacer celui de la bibliothèque… : « Son fichier « cle.memc » sera remplacé lui aussi. » (lot 18)', dv)
  await Promise.all([p.waitForEvent('load', { timeout: 30000 }), cliquer(p, 'remplacer')])
  await pret(p); await p.waitForTimeout(1500)
  await p.waitForFunction(() => window.__cle?.etat.etat === 'ok', null, { timeout: 30000 }).catch(() => {})
  ok(await p.evaluate(() => window.__cle.etat.etat) === 'ok' && (await p.evaluate(() => [...window.__app.formes].map(f => f.id).sort())).join() === 'K1,K2,K3,K9', '   … remplacé (K9, sans K8) ; la clé n\'est pas en conflit', await p.evaluate(() => window.__cle.etat))
  await p.keyboard.press('Control+s')
  await attendreToast(p, /Enregistré dans « cle\.memc »/)
  const lu2 = lireMemc(await opfsLire(p, 'cle.memc'))
  ok(lu2.ids.sort().join() === 'K1,K2,K3,K9', '   … et le fichier de la clé est remplacé lui aussi', lu2.ids)
  await ctx.close()
}

// =====================================================================
// H. 30 CLASSEURS DONT UN DE 60 PAGES : SANS TÂCHE LONGUE
// =====================================================================
const OBSERVER = () => {
  window.__longues = []
  new PerformanceObserver(l => { for (const e of l.getEntries()) window.__longues.push({ debut: Math.round(e.startTime), duree: Math.round(e.duration) }) }).observe({ type: 'longtask', buffered: false })
}
if (seul('H')) {
  console.log('\n=== H. 30 classeurs dont un de 60 pages : enregistrer et ouvrir la bibliothèque sans tâche longue ===')
  const ctx = await contexte()
  const p0 = await ouvrir(ctx, '', 'H0')
  const petits = Array.from({ length: 28 }, (_, i) => ({ nom: `Chapitre ${i + 1}`, traits: [`H${i}a`, `H${i}b`] }))
  await p0.evaluate(l => window.__creer(l), petits)
  const [G] = await p0.evaluate(() => window.__creer([{ nom: 'Soixante pages', traits: [] }]))
  await p0.close()
  const g = await ouvrir(ctx, '?classeur=' + G, 'H-G')
  const t0 = Date.now()
  await g.evaluate(async () => {
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
  // Depuis un autre classeur : la bibliothèque, Enregistrer toute la bibliothèque
  const p = await ouvrir(ctx, '', 'H')
  await g.close()
  await p.evaluate(OBSERVER)
  await p.evaluate(() => { setTimeout(() => { const t = performance.now(); while (performance.now() - t < 150) { /* occupé */ } }, 0) })
  await p.waitForTimeout(400)
  const temoin = await p.evaluate(() => window.__longues.splice(0))
  ok(temoin.some(e => e.duree >= 140), '   (le témoin : l\'observateur voit une tâche de 150 ms)', temoin)
  await ouvrirBiblio(p); await p.waitForTimeout(1500)
  await p.evaluate(() => window.__longues.splice(0))
  const debut = Date.now()
  ok(await enregistrerBiblio(p, 'trente.memb'), 'H1) Enregistrer une bibliothèque de 30 classeurs dont un de 60 pages', await p.evaluate(() => window.__toasts.slice(-2)))
  const dureeE = Date.now() - debut
  const lE = await p.evaluate(() => window.__longues.splice(0))
  const t = norm((await p.evaluate(() => window.__toasts)).find(x => x.startsWith('Bibliothèque enregistrée')))
  ok(/\(30 classeurs, \d+(,\d)? Mo\)/.test(t) && !lE.some(e => e.duree > 100), `   … « ${t} » en ${(dureeE / 1000).toFixed(1)} s : aucune tâche de plus de 100 ms (la plus longue : ${Math.max(0, ...lE.map(e => e.duree))} ms)`, lE)
  const octets = await opfsLire(p, 'trente.memb')
  writeFileSync(TRAVAIL + 'H-trente.memb', octets)
  ok(/No errors detected/.test(execFileSync('unzip', ['-t', TRAVAIL + 'H-trente.memb']).toString()), `   … unzip -t passe (${(octets.length / 1048576).toFixed(1)} Mo)`)
  // L'ouvrir dans un autre profil
  const ctx2 = await contexte()
  const q = await ouvrir(ctx2, '', 'H2')
  await opfsEcrire(q, 'trente.memb', octets)
  await q.evaluate(OBSERVER)
  await q.waitForTimeout(500)
  const d1 = Date.now()
  const d = await ouvrirBiblioFichier(q, 'trente.memb')
  const lC = await q.evaluate(() => window.__longues.splice(0))
  ok(/: 30 classeurs, enregistrée le .+\. À ajouter : 30\.$/.test(d?.textes[0]) && !lC.some(e => e.duree > 100), `H2) La fenêtre (lecture et comparaison : ${((Date.now() - d1) / 1000).toFixed(1)} s) : aucune tâche de plus de 100 ms (la plus longue : ${Math.max(0, ...lC.map(e => e.duree))} ms)`, { d, lC })
  const d2 = Date.now()
  await cliquer(q, 'ajouter')
  ok(await attendreToast(q, /^Bibliothèque ouverte : 30 classeurs ajoutés\./, 300000), `   … « Bibliothèque ouverte : 30 classeurs ajoutés. » (${((Date.now() - d2) / 1000).toFixed(1)} s)`, await q.evaluate(() => window.__toasts.slice(-2)))
  const lA = await q.evaluate(() => window.__longues.splice(0))
  ok(!lA.some(e => e.duree > 100), `   … aucune tâche de plus de 100 ms pendant l'ajout (la plus longue : ${Math.max(0, ...lA.map(e => e.duree))} ms)`, lA)
  const x = await q.evaluate(id => window.__examiner('mem-teachingtool-classeur-' + id), G)
  ok(x.pages === 60 && x.formes === 18000 && !x.incomplet, '   … le classeur de 60 pages y est entier (18 000 traits)', x)
  await ctx.close(); await ctx2.close()
}

// =====================================================================
// I. FIREFOX (SANS LES CHOIX DE FICHIERS), L'iPAD
// =====================================================================
if (seul('I')) {
  console.log('\n=== I. Firefox (le choix d\'avant, le téléchargement) ; l\'iPad (sans accept) ===')
  const ctx = await contexte({ acceptDownloads: true })
  await ctx.addInitScript(() => { delete window.showSaveFilePicker; delete window.showOpenFilePicker; try { delete Window.prototype.showSaveFilePicker; delete Window.prototype.showOpenFilePicker } catch { /* rien */ } window.showSaveFilePicker = undefined; window.showOpenFilePicker = undefined })
  const p = await ouvrir(ctx, '', 'I')
  const D = Date.now() - 86400e3
  writeFileSync(TRAVAIL + 'I-un.memc', faireMemc(Y.encodeStateAsUpdate(unClasseur(['I1'])), { date: D, pages: 1, nom: 'Un', id: '1a1a1a1a1a1a1a1a' }))
  writeFileSync(TRAVAIL + 'I-deux.memc', faireMemc(Y.encodeStateAsUpdate(unClasseur(['I2'])), { date: D, pages: 1, nom: 'Deux', id: '2a2a2a2a2a2a2a2a' }))
  const fc = p.waitForEvent('filechooser', { timeout: 10000 })
  await p.keyboard.press('Control+o')
  const ch = await fc
  const acc = await ch.element().getAttribute('accept')
  ok(ch.isMultiple() && acc === '.memc,.memb,.prof', `I1) Sans showOpenFilePicker : le choix de fichier d'avant, plusieurs à la fois, accept « ${acc} »`)
  await ch.setFiles([TRAVAIL + 'I-un.memc', TRAVAIL + 'I-deux.memc'])
  const d = await dialogue(p)
  ok(d?.textes[0] === '2 fichiers : 2 classeurs à ajouter.' && !d.case, '   … deux fichiers : « 2 fichiers : 2 classeurs à ajouter. » (aucune case : pas de poignée)', d)
  await cliquer(p, 'ajouter')
  await attendreToast(p, /2 classeurs ajoutés/)
  await ouvrirBiblio(p)
  const tel = p.waitForEvent('download', { timeout: 60000 })
  await p.click('.biblio-tete [data-action="menu-bibliotheque"]'); await p.waitForTimeout(150)
  await p.click('.menu-flottant:not([hidden]) .menu-item[data-action="enregistrer-bibliotheque"]')
  const dl = await tel
  const chemin = TRAVAIL + 'I-telecharge.memb'
  await dl.saveAs(chemin)
  ok(/^Bibliothèque \d{4}-\d\d-\d\d \d\dh\d\d\.memb$/.test(dl.suggestedFilename()) && /No errors detected/.test(execFileSync('unzip', ['-t', chemin]).toString()), `I2) Sans showSaveFilePicker : « ${dl.suggestedFilename()} » se télécharge (unzip -t passe)`)
  await ctx.close()
  // L'iPad : le choix de fichier sans accept (il grise les .memc)
  const ipad = await contexte({ userAgent: 'Mozilla/5.0 (iPad; CPU OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Mobile/15E148 Safari/604.1', viewport: { width: 1024, height: 768 }, hasTouch: true })
  const i = await ouvrir(ipad, '', 'I-ipad')
  const a = await i.evaluate(() => document.querySelector('input.choix-fichiers')?.getAttribute('accept'))
  ok(a === null, 'I3) L\'iPad : le choix de fichier sans accept', a)
  await ipad.close()
}

// =====================================================================
// J. PENDANT LA REVUE : REFUSÉ
// =====================================================================
if (seul('J')) {
  console.log('\n=== J. Pendant la revue ou une séance : refusé ===')
  const ctx = await contexte()
  const p = await ouvrir(ctx, '', 'J')
  await opfsEcrire(p, 'j.memc', faireMemc(Y.encodeStateAsUpdate(unClasseur(['J1'])), { date: Date.now(), pages: 1, nom: 'J', id: '3a3a3a3a3a3a3a3a' }))
  await p.evaluate(async () => {
    window.__app.enLecture = true
    const f = await (await (await navigator.storage.getDirectory()).getFileHandle('j.memc')).getFile()
    void window.__fichiers.ouvrir([{ fichier: f }])
  })
  ok(await attendreToast(p, /^Fermez d'abord la revue\.$/), 'J1) Pendant la revue : « Fermez d\'abord la revue. »', await toasts(p))
  // (… pendant une séance d'automatismes : retiré avec elle, le flash se
  // joue maintenant sur une page de la séance)
  ok((await dialogues(p)).length === 0, '   … aucune fenêtre')
  await ctx.close()
}

// =====================================================================
// K. LA VERSION D'UN SEUL FICHIER (file://)
// =====================================================================
if (seul('K')) {
  console.log('\n=== K. La version d\'un seul fichier (file://) : Ctrl + O, Ajouter ===')
  const ctx = await nav.newContext({ viewport: { width: 1366, height: 768 } })
  await ctx.addInitScript(ECOUTER_TOASTS)
  const octets = faireMemc(Y.encodeStateAsUpdate(unClasseur(['K1', 'K2'])), { date: Date.now() - 3600e3, pages: 1, nom: 'Depuis la clé', id: '4a4a4a4a4a4a4a4a' })
  await ctx.addInitScript(b64 => {
    // L'OPFS est refusé en file:// : une poignée en mémoire
    const o = Uint8Array.from(atob(b64), c => c.charCodeAt(0))
    window.showOpenFilePicker = async () => [{ name: 'Depuis la clé.memc', kind: 'file', getFile: async () => new File([o], 'Depuis la clé.memc') }]
  }, octets.toString('base64'))
  const p = await ctx.newPage(); suivre(p, 'K')
  await p.goto('file://' + R + '/dist/index.html')
  await pretConstruit(p); await p.waitForTimeout(1500)
  await p.keyboard.press('Control+o')
  const d = await dialogue(p)
  ok(d?.titre === 'Ouvrir ce classeur ?' && boutons(d) === 'Annuler | Remplacer « Premier classeur »… | Ajouter à la bibliothèque', 'K1) file:// : Ctrl + O, la fenêtre', d)
  await Promise.all([p.waitForEvent('load', { timeout: 30000 }), cliquer(p, 'ajouter')])
  await pretConstruit(p); await p.waitForTimeout(800)
  ok(new URL(p.url()).search === '?classeur=4a4a4a4a4a4a4a4a' && (await p.title()) === 'Depuis la clé — MEM teachingtool' && (await toasts(p)).some(t => t.includes('Classeur ajouté à la bibliothèque : « Depuis la clé » (1 page).')),
    '   … Ajouter : on y est (« Classeur ajouté à la bibliothèque : « Depuis la clé » (1 page). »)', p.url())
  await ctx.close()
}

// =====================================================================
// L. LE TÉLÉPHONE, LE TNI : LE BANDEAU ET LES FENÊTRES TIENNENT
// =====================================================================
if (seul('L')) {
  console.log('\n=== L. Le téléphone (390 × 844), 1024 × 768, le TNI : le bandeau et les fenêtres tiennent ===')
  mkdirSync(ICI + 'captures', { recursive: true })
  for (const [l, h, nom] of [[390, 844, 'tel'], [1024, 768, 'pc'], [1920, 1080, 'tni']]) {
    const ctx = await contexte({ viewport: { width: l, height: h }, ...(nom === 'tel' ? { hasTouch: true, isMobile: true, deviceScaleFactor: 2 } : {}) })
    const p = await ouvrir(ctx, '', 'L-' + nom)
    await ouvrirBiblio(p)
    const v = await p.evaluate(() => {
      const b = document.querySelector('.biblio-bouton[data-action="ouvrir-fichier"]').getBoundingClientRect()
      const plus = document.querySelector('.biblio-tete [data-action="menu-bibliotheque"]').getBoundingClientRect()
      const titre = document.querySelector('.biblio-tete h2, .biblio-tete .biblio-titre')?.getBoundingClientRect()
      const lignes = new Set([...document.querySelectorAll('.biblio-actions > button:not([hidden]), .biblio-actions > * > button:not([hidden])')].map(x => Math.round(x.getBoundingClientRect().top)))
      return { ouvrir: { l: b.left, r: b.right, h: b.height, w: b.width }, plus: { r: plus.right, w: plus.width, h: plus.height }, lignesActions: lignes.size, defile: document.documentElement.scrollWidth > innerWidth || document.querySelector('.bibliotheque').scrollWidth > innerWidth, largeur: innerWidth }
    })
    if (l <= 480) {
      // Au téléphone, « Ouvrir… » ne tient pas sur la ligne de « Nouveau
      // classeur » et « Dossier » : il est dans le menu ⋯, en tête
      ok(v.ouvrir.w === 0 && v.plus.w > 0 && v.plus.r <= v.largeur && v.plus.h >= 40 && v.lignesActions === 1 && !v.defile, `L1) ${l} × ${h} : « Ouvrir… » passe dans le menu ⋯ (qui est dans l'écran, 40 px de haut au moins), les actions sur une ligne, pas de défilement de côté`, v)
      await p.click('.biblio-tete [data-action="menu-bibliotheque"]'); await p.waitForTimeout(150)
      const m = await p.evaluate(() => [...document.querySelectorAll('.menu-flottant:not([hidden]) .menu-item')].map(e => e.dataset.action + '|' + e.textContent))
      // (Adapté au lot 4, morceau C10 : « Récupérer une sauvegarde du Drive… » entre volontairement au menu du bandeau ;
      // et au lot 17 : « Vérifier les classeurs… » aussi, en dernier)
      ok(m.length === 4 && m[0].startsWith('ouvrir-fichier|Ouvrir un classeur ou une bibliothèque…') && m[1].startsWith('enregistrer-bibliotheque|') && m[2].startsWith('recuperer-sauvegarde|') && m[3].startsWith('verifier-classeurs|'), '   … le menu ⋯ : « Ouvrir un classeur ou une bibliothèque… », puis « Enregistrer toute la bibliothèque… », « Récupérer une sauvegarde du Drive… », « Vérifier les classeurs… »', m)
      await opfsEcrire(p, 'l0.memc', faireMemc(Y.encodeStateAsUpdate(unClasseur(['L0'])), { date: Date.now(), pages: 1, nom: 'Par le menu', id: '5a5a5a5a5a5a5a5b' }))
      await p.evaluate(() => { window.__aOuvrir = 'l0.memc' })
      await p.click('.menu-flottant:not([hidden]) .menu-item[data-action="ouvrir-fichier"]')
      // (Adapté au lot 7 : d'abord la fenêtre « Ouvrir », puis « Choisir des fichiers… »)
      await p.click('dialog.dialogue-ouvrir-ailleurs[open] .a-fichiers')
      const d0 = await dialogue(p)
      ok(d0?.titre === 'Ouvrir ce classeur ?', '   … et il ouvre le choix des fichiers (puis « Ouvrir ce classeur ? »)', d0)
      await cliquer(p, 'annuler')
    } else {
      ok(v.ouvrir.w > 0 && v.ouvrir.r <= v.largeur && v.plus.r <= v.largeur && v.ouvrir.h >= 40 && !v.defile, `L1) ${l} × ${h} : « Ouvrir… » et ⋯ dans l'écran (${Math.round(v.ouvrir.w)} px), 40 px de haut au moins, pas de défilement de côté`, v)
    }
    await p.screenshot({ path: ICI + `captures/bandeau-${nom}.png` })
    // La fenêtre d'un fichier
    await opfsEcrire(p, 'l.memc', faireMemc(Y.encodeStateAsUpdate(unClasseur(['L1'])), { date: Date.now(), pages: 1, nom: 'Un nom de classeur assez long pour voir', id: '5a5a5a5a5a5a5a5a' }))
    await ctrlO(p, 'l.memc')
    await dialogue(p)
    const f = await p.evaluate(() => { const d = document.querySelector('dialog[open]').getBoundingClientRect(); const bs = [...document.querySelectorAll('dialog[open] .actions button')].map(b => b.getBoundingClientRect()); return { l: d.left, r: d.right, b: d.bottom, h: innerHeight, w: innerWidth, boutons: bs.every(x => x.right <= d.right + 1 && x.height >= 44) } })
    ok(f.l >= 0 && f.r <= f.w && f.b <= f.h && f.boutons, `   … la fenêtre « Ouvrir ce classeur ? » tient dans l'écran, ses boutons de 44 px aussi`, f)
    await p.screenshot({ path: ICI + `captures/fenetre-${nom}.png` })
    await cliquer(p, 'annuler')
    await ctx.close()
  }
}

await nav.close()
if (erreurs.length) { console.log('Erreurs JS :'); for (const e of erreurs) console.log('  ', e) }
ok(!erreurs.length, 'Aucune erreur JS', erreurs)
console.log(echecs ? `\n${echecs} ÉCHEC(S)` : '\nTout est vert.')
process.exit(echecs ? 1 : 0)
