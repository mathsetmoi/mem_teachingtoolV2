// La version d'un seul fichier (file://), le cas principal : le poste remis
// à zéro, la clé du professeur. À la souris : le bouton, la bibliothèque,
// Nouveau classeur (la case de la clé cochée d'office ; renoncer au choix
// du fichier), aller d'un classeur à l'autre, Ctrl + clic, le menu ⋯ (le
// Drive), aucune requête vers Google.
import { lancer, dort, info, ok, erreurs, suivre, ECOUTER_TOASTS, toasts, CAPTURES } from './outils.mjs'
import { RACINE_DEPOT } from '../../../commun/racines.mjs'
// (le dist/ du dépôt, `npm run build` d'abord)
const URL0 = 'file://' + RACINE_DEPOT + '/dist/index.html'
const nav = await lancer()
const ctx = await nav.newContext({ viewport: { width: 1366, height: 768 } })
await ctx.addInitScript(ECOUTER_TOASTS)
await ctx.addInitScript(() => { window.__choix = []; window.showSaveFilePicker = async o => { window.__choix.push(o?.suggestedName); throw new DOMException('renoncé', 'AbortError') } })
const versGoogle = []
// La connexion Google, le Drive, le relais (comme sauvegardes/t4-file.mjs) ; pas la police
// d'écriture (fonts.googleapis.com), chargée ainsi depuis le premier jour, en ligne comme en
// file:// (contrôle final du lot 4 : /google/ la comptait, et l'essai échouait toujours)
ctx.on('request', r => { if (/accounts\.google\.com|www\.googleapis\.com|script\.google\.com/.test(r.url())) versGoogle.push(r.url()) })
const p = await ctx.newPage(); suivre(p, 'file')
const pret = () => p.waitForFunction(() => document.querySelector('.rang')?.textContent?.includes('/') || !document.querySelector('.bibliotheque')?.hidden, null, { timeout: 30000 })
await p.goto(URL0); await pret(); await dort(800)
const bouton = () => p.evaluate(() => { const b = document.querySelector('.bouton-classeur'); return { nom: b.querySelector('.nom-classeur')?.textContent, etat: b.querySelector('.etat-classeur')?.textContent, point: !b.querySelector('.point-etat').hidden, url: location.search, titre: document.title } })
info('au départ', await bouton())
// Le menu ⋯ : les lignes de l'état, « Autres sauvegardes… » (lot 18 : la copie sur le Drive est dedans, grisée en file://)
await p.click('.barre-haut .bouton.points'); await dort(250)
const m = await p.evaluate(() => { const m = [...document.querySelectorAll('.menu-flottant')].find(x => !x.hidden); return { lignes: [...m.querySelectorAll('[data-ligne]')].map(l => l.dataset.ligne + ': ' + l.textContent.replace(/[  ]/g, ' ').trim()), drive: (e => e && { dis: e.getAttribute('aria-disabled'), t: e.textContent.replace(/[  ]/g, ' ').trim() })(m.querySelector('[data-action="autres-sauvegardes"]')) } })
info('menu ⋯ en file://', m)
await p.keyboard.press('Escape'); await dort(150)
// La bibliothèque, Nouveau classeur
await p.click('.bouton-classeur'); await p.click('.menu-seances [data-action="bibliotheque"]'); await p.waitForSelector('.bibliotheque:not([hidden])'); await dort(300)
const lignes = await p.evaluate(() => document.querySelector('.biblio-ouvert')?.textContent.replace(/[  ]/g, ' '))
info('la ligne du classeur ouvert', lignes)
await p.click('[data-action="nouveau-classeur"]'); await p.waitForSelector('dialog.dialogue-nouveau[open]')
const caseCle = await p.evaluate(() => { const c = document.querySelector('dialog.dialogue-nouveau input[name=cle]'); return c && { coche: c.checked, texte: c.closest('label').textContent.replace(/[  ]/g, ' ') } })
ok(caseCle?.coche, 'file:// : « Nouveau classeur » a la case « Enregistrer automatiquement dans un fichier » cochée d\'office', caseCle)
await p.keyboard.press('Control+a'); await p.keyboard.type('Fractions')
await Promise.all([p.waitForNavigation({ timeout: 20000 }).catch(() => null), p.click('dialog.dialogue-nouveau [data-a="creer"]')])
await pret(); await dort(800)
info('après Créer (choix du fichier abandonné)', { b: await bouton(), choix: await p.evaluate(() => window.__choix), t: await toasts(p) })
// Écrire un peu à la souris, revenir à la bibliothèque, ouvrir l'autre classeur
await p.mouse.move(500, 300); await p.mouse.down(); for (let i = 0; i < 10; i++) await p.mouse.move(500 + i * 10, 300 + i * 5); await p.mouse.up(); await dort(400)
await p.click('.bouton-classeur'); await p.click('.menu-seances [data-action="bibliotheque"]'); await p.waitForSelector('.bibliotheque:not([hidden])'); await dort(300)
const cartes = await p.evaluate(() => [...document.querySelectorAll('.grille-classeurs.tous > li')].map(l => ({ cle: l.dataset.cle, nom: l.querySelector('.carte-nom-classeur')?.textContent, href: l.querySelector('a')?.getAttribute('href') })))
info('cartes', cartes)
const autre = cartes.find(c => c.nom === 'Premier classeur')
// Ctrl + clic : un autre onglet sur le premier
const nOng = ctx.pages().length
await p.click(`.grille-classeurs.tous li[data-cle="${autre.cle}"] .carte-apercu`, { modifiers: ['Control'] }); await dort(2500)
const ong = ctx.pages().slice(nOng)
info('Ctrl + clic en file://', { onglets: ong.length, url: ong[0] && ong[0].url(), nom: ong[0] && await ong[0].evaluate(() => document.querySelector('.nom-classeur')?.textContent).catch(e => e.message) })
for (const x of ong) await x.close()
// Clic simple : on y va
await Promise.all([p.waitForNavigation({ timeout: 20000 }).catch(() => null), p.click(`.grille-classeurs.tous li[data-cle="${autre.cle}"] .carte-apercu`)])
await pret(); await dort(800)
info('clic simple : arrivé', await bouton())
// Recharger : le même classeur
await p.reload(); await pret(); await dort(800)
info('rechargé', await bouton())
// Sans paramètre : le dernier ouvert
await p.goto(URL0); await pret(); await dort(800)
info('sans paramètre', await bouton())
await p.screenshot({ path: CAPTURES + 'file-tableau.png' })
ok(versGoogle.length === 0, 'file:// : aucune requête vers Google', versGoogle.slice(0, 5))
console.log('erreurs JS', erreurs)
await nav.close()
