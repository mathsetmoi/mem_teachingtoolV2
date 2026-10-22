// =============================================================
// LES CALCULATRICES VIVANTES, À L’ÉCRAN
// Sur une page qu'on peut écrire, chaque calculatrice (une image marquée,
// voir dessin.ts) reçoit par-dessus la vraie calculatrice : l'émulateur de
// NumWorks installé sur cet ordinateur (emulateurs.ts), dans un cadre
// (<iframe srcdoc>) posé exactement sur l'image, sous sa bande du nom. Il
// suit la vue, le déplacement et le changement de taille en cours, comme les
// formules (Rendu.placerFormules) : sa couche est au-dessus de la scène,
// sous les instruments et la couche « direct » (le cadre de la sélection
// reste visible). La bande, elle, laisse passer l'appui : elle se prend
// comme l'image (voir App.bas), seuls ↺ et × sont des boutons.
//
// L'ÉCRAN DANS LE REPLAY. Après chaque appui dans la calculatrice (une
// touche, au stylet, à la souris, au doigt ou au clavier), on copie son
// écran, un peu plus tard et encore ensuite (un calcul, un graphe qui se
// trace). S'il a changé, l'image de la calculatrice est refaite avec lui et
// remplace l'ancienne (Tableau.ecranDeCalculatrice) : une étape du film, que
// le replay et la revue montrent à son heure ; jamais une étape
// d'annulation. Sans appui, rien ne s'écrit : ouvrir le classeur le
// lendemain ne fait pas une séance. Une seule exception : une calculatrice
// qu'on vient de poser note son écran d'accueil, dès qu'il paraît.
//
// Pour pouvoir copier l'écran, le cadre a la même origine que l'outil
// (srcdoc), et une ligne ajoutée en tête de la page de l'émulateur demande
// aux canevas WebGL de garder leur image (preserveDrawingBuffer) : sinon la
// copie serait noire. Une autre y range la calculatrice seule, à la taille
// du cadre.
// =============================================================
import type { Camera } from '../camera'
import type { Matrice } from '../cadre'
import type { Forme, ImageForme, ModeleCalculatrice } from '../types'
import { BANDE, ECRAN, HAUTEUR, LARGEUR, dessinerCalculatrice, empreinte, nomDuModele } from './dessin'
import { lireEmulateur } from './emulateurs'

export type Calculatrice = ImageForme & { calculatrice: ModeleCalculatrice }

export function estCalculatrice(f: Forme): f is Calculatrice {
  return f.type === 'image' && (f.calculatrice === 'lycee' || f.calculatrice === 'college')
}

/** Ce que les calculatrices demandent au tableau */
export interface HoteCalculatrices {
  cam: Camera
  /** La page qu'on regarde, et ses formes */
  page(): string
  formes(): readonly Forme[]
  /** Peut-on y taper (une page qu'on écrit, ni la revue, ni une séance passée) ? */
  vivante(): boolean
  /** Le déplacement et la transformation en cours de cette forme, s'il y en a */
  decalage(f: Forme): { dx: number; dy: number } | null
  transfo(f: Forme): Matrice | null
  /** Range une image (src choisi, une fois) et pose le nouvel écran */
  ranger(src: string, donnees: string): void
  ecran(page: string, id: string, src: string): void
  /** × : la calculatrice quitte la page (Ctrl+Z la rend) */
  retirer(id: string): void
  /** La fenêtre d'installation */
  installer(modele: ModeleCalculatrice): void
}

/** Après un appui, on regarde l'écran à ces moments (ms) */
const REGARDS = [180, 800, 2500]
/** Combien de calculatrices restent vivantes, cachées, sur les autres pages */
const GARDEES = 4

/** La ligne ajoutée en tête de la page de l'émulateur (voir plus haut) */
const GARDER_IMAGE = '<script>(function(){var g=HTMLCanvasElement.prototype.getContext;'
  + 'HTMLCanvasElement.prototype.getContext=function(t,o){if(/webgl/.test(String(t)))'
  + 'o=Object.assign({},o||{},{preserveDrawingBuffer:true});return g.call(this,t,o)}})()</script>'

/** Et ce qui range la page de l'émulateur dans le cadre : la calculatrice
 *  seule, aussi grande que le cadre le permet, sans le fond gris de la page
 *  ni ses boutons du dessous (plein écran, photo, partage) */
const DANS_LE_CADRE = '<style>html,body{background:transparent!important;margin:0!important;overflow:hidden!important}'
  + '.actions,#errors,.col-fullscreen{display:none!important}'
  + '.col-calculator{width:100%!important;float:none!important}'
  + '.calculator-container{margin:4px 0 0!important}'
  + '.calculator-container img{max-height:calc(100vh - 8px)!important;max-width:100%!important}</style>'

/** La page de l'émulateur, avec ces lignes en tête */
export function pagePourLeCadre(html: string): string {
  const tete = /<head[^>]*>/i.exec(html)
  const ajout = GARDER_IMAGE + DANS_LE_CADRE
  if (tete) return html.slice(0, tete.index + tete[0].length) + ajout + html.slice(tete.index + tete[0].length)
  const doctype = /^\s*<!doctype[^>]*>/i.exec(html)
  if (doctype) return doctype[0] + ajout + html.slice(doctype[0].length)
  return ajout + html
}

/** La transformation CSS qui pose l'élément (en pixels de l'image) sur la
 *  forme, en monde : sa matrice, son coin, le déplacement en cours, et la
 *  transformation en cours composée par-dessus */
export function matriceCss(f: ImageForme, dec: { dx: number; dy: number } | null, t: Matrice | null): string {
  const [a, b, c, d] = f.m
  const x = f.x + (dec?.dx ?? 0), y = f.y + (dec?.dy ?? 0)
  if (!t) return `matrix(${a}, ${b}, ${c}, ${d}, ${x}, ${y})`
  const [A, B, C, D, E, F] = t
  return `matrix(${A * a + C * b}, ${B * a + D * b}, ${A * c + C * d}, ${B * c + D * d}, ${A * x + C * y + E}, ${B * x + D * y + F})`
}

interface Vivante {
  id: string
  modele: ModeleCalculatrice
  el: HTMLDivElement
  cadre: HTMLIFrameElement | null
  page: string
  /** La dernière copie de l'écran (son adresse), pour ne rien écrire deux fois */
  dernier: string
  regards: number[]
  vue: number
  transform: string
}

export class Calculatrices {
  readonly couche: HTMLDivElement
  private vivantes = new Map<string, Vivante>()
  /** Les calculatrices posées pendant cette session : elles notent leur écran d'accueil */
  private nouvelles = new Set<string>()
  private vues = 0

  constructor(conteneur: HTMLElement, avant: Element | null, private hote: HoteCalculatrices) {
    this.couche = document.createElement('div')
    this.couche.className = 'couche-calculatrices'
    conteneur.insertBefore(this.couche, avant)
    // Un appui sur le tableau rend le clavier au tableau : les raccourcis
    // (Ctrl+Z, P, E…) ne partent plus dans la calculatrice
    conteneur.addEventListener('pointerdown', () => {
      const a = document.activeElement
      if (a instanceof HTMLIFrameElement && this.couche.contains(a)) a.blur()
    }, true)
  }

  /** Une calculatrice qu'on vient de poser : son écran d'accueil sera noté */
  posee(id: string) { this.nouvelles.add(id) }

  /** Pose les calculatrices de la page sur leurs images, après chaque
   *  peinture de la scène */
  placer() {
    const cam = this.hote.cam
    this.couche.style.transform = `translate(${cam.x}px, ${cam.y}px) scale(${cam.z})`
    const vu = ++this.vues
    const page = this.hote.page()
    if (this.hote.vivante()) {
      for (const f of this.hote.formes()) {
        if (!estCalculatrice(f)) continue
        let v = this.vivantes.get(f.id)
        if (v && (v.modele !== f.calculatrice || v.page !== page)) { this.oublier(v); v = undefined }
        if (!v) v = this.creer(f, page)
        v.vue = vu
        v.el.style.visibility = ''
        const tr = matriceCss(f, this.hote.decalage(f), this.hote.transfo(f))
        if (tr !== v.transform) { v.el.style.transform = tr; v.transform = tr }
        v.el.style.width = f.l + 'px'; v.el.style.height = f.h + 'px'
      }
    }
    // Celles qui ne sont pas à l'écran se cachent, sans s'éteindre : on
    // retrouve son calcul en revenant sur la page. Au-delà de quelques-unes,
    // les plus anciennes s'éteignent.
    const cachees = [...this.vivantes.values()].filter(v => v.vue !== vu)
    for (const v of cachees) v.el.style.visibility = 'hidden'
    cachees.sort((a, b) => b.vue - a.vue).slice(GARDEES).forEach(v => this.oublier(v))
  }

  /** Les émulateurs ont changé (une installation) : tout se refait */
  rafraichir() {
    for (const v of [...this.vivantes.values()]) this.oublier(v)
    this.placer()
  }

  private oublier(v: Vivante) {
    for (const r of v.regards) clearTimeout(r)
    v.el.remove()
    this.vivantes.delete(v.id)
  }

  private creer(f: Calculatrice, page: string): Vivante {
    const el = document.createElement('div')
    el.className = 'calculatrice-vivante'
    el.style.width = LARGEUR + 'px'; el.style.height = HAUTEUR + 'px'
    const bande = document.createElement('div')
    bande.className = 'calculatrice-bande'
    bande.style.height = BANDE + 'px'
    const nom = nomDuModele(f.calculatrice)
    const zero = Object.assign(document.createElement('button'), { type: 'button', className: 'calculatrice-bouton', textContent: '↺', title: `Remettre la ${nom} à zéro` })
    const croix = Object.assign(document.createElement('button'), { type: 'button', className: 'calculatrice-bouton', textContent: '×', title: `Ranger la ${nom} (Ctrl+Z la rend)` })
    zero.setAttribute('aria-label', zero.title); croix.setAttribute('aria-label', croix.title)
    bande.append(zero, croix)
    const corps = document.createElement('div')
    corps.className = 'calculatrice-corps'
    corps.style.top = BANDE + 'px'
    el.append(bande, corps)
    this.couche.appendChild(el)
    const v: Vivante = { id: f.id, modele: f.calculatrice, el, cadre: null, page, dernier: '', regards: [], vue: 0, transform: '' }
    this.vivantes.set(f.id, v)
    // Les boutons ne laissent pas l'appui au tableau (il prendrait l'image)
    for (const b of [zero, croix]) b.addEventListener('pointerdown', e => e.stopPropagation())
    croix.addEventListener('click', () => this.hote.retirer(f.id))
    zero.addEventListener('click', () => { if (v.cadre) { this.charger(v, corps, true) } })
    void this.charger(v, corps, this.nouvelles.has(f.id))
    return v
  }

  /** Met l'émulateur dans le corps (ou, s'il n'est pas installé, de quoi l'installer) */
  private async charger(v: Vivante, corps: HTMLElement, noterAccueil: boolean) {
    const emu = await lireEmulateur(v.modele)
    if (this.vivantes.get(v.id) !== v) return
    corps.textContent = ''
    for (const r of v.regards) clearTimeout(r)
    v.regards = []
    if (!emu) {
      v.cadre = null
      const p = document.createElement('div')
      p.className = 'calculatrice-absente'
      p.innerHTML = '<p></p><button type="button" class="principal">Installer…</button>'
      p.querySelector('p')!.textContent = `La calculatrice ${nomDuModele(v.modele)} n'est pas encore installée sur cet ordinateur.`
      p.querySelector('button')!.addEventListener('click', () => this.hote.installer(v.modele))
      p.addEventListener('pointerdown', e => e.stopPropagation())
      corps.appendChild(p)
      return
    }
    const cadre = document.createElement('iframe')
    cadre.className = 'calculatrice-cadre'
    cadre.title = `Calculatrice ${nomDuModele(v.modele)}`
    cadre.addEventListener('load', () => {
      const doc = cadre.contentDocument
      if (!doc) return
      const appui = () => this.regarderBientot(v)
      doc.addEventListener('pointerup', appui, true)
      doc.addEventListener('keyup', appui, true)
      doc.addEventListener('touchend', appui, true)
      if (noterAccueil) { this.nouvelles.delete(v.id); this.regarderBientot(v, [1200, 3000]) }
    })
    cadre.srcdoc = pagePourLeCadre(emu.html)
    v.cadre = cadre
    corps.appendChild(cadre)
  }

  private regarderBientot(v: Vivante, quand = REGARDS) {
    for (const r of v.regards) clearTimeout(r)
    v.regards = quand.map(ms => window.setTimeout(() => this.regarder(v), ms))
  }

  /** Copie l'écran ; s'il a changé, l'image de la calculatrice est refaite */
  private regarder(v: Vivante) {
    if (this.vivantes.get(v.id) !== v || !v.cadre || !this.hote.vivante() || this.hote.page() !== v.page) return
    const copie = copierEcran(v.cadre)
    if (!copie) return
    const ecran = copie.toDataURL('image/png')
    if (ecran === v.dernier) return
    v.dernier = ecran
    const cv = Object.assign(document.createElement('canvas'), { width: LARGEUR, height: HAUTEUR })
    dessinerCalculatrice(cv.getContext('2d')!, v.modele, copie)
    const src = `calc-${v.modele}-${empreinte(ecran)}`
    this.hote.ranger(src, cv.toDataURL('image/png'))
    this.hote.ecran(v.page, v.id, src)
  }
}

/** L'écran de l'émulateur, copié à la taille de l'écran du dessin : son plus
 *  grand canevas (l'écran, en 4:3 ; un canevas d'une autre forme y tient
 *  tout entier, centré, sur la couleur de son coin). null : rien à copier (pas encore de canevas, un
 *  canevas vide, un cadre qu'on ne peut pas lire). */
export function copierEcran(cadre: HTMLIFrameElement): HTMLCanvasElement | null {
  let doc: Document | null = null
  try { doc = cadre.contentDocument } catch { return null }
  if (!doc) return null
  let source: HTMLCanvasElement | null = null
  for (const c of doc.querySelectorAll('canvas')) {
    if (c.width * c.height > (source ? source.width * source.height : 0)) source = c
  }
  if (!source || !source.width || !source.height) return null
  const copie = Object.assign(document.createElement('canvas'), { width: ECRAN.l, height: ECRAN.h })
  const c = copie.getContext('2d')!
  const k = Math.min(ECRAN.l / source.width, ECRAN.h / source.height)
  const l = source.width * k, h = source.height * k
  try {
    // Un canevas tout transparent (rien encore de peint) ne compte pas
    const s = Object.assign(document.createElement('canvas'), { width: 32, height: 24 })
    const cs = s.getContext('2d', { willReadFrequently: true })!
    cs.drawImage(source, 0, 0, 32, 24)
    const d = cs.getImageData(0, 0, 32, 24).data
    let peint = false
    for (let i = 3; i < d.length; i += 4) if (d[i]) { peint = true; break }
    if (!peint) return null
    // Un écran plus allongé (la calculatrice collège) : autour, la couleur
    // de son coin, pour qu'il paraisse remplir l'écran du dessin
    const coin = cs.getImageData(0, 0, 1, 1).data
    c.fillStyle = `rgb(${coin[0]}, ${coin[1]}, ${coin[2]})`
    c.fillRect(0, 0, ECRAN.l, ECRAN.h)
    c.drawImage(source, (ECRAN.l - l) / 2, (ECRAN.h - h) / 2, l, h)
  } catch { return null }
  return copie
}
