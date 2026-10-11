// =============================================================
// LA COPIE SUR LE DRIVE : CE QUI SE DÉCIDE SANS RÉSEAU (lot 4 C10)
// Le compte où va la copie d'un classeur, le moment de la prochaine copie,
// ce qu'on dit d'un échec, les classeurs en retard : ce que copie-drive.ts
// applique. Ce fichier est pur (sans DOM, ni IndexedDB, ni réseau) : il se
// teste sous Node.
// =============================================================
import type { CompteDrive, FicheClasseur } from './demarrage'
import { estPremier } from './demarrage'
import { dateLisible } from '../fichier'
import { POUR_ENREGISTRER } from '../navigateur'

const MINUTE = 60_000
const MO = 1024 * 1024

/** Une copie part tant de temps après le dernier changement… */
export const APRES_DERNIER = 2 * MINUTE
/** … et au plus tard tant de temps après le premier changement pas copié */
export const AU_PLUS_TARD = 10 * MINUTE
/** Entre deux copies, au moins 10 minutes, 1 minute par Mo, et 20 fois la
 *  durée du dernier envoi (sur un réseau lent, un gros classeur ne prend
 *  pas toute la bande) */
export const INTERVALLE_MIN = 10 * MINUTE
export const PAR_MO = MINUTE
export const FOIS_LA_DUREE = 20
/** Après un échec : on réessaie après 1, 2, 5, puis toutes les 10 minutes */
export const REESSAIS = [MINUTE, 2 * MINUTE, 5 * MINUTE, 10 * MINUTE]
/** Une copie (envoi compris) a ce temps, plus tant par Mo, pour aboutir */
export const DELAI_ENVOI = 2 * MINUTE
export const DELAI_PAR_MO = 30_000
/** Le compte de la copie, au départ (avant tout choix) */
export const COMPTE_PAR_DEFAUT: CompteDrive = 'mem'
/** Le verrou des onglets (Web Locks) : une seule copie à la fois par classeur */
export const VERROU_DRIVE = 'mem-teachingtool-drive:'

export type ChoixDrive = CompteDrive | 'aucune'
const CHOIX: readonly ChoixDrive[] = ['mem', 'lfb', 'aucune']
export const choixValable = (c: unknown): c is ChoixDrive => CHOIX.includes(c as ChoixDrive)

/** Où va la copie de ce classeur : son choix, sinon celui de la
 *  bibliothèque (le réglage « copieDrive »), sinon le Drive personnel */
export function compteVoulu(f: Pick<FicheClasseur, 'copieDrive'>, defaut: unknown): ChoixDrive {
  if (choixValable(f.copieDrive)) return f.copieDrive
  return choixValable(defaut) ? defaut : COMPTE_PAR_DEFAUT
}

/** Le temps minimal entre deux copies, d'après la taille (octets) et la
 *  durée (ms) de la dernière */
export function intervalle(taille: number, duree: number): number {
  return Math.max(INTERVALLE_MIN, (Math.max(0, taille) / MO) * PAR_MO, FOIS_LA_DUREE * Math.max(0, duree))
}

/** Quand faire la prochaine copie (ms) : 2 minutes après le dernier
 *  changement, au plus tard 10 minutes après le premier pas copié ; pas
 *  avant l'intervalle depuis la dernière (finDerniere : 0, jamais) ; pas
 *  avant l'essai suivant un échec. null : rien à copier. */
export function prochaineCopie(o: {
  premierNonCopie: number | null; dernierChangement: number
  finDerniere: number; taille: number; duree: number; prochainEssai: number
}): number | null {
  if (o.premierNonCopie === null) return null
  const due = Math.min(o.dernierChangement + APRES_DERNIER, o.premierNonCopie + AU_PLUS_TARD)
  const apresLaDerniere = o.finDerniere > 0 ? o.finDerniere + intervalle(o.taille, o.duree) : 0
  return Math.max(due, apresLaDerniere, o.prochainEssai)
}

/** Le délai d'une copie d'un fichier de cette taille (au-delà, on abandonne
 *  et la suivante recommence) */
export const delaiDEnvoi = (taille: number) => DELAI_ENVOI + Math.ceil(Math.max(0, taille) / MO) * DELAI_PAR_MO

/** Le compte Google que la connexion de la copie propose à Google
 *  (login_hint), pour un seul clic sans la liste des comptes : le dernier
 *  connecté sur ce Drive depuis cet ordinateur (par la copie ou par Publier :
 *  c'est le même jeton ; un changement de compte voulu n'est pas défait),
 *  sinon celui de la dernière copie de ce classeur (la fiche le garde : un
 *  poste dont on a vidé les réglages le retrouve), sinon celui de Publier.
 *  '' : aucun, Google montre la liste. */
export function indiceGoogle(o: { retenu?: string; derniereCopie?: string; publier?: string }): string {
  return o.retenu || o.derniereCopie || o.publier || ''
}

/** La dernière copie est-elle sur un autre compte Google que celui qui est
 *  connecté ? (deux adresses connues et différentes ; la casse ne compte pas) */
export function copieAilleurs(derniere: string | undefined, connecte: string): boolean {
  return !!derniere && !!connecte && derniere.toLowerCase() !== connecte.toLowerCase()
}

/** Fermer l'onglet (ou le navigateur, ou recharger) pose-t-il la question
 *  du navigateur pour la copie du Drive ? Seulement pendant qu'une copie
 *  attend et qu'elle partirait d'elle-même (connecté, en ligne, ni conflit
 *  ni blocage, la base entière), quand rien d'autre ne protège ce
 *  classeur : ni la clé, qui s'écrit ici ou dans l'autre onglet (à jour, ou
 *  qui pose sa propre question : etat 'ok', 'en-cours', 'autre-onglet') ; et
 *  jamais quand on part en connaissance de cause (« Quitter sans
 *  enregistrer », le classeur remplacé) ni par la bibliothèque (les
 *  classeurs en retard se copient depuis le suivant). Sinon, la copie
 *  partait 2 minutes après le dernier trait : l'onglet fermé avant, le
 *  Drive ne l'avait pas, et sur un poste remis à zéro chaque soir, plus
 *  rien ne l'avait le lendemain (vérification du lot 4, sauvegardes, t9). */
export function questionDuDrive(o: { aCopier: boolean; partiraitSeule: boolean; departVoulu: boolean; cle: string | undefined }): boolean {
  if (!o.aCopier || !o.partiraitSeule || o.departVoulu) return false
  return o.cle !== 'ok' && o.cle !== 'en-cours' && o.cle !== 'autre-onglet'
}

/** Le travailleur manque (l'écrivain est passé sur le fil principal) : la
 *  copie ne se fait plus en arrière-plan */
export const MESSAGE_FIL = 'ce navigateur ne permet pas de faire la copie en arrière-plan'

/** Ce qu'on fait d'un échec : genre 'connexion' (se reconnecter : un clic),
 *  'hors-ligne' (au retour du réseau), 'erreur' (on le dit ; reessayer :
 *  plus tard, tout seul) */
export interface RaisonDrive { genre: 'connexion' | 'hors-ligne' | 'erreur'; message?: string; reessayer: boolean }

/** Un échec de la copie, dit au professeur (sans jamais dire que c'est
 *  copié). e : l'erreur (ErreurDrive a statut et raison ; fetch rejette
 *  TypeError quand le réseau ne répond pas ; AbortError : trop long ;
 *  ErreurEcrivain a sa raison) ; enLigneReseau : navigator.onLine. */
export function raisonDrive(e: unknown, enLigneReseau: boolean): RaisonDrive {
  const x = e as { name?: string; statut?: number; raison?: string; message?: string } | null
  if (x?.statut === 401) return { genre: 'connexion', reessayer: false }
  if (x?.name === 'ErreurEcrivain') {
    if (x.raison === 'fil') return { genre: 'erreur', reessayer: false, message: MESSAGE_FIL }
    if (x.raison === 'absente') return { genre: 'erreur', reessayer: false, message: `ce classeur n'a plus sa base dans ce navigateur : enregistrez-le (${POUR_ENREGISTRER})` }
    if (x.raison === 'abimee') return { genre: 'erreur', reessayer: false, message: `le classeur de ce navigateur semble abîmé : enregistrez-le (${POUR_ENREGISTRER})` }
    return { genre: 'erreur', reessayer: true, message: 'le fichier du classeur n\'a pas pu être préparé' }
  }
  if (x?.statut === 403 && x.raison === 'storageQuotaExceeded') return { genre: 'erreur', reessayer: true, message: 'le Drive est plein : libérez de la place dans Google Drive' }
  if (x?.statut === 403 && /insufficient|forbidden|appNotAuthorized/i.test(x.raison ?? '')) {
    return { genre: 'erreur', reessayer: false, message: 'Google refuse l\'accès à ce Drive (le compte ou l\'établissement ne l\'autorise pas)' }
  }
  if (x?.name === 'AbortError' || x?.name === 'TimeoutError') return { genre: 'erreur', reessayer: true, message: 'Google Drive met trop de temps à répondre (réseau lent ?)' }
  if (x?.name === 'TypeError' || /Failed to fetch|NetworkError|Load failed/i.test(x?.message ?? '')) {
    return enLigneReseau
      ? { genre: 'erreur', reessayer: true, message: 'Google Drive ne répond pas (le réseau filtre peut-être Google)' }
      : { genre: 'hors-ligne', reessayer: true }
  }
  const m = (x?.message ?? '').trim().replace(/\.$/, '')
  return { genre: 'erreur', reessayer: true, message: m ? `la copie a échoué (${m})` : 'la copie a échoué' }
}

/** L'attente avant le n-ième nouvel essai (n ≥ 1) */
export const reessai = (n: number) => REESSAIS[Math.min(Math.max(1, n), REESSAIS.length) - 1]

/** Les textes des deux garde-fous (le bandeau et la ligne du Drive) */
export const CONFLIT_HISTOIRE = 'Ce classeur a perdu une partie de son histoire depuis la dernière copie sur le Drive : elle n\'est pas remplacée.'
export const conflitOrigine = (t: number) =>
  `La copie du Drive a été mise à jour depuis un autre ordinateur${Number.isFinite(t) && t > 0 ? ` (${dateLisible(t)})` : ''} : elle n'est pas remplacée.`

/** Les classeurs en retard sur le Drive de `compte` : une copie y est
 *  voulue, il a changé depuis la dernière (sur ce compte : une copie sur
 *  l'autre Drive ne compte pas), il se montre (ni corbeille, ni création,
 *  ni effacement : `montre`), ce n'est pas celui de l'onglet (il a son
 *  rythme), ni un classeur déjà écarté dans cet onglet (un conflit, une
 *  erreur : son onglet le dira). Le plus récemment modifié d'abord. */
export function enRetard(fiches: readonly FicheClasseur[], o: { compte: CompteDrive; defaut: unknown; ici: string | null; ecartes: ReadonlySet<string>; montre: (f: FicheClasseur) => boolean }): FicheClasseur[] {
  return fiches.filter(f => {
    if (f.id === o.ici || o.ecartes.has(f.id) || !o.montre(f)) return false
    if (compteVoulu(f, o.defaut) !== o.compte) return false
    const t = f.drive?.compte === o.compte ? f.drive.t : 0
    // Le premier, repris d'avant et jamais ouvert depuis : ses dates sont à 0
    const modifie = f.modifie || (estPremier(f) && f.pages === null ? 1 : 0)
    return modifie > t
  }).sort((a, b) => (b.modifie - a.modifie) || (a.id < b.id ? -1 : 1))
}
