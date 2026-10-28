// =============================================================
// LA COPIE À SENS UNIQUE SUR LE DRIVE (lot 4 C10)
// Pour chaque classeur, une copie de son fichier .memc part sur le Drive
// choisi (le Drive personnel, celui du lycée : publication/comptes.ts),
// dans un dossier PRIVÉ à part (« MEM - Sauvegardes », « LFB -
// Sauvegardes »), avec la même connexion Google que Publier (le droit
// drive.file, le choix du compte). Elle remplace TOUJOURS LE MÊME FICHIER ;
// le Drive garde lui-même les versions précédentes, dont on ne retient que
// les dix dernières (voir drive.ts). À sens unique : rien ne revient du
// Drive sans le demander (« Récupérer… », voir recuperer.ts).
//
// LE COMPTE : celui du classeur (fiche.copieDrive, menu ⋯ → « Copie sur le
// Drive… »), sinon celui de la bibliothèque (le réglage « copieDrive »),
// sinon le Drive personnel ; « aucune » : pas de copie. Seulement depuis la
// version en ligne (la connexion Google ne marche pas en file://) : la
// version hors ligne le dit (« impossible »). Dès qu'une copie est voulue, la
// connexion Google se charge à l'avance : le clic « Se connecter » ouvre sa
// fenêtre du premier coup.
//
// QUAND : 2 minutes après le dernier changement, au plus tard 10 minutes
// après le premier pas copié, au plus une fois par max(10 min, 1 min par
// Mo, 20 fois la durée du dernier envoi), seulement au calme (app.calme :
// jamais pendant un trait), et quand l'onglet passe en arrière-plan. Une
// copie à la fois ; un seul onglet copie un classeur à la fois (Web Locks,
// 'mem-teachingtool-drive:<id>' ; sans eux, on copie sans verrou : c'est le
// même fichier). Les changements des autres onglets arrivent par le canal
// des classeurs ('change') et par la fiche (le suivi) ; une copie faite par
// un autre onglet compte ici. On ne quitte jamais un classeur en attendant
// le Drive : les classeurs EN RETARD (changés depuis leur dernière copie)
// se copient depuis leur base, un à la fois, quand on est connecté et que
// rien d'autre n'est en cours, depuis n'importe quel classeur ouvert (pas
// un classeur vide jamais copié : le « Premier classeur » d'un navigateur
// neuf, chaque matin sur le poste remis à zéro, ne fait pas un fichier de
// plus sur le Drive ; celui de l'onglet non plus, tant qu'on n'y a rien
// fait).
//
// FERMER L'ONGLET avant la copie (les 2 minutes après le dernier trait : la
// fin du cours), quand rien d'autre ne protège le classeur (pas de clé qui
// s'écrive) : comme pour la clé (voir cle.ts), fermer l'onglet ou le
// navigateur, ou recharger, pose la question du navigateur (beforeunload),
// seulement pendant ce temps-là, et la copie part aussitôt, sans attendre
// le calme ni le rythme. Rester : elle aboutit. Quitter quand même : la page
// ne peut plus rien envoyer ; rien n'est perdu dans ce navigateur, la
// prochaine ouverture (connectée) la fait. Pas de question en partant par
// la bibliothèque (les classeurs en retard se copient depuis le suivant),
// ni en connaissance de cause (voir drive-pur.questionDuDrive).
//
// LA CONNEXION : jamais de fenêtre Google sans un clic. Le jeton dure
// environ une heure, et suit l'onglet d'un classeur à l'autre (changer de
// classeur recharge la page : voir passerLaConnexion, drive.ts) ; arrivé
// connecté, les classeurs en retard se copient d'ici. Expiré (ou après F5,
// dans un autre onglet), la copie attend (« connexion ») ; un bandeau
// discret le dit, seulement quand rien d'autre ne protège le classeur
// (avec la clé à jour, ce n'est qu'une ligne d'information), qu'une copie
// attend, et après 2 minutes sans geste (voir etat.ts). Le jeton est celui
// d'UN compte, partagé avec Publier : publier dans l'autre compte met la
// copie en attente. Le clic « Se connecter à Google » propose à Google le
// compte qu'on reprend (login_hint, sans la liste : voir indiceGoogle) ; le
// compte connecté se retient sur cet ordinateur pour chaque Drive, sous une
// clé à la copie ('mem-teachingtool-drive-compte:<compte>'), sans toucher à
// ce que retient Publier.
//
// LE COMPTE GOOGLE DE LA DERNIÈRE COPIE : la ligne du Drive dit celui où
// elle est vraiment (la fiche le garde) ; connecté avec un autre, elle le
// dit aussi (« la prochaine ira là ») et rien ne compte comme copié sur
// celui-ci (ni la protection, ni le texte court).
//
// LES GARDE-FOUS : le fichier envoyé doit contenir tout ce que la dernière
// copie avait (son vecteur d'état) ; sinon ce classeur a perdu une partie
// de son histoire, et la copie n'est pas remplacée. Une copie mise à jour
// depuis un autre ordinateur, plus récente que l'arrivée de ce classeur
// ici, ne l'est pas non plus (drive.ts). Les deux proposent « Récupérer la
// copie du Drive » (le chemin d'« Ouvrir un classeur », lot 4 C9 : comparée,
// mise à jour sans perte, ou ajoutée comme copie) et « Remplacer quand
// même ». Une base trouée ne se copie pas (elle attend sa réparation).
//
// UN NIVEAU RELIÉ AU DRIVE (lot 7, voir emplacements.ts) : la copie d'un
// classeur de ce niveau, sur ce Drive, va dans le dossier du niveau
// (« MEM - Classeurs » › « 5ème » › le dossier du chapitre) au lieu du dossier des sauvegardes ; la
// copie d'avant y est déplacée (drive.ts). Arrivé là depuis ailleurs, un
// classeur s'y copie même si rien n'a changé depuis sa dernière copie.
// =============================================================
import * as Y from 'yjs'
import type { App } from '../app'
import type { CompteDrive, FicheClasseur, FicheDossier } from './demarrage'
import { CANAL_CLASSEUR, idClasseur, visible } from './demarrage'
import type { Registre } from './registre'
import type { Surveillance } from './surveillance'
import type { EtatSauvegarde } from './etat'
import type { Fichiers } from './fichiers'
import { CLIENT_GOOGLE, COMPTES, compteDe } from '../publication/comptes'
import {
  VERSIONS_GARDEES, connecte, connecter, courrielDe, dernierCompteGoogle, dossierDuChapitre, elaguerVersions, lireSauvegarde, nomDeSauvegarde, preparerGoogle,
  sauvegarder, surConnexion, versionEnLigne,
} from '../publication/drive'
import { ecrivain, fabriquerFichier } from './ecrivain'
import { comparerVecteurs } from './vecteurs'
import { quandLisible, tailleLisible } from '../fichier'
import { confirmer } from './cle'
import { estVide } from './corbeille'
import type { ChoixDrive } from './drive-pur'
import {
  CONFLIT_HISTOIRE, MESSAGE_FIL, VERROU_DRIVE, compteVoulu, conflitOrigine, copieAilleurs, delaiDEnvoi, enRetard, indiceGoogle, prochaineCopie,
  questionDuDrive, raisonDrive, reessai,
} from './drive-pur'
import { fermerSurLeFond } from '../dialogue'
import { emplacementDe, emplacements } from './emplacements'

type EtatDrive = EtatSauvegarde['drive']
type DriveFiche = NonNullable<FicheClasseur['drive']>

/** Pas au calme : on réessaie… */
const PAS_AU_CALME = 1000
/** La connexion Google se charge peu après l'ouverture (pas pendant elle) */
const PREPARER_APRES = 3000
/** L'état se remet à jour (le jeton qui expire) toutes les… */
const VERIFIER = 30_000
/** Entre deux classeurs en retard, on souffle */
const ENTRE_DEUX = 2000

export const MESSAGE_TROU = 'le classeur de ce navigateur n\'est pas entièrement enregistré : la copie attend qu\'il le soit'
export const REPRISE = 'Copie sur le Drive reprise.'
export const HORS_LIGNE_FICHIER = 'Seulement depuis la version en ligne (mathsetmoi.github.io).'

const attendre = (ms: number) => new Promise<void>(ok => setTimeout(ok, ms))
const enLigneReseau = () => typeof navigator === 'undefined' || navigator.onLine !== false
const nomDuCompte = (c: ChoixDrive) => c === 'aucune' ? '' : compteDe(c)?.nom ?? 'Drive'
/** Le dernier compte Google connecté sur ce Drive, retenu pour la copie */
const MEMOIRE_COMPTE = 'mem-teachingtool-drive-compte:'
const compteRetenu = (compte: string) => { try { return localStorage.getItem(MEMOIRE_COMPTE + compte) ?? '' } catch { return '' } }
const retenirCompte = (compte: string, courriel: string) => { try { if (courriel && compteRetenu(compte) !== courriel) localStorage.setItem(MEMOIRE_COMPTE + compte, courriel) } catch { /* navigation privée */ } }

/** Ce que dit une connexion qui n'a pas abouti, pour la copie (les phrases
 *  de drive.ts parlent de publier) */
function texteConnexion(e: unknown): string {
  const m = e instanceof Error ? e.message : ''
  if (/^Pour publier, autorisez/.test(m)) return 'Pour copier vos classeurs sur le Drive, autorisez MEM teachingtool à gérer les fichiers qu\'il crée sur votre Drive.'
  return m || 'La connexion à Google a échoué. Réessayez.'
}

/** Sous le verrou des onglets (Web Locks) ; siLibre : seulement s'il est
 *  libre ('occupe' sinon) ; sans Web Locks (Safari avant 15.4, Firefox
 *  avant 96) : sans verrou, c'est le même fichier */
async function sousLeVerrou<T>(nom: string, f: () => Promise<T>, siLibre = false): Promise<T | 'occupe'> {
  const locks = (typeof navigator !== 'undefined' ? (navigator as Navigator & { locks?: LockManager }).locks : undefined)
  if (!locks?.request) return f()
  let fait = false
  try {
    return await locks.request(nom, siLibre ? { ifAvailable: true } : {}, async lock => {
      fait = true
      if (!lock) return 'occupe' as const
      return f()
    }) as T | 'occupe'
  } catch (e) {
    // Le verrou lui-même a échoué (avant d'avoir rien fait) : sans lui
    if (!fait) return f()
    throw e
  }
}

type Resultat = 'copie' | 'deja' | 'rien' | 'connexion' | 'conflit' | 'erreur'
/** Le dossier du Drive où va la copie de ce classeur : celui de son chapitre,
 *  dans le dossier de son niveau, s'il est relié à ce Drive (lot 7) ;
 *  undefined : le dossier des sauvegardes */
async function dossierDeLaCopie(registre: Registre, f: FicheClasseur, compte: CompteDrive): Promise<string | undefined> {
  const [liste, dossiers] = await Promise.all([emplacements(registre), registre.dossiers()])
  const e = emplacementDe(f.dossier, 'drive', liste, dossiers)
  const d = e && e.compte === compte ? dossiers.find(x => x.id === e.dossier) : undefined
  return d ? (await dossierDuChapitre(compte, { id: d.id, nom: d.nom }, { id: f.id, nom: f.nom })).id : undefined
}

/** L'appareil, pour le garde-fou des deux ordinateurs (drive.ts) */
export const origineDe = (registre: Registre) => registre.reglageOuCreer('appareil', () => idClasseur()).catch(() => 'onglet-' + idClasseur())

/** Ce qu'a fait copierDepuisLaBase : copié ; rien à faire (pas voulu, ou sa
 *  copie est déjà à jour, là où elle doit être) ; écarté (vide et jamais
 *  copié, une histoire perdue, la copie changée depuis un autre ordinateur :
 *  son onglet le dira) ; occupé (son onglet est en train de le copier) */
export type CopieDepuisLaBase = 'copie' | 'rien' | 'ecarte' | 'occupe'

/** Copie un classeur sur le Drive de `compte` depuis sa base, sous son
 *  verrou s'il est libre : les classeurs en retard (rattraper), et ceux
 *  d'un niveau qu'on vient de relier au Drive (lot 7, ailleurs.ts). voulu :
 *  la fiche relue sous le verrou doit encore l'être. Les erreurs du Drive
 *  remontent. */
export async function copierDepuisLaBase(registre: Registre, id: string, compte: CompteDrive, o: {
  origine: string; voulu: (x: FicheClasseur, dossiers: FicheDossier[]) => boolean
}): Promise<CopieDepuisLaBase> {
  const r = await sousLeVerrou(VERROU_DRIVE + id, async (): Promise<CopieDepuisLaBase> => {
    const [x, dossiers] = await Promise.all([registre.classeur(id), registre.dossiers()])
    if (!x || !o.voulu(x, dossiers)) return 'rien'
    const d = x.drive?.compte === compte ? x.drive : null
    // Jamais copié et vide (le « Premier classeur » d'un navigateur neuf,
    // chaque matin sur le poste remis à zéro) : rien à protéger, et pas
    // un fichier de plus sur le Drive à chaque fois
    if (!d) {
      const { examen } = await ecrivain.examinerBase(x.base, { travailleurSeul: true })
      if (estVide(examen)) return 'ecarte'
    }
    const date = Date.now()
    const fab = await fabriquerFichier(x.base, { nom: x.nom, id: x.id }, date, { travailleurSeul: true })
    const dossier = await dossierDeLaCopie(registre, x, compte)
    if (d?.vecteur) {
      const c = comparerVecteurs(fab.vecteur, d.vecteur)
      // Rien de neuf : sa copie est à jour à cette heure (et déjà dans son niveau)
      if (c === 'egal' && (d.dossier ?? '') === (dossier ?? '')) { await registre.modifierClasseur(x.id, y => { if (y.drive) y.drive = { ...y.drive, t: Date.now() } }); return 'rien' }
      // Il a perdu une partie de son histoire : son onglet le dira
      if (c !== 'contient' && c !== 'egal') return 'ecarte'
    }
    const ac = new AbortController()
    const delai = window.setTimeout(() => ac.abort(), delaiDEnvoi(fab.fichier.size))
    let s: Awaited<ReturnType<typeof sauvegarder>>
    try {
      s = await sauvegarder({
        compte, classeur: x.id, nom: x.nom, fichier: fab.fichier, idExistant: d?.id ?? null,
        origine: o.origine, t: Math.min(date, x.modifie || date), recu: x.recu ?? x.cree ?? 0, signal: ac.signal, ...(dossier ? { dossier } : {}),
      })
    } finally { clearTimeout(delai) }
    if (s.conflit) return 'ecarte'
    const courriel = courrielDe(compte)
    const nouvelle: DriveFiche = { compte, id: s.id, t: Date.now(), taille: fab.fichier.size, vecteur: fab.vecteur, ...(courriel ? { courriel } : {}), ...(dossier ? { dossier } : {}) }
    await registre.modifierClasseur(x.id, y => { y.drive = nouvelle })
    void elaguerVersions(s.id).catch(() => 0)
    return 'copie'
  }, true)
  return r
}

interface OptionsCopie { manuel?: boolean; forcer?: boolean }

export class CopieDrive {
  /** La version en ligne (ou de développement), avec l'identifiant Google : la copie y est possible */
  readonly enLigne: boolean
  private readonly id: string
  private readonly base: string
  /** Le compte de la copie de ce classeur ('aucune' : pas de copie) */
  compte: ChoixDrive = 'mem'
  /** Ce que dit l'état de la sauvegarde pour le Drive */
  etat: EtatDrive = { etat: 'absente' }
  /** La dernière copie réussie sur ce compte (la fiche, ou faite d'ici) */
  private derniere: DriveFiche | null = null
  /** Le premier changement pas encore copié (null : rien à copier), le dernier */
  private premierNonCopie: number | null = null
  private dernierChangement = 0
  /** Le premier changement arrivé pendant la copie en cours */
  private premierPendant: number | null = null
  private enCopie = false
  /** La copie en cours se montre (« copie en cours… ») : la première, ou demandée */
  private montrerEnCours = false
  private file: Promise<unknown> = Promise.resolve()
  private finDerniere = 0
  private dureeDerniere = 0
  private tailleDerniere = 0
  /** Après un échec : combien de suite, l'heure du prochain essai, ce qu'on dit */
  private echecs = 0
  private prochainEssai = 0
  private erreur: string | null = null
  /** Une erreur qu'attendre ne répare pas : 'ici' (le travailleur manque, la
   *  base est partie : pour la session), 'google' (Google refuse l'accès :
   *  jusqu'à la prochaine connexion) */
  private bloque: false | 'ici' | 'google' = false
  /** Une copie refusée pendant le trou de la base : elle repart à sa réparation */
  private attendLaBase = false
  /** La copie du Drive n'est pas remplacée : quel garde-fou, quel fichier */
  private conflit: { genre: 'histoire' | 'origine'; idDrive: string | null; t?: number } | null = null
  /** Le clic « Se connecter » : la copie qui attend part dès le calme */
  private desQuePossible = false
  private minuterie = 0
  private minuterieRattrapage = 0
  private rattrapage = false
  /** Les classeurs en retard qu'on n'a pas pu copier (leur onglet le dira) */
  private ecartes = new Set<string>()
  private suspendu = false
  /** La question du navigateur en fermant l'onglet (voir majQuitter) */
  private quitter: ((e: BeforeUnloadEvent) => void) | null = null
  private canal: BroadcastChannel | null = null
  /** L'appareil (ce navigateur, à cette adresse), tiré une fois */
  private origine: Promise<string>
  /** Ouvrir des fichiers (lot 4 C9) : « Récupérer la copie du Drive » */
  fichiers: Fichiers | null = null
  /** Fini quand le démarrage l'est (la fiche relue, ce qui reste à copier) */
  readonly pret: Promise<void>

  /** À créer APRÈS tableau.charger() : le chargement n'est pas un changement */
  constructor(private app: App, private registre: Registre, fiche: FicheClasseur, private surveillance: Surveillance) {
    this.id = fiche.id
    this.base = fiche.base
    this.enLigne = versionEnLigne() && !!CLIENT_GOOGLE
    this.origine = origineDe(registre)
    app.tableau.doc.on('update', () => this.change(Date.now()))
    try {
      this.canal = new BroadcastChannel(CANAL_CLASSEUR)
      this.canal.onmessage = e => {
        const d = e.data as { type?: string; base?: string } | null
        if (!d || d.base !== this.base) return
        // Un autre onglet a changé la base ; ou le classeur est remplacé,
        // supprimé (ici, par la sauvegarde de cet onglet, ou ailleurs)
        if (d.type === 'change') this.change(Date.now())
        else if (d.type === 'remplace' || d.type === 'supprime') this.suspendre()
      }
    } catch { /* pas de canal : chaque onglet vit sa vie */ }
    // La fiche changée ailleurs : une copie faite par un autre onglet, un autre compte choisi
    registre.onChange(c => { if (c.classeurs?.includes(this.id)) void this.relire() })
    // En arrière-plan : la copie due part, sans attendre les 2 minutes
    document.addEventListener('visibilitychange', () => {
      if (document.visibilityState === 'hidden' && this.premierNonCopie !== null && this.peutCopierSeul() && !this.enCopie) {
        const q = prochaineCopie({ ...this.rythme(), dernierChangement: -Infinity })
        if (q !== null && q <= Date.now()) { clearTimeout(this.minuterie); this.minuterie = 0; void this.copier({}) }
      }
    })
    // Le réseau revenu : la copie qui attendait part (sans attendre l'essai suivant)
    window.addEventListener('online', () => { if (this.erreur === null) this.prochainEssai = 0; this.maj(); this.planifier() })
    window.addEventListener('offline', () => this.maj())
    // Publier vient de se connecter, ou la connexion est tombée
    surConnexion(() => this.connexionChange())
    // La base réparée (le trou comblé) : la copie refusée repart
    // La clé change d'état (elle protège le classeur, ou plus) : la question en fermant l'onglet suit
    surveillance.quandChange(() => {
      if (this.attendLaBase && !app.tableau.trou) { this.attendLaBase = false; this.erreur = null; this.maj(); this.planifier() }
      this.majQuitter()
    })
    // Le jeton expire sans rien dire : l'état le voit à temps
    window.setInterval(() => { if (this.etatActuel().etat !== this.etat.etat) this.maj() }, VERIFIER)
    this.pret = this.demarrer().catch(() => { this.maj() })
  }

  // ---------- Le démarrage ----------
  private async demarrer() {
    const [fiche, defaut] = await Promise.all([this.registre.classeur(this.id), this.registre.reglage('copieDrive').catch(() => undefined)])
    if (!fiche) { this.maj(); return }
    this.prendreLeCompte(compteVoulu(fiche, defaut), fiche)
    this.maj()
    this.planifier()
    // Arrivé connecté (la connexion a suivi l'onglet depuis le classeur
    // d'avant, voir publication/drive.ts) : les classeurs en retard, dont
    // celui qu'on vient de quitter, se copient d'ici
    if (this.enLigne && COMPTES.some(c => connecte(c.cle))) this.rattraperBientot(30_000)
  }

  /** Le compte de la copie, et ce qu'on sait de la dernière copie sur lui ;
   *  ce qui reste à copier : rien encore sur ce Drive et un classeur où l'on
   *  a travaillé, ou un document qui n'est plus celui de la dernière copie */
  private prendreLeCompte(compte: ChoixDrive, fiche: FicheClasseur) {
    this.compte = compte
    this.conflit = null; this.erreur = null; this.bloque = false; this.echecs = 0; this.prochainEssai = 0
    this.derniere = compte !== 'aucune' && fiche.drive?.compte === compte ? fiche.drive : null
    this.finDerniere = this.derniere?.t ?? 0
    this.tailleDerniere = this.derniere?.taille ?? 0
    this.dureeDerniere = 0
    this.premierNonCopie = null
    if (compte === 'aucune') return
    const d = this.derniere
    let aCopier: boolean
    if (!d) aCopier = this.surveillance.etat.modifie !== null
    else if (d.vecteur) aCopier = comparerVecteurs(Y.encodeStateVector(this.app.tableau.doc), d.vecteur) !== 'egal'
    else aCopier = (fiche.modifie || 0) > d.t
    if (aCopier) { this.premierNonCopie = Date.now(); this.dernierChangement = Date.now() }
    // La connexion Google se charge à l'avance (le clic ouvrira sa fenêtre du premier coup)
    if (this.enLigne) window.setTimeout(() => { if (!this.suspendu && this.compte !== 'aucune' && enLigneReseau()) preparerGoogle() }, PREPARER_APRES)
  }

  // ---------- L'état ----------
  /** Ce que l'état de la sauvegarde dit du Drive, maintenant */
  private etatActuel(): EtatDrive {
    const c = this.compte
    if (c === 'aucune') return { etat: 'absente' }
    if (!this.enLigne) return { etat: 'impossible', compte: c }
    const enAttente = this.premierNonCopie !== null
    const d = this.derniere
    // Le compte de la dernière copie (celui où elle est vraiment) ; connecté
    // avec un autre : rien n'est encore copié sur celui-ci, la prochaine y ira
    const connecteAvec = courrielDe(c)
    const ailleurs = d && d.courriel && copieAilleurs(d.courriel, connecteAvec) ? { courriel: d.courriel, t: d.t } : null
    const courriel = ailleurs ? connecteAvec : (d?.courriel || connecteAvec || '')
    const commun: EtatDrive = { etat: 'ok', compte: c, enAttente, ...(d && !ailleurs ? { t: d.t } : {}), ...(courriel ? { courriel } : {}), ...(ailleurs ? { ailleurs } : {}) }
    if (this.conflit) {
      return { ...commun, etat: 'conflit', message: this.conflit.genre === 'histoire' ? CONFLIT_HISTOIRE : conflitOrigine(this.conflit.t ?? 0), actions: ['recuperer-drive', 'forcer-drive'] }
    }
    if (this.enCopie && this.montrerEnCours) return { ...commun, etat: 'en-cours' }
    // L'écrivain est passé sur le fil principal (le travailleur manque, vu
    // par Ctrl + S avant la première copie) : la copie qui attend ne partira
    // pas seule, on le dit (au lieu de « la première copie part bientôt »)
    if (enAttente && ecrivain.mode === 'fil') return { ...commun, etat: 'erreur', message: MESSAGE_FIL }
    if (enAttente && !enLigneReseau()) return { ...commun, etat: 'hors-ligne' }
    if (enAttente && this.erreur) return { ...commun, etat: 'erreur', message: this.erreur }
    if (!connecte(c) && (enAttente || !d)) return { ...commun, etat: 'connexion' }
    return commun
  }

  private maj() {
    this.etat = this.etatActuel()
    this.surveillance.majDrive({ ...this.etat })
    this.majQuitter()
  }

  // ---------- Fermer l'onglet avant la copie ----------
  /** Une copie attend, qui partirait d'elle-même, et rien d'autre ne
   *  protège ce classeur (voir drive-pur.questionDuDrive) */
  private attendLaCopie(): boolean {
    return questionDuDrive({
      aCopier: this.premierNonCopie !== null && !this.attendLaBase,
      partiraitSeule: this.peutCopierSeul(),
      departVoulu: !this.surveillance.questionDeLaCle,
      cle: this.surveillance.etat.cle?.etat,
    })
  }

  /** beforeunload n'est posé que pendant ce temps-là (il empêcherait sinon
   *  certains navigateurs de garder la page en mémoire) */
  private majQuitter() {
    const faut = this.attendLaCopie()
    if (faut && !this.quitter) {
      this.quitter = e => this.avantDeFermer(e)
      window.addEventListener('beforeunload', this.quitter)
    } else if (!faut && this.quitter) {
      window.removeEventListener('beforeunload', this.quitter)
      this.quitter = null
    }
  }

  /** On ferme l'onglet ou le navigateur (ou l'on recharge) : la copie part
   *  tout de suite, sans attendre le calme ni le rythme, et le navigateur
   *  demande s'il faut partir. Si l'on reste, elle aboutit (une copie déjà
   *  en cours : la suivante, s'il le faut, part dès qu'elle a fini). */
  private avantDeFermer(e: BeforeUnloadEvent) {
    if (!this.attendLaCopie()) return
    this.desQuePossible = true
    if (!this.enCopie) {
      clearTimeout(this.minuterie); this.minuterie = 0
      void this.copier({})
    }
    e.preventDefault()
    e.returnValue = ''
  }

  // ---------- Les changements ----------
  private change(quand: number) {
    if (this.suspendu || this.compte === 'aucune' || !this.enLigne) return
    this.dernierChangement = Math.max(this.dernierChangement, quand)
    const debut = this.premierNonCopie === null
    if (debut) this.premierNonCopie = quand
    if (this.enCopie && this.premierPendant === null) this.premierPendant = quand
    if (!this.enCopie) this.planifier()
    // Il y a maintenant quelque chose à copier : l'état le dit
    if (debut) this.maj()
  }

  /** La copie automatique est possible (sans un clic) */
  private peutCopierSeul(): boolean {
    return !this.suspendu && this.enLigne && this.compte !== 'aucune' && !this.conflit && !this.bloque
      && connecte(this.compte) && enLigneReseau() && ecrivain.mode !== 'fil'
  }

  private rythme() {
    return { premierNonCopie: this.premierNonCopie, dernierChangement: this.dernierChangement, finDerniere: this.finDerniere, taille: this.tailleDerniere, duree: this.dureeDerniere, prochainEssai: this.prochainEssai }
  }

  /** La prochaine copie (voir drive-pur.prochaineCopie) ; après le clic
   *  « Se connecter », tout de suite (au calme) */
  private planifier() {
    clearTimeout(this.minuterie); this.minuterie = 0
    if (!this.peutCopierSeul() || this.attendLaBase || this.premierNonCopie === null) return
    const quand = this.desQuePossible ? Date.now() : prochaineCopie(this.rythme())
    if (quand === null) return
    this.minuterie = window.setTimeout(() => { this.minuterie = 0; void this.auMoment() }, Math.max(0, quand - Date.now()))
  }

  /** C'est l'heure : seulement au calme (jamais pendant un trait), sauf
   *  onglet en arrière-plan */
  private async auMoment() {
    if (!this.peutCopierSeul() || this.enCopie) return
    if (document.visibilityState !== 'hidden' && !this.app.calme) {
      this.minuterie = window.setTimeout(() => { this.minuterie = 0; void this.auMoment() }, PAS_AU_CALME)
      return
    }
    await this.copier({})
  }

  // ---------- Copier ----------
  /** Une copie à la fois : celle-ci attend la précédente */
  private copier(o: OptionsCopie): Promise<Resultat> {
    const suite = this.file.then(() => this.uneCopie(o))
    this.file = suite.catch(() => { /* déjà dit */ })
    return suite
  }

  private async uneCopie(o: OptionsCopie): Promise<Resultat> {
    const compte = this.compte
    if (this.suspendu || compte === 'aucune' || !this.enLigne) return 'rien'
    if (!o.manuel && (!this.peutCopierSeul() || this.premierNonCopie === null)) return 'rien'
    if (!connecte(compte)) { this.maj(); return 'connexion' }
    if (this.app.tableau.trou) { this.attendLaBase = true; this.erreur = MESSAGE_TROU; this.maj(); return 'erreur' }
    const avant = this.etat.etat
    this.enCopie = true
    this.premierPendant = null
    this.desQuePossible = false
    // La première copie, ou une copie demandée, se montre ; les suivantes
    // gardent l'heure de la précédente (le bouton ne clignote pas)
    this.montrerEnCours = !!o.manuel || !this.derniere
    clearTimeout(this.minuterie); this.minuterie = 0
    if (this.montrerEnCours) this.maj()
    const debut = Date.now()
    try {
      const r = await sousLeVerrou(VERROU_DRIVE + this.id, () => this.copierIci(compte, o))
      if (r === 'occupe' || r === 'rien') return 'rien'
      if (r === 'conflit') return 'conflit'
      // Copié (ou déjà copié par un autre onglet) : ce qui est arrivé pendant reste à copier
      this.premierNonCopie = this.premierPendant
      this.echecs = 0; this.prochainEssai = 0; this.erreur = null
      if (r === 'copie') {
        this.finDerniere = Date.now(); this.dureeDerniere = this.finDerniere - debut
        if (avant === 'erreur' || avant === 'hors-ligne') this.app.ui?.message(REPRISE)
      }
      this.rattraperBientot()
      return r
    } catch (e) {
      return this.echec(e)
    } finally {
      this.enCopie = false
      this.montrerEnCours = false
      this.maj()
      if (this.premierNonCopie !== null) this.planifier()
    }
  }

  /** Sous le verrou : la fiche relue (une copie faite par un autre onglet
   *  compte), le fichier fabriqué depuis la base dans le travailleur, le
   *  garde-fou de l'histoire, puis l'envoi (et celui des deux ordinateurs,
   *  dans drive.ts) */
  private async copierIci(compte: CompteDrive, o: OptionsCopie): Promise<Resultat> {
    const fiche = await this.registre.classeur(this.id)
    if (!fiche || this.suspendu || this.compte !== compte) return 'rien'
    this.adopterLaCopieDe(fiche)
    await this.app.tableau.attendreEcritures()
    const date = Date.now()
    // Une base relue en partie (Tableau.incomplet) : ce qui s'en relit (le
    // garde-fou de l'histoire ne laisse pas écraser une copie qui a plus)
    const fab = await fabriquerFichier(this.base, { nom: fiche.nom, id: this.id }, date, { travailleurSeul: true, lisible: this.app.tableau.incomplet })
    if (this.suspendu || this.compte !== compte) return 'rien'
    const dossier = await dossierDeLaCopie(this.registre, fiche, compte)
    const d = this.derniere
    if (d?.vecteur && !o.forcer) {
      const c = comparerVecteurs(fab.vecteur, d.vecteur)
      // Rien de neuf depuis la dernière copie (un autre onglet l'a faite),
      // et elle est déjà là où elle doit être
      if (c === 'egal' && (d.dossier ?? '') === (dossier ?? '')) return 'deja'
      if (c !== 'contient' && c !== 'egal') { this.mettreEnConflit({ genre: 'histoire', idDrive: d.id }); return 'conflit' }
    }
    const origine = await this.origine
    const modifie = Math.min(date, Math.max(fiche.modifie || 0, this.dernierChangement || 0, this.surveillance.etat.modifie ?? 0)) || date
    const ac = new AbortController()
    const delai = window.setTimeout(() => ac.abort(), delaiDEnvoi(fab.fichier.size))
    let r: Awaited<ReturnType<typeof sauvegarder>>
    try {
      r = await sauvegarder({
        compte, classeur: this.id, nom: fiche.nom, fichier: fab.fichier, idExistant: d?.id ?? null,
        origine, t: modifie, recu: fiche.recu ?? fiche.cree ?? 0, forcer: o.forcer, signal: ac.signal, ...(dossier ? { dossier } : {}),
      })
    } finally { clearTimeout(delai) }
    if (r.conflit) { this.mettreEnConflit({ genre: 'origine', idDrive: r.id, t: r.conflit.t }); return 'conflit' }
    const courriel = courrielDe(compte) || d?.courriel
    const nouvelle: DriveFiche = { compte, id: r.id, t: Date.now(), taille: fab.fichier.size, vecteur: fab.vecteur, ...(courriel ? { courriel } : {}), ...(dossier ? { dossier } : {}) }
    this.derniere = nouvelle
    this.tailleDerniere = nouvelle.taille
    await this.registre.modifierClasseur(this.id, x => { x.drive = nouvelle }).catch(() => { /* this.derniere s'en souvient */ })
    // Les versions d'avant : les dix dernières (au mieux, sans attendre)
    void elaguerVersions(r.id).catch(() => 0)
    return 'copie'
  }

  /** La fiche a une copie plus récente que la nôtre (faite par un autre
   *  onglet) : elle devient la dernière */
  private adopterLaCopieDe(fiche: FicheClasseur) {
    const f = fiche.drive
    if (!f || f.compte !== this.compte || (this.derniere && f.t <= this.derniere.t)) return
    this.derniere = f
    this.finDerniere = Math.max(this.finDerniere, f.t)
    this.tailleDerniere = f.taille
  }

  private mettreEnConflit(c: NonNullable<CopieDrive['conflit']>) {
    clearTimeout(this.minuterie); this.minuterie = 0
    this.conflit = c
    this.maj()
  }

  /** Une copie qui a échoué : rien n'est perdu (la base garde tout) ; on
   *  réessaie seul, de plus en plus rarement ; la connexion tombée attend un
   *  clic, le réseau revenu repart seul */
  private echec(e: unknown): Resultat {
    const r = raisonDrive(e, enLigneReseau())
    if (r.genre === 'connexion') { this.erreur = null; return 'connexion' }
    if (r.genre === 'hors-ligne') this.erreur = null
    else this.erreur = r.message ?? 'la copie a échoué'
    if (r.reessayer) { this.echecs++; this.prochainEssai = Date.now() + reessai(this.echecs) }
    else this.bloque = (e as { statut?: number } | null)?.statut === 403 ? 'google' : 'ici'
    return 'erreur'
  }

  // ---------- Les classeurs en retard ----------
  private rattraperBientot(delai = 5000) {
    if (this.minuterieRattrapage || this.suspendu || !this.enLigne) return
    this.minuterieRattrapage = window.setTimeout(() => { this.minuterieRattrapage = 0; void this.rattraper() }, delai)
  }

  /** Les classeurs changés depuis leur dernière copie (ou jamais copiés) et
   *  dont la copie est voulue sur le Drive connecté : un à la fois, depuis
   *  leur base, quand rien d'autre n'est en cours (ni la copie de celui-ci,
   *  ni un geste) */
  private async rattraper() {
    if (this.rattrapage || this.suspendu || !this.enLigne) return
    this.rattrapage = true
    try {
      for (let n = 0; n < 500; n++) {
        const compte = COMPTES.map(c => c.cle as CompteDrive).find(c => connecte(c))
        if (!compte || !enLigneReseau() || ecrivain.mode === 'fil') return
        const due = this.peutCopierSeul() ? prochaineCopie(this.rythme()) : null
        if (this.enCopie || (due !== null && due - Date.now() < 60_000)) { this.rattraperBientot(60_000); return }
        if (document.visibilityState !== 'hidden' && !this.app.calme) { this.rattraperBientot(PAS_AU_CALME * 5); return }
        const [fiches, dossiers, defaut] = await Promise.all([this.registre.classeurs(), this.registre.dossiers(), this.registre.reglage('copieDrive').catch(() => undefined)])
        const f = enRetard(fiches, { compte, defaut, ici: this.id, ecartes: this.ecartes, montre: x => visible(x, dossiers) })[0]
        if (!f) return
        if (await this.copierUnAutre(f, compte, defaut) === 'arret') return
        await attendre(ENTRE_DEUX)
      }
    } catch { /* l'index refuse : une autre fois */ } finally { this.rattrapage = false }
  }

  /** Un classeur en retard, copié depuis sa base (sous son verrou, s'il est
   *  libre : sinon son onglet le copie) */
  private async copierUnAutre(f: FicheClasseur, compte: CompteDrive, defaut: unknown): Promise<'copie' | 'rien' | 'arret'> {
    try {
      const r = await copierDepuisLaBase(this.registre, f.id, compte, {
        origine: await this.origine,
        voulu: (x, dossiers) => enRetard([x], { compte, defaut, ici: this.id, ecartes: this.ecartes, montre: y => visible(y, dossiers) }).length > 0,
      })
      if (r === 'ecarte' || r === 'occupe') { this.ecartes.add(f.id); return 'rien' }
      return r
    } catch (e) {
      const r = raisonDrive(e, enLigneReseau())
      // La connexion, le réseau, le Drive plein : les suivants n'iraient pas mieux
      if (r.genre !== 'erreur' || /plein|ne répond pas|trop de temps/.test(r.message ?? '')) return 'arret'
      this.ecartes.add(f.id)
      return 'rien'
    }
  }

  // ---------- La connexion ----------
  /** Publier vient de se connecter (ou un autre onglet de ce classeur, non :
   *  le jeton est à l'onglet), ou la connexion est tombée */
  private connexionChange() {
    if (this.suspendu) return
    // Le compte connecté (par la copie ou par Publier) : la prochaine
    // connexion le proposera à Google
    for (const c of COMPTES) { const qui = courrielDe(c.cle); if (qui) retenirCompte(c.cle, qui) }
    this.maj()
    this.planifier()
    if (COMPTES.some(c => connecte(c.cle))) this.rattraperBientot(30_000)
  }

  /** « Se connecter à Google » (un clic : jamais sans lui). Google propose
   *  le compte qu'on reprend (voir indiceGoogle), sans redemander la liste ;
   *  la copie qui attend part aussitôt (au calme). */
  async seConnecter(compte: ChoixDrive = this.compte, o: { changer?: boolean; silencieux?: boolean; erreur?: (texte: string) => void } = {}): Promise<boolean> {
    if (compte === 'aucune') return false
    if (!this.enLigne) { this.app.ui?.message(`La copie sur le Drive ne marche pas dans la version hors ligne : ${HORS_LIGNE_FICHIER.toLowerCase()}`); return false }
    const indice = this.indicePour(compte)
    // Changer de compte (déjà connecté), ou aucun compte retenu : la liste de Google
    try { await connecter(compte, indice, o.changer || !indice ? 'select_account' : '') } catch (e) {
      if (o.erreur) o.erreur(texteConnexion(e))
      else this.app.ui?.message(texteConnexion(e))
      return false
    }
    const qui = courrielDe(compte)
    retenirCompte(compte, qui)
    // Google refusait l'accès : un autre compte, ou le même autorisé, peut-être
    if (this.bloque === 'google') { this.bloque = false; this.erreur = null; this.prochainEssai = 0 }
    if (compte === this.compte) {
      if (!o.silencieux) this.app.ui?.message(`Connecté à Google${qui ? ` (${qui})` : ''} : ${this.premierNonCopie !== null ? 'la copie sur le Drive part.' : 'la copie sur le Drive se fera au prochain changement.'}`)
      this.desQuePossible = this.premierNonCopie !== null
      this.maj()
      this.planifier()
    }
    return true
  }

  /** Le compte que Google proposera pour ce Drive (login_hint) */
  private indicePour(compte: CompteDrive): string {
    const derniere = this.derniere?.compte === compte ? this.derniere.courriel : undefined
    return indiceGoogle({ retenu: compteRetenu(compte), derniereCopie: derniere, publier: dernierCompteGoogle(compte) })
  }

  // ---------- Les garde-fous : récupérer, remplacer ----------
  /** « Récupérer la copie du Drive » : elle se télécharge, puis s'ouvre par
   *  le chemin d'« Ouvrir un classeur » (comparée à ce classeur : mise à
   *  jour sans rien perdre, ou ajoutée comme copie) */
  async recuperer(): Promise<void> {
    const compte = this.compte
    const id = this.conflit?.idDrive ?? this.derniere?.id
    if (compte === 'aucune' || !id) return
    if (!this.fichiers) { this.app.ui?.message('La copie du Drive ne peut pas être ouverte ici : la bibliothèque des classeurs ne s\'ouvre pas dans ce navigateur.'); return }
    if (!connecte(compte) && !await this.seConnecter(compte)) return
    this.app.ui?.message('Téléchargement de la copie du Drive…')
    let octets: Uint8Array
    try { octets = await lireSauvegarde(id) } catch (e) {
      const r = raisonDrive(e, enLigneReseau())
      this.app.ui?.message(r.genre === 'connexion' ? 'La connexion Google a expiré : reconnectez-vous, puis réessayez.'
        : r.genre === 'hors-ligne' ? 'Pas de réseau : la copie du Drive n\'a pas pu être téléchargée.'
          : `La copie du Drive n'a pas pu être téléchargée : ${r.message ?? 'erreur inconnue'}.`)
      return
    }
    await this.fichiers.ouvrir([{ fichier: new File([octets as BlobPart], nomDeSauvegarde(this.app.classeur.nom), { type: 'application/octet-stream' }) }])
  }

  /** « Remplacer quand même » : après une question, la copie du Drive est
   *  remplacée par ce classeur, sans les garde-fous */
  async remplacerQuandMeme(): Promise<boolean> {
    const compte = this.compte
    if (compte === 'aucune') return false
    const oui = await confirmer('Remplacer la copie du Drive ?',
      `La copie de « ${this.app.classeur.nom} » sur le ${nomDuCompte(compte)} sera remplacée par ce classeur. Ce qu'elle a de plus ne restera que dans les versions précédentes que garde Google Drive (les ${VERSIONS_GARDEES} dernières). Pour le garder, récupérez-la plutôt.`, 'Remplacer')
    if (!oui) return false
    if (!connecte(compte) && !await this.seConnecter(compte)) return false
    this.conflit = null
    if (this.premierNonCopie === null) this.premierNonCopie = Date.now()
    this.app.ui?.message('Copie sur le Drive…')
    const r = await this.copier({ manuel: true, forcer: true })
    if (r === 'copie' || r === 'deja') this.app.ui?.message(`La copie sur le ${nomDuCompte(compte)} est remplacée par ce classeur.`)
    else this.app.ui?.message(`La copie du Drive n'a pas pu être remplacée : ${this.etat.message ?? 'erreur inconnue'}.`)
    return r === 'copie' || r === 'deja'
  }

  // ---------- Ce que changent les autres onglets ----------
  private async relire() {
    if (this.suspendu) return
    const [f, defaut] = await Promise.all([this.registre.classeur(this.id).catch(() => undefined), this.registre.reglage('copieDrive').catch(() => undefined)])
    if (!f) return
    const compte = compteVoulu(f, defaut)
    if (compte !== this.compte) { this.prendreLeCompte(compte, f); this.maj(); this.planifier(); return }
    const avant = this.derniere?.t ?? 0
    this.adopterLaCopieDe(f)
    const nouvelle = (this.derniere?.t ?? 0) > avant
    if (nouvelle) {
      // Une copie faite par un autre onglet : elle a peut-être déjà tout ce
      // qu'on attendait de copier ; elle lève aussi un conflit (remplacée là-bas)
      const v = this.derniere?.vecteur
      if (!this.enCopie && this.premierNonCopie !== null && v) {
        const c = comparerVecteurs(v, Y.encodeStateVector(this.app.tableau.doc))
        if (c === 'egal' || c === 'contient') this.premierNonCopie = null
      }
      this.conflit = null
    }
    // Un changement fait dans un autre onglet (son suivi l'écrit dans la
    // fiche) : il est dans la base, cet onglet peut le copier (connecté ici,
    // et pas là-bas)
    if ((f.modifie || 0) > Math.max(this.derniere?.t ?? 0, this.dernierChangement)) this.change(f.modifie)
    if (nouvelle) { this.maj(); this.planifier() }
  }

  /** Le classeur est remplacé ou supprimé (ici ou ailleurs) : plus rien ne
   *  part sur le Drive depuis cet onglet */
  suspendre() {
    if (this.suspendu) return
    this.suspendu = true
    clearTimeout(this.minuterie); this.minuterie = 0
    clearTimeout(this.minuterieRattrapage); this.minuterieRattrapage = 0
    this.majQuitter()
  }

  // ---------- « Copie sur le Drive… » (le menu ⋯) ----------
  /** La fenêtre du choix : le Drive personnel, celui du lycée, pas de
   *  copie ; « pour tous les classeurs qui n'en ont pas » ; le compte
   *  connecté ; la taille de la copie et les dix versions. En file:// :
   *  grisée, elle dit pourquoi. */
  async ouvrirLeChoix(): Promise<void> {
    if (document.querySelector('dialog[open]')) return
    const fiche = await this.registre.classeur(this.id).catch(() => undefined)
    const nom = this.app.classeur.nom
    const d = document.createElement('dialog')
    d.className = 'dialogue dialogue-drive'
    d.setAttribute('aria-labelledby', 'titre-copie-drive')
    d.innerHTML = `<h2 id="titre-copie-drive">Copie sur le Drive</h2><div class="corps">
      <p class="d-explication"></p>
      <fieldset class="d-comptes"><legend></legend><div class="cases"></div></fieldset>
      <label class="case d-tous"><input type="checkbox"><span>Utiliser ce choix pour tous les classeurs qui n'en ont pas</span></label>
      <p class="d-google"><span class="d-qui"></span> <button type="button" class="secondaire petit d-connecter">Se connecter à Google</button></p>
      <p class="d-taille"></p>
      <p class="d-hors" hidden></p>
      <div class="actions"><button type="button" class="secondaire d-annuler">Annuler</button><button type="button" class="principal d-valider">Valider</button></div></div>`
    const q = <T extends HTMLElement>(s: string) => d.querySelector(s) as T
    q('legend').textContent = `Copier « ${nom} » sur`
    const choix: [ChoixDrive, string][] = [...COMPTES.map(c => [c.cle as ChoixDrive, c.nom] as [ChoixDrive, string]), ['aucune', 'Pas de copie pour ce classeur']]
    const cases = q('.cases')
    for (const [cle, libelle] of choix) {
      const l = Object.assign(document.createElement('label'), { className: 'case' })
      const i = Object.assign(document.createElement('input'), { type: 'radio', name: 'd-compte', value: cle, checked: cle === this.compte })
      l.append(i, Object.assign(document.createElement('span'), { textContent: libelle }))
      cases.appendChild(l)
    }
    const choisi = () => (q<HTMLInputElement>('input[name=d-compte]:checked')?.value ?? this.compte) as ChoixDrive
    const regler = () => {
      const c = choisi()
      const compte = c === 'aucune' ? null : compteDe(c)
      q('.d-explication').textContent = compte
        ? `Une copie de ce classeur part sur le ${compte.nom} peu après les changements (au plus toutes les 10 minutes), dans un dossier privé, « ${compte.sauvegardes} ». Elle va dans un seul sens : rien ne revient du Drive sans le demander (Bibliothèque → ⋯ → Récupérer une sauvegarde du Drive).`
        : 'Ce classeur ne sera plus copié sur le Drive. La copie qui y est déjà reste.'
      const g = q('.d-google'), qui = q('.d-qui'), b = q<HTMLButtonElement>('.d-connecter')
      g.hidden = !compte || !this.enLigne
      if (compte) {
        const courriel = courrielDe(compte.cle), dernier = this.indicePour(compte.cle as CompteDrive)
        qui.textContent = connecte(compte.cle) ? `Connecté : ${courriel || 'compte Google'}.`
          : dernier ? `Pas connecté : Google proposera ${dernier}.` : 'Pas connecté à Google.'
        b.textContent = connecte(compte.cle) ? 'Changer de compte Google' : 'Se connecter à Google'
      }
      const x = compte && fiche?.drive?.compte === compte.cle ? (this.derniere?.compte === compte.cle ? this.derniere : fiche.drive) : null
      // La dernière copie sur un autre compte Google que celui qui est connecté : on le dit
      const connecteAvec = compte ? courrielDe(compte.cle) : ''
      const ailleurs = x && x.courriel && copieAilleurs(x.courriel, connecteAvec) ? x.courriel : ''
      q('.d-taille').textContent = !compte ? ''
        : x && ailleurs ? `La dernière copie, sur ${ailleurs}, fait ${tailleLisible(x.taille)} (${quandLisible(x.t)}) ; la prochaine ira sur ${connecteAvec}. Le Drive garde les ${VERSIONS_GARDEES} dernières versions.`
          : x ? `La copie fait ${tailleLisible(x.taille)} (${quandLisible(x.t)}) ; le Drive en garde les ${VERSIONS_GARDEES} dernières versions.`
            : `Pas encore de copie sur ce Drive ; le Drive en gardera les ${VERSIONS_GARDEES} dernières versions.`
    }
    if (!this.enLigne) {
      for (const i of d.querySelectorAll<HTMLInputElement | HTMLButtonElement>('input, .d-valider, .d-connecter')) i.disabled = true
      const h = q('.d-hors')
      h.hidden = false
      h.textContent = HORS_LIGNE_FICHIER
    }
    d.addEventListener('change', regler)
    q('.d-connecter').addEventListener('click', async () => {
      const c = choisi()
      if (c === 'aucune') return
      // Dans ce clic ; changer de compte : la liste de Google, sinon le compte habituel
      if (await this.seConnecter(c, { changer: connecte(c), silencieux: true, erreur: t => { q('.d-qui').textContent = t } })) regler()
    })
    q('.d-annuler').addEventListener('click', () => d.close())
    q('.d-valider').addEventListener('click', async () => {
      const c = choisi(), tous = q<HTMLInputElement>('.d-tous input').checked
      d.close()
      await this.choisir(c, tous)
    })
    d.addEventListener('close', () => d.remove())
    fermerSurLeFond(d, () => d.close())
    regler()
    document.body.appendChild(d)
    d.showModal()
    q<HTMLInputElement>('input[name=d-compte]:checked')?.focus()
  }

  /** Le choix fait : la fiche du classeur (et, pour tous, le réglage de la
   *  bibliothèque), puis la copie sur le nouveau compte */
  async choisir(c: ChoixDrive, tous = false): Promise<void> {
    try {
      const f = await this.registre.modifierClasseur(this.id, x => { x.copieDrive = c })
      if (tous) await this.registre.ecrireReglage('copieDrive', c)
      if (f && c !== this.compte) { this.prendreLeCompte(c, f); this.maj(); this.planifier() }
    } catch {
      this.app.ui?.message('Le choix n\'a pas pu être gardé : la bibliothèque des classeurs refuse d\'écrire.')
      return
    }
    const nom = this.app.classeur.nom
    const pourTous = tous ? ' (et tous les classeurs qui n\'en ont pas)' : ''
    if (c === 'aucune') this.app.ui?.message(`« ${nom} »${pourTous} ne sera plus copié sur le Drive. La copie qui y est déjà reste.`)
    else this.app.ui?.message(`La copie de « ${nom} »${pourTous} va sur le ${nomDuCompte(c)}${connecte(c) ? '.' : ' : elle attend la connexion Google.'}`)
  }
}
