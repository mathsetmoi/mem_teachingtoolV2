// Le bandeau « Reprendre l'enregistrement sur la clé » après un
// rechargement, par écran : sa place (rien de recouvert), le clic à la
// souris, à la plume (Wacom), au doigt, au clavier ; la ligne de la
// bibliothèque. node bandeau.mjs [largeur hauteur tactile] [base]
import { lancer, contexte, pret, erreurs, info, ok, dort, toasts, CAPTURES, suivre, DEV } from './outils.mjs'
const W = +(process.argv[2] ?? 1366), H = +(process.argv[3] ?? 768), TACTILE = process.argv[4] === 'tactile'
const BASE = process.argv[5] ?? DEV
const T = `${W}×${H}${TACTILE ? ' tactile' : ''}${BASE === DEV ? '' : ' ' + BASE.slice(0, 30)}`
const INIT = () => {
  let depart = null
  try { depart = sessionStorage.getItem('__permissionDepart') } catch { /* rien */ }
  window.__permission = depart || 'granted'
  window.__appels = []; window.__ecritures = 0
  const H = window.FileSystemHandle?.prototype
  if (!H) return
  H.queryPermission = async function () { window.__appels.push({ quoi: 'query', actif: navigator.userActivation.isActive }); return window.__permission }
  H.requestPermission = async function () {
    const actif = navigator.userActivation.isActive
    const r = actif ? 'granted' : window.__permission
    window.__appels.push({ quoi: 'request', actif, rendu: r })
    if (r === 'granted') window.__permission = 'granted'
    return r
  }
  const F = FileSystemFileHandle.prototype, cw = F.createWritable
  F.createWritable = async function (...a) { const w = await cw.apply(this, a); return { write: d => w.write(d), close: async () => { await w.close(); window.__ecritures++ }, abort: r => w.abort(r) } }
  window.showSaveFilePicker = async o => (await navigator.storage.getDirectory()).getFileHandle(o?.suggestedName || 'x.memc', { create: true })
}
const nav = await lancer({ persistant: true })
const ctx = await contexte(nav, { viewport: { width: W, height: H }, ...(TACTILE ? { hasTouch: true, isMobile: W < 900, deviceScaleFactor: 2 } : {}) })
await ctx.addInitScript(INIT)
const p = await ctx.newPage(); suivre(p, 'bandeau')
await p.goto(BASE); await p.waitForFunction(() => document.querySelector('.rang')?.textContent?.includes('/'), null, { timeout: 30000 }); await dort(800)
const dev = BASE === DEV
// Activer la clé par le menu ⋯
const ouvrirMenuFichier = () => p.evaluate(() => document.querySelector('.barre-haut .bouton.points').click())
await ouvrirMenuFichier(); await dort(250)
await p.click('.menu-flottant:not([hidden]) [data-action="activer-cle"]')
await p.waitForFunction(() => window.__ecritures > 0, null, { timeout: 15000 })
await dort(500)
// Écrire (à la souris) puis recharger avec « prompt »
await p.mouse.move(500, 400); await p.mouse.down(); for (let i = 0; i < 10; i++) await p.mouse.move(500 + i * 10, 400 + i * 4); await p.mouse.up()
await dort(400)
await p.evaluate(() => sessionStorage.setItem('__permissionDepart', 'prompt'))
await p.reload(); await p.waitForFunction(() => document.querySelector('.rang')?.textContent?.includes('/'), null, { timeout: 30000 })
await p.waitForFunction(() => !document.querySelector('.bandeau-sauvegarde').hidden, null, { timeout: 15000 }).catch(() => null)
await dort(500)
const GEO = () => {
  const b = document.querySelector('.bandeau-sauvegarde')
  if (b.hidden) return { bandeau: null }
  const rb = b.getBoundingClientRect()
  const autres = []
  for (const el of document.querySelectorAll('.barre button, .barre select, .barre input, .bouton-classeur, .rang')) {
    if (b.contains(el) || !el.getClientRects().length) continue
    const s = getComputedStyle(el); if (s.visibility === 'hidden') continue
    const r = el.getBoundingClientRect()
    const x = Math.min(r.right, rb.right) - Math.max(r.left, rb.left), y = Math.min(r.bottom, rb.bottom) - Math.max(r.top, rb.top)
    if (x > 1 && y > 1) autres.push(`${el.className || el.tagName}:${(el.getAttribute('aria-label') || el.title || el.textContent || '').trim().slice(0, 25)} (${Math.round(x)}×${Math.round(y)})`)
  }
  // Ce qui est au-dessus du bouton du bandeau, à son centre
  const bb = b.querySelector('.bouton-bandeau'); const rbb = bb.getBoundingClientRect()
  const dessus = document.elementFromPoint(rbb.x + rbb.width / 2, rbb.y + rbb.height / 2)
  return { bandeau: { r: [Math.round(rb.left), Math.round(rb.top), Math.round(rb.right), Math.round(rb.bottom)], texte: b.textContent.replace(/[  ]/g, ' '), raison: b.dataset.raison },
    recouvre: autres, boutonLibre: bb.contains(dessus), dessus: dessus?.className, dansEcran: rb.left >= 0 && rb.right <= innerWidth && rb.bottom <= innerHeight, forme: window.__app?.ui?.formeClasseur ?? null }
}
const g = await p.evaluate(GEO)
info(`${T} le bandeau`, g)
ok(g.bandeau && g.bandeau.raison === 'cle-permission', `${T} après le rechargement : le bandeau de la clé`, g.bandeau)
ok(g.bandeau && g.recouvre.length === 0 && g.boutonLibre && g.dansEcran, `${T} le bandeau ne recouvre aucun bouton, et son bouton est cliquable`, g)
await p.screenshot({ path: CAPTURES + `bandeau-${W}x${H}${TACTILE ? '-t' : ''}${dev ? '' : '-file'}.png` })
// Le bouton : au doigt (tactile) ou à la plume (CDP pen)
const cdp = await ctx.newCDPSession(p)
const bb = await p.evaluate(() => { const r = document.querySelector('.bandeau-sauvegarde .bouton-bandeau').getBoundingClientRect(); return { x: r.x + r.width / 2, y: r.y + r.height / 2 } })
const n0 = await p.evaluate(() => window.__ecritures)
if (TACTILE) await p.touchscreen.tap(bb.x, bb.y)
else {
  const st = (type, o = {}) => cdp.send('Input.dispatchMouseEvent', { type, x: bb.x, y: bb.y, pointerType: 'pen', button: type === 'mouseMoved' ? 'none' : 'left', buttons: type === 'mousePressed' ? 1 : 0, clickCount: 1, ...o })
  await st('mouseMoved'); await st('mousePressed'); await dort(50); await st('mouseReleased')
}
const fini = await p.waitForFunction(n => window.__ecritures > n, n0, { timeout: 15000 }).then(() => true).catch(() => false)
await dort(300)
const app = await p.evaluate(() => window.__appels.filter(a => a.quoi === 'request'))
ok(fini && app.length === 1 && app[0].actif && (await p.evaluate(() => document.querySelector('.bandeau-sauvegarde').hidden)), `${T} ${TACTILE ? 'le doigt' : 'la plume'} sur [Reprendre l'enregistrement] : l'accord dans le geste, l'écriture, le bandeau s'en va`, { fini, app, t: await toasts(p) })
info(`${T} le bouton du classeur`, await p.evaluate(() => { const b = document.querySelector('.bouton-classeur'); return { etat: b.querySelector('.etat-classeur')?.textContent, point: !b.querySelector('.point-etat').hidden, ptFichier: !document.querySelector('.barre-haut .bouton.points .point-etat')?.hidden } }))
console.log('erreurs JS', erreurs)
await nav.close()
