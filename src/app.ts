// =============================================================
// L'APPLICATION
// Elle relie trois choses qui s'ignorent : le document (ce qui est
// écrit), la caméra (où l'on regarde) et le rendu (ce qu'on voit).
// Les gestes arrivent ici, deviennent des formes, et partent dans
// le document. Le rendu, lui, ne fait que lire.
// =============================================================
import type { Tableau } from './document'
import { Camera } from './camera'
import { Rendu } from './rendu'
import { chevauche, rectangle, touche } from './geometrie'
import type { Fond, Forme, Formule, Outil, Presence, Role } from './types'
import { CM, uid } from './types'

export const COULEURS = [
  { nom: 'Noir', valeur: '#1b2230' },
  { nom: 'Bleu', valeur: '#1f5fbf' },
  { nom: 'Rouge', valeur: '#d0342c' },
  { nom: 'Vert', valeur: '#1e8a4c' },
]
export const TAILLES = [{ nom: 'Fin', valeur: 2.5 }, { nom: 'Moyen', valeur: 4.5 }, { nom: 'Épais', valeur: 9 }]

export interface Interface {
  maj(): void
  editerFormule(latex: string, ecranX: number, ecranY: number): Promise<string | null>
  message(texte: string): void
}

type Geste =
  | { type: 'pan'; dernierX: number; dernierY: number }
  | { type: 'pinch'; dist: number; cx: number; cy: number }
  | { type: 'dessin'; pointeur: number }
  | { type: 'segment'; x: number; y: number }
  | { type: 'gomme'; effaces: Set<string> }
  | { type: 'deplacer'; x: number; y: number; bouge: boolean }
  | { type: 'cadre'; x: number; y: number }
  | { type: 'formule'; sx: number; sy: number }

export class App {
  readonly cam = new Camera()
  readonly rendu: Rendu
  ui!: Interface

  page = ''
  outil: Outil = 'stylo'
  couleur = COULEURS[0].valeur
  taille = TAILLES[1].valeur
  aimant = false
  suivre = true                       // élève : suit la page et la vue du prof
  selection = new Set<string>()

  private formes: Forme[] = []
  private camerasParPage = new Map<string, Camera>()
  private pointeurs = new Map<number, { x: number; y: number; type: string }>()
  private geste: Geste | null = null
  private styletVu = false            // un stylet a servi : le doigt ne dessine plus
  private espace = false
  private dernierEnvoiTrait = 0
  private dernierEnvoiCurseur = 0
  private dernierEnvoiVue = 0

  constructor(readonly tableau: Tableau, readonly role: Role, private zone: HTMLElement) {
    this.rendu = new Rendu(this.cam, zone)
    this.cam.x = 120; this.cam.y = 120

    tableau.pages.observeDeep(() => this.rafraichir())
    tableau.ordre.observe(() => this.verifierPage())
    tableau.reglages.observe(() => { this.ui?.maj() })
    tableau.presence.on('change', () => this.surPresence())

    this.brancherGestes()
  }

  // ---------- Droits ----------
  get peutEcrire() { return this.role === 'prof' || this.tableau.reglages.get('elevesEcrivent') === true }
  get pages() { return this.tableau.ordre.toArray() }
  get fond(): Fond { return this.tableau.fondDe(this.page) }

  // ---------- Pages ----------
  allerPage(id: string) {
    if (!id || id === this.page) return
    if (this.page) this.camerasParPage.set(this.page, this.cam.copie())
    this.page = id
    const c = this.camerasParPage.get(id)
    if (c) { this.cam.x = c.x; this.cam.y = c.y; this.cam.z = c.z }
    this.selection.clear()
    this.rafraichir()
    this.annoncerVue(true)
  }

  pageSuivante(sens: 1 | -1) {
    const p = this.pages, i = p.indexOf(this.page) + sens
    if (i >= 0 && i < p.length) this.allerPage(p[i])
  }

  nouvellePage() {
    const id = this.tableau.ajouterPage(this.fond, this.pages.indexOf(this.page) + 1)
    this.allerPage(id)
  }

  supprimerPage() {
    if (this.pages.length <= 1) return this.ui.message('Un tableau garde au moins une page.')
    const i = this.pages.indexOf(this.page)
    const id = this.page
    this.allerPage(this.pages[i > 0 ? i - 1 : 1])
    this.tableau.supprimerPage(id)
  }

  /** Le repère se pose au milieu de ce qu'on regarde, calé sur le centimètre. */
  changerFond(f: Fond) {
    let origine: { x: number; y: number } | undefined
    if (f === 'repere') {
      const v = this.cam.visible(this.rendu.l, this.rendu.h)
      origine = { x: Math.round((v.x + v.l / 2) / CM) * CM, y: Math.round((v.y + v.h / 2) / CM) * CM }
    }
    this.tableau.changerFond(this.page, f, origine)
  }

  private verifierPage() {
    const p = this.pages
    if (!p.includes(this.page) && p.length) this.allerPage(p[0])
    this.ui?.maj()
  }

  // ---------- Lecture du document ----------
  rafraichir() {
    const formes = this.tableau.formesDe(this.page)
    this.formes = formes ? Array.from(formes.values()).sort((a, b) => a.z - b.z) : []
    const ids = new Set(this.formes.map(f => f.id))
    for (const id of this.selection) if (!ids.has(id)) this.selection.delete(id)
    this.rendu.formes = this.formes
    this.rendu.fond = this.fond
    this.rendu.origine = this.tableau.origineDe(this.page)
    this.rendu.selection = this.selection
    this.rendu.toutRedessiner()
    this.ui?.maj()
  }

  // ---------- Outils ----------
  choisirOutil(o: Outil) {
    this.outil = o
    if (o !== 'selection') this.selection.clear()
    this.rendu.gomme = null
    this.rendu.toutRedessiner()
    this.zone.dataset.outil = o
    this.ui?.maj()
  }

  annuler() { this.tableau.annulation.undo(); this.selection.clear() }
  retablir() { this.tableau.annulation.redo() }

  supprimerSelection() {
    if (!this.selection.size) return
    this.tableau.nouveauGeste()
    this.tableau.supprimer(this.page, [...this.selection])
    this.selection.clear()
  }

  zoomer(facteur: number) {
    this.cam.zoomerAutour(this.rendu.l / 2, this.rendu.h / 2, facteur)
    this.vueChangee(true)
  }

  zoom100() { this.cam.zoomerAutour(this.rendu.l / 2, this.rendu.h / 2, 1 / this.cam.z); this.vueChangee(true) }

  private vueChangee(parLUtilisateur: boolean) {
    if (parLUtilisateur && this.role === 'eleve' && this.suivre) { this.suivre = false }
    this.rendu.toutRedessiner()
    this.annoncerVue(false)
    this.ui?.maj()
  }

  // ---------- Présence : le prof annonce, l'élève suit ----------
  private annoncerVue(force: boolean) {
    const t = performance.now()
    if (!force && t - this.dernierEnvoiVue < 120) return
    this.dernierEnvoiVue = t
    const v = this.cam.visible(this.rendu.l, this.rendu.h)
    this.tableau.diffuser({ page: this.page, vue: { cx: v.x + v.l / 2, cy: v.y + v.h / 2, l: v.l, h: v.h } })
  }

  prof(): Presence | null {
    for (const p of this.tableau.autres().values()) if (p.role === 'prof') return p
    return null
  }

  revenirAuProf() { this.suivre = true; this.surPresence() }

  private surPresence() {
    const autres = [...this.tableau.autres().values()].filter(p => p.page === this.page)
    this.rendu.autres = autres
    this.rendu.redessinerDirect()
    if (this.role === 'eleve' && this.suivre) {
      const prof = this.prof()
      if (prof?.page && prof.page !== this.page && this.pages.includes(prof.page)) this.allerPage(prof.page)
      if (prof?.vue) {
        const v = prof.vue
        this.cam.cadrer(v.cx, v.cy, v.l, v.h, this.rendu.l, this.rendu.h)
        this.rendu.toutRedessiner()
      }
    }
    this.ui?.maj()
  }

  // ---------- Gestes ----------
  private monde(e: { clientX: number; clientY: number }) {
    const r = this.zone.getBoundingClientRect()
    return this.cam.versMonde(e.clientX - r.left, e.clientY - r.top)
  }
  private ecran(e: { clientX: number; clientY: number }) {
    const r = this.zone.getBoundingClientRect()
    return { x: e.clientX - r.left, y: e.clientY - r.top }
  }

  private aimanter(p: { x: number; y: number }) {
    if (!this.aimant) return p
    const pas = CM / 2
    return { x: Math.round(p.x / pas) * pas, y: Math.round(p.y / pas) * pas }
  }

  private formeSous(x: number, y: number): Forme | null {
    const r = 6 / this.cam.z
    for (let i = this.formes.length - 1; i >= 0; i--) {
      if (touche(this.formes[i], x, y, r, f => this.rendu.boite(f))) return this.formes[i]
    }
    return null
  }

  private brancherGestes() {
    const z = this.zone
    z.addEventListener('pointerdown', e => this.bas(e))
    z.addEventListener('pointermove', e => this.bouge(e))
    z.addEventListener('pointerup', e => this.haut(e))
    z.addEventListener('pointercancel', e => this.haut(e, true))
    z.addEventListener('pointerleave', () => this.tableau.diffuser({ curseur: null }))
    z.addEventListener('wheel', e => this.molette(e), { passive: false })
    z.addEventListener('dblclick', e => {
      const p = this.monde(e), f = this.formeSous(p.x, p.y)
      if (f?.type === 'formule' && this.peutEcrire) this.editerFormule(f)
    })
    window.addEventListener('keydown', e => this.clavier(e))
    window.addEventListener('keyup', e => { if (e.code === 'Space') this.espace = false })
  }

  private bas(e: PointerEvent) {
    this.zone.setPointerCapture(e.pointerId)
    const s = this.ecran(e)
    this.pointeurs.set(e.pointerId, { x: s.x, y: s.y, type: e.pointerType })
    if (e.pointerType === 'pen') this.styletVu = true

    // Deux doigts : pincer pour zoomer, quoi qu'on fût en train de faire
    const doigts = [...this.pointeurs.values()].filter(p => p.type === 'touch')
    if (doigts.length === 2) {
      this.abandonnerGeste()
      const [a, b] = doigts
      this.geste = { type: 'pinch', dist: Math.hypot(a.x - b.x, a.y - b.y), cx: (a.x + b.x) / 2, cy: (a.y + b.y) / 2 }
      return
    }
    if (this.geste) return

    const deplacerVue = e.button === 1 || this.outil === 'main' || this.espace || !this.peutEcrire ||
      (e.pointerType === 'touch' && this.styletVu)          // la paume ne dessine pas
    if (deplacerVue) { this.geste = { type: 'pan', dernierX: s.x, dernierY: s.y }; return }
    if (e.button !== 0) return

    const m = this.monde(e)
    this.tableau.nouveauGeste()
    switch (this.outil) {
      case 'stylo':
      case 'surligneur': {
        const surligneur = this.outil === 'surligneur'
        this.rendu.monTrait = {
          pts: [m.x, m.y, e.pointerType === 'pen' ? e.pressure : 0.5],
          couleur: this.couleur,
          taille: surligneur ? this.taille * 5 : this.taille,
          opacite: surligneur ? 0.35 : 1,
          pression: e.pointerType === 'pen' && !surligneur,
        }
        this.geste = { type: 'dessin', pointeur: e.pointerId }
        this.rendu.redessinerDirect()
        break
      }
      case 'segment': {
        const a = this.aimanter(m)
        this.geste = { type: 'segment', x: a.x, y: a.y }
        this.rendu.monSegment = { x1: a.x, y1: a.y, x2: a.x, y2: a.y, couleur: this.couleur, taille: this.taille }
        break
      }
      case 'gomme':
        this.geste = { type: 'gomme', effaces: new Set() }
        this.gommer(m.x, m.y)
        break
      case 'selection': {
        const f = this.formeSous(m.x, m.y)
        if (f) {
          if (!this.selection.has(f.id)) { if (!e.shiftKey) this.selection.clear(); this.selection.add(f.id) }
          this.geste = { type: 'deplacer', x: m.x, y: m.y, bouge: false }
        } else {
          if (!e.shiftKey) this.selection.clear()
          this.geste = { type: 'cadre', x: m.x, y: m.y }
        }
        this.rendu.redessinerDirect(); this.ui.maj()
        break
      }
      case 'formule':
        this.geste = { type: 'formule', sx: s.x, sy: s.y }
        break
    }
  }

  private bouge(e: PointerEvent) {
    const s = this.ecran(e)
    const avant = this.pointeurs.get(e.pointerId)
    if (avant) { avant.x = s.x; avant.y = s.y }
    const m = this.monde(e)

    // Curseur partagé (le prof est suivi des yeux)
    const t = performance.now()
    if (t - this.dernierEnvoiCurseur > 50 && this.peutEcrire) {
      this.dernierEnvoiCurseur = t
      this.tableau.diffuser({ curseur: m, page: this.page })
    }
    if (this.outil === 'gomme' && this.peutEcrire) {
      this.rendu.gomme = { x: m.x, y: m.y, r: 12 / this.cam.z }
      this.rendu.redessinerDirect()
    }

    const g = this.geste
    if (!g) return
    switch (g.type) {
      case 'pinch': {
        const doigts = [...this.pointeurs.values()].filter(p => p.type === 'touch')
        if (doigts.length < 2) return
        const [a, b] = doigts
        const dist = Math.hypot(a.x - b.x, a.y - b.y)
        const cx = (a.x + b.x) / 2, cy = (a.y + b.y) / 2
        this.cam.deplacer(cx - g.cx, cy - g.cy)
        if (g.dist > 0) this.cam.zoomerAutour(cx, cy, dist / g.dist)
        g.dist = dist; g.cx = cx; g.cy = cy
        this.vueChangee(true)
        break
      }
      case 'pan':
        this.cam.deplacer(s.x - g.dernierX, s.y - g.dernierY)
        g.dernierX = s.x; g.dernierY = s.y
        this.vueChangee(true)
        break
      case 'dessin': {
        if (e.pointerId !== g.pointeur) return
        const trait = this.rendu.monTrait!
        // Les événements « fusionnés » : tous les points que le stylet a
        // envoyés entre deux images, pas seulement le dernier.
        const evts = e.getCoalescedEvents?.() ?? [e]
        const seuil = 0.6 / this.cam.z
        for (const ev of evts.length ? evts : [e]) {
          const p = this.monde(ev)
          const n = trait.pts.length
          if (Math.hypot(p.x - trait.pts[n - 3], p.y - trait.pts[n - 2]) < seuil) continue
          trait.pts.push(p.x, p.y, ev.pointerType === 'pen' ? ev.pressure : 0.5)
        }
        this.rendu.redessinerDirect()
        if (t - this.dernierEnvoiTrait > 33) { this.dernierEnvoiTrait = t; this.tableau.diffuser({ direct: { ...trait } }) }
        break
      }
      case 'segment': {
        let b = this.aimanter(m)
        if (e.shiftKey) {                               // angles de 15° en 15°
          const ang = Math.round(Math.atan2(b.y - g.y, b.x - g.x) / (Math.PI / 12)) * (Math.PI / 12)
          const d = Math.hypot(b.x - g.x, b.y - g.y)
          b = { x: g.x + d * Math.cos(ang), y: g.y + d * Math.sin(ang) }
        }
        this.rendu.monSegment!.x2 = b.x; this.rendu.monSegment!.y2 = b.y
        this.rendu.redessinerDirect()
        break
      }
      case 'gomme':
        this.gommer(m.x, m.y, g.effaces)
        break
      case 'deplacer': {
        g.bouge = true
        this.rendu.decalage = { dx: m.x - g.x, dy: m.y - g.y }
        this.rendu.toutRedessiner()
        break
      }
      case 'cadre':
        this.rendu.cadreSelection = rectangle(g.x, g.y, m.x, m.y)
        this.rendu.redessinerDirect()
        break
    }
  }

  private haut(e: PointerEvent, annule = false) {
    this.pointeurs.delete(e.pointerId)
    const g = this.geste
    if (!g) return
    if (g.type === 'pinch') { if (this.pointeurs.size === 0) this.geste = null; return }
    if (g.type === 'dessin' && e.pointerId !== g.pointeur) return
    this.geste = null
    if (annule) { this.abandonnerGeste(g); return }

    const m = this.monde(e)
    switch (g.type) {
      case 'dessin': this.validerTrait(); break
      case 'segment': {
        const s = this.rendu.monSegment!
        this.rendu.monSegment = null
        if (Math.hypot(s.x2 - s.x1, s.y2 - s.y1) > 2) {
          this.tableau.poser(this.page, { id: uid(), type: 'segment', x: s.x1, y: s.y1, dx: s.x2 - s.x1,
            dy: s.y2 - s.y1, couleur: s.couleur, taille: s.taille, z: Date.now(), auteur: this.tableau.moi })
        }
        this.rendu.redessinerDirect()
        break
      }
      case 'deplacer': {
        const { dx, dy } = this.rendu.decalage
        this.rendu.decalage = { dx: 0, dy: 0 }
        if (g.bouge && (dx || dy)) {
          this.tableau.modifier(this.page, this.formes.filter(f => this.selection.has(f.id))
            .map(f => ({ id: f.id, patch: { x: f.x + dx, y: f.y + dy } })))
        } else this.rendu.toutRedessiner()
        break
      }
      case 'cadre': {
        const r = this.rendu.cadreSelection
        this.rendu.cadreSelection = null
        if (r) for (const f of this.formes) if (chevauche(r, this.rendu.boite(f))) this.selection.add(f.id)
        this.rendu.redessinerDirect(); this.ui.maj()
        break
      }
      case 'formule': {
        const s = this.ecran(e)
        if (Math.hypot(s.x - g.sx, s.y - g.sy) > 6) break
        const f = this.formeSous(m.x, m.y)
        if (f?.type === 'formule') this.editerFormule(f)
        else this.nouvelleFormule(m.x, m.y, s.x, s.y)
        break
      }
    }
  }

  private abandonnerGeste(g: Geste | null = this.geste) {
    if (g?.type === 'dessin') { this.rendu.monTrait = null; this.tableau.diffuser({ direct: null }) }
    if (g?.type === 'segment') this.rendu.monSegment = null
    if (g?.type === 'cadre') this.rendu.cadreSelection = null
    if (g?.type === 'deplacer') this.rendu.decalage = { dx: 0, dy: 0 }
    this.geste = null
    this.rendu.toutRedessiner()
  }

  private validerTrait() {
    const t = this.rendu.monTrait
    this.rendu.monTrait = null
    this.tableau.diffuser({ direct: null })
    if (!t || t.pts.length < 3) return
    const x0 = t.pts[0], y0 = t.pts[1]
    const pts: number[] = []
    for (let i = 0; i < t.pts.length; i += 3) {
      pts.push(Math.round((t.pts[i] - x0) * 10) / 10, Math.round((t.pts[i + 1] - y0) * 10) / 10,
        Math.round(t.pts[i + 2] * 100) / 100)
    }
    this.tableau.poser(this.page, { id: uid(), type: 'trait', x: x0, y: y0, pts, couleur: t.couleur,
      taille: t.taille, opacite: t.opacite, pression: t.pression, z: Date.now(), auteur: this.tableau.moi })
    this.rendu.redessinerDirect()
  }

  private gommer(x: number, y: number, deja?: Set<string>) {
    const r = 12 / this.cam.z
    const touches = this.formes.filter(f => !deja?.has(f.id) && touche(f, x, y, r, g => this.rendu.boite(g)))
    if (!touches.length) return
    touches.forEach(f => deja?.add(f.id))
    this.tableau.supprimer(this.page, touches.map(f => f.id))
  }

  // ---------- Formules ----------
  private async nouvelleFormule(x: number, y: number, sx: number, sy: number) {
    const latex = await this.ui.editerFormule('', sx, sy)
    if (!latex) return
    this.tableau.nouveauGeste()
    this.tableau.poser(this.page, { id: uid(), type: 'formule', x, y, latex, couleur: this.couleur,
      taille: 28, z: Date.now(), auteur: this.tableau.moi })
  }

  private async editerFormule(f: Formule) {
    const s = this.cam.versEcran(f.x, f.y)
    const latex = await this.ui.editerFormule(f.latex, s.x, s.y)
    if (latex === null) return
    this.tableau.nouveauGeste()
    if (latex === '') this.tableau.supprimer(this.page, [f.id])
    else this.tableau.modifier(this.page, [{ id: f.id, patch: { latex } }])
  }

  // ---------- Molette et clavier ----------
  private molette(e: WheelEvent) {
    e.preventDefault()
    const s = this.ecran(e)
    // Pincement de pavé tactile (ctrlKey) ou molette de souris : zoom.
    // Glissement à deux doigts sur pavé tactile : déplacement.
    const pave = e.deltaMode === 0 && Math.abs(e.deltaX) > 0
    if (e.ctrlKey || !pave) this.cam.zoomerAutour(s.x, s.y, Math.exp(-e.deltaY * (e.ctrlKey ? 0.01 : 0.0015)))
    else this.cam.deplacer(-e.deltaX, -e.deltaY)
    this.vueChangee(true)
  }

  private clavier(e: KeyboardEvent) {
    const cible = e.target as HTMLElement
    if (cible.closest('input, textarea, [contenteditable]')) return
    const ctrl = e.ctrlKey || e.metaKey
    if (e.code === 'Space') { this.espace = true; e.preventDefault(); return }
    if (ctrl && e.key.toLowerCase() === 'z') { e.preventDefault(); e.shiftKey ? this.retablir() : this.annuler(); return }
    if (ctrl && e.key.toLowerCase() === 'y') { e.preventDefault(); this.retablir(); return }
    if (e.key === 'Delete' || e.key === 'Backspace') { this.supprimerSelection(); return }
    if (e.key === 'PageDown') { this.pageSuivante(1); return }
    if (e.key === 'PageUp') { this.pageSuivante(-1); return }
    if (e.key === 'Escape') { this.selection.clear(); this.rendu.toutRedessiner(); this.ui.maj(); return }
    if (ctrl || !this.peutEcrire) return
    const raccourcis: Record<string, Outil> = { p: 'stylo', h: 'surligneur', e: 'gomme', l: 'segment', f: 'formule', v: 'selection' }
    const o = raccourcis[e.key.toLowerCase()]
    if (o) this.choisirOutil(o)
  }
}
