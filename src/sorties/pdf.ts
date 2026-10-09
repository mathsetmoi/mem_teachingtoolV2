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
// quelques encres et leurs bords lissés) : elle part en couleurs indexées,
// compressées par Flate, deux fois plus légère qu'un JPEG de même finesse et
// sans ses bavures autour des lettres. La palette (256 couleurs au plus) :
// d'abord les couleurs des formes de la feuille (une petite croix verte au
// milieu d'une page d'écriture noire garde son vert, même si les nuances
// lissées de l'encre noire sont bien plus fréquentes), puis les plus
// fréquentes, en écartant d'abord celles presque pareilles à une déjà prise.
// Chaque pixel prend la plus proche, mais l'écart est borné. Un pixel est
// faux à plus de 24 niveaux (distance dans l'espace RVB) de sa couleur. Les
// bords lissés d'une écriture dense en ont toujours un peu (mesuré : 0,03 à
// 0,05 % des pixels, des nuances uniques, invisibles une à une) ; ce qui se
// voit, c'est un aplat faux : une marque, un dégradé, une surface d'une
// autre couleur, des pixels faux pareils à leur voisin de gauche (mesuré :
// 0 à 11 sur une feuille dense). Plus de 0,01 % d'aplats faux, ou plus de
// 0,5 % de pixels faux : pas de palette, et la feuille part autrement (en
// RVB compressé sans perte, Flate et ses lignes prédites comme celles d'un
// PNG ; c'est l'export qui choisit, et une feuille où paraît une image n'y
// passe jamais : une photo ne se ramène pas à 256 couleurs).
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
/** Une image en RVB sans perte : ses lignes prédites (voir lignesPredites),
 *  compressées (zlib) */
export interface ImageRvb { genre: 'rvb'; largeur: number; hauteur: number; donnees: Uint8Array }

/** Une feuille du PDF : sa taille en points, et l'image qui la couvre */
export interface Feuille { l: number; h: number; image: ImageIndexee | ImageJpeg | ImageRvb }

/** Une image ramenée à sa palette (voir palettiser) */
export interface Palettisee { palette: Uint8Array; indices: Uint8Array }

/** Les 256 premières couleurs doivent couvrir au moins cette part des pixels */
const COUVERTURE = 0.9
const MAX_COULEURS = 256
/** Un pixel rendu à plus de cette distance (RVB) de sa couleur est faux */
export const ECART_MAX = 24
/** Au-delà de cette part d'aplats faux (un pixel faux pareil à son voisin de
 *  gauche), ou de cette part de pixels faux, pas de palette */
export const PART_APLATS_FAUX = 0.0001
export const PART_FAUSSE = 0.005
/** En remplissant la palette, une couleur à moins de cette distance d'une
 *  déjà prise attend son tour (elle s'y ramène presque sans écart) */
const VOISINE = 6
/** Le choix des couleurs ne regarde que les plus fréquentes */
const CANDIDATES = 16384
/** Au-delà de ce nombre de couleurs, on ne trie que les plus fréquentes */
const TRI_MAX = 65536

// ---------- La palette ----------

/**
 * Ramène une image RVBA (le canevas d'une feuille, opaque : l'alpha est
 * ignoré) à au plus 256 couleurs, chaque pixel prenant l'indice de la plus
 * proche (distance dans l'espace RVB, gardée en cache pour chaque couleur
 * rencontrée). forcees : des couleurs (0xRRGGBB) à prendre d'abord, si elles
 * paraissent dans l'image (celles des formes). null : pas de palette fidèle
 * (les 256 premières couleurs couvrent moins de 90 % des pixels, plus de
 * 0,01 % des pixels sont des aplats faux, ou plus de 0,5 % des pixels sont
 * faux : voir plus haut). Une image qui a déjà 256 couleurs au plus est
 * rendue telle quelle, au pixel près.
 */
export function palettiser(rgba: Uint8ClampedArray | Uint8Array, l: number, h: number, forcees: readonly number[] = []): Palettisee | null {
  const g = palettiserLignes(rgba, l, h, h || 1, forcees)
  for (;;) { const r = g.next(); if (r.done) return r.value }
}

/**
 * La même chose par tranches de `lignes` lignes : le générateur rend la main
 * après chaque tranche (il donne l'avancement, de 0 à 1), pour que l'export
 * d'un gros tableau ne gèle pas l'interface ; sa valeur finale est celle de
 * palettiser. Deux passages : compter les couleurs, puis donner les indices
 * (et compter les pixels faux : au-delà de ce qui est permis, on s'arrête).
 */
export function* palettiserLignes(rgba: Uint8ClampedArray | Uint8Array, l: number, h: number, lignes = 128, forcees: readonly number[] = []): Generator<number, Palettisee | null, void> {
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
  // 2. La palette. Les couleurs par fréquence (au-delà de 65 536 couleurs,
  // seulement les plus fréquentes : un tri de toutes gèlerait l'interface)
  const tri = plusFrequentes(compte)
  if (!tri) return null
  let couvert = 0
  for (let i = 0; i < Math.min(MAX_COULEURS, tri.length); i++) couvert += tri[i][1]
  if (couvert < COUVERTURE * n) return null
  const couleurs: number[] = []
  const prises = new Set<number>()
  const prendre = (k: number) => { couleurs.push(k); prises.add(k) }
  if (tri.length <= MAX_COULEURS) for (const [k] of tri) prendre(k)
  else {
    // Les couleurs des formes d'abord, celles qui paraissent ; puis les plus
    // fréquentes, assez différentes de celles déjà prises ; enfin, s'il reste
    // de la place, les plus fréquentes qui restent
    for (const k of forcees) if (couleurs.length < MAX_COULEURS && compte.has(k) && !prises.has(k)) prendre(k)
    const candidates = tri.length > CANDIDATES ? tri.slice(0, CANDIDATES) : tri
    for (const [k] of candidates) {
      if (couleurs.length >= MAX_COULEURS) break
      if (!prises.has(k) && ecartMin(couleurs, k) > VOISINE * VOISINE) prendre(k)
    }
    for (const [k] of candidates) {
      if (couleurs.length >= MAX_COULEURS) break
      if (!prises.has(k)) prendre(k)
    }
  }
  const palette = new Uint8Array(couleurs.length * 3)
  // L'indice de chaque couleur rencontrée, plus 256 si elle est fausse (trop
  // loin de la couleur de la palette qui la remplace)
  const indice = new Map<number, number>()
  couleurs.forEach((k, q) => {
    palette[q * 3] = k >> 16; palette[q * 3 + 1] = (k >> 8) & 255; palette[q * 3 + 2] = k & 255
    indice.set(k, q)
  })
  // 3. Chaque pixel prend l'indice de sa couleur, ou de la plus proche ; trop
  // de pixels faux, ou d'aplats faux : pas de palette
  const permis = Math.floor(PART_FAUSSE * n), aplatsPermis = Math.floor(PART_APLATS_FAUX * n)
  const loin = ECART_MAX * ECART_MAX
  let fausses = 0, aplats = 0
  const indices = new Uint8Array(n)
  for (let y0 = 0; y0 < h; y0 += pas) {
    const yf = Math.min(h, y0 + pas)
    for (let y = y0; y < yf; y++) {
      let dernier = -1, q = 0, faux = false
      for (let i = y * l, fin = i + l; i < fin; i++) {
        const k = cle(rgba, i)
        if (k !== dernier) {
          let j = indice.get(k)
          if (j === undefined) {
            const p = plusProche(couleurs, k)
            j = p + (ecart(couleurs[p], k) > loin ? MAX_COULEURS : 0)
            indice.set(k, j)
          }
          dernier = k; q = j & 255; faux = j >= MAX_COULEURS
          if (faux && ++fausses > permis) return null
        } else if (faux && (++fausses > permis || ++aplats > aplatsPermis)) return null
        indices[i] = q
      }
    }
    yield 0.5 + yf * l / n / 2
  }
  return { palette, indices }
}

/** Les couleurs comptées, des plus fréquentes aux plus rares. Au-delà de
 *  65 536 couleurs, seulement celles qui paraissent assez souvent pour être
 *  au plus 65 536 (le seuil se lit dans l'histogramme des comptes) ; si
 *  moins de 256 restent, null : une photo, qu'aucune palette ne rend */
function plusFrequentes(compte: Map<number, number>): [number, number][] | null {
  if (compte.size <= TRI_MAX) return [...compte].sort((a, b) => b[1] - a[1])
  const PLAFOND = 1024
  const histo = new Uint32Array(PLAFOND + 1)
  for (const v of compte.values()) histo[Math.min(PLAFOND, v)]++
  // Le plus petit seuil qui garde au plus 65 536 couleurs
  let seuil = PLAFOND + 1, gardees = 0
  while (seuil > 1 && gardees + histo[seuil - 1] <= TRI_MAX) gardees += histo[--seuil]
  if (gardees < MAX_COULEURS) return null
  const r: [number, number][] = []
  for (const e of compte) if (e[1] >= seuil) r.push(e)
  return r.sort((a, b) => b[1] - a[1])
}

/** La couleur RVB du pixel i, en un entier 0xRRGGBB */
function cle(d: Uint8ClampedArray | Uint8Array, i: number): number {
  const k = i * 4
  return (d[k] << 16) | (d[k + 1] << 8) | d[k + 2]
}

/** Le carré de la distance entre deux couleurs 0xRRGGBB */
function ecart(c: number, k: number): number {
  const dr = (c >> 16) - (k >> 16), dg = ((c >> 8) & 255) - ((k >> 8) & 255), db = (c & 255) - (k & 255)
  return dr * dr + dg * dg + db * db
}

/** Le carré de la distance de k à la plus proche de ces couleurs (Infinity : aucune) */
function ecartMin(couleurs: readonly number[], k: number): number {
  let d = Infinity
  for (let q = 0; q < couleurs.length; q++) { const e = ecart(couleurs[q], k); if (e < d) { d = e; if (!e) break } }
  return d
}

/** L'indice de la couleur de la palette la plus proche de k */
function plusProche(couleurs: readonly number[], k: number): number {
  let meilleur = 0, d = Infinity
  for (let q = 0; q < couleurs.length; q++) {
    const e = ecart(couleurs[q], k)
    if (e < d) { d = e; meilleur = q; if (!e) break }
  }
  return meilleur
}

/** Une couleur CSS « #rgb » ou « #rrggbb » en 0xRRGGBB (null : une autre écriture) */
export function couleurHex(css: string | null | undefined): number | null {
  const m = /^#([0-9a-f]{3}|[0-9a-f]{6})$/i.exec(String(css ?? '').trim())
  if (!m) return null
  const h = m[1].length === 3 ? [...m[1]].map(c => c + c).join('') : m[1]
  return parseInt(h, 16)
}

// ---------- Le RVB sans perte ----------

/**
 * Les lignes d'une image RVBA (l'alpha ignoré) en RVB, chacune précédée de
 * son filtre, comme celles d'un PNG (le prédicteur 15 du filtre Flate du
 * PDF) : pour chaque ligne, le filtre (aucun, gauche, haut, Paeth) qui
 * donne les plus petits écarts, ce qui compresse un papier quadrillé et
 * l'écriture deux à trois fois mieux. Par tranches de `lignes` lignes (le
 * générateur rend la main entre deux, avec l'avancement) ; sa valeur
 * finale : h × (1 + 3 l) octets, à compresser.
 */
export function* lignesPredites(rgba: Uint8ClampedArray | Uint8Array, l: number, h: number, lignes = 128): Generator<number, Uint8Array, void> {
  const w = l * 3, pas = Math.max(1, Math.floor(lignes))
  const out = new Uint8Array(h * (w + 1))
  let avant = new Uint8Array(w), ligne = new Uint8Array(w)
  const essais = [new Uint8Array(w), new Uint8Array(w), new Uint8Array(w), new Uint8Array(w)]
  for (let y = 0; y < h; y++) {
    for (let x = 0, s = y * l * 4; x < w; x += 3, s += 4) { ligne[x] = rgba[s]; ligne[x + 1] = rgba[s + 1]; ligne[x + 2] = rgba[s + 2] }
    // 0 aucun, 1 gauche, 2 haut, 4 Paeth (le filtre 3, la moyenne, n'aide guère ici)
    const [e0, e1, e2, e4] = essais
    let s0 = 0, s1 = 0, s2 = 0, s4 = 0
    for (let x = 0; x < w; x++) {
      const v = ligne[x], a = x >= 3 ? ligne[x - 3] : 0, b = avant[x], c = x >= 3 ? avant[x - 3] : 0
      const p = a + b - c, pa = Math.abs(p - a), pb = Math.abs(p - b), pc = Math.abs(p - c)
      const pr = pa <= pb && pa <= pc ? a : pb <= pc ? b : c
      const f0 = v, f1 = (v - a) & 255, f2 = (v - b) & 255, f4 = (v - pr) & 255
      e0[x] = f0; e1[x] = f1; e2[x] = f2; e4[x] = f4
      s0 += f0 < 128 ? f0 : 256 - f0; s1 += f1 < 128 ? f1 : 256 - f1; s2 += f2 < 128 ? f2 : 256 - f2; s4 += f4 < 128 ? f4 : 256 - f4
    }
    let filtre = 0, meilleur = e0, somme = s0
    if (s1 < somme) { filtre = 1; meilleur = e1; somme = s1 }
    if (s2 < somme) { filtre = 2; meilleur = e2; somme = s2 }
    if (s4 < somme) { filtre = 4; meilleur = e4 }
    const o = y * (w + 1)
    out[o] = filtre
    out.set(meilleur, o + 1)
    const t = avant; avant = ligne; ligne = t
    if ((y + 1) % pas === 0 && y + 1 < h) yield (y + 1) / h
  }
  return out
}

/** L'image RVB sans perte d'une feuille (d'un coup : les essais ; l'export
 *  passe par lignesPredites et compresse par morceaux) */
export function imageRvb(rgba: Uint8ClampedArray | Uint8Array, largeur: number, hauteur: number, niveau: 0 | 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9 = 6): ImageRvb {
  const g = lignesPredites(rgba, largeur, hauteur, hauteur || 1)
  let r = g.next()
  while (!r.done) r = g.next()
  return { genre: 'rvb', largeur, hauteur, donnees: zlibSync(r.value, { level: niveau }) }
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
    } else if (im.genre === 'rvb') {
      objet(np + 2, `<< ${tete} /ColorSpace /DeviceRGB /BitsPerComponent 8 /Filter /FlateDecode /DecodeParms << /Predictor 15 /Colors 3 /BitsPerComponent 8 /Columns ${entier(im.largeur)} >> /Length ${im.donnees.length} >>`, im.donnees)
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
