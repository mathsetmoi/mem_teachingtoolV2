// Vérification, lot 5 (D3) : Alt + ← / → et ⌘ + ← / → (retour du
// navigateur) et Ctrl + G (recherche du navigateur) dans la revue en classe,
// la trieuse et la bibliothèque : empêchés ?
import * as L from './lib/outils.mjs'
const { ok, note, attendre, poser, trait } = L

async function touche(cdp, key, mods) {
  const vk = { ArrowLeft: 37, ArrowRight: 39, g: 71 }[key]
  const code = key === 'g' ? 'KeyG' : key
  await cdp.send('Input.dispatchKeyEvent', { type: 'rawKeyDown', key, code, windowsVirtualKeyCode: vk, modifiers: mods })
  await cdp.send('Input.dispatchKeyEvent', { type: 'keyUp', key, code, windowsVirtualKeyCode: vk, modifiers: mods })
  await attendre(150)
}
const ALT = 1, CTRL = 2, META = 4
for (const mac of [false, true]) {
  const ctx = await L.contexte()
  if (mac) await ctx.addInitScript(() => { Object.defineProperty(Navigator.prototype, 'platform', { get: () => 'MacIntel' }) })
  // une page d'avant dans l'historique : ce que « retour » rouvrirait
  const p0 = await ctx.newPage()
  await p0.goto('about:blank')
  await p0.close()
  const { p, cdp } = await L.ouvrir(ctx, mac ? 'mac' : 'pc')
  await p.evaluate(L.PAGE_NEUVE)
  for (let i = 0; i < 4; i++) await poser(p, trait(200 + i * 40, 300, 30))
  // l'écouteur en bulle sur window, après tout le monde : defaultPrevented vu à la fin
  await p.evaluate(() => { window.__t = []; document.addEventListener('keydown', () => {}, false); window.addEventListener('keydown', e => window.__t.push({ k: e.key, alt: e.altKey, meta: e.metaKey, ctrl: e.ctrlKey, p: e.defaultPrevented }), false) })
  // Il faut voir l'événement même quand la revue l'arrête en capture : on écoute en capture AVANT elle, puis on relit defaultPrevented après la tâche
  await p.evaluate(() => { window.addEventListener('keydown', e => { setTimeout(() => window.__t.push({ k: e.key, alt: e.altKey, meta: e.metaKey, ctrl: e.ctrlKey, p: e.defaultPrevented, apres: true }), 0) }, true) })
  const essais = mac ? [['ArrowLeft', META, '⌘ + ←'], ['ArrowRight', META, '⌘ + →'], ['g', META, '⌘ + G']] : [['ArrowLeft', ALT, 'Alt + ←'], ['ArrowRight', ALT, 'Alt + →'], ['g', CTRL, 'Ctrl + G']]
  // 0. À l’écran (référence)
  for (const [k, m, nom] of essais) {
    await p.evaluate(() => { window.__t = [] })
    await touche(cdp, k, m)
    const t = (await p.evaluate(() => window.__t)).filter(x => x.apres)
    ok(t.at(-1)?.p === true, `${mac ? 'Mac' : 'PC'} — à l’écran : ${nom} empêché`, t)
  }
  // 1. La revue en classe
  await p.evaluate(() => { const b = [...document.querySelectorAll('button')].find(b => b.offsetWidth && /^Revoir la construction/.test(b.title)); b.click() })
  await attendre(1200)
  ok(await p.evaluate(() => window.__app.enLecture), `${mac ? 'Mac' : 'PC'} — la revue est ouverte`)
  for (const [k, m, nom] of essais) {
    await p.evaluate(() => { window.__t = [] })
    await touche(cdp, k, m)
    const t = (await p.evaluate(() => window.__t)).filter(x => x.apres)
    ok(t.at(-1)?.p === true, `${mac ? 'Mac' : 'PC'} — dans la revue en classe : ${nom} empêché (sinon le navigateur ${/G/.test(nom) ? 'ouvre sa recherche' : 'quitte la page'})`, t)
  }
  await p.keyboard.press('Escape'); await attendre(600)
  // 2. La trieuse
  await p.keyboard.press('Shift+P'); await attendre(900)
  for (const [k, m, nom] of essais) {
    await p.evaluate(() => { window.__t = [] })
    await touche(cdp, k, m)
    const t = (await p.evaluate(() => window.__t)).filter(x => x.apres)
    ok(t.at(-1)?.p === true, `${mac ? 'Mac' : 'PC'} — dans la trieuse : ${nom} empêché`, t)
  }
  await p.keyboard.press('Escape'); await attendre(600)
  await ctx.close()
}
await L.fin()
