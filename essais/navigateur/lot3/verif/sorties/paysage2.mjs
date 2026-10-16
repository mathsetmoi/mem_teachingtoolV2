// Le nombre de feuilles selon le rapport du contenu (une seule figure, un cercle et un rectangle)
import { nav, ouvrir, exporter, info, verifier, ctrlP, mkdir, V, erreurs } from './lib.mjs'
const D = mkdir(V + '/out/paysage2')
const { ctx, page } = await ouvrir({}, 'paysage2')
const cas = [[1300, 1000], [1400, 1000], [1600, 1000], [1000, 1500], [1000, 1400], [800, 600], [1200, 900]]
for (const [L, H] of cas) {
  await page.evaluate(([L, H]) => {
    const a = window.__app, t = a.tableau
    a.nouvellePage()
    t.poser(a.page, { id: 'r' + L + 'x' + H, type: 'polygone', x: 0, y: 0, z: 1, auteur: t.moi, pts: [0, 0, L, 0, L, H, 0, H], ferme: true, couleur: '#1b5fbf', taille: 3 })
  }, [L, H])
  await page.waitForTimeout(200)
  const r = await exporter(page, D, `${L}x${H}`, ctrlP(page))
  const i = info(r.fichier)
  console.log(`${L} × ${H} unités (${(L / 40).toFixed(1)} × ${(H / 40).toFixed(1)} cm, rapport l/h ${(L / H).toFixed(2)}) : ${i.pages} feuille(s) ${i.l > i.h ? 'paysage' : 'portrait'}`)
}
if (erreurs.length) { console.log('ÉCHEC erreurs JS :', erreurs); process.exitCode = 1 }  // contrôle final : un échec visible
await nav.close()
