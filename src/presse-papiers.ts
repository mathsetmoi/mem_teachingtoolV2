// =============================================================
// LE PRESSE-PAPIERS DES OBJETS
// Copier, couper, coller, dupliquer : ce qu'on copie devient une
// « copie » (les formes telles quelles, les données des images qu'elles
// montrent, la page d'où elles viennent, le centre de leur boîte, l'heure).
// Elle voyage de trois façons : en mémoire (le même onglet), dans le
// navigateur (localStorage : un autre onglet de la même adresse) et dans
// le presse-papiers du système, marquée dans le text/html (la version en
// ligne et la version clé USB, qui ne partagent rien d'autre).
//
// Ce qui revient du presse-papiers du système vient de n'importe où : un
// site quelconque peut y avoir mis un text/html piégé. On ne le met donc
// JAMAIS dans le DOM du document (un <img onerror> y exécuterait du script
// dans l'origine de MEM teachingtool : la base du tableau, le jeton de
// Publier) ; une expression régulière y lit seulement l'attribut marqué. Puis
// chaque forme est REFAITE champ par champ, par une liste blanche : une
// forme abîmée entrerait pour toujours dans le document (gc: false) et
// casserait le rendu, la revue ou l'export à chaque chargement.
//
// Ce fichier est pur (aucun DOM) : il se teste sous Node.
// =============================================================
import type { Cercle, Figure, Forme, Formule, Habillage, ImageForme, Polygone, Segment, StyleNom, StylePoint, Trait } from './types'
import type { P } from './formes'
import { image, nomsLibres } from './formes'

/** Ce qu'on a copié. Les formes ont leurs coordonnées absolues (celles de la
 *  page d'où elles viennent) ; images : les données (data:image/…) des
 *  images qu'elles montrent, par leur identifiant dans la banque ; centre : le
 *  milieu de leur boîte, dans le monde ; t : l'heure de la copie (Date.now()),
 *  qui dit aussi laquelle est la plus récente. */
export interface Copie { v: 1; formes: Forme[]; images: Record<string, string>; page: string; centre: P; t: number }

/** L'attribut qui marque notre balise dans le text/html */
const MARQUE = 'data-mem-teachingtool'
/** Au-delà, on ne lit même pas : un presse-papiers de cette taille n'est pas
 *  une copie raisonnable, et le décoder bloquerait la page */
export const PLAFOND_TEXTE = 20 * 1024 * 1024
export const MAX_FORMES = 5000

// ---------- Écrire ----------
/** Le text/html de la copie : une balise marquée, la copie en JSON (UTF-8,
 *  puis base64 : les accents d'une formule passent, et rien dans l'attribut
 *  ne peut fermer la balise). Ce qu'elle montre est le texte de la copie :
 *  un traitement de texte qui prend le HTML y colle le LaTeX des formules,
 *  comme celui qui prend le texte. */
export function versHtml(c: Copie): string {
  const texte = versTexte(c).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/\n/g, '<br>')
  return `<div ${MARQUE}='1' data-copie='${versBase64(JSON.stringify(c))}'>${texte}</div>`
}

/** Le text/plain : ce qu'un autre logiciel en ferait de mieux. Des formules
 *  seules donnent leur LaTeX, une par ligne (on les colle dans un document) ;
 *  sinon une phrase qui dit ce que c'est. */
export function versTexte(c: Copie): string {
  if (c.formes.length && c.formes.every(f => f.type === 'formule')) return c.formes.map(f => (f as Formule).latex).join('\n')
  const n = c.formes.length
  return `MEM teachingtool : ${n} objet${n > 1 ? 's' : ''}`
}

/** Deux textes du presse-papiers sont-ils le même ? Windows change les fins
 *  de ligne (\n en \r\n) en passant par le système. */
export function memeTexte(a: string, b: string): boolean {
  const n = (s: string) => s.replace(/\r\n?/g, '\n').trim()
  return n(a) === n(b)
}

// ---------- Lire ----------
/** La copie marquée dans un text/html venu du presse-papiers, ou null. On
 *  parcourt les balises ouvrantes une à une (une expression qui ne franchit
 *  ni « < » ni « > » : chaque caractère n'est lu qu'un nombre borné de fois,
 *  même sur 20 Mo écrits pour la piéger) ; dans celle qui porte la marque en
 *  attribut, on lit l'attribut data-copie, entre guillemets simples ou
 *  doubles (un navigateur qui réécrit le HTML met des doubles), base64
 *  seulement. */
export function lireHtml(html: unknown): Copie | null {
  if (typeof html !== 'string' || !html || html.length > PLAFOND_TEXTE || !html.includes(MARQUE)) return null
  const balises = /<[a-z][a-z0-9-]*\s[^<>]*>/gi
  for (let b = balises.exec(html); b; b = balises.exec(html)) {
    const balise = b[0]
    if (!balise.includes(MARQUE) || !/\sdata-mem-teachingtool\s*=\s*(["']?)1\1[\s/>]/i.test(balise)) continue
    const m = /\sdata-copie\s*=\s*(["'])([A-Za-z0-9+/=]+)\1/.exec(balise)
    if (!m) return null
    const json = deBase64(m[2])
    return json === null ? null : lireJson(json)
  }
  return null
}

/** La copie gardée dans le navigateur (JSON), ou null */
export function lireJson(texte: unknown): Copie | null {
  if (typeof texte !== 'string' || !texte || texte.length > PLAFOND_TEXTE) return null
  let o: unknown
  try { o = JSON.parse(texte) } catch { return null }
  return validerCopie(o)
}

// ---------- Vérifier ----------
const estObjet = (v: unknown): v is Record<string, unknown> => typeof v === 'object' && v !== null && !Array.isArray(v)
const fini = (v: unknown): v is number => typeof v === 'number' && Number.isFinite(v)
const positif = (v: unknown): v is number => fini(v) && v > 0
const absent = (v: unknown) => v === undefined || v === null
const COULEUR = /^#(?:[0-9a-f]{3,4}|[0-9a-f]{6}|[0-9a-f]{8})$/i
const couleur = (v: unknown): v is string => typeof v === 'string' && COULEUR.test(v)
const IMAGE = /^data:image\/(?:png|jpeg|gif|webp);base64,[A-Za-z0-9+/]+={0,2}$/
const chaineCourte = (v: unknown, max = 64): v is string => typeof v === 'string' && v.length > 0 && v.length <= max
const MARQUES = ['aucun', 'point', 'croix', 'plus', 'rond']
const BOUTS = ['aucun', 'fleche', 'trait', 'crochet']

/** Des nombres finis, autant qu'un multiple de `pas`, au moins `min` */
function nombres(v: unknown, pas: number, min: number): number[] | null {
  if (!Array.isArray(v) || v.length < min || v.length % pas !== 0) return null
  for (const x of v) if (!fini(x)) return null
  return v.slice()
}

/** Refait l'objet de la copie, ou null s'il n'en est pas une. Rien ne lève
 *  d'exception : tout ce qui n'est pas prévu donne null. Une seule forme
 *  abîmée fait refuser toute la copie (on ne colle pas une moitié de figure
 *  sans le dire). Les champs inconnus sont jetés, comme le tracé d'origine
 *  d'une figure reconnue (brut) et l'auteur (le collage met le sien). */
export function validerCopie(o: unknown): Copie | null {
  try {
    if (!estObjet(o) || o.v !== 1 || !Array.isArray(o.formes) || !o.formes.length || o.formes.length > MAX_FORMES) return null
    if (typeof o.page !== 'string' || o.page.length > 64 || !fini(o.t) || !estObjet(o.images)) return null
    const c = o.centre
    if (!estObjet(c) || !fini(c.x) || !fini(c.y)) return null
    const sources = o.images
    // Sans prototype : un identifiant « __proto__ » reste une clé comme une autre
    const images: Record<string, string> = Object.create(null)
    const prendre = (src: string) => {
      const d = Object.prototype.hasOwnProperty.call(sources, src) ? sources[src] : undefined
      if (typeof d !== 'string' || d.length > PLAFOND_TEXTE || !IMAGE.test(d)) return false
      images[src] = d
      return true
    }
    const formes: Forme[] = [], ids = new Set<string>()
    for (const v of o.formes) {
      const f = validerForme(v, prendre)
      if (!f || ids.has(f.id)) return null
      ids.add(f.id)
      formes.push(f)
    }
    return { v: 1, formes, images, page: o.page, centre: { x: c.x, y: c.y }, t: o.t }
  } catch { return null }
}

/** Une forme refaite par la liste blanche de son type (voir types.ts) */
function validerForme(v: unknown, prendreImage: (src: string) => boolean): Forme | null {
  if (!estObjet(v) || !chaineCourte(v.id) || !fini(v.x) || !fini(v.y) || !fini(v.z)) return null
  const base = { id: v.id, x: v.x, y: v.y, z: v.z, auteur: '' }
  switch (v.type) {
    case 'trait': {
      const pts = nombres(v.pts, 3, 3)
      // Un trait d'avant sans opacité ni pression : plein, sans pression
      const opacite = absent(v.opacite) ? 1 : v.opacite, pression = absent(v.pression) ? false : v.pression
      if (!pts || !couleur(v.couleur) || !positif(v.taille) || !fini(opacite) || opacite <= 0 || opacite > 1 || typeof pression !== 'boolean') return null
      const t: Trait = { ...base, type: 'trait', pts, couleur: v.couleur, taille: v.taille, opacite, pression }
      return t
    }
    case 'polygone': {
      const pts = nombres(v.pts, 2, 2)
      if (!pts || typeof v.ferme !== 'boolean') return null
      if (!absent(v.prolonge) && v.prolonge !== 'droite' && v.prolonge !== 'demi') return null
      const h = habillage(v, pts.length / 2)
      if (!h) return null
      const p: Polygone = { ...base, type: 'polygone', pts, ferme: v.ferme, ...h }
      if (v.prolonge === 'droite' || v.prolonge === 'demi') p.prolonge = v.prolonge
      return p
    }
    case 'cercle': {
      if (!positif(v.r)) return null
      const arc = v.arc
      if (!absent(arc) && (!estObjet(arc) || !fini(arc.a0) || !fini(arc.a1))) return null
      const h = habillage(v, 1)
      if (!h) return null
      const c: Cercle = { ...base, type: 'cercle', r: v.r, ...h }
      if (estObjet(arc)) c.arc = { a0: arc.a0 as number, a1: arc.a1 as number }
      return c
    }
    case 'segment': {
      if (!fini(v.dx) || !fini(v.dy) || !couleur(v.couleur) || !positif(v.taille)) return null
      const s: Segment = { ...base, type: 'segment', dx: v.dx, dy: v.dy, couleur: v.couleur, taille: v.taille }
      return s
    }
    case 'formule': {
      if (typeof v.latex !== 'string' || v.latex.length > 2000 || !couleur(v.couleur) || !positif(v.taille)) return null
      const f: Formule = { ...base, type: 'formule', latex: v.latex, couleur: v.couleur, taille: v.taille }
      return f
    }
    case 'image': {
      if (!chaineCourte(v.src) || !positif(v.l) || !positif(v.h)) return null
      const m = nombres(v.m, 4, 4)
      if (!m || m.length !== 4) return null
      const det = m[0] * m[3] - m[1] * m[2]
      if (!Number.isFinite(det) || det === 0 || !prendreImage(v.src)) return null
      const i: ImageForme = { ...base, type: 'image', src: v.src, l: v.l, h: v.h, m: [m[0], m[1], m[2], m[3]] }
      return i
    }
  }
  return null
}

/** L'habillage d'une figure de n points, refait ; null s'il est abîmé */
function habillage(v: Record<string, unknown>, n: number): Habillage | null {
  if (!couleur(v.couleur) || !positif(v.taille)) return null
  const h: Habillage = { couleur: v.couleur, taille: v.taille }
  if (v.fond === null) h.fond = null
  else if (v.fond !== undefined) { if (!couleur(v.fond)) return null; h.fond = v.fond }
  for (const k of ['tirets', 'sommets', 'codage'] as const) {
    const b = v[k]
    if (absent(b)) continue
    if (typeof b !== 'boolean') return null
    h[k] = b
  }
  if (!absent(v.noms)) {
    const noms = v.noms
    if (!Array.isArray(noms) || noms.length > n || !noms.every(x => typeof x === 'string' && x.length <= 8)) return null
    h.noms = noms.slice() as string[]
  }
  if (!absent(v.posNoms)) {
    const l = v.posNoms
    if (!Array.isArray(l) || l.length > n) return null
    const r: ({ x: number; y: number } | null)[] = []
    for (const o of l) {
      if (absent(o)) { r.push(null); continue }
      if (!estObjet(o) || !fini(o.x) || !fini(o.y)) return null
      r.push({ x: o.x, y: o.y })
    }
    h.posNoms = r
  }
  if (!absent(v.stylePoints)) {
    const l = liste(v.stylePoints, n, stylePoint)
    if (!l) return null
    h.stylePoints = l
  }
  if (!absent(v.styleNoms)) {
    const l = liste(v.styleNoms, n, styleNom)
    if (!l) return null
    h.styleNoms = l
  }
  if (!absent(v.lie)) { if (!chaineCourte(v.lie)) return null; h.lie = v.lie }
  return h
}

/** Une liste de réglages par point (au plus n), chacun null ou refait */
function liste<T>(v: unknown, n: number, refaire: (o: Record<string, unknown>) => T | null): (T | null)[] | null {
  if (!Array.isArray(v) || v.length > n) return null
  const r: (T | null)[] = []
  for (const o of v) {
    if (absent(o)) { r.push(null); continue }
    if (!estObjet(o)) return null
    const x = refaire(o)
    if (!x) return null
    r.push(x)
  }
  return r
}

function stylePoint(o: Record<string, unknown>): StylePoint | null {
  const s: StylePoint = {}
  if (!absent(o.marque)) { if (!MARQUES.includes(o.marque as string)) return null; s.marque = o.marque as StylePoint['marque'] }
  if (!absent(o.bout)) { if (!BOUTS.includes(o.bout as string)) return null; s.bout = o.bout as StylePoint['bout'] }
  if (!absent(o.couleur)) { if (!couleur(o.couleur)) return null; s.couleur = o.couleur }
  if (!absent(o.taille)) { if (!positif(o.taille)) return null; s.taille = o.taille }
  return s
}

function styleNom(o: Record<string, unknown>): StyleNom | null {
  const s: StyleNom = {}
  if (!absent(o.couleur)) { if (!couleur(o.couleur)) return null; s.couleur = o.couleur }
  if (!absent(o.taille)) { if (!positif(o.taille)) return null; s.taille = o.taille }
  for (const k of ['droit', 'cache'] as const) {
    const b = o[k]
    if (absent(b)) continue
    if (typeof b !== 'boolean') return null
    s[k] = b
  }
  return s
}

// ---------- Coller ----------
/** Les formes à poser pour un collage : chacune déplacée de (dx, dy), avec un
 *  identifiant neuf et un rang neuf (au-dessus de tout, dans l'ordre d'origine).
 *  Une figure nommée GARDE ses noms s'ils sont tous libres sur la page
 *  d'arrivée (les copies déjà placées comptent : deux triangles ABC copiés
 *  ensemble ne gardent pas tous deux ABC) ; sinon elle reçoit des lettres
 *  libres, jamais des primes (A' veut dire « l'image de A »). Un point lié à
 *  une image copiée avec lui suit la nouvelle image ; sans elle, il n'est plus
 *  lié à rien. Le tracé d'origine (brut) ne suit pas : une copie n'a pas été
 *  tracée à la main. */
export function collage(c: Copie, o: { dx: number; dy: number; moi: string; existantes: Forme[]; maintenant?: number }): Forme[] {
  const t = { type: 'translation' as const, dx: o.dx, dy: o.dy }
  const ordre = [...c.formes].sort((a, b) => a.z - b.z)
  const z0 = o.maintenant ?? Date.now()
  const ids = new Map<string, string>()
  const r: Forme[] = ordre.map((f, k) => {
    const g = image(f, t, o.moi)
    g.z = z0 + k
    ids.set(f.id, g.id)
    return g
  })
  r.forEach((g, k) => {
    if (g.type !== 'polygone' && g.type !== 'cercle') return
    const f = ordre[k] as Figure
    if (f.noms?.length) {
      const avant = [...o.existantes, ...r.slice(0, k)]
      const pris = new Set<string>()
      for (const x of avant) if ((x.type === 'polygone' || x.type === 'cercle') && x.noms) x.noms.forEach(n => pris.add(n))
      g.noms = f.noms.every(n => !n || !pris.has(n)) ? [...f.noms] : nomsLibres(f.noms.length, avant, g.type === 'cercle')
    } else delete g.noms
    if (g.lie) {
      const nouvelle = ids.get(g.lie)
      if (nouvelle) g.lie = nouvelle
      else delete g.lie
    }
  })
  // Des objets neufs, sans rien de partagé avec la copie (une liste de
  // réglages que la copie et la forme posée auraient en commun) ni champ vide
  return r.map(g => JSON.parse(JSON.stringify(g)) as Forme)
}

// ---------- Base64 d'un texte UTF-8 ----------
function versBase64(texte: string): string {
  const octets = new TextEncoder().encode(texte)
  let s = ''
  for (let i = 0; i < octets.length; i += 0x8000) s += String.fromCharCode.apply(null, octets.subarray(i, i + 0x8000) as unknown as number[])
  return btoa(s)
}

function deBase64(b64: string): string | null {
  try {
    const s = atob(b64)
    const octets = new Uint8Array(s.length)
    for (let i = 0; i < s.length; i++) octets[i] = s.charCodeAt(i)
    return new TextDecoder('utf-8', { fatal: true }).decode(octets)
  } catch { return null }
}
