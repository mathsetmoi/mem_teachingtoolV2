// =============================================================
// LE LIEU D'UN CLASSEUR (lot 4 de l'audit, « solidité », partie 3)
// Une seule réponse à « où est enregistré ce classeur, et où faut-il
// l'écrire ? ». Avant, sept fichiers la recalculaient chacun à leur façon
// (cle.ts, ranger.ts, ordinateur.ts, ailleurs.ts, deplacer-fichier.ts,
// copie-drive.ts, etat.ts) et devaient tomber d'accord ; ils posent
// maintenant la question ici.
//
// Un classeur est toujours dans ce navigateur. Il peut avoir en plus :
// - un dossier où il DOIT aller sur l'ordinateur : celui de son niveau
//   s'il est relié (emplacements.ts, lot 7 ; chez un établissement, lot 18),
//   puis les sous-dossiers, puis le dossier du chapitre (sauf un lien « à
//   plat », 2026-11) : lieuSurLOrdinateur ;
// - un fichier où il EST écrit (fiche.cle : son nom, et le chemin noté
//   quand l'outil l'a rangé lui-même) : fichierDuClasseur ;
// - un dossier du Drive où va sa copie : celui de son niveau s'il est relié
//   à ce Drive (lot 7), sinon le dossier des sauvegardes : lieuSurLeDrive.
//
// Tout se lit dans ce qui est déjà rangé (l'index de la bibliothèque, la
// fiche du classeur) : rien de nouveau n'est écrit, aucune clé ne change.
// Ce fichier est pur (sans IndexedDB ni poignée) : il se teste sous Node.
// =============================================================
import type { CompteDrive, FicheClasseur, FicheDossier } from './demarrage'
import type { Emplacement } from './emplacements'
import { emplacementDe, rangeParLOutil, sousDossiers } from './emplacements'
import type { Etablissement } from './etablissements'
import { cheminLisible, nomDEtablissement } from './etablissements'
import { nomSur } from '../fichier'

/** Ce que le lieu lit de l'index de la bibliothèque */
export interface DonneesLieu {
  emplacements: readonly Emplacement[]
  dossiers: readonly FicheDossier[]
  /** La liste des établissements (lot 18) ; absente : on se contente du nom
   *  gardé dans l'emplacement */
  etablissements?: readonly Etablissement[]
}

/** Le dossier de son niveau sur l'ordinateur, pour un classeur rangé dans
 *  un dossier de la bibliothèque (le chapitre n'y est pas encore) */
export interface NiveauSurLOrdinateur {
  /** L'emplacement 'ordinateur' de son niveau (ou du plus proche parent relié) */
  emplacement: Emplacement
  /** Son établissement, s'il est encore dans la liste */
  etablissement: Etablissement | null
  /** Les dossiers au-dessus des sous-dossiers : l'établissement (son nom
   *  actuel, sinon celui gardé au rangement), puis le dossier du niveau */
  prefixe: string[]
  /** Les sous-dossiers entre le niveau et le classeur, tels que nommés
   *  (sousDossiers : le nom de la bibliothèque, ou son propre chemin) */
  sous: string[]
}

/** Où va, sur l'ordinateur, le fichier d'un classeur */
export interface LieuOrdinateur extends NiveauSurLOrdinateur {
  /** Les dossiers à ouvrir sous celui du niveau : les sous-dossiers en noms
   *  sains, puis le dossier du chapitre (sauf à plat) */
  dossiers: string[]
  /** Le chemin entier : prefixe, puis dossiers. C'est celui que la fiche
   *  note (fiche.cle.chemin) quand l'outil y écrit le fichier. */
  chemin: string[]
}

/** Le dossier du niveau d'un classeur rangé dans `dossierId` ; null : son
 *  niveau n'est pas relié à un dossier de l'ordinateur (ou il est à la
 *  racine, ou dans la corbeille). racine : le nom du dossier du niveau tel
 *  que la poignée le donne, quand on l'a (il remplace le nom gardé dans
 *  l'emplacement). */
export function niveauSurLOrdinateur(dossierId: string | null, d: DonneesLieu, o: { racine?: string } = {}): NiveauSurLOrdinateur | null {
  if (dossierId === null) return null
  const e = emplacementDe(dossierId, 'ordinateur', d.emplacements, d.dossiers)
  if (!e) return null
  const liste = d.etablissements ?? []
  const etablissement = e.etablissement ? liste.find(x => x.id === e.etablissement) ?? null : null
  const nomEtab = nomDEtablissement(e, liste)
  return { emplacement: e, etablissement, prefixe: [...(nomEtab ? [nomEtab] : []), o.racine ?? e.nom], sous: sousDossiers(dossierId, e.dossier, d.dossiers) }
}

/** Les dossiers à ouvrir sous celui du niveau pour un classeur nommé `nom` :
 *  les sous-dossiers en noms sains, puis le dossier du chapitre (sauf à
 *  plat, où le fichier est directement dans le dossier) */
export const dossiersDuChapitre = (n: { sous: readonly string[]; emplacement: Pick<Emplacement, 'aPlat'> }, nom: string): string[] =>
  [...n.sous.map(x => nomSur(x, { repli: 'Dossier' })), ...(n.emplacement.aPlat ? [] : [nomSur(nom)])]

/** Le lieu sur l'ordinateur d'un classeur nommé `nom` rangé dans
 *  `dossierId` (voir niveauSurLOrdinateur) ; null : pas de lieu */
export function lieuSurLOrdinateur(dossierId: string | null, nom: string, d: DonneesLieu, o: { racine?: string } = {}): LieuOrdinateur | null {
  const n = niveauSurLOrdinateur(dossierId, d, o)
  return n ? avecLeChapitre(n, nom) : null
}

/** Le lieu d'un classeur nommé `nom` dans ce niveau */
export function avecLeChapitre(n: NiveauSurLOrdinateur, nom: string): LieuOrdinateur {
  const dossiers = dossiersDuChapitre(n, nom)
  return { ...n, dossiers, chemin: [...n.prefixe, ...dossiers] }
}

/** Le dossier qui recevra celui du chapitre (« LFB classeurs › 2 ») : le
 *  préfixe et les sous-dossiers, sans le chapitre */
export const dossierDuNiveau = (l: NiveauSurLOrdinateur): string[] => [...l.prefixe, ...l.sous.map(n => nomSur(n, { repli: 'Dossier' }))]

/** Le chemin pour l'écran : « LFB classeurs › 2nde › Fractions » */
export const cheminALEcran = (l: LieuOrdinateur): string => cheminLisible(l.chemin)

/** Le fichier où le classeur est écrit (sa clé), et qui l'a choisi */
export interface FichierDuClasseur {
  /** Le nom du fichier (« Fractions.memc ») */
  nom: string
  /** Les dossiers où l'outil l'a rangé lui-même ; null : choisi à la main,
   *  ou rangé avant le lot 18 */
  chemin: readonly string[] | null
  /** Par rapport au lieu de son niveau (rangeParLOutil) : 'ici' (dans le
   *  dossier relié), 'ailleurs' (le dossier d'un autre niveau), 'main' (un
   *  dossier choisi par le professeur pour ce classeur), 'inconnu' (pas de
   *  chemin) */
  rangement: 'ici' | 'ailleurs' | 'main' | 'inconnu'
}

/** Le fichier d'un classeur, d'après sa fiche ; null : il n'en a pas.
 *  prefixe : les dossiers du niveau (LieuOrdinateur.prefixe), vide si le
 *  niveau n'est pas relié. */
export function fichierDuClasseur(f: Pick<FicheClasseur, 'cle'>, prefixe: readonly string[] = []): FichierDuClasseur | null {
  if (!f.cle) return null
  const chemin = f.cle.chemin?.length ? f.cle.chemin : null
  return { nom: f.cle.nom, chemin, rangement: rangeParLOutil(f.cle.chemin, prefixe) }
}

/** Où va, sur le Drive, la copie d'un classeur rangé dans `dossierId` : le
 *  niveau relié à ce Drive (son dossier dans « MEM - Classeurs ») ; null : le
 *  dossier des sauvegardes */
export function lieuSurLeDrive(dossierId: string | null, compte: CompteDrive, d: Pick<DonneesLieu, 'emplacements' | 'dossiers'>): { emplacement: Emplacement; niveau: FicheDossier } | null {
  const e = emplacementDe(dossierId, 'drive', d.emplacements, d.dossiers)
  if (!e || e.compte !== compte) return null
  const niveau = d.dossiers.find(x => x.id === e.dossier)
  return niveau ? { emplacement: e, niveau } : null
}

/** Tout le lieu d'un classeur, d'un coup : toujours ce navigateur ; le
 *  dossier où il doit aller sur l'ordinateur ; le fichier où il est écrit */
export interface Lieu { ordinateur: LieuOrdinateur | null; fichier: FichierDuClasseur | null }
export function lieuDe(f: Pick<FicheClasseur, 'dossier' | 'nom' | 'cle'>, d: DonneesLieu): Lieu {
  const ordinateur = lieuSurLOrdinateur(f.dossier, f.nom, d)
  return { ordinateur, fichier: fichierDuClasseur(f, ordinateur?.prefixe ?? []) }
}
