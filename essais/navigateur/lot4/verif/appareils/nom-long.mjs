// Un nom de classeur de 60 caractères, par écran : le bouton du classeur ne
// recouvre ni la barre du haut ni celle des outils ; son nom est coupé,
// entier dans son titre ; l'état reste lisible.
import { lancer, contexte, ouvrir, erreurs, info, ok, dort, CAPTURES } from './outils.mjs'
const nav = await lancer()
const NOM = 'Symétrie centrale et axiale : cours, exercices et corrigés 5e'.slice(0, 60)
for (const [w, h, t] of [[1366, 768], [1280, 720], [1180, 820, 1], [1024, 768], [1920, 1080, 1], [1440, 900], [1600, 900], [820, 1180, 1], [390, 844, 1]]) {
  const ctx = await contexte(nav, { viewport: { width: w, height: h }, ...(t ? { hasTouch: true } : {}) })
  const p = await ouvrir(ctx, '', 'nom')
  await p.evaluate(async n => { const id = window.__app.classeur.id; await window.__registre.modifierClasseur(id, f => { f.nom = n }) }, NOM)
  await p.reload(); await p.waitForFunction(() => document.querySelector('.rang')?.textContent?.includes('/'), null, { timeout: 30000 }); await dort(800)
  const g = await p.evaluate(() => {
    const r = s => { const e = document.querySelector(s); if (!e || !e.getClientRects().length) return null; const b = e.getBoundingClientRect(); return [Math.round(b.left), Math.round(b.top), Math.round(b.right), Math.round(b.bottom)] }
    const inter = (a, b) => a && b && Math.min(a[2], b[2]) - Math.max(a[0], b[0]) > 0 && Math.min(a[3], b[3]) - Math.max(a[1], b[1]) > 0
    const bc = r('.bouton-classeur'), haut = r('.barre-haut'), outils = r('.barre-outils, .barre-gauche'), barre = r('.barre-classeur')
    const nom = document.querySelector('.nom-classeur'), etat = document.querySelector('.etat-classeur')
    return { forme: window.__app.ui.formeClasseur, bc, barre, haut, outils, surHaut: inter(barre ?? bc, haut) && document.querySelector('.bouton-classeur').parentElement === document.querySelector('.barre-classeur'), surOutils: inter(barre ?? bc, outils),
      nomCoupe: nom ? nom.scrollWidth > nom.clientWidth : null, titre: document.querySelector('.bouton-classeur').title, etat: etat?.textContent, etatCoupe: etat ? etat.scrollWidth > etat.clientWidth + 1 : null, onglet: document.title }
  })
  ok(!g.surHaut && !g.surOutils, `${w}×${h} nom de 60 caractères : le bouton (${g.forme}) ne recouvre aucune barre`, g)
  if (g.forme === 'large') ok(g.titre === NOM && !g.etatCoupe, `   … le nom coupé (${g.nomCoupe}), entier dans le titre ; l'état « ${g.etat} » entier`, { titre: g.titre, etatCoupe: g.etatCoupe })
  await p.screenshot({ path: CAPTURES + `nom-long-${w}x${h}.png`, clip: { x: 0, y: 0, width: Math.min(w, 900), height: 200 } })
  await ctx.close()
}
console.log('erreurs JS', erreurs)
await nav.close()
