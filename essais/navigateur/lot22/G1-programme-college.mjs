// ESSAI DU PROGRAMME DU COLLÈGE DANS LE CATALOGUE (7 novembre 2026),
// onglets 5e, 4e, 3e. Le serveur de développement (:5173, window.__app).
// A. les onglets 5e, 4e, 3e, puis 2nde et 1re spé ; en 5e, les cinq
//    thèmes et le domaine Opérations (6 automatismes, 11 objectifs) ;
// B. « Poser » met un encadré bleu (un cadre et des formules, un groupe),
//    Ctrl + Z le retire ; « Poser tout le domaine » pose tout le domaine ;
// C. « Exemple » sous « Connaitre et utiliser les priorités
//    opératoires » : un exercice posé là où l'on clique, C écrit la
//    réponse en vert et la phrase en bleu ; « Un autre exemple » en pose
//    un nouveau dessous, sans clic ;
// D. « Flash sur ce domaine » ouvre le réglage du flash, Opérations de 5e
//    seul coché ;
// E. la recherche « Thalès » trouve les trois lignes de 3e ;
// F. le panneau tient dans un écran de téléphone.
// Les captures vont dans SORTIE (par défaut essais/navigateur/sorties/lot22).
import { mkdirSync } from 'node:fs'
import { chromium } from '../commun/playwright.mjs'

const DEV = 'http://localhost:5173/'
const SORTIE = process.env.SORTIE ?? new URL('../sorties/lot22/', import.meta.url).pathname
mkdirSync(SORTIE, { recursive: true })
let echecs = 0
const ok = (c, m, d) => { if (!c) echecs++; console.log(c ? '✓' : '✗ ÉCHEC', m, !c && d !== undefined ? '— ' + JSON.stringify(d).slice(0, 1200) : '') }
const erreurs = []
const nav = await chromium.launch()
const c = await nav.newContext({ viewport: { width: 1366, height: 768 } })
const p = await c.newPage()
p.on('pageerror', e => erreurs.push(e.message))
p.on('console', m => { if (m.type() === 'error' && !/Failed to load resource|ERR_CERT|net::|accounts\.google|fonts\.g/.test(m.text())) erreurs.push(m.text()) })
await p.goto(DEV)
await p.waitForFunction(() => window.__app?.page)
await p.waitForTimeout(600)
const nb = () => p.evaluate(() => window.__app.formes.length)
const pan = '.panneau-catalogue'
const poserA = async (sel, x = 420, y = 390) => { await p.click(sel); await p.mouse.move(x, y); await p.mouse.click(x, y); await p.waitForTimeout(300) }

// A
await p.click('button[aria-label^="Catalogue"]')
const onglets = await p.evaluate(() => [...document.querySelectorAll('.panneau-catalogue .onglet')].map(b => b.textContent.trim()))
ok(onglets.join('|') === '5e|4e|3e|2nde|1re spé', 'A. les onglets', onglets)
await p.click(`${pan} .onglet[data-niveau="5e"]`)
const themes = await p.evaluate(() => [...document.querySelectorAll('.panneau-catalogue .niveau[data-niveau="5e"] > h3')].map(e => e.textContent))
ok(themes.length === 5 && themes[0] === 'Nombres et calculs' && themes[4] === 'La pensée informatique', 'A. les cinq thèmes de 5e', themes)
const ops = `${pan} .chapitre[data-cle="5e|0|0"]`
await p.evaluate(s => { document.querySelector(s).open = true }, ops)
const lignes = await p.evaluate(s => ({ a: document.querySelectorAll(`${s} .sorte-a`).length, o: document.querySelectorAll(`${s} .sorte-o`).length, ex: document.querySelectorAll(`${s} .exemple-prog`).length }), ops)
ok(lignes.a === 6 && lignes.o === 11 && lignes.ex === 5, 'A. Opérations : 6 automatismes, 11 objectifs, 5 exemples', lignes)
await p.screenshot({ path: SORTIE + 'A-onglet-5e.png' })

// B
{
  const avant = await nb()
  await poserA(`${ops} .poser-prog[data-p="5e|0|0|o6"]`, 420, 300)
  const r = await p.evaluate(n => { const f = window.__app.formes.slice(n); return { n: f.length, groupes: new Set(f.map(x => x.groupe)).size, cadres: f.filter(x => x.type === 'polygone' && x.ferme).length, textes: f.filter(x => x.type === 'formule').map(x => x.latex).join(' ') } }, avant)
  ok(r.groupes === 1 && r.cadres === 1 && /priorit/.test(r.textes) && /PROGRAMME/.test(r.textes), 'B. un encadré : un cadre, le titre, la phrase', r)
  await p.screenshot({ path: SORTIE + 'B-encadre.png' })
  await p.keyboard.press('Control+z'); await p.waitForTimeout(300)
  ok(await nb() === avant, 'B. Ctrl + Z retire l’encadré', await nb())
  await poserA(`${ops} .tout-prog`, 420, 380)
  const t = await p.evaluate(n => window.__app.formes.slice(n).filter(x => x.type === 'formule').length, avant)
  ok(t > 17, 'B. tout le domaine (17 phrases, des lignes coupées)', t)
  await p.screenshot({ path: SORTIE + 'B-tout-le-domaine.png' })
  await p.keyboard.press('Control+z'); await p.waitForTimeout(300)
}

// C
{
  const avant = await nb()
  await poserA(`${ops} .exemple-prog[data-p="5e|0|0|o6"]`, 300, 260)
  const q = await p.evaluate(n => window.__app.formes.slice(n).map(x => x.latex ?? x.type), avant)
  ok(q.some(l => /Calculer|Compléter/.test(l)) && q.some(l => /Exemple/.test(l)), 'C. l’exemple est posé', q)
  ok(await p.evaluate(() => !document.querySelector('.panneau-catalogue .exemple-en-cours').hidden), 'C. « Exemple » apparaît dans le panneau')
  await p.evaluate(() => document.activeElement?.blur())
  await p.keyboard.press('c'); await p.waitForTimeout(300)
  const r = await p.evaluate(n => window.__app.formes.slice(n).filter(x => x.type === 'formule').map(x => ({ l: x.latex, c: x.couleur })), avant)
  ok(r.some(x => /Réponse/.test(x.l) && x.c === '#1e8a4c') && r.some(x => /priorit/.test(x.l) && x.c === '#1f5fbf'), 'C. C : la réponse en vert, la phrase en bleu', r)
  const n1 = await nb()
  await p.click(`${pan} .autre-exemple`); await p.waitForTimeout(300)
  const n2 = await nb()
  ok(n2 > n1 && !(await p.evaluate(() => !!window.__app.placement)), 'C. « Un autre exemple » se pose dessous, sans clic', n2 - n1)
  await p.screenshot({ path: SORTIE + 'C-exemple-corrige.png' })
}

// D
await p.click(`${ops} .flash-prog`); await p.waitForTimeout(400)
const coches = await p.evaluate(() => [...document.querySelectorAll('.dialogue-flash input[type="checkbox"]:checked')].map(i => i.value))
ok(coches.includes('5e/Opérations') && coches.every(v => v.startsWith('5e/Opérations')), 'D. le flash s’ouvre, Opérations de 5e coché (et ses compétences), rien d’autre', coches)
await p.keyboard.press('Escape'); await p.waitForTimeout(300)

// E
await p.fill(`${pan} .recherche`, 'Thalès'); await p.waitForTimeout(300)
const res = await p.evaluate(() => [...document.querySelectorAll('.panneau-catalogue .resultats .ligne-prog .texte-prog')].map(e => e.textContent))
ok(res.length === 3 && res.every(t => /Thalès/.test(t)), 'E. « Thalès » : les trois lignes de 3e', res)
await p.screenshot({ path: SORTIE + 'E-recherche.png' })
await p.fill(`${pan} .recherche`, '')

// F
await p.setViewportSize({ width: 390, height: 844 }); await p.waitForTimeout(300)
const deborde = await p.evaluate(() => { const e = document.querySelector('.panneau-catalogue'); return e.scrollWidth - e.clientWidth })
ok(deborde <= 1, 'F. rien ne déborde sur un téléphone', deborde)
await p.screenshot({ path: SORTIE + 'F-telephone.png' })

ok(!erreurs.length, 'aucune erreur dans la console', erreurs)
await nav.close()
console.log(echecs ? `${echecs} échec(s)` : 'Tout est bon.')
process.exit(echecs ? 1 : 0)
