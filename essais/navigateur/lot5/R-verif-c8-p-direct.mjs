// SONDE DE VÉRIFICATION reprise dans la batterie (corrections des vérifications
// des retouches après le lot 5) : P et le bouton Stylo sur un écran tactile.
// Copie de retouches/verif/conformite/c8-p-direct.mjs ; elle lit les versions construites du dépôt (voir R-verif/lib.mjs).
// B1 : « P : reprendre le Stylo. » juste après l'import, sans toucher le
// tableau (bouton Image à la Wacom, Ctrl+V, fichier déposé), puis Échap Échap
import { demarrer, contexte, ouvrir, ecran, ok, note, fin, fabriquer, importer } from './R-verif/lib.mjs'
const { serveur, URLS, nav } = await demarrer()
for (const [nom, url] of Object.entries(URLS)) {
  for (const comment of ['bouton', 'coller', 'deposer']) {
    const ctx = await contexte(nav, url, 1366, 768)
    const { p, wacom } = await ouvrir(ctx, url, nom)
    const b64 = await fabriquer(p)
    await importer(p, wacom, comment, b64)
    const a = await ecran(p)
    const focus = await p.evaluate(() => document.activeElement?.tagName + '.' + document.activeElement?.className)
    await p.keyboard.press('p'); await p.waitForTimeout(250)
    const b = await ecran(p)
    ok(a.outil === 'selection' && b.outil === 'stylo', `${nom} ${comment} : Sélection après l'import, P tout de suite rend le Stylo (focus : ${focus})`, { avant: a.outil, apres: b.outil })
    // Échap deux fois depuis le Stylo d'avant
    await importer(p, wacom, comment, b64)
    await p.keyboard.press('Escape'); await p.waitForTimeout(150); await p.keyboard.press('Escape'); await p.waitForTimeout(250)
    const c = await ecran(p)
    ok(c.outil === 'stylo', `${nom} ${comment} : Échap deux fois rend aussi le Stylo`, c.outil)
    await ctx.close()
  }
}
await fin(nav, serveur)
