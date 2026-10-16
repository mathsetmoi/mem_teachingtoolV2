// SONDE DE VÉRIFICATION reprise dans la batterie (corrections des vérifications
// des retouches après le lot 5) : l'import et la rotation sur un écran tactile (doigt, crayon).
// Copie de retouches/verif/parcours/p6-tactile.mjs ; elle lit les versions construites du dépôt (voir R-verif/lib.mjs).
// Parcours 6 : un écran tactile (TNI, ordinateur tactile : le doigt), puis un
// iPad avec l'Apple Pencil simulé (pen sans survol). Version construite.
import { D, ok, note, demarrer, contexte, ouvrir, clic, clicSur, trait, ecran, lire, pastille, coins, rect, couvre, disque,
  fabriquer, importer, tourner, glisser, ecartAngle, fin, boite, session } from './R-verif/lib.mjs'

const LIEU = process.argv[2] ?? 'ligne'
const QUI = process.argv[3] ?? 'doigt'          // doigt | crayon
const { serveur, URLS, nav } = await demarrer()
const url = URLS[LIEU]
const [L, H] = process.env.TAILLE ? JSON.parse(process.env.TAILLE) : QUI === 'doigt' ? [1366, 768] : [1180, 820]
const ctx = await contexte(nav, url, L, H, { hasTouch: true })
const o = await ouvrir(ctx, url, LIEU)
const p = o.p, ptr = o[QUI]
const tag = `p6-${LIEU}-${QUI}-${L}x${H}`
let e = await ecran(p)
ok(e.taille === 'Fin' && e.fond === 'Page blanche' && e.zoom === '100 %', `${tag} : session neuve`, e)
note('maxTouchPoints', await p.evaluate(() => navigator.maxTouchPoints))

// écrire
await trait(p, ptr, 300, 220, 520, 240)
let v = await lire(p)
ok(v.encre > 20, `${tag} : ${QUI} écrit au Stylo`, { encre: v.encre })

// importer au bouton Image (touché)
const b64 = await fabriquer(p)
await importer(p, ptr, 'bouton', b64)
e = await ecran(p)
let a0 = await lire(p)
ok(e.outil === 'selection', `${tag} : import → Sélection`, e)
ok(e.toast.includes('Touchez le Stylo pour écrire de nouveau.'), `${tag} : le message dans les mots du toucher`, e.toast)
await p.waitForTimeout(400)
let q = await pastille(p)
const t = await rect(p, '.toast.visible'), b = await rect(p, '.barre-actions')
note('pastille, message, barre', { q, t, b, img: [a0.x1, a0.y1, a0.x2, a0.y2] })
ok(q && !couvre(t, disque(q, 18)) && !couvre(t, b), `${tag} : message ni sur la pastille ni sur la barre`)
await p.screenshot({ path: `${D}/${tag}-import.png` })

// tourner à la pastille
if (q) {
  await tourner(p, ptr, q, { x: a0.cx, y: a0.cy }, 35)
  const a1 = await lire(p)
  ok(Math.abs(ecartAngle(a1.angle, a0.angle) - 35) <= 2 && Math.abs(a1.aire / a0.aire - 1) < 0.03, `${tag} : tourner à la pastille : ${ecartAngle(a1.angle, a0.angle)}°`, { a1 })
  await p.keyboard.press('Control+z'); await p.waitForTimeout(300)
}
// agrandir par le coin bas droit
a0 = await lire(p)
await glisser(p, ptr, { x: a0.x2, y: a0.y2 }, { x: a0.x2 + 50, y: a0.y2 + 30 })
let a2 = await lire(p)
ok(a2.aire > a0.aire * 1.08, `${tag} : coin bas droit : aire ×${(a2.aire / a0.aire).toFixed(2)}`, { a2 })
// le quart de tour : la barre d'actions « Options », puis ⋯
const opt = await boite(p, '.barre-actions button:has-text("Options")')
note('bouton Options de la barre d\'actions', opt)
if (opt) {
  await clic(p, ptr, opt.x + opt.width / 2, opt.y + opt.height / 2); await p.waitForTimeout(400)
  const plus = await boite(p, '.panneau-forme .ligne button.plus')
  if (plus) { await clic(p, ptr, plus.x + plus.width / 2, plus.y + plus.height / 2); await p.waitForTimeout(300) }
  const qd = await boite(p, '.menu-plus .menu-item[data-action="quart-droite"]')
  ok(!!qd, `${tag} : Options → ⋯ → « Tourner d'un quart de tour à droite »`)
  if (qd) {
    await clic(p, ptr, qd.x + qd.width / 2, qd.y + qd.height / 2); await p.waitForTimeout(500)
    const a3 = await lire(p)
    ok(Math.abs(ecartAngle(a3.angle, a2.angle) - 90) <= 1.5, `${tag} : quart de tour : ${ecartAngle(a3.angle, a2.angle)}°`, { a3 })
    await p.screenshot({ path: `${D}/${tag}-quart.png` })
  }
}
// Fixer en fond : le ⋯ (la barre d'actions → Options → ⋯ → Fixer)
a2 = await lire(p)
const opt2 = await boite(p, '.barre-actions button:has-text("Options")')
note('Options visible ? menu complet ouvert ?', { opt2: !!opt2, menu: !!(await rect(p, '.panneau-forme')) })
{
  if (opt2) { await clic(p, ptr, opt2.x + opt2.width / 2, opt2.y + opt2.height / 2); await p.waitForTimeout(400) }
  const plus = await boite(p, '.panneau-forme .ligne button.plus')
  if (plus) { await clic(p, ptr, plus.x + plus.width / 2, plus.y + plus.height / 2); await p.waitForTimeout(300) }
  const fx = await boite(p, '.menu-plus .menu-item[data-action="fixer"]')
  if (fx) { await clic(p, ptr, fx.x + fx.width / 2, fx.y + fx.height / 2); await p.waitForTimeout(400) }
}
e = await ecran(p)
note('après Fixer en fond', e)
ok(e.toast.includes('appui long dessus'), `${tag} : le message de Fixer en fond dans les mots du toucher`, e.toast)
// écrire tout de suite (le message invite à écrire)
let c0 = await lire(p)
await trait(p, ptr, a2.cx - 120, a2.cy + 20, a2.cx + 120, a2.cy + 40)
let c1 = await lire(p)
note(`${tag} : écrire tout de suite après « Fixer en fond » (outil ${e.outil})`, { avant: c0.encre, apres: c1.encre })
// toucher le Stylo, écrire
await clicSur(p, ptr, '.barre-outils button[title^="Stylo"]'); await p.waitForTimeout(250)
e = await ecran(p)
c0 = await lire(p)
await trait(p, ptr, a2.cx - 120, a2.cy + 80, a2.cx + 120, a2.cy + 100)
c1 = await lire(p)
ok(e.outil === 'stylo' && c1.encre > c0.encre + 20 && Math.abs(c1.cx - c0.cx) < 1, `${tag} : le Stylo touché, ${QUI} écrit sur l'image fixée`, { outil: e.outil, avant: c0.encre, apres: c1.encre })
await p.screenshot({ path: `${D}/${tag}-ecrit.png` })

// Nouvelle page (+) et retour
const s1 = await session(p)
await clicSur(p, ptr, '.barre-haut > .nouvelle-page'); await p.waitForTimeout(700)
e = await ecran(p)
ok(e.fond === 'Page blanche' && e.zoom === '100 %' && e.rang.startsWith('2 / 2'), `${tag} : + → page blanche, 100 %`, e)
await clicSur(p, ptr, '.barre-haut button[aria-label="Page précédente (Page ↑)"]'); await p.waitForTimeout(700)
e = await ecran(p)
ok(e.rang.startsWith('1 / 2') && e.zoom === '100 %', `${tag} : retour page 1 à 100 %`, e)
await ctx.close()
await fin(nav, serveur)
