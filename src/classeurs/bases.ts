// =============================================================
// LES BASES DES CLASSEURS, EN INDEXEDDB PURE
// Sans lib0 ni y-indexeddb (le travailleur qui fabrique les fichiers s'en
// sert aussi). Deux pièges, mesurés, qu'on n'ouvre jamais :
// - une base ouverte sans version alors qu'elle n'existe pas est CRÉÉE,
//   vide (version 1, aucun magasin), et y-indexeddb ne la charge plus
//   jamais. ouvrirBaseExistante abandonne donc la mise à niveau : la base
//   n'est pas créée, et l'appel le dit ('absente') ;
// - creerBase ne touche jamais à une base qui existe déjà ('existante'),
//   sans rien y écrire ni rien en effacer.
// Une base de classeur a exactement les magasins de y-indexeddb :
// 'updates' (les mises à jour Yjs, clés auto-incrémentées) et 'custom'
// (hors du document : l'identité du classeur, sous 'mem-classeur').
// =============================================================

/** Pourquoi une base n'a pas pu être lue ou écrite :
 *  - absente : elle n'existe pas (et n'a pas été créée) ;
 *  - abimee : elle existe sans le magasin 'updates' (créée vide par erreur) ;
 *  - existante : on voulait la créer, elle existait déjà ;
 *  - place : le navigateur manque de place (QuotaExceededError) ;
 *  - indisponible : IndexedDB manque ou est refusé (stockage bloqué) ;
 *  - autre : le reste. */
export type RaisonBase = 'absente' | 'abimee' | 'existante' | 'place' | 'indisponible' | 'autre'

export class ErreurBase extends Error {
  /** creee : la base a été créée par l'appel qui a échoué (creerBase) : à
   *  effacer par celui qui l'a demandée */
  constructor(readonly raison: RaisonBase, message?: string, readonly creee = false) {
    super(message ?? `Base du navigateur : ${raison}`)
    this.name = 'ErreurBase'
  }
}

/** L'identité d'un classeur, rangée dans sa base, hors du document */
export interface InfosBase { id: string; nom: string }
export const CLE_INFOS = 'mem-classeur'

const raisonDe = (e: unknown): RaisonBase => {
  const nom = (e as { name?: string } | null)?.name
  if (nom === 'QuotaExceededError') return 'place'
  if (nom === 'SecurityError' || nom === 'InvalidStateError' || nom === 'UnknownError' || nom === 'NotSupportedError') return 'indisponible'
  return 'autre'
}

function fabrique(): IDBFactory {
  let f: IDBFactory | undefined
  try { f = globalThis.indexedDB } catch { f = undefined }
  if (!f) throw new ErreurBase('indisponible', 'IndexedDB n\'est pas disponible dans ce navigateur.')
  return f
}

export function requete<T>(r: IDBRequest<T>): Promise<T> {
  return new Promise((ok, ko) => { r.onsuccess = () => ok(r.result); r.onerror = () => ko(r.error) })
}

/** La fin d'une transaction ; son abandon rejette l'erreur du navigateur
 *  (ConstraintError, QuotaExceededError…), ou AbortError */
export function finDe(t: IDBTransaction): Promise<void> {
  return new Promise((ok, ko) => {
    t.oncomplete = () => ok()
    t.onabort = () => ko(t.error ?? new DOMException('Transaction abandonnée.', 'AbortError'))
  })
}

/** Une erreur du navigateur, dite comme une ErreurBase */
const enErreurBase = (e: unknown): ErreurBase => e instanceof ErreurBase ? e : new ErreurBase(raisonDe(e), (e as Error | null)?.message)

/** LA seule façon d'ouvrir une base de classeur hors de y-indexeddb (le
 *  registre, le travailleur, l'adoption, les comparaisons). Sans version :
 *  on prend celle qui est là. Une base qui n'existe pas n'est jamais créée
 *  (la mise à niveau est abandonnée : rejet 'absente', rien dans
 *  databases()) ; une base sans magasin 'updates' est refermée sans rien y
 *  écrire (rejet 'abimee'). La connexion se ferme d'elle-même si une autre
 *  veut supprimer ou changer la base ; l'appelant la ferme dès sa lecture
 *  faite. */
export function ouvrirBaseExistante(base: string): Promise<IDBDatabase> {
  return new Promise((ok, ko) => {
    let r: IDBOpenDBRequest
    try { r = fabrique().open(base) } catch (e) {
      return ko(e instanceof ErreurBase ? e : new ErreurBase('indisponible', (e as Error)?.message))
    }
    let neuve = false
    r.onupgradeneeded = () => {
      neuve = true
      try { r.transaction?.abort() } catch { /* déjà finie */ }
    }
    r.onsuccess = () => {
      const db = r.result
      if (!db.objectStoreNames.contains('updates')) {
        db.close()
        return ko(new ErreurBase('abimee', `La base ${base} n'a pas le magasin des mises à jour.`))
      }
      db.onversionchange = () => db.close()
      ok(db)
    }
    r.onerror = e => {
      e.preventDefault()
      ko(neuve ? new ErreurBase('absente', `La base ${base} n'existe pas.`) : new ErreurBase(raisonDe(r.error), r.error?.message))
    }
  })
}

/** Toutes les mises à jour d'une base, et l'identité gardée à côté, en une
 *  lecture (readonly), sans rien y écrire */
export async function lireMisesAJour(base: string): Promise<{ mises: Uint8Array[]; infos: InfosBase | undefined }> {
  const db = await ouvrirBaseExistante(base)
  try {
    const custom = db.objectStoreNames.contains('custom')
    const t = db.transaction(custom ? ['updates', 'custom'] : ['updates'], 'readonly')
    const [mises, infos] = await Promise.all([
      requete(t.objectStore('updates').getAll() as IDBRequest<Uint8Array[]>),
      custom ? requete(t.objectStore('custom').get(CLE_INFOS) as IDBRequest<InfosBase | undefined>) : Promise.resolve(undefined),
    ])
    return { mises, infos }
  } finally { db.close() }
}

/** Crée la base d'un nouveau classeur, avec les magasins de y-indexeddb,
 *  son état et son identité. Une base qui existait déjà n'est pas touchée
 *  (rejet 'existante', rien d'écrit ni d'effacé). L'état et l'identité
 *  s'écrivent ensemble : si la transaction échoue (plus de place), le rejet
 *  le dit avec creee (la base, créée vide, est à effacer). etat : une mise
 *  à jour, ou plusieurs, rangées dans l'ordre (une copie : l'état complet,
 *  puis le registre des publications vidé, voir ecrivain-pur.preparerCopie). */
export function creerBase(base: string, etat: Uint8Array | readonly Uint8Array[], infos: InfosBase): Promise<{ creee: true }> {
  const etats: readonly Uint8Array[] = etat instanceof Uint8Array ? [etat] : etat
  return new Promise((ok, ko) => {
    let r: IDBOpenDBRequest
    try { r = fabrique().open(base) } catch (e) {
      return ko(e instanceof ErreurBase ? e : new ErreurBase('indisponible', (e as Error)?.message))
    }
    let neuve = false
    r.onupgradeneeded = e => {
      if (e.oldVersion !== 0) return
      neuve = true
      const db = r.result
      db.createObjectStore('updates', { autoIncrement: true })
      db.createObjectStore('custom')
    }
    r.onsuccess = () => {
      const db = r.result
      if (!neuve) { db.close(); return ko(new ErreurBase('existante', `La base ${base} existe déjà.`)) }
      db.onversionchange = () => db.close()
      let t: IDBTransaction
      try {
        t = db.transaction(['updates', 'custom'], 'readwrite')
        for (const e of etats) t.objectStore('updates').add(e)
        t.objectStore('custom').put(infos, CLE_INFOS)
      } catch (e) {
        db.close()
        return ko(new ErreurBase(raisonDe(e), (e as Error)?.message, true))
      }
      t.oncomplete = () => { db.close(); ok({ creee: true }) }
      t.onabort = () => { db.close(); ko(new ErreurBase(raisonDe(t.error), t.error?.message || 'Transaction abandonnée.', true)) }
    }
    r.onerror = e => { e.preventDefault(); ko(new ErreurBase(raisonDe(r.error), r.error?.message)) }
  })
}

/** Remplace tout le contenu d'une base existante par un état, d'un bloc
 *  (clear puis add, une transaction : si elle échoue, rien n'a changé) */
export async function remplacerBase(base: string, etat: Uint8Array): Promise<void> {
  const db = await ouvrirBaseExistante(base)
  try {
    const t = db.transaction(['updates'], 'readwrite')
    const fin = finDe(t)
    const s = t.objectStore('updates')
    s.clear()
    s.add(etat)
    await fin
  } catch (e) { throw enErreurBase(e) } finally { db.close() }
}

/** Range l'identité d'un classeur dans sa base ; rien si la base n'existe pas */
export async function ecrireInfos(base: string, infos: InfosBase): Promise<void> {
  let db: IDBDatabase
  try { db = await ouvrirBaseExistante(base) } catch (e) {
    if (e instanceof ErreurBase && e.raison === 'absente') return
    throw e
  }
  try {
    if (!db.objectStoreNames.contains('custom')) return
    const t = db.transaction(['custom'], 'readwrite')
    const fin = finDe(t)
    t.objectStore('custom').put(infos, CLE_INFOS)
    await fin
  } catch (e) { throw enErreurBase(e) } finally { db.close() }
}

/** Le nombre de mises à jour d'une base ; 0 si elle n'existe pas (sans la
 *  créer) ou n'a pas de magasin. databases() d'abord quand le navigateur
 *  l'a (Firefox ESR ne l'a pas toujours). Les autres erreurs remontent :
 *  « on ne sait pas » n'est jamais « vide ». */
export async function compterEntrees(base: string): Promise<number> {
  const f = fabrique()
  if (typeof f.databases === 'function') {
    try {
      const liste = await f.databases()
      if (!liste.some(d => d.name === base)) return 0
    } catch { /* on ouvre pour savoir */ }
  }
  let db: IDBDatabase
  try { db = await ouvrirBaseExistante(base) } catch (e) {
    if (e instanceof ErreurBase && (e.raison === 'absente' || e.raison === 'abimee')) return 0
    throw e
  }
  try { return await requete(db.transaction(['updates'], 'readonly').objectStore('updates').count()) } finally { db.close() }
}

/** Efface une base. 'bloque' : une connexion la tient encore ouverte (un
 *  onglet) ; la demande continue seule et aboutira à sa fermeture : apres
 *  est alors appelée, une fois la base vraiment effacée (jamais quand la
 *  promesse a rendu 'efface' : l'appelant fait déjà la suite). Une base
 *  déjà partie s'efface sans erreur (deux onglets qui vident ensemble). */
export function effacerBase(base: string, apres?: () => void): Promise<'efface' | 'bloque'> {
  return new Promise((ok, ko) => {
    let r: IDBOpenDBRequest
    try { r = fabrique().deleteDatabase(base) } catch (e) { return ko(e) }
    let bloque = false
    r.onsuccess = () => {
      if (!bloque) { ok('efface'); return }
      try { apres?.() } catch { /* l'appelant se débrouille */ }
    }
    r.onblocked = () => { bloque = true; ok('bloque') }
    r.onerror = () => ko(new ErreurBase(raisonDe(r.error), r.error?.message))
  })
}
