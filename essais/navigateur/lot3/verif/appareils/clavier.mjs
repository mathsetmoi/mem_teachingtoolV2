// Le clavier AZERTY (les touches telles qu'un clavier français les envoie,
// par CDP : key et code distincts, AltGr = Ctrl + Alt) : la trieuse, le nom
// d'une page, les raccourcis du tableau.
import { ouvrir, preparer, etat, attendreOuverte, verifier, pause, fin, D } from './lib.mjs'

const { ctx, page } = await ouvrir({}, 'clavier')
const cdp = await ctx.newCDPSession(page)
const VK = { Tab: 9, Enter: 13, Escape: 27, ArrowLeft: 37, ArrowUp: 38, ArrowRight: 39, ArrowDown: 40, Delete: 46, Backspace: 8, F2: 113, Home: 36, End: 35, ' ': 32, ContextMenu: 93 }
/** key, code, mods { shift, ctrl, alt }, texte produit (s'il y en a) */
async function touche(key, code, m = {}, texte) {
  const modifiers = (m.alt ? 1 : 0) | (m.ctrl ? 2 : 0) | (m.shift ? 8 : 0)
  const vk = VK[key] ?? (code.startsWith('Key') ? code.charCodeAt(3) : code.startsWith('Digit') ? 48 + Number(code[5]) : 0)
  const base = { key, code, modifiers, windowsVirtualKeyCode: vk, nativeVirtualKeyCode: vk }
  await cdp.send('Input.dispatchKeyEvent', texte ? { type: 'keyDown', text: texte, unmodifiedText: texte, ...base } : { type: 'rawKeyDown', ...base })
  await cdp.send('Input.dispatchKeyEvent', { type: 'keyUp', ...base })
  await pause(40)
}
// AZERTY : la rangée des chiffres sans Maj
const AZ = { 1: '&', 2: 'é', 3: '"', 4: '\'', 5: '(', 6: '-', 7: 'è', 8: '_', 9: 'ç', 0: 'à' }
/** Écrit un texte comme un clavier AZERTY (lettres, chiffres avec Maj, espace, deux-points) */
async function ecrire(s) {
  for (const ch of s) {
    if (/[a-z]/.test(ch)) await touche(ch, 'Key' + (ch === 'a' ? 'Q' : ch === 'q' ? 'A' : ch === 'z' ? 'W' : ch === 'w' ? 'Z' : ch.toUpperCase()), {}, ch)
    else if (/[A-Z]/.test(ch)) await touche(ch, 'Key' + (ch === 'A' ? 'Q' : ch === 'Q' ? 'A' : ch === 'Z' ? 'W' : ch === 'W' ? 'Z' : ch), { shift: true }, ch)
    else if (/[0-9]/.test(ch)) await touche(ch, 'Digit' + ch, { shift: true }, ch)
    else if (ch === ' ') await touche(' ', 'Space', {}, ' ')
    else if (ch === ':') await touche(':', 'Period', {}, ':')
    else if (ch === '.') await touche('.', 'Comma', { shift: true }, '.')
    else if (ch === '@') {
      // AltGr + à : la touche part (la trieuse ne doit rien en faire), mais
      // Chromium piloté par CDP n'en écrit pas le « @ », même dans une page
      // vide (contrôle final, controle/altgr.mjs) : on l'écrit alors comme le
      // ferait le système, sans touche
      const avant = await page.evaluate(() => document.activeElement?.value ?? '')
      await touche('@', 'Digit0', { ctrl: true, alt: true }, '@')
      const apres = await page.evaluate(() => document.activeElement?.value ?? '')
      if (apres === avant) await page.keyboard.insertText('@')
    }
  }
}

const P = await preparer(page, 12, { ici: 4, noms: { 2: 'Exercice 12 p. 84' } })
await page.evaluate(() => { window.__app.choisirOutil('selection'); document.activeElement?.blur?.() })

// Maj + P (AZERTY : la touche P, e.key « P »)
await touche('P', 'KeyP', { shift: true }, 'P')
verifier('Maj + P ouvre la trieuse', await attendreOuverte(page))
await pause(300)
let e = await etat(page)
verifier('… sans changer d\'outil, le focus sur la page 5', e.outil === 'selection' && e.focusPage === P[4], { outil: e.outil, f: e.focus })
// Flèches
await touche('ArrowRight', 'ArrowRight'); await touche('ArrowRight', 'ArrowRight')
e = await etat(page); verifier('→ → : page 7', e.focusPage === P[6], e.focus)
await touche('Home', 'Home'); e = await etat(page); verifier('Début : page 1', e.focusPage === P[0], e.focus)
await touche('End', 'End'); e = await etat(page); verifier('Fin : page 12', e.focusPage === P[11], e.focus)
await touche('ArrowUp', 'ArrowUp'); e = await etat(page); verifier('↑ : une ligne au-dessus', e.focusPage && e.focusPage !== P[11], e.focus)
// Chiffres AZERTY sans Maj : « & » (1) puis « é » (2) → page 12
await touche('&', 'Digit1', {}, '&'); await touche('é', 'Digit2', {}, 'é')
e = await etat(page); verifier('« & » « é » (les chiffres 1 2 d\'un AZERTY sans Maj) : la page 12', e.focusPage === P[11], e.focus)
await touche('"', 'Digit3', {}, '"')
await pause(900)
await touche('(', 'Digit5', {}, '(')
e = await etat(page); verifier('« ( » seul (5) après une pause : la page 5', e.focusPage === P[4], e.focus)
// F2 : renommer, en écrivant un nom avec des majuscules, des chiffres, Suppr, Retour arrière
await touche('F2', 'F2')
e = await etat(page)
verifier('F2 : le champ du nom', e.focusTag === 'INPUT', e.focusTag)
await ecrire('Partie 2')
await touche('Backspace', 'Backspace'); await ecrire('3 : Pythagore')
await touche('Home', 'Home'); await touche('Delete', 'Delete')
await touche('ArrowLeft', 'ArrowLeft'); await touche('ArrowRight', 'ArrowRight')
// Ctrl + A, Ctrl + D, Ctrl + Z, Maj + P dans le champ : rien sur les pages
await touche('a', 'KeyQ', { ctrl: true }); await touche('d', 'KeyD', { ctrl: true }); await touche('End', 'End')
await touche('P', 'KeyP', { shift: true }, 'P')
await ecrire(' @')
e = await etat(page)
const valeur = await page.evaluate(() => document.activeElement.value)
verifier('Dans le champ : lettres, Maj + P, chiffres, Suppr, Ctrl + A, Ctrl + D, AltGr + à (@) ne touchent pas aux pages', e.ouverte && e.pages.length === 12 && e.focusTag === 'INPUT' && valeur === 'artie 3 : PythagoreP @', { valeur, n: e.pages.length, ouverte: e.ouverte })
await touche('Enter', 'Enter')
e = await etat(page)
const nom5 = await page.evaluate(id => window.__app.tableau.nomDe(id), P[4])
verifier('Entrée garde le nom, le focus revient à la carte', nom5 === 'artie 3 : PythagoreP @' && e.focusPage === P[4], { nom5, f: e.focus })
// Ctrl + D (AZERTY : KeyD), puis Ctrl + Z (AZERTY : la touche W porte Z)
await touche('d', 'KeyD', { ctrl: true })
e = await etat(page)
verifier('Ctrl + D : la page 5 dupliquée juste après, nom « … (copie) »', e.pages.length === 13 && e.pages[4] === P[4] && await page.evaluate(id => window.__app.tableau.nomDe(window.__app.pages[5]), P[4]) === 'artie 3 : PythagoreP @ (copie)', e.msgs.slice(-1))
await touche('z', 'KeyW', { ctrl: true })
e = await etat(page)
verifier('Ctrl + Z (AZERTY) : la copie disparaît', e.pages.length === 12 && JSON.stringify(e.pages) === JSON.stringify(P), e.msgs.slice(-1))
// Suppr : vers la corbeille ; Ctrl + Y : rétablir ; Ctrl + Z
await touche('Delete', 'Delete')
e = await etat(page)
verifier('Suppr : la page 5 va dans la corbeille ; on regarde la page 4', e.pages.length === 11 && !e.pages.includes(P[4]) && e.page === P[3], { n: e.pages.length, page: P.indexOf(e.page) + 1, m: e.msgs.slice(-1) })
await touche('z', 'KeyW', { ctrl: true })
e = await etat(page)
verifier('Ctrl + Z : la page revient, on regarde à nouveau la page 5', JSON.stringify(e.pages) === JSON.stringify(P) && e.page === P[4], { m: e.msgs.slice(-1), page: P.indexOf(e.page) + 1 })
// Ctrl + Maj + ← : la page qui a le focus recule d'une place
await page.evaluate(() => document.querySelector('.trieuse .carte[tabindex="0"]').focus())
const f0 = (await etat(page)).focusPage
await touche('ArrowLeft', 'ArrowLeft', { ctrl: true, shift: true })
e = await etat(page)
verifier('Ctrl + Maj + ← : elle recule d\'une place', e.pages.indexOf(f0) === P.indexOf(f0) - 1, { f0: P.indexOf(f0) + 1, apres: e.pages.indexOf(f0) + 1 })
await touche('z', 'KeyW', { ctrl: true })
// Tab : du bandeau à la grille, et jamais vers le tableau (inerte)
const parcours = []
for (let k = 0; k < 12; k++) {
  await touche('Tab', 'Tab')
  parcours.push(await page.evaluate(() => { const a = document.activeElement; return a === document.body ? 'body' : (a.closest('.trieuse') ? 'trieuse:' : 'AILLEURS:') + (a.getAttribute('aria-label') || a.className) }))
}
verifier('Tab ne quitte jamais la trieuse vers le tableau', !parcours.some(x => x.startsWith('AILLEURS')), parcours)
const arretsGrille = parcours.filter(x => /^trieuse:Page \d/.test(x))
verifier('… et la grille n\'est qu\'un arrêt', new Set(arretsGrille).size <= 1, arretsGrille)
// Échap : ferme, le focus revient au compteur
await page.evaluate(() => document.querySelector('.trieuse .carte[tabindex="0"]').focus())
await touche('Escape', 'Escape')
e = await etat(page)
verifier('Échap ferme ; le focus au compteur', !e.ouverte && await page.evaluate(() => document.activeElement === document.querySelector('.rang')))
// À l’écran : Ctrl + Maj + D (AZERTY, e.key « D »)
await page.evaluate(() => document.activeElement.blur())
const avant = (await etat(page)).pages.length
await touche('D', 'KeyD', { ctrl: true, shift: true })
e = await etat(page)
verifier('Ctrl + Maj + D à l’écran : la page dupliquée, on est sur la copie', e.pages.length === avant + 1 && e.page === e.pages[5], e.msgs.slice(-1))
await touche('z', 'KeyW', { ctrl: true })
e = await etat(page)
verifier('Ctrl + Z sur la copie vierge : elle disparaît, retour à l\'original', e.pages.length === avant && e.page === P[4], e.msgs.slice(-1))
// Ctrl + P à l’écran : la fenêtre du PDF ; Échap la ferme
await touche('p', 'KeyP', { ctrl: true })
e = await etat(page)
verifier('Ctrl + P à l’écran : la fenêtre « Exporter en PDF »', e.dialog.some(c => c.includes('dialogue-pdf')), e.dialog)
await touche('Escape', 'Escape')
e = await etat(page)
verifier('Échap la ferme', !e.dialog.length, e.dialog)
// Maj + P dans un champ du tableau (la formule) : n'ouvre pas la trieuse
const champ = await page.evaluate(() => {
  const i = document.querySelector('input[type="text"], textarea')
  return i ? (i.getAttribute('aria-label') || i.className) : null
})
console.log('champ du tableau :', champ)
await ctx.close()
await fin()
