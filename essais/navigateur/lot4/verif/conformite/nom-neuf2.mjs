// CONFORMITÉ : le nom d'un navigateur neuf, répété (une course ?)
import * as O from './outils.mjs'
const { ok } = O
await O.lancer()
const g = new O.FauxGoogle()
const vus = []
for (let i = 0; i < 8; i++) {
  const ctx = await O.contexte(g)
  const p = await O.ouvrir(ctx, '', 'N' + i, false)
  const lire = () => p.evaluate(async () => {
    const b = document.querySelector('.bouton-classeur')
    const f = await window.__registre.classeur(window.__app.classeur.id)
    return { titre: document.title, bouton: b?.title, classeur: window.__app.classeur.nom, fiche: f?.nom }
  })
  const a = await lire()
  await p.waitForTimeout(3000)
  const b = await lire()
  vus.push({ a, b })
  console.log(i, JSON.stringify(a), '→', JSON.stringify(b))
  await ctx.close()
}
const faux = vus.filter(v => v.b.fiche !== v.b.bouton || !v.b.titre.startsWith(v.b.fiche))
ok(!faux.length, `sur ${vus.length} navigateurs neufs, le titre et le bouton disent le nom de la fiche`, faux)
await O.navigateur.close()
