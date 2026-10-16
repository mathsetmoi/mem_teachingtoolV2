// D1 : « les commandes d'ordre n'agissent que dans le calque de l'objet, et le menu le dit » : un trait sous une formule.
import * as O from './lib/outils.mjs'
const { ok, note, C } = O
const ctx = await O.contexte()
const { p } = await O.ouvrir(ctx, 'ordre')
await p.evaluate(O.IMAGES); await p.evaluate(O.PAGE_NEUVE)
const F = await O.poser(p, O.formule(150, 150, { taille: 60 }))
const T = await O.poser(p, O.trait(140, 190, 300, { taille: 14, couleur: '#d03030' }))
const I = await O.poser(p, O.image('vert', 120, 260, 200, 100))
const T2 = await O.poser(p, O.trait(140, 300, 250, { taille: 10 }))
// le trait, posé après la formule, est peint sous elle (calques) ; son menu ⋯
for (const [nom, id, x, y] of [['trait sous la formule', T, 420, 190], ['image sous un trait', I, 300, 340]]) {
  await O.clicDroit(p, x, y)
  await p.locator('.panneau-forme .ligne button.plus').click(); await p.waitForTimeout(150)
  note(nom, (await p.evaluate(O.ENTREES, '.menu-plus')).filter(e => /plan|Avancer|Reculer/.test(e.t ?? '')).map(e => [e.t, e.inactif ? 'grisé' : 'actif', e.aide ?? '(pas d\'aide)']))
  await p.keyboard.press('Escape'); await p.keyboard.press('Escape'); await O.vider(p)
}
await O.viderMsgs(p)
await O.clic(p, 420, 190); await p.keyboard.press('Control+Shift+ArrowUp'); await p.waitForTimeout(150)
note('Ctrl + Maj + ↑ sur le trait sous la formule : message', await O.msgs(p))
await p.screenshot({ path: C + '/captures/t24.png' })
await O.fin()
