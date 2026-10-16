// SONDE DE VÉRIFICATION reprise dans la batterie (corrections des vérifications
// des retouches après le lot 5) : la rotation d'une image importée (B1 à B5), version construite.
// ADAPTÉE aux corrections : depuis la Gomme, le message dit « E : reprendre la
// Gomme. » au lieu de « Échap deux fois : reprendre l'outil d'avant. » (la touche
// vaut que l'image soit encore prise ou non ; Échap deux fois rend toujours la Gomme
// quand elle l'est, ce qui reste vérifié).
// Copie de retouches/verif/conformite/c2-rotation-build.mjs ; elle lit les versions construites du dépôt (voir R-verif/lib.mjs).
// Conformité B1, B2, B4, B5 sur la VERSION CONSTRUITE, à la tablette
// graphique (pen indirect, survol, bouton latéral = clic droit) et à la souris.
import { demarrer, contexte, ouvrir, ecran, ok, note, fin, D, clic, trait, lire, pastille, coins, rect, couvre, disque, fabriquer, importer, tourner, ecartAngle } from './R-verif/lib.mjs'

const { serveur, URLS, nav } = await demarrer()
const TEXTE_P = 'Image posée : ses coins l\'agrandissent, ↻ la tourne. P : reprendre le Stylo.'
const toastTexte = p => p.evaluate(() => { const t = document.querySelector('.toast.visible'); if (!t) return null; const b = [...t.querySelectorAll('button')].map(b => b.textContent.trim()); const c = t.cloneNode(true); c.querySelectorAll('button').forEach(b => b.remove()); return { texte: c.textContent.trim(), boutons: b } })
const toastRect = p => rect(p, '.toast.visible')
const barreRect = p => rect(p, '.barre-actions')
const viderPage = async p => { await p.keyboard.press('Escape'); await p.keyboard.press('Control+a'); await p.waitForTimeout(150); await p.keyboard.press('Delete'); await p.waitForTimeout(200); await p.keyboard.press('Escape'); await p.keyboard.press('Escape'); await p.keyboard.press('p'); await p.waitForTimeout(300) }

for (const [nom, url] of Object.entries(URLS)) {
  const ctx = await contexte(nav, url, 1366, 768)
  const { p, wacom, souris } = await ouvrir(ctx, url, nom)
  const b64 = await fabriquer(p)
  // --- B1 Wacom, bouton Image, depuis le Stylo ---
  await wacom.survol(700, 420); await p.waitForTimeout(100)
  await importer(p, wacom, 'bouton', b64)
  let e = await ecran(p), t = await toastTexte(p)
  ok(e.outil === 'selection', `${nom} B1 Wacom : l'import par le bouton Image passe à l'outil Sélection`, e.outil)
  ok(t?.texte === TEXTE_P && t.boutons.includes('Fixer en fond'), `${nom} B1 Wacom : message exact + « Fixer en fond »`, t)
  let q = await pastille(p), cs = await coins(p), img = await lire(p)
  ok(!!q && cs.length >= 5, `${nom} B1 : la pastille ↻ et les coins sont dessinés`, { q, n: cs.length })
  const br = await barreRect(p), tr = await toastRect(p)
  ok(!!br, `${nom} B1 : la barre d'actions est là`, br)
  ok(tr && !couvre(tr, br) && !couvre(tr, disque(q, 18)), `${nom} B2 : le message ne couvre ni la barre d'actions ni la pastille (100 %)`, { tr, br, q })
  await p.screenshot({ path: `${D}/c2-${nom}-import-wacom.png` })
  // Tourner à la pastille avec la Wacom
  const avantA = img.angle
  await tourner(p, wacom, q, { x: img.cx, y: img.cy }, 70)
  img = await lire(p)
  ok(Math.abs(ecartAngle(img.angle, avantA)) > 30 && img.encre < 50, `${nom} B1 : la Wacom tourne l'image par la pastille, sans encre`, { avantA, apres: img.angle, encre: img.encre })
  // P : le Stylo ; un trait s'écrit
  await p.keyboard.press('p'); await p.waitForTimeout(300)
  e = await ecran(p); ok(e.outil === 'stylo', `${nom} B1 : P rend le Stylo`, e.outil)
  // --- B4 : bouton latéral sur l'image, au Stylo -> menu complet, ⋯, quart de tour ---
  img = await lire(p); const a0 = img.angle
  await wacom.clicDroit(img.cx, img.cy); await p.waitForTimeout(500)
  const panneau = await rect(p, '.panneau-forme')
  ok(!!panneau, `${nom} B4 : le bouton du stylet sur l'image, au Stylo, ouvre son menu complet`, panneau)
  const plus = p.locator('.panneau-forme button.plus').first()
  const bp = await plus.boundingBox().catch(() => null)
  if (bp) await clic(p, wacom, bp.x + bp.width / 2, bp.y + bp.height / 2)
  await p.waitForTimeout(300)
  const pos = await p.evaluate(() => {
    const m = [...document.querySelectorAll('[role=menu]')].find(m => !m.hidden && m.querySelector('[data-action="quart-droite"]'))
    if (!m) return null
    const kids = [...m.children]
    const i = kids.findIndex(k => k.classList.contains('menu-titre') && k.textContent === 'Position')
    return { titres: kids.filter(k => k.classList.contains('menu-titre')).map(k => k.textContent), apres: kids.slice(i + 1).map(k => k.textContent.trim()), avant: kids[i - 1]?.className }
  })
  ok(pos?.apres?.[0]?.startsWith('Tourner d\'un quart de tour à gauche') && pos?.apres?.[1]?.startsWith('Tourner d\'un quart de tour à droite'), `${nom} B4 : section Position, les deux quarts de tour`, pos)
  const qd = p.locator('[data-action="quart-droite"]').filter({ visible: true }).first()
  const bq = await qd.boundingBox().catch(() => null)
  if (bq) await clic(p, wacom, bq.x + bq.width / 2, bq.y + bq.height / 2)
  await p.waitForTimeout(500)
  img = await lire(p); e = await ecran(p)
  ok(Math.abs(ecartAngle(img.angle, a0 + 90)) < 3, `${nom} B4 : « … à droite » tourne de +90° (sens des aiguilles à l'écran)`, { a0, apres: img.angle, outil: e.outil })
  await p.keyboard.press('Control+z'); await p.waitForTimeout(500)
  img = await lire(p)
  ok(Math.abs(ecartAngle(img.angle, a0)) < 3, `${nom} B4 : un seul Ctrl+Z défait le quart de tour`, { a0, apres: img.angle })
  // à gauche, au clic droit souris
  await souris.clicDroit(img.cx, img.cy); await p.waitForTimeout(400)
  await p.locator('.panneau-forme button.plus').first().click(); await p.waitForTimeout(300)
  await p.locator('[data-action="quart-gauche"]').filter({ visible: true }).first().click(); await p.waitForTimeout(500)
  img = await lire(p)
  ok(Math.abs(ecartAngle(img.angle, a0 - 90)) < 3, `${nom} B4 : « … à gauche » tourne de −90°`, { a0, apres: img.angle })
  await p.screenshot({ path: `${D}/c2-${nom}-quart.png` })

  // --- B1 : depuis la Gomme, Ctrl+V : Échap deux fois rend la Gomme ---
  await viderPage(p)
  await p.keyboard.press('e'); await p.waitForTimeout(200)
  await p.mouse.move(700, 420)
  await importer(p, souris, 'coller', b64)
  e = await ecran(p); t = await toastTexte(p)
  note(`${nom} depuis la Gomme, Ctrl+V`, { outil: e.outil, t })
  ok(e.outil === 'selection' && t?.texte === 'Image posée : ses coins l\'agrandissent, ↻ la tourne. E : reprendre la Gomme.', `${nom} B1 : depuis la Gomme, Sélection et message « E : reprendre la Gomme. »`, t)
  await p.keyboard.press('Escape'); await p.waitForTimeout(150); await p.keyboard.press('Escape'); await p.waitForTimeout(250)
  e = await ecran(p); ok(e.outil === 'gomme', `${nom} B1 : Échap deux fois rend la Gomme`, e.outil)
  // --- B1 : depuis la Sélection : première phrase seule ---
  await p.keyboard.press('v'); await p.waitForTimeout(150)
  await importer(p, souris, 'coller', b64)
  t = await toastTexte(p)
  ok(t?.texte === 'Image posée : ses coins l\'agrandissent, ↻ la tourne.', `${nom} B1 : depuis la Sélection, première phrase seule`, t)
  // --- B1 souris, depuis le Stylo, glisser-déposer ---
  await viderPage(p)
  await souris.survol(700, 420); await souris.bas(700, 420); await souris.haut(702, 421); await p.waitForTimeout(200)
  await p.keyboard.press('Control+z'); await p.waitForTimeout(200)
  await importer(p, souris, 'deposer', b64)
  e = await ecran(p); t = await toastTexte(p)
  ok(e.outil === 'selection' && t?.texte === TEXTE_P, `${nom} B1 : fichier déposé depuis le Stylo, à la souris : Sélection, même message`, { outil: e.outil, t })
  // --- B5 : Fixer en fond, du message (souris) ---
  await p.locator('.toast.visible button', { hasText: 'Fixer en fond' }).click(); await p.waitForTimeout(400)
  t = await toastTexte(p)
  ok(t?.texte === 'Image fixée en fond : écrivez et entourez par-dessus. Pour la tourner ou la déplacer : clic droit dessus, puis « Détacher l\'image du fond ».', `${nom} B5 : message de Fixer en fond (souris)`, t)
  img = await lire(p)
  await souris.clicDroit(img.cx, img.cy); await p.waitForTimeout(400)
  const entrees = await p.evaluate(() => [...document.querySelectorAll('[role=menu]')].filter(m => !m.hidden && m.getClientRects().length).flatMap(m => [...m.querySelectorAll('.menu-item')].map(b => b.querySelector('.libelle')?.firstChild?.textContent ?? b.textContent)))
  ok(entrees.includes('Détacher l\'image du fond'), `${nom} B5 : le clic droit sur l'image fixée propose « Détacher l'image du fond »`, entrees)
  await p.locator('.menu-item', { hasText: 'Détacher l\'image du fond' }).filter({ visible: true }).first().click(); await p.waitForTimeout(400)
  e = await ecran(p); q = await pastille(p)
  ok(e.outil === 'selection' && !!q, `${nom} B5 : détachée, à la Sélection avec sa pastille`, { e, q })
  // Wacom : Fixer en fond -> « bouton du stylet dessus »
  await wacom.survol(img.cx, img.cy); await p.waitForTimeout(60)
  await wacom.clicDroit(img.cx, img.cy); await p.waitForTimeout(400)
  await p.locator('.panneau-forme button.plus').first().click(); await p.waitForTimeout(300)
  const fix = p.locator('.menu-item', { hasText: 'Fixer en fond' }).filter({ visible: true }).first()
  const bf = await fix.boundingBox().catch(() => null)
  if (bf) await clic(p, wacom, bf.x + bf.width / 2, bf.y + bf.height / 2)
  await p.waitForTimeout(400)
  t = await toastTexte(p)
  ok(t?.texte === 'Image fixée en fond : écrivez et entourez par-dessus. Pour la tourner ou la déplacer : bouton du stylet dessus, puis « Détacher l\'image du fond ».', `${nom} B5 : message de Fixer en fond (Wacom)`, t)
  await ctx.close()
}
await fin(nav, serveur)
