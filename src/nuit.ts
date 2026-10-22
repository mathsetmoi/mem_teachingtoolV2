// =============================================================
// LE MODE NUIT D'UNE PAGE
// Une page peut passer en mode nuit : le papier devient presque noir et
// l'écriture claire. Rien n'est réécrit : c'est seulement l'affichage de la
// page qui change (le champ « nuit » de la page, facultatif ; une version
// d'avant l'ignore et montre la page de jour). Repasser en jour rend la
// page exactement comme avant.
// L'encre sombre (le Noir de la palette, le bleu, le vert…) s'éclaircit,
// l'encre presque blanche (un cache blanc) devient le noir du papier, et les
// couleurs du milieu (le rouge, le jaune du surligneur) ne changent pas :
// voir nocturne. Les images (une photo, un PDF) restent telles quelles.
// Le tableau, la revue, les vignettes et le lecteur des élèves peignent la
// page de nuit ; le PDF et l'image copiée, jamais (on imprime de jour).
// =============================================================
import type { Forme, LigneTexte } from './types'

/** Le papier d'une page de nuit */
export const PAPIER_NUIT = '#121820'

/** Une couleur lue : rouge, vert, bleu (0 à 255) et opacité (0 à 1) */
type Rvba = [number, number, number, number]

function lireCouleur(c: string): Rvba | null {
  const s = c.trim().toLowerCase()
  let m = s.match(/^#([0-9a-f]{3,4})$/)
  if (m) {
    const h = m[1]
    const v = (i: number) => parseInt(h[i] + h[i], 16)
    return [v(0), v(1), v(2), h.length === 4 ? v(3) / 255 : 1]
  }
  m = s.match(/^#([0-9a-f]{6})([0-9a-f]{2})?$/)
  if (m) {
    const h = m[1]
    return [parseInt(h.slice(0, 2), 16), parseInt(h.slice(2, 4), 16), parseInt(h.slice(4, 6), 16), m[2] ? parseInt(m[2], 16) / 255 : 1]
  }
  m = s.match(/^rgba?\(\s*([\d.]+)\s*,\s*([\d.]+)\s*,\s*([\d.]+)\s*(?:,\s*([\d.]+)\s*)?\)$/)
  if (m) return [Number(m[1]), Number(m[2]), Number(m[3]), m[4] === undefined ? 1 : Number(m[4])]
  if (s === 'white') return [255, 255, 255, 1]
  if (s === 'black') return [0, 0, 0, 1]
  return null
}

/** Teinte (0 à 1), saturation, luminosité d'une couleur */
function versTsl(r: number, v: number, b: number): [number, number, number] {
  r /= 255; v /= 255; b /= 255
  const max = Math.max(r, v, b), min = Math.min(r, v, b), l = (max + min) / 2
  if (max === min) return [0, 0, l]
  const d = max - min
  const s = l > 0.5 ? d / (2 - max - min) : d / (max + min)
  const t = max === r ? (v - b) / d + (v < b ? 6 : 0) : max === v ? (b - r) / d + 2 : (r - v) / d + 4
  return [t / 6, s, l]
}
function depuisTsl(t: number, s: number, l: number): [number, number, number] {
  if (!s) { const g = Math.round(l * 255); return [g, g, g] }
  const q = l < 0.5 ? l * (1 + s) : l + s - l * s, p = 2 * l - q
  const canal = (x: number) => {
    if (x < 0) x += 1
    if (x > 1) x -= 1
    if (x < 1 / 6) return p + (q - p) * 6 * x
    if (x < 1 / 2) return q
    if (x < 2 / 3) return p + (q - p) * (2 / 3 - x) * 6
    return p
  }
  return [Math.round(canal(t + 1 / 3) * 255), Math.round(canal(t) * 255), Math.round(canal(t - 1 / 3) * 255)]
}

const hex2 = (n: number) => Math.max(0, Math.min(255, n)).toString(16).padStart(2, '0')

/** La luminosité d'une couleur sur une page de nuit (l : celle de jour, de 0
 *  à 1). Une encre sombre devient claire, d'autant plus qu'elle était sombre
 *  (le Noir de la palette, presque blanc ; le bleu, un bleu clair) ; une
 *  encre presque blanche devient presque le noir du papier ; entre les deux
 *  (le rouge, le jaune), rien ne change. */
export function luminositeDeNuit(l: number): number {
  if (l < 0.5) return 0.95 - 1.6 * l * l
  if (l >= 0.85) return 0.08 + (1 - l) * 0.6
  return l
}

const deja = new Map<string, string>()

/** Une couleur telle qu'elle s'affiche sur une page de nuit (sa teinte et
 *  son opacité gardées, sa luminosité changée : voir luminositeDeNuit). Une
 *  couleur qu'on ne sait pas lire reste telle quelle. Toujours depuis la
 *  couleur de jour, celle qui est écrite : jamais deux fois. */
export function nocturne(c: string): string {
  if (typeof c !== 'string') return c
  const vu = deja.get(c)
  if (vu !== undefined) return vu
  const x = lireCouleur(c)
  let r = c
  if (x) {
    const [t, s, l] = versTsl(x[0], x[1], x[2])
    const [a, b, d] = depuisTsl(t, s, luminositeDeNuit(l))
    r = x[3] >= 1 ? `#${hex2(a)}${hex2(b)}${hex2(d)}` : `rgba(${a}, ${b}, ${d}, ${Math.round(x[3] * 1000) / 1000})`
  }
  if (deja.size > 500) deja.clear()
  deja.set(c, r)
  return r
}

const nocturneOuRien = <T extends string | null | undefined>(c: T): T => (typeof c === 'string' ? nocturne(c) : c) as T

function lignesDeNuit(lignes: LigneTexte[]): LigneTexte[] {
  return lignes.map(l => l && Array.isArray(l.morceaux) && l.morceaux.some(m => m?.c)
    ? { ...l, morceaux: l.morceaux.map(m => m?.c ? { ...m, c: nocturne(m.c) } : m) }
    : l)
}

const formesDeNuit = new WeakMap<Forme, Forme>()

/** Une forme telle qu'elle se peint sur une page de nuit : une copie, ses
 *  couleurs passées par nocturne (l'encre, le remplissage, celles de ses
 *  points et de ses noms, celles des morceaux d'un texte). Une image reste
 *  elle-même. Gardée par forme (les formes inchangées sont les mêmes objets
 *  d'une image à l'autre) : rien ne se recalcule à chaque peinture. */
export function formeDeNuit<F extends Forme>(f: F): F {
  if (f.type === 'image') return f
  const vu = formesDeNuit.get(f)
  if (vu) return vu as F
  const g: Forme = { ...f } as Forme
  if ('couleur' in g && typeof g.couleur === 'string') g.couleur = nocturne(g.couleur)
  if (g.type === 'polygone' || g.type === 'cercle') {
    if (g.fond) g.fond = nocturne(g.fond)
    if (g.stylePoints) g.stylePoints = g.stylePoints.map(s => s?.couleur ? { ...s, couleur: nocturneOuRien(s.couleur) } : s)
    if (g.styleNoms) g.styleNoms = g.styleNoms.map(s => s?.couleur ? { ...s, couleur: nocturneOuRien(s.couleur) } : s)
  }
  if (g.type === 'formule' && Array.isArray(g.texte)) g.texte = lignesDeNuit(g.texte)
  formesDeNuit.set(f, g)
  return g as F
}

/** Les formes d'une page de nuit à peindre hors de l'écran (une vignette,
 *  l'aperçu d'un classeur, la vignette d'un énoncé) : ses formules en
 *  couleurs de nuit (voir formeDeNuit), car elles s'y peignent à part, en
 *  images préparées à l'avance ; le reste tel quel (le rendu s'en charge). */
export function formulesDeNuit(formes: Forme[]): Forme[] {
  return formes.map(f => f.type === 'formule' ? formeDeNuit(f) : f)
}
