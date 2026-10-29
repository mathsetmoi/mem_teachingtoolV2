// =============================================================
// L'ENREGISTREMENT AUTOMATIQUE DANS UN FICHIER (LA CLÉ)
// Sur Chrome et Edge (File System Access : showSaveFilePicker), un
// classeur peut s'écrire tout seul dans un fichier .memc choisi une fois,
// sur la clé USB du professeur ou dans un dossier : peu après chaque
// changement, sans rien geler, et sans jamais écraser un fichier qui a
// changé ailleurs. C'est le cas d'usage principal de la version d'un seul
// fichier (file://) : le poste de lycée remis à zéro chaque soir, la clé du
// professeur, son classeur ouvert depuis elle (« Ouvrir un classeur… », la
// case « Enregistrer automatiquement les changements dans ce fichier »).
//
// Le fichier choisi (sa poignée, FileSystemFileHandle) est gardé dans
// l'index de la bibliothèque (le magasin 'poignees', voir registre.ts) ;
// la fiche du classeur garde ce qu'on a écrit la dernière fois (fiche.cle :
// le nom du fichier, l'heure, la date de son en-tête, sa taille, son
// vecteur d'état).
//
// QUAND : 20 secondes après le dernier changement, au plus tard 2 minutes
// après le premier changement pas encore écrit, et seulement au calme
// (app.calme : ni geste, ni point d'un simple toucher qui attend, 1,5 s
// depuis le dernier) ; sinon une seconde plus tard. L'intervalle vaut au
// moins 20 fois la durée de la dernière écriture. Aussi quand l'onglet
// passe en arrière-plan, et avant de changer de classeur (vider). Une
// écriture à la fois ; un changement arrivé pendant elle en appelle une
// autre. Un seul onglet écrit par classeur (Web Locks,
// 'mem-teachingtool-cle:<id>') ; l'autre annonce ses changements sur le
// canal des classeurs, au plus toutes les 5 secondes, et prend la suite
// quand le premier se ferme.
//
// FERMER L'ONGLET avant l'écriture (les 20 secondes après le dernier trait :
// la fin du cours) : tant que des changements attendent d'être écrits sur la
// clé par cet onglet, et qu'ils s'y écriront d'eux-mêmes (la clé à jour ou
// en train d'écrire : ni en pause, ni en conflit, ni en échec), fermer
// l'onglet ou le navigateur pose la question du navigateur (beforeunload),
// et l'écriture part aussitôt, sans attendre le calme : si l'on reste, elle
// aboutit en un instant (pendant la question, la page ne fait rien : c'est
// mesuré). Quitter quand même : rien n'est perdu dans ce navigateur, la
// prochaine ouverture du classeur l'écrira sur la clé. La question n'est
// posée que pendant ce temps-là (elle empêcherait sinon certains navigateurs
// de garder la page en mémoire), jamais quand on part par la bibliothèque
// (elle a attendu l'écriture, voir Surveillance.partirParLaBibliotheque) ou
// en connaissance de cause (le classeur remplacé, supprimé). Le texte court
// dit « Clé : pas encore à jour » pendant ce temps (etat.ts), au lieu de
// l'heure de la dernière écriture.
//
// COMMENT : le fichier se fabrique dans le travailleur, depuis la base
// (ecrivain.ts : jamais sur le fil principal pour une écriture
// automatique), puis s'écrit d'un bloc (createWritable, write, close :
// Chrome écrit à côté, puis remplace ; un échec avant close laisse le
// fichier d'avant entier). Jamais poserCeQuiAttend (qui ferait d'un
// double-clic au Stylo un point d'encre) : seuls Ctrl + S et les gestes
// explicites le font, et vident la piste des instruments.
//
// LES GARDE-FOUS, avant chaque écriture :
// - le fichier contient un autre classeur (un id présent et différent), ou
//   autre chose qu'un classeur : il n'est pas remplacé ;
// - la date de son en-tête n'est pas celle écrite d'ici : il a été modifié
//   ailleurs (le poste resté sur une version ancienne n'écrase pas le
//   travail du soir) ; un fichier sans id (d'avant le lot 4) est accepté
//   s'il a la bonne date ;
// - le vecteur écrit doit contenir celui de la dernière écriture : sinon,
//   ce classeur a perdu une partie de son histoire (une version d'avant l'a
//   remplacé par son « Ouvrir », une écriture refusée par le navigateur), et
//   le fichier n'est pas remplacé ;
// - la permission : si le navigateur ne l'a plus (après un rechargement),
//   rien n'est demandé sans un clic : un bandeau propose « Reprendre
//   l'enregistrement sur la clé ».
// Un conflit propose « Choisir un autre fichier… » et « Remplacer quand
// même » (après confirmation). Une écriture qui échoue (clé retirée,
// pleine, fichier en lecture seule) ne perd rien : la base du navigateur
// garde tout ; on réessaie seul après 30 s, 1 min, 2 min, puis toutes les
// 5 minutes.
//
// L'ACCORD DU NAVIGATEUR ET LES CHANGEMENTS DE PAGE (vérifié dans le vrai
// Chromium, sous Xvfb, en file:// comme en http) : Chrome oublie l'accord
// d'écrire dans le fichier dès que la page change (un rechargement, un autre
// classeur : chacun est une page), sauf si l'on a choisi « Autoriser à
// chaque visite » dans sa demande. Un classeur ajouté, ouvert, remplacé ou
// créé avec la case de la clé arrive donc souvent en pause : l'accord n'est
// pas demandé avant de partir vers lui (il serait perdu, et demandé deux
// fois) ; en arrivant, la clé vérifiée, le message dit la vérité
// (direALArrivee : « Il s'enregistre automatiquement… » seulement si le
// navigateur le permet ; sinon « … le navigateur demande votre accord »
// [Autoriser], la demande dans ce clic), et la demande du navigateur
// s'accompagne du conseil « Autoriser à chaque visite » (CONSEIL_ACCORD).
// =============================================================
import * as Y from 'yjs'
import type { ActionMessage, App } from '../app'
import type { Sauvegarde } from '../sauvegarde'
import type { Registre } from './registre'
import type { FicheClasseur } from './demarrage'
import { CANAL_CLASSEUR } from './demarrage'
import type { Surveillance } from './surveillance'
import type { EtatSauvegarde } from './etat'
import { dansQuoi, lieuDuFichier } from './etat'
import type { EnteteTableau } from '../fichier'
import { EXTENSION_TABLEAU, dateLisible, lireEntete, nomSur, tailleLisible } from '../fichier'
import { ErreurEcrivain, ecrivain, fabriquerFichier } from './ecrivain'
import { comparerVecteurs, contient, reunir } from './vecteurs'
import { ecritDansUnFichier } from './surveillance'
import { nomDeFichierLibre } from './emplacements'
import type { PoigneeDossier } from './ordinateur'
import { fermerSurLeFond } from '../dialogue'
import { POUR_ENREGISTRER, POUR_OUVRIR } from '../navigateur'

/** Ce qu'on utilise d'un FileSystemFileHandle (Chrome, Edge) ; les
 *  permissions manquent ailleurs (et aux poignées faites à la main) */
export interface PoigneeFichier {
  readonly name: string
  getFile(): Promise<File>
  createWritable(): Promise<EcritureFichier>
  queryPermission?(o: { mode: 'readwrite' }): Promise<PermissionState>
  requestPermission?(o: { mode: 'readwrite' }): Promise<PermissionState>
  isSameEntry?(autre: unknown): Promise<boolean>
}
interface EcritureFichier { write(d: Blob): Promise<void>; close(): Promise<void>; abort?(raison?: unknown): Promise<void> }

/** Ce que la fiche garde de la dernière écriture (voir FicheClasseur.cle) */
type CleFiche = NonNullable<FicheClasseur['cle']>

/** Ce qu'on dira de la clé en arrivant sur un classeur ajouté, ouvert,
 *  remplacé ou créé avec la case de la clé (gardé le temps du changement
 *  de page, avec le message d'arrivée) : le nom du fichier, et ce qu'on dit
 *  si le navigateur permet d'y écrire (par défaut « Il s'enregistre
 *  automatiquement dans « … ». ») ; sinon, son accord, en un clic (voir
 *  EnregistrementCle.direALArrivee) */
export interface CleALArrivee { nom: string; ok?: string }

/** Relu au retour (sessionStorage) : rien de valable, null */
export function lireCleALArrivee(x: unknown): CleALArrivee | null {
  const o = x as { nom?: unknown; ok?: unknown } | null
  if (!o || typeof o !== 'object' || typeof o.nom !== 'string' || !o.nom) return null
  return typeof o.ok === 'string' && o.ok ? { nom: o.nom, ok: o.ok } : { nom: o.nom }
}
type EtatCle = EtatSauvegarde['cle']

// ---------- Les temps ----------
/** Une écriture, tant de temps après le dernier changement… */
export const APRES_DERNIER = 20_000
/** … et au plus tard tant de temps après le premier changement pas écrit */
export const AU_PLUS_TARD = 2 * 60_000
/** L'intervalle vaut au moins tant de fois la durée de la dernière écriture */
const FOIS_LA_DUREE = 20
/** Pas au calme : on réessaie… */
const PAS_AU_CALME = 1000
/** Après un échec : on réessaie après 30 s, 1 min, 2 min, puis toutes les 5 min */
export const REESSAIS = [30_000, 60_000, 120_000, 300_000]
/** L'onglet qui n'écrit pas annonce ses changements au plus toutes les… */
const ANNONCE = 5000
/** Avant de changer de classeur : on attend l'écriture au plus… */
const VIDER_MAX = 10_000
/** Le verrou des onglets (Web Locks) : un seul écrit par classeur */
export const VERROU_CLE = 'mem-teachingtool-cle:'
/** Le choix du fichier : le même dossier d'une fois sur l'autre (Chrome
 *  retient le dernier dossier par id) */
export const ID_CHOIX = 'mem-classeurs'
export const TYPES_CLASSEUR = [{ description: 'Classeur (MEM teachingtool)', accept: { 'application/octet-stream': [EXTENSION_TABLEAU] } }]

// ---------- Les mots ----------
// (Le mot « clé » ne paraît jamais à l'écran, lot 18 : on dit le fichier,
// ou le dossier où l'outil l'a rangé, voir etat.lieuDuFichier et dansQuoi.)
export const AIDE_ACTIVER = 'Un fichier .memc, choisi une fois : le classeur s\'y enregistre tout seul, peu après chaque changement.'
export const PAS_UN_CLASSEUR = 'Ce fichier n\'est pas un classeur : choisissez un fichier .memc, ou un autre nom.'
export const PLUS_RICHE = `Ce fichier contient des changements que ce classeur n'a pas : il n'est pas remplacé. Pour les retrouver, ouvrez-le (${POUR_OUVRIR}).`
export const EN_MEMOIRE = 'Après un rechargement, il faudra choisir de nouveau le fichier.'
/** L'enregistrement reprend après une pause, un échec, un conflit : dans le
 *  dossier choisi (« LFB classeurs ») ou dans le fichier */
export const repris = (c: { nom?: string; chemin?: string[] }) => `L'enregistrement dans ${dansQuoi(c)} reprend.`
/** Dit pendant que le navigateur pose sa question (seulement s'il va la
 *  poser) : sa demande d'après un changement de page propose « Autoriser à
 *  chaque visite » (Chrome, Edge en français), qui le dispense de
 *  redemander à chaque classeur ; celle du lendemain, souvent, non. */
export const CONSEIL_ACCORD = 'Dans la demande du navigateur, choisissez « Autoriser à chaque visite » s\'il le propose : il ne la refera plus à chaque changement de classeur.'
/** Le classeur arrive, et le navigateur n'a pas (ou plus) l'accord d'écrire dans son fichier */
export const accordDemande = (fichier: string) => `Pour qu'il s'enregistre tout seul dans « ${fichier} », le navigateur demande votre accord.`
/** La clé du message à action « Autoriser » (il s'en va quand la clé n'est plus en pause) */
const ACTION_ACCORD = 'cle-accord'
export const MESSAGE_FIL = `ce navigateur ne permet pas d'écrire le fichier en arrière-plan : enregistrez le classeur (${POUR_ENREGISTRER})`
export const MESSAGE_TROU = `le classeur de ce navigateur n'est pas entièrement enregistré : enregistrez-le (${POUR_ENREGISTRER})`
const MESSAGE_ABIMEE = `le classeur de ce navigateur semble abîmé : enregistrez-le (${POUR_ENREGISTRER})`
const MESSAGE_SANS_BASE = `ce classeur n'a plus sa base dans ce navigateur : enregistrez-le (${POUR_ENREGISTRER})`
export const autreClasseur = (nom?: string) => `Ce fichier contient un autre classeur (« ${nom || 'sans nom'} ») : choisissez un autre nom.`
export const dejaPris = (nom: string) => `Ce fichier sert déjà à l'enregistrement automatique de « ${nom} » : choisissez un autre nom.`
export const conflitAutre = (fichier: string, nom?: string) => `Le fichier « ${fichier} » contient un autre classeur (« ${nom || 'sans nom'} ») : il n'est pas remplacé.`
export const conflitPasUnClasseur = (fichier: string) => `Le fichier « ${fichier} » ne contient plus un classeur : il n'est pas remplacé.`
export const conflitModifie = (fichier: string, date: number) => `Le fichier « ${fichier} » a été modifié ailleurs (${Number.isFinite(date) && date > 0 ? dateLisible(date) : 'à une date inconnue'}) depuis le dernier enregistrement d'ici : il n'est pas remplacé.`
export const conflitHistoire = (fichier: string) => `Ce classeur a perdu une partie de son histoire depuis le dernier enregistrement dans « ${fichier} » (remplacé par une autre version de MEM teachingtool, ou une écriture refusée par le navigateur) : le fichier n'est pas remplacé.`

/** Ce qu'on dit d'une écriture dans le fichier qui a échoué : la permission
 *  perdue (un clic la redonne), ou ce qui s'est passé (et si choisir un
 *  autre fichier peut aider) */
export function raisonCle(e: unknown): { genre: 'permission' } | { genre: 'erreur'; message: string; choisir: boolean } {
  const nom = (e as { name?: string } | null)?.name
  if (nom === 'NotAllowedError' || nom === 'SecurityError') return { genre: 'permission' }
  if (nom === 'NotFoundError' || nom === 'NotReadableError') return { genre: 'erreur', choisir: true, message: 'le fichier a été déplacé, supprimé, ou son disque retiré' }
  if (nom === 'QuotaExceededError') return { genre: 'erreur', choisir: true, message: 'le disque est plein' }
  if (nom === 'NoModificationAllowedError' || nom === 'InvalidStateError') return { genre: 'erreur', choisir: true, message: 'le fichier est en lecture seule, ou ouvert dans un autre logiciel' }
  if (e instanceof ErreurEcrivain) {
    if (e.raison === 'fil') return { genre: 'erreur', choisir: false, message: MESSAGE_FIL }
    if (e.raison === 'abimee') return { genre: 'erreur', choisir: false, message: MESSAGE_ABIMEE }
    if (e.raison === 'absente') return { genre: 'erreur', choisir: false, message: MESSAGE_SANS_BASE }
  }
  const m = e instanceof Error ? e.message.trim().replace(/\.$/, '') : ''
  return { genre: 'erreur', choisir: true, message: m ? `l'enregistrement a échoué (${m})` : 'l\'enregistrement a échoué' }
}

/** L'accord du navigateur pour écrire dans ce fichier. demander : dans un
 *  geste seulement (un clic, Ctrl + S) ; jamais sans. Une poignée sans
 *  permissions (faite à la main) vaut accordée ; une erreur vaut « pas
 *  encore ». */
export async function permission(p: PoigneeFichier, demander: boolean): Promise<PermissionState> {
  try {
    if (demander) return typeof p.requestPermission === 'function' ? await p.requestPermission({ mode: 'readwrite' }) : 'granted'
    return typeof p.queryPermission === 'function' ? await p.queryPermission({ mode: 'readwrite' }) : 'granted'
  } catch { return 'prompt' }
}

/** Le même fichier ? (isSameEntry ; sans lui, on ne sait pas : non) */
export async function memeFichier(a: PoigneeFichier, b: unknown): Promise<boolean> {
  try { return typeof a.isSameEntry === 'function' && !!b && await a.isSameEntry(b) } catch { return false }
}

/** L'en-tête d'un fichier, lu dans ses premiers octets (rien d'autre n'est lu) */
export async function enteteDe(f: File): Promise<EnteteTableau | null> {
  return lireEntete(new Uint8Array(await f.slice(0, 4096).arrayBuffer()))
}

/** Écrit le fichier d'un bloc : createWritable écrit à côté, close remplace.
 *  Un échec avant close : abort, et le fichier d'avant reste entier. */
export async function ecrireDans(p: PoigneeFichier, fichier: Blob): Promise<void> {
  const w = await p.createWritable()
  try {
    await w.write(fichier)
    await w.close()
  } catch (e) {
    try { await w.abort?.() } catch { /* déjà fermé */ }
    throw e
  }
}

const attendre = (ms: number) => new Promise<void>(ok => setTimeout(ok, ms))

/** Une écriture : manuel (Ctrl + S, un bouton : ce qui attend est posé, la
 *  piste vidée, et le fichier peut venir du fil principal ou de la mémoire
 *  de l'onglet) ; geste (on peut demander la permission) ; forcer
 *  (« Remplacer quand même » : sans les garde-fous du fichier et de
 *  l'histoire) */
interface OptionsEcriture { manuel?: boolean; geste?: boolean; forcer?: boolean }
type Resultat = 'ecrit' | 'rien' | 'conflit' | 'permission' | 'erreur'

/** Ce qu'a fait un déplacement du fichier (deplacerVers, et le même
 *  déplacement sous le verrou pour un classeur fermé, deplacer-fichier.ts) :
 *  deplace (garde : la nouvelle poignée est gardée dans l'index ; non, elle ne
 *  vit que dans cet onglet) ; sinon pourquoi rien n'a bougé : conflit (ce
 *  classeur a perdu une partie de l'histoire écrite dans son fichier, raison :
 *  son nom), plus-riche (un fichier de ce classeur déjà là-bas a plus que lui,
 *  raison : son nom), autre-onglet, permission, erreur (raison : ce qui s'est
 *  passé, sans point final), rien (pas de fichier) */
export type ResultatDeplacement =
  | { r: 'deplace'; garde: boolean }
  | { r: 'conflit' | 'plus-riche' | 'autre-onglet' | 'permission' | 'erreur' | 'rien'; raison: string }

/** Le fichier du classeur dans le dossier du chapitre où il arrive (« Déplacer
 *  le classeur… ») : « Fractions.memc » s'il est libre ; déjà pris par ce
 *  même classeur (un fichier d'avant, resté là) et ce qu'on va écrire
 *  (vecteur) a tout ce qu'il a : il est repris tel quel ; s'il a plus, rien
 *  n'est écrit ('plus-riche') ; pris par autre chose : un autre nom
 *  (« Fractions (2).memc »). Rend la poignée, créée s'il le faut. */
export async function fichierPourDeplacer(d: PoigneeDossier, c: { id: string; nom: string }, vecteur: Uint8Array): Promise<PoigneeFichier | 'plus-riche'> {
  const noms: string[] = []
  for await (const x of d.values()) noms.push(x.name)
  const base = nomSur(c.nom), prevu = base + EXTENSION_TABLEAU
  const pris = noms.find(n => n.toLocaleLowerCase('fr') === prevu.toLocaleLowerCase('fr'))
  if (pris) {
    const h = await d.getFileHandle(pris)
    const f = await h.getFile()
    if (f.size === 0) return h
    const e = await enteteDe(f)
    if (e && e.id === c.id) {
      let lu: { vecteur: Uint8Array } | null
      try { lu = await ecrivain.lireFichier(f) } catch { lu = null }
      return lu && contient(vecteur, lu.vecteur) ? h : 'plus-riche'
    }
  }
  return d.getFileHandle(nomDeFichierLibre(base, EXTENSION_TABLEAU, noms), { create: true })
}

export class EnregistrementCle {
  /** Ce navigateur sait écrire seul dans un fichier (showSaveFilePicker) */
  readonly disponible: boolean
  private readonly id: string
  private readonly base: string
  /** Le fichier de la clé ; null : pas d'enregistrement automatique */
  private poignee: PoigneeFichier | null = null
  /** La poignée n'a pas pu être gardée (DataCloneError) : elle ne vit que
   *  dans cet onglet */
  enMemoireSeulement = false
  /** Ce que dit l'état de la sauvegarde pour la clé */
  etat: EtatCle = { etat: 'absente' }
  /** La dernière écriture faite d'ici (au cas où l'index refuserait de la noter) */
  private derniere: CleFiche | null = null
  /** Les dossiers où l'outil a rangé lui-même le fichier (fiche.cle.chemin,
   *  lot 18), pour le dire à l'écran (« Enregistré dans LFB classeurs › 2 ›
   *  Fractions ») ; null : un fichier choisi à la main */
  private chemin: string[] | null = null
  /** Le verrou des onglets : 'moi' (cet onglet écrit), 'autre' (un autre
   *  onglet écrit), 'sans' (pas de Web Locks : on écrit) */
  private verrou: 'moi' | 'autre' | 'sans' | null = null
  private lacher: (() => void) | null = null
  private attenteVerrou: AbortController | null = null
  /** Plus rien n'est écrit (le classeur est remplacé ou supprimé) */
  private suspendu = false
  /** Le premier changement pas encore écrit (null : tout est écrit), le dernier */
  private premierNonEcrit: number | null = null
  private dernierChangement = 0
  /** Le premier changement arrivé pendant l'écriture en cours */
  private premierPendant: number | null = null
  private enEcriture = false
  private fileEcriture: Promise<unknown> = Promise.resolve()
  private finDerniere = 0
  private dureeDerniere = 0
  /** Après un échec : le nombre d'échecs de suite, et l'heure de l'essai suivant */
  private echecs = 0
  private prochainEssai = 0
  /** Une écriture refusée pendant le trou de la base : elle repart à sa réparation */
  private attendLaBase = false
  private minuterie = 0
  private canal: BroadcastChannel | null = null
  private derniereAnnonce = 0
  private minuterieAnnonce = 0
  /** La question du navigateur en fermant l'onglet (voir majQuitter) */
  private quitter: ((e: BeforeUnloadEvent) => void) | null = null
  /** Fini quand le démarrage l'est (la poignée relue, le verrou, le fichier vérifié) */
  readonly pret: Promise<void>

  constructor(private app: App, private registre: Registre, fiche: FicheClasseur, private surveillance: Surveillance, private sauvegarde: Sauvegarde) {
    this.id = fiche.id
    this.base = fiche.base
    this.disponible = ecritDansUnFichier() && ecrivain.mode !== 'fil'
    if (!this.disponible) { this.pret = Promise.resolve(); return }
    // Les changements, après le chargement (le chargement n'en est pas un)
    app.tableau.doc.on('update', () => this.change(true))
    // Les autres onglets ouverts sur ce classeur : leurs changements (pour
    // celui qui écrit), un remplacement ou une suppression (plus rien ne
    // s'écrit)
    try {
      this.canal = new BroadcastChannel(CANAL_CLASSEUR)
      this.canal.onmessage = e => {
        const d = e.data as { type?: string; base?: string } | null
        if (!d || d.base !== this.base) return
        if (d.type === 'change') { if (this.verrou !== 'autre') this.change(false) }
        else if (d.type === 'remplace' || d.type === 'supprime') this.suspendre()
        // L'état de la clé, entre l'onglet qui écrit et les autres
        else if (d.type === 'etat-cle?') { if (this.ecritIci && this.poignee) this.direEtat() }
        else if (d.type === 'etat-cle') { if (this.verrou === 'autre' && this.poignee) this.etatDeLAutre(d as { etat?: string; message?: string }) }
      }
    } catch { /* pas de canal : chaque onglet vit sa vie */ }
    // Ce que les autres onglets changent dans la fiche (la clé activée,
    // arrêtée, un autre fichier choisi)
    registre.onChange(c => { if (c.classeurs?.includes(this.id)) void this.relire() })
    // En arrière-plan : ce qui reste à écrire part tout de suite (on n'écrit plus)
    document.addEventListener('visibilitychange', () => {
      if (document.visibilityState === 'hidden' && this.premierNonEcrit !== null && this.peutEcrireSeul()) {
        clearTimeout(this.minuterie); this.minuterie = 0
        void this.ecrire({})
      }
    })
    // La base réparée (le trou comblé) : l'écriture refusée repart
    surveillance.quandChange(() => {
      if (this.attendLaBase && !app.tableau.trou) { this.attendLaBase = false; this.planifier() }
    })
    this.pret = this.demarrer().catch(() => { /* l'état le dit déjà */ })
  }

  /** L'enregistrement automatique est actif (un fichier est choisi) */
  get actif(): boolean { return !!this.poignee && !this.suspendu }
  /** C'est cet onglet qui écrit la clé (il tient le verrou, ou il n'y en a pas) */
  private get ecritIci(): boolean { return !this.suspendu && (this.verrou === 'moi' || this.verrou === 'sans') }
  /** Le nom du fichier de la clé */
  get nomFichier(): string | null { return this.poignee?.name ?? null }
  /** Où est le fichier, pour le dire : « LFB classeurs › 2 › Fractions
   *  (Fractions.memc) », ou « « Fractions.memc » » */
  private get lieu(): string { return lieuDuFichier({ nom: this.poignee?.name, ...(this.chemin ? { chemin: this.chemin } : {}) }) }
  /** Dans quoi il s'enregistre, en deux mots : « LFB classeurs », ou le nom du fichier */
  private get dansQuoi(): string { return dansQuoi({ nom: this.poignee?.name, ...(this.chemin ? { chemin: this.chemin } : {}) }) }
  /** La fiche dit (ou non) où l'outil a rangé le fichier : on le retient */
  private noterChemin(c?: CleFiche | null) { this.chemin = c?.chemin?.length ? [...c.chemin] : null }

  // ---------- Le démarrage ----------
  private async demarrer() {
    const fiche = await this.registre.classeur(this.id)
    if (!fiche?.cle) { this.maj({ etat: 'absente' }); return }
    const p = await this.registre.poignee<PoigneeFichier>(this.id).catch(() => undefined)
    if (!p) {
      // Le fichier choisi n'a pas pu être gardé (un navigateur qui ne garde
      // pas les poignées) : il est à choisir de nouveau
      this.maj({ etat: 'absente', message: `« ${fiche.cle.nom} » est à choisir de nouveau (ce navigateur ne le garde pas après un rechargement)` })
      return
    }
    this.poignee = p
    await this.demarrerActif(fiche.cle)
  }

  /** Le verrou, puis la vérification : l'histoire, la permission, le fichier */
  private async demarrerActif(cle: CleFiche) {
    this.noterChemin(cle)
    await this.demanderLeVerrou()
    if (this.verrou === 'autre') {
      this.maj({ etat: 'autre-onglet', nom: this.poignee?.name })
      // Ce que fait l'onglet qui écrit : il le dira
      try { this.canal?.postMessage({ type: 'etat-cle?', base: this.base }) } catch { /* seul onglet */ }
      return
    }
    await this.verifier(cle)
  }

  /** Avant toute écriture, sans rien écrire ni rien demander : ce classeur
   *  a-t-il gardé toute l'histoire écrite sur la clé (sa base et la mémoire
   *  de cet onglet, réunies, contiennent le dernier vecteur écrit : après la
   *  reprise par un second onglet, sa mémoire n'a pas ce que le premier a
   *  écrit depuis son ouverture, la base l'a) ? A-t-il des changements pas
   *  encore écrits ? Le navigateur permet-il encore d'écrire ? Le fichier
   *  est-il celui écrit d'ici ? */
  private async verifier(cle: CleFiche) {
    const p = this.poignee
    if (!p || this.suspendu) return
    this.noterChemin(cle)
    if (cle.vecteur) {
      let c: ReturnType<typeof comparerVecteurs> | null = null
      try { c = comparerVecteurs(await this.vecteurIci(), cle.vecteur) } catch { c = null }
      if (this.suspendu || this.poignee !== p) return
      if (c === 'contenu' || c === 'diverge') { this.conflit(conflitHistoire(p.name)); return }
      if (c === 'contient') this.aEcrire()
    } else if (cle.date === undefined) this.aEcrire()      // jamais écrit encore
    if (await permission(p, false) !== 'granted') { this.enPause(); return }
    try {
      const c = await this.examinerLeFichier(p, cle)
      if (c) { this.conflit(c, c !== conflitPasUnClasseur(p.name)); return }
    } catch (e) {
      // La clé n'est pas là (pas encore branchée) : on réessaiera
      this.echec(e)
      this.planifier()
      return
    }
    this.majEcrit('ok', p, cle)
    this.planifier()
  }

  /** Il y a des changements à écrire (au démarrage, à la reprise) */
  private aEcrire() {
    if (this.premierNonEcrit === null) { this.premierNonEcrit = Date.now(); this.dernierChangement = Date.now() }
  }

  // ---------- Le verrou des onglets ----------
  private demanderLeVerrou(): Promise<void> {
    const locks = (navigator as Navigator & { locks?: LockManager }).locks
    if (!locks?.request) { this.verrou = 'sans'; return Promise.resolve() }
    if (this.verrou === 'moi' || this.attenteVerrou) return Promise.resolve()
    return new Promise<void>(fini => {
      locks.request(VERROU_CLE + this.id, { ifAvailable: true }, lock => {
        if (!lock) { this.verrou = 'autre'; fini(); this.attendreLeVerrou(locks); return undefined }
        this.verrou = 'moi'
        fini()
        // Tenu par une promesse qui ne se résout qu'à l'arrêt
        return new Promise<void>(ok => { this.lacher = ok })
      }).catch(() => { this.verrou = 'sans'; fini() })
    })
  }

  /** Un autre onglet écrit : on attend son verrou, et l'on prend la suite
   *  quand il se ferme (ou arrête) */
  private attendreLeVerrou(locks: LockManager) {
    const ac = new AbortController()
    this.attenteVerrou = ac
    locks.request(VERROU_CLE + this.id, { signal: ac.signal }, () => {
      this.attenteVerrou = null
      if (!this.poignee || this.suspendu) return undefined
      this.verrou = 'moi'
      void this.prendreLaSuite()
      return new Promise<void>(ok => { this.lacher = ok })
    }).catch(() => { /* attente abandonnée */ })
  }

  private lacherLeVerrou() {
    this.lacher?.(); this.lacher = null
    this.attenteVerrou?.abort(); this.attenteVerrou = null
    this.verrou = null
  }

  /** L'autre onglet s'est fermé : cet onglet écrit. Ce qu'il a fait
   *  lui-même et qui n'est pas encore sur la clé s'y écrit. */
  private async prendreLaSuite() {
    const fiche = await this.registre.classeur(this.id).catch(() => undefined)
    if (!fiche?.cle) { this.arreterIci(); return }
    const p = await this.registre.poignee<PoigneeFichier>(this.id).catch(() => undefined)
    if (p) this.poignee = p
    await this.verifier(fiche.cle)
  }

  // ---------- Les changements ----------
  /** local : un changement de cet onglet ; sinon, annoncé par un autre
   *  onglet ouvert sur ce classeur (sa base a changé) */
  private change(local: boolean) {
    if (this.suspendu) return
    // Un autre onglet écrit : on lui dit, c'est tout (s'il se ferme, la
    // reprise compare ce que cet onglet a avec ce qui est sur la clé)
    if (this.verrou === 'autre') { if (local && this.poignee) this.annoncer(); return }
    const maintenant = Date.now()
    this.dernierChangement = maintenant
    const debut = this.premierNonEcrit === null
    if (debut) this.premierNonEcrit = maintenant
    if (this.enEcriture && this.premierPendant === null) this.premierPendant = maintenant
    if (!this.enEcriture) this.planifier()
    // Le dernier trait n'est pas encore sur la clé : l'état le dira (un peu
    // après, pas à chaque trait), et fermer l'onglet le demandera
    if (debut) {
      if (this.etat.etat === 'ok' || this.etat.etat === 'en-cours') {
        this.etat = { ...this.etat, depuis: maintenant }
        this.surveillance.cleEnAttente(maintenant)
      }
      this.majQuitter()
    }
  }

  /** L'onglet qui n'écrit pas dit ses changements à celui qui écrit, au
   *  plus toutes les 5 secondes */
  private annoncer() {
    if (this.minuterieAnnonce) return
    const reste = Math.max(0, this.derniereAnnonce + ANNONCE - Date.now())
    this.minuterieAnnonce = window.setTimeout(() => {
      this.minuterieAnnonce = 0
      this.derniereAnnonce = Date.now()
      try { this.canal?.postMessage({ type: 'change', base: this.base }) } catch { /* seul onglet */ }
    }, reste)
  }

  /** Une écriture automatique est possible (sans un clic) */
  private peutEcrireSeul(): boolean {
    if (!this.poignee || this.suspendu || this.verrou === 'autre') return false
    const e = this.etat.etat
    return e !== 'permission' && e !== 'conflit' && !(e === 'erreur' && this.etat.message === MESSAGE_FIL)
  }

  /** La prochaine écriture : 20 s après le dernier changement, au plus tard
   *  2 min après le premier pas écrit ; pas avant 20 fois la durée de la
   *  dernière, ni avant l'essai suivant un échec */
  private planifier() {
    clearTimeout(this.minuterie); this.minuterie = 0
    if (!this.peutEcrireSeul() || this.premierNonEcrit === null || this.attendLaBase) return
    const quand = Math.max(
      Math.min(this.dernierChangement + APRES_DERNIER, this.premierNonEcrit + AU_PLUS_TARD),
      this.finDerniere + FOIS_LA_DUREE * this.dureeDerniere,
      this.prochainEssai,
    )
    this.minuterie = window.setTimeout(() => { this.minuterie = 0; void this.auMoment() }, Math.max(0, quand - Date.now()))
  }

  /** C'est l'heure : seulement au calme (jamais pendant un trait), sauf
   *  onglet en arrière-plan */
  private async auMoment() {
    if (!this.peutEcrireSeul() || this.enEcriture) return
    if (document.visibilityState !== 'hidden' && !this.app.calme) {
      this.minuterie = window.setTimeout(() => { this.minuterie = 0; void this.auMoment() }, PAS_AU_CALME)
      return
    }
    await this.ecrire({})
  }

  // ---------- Écrire ----------
  /** Une écriture à la fois : celle-ci attend la précédente */
  private ecrire(o: OptionsEcriture): Promise<Resultat> {
    const suite = this.fileEcriture.then(() => this.uneEcriture(o))
    this.fileEcriture = suite.catch(() => { /* déjà dit */ })
    return suite
  }

  private async uneEcriture(o: OptionsEcriture): Promise<Resultat> {
    const p = this.poignee
    if (!p || this.suspendu) return 'rien'
    if (!o.manuel && !this.peutEcrireSeul()) return 'rien'
    if (!o.manuel && this.premierNonEcrit === null) return 'rien'
    const avant = this.etat.etat
    this.enEcriture = true
    this.premierPendant = null
    clearTimeout(this.minuterie); this.minuterie = 0
    const debut = Date.now()
    try {
      // 1. La permission : demandée seulement dans un geste (Ctrl + S, un clic)
      let accord = await permission(p, false)
      if (accord !== 'granted' && o.geste) { this.app.ui?.message(CONSEIL_ACCORD); accord = await permission(p, true) }
      if (accord !== 'granted') { this.enPause(); return 'permission' }
      // 2. La fiche, relue (un autre onglet a pu écrire, ou tout arrêter)
      const fiche = await this.registre.classeur(this.id).catch(() => undefined)
      if (fiche && !fiche.cle) { this.arreterIci(); return 'rien' }
      const cle = this.laDerniere(fiche?.cle)
      this.noterChemin(cle)
      // 3. Le fichier : est-il celui écrit d'ici ?
      if (!o.forcer) {
        const c = await this.examinerLeFichier(p, cle)
        if (c) { this.conflit(c, c !== conflitPasUnClasseur(p.name)); return 'conflit' }
      }
      // 4. Le fichier du classeur : une écriture automatique, dans le
      // travailleur seulement, depuis une base entière
      if (!o.manuel) {
        if (this.app.tableau.trou) { this.attendLaBase = true; this.erreur(MESSAGE_TROU, []); return 'erreur' }
        if (ecrivain.mode === 'fil') { this.erreur(MESSAGE_FIL, []); return 'erreur' }
      }
      if (o.manuel || !cle.date) this.majEcrit('en-cours', p, cle)
      const date = Math.max(Date.now(), (cle.date ?? 0) + 1)
      let fab: { fichier: Blob; vecteur: Uint8Array }
      if (o.manuel) fab = await this.sauvegarde.fabriquer(date)
      else {
        await this.app.tableau.attendreEcritures()
        const c = this.app.classeur
        // Une base relue en partie (Tableau.incomplet) : ce qui s'en relit,
        // tout ce qu'a ce classeur (le garde-fou de l'histoire, plus bas,
        // ne laisse pas écraser un fichier qui a la partie qui manque)
        fab = await fabriquerFichier(this.base, { nom: c.nom, id: this.id }, date, { travailleurSeul: true, lisible: this.app.tableau.incomplet })
      }
      if (this.suspendu || this.poignee !== p) return 'rien'
      // 5. L'histoire : tout ce qui a été écrit la dernière fois y est encore
      if (!o.forcer && cle.vecteur && !contient(fab.vecteur, cle.vecteur)) { this.conflit(conflitHistoire(p.name)); return 'conflit' }
      // 6. L'écriture, d'un bloc
      await ecrireDans(p, fab.fichier)
      // 7. Ce qui est écrit : la fiche le garde, pour la prochaine fois
      const nouvelle: CleFiche = { nom: p.name, t: Date.now(), date, taille: fab.fichier.size, vecteur: fab.vecteur, ...(cle.chemin ? { chemin: cle.chemin } : {}) }
      this.derniere = nouvelle
      await this.registre.modifierClasseur(this.id, x => { if (x.cle) x.cle = nouvelle }).catch(() => { /* this.derniere s'en souvient */ })
      this.premierNonEcrit = this.premierPendant
      this.echecs = 0; this.prochainEssai = 0
      this.finDerniere = Date.now(); this.dureeDerniere = this.finDerniere - debut
      this.maj({ etat: 'ok', nom: p.name, t: nouvelle.t })
      // Le classeur est dans un fichier depuis cette date (l'état et le rappel le savent)
      this.sauvegarde.noterFichier(date)
      if (!o.manuel && (avant === 'erreur' || avant === 'conflit' || avant === 'permission')) this.app.ui?.message(repris(nouvelle))
      return 'ecrit'
    } catch (e) {
      return this.echec(e)
    } finally {
      this.enEcriture = false
      if (this.premierNonEcrit !== null) this.planifier()
      this.majQuitter()
    }
  }

  // ---------- Déplacer le fichier (lot 18, deplacer-fichier.ts) ----------
  /** « Déplacer le classeur… » : le classeur de cet onglet change de fichier.
   *  Le nouveau est écrit EN ENTIER dans `dossier` (le dossier du chapitre à
   *  la nouvelle place, l'accord d'y écrire déjà donné dans le clic), avec
   *  les garde-fous d'une écriture automatique (jamais depuis une base
   *  trouée ou relue en partie, jamais si ce classeur a perdu une partie de
   *  l'histoire écrite la dernière fois, jamais par-dessus un fichier plus
   *  riche : fichierPourDeplacer), relu ; puis la clé passe à lui : sa
   *  poignée (gardée dans l'index), la fiche (nom, chemin, date, taille,
   *  vecteur), l'état à l'écran ; ses écritures suivantes vont dans le
   *  nouveau fichier. L'ancien fichier reste tel quel : c'est à qui appelle
   *  de le retirer, une fois examiné. chemin : les dossiers jusqu'à
   *  `dossier` compris, pour la fiche. Une écriture à la fois : celle-ci
   *  attend celle qui serait en cours. */
  deplacerVers(dossier: PoigneeDossier, chemin: string[]): Promise<ResultatDeplacement> {
    const suite = this.fileEcriture.then(() => this.unDeplacement(dossier, chemin))
    this.fileEcriture = suite.catch(() => { /* rendu à qui appelle */ })
    return suite
  }

  private async unDeplacement(dossier: PoigneeDossier, chemin: string[]): Promise<ResultatDeplacement> {
    const p = this.poignee
    if (!p || this.suspendu) return { r: 'rien', raison: 'pas de fichier' }
    if (this.verrou === 'autre') return { r: 'autre-onglet', raison: 'un autre onglet est ouvert sur ce classeur' }
    this.enEcriture = true
    this.premierPendant = null
    clearTimeout(this.minuterie); this.minuterie = 0
    const debut = Date.now()
    try {
      // 1. La fiche, relue (un autre onglet a pu écrire, ou tout arrêter)
      const fiche = await this.registre.classeur(this.id).catch(() => undefined)
      if (fiche && !fiche.cle) { this.arreterIci(); return { r: 'rien', raison: 'pas de fichier' } }
      const cle = this.laDerniere(fiche?.cle)
      // 2. Le fichier du classeur : dans le travailleur seulement, depuis une base entière
      if (this.app.tableau.trou || this.app.tableau.incomplet) return { r: 'erreur', raison: MESSAGE_TROU }
      if (ecrivain.mode === 'fil') return { r: 'erreur', raison: MESSAGE_FIL }
      await this.app.tableau.attendreEcritures()
      const c = this.app.classeur
      const date = Math.max(Date.now(), (cle.date ?? 0) + 1)
      const fab = await fabriquerFichier(this.base, { nom: c.nom, id: this.id }, date, { travailleurSeul: true })
      if (this.suspendu || this.poignee !== p) return { r: 'rien', raison: 'le fichier a changé entre-temps' }
      // 3. L'histoire : tout ce qui a été écrit la dernière fois y est encore
      if (cle.vecteur && !contient(fab.vecteur, cle.vecteur)) { this.conflit(conflitHistoire(p.name)); return { r: 'conflit', raison: p.name } }
      // 4. Le nouveau fichier (au nom de la fiche, comme relierLesClasseurs),
      // jamais par-dessus un plus riche ; écrit d'un bloc, relu
      const neuf = await fichierPourDeplacer(dossier, { id: this.id, nom: fiche?.nom ?? c.nom }, fab.vecteur)
      if (neuf === 'plus-riche') return { r: 'plus-riche', raison: nomSur(fiche?.nom ?? c.nom) + EXTENSION_TABLEAU }
      await ecrireDans(neuf, fab.fichier)
      if ((await neuf.getFile()).size !== fab.fichier.size) throw new Error('le fichier relu n\'a pas la taille écrite')
      // 5. La clé passe au nouveau fichier : la poignée, la fiche, l'état
      const nouvelle: CleFiche = { nom: neuf.name, t: Date.now(), date, taille: fab.fichier.size, vecteur: fab.vecteur, chemin: [...chemin] }
      this.poignee = neuf
      this.derniere = nouvelle
      this.noterChemin(nouvelle)
      let garde = true
      try { await this.registre.garderPoignee(this.id, neuf); this.enMemoireSeulement = false } catch (e) {
        if ((e as { name?: string } | null)?.name !== 'DataCloneError') throw e
        garde = false; this.enMemoireSeulement = true
      }
      await this.registre.modifierClasseur(this.id, x => { if (x.cle) x.cle = nouvelle }).catch(() => { /* this.derniere s'en souvient */ })
      this.premierNonEcrit = this.premierPendant
      this.echecs = 0; this.prochainEssai = 0; this.attendLaBase = false
      this.finDerniere = Date.now(); this.dureeDerniere = this.finDerniere - debut
      this.maj({ etat: 'ok', nom: neuf.name, t: nouvelle.t })
      this.sauvegarde.noterFichier(date)
      return { r: 'deplace', garde }
    } catch (e) {
      const r = raisonCle(e)
      return r.genre === 'permission' ? { r: 'permission', raison: 'le navigateur n\'a pas permis d\'écrire' } : { r: 'erreur', raison: r.message }
    } finally {
      this.enEcriture = false
      if (this.premierNonEcrit !== null) this.planifier()
      this.majQuitter()
    }
  }

  /** La dernière écriture : celle de la fiche, ou celle faite d'ici si
   *  l'index n'a pas pu la noter */
  private laDerniere(f?: CleFiche): CleFiche {
    const d = this.derniere
    if (!f) return d ?? { nom: this.poignee?.name ?? '' }
    return d && (d.t ?? 0) > (f.t ?? 0) ? d : f
  }

  /** Le fichier, avant de le remplacer : vide, on écrit ; sinon son en-tête
   *  (ses premiers octets seulement) doit être celui de ce classeur, à la
   *  date écrite d'ici. Rend le conflit à dire, ou null. */
  private async examinerLeFichier(p: PoigneeFichier, cle: CleFiche): Promise<string | null> {
    const f = await p.getFile()
    if (f.size === 0) return null
    const e = await enteteDe(f)
    if (!e) return conflitPasUnClasseur(p.name)
    if (e.id && e.id !== this.id) return conflitAutre(p.name, e.nom)
    if (e.date !== cle.date) return conflitModifie(p.name, e.date)
    return null
  }

  // ---------- Les états ----------
  /** depuis : des changements attendent d'être écrits (seulement quand la
   *  clé écrit d'elle-même, voir etat.ts) ; chemin : où l'outil a rangé le
   *  fichier, s'il le sait (les textes le disent) */
  private maj(e: EtatCle) {
    const x: EtatCle = { ...e }
    delete x.depuis
    if ((x.etat === 'ok' || x.etat === 'en-cours') && this.premierNonEcrit !== null && !this.suspendu) x.depuis = this.premierNonEcrit
    delete x.chemin
    if (this.chemin && x.nom) x.chemin = [...this.chemin]
    this.etat = x
    this.surveillance.majCle({ ...x })
    if (this.ecritIci && this.poignee) this.direEtat()
    this.majQuitter()
    // Plus en pause : le message « … le navigateur demande votre accord »
    // [Autoriser] n'a plus d'objet (l'accord donné par le bandeau, Ctrl + S)
    if (x.etat !== 'permission') this.app.ui?.oublierAction(ACTION_ACCORD)
  }

  /** « ok » ou « en-cours », d'après la dernière écriture connue : son
   *  heure, et si la clé a déjà ce classeur (sinon : pas encore écrit, il
   *  ne protège rien ; un fichier ouvert puis gardé a sa date sans heure
   *  d'écriture : il a ce classeur) */
  private majEcrit(etat: 'ok' | 'en-cours', p: PoigneeFichier, cle: CleFiche) {
    this.maj({ etat, nom: p.name, ...(cle.t !== undefined ? { t: cle.t } : {}), ...(cle.date === undefined ? { pasEncoreEcrit: true } : {}) })
  }

  // ---------- Fermer l'onglet ----------
  /** Des changements attendent d'être écrits sur la clé par cet onglet, et
   *  ils s'y écriront d'eux-mêmes (pas en pause, en conflit, en échec ; pas
   *  pendant le trou de la base) ; on ne part pas en connaissance de cause */
  private attendLEcriture(): boolean {
    if (this.premierNonEcrit === null || !this.poignee || !this.ecritIci || this.attendLaBase) return false
    if (!this.surveillance.questionDeLaCle) return false
    return this.etat.etat === 'ok' || this.etat.etat === 'en-cours'
  }

  /** beforeunload n'est posé que pendant ce temps-là (il empêcherait sinon
   *  certains navigateurs de garder la page en mémoire) */
  private majQuitter() {
    const faut = this.attendLEcriture()
    if (faut && !this.quitter) {
      this.quitter = e => this.avantDeFermer(e)
      window.addEventListener('beforeunload', this.quitter)
    } else if (!faut && this.quitter) {
      window.removeEventListener('beforeunload', this.quitter)
      this.quitter = null
    }
  }

  /** On ferme l'onglet ou le navigateur (ou l'on recharge) : l'écriture
   *  part tout de suite, sans attendre le calme, et le navigateur demande
   *  s'il faut partir. Si l'on reste, elle aboutit. */
  private avantDeFermer(e: BeforeUnloadEvent) {
    if (!this.attendLEcriture()) return
    if (!this.enEcriture) {
      clearTimeout(this.minuterie); this.minuterie = 0
      void this.ecrire({})
    }
    e.preventDefault()
    e.returnValue = ''
  }

  /** L'onglet qui écrit dit son état aux autres onglets ouverts sur ce
   *  classeur (sur le canal des classeurs) */
  private direEtat() {
    try { this.canal?.postMessage({ type: 'etat-cle', base: this.base, etat: this.etat.etat, message: this.etat.message }) } catch { /* seul onglet */ }
  }

  /** Un onglet qui n'écrit pas montre honnêtement ce que fait celui qui
   *  écrit : à jour, « Par l'autre onglet » ; en pause, en conflit, en
   *  échec, le fichier n'est pas à jour (et rien ne dit qu'il protège le
   *  classeur : le rappel peut venir), sans bouton ici (c'est l'autre onglet
   *  qui peut le faire) */
  private etatDeLAutre(d: { etat?: string; message?: string }) {
    const nom = this.poignee?.name
    const raison = d.message ? ` (${d.message.trim().replace(/[.\s]+$/, '')})` : ''
    const dans = this.dansQuoi
    if (d.etat === 'ok' || d.etat === 'en-cours') this.maj({ etat: 'autre-onglet', nom })
    else if (d.etat === 'permission') this.maj({ etat: 'erreur', nom, actions: [], message: `l'autre onglet ouvert sur ce classeur attend votre accord pour écrire dans ${dans} (son bandeau : « Reprendre l'enregistrement »)` })
    else if (d.etat === 'conflit') this.maj({ etat: 'erreur', nom, actions: [], message: `l'autre onglet ouvert sur ce classeur ne remplace pas le fichier${nom ? ` « ${nom} »` : ''}, qui a changé ailleurs : voyez son bandeau` })
    else if (d.etat === 'erreur') this.maj({ etat: 'erreur', nom, actions: [], message: `l'autre onglet ouvert sur ce classeur n'arrive pas à écrire dans ${dans}${raison}` })
  }

  private enPause() {
    this.maj({ etat: 'permission', nom: this.poignee?.name })
  }

  /** Un fichier qu'on ne remplace pas. S'il contient encore un classeur (le
   *  même, modifié ailleurs ; ou un autre), on peut aussi l'ouvrir (lot 4
   *  C9 : le comparer, le mettre à jour sans rien perdre, ou l'ajouter) */
  private conflit(message: string, ouvrir = true) {
    clearTimeout(this.minuterie); this.minuterie = 0
    this.maj({ etat: 'conflit', nom: this.poignee?.name, message, actions: ouvrir ? ['ouvrir-cle', 'choisir-cle', 'forcer-cle'] : ['choisir-cle', 'forcer-cle'] })
  }

  private erreur(message: string, actions: EtatCle['actions']) {
    this.maj({ etat: 'erreur', nom: this.poignee?.name, message, actions })
  }

  /** Une écriture qui a échoué : rien n'est perdu (la base garde tout) ; on
   *  réessaie seul, de plus en plus rarement */
  private echec(e: unknown): Resultat {
    const r = raisonCle(e)
    if (r.genre === 'permission') { this.enPause(); return 'permission' }
    this.erreur(r.message, r.choisir ? ['choisir-cle'] : [])
    if (r.message !== MESSAGE_FIL && r.message !== MESSAGE_SANS_BASE) {
      this.echecs++
      this.prochainEssai = Date.now() + REESSAIS[Math.min(this.echecs, REESSAIS.length) - 1]
      this.aEcrire()
    }
    return 'erreur'
  }

  // ---------- Ce que fait le professeur ----------
  /** « Enregistrer automatiquement dans un fichier… » (un clic) : on choisit
   *  le fichier (showSaveFilePicker), on vérifie qu'il peut servir, on le
   *  garde, et une première écriture part tout de suite. */
  async activer(): Promise<boolean> {
    if (!this.disponible || this.suspendu) return false
    const choisir = (window as unknown as { showSaveFilePicker?: (o: unknown) => Promise<PoigneeFichier> }).showSaveFilePicker
    if (typeof choisir !== 'function') return false
    let h: PoigneeFichier
    try {
      h = await choisir.call(window, { suggestedName: nomSur(this.app.classeur.nom) + EXTENSION_TABLEAU, id: ID_CHOIX, types: TYPES_CLASSEUR })
    } catch (e) {
      if ((e as { name?: string } | null)?.name !== 'AbortError') this.app.ui?.message(`Le fichier n'a pas pu être choisi : ${raisonCle(e).genre === 'permission' ? 'le navigateur ne l\'a pas permis' : (raisonCle(e) as { message: string }).message}.`)
      return false
    }
    let accepte: { date?: number; vecteur?: Uint8Array }
    try {
      const r = await this.examinerLeChoix(h)
      if (typeof r === 'string') { this.app.ui?.message(r); return false }
      accepte = r
    } catch (e) {
      const r = raisonCle(e)
      this.app.ui?.message(`Ce fichier ne peut pas servir : ${r.genre === 'permission' ? 'le navigateur ne permet pas de le lire' : r.message}.`)
      return false
    }
    return this.adopter(h, accepte, true)
  }

  /** Le fichier choisi peut-il servir à ce classeur ? Pas celui d'un autre
   *  classeur (le même fichier, ou son contenu) ; s'il n'est pas vide, un
   *  classeur qui n'a rien de plus que celui-ci (sinon on perdrait ses
   *  changements en l'écrasant). Rend la raison du refus, ou ce qu'on sait
   *  du fichier accepté. */
  private async examinerLeChoix(h: PoigneeFichier): Promise<string | { date?: number; vecteur?: Uint8Array }> {
    const autres = await this.registre.poignees().catch(() => [])
    for (const a of autres) {
      if (a.id === this.id || !await memeFichier(h, a.poignee)) continue
      const f = await this.registre.classeur(a.id).catch(() => undefined)
      return dejaPris(f?.nom ?? 'un autre classeur')
    }
    const f = await h.getFile()
    if (f.size === 0) return {}
    const e = await enteteDe(f)
    if (!e) return PAS_UN_CLASSEUR
    if (e.id && e.id !== this.id) return autreClasseur(e.nom)
    let lu: { vecteur: Uint8Array }
    try { lu = await ecrivain.lireFichier(f) } catch (x) {
      if (x instanceof ErreurEcrivain && x.raison === 'illisible') return x.message
      throw x
    }
    const ici = await this.vecteurIci()
    const c = comparerVecteurs(lu.vecteur, ici)
    if (c === 'contient' || c === 'diverge') return PLUS_RICHE
    return { date: e.date, vecteur: lu.vecteur }
  }

  /** Ce que contient ce classeur : sa base (tous les onglets, lue dans le
   *  travailleur) et la mémoire de cet onglet (ce qu'il n'y a pas encore
   *  écrit), réunies ; la mémoire seule pendant un trou, ou sans travailleur */
  private async vecteurIci(): Promise<Uint8Array> {
    const memoire = Y.encodeStateVector(this.app.tableau.doc)
    if (this.app.tableau.trou) return memoire
    try {
      const { vecteur } = await ecrivain.vecteurDeLaBase(this.base, { travailleurSeul: true })
      return reunir(vecteur, memoire)
    } catch { return memoire }
  }

  /** Garde le fichier pour ce classeur et le note dans sa fiche ; puis
   *  (ecrireTout : un choix fait à l'instant) une première écriture. Un
   *  navigateur qui ne sait pas garder la poignée (DataCloneError) : elle ne
   *  vit que dans cet onglet, et on le dit. */
  private async adopter(h: PoigneeFichier, connu: { date?: number; vecteur?: Uint8Array }, ecrireTout: boolean): Promise<boolean> {
    this.enMemoireSeulement = false
    try { await this.registre.garderPoignee(this.id, h) } catch (e) {
      if ((e as { name?: string } | null)?.name !== 'DataCloneError') {
        this.app.ui?.message(`L'enregistrement automatique n'a pas pu être activé : ${raisonCle(e).genre === 'permission' ? 'le navigateur ne l\'a pas permis' : (raisonCle(e) as { message: string }).message}.`)
        return false
      }
      this.enMemoireSeulement = true
    }
    const cle: CleFiche = { nom: h.name }
    if (connu.date !== undefined) cle.date = connu.date
    if (connu.vecteur) cle.vecteur = connu.vecteur
    this.derniere = null
    this.noterChemin(cle)        // un fichier choisi à la main : pas de chemin
    try { await this.registre.modifierClasseur(this.id, x => { x.cle = cle }) } catch {
      this.app.ui?.message('L\'enregistrement automatique n\'a pas pu être activé : la bibliothèque des classeurs refuse d\'écrire.')
      return false
    }
    this.poignee = h
    this.echecs = 0; this.prochainEssai = 0; this.attendLaBase = false
    this.premierNonEcrit = Date.now(); this.dernierChangement = Date.now()
    await this.demanderLeVerrou()
    if (this.verrou === 'autre') {
      this.maj({ etat: 'autre-onglet', nom: h.name })
      if (ecrireTout) this.app.ui?.message(`C'est l'autre onglet ouvert sur ce classeur qui l'enregistre dans « ${h.name} ».`)
      return true
    }
    if (!ecrireTout) return true
    const r = await this.ecrire({ manuel: true, geste: true })
    const suite = this.enMemoireSeulement ? ` ${EN_MEMOIRE}` : ''
    if (r === 'ecrit') this.app.ui?.message(`Le classeur s'enregistre maintenant tout seul dans « ${h.name} ».${suite}`)
    else if (r === 'erreur') this.app.ui?.message(`Le fichier « ${h.name} » est choisi, mais la première écriture a échoué : ${this.etat.message ?? 'erreur inconnue'}. Elle sera réessayée.${suite}`)
    else if (r === 'conflit') this.app.ui?.message(this.etat.message ?? '')
    return true
  }

  /** Le fichier de la clé (sa poignée), pour l'ouvrir (lot 4 C9) */
  get fichierDeLaCle(): PoigneeFichier | null { return this.suspendu ? null : this.poignee }

  /** La fiche vient d'être changée dans cet onglet (le fichier de la clé
   *  ouvert, puis repris : sa date et son vecteur, lot 4 C9) : on la relit
   *  et l'on vérifie de nouveau, comme au démarrage (le canal de la
   *  bibliothèque ne revient pas à qui parle) */
  async resynchroniser(): Promise<void> {
    if (this.suspendu || !this.disponible) return
    const f = await this.registre.classeur(this.id).catch(() => undefined)
    if (!f?.cle) { if (this.poignee) this.arreterIci(); return }
    const p = await this.registre.poignee<PoigneeFichier>(this.id).catch(() => undefined)
    if (p) this.poignee = p
    if (!this.poignee) return
    this.derniere = null
    this.echecs = 0; this.prochainEssai = 0
    await this.demarrerActif(f.cle)
  }

  /** « Choisir un autre fichier… » : comme activer, à la place de celui-ci */
  choisirUnAutre(): Promise<boolean> { return this.activer() }

  /** « Remplacer quand même » (un conflit) : après confirmation, le fichier
   *  du classeur est remplacé par ce classeur, sans les garde-fous */
  async remplacerQuandMeme(): Promise<boolean> {
    const p = this.poignee
    if (!p) return false
    const oui = await confirmer('Remplacer le fichier ?',
      `« ${p.name} » sera remplacé par ce classeur : ce qu'il contient de plus sera perdu. Pour le garder, choisissez plutôt un autre fichier, ou ouvrez-le (${POUR_OUVRIR}).`, 'Remplacer')
    if (!oui) return false
    const r = await this.ecrire({ manuel: true, geste: true, forcer: true })
    if (r === 'ecrit') this.app.ui?.message(`Enregistré dans ${this.lieu}.`)
    else this.app.ui?.message(`Le fichier « ${p.name} » n'a pas pu être remplacé : ${this.etat.message ?? 'erreur inconnue'}.`)
    return r === 'ecrit'
  }

  /** Le navigateur a refusé l'accord d'écrire dans le fichier : l'enregistrement reste en pause */
  private get resteEnPause(): string { return `Le navigateur n'a pas permis d'écrire dans « ${this.poignee?.name ?? ''} » : l'enregistrement reste en pause.` }

  /** « Reprendre l'enregistrement » (un clic, après un rechargement) ou
   *  « Autoriser » (le message d'arrivée, arrivee) : l'accord demandé dans
   *  le geste, avec le conseil « Autoriser à chaque visite » s'il va être
   *  demandé, puis l'écriture due */
  async reprendre(o: { arrivee?: boolean } = {}): Promise<boolean> {
    const p = this.poignee
    if (!p) return false
    if (await permission(p, false) !== 'granted') this.app.ui?.message(CONSEIL_ACCORD)
    if (await permission(p, true) !== 'granted') {
      this.app.ui?.message(this.resteEnPause)
      return false
    }
    const fiche = await this.registre.classeur(this.id).catch(() => undefined)
    if (fiche && !fiche.cle) { this.arreterIci(); return false }
    this.majEcrit('ok', p, this.laDerniere(fiche?.cle))
    await this.verifier(this.laDerniere(fiche?.cle))
    if (this.etat.etat !== 'ok') return false
    if (this.premierNonEcrit !== null && await this.ecrire({}) !== 'ecrit') return false
    this.app.ui?.message(o.arrivee ? `Le classeur s'enregistre maintenant tout seul dans « ${p.name} ».` : repris(this.etat))
    return true
  }

  /** L'arrivée sur un classeur ajouté, ouvert, remplacé ou créé avec la case
   *  de la clé (ou dont le fichier de la clé vient d'être rouvert) : debut
   *  (« Classeur ajouté à la bibliothèque : … ») puis ce qu'il en est
   *  vraiment, une fois la clé vérifiée ici (son démarrage fini). Jamais
   *  « Il s'enregistre automatiquement » sans l'accord du navigateur, que
   *  Chrome oublie en changeant de page : sinon on le dit, avec le geste en
   *  un clic (« Autoriser » : la demande dans ce clic). apres : ce qu'on dit
   *  encore, à la fin. */
  async direALArrivee(debut: string, c: CleALArrivee, apres = ''): Promise<void> {
    const verifiee = await Promise.race([this.pret.then(() => true), attendre(VIDER_MAX).then(() => false)])
    const e = this.etat
    const nom = this.poignee?.name ?? c.nom
    const dire = (t: string, action?: ActionMessage) => this.app.ui?.message([debut, t, apres].filter(Boolean).join(' '), action)
    // Remplacé ou supprimé entre-temps ; ou pas encore vérifiée au bout de
    // 10 s (une base énorme à relire) : rien sur la clé, l'état le dira
    if (this.suspendu || !verifiee) { dire(''); return }
    switch (e.etat) {
      case 'ok':
      case 'en-cours':
        dire(c.ok ?? (e.pasEncoreEcrit ? `La première écriture dans « ${nom} » part bientôt.` : `Il s'enregistre automatiquement dans « ${nom} ».`))
        return
      case 'permission':
        dire(accordDemande(nom), { libelle: 'Autoriser', cle: ACTION_ACCORD, faire: () => void this.reprendre({ arrivee: true }) })
        return
      case 'autre-onglet':
        dire(`C'est l'autre onglet ouvert sur ce classeur qui l'enregistre dans « ${nom} ».`)
        return
      case 'conflit':
        dire(e.message ?? `Le fichier « ${nom} » n'est pas remplacé.`)
        return
      case 'erreur':
        dire(`L'enregistrement dans « ${nom} » ne se fait pas pour l'instant (${sansPointFinal(e.message ?? 'erreur inconnue')}). Rien n'est perdu : il est dans ce navigateur.`)
        return
      default:
        dire(`L'enregistrement automatique n'est pas activé${e.message ? ` : ${sansPointFinal(e.message)}` : ''}.`)
    }
  }

  /** Ctrl + S, « Enregistrer maintenant » : tout de suite, après avoir posé
   *  ce qui attend. Faux s'il n'a pas pu écrire. « Enregistré dans LFB
   *  classeurs › 2 › Fractions (Fractions.memc) (850 Ko). » */
  async enregistrerMaintenant(): Promise<boolean> {
    const p = this.poignee
    if (!p) return false
    this.app.ui?.message('Enregistrement…')
    const r = await this.ecrire({ manuel: true, geste: true })
    const taille = this.derniere?.taille
    const ko = taille ? ` (${tailleLisible(taille)})` : ''
    if (r === 'ecrit') this.app.ui?.message(this.app.tableau.incomplet ? `Enregistré dans ${this.lieu}, sans la partie qui ne se relit plus dans ce navigateur${ko}.` : `Enregistré dans ${this.lieu}${ko}.`)
    else if (r === 'permission') this.app.ui?.message(this.resteEnPause)
    else if (r === 'conflit') this.app.ui?.message(this.etat.message ?? '')
    else if (r === 'erreur') this.app.ui?.message(`Le classeur n'a pas pu être enregistré dans « ${p.name} » : ${this.etat.message ?? 'erreur inconnue'}. Rien n'est perdu : il est dans ce navigateur.`)
    return r === 'ecrit'
  }

  /** Ctrl + S s'adresse à la clé : elle est active, c'est cet onglet qui
   *  écrit, et le fichier n'est pas en conflit (sinon : « Enregistrer une
   *  copie dans un fichier… ») */
  peutEnregistrer(): boolean {
    return this.actif && this.verrou !== 'autre' && this.etat.etat !== 'conflit'
  }

  /** « Arrêter l'enregistrement automatique » : le fichier reste, tel qu'il
   *  était à sa dernière écriture */
  async arreter(): Promise<void> {
    const nom = this.poignee?.name
    try {
      await this.registre.oublierPoignee(this.id)
      await this.registre.modifierClasseur(this.id, x => { delete x.cle })
    } catch {
      this.app.ui?.message('L\'enregistrement automatique n\'a pas pu être arrêté : la bibliothèque des classeurs refuse d\'écrire.')
      return
    }
    this.arreterIci()
    this.app.ui?.message(nom ? `Le classeur ne s'enregistre plus dans « ${nom} » : le fichier garde le classeur tel qu'il était à sa dernière écriture.` : 'L\'enregistrement automatique est arrêté.')
  }

  /** Plus d'enregistrement automatique ici (arrêté ici ou dans un autre onglet) */
  private arreterIci() {
    this.poignee = null
    this.derniere = null
    this.chemin = null
    this.enMemoireSeulement = false
    clearTimeout(this.minuterie); this.minuterie = 0
    this.lacherLeVerrou()
    this.maj({ etat: 'absente' })
  }

  /** Les autres onglets ont changé la fiche : la clé activée, arrêtée, ou
   *  un autre fichier choisi */
  private async relire() {
    if (this.suspendu) return
    const f = await this.registre.classeur(this.id).catch(() => undefined)
    if (!f) return
    if (!f.cle) { if (this.poignee) this.arreterIci(); return }
    const p = await this.registre.poignee<PoigneeFichier>(this.id).catch(() => undefined)
    if (!p) return
    const nouveau = !this.poignee || (!this.enMemoireSeulement && !await memeFichier(p, this.poignee))
    if (!nouveau) {
      if (this.verrou === 'autre') this.maj({ etat: 'autre-onglet', nom: p.name })
      return
    }
    this.poignee = p
    this.enMemoireSeulement = false
    this.derniere = null
    await this.demarrerActif(f.cle)
  }

  /** Le classeur est remplacé ou supprimé (ici ou ailleurs) : plus rien ne
   *  s'écrit sur la clé depuis cet onglet */
  suspendre() {
    if (this.suspendu) return
    this.suspendu = true
    clearTimeout(this.minuterie); this.minuterie = 0
    clearTimeout(this.minuterieAnnonce); this.minuterieAnnonce = 0
    this.lacherLeVerrou()
    this.majQuitter()
  }

  /** Avant de changer de classeur (C5) : ce qui reste à écrire part tout de
   *  suite, sans attendre le calme ; on attend au plus 10 s */
  async vider(max = VIDER_MAX): Promise<void> {
    if (this.premierNonEcrit !== null && this.peutEcrireSeul()) {
      clearTimeout(this.minuterie); this.minuterie = 0
      await Promise.race([this.ecrire({}), attendre(max)])
    } else await Promise.race([this.fileEcriture, attendre(max)])
  }

  // ---------- L'ouverture d'un fichier (sauvegarde.ts) ----------
  /** La case « Enregistrer automatiquement les changements dans ce fichier »
   *  de la fenêtre « Ouvrir ce classeur ? » peut-elle être offerte ? Pas si
   *  ce fichier sert déjà à un autre classeur, ni si le classeur qu'il
   *  emporte en est un autre de la bibliothèque (son id pris : le classeur
   *  ouvert ne prendrait pas son identité, et le fichier serait en conflit). */
  async offrirPourOuverture(h: PoigneeFichier, entete: EnteteTableau): Promise<boolean> {
    if (!this.disponible || this.suspendu) return false
    if (entete.id && entete.id !== this.id && await this.registre.classeur(entete.id).catch(() => undefined)) return false
    for (const a of await this.registre.poignees().catch(() => [])) {
      if (a.id !== this.id && await memeFichier(h, a.poignee)) return false
    }
    return true
  }
}

// ---------- Un classeur qu'on crée (la bibliothèque, lot 4 C5) ----------
/** Le fichier choisi pour un classeur qu'on crée, avec la case « Enregistrer
 *  automatiquement sur la clé » de « Nouveau classeur » : ni celui d'un
 *  autre classeur de la bibliothèque (isSameEntry), ni un fichier qui a déjà
 *  quelque chose (le classeur est neuf : rien de ce que le fichier contient
 *  n'est à lui, on l'écraserait). Rend la raison du refus, ou null. */
export async function examinerPourUnNeuf(registre: Registre, h: PoigneeFichier): Promise<string | null> {
  for (const a of await registre.poignees().catch(() => [])) {
    if (!await memeFichier(h, a.poignee)) continue
    const f = await registre.classeur(a.id).catch(() => undefined)
    return dejaPris(f?.nom ?? 'un autre classeur')
  }
  const f = await h.getFile()
  if (f.size === 0) return null
  const e = await enteteDe(f)
  if (!e) return PAS_UN_CLASSEUR
  return autreClasseur(e.nom)
}

/** La première écriture d'un classeur qu'on crée, AVANT de partir vers lui
 *  (le choix du fichier vient de donner l'accord d'y écrire, que Chrome
 *  oubliera en changeant de page) : le travailleur fabrique le fichier
 *  depuis sa base neuve (sur le fil principal en repli : une page, c'est un
 *  instant), il s'écrit d'un bloc ; puis la poignée est gardée et la fiche
 *  note l'écriture (comme une écriture de la clé : le garde-fou de l'en-tête
 *  et de l'histoire passe à l'arrivée). Rend la date écrite (null : rien
 *  d'écrit), si la poignée est gardée (non : DataCloneError, le fichier sera
 *  à choisir de nouveau à l'arrivée), ce qu'il faut dire, et ce que
 *  l'arrivée dira de la clé (cle : voir EnregistrementCle.direALArrivee ; jamais
 *  « Il s'enregistre automatiquement » d'avance). Une écriture qui échoue
 *  garde quand même la poignée : l'enregistrement automatique la refera à
 *  l'arrivée. */
export async function ecrireLeNeuf(registre: Registre, h: PoigneeFichier, c: { id: string; base: string; nom: string; chemin?: string[] }): Promise<{ date: number | null; garde: boolean; message: string; cle?: CleALArrivee }> {
  const date = Date.now()
  // chemin : les dossiers où l'outil a rangé le fichier lui-même (la fiche le garde)
  const chemin = c.chemin ? { chemin: c.chemin } : {}
  let cle: CleFiche = { nom: h.name, ...chemin }
  let ecrite: number | null = null
  let echec: string | null = null
  try {
    const fab = await fabriquerFichier(c.base, { nom: c.nom, id: c.id }, date)
    await ecrireDans(h, fab.fichier)
    cle = { nom: h.name, t: Date.now(), date, taille: fab.fichier.size, vecteur: fab.vecteur, ...chemin }
    ecrite = date
  } catch (e) {
    const r = raisonCle(e)
    echec = r.genre === 'permission' ? 'le navigateur n\'a pas permis d\'écrire dans ce fichier' : r.message
  }
  let garde = true
  try { await registre.garderPoignee(c.id, h) } catch (e) {
    garde = false
    if ((e as { name?: string } | null)?.name !== 'DataCloneError') {
      return { date: ecrite, garde, message: `L'enregistrement automatique n'a pas pu être activé : ${raisonCle(e).genre === 'permission' ? 'le navigateur ne l\'a pas permis' : (raisonCle(e) as { message: string }).message}.` }
    }
  }
  await registre.modifierClasseur(c.id, x => { x.cle = cle }).catch(() => { /* l'activation se refera de la bibliothèque */ })
  if (echec) return { date: ecrite, garde, message: `La première écriture dans « ${h.name} » a échoué (${sansPointFinal(echec)}).`, ...(garde ? { cle: { nom: h.name, ok: 'Elle sera réessayée.' } } : {}) }
  return { date: ecrite, garde, message: '', ...(garde ? { cle: { nom: h.name } } : {}) }
}

const sansPointFinal = (m: string) => m.trim().replace(/[.\s]+$/, '')

/** L'accord, dans le geste (le clic sur « Remplacer » de la fenêtre
 *  « Ouvrir ce classeur ? »), pour écrire dans le fichier ouvert */
export async function accordPour(h: PoigneeFichier): Promise<boolean> {
  return await permission(h, true) === 'granted'
}

/** Une question de l'outil (pas de confirm(), que le navigateur bloque dans
 *  une page intégrée) : vrai si l'on confirme */
export function confirmer(titre: string, texte: string, oui: string): Promise<boolean> {
  return new Promise(fini => {
    const d = document.createElement('dialog')
    d.className = 'dialogue dialogue-ouvrir'
    d.innerHTML = `<h2></h2><div class="corps"><p></p><div class="actions">
      <button type="button" class="secondaire" data-a="annuler">Annuler</button>
      <button type="button" class="principal danger-plein" data-a="oui"></button></div></div>`
    d.querySelector('h2')!.textContent = titre
    d.querySelector('p')!.textContent = texte
    const bOui = d.querySelector<HTMLButtonElement>('[data-a="oui"]')!
    bOui.textContent = oui
    let reponse = false
    const fermer = (r: boolean) => { reponse = r; if (d.open) d.close() }
    d.addEventListener('close', () => { d.remove(); fini(reponse) })
    fermerSurLeFond(d, () => fermer(false))
    d.querySelector('[data-a="annuler"]')!.addEventListener('click', () => fermer(false))
    bOui.addEventListener('click', () => fermer(true))
    document.body.appendChild(d)
    d.showModal()
    d.querySelector<HTMLButtonElement>('[data-a="annuler"]')!.focus()
  })
}
