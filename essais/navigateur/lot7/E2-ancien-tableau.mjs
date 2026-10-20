// ESSAI : reprendre un ancien tableau (.prof), sur le serveur de
// développement (port 5173). Les anciens tableaux sont fabriqués ici (une
// image dessinée dans un canevas, des traits, un texte, un post-it), avec
// leur film, comme ceux qu'un dossier rangé gardait.
// A. Un ancien tableau ouvert : la fenêtre « Reprendre cet ancien tableau ? »
//    (sa séance, ses pages) ; « Nouveau classeur » : le classeur s'ajoute à
//    la bibliothèque et s'ouvre ; une séance, ses deux pages, son film à
//    l'heure de chaque geste ; l'image rognée, le surligneur, le texte en
//    formule ; le bilan dit le post-it laissé.
// B. Le suivant (le lendemain) : « Ajouter à « Lundi » » ; le classeur a
//    deux séances, chacune avec ses pages et ses gestes, que Publier propose ;
//    l'image qu'elles ont toutes deux n'est gardée qu'une fois.
// C. Un plus ancien que le classeur ouvert : pas d'« Ajouter à… », la
//    fenêtre dit pourquoi ; « Nouveau classeur » reste offert.
// D. Lâché sur la page : reconnu ; mêlé à un classeur : refusé, et dit.
// E. Un fichier .prof qui n'en est pas un : refusé, et dit.
import { chromium } from '../commun/playwright.mjs'

const DEV = 'http://localhost:5173/'
let echecs = 0
const ok = (c, m, detail) => { if (!c) echecs++; console.log(c ? '✓' : '✗ ÉCHEC', m, !c && detail !== undefined ? '— ' + JSON.stringify(detail).slice(0, 1500) : '') }
const erreurs = []
const suivre = (p, nom) => {
  p.on('pageerror', e => erreurs.push(`${nom}: ${e.message}`))
  p.on('console', m => { if (m.type() === 'error' && !/Failed to load resource|ERR_CERT|net::|ERR_INTERNET_DISCONNECTED/.test(m.text())) erreurs.push(`${nom}: ${m.text()}`) })
}
const ECOUTER_TOASTS = () => {
  window.__toasts = []
  let dernier = ''
  setInterval(() => { const t = [...document.querySelectorAll('.toast')].map(x => x.textContent).join('|').replace(/[\u00a0\u202f]/g, ' '); if (t && t !== dernier) { dernier = t; window.__toasts.push(t) } }, 15)
}
/** Un ancien tableau : deux pages, la première écrite en quatre gestes à
 *  partir de debut (une image rognée, deux traits dont un surligneur, un
 *  post-it posé puis retiré, un trait effacé, un texte), la seconde sans film */
const FABRIQUER = () => {
  window.__ancien = (nom, debut) => {
    const cv = Object.assign(document.createElement('canvas'), { width: 400, height: 200 })
    const c = cv.getContext('2d')
    c.fillStyle = '#ffe9a8'; c.fillRect(0, 0, 400, 200); c.fillStyle = '#1f5fbf'; c.fillRect(200, 100, 200, 100)
    const png = cv.toDataURL('image/png')
    const MIN = 60000
    const vide = { points: [], segments: [], circles: [], rectangles: [], texts: [], freehands: [], curves: [], polygons: [], images: [], arcs: [], htmlPostits: [] }
    const trait = (id, x, y, o = {}) => ({ id, points: [{ x, y, p: 0.3 }, { x: x + 60, y: y + 20, p: 0.6 }, { x: x + 120, y, p: 0.5 }], color: '#e74c3c', width: 3, isHighlighter: false, z: id, ...o })
    const image = { id: 2, x: -300, y: -200, w: 200, h: 100, cx: 200, cy: 100, cw: 200, ch: 100, z: 1, srcRef: 'a1' }
    const t1 = trait(1, -300, 0), t3 = trait(3, -250, 50, { isHighlighter: true, width: 18, color: '#f1c40f' })
    const texte = { id: 4, x: 0, y: -200, content: '<span style="font-size: 0.736em;">(voir partie exercices )</span>', color: '#e74c3c', fontSize: 43.5, z: 4 }
    return JSON.stringify({
      id: 'drive_1', name: nom, enregistreLe: debut + 50 * MIN, preview: 'data:image/jpeg;base64,AAAA',
      data: {
        currentBgIndex: 0, assets: { a1: png }, nextId: 10, globalZ: 10,
        pages: [
          { ...vide, freehands: [t1, t3], images: [image], texts: [texte], panX: 700, panY: 300, zoom: 1,
            filmArchive: [{ ...vide, t: debut }],
            film: [
              { images: { '+': [image] }, t: debut + MIN },
              { freehands: { '+': [t1, trait(5, -200, 120)] }, htmlPostits: { '+': [{ id: 9, x: 0, y: 0, w: 150, h: 150, content: '' }] }, t: debut + 2 * MIN },
              { freehands: [t1, t3], htmlPostits: [], t: debut + 3 * MIN },
              { texts: [texte], t: debut + 4 * MIN },
            ] },
          { ...vide, freehands: [trait(7, 100, 100, { color: '#2d3436' })], panX: 700, panY: 300, zoom: 1 },
        ],
      },
    })
  }
  window.__ouvrirAncien = (nom, debut) => window.__fichiers.ouvrir([{ fichier: new File([window.__ancien(nom, debut)], `${nom}.prof`) }])
}

const fenetre = p => p.evaluate(() => {
  const d = document.querySelector('dialog[open]')
  return d ? { titre: d.querySelector('h2')?.textContent, texte: (d.textContent || '').replace(/[\u00a0\u202f]/g, ' '), boutons: [...d.querySelectorAll('.actions button')].map(b => b.textContent.replace(/[\u00a0\u202f]/g, ' ')) } : null
})
const attendreFenetre = (p, titre) => p.waitForFunction(t => document.querySelector('dialog[open] h2')?.textContent === t, titre, { timeout: 20000 }).then(() => true, () => false)
const attendreToast = (p, re, timeout = 30000) => p.waitForFunction(s => (window.__toasts || []).some(t => new RegExp(s).test(t)), re.source, { timeout }).then(() => true, () => false)
const pret = p => p.waitForFunction(() => window.__app && window.__fichiers && window.__registre && document.querySelector('.rang')?.textContent?.includes('/'), null, { timeout: 30000 })
/** La fenêtre « Bonjour ! » d'un classeur dont la dernière séance est passée : fermée */
const fermerBonjour = async p => {
  await p.waitForTimeout(400)
  if (await p.evaluate(() => !!document.querySelector('dialog[open]'))) { await p.keyboard.press('Escape'); await p.waitForTimeout(200) }
}
/** Le classeur ouvert : ses séances, leurs pages et leurs formes, son film */
const classeur = p => p.evaluate(async () => {
  const t = window.__app.tableau
  const { seancesDuTableau } = await import('/src/revoir/exporter.ts')
  const seances = t.seancesDuClasseur().map(s => ({ debut: s.debut, pages: s.pages.map(id => [...(t.formesDe(id)?.values() ?? [])].map(f => ({ type: f.type, opacite: f.opacite, latex: f.latex, l: f.l, h: f.h, src: f.src }))) }))
  const film = t.film.toArray().map(e => e.t)
  const banque = t.doc.getMap('images')
  return { seances, film, gestes: (seancesDuTableau(t) ?? []).map(s => s.gestes).reverse(), images: [...banque.values()].map(v => v.length + ':' + v.slice(-30)) }
})

const navigateur = await chromium.launch()
try {
  const ctx = await navigateur.newContext({ viewport: { width: 1366, height: 768 } })
  await ctx.addInitScript(ECOUTER_TOASTS)
  await ctx.addInitScript(FABRIQUER)
  let p = await ctx.newPage(); suivre(p, 'A')
  await p.goto(DEV); await pret(p)
  const JOUR = 86400000, MIN = 60000
  const lundi = new Date(Date.now() - 3 * JOUR); lundi.setHours(8, 0, 0, 0)
  const L = lundi.getTime(), M = L + JOUR

  // =====================================================================
  console.log('\n— A. Un ancien tableau, dans un classeur neuf')
  void p.evaluate(L => window.__ouvrirAncien('Lundi', L), L)
  ok(await attendreFenetre(p, 'Reprendre cet ancien tableau ?'), 'A1) La fenêtre « Reprendre cet ancien tableau ? »')
  let f = await fenetre(p)
  ok(/« Lundi » : séance du \w+ \d+(er)? \w+ \d{4}, 2 pages\./.test(f?.texte) && /avec ses traits, ses images, ses figures, ses textes et son film/.test(f?.texte), 'A2) Elle dit sa séance et ses pages', f)
  ok(f?.boutons.join('|').startsWith('Annuler|') && f?.boutons.at(-1) === 'Nouveau classeur', 'A3) Annuler, Ajouter au classeur ouvert, Nouveau classeur', f?.boutons)
  await p.click('dialog[open] button[data-a="nouveau"]')
  ok(await attendreToast(p, /Classeur ajouté à la bibliothèque : « Lundi » \(2 pages\)\. « Lundi » : 2 pages, 3 traits, 1 image, 1 texte \(devenu une formule\), avec son film\. 1 objet \(cercles, polygones, courbes ou post-its\) n'a pas été repris\./), 'A4) Ajouté, et le bilan', await p.evaluate(() => window.__toasts))
  await p.waitForFunction(() => window.__app?.tableau?.seancesDuClasseur().length === 1, null, { timeout: 20000 }).catch(() => {})
  await fermerBonjour(p)
  const fiches = await p.evaluate(async () => (await window.__registre.classeurs()).map(f => f.nom))
  ok(fiches.includes('Lundi'), 'A5) Le classeur « Lundi » est dans la bibliothèque', fiches)
  let c = await classeur(p)
  ok(c.seances.length === 1 && c.seances[0].debut === L && c.seances[0].pages.length === 2, 'A6) Une séance, au début du premier geste, avec ses deux pages', c.seances.map(s => [s.debut, s.pages.length]))
  const p1 = c.seances[0].pages[0] ?? []
  ok(p1.map(x => x.type).sort().join() === 'formule,image,trait,trait', 'A7) La page 1 : l\'image, deux traits (l\'effacé est parti), le texte', p1)
  ok(p1.some(x => x.type === 'trait' && x.opacite === 0.35), 'A8) Le surligneur reste un surligneur')
  ok(p1.some(x => x.type === 'formule' && x.latex === '\\text{(voir partie exercices )}'), 'A9) Le texte est une formule', p1)
  ok(p1.some(x => x.type === 'image' && x.l === 200 && x.h === 100), 'A10) L\'image rognée : la partie gardée seule (200 × 100)', p1)
  ok(JSON.stringify(c.film.slice(0, 2)) === JSON.stringify([L, L]) && c.film.includes(L + MIN) && c.film.includes(L + 4 * MIN) && c.gestes[0] === 5, 'A11) Le film : chaque geste à son heure', c)
  // Ce qu'on voit : la partie bleue de l'image (la partie gardée), en haut à gauche
  await p.screenshot({ path: 'sorties/E2-ancien-tableau-A.png' }).catch(() => {})
  const bleu = await p.evaluate(() => {
    const cv = document.querySelector('canvas'); const c = cv.getContext('2d'); const d = c.getImageData(0, 0, cv.width, cv.height).data
    let n = 0, j = 0
    for (let i = 0; i < d.length; i += 16) { if (d[i] < 60 && d[i + 1] > 70 && d[i + 1] < 120 && d[i + 2] > 160) n++; if (d[i] >= 253 && Math.abs(d[i + 1] - 233) < 4 && Math.abs(d[i + 2] - 168) < 4) j++ }
    return { n, j }
  })
  ok(bleu.n > 50 && bleu.j === 0, 'A12) On voit la partie gardée de l\'image (bleue), pas la partie rognée (jaune)', bleu)

  // =====================================================================
  console.log('\n— B. Le lendemain : ajouté au classeur ouvert')
  const avantB = await p.evaluate(async () => (await window.__registre.classeurs()).length)
  void p.evaluate(M => window.__ouvrirAncien('Mardi', M), M)
  ok(await attendreFenetre(p, 'Reprendre cet ancien tableau ?'), 'B1) La fenêtre')
  f = await fenetre(p)
  ok(f?.boutons.includes('Ajouter à « Lundi »'), 'B2) « Ajouter à « Lundi » »', f?.boutons)
  await p.click('dialog[open] button[data-a="ajouter-ici"]')
  // La page se recharge sur le classeur mis à jour
  await p.waitForEvent('load', { timeout: 30000 }).catch(() => {})
  await pret(p)
  await p.waitForFunction(() => window.__app?.tableau?.seancesDuClasseur().length === 2, null, { timeout: 30000 }).catch(() => {})
  await fermerBonjour(p)
  c = await classeur(p)
  ok(c.seances.length === 2 && c.seances[1].debut === M && c.seances.every(s => s.pages.length === 2), 'B3) Deux séances, chacune avec ses deux pages', c.seances.map(s => [s.debut, s.pages.length]))
  ok(c.gestes.join() === '5,5', 'B4) Chacune a ses gestes dans le film', c.gestes)
  ok(c.images.length === 1, 'B5) La même image, reprise par les deux séances, n\'est gardée qu\'une fois', c.images)
  const aPublier = await p.evaluate(async () => (await import('/src/revoir/exporter.ts')).seancesAPublier(window.__app.tableau).length)
  ok(aPublier === 2, 'B7) Publier propose les deux séances', aPublier)
  const n = (await p.evaluate(async () => (await window.__registre.classeurs()).length))
  ok(n === avantB, 'B6) Aucun classeur de plus', [avantB, n])

  // =====================================================================
  console.log('\n— C. Un plus ancien que le classeur ouvert')
  void p.evaluate(L => window.__ouvrirAncien('Avant', L - 7 * 86400000), L)
  ok(await attendreFenetre(p, 'Reprendre cet ancien tableau ?'), 'C1) La fenêtre')
  f = await fenetre(p)
  ok(!f?.boutons.some(b => b.startsWith('Ajouter')) && f?.boutons.includes('Nouveau classeur') && /« Lundi » a déjà une séance plus récente/.test(f?.texte), 'C2) Pas d\'« Ajouter à… », et pourquoi', f)
  await p.keyboard.press('Escape')
  await p.waitForTimeout(300)
  c = await classeur(p)
  ok(c.seances.length === 2, 'C3) Annuler : rien n\'a changé', c.seances.length)

  // =====================================================================
  console.log('\n— D. Lâché sur la page ; mêlé à un classeur')
  await p.evaluate(M => window.__fichiers.lacher([new File([window.__ancien('Jeudi', M + 2 * 86400000)], 'Jeudi.prof')]), M)
  ok(await attendreFenetre(p, 'Reprendre cet ancien tableau ?'), 'D1) Lâché : reconnu')
  await p.keyboard.press('Escape')
  await p.waitForTimeout(300)
  await p.evaluate(M => window.__fichiers.ouvrir([{ fichier: new File([window.__ancien('Jeudi', M)], 'Jeudi.prof') }, { fichier: new File(['x'], 'Autre.memc') }]), M)
  ok(await attendreToast(p, /Ouvrez les anciens tableaux \(\.prof\) à part/), 'D2) Mêlé à un classeur : refusé, et dit')

  // =====================================================================
  console.log('\n— E. Un faux .prof')
  await p.evaluate(() => window.__fichiers.ouvrir([{ fichier: new File(['{"rien": 1}'], 'Faux.prof') }]))
  ok(await attendreToast(p, /« Faux\.prof » : Ce fichier n'est pas un ancien tableau \(\.prof\) qu'on sait lire\./), 'E1) Refusé, et dit')
  ok(!(await p.evaluate(() => !!document.querySelector('dialog[open]'))), 'E2) Aucune fenêtre')

  ok(!erreurs.length, 'Aucune erreur dans la page', erreurs)
} finally {
  await navigateur.close()
}
console.log(echecs ? `\n${echecs} échec(s)` : '\nTout est bon.')
process.exit(echecs ? 1 : 0)
