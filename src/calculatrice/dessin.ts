// =============================================================
// LE DESSIN D'UNE CALCULATRICE NUMWORKS
// Sur la page, une calculatrice est une image (voir ImageForme.calculatrice) :
// un boîtier simple, son nom en haut, et l'écran tel que la classe l'a vu en
// dernier. C'est ce dessin que montrent le replay des élèves, la revue, les
// vignettes, l'export en PDF et une séance passée. À l’écran, sur une page
// qu'on peut écrire, la vraie calculatrice se pose par-dessus (voir
// vivantes.ts), sous la bande du nom, qui reste celle du dessin.
//
// Le boîtier n'imite pas celui de NumWorks : un cadre, l'écran, et des
// touches esquissées. Seul l'écran est le vrai, copié de la calculatrice.
// =============================================================
import type { ModeleCalculatrice } from '../types'

/** La hauteur du dessin, en pixels de l'image */
export const HAUTEUR = 660
/** La bande du haut, avec le nom : elle sert de poignée sur la page */
export const BANDE = 44
/** La largeur du dessin : celle de la vraie calculatrice posée sous la bande
 *  (HAUTEUR − BANDE de haut), à ses proportions (celles des émulateurs de
 *  NumWorks : la graphique est plus élancée que la scientifique). Le cadre de
 *  la sélection et ses coins tombent ainsi sur la calculatrice. Celles posées
 *  avant (360 de large) gardent leur largeur : la vraie s'y centre. */
export const LARGEURS: Record<ModeleCalculatrice, number> = { lycee: 314, college: 356 }
/** L'ancienne largeur, la plus grande */
export const LARGEUR = 360
/** La copie de l'écran : celui de la NumWorks lycée fait 320 × 240 pixels */
export const ECRAN = { l: 320, h: 240 }

export function largeurDuModele(m: ModeleCalculatrice): number { return LARGEURS[m] }

/** L'écran dans un dessin de cette largeur, sous la bande, en 4:3 */
export function ecranDuDessin(largeur: number): { x: number; y: number; l: number; h: number } {
  const l = largeur - 40
  return { x: 20, y: BANDE + 16, l, h: l * 3 / 4 }
}

export function nomDuModele(m: ModeleCalculatrice): string {
  return m === 'lycee' ? 'NumWorks lycée' : 'NumWorks collège'
}

function arrondi(c: CanvasRenderingContext2D, x: number, y: number, l: number, h: number, r: number) {
  c.beginPath()
  c.moveTo(x + r, y)
  c.arcTo(x + l, y, x + l, y + h, r)
  c.arcTo(x + l, y + h, x, y + h, r)
  c.arcTo(x, y + h, x, y, r)
  c.arcTo(x, y, x + l, y, r)
  c.closePath()
}

/**
 * Peint la calculatrice dans c, de (0, 0) à (largeur, HAUTEUR) : le boîtier,
 * la bande du nom, l'écran (ecran : l'image copiée de la vraie calculatrice,
 * étirée à la taille de l'écran ; sans elle, l'écran d'accueil, son nom au
 * milieu) et les touches esquissées.
 */
export function dessinerCalculatrice(c: CanvasRenderingContext2D, modele: ModeleCalculatrice, ecran: CanvasImageSource | null,
  largeur = largeurDuModele(modele)) {
  const LARGEUR = largeur
  c.save()
  // Le boîtier et sa bande
  arrondi(c, 0.5, 0.5, LARGEUR - 1, HAUTEUR - 1, 14)
  c.fillStyle = '#eef1f5'; c.fill()
  c.strokeStyle = '#b8c4d6'; c.lineWidth = 1; c.stroke()
  c.save(); arrondi(c, 0.5, 0.5, LARGEUR - 1, HAUTEUR - 1, 14); c.clip()
  c.fillStyle = '#f6f8fb'; c.fillRect(0, 0, LARGEUR, BANDE)
  c.fillStyle = '#d4dce8'; c.fillRect(0, BANDE - 1, LARGEUR, 1)
  c.restore()
  c.fillStyle = '#1b2230'
  c.font = 'bold 17px "Atkinson Hyperlegible", system-ui, sans-serif'
  c.textBaseline = 'middle'; c.textAlign = 'left'
  c.fillText(nomDuModele(modele), 16, BANDE / 2 + 1)
  // L'écran, dans son cadre sombre
  const E = ecranDuDessin(largeur)
  c.fillStyle = '#2b3240'; arrondi(c, E.x - 6, E.y - 6, E.l + 12, E.h + 12, 6); c.fill()
  c.fillStyle = '#ffffff'; c.fillRect(E.x, E.y, E.l, E.h)
  if (ecran) {
    c.imageSmoothingEnabled = true
    c.drawImage(ecran, E.x, E.y, E.l, E.h)
  } else {
    c.fillStyle = '#c9d2de'; c.fillRect(E.x, E.y, E.l, 22)
    c.fillStyle = '#5a6577'; c.textAlign = 'center'
    c.font = '18px "Atkinson Hyperlegible", system-ui, sans-serif'
    c.fillText(nomDuModele(modele), E.x + E.l / 2, E.y + E.h / 2 + 8)
  }
  // Les touches, esquissées : les flèches et deux rangées de fonctions,
  // puis le pavé des chiffres
  const haut = E.y + E.h + 24
  c.fillStyle = '#c9d2de'
  arrondi(c, LARGEUR / 2 - 34, haut, 68, 68, 34); c.fill()
  for (let r = 0; r < 2; r++) for (let k = 0; k < 3; k++) {
    arrondi(c, 20 + k * 36, haut + 6 + r * 34, 28, 22, 6); c.fill()
    arrondi(c, LARGEUR - 48 - k * 36, haut + 6 + r * 34, 28, 22, 6); c.fill()
  }
  const pave = haut + 88, colonnes = 5, ecart = 8
  const lt = (LARGEUR - 40 - ecart * (colonnes - 1)) / colonnes
  const ht = (HAUTEUR - 20 - pave - ecart * 3) / 4
  for (let r = 0; r < 4; r++) for (let k = 0; k < colonnes; k++) {
    arrondi(c, 20 + k * (lt + ecart), pave + r * (ht + ecart), lt, ht, 7)
    c.fillStyle = '#ffffff'; c.fill()
    c.strokeStyle = '#c9d2de'; c.stroke()
  }
  c.restore()
}

/** Le dessin de la calculatrice en image PNG (une adresse data:), prête à
 *  ranger dans le classeur. ecran : comme pour dessinerCalculatrice. Aussi
 *  pour la conversion d'un ancien tableau, qui n'a pas gardé l'écran. */
export function imageDeCalculatrice(modele: ModeleCalculatrice, ecran: CanvasImageSource | null = null,
  largeur = largeurDuModele(modele)): string {
  const cv = Object.assign(document.createElement('canvas'), { width: largeur, height: HAUTEUR })
  dessinerCalculatrice(cv.getContext('2d')!, modele, ecran, largeur)
  return cv.toDataURL('image/png')
}

/** L'échelle d'une calculatrice qu'on pose : les trois quarts de la hauteur
 *  de la vue (hv, en monde), sans dépasser sa taille réelle à ce zoom (z) */
export function echelleDePose(hv: number, z: number): number {
  return Math.min(hv * 0.75 / HAUTEUR, 1.2 / z)
}

/** Une empreinte courte d'un texte (FNV-1a, 32 bits, en base 36) : deux
 *  écrans identiques ont la même, et l'image ne se range qu'une fois */
export function empreinte(t: string): string {
  let h = 0x811c9dc5
  for (let i = 0; i < t.length; i++) { h ^= t.charCodeAt(i); h = Math.imul(h, 0x01000193) }
  return (h >>> 0).toString(36) + t.length.toString(36)
}
