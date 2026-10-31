// =============================================================
// MES EMPLACEMENTS : LES DOSSIERS DE NIVEAU RELIÉS (lot 7)
// Un dossier de niveau de la bibliothèque peut être RELIÉ à un vrai
// dossier, où chacun de ses classeurs (un chapitre) a son fichier .memc,
// tenu à jour tout seul (choix 1B du professeur) :
// - sur l'ordinateur (Chrome, Edge : showDirectoryPicker) : le dossier
//   choisi (la clé USB, G:\Mon Drive…) ; chaque classeur du niveau y
//   prend son fichier comme fichier de la clé (cle.ts), qui l'écrit peu
//   après chaque changement quand il est ouvert ;
// - sur le Drive (version en ligne) : le sous-dossier du niveau dans
//   « MEM - Classeurs » (choix 2A), où va la copie sur le Drive de ses
//   classeurs (copie-drive.ts, publication/drive.ts) au lieu du dossier
//   des sauvegardes.
// La liste vit dans l'index de la bibliothèque (le réglage 'emplacements',
// une clé nouvelle : aucune clé existante ne change) ; le dossier de
// l'ordinateur (sa poignée) dans le réglage 'emplacement-poignee:<id>', à
// part des fichiers de la clé (le magasin 'poignees' ne garde que ceux des
// classeurs). Un niveau peut avoir un emplacement de chaque sorte ; ses
// sous-dossiers suivent le niveau.
// Lot 18 (etablissements.ts) : un emplacement 'ordinateur' créé par la fenêtre
// « Où ranger… » porte en plus l'id de son ÉTABLISSEMENT (le dossier choisi
// une fois, dans lequel le dossier du niveau a été créé) : `etablissement`,
// facultatif, que lireEmplacements conserve (les autres champs inconnus sont
// toujours laissés de côté). Un emplacement sans ce champ est celui du lot 7
// (« Un autre dossier, pour ce niveau seul… ») : rien ne change pour lui.
//
// Le début de ce fichier est pur (sans IndexedDB) : il se teste sous Node.
// =============================================================
import type { CompteDrive, FicheClasseur, FicheDossier } from './demarrage'
import { visible } from './demarrage'
import { nomSur } from '../fichier'
import { descendants, remontee } from './arbre'
import type { Registre } from './registre'

export type GenreEmplacement = 'ordinateur' | 'drive'

/** Un emplacement : un dossier de niveau de la bibliothèque relié à un
 *  dossier de l'ordinateur ou du Drive */
export interface Emplacement {
  id: string
  genre: GenreEmplacement
  /** Le dossier de la bibliothèque relié (le niveau) */
  dossier: string
  /** Le nom du dossier relié : celui choisi sur l'ordinateur ; sur le
   *  Drive, celui du sous-dossier du niveau */
  nom: string
  /** Le Drive (seulement pour le Drive) */
  compte?: CompteDrive
  /** L'établissement (etablissements.ts) dans le dossier duquel le dossier
   *  du niveau a été créé par la fenêtre « Où ranger… » (lot 18) ; absent :
   *  un dossier choisi pour ce niveau seul (lot 7) */
  etablissement?: string
  /** Son nom au moment du rangement : il reste à l'écran et dans le chemin
   *  des fichiers même si l'établissement est retiré de la liste (lot 18) */
  etablissementNom?: string
  cree: number
}

/** La liste dans l'index de la bibliothèque */
export const REGLAGE_EMPLACEMENTS = 'emplacements'
/** La poignée du dossier de l'ordinateur d'un emplacement */
export const reglagePoignee = (id: string) => 'emplacement-poignee:' + id

const ID = /^[0-9a-f]{16}$/

/** La liste relue de l'index : seulement ce qui est bien formé */
export function lireEmplacements(x: unknown): Emplacement[] {
  if (!Array.isArray(x)) return []
  const l: Emplacement[] = []
  for (const e of x as Partial<Emplacement>[]) {
    if (!e || typeof e !== 'object' || typeof e.id !== 'string' || !ID.test(e.id)) continue
    if (e.genre !== 'ordinateur' && e.genre !== 'drive') continue
    if (typeof e.dossier !== 'string' || !e.dossier || typeof e.nom !== 'string') continue
    if (e.genre === 'drive' && e.compte !== 'mem' && e.compte !== 'lfb') continue
    if (l.some(y => y.id === e.id)) continue
    l.push({
      id: e.id, genre: e.genre, dossier: e.dossier, nom: e.nom, cree: typeof e.cree === 'number' ? e.cree : 0,
      ...(e.genre === 'drive' ? { compte: e.compte } : {}),
      ...(typeof e.etablissement === 'string' && e.etablissement ? { etablissement: e.etablissement } : {}),
      ...(typeof e.etablissement === 'string' && e.etablissement && typeof e.etablissementNom === 'string' && e.etablissementNom ? { etablissementNom: e.etablissementNom } : {}),
    })
  }
  return l
}

/** L'emplacement de cette sorte qui vaut pour un classeur rangé dans
 *  `dossierId` : celui de son dossier, sinon du plus proche dossier parent
 *  relié (un sous-dossier suit son niveau) ; null : aucun. Un dossier dans la
 *  corbeille ne relie plus rien. */
export function emplacementDe(dossierId: string | null, genre: GenreEmplacement, liste: readonly Emplacement[], dossiers: ReadonlyMap<string, FicheDossier> | readonly FicheDossier[]): Emplacement | null {
  const chaine = remontee(dossierId, dossiers)
  if (chaine.some(d => d.corbeille != null)) return null
  for (const d of chaine) {
    const e = liste.find(x => x.genre === genre && x.dossier === d.id)
    if (e) return e
  }
  return null
}

/** Les classeurs visibles d'un niveau : ceux de son dossier et de ses
 *  sous-dossiers, par nom */
export function classeursDeLaClasse(dossierId: string, fiches: readonly FicheClasseur[], dossiers: readonly FicheDossier[]): FicheClasseur[] {
  const dedans = new Set([dossierId, ...descendants(dossierId, dossiers).map(d => d.id)])
  return fiches.filter(f => f.dossier !== null && dedans.has(f.dossier) && visible(f, dossiers))
    .sort((a, b) => a.nom.localeCompare(b.nom, 'fr', { numeric: true }) || (a.id < b.id ? -1 : 1))
}

/** Les noms, sur l'ordinateur, des sous-dossiers entre le niveau et le dossier
 *  d'un classeur (vide : il est dans le niveau lui-même). Un dossier prend le
 *  même nom que dans la bibliothèque, sauf s'il a son propre chemin (pc : un
 *  autre nom, plusieurs noms, ou aucun) : les deux arbres sont indépendants. */
export function sousDossiers(dossierId: string | null, classe: string, dossiers: readonly FicheDossier[]): string[] {
  const chaine = remontee(dossierId, dossiers)
  const i = chaine.findIndex(d => d.id === classe)
  return i < 0 ? [] : chaine.slice(0, i).reverse().flatMap(d => d.pc ?? [d.nom])
}

/** Le chemin que le professeur tape pour un dossier (« Auguste », ou
 *  « Axiom/Auguste », ou rien) en noms de dossiers sains */
export function cheminPcSaisi(texte: string): string[] {
  return texte.split(/[\\/›]/).map(x => nomSur(x, { repli: '' })).filter(x => x)
}

/** Un nom de fichier libre parmi ceux d'un dossier : « Fractions.memc »,
 *  sinon « Fractions (2).memc »… (sans tenir compte des majuscules, comme
 *  Windows) */
export function nomDeFichierLibre(base: string, extension: string, pris: Iterable<string>): string {
  const deja = new Set([...pris].map(n => n.toLocaleLowerCase('fr')))
  let nom = base + extension
  for (let n = 2; deja.has(nom.toLocaleLowerCase('fr')) && n < 1000; n++) nom = `${base} (${n})${extension}`
  return nom
}

// ---------- L'index de la bibliothèque ----------

/** Les emplacements de cette bibliothèque */
export async function emplacements(registre: Registre): Promise<Emplacement[]> {
  return lireEmplacements(await registre.reglage(REGLAGE_EMPLACEMENTS).catch(() => undefined))
}

/** Ajoute (ou remplace : le même niveau, la même sorte) un emplacement */
export async function garderEmplacement(registre: Registre, e: Emplacement): Promise<void> {
  const tous = await emplacements(registre)
  const remplaces = tous.filter(x => x.dossier === e.dossier && x.genre === e.genre && x.id !== e.id)
  await registre.ecrireReglage(REGLAGE_EMPLACEMENTS, [...tous.filter(x => !(x.dossier === e.dossier && x.genre === e.genre)), e])
  for (const x of remplaces) if (x.genre === 'ordinateur') await registre.ecrireReglage(reglagePoignee(x.id), undefined).catch(() => {})
}

/** Retire un emplacement de la liste : ni le dossier relié ni ses fichiers
 *  ne sont touchés ; les classeurs gardent leur fichier de la clé */
export async function retirerEmplacement(registre: Registre, id: string): Promise<void> {
  const l = (await emplacements(registre)).filter(x => x.id !== id)
  await registre.ecrireReglage(REGLAGE_EMPLACEMENTS, l)
  await registre.ecrireReglage(reglagePoignee(id), undefined).catch(() => {})
}

/** Où l'outil a rangé ce fichier, d'après le chemin noté dans la fiche
 *  (fiche.cle.chemin) : 'ici', dans le dossier relié (prefixe : ses noms,
 *  depuis l'établissement) ; 'ailleurs', dans le dossier d'un autre niveau
 *  (au moins le niveau et le chapitre : « LFB classeurs › 5 › Probas ») ;
 *  'main', un dossier que le professeur a choisi lui-même pour ce classeur
 *  (« Un autre dossier de l'ordinateur… » : le dossier seul), qui reste le
 *  sien ; 'inconnu' : pas de chemin (un fichier choisi à la main, ou rangé
 *  avant le lot 18). */
export function rangeParLOutil(chemin: readonly string[] | undefined, prefixe: readonly string[]): 'ici' | 'ailleurs' | 'main' | 'inconnu' {
  if (!chemin?.length) return 'inconnu'
  if (chemin.length > prefixe.length && prefixe.every((n, i) => chemin[i] === n)) return 'ici'
  return chemin.length >= 2 ? 'ailleurs' : 'main'
}
