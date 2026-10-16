// SONDE DE VÉRIFICATION reprise dans la batterie (corrections des vérifications
// des retouches après le lot 5) : « Fixer en fond » comme premier geste de la séance, au
// doigt et à la Wacom : les mots du pointeur (le défaut du rapport conformite).
// Copie de retouches/verif/conformite/c7-fixer-premier-geste.mjs ; elle lit les versions construites du dépôt (voir R-verif/lib.mjs).
// B5 : « Fixer en fond » touché dans le message de l'import, comme premier
// geste de la séance (rien n'a encore touché le tableau) : quels mots ?
// Au doigt (iPad, TNI) et à la tablette graphique.
import { demarrer, contexte, ouvrir, ecran, ok, note, fin, D, clic, fabriquer, importer, boite } from './R-verif/lib.mjs'

const { serveur, URLS, nav } = await demarrer()
const toastTexte = p => p.evaluate(() => { const t = document.querySelector('.toast.visible'); if (!t) return null; const c = t.cloneNode(true); c.querySelectorAll('button').forEach(b => b.remove()); return c.textContent.trim() })
for (const [nom, url] of Object.entries(URLS)) {
  for (const [qui, o] of [['doigt', { hasTouch: true }], ['wacom', {}]]) {
    const ctx = await contexte(nav, url, 1180, 820, o)
    const ptrs = await ouvrir(ctx, url, `${nom}-${qui}`)
    const p = ptrs.p, ptr = ptrs[qui]
    const b64 = await fabriquer(p)
    await importer(p, ptr, 'bouton', b64)
    const t1 = await toastTexte(p)
    const b = await boite(p, '.toast.visible button.action')
    await clic(p, ptr, b.x + b.width / 2, b.y + b.height / 2)
    await p.waitForTimeout(400)
    const t2 = await toastTexte(p)
    note(`${nom} ${qui} (maxTouchPoints ${await p.evaluate(() => navigator.maxTouchPoints)})`, { import: t1, fixer: t2 })
    if (qui === 'doigt') ok(!/clic/i.test(t2 ?? ''), `${nom} B5 doigt : le message de Fixer en fond ne dit pas « clic » au doigt`, t2)
    else ok(/bouton du stylet/.test(t2 ?? ''), `${nom} B5 Wacom : le message de Fixer en fond dit « bouton du stylet »`, t2)
    await p.screenshot({ path: `${D}/c7-${nom}-${qui}.png` })
    await ctx.close()
  }
}
await fin(nav, serveur)
