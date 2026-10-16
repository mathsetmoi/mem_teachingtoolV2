// La revue et le film élève : les fonds nouveaux, la formule tournée et
// agrandie, l'image tournée ; le contraste renforcé dans la revue (voulu)
// mais jamais dans le film élève ni le lecteur élève.
import { writeFileSync, rmSync, mkdirSync } from 'node:fs'
import { lancer, contexte, ouvrir, ok, note, fin, OUT, DEV, suivre } from './lib/commun.mjs'

const D = OUT + '/revue'
rmSync(D, { recursive: true, force: true }); mkdirSync(D, { recursive: true })
const nav = await lancer()
const ctx = await contexte(nav)
const P = await ouvrir(ctx)
await P.evaluate(async () => { window.__cadre = await import('/src/cadre.ts') })

const pages = {}
for (const fond of ['grands-carreaux', 'millimetre', 'pointe', 'iso']) {
  pages[fond] = await P.evaluate(fond => {
    const a = window.__app, t = a.tableau, C = window.__cadre
    a.nouvellePage(); a.changerFond(fond)
    const pose = f => { const id = 'r' + Math.random().toString(36).slice(2); t.nouveauGeste(); t.poser(a.page, { id, z: Date.now() + Math.random(), auteur: t.moi, ...f }); return id }
    const pts = []; for (let i = 0; i <= 20; i++) pts.push(i * 12, Math.sin(i / 2) * 14, 0.5)
    pose({ type: 'trait', x: 150, y: 400, pts, couleur: '#1b2230', taille: 4, opacite: 1, pression: false })
    const F = pose({ type: 'formule', x: 300, y: 150, latex: '\\sqrt{2}\\approx 1{,}414', couleur: '#d0342c', taille: 28 })
    const f = a.forme(F)
    a.transformerSelection(C.composer(C.rotation({ x: f.x, y: f.y }, Math.PI / 4), C.echelle({ x: f.x, y: f.y }, 2, 2)), [F])
    a.allerVers({ x: 0, y: 0, z: 1 }, 0); a.selection.clear(); a.ui.maj()
    return { page: a.page, F }
  }, fond)
}
await P.waitForTimeout(500)

console.log('=== A. la revue (contraste éteint, puis allumé) ===')
async function revue(nom) {
  await P.mouse.move(5, 400)
  await P.click('button[title^="Revoir la construction"]'); await P.waitForTimeout(1200)
  await P.keyboard.press('End'); await P.waitForTimeout(800)
  const r = await P.evaluate(() => {
    const s = document.querySelector('.revue-scene'), b = s?.getBoundingClientRect()
    const f = [...document.querySelectorAll('.revue .formule, .revue-scene .formule')].filter(e => e.style.visibility !== 'hidden')
    return { scene: b && { x: b.left, y: b.top, l: b.width, h: b.height }, formules: f.map(e => ({ tr: e.style.transform, fs: e.style.fontSize })), contraste: window.__app.rendu.contraste }
  })
  const png = await P.screenshot()
  writeFileSync(`${D}/revue-${nom}.png`, png)
  for (let i = 0; i < 4 && await P.evaluate(() => window.__app.enLecture); i++) { await P.keyboard.press('Escape'); await P.waitForTimeout(150) }
  return r
}
const r1 = await revue('normal')
ok(r1.formules.some(f => /rotate\(0\.785/.test(f.tr) && f.fs === '56px'), 'A) La revue montre la formule agrandie (56 px) et tournée de 45°', r1)
await P.evaluate(() => window.__app.ui.choisirContraste(true))
const r2 = await revue('contraste')
note('Revue en contraste renforcé', { contraste: r2.contraste })

console.log('=== B. le film élève et le lecteur ===')
const film = await P.evaluate(async () => {
  const ex = await import('/src/revoir/exporter.ts'), fo = await import('/src/revoir/format.ts')
  const t = window.__app.tableau
  const s = ex.seancesDuFilm(t.film.toArray()).at(-1)
  const f = ex.exporter(t, { de: s.de, a: s.a, pages: window.__app.pages.slice(-4), titre: 'Verif affichage' })
  const texte = await fo.ecrireFilm(f)
  return { texte, v: f.v, contraste: /contraste/i.test(JSON.stringify(f)), fonds: f.pages.map(p => p.fond), rotations: JSON.stringify(f).match(/"rotation":[-\d.e]+/g) }
})
ok(film.v === 1 && !film.contraste, 'B) Le film élève (version 1) ne porte aucune trace du contraste renforcé (allumé chez le professeur)', { v: film.v, contraste: film.contraste })
ok(film.rotations?.length >= 4, 'B) … il porte la rotation des formules', film.rotations)
note('Fonds des pages du film', film.fonds)
await P.evaluate(() => window.__app.ui.choisirContraste(false))

// Le lecteur, dans un navigateur où le contraste renforcé est réglé (le même
// localStorage sur GitHub Pages)
for (const contraste of ['0', '1']) {
  const c = await contexte(nav)
  await c.addInitScript(v => { try { localStorage.setItem('mem-contraste', v) } catch {} }, contraste)
  const L = await c.newPage(); suivre(L, 'lecteur')
  await L.goto(DEV + 'revoir.html')
  await L.locator('input[type=file]').setInputFiles({ name: 'verif.mem', mimeType: 'application/json', buffer: Buffer.from(film.texte) })
  await L.waitForTimeout(1500)
  await L.keyboard.press('End'); await L.waitForTimeout(1500)
  const lu = await L.evaluate(() => {
    const c = [...document.querySelectorAll('canvas')].find(x => x.width > 300)
    const d = c.getContext('2d').getImageData(0, 0, c.width, c.height).data
    let lum = 0; for (let i = 0; i < d.length; i += 4) lum += 0.2126 * d[i] + 0.7152 * d[i + 1] + 0.0722 * d[i + 2]
    const f = [...document.querySelectorAll('.formule')].filter(e => e.style.visibility !== 'hidden')
    return { lum: Math.round(lum / (d.length / 4) * 100) / 100, formules: f.map(e => e.style.transform), body: document.body.className, ls: localStorage.getItem('mem-contraste') }
  })
  writeFileSync(`${D}/lecteur-contraste-${contraste}.png`, await L.screenshot())
  note(`Lecteur (mem-contraste = ${contraste})`, lu)
  if (contraste === '0') var lu0 = lu
  else ok(lu.lum === lu0.lum && !/contraste/.test(lu.body), 'B) Le lecteur élève peint pareil, que le contraste renforcé soit réglé ou non dans ce navigateur', { lu0, lu })
  if (contraste === '0') ok(lu.formules.some(t => /rotate\(0\.785/.test(t)), 'B) Le lecteur élève montre la formule tournée', lu.formules)
  await c.close()
}
await fin(nav)
