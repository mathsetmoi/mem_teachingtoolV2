// Un toucher sur une vignette ferme la trieuse : le clic qui suit le
// toucher (compatibilité souris) tombe-t-il sur un bouton du tableau ?
import { ouvrir, preparer, etat, carte, attendreOuverte, verifier, pause, fin, doigtCDP, D } from './lib.mjs'

for (const [nom, o] of [['tablette 1024', { hasTouch: true, viewport: { width: 1024, height: 768 } }],
  ['téléphone', { hasTouch: true, isMobile: true, viewport: { width: 390, height: 844 }, deviceScaleFactor: 2 }]]) {
  const { ctx, page } = await ouvrir(o, nom)
  const P = await preparer(page, 12, { ici: 0 })
  await page.evaluate(() => {
    window.__evts = []
    for (const t of ['pointerdown', 'pointerup', 'mousedown', 'mouseup', 'click']) window.addEventListener(t, e => {
      const el = e.target
      window.__evts.push({ t, trieuse: document.body.classList.contains('en-trieuse'), cible: el?.closest?.('button')?.getAttribute('aria-label') || el?.className?.baseVal || el?.className || el?.tagName, pt: e.pointerType })
    }, true)
    // Ce qui ATTEINT les boutons du tableau (mis à jour au contrôle final : la
    // capture sur window voit le clic avant que la trieuse ne l'avale, au
    // document ; c'est l'effet sur le bouton qui compte)
    for (const b of document.querySelectorAll('button')) if (!b.closest('.trieuse') && !b.closest('.toast')) b.addEventListener('click', e => {
      window.__evts.push({ t: 'click-bouton', trieuse: document.body.classList.contains('en-trieuse'), cible: b.getAttribute('aria-label') || b.title, pt: e.pointerType })
    })
  })
  // Les boutons du tableau, et ce qui les couvre quand la trieuse est ouverte
  const rang = await page.evaluate(() => { const r = document.querySelector('.rang').getBoundingClientRect(); return { x: r.left + r.width / 2, y: r.top + r.height / 2 } })
  const boutons = await page.evaluate(() => [...document.querySelectorAll('button')].filter(b => { const r = b.getBoundingClientRect(); return r.width > 0 && r.height > 0 && !b.closest('.trieuse') && !b.closest('.toast') && getComputedStyle(b).visibility !== 'hidden' }).map(b => { const r = b.getBoundingClientRect(); return { nom: b.getAttribute('aria-label') || b.title, x: r.left + r.width / 2, y: r.top + r.height / 2 } }))
  await page.touchscreen.tap(rang.x, rang.y); await attendreOuverte(page); await page.waitForTimeout(500)
  const sous = await page.evaluate(bs => bs.map(b => { const el = document.elementFromPoint(b.x, b.y); const c = el?.closest?.('.carte'); return c && !el.closest('.carte-options') && !el.closest('.carte-poignee') && !el.closest('.carte-nom') ? { ...b, page: c.dataset.page } : null }).filter(Boolean), boutons)
  console.log(nom, 'boutons du tableau sous une vignette :', sous.map(s => s.nom).join(' ; '))
  // On choisit un bouton sans danger visible, sinon le premier
  const cible = sous.find(s => /Gomme|Surligneur|Formes|Segment|Point|Formule|Sélection|Stylo/i.test(s.nom)) || sous[0]
  if (!cible) { console.log('aucun bouton sous une vignette'); await ctx.close(); continue }
  const outilAvant = (await etat(page)).outil
  await page.evaluate(() => { window.__evts = [] })
  await page.touchscreen.tap(cible.x, cible.y); await pause(700)
  const e = await etat(page)
  const evts = await page.evaluate(() => window.__evts)
  console.log(JSON.stringify(evts))
  const apres = evts.filter(x => !x.trieuse)
  verifier(`${nom} : toucher la vignette de la page ${P.indexOf(cible.page) + 1} (au-dessus de « ${cible.nom} ») mène à la page sans toucher ce bouton du tableau`,
    !e.ouverte && e.page === cible.page && e.outil === outilAvant && !apres.some(x => x.t === 'click-bouton' && x.cible === cible.nom),
    { page: P.indexOf(e.page) + 1, outilAvant, outil: e.outil, apres })
  await page.screenshot({ path: D + `/fantome-${nom.replace(/\W/g, '')}.png` })
  await ctx.close()
}
await fin()
