// =============================================================
// LE FILM ÉLÈVE (format « mem-revoir », version 1)
// Ce qu'on publie pour les élèves n'est JAMAIS le document du tableau :
// celui-ci garde tout ce qui a été effacé (gc: false), un prénom compris.
// On publie un film aplati : l'état de départ des pages, puis, geste
// après geste, ce qui apparaît, change ou disparaît. Rien d'autre.
//
// Le fichier est un texte JSON : { format, v, titre, date, gz }, où gz est
// le film compressé (gzip, en base64). C'est ce que le relais Apps Script
// sert tel quel, et ce qu'un lecteur plus récent saura toujours relire.
//
// La version ne monte que le jour où un champ qui existe change de sens : un
// lecteur refuse une version plus récente que la sienne. Les ajouts sont
// facultatifs et gardent la version 1 (le rythme de la main, ms ; les
// instruments, inst, instruments et avant) : un lecteur plus ancien les
// ignore et rejoue le film comme avant, sans planter.
// =============================================================
import type { Fond, Forme } from '../types'
import type { Morceau } from './instruments-film'

export const FORMAT = 'mem-revoir'
export const VERSION = 1

/** Ce qui se passe sur une page à un geste :
 *  ['=', forme]            la forme apparaît, ou change (elle remplace l'ancienne)
 *  ['-', id]               la forme disparaît
 *  ['f', fond, ox, oy]     le fond de la page change (et l'origine du repère)
 *  ['x']                   la page est supprimée */
export type Op = ['=', Forme] | ['-', string] | ['f', Fond, number, number] | ['x']

/** Un geste du film : son écart avec le précédent (ms), la page où il a
 *  lieu, et ce qu'il change. ms : si le geste pose un trait tracé à la main,
 *  le temps passé sur chacun de ses points, jusqu'au lever (voir
 *  main-levee.ts). inst : ce que les instruments ont fait sur cette page
 *  depuis l'image d'avant (t : ms depuis elle, de 0 à dt ; voir
 *  instruments-film.ts). Facultatifs : un film sans eux, ou un lecteur qui
 *  les ignore, rejoue le geste comme avant. */
export interface EtapeFilm { dt: number; p: string; o: Op[]; ms?: number[]; inst?: Morceau[] }

/** L'état d'une page au début du film */
export interface PageFilm { id: string; fond: Fond; origine: { x: number; y: number }; formes: Forme[] }

/** Un chapitre commence à l'image i (0 : l'état de départ) */
export interface Chapitre { i: number; titre: string }

export interface FilmEleve {
  format: typeof FORMAT
  v: number
  titre: string
  /** Heure du premier geste (ms depuis 1970) */
  date: number
  /** L'ordre des pages, pour les numéroter comme au tableau */
  ordre: string[]
  pages: PageFilm[]
  etapes: EtapeFilm[]
  chapitres: Chapitre[]
  /** Les images utilisées, et elles seules : identifiant → data: URL */
  images: Record<string, string>
  /** Les instruments visibles à l'image 0 (une pose chacun). Facultatif, comme avant : */
  instruments?: Morceau[]
  /** le temps (ms) d'avant le premier geste où les instruments se mettent en
   *  place ; les morceaux du premier geste sont datés depuis ce début */
  avant?: number
}

/** L'enveloppe écrite dans le fichier séance (« .mem ») ; elle commence
 *  toujours par {"format":"mem-revoir" — le relais s'en sert pour refuser le reste */
export interface Enveloppe { format: typeof FORMAT; v: number; titre: string; date: number; gz: string }

// ---------- Écrire ----------
async function compresser(texte: string): Promise<Uint8Array> {
  const flux = new Blob([texte]).stream().pipeThrough(new CompressionStream('gzip'))
  return new Uint8Array(await new Response(flux).arrayBuffer())
}
async function decompresser(octets: Uint8Array): Promise<string> {
  // Les iPhone et iPad d'avant iOS 16.4 n'ont pas DecompressionStream : on
  // charge alors un petit décompresseur (fflate, 8 Ko), seulement pour eux
  if (typeof DecompressionStream !== 'function') {
    const { gunzipSync, strFromU8 } = await import('fflate')
    return strFromU8(gunzipSync(octets))
  }
  const flux = new Blob([octets as BlobPart]).stream().pipeThrough(new DecompressionStream('gzip'))
  return new Response(flux).text()
}
function versBase64(o: Uint8Array): string {
  let s = ''
  for (let i = 0; i < o.length; i += 0x8000) s += String.fromCharCode(...o.subarray(i, i + 0x8000))
  return btoa(s)
}
function depuisBase64(b: string): Uint8Array {
  const s = atob(b), o = new Uint8Array(s.length)
  for (let i = 0; i < s.length; i++) o[i] = s.charCodeAt(i)
  return o
}

/** Le texte du fichier à publier */
export async function ecrireFilm(film: FilmEleve): Promise<string> {
  const env: Enveloppe = { format: FORMAT, v: VERSION, titre: film.titre, date: film.date, gz: versBase64(await compresser(JSON.stringify(film))) }
  return JSON.stringify(env)
}

// ---------- Lire ----------
/** Une erreur qu'on peut montrer telle quelle à un élève */
export class ErreurFilm extends Error {}

/** Lit un fichier séance (texte ou objet déjà lu). Refuse, avec une phrase
 *  claire, tout ce qui n'est pas un film élève qu'on sait lire. */
export async function lireFilm(source: string | unknown): Promise<FilmEleve> {
  let objet: unknown = source
  if (typeof source === 'string') {
    try { objet = JSON.parse(source) } catch { throw new ErreurFilm('Ce fichier n\'est pas une séance de MEM teachingtool.') }
  }
  const e = objet as Partial<Enveloppe> & Partial<FilmEleve>
  if (!e || typeof e !== 'object' || e.format !== FORMAT) throw new ErreurFilm('Ce fichier n\'est pas une séance de MEM teachingtool.')
  if (typeof e.v !== 'number' || e.v > VERSION) throw new ErreurFilm('Cette séance a été publiée par une version plus récente de MEM teachingtool : rechargez la page.')
  let film: Partial<FilmEleve>
  if (typeof e.gz === 'string') {
    try { film = JSON.parse(await decompresser(depuisBase64(e.gz))) } catch { throw new ErreurFilm('Le fichier de la séance est abîmé : demandez à votre enseignant de la publier à nouveau.') }
  } else film = e
  const valide = film && film.format === FORMAT && Array.isArray(film.pages) && Array.isArray(film.etapes)
    && Array.isArray(film.ordre) && Array.isArray(film.chapitres) && film.images && typeof film.images === 'object'
  if (!valide) throw new ErreurFilm('Le fichier de la séance est abîmé : demandez à votre enseignant de la publier à nouveau.')
  return film as FilmEleve
}
