// Tablette Android (Chrome) : pincer sur une barre zoome-t-il la page entière ?
import { lancer, ouvrir, noter, bilan, outils } from './lib.mjs'
const nav = await lancer()
const { page, cdp } = await ouvrir(nav, { viewport: { width: 800, height: 1280 }, hasTouch: true, isMobile: true, deviceScaleFactor: 2,
  userAgent: 'Mozilla/5.0 (Linux; Android 14; SM-X710) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Safari/537.36' }, 'android')
const ev = (f, a) => page.evaluate(f, a)
const v0 = await ev(() => ({ s: visualViewport.scale, z: window.__app.cam.z }))
// Pincement au-dessus de la barre de gauche
const b = await ev(() => { const r = document.querySelector('.barre-outils').getBoundingClientRect(); return { x: r.left + r.width / 2, y: r.top + r.height / 2 } })
await cdp.send('Input.synthesizePinchGesture', { x: b.x, y: b.y, scaleFactor: 2, relativeSpeed: 400, gestureSourceType: 'touch' })
await page.waitForTimeout(500)
const v1 = await ev(() => ({ s: visualViewport.scale, z: window.__app.cam.z }))
// Et sur le tableau, pour comparer
await cdp.send('Input.synthesizePinchGesture', { x: 500, y: 700, scaleFactor: 2, relativeSpeed: 400, gestureSourceType: 'touch' })
await page.waitForTimeout(500)
const v2 = await ev(() => ({ s: visualViewport.scale, z: window.__app.cam.z }))
await page.screenshot({ path: 'android-pince.png' })
noter('Android : pincer sur la barre de gauche ne zoome pas la page', v1.s === 1, JSON.stringify({ v0, v1, v2 }))
bilan()
await nav.close()
