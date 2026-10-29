// =============================================================
// VÉRIFIER LES CLASSEURS : LES IMAGES QUI MANQUENT (lot 17, un modèle pur)
// Les pixels d'une image vivent dans la banque du classeur (la carte Yjs
// « images » : une clé → les données « data:image/… »), et une forme image
// ne porte que sa clé (src). Quand la banque n'a pas les données d'une clé
// qu'une page montre, la page peint un cadre gris à sa place. C'est arrivé
// aux séances déplacées vers un autre classeur avant le 28 octobre 2026 :
// elles partaient sans leurs images, restées dans le classeur d'origine.
//
// Ce fichier calcule, sans rien lire ni écrire lui-même :
// - l'INVENTAIRE d'un classeur : les clés que ses formes montrent (toutes
//   ses pages, la corbeille des pages comprise) et celles que sa banque a ;
// - le BILAN de la bibliothèque : pour chaque classeur visible auquel il
//   manque des images, où chaque image se retrouve (les classeurs visibles
//   d'abord, la corbeille ensuite, le plus récemment modifié d'abord), ce
//   qui est introuvable, les classeurs qui n'ont pas pu être lus ;
// - les DERNIÈRES COPIES avant un effacement : les images qu'un classeur
//   qui reste montre sans les avoir, et dont la seule copie est dans un
//   classeur qu'on va effacer (à recopier avant d'effacer) ;
// - les textes de la fenêtre « Vérifier les classeurs » et des messages.
// Les textes de la question de la corbeille sont dans corbeille.ts.
//
// Ce qui n'est pas compté : une image qu'une forme effacée depuis montrait
// (la revue d'une séance passée la montre encore) ; l'inventaire lit les
// formes d'aujourd'hui, comme la récupération à l'ouverture depuis le lot 9.
// Ce fichier est pur (sans DOM ni IndexedDB) : il se teste sous Node.
// =============================================================
import * as Y from 'yjs'
import type { Tableau } from '../document'
import type { Forme } from '../types'

/** Les images d'un classeur : celles que ses formes montrent (les clés des
 *  formes image de toutes ses pages, la corbeille des pages comprise) et
 *  celles dont sa banque a les données */
export interface Inventaire { utilisees: string[]; presentes: string[] }

/** Une entrée de la banque qui a bien des données d'image */
export const estImage = (d: unknown): d is string => typeof d === 'string' && d.startsWith('data:image/')

/** Les clés que montrent les formes image de ces pages (chacune une fois) */
function utiliseesDe(pages: Y.Map<unknown>): string[] {
  const vues = new Set<string>()
  pages.forEach(p => {
    const formes = p instanceof Y.Map ? p.get('formes') : null
    if (!(formes instanceof Y.Map)) return
    formes.forEach((f: unknown) => {
      const x = f as Forme | null
      if (x && x.type === 'image' && typeof x.src === 'string') vues.add(x.src)
    })
  })
  return [...vues]
}

/** Les clés de la banque qui ont des données d'image */
function presentesDe(banque: Y.Map<unknown>): string[] {
  const r: string[] = []
  banque.forEach((d, k) => { if (estImage(d)) r.push(k) })
  return r
}

/** L'inventaire d'un document de classeur (un Y.Doc nu rejoué, ou celui
 *  d'un Tableau) */
export function inventaireDuDoc(doc: Y.Doc): Inventaire {
  return { utilisees: utiliseesDe(doc.getMap('pages')), presentes: presentesDe(doc.getMap('images')) }
}

/** L'inventaire du classeur ouvert dans l'onglet (ce qu'on vient d'écrire compte) */
export const inventaireDuTableau = (tab: Tableau): Inventaire => inventaireDuDoc(tab.doc)

/** Les images qu'un classeur montre sans les avoir */
export function manquantes(inv: Inventaire): string[] {
  const a = new Set(inv.presentes)
  return inv.utilisees.filter(k => !a.has(k))
}

/** L'inventaire d'une base lue sans ouvrir le classeur (ce que fait le
 *  travailleur, voir ecrivain-taches.ts : la demande « images ») : ses mises
 *  à jour rejouées dans un Y.Doc nu, puis détruit ; donnees : les clés
 *  dont on veut aussi les données (celles qu'on va recopier), rendues
 *  seulement si la banque les a. null : ces octets ne font pas un document. */
export function inventaireDesMisesAJour(mises: readonly Uint8Array[], donnees?: readonly string[]): (Inventaire & { donnees: Record<string, string> }) | null {
  if (!mises.length) return null
  const doc = new Y.Doc({ gc: false })
  try {
    try { Y.applyUpdate(doc, mises.length === 1 ? mises[0] : Y.mergeUpdates([...mises])) } catch { return null }
    const inv = inventaireDuDoc(doc)
    const banque = doc.getMap('images')
    const d: Record<string, string> = {}
    for (const k of donnees ?? []) { const v = banque.get(k); if (estImage(v)) d[k] = v }
    return { ...inv, donnees: d }
  } finally { doc.destroy() }
}

// ---------- Le bilan de la bibliothèque ----------
/** Un classeur de la bibliothèque et son inventaire (null : il n'a pas pu
 *  être lu) ; corbeille : lui ou l'un de ses dossiers est à la corbeille */
export interface ClasseurInventorie { id: string; nom: string; base: string; chemin: string; corbeille: boolean; modifie: number; inv: Inventaire | null }

/** Un classeur où une image se retrouve */
export interface Source { id: string; nom: string; base: string; corbeille: boolean }
export const sourceDe = (c: ClasseurInventorie): Source => ({ id: c.id, nom: c.nom, base: c.base, corbeille: c.corbeille })

/** Les classeurs dans l'ordre où l'on préfère y lire une image : les
 *  visibles d'abord, la corbeille ensuite, le plus récemment modifié d'abord */
export function ordonnes(classeurs: readonly ClasseurInventorie[]): ClasseurInventorie[] {
  return [...classeurs].sort((a, b) => (a.corbeille ? 1 : 0) - (b.corbeille ? 1 : 0) || b.modifie - a.modifie || (a.id < b.id ? -1 : 1))
}

/** Où se retrouve cette image, hors du classeur sauf (dans l'ordre ci-dessus) */
export function ouSeTrouve(src: string, classeurs: readonly ClasseurInventorie[], sauf: string): Source[] {
  return ordonnes(classeurs).filter(c => c.id !== sauf && c.inv !== null && c.inv.presentes.includes(src)).map(sourceDe)
}

/** Une ligne de la fenêtre : un classeur visible auquel il manque des
 *  images (ou qui n'a pas pu être lu) */
export interface LigneBilan {
  id: string; nom: string; base: string; chemin: string
  /** Le classeur n'a pas pu être lu (rien d'autre n'est su) */
  illisible: boolean
  manquantes: string[]
  /** Où chaque image manquante se retrouve (les retrouvables seulement) */
  sources: Map<string, Source[]>
  retrouvables: string[]
  introuvables: string[]
}

/** Le bilan : combien de classeurs ont été vérifiés (la corbeille comprise),
 *  les lignes (les classeurs visibles auxquels il manque des images, le plus
 *  récemment modifié d'abord, puis ceux qui n'ont pas pu être lus), leurs
 *  nombres. Un classeur à la corbeille n'a pas de ligne : on le répare
 *  après l'avoir remis. */
export interface Bilan { verifies: number; lignes: LigneBilan[]; manques: number; illisibles: number }

export function bilan(classeurs: readonly ClasseurInventorie[]): Bilan {
  const tries = ordonnes(classeurs)
  const presentes = new Map(tries.map(c => [c.id, new Set(c.inv?.presentes ?? [])]))
  const lignes: LigneBilan[] = []
  const illisibles: LigneBilan[] = []
  for (const c of tries) {
    if (c.corbeille) continue
    const ligne = { id: c.id, nom: c.nom, base: c.base, chemin: c.chemin }
    if (!c.inv) { illisibles.push({ ...ligne, illisible: true, manquantes: [], sources: new Map(), retrouvables: [], introuvables: [] }); continue }
    const m = manquantes(c.inv)
    if (!m.length) continue
    const sources = new Map<string, Source[]>()
    const retrouvables: string[] = [], introuvables: string[] = []
    for (const src of m) {
      const l = tries.filter(x => x.id !== c.id && presentes.get(x.id)!.has(src)).map(sourceDe)
      if (l.length) { sources.set(src, l); retrouvables.push(src) } else introuvables.push(src)
    }
    lignes.push({ ...ligne, illisible: false, manquantes: m, sources, retrouvables, introuvables })
  }
  return { verifies: classeurs.length, lignes: [...lignes, ...illisibles], manques: lignes.length, illisibles: illisibles.length }
}

// ---------- Avant d'effacer ----------
/** Les images à recopier dans un classeur qui reste, et d'où */
export interface CopieAFaire { vers: ClasseurInventorie; images: { src: string; depuis: ClasseurInventorie }[] }

/** Avant d'effacer les classeurs aEffacer : les images qu'un classeur qui
 *  reste montre sans les avoir, et dont la seule copie est dans un classeur
 *  qu'on va effacer (le plus récemment modifié d'entre eux). Une copie
 *  encore présente dans un classeur qui reste : rien à faire (« Vérifier
 *  les classeurs » la remettra). Un classeur qu'on efface et qui est seul à
 *  montrer l'image : rien non plus. */
export function dernieresCopies(classeurs: readonly ClasseurInventorie[], aEffacer: ReadonlySet<string>): CopieAFaire[] {
  const tries = ordonnes(classeurs)
  const restants = tries.filter(c => !aEffacer.has(c.id) && c.inv !== null)
  const partants = tries.filter(c => aEffacer.has(c.id) && c.inv !== null)
  const presentes = new Map(tries.map(c => [c.id, new Set(c.inv?.presentes ?? [])]))
  const resteAilleurs = (src: string) => restants.some(c => presentes.get(c.id)!.has(src))
  const r: CopieAFaire[] = []
  for (const c of restants) {
    const images: CopieAFaire['images'] = []
    for (const src of manquantes(c.inv!)) {
      if (resteAilleurs(src)) continue
      const depuis = partants.find(p => presentes.get(p.id)!.has(src))
      if (depuis) images.push({ src, depuis })
    }
    if (images.length) r.push({ vers: c, images })
  }
  return r
}

// ---------- Les textes ----------
const s = (n: number) => (n > 1 ? 's' : '')

/** « « A » », « « A » et « B » », « « A », « B » et « C » » */
export const lister = (libelles: readonly string[]): string =>
  libelles.length <= 1 ? libelles.join('') : `${libelles.slice(0, -1).join(', ')} et ${libelles[libelles.length - 1]}`
export const nomsLisibles = (noms: readonly string[]): string => lister(noms.map(n => `« ${n} »`))

/** La ligne d'état pendant la vérification : « Vérification… 12 classeurs sur 30 » */
export const texteVerification = (fait: number, total: number) => `Vérification… ${fait} classeur${s(fait)} sur ${total}`

/** La ligne d'état à la fin : « 30 classeurs vérifiés : 2 ont des images qui
 *  manquent. », « … : aucune image ne manque. », et « 1 n'a pas pu être
 *  lu. » s'il y a lieu */
export function texteBilan(b: { verifies: number; manques: number; illisibles: number }): string {
  const v = `${b.verifies} classeur${s(b.verifies)} vérifié${s(b.verifies)}`
  const m = b.manques ? `${b.manques} ${b.manques > 1 ? 'ont' : 'a'} des images qui manquent.` : 'aucune image ne manque.'
  const i = b.illisibles ? ` ${b.illisibles} n'${b.illisibles > 1 ? 'ont' : 'a'} pas pu être lu${s(b.illisibles)}.` : ''
  return `${v} : ${m}${i}`
}

export const ILLISIBLE = 'Ce classeur n\'a pas pu être lu.'

/** Les classeurs où l'on lira les images d'une ligne (le premier de chaque
 *  image, chacun une fois) : « « Symétrie » (corbeille) » */
export function sourcesDeLaLigne(l: LigneBilan): Source[] {
  const vus = new Map<string, Source>()
  for (const src of l.retrouvables) { const x = l.sources.get(src)?.[0]; if (x && !vus.has(x.id)) vus.set(x.id, x) }
  return [...vus.values()]
}
const libelleSource = (x: Source) => `« ${x.nom} »${x.corbeille ? ' (corbeille)' : ''}`

/** Le détail d'une ligne : « 2 images manquantes, retrouvées dans « Symétrie »
 *  (corbeille) », « 3 images manquantes : 2 retrouvées dans « Symétrie »,
 *  1 introuvable dans ce navigateur », « 1 image introuvable dans ce
 *  navigateur », « Ce classeur n'a pas pu être lu. » */
export function texteLigne(l: LigneBilan): string {
  if (l.illisible) return ILLISIBLE
  const n = l.manquantes.length, r = l.retrouvables.length, i = l.introuvables.length
  const ou = `dans ${lister(sourcesDeLaLigne(l).map(libelleSource))}`
  if (!i) return `${n} image${s(n)} manquante${s(n)}, retrouvée${s(n)} ${ou}`
  if (!r) return `${n} image${s(n)} introuvable${s(n)} dans ce navigateur`
  return `${n} images manquantes : ${r} retrouvée${s(r)} ${ou}, ${i} introuvable${s(i)} dans ce navigateur`
}

/** Sous une ligne qui a des images introuvables : le chemin pour les retrouver */
export const texteIntrouvable = (n: number) =>
  `Pour ${n > 1 ? 'les' : 'la'} retrouver : ouvrez un fichier .memc plus ancien de ce classeur (Ouvrir…, ou Récupérer une sauvegarde du Drive…), puis vérifiez de nouveau.`

/** Après Réparer : « Réparé : 2 images remises. », « Réparé : 2 images
 *  remises, 1 reste introuvable. » ; rien remis : « Rien n'a été remis. » */
export function texteRepare(remises: number, introuvables: number): string {
  if (!remises) return 'Rien n\'a été remis.'
  const reste = introuvables ? `, ${introuvables} reste${introuvables > 1 ? 'nt' : ''} introuvable${s(introuvables)}` : ''
  return `Réparé : ${remises} image${s(remises)} remise${s(remises)}${reste}.`
}

/** Le message du bas après une réparation : « 2 images remises dans
 *  « Fractions » (depuis « Symétrie »). » */
export const texteRemises = (n: number, nom: string, depuis: readonly string[]) =>
  `${n} image${s(n)} remise${s(n)} dans « ${nom} »${depuis.length ? ` (depuis ${nomsLisibles(depuis)})` : ''}.`

/** À l'ouverture d'un classeur, ce qui a été retrouvé : « 2 images
 *  retrouvées dans « Symétrie », « Fractions ». » (le texte du lot 9) */
export const texteRetrouvees = (n: number, depuis: readonly string[]) =>
  `${n > 1 ? `${n} images retrouvées` : '1 image retrouvée'} dans ${depuis.map(x => `« ${x} »`).join(', ')}.`

/** … et ce qui reste introuvable : « 1 image de ce classeur est introuvable
 *  dans ce navigateur. » */
export const texteIntrouvableIci = (n: number) =>
  `${n} image${s(n)} de ce classeur ${n > 1 ? 'sont' : 'est'} introuvable${s(n)} dans ce navigateur.`

/** Le bouton de ce message, et l'entrée du menu ⋯ de la bibliothèque */
export const VERIFIER_LES_CLASSEURS = 'Vérifier les classeurs…'
export const AIDE_VERIFIER = 'Les images qui manquent (un cadre gris sur une page), retrouvées dans les autres classeurs et remises à leur place.'
