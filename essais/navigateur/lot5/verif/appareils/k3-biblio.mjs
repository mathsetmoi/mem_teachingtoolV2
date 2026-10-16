import * as L from './lib/outils.mjs'
const { ok, attendre } = L
const ctx = await L.contexte()
const { p, cdp } = await L.ouvrir(ctx, 'biblio')
await p.evaluate(() => { window.__t = []; window.addEventListener('keydown', e => { setTimeout(() => window.__t.push({ k: e.key, alt: e.altKey, p: e.defaultPrevented }), 0) }, true) })
await p.evaluate(() => { const b = [...document.querySelectorAll('button')].find(b => b.offsetWidth && /Bibliothèque|classeur/i.test(b.title) && b.closest('.barre-classeur')); b?.click() })
await attendre(1200)
const ouverte = await p.evaluate(() => !!document.querySelector('.bibliotheque:not([hidden]), [aria-label*="ibliothèque"]'))
await cdp.send('Input.dispatchKeyEvent', { type: 'rawKeyDown', key: 'ArrowLeft', code: 'ArrowLeft', windowsVirtualKeyCode: 37, modifiers: 1 })
await cdp.send('Input.dispatchKeyEvent', { type: 'keyUp', key: 'ArrowLeft', code: 'ArrowLeft', windowsVirtualKeyCode: 37, modifiers: 1 })
await attendre(200)
const t = await p.evaluate(() => window.__t)
ok(t.at(-1)?.p === true, 'B1) dans la bibliothèque : Alt + ← empêché', { ouverte, t })
await L.fin()
