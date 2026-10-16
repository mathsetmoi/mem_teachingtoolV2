// Le contraste renforcé à l'écran : captures avant / après (fond, figure fine,
// sélection, cadre de taille, pastille), repeint tout de suite au choix, et
// les données inchangées (le document, le film).
import { writeFileSync, rmSync, mkdirSync } from 'node:fs'
import { lancer, contexte, ouvrir, ok, note, fin, OUT } from './lib/commun.mjs'

const D = OUT + '/contraste'
rmSync(D, { recursive: true, force: true }); mkdirSync(D, { recursive: true })
const nav = await lancer()
const ctx = await contexte(nav)
const P = await ouvrir(ctx)
const ids = await P.evaluate(() => {
  const a = window.__app, t = a.tableau
  a.nouvellePage(); a.changerFond('millimetre'); a.choisirOutil('selection')
  const pose = f => { const id = 'c' + Math.random().toString(36).slice(2); t.nouveauGeste(); t.poser(a.page, { id, z: Date.now() + Math.random(), auteur: t.moi, ...f }); return id }
  const tri = pose({ type: 'polygone', x: 0, y: 0, pts: [200, 400, 450, 400, 320, 200], ferme: true, couleur: '#1b2230', taille: 1 })
  const pts = []; for (let i = 0; i <= 20; i++) pts.push(i * 12, Math.sin(i / 2) * 14, 0.5)
  const tr = pose({ type: 'trait', x: 600, y: 300, pts, couleur: '#1b2230', taille: 2, opacite: 1, pression: false })
  a.cam.x = 0; a.cam.y = 0; a.cam.z = 1; a.rendu.toutRedessiner(); a.ui.maj()
  return { tri, tr }
})
await P.waitForTimeout(300)
const donnees = () => P.evaluate(() => JSON.stringify({ formes: [...window.__app.tableau.formesDe?.(window.__app.page) ?? window.__app.formes], film: window.__app.tableau.film.length, fond: window.__app.fond }))
const avantDonnees = await donnees()
const capturer = async nom => {
  await P.mouse.move(5, 740); await P.waitForTimeout(250)
  const b = await P.screenshot({ clip: { x: 150, y: 150, width: 900, height: 330 } })
  writeFileSync(`${D}/${nom}.png`, b)
  return P.evaluate(() => {
    const c = window.__app.rendu.scene, g = c.getContext('2d'), d = g.getImageData(0, 0, c.width, c.height).data
    let s = 0; for (let i = 0; i < d.length; i += 4) s += d[i] + d[i + 1] + d[i + 2]
    return Math.round(s / (d.length / 4) / 3 * 100) / 100
  })
}
const l0 = await capturer('normal')
// Le réglage, par le menu ⋯ (la vraie case)
await P.evaluate(() => window.__app.ui.choisirContraste(true))
await P.waitForTimeout(100)
const l1 = await capturer('contraste')
ok(l1 < l0, `Au choix du contraste renforcé, la scène se repeint tout de suite, plus marquée (luminance ${l0} → ${l1})`)
// La sélection, le cadre et la pastille
await P.evaluate(ids => { const a = window.__app; a.selection.clear(); a.selection.add(ids.tri); a.selection.add(ids.tr); a.rendu.toutRedessiner(); a.ui.maj() }, ids)
await P.waitForTimeout(200)
await capturer('contraste-selection')
await P.evaluate(() => window.__app.ui.choisirContraste(false))
await P.waitForTimeout(100)
await capturer('normal-selection')
const l2 = await capturer('normal-encore')
const apresDonnees = await donnees()
ok(apresDonnees === avantDonnees, 'Le contraste allumé puis éteint ne change rien au document ni au film', { avant: avantDonnees.length, apres: apresDonnees.length })
await fin(nav)
