// Des pages d'écriture pour les essais du PDF : des lignes de « mots » (des
// traits en zigzag, comme une écriture cursive), posées par l'API, chacune
// avec son identifiant ; le même tableau d'un passage à l'autre (hasard fixe).
export const ECRIRE = ({ pages, lignes, mots, x0 = 120, y0 = 120, pas = 72, haut = 30, ech = 2.6, nouvelle = true, fond = 'blanc', couleur = '#1b2230' }) => {
  const a = window.__app, t = a.tableau
  let s = 12345
  const hasard = () => { s = (s * 1103515245 + 12345) & 0x7fffffff; return s / 0x7fffffff }
  const ids = []
  for (let p = 0; p < pages; p++) {
    if (p || nouvelle === 'toujours') a.nouvellePage()
    t.changerFond(a.page, fond)
    const formes = []
    for (let l = 0; l < lignes; l++) {
      let x = x0
      for (let m = 0; m < mots; m++) {
        const n = 18 + Math.floor(hasard() * 14), pts = []
        for (let i = 0; i < n; i++) pts.push(i * ech, (i % 2 ? haut * (0.55 + hasard() * 0.45) : hasard() * 4), 0.5)
        formes.push({ id: `e${p}-${l}-${m}`, type: 'trait', x, y: y0 + l * pas, z: p * 100000 + l * 100 + m, auteur: t.moi, pts, couleur: m % 7 ? couleur : '#d64545', taille: 3, opacite: 1, pression: false })
        x += n * ech + 10 + hasard() * 8
      }
    }
    t.nouveauGeste()
    t.poserPlusieurs(a.page, formes)
    ids.push(a.page)
  }
  a.allerPage(ids[0])
  return ids
}
