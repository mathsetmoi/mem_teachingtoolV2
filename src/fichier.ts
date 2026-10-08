// =============================================================
// LE TABLEAU DANS UN FICHIER (« .memc », version 1)
// Le tableau vit dans le navigateur ; ce fichier l'emporte tout entier,
// pour le garder sur une clé, l'ouvrir sur une autre machine, passer de
// la version en ligne à la version d'un seul fichier (et retour).
//
// Le fichier :
//   ligne 1   {"format":"mem-tableau","v":1,"app":"MEM teachingtool","date":…,"pages":…}
//             (du texte UTF-8, puis un saut de ligne)
//   ensuite   tout le document Yjs (Y.encodeStateAsUpdate), compressé (gzip)
// Tout le document : les pages, le film, la piste des instruments, les
// images, le registre des publications. Il garde ce qui a été effacé
// (gc: false) : la revue en classe et le replay marchent sur l'autre
// machine comme sur celle-ci. C'est aussi pourquoi il ne va pas aux élèves
// (pour eux : le film aplati, « .mem », voir revoir/format.ts).
//
// Le film élève commence lui aussi par {"format": ; chaque lecteur
// reconnaît le sien à ses premiers octets, et refuse l'autre avec une
// phrase qui dit quoi faire. Pur : se teste sous Node.
// =============================================================
import * as Y from 'yjs'
import { gunzipSync, gzipSync, strToU8 } from 'fflate'
import { DEBUT_TABLEAU, FORMAT, FORMAT_TABLEAU } from './revoir/format'
import { heureLisible } from './revue/bande'

export const EXTENSION_TABLEAU = '.memc'
export const VERSION_TABLEAU = 1
const APP = 'MEM teachingtool'
/** L'en-tête tient dans ces premiers octets (il en fait une centaine) */
const DEBUT = 4096

/** Une erreur qu'on peut montrer telle quelle au professeur */
export class ErreurFichier extends Error {}

export interface EnteteTableau { format: typeof FORMAT_TABLEAU; v: number; app: string; date: number; pages: number }

const PAS_UN_TABLEAU = 'Ce fichier n\'est pas un tableau enregistré par MEM teachingtool (fichier .memc).'
const UN_FILM = 'Ce fichier est un film pour les élèves (.mem) : il se regarde dans « Revoir la séance » et ne contient pas tout le tableau. Pour ouvrir un tableau, choisissez un fichier .memc (menu ⋯ → Enregistrer le tableau).'
const PLUS_RECENT = 'Ce tableau a été enregistré par une version plus récente de MEM teachingtool : ouvrez-le avec la version en ligne, à jour.'
const ABIME = 'Ce fichier .memc est abîmé : il ne peut pas être ouvert. Le tableau actuel n\'a pas changé.'

/** Le fichier d'un tableau : son en-tête lisible, puis tout le document */
export function ecrireTableau(doc: Y.Doc, date = Date.now()): Blob {
  // L'ordre des clés compte : le fichier doit commencer par DEBUT_TABLEAU
  const entete: EnteteTableau = { format: FORMAT_TABLEAU, v: VERSION_TABLEAU, app: APP, date, pages: doc.getArray('ordre').length }
  const corps = gzipSync(Y.encodeStateAsUpdate(doc))
  return new Blob([strToU8(JSON.stringify(entete) + '\n'), corps as BlobPart], { type: 'application/octet-stream' })
}

/** Lit un fichier de tableau. Refuse, avec une phrase claire, tout ce qui
 *  n'en est pas un qu'on sait ouvrir : le document est d'abord rejoué dans
 *  un document d'essai, pour qu'un fichier abîmé ne touche jamais au tableau
 *  du navigateur. etat : le document, prêt pour Tableau.remplacerPar. */
export function lireTableau(octets: Uint8Array): { entete: EnteteTableau; etat: Uint8Array; pages: number } {
  const debut = new TextDecoder().decode(octets.subarray(0, DEBUT))
  if (debut.startsWith(`{"format":"${FORMAT}"`)) throw new ErreurFichier(UN_FILM)
  const fin = octets.subarray(0, DEBUT).indexOf(0x0a)
  if (!debut.startsWith(DEBUT_TABLEAU) || fin < 0) throw new ErreurFichier(PAS_UN_TABLEAU)
  let entete: EnteteTableau
  try { entete = JSON.parse(new TextDecoder().decode(octets.subarray(0, fin))) } catch { throw new ErreurFichier(PAS_UN_TABLEAU) }
  if (!entete || entete.format !== FORMAT_TABLEAU || typeof entete.v !== 'number') throw new ErreurFichier(PAS_UN_TABLEAU)
  if (entete.v > VERSION_TABLEAU) throw new ErreurFichier(PLUS_RECENT)
  let etat: Uint8Array
  let pages = 0
  const essai = new Y.Doc({ gc: false })
  try {
    etat = gunzipSync(octets.subarray(fin + 1))
    Y.applyUpdate(essai, etat)
    // Un morceau manquant (un fichier tronqué) laisse des changements en
    // attente de ce qui les précède : le document n'est pas entier
    if (essai.store.pendingStructs || essai.store.pendingDs) throw new Error('incomplet')
    pages = essai.getArray('ordre').length
  } catch { throw new ErreurFichier(ABIME) } finally { essai.destroy() }
  if (!pages) throw new ErreurFichier(ABIME)
  return { entete, etat, pages }
}

// ---------- Les mots ----------

const deux = (n: number) => String(n).padStart(2, '0')

/** « tableau-2026-10-07-14h05.memc », à l'heure de l'ordinateur */
export function nomTableau(t = Date.now()): string {
  const d = new Date(t)
  return `tableau-${d.getFullYear()}-${deux(d.getMonth() + 1)}-${deux(d.getDate())}-${deux(d.getHours())}h${deux(d.getMinutes())}${EXTENSION_TABLEAU}`
}

/** « 850 Ko », « 3,2 Mo » (comme l'explorateur de fichiers les compte) */
export function tailleLisible(octets: number): string {
  if (octets < 1024 * 1024) return `${Math.max(1, Math.round(octets / 1024))} Ko`
  const mo = octets / 1024 / 1024
  return `${(mo < 10 ? Math.round(mo * 10) / 10 : Math.round(mo)).toString().replace('.', ',')} Mo`
}

/** « 1 page », « 12 pages » */
export function pagesLisibles(n: number): string {
  return `${n} page${n > 1 ? 's' : ''}`
}

const JOURS = ['dimanche', 'lundi', 'mardi', 'mercredi', 'jeudi', 'vendredi', 'samedi']
const MOIS = ['janvier', 'février', 'mars', 'avril', 'mai', 'juin', 'juillet', 'août', 'septembre', 'octobre', 'novembre', 'décembre']

/** « le mardi 7 octobre 2026 à 14 h 05 » */
export function dateLisible(t: number): string {
  const d = new Date(t)
  const jour = d.getDate() === 1 ? '1er' : String(d.getDate())
  return `le ${JOURS[d.getDay()]} ${jour} ${MOIS[d.getMonth()]} ${d.getFullYear()} à ${heureLisible(t)}`
}

/** « aujourd'hui à 14 h 05 », « hier à 9 h 30 », « le mardi 7 octobre 2026 à 14 h 05 » */
export function quandLisible(t: number, maintenant = Date.now()): string {
  const midi = (x: number) => { const d = new Date(x); d.setHours(12, 0, 0, 0); return d.getTime() }
  const jours = Math.round((midi(maintenant) - midi(t)) / 86_400_000)
  if (jours === 0) return `aujourd'hui à ${heureLisible(t)}`
  if (jours === 1) return `hier à ${heureLisible(t)}`
  return dateLisible(t)
}
