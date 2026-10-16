// Beaucoup de classes (12 étiquettes), des dossiers imbriqués profonds aux noms longs, au téléphone : la rangée
// du filtre, le fil d'Ariane, le menu Trier ; rien hors de l'écran.
import { lancer, contexte, ouvrir, info, ok, dort, DEBORDE, CAPTURES, creerPlusieurs, creerDossier } from './outils.mjs'
const nav = await lancer()
for (const [w, h] of [[390, 844], [320, 568], [1024, 768]]) {
  const ctx = await contexte(nav, { viewport: { width: w, height: h }, hasTouch: w < 900, isMobile: w < 900 })
  const p = await ouvrir(ctx, '', 'filtre')
  const classes = ['6e A', '6e B', '5e A', '5e B', '4e C', '3e D', '2nde 3', '2nde 7', '1re G2', 'Tle spé 1', 'Soutien', 'Club maths']
  for (const c of classes) await creerPlusieurs(p, 1, { noms: ['Leçon ' + c], etiquettes: [c] })
  let parent = null
  for (const n of ['Lycée François Bazin', 'Seconde générale et technologique', 'Géométrie dans le plan et l\'espace', 'Vecteurs, translations et coordonnées']) parent = await creerDossier(p, n, { parent })
  await creerPlusieurs(p, 1, { noms: ['Un classeur au nom vraiment très long pour voir comment il se coupe'], dossier: parent })
  await p.evaluate(() => window.__registre.ecrireReglage('conseil', 'vu'))
  await p.evaluate(() => window.__app.ui.ouvrirBibliotheque()); await p.waitForSelector('.bibliotheque:not([hidden])'); await dort(400)
  let d = await p.evaluate(DEBORDE, '.bibliotheque')
  ok(d.length === 0, `${w}×${h} 12 classes : rien hors de l'écran`, d)
  await p.evaluate(id => window.__bibliotheque.allerA(id), parent); await dort(400)
  d = await p.evaluate(DEBORDE, '.bibliotheque')
  const fil = await p.evaluate(() => { const f = document.querySelector('.biblio-fil'); return { w: f.scrollWidth, cw: f.clientWidth, h: Math.round(f.getBoundingClientRect().height), items: [...f.querySelectorAll('li')].map(l => l.textContent) } })
  ok(d.length === 0, `${w}×${h} 4 niveaux de dossiers aux noms longs : le fil d'Ariane et la grille dans l'écran`, { d, fil })
  await p.screenshot({ path: CAPTURES + `fil-${w}x${h}.png` })
  await p.evaluate(() => window.__bibliotheque.allerA(null)); await dort(300)
  await p.tap?.('.biblio-tri').catch(() => p.click('.biblio-tri'))
  await dort(300)
  d = await p.evaluate(DEBORDE, '.menu-flottant:not([hidden])')
  ok(d.length === 0, `${w}×${h} le menu Trier dans l'écran`, d)
  await p.screenshot({ path: CAPTURES + `filtre-${w}x${h}.png` })
  await ctx.close()
}
await nav.close()
