// Sonde : à 2000 %, qu'y a-t-il de bleu clair à l'écran autour d'une formule ?
import { writeFileSync } from 'node:fs'
import { lancer, contexte, ouvrir, OUT } from './lib/commun.mjs'
const nav = await lancer(); const ctx = await contexte(nav); const P = await ouvrir(ctx)
await P.evaluate(async () => { window.__cadre = await import('/src/cadre.ts') })
const r = await P.evaluate(() => {
  const a = window.__app, t = a.tableau, C = window.__cadre
  a.nouvellePage(); a.changerFond('blanc'); a.choisirOutil('selection')
  const pose = f => { const id = 'z' + Math.random().toString(36).slice(2); t.nouveauGeste(); t.poser(a.page, { id, z: Date.now() + Math.random(), auteur: t.moi, ...f }); return id }
  const T = pose({ type: 'formule', x: 100, y: 300, latex: '\\frac{3}{7}x', couleur: '#1b2230', taille: 28 })
  const f = a.forme(T)
  a.transformerSelection(C.composer(C.rotation({ x: f.x, y: f.y }, Math.PI / 6), C.echelle({ x: f.x, y: f.y }, 2, 2)), [T])
  a.selection.clear(); a.ui.maj()
  a.cam.z = 20; a.cam.x = 683 - (f.x + 40) * 20; a.cam.y = 384 - (f.y + 30) * 20
  a.rendu.toutRedessiner(); a.ui.maj()
  return { sel: [...a.selection], survol: a.survol ?? null }
})
await P.mouse.move(5, 500); await P.waitForTimeout(500)
writeFileSync(OUT + '/sonde-2000.png', await P.screenshot())
console.log(JSON.stringify(r))
const info = await P.evaluate(() => {
  const el = document.elementFromPoint(683, 384)
  return { tag: el?.tagName, classe: el?.className, parents: (() => { const r = []; for (let p = el; p; p = p.parentElement) r.push(p.className || p.tagName); return r.slice(0, 6) })() }
})
console.log(JSON.stringify(info))
await nav.close()
