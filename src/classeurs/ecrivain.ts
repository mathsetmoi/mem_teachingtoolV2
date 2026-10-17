// =============================================================
// L'ÉCRIVAIN : LE FICHIER D'UN CLASSEUR, HORS DU FIL PRINCIPAL
// Un seul travailleur pour toute la page, des demandes numérotées (voir
// ecrivain-taches.ts) ; il démarre à la première demande et dit qu'il est
// prêt. Le travailleur est intégré à la page (?worker&inline) : il marche
// aussi dans la version hors ligne (file://).
//
// Si Worker manque, ou si le travailleur ne démarre pas (il ne dit pas
// qu'il est prêt dans les 10 s, ou tombe avant), le même code tourne sur le
// fil principal, et le mode le note (ecrivain.mode = 'fil') : la page peut
// alors geler le temps de fabriquer le fichier. Ctrl + S s'en sert quand
// même ; les écritures automatiques (la clé, le Drive) demandent le
// travailleur seul (travailleurSeul) : sans lui, elles n'écrivent rien
// (raison 'fil'), et l'état de la sauvegarde le dit. Un travailleur qui
// tombe après avoir démarré fait échouer les demandes en cours ('autre') et
// renaît à la suivante ; une demande qui dure plus de 2 minutes échoue aussi.
// Ouvrir un fichier le lit aussi ici ('lire') : il ne gèle plus la page.
// « Dupliquer le classeur » s'y fait aussi ('copier', lot 4 C7) : lire la
// base, fusionner, vérifier, rejouer et écrire la copie, sans tâche longue.
// La bibliothèque y examine les bases sans fiche ('examiner', lot 4 C8) :
// ce qu'elles contiennent, pour savoir si on les adopte. Ouvrir un fichier
// plus récent y met à jour un classeur sans rien perdre ('mettre-a-jour',
// lot 4 C9), et les classeurs d'une bibliothèque (.memb) y sont lus avec
// leur somme (lireFichier, crc).
// =============================================================
import Travailleur from './ecrivain.worker.ts?worker&inline'
import type { Demande, RaisonEcrivain, Reponse } from './ecrivain-taches'
import { executer } from './ecrivain-taches'
import type { EnteteTableau } from '../fichier'
import type { ExamenBase } from './ecrivain-pur'
import type { InfosBase } from './bases'
import type { ComparaisonVecteurs } from './vecteurs'

export type { RaisonEcrivain } from './ecrivain-taches'

/** Une demande que l'écrivain n'a pas pu faire, et pourquoi ; creee : la
 *  base qu'elle devait créer l'a été, vide (à effacer par qui l'a demandée,
 *  comme ErreurBase.creee : voir Registre.creerClasseur) */
export class ErreurEcrivain extends Error {
  constructor(readonly raison: RaisonEcrivain, message: string, readonly creee = false) {
    super(message)
    this.name = 'ErreurEcrivain'
  }
}

/** Une copie faite (« Dupliquer le classeur ») : ses pages, le nombre de
 *  séances publiées retirées de son registre, son vecteur d'état */
export interface CopieFaite { pages: number; publications: number; vecteur: Uint8Array }

/** Le fichier d'un classeur, tel que l'écrivain le rend ; incomplet : ce
 *  qui se relit d'une base trouée (voir fabriquerFichier, lisible) */
export interface FichierFabrique { fichier: Blob; pages: number; vecteur: Uint8Array; crc: number; incomplet?: boolean }
/** Un fichier lu et vérifié : son en-tête, son état (prêt pour
 *  Tableau.remplacerPar), ses pages, son vecteur d'état */
export interface FichierLu { entete: EnteteTableau; etat: Uint8Array; pages: number; vecteur: Uint8Array }
/** travailleurSeul : jamais sur le fil principal (les écritures
 *  automatiques, qui ne doivent jamais geler l'écriture au stylet) */
export interface OptionsDemande { travailleurSeul?: boolean }
/** lisible : une base trouée relue (des changements y attendent une mise à
 *  jour qui manque) donne quand même le fichier de ce qui s'en relit, avec
 *  incomplet (à dire) ; sans lui, elle est 'abimee' */
export interface OptionsFichier extends OptionsDemande { lisible?: boolean }

/** Le travailleur a ce temps pour dire qu'il est prêt */
const DEMARRAGE_MAX = 10_000
/** Une demande a ce temps pour aboutir */
const DEMANDE_MAX = 120_000

type SansNumero = Demande extends infer D ? D extends { n: number } ? Omit<D, 'n'> : never : never
interface EnAttente { demande: Demande; ok: (r: Reponse) => void; minuterie: ReturnType<typeof setTimeout>; travailleurSeul: boolean }
const SANS_TRAVAILLEUR = 'Ce navigateur ne permet pas de faire ce travail en arrière-plan.'

class Ecrivain {
  /** 'travailleur' : hors du fil principal ; 'fil' : sur le fil principal
   *  (Worker manque, ou le travailleur n'a pas démarré) */
  mode: 'travailleur' | 'fil' = 'travailleur'
  private w: Worker | null = null
  private pret = false
  private demarrage: ReturnType<typeof setTimeout> | null = null
  private n = 0
  private attente = new Map<number, EnAttente>()

  /** Une demande, faite par le travailleur ou, en repli, sur le fil (sauf
   *  travailleurSeul : la réponse est alors l'erreur 'fil') */
  demander(d: SansNumero, o: OptionsDemande = {}): Promise<Reponse> {
    const demande = { ...d, n: ++this.n } as Demande
    const w = this.travailleur()
    if (!w) return o.travailleurSeul ? Promise.resolve({ n: demande.n, erreur: { raison: 'fil', message: SANS_TRAVAILLEUR } }) : executer(demande)
    return new Promise(ok => {
      const minuterie = setTimeout(() => this.finir(demande.n, { n: demande.n, erreur: { raison: 'autre', message: 'L\'écrivain n\'a pas répondu à temps.' } }, true), DEMANDE_MAX)
      this.attente.set(demande.n, { demande, ok, minuterie, travailleurSeul: !!o.travailleurSeul })
      // Avant qu'il soit prêt, le travailleur garde les messages : ils
      // partent dès qu'il a démarré
      try { w.postMessage(demande) } catch (e) { this.finir(demande.n, { n: demande.n, erreur: { raison: 'autre', message: (e as Error)?.message || 'envoi impossible' } }) }
    })
  }

  /** Le fichier .memc du classeur de cette base, depuis la base (lisible :
   *  voir OptionsFichier) */
  async fabriquerFichier(base: string, infos: { nom?: string; id?: string }, date = Date.now(), o: OptionsFichier = {}): Promise<FichierFabrique> {
    const entete = { date, nom: infos.nom, id: infos.id }
    const r = await this.demander(o.lisible ? { genre: 'fichier', base, entete, lisible: true } : { genre: 'fichier', base, entete }, o)
    if ('erreur' in r) throw new ErreurEcrivain(r.erreur.raison, r.erreur.message)
    if (!('fichier' in r)) throw new ErreurEcrivain('autre', 'Réponse inattendue de l\'écrivain.')
    const f: FichierFabrique = { fichier: r.fichier, pages: r.pages, vecteur: r.vecteur, crc: r.crc }
    if (r.incomplet) f.incomplet = true
    return f
  }

  /** Le vecteur d'état de cette base (ce qu'elle contient), lu sans la
   *  créer ; vide : elle n'a aucune mise à jour */
  async vecteurDeLaBase(base: string, o: OptionsDemande = {}): Promise<{ vecteur: Uint8Array; vide: boolean }> {
    const r = await this.demander({ genre: 'vecteur', base }, o)
    if ('erreur' in r) throw new ErreurEcrivain(r.erreur.raison, r.erreur.message)
    if (!('vide' in r)) throw new ErreurEcrivain('autre', 'Réponse inattendue de l\'écrivain.')
    return { vecteur: r.vecteur, vide: r.vide }
  }

  /** Un fichier .memc lu et vérifié en entier, hors du fil principal (sur
   *  le fil en repli, comme avant le lot 4). ErreurEcrivain 'illisible' :
   *  ce n'est pas un classeur qu'on sait ouvrir, et son message le dit. */
  async lireFichier(fichier: Blob, o: OptionsDemande & { crc?: number } = {}): Promise<FichierLu> {
    const r = await this.demander(o.crc === undefined ? { genre: 'lire', fichier } : { genre: 'lire', fichier, crc: o.crc }, o)
    if ('erreur' in r) throw new ErreurEcrivain(r.erreur.raison, r.erreur.message)
    if (!('entete' in r)) throw new ErreurEcrivain('autre', 'Réponse inattendue de l\'écrivain.')
    return { entete: r.entete, etat: r.etat, pages: r.pages, vecteur: r.vecteur }
  }

  /** Une copie complète du classeur de la base source, avec toute son
   *  histoire, dans une base cible neuve (son identité : infos), son
   *  registre des publications vidé (voir ecrivain-pur.preparerCopie). La
   *  source n'est que lue. Hors du fil principal (sur le fil en repli : un
   *  geste du professeur, comme Ctrl + S). ErreurEcrivain 'existante' : la
   *  cible existait, rien n'y est touché ; 'place' : plus de place (creee :
   *  la cible a été créée vide). */
  async copierClasseur(source: string, cible: string, infos: { id: string; nom: string }, o: OptionsDemande = {}): Promise<CopieFaite> {
    const r = await this.demander({ genre: 'copier', source, cible, infos }, o)
    if ('erreur' in r) throw new ErreurEcrivain(r.erreur.raison, r.erreur.message, !!r.erreur.creee)
    if (!('copie' in r)) throw new ErreurEcrivain('autre', 'Réponse inattendue de l\'écrivain.')
    return { pages: r.pages, publications: r.publications, vecteur: r.vecteur }
  }

  /** « Mettre à jour le classeur » depuis un fichier plus récent, sans rien
   *  perdre (voir ecrivain-taches.ts) : l'état du fichier est ajouté à la
   *  base si, dans la même transaction, elle est encore contenue dans le
   *  fichier ; sinon rien n'est écrit (misAJour faux, et la comparaison :
   *  'diverge' le plus souvent, un autre onglet a écrit entre-temps).
   *  ErreurEcrivain 'absente' : la base n'existe plus ; 'place' : plus de
   *  place (rien n'a changé). */
  async mettreAJour(base: string, etat: Uint8Array, vecteur: Uint8Array, o: OptionsDemande = {}): Promise<{ misAJour: boolean; comparaison: ComparaisonVecteurs; vecteur: Uint8Array }> {
    const r = await this.demander({ genre: 'mettre-a-jour', base, etat, vecteur }, o)
    if ('erreur' in r) throw new ErreurEcrivain(r.erreur.raison, r.erreur.message)
    if (!('misAJour' in r)) throw new ErreurEcrivain('autre', 'Réponse inattendue de l\'écrivain.')
    return { misAJour: r.misAJour, comparaison: r.comparaison, vecteur: r.vecteur }
  }

  /** La base d'un nouveau classeur, créée avec l'état d'un fichier lu (voir
   *  bases.creerBase : jamais sur une base qui existe), hors du fil
   *  principal. copie : c'est la copie d'un classeur qui reste ici (un id
   *  neuf) ; comme pour « Dupliquer », son registre des publications est
   *  vidé, et la réponse dit combien de séances publiées en sont parties,
   *  avec le vecteur d'état de la copie (sans copie : publications 0, et le
   *  vecteur est celui du fichier). ErreurEcrivain 'existante' : rien n'est
   *  touché ; 'place' : plus de place (creee : la base a été créée, vide). */
  async creerBase(cible: string, etat: Uint8Array, infos: InfosBase, o: OptionsDemande & { copie?: boolean } = {}): Promise<{ creee: true; publications: number; vecteur?: Uint8Array }> {
    const r = await this.demander(o.copie ? { genre: 'creer', cible, etat, infos, copie: true } : { genre: 'creer', cible, etat, infos }, o)
    if ('erreur' in r) throw new ErreurEcrivain(r.erreur.raison, r.erreur.message, !!r.erreur.creee)
    if (!('creee' in r)) throw new ErreurEcrivain('autre', 'Réponse inattendue de l\'écrivain.')
    return r.vecteur ? { creee: true, publications: r.publications ?? 0, vecteur: r.vecteur } : { creee: true, publications: r.publications ?? 0 }
  }

  /** La copie d'un classeur depuis l'état d'un fichier lu, sans rien écrire
   *  (« Remplacer » le classeur ouvert par le fichier d'un classeur qui
   *  reste ici, voir sauvegarde.ts) : l'état, puis la petite mise à jour qui
   *  vide le registre des publications et marque la copie de son id (voir
   *  ecrivain-pur.preparerCopie), combien de séances publiées en sont
   *  parties, et le vecteur d'état de la copie. Hors du fil principal (sur
   *  le fil en repli : un geste du professeur). ErreurEcrivain 'abimee' :
   *  l'état ne fait pas un classeur entier. */
  async preparerCopie(etat: Uint8Array, id: string, o: OptionsDemande = {}): Promise<{ etat: Uint8Array; vidage: Uint8Array; publications: number; vecteur: Uint8Array }> {
    const r = await this.demander({ genre: 'preparer-copie', etat, id }, o)
    if ('erreur' in r) throw new ErreurEcrivain(r.erreur.raison, r.erreur.message)
    if (!('preparee' in r)) throw new ErreurEcrivain('autre', 'Réponse inattendue de l\'écrivain.')
    return { etat: r.etat, vidage: r.vidage, publications: r.publications, vecteur: r.vecteur }
  }

  /** Ce que contient une base (sans la créer ni l'écrire) et l'identité
   *  rangée à côté (voir ecrivain-pur.examinerMisesAJour) ; ErreurEcrivain
   *  'absente' : elle n'existe pas (ou plus). Hors du fil principal ; sur le
   *  fil en repli, sauf travailleurSeul. */
  async examinerBase(base: string, o: OptionsDemande = {}): Promise<{ examen: ExamenBase; infos?: Partial<InfosBase> }> {
    const r = await this.demander({ genre: 'examiner', base }, o)
    if ('erreur' in r) throw new ErreurEcrivain(r.erreur.raison, r.erreur.message)
    if (!('examen' in r)) throw new ErreurEcrivain('autre', 'Réponse inattendue de l\'écrivain.')
    return r.infos ? { examen: r.examen, infos: r.infos } : { examen: r.examen }
  }

  private travailleur(): Worker | null {
    if (this.mode === 'fil') return null
    if (this.w) return this.w
    let w: Worker
    try {
      if (typeof Worker !== 'function') throw new Error('Worker manque')
      w = new Travailleur()
    } catch { this.mode = 'fil'; return null }
    this.w = w
    this.pret = false
    w.onmessage = (e: MessageEvent) => {
      const r = e.data as Reponse | { pret?: boolean }
      if ((r as { pret?: boolean }).pret) {
        this.pret = true
        if (this.demarrage) { clearTimeout(this.demarrage); this.demarrage = null }
        return
      }
      this.finir((r as Reponse).n, r as Reponse)
    }
    w.onerror = (e: ErrorEvent) => { e.preventDefault(); this.tomber() }
    w.onmessageerror = () => this.tomber()
    this.demarrage = setTimeout(() => { this.demarrage = null; if (!this.pret) this.tomber() }, DEMARRAGE_MAX)
    return w
  }

  /** Le travailleur est tombé. Avant d'avoir démarré : on passe sur le fil,
   *  et les demandes en cours s'y refont (sauf celles du travailleur seul,
   *  qui échouent : 'fil'). Après : elles échouent, et il renaîtra à la
   *  prochaine. */
  private tomber() {
    const avant = !this.pret
    try { this.w?.terminate() } catch { /* déjà fini */ }
    this.w = null
    this.pret = false
    if (this.demarrage) { clearTimeout(this.demarrage); this.demarrage = null }
    if (avant) this.mode = 'fil'
    for (const [n, a] of [...this.attente]) {
      clearTimeout(a.minuterie)
      this.attente.delete(n)
      if (avant && a.travailleurSeul) a.ok({ n, erreur: { raison: 'fil', message: SANS_TRAVAILLEUR } })
      else if (avant) void executer(a.demande).then(a.ok)
      else a.ok({ n, erreur: { raison: 'autre', message: 'L\'écrivain s\'est arrêté.' } })
    }
  }

  /** La réponse n arrive (ou son délai est passé : arreter, et le travailleur
   *  renaîtra à la prochaine demande) */
  private finir(n: number, r: Reponse, arreter = false) {
    const a = this.attente.get(n)
    if (!a) return
    clearTimeout(a.minuterie)
    this.attente.delete(n)
    a.ok(r)
    if (arreter && this.pret) this.tomber()
  }
}

/** L'écrivain de la page (un seul travailleur) */
export const ecrivain = new Ecrivain()

/** Le fichier .memc du classeur de cette base, fabriqué depuis la base,
 *  hors du fil principal (voir Ecrivain.fabriquerFichier) */
export const fabriquerFichier = (base: string, infos: { nom?: string; id?: string }, date?: number, o?: OptionsFichier) => ecrivain.fabriquerFichier(base, infos, date, o)
