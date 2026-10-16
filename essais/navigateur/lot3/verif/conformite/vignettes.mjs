// Les vignettes : fond repère, Seyès, formule, figure, image ; capture
import { ouvrir, preparer, etat, verifier, fin, pause, D } from './lib.mjs'

const { page } = await ouvrir()
await preparer(page, 4, { ici: 0 })
await page.evaluate(() => {
  const a = window.__app, t = a.tableau, p = a.pages
  t.changerFond(p[0], 'repere', { x: 400, y: 300 })
  t.changerFond(p[1], 'seyes')
  t.changerFond(p[2], 'blanc')
  t.nouveauGeste()
  t.poser(p[2], { id: 'f1', type: 'formule', x: 300, y: 380, z: Date.now(), auteur: t.moi, latex: '\\frac{3}{4}+\\sqrt{2}=x^2', couleur: '#1b2230', taille: 40 })
  t.nouveauGeste()
  t.poser(p[3], { id: 'tri', type: 'polygone', x: 0, y: 0, z: Date.now(), auteur: t.moi, pts: [200, 400, 600, 400, 400, 100], ferme: true, couleur: '#1f5fbf', taille: 3, noms: ['A', 'B', 'C'] })
})
await pause(300)
await page.keyboard.press('Shift+P'); await pause(2500)
await page.screenshot({ path: D + '/vignettes.png', clip: { x: 0, y: 60, width: 1366, height: 200 } })
await fin()
