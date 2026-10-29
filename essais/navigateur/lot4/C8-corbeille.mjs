// ESSAI DU MORCEAU C8-corbeille (lot 4) : la corbeille de la bibliothèque,
// remettre, effacer vraiment, les garde-fous du premier, l'adoption des
// bases sans fiche, la place.
// A. Supprimer (le menu d'une carte, Suppr) : le message, « Annuler » ; un
//    dossier (son classeur caché, son adresse mène à la bibliothèque seule) ;
//    le classeur de l'onglet (la bibliothèque reste ouverte sans ×, le
//    Tableau garde sa base, « Annuler », le rechargement).
// B. La vue de la corbeille : les cartes (le dernier d'abord, les textes,
//    44 px), Échap, Remettre (dans son dossier, à la racine : dossier parti,
//    dossier dans la corbeille), « Annuler », vide et grisée.
// C. Supprimer définitivement : la question (Annuler a le focus, Échap, un
//    clic à côté), « Enregistrer d'abord » (le fichier, sa date), la base
//    partie de databases() avec ses clés, son aperçu, son fichier de clé ;
//    un classeur déjà enregistré ; un dossier et tout ce qu'il contient.
// D. Vider : les textes et le décompte ; un autre onglet sur un classeur
//    vidé (« supprimé définitivement dans un autre onglet ») ; le classeur
//    de l'onglet vidé (l'onglet passe sans classeur).
// (E, F. Avec la version d'avant : retirées, voir plus bas.)
// G. Deux onglets qui ouvrent la bibliothèque ensemble : une seule fiche
//    adoptée.
// H. Les orphelines : une page vide mais la corbeille de pages pleine
//    (adoptée), sans entrée (effacée), vide au sens strict (laissée), la
//    base du premier vide (jamais effacée).
// I. L'index supprimé à la main : les classeurs reviennent avec leur nom et
//    leur id (lus à côté du document) ; le premier, avec son nom.
// J. Effacer pendant une lecture du travailleur, ou avec une connexion
//    ouverte par ouvrirBaseExistante : 'efface', et le classeur suivant
//    s'ouvre.
// K. La place : « Ce navigateur garde … pour ce site. », l'alerte, rien.
// L. Les effacements interrompus, relancés au démarrage ; le garde-fou du
//    premier (il n'est effacé que s'il n'a rien de plus).
// M. Deux onglets qui vident ensemble.
// N. Le téléphone (390 × 844) et le clavier.
// O. La version d'un seul fichier (file://).
// Il faut avoir construit les deux versions (npm run build, npm run
// build:pages) ; tout.sh le fait.
// Adapté au lot 17 (« Vérifier les classeurs ») : la question de « Supprimer
// définitivement » et de « Vider la corbeille » est précédée de la
// vérification des images de la corbeille ; les sections C et D attendent la
// fenêtre (attendreLaQuestion) au lieu d'un temps fixe. Aucune image n'est en
// jeu ici : les textes des questions sont inchangés.
import { RACINE_ESSAIS, RACINE_DEPOT } from '../commun/racines.mjs'
import { chromium } from '../commun/playwright.mjs'
import * as Y from 'yjs'
import { spawn } from 'node:child_process'
import { mkdirSync, symlinkSync, unlinkSync, writeFileSync } from 'node:fs'

const S = `${RACINE_ESSAIS}`
const R = `${RACINE_DEPOT}`
const ICI = S + '/lot4/C8/'
const CAPTURES = ICI + 'captures/'
const SITE = ICI + 'site/'
const DEV = 'http://localhost:5173/'
const O = 'http://127.0.0.1:4303'
const BASE_PREMIER = 'mem-tableau-local', INDEX = 'mem-teachingtool-bibliotheque', PREFIXE = 'mem-teachingtool-classeur-'
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
/** Un état de classeur (les mises à jour Yjs) fabriqué dans la page : des
 *  traits sur la première page, une seconde page pleine jetée dans la
 *  corbeille des pages */
const OUTILS = () => {
  window.__etatAvec = async (o = {}) => {
    const { Tableau } = await import('/src/document.ts'), fichier = await import('/src/fichier.ts')
    const t = new Tableau(null)
    const a = t.ajouterPage('carreaux', 0); await Promise.resolve()
    t.pageVue = a
    const trait = (x, y) => ({ id: 'T' + Math.random().toString(36).slice(2), type: 'trait', x, y, z: Date.now() + Math.random(), auteur: t.moi, pts: [0, 0, 0.5, 40, 5, 0.5, 80, 0, 0.5], couleur: '#1b2230', taille: 3, opacite: 1, pression: false })
    for (let i = 0; i < (o.traits ?? 0); i++) { t.nouveauGeste(); t.poser(a, trait(i * 20, i * 7)); await Promise.resolve() }
    for (let k = 1; k < (o.pages ?? 1); k++) {
      const p = t.ajouterPage('carreaux', k); await Promise.resolve(); t.pageVue = p
      for (let i = 0; i < (o.parPage ?? 0); i++) { t.nouveauGeste(); t.poser(p, trait(i * 9, i * 3)); await Promise.resolve() }
    }
    if (o.jetee) {
      const b = t.ajouterPage('carreaux', t.ordre.length); await Promise.resolve(); t.pageVue = b
      for (let i = 0; i < o.jetee; i++) { t.nouveauGeste(); t.poser(b, trait(i * 30, 0)); await Promise.resolve() }
      t.pageVue = a
      if (!t.jeterPage(b, a)) throw new Error('jeterPage')
      await Promise.resolve()
    }
    const blob = fichier.ecrireTableau(t.doc)
    const { etat } = fichier.lireTableau(new Uint8Array(await blob.arrayBuffer()))
    t.doc.destroy()
    return etat
  }
  /** Les bases de cette origine */
  window.__bases = async () => (await indexedDB.databases()).map(d => d.name).sort()
}
const toasts = p => p.evaluate(() => window.__toasts.splice(0))
const nav = await chromium.launch({ env: { ...process.env, LANG: 'C.UTF-8', LC_ALL: 'C.UTF-8' } })
async function contexte(o = {}) {
  const ctx = await nav.newContext({ viewport: { width: 1366, height: 768 }, ...o })
  await ctx.addInitScript(ECOUTER_TOASTS)
  await ctx.addInitScript(OUTILS)
  return ctx
}
async function ouvrir(ctx, chemin = '', nom = 'dev') {
  const p = await ctx.newPage(); suivre(p, nom)
  await p.goto(DEV + chemin); await pret(p); await p.waitForTimeout(300)
  return p
}
/** Des classeurs comme les crée la bibliothèque (o.traits : des traits dans
 *  chacun, pour qu'il ne soit pas vide au sens strict) */
const creerPlusieurs = (p, noms, o = {}) => p.evaluate(async ({ noms, o }) => {
  const dem = await import('/src/classeurs/demarrage.ts'), bases = await import('/src/classeurs/bases.ts'), neuf = await import('/src/classeurs/neuf.ts')
  const T = Date.now(), ids = []
  for (let i = 0; i < noms.length; i++) {
    const etat = o.traits ? await window.__etatAvec({ traits: o.traits }) : await neuf.etatNeuf('carreaux')
    const id = dem.idClasseur(), nom = noms[i]
    const fiche = { id, base: dem.baseDe(id), nom, dossier: o.dossier ?? null, etiquettes: [], cree: T - (noms.length - i) * 3600e3, modifie: T - (noms.length - i) * 600e3, ouvert: 0, pages: 1 }
    await window.__registre.creerClasseur(fiche, b => bases.creerBase(b, etat, { id, nom }))
    ids.push(id)
  }
  return ids
}, { noms, o })
const creerDossier = (p, nom, o = {}) => p.evaluate(async ({ nom, o }) => {
  const dem = await import('/src/classeurs/demarrage.ts')
  const d = { id: dem.idClasseur(), nom, parent: o.parent ?? null, couleur: o.couleur ?? '#3b6fb6', cree: Date.now(), ...(o.etiquette ? { etiquette: o.etiquette } : {}) }
  await window.__registre.ajouterDossier(d)
  return d.id
}, { nom, o })
const ouvrirBiblio = async p => {
  await p.evaluate(() => { const b = document.querySelector('.bouton-classeur'); if (b && b.getClientRects().length) b.click(); else window.__app.ui.ouvrirBibliotheque() })
  await p.waitForFunction(() => window.__bibliotheque.ouvert && document.querySelectorAll('.grille-classeurs li, .biblio-vide-dossier:not([hidden]), .biblio-vide:not([hidden])').length > 0, null, { timeout: 10000 })
  await p.waitForTimeout(250)
}
const recharger = async p => { await p.evaluate(() => window.__bibliotheque.charger()); await p.waitForTimeout(150) }
const sel = (cle, l = 'tous') => `.grille-classeurs.${l} li[data-cle="${cle}"]`
const fiche = (p, id) => p.evaluate(id => window.__registre.classeur(id), id)
const bases = p => p.evaluate(() => window.__bases())
const VUE = () => {
  const n = t => (t || '').replace(/[  ]/g, ' ')
  const cartes = s => [...document.querySelectorAll(s + ' > li')].map(li => li.dataset.cle)
  const v = document.querySelector('.biblio-vue-corbeille')
  const b = document.querySelector('[data-action="corbeille"]')
  const a = document.activeElement
  return {
    ouvert: !document.querySelector('.bibliotheque').hidden,
    croix: !document.querySelector('.biblio-fermer').hidden,
    recents: document.querySelector('.biblio-section.recents').hidden ? [] : cartes('.grille-classeurs.recents'),
    grille: cartes('.grille-classeurs.tous'),
    bouton: { texte: n(b.querySelector('.libelle-long').textContent), court: b.querySelector('.libelle-court').textContent, gris: b.disabled, presse: b.getAttribute('aria-pressed'), nom: b.getAttribute('aria-label') },
    corbeille: v.hidden ? null : {
      cartes: [...v.querySelectorAll('.carte-corbeille-biblio')].map(li => ({ cle: li.dataset.cle, genre: li.dataset.genre, nom: li.querySelector('.corbeille-nom-biblio').textContent,
        date: n(li.querySelector('.corbeille-date-biblio').textContent), ou: n(li.querySelector('.corbeille-ou-biblio').textContent), label: n(li.getAttribute('aria-label')),
        hauteurs: [...li.querySelectorAll('.corbeille-boutons button')].map(x => Math.round(x.getBoundingClientRect().height)),
        image: !!li.querySelector('.apercu-image:not([hidden])') })),
      compte: v.querySelector('.biblio-compte').textContent, vide: !v.querySelector('.biblio-corbeille-vide').hidden, viderGris: v.querySelector('[data-action="vider-corbeille"]').disabled,
    },
    place: (x => x.hidden ? null : { texte: n(x.textContent), alerte: x.classList.contains('alerte') })(document.querySelector('.biblio-place')),
    focus: a?.dataset?.action ? a.dataset.action + (a.closest('li[data-cle]') ? '@' + a.closest('li[data-cle]').dataset.cle : '') : a?.closest?.('li[data-cle]')?.dataset.cle ?? a?.className ?? null,
    titre: document.title, url: location.search,
    largeur: document.documentElement.scrollWidth, vue: innerWidth,
  }
}
const vue = p => p.evaluate(VUE)
const DIALOGUE = () => {
  const d = document.querySelector('dialog[open]')
  if (!d) return null
  return { titre: d.querySelector('h2')?.textContent, textes: [...d.querySelectorAll('p')].map(x => (x.textContent || '').replace(/[  ]/g, ' ')),
    boutons: [...d.querySelectorAll('.actions button')].map(b => b.textContent + (b.disabled ? '(gris)' : '')), focus: document.activeElement?.dataset?.a ?? null, classe: d.className }
}
const dialogue = p => p.evaluate(DIALOGUE)
/** La question d'effacement, attendue : depuis le lot 17, la vérification
 *  des images (verification.ts) la précède, un instant de plus */
const attendreLaQuestion = async (p, ms = 15000) => { await p.waitForSelector('dialog[open]', { timeout: ms }); await p.waitForTimeout(150) }
const menuCarte = async (p, cle, l = 'tous') => { await p.click(`${sel(cle, l)} .options-classeur`); await p.waitForTimeout(150) }
const entree = async (p, action) => { await p.click(`.menu-flottant:not([hidden]) [data-action="${action}"]`); await p.waitForTimeout(250) }
const ENTREES = () => { const m = [...document.querySelectorAll('.menu-flottant')].find(x => !x.hidden); return m ? [...m.querySelectorAll('.menu-item')].map(e => ({ action: e.dataset.action, texte: e.querySelector('.libelle')?.firstChild?.textContent, touche: e.querySelector('.touche')?.textContent ?? null, aide: e.querySelector('small')?.textContent ?? null })) : null }
const supprimerCarte = async (p, cle) => { await menuCarte(p, cle); await entree(p, cle.startsWith('d:') ? 'supprimer-dossier' : 'supprimer') }
const ouvrirCorbeille = async p => { await p.click('[data-action="corbeille"]'); await p.waitForTimeout(200) }
const carteCorbeille = cle => `.carte-corbeille-biblio[data-cle="${cle}"]`
async function attendreQue(p, f, arg, ms = 15000) {
  const fin = Date.now() + ms
  let v
  do { v = await p.evaluate(f, arg); if (v) return v; await dort(200) } while (Date.now() < fin)
  return v
}
const ecrireTraits = (p, n) => p.evaluate(async n => {
  const t = window.__app.tableau, page = t.ordre.get(0)
  const trait = (x, y) => ({ id: 'T' + Math.random().toString(36).slice(2), type: 'trait', x, y, z: Date.now() + Math.random(), auteur: t.moi, pts: [0, 0, 0.5, 40, 5, 0.5, 80, 0, 0.5], couleur: '#1b2230', taille: 3, opacite: 1, pression: false })
  t.nouveauGeste()
  t.doc.transact(() => { for (let i = 0; i < n; i++) t.poser(page, trait(i * 30, 40)) })
  await t.attendreEcritures()
}, n)
/** Le nombre de formes de chaque page d'une base, lu dans la page sans la créer */
const formesDe = (p, base) => p.evaluate(async base => {
  const b = await import('/src/classeurs/bases.ts'), pur = await import('/src/classeurs/ecrivain-pur.ts')
  try { const { mises } = await b.lireMisesAJour(base); const e = pur.examinerMisesAJour(mises); return { formes: e.formes, pages: e.pages, film: e.film } } catch (e) { return { erreur: e.raison ?? String(e) } }
}, base)

// =====================================================================
// A. SUPPRIMER
// =====================================================================
if (seul('A')) {
  console.log('\n=== A. Supprimer : le message, « Annuler », un dossier, le classeur de l\'onglet ===')
  const ctx = await contexte()
  const p = await ouvrir(ctx, '', 'A')
  const premier = await p.evaluate(() => window.__app.classeur.id)
  const d5b = await creerDossier(p, '5e B', { etiquette: '5e B', couleur: '#2f8a57' })
  const [sym, fra] = await creerPlusieurs(p, ['Symétrie', 'Fractions'])
  const [pyt] = await creerPlusieurs(p, ['Pythagore'], { dossier: d5b })
  await ouvrirBiblio(p); await toasts(p)
  await menuCarte(p, sym)
  const m = await p.evaluate(ENTREES)
  const s1 = m?.find(e => e.action === 'supprimer')
  ok(s1 && s1.texte === 'Supprimer' && s1.touche === 'Suppr' && s1.aide === 'Dans la corbeille de la bibliothèque' && m[m.length - 1].action === 'supprimer',
    'A1) Le menu d\'un classeur finit par « Supprimer » (Suppr, « Dans la corbeille de la bibliothèque »)', m)
  await entree(p, 'supprimer')
  let v = await vue(p), t = await toasts(p), f = await fiche(p, sym)
  ok(t.some(x => x.startsWith('« Symétrie » est dans la corbeille de la bibliothèque.') && x.includes('Annuler')), 'A2) « « Symétrie » est dans la corbeille de la bibliothèque. » [Annuler]', t)
  ok(!v.grille.includes(sym) && f.corbeille?.t > 0 && v.bouton.texte === 'Corbeille (1)' && !v.bouton.gris && v.bouton.nom === 'Corbeille de la bibliothèque : 1 élément',
    '   … la carte s\'en va, la fiche porte corbeille = { t }, le bouton dit « Corbeille (1) »', { v: v.bouton, f: f.corbeille })
  ok(v.focus && v.grille.includes(v.focus), '   … le focus passe à une carte voisine', v.focus)
  await p.click('.toast button.action'); await p.waitForTimeout(300)
  v = await vue(p); f = await fiche(p, sym); t = await toasts(p)
  ok(v.grille.includes(sym) && !f.corbeille && v.bouton.texte === 'Corbeille' && v.bouton.gris, 'A3) « Annuler » : il revient tel quel, la corbeille est vide (grisée)', { b: v.bouton, f: f.corbeille })
  ok(t.some(x => x.includes('« Symétrie » est de retour.')), '   … « « Symétrie » est de retour. »', t)
  // Suppr sur la carte qui a le focus
  await p.evaluate(id => { const b = window.__bibliotheque; b.focusCarte(b.tous, id) }, fra)
  await p.keyboard.press('Delete'); await p.waitForTimeout(300)
  f = await fiche(p, fra); t = await toasts(p)
  ok(f.corbeille?.t > 0 && t.some(x => x.startsWith('« Fractions » est dans la corbeille')), 'A4) Suppr sur la carte qui a le focus : dans la corbeille, sans question', t)
  ok(!(await p.evaluate(() => !!document.querySelector('dialog[open]'))), '   … aucune fenêtre')
  // Un dossier
  await menuCarte(p, 'd:' + d5b)
  const md = await p.evaluate(ENTREES)
  ok(md?.some(e => e.action === 'supprimer-dossier' && e.texte === 'Supprimer'), 'A5) Le menu d\'un dossier a « Supprimer »', md?.map(e => e.action))
  await entree(p, 'supprimer-dossier')
  v = await vue(p); t = await toasts(p)
  ok(t.some(x => x.startsWith('Dossier « 5e B » mis à la corbeille (1 classeur)')), '   … « Dossier « 5e B » mis à la corbeille (1 classeur) » [Annuler]', t)
  const visibleP = await p.evaluate(async id => { const dem = await import('/src/classeurs/demarrage.ts'); const f = await window.__registre.classeur(id); return dem.visible(f, await window.__registre.dossiers()) }, pyt)
  ok(!v.grille.includes('d:' + d5b) && !visibleP && !(await fiche(p, pyt)).corbeille && v.bouton.texte === 'Corbeille (2)', '   … son classeur est caché (sans marque à lui), le bouton « Corbeille (2) »', v.bouton)
  const q = await ctx.newPage(); suivre(q, 'A-adresse')
  await q.goto(DEV + '?classeur=' + pyt); await pret(q); await q.waitForTimeout(400)
  const tq = (await toasts(q)).join(' ')
  ok(await q.evaluate(() => !window.__app && !document.querySelector('.bibliotheque').hidden) && tq.includes('Ce classeur est dans la corbeille de la bibliothèque : remettez-le pour l\'ouvrir.'),
    '   … son adresse mène à la bibliothèque seule, qui le dit', tq)
  await q.close()
  // Supprimé dans un autre onglet pendant qu'il est ouvert ici : rien ne change ici
  const [ail] = await creerPlusieurs(p, ['Ailleurs'])
  const w = await ouvrir(ctx, '?classeur=' + ail, 'A-ailleurs')
  await p.bringToFront(); await recharger(p)
  await supprimerCarte(p, ail)
  await w.bringToFront(); await w.waitForTimeout(400)
  await ecrireTraits(w, 2)
  const ici = await w.evaluate(() => ({ dialogue: !!document.querySelector('dialog[open]'), titre: document.title, local: !!window.__app.tableau.local }))
  const fw = await formesDe(w, PREFIXE + ail)
  ok(!ici.dialogue && ici.titre === 'Ailleurs — MEM teachingtool' && ici.local && fw.formes === 2, 'A6) Supprimé dans un autre onglet pendant qu\'il est ouvert ici : rien ne change ici (on y écrit, la base garde tout)', { ici, fw })
  await w.close()
  await p.bringToFront()
  // Le classeur de cet onglet
  await recharger(p)
  await supprimerCarte(p, premier)
  v = await vue(p)
  ok(v.ouvert && !v.croix, 'A7) Le classeur de l\'onglet supprimé : la bibliothèque reste ouverte, sans ×', v)
  await p.keyboard.press('Escape'); await p.waitForTimeout(200)
  ok((await vue(p)).ouvert, '   … Échap ne la ferme pas')
  const lien = await p.evaluate(async () => { const t = window.__app.tableau; return { local: !!t.local, base: t.base, trou: t.trou } })
  await ecrireTraits(p, 2)
  const formes = await formesDe(p, BASE_PREMIER)
  ok(lien.local && lien.base === BASE_PREMIER && !lien.trou && formes.formes === 2, '   … le Tableau garde sa base : ce qui s\'écrit encore y va', { lien, formes })
  await p.click('.toast button.action'); await p.waitForTimeout(300)
  v = await vue(p)
  ok(v.croix && !(await fiche(p, premier)).corbeille, '   … « Annuler » : il revient, le × aussi', v.croix)
  await p.keyboard.press('Escape'); await p.waitForTimeout(200)
  ok(!(await vue(p)).ouvert, '   … et Échap ferme de nouveau')
  await ouvrirBiblio(p)
  await supprimerCarte(p, premier)
  await p.reload(); await pret(p); await p.waitForTimeout(500)
  const tr = (await toasts(p)).join(' ')
  ok(await p.evaluate(() => !window.__app && !document.querySelector('.bibliotheque').hidden) && tr.includes('Ce classeur est dans la corbeille de la bibliothèque'),
    '   … au rechargement, la bibliothèque seule le dit', tr)
  await ctx.close()
}

// =====================================================================
// B. LA VUE DE LA CORBEILLE
// =====================================================================
if (seul('B')) {
  console.log('\n=== B. La vue de la corbeille : les cartes, Échap, Remettre, Annuler ===')
  const ctx = await contexte()
  const p = await ouvrir(ctx, '', 'B')
  const d5b = await creerDossier(p, '5e B', { etiquette: '5e B', couleur: '#2f8a57' })
  const vieux = await creerDossier(p, 'Vieux', { couleur: '#c24a4a' })
  const [tha, pyt] = await creerPlusieurs(p, ['Thalès', 'Pythagore'], { dossier: d5b })
  const [anc] = await creerPlusieurs(p, ['Ancien'], { dossier: vieux })
  const [sym] = await creerPlusieurs(p, ['Symétrie'])
  // Un aperçu pour Symétrie (la carte de la corbeille le montre)
  await p.evaluate(async id => { const c = document.createElement('canvas'); c.width = 32; c.height = 20; const b = await new Promise(ok => c.toBlob(ok, 'image/png')); await window.__registre.ecrireApercu(id, b) }, sym)
  await ouvrirBiblio(p)
  await p.evaluate(id => window.__bibliotheque.allerA(id), d5b); await p.waitForTimeout(150)
  await supprimerCarte(p, tha); await dort(30)
  await p.evaluate(id => window.__bibliotheque.allerA(id), vieux); await p.waitForTimeout(150)
  await supprimerCarte(p, anc); await dort(30)
  await p.evaluate(() => window.__bibliotheque.allerA(null)); await p.waitForTimeout(150)
  await supprimerCarte(p, 'd:' + vieux); await dort(30)
  await supprimerCarte(p, sym)
  await toasts(p)
  let v = await vue(p)
  ok(v.bouton.texte === 'Corbeille (4)' && v.bouton.court === '4', 'B1) Le bouton : « Corbeille (4) » (au téléphone, « 4 »)', v.bouton)
  await ouvrirCorbeille(p)
  v = await vue(p)
  const c = v.corbeille
  ok(c && c.cartes.map(x => x.cle).join() === [sym, 'd:' + vieux, anc, tha].join(), 'B2) La vue montre les supprimés, le dernier d\'abord', c?.cartes.map(x => x.nom))
  ok(v.bouton.presse === 'true' && v.focus === 'remettre@' + sym, '   … le bouton est enfoncé, le focus sur le premier « Remettre »', { b: v.bouton, f: v.focus })
  const cs = Object.fromEntries((c?.cartes ?? []).map(x => [x.nom, x]))
  ok(/^Supprimé aujourd'hui à \d{1,2} h \d{2}$/.test(cs['Symétrie']?.date) && cs['Symétrie'].ou === 'Était dans : Bibliothèque' && cs['Symétrie'].image,
    '   … « Symétrie » : « Supprimé aujourd\'hui à … », « Était dans : Bibliothèque », son aperçu', cs['Symétrie'])
  ok(/^Supprimé aujourd'hui à \d{1,2} h \d{2} · 1 classeur$/.test(cs['Vieux']?.date) && cs['Vieux'].genre === 'dossier', '   … le dossier « Vieux » : « · 1 classeur »', cs['Vieux'])
  ok(cs['Thalès']?.ou === 'Était dans : 5e B' && cs['Ancien']?.ou === 'Était dans : Vieux', '   … « Était dans : 5e B », « Était dans : Vieux »', [cs['Thalès']?.ou, cs['Ancien']?.ou])
  ok(c?.cartes.every(x => x.hauteurs.length === 2 && x.hauteurs.every(h => h >= 44)), '   … deux boutons de 44 px au moins', c?.cartes.map(x => x.hauteurs))
  ok(cs['Thalès']?.label.startsWith('Thalès, classeur, supprimé aujourd\'hui à') && cs['Thalès'].label.endsWith('était dans : 5e B'), '   … le lecteur d\'écran : « Thalès, classeur, supprimé …, était dans : 5e B »', cs['Thalès']?.label)
  ok(c?.compte === '4 éléments' && !c.viderGris, '   … « 4 éléments », « Vider la corbeille »', c?.compte)
  await p.keyboard.press('Escape'); await p.waitForTimeout(200)
  v = await vue(p)
  ok(!v.corbeille && v.ouvert && v.focus === 'corbeille' && v.bouton.presse === 'false', 'B3) Échap ramène aux cartes, le focus sur « Corbeille »', v)
  await ouvrirCorbeille(p)
  // Remettre dans son dossier
  await p.click(`${carteCorbeille(tha)} [data-action="remettre"]`); await p.waitForTimeout(300)
  let t = await toasts(p), f = await fiche(p, tha)
  ok(t.some(x => x.startsWith('« Thalès » remis dans « 5e B »') && x.includes('Annuler')) && f.dossier === d5b && !f.corbeille, 'B4) Remettre : « « Thalès » remis dans « 5e B » » [Annuler]', t)
  v = await vue(p)
  ok(v.corbeille && !v.corbeille.cartes.some(x => x.cle === tha) && v.focus?.startsWith('remettre@'), '   … on reste dans la corbeille, le focus sur la carte suivante', v.focus)
  await p.click('.toast button.action'); await p.waitForTimeout(300)
  f = await fiche(p, tha); t = await toasts(p)
  ok(f.corbeille?.t > 0 && f.dossier === d5b && t.some(x => x.includes('« Thalès » est de nouveau dans la corbeille.')), '   … « Annuler » : de nouveau dans la corbeille', t)
  // Son dossier n'existe plus
  await p.evaluate(id => window.__registre.supprimerDossier(id), d5b)
  await recharger(p)
  await p.click(`${carteCorbeille(tha)} [data-action="remettre"]`); await p.waitForTimeout(300)
  t = await toasts(p); f = await fiche(p, tha)
  ok(t.some(x => x.startsWith('« Thalès » remis à la racine de la bibliothèque (son dossier n\'existe plus)')) && f.dossier === null, 'B5) Son dossier parti : « … remis à la racine de la bibliothèque (son dossier n\'existe plus) »', t)
  // Son dossier est lui-même dans la corbeille
  await p.click(`${carteCorbeille(anc)} [data-action="remettre"]`); await p.waitForTimeout(300)
  t = await toasts(p); f = await fiche(p, anc)
  ok(t.some(x => x.startsWith('« Ancien » remis à la racine de la bibliothèque (son dossier est dans la corbeille)')) && f.dossier === null && !f.corbeille,
    'B6) Son dossier dans la corbeille : la racine, et le message le dit', t)
  // Un dossier
  await p.click(`${carteCorbeille('d:' + vieux)} [data-action="remettre"]`); await p.waitForTimeout(300)
  t = await toasts(p)
  ok(t.some(x => x.startsWith('Dossier « Vieux » remis à la racine de la bibliothèque')) && !(await p.evaluate(id => window.__registre.dossier(id), vieux)).corbeille, 'B7) Un dossier remis', t)
  await p.click(`${carteCorbeille(sym)} [data-action="remettre"]`); await p.waitForTimeout(300)
  v = await vue(p)
  ok(v.corbeille?.vide && v.corbeille.viderGris && v.corbeille.compte === '' && v.focus === 'corbeille-retour', 'B8) La corbeille vide : « La corbeille est vide. », « Vider » grisé, le focus sur « Bibliothèque »', v.corbeille)
  await p.click('[data-action="corbeille-retour"]'); await p.waitForTimeout(200)
  v = await vue(p)
  ok(!v.corbeille && v.bouton.gris && v.bouton.texte === 'Corbeille' && v.grille.includes(sym) && v.grille.includes(tha) && v.grille.includes(anc) && v.grille.includes('d:' + vieux),
    '   … retour aux cartes : tout est revenu, « Corbeille » grisé', v)
  ok(!(await p.evaluate(() => [...document.querySelectorAll('.grille-classeurs.tous li')].some(li => li.dataset.cle === undefined))), '   … ' + pyt.slice(0, 0) + 'rien d\'autre ne bouge')
  await ctx.close()
}

// =====================================================================
// C. SUPPRIMER DÉFINITIVEMENT
// =====================================================================
const OPFS = () => {
  window.showSaveFilePicker = async o => {
    const dir = await navigator.storage.getDirectory()
    window.__choix = [...(window.__choix ?? []), { nom: o?.suggestedName, actif: navigator.userActivation.isActive }]
    return dir.getFileHandle(o?.suggestedName || 'sans-nom.memc', { create: true })
  }
}
if (seul('C')) {
  console.log('\n=== C. Supprimer définitivement : la question, Enregistrer d\'abord, la base partie ===')
  const ctx = await contexte()
  await ctx.addInitScript(OPFS)
  const p = await ouvrir(ctx, '', 'C')
  const [bro, sauve] = await creerPlusieurs(p, ['Brouillon', 'Sauvé'], { traits: 3 })
  // Ce qui suit le classeur : ses clés, son aperçu, le fichier de sa clé
  await p.evaluate(async id => {
    localStorage.setItem('mem-session:' + id, '{"page":"x"}')
    const c = document.createElement('canvas'); c.width = 32; c.height = 20
    await window.__registre.ecrireApercu(id, await new Promise(ok => c.toBlob(ok, 'image/png')))
    const h = await (await navigator.storage.getDirectory()).getFileHandle('cle-brouillon.memc', { create: true })
    await window.__registre.garderPoignee(id, h)
  }, bro)
  await p.evaluate(id => localStorage.setItem('mem-dernier-enregistrement:' + id, String(Date.now() - 3600e3)), sauve)
  await ouvrirBiblio(p)
  await supprimerCarte(p, bro); await supprimerCarte(p, sauve)
  await ouvrirCorbeille(p)
  await p.click(`${carteCorbeille(bro)} [data-action="supprimer-definitivement"]`); await attendreLaQuestion(p)
  let d = await dialogue(p)
  ok(d?.titre === 'Supprimer définitivement « Brouillon » ?', 'C1) « Supprimer définitivement « Brouillon » ? »', d?.titre)
  ok(d?.textes[0] === 'Sa page et tout son historique (la revue, les séances à publier) seront effacés de ce navigateur. Ce n\'est pas annulable.'
    && d.textes[1] === 'Il n\'a jamais été enregistré dans un fichier ni copié sur le Drive : il n\'en restera rien.', '   … les textes, et « il n\'en restera rien »', d?.textes)
  ok(d?.boutons.join('|') === 'Annuler|Enregistrer d\'abord|Supprimer définitivement' && d.focus === 'annuler' && d.classe.includes('dialogue-corbeille'), '   … [Annuler] [Enregistrer d\'abord] [Supprimer définitivement], « Annuler » a le focus', d)
  await p.keyboard.press('Escape'); await p.waitForTimeout(200)
  ok(!(await dialogue(p)) && (await bases(p)).includes(PREFIXE + bro) && (await vue(p)).corbeille, '   … Échap ferme sans rien faire, on reste dans la corbeille')
  await p.click(`${carteCorbeille(bro)} [data-action="supprimer-definitivement"]`); await attendreLaQuestion(p)
  await p.mouse.click(5, 5); await p.waitForTimeout(200)
  ok(!(await dialogue(p)) && (await bases(p)).includes(PREFIXE + bro), '   … un clic à côté aussi')
  // Enregistrer d'abord
  await p.click(`${carteCorbeille(bro)} [data-action="supprimer-definitivement"]`); await attendreLaQuestion(p)
  await p.click('dialog[open] [data-a="enregistrer"]')
  await attendreQue(p, () => document.querySelector('dialog[open] [data-a="enregistrer"]')?.textContent === 'Enregistré ✓')
  d = await dialogue(p)
  const enr = await p.evaluate(async id => {
    const dir = await navigator.storage.getDirectory(), noms = []
    for await (const [nom] of dir.entries()) noms.push(nom)
    const nom = noms.find(n => n.startsWith('Brouillon '))
    const f = nom ? await (await dir.getFileHandle(nom)).getFile() : null
    const tete = f ? new TextDecoder().decode((await f.arrayBuffer()).slice(0, 300)).split('\n')[0] : null
    return { nom, taille: f?.size, tete, cle: localStorage.getItem('mem-dernier-enregistrement:' + id), choix: window.__choix }
  }, bro)
  ok(/^Brouillon \d{4}-\d{2}-\d{2} \d{2}h\d{2}\.memc$/.test(enr.nom ?? '') && enr.taille > 100 && JSON.parse(enr.tete).id === bro && JSON.parse(enr.tete).nom === 'Brouillon' && enr.choix?.[0]?.actif,
    'C2) « Enregistrer d\'abord » : le choix du fichier dans le clic, le .memc écrit depuis la base (son nom, son id)', enr)
  ok(Number(enr.cle) > 0 && d?.boutons.includes('Enregistré ✓(gris)') && d.textes[1] === 'Ses fichiers enregistrés ne sont pas effacés.', '   … sa date notée ; la fenêtre le dit (« Enregistré ✓ », « Ses fichiers enregistrés ne sont pas effacés. »)', d)
  await p.click('dialog[open] [data-a="oui"]')
  await attendreQue(p, id => window.__bases().then(b => !b.includes('mem-teachingtool-classeur-' + id)), bro)
  await p.waitForTimeout(400)
  let t = await toasts(p)
  const apres = await p.evaluate(async id => ({ bases: await window.__bases(), fiche: await window.__registre.classeur(id) ?? null, apercu: await window.__registre.apercu(id) ?? null, poignee: await window.__registre.poignee(id) ?? null,
    session: localStorage.getItem('mem-session:' + id), dernier: localStorage.getItem('mem-dernier-enregistrement:' + id) }), bro)
  ok(!apres.bases.includes(PREFIXE + bro) && apres.fiche === null, 'C3) Supprimé définitivement : la base n\'est plus dans databases(), la fiche est partie', apres.bases)
  ok(apres.apercu === null && apres.poignee === null && apres.session === null && apres.dernier === null, '   … son aperçu, le fichier de sa clé, ses clés de stockage aussi', apres)
  ok(t.some(x => x.includes('« Brouillon » supprimé définitivement.')) && !t.some(x => x.includes('« Brouillon » est dans la corbeille') && x.includes('supprimé définitivement')),
    '   … « « Brouillon » supprimé définitivement. » (et le vieil « Annuler » s\'en va)', t)
  // Déjà enregistré
  await p.click(`${carteCorbeille(sauve)} [data-action="supprimer-definitivement"]`); await attendreLaQuestion(p)
  d = await dialogue(p)
  ok(d?.textes[1] === 'Ses fichiers enregistrés ne sont pas effacés.' && d.boutons.join('|') === 'Annuler|Supprimer définitivement', 'C4) Un classeur déjà enregistré : « Ses fichiers enregistrés ne sont pas effacés. », sans « Enregistrer d\'abord »', d)
  await p.click('dialog[open] [data-a="annuler"]'); await p.waitForTimeout(150)
  // Un dossier et tout ce qu'il contient
  const d6 = await creerDossier(p, '6e A')
  const geo = await creerDossier(p, 'Géo', { parent: d6 })
  const [x1, x2] = await creerPlusieurs(p, ['Aires', 'Volumes'], { dossier: d6 })
  const [x3] = await creerPlusieurs(p, ['Angles'], { dossier: geo })
  await p.evaluate(id => localStorage.setItem('mem-dernier-enregistrement:' + id, String(Date.now())), x2)
  await p.evaluate(id => localStorage.setItem('mem-dernier-enregistrement:' + id, String(Date.now())), x3)
  await p.click('[data-action="corbeille-retour"]'); await recharger(p)
  await supprimerCarte(p, 'd:' + d6)
  await ouvrirCorbeille(p)
  await p.click(`${carteCorbeille('d:' + d6)} [data-action="supprimer-definitivement"]`); await attendreLaQuestion(p)
  d = await dialogue(p)
  ok(d?.titre === 'Supprimer définitivement le dossier « 6e A » ?' && d.textes[0] === 'Ses 3 classeurs (3 pages en tout) et son dossier seront effacés de ce navigateur. Ce n\'est pas annulable.'
    && d.textes[1] === 'Dont 1 qui n\'a jamais été enregistré dans un fichier.', 'C5) Un dossier : « Ses 3 classeurs (3 pages en tout) et son dossier seront effacés… », « Dont 1… »', d)
  await p.click('dialog[open] [data-a="oui"]')
  await attendreQue(p, ids => window.__bases().then(b => ids.every(id => !b.includes('mem-teachingtool-classeur-' + id))), [x1, x2, x3])
  await p.waitForTimeout(300)
  t = await toasts(p)
  const ds = await p.evaluate(() => window.__registre.dossiers())
  ok(t.some(x => x.includes('Dossier « 6e A » supprimé définitivement.')) && !ds.some(x => x.id === d6 || x.id === geo), '   … « Dossier « 6e A » supprimé définitivement. », ses dossiers partis', { t, ds: ds.map(x => x.nom) })
  ok(!(await fiche(p, x1)) && !(await fiche(p, x3)), '   … ses classeurs aussi (le sous-dossier compris)')
  await p.screenshot({ path: CAPTURES + 'C-corbeille.png' })
  await ctx.close()
}

// =====================================================================
// D. VIDER
// =====================================================================
if (seul('D')) {
  console.log('\n=== D. Vider la corbeille : les textes, un autre onglet, le classeur de l\'onglet ===')
  const ctx = await contexte()
  const p = await ouvrir(ctx, '', 'D')
  const premier = await p.evaluate(() => window.__app.classeur.id)
  const dd = await creerDossier(p, 'Anciens')
  const [a1, a2] = await creerPlusieurs(p, ['Un', 'Deux'])
  const [a3] = await creerPlusieurs(p, ['Trois'], { dossier: dd })
  await p.evaluate(id => localStorage.setItem('mem-dernier-enregistrement:' + id, String(Date.now())), a2)
  await ouvrirBiblio(p)
  for (const c of [a1, a2, 'd:' + dd]) await supprimerCarte(p, c)
  await ouvrirCorbeille(p)
  await p.click('[data-action="vider-corbeille"]'); await attendreLaQuestion(p)
  let d = await dialogue(p)
  ok(d?.titre === 'Vider la corbeille ?' && d.textes[0] === '3 classeurs (3 pages) et 1 dossier seront effacés de ce navigateur. Ce n\'est pas annulable.'
    && d.textes[1] === 'Dont 2 qui n\'ont jamais été enregistrés dans un fichier.' && d.boutons.join('|') === 'Annuler|Vider la corbeille' && d.focus === 'annuler',
    'D1) « Vider la corbeille ? 3 classeurs (3 pages) et 1 dossier seront effacés… », « Dont 2… », Annuler a le focus', d)
  await p.click('dialog[open] [data-a="oui"]')
  await attendreQue(p, ids => window.__bases().then(b => ids.every(id => !b.includes('mem-teachingtool-classeur-' + id))), [a1, a2, a3])
  await p.waitForTimeout(400)
  let t = await toasts(p), v = await vue(p)
  ok(t.some(x => x.includes('Corbeille vidée (3 classeurs, 1 dossier).')), 'D2) « Corbeille vidée (3 classeurs, 1 dossier). »', t)
  ok(v.corbeille?.vide && (await p.evaluate(() => window.__registre.dossiers())).length === 0, '   … la corbeille est vide, le dossier parti', v.corbeille)
  // Un autre onglet (la nouvelle version) sur un classeur qu'on vide
  const [b1] = await creerPlusieurs(p, ['Ailleurs'], { traits: 2 })
  const q = await ouvrir(ctx, '?classeur=' + b1, 'D-autre')
  await p.click('[data-action="corbeille-retour"]'); await recharger(p)
  await supprimerCarte(p, b1)
  await ouvrirCorbeille(p)
  await p.click('[data-action="vider-corbeille"]'); await p.waitForTimeout(200)
  await p.click('dialog[open] [data-a="oui"]')
  await attendreQue(p, id => window.__bases().then(b => !b.includes('mem-teachingtool-classeur-' + id)), b1)
  await p.waitForTimeout(500)
  t = await toasts(p)
  const dq = await dialogue(q)
  ok(dq?.titre === 'Le classeur a été supprimé' && dq.textes[0] === 'Le classeur « Ailleurs » a été supprimé définitivement dans un autre onglet : ce qui serait écrit ici ne serait plus enregistré.'
    && dq.boutons.join() === 'Ouvrir la bibliothèque', 'D3) L\'autre onglet : « supprimé définitivement dans un autre onglet » [Ouvrir la bibliothèque]', dq)
  ok(!t.some(x => x.includes('sera effacé dès que')) && t.some(x => x.includes('Corbeille vidée (1 classeur).')), '   … sa base est effacée tout de suite (pas bloquée)', t)
  ok(!(await bases(p)).includes(PREFIXE + b1), '   … et n\'est pas recréée', await bases(p))
  await q.close()
  // Le classeur de cet onglet
  await p.evaluate(() => localStorage.setItem('mem-dernier-enregistrement', String(Date.now() - 5000)))
  await p.click('[data-action="corbeille-retour"]'); await recharger(p)
  await supprimerCarte(p, premier)
  await ouvrirCorbeille(p)
  await p.click(`${carteCorbeille(premier)} [data-action="supprimer-definitivement"]`); await attendreLaQuestion(p)
  d = await dialogue(p)
  ok(d?.textes[1] === 'Ses fichiers enregistrés ne sont pas effacés.', 'D4) Le premier (clé « mem-dernier-enregistrement ») : déjà enregistré', d?.textes)
  await p.click('dialog[open] [data-a="oui"]')
  await attendreQue(p, () => window.__bases().then(b => !b.includes('mem-tableau-local')))
  await p.waitForTimeout(500)
  v = await vue(p); t = await toasts(p)
  const cles = await p.evaluate(() => ({ session: localStorage.getItem('mem-session'), dernier: localStorage.getItem('mem-dernier-enregistrement'), dernierClasseur: localStorage.getItem('mem-teachingtool-dernier-classeur') }))
  ok(v.ouvert && !v.croix && v.titre === 'Bibliothèque — MEM teachingtool' && v.url === '?bibliotheque', '   … l\'onglet passe sans classeur : la bibliothèque reste, sans ×, « Bibliothèque — MEM teachingtool », ?bibliotheque', v)
  ok(!(await dialogue(p)) && t.some(x => x.includes('« Premier classeur » supprimé définitivement.')), '   … aucune fenêtre ici (« supprimé dans un autre onglet » n\'est pas pour lui)', t)
  ok(!(await bases(p)).includes(BASE_PREMIER) && cles.session === null && cles.dernier === null && cles.dernierClasseur === null, '   … « mem-tableau-local » effacée, « mem-session » et « mem-dernier-enregistrement » aussi', cles)
  const ligne = await p.evaluate(() => document.querySelector('.biblio-ouvert').hidden)
  ok(ligne, '   … plus de ligne du classeur ouvert')
  // Il n'écrit plus rien : ni la base, ni la session
  await p.evaluate(async () => { const t = window.__app.tableau; t.nouveauGeste(); t.poser(t.ordre.get(0), { id: 'Tz', type: 'trait', x: 0, y: 0, z: 1, auteur: t.moi, pts: [0, 0, 0.5, 9, 9, 0.5], couleur: '#000', taille: 3, opacite: 1, pression: false }) })
  await p.waitForTimeout(800)
  ok(!(await bases(p)).includes(BASE_PREMIER), '   … ce qui s\'écrit encore en mémoire ne recrée pas la base')
  await p.reload(); await pret(p); await p.waitForTimeout(400)
  ok(await p.evaluate(() => !window.__app && !document.querySelector('.bibliotheque').hidden && !document.querySelector('.biblio-vide').hidden), '   … au rechargement, la bibliothèque seule, vide')
  await ctx.close()
}

// (E, F. La version d'avant sur la même origine : retirées en rangeant la
// batterie dans le dépôt ; la version d'avant se construisait depuis un commit
// qui n'existe plus.)
const pretConstruit = p => p.waitForFunction(() => document.querySelector('.rang')?.textContent?.includes('/') || (document.querySelector('.bibliotheque') && !document.querySelector('.bibliotheque').hidden), null, { timeout: 30000 })
async function trait(p, x0, y0) {
  await p.mouse.move(x0, y0); await p.mouse.down()
  for (let i = 1; i <= 12; i++) await p.mouse.move(x0 + i * 12, y0 + Math.sin(i / 2) * 20)
  await p.mouse.up(); await p.waitForTimeout(150)
}
/** Dans la version construite : la bibliothèque, supprimer le seul classeur (le premier), le vider */
async function viderLePremierConstruit(p) {
  await p.evaluate(() => { const b = document.querySelector('.bouton-classeur'); if (b && b.getClientRects().length) b.click() })
  await p.waitForFunction(() => !document.querySelector('.bibliotheque').hidden && document.querySelector('.grille-classeurs.tous li .options-classeur'), null, { timeout: 10000 })
  await p.waitForTimeout(300)
  await p.click('.grille-classeurs.tous li .options-classeur'); await p.waitForTimeout(150)
  await p.click('.menu-flottant:not([hidden]) [data-action="supprimer"]'); await p.waitForTimeout(300)
  await p.click('[data-action="corbeille"]'); await p.waitForTimeout(200)
  await p.click('[data-action="vider-corbeille"]'); await p.waitForTimeout(200)
  await p.click('dialog[open] [data-a="oui"]')
}

// =====================================================================
// G. DEUX ONGLETS QUI ADOPTENT ENSEMBLE
// =====================================================================
if (seul('G')) {
  console.log('\n=== G. Deux onglets qui ouvrent la bibliothèque ensemble : une seule fiche ===')
  const ctx = await contexte()
  const p = await ouvrir(ctx, '', 'G')
  const [id] = await creerPlusieurs(p, ['Orpheline'], { traits: 4 })
  // L'index la perd (sa fiche seule s'en va ; la base et son identité restent)
  await p.evaluate(id => window.__registre.supprimerFiche(id), id)
  await p.goto('about:blank')
  const [a, b] = [await ctx.newPage(), await ctx.newPage()]
  suivre(a, 'G1'); suivre(b, 'G2')
  await Promise.all([a.goto(DEV + '?bibliotheque'), b.goto(DEV + '?bibliotheque')])
  await Promise.all([pret(a), pret(b)])
  await attendreQue(a, () => window.__registre.classeurs().then(l => l.some(f => f.nom === 'Orpheline')))
  await dort(1500)
  const fs = await a.evaluate(base => window.__registre.classeurs().then(l => l.filter(f => f.base === base)), PREFIXE + id)
  const ta = (await toasts(a)).concat(await toasts(b))
  ok(fs.length === 1 && fs[0].id === id && fs[0].nom === 'Orpheline' && fs[0].dossier === null, 'G1) Une seule fiche pour la base, avec son id et son nom', fs)
  ok(ta.filter(x => x.includes('Un classeur retrouvé dans ce navigateur a été remis dans la bibliothèque : « Orpheline ».')).length >= 1, '   … le message (dans l\'onglet qui l\'a adoptée)', ta)
  const cartes = await Promise.all([a, b].map(x => x.evaluate(() => [...document.querySelectorAll('.grille-classeurs.tous li')].map(li => li.querySelector('.carte-nom-classeur')?.textContent))))
  ok(cartes.every(c => c.filter(n => n === 'Orpheline').length === 1), '   … les deux bibliothèques la montrent une fois', cartes)
  await ctx.close()
}

// =====================================================================
// H. LES ORPHELINES
// =====================================================================
if (seul('H')) {
  console.log('\n=== H. Les orphelines : adoptée, effacée, laissée ; le premier jamais effacé ===')
  const ctx = await contexte()
  const p = await ouvrir(ctx, '', 'H')
  const premier = await p.evaluate(() => window.__app.classeur.id)
  const ids = await p.evaluate(async () => {
    const dem = await import('/src/classeurs/demarrage.ts'), bases = await import('/src/classeurs/bases.ts'), neuf = await import('/src/classeurs/neuf.ts')
    const pleine = dem.idClasseur(), vide = dem.idClasseur(), zero = dem.idClasseur()
    // La seule page de l'ordre est vide, mais la corbeille des pages a une page pleine
    await bases.creerBase(dem.baseDe(pleine), await window.__etatAvec({ traits: 0, jetee: 2 }), { id: pleine, nom: 'x' })
    // Sans identité rangée à côté
    await new Promise((ok, ko) => { const r = indexedDB.open(dem.baseDe(pleine)); r.onsuccess = () => { const db = r.result; const t = db.transaction(['custom'], 'readwrite'); t.objectStore('custom').delete('mem-classeur'); t.oncomplete = () => { db.close(); ok() }; t.onerror = ko } })
    // Vide au sens strict : une page blanche et sa naissance
    await bases.creerBase(dem.baseDe(vide), await neuf.etatNeuf('carreaux'), { id: vide, nom: 'Blanc' })
    // Sans aucune entrée (une création avortée)
    await new Promise((ok, ko) => { const r = indexedDB.open(dem.baseDe(zero), 1); r.onupgradeneeded = () => { r.result.createObjectStore('updates', { autoIncrement: true }); r.result.createObjectStore('custom') }; r.onsuccess = () => { r.result.close(); ok() }; r.onerror = ko })
    return { pleine, vide, zero }
  })
  // Le premier perd sa fiche (sa base n'a qu'une page blanche)
  await p.evaluate(id => window.__registre.retirerClasseur(id), premier)
  await p.goto('about:blank')
  const q = await ouvrir(ctx, '?bibliotheque', 'H2')
  await attendreQue(q, id => window.__registre.classeurParBase('mem-teachingtool-classeur-' + id).then(Boolean), ids.pleine)
  await dort(1200)
  const r = await q.evaluate(async ids => ({
    bases: await window.__bases(),
    pleine: await window.__registre.classeurParBase('mem-teachingtool-classeur-' + ids.pleine) ?? null,
    vide: await window.__registre.classeurParBase('mem-teachingtool-classeur-' + ids.vide) ?? null,
    premier: await window.__registre.classeurParBase('mem-tableau-local') ?? null,
  }), ids)
  ok(r.pleine && r.pleine.nom === 'Classeur retrouvé' && r.pleine.id !== ids.pleine && r.bases.includes(PREFIXE + ids.pleine), 'H1) La page vide mais la corbeille de pages pleine : adoptée (« Classeur retrouvé », un id neuf), pas effacée', r.pleine)
  ok(!r.bases.includes(PREFIXE + ids.zero), 'H2) Sans aucune entrée : effacée', r.bases)
  ok(!r.vide && r.bases.includes(PREFIXE + ids.vide), 'H3) Vide au sens strict (une page blanche) : laissée, ni adoptée ni effacée', r.bases)
  ok(!r.premier && r.bases.includes(BASE_PREMIER), 'H4) La base du premier, vide et sans fiche : jamais effacée (ni adoptée)', r.bases)
  const formes = await formesDe(q, PREFIXE + ids.pleine)
  ok(formes.formes === 2 && formes.pages === 1, '   … la base adoptée est intacte (2 formes, dans la page jetée)', formes)
  await ctx.close()
}

// =====================================================================
// I. L'INDEX SUPPRIMÉ À LA MAIN
// =====================================================================
if (seul('I')) {
  console.log('\n=== I. L\'index supprimé à la main : les classeurs reviennent ===')
  const ctx = await contexte()
  const p = await ouvrir(ctx, '', 'I')
  await ecrireTraits(p, 3)
  const premier = await p.evaluate(() => window.__app.classeur.id)
  await p.evaluate(async id => { await window.__registre.modifierClasseur(id, x => { x.nom = 'Géométrie' }); await window.__app.tableau.noterIdentite({ id, nom: 'Géométrie' }) }, premier)
  const [al, be] = await creerPlusieurs(p, ['Alpha', 'Bêta'], { traits: 2 })
  await p.evaluate(() => new Promise((ok, ko) => { window.__registre.fermer(); const r = indexedDB.deleteDatabase('mem-teachingtool-bibliotheque'); r.onsuccess = ok; r.onerror = ko; r.onblocked = () => {} }))
  ok(!(await bases(p)).includes(INDEX), 'I1) L\'index est supprimé')
  await p.goto(DEV); await pret(p); await p.waitForTimeout(1500)
  const nom = await p.evaluate(() => window.__app.classeur.nom)
  ok(nom === 'Géométrie' && (await p.title()) === 'Géométrie — MEM teachingtool', 'I2) Le premier revient par la reprise, avec le nom rangé à côté de son document', nom)
  await ouvrirBiblio(p)
  await attendreQue(p, () => window.__registre.classeurs().then(l => l.length >= 3))
  await p.waitForTimeout(500)
  const fs = await p.evaluate(() => window.__registre.classeurs())
  const t = await toasts(p)
  ok(fs.some(f => f.id === al && f.nom === 'Alpha') && fs.some(f => f.id === be && f.nom === 'Bêta') && fs.length === 3, 'I3) À l\'ouverture de la bibliothèque, « Alpha » et « Bêta » reviennent avec leur id et leur nom', fs.map(f => [f.id, f.nom]))
  ok(t.some(x => x.includes('2 classeurs retrouvés dans ce navigateur ont été remis dans la bibliothèque')), '   … « 2 classeurs retrouvés… »', t)
  await p.click(`.grille-classeurs.tous li[data-cle="${al}"] a.carte-classeur`)
  await p.waitForFunction(id => window.__app?.classeur.id === id && document.querySelector('.rang')?.textContent?.includes('/'), al, { timeout: 20000 })
  await p.waitForTimeout(400)
  ok(await p.evaluate(() => window.__app.tableau.pages.get(window.__app.tableau.ordre.get(0)).get('formes').size) === 2, '   … et s\'ouvrent avec ce qu\'ils avaient')
  await ctx.close()
}

// =====================================================================
// J. EFFACER PENDANT UNE LECTURE DU TRAVAILLEUR
// =====================================================================
if (seul('J')) {
  console.log('\n=== J. Effacer pendant une lecture du travailleur ===')
  const ctx = await contexte()
  const p = await ouvrir(ctx, '', 'J')
  const [gros, suivant, tenu] = await p.evaluate(async () => {
    const dem = await import('/src/classeurs/demarrage.ts'), bases = await import('/src/classeurs/bases.ts')
    const ids = []
    for (const [nom, o] of [['Gros', { traits: 200, pages: 80, parPage: 300 }], ['Suivant', { traits: 2 }], ['Tenu', { traits: 2 }]]) {
      const id = dem.idClasseur(), etat = await window.__etatAvec(o)
      await window.__registre.creerClasseur({ id, base: dem.baseDe(id), nom, dossier: null, etiquettes: [], cree: Date.now(), modifie: Date.now(), ouvert: 0, pages: 1 }, b => bases.creerBase(b, etat, { id, nom }))
      ids.push(id)
    }
    return ids
  })
  const r = await p.evaluate(async id => {
    const eff = await import('/src/classeurs/effacer.ts')
    const f = await window.__registre.classeur(id)
    const debut = performance.now()
    const lecture = window.__ecrivain.fabriquerFichier(f.base, { nom: f.nom, id }).then(x => 'lu ' + x.pages, e => 'erreur ' + (e.raison ?? e.message))
    const lecture2 = window.__ecrivain.examinerBase(f.base).then(x => 'examiné ' + x.examen.formes, e => 'erreur ' + (e.raison ?? e.message))
    const r = await eff.effacerLesClasseurs(window.__registre, [f], {})
    return { effaces: r.effaces.length, bloques: r.bloques.length, echecs: r.echecs.length, retenus: r.retenus, lecture: await lecture, lecture2: await lecture2, ms: Math.round(performance.now() - debut), bases: await window.__bases(), fiche: await window.__registre.classeur(id) ?? null }
  }, gros)
  ok(r.effaces === 1 && r.bloques === 0 && !r.bases.includes(PREFIXE + gros) && r.fiche === null,
    `J1) Effacé pendant que le travailleur le lit et calcule : 'efface' (${r.ms} ms ; retenue un instant par une lecture en cours : ${r.retenus}), la base et la fiche parties`, r)
  ok(/^(lu|erreur) /.test(r.lecture) && /^(examiné|erreur) /.test(r.lecture2), '   … les lectures finissent (lues, ou une erreur)', [r.lecture, r.lecture2])
  // Une connexion ouverte par ouvrirBaseExistante, gardée : elle se ferme d'elle-même
  const r2 = await p.evaluate(async id => {
    const bases = await import('/src/classeurs/bases.ts'), eff = await import('/src/classeurs/effacer.ts')
    const db = await bases.ouvrirBaseExistante('mem-teachingtool-classeur-' + id)
    window.__garde = db
    const r = await eff.effacerLesClasseurs(window.__registre, [await window.__registre.classeur(id)], {})
    return { effaces: r.effaces.length, bloques: r.bloques.length, bases: await window.__bases() }
  }, tenu)
  ok(r2.effaces === 1 && r2.bloques === 0 && !r2.bases.includes(PREFIXE + tenu), 'J2) Avec une connexion ouverte par ouvrirBaseExistante : elle se ferme, \'efface\'', r2)
  // Le travailleur sert encore, et le classeur suivant s'ouvre
  await p.goto(DEV + '?classeur=' + suivant)
  await p.waitForFunction(id => window.__app?.classeur.id === id && document.querySelector('.rang')?.textContent?.includes('/'), suivant, { timeout: 20000 })
  const f2 = await p.evaluate(id => window.__ecrivain.fabriquerFichier('mem-teachingtool-classeur-' + id, { nom: 'Suivant', id }).then(x => x.pages), suivant)
  ok(f2 === 1, 'J3) Le classeur suivant s\'ouvre, et l\'écrivain fabrique encore ses fichiers', f2)
  // Un onglet qui tient vraiment la base (une connexion qui ne se ferme pas) :
  // « … dès que l'onglet où il est encore ouvert sera fermé », puis le ménage
  const [bloque] = await creerPlusieurs(p, ['Tenu ailleurs'], { traits: 1 })
  await p.evaluate(id => localStorage.setItem('mem-session:' + id, '{}'), bloque)
  const w = await ctx.newPage(); suivre(w, 'J-tient')
  await w.goto(DEV + '?bibliotheque'); await pret(w)
  await w.evaluate(base => new Promise(ok => { const r = indexedDB.open(base); r.onsuccess = () => { window.__tient = r.result; ok() } }), PREFIXE + bloque)
  await p.bringToFront()
  await ouvrirBiblio(p)
  await supprimerCarte(p, bloque)
  await ouvrirCorbeille(p)
  await p.click(`${carteCorbeille(bloque)} [data-action="supprimer-definitivement"]`); await attendreLaQuestion(p)
  await p.click('dialog[open] [data-a="oui"]')
  await attendreQue(p, () => (window.__toasts || []).some(x => x.includes('sera effacé dès que')), null, 10000)
  let t = await toasts(p)
  let x = await p.evaluate(async id => ({ bases: await window.__bases(), fiche: await window.__registre.classeur(id) ?? null }), bloque)
  ok(t.some(m => m.includes('Le classeur sera effacé dès que l\'onglet où il est encore ouvert sera fermé.')) && x.bases.includes(PREFIXE + bloque) && x.fiche?.effacement > 0,
    'J4) Une base tenue par un onglet : « Le classeur sera effacé dès que l\'onglet où il est encore ouvert sera fermé. », la fiche cachée (effacement)', { t, f: x.fiche })
  ok(!(await vue(p)).corbeille?.cartes.some(c => c.cle === bloque), '   … il n\'est plus dans la corbeille')
  await w.close()
  await attendreQue(p, id => window.__bases().then(b => !b.includes('mem-teachingtool-classeur-' + id)), bloque)
  await p.waitForTimeout(500)
  x = await p.evaluate(async id => ({ bases: await window.__bases(), fiche: await window.__registre.classeur(id) ?? null, session: localStorage.getItem('mem-session:' + id) }), bloque)
  ok(!x.bases.includes(PREFIXE + bloque) && x.fiche === null && x.session === null, '   … l\'onglet fermé : la base s\'efface, puis la fiche et ses clés s\'en vont', x)
  await ctx.close()
}

// =====================================================================
// K. LA PLACE
// =====================================================================
if (seul('K')) {
  console.log('\n=== K. La place ===')
  const ctx = await contexte()
  const p = await ouvrir(ctx, '', 'K')
  await ouvrirBiblio(p)
  let v = await vue(p)
  ok(/^Ce navigateur garde \d+(,\d)? (Ko|Mo|Go) pour ce site\.$/.test(v.place?.texte ?? '') && !v.place.alerte, 'K1) « Ce navigateur garde … pour ce site. » en bas du bandeau', v.place)
  const r = await p.evaluate(() => { const b = document.querySelector('.biblio-place').getBoundingClientRect(), t = document.querySelector('.biblio-tete').getBoundingClientRect(); return { dans: b.bottom <= t.bottom + 1 && b.top >= t.top, bas: Math.round(t.bottom - b.bottom) } })
  ok(r.dans && r.bas <= 12, '   … dans le bandeau, en bas', r)
  const ctx2 = await contexte()
  await ctx2.addInitScript(() => { navigator.storage.estimate = async () => ({ usage: 850 * 1024 * 1024, quota: 1000 * 1024 * 1024 }) })
  const q = await ouvrir(ctx2, '', 'K2')
  await ouvrirBiblio(q)
  v = await vue(q)
  ok(v.place?.alerte && v.place.texte === 'Le navigateur manque de place (85 % utilisés) : enregistrez vos classeurs dans des fichiers, puis videz la corbeille.' && await q.evaluate(() => document.querySelector('.biblio-place').getAttribute('role')) === 'alert',
    'K2) Au-delà de 80 % : « Le navigateur manque de place (85 % utilisés) : … », en alerte', v.place)
  const ctx3 = await contexte()
  await ctx3.addInitScript(() => { try { Object.defineProperty(StorageManager.prototype, 'estimate', { value: undefined, configurable: true }) } catch { /* rien */ } })
  const w = await ouvrir(ctx3, '', 'K3')
  await ouvrirBiblio(w)
  ok((await vue(w)).place === null, 'K3) Sans estimate : rien')
  await Promise.all([ctx.close(), ctx2.close(), ctx3.close()])
}

// =====================================================================
// L. LES EFFACEMENTS INTERROMPUS
// =====================================================================
if (seul('L')) {
  console.log('\n=== L. Les effacements interrompus, relancés au démarrage ; le garde-fou du premier ===')
  const ctx = await contexte()
  const p = await ouvrir(ctx, '', 'L')
  const [vieux, recent] = await creerPlusieurs(p, ['Vieux', 'Récent'], { traits: 1 })
  await p.evaluate(({ vieux, recent }) => Promise.all([
    window.__registre.modifierClasseur(vieux, x => { x.effacement = Date.now() - 60_000 }),
    window.__registre.modifierClasseur(recent, x => { x.effacement = Date.now() }),
    localStorage.setItem('mem-session:' + vieux, '{}'),
  ]), { vieux, recent })
  await p.goto(DEV + '?bibliotheque'); await pret(p)
  await p.evaluate(() => window.__registre.menage)
  let r = await p.evaluate(async ({ vieux, recent }) => ({ bases: await window.__bases(), vieux: await window.__registre.classeur(vieux) ?? null, recent: await window.__registre.classeur(recent) ?? null, session: localStorage.getItem('mem-session:' + vieux) }), { vieux, recent })
  ok(!r.bases.includes(PREFIXE + vieux) && r.vieux === null && r.session === null, 'L1) Un effacement interrompu (plus de 30 s) : repris au démarrage, la base et la fiche partent', r)
  ok(r.bases.includes(PREFIXE + recent) && r.recent?.effacement > 0, '   … un effacement tout récent (peut-être en cours dans un autre onglet) attend', r.recent)
  // Le premier, effacé à moitié : rien de plus que ce qu'on avait décidé d'effacer
  const ctx2 = await contexte()
  let q = await ouvrir(ctx2, '', 'L2')
  await ecrireTraits(q, 2)
  const id2 = await q.evaluate(async () => {
    const id = window.__app.classeur.id
    const v = (await window.__ecrivain.vecteurDeLaBase('mem-tableau-local')).vecteur
    await window.__registre.modifierClasseur(id, x => { x.effacement = Date.now() - 60_000; x.vecteur = v })
    return id
  })
  await q.goto(DEV + '?bibliotheque'); await pret(q)
  await q.evaluate(() => window.__registre.menage)
  r = await q.evaluate(async id => ({ bases: await window.__bases(), fiche: await window.__registre.classeur(id) ?? null }), id2)
  ok(!r.bases.includes(BASE_PREMIER) && r.fiche === null, 'L2) Le premier à moitié effacé, sans rien de plus : effacé au démarrage', r)
  await ctx2.close()
  // … ou avec plus (la version d'avant y a écrit depuis) : gardé, puis adopté
  const ctx3 = await contexte()
  q = await ouvrir(ctx3, '', 'L3')
  await ecrireTraits(q, 2)
  const id3 = await q.evaluate(async () => {
    const id = window.__app.classeur.id
    const v = (await window.__ecrivain.vecteurDeLaBase('mem-tableau-local')).vecteur
    await window.__registre.modifierClasseur(id, x => { x.effacement = Date.now() - 60_000; x.vecteur = v })
    return id
  })
  await ecrireTraits(q, 3)
  await q.goto(DEV + '?bibliotheque'); await pret(q)
  await q.evaluate(() => window.__registre.menage)
  await attendreQue(q, () => window.__registre.classeurParBase('mem-tableau-local').then(Boolean))
  await q.waitForTimeout(400)
  r = await q.evaluate(async () => ({ bases: await window.__bases(), fiche: await window.__registre.classeurParBase('mem-tableau-local') ?? null }))
  const fo = await formesDe(q, BASE_PREMIER)
  ok(r.bases.includes(BASE_PREMIER) && fo.formes === 5, 'L3) Le premier à moitié effacé, mais qui a plus depuis : sa base est gardée, avec tout', { bases: r.bases, fo })
  ok(r.fiche && !r.fiche.effacement && r.fiche.id === id3 && r.fiche.nom === 'Premier classeur', '   … et revient dans la bibliothèque (adoptée : son id et son nom rangés à côté)', r.fiche)
  await Promise.all([ctx.close(), ctx3.close()])
}

// =====================================================================
// M. DEUX ONGLETS QUI VIDENT ENSEMBLE
// =====================================================================
if (seul('M')) {
  console.log('\n=== M. Deux onglets qui vident ensemble ===')
  const ctx = await contexte()
  const p = await ouvrir(ctx, '', 'M1')
  const [x, y] = await creerPlusieurs(p, ['X', 'Y'], { traits: 1 })
  const q = await ouvrir(ctx, '?bibliotheque', 'M2')
  const vider = pg => pg.evaluate(async ids => {
    const eff = await import('/src/classeurs/effacer.ts')
    const fs = (await Promise.all(ids.map(id => window.__registre.classeur(id)))).filter(Boolean)
    try { const r = await eff.effacerLesClasseurs(window.__registre, fs, {}); return { effaces: r.effaces.length, bloques: r.bloques.length, echecs: r.echecs.length } } catch (e) { return { erreur: String(e) } }
  }, [x, y])
  const [ra, rb] = await Promise.all([vider(p), vider(q)])
  await p.waitForTimeout(500)
  const fin = await p.evaluate(async ids => ({ bases: await window.__bases(), fiches: (await Promise.all(ids.map(id => window.__registre.classeur(id)))).filter(Boolean).length }), [x, y])
  ok(!ra.erreur && !rb.erreur && ra.echecs === 0 && rb.echecs === 0, 'M1) Rien ne lève dans aucun des deux', { ra, rb })
  ok(!fin.bases.includes(PREFIXE + x) && !fin.bases.includes(PREFIXE + y) && fin.fiches === 0, '   … les bases et les fiches sont parties', fin)
  await ctx.close()
}

// =====================================================================
// N. LE TÉLÉPHONE ET LE CLAVIER
// =====================================================================
if (seul('N')) {
  console.log('\n=== N. Le téléphone (390 × 844) et le clavier ===')
  const ctx = await contexte({ viewport: { width: 390, height: 844 }, hasTouch: true, isMobile: true, deviceScaleFactor: 2 })
  const p = await ouvrir(ctx, '', 'N')
  const ids = await creerPlusieurs(p, ['Symétrie centrale', 'Fractions', 'Équations du premier degré'])
  await ouvrirBiblio(p)
  for (const id of ids.slice(0, 2)) await supprimerCarte(p, id)
  let v = await vue(p)
  const bandeau = await p.evaluate(() => { const b = document.querySelector('[data-action="corbeille"]').getBoundingClientRect(); return { h: Math.round(b.height), l: Math.round(b.width), droite: Math.round(b.right) } })
  ok(v.bouton.court === '2' && bandeau.h >= 44 && bandeau.droite <= 390 && v.largeur <= v.vue, 'N1) Au téléphone : l\'icône et « 2 », 44 px, sans défilement de côté', { b: v.bouton, bandeau, l: v.largeur })
  await p.tap('[data-action="corbeille"]'); await p.waitForTimeout(300)
  v = await vue(p)
  ok(v.corbeille?.cartes.length === 2 && v.corbeille.cartes.every(c => c.hauteurs.every(h => h >= 44)) && v.largeur <= v.vue, '   … la vue de la corbeille : deux cartes, des boutons de 44 px, rien ne dépasse', v.corbeille)
  await p.screenshot({ path: CAPTURES + 'N-telephone.png' })
  await p.tap(`${carteCorbeille(ids[0])} [data-action="remettre"]`); await p.waitForTimeout(300)
  ok(!(await fiche(p, ids[0])).corbeille, '   … « Remettre » au doigt')
  await ctx.close()
  // Le clavier, au PC
  const ctx2 = await contexte()
  const q = await ouvrir(ctx2, '', 'N2')
  const [k1, k2] = await creerPlusieurs(q, ['Un', 'Deux'])
  await ouvrirBiblio(q)
  await supprimerCarte(q, k1); await supprimerCarte(q, k2)
  await q.focus('[data-action="corbeille"]'); await q.keyboard.press('Enter'); await q.waitForTimeout(250)
  const ordre = []
  for (let i = 0; i < 4; i++) { await q.keyboard.press('Tab'); ordre.push(await q.evaluate(() => (document.activeElement?.dataset.action ?? '') + '@' + (document.activeElement?.closest('li[data-cle]')?.dataset.cle ?? ''))) }
  ok(ordre[0] === 'supprimer-definitivement@' + k2 && ordre[1] === 'remettre@' + k1 && ordre[2] === 'supprimer-definitivement@' + k1, 'N2) Au clavier : Entrée ouvre, Tab va de bouton en bouton', ordre)
  await q.keyboard.press('Shift+Tab'); await q.keyboard.press('Shift+Tab'); await q.keyboard.press('Enter'); await q.waitForTimeout(300)
  ok(!(await fiche(q, k1)).corbeille, '   … Entrée sur « Remettre »')
  await q.keyboard.press('Escape'); await q.waitForTimeout(200)
  const vq = await vue(q)
  ok(!vq.corbeille && vq.focus === 'corbeille', '   … Échap ramène aux cartes, le focus sur « Corbeille »', vq.focus)
  await ctx2.close()
}

// =====================================================================
// O. LA VERSION D'UN SEUL FICHIER (file://)
// =====================================================================
if (seul('O')) {
  console.log('\n=== O. La version d\'un seul fichier (file://) ===')
  const ctx = await contexte()
  const p = await ctx.newPage(); suivre(p, 'O')
  await p.goto('file://' + R + '/dist/index.html'); await pretConstruit(p); await p.waitForTimeout(800)
  await trait(p, 300, 250); await p.waitForTimeout(800)
  await viderLePremierConstruit(p)
  await attendreQue(p, () => indexedDB.databases().then(l => !l.some(d => d.name === 'mem-tableau-local')))
  await p.waitForTimeout(500)
  const t = await toasts(p)
  ok(t.some(x => x.includes('Corbeille vidée (1 classeur).')) && (await p.title()) === 'Bibliothèque — MEM teachingtool', 'O1) En file:// : supprimer, vider, la base effacée', t)
  await ctx.close()
}

await nav.close()
const autres = erreurs.filter(e => !/WebSocket|\[vite\]/.test(e))
ok(!autres.length, `Aucune erreur JS (${autres.length})`, autres.slice(0, 10))
console.log(echecs ? `\n${echecs} ÉCHEC(S)` : '\nTout est vert.')
process.exit(echecs ? 1 : 0)
