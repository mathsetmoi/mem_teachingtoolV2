// =============================================================
// LE CLASSEUR « SÉANCES ISOLÉES » DE CHAQUE NIVEAU (lot 17, un modèle pur)
// Une séance hors chapitre (une remédiation, un devoir corrigé, une séance
// de vacances) ne vit pas dans un faux chapitre : elle va dans le classeur
// « Séances isolées » du dossier de niveau du classeur ouvert, créé à la
// première demande, sans fenêtre (voir main.ts, seances-vue.ts,
// bibliotheque.ts). Plus tard, « Déplacer vers… » (lot 9) la range dans
// son chapitre.
//
// Ce classeur est reconnu À SON NOM, « Séances isolées » (sans la casse, les
// blancs réunis : cleDe), rangé DIRECTEMENT dans le dossier de niveau (ou à
// la racine pour un classeur sans dossier). Aucun champ nouveau dans les
// fiches ni dans les fichiers : un .memc, un .memb, le fichier de la clé et
// la copie du Drive le gardent tel quel ; le renommer en fait un chapitre
// ordinaire ; le professeur peut aussi le créer lui-même par « Nouveau
// classeur ». Un niveau = un seul classeur « Séances isolées » ; s'il y en a
// deux (un .memc ajouté, un classeur remis de la corbeille), les nouvelles
// séances vont dans le plus récemment ouvert.
//
// Ce fichier est pur (sans DOM ni IndexedDB) : il se teste sous Node.
// =============================================================
import type { FicheClasseur } from './demarrage'
import { visible } from './demarrage'
import type { Dossiers } from './arbre'
import { cleDe, estDans } from './arbre'
import { deNiveau, enNiveau } from '../seances-vue'

/** Le nom du classeur des séances hors chapitre d'un niveau */
export const NOM_SEANCES_ISOLEES = 'Séances isolées'

const CLE_ISOLEES = cleDe(NOM_SEANCES_ISOLEES)

/** Le classeur est-il celui des séances isolées ? À son nom exact, sans la
 *  casse ni les blancs en trop (« Séances isolées 5ème » et « Séances
 *  isolées (copie) » sont des chapitres ordinaires) */
export function estSeancesIsolees(f: { nom: string }): boolean {
  return cleDe(f.nom) === CLE_ISOLEES
}

/** Le classeur « Séances isolées » d'un dossier (null : la racine, où va
 *  aussi un classeur dont le dossier n'existe plus) : parmi les classeurs
 *  visibles (ni dans la corbeille, lui ou un dossier parent, ni en train de
 *  naître ou de partir) rangés directement dans ce dossier (pas dans ses
 *  sous-dossiers), le plus récemment ouvert, puis modifié, puis le plus
 *  petit id ; null s'il n'y en a pas */
export function classeurSeancesIsolees(dossier: string | null, fiches: readonly FicheClasseur[], dossiers: Dossiers): FicheClasseur | null {
  const l = fiches.filter(f => estSeancesIsolees(f) && visible(f, dossiers) && estDans(f, dossier, dossiers))
  if (!l.length) return null
  return [...l].sort((a, b) => (b.ouvert - a.ouvert) || (b.modifie - a.modifie) || (a.id < b.id ? -1 : 1))[0]
}

/** La même liste, les classeurs « Séances isolées » rejetés à la fin, dans
 *  leur ordre ; l'ordre des autres ne change pas (le tri de la bibliothèque
 *  et de « Chapitres de 5ème » se fait avant) */
export function isoleesEnQueue<T extends { nom: string }>(l: readonly T[]): T[] {
  return [...l.filter(f => !estSeancesIsolees(f)), ...l.filter(f => estSeancesIsolees(f))]
}

/** Le petit texte sous le lien « Séance isolée » de la fenêtre « Bonjour ! » :
 *  « Hors chapitre : rangée dans « Séances isolées » de 5ème. » ; un dossier
 *  qui n'est pas un niveau : « … de « Soutien ». » ; à la racine : « Hors
 *  chapitre : rangée dans « Séances isolées ». » */
export function texteSeanceIsolee(classe: string | null): string {
  return `Hors chapitre : rangée dans « ${NOM_SEANCES_ISOLEES} »${classe ? ` ${deNiveau(classe)}` : ''}.`
}

/** Le message d'arrivée quand le classeur vient d'être créé : « Classeur
 *  « Séances isolées » créé en 5ème : vos séances hors chapitre iront là. »
 *  (« … créé dans « Soutien » : … » ; à la racine : « … créé : … ») */
export function texteClasseurIsoleesCree(classe: string | null): string {
  return `Classeur « ${NOM_SEANCES_ISOLEES} » créé${classe ? ` ${enNiveau(classe)}` : ''} : vos séances hors chapitre iront là.`
}

/** La mention sur la carte de la bibliothèque (et, en minuscules, dans la
 *  liste de « Bonjour ! » et pour le lecteur d'écran) */
export const HORS_CHAPITRE = 'Hors chapitre'
