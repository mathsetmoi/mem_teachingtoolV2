// SONDE DE VÉRIFICATION reprise dans la batterie (corrections des vérifications
// des retouches après le lot 5) : les réglages par défaut, version construite.
// Copie de retouches/verif/conformite/c1-defauts-build.mjs ; elle lit les versions construites du dépôt (voir R-verif/lib.mjs).
// Conformité A1, A2 (et un peu de A3) sur la VERSION CONSTRUITE (en ligne en
// http, clé USB en file://), sans window.__app : ce que voit le professeur.
import { demarrer, contexte, ouvrir, ecran, ok, note, fin, D, clic, clicSur, trait, session } from './R-verif/lib.mjs'

const { serveur, URLS, nav } = await demarrer()

const choisirFond = async (p, fond) => {
  await p.click('button.choix-fond'); await p.waitForTimeout(250)
  await p.locator(`.fond-choix[data-fond="${fond}"]`).filter({ visible: true }).first().click(); await p.waitForTimeout(300)
}
const rang = async p => (await ecran(p)).rang

for (const [nom, url] of Object.entries(URLS)) {
  const ctx = await contexte(nav, url, 1366, 768)
  const { p, souris } = await ouvrir(ctx, url, nom)
  let e = await ecran(p)
  // A1
  const tailles = await p.evaluate(() => [...document.querySelectorAll('.barre-outils .tailles .taille')].map(b => [b.title, b.classList.contains('actif')]))
  ok(tailles[0]?.[1] === true && /fin/i.test(tailles[0]?.[0] ?? ''), `${nom} A1 : au démarrage, l'épaisseur active est la première (« Fin »)`, tailles)
  // A2 : la première page d'un navigateur neuf
  ok(e.fond === 'Page blanche' && e.zoom === '100 %', `${nom} A2 : première page d'un navigateur neuf blanche, à 100 %`, e)
  // La page 1 en Seyès, + : blanche
  await choisirFond(p, 'seyes')
  e = await ecran(p); ok(e.fond === 'Seyès', `${nom} : page 1 passée en Seyès`, e.fond)
  await p.click('button.nouvelle-page'); await p.waitForTimeout(700)
  e = await ecran(p); ok(e.fond === 'Page blanche' && e.rang.startsWith('2 / 2') && e.zoom === '100 %', `${nom} A2 : + depuis une page Seyès : page 2 blanche, 100 %`, e)
  // page 2 en papier pointé, › sur la dernière : blanche
  await choisirFond(p, 'pointe')
  await p.waitForTimeout(700)
  const suiv = p.locator('button[title^="Page suivante"]').first()
  note('titre de ›', await suiv.getAttribute('title'))
  await suiv.click(); await p.waitForTimeout(800)
  e = await ecran(p); ok(e.fond === 'Page blanche' && e.rang.startsWith('3 / 3'), `${nom} A2 : › sur la dernière page (Papier pointé) : page 3 blanche`, e)
  // Ctrl+Maj+D sur la page 2 (pointé) : la copie garde son fond
  await p.keyboard.press('PageUp'); await p.waitForTimeout(700)
  e = await ecran(p); note('sur la page 2', e)
  await p.mouse.move(700, 400)
  await p.keyboard.press('Control+Shift+D'); await p.waitForTimeout(900)
  e = await ecran(p); ok(e.fond === 'Papier pointé' && e.rang.startsWith('3 / 4'), `${nom} A2 : la copie de la page 2 (pointé) garde son fond`, e)
  await p.screenshot({ path: `${D}/c1-${nom}-copie.png` })
  await fin2(p)
  await ctx.close()
}
async function fin2() {}
await fin(nav, serveur)
