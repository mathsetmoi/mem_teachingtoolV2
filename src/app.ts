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
import { aireDe, chevauche, dansLasso, distanceAuSegment, distanceAuTrace, interieur, partDedans, rectangle, simplifier, touche } from './geometrie'
import { change } from './habillage'
import type { Retouche } from './habillage'
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
import { APPUI_LONG, DOUBLE_CLIC_PLUME, DOUBLE_TOUCHER, PRISE_GLISSER, SEUIL_GLISSER, TOLERANCE_PRISE, TOUCHER_DOIGTS, ToucherADoigts, contactLarge, depasseSeuil, doubleToucher, ecranTactile, messageOptions, messageReconnue, messageSecondPoint, nouveauDepart, procheDuPremier, typePointeur } from './pointeurs'
import type { Depart, Toucher, ToucherReconnu, TypePointeur } from './pointeurs'
import { CTRL, MAC, lireMolette } from './navigateur'
import { avale } from './menus'
import type { TraitDirect } from './rendu'
import type { Vue } from './session'
import { ecrireSession, lireSession, oublierSession } from './session'
import type { Copie } from './presse-papiers'
import { collage, lireHtml, lireJson, memeTexte, versHtml, versTexte } from './presse-papiers'

/** La copie gardée dans le navigateur, pour un autre onglet de la même
 *  adresse (nouvelle clé : aucune autre ne change) */
const CLE_PRESSE_PAPIERS = 'mem-presse-papiers'
/** Au-delà (des images), elle ne se garde pas dans le navigateur : le
 *  presse-papiers du système la porte encore */
const GARDE_MAX = 2 * 1024 * 1024
/** Une copie oubliée ne se colle pas le lendemain */
const GARDE_DUREE = 12 * 3600 * 1000

export const COULEURS = [
  { nom: 'Noir', valeur: '#1b2230' },
  { nom: 'Bleu', valeur: '#1f5fbf' },
  { nom: 'Rouge', valeur: '#d0342c' },
  { nom: 'Vert', valeur: '#1e8a4c' },
]
export const TAILLES = [{ nom: 'Fin', valeur: 2.5 }, { nom: 'Moyen', valeur: 4.5 }, { nom: 'Épais', valeur: 9 }]

/** App.options vaut ceci quand le menu ouvert est celui de toute une
 *  sélection de plusieurs objets (le menu commun « N objets ») */
export const TOUTE_LA_SELECTION = '*'

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
  /** Un message en bas de l'écran ; avec une action, un bouton à côté du
   *  texte. cle : ce que l'action concerne (voir oublierAction) */
  message(texte: string, action?: { libelle: string; faire: () => void; cle?: string }): void
  /** Le message à action de cette clé n'a plus d'objet (la page que son
   *  « Annuler » rendait est revenue par Ctrl+Z) : il s'en va */
  oublierAction(cle: string): void
  /** Le menu du rôle du doigt (dessine, déplace, auto) */
  ouvrirReglageDoigt(): void
  ouvrirMenuPartie(id: string, prise: Prise, clientX: number, clientY: number): void
  fermerMenuPartie(): void
  /** Le menu de la page (un clic droit dans le vide), posé au point de
   *  l'appui (clientX, clientY) ; m : ce point, dans le monde, où « Coller
   *  ici » colle */
  ouvrirMenuPage(clientX: number, clientY: number, m: P): void
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
  // toucher : le doigt « qui déplace » ; levé sans avoir glissé, il fait le
  // clic attendu (voir placement) ou choisit l'objet touché
  | { type: 'pan'; dernierX: number; dernierY: number; pointeur?: number; toucher?: boolean }
  // dist, cx, cy : l'écart et le centre des deux doigts au dernier pas de la
  // vue ; parti : la vue suit les doigts (voir bouge) ; depart : les deux
  // doigts et leur écart quand le pincement a commencé
  | { type: 'pinch'; dist: number; cx: number; cy: number; parti: boolean; depart: { a: DoigtPose; b: DoigtPose; dist: number } }
  // Le premier doigt d'un outil qui écrit dès l'appui, retenu un instant (voir
  // ecrireOuRetenir) : m et s, le point de l'appui (monde, écran) ; maj : Maj tenue
  | { type: 'retenu'; m: P; s: P; maj: boolean; pointeur: number; minuterie: number }
  // apresMenu : l'appui qui a commencé le trait fermait un menu ; levé sans
  // avoir glissé, il ne pose rien. surObjet : il est parti d'une figure ou
  // d'une formule (un double-clic peut suivre, voir mettreEnAttente).
  // second : il est peut-être le second toucher de ce double-clic (voir secondClic)
  | { type: 'dessin'; pointeur: number; apresMenu?: boolean; surObjet?: string; second?: boolean }
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
  // Glisser depuis le vide, à l'outil Sélection : un cadre à la souris, un
  // lasso au stylet et au doigt (pts : le lasso, en monde, à plat). ajout :
  // Maj, Ctrl (⌘) ou le mode « Ajouter » ; ce qui est pris s'ajoute alors à la
  // sélection. candidat : l'objet que l'appui touchait sans le saisir
  // (l'intérieur d'une figure fermée, un tracé un peu loin) ; levé sans avoir
  // glissé, il le prend
  | { type: 'zone'; forme: 'cadre' | 'lasso'; x: number; y: number; pts: number[]; ajout: boolean; candidat?: string }
  | { type: 'formule' }

/** Un doigt posé, à l'écran */
type DoigtPose = { id: number; x: number; y: number }

/** Un morceau d'une figure qu'on attrape : le nom d'un point, un sommet, le rayon */
export type Prise = { quoi: 'nom' | 'sommet'; i: number } | { quoi: 'rayon' }

/** Ce que prend le pointeur, et par où (voir cibleSous) */
type Cible = { f: Forme; par: 'trace' | 'morceau' | 'plein' | 'dedans'; ecart: number }

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
  /** Ce dont le menu complet est ouvert (clic droit, double-clic…, voir
   *  demanderOptions) : l'identifiant de l'objet seul sélectionné, ou
   *  TOUTE_LA_SELECTION pour le menu commun de plusieurs objets */
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
   *  l'objet) avant d'être posé, et reste dessiné en attendant. heure : celle
   *  de son lever (Date.now()), que garde l'étape du film. */
  private pointEnAttente: { trait: Trait; ms: number[]; heure: number; page: string; objet: string; x: number; y: number;
    minuterie: number } | null = null
  /** L'heure du dernier double appui traité : le dblclick du navigateur qui
   *  le suit ne refait rien */
  private doubleTraite = -Infinity
  /** Le clic qui suit un double appui traité est encore à venir (voir brancherGestes) */
  private clicFantome = false
  /** Le dernier simple toucher du doigt sur un objet (outil Sélection, ou
   *  doigt qui déplace) : un second, tout près et tout de suite, ouvre ses
   *  options (voir secondToucher) */
  private toucherPrecedent: (Toucher & { objet: string; page: string }) | null = null
  /** Ce second toucher, posé : levé sans avoir glissé, il ouvre les options de l'objet */
  private doubleEnCours: { objet: string; pointeur: number } | null = null
  /** L'appui long armé (voir armerAppuiLong) : le pointeur qui le tient,
   *  l'endroit de l'appui (fenêtre), et la minuterie qui ouvrira le menu */
  private appuiLong: { pointeur: number; clientX: number; clientY: number; type: TypePointeur; minuterie: number } | null = null
  /** Le pointeur d'un appui long, et l'heure de son lever : le clic que le
   *  navigateur en tire ne fait rien (voir brancherGestes) */
  private clicApresAppuiLong: { pointeur: number; leve: number } | null = null
  /** Le toucher à deux ou trois doigts en cours (voir gesteDesDoigts) */
  private toucherDoigts = new ToucherADoigts()
  /** La dernière poussée aux flèches : sa page, et l'étape de la pile de la
   *  page qu'elle a faite ou prolongée (voir pousser) */
  private poussee: { page: string; etape: unknown } | null = null
  /** Le mode « Ajouter » au doigt (voir ajoutTactile). vu : la sélection a eu
   *  quelque chose depuis qu'il est allumé */
  private ajout = { actif: false, vu: false }
  private astuceAjout = false
  /** Une mise à jour de l'interface est déjà prévue après un changement de pile */
  private majPiles = false
  /** La dernière copie faite dans cet onglet (Ctrl+C, Ctrl+X) */
  private copie: Copie | null = null
  /** Où sont allés les collages de la copie `cle` (son heure) : la place du
   *  dernier sur chaque page, et le pointeur d'alors (à la copie, puis à
   *  chaque collage). Trois Ctrl+V sans bouger la souris s'étagent. */
  private collages: { cle: number; pointeur: { clientX: number; clientY: number } | null; pages: Map<string, P> } | null = null
  /** La copie que l'événement copy doit ranger (voir ecrireSysteme) */
  private copieAEcrire: Copie | null = null
  private copieEcrite = false
  /** L'heure de la dernière copie que le presse-papiers du système a
   *  refusée : Ctrl+V la colle quand même (voir surColler) */
  private copieHorsSysteme = 0
  /** Ctrl+V attend l'événement paste ; s'il ne vient pas (un navigateur qui ne
   *  le donne pas hors d'un champ de saisie), la copie gardée se colle */
  private collageAttendu = 0
  /** L'heure de la dernière copie : deux copies n'ont jamais la même */
  private heureCopie = 0
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
    // Une pile d'annulation a changé : ↶ et ↷ se remettent à jour, une fois,
    // juste après (voir Tableau.onPiles). Sans cela, ↶ resterait grisé après
    // ↷, après les flèches qui poussent la sélection, après le point d'un
    // simple toucher posé par sa minuterie, et ne se toucherait plus au doigt.
    tableau.onPiles = () => {
      if (this.majPiles) return
      this.majPiles = true
      queueMicrotask(() => { this.majPiles = false; this.ui?.maj() })
    }

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
    window.addEventListener('paste', e => this.surColler(e))
    // La copie part dans le presse-papiers du système par execCommand('copy')
    // (voir ecrireSysteme), qui déclenche cet événement : on y range la
    // copie, en texte et marquée dans le HTML. Safari n'accepte « copy » sans
    // texte choisi sur la page que si beforecopy a été empêché. Une copie
    // ordinaire (du texte choisi dans une fenêtre) passe sans rien changer.
    document.addEventListener('beforecopy', e => { if (this.copieAEcrire) e.preventDefault() })
    document.addEventListener('copy', e => {
      const c = this.copieAEcrire
      if (!c || !e.clipboardData) return
      e.clipboardData.setData('text/plain', versTexte(c))
      e.clipboardData.setData('text/html', versHtml(c))
      e.preventDefault()
      this.copieEcrite = true
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
    // Rien ne reste choisi d'une page à l'autre : ni la sélection, ni un
    // morceau de figure (Suppr, au retour, l'ôterait sans qu'on le voie choisi)
    this.selection.clear()
    this.finirAjout()
    this.ui?.fermerMenuPartie()
    if (this.partie) this.choisirPartie(null)
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

  /** La poubelle de la barre du haut. Pas de question : la page part tout
   *  de suite, et « Annuler » (dans le message, 7 s) ou Ctrl+Z, juste après,
   *  sur la page où l'on se retrouve, la ramène à sa place, entière (voir
   *  Tableau.jeterPage). On arrive sur la page d'avant (la suivante pour la
   *  première). Une page seule n'est jamais jetée : on l'efface, ce qui
   *  s'annule aussi ; vide, il n'y a rien à faire. */
  supprimerPage() {
    this.viderPointEnAttente()
    const pages = this.pages, id = this.page, i = pages.indexOf(id)
    if (i < 0) return
    if (pages.length <= 1) {
      if (!this.formes.length) return this.ui.message('La page est déjà vide.')
      this.viderPage()
      // L'effacement fait seul son étape : rien ne s'y ajoute ensuite
      this.tableau.nouveauGeste()
      const pile = this.tableau.annulationDe(id)
      const haut = pile?.undoStack[pile.undoStack.length - 1]
      this.ui.message('Page effacée', { libelle: 'Annuler', faire: () => {
        // Le bouton ne défait que l'effacement, s'il est encore le dernier
        // geste de la page ; sinon il défairait autre chose, qu'on ne voit pas
        this.viderPointEnAttente()
        const p = this.tableau.annulationDe(id)
        if (!haut || !p || p.undoStack[p.undoStack.length - 1] !== haut) return this.ui.message('La page a changé depuis : ↶ défait les gestes un à un.')
        this.allerPage(id)
        this.annuler()
      } })
      return
    }
    const voisine = pages[i > 0 ? i - 1 : 1]
    this.allerPage(voisine)
    if (!this.tableau.jeterPage(id, voisine)) return
    this.ui.message(`Page ${i + 1} supprimée`, { libelle: 'Annuler', faire: () => this.rendrePage(id), cle: 'page:' + id })
  }

  /** Rend une page jetée (le bouton « Annuler » de son message) : elle
   *  revient à sa place, avec tout ce qu'elle avait, et on la regarde. Rien
   *  si elle est déjà revenue (un Ctrl+Z l'a rendue). Sa vue l'attend : on
   *  l'a gardée en la quittant. */
  rendrePage(id: string): boolean {
    this.viderPointEnAttente()
    const k = this.tableau.rendrePage(id)
    if (k < 0) return false
    this.revenirSur(id, k)
    return true
  }

  /** On regarde la page qui vient de revenir, et un message le dit */
  private revenirSur(id: string, k: number) {
    this.allerPage(id)
    this.ui.oublierAction('page:' + id)
    this.ui.message(`Page ${k + 1} rétablie`)
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
    this.finirAjout()
    this.outil = o
    if (o !== 'selection') this.selection.clear()
    this.majPoignees()
    this.rendu.gomme = null
    this.rendu.toutRedessiner()
    this.zone.dataset.outil = o
    this.ui?.maj()
  }

  /** Défait le dernier geste de la page qu'on regarde, et d'elle seule :
   *  chaque page garde sa pile (voir Tableau.annulationDe), et rien ne change
   *  jamais là où l'on ne regarde pas. Le point d'un simple toucher au Stylo,
   *  qui attend un double-clic, se pose d'abord : c'est le dernier geste
   *  visible, c'est lui qui part. Vrai si un geste a été défait.
   *  L'interface est remise à jour APRÈS avoir vidé la sélection : le
   *  rafraîchissement déclenché par l'annulation passe avant, et laisserait
   *  le panneau d'options ouvert sur une figure qui n'est plus choisie.
   *  Juste après « Supprimer la page », c'est la page jetée qui revient : on
   *  y va, un message le dit, et la réponse est 'page' (le message est déjà
   *  dit) ; sinon, vrai si un geste a été défait. */
  annuler(): 'page' | boolean {
    this.viderPointEnAttente()
    const r = this.tableau.annuler(this.page)
    if (r?.page) {
      this.revenirSur(r.page, this.pages.indexOf(r.page))
      return 'page'
    }
    this.selection.clear(); this.rendu.redessinerDirect(); this.ui?.maj()
    return r !== null
  }

  /** Refait le dernier geste défait sur la page qu'on regarde. Comme annuler :
   *  la sélection se vide (ce qui revient peut recouvrir ce qui était choisi)
   *  et l'interface se remet à jour. Vrai si un geste a été refait. */
  retablir(): boolean {
    this.viderPointEnAttente()
    const fait = this.tableau.retablir(this.page)
    this.selection.clear(); this.rendu.redessinerDirect(); this.ui?.maj()
    return fait
  }

  /** ↶ a-t-il quelque chose à faire sur cette page ? Le point qui attend un
   *  double-clic compte : Ctrl+Z le pose, puis le retire. */
  peutAnnuler(): boolean {
    return this.pointEnAttente?.page === this.page || this.tableau.peutAnnuler(this.page)
  }

  /** ↷ ? Pas pendant qu'un point attend : posé, il oublie ce qui était à refaire. */
  peutRetablir(): boolean {
    return this.pointEnAttente?.page !== this.page && this.tableau.peutRetablir(this.page)
  }

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

  /** Ce qu'on prend sous le pointeur (outil Sélection, doigt qui déplace,
   *  clic droit), m dans le monde, s à l'écran, et par où on le prend :
   *  - 'trace' : près de son tracé, à TOLERANCE_PRISE pixels d'écran au plus
   *    selon le pointeur (ecart : à combien) ;
   *  - 'morceau' : un morceau qui sort d'une figure (le centre d'un cercle, le
   *    nom d'un sommet), dans n'importe quelle figure ; c'est la figure
   *    entière qu'on prend, le morceau au clic suivant ;
   *  - 'plein' : dans une formule, une image, une figure coloriée ;
   *  - 'dedans' : dans une figure fermée sans fond, seulement si o.dedans
   *    (l'outil Sélection, le toucher du doigt qui déplace : jamais sous un
   *    outil de dessin, où écrire dans un triangle ne doit pas le prendre).
   *  Le bord le plus proche l'emporte : un trait ou une petite figure écrits
   *  dans un grand cadre se prennent avant le cadre. Un plein cache ce qui est
   *  sous lui à cet endroit. L'ordre, en détail : les tracés à 6 px ou moins
   *  (le plus proche), les morceaux, l'intérieur s'il est plein (entre lui et
   *  les intérieurs nus, le plus petit), les tracés plus loin, enfin
   *  l'intérieur nu. Une seule boucle sur les formes, chacune écartée d'abord
   *  par sa boîte : le survol reste léger sur une page de milliers de traits. */
  private cibleSous(m: P, s: P, o: { pointeur: TypePointeur; dedans: boolean }): Cible | null {
    const z = this.cam.z, tol = TOLERANCE_PRISE[o.pointeur], r = tol / z
    type Candidat = { f: Forme; i: number; ecart: number }
    const traces: Candidat[] = [], pleins: Candidat[] = [], nus: Candidat[] = []
    for (let i = 0; i < this.formes.length; i++) {
      const f = this.formes[i]
      const infinie = f.type === 'polygone' && !!f.prolonge          // une droite dépasse sa boîte
      const b = this.boiteDeForme(f)
      if (!infinie) {
        if (!b) continue
        // Un point seul se prend à 6 unités de plus (voir distanceAuTrace)
        const k = r + (f.type === 'polygone' && f.pts.length === 2 ? 6 : 0)
        if (m.x < b.x - k || m.x > b.x + b.l + k || m.y < b.y - k || m.y > b.y + b.h + k) continue
      }
      const d = distanceAuTrace(f, m.x, m.y, b) * z
      if (d <= tol) traces.push({ f, i, ecart: d })
      const dans = interieur(f, m.x, m.y, b)
      if (dans === 'plein') pleins.push({ f, i, ecart: 0 })
      else if (dans === 'nu' && o.dedans) nus.push({ f, i, ecart: 0 })
    }
    // Vu de près, l'intérieur d'une figure qui déborde tout l'écran (un grand
    // cercle à 800 %) ne prend rien : on regarde ce qui est dedans, et un
    // toucher dans le vide doit pouvoir désélectionner (règle de tldraw)
    if (nus.length) {
      const zl = this.ui?.zoneLibre() ?? { x: 0, y: 0, l: this.rendu.l, h: this.rendu.h }
      for (let k = nus.length - 1; k >= 0; k--) {
        const g = this.boiteGeometrique(nus[k].f)
        const a = this.cam.versEcran(g.x, g.y), c = this.cam.versEcran(g.x + g.l, g.y + g.h)
        if (a.x <= zl.x && a.y <= zl.y && c.x >= zl.x + zl.l && c.y >= zl.y + zl.h) nus.splice(k, 1)
      }
    }
    // Un plein cache ce qui est sous lui : une image posée sur un trait se
    // prend par l'image, une formule posée sur une image par la formule
    const haut = pleins.length ? pleins[pleins.length - 1].i : -1
    const visibles = (l: Candidat[]) => l.filter(c => c.i >= haut)
    const tous = visibles(traces), plein = pleins.length ? pleins[pleins.length - 1] : null, vides = visibles(nus)
    // Le plus proche, et à un demi-pixel près, le plus haut
    const plusProche = (l: Candidat[]) => {
      if (!l.length) return null
      const min = Math.min(...l.map(c => c.ecart))
      return l.filter(c => c.ecart <= min + 0.5).reduce((a, c) => (c.i > a.i ? c : a))
    }
    const net = plusProche(tous.filter(c => c.ecart <= TOLERANCE_PRISE.mouse))
    if (net) return { f: net.f, par: 'trace', ecart: net.ecart }
    // Le sommet d'une figure cachée sous une image ne se prend pas à travers
    // elle : c'est l'image qu'on touche, comme avant
    const morceau = this.priseSous(s, { toutes: true })
    if (morceau && this.formes.indexOf(morceau.f) >= haut) return { f: morceau.f, par: 'morceau', ecart: 0 }
    // L'intérieur : le plus petit l'emporte (un triangle sans fond dans un
    // grand rectangle colorié se prend par son milieu), puis le plus haut
    const dedans = [...(plein ? [plein] : []), ...vides].map(c => ({ ...c, aire: aireDe(c.f, this.boiteDeForme(c.f)) }))
    const gagnant = dedans.length ? dedans.reduce((a, c) => (c.aire < a.aire || (c.aire === a.aire && c.i > a.i) ? c : a)) : null
    if (gagnant && gagnant === dedans[0] && plein) return { f: gagnant.f, par: 'plein', ecart: 0 }
    const loin = plusProche(tous)
    if (loin) return { f: loin.f, par: 'trace', ecart: loin.ecart }
    return gagnant ? { f: gagnant.f, par: 'dedans', ecart: 0 } : null
  }

  /** L'objet que prend le pointeur (voir cibleSous) */
  private objetSous(m: P, s: P, o: { pointeur: TypePointeur; dedans: boolean }): Forme | null {
    return this.cibleSous(m, s, o)?.f ?? null
  }

  /** L'appui SAISIT-il l'objet visé (glissé, il l'emporte) ? Par un morceau,
   *  par un plein, ou tout près de son tracé (PRISE_GLISSER) ; plus loin, un
   *  toucher le prend mais un glisser ne l'emporte pas. */
  private saisi(c: { par: string; ecart: number }, pointeur: TypePointeur): boolean {
    return c.par === 'morceau' || c.par === 'plein' || (c.par === 'trace' && c.ecart <= PRISE_GLISSER[pointeur])
  }

  /** La boîte d'une figure fermée, sans marge pour l'épaisseur ni les noms */
  private boiteGeometrique(f: Forme): Boite {
    if (f.type === 'cercle') return { x: f.x - f.r, y: f.y - f.r, l: 2 * f.r, h: 2 * f.r }
    const b = this.boiteDeForme(f)
    if (f.type !== 'polygone') return b ?? { x: f.x, y: f.y, l: 0, h: 0 }
    let x1 = Infinity, y1 = Infinity, x2 = -Infinity, y2 = -Infinity
    for (let i = 0; i < f.pts.length; i += 2) {
      x1 = Math.min(x1, f.pts[i]); x2 = Math.max(x2, f.pts[i]); y1 = Math.min(y1, f.pts[i + 1]); y2 = Math.max(y2, f.pts[i + 1])
    }
    return { x: f.x + x1, y: f.y + y1, l: x2 - x1, h: y2 - y1 }
  }

  private brancherGestes() {
    const z = this.zone
    z.addEventListener('pointerdown', e => this.bas(e))
    z.addEventListener('pointermove', e => this.bouge(e))
    z.addEventListener('pointerup', e => this.haut(e))
    z.addEventListener('pointercancel', e => this.haut(e, true))
    z.addEventListener('wheel', e => this.molette(e), { passive: false })
    // Le clic droit ouvre le menu complet à l'APPUI du bouton (voir bas et
    // demanderOptions) ; l'événement contextmenu, lui, ne fait plus rien
    // d'autre qu'écarter le menu du navigateur. Sous Windows Ink (la tablette
    // graphique de la classe), « appuyer longuement pour cliquer avec le
    // bouton droit » envoie un clic droit AU LEVER, après la fin du trait : un
    // stylet tenu immobile une seconde (une hésitation, ou un tracé tenu pour
    // que la figure soit reconnue) ouvrirait un menu, celui de la page dans le
    // vide. Android, la Surface et Windows tactile en envoient un aussi à
    // l'appui long du doigt, que l'appui long de MEM remplace par son propre
    // minuteur (voir armerAppuiLong ; l'iPad n'en envoie pas) : jamais deux
    // menus. Un vrai clic droit, lui, commence toujours par l'appui du
    // bouton 2, comme le bouton du stylet. Conséquence acceptée : la touche
    // Menu du clavier (Maj + F10) n'ouvre rien sur le tableau.
    z.addEventListener('contextmenu', e => e.preventDefault())
    // Double-clic : le menu complet de l'objet (une formule, elle, se modifie,
    // comme un texte partout ; dans une sélection de plusieurs objets, le
    // menu commun).
    // Pas sur un morceau choisi (son menu vient de s'ouvrir), ni juste après
    // un double appui déjà traité (au Stylo, voir doubleClicPlume ; au
    // doigt, voir secondToucher)
    z.addEventListener('dblclick', e => {
      if (this.enLecture || this.partie || performance.now() - this.doubleTraite < 500) return
      // Au Stylo et au Surligneur, le double-clic est celui de la plume, plus
      // serré que celui du navigateur (voir secondClic) : deux points écrits
      // tout près sur une formule n'ouvrent pas son éditeur
      if (this.outil === 'stylo' || this.outil === 'surligneur') return
      // Au doigt, l'outil Sélection et le doigt qui déplace ont leur double
      // appui (secondToucher) : la même règle sur l'iPad et ailleurs
      if (this.dernierPointeur === 'touch' && (this.outil === 'selection' || this.doigtDeplace)) return
      // La Sélection vise comme son clic (l'intérieur d'une figure compris) ;
      // la Main et le Segment, le tracé seul, à la portée du pointeur
      const p = this.monde(e), pointeur = this.dernierPointeur
      const f = this.outil === 'selection' ? this.objetSous(p, this.ecran(e), { pointeur, dedans: true })
        : this.outil === 'main' || this.outil === 'segment' ? this.formeSous(p.x, p.y, TOLERANCE_PRISE[pointeur])
        : this.formeSous(p.x, p.y)
      if (f && this.selection.size > 1 && this.selection.has(f.id)) this.ouvrirOptionsSelection()
      else if (f?.type === 'formule') this.modifierFormule(f)
      else if (f && (this.outil === 'selection' || this.outil === 'main' || this.outil === 'segment')) this.ouvrirOptions(f)
    })
    // Le clic que le navigateur tire du lever d'un appui long : Chrome (sous
    // Windows, au TNI, sur une Surface) en donne un, même après une seconde,
    // et il tomberait sur le menu qui vient de s'ouvrir sous le doigt (sa
    // poubelle…). Il ne fait rien. On le reconnaît à son pointeur (le clic
    // de Chrome porte celui du doigt) ; un navigateur qui n'en dit rien, au
    // clic qui suit le lever de tout près. Un vrai clic d'après passe.
    window.addEventListener('click', e => {
      const c = this.clicApresAppuiLong
      if (!c || !c.leve) return
      const id = (e as Partial<PointerEvent>).pointerId, depuis = performance.now() - c.leve
      const sien = id === c.pointeur || (id === undefined && depuis < 100)
      if (sien || depuis > 1000) this.clicApresAppuiLong = null
      if (sien) { e.preventDefault(); e.stopPropagation() }
    }, true)
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

  /** Un pincement des deux premiers doigts. parti : la vue suit déjà les
   *  doigts (un pincement réancré quand un troisième se lève) ; sinon elle
   *  attend qu'ils aient bougé (voir bouge) */
  private pincement(doigts: DoigtPose[], parti = false): Geste {
    const [a, b] = doigts
    const dist = Math.hypot(a.x - b.x, a.y - b.y)
    return { type: 'pinch', dist, cx: (a.x + b.x) / 2, cy: (a.y + b.y) / 2, parti, depart: { a: { ...a }, b: { ...b }, dist } }
  }

  /** L'appui est-il devenu un glisser ? (voir SEUIL_GLISSER) */
  private aGlisse(s: P): boolean { return depasseSeuil(this.depart, s.x, s.y) }

  // ---------- Appuyer, glisser, lever ----------
  /** Un appui. L'ordre compte : l'appui long d'un autre pointeur oublié, la
   *  paume écartée, le doigt noté pour le toucher à plusieurs doigts, le
   *  pointeur noté, le stylet qui reprend la main au doigt, deux doigts qui
   *  pincent ; puis, si rien n'est en cours, le clic droit qui ouvre un menu,
   *  un menu ouvert qui se ferme, le second toucher d'un double-clic, et
   *  enfin ce que fait le pointeur avec l'outil (et l'appui long qui s'arme). */
  private bas(e: PointerEvent) {
    const s = this.ecran(e)
    // Tout autre appui (le second doigt d'un pincement, une paume, le stylet)
    // n'est plus un appui long
    this.desarmerAppuiLong()
    // Le bout gomme du stylet (le stylet retourné) efface, quel que soit l'outil
    const gommeDuStylet = e.pointerType === 'pen' && (e.button === 5 || (e.buttons & 32) !== 0)
    // La paume, quand le doigt ne dessine pas : rien jusqu'à son lever, et ce
    // n'est pas un toucher à deux doigts
    if (this.paume(e)) { this.ignores.add(e.pointerId); this.toucherDoigts.oublier(); return }
    // Le toucher à deux ou trois doigts (voir gesteDesDoigts) se suit doigt
    // par doigt ; un stylet posé l'abandonne. Jamais pendant la revue.
    if (e.pointerType === 'touch' && !this.enLecture) this.toucherDoigts.poser(e.pointerId, s.x, s.y, heureDe(e))
    else this.toucherDoigts.oublier()
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
      // La barre d'actions se cache le temps du pincement (voir enMouvement)
      if (this.selection.size) this.ui.maj()
      return
    }
    if (this.geste) return

    // Le clic droit (le bouton du stylet en est un ; sur Mac, Ctrl + clic) :
    // le menu complet, à l'APPUI du bouton, et aucun geste. Seulement quand
    // rien n'est en cours : un bouton pressé pendant un glisser ou un trait
    // n'envoie pas d'appui (le navigateur l'accorde au geste), il n'ouvre
    // rien. Le petit menu qui était ouvert vient de se fermer (menus.ts, en
    // capture) ; l'autre s'ouvre (voir demanderOptions).
    const droit = e.button === 2 || (MAC && e.ctrlKey && e.button === 0 && e.pointerType !== 'touch')
    if (droit) { this.demanderOptions(e, typePointeur(e.pointerType)); return }

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
    // L'objet dont le menu est ouvert, qu'on prend pour le déplacer, le
    // garde : il reparaît au lever (le menu commun d'une sélection de
    // plusieurs objets, quand on en prend un). Un clic attendu par le menu
    // (Désigner, Tracer un axe ou un centre) est pour lui : le menu reste.
    const prend = this.outil === 'selection' || doigt
    const pointeur = typePointeur(e.pointerType)
    const vise = prend ? this.objetSous(m, s, { pointeur, dedans: true }) : null
    const garder = !!vise && (this.options === TOUTE_LA_SELECTION ? this.selection.has(vise.id) : vise.id === this.options)
    const apresMenu = !pan && !this.placement && (avale(e) || this.ui.fermerMenus(garder))
    if (apresMenu) {
      // Deux doigts posés pour fermer un menu n'annulent rien
      this.toucherDoigts.oublier()
      const continuer = e.button === 0 && !gommeDuStylet && (
        (this.instruments.size > 0 && !!this.instrumentSous(m))
        || (prend && (!!prise || !!vise))
        || (!doigt && (this.outil === 'stylo' || this.outil === 'surligneur')))
      if (!continuer) return
    }

    // Le point d'un simple toucher au Stylo sur un objet attend peut-être ce
    // second toucher (le double-clic, voir secondClic). Tout autre appui le
    // pose d'abord, à sa place dans l'historique.
    if (this.pointEnAttente && (pan || !!apresMenu || !this.secondClic(e, s, doigt || gommeDuStylet))) this.viderPointEnAttente()
    // Le second toucher d'un double appui au doigt (outil Sélection, ou doigt
    // qui déplace) : noté ici, il ouvrira les options de l'objet à son lever
    this.secondToucher(e, s, m)

    this.depart = nouveauDepart(s.x, s.y, e.pointerId, e.pointerType, performance.now())
    if (pan) {
      this.geste = { type: 'pan', dernierX: s.x, dernierY: s.y }
      // L'outil Main au doigt qui « déplace » : l'appui long y ouvre le menu,
      // comme sous les autres outils (voir armerAppuiLong)
      if (this.outil === 'main' && e.button === 0) this.armerAppuiLong(e)
      return
    }
    if (e.button !== 0 && !gommeDuStylet) return

    // Un clic attendu (où commencer une construction, Désigner, Tracer un axe
    // ou un centre) : c'est celui-ci. Au doigt « qui déplace », c'est son
    // lever, s'il n'a pas glissé (voir basDoigt) : glissé, il déplace la vue
    // pour chercher la place.
    if (this.placement && !doigt) { const p = this.placement; this.placement = null; p.clic(m); return }
    this.tableau.nouveauGeste()
    // Le bout gomme passe avant tout le reste : le bord d'un instrument, les
    // instruments, les sommets. L'outil en main ne change pas.
    if (gommeDuStylet) { this.commencerGomme(m, true); return }
    // Le doigt qui « déplace » a son propre geste sous les autres outils. À la
    // Sélection, il fait comme la souris et le stylet (un doigt qui glisse dans
    // le vide trace un lasso, la vue se déplace à deux doigts), sauf quand un
    // clic est attendu : il cherche alors la place en déplaçant la vue.
    if (doigt && (this.outil !== 'selection' || this.placement)) { this.basDoigt(e, s, m, prise); this.armerAppuiLong(e); return }
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
        this.geste = { type: 'dessin', pointeur: e.pointerId, apresMenu: apresMenu || undefined, surObjet, second: !!this.pointEnAttente || undefined }
        this.dernierMouvement = performance.now()
        this.immobilite = new Immobilite(m)
        this.attendreImmobilite()
        this.rendu.redessinerDirect()
        break
      }
      case 'segment': {
        // Second clic d'un trait en deux clics : il le finit
        if (this.traitEnAttente) { this.ecrireOuRetenir(e, m, s); break }
        const a = this.accrocher(m).p
        this.geste = { type: 'segment', x: a.x, y: a.y }
        this.rendu.monSegment = { x1: a.x, y1: a.y, x2: a.x, y2: a.y, couleur: this.couleur, taille: this.taille }
        break
      }
      case 'forme': {
        if (this.typeForme === 'polygone') { this.ecrireOuRetenir(e, m, s); break }
        const a = this.aimanter(m)
        this.geste = { type: this.typeForme, x: a.x, y: a.y }
        break
      }
      case 'point':
      case 'gomme': this.ecrireOuRetenir(e, m, s); break
      case 'selection': {
        const c = this.cibleSous(m, s, { pointeur, dedans: true })
        // Maj + clic, ou Ctrl + clic (⌘ sur Mac, où Ctrl + clic est un clic
        // droit), ou le mode « Ajouter » au doigt : l'objet entre dans la
        // sélection, ou en sort ; un cadre ou un lasso s'y ajoute
        const ajout = e.shiftKey || (MAC ? e.metaKey : e.ctrlKey) || this.ajoutTactile
        // Saisir ou entourer. Un objet qu'on saisit (tout près de son tracé, par
        // un morceau, par un plein) ou déjà sélectionné se glisse. Sinon, même
        // si l'appui touche quelque chose (l'intérieur d'une figure fermée sans
        // fond, un tracé un peu plus loin), glisser entoure : on prend ce qu'on
        // a écrit dans un grand cadre, ou un mot dont on part à 15 px, comme
        // chez tldraw et Excalidraw ; levé sans glisser, l'appui prend l'objet.
        if (c && (this.saisi(c, pointeur) || this.selection.has(c.f.id))) {
          const f = c.f
          const retirer = ajout && this.selection.has(f.id) ? f.id : undefined
          if (!this.selection.has(f.id)) { if (!ajout) this.selection.clear(); this.selection.add(f.id) }
          this.direOptions()
          this.geste = { type: 'deplacer', x: m.x, y: m.y, bouge: false, retirer }
        } else {
          // Un cadre à la souris (le pavé tactile en est une), un lasso libre au
          // stylet (tablette graphique comprise) et au doigt
          this.geste = { type: 'zone', forme: e.pointerType === 'mouse' ? 'cadre' : 'lasso', x: m.x, y: m.y, pts: [m.x, m.y], ajout, candidat: c?.f.id }
        }
        this.armerAppuiLong(e)
        this.rendu.redessinerDirect(); this.ui.maj()
        break
      }
      case 'formule':
        this.geste = { type: 'formule' }
        break
    }
  }

  /** Le doigt qui « déplace et sélectionne », sous un autre outil que la
   *  Sélection (ou quand un clic est attendu) : jamais d'encre. Il prend un
   *  instrument, un morceau de la figure sélectionnée (prise, lu par bas()),
   *  ou ce qui est déjà sélectionné pour le déplacer ; ailleurs, même sur un
   *  objet, il déplace la vue (un doigt qui traverse une page chargée
   *  n'emporte pas un trait). Levé sans avoir glissé, il choisit l'objet
   *  touché (voir toucherObjet). Quand un clic est attendu (voir placement),
   *  il déplace la vue, ou, levé sans avoir glissé, il fait ce clic. */
  private basDoigt(e: PointerEvent, s: P, m: P, prise: { prise: Prise; f: Figure } | null) {
    if (this.placement) { this.geste = { type: 'pan', dernierX: s.x, dernierY: s.y, pointeur: e.pointerId, toucher: true }; return }
    const inst = this.instruments.size ? this.instrumentSous(m) : null
    if (inst) { this.prendreInstrument(inst, m); return }
    if (prise) { this.prendrePoignee(prise); return }
    // Glisser n'emporte qu'un objet sélectionné saisi par son tracé (ou son
    // plein) : un doigt qui fait défiler en partant du milieu d'un grand cadre
    // sélectionné déplace la vue, pas le cadre
    const c = this.cibleSous(m, s, { pointeur: 'touch', dedans: false })
    if (c && this.selection.has(c.f.id) && this.saisi(c, 'touch')) { this.geste = { type: 'deplacer', x: m.x, y: m.y, bouge: false, doigt: true }; return }
    this.geste = { type: 'pan', dernierX: s.x, dernierY: s.y, pointeur: e.pointerId, toucher: true }
  }

  // ---------- Le premier doigt d'un outil qui écrit dès l'appui ----------
  /** La Gomme efface ce qu'elle touche, le Point se pose, le Polygone prend
   *  un sommet, le second clic du Segment finit le trait : ces outils écrivent
   *  dès l'appui. Au doigt qui dessine, les gestes à deux doigts allumés, le
   *  premier doigt attend un peu (TOUCHER_DOIGTS.arrivee) : sans cela, le
   *  toucher à deux doigts défairait ce que le premier vient de faire, au
   *  lieu du geste d'avant. Un second doigt pendant l'attente fait un
   *  pincement (abandonnerGeste efface la minuterie) : rien n'est écrit.
   *  Sinon, l'appui fait ce qu'il a toujours fait, au premier de ces moments :
   *  l'échéance, le seuil du glisser passé (voir bouge), le lever (voir
   *  leverGeste). Le Stylo et le Surligneur n'attendent pas : leur encre part
   *  tout de suite, et le pincement la jette déjà. */
  private ecrireOuRetenir(e: PointerEvent, m: P, s: P) {
    if (e.pointerType !== 'touch' || !reglages.gestes) { this.ecrireDesLAppui(m, s, e.shiftKey); return }
    const g: Extract<Geste, { type: 'retenu' }> = { type: 'retenu', m, s, maj: e.shiftKey, pointeur: e.pointerId, minuterie: 0 }
    g.minuterie = window.setTimeout(() => { if (this.geste === g) this.lancerRetenu(g) }, TOUCHER_DOIGTS.arrivee)
    this.geste = g
  }

  /** Ce que fait l'appui de ces outils (m, s : le point de l'appui, dans le
   *  monde et à l'écran ; maj : Maj tenue) */
  private ecrireDesLAppui(m: P, s: P, maj: boolean) {
    switch (this.outil) {
      case 'point': this.placerPoint(m); break
      case 'gomme': this.commencerGomme(m, false); break
      case 'forme': if (this.typeForme === 'polygone') this.pointDuPolygone(this.accrocher(m).p, s); break
      case 'segment': {
        const a = this.traitEnAttente
        if (!a) break
        this.traitEnAttente = null
        this.finirTrait(a, this.boutDuTrait(a, m, maj))
        break
      }
    }
  }

  /** Le doigt retenu agit enfin : la Gomme devient le geste en cours (elle
   *  efface ce que le doigt traverse ensuite), le reste est fait */
  private lancerRetenu(g: Extract<Geste, { type: 'retenu' }>) {
    clearTimeout(g.minuterie)
    if (this.geste === g) this.geste = null
    this.tableau.nouveauGeste()
    this.ecrireDesLAppui(g.m, g.s, g.maj)
  }

  // ---------- L'appui long ----------
  /** Un appui tenu APPUI_LONG ms sans glisser ouvrira le menu complet de ce
   *  qui est dessous (le menu de la page dans le vide), comme un clic droit.
   *  Au doigt : à l'outil Sélection (quel que soit le rôle du doigt), et au
   *  doigt qui « déplace » sous n'importe quel outil. Au stylet : seulement
   *  posé sur l'écran lui-même (iPad, Surface, tablette Android) et à la
   *  Sélection ; celui d'une tablette graphique a son bouton, et un stylet
   *  qui marque un temps sur un objet avant de le glisser ne doit pas ouvrir
   *  de menu. Jamais au Stylo ni au Surligneur (un point qu'on tient, une
   *  lettre qu'on commence), ni quand un clic est attendu ; et seulement sur
   *  un appui qui prend, déplace ou entoure (pas sur un instrument, un
   *  sommet, un trait qu'on tire). Notre propre minuterie : l'iPad n'envoie
   *  pas de contextmenu, et celui d'Android ou de Windows n'ouvre plus rien. */
  private armerAppuiLong(e: PointerEvent) {
    const g = this.geste
    if (!g || this.placement || this.enLecture || this.depart.pointeur !== e.pointerId) return
    const doigt = e.pointerType === 'touch' && (this.outil === 'selection' || this.doigtDeplace)
    const stylet = e.pointerType === 'pen' && this.outil === 'selection' && ecranTactile()
    if (!doigt && !stylet) return
    if (!(g.type === 'deplacer' && !g.bouge) && g.type !== 'zone' && !(g.type === 'pan' && (g.toucher || this.outil === 'main'))) return
    this.desarmerAppuiLong()
    this.appuiLong = { pointeur: e.pointerId, clientX: e.clientX, clientY: e.clientY, type: typePointeur(e.pointerType),
      minuterie: window.setTimeout(() => this.appuiLongEchu(), APPUI_LONG) }
  }

  /** L'appui a glissé, s'est levé, un autre s'est posé : pas d'appui long */
  private desarmerAppuiLong() {
    if (!this.appuiLong) return
    clearTimeout(this.appuiLong.minuterie)
    this.appuiLong = null
  }

  /** L'appui long : le geste commencé s'abandonne sans rien laisser (l'objet
   *  revient à sa place, le lasso s'efface), le pointeur ne compte plus
   *  jusqu'à son lever (qui ne désélectionne rien et ne prend rien), une
   *  petite vibration le dit sous le doigt, et le menu s'ouvre (voir
   *  demanderOptions), comme au clic droit. */
  private appuiLongEchu() {
    const a = this.appuiLong
    this.appuiLong = null
    if (!a || !this.geste || this.depart.pointeur !== a.pointeur) return
    this.abandonnerGeste()
    this.pointeurs.delete(a.pointeur); this.ignores.add(a.pointeur)
    this.toucherDoigts.oublier()
    this.toucherPrecedent = null; this.doubleEnCours = null
    try { navigator.vibrate?.(10) } catch { /* pas de vibreur */ }
    this.clicApresAppuiLong = { pointeur: a.pointeur, leve: 0 }
    this.demanderOptions({ clientX: a.clientX, clientY: a.clientY }, a.type)
    this.ui.maj()
  }

  // ---------- Le toucher à deux ou trois doigts ----------
  /** Un toucher bref à deux doigts annule le dernier geste de la page qu'on
   *  regarde, à trois il le rétablit (voir TOUCHER_DOIGTS, reconnu par
   *  ToucherADoigts au lever du dernier doigt), comme Ctrl+Z et Ctrl+Y. Un
   *  message bref le dit. La page jetée que ↶ ramène le dit elle-même (« Page
   *  N rétablie »). Coupé dans le menu du doigt (reglages.gestes). Le doigt
   *  qui dessinait a déjà perdu son trait quand le second s'est posé (le
   *  pincement le jette) ; l'objet que le premier doigt a pris à la Sélection
   *  est relâché par annuler() et retablir(), qui vident la sélection. */
  private gesteDesDoigts(r: ToucherReconnu) {
    if (!reglages.gestes || this.enLecture) return
    if (r === 'annuler') {
      const fait = this.annuler()
      if (fait === true) this.ui.message('Annulé')
      else if (!fait) this.ui.message('Rien à annuler sur cette page')
    } else this.ui.message(this.retablir() ? 'Rétabli' : 'Rien à rétablir sur cette page')
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
   *  formule : son point d'encre attend 300 ms avant d'être posé (dessiné en
   *  attendant). Un second toucher tout près en fait peut-être un double-clic
   *  (voir secondClic) ; sinon il se pose à l'échéance, ou dès qu'autre chose
   *  arrive (viderPointEnAttente). Son rythme, pour le film, est celui du
   *  toucher, compté jusqu'au lever, et son heure celle du lever. */
  private mettreEnAttente(objet: string) {
    const t = this.rendu.monTrait, heures = this.heuresDuTrait
    this.heuresDuTrait = []
    this.rendu.monTrait = null
    const trait = t ? this.traitDe(t) : null
    if (!t || !trait) { this.rendu.redessinerDirect(); return }
    const ms = heures.length * 3 === t.pts.length ? tempsDesPoints(heures, performance.now()) : []
    this.rendu.enAttente = t
    this.pointEnAttente = { trait, ms, heure: Date.now(), page: this.page, objet, x: this.depart.x, y: this.depart.y,
      minuterie: window.setTimeout(() => this.viderPointEnAttente(), DOUBLE_CLIC_PLUME.ms) }
    this.rendu.redessinerDirect()
  }

  /** Un appui pendant que le point du premier toucher attend : est-ce peut-être
   *  le second toucher d'un double-clic ? Il faut le bouton principal, la même
   *  page, une plume qui écrit (ni le doigt « qui déplace », ni le bout gomme,
   *  ni un clic attendu) et le rayon du double-clic (voir DOUBLE_CLIC_PLUME).
   *  Alors le point attend encore, le temps de ce toucher : levé vite et sans
   *  avoir glissé, c'est le double-clic (voir haut) ; sinon les deux points
   *  sont posés, l'un après l'autre. */
  private secondClic(e: PointerEvent, s: P, autre: boolean): boolean {
    const a = this.pointEnAttente
    if (!a || autre || e.button !== 0 || a.page !== this.page || this.placement) return false
    if (this.outil !== 'stylo' && this.outil !== 'surligneur') return false
    if (!procheDuPremier(a, s.x, s.y, typePointeur(e.pointerType))) return false
    clearTimeout(a.minuterie)
    a.minuterie = window.setTimeout(() => this.viderPointEnAttente(), DOUBLE_CLIC_PLUME.duree)
    return true
  }

  /** Le double-clic au Stylo, au lever de son second toucher : ni l'un ni
   *  l'autre point ne se pose, et l'objet ouvre ses options (une formule se
   *  modifie) */
  private doubleClicPlume() {
    const a = this.pointEnAttente
    if (!a) return
    clearTimeout(a.minuterie)
    this.pointEnAttente = null
    this.rendu.enAttente = null
    this.rendu.monTrait = null; this.heuresDuTrait = []
    this.rendu.redessinerDirect()
    this.ouvrirParDouble(a.objet)
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
    const f = this.objetSous(m, s, { pointeur: 'touch', dedans: true })
    if (f && f.id === a.objet) this.doubleEnCours = { objet: f.id, pointeur: e.pointerId }
  }

  /** Le double appui au doigt, au lever du second toucher : le menu complet
   *  de l'objet (une formule se modifie ; un objet d'une sélection de
   *  plusieurs ouvre leur menu commun). Le dblclick du navigateur, s'il
   *  suit, ne refait rien, ni le clic qu'il tire du toucher (voir brancherGestes). */
  private ouvrirParDouble(id: string) {
    const f = this.forme(id)
    if (!f) return
    this.doubleTraite = performance.now(); this.clicFantome = true
    if (this.selection.size > 1 && this.selection.has(f.id)) this.ouvrirOptionsSelection()
    else if (f.type === 'formule') this.modifierFormule(f)
    else this.ouvrirOptions(f)
  }

  /** Un simple toucher du doigt sur un objet, bref (moins de 300 ms) et levé
   *  sans avoir glissé : un second peut suivre (voir secondToucher) */
  private noterToucher(e: PointerEvent, g: Geste, glisse: boolean, m: P) {
    if (e.pointerType !== 'touch' || glisse || this.placement || (this.outil !== 'selection' && !this.doigtDeplace)) return
    // Un appui de la Sélection qui touchait sans saisir prend son candidat à
    // son lever : c'est aussi un premier toucher
    if (g.type !== 'deplacer' && !(g.type === 'pan' && g.toucher) && !(g.type === 'zone' && g.candidat)) return
    if (performance.now() - this.depart.t >= DOUBLE_TOUCHER.ms) return
    const s = this.ecran(e)
    const f = this.objetSous(m, s, { pointeur: 'touch', dedans: true })
    if (!f) return
    this.toucherPrecedent = { x: s.x, y: s.y, t: performance.now(), objet: f.id, page: this.page }
  }

  /** Le point d'encre en attente se pose maintenant, sur sa page, à l'heure
   *  de son lever. Il fait sa propre étape d'annulation : ce qui suit (le
   *  trait du second toucher, posé aussitôt) en fait une autre. */
  private viderPointEnAttente() {
    const a = this.pointEnAttente
    if (!a) return
    clearTimeout(a.minuterie)
    this.pointEnAttente = null
    this.rendu.enAttente = null
    this.tableau.nouveauGeste()
    this.tableau.poserTrace(a.page, a.trait, a.ms, a.heure)
    this.tableau.nouveauGeste()
    this.rendu.redessinerDirect()
  }

  /** Un simple toucher du doigt « qui déplace » : l'objet touché (à 20 px
   *  de son tracé, par un morceau ou par son intérieur, voir cibleSous)
   *  devient la sélection, seul ; rien dessous, elle se vide. Le mode
   *  « Ajouter » allumé, l'objet touché y entre ou en sort, et le vide éteint
   *  le mode. */
  private toucherObjet(m: P, s: P) {
    const f = this.objetSous(m, s, { pointeur: 'touch', dedans: true })
    this.ui.fermerMenuPartie()
    if (this.partie) this.choisirPartie(null)
    if (f && this.ajoutTactile) {
      if (this.selection.has(f.id)) this.selection.delete(f.id)
      else this.selection.add(f.id)
    } else {
      if (!f) this.finirAjout()
      this.selection.clear()
      if (f) this.selection.add(f.id)
    }
    this.rendu.redessinerDirect(); this.ui.maj()
    if (f) this.direOptions()
  }

  // ---------- Le mode « Ajouter » au doigt ----------
  /** Allumé (par le bouton « Ajouter » de la barre d'actions), un toucher sur
   *  un objet l'ajoute à la sélection ou l'en retire, comme Maj + clic, et un
   *  lasso s'y ajoute : sur une tablette, on n'a pas de touche Maj. Il
   *  s'éteint au toucher dans le vide, à Échap, à un autre outil, à une autre
   *  page, et quand la sélection se vide. */
  get ajoutTactile(): boolean {
    const a = this.ajout
    if (a.actif) {
      if (this.selection.size) a.vu = true
      else if (a.vu) a.actif = false          // la sélection s'est vidée
    }
    return a.actif
  }

  basculerAjout() {
    this.ajout = { actif: !this.ajout.actif, vu: this.selection.size > 0 }
    if (this.ajout.actif && !this.astuceAjout) {
      this.astuceAjout = true
      this.ui.message('Touchez d\'autres objets pour les ajouter ou les retirer ; touchez le vide pour finir.')
    }
    this.ui.maj()
  }

  private finirAjout() { this.ajout.actif = false }

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
    this.desarmerAppuiLong()
    this.toucherDoigts.oublier()
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

  /** Un doigt se lève pendant un pincement (g). Deux restent ou plus : le
   *  pincement continue, réancré sur les deux premiers (la vue ne saute pas).
   *  Un seul : il continue de déplacer la vue, sans jamais reprendre le
   *  dessin, jusqu'à son lever. Si le pincement est parti (la vue suivait les
   *  doigts), ce doigt la déplace aussitôt ; sinon (un toucher à deux doigts,
   *  dont les doigts ne se lèvent jamais tout à fait ensemble), il repart
   *  avec le seuil du glisser : un doigt qui tremble ne déplace rien. */
  private finPincement(g: Extract<Geste, { type: 'pinch' }>) {
    const doigts = this.doigts()
    if (doigts.length >= 2) { this.geste = this.pincement(doigts, g.parti); return }
    if (!doigts.length) { this.geste = null; return }
    const d = doigts[0]
    this.geste = { type: 'pan', dernierX: d.x, dernierY: d.y, pointeur: d.id }
    this.depart = nouveauDepart(d.x, d.y, d.id, 'touch', performance.now())
    this.depart.parti = g.parti
  }

  private bouge(e: PointerEvent) {
    if (this.ignores.has(e.pointerId)) return
    const s = this.ecran(e)
    const avant = this.pointeurs.get(e.pointerId)
    if (avant) { avant.x = s.x; avant.y = s.y }
    if (e.pointerType === 'touch') this.toucherDoigts.bouger(e.pointerId, s.x, s.y)
    const m = this.monde(e)
    const t = performance.now()
    let g = this.geste
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
    // Ce qu'un appui de l'outil Sélection prendrait ici (voir cibleSous)
    const pointeur = typePointeur(e.pointerType)
    let vise: Cible | null = null
    if (!g && this.outil === 'selection') {
      // Ce qu'on survole s'éclaire : au pavé tactile, on sait ce qu'on va
      // prendre ; l'intérieur d'une figure fermée aussi
      vise = this.cibleSous(m, s, { pointeur, dedans: true })
      const id = vise && !this.selection.has(vise.f.id) ? vise.f.id : null
      if (id !== this.survol) { this.survol = id; this.rendu.survol = id; this.rendu.redessinerDirect() }
    }
    if (!g && this.outil === 'segment') {
      if (this.traitEnAttente) this.apercuTrait(this.traitEnAttente, this.boutDuTrait(this.traitEnAttente, m, e.shiftKey))
      else this.montrerAccroche(m)
    }
    if (!g) {
      const inst = this.instruments.size ? this.instrumentSous(m) : null
      // À la Sélection, le curseur dit ce que fera l'appui (au survol de la
      // tablette graphique aussi) : « move », il saisit l'objet et le glisse ;
      // « pointer », il le prend d'un clic, mais glisser entoure ; la croix,
      // dans le vide, glisser sélectionne
      this.zone.style.cursor = inst ? (inst.quoi === 'corps' || inst.quoi === 'pointe' ? 'grab' : 'pointer') : this.priseSous(s) ? 'move'
        : this.outil === 'selection' ? (!vise ? 'crosshair' : this.saisi(vise, pointeur) || this.selection.has(vise.f.id) ? 'move' : 'pointer') : ''
      return
    }
    // Le geste n'écoute que le pointeur qui l'a commencé (pas un stylet qui
    // survole, ni un autre doigt). Tant que l'appui n'est pas devenu un
    // glisser, rien ne bouge ; passé le seuil, le déplacement compte depuis
    // le départ. L'encre, elle, part tout de suite.
    if (g.type !== 'pinch' && e.pointerId !== this.depart.pointeur) return
    const parti = this.depart.parti
    const glisse = g.type !== 'pinch' && this.aGlisse(s)
    if (glisse && !parti) {
      // Un appui qui glisse n'est plus un appui long ; un doigt qui glisse
      // (la vue, un lasso, un objet qui part) ne fait plus un toucher à deux
      // doigts : un toucher qui a déplacé quelque chose n'annule jamais
      if (this.appuiLong?.pointeur === e.pointerId) this.desarmerAppuiLong()
      if (e.pointerType === 'touch') this.toucherDoigts.oublier()
      // L'appui devient un glisser (un objet qui part, un cadre ou un lasso
      // qui commence) : la barre d'actions se cache, une fois, jusqu'au lâcher
      // (voir enMouvement). Rien de sélectionné, pas de barre : un trait du
      // Stylo ne paie pas cette mise à jour.
      if (this.selection.size) this.ui?.maj()
    }
    // Le doigt retenu (voir ecrireOuRetenir) a glissé : il agit au point de
    // l'appui, et ce mouvement continue avec le vrai geste (la Gomme efface
    // ce qu'elle traverse)
    if (g.type === 'retenu') {
      if (!glisse) return
      this.lancerRetenu(g)
      g = this.geste
      if (!g) return
    }
    switch (g.type) {
      case 'instrument':
        if (g.quoi !== 'tete' && !glisse) break          // l'arc du compas, lui, se trace tout de suite
        this.geste_instrument(g, m, e.shiftKey)
        break
      case 'longer':
        if (!glisse) break                               // posé contre le bord, pas encore tiré
        this.geste_longer(g, m)
        break
      case 'poignee':
        if (!glisse) break                               // un clic, pas encore un glisser
        g.bouge = true
        this.rendu.remplacement = this.manipuler(g.f, g.prise, m)
        this.rendu.toutRedessiner()
        break
      case 'rectangle':
      case 'cercle':
        if (!glisse) break                               // un appui qui tremble ne tire rien
        this.rendu.apercu = this.figureTiree(g, this.aimanter(m), e.shiftKey)
        this.rendu.redessinerDirect()
        break
      case 'pinch': {
        const doigts = this.doigts()
        if (doigts.length < 2) return
        const [a, b] = doigts
        const dist = Math.hypot(a.x - b.x, a.y - b.y)
        // La vue ne bouge pas tant qu'aucun des deux doigts n'a bougé de 8 px
        // (le seuil du glisser au doigt) et que leur écart n'a pas changé de
        // 8 px : un toucher à deux doigts qui tremble ne décale pas la vue
        // avant d'annuler. Passé ce seuil, elle suit les doigts depuis le
        // départ du pincement (dist, cx, cy n'ont pas bougé jusque-là), et ce
        // n'est plus un toucher.
        if (!g.parti) {
          const d = g.depart, k = SEUIL_GLISSER.touch
          const loin = (p: DoigtPose, q: DoigtPose) => p.id !== q.id || Math.hypot(p.x - q.x, p.y - q.y) >= k
          if (!loin(a, d.a) && !loin(b, d.b) && Math.abs(dist - d.dist) < k) return
          g.parti = true
          this.toucherDoigts.oublier()
        }
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
      case 'zone': {
        if (!glisse) break
        // Le halo de l'objet sous l'appui s'éteint : ce n'est plus lui qu'on prend
        if (this.survol) { this.survol = null; this.rendu.survol = null }
        if (g.forme === 'cadre') this.rendu.cadreSelection = rectangle(g.x, g.y, m.x, m.y)
        else {
          // Un point tous les 3 px d'écran au moins : le lasso reste léger
          const n = g.pts.length
          if (Math.hypot(m.x - g.pts[n - 2], m.y - g.pts[n - 1]) * this.cam.z > 3) g.pts.push(m.x, m.y)
          this.rendu.lasso = g.pts
        }
        this.rendu.redessinerDirect()
        break
      }
    }
  }

  /** Un lever (annule : coupé par le navigateur, pointercancel). Le toucher à
   *  deux ou trois doigts se reconnaît au lever du dernier doigt (voir
   *  ToucherADoigts), et n'agit qu'une fois ce lever fait. */
  private haut(e: PointerEvent, annule = false) {
    // Une paume, ou le doigt d'un appui long, sort de la liste à son lever,
    // sans rien faire d'autre (le clic qui suit le lever d'un appui long non
    // plus : voir brancherGestes)
    if (this.ignores.delete(e.pointerId)) {
      if (this.clicApresAppuiLong?.pointeur === e.pointerId) this.clicApresAppuiLong.leve = performance.now()
      return
    }
    if (this.appuiLong?.pointeur === e.pointerId) this.desarmerAppuiLong()
    let doigts: ToucherReconnu | null = null
    if (e.pointerType === 'touch') {
      if (annule || this.enLecture) this.toucherDoigts.oublier()
      else doigts = this.toucherDoigts.lever(e.pointerId, heureDe(e))
    }
    this.leverGeste(e, annule)
    if (doigts) this.gesteDesDoigts(doigts)
  }

  private leverGeste(e: PointerEvent, annule: boolean) {
    this.pointeurs.delete(e.pointerId)
    let g = this.geste
    if (!g) return
    // La fin d'un pincement : la barre d'actions revient quand plus rien ne bouge
    if (g.type === 'pinch') { this.finPincement(g); this.ui.maj(); return }
    if ((g.type === 'dessin' || g.type === 'retenu') && e.pointerId !== g.pointeur) return
    if (g.type === 'pan' && g.pointeur !== undefined && e.pointerId !== g.pointeur) return
    // Le doigt retenu (voir ecrireOuRetenir) se lève avant d'avoir agi : il
    // agit (la Gomme efface ce qu'elle touche, le Point se pose…), puis c'est
    // le lever du vrai geste. Coupé par le navigateur, il n'écrit rien.
    if (g.type === 'retenu') {
      if (annule) { this.abandonnerGeste(g); return }
      this.lancerRetenu(g)
      g = this.geste
      if (!g) return
    }
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
    if (annule && !garder) { this.abandonnerGeste(g); this.ui.maj(); return }

    const m = this.monde(e)
    if (!double) this.noterToucher(e, g, glisse, m)
    switch (g.type) {
      case 'pan':
        // Un simple toucher du doigt « qui déplace » fait le clic attendu (voir
        // placement), ou choisit l'objet touché
        if (glisse) break
        if (g.toucher && this.placement) { const p = this.placement; this.placement = null; p.clic(m) }
        else if (g.toucher) this.toucherObjet(m, this.ecran(e))
        break
      case 'dessin': {
        clearTimeout(this.minuterieForme)
        // L'appui qui fermait un menu, levé sans avoir glissé : rien n'est posé
        if (g.apresMenu && !glisse) { this.rendu.monTrait = null; this.heuresDuTrait = []; this.rendu.redessinerDirect(); break }
        const bref = !glisse && !annule && performance.now() - this.depart.t < DOUBLE_CLIC_PLUME.duree
        // Le second toucher d'un double-clic, bref et levé sans avoir glissé :
        // les options de l'objet. Sinon, le point du premier se pose d'abord.
        if (g.second && bref && this.pointEnAttente) { this.doubleClicPlume(); break }
        if (g.second) this.viderPointEnAttente()
        // Un simple toucher sur un objet : un double-clic peut suivre
        if (g.surObjet && bref) { this.mettreEnAttente(g.surObjet); break }
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
        // Le segment n'est posé que si le crayon a glissé le long du bord (voir SEUIL_GLISSER)
        if (glisse && f?.type === 'polygone' && Math.hypot(f.pts[2], f.pts[3]) * this.cam.z > 3) {
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
        // Un appui qui n'a pas glissé (un stylet ou un doigt qui tremble) ne pose rien
        if (glisse && f && (f.type === 'cercle' ? f.r : Math.abs(f.pts[4]) + Math.abs(f.pts[5])) * this.cam.z > 6) this.poserFigure(f, false)
        this.rendu.redessinerDirect()
        break
      }
      case 'deplacer':
        if (g.doigt && !glisse) { this.rendu.decalage = { dx: 0, dy: 0 }; this.toucherObjet(m, this.ecran(e)); break }
        // Maj + clic sur un objet déjà sélectionné : il en sort (glissé, c'est
        // toute la sélection qui a bougé)
        if (g.retirer && !glisse) { this.rendu.decalage = { dx: 0, dy: 0 }; this.selection.delete(g.retirer); this.rendu.redessinerDirect(); break }
        this.poserDeplacement(g)
        break
      case 'zone': {
        this.rendu.cadreSelection = null; this.rendu.lasso = null
        if (g.forme === 'lasso') {
          const n = g.pts.length
          if (m.x !== g.pts[n - 2] || m.y !== g.pts[n - 1]) g.pts.push(m.x, m.y)
        }
        // Un lasso resté tout petit (un doigt qui a roulé) est un toucher
        if (glisse && !(g.forme === 'lasso' && this.petitLasso(g.pts))) this.prendreZone(g, m)
        else if (g.candidat && this.forme(g.candidat)) {
          // Un toucher sur l'objet qu'on ne saisissait pas : il est pris (avec
          // Maj, Ctrl ou le mode « Ajouter », il entre dans la sélection ou en sort)
          const id = g.candidat
          if (!g.ajout) this.selection.clear()
          if (g.ajout && this.selection.has(id)) this.selection.delete(id)
          else this.selection.add(id)
          this.direOptions()
        } else {
          // Un clic dans le vide désélectionne, sauf avec Maj ou Ctrl (on a
          // visé à côté) ; un toucher dans le vide éteint le mode « Ajouter »,
          // et vide la sélection
          const tactile = this.ajoutTactile
          this.finirAjout()
          if (!g.ajout || tactile) this.selection.clear()
        }
        this.rendu.redessinerDirect(); this.ui.maj()
        break
      }
      case 'formule': {
        if (glisse) break
        const s = this.ecran(e)
        const f = this.formeSous(m.x, m.y)
        if (f?.type === 'formule') this.modifierFormule(f)
        else this.nouvelleFormule(m.x, m.y, s.x, s.y)
        break
      }
    }
    // Le second toucher d'un double appui, bref et levé sans avoir glissé
    if (double && !glisse && performance.now() - this.depart.t < DOUBLE_TOUCHER.ms) this.ouvrirParDouble(double.objet)
    this.ui.maj()                       // le panneau d'options réapparaît
  }

  /** Le lasso tient-il dans moins de 8 px d'écran ? */
  private petitLasso(pts: number[]): boolean {
    let x1 = Infinity, y1 = Infinity, x2 = -Infinity, y2 = -Infinity
    for (let i = 0; i < pts.length; i += 2) {
      x1 = Math.min(x1, pts[i]); x2 = Math.max(x2, pts[i]); y1 = Math.min(y1, pts[i + 1]); y2 = Math.max(y2, pts[i + 1])
    }
    return Math.max(x2 - x1, y2 - y1) * this.cam.z < 8
  }

  /** Le cadre ou le lasso lâché : ce qui y est à plus de moitié est pris (la
   *  longueur d'un tracé, la surface d'une image ou d'une formule, les deux
   *  points d'une droite : voir partDedans). Sans ajout, il remplace la
   *  sélection ; avec (Maj, Ctrl, le mode « Ajouter »), il s'y ajoute sans
   *  rien en retirer, comme Maj + cadre chez tldraw. Le lasso est d'abord
   *  simplifié (à 2 px d'écran près) et rangé par bandes (dansLasso), et les
   *  formes dont la boîte ne touche pas celle de la zone sont écartées sans
   *  calcul : le lâcher reste immédiat sur une page de milliers de traits. */
  private prendreZone(g: Extract<Geste, { type: 'zone' }>, m: P) {
    let b: Boite, dansZone: (x: number, y: number) => boolean
    if (g.forme === 'cadre') {
      const r = rectangle(g.x, g.y, m.x, m.y)
      b = r
      dansZone = (x, y) => x >= r.x && x <= r.x + r.l && y >= r.y && y <= r.y + r.h
    } else {
      const q = simplifier(g.pts, 2 / this.cam.z)
      let x1 = Infinity, y1 = Infinity, x2 = -Infinity, y2 = -Infinity
      for (let i = 0; i < q.length; i += 2) {
        x1 = Math.min(x1, q[i]); x2 = Math.max(x2, q[i]); y1 = Math.min(y1, q[i + 1]); y2 = Math.max(y2, q[i + 1])
      }
      b = { x: x1, y: y1, l: x2 - x1, h: y2 - y1 }
      dansZone = dansLasso(q)
    }
    if (!g.ajout) this.selection.clear()
    for (const f of this.formes) {
      // Une droite compte par ses deux points (sa boîte est la leur)
      const fb = this.boiteDeForme(f)
      if (!fb || !chevauche(b, fb)) continue
      // Toute la boîte dans le cadre : tout l'objet y est, sans rien mesurer
      const entiere = g.forme === 'cadre' && fb.x >= b.x && fb.y >= b.y && fb.x + fb.l <= b.x + b.l && fb.y + fb.h <= b.y + b.h
      if (entiere || partDedans(f, dansZone, fb) > 0.5) this.selection.add(f.id)
    }
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
    this.desarmerAppuiLong()
    if (g?.type === 'retenu') clearTimeout(g.minuterie)
    if (g?.type === 'dessin') { clearTimeout(this.minuterieForme); this.rendu.monTrait = null; this.heuresDuTrait = [] }
    if (g?.type === 'segment') { this.rendu.monSegment = null; this.rendu.apercu = null; this.rendu.cible = null }
    if (g?.type === 'rectangle' || g?.type === 'cercle') this.rendu.apercu = null
    if (g?.type === 'poignee') this.rendu.remplacement = null
    if (g?.type === 'longer' || g?.type === 'instrument') {
      this.rendu.apercu = null; this.rendu.mesure = null
      this.piste.trace(null)
      if (g.type === 'instrument') { this.instruments.set(g.nom, g.depart); this.majInstruments() }
    }
    if (g?.type === 'zone') { this.rendu.cadreSelection = null; this.rendu.lasso = null }
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
    this.ui.message(messageReconnue(r.nom, this.dernierPointeur, CTRL))
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

  /** Le menu complet d'un objet ne s'ouvre qu'à la demande (voir
   *  demanderOptions) : l'objet devient la sélection, seul */
  ouvrirOptions(f: Forme) {
    this.astuceOptions = true
    this.selection.clear(); this.selection.add(f.id)
    this.options = f.id
    this.rendu.redessinerDirect(); this.ui.maj()
  }

  /** Le menu commun d'une sélection de plusieurs objets : elle reste
   *  entière (« N objets » : couleur, épaisseur, dupliquer, copier, couper,
   *  supprimer) */
  ouvrirOptionsSelection() {
    this.astuceOptions = true
    this.options = TOUTE_LA_SELECTION
    this.rendu.redessinerDirect(); this.ui.maj()
  }

  /** Le menu complet de ce qui est sous le pointeur (client : le point de
   *  l'appui dans la fenêtre). Le clic droit (le bouton du stylet en est
   *  un) et l'appui long (voir armerAppuiLong) passent par ici ; « Options »
   *  de la barre d'actions ouvre le même menu (ouvrirOptions,
   *  ouvrirOptionsSelection) : le même menu, de la même façon, partout. Dans
   *  l'ordre :
   *  - un objet d'une sélection de plusieurs : leur menu commun, et la
   *    sélection reste entière (même près du sommet d'une de ses figures) ;
   *  - un morceau d'une figure (un sommet, le centre ou le rayon d'un
   *    cercle, un nom), de n'importe quelle figure : le menu de ce morceau ;
   *  - un objet (une formule comprise) : son menu, l'objet seul sélectionné ;
   *  - rien : le menu de la page (Coller ici, Tout sélectionner, Tout voir).
   *  L'objet se vise comme le clic de la Sélection, à la portée du pointeur ;
   *  l'intérieur d'une figure fermée ne compte qu'à la Sélection et au doigt
   *  qui déplace (le Stylo en main, un clic droit dans le vide d'un triangle
   *  ouvre le menu de la page, comme à côté). Rien pendant la revue, une
   *  séance d'automatismes, ni quand un clic est attendu ; rien sur un
   *  instrument, qui recouvre ce qui est dessous et n'a pas de menu. */
  demanderOptions(client: { clientX: number; clientY: number }, pointeur: TypePointeur) {
    if (this.enLecture || this.placement || document.body.classList.contains('en-seance')) return
    this.viderPointEnAttente()
    const m = this.monde(client), s = this.ecran(client)
    if (this.instruments.size && this.instrumentSous(m)) { this.ui.fermerMenus(); return }
    const dedans = this.outil === 'selection' || (pointeur === 'touch' && this.doigtDeplace)
    const c = this.cibleSous(m, s, { pointeur, dedans })
    // Le morceau visé, dans n'importe quelle figure : c'est une demande
    // d'options. Pas à travers une image, une formule ou une figure
    // coloriée posée dessus : c'est elle qu'on touche (voir cibleSous).
    let prise = this.priseSous(s, { toutes: true })
    if (prise && this.formes.slice(this.formes.indexOf(prise.f) + 1).some(g => interieur(g, m.x, m.y, this.boiteDeForme(g)) === 'plein')) prise = null
    // Un seul menu ouvert : celui d'avant (un morceau, un objet, la liste
    // des instruments) se ferme
    this.ui.fermerMenus()
    if (c && this.selection.size > 1 && this.selection.has(c.f.id)) { this.ouvrirOptionsSelection(); return }
    if (prise) {
      this.choisirPartie(prise.f.id, prise.prise)
      this.ui.ouvrirMenuPartie(prise.f.id, prise.prise, client.clientX, client.clientY)
      return
    }
    this.ui.fermerMenuPartie()
    if (this.partie) this.choisirPartie(null)
    if (c) { this.ouvrirOptions(c.f); return }
    this.ui.ouvrirMenuPage(client.clientX, client.clientY, m)
  }

  /** La première fois qu'on prend un objet, on dit où sont toutes ses
   *  options, dans les mots du pointeur (voir messageOptions) : le clic droit
   *  à la souris, le bouton du stylet à la tablette graphique, l'appui long
   *  au stylet posé sur l'écran et au doigt (l'objet a été pris à l'outil
   *  Sélection ou au doigt qui déplace, où l'appui long existe ; le double
   *  appui marche toujours, mais l'appui long est le geste qu'on essaie
   *  d'instinct sur une tablette) */
  private direOptions() {
    if (this.astuceOptions || this.selection.size !== 1) return
    const f = this.formeChoisie()
    // Une formule, elle, se modifie au double-clic : le message ne lui va pas
    if (!f || f.type === 'formule') return
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
    this.annulerPolygone(); this.selection.clear(); this.choisirPartie(null); this.finirAjout()
    this.ui.fermerMenuPartie()
    if (!enCours) {
      if (this.outil !== 'selection') {
        this.outilAvant = this.outil
        this.choisirOutil('selection')
        this.ui.message('Sélection : glisser un objet le déplace, glisser dans le vide sélectionne. Échap : revenir.')
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
  /** Un geste qui cache le menu ouvert : on déplace ce qu'il règle, on tire
   *  un cadre… (déplacer la vue, pincer, tirer un sommet le laissent) */
  private gesteQuiCache(): boolean {
    return !!this.geste && this.geste.type !== 'pan' && this.geste.type !== 'pinch' && this.geste.type !== 'poignee'
  }

  /** Un geste est-il en mouvement : deux doigts posés (un pincement), ou un
   *  appui qui a passé son seuil (un objet qu'on glisse, un cadre ou un
   *  lasso qu'on tire, la vue qu'on déplace, un instrument) ? La barre
   *  d'actions se cache alors, et revient au lâcher : elle ne flotte pas
   *  au-dessus d'un objet qui part, ni d'un lasso qui l'entoure. Un appui
   *  qui n'a pas encore glissé la laisse : un clic sur un objet la montre
   *  tout de suite. */
  get enMouvement(): boolean {
    const g = this.geste
    return !!g && (g.type === 'pinch' || this.depart.parti)
  }

  /** La forme seule sélectionnée, s'il n'y en a qu'une et qu'aucun geste n'est en cours */
  formeChoisie(): Forme | null {
    if (this.selection.size !== 1 || this.gesteQuiCache()) return null
    const id = [...this.selection][0]
    return this.formes.find(f => f.id === id) ?? null
  }

  /** Les objets d'une sélection de plusieurs, dans l'ordre d'empilement, si
   *  aucun geste n'est en cours : comme celui d'un objet, leur menu commun
   *  se cache pendant qu'on les déplace et revient au lâcher */
  formesChoisies(): Forme[] | null {
    if (this.selection.size < 2 || this.gesteQuiCache()) return null
    return this.formes.filter(f => this.selection.has(f.id))
  }

  /** La page qu'on regarde est-elle vide ? (« Tout sélectionner » se grise) */
  pageVide(): boolean { return !this.formes.length }

  habiller(f: Forme, patch: Partial<Habillage> & Partial<Trait>) {
    this.tableau.nouveauGeste()
    this.tableau.modifier(this.page, [{ id: f.id, patch: patch as Partial<Forme> }])
  }

  /** Le menu commun de plusieurs objets : la retouche (une couleur, une
   *  épaisseur, les pointillés) va à tous ceux qu'elle concerne, en UNE
   *  transaction, donc une seule étape d'annulation : un Ctrl+Z rend leur
   *  couleur aux dix objets. Un objet qui l'a déjà n'est pas réécrit. */
  habillerSelection(retouche: Retouche) {
    if (this.enLecture) return
    const changements: { id: string; patch: Partial<Forme> }[] = []
    for (const f of this.formes) {
      if (!this.selection.has(f.id)) continue
      const patch = retouche(f)
      if (patch && change(f, patch)) changements.push({ id: f.id, patch })
    }
    if (!changements.length) return
    this.tableau.nouveauGeste()
    this.tableau.modifier(this.page, changements)
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

  /** L'image d'un objet par une transformation. Les points repérés sur une
   *  image ont aussi leur image, liée à la nouvelle. L'image et ses points
   *  font UN geste, posés dans une seule transaction : un seul Ctrl+Z les
   *  retire ensemble (sinon les points images resteraient seuls, liés à une
   *  image qui n'existe plus, ou se fondraient dans le geste d'avant). */
  transformer(f: Forme, t: Transformation) {
    const img = image(f, t, this.tableau.moi)
    const points = this.liees(f.id).map(g => ({ ...image(g, t, this.tableau.moi), lie: img.id }) as Forme)
    this.tableau.nouveauGeste()
    this.tableau.poserPlusieurs(this.page, [...points, img])
    this.selectionner(img.id)
  }

  // ---------- Copier, couper, coller, dupliquer ----------
  /** Ce que copient Ctrl+C, Ctrl+X, Ctrl+D : la sélection, ou la figure du
   *  morceau choisi (un sommet choisi, c'est la figure qu'on copie), avec les
   *  points liés aux images choisies (ils les suivent) ; dans l'ordre
   *  d'empilement. */
  objetsChoisis(): Forme[] {
    const ids = new Set(this.selection)
    if (!ids.size && this.partie) ids.add(this.partie.id)
    if (!ids.size) return []
    return this.formes.filter(f => ids.has(f.id) || ((f.type === 'polygone' || f.type === 'cercle') && !!f.lie && ids.has(f.lie)))
  }

  /** La copie de ces formes : les données de leurs images, la page, le
   *  centre de leur boîte, l'heure. Une image dont la banque a perdu les
   *  données ne se copie pas (elle ne se collerait nulle part). */
  private faireCopie(formes: Forme[]): Copie | null {
    const images: Record<string, string> = {}
    const gardees = formes.filter(f => {
      if (f.type !== 'image') return true
      const d = this.banqueImages.get(f.src)
      if (typeof d !== 'string') return false
      images[f.src] = d
      return true
    })
    if (!gardees.length) return null
    const b = this.boiteDuContenu(gardees)
    const centre = b ? { x: b.x + b.l / 2, y: b.y + b.h / 2 } : { x: gardees[0].x, y: gardees[0].y }
    this.heureCopie = Math.max(Date.now(), this.heureCopie + 1)
    return { v: 1, formes: gardees, images, page: this.page, centre, t: this.heureCopie }
  }

  /** Ctrl+C : la copie est gardée en mémoire (cet onglet), dans le navigateur
   *  (un autre onglet de la même adresse) et dans le presse-papiers du
   *  système (la version en ligne et la version clé USB). Rien de choisi : on
   *  le dit, et faux (le navigateur fait alors sa copie ordinaire). */
  copier(dire = true): boolean {
    if (this.enLecture) return false
    const formes = this.objetsChoisis()
    const c = formes.length ? this.faireCopie(formes) : null
    if (!c) { this.ui.message('Rien n\'est sélectionné.'); return false }
    this.copie = c
    // Le pointeur d'au moment de la copie : s'il n'a pas bougé, Ctrl+V ne
    // colle pas sous lui (ce serait sur l'objet même), mais à côté
    this.collages = { cle: c.t, pointeur: this.pointeurSurZone && { ...this.pointeurSurZone }, pages: new Map() }
    this.garderCopie(c)
    this.ecrireSysteme(c)
    const n = c.formes.length
    if (dire) this.ui.message(n === 1 ? '1 objet copié' : `${n} objets copiés`)
    return true
  }

  /** La copie gardée dans le navigateur, sous la nouvelle clé. Trop grosse
   *  (des images), l'ancienne s'en va : un autre onglet ne doit pas coller
   *  une copie d'avant en croyant coller celle-ci. */
  private garderCopie(c: Copie) {
    try {
      const texte = JSON.stringify(c)
      if (texte.length <= GARDE_MAX) localStorage.setItem(CLE_PRESSE_PAPIERS, texte)
      else localStorage.removeItem(CLE_PRESSE_PAPIERS)
    } catch {
      try { localStorage.removeItem(CLE_PRESSE_PAPIERS) } catch { /* rien de gardé */ }
    }
  }

  /** La copie dans le presse-papiers du système : execCommand('copy')
   *  déclenche l'événement copy, qui la range (voir le constructeur). Un
   *  navigateur qui refuse ne casse rien : la copie reste en mémoire et dans
   *  le navigateur. */
  private ecrireSysteme(c: Copie) {
    this.copieAEcrire = c
    this.copieEcrite = false
    try { document.execCommand('copy') } catch { /* refusé : le presse-papiers du système ne l'aura pas */ }
    this.copieAEcrire = null
    this.copieHorsSysteme = this.copieEcrite ? 0 : c.t
  }

  /** Ctrl+X : la copie, puis ce qui est copié part, en une étape (Ctrl+Z le
   *  rend). Un sommet choisi : c'est la figure copiée qui part, pas le sommet. */
  couper(): boolean {
    if (this.enLecture) return false
    const formes = this.objetsChoisis()
    if (!this.copier(false)) return false
    this.ui.fermerMenuPartie()
    if (this.partie) this.choisirPartie(null)
    this.tableau.nouveauGeste()
    this.tableau.supprimer(this.page, formes.map(f => f.id))
    this.selection.clear()
    this.rendu.redessinerDirect(); this.ui.maj()
    const n = this.copie?.formes.length ?? formes.length
    this.ui.message(n === 1 ? '1 objet coupé' : `${n} objets coupés`)
    return true
  }

  /** La copie à coller : la plus récente de celle de cet onglet et de celle
   *  gardée dans le navigateur (un autre onglet a pu copier depuis). Une copie
   *  gardée depuis plus de 12 h ne compte plus. */
  private copieGardee(): Copie | null {
    let gardee: Copie | null = null
    try { gardee = lireJson(localStorage.getItem(CLE_PRESSE_PAPIERS)) } catch { /* rien de gardé */ }
    if (gardee && Date.now() - gardee.t > GARDE_DUREE) gardee = null
    const ici = this.copie && Date.now() - this.copie.t <= GARDE_DUREE ? this.copie : null
    if (ici && (!gardee || gardee.t <= ici.t)) return ici
    return gardee
  }

  /** Y a-t-il une copie à coller (« Coller ici ») ? Le presse-papiers du
   *  système ne se lit pas sans permission : seules comptent les copies de MEM */
  peutColler(): boolean { return !this.enLecture && this.copieGardee() !== null }

  /** Colle la copie gardée (la plus récente) : en ou (monde) si on le donne,
   *  sinon comme Ctrl+V (voir collerCopie) */
  coller(ou?: P): boolean {
    if (this.enLecture) return false
    const c = this.copieGardee()
    if (!c) { this.ui.message('Rien à coller : copiez d\'abord un objet.'); return false }
    this.collerCopie(c, ou)
    return true
  }

  /** Colle une copie sur la page qu'on regarde, en une étape d'annulation ;
   *  ce qui est collé devient la sélection (l'outil ne change pas). Où :
   *  - en ou, si on le donne (« Coller ici ») ;
   *  - sous le pointeur s'il est sur le tableau et a bougé (plus de 4 px)
   *    depuis la copie ou le collage précédent ;
   *  - sinon, 1 cm plus loin que le collage précédent sur cette page ; le
   *    premier sur la page de la copie, 1 cm à côté de l'original ; sur une
   *    autre page ou dans un autre onglet, à la même place que l'original.
   *  Une place hors de ce qu'on voit devient le milieu de la vue : un Ctrl+V
   *  qui ne montre rien ferait croire qu'il n'a rien fait. */
  collerCopie(c: Copie, ou?: P) {
    if (this.enLecture || !c.formes.length) return
    this.viderPointEnAttente()
    const page = this.page
    // Une copie de cet onglet (la même heure, les mêmes objets) : on colle
    // celle qu'on a, telle quelle, plutôt que sa version relue
    const memes = (a: Copie, b: Copie) => a.t === b.t && a.formes.length === b.formes.length && a.formes.every((f, k) => f.id === b.formes[k].id)
    const ici = !!this.copie && memes(this.copie, c)
    if (ici) c = this.copie!
    if (!this.collages || this.collages.cle !== c.t) this.collages = { cle: c.t, pointeur: null, pages: new Map() }
    const suivi = this.collages
    const ptr = this.pointeurSurZone
    const bouge = !!ptr && (!suivi.pointeur || Math.hypot(ptr.clientX - suivi.pointeur.clientX, ptr.clientY - suivi.pointeur.clientY) > 4)
    const avant = suivi.pages.get(page)
    let centre: P
    if (ou) centre = ou
    else if (ptr && bouge) centre = this.monde(ptr)
    else {
      centre = avant ? { x: avant.x + CM, y: avant.y + CM }
        : ici && c.page === page ? { x: c.centre.x + CM, y: c.centre.y + CM }
        : { ...c.centre }
      if (!this.dansLaVue(centre)) { const s = this.centreLibre(); centre = this.cam.versMonde(s.x, s.y) }
    }
    suivi.pages.set(page, centre)
    suivi.pointeur = ptr && { ...ptr }
    // Les images : leurs données entrent dans la banque si elles n'y sont pas
    // (une copie d'un autre tableau) ; sous le même identifiant d'autres
    // données (un autre tableau), elles prennent un identifiant neuf. Jamais
    // une image déjà là n'est remplacée.
    const autres = new Map<string, string>()
    for (const [src, d] of Object.entries(c.images)) {
      const deja = this.banqueImages.get(src)
      if (deja === undefined) this.banqueImages.set(src, d)
      else if (deja !== d) { const n = uid(); this.banqueImages.set(n, d); autres.set(src, n) }
    }
    const formes = autres.size ? c.formes.map(f => f.type === 'image' && autres.has(f.src) ? { ...f, src: autres.get(f.src)! } : f) : c.formes
    this.poserCollage(collage({ ...c, formes }, { dx: centre.x - c.centre.x, dy: centre.y - c.centre.y, moi: this.tableau.moi, existantes: this.formes }))
  }

  /** Pose ce qu'on colle ou duplique (une étape) et le sélectionne. Le menu
   *  ouvert se ferme : il réglait l'original, pas la copie. */
  private poserCollage(formes: Forme[]) {
    this.ui.fermerMenuPartie()
    if (this.partie) this.choisirPartie(null)
    this.options = null
    this.tableau.nouveauGeste()
    this.tableau.poserPlusieurs(this.page, formes)
    this.selection.clear()
    for (const f of formes) this.selection.add(f.id)
    this.rendu.redessinerDirect(); this.ui.maj()
  }

  /** Ce point du monde est-il dans ce qu'on voit entre les barres ? */
  private dansLaVue(w: P): boolean {
    const s = this.cam.versEcran(w.x, w.y)
    const r = this.ui?.zoneLibre() ?? { x: 0, y: 0, l: this.rendu.l, h: this.rendu.h }
    return s.x >= r.x && s.x <= r.x + r.l && s.y >= r.y && s.y <= r.y + r.h
  }

  /** Ctrl+D et « Dupliquer » : une copie 1 cm plus loin, en une étape, qui
   *  devient la sélection ; le presse-papiers n'y est pour rien. Les noms
   *  changent (ceux de l'original sont pris), les points liés à une image
   *  dupliquée suivent la nouvelle. */
  dupliquerSelection(): boolean {
    if (this.enLecture) return false
    this.viderPointEnAttente()
    const formes = this.objetsChoisis()
    if (!formes.length) { this.ui.message('Rien n\'est sélectionné.'); return false }
    const c: Copie = { v: 1, formes, images: {}, page: this.page, centre: { x: 0, y: 0 }, t: 0 }
    this.poserCollage(collage(c, { dx: CM, dy: CM, moi: this.tableau.moi, existantes: this.formes }))
    return true
  }

  /** Ctrl+A : tout ce qui est sur la page qu'on regarde. On passe à l'outil
   *  Sélection, comme Échap (on peut alors glisser le tout, et un second
   *  Échap rend l'outil d'avant). */
  toutSelectionner() {
    if (this.enLecture) return
    this.viderPointEnAttente()
    if (!this.formes.length) { this.ui.message('La page est vide.'); return }
    if (this.outil !== 'selection') { this.outilAvant = this.outil; this.choisirOutil('selection') }
    this.ui.fermerMenuPartie()
    if (this.partie) this.choisirPartie(null)
    this.selection.clear()
    for (const f of this.formes) this.selection.add(f.id)
    this.rendu.redessinerDirect(); this.ui.maj()
    const n = this.formes.length
    this.ui.message(n === 1 ? '1 objet sélectionné' : `${n} objets sélectionnés`)
  }

  /** Ctrl+V (ou le menu Édition du navigateur), hors d'un champ de saisie :
   *  dans l'ordre, des objets de MEM teachingtool marqués dans le HTML (d'un
   *  autre onglet, de l'autre version) ; une image (comme avant) ; la copie
   *  gardée, si le texte du presse-papiers est vide ou est le sien (l'écriture
   *  dans le système a échoué, ou c'est bien elle) ; sinon on dit qu'il n'y a
   *  rien à coller. Ni pendant la revue, ni pendant une séance, ni dans une
   *  fenêtre ouverte. */
  private surColler(e: ClipboardEvent) {
    clearTimeout(this.collageAttendu); this.collageAttendu = 0
    if ((e.target as HTMLElement | null)?.closest?.('input, textarea, [contenteditable]')) return
    if (this.enLecture || document.body.classList.contains('en-seance') || document.querySelector('dialog[open]')) return
    const d = e.clipboardData
    if (!d) return
    const marquee = lireHtml(d.getData('text/html'))
    if (marquee) { e.preventDefault(); this.collerCopie(marquee); return }
    const f = [...d.files].find(x => x.type.startsWith('image/'))
    if (f) { e.preventDefault(); this.importerImage(f); return }
    const gardee = this.copieGardee(), texte = d.getData('text/plain')
    // Le presse-papiers du système a refusé cette copie : il a encore autre
    // chose, mais c'est bien elle qu'on vient de copier
    if (gardee && (!texte || memeTexte(texte, versTexte(gardee)) || gardee.t === this.copieHorsSysteme)) { e.preventDefault(); this.collerCopie(gardee); return }
    this.ui.message('Le presse-papiers ne contient ni objet ni image à coller.')
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

  /** L'éditeur d'une formule : son double-clic, « Modifier » de son menu
   *  (qui se ferme : l'éditeur prend sa place) */
  async modifierFormule(f: Formule) {
    if (this.enLecture) return
    if (this.options) { this.options = null; this.ui.maj() }
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

  /** Pousse la sélection (et les points liés à une image choisie) de dx, dy
   *  (monde), aux flèches. Une rafale de poussées (une flèche tenue, des
   *  appuis rapprochés) fait UNE étape d'annulation, mais jamais avec ce qui
   *  l'a précédée : Ctrl+D, Ctrl+V ou une couleur choisie juste avant
   *  restent leur propre étape (sans cela, la pile de la page fondait la
   *  poussée dans l'étape d'avant, venue moins de 400 ms plus tôt, et Ctrl+Z
   *  défaisait les deux). La poussée prolonge la rafale seulement si
   *  l'étape du haut de la pile est encore celle que la poussée précédente a
   *  faite : rien d'autre n'a été écrit depuis (une écriture qui suit
   *  nouveauGeste ouvre une autre étape ; une annulation la retire). */
  private pousser(dx: number, dy: number) {
    const haut = () => { const u = this.tableau.annulationDe(this.page); return u ? u.undoStack[u.undoStack.length - 1] : undefined }
    const p = this.poussee
    if (!p || p.page !== this.page || !p.etape || p.etape !== haut()) this.tableau.nouveauGeste()
    this.tableau.modifier(this.page, this.formes.filter(f => this.selection.has(f.id) || this.lieeA(f)).map(f => ({ id: f.id, patch: { x: f.x + dx, y: f.y + dy } })))
    this.poussee = { page: this.page, etape: haut() }
  }

  private clavier(e: KeyboardEvent) {
    if (this.enLecture) return
    // Pendant une séance d'automatismes, le tableau est caché : aucune touche
    // ne le change (ni Ctrl+Z, ni Suppr, ni les flèches qui pousseraient un
    // objet resté sélectionné) ni ne bouge sa vue ; on ne verrait rien. La
    // séance a ses propres touches (seance.ts), et le navigateur garde les
    // siennes (Ctrl+C dans une question, Ctrl + = pour grossir l'écran ;
    // Espace et Entrée sur ses boutons). Les barres du tableau sont cachées
    // (visibility: hidden) : aucun de leurs boutons ne garde le focus.
    if (document.body.classList.contains('en-seance')) return
    const cible = e.target as HTMLElement
    // Dans une fenêtre (publier, formule…), les raccourcis du tableau se taisent
    if (cible.closest('input, textarea, select, [contenteditable], dialog')) return
    const ctrl = e.ctrlKey || e.metaKey
    if (e.code === 'Space') { this.espace = true; e.preventDefault(); return }
    // Ctrl+Z, Ctrl+Y ou Ctrl+Maj+Z (⌘ sur Mac) : sur la page qu'on regarde
    // seulement. Rien à faire : un message le dit, pour qui pressait Ctrl+Z
    // en pensant reprendre ce qu'il venait de faire sur une autre page.
    const lettre = e.key.toLowerCase()
    if (ctrl && (lettre === 'z' || lettre === 'y')) {
      e.preventDefault()
      const refaire = lettre === 'y' || e.shiftKey
      if (refaire ? !this.retablir() : !this.annuler()) this.ui.message(refaire ? 'Rien à rétablir sur cette page' : 'Rien à annuler sur cette page')
      return
    }
    // Ctrl+A, C, X, V, D (⌘ sur Mac) : tout sélectionner, copier, couper,
    // coller, dupliquer. La lettre se lit par e.key : en AZERTY, la touche
    // marquée A a pour e.code « KeyQ ». AltGr (Ctrl+Alt sous Windows) n'en
    // est pas un. Ni dans une fenêtre ouverte (les champs de saisie se sont
    // déjà tus plus haut : on y copie du texte).
    if (ctrl && !e.altKey && !e.shiftKey && !document.querySelector('dialog[open]')) {
      // Pas en plein geste (un objet qu'on glisse, un trait, un lasso) : le
      // lâcher déplacerait la sélection d'APRÈS la touche (tout ce que Ctrl+A
      // a pris, la copie que Ctrl+V vient de poser) et non ce qu'on tient.
      // Le doigt retenu un instant (voir ecrireOuRetenir) n'a encore rien fait.
      if (/^[acxdv]$/.test(lettre) && this.geste && this.geste.type !== 'retenu') { e.preventDefault(); return }
      switch (lettre) {
        case 'a': e.preventDefault(); if (!e.repeat) this.toutSelectionner(); return
        // Rien de choisi : le navigateur fait sa copie ordinaire
        case 'c': if (e.repeat) { e.preventDefault(); return } if (this.copier()) e.preventDefault(); return
        case 'x': if (e.repeat) { e.preventDefault(); return } if (this.couper()) e.preventDefault(); return
        // Toujours empêché : sinon le navigateur ajoute un marque-page
        case 'd': e.preventDefault(); this.dupliquerSelection(); return
        // L'événement paste suit (voir surColler) : on ne l'empêche pas. Un
        // navigateur qui ne le donne pas hors d'un champ de saisie colle tout
        // de même la copie gardée, un instant après (paste, s'il vient, passe
        // avant, dans la même tâche que la touche)
        case 'v':
          clearTimeout(this.collageAttendu)
          this.collageAttendu = window.setTimeout(() => { this.collageAttendu = 0; this.coller() }, 200)
          return
      }
    }
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
      this.pousser(dx * k, dy * k)
      return
    }
    // Sans sélection, elles déplacent la vue : → montre ce qui est à droite.
    // Un quart de ce qu'on voit (trois quarts avec Maj), en douceur ; touche
    // tenue, un douzième à chaque répétition, tout de suite (sinon la vue
    // filerait à sept écrans par seconde)
    if (fleches[e.key] && !ctrl && !e.altKey) {
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
    if (e.shiftKey && !ctrl && !e.altKey && (e.code === 'Digit1' || e.code === 'Digit2')) {
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
