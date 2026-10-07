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
import { chevauche, distanceAuSegment, rectangle, touche } from './geometrie'
import type { Figure, Fond, Forme, Formule, Habillage, Outil, Polygone, Presence, Role, Trait, TypeForme } from './types'
import { CM, uid } from './types'
import type { P, Reconnue, Transformation } from './formes'
import type { Bord, EtatInstrument, NomInstrument, Partie } from './instruments'
import { angleLisible, bords, etatParDefaut, toucher } from './instruments'
import * as Y from 'yjs'
import katex from 'katex'
import { bornerDecalage, image, nomsLibres, placesDesNoms, reconnaitre, sommetsDe, versRelatif } from './formes'

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
  ouvrirMenuPartie(id: string, prise: Prise, clientX: number, clientY: number): void
  fermerMenuPartie(): void
}

type Geste =
  | { type: 'pan'; dernierX: number; dernierY: number; vide?: { x: number; y: number } }
  | { type: 'pinch'; dist: number; cx: number; cy: number }
  | { type: 'dessin'; pointeur: number }
  | { type: 'segment'; x: number; y: number; sx: number; sy: number }
  | { type: 'rectangle' | 'cercle'; x: number; y: number }
  | { type: 'poignee'; prise: Prise; f: Figure; sx: number; sy: number; bouge: boolean }
  | { type: 'instrument'; nom: NomInstrument; quoi: Partie; depart: EtatInstrument; x: number; y: number; ecart: number; balayage: number; dernier: number }
  | { type: 'longer'; bord: Bord; t0: number }
  | { type: 'gomme'; effaces: Set<string> }
  | { type: 'deplacer'; x: number; y: number; bouge: boolean }
  | { type: 'cadre'; x: number; y: number }
  | { type: 'formule'; sx: number; sy: number }

/** Un morceau d'une figure qu'on attrape : le nom d'un point, un sommet, le rayon */
export type Prise = { quoi: 'nom' | 'sommet'; i: number } | { quoi: 'rayon' }

export class App {
  readonly cam = new Camera()
  readonly rendu: Rendu
  ui!: Interface

  page = ''
  outil: Outil = 'stylo'
  couleur = COULEURS[0].valeur
  taille = TAILLES[1].valeur
  aimant = false
  reconnaissance = true               // le stylo redresse les figures
  typeForme: TypeForme = 'rectangle'
  typeTrait: 'segment' | 'droite' | 'demi' = 'segment'      // ce que trace l'outil Segment
  /** La figure dont le panneau d'options est ouvert (double-clic ou clic droit) */
  options: string | null = null
  private astuceOptions = false
  /** Le premier point d'un trait tracé en deux clics (le second clic le finit) */
  private traitEnAttente: P | null = null
  suivre = true                       // élève : suit la page et la vue du prof
  selection = new Set<string>()
  /** Un seul morceau choisi (un sommet, un nom…), sans la figure entière */
  partie: { id: string; prise: Prise } | null = null
  /** Une revue occupe l'écran : on ne relit pas le document et les raccourcis se taisent */
  enLecture = false
  /** Un mode où le prochain clic pose quelque chose (une construction…) */
  placement: { bouge(w: P): void; clic(w: P): void; annuler(): void } | null = null
  private outilAvant: Outil = 'stylo'      // l'outil que rend Échap depuis la Sélection
  private survol: string | null = null

  private formes: Forme[] = []
  private camerasParPage = new Map<string, Camera>()
  private pointeurs = new Map<number, { x: number; y: number; type: string }>()
  private geste: Geste | null = null
  private styletVu = false            // un stylet a servi : le doigt ne dessine plus
  private espace = false
  private dernierEnvoiTrait = 0
  private dernierEnvoiCurseur = 0
  private dernierEnvoiVue = 0
  private dernierMouvement = 0        // pour savoir si le stylet est resté immobile
  private polyEnCours: P[] | null = null
  private minuterieForme = 0
  /** Les instruments posés (dans l'ordre d'empilement) et leur réglage */
  readonly instruments = new Map<NomInstrument, EtatInstrument>()

  constructor(readonly tableau: Tableau, readonly role: Role, private zone: HTMLElement) {
    this.rendu = new Rendu(this.cam, zone)
    this.cam.x = 120; this.cam.y = 120

    tableau.pages.observeDeep(() => this.rafraichir())
    tableau.ordre.observe(() => this.verifierPage())
    tableau.reglages.observe(() => { this.ui?.maj() })
    tableau.presence.on('change', () => this.surPresence())

    this.brancherGestes()

    // Les instruments vivent dans le document (ils restent où on les a
    // laissés), mais hors des pages : ni annulation, ni film.
    const posés = tableau.doc.getMap('instruments') as Y.Map<EtatInstrument & { visible: boolean }>
    const relire = () => {
      if (this.geste?.type === 'instrument') return
      for (const [nom, e] of posés) {
        if (e.visible) this.instruments.set(nom as NomInstrument, { x: e.x, y: e.y, a: e.a, r: e.r })
        else this.instruments.delete(nom as NomInstrument)
      }
      this.majInstruments()
    }
    posés.observe(relire)
    relire()

    // Les images : où trouver leurs pixels ; coller ou glisser un fichier
    this.rendu.pixels = src => this.pixels(src)
    this.rendu.rendreFormule = (latex, el) => katex.render(latex, el, { throwOnError: false, displayMode: false })
    window.addEventListener('paste', e => {
      if ((e.target as HTMLElement).closest?.('input, textarea')) return
      const f = [...(e.clipboardData?.files ?? [])].find(x => x.type.startsWith('image/'))
      if (f && this.peutEcrire && !this.enLecture) { e.preventDefault(); this.importerImage(f) }
    })
    zone.addEventListener('dragover', e => { if (e.dataTransfer?.types.includes('Files')) e.preventDefault() })
    zone.addEventListener('drop', e => {
      const f = [...(e.dataTransfer?.files ?? [])].find(x => x.type.startsWith('image/'))
      if (f && this.peutEcrire) { e.preventDefault(); this.importerImage(f) }
    })
  }

  // ---------- Instruments ----------
  instrumentVisible(nom: NomInstrument) { return this.instruments.has(nom) }

  /** Montre ou range un instrument ; il revient là où on l'avait laissé */
  basculerInstrument(nom: NomInstrument) {
    const posés = this.tableau.doc.getMap('instruments') as Y.Map<EtatInstrument & { visible: boolean }>
    const avant = posés.get(nom)
    if (this.instruments.has(nom)) { posés.set(nom, { ...avant!, visible: false }); return }
    const v = this.cam.visible(this.rendu.l, this.rendu.h)
    const centre = { x: v.x + v.l / 2, y: v.y + v.h / 2 }
    // Un instrument rangé hors de la vue revient au milieu de l'écran
    const garde = avant && avant.x > v.x && avant.x < v.x + v.l && avant.y > v.y && avant.y < v.y + v.h
    posés.set(nom, { ...(garde ? avant : etatParDefaut(nom, centre)), visible: true })
    if (nom === 'compas') this.ui.message('Compas : la pointe le pose, la mine l\'écarte (Maj + mine : le tourner sans tracer), la tête ↻ trace l\'arc — un petit tour, un petit arc.')
  }

  private enregistrerInstrument(nom: NomInstrument) {
    const e = this.instruments.get(nom)
    if (e) (this.tableau.doc.getMap('instruments') as Y.Map<unknown>).set(nom, { ...e, visible: true })
  }

  private majInstruments(actif?: { nom: NomInstrument; quoi: Partie }) {
    this.rendu.instruments = [...this.instruments].map(([nom, etat]) => ({ nom, etat, actif: actif?.nom === nom ? actif.quoi : null }))
    this.rendu.redessinerInstruments()
    this.ui?.maj()
  }

  /** L'instrument sous le pointeur, le plus haut d'abord */
  private instrumentSous(w: P): { nom: NomInstrument; quoi: Partie } | null {
    const r = 9 / this.cam.z
    for (const [nom, e] of [...this.instruments].reverse()) {
      const quoi = toucher(nom, e, w, r)
      if (quoi) return { nom, quoi }
    }
    return null
  }

  /** Le bord d'instrument contre lequel on pose le crayon */
  private bordSous(w: P): { bord: Bord; t: number } | null {
    const portee = 12 / this.cam.z
    let mieux: { bord: Bord; t: number; d: number } | null = null
    for (const [nom, e] of this.instruments) {
      for (const b of bords(nom, e)) {
        const dx = w.x - b.o.x, dy = w.y - b.o.y
        const t = dx * b.u.x + dy * b.u.y, d = Math.abs(-dx * b.u.y + dy * b.u.x)
        if (t >= b.debut - portee && t <= b.fin + portee && d < portee && (!mieux || d < mieux.d)) mieux = { bord: b, t, d }
      }
    }
    return mieux
  }

  /** Les points de la page où un instrument s'accroche */
  private pointsAccroche(): P[] {
    const r: P[] = []
    for (const f of this.formes) {
      if (f.type === 'polygone') r.push(...sommetsDe(f))
      else if (f.type === 'cercle') r.push({ x: f.x, y: f.y })
    }
    return r
  }

  private accrocher(p: P, exclu?: P): { p: P; accroche: boolean } {
    const portee = 12 / this.cam.z
    let mieux: P | null = null, d = portee
    for (const q of this.pointsAccroche()) {
      if (exclu && Math.hypot(q.x - exclu.x, q.y - exclu.y) < 1e-6) continue
      const e = Math.hypot(q.x - p.x, q.y - p.y)
      if (e < d) { d = e; mieux = q }
    }
    return mieux ? { p: mieux, accroche: true } : { p: this.aimanter(p), accroche: false }
  }

  private geste_instrument(g: Extract<Geste, { type: 'instrument' }>, m: P, maj = false) {
    const e = { ...g.depart }
    const cm = (v: number) => (Math.round(v / CM * 10) / 10).toString().replace('.', ',') + ' cm'
    this.rendu.mesure = null
    switch (g.quoi) {
      case 'corps':
      case 'pointe': {
        const o = this.accrocher({ x: g.depart.x + m.x - g.x, y: g.depart.y + m.y - g.y })
        e.x = o.p.x; e.y = o.p.y
        break
      }
      case 'rotation': {
        // L'angle se lit au degré près, et s'aimante tous les 15°
        let a = Math.atan2(m.y - e.y, m.x - e.x) - g.ecart
        const deg = a * 180 / Math.PI, q = Math.round(deg / 15) * 15
        a = (Math.abs(deg - q) < 2.5 ? q : Math.round(deg)) * Math.PI / 180
        e.a = a
        this.rendu.mesure = { texte: angleLisible(a), x: m.x, y: m.y }
        break
      }
      case 'mine': {
        if (maj) {
          // Maj : on « lève » le compas et on le tourne sur sa pointe, sans
          // tracer ni changer l'écartement — pour amener la mine où l'arc doit
          // commencer (à côté de l'intersection qu'on cherche, par exemple)
          e.a = Math.atan2(m.y - e.y, m.x - e.x)
          this.rendu.mesure = { texte: 'r = ' + cm(e.r) + ' (compas levé)', x: m.x, y: m.y }
          break
        }
        // L'écartement se prend sur un point de la figure, sinon au millimètre
        const o = this.accrocher(m, { x: e.x, y: e.y })
        const d = Math.hypot(o.p.x - e.x, o.p.y - e.y)
        e.r = Math.max(0.2 * CM, o.accroche ? d : Math.round(d / 4) * 4)
        e.a = Math.atan2(o.p.y - e.y, o.p.x - e.x)
        this.rendu.mesure = { texte: 'r = ' + cm(e.r), x: m.x, y: m.y }
        break
      }
      case 'tete': {
        // Tourner la tête : la mine décrit l'arc
        const a = Math.atan2(m.y - e.y, m.x - e.x)
        let d = a - g.dernier
        while (d > Math.PI) d -= 2 * Math.PI
        while (d < -Math.PI) d += 2 * Math.PI
        g.balayage += d; g.dernier = a
        const tour = Math.abs(g.balayage) >= 2 * Math.PI - 0.02
        e.a = g.depart.a + g.balayage
        this.rendu.apercu = Math.abs(g.balayage) > 0.01 ? this.figure({ type: 'cercle', x: e.x, y: e.y, r: e.r }) : null
        if (this.rendu.apercu?.type === 'cercle' && !tour) this.rendu.apercu.arc = { a0: g.depart.a, a1: g.depart.a + g.balayage }
        this.rendu.mesure = { texte: Math.round(Math.abs(g.balayage) * 180 / Math.PI) + '°', x: m.x, y: m.y }
        break
      }
    }
    this.instruments.set(g.nom, e)
    this.majInstruments({ nom: g.nom, quoi: g.quoi })
    this.rendu.redessinerDirect()
  }

  private finirInstrument(g: Extract<Geste, { type: 'instrument' }>) {
    this.rendu.mesure = null
    if (g.quoi === 'tete') {
      const f = this.rendu.apercu
      this.rendu.apercu = null
      // Un arc assez long pour se voir ; un tour complet donne le cercle
      if (f?.type === 'cercle' && Math.abs(g.balayage) * f.r * this.cam.z > 4) {
        this.tableau.nouveauGeste()
        this.tableau.poser(this.page, f)
      }
    }
    this.enregistrerInstrument(g.nom)
    this.majInstruments()
  }

  private geste_longer(g: Extract<Geste, { type: 'longer' }>, m: P) {
    const b = g.bord
    let t = (m.x - b.o.x) * b.u.x + (m.y - b.o.y) * b.u.y
    t = Math.max(b.debut, Math.min(b.fin, t))
    if (b.gradue) t = Math.round(t / 4) * 4                  // au millimètre, comme on lit la règle
    const a = { x: b.o.x + b.u.x * g.t0, y: b.o.y + b.u.y * g.t0 }, z = { x: b.o.x + b.u.x * t, y: b.o.y + b.u.y * t }
    this.rendu.apercu = this.figure({ type: 'polygone', ferme: false, ...versRelatif([a, z]) })
    this.rendu.mesure = { texte: (Math.round(Math.abs(t - g.t0) / CM * 10) / 10).toString().replace('.', ',') + ' cm', x: m.x, y: m.y }
    this.rendu.redessinerDirect()
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
    this.tableau.pageVue = id
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

  /** Efface tout ce qui est sur la page (Ctrl+Z le rend) */
  viderPage() {
    this.selection.clear(); this.choisirPartie(null)
    this.tableau.nouveauGeste()
    this.tableau.supprimer(this.page, this.formes.map(f => f.id))
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
    if (this.enLecture) return
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
    this.annulerPolygone()
    this.annulerTrait()
    this.survol = null; this.rendu.survol = null
    if (this.partie) this.choisirPartie(null)
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
    if (this.partie) return this.supprimerPartie()
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
    // Clic droit (ou bouton du stylet) : les options du morceau visé,
    // sinon celles de la figure entière
    z.addEventListener('contextmenu', e => {
      e.preventDefault()
      if (!this.peutEcrire || this.enLecture) return
      const s = this.ecran(e)
      const outil = this.outil
      this.outil = 'selection'                 // pour viser toutes les figures
      const prise = this.priseSous(s)
      this.outil = outil
      if (prise) { this.choisirPartie(prise.f.id, prise.prise); this.ui.ouvrirMenuPartie(prise.f.id, prise.prise, e.clientX, e.clientY); return }
      const p = this.monde(e), f = this.formeSous(p.x, p.y)
      this.ui.fermerMenuPartie()
      this.choisirPartie(null)
      if (f) this.ouvrirOptions(f)
    })
    // Double-clic : les options de l'objet (une formule, elle, se modifie)
    z.addEventListener('dblclick', e => {
      if (!this.peutEcrire || this.enLecture) return
      const p = this.monde(e), f = this.formeSous(p.x, p.y)
      if (f?.type === 'formule') this.editerFormule(f)
      else if (f && (this.outil === 'selection' || this.outil === 'main' || this.outil === 'segment')) this.ouvrirOptions(f)
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
    if (this.placement) { const p = this.placement; this.placement = null; p.clic(m); return }
    this.tableau.nouveauGeste()
    // Le crayon posé contre le bord d'un instrument trace le long du bord
    const dessine = this.outil === 'stylo' || this.outil === 'segment'
    const bord = dessine ? this.bordSous(m) : null
    if (bord) {
      const t0 = bord.bord.gradue ? Math.round(Math.max(bord.bord.debut, Math.min(bord.bord.fin, bord.t)) / 4) * 4 : bord.t
      this.geste = { type: 'longer', bord: bord.bord, t0 }
      this.geste_longer(this.geste, m)
      return
    }
    // Un instrument : on le déplace, on le tourne, on écarte ou on tourne le compas
    const inst = this.instrumentSous(m)
    if (inst) {
      const depart = { ...this.instruments.get(inst.nom)! }
      // Celui qu'on prend passe au-dessus des autres
      this.instruments.delete(inst.nom); this.instruments.set(inst.nom, depart)
      const a = Math.atan2(m.y - depart.y, m.x - depart.x)
      this.geste = { type: 'instrument', nom: inst.nom, quoi: inst.quoi, depart, x: m.x, y: m.y,
        ecart: a - depart.a, balayage: 0, dernier: a }
      this.majInstruments(inst)
      return
    }
    // Un morceau de la figure sélectionnée : son nom, un sommet, son rayon
    const prise = this.priseSous(s)
    if (prise) {
      this.ui.fermerMenuPartie()
      this.choisirPartie(prise.f.id, prise.prise)
      this.geste = { type: 'poignee', ...prise, sx: s.x, sy: s.y, bouge: false }
      this.ui.maj(); return
    }
    this.ui.fermerMenuPartie()
    if (this.partie) this.choisirPartie(null)
    // La figure qu'on vient de tracer reste sélectionnée (son panneau
    // d'options est ouvert) jusqu'au geste suivant.
    if (this.outil !== 'selection' && this.selection.size) {
      this.selection.clear(); this.rendu.redessinerDirect(); this.ui.maj()
    }
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
        this.dernierMouvement = performance.now()
        this.attendreImmobilite()
        this.rendu.redessinerDirect()
        break
      }
      case 'segment': {
        // Second clic d'un trait en deux clics : il le finit
        if (this.traitEnAttente) {
          const a = this.traitEnAttente
          this.traitEnAttente = null
          this.finirTrait(a, this.boutDuTrait(a, m, e.shiftKey))
          break
        }
        const a = this.accrocher(m).p
        this.geste = { type: 'segment', x: a.x, y: a.y, sx: s.x, sy: s.y }
        this.rendu.monSegment = { x1: a.x, y1: a.y, x2: a.x, y2: a.y, couleur: this.couleur, taille: this.taille }
        break
      }
      case 'forme': {
        if (this.typeForme === 'polygone') { this.pointDuPolygone(this.accrocher(m).p, s); break }
        const a = this.aimanter(m)
        this.geste = { type: this.typeForme, x: a.x, y: a.y }
        break
      }
      case 'point': this.placerPoint(m); break
      case 'gomme':
        this.geste = { type: 'gomme', effaces: new Set() }
        this.gommer(m.x, m.y)
        break
      case 'selection': {
        const f = this.formeSous(m.x, m.y)
        if (f) {
          if (!this.selection.has(f.id)) { if (!e.shiftKey) this.selection.clear(); this.selection.add(f.id) }
          this.direOptions()
          this.geste = { type: 'deplacer', x: m.x, y: m.y, bouge: false }
        } else if (e.shiftKey) {
          this.geste = { type: 'cadre', x: m.x, y: m.y }          // Maj + glisser : encadrer
        } else {
          // Glisser dans le vide déplace le tableau ; un simple clic désélectionne
          this.geste = { type: 'pan', dernierX: s.x, dernierY: s.y, vide: { x: s.x, y: s.y } }
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

    if (this.polyEnCours && this.outil === 'forme') {
      const o = this.accrocher(m)
      this.rendu.apercu = this.figure({ type: 'polygone', ferme: false, ...versRelatif([...this.polyEnCours, o.p]) })
      this.rendu.cible = o.accroche ? { a: o.p } : null
      this.rendu.redessinerDirect()
    }

    const g = this.geste
    if (this.placement && !g) { this.placement.bouge(m); this.zone.style.cursor = 'copy'; return }
    if (!g && this.outil === 'selection') {
      // Ce qu'on survole s'éclaire : au pavé tactile, on sait ce qu'on va prendre
      const f = this.formeSous(m.x, m.y)
      const id = f && !this.selection.has(f.id) ? f.id : null
      if (id !== this.survol) { this.survol = id; this.rendu.survol = id; this.rendu.redessinerDirect() }
    }
    if (!g && this.outil === 'segment' && this.peutEcrire) {
      if (this.traitEnAttente) this.apercuTrait(this.traitEnAttente, this.boutDuTrait(this.traitEnAttente, m, e.shiftKey))
      else this.montrerAccroche(m)
    }
    if (!g) {
      const inst = this.instruments.size ? this.instrumentSous(m) : null
      this.zone.style.cursor = inst ? (inst.quoi === 'corps' || inst.quoi === 'pointe' ? 'grab' : 'pointer') : this.priseSous(s) ? 'move'
        : this.outil === 'selection' ? (this.survol || this.formeSous(m.x, m.y) ? 'move' : 'grab') : ''
      return
    }
    switch (g.type) {
      case 'instrument': this.geste_instrument(g, m, e.shiftKey); break
      case 'longer': this.geste_longer(g, m); break
      case 'poignee':
        if (!g.bouge && Math.hypot(s.x - g.sx, s.y - g.sy) < 4) break     // un clic, pas encore un glisser
        g.bouge = true
        this.rendu.remplacement = this.manipuler(g.f, g.prise, m)
        this.rendu.toutRedessiner()
        break
      case 'rectangle':
      case 'cercle':
        this.rendu.apercu = this.figureTiree(g, this.aimanter(m), e.shiftKey)
        this.rendu.redessinerDirect()
        break
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
          if (Math.hypot(p.x - trait.pts[n - 3], p.y - trait.pts[n - 2]) * this.cam.z > 1.5) { this.dernierMouvement = t; this.attendreImmobilite() }
        }
        this.rendu.redessinerDirect()
        if (t - this.dernierEnvoiTrait > 33) { this.dernierEnvoiTrait = t; this.tableau.diffuser({ direct: { ...trait } }) }
        break
      }
      case 'segment':
        this.apercuTrait(g, this.boutDuTrait(g, m, e.shiftKey))
        break
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
    if (g.type === 'pan' && g.vide) {
      const s = this.ecran(e)
      if (Math.hypot(s.x - g.vide.x, s.y - g.vide.y) < 4 && this.selection.size) { this.selection.clear(); this.rendu.redessinerDirect(); this.ui.maj() }
    }
    if (g.type === 'dessin' && e.pointerId !== g.pointeur) return
    this.geste = null
    // Un geste coupé par le navigateur (un second doigt sur le pavé tactile,
    // une fenêtre système…) garde ce qu'il a tracé : un arc de compas, un
    // trait à la règle ou au stylo ne doit pas s'effacer sous les yeux
    const garder = g.type === 'instrument' || g.type === 'longer' || g.type === 'dessin'
    if (annule && !garder) { this.abandonnerGeste(g); return }

    const m = this.monde(e)
    switch (g.type) {
      case 'dessin': clearTimeout(this.minuterieForme); this.validerTrait(false); break
      case 'segment': {
        const s = this.rendu.monSegment!
        const ecran = this.ecran(e)
        // Un simple clic (sans glisser) pose le premier point : le second clic finira le trait
        if (Math.hypot(ecran.x - g.sx, ecran.y - g.sy) < 5) {
          this.traitEnAttente = { x: g.x, y: g.y }
          if (!this.astuceDeuxClics) { this.astuceDeuxClics = true; this.ui.message('Cliquez le second point (Échap pour annuler)') }
          this.rendu.redessinerDirect()
          break
        }
        this.finirTrait({ x: s.x1, y: s.y1 }, { x: s.x2, y: s.y2 })
        break
      }
      case 'instrument': this.finirInstrument(g); break
      case 'longer': {
        const f = this.rendu.apercu
        this.rendu.apercu = null; this.rendu.mesure = null
        if (f?.type === 'polygone' && Math.hypot(f.pts[2], f.pts[3]) * this.cam.z > 3) {
          this.tableau.nouveauGeste()
          this.tableau.poser(this.page, f)
        }
        this.rendu.redessinerDirect()
        break
      }
      case 'poignee': {
        // Un clic sans bouger : les options de ce morceau-là
        if (!g.bouge) { this.ui.ouvrirMenuPartie(g.f.id, g.prise, e.clientX, e.clientY); break }
        const f = this.manipuler(g.f, g.prise, m)
        this.rendu.remplacement = null
        const { id: _i, type: _t, ...patch } = f
        this.tableau.modifier(this.page, [{ id: f.id, patch: patch as Partial<Forme> }])
        this.rendu.toutRedessiner()
        break
      }
      case 'rectangle':
      case 'cercle': {
        const f = this.figureTiree(g, this.aimanter(m), e.shiftKey)
        this.rendu.apercu = null
        if (f && (f.type === 'cercle' ? f.r : Math.abs(f.pts[4]) + Math.abs(f.pts[5])) * this.cam.z > 6) this.poserFigure(f)
        this.rendu.redessinerDirect()
        break
      }
      case 'deplacer': {
        const { dx, dy } = this.rendu.decalage
        this.rendu.decalage = { dx: 0, dy: 0 }
        if (g.bouge && (dx || dy)) {
          this.tableau.modifier(this.page, this.formes.filter(f => this.selection.has(f.id) || this.lieeA(f))
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
    this.ui.maj()                       // le panneau d'options réapparaît
  }

  private abandonnerGeste(g: Geste | null = this.geste) {
    if (g?.type === 'dessin') { clearTimeout(this.minuterieForme); this.rendu.monTrait = null; this.tableau.diffuser({ direct: null }) }
    if (g?.type === 'segment') { this.rendu.monSegment = null; this.rendu.apercu = null; this.rendu.cible = null }
    if (g?.type === 'rectangle' || g?.type === 'cercle') this.rendu.apercu = null
    if (g?.type === 'poignee') this.rendu.remplacement = null
    if (g?.type === 'longer' || g?.type === 'instrument') {
      this.rendu.apercu = null; this.rendu.mesure = null
      if (g.type === 'instrument') { this.instruments.set(g.nom, g.depart); this.majInstruments() }
    }
    if (g?.type === 'cadre') this.rendu.cadreSelection = null
    if (g?.type === 'deplacer') this.rendu.decalage = { dx: 0, dy: 0 }
    this.geste = null
    this.rendu.toutRedessiner()
  }

  private validerTrait(maintenu: boolean) {
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
    const trait: Trait = { id: uid(), type: 'trait', x: x0, y: y0, pts, couleur: t.couleur,
      taille: t.taille, opacite: t.opacite, pression: t.pression, z: Date.now(), auteur: this.tableau.moi }
    this.tableau.poser(this.page, trait)
    this.rendu.redessinerDirect()

    // Le tracé ressemble-t-il à une figure ? Elle remplace le trait dans
    // une SECONDE étape d'annulation : Ctrl+Z rend le tracé à main levée.
    if (this.outil !== 'stylo' || !this.reconnaissance) return
    const abs: P[] = []
    for (let i = 0; i < t.pts.length; i += 3) abs.push({ x: t.pts[i], y: t.pts[i + 1] })
    const r = reconnaitre(abs, maintenu, this.cam.z)
    if (!r) return
    const f = this.depuisReconnue(r, trait)
    this.tableau.nouveauGeste()
    this.tableau.doc.transact(() => {
      this.tableau.supprimer(this.page, [trait.id])
      this.tableau.poser(this.page, f)
    }, 'locale')
    this.selectionner(f.id)
    this.ui.message(r.nom + ' — Ctrl+Z pour garder le tracé à main levée')
  }

  /** Stylo posé et immobile un instant : la figure se forme aussitôt,
   *  sans attendre qu'on lève le stylo. */
  private attendreImmobilite() {
    clearTimeout(this.minuterieForme)
    if (this.outil !== 'stylo' || !this.reconnaissance) return
    this.minuterieForme = window.setTimeout(() => {
      if (this.geste?.type !== 'dessin') return
      this.geste = null
      this.validerTrait(true)
    }, 550)
  }

  // ---------- Figures géométriques ----------
  /** Une figure neuve, avec l'habillage courant */
  private figure(g: { type: 'polygone'; x: number; y: number; pts: number[]; ferme: boolean } | { type: 'cercle'; x: number; y: number; r: number }): Figure {
    return { ...g, id: uid(), z: Date.now(), auteur: this.tableau.moi, couleur: this.couleur, taille: Math.min(this.taille, 4.5) }
  }

  private depuisReconnue(r: Reconnue, t: Trait): Figure {
    const f = r.type === 'cercle'
      ? this.figure({ type: 'cercle', x: r.c.x, y: r.c.y, r: r.r })
      : this.figure({ type: 'polygone', ferme: r.ferme, ...versRelatif(r.pts) })
    f.couleur = t.couleur
    f.brut = { pts: t.pts.map((v, i) => i % 3 === 0 ? v + t.x - f.x : i % 3 === 1 ? v + t.y - f.y : v), taille: t.taille, pression: t.pression }
    return f
  }

  /** Rectangle (Maj : carré) ou cercle tiré à la souris ou au stylet */
  private figureTiree(g: { type: 'rectangle' | 'cercle'; x: number; y: number }, b: P, carre: boolean): Figure | null {
    if (g.type === 'cercle') return this.figure({ type: 'cercle', x: g.x, y: g.y, r: Math.hypot(b.x - g.x, b.y - g.y) })
    let l = b.x - g.x, h = b.y - g.y
    if (carre) { const c = Math.max(Math.abs(l), Math.abs(h)); l = Math.sign(l || 1) * c; h = Math.sign(h || 1) * c }
    const x1 = Math.min(g.x, g.x + l), x2 = Math.max(g.x, g.x + l), y1 = Math.min(g.y, g.y + h), y2 = Math.max(g.y, g.y + h)
    // Sens direct, en partant du coin en bas à gauche : A B C D
    return this.figure({ type: 'polygone', ferme: true, ...versRelatif([{ x: x1, y: y2 }, { x: x2, y: y2 }, { x: x2, y: y1 }, { x: x1, y: y1 }]) })
  }

  /** Polygone point par point : cliquer sur le premier point le ferme,
   *  cliquer deux fois au même endroit (ou Entrée) le laisse ouvert. */
  private pointDuPolygone(a: P, ecran: P) {
    const pts = this.polyEnCours
    if (!pts) { this.polyEnCours = [a]; return }
    const prem = this.cam.versEcran(pts[0].x, pts[0].y), der = this.cam.versEcran(pts[pts.length - 1].x, pts[pts.length - 1].y)
    if (pts.length >= 3 && Math.hypot(prem.x - ecran.x, prem.y - ecran.y) < 12) return this.finirPolygone(true)
    if (Math.hypot(der.x - ecran.x, der.y - ecran.y) < 6) return this.finirPolygone(false)
    pts.push(a)
  }

  finirPolygone(ferme: boolean) {
    const pts = this.polyEnCours
    this.annulerPolygone()
    if (pts && pts.length >= (ferme ? 3 : 2)) this.poserFigure(this.figure({ type: 'polygone', ferme, ...versRelatif(pts) }))
  }

  // ---------- Traits (segment, droite, demi-droite) ----------
  private astuceDeuxClics = false

  /** L'extrémité visée : accrochée à un point existant, ou tous les 15° avec Maj */
  private boutDuTrait(a: P, m: P, maj: boolean): P {
    if (!maj) return this.accrocher(m, a).p
    const b = this.aimanter(m)
    const ang = Math.round(Math.atan2(b.y - a.y, b.x - a.x) / (Math.PI / 12)) * (Math.PI / 12)
    const d = Math.hypot(b.x - a.x, b.y - a.y)
    return { x: a.x + d * Math.cos(ang), y: a.y + d * Math.sin(ang) }
  }

  /** Un point existant sous le pointeur s'éclaire : on sait qu'on s'y accrochera */
  private montrerAccroche(m: P, exclu?: P) {
    const o = this.accrocher(m, exclu)
    const c = o.accroche ? { a: o.p } : null
    const avant = this.rendu.cible
    if (!c && !avant) return
    if (c && avant && !avant.b && avant.a.x === c.a.x && avant.a.y === c.a.y) return
    this.rendu.cible = c
    this.rendu.redessinerDirect()
  }

  private apercuTrait(a: P, b: P) {
    this.rendu.monSegment = { x1: a.x, y1: a.y, x2: b.x, y2: b.y, couleur: this.couleur, taille: this.taille }
    // Une droite ou une demi-droite se voit prolongée pendant qu'on la trace
    this.rendu.apercu = null
    if (this.typeTrait !== 'segment' && Math.hypot(b.x - a.x, b.y - a.y) > 1) {
      const f = this.figure({ type: 'polygone', ferme: false, ...versRelatif([a, b]) })
      if (f.type === 'polygone') f.prolonge = this.typeTrait
      this.rendu.apercu = f
    }
    const o = this.accrocher(b, a)
    this.rendu.cible = o.accroche && o.p.x === b.x && o.p.y === b.y ? { a: b } : null
    this.rendu.redessinerDirect()
  }

  private finirTrait(a: P, b: P) {
    this.rendu.monSegment = null; this.rendu.apercu = null; this.rendu.cible = null
    if (Math.hypot(b.x - a.x, b.y - a.y) > 2) {
      const f = this.figure({ type: 'polygone', ferme: false, ...versRelatif([a, b]) })
      if (this.typeTrait !== 'segment' && f.type === 'polygone') f.prolonge = this.typeTrait
      this.poserFigure(f)
    }
    this.rendu.redessinerDirect()
  }

  private annulerTrait() {
    if (!this.traitEnAttente) return
    this.traitEnAttente = null
    this.rendu.monSegment = null; this.rendu.apercu = null; this.rendu.cible = null
    this.rendu.redessinerDirect()
  }

  private annulerPolygone() {
    if (!this.polyEnCours) return
    this.polyEnCours = null; this.rendu.apercu = null; this.rendu.cible = null; this.rendu.redessinerDirect()
  }

  private poserFigure(f: Forme) {
    this.tableau.nouveauGeste()
    this.tableau.poser(this.page, f)
    this.selectionner(f.id)
  }

  private selectionner(id: string) {
    this.selection.clear(); this.selection.add(id)
    this.rendu.redessinerDirect(); this.ui.maj()
  }

  /** Le panneau d'options d'un objet ne s'ouvre qu'à la demande */
  ouvrirOptions(f: Forme) {
    this.astuceOptions = true
    this.selection.clear(); this.selection.add(f.id)
    this.options = f.id
    this.rendu.redessinerDirect(); this.ui.maj()
  }

  /** La première fois qu'on prend un objet, on dit où sont ses options */
  private direOptions() {
    if (this.astuceOptions || this.selection.size !== 1) return
    const f = this.formeChoisie()
    if (!f || f.type === 'formule' || f.type === 'segment') return
    this.astuceOptions = true
    this.ui.message('Double-clic ou clic droit sur l\'objet : ses options')
  }

  // ---------- Morceaux d'une figure ----------
  /** Ce qu'il y a sous le pointeur (écran) dans la figure sélectionnée */
  /** Avec l'outil Sélection, toutes les figures ; avec un autre outil, seulement
   *  celle qui est sélectionnée (sinon on ne pourrait plus écrire près d'un point). */
  priseSous(s: P): { prise: Prise; f: Figure } | null {
    if (!this.peutEcrire || this.outil === 'main' || this.enLecture) return null
    const choisie = this.formeChoisie() ?? (this.partie && this.forme(this.partie.id))
    const candidates = this.outil === 'selection' ? [...(choisie ? [choisie] : []), ...[...this.formes].reverse()] : choisie ? [choisie] : []
    for (const f of candidates) {
      if (f.type !== 'polygone' && f.type !== 'cercle') continue
      const r = this.priseDans(f, s)
      if (r) return r
    }
    return null
  }

  private priseDans(f: Figure, s: P): { prise: Prise; f: Figure } | null {
    const pres = (w: P, r: number) => { const e = this.cam.versEcran(w.x, w.y); return Math.hypot(e.x - s.x, e.y - s.y) < r }
    if (f.sommets && f.noms) {
      const places = placesDesNoms(f)
      for (let i = 0; i < places.length; i++) {
        if (f.noms[i] && !f.styleNoms?.[i]?.cache && pres(places[i], Math.max(12, 15 * this.cam.z))) return { prise: { quoi: 'nom', i }, f }
      }
    }
    if (f.type === 'polygone') {
      const pts = sommetsDe(f)
      for (let i = 0; i < pts.length; i++) if (pres(pts[i], 11)) return { prise: { quoi: 'sommet', i }, f }
    } else {
      if (pres(poigneeDuRayon(f), 11)) return { prise: { quoi: 'rayon' }, f }
      if (pres({ x: f.x, y: f.y }, 10)) return { prise: { quoi: 'sommet', i: 0 }, f }   // le centre
    }
    return null
  }

  /** La figure, avec le morceau saisi amené en m (monde) */
  private manipuler(f: Figure, p: Prise, m: P): Figure {
    if (p.quoi === 'rayon' && f.type === 'cercle') {
      const a = this.aimanter(m)
      return { ...f, r: Math.max(4, Math.hypot(a.x - f.x, a.y - f.y)) }
    }
    if (p.quoi === 'sommet' && f.type === 'cercle') {
      const a = this.aimanter(m)
      return { ...f, x: a.x, y: a.y }
    }
    if (p.quoi === 'sommet' && f.type === 'polygone') {
      const pts = sommetsDe(f)
      pts[p.i] = this.aimanter(m)
      return { ...f, ...versRelatif(pts) }
    }
    if (p.quoi === 'nom') {
      const point = f.type === 'cercle' ? { x: f.x, y: f.y } : sommetsDe(f)[p.i]
      const n = f.type === 'cercle' ? 1 : f.pts.length / 2
      const posNoms = Array.from({ length: n }, (_, i) => f.posNoms?.[i] ?? null)
      posNoms[p.i] = bornerDecalage({ x: m.x - point.x, y: m.y - point.y })
      return { ...f, posNoms }
    }
    return f
  }

  /** Choisit un seul morceau d'une figure (null : plus rien) */
  choisirPartie(id: string | null, prise?: Prise) {
    this.partie = id && prise ? { id, prise } : null
    if (this.partie) this.selection.clear()
    this.rendu.partie = this.partie
    this.rendu.redessinerDirect(); this.ui?.maj()
  }

  /** Suppr sur un sommet le retire de la figure ; sur un nom, le masque */
  private supprimerPartie() {
    const p = this.partie, f = p && this.forme(p.id)
    if (!p || !f || (f.type !== 'polygone' && f.type !== 'cercle')) return
    this.ui.fermerMenuPartie()
    if (p.prise.quoi === 'nom') { this.reglerPartie(f, 'styleNoms', p.prise.i, { cache: true }); return this.choisirPartie(null) }
    if (p.prise.quoi !== 'sommet' || f.type !== 'polygone') return
    const n = f.pts.length / 2, i = p.prise.i
    if (n <= (f.ferme ? 3 : 2)) return this.ui.message('La figure n\'a plus assez de sommets : Suppr sur la figure l\'efface.')
    const sans = <T,>(l?: T[]) => l?.filter((_, k) => k !== i)
    const pts = sommetsDe(f).filter((_, k) => k !== i)
    this.habiller(f, { ...versRelatif(pts), noms: sans(f.noms), posNoms: sans(f.posNoms), stylePoints: sans(f.stylePoints), styleNoms: sans(f.styleNoms) } as Partial<Habillage>)
    this.choisirPartie(null)
  }

  /** Échap : d'abord annuler ce qui est en cours ; s'il n'y a rien,
   *  passer à la Sélection — et un second Échap rend l'outil d'avant. */
  echap() {
    if (this.placement) { const p = this.placement; this.placement = null; p.annuler(); return }
    if (this.traitEnAttente) { this.annulerTrait(); return }
    const enCours = !!this.polyEnCours || this.selection.size > 0 || !!this.partie
    this.annulerPolygone(); this.selection.clear(); this.choisirPartie(null)
    this.ui.fermerMenuPartie()
    if (!enCours && this.peutEcrire) {
      if (this.outil !== 'selection') {
        this.outilAvant = this.outil
        this.choisirOutil('selection')
        this.ui.message('Sélection : glisser un objet le déplace, glisser dans le vide déplace le tableau. Échap : revenir.')
      } else {
        this.choisirOutil(this.outilAvant)
        this.ui.message('Retour à l\'outil précédent')
      }
    }
    this.rendu.toutRedessiner(); this.ui.maj()
  }

  // ---------- Images ----------
  private cachePixels = new Map<string, HTMLImageElement>()

  private get banqueImages() { return this.tableau.doc.getMap('images') as Y.Map<string> }

  /** Les pixels d'une image, chargés une fois : la banque garde les données */
  private pixels(src: string): HTMLImageElement | null {
    let img = this.cachePixels.get(src)
    if (!img) {
      const donnees = this.banqueImages.get(src)
      if (!donnees) return null
      img = new Image()
      img.onload = () => this.rendu.toutRedessiner()
      img.src = donnees
      this.cachePixels.set(src, img)
    }
    return img
  }

  /** Importe un fichier image : réduit (1600 px au plus), rangé une fois dans
   *  le document, posé au milieu de la vue et sélectionné */
  async importerImage(fichier: Blob) {
    if (!fichier.type.startsWith('image/')) return this.ui.message('Ce fichier n\'est pas une image.')
    const url = URL.createObjectURL(fichier)
    try {
      const img = await new Promise<HTMLImageElement>((ok, ko) => { const i = new Image(); i.onload = () => ok(i); i.onerror = ko; i.src = url })
      const k = Math.min(1, 1600 / Math.max(img.naturalWidth, img.naturalHeight))
      const l = Math.round(img.naturalWidth * k), h = Math.round(img.naturalHeight * k)
      const cv = Object.assign(document.createElement('canvas'), { width: l, height: h })
      cv.getContext('2d')!.drawImage(img, 0, 0, l, h)
      const png = fichier.type === 'image/png' || fichier.type === 'image/gif'
      const donnees = cv.toDataURL(png ? 'image/png' : 'image/jpeg', 0.86)
      const src = uid()
      this.banqueImages.set(src, donnees)
      // Elle occupe au plus la moitié de la vue
      const v = this.cam.visible(this.rendu.l, this.rendu.h)
      const e = Math.min(v.l * 0.5 / l, v.h * 0.6 / h, 1 / this.cam.z)
      const f: Forme = { id: uid(), type: 'image', src, l, h, m: [e, 0, 0, e],
        x: v.x + v.l / 2 - l * e / 2, y: v.y + v.h / 2 - h * e / 2, z: Date.now(), auteur: this.tableau.moi }
      this.poserFigure(f)
      this.ui.message('Image posée. L\'outil Point (X) place ses sommets ; « Transformer » construit son symétrique.')
    } catch { this.ui.message('Impossible de lire cette image.') }
    finally { URL.revokeObjectURL(url) }
  }

  /** Désigner sur le tableau une droite ou un point parmi des candidats :
   *  ce qui est visé s'éclaire ; un clic le choisit ; Échap renonce. */
  designer(genre: 'axe' | 'centre', candidats: { cle: string; a: P; b?: P }[], fini: (cle: string) => void) {
    if (!candidats.length) return this.ui.message(genre === 'axe' ? 'Aucune droite sur la page : trace l\'axe.' : 'Aucun point sur la page : trace le centre.')
    const vise = (w: P) => {
      const s = this.cam.versEcran(w.x, w.y)
      let mieux: { cle: string; a: P; b?: P } | null = null, d = 16
      for (const c of candidats) {
        const A = this.cam.versEcran(c.a.x, c.a.y)
        const e = c.b ? (() => { const B = this.cam.versEcran(c.b!.x, c.b!.y); return distanceAuSegment(s.x, s.y, A.x, A.y, B.x, B.y) })() : Math.hypot(A.x - s.x, A.y - s.y)
        if (e < d) { d = e; mieux = c }
      }
      return mieux
    }
    const fin = () => { this.rendu.cible = null; this.rendu.redessinerDirect() }
    const mode = {
      bouge: (w: P) => { const c = vise(w); this.rendu.cible = c ? { a: c.a, b: c.b } : null; this.rendu.redessinerDirect() },
      clic: (w: P) => {
        const c = vise(w)
        if (!c) { this.placement = mode; return this.ui.message(genre === 'axe' ? 'Clique sur une droite (ou Échap).' : 'Clique sur un point (ou Échap).') }
        fin(); fini(c.cle)
      },
      annuler: fin,
    }
    this.placement = mode
    this.ui.message(genre === 'axe' ? 'Clique sur la droite qui sert d\'axe.' : 'Clique sur le point qui sert de centre.')
  }

  /** Tracer un axe tout de suite : deux clics. Il devient un segment de la page. */
  tracerAxe(fini: (id: string) => void) {
    let A: P | null = null
    const mode = {
      bouge: (w: P) => {
        if (!A) return
        const f = this.nouvelleFigure({ type: 'polygone', ferme: false, pts: [A, this.aimanter(w)] }, { couleur: '#1f5fbf', taille: 2.5 })
        f.tirets = true; this.rendu.apercu = f; this.rendu.redessinerDirect()
      },
      clic: (w: P) => {
        const p = this.aimanter(w)
        if (!A) { A = p; this.placement = mode; return this.ui.message('Second point de l\'axe…') }
        this.rendu.apercu = null
        if (Math.hypot(p.x - A.x, p.y - A.y) * this.cam.z < 8) { this.placement = mode; return }
        const f = this.nouvelleFigure({ type: 'polygone', ferme: false, pts: [A, p] }, { couleur: '#1f5fbf', taille: 2.5 })
        f.tirets = true
        this.tableau.nouveauGeste()
        fini(this.poserFigureSeule(f))
      },
      annuler: () => { this.rendu.apercu = null; this.rendu.redessinerDirect() },
    }
    this.placement = mode
    this.ui.message('Trace l\'axe : clique son premier point, puis le second.')
  }

  /** Tracer le centre tout de suite : un clic. C'est un point nommé (O…). */
  tracerCentre(fini: (nom: string) => void) {
    this.placement = {
      bouge: () => {},
      clic: (w: P) => {
        const nom = nomsLibres(1, this.formes, true)[0]
        const f = this.nouvelleFigure({ type: 'polygone', ferme: false, pts: [this.aimanter(w)] })
        f.sommets = true; f.noms = [nom]
        this.tableau.nouveauGeste()
        this.poserFigureSeule(f)
        fini(nom)
      },
      annuler: () => {},
    }
    this.ui.message('Clique là où placer le centre.')
  }

  /** Les droites tracées sur la page (segments), pour servir d'axe */
  droitesDeLaPage(sauf?: string): { nom: string; a: P; b: P; id: string }[] {
    const r: { nom: string; a: P; b: P; id: string }[] = []
    let k = 0
    for (const f of this.formes) {
      if (f.id === sauf || f.type !== 'polygone' || f.ferme || f.pts.length !== 4) continue
      const [a, b] = sommetsDe(f)
      const n = f.sommets && f.noms?.[0] && f.noms?.[1] ? `Droite (${f.noms[0]}${f.noms[1]})` : `Droite tracée n° ${++k}`
      r.push({ nom: n, a, b, id: f.id })
    }
    return r
  }

  // ---------- Pour le constructeur ----------
  /** Les points nommés de la page : ils servent dans un programme de construction */
  pointsNommes(): Map<string, P> {
    const r = new Map<string, P>()
    for (const f of this.formes) {
      if ((f.type !== 'polygone' && f.type !== 'cercle') || !f.sommets || !f.noms) continue
      const pts = f.type === 'cercle' ? [{ x: f.x, y: f.y }] : sommetsDe(f)
      f.noms.forEach((n, i) => { if (n && pts[i]) r.set(n, pts[i]) })
    }
    return r
  }

  /** Une figure neuve aux réglages du moment (ou à ceux d'un trait de construction) */
  nouvelleFigure(g: { type: 'polygone'; ferme: boolean; pts: P[] } | { type: 'cercle'; x: number; y: number; r: number },
    style?: { couleur: string; taille: number }): Figure {
    const f = g.type === 'polygone' ? this.figure({ type: 'polygone', ferme: g.ferme, ...versRelatif(g.pts) }) : this.figure(g)
    if (style) { f.couleur = style.couleur; f.taille = style.taille }
    return f
  }

  /** Pose une forme sans la sélectionner ; rend son identifiant */
  poserFigureSeule(f: Forme): string {
    this.tableau.poser(this.page, f)
    return f.id
  }

  forme(id: string): Forme | null { return this.formes.find(f => f.id === id) ?? null }

  /** Change le réglage du point (ou du nom) n° i d'une figure */
  reglerPartie(f: Figure, cle: 'stylePoints' | 'styleNoms', i: number, patch: Record<string, unknown>) {
    const n = f.type === 'cercle' ? 1 : f.pts.length / 2
    const liste = Array.from({ length: n }, (_, k) => (f[cle]?.[k] ?? null) as Record<string, unknown> | null)
    const nouveau: Record<string, unknown> = { ...(liste[i] ?? {}), ...patch }
    for (const k of Object.keys(nouveau)) if (nouveau[k] === undefined) delete nouveau[k]
    liste[i] = Object.keys(nouveau).length ? nouveau : null
    this.habiller(f, { [cle]: liste } as Partial<Habillage>)
  }

  /** Renomme un seul point */
  renommerPoint(f: Figure, i: number, nom: string) {
    const n = f.type === 'cercle' ? 1 : f.pts.length / 2
    const noms = Array.from({ length: n }, (_, k) => f.sommets ? f.noms?.[k] ?? '' : '')
    noms[i] = nom.trim()
    // Les autres points sans nom reçoivent des lettres libres sur la page
    const vides = noms.map((x, k) => x ? -1 : k).filter(k => k >= 0)
    if (vides.length) {
      const pris = this.formes.filter(g => g.id !== f.id)
      const libres = nomsLibres(vides.length, [...pris, { ...f, noms: noms.filter(Boolean) } as Forme])
      vides.forEach((k, j) => { noms[k] = libres[j] })
    }
    this.habiller(f, { noms, sommets: true })
  }

  /** Le nom revient à sa place automatique */
  replacerNom(f: Figure, i: number) {
    if (!f.posNoms) return
    const posNoms = [...f.posNoms]; posNoms[i] = null
    this.habiller(f, { posNoms })
  }

  // ---------- Panneau d'options ----------
  /** La forme seule sélectionnée, s'il n'y en a qu'une et qu'aucun geste n'est en cours */
  formeChoisie(): Forme | null {
    if (this.selection.size !== 1 || (this.geste && this.geste.type !== 'pan' && this.geste.type !== 'pinch' && this.geste.type !== 'poignee')) return null
    const id = [...this.selection][0]
    return this.formes.find(f => f.id === id) ?? null
  }

  habiller(f: Forme, patch: Partial<Habillage> & Partial<Trait>) {
    this.tableau.nouveauGeste()
    this.tableau.modifier(this.page, [{ id: f.id, patch: patch as Partial<Forme> }])
  }

  basculerSommets(f: Figure) {
    const n = f.type === 'cercle' ? 1 : f.pts.length / 2
    const noms = f.noms?.length === n ? f.noms : nomsLibres(n, this.formes.filter(g => g.id !== f.id), f.type === 'cercle')
    this.habiller(f, { sommets: !f.sommets, noms })
  }

  renommer(f: Figure, texte: string) {
    // « ABCD » ou « A B C D » ou « A' B' C' D' »
    const n = f.type === 'cercle' ? 1 : f.pts.length / 2
    const morceaux = texte.includes(' ') ? texte.trim().split(/\s+/) : texte.match(/[A-Za-zΩ](?:'+|_\d+|\d+)?/g) ?? []
    if (morceaux.length !== n) return this.ui.message(`Il faut ${n} nom${n > 1 ? 's' : ''}.`)
    this.habiller(f, { noms: morceaux, sommets: true })
  }

  revenirMainLevee(f: Figure) {
    if (!f.brut) return
    const t: Trait = { id: uid(), type: 'trait', x: f.x, y: f.y, pts: f.brut.pts, couleur: f.couleur, taille: f.brut.taille,
      opacite: 1, pression: f.brut.pression, z: f.z, auteur: this.tableau.moi }
    this.tableau.nouveauGeste()
    this.tableau.doc.transact(() => { this.tableau.supprimer(this.page, [f.id]); this.tableau.poser(this.page, t) }, 'locale')
    this.selectionner(t.id)
  }

  dupliquer(f: Forme) {
    const copie = image(f, { type: 'translation', dx: CM, dy: CM }, this.tableau.moi)
    if ((copie.type === 'polygone' || copie.type === 'cercle') && f.type === copie.type) copie.noms = f.noms && nomsLibres(f.noms.length, this.formes, copie.type === 'cercle')
    this.poserFigure(copie)
  }

  transformer(f: Forme, t: Transformation) {
    const img = image(f, t, this.tableau.moi)
    // Les points repérés sur une image ont aussi leur image, liée à la nouvelle
    for (const g of this.liees(f.id)) this.tableau.poser(this.page, { ...image(g, t, this.tableau.moi), lie: img.id } as Forme)
    this.poserFigure(img)
  }

  /** L'outil Point : un clic pose un point marqué d'une croix, nommé de la
   *  lettre libre suivante. Posé sur une image, il lui est lié : il la suit,
   *  et sert à construire son image par une transformation. */
  private placerPoint(m: P) {
    const p = this.aimanter(m)
    const sous = [...this.formes].reverse().find(f => f.type === 'image' && touche(f, p.x, p.y, 0, g => this.rendu.boite(g)))
    const f = this.nouvelleFigure({ type: 'polygone', ferme: false, pts: [p] })
    f.sommets = true
    f.noms = nomsLibres(1, this.formes)
    f.stylePoints = [{ marque: 'croix' }]
    if (sous) f.lie = sous.id
    this.tableau.nouveauGeste()
    this.poserFigureSeule(f)
    this.rendu.redessinerDirect()
  }

  /** Les figures liées à une image (elles la suivent) */
  liees(id: string): Figure[] {
    return this.formes.filter((g): g is Figure => (g.type === 'polygone' || g.type === 'cercle') && g.lie === id)
  }

  /** La forme suit-elle une image sélectionnée ? */
  private lieeA(f: Forme) {
    return (f.type === 'polygone' || f.type === 'cercle') && !!f.lie && this.selection.has(f.lie)
  }

  /** Origine du repère de la page (pour les transformations), si elle en a un */
  get origineRepere(): P | null { return this.fond === 'repere' ? this.tableau.origineDe(this.page) : null }

  sommetsDe(f: Polygone) { return sommetsDe(f) }

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
    // Pavé tactile : deux doigts qui glissent déplacent le tableau, pincer
    // zoome (le navigateur l'envoie avec ctrlKey). Une molette de souris
    // zoome : elle se reconnaît à ses crans (lignes, ou pas entiers et larges
    // sans aucun mouvement de côté). Ctrl/Cmd + défilement zoome toujours.
    const molette = e.deltaMode !== 0 || (e.deltaX === 0 && Number.isInteger(e.deltaY) && Math.abs(e.deltaY) >= 50)
    if (e.ctrlKey || e.metaKey || molette) {
      const d = e.deltaMode === 1 ? e.deltaY * 33 : e.deltaY
      this.cam.zoomerAutour(s.x, s.y, Math.exp(-d * (e.ctrlKey && !molette ? 0.01 : 0.0015)))
    } else this.cam.deplacer(-e.deltaX, -e.deltaY)
    this.vueChangee(true)
  }

  private clavier(e: KeyboardEvent) {
    if (this.enLecture) return
    const cible = e.target as HTMLElement
    // Dans une fenêtre (publier, formule…), les raccourcis du tableau se taisent
    if (cible.closest('input, textarea, select, [contenteditable], dialog')) return
    const ctrl = e.ctrlKey || e.metaKey
    if (e.code === 'Space') { this.espace = true; e.preventDefault(); return }
    if (ctrl && e.key.toLowerCase() === 'z') { e.preventDefault(); e.shiftKey ? this.retablir() : this.annuler(); return }
    if (ctrl && e.key.toLowerCase() === 'y') { e.preventDefault(); this.retablir(); return }
    if (e.key === 'Delete' || e.key === 'Backspace') { this.supprimerSelection(); return }
    if (e.key === 'PageDown') { this.pageSuivante(1); return }
    if (e.key === 'PageUp') { this.pageSuivante(-1); return }
    if (e.key === 'Enter' && this.polyEnCours) { this.finirPolygone(false); return }
    if (e.key === 'Escape') { this.echap(); return }
    // Les flèches poussent la sélection : 1 mm, ou 1 cm avec Maj
    const fleches: Record<string, [number, number]> = { ArrowLeft: [-1, 0], ArrowRight: [1, 0], ArrowUp: [0, -1], ArrowDown: [0, 1] }
    if (fleches[e.key] && this.selection.size && this.peutEcrire) {
      e.preventDefault()
      const k = e.shiftKey ? CM : CM / 10, [dx, dy] = fleches[e.key]
      this.tableau.modifier(this.page, this.formes.filter(f => this.selection.has(f.id) || this.lieeA(f)).map(f => ({ id: f.id, patch: { x: f.x + dx * k, y: f.y + dy * k } })))
      return
    }
    if (ctrl || !this.peutEcrire) return
    const raccourcis: Record<string, Outil> = { p: 'stylo', h: 'surligneur', e: 'gomme', x: 'point', l: 'segment', f: 'formule', v: 'selection' }
    const formes: Record<string, TypeForme> = { r: 'rectangle', c: 'cercle', g: 'polygone' }
    const k = e.key.toLowerCase()
    if (formes[k]) { this.typeForme = formes[k]; this.choisirOutil('forme'); return }
    const o = raccourcis[k]
    if (o) this.choisirOutil(o)
  }
}

/** Où l'on attrape un cercle pour changer son rayon : en haut à droite */
export function poigneeDuRayon(f: { x: number; y: number; r: number }): P {
  return { x: f.x + f.r * Math.SQRT1_2, y: f.y - f.r * Math.SQRT1_2 }
}
