// Les bandeaux là où il n'y a pas de clé (iPhone, iPad, Android : pas de
// showSaveFilePicker) : le bandeau de la connexion Google (Drive voulu par
// défaut, en ligne) puis le rappel d'enregistrer (Drive écarté). Que
// recouvrent-ils ? node rappel-ecrans.mjs largeur hauteur
import { lancer, info, ok, dort, CAPTURES, suivre, DEV, ECOUTER_TOASTS, erreurs } from './outils.mjs'
const W = +(process.argv[2] ?? 390), H = +(process.argv[3] ?? 844)
const T = `${W}×${H}`
const MIN = m => `${String(Math.floor(m / 60)).padStart(2, '0')}:${String(m % 60).padStart(2, '0')}:00`
const nav = await lancer()
const GEO = () => {
  const b = document.querySelector('.bandeau-sauvegarde')
  if (b.hidden) return { bandeau: null }
  const rb = b.getBoundingClientRect(), autres = []
  for (const el of document.querySelectorAll('.barre button, .barre select, .barre input, .bouton-classeur, .rang')) {
    if (b.contains(el) || !el.getClientRects().length) continue
    if (getComputedStyle(el).visibility === 'hidden') continue
    const r = el.getBoundingClientRect()
    const x = Math.min(r.right, rb.right) - Math.max(r.left, rb.left), y = Math.min(r.bottom, rb.bottom) - Math.max(r.top, rb.top)
    if (x > 1 && y > 1) autres.push(`${(el.getAttribute('aria-label') || el.title || el.textContent || el.className).trim().slice(0, 28)} (${Math.round(x)}×${Math.round(y)} recouverts)`)
  }
  return { raison: b.dataset.raison, texte: b.textContent.replace(/[  ]/g, ' ').slice(0, 90), r: [Math.round(rb.left), Math.round(rb.top), Math.round(rb.right), Math.round(rb.bottom)], fermable: !!b.querySelector('.fermer-bandeau'), recouvre: autres, forme: window.__app.ui.formeClasseur }
}
for (const drive of ['defaut', 'aucune']) {
  const ctx = await nav.newContext({ viewport: { width: W, height: H }, hasTouch: true, isMobile: W < 900, deviceScaleFactor: 2 })
  await ctx.addInitScript(() => { for (const k of ['showSaveFilePicker', 'showOpenFilePicker']) { try { delete window[k] } catch { /* */ } window[k] = undefined } })
  await ctx.addInitScript(ECOUTER_TOASTS)
  const p = await ctx.newPage(); suivre(p, 'rappel')
  await p.clock.install()
  await p.goto(DEV); await p.waitForFunction(() => window.__surveillance && document.querySelector('.rang')?.textContent?.includes('/'), null, { timeout: 30000 }); await p.waitForTimeout(500)
  if (drive === 'aucune') await p.evaluate(async () => { await window.__drive?.choisir('aucune') })
  // Écrire au doigt au milieu de la page
  const ecrire = async y => { await p.evaluate(async y => {
    const t = window.__app.tableau, page = t.ordre.get(0)
    const pts = []; for (let i = 0; i < 30; i++) pts.push(i * 6, Math.sin(i / 3) * 20, 0.5)
    t.nouveauGeste(); t.poser(page, { id: 'T' + Math.random().toString(36).slice(2), type: 'trait', x: 150, y, z: Date.now(), auteur: t.moi, pts, couleur: '#1b2230', taille: 4, opacite: 1, pression: false })
  }, y); await p.waitForTimeout(100) }
  await ecrire(300)
  await p.clock.fastForward(MIN(21))
  await ecrire(360)
  await p.clock.fastForward('02:31')
  await p.waitForTimeout(400)
  const g = await p.evaluate(GEO)
  info(`${T} Drive ${drive} : le bandeau`, g)
  ok(!g.raison || g.recouvre.length === 0, `${T} (Drive ${drive}) : le bandeau « ${g.texte ?? '—'} » ne recouvre aucun bouton`, g.recouvre)
  await p.screenshot({ path: CAPTURES + `rappel-${W}x${H}-${drive}.png` })
  await ctx.close()
}
console.log('erreurs JS', erreurs)
await nav.close()
