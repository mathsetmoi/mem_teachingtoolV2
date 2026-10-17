// CONFORMITÉ, points 4, 5 et 6 dans la version d'un seul fichier (file://,
// la version hors ligne sur le poste remis à zéro), construite depuis le dépôt actuel
// dans ./dist : l'enregistrement automatique sur la clé possible (Chromium),
// la copie sur le Drive dite impossible, clairement ; le rappel.
import * as O from './outils.mjs'
const { ok, norm, MIN } = O
const ICI = new URL('.', import.meta.url).pathname
await O.lancer()
const g = new O.FauxGoogle()
const ctx = await O.contexte(g)
const p = await ctx.newPage(); O.suivre(p, 'F')
await p.clock.install()
await p.goto('file://' + ICI + 'dist/index.html')
await p.waitForFunction(() => document.querySelector('.rang')?.textContent?.includes('/') && document.querySelector('.bouton-classeur'), null, { timeout: 30000 })
await p.waitForTimeout(800)
const api = await p.evaluate(() => ({ save: typeof window.showSaveFilePicker, open: typeof window.showOpenFilePicker, locks: !!navigator.locks, worker: typeof Worker, url: location.href, titre: document.title }))
console.log(JSON.stringify(api))
ok(api.save === 'function' && api.open === 'function' && api.locks, 'file:// : showSaveFilePicker, showOpenFilePicker et les Web Locks existent (Chromium)', api)
// Le menu ⋯
await p.click('.barre-haut .bouton.points'); await p.waitForTimeout(200)
const m = await p.evaluate(() => {
  const m = [...document.querySelectorAll('.menu-flottant')].find(x => !x.hidden), n = t => (t || '').replace(/[  ]/g, ' ')
  const e = {}
  for (const x of m.querySelectorAll('.menu-item[data-action]')) e[x.dataset.action] = { texte: n(x.querySelector('.libelle')?.firstChild?.textContent), aide: n(x.querySelector('small')?.textContent), inactif: x.getAttribute('aria-disabled') === 'true' }
  return { e, lignes: [...m.querySelectorAll('.bloc-lignes li')].map(l => l.dataset.ligne + ': ' + n(l.querySelector('.texte-ligne')?.textContent)) }
})
console.log(JSON.stringify(m, null, 1))
ok(m.e['activer-cle'] && !m.e['activer-cle'].inactif, 'file:// : « Enregistrer automatiquement dans un fichier… » est proposé', m.e['activer-cle'])
ok(m.e['copie-drive']?.inactif, 'file:// : « Copie sur le Drive… » est grisé', m.e['copie-drive'])
ok(m.lignes.some(l => /^drive: .*version en ligne/.test(l)), 'file:// : la ligne du Drive dit « seulement depuis la version en ligne »', m.lignes)
await O.fermerMenu(p)
// La bibliothèque : Nouveau classeur (la case cochée d'office), le menu du bandeau
await p.evaluate(() => window.__app?.ui?.ouvrirBibliotheque?.() ?? document.querySelector('.bouton-classeur').click())
await p.waitForFunction(() => !document.querySelector('.bibliotheque')?.hidden, null, { timeout: 10000 })
await p.waitForTimeout(300)
const ligneBiblio = await p.evaluate(() => (document.querySelector('.bibliotheque')?.innerText || '').split('\n').find(l => l.startsWith('«')))
console.log('ligne du classeur ouvert :', ligneBiblio)
await p.click('.bibliotheque [data-action="nouveau-classeur"]'); await p.waitForTimeout(300)
const nouveau = await p.evaluate(() => { const d = document.querySelector('dialog[open]'); const c = [...d.querySelectorAll('input[type=checkbox]')].map(i => ({ label: (i.closest('label')?.textContent || '').trim(), coche: i.checked })); return { texte: d.innerText, cases: c } })
console.log('Nouveau classeur :', JSON.stringify(nouveau))
ok(nouveau.cases.some(c => /clé/.test(c.label) && c.coche), 'file:// : « Nouveau classeur » a la case de la clé, cochée d\'office', nouveau.cases)
await p.keyboard.press('Escape'); await p.waitForTimeout(200)
await p.click('.bibliotheque [data-action="menu-bibliotheque"]'); await p.waitForTimeout(200)
const mb = await p.evaluate(() => { const m = [...document.querySelectorAll('.menu-flottant')].find(x => !x.hidden); return [...m.querySelectorAll('.menu-item')].map(x => ({ a: x.dataset.action, t: (x.innerText || '').replace(/\n/g, ' / '), inactif: x.getAttribute('aria-disabled') === 'true' })) })
console.log('menu du bandeau :', JSON.stringify(mb))
ok(mb.some(x => /Récupérer/.test(x.t) && x.inactif), 'file:// : « Récupérer une sauvegarde du Drive… » grisé', mb)
await p.keyboard.press('Escape'); await p.waitForTimeout(150)
await p.keyboard.press('Escape'); await p.waitForTimeout(250)
// Le rappel : 21 min de travail, puis 2 min sans geste
await O.ecrire(p, 300, 250)
await p.clock.fastForward(10 * MIN); await O.ecrire(p, 300, 320)
await p.clock.fastForward(11 * MIN); await O.ecrire(p, 300, 390)
await p.clock.fastForward(2 * MIN + 20_000); await p.waitForTimeout(800)
const band = await p.evaluate(() => { const b = document.querySelector('.bandeau-sauvegarde'); return b && !b.hidden ? { raison: b.dataset.raison, texte: b.querySelector('.texte-bandeau')?.textContent, boutons: [...b.querySelectorAll('button')].map(x => x.textContent || x.title) } : null })
console.log('bandeau :', JSON.stringify(band))
ok(band?.raison === 'rappel', 'file:// : le rappel d\'enregistrer paraît après 21 min de travail et 2 min sans geste', band)
const court = await p.evaluate(() => document.querySelector('.etat-classeur')?.textContent)
console.log('bouton :', court)
await p.screenshot({ path: ICI + 'captures/fichier-seul.png' })
ok(g.requetes.length === 0 && g.gis.length === 0, 'file:// : aucune requête vers Google', { r: g.requetes.length, gis: g.gis.length })
console.log('erreurs :', JSON.stringify(O.erreurs))
await O.navigateur.close()
