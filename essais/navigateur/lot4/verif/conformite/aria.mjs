// CONFORMITÉ, point 2 : la bibliothèque pour un lecteur d'écran (l'arbre
// d'accessibilité) et au clavier seul : ouvrir, créer un dossier de niveau,
// y ranger un classeur, filtrer, trier, revenir.
import * as O from './outils.mjs'
const { ok, norm } = O
const ICI = new URL('.', import.meta.url).pathname
await O.lancer()
const g = new O.FauxGoogle()
const ctx = await O.contexte(g)
const p = await O.ouvrir(ctx, '', 'A', false)
// Trois classeurs de plus
await p.evaluate(async () => {
  const dem = await import('/src/classeurs/demarrage.ts'), bases = await import('/src/classeurs/bases.ts'), neuf = await import('/src/classeurs/neuf.ts')
  const etat = await neuf.etatNeuf('carreaux'), T = Date.now()
  for (const [i, nom] of ['Symétrie centrale', 'Fractions', 'Pythagore'].entries()) {
    const id = dem.idClasseur()
    const fiche = { id, base: dem.baseDe(id), nom, dossier: null, etiquettes: [], cree: T - i * 3600e3, modifie: T - i * 600e3, ouvert: T - i * 60e3, pages: 1 + i }
    await window.__registre.creerClasseur(fiche, b => bases.creerBase(b, etat, { id, nom }))
  }
})
// Au clavier : le bouton du classeur, Entrée
await p.focus('.bouton-classeur')
await p.keyboard.press('Enter')
await p.waitForFunction(() => window.__bibliotheque?.ouvert, null, { timeout: 10000 })
await p.waitForTimeout(500)
const arbre = await p.locator('.bibliotheque').ariaSnapshot()
console.log(arbre)
const dlg = await p.evaluate(() => { const b = document.querySelector('.bibliotheque'); return { role: b.getAttribute('role'), modal: b.getAttribute('aria-modal'), label: b.getAttribute('aria-label'), focus: document.activeElement?.className + ' ' + (document.activeElement?.getAttribute('aria-label') || document.activeElement?.textContent?.slice(0, 40)) } })
console.log(JSON.stringify(dlg))
ok(dlg.role === 'dialog' && dlg.modal === 'true' && dlg.label === 'Bibliothèque des classeurs', 'la bibliothèque : dialog modal nommé', dlg)
// Le parcours au Tab : chaque arrêt
const arrets = []
for (let i = 0; i < 18; i++) {
  await p.keyboard.press('Tab'); await p.waitForTimeout(40)
  arrets.push(await p.evaluate(() => { const a = document.activeElement; return (a?.getAttribute('aria-label') || a?.textContent || a?.tagName || '').replace(/[  ]/g, ' ').trim().slice(0, 60) + ' [' + (a?.tagName || '') + (a?.getAttribute('role') ? ' role=' + a.getAttribute('role') : '') + ']' }))
}
console.log('Tab :\n  ' + arrets.join('\n  '))
await p.screenshot({ path: ICI + 'captures/aria-biblio.png' })
console.log('erreurs :', JSON.stringify(O.erreurs))
await O.navigateur.close()
