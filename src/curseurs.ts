// =============================================================
// LES CURSEURS DES OUTILS
// Au-dessus du tableau, le curseur prend l'icône de l'outil en main (celle
// de son bouton, voir icones.ts) : on voit d'un coup d'œil, à la souris
// comme au survol de la tablette graphique, quel outil est choisi. Le point
// actif est là où l'outil agit : la pointe du stylo, le biseau du
// surligneur, le centre de la croix du Point. Pour les outils qui visent
// (segment, formes, formule), une petite croix fait le point actif et
// l'icône de l'outil l'accompagne en bas à droite.
// Chaque curseur est un dessin SVG en data: (aucun fichier à part, la
// version hors ligne les a donc aussi), tracé en encre sur un liseré
// blanc pour se voir sur tous les fonds. Restent les curseurs du système :
// la Sélection (la croix, puis « move » ou « pointer » au survol, voir
// App), la Main (« grab ») et la Gomme, qui dessine son cercle elle-même.
// Au doigt (iPad, téléphone), il n'y a pas de curseur : rien ne change.
// =============================================================

import { ICONES } from './icones'

const ENCRE = '#1b2230'
const TAILLE = 32

/** Un tracé d'icône (grille 24 × 24), placé en (x, y) à l'échelle k, avec
 *  son liseré blanc dessous : les épaisseurs restent celles de l'écran. */
function trace(d: string, x: number, y: number, k: number): string {
  const g = (couleur: string, ep: number) =>
    `<path d="${d}" stroke="${couleur}" stroke-width="${ep / k}"/>`
  return `<g transform="translate(${x} ${y}) scale(${k})" fill="none" stroke-linecap="round" stroke-linejoin="round">${g('#fff', 4.6)}${g(ENCRE, 1.9)}</g>`
}

/** La valeur CSS d'un curseur : le dessin, son point actif, et la croix du
 *  système si le navigateur ne sait pas l'afficher. */
function curseur(dessin: string, x: number, y: number): string {
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${TAILLE}" height="${TAILLE}" viewBox="0 0 ${TAILLE} ${TAILLE}">${dessin}</svg>`
  return `url("data:image/svg+xml,${encodeURIComponent(svg)}") ${x} ${y}, crosshair`
}

/** L'icône seule, en grand, le point (px, py) de sa grille faisant le
 *  point actif. */
function icone(nom: string, px: number, py: number): string {
  const k = 1.25
  return curseur(trace(ICONES[nom], 1, 1, k), Math.round(1 + px * k), Math.round(1 + py * k))
}

/** Une petite croix en haut à gauche (le point actif), l'icône de l'outil
 *  en petit en bas à droite. */
function visee(nom: string): string {
  const c = 8
  const croix = `M${c} 2V${c - 2.5}M${c} ${c + 2.5}V${2 * c - 2}M2 ${c}H${c - 2.5}M${c + 2.5} ${c}H${2 * c - 2}`
  return curseur(trace(croix, 0, 0, 1) + trace(ICONES[nom], 14, 14, 0.75), c, c)
}

/** Les règles de la feuille de style : par outil, et pour le segment et les
 *  formes par sorte (voir App.choisirOutil, qui les écrit sur la zone). */
export function reglesCurseurs(): string {
  const regles: [string, string][] = [
    ["[data-outil='stylo']", icone('stylo', 4, 20)],
    ["[data-outil='surligneur']", icone('surligneur', 6, 18)],
    ["[data-outil='point']", icone('point', 10.5, 10.5)],
    ["[data-outil='formule']", visee('formule')],
    ["[data-outil='segment']", visee('trait-segment')],
    ["[data-outil='segment'][data-trait='droite']", visee('trait-droite')],
    ["[data-outil='segment'][data-trait='demi']", visee('trait-demi')],
    ["[data-outil='forme']", visee('rectangle')],
    ["[data-outil='forme'][data-forme='cercle']", visee('cercle')],
    ["[data-outil='forme'][data-forme='polygone']", visee('polygone')],
  ]
  return regles.map(([qui, valeur]) => `#zone${qui} { cursor: ${valeur}; }`).join('\n')
}

/** Ajoute ces règles à la page, une fois, au lancement. */
export function installerCurseurs() {
  if (document.getElementById('curseurs-outils')) return
  const style = Object.assign(document.createElement('style'), { id: 'curseurs-outils', textContent: reglesCurseurs() })
  document.head.append(style)
}
