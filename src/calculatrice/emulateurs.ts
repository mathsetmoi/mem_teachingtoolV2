// =============================================================
// LES ÉMULATEURS NUMWORKS, INSTALLÉS SUR CET ORDINATEUR
// NumWorks donne ses émulateurs (la calculatrice graphique, pour le lycée ;
// la scientifique, pour le collège) en un fichier à télécharger, qui marche
// sans internet. NumWorks en garde les droits : l'outil ne les contient pas.
// Le professeur les télécharge une fois et les donne à l'outil (la fenêtre
// « Installer la calculatrice NumWorks », voir fenetre.ts) ; ils restent
// dans ce navigateur, dans une base à eux (jamais dans un classeur, un
// replay, une sauvegarde ni le Drive).
//
// Le fichier est une page HTML. Donné dans un .zip (avec ses scripts à
// côté), on prend sa page et on y range ses scripts et ses styles : elle
// tient alors en un seul texte, comme le fichier d'un seul morceau.
// =============================================================
import { unzipSync, strFromU8 } from 'fflate'
import type { ModeleCalculatrice } from '../types'

/** La base des émulateurs (nouvelle avec la calculatrice : aucune autre ne change) */
const BASE = 'mem-teachingtool-calculatrices'
const MAGASIN = 'emulateurs'

export interface Emulateur {
  modele: ModeleCalculatrice
  /** La page de l'émulateur, en un seul texte */
  html: string
  /** Le nom du fichier donné, sa taille (octets) et le jour de l'installation */
  nom: string
  taille: number
  date: number
}

function ouvrir(): Promise<IDBDatabase> {
  return new Promise((ok, ko) => {
    const r = indexedDB.open(BASE, 1)
    r.onupgradeneeded = () => { r.result.createObjectStore(MAGASIN, { keyPath: 'modele' }) }
    r.onsuccess = () => ok(r.result)
    r.onerror = () => ko(r.error)
    r.onblocked = () => ko(new Error('base bloquée'))
  })
}

async function faire<T>(mode: IDBTransactionMode, f: (m: IDBObjectStore) => IDBRequest<T>): Promise<T> {
  const db = await ouvrir()
  try {
    return await new Promise<T>((ok, ko) => {
      const tr = db.transaction(MAGASIN, mode)
      const r = f(tr.objectStore(MAGASIN))
      tr.oncomplete = () => ok(r.result)
      tr.onerror = () => ko(tr.error)
      tr.onabort = () => ko(tr.error)
    })
  } finally { db.close() }
}

/** Les émulateurs déjà là, gardés en mémoire après la première lecture */
const memoire = new Map<ModeleCalculatrice, Emulateur | null>()

export async function lireEmulateur(m: ModeleCalculatrice): Promise<Emulateur | null> {
  if (memoire.has(m)) return memoire.get(m)!
  let e: Emulateur | null = null
  try { e = (await faire<Emulateur | undefined>('readonly', s => s.get(m))) ?? null } catch { e = null }
  memoire.set(m, e)
  return e
}

/** Ce qu'on sait sans relire tout le fichier : installé ou non, et depuis quand */
export async function etatDesEmulateurs(): Promise<Record<ModeleCalculatrice, { nom: string; date: number } | null>> {
  const [lycee, college] = await Promise.all([lireEmulateur('lycee'), lireEmulateur('college')])
  const resume = (e: Emulateur | null) => e ? { nom: e.nom, date: e.date } : null
  return { lycee: resume(lycee), college: resume(college) }
}

export async function installerEmulateur(e: Emulateur): Promise<void> {
  await faire('readwrite', s => s.put(e))
  memoire.set(e.modele, e)
}

export async function retirerEmulateur(m: ModeleCalculatrice): Promise<void> {
  await faire('readwrite', s => s.delete(m))
  memoire.set(m, null)
}

/** Pourquoi un fichier n'est pas pris (le message dit quoi faire) */
export class FichierRefuse extends Error {}

/** Un texte qui ressemble à l'émulateur de NumWorks : une page HTML qui parle de NumWorks */
export function ressembleAEmulateur(html: string): boolean {
  return /<(html|script|body)[\s>]/i.test(html) && /numworks/i.test(html)
}

/** Range dans la page les scripts et les styles qu'elle appelle à côté
 *  d'elle (fichiers : le contenu du .zip, par chemin) */
export function rangerLesVoisins(html: string, chemin: string, fichiers: Record<string, Uint8Array>): string {
  const dossier = chemin.includes('/') ? chemin.slice(0, chemin.lastIndexOf('/') + 1) : ''
  const voisin = (adresse: string): string | null => {
    if (/^[a-z]+:|^\/\//i.test(adresse)) return null
    const nom = (dossier + adresse.split(/[?#]/)[0]).replace(/^\.\//, '')
    const pieces: string[] = []
    for (const p of nom.split('/')) { if (p === '..') pieces.pop(); else if (p && p !== '.') pieces.push(p) }
    const d = fichiers[pieces.join('/')]
    return d ? strFromU8(d) : null
  }
  // Un </script> dans le texte rangé fermerait la balise trop tôt
  const sur = (t: string) => t.replace(/<\/script/gi, '<\\/script')
  return html
    .replace(/<script([^>]*?)\ssrc=["']([^"']+)["']([^>]*)>\s*<\/script>/gi, (tout, a, src, b) => {
      const t = voisin(src)
      return t === null ? tout : `<script${a}${b}>${sur(t)}</script>`
    })
    .replace(/<link([^>]*?)rel=["']stylesheet["']([^>]*)>/gi, (tout) => {
      const href = /href=["']([^"']+)["']/i.exec(tout)?.[1]
      const t = href ? voisin(href) : null
      return t === null ? tout : `<style>${t}</style>`
    })
}

/** Lit le fichier donné par le professeur : la page de l'émulateur, en un
 *  seul texte. Refuse (FichierRefuse) ce qui n'en est pas un. */
export async function lireFichierEmulateur(f: File): Promise<string> {
  const nom = f.name.toLowerCase()
  if (nom.endsWith('.zip') || f.type === 'application/zip') {
    let fichiers: Record<string, Uint8Array>
    try { fichiers = unzipSync(new Uint8Array(await f.arrayBuffer())) } catch { throw new FichierRefuse('Ce fichier .zip ne s\'ouvre pas.') }
    const pages = Object.keys(fichiers).filter(n => /\.html?$/i.test(n) && !n.startsWith('__MACOSX'))
    // La page qui parle de NumWorks, la moins profonde d'abord
    pages.sort((a, b) => a.split('/').length - b.split('/').length)
    for (const p of pages) {
      const html = strFromU8(fichiers[p])
      const complet = rangerLesVoisins(html, p, fichiers)
      if (ressembleAEmulateur(complet)) return complet
    }
    throw new FichierRefuse('Ce .zip ne contient pas l\'émulateur de NumWorks.')
  }
  if (!/\.html?$/.test(nom) && f.type !== 'text/html') throw new FichierRefuse('Il faut le fichier .html de l\'émulateur de NumWorks.')
  const html = await f.text()
  if (!ressembleAEmulateur(html)) throw new FichierRefuse('Ce fichier n\'est pas l\'émulateur de NumWorks.')
  return html
}
