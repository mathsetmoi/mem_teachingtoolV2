// ESSAI DU MORCEAU C5-bibliotheque (lot 4) : la bibliothèque des classeurs.
// A. Les écrans (1366 × 768, 1024 × 768, 390 × 844, TNI 1920 × 1080
//    tactile), 30 classeurs : la grille, 6 dans Récents, deux colonnes à
//    390 px, Récents qui défile à l'horizontale, pas de défilement de la page.
// B. La souris : le bouton du classeur, l'écran (dialog, inerte, focus),
//    « Bibliothèque des classeurs… » du menu ⋯, les cartes (nom, date,
//    lecteur d'écran, Ouvert, ⋯), le clic droit, ouvrir un autre classeur
//    (?classeur=, le bon, Précédent, le cache du navigateur qui recharge),
//    le clic du milieu et Ctrl + clic (un onglet), le classeur de l'onglet
//    (l'écran se ferme ; le double-clic ne pose rien).
// C. Le stylet (PointerEvent 'pen', maxTouchPoints 0) : button 2 à l'appui
//    ouvre le menu, un toucher ouvre, un glisser n'ouvre rien.
// D. Le doigt (390 × 844) : un toucher bref ouvre, un glisser défile.
// E. Le clavier : Entrée et Espace sur le bouton, un arrêt de Tab par rangée,
//    les flèches selon la mise en page, Début, Fin, Menu, Maj + F10, Échap.
// F. Nouveau classeur en Seyès : une page, une étape de film « naissance » ;
//    le message à l'arrivée ; Échap n'en crée pas.
// G. Avec la case (http, OPFS) : le fichier écrit AVANT de partir ; la clé
//    active à l'arrivée ; DataCloneError : le bandeau « Choisissez de
//    nouveau le fichier de la clé » ; un fichier qui a déjà un classeur est
//    refusé ; renoncer crée sans clé. Plus de place : rien ne reste.
// H. La bibliothèque seule : ?bibliotheque, ?classeur=inconnu.
// I. Le trou simulé : changer de classeur demande d'enregistrer ; le rappel
//    au départ, une fois.
// J. Deux onglets : un renommage ailleurs ne vole pas le focus, ne refait
//    que sa carte ; le nom du bouton et le titre suivent.
// K. Inerte pendant la revue, la trieuse, une séance.
// L. L'annonce du premier lancement.
// M. La version d'un seul fichier (file://) : la bibliothèque seule, la
//    case cochée d'office, l'écriture avant de partir.
// N. Avant de partir : la fiche et la clé du classeur quitté écrites avant
//    le départ ; « Ouvrir sans attendre » après 5 s ; 10 s au plus.
// (Adapté au lot 4, morceau C8 : les menus d'un classeur et d'un dossier finissent par « Supprimer ».)
import { RACINE_ESSAIS, RACINE_DEPOT } from '../commun/racines.mjs'
import { chromium } from '../commun/playwright.mjs'
import * as Y from 'yjs'
import { existsSync, mkdirSync } from 'node:fs'
import { gunzipSync, gzipSync } from 'node:zlib'

const S = `${RACINE_ESSAIS}`
const R = `${RACINE_DEPOT}`
const ICI = S + '/lot4/C5/'
const CAPTURES = ICI + 'captures/'
const DEV = 'http://localhost:5173/'
mkdirSync(CAPTURES, { recursive: true })

let echecs = 0
const ok = (c, m, detail) => { if (!c) echecs++; console.log(c ? '✓' : '✗ ÉCHEC', m, !c && detail !== undefined ? '— ' + JSON.stringify(detail).slice(0, 1500) : '') }
const dort = ms => new Promise(r => setTimeout(r, ms))
const norm = t => (t || '').replace(/[  ]/g, ' ')
const seul = section => process.argv.length <= 2 || process.argv.slice(2).includes(section)

const erreurs = []
const suivre = (p, nom) => {
  p.on('pageerror', e => erreurs.push(`${nom}: ${e.message}`))
  p.on('console', m => { if (m.type() === 'error' && !/Failed to load resource|ERR_CERT|net::/.test(m.text())) erreurs.push(`${nom}: ${m.text()}`) })
}
/** Prêt : un classeur chargé (son état, sa bibliothèque), ou la bibliothèque seule */
const pret = p => p.waitForFunction(() => (window.__surveillance && window.__bibliotheque && document.querySelector('.rang')?.textContent?.includes('/'))
  || (window.__bibliotheque && !window.__app && !document.querySelector('.bibliotheque').hidden), null, { timeout: 30000 })
async function ecrire(p, x0, y0, n = 10) {
  await p.mouse.move(x0, y0); await p.mouse.down()
  for (let i = 1; i <= n; i++) await p.mouse.move(x0 + i * 10, y0 + Math.sin(i / 2) * 16)
  await p.mouse.up(); await p.waitForTimeout(80)
}
const ECOUTER_TOASTS = () => {
  window.__toasts = []
  let dernier = ''
  setInterval(() => { const t = [...document.querySelectorAll('.toast')].map(x => x.textContent).join('|').replace(/[  ]/g, ' '); if (t && t !== dernier) { dernier = t; window.__toasts.push(t) } }, 15)
}
const toasts = p => p.evaluate(() => window.__toasts.splice(0))
/** Les poignées de l'OPFS (comme C4), les écritures notées dans
 *  sessionStorage (elles survivent au départ vers le nouveau classeur), et
 *  l'heure du départ (pagehide) */
const INIT = () => {
  window.__choix = []
  window.__nomChoisi = null
  window.__choixPanne = null
  addEventListener('pagehide', () => { try { sessionStorage.setItem('__parti', String(Date.now())) } catch { /* rien */ } })
  const F = window.FileSystemFileHandle?.prototype
  if (!F) return
  const cw = F.createWritable
  window.__cwOrig = cw
  F.createWritable = async function (...a) {
    const w = await cw.apply(this, a)
    const nom = this.name
    return {
      write: d => w.write(d),
      close: async () => { await w.close(); try { const l = JSON.parse(sessionStorage.getItem('__ecritures') || '[]'); l.push({ nom, t: Date.now() }); sessionStorage.setItem('__ecritures', JSON.stringify(l)) } catch { /* rien */ } },
      abort: r => w.abort(r),
    }
  }
  window.showSaveFilePicker = async o => {
    const c = { nom: o?.suggestedName, actif: navigator.userActivation.isActive, id: o?.id }
    window.__choix.push(c)
    try { const l = JSON.parse(sessionStorage.getItem('__choix') || '[]'); l.push(c); sessionStorage.setItem('__choix', JSON.stringify(l)) } catch { /* rien */ }
    if (window.__choixPanne) throw new DOMException('simulé', window.__choixPanne)
    const dir = await navigator.storage.getDirectory()
    return dir.getFileHandle(window.__nomChoisi || o?.suggestedName || 'sans-nom.memc', { create: true })
  }
}
const nav = await chromium.launch({ env: { ...process.env, LANG: 'C.UTF-8', LC_ALL: 'C.UTF-8' } })
async function contexte(o = {}) {
  const ctx = await nav.newContext({ viewport: { width: 1366, height: 768 }, ...o })
  await ctx.addInitScript(INIT)
  await ctx.addInitScript(ECOUTER_TOASTS)
  return ctx
}
async function ouvrir(ctx, chemin = '', nom = 'dev') {
  const p = await ctx.newPage(); suivre(p, nom)
  await p.goto(DEV + chemin); await pret(p); await p.waitForTimeout(300)
  return p
}
/** n classeurs, créés comme le fait la bibliothèque (creerClasseur, creerBase,
 *  etatNeuf) ; ouverts il y a 1 à n minutes (le dernier créé le plus
 *  récemment), modifiés il y a 10 min à 10 n min */
const creerPlusieurs = (p, n, o = {}) => p.evaluate(async ({ n, o }) => {
  const dem = await import('/src/classeurs/demarrage.ts'), bases = await import('/src/classeurs/bases.ts'), neuf = await import('/src/classeurs/neuf.ts')
  const etat = await neuf.etatNeuf('carreaux'), T = Date.now(), ids = []
  for (let i = 0; i < n; i++) {
    const id = dem.idClasseur()
    const fiche = { id, base: dem.baseDe(id), nom: `${o.prefixe ?? 'Chapitre'} ${i + 1}`, dossier: null, etiquettes: [], cree: T - (n - i) * 3600e3, modifie: T - (n - i) * 600e3, ouvert: o.jamais ? 0 : T - (n - i) * 60e3, pages: 1 + (i % 5) }
    await window.__registre.creerClasseur(fiche, b => bases.creerBase(b, etat, { id, nom: fiche.nom }))
    ids.push(id)
  }
  return ids
}, { n, o })
const ouvrirBiblio = async p => {
  await p.evaluate(() => { const b = document.querySelector('.bouton-classeur'); if (b.checkVisibility?.() !== false && b.getClientRects().length) b.click(); else window.__app.ui.ouvrirBibliotheque() })
  await p.waitForFunction(() => window.__bibliotheque.ouvert && document.querySelectorAll('.grille-classeurs .carte-classeur').length > 0, null, { timeout: 10000 })
  await p.waitForTimeout(150)
}
/** Ce que montre la bibliothèque */
const VUE = () => {
  const b = document.querySelector('.bibliotheque')
  const liste = sel => [...document.querySelectorAll(sel + ' > .case-classeur')].map(li => {
    const a = li.querySelector('.carte-classeur'), r = li.getBoundingClientRect()
    return { id: li.dataset.id, nom: li.querySelector('.carte-nom-classeur').textContent, infos: li.querySelector('.carte-date').textContent.replace(/[  ]/g, ' '),
      label: (a.getAttribute('aria-label') || '').replace(/[  ]/g, ' '), href: a.getAttribute('href'), tab: a.tabIndex, ouvert: !li.querySelector('.pastille-ouvert').hidden,
      options: li.querySelector('.options-classeur').title, x: Math.round(r.left), y: Math.round(r.top), l: Math.round(r.width) }
  })
  return {
    ouvert: !b.hidden, role: b.getAttribute('role'), modal: b.getAttribute('aria-modal'), label: b.getAttribute('aria-label'),
    corps: document.body.classList.contains('en-bibliotheque'),
    compte: document.querySelector('.biblio-compte')?.textContent, fermer: !document.querySelector('.biblio-fermer').hidden,
    ligne: document.querySelector('.biblio-ouvert').hidden ? null : document.querySelector('.biblio-ouvert').textContent.replace(/[  ]/g, ' '),
    recents: liste('.grille-classeurs.recents'), tous: liste('.grille-classeurs.tous'),
    focus: document.activeElement?.closest?.('.case-classeur')?.dataset.id ?? document.activeElement?.className ?? null,
    focusListe: document.activeElement?.closest?.('.grille-classeurs')?.classList.contains('recents') ? 'recents' : document.activeElement?.closest?.('.grille-classeurs') ? 'tous' : null,
    sansTactile: b.classList.contains('sans-tactile'),
    menu: (() => { const m = [...document.querySelectorAll('.menu-flottant')].find(x => !x.hidden); return m ? { label: m.getAttribute('aria-label'), entrees: [...m.querySelectorAll('.menu-item')].map(e => e.dataset.action), r: (r => ({ l: Math.round(r.left), t: Math.round(r.top) }))(m.getBoundingClientRect()), focus: document.activeElement?.dataset?.action ?? null } : null })(),
  }
}
const vue = p => p.evaluate(VUE)
const DIALOGUES = () => [...document.querySelectorAll('dialog[open]')].map(d => ({
  titre: d.querySelector('h2')?.textContent, texte: (d.querySelector('p:not(.erreur)')?.textContent || '').replace(/[  ]/g, ' '),
  erreur: d.querySelector('.erreur')?.hidden === false ? d.querySelector('.erreur').textContent.replace(/[  ]/g, ' ') : null,
  boutons: [...d.querySelectorAll('.actions button')].map(b => b.textContent),
}))
const dialogues = p => p.evaluate(DIALOGUES)
/** Un .memc lu sous Node */
function lireMemc(o) {
  const fin = o.indexOf(0x0a)
  const entete = JSON.parse(o.subarray(0, fin).toString('utf8'))
  const d = new Y.Doc({ gc: false })
  Y.applyUpdate(d, new Uint8Array(gunzipSync(o.subarray(fin + 1))))
  return { entete, pages: d.getArray('ordre').length, film: d.getArray('film').toArray() }
}
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
const bases = p => p.evaluate(async () => (await indexedDB.databases()).map(d => d.name))
/** Clique une carte et attend l'arrivée sur l'autre classeur */
async function allerPar(p, faire) {
  await Promise.all([p.waitForNavigation({ timeout: 20000 }), faire()])
  await pret(p); await p.waitForTimeout(300)
}
const carte = (liste, id) => `.grille-classeurs.${liste} .case-classeur[data-id="${id}"] .carte-classeur`

// =====================================================================
// A. LES ÉCRANS
// =====================================================================
if (seul('A')) {
  console.log('=== A. les écrans, 30 classeurs ===')
  const ECRANS = [
    { nom: 'pc', l: 1366, h: 768, colonnes: 6 },
    { nom: 'tni-1024', l: 1024, h: 768, colonnes: 4 },
    { nom: 'telephone', l: 390, h: 844, t: true, mobile: true, colonnes: 2 },
    { nom: 'tni', l: 1920, h: 1080, t: true, colonnes: 8 },
  ]
  for (const e of ECRANS) {
    const ctx = await contexte({ viewport: { width: e.l, height: e.h }, hasTouch: !!e.t, isMobile: !!e.mobile })
    const p = await ouvrir(ctx, '', 'A-' + e.nom)
    await creerPlusieurs(p, 30)
    await ouvrirBiblio(p)
    const v = await vue(p)
    const geo = await p.evaluate(() => {
      const corps = document.querySelector('.biblio-corps'), rec = document.querySelector('.grille-classeurs.recents')
      const opt = document.querySelector('.options-classeur').getBoundingClientRect(), a = document.querySelector('.carte-classeur').getBoundingClientRect()
      return { page: document.documentElement.scrollWidth - innerWidth, corps: corps.scrollWidth - corps.clientWidth, recDefile: rec.scrollWidth > rec.clientWidth + 1,
        recLignes: new Set([...rec.children].map(c => Math.round(c.getBoundingClientRect().top))).size, opt: [Math.round(opt.width), Math.round(opt.height)], carteH: Math.round(a.height),
        tactile: navigator.maxTouchPoints > 0, ta: getComputedStyle(document.querySelector('.carte-classeur')).touchAction }
    })
    const colonnes = new Set(v.tous.filter(c => c.y === v.tous[0].y).map(c => c.x)).size
    ok(v.recents.length === 6 && v.tous.length === 31 && v.compte === '31 classeurs', `${e.nom} ${e.l} × ${e.h} : 6 dans Récents, 31 dans Tous les classeurs, « ${v.compte} »`, { r: v.recents.length, t: v.tous.length, c: v.compte })
    ok(colonnes === e.colonnes, `   … la grille : ${colonnes} colonnes (attendu ${e.colonnes})`, colonnes)
    ok(geo.page <= 0 && geo.corps <= 0, '   … aucun défilement horizontal de la page ni de la grille', geo)
    ok(geo.opt[0] >= 44 && geo.opt[1] >= 44, `   … le bouton ⋯ d'une carte : ${geo.opt.join(' × ')} px`, geo.opt)
    if (e.mobile) ok(geo.recDefile && geo.recLignes === 1, '   … au téléphone, Récents est une seule rangée qui défile à l\'horizontale', geo)
    else ok(!geo.recDefile, '   … Récents ne défile pas à l\'horizontale', geo)
    ok(geo.tactile ? geo.ta.includes('pan-y') && !v.sansTactile : geo.ta === 'none' && v.sansTactile, `   … touch-action : ${geo.ta} (${geo.tactile ? 'écran tactile' : 'sans écran tactile'})`, geo)
    ok(JSON.stringify(v.recents.map(c => c.nom)) === JSON.stringify(['Premier classeur', 'Chapitre 30', 'Chapitre 29', 'Chapitre 28', 'Chapitre 27', 'Chapitre 26']),
      '   … Récents : les derniers ouverts d\'abord (le classeur de l\'onglet, puis ceux ouverts il y a 1, 2… minutes)', v.recents.map(c => c.nom))
    await p.screenshot({ path: CAPTURES + `A-${e.nom}.png` })
    await ctx.close()
  }
}

// =====================================================================
// B. LA SOURIS
// =====================================================================
if (seul('B')) {
  console.log('\n=== B. la souris : l\'écran, les cartes, ouvrir un autre classeur ===')
  const ctx = await contexte()
  const p = await ouvrir(ctx, '', 'B')
  const premier = await p.evaluate(() => window.__app.classeur.id)
  const ids = await creerPlusieurs(p, 3)
  await ecrire(p, 500, 400)
  // Le bouton du classeur : un clic ouvre la bibliothèque
  await p.click('.bouton-classeur'); await p.waitForTimeout(400)
  let v = await vue(p)
  const inerte = await p.evaluate(() => ({ outils: document.querySelector('.barre-outils').inert, haut: document.querySelector('.barre-haut').inert, classeur: document.querySelector('.barre-classeur').inert, toast: document.querySelector('.toast').inert, zone: document.getElementById('zone').inert, cache: !!window.__app && (() => { const n = window.__app; return document.body.classList.contains('en-bibliotheque') })() }))
  ok(v.ouvert && v.corps && v.role === 'dialog' && v.modal === 'true' && v.label === 'Bibliothèque des classeurs' && v.fermer, 'Un clic sur le bouton du classeur : la bibliothèque (role dialog, aria-modal, « Bibliothèque des classeurs », ×), body.en-bibliotheque', v)
  ok(inerte.outils && inerte.haut && inerte.classeur && inerte.zone && !inerte.toast, '   … le reste de l\'écran est inerte, sauf le message', inerte)
  ok(v.focus === premier && v.focusListe === 'recents', '   … le focus sur la carte du classeur ouvert, dans Récents', v.focus)
  const c0 = v.tous.find(c => c.id === premier)
  ok(c0 && c0.ouvert && c0.nom === 'Premier classeur' && /^Modifié aujourd'hui à \d+ h \d\d · 1 page$/.test(c0.infos) && /^Premier classeur, 1 page, modifié aujourd'hui à \d+ h \d\d, ouvert dans cet onglet$/.test(c0.label)
    && c0.href === '?classeur=' + premier || (c0 && c0.href.endsWith('?classeur=' + premier)), `   … sa carte : « ${c0?.nom} », « ${c0?.infos} », « Ouvert » ; le lecteur d'écran : « ${c0?.label} »`, c0)
  ok(v.tous.every(c => c.options === `Options de « ${c.nom} »`) && v.tous.filter(c => c.ouvert).length === 1, '   … le bouton ⋯ de chaque carte : « Options de « … » » ; un seul « Ouvert »', v.tous.map(c => c.options))
  // (Adapté au lot 4, morceau C10 : la copie sur le Drive, voulue par défaut en ligne, attend la
  // connexion Google ; la ligne le dit, avec son bouton)
  ok(/^« Premier classeur » : Enregistré dans ce navigateur · Drive en attente de la connexion Google · jamais enregistré dans un fichierSe connecter à Google$/.test(v.ligne), `   … la ligne du classeur ouvert : « ${v.ligne} »`, v.ligne)
  ok(v.tous.map(c => c.nom).join() === ['Premier classeur', 'Chapitre 3', 'Chapitre 2', 'Chapitre 1'].join(), '   … Tous les classeurs : le plus récemment modifié d\'abord', v.tous.map(c => c.nom))
  const tout = await p.evaluate(() => document.querySelector('.bibliotheque').innerText + [...document.querySelectorAll('.bibliotheque [title], .bibliotheque [aria-label]')].map(x => x.title + x.getAttribute('aria-label')).join(' '))
  ok(!/\bundefined\b|\bNaN\b|\[object Object\]/.test(tout), '   … aucun texte « undefined », « NaN » ni « [object Object] »')
  await p.screenshot({ path: CAPTURES + 'B-bibliotheque.png' })
  // Échap : l'écran se ferme, le focus revient au bouton
  await p.keyboard.press('Escape'); await p.waitForTimeout(200)
  v = await vue(p)
  const f1 = await p.evaluate(() => ({ focus: document.activeElement?.classList.contains('bouton-classeur'), inerte: document.querySelector('.barre-outils').inert }))
  ok(!v.ouvert && !v.corps && f1.focus && !f1.inerte, 'Échap : l\'écran se ferme, le focus revient au bouton du classeur, plus rien d\'inerte', f1)
  // Le menu ⋯ : « Bibliothèque des classeurs… » en tête
  await p.click('.barre-haut .bouton.points'); await p.waitForTimeout(150)
  // (Adapté au lot 5, morceau K9 : « Cet appareil » et ses deux cases entrent volontairement au bout du menu ⋯ ; lot5/K9-affichage.mjs les vérifie)
  const entrees = await p.evaluate(() => [...[...document.querySelectorAll('.menu-flottant')].find(x => !x.hidden).querySelectorAll('.menu-item:not([data-action="contraste"]):not([data-action="noms-outils"]):not([data-action="nouvelle-seance"]):not([data-action="renommer-seance"]):not([data-action="seance-precedente"]):not([data-action="retour-aujourdhui"])')].map(e => e.dataset.action ?? 'etat'))
  // (Adapté au lot 4, morceau C10 : « Copie sur le Drive… » (copie-drive) entre volontairement dans le menu ⋯, avant « Ouvrir un classeur… » ;
// adapté au lot 7 : « Enregistrer sur le Drive ou ailleurs… » (enregistrer-ailleurs) aussi, juste après)
  // (et la ligne du Drive, en tête, porte son bouton « Se connecter à Google » : une copie attend)
  ok(entrees.filter(x => x !== 'etat')[0] === 'bibliotheque' && JSON.stringify(entrees.filter(x => x !== 'etat')) === '["bibliotheque","enregistrer","activer-cle","copie-drive","enregistrer-ailleurs","ouvrir","exporter-pdf"]', 'Le menu ⋯ : « Bibliothèque des classeurs… » (data-action bibliotheque) en tête des entrées', entrees)
  await p.click('.menu-flottant:not([hidden]) .menu-item[data-action="bibliotheque"]'); await p.waitForTimeout(300)
  ok((await vue(p)).ouvert, '   … elle ouvre la bibliothèque')
  // Le menu ⋯ du bandeau : caché tant qu'aucun morceau n'y met d'entrée
  // (Adapté au lot 4, morceau C9 : « Enregistrer toute la bibliothèque… » y
  // est désormais toujours ; le ⋯ passe à côté de la corbeille, data-action
  // menu-bibliotheque)
  const sansEntree = await p.evaluate(() => { const b = document.querySelector('.biblio-tete [data-action="menu-bibliotheque"]'); return !!b && !b.hidden })
  await p.keyboard.press('Escape'); await p.waitForTimeout(150)
  await p.evaluate(async () => {
    const { entreeMenu } = await import('/src/menus.ts')
    window.__bibliotheque.menuDuBandeau.push(m => entreeMenu(m, 'Une entrée d\'essai', () => { window.__essai = 1 }, { action: 'essai' }))
  })
  await ouvrirBiblio(p)
  await p.click('.biblio-tete [data-action="menu-bibliotheque"]'); await p.waitForTimeout(150)
  const lesEntrees = await p.evaluate(() => [...document.querySelectorAll('.menu-flottant:not([hidden]) .menu-item')].map(e => e.dataset.action))
  await p.click('.menu-flottant:not([hidden]) .menu-item[data-action="essai"]'); await p.waitForTimeout(100)
  // (Adapté au lot 4, morceau C10 : « Récupérer une sauvegarde du Drive… » entre volontairement au menu du bandeau)
  ok(sansEntree && lesEntrees.join() === 'enregistrer-bibliotheque,recuperer-sauvegarde,essai' && await p.evaluate(() => window.__essai === 1 && window.__bibliotheque.ouvert), 'Le menu ⋯ du bandeau : visible (« Enregistrer toute la bibliothèque… ») ; une entrée ajoutée (menuDuBandeau) y paraît et marche', { sansEntree, lesEntrees })
  // Le clic droit sur une carte : son menu, là où l'on a appuyé
  const r = await p.locator(carte('tous', ids[1])).boundingBox()
  await p.mouse.click(r.x + 60, r.y + 40, { button: 'right' }); await p.waitForTimeout(200)
  v = await vue(p)
  // (Adapté au lot 4, morceau C6 : le menu d'un classeur gagne « Renommer… »
  // et « Étiquettes de classe… » après « Ouvrir », qui reste en tête ; puis,
  // au morceau C7, « Déplacer vers… » et « Dupliquer le classeur » ; au
  // morceau C9, « Enregistrer dans un fichier… »)
  ok(v.menu && v.menu.label === 'Chapitre 2' && v.menu.entrees[0] === 'ouvrir-classeur' && v.menu.entrees.join() === 'ouvrir-classeur,renommer,etiquettes,deplacer,dupliquer,enregistrer-classeur,supprimer' && Math.abs(v.menu.r.l - (r.x + 66)) < 8 && v.focus === ids[1], 'Le clic droit sur une carte : son menu (« Ouvrir » en tête), là où l\'on a appuyé', v.menu)
  await p.keyboard.press('Escape'); await p.waitForTimeout(150)
  ok(!(await vue(p)).menu && (await vue(p)).ouvert, '   … Échap ferme le menu, pas l\'écran')
  // Le bouton ⋯ d'une carte
  await p.click(`.grille-classeurs.tous .case-classeur[data-id="${ids[0]}"] .options-classeur`); await p.waitForTimeout(150)
  v = await vue(p)
  ok(v.menu && v.menu.label === 'Chapitre 1', '   … son bouton ⋯ aussi', v.menu)
  await p.keyboard.press('Escape'); await p.waitForTimeout(150)
  // Le clic du milieu : un autre onglet, sur ce classeur ; celui-ci ne bouge pas
  const [onglet] = await Promise.all([ctx.waitForEvent('page', { timeout: 10000 }), p.click(carte('tous', ids[2]), { button: 'middle' })])
  suivre(onglet, 'B-milieu'); await onglet.waitForURL(/classeur=/, { timeout: 10000 }).catch(() => {}); await pret(onglet)
  ok(onglet.url().endsWith('?classeur=' + ids[2]) && await onglet.evaluate(() => window.__app.classeur.nom) === 'Chapitre 3' && p.url().endsWith('?classeur=' + premier) && (await vue(p)).ouvert,
    'Le clic du milieu : « Chapitre 3 » s\'ouvre dans un autre onglet ; celui-ci ne bouge pas', onglet.url())
  await onglet.close()
  const [onglet2] = await Promise.all([ctx.waitForEvent('page', { timeout: 10000 }), p.click(carte('tous', ids[1]), { modifiers: ['Control'] })])
  suivre(onglet2, 'B-ctrl'); await onglet2.waitForURL(/classeur=/, { timeout: 10000 }).catch(() => {}); await pret(onglet2)
  ok(onglet2.url().endsWith('?classeur=' + ids[1]) && p.url().endsWith('?classeur=' + premier), '   … Ctrl + clic aussi', onglet2.url())
  await onglet2.close()
  // Ouvrir un autre classeur : l'adresse, le bon classeur, les traits restent dans l'autre
  const avant = await p.evaluate(() => window.__app.formes.length)
  await allerPar(p, () => p.click(carte('tous', ids[1])))
  const arrive = await p.evaluate(() => ({ id: window.__app.classeur.id, nom: window.__app.classeur.nom, titre: document.title, formes: window.__app.formes.length, biblio: window.__bibliotheque.ouvert }))
  ok(p.url().endsWith('?classeur=' + ids[1]) && arrive.id === ids[1] && arrive.nom === 'Chapitre 2' && arrive.titre === 'Chapitre 2 — MEM teachingtool' && arrive.formes === 0 && !arrive.biblio,
    `Un clic sur « Chapitre 2 » : ?classeur=${ids[1]}, le bon classeur (son titre, sans les traits de l'autre), la bibliothèque fermée`, arrive)
  // Précédent : le classeur d'avant, avec son trait
  await p.goBack(); await pret(p); await p.waitForTimeout(300)
  const retour = await p.evaluate(() => ({ id: window.__app.classeur.id, formes: window.__app.formes.length }))
  ok(retour.id === premier && retour.formes === avant && p.url().endsWith('?classeur=' + premier), 'Précédent : le classeur d\'avant, avec son trait', retour)
  // Une page rendue par le cache du navigateur se recharge
  await p.evaluate(() => { window.__marque = 1 })
  await Promise.all([p.waitForNavigation(), p.evaluate(() => window.dispatchEvent(new PageTransitionEvent('pageshow', { persisted: true })))])
  await pret(p)
  ok(await p.evaluate(() => window.__marque === undefined && window.__app.classeur.id) === premier, 'pageshow avec persisted (le cache du navigateur) : la page se recharge')
  // Le classeur de l'onglet : l'écran se ferme ; un double-clic ne pose rien sur la page
  await ouvrirBiblio(p)
  const n0 = await p.evaluate(() => window.__app.formes.length)
  await p.dblclick(carte('recents', premier)); await p.waitForTimeout(700)
  const ferme = await p.evaluate(() => ({ ouvert: window.__bibliotheque.ouvert, formes: window.__app.formes.length, url: location.search, dialogue: !!document.querySelector('dialog[open]'), panneau: !!document.querySelector('.panneau:not([hidden])') }))
  ok(!ferme.ouvert && ferme.formes === n0 && ferme.url === '?classeur=' + premier && !ferme.dialogue, 'Le classeur de l\'onglet : l\'écran se ferme ; le second clic d\'un double-clic ne pose rien', ferme)
  await ctx.close()
}

// =====================================================================
// C. LE STYLET (WACOM SANS ÉCRAN)
// =====================================================================
if (seul('C')) {
  console.log('\n=== C. le stylet (pointerType pen, maxTouchPoints 0) ===')
  const ctx = await contexte()
  const p = await ouvrir(ctx, '', 'C')
  const ids = await creerPlusieurs(p, 2)
  await ouvrirBiblio(p)
  const stylet = (id, type, o = {}) => p.evaluate(({ sel, type, o }) => {
    const a = document.querySelector(sel), r = a.getBoundingClientRect()
    const x = r.left + 50, y = r.top + 40
    const ev = (t, dx = 0, dy = 0, b = o.button ?? 0) => new PointerEvent(t, { bubbles: true, cancelable: true, composed: true, pointerId: 7, pointerType: 'pen', isPrimary: true, button: t === 'pointermove' ? -1 : b, buttons: t === 'pointerup' ? 0 : (b === 2 ? 2 : 1), clientX: x + dx, clientY: y + dy, pressure: 0.5 })
    a.dispatchEvent(ev('pointerdown'))
    if (type === 'droit') { a.dispatchEvent(new MouseEvent('contextmenu', { bubbles: true, cancelable: true, clientX: x, clientY: y, button: 2 })); return { x, y, tactile: navigator.maxTouchPoints } }
    if (type === 'glisser') for (let i = 1; i <= 6; i++) a.dispatchEvent(ev('pointermove', i * 6, i * 2))
    a.dispatchEvent(ev('pointerup', type === 'glisser' ? 36 : 0, type === 'glisser' ? 12 : 0))
    a.dispatchEvent(new MouseEvent('click', { bubbles: true, cancelable: true, detail: 1, clientX: x, clientY: y, button: 0 }))
    return { x, y, tactile: navigator.maxTouchPoints }
  }, { sel: carte('tous', id), type, o })
  // Le bouton latéral (button 2), à l'appui : le menu de la carte
  const r2 = await stylet(ids[0], 'droit', { button: 2 })
  await p.waitForTimeout(150)
  let v = await vue(p)
  ok(r2.tactile === 0 && v.sansTactile, 'navigator.maxTouchPoints = 0 : la bibliothèque est .sans-tactile', r2)
  ok(v.menu && v.menu.label === 'Chapitre 1' && Math.abs(v.menu.r.l - (r2.x + 6)) < 8, 'Le bouton latéral du stylet (button 2) : le menu de la carte, là où il appuie', v.menu)
  await p.keyboard.press('Escape'); await p.waitForTimeout(100)
  // Un glisser de la plume n'ouvre rien
  await stylet(ids[1], 'glisser'); await p.waitForTimeout(600)
  ok(p.url().endsWith('?classeur=' + (await p.evaluate(() => window.__app.classeur.id))) && (await vue(p)).ouvert, 'Un glisser de la plume sur une carte n\'ouvre rien')
  // Un toucher de la plume ouvre
  await allerPar(p, () => stylet(ids[1], 'toucher'))
  ok(await p.evaluate(() => window.__app.classeur.nom) === 'Chapitre 2', 'Un toucher de la plume : « Chapitre 2 » s\'ouvre')
  await ctx.close()
}

// =====================================================================
// D. LE DOIGT (TÉLÉPHONE)
// =====================================================================
if (seul('D')) {
  console.log('\n=== D. le doigt (390 × 844) ===')
  const ctx = await contexte({ viewport: { width: 390, height: 844 }, hasTouch: true, isMobile: true })
  const p = await ouvrir(ctx, '', 'D')
  const ids = await creerPlusieurs(p, 12)
  await ouvrirBiblio(p)
  // (Adapté au lot 4, morceau C6 : le conseil du rangement par classe paraît
  // en tête de la bibliothèque tant qu'il n'y a aucun dossier ; on l'écarte
  // d'abord (« Plus tard »), comme le professeur, pour que la grille soit là
  // où cet essai pose le doigt)
  await p.tap('.biblio-conseil [data-action="conseil-plus-tard"]'); await p.waitForTimeout(200)
  const cdp = await ctx.newCDPSession(p)
  const glisser = async (x0, y0, x1, y1) => {
    await cdp.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [{ x: x0, y: y0 }] })
    for (let i = 1; i <= 10; i++) { await cdp.send('Input.dispatchTouchEvent', { type: 'touchMove', touchPoints: [{ x: x0 + (x1 - x0) * i / 10, y: y0 + (y1 - y0) * i / 10 }] }); await dort(16) }
    await cdp.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] })
    await p.waitForTimeout(500)
  }
  // Un glisser vertical sur Tous les classeurs : la grille défile, rien ne s'ouvre
  // (depuis une carte de Tous les classeurs, au bas de l'écran)
  const sous = await p.evaluate(() => document.elementFromPoint(100, 760)?.closest('.grille-classeurs')?.classList.contains('tous'))
  const avant = await p.evaluate(() => document.querySelector('.biblio-corps').scrollTop)
  await glisser(100, 760, 100, 420)
  ok(sous, '   (le doigt part d\'une carte de Tous les classeurs)')
  const apres = await p.evaluate(() => ({ s: document.querySelector('.biblio-corps').scrollTop, ouvert: window.__bibliotheque.ouvert, url: location.search }))
  ok(apres.s > avant + 50 && apres.ouvert && apres.url === '?classeur=' + await p.evaluate(() => window.__app.classeur.id), `Un glisser du doigt sur la grille : elle défile (${avant} → ${apres.s}), rien ne s'ouvre`, apres)
  // Un glisser horizontal sur Récents : la rangée défile
  await p.evaluate(() => { document.querySelector('.biblio-corps').scrollTop = 0 })
  await p.waitForTimeout(100)
  const rr = await p.locator('.grille-classeurs.recents').boundingBox()
  await glisser(rr.x + 300, rr.y + 60, rr.x + 40, rr.y + 64)
  const rec = await p.evaluate(() => ({ s: document.querySelector('.grille-classeurs.recents').scrollLeft, ouvert: window.__bibliotheque.ouvert }))
  ok(rec.s > 50 && rec.ouvert, `Un glisser horizontal sur Récents : la rangée défile (${rec.s} px), rien ne s'ouvre`, rec)
  await p.screenshot({ path: CAPTURES + 'D-telephone.png' })
  // Un toucher bref : le classeur s'ouvre
  await p.evaluate(() => { document.querySelector('.biblio-corps').scrollTop = 0 })
  await allerPar(p, () => p.tap(carte('tous', ids[11])))
  ok(await p.evaluate(() => window.__app.classeur.nom) === 'Chapitre 12', 'Un toucher bref : « Chapitre 12 » s\'ouvre')
  await ctx.close()
}

// =====================================================================
// E. LE CLAVIER
// =====================================================================
if (seul('E')) {
  console.log('\n=== E. le clavier ===')
  const ctx = await contexte()
  const p = await ouvrir(ctx, '', 'E')
  const premier = await p.evaluate(() => window.__app.classeur.id)
  const ids = await creerPlusieurs(p, 14)
  // Entrée, puis Espace, sur le bouton du classeur (le focus venu du clavier)
  for (const touche of ['Enter', ' ']) {
    await p.evaluate(() => document.querySelector('.bouton-classeur').blur())
    await p.focus('.bouton-classeur'); await p.keyboard.press('Shift+Tab'); await p.keyboard.press('Tab')
    await p.keyboard.press(touche); await p.waitForTimeout(400)
    const v = await vue(p)
    ok(v.ouvert && v.focus === premier, `${touche === ' ' ? 'Espace' : 'Entrée'} sur le bouton du classeur : la bibliothèque, le focus sur le classeur ouvert`, v.focus)
    await p.keyboard.press('Escape'); await p.waitForTimeout(200)
    ok(await p.evaluate(() => document.activeElement?.classList.contains('bouton-classeur') && !window.__bibliotheque.ouvert), '   … Échap : fermée, le focus revient au bouton')
  }
  await ouvrirBiblio(p)
  let v = await vue(p)
  // Récents : un seul arrêt de Tab
  const tabs = await p.evaluate(() => [...document.querySelectorAll('.grille-classeurs')].map(l => [...l.querySelectorAll('.carte-classeur')].filter(a => a.tabIndex === 0).length))
  ok(JSON.stringify(tabs) === '[1,1]', 'Un seul arrêt de Tab par rangée (Récents, Tous les classeurs)', tabs)
  const rec = v.recents.map(c => c.id)
  await p.keyboard.press('Home'); v = await vue(p)
  ok(v.focus === rec[0], 'Début : la première carte de la rangée', v.focus)
  await p.keyboard.press('ArrowRight'); v = await vue(p)
  ok(v.focus === rec[1], '→ : la suivante', v.focus)
  await p.keyboard.press('End'); v = await vue(p)
  ok(v.focus === rec[rec.length - 1], 'Fin : la dernière', v.focus)
  await p.keyboard.press('ArrowLeft'); v = await vue(p)
  ok(v.focus === rec[rec.length - 2], '← : la précédente', v.focus)
  // Tab : la rangée suivante (Tous les classeurs)
  // (Adapté au lot 4, morceau C6 : entre les deux rangées, le bouton « Trier :
  // Modifiés récemment », au-dessus de la grille, prend un arrêt de Tab)
  await p.keyboard.press('Tab')
  const tri = await p.evaluate(() => document.activeElement?.classList.contains('biblio-tri'))
  await p.keyboard.press('Tab'); v = await vue(p)
  ok(tri && v.focusListe === 'tous', 'Tab : « Trier », puis la rangée suivante (Tous les classeurs), pas la carte suivante de Récents', { tri, v })
  await p.keyboard.press('Home'); v = await vue(p)
  const t0 = v.tous[0], col = v.tous.filter(c => c.y === t0.y).length
  await p.keyboard.press('ArrowDown'); v = await vue(p)
  const bas = v.tous.find(c => c.id === v.focus)
  ok(v.focus === v.tous[col].id && bas.x === t0.x, `↓ : la carte en dessous (selon la mise en page réelle : ${col} colonnes)`, { focus: v.focus, attendu: v.tous[col].id })
  await p.keyboard.press('ArrowUp'); v = await vue(p)
  ok(v.focus === t0.id, '↑ : la carte au-dessus', v.focus)
  // La touche Menu, puis Maj + F10 : le menu de la carte, le focus sur « Ouvrir »
  for (const touche of ['ContextMenu', 'Shift+F10']) {
    await p.keyboard.press(touche); await p.waitForTimeout(150); v = await vue(p)
    ok(v.menu && v.menu.focus === 'ouvrir-classeur', `${touche === 'ContextMenu' ? 'La touche Menu' : 'Maj + F10'} : le menu de la carte, le focus sur « Ouvrir »`, v.menu)
    await p.keyboard.press('Escape'); await p.waitForTimeout(150); v = await vue(p)
    ok(!v.menu && v.ouvert && v.focus === t0.id, '   … Échap : le menu se ferme, le focus revient à la carte, l\'écran reste', v)
  }
  // Entrée sur un autre classeur : il s'ouvre
  await p.keyboard.press('ArrowRight'); v = await vue(p)
  const cible = v.focus
  await allerPar(p, () => p.keyboard.press('Enter'))
  ok(await p.evaluate(() => window.__app.classeur.id) === cible, 'Entrée sur une carte : son classeur s\'ouvre')
  await ctx.close()
}

// =====================================================================
// F. NOUVEAU CLASSEUR
// =====================================================================
if (seul('F')) {
  console.log('\n=== F. Nouveau classeur ===')
  const ctx = await contexte()
  const p = await ouvrir(ctx, '', 'F')
  await ouvrirBiblio(p)
  await p.click('.biblio-nouveau'); await p.waitForTimeout(250)
  const d = await p.evaluate(() => {
    const d = document.querySelector('dialog.dialogue-nouveau[open]'), i = d?.querySelector('input[name="nom"]')
    return { titre: d?.querySelector('h2').textContent, nom: i?.value, choisi: i && i.selectionStart === 0 && i.selectionEnd === i.value.length && document.activeElement === i, max: i?.maxLength,
      fonds: [...d.querySelectorAll('input[name="fond"]')].map(r => r.parentElement.textContent + (r.checked ? ' ✓' : '')), legende: d.querySelector('legend').textContent,
      cle: d.querySelector('.case-cle') ? { texte: d.querySelector('.case-cle span').firstChild.textContent, coche: d.querySelector('.case-cle input').checked } : null,
      boutons: [...d.querySelectorAll('.actions button')].map(b => b.textContent + (b.classList.contains('principal') ? ' (principal)' : '')) }
  })
  ok(d.titre === 'Nouveau classeur' && d.nom === 'Nouveau classeur' && d.choisi && d.max === 60, 'La fenêtre « Nouveau classeur » : le nom prérempli, tout choisi, 60 caractères', d)
  // (Adapté aux réglages par défaut, retouches après le lot 5 : la page blanche est cochée d'office, l'ordre ne change pas)
  ok(d.legende === 'Fond de la première page' && JSON.stringify(d.fonds) === JSON.stringify(['Petits carreaux', 'Page blanche ✓', 'Seyès', 'Repère', 'Grands carreaux (1 cm)', 'Papier millimétré', 'Papier pointé', 'Réseau isométrique']), '   … le fond : Petits carreaux, Page blanche (cochée), Seyès, Repère, puis les quatre du lot 5 (K8 : adapté volontairement)', d.fonds)
  ok(d.cle && d.cle.texte === 'Enregistrer automatiquement sur la clé' && !d.cle.coche, '   … la case de la clé (Chrome), décochée en ligne', d.cle)
  ok(JSON.stringify(d.boutons) === JSON.stringify(['Annuler', 'Créer et ouvrir (principal)']), '   … [Annuler] [Créer et ouvrir]', d.boutons)
  await p.screenshot({ path: CAPTURES + 'F-nouveau.png' })
  // Échap : rien n'est créé
  await p.keyboard.press('Escape'); await p.waitForTimeout(200)
  const n0 = (await p.evaluate(async () => (await window.__registre.classeurs()).length))
  ok(n0 === 1 && !(await dialogues(p)).length && (await vue(p)).ouvert, 'Échap : la fenêtre se ferme, rien n\'est créé, la bibliothèque reste', n0)
  // En Seyès, le nom tapé, Entrée
  await p.click('.biblio-nouveau'); await p.waitForTimeout(200)
  await p.keyboard.type('Symétrie centrale')
  await p.check('dialog input[value="seyes"]')
  await p.focus('dialog input[name="nom"]')
  await toasts(p)
  await allerPar(p, () => p.keyboard.press('Enter'))
  const n = await p.evaluate(async () => {
    const t = window.__app.tableau, film = t.film.toArray()
    const f = await window.__registre.classeur(window.__app.classeur.id)
    return { nom: window.__app.classeur.nom, titre: document.title, pages: window.__app.pages.length, fond: window.__app.fond, film: film.map(e => ({ naissance: !!e.naissance, page: e.page })), page: window.__app.pages[0],
      base: t.base, fiche: { pages: f.pages, nom: f.nom, creation: f.creation, dossier: f.dossier, etiquettes: f.etiquettes }, url: location.search, id: window.__app.classeur.id }
  })
  ok(n.nom === 'Symétrie centrale' && n.titre === 'Symétrie centrale — MEM teachingtool' && n.url === '?classeur=' + n.id && n.base === 'mem-teachingtool-classeur-' + n.id,
    `Créer et ouvrir (Entrée) : « ${n.nom} » s'ouvre (?classeur=…, sa base)`, n)
  ok(n.pages === 1 && n.fond === 'seyes' && n.film.length === 1 && n.film[0].naissance && n.film[0].page === n.page, '   … une page, en Seyès ; une étape de film, marquée naissance', n)
  ok(n.fiche.pages === 1 && n.fiche.creation === undefined && n.fiche.dossier === null && n.fiche.etiquettes.length === 0, '   … sa fiche : 1 page, plus en création, à la racine, sans étiquette', n.fiche)
  await p.waitForTimeout(400)
  const t = await toasts(p)
  ok(t.some(x => x.includes('Classeur « Symétrie centrale » créé.')), '   … à l\'arrivée : « Classeur « Symétrie centrale » créé. »', t)
  await ouvrirBiblio(p)
  const v = await vue(p)
  ok(v.recents[0]?.nom === 'Symétrie centrale' && v.recents[0].ouvert && v.compte === '2 classeurs', '   … dans la bibliothèque : en tête de Récents, « Ouvert », « 2 classeurs »', v.recents)
  // Un nom vide : « Nouveau classeur »
  await p.click('.biblio-nouveau'); await p.waitForTimeout(200)
  await p.fill('dialog input[name="nom"]', '   ')
  await allerPar(p, () => p.click('dialog [data-a="creer"]'))
  ok(await p.evaluate(() => window.__app.classeur.nom) === 'Nouveau classeur', 'Un nom vide : « Nouveau classeur »')
  await ctx.close()
}

// =====================================================================
// G. AVEC LA CASE DE LA CLÉ (HTTP, OPFS) ; PLUS DE PLACE
// =====================================================================
if (seul('G')) {
  console.log('\n=== G. la case « Enregistrer automatiquement sur la clé » (OPFS) ===')
  const ctx = await contexte()
  const p = await ouvrir(ctx, '', 'G')
  await ouvrirBiblio(p)
  await p.click('.biblio-nouveau'); await p.waitForTimeout(200)
  await p.fill('dialog input[name="nom"]', 'Fractions')
  await p.check('dialog .case-cle input')
  await p.evaluate(() => { sessionStorage.removeItem('__ecritures'); sessionStorage.removeItem('__choix') })
  await allerPar(p, () => p.click('dialog [data-a="creer"]'))
  await p.evaluate(() => window.__cle?.pret)
  await p.waitForTimeout(600)
  const g = await p.evaluate(async () => {
    const f = await window.__registre.classeur(window.__app.classeur.id)
    return { id: window.__app.classeur.id, ecritures: JSON.parse(sessionStorage.getItem('__ecritures') || '[]'), parti: Number(sessionStorage.getItem('__parti')), cle: window.__cle?.etat, court: document.querySelector('.etat-classeur').textContent.replace(/[  ]/g, ' '),
      fiche: f.cle ? { nom: f.cle.nom, t: !!f.cle.t, date: f.cle.date, taille: f.cle.taille, vecteur: !!f.cle.vecteur } : null, poignee: (await window.__registre.poignee(f.id))?.name ?? null, choix: JSON.parse(sessionStorage.getItem('__choix') || '[]') }
  })
  const fichier = await opfsLire(p, 'Fractions.memc')
  const lu = fichier ? lireMemc(fichier) : null
  ok(g.ecritures.length >= 1 && g.ecritures[0].nom === 'Fractions.memc' && g.parti && g.ecritures[0].t <= g.parti, `La case cochée : le fichier « Fractions.memc » est écrit AVANT de partir (${g.parti - (g.ecritures[0]?.t ?? 0)} ms avant)`, g)
  ok(lu && lu.entete.id === g.id && lu.entete.nom === 'Fractions' && lu.pages === 1 && lu.film.length === 1 && lu.film[0].naissance, '   … le fichier : ce classeur (son id, son nom), une page, sa naissance', lu?.entete)
  ok(g.fiche && g.fiche.nom === 'Fractions.memc' && g.fiche.t && g.fiche.date === lu?.entete.date && g.fiche.vecteur && g.poignee === 'Fractions.memc', '   … la fiche note l\'écriture (date de l\'en-tête, vecteur) ; la poignée est gardée', g)
  ok(g.cle?.etat === 'ok' && /^Clé : /.test(g.court), `   … à l'arrivée, la clé est active : « ${g.court} »`, g.cle)
  const t = await toasts(p)
  ok(t.some(x => x.includes('Classeur « Fractions » créé. Il s\'enregistre automatiquement dans « Fractions.memc ».')), '   … « Classeur « Fractions » créé. Il s\'enregistre automatiquement dans « Fractions.memc ». »', t)
  ok(g.choix.length === 1 && g.choix[0].actif && g.choix[0].nom === 'Fractions.memc' && g.choix[0].id === 'mem-classeurs', '   … le choix du fichier s\'est ouvert dans le clic (le nom du classeur, le même dossier que la clé)', g.choix)
  // Un fichier qui contient déjà un autre classeur : refusé, rien n'est créé
  const autre = Buffer.concat([Buffer.from(JSON.stringify({ format: 'mem-tableau', v: 1, app: 'MEM teachingtool', date: 1, pages: 1, nom: 'Autre', id: 'abcdefabcdefabcd' }) + '\n'), gzipSync(Buffer.from(Y.encodeStateAsUpdate(new Y.Doc())))])
  await opfsEcrire(p, 'Autre.memc', autre)
  await ouvrirBiblio(p)
  const avant = (await p.evaluate(async () => (await window.__registre.classeurs()).length))
  await p.click('.biblio-nouveau'); await p.waitForTimeout(200)
  await p.fill('dialog input[name="nom"]', 'Doublon')
  await p.check('dialog .case-cle input')
  await p.evaluate(() => { window.__nomChoisi = 'Autre.memc' })
  await p.click('dialog [data-a="creer"]'); await p.waitForTimeout(800)
  let d = await dialogues(p)
  const apres = (await p.evaluate(async () => (await window.__registre.classeurs()).length))
  ok(d.length === 1 && d[0].erreur === 'Ce fichier contient un autre classeur (« Autre ») : choisissez un autre nom.' && apres === avant && (await opfsLire(p, 'Autre.memc')).equals(autre),
    'Un fichier qui a déjà un autre classeur : « Ce fichier contient un autre classeur (« Autre ») : choisissez un autre nom. », rien n\'est créé, le fichier intact', { d, avant, apres })
  // Renoncer au choix : on crée quand même, sans clé
  await p.evaluate(() => { window.__nomChoisi = null; window.__choixPanne = 'AbortError' })
  await allerPar(p, () => p.click('dialog [data-a="creer"]'))
  const sans = await p.evaluate(async () => ({ nom: window.__app.classeur.nom, cle: (await window.__registre.classeur(window.__app.classeur.id)).cle ?? null, etat: window.__cle?.etat.etat }))
  ok(sans.nom === 'Doublon' && sans.cle === null && sans.etat === 'absente', 'Renoncer au choix du fichier : le classeur est créé, sans clé', sans)
  // DataCloneError : la poignée ne se range pas ; à l'arrivée, le bandeau
  await ouvrirBiblio(p)
  await p.evaluate(() => { window.__choixPanne = null; window.__registre.garderPoignee = async () => { throw new DOMException('simulé', 'DataCloneError') } })
  await p.click('.biblio-nouveau'); await p.waitForTimeout(200)
  await p.fill('dialog input[name="nom"]', 'Sans poignée')
  await p.check('dialog .case-cle input')
  await allerPar(p, () => p.click('dialog [data-a="creer"]'))
  await p.evaluate(() => window.__cle?.pret); await p.waitForTimeout(500)
  const b = await p.evaluate(() => { const x = document.querySelector('.bandeau-sauvegarde'); return { cache: x.hidden, raison: x.dataset.raison, texte: x.querySelector('.texte-bandeau')?.textContent, boutons: [...x.querySelectorAll('.bouton-bandeau')].map(y => y.textContent), etat: window.__cle?.etat, point: !document.querySelector('.bouton-classeur .point-etat').hidden } })
  ok(!b.cache && b.raison === 'cle-a-choisir' && b.texte === 'Choisissez de nouveau le fichier de la clé : ce navigateur ne l\'a pas gardé.' && JSON.stringify(b.boutons) === '["Enregistrer automatiquement sur la clé…"]' && b.point,
    'DataCloneError : à l\'arrivée, le bandeau « Choisissez de nouveau le fichier de la clé… » [Enregistrer automatiquement sur la clé…], le point ambre', b)
  await p.screenshot({ path: CAPTURES + 'G-a-choisir.png' })
  // Le bouton : le choix, et la clé reprend (le même fichier : il est à ce classeur)
  await p.click('.bandeau-sauvegarde .bouton-bandeau'); await p.waitForTimeout(1200)
  ok(await p.evaluate(() => window.__cle?.etat.etat) === 'ok', '   … le bouton : le fichier choisi de nouveau, l\'enregistrement repart', await p.evaluate(() => window.__cle?.etat))
  await ctx.close()

  console.log('\n=== G. plus de place ===')
  const c2 = await contexte()
  const q = await ouvrir(c2, '', 'G-place')
  await ouvrirBiblio(q)
  const basesAvant = await bases(q)
  await q.evaluate(() => {
    const add = IDBObjectStore.prototype.add
    IDBObjectStore.prototype.add = function (...a) {
      if (this.transaction.db.name.startsWith('mem-teachingtool-classeur-')) throw new DOMException('Plus de place (essai)', 'QuotaExceededError')
      return add.apply(this, a)
    }
  })
  await q.click('.biblio-nouveau'); await q.waitForTimeout(200)
  await q.click('dialog [data-a="creer"]'); await q.waitForTimeout(1200)
  d = await dialogues(q)
  const reste = await q.evaluate(async () => (await window.__registre.classeurs()).map(f => f.nom))
  const basesApres = await bases(q)
  const tq = await toasts(q)
  ok(d[0]?.erreur === 'Le classeur n\'a pas pu être créé : il n\'y a plus de place dans ce navigateur.' && tq.some(x => x.includes('Le classeur n\'a pas pu être créé : il n\'y a plus de place dans ce navigateur.')),
    'Plus de place : « Le classeur n\'a pas pu être créé : il n\'y a plus de place dans ce navigateur. »', { d, tq })
  ok(JSON.stringify(reste) === '["Premier classeur"]' && basesApres.filter(x => x.startsWith('mem-teachingtool-classeur-')).length === basesAvant.filter(x => x.startsWith('mem-teachingtool-classeur-')).length && q.url().endsWith(await q.evaluate(() => window.__app.classeur.id)),
    '   … rien ne reste : ni fiche, ni base ; on est toujours sur le classeur d\'avant', { reste, basesApres })
  await c2.close()
}

// =====================================================================
// H. LA BIBLIOTHÈQUE SEULE
// =====================================================================
if (seul('H')) {
  console.log('\n=== H. la bibliothèque seule ===')
  const ctx = await contexte()
  const p0 = await ouvrir(ctx, '', 'H0')
  const ids = await creerPlusieurs(p0, 2)
  await p0.close()
  const p = await ouvrir(ctx, '?bibliotheque', 'H')
  let s = await p.evaluate(() => ({ app: !!window.__app, ouvert: !window.__bibliotheque.el.hidden, fermer: !document.querySelector('.biblio-fermer').hidden, ligne: !document.querySelector('.biblio-ouvert').hidden, url: location.search, titre: document.title,
    barres: !!document.querySelector('.barre-haut'), zone: document.getElementById('zone').hidden, cartes: document.querySelectorAll('.grille-classeurs.tous .case-classeur').length, ouvertIci: document.querySelectorAll('.pastille-ouvert:not([hidden])').length }))
  ok(!s.app && s.ouvert && !s.fermer && !s.ligne && s.url === '?bibliotheque' && s.titre === 'Bibliothèque — MEM teachingtool' && !s.barres && s.zone && s.cartes === 3 && s.ouvertIci === 0,
    '?bibliotheque : la bibliothèque seule (ni tableau, ni barres), sans ×, sans « Ouvert », le titre « Bibliothèque — MEM teachingtool »', s)
  await p.keyboard.press('Escape'); await p.waitForTimeout(200)
  ok(await p.evaluate(() => !window.__bibliotheque.el.hidden), '   … Échap ne la ferme pas')
  const fc = p.waitForEvent('filechooser', { timeout: 1500 }).then(() => true, () => false)
  await p.keyboard.press('Control+o')
  ok(!(await fc), '   … Ctrl + O n\'ouvre rien (réservé à l\'ouverture des fichiers, C9) et ne va pas au navigateur')
  await p.screenshot({ path: CAPTURES + 'H-seule.png' })
  await allerPar(p, () => p.click(carte('tous', ids[1])))
  ok(await p.evaluate(() => window.__app.classeur.id) === ids[1], '   … une carte ouvre son classeur')
  // Une adresse venue d'ailleurs
  const q = await ctx.newPage(); suivre(q, 'H-inconnu')
  await q.goto(DEV + '?classeur=ffffffffffffffff'); await pret(q); await q.waitForTimeout(400)
  s = await q.evaluate(() => ({ app: !!window.__app, url: location.search, toast: document.querySelector('.toast')?.textContent }))
  ok(!s.app && s.url === '?bibliotheque' && s.toast === 'Ce classeur n\'est pas dans la bibliothèque de ce navigateur. Pour l\'y ajouter, ouvrez son fichier (.memc).',
    '?classeur=inconnu : la bibliothèque seule, l\'adresse ?bibliotheque, et le message', s)
  // Nouveau classeur, depuis la bibliothèque seule
  await q.click('.biblio-nouveau'); await q.waitForTimeout(200)
  await q.fill('dialog input[name="nom"]', 'Depuis la bibliothèque')
  await allerPar(q, () => q.click('dialog [data-a="creer"]'))
  ok(await q.evaluate(() => window.__app.classeur.nom) === 'Depuis la bibliothèque', '   … Nouveau classeur y marche aussi')
  await ctx.close()
}

// =====================================================================
// I. LE TROU ; LE RAPPEL AU DÉPART
// =====================================================================
if (seul('I')) {
  console.log('\n=== I. le trou simulé ; le rappel au départ ===')
  const ctx = await contexte()
  const p = await ouvrir(ctx, '', 'I')
  const premier = await p.evaluate(() => window.__app.classeur.id)
  const ids = await creerPlusieurs(p, 3)
  const avantDecharger = []
  p.on('dialog', d => { avantDecharger.push(d.type()); d.dismiss().catch(() => {}) })
  await ecrire(p, 500, 400)
  await p.evaluate(() => window.__app.tableau.soupconnerTrou('place'))
  await p.waitForTimeout(300)
  await ouvrirBiblio(p)
  const ligne = (await vue(p)).ligne
  ok(/^« Premier classeur » : Ce navigateur n'enregistre plus ce classeur/.test(ligne) && await p.evaluate(() => !!document.querySelector('.biblio-ouvert [data-etat-action="enregistrer"]')), `La ligne du classeur ouvert le dit : « ${ligne} » [Enregistrer le classeur]`, ligne)
  await p.click(carte('tous', ids[0])); await p.waitForTimeout(500)
  let d = await dialogues(p)
  ok(d.length === 1 && d[0].titre === 'Ce classeur n\'est pas entièrement enregistré' && JSON.stringify(d[0].boutons) === '["Annuler","Quitter sans enregistrer","Enregistrer le classeur"]'
    && await p.evaluate(() => document.activeElement?.textContent === 'Enregistrer le classeur' && document.activeElement.classList.contains('principal')),
    'Le trou : changer de classeur le demande ([Annuler] [Quitter sans enregistrer] [Enregistrer le classeur], le focus sur Enregistrer)', d)
  await p.click('dialog [data-a="annuler"]'); await p.waitForTimeout(300)
  ok(p.url().endsWith(premier) && (await vue(p)).ouvert && !(await dialogues(p)).length, '   … Annuler : on reste, la bibliothèque aussi')
  // Enregistrer le classeur : un faux choix de fichier (en mémoire), puis on part
  await p.evaluate(() => { window.showSaveFilePicker = async () => ({ name: 'essai.memc', createWritable: async () => ({ write: async () => {}, close: async () => { window.__enregistre = true } }) }) })
  await p.click(carte('tous', ids[0])); await p.waitForTimeout(400)
  await allerPar(p, () => p.click('dialog [data-a="enregistrer"]'))
  ok(await p.evaluate(() => window.__app.classeur.id) === ids[0] && !avantDecharger.length, '   … Enregistrer le classeur : enregistré (depuis la mémoire), puis « Chapitre 1 » s\'ouvre', avantDecharger)
  // Quitter sans enregistrer : sans la question du navigateur
  await ecrire(p, 500, 400)
  await p.evaluate(() => window.__app.tableau.soupconnerTrou('place'))
  await p.waitForTimeout(300)
  await ouvrirBiblio(p)
  await p.click(carte('tous', ids[1])); await p.waitForTimeout(400)
  await allerPar(p, () => p.click('dialog [data-a="quitter"]'))
  ok(await p.evaluate(() => window.__app.classeur.id) === ids[1] && !avantDecharger.length, '   … Quitter sans enregistrer : « Chapitre 2 » s\'ouvre, sans la question du navigateur (beforeunload)', avantDecharger)
  // Le rappel au départ : 25 min de travail que rien ne protège
  await ouvrirBiblio(p)
  await p.evaluate(() => { const e = window.__surveillance.etat; e.nonEnregistreDepuis = Date.now() - 25 * 60_000; e.modifie = Date.now() })
  await p.click(carte('tous', ids[2])); await p.waitForTimeout(600)
  d = await dialogues(p)
  ok(d.length === 1 && d[0].titre === 'Enregistrer « Chapitre 2 » d\'abord ?' && /^Pas encore enregistré dans un fichier depuis 2\d min de travail\. Il reste dans ce navigateur/.test(d[0].texte) && JSON.stringify(d[0].boutons) === '["Annuler","Ouvrir sans enregistrer","Enregistrer le classeur"]',
    'Le rappel au départ : « Enregistrer « Chapitre 2 » d\'abord ? » (25 min de travail non enregistré)', d)
  await p.click('dialog [data-a="annuler"]'); await p.waitForTimeout(300)
  ok(p.url().endsWith(ids[1]), '   … Annuler : on reste')
  await allerPar(p, () => p.click(carte('tous', ids[2])))
  ok(await p.evaluate(() => window.__app.classeur.id) === ids[2], '   … une seule fois : la deuxième fois, on part sans le redemander')
  await ctx.close()
}

// =====================================================================
// J. DEUX ONGLETS
// =====================================================================
if (seul('J')) {
  console.log('\n=== J. deux onglets : un renommage ailleurs ===')
  const ctx = await contexte()
  const p = await ouvrir(ctx, '', 'J')
  const premier = await p.evaluate(() => window.__app.classeur.id)
  const ids = await creerPlusieurs(p, 5)
  await ouvrirBiblio(p)
  // Le focus sur « Chapitre 3 » (au clavier) ; les cartes marquées
  await p.focus(carte('tous', ids[2]))
  await p.evaluate(() => { for (const li of document.querySelectorAll('.case-classeur')) li.__marque = li.dataset.id })
  const q = await ouvrir(ctx, '?classeur=' + ids[4], 'J2')
  await q.evaluate(id => window.__registre.modifierClasseur(id, f => { f.nom = 'Renommé ailleurs' }), ids[0])
  await p.waitForTimeout(500)
  const r = await p.evaluate(ids => {
    const li = [...document.querySelectorAll('.grille-classeurs.tous .case-classeur')]
    return { focus: document.activeElement?.closest('.case-classeur')?.dataset.id, nom: li.find(x => x.dataset.id === ids[0])?.querySelector('.carte-nom-classeur').textContent,
      memes: [...document.querySelectorAll('.case-classeur')].every(x => x.__marque === x.dataset.id) }
  }, ids)
  ok(r.nom === 'Renommé ailleurs', 'Un renommage dans un autre onglet : la carte change de nom', r)
  ok(r.focus === ids[2] && r.memes, '   … le focus reste sur « Chapitre 3 » ; aucune carte n\'est refaite (les mêmes éléments)', r)
  // Le classeur ouvert renommé ailleurs : le bouton et le titre suivent
  await q.evaluate(id => window.__registre.modifierClasseur(id, f => { f.nom = 'Ma 5e B' }), premier)
  await p.waitForTimeout(500)
  const b = await p.evaluate(() => ({ titre: document.title, nom: document.querySelector('.nom-classeur').textContent, label: document.querySelector('.bouton-classeur').getAttribute('aria-label') }))
  ok(b.titre === 'Ma 5e B — MEM teachingtool' && b.nom === 'Ma 5e B' && b.label === 'Classeur « Ma 5e B » : ouvrir la bibliothèque', 'Le classeur ouvert renommé ailleurs : le nom du bouton et le titre de l\'onglet suivent', b)
  // Un menu ouvert : rien n'est refait avant sa fermeture
  await p.click(`.grille-classeurs.tous .case-classeur[data-id="${ids[1]}"] .options-classeur`); await p.waitForTimeout(150)
  await q.evaluate(id => window.__registre.modifierClasseur(id, f => { f.nom = 'Pendant le menu' }), ids[1])
  await p.waitForTimeout(400)
  const pendant = await p.evaluate(id => document.querySelector(`.grille-classeurs.tous .case-classeur[data-id="${id}"] .carte-nom-classeur`).textContent, ids[1])
  await p.keyboard.press('Escape'); await p.waitForTimeout(400)
  const ensuite = await p.evaluate(id => document.querySelector(`.grille-classeurs.tous .case-classeur[data-id="${id}"] .carte-nom-classeur`).textContent, ids[1])
  ok(pendant === 'Chapitre 2' && ensuite === 'Pendant le menu', 'Un menu ouvert : la carte n\'est refaite qu\'à sa fermeture', { pendant, ensuite })
  await ctx.close()
}

// =====================================================================
// K. INERTE PENDANT LA REVUE, LA TRIEUSE, UNE SÉANCE
// =====================================================================
if (seul('K')) {
  console.log('\n=== K. inerte pendant la revue, la trieuse, une séance ===')
  const ctx = await contexte()
  const p = await ouvrir(ctx, '', 'K')
  await ecrire(p, 500, 400); await p.waitForTimeout(300)
  const essai = async () => {
    const i = await p.evaluate(() => { const b = document.querySelector('.barre-classeur'); return b.inert || !!b.closest('[inert]') || getComputedStyle(b).visibility === 'hidden' })
    await p.evaluate(() => window.__app.ui.ouvrirBibliotheque())
    await p.waitForTimeout(200)
    return { inerte: i, ouverte: await p.evaluate(() => window.__bibliotheque.ouvert) }
  }
  await p.keyboard.press('Shift+P'); await p.waitForTimeout(400)
  const trieuse = await essai()
  await p.keyboard.press('Escape'); await p.waitForTimeout(300)
  await p.click('.barre-haut [aria-label^="Revoir la construction"]'); await p.waitForTimeout(600)
  const revue = await essai()
  await p.keyboard.press('Escape'); await p.waitForTimeout(400)
  // (avant : la séance d'automatismes cachait la barre ; le réglage du
  // flash est une fenêtre modale : la barre est sous elle, hors d'atteinte)
  await p.click('.barre-haut [aria-label^="Automatismes"]'); await p.waitForTimeout(500)
  const seance = await essai()
  seance.inerte = seance.inerte || await p.evaluate(() => !!document.querySelector('dialog.dialogue-flash:modal'))
  await p.keyboard.press('Escape'); await p.waitForTimeout(400)
  ok(trieuse.inerte && !trieuse.ouverte && revue.inerte && !revue.ouverte && seance.inerte && !seance.ouverte, 'Pendant la trieuse, la revue et le réglage du flash : le bouton est inerte, la bibliothèque ne s\'ouvre pas', { trieuse, revue, seance })
  await p.click('.bouton-classeur'); await p.waitForTimeout(300)
  ok(await p.evaluate(() => window.__bibliotheque.ouvert && !document.querySelector('.barre-actions:not([hidden])')), '   … ensuite, le bouton l\'ouvre ; la barre d\'actions ne paraît pas dessous')
  await ctx.close()
}

// =====================================================================
// L. L'ANNONCE DU PREMIER LANCEMENT
// =====================================================================
if (seul('L')) {
  console.log('\n=== L. l\'annonce du premier lancement ===')
  const ctx = await contexte()
  const p = await ouvrir(ctx, '', 'L')
  let t = await toasts(p)
  ok(!t.some(x => x.includes('Votre tableau est maintenant')) && await p.evaluate(() => !!localStorage.getItem('mem-teachingtool-annonce')), 'Un navigateur neuf : pas d\'annonce, la clé posée sans rien dire', t)
  await ecrire(p, 500, 400); await p.waitForTimeout(800)
  // Le tableau d'avant : il a du contenu, la clé manque
  await p.evaluate(() => localStorage.removeItem('mem-teachingtool-annonce'))
  await p.reload(); await pret(p); await p.waitForTimeout(600)
  t = await toasts(p)
  const nom = await p.evaluate(() => window.__app.classeur.nom)
  ok(t.some(x => x.includes(`Votre tableau est maintenant le classeur « ${nom} ». Son nom, en haut à gauche, ouvre la bibliothèque de vos classeurs.Voir la bibliothèque`)), `Le premier lancement : « Votre tableau est maintenant le classeur « ${nom} ». Son nom, en haut à gauche, ouvre la bibliothèque… » [Voir la bibliothèque]`, t)
  await p.click('.toast .action'); await p.waitForTimeout(400)
  ok((await vue(p)).ouvert, '   … [Voir la bibliothèque] l\'ouvre')
  await p.keyboard.press('Escape')
  await p.reload(); await pret(p); await p.waitForTimeout(600)
  t = await toasts(p)
  ok(!t.some(x => x.includes('Votre tableau est maintenant')), '   … une seule fois', t)
  await ctx.close()
  // Le bouton caché (1024 × 768, une page nommée) : le menu ⋯
  const c2 = await contexte({ viewport: { width: 1024, height: 768 } })
  const q = await ouvrir(c2, '', 'L2')
  await ecrire(q, 500, 400)
  await q.evaluate(() => { const a = window.__app; a.tableau.nommerPage?.(a.page, 'Exercice 12 p. 84') ?? a.tableau.renommerPage?.(a.page, 'Exercice 12 p. 84') })
  await q.waitForTimeout(800)
  await q.evaluate(() => localStorage.removeItem('mem-teachingtool-annonce'))
  await q.reload(); await pret(q); await q.waitForTimeout(800)
  const forme = await q.evaluate(() => window.__app.ui.formeClasseur)
  t = await toasts(q)
  ok(forme !== 'cache' || t.some(x => x.includes('Le menu ⋯, en haut à droite, ouvre la bibliothèque de vos classeurs.')), `Le bouton caché (forme « ${forme} ») : « Le menu ⋯, en haut à droite, ouvre la bibliothèque de vos classeurs. »`, t)
  await c2.close()
}

// =====================================================================
// M. LA VERSION D'UN SEUL FICHIER (file://)
// =====================================================================
if (seul('M')) {
  console.log('\n=== M. la version d\'un seul fichier (file://) ===')
  const UN = R + '/dist/index.html'
  if (!existsSync(UN)) ok(false, 'dist/index.html manque (npm run build)')
  else {
    const ctx = await nav.newContext({ viewport: { width: 1366, height: 768 } })
    await ctx.addInitScript(ECOUTER_TOASTS)
    await ctx.addInitScript(() => {
      // Une poignée en mémoire (comme C4) : elle ne se range pas dans IndexedDB
      window.__memoire = { octets: new Uint8Array(0), ecritures: [] }
      addEventListener('pagehide', () => { try { sessionStorage.setItem('__parti', String(Date.now())) } catch { /* rien */ } })
      window.showSaveFilePicker = async o => {
        const nom = o.suggestedName
        const h = { name: nom, kind: 'file', getFile: async () => new File([window.__memoire.octets], nom),
          createWritable: async () => { const m = []; return { write: async b => { m.push(new Uint8Array(await b.arrayBuffer())) }, close: async () => { sessionStorage.setItem('__ecrit', String(Date.now())); sessionStorage.setItem('__taille', String(m.reduce((s, x) => s + x.length, 0))) }, abort: async () => {} } },
          isSameEntry: async x => x === h }
        return h
      }
    })
    const p = await ctx.newPage(); suivre(p, 'M')
    await p.goto('file://' + UN + '?bibliotheque')
    await p.waitForFunction(() => !document.querySelector('.bibliotheque')?.hidden && document.querySelector('.biblio-nouveau'), null, { timeout: 30000 }); await p.waitForTimeout(500)
    ok(await p.evaluate(() => location.search === '?bibliotheque' && !document.querySelector('.barre-haut')), 'file:// ?bibliotheque : la bibliothèque seule')
    await p.click('.biblio-nouveau'); await p.waitForTimeout(200)
    const coche = await p.evaluate(() => document.querySelector('dialog .case-cle input')?.checked)
    ok(coche === true, '   … « Nouveau classeur » : la case de la clé cochée d\'office (file://)', coche)
    await p.fill('dialog input[name="nom"]', 'Sur la clé')
    await Promise.all([p.waitForNavigation({ timeout: 20000 }), p.click('dialog [data-a="creer"]')])
    await p.waitForFunction(() => document.querySelector('.rang')?.textContent?.includes('/'), null, { timeout: 30000 }); await p.waitForTimeout(1500)
    const m = await p.evaluate(() => ({ ecrit: Number(sessionStorage.getItem('__ecrit')), parti: Number(sessionStorage.getItem('__parti')), taille: Number(sessionStorage.getItem('__taille')), titre: document.title, url: location.search,
      bandeau: document.querySelector('.bandeau-sauvegarde').hidden ? null : document.querySelector('.bandeau-sauvegarde').dataset.raison, toast: document.querySelector('.toast')?.textContent }))
    ok(m.ecrit && m.parti && m.ecrit <= m.parti && m.taille > 100 && m.titre === 'Sur la clé — MEM teachingtool' && /^\?classeur=[0-9a-f]{16}$/.test(m.url),
      `   … le fichier écrit avant de partir (${m.taille} octets, ${m.parti - m.ecrit} ms avant), puis le classeur s'ouvre`, m)
    ok(m.bandeau === 'cle-a-choisir', '   … la poignée ne se range pas (une poignée en mémoire) : à l\'arrivée, le bandeau « Choisissez de nouveau le fichier de la clé »', m)
    await ctx.close()
  }
}

// =====================================================================
// N. AVANT DE PARTIR : CE QUI ATTEND S'ÉCRIT ; « OUVRIR SANS ATTENDRE »
// =====================================================================
if (seul('N')) {
  console.log('\n=== N. avant de partir ===')
  const ctx = await contexte()
  const p = await ouvrir(ctx, '', 'N')
  const premier = await p.evaluate(() => window.__app.classeur.id)
  const [autre] = await creerPlusieurs(p, 1)
  // La clé du premier classeur (le choix de fichier de l'OPFS)
  await p.click('.barre-haut .bouton.points'); await p.waitForTimeout(150)
  await p.click('.menu-flottant:not([hidden]) .menu-item[data-action="activer-cle"]')
  await p.waitForFunction(() => window.__cle?.etat.etat === 'ok', null, { timeout: 15000 })
  await p.waitForTimeout(300)
  // Un trait et une page de plus, puis tout de suite un autre classeur
  await ecrire(p, 400, 400)
  await p.evaluate(() => window.__app.nouvellePage())
  await ecrire(p, 500, 300)
  await p.evaluate(() => { sessionStorage.removeItem('__ecritures') })
  await ouvrirBiblio(p)
  await allerPar(p, () => p.click(carte('tous', autre)))
  const n = await p.evaluate(async id => {
    const f = await window.__registre.classeur(id)
    return { pages: f.pages, cle: f.cle ? { t: f.cle.t } : null, ecritures: JSON.parse(sessionStorage.getItem('__ecritures') || '[]'), parti: Number(sessionStorage.getItem('__parti')), ici: window.__app.classeur.id }
  }, premier)
  const f = await opfsLire(p, 'Premier classeur.memc')
  const lu = f ? lireMemc(f) : null
  const traits = f ? (() => { const fin = f.indexOf(0x0a), d = new Y.Doc({ gc: false }); Y.applyUpdate(d, new Uint8Array(gunzipSync(f.subarray(fin + 1)))); return d.getArray('ordre').toArray().map(id => d.getMap('pages').get(id).get('formes').size) })() : null
  ok(n.ici === autre && n.pages === 2, 'En partant : la fiche du classeur quitté sait ses 2 pages (le suivi, vidé avant de partir)', n)
  ok(n.ecritures.some(e => e.nom === 'Premier classeur.memc' && e.t <= n.parti) && lu?.pages === 2 && JSON.stringify(traits) === '[1,1]',
    '   … sa clé est écrite AVANT de partir : 2 pages, les deux traits', { ecritures: n.ecritures, parti: n.parti, traits })
  // Une écriture qui traîne : « Ouvrir sans attendre » au-delà de 5 s
  await ouvrirBiblio(p)
  await p.evaluate(() => { window.__bibliotheque.hote.avantDeQuitter = () => new Promise(r => setTimeout(r, 60_000)) })
  await toasts(p)
  const t0 = Date.now()
  await p.click(carte('tous', premier))
  await p.waitForFunction(() => [...document.querySelectorAll('.toast .action')].some(b => b.textContent === 'Ouvrir sans attendre'), null, { timeout: 9000 }).catch(() => {})
  const apparu = Date.now() - t0
  await p.waitForTimeout(100)
  const t = await toasts(p)
  ok(apparu >= 4800 && apparu < 7000 && t.some(x => x.startsWith('Ouverture de « Premier classeur »…')) && t.some(x => x.includes('Ouvrir sans attendre')), `Une écriture qui traîne : « Ouverture de « Premier classeur »… », puis « Ouvrir sans attendre » après ${apparu} ms`, t)
  const t1 = Date.now()
  await allerPar(p, () => p.click('.toast .action'))
  ok(Date.now() - t1 < 4000 && await p.evaluate(() => window.__app.classeur.id) === premier, `   … le bouton : on part tout de suite (${Date.now() - t1} ms)`)
  // Sans le bouton : 10 s au plus
  await ouvrirBiblio(p)
  await p.evaluate(() => { window.__bibliotheque.hote.avantDeQuitter = () => new Promise(r => setTimeout(r, 60_000)) })
  const t2 = Date.now()
  await allerPar(p, () => p.click(carte('tous', autre)))
  const duree = Date.now() - t2
  ok(duree >= 9500 && duree < 14000 && await p.evaluate(() => window.__app.classeur.id) === autre, `   … sans le bouton : on part au bout de 10 s au plus (${duree} ms)`, duree)
  await ctx.close()
}

console.log(`\nErreurs JS : ${erreurs.length}`)
ok(erreurs.length === 0, 'aucune erreur JS', erreurs)
await nav.close()
console.log(echecs ? `\n${echecs} ÉCHEC(S)` : '\nTout est vert.')
process.exit(echecs ? 1 : 0)
