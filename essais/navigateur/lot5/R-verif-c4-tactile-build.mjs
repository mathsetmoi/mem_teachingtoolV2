// SONDE DE VÉRIFICATION reprise dans la batterie (corrections des vérifications
// des retouches après le lot 5) : l'écran tactile, version construite.
// Copie de retouches/verif/conformite/c4-tactile-build.mjs ; elle lit les versions construites du dépôt (voir R-verif/lib.mjs).
// B1 au doigt (écran tactile) et B3 (la pastille dessinée pour un autre
// pointeur se prend) sur la version construite, écran qu'on touche.
import { demarrer, contexte, ouvrir, ecran, ok, note, fin, D, clic, lire, pastille, fabriquer, importer, tourner, ecartAngle, rect } from './R-verif/lib.mjs'

const { serveur, URLS, nav } = await demarrer()
const toastTexte = p => p.evaluate(() => { const t = document.querySelector('.toast.visible'); if (!t) return null; const c = t.cloneNode(true); c.querySelectorAll('button').forEach(b => b.remove()); return c.textContent.trim() })

for (const [nom, url] of Object.entries(URLS)) {
  const ctx = await contexte(nav, url, 1180, 820, { hasTouch: true })
  const { p, souris, doigt, crayon } = await ouvrir(ctx, url, nom)
  note('maxTouchPoints', await p.evaluate(() => navigator.maxTouchPoints))
  const b64 = await fabriquer(p)
  await importer(p, doigt, 'bouton', b64)
  let e = await ecran(p), t = await toastTexte(p)
  ok(e.outil === 'selection' && t === 'Image posée : ses coins l\'agrandissent, ↻ la tourne. Touchez le Stylo pour écrire de nouveau.', `${nom} B1 doigt : Sélection et « Touchez le Stylo… »`, { outil: e.outil, t })
  // B3 : souris qui survole, puis le doigt sur la pastille dessinée (un peu sous son centre)
  await souris.survol(300, 400); await p.waitForTimeout(80); await souris.survol(320, 420); await p.waitForTimeout(250)
  let q = await pastille(p), img = await lire(p)
  note('pastille dessinée pour la souris', { q, haut: img.y1 })
  const a0 = img.angle, aire0 = img.aire
  await tourner(p, doigt, { x: q.x, y: q.y + 7 }, { x: img.cx, y: img.cy }, 60)
  img = await lire(p)
  ok(Math.abs(ecartAngle(img.angle, a0)) > 30 && Math.abs(img.aire / aire0 - 1) < 0.08, `${nom} B3 : doigt après la souris, sur la pastille dessinée (7 px sous son centre) : l'image tourne, sans être déformée`, { a0, a: img.angle, aire0, aire: img.aire })
  await p.keyboard.press('Control+z'); await p.waitForTimeout(400)
  // B3 : doigt (pastille à 36 px), puis le crayon sans survol sur la pastille dessinée
  await clic(p, doigt, 1100, 760); await p.waitForTimeout(200)
  img = await lire(p)
  // reprendre l'image au doigt
  await clic(p, doigt, img.cx, img.cy); await p.waitForTimeout(400)
  q = await pastille(p); img = await lire(p)
  note('pastille dessinée pour le doigt', { q, haut: img.y1 })
  const b0 = img.angle, aireb = img.aire
  await tourner(p, crayon, { x: q.x, y: q.y + 8 }, { x: img.cx, y: img.cy }, 60)
  img = await lire(p); e = await ecran(p)
  ok(Math.abs(ecartAngle(img.angle, b0)) > 30 && Math.abs(img.aire / aireb - 1) < 0.08 && img.encre < 50, `${nom} B3 : crayon après le doigt, sur la pastille dessinée (8 px sous son centre) : l'image tourne`, { b0, a: img.angle, aireb, aire: img.aire, encre: img.encre, outil: e.outil })
  await p.screenshot({ path: `${D}/c4-${nom}.png` })
  await ctx.close()
}
await fin(nav, serveur)
