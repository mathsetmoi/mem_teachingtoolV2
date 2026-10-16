// Écran tactile (iPad, tablette Android, portable tactile) : le doigt selon chaque réglage, deux doigts, le stylet direct
import { lancer, ouvrir, noter, bilan, CAM, POSER, TRAIT, N, outils, ligne } from './lib.mjs'

const nav = await lancer()
const { page, cdp } = await ouvrir(nav, { hasTouch: true, viewport: { width: 1024, height: 768 } }, 'tactile')
const { stylet, touche, doigt } = outils(cdp)
const ev = (f, a) => page.evaluate(f, a)
const neutre = () => ev(() => { const a = window.__app; a.cam.x = 120; a.cam.y = 120; a.cam.z = 1; a.selection.clear(); a.rendu.toutRedessiner(); a.ui.maj() })
const regler = d => ev(d => { window.__app.choisirDoigt(d) }, d)

// Le bouton du rôle du doigt et son menu
{
  const b = await ev(() => { const b = document.querySelector('.barre-outils button[aria-haspopup=menu]'); return { cache: b.hidden, badge: b.dataset.badge, titre: b.title } })
  noter('Écran tactile : le bouton du rôle du doigt est là (Auto)', !b.cache && b.badge === 'A', JSON.stringify(b))
  await page.tap('.barre-outils button[aria-haspopup=menu]')
  await page.waitForTimeout(150)
  const m = await ev(() => [...document.querySelectorAll('.menu-flottant:not([hidden]) .menu-item')].map(x => x.getAttribute('aria-checked') + ' ' + x.querySelector('.libelle').firstChild.textContent))
  // Lot 2 (M8) : le menu du doigt porte aussi le réglage des gestes à deux et
  // trois doigts (une case à cocher, après les trois positions)
  noter('Son menu a trois positions, Auto coché, et le réglage « Deux doigts : annuler »', m.length === 4 && /^true Auto/.test(m[2]) && /Deux doigts : annuler/.test(m[3]), JSON.stringify(m))
  // Un toucher sur le tableau ferme le menu sans encre (le doigt dessine)
  const n0 = await ev(N)
  await doigt([[600, 400]])
  await page.waitForTimeout(400)
  const r = await ev(() => ({ n: window.__app.formes.length, menu: !!document.querySelector('.menu-flottant:not([hidden])') }))
  noter('Menu du doigt ouvert, un toucher sur le tableau : il se ferme, aucune encre', r.n === n0 && !r.menu, JSON.stringify(r))
}

// « Le doigt dessine »
await regler('dessine'); await neutre()
{
  const n0 = await ev(N)
  await doigt(ligne(300, 300, 150, 40))
  await page.waitForTimeout(200)
  noter('Le doigt dessine : un trait', (await ev(N)) === n0 + 1)
  // Deux doigts : le trait du premier est jeté, le pincement zoome ; un doigt levé, l'autre déplace la vue
  const n1 = await ev(N), c0 = await ev(CAM)
  await touche('touchStart', [[400, 400, 1]])
  await touche('touchMove', [[410, 405, 1]])
  await touche('touchStart', [[410, 405, 1], [600, 400, 2]])
  for (let k = 1; k <= 5; k++) await touche('touchMove', [[410 - 10 * k, 405, 1], [600 + 10 * k, 400, 2]])
  const cz = await ev(CAM)
  await touche('touchEnd', [[360, 405, 1]])           // le doigt 1 se lève, le 2 reste
  for (let k = 1; k <= 6; k++) await touche('touchMove', [[650 + 20 * k, 400 + 10 * k, 2]])
  const cp = await ev(CAM)
  await touche('touchEnd', [])
  await page.waitForTimeout(200)
  const n2 = await ev(N)
  noter('Le doigt dessine, deux doigts : zoom, puis le doigt resté déplace la vue, aucune encre',
    // Le doigt resté glisse de 6 × (20, 10) : la vue le suit, exactement
    // (l'attente d'avant, 160 et 70, ajoutait un saut au lever du premier doigt)
    n2 === n1 && cz.z > c0.z && Math.abs(cp.x - cz.x - 120) < 1 && Math.abs(cp.y - cz.y - 60) < 1, JSON.stringify({ n1, n2, c0, cz, cp }))
  // Ensuite, un seul doigt dessine de nouveau
  await doigt(ligne(300, 500, 100, 0))
  await page.waitForTimeout(200)
  noter('Après le pincement, un doigt seul dessine de nouveau', (await ev(N)) === n2 + 1)
}

// Formes au doigt : un toucher qui tremble de 7 px (sous le seuil de 8 px) ne doit rien poser
await neutre()
{
  await ev(() => { const a = window.__app; a.typeForme = 'cercle'; a.choisirOutil('forme') })
  const n0 = await ev(N)
  await doigt([[700, 250], [703, 252], [705, 254], [705, 254]])
  await page.waitForTimeout(200)
  const r = await ev(() => { const f = window.__app.formes.at(-1); return { n: window.__app.formes.length, type: f?.type, r: f?.r } })
  noter('Formes (cercle), le doigt tremble de 6,4 px (sous 8 px) : rien n\'est posé', r.n === n0, JSON.stringify({ n0, ...r }))
  await ev(() => { const a = window.__app; a.typeForme = 'rectangle'; a.choisirOutil('forme') })
  const n1 = await ev(N)
  await doigt([[700, 350], [703, 352], [705, 354]])
  await page.waitForTimeout(200)
  const r2 = await ev(() => { const f = window.__app.formes.at(-1); return { n: window.__app.formes.length, type: f?.type, pts: f?.pts } })
  noter('Formes (rectangle), le doigt tremble de 6,4 px (sous 8 px) : rien n\'est posé', r2.n === n1, JSON.stringify({ n1, ...r2 }))
  await ev(() => window.__app.choisirOutil('stylo'))
}

// « Le doigt déplace et sélectionne »
await regler('deplace'); await neutre()
{
  const id = await ev(POSER, { x: 300, y: 250, l: 200, h: 120 })
  const n0 = await ev(N), c0 = await ev(CAM)
  await doigt(ligne(800, 500, -100, -50))
  await page.waitForTimeout(150)
  const c1 = await ev(CAM)
  noter('Le doigt déplace : la vue suit, aucune encre', (await ev(N)) === n0 && c1.x - c0.x === -100 && c1.y - c0.y === -50, JSON.stringify({ c0, c1 }))
  await neutre()
  // Toucher le sommet d'une figure non sélectionnée : la figure est prise, pas de menu de sommet
  const s = await ev(() => window.__app.cam.versEcran(500, 250))
  await doigt([[s.x + 3, s.y + 2]])
  await page.waitForTimeout(400)
  const r = await ev(() => ({ sel: [...window.__app.selection], partie: window.__app.partie, menu: !document.querySelector('.menu-partie').hidden, poignees: window.__app.rendu.poigneesActives }))
  noter('Le doigt touche le sommet d\'une figure non sélectionnée : elle est prise, pas de menu de sommet', r.sel[0] === id && !r.partie && !r.menu, JSON.stringify(r))
  // Le doigt tire ce sommet de 30 px
  await doigt(ligne(s.x + 2, s.y + 2, 30, 0, 6))
  await page.waitForTimeout(150)
  const f1 = await ev(id => window.__app.forme(id).pts, id)
  noter('Le doigt tire le sommet de la figure sélectionnée', Math.abs(f1[2] - 232) < 1, JSON.stringify(f1))
  // Le stylet écrit à 4 px de ce sommet : un trait, la figure intacte, « Auto » n'est pas en jeu (réglage « déplace »)
  const s2 = await ev(() => { const a = window.__app; const f = a.formes[0]; return a.cam.versEcran(f.x + f.pts[2], f.y + f.pts[3]) })
  const avant = await ev(id => JSON.stringify(window.__app.forme(id).pts), id)
  const n1 = await ev(N)
  await stylet.trace(ligne(s2.x + 4, s2.y, 40, 30))
  await page.waitForTimeout(150)
  noter('Le stylet écrit à 4 px du sommet : un trait, la figure intacte', (await ev(id => JSON.stringify(window.__app.forme(id).pts), id)) === avant && (await ev(N)) === n1 + 1)
  // Paume (contact large) : ignorée
  const c2 = await ev(CAM)
  await doigt(ligne(700, 600, 80, 0), 30)
  await page.waitForTimeout(100)
  noter('Paume (contact de 60 px) : ignorée', JSON.stringify(await ev(CAM)) === JSON.stringify(c2))
  // Deux doigts, l'un se lève : l'autre continue de déplacer
  await touche('touchStart', [[400, 400, 1]])
  await touche('touchStart', [[400, 400, 1], [600, 400, 2]])
  await touche('touchMove', [[380, 400, 1], [620, 400, 2]])
  await touche('touchEnd', [[380, 400, 1]])
  const cz = await ev(CAM)
  for (let k = 1; k <= 5; k++) await touche('touchMove', [[620 - 10 * k, 400, 2]])
  await touche('touchEnd', [])
  const cp = await ev(CAM)
  noter('Le doigt déplace, deux doigts puis un : la vue continue de suivre', Math.abs(cp.x - cz.x + 50) < 1, JSON.stringify({ cz, cp }))
}

// « Auto » sur écran tactile : le premier stylet direct fait passer le doigt en « déplace »
await regler('auto'); await neutre()
{
  const avant = await ev(() => window.__app.doigtDeplace)
  await stylet.trace(ligne(300, 600, 100, 10))
  await page.waitForTimeout(200)
  const r = await ev(() => ({ deplace: window.__app.doigtDeplace, toast: document.querySelector('.toast').textContent, direct: localStorage.getItem('mem-stylet-direct') }))
  noter('Auto, écran tactile : le premier stylet fait passer le doigt en « déplace », message et « Changer »', !avant && r.deplace && /Stylet détecté : le doigt déplace la vue/.test(r.toast) && /Changer/.test(r.toast), JSON.stringify(r))
}

bilan()
await nav.close()
