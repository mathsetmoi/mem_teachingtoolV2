// CONFORMITÉ, point 1 et 6 : sur un navigateur neuf, le premier classeur
// s'appelle « Premier classeur ». Le titre de l'onglet et le bouton du
// classeur le disent-ils, comme le menu ⋯ et la bibliothèque ?
import * as O from './outils.mjs'
const { ok, norm } = O
const ICI = new URL('.', import.meta.url).pathname
await O.lancer()
const g = new O.FauxGoogle()
for (const largeur of [1366, 1024]) {
  const ctx = await O.contexte(g, { ctx: { viewport: { width: largeur, height: 768 } } })
  const p = await O.ouvrir(ctx, '', 'N' + largeur, false)
  const lire = () => p.evaluate(async () => {
    const b = document.querySelector('.bouton-classeur')
    const f = await window.__registre.classeur(window.__app.classeur.id)
    return { titre: document.title, bouton: b?.querySelector('.nom-classeur')?.textContent ?? b?.innerText, aria: b?.getAttribute('aria-label'), title: b?.title,
      points: document.querySelector('.barre-haut .bouton.points')?.title, classeur: window.__app.classeur.nom, fiche: f?.nom }
  })
  const a = await lire()
  await p.waitForTimeout(5000)
  const b = await lire()
  console.log(largeur, 'aussitôt :', JSON.stringify(a))
  console.log(largeur, '5 s après :', JSON.stringify(b))
  await p.click('.barre-haut .bouton.points'); await p.waitForTimeout(200)
  const nomMenu = await p.evaluate(() => [...document.querySelectorAll('.menu-flottant')].find(x => !x.hidden)?.innerText.split('\n')[0])
  await O.fermerMenu(p)
  ok(b.fiche === 'Premier classeur' && nomMenu === 'Premier classeur', `${largeur} : la fiche et le menu ⋯ disent « ${b.fiche} », « ${nomMenu} »`)
  ok(b.titre === 'Premier classeur — MEM teachingtool', `${largeur} : le titre de l'onglet dit « ${b.titre} »`, b)
  ok(/Premier classeur/.test(b.aria + b.title + b.points), `${largeur} : le bouton du classeur (ou le titre de ⋯) dit « Premier classeur »`, b)
  await p.screenshot({ path: ICI + `captures/nom-neuf-${largeur}.png`, clip: { x: 0, y: 0, width: largeur, height: 120 } })
  // Rechargé : le nom est-il le bon ?
  await p.reload(); await O.pret(p); await p.waitForTimeout(500)
  const c = await lire()
  console.log(largeur, 'après un rechargement :', JSON.stringify(c))
  await ctx.close()
}
console.log('erreurs :', JSON.stringify(O.erreurs))
await O.navigateur.close()
