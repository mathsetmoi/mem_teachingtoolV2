// CONFORMITÉ : les textes visibles (« classeur » partout où c'est l'unité,
// jamais « undefined », « NaN » ni « [object Object] », aucune promesse fausse), le
// bouton du classeur, le menu ⋯, la bibliothèque et ses fenêtres.
import * as O from './outils.mjs'
const { ok, norm } = O
const ICI = new URL('.', import.meta.url).pathname

await O.lancer()
const g = new O.FauxGoogle()
const ctx = await O.contexte(g)
const p = await O.ouvrir(ctx, '', 'T', false)
const tout = []
const noter = (ou, t) => { for (const l of [].concat(t)) if (l) tout.push({ ou, t: norm(l) }) }

// ---- 1. Le classeur ouvert : titre, bouton, menu ⋯ ----
const haut = await p.evaluate(() => {
  const b = document.querySelector('.bouton-classeur')
  return { titre: document.title, bouton: b?.innerText, aria: b?.getAttribute('aria-label'), titreB: b?.title,
    decrit: document.getElementById(b?.getAttribute('aria-describedby') || '')?.textContent, points: document.querySelector('.barre-haut .bouton.points')?.title }
})
console.log('haut :', JSON.stringify(haut))
noter('haut', Object.values(haut))
await p.click('.barre-haut .bouton.points'); await p.waitForTimeout(200)
const menu = await p.evaluate(() => { const m = [...document.querySelectorAll('.menu-flottant')].find(x => !x.hidden); return m.innerText })
console.log('menu ⋯ :\n' + menu)
noter('menu', menu.split('\n'))
await O.fermerMenu(p)

// ---- 2. La corbeille des pages (trieuse) : « Supprimer définitivement » ----
await p.evaluate(() => {
  const a = window.__app, t = a.tableau
  for (let k = 0; k < 2; k++) {
    if (k) a.nouvellePage()
    t.nouveauGeste()
    const pts = []; for (let i = 0; i < 30; i++) pts.push(i * 12, Math.sin(i / 3 + k) * 50, 0.5)
    t.poser(a.page, { id: 'w' + k, type: 'trait', x: 200, y: 260, z: Date.now(), auteur: t.moi, pts, couleur: '#1b2230', taille: 4, opacite: 1, pression: false })
  }
})
await p.waitForTimeout(700)
await p.click('.barre-haut button[aria-label="Supprimer cette page"]'); await p.waitForTimeout(300)
await p.keyboard.press('Shift+P'); await p.waitForTimeout(400)
await p.click('.trieuse-bouton-corbeille'); await p.waitForTimeout(300)
await p.click('.trieuse-corbeille .carte-corbeille .corbeille-supprimer'); await p.waitForTimeout(250)
const qCorbeille = await p.evaluate(() => { const d = document.querySelector('dialog[open]'); return d && { titre: d.querySelector('h2')?.textContent, texte: d.querySelector('p')?.textContent } })
console.log('corbeille des pages :', JSON.stringify(qCorbeille))
noter('corbeille-pages', [qCorbeille?.titre, qCorbeille?.texte])
await p.screenshot({ path: ICI + 'captures/corbeille-pages.png' })
await p.keyboard.press('Escape'); await p.waitForTimeout(150)
await p.click('.corbeille-vider'); await p.waitForTimeout(200)
const qVider = await p.evaluate(() => { const d = document.querySelector('dialog[open]'); return d && d.querySelector('p')?.textContent })
noter('corbeille-pages-vider', qVider)
await p.keyboard.press('Escape'); await p.waitForTimeout(150)
for (let i = 0; i < 3; i++) { await p.keyboard.press('Escape'); await p.waitForTimeout(150) }

// ---- 3. La bibliothèque et ses fenêtres ----
await p.evaluate(() => window.__app.ui.ouvrirBibliotheque())
await p.waitForFunction(() => window.__bibliotheque?.ouvert, null, { timeout: 10000 })
await p.waitForTimeout(400)
const biblio = await p.evaluate(() => {
  const b = document.querySelector('.bibliotheque')
  const arias = [...b.querySelectorAll('[aria-label],[title]')].map(e => (e.getAttribute('aria-label') || '') + ' | ' + (e.title || ''))
  return { texte: b.innerText, arias }
})
console.log('bibliothèque :\n' + biblio.texte)
noter('biblio', biblio.texte.split('\n')); noter('biblio-aria', biblio.arias)
await p.screenshot({ path: ICI + 'captures/biblio.png' })
// Le menu ⋯ du bandeau
await p.click('.bibliotheque [data-action="menu-bibliotheque"]'); await p.waitForTimeout(200)
const mb = await p.evaluate(() => [...document.querySelectorAll('.menu-flottant')].find(x => !x.hidden)?.innerText)
console.log('menu du bandeau :\n' + mb)
noter('menu-bandeau', (mb || '').split('\n'))
await p.keyboard.press('Escape'); await p.waitForTimeout(150)
// Le menu d'une carte
await p.click('.grille-classeurs .case-classeur .options-classeur'); await p.waitForTimeout(200)
const mc = await p.evaluate(() => [...document.querySelectorAll('.menu-flottant')].find(x => !x.hidden)?.innerText)
console.log('menu d\'une carte :\n' + mc)
noter('menu-carte', (mc || '').split('\n'))
await p.keyboard.press('Escape'); await p.waitForTimeout(150)
// Nouveau classeur, Nouveau dossier
for (const [quoi, sel] of [['nouveau-classeur', /^Nouveau classeur$/], ['nouveau-dossier', /^(Nouveau )?[Dd]ossier$/]]) {
  await p.locator('.bibliotheque .bandeau-biblio button, .bibliotheque header button').filter({ hasText: sel }).first().click().catch(e => console.log('pas de bouton', quoi, e.message.slice(0, 80)))
  await p.waitForTimeout(300)
  const d = await p.evaluate(() => document.querySelector('dialog[open]')?.innerText)
  console.log(quoi + ' :\n' + d)
  noter(quoi, (d || '').split('\n'))
  await p.keyboard.press('Escape'); await p.waitForTimeout(200)
}
// Le conseil
const conseil = await p.evaluate(() => document.querySelector('.bibliotheque .conseil, .bibliotheque [class*=conseil]')?.innerText)
console.log('conseil :', conseil)

// ---- 4. Les mots interdits ----
const interdits = tout.filter(x => /\bundefined\b|\bNaN\b|\[object Object\]/.test(x.t))
ok(!interdits.length, 'aucun « undefined », « NaN » ni « [object Object] »', interdits)
const tableau = tout.filter(x => /\btableau\b/i.test(x.t) && !/Mon tableau/.test(x.t))
ok(!tableau.length, 'aucun « tableau » pour dire le classeur (hors du nom « Mon tableau »)', tableau)
console.log('erreurs :', JSON.stringify(O.erreurs))
await O.navigateur.close()
