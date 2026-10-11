// =============================================================
// L'ÉCRIVAIN, SA PARTIE PURE : LE FICHIER D'UN CLASSEUR, DEPUIS SA BASE
// Le fichier .memc d'un classeur se fabrique depuis ce que garde sa base
// (les mises à jour Yjs que y-indexeddb y a rangées), pas depuis le
// document en mémoire : on peut le faire hors du fil principal, dans un
// travailleur (voir ecrivain.ts), sans jamais geler l'écriture au stylet.
// Mesuré sur 60 pages de 300 traits : encodeStateAsUpdate gèle 1,1 s et
// gzip 0,5 s sur le fil principal ; dans un travailleur, la fusion et la
// vérification prennent 2,1 s, sans rien geler.
//
// fabriquer : la fusion (Y.mergeUpdates), la vérification de lireTableau
// (le document rejoué en entier, sans morceau en attente, chaque page de
// l'ordre avec ses formes : une base trouée ou abîmée ne fait jamais un
// fichier qu'on ne pourrait pas rouvrir), l'en-tête avec ces pages, le
// gzip, le vecteur d'état (ce que la clé et le Drive compareront) et la
// somme CRC-32 du fichier entier. Avec lisible (le classeur ouvert est une
// base trouée relue, voir Tableau.incomplet ; ou un geste du professeur qui
// enregistre un classeur sans l'ouvrir), une base dont des changements
// attendent une mise à jour qui manque donne le fichier de ce qui s'en
// relit, et le dit (incomplet) : il se rouvrira.
//
// preparerCopie (« Dupliquer le classeur », lot 4 C7 ; « Ajouter comme
// copie », C9) : la même fusion et la même vérification, le document rejoué
// une fois, et une petite mise à jour qui vide le registre des publications
// de la copie et la marque comme copie (voir plus bas).
// Pur (yjs et fflate seulement) : se teste sous Node.
// =============================================================
import * as Y from 'yjs'
import { CARTE_COPIE, ErreurFichier, PAS_ECRIT_ABIME, crc32, enAttente, etatLisible, fichierDeLEtat, verifierDocument, verifierEtat } from '../fichier'

export const TEXTE_ABIMEE = PAS_ECRIT_ABIME

/** Ce que l'en-tête du fichier dira, en plus des pages (comptées ici) */
export interface EnteteDemandee { date: number; nom?: string; id?: string }

/** Le fichier fabriqué : ses octets (l'en-tête puis le document compressé),
 *  le nombre de pages de l'ordre, le vecteur d'état du document, la somme
 *  CRC-32 des octets ; incomplet : seulement ce qui se relit de la base
 *  (voir fabriquer, lisible) */
export interface Fabrique { octets: Uint8Array; pages: number; vecteur: Uint8Array; crc: number; incomplet?: boolean }

/** Le fichier d'un classeur, depuis les mises à jour de sa base. Lève une
 *  ErreurFichier de raison 'abimee' (TEXTE_ABIMEE) si elles ne font pas un
 *  document entier : rien n'est écrit. lisible : une base trouée relue (des
 *  changements y attendent une mise à jour qui manque, voir
 *  Tableau.incomplet) donne quand même un fichier, de ce qui s'en relit
 *  (fichier.etatLisible), avec incomplet : le fichier se rouvrira, et qui
 *  l'a demandé le dit. Jamais un fichier que lireTableau refuserait. */
export function fabriquer(misesAJour: readonly Uint8Array[], entete: EnteteDemandee, o: { lisible?: boolean } = {}): Fabrique {
  let etat: Uint8Array
  let pages: number
  let incomplet = false
  try {
    etat = misesAJour.length === 1 ? misesAJour[0] : Y.mergeUpdates([...misesAJour])
  } catch { throw new ErreurFichier(TEXTE_ABIMEE, 'abimee') }
  try { pages = verifierEtat(etat) } catch {
    if (!o.lisible) throw new ErreurFichier(TEXTE_ABIMEE, 'abimee')
    const doc = new Y.Doc({ gc: false })
    try {
      Y.applyUpdate(doc, etat)
      // Abîmée autrement (une page sans ses formes) : rien
      if (!enAttente(doc)) throw new Error('abîmée')
      const l = etatLisible(doc)
      etat = l.etat; pages = l.pages; incomplet = true
    } catch { throw new ErreurFichier(TEXTE_ABIMEE, 'abimee') } finally { doc.destroy() }
  }
  if (!pages) throw new ErreurFichier(TEXTE_ABIMEE, 'abimee')
  const octets = fichierDeLEtat(etat, pages, entete.date, entete)
  const f: Fabrique = { octets, pages, vecteur: Y.encodeStateVectorFromUpdate(etat), crc: crc32(octets) }
  if (incomplet) f.incomplet = true
  return f
}

/** Ce que contient la base d'un classeur, sans rien y écrire (la bibliothèque
 *  décide d'adopter une base sans fiche, voir classeurs/corbeille.ts,
 *  estVide) : ses mises à jour (entrees), un document incomplet (des
 *  morceaux en attente : un trou), les pages de l'ordre, les formes de
 *  TOUTES les pages (celles de la corbeille des pages comprises), les étapes
 *  du film, la piste des instruments, le registre des publications, les noms
 *  des pages, la corbeille des pages, la date de la première et de la
 *  dernière étape du film (0 : pas de film), son vecteur d'état */
export interface ExamenBase {
  entrees: number; incomplet: boolean
  pages: number; formes: number; film: number; piste: number; publications: number; noms: number; corbeille: number
  cree: number; modifie: number; vecteur: Uint8Array
}

/** Examine les mises à jour d'une base (un Y.Doc nu, rejoué une fois, puis
 *  détruit). Ne lève jamais : des octets illisibles font un document
 *  « incomplet », qui n'est jamais vide. */
export function examinerMisesAJour(misesAJour: readonly Uint8Array[]): ExamenBase {
  const r: ExamenBase = { entrees: misesAJour.length, incomplet: false, pages: 0, formes: 0, film: 0, piste: 0, publications: 0, noms: 0, corbeille: 0, cree: 0, modifie: 0, vecteur: new Uint8Array([0]) }
  if (!misesAJour.length) return r
  const doc = new Y.Doc({ gc: false })
  try {
    try {
      Y.applyUpdate(doc, misesAJour.length === 1 ? misesAJour[0] : Y.mergeUpdates([...misesAJour]))
    } catch { r.incomplet = true; return r }
    const store = doc.store as unknown as { pendingStructs: unknown; pendingDs: unknown }
    if (store.pendingStructs || store.pendingDs) r.incomplet = true
    r.pages = doc.getArray('ordre').length
    doc.getMap('pages').forEach(p => {
      const formes = p instanceof Y.Map ? p.get('formes') : null
      if (formes instanceof Y.Map) r.formes += formes.size
    })
    const film = doc.getArray<{ t?: number }>('film')
    r.film = film.length
    film.forEach(e => {
      const t = e?.t
      if (typeof t !== 'number' || !Number.isFinite(t) || t <= 0) return
      if (!r.cree || t < r.cree) r.cree = t
      if (t > r.modifie) r.modifie = t
    })
    r.piste = doc.getArray('piste').length
    r.publications = doc.getMap('publications').size
    r.noms = doc.getMap('nomsPages').size
    r.corbeille = doc.getMap('corbeille').size
    r.vecteur = Y.encodeStateVector(doc)
    return r
  } finally { doc.destroy() }
}

/** Une base qui ne fait pas un document entier ne se duplique pas */
export const TEXTE_ABIMEE_COPIE = 'Le classeur de ce navigateur semble abîmé : il n\'a pas été dupliqué.'

/** Ce qu'il faut écrire dans la base de la copie : l'état complet (la
 *  fusion de la base d'origine, toute son histoire), puis la petite mise à
 *  jour qui vide le registre des publications et marque la copie ; ses
 *  pages, combien de publications ont été retirées, son vecteur d'état */
export interface Copie { etat: Uint8Array; vidage: Uint8Array; pages: number; publications: number; vecteur: Uint8Array }

/** La copie complète d'un classeur, depuis les mises à jour de sa base (ou
 *  l'état d'un fichier). Toute l'histoire est gardée (la revue et le replay
 *  de la copie la montrent se construire), sauf le registre des
 *  publications (doc.getMap('publications')), vidé, et avec la marque de
 *  copie (fichier.CARTE_COPIE : { id, t }, id celui de la copie), dans UNE
 *  transaction. Les séances de la copie ont la même heure de début que
 *  celles de l'original, donc la même clé « compte:début de la séance »
 *  (voir publication/fenetre.ts) : avec le registre de l'original, Publier
 *  mettrait à jour son fichier Drive ; sans registre mais sans marque, il le
 *  retrouverait sur le Drive par cette clé. Les deux fois, le lien déjà
 *  donné à l'autre classe montrerait la copie. Avec la marque, la copie
 *  publie ses séances sous une clé à elle : un nouveau lien. Toujours, même
 *  sans séance publiée : l'original peut publier après la copie. Hors des
 *  pages : ni une étape du film, ni une annulation (le document est un Y.Doc
 *  nu, sans Tableau, sans UndoManager). La base d'origine n'est que lue.
 *  Lève une ErreurFichier 'abimee' si elle ne fait pas un document entier. */
export function preparerCopie(misesAJour: readonly Uint8Array[], o: { id: string }): Copie {
  if (!misesAJour.length) throw new ErreurFichier(TEXTE_ABIMEE_COPIE, 'abimee')
  const doc = new Y.Doc({ gc: false })
  try {
    let etat: Uint8Array
    let pages: number
    try {
      etat = misesAJour.length === 1 ? misesAJour[0] : Y.mergeUpdates([...misesAJour])
      Y.applyUpdate(doc, etat)
      pages = verifierDocument(doc)
    } catch { throw new ErreurFichier(TEXTE_ABIMEE_COPIE, 'abimee') }
    if (!pages) throw new ErreurFichier(TEXTE_ABIMEE_COPIE, 'abimee')
    const registre = doc.getMap('publications')
    const publications = registre.size
    const avant = Y.encodeStateVector(doc)
    doc.transact(() => {
      for (const k of [...registre.keys()]) registre.delete(k)
      const marque = doc.getMap(CARTE_COPIE)
      marque.set('id', o.id)
      marque.set('t', Date.now())
    }, 'copie')
    const vidage = Y.encodeStateAsUpdate(doc, avant)
    return { etat, vidage, pages, publications, vecteur: Y.encodeStateVector(doc) }
  } finally { doc.destroy() }
}
