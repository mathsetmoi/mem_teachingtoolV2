// =============================================================
// TOUTE LA BIBLIOTHÈQUE DANS UN FICHIER (« .memb », version 1)
// Pour changer d'ordinateur, ou garder une copie de tout : un seul fichier
// avec tous les classeurs (sans la corbeille) et l'arbre des dossiers.
// C'est un ZIP ÉCRIT À LA MAIN, que tout logiciel ouvre une fois renommé
// en .zip :
//   bibliotheque.json        l'index (voir IndexBibliotheque), d'abord ;
//   classeurs/<id>.memc      chaque classeur, tel que l'écrivain le fabrique
//                            (il s'ouvre aussi seul, comme tout .memc) ;
//   apercus/<id>.png         l'aperçu de sa première page, s'il en a un ;
// puis le répertoire central et sa fin.
// Les entrées sont STOCKÉES (méthode 0 : un .memc est déjà compressé), et
// chaque en-tête local porte sa somme CRC-32 et sa taille : aucun
// descripteur de données. Le flux de fflate en écrit toujours un, et sa
// lecture en flux coupe sans rien dire une entrée stockée qui contient par
// hasard une signature « PK » (mesuré : 100 000 octets lus sur 200 000 ;
// environ 1,3 % des bibliothèques de 18 Mo) ; d'où ce zip à nous.
// On le lit par le RÉPERTOIRE CENTRAL : la fin (les 22 derniers octets, ou
// un peu plus s'il y a un commentaire), puis les entrées aux places qu'il
// dit (File.slice) : rien n'est jamais balayé à la recherche d'une
// signature dans les données. Un fichier tronqué (sans sa fin) se relit en
// suivant les en-têtes locaux, qui ont leurs tailles : ce qui est entier
// avant la coupure se retrouve.
// Pas de ZIP64 : moins de 4 Gio en tout et moins de 65 535 entrées, sinon un
// refus clair avant d'écrire quoi que ce soit de faux.
// Pur (sans IndexedDB ni DOM) : se teste sous Node ; la somme CRC-32 est
// celle de fichier.ts (celle des .memc se calcule dans le travailleur).
// =============================================================
import { crc32 } from '../fichier'
import type { FicheClasseur, FicheDossier } from './demarrage'

export const EXTENSION_BIBLIOTHEQUE = '.memb'
export const FORMAT_BIBLIOTHEQUE = 'mem-bibliotheque'
export const VERSION_BIBLIOTHEQUE = 1
export const NOM_INDEX = 'bibliotheque.json'
const APP = 'MEM teachingtool'
export const cheminClasseur = (id: string) => `classeurs/${id}.memc`
export const cheminApercu = (id: string) => `apercus/${id}.png`

/** Les signatures du zip */
const LOCAL = 0x04034b50, CENTRAL = 0x02014b50, FIN = 0x06054b50
const TETE_LOCALE = 30, TETE_CENTRALE = 46, TETE_FIN = 22
/** Pas de ZIP64 : chaque position et la taille du tout tiennent sur 32 bits */
const MAX_OCTETS = 0xffffffff
/** Moins de 65 535 entrées */
const MAX_ENTREES = 0xffff
/** Le drapeau « noms en UTF-8 » */
const UTF8 = 0x0800

export type RaisonArchive = 'trop-grande' | 'pas-une-bibliotheque' | 'plus-recente' | 'abimee'
export const TROP_GRANDE = 'La bibliothèque est trop grande pour un seul fichier (4 Go au plus, 65 534 fichiers) : enregistrez plutôt ses classeurs un par un.'
export const PAS_UNE_BIBLIOTHEQUE = 'Ce fichier n\'est pas une bibliothèque enregistrée par MEM teachingtool (fichier .memb).'
export const PLUS_RECENTE = 'Cette bibliothèque a été enregistrée par une version plus récente de MEM teachingtool : ouvrez-la avec la version en ligne, à jour.'
export const ABIMEE = 'Ce fichier .memb est abîmé : il ne peut pas être ouvert. La bibliothèque de ce navigateur n\'a pas changé.'

/** Une erreur qu'on peut montrer telle quelle */
export class ErreurArchive extends Error {
  constructor(readonly raison: RaisonArchive, message: string) {
    super(message)
    this.name = 'ErreurArchive'
  }
}

const utf8 = (t: string) => new TextEncoder().encode(t)
const u16 = (o: Uint8Array, i: number) => o[i] | o[i + 1] << 8
const u32 = (o: Uint8Array, i: number) => (o[i] | o[i + 1] << 8 | o[i + 2] << 16 | o[i + 3] << 24) >>> 0

/** L'heure et le jour à la façon de MS-DOS (ce que garde un zip), à l'heure
 *  de l'ordinateur ; bornés à 1980–2107 */
export function heureDos(t: number): { heure: number; jour: number } {
  const d = new Date(Number.isFinite(t) ? t : 0)
  const an = Math.max(1980, Math.min(2107, d.getFullYear()))
  return {
    heure: (d.getHours() << 11) | (d.getMinutes() << 5) | (d.getSeconds() >> 1),
    jour: ((an - 1980) << 9) | ((d.getMonth() + 1) << 5) | d.getDate(),
  }
}

// ---------- Écrire ----------
interface EntreeEcrite { nom: Uint8Array; crc: number; taille: number; position: number }

/** Écrit une archive au fil de l'eau : pour chaque entrée, entree() donne
 *  son en-tête local, qu'on écrit juste avant ses octets (taille exacte,
 *  stockés tels quels) ; fin() donne le répertoire central et sa fin. Rien
 *  n'est gardé des données : un classeur à la fois en mémoire. Une entrée
 *  qui ferait dépasser 4 Gio, ou la 65 535e, est refusée AVANT d'être
 *  promise (ErreurArchive 'trop-grande') : l'appelant abandonne l'écriture. */
export class EcrivainArchive {
  private entrees: EntreeEcrite[] = []
  private position = 0
  private tailleRepertoire = 0
  private readonly heure: number
  private readonly jour: number

  constructor(date = Date.now()) {
    const d = heureDos(date)
    this.heure = d.heure; this.jour = d.jour
  }

  /** Ce qui est écrit jusqu'ici (sans le répertoire central) */
  get taille(): number { return this.position }
  get nombre(): number { return this.entrees.length }

  /** L'en-tête local d'une entrée stockée de `taille` octets, de somme crc */
  entree(nom: string, crc: number, taille: number): Uint8Array {
    const n = utf8(nom)
    if (!n.length || n.length > 0xffff) throw new Error(`Nom d'entrée impossible : ${nom}`)
    if (!Number.isInteger(taille) || taille < 0) throw new Error(`Taille impossible : ${taille}`)
    if (this.entrees.length + 1 >= MAX_ENTREES) throw new ErreurArchive('trop-grande', TROP_GRANDE)
    const tete = TETE_LOCALE + n.length
    // Tout ce que l'archive fera une fois finie, cette entrée comprise
    const total = this.position + tete + taille + this.tailleRepertoire + TETE_CENTRALE + n.length + TETE_FIN
    if (total > MAX_OCTETS) throw new ErreurArchive('trop-grande', TROP_GRANDE)
    const h = new Uint8Array(tete)
    const v = new DataView(h.buffer)
    v.setUint32(0, LOCAL, true)
    v.setUint16(4, 20, true)              // version 2.0 pour l'extraire
    v.setUint16(6, UTF8, true)            // ni chiffrement, ni descripteur : le drapeau 3 n'est pas mis
    v.setUint16(8, 0, true)               // stockée
    v.setUint16(10, this.heure, true)
    v.setUint16(12, this.jour, true)
    v.setUint32(14, crc >>> 0, true)
    v.setUint32(18, taille, true)          // taille dans l'archive
    v.setUint32(22, taille, true)          // taille réelle (la même : stockée)
    v.setUint16(26, n.length, true)
    v.setUint16(28, 0, true)               // pas de champ supplémentaire
    h.set(n, TETE_LOCALE)
    this.entrees.push({ nom: n, crc: crc >>> 0, taille, position: this.position })
    this.position += tete + taille
    this.tailleRepertoire += TETE_CENTRALE + n.length
    return h
  }

  /** Le répertoire central, puis sa fin : à écrire après la dernière entrée */
  fin(): Uint8Array {
    const o = new Uint8Array(this.tailleRepertoire + TETE_FIN)
    const v = new DataView(o.buffer)
    let p = 0
    for (const e of this.entrees) {
      v.setUint32(p, CENTRAL, true)
      v.setUint16(p + 4, 20, true)          // faite par : version 2.0
      v.setUint16(p + 6, 20, true)          // pour l'extraire : 2.0
      v.setUint16(p + 8, UTF8, true)
      v.setUint16(p + 10, 0, true)
      v.setUint16(p + 12, this.heure, true)
      v.setUint16(p + 14, this.jour, true)
      v.setUint32(p + 16, e.crc, true)
      v.setUint32(p + 20, e.taille, true)
      v.setUint32(p + 24, e.taille, true)
      v.setUint16(p + 28, e.nom.length, true)
      // champ supplémentaire, commentaire, disque, attributs : 0
      v.setUint32(p + 42, e.position, true)
      o.set(e.nom, p + TETE_CENTRALE)
      p += TETE_CENTRALE + e.nom.length
    }
    v.setUint32(p, FIN, true)
    v.setUint16(p + 8, this.entrees.length, true)
    v.setUint16(p + 10, this.entrees.length, true)
    v.setUint32(p + 12, this.tailleRepertoire, true)
    v.setUint32(p + 16, this.position, true)
    return o
  }
}

// ---------- Lire ----------
/** Une entrée de l'archive : où sont ses données (debut, tailleArchive
 *  octets), sa somme et sa taille ; methode 0 : stockée (les seules qu'on
 *  sait lire ; un zip refait par un autre logiciel peut en compresser) */
export interface EntreeArchive { nom: string; methode: number; crc: number; taille: number; tailleArchive: number; position: number; debut: number }
/** Lire des octets du fichier, de debut (compris) à fin (exclue) : File.slice */
export type LireOctets = (debut: number, fin: number) => Promise<Uint8Array>

/** Les entrées d'une archive, lues par son répertoire central. Un fichier
 *  sans fin lisible (tronqué) : le repli suit les en-têtes locaux depuis le
 *  début (tronquee : vrai), et garde les entrées entières. Lève
 *  ErreurArchive 'pas-une-bibliotheque' si le fichier ne commence pas comme
 *  un zip, 'abimee' s'il ne s'y retrouve rien. */
export async function lireArchive(lire: LireOctets, taille: number): Promise<{ entrees: EntreeArchive[]; tronquee: boolean }> {
  if (taille < TETE_LOCALE) throw new ErreurArchive('pas-une-bibliotheque', PAS_UNE_BIBLIOTHEQUE)
  const debut = await lire(0, 4)
  if (u32(debut, 0) !== LOCAL) throw new ErreurArchive('pas-une-bibliotheque', PAS_UNE_BIBLIOTHEQUE)
  let entrees: EntreeArchive[] | null = null
  try { entrees = await parLeRepertoire(lire, taille) } catch { entrees = null }
  if (entrees) return { entrees, tronquee: false }
  const suivies = await parLesEnTetes(lire, taille)
  if (!suivies.length) throw new ErreurArchive('abimee', ABIMEE)
  return { entrees: suivies, tronquee: true }
}

/** La fin du répertoire central, cherchée dans les derniers octets
 *  seulement (22, plus un commentaire de 65 535 au plus), en arrière ; elle
 *  doit tomber pile au bout du fichier et désigner un répertoire qui la
 *  précède. null : pas de fin (un fichier tronqué). */
async function parLeRepertoire(lire: LireOctets, taille: number): Promise<EntreeArchive[] | null> {
  const n = Math.min(taille, TETE_FIN + 0xffff)
  const queue = await lire(taille - n, taille)
  let fin = -1
  for (let i = queue.length - TETE_FIN; i >= 0; i--) {
    if (u32(queue, i) !== FIN) continue
    const commentaire = u16(queue, i + 20)
    if (i + TETE_FIN + commentaire !== queue.length) continue
    fin = i
    break
  }
  if (fin < 0) return null
  const ici = taille - n + fin
  const nombre = u16(queue, fin + 10), tailleRep = u32(queue, fin + 12), positionRep = u32(queue, fin + 16)
  if (positionRep + tailleRep > ici) return null
  const rep = await lire(positionRep, positionRep + tailleRep)
  const entrees: EntreeArchive[] = []
  let p = 0
  for (let k = 0; k < nombre; k++) {
    if (p + TETE_CENTRALE > rep.length || u32(rep, p) !== CENTRAL) return null
    const methode = u16(rep, p + 10), crc = u32(rep, p + 16), tailleArchive = u32(rep, p + 20), tailleReelle = u32(rep, p + 24)
    const ln = u16(rep, p + 28), le = u16(rep, p + 30), lc = u16(rep, p + 32), position = u32(rep, p + 42)
    if (p + TETE_CENTRALE + ln > rep.length) return null
    const nom = new TextDecoder().decode(rep.subarray(p + TETE_CENTRALE, p + TETE_CENTRALE + ln))
    p += TETE_CENTRALE + ln + le + lc
    // Les données : après l'en-tête local, dont le nom et le champ
    // supplémentaire peuvent différer de ceux du répertoire
    if (position + TETE_LOCALE > ici) return null
    const tete = await lire(position, position + TETE_LOCALE)
    if (u32(tete, 0) !== LOCAL) return null
    const d = position + TETE_LOCALE + u16(tete, 26) + u16(tete, 28)
    if (d + tailleArchive > ici) return null
    entrees.push({ nom, methode, crc, taille: tailleReelle, tailleArchive, position, debut: d })
  }
  return entrees
}

/** Le repli : les en-têtes locaux, l'un après l'autre, depuis le début ;
 *  chacun dit sa taille, on saute ses données. On s'arrête au premier qui
 *  n'en est pas un, qui n'a pas sa taille (un descripteur de données : un
 *  zip qui n'est pas de nous), ou dont les données dépassent le bout. */
async function parLesEnTetes(lire: LireOctets, taille: number): Promise<EntreeArchive[]> {
  const entrees: EntreeArchive[] = []
  let p = 0
  while (p + TETE_LOCALE <= taille && entrees.length < MAX_ENTREES) {
    const t = await lire(p, p + TETE_LOCALE)
    if (u32(t, 0) !== LOCAL) break
    const drapeaux = u16(t, 6), methode = u16(t, 8), crc = u32(t, 14), tailleArchive = u32(t, 18), tailleReelle = u32(t, 22)
    const ln = u16(t, 26), le = u16(t, 28)
    if (drapeaux & 0x08) break
    const d = p + TETE_LOCALE + ln + le
    if (d + tailleArchive > taille) break
    const nom = new TextDecoder().decode(await lire(p + TETE_LOCALE, p + TETE_LOCALE + ln))
    entrees.push({ nom, methode, crc, taille: tailleReelle, tailleArchive, position: p, debut: d })
    p = d + tailleArchive
  }
  return entrees
}

/** Les octets d'une petite entrée (l'index, un aperçu), vérifiés : stockée,
 *  de la bonne taille, de la bonne somme. null : elle ne se lit pas. Les
 *  classeurs, eux, se vérifient dans le travailleur (voir ecrivain.ts). */
export async function lireEntree(lire: LireOctets, e: EntreeArchive): Promise<Uint8Array | null> {
  if (e.methode !== 0 || e.taille !== e.tailleArchive) return null
  const o = await lire(e.debut, e.debut + e.tailleArchive)
  return o.length === e.taille && crc32(o) === e.crc ? o : null
}

// ---------- L'index ----------
export interface DossierArchive { id: string; nom: string; parent: string | null; couleur: string; etiquette?: string; cree: number }
export interface ClasseurArchive { id: string; nom: string; dossier: string | null; etiquettes: string[]; cree: number; modifie: number; pages: number; fichier: string; apercu?: string }
/** bibliotheque.json : sans vecteurs (les comparaisons se calculent à
 *  l'ouverture, par le travailleur, sur les .memc eux-mêmes) */
export interface IndexBibliotheque {
  format: typeof FORMAT_BIBLIOTHEQUE; v: number; app: string; date: number
  dossiers: DossierArchive[]
  classeurs: ClasseurArchive[]
}

/** L'index d'une bibliothèque : ses dossiers, ses classeurs (leurs étiquettes
 *  propres : l'héritée se recalcule, elle vient du dossier), où sont leurs
 *  fichiers ; aApercu : ceux qui ont une image */
export function indexDe(classeurs: readonly FicheClasseur[], dossiers: readonly FicheDossier[], date: number, aApercu: (id: string) => boolean): IndexBibliotheque {
  return {
    format: FORMAT_BIBLIOTHEQUE, v: VERSION_BIBLIOTHEQUE, app: APP, date,
    dossiers: dossiers.map(d => ({ id: d.id, nom: d.nom, parent: d.parent, couleur: d.couleur, ...(d.etiquette ? { etiquette: d.etiquette } : {}), cree: d.cree })),
    classeurs: classeurs.map(f => ({
      id: f.id, nom: f.nom, dossier: f.dossier, etiquettes: [...(f.etiquettes ?? [])], cree: f.cree, modifie: f.modifie,
      pages: f.pages ?? 0, fichier: cheminClasseur(f.id), ...(aApercu(f.id) ? { apercu: cheminApercu(f.id) } : {}),
    })),
  }
}

const chaine = (x: unknown): x is string => typeof x === 'string' && x.length > 0
const nombre = (x: unknown, repli = 0) => typeof x === 'number' && Number.isFinite(x) ? x : repli

/** Relit bibliotheque.json. Lève ErreurArchive 'pas-une-bibliotheque' (un
 *  autre format, du texte illisible) ou 'plus-recente' (v > 1). Ce qui n'a
 *  pas la bonne forme est laissé de côté ; le reste est rendu tel quel (les
 *  noms et les étiquettes se nettoient à l'ajout). */
export function lireIndex(octets: Uint8Array): IndexBibliotheque {
  let o: unknown
  try { o = JSON.parse(new TextDecoder().decode(octets)) } catch { throw new ErreurArchive('pas-une-bibliotheque', PAS_UNE_BIBLIOTHEQUE) }
  const x = o as Record<string, unknown> | null
  if (!x || typeof x !== 'object' || x.format !== FORMAT_BIBLIOTHEQUE || typeof x.v !== 'number') throw new ErreurArchive('pas-une-bibliotheque', PAS_UNE_BIBLIOTHEQUE)
  if (x.v > VERSION_BIBLIOTHEQUE) throw new ErreurArchive('plus-recente', PLUS_RECENTE)
  const dossiers: DossierArchive[] = []
  for (const d of Array.isArray(x.dossiers) ? x.dossiers : []) {
    if (!d || typeof d !== 'object' || !chaine(d.id) || typeof d.nom !== 'string') continue
    dossiers.push({ id: d.id, nom: d.nom, parent: chaine(d.parent) ? d.parent : null, couleur: typeof d.couleur === 'string' ? d.couleur : '', ...(chaine(d.etiquette) ? { etiquette: d.etiquette } : {}), cree: nombre(d.cree) })
  }
  const classeurs: ClasseurArchive[] = []
  for (const c of Array.isArray(x.classeurs) ? x.classeurs : []) {
    if (!c || typeof c !== 'object' || !chaine(c.fichier)) continue
    classeurs.push({
      id: typeof c.id === 'string' ? c.id : '', nom: typeof c.nom === 'string' ? c.nom : '', dossier: chaine(c.dossier) ? c.dossier : null,
      etiquettes: Array.isArray(c.etiquettes) ? c.etiquettes.filter((e: unknown): e is string => typeof e === 'string') : [],
      cree: nombre(c.cree), modifie: nombre(c.modifie), pages: nombre(c.pages), fichier: c.fichier, ...(chaine(c.apercu) ? { apercu: c.apercu } : {}),
    })
  }
  return { format: FORMAT_BIBLIOTHEQUE, v: x.v, app: typeof x.app === 'string' ? x.app : '', date: nombre(x.date), dossiers, classeurs }
}

const deux = (n: number) => String(n).padStart(2, '0')
/** « Bibliothèque 2026-10-10 14h05.memb », à l'heure de l'ordinateur */
export function nomBibliotheque(t = Date.now()): string {
  const d = new Date(t)
  return `Bibliothèque ${d.getFullYear()}-${deux(d.getMonth() + 1)}-${deux(d.getDate())} ${deux(d.getHours())}h${deux(d.getMinutes())}${EXTENSION_BIBLIOTHEQUE}`
}

/** Le fichier commence comme un zip (« PK\x03\x04 ») : une bibliothèque, pas un .memc */
export const estUneArchive = (debut: Uint8Array) => debut.length >= 4 && u32(debut, 0) === LOCAL
