// =============================================================
// LA SURVEILLANCE DE LA SAUVEGARDE DU CLASSEUR OUVERT
// Elle tient l'état (EtatSauvegarde, voir etat.ts) à jour, en direct : la
// base du navigateur (une écriture refusée fait un trou, voir Tableau.trou),
// le dernier fichier enregistré (Ctrl + S, ici ou dans un autre onglet), le
// travail fait depuis, ce que la clé (C4, cle.ts) et le Drive (C10,
// copie-drive.ts) lui disent par majCle et majDrive, et ce que main.ts sait
// du rangement du classeur sans fichier (lot 18, majRangement : son niveau
// est rangé dans un dossier, ou reste à ranger). Chaque changement, et
// toutes les 30 secondes (les « il y a 2 min » vieillissent), prévient
// l'interface : le bouton du classeur, le bloc du menu ⋯, le bandeau.
//
// Le trou se répare au calme : on rouvre la base (Tableau.reparer), qui
// commence par y ajouter l'état complet du document, toutes les 30 secondes
// (puis de plus en plus rarement si la base refuse encore, jusqu'à 5
// minutes : chaque essai coûte un instant au fil principal), seulement
// quand on n'écrit pas (app.calme), et tout de suite quand l'onglet passe
// en arrière-plan. Tant qu'il n'est ni réparé ni enregistré dans un
// fichier, fermer l'onglet demande confirmation (beforeunload) ; changer de
// classeur aussi (peutQuitter : la bibliothèque, lot 4 C5, le demande dans
// sa fenêtre, et laisserPartir retire alors la question du navigateur).
// Une base trouée relue (Tableau.incomplet : une partie ne se relit plus,
// depuis une autre séance) n'est pas un trou de cette séance : rien à
// réparer en rouvrant la base, rien à demander en partant (la base a tout
// ce que la mémoire a) ; l'état le dit ('incomplet'), toujours.
//
// La clé pose aussi sa question en fermant l'onglet, tant qu'elle n'a pas
// le dernier trait (voir cle.ts) ; partir par la bibliothèque, qui a attendu
// les écritures (ou à qui l'on a dit « Ouvrir sans attendre »), ne la pose
// pas (partirParLaBibliotheque).
// =============================================================
import type { App } from '../app'
import type { ErreurDeLaBase } from '../document'
import type { FicheClasseur } from './demarrage'
import type { Registre } from './registre'
import type { Bandeau, EtatSauvegarde, MemoireBandeau, RaisonBandeau, Rangement, TexteEtat } from './etat'
import { RAPPEL_SILENCE, bandeauDu, nomDErreur, rappelDu, texteEtat } from './etat'
import { cleDernierEnregistrement, lireDernierEnregistrement } from '../sauvegarde'
import { ecrivain } from './ecrivain'
import { POUR_ENREGISTRER } from '../navigateur'

/** L'affichage se refait au moins toutes les… */
const RAFRAICHIR = 30_000
/** Le premier essai de réparation, puis les suivants (doublés) jusqu'à… */
const REPARER = 30_000
const REPARER_MAX = 5 * 60_000
/** Pas au calme : on réessaie… */
const PAS_AU_CALME = 1000
/** Un changement ne refait l'affichage qu'un peu après (jamais pendant un trait) */
const APRES_CHANGEMENT = 2000

export const MESSAGE_REPARE = 'Ce classeur est de nouveau enregistré dans ce navigateur.'
export const MESSAGE_QUITTER = `Ce classeur n'est pas entièrement enregistré dans ce navigateur : enregistrez-le d'abord (${POUR_ENREGISTRER}).`

/** showSaveFilePicker existe : le navigateur sait écrire seul dans un fichier (Chrome, Edge) */
export const ecritDansUnFichier = () => typeof (window as unknown as { showSaveFilePicker?: unknown }).showSaveFilePicker === 'function'

export class Surveillance {
  readonly etat: EtatSauvegarde
  /** Ce que l'état dit maintenant, et le bandeau à montrer (voir actualiser) */
  texte!: TexteEtat
  bandeau: Bandeau | null = null
  private memoire: { ecartes: Set<RaisonBandeau>; rappelMontre: boolean; dernierRappel: number; rappelTaitJusqua: number; driveMontre: boolean } =
    { ecartes: new Set(), rappelMontre: false, dernierRappel: -Infinity, rappelTaitJusqua: -Infinity, driveMontre: false }
  private ecouteurs: (() => void)[] = []
  private minuterieReparation = 0
  private enReparation = false
  private echecs = 0
  private minuterieAffichage = 0
  private quitter: ((e: BeforeUnloadEvent) => void) | null = null
  /** On quitte ce classeur en connaissance de cause (« Quitter sans
   *  enregistrer », dans la bibliothèque) : le navigateur ne redemande pas */
  private partirSansDemander = false
  /** On part vers un autre classeur par la bibliothèque, qui a attendu ce
   *  qui s'écrivait (avantDeQuitter, 10 s au plus) : la clé ne pose pas sa
   *  question (le trou garde la sienne) */
  private parLaBibliotheque = false
  /** La clé de la date du dernier fichier de ce classeur */
  private cleFichier: string
  /** Le rangement du classeur sans fichier (lot 18, voir majRangement) :
   *  gardé ici, parce que la clé remplace tout son état à chaque maj */
  private rangement: Rangement | null = null

  /** À créer APRÈS tableau.charger() : le chargement n'est pas un changement.
   *  registre et fiche : null dans le repli (l'index ne s'ouvre pas) ; la
   *  clé et le Drive s'en serviront. */
  constructor(private app: App, readonly registre: Registre | null, readonly fiche: FicheClasseur | null) {
    const t = app.tableau
    this.cleFichier = cleDernierEnregistrement(app.classeur)
    let fichier: number | null = null
    try { fichier = lireDernierEnregistrement(localStorage.getItem(this.cleFichier)) } catch { /* rien de gardé */ }
    const { premier, dernier } = this.travailDepuis(fichier)
    this.etat = {
      navigateur: t.trou ? 'erreur' : t.incomplet ? 'incomplet' : 'ok',
      modifie: dernier,
      fichier,
      nonEnregistreDepuis: premier,
      cle: { etat: ecritDansUnFichier() && ecrivain.mode !== 'fil' ? 'absente' : 'impossible' },
      drive: { etat: 'absente' },
    }
    if (t.erreurBase) this.etat.erreurBase = t.erreurBase

    // La base refuse une écriture (le trou) ; un autre écouteur d'avant garde le sien
    const avant = t.onErreurBase
    t.onErreurBase = r => { avant?.(r); this.erreurDeLaBase(r) }
    // Une promesse de y-indexeddb rejetée faute de place, sans transaction
    // abandonnée vue par la connexion : on ne sait pas ce qui manque, c'est
    // un trou (la réparation ajoute tout, sans rien effacer)
    // (la promesse rejetée est alors prise en charge : on le dit à l'écran,
    // pas dans la console ; de même pour la promesse de l'écriture qu'une
    // transaction abandonnée a refusée, quand le trou est déjà repéré). lib0,
    // sous y-indexeddb, enveloppe l'erreur de la base : Error(« AbortError: … »)
    window.addEventListener('unhandledrejection', e => {
      const n = nomDErreur(e.reason)
      if (n === 'QuotaExceededError') { t.soupconnerTrou('place'); e.preventDefault() }
      else if (n === 'AbortError' && t.trou) e.preventDefault()
    })
    // Le travail : chaque changement du document, après le chargement
    t.doc.on('update', () => this.change())
    // Un autre onglet a enregistré ce classeur dans un fichier
    window.addEventListener('storage', e => {
      if (e.key !== this.cleFichier) return
      const f = lireDernierEnregistrement(e.newValue)
      if (f !== null) this.enregistre(f)
    })
    // En arrière-plan : on répare tout de suite (on n'écrit plus), et
    // l'affichage se remet à l'heure au retour
    document.addEventListener('visibilitychange', () => {
      if (document.visibilityState === 'hidden') { if (this.app.tableau.trou) void this.reparer() }
      else this.actualiser()
    })
    window.setInterval(() => this.actualiser(), RAFRAICHIR)
    if (t.trou) this.planifierReparation(REPARER)
    this.actualiser()
  }

  /** f sera appelée à chaque changement de ce qu'il faut montrer */
  quandChange(f: () => void) { this.ecouteurs.push(f) }

  // ---------- Ce que disent la clé et le Drive (C4, C10) ----------
  majCle(c: EtatSauvegarde['cle']) { this.etat.cle = c; this.poserRangement(); this.actualiser() }
  /** Ce que main.ts sait du rangement du classeur (lot 18) : là où irait son
   *  fichier quand son niveau est rangé (rangeDans), ou le niveau à ranger
   *  (rangeable) ; null : rien de tel (le classeur a son fichier, il est à
   *  la racine, ce navigateur ne range pas). Posé à l'arrivée et quand la
   *  fiche ou les emplacements changent. */
  majRangement(r: Rangement | null) {
    this.rangement = r && (r.rangeDans || r.rangeable) ? { ...r } : null
    this.poserRangement()
    this.actualiser()
  }
  /** Le rangement, dans l'état de la clé (seulement quand elle n'a pas de fichier) */
  private poserRangement() {
    const c = this.etat.cle
    delete c.rangeDans; delete c.rangeable
    const r = this.rangement
    if (!r || c.etat !== 'absente') return
    if (r.rangeDans) c.rangeDans = r.rangeDans
    if (r.rangeable) c.rangeable = { ...r.rangeable }
  }
  /** Des changements attendent d'être écrits sur la clé depuis ce moment
   *  (null : plus rien) : l'affichage suit un peu après, comme pour un
   *  changement (jamais à chaque trait) */
  cleEnAttente(depuis: number | null) {
    const c = this.etat.cle
    if (c.etat !== 'ok' && c.etat !== 'en-cours') return
    if (depuis === null) delete c.depuis
    else c.depuis = depuis
    this.plusTard()
  }
  majDrive(d: EtatSauvegarde['drive']) { this.etat.drive = d; this.actualiser() }

  // ---------- Le fichier enregistré à la main ----------
  /** Un fichier vient d'être enregistré, à cette date (celle de son
   *  en-tête : ce qui a changé après n'y est peut-être pas). Pendant un trou
   *  aussi : il vient de la mémoire de l'onglet, qui a tout. */
  enregistre(date: number) {
    const e = this.etat
    e.fichier = Math.max(e.fichier ?? 0, date)
    // Ce qui a changé après la date du fichier reste à enregistrer
    e.nonEnregistreDepuis = e.modifie !== null && e.modifie > e.fichier ? e.modifie : null
    this.actualiser()
  }

  // ---------- Le travail fait ----------
  /** Le premier et le dernier changement après ce fichier, lus dans le film
   *  (une étape par geste, à son heure) ; la naissance d'une page vide n'est
   *  pas du travail */
  private travailDepuis(fichier: number | null): { premier: number | null; dernier: number | null } {
    let premier: number | null = null, dernier: number | null = null
    try {
      for (const e of this.app.tableau.film.toArray()) {
        if (e.naissance || !Number.isFinite(e.t)) continue
        if (dernier === null || e.t > dernier) dernier = e.t
        if (fichier === null || e.t > fichier) { if (premier === null || e.t < premier) premier = e.t }
      }
    } catch { /* un film illisible : on ne sait rien */ }
    return { premier, dernier }
  }

  private change() {
    const e = this.etat, maintenant = Date.now()
    e.modifie = maintenant
    if (e.nonEnregistreDepuis === null) e.nonEnregistreDepuis = maintenant
    this.plusTard()
  }

  /** Pas d'affichage à chaque trait : un peu après */
  private plusTard() {
    if (!this.minuterieAffichage) this.minuterieAffichage = window.setTimeout(() => { this.minuterieAffichage = 0; this.actualiser() }, APRES_CHANGEMENT)
  }

  // ---------- La base du navigateur, le trou ----------
  private erreurDeLaBase(r: ErreurDeLaBase) {
    this.etat.navigateur = 'erreur'
    this.etat.erreurBase = r
    if (!this.minuterieReparation && !this.enReparation) this.planifierReparation(REPARER)
    this.actualiser()
  }

  private planifierReparation(delai: number) {
    clearTimeout(this.minuterieReparation)
    this.minuterieReparation = window.setTimeout(() => { this.minuterieReparation = 0; void this.reparer(true) }, delai)
  }

  /** Comble le trou : au calme seulement (sinon on réessaie 1 s plus tard),
   *  sauf quand l'onglet est en arrière-plan. Jamais poserCeQuiAttend. */
  private async reparer(auCalme = false) {
    const t = this.app.tableau
    if (!t.trou || this.enReparation) return
    if (auCalme && document.visibilityState !== 'hidden' && !this.app.calme) { this.planifierReparation(PAS_AU_CALME); return }
    clearTimeout(this.minuterieReparation); this.minuterieReparation = 0
    this.enReparation = true
    let ok = false
    try { await t.reparer(); ok = !t.trou } catch { ok = false }
    this.enReparation = false
    if (ok) {
      this.echecs = 0
      // Le trou de cette séance est comblé ; une partie relue en attente (Tableau.incomplet) le reste
      this.etat.navigateur = t.incomplet ? 'incomplet' : 'ok'
      delete this.etat.erreurBase
      this.app.ui?.message(MESSAGE_REPARE)
      this.actualiser()
      return
    }
    // La base refuse encore (plus de place) : de plus en plus rarement
    this.echecs++
    if (t.trou) this.planifierReparation(Math.min(REPARER_MAX, REPARER * 2 ** (this.echecs - 1)))
  }

  // ---------- Quitter ----------
  /** null : on peut quitter ce classeur ; sinon, ce qu'il faut dire. Le trou
   *  pas encore réparé, avec des changements depuis le dernier fichier : ce
   *  qui s'est écrit depuis le trou ne se relirait pas. */
  peutQuitter(): string | null {
    return this.app.tableau.trou && this.etat.nonEnregistreDepuis !== null ? MESSAGE_QUITTER : null
  }

  /** « Quitter sans enregistrer » (la bibliothèque, qui l'a déjà demandé) :
   *  le navigateur ne pose pas sa question en plus */
  laisserPartir() {
    this.partirSansDemander = true
    this.majQuitter()
  }

  /** La bibliothèque part vers un autre classeur, après avoir attendu ce
   *  qui s'écrivait : la clé ne redemande rien au navigateur */
  partirParLaBibliotheque() { this.parLaBibliotheque = true }

  /** La clé (ou la copie du Drive, voir copie-drive.ts) peut-elle poser sa
   *  question en fermant l'onglet ? Non quand on part en connaissance de
   *  cause (« Quitter sans enregistrer », le classeur remplacé) ou par la
   *  bibliothèque */
  get questionDeLaCle(): boolean { return !this.partirSansDemander && !this.parLaBibliotheque }

  /** beforeunload n'est posé que pendant que peutQuitter() le demande : il
   *  empêcherait sinon certains navigateurs de garder la page en mémoire */
  private majQuitter() {
    const faut = !this.partirSansDemander && this.peutQuitter() !== null
    if (faut && !this.quitter) {
      this.quitter = e => { if (this.peutQuitter()) { e.preventDefault(); e.returnValue = '' } }
      window.addEventListener('beforeunload', this.quitter)
    } else if (!faut && this.quitter) {
      window.removeEventListener('beforeunload', this.quitter)
      this.quitter = null
    }
  }

  // ---------- Le bandeau ----------
  /** × : ce bandeau-là ne revient plus de la session ; le rappel, pas
   *  pendant une heure */
  fermerBandeau(raison: RaisonBandeau) {
    if (raison === 'rappel') { this.memoire.rappelTaitJusqua = Date.now() + RAPPEL_SILENCE; this.memoire.rappelMontre = false }
    else this.memoire.ecartes.add(raison)
    if (raison === 'drive-connexion') this.memoire.driveMontre = false
    this.actualiser()
  }

  // ---------- L'affichage ----------
  /** Refait ce qu'il faut montrer, et prévient l'interface */
  actualiser() {
    const e = this.etat, maintenant = Date.now()
    // L'écrivain est passé sur le fil principal : la clé ne s'écrira pas seule
    if (e.cle.etat === 'absente' && ecrivain.mode === 'fil') e.cle = { etat: 'impossible' }
    const depuis = this.app.depuisLeDernierGeste()
    const m: MemoireBandeau = this.memoire
    this.bandeau = bandeauDu(e, maintenant, depuis, m)
    const rappel = this.bandeau?.raison === 'rappel'
    if (rappel && !this.memoire.rappelMontre) this.memoire.dernierRappel = maintenant
    this.memoire.rappelMontre = rappel
    // Le bandeau de la connexion Google, une fois paru, reste quand on se
    // remet à écrire (comme le rappel) : il ne clignote pas
    this.memoire.driveMontre = this.bandeau?.raison === 'drive-connexion'
    this.texte = texteEtat(e, maintenant, { rappel: rappel || rappelDu(e, maintenant, depuis) })
    this.majQuitter()
    for (const f of this.ecouteurs) { try { f() } catch { /* l'interface se débrouille */ } }
  }
}
