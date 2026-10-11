// =============================================================
// LE CLASSEUR DANS UN FICHIER (« .memc », version 1)
// Le classeur vit dans le navigateur ; ce fichier l'emporte tout entier,
// pour le garder sur une clé, l'ouvrir sur une autre machine, passer de
// la version en ligne à la version d'un seul fichier (et retour).
//
// Le fichier :
//   ligne 1   {"format":"mem-tableau","v":1,"app":"MEM teachingtool","date":…,"pages":…,"nom":…,"id":…}
//             (du texte UTF-8, puis un saut de ligne)
//   ensuite   tout le document Yjs (Y.encodeStateAsUpdate), compressé (gzip)
// Tout le document : les pages, le film, la piste des instruments, les
// images, le registre des publications. Il garde ce qui a été effacé
// (gc: false) : la revue en classe et le replay marchent sur l'autre
// machine comme sur celle-ci. C'est aussi pourquoi il ne va pas aux élèves
// (pour eux : le film aplati, « .mem », voir revoir/format.ts).
//
// Depuis le lot 4, l'en-tête dit aussi le nom et l'id du classeur, À LA
// FIN : le format reste en tête (DEBUT_TABLEAU), et une version d'avant,
// qui ne lit que format, v, date et pages, ne voit pas la différence (un
// essai le vérifie avec la version du lot 3). C'est toujours la version 1.
// Les noms internes (FORMAT_TABLEAU 'mem-tableau', lireTableau…) restent
// ceux d'avant le lot 4, quand l'unité était le tableau.
//
// Le film élève commence lui aussi par {"format": ; chaque lecteur
// reconnaît le sien à ses premiers octets, et refuse l'autre avec une
// phrase qui dit quoi faire. Pur : se teste sous Node (et sert au
// travailleur qui fabrique le fichier d'un classeur, voir
// classeurs/ecrivain-pur.ts).
// =============================================================
import * as Y from 'yjs'
import { gunzipSync, gzipSync, strToU8 } from 'fflate'
import { DEBUT_TABLEAU, FORMAT, FORMAT_TABLEAU } from './revoir/format'
import { heureLisible } from './revue/bande'

export const EXTENSION_TABLEAU = '.memc'
export const VERSION_TABLEAU = 1
const APP = 'MEM teachingtool'
/** L'en-tête tient dans ces premiers octets (il en fait deux cents au plus) */
const DEBUT = 4096
/** Le nom du classeur dans l'en-tête : 60 caractères au plus */
const LONGUEUR_NOM = 60

/** Pourquoi un fichier n'a pas pu être lu ou écrit, quand on le sait :
 *  'abimee' : le classeur de ce navigateur (sa base) est abîmé, voir
 *  classeurs/ecrivain-pur.ts */
export type RaisonFichier = 'abimee'

/** Une erreur qu'on peut montrer telle quelle au professeur */
export class ErreurFichier extends Error {
  constructor(message: string, readonly raison?: RaisonFichier) { super(message) }
}

/** L'en-tête d'un fichier de classeur. nom et id (depuis le lot 4) : le
 *  classeur qu'il emporte ; absents d'un fichier d'avant, et rendus
 *  seulement s'ils sont valables (voir enteteValable). */
export interface EnteteTableau { format: typeof FORMAT_TABLEAU; v: number; app: string; date: number; pages: number; nom?: string; id?: string }

// Les phrases des refus (la bibliothèque les abrège, voir classeurs/reconnaitre.ts)
export const PAS_UN_TABLEAU = 'Ce fichier n\'est pas un classeur enregistré par MEM teachingtool (fichier .memc).'
export const UN_FILM = 'Ce fichier est un film pour les élèves (.mem) : il se regarde dans « Revoir la séance » et ne contient pas tout le classeur. Pour ouvrir un classeur, choisissez un fichier .memc (menu ⋯ → Enregistrer le classeur).'
export const PLUS_RECENT = 'Ce classeur a été enregistré par une version plus récente de MEM teachingtool : ouvrez-le avec la version en ligne, à jour.'
export const ABIME = 'Ce fichier .memc est abîmé : il ne peut pas être ouvert. Le classeur actuel n\'a pas changé.'

/** Un id de classeur : 16 caractères hexadécimaux, en minuscules (voir
 *  classeurs/demarrage.ts, idClasseur) */
const ID_VALABLE = /^[0-9a-f]{16}$/
const CONTROLE = /[\u0000-\u001f\u007f-\u009f]/

/** Le nom d'un classeur tel que l'en-tête le garde : les blancs réunis, sans
 *  caractère de contrôle, 60 caractères au plus (sans couper un caractère en
 *  deux) ; undefined s'il ne reste rien */
function nomPourEntete(nom: unknown): string | undefined {
  if (typeof nom !== 'string') return undefined
  const n = nom.replace(/\s+/g, ' ').replace(new RegExp(CONTROLE.source, 'g'), '').trim()
  const court = [...n].slice(0, LONGUEUR_NOM).join('').trimEnd()
  return court || undefined
}

/** Ce qui est écrit en tête du fichier : format, v, app, date, pages, puis
 *  nom et id s'il y en a (l'ordre des clés compte : le fichier doit
 *  commencer par DEBUT_TABLEAU). infos : le classeur ; un id qui n'en est
 *  pas un (le classeur du repli, sans fiche) n'est pas écrit. */
export function enteteDuFichier(date: number, pages: number, infos?: { nom?: string; id?: string }): EnteteTableau {
  const e: EnteteTableau = { format: FORMAT_TABLEAU, v: VERSION_TABLEAU, app: APP, date, pages }
  const nom = nomPourEntete(infos?.nom)
  if (nom) e.nom = nom
  if (typeof infos?.id === 'string' && ID_VALABLE.test(infos.id)) e.id = infos.id
  return e
}

/** La première ligne du fichier, saut de ligne compris */
export function ligneEntete(e: EnteteTableau): Uint8Array {
  return strToU8(JSON.stringify(e) + '\n')
}

/** Le fichier d'un classeur : son en-tête lisible, puis tout le document.
 *  infos : son nom et son id (rien : l'en-tête d'avant le lot 4, à l'octet
 *  près). Sur le fil principal. Ctrl + S ne s'en sert plus : le fichier se
 *  fabrique dans un travailleur, depuis la base (classeurs/ecrivain.ts), ou,
 *  quand la base a un trou, depuis la mémoire par ecrireLisible, qui
 *  laisse de côté ce qui ne se relirait pas (un document où des changements
 *  attendent une mise à jour qui manque : celui-ci les écrirait, et le
 *  fichier serait refusé à l'ouverture). */
export function ecrireTableau(doc: Y.Doc, date = Date.now(), infos?: { nom?: string; id?: string }): Blob {
  const entete = enteteDuFichier(date, doc.getArray('ordre').length, infos)
  const corps = gzipSync(Y.encodeStateAsUpdate(doc))
  return new Blob([ligneEntete(entete) as BlobPart, corps as BlobPart], { type: 'application/octet-stream' })
}

/** Un en-tête lu : celui d'un classeur (sinon null), avec nom et id
 *  seulement s'ils sont valables (un id de 16 caractères hexadécimaux en
 *  minuscules ; un nom d'au plus 60 caractères, sans caractère de contrôle,
 *  pas vide). Les autres champs restent tels quels, comme avant le lot 4. */
function enteteValable(o: unknown): EnteteTableau | null {
  if (!o || typeof o !== 'object') return null
  const e = o as Record<string, unknown>
  if (e.format !== FORMAT_TABLEAU || typeof e.v !== 'number') return null
  const r = { ...e } as unknown as EnteteTableau
  delete r.nom; delete r.id
  if (typeof e.nom === 'string' && e.nom.trim() && [...e.nom].length <= LONGUEUR_NOM && !CONTROLE.test(e.nom)) r.nom = e.nom
  if (typeof e.id === 'string' && ID_VALABLE.test(e.id)) r.id = e.id
  return r
}

/** L'en-tête seul d'un fichier, lu dans ses 4096 premiers octets (un début
 *  de fichier suffit : File.slice), sans rien décompresser. null : ce n'est
 *  pas un fichier de classeur (un film élève, un fichier quelconque). Un
 *  fichier d'une version plus récente a son en-tête rendu tel quel : v le
 *  dit. Pour ouvrir le fichier, lireTableau, qui vérifie tout. */
export function lireEntete(octets: Uint8Array): EnteteTableau | null {
  const debut = octets.subarray(0, DEBUT)
  const fin = debut.indexOf(0x0a)
  if (fin < 0) return null
  const ligne = new TextDecoder().decode(debut.subarray(0, fin))
  if (!ligne.startsWith(DEBUT_TABLEAU)) return null
  try { return enteteValable(JSON.parse(ligne)) } catch { return null }
}

/** Rejoue un document dans un document d'essai et vérifie qu'il est entier :
 *  aucun morceau en attente (un fichier tronqué, une base trouée), chaque
 *  page de l'ordre avec ses formes. Rend le nombre de pages de l'ordre ;
 *  lève une Error simple sinon (à chacun de dire laquelle : voir
 *  lireTableau, et classeurs/ecrivain-pur.ts). */
export function verifierEtat(etat: Uint8Array): number {
  const essai = new Y.Doc({ gc: false })
  try {
    Y.applyUpdate(essai, etat)
    return verifierDocument(essai)
  } finally { essai.destroy() }
}

/** La même vérification, sur un document où l'état est déjà rejoué (le
 *  travailleur qui duplique un classeur s'en sert : il ne le rejoue qu'une
 *  fois, voir classeurs/ecrivain-pur.ts) */
export function verifierDocument(essai: Y.Doc): number {
  // Un morceau manquant (un fichier tronqué) laisse des changements en
  // attente de ce qui les précède : le document n'est pas entier
  if (enAttente(essai)) throw new Error('incomplet')
  return verifierPages(essai)
}

/** Des changements attendent-ils, dans ce document, une mise à jour qui
 *  manque (un fichier tronqué, une base trouée relue) ? */
export function enAttente(doc: Y.Doc): boolean {
  return !!(doc.store.pendingStructs || doc.store.pendingDs)
}

/** Chaque page de l'ordre existe, avec ses formes : sinon on verrait des
 *  pages vides, où rien de ce qu'on écrit ne serait gardé. Rend le nombre
 *  de pages de l'ordre ; lève une Error simple sinon. */
function verifierPages(essai: Y.Doc): number {
  const toutes = essai.getMap('pages')
  for (const id of essai.getArray('ordre').toArray()) {
    const p = toutes.get(id as string)
    if (!(p instanceof Y.Map) || !(p.get('formes') instanceof Y.Map)) throw new Error('page incomplète')
  }
  return essai.getArray('ordre').length
}

/** Ce qui se relit d'un document où l'état est déjà rejoué : son état SANS
 *  les changements en attente (ceux qui suivent une mise à jour qui manque :
 *  une base trouée relue, voir Tableau.incomplet), ses pages, et s'il y en
 *  avait (incomplet). Yjs mettrait ces changements dans encodeStateAsUpdate,
 *  et le fichier serait refusé à l'ouverture (« incomplet », voir
 *  verifierDocument) : ce qui se relit, c'est ce qui est à l'écran. Le
 *  document n'est pas changé : ses changements en attente lui sont rendus
 *  aussitôt (rien d'autre ne tourne entre-temps), et la base, elle, les
 *  garde (une mise à jour qui les complète pourra encore les reprendre).
 *  Ce qui reste est entier : les changements intégrés d'un client se
 *  suivent depuis le premier, ils se rejouent sans rien attendre. Lève une
 *  Error simple si même cela n'est pas un classeur (voir verifierPages). */
export function etatLisible(doc: Y.Doc): { etat: Uint8Array; pages: number; incomplet: boolean } {
  const pages = verifierPages(doc)
  if (!pages) throw new Error('aucune page')
  const store = doc.store
  const structs = store.pendingStructs, ds = store.pendingDs
  if (!structs && !ds) return { etat: Y.encodeStateAsUpdate(doc), pages, incomplet: false }
  store.pendingStructs = null
  store.pendingDs = null
  try { return { etat: Y.encodeStateAsUpdate(doc), pages, incomplet: true } } finally {
    store.pendingStructs = structs
    store.pendingDs = ds
  }
}

/** Le fichier d'un classeur, depuis un état déjà vérifié (voir etatLisible,
 *  et classeurs/ecrivain-pur.ts) : l'en-tête avec ces pages, puis l'état
 *  compressé */
export function fichierDeLEtat(etat: Uint8Array, pages: number, date: number, infos?: { nom?: string; id?: string }): Uint8Array {
  const tete = ligneEntete(enteteDuFichier(date, pages, infos))
  const corps = gzipSync(etat)
  const octets = new Uint8Array(tete.length + corps.length)
  octets.set(tete)
  octets.set(corps, tete.length)
  return octets
}

/** Le fichier d'un classeur depuis un document vivant (la mémoire de
 *  l'onglet, voir sauvegarde.ts), qui se rouvrira toujours : ce qui s'en
 *  relit (etatLisible), avec incomplet si des changements en attente n'y
 *  sont pas (le message doit le dire). Lève une ErreurFichier 'abimee' si
 *  même ce qui se relit n'est pas un classeur : rien n'est écrit. Jamais un
 *  fichier que lireTableau refuserait. */
export function ecrireLisible(doc: Y.Doc, date = Date.now(), infos?: { nom?: string; id?: string }): { fichier: Blob; pages: number; incomplet: boolean } {
  let l: ReturnType<typeof etatLisible>
  try { l = etatLisible(doc) } catch { throw new ErreurFichier(PAS_ECRIT_ABIME, 'abimee') }
  return { fichier: new Blob([fichierDeLEtat(l.etat, l.pages, date, infos) as BlobPart], { type: 'application/octet-stream' }), pages: l.pages, incomplet: l.incomplet }
}

/** La carte de premier niveau qui marque une copie (« Dupliquer le
 *  classeur », « Ajouter comme copie », lot 4) : { id, t }, l'id que la
 *  copie a reçu à sa naissance et l'heure. Hors des pages : ni étape du
 *  film, ni annulation ; elle voyage avec le document (les fichiers .memc,
 *  les autres onglets, un autre ordinateur), une version d'avant l'ignore.
 *  Publier s'en sert (publication/fenetre.ts) : les séances d'une copie,
 *  reçues de l'original avec toute son histoire, ont la même heure de
 *  début, donc la même clé ; sans cette marque, Publier retrouverait sur le
 *  Drive la séance de l'original (par sa clé, comme depuis un autre onglet)
 *  et mettrait à jour le lien déjà donné à l'autre classe. Une copie d'une
 *  copie reçoit sa propre marque. */
export const CARTE_COPIE = 'copie'

/** La marque de copie d'un document (voir CARTE_COPIE), ou null : ce n'est
 *  pas une copie (ou une copie faite avant cette marque) */
export function marqueDeCopie(doc: Y.Doc): string | null {
  const id = doc.getMap(CARTE_COPIE).get('id')
  return typeof id === 'string' && id ? id : null
}

/** Un classeur dont même ce qui se relit n'est pas entier : son fichier n'est pas écrit */
export const PAS_ECRIT_ABIME = 'Le classeur de ce navigateur semble abîmé : le fichier n\'a pas été écrit.'

/** Lit un fichier de classeur. Refuse, avec une phrase claire, tout ce qui
 *  n'en est pas un qu'on sait ouvrir : le document est d'abord rejoué dans
 *  un document d'essai, pour qu'un fichier abîmé ne touche jamais au
 *  classeur du navigateur. etat : le document, prêt pour Tableau.remplacerPar. */
export function lireTableau(octets: Uint8Array): { entete: EnteteTableau; etat: Uint8Array; pages: number } {
  const debut = new TextDecoder().decode(octets.subarray(0, DEBUT))
  if (debut.startsWith(`{"format":"${FORMAT}"`)) throw new ErreurFichier(UN_FILM)
  const fin = octets.subarray(0, DEBUT).indexOf(0x0a)
  if (!debut.startsWith(DEBUT_TABLEAU) || fin < 0) throw new ErreurFichier(PAS_UN_TABLEAU)
  let entete: EnteteTableau | null
  try { entete = enteteValable(JSON.parse(new TextDecoder().decode(octets.subarray(0, fin)))) } catch { throw new ErreurFichier(PAS_UN_TABLEAU) }
  if (!entete) throw new ErreurFichier(PAS_UN_TABLEAU)
  if (entete.v > VERSION_TABLEAU) throw new ErreurFichier(PLUS_RECENT)
  let etat: Uint8Array
  let pages = 0
  const corps = octets.subarray(fin + 1), n = corps.length
  try {
    // La fin du gzip : la somme CRC-32 des données, puis leur taille. fflate
    // ne la vérifie pas ; sans elle, un seul bit changé (une clé fatiguée, une
    // copie défectueuse) donnait souvent un classeur altéré sans aucun signe.
    // fflate réserve la place d'après la taille annoncée : on refuse d'abord
    // celle que deflate ne peut pas atteindre (au mieux 1032 octets pour un).
    if (n < 18) throw new Error('trop court')
    const taille = lire32(corps, n - 4)
    if (taille > n * 1032) throw new Error('taille impossible')
    etat = gunzipSync(corps)
    if (etat.length !== taille || crc32(etat) !== lire32(corps, n - 8)) throw new Error('somme fausse')
    pages = verifierEtat(etat)
  } catch { throw new ErreurFichier(ABIME) }
  if (!pages) throw new ErreurFichier(ABIME)
  return { entete, etat, pages }
}

/** Un entier de 32 bits, petit-boutiste (l'ordre du gzip) */
function lire32(o: Uint8Array, i: number): number {
  return (o[i] | o[i + 1] << 8 | o[i + 2] << 16 | o[i + 3] << 24) >>> 0
}

let tableCrc: Int32Array | null = null

/** La somme CRC-32 du gzip (polynôme 0xEDB88320). fflate ne l'exporte pas ;
 *  celle-ci marche partout, en http:// sur le réseau local comme en file://. */
export function crc32(o: Uint8Array): number {
  if (!tableCrc) {
    tableCrc = new Int32Array(256)
    for (let i = 0; i < 256; i++) {
      let c = i
      for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1
      tableCrc[i] = c
    }
  }
  const t = tableCrc
  let c = -1
  for (let i = 0; i < o.length; i++) c = t[(c ^ o[i]) & 255] ^ (c >>> 8)
  return ~c >>> 0
}

// ---------- Les mots ----------

const deux = (n: number) => String(n).padStart(2, '0')

/** « tableau-2026-10-07-14h05.memc », à l'heure de l'ordinateur : le nom
 *  d'avant le lot 4 (gardé pour ses tests ; voir nomClasseur) */
export function nomTableau(t = Date.now()): string {
  const d = new Date(t)
  return `tableau-${d.getFullYear()}-${deux(d.getMonth() + 1)}-${deux(d.getDate())}-${deux(d.getHours())}h${deux(d.getMinutes())}${EXTENSION_TABLEAU}`
}

/** Les noms que Windows refuse, seuls ou suivis d'une extension
 *  (« CON.memc » aussi), quelle que soit la casse */
const RESERVES = /^(con|prn|aux|nul|com[1-9]|lpt[1-9])$/i

/**
 * LA façon de faire un nom de fichier sûr, partout (un classeur, une image,
 * un PDF) : chaque suite de blancs devient une espace ; \ / : * ? < > | les
 * guillemets et les autres caractères de contrôle deviennent « - » ; les
 * bouts sont coupés (ni espace ni point à la fin : Windows les refuse),
 * longueur caractères au plus (80 par défaut, sans couper un caractère en
 * deux) ; repli (« Classeur » par défaut) si rien ne reste. Un nom réservé de
 * Windows (CON, PRN, AUX, NUL, COM1 à COM9, LPT1 à LPT9, seul ou avant un
 * point) prend « (classeur) » (« (page) »… : le repli, en minuscules) :
 * « CON (classeur) ». Sans extension : à chacun la sienne.
 */
export function nomSur(nom: string, o: { repli?: string; longueur?: number } = {}): string {
  const repli = o.repli ?? 'Classeur', longueur = o.longueur ?? 80
  // Les blancs d'abord (une tabulation, un saut de ligne sont des blancs, pas des « - »)
  const propre = String(nom ?? '')
    .replace(/\s+/g, ' ')
    .replace(/[\\/:*?<>|"“”«»\u0000-\u001f\u007f-\u009f]/g, '-')
    .trim()
  const court = [...propre].slice(0, longueur).join('').replace(/[\s.]+$/, '').trim() || repli
  const point = court.indexOf('.')
  const tige = point < 0 ? court : court.slice(0, point)
  if (!RESERVES.test(tige.trimEnd())) return court
  return `${tige.trimEnd()} (${repli.toLowerCase()})${point < 0 ? '' : court.slice(point)}`
}

/** « Symétrie centrale 2026-10-10 14h05.memc » : le nom du classeur rendu
 *  sûr (voir nomSur), puis la date et l'heure de l'ordinateur */
export function nomClasseur(nom: string, t = Date.now()): string {
  const d = new Date(t)
  return `${nomSur(nom)} ${d.getFullYear()}-${deux(d.getMonth() + 1)}-${deux(d.getDate())} ${deux(d.getHours())}h${deux(d.getMinutes())}${EXTENSION_TABLEAU}`
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
