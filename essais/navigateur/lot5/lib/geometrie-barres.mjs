// La géométrie des barres (lot 5, K10) : la boîte de chaque élément visible
// de la barre des outils, de la barre du haut, de la barre du zoom et de la
// barre du classeur, à une taille de fenêtre et un appareil donnés. K10 la
// relève avant de toucher à la mise en page (la référence, figée dans lot5/K10-telephone/reference-barres.json) et
// après : au poste de la classe et sur l'iPad, rien ne doit changer.
import { chromium } from '../../commun/playwright.mjs'

export const APPAREILS_FIXES = [
  ['PC 1366 × 768 (souris)', { viewport: { width: 1366, height: 768 } }],
  ['PC 1024 × 768 (souris)', { viewport: { width: 1024, height: 768 } }],
  ['PC 1280 × 720 (souris)', { viewport: { width: 1280, height: 720 } }],
  ['TNI 1920 × 1080 (doigt)', { viewport: { width: 1920, height: 1080 }, screen: { width: 1920, height: 1080 }, hasTouch: true }],
  ['iPad 1180 × 820 (doigt)', { viewport: { width: 1180, height: 820 }, screen: { width: 1180, height: 820 }, hasTouch: true, isMobile: true, deviceScaleFactor: 2 }],
  ['iPad 820 × 1180 (doigt)', { viewport: { width: 820, height: 1180 }, screen: { width: 820, height: 1180 }, hasTouch: true, isMobile: true, deviceScaleFactor: 2 }],
  ['iPad Mini 768 × 1024 (doigt)', { viewport: { width: 768, height: 1024 }, screen: { width: 768, height: 1024 }, hasTouch: true, isMobile: true, deviceScaleFactor: 2 }],
]

export const MESURER_BARRES = () => {
  const out = {}
  const r = e => { const b = e.getBoundingClientRect(); return [Math.round(b.left * 2) / 2, Math.round(b.top * 2) / 2, Math.round(b.width * 2) / 2, Math.round(b.height * 2) / 2] }
  for (const s of ['.barre-outils', '.barre-haut', '.barre-zoom', '.barre-classeur']) {
    const barre = document.querySelector(s)
    if (!barre || !barre.getClientRects().length) { out[s] = null; continue }
    const enfants = []
    // (depuis les gains rapides du lot 16, plus de rangée .tailles : l'épaisseur
    // est un bouton, et les pastilles, des boutons, sont dans une grille)
    for (const e of barre.querySelectorAll('button, hr, .rang')) {
      if (!e.getClientRects().length) continue
      // (le nom d'un élément sans titre : sa classe, sans celle que K10 ajoute
      // à ce qui se cache au téléphone, qui ne change rien ici)
      enfants.push({ q: (e.title || e.getAttribute('aria-label') || e.className.replace(/ seulement-large/, '')).slice(0, 40), b: r(e) })
    }
    out[s] = { b: r(barre), enfants }
  }
  return out
}

/** Relève la géométrie sur chaque appareil fixe ; rend { nom: géométrie } */
export async function releverBarres(dev = 'http://localhost:5173/', erreurs = []) {
  const nav = await chromium.launch()
  const res = {}
  for (const [nom, o] of APPAREILS_FIXES) {
    const c = await nav.newContext(o)
    await c.route(/accounts\.google\.com|apis\.google\.com/, rt => rt.fulfill({ contentType: 'text/javascript', body: '' }))
    const p = await c.newPage(); p.on('pageerror', e => erreurs.push(nom + ': ' + e.message))
    await p.goto(dev)
    await p.waitForFunction(() => window.__app && document.querySelector('.rang')?.textContent?.includes('/'), null, { timeout: 30000 })
    await p.evaluate(() => document.fonts?.ready)
    await p.waitForTimeout(1200)
    res[nom] = await p.evaluate(MESURER_BARRES)
    await c.close()
  }
  await nav.close()
  return res
}
