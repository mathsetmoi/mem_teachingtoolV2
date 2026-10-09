// =============================================================
// GLISSER UNE PAGE DANS LA TRIEUSE
// Où une page tirée arrive, et à quelle vitesse la grille défile quand on
// la tire près de son bord. Pur : des rectangles et des nombres, sans
// document ni interface (tests/trieuse.test.ts).
// Les rectangles sont ceux des cartes de la grille, dans l'ordre des pages
// (coordonnées de la fenêtre, comme getBoundingClientRect) : la carte tirée
// y est aussi, à sa place.
// =============================================================

/** Le rectangle d'une carte */
export interface Rect { x: number; y: number; l: number; h: number }

/** Les lignes de la grille : les indices de leurs cartes, de gauche à droite.
 *  Une carte commence une nouvelle ligne quand son haut est à plus d'une
 *  demi-hauteur de celui de la ligne en cours (les cartes d'une ligne de
 *  grille ont le même haut ; un arrondi d'un pixel n'en fait pas deux). */
export function lignesDe(cartes: readonly Rect[]): number[][] {
  const lignes: number[][] = []
  let haut = -Infinity, h = 0
  cartes.forEach((c, i) => {
    if (!lignes.length || Math.abs(c.y - haut) > Math.max(1, h / 2)) { lignes.push([i]); haut = c.y; h = c.h }
    else lignes[lignes.length - 1].push(i)
  })
  return lignes
}

/** La ligne sous le point (py), ou la plus proche : celle dont la bande
 *  verticale le contient, sinon celle dont la bande est la moins loin (entre
 *  deux lignes, au-dessus de la première, sous la dernière) */
function ligneSous(cartes: readonly Rect[], lignes: number[][], py: number): number[] {
  let meilleure = lignes[0], ecart = Infinity
  for (const l of lignes) {
    const haut = Math.min(...l.map(i => cartes[i].y)), bas = Math.max(...l.map(i => cartes[i].y + cartes[i].h))
    const d = py < haut ? haut - py : py > bas ? py - bas : 0
    if (d < ecart) { ecart = d; meilleure = l }
  }
  return meilleure
}

/** La place d'arrivée d'une page lâchée au point (px, py) : l'indice, dans
 *  l'ordre des pages, de la page AVANT laquelle elle va (cartes.length : à
 *  la fin). Dans la ligne sous le point (ou la plus proche), avant la
 *  première carte dont le milieu est à droite du point ; sinon après la
 *  dernière carte de la ligne. Sans carte : 0. */
export function placeDInsertion(cartes: readonly Rect[], px: number, py: number): number {
  if (!cartes.length) return 0
  const ligne = ligneSous(cartes, lignesDe(cartes), py)
  for (const i of ligne) if (cartes[i].x + cartes[i].l / 2 > px) return i
  return ligne[ligne.length - 1] + 1
}

/** Où dessiner la barre qui marque la place d'arrivée (place, rendue par
 *  placeDInsertion pour le même point) : un trait vertical dans l'espace
 *  entre deux cartes, de la hauteur de la ligne. À la fin d'une ligne (la
 *  place est la première carte de la ligne suivante, ou la fin), la barre
 *  suit la dernière carte de la ligne sous le point, pas la première de la
 *  suivante : elle est là où l'on lâche. x : le milieu de la barre. */
export function barreDInsertion(cartes: readonly Rect[], place: number, py: number, ecart = 16): { x: number; y: number; h: number } | null {
  if (!cartes.length) return null
  const ligne = ligneSous(cartes, lignesDe(cartes), py)
  const apres = place > 0 && (place >= cartes.length || !ligne.includes(place)) && ligne.includes(place - 1)
  const c = apres ? cartes[place - 1] : cartes[Math.min(place, cartes.length - 1)]
  const x = apres || place >= cartes.length ? c.x + c.l + ecart / 2 : c.x - ecart / 2
  return { x, y: c.y, h: c.h }
}

/** La bande, près du bord haut ou bas de la grille, où elle défile seule
 *  pendant qu'on tire une page (px) */
export const BORD_DEFILEMENT = 60
/** Le plus vite qu'elle défile, tout au bord (px par image) */
export const VITESSE_DEFILEMENT = 18

/** La vitesse du défilement automatique pour un pointeur à la hauteur py,
 *  la grille allant de haut à bas (coordonnées de la fenêtre) : 0 hors des
 *  60 px du bord ; puis de plus en plus vite en s'approchant du bord,
 *  jusqu'à 18 px par image au bord et au-delà ; négative vers le haut. */
export function vitesseDefilement(py: number, haut: number, bas: number): number {
  if (!(bas > haut)) return 0
  // Une grille plus basse que deux bandes : chaque bande en prend la moitié au plus
  const bande = Math.min(BORD_DEFILEMENT, (bas - haut) / 2)
  if (py < haut + bande) return -VITESSE_DEFILEMENT * Math.min(1, (haut + bande - py) / bande)
  if (py > bas - bande) return VITESSE_DEFILEMENT * Math.min(1, (py - (bas - bande)) / bande)
  return 0
}
