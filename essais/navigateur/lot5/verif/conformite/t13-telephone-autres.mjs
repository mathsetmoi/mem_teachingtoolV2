// Point 5, suite : au téléphone, le message à bouton (« Fixer en fond » après l'import), « Revenir au contenu »,
// la fenêtre « Envoyer vers… », Publier, l'éditeur de formule, la liste des instruments.
import * as O from './lib/outils.mjs'
const { ok, note, C } = O
const TAILLE = sel => [...document.querySelectorAll(sel)].filter(e => e.getClientRects().length && getComputedStyle(e).visibility !== 'hidden').map(b => { const r = b.getBoundingClientRect(); return `${(b.textContent || b.getAttribute('aria-label') || '').trim().slice(0, 30)} ${Math.round(r.width)}×${Math.round(r.height)} @${Math.round(r.left)},${Math.round(r.top)}` })
const ctx = await O.contexte({ viewport: { width: 390, height: 844 }, hasTouch: true, isMobile: true, deviceScaleFactor: 2 })
const { p } = await O.ouvrir(ctx, 'tel')
// le message de l'import et son bouton
await p.evaluate(async () => {
  const cv = Object.assign(document.createElement('canvas'), { width: 300, height: 200 }); const g = cv.getContext('2d'); g.fillStyle = '#ddd'; g.fillRect(0, 0, 300, 200)
  const b = await new Promise(r => cv.toBlob(r, 'image/png')); await window.__app.importerImage(b)
})
await p.waitForTimeout(400)
note('boutons du message de l\'import', await p.evaluate(TAILLE, '.toast button, .message button, [role=status] button'))
await p.screenshot({ path: C + '/captures/t13-toast.png' })
// Envoyer vers… (depuis la barre d'actions → Options → ⋯)
await p.evaluate(() => window.__app.ui.message('x'))
await p.waitForTimeout(200)
// Revenir au contenu : la vue loin du contenu
await p.evaluate(() => { const a = window.__app; a.cam.x = -50000; a.cam.y = -50000; a.rendu.toutRedessiner(); a.ui.maj() })
await p.waitForTimeout(600)
note('Revenir au contenu', await p.evaluate(TAILLE, 'button.revenir, .revenir-contenu, button[class*=revenir]'))
await p.screenshot({ path: C + '/captures/t13-revenir.png' })
// l'éditeur de formule
await p.evaluate(() => { window.__app.ui.editerFormule('x^2', 100, 300) })
await p.waitForTimeout(600)
note('éditeur de formule', await p.evaluate(TAILLE, '.editeur-formule button, dialog[open] button, .formule-editeur button'))
await p.screenshot({ path: C + '/captures/t13-editeur.png' })
await p.keyboard.press('Escape'); await p.waitForTimeout(300)
// Instruments… par Plus
await p.locator('.barre-haut button[aria-label^="Plus"]').tap(); await p.waitForTimeout(300)
const ins = p.locator('[role=menu]:not([hidden]) [role=menuitem]', { hasText: 'Instruments' }).first()
if (await ins.count()) { await ins.tap(); await p.waitForTimeout(400) }
note('liste des instruments', await p.evaluate(TAILLE, '[role=menu]:not([hidden]) [role=menuitem], [role=menu]:not([hidden]) button'))
await p.screenshot({ path: C + '/captures/t13-instruments.png' })
await O.fin()
