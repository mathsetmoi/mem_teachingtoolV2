// Le clavier AZERTY (Windows) : Tab jusqu'au bouton du classeur, Entrée,
// flèches, F2, Suppr, Retour arrière, Échap, Ctrl + S / Ctrl + O dans la
// bibliothèque et dans le classeur, et jamais dans un champ de saisie.
// Les touches AZERTY passent par CDP (key ≠ code : Ctrl + Z est KeyW…).
import { lancer, contexte, ouvrir, pret, erreurs, info, ok, dort, toasts, creerPlusieurs, creerDossier, ecrireTraits } from './outils.mjs'
const nav = await lancer()
const ctx = await contexte(nav)
await ctx.addInitScript(() => {
  // Ce qui a été « empêché » (preventDefault) pour chaque touche
  window.__empeche = []
  const pd = Event.prototype.preventDefault
  Event.prototype.preventDefault = function () { if (this.type === 'keydown') window.__empeche.push((this.ctrlKey ? 'Ctrl+' : '') + this.key); return pd.call(this) }
  // Le choix d'un fichier : noté, puis « renoncer »
  window.__choix = []
  window.showSaveFilePicker = async o => { window.__choix.push('save:' + (o?.suggestedName ?? '')); throw new DOMException('renoncé', 'AbortError') }
  window.showOpenFilePicker = async () => { window.__choix.push('open'); throw new DOMException('renoncé', 'AbortError') }
})
const p = await ouvrir(ctx, '', 'clavier')
const cdp = await ctx.newCDPSession(p)
// Une touche AZERTY : key (le caractère), code (la place sur un clavier QWERTY), modificateurs (2 = Ctrl, 8 = Maj)
const VK = { KeyA: 65, KeyQ: 81, KeyW: 87, KeyZ: 90, KeyS: 83, KeyO: 79, KeyY: 89, KeyD: 68, KeyC: 67, KeyV: 86, KeyP: 80 }
async function azerty(key, code, mod = 0) {
  const base = { modifiers: mod, key, code, windowsVirtualKeyCode: VK[code] ?? 0, nativeVirtualKeyCode: VK[code] ?? 0 }
  await cdp.send('Input.dispatchKeyEvent', { type: 'rawKeyDown', ...base })
  if (!mod || mod === 8) await cdp.send('Input.dispatchKeyEvent', { type: 'char', ...base, text: key, unmodifiedText: key })
  await cdp.send('Input.dispatchKeyEvent', { type: 'keyUp', ...base })
  await dort(120)
}
const actif = () => p.evaluate(() => { const a = document.activeElement; return { tag: a?.tagName, cls: a?.className, label: a?.getAttribute?.('aria-label') ?? a?.textContent?.trim().slice(0, 40), cle: a?.closest?.('li[data-cle]')?.dataset.cle } })
const etat = () => p.evaluate(() => ({ biblio: !document.querySelector('.bibliotheque').hidden, url: location.search, formes: window.__app?.formes.length, saisie: !!document.querySelector('.carte-saisie'), dialog: document.querySelector('dialog[open]')?.className ?? null, choix: window.__choix.splice(0), empeche: window.__empeche.splice(0) }))

await ecrireTraits(p, 4)
const d5b = await creerDossier(p, '5e B', { etiquette: '5e B' })
const [c1, c2, c3] = await creerPlusieurs(p, 3, { noms: ['Aires', 'Bissectrices', 'Cercles'], dossier: d5b })
await p.evaluate(() => window.__registre.ecrireReglage('conseil', 'vu'))
await dort(300)
// 1. Tab depuis la page : combien de Tab jusqu'au bouton du classeur ?
await p.evaluate(() => document.activeElement?.blur())
let n = 0, trouve = false, parcours = []
for (; n < 40; n++) { await p.keyboard.press('Tab'); const a = await actif(); parcours.push(a.label?.slice(0, 25)); if (a.cls === 'bouton-classeur') { trouve = true; break } }
ok(trouve, `1) Tab mène au bouton du classeur (${n + 1} Tab)`, parcours.slice(0, 6))
// (Entrée ouvre le menu du classeur, 30 octobre 2026 : Fin puis Entrée y choisissent la bibliothèque)
await p.keyboard.press('Enter'); await p.keyboard.press('End'); await p.keyboard.press('Enter'); await dort(500)
let e = await etat(); let a = await actif()
ok(e.biblio && a.tag === 'A', '   … Entrée, puis « Bibliothèque des classeurs » : la bibliothèque, le focus sur une carte', { e, a })
// 2. Les flèches, Entrée sur un dossier, Retour arrière
await p.keyboard.press('Tab'); a = await actif()
info('Tab après Récents', a)
// Aller sur la carte du dossier dans la grille
await p.evaluate(id => document.querySelector(`.grille-classeurs.tous li[data-cle="d:${id}"] .carte-dossier, .grille-classeurs.tous li[data-cle="d:${id}"] button`)?.focus(), d5b)
a = await actif(); info('focus sur le dossier', a)
await p.keyboard.press('Enter'); await dort(400)
a = await actif(); e = await etat()
info('Entrée sur le dossier', { a, fil: await p.evaluate(() => [...document.querySelectorAll('.biblio-fil li')].map(l => l.textContent)) })
// 3. F2 : renommer ; Suppr, Retour arrière, Début, Fin DANS le champ : le texte seulement
await p.evaluate(id => document.querySelector(`.grille-classeurs.tous li[data-cle="${id}"] a`)?.focus(), c2)
await p.keyboard.press('F2'); await dort(250)
e = await etat()
ok(e.saisie, '3) F2 : le champ de renommage', e)
await p.keyboard.press('End'); await p.keyboard.press('Backspace'); await p.keyboard.press('Home'); await p.keyboard.press('Delete'); await dort(200)
const v = await p.evaluate(() => document.querySelector('.carte-saisie')?.value)
e = await etat()
ok(v === 'issectrice' && e.saisie && (await p.evaluate(id => window.__registre.classeur(id), c2))?.corbeille === undefined, '   … Retour arrière et Suppr dans le champ n\'agissent que sur le texte (ni corbeille, ni remonter)', { v, e })
// Ctrl + S dans le champ : ?
await azerty('s', 'KeyS', 2); e = await etat()
info('Ctrl + S dans le champ de renommage (AZERTY)', e)
await p.keyboard.press('Escape'); await dort(200)
info('après Échap (le nom)', { nom: (await p.evaluate(id => window.__registre.classeur(id), c2)).nom, a: await actif(), e: await etat() })
// Ctrl + Z AZERTY (code KeyW) dans la bibliothèque : le tableau caché ne change pas
const f0 = (await etat()).formes
await p.evaluate(id => document.querySelector(`.grille-classeurs.tous li[data-cle="${id}"] a`)?.focus(), c1)
await azerty('z', 'KeyW', 2); await azerty('q', 'KeyA', 2); await azerty('a', 'KeyQ', 2)
e = await etat()
ok(e.formes === f0 && e.biblio, '4) Ctrl + Z, Ctrl + A (AZERTY) dans la bibliothèque : le tableau caché ne change pas', { f0, e })
// Des lettres seules dans la bibliothèque (les raccourcis d'outils du tableau ?)
const outil0 = await p.evaluate(() => window.__app.outil)
for (const [k, c] of [['g', 'KeyG'], ['p', 'KeyP'], ['e', 'KeyE'], ['t', 'KeyT'], ['l', 'KeyL'], ['m', 'KeyM'], ['r', 'KeyR'], ['s', 'KeyS'], ['h', 'KeyH']]) await azerty(k, c)
info('lettres dans la bibliothèque : outil', { avant: outil0, apres: await p.evaluate(() => window.__app.outil), e: await etat() })
// Suppr sur une carte : corbeille + Annuler (le toast, au clavier ?)
await p.evaluate(id => document.querySelector(`.grille-classeurs.tous li[data-cle="${id}"] a`)?.focus(), c3)
await toasts(p)
await p.keyboard.press('Delete'); await dort(400)
const t = await toasts(p); a = await actif()
ok((await p.evaluate(id => window.__registre.classeur(id), c3))?.corbeille, '5) Suppr : dans la corbeille', { t, a })
// Annuler par le clavier : où est le focus, le toast est-il atteignable ?
let atteint = false
for (let i = 0; i < 25; i++) { await p.keyboard.press('Tab'); const x = await p.evaluate(() => !!document.activeElement?.closest('.toast')); if (x) { atteint = true; break } }
info('   … le bouton « Annuler » du message est-il atteignable au Tab ?', { atteint, a: await actif() })
// 6. Retour arrière : remonter ; Échap : fermer, le focus au bouton du classeur
await p.evaluate(id => document.querySelector(`.grille-classeurs.tous li[data-cle="${id}"] a`)?.focus(), c1)
await p.keyboard.press('Backspace'); await dort(300)
info('Retour arrière', await p.evaluate(() => [...document.querySelectorAll('.biblio-fil li')].map(l => l.textContent)))
// Ctrl + O dans la bibliothèque
await azerty('o', 'KeyO', 2); e = await etat()
ok(e.choix.includes('open'), '7) Ctrl + O dans la bibliothèque : le choix de fichier', e)
await dort(300)
// Ctrl + S dans la bibliothèque
await azerty('s', 'KeyS', 2); await dort(600); e = await etat()
info('Ctrl + S dans la bibliothèque', e)
await p.keyboard.press('Escape'); await dort(300)
e = await etat(); a = await actif()
ok(!e.biblio && a.cls === 'bouton-classeur', '8) Échap ferme la bibliothèque ; le focus revient au bouton du classeur', { e, a })
// 9. Dans le classeur : Ctrl + S, Ctrl + O
await azerty('s', 'KeyS', 2); await dort(600); e = await etat()
ok(e.choix.some(c => c.startsWith('save:')), '9) Ctrl + S dans le classeur : le choix du fichier', e)
await azerty('o', 'KeyO', 2); await dort(600); e = await etat()
ok(e.choix.includes('open'), '   … Ctrl + O dans le classeur : le choix de fichier', e)
// 10. Nouveau dossier au clavier : Retour arrière dans le champ
await p.keyboard.press('Enter'); await dort(500)
await p.evaluate(() => document.querySelector('[data-action="nouveau-dossier"]').focus())
await p.keyboard.press('Enter'); await dort(300)
await p.keyboard.type('5e C'); await p.keyboard.press('Backspace'); await p.keyboard.type('D')
await azerty('z', 'KeyW', 2)
e = await etat()
info('10) Nouveau dossier : Retour arrière, Ctrl + Z dans le champ', { v: await p.evaluate(() => document.querySelector('dialog[open] input[type=text]')?.value), e })
await p.keyboard.press('Enter'); await dort(400)
info('   … Entrée', { t: await toasts(p), a: await actif() })
// 11. Ctrl + S quand une fenêtre de la bibliothèque est ouverte (Nouveau classeur)
await p.evaluate(() => document.querySelector('[data-action="nouveau-classeur"]').focus())
await p.keyboard.press('Enter'); await dort(300)
await azerty('s', 'KeyS', 2); await azerty('o', 'KeyO', 2); e = await etat()
info('11) Ctrl + S, Ctrl + O dans la fenêtre « Nouveau classeur »', e)
await p.keyboard.press('Escape'); await dort(300)
console.log('erreurs JS', erreurs)
await nav.close()
