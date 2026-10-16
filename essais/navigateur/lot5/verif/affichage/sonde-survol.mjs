// Sonde : le survol d'un objet passe-t-il à travers la barre des outils ?
import { lancer, contexte, ouvrir } from './lib/commun.mjs'
const nav = await lancer(); const ctx = await contexte(nav); const P = await ouvrir(ctx)
for (const type of ['formule', 'trait']) {
  const r = await P.evaluate(type => {
    const a = window.__app, t = a.tableau
    a.nouvellePage(); a.choisirOutil('selection'); a.cam.x = 0; a.cam.y = 0; a.cam.z = 1
    const pts = []; for (let i = 0; i <= 20; i++) pts.push(i * 10, 0, 0.5)
    const f = type === 'formule' ? { type: 'formule', x: 10, y: 480, latex: 'xxxxxxxxxxxx', couleur: '#1b2230', taille: 40 }
      : { type: 'trait', x: 0, y: 500, pts, couleur: '#1b2230', taille: 8, opacite: 1, pression: false }
    t.nouveauGeste(); t.poser(a.page, { id: 's' + type, z: Date.now(), auteur: t.moi, ...f })
    a.rendu.toutRedessiner(); a.ui.maj()
    return true
  }, type)
  await P.mouse.move(600, 300); await P.waitForTimeout(100)
  await P.mouse.move(40, 500, { steps: 5 }); await P.waitForTimeout(200)
  const s = await P.evaluate(() => ({ survol: window.__app.rendu.survol, sous: document.elementFromPoint(40, 500)?.closest('.barre')?.className }))
  console.log(type, JSON.stringify(s))
}
await nav.close()
