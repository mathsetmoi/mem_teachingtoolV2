// VÉRIFICATION « DONNÉES ET REPLAY » DU LOT 5 (d1) : dans l'application (serveur
// de développement, window.__app), chaque geste nouveau (grouper, changer de
// taille, tourner, Remettre droit, fixer, détacher, verrouiller, ordre, gomme
// partielle, coller, dupliquer, envoyer) : une étape d'annulation qui défait
// tout et seulement lui, Ctrl + Y le refait pareil, l'autre page n'y bouge pas ;
// puis le film élève et la revue rejouent jusqu'à l'état exact du tableau ; on
// écrit le .memc et le film élève pour les vérifications sous Node (d2).
import { RACINE_ESSAIS, RACINE_DEPOT } from '../../../commun/racines.mjs'
import { chromium } from '../../../commun/playwright.mjs'
import { mkdirSync, writeFileSync } from 'node:fs'

const S = `${RACINE_ESSAIS}`
const D = S + '/lot5/verif/donnees/sorties'
mkdirSync(D, { recursive: true })
const DEV = 'http://localhost:5173/'
let echecs = 0
const ok = (c, m, d) => { if (!c) echecs++; console.log(c ? '✓' : '✗ ÉCHEC', m, (!c || process.env.DETAIL) && d !== undefined ? '— ' + JSON.stringify(d).slice(0, 2500) : '') }
const erreurs = []
const attendre = ms => new Promise(r => setTimeout(r, ms))

const nav = await chromium.launch()
const ctx = await nav.newContext({ viewport: { width: 1366, height: 768 } })
await ctx.addInitScript(() => { window.showOpenFilePicker = undefined })
await ctx.route(/accounts\.google\.com|apis\.google\.com/, r => r.fulfill({ contentType: 'text/javascript', body: '' }))
const P = await ctx.newPage()
P.on('pageerror', e => erreurs.push(e.message))
P.on('console', m => { if (m.type() === 'error' && !/Failed to load resource|net::|accounts\.google/.test(m.text())) erreurs.push(m.text()) })
await P.goto(DEV)
await P.waitForFunction(() => window.__app && window.__app.page && document.querySelector('.rang')?.textContent?.includes('/'), null, { timeout: 30000 })
await P.waitForTimeout(600)

// ---------- Dans la page : outils ----------
await P.evaluate(() => {
  const a = window.__app
  a.reconnaissance = false
  window.__msgs = []
  const m = a.ui.message.bind(a.ui)
  a.ui.message = (t, x, d) => { window.__msgs.push(t); return m(t, x, d) }
  const cv = Object.assign(document.createElement('canvas'), { width: 80, height: 50 }); const g = cv.getContext('2d')
  g.fillStyle = '#20a020'; g.fillRect(0, 0, 80, 50); g.fillStyle = '#c02020'; g.fillRect(0, 0, 20, 12)
  a.tableau.doc.getMap('images').set('d1-img', cv.toDataURL('image/png'))
  const trier = v => Array.isArray(v) ? v.map(trier) : v && typeof v === 'object' ? Object.fromEntries(Object.keys(v).sort().map(k => [k, trier(v[k])])) : v
  window.__trier = trier
  /** Toutes les pages, forme par forme (JSON aux clés triées) */
  window.__etat = () => {
    const t = a.tableau, r = {}
    for (const p of t.ordre.toArray()) r[p] = Object.fromEntries([...t.formesDe(p).entries()].sort(([x], [y]) => x < y ? -1 : 1).map(([id, f]) => [id, JSON.stringify(trier(f))]))
    return r
  }
  window.__pile = p => a.tableau.annulationDe(p ?? a.page)?.undoStack.length ?? 0
  window.__prendre = ids => { a.choisirOutil('selection'); a.selection.clear(); a.options = null; for (const i of ids) a.selection.add(i); a.rendu.redessinerDirect(); a.ui.maj() }
  window.__poser = (f) => {
    const t = a.tableau
    t.nouveauGeste(); t.poser(a.page, { z: Date.now() + Math.random(), auteur: t.moi, ...f })
    return f.id
  }
})
const etat = () => P.evaluate(() => window.__etat())
const pile = p => P.evaluate(p => window.__pile(p), p)
const filmN = () => P.evaluate(() => window.__app.tableau.film.length)
const notes = () => P.evaluate(() => window.__app.tableau.film.toArray().map(e => e.reglage ? 'R' : e.coupe ? 'C' : e.seulOrdre ? 'O' : e.naissance ? 'N' : 'G').join(''))
const prendre = ids => P.evaluate(ids => window.__prendre(ids), ids)
const poser = f => P.evaluate(f => window.__poser(f), f)
const page = () => P.evaluate(() => window.__app.page)
const egal = (a, b) => JSON.stringify(a) === JSON.stringify(b)
const diff = (a, b) => {
  const r = []
  for (const p of new Set([...Object.keys(a), ...Object.keys(b)])) {
    const x = a[p] ?? {}, y = b[p] ?? {}
    for (const id of new Set([...Object.keys(x), ...Object.keys(y)])) if (x[id] !== y[id]) r.push({ p: p.slice(0, 4), id, avant: x[id]?.slice(0, 300), apres: y[id]?.slice(0, 300) })
  }
  return r
}

/** Un geste de l'application : une étape d'annulation de la page, qui change
 *  quelque chose ; Ctrl + Z rend l'état d'avant exactement (toutes pages),
 *  Ctrl + Y celui d'après ; n étapes du film (1 par défaut), avec ces notes */
async function verifierGeste(nom, faire, o = {}) {
  await P.waitForTimeout(700)
  const p = await page()
  const avant = await etat(), pAvant = await pile(p), fAvant = await filmN(), nAvant = await notes()
  const r = await faire()
  await P.waitForTimeout(400)
  const apres = await etat(), pApres = await pile(p), fApres = await filmN(), nApres = await notes()
  const ajout = nApres.slice(nAvant.length)
  ok(r !== false && !egal(avant, apres), `${nom} : quelque chose change`, { r })
  ok(pApres === pAvant + 1, `${nom} : une étape d'annulation`, { pAvant, pApres })
  if (o.film !== undefined) ok(ajout === o.film, `${nom} : le film reçoit « ${o.film} »`, { ajout })
  if (o.apres) await o.apres(apres)
  if (o.sansAnnuler) return { avant, apres }
  await P.keyboard.press('Control+z'); await P.waitForTimeout(300)
  const defait = await etat()
  ok(egal(defait, avant), `${nom} : Ctrl + Z rend tout, d'un coup`, diff(avant, defait))
  await P.keyboard.press('Control+y'); await P.waitForTimeout(300)
  const refait = await etat()
  ok(egal(refait, apres), `${nom} : Ctrl + Y le refait pareil`, diff(apres, refait))
  return { avant, apres }
}

// =====================================================================
console.log('=== A. La page 1 : ce qu\'on pose ===')
await P.evaluate(() => { const a = window.__app; a.cam.x = 0; a.cam.y = 0; a.cam.z = 1; a.rendu.toutRedessiner(); a.ui.maj() })
const p1 = await page()
const ligne = (x, y, l, o = {}) => { const pts = []; for (let i = 0; i <= 20; i++) pts.push(i * l / 20, Math.sin(i / 3) * 6, 0.5); return { type: 'trait', x, y, pts, couleur: '#1b2230', taille: 4, opacite: 1, pression: false, ...o } }
await poser({ id: 'IMG', type: 'image', x: 500, y: 120, src: 'd1-img', l: 80, h: 50, m: [3, 0, 0, 3] }); await attendre(600)
await poser({ id: 'IMG2', type: 'image', x: 700, y: 120, src: 'd1-img', l: 80, h: 50, m: [2, 0, 0, 2] }); await attendre(600)
await poser({ id: 'IMG3', type: 'image', x: 900, y: 120, src: 'd1-img', l: 80, h: 50, m: [1.5, 0, 0, 1.5] }); await attendre(600)
await poser({ id: 'F', type: 'formule', x: 300, y: 380, latex: '\\frac{a}{b}+x^2', couleur: '#d0342c', taille: 32 }); await attendre(600)
await poser({ id: 'TRI', type: 'polygone', x: 120, y: 420, pts: [0, 0, 160, 0, 40, -120], ferme: true, couleur: '#1f5fbf', taille: 2.5, sommets: true, noms: ['A', 'B', 'C'], codage: true, posNoms: [{ x: -14, y: 14 }, null, null] }); await attendre(600)
await poser(ligne(100, 250, 300, { id: 'T1' })); await attendre(600)
await poser(ligne(150, 600, 400, { id: 'T2', couleur: '#d0342c' })); await attendre(600)
await poser(ligne(150, 610, 400, { id: 'T3' })); await attendre(600)
await poser({ id: 'PT', type: 'polygone', x: 560, y: 160, pts: [0, 0], ferme: false, couleur: '#1b2230', taille: 2.5, sommets: true, noms: ['M'], lie: 'IMG' }); await attendre(600)
// Une page 2, avec un trait
await P.evaluate(() => window.__app.nouvellePage()); await attendre(400)
const p2 = await page()
await poser(ligne(100, 100, 200, { id: 'Q1' })); await attendre(600)
await P.evaluate(p => window.__app.allerPage(p), p1); await attendre(500)
ok(await page() === p1, 'On est revenu sur la page 1')

// =====================================================================
console.log('=== B. Les gestes du lot 5, un par un ===')
const cadre = await P.evaluate(async () => { const c = await import('/src/cadre.ts'); window.__cadre = c; return Object.keys(c).length })
ok(cadre > 10, 'cadre.ts chargé')

await prendre(['T1', 'TRI', 'F'])
await verifierGeste('Grouper (Ctrl + G)', () => P.evaluate(() => window.__app.grouper()), { film: 'R' })
const groupe = await P.evaluate(() => window.__app.forme('T1').groupe)
ok(typeof groupe === 'string' && await P.evaluate(g => ['T1', 'TRI', 'F'].every(i => window.__app.forme(i).groupe === g), groupe), 'Les trois membres portent le même groupe', groupe)

await prendre(['T1', 'TRI', 'F'])
await verifierGeste('Agrandir le groupe (× 1,5, par un coin)', () => P.evaluate(() => {
  const c = window.__cadre, M = c.echelle({ x: 100, y: 250 }, 1.5, 1.5)
  return window.__app.transformerSelection(M)
}), { film: 'G' })
await prendre(['T1', 'TRI', 'F'])
await verifierGeste('Tourner le groupe de 30°', () => P.evaluate(() => {
  const c = window.__cadre, M = c.rotation({ x: 300, y: 400 }, Math.PI / 6)
  return window.__app.transformerSelection(M)
}), { film: 'G', apres: async () => {
  const f = await P.evaluate(() => JSON.parse(JSON.stringify(window.__app.forme('F'))))
  ok(Math.abs(f.rotation - Math.PI / 6) < 1e-9 && f.taille === 48, 'La formule du groupe : tournée de 30° (champ rotation), taille 32 → 48', f)
} })

// Un vrai geste à la souris sur la pastille ↻ d'une image (le cadre du lot 5)
await prendre(['IMG'])
await P.waitForTimeout(200)
const pastille = await P.evaluate(() => {
  const a = window.__app, c = a.cadreDeLaSelection(), r = document.getElementById('zone').getBoundingClientRect()
  if (!c) return null
  const e = a.cam.versEcran(c.pastille.x, c.pastille.y), m = a.cam.versEcran(c.centre.x, c.centre.y)
  return { x: r.left + e.x, y: r.top + e.y, cx: r.left + m.x, cy: r.top + m.y }
})
ok(!!pastille, 'L\'image prise a sa pastille ↻', pastille)
if (pastille) {
  await verifierGeste('Tourner l\'image à la souris (pastille ↻)', async () => {
    await P.mouse.move(pastille.x, pastille.y); await P.mouse.down()
    const R = Math.hypot(pastille.x - pastille.cx, pastille.y - pastille.cy)
    for (let i = 1; i <= 20; i++) { const t = -Math.PI / 2 + i * (Math.PI / 9) / 20; await P.mouse.move(pastille.cx + R * Math.cos(t), pastille.cy + R * Math.sin(t)); await P.waitForTimeout(16) }
    await P.mouse.up()
  }, { film: 'G' })
  // Le point repéré sur l'image a suivi
  const lie = await P.evaluate(() => { const a = window.__app; return { pt: a.forme('PT'), img: a.forme('IMG') } })
  ok(lie.pt.lie === 'IMG', 'Le point M reste repéré sur l\'image', lie.pt)
}
await prendre(['IMG'])
await verifierGeste('Remettre droit l\'image', () => P.evaluate(() => window.__app.redresserSelection()), { film: 'G' })
await prendre(['IMG'])
await verifierGeste('Agrandir l\'image en la déformant (côté)', () => P.evaluate(() => {
  const a = window.__app, c = a.cadreDeLaSelection(), w = window.__cadre
  const { M } = w.matriceTaille(c, { quoi: 'cote', i: 1 }, { x: c.coins[1].x + 60, y: (c.coins[1].y + c.coins[2].y) / 2 }, { bornes: { min: 0.01, max: 100 } })
  return a.transformerSelection(M)
}), { film: 'G' })

await verifierGeste('Fixer l\'image en fond', () => P.evaluate(() => window.__app.fixerEnFond(['IMG'])), { film: 'G', apres: async () => {
  const z = await P.evaluate(() => { const a = window.__app; return { img: a.forme('IMG').z, autres: Math.min(...a.formes.filter(f => f.id !== 'IMG').map(f => f.z)), fixe: a.forme('IMG').fixe } })
  ok(z.fixe === true && z.img < z.autres, 'L\'image fixée passe sous tout', z)
} })
await verifierGeste('Détacher l\'image du fond', () => P.evaluate(() => window.__app.detacherDuFond(['IMG'])), { film: 'G' })
await verifierGeste('Fixer de nouveau', () => P.evaluate(() => window.__app.fixerEnFond(['IMG'])), { film: 'G', sansAnnuler: true })

await prendre(['T1', 'TRI', 'F'])
await verifierGeste('Verrouiller le groupe', () => P.evaluate(() => window.__app.verrouiller(true)), { film: 'R' })
await prendre(['T3'])
await verifierGeste('Mettre T3 au premier plan', () => P.evaluate(() => window.__app.ordonner('premier')), { film: 'G' })
await prendre(['T3'])
await verifierGeste('Reculer T3', () => P.evaluate(() => window.__app.ordonner('reculer')), { film: 'G' })
await prendre(['IMG3'])
await verifierGeste('Mettre IMG3 à l\'arrière-plan (jamais sous l\'image fixée)', () => P.evaluate(() => window.__app.ordonner('arriere')), { film: 'G', apres: async () => {
  const z = await P.evaluate(() => { const a = window.__app; return { fixe: a.forme('IMG').z, img2: a.forme('IMG2').z, img3: a.forme('IMG3').z } })
  ok(z.fixe < z.img3 && z.img3 < z.img2, 'L\'invariant du fond tient (D25) : IMG3 passe sous IMG2, au-dessus de l\'image fixée', z)
} })

// La gomme partielle, à la souris, sur T2 et T3
await P.evaluate(() => { localStorage.setItem('mem-gomme', 'zone') })
await P.evaluate(() => window.__app.choisirOutil('gomme'))
await P.click('button[title^="Gomme"]'); await P.waitForTimeout(100)
await P.click('.menu-flottant[aria-label="Gomme"] [data-action="gomme-zone"]'); await P.waitForTimeout(100)
const zone = await P.evaluate(() => { const r = document.getElementById('zone').getBoundingClientRect(), a = window.__app; const e = a.cam.versEcran(350, 580); return { x: r.left + e.x, y: r.top + e.y } })
await verifierGeste('Un coup de gomme partielle sur deux traits', async () => {
  await P.mouse.move(zone.x, zone.y); await P.mouse.down()
  for (let i = 1; i <= 30; i++) { await P.mouse.move(zone.x + Math.sin(i / 4) * 4, zone.y + i * 2); await P.waitForTimeout(20) }
  await P.mouse.up()
}, { film: 'CC', apres: async () => {
  const t = await P.evaluate(() => window.__app.formes.filter(f => f.type === 'trait' && ['T2', 'T3'].some(i => f.id === i || f.couleur === window.__app.forme(i)?.couleur)).length)
  ok(t >= 4, 'T2 et T3 coupés en morceaux', t)
} })
await P.evaluate(() => window.__app.choisirOutil('selection'))

// Dupliquer (Ctrl + D) un groupe libre neuf : T2 et l'image 2
const morceaux = await P.evaluate(() => window.__app.formes.filter(f => f.type === 'trait' && f.couleur === '#d0342c').map(f => f.id))
await prendre([...morceaux, 'IMG2'])
await verifierGeste('Grouper des morceaux et une image', () => P.evaluate(() => window.__app.grouper()), { film: 'R', sansAnnuler: true })
await prendre([...morceaux, 'IMG2'])
await verifierGeste('Dupliquer le groupe (Ctrl + D)', () => P.evaluate(() => window.__app.dupliquerSelection()), { film: 'G', apres: async () => {
  const g = await P.evaluate(ids => { const a = window.__app, o = a.forme(ids[0]).groupe; const neufs = a.formes.filter(f => f.groupe && f.groupe !== o && !f.verrou); return { o, neufs: neufs.map(f => [f.id, f.groupe]), sel: [...a.selection] } }, morceaux)
  ok(g.neufs.length === morceaux.length + 1 && new Set(g.neufs.map(x => x[1])).size === 1, 'Le double est un groupe neuf, commun à ses membres', g)
} })

// Copier le groupe verrouillé et tourné (par son menu), puis le coller sur la page 2
const copie = await P.evaluate(() => {
  const a = window.__app
  const formes = a.formes.filter(f => ['T1', 'TRI', 'F'].includes(f.id))
  return a.copier(false, formes)
})
ok(copie, 'Copier le groupe verrouillé (comme « Copier » de son menu)')
const html = await P.evaluate(async () => { const pp = await import('/src/presse-papiers.ts'); const c = window.__app.copie; const h = pp.versHtml(c); const r = pp.lireHtml(h); return { relu: !!r, n: r?.formes.length, champs: r?.formes.map(f => ({ id: f.id, verrou: f.verrou, groupe: f.groupe, rotation: f.rotation })) } })
ok(html.relu && html.n === 3 && html.champs.every(f => f.verrou === true && f.groupe) && html.champs.find(f => f.id === 'F').rotation > 0.5, 'Le presse-papiers du système relit la copie avec verrou, groupe et rotation', html)
await P.evaluate(p => window.__app.allerPage(p), p2); await attendre(500)
const avColler = await etat()
await verifierGeste('Coller le groupe verrouillé sur la page 2', () => P.evaluate(() => window.__app.coller()), { film: 'G', apres: async () => {
  const c = await P.evaluate(() => { const a = window.__app; return { formes: a.formes.filter(f => f.verrou).map(f => JSON.parse(JSON.stringify(f))), sel: a.selection.size, msg: window.__msgs.at(-1) } })
  const g = new Set(c.formes.map(f => f.groupe))
  const F = c.formes.find(f => f.type === 'formule'), TRI = c.formes.find(f => f.type === 'polygone')
  ok(c.formes.length === 3 && g.size === 1 && ![...g][0].startsWith(groupe) && c.sel === 0 && /verrouill/.test(c.msg), 'Collé : trois objets verrouillés, un groupe neuf commun, rien de sélectionné, le message le dit', c)
  ok(F && Math.abs(F.rotation - Math.PI / 6) < 1e-9 && F.taille === 48 && TRI && egal(TRI.noms, ['A', 'B', 'C']), 'La formule collée garde sa rotation et sa taille ; le triangle ses noms', { F, TRI })
} })
await P.evaluate(p => window.__app.allerPage(p), p1); await attendre(500)

// Envoyer vers la page 2 (déplacer) un objet, puis Ctrl + Z sur la page 1
await prendre([...morceaux, 'IMG2'])
const avEnvoi = await etat()
await verifierGeste('Envoyer le groupe vers la page 2 (déplacer)', () => P.evaluate(p => window.__app.envoyerSelection(p, true), p2), { sansAnnuler: true, apres: async (apres) => {
  const arr = Object.values(apres[p2]).map(s => JSON.parse(s)).filter(f => f.groupe && !f.verrou)
  ok(arr.length === morceaux.length + 1 && new Set(arr.map(f => f.groupe)).size === 1, 'Sur la page 2 : les objets envoyés, en un groupe neuf', arr.map(f => [f.id, f.groupe]))
} })
await P.keyboard.press('Control+z'); await P.waitForTimeout(400)
const apAnnul = await etat()
ok(egal(apAnnul, avEnvoi), 'Ctrl + Z sur la page 1 : tout revient, rien ne reste en double sur la page 2', diff(avEnvoi, apAnnul))
await P.keyboard.press('Control+y'); await P.waitForTimeout(400)
await P.keyboard.press('Control+z'); await P.waitForTimeout(400)
ok(egal(await etat(), avEnvoi), 'Ctrl + Y puis Ctrl + Z : de même')

// Envoyer l'image du fond vers la page 2 (le menu de la page), puis Ctrl + Z
const avFond = await etat()
const env = await P.evaluate(p => window.__app.envoyerSelection(p, true, ['IMG']), p2)
await P.waitForTimeout(400)
const apFond = await etat()
const arrivee = Object.values(apFond[p2]).map(s => JSON.parse(s))
const imgF = arrivee.find(f => f.type === 'image' && f.fixe)
ok(env && imgF && imgF.z < Math.min(...arrivee.filter(f => f !== imgF).map(f => f.z)), 'L\'image du fond envoyée arrive fixée, sous tout', imgF)
ok(arrivee.some(f => f.type === 'polygone' && f.lie === imgF?.id), 'Son point repéré la suit (lié à la nouvelle image)', arrivee.filter(f => f.lie))
await P.keyboard.press('Control+z'); await P.waitForTimeout(400)
ok(egal(await etat(), avFond), 'Ctrl + Z : l\'image du fond revient, fixée, à sa place', diff(avFond, await etat()))

// Dupliquer la page : tout est recopié tel quel
await P.waitForTimeout(700)
const avCopie = await etat()
await P.evaluate(() => window.__app.dupliquerLaPage()); await P.waitForTimeout(500)
const p3 = await page()
const apCopie = await etat()
const memes = egal(Object.values(avCopie[p1]), Object.values(apCopie[p3])) && egal(Object.keys(avCopie[p1]), Object.keys(apCopie[p3]))
ok(p3 !== p1 && memes, 'Dupliquer la page : chaque forme (verrou, fixe, groupe, rotation compris) est recopiée telle quelle', { p3 })
await poser(ligne(100, 700, 100, { id: 'SUR-COPIE' })); await attendre(600)
await P.evaluate(p => window.__app.allerPage(p), p1); await attendre(600)
await poser(ligne(600, 700, 100, { id: 'FIN' })); await attendre(800)

// =====================================================================
console.log('=== C. Le replay : film élève, lecteur, revue ===')
const rejeu = await P.evaluate(async () => {
  const ex = await import('/src/revoir/exporter.ts'), bo = await import('/src/revoir/bobine.ts'), fo = await import('/src/revoir/format.ts')
  const a = window.__app, t = a.tableau, film = t.film.toArray()
  const seances = ex.seancesDuFilm(film)
  const s = seances[0]
  const pages = t.ordre.toArray()
  const { film: f, sources } = ex.exporterDetaille(t, { de: s.de, a: s.a, pages, titre: 'Lot 5, données' })
  const texte = await fo.ecrireFilm(f)
  const b = new bo.Bobine(JSON.parse(JSON.stringify(f)))
  const propre = x => { const { auteur, brut, ...r } = x; if (r.type === 'trait') r.pts = r.pts.map((v, i) => i % 3 === 2 ? Math.round(v * 100) / 100 : Math.round(v * 10) / 10); return window.__trier(r) }
  const sans = x => { const { verrou, groupe, ...r } = x; return r }
  // Image par image : la page du geste, dans la bobine, est celle du tableau à l'étape d'où il vient
  const ecarts = []
  for (let k = 1; k < b.n; k++) {
    const e = f.etapes[k - 1], img = b.image(k, e.p)
    const vrai = t.etatA(film[sources[k - 1]]).pages.get(e.p)
    if (!vrai) continue
    const A = new Map(img.formes.map(x => [x.id, JSON.stringify(sans(propre(x)))]))
    const B = new Map([...vrai.formes.values()].map(x => [x.id, JSON.stringify(sans(propre(x)))]))
    const ids = new Set([...A.keys(), ...B.keys()])
    const d = [...ids].filter(id => A.get(id) !== B.get(id))
    if (d.length) ecarts.push({ k, p: e.p.slice(0, 4), d: d.map(id => ({ id, bobine: A.get(id)?.slice(0, 200), tableau: B.get(id)?.slice(0, 200) })) })
  }
  // À la fin : chaque page montrée, telle qu'elle est (verrou et groupe compris)
  const fin = []
  for (const p of f.ordre ?? pages) {
    const img = b.image(b.n - 1, p)
    if (!img || !t.formesDe(p)) continue
    const A = new Map(img.formes.map(x => [x.id, JSON.stringify(propre(x))]))
    const B = new Map([...t.formesDe(p).values()].map(x => [x.id, JSON.stringify(propre(x))]))
    const d = [...new Set([...A.keys(), ...B.keys()])].filter(id => A.get(id) !== B.get(id))
    if (d.length) fin.push({ p: p.slice(0, 4), d: d.map(id => ({ id, bobine: A.get(id)?.slice(0, 300), tableau: B.get(id)?.slice(0, 300) })) })
  }
  return { n: b.n, etapes: f.etapes.length, coupes: f.etapes.filter(e => e.coupe).length, seances: seances.length, ecarts, fin, texte, notes: film.map(e => e.reglage ? 'R' : e.coupe ? 'C' : e.seulOrdre ? 'O' : e.naissance ? 'N' : 'G').join('') }
})
writeFileSync(D + '/d1.mem', rejeu.texte)
console.log(`  (film du tableau : ${rejeu.notes} ; film élève : ${rejeu.etapes} étapes, ${rejeu.coupes} coupes, ${rejeu.seances} séance(s))`)
ok(rejeu.ecarts.length === 0, 'Film élève : chaque image de la bobine est la page du tableau à son étape (verrou et groupe mis à part)', rejeu.ecarts.slice(0, 4))
ok(rejeu.fin.length === 0, 'Film élève : à la fin, chaque page est exactement celle du tableau', rejeu.fin.slice(0, 4))

// La revue en classe : on va au bout de chaque page, ce qu'elle montre est la page
const revue = await P.evaluate(async () => {
  const a = window.__app, t = a.tableau
  const pl = await import('/src/revue/planches.ts')
  const l = pl.lectureDe(t, () => t.ordre.toArray())
  const r = []
  for (const p of t.ordre.toArray()) {
    const film = t.film.toArray()
    // La dernière étape de l'histoire de la page
    let i = film.length - 1
    while (i >= 0 && !l.deLaPage(i, p)) i--
    const img = i >= 0 ? l.page(i, p) : null
    const vrai = [...t.formesDe(p).values()].map(f => JSON.stringify(window.__trier(f))).sort()
    const vue = img ? img.formes.map(f => JSON.stringify(window.__trier(f))).sort() : []
    r.push({ p: p.slice(0, 4), i, egal: JSON.stringify(vrai) === JSON.stringify(vue), n: [vrai.length, vue.length] })
  }
  return r
}).catch(e => ({ erreur: String(e) }))
ok(Array.isArray(revue) && revue.every(x => x.egal), 'La revue : la dernière planche de chaque page est la page', revue)

// La revue ouverte pour de vrai : on la parcourt jusqu'au bout sans erreur
await P.keyboard.press('Escape')
await P.click('button[title^="Revoir la construction"]'); await P.waitForTimeout(900)
const parcours = await P.evaluate(async () => {
  const rv = window.__app.ui.revue, b = rv.bande
  for (let j = 0; j < b.images.length; j++) rv.aller(j, true)
  await new Promise(r => setTimeout(r, 300))
  const vus = window.__app.formes.length
  return { images: b.images.length, rendu: rv.rendu.formes.length, vus }
}).catch(e => ({ erreur: String(e) }))
ok(!parcours.erreur && parcours.images > 5, 'La revue en classe se parcourt jusqu\'au bout', parcours)
for (let i = 0; i < 4 && await P.evaluate(() => window.__app.enLecture); i++) { await P.keyboard.press('Escape'); await P.waitForTimeout(150) }

// Le .memc et l'état, pour la suite sous Node
const memc = await P.evaluate(async () => {
  const fi = await import('/src/fichier.ts')
  const b = await fi.ecrireTableau(window.__app.tableau.doc).arrayBuffer()
  let s = ''; const o = new Uint8Array(b); for (let i = 0; i < o.length; i += 0x8000) s += String.fromCharCode.apply(null, o.subarray(i, i + 0x8000))
  return btoa(s)
})
writeFileSync(D + '/d1.memc', Buffer.from(memc, 'base64'))
writeFileSync(D + '/d1-etat.json', JSON.stringify({ etat: await etat(), film: await notes(), ordre: await P.evaluate(() => window.__app.tableau.ordre.toArray()) }))
console.log('  (écrits : sorties/d1.memc, d1.mem, d1-etat.json)')

// Le rechargement : la base du navigateur rend la même chose
const avRecharge = await etat()
await P.reload()
await P.waitForFunction(() => window.__app && window.__app.page && document.querySelector('.rang')?.textContent?.includes('/'), null, { timeout: 30000 })
await P.waitForTimeout(800)
await P.evaluate(() => {
  const trier = v => Array.isArray(v) ? v.map(trier) : v && typeof v === 'object' ? Object.fromEntries(Object.keys(v).sort().map(k => [k, trier(v[k])])) : v
  window.__etat = () => { const t = window.__app.tableau, r = {}; for (const p of t.ordre.toArray()) r[p] = Object.fromEntries([...t.formesDe(p).entries()].sort(([x], [y]) => x < y ? -1 : 1).map(([id, f]) => [id, JSON.stringify(trier(f))])); return r }
})
ok(egal(await etat(), avRecharge), 'Après un rechargement : chaque forme est la même', diff(avRecharge, await etat()))

await nav.close()
ok(erreurs.length === 0, 'Aucune erreur JS', erreurs)
console.log(echecs ? `\n${echecs} ÉCHEC(S)` : '\nTout est vert')
process.exit(echecs ? 1 : 0)
