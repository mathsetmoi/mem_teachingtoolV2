// =============================================================
// CE QUE FAIT L'ÉCRIVAIN : LES DEMANDES ET LEURS RÉPONSES
// Le même code tourne dans le travailleur (ecrivain.worker.ts) et, s'il
// ne démarre pas, sur le fil principal (ecrivain.ts, mode 'fil'). Une
// demande est numérotée (n) ; sa réponse porte le même numéro, et soit son
// résultat, soit une erreur typée :
// - absente : la base n'existe pas (elle n'a pas été créée pour le savoir) ;
// - abimee : la base n'a pas de magasin, ou ses mises à jour ne font pas
//   un document entier (un trou, des octets abîmés) ;
// - indisponible : IndexedDB manque ou est refusé (dans le travailleur) ;
// - illisible : le fichier à lire n'est pas un classeur qu'on sait ouvrir
//   (son message, celui de lireTableau, se montre tel quel) ;
// - fil : la demande ne devait tourner que dans le travailleur, et il n'y
//   en a pas (voir ecrivain.ts : les écritures automatiques) ;
// - autre : le reste.
// Genres :
// - 'fichier' : le .memc d'un classeur, depuis sa base (ecrivain-pur.ts) ;
//   lisible : d'une base trouée relue, ce qui s'en relit (la réponse le
//   dit : incomplet) ;
// - 'vecteur' : le vecteur d'état d'une base (ce qu'elle contient, pour la
//   comparer à un fichier : voir vecteurs.ts) ;
// - 'lire' : un fichier .memc lu et vérifié en entier (lireTableau), hors
//   du fil principal : son en-tête, son état (transféré, sans copie), ses
//   pages et son vecteur d'état.
// - 'copier' (« Dupliquer le classeur », lot 4 C7) : la base d'un classeur
//   lue (jamais écrite), fusionnée, vérifiée, rejouée une fois, son registre
//   des publications vidé et la copie marquée (ecrivain-pur.preparerCopie,
//   avec l'id de la copie : ses séances auront leur propre lien), puis la base de la
//   copie créée comme creerBase la crée (rejet 'existante' sans rien
//   effacer ; 'custom' : l'identité de la copie). Erreurs en plus : place
//   (plus de place dans le navigateur), existante ; creee : la base de la
//   copie a été créée, vide, avant l'échec (à effacer par qui l'a demandée).
// - 'examiner' (lot 4 C8, l'adoption des bases sans fiche) : la base lue
//   (jamais écrite, jamais créée), rejouée dans un Y.Doc nu, et ce qu'elle
//   contient compté (ecrivain-pur.examinerMisesAJour), avec l'identité
//   rangée à côté ('custom') : une base de 27 Mo ne gèle rien.
// - 'lire' avec une somme (lot 4 C9) : une entrée d'une bibliothèque
//   (.memb), une tranche du fichier ; sa somme CRC-32 est vérifiée ici,
//   avant tout (une entrée abîmée est 'illisible', avec ABIME_ENTREE).
// - 'mettre-a-jour' (lot 4 C9, « Mettre à jour le classeur » depuis un
//   fichier plus récent, SANS RIEN PERDRE) : UNE transaction readwrite sur
//   'updates' ; dans le rappel de son getAll, les mises à jour de la base
//   sont fusionnées et son vecteur calculé. S'il est encore contenu dans
//   celui du fichier (le fichier a tout ce qu'a la base), l'état du fichier
//   y est AJOUTÉ (add, jamais clear : la fusion vaut le fichier) ; sinon
//   (un autre onglet a écrit entre-temps, chacun a changé de son côté) rien
//   n'est écrit, et la réponse le dit (misAJour faux, la comparaison).
// - 'creer' (lot 4 C9, un classeur ajouté depuis un fichier) : la base d'un
//   nouveau classeur créée comme creerBase la crée, avec l'état d'un fichier
//   lu (rejet 'existante' sans rien toucher ; 'place', creee : la base,
//   créée vide, est à effacer par qui l'a demandée). Hors du fil principal :
//   ranger 18 Mo dans IndexedDB y prenait près de 100 ms (mesuré). Avec
//   copie (« Ajouter comme copie », un classeur de même origine dans la
//   corbeille : un id neuf, l'original reste ici), la base se crée comme
//   celle de « Dupliquer » : l'état du fichier, puis la petite mise à jour
//   qui vide le registre des publications et marque la copie
//   (ecrivain-pur.preparerCopie) ;
//   la réponse dit combien de séances publiées ont été retirées, et le
//   vecteur d'état de la copie.
// - 'preparer-copie' (« Remplacer » le classeur ouvert par le fichier d'un
//   classeur qui reste ici, dans la corbeille : il prend un id neuf, c'est
//   une copie) : l'état du fichier rejoué une fois, et la petite mise à jour
//   qui vide le registre des publications et marque la copie
//   (ecrivain-pur.preparerCopie), rendus sans rien écrire : le classeur
//   ouvert les range lui-même dans sa base (Tableau.remplacerPar). Hors du
//   fil principal : rejouer 18 Mo gèlerait la page.
// La base est lue d'une traite (lireMisesAJour : ouverte sans jamais être
// créée, refermée aussitôt, et refermée d'elle-même si un autre onglet
// veut l'effacer) : l'écrivain ne bloque jamais l'effacement d'un classeur.
// Pour qu'il ne le bloque pas non plus en calculant (lot 4 C8, mesuré :
// deux demandes mêlées, l'une fusionne 30 pages pendant que l'autre tient sa
// base ouverte ; son « versionchange » n'est traité qu'après le calcul, et
// l'effacement est bloqué), aucun calcul ne commence tant qu'une base est
// ouverte, ou en train de s'ouvrir, par une autre demande (auCalmeDesBases) :
// une connexion n'est jamais ouverte pendant que le fil du travailleur est
// occupé.
// =============================================================
import * as Y from 'yjs'
import type { InfosBase } from './bases'
import { ErreurBase, creerBase, lireMisesAJour, ouvrirBaseExistante } from './bases'
import type { EnteteTableau } from '../fichier'
import { ErreurFichier, crc32, lireTableau } from '../fichier'
import type { EnteteDemandee, ExamenBase } from './ecrivain-pur'
import { examinerMisesAJour, fabriquer, preparerCopie } from './ecrivain-pur'
import type { ComparaisonVecteurs } from './vecteurs'
import { comparerVecteurs } from './vecteurs'

export type RaisonEcrivain = 'absente' | 'abimee' | 'indisponible' | 'illisible' | 'fil' | 'place' | 'existante' | 'autre'

/** Une erreur rendue par l'écrivain ; creee : la base que la demande
 *  devait créer l'a été, vide (voir 'copier') */
export interface ErreurRendue { raison: RaisonEcrivain; message: string; creee?: boolean }

export type Demande =
  | { n: number; genre: 'fichier'; base: string; entete: EnteteDemandee; lisible?: boolean }
  | { n: number; genre: 'vecteur'; base: string }
  | { n: number; genre: 'lire'; fichier: Blob; crc?: number }
  | { n: number; genre: 'mettre-a-jour'; base: string; etat: Uint8Array; vecteur: Uint8Array }
  | { n: number; genre: 'creer'; cible: string; etat: Uint8Array; infos: InfosBase; copie?: boolean }
  | { n: number; genre: 'copier'; source: string; cible: string; infos: InfosBase }
  | { n: number; genre: 'examiner'; base: string }
  | { n: number; genre: 'preparer-copie'; etat: Uint8Array; id: string }

export type Reponse =
  | { n: number; fichier: Blob; pages: number; vecteur: Uint8Array; crc: number; incomplet?: boolean }
  | { n: number; vecteur: Uint8Array; vide: boolean }
  | { n: number; entete: EnteteTableau; etat: Uint8Array; pages: number; vecteur: Uint8Array }
  | { n: number; copie: true; pages: number; publications: number; vecteur: Uint8Array }
  | { n: number; examen: ExamenBase; infos?: Partial<InfosBase> }
  | { n: number; misAJour: boolean; comparaison: ComparaisonVecteurs; vecteur: Uint8Array }
  | { n: number; creee: true; publications?: number; vecteur?: Uint8Array }
  | { n: number; preparee: true; etat: Uint8Array; vidage: Uint8Array; publications: number; vecteur: Uint8Array }
  | { n: number; erreur: ErreurRendue }

/** Ce qu'une réponse peut transférer sans copie (l'état d'un fichier lu) */
export function aTransferer(r: Reponse): ArrayBuffer[] {
  return 'etat' in r && r.etat.buffer instanceof ArrayBuffer && r.etat.byteOffset === 0 && r.etat.byteLength === r.etat.buffer.byteLength ? [r.etat.buffer] : []
}

/** Le travailleur le dit dès qu'il a démarré (voir ecrivain.ts) */
export const PRET = { pret: true } as const

/** Une erreur, dite comme une réponse */
export function erreurDe(e: unknown): ErreurRendue {
  const message = (e instanceof Error ? e.message : String(e ?? '')) || 'erreur inconnue'
  if (e instanceof ErreurBase) {
    const r = e.raison
    const raison: RaisonEcrivain = r === 'absente' || r === 'abimee' || r === 'indisponible' || r === 'place' || r === 'existante' ? r : 'autre'
    return e.creee ? { raison, message, creee: true } : { raison, message }
  }
  if ((e as { name?: string } | null)?.name === 'QuotaExceededError') return { raison: 'place', message }
  if (e instanceof ErreurFichier && e.raison === 'abimee') return { raison: 'abimee', message }
  return { raison: 'autre', message }
}

/** Les bases ouvertes (ou en train de s'ouvrir) par les demandes en cours,
 *  et les calculs qui attendent qu'il n'y en ait plus */
let ouvertes = 0
let enAttente: (() => void)[] = []

/** Une base ouverte pendant f (lue, créée), comptée */
async function avecUneBase<T>(f: () => Promise<T>): Promise<T> {
  ouvertes++
  try { return await f() } finally {
    ouvertes--
    if (!ouvertes) { const l = enAttente; enAttente = []; for (const ok of l) ok() }
  }
}

/** Avant un calcul : plus aucune base ouverte par une autre demande */
function auCalmeDesBases(): Promise<void> {
  return ouvertes ? new Promise(ok => enAttente.push(ok)) : Promise.resolve()
}

/** Les mises à jour d'une base, puis le calme (on peut calculer) */
async function lire(base: string) {
  const r = await avecUneBase(() => lireMisesAJour(base))
  await auCalmeDesBases()
  return r
}

/** Une entrée d'une bibliothèque dont la somme ne va pas */
export const ABIME_ENTREE = 'Ce classeur est abîmé dans la bibliothèque : il ne peut pas être ouvert.'

/** « Mettre à jour » sans rien perdre (voir l'en-tête) : la base, fusionnée
 *  dans le rappel de son getAll, doit être contenue dans le fichier, dans la
 *  même transaction que l'ajout ; sinon rien n'est écrit */
async function mettreAJour(base: string, etat: Uint8Array, vecteurFichier: Uint8Array): Promise<{ misAJour: boolean; comparaison: ComparaisonVecteurs; vecteur: Uint8Array }> {
  await auCalmeDesBases()
  return avecUneBase(async () => {
    const db = await ouvrirBaseExistante(base)
    try {
      return await new Promise((ok, ko) => {
        let r: { misAJour: boolean; comparaison: ComparaisonVecteurs; vecteur: Uint8Array } | null = null
        let echec: unknown = null
        const t = db.transaction(['updates'], 'readwrite')
        const s = t.objectStore('updates')
        const lecture = s.getAll() as IDBRequest<Uint8Array[]>
        lecture.onsuccess = () => {
          try {
            const mises = lecture.result
            const fusion = mises.length === 0 ? null : mises.length === 1 ? mises[0] : Y.mergeUpdates(mises)
            const vBase = fusion ? Y.encodeStateVectorFromUpdate(fusion) : Y.encodeStateVector(new Map())
            const c = comparerVecteurs(vecteurFichier, vBase)
            if (c === 'contient') { s.add(etat); r = { misAJour: true, comparaison: c, vecteur: vecteurFichier } }
            else if (c === 'egal') r = { misAJour: true, comparaison: c, vecteur: vBase }
            else r = { misAJour: false, comparaison: c, vecteur: vBase }
          } catch (e) { echec = e; try { t.abort() } catch { /* déjà finie */ } }
        }
        t.oncomplete = () => r ? ok(r) : ko(echec ?? new Error('La base n\'a pas été lue.'))
        t.onabort = () => ko(echec ?? t.error ?? new DOMException('Transaction abandonnée.', 'AbortError'))
      })
    } finally { db.close() }
  })
}

/** Fait une demande ; ne lève jamais (une erreur devient la réponse) */
export async function executer(d: Demande): Promise<Reponse> {
  try {
    if (d.genre === 'fichier') {
      const { mises } = await lire(d.base)
      const f = fabriquer(mises, d.entete, { lisible: d.lisible })
      const r: Reponse = { n: d.n, fichier: new Blob([f.octets as BlobPart], { type: 'application/octet-stream' }), pages: f.pages, vecteur: f.vecteur, crc: f.crc }
      if (f.incomplet) r.incomplet = true
      return r
    }
    if (d.genre === 'vecteur') {
      // Les mises à jour fusionnées, puis leur vecteur : sans rejouer le
      // document (une base trouée a quand même un vecteur, celui de ce
      // qu'elle garde)
      const { mises } = await lire(d.base)
      const etat = mises.length === 1 ? mises[0] : Y.mergeUpdates(mises)
      return { n: d.n, vecteur: Y.encodeStateVectorFromUpdate(etat), vide: mises.length === 0 }
    }
    if (d.genre === 'lire') {
      let lu: ReturnType<typeof lireTableau>
      const octets = new Uint8Array(await d.fichier.arrayBuffer())
      await auCalmeDesBases()
      if (d.crc !== undefined && crc32(octets) !== d.crc >>> 0) return { n: d.n, erreur: { raison: 'illisible', message: ABIME_ENTREE } }
      try { lu = lireTableau(octets) } catch (e) {
        // La phrase de lireTableau, qui dit quoi faire, passe telle quelle
        if (e instanceof ErreurFichier) return { n: d.n, erreur: { raison: 'illisible', message: e.message } }
        throw e
      }
      return { n: d.n, entete: lu.entete, etat: lu.etat, pages: lu.pages, vecteur: Y.encodeStateVectorFromUpdate(lu.etat) }
    }
    if (d.genre === 'copier') {
      const { mises } = await lire(d.source)
      const c = preparerCopie(mises, { id: d.infos.id })
      await avecUneBase(() => creerBase(d.cible, [c.etat, c.vidage], d.infos))
      return { n: d.n, copie: true, pages: c.pages, publications: c.publications, vecteur: c.vecteur }
    }
    if (d.genre === 'creer') {
      await auCalmeDesBases()
      if (d.copie) {
        // Une copie d'un classeur qui reste ici : son registre des publications vidé
        const c = preparerCopie([d.etat], { id: d.infos.id })
        await avecUneBase(() => creerBase(d.cible, [c.etat, c.vidage], d.infos))
        return { n: d.n, creee: true, publications: c.publications, vecteur: c.vecteur }
      }
      await avecUneBase(() => creerBase(d.cible, d.etat, d.infos))
      return { n: d.n, creee: true }
    }
    if (d.genre === 'preparer-copie') {
      await auCalmeDesBases()
      const c = preparerCopie([d.etat], { id: d.id })
      return { n: d.n, preparee: true, etat: c.etat, vidage: c.vidage, publications: c.publications, vecteur: c.vecteur }
    }
    if (d.genre === 'mettre-a-jour') {
      const r = await mettreAJour(d.base, d.etat, d.vecteur)
      return { n: d.n, ...r }
    }
    if (d.genre === 'examiner') {
      const { mises, infos } = await lire(d.base)
      const examen = examinerMisesAJour(mises)
      // L'identité rangée à côté, telle qu'elle est (la bibliothèque la vérifie)
      const lue = infos && typeof infos === 'object' ? { ...(typeof infos.id === 'string' ? { id: infos.id } : {}), ...(typeof infos.nom === 'string' ? { nom: infos.nom } : {}) } : undefined
      return lue ? { n: d.n, examen, infos: lue } : { n: d.n, examen }
    }
    throw new Error(`Demande inconnue : ${(d as { genre?: string }).genre}`)
  } catch (e) {
    return { n: d.n, erreur: erreurDe(e) }
  }
}
