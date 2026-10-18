// ESSAI DU MORCEAU C3-etat (lot 4) : le bouton du classeur et l'état de la
// sauvegarde, toujours visibles et honnêtes ; le bandeau ; le rappel ; le
// trou réparé.
// A. La place du bouton sur tous les écrans de la mesure, avec et sans page
//    nommée : la règle (a, b, c, d), aucun chevauchement, les rangées de la
//    barre du haut inchangées ; à 1024 × 768 nommée, la vérification 3 du
//    contrôle final du lot 3 ; d'une page sans nom à une page nommée, rien
//    ne bouge.
// B. Le bouton, le lecteur d'écran, le menu ⋯ (le bloc du classeur en tête,
//    plus de note en bas), le clavier.
// C. Le trou (un abandon ASYNCHRONE d'une écriture, comme trou-quota.mjs) :
//    « Pas enregistré ! », le bandeau sans ×, beforeunload ; Ctrl + S depuis
//    la mémoire (3 formes dans le .memc) ; la réparation au calme (jamais
//    pendant un trait), puis au rechargement les 3 formes.
// D. Un double-clic au Stylo n'est jamais posé en point par une tâche
//    automatique.
// E. Le rappel sous Firefox simulé (showSaveFilePicker absent), avec
//    page.clock : rien avant 20 min de travail, rien pendant les gestes,
//    après 2 min sans geste ; × le fait taire une heure ; l'horloge qui
//    avance (« il y a 7 min ») ; caché pendant la trieuse, la revue, une
//    séance.
// F. Le rappel sous Chrome sans clé.
// G. Deux onglets sur le même classeur : l'enregistrement de l'un se lit dans l'autre.
// H. La version d'un seul fichier (dist/index.html) en file:// : le bouton et l'état.
// I. Le point sans animation ; aucune erreur JS.
import { RACINE_ESSAIS, RACINE_DEPOT } from '../commun/racines.mjs'
import { chromium } from '../commun/playwright.mjs'
import * as Y from 'yjs'
import { existsSync, mkdirSync, readFileSync } from 'node:fs'
import { gunzipSync } from 'node:zlib'

const S = `${RACINE_ESSAIS}`
const R = `${RACINE_DEPOT}`
const ICI = S + '/lot4/C3/'
const F = ICI + 'fichiers/'
const DEV = 'http://localhost:5173/'
mkdirSync(F, { recursive: true })

let echecs = 0
const ok = (c, m, detail) => { if (!c) echecs++; console.log(c ? '✓' : '✗ ÉCHEC', m, !c && detail !== undefined ? '— ' + JSON.stringify(detail).slice(0, 1200) : '') }
const dort = ms => new Promise(r => setTimeout(r, ms))
const norm = t => (t || '').replace(/[  ]/g, ' ')

const erreurs = []
const suivre = (p, nom) => {
  p.on('pageerror', e => erreurs.push(`${nom}: ${e.message}`))
  p.on('console', m => { if (m.type() === 'error' && !/Failed to load resource|ERR_CERT|net::/.test(m.text())) erreurs.push(`${nom}: ${m.text()}`) })
}
const pret = p => p.waitForFunction(() => window.__surveillance && document.querySelector('.rang')?.textContent?.includes('/'), null, { timeout: 30000 })
async function ecrire(p, x0, y0, n = 12) {
  await p.mouse.move(x0, y0); await p.mouse.down()
  for (let i = 1; i <= n; i++) await p.mouse.move(x0 + i * 10, y0 + Math.sin(i / 2) * 16)
  await p.mouse.up(); await p.waitForTimeout(120)
}
const ECOUTER_TOASTS = () => {
  window.__toasts = []
  let dernier = ''
  setInterval(() => { const t = (document.querySelector('.toast')?.textContent || '').replace(/[  ]/g, ' '); if (t && t !== dernier) { dernier = t; window.__toasts.push(t) } }, 15)
}
/** Un faux showSaveFilePicker qui écrit en mémoire (window.__ecrit) */
const PICKER = () => {
  window.__ecrit = null
  window.showSaveFilePicker = async () => ({ name: 'essai.memc', createWritable: async () => { const m = []; return { write: async b => { m.push(new Uint8Array(await b.arrayBuffer())) }, close: async () => { window.__ecrit = m } } } })
}
/** Un .memc lu sous Node */
function lireMemc(o) {
  const fin = o.indexOf(0x0a)
  const entete = JSON.parse(o.subarray(0, fin).toString('utf8'))
  const d = new Y.Doc({ gc: false })
  Y.applyUpdate(d, new Uint8Array(gunzipSync(o.subarray(fin + 1))))
  const ordre = d.getArray('ordre').toArray()
  const ids = ordre.flatMap(id => [...(d.getMap('pages').get(id)?.get('formes')?.keys() ?? [])])
  return { entete, ids, entier: !d.store.pendingStructs && !d.store.pendingDs }
}
/** Ce que montrent le bouton, le bandeau, le menu */
const ETAT = () => {
  const b = document.querySelector('.bouton-classeur'), band = document.querySelector('.bandeau-sauvegarde')
  return {
    forme: window.__app.ui.formeClasseur,
    court: (document.querySelector('.etat-classeur')?.textContent || '').replace(/[  ]/g, ' '),
    point: !b.querySelector('.point-etat').hidden,
    pointFichier: !document.querySelector('.barre-haut .bouton.points .point-etat').hidden,
    bandeau: band.hidden || getComputedStyle(band).display === 'none' ? null : {
      texte: (band.querySelector('.texte-bandeau')?.textContent || '').replace(/[  ]/g, ' '),
      boutons: [...band.querySelectorAll('.bouton-bandeau')].map(x => x.textContent), fermer: !!band.querySelector('.fermer-bandeau'),
      r: (r => ({ l: Math.round(r.left), t: Math.round(r.top), d: Math.round(r.right), b: Math.round(r.bottom) }))(band.getBoundingClientRect()),
    },
    trou: window.__app.tableau.trou,
    niveau: window.__surveillance.texte.niveau,
    lignes: window.__surveillance.texte.lignes.map(l => ({ quoi: l.quoi, texte: l.texte.replace(/[  ]/g, ' '), niveau: l.niveau })),
  }
}
const ouvrirMenuFichier = async p => { await p.click('.barre-haut .bouton.points'); await p.waitForTimeout(150) }
const BLOC = () => {
  const m = [...document.querySelectorAll('.menu-flottant')].find(x => !x.hidden)
  if (!m) return null
  const bloc = m.firstElementChild
  return {
    premier: bloc?.className, nom: bloc?.querySelector('.bloc-nom')?.textContent,
    lignes: [...m.querySelectorAll('.bloc-lignes li')].map(li => ({ quoi: li.dataset.ligne, niveau: li.className.replace('ligne-etat ', ''), texte: (li.querySelector('.texte-ligne')?.textContent || '').replace(/[  ]/g, ' '), bouton: li.querySelector('button')?.textContent ?? null })),
    // (Adapté au lot 5, morceau K9 : « Cet appareil » et ses deux cases entrent volontairement au bout du menu ⋯ ; lot5/K9-affichage.mjs les vérifie)
    entrees: [...m.querySelectorAll('.menu-item:not([data-action="contraste"]):not([data-action="noms-outils"]):not([data-action="nouvelle-seance"]):not([data-action="renommer-seance"]):not([data-action="seance-precedente"]):not([data-action="retour-aujourdhui"])')].map(e => e.dataset.action ?? ('etat:' + e.dataset.etatAction)),
    note: !!m.querySelector('.menu-note'),
    r: (r => ({ l: Math.round(r.left), t: Math.round(r.top) }))(m.getBoundingClientRect()),
  }
}

const nav = await chromium.launch({ env: { ...process.env, LANG: 'C.UTF-8', LC_ALL: 'C.UTF-8' } })

// =====================================================================
// A. LA PLACE DU BOUTON
// =====================================================================
console.log('=== A. la place du bouton du classeur ===')
// forme attendue, place mesurée (±2 px), hauteur de la barre du haut
// (Adapté au lot 5, K8 : la liste déroulante des fonds est devenue un bouton
// de 44 px, la barre du haut a 115 px de moins ; le bouton du classeur y
// gagne 115 px de place : 1180 × 820 passe à la forme large, 1024 × 768 et
// 960 × 600 à l'icône et au point, 1100 × 768 nommée aussi ; 844 × 390, la
// barre du haut tient sur une rangée et le bouton se cache, le point sur ⋯.
// Les places d'avant : 424, 338, 978, 238, 82 / −5, 24, 18, −6.)
// (Adapté au catalogue : la barre du haut a un bouton de plus, « Catalogue »,
// 46 px avec son écart ; le curseur de l'outil (PR 6) l'avait déjà fait
// bouger de 3 px. Le bouton du classeur a d'autant moins de place ; il garde
// sa forme partout, sauf à 1100 × 768 nommée, où il se cache (le point sur
// ⋯). Les places d'avant : 539, 453, 875, 353, 197 / 25, 63, 133.)
const ECRANS = [
  { l: 1366, h: 768, sans: ['large', 496] },
  { l: 1280, h: 720, sans: ['large', 410] },
  // (Adapté au lot 5, morceau K9 : un TNI, tactile, de 1920 × 1080, a d'office
  // les noms sous les outils, voulus ainsi : la barre des outils fait 80 px,
  // la barre du haut 68 px de haut et 196 px de plus ; la place, 1093 px sans
  // eux, est de 875 ; lot5/K9-affichage.mjs vérifie le reste)
  { l: 1920, h: 1080, t: true, sans: ['large', 863, 68] },
  // (Adapté aux corrections « appareils » du lot 4 : la forme large demande
  // la place du plus long des textes courts, 252 px ; à 1180 × 820, l'état
  // « Seulement dans ce navigateur » y était coupé : l'icône et le point —
  // depuis le lot 5, K8, il y tient : 353 px)
  { l: 1180, h: 820, t: true, sans: ['large', 310] },
  { l: 1024, h: 768, sans: ['etroit', 154], avec: ['cache', 17] },
  { l: 1100, h: 768, avec: ['cache', 16] },
  { l: 960, h: 600, sans: ['etroit', 90] },
  { l: 768, h: 1024, t: true, sans: ['dans-la-barre', -6, 104] },
  { l: 820, h: 1180, t: true, sans: ['dans-la-barre', -6, 104] },
  // (Adapté au lot 5, K10, la mise en page du téléphone, voulue : la barre
  // du haut y tient sur une rangée de 58 px, et le bouton du classeur en est
  // le premier bouton, quelle que soit la place à gauche ; avant : 844 × 390
  // caché, place 17 ; 390 × 844 dans la barre, trois rangées, 150 px)
  { l: 844, h: 390, t: true, sans: ['dans-la-barre', null, 58] },
  { l: 641, h: 900, sans: ['dans-la-barre', -6, 104] },
  { l: 390, h: 844, t: true, sans: ['dans-la-barre', null, 58] },
]
/** La géométrie : la place mesurée comme le code (le bouton sorti de la
 *  barre du haut), les barres visibles, la barre du haut avec et sans lui */
const GEOMETRIE = () => {
  const ui = window.__app.ui, b = document.querySelector('.bouton-classeur'), haut = document.querySelector('.barre-haut')
  const rect = e => { const r = e.getBoundingClientRect(); return { l: r.left, t: r.top, d: r.right, b: r.bottom, w: r.width, h: r.height } }
  const visible = e => e && !e.hidden && e.getClientRects().length > 0 && getComputedStyle(e).visibility !== 'hidden'
  const dans = b.parentElement === haut
  const avecH = rect(haut).h
  const enfants = () => [...haut.children].filter(x => x !== b && x.offsetParent).map(x => { const r = x.getBoundingClientRect(); return [Math.round(r.left), Math.round(r.top)] })
  const posAvec = enfants()
  // sans lui (la barre du haut du lot 3) : on le sort un instant
  const parent = b.parentElement, suivant = b.nextSibling
  document.querySelector('.barre-classeur').appendChild(b)
  const hs = rect(haut), o = rect(document.querySelector('.barre-outils'))
  const posSans = enfants()
  parent.insertBefore(b, suivant)
  const ha = rect(haut)
  const memeHaut = ['l', 't', 'w', 'h'].every(k => Math.abs(ha[k] - hs[k]) < 0.5)
  const barres = { outils: o, haut: rect(haut), zoom: rect(document.querySelector('.barre-zoom')) }
  const bc = document.querySelector('.barre-classeur')
  if (visible(bc)) barres.classeur = rect(bc)
  const nom = document.querySelector('.rang-nom')
  // La place de la forme large : le plus long des textes courts, entier (12 px), et ce qui l'entoure (68 px)
  const m = Object.assign(document.createElement('span'), { style: 'position:fixed;visibility:hidden;font-size:12px;white-space:nowrap;font-variant-numeric:tabular-nums' })
  document.body.appendChild(m)
  let texte = 0
  for (const t of ['Seulement dans ce navigateur', 'Fichier : le 28 septembre']) { m.textContent = t; texte = Math.max(texte, m.getBoundingClientRect().width) }
  m.remove()
  return {
    large: Math.max(140, Math.ceil(texte) + 68),
    forme: ui.formeClasseur, dans, place: Math.floor(hs.l - Math.round(o.d + 12) - 12), hauteurSans: Math.round(hs.h), hauteurAvec: Math.round(avecH),
    barres, bouton: visible(b) ? rect(b) : null, posAvec, posSans, memeHaut,
    fichier: { titre: document.querySelector('.barre-haut .bouton.points').title, decrit: document.querySelector('.barre-haut .bouton.points').getAttribute('aria-describedby') },
    telephone: matchMedia('(max-width: 640px), (max-height: 500px) and (pointer: coarse)').matches,
    memeRangee: ['t', 'h'].every(k => Math.abs(ha[k] - hs[k]) < 0.5),
    nom: { texte: document.querySelector('.rang').textContent, visible: getComputedStyle(nom).display !== 'none' && nom.getBoundingClientRect().width >= 56, serre: nom.classList.contains('serre') },
  }
}
const chevauche = (a, b) => Math.min(a.d, b.d) - Math.max(a.l, b.l) > 0.5 && Math.min(a.b, b.b) - Math.max(a.t, b.t) > 0.5
function verifierGeometrie(g, nomEcran, attendu) {
  const [forme, place, hauteur] = attendu ?? []
  // La règle, d'après la place mesurée
  // (Adapté au lot 5, K10 : au téléphone, la règle est la sienne : le
  // premier bouton de la barre du haut s'il y tient sans ajouter de rangée,
  // sinon sa barre étroite s'il a 58 px, sinon caché)
  const regle = g.telephone ? ((g.dans && g.hauteurAvec === g.hauteurSans) ? 'dans-la-barre' : g.place >= 58 ? 'etroit' : 'cache')
    : g.place >= g.large ? 'large' : g.place >= 58 ? 'etroit' : (g.hauteurSans > 80 && g.hauteurAvec === g.hauteurSans && g.dans) ? 'dans-la-barre' : 'cache'
  ok(g.forme === regle, `${nomEcran} : la forme suit la règle (place ${g.place} px → ${regle})`, g)
  if (forme) ok(g.forme === forme && (place === null || Math.abs(g.place - place) <= 2) && (!hauteur || g.hauteurSans === hauteur), `${nomEcran} : ${forme}, place ${place ?? '—'} px${hauteur ? `, barre du haut ${hauteur} px` : ''} (mesuré : ${g.forme}, ${g.place}, ${g.hauteurSans})`, g)
  // Jamais de chevauchement du bouton (ou de sa barre) avec une autre barre ;
  // la barre du haut garde sa place et sa taille. (Sur un téléphone en
  // portrait, la barre des outils, en bas, croise déjà la barre du haut à
  // trois rangées depuis le lot 3 : ce n'est pas l'affaire du bouton.)
  const ch = []
  const lui = g.barres.classeur ?? g.bouton
  if (lui) for (const n of ['outils', 'zoom'].concat(g.barres.classeur ? ['haut'] : [])) if (chevauche(lui, g.barres[n])) ch.push(n)
  // (Adapté au lot 5, K10 : au téléphone, la barre du haut, sur une rangée,
  // s'élargit du bouton du classeur — en paysage, vers la gauche — mais garde
  // son haut et sa hauteur, et ne touche plus jamais la barre des outils, en
  // portrait non plus : plus exigeant qu'avant)
  if (g.telephone) ok(!ch.length && g.memeRangee && !chevauche(g.barres.haut, g.barres.outils), `${nomEcran} : aucun chevauchement (ni avec la barre des outils), la barre du haut garde son haut et sa hauteur`, { ch, barres: g.barres, bouton: g.bouton, memeRangee: g.memeRangee })
  else ok(!ch.length && g.memeHaut, `${nomEcran} : aucun chevauchement, la barre du haut garde sa place et sa taille`, { ch, barres: g.barres, bouton: g.bouton, memeHaut: g.memeHaut })
  if (g.barres.classeur) ok(g.barres.classeur.l >= g.barres.outils.d + 11.5 && g.barres.haut.l - g.barres.classeur.d >= 11.5, `${nomEcran} : 12 px de chaque côté du bouton`, g.barres)
  // Les rangées de la barre du haut : celles du lot 3
  ok(g.hauteurAvec === g.hauteurSans, `${nomEcran} : la barre du haut garde ses rangées (${g.hauteurSans} px)`, g)
  if (g.forme !== 'dans-la-barre') ok(JSON.stringify(g.posAvec) === JSON.stringify(g.posSans), `${nomEcran} : la barre du haut est exactement celle du lot 3`, g)
  // Caché : le bouton ⋯ nomme le classeur et porte l'état
  // (Adapté au lot 5, K10 : au téléphone, le bouton ⋯ est « Plus », et son
  // titre le dit : « Plus : la page, les outils de cours, le classeur » ; et
  // depuis les corrections « conformité » du lot 5, les deux titres disent
  // aussi les réglages de cet appareil, que le menu a depuis K9)
  const titre = g.telephone ? 'Plus : la page, les outils de cours, le classeur, cet appareil' : 'Enregistrer, ouvrir ou exporter en PDF ; réglages de cet appareil (Ctrl + S, Ctrl + O, Ctrl + P)'
  if (g.forme === 'cache') ok(g.fichier.titre.startsWith(titre + ' · Classeur « ') && / · Classeur « .+ »$/.test(g.fichier.titre) && g.fichier.decrit === 'etat-classeur-description', `${nomEcran} : caché, le bouton ⋯ nomme le classeur (« ${g.fichier.titre} »)`, g.fichier)
  else ok(g.fichier.titre === titre && !g.fichier.decrit, `${nomEcran} : le bouton ⋯ garde son titre`, g.fichier)
}

const POSITIONS = () => {
  const b = document.querySelector('.bouton-classeur')
  return [...document.querySelectorAll('.barre-haut > *'), b].map(x => { const r = x.getBoundingClientRect(); return [Math.round(r.left), Math.round(r.top), Math.round(r.width)].join(',') })
}
for (const e of ECRANS) {
  const nomEcran = `${e.l} × ${e.h}`
  const ctx = await nav.newContext({ viewport: { width: e.l, height: e.h }, hasTouch: !!e.t })
  const p = await ctx.newPage(); suivre(p, nomEcran)
  await p.goto(DEV); await pret(p); await p.waitForTimeout(400)
  const g0 = await p.evaluate(GEOMETRIE)
  verifierGeometrie(g0, nomEcran + ' sans nom', e.sans)
  if (e.l === 1366 || e.l === 768 || e.l === 390) await p.screenshot({ path: ICI + `A-${e.l}x${e.h}.png` })
  // Une page nommée (la deuxième de trois), comme le contrôle final du lot 3
  await p.evaluate(() => { const a = window.__app; a.nouvellePage(); a.nouvellePage(); a.tableau.renommerPage(a.pages[1], 'Exercice 12 p. 84'); a.allerPage(a.pages[0]) })
  await p.waitForTimeout(800)
  const g1 = await p.evaluate(GEOMETRIE)
  verifierGeometrie(g1, nomEcran + ' nommée', e.avec)
  const p1 = await p.evaluate(POSITIONS)
  await p.evaluate(() => window.__app.allerPage(window.__app.pages[1])); await p.waitForTimeout(900)
  const p2 = await p.evaluate(POSITIONS)
  ok(JSON.stringify(p1) === JSON.stringify(p2), `${nomEcran} : d'une page sans nom à la page nommée, aucun bouton ne bouge (le bouton du classeur non plus)`, { p1, p2 })
  if (e.l === 1024 && e.h === 768) {
    // La vérification 3 de lot3/controle-final.mjs : le nom se lit, une rangée
    // (lot 5, K8 : la barre du haut a 115 px de moins, le nom y tient à sa
    // taille, sans se resserrer ; lot3/controle-final.mjs essaie le
    // resserrement à 900 × 768. Adapté volontairement.)
    const g2 = await p.evaluate(GEOMETRIE)
    ok(g2.nom.visible && g2.nom.texte === '2 / 3 · Exercice 12 p. 84' && !g2.nom.serre && g2.hauteurAvec === g0.hauteurSans && g2.hauteurAvec === 58,
      '1024 × 768 : « 2 / 3 · Exercice 12 p. 84 » se lit dans le compteur, à sa taille, la barre garde une rangée', g2.nom)
    await p.screenshot({ path: ICI + 'A-1024-nommee.png' })
  }
  if (e.l === 1280) ok(g1.forme === 'etroit', '1280 × 720 nommée : l\'icône et le point (la place se réduit à ' + g1.place + ' px)', g1)
  await ctx.close()
}

// =====================================================================
// B. LE BOUTON, LE LECTEUR D'ÉCRAN, LE MENU ⋯
// =====================================================================
console.log('=== B. le bouton et le menu ⋯ ===')
{
  const ctx = await nav.newContext({ viewport: { width: 1366, height: 768 } })
  await ctx.addInitScript(ECOUTER_TOASTS)
  const p = await ctx.newPage(); suivre(p, 'B')
  await p.goto(DEV); await pret(p); await p.waitForTimeout(500)
  const b = await p.evaluate(() => {
    const b = document.querySelector('.bouton-classeur'), d = document.getElementById(b.getAttribute('aria-describedby'))
    const path = b.querySelector('svg path')?.getAttribute('d'), svg = getComputedStyle(b.querySelector('svg'))
    return { aria: b.getAttribute('aria-label'), titre: b.title, nom: b.querySelector('.nom-classeur').textContent, court: b.querySelector('.etat-classeur').textContent,
      description: d?.textContent, cache: d?.hidden, path, trait: svg.strokeWidth, fond: svg.fill, poids: getComputedStyle(b.querySelector('.nom-classeur')).fontWeight,
      taille: getComputedStyle(b.querySelector('.etat-classeur')).fontSize, gris: getComputedStyle(b.querySelector('.etat-classeur')).color }
  })
  ok(b.aria === 'Classeur « Premier classeur » : ouvrir la bibliothèque' && b.titre === 'Premier classeur' && b.nom === 'Premier classeur', 'Le bouton : son nom accessible, son titre (le nom entier)', b)
  ok(b.court === 'Seulement dans ce navigateur', 'Un navigateur neuf, rien d\'autre : « Seulement dans ce navigateur »', b.court)
  // (Adapté au lot 4, morceau C10 : en ligne, la copie sur le Drive est voulue par défaut ; rien à
  // copier encore, pas connecté : « Sur le Drive : en attente de la connexion Google », sans bouton)
  ok(b.cache && b.description === 'Enregistré dans ce navigateur. Pas d\'enregistrement automatique sur une clé. Sur le Drive : en attente de la connexion Google. Jamais enregistré dans un fichier.',
    'aria-describedby : un texte caché qui donne toutes les lignes', b.description)
  ok(b.path === 'M4 7h12v14H4zM7 7v14M10 11h3M8 7V3h12v14h-4M11 3v4' && parseFloat(b.trait) === 1.8 && b.fond === 'none', 'L\'icône « classeurs » : grille 24, traits de 1,8, sans remplissage', b)
  ok(Number(b.poids) >= 700 && b.taille === '12px', 'Le nom en gras, l\'état en 12 px gris', b)
  // Le menu ⋯ : le bloc du classeur en tête
  await ouvrirMenuFichier(p)
  let m = await p.evaluate(BLOC)
  ok(m.premier === 'bloc-classeur' && m.nom === 'Premier classeur', 'Le menu ⋯ commence par le bloc du classeur (son nom)', m)
  ok(JSON.stringify(m.lignes.map(l => l.quoi)) === '["navigateur","cle","drive","fichier"]'
    && m.lignes[0].texte === 'Enregistré dans ce navigateur' && m.lignes[1].texte === 'Pas d\'enregistrement automatique sur une clé'
    && m.lignes[2].texte === 'Sur le Drive : en attente de la connexion Google' && m.lignes[3].texte === 'Jamais enregistré dans un fichier' && m.lignes.every(l => l.bouton === null),
  '… ses lignes, dans l\'ordre (navigateur, clé, Drive, fichier), sans bouton quand rien ne presse', m.lignes)
  // Lot 4 (C4) : Chromium a showSaveFilePicker, l'entrée « Enregistrer
  // automatiquement dans un fichier… » (activer-cle) suit « Enregistrer le classeur… »
  // (Adapté au lot 4, morceau C5 : « Bibliothèque des classeurs… » en tête)
  // (Adapté au lot 4, morceau C10 : « Copie sur le Drive… » (copie-drive) entre volontairement dans le menu ⋯, avant « Ouvrir un classeur… »)
  ok(!m.note && JSON.stringify(m.entrees) === '["bibliotheque","enregistrer","activer-cle","copie-drive","ouvrir","exporter-pdf"]', '… plus de note en bas ; la bibliothèque (C5), les trois entrées de toujours, et celle de la clé (C4)', m)
  await p.keyboard.press('Escape')
  // (Adapté au lot 4, morceau C5 : le bouton du classeur n'ouvre plus le
  // menu ⋯, provisoire, mais la bibliothèque des classeurs)
  await p.click('.bouton-classeur'); await p.waitForTimeout(300)
  const biblio = await p.evaluate(() => ({ ouvert: !!window.__bibliotheque?.ouvert, menu: !![...document.querySelectorAll('.menu-flottant')].find(x => !x.hidden) }))
  ok(biblio.ouvert && !biblio.menu, 'Un clic sur le bouton du classeur : la bibliothèque des classeurs (lot 4 C5)', biblio)
  await p.keyboard.press('Escape'); await p.waitForTimeout(150)
  ok(!(await p.evaluate(() => window.__bibliotheque.ouvert)), '… Échap la referme')
  // Au clavier : Entrée et Espace ; Échap rend le focus au bouton
  for (const touche of ['Enter', ' ']) {
    await p.focus('.bouton-classeur'); await p.keyboard.press(touche); await p.waitForTimeout(300)
    const f = await p.evaluate(() => ({ biblio: window.__bibliotheque.ouvert, focus: !!document.activeElement?.closest('.bibliotheque') }))
    await p.keyboard.press('Escape'); await p.waitForTimeout(150)
    const retour = await p.evaluate(() => document.activeElement?.classList.contains('bouton-classeur'))
    ok(f.biblio && f.focus && retour, `Au clavier (${touche === ' ' ? 'Espace' : 'Entrée'}) : la bibliothèque s'ouvre, le focus dedans ; Échap le rend au bouton`, { ...f, retour })
  }
  // Ctrl + S : le fichier ; l'état le dit aussitôt
  await p.evaluate(PICKER)
  await p.keyboard.press('Control+s')
  await p.waitForFunction(() => window.__ecrit, null, { timeout: 30000 }); await p.waitForTimeout(300)
  let e = await p.evaluate(ETAT)
  ok(e.court === 'Fichier : à l\'instant' && /^Dernier enregistrement dans un fichier : aujourd'hui à \d+ h \d\d$/.test(e.lignes.at(-1).texte) && e.niveau === 'ok',
    'Après Ctrl + S : « Fichier : à l\'instant », « Dernier enregistrement dans un fichier : aujourd\'hui à … »', e)
  const tout = await p.evaluate(() => document.body.innerText + [...document.querySelectorAll('[title],[aria-label]')].map(x => x.title + x.getAttribute('aria-label')).join(' ') + document.getElementById('etat-classeur-description').textContent)
  ok(!/\bundefined\b|\bNaN\b|\[object Object\]/.test(tout), 'Aucun texte ne dit « undefined », « NaN » ni « [object Object] »')
  // Le point : 8 px, ambre, sans animation ni transition
  const st = await p.evaluate(() => { const x = document.querySelector('.bouton-classeur .point-etat'); x.hidden = false; const s = getComputedStyle(x); const r = { w: s.width, h: s.height, fond: s.backgroundColor, anim: s.animationName, tr: s.transitionDuration, bouton: getComputedStyle(document.querySelector('.bouton-classeur')).transitionDuration, bandeau: getComputedStyle(document.querySelector('.bandeau-sauvegarde')).transitionDuration }; x.hidden = true; return r })
  ok(st.w === '8px' && st.h === '8px' && st.fond === 'rgb(184, 134, 11)' && st.anim === 'none' && st.tr === '0s' && st.bouton === '0s' && st.bandeau === '0s', 'Le point : 8 px, #b8860b, sans animation ni transition (ni le bouton, ni le bandeau)', st)
  await ctx.close()
}

// =====================================================================
// C. LE TROU
// =====================================================================
console.log('=== C. le trou ===')
const REFUSER = () => {
  // L'écriture suivante de y-indexeddb est abandonnée APRÈS coup (une
  // micro-tâche), comme un disque plein : aucune exception dans le geste
  const add = IDBObjectStore.prototype.add
  let refus = 0
  IDBObjectStore.prototype.add = function (...a) {
    const r = add.apply(this, a)
    if (this.name === 'updates' && refus === 0) { refus++; const tr = this.transaction; queueMicrotask(() => { try { tr.abort() } catch { /* finie */ } }) }
    return r
  }
  window.__rendrePlace = () => { IDBObjectStore.prototype.add = add }
}
{
  const ctx = await nav.newContext({ viewport: { width: 1366, height: 768 } })
  await ctx.addInitScript(ECOUTER_TOASTS)
  const p = await ctx.newPage(); suivre(p, 'C')
  await p.goto(DEV); await pret(p); await p.waitForTimeout(500)
  await ecrire(p, 300, 300); await p.waitForTimeout(300)
  // L'heure où la base dit son refus (la réparation est prévue 30 s après)
  await p.evaluate(() => { const t = window.__app.tableau, avant = t.onErreurBase; t.onErreurBase = r => { window.__tErreur ??= Date.now(); avant?.(r) } })
  await p.evaluate(REFUSER)
  let leve = null
  try { await ecrire(p, 300, 380) } catch (x) { leve = x.message }
  await p.waitForTimeout(200)
  await p.evaluate(() => window.__rendrePlace())
  await ecrire(p, 300, 460); await p.waitForTimeout(2600)
  const ids = await p.evaluate(() => [...window.__app.tableau.formesDe(window.__app.page).keys()])
  const tTrou = await p.evaluate(() => window.__tErreur)
  let e = await p.evaluate(ETAT)
  ok(!leve && e.trou && ids.length === 3, 'Une écriture refusée après coup (asynchrone) : aucune exception dans le geste, le trou est repéré', { leve, trou: e.trou, n: ids.length })
  ok(e.court === 'Pas enregistré !' && e.point && e.niveau === 'attention', 'Le bouton : « Pas enregistré ! », le point ambre', e)
  ok(e.lignes[0].texte === 'Ce navigateur n\'enregistre plus ce classeur (plus de place ?) : enregistrez-le dans un fichier (Ctrl + S).' && !e.lignes.some(l => /^Enregistré/.test(l.texte)),
    '… la ligne du navigateur le dit, et jamais « Enregistré »', e.lignes)
  ok(e.bandeau && e.bandeau.texte === 'Ce navigateur n\'enregistre plus ce classeur.' && JSON.stringify(e.bandeau.boutons) === '["Enregistrer le classeur"]' && !e.bandeau.fermer,
    'Le bandeau : « Ce navigateur n\'enregistre plus ce classeur. » [Enregistrer le classeur], sans ×', e.bandeau)
  const rc = await p.evaluate(() => { const r = document.querySelector('.barre-classeur').getBoundingClientRect(); return { l: Math.round(r.left), b: Math.round(r.bottom) } })
  ok(e.bandeau && e.bandeau.r.l === rc.l && e.bandeau.r.t >= rc.b && e.bandeau.r.d - e.bandeau.r.l <= 360, '… sous le bouton du classeur, 360 px au plus', { b: e.bandeau?.r, rc })
  // Le menu : le bouton de la ligne
  await ouvrirMenuFichier(p)
  const m = await p.evaluate(BLOC)
  ok(m.lignes[0].niveau === 'attention' && m.lignes[0].bouton === 'Enregistrer le classeur' && m.entrees[0] === 'etat:enregistrer', 'Le menu ⋯ : la ligne du navigateur en attention, avec son bouton « Enregistrer le classeur » (une entrée du menu)', m)
  await p.keyboard.press('Escape')
  // beforeunload : la confirmation du navigateur
  let dialogue = null
  const surDialogue = d => { dialogue = d.type(); d.dismiss().catch(() => {}) }
  p.on('dialog', surDialogue)
  await p.evaluate(() => { setTimeout(() => location.reload(), 0) })
  await p.waitForTimeout(1500)
  p.off('dialog', surDialogue)
  const reste = await p.evaluate(() => !!window.__surveillance && window.__app.tableau.trou).catch(() => false)
  ok(dialogue === 'beforeunload' && reste, 'Fermer ou recharger pendant le trou : le navigateur demande confirmation (beforeunload)', { dialogue, reste })
  ok(await p.evaluate(() => window.__surveillance.peutQuitter()) === 'Ce classeur n\'est pas entièrement enregistré dans ce navigateur : enregistrez-le d\'abord (Ctrl + S).', '… peutQuitter() le dit (pour changer de classeur)')
  // Ctrl + S : depuis la mémoire de l'onglet, avec les 3 formes
  await p.evaluate(PICKER)
  await p.keyboard.press('Control+s')
  await p.waitForFunction(() => window.__ecrit, null, { timeout: 30000 }); await p.waitForTimeout(300)
  const octets = Buffer.concat((await p.evaluate(() => window.__ecrit.map(m => [...m]))).map(a => Buffer.from(a)))
  const lu = lireMemc(octets)
  const t = await p.evaluate(() => window.__toasts)
  ok(lu.entier && ids.every(id => lu.ids.includes(id)) && lu.ids.length === 3 && t.includes('Enregistrement depuis la mémoire de cet onglet…'), 'Ctrl + S pendant le trou : le fichier vient de la mémoire de l\'onglet, avec les 3 formes', { n: lu.ids.length, t })
  e = await p.evaluate(ETAT)
  const avantQuitter = await p.evaluate(() => { const ev = new Event('beforeunload', { cancelable: true }); window.dispatchEvent(ev); return { prevenu: ev.defaultPrevented, peut: window.__surveillance.peutQuitter() } })
  ok(e.court === 'Pas enregistré !' && /^Dernier enregistrement dans un fichier : aujourd'hui à/.test(e.lignes.at(-1).texte) && !avantQuitter.prevenu && avantQuitter.peut === null,
    '… le fichier est noté ; le navigateur, lui, n\'enregistre toujours pas (« Pas enregistré ! ») ; on peut fermer sans confirmation', { e, avantQuitter })
  // La réparation au calme : jamais pendant un trait. Elle est prévue 30 s
  // après le trou ; un trait tenu de 27 s à 33 s la retient.
  const attente = Math.max(0, tTrou + 27000 - await p.evaluate(() => Date.now()))
  await p.waitForTimeout(attente)
  await p.mouse.move(600, 300); await p.mouse.down()
  for (let i = 0; i < 60; i++) { await p.mouse.move(600 + i * 3, 300 + Math.sin(i / 5) * 30); await p.waitForTimeout(100) }
  const pendant = await p.evaluate(() => ({ trou: window.__app.tableau.trou, calme: window.__app.calme, temps: Date.now() }))
  await p.mouse.up()
  await p.waitForTimeout(500)
  const juste = await p.evaluate(() => window.__app.tableau.trou)
  ok(pendant.temps - tTrou > 30500 && pendant.trou && !pendant.calme && juste, 'L\'heure de la réparation passée pendant un trait : rien (ni pendant, ni dans la seconde et demie qui suit)', { ...pendant, depuis: pendant.temps - tTrou, juste })
  await p.waitForFunction(() => !window.__app.tableau.trou, null, { timeout: 8000 }).catch(() => {})
  await p.waitForTimeout(400)
  e = await p.evaluate(ETAT)
  const t2 = await p.evaluate(() => window.__toasts)
  ok(!e.trou && t2.includes('Ce classeur est de nouveau enregistré dans ce navigateur.') && e.court !== 'Pas enregistré !' && !e.bandeau && e.lignes[0].texte === 'Enregistré dans ce navigateur',
    'Au calme : la base est réparée, « Ce classeur est de nouveau enregistré dans ce navigateur. », le bandeau s\'en va', { e, t2: t2.slice(-3) })
  const ids2 = await p.evaluate(() => [...window.__app.tableau.formesDe(window.__app.page).keys()])
  // Au rechargement : tout est là
  await p.reload(); await pret(p); await p.waitForTimeout(600)
  const ids3 = await p.evaluate(() => [...window.__app.tableau.formesDe(window.__app.page).keys()])
  ok(ids.every(id => ids3.includes(id)) && ids3.length === ids2.length && ids2.length === 4, 'Au rechargement : les 3 formes (et le trait d\'après), rien ne manque', { ids, ids2, ids3 })
  await ctx.close()
}

// =====================================================================
// D. LE DOUBLE-CLIC AU STYLO ET LES TÂCHES AUTOMATIQUES
// =====================================================================
console.log('=== D. le double-clic au Stylo ===')
async function stylet(page) {
  const cdp = await page.context().newCDPSession(page)
  const ev = (type, x, y, o = {}) => cdp.send('Input.dispatchMouseEvent', { type, x, y, pointerType: 'pen',
    button: o.button ?? (type === 'mouseMoved' ? 'none' : 'left'), buttons: o.buttons ?? 0, force: o.force ?? 0.5, clickCount: o.clickCount ?? 1 })
  return {
    async toucher(x, y, o = {}) {
      await ev('mouseMoved', x, y)
      await ev('mousePressed', x, y, { buttons: 1, ...o })
      await ev('mouseReleased', x, y, { buttons: 0, force: 0, ...o })
    },
  }
}
{
  const ctx = await nav.newContext({ viewport: { width: 1366, height: 768 } })
  const p = await ctx.newPage(); suivre(p, 'D')
  await p.goto(DEV); await pret(p); await p.waitForTimeout(500)
  const rect = await p.evaluate(() => {
    const a = window.__app, t = a.tableau
    const f = a.nouvelleFigure({ type: 'polygone', ferme: true, pts: [{ x: 200, y: 200 }, { x: 600, y: 200 }, { x: 600, y: 450 }, { x: 200, y: 450 }] })
    f.fond = '#fde68a'
    t.nouveauGeste(); t.poser(a.page, f)
    a.choisirOutil('stylo')
    // Toute pose de ce qui attend est comptée
    window.__poses = 0
    const orig = a.poserCeQuiAttend.bind(a)
    a.poserCeQuiAttend = () => { window.__poses++; orig() }
    return f.id
  })
  // Un trou : une réparation attend son heure
  await p.evaluate(REFUSER)
  await ecrire(p, 800, 600); await p.waitForTimeout(300)
  await p.evaluate(() => window.__rendrePlace())
  const ecran = await p.evaluate(() => { const r = document.getElementById('zone').getBoundingClientRect(), e = window.__app.cam.versEcran(400, 320); return { x: r.left + e.x, y: r.top + e.y } })
  const s = await stylet(p)
  await p.waitForTimeout(2000)
  const n0 = await p.evaluate(() => window.__app.formes.length)
  // Premier toucher : le point attend ; les tâches automatiques passent à ce moment-là
  await s.toucher(ecran.x, ecran.y)
  const entre = await p.evaluate(() => {
    const a = window.__app, sv = window.__surveillance
    const r = { attente: !!a.rendu.enAttente, calme: a.calme, trouAvant: a.tableau.trou }
    sv.reparer(true)            // l'heure de la réparation tombe entre les deux appuis
    sv.actualiser()             // l'affichage aussi
    r.trouApres = a.tableau.trou; r.attenteApres = !!a.rendu.enAttente; r.poses = window.__poses
    return r
  })
  await s.toucher(ecran.x + 2, ecran.y, { clickCount: 2 })
  await p.waitForTimeout(450)
  const apres = await p.evaluate(() => ({ n: window.__app.formes.length, panneau: !document.querySelector('.panneau-forme').hidden, options: window.__app.options, poses: window.__poses }))
  ok(entre.attente && !entre.calme && entre.trouAvant && entre.trouApres && entre.attenteApres && entre.poses === 0, 'Le point du premier toucher attend : ce n\'est pas le calme ; la réparation attend, et rien n\'est posé', entre)
  ok(apres.n === n0 && apres.panneau && apres.options === rect && apres.poses === 0, 'Le second toucher : les options de la figure, aucun point d\'encre', { n0, ...apres })
  await p.waitForFunction(() => !window.__app.tableau.trou, null, { timeout: 8000 }).catch(() => {})
  const fin = await p.evaluate(() => ({ trou: window.__app.tableau.trou, n: window.__app.formes.length, poses: window.__poses }))
  ok(!fin.trou && fin.n === n0 && fin.poses === 0, 'Puis, au calme, la réparation se fait, sans rien poser', fin)
  await ctx.close()
}

// =====================================================================
// E. LE RAPPEL : FIREFOX SIMULÉ (pas de showSaveFilePicker), page.clock
// =====================================================================
console.log('=== E. le rappel (Firefox simulé) ===')
const MIN = m => `${String(Math.floor(m / 60)).padStart(2, '0')}:${String(m % 60).padStart(2, '0')}:00`
{
  const ctx = await nav.newContext({ viewport: { width: 1366, height: 768 }, acceptDownloads: true })
  await ctx.addInitScript(() => { try { delete window.showSaveFilePicker } catch { /* */ } window.showSaveFilePicker = undefined })
  await ctx.addInitScript(ECOUTER_TOASTS)
  const p = await ctx.newPage(); suivre(p, 'E')
  await p.clock.install()
  await p.goto(DEV); await pret(p); await p.waitForTimeout(500)
  // (Adapté au lot 4, morceau C10 : la copie sur le Drive, voulue par défaut en ligne, a sa ligne, son
  // point et son bandeau quand elle attend la connexion Google ; ces essais du rappel la mettent de
  // côté, « Pas de copie pour ce classeur » : rien d'autre ne protège le classeur, comme avant)
  await p.evaluate(async () => { await window.__drive?.choisir('aucune'); window.__toasts = [] })
  let e = await p.evaluate(ETAT)
  ok(e.lignes[1].texte === 'Ce navigateur ne sait pas enregistrer tout seul dans un fichier : enregistrez le classeur (Ctrl + S) de temps en temps.' && e.court === 'Seulement dans ce navigateur',
    'Sans showSaveFilePicker : « Ce navigateur ne sait pas enregistrer tout seul dans un fichier… »', e.lignes)
  await ecrire(p, 300, 200)
  await p.clock.fastForward(MIN(19))
  await ecrire(p, 300, 260)                                       // 19 min de travail
  await p.clock.fastForward(MIN(3))
  e = await p.evaluate(ETAT)
  ok(!e.bandeau && e.niveau !== 'attention', 'Rien avant 20 min de travail (19 min, puis 3 min sans geste)', e)
  await ecrire(p, 300, 320)                                       // 22 min de travail
  await p.clock.fastForward('01:30')
  e = await p.evaluate(ETAT)
  ok(!e.bandeau, 'Rien pendant les gestes : 1 min 30 après le dernier', e.bandeau)
  await ecrire(p, 300, 380)                                       // un geste
  await p.clock.fastForward('01:30')
  e = await p.evaluate(ETAT)
  ok(!e.bandeau, '… un geste de plus remet le compte à zéro (1 min 30 après lui, rien)', e.bandeau)
  await p.clock.fastForward('00:40')
  e = await p.evaluate(ETAT)
  ok(e.bandeau && /^Pas encore enregistré dans un fichier depuis 2\d min de travail\.$/.test(e.bandeau.texte) && JSON.stringify(e.bandeau.boutons) === '["Enregistrer le classeur"]' && e.bandeau.fermer,
    'Après 2 min sans geste : « Pas encore enregistré dans un fichier depuis 25 min de travail. » [Enregistrer le classeur] ×', e.bandeau)
  ok(e.point && e.niveau === 'attention' && e.court === 'Seulement dans ce navigateur' && e.lignes.at(-1).niveau === 'attention', '… le point ambre, la ligne du fichier en attention ; le texte court reste « Seulement dans ce navigateur »', e)
  await p.screenshot({ path: ICI + 'E-rappel.png' })
  // Paru, il reste quand on se remet à écrire
  await ecrire(p, 500, 400); await p.clock.fastForward('00:31')
  e = await p.evaluate(ETAT)
  ok(!!e.bandeau, 'Paru, il reste quand on se remet à écrire (il ne surgit ni ne part en plein geste)', e.bandeau)
  // Caché pendant la trieuse, la revue, une séance
  const cache = async () => p.evaluate(() => { const b = document.querySelector('.bandeau-sauvegarde'); return { bandeau: getComputedStyle(b).display === 'none', barre: document.querySelector('.barre-classeur').inert || getComputedStyle(document.querySelector('.barre-classeur')).visibility === 'hidden' } })
  await p.keyboard.press('Shift+P'); await p.waitForTimeout(400)
  const trieuse = await cache()
  await p.keyboard.press('Escape'); await p.waitForTimeout(300)
  await p.click('.barre-haut [aria-label^="Revoir la construction"]'); await p.waitForTimeout(600)
  const revue = await cache()
  await p.keyboard.press('Escape'); await p.waitForTimeout(400)
  await p.click('.barre-haut [aria-label^="Automatismes"]'); await p.waitForTimeout(500)
  const seance = await cache()
  await p.keyboard.press('Escape'); await p.waitForTimeout(400)
  const revenu = await p.evaluate(ETAT)
  ok(trieuse.bandeau && trieuse.barre && revue.bandeau && revue.barre && seance.bandeau && seance.barre && !!revenu.bandeau, 'Pendant la trieuse, la revue et une séance : le bandeau est caché, le bouton inerte ; il revient après', { trieuse, revue, seance, revenu: !!revenu.bandeau })
  // × : une heure de silence
  await p.click('.fermer-bandeau'); await p.waitForTimeout(100)
  e = await p.evaluate(ETAT)
  ok(!e.bandeau, '× : le bandeau s\'en va', e.bandeau)
  await ecrire(p, 500, 480)
  await p.clock.fastForward(MIN(30))
  e = await p.evaluate(ETAT)
  ok(!e.bandeau, '… et ne revient pas de l\'heure (30 min après, toujours rien)', e.bandeau)
  await p.clock.fastForward(MIN(31))
  e = await p.evaluate(ETAT)
  ok(!!e.bandeau, '… une heure après, il revient', e.bandeau)
  // Enregistrer depuis le bandeau : le téléchargement ; tout se remet à jour
  const dl = p.waitForEvent('download', { timeout: 30000 })
  await p.click('.bouton-bandeau[data-etat-action="enregistrer"]')
  const d = await dl
  await d.saveAs(F + 'E.memc')
  await p.waitForTimeout(300)
  e = await p.evaluate(ETAT)
  ok(!e.bandeau && e.court === 'Fichier : à l\'instant' && !e.point, '[Enregistrer le classeur] : le fichier part, le bandeau et le point s\'en vont, « Fichier : à l\'instant »', e)
  // L'horloge qui avance
  await p.clock.fastForward(MIN(7))
  e = await p.evaluate(ETAT)
  ok(e.court === 'Fichier : il y a 7 min', 'L\'horloge avance : « Fichier : il y a 7 min »', e.court)
  await p.clock.fastForward(MIN(120))
  e = await p.evaluate(ETAT)
  ok(/^Fichier : (à|hier à) \d+ h \d\d$/.test(e.court) && e.court.length <= 28, `Deux heures plus tard : « ${e.court} »`, e.court)
  await ctx.close()
}

// =====================================================================
// F. LE RAPPEL : CHROME SANS CLÉ
// =====================================================================
console.log('=== F. le rappel (Chrome, sans clé) ===')
{
  const ctx = await nav.newContext({ viewport: { width: 1024, height: 768 } })
  await ctx.addInitScript(PICKER)
  const p = await ctx.newPage(); suivre(p, 'F')
  await p.clock.install()
  await p.goto(DEV); await pret(p); await p.waitForTimeout(500)
  // (Adapté au lot 4, morceau C10 : la copie sur le Drive, voulue par défaut en ligne, a sa ligne, son
  // point et son bandeau quand elle attend la connexion Google ; ces essais du rappel la mettent de
  // côté, « Pas de copie pour ce classeur » : rien d'autre ne protège le classeur, comme avant)
  await p.evaluate(async () => { await window.__drive?.choisir('aucune'); window.__toasts = [] })
  let e = await p.evaluate(ETAT)
  ok(e.lignes[1].texte === 'Pas d\'enregistrement automatique sur une clé', 'Chrome sans clé : « Pas d\'enregistrement automatique sur une clé »', e.lignes)
  await ecrire(p, 300, 200)
  await p.clock.fastForward(MIN(21))
  await ecrire(p, 300, 260)
  await p.clock.fastForward('02:31')
  e = await p.evaluate(ETAT)
  const actions = await p.evaluate(() => window.__surveillance.bandeau?.actions)
  // Lot 4 (C4) : le bouton « Enregistrer automatiquement sur la clé… » est venu
  ok(e.bandeau && /depuis 21 min de travail\.$/.test(e.bandeau.texte) && JSON.stringify(e.bandeau.boutons) === '["Enregistrer le classeur","Enregistrer automatiquement sur la clé…"]' && JSON.stringify(actions) === '["enregistrer","activer-cle"]',
    'Le rappel aussi sous Chrome sans enregistrement automatique, avec « Enregistrer automatiquement sur la clé… » (C4)', { b: e.bandeau, actions })
  // 1024 × 768 : le bouton étroit ; le bandeau sous lui
  const rc = await p.evaluate(() => { const r = document.querySelector('.barre-classeur').getBoundingClientRect(); return { l: Math.round(r.left), b: Math.round(r.bottom), forme: window.__app.ui.formeClasseur } })
  ok(rc.forme === 'etroit' && e.bandeau.r.l === rc.l && e.bandeau.r.t >= rc.b && e.point, '1024 × 768 : l\'icône et le point, le bandeau dessous', { rc, r: e.bandeau.r })
  await p.click('.bouton-bandeau[data-etat-action="enregistrer"]')
  await p.waitForFunction(() => window.__ecrit, null, { timeout: 30000 }); await p.waitForTimeout(300)
  e = await p.evaluate(ETAT)
  ok(!e.bandeau && e.court === 'Fichier : à l\'instant', '[Enregistrer le classeur] : écrit (le fichier choisi), le bandeau s\'en va', e)
  // Une page nommée : le bouton se cache ; le point passe sur ⋯ (le rappel
  // suivant : plus d'une heure après le premier)
  await p.evaluate(() => { const a = window.__app; a.tableau.renommerPage(a.page, 'Symétrie centrale') }); await p.waitForTimeout(400)
  await ecrire(p, 300, 320)
  await p.clock.fastForward(MIN(61))
  await ecrire(p, 300, 380)
  await p.clock.fastForward('02:31')
  e = await p.evaluate(ETAT)
  const fichier = await p.evaluate(() => { const r = document.querySelector('.barre-haut').getBoundingClientRect(); return { d: Math.round(r.right), b: Math.round(r.bottom) } })
  ok(e.forme === 'cache' && e.pointFichier && e.bandeau && e.bandeau.r.d === fichier.d && e.bandeau.r.t >= fichier.b, 'Le bouton caché (page nommée) : le point sur ⋯, le bandeau sous la barre du haut, aligné à droite', { e, fichier })
  await ctx.close()
}

// =====================================================================
// G. DEUX ONGLETS SUR LE MÊME CLASSEUR
// =====================================================================
console.log('=== G. deux onglets ===')
{
  const ctx = await nav.newContext({ viewport: { width: 1366, height: 768 } })
  await ctx.addInitScript(PICKER)
  const a = await ctx.newPage(); suivre(a, 'G-A')
  await a.goto(DEV); await pret(a); await a.waitForTimeout(500)
  const b = await ctx.newPage(); suivre(b, 'G-B')
  await b.goto(DEV); await pret(b); await b.waitForTimeout(500)
  await a.bringToFront()
  await a.keyboard.press('Control+s')
  await a.waitForFunction(() => window.__ecrit, null, { timeout: 30000 }); await a.waitForTimeout(500)
  const eb = await b.evaluate(ETAT)
  ok(eb.court === 'Fichier : à l\'instant' && /^Dernier enregistrement dans un fichier : aujourd'hui/.test(eb.lignes.at(-1).texte), 'L\'onglet B, sur le même classeur, apprend l\'enregistrement fait dans A', eb)
  await ctx.close()
}

// =====================================================================
// H. LA VERSION D'UN SEUL FICHIER (file://)
// =====================================================================
console.log('=== H. la version hors ligne (file://) ===')
if (existsSync(R + '/dist/index.html')) {
  const ctx = await nav.newContext({ viewport: { width: 1366, height: 768 } })
  const p = await ctx.newPage(); suivre(p, 'H')
  await p.goto('file://' + R + '/dist/index.html')
  await p.waitForFunction(() => document.querySelector('.etat-classeur')?.textContent, null, { timeout: 30000 }); await p.waitForTimeout(800)
  const h = await p.evaluate(() => ({ court: document.querySelector('.etat-classeur').textContent, nom: document.querySelector('.nom-classeur').textContent, description: document.getElementById('etat-classeur-description').textContent, picker: typeof window.showSaveFilePicker }))
  ok(h.court === 'Seulement dans ce navigateur' && h.nom === 'Premier classeur' && /^Enregistré dans ce navigateur\. /.test(h.description), `file:// : le bouton et l'état (showSaveFilePicker : ${h.picker})`, h)
  await ctx.close()
} else ok(false, 'dist/index.html manque (npm run build)')

await nav.close()
ok(!erreurs.length, 'Aucune erreur JS', erreurs)
console.log(echecs ? `\n${echecs} ÉCHEC(S)` : '\nTout est vert.')
process.exit(echecs ? 1 : 0)
