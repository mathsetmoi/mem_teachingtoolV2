// Sonde : la pastille ↻ d'une figure seule et le nom de son sommet du haut ;
// à la souris, au stylet, au doigt (et zoomé) : se gênent-ils ?
import * as L from './lib/outils.mjs'
const { ok, note, attendre, poser, prendre, cadre, ecran, vue, versF } = L
for (const [nom, o, ptr] of [['souris', {}, 'souris'], ['doigt', { hasTouch: true, viewport: { width: 1180, height: 820 }, screen: { width: 1180, height: 820 } }, 'doigt']]) {
  const ctx = await L.contexte(o)
  const P = await L.ouvrir(ctx, nom)
  const { p } = P
  await p.evaluate(L.PAGE_NEUVE)
  for (const z of [1, 0.5]) {
    await p.evaluate(z => { const a = window.__app; a.cam.z = z; a.cam.x = 120; a.cam.y = 120; a.rendu.toutRedessiner() }, z)
    const T = await poser(p, { type: 'polygone', x: 300, y: 450, pts: [0, 0, 160, 0, 80, -140], ferme: true, couleur: '#1b2230', taille: 2.5, sommets: true, noms: ['A', 'B', 'C'] })
    await prendre(p, [T])
    if (ptr === 'doigt') { const s = await ecran(p, 380, 420); await P.doigt.bas(s.x, s.y); await attendre(40); await P.doigt.haut(); await attendre(400) }
    else { const s = await ecran(p, 380, 440); await p.mouse.move(s.x, s.y); await attendre(100) }
    const k = await cadre(p)
    const v = await vue(p)
    const past = versF(v, k.cadre.pastille)
    // le nom C : où le rendu le peint (posNoms, sinon la place automatique) — on cherche le texte « C » dans la boîte du nom
    const nomC = await p.evaluate(id => { const a = window.__app; const b = a.rendu.boiteNom?.(a.forme(id), 2) ?? null; return b }, T)
    // ce que prend un appui juste au-dessus du sommet C, à 18 px d'écran (là où son nom est d'habitude)
    const apex = versF(v, { x: 380, y: 310 })
    const pg = await p.evaluate(({ x, y }) => { const a = window.__app; const r = document.getElementById('zone').getBoundingClientRect(); return { poignee: a.poigneeVisee?.({ x: x - r.left, y: y - r.top })?.p?.quoi ?? null, prise: a.priseSous({ x: x - r.left, y: y - r.top })?.prise ?? null } }, { x: apex.x, y: apex.y - 18 })
    note(`${nom} z=${z}`, { pastille: past, apex, pg, dessous: k.cadre.dessous, nomC })
    ok(Math.hypot(past.x - apex.x, past.y - apex.y) > 30, `${nom} z=${z} : la pastille n'est pas sur le nom du sommet du haut`, { past, apex })
    await p.evaluate(id => { const a = window.__app; a.selection.clear(); a.tableau.nouveauGeste(); a.tableau.retirer?.(a.page, [id]) }, T)
  }
  await ctx.close()
}
await L.fin()
