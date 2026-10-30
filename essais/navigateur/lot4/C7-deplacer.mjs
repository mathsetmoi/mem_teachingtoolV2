// ESSAI DU MORCEAU C7-deplacer (lot 4) : déplacer, glisser, dupliquer, les aperçus.
// A. « Déplacer vers… » (le menu d'un classeur, d'un dossier) : la fenêtre
//    (l'arbre, la racine d'abord, en retrait et en couleur, « (ici) »,
//    lui-même et ses descendants grisés), le clavier (flèches, Début, Fin,
//    Entrée, Échap, Tab vers « Annuler »), le message (« … : il porte
//    maintenant l'étiquette « 5e B » »), « Aller à », « Annuler ». Les
//    étiquettes propres ne bougent pas.
// B. Glisser à la souris : dès 4 px, de n'importe où ; la carte s'estompe,
//    son image suit, les cibles s'éclairent (jamais elle-même ni un
//    descendant, ni son propre dossier) ; sur une carte de dossier, sur le
//    fil d'Ariane, sur « Bibliothèque » ; hors d'une cible et sur son propre
//    dossier, rien ; Échap ; le clic qui suit n'ouvre rien ; la grille
//    défile près du bord ; un dossier vers son sous-dossier.
// C. La tablette graphique (pointerType 'pen', maxTouchPoints 0) : dès
//    6 px, sans appui long ; le bouton latéral ouvre le menu, ne tire rien ;
//    sans poignée ; les événements de C5 (synthétiques) aussi.
// D. Le doigt (téléphone 390 × 844, CDP) : l'appui long puis glisser ; la
//    poignée ; un glisser qui commence comme un défilement ; deux doigts
//    défilent sans rien ouvrir ; « Déplacer vers… » au téléphone.
// E. Le TNI (1920 × 1080, tactile) : une paume posée pendant un glisser à
//    la souris.
// F. Deux onglets : A dans B et B dans A en même temps, l'un est refusé,
//    aucun cycle.
// G. Dupliquer : le classeur ouvert (après ce qui attend) ; la copie
//    s'ouvre, mêmes pages, même revue ; la source a le même vecteur ; le
//    registre des publications de la copie est vide, celui de la source
//    intact ; plus de place : rien ne reste.
// H. 60 pages dupliquées : aucune tâche longue.
// I. Les aperçus : il paraît après qu'on a écrit puis rouvert la
//    bibliothèque ; adresse objet révoquée à la fermeture ; dans l'image qui
//    suit le pointeur ; dans un autre onglet ; aucune tâche longue pendant
//    qu'on écrit et qu'il se fabrique.
// J. 30 classeurs dans 8 dossiers.
// K. La version d'un seul fichier (file://) : dupliquer (le travailleur) et glisser.
import { RACINE_ESSAIS, RACINE_DEPOT } from '../commun/racines.mjs'
import { chromium } from '../commun/playwright.mjs'
import { existsSync, mkdirSync } from 'node:fs'

const S = `${RACINE_ESSAIS}`
const R = `${RACINE_DEPOT}`
const ICI = S + '/lot4/C7/'
const CAPTURES = ICI + 'captures/'
const DEV = process.env.DEV ?? 'http://localhost:5173/'
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
const pret = p => p.waitForFunction(() => (window.__surveillance && window.__bibliotheque && document.querySelector('.rang')?.textContent?.includes('/'))
  || (window.__bibliotheque && !window.__app && !document.querySelector('.bibliotheque').hidden), null, { timeout: 30000 })
const ECOUTER_TOASTS = () => {
  window.__toasts = []
  let dernier = ''
  setInterval(() => { const t = [...document.querySelectorAll('.toast')].map(x => x.textContent).join('|').replace(/[  ]/g, ' '); if (t && t !== dernier) { dernier = t; window.__toasts.push(t) } }, 15)
}
const toasts = p => p.evaluate(() => window.__toasts.splice(0))
const nav = await chromium.launch({ env: { ...process.env, LANG: 'C.UTF-8', LC_ALL: 'C.UTF-8' } })
async function contexte(o = {}) {
  const ctx = await nav.newContext({ viewport: { width: 1366, height: 768 }, ...o })
  await ctx.addInitScript(ECOUTER_TOASTS)
  return ctx
}
async function ouvrir(ctx, chemin = '', nom = 'dev') {
  const p = await ctx.newPage(); suivre(p, nom)
  await p.goto(DEV + chemin); await pret(p); await p.waitForTimeout(300)
  return p
}
/** n classeurs, comme les crée la bibliothèque, dans un dossier */
const creerPlusieurs = (p, n, o = {}) => p.evaluate(async ({ n, o }) => {
  const dem = await import('/src/classeurs/demarrage.ts'), bases = await import('/src/classeurs/bases.ts'), neuf = await import('/src/classeurs/neuf.ts')
  const etat = await neuf.etatNeuf('carreaux'), T = Date.now(), ids = []
  for (let i = 0; i < n; i++) {
    const id = dem.idClasseur()
    const nom = o.noms?.[i] ?? `${o.prefixe ?? 'Chapitre'} ${i + 1}`
    const fiche = { id, base: dem.baseDe(id), nom, dossier: o.dossier ?? null, etiquettes: o.etiquettes ?? [], cree: T - (n - i) * 3600e3, modifie: T - (n - i) * 600e3, ouvert: o.jamais ? 0 : T - (n - i) * 60e3, pages: 1 }
    await window.__registre.creerClasseur(fiche, b => bases.creerBase(b, etat, { id, nom }))
    ids.push(id)
  }
  return ids
}, { n, o })
/** Un dossier écrit dans l'index, comme le fait « Nouveau dossier » */
const creerDossier = (p, nom, o = {}) => p.evaluate(async ({ nom, o }) => {
  const dem = await import('/src/classeurs/demarrage.ts')
  const d = { id: dem.idClasseur(), nom, parent: o.parent ?? null, couleur: o.couleur ?? '#3b6fb6', cree: Date.now(), ...(o.etiquette ? { etiquette: o.etiquette } : {}) }
  await window.__registre.ajouterDossier(d)
  return d.id
}, { nom, o })
const ouvrirBiblio = async p => {
  await p.evaluate(() => { const b = document.querySelector('.bouton-classeur'); if (b.getClientRects().length) { b.click(); document.querySelector('.menu-seances [data-action="bibliotheque"]').click() } else window.__app.ui.ouvrirBibliotheque() })
  await p.waitForFunction(() => window.__bibliotheque.ouvert && document.querySelectorAll('.grille-classeurs li, .biblio-vide-dossier:not([hidden])').length > 0, null, { timeout: 10000 })
  await p.waitForTimeout(250)
}
const recharger = async p => { await p.evaluate(() => window.__bibliotheque.charger()); await p.waitForTimeout(150) }
const fermerBiblio = async p => { await p.evaluate(() => window.__bibliotheque.fermer()); await p.waitForTimeout(150) }
const sel = (cle, l = 'tous') => `.grille-classeurs.${l} li[data-cle="${cle}"]`
const fiche = (p, id) => p.evaluate(id => window.__registre.classeur(id), id)
const dossierLu = (p, id) => p.evaluate(id => window.__registre.dossier(id), id)
const VUE = () => {
  const n = t => (t || '').replace(/[  ]/g, ' ')
  const cartes = s => [...document.querySelectorAll(s + ' > li')].map(li => ({ cle: li.dataset.cle, nom: li.querySelector('.carte-nom-classeur, .carte-nom-dossier')?.textContent,
    puces: [...li.querySelectorAll('.carte-etiquettes .puce-etiquette')].map(x => (x.classList.contains('heritee') ? '~' : '') + x.textContent),
    image: (i => i && !i.hidden && i.getAttribute('src') ? i.getAttribute('src') : null)(li.querySelector('.apercu-image')),
    sansApercu: (x => x ? !x.hidden : null)(li.querySelector('.sans-apercu')),
    tiree: li.classList.contains('tiree'), possible: li.classList.contains('cible-possible'), sous: li.classList.contains('cible-sous') }))
  const a = document.activeElement
  const menu = [...document.querySelectorAll('.menu-flottant')].find(x => !x.hidden)
  return {
    ouvert: !document.querySelector('.bibliotheque').hidden,
    recents: document.querySelector('.biblio-section.recents').hidden ? [] : cartes('.grille-classeurs.recents'),
    grille: cartes('.grille-classeurs.tous'),
    fil: [...document.querySelectorAll('.biblio-fil li')].map(li => { const x = li.querySelector('button, .fil-ici'); return x.textContent + (x.classList.contains('fil-ici') ? '*' : '') + (x.classList.contains('cible-possible') ? '+' : '') + (x.classList.contains('cible-sous') ? '!' : '') }),
    focus: a?.closest?.('li[data-cle]')?.dataset.cle ?? a?.dataset?.action ?? a?.className ?? null,
    menu: menu ? { label: menu.getAttribute('aria-label'), entrees: [...menu.querySelectorAll('.menu-item')].map(e => e.dataset.action ?? '?'), libelles: [...menu.querySelectorAll('.menu-item')].map(e => n(e.textContent)), r: (r => ({ l: Math.round(r.left), t: Math.round(r.top) }))(menu.getBoundingClientRect()) } : null,
    fantome: !!document.querySelector('.biblio-fantome'), enGlisser: document.querySelector('.bibliotheque').classList.contains('en-glisser'),
    sansTactile: document.querySelector('.bibliotheque').classList.contains('sans-tactile'),
    url: location.search, scroll: Math.round(document.querySelector('.biblio-corps').scrollTop),
    largeur: document.documentElement.scrollWidth, vue: innerWidth,
  }
}
const vue = p => p.evaluate(VUE)
const FENETRE = () => {
  const d = document.querySelector('dialog.dialogue-deplacer[open]')
  if (!d) return null
  const r = d.getBoundingClientRect(), liste = d.querySelector('.deplacer-liste')
  return {
    titre: d.querySelector('h2').textContent,
    lignes: [...d.querySelectorAll('.vers-dossier')].map(b => ({ id: b.dataset.dossier, texte: b.textContent.replace(/[  ]/g, ' '), retrait: b.style.getPropertyValue('--retrait'), couleur: b.querySelector('.vers-icone')?.style.getPropertyValue('--c') ?? '', gris: b.disabled, label: b.getAttribute('aria-label'), h: Math.round(b.getBoundingClientRect().height), tab: b.tabIndex })),
    focus: document.activeElement?.dataset?.dossier ?? document.activeElement?.dataset?.a ?? null,
    r: { l: Math.round(r.left), r: Math.round(r.right), t: Math.round(r.top), b: Math.round(r.bottom) }, vue: { l: innerWidth, h: innerHeight },
    defile: liste.scrollHeight > liste.clientHeight,
  }
}
const fenetre = p => p.evaluate(FENETRE)
const menuCarte = async (p, cle, l = 'tous') => { await p.click(`${sel(cle, l)} .options-classeur`); await p.waitForTimeout(150) }
const entree = async (p, action) => { await p.click(`.menu-flottant:not([hidden]) [data-action="${action}"]`); await p.waitForTimeout(200) }
/** Un glisser à la souris, du centre de a au centre de b (ou à (x, y)), en n pas */
async function glisserSouris(p, de, vers, o = {}) {
  const a = typeof de === 'string' ? await p.locator(de).boundingBox() : de
  const b = typeof vers === 'string' ? await p.locator(vers).boundingBox() : vers
  const x0 = a.x + (o.dx ?? a.width / 2), y0 = a.y + (o.dy ?? Math.min(60, a.height / 2))
  const x1 = b.x + (b.width ?? 0) / 2, y1 = b.y + (b.height ?? 0) / 2
  await p.mouse.move(x0, y0); await p.mouse.down()
  const n = o.pas ?? 12
  for (let i = 1; i <= n; i++) { await p.mouse.move(x0 + (x1 - x0) * i / n, y0 + (y1 - y0) * i / n); await dort(16) }
  if (o.pendant) await o.pendant()
  if (o.echap) { await p.keyboard.press('Escape'); await dort(50) }
  await p.mouse.up()
  await p.waitForTimeout(o.attente ?? 500)
}
const ecrireTraits = (p, n, o = {}) => p.evaluate(async ({ n, o }) => {
  const t = window.__app.tableau
  const page = o.page ?? t.ordre.get(0)
  const trait = (x, y) => { const pts = []; for (let i = 0; i < 60; i++) pts.push(i * 6 + Math.random(), Math.sin(i / 3) * 30 + Math.random(), 0.5); return { id: 'T' + Math.random().toString(36).slice(2), type: 'trait', x, y, z: Date.now(), auteur: t.moi, pts, couleur: o.couleur ?? '#1b2230', taille: 4, opacite: 1, pression: false } }
  t.nouveauGeste()
  t.doc.transact(() => { for (let i = 0; i < n; i++) t.poser(page, trait((i % 20) * 40, Math.floor(i / 20) * 40)) })
  await t.attendreEcritures()
}, { n, o })
/** Attend qu'une fonction (asynchrone) de la page rende vrai ; rend sa dernière valeur */
async function attendreQue(p, f, arg, ms = 15000) {
  const fin = Date.now() + ms
  let v
  do { v = await p.evaluate(f, arg); if (v) return v; await dort(250) } while (Date.now() < fin)
  return v
}
const LONGUES = () => {
  window.__longues = []
  new PerformanceObserver(l => { for (const e of l.getEntries()) window.__longues.push({ debut: Math.round(e.startTime), duree: Math.round(e.duration) }) }).observe({ type: 'longtask', buffered: false })
}

// =====================================================================
// A. « DÉPLACER VERS… »
// =====================================================================
if (seul('A')) {
  console.log('\n=== A. « Déplacer vers… » : la fenêtre, le clavier, le message ===')
  const ctx = await contexte()
  const p = await ouvrir(ctx, '', 'A')
  const d5b = await creerDossier(p, '5e B', { etiquette: '5e B', couleur: '#2f8a57' })
  const dgeo = await creerDossier(p, 'Géométrie', { parent: d5b, couleur: '#c24a4a' })
  const dsym = await creerDossier(p, 'Symétries', { parent: dgeo })
  const d23 = await creerDossier(p, '2nde 3', { etiquette: '2nde 3' })
  const [sym, fra] = await creerPlusieurs(p, 2, { noms: ['Symétrie', 'Fractions'], dossier: d23, etiquettes: [] })
  await p.evaluate(id => window.__registre.modifierClasseur(id, x => { x.etiquettes = ['Soutien'] }), fra)
  await ouvrirBiblio(p)
  await p.evaluate(id => window.__bibliotheque.allerA(id), d23)
  await p.waitForTimeout(200)
  await menuCarte(p, sym)
  let v = await vue(p)
  ok(v.menu?.entrees.includes('deplacer') && v.menu.entrees.includes('dupliquer'), 'A1) Le menu d\'un classeur : « Déplacer vers… » et « Dupliquer le classeur »', v.menu)
  ok(v.menu?.libelles.some(l => l.startsWith('Déplacer vers…')), '   … libellé « Déplacer vers… »', v.menu?.libelles)
  await entree(p, 'deplacer')
  let f = await fenetre(p)
  ok(f?.titre === 'Déplacer « Symétrie » vers…', 'A2) La fenêtre « Déplacer « Symétrie » vers… »', f?.titre)
  ok(f && f.lignes.map(l => l.texte).join(' | ') === 'Bibliothèque (la racine) | 2nde 3(ici) | 5e B | Géométrie | Symétries', '   … l\'arbre : la racine d\'abord, puis chaque dossier et ses sous-dossiers', f?.lignes.map(l => l.texte))
  ok(f && JSON.stringify(f.lignes.map(l => l.retrait)) === JSON.stringify(['0px', '20px', '20px', '40px', '60px']), '   … en retrait', f?.lignes.map(l => l.retrait))
  ok(f && f.lignes[2].couleur === '#2f8a57' && f.lignes[3].couleur === '#c24a4a', '   … chacun dans sa couleur', f?.lignes.map(l => l.couleur))
  ok(f && f.lignes[1].gris && !f.lignes[0].gris && !f.lignes[2].gris, '   … là où il est déjà : grisé, « (ici) »', f?.lignes)
  ok(f && f.lignes.every(l => l.h >= 44), '   … des lignes de 44 px au moins', f?.lignes.map(l => l.h))
  ok(f?.focus === '' && f.lignes.filter(l => l.tab === 0).length === 1, '   … le focus sur la première destination possible (la racine), un seul arrêt de Tab', f && { focus: f.focus, tabs: f.lignes.map(l => l.tab) })
  ok(f?.lignes[4].label === '5e B › Géométrie › Symétries', '   … le lecteur d\'écran lit le chemin', f?.lignes[4].label)
  // Le clavier : ↓ saute le grisé, Fin, Début, ↑
  await p.keyboard.press('ArrowDown'); f = await fenetre(p)
  ok(f.focus === d5b, 'A3) ↓ : « 5e B » (« 2nde 3 », grisé, est sauté)', f.focus)
  await p.keyboard.press('End'); f = await fenetre(p)
  ok(f.focus === dsym, '   … Fin : le dernier', f.focus)
  await p.keyboard.press('Home'); f = await fenetre(p)
  ok(f.focus === '', '   … Début : la racine', f.focus)
  await p.keyboard.press('Tab'); f = await fenetre(p)
  ok(f.focus === 'annuler', '   … Tab : « Annuler »', f.focus)
  await p.keyboard.press('Shift+Tab'); await p.keyboard.press('Escape'); await p.waitForTimeout(200)
  f = await fenetre(p); v = await vue(p)
  ok(!f && v.focus === sym && (await fiche(p, sym)).dossier === d23, '   … Échap : fermée, rien n\'a bougé, le focus revient à la carte', { f, focus: v.focus })
  // Déplacer dans « Géométrie » (sous « 5e B », dossier de niveau) au clavier
  await p.keyboard.press('Shift+F10'); await p.waitForTimeout(150)
  await entree(p, 'deplacer')
  await p.keyboard.press('ArrowDown'); await p.keyboard.press('ArrowDown')
  f = await fenetre(p)
  ok(f.focus === dgeo, '   (le focus sur « Géométrie »)', f.focus)
  await toasts(p)
  await p.keyboard.press('Enter'); await p.waitForTimeout(500)
  let fs = await fiche(p, sym)
  const t1 = (await toasts(p)).join('|')
  ok(fs.dossier === dgeo, 'A4) Entrée : « Symétrie » est dans « Géométrie » (modifierClasseur)', fs.dossier)
  ok(t1.includes('« Symétrie » déplacé dans « Géométrie » : il porte maintenant l\'étiquette « 5e B » (et plus « 2nde 3 »)') && t1.includes('Aller à « Géométrie »') && t1.includes('Annuler'),
    '   … le message dit l\'étiquette qui change, avec « Aller à « Géométrie » » et « Annuler »', t1)
  v = await vue(p)
  ok(!v.grille.some(c => c.cle === sym) && v.focus === fra, '   … sa carte quitte « 2nde 3 », le focus va à sa voisine', { grille: v.grille.map(c => c.nom), focus: v.focus })
  ok(JSON.stringify(fs.etiquettes) === '[]', '   … aucune étiquette écrite (l\'héritée est calculée)', fs.etiquettes)
  // « Aller à « Géométrie » »
  await p.click('.toast button.action:has-text("Aller à")'); await p.waitForTimeout(300)
  v = await vue(p)
  ok(v.fil.join(' › ') === 'Bibliothèque › 5e B › Géométrie*' && v.focus === sym, '   … « Aller à » : dans « Géométrie », le focus sur « Symétrie »', { fil: v.fil, focus: v.focus })
  ok(v.grille.find(c => c.cle === sym)?.puces.join() === '~5e B', '   … sa puce : « 5e B », héritée', v.grille.find(c => c.cle === sym)?.puces)
  // Annuler : il revient
  await p.evaluate(({ id, d }) => window.__bibliotheque.deplacerVers(id, d), { id: sym, d: d5b })
  await p.waitForTimeout(300)
  await toasts(p)
  await p.click('.toast button.action:has-text("Annuler")'); await p.waitForTimeout(500)
  fs = await fiche(p, sym)
  const t2 = (await toasts(p)).join('|')
  ok(fs.dossier === dgeo && t2.includes('« Symétrie » est revenu dans « Géométrie »'), 'A5) « Annuler » : il revient où il était, et le message le dit', { d: fs.dossier, t2 })
  // Un classeur avec une étiquette propre : elle reste
  await p.evaluate(({ id, d }) => window.__bibliotheque.deplacerVers(id, d), { id: fra, d: d5b }); await p.waitForTimeout(300)
  const ff = await fiche(p, fra)
  const t3 = (await toasts(p)).join('|')
  ok(ff.dossier === d5b && JSON.stringify(ff.etiquettes) === '["Soutien"]', 'A6) Déplacer ne touche pas aux étiquettes propres (« Soutien » reste)', ff)
  ok(t3.includes('« Fractions » déplacé dans « 5e B » : il porte maintenant l\'étiquette « 5e B » (et plus « 2nde 3 »)'), '   … le message', t3)
  // Le menu d'un dossier : « Déplacer vers… », lui-même et ses descendants grisés
  await p.evaluate(() => window.__bibliotheque.allerA(null)); await p.waitForTimeout(200)
  await menuCarte(p, 'd:' + d5b)
  v = await vue(p)
  ok(v.menu?.entrees.includes('deplacer-dossier'), 'A7) Le menu d\'un dossier : « Déplacer vers… »', v.menu?.entrees)
  await entree(p, 'deplacer-dossier')
  f = await fenetre(p)
  ok(f?.titre === 'Déplacer le dossier « 5e B » vers…', '   … « Déplacer le dossier « 5e B » vers… »', f?.titre)
  const etats = f ? Object.fromEntries(f.lignes.map(l => [l.texte, l.gris])) : {}
  ok(f && etats['Bibliothèque (la racine)(ici)'] === true && etats['5e B'] === true && etats['Géométrie'] === true && etats['Symétries'] === true && etats['2nde 3'] === false,
    '   … la racine (ici), lui-même et ses descendants : grisés ; « 2nde 3 » possible', etats)
  await p.keyboard.press('Enter'); await p.waitForTimeout(500)
  const d5 = await dossierLu(p, d5b)
  const t4 = (await toasts(p)).join('|')
  ok(d5.parent === d23 && t4.includes('Dossier « 5e B » déplacé dans « 2nde 3 »'), 'A8) Le dossier « 5e B » va dans « 2nde 3 » (deplacerDossier)', { parent: d5.parent, t4 })
  ok(!t4.includes('ses classeurs portent maintenant'), '   … un dossier de niveau garde son étiquette : le message n\'en dit rien', t4)
  // « Géométrie » à la racine : ses classeurs perdent « 5e B »
  await p.evaluate(({ id }) => window.__bibliotheque.deplacerVers('d:' + id, null), { id: dgeo }); await p.waitForTimeout(400)
  const t5 = (await toasts(p)).join('|')
  ok((await dossierLu(p, dgeo)).parent === null && t5.includes('Dossier « Géométrie » déplacé à la racine de la bibliothèque : ses classeurs ne portent plus l\'étiquette « 5e B »'), '   … « Géométrie » à la racine : « ses classeurs ne portent plus l\'étiquette « 5e B » »', t5)
  // Un dossier dans son propre sous-dossier : refusé (le registre, même si la fenêtre est passée)
  await p.evaluate(({ a, b }) => window.__bibliotheque.deplacerVers('d:' + a, b), { a: dgeo, b: dsym }); await p.waitForTimeout(400)
  const t6 = (await toasts(p)).join('|')
  ok((await dossierLu(p, dgeo)).parent === null && t6.includes('Ce dossier ne peut pas aller dans l\'un de ses propres sous-dossiers.'), 'A9) Un dossier vers son sous-dossier : « Ce dossier ne peut pas aller dans l\'un de ses propres sous-dossiers. », rien ne bouge', t6)
  // Une cible partie entre-temps (supprimée ailleurs) : « Ce dossier n'existe plus. »
  const parti = await creerDossier(p, 'Parti')
  await recharger(p)
  await p.evaluate(id => window.__registre.supprimerDossier(id), parti)
  await p.evaluate(({ id, d }) => window.__bibliotheque.deplacerVers(id, d), { id: fra, d: parti }); await p.waitForTimeout(400)
  const t7 = (await toasts(p)).join('|')
  ok((await fiche(p, fra)).dossier === d5b && t7.includes('Ce dossier n\'existe plus.'), 'A10) La cible partie entre-temps : « Ce dossier n\'existe plus. », rien ne bouge', t7)
  await p.screenshot({ path: CAPTURES + 'A-fenetre.png' })
  // La capture de la fenêtre
  await menuCarte(p, 'd:' + dgeo); await entree(p, 'deplacer-dossier'); await p.waitForTimeout(150)
  await p.screenshot({ path: CAPTURES + 'A-fenetre-dossier.png' })
  await p.keyboard.press('Escape')
  await ctx.close()
}

// =====================================================================
// B. GLISSER À LA SOURIS
// =====================================================================
if (seul('B')) {
  console.log('\n=== B. glisser à la souris ===')
  const ctx = await contexte()
  const p = await ouvrir(ctx, '', 'B')
  const ici = await p.evaluate(() => window.__app.classeur.id)
  const d5b = await creerDossier(p, '5e B', { etiquette: '5e B' })
  const dgeo = await creerDossier(p, 'Géométrie', { parent: d5b })
  const d23 = await creerDossier(p, '2nde 3', { etiquette: '2nde 3' })
  const [a1, a2, a3] = await creerPlusieurs(p, 3, { noms: ['Aires', 'Bissectrices', 'Cercles'] })
  await ouvrirBiblio(p)
  // Un glisser de 3 px : rien (le seuil de la souris est 4 px)
  const ba = await p.locator(sel(a1)).boundingBox()
  await p.mouse.move(ba.x + 80, ba.y + 50); await p.mouse.down(); await p.mouse.move(ba.x + 83, ba.y + 50)
  let v = await vue(p)
  ok(!v.fantome, 'B1) 3 px à la souris : pas de glisser', v.fantome)
  await p.mouse.move(ba.x + 85, ba.y + 50)
  v = await vue(p)
  ok(v.fantome && v.enGlisser && v.grille.find(c => c.cle === a1)?.tiree, '   … 5 px : la carte s\'estompe, son image suit le pointeur', { f: v.fantome, t: v.grille.find(c => c.cle === a1)?.tiree })
  ok(v.grille.filter(c => c.possible).map(c => c.cle).sort().join() === ['d:' + d5b, 'd:' + d23].sort().join(), '   … les cartes des dossiers s\'éclairent', v.grille.filter(c => c.possible).map(c => c.nom))
  ok(!v.fil.some(x => x.includes('+')), '   … pas « Bibliothèque » : il y est déjà', v.fil)
  // L'image suit, la cible sous le pointeur s'éclaire davantage
  const b5 = await p.locator(sel('d:' + d5b)).boundingBox()
  for (let i = 1; i <= 10; i++) { await p.mouse.move(ba.x + 85 + (b5.x + b5.width / 2 - ba.x - 85) * i / 10, ba.y + 50 + (b5.y + b5.height / 2 - ba.y - 50) * i / 10); await dort(16) }
  v = await vue(p)
  const fr = await p.evaluate(() => { const r = document.querySelector('.biblio-fantome').getBoundingClientRect(); return { x: r.left, y: r.top } })
  ok(v.grille.find(c => c.cle === 'd:' + d5b)?.sous, '   … sur « 5e B » : elle s\'éclaire davantage', v.grille.map(c => [c.nom, c.sous]))
  ok(Math.abs(fr.x - (b5.x + b5.width / 2 - 80 * 0.55)) < 30, '   … l\'image suit le pointeur (réduite, tenue où on l\'a prise)', { fr, b5 })
  await p.screenshot({ path: CAPTURES + 'B-glisser.png' })
  await toasts(p)
  await p.mouse.up(); await p.waitForTimeout(500)
  v = await vue(p)
  let t = (await toasts(p)).join('|')
  ok((await fiche(p, a1)).dossier === d5b && v.url === '?classeur=' + ici && v.ouvert, 'B2) Lâché sur « 5e B » : « Aires » y est ; rien ne s\'est ouvert (le clic qui suit est avalé)', { d: (await fiche(p, a1)).dossier, url: v.url })
  ok(t.includes('« Aires » déplacé dans « 5e B » : il porte maintenant l\'étiquette « 5e B »') && t.includes('Annuler'), '   … le même message que « Déplacer vers… »', t)
  ok(!v.fantome && !v.enGlisser && !v.grille.some(c => c.possible || c.sous || c.tiree), '   … l\'image et les éclairages s\'en vont', v)
  // Hors d'une cible : rien
  await glisserSouris(p, sel(a2), { x: 900, y: 700 })
  v = await vue(p)
  ok((await fiche(p, a2)).dossier === null && v.url === '?classeur=' + ici && !v.fantome, 'B3) Lâché hors d\'une cible : rien ne bouge, rien ne s\'ouvre', { d: (await fiche(p, a2)).dossier, url: v.url })
  // Échap : rien, et le lever qui suit n'ouvre rien
  await glisserSouris(p, sel(a2), sel('d:' + d23), { echap: true })
  v = await vue(p)
  ok((await fiche(p, a2)).dossier === null && v.url === '?classeur=' + ici && !v.fantome && v.ouvert, 'B4) Échap pendant le glisser : rien ne bouge ; le lever n\'ouvre rien ; la bibliothèque reste', { d: (await fiche(p, a2)).dossier, ouvert: v.ouvert })
  // Sur la carte de « 5e B », puis sur le fil d'Ariane : remonter
  await p.evaluate(id => window.__bibliotheque.allerA(id), d5b); await p.waitForTimeout(200)
  await glisserSouris(p, sel(a1), sel('d:' + dgeo))
  ok((await fiche(p, a1)).dossier === dgeo, 'B5) Dans « 5e B » : « Aires » glissé sur « Géométrie »', (await fiche(p, a1)).dossier)
  await p.evaluate(id => window.__bibliotheque.allerA(id), dgeo); await p.waitForTimeout(200)
  // Pendant le glisser : le fil d'Ariane s'éclaire (Bibliothèque, 5e B), pas « Géométrie » (il y est)
  let pendant = null
  await glisserSouris(p, sel(a1), '.biblio-fil button[data-dossier=""]', { pendant: async () => { pendant = await vue(p) } })
  ok(pendant?.fil.join(' › ') === 'Bibliothèque+! › 5e B+ › Géométrie*', '   … pendant le glisser : « Bibliothèque » et « 5e B » s\'éclairent, pas « Géométrie » (son dossier)', pendant?.fil)
  ok((await fiche(p, a1)).dossier === null, 'B6) Lâché sur « Bibliothèque » (le fil d\'Ariane) : à la racine', (await fiche(p, a1)).dossier)
  t = (await toasts(p)).join('|')
  ok(t.includes('« Aires » déplacé à la racine de la bibliothèque : il ne porte plus l\'étiquette « 5e B »'), '   … « déplacé à la racine de la bibliothèque : il ne porte plus l\'étiquette « 5e B » »', t)
  // Sur son propre dossier : pas une cible ; rien ne bouge
  await p.evaluate(({ id, d }) => window.__registre.modifierClasseur(id, x => { x.dossier = d }), { id: a3, d: dgeo })
  await recharger(p)
  await glisserSouris(p, sel(a3), '.biblio-fil .fil-ici', { pendant: async () => { pendant = await vue(p) } })
  ok((await fiche(p, a3)).dossier === dgeo && !pendant.fil.some(x => x.includes('!')), 'B7) Une carte lâchée sur son propre dossier (« Géométrie », le fil) : pas une cible, rien ne bouge', { fil: pendant.fil, d: (await fiche(p, a3)).dossier })
  // Un dossier sur son propre sous-dossier : pas une cible
  await p.evaluate(() => window.__bibliotheque.allerA(null)); await p.waitForTimeout(200)
  const sous = await creerDossier(p, 'Sous-dossier', { parent: d5b })
  await recharger(p)
  await p.evaluate(id => window.__bibliotheque.allerA(id), d5b); await p.waitForTimeout(200)
  await glisserSouris(p, sel('d:' + sous), sel('d:' + dgeo), { pendant: async () => { pendant = await vue(p) } })
  ok((await dossierLu(p, sous)).parent === dgeo, 'B8) Un dossier glissé sur un autre dossier : il y va', (await dossierLu(p, sous)).parent)
  await p.evaluate(() => window.__bibliotheque.allerA(null)); await p.waitForTimeout(200)
  await glisserSouris(p, sel('d:' + d5b), { x: 600, y: 400 }, { pendant: async () => { pendant = await vue(p) } })
  ok(!pendant.grille.find(c => c.cle === 'd:' + d5b)?.possible && pendant.grille.find(c => c.cle === 'd:' + d23)?.possible, '   … un dossier qu\'on tire : jamais lui-même ; un autre dossier, oui', pendant.grille.map(c => [c.nom, c.possible]))
  // Ses descendants ne sont pas des cibles : on les rend visibles à la racine pour l'essai (dans « 5e B », ils sont sous lui)
  await p.evaluate(id => window.__bibliotheque.allerA(id), d5b); await p.waitForTimeout(200)
  await glisserSouris(p, sel('d:' + dgeo), { x: 30, y: 600 }, { pendant: async () => { pendant = await vue(p) } })
  ok(pendant.fil.join(' › ') === 'Bibliothèque+ › 5e B*', '   … « Géométrie » tirée dans « 5e B » : « Bibliothèque » s\'éclaire, pas « 5e B » (où elle est)', pendant.fil)
  // Le défilement près du bord : 30 classeurs dans « 2nde 3 »
  await p.evaluate(() => window.__bibliotheque.allerA(null)); await p.waitForTimeout(200)
  await creerPlusieurs(p, 30, { prefixe: 'Leçon' })
  await recharger(p)
  const avant = (await vue(p)).scroll
  const bb = await p.locator('.grille-classeurs.tous li.case-classeur').first().boundingBox()
  await p.mouse.move(bb.x + 60, bb.y + 60); await p.mouse.down()
  for (let i = 1; i <= 12; i++) { await p.mouse.move(bb.x + 60, bb.y + 60 + (760 - bb.y - 60) * i / 12); await dort(16) }
  await p.waitForTimeout(700)
  const apres = (await vue(p)).scroll
  await p.keyboard.press('Escape'); await p.mouse.up(); await p.waitForTimeout(300)
  ok(apres > avant + 100, `B9) Près du bord bas, la grille défile seule (${avant} → ${apres})`, { avant, apres })
  // Un clic simple ouvre toujours
  await p.evaluate(() => { document.querySelector('.biblio-corps').scrollTop = 0 }); await p.waitForTimeout(100)
  await Promise.all([p.waitForNavigation({ timeout: 20000 }), p.click(sel(a2) + ' .carte-apercu')])
  await pret(p)
  ok(await p.evaluate(() => window.__app.classeur.nom) === 'Bissectrices', 'B10) Un clic simple (sans glisser) ouvre toujours le classeur')
  await ctx.close()
}

// =====================================================================
// C. LA TABLETTE GRAPHIQUE (WACOM SANS ÉCRAN)
// =====================================================================
if (seul('C')) {
  console.log('\n=== C. la tablette graphique (pointerType pen, maxTouchPoints 0) ===')
  const ctx = await contexte()
  const p = await ouvrir(ctx, '', 'C')
  const ici = await p.evaluate(() => window.__app.classeur.id)
  const d5b = await creerDossier(p, '5e B', { etiquette: '5e B' })
  const [c1, c2] = await creerPlusieurs(p, 2, { noms: ['Pythagore', 'Thalès'] })
  await ouvrirBiblio(p)
  const cdp = await ctx.newCDPSession(p)
  const stylo = (type, x, y, o = {}) => cdp.send('Input.dispatchMouseEvent', { type, x, y, pointerType: 'pen', button: o.button ?? 'left', buttons: o.buttons ?? (type === 'mouseReleased' ? 0 : (o.button === 'right' ? 2 : 1)), clickCount: 1, force: 0.5 })
  let v = await vue(p)
  const tactile = await p.evaluate(() => ({ n: navigator.maxTouchPoints, ta: getComputedStyle(document.querySelector('.carte-classeur')).touchAction, poignee: getComputedStyle(document.querySelector('.biblio-poignee')).display }))
  ok(tactile.n === 0 && v.sansTactile && tactile.ta === 'none' && tactile.poignee === 'none', 'C1) maxTouchPoints 0 : .sans-tactile, touch-action: none, pas de poignée', tactile)
  // 5 px au stylet : pas encore ; 7 px : le glisser
  const a = await p.locator(sel(c1)).boundingBox()
  const x0 = a.x + 80, y0 = a.y + 50
  await stylo('mousePressed', x0, y0)
  await stylo('mouseMoved', x0 + 5, y0, { buttons: 1 })
  v = await vue(p)
  ok(!v.fantome, 'C2) 5 px au stylet : pas de glisser (seuil 6 px)', v.fantome)
  await stylo('mouseMoved', x0 + 7, y0, { buttons: 1 })
  v = await vue(p)
  ok(v.fantome, '   … 7 px : la carte part, sans appui long', v.fantome)
  const b = await p.locator(sel('d:' + d5b)).boundingBox()
  for (let i = 1; i <= 10; i++) { await stylo('mouseMoved', x0 + 7 + (b.x + b.width / 2 - x0 - 7) * i / 10, y0 + (b.y + b.height / 2 - y0) * i / 10, { buttons: 1 }); await dort(16) }
  await stylo('mouseReleased', b.x + b.width / 2, b.y + b.height / 2)
  await p.waitForTimeout(500)
  v = await vue(p)
  ok((await fiche(p, c1)).dossier === d5b && v.url === '?classeur=' + ici && v.ouvert, 'C3) Lâché au stylet sur « 5e B » : déplacé, rien ne s\'ouvre', { d: (await fiche(p, c1)).dossier, url: v.url })
  // Le bouton latéral (clic droit) : le menu, rien ne part
  const a2 = await p.locator(sel(c2)).boundingBox()
  await stylo('mousePressed', a2.x + 80, a2.y + 50, { button: 'right' })
  for (let i = 1; i <= 6; i++) await stylo('mouseMoved', a2.x + 80 + i * 10, a2.y + 50, { button: 'right', buttons: 2 })
  v = await vue(p)
  ok(v.menu?.label === 'Thalès' && !v.fantome, 'C4) Le bouton latéral : le menu de la carte, à l\'appui ; glisser avec lui ne tire rien', { menu: v.menu?.label, fantome: v.fantome })
  await stylo('mouseReleased', a2.x + 140, a2.y + 50, { button: 'right' })
  await p.keyboard.press('Escape'); await p.waitForTimeout(150)
  // Les événements synthétiques de C5 : un glisser n'ouvre rien, un toucher ouvre
  const synth = (id, type) => p.evaluate(({ s, type }) => {
    const el = document.querySelector(s), r = el.getBoundingClientRect()
    const x = r.left + 50, y = r.top + 40
    const ev = (t, dx = 0, dy = 0) => new PointerEvent(t, { bubbles: true, cancelable: true, composed: true, pointerId: 7, pointerType: 'pen', isPrimary: true, button: t === 'pointermove' ? -1 : 0, buttons: t === 'pointerup' ? 0 : 1, clientX: x + dx, clientY: y + dy, pressure: 0.5 })
    el.dispatchEvent(ev('pointerdown'))
    if (type === 'glisser') for (let i = 1; i <= 6; i++) el.dispatchEvent(ev('pointermove', i * 6, i * 2))
    el.dispatchEvent(ev('pointerup', type === 'glisser' ? 36 : 0, type === 'glisser' ? 12 : 0))
    el.dispatchEvent(new MouseEvent('click', { bubbles: true, cancelable: true, detail: 1, clientX: x, clientY: y, button: 0 }))
  }, { s: sel(id) + ' .carte-classeur', type })
  await synth(c2, 'glisser'); await p.waitForTimeout(600)
  v = await vue(p)
  ok(v.url === '?classeur=' + ici && v.ouvert && !v.fantome && (await fiche(p, c2)).dossier === null, 'C5) Un glisser synthétique de la plume (l\'essai de C5) : rien ne s\'ouvre, rien ne bouge', v.url)
  await Promise.all([p.waitForNavigation({ timeout: 20000 }), synth(c2, 'toucher')])
  await pret(p)
  ok(await p.evaluate(() => window.__app.classeur.nom) === 'Thalès', '   … un toucher de la plume : « Thalès » s\'ouvre')
  await ctx.close()
}

// =====================================================================
// D. LE DOIGT (TÉLÉPHONE)
// =====================================================================
if (seul('D')) {
  console.log('\n=== D. le doigt (390 × 844) ===')
  const ctx = await contexte({ viewport: { width: 390, height: 844 }, hasTouch: true, isMobile: true })
  const p = await ouvrir(ctx, '', 'D')
  // (Adapté au lot 4, morceau C10 : la copie sur le Drive, voulue par défaut en ligne, allonge la ligne du
  // classeur ouvert (trois lignes à 390 px, « Drive en attente de la connexion Google » et son bouton) ; la
  // grille descend, et le doigt de ces essais partirait dans la zone où elle défile seule pendant un
  // glisser. Ils la mettent de côté (« Pas de copie pour ce classeur ») : la mise en page d'avant)
  await p.evaluate(() => window.__drive?.choisir('aucune'))
  const ici = await p.evaluate(() => window.__app.classeur.id)
  const d5b = await creerDossier(p, '5e B', { etiquette: '5e B' })
  const ids = await creerPlusieurs(p, 10, { prefixe: 'Leçon', jamais: true })
  await p.evaluate(() => window.__registre.ecrireReglage('conseil', 'vu'))
  await ouvrirBiblio(p)
  const cdp = await ctx.newCDPSession(p)
  const toucher = (type, pts) => cdp.send('Input.dispatchTouchEvent', { type, touchPoints: pts.map((q, i) => ({ x: q.x, y: q.y, id: q.id ?? i })) })
  const doigt = async (x0, y0, x1, y1, o = {}) => {
    await toucher('touchStart', [{ x: x0, y: y0 }])
    if (o.tenir) await dort(o.tenir)
    const n = o.pas ?? 12
    for (let i = 1; i <= n; i++) { await toucher('touchMove', [{ x: x0 + (x1 - x0) * i / n, y: y0 + (y1 - y0) * i / n }]); await dort(o.lent ?? 16) }
    if (o.puisTenir) { await dort(o.puisTenir) }
    if (o.pendant) await o.pendant()
    await toucher('touchEnd', [])
    await p.waitForTimeout(500)
  }
  let v = await vue(p)
  const t0 = await p.evaluate(() => ({ n: navigator.maxTouchPoints, ta: getComputedStyle(document.querySelector('.grille-classeurs.tous .carte-classeur')).touchAction, poignee: getComputedStyle(document.querySelector('.biblio-poignee')).display }))
  ok(t0.n > 0 && !v.sansTactile && t0.ta === 'pan-y' && t0.poignee !== 'none', 'D1) Un écran tactile : touch-action pan-y, la poignée ⋮⋮ est là', t0)
  // L'appui long, puis glisser sur « 5e B »
  const dossier = await p.locator(sel('d:' + d5b)).boundingBox()
  // Vers le haut de la carte : le champ « Rechercher » a sa rangée au
  // téléphone, la carte est plus bas, et le message du Drive en couvre le milieu
  const cible = { x: dossier.x + dossier.width / 2, y: dossier.y + 50 }
  const premiere = await p.locator(sel(ids[9])).boundingBox()
  let pendant = null
  await p.evaluate(() => { window.__vibre = 0; navigator.vibrate = () => { window.__vibre++; return true } })
  await doigt(premiere.x + 100, premiere.y + 40, cible.x, cible.y, { tenir: 650, pendant: async () => { pendant = await vue(p) } })
  v = await vue(p)
  ok(pendant?.fantome && pendant.grille.find(c => c.cle === 'd:' + d5b)?.sous, 'D2) Un appui long (650 ms) puis glisser : la carte suit le doigt, « 5e B » s\'éclaire', pendant && { f: pendant.fantome, g: pendant.grille.map(c => [c.nom, c.sous]) })
  ok((await fiche(p, ids[9])).dossier === d5b && v.url === '?classeur=' + ici && v.ouvert, '   … lâché : « Leçon 10 » est dans « 5e B », rien ne s\'ouvre', { d: (await fiche(p, ids[9])).dossier, url: v.url })
  ok(await p.evaluate(() => window.__vibre) >= 1, '   … une petite vibration à l\'appui long', await p.evaluate(() => window.__vibre))
  // La poignée : sans appui long (le message du déplacement d'avant, avec
  // « Annuler », couvre le bas de l'écran : on l'écarte le temps du geste)
  await recharger(p)
  await p.evaluate(() => { document.querySelector('.biblio-corps').scrollTop = 200 }); await p.waitForTimeout(150)
  const poignee = await p.locator(sel(ids[8]) + ' .biblio-poignee').boundingBox()
  const d2 = await p.locator(sel('d:' + d5b)).boundingBox()
  await p.evaluate(() => document.querySelectorAll('.toast').forEach(t => { t.style.display = 'none' }))
  await doigt(poignee.x + 22, poignee.y + 22, d2.x + d2.width / 2, d2.y + d2.height / 2)
  await p.evaluate(() => document.querySelectorAll('.toast').forEach(t => { t.style.display = '' }))
  ok((await fiche(p, ids[8])).dossier === d5b, 'D3) Par la poignée ⋮⋮ : sans appui long, « Leçon 9 » va dans « 5e B »', (await fiche(p, ids[8])).dossier)
  // Un glisser qui commence comme un défilement (avant l'appui long) : la grille défile, rien ne bouge
  await recharger(p)
  await p.evaluate(() => { document.querySelector('.biblio-corps').scrollTop = 0 })
  const c7 = await p.locator(sel(ids[5])).boundingBox()
  const s0 = (await vue(p)).scroll
  await doigt(c7.x + 100, Math.min(c7.y + 40, 780), c7.x + 100, Math.min(c7.y + 40, 780) - 300, { puisTenir: 700 })
  v = await vue(p)
  ok(v.scroll > s0 + 50 && (await fiche(p, ids[5])).dossier === null && !v.fantome && v.url === '?classeur=' + ici, `D4) Un glisser qui commence comme un défilement, puis tenu : la grille défile (${s0} → ${v.scroll}), rien ne part, rien ne s'ouvre`, v)
  // Deux doigts : la grille défile, rien ne s'ouvre
  await p.evaluate(() => { document.querySelector('.biblio-corps').scrollTop = 0 }); await p.waitForTimeout(100)
  const c5 = await p.locator(sel(ids[4])).boundingBox()
  const y = Math.min(c5.y + 40, 760)
  await toucher('touchStart', [{ x: 100, y, id: 1 }])
  await toucher('touchStart', [{ x: 100, y, id: 1 }, { x: 260, y, id: 2 }])
  for (let i = 1; i <= 10; i++) { await toucher('touchMove', [{ x: 100, y: y - i * 25, id: 1 }, { x: 260, y: y - i * 25, id: 2 }]); await dort(16) }
  await toucher('touchEnd', [])
  await p.waitForTimeout(600)
  v = await vue(p)
  ok(v.scroll > 100 && v.url === '?classeur=' + ici && v.ouvert && !v.fantome, `D5) Deux doigts : la grille défile (${v.scroll} px), rien ne s'ouvre`, v)
  // Deux doigts qui se posent et se lèvent sans bouger : rien ne s'ouvre
  await toucher('touchStart', [{ x: 100, y: 300, id: 1 }])
  await toucher('touchStart', [{ x: 100, y: 300, id: 1 }, { x: 260, y: 300, id: 2 }])
  await toucher('touchEnd', [])
  await p.waitForTimeout(600)
  v = await vue(p)
  ok(v.url === '?classeur=' + ici && v.ouvert, '   … deux doigts posés et levés : rien ne s\'ouvre', v.url)
  // « Déplacer vers… » au téléphone : toute la largeur, la liste défile
  for (let i = 0; i < 14; i++) await creerDossier(p, `Dossier ${String(i + 1).padStart(2, '0')}`)
  await recharger(p)
  await p.evaluate(() => { document.querySelector('.biblio-corps').scrollTop = 0 })
  await p.tap(sel(ids[0]) + ' .options-classeur'); await p.waitForTimeout(200)
  await p.tap('.menu-flottant:not([hidden]) [data-action="deplacer"]'); await p.waitForTimeout(250)
  const f = await fenetre(p)
  ok(f && f.r.l <= 10 && f.r.r >= f.vue.l - 10 && f.defile && f.lignes.every(l => l.h >= 44), 'D6) « Déplacer vers… » au téléphone : toute la largeur, des lignes de 44 px, la liste défile', f && { r: f.r, vue: f.vue, defile: f.defile })
  await p.screenshot({ path: CAPTURES + 'D-telephone-fenetre.png' })
  await p.tap(`dialog.dialogue-deplacer [data-dossier="${d5b}"]`); await p.waitForTimeout(500)
  ok((await fiche(p, ids[0])).dossier === d5b, '   … un toucher sur « 5e B » : déplacé', (await fiche(p, ids[0])).dossier)
  v = await vue(p)
  ok(v.largeur <= v.vue, 'D7) Pas de défilement de côté', { largeur: v.largeur, vue: v.vue })
  await p.screenshot({ path: CAPTURES + 'D-telephone.png' })
  await ctx.close()
}

// =====================================================================
// E. LE TNI : UNE PAUME PENDANT UN GLISSER À LA SOURIS
// =====================================================================
if (seul('E')) {
  console.log('\n=== E. le TNI (1920 × 1080, tactile) : une paume pendant un glisser à la souris ===')
  const ctx = await contexte({ viewport: { width: 1920, height: 1080 }, hasTouch: true })
  const p = await ouvrir(ctx, '', 'E')
  const d5b = await creerDossier(p, '5e B', { etiquette: '5e B' })
  const [e1] = await creerPlusieurs(p, 3, { prefixe: 'Vecteurs' })
  await ouvrirBiblio(p)
  const cdp = await ctx.newCDPSession(p)
  const a = await p.locator(sel(e1)).boundingBox(), b = await p.locator(sel('d:' + d5b)).boundingBox()
  await p.mouse.move(a.x + 80, a.y + 60); await p.mouse.down()
  for (let i = 1; i <= 6; i++) { await p.mouse.move(a.x + 80 + i * 20, a.y + 60); await dort(16) }
  // La paume se pose sur une autre carte, bouge, se lève
  await cdp.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [{ x: 1500, y: 700, id: 9, radiusX: 40, radiusY: 40 }] })
  for (let i = 1; i <= 5; i++) { await cdp.send('Input.dispatchTouchEvent', { type: 'touchMove', touchPoints: [{ x: 1500, y: 700 - i * 30, id: 9, radiusX: 40, radiusY: 40 }] }); await dort(16) }
  const pendant = await vue(p)
  await cdp.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] })
  for (let i = 1; i <= 10; i++) { await p.mouse.move(a.x + 200 + (b.x + b.width / 2 - a.x - 200) * i / 10, a.y + 60 + (b.y + b.height / 2 - a.y - 60) * i / 10); await dort(16) }
  await p.mouse.up(); await p.waitForTimeout(500)
  const v = await vue(p)
  ok(pendant.fantome && (await fiche(p, e1)).dossier === d5b && v.ouvert, 'E1) Une paume posée pendant un glisser à la souris : le glisser continue, la carte arrive dans « 5e B »', { fantome: pendant.fantome, d: (await fiche(p, e1)).dossier })
  await p.screenshot({ path: CAPTURES + 'E-tni.png' })
  await ctx.close()
}

// =====================================================================
// F. DEUX ONGLETS : A DANS B ET B DANS A
// =====================================================================
if (seul('F')) {
  console.log('\n=== F. deux onglets : A dans B et B dans A en même temps ===')
  const ctx = await contexte()
  const p1 = await ouvrir(ctx, '', 'F1')
  const A = await creerDossier(p1, 'A'), B = await creerDossier(p1, 'B')
  const p2 = await ouvrir(ctx, '', 'F2')
  await ouvrirBiblio(p1); await ouvrirBiblio(p2)
  for (let essai = 0; essai < 5; essai++) {
    await p1.evaluate(({ A }) => window.__registre.deplacerDossier(A, null), { A })
    await p1.evaluate(({ B }) => window.__registre.deplacerDossier(B, null), { B })
    await recharger(p1); await recharger(p2)
    await toasts(p1); await toasts(p2)
    const [r1, r2] = await Promise.all([
      p1.evaluate(({ A, B }) => window.__bibliotheque.deplacerVers('d:' + A, B), { A, B }),
      p2.evaluate(({ A, B }) => window.__bibliotheque.deplacerVers('d:' + B, A), { A, B }),
    ])
    await p1.waitForTimeout(300)
    const [dA, dB] = [await dossierLu(p1, A), await dossierLu(p1, B)]
    const t = [...await toasts(p1), ...await toasts(p2)].join('|')
    const cycle = dA.parent === B && dB.parent === A
    // (le même message deux fois de suite ne se relit pas : seulement la première fois)
    ok(!cycle && (r1 !== r2) && (essai > 0 || t.includes('Ce dossier ne peut pas aller dans l\'un de ses propres sous-dossiers.')), `F${essai + 1}) Les deux à la fois : l'un passe, l'autre est refusé, aucun cycle (${r1 ? 'A dans B' : 'B dans A'})`, { r1, r2, A: dA.parent, B: dB.parent, t })
  }
  await ctx.close()
}

// =====================================================================
// G. DUPLIQUER
// =====================================================================
if (seul('G')) {
  console.log('\n=== G. Dupliquer le classeur ===')
  const ctx = await contexte()
  const p = await ouvrir(ctx, '', 'G')
  const d5b = await creerDossier(p, '5e B', { etiquette: '5e B' })
  const ici = await p.evaluate(() => window.__app.classeur)
  await p.evaluate(({ id, d }) => window.__registre.modifierClasseur(id, x => { x.dossier = d; x.etiquettes = ['Soutien'] }), { id: ici.id, d: d5b })
  // Du contenu : deux pages, des traits, un nom de page, des séances publiées
  await ecrireTraits(p, 40)
  await p.evaluate(async () => { const t = window.__app.tableau; const p2 = t.ajouterPage('seyes', 1); t.renommerPage(p2, 'Exercice 12 p. 84'); await t.attendreEcritures() })
  await ecrireTraits(p, 20, { page: await p.evaluate(() => window.__app.tableau.ordre.get(1)) })
  await p.evaluate(async () => {
    const t = window.__app.tableau, r = t.doc.getMap('publications')
    t.doc.transact(() => { r.set('mem:1791000000000', { titre: 'Séance du 9 octobre', id: 'drive-1', compte: 'mem' }); r.set('lfb:1791000500000', { titre: 'Séance du 10 octobre', id: 'drive-2', compte: 'lfb' }) })
    await t.attendreEcritures()
  })
  // Un point qui attend (un simple toucher au Stylo) : il est posé avant la copie
  const avant = await p.evaluate(async () => {
    const t = window.__app.tableau, ex = await import('/src/revoir/exporter.ts')
    return { pages: t.ordre.length, film: t.film.length, noms: t.ordre.toArray().map(x => t.nomDe(x)), formes: t.ordre.toArray().map(x => t.formesDe(x).size), seances: ex.seancesAPublier(t).map(s => `${s.debut}-${s.fin}-${s.gestes}`), pubs: [...t.doc.getMap('publications').keys()].sort() }
  })
  const vecteurAvant = await p.evaluate(async b => [...(await window.__ecrivain.vecteurDeLaBase(b)).vecteur], ici.base)
  await ouvrirBiblio(p)
  await toasts(p)
  await menuCarte(p, ici.id, 'recents')
  await entree(p, 'dupliquer')
  await p.waitForFunction(() => window.__toasts.some(t => t.includes('Classeur dupliqué')), null, { timeout: 30000 })
  const t = (await toasts(p)).join('|')
  ok(t.includes(`Classeur dupliqué : « ${ici.nom} (copie) ». Ses séances déjà publiées le restent depuis l'original : en publier une depuis la copie fait un nouveau lien.`) && t.includes('Ouvrir'),
    'G1) « Dupliquer le classeur » (le classeur ouvert) : le message, avec « Ouvrir »', t)
  const fiches = await p.evaluate(() => window.__registre.classeurs())
  const copie = fiches.find(f => f.nom === `${ici.nom} (copie)`)
  ok(copie && copie.dossier === d5b && JSON.stringify(copie.etiquettes) === '["Soutien"]' && copie.ouvert === 0 && copie.pages === 2 && !copie.cle && !copie.drive && !copie.recu && copie.creation === undefined && copie.base === 'mem-teachingtool-classeur-' + copie.id,
    '   … sa fiche : même dossier, mêmes étiquettes propres, jamais ouverte, 2 pages, ni clé ni Drive', copie)
  ok(Math.abs(copie.cree - Date.now()) < 60000 && copie.cree === copie.modifie, '   … créée maintenant', { cree: copie.cree, modifie: copie.modifie })
  const vecteurApres = await p.evaluate(async b => [...(await window.__ecrivain.vecteurDeLaBase(b)).vecteur], ici.base)
  ok(JSON.stringify(vecteurAvant) === JSON.stringify(vecteurApres), 'G2) La source a le même vecteur d\'état (elle n\'est que lue)')
  ok(await p.evaluate(() => window.__app.tableau.doc.getMap('publications').size) === 2, '   … et son registre des publications est intact (2)')
  await p.evaluate(id => window.__bibliotheque.allerA(id), d5b); await p.waitForTimeout(200)
  const v = await vue(p)
  ok(v.grille.some(c => c.cle === copie.id && c.puces.join() === 'Soutien,~5e B'), '   … sa carte est dans « 5e B », avec ses étiquettes', v.grille)
  await p.evaluate(() => window.__bibliotheque.allerA(null)); await p.waitForTimeout(200)
  // La copie s'ouvre : mêmes pages, même revue, registre vide
  await Promise.all([p.waitForNavigation({ timeout: 20000 }), p.click('.toast button.action:has-text("Ouvrir")')])
  await pret(p); await p.waitForTimeout(500)
  const apres = await p.evaluate(async () => {
    const t = window.__app.tableau, ex = await import('/src/revoir/exporter.ts')
    return { id: window.__app.classeur.id, nom: window.__app.classeur.nom, pages: t.ordre.length, film: t.film.length, noms: t.ordre.toArray().map(x => t.nomDe(x)), formes: t.ordre.toArray().map(x => t.formesDe(x).size), seances: ex.seancesAPublier(t).map(s => `${s.debut}-${s.fin}-${s.gestes}`), pubs: [...t.doc.getMap('publications').keys()].sort() }
  })
  ok(apres.id === copie.id && apres.nom === copie.nom, 'G3) « Ouvrir » : la copie s\'ouvre', apres)
  ok(apres.pages === avant.pages && JSON.stringify(apres.noms) === JSON.stringify(avant.noms) && JSON.stringify(apres.formes) === JSON.stringify(avant.formes), '   … mêmes pages, mêmes noms, mêmes formes', { avant, apres })
  ok(apres.film === avant.film && JSON.stringify(apres.seances) === JSON.stringify(avant.seances) && avant.seances.length > 0, '   … même revue : le même film, les mêmes séances', { avant: avant.seances, apres: apres.seances })
  ok(apres.pubs.length === 0 && avant.pubs.length === 2, '   … son registre des publications est vide', apres.pubs)
  // La revue s'y ouvre
  await p.evaluate(() => window.__app.ui.revue.ouvrir()); await p.waitForTimeout(600)
  ok(await p.evaluate(() => window.__app.ui.revue.ouvert), '   … la revue s\'ouvre dans la copie')
  await p.keyboard.press('Escape'); await p.waitForTimeout(300)
  // Un classeur fermé (pas celui de l'onglet) se duplique aussi ; la copie d'une copie : « (copie 2) »
  await ouvrirBiblio(p)
  const r2 = await p.evaluate(id => window.__bibliotheque.dupliquer(id).then(f => f?.nom), ici.id)
  ok(r2 === `${ici.nom} (copie 2)`, 'G4) L\'original (fermé) dupliqué de nouveau : « (copie 2) »', r2)
  // Plus de place : rien ne reste
  const nAvant = (await p.evaluate(() => window.__registre.classeurs())).length
  const basesAvant = await p.evaluate(async () => (await indexedDB.databases()).map(d => d.name).sort())
  await toasts(p)
  await p.evaluate(() => {
    const e = window.__ecrivain, vrai = e.copierClasseur.bind(e)
    window.__vraiCopier = vrai
    e.copierClasseur = async (source, cible, infos) => {
      const bases = await import('/src/classeurs/bases.ts'), mod = await import('/src/classeurs/ecrivain.ts')
      await new Promise((ok, ko) => { const r = indexedDB.open(cible); r.onupgradeneeded = () => { r.result.createObjectStore('updates', { autoIncrement: true }); r.result.createObjectStore('custom') }; r.onsuccess = () => { r.result.close(); ok() }; r.onerror = () => ko(r.error) })
      throw new mod.ErreurEcrivain('place', 'Quota exceeded', true)
    }
  })
  const r3 = await p.evaluate(id => window.__bibliotheque.dupliquer(id), ici.id)
  await p.waitForTimeout(500)
  const t3 = (await toasts(p)).join('|')
  const nApres = (await p.evaluate(() => window.__registre.classeurs())).length
  const basesApres = await p.evaluate(async () => (await indexedDB.databases()).map(d => d.name).sort())
  ok(r3 === null && t3.includes('Le classeur n\'a pas pu être dupliqué : il n\'y a plus de place dans ce navigateur.'), 'G5) Plus de place : « Le classeur n\'a pas pu être dupliqué : il n\'y a plus de place dans ce navigateur. »', t3)
  ok(nApres === nAvant && JSON.stringify(basesApres) === JSON.stringify(basesAvant), '   … rien ne reste : ni fiche, ni base', { nAvant, nApres, basesAvant, basesApres })
  await p.evaluate(() => { window.__ecrivain.copierClasseur = window.__vraiCopier })
  // Un trait écrit juste avant (la bibliothèque ouverte aussitôt, la copie
  // aussitôt) : il est dans la copie (ce qui attend s'écrit d'abord)
  await fermerBiblio(p)
  await p.evaluate(() => window.__app.choisirOutil('stylo'))
  const zone = await p.locator('#zone').boundingBox()
  await p.mouse.move(zone.x + 500, zone.y + 400); await p.mouse.down()
  for (let i = 1; i <= 10; i++) await p.mouse.move(zone.x + 500 + i * 12, zone.y + 400 + i * 5)
  await p.mouse.up()
  const nPoints = await p.evaluate(() => window.__app.tableau.formesDe(window.__app.page).size)
  await ouvrirBiblio(p)
  const nom4 = await p.evaluate(id => window.__bibliotheque.dupliquer(id).then(f => f?.id), apres.id)
  const n4 = await p.evaluate(async ({ id, source }) => {
    const vec = await import('/src/classeurs/vecteurs.ts')
    const f = await window.__registre.classeur(id), s = await window.__registre.classeur(source)
    const a = await window.__ecrivain.vecteurDeLaBase(s.base), b = await window.__ecrivain.vecteurDeLaBase(f.base)
    return { formes: window.__app.tableau.formesDe(window.__app.page).size, comparaison: vec.comparerVecteurs(b.vecteur, a.vecteur) }
  }, { id: nom4, source: apres.id })
  ok(n4.formes === nPoints && ['contient', 'egal'].includes(n4.comparaison), `G6) Le classeur ouvert dupliqué juste après un trait au Stylo : la copie contient tout ce que la source a (${n4.comparaison})`, { nPoints, n4 })
  await ctx.close()
}

// =====================================================================
// H. 60 PAGES DUPLIQUÉES : AUCUNE TÂCHE LONGUE
// =====================================================================
if (seul('H')) {
  console.log('\n=== H. un classeur de 60 pages dupliqué : aucune tâche longue ===')
  const ctx = await contexte()
  const p0 = await ouvrir(ctx, '', 'H0')
  const [H] = await creerPlusieurs(p0, 1, { noms: ['Soixante pages'] })
  await p0.close()
  const p = await ouvrir(ctx, '?classeur=' + H, 'H')
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
  await p.reload(); await pret(p); await p.waitForTimeout(5000)
  await ouvrirBiblio(p)
  await p.waitForTimeout(3000)
  await p.evaluate(LONGUES)
  await p.evaluate(() => { setTimeout(() => { const t = performance.now(); while (performance.now() - t < 120) { /* occupé */ } }, 0) })
  await p.waitForTimeout(400)
  const temoin = await p.evaluate(() => window.__longues.splice(0))
  ok(temoin.some(e => e.duree >= 100), '   (le témoin : l\'observateur voit une tâche de 120 ms)', temoin)
  await toasts(p)
  const debut = Date.now()
  const r = await p.evaluate(id => window.__bibliotheque.dupliquer(id).then(f => f && { nom: f.nom, pages: f.pages }), H)
  const duree = Date.now() - debut
  await p.waitForTimeout(500)
  const longues = await p.evaluate(() => window.__longues.splice(0))
  const t = (await toasts(p)).join('|')
  ok(r?.nom === 'Soixante pages (copie)' && r.pages === 60, `H1) 60 pages dupliquées (${(duree / 1000).toFixed(1)} s) : la copie a ses 60 pages`, r)
  ok(!longues.length, `   … aucune tâche longue (plus de 50 ms) pendant la copie (la plus longue : ${Math.max(0, ...longues.map(e => e.duree))} ms)`, longues)
  ok(duree < 300 || t.includes('Copie du classeur…'), '   … « Copie du classeur… » au-delà de 300 ms', t)
  await ctx.close()
}

// =====================================================================
// I. LES APERÇUS
// =====================================================================
if (seul('I')) {
  console.log('\n=== I. les aperçus ===')
  const ctx = await contexte()
  const p = await ouvrir(ctx, '', 'I')
  const ici = await p.evaluate(() => window.__app.classeur.id)
  // Au démarrage, sans aperçu : il se fait (la page vide, son fond)
  const a0 = await attendreQue(p, id => window.__registre.apercu(id).then(a => a && { taille: a.size, type: a.type }), ici)
  ok(a0?.type === 'image/png', 'I1) Au démarrage, sans aperçu : il se fait (PNG)', a0)
  const dims = await p.evaluate(async id => { const a = await window.__registre.apercu(id); if (!a) return null; const b = await createImageBitmap(a); return { l: b.width, h: b.height } }, ici)
  ok(dims?.l === 320 && dims.h === 200, '   … 320 × 200 (au dpr 1)', dims)
  // On écrit : 300 traits sur la première page, puis à la souris. Chaque
  // trait levé sur une page aussi chargée fait déjà, sans aperçu, une tâche
  // d'environ 55 ms dans ce Chromium sans carte graphique (mesuré : c'est
  // l'écriture, d'avant ce lot) : on la mesure d'abord, puis avec l'aperçu
  // qui se fabrique en même temps, puis l'aperçu seul.
  await ecrireTraits(p, 300, { couleur: '#c24a4a' })
  await p.waitForTimeout(2500)
  await p.evaluate(LONGUES)
  await p.evaluate(() => window.__app.choisirOutil('stylo'))
  const zone = await p.locator('#zone').boundingBox()
  const ecrireSouris = async () => {
    for (let k = 0; k < 6; k++) {
      await p.mouse.move(zone.x + 300 + k * 20, zone.y + 300); await p.mouse.down()
      for (let i = 0; i < 20; i++) { await p.mouse.move(zone.x + 300 + k * 20 + i * 8, zone.y + 300 + Math.sin(i / 2) * 20); await dort(8) }
      await p.mouse.up()
    }
  }
  await ecrireSouris(); await p.waitForTimeout(800)
  const base = await p.evaluate(() => window.__longues.splice(0))
  // L'aperçu commencé pendant qu'on écrit (le pire : d'ordinaire il attend
  // 30 s sans écrire) : sa peinture attend le calme
  const t0 = await p.evaluate(() => performance.now())
  await p.evaluate(() => { window.__fab = window.__apercu.fabriquer() })
  await ecrireSouris()
  const finEcriture = await p.evaluate(() => performance.now())
  const fait = await p.evaluate(() => window.__fab)
  await p.waitForTimeout(500)
  const longues = await p.evaluate(() => window.__longues.splice(0))
  const peinture = await p.evaluate(() => window.__apercu.dernierePeinture)
  const duree = await p.evaluate(() => window.__apercu.derniereDuree)
  ok(fait, 'I2) Après 300 traits : l\'aperçu se refait', fait)
  ok(duree < 20, `   … sa peinture prend ${duree.toFixed(1)} ms du fil principal (moins de 20)`, duree)
  ok(peinture && peinture.debut > finEcriture, '   … commencé pendant qu\'on écrivait, il ne se peint qu\'au calme, après le dernier trait', { peinture, finEcriture, t0 })
  const touche = longues.filter(e => e.debut < peinture.fin && e.debut + e.duree > peinture.debut)
  ok(!touche.length && longues.length <= base.length + 1, `   … aucune tâche longue de l'aperçu pendant qu'on écrit et qu'il se fabrique (sans lui : ${base.length}, de ${base.length ? Math.min(...base.map(e => e.duree)) : 0} à ${Math.max(0, ...base.map(e => e.duree))} ms, celles de l'écriture ; avec : ${longues.length})`, { base, longues, peinture })
  await p.waitForTimeout(2000)
  await ecrireTraits(p, 5, { couleur: '#c24a4a' })
  await p.waitForTimeout(2000)
  await p.evaluate(() => window.__longues.splice(0))
  await p.evaluate(() => window.__apercu.fabriquer())
  await p.waitForTimeout(500)
  const seul = await p.evaluate(() => window.__longues.splice(0))
  ok(!seul.length, `   … l'aperçu seul (300 traits) : aucune tâche longue (peinture ${(await p.evaluate(() => window.__apercu.derniereDuree)).toFixed(1)} ms)`, seul)
  // Il ne se refait pas pendant qu'on écrit : écrire, puis ouvrir la bibliothèque tout de suite
  await ecrireTraits(p, 10, { couleur: '#2f8a57' })
  const avantOuvrir = await p.evaluate(id => window.__registre.apercu(id).then(a => a.size), ici)
  await ouvrirBiblio(p)
  await p.waitForFunction(id => { const i = document.querySelector(`.grille-classeurs li[data-cle="${id}"] .apercu-image`); return i && !i.hidden && i.src.startsWith('blob:') && i.complete }, ici, { timeout: 10000 })
  let v = await vue(p)
  const carte = v.recents.find(c => c.cle === ici) ?? v.grille.find(c => c.cle === ici)
  const apresOuvrir = await p.evaluate(id => window.__registre.apercu(id).then(a => a.size), ici)
  ok(carte?.image?.startsWith('blob:') && carte.sansApercu === false, 'I3) La bibliothèque rouverte : la carte montre l\'aperçu (une adresse objet), plus « Pas encore d\'aperçu »', carte)
  ok(apresOuvrir !== avantOuvrir, '   … refait à l\'ouverture de la bibliothèque (la première page avait changé)', { avantOuvrir, apresOuvrir })
  // Le rouge et le vert y sont
  const couleurs = await p.evaluate(async id => {
    const a = await window.__registre.apercu(id), b = await createImageBitmap(a)
    const c = new OffscreenCanvas(b.width, b.height), x = c.getContext('2d'); x.drawImage(b, 0, 0)
    const d = x.getImageData(0, 0, b.width, b.height).data
    let rouge = 0, vert = 0
    for (let i = 0; i < d.length; i += 4) { if (d[i] > 150 && d[i + 1] < 120 && d[i + 2] < 120) rouge++; if (d[i] < 100 && d[i + 1] > 100 && d[i + 2] < 120) vert++ }
    return { rouge, vert }
  }, ici)
  ok(couleurs.rouge > 200 && couleurs.vert > 10, '   … on y voit ce qui est écrit sur la première page (les traits rouges et verts)', couleurs)
  await p.screenshot({ path: CAPTURES + 'I-apercu.png' })
  // Le fantôme du glisser le montre
  const d1 = await creerDossier(p, 'Archives')
  await recharger(p)
  await p.waitForTimeout(300)
  const bb = await p.locator(sel(ici, 'recents')).boundingBox()
  await p.mouse.move(bb.x + 80, bb.y + 60); await p.mouse.down(); await p.mouse.move(bb.x + 120, bb.y + 90); await p.mouse.move(bb.x + 160, bb.y + 140)
  const fantome = await p.evaluate(() => { const i = document.querySelector('.biblio-fantome .apercu-image'); return i && !i.hidden && i.src.startsWith('blob:') })
  await p.keyboard.press('Escape'); await p.mouse.up(); await p.waitForTimeout(200)
  ok(fantome, 'I4) L\'image qui suit le pointeur montre l\'aperçu', fantome)
  // Révoquée à la fermeture
  const url = (await vue(p)).recents.find(c => c.cle === ici)?.image
  await fermerBiblio(p)
  const revoquee = await p.evaluate(async u => { try { await fetch(u); return false } catch { return true } }, url)
  ok(revoquee, 'I5) La bibliothèque fermée : l\'adresse objet est révoquée', url)
  // Un autre onglet voit l'aperçu (le canal)
  const p2 = await ouvrir(ctx, '?bibliotheque', 'I2')
  await p2.waitForTimeout(500)
  const vu2 = await p2.evaluate(id => { const i = document.querySelector(`li[data-cle="${id}"] .apercu-image`); return i && !i.hidden && i.src.startsWith('blob:') }, ici)
  ok(vu2, 'I6) Une autre bibliothèque (seule) montre l\'aperçu', vu2)
  await ecrireTraits(p, 30, { couleur: '#3b6fb6' })
  const avantCanal = await p2.evaluate(id => document.querySelector(`li[data-cle="${id}"] .apercu-image`).src, ici)
  await p.evaluate(() => window.__apercu.fabriquer())
  await p2.waitForTimeout(800)
  const apresCanal = await p2.evaluate(id => document.querySelector(`li[data-cle="${id}"] .apercu-image`).src, ici)
  ok(apresCanal !== avantCanal && apresCanal.startsWith('blob:'), '   … et le nouvel aperçu, écrit dans l\'autre onglet, y paraît (le canal)', { avantCanal, apresCanal })
  // La copie a l'aperçu de l'original
  const copie = await p2.evaluate(id => window.__bibliotheque.dupliquer(id).then(f => f?.id), ici)
  const ac = await p2.evaluate(async ({ a, b }) => { const x = await window.__registre.apercu(a), y = await window.__registre.apercu(b); return x && y && x.size === y.size }, { a: ici, b: copie })
  await p2.waitForTimeout(300)
  const imgCopie = await p2.evaluate(id => { const i = document.querySelector(`li[data-cle="${id}"] .apercu-image`); return i && !i.hidden && i.src.startsWith('blob:') }, copie)
  ok(ac && imgCopie, 'I7) La copie a l\'aperçu de l\'original, et sa carte le montre', { ac, imgCopie })
  // Un classeur jamais ouvert : « Pas encore d'aperçu »
  const [neuf] = await creerPlusieurs(p2, 1, { noms: ['Jamais ouvert'] })
  await p2.evaluate(() => window.__bibliotheque.charger()); await p2.waitForTimeout(200)
  const vn = await p2.evaluate(VUE)
  ok(vn.grille.find(c => c.cle === neuf)?.sansApercu === true, 'I8) Un classeur jamais ouvert : « Pas encore d\'aperçu »', vn.grille.find(c => c.cle === neuf))
  // Safari privé (un Blob refusé) : l'erreur est rattrapée
  const refus = await p.evaluate(async () => {
    const r = window.__registre, vrai = r.ecrireApercu.bind(r)
    const ancien = IDBObjectStore.prototype.put
    IDBObjectStore.prototype.put = function (v, k) { if (v instanceof Blob) throw new DOMException('Blob refusé', 'DataError'); return ancien.call(this, v, k) }
    try { return await r.ecrireApercu(window.__app.classeur.id, new Blob(['x'], { type: 'image/png' })) } finally { IDBObjectStore.prototype.put = ancien }
  })
  ok(refus === false, 'I9) Un Blob refusé par la base (Safari privé) : ecrireApercu rend faux, sans lever', refus)
  await ctx.close()
}

// =====================================================================
// J. 30 CLASSEURS DANS 8 DOSSIERS
// =====================================================================
if (seul('J')) {
  console.log('\n=== J. 30 classeurs dans 8 dossiers ===')
  const ctx = await contexte()
  const p = await ouvrir(ctx, '', 'J')
  const classes = []
  for (const n of ['6e A', '5e B', '4e C', '3e D']) classes.push(await creerDossier(p, n, { etiquette: n }))
  const sous = []
  for (const [i, n] of ['Géométrie', 'Algèbre', 'Statistiques', 'Archives'].entries()) sous.push(await creerDossier(p, n, { parent: classes[i] }))
  for (let k = 0; k < 8; k++) await creerPlusieurs(p, 3, { prefixe: `Ch. ${k}`, dossier: [...classes, ...sous][k] })
  await creerPlusieurs(p, 6, { prefixe: 'Racine' })
  await ouvrirBiblio(p)
  const ids = await p.evaluate(() => window.__registre.classeurs().then(l => l.filter(f => f.nom.startsWith('Racine')).map(f => f.id)))
  await menuCarte(p, ids[0]); await entree(p, 'deplacer')
  const f = await fenetre(p)
  ok(f?.lignes.length === 9 && f.lignes.map(l => l.texte).join('|') === 'Bibliothèque (la racine)(ici)|3e D|Archives|4e C|Statistiques|5e B|Algèbre|6e A|Géométrie', 'J1) « Déplacer vers… » : les 8 dossiers en arbre, par nom', f?.lignes.map(l => l.texte))
  await p.keyboard.press('End'); await p.keyboard.press('Enter'); await p.waitForTimeout(400)
  ok((await fiche(p, ids[0])).dossier === sous[0], '   … Fin, Entrée : dans « Géométrie »', (await fiche(p, ids[0])).dossier)
  await p.evaluate(() => document.querySelector('.biblio-section.tous').scrollIntoView()); await p.waitForTimeout(150)
  const t0 = Date.now()
  await glisserSouris(p, sel(ids[1]), sel('d:' + classes[1]))
  ok((await fiche(p, ids[1])).dossier === classes[1], `J2) Un glisser parmi 30 classeurs : dans « 5e B » (${Date.now() - t0} ms)`, (await fiche(p, ids[1])).dossier)
  const n = await p.evaluate(() => document.querySelectorAll('.grille-classeurs.tous li').length)
  ok(n === 9, `   … la racine montre ses 4 dossiers, ses 4 classeurs restants et le premier (${n})`, n)
  await p.screenshot({ path: CAPTURES + 'J-trente.png' })
  await ctx.close()
}

// =====================================================================
// K. LA VERSION D'UN SEUL FICHIER (file://)
// =====================================================================
if (seul('K')) {
  console.log('\n=== K. la version d\'un seul fichier (file://) ===')
  const UN = R + '/dist/index.html'
  if (!existsSync(UN)) ok(false, 'K) dist/index.html manque (npm run build)')
  else {
    const ctx = await contexte()
    const p = await ctx.newPage(); suivre(p, 'K')
    await p.goto('file://' + UN)
    await p.waitForFunction(() => document.querySelector('.rang')?.textContent?.includes('/'), null, { timeout: 30000 })
    await p.waitForTimeout(800)
    await p.evaluate(() => (document.querySelector('.bouton-classeur')?.click(), document.querySelector('.menu-seances [data-action="bibliotheque"]')?.click()))
    await p.waitForTimeout(500)
    const ouvert = await p.evaluate(() => !document.querySelector('.bibliotheque').hidden)
    const cle = await p.evaluate(() => document.querySelector('.grille-classeurs li.case-classeur')?.dataset.cle)
    ok(ouvert && cle, 'K1) file:// : la bibliothèque s\'ouvre', { ouvert, cle })
    // Dupliquer par le menu (le travailleur intégré, en file://)
    await p.click(`.grille-classeurs li[data-cle="${cle}"] .options-classeur`); await p.waitForTimeout(150)
    await p.click('.menu-flottant:not([hidden]) [data-action="dupliquer"]')
    await p.waitForFunction(() => window.__toasts.some(t => t.includes('Classeur dupliqué')), null, { timeout: 30000 }).catch(() => {})
    const t = (await toasts(p)).join('|')
    ok(t.includes('Classeur dupliqué'), 'K2) file:// : « Dupliquer le classeur » marche (le travailleur intégré)', t)
    // Un dossier, puis y glisser la copie
    await p.click('[data-action="nouveau-dossier"]'); await p.waitForTimeout(200)
    await p.fill('dialog.dialogue-dossier input[name="nom"]', 'Archives'); await p.keyboard.press('Enter'); await p.waitForTimeout(400)
    const copie = await p.evaluate(() => [...document.querySelectorAll('.grille-classeurs.tous li.case-classeur')].find(li => li.textContent.includes('(copie)'))?.dataset.cle)
    const dossier = await p.evaluate(() => document.querySelector('.grille-classeurs.tous li.case-dossier')?.dataset.cle)
    await glisserSouris(p, sel(copie), sel(dossier))
    const dans = await p.evaluate(() => document.querySelector('.grille-classeurs.tous li.case-dossier .carte-contenu')?.textContent)
    ok(dans === '1 classeur', 'K3) file:// : la copie glissée dans « Archives »', dans)
    await ctx.close()
  }
}

console.log(erreurs.length ? `\n✗ ÉCHEC erreurs JS : ${erreurs.join(' | ').slice(0, 2000)}` : '\n✓ aucune erreur JS')
if (erreurs.length) echecs++
console.log(echecs ? `\n${echecs} ÉCHEC(S)` : '\nTOUT VERT')
await nav.close()
process.exit(echecs ? 1 : 0)
