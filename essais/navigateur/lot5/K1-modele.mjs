// ESSAI DU MORCEAU K1-modele (lot 5) : les données, sans rien de visible.
// A. Le serveur de développement (http://localhost:5173, window.__app) : des
//    formes qui portent les quatre champs (verrou, fixe, groupe, rotation),
//    copiées dans un onglet et collées dans un autre (par le navigateur,
//    localStorage) : verrou, fixation et rotation gardés, un groupe neuf
//    commun, l'image fixée sous ce qui était sur la page d'arrivée.
// B. Un .memc qui porte ces champs (une étape « réglage » de plus) ;
// C. un film élève du lot 5 (exporter, ecrireFilm) qui porte ces champs.
//    (Rangé dans le dépôt : leur lecture par la version d'avant le lot 5,
//    construite depuis un commit qui n'existe plus, est retirée.)
// D. Une étape « réglage » écrite après une séance (deux heures plus tard),
//    ou pendant : la fenêtre Publier propose les mêmes séances, la revue
//    compte les mêmes gestes.
// E. Un tableau sans ces champs s'affiche et se prend comme avant : un clic
//    prend, un glisser déplace, rien n'ajoute de champ.
// Une ligne « ✓ » ou
// « ✗ ÉCHEC » par vérification ; code de sortie 1 s'il y a un échec ou une
// erreur JS.
import { RACINE_ESSAIS, RACINE_DEPOT } from '../commun/racines.mjs'
import { chromium } from '../commun/playwright.mjs'
import { createServer } from 'node:http'
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs'
import { extname, join, normalize } from 'node:path'

const S = `${RACINE_ESSAIS}`
const ICI = S + '/lot5/K1/'
const F = ICI + 'fichiers/'
const DEV = 'http://localhost:5173/'
mkdirSync(F, { recursive: true })

let echecs = 0
const ok = (c, m, d) => { if (!c) echecs++; console.log(c ? "✓" : "✗ ÉCHEC", m, (!c || process.env.DETAIL) && d !== undefined ? '— ' + JSON.stringify(d).slice(0, 1200) : '') }
const erreurs = []
const suivre = (p, nom) => {
  p.on('pageerror', e => erreurs.push(`${nom}: ${e.message}`))
  p.on('console', m => { if (m.type() === 'error' && !/Failed to load resource|ERR_CERT|net::|accounts\.google/.test(m.text())) erreurs.push(`${nom}: ${m.text()}`) })
}
const pret = p => p.waitForFunction(() => document.querySelector('.rang')?.textContent?.includes('/'), null, { timeout: 30000 })


const nav = await chromium.launch({ env: { ...process.env, LANG: 'C.UTF-8', LC_ALL: 'C.UTF-8' } })
async function contexte(o = {}) {
  const c = await nav.newContext({ viewport: { width: 1366, height: 768 }, acceptDownloads: true, ...o })
  // Ouvrir un classeur par le choix de fichier d'avant (Chromium sans fenêtre refuse showOpenFilePicker)
  await c.addInitScript(() => { window.showOpenFilePicker = undefined })
  // Google : rien à charger ici (la fenêtre Publier prépare sa connexion)
  await c.route(/accounts\.google\.com|apis\.google\.com/, r => r.fulfill({ contentType: 'text/javascript', body: '' }))
  return c
}
async function ouvrirDev(ctx, nom) {
  const p = await ctx.newPage(); suivre(p, nom)
  await p.goto(DEV); await pret(p)
  await p.waitForFunction(() => window.__app && window.__app.page)
  await p.waitForTimeout(500)
  await p.evaluate(() => { window.__app.reconnaissance = false })
  return p
}

/** Des images de couleur unie (data:image/png), pour les retrouver peintes */
const IMAGES = async () => {
  const unie = (l, h, c) => { const cv = Object.assign(document.createElement('canvas'), { width: l, height: h }); const g = cv.getContext('2d'); g.fillStyle = c; g.fillRect(0, 0, l, h); return cv.toDataURL('image/png') }
  return { vert: unie(200, 100, '#00c000'), magenta: unie(120, 80, '#e000e0') }
}

/** Le contenu d'essai : un énoncé fixé en fond (vert), une image libre
 *  (magenta), un trait verrouillé, un trait et un triangle du même groupe,
 *  une formule tournée de 0,5 rad. Chaque forme en son geste. */
const POSER_TOUT = async (images) => {
  const a = window.__app, t = a.tableau, p = a.page
  const banque = t.doc.getMap('images')
  banque.set('k1-vert', images.vert); banque.set('k1-magenta', images.magenta)
  const z = () => Date.now() + Math.random()
  const moi = t.moi
  const trait = (id, x, y, plus = {}) => ({ id, type: 'trait', x, y, z: z(), auteur: moi, pts: [0, 0, 0.5, 60, 14, 0.5, 120, 0, 0.5, 180, 14, 0.5], couleur: '#1b2230', taille: 6, opacite: 1, pression: false, ...plus })
  const formes = [
    { id: 'k1-enonce', type: 'image', x: 120, y: 120, z: z() - 1e7, auteur: moi, src: 'k1-vert', l: 200, h: 100, m: [1, 0, 0, 1], fixe: true },
    { id: 'k1-libre', type: 'image', x: 420, y: 120, z: z(), auteur: moi, src: 'k1-magenta', l: 120, h: 80, m: [1, 0, 0, 1] },
    trait('k1-verrou', 120, 300, { verrou: true }),
    trait('k1-m1', 120, 380, { groupe: 'k1-groupe' }),
    { id: 'k1-m2', type: 'polygone', x: 420, y: 330, z: z(), auteur: moi, pts: [0, 0, 120, 0, 0, 90], ferme: true, couleur: '#1f5fbf', taille: 4, groupe: 'k1-groupe' },
    { id: 'k1-formule', type: 'formule', x: 620, y: 300, z: z(), auteur: moi, latex: '\\frac{a}{b}=k', couleur: '#d0342c', taille: 40, rotation: 0.5 },
  ]
  for (const f of formes) { t.nouveauGeste(); t.poser(p, f); await new Promise(r => setTimeout(r, 30)) }
  return formes.map(f => f.id)
}
const formesDe = (p) => p.evaluate(() => window.__app.formes.map(f => JSON.parse(JSON.stringify(f))))

// =====================================================================
console.log('=== A. copier dans un onglet, coller dans un autre ===')
const ctxA = await contexte()
const A = await ouvrirDev(ctxA, 'onglet A')
const B = await ouvrirDev(ctxA, 'onglet B')
await A.bringToFront()
const images = await A.evaluate(IMAGES)
const ids = await A.evaluate(POSER_TOUT, images)
await A.waitForTimeout(300)
const dansA = await formesDe(A)
ok(dansA.filter(f => ids.includes(f.id)).length === 6 && dansA.find(f => f.id === 'k1-formule')?.rotation === 0.5 && dansA.find(f => f.id === 'k1-enonce')?.fixe === true,
  'A1) Dans A : les six formes posées, avec leurs champs (tableau.poser)', dansA.map(f => [f.id, f.verrou, f.fixe, f.groupe, f.rotation]))
// Un trait déjà sur la page B : l'image fixée collée passera dessous
await B.bringToFront()
await B.evaluate(() => { const a = window.__app, t = a.tableau; t.nouveauGeste(); t.poser(a.page, { id: 'k1-deja', type: 'trait', x: 0, y: 0, z: Date.now(), auteur: t.moi, pts: [0, 0, 0.5, 40, 0, 0.5], couleur: '#1b2230', taille: 3, opacite: 1, pression: false }) })
await A.bringToFront()
const copie = await A.evaluate(ids => { const a = window.__app; a.selection.clear(); for (const id of ids) a.selection.add(id); return a.copier(false) }, ids)
const gardee = await A.evaluate(() => { const k = Object.keys(localStorage).find(k => /presse|copie/i.test(k)); return k ? JSON.parse(localStorage.getItem(k)) : null })
ok(copie && gardee?.formes?.length === 6 && gardee.formes.some(f => f.verrou === true) && gardee.formes.some(f => f.fixe === true) && gardee.formes.some(f => f.rotation === 0.5) && gardee.formes.filter(f => f.groupe === 'k1-groupe').length === 2,
  'A2) Ctrl+C dans A : la copie gardée dans le navigateur porte verrou, fixe, groupe et rotation', gardee?.formes?.map(f => [f.id, f.verrou, f.fixe, f.groupe, f.rotation]))
await B.bringToFront()
const avantB = await formesDe(B)
const colle = await B.evaluate(() => window.__app.coller())
await B.waitForTimeout(300)
const apresB = await formesDe(B)
const neuves = apresB.filter(f => !avantB.some(g => g.id === f.id))
const imgFixe = neuves.find(f => f.type === 'image' && f.fixe)
const imgLibre = neuves.find(f => f.type === 'image' && !f.fixe)
const traits = neuves.filter(f => f.type === 'trait')
const verrouille = traits.find(f => f.verrou)
const membres = neuves.filter(f => f.groupe)
const formule = neuves.find(f => f.type === 'formule')
ok(colle && neuves.length === 6, 'A3) Ctrl+V dans B (la copie vient du navigateur) : les six formes collées', neuves.map(f => f.type))
ok(!!verrouille && traits.filter(f => f.verrou).length === 1 && !neuves.some(f => ids.includes(f.id)), '   … le trait verrouillé l\'est encore (identifiants neufs)', traits.map(f => [f.verrou]))
ok(!!imgFixe && !!imgLibre && !imgLibre.fixe, '   … l\'image fixée l\'est encore, la libre ne l\'est pas', neuves.filter(f => f.type === 'image').map(f => [f.src, f.fixe]))
ok(!!imgFixe && apresB.filter(f => f.id !== imgFixe.id).every(f => f.z > imgFixe.z), '   … l\'image fixée passe sous tout ce qui est sur la page B (le trait qui y était compris)', apresB.map(f => [f.id, f.z]))
ok(formule?.rotation === 0.5, '   … la formule garde sa rotation (0,5)', formule)
ok(membres.length === 2 && membres[0].groupe === membres[1].groupe && membres[0].groupe !== 'k1-groupe' && membres.some(f => f.type === 'polygone') && membres.some(f => f.type === 'trait'),
  '   … le trait et le triangle ont un groupe neuf, commun, qui n\'est pas celui de A', membres.map(f => [f.type, f.groupe]))
const pile = await B.evaluate(() => { const a = window.__app; const n = a.tableau.annulationDe(a.page).undoStack.length; return n })
await B.evaluate(() => window.__app.annuler?.() ?? window.__app.tableau.annuler(window.__app.page))
await B.waitForTimeout(200)
ok((await formesDe(B)).length === avantB.length, '   … Ctrl+Z retire tout le collage d\'un coup', { pile })

// =====================================================================
console.log('=== B. le .memc du lot 5 ===')
// Une étape « réglage » de plus dans A, puis le fichier
await A.bringToFront()
await A.evaluate(() => { const a = window.__app, t = a.tableau; t.nouveauGeste(); t.modifier(a.page, [{ id: 'k1-m1', patch: { verrou: true } }, { id: 'k1-m2', patch: { verrou: true } }], { note: 'reglage' }) })
await A.waitForTimeout(300)
const memc = await A.evaluate(async () => {
  const { ecrireTableau } = await import('/src/fichier.ts')
  const o = new Uint8Array(await ecrireTableau(window.__app.tableau.doc).arrayBuffer())
  let s = ''; for (let i = 0; i < o.length; i += 0x8000) s += String.fromCharCode.apply(null, o.subarray(i, i + 0x8000))
  return { b64: btoa(s), reglages: window.__app.tableau.film.toArray().filter(e => e.reglage).length }
})
const CHEMIN_MEMC = F + 'Lot 5 champs.memc'
writeFileSync(CHEMIN_MEMC, Buffer.from(memc.b64, 'base64'))
ok(memc.reglages === 1, 'B0) Le classeur de A a une étape « réglage » dans son film (le verrou du groupe)', memc)

// (B1, B2. La version d'avant ouvrait ce .memc : retiré en rangeant la batterie
// dans le dépôt, comme C1 plus bas.)

// =====================================================================
console.log('=== C. un film élève du lot 5 ===')
const film = await A.evaluate(async () => {
  const ex = await import('/src/revoir/exporter.ts'), fo = await import('/src/revoir/format.ts')
  const t = window.__app.tableau
  const s = ex.seancesDuFilm(t.film.toArray())[0]
  const f = ex.exporter(t, { de: s.de, a: s.a, pages: t.ordre.toArray(), titre: 'Lot 5, champs nouveaux' })
  const toutes = [...f.pages.flatMap(p => p.formes), ...f.etapes.flatMap(e => e.o.filter(o => o[0] === '=').map(o => o[1]))]
  return { texte: await fo.ecrireFilm(f), etapes: f.etapes.length, v: f.v, champs: { verrou: toutes.some(x => x.verrou), fixe: toutes.some(x => x.fixe), groupe: toutes.some(x => x.groupe), rotation: toutes.some(x => x.rotation === 0.5) } }
})
ok(film.v === 1 && film.champs.verrou && film.champs.fixe && film.champs.groupe && film.champs.rotation,
  'C0) Le film élève du lot 5 (version 1) porte verrou, fixe, groupe et rotation', { v: film.v, champs: film.champs, etapes: film.etapes })
writeFileSync(F + 'seance-lot5.mem', film.texte)
// (C1. Le lecteur d'avant lisait ce film : retiré en rangeant la batterie dans le
// dépôt ; la version d'avant se construisait depuis un commit qui n'existe plus.)

// =====================================================================
console.log('=== D. une étape « réglage » après la séance, ou pendant ===')
const ctxD = await contexte()
const D = await ouvrirDev(ctxD, 'réglage')
await D.evaluate(() => { const vrai = Date.now.bind(Date); window.__dec = 0; Date.now = () => vrai() + window.__dec })
const avancer = ms => D.evaluate(ms => { window.__dec += ms }, ms)
const GESTE = ({ id, x, y }) => { const a = window.__app, t = a.tableau; t.nouveauGeste(); t.poser(a.page, { id, type: 'trait', x, y, z: Date.now(), auteur: t.moi, pts: [0, 0, 0.5, 60, 14, 0.5, 120, 0, 0.5], couleur: '#1b2230', taille: 3, opacite: 1, pression: false }) }
const REGLER = ({ ids, oui }) => { const a = window.__app, t = a.tableau; t.nouveauGeste(); t.modifier(a.page, ids.map(id => ({ id, patch: { verrou: oui ? true : undefined } })), { note: 'reglage' }) }
await avancer(30 * 60_000)
for (let i = 0; i < 4; i++) { await avancer(3000); await D.evaluate(GESTE, { id: 'd' + i, x: 200, y: 150 + i * 60 }); await D.waitForTimeout(60) }
// Pendant la séance : un réglage entre deux gestes
await avancer(3000); await D.evaluate(REGLER, { ids: ['d0'], oui: true }); await D.waitForTimeout(60)
await avancer(3000); await D.evaluate(GESTE, { id: 'd4', x: 500, y: 150 }); await D.waitForTimeout(60)
const ouvrirPublier = async () => {
  await D.click('button[title="Publier le replay pour les élèves"]')
  await D.waitForSelector('.dialogue-publier[open]', { timeout: 10000 })
  const r = await D.evaluate(() => [...document.querySelectorAll('.dialogue-publier[open] .p-seance option')].map(o => o.textContent.replace(/[  ]/g, ' ')))
  await D.click('.dialogue-publier[open] .p-fermer'); await D.waitForTimeout(150)
  return r
}
const TIROIR = () => [...document.querySelectorAll('.revue-tiroir .revue-section')].map(s => ({ h: s.querySelector('h3')?.textContent, lignes: [...s.querySelectorAll('.revue-choix')].map(c => c.textContent.replace(/[  ]/g, ' ')) }))
const revue = async () => {
  await D.click('button[title^="Revoir la construction"]'); await D.waitForTimeout(300)
  const total = await D.evaluate(() => window.__revue?.bande?.total ?? null)
  await D.getByRole('button', { name: /^Que revoir/ }).click(); await D.waitForTimeout(200)
  const t = await D.evaluate(TIROIR)
  for (let i = 0; i < 4 && await D.evaluate(() => window.__app.enLecture); i++) { await D.keyboard.press('Escape'); await D.waitForTimeout(150) }
  return { total, tiroir: t }
}
const pub1 = await ouvrirPublier()
const rev1 = await revue()
ok(pub1.length === 1 && /· 5 gestes$/.test(pub1[0]), 'D1) Un réglage pendant la séance : Publier propose une séance de 5 gestes (le réglage n\'en est pas un, et ne coupe rien)', pub1)
ok(rev1.total === 5, '   … la revue montre 5 gestes', rev1)
// Deux heures plus tard : on verrouille, on déverrouille
await avancer(2 * 3600_000); await D.evaluate(REGLER, { ids: ['d1', 'd2'], oui: true }); await D.waitForTimeout(80)
await avancer(5000); await D.evaluate(REGLER, { ids: ['d2'], oui: false }); await D.waitForTimeout(80)
const nReglages = await D.evaluate(() => window.__app.tableau.film.toArray().filter(e => e.reglage).length)
const pub2 = await ouvrirPublier()
const rev2 = await revue()
ok(nReglages === 3 && JSON.stringify(pub2) === JSON.stringify(pub1), 'D2) Deux heures après : verrouiller puis déverrouiller ne fait pas de séance ; Publier propose les mêmes séances', { nReglages, pub1, pub2 })
// (les nombres de gestes de chaque ligne : « aujourd'hui » devient « hier » si les deux heures passent minuit)
const gestes = r => r.tiroir.map(s => [s.h, s.lignes.map(l => /· (\d+) gestes?$/.exec(l)?.[1] ?? '')])
ok(rev2.total === rev1.total && JSON.stringify(gestes(rev2)) === JSON.stringify(gestes(rev1)), '   … la revue compte les mêmes gestes (« Que revoir ? » : les mêmes lignes, les mêmes nombres)', { rev1: gestes(rev1), rev2: gestes(rev2) })
const etat = await D.evaluate(() => window.__app.formes.filter(f => /^d[0-4]$/.test(f.id)).map(f => [f.id, f.verrou ?? null]))
ok(JSON.stringify(etat) === JSON.stringify([['d0', true], ['d1', true], ['d2', null], ['d3', null], ['d4', null]]), '   … les traits portent leur verrou (déverrouiller retire le champ)', etat)

// =====================================================================
console.log('=== E. un tableau sans ces champs se prend comme avant ===')
const E = await ouvrirDev(await contexte(), 'sans champs')
await E.evaluate(async (images) => {
  const a = window.__app, t = a.tableau, p = a.page
  t.doc.getMap('images').set('e-vert', images.vert)
  const f = [
    { id: 'e-img', type: 'image', x: 200, y: 200, z: Date.now(), auteur: t.moi, src: 'e-vert', l: 200, h: 100, m: [1, 0, 0, 1] },
    { id: 'e-trait', type: 'trait', x: 600, y: 250, z: Date.now() + 1, auteur: t.moi, pts: [0, 0, 0.5, 60, 14, 0.5, 120, 0, 0.5, 180, 14, 0.5], couleur: '#1b2230', taille: 6, opacite: 1, pression: false },
  ]
  for (const x of f) { t.nouveauGeste(); t.poser(p, x) }
  a.choisirOutil?.('selection')
}, images)
await E.keyboard.press('Escape'); await E.waitForTimeout(100)
await E.keyboard.press('v'); await E.waitForTimeout(100)
const ecran = (x, y) => E.evaluate(([x, y]) => { const a = window.__app, r = document.getElementById('zone').getBoundingClientRect(), s = a.cam.versEcran(x, y); return { x: r.left + s.x, y: r.top + s.y } }, [x, y])
const pImg = await ecran(300, 250)
await E.mouse.click(pImg.x, pImg.y); await E.waitForTimeout(200)
const sel1 = await E.evaluate(() => [...window.__app.selection])
const pT = await ecran(660, 264)
await E.mouse.move(pT.x, pT.y); await E.mouse.down()
for (let i = 1; i <= 8; i++) await E.mouse.move(pT.x + i * 10, pT.y + i * 5)
await E.mouse.up(); await E.waitForTimeout(250)
const apresE = await formesDe(E)
const trE = apresE.find(f => f.id === 'e-trait')
ok(JSON.stringify(sel1) === JSON.stringify(['e-img']), 'E1) Un clic sur l\'image (outil Sélection) la prend', sel1)
ok(trE && Math.abs(trE.x - 680) < 2 && Math.abs(trE.y - 290) < 2, 'E2) Le trait se glisse de 80 × 40 px', trE && [trE.x, trE.y])
ok(apresE.every(f => !['verrou', 'fixe', 'groupe', 'rotation'].some(k => k in f)), 'E3) Rien n\'a ajouté de champ nouveau (déplacer passe par modifier)', apresE.map(f => Object.keys(f)))

await nav.close()
ok(erreurs.length === 0, 'Aucune erreur JS', erreurs)
console.log(echecs ? `\n${echecs} ÉCHEC(S)` : '\nTout est vert')
process.exit(echecs ? 1 : 0)
