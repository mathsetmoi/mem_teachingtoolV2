// =============================================================
// L'ÉCRIVAIN DE PDF
// Un PDF écrit à la main, sans bibliothèque : une image par feuille, qui
// la couvre entière (la feuille A4 de MEM est peinte comme une page, puis
// posée telle quelle). Pas de jsPDF : quelques kilo-octets de code, et la
// compression (zlib) vient de fflate, déjà là pour le fichier .memc.
// Pourquoi des images et pas du vectoriel : un vectoriel demanderait un
// second moteur de dessin (les traits de perfect-freehand, les formules,
// les fonds) et d'y embarquer des polices, pour un fichier plus gros
// (mesuré : environ 976 Ko pour une feuille très chargée, contre 238 à
// 283 Ko ici).
// Une feuille de tableau n'a que peu de couleurs (le papier, le quadrillage,
// quatre encres et leurs bords lissés) : elle part en couleurs indexées
// (les 256 couleurs les plus fréquentes, chaque pixel à la plus proche,
// compressé par Flate), deux fois plus légère qu'un JPEG de même finesse et
// sans ses bavures autour des lettres. Une feuille dominée par une photo
// (les 256 premières couleurs couvrent moins de 90 % des pixels) part en
// JPEG.
// Le fichier : l'en-tête %PDF-1.4 et sa ligne de quatre octets binaires,
// le catalogue, l'arbre des pages, puis pour chaque feuille sa page, son
// flux de contenu (« pose l'image sur toute la feuille ») et son image ;
// les informations (titre en UTF-16, producteur, date) ; la table des
// renvois (chaque décalage exact, sur dix chiffres) et la remorque.
// Pur : ni document, ni canevas ; se teste sous Node (tests/pdf.test.ts).
// =============================================================
import { zlibSync } from 'fflate'

/** Une feuille A4 en points (1/72 de pouce) : 210 × 297 mm, en portrait */
export const A4 = { l: 595.28, h: 841.89 }

/** Une image en couleurs indexées : palette (3 octets par couleur, au plus
 *  256), donnees : un indice par pixel, ligne après ligne, compressé (zlib) */
export interface ImageIndexee { genre: 'indexee'; largeur: number; hauteur: number; palette: Uint8Array; donnees: Uint8Array }
/** Une image JPEG (en RVB), telle que le canevas l'a écrite */
export interface ImageJpeg { genre: 'jpeg'; largeur: number; hauteur: number; donnees: Uint8Array }

/** Une feuille du PDF : sa taille en points, et l'image qui la couvre */
export interface Feuille { l: number; h: number; image: ImageIndexee | ImageJpeg }

/** Une image ramenée à sa palette (voir palettiser) */
export interface Palettisee { palette: Uint8Array; indices: Uint8Array }

/** Les 256 premières couleurs doivent couvrir au moins cette part des pixels */
const COUVERTURE = 0.9
const MAX_COULEURS = 256

// ---------- La palette ----------

/**
 * Ramène une image RVBA (le canevas d'une feuille, opaque : l'alpha est
 * ignoré) à au plus 256 couleurs : les plus fréquentes, chaque pixel prenant
 * l'indice de la plus proche (distance dans l'espace RVB, gardée en cache
 * pour chaque couleur rencontrée). null si ces 256 couleurs couvrent moins
 * de 90 % des pixels : une photo, qui partira en JPEG. Une image qui a déjà
 * 256 couleurs au plus est rendue telle quelle, au pixel près.
 */
export function palettiser(rgba: Uint8ClampedArray | Uint8Array, l: number, h: number): Palettisee | null {
  const g = palettiserLignes(rgba, l, h, h || 1)
  for (;;) { const r = g.next(); if (r.done) return r.value }
}

/**
 * La même chose par tranches de `lignes` lignes : le générateur rend la main
 * après chaque tranche (il donne l'avancement, de 0 à 1), pour que l'export
 * d'un gros tableau ne gèle pas l'interface ; sa valeur finale est celle de
 * palettiser. Deux passages : compter les couleurs, puis donner les indices.
 */
export function* palettiserLignes(rgba: Uint8ClampedArray | Uint8Array, l: number, h: number, lignes = 128): Generator<number, Palettisee | null, void> {
  const n = l * h
  if (!(n > 0) || rgba.length < n * 4) return null
  const pas = Math.max(1, Math.floor(lignes))
  // 1. Compter : une suite de pixels pareils ne fait qu'une entrée de plus
  // (le papier, les grands aplats), ce qui rend le comptage rapide
  const compte = new Map<number, number>()
  for (let y0 = 0; y0 < h; y0 += pas) {
    const fin = Math.min(h, y0 + pas) * l
    let i = y0 * l
    while (i < fin) {
      const k = cle(rgba, i)
      let j = i + 1
      while (j < fin && cle(rgba, j) === k) j++
      compte.set(k, (compte.get(k) ?? 0) + (j - i))
      i = j
    }
    yield Math.min(fin, n) / n / 2
  }
  // 2. La palette : les plus fréquentes, assez pour couvrir l'image
  const tri = [...compte].sort((a, b) => b[1] - a[1]).slice(0, MAX_COULEURS)
  let couvert = 0
  for (const [, v] of tri) couvert += v
  if (couvert < COUVERTURE * n) return null
  const couleurs = tri.map(([k]) => k)
  const palette = new Uint8Array(couleurs.length * 3)
  const indice = new Map<number, number>()
  couleurs.forEach((k, q) => {
    palette[q * 3] = k >> 16; palette[q * 3 + 1] = (k >> 8) & 255; palette[q * 3 + 2] = k & 255
    indice.set(k, q)
  })
  // 3. Chaque pixel prend l'indice de sa couleur, ou de la plus proche
  const indices = new Uint8Array(n)
  for (let y0 = 0; y0 < h; y0 += pas) {
    const fin = Math.min(h, y0 + pas) * l
    let dernier = -1, q = 0
    for (let i = y0 * l; i < fin; i++) {
      const k = cle(rgba, i)
      if (k !== dernier) {
        let j = indice.get(k)
        if (j === undefined) { j = plusProche(couleurs, k); indice.set(k, j) }
        dernier = k; q = j
      }
      indices[i] = q
    }
    yield 0.5 + Math.min(fin, n) / n / 2
  }
  return { palette, indices }
}

/** La couleur RVB du pixel i, en un entier 0xRRGGBB */
function cle(d: Uint8ClampedArray | Uint8Array, i: number): number {
  const k = i * 4
  return (d[k] << 16) | (d[k + 1] << 8) | d[k + 2]
}

/** L'indice de la couleur de la palette la plus proche de k */
function plusProche(couleurs: readonly number[], k: number): number {
  const r = k >> 16, g = (k >> 8) & 255, b = k & 255
  let meilleur = 0, d = Infinity
  for (let q = 0; q < couleurs.length; q++) {
    const c = couleurs[q]
    const dr = (c >> 16) - r, dg = ((c >> 8) & 255) - g, db = (c & 255) - b
    const e = dr * dr + dg * dg + db * db
    if (e < d) { d = e; meilleur = q; if (!e) break }
  }
  return meilleur
}

/** L'image indexée d'une feuille : les indices compressés (zlib, comme le
 *  veut le filtre FlateDecode du PDF) */
export function imageIndexee(p: Palettisee, largeur: number, hauteur: number, niveau: 0 | 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9 = 6): ImageIndexee {
  return { genre: 'indexee', largeur, hauteur, palette: p.palette, donnees: zlibSync(p.indices, { level: niveau }) }
}

// ---------- Le fichier ----------

/**
 * Le PDF de ces feuilles, une image par feuille, qui la couvre entière.
 * info : le titre (écrit en UTF-16, accents compris) et la date de création
 * (ms, heure de l'ordinateur). Rend les octets du fichier.
 */
export function ecrirePdf(feuilles: readonly Feuille[], info: { titre: string; date: number }): Uint8Array {
  const enc = new TextEncoder()
  const morceaux: Uint8Array[] = []
  const decalages: number[] = []
  let pos = 0
  const ecrire = (x: string | Uint8Array) => {
    const o = typeof x === 'string' ? enc.encode(x) : x
    morceaux.push(o); pos += o.length
  }
  /** L'objet numéro num : son dictionnaire, et son flux s'il en a un */
  const objet = (num: number, dict: string, flux?: Uint8Array) => {
    decalages[num] = pos
    ecrire(`${num} 0 obj\n${dict}\n`)
    if (flux) { ecrire('stream\n'); ecrire(flux); ecrire('\nendstream\n') }
    ecrire('endobj\n')
  }

  // L'en-tête, puis une ligne de commentaire de quatre octets au-delà de 127 :
  // elle dit aux outils de transfert que le fichier est binaire
  ecrire('%PDF-1.4\n')
  ecrire(new Uint8Array([0x25, 0xe2, 0xe3, 0xcf, 0xd3, 0x0a]))

  // 1 : le catalogue ; 2 : l'arbre des pages ; puis trois objets par feuille
  // (la page, son contenu, son image) ; enfin les informations
  const premier = 3
  const kids = feuilles.map((_, i) => `${premier + i * 3} 0 R`).join(' ')
  objet(1, '<< /Type /Catalog /Pages 2 0 R >>')
  objet(2, `<< /Type /Pages /Kids [${kids}] /Count ${feuilles.length} >>`)
  feuilles.forEach((f, i) => {
    const np = premier + i * 3
    const l = nombre(f.l), h = nombre(f.h)
    const contenu = enc.encode(`q ${l} 0 0 ${h} 0 0 cm /Im0 Do Q`)
    objet(np, `<< /Type /Page /Parent 2 0 R /MediaBox [0 0 ${l} ${h}] /Resources << /XObject << /Im0 ${np + 2} 0 R >> >> /Contents ${np + 1} 0 R >>`)
    objet(np + 1, `<< /Length ${contenu.length} >>`, contenu)
    const im = f.image
    const tete = `/Type /XObject /Subtype /Image /Width ${entier(im.largeur)} /Height ${entier(im.hauteur)}`
    if (im.genre === 'indexee') {
      const n = Math.floor(im.palette.length / 3)
      objet(np + 2, `<< ${tete} /ColorSpace [/Indexed /DeviceRGB ${Math.max(0, n - 1)} <${hex(im.palette.subarray(0, n * 3))}>] /BitsPerComponent 8 /Filter /FlateDecode /Length ${im.donnees.length} >>`, im.donnees)
    } else {
      objet(np + 2, `<< ${tete} /ColorSpace /DeviceRGB /BitsPerComponent 8 /Filter /DCTDecode /Length ${im.donnees.length} >>`, im.donnees)
    }
  })
  const nInfo = premier + feuilles.length * 3
  objet(nInfo, `<< /Title <${utf16(info.titre)}> /Producer (MEM teachingtool) /CreationDate (D:${datePdf(info.date)}) >>`)

  // La table des renvois : une entrée de 20 octets par objet, son décalage sur dix chiffres
  const debutTable = pos
  let t = `xref\n0 ${nInfo + 1}\n0000000000 65535 f \n`
  for (let i = 1; i <= nInfo; i++) t += String(decalages[i]).padStart(10, '0') + ' 00000 n \n'
  t += `trailer\n<< /Size ${nInfo + 1} /Root 1 0 R /Info ${nInfo} 0 R >>\nstartxref\n${debutTable}\n%%EOF\n`
  ecrire(t)

  const tout = new Uint8Array(pos)
  let o = 0
  for (const m of morceaux) { tout.set(m, o); o += m.length }
  return tout
}

/** Un nombre de points, à deux décimales au plus (595.28, 842) */
function nombre(x: number): string {
  const v = Math.round((Number.isFinite(x) ? x : 0) * 100) / 100
  return String(v)
}

function entier(x: number): number { return Math.max(1, Math.round(x)) }

/** Des octets en hexadécimal (la palette d'une image indexée) */
function hex(o: Uint8Array): string {
  let s = ''
  for (let i = 0; i < o.length; i++) s += o[i].toString(16).padStart(2, '0')
  return s
}

/** Un texte en UTF-16 gros-boutiste, précédé de sa marque (FEFF), en
 *  hexadécimal : un titre PDF avec ses accents (et ses emoji, en paires) */
export function utf16(texte: string): string {
  let s = 'FEFF'
  for (let i = 0; i < texte.length; i++) s += texte.charCodeAt(i).toString(16).toUpperCase().padStart(4, '0')
  return s
}

/** « 20261009143005 » : la date d'un PDF (D:AAAAMMJJHHmmSS), à l'heure de l'ordinateur */
export function datePdf(t: number): string {
  const d = new Date(Number.isFinite(t) ? t : 0)
  const deux = (n: number) => String(n).padStart(2, '0')
  return `${d.getFullYear()}${deux(d.getMonth() + 1)}${deux(d.getDate())}${deux(d.getHours())}${deux(d.getMinutes())}${deux(d.getSeconds())}`
}
