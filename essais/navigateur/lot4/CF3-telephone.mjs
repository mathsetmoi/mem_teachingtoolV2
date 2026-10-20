// ESSAI DU CONTRÔLE FINAL DU LOT 4, n° 3 : sur un téléphone en portrait, la
// barre du haut passe sur trois rangées (iPhone 12 : y = 12 à 162), alors que
// la barre des outils, posée en bas, montait jusqu'à y = 128 : le bouton
// Stylo était à moitié couvert, un toucher en son centre n'atteignait pas le
// Stylo (antérieur au lot 4, vu en C3, jamais corrigé). La barre des outils
// s'arrête maintenant 12 px sous le bas mesuré de la barre du haut.
// Pour chaque appareil (téléphones en portrait et en paysage, iPad, PC, TNI) :
// la barre des outils ne passe pas sous la barre du haut ; chacun de ses
// boutons, amené à l'écran dans la barre (elle défile s'il le faut), est
// libre en son centre (elementFromPoint) ; le Stylo se choisit d'un toucher
// en son centre. Aussi après un changement de taille (la barre du haut sur
// une rangée de plus ou de moins).
// Sans la correction : iPhone 12 et Pixel 5 échouent.
// Adapté au lot 5 (K10, la mise en page du téléphone, voulue) : au
// téléphone, la barre du haut est sur UNE rangée à toutes les largeurs, et
// la barre des outils est en bas (portrait) ou à gauche (paysage) ; la
// fenêtre qui rétrécit de 600 à 360 px ne fait donc plus descendre la barre
// du haut. Le changement de rangée se vérifie là où il a encore lieu, hors
// de la mise en page du téléphone (960 → 660 → 960 px de large, au doigt) ;
// et de 600 à 360 px, on vérifie que la barre du haut reste sur une rangée,
// la barre des outils en bas, sans rien couvrir.
// Lancer : node CF3-telephone.mjs [adresse du serveur de développement]
import { chromium, devices } from '../commun/playwright.mjs'
const DEV = process.argv[2] || 'http://localhost:5173/'
let echecs = 0
const ok = (c, m, d) => { if (!c) echecs++; console.log(c ? '✓' : '✗ ÉCHEC', m, !c && d !== undefined ? '— ' + JSON.stringify(d).slice(0, 1500) : '') }
const erreurs = []
const MESURER = () => {
  const r = e => { const b = e.getBoundingClientRect(); return { l: Math.round(b.left), t: Math.round(b.top), r: Math.round(b.right), b: Math.round(b.bottom) } }
  const haut = document.querySelector('.barre-haut'), outils = document.querySelector('.barre-outils')
  const h = r(haut), o = r(outils)
  const croise = o.l < h.r && o.r > h.l && o.t < h.b && o.b > h.t
  const boutons = []
  for (const b of outils.querySelectorAll(':scope > button, :scope > .bouton')) {
    if (!b.getClientRects().length) continue
    b.scrollIntoView({ block: 'nearest' })
    const x = b.getBoundingClientRect(), cx = x.left + x.width / 2, cy = x.top + x.height / 2
    const sous = document.elementFromPoint(cx, cy)
    const libre = !!sous && (b === sous || b.contains(sous))
    if (!libre) boutons.push({ titre: b.title || b.getAttribute('aria-label'), centre: [Math.round(cx), Math.round(cy)], sous: sous ? (sous.closest('button')?.title || sous.closest('.barre')?.className || sous.className) : null })
  }
  outils.scrollTop = 0
  return { haut: h, outils: o, croise, couverts: boutons, defile: outils.scrollHeight > outils.clientHeight + 1 }
}
const nav = await chromium.launch()
const APPAREILS = [
  ['iPhone 12 (390 × 844)', devices['iPhone 12']],
  ['Pixel 5 (393 × 851)', devices['Pixel 5']],
  ['iPhone SE (375 × 667)', devices['iPhone SE']],
  ['Galaxy S8 (360 × 740)', devices['Galaxy S8']],
  ['iPhone 12 en paysage (844 × 390)', devices['iPhone 12 landscape']],
  ['iPad Mini (768 × 1024)', devices['iPad Mini']],
  ['PC (1366 × 768)', { viewport: { width: 1366, height: 768 } }],
  ['PC (1024 × 768)', { viewport: { width: 1024, height: 768 } }],
  ['TNI (1920 × 1080)', { viewport: { width: 1920, height: 1080 } }],
]
for (const [nom, o] of APPAREILS) {
  const c = await nav.newContext(o)
  const p = await c.newPage(); p.on('pageerror', e => erreurs.push(nom + ': ' + e.message))
  await p.goto(DEV); await p.waitForFunction(() => window.__app && document.querySelector('.rang')?.textContent?.includes('/')); await p.waitForTimeout(1200)
  const m = await p.evaluate(MESURER)
  ok(!m.croise && !m.couverts.length, `${nom} : la barre des outils (${m.outils.t}–${m.outils.b}) ne passe pas sous la barre du haut (${m.haut.t}–${m.haut.b}) ; aucun de ses boutons n'est couvert${m.defile ? ' (elle défile)' : ''}`, m)
  // Le Stylo d'un toucher (ou d'un clic) en son centre, après avoir choisi la Gomme
  await p.evaluate(() => window.__app.choisirOutil('gomme'))
  const s = await p.evaluate(() => { const b = [...document.querySelectorAll('.barre-outils button')].find(x => /^Stylo/.test(x.title)); b.scrollIntoView({ block: 'nearest' }); const r = b.getBoundingClientRect(); return { x: r.left + r.width / 2, y: r.top + r.height / 2 } })
  if (o.hasTouch) await p.touchscreen.tap(s.x, s.y); else await p.mouse.click(s.x, s.y)
  await p.waitForTimeout(300)
  ok(await p.evaluate(() => window.__app.outil) === 'stylo', `   … le Stylo se choisit d'un ${o.hasTouch ? 'toucher' : 'clic'} en son centre (${Math.round(s.x)}, ${Math.round(s.y)})`)
  await c.close()
}
// La fenêtre change : la barre du haut gagne ou perd une rangée, la barre
// des outils ne passe jamais sous elle (hors de la mise en page du téléphone)
// (Adapté aux outils de classe : avec le bouton « Classe », la barre du haut
// a déjà deux rangées à 900 px ; l'essai part de 960 px, où elle n'en a qu'une)
{
  const c = await nav.newContext({ viewport: { width: 960, height: 800 }, hasTouch: true, isMobile: true })
  const p = await c.newPage(); p.on('pageerror', e => erreurs.push('redim: ' + e.message))
  await p.goto(DEV); await p.waitForFunction(() => window.__app && document.querySelector('.rang')?.textContent?.includes('/')); await p.waitForTimeout(1000)
  const a = await p.evaluate(MESURER)
  await p.setViewportSize({ width: 660, height: 800 }); await p.waitForTimeout(800)
  const b = await p.evaluate(MESURER)
  await p.setViewportSize({ width: 960, height: 800 }); await p.waitForTimeout(800)
  const d = await p.evaluate(MESURER)
  ok(b.haut.b > a.haut.b && !b.croise && !b.couverts.length && !d.croise && !d.couverts.length && d.haut.b === a.haut.b,
    `La fenêtre rétrécit (960 → 660 px) : la barre du haut descend (${a.haut.b} → ${b.haut.b}) sans que la barre des outils (${b.outils.t}–${b.outils.b}) passe sous elle ; puis elle remonte (${d.haut.b})`, { a, b, d })
  await c.close()
}
// Au téléphone (600 → 360 → 600 px de large) : la barre du haut reste sur une
// rangée, la barre des outils en bas, sous elle rien n'est couvert
{
  const c = await nav.newContext({ viewport: { width: 600, height: 800 }, hasTouch: true, isMobile: true })
  const p = await c.newPage(); p.on('pageerror', e => erreurs.push('redim tél: ' + e.message))
  await p.goto(DEV); await p.waitForFunction(() => window.__app && document.querySelector('.rang')?.textContent?.includes('/')); await p.waitForTimeout(1000)
  const a = await p.evaluate(MESURER)
  await p.setViewportSize({ width: 360, height: 800 }); await p.waitForTimeout(800)
  const b = await p.evaluate(MESURER)
  await p.setViewportSize({ width: 600, height: 800 }); await p.waitForTimeout(800)
  const d = await p.evaluate(MESURER)
  const uneRangee = m => m.haut.b - m.haut.t <= 60, enBas = m => m.outils.b === 788 && m.outils.r - m.outils.l > m.outils.b - m.outils.t
  ok([a, b, d].every(m => uneRangee(m) && enBas(m) && !m.croise && !m.couverts.length && !m.defile),
    `Au téléphone, la fenêtre rétrécit (600 → 360 px) puis revient : la barre du haut reste sur une rangée (${a.haut.b}, ${b.haut.b}, ${d.haut.b}), la barre des outils en bas (${a.outils.t}, ${b.outils.t}, ${d.outils.t}), rien n'est couvert`, { a, b, d })
  await c.close()
}
await nav.close()
ok(erreurs.length === 0, 'aucune erreur JS', erreurs)
console.log(`\n${echecs ? `ÉCHECS : ${echecs}` : 'tout est vert'}`)
process.exit(echecs ? 1 : 0)
