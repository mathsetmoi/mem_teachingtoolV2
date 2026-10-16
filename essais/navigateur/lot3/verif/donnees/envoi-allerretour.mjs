// Vérification « données et replay » du lot 3 : un objet envoyé de la page 1
// vers la page 2, puis renvoyé de la page 2 vers la page 1 ; Ctrl+Z (la touche)
// sur la page 1, puis sur la page 2. Et : page 1 → page 2 → page 3, Ctrl+Z sur
// la page 1. Serveur de développement sur :5173.
import { RACINE_ESSAIS, RACINE_DEPOT } from '../../../commun/racines.mjs'
import { chromium } from '../../../commun/playwright.mjs'

const nav = await chromium.launch()
const net = t => (t ?? '').replace(/[  ]/g, ' ')
const erreurs = []
async function ouvrir() {
  const ctx = await nav.newContext({ viewport: { width: 1366, height: 768 } })
  const page = await ctx.newPage()
  page.on('pageerror', e => erreurs.push(e.message))
  await page.goto('http://localhost:5173/')
  await page.waitForFunction(() => window.__app && window.__app.page && document.querySelector('.rang')?.textContent?.includes('/'))
  await page.waitForTimeout(600)
  await page.evaluate(() => {
    const a = window.__app, m = a.ui.message.bind(a.ui)
    window.__msgs = []
    a.ui.message = (t, x, d) => { window.__msgs.push(t); return m(t, x, d) }
  })
  return { ctx, page }
}
const ETAT = () => {
  const a = window.__app, t = a.tableau
  return {
    page: a.pages.indexOf(a.page) + 1,
    parPage: a.pages.map(p => [...(t.formesDe(p)?.values() ?? [])].map(f => `${f.id}@${f.x},${f.y}`)),
    msg: (window.__msgs || []).at(-1) ?? '',
  }
}
/** Ce qui est sur la page qu'on regarde, pris, envoyé (déplacé) vers la page n (1, 2…) */
const envoyer = (page, n) => page.evaluate(n => {
  const a = window.__app
  a.selection.clear(); for (const f of a.formes) a.selection.add(f.id)
  return a.envoyerSelection(a.pages[n - 1], true)
}, n)
const aller = (page, n) => page.evaluate(n => window.__app.allerPage(window.__app.pages[n - 1]), n)

// ---------- 1. aller-retour ----------
{
  const { ctx, page } = await ouvrir()
  await page.evaluate(() => {
    const a = window.__app, t = a.tableau
    t.nouveauGeste()
    t.poser(a.page, { id: 'x', type: 'trait', x: 300, y: 300, z: Date.now(), auteur: t.moi, pts: [0, 0, 0.5, 60, 30, 0.5, 140, 0, 0.5], couleur: '#1b2230', taille: 4.5, opacite: 1, pression: false })
    a.nouvellePage()
    a.allerPage(a.pages[0])
    a.choisirOutil('selection')
  })
  await page.waitForTimeout(500)
  console.log('départ           ', JSON.stringify(await page.evaluate(ETAT)))
  await envoyer(page, 2); await page.waitForTimeout(500)
  console.log('1 → 2            ', JSON.stringify(await page.evaluate(ETAT)))
  await aller(page, 2); await page.waitForTimeout(700)
  await envoyer(page, 1); await page.waitForTimeout(500)
  console.log('2 → 1            ', JSON.stringify(await page.evaluate(ETAT)))
  await aller(page, 1); await page.waitForTimeout(700)
  await page.mouse.click(900, 600)       // le focus sur le tableau (outil Sélection : un clic dans le vide)
  await page.keyboard.press('Control+z'); await page.waitForTimeout(600)
  const e1 = await page.evaluate(ETAT)
  console.log('Ctrl+Z page 1    ', JSON.stringify(e1))
  await page.screenshot({ path: `${RACINE_ESSAIS}/lot3/verif/donnees/allerretour-page1.png` })
  await aller(page, 2); await page.waitForTimeout(700)
  await page.keyboard.press('Control+z'); await page.waitForTimeout(600)
  const e2 = await page.evaluate(ETAT)
  console.log('Ctrl+Z page 2    ', JSON.stringify(e2))
  const total = e2.parPage.flat().length
  console.log(e1.parPage[0].length === 2 && new Set(e1.parPage[0].map(s => s.split('@')[1])).size === 1 ? 'DÉFAUT : deux objets superposés exactement sur la page 1 ; message : « ' + net(e1.msg) + ' »' : 'pas de superposition')
  console.log(total === 1 ? 'un seul objet au bout' : `DÉFAUT : ${total} objets au bout (au départ : 1)`)
  await ctx.close()
}

// ---------- 2. 1 → 2 → 3, Ctrl+Z sur la page 1 ----------
{
  const { ctx, page } = await ouvrir()
  await page.evaluate(() => {
    const a = window.__app, t = a.tableau
    t.nouveauGeste()
    t.poser(a.page, { id: 'x', type: 'trait', x: 300, y: 300, z: Date.now(), auteur: t.moi, pts: [0, 0, 0.5, 60, 30, 0.5, 140, 0, 0.5], couleur: '#1b2230', taille: 4.5, opacite: 1, pression: false })
    a.nouvellePage(); a.nouvellePage()
    a.allerPage(a.pages[0])
    a.choisirOutil('selection')
  })
  await page.waitForTimeout(500)
  await envoyer(page, 2); await page.waitForTimeout(500)
  await aller(page, 2); await page.waitForTimeout(700)
  await envoyer(page, 3); await page.waitForTimeout(500)
  await aller(page, 1); await page.waitForTimeout(700)
  await page.mouse.click(900, 600)
  await page.keyboard.press('Control+z'); await page.waitForTimeout(600)
  const e = await page.evaluate(ETAT)
  console.log('1→2→3, Ctrl+Z p1 ', JSON.stringify(e))
  const total = e.parPage.flat().length
  console.log(total === 1 ? 'un seul objet' : `DÉFAUT : ${total} objets (page 1 et page 3) ; message : « ${net(e.msg)} »`)
  await ctx.close()
}
await nav.close()
if (erreurs.length) { console.log('ÉCHEC erreurs JS :', erreurs); process.exitCode = 1 }  // contrôle final : un échec visible
