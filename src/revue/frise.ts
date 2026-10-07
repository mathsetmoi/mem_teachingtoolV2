// =============================================================
// LA FRISE
// Une bande horizontale découpée en parties titrées, chacune aussi
// large que son nombre d'images. Un remplissage et une tête ronde
// disent où l'on en est. Au doigt, au stylet ou à la souris : glisser
// montre l'image visée (une seule demande par image d'écran, pour ne
// lire qu'un instantané à la fois), et le lâcher la donne pour de bon ;
// toucher une partie mène à son début.
// Tout se place sur une seule règle : l'image k est à k / (n − 1) de la
// largeur, et chaque case s'étend à mi-chemin de ses voisines. La tête,
// le remplissage, le doigt et les cases disent donc toujours la même
// chose, même pour trente séances d'une page tenue depuis des semaines,
// où une case ne fait plus qu'un trait : elle perd alors son titre (et
// son filet, si elle devient plus fine encore), jamais sa place.
// La frise n'écoute pas le clavier : les flèches y font ce qu'elles font
// partout ailleurs dans la revue.
// =============================================================
import type { Partie } from './bande'

/** Au-delà de ce déplacement (px), un appui devient un glissé */
const GLISSE = 6
/** Une case plus étroite que ceci (px) tait son titre, plus étroite que cela, son filet */
const TITRE_MIN = 48, FILET_MIN = 6

export class Frise {
  readonly el: HTMLDivElement
  /** Le fond où vivent les cases et le remplissage, coupé aux bords de la frise */
  private fond: HTMLDivElement
  private rempli: HTMLDivElement
  private tete: HTMLDivElement
  private cases: HTMLDivElement[] = []
  /** La largeur de chaque case, en part de la frise */
  private largeurs: number[] = []
  private parties: Partie[] = []
  private n = 1
  private appui: { id: number; x0: number; glisse: boolean } | null = null
  private demande = -1
  private image = 0

  constructor(private surChoix: (k: number, glisse: boolean) => void) {
    const el = this.el = document.createElement('div')
    el.className = 'revue-frise'
    el.setAttribute('role', 'slider')
    el.tabIndex = 0
    el.setAttribute('aria-label', 'Avancée dans la revue')
    el.setAttribute('aria-orientation', 'horizontal')
    this.fond = document.createElement('div'); this.fond.className = 'revue-cases'
    this.rempli = document.createElement('div'); this.rempli.className = 'revue-rempli'
    this.tete = document.createElement('div'); this.tete.className = 'revue-tete'
    this.fond.append(this.rempli)
    el.append(this.fond, this.tete)
    // Quand la frise change de largeur, les cases gardent leur place ; leurs titres paraissent ou se taisent
    new ResizeObserver(() => this.mesurer()).observe(el)

    el.addEventListener('pointerdown', e => {
      if (e.button > 0) return
      try { el.setPointerCapture(e.pointerId) } catch { /* pointeur déjà parti : on suit quand même */ }
      this.appui = { id: e.pointerId, x0: e.clientX, glisse: false }
    })
    el.addEventListener('pointermove', e => {
      const a = this.appui
      if (!a || a.id !== e.pointerId) return
      if (!a.glisse && Math.abs(e.clientX - a.x0) <= GLISSE) return
      a.glisse = true
      this.demander(this.indiceSous(e.clientX))
    })
    const lacher = (e: PointerEvent, annule: boolean) => {
      const a = this.appui
      if (!a || a.id !== e.pointerId) return
      this.appui = null
      if (a.glisse) {
        // Lâcher (ou perdre le pointeur) : la dernière position compte, et le glissé est fini
        cancelAnimationFrame(this.image); this.image = 0; this.demande = -1
        this.surChoix(this.indiceSous(e.clientX), false)
        return
      }
      if (annule) return
      const k = this.indiceSous(e.clientX)
      const q = this.parties.findIndex(p => k >= p.debut && k <= p.fin)
      this.surChoix(q >= 0 ? this.parties[q].debut : k, false)
    }
    el.addEventListener('pointerup', e => lacher(e, false))
    el.addEventListener('pointercancel', e => lacher(e, true))
  }

  /** Une nouvelle bande : n images, découpées en parties */
  charger(n: number, parties: Partie[]) {
    this.n = Math.max(1, n)
    this.parties = parties
    for (const c of this.cases) c.remove()
    this.largeurs = []
    this.cases = parties.map((p, q) => {
      // De mi-chemin avec la partie d'avant à mi-chemin avec celle d'après
      const g = q ? this.position(p.debut - 0.5) : 0
      const d = q + 1 < parties.length ? this.position(p.fin + 0.5) : 1
      const c = document.createElement('div')
      c.className = 'revue-partie' + (q % 2 ? ' paire' : '')
      c.style.left = `${g * 100}%`
      c.style.width = `${(d - g) * 100}%`
      const titre = document.createElement('span')
      titre.textContent = p.titre
      c.append(titre)
      c.title = p.titre
      this.largeurs.push(d - g)
      return c
    })
    this.fond.prepend(...this.cases)
    this.appui = null
    this.mesurer()
  }

  /** La place de l'image k (fractionnaire, pour les bords des cases), de 0 à 1 */
  private position(k: number): number {
    return Math.max(0, Math.min(1, k / Math.max(1, this.n - 1)))
  }

  /** Les titres et les filets selon la place que chaque case a vraiment */
  private mesurer() {
    const l = this.el.clientWidth
    if (!l) return
    this.cases.forEach((c, q) => {
      const px = this.largeurs[q] * l
      c.classList.toggle('muette', px < TITRE_MIN)
      c.classList.toggle('fine', px < FILET_MIN)
    })
  }

  /** Où l'on en est : l'image k, dans la partie `partie` */
  placer(k: number, partie: number, texte: string) {
    const el = this.el
    el.setAttribute('aria-valuemin', '0')
    el.setAttribute('aria-valuemax', String(this.n - 1))
    el.setAttribute('aria-valuenow', String(k))
    el.setAttribute('aria-valuetext', texte)
    const f = this.position(k)
    this.rempli.style.width = `${f * 100}%`
    this.tete.style.left = `${f * 100}%`
    this.cases.forEach((c, i) => c.classList.toggle('ici', i === partie))
  }

  /** L'image sous l'abscisse x (écran) : la plus proche sur la règle, donc
   *  toujours une image de la case sous le doigt */
  private indiceSous(x: number): number {
    const r = this.el.getBoundingClientRect()
    const f = r.width > 0 ? Math.max(0, Math.min(1, (x - r.left) / r.width)) : 0
    return Math.round(f * (this.n - 1))
  }

  /** Au plus une demande par image d'écran : la dernière visée l'emporte */
  private demander(k: number) {
    this.demande = k
    if (this.image) return
    this.image = requestAnimationFrame(() => {
      this.image = 0
      const v = this.demande
      this.demande = -1
      if (v >= 0) this.surChoix(v, true)
    })
  }
}
