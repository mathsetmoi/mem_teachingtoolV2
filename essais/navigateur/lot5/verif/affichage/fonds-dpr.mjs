// Les fonds à une densité d'écran fractionnaire (Windows à 125 % et 150 %) :
// les lignes d'un même niveau ont-elles toutes le même ton (pas de moiré) ?
import { writeFileSync } from 'node:fs'
import { lancer, contexte, ouvrir, ok, note, fin, OUT } from './lib/commun.mjs'
const nav = await lancer()
for (const dpr of [1, 1.25, 1.5]) {
  const ctx = await contexte(nav, { deviceScaleFactor: dpr })
  const P = await ouvrir(ctx)
  await P.evaluate(() => { const a = window.__app; a.nouvellePage(); a.selection.clear(); a.ui.maj() })
  for (const contraste of [false, true]) for (const fond of ['carreaux', 'grands-carreaux', 'millimetre']) {
    const r = await P.evaluate(async ({ fond, contraste }) => {
      const a = window.__app
      if (a.fond !== fond) a.changerFond(fond)
      a.rendu.contraste = contraste
      a.cam.x = 3; a.cam.y = 3; a.cam.z = 1
      a.rendu.toutRedessiner()
      await new Promise(r => requestAnimationFrame(() => requestAnimationFrame(r)))
      const c = a.rendu.scene, k = c.width / c.clientWidth, g = c.getContext('2d')
      // sur une rangée entre deux lignes horizontales (y monde = 7 : jamais sur une ligne), le minimum de luminance de chaque ligne verticale de 1 cm
      const y = Math.round((7 * a.cam.z + a.cam.y + 200) * k)
      const d = g.getImageData(0, y, c.width, 1).data
      const L = i => 0.2126 * d[i * 4] + 0.7152 * d[i * 4 + 1] + 0.0722 * d[i * 4 + 2]
      const tons = []
      for (let wx = 40; wx <= 1200; wx += 40) {
        const sx = (wx * a.cam.z + a.cam.x) * k
        let m = 255, somme = 0
        for (let p = Math.floor(sx) - 3; p <= Math.floor(sx) + 3; p++) { m = Math.min(m, L(p)); somme += 255 - L(p) }
        tons.push({ min: Math.round(m), encre: Math.round(somme) })
      }
      const t = document.createElement('canvas'); t.width = 300 * k; t.height = 120 * k
      t.getContext('2d').drawImage(c, 100 * k, 100 * k, 300 * k, 120 * k, 0, 0, 300 * k, 120 * k)
      a.rendu.contraste = false
      return { k, tons, png: t.toDataURL('image/png').split(',')[1] }
    }, { fond, contraste })
    writeFileSync(`${OUT}/dpr-${dpr}-${fond}${contraste ? '-contraste' : ''}.png`, Buffer.from(r.png, 'base64'))
    const mins = r.tons.map(t => t.min), encres = r.tons.map(t => t.encre)
    const ecart = Math.max(...mins) - Math.min(...mins), ecartEncre = Math.max(...encres) / Math.max(1, Math.min(...encres))
    note(`densité ${dpr}, ${fond}${contraste ? ' (contraste)' : ''} : ton le plus sombre des lignes de 1 cm`, { min: Math.min(...mins), max: Math.max(...mins), encre: [Math.min(...encres), Math.max(...encres)] })
    ok(ecart <= 25, `densité ${dpr}, ${fond}${contraste ? ' (contraste)' : ''} : les lignes de 1 cm ont toutes à peu près le même ton (écart ${ecart} sur 255)`, mins)
  }
  await ctx.close()
}
await fin(nav)
