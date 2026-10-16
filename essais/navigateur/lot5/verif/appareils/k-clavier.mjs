// Vérification par appareil, lot 5 : AU CLAVIER (AZERTY, souris), à 1366 × 768 :
// les raccourcis d'ordre et de groupe, Maj + L, jamais dans un champ de
// saisie ; puis sur Mac (⌘).
import * as L from './lib/outils.mjs'
const { ok, note, attendre, poser, image, trait, triangle, formule, prendre, sel, forme, pile, msgs, vider } = L

/** Une touche envoyée comme un clavier AZERTY la donne : e.key la lettre, e.code la touche physique */
const AZERTY = { a: 'KeyQ', q: 'KeyA', z: 'KeyW', w: 'KeyZ', m: 'Semicolon', g: 'KeyG', l: 'KeyL' }
async function touche(p, cdp, key, o = {}) {
  const mods = (o.alt ? 1 : 0) | (o.ctrl ? 2 : 0) | (o.meta ? 4 : 0) | (o.maj ? 8 : 0)
  const lettre = key.length === 1
  const k = lettre && o.maj ? key.toUpperCase() : key
  const code = lettre ? (AZERTY[key.toLowerCase()] ?? 'Key' + key.toUpperCase()) : key
  const vk = lettre ? key.toUpperCase().charCodeAt(0) : ({ ArrowUp: 38, ArrowDown: 40, ArrowLeft: 37, ArrowRight: 39 })[key]
  const texte = lettre && !o.ctrl && !o.meta && !o.alt ? k : undefined
  await cdp.send('Input.dispatchKeyEvent', { type: texte ? 'keyDown' : 'rawKeyDown', key: k, code, windowsVirtualKeyCode: vk, modifiers: mods, text: texte, unmodifiedText: texte })
  await cdp.send('Input.dispatchKeyEvent', { type: 'keyUp', key: k, code, windowsVirtualKeyCode: vk, modifiers: mods })
  await attendre(120)
}
const ecoute = p => p.evaluate(() => { window.__touches = []; if (!window.__ecoute) { window.__ecoute = true; window.addEventListener('keydown', e => window.__touches.push({ k: e.key, c: e.code, prevented: e.defaultPrevented }), false) } })
const touches = p => p.evaluate(() => window.__touches)

for (const mac of [false, true]) {
  console.log(mac ? '=== Mac (⌘) ===' : '=== Windows / Linux (Ctrl), AZERTY ===')
  const ctx = await L.contexte()
  if (mac) await ctx.addInitScript(() => { Object.defineProperty(Navigator.prototype, 'platform', { get: () => 'MacIntel' }) })
  const { p, cdp } = await L.ouvrir(ctx, mac ? 'mac' : 'azerty')
  const C = mac ? { meta: true } : { ctrl: true }
  ok(await p.evaluate(() => navigator.platform) === (mac ? 'MacIntel' : 'Linux x86_64') || !mac, 'plateforme', await p.evaluate(() => navigator.platform))
  await p.evaluate(L.PAGE_NEUVE)
  await ecoute(p)
  const A = await poser(p, trait(300, 300, 100)), B = await poser(p, trait(300, 340, 100))
  await prendre(p, [A, B])
  await p.mouse.move(700, 600)
  // G1. Ctrl + G (⌘ + G) : groupés, la touche empêchée
  await touche(p, cdp, 'g', C)
  let fa = await forme(p, A), fb = await forme(p, B)
  let t = await touches(p)
  ok(fa.groupe && fa.groupe === fb.groupe && t.at(-1)?.prevented, `G1) ${mac ? '⌘' : 'Ctrl'} + G groupe, touche empêchée`, { g: [fa.groupe, fb.groupe], t: t.at(-1) })
  // G2. Ctrl + Maj + G : dégroupés
  await touche(p, cdp, 'g', { ...C, maj: true })
  fa = await forme(p, A); fb = await forme(p, B); t = await touches(p)
  ok(!fa.groupe && !fb.groupe && t.at(-1)?.prevented && t.at(-1)?.k === 'G', `G2) ${mac ? '⌘' : 'Ctrl'} + Maj + G dégroupe`, { g: [fa.groupe, fb.groupe], t: t.at(-1) })
  // G3. Ctrl + G sans rien de pris : empêché, un message
  await vider(p)
  await touche(p, cdp, 'g', C)
  t = await touches(p)
  ok(t.at(-1)?.prevented && (await msgs(p)).at(-1) === 'Sélectionnez au moins deux objets pour les grouper.', 'G3) Ctrl + G sans sélection : empêché, le message', { t: t.at(-1), m: (await msgs(p)).at(-1) })
  // O1. L'ordre : deux images qui se chevauchent
  const I1 = await poser(p, image(600, 200, 200, 150)), I2 = await poser(p, image(650, 250, 200, 150))
  await prendre(p, [I1])
  const z0 = (await forme(p, I1)).z, z2 = (await forme(p, I2)).z
  await touche(p, cdp, 'ArrowUp', C)
  let z1 = (await forme(p, I1)).z
  t = await touches(p)
  ok(z1 > z2 && t.at(-1)?.prevented, 'O1) Ctrl + ↑ avance l\'image devant sa voisine', { z0, z1, z2 })
  await touche(p, cdp, 'ArrowDown', { ...C, maj: true })
  z1 = (await forme(p, I1)).z
  ok(z1 < (await forme(p, I2)).z, 'O2) Ctrl + Maj + ↓ : à l\'arrière-plan', { z1 })
  await touche(p, cdp, 'ArrowUp', { ...C, maj: true })
  ok((await forme(p, I1)).z > (await forme(p, I2)).z, 'O3) Ctrl + Maj + ↑ : au premier plan')
  // Alt + ↑ ne fait rien à l'ordre
  const zAlt = (await forme(p, I1)).z, xAlt = (await forme(p, I1)).x
  await touche(p, cdp, 'ArrowUp', { alt: true })
  ok((await forme(p, I1)).z === zAlt && (await forme(p, I1)).y === 200, 'O4) Alt + ↑ : ni ordre ni poussée', { z: (await forme(p, I1)).z, y: (await forme(p, I1)).y })
  // ← / → avec Ctrl ou Alt : empêchés, rien ne bouge
  await touche(p, cdp, 'ArrowLeft', { alt: true })
  await touche(p, cdp, 'ArrowLeft', C)
  t = await touches(p)
  ok(t.slice(-2).every(x => x.prevented) && (await forme(p, I1)).x === xAlt, 'O5) Alt + ← et Ctrl + ← : empêchés, l\'image ne bouge pas', t.slice(-2))
  // M1. Maj + L : verrouille ; Maj + L dans le menu court ouvert : déverrouille
  await prendre(p, [I1])
  await touche(p, cdp, 'l', { maj: true })
  ok((await forme(p, I1)).verrou === true && (await sel(p)).length === 0, 'M1) Maj + L verrouille l\'image', { v: (await forme(p, I1)).verrou })
  // le menu court par le clic droit, puis Maj + L
  const s = await L.ecran(p, 620, 220)
  await p.mouse.click(s.x, s.y, { button: 'right' }); await attendre(250)
  await touche(p, cdp, 'l', { maj: true })
  ok(!(await forme(p, I1)).verrou, 'M2) Maj + L, son menu court ouvert : déverrouillée', { v: (await forme(p, I1)).verrou })
  await p.keyboard.press('Escape'); await attendre(100); await vider(p)
  // M3. Maj + L sans rien de pris : le Segment
  await touche(p, cdp, 'l', { maj: true })
  ok(await p.evaluate(() => window.__app.outil) === 'segment', 'M3) Maj + L sans sélection : le Segment', await p.evaluate(() => window.__app.outil))
  await p.evaluate(() => window.__app.choisirOutil('selection'))
  // F1. Dans un champ de saisie : le nom d'un sommet (menu complet d'un triangle pris)
  const T = await poser(p, triangle(300, 650))
  await prendre(p, [T, A])
  await p.evaluate(id => { const a = window.__app; a.selection.clear(); a.selection.add(id); a.ouvrirOptions(a.forme(id)) }, T); await attendre(300)
  // ouvrir la section Sommets et viser son champ
  const champ = await p.evaluate(() => {
    return !!document.querySelector('input[aria-label="Noms des sommets"]')
  })
  await attendre(250)
  const ok1 = await p.evaluate(() => { const i = document.querySelector('input[aria-label="Noms des sommets"]'); if (!i) return false; i.focus(); i.select(); return true })
  note('champ des noms', { champ, ok1 })
  if (ok1) {
    const zT = (await forme(p, T)).z
    await p.evaluate(() => { window.__touches = [] })
    await touche(p, cdp, 'l', { maj: true })
    await touche(p, cdp, 'g', C)
    await touche(p, cdp, 'ArrowUp', C)
    await touche(p, cdp, 'g', { ...C, maj: true })
    const val = await p.evaluate(() => document.activeElement?.value)
    t = await touches(p)
    ok(!(await forme(p, T)).verrou && (await forme(p, T)).z === zT && !(await forme(p, T)).groupe && /L/.test(val ?? ''), 'F1) dans le champ des noms : Maj + L écrit « L », Ctrl + G, Ctrl + ↑, Ctrl + Maj + G ne font rien à la page', { val, t, verrou: (await forme(p, T)).verrou })
    ok(!t.some(x => x.prevented && /^[gG]$/.test(x.k)), 'F1b) dans le champ, Ctrl + G n\'est pas empêché par MEM (la recherche du navigateur reste)', t)
  } else ok(false, 'F1) champ des noms introuvable')
  await p.keyboard.press('Escape'); await attendre(150); await p.keyboard.press('Escape'); await attendre(150)
  // F2. Dans l'éditeur d'une formule : Maj + L écrit L, Ctrl + G ne groupe rien
  await vider(p)
  const Fo = await poser(p, formule(900, 500))
  await prendre(p, [Fo, A, B])
  await p.evaluate(id => { window.__app.modifierFormule(window.__app.forme(id)) }, Fo); await attendre(500)
  const ed = await p.evaluate(() => { const e = document.querySelector('dialog[open] textarea, dialog[open] input, dialog[open] [contenteditable]'); e?.focus(); return e?.tagName })
  note('éditeur', ed)
  await p.evaluate(() => { window.__touches = [] })
  await touche(p, cdp, 'l', { maj: true })
  await touche(p, cdp, 'g', C)
  const groupes = [(await forme(p, A)).groupe, (await forme(p, B)).groupe, (await forme(p, Fo)).groupe]
  ok(groupes.every(g => !g) && !(await forme(p, Fo)).verrou, 'F2) dans l\'éditeur de formule : Ctrl + G ne groupe rien, Maj + L ne verrouille rien', { groupes, ed })
  await p.keyboard.press('Escape'); await attendre(200)
  // F3. Ctrl + G en plein glisser d'un objet : rien
  await prendre(p, [A, B])
  const sa = await L.ecran(p, 350, 300)
  await p.mouse.move(sa.x, sa.y); await p.mouse.down(); await p.mouse.move(sa.x + 20, sa.y + 10); await p.mouse.move(sa.x + 40, sa.y + 20)
  await touche(p, cdp, 'g', C)
  await p.mouse.up(); await attendre(200)
  ok(!(await forme(p, A)).groupe, 'F3) Ctrl + G en plein glisser : rien', { g: (await forme(p, A)).groupe })
  await ctx.close()
}
await L.fin()
