// =============================================================
// L'APPLICATION
// Elle relie trois choses qui s'ignorent : le document (ce qui est
// écrit), la caméra (où l'on regarde) et le rendu (ce qu'on voit).
// Les gestes arrivent ici, deviennent des formes, et partent dans
// le document. Le rendu, lui, ne fait que lire.
// =============================================================
import type { Tableau } from './document'
import { Camera, vuePour } from './camera'
import { Rendu } from './rendu'
import { chevauche, distanceAuSegment, rectangle, touche } from './geometrie'
import type { Figure, Fond, Forme, Formule, Habillage, Outil, Polygone, Trait, TypeForme } from './types'
import { CM, uid } from './types'
import type { P, Reconnue, Transformation } from './formes'
import type { Bord, EtatInstrument, NomInstrument, Partie } from './instruments'
import { angleLisible, bords, etatParDefaut, toucher } from './instruments'
import * as Y from 'yjs'
import katex from 'katex'
import { Immobilite, bornerDecalage, image, nomsLibres, placesDesNoms, reconnaitre, sommetsDe, versRelatif } from './formes'
import { tempsDesPoints } from './revoir/main-levee'
import { Piste } from './piste'
import type { TraceInstrument } from './piste'
import { boiteDe } from './revoir/bobine'
import type { Boite } from './revoir/bobine'
import { choisirDoigt as reglerDoigt, leDoigtDeplace, noterStyletDirect, reglages } from './reglages'
import type { Doigt } from './reglages'
import { DOUBLE_TOUCHER, contactLarge, depasseSeuil, doubleToucher, ecranTactile, messageOptions, messageSecondPoint, nouveauDepart, typePointeur } from './pointeurs'
import type { Depart, Toucher, TypePointeur } from './pointeurs'
import { MAC, lireMolette } from './navigateur'
import { avale } from './menus'
import type { TraitDirect } from './rendu'
import type { Vue } from './session'
import { ecrireSession, lireSession, oublierSession } from './session'

export const COULEURS = [
  { nom: 'Noir', valeur: '#1b2230' },
  { nom: 'Bleu', valeur: '#1f5fbf' },
  { nom: 'Rouge', valeur: '#d0342c' },
  { nom: 'Vert', valeur: '#1e8a4c' },
]
export const TAILLES = [{ nom: 'Fin', valeur: 2.5 }, { nom: 'Moyen', valeur: 4.5 }, { nom: 'Épais', valeur: 9 }]

/** La vue d'une page neuve : 100 %, l'origine en haut à gauche */
const VUE_NEUTRE = { x: 120, y: 120, z: 1 }

/** L'heure d'un événement du stylet (ms, horloge de performance.now()) : celle
 *  où le stylet a touché ce point, pas celle où on le traite. Un navigateur qui
 *  donnerait une autre horloge est ramené à maintenant. */
function heureDe(e: Event): number {
  const maintenant = performance.now(), t = e.timeStamp
  return t > 0 && t <= maintenant + 100 ? t : maintenant
}

export interface Interface {
  maj(): void
  editerFormule(latex: string, ecranX: number, ecranY: number): Promise<string | null>
  /** Un message en bas de l'écran ; avec une action, un bouton à côté du texte */
  message(texte: string, action?: { libelle: string; faire: () => void }): void
  /** Le menu du rôle du doigt (dessine, déplace, auto) */
  ouvrirReglageDoigt(): void
  ouvrirMenuPartie(id: string, prise: Prise, clientX: number, clientY: number): void
  fermerMenuPartie(): void
  /** Ferme ce qui flotte au-dessus du tableau (un petit menu, le menu d'un
   *  morceau, le panneau d'options sauf garderOptions, la liste des
   *  instruments) ; vrai si quelque chose était ouvert */
  fermerMenus(garderOptions?: boolean): boolean
  /** Ce qu'on voit du tableau entre les barres (coordonnées de la zone) */
  zoneLibre(): { x: number; y: number; l: number; h: number }
  /** Un fichier glissé sur le tableau (.memc, ou .mem) : comme « Ouvrir un tableau » */
  ouvrirTableau(f: File): void
}

type Geste =
  // pointeur : le seul qui la déplace (le doigt resté après un pincement) ;
  // toucher : le doigt « qui déplace » ; levé sans avoir glissé, il choisit l'objet touché
  | { type: 'pan'; dernierX: number; dernierY: number; vide?: boolean; pointeur?: number; toucher?: boolean }
  | { type: 'pinch'; dist: number; cx: number; cy: number }
  // apresMenu : l'appui qui a commencé le trait fermait un menu ; levé sans
  // avoir glissé, il ne pose rien. surObjet : il est parti d'une figure ou
  // d'une formule (un double-clic peut suivre, voir mettreEnAttente)
  | { type: 'dessin'; pointeur: number; apresMenu?: boolean; surObjet?: string }
  | { type: 'segment'; x: number; y: number }
  | { type: 'rectangle' | 'cercle'; x: number; y: number }
  | { type: 'poignee'; prise: Prise; f: Figure; bouge: boolean }
  | { type: 'instrument'; nom: NomInstrument; quoi: Partie; depart: EtatInstrument; x: number; y: number; ecart: number; balayage: number; dernier: number }
  | { type: 'longer'; bord: Bord; t0: number }
  // stylet : le bout gomme du stylet, quel que soit l'outil en main
  | { type: 'gomme'; effaces: Set<string>; stylet?: boolean }
  // doigt : pris par le doigt « qui déplace » ; levé sans avoir glissé, il choisit l'objet touché.
  // retirer : Maj + clic sur un objet déjà sélectionné ; levé sans avoir glissé, il en sort
  | { type: 'deplacer'; x: number; y: number; bouge: boolean; doigt?: boolean; retirer?: string }
  | { type: 'cadre'; x: number; y: number }
  | { type: 'formule' }

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
  /** La vue de chaque page (son centre et son zoom), retrouvée au rechargement */
  private vues = new Map<string, Vue>()
  /** La page qu'on regardait au dernier passage (voir pageDeDepart) */
  private pageSession: string | null = null
  private pointeurs = new Map<number, { x: number; y: number; type: string }>()
  private geste: Geste | null = null
  /** Le pointeur du dernier appui : les messages en parlent (« clic droit » ou non) */
  dernierPointeur: TypePointeur = 'mouse'
  /** Où et quand le geste en cours a commencé, et s'il est devenu un glisser */
  private depart: Depart = nouveauDepart(0, 0, -1, 'mouse')
  /** Les paumes : posées sur l'écran, elles ne font rien jusqu'à leur lever */
  private ignores = new Set<number>()
  private espace = false
  private dernierMouvement = 0        // pour savoir si le stylet est resté immobile
  /** Où la plume s'est posée ou a bougé pour la dernière fois (voir Immobilite) */
  private immobilite = new Immobilite({ x: 0, y: 0 })
  /** L'heure de chaque point du trait en cours : le replay le retracera à ce rythme */
  private heuresDuTrait: number[] = []
  private polyEnCours: P[] | null = null
  private minuterieForme = 0
  /** Le point d'encre d'un simple toucher du Stylo sur un objet : il attend
   *  300 ms un second toucher (le double-clic, qui ouvre les options de
   *  l'objet) avant d'être posé, et reste dessiné en attendant */
  private pointEnAttente: { trait: Trait; ms: number[]; page: string; objet: string; x: number; y: number;
    dessin: TraitDirect; minuterie: number } | null = null
  /** L'heure du dernier double appui traité au pointerdown : le dblclick du
   *  navigateur qui le suit ne refait rien */
  private doubleTraite = -Infinity
  /** Le clic qui suit un double appui traité est encore à venir (voir brancherGestes) */
  private clicFantome = false
  /** Le dernier simple toucher du doigt sur un objet (outil Sélection, ou
   *  doigt qui déplace) : un second, tout près et tout de suite, ouvre ses
   *  options (voir secondToucher) */
  private toucherPrecedent: (Toucher & { objet: string; page: string }) | null = null
  /** Ce second toucher, posé : levé sans avoir glissé, il ouvre les options de l'objet */
  private doubleEnCours: { objet: string; pointeur: number } | null = null
  /** Les instruments posés (dans l'ordre d'empilement) et leur réglage */
  readonly instruments = new Map<NomInstrument, EtatInstrument>()
  /** Ce que la classe voit des instruments, noté pour le replay (voir piste.ts) */
  readonly piste: Piste

  constructor(readonly tableau: Tableau, private zone: HTMLElement) {
    this.rendu = new Rendu(this.cam, zone)
    this.majPoignees()
    this.cam.x = VUE_NEUTRE.x; this.cam.y = VUE_NEUTRE.y
    const session = lireSession()
    if (session) { this.vues = session.vues; this.pageSession = session.page }
    // Ce que la couche des instruments montre part dans la piste : les gestes,
    // le constructeur, ce qu'on montre ou range, l'état rendu au chargement
    this.piste = new Piste(m => tableau.noterPiste(m), () => tableau.pageVue)
    this.rendu.temoin = (i, a, t) => this.piste.peinture(i, a, t)
    this.rendu.temoinDirect = t => this.piste.peintureDirect(t)
    window.addEventListener('pagehide', () => this.piste.vider())

    tableau.pages.observeDeep(() => this.rafraichir())
    tableau.ordre.observe(() => this.verifierPage())

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
      if (f && !this.enLecture) { e.preventDefault(); this.importerImage(f) }
    })
    zone.addEventListener('dragover', e => { if (e.dataTransfer?.types.includes('Files')) e.preventDefault() })
    zone.addEventListener('drop', e => {
      const fichiers = [...(e.dataTransfer?.files ?? [])]
      // Un tableau enregistré (.memc), ou un film élève (.mem) qu'on refusera
      // avec une phrase claire : comme « Ouvrir un tableau »
      const tableau = fichiers.find(x => /\.memc?$/i.test(x.name))
      if (tableau) { e.preventDefault(); this.ui.ouvrirTableau(tableau); return }
      const f = fichiers.find(x => x.type.startsWith('image/'))
      if (f) { e.preventDefault(); this.importerImage(f) }
    })

    // La vue : toucher le tableau arrête un cadrage en cours (en capture,
    // avant tout geste) ; le zoom au clavier se fait autour du pointeur
    // s'il est sur le tableau ; la session se note quand on quitte la page
    zone.addEventListener('pointerdown', () => this.arreterAnimation(), true)
    zone.addEventListener('pointermove', e => { this.pointeurSurZone = { clientX: e.clientX, clientY: e.clientY } })
    zone.addEventListener('pointerleave', () => { this.pointeurSurZone = null })
    window.addEventListener('pagehide', () => this.noterSession())
    // Un appui hors du tableau (un bouton, la revue qui s'ouvre…) pose tout
    // de suite le point d'encre qui attendait un double-clic
    document.addEventListener('pointerdown', e => { if (!zone.contains(e.target as Node)) this.viderPointEnAttente() }, true)
    window.addEventListener('pagehide', () => this.viderPointEnAttente())
    document.addEventListener('visibilitychange', () => { if (document.hidden) this.noterSession() })
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
        const f = this.rendu.apercu
        this.piste.trace(f ? { k: 'arc', x: e.x, y: e.y, r: e.r, a0: g.depart.a, a1: e.a, couleur: f.couleur, taille: f.taille } : null)
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
    this.piste.trace(null)
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
    const f = this.rendu.apercu = this.figure({ type: 'polygone', ferme: false, ...versRelatif([a, z]) })
    this.piste.trace(this.traceLe(f))
    this.rendu.mesure = { texte: (Math.round(Math.abs(t - g.t0) / CM * 10) / 10).toString().replace('.', ',') + ' cm', x: m.x, y: m.y }
    this.rendu.redessinerDirect()
  }

  /** Le tracé le long d'un bord (un segment de l'aperçu), pour la piste */
  traceLe(f: Figure): TraceInstrument | null {
    if (f.type !== 'polygone' || f.pts.length !== 4) return null
    return { k: 'seg', ax: f.x, ay: f.y, zx: f.x + f.pts[2], zy: f.y + f.pts[3], couleur: f.couleur, taille: f.taille }
  }

  get pages() { return this.tableau.ordre.toArray() }
  get fond(): Fond { return this.tableau.fondDe(this.page) }

  // ---------- Pages ----------
  /** Chaque page garde sa vue. Une page qu'on n'a pas encore regardée
   *  s'ouvre sur une vue neutre si elle est vide (une page neuve ne reprend
   *  pas le zoom de celle qu'on quitte), sur tout son contenu sinon (un
   *  tableau d'avant, un fichier ouvert). */
  allerPage(id: string) {
    this.viderPointEnAttente()
    if (!id || id === this.page) return
    this.arreterAnimation()
    if (this.page && this.rendu.l > 0) this.vues.set(this.page, this.vueActuelle())
    this.page = id
    this.tableau.pageVue = id
    this.appliquerVue(id)
    this.selection.clear()
    this.rafraichir()
    this.noterSession()
  }

  /** La page où reprendre : celle de la session si elle existe encore, sinon la première */
  pageDeDepart(): string {
    // Les vues d'un autre tableau (aucune page commune) ne servent jamais :
    // leurs pages n'existent pas ici, et la prochaine écriture les oublie
    const p = this.pages
    return this.pageSession && p.includes(this.pageSession) ? this.pageSession : p[0]
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
    if (this.pages.length <= 1) return this.ui.message('Il faut garder au moins une page.')
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
    this.viderPointEnAttente()
    this.annulerPolygone()
    this.annulerTrait()
    this.survol = null; this.rendu.survol = null
    if (this.partie) this.choisirPartie(null)
    this.outil = o
    if (o !== 'selection') this.selection.clear()
    this.majPoignees()
    this.rendu.gomme = null
    this.rendu.toutRedessiner()
    this.zone.dataset.outil = o
    this.ui?.maj()
  }

  /** L'interface est remise à jour APRÈS avoir vidé la sélection : le
   *  rafraîchissement déclenché par l'annulation passe avant, et laisserait
   *  le panneau d'options ouvert sur une figure qui n'est plus choisie. */
  annuler() {
    this.viderPointEnAttente()
    this.tableau.annulation.undo()
    this.selection.clear(); this.rendu.redessinerDirect(); this.ui?.maj()
  }
  retablir() { this.viderPointEnAttente(); this.tableau.annulation.redo() }

  supprimerSelection() {
    if (this.partie) return this.supprimerPartie()
    if (!this.selection.size) return
    this.tableau.nouveauGeste()
    this.tableau.supprimer(this.page, [...this.selection])
    this.selection.clear()
  }

  // ---------- La vue ----------
  /** Le cadrage en cours (requestAnimationFrame), et où il mène */
  private animation = 0
  private cible: { x: number; y: number; z: number } | null = null
  /** Le dernier endroit du pointeur sur le tableau (null : il est ailleurs) */
  private pointeurSurZone: { clientX: number; clientY: number } | null = null
  /** Safari sur Mac pince par gesturechange : la molette ne zoome pas en double */
  pinceSafari = false
  private minuterieSession = 0
  /** Le tableau du navigateur vient d'être remplacé (ici ou dans un autre
   *  onglet) : jusqu'au rechargement, plus rien ne s'écrit dans la session */
  private sessionArretee = false
  /** Les boîtes des formes (une forme modifiée est un nouvel objet) */
  private boites = new WeakMap<Forme, Boite | null>()

  /** Le centre de ce qu'on voit entre les barres (écran) */
  private centreLibre() {
    const r = this.ui?.zoneLibre() ?? { x: 0, y: 0, l: this.rendu.l, h: this.rendu.h }
    return { x: r.x + r.l / 2, y: r.y + r.h / 2 }
  }

  arreterAnimation() {
    if (this.animation) cancelAnimationFrame(this.animation)
    this.animation = 0; this.cible = null
  }

  /** Amène la caméra en c, en douceur : le zoom change géométriquement, et le
   *  point du monde au centre de la zone libre va en ligne droite de son départ
   *  à son arrivée. Un pointeur posé sur le tableau, la molette, le clavier ou
   *  un changement de page l'arrêtent. */
  allerVers(c: { x: number; y: number; z: number }, duree = 250) {
    this.arreterAnimation()
    const cam = this.cam
    const calme = typeof matchMedia === 'function' && matchMedia('(prefers-reduced-motion: reduce)').matches
    if (duree <= 0 || calme || (cam.x === c.x && cam.y === c.y && cam.z === c.z)) {
      cam.x = c.x; cam.y = c.y; cam.z = c.z
      this.vueChangee(); return
    }
    const s = this.centreLibre(), z0 = cam.z, z1 = c.z
    const a = cam.versMonde(s.x, s.y), b = { x: (s.x - c.x) / z1, y: (s.y - c.y) / z1 }
    const debut = performance.now()
    this.cible = { ...c }
    const pas = () => {
      const u = Math.max(0, Math.min(1, (performance.now() - debut) / duree))
      if (u >= 1) {
        this.animation = 0; this.cible = null
        cam.x = c.x; cam.y = c.y; cam.z = c.z
      } else {
        const k = 1 - (1 - u) ** 3
        const z = z0 * (z1 / z0) ** k
        cam.z = z
        cam.x = s.x - (a.x + (b.x - a.x) * k) * z
        cam.y = s.y - (a.y + (b.y - a.y) * k) * z
        this.animation = requestAnimationFrame(pas)
      }
      this.vueChangee()
    }
    this.animation = requestAnimationFrame(pas)
  }

  /** La vue qu'on a : le point du monde au centre de l'écran, et le zoom */
  private vueActuelle(): Vue {
    const c = this.cam.versMonde(this.rendu.l / 2, this.rendu.h / 2)
    return { cx: c.x, cy: c.y, z: this.cam.z }
  }

  /** La vue de la page qu'on ouvre (voir allerPage) */
  private appliquerVue(id: string) {
    const cam = this.cam, l = this.rendu.l, h = this.rendu.h
    const v = this.vues.get(id)
    let c = VUE_NEUTRE
    if (l > 0 && h > 0) {
      if (v) c = { x: l / 2 - v.cx * v.z, y: h / 2 - v.cy * v.z, z: v.z }
      else {
        // this.formes n'est relue qu'à rafraichir : on lit celles de la page
        const formes = this.tableau.formesDe(id)
        const b = formes?.size ? this.boiteDuContenu(formes.values()) : null
        if (b) c = vuePour(b, this.ui?.zoneLibre() ?? { x: 0, y: 0, l, h }, 1)
      }
    }
    cam.x = c.x; cam.y = c.y; cam.z = c.z
  }

  private boiteDeForme(f: Forme): Boite | null {
    // Une formule se mesure à l'écran (son rendu KaTeX) : pas de cache
    if (f.type === 'formule') return this.rendu.boite(f)
    let b = this.boites.get(f)
    if (b === undefined) { b = boiteDe(f); this.boites.set(f, b) }
    return b
  }

  /** La boîte de ce qui est écrit (null : rien). Une droite compte par ses deux
   *  points, pas par son étendue à l'écran, qui dépend de la vue. */
  boiteDuContenu(formes: Iterable<Forme> = this.formes): Boite | null {
    let x1 = Infinity, y1 = Infinity, x2 = -Infinity, y2 = -Infinity
    for (const f of formes) {
      const b = this.boiteDeForme(f)
      if (!b) continue
      x1 = Math.min(x1, b.x); y1 = Math.min(y1, b.y); x2 = Math.max(x2, b.x + b.l); y2 = Math.max(y2, b.y + b.h)
    }
    return x1 === Infinity ? null : { x: x1, y: y1, l: x2 - x1, h: y2 - y1 }
  }

  /** Tout ce qui est sur la page, jamais au-delà de 100 % : un petit contenu
   *  reste à 100 % et se centre */
  toutVoir() {
    const b = this.boiteDuContenu()
    if (!b) { this.allerVers(VUE_NEUTRE); this.ui.message('La page est vide.'); return }
    this.allerVers(vuePour(b, this.ui.zoneLibre(), 1))
  }

  /** La sélection (ou la figure du morceau choisi), à 200 % au plus */
  voirSelection() {
    const ids = this.selection.size ? this.selection : this.partie ? new Set([this.partie.id]) : null
    const b = ids ? this.boiteDuContenu(this.formes.filter(f => ids.has(f.id))) : null
    if (!b) { this.ui.message('Rien n\'est sélectionné.'); return }
    this.allerVers(vuePour(b, this.ui.zoneLibre(), 2))
  }

  /** Les boutons − et + : autour du centre de l'écran, tout de suite */
  zoomer(facteur: number) {
    this.arreterAnimation()
    this.cam.zoomerAutour(this.rendu.l / 2, this.rendu.h / 2, facteur)
    this.vueChangee()
  }

  /** 100 %, en gardant le point au centre de ce qu'on voit */
  zoom100() {
    const s = this.centreLibre(), w = this.cam.versMonde(s.x, s.y)
    this.allerVers({ x: s.x - w.x, y: s.y - w.y, z: 1 })
  }

  /** Ctrl + « + » ou « − » : autour du pointeur s'il est sur le tableau */
  zoomerClavier(facteur: number) {
    this.arreterAnimation()
    const s = this.pointeurSurZone ? this.ecran(this.pointeurSurZone) : this.centreLibre()
    this.cam.zoomerAutour(s.x, s.y, facteur)
    this.vueChangee()
  }

  /** Zoome autour d'un point de la fenêtre (le pincement de Safari) */
  zoomerAutourClient(clientX: number, clientY: number, facteur: number) {
    this.arreterAnimation()
    const s = this.ecran({ clientX, clientY })
    this.cam.zoomerAutour(s.x, s.y, facteur)
    this.vueChangee()
  }

  /** La page a des formes, et aucune n'est à l'écran : on s'est perdu */
  contenuHorsVue(): boolean {
    if (!this.formes.length || this.rendu.l <= 0) return false
    const v = this.cam.visible(this.rendu.l, this.rendu.h)
    for (const f of this.formes) {
      if (f.type === 'polygone' && f.prolonge) { if (this.rendu.etendueVisible(f)) return false; continue }
      const b = this.boiteDeForme(f)
      if (b && chevauche(v, b)) return false
    }
    return true
  }

  /** Note la page et sa vue dans la session de ce navigateur (jamais dans le document) */
  private noterSession() {
    clearTimeout(this.minuterieSession); this.minuterieSession = 0
    if (!this.page || this.sessionArretee) return
    if (this.rendu.l > 0) this.vues.set(this.page, this.vueActuelle())
    ecrireSession(this.page, this.vues, this.pages)
  }

  /** Un autre tableau s'ouvre (un fichier) : les vues gardées ne sont plus les
   *  siennes. Celles qu'on tient en mémoire partent aussi, sinon la prochaine
   *  écriture les remettrait dans la session. */
  oublierVues() {
    clearTimeout(this.minuterieSession); this.minuterieSession = 0
    this.vues.clear(); this.pageSession = null
    oublierSession()
  }

  /** Avant d'enregistrer le tableau dans un fichier : le point d'un simple
   *  toucher, qui attendait un éventuel double-clic, est posé tout de suite */
  poserCeQuiAttend() { this.viderPointEnAttente() }

  /** Plus rien ne s'écrit dans la session jusqu'au rechargement : un autre
   *  onglet vient d'ouvrir un autre tableau, ou celui-ci va le faire (en
   *  quittant la page, on y remettrait la page et la vue de l'ancien) */
  arreterSession() {
    clearTimeout(this.minuterieSession); this.minuterieSession = 0
    this.sessionArretee = true
  }

  private vueChangee() {
    this.rendu.toutRedessiner()
    this.ui?.maj()
    // La vue se note un peu après le dernier mouvement, pas à chaque image
    clearTimeout(this.minuterieSession)
    this.minuterieSession = window.setTimeout(() => this.noterSession(), 400)
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

  /** L'objet sous ce point du monde, le plus haut d'abord, à `rayon` pixels
   *  d'écran près (le doigt vise moins juste que la souris) ; parmi ceux
   *  qu'accepte `filtre`, s'il y en a un */
  private formeSous(x: number, y: number, rayon = 6, filtre?: (f: Forme) => boolean): Forme | null {
    const r = rayon / this.cam.z
    for (let i = this.formes.length - 1; i >= 0; i--) {
      const f = this.formes[i]
      if ((!filtre || filtre(f)) && touche(f, x, y, r, g => this.rendu.boite(g))) return f
    }
    return null
  }

  private brancherGestes() {
    const z = this.zone
    z.addEventListener('pointerdown', e => this.bas(e))
    z.addEventListener('pointermove', e => this.bouge(e))
    z.addEventListener('pointerup', e => this.haut(e))
    z.addEventListener('pointercancel', e => this.haut(e, true))
    z.addEventListener('wheel', e => this.molette(e), { passive: false })
    // Clic droit (ou bouton du stylet) : les options du morceau visé, dans
    // n'importe quelle figure (c'est une demande d'options), sinon celles de
    // la figure entière. Dans une sélection de plusieurs objets, elle reste
    // entière : on dit ce qu'on peut en faire.
    z.addEventListener('contextmenu', e => {
      e.preventDefault()
      if (this.enLecture) return
      const s = this.ecran(e), p = this.monde(e)
      const prise = this.priseSous(s, { toutes: true })
      const f = this.formeSous(p.x, p.y) ?? prise?.f ?? null
      if (f && this.selection.size > 1 && this.selection.has(f.id)) { this.direPlusieurs(); return }
      if (prise) { this.choisirPartie(prise.f.id, prise.prise); this.ui.ouvrirMenuPartie(prise.f.id, prise.prise, e.clientX, e.clientY); return }
      this.ui.fermerMenuPartie()
      this.choisirPartie(null)
      if (f) this.ouvrirOptions(f)
    })
    // Double-clic : les options de l'objet (une formule, elle, se modifie).
    // Pas sur un morceau choisi (son menu vient de s'ouvrir), ni juste après
    // un double appui déjà traité (au Stylo, voir doubleAppui ; au doigt,
    // voir secondToucher)
    z.addEventListener('dblclick', e => {
      if (this.enLecture || this.partie || performance.now() - this.doubleTraite < 500) return
      // Au doigt, l'outil Sélection et le doigt qui déplace ont leur double
      // appui (secondToucher) : la même règle sur l'iPad et ailleurs
      if (this.dernierPointeur === 'touch' && (this.outil === 'selection' || this.doigtDeplace)) return
      const p = this.monde(e), f = this.formeSous(p.x, p.y)
      if (f?.type === 'formule') this.editerFormule(f)
      else if (f && (this.outil === 'selection' || this.outil === 'main' || this.outil === 'segment')) this.ouvrirOptions(f)
    })
    // Le clic que le navigateur tire du second appui d'un double appui
    // viserait ce qui vient de s'ouvrir sous le doigt ou le stylet (l'éditeur
    // d'une formule, qui se fermerait aussitôt) : il ne fait rien
    window.addEventListener('click', e => {
      if (!this.clicFantome) return
      this.clicFantome = false
      if (performance.now() - this.doubleTraite < 500 && !z.contains(e.target as Node)) { e.preventDefault(); e.stopPropagation() }
    }, true)
    window.addEventListener('keydown', e => this.clavier(e))
    window.addEventListener('keyup', e => { if (e.code === 'Space') this.espace = false })
  }

  // ---------- Le rôle du doigt ----------
  /** Le doigt déplace la vue et sélectionne ; le stylet seul écrit */
  get doigtDeplace(): boolean { return leDoigtDeplace() }

  /** Le rôle du doigt, choisi dans son menu */
  choisirDoigt(d: Doigt) {
    reglerDoigt(d)
    this.majPoignees()
    this.rendu.toutRedessiner()
    this.ui?.maj()
  }

  /** Les ronds des poignées ne se montrent que là où on peut les prendre :
   *  avec l'outil Sélection, ou au doigt qui « déplace » */
  private majPoignees() {
    this.rendu.poigneesActives = this.outil === 'selection' || this.doigtDeplace
  }

  /** « Auto » : le premier stylet posé sur l'écran lui-même (iPad, Surface,
   *  tablette Android) fait passer le doigt en « déplace ». Une tablette
   *  graphique, sur un ordinateur dont l'écran n'est pas tactile, jamais. */
  private detecterStylet() {
    if (reglages.doigt !== 'auto' || reglages.styletDirect || !ecranTactile()) return
    noterStyletDirect(true)
    this.majPoignees()
    this.rendu.toutRedessiner()
    this.ui.maj()
    this.ui.message('Stylet détecté : le doigt déplace la vue', { libelle: 'Changer', faire: () => this.ui.ouvrirReglageDoigt() })
  }

  /** Une paume, quand le doigt ne dessine pas : un contact large, ou tout
   *  contact pendant que le stylet touche l'écran */
  private paume(e: PointerEvent): boolean {
    if (e.pointerType !== 'touch' || !this.doigtDeplace) return false
    return contactLarge(e) || [...this.pointeurs.values()].some(p => p.type === 'pen')
  }

  /** Les doigts posés, dans l'ordre où ils sont arrivés */
  private doigts() {
    return [...this.pointeurs].filter(([, p]) => p.type === 'touch').map(([id, p]) => ({ id, x: p.x, y: p.y }))
  }

  private pincement(doigts: { x: number; y: number }[]): Geste {
    const [a, b] = doigts
    return { type: 'pinch', dist: Math.hypot(a.x - b.x, a.y - b.y), cx: (a.x + b.x) / 2, cy: (a.y + b.y) / 2 }
  }

  /** L'appui est-il devenu un glisser ? (voir SEUIL_GLISSER) */
  private aGlisse(s: P): boolean { return depasseSeuil(this.depart, s.x, s.y) }

  // ---------- Appuyer, glisser, lever ----------
  /** Un appui. L'ordre compte : la paume écartée, le pointeur noté, le
   *  stylet qui reprend la main au doigt, deux doigts qui pincent ; puis,
   *  si rien n'est en cours, un menu ouvert qui se ferme, le second toucher
   *  d'un double-clic, et enfin ce que fait le pointeur avec l'outil. */
  private bas(e: PointerEvent) {
    const s = this.ecran(e)
    // Le bout gomme du stylet (le stylet retourné) efface, quel que soit l'outil
    const gommeDuStylet = e.pointerType === 'pen' && (e.button === 5 || (e.buttons & 32) !== 0)
    // La paume, quand le doigt ne dessine pas : rien jusqu'à son lever
    if (this.paume(e)) { this.ignores.add(e.pointerId); return }
    // Un pointeur synthétique, ou déjà levé, refuse d'être capturé : le geste a lieu quand même
    try { this.zone.setPointerCapture(e.pointerId) } catch { /* sans capture */ }
    this.pointeurs.set(e.pointerId, { x: s.x, y: s.y, type: e.pointerType })
    this.dernierPointeur = typePointeur(e.pointerType)

    // Le stylet : « Auto » apprend que l'écran se touche au stylet ; ce que
    // faisait le doigt (une paume posée juste avant, souvent) s'arrête là
    if (e.pointerType === 'pen') {
      this.detecterStylet()
      if (this.doigtDeplace && this.geste && (this.geste.type === 'pinch' || this.depart.type === 'touch')) this.laisserLeStylet()
    }

    // Deux doigts : pincer pour zoomer, quoi qu'on fût en train de faire
    const doigts = this.doigts()
    if (doigts.length === 2) {
      this.abandonnerGeste()
      this.geste = this.pincement(doigts)
      return
    }
    if (this.geste) return

    const m = this.monde(e)
    const doigt = e.pointerType === 'touch' && this.doigtDeplace
    // Déplacer la vue (bouton du milieu, Espace, outil Main) n'écrit jamais :
    // le menu d'un morceau et le panneau d'options restent (ils suivent la vue)
    const pan = e.button === 1 || this.espace || (this.outil === 'main' && !gommeDuStylet)
    // Le morceau visé se lit avant de fermer les menus : fermer le menu d'un
    // sommet oublie le morceau choisi, et l'appui sur un autre sommet de la
    // même figure doit le prendre
    const prise = this.priseSous(s, doigt ? { outil: 'selection' } : {})

    // Un menu ouvert (un petit menu, celui d'un morceau, le panneau d'options,
    // la liste des instruments) : ce premier appui le ferme, sans encre. Il
    // continue seulement sur un instrument, sur un objet qu'on prend (outil
    // Sélection, doigt qui déplace), ou au Stylo : le trait commence (on ne
    // perd pas la première lettre), mais un simple appui ne posera rien.
    // L'objet dont le panneau est ouvert, qu'on prend pour le déplacer, le
    // garde : il reparaît au lever. Un clic attendu par le panneau (Désigner,
    // Tracer un axe ou un centre) est pour lui : le panneau reste.
    const prend = this.outil === 'selection' || doigt
    const vise = prend ? this.formeSous(m.x, m.y, doigt ? 12 : 6) : null
    const apresMenu = !pan && !this.placement && (avale(e) || this.ui.fermerMenus(!!vise && vise.id === this.options))
    if (apresMenu) {
      const continuer = e.button === 0 && !gommeDuStylet && (
        (this.instruments.size > 0 && !!this.instrumentSous(m))
        || (prend && (!!prise || !!vise))
        || (!doigt && (this.outil === 'stylo' || this.outil === 'surligneur')))
      if (!continuer) return
    }

    // Le second toucher d'un double-clic au Stylo sur un objet : le point du
    // premier s'en va et l'objet ouvre ses options. Tout autre appui pose ce
    // point d'abord, à sa place dans l'historique.
    if (this.pointEnAttente) {
      if (!pan && this.doubleAppui(e, s)) return
      this.viderPointEnAttente()
    }
    // Le second toucher d'un double appui au doigt (outil Sélection, ou doigt
    // qui déplace) : noté ici, il ouvrira les options de l'objet à son lever
    this.secondToucher(e, s, m)

    this.depart = nouveauDepart(s.x, s.y, e.pointerId, e.pointerType, performance.now())
    if (pan) { this.geste = { type: 'pan', dernierX: s.x, dernierY: s.y }; return }
    if (e.button !== 0 && !gommeDuStylet) return

    if (this.placement) { const p = this.placement; this.placement = null; p.clic(m); return }
    this.tableau.nouveauGeste()
    // Le bout gomme passe avant tout le reste : le bord d'un instrument, les
    // instruments, les sommets. L'outil en main ne change pas.
    if (gommeDuStylet) { this.commencerGomme(m, true); return }
    if (doigt) { this.basDoigt(e, s, m, prise); return }
    // Le crayon posé contre le bord d'un instrument trace le long du bord.
    // Sauf sur une pastille ↻ : à petit zoom, la portée du bord l'atteindrait
    // (celle du rapporteur est dans le prolongement de son bord)
    const dessine = this.outil === 'stylo' || this.outil === 'segment'
    const pastille = dessine && this.instruments.size ? this.instrumentSous(m)?.quoi === 'rotation' : false
    const bord = dessine && !pastille ? this.bordSous(m) : null
    if (bord) {
      const t0 = bord.bord.gradue ? Math.round(Math.max(bord.bord.debut, Math.min(bord.bord.fin, bord.t)) / 4) * 4 : bord.t
      this.geste = { type: 'longer', bord: bord.bord, t0 }
      this.geste_longer(this.geste, m)
      return
    }
    // Un instrument : on le déplace, on le tourne, on écarte ou on tourne le compas
    const inst = this.instrumentSous(m)
    if (inst) { this.prendreInstrument(inst, m); return }
    // Un morceau de la figure sélectionnée (outil Sélection) : son nom, un sommet, son rayon
    if (prise) { this.prendrePoignee(prise); return }
    this.ui.fermerMenuPartie()
    if (this.partie) this.choisirPartie(null)
    // Sous un outil de dessin, ce qui restait sélectionné (une copie, une
    // image importée, l'objet dont on a ouvert les options) ne l'est plus
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
        this.heuresDuTrait = [heureDe(e)]
        // Parti d'une figure ou d'une formule (même sous ce qu'on a écrit
        // dessus) : un simple toucher y attendra peut-être un second (le
        // double-clic qui ouvre ses options)
        const surObjet = this.formeSous(m.x, m.y, 6, f => f.type === 'polygone' || f.type === 'cercle' || f.type === 'formule')?.id
        this.geste = { type: 'dessin', pointeur: e.pointerId, apresMenu: apresMenu || undefined, surObjet }
        this.dernierMouvement = performance.now()
        this.immobilite = new Immobilite(m)
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
        this.geste = { type: 'segment', x: a.x, y: a.y }
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
      case 'gomme': this.commencerGomme(m, false); break
      case 'selection': {
        const f = this.formeSous(m.x, m.y)
        // Maj + clic, ou Ctrl + clic (⌘ sur Mac, où Ctrl + clic est un clic
        // droit) : l'objet entre dans la sélection, ou en sort
        const ajout = e.shiftKey || (MAC ? e.metaKey : e.ctrlKey)
        if (f) {
          const retirer = ajout && this.selection.has(f.id) ? f.id : undefined
          if (!this.selection.has(f.id)) { if (!ajout) this.selection.clear(); this.selection.add(f.id) }
          this.direOptions()
          this.geste = { type: 'deplacer', x: m.x, y: m.y, bouge: false, retirer }
        } else if (ajout) {
          this.geste = { type: 'cadre', x: m.x, y: m.y }          // Maj + glisser : encadrer
        } else {
          // Glisser dans le vide déplace le tableau ; un simple clic désélectionne
          this.geste = { type: 'pan', dernierX: s.x, dernierY: s.y, vide: true }
        }
        this.rendu.redessinerDirect(); this.ui.maj()
        break
      }
      case 'formule':
        this.geste = { type: 'formule' }
        break
    }
  }

  /** Le doigt qui « déplace et sélectionne » : jamais d'encre, quel que soit
   *  l'outil. Il prend un instrument, un morceau de la figure sélectionnée
   *  (prise, lu par bas()), ou ce qui est déjà sélectionné pour le déplacer ;
   *  ailleurs, même sur un objet, il déplace la vue (un doigt qui traverse une
   *  page chargée n'emporte pas un trait). Levé sans avoir glissé, il choisit
   *  l'objet touché (voir toucherObjet). */
  private basDoigt(e: PointerEvent, s: P, m: P, prise: { prise: Prise; f: Figure } | null) {
    const inst = this.instruments.size ? this.instrumentSous(m) : null
    if (inst) { this.prendreInstrument(inst, m); return }
    if (prise) { this.prendrePoignee(prise); return }
    const f = this.formeSous(m.x, m.y, 12)
    if (f && this.selection.has(f.id)) { this.geste = { type: 'deplacer', x: m.x, y: m.y, bouge: false, doigt: true }; return }
    this.geste = { type: 'pan', dernierX: s.x, dernierY: s.y, pointeur: e.pointerId, toucher: true }
  }

  /** Un coup de gomme : à l'outil Gomme, ou au bout gomme du stylet (le
   *  curseur et le cercle de la gomme le temps du geste, puis l'outil d'avant,
   *  qui n'a jamais changé). Tout le coup ne fait qu'une étape d'annulation,
   *  même lent ; le film garde une étape par trait effacé. */
  private commencerGomme(m: P, stylet: boolean) {
    const g: Geste = { type: 'gomme', effaces: new Set(), stylet: stylet || undefined }
    this.geste = g
    if (stylet) { this.zone.dataset.outil = 'gomme'; this.zone.style.cursor = '' }
    this.tableau.gesteLong()
    this.rendu.gomme = { x: m.x, y: m.y, r: 12 / this.cam.z }
    this.gommer(m.x, m.y, g.effaces)
    this.rendu.redessinerDirect()
  }

  private finirGomme(g: Extract<Geste, { type: 'gomme' }>) {
    this.tableau.finGesteLong()
    if (!g.stylet) return
    this.zone.dataset.outil = this.outil
    if (this.outil !== 'gomme') { this.rendu.gomme = null; this.rendu.redessinerDirect() }
  }

  // ---------- Le double-clic au Stylo ----------
  /** Un simple toucher du Stylo (ou du Surligneur) sur une figure ou une
   *  formule : son point d'encre attend 300 ms avant d'être posé. Un second
   *  toucher tout près en fait un double-clic (voir doubleAppui) ; sinon il
   *  se pose à l'échéance, ou dès qu'autre chose arrive (viderPointEnAttente).
   *  Son rythme, pour le film, est celui du toucher : compté jusqu'au lever. */
  private mettreEnAttente(objet: string) {
    const t = this.rendu.monTrait, heures = this.heuresDuTrait
    this.heuresDuTrait = []
    const trait = t ? this.traitDe(t) : null
    if (!t || !trait) { this.rendu.monTrait = null; this.rendu.redessinerDirect(); return }
    const ms = heures.length * 3 === t.pts.length ? tempsDesPoints(heures, performance.now()) : []
    this.pointEnAttente = { trait, ms, page: this.page, objet, x: this.depart.x, y: this.depart.y, dessin: t,
      minuterie: window.setTimeout(() => this.viderPointEnAttente(), 300) }
  }

  /** Le second appui d'un double-clic : à moins de 10 px du premier (35 au
   *  doigt), avant que son point ne soit posé. Le point s'en va, l'appui ne
   *  fait rien d'autre, et l'objet ouvre ses options (une formule se modifie). */
  private doubleAppui(e: PointerEvent, s: P): boolean {
    const a = this.pointEnAttente
    if (!a || e.button !== 0 || a.page !== this.page) return false
    if (Math.hypot(s.x - a.x, s.y - a.y) >= (e.pointerType === 'touch' ? 35 : 10)) return false
    clearTimeout(a.minuterie)
    this.pointEnAttente = null
    if (this.rendu.monTrait === a.dessin) { this.rendu.monTrait = null; this.rendu.redessinerDirect() }
    this.doubleTraite = performance.now(); this.clicFantome = true
    const f = this.forme(a.objet)
    if (f?.type === 'formule') this.editerFormule(f)
    else if (f) this.ouvrirOptions(f)
    return true
  }

  /** Le second toucher d'un double appui au doigt : moins de 300 ms après le
   *  lever du premier, à moins de 35 px, sur le même objet. Il fait d'abord
   *  ce que fait tout toucher (glissé, il déplace l'objet ou la vue) ; levé
   *  sans avoir glissé, il ouvre les options de l'objet (voir ouvrirParDouble),
   *  comme le double-clic à la souris, que Safari ne donne pas au doigt. Tout
   *  autre appui oublie le premier toucher. */
  private secondToucher(e: PointerEvent, s: P, m: P) {
    const a = this.toucherPrecedent
    this.toucherPrecedent = null
    this.doubleEnCours = null
    if (!a || e.pointerType !== 'touch' || e.button !== 0 || a.page !== this.page) return
    if (this.outil !== 'selection' && !this.doigtDeplace) return
    if (!doubleToucher(a, s.x, s.y, performance.now())) return
    const f = this.formeSous(m.x, m.y, 12)
    if (f && f.id === a.objet) this.doubleEnCours = { objet: f.id, pointeur: e.pointerId }
  }

  /** Le double appui au doigt, au lever du second toucher : les options de
   *  l'objet (une formule se modifie). Le dblclick du navigateur, s'il suit,
   *  ne refait rien, ni le clic qu'il tire du toucher (voir brancherGestes). */
  private ouvrirParDouble(id: string) {
    const f = this.forme(id)
    if (!f) return
    this.doubleTraite = performance.now(); this.clicFantome = true
    if (f.type === 'formule') this.editerFormule(f)
    else this.ouvrirOptions(f)
  }

  /** Un simple toucher du doigt sur un objet, bref (moins de 300 ms) et levé
   *  sans avoir glissé : un second peut suivre (voir secondToucher) */
  private noterToucher(e: PointerEvent, g: Geste, glisse: boolean, m: P) {
    if (e.pointerType !== 'touch' || glisse || (this.outil !== 'selection' && !this.doigtDeplace)) return
    if (g.type !== 'deplacer' && !(g.type === 'pan' && g.toucher)) return
    if (performance.now() - this.depart.t >= DOUBLE_TOUCHER.ms) return
    const f = this.formeSous(m.x, m.y, 12)
    if (!f) return
    const s = this.ecran(e)
    this.toucherPrecedent = { x: s.x, y: s.y, t: performance.now(), objet: f.id, page: this.page }
  }

  /** Le point d'encre en attente se pose maintenant, sur sa page */
  private viderPointEnAttente() {
    const a = this.pointEnAttente
    if (!a) return
    clearTimeout(a.minuterie)
    this.pointEnAttente = null
    if (this.rendu.monTrait === a.dessin) this.rendu.monTrait = null
    this.tableau.nouveauGeste()
    this.tableau.poserTrace(a.page, a.trait, a.ms)
    this.rendu.redessinerDirect()
  }

  /** Un simple toucher du doigt « qui déplace » : l'objet touché (à 12 px
   *  près) devient la sélection, seul ; rien dessous, elle se vide */
  private toucherObjet(m: P) {
    const f = this.formeSous(m.x, m.y, 12)
    this.ui.fermerMenuPartie()
    if (this.partie) this.choisirPartie(null)
    this.selection.clear()
    if (f) this.selection.add(f.id)
    this.rendu.redessinerDirect(); this.ui.maj()
    if (f) this.direOptions()
  }

  private prendreInstrument(inst: { nom: NomInstrument; quoi: Partie }, m: P) {
    const depart = { ...this.instruments.get(inst.nom)! }
    // Celui qu'on prend passe au-dessus des autres
    this.instruments.delete(inst.nom); this.instruments.set(inst.nom, depart)
    const a = Math.atan2(m.y - depart.y, m.x - depart.x)
    this.geste = { type: 'instrument', nom: inst.nom, quoi: inst.quoi, depart, x: m.x, y: m.y,
      ecart: a - depart.a, balayage: 0, dernier: a }
    this.majInstruments(inst)
  }

  private prendrePoignee(prise: { prise: Prise; f: Figure }) {
    this.ui.fermerMenuPartie()
    this.choisirPartie(prise.f.id, prise.prise)
    this.geste = { type: 'poignee', ...prise, bouge: false }
    this.ui.maj()
  }

  /** Le stylet se pose pendant un geste du doigt : le geste s'arrête là où
   *  le doigt l'a laissé (la vue, un instrument, un objet déplacé ou tiré) ;
   *  un trait du doigt (une paume, sans doute) est jeté. Les doigts encore
   *  posés ne font plus rien jusqu'à leur lever : le stylet a la main. */
  private laisserLeStylet() {
    const g = this.geste
    this.geste = null
    switch (g?.type) {
      case 'pan': case 'pinch': break
      case 'instrument': this.finirInstrument(g); break
      case 'deplacer': this.poserDeplacement(g); break
      case 'poignee': this.poserPoignee(g.bouge ? this.rendu.remplacement : null); break
      default: this.abandonnerGeste(g)
    }
    for (const [id, p] of this.pointeurs) if (p.type === 'touch') { this.pointeurs.delete(id); this.ignores.add(id) }
    this.ui.maj()
  }

  /** Un doigt se lève pendant un pincement. Deux restent ou plus : le
   *  pincement continue, réancré sur les deux premiers (la vue ne saute pas).
   *  Un seul : il continue de déplacer la vue, sans jamais reprendre le
   *  dessin, jusqu'à son lever. */
  private finPincement() {
    const doigts = this.doigts()
    if (doigts.length >= 2) { this.geste = this.pincement(doigts); return }
    if (!doigts.length) { this.geste = null; return }
    const d = doigts[0]
    this.geste = { type: 'pan', dernierX: d.x, dernierY: d.y, pointeur: d.id }
    this.depart = nouveauDepart(d.x, d.y, d.id, 'touch', performance.now())
    this.depart.parti = true
  }

  private bouge(e: PointerEvent) {
    if (this.ignores.has(e.pointerId)) return
    const s = this.ecran(e)
    const avant = this.pointeurs.get(e.pointerId)
    if (avant) { avant.x = s.x; avant.y = s.y }
    const m = this.monde(e)
    const t = performance.now()
    const g = this.geste
    if (this.outil === 'gomme' || g?.type === 'gomme') {
      this.rendu.gomme = { x: m.x, y: m.y, r: 12 / this.cam.z }
      this.rendu.redessinerDirect()
    }

    if (this.polyEnCours && this.outil === 'forme') {
      const o = this.accrocher(m)
      this.rendu.apercu = this.figure({ type: 'polygone', ferme: false, ...versRelatif([...this.polyEnCours, o.p]) })
      this.rendu.cible = o.accroche ? { a: o.p } : null
      this.rendu.redessinerDirect()
    }

    if (this.placement && !g) { this.placement.bouge(m); this.zone.style.cursor = 'copy'; return }
    if (!g && this.outil === 'selection') {
      // Ce qu'on survole s'éclaire : au pavé tactile, on sait ce qu'on va prendre
      const f = this.formeSous(m.x, m.y)
      const id = f && !this.selection.has(f.id) ? f.id : null
      if (id !== this.survol) { this.survol = id; this.rendu.survol = id; this.rendu.redessinerDirect() }
    }
    if (!g && this.outil === 'segment') {
      if (this.traitEnAttente) this.apercuTrait(this.traitEnAttente, this.boutDuTrait(this.traitEnAttente, m, e.shiftKey))
      else this.montrerAccroche(m)
    }
    if (!g) {
      const inst = this.instruments.size ? this.instrumentSous(m) : null
      this.zone.style.cursor = inst ? (inst.quoi === 'corps' || inst.quoi === 'pointe' ? 'grab' : 'pointer') : this.priseSous(s) ? 'move'
        : this.outil === 'selection' ? (this.survol || this.formeSous(m.x, m.y) ? 'move' : 'grab') : ''
      return
    }
    // Le geste n'écoute que le pointeur qui l'a commencé (pas un stylet qui
    // survole, ni un autre doigt). Tant que l'appui n'est pas devenu un
    // glisser, rien ne bouge ; passé le seuil, le déplacement compte depuis
    // le départ. L'encre, elle, part tout de suite.
    if (g.type !== 'pinch' && e.pointerId !== this.depart.pointeur) return
    const glisse = g.type !== 'pinch' && this.aGlisse(s)
    switch (g.type) {
      case 'instrument':
        if (g.quoi !== 'tete' && !glisse) break          // l'arc du compas, lui, se trace tout de suite
        this.geste_instrument(g, m, e.shiftKey)
        break
      case 'longer': this.geste_longer(g, m); break
      case 'poignee':
        if (!glisse) break                               // un clic, pas encore un glisser
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
        const doigts = this.doigts()
        if (doigts.length < 2) return
        const [a, b] = doigts
        const dist = Math.hypot(a.x - b.x, a.y - b.y)
        const cx = (a.x + b.x) / 2, cy = (a.y + b.y) / 2
        this.cam.deplacer(cx - g.cx, cy - g.cy)
        if (g.dist > 0) this.cam.zoomerAutour(cx, cy, dist / g.dist)
        g.dist = dist; g.cx = cx; g.cy = cy
        this.vueChangee()
        break
      }
      case 'pan':
        if (!glisse) break
        this.cam.deplacer(s.x - g.dernierX, s.y - g.dernierY)
        g.dernierX = s.x; g.dernierY = s.y
        this.vueChangee()
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
          this.heuresDuTrait.push(heureDe(ev))
          if (this.immobilite.bouge(p, this.cam.z)) { this.dernierMouvement = t; this.attendreImmobilite() }
        }
        this.rendu.redessinerDirect()
        break
      }
      case 'segment':
        this.apercuTrait(g, this.boutDuTrait(g, m, e.shiftKey))
        break
      case 'gomme':
        this.gommer(m.x, m.y, g.effaces)
        break
      case 'deplacer': {
        if (!glisse) break
        g.bouge = true
        this.rendu.decalage = { dx: m.x - g.x, dy: m.y - g.y }
        this.rendu.toutRedessiner()
        break
      }
      case 'cadre':
        if (!glisse) break
        this.rendu.cadreSelection = rectangle(g.x, g.y, m.x, m.y)
        this.rendu.redessinerDirect()
        break
    }
  }

  private haut(e: PointerEvent, annule = false) {
    // Une paume sort de la liste à son lever, sans rien faire d'autre
    if (this.ignores.delete(e.pointerId)) return
    this.pointeurs.delete(e.pointerId)
    const g = this.geste
    if (!g) return
    if (g.type === 'pinch') { this.finPincement(); return }
    if (g.type === 'dessin' && e.pointerId !== g.pointeur) return
    if (g.type === 'pan' && g.pointeur !== undefined && e.pointerId !== g.pointeur) return
    // Clic ou glisser ? Le lever compte aussi (un appui levé loin de son départ a glissé)
    const glisse = this.aGlisse(this.ecran(e))
    this.geste = null
    // Le second toucher d'un double appui au doigt (voir secondToucher)
    const double = this.doubleEnCours?.pointeur === e.pointerId ? this.doubleEnCours : null
    if (double) this.doubleEnCours = null
    // Un geste coupé par le navigateur (un second doigt sur le pavé tactile,
    // une fenêtre système…) garde ce qu'il a tracé : un arc de compas, un
    // trait à la règle ou au stylo ne doit pas s'effacer sous les yeux
    const garder = g.type === 'instrument' || g.type === 'longer' || g.type === 'dessin'
    if (annule && !garder) { this.abandonnerGeste(g); return }

    const m = this.monde(e)
    if (!double) this.noterToucher(e, g, glisse, m)
    switch (g.type) {
      case 'pan':
        // Un simple clic dans le vide (outil Sélection) désélectionne ; un
        // simple toucher du doigt « qui déplace » choisit l'objet touché
        if (glisse) break
        if (g.toucher) this.toucherObjet(m)
        else if (g.vide && this.selection.size) { this.selection.clear(); this.rendu.redessinerDirect(); this.ui.maj() }
        break
      case 'dessin': {
        clearTimeout(this.minuterieForme)
        // L'appui qui fermait un menu, levé sans avoir glissé : rien n'est posé
        if (g.apresMenu && !glisse) { this.rendu.monTrait = null; this.heuresDuTrait = []; this.rendu.redessinerDirect(); break }
        // Un simple toucher sur un objet : un double-clic peut suivre
        if (g.surObjet && !glisse && !annule && performance.now() - this.depart.t < 250) { this.mettreEnAttente(g.surObjet); break }
        this.validerTrait(false)
        break
      }
      case 'gomme': this.finirGomme(g); break
      case 'segment': {
        const s = this.rendu.monSegment!
        // Un simple clic (sans glisser) pose le premier point : le second clic finira le trait
        if (!glisse) {
          this.traitEnAttente = { x: g.x, y: g.y }
          if (!this.astuceDeuxClics) { this.astuceDeuxClics = true; this.ui.message(messageSecondPoint(this.dernierPointeur)) }
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
        this.piste.trace(null)
        if (f?.type === 'polygone' && Math.hypot(f.pts[2], f.pts[3]) * this.cam.z > 3) {
          this.tableau.nouveauGeste()
          this.tableau.poser(this.page, f)
        }
        this.rendu.redessinerDirect()
        break
      }
      case 'poignee':
        // Un clic sans glisser : les options de ce morceau-là
        if (!glisse) { this.ui.ouvrirMenuPartie(g.f.id, g.prise, e.clientX, e.clientY); break }
        this.poserPoignee(this.manipuler(g.f, g.prise, m))
        break
      case 'rectangle':
      case 'cercle': {
        const f = this.figureTiree(g, this.aimanter(m), e.shiftKey)
        this.rendu.apercu = null
        if (f && (f.type === 'cercle' ? f.r : Math.abs(f.pts[4]) + Math.abs(f.pts[5])) * this.cam.z > 6) this.poserFigure(f, false)
        this.rendu.redessinerDirect()
        break
      }
      case 'deplacer':
        if (g.doigt && !glisse) { this.rendu.decalage = { dx: 0, dy: 0 }; this.toucherObjet(m); break }
        // Maj + clic sur un objet déjà sélectionné : il en sort (glissé, c'est
        // toute la sélection qui a bougé)
        if (g.retirer && !glisse) { this.rendu.decalage = { dx: 0, dy: 0 }; this.selection.delete(g.retirer); this.rendu.redessinerDirect(); break }
        this.poserDeplacement(g)
        break
      case 'cadre': {
        const r = this.rendu.cadreSelection
        this.rendu.cadreSelection = null
        if (r) for (const f of this.formes) if (chevauche(r, this.rendu.boite(f))) this.selection.add(f.id)
        this.rendu.redessinerDirect(); this.ui.maj()
        break
      }
      case 'formule': {
        if (glisse) break
        const s = this.ecran(e)
        const f = this.formeSous(m.x, m.y)
        if (f?.type === 'formule') this.editerFormule(f)
        else this.nouvelleFormule(m.x, m.y, s.x, s.y)
        break
      }
    }
    // Le second toucher d'un double appui, bref et levé sans avoir glissé
    if (double && !glisse && performance.now() - this.depart.t < DOUBLE_TOUCHER.ms) this.ouvrirParDouble(double.objet)
    this.ui.maj()                       // le panneau d'options réapparaît
  }

  /** La sélection déplacée se pose là où on l'a laissée */
  private poserDeplacement(g: { bouge: boolean }) {
    const { dx, dy } = this.rendu.decalage
    this.rendu.decalage = { dx: 0, dy: 0 }
    if (g.bouge && (dx || dy)) {
      this.tableau.modifier(this.page, this.formes.filter(f => this.selection.has(f.id) || this.lieeA(f))
        .map(f => ({ id: f.id, patch: { x: f.x + dx, y: f.y + dy } })))
    } else this.rendu.toutRedessiner()
  }

  /** La figure dont on a tiré un morceau prend sa nouvelle forme (null : elle garde l'ancienne) */
  private poserPoignee(f: Figure | null) {
    this.rendu.remplacement = null
    if (f) {
      const { id: _i, type: _t, ...patch } = f
      this.tableau.modifier(this.page, [{ id: f.id, patch: patch as Partial<Forme> }])
    }
    this.rendu.toutRedessiner()
  }

  private abandonnerGeste(g: Geste | null = this.geste) {
    if (g?.type === 'dessin') { clearTimeout(this.minuterieForme); this.rendu.monTrait = null; this.heuresDuTrait = [] }
    if (g?.type === 'segment') { this.rendu.monSegment = null; this.rendu.apercu = null; this.rendu.cible = null }
    if (g?.type === 'rectangle' || g?.type === 'cercle') this.rendu.apercu = null
    if (g?.type === 'poignee') this.rendu.remplacement = null
    if (g?.type === 'longer' || g?.type === 'instrument') {
      this.rendu.apercu = null; this.rendu.mesure = null
      this.piste.trace(null)
      if (g.type === 'instrument') { this.instruments.set(g.nom, g.depart); this.majInstruments() }
    }
    if (g?.type === 'cadre') this.rendu.cadreSelection = null
    if (g?.type === 'deplacer') this.rendu.decalage = { dx: 0, dy: 0 }
    if (g?.type === 'gomme') this.finirGomme(g)
    this.geste = null
    this.rendu.toutRedessiner()
  }

  /** Le trait à poser, en coordonnées relatives à son premier point (null : rien à poser) */
  private traitDe(t: TraitDirect): Trait | null {
    if (t.pts.length < 3) return null
    const x0 = t.pts[0], y0 = t.pts[1]
    const pts: number[] = []
    for (let i = 0; i < t.pts.length; i += 3) {
      pts.push(Math.round((t.pts[i] - x0) * 10) / 10, Math.round((t.pts[i + 1] - y0) * 10) / 10,
        Math.round(t.pts[i + 2] * 100) / 100)
    }
    return { id: uid(), type: 'trait', x: x0, y: y0, pts, couleur: t.couleur,
      taille: t.taille, opacite: t.opacite, pression: t.pression, z: Date.now(), auteur: this.tableau.moi }
  }

  private validerTrait(maintenu: boolean) {
    const t = this.rendu.monTrait
    const heures = this.heuresDuTrait
    this.rendu.monTrait = null
    this.heuresDuTrait = []
    const trait = t ? this.traitDe(t) : null
    if (!t || !trait) return
    // Le temps passé sur chaque point, jusqu'au lever (maintenant) : l'étape du film le note
    if (heures.length * 3 === t.pts.length) this.tableau.poserTrace(this.page, trait, tempsDesPoints(heures, performance.now()))
    else this.tableau.poser(this.page, trait)
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
    // La figure n'est pas sélectionnée : ses sommets n'ont pas à se prendre
    // sous la plume qui continue d'écrire (ses options : double-clic, clic droit)
    this.ui.message(r.nom + ' — Ctrl+Z pour garder le tracé à main levée')
  }

  /** Stylo posé et immobile un instant : la figure se forme aussitôt,
   *  sans attendre qu'on lève le stylo. */
  private attendreImmobilite() {
    clearTimeout(this.minuterieForme)
    if (this.outil !== 'stylo' || !this.reconnaissance) return
    this.minuterieForme = window.setTimeout(() => {
      const g = this.geste
      if (g?.type !== 'dessin') return
      // L'appui qui fermait un menu, resté sur place : il n'écrit rien
      if (g.apresMenu && !this.depart.parti) return
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
    if (pts && pts.length >= (ferme ? 3 : 2)) this.poserFigure(this.figure({ type: 'polygone', ferme, ...versRelatif(pts) }), false)
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
      this.poserFigure(f, false)
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

  /** Pose une forme ; prendre : elle devient la sélection (une copie, une
   *  image, une figure transformée). Ce qu'on vient de tracer ne l'est pas :
   *  sous l'outil de dessin, ses sommets ne doivent pas se prendre. */
  private poserFigure(f: Forme, prendre = true) {
    this.tableau.nouveauGeste()
    this.tableau.poser(this.page, f)
    if (prendre) this.selectionner(f.id)
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

  /** Le clic droit dans une sélection de plusieurs objets : elle reste
   *  entière, et l'on dit ce qu'on en fait */
  private direPlusieurs() {
    const efface = this.dernierPointeur === 'touch' ? 'la poubelle les efface' : 'Suppr (ou la poubelle) les efface'
    this.ui.message(`${this.selection.size} objets sélectionnés : glissez-en un pour les déplacer tous ; ${efface}.`)
  }

  /** La première fois qu'on prend un objet, on dit où sont ses options, dans
   *  les mots du pointeur : le clic droit à la souris, le bouton du stylet au
   *  stylet, deux touchers au doigt (le double appui, voir secondToucher :
   *  l'objet a été pris à l'outil Sélection ou au doigt qui déplace) */
  private direOptions() {
    if (this.astuceOptions || this.selection.size !== 1) return
    const f = this.formeChoisie()
    if (!f || f.type === 'formule' || f.type === 'segment') return
    this.astuceOptions = true
    this.ui.message(messageOptions(this.dernierPointeur))
  }

  // ---------- Morceaux d'une figure ----------
  /** Le morceau (nom, sommet, centre, rayon) sous le pointeur (écran). On ne
   *  le prend que dans la figure sélectionnée, et seulement avec l'outil
   *  Sélection (o.outil : celui qui compte, l'outil en main par défaut) :
   *  jamais sous un outil de dessin, sinon on ne pourrait plus écrire près
   *  d'un point. o.toutes : dans n'importe quelle figure, la sélectionnée
   *  d'abord, puis la plus haute (le clic droit, qui demande des options). */
  priseSous(s: P, o: { outil?: Outil; toutes?: boolean } = {}): { prise: Prise; f: Figure } | null {
    if (this.enLecture) return null
    const choisie = this.formeChoisie() ?? (this.partie && this.forme(this.partie.id))
    const candidates = o.toutes ? [...(choisie ? [choisie] : []), ...[...this.formes].reverse()]
      : (o.outil ?? this.outil) === 'selection' && choisie ? [choisie] : []
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
    this.viderPointEnAttente()
    if (this.placement) { const p = this.placement; this.placement = null; p.annuler(); return }
    if (this.traitEnAttente) { this.annulerTrait(); return }
    const enCours = !!this.polyEnCours || this.selection.size > 0 || !!this.partie
    this.annulerPolygone(); this.selection.clear(); this.choisirPartie(null)
    this.ui.fermerMenuPartie()
    if (!enCours) {
      if (this.outil !== 'selection') {
        this.outilAvant = this.outil
        this.choisirOutil('selection')
        this.ui.message('Sélection : glisser un objet le déplace, glisser dans le vide déplace la vue. Échap : revenir.')
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
  /** La molette et le pavé tactile défilent ; Ctrl/⌘ + molette et le pincement
   *  zooment autour du pointeur ; le réglage « la molette zoome » rend à la
   *  molette d'une souris son zoom (voir lireMolette). */
  private molette(e: WheelEvent) {
    e.preventDefault()
    this.arreterAnimation()
    if (this.pinceSafari && e.ctrlKey) return      // Safari sur Mac zoome déjà par gesturechange
    const effet = lireMolette(e, this.rendu.h, reglages.molette)
    if ('zoom' in effet) {
      const s = this.ecran(e)
      this.cam.zoomerAutour(s.x, s.y, effet.zoom)
    } else this.cam.deplacer(effet.dx, effet.dy)
    this.vueChangee()
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
    if (fleches[e.key] && this.selection.size) {
      e.preventDefault()
      const k = e.shiftKey ? CM : CM / 10, [dx, dy] = fleches[e.key]
      this.tableau.modifier(this.page, this.formes.filter(f => this.selection.has(f.id) || this.lieeA(f)).map(f => ({ id: f.id, patch: { x: f.x + dx * k, y: f.y + dy * k } })))
      return
    }
    // Pendant une séance d'automatismes, le tableau est caché : sa vue ne bouge pas
    const seance = document.body.classList.contains('en-seance')
    // Sans sélection, elles déplacent la vue : → montre ce qui est à droite.
    // Un quart de ce qu'on voit (trois quarts avec Maj), en douceur ; touche
    // tenue, un douzième à chaque répétition, tout de suite (sinon la vue
    // filerait à sept écrans par seconde)
    if (fleches[e.key] && !ctrl && !e.altKey && !seance) {
      e.preventDefault()
      const r = this.ui.zoneLibre(), [sx, sy] = fleches[e.key]
      const part = (e.shiftKey ? 3 / 4 : 1 / 4) / (e.repeat ? 3 : 1)
      const dx = sx * r.l * part, dy = sy * r.h * part
      if (e.repeat) { this.arreterAnimation(); this.cam.deplacer(-dx, -dy); this.vueChangee(); return }
      // Un appui pendant le glissement du précédent part de là où il allait
      const depart = this.cible ?? { x: this.cam.x, y: this.cam.y, z: this.cam.z }
      this.allerVers({ x: depart.x - dx, y: depart.y - dy, z: depart.z }, 150)
      return
    }
    // Maj + 1 : tout voir ; Maj + 2 : voir la sélection. Par la touche (e.code) :
    // en AZERTY, Maj + 1 donne « 1 », en QWERTY « ! »
    if (e.shiftKey && !ctrl && !e.altKey && !seance && (e.code === 'Digit1' || e.code === 'Digit2')) {
      e.preventDefault()
      if (e.code === 'Digit1') this.toutVoir(); else this.voirSelection()
      return
    }
    if (ctrl) return
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
