// Essais au navigateur du morceau P2 du lot 3 : le passé d'une copie de page
// dans la revue en classe et le film élève. Une copie (« Dupliquer la page »)
// montre la construction de l'original jusqu'à la copie, puis ce qu'on y a
// fait ; sa naissance n'est un geste nulle part. Publiée seule, elle se
// construit sous les yeux de l'élève ; publiée avec l'original, elle paraît
// d'un coup. Le tiroir « Que revoir ? » le compte ; une copie retirée sans
// geste à elle ne va pas dans « Pages jetées » ; une page nommée l'est aussi
// dans la revue.
// Serveur de développement sur :5173. Une ligne « OK … » ou « ÉCHEC … » par
// vérification ; code de sortie 1 s'il y a un échec ou une erreur JS.
import { RACINE_ESSAIS, RACINE_DEPOT } from '../commun/racines.mjs'
import { chromium } from '../commun/playwright.mjs'
import { mkdirSync, readFileSync } from 'node:fs'

const URL0 = 'http://localhost:5173/'
const D = `${RACINE_ESSAIS}/lot3/p2`
mkdirSync(D, { recursive: true })
const resultats = []
function verifier(nom, ok, detail = '') {
  resultats.push({ nom, ok: !!ok })
  console.log(`${ok ? 'OK   ' : 'ÉCHEC'} ${nom}${detail ? ' — ' + detail : ''}`)
}
const erreurs = []
function surveiller(page, nom) {
  page.on('console', m => { if (m.type() === 'error' && !/Failed to load resource/.test(m.text())) erreurs.push(`${nom}: ${m.text()}`) })
  page.on('pageerror', e => erreurs.push(`${nom}: ${e.message}`))
}
const nav = await chromium.launch()
const ctx = await nav.newContext({ viewport: { width: 1366, height: 768 }, acceptDownloads: true })
const page = await ctx.newPage()
surveiller(page, 'tableau')
await page.goto(URL0)
await page.waitForFunction(() => window.__app && window.__app.page)
await page.waitForTimeout(400)

// L'horloge du tableau avance à volonté (les gestes espacés de 3 s, la séance
// une demi-heure après la création de la page)
await page.evaluate(() => { const vrai = Date.now.bind(Date); window.__dec = 0; Date.now = () => vrai() + window.__dec })
const avancer = ms => page.evaluate(ms => { window.__dec += ms }, ms)
/** Un trait posé comme un geste, sur la page qu'on regarde */
const poser = (id, x = 200, y = 200) => page.evaluate(({ id, x, y }) => {
  const a = window.__app, t = a.tableau
  t.nouveauGeste()
  t.poser(a.page, { id, type: 'trait', x, y, z: Date.now() + Math.random(), auteur: t.moi, pts: [0, 0, 0.5, 60, 14, 0.5, 120, 0, 0.5, 180, 14, 0.5], couleur: '#1b2230', taille: 3, opacite: 1, pression: false })
}, { id, x, y })
async function geste(id, x, y) { await avancer(3000); await poser(id, x, y); await page.waitForTimeout(60) }

await avancer(30 * 60_000)
const p1 = await page.evaluate(() => window.__app.page)
for (let i = 0; i < 3; i++) await geste('a' + i, 100, 100 + i * 60)
// La copie, par le document (l'interface viendra plus tard), et l'on va dessus
await avancer(3000)
const q = await page.evaluate(p => { const a = window.__app; const q = a.tableau.dupliquerPage(p); a.allerPage(q); return q }, p1)
await page.waitForTimeout(100)
for (let i = 0; i < 2; i++) await geste('q' + i, 400, 100 + i * 60)
// L'original continue : la copie n'en prend rien
await page.evaluate(p => window.__app.allerPage(p), p1); await page.waitForTimeout(60)
await geste('a3', 100, 400)
await page.evaluate(p => window.__app.allerPage(p), q); await page.waitForTimeout(100)
const e0 = await page.evaluate(() => ({ pages: window.__app.pages, ids: window.__app.formes.map(f => f.id).sort() }))
verifier('(la copie est juste après l\'original, avec ses formes et les deux siennes)', JSON.stringify(e0.pages) === JSON.stringify([p1, q]) && JSON.stringify(e0.ids) === JSON.stringify(['a0', 'a1', 'a2', 'q0', 'q1']), JSON.stringify(e0))

const TIROIR = () => [...document.querySelectorAll('.revue-tiroir .revue-section')].map(s => ({ h: s.querySelector('h3')?.textContent, lignes: [...s.querySelectorAll('.revue-choix')].map(c => c.textContent.replace(/[  ]/g, ' ')) }))
async function ouvrirRevue() { await page.click('button[title^="Revoir la construction"]'); await page.waitForTimeout(250) }
async function ouvrirTiroir() { await page.getByRole('button', { name: /^Que revoir/ }).click(); await page.waitForTimeout(150) }
async function fermerRevue() { for (let i = 0; i < 4 && await page.evaluate(() => window.__app.enLecture); i++) { await page.keyboard.press('Escape'); await page.waitForTimeout(150) } }
const REVUE = () => { const r = window.__revue, b = r.bande; return { k: r.k, n: b.images.length, total: b.total, page: b.portion.page, genre: b.portion.genre, ids: r.rendu.formes.map(f => f.id), trace: r.trace ? [...r.trace.ids] : [], ligne1: document.querySelector('.revue-ou .ligne1').textContent } }

// =============== 1. La revue de la copie ===============
await ouvrirRevue()
let r = await page.evaluate(REVUE)
verifier('La revue s\'ouvre sur la copie, dans sa dernière séance : 5 gestes (3 de l\'original, 2 à elle), sans geste à la copie', r.page === q && r.total === 5 && JSON.stringify(r.ids) === JSON.stringify(['a0', 'a1', 'a2', 'q0', 'q1']), JSON.stringify(r))
await ouvrirTiroir()
let tiroir = await page.evaluate(TIROIR)
const sec = tiroir[0]
verifier('« Que revoir ? » : « Sa dernière séance » et « Toute son histoire » de la copie, 5 gestes chacune', sec?.h === 'Page 2' && /^Sa dernière séance.*· 5 gestes$/.test(sec.lignes[0]) && /^Toute son histoire1 séance depuis le .*· 5 gestes$/.test(sec.lignes[1]), JSON.stringify(tiroir))
verifier('… la séance entière : 6 gestes (la copie n\'en est pas un)', /· 6 gestes$/.test(tiroir.find(s => s.h === 'Séances')?.lignes[0] ?? ''), JSON.stringify(tiroir))
verifier('… aucune page jetée', !tiroir.some(s => s.h === 'Pages jetées'))
await page.locator('.revue-choix', { hasText: 'Toute son histoire' }).click(); await page.waitForTimeout(150)
r = await page.evaluate(REVUE)
verifier('« Toute son histoire » : la bande de la copie, 5 gestes', r.genre === 'page' && r.page === q && r.total === 5 && r.n === 6, JSON.stringify(r))
// Origine : la page vide
await page.keyboard.press('Home'); await page.waitForTimeout(150)
r = await page.evaluate(REVUE)
verifier('Origine : la première image est la page vide', r.k === 0 && r.ids.length === 0, JSON.stringify(r))
// Lecture, à l'allure Normale : les gestes hérités s'écrivent, puis ceux de la
// copie (ce qui se dessine est relevé à chaque image d'écran)
await page.keyboard.press('Digit2'); await page.waitForTimeout(50)
await page.evaluate(() => {
  window.__traces = new Set(); window.__suivi = true
  const f = () => { const t = window.__revue?.trace; if (t) for (const id of t.ids) window.__traces.add(id); if (window.__suivi) requestAnimationFrame(f) }
  requestAnimationFrame(f)
})
await page.keyboard.press(' ')
const vus = []
for (let i = 0; i < 600; i++) {
  const s = await page.evaluate(REVUE)
  const cle = s.ids.join(',')
  if (vus.at(-1) !== cle) vus.push(cle)
  if (s.k === s.n - 1 && !s.trace.length) break
  await page.waitForTimeout(50)
}
const traces = new Set(await page.evaluate(() => { window.__suivi = false; return [...window.__traces] }))
const attendu = ['', 'a0', 'a0,a1', 'a0,a1,a2', 'a0,a1,a2,q0', 'a0,a1,a2,q0,q1']
verifier('Lecture : les traits paraissent un à un, ceux de l\'original d\'abord, rien ne surgit à la copie', attendu.every(x => vus.includes(x)) && vus.every(x => attendu.includes(x.split(',').map(y => y.replace(/~.*/, '')).join(','))) && vus.indexOf('a0,a1,a2') < vus.indexOf('a0,a1,a2,q0'), JSON.stringify(vus))
verifier('… les gestes hérités se dessinent (comme ceux de la copie)', ['a0', 'a1', 'a2', 'q0', 'q1'].every(id => traces.has(id)), JSON.stringify([...traces]))
r = await page.evaluate(REVUE)
verifier('… la lecture finit sur la copie telle qu\'elle est', r.k === r.n - 1 && JSON.stringify(r.ids) === JSON.stringify(['a0', 'a1', 'a2', 'q0', 'q1']) && r.ligne1.startsWith('Page 2 / 2 ·'), JSON.stringify(r))
// La revue de l'original ne prend rien de la copie
await ouvrirTiroir()
await page.evaluate(p => { const r = window.__revue; r.choisirPortion({ genre: 'page', page: p }) }, p1); await page.waitForTimeout(150)
r = await page.evaluate(REVUE)
verifier('L\'histoire de l\'original : ses 4 gestes, rien de la copie', r.page === p1 && r.total === 4 && JSON.stringify(r.ids) === JSON.stringify(['a0', 'a1', 'a2', 'a3']), JSON.stringify(r))
await fermerRevue()

// =============== 2. Une page nommée, une copie retirée sans geste ===============
await page.evaluate(p => window.__app.tableau.renommerPage(p, 'Exercice 12 p. 84'), q)
await ouvrirRevue()
r = await page.evaluate(REVUE)
verifier('Une page nommée : « Page 2 / 2 · Exercice 12 p. 84 » en haut de la revue', r.ligne1.startsWith('Page 2 / 2 · Exercice 12 p. 84 ·'), JSON.stringify(r.ligne1))
await ouvrirTiroir()
tiroir = await page.evaluate(TIROIR)
verifier('… et dans le tiroir', tiroir[0]?.h === 'Page 2 · Exercice 12 p. 84', JSON.stringify(tiroir[0]))
await fermerRevue()
// Une seconde copie de l'original, retirée par Ctrl+Z tant qu'elle est vierge
await avancer(3000)
const q2 = await page.evaluate(p => { const a = window.__app; a.allerPage(p); const q = a.tableau.dupliquerPage(p, { marque: true }); a.allerPage(q); return q }, p1)
await page.waitForTimeout(150)
await avancer(3000)
// Ctrl+Z sur la copie toute neuve la retire (le document ; l'interface qui
// ramène à l'original vient avec la navigation entre les pages)
const retour = await page.evaluate(q2 => { const a = window.__app; const r = a.tableau.annuler(q2); if (r?.retour) a.allerPage(r.retour); return r }, q2)
await page.waitForTimeout(200)
const e1 = await page.evaluate(() => ({ page: window.__app.page, pages: window.__app.pages }))
verifier('(Ctrl+Z sur la copie toute neuve la retire et ramène à l\'original)', retour?.copie === q2 && e1.page === p1 && JSON.stringify(e1.pages) === JSON.stringify([p1, q]), JSON.stringify({ e1, q2, retour }))
await ouvrirRevue(); await ouvrirTiroir()
tiroir = await page.evaluate(TIROIR)
verifier('La copie retirée sans geste à elle n\'est pas dans « Pages jetées »', !tiroir.some(s => s.h === 'Pages jetées'), JSON.stringify(tiroir))
await fermerRevue()
// La copie nommée, jetée après qu'on y a écrit : dans « Pages jetées », avec toute son histoire
await page.evaluate(p => window.__app.allerPage(p), q); await page.waitForTimeout(100)
await avancer(3000)
await page.evaluate(({ q, p }) => { const a = window.__app; a.allerPage(p); a.tableau.jeterPage(q, p) }, { q, p: p1 }); await page.waitForTimeout(150)
await ouvrirRevue(); await ouvrirTiroir()
tiroir = await page.evaluate(TIROIR)
const jetees = tiroir.find(s => s.h === 'Pages jetées')
verifier('La copie jetée : « Pages jetées », avec toute son histoire (5 gestes)', jetees?.lignes.length === 1 && /^Page jetée.*· 5 gestes$/.test(jetees.lignes[0]), JSON.stringify(jetees))
await page.locator('.revue-section', { has: page.locator('h3', { hasText: 'Pages jetées' }) }).locator('.revue-choix').first().click()
await page.waitForTimeout(150)
r = await page.evaluate(REVUE)
verifier('… on la revoit : 5 gestes, « Page jetée · Exercice 12 p. 84 »', r.page === q && r.total === 5 && r.ligne1.startsWith('Page jetée · Exercice 12 p. 84'), JSON.stringify(r))
await fermerRevue()
// On la remet (le document : la corbeille) : elle reprend son numéro, son histoire continue
await page.evaluate(q => { const a = window.__app; a.tableau.remettrePage(q); a.allerPage(q) }, q); await page.waitForTimeout(150)
await geste('q2', 400, 300)
await ouvrirRevue(); await ouvrirTiroir()
tiroir = await page.evaluate(TIROIR)
verifier('Remise : elle reprend son numéro et son histoire continue (6 gestes)', tiroir[0]?.h === 'Page 2 · Exercice 12 p. 84' && /· 6 gestes$/.test(tiroir[0].lignes[1] ?? '') && !tiroir.some(s => s.h === 'Pages jetées'), JSON.stringify(tiroir))
await fermerRevue()

// =============== 3. Le film élève ===============
async function lirePublier(decocher = []) {
  await page.click('button[title="Publier le replay pour les élèves"]'); await page.waitForSelector('.dialogue-publier[open]'); await page.check('input[name="p-lieu"][value="google"]', { timeout: 2000 }).catch(() => {})
  const cases = await page.$$eval('.p-pages input', l => l.map(i => ({ v: i.value, c: i.checked })))
  for (const v of decocher) await page.uncheck(`.p-pages input[value="${v}"]`)
  const [dl] = await Promise.all([page.waitForEvent('download'), page.click('.p-fichier')])
  const contenu = readFileSync(await dl.path(), 'utf8')
  const film = await page.evaluate(async t => { const fm = await import('/src/revoir/format.ts'); const f = await fm.lireFilm(t); return { etapes: f.etapes.map(e => ({ p: e.p, o: e.o.map(o => o[0] + (o[1]?.id ?? '')) })), ordre: f.ordre, pages: f.pages.map(p => ({ id: p.id, formes: p.formes.map(x => x.id) })) } }, contenu)
  return { cases, film }
}
async function fermerPublier() { await page.focus('.p-titre'); await page.keyboard.press('Escape').catch(() => {}); await page.waitForTimeout(150) }
let pub = await lirePublier()
verifier('Publier propose les deux pages, cochées ; pas la copie retirée sans geste à elle', pub.cases.length === 2 && pub.cases.every(c => c.c) && pub.cases.some(c => c.v === q) && !pub.cases.some(c => c.v === q2), JSON.stringify(pub.cases))
const ops = pub.film.etapes.map(e => `${e.p === q ? 'Q' : e.p === p1 ? 'P' : '?'}:${e.o.join(' ')}`)
const naissance = pub.film.etapes.findIndex(e => e.p === q)
verifier('Avec l\'original : l\'original se construit, la copie paraît d\'un coup (un geste), puis chacune continue', naissance === 3 && ops.slice(0, 3).join('|') === 'P:=a0|P:=a1|P:=a2' && /^Q:f/.test(ops[3]) && ['=a0', '=a1', '=a2'].every(x => ops[3].includes(x)) && ops.slice(4).join('|') === 'Q:=q0|Q:=q1|P:=a3|Q:=q2', JSON.stringify(ops))
await fermerPublier()
pub = await lirePublier([p1])
const ops2 = pub.film.etapes.map(e => `${e.p === q ? 'Q' : '?'}:${e.o.join(' ')}`)
verifier('La copie seule : elle se construit comme l\'original, puis continue ; aucun geste à la copie', ops2.join('|') === 'Q:=a0|Q:=a1|Q:=a2|Q:=q0|Q:=q1|Q:=q2' && JSON.stringify(pub.film.pages) === JSON.stringify([{ id: q, formes: [] }]) && JSON.stringify(pub.film.ordre) === JSON.stringify([q]), JSON.stringify({ ops2, pages: pub.film.pages }))
// « Voir comme un élève », la copie seule
const [ap] = await Promise.all([ctx.waitForEvent('page'), page.click('.p-apercu')])
surveiller(ap, 'apercu')
await ap.waitForSelector('.carte h1', { timeout: 8000 })
verifier('« Voir comme un élève » s\'ouvre sans erreur', (await ap.textContent('.carte h1')).length > 0)
// Le lecteur : six gestes sur la copie, chaque trait se dessine une fois, à son geste
await ap.waitForFunction(() => window.__revoir?.bobine)
const lu = await ap.evaluate(() => {
  const b = window.__revoir.bobine
  const fin = b.image(b.n - 1)
  return { n: b.n, pages: b.film.ordre.length, ajouts: Array.from({ length: b.n - 1 }, (_, k) => [...b.ajoutees(k + 1)].join(',')), fin: fin.formes.map(f => f.id) }
})
verifier('… le lecteur rejoue la copie : six gestes, chaque trait paraît une fois, et finit sur la copie entière', lu.n === 7 && lu.pages === 1 && lu.ajouts.join('|') === 'a0|a1|a2|q0|q1|q2' && lu.fin.join(',') === 'a0,a1,a2,q0,q1,q2', JSON.stringify(lu))
await ap.close()
await fermerPublier()

await nav.close()
const echecs = resultats.filter(r => !r.ok)
console.log(`\n${resultats.length - echecs.length}/${resultats.length} OK`)
if (erreurs.length) console.log('ÉCHEC : erreurs JS :\n' + erreurs.join('\n'))
process.exit(echecs.length || erreurs.length ? 1 : 0)
