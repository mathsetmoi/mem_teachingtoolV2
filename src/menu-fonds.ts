// =============================================================
// LE MENU DES FONDS
// Le bouton du fond, dans la barre du haut, montre en petit le fond de la
// page, et ouvre ce menu : les huit fonds en vignettes (4 × 2, deux
// colonnes sur un écran étroit), chacune peinte par dessinerFond sous une
// caméra où son motif se lit, son nom dessous. Une liste de noms ne disait
// pas à quoi ressemble un « Réseau isométrique » (l'étude du marché, lot 5) ;
// les vignettes le montrent. C'est un petit menu de menus.ts (un seul ouvert
// à la fois, Échap, un appui ailleurs le ferme) ; ses entrées sont des
// menuitemradio, celle du fond de la page cochée. Les flèches s'y
// déplacent comme dans une grille : ← et → d'une vignette à sa voisine, ↑
// et ↓ d'une rangée à l'autre ; Début et Fin, la première et la dernière ;
// Entrée ou Espace choisit. Les vignettes se peignent une fois, à la
// première ouverture : rouvrir le menu ne fait que changer la coche.
// =============================================================
import { Camera } from './camera'
import { dessinerFond } from './fonds'
import type { Fond } from './types'
import { FONDS } from './types'
import { fermerMenu, naviguerDansLaGrille } from './menus'

/** Le zoom de chaque fond dans une vignette du menu (76 × 52 px) : celui
 *  où son motif se lit d'un coup d'œil (le millimétré de près, pour qu'on
 *  y voie les millimètres ; le repère de loin, pour ses axes) */
const ZOOM_MENU: Record<Fond, number> = {
  blanc: 1, carreaux: 1, 'grands-carreaux': 0.6, seyes: 0.8, millimetre: 2, pointe: 0.5, iso: 0.6, repere: 0.35,
}
/** Et dans la petite vignette du bouton (30 × 22 px), où il faut voir au
 *  moins deux lignes, ou quatre points, pour reconnaître le motif */
const ZOOM_BOUTON: Record<Fond, number> = {
  blanc: 1, carreaux: 0.7, 'grands-carreaux': 0.55, seyes: 0.5, millimetre: 2.5, pointe: 0.45, iso: 0.45, repere: 0.35,
}

/** La taille des vignettes du menu, et de celle du bouton */
export const VIGNETTE_MENU = { l: 76, h: 52 }
export const VIGNETTE_BOUTON = { l: 30, h: 22 }

/** La densité de pixels d'une vignette : celle de l'écran, au plus 2 (au-delà,
 *  rien ne se voit de plus sur un si petit dessin) */
export function densite(): number {
  return Math.min(2, Math.max(1, (typeof window !== 'undefined' && window.devicePixelRatio) || 1))
}

/** Le nom d'un fond, tel que le disent les menus (un fond inconnu : son identifiant) */
export function nomDuFond(fond: Fond): string {
  return FONDS.find(f => f.id === fond)?.nom ?? String(fond)
}

/** Peint le fond sur le canevas c, de l × h px CSS à la densité dpr : la
 *  caméra est celle de sa vignette, l'origine du monde (où tous les fonds
 *  sont calés) un peu en retrait du coin, pour qu'une ligne des centimètres
 *  passe près du bord ; le Seyès y montre sa marge, le repère son origine
 *  au centre. Un fond inconnu y est blanc, comme partout. nuit : de nuit
 *  (le bouton du fond, sur une page de nuit). */
export function peindreVignette(c: HTMLCanvasElement, fond: Fond, l: number, h: number, dpr: number, nuit = false) {
  const W = Math.round(l * dpr), H = Math.round(h * dpr)
  if (c.width !== W) c.width = W
  if (c.height !== H) c.height = H
  c.style.width = l + 'px'; c.style.height = h + 'px'
  const ctx = c.getContext('2d')
  if (!ctx) return
  const petite = l < 60
  const cam = new Camera()
  cam.z = (petite ? ZOOM_BOUTON : ZOOM_MENU)[fond] ?? 1
  if (fond === 'repere') { cam.x = Math.round(l / 2); cam.y = Math.round(h / 2) }
  else if (fond === 'seyes') { cam.x = petite ? 6 : 14; cam.y = 3 }
  else { cam.x = petite ? 3 : 6; cam.y = petite ? 3 : 6 }
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0)
  ctx.clearRect(0, 0, l, h)
  dessinerFond(ctx, fond, cam, l, h, { x: 0, y: 0 }, { nuit })
}

/** Une vignette du fond : un canevas de l × h px CSS (à la densité dpr) */
export function vignetteDuFond(fond: Fond, l: number, h: number, dpr: number): HTMLCanvasElement {
  const c = document.createElement('canvas')
  c.setAttribute('aria-hidden', 'true')
  peindreVignette(c, fond, l, h, dpr)
  return c
}

/**
 * Le menu des fonds dans m (l'élément d'un petit menu, role=menu) : à la
 * première fois, la grille des huit vignettes ; ensuite, seulement la coche
 * sur `actuel`. choisir(fond) est appelé au choix, le menu fermé.
 */
export function construireMenuFonds(m: HTMLElement, actuel: Fond, choisir: (f: Fond) => void) {
  let grille = m.querySelector<HTMLElement>(':scope > .grille-fonds')
  if (!grille) {
    grille = document.createElement('div')
    grille.className = 'grille-fonds'
    const dpr = densite()
    for (const f of FONDS) {
      const b = document.createElement('button')
      b.type = 'button'; b.className = 'menu-item fond-choix'
      b.setAttribute('role', 'menuitemradio')
      b.dataset.fond = f.id
      // Le nom, dont la précision entre parenthèses (« (1 cm) ») ne se coupe pas
      const nom = Object.assign(document.createElement('span'), { className: 'nom' })
      const i = f.nom.indexOf(' (')
      if (i < 0) nom.textContent = f.nom
      else nom.append(f.nom.slice(0, i + 1), Object.assign(document.createElement('span'), { className: 'insecable', textContent: f.nom.slice(i + 1) }))
      b.append(vignetteDuFond(f.id, VIGNETTE_MENU.l, VIGNETTE_MENU.h, dpr), nom)
      b.addEventListener('click', () => {
        fermerMenu()
        choisir(f.id)
      })
      grille.appendChild(b)
    }
    grille.addEventListener('keydown', e => naviguerDansLaGrille(grille!, e, '.fond-choix'))
    m.appendChild(grille)
  }
  for (const b of grille.querySelectorAll<HTMLButtonElement>('.fond-choix')) b.setAttribute('aria-checked', String(b.dataset.fond === actuel))
}

/** L'entrée cochée du menu des fonds dans m (ou la première) */
export function entreeCochee(m: HTMLElement): HTMLButtonElement | null {
  return m.querySelector<HTMLButtonElement>('.fond-choix[aria-checked="true"]') ?? m.querySelector<HTMLButtonElement>('.fond-choix')
}
