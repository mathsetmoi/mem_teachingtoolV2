// SONDE DE VÉRIFICATION reprise dans la batterie (corrections des vérifications
// des retouches après le lot 5) : la trieuse : insertion en page blanche, copie à 100 %.
// Copie de retouches/verif/conformite/c10-trieuse.mjs ; elle lit les versions construites du dépôt (voir R-verif/lib.mjs).
// A2 : la trieuse, « Insérer une page après… » d'une page en Seyès : Page blanche cochée, focus, sous le pointeur
import { demarrer, contexte, ouvrir, ecran, ok, note, fin, D } from './R-verif/lib.mjs'
const { serveur, URLS, nav } = await demarrer()
for (const [nom, url] of Object.entries(URLS)) {
  const ctx = await contexte(nav, url, 1366, 768)
  const { p } = await ouvrir(ctx, url, nom)
  await p.click('button.choix-fond'); await p.waitForTimeout(250)
  await p.locator('.fond-choix[data-fond="seyes"]').filter({ visible: true }).first().click(); await p.waitForTimeout(400)
  await p.click('.rang'); await p.waitForTimeout(900)
  await p.locator('.trieuse .carte .carte-options').first().click(); await p.waitForTimeout(400)
  const ins = p.locator('.menu-item', { hasText: 'Insérer une page après…' }).filter({ visible: true }).first()
  const bi = await ins.boundingBox()
  await p.mouse.click(bi.x + bi.width / 2, bi.y + bi.height / 2); await p.waitForTimeout(500)
  const r = await p.evaluate(([x, y]) => {
    const m = [...document.querySelectorAll('[role=menu]')].find(m => !m.hidden && m.getClientRects().length && /Fond de la page insérée/.test(m.getAttribute('aria-label') ?? ''))
    if (!m) return null
    const items = [...m.querySelectorAll('.menu-item')].map(b => ({ t: b.querySelector('.libelle')?.firstChild?.textContent, aide: b.querySelector('small')?.textContent ?? null, coche: b.getAttribute('aria-checked'), focus: b === document.activeElement }))
    const sous = document.elementFromPoint(x, y)?.closest('.menu-item')?.querySelector('.libelle')?.firstChild?.textContent
    return { titre: m.querySelector('.menu-titre')?.textContent, items, sous }
  }, [bi.x + bi.width / 2, bi.y + bi.height / 2])
  const blanche = r?.items.find(i => i.t === 'Page blanche')
  ok(blanche?.coche === 'true' && blanche.focus && r.sous === 'Page blanche' && r.items.find(i => i.t === 'Seyès')?.aide === 'Celui de la page 1' && r.items.filter(i => i.coche === 'true').length === 1,
    `${nom} A2 : Insérer après une page Seyès : Page blanche cochée, au focus, sous le pointeur ; Seyès « Celui de la page 1 »`, r)
  await p.keyboard.press('Enter'); await p.waitForTimeout(600)
  await p.keyboard.press('Escape'); await p.waitForTimeout(800)
  await p.keyboard.press('PageDown'); await p.waitForTimeout(700)
  const e = await ecran(p)
  ok(e.rang.startsWith('2 / 2') && e.fond === 'Page blanche', `${nom} A2 : la page insérée est blanche`, e)
  await ctx.close()
}
await fin(nav, serveur)
