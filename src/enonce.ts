// =============================================================
// LA VIGNETTE DE L'ÉNONCÉ
// En classe, l'énoncé (une image posée en haut de la page) reste à sa
// place, et la correction descend en dessous. Quand elle est longue, on
// fait défiler le tableau et l'énoncé sort de l'écran par le haut : une
// vignette de l'énoncé paraît alors en haut à droite de ce qu'on voit du
// tableau, pour le relire sans remonter. Un clic (souris, stylet, doigt)
// l'agrandit le temps de le lire, un autre la réduit ; la croix la cache
// jusqu'à ce que l'énoncé revienne à l'écran.
// Ce n'est que de l'affichage : rien n'est écrit dans le document (ni le
// classeur, ni le PDF, ni le replay n'en savent rien) et l'image reste là
// où on l'a posée. La vignette montre la zone de l'image avec ce qui y est
// écrit par-dessus (un mot souligné, une figure complétée), peinte par le
// même code que les vignettes de la trieuse (Apercus).
// =============================================================
import type { App } from './app'
import type { Forme } from './types'
import type { Boite } from './revoir/bobine'
import { boiteDe } from './revoir/bobine'
import type { Apercus } from './sorties/apercu'
import { tableauCache } from './navigateur'
import { icone } from './icones'

/** L'énoncé n'est plus lisible quand il en reste moins que cette part à l'écran */
export const PART_CACHEE = 0.25
/** Une image qui se voit au moins pour cette part est à l'écran : c'est
 *  elle qu'on lit (l'exercice suivant), pas de vignette */
export const PART_VUE = 0.5

/**
 * L'énoncé à montrer en vignette (son identifiant, null : aucun), pour ce
 * qu'on voit du tableau v (monde). Parmi les images qui sont au-dessus de
 * la vue, dans sa largeur, et dont il reste à l'écran moins du quart de la
 * hauteur : la plus proche (celle dont le bas est le plus bas), c'est-à-dire
 * l'exercice que l'on corrige quand la page en a plusieurs. Aucune
 * vignette quand une image de la largeur de la vue s'y voit au moins à
 * moitié : on est arrivé à l'exercice suivant.
 */
export function enonceHorsVue(images: Iterable<{ id: string; b: Boite }>, v: Boite): string | null {
  let choix: string | null = null, bas = -Infinity
  for (const { id, b } of images) {
    if (b.l <= 0 || b.h <= 0) continue
    const large = Math.min(b.x + b.l, v.x + v.l) - Math.max(b.x, v.x)
    if (large <= 0) continue
    const vu = Math.max(0, Math.min(b.y + b.h, v.y + v.h) - Math.max(b.y, v.y)) / b.h
    if (vu >= PART_VUE) return null
    if (b.y < v.y && vu <= PART_CACHEE && b.y + b.h > bas) { choix = id; bas = b.y + b.h }
  }
  return choix
}

/** La taille de la vignette (px CSS) pour une image de l × h, dans une zone
 *  libre de zl × zh : petite, au plus 260 × 180 et 30 % de la zone ;
 *  agrandie, au plus 60 % de sa largeur et 70 % de sa hauteur */
export function tailleVignette(l: number, h: number, zl: number, zh: number, grande: boolean): { l: number; h: number } {
  const maxL = grande ? zl * 0.6 : Math.min(260, zl * 0.3)
  const maxH = grande ? zh * 0.7 : Math.min(180, zh * 0.3)
  const k = Math.min(maxL / l, maxH / h)
  return { l: Math.max(1, Math.round(l * k)), h: Math.max(1, Math.round(h * k)) }
}

export class VignetteEnonce {
  readonly el: HTMLElement
  private canevas: HTMLCanvasElement
  private grande = false
  /** L'énoncé dont on a fermé la vignette : elle ne revient pas tant qu'il
   *  reste hors de l'écran */
  private fermee: string | null = null
  /** Ce que montre le canevas (la page, l'image, la taille, les formes) :
   *  on ne repeint que si cela change */
  private peinte = ''
  private jeton = 0

  constructor(private app: App, private apercus: Apercus, private zoneLibre: () => { x: number; y: number; l: number; h: number }) {
    const el = this.el = document.createElement('div')
    el.className = 'vignette-enonce'; el.hidden = true
    el.setAttribute('role', 'button'); el.tabIndex = 0
    this.canevas = document.createElement('canvas')
    const fermer = document.createElement('button')
    fermer.type = 'button'; fermer.className = 'vignette-enonce-fermer'
    fermer.title = 'Cacher l\'énoncé'; fermer.setAttribute('aria-label', 'Cacher l\'énoncé')
    fermer.innerHTML = icone('fermer')
    el.append(this.canevas, fermer)
    fermer.addEventListener('click', e => {
      e.stopPropagation()
      this.fermee = this.el.dataset.id ?? null
      this.grande = false
      this.maj()
    })
    const basculer = () => { this.grande = !this.grande; this.maj() }
    el.addEventListener('click', basculer)
    el.addEventListener('keydown', e => {
      if (e.target !== el || (e.key !== 'Enter' && e.key !== ' ')) return
      e.preventDefault(); basculer()
    })
    // Ni le menu du clic droit (le bouton du stylet), ni le tableau dessous
    el.addEventListener('contextmenu', e => e.preventDefault())
  }

  /** À chaque changement de vue ou de page (UI.maj) : paraît, se place, se
   *  repeint, ou se cache */
  maj() {
    const app = this.app, el = this.el
    const cacher = () => {
      if (!el.hidden) { el.hidden = true; this.grande = false }
      delete el.dataset.id
    }
    if (!app.page || tableauCache(app) || app.rendu.l <= 0) return cacher()
    const formes = app.tableau.formesDe(app.page)
    if (!formes?.size) { this.fermee = null; return cacher() }
    const zl = this.zoneLibre(), cam = app.cam
    const a = cam.versMonde(zl.x, zl.y)
    const v = { x: a.x, y: a.y, l: zl.l / cam.z, h: zl.h / cam.z }
    const images: { id: string; b: Boite }[] = []
    for (const f of formes.values()) {
      if (f.type !== 'image') continue
      const b = boiteDe(f)
      if (b) images.push({ id: f.id, b })
    }
    const id = enonceHorsVue(images, v)
    // L'énoncé fermé revient à l'écran (ou un autre le remplace) : sa
    // vignette pourra reparaître
    if (this.fermee !== null && this.fermee !== id) this.fermee = null
    if (id === null || id === this.fermee) return cacher()
    const choisi = images.find(i => i.id === id)!
    const t = tailleVignette(choisi.b.l, choisi.b.h, zl.l, zl.h, this.grande)
    if (el.dataset.id !== id) this.grande = false
    el.dataset.id = id
    el.classList.toggle('grande', this.grande)
    el.title = this.grande ? 'Réduire l\'énoncé' : 'Agrandir l\'énoncé'
    el.setAttribute('aria-label', el.title)
    el.hidden = false
    // En haut à droite de ce qu'on voit du tableau, sous la barre du haut
    const z = app.rendu.scene.getBoundingClientRect()
    el.style.left = (z.left + zl.x + zl.l - t.l - 12) + 'px'
    el.style.top = (z.top + zl.y + 12) + 'px'
    this.canevas.style.width = t.l + 'px'; this.canevas.style.height = t.h + 'px'
    const cle = `${app.page}|${id}|${t.l}x${t.h}|${formes.size}|${choisi.b.x},${choisi.b.y},${choisi.b.l},${choisi.b.h}`
    if (cle !== this.peinte) { this.peinte = cle; void this.peindre(choisi.b, t, [...formes.values()]) }
  }

  /** Peint la zone de l'énoncé (et ce qui est écrit dessus) dans le canevas */
  private async peindre(b: Boite, t: { l: number; h: number }, toutes: Forme[]) {
    const jeton = ++this.jeton
    const app = this.app, dpr = window.devicePixelRatio || 1
    const z = t.l / b.l
    const cam = { x: -b.x * z, y: -b.y * z, z }
    // Seulement ce qui touche la zone de l'image
    const formes = toutes.filter(f => {
      const c = f.type === 'formule' ? { x: f.x, y: f.y, l: 1, h: 1 } : boiteDe(f)
      return !c || (c.x < b.x + b.l && c.x + c.l > b.x && c.y < b.y + b.h && c.y + c.h > b.y)
    })
    const page = { fond: app.fond, origine: app.tableau.origineDe(app.page), formes }
    try { await this.apercus.preparer(formes, z * dpr) } catch { /* on peint ce qui est prêt */ }
    if (jeton !== this.jeton) return
    const cv = this.canevas
    cv.width = Math.round(t.l * dpr); cv.height = Math.round(t.h * dpr)
    const c = cv.getContext('2d')
    if (!c) return
    this.apercus.peindre(c, page, cam, { l: t.l, h: t.h, dpr, fond: true, formes })
  }
}
