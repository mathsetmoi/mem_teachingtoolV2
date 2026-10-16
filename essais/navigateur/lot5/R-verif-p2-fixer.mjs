// SONDE DE VÉRIFICATION reprise dans la batterie (corrections des vérifications
// des retouches après le lot 5) : « Fixer en fond » du message juste après l'import (bouton,
// Ctrl+V, fichier déposé), puis un trait à la Wacom sur l'image : de l'encre (le défaut
// « important » des rapports parcours et regressions).
// Copie de retouches/verif/parcours/p2-fixer.mjs ; elle lit les versions construites du dépôt (voir R-verif/lib.mjs).
// Parcours 2 : importer un énoncé, le « Fixer en fond » du message tout de
// suite (ce que le message propose), puis écrire dessus à la Wacom.
import { D, ok, note, demarrer, contexte, ouvrir, clic, clicSur, trait, ecran, lire, pastille, coins, rect,
  fabriquer, importer, glisser, fin, boite } from './R-verif/lib.mjs'

const LIEU = process.argv[2] ?? 'ligne'
const { serveur, URLS, nav } = await demarrer()
const url = URLS[LIEU], L = 1366
const ctx = await contexte(nav, url, L, 768)
const { p, souris, wacom } = await ouvrir(ctx, url, LIEU)
const b64 = await fabriquer(p)

for (const comment of ['bouton', 'coller', 'deposer']) {
  console.log(`\n--- ${comment}`)
  await wacom.survol(L - 200, 650); await p.waitForTimeout(150)
  await importer(p, wacom, comment, b64)
  let e = await ecran(p)
  const a = await lire(p)
  note('après l\'import', { outil: e.outil, toast: e.toast })
  // le bouton « Fixer en fond » du message, à la Wacom
  const ok1 = await clicSur(p, wacom, '.toast.visible button.action')
  await p.waitForTimeout(300)
  e = await ecran(p)
  note('après « Fixer en fond » (le message)', { outil: e.outil, toast: e.toast })
  // Ce que le message invite à faire : écrire par-dessus, à la Wacom
  const b0 = await lire(p)
  await trait(p, wacom, a.cx - 150, a.cy + 40, a.cx + 150, a.cy + 60)
  const b1 = await lire(p)
  e = await ecran(p)
  ok(b1.encre > b0.encre + 20, `${comment} : « Fixer en fond » du message, puis un trait à la Wacom sur l'image : de l'encre (outil ${e.outil})`, { b0: b0.encre, b1: b1.encre, e })
  await p.screenshot({ path: `${D}/p2-${LIEU}-${comment}-apres-trait.png` })
  // Et Échap une fois (la sélection est vide) : le Stylo ?
  await p.keyboard.press('Escape'); await p.waitForTimeout(250)
  e = await ecran(p)
  note('Échap une fois après Fixer', { outil: e.outil, toast: e.toast })
  await trait(p, wacom, a.cx - 150, a.cy + 100, a.cx + 150, a.cy + 120)
  const b2 = await lire(p)
  note('… puis un trait', { encre: b2.encre, gain: b2.encre - b1.encre })
  // nettoyer : nouvelle page
  await p.keyboard.press('p'); await p.waitForTimeout(100)
  await clicSur(p, wacom, '.barre-haut > .nouvelle-page'); await p.waitForTimeout(700)
}

await ctx.close()
await fin(nav, serveur)
