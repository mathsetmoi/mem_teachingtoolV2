// La barre du haut d'une page sans nom à une page nommée : les boutons bougent-ils ?
import { ouvrir, preparer, etat, centre, verifier, pause, fin, D } from './lib.mjs'
for (const [nom, vp] of [['portable 1366', { width: 1366, height: 768 }], ['tablette 1024', { width: 1024, height: 768 }], ['TNI 1920', { width: 1920, height: 1080 }]]) {
  const { ctx, page } = await ouvrir({ viewport: vp }, nom)
  const P = await preparer(page, 3, { ici: 1, noms: { 2: 'Exercice 12 p. 84' } })
  const pos = () => page.evaluate(() => [...document.querySelectorAll('button')].filter(b => { const r = b.getBoundingClientRect(); return r.width > 0 && r.top < 70 && !b.closest('.trieuse') && !b.closest('.toast') }).map(b => { const r = b.getBoundingClientRect(); return { nom: (b.getAttribute('aria-label') || b.title).slice(0, 30), x: Math.round(r.left), l: Math.round(r.width) } }))
  const a = await pos()
  await page.evaluate(() => { const a = window.__app; a.allerPage(a.pages[2]) }); await pause(200)
  const b = await pos()
  const bouges = a.map((x, i) => ({ nom: x.nom, avant: x.x, apres: b[i]?.x, l: [x.l, b[i]?.l] })).filter(x => x.avant !== x.apres || x.l[0] !== x.l[1])
  verifier(`${nom} : de la page 2 (sans nom) à la page 3 (« Exercice 12 p. 84 »), aucun bouton de la barre du haut ne bouge`, !bouges.length, bouges)
  await page.screenshot({ path: D + `/barre-${nom.replace(/\W/g, '')}.png`, clip: { x: 0, y: 0, width: vp.width, height: 70 } })
  await ctx.close()
}
await fin()
