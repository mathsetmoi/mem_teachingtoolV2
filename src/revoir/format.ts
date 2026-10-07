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
// =============================================================
import type { Fond, Forme } from '../types'

export const FORMAT = 'mem-revoir'
export const VERSION = 1

/** Ce qui se passe sur une page à un geste :
 *  ['=', forme]            la forme apparaît, ou change (elle remplace l'ancienne)
 *  ['-', id]               la forme disparaît
 *  ['f', fond, ox, oy]     le fond de la page change (et l'origine du repère)
 *  ['x']                   la page est supprimée */
export type Op = ['=', Forme] | ['-', string] | ['f', Fond, number, number] | ['x']

/** Un geste du film : son écart avec le précédent (ms), la page où il a
 *  lieu, et ce qu'il change */
export interface EtapeFilm { dt: number; p: string; o: Op[] }

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
}

/** L'enveloppe écrite dans le fichier « .prof » */
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
    try { objet = JSON.parse(source) } catch { throw new ErreurFilm('Ce fichier n\'est pas une séance de Tableau MEM.') }
  }
  const e = objet as Partial<Enveloppe> & Partial<FilmEleve>
  if (!e || typeof e !== 'object' || e.format !== FORMAT) throw new ErreurFilm('Ce fichier n\'est pas une séance de Tableau MEM.')
  if (typeof e.v !== 'number' || e.v > VERSION) throw new ErreurFilm('Cette séance a été publiée par une version plus récente de Tableau MEM : rechargez la page.')
  let film: Partial<FilmEleve>
  if (typeof e.gz === 'string') {
    try { film = JSON.parse(await decompresser(depuisBase64(e.gz))) } catch { throw new ErreurFilm('Le fichier de la séance est abîmé : demandez à votre enseignant de la publier à nouveau.') }
  } else film = e
  const valide = film && film.format === FORMAT && Array.isArray(film.pages) && Array.isArray(film.etapes)
    && Array.isArray(film.ordre) && Array.isArray(film.chapitres) && film.images && typeof film.images === 'object'
  if (!valide) throw new ErreurFilm('Le fichier de la séance est abîmé : demandez à votre enseignant de la publier à nouveau.')
  return film as FilmEleve
}
