// =============================================================
// LA TRIGONOMÉTRIE DU CATALOGUE (1re spé, chapitre Trigonométrie)
// Ce qui se calcule, sans rien toucher au tableau : le cercle
// trigonométrique (trois versions), les courbes de cos et sin,
// l'enroulement de la droite des réels à un moment donné, et les fiches
// de formules (posées ligne par ligne comme une démonstration).
// Chaque dessin est une liste de lignes, de cercles, de points et
// d'étiquettes, en unités du tableau (y vers le bas) ; catalogue-trigo.ts
// en fait des objets du tableau, ou le peint à l'écran pendant
// l'animation.
// =============================================================
import type { P } from './construction'
import type { Demonstration } from './catalogue'

/** Les couleurs : celles du dessin des ensembles. null : l'encre du professeur */
export const BLEU = '#2f6fd6', ORANGE = '#d9822b', VERT = '#1e8a4c', GRIS = '#8a94a6'
type Couleur = string | null

export interface Ligne { pts: P[]; couleur: Couleur; taille: number; tirets?: boolean; fleche?: boolean }
export interface Rond { c: P; r: number; couleur: Couleur; taille: number }
export interface Marque { p: P; couleur: Couleur }
/** Une étiquette, centrée sur p. texte : son écriture simple (« −5π/6 »,
 *  « √3/2 », « M(π/3) »), d'où vient sa formule ; latex la remplace. */
export interface Etiquette { texte: string; latex?: string; p: P; couleur: Couleur; taille: number }
export interface Dessin { lignes: Ligne[]; ronds: Rond[]; points: Marque[]; etiquettes: Etiquette[] }

const vide = (): Dessin => ({ lignes: [], ronds: [], points: [], etiquettes: [] })

/** L'écriture simple d'une étiquette, en LaTeX : « −5π/6 » donne
 *  -\dfrac{5\pi}{6}, « √3/2 » une fraction avec racine, « 30° » des degrés,
 *  « M(π/3) » le point avec son réel. */
export function texteEnLatex(t: string, petit = false): string {
  if (t === 'cos' || t === 'sin') return '\\' + t
  const m = t.match(/^([A-Z])\((.+)\)$/)
  if (m) return `${m[1]}(${texteEnLatex(m[2], true)})`
  const signe = t.startsWith('−') || t.startsWith('-') ? '-' : ''
  const corps = signe ? t.slice(1) : t
  const conv = (s: string) => s.replace(/√(\d+)/g, '\\sqrt{$1}').replace(/π/g, '\\pi').replace(/°/g, '^{\\circ}').replace(/,/g, '{,}')
  const f = corps.split('/')
  return signe + (f.length === 2 ? `\\${petit ? 'tfrac' : 'dfrac'}{${conv(f[0])}}{${conv(f[1])}}` : conv(corps))
}

// ---------- Le cercle trigonométrique ----------
export type VersionCercle = 'vide' | 'points' | 'valeurs'
/** Rayon du cercle posé : 5 cm à 100 % */
export const RAYON_CERCLE = 200

/** Les seize points remarquables, repérés dans ]−π ; π] : k (en π), écriture, degrés */
export const ANGLES: readonly [number, string, string][] = [
  [0, '0', '0°'], [1 / 6, 'π/6', '30°'], [1 / 4, 'π/4', '45°'], [1 / 3, 'π/3', '60°'], [1 / 2, 'π/2', '90°'],
  [2 / 3, '2π/3', '120°'], [3 / 4, '3π/4', '135°'], [5 / 6, '5π/6', '150°'], [1, 'π', '180°'],
  [-1 / 6, '−π/6', '−30°'], [-1 / 4, '−π/4', '−45°'], [-1 / 3, '−π/3', '−60°'], [-1 / 2, '−π/2', '−90°'],
  [-2 / 3, '−2π/3', '−120°'], [-3 / 4, '−3π/4', '−135°'], [-5 / 6, '−5π/6', '−150°'],
]

/** Un arc de cercle en ligne brisée, de l'angle a0 à a1 (sens direct, maths) */
function arc(o: P, r: number, a0: number, a1: number, pas = 0.05): P[] {
  const n = Math.max(2, Math.ceil(Math.abs(a1 - a0) / pas))
  return Array.from({ length: n + 1 }, (_, i) => { const a = a0 + (a1 - a0) * i / n; return { x: o.x + r * Math.cos(a), y: o.y - r * Math.sin(a) } })
}

/** Le cercle trigonométrique de centre o. vide : axes, O, I, J et le sens
 *  direct ; points : les seize points remarquables et leurs réels ;
 *  valeurs : en plus, les projections et cos, sin des angles du premier
 *  quart. degres : chaque point a aussi sa mesure en degrés. */
export function cercleTrigo(o: P, version: VersionCercle, degres: boolean): Dessin {
  const d = vide(), R = RAYON_CERCLE
  const enc: Couleur = null
  d.lignes.push({ pts: [{ x: o.x - R - 70, y: o.y }, { x: o.x + R + 70, y: o.y }], couleur: enc, taille: 2, fleche: true })
  d.lignes.push({ pts: [{ x: o.x, y: o.y + R + 50 }, { x: o.x, y: o.y - R - 50 }], couleur: enc, taille: 2, fleche: true })
  d.ronds.push({ c: o, r: R, couleur: enc, taille: 2.5 })
  // Les graduations 1 et −1 sur chaque axe
  for (const s of [1, -1]) {
    d.lignes.push({ pts: [{ x: o.x + s * R, y: o.y - 7 }, { x: o.x + s * R, y: o.y + 7 }], couleur: enc, taille: 2 })
    d.lignes.push({ pts: [{ x: o.x - 7, y: o.y - s * R }, { x: o.x + 7, y: o.y - s * R }], couleur: enc, taille: 2 })
  }
  d.etiquettes.push({ texte: 'O', p: { x: o.x - 16, y: o.y + 18 }, couleur: enc, taille: 22 })
  if (version === 'vide') {
    d.etiquettes.push({ texte: 'I', p: { x: o.x + R + 14, y: o.y + 20 }, couleur: enc, taille: 22 })
    d.etiquettes.push({ texte: 'J', p: { x: o.x - 16, y: o.y - R - 16 }, couleur: enc, taille: 22 })
    d.etiquettes.push({ texte: '1', p: { x: o.x + R - 12, y: o.y + 20 }, couleur: enc, taille: 20 })
    d.etiquettes.push({ texte: '1', p: { x: o.x - 16, y: o.y - R + 16 }, couleur: enc, taille: 20 })
    d.etiquettes.push({ texte: '−1', p: { x: o.x - R - 20, y: o.y + 20 }, couleur: enc, taille: 20 })
    d.etiquettes.push({ texte: '−1', p: { x: o.x - 22, y: o.y + R + 16 }, couleur: enc, taille: 20 })
    // Le sens direct : une flèche courbe, contre le cercle
    d.lignes.push({ pts: arc(o, R + 28, Math.PI / 8, 3 * Math.PI / 8), couleur: VERT, taille: 2.5, fleche: true })
    d.etiquettes.push({ texte: '+', p: { x: o.x + (R + 58) * Math.cos(Math.PI / 4), y: o.y - (R + 58) * Math.sin(Math.PI / 4) }, couleur: VERT, taille: 26 })
    return d
  }
  if (version === 'valeurs') {
    const valeurs: [number, string][] = [[1 / 6, '√3/2'], [1 / 4, '√2/2'], [1 / 3, '1/2']]
    for (const [k, cos] of valeurs) {
      const a = k * Math.PI, x = o.x + R * Math.cos(a), y = o.y - R * Math.sin(a)
      d.lignes.push({ pts: [{ x, y }, { x, y: o.y }], couleur: GRIS, taille: 1.5, tirets: true })
      d.lignes.push({ pts: [{ x, y }, { x: o.x, y }], couleur: GRIS, taille: 1.5, tirets: true })
      // √2/2 plus bas : les trois valeurs sont proches
      d.etiquettes.push({ texte: cos, p: { x, y: o.y + (k === 1 / 4 ? 72 : 30) }, couleur: BLEU, taille: 20 })
      if (k === 1 / 4) d.lignes.push({ pts: [{ x, y: o.y }, { x, y: o.y + 48 }], couleur: GRIS, taille: 1.5, tirets: true })
    }
    // Sur l'axe des ordonnées, √2/2 plus à gauche : les trois valeurs sont proches
    for (const [k, sin, dx] of [[1 / 6, '1/2', 30], [1 / 4, '√2/2', 72], [1 / 3, '√3/2', 30]] as [number, string, number][])
      d.etiquettes.push({ texte: sin, p: { x: o.x - dx, y: o.y - R * Math.sin(k * Math.PI) }, couleur: ORANGE, taille: 20 })
    d.etiquettes.push({ texte: 'cos', p: { x: o.x + R + 56, y: o.y + 24 }, couleur: BLEU, taille: 22 })
    d.etiquettes.push({ texte: 'sin', p: { x: o.x - 32, y: o.y - R - 42 }, couleur: ORANGE, taille: 22 })
  }
  for (const [k, texte, deg] of ANGLES) {
    const a = k * Math.PI
    d.points.push({ p: { x: o.x + R * Math.cos(a), y: o.y - R * Math.sin(a) }, couleur: enc })
    const r = R + (Math.abs(Math.sin(a)) > 0.9 ? 32 : 42)
    const p = { x: o.x + r * Math.cos(a), y: o.y - r * Math.sin(a) }
    if (k === 0) { p.x += 4; p.y -= 20 } else if (k === 1) { p.x -= 4; p.y -= 20 }
    if (Math.abs(k) === 1 / 2) p.x += 30
    d.etiquettes.push({ texte, p, couleur: enc, taille: 22 })
    if (degres) d.etiquettes.push({ texte: deg, p: { x: o.x + (R - 34) * Math.cos(a), y: o.y - (R - 34) * Math.sin(a) }, couleur: GRIS, taille: 15 })
  }
  return d
}

// ---------- Les courbes de cos et sin ----------
export type QuellesCourbes = 'cos' | 'sin' | 'les-deux'
/** Les échelles : une unité vaut 50 en abscisse, 100 en ordonnée */
const UX = 50, UY = 100

/** Les courbes sur [−2π ; 2π], l'origine du repère en o */
export function courbesTrigo(o: P, quoi: QuellesCourbes): Dessin {
  const d = vide(), X = 2 * Math.PI * UX
  d.lignes.push({ pts: [{ x: o.x - X - 30, y: o.y }, { x: o.x + X + 50, y: o.y }], couleur: null, taille: 2, fleche: true })
  d.lignes.push({ pts: [{ x: o.x, y: o.y + UY + 50 }, { x: o.x, y: o.y - UY - 60 }], couleur: null, taille: 2, fleche: true })
  const ecritures = ['−2π', '−3π/2', '−π', '−π/2', '', 'π/2', 'π', '3π/2', '2π']
  ecritures.forEach((t, i) => {
    if (!t) return
    const x = o.x + (i - 4) * Math.PI / 2 * UX
    d.lignes.push({ pts: [{ x, y: o.y - 6 }, { x, y: o.y + 6 }], couleur: null, taille: 2 })
    d.etiquettes.push({ texte: t, p: { x, y: o.y + (t.includes('/') ? 32 : 24) }, couleur: null, taille: 18 })
  })
  for (const s of [1, -1]) {
    d.lignes.push({ pts: [{ x: o.x - 6, y: o.y - s * UY }, { x: o.x + 6, y: o.y - s * UY }], couleur: null, taille: 2 })
    d.etiquettes.push({ texte: s > 0 ? '1' : '−1', p: { x: o.x - (s > 0 ? 16 : 22), y: o.y - s * UY - (s > 0 ? 12 : -12) }, couleur: null, taille: 18 })
  }
  d.etiquettes.push({ texte: 'O', p: { x: o.x - 14, y: o.y + 16 }, couleur: null, taille: 18 })
  const courbe = (f: (x: number) => number) => Array.from({ length: 201 }, (_, i) => { const x = -2 * Math.PI + 4 * Math.PI * i / 200; return { x: o.x + x * UX, y: o.y - f(x) * UY } })
  if (quoi !== 'sin') {
    d.lignes.push({ pts: courbe(Math.cos), couleur: BLEU, taille: 3 })
    d.etiquettes.push({ texte: 'y = cos x', latex: 'y = \\cos x', p: { x: o.x - X + 20, y: o.y - UY - 26 }, couleur: BLEU, taille: 20 })
  }
  if (quoi !== 'cos') {
    d.lignes.push({ pts: courbe(Math.sin), couleur: ORANGE, taille: 3 })
    d.etiquettes.push({ texte: 'y = sin x', latex: 'y = \\sin x', p: { x: o.x + Math.PI / 2 * UX + 40, y: o.y - UY - 26 }, couleur: ORANGE, taille: 20 })
  }
  return d
}

// ---------- L'enroulement de la droite des réels ----------
export type Reperes = 'aucun' | 'remarquables' | 'entiers' | 'les-deux'
export interface ReglagesEnroulement { reperes: Reperes; deuxSens: boolean; reels: Reel[] }
export interface Reel { v: number; texte: string }
/** Rayon du cercle de l'enroulement (2 cm à 100 %) ; longueur de chaque
 *  moitié de la droite, en rayons ; ce qu'on enroule au plus : un tour */
export const RAYON_ENROULEMENT = 80
export const LONGUEUR_DEMI_DROITE = 8
export const UN_TOUR = 2 * Math.PI

/** Lit « π/3 ; 3π/4 ; −π/2 ; 2,5 » : chaque réel avec son écriture ; ce
 *  qui ne se lit pas est rendu à part, pour le dire */
export function lireReels(texte: string): { reels: Reel[]; erreurs: string[] } {
  const reels: Reel[] = [], erreurs: string[] = []
  for (const brut of texte.split(/[;\n]/).map(x => x.trim()).filter(Boolean)) {
    const m = brut.replace(/[−–]/g, '-').replace(/\s/g, '').replace(/,/g, '.').match(/^(-?)(\d*\.?\d*)(π|pi)?(?:\/(\d+))?$/i)
    const v = m && (m[2] || m[3]) ? (m[1] ? -1 : 1) * (m[2] ? Number(m[2]) : 1) * (m[3] ? Math.PI : 1) / (m[4] ? Number(m[4]) : 1) : NaN
    if (!Number.isFinite(v)) { erreurs.push(brut); continue }
    if (Math.abs(v) > LONGUEUR_DEMI_DROITE) { erreurs.push(brut); continue }
    reels.push({ v, texte: brut.replace(/-/g, '−').replace(/pi/gi, 'π').replace(/\s/g, '').replace(/\./g, ',') })
  }
  return { reels, erreurs }
}

/** Où est le réel t quand une longueur s est enroulée (sens direct pour
 *  t ≥ 0 ; pour t < 0 aussi si deuxSens, sinon cette moitié reste droite).
 *  Rend sa place (repère du cercle, rayon 1) et la normale en ce point :
 *  celle du cercle s'il y est, celle de la tangente sinon. */
export function placeDuReel(t: number, s: number, deuxSens: boolean): { x: number; y: number; nx: number; ny: number; enroule: boolean } {
  const a = t >= 0 ? s : (deuxSens ? -s : 0)
  if ((t >= 0 && t <= a) || (t < 0 && t >= a)) return { x: Math.cos(t), y: Math.sin(t), nx: Math.cos(t), ny: Math.sin(t), enroule: t !== 0 }
  return { x: Math.cos(a) - (t - a) * Math.sin(a), y: Math.sin(a) + (t - a) * Math.cos(a), nx: Math.cos(a), ny: Math.sin(a), enroule: false }
}

/** L'enroulement à l'instant où la longueur s est enroulée, cercle de centre o */
export function enroulement(o: P, s: number, reg: ReglagesEnroulement, R = RAYON_ENROULEMENT): Dessin {
  const d = vide(), L = LONGUEUR_DEMI_DROITE
  const monde = (x: number, y: number): P => ({ x: o.x + R * x, y: o.y - R * y })
  d.lignes.push({ pts: [monde(-1.7, 0), monde(1.8, 0)], couleur: GRIS, taille: 1.5, fleche: true })
  d.lignes.push({ pts: [monde(0, -1.7), monde(0, 1.8)], couleur: GRIS, taille: 1.5, fleche: true })
  d.ronds.push({ c: o, r: R, couleur: null, taille: 2 })
  d.etiquettes.push({ texte: 'O', p: { x: o.x - 13, y: o.y + 15 }, couleur: null, taille: 18 })
  d.etiquettes.push({ texte: 'I', p: { x: o.x + R + 12, y: o.y + 17 }, couleur: null, taille: 18 })
  // Chaque moitié : la partie enroulée en arc, puis le reste, droit, sur la tangente
  const moitie = (signe: 1 | -1, couleur: string) => {
    const enr = signe > 0 || reg.deuxSens ? Math.min(s, L) : 0
    const pts: P[] = []
    const n = Math.max(1, Math.ceil(enr / 0.05))
    for (let i = 0; i <= n; i++) { const t = signe * enr * i / n; pts.push(monde(Math.cos(t), Math.sin(t))) }
    if (enr < L) { const q = placeDuReel(signe * L, s, reg.deuxSens); pts.push(monde(q.x, q.y)) }
    d.lignes.push({ pts, couleur, taille: 4 })
  }
  moitie(1, BLEU); moitie(-1, ORANGE)
  // Les repères, qui voyagent avec la droite
  const marque = (t: number, texte: string, couleur: Couleur, fort = false) => {
    const q = placeDuReel(t, s, reg.deuxSens)
    const p = monde(q.x, q.y), k = fort ? 10 : 7
    d.lignes.push({ pts: [{ x: p.x - k * q.nx, y: p.y + k * q.ny }, { x: p.x + k * q.nx, y: p.y - k * q.ny }], couleur, taille: fort ? 3 : 2 })
    if (!texte) return
    // Sur le cercle, le sens direct s'écrit dehors, l'autre sens dedans
    const e = (texte.includes('/') ? 30 : 22) * (q.enroule && t < 0 ? -1 : 1) * (fort ? 1.2 : 1)
    d.etiquettes.push({ texte, latex: texteEnLatex(texte, true), p: { x: p.x + e * q.nx, y: p.y - e * q.ny }, couleur, taille: fort ? 20 : 17 })
  }
  const reperes: [number, string][] = []
  if (reg.reperes === 'entiers' || reg.reperes === 'les-deux')
    for (let k = -Math.floor(L); k <= Math.floor(L); k++) if (k) reperes.push([k, String(k).replace('-', '−')])
  if (reg.reperes === 'remarquables' || reg.reperes === 'les-deux')
    for (const [k, t] of [[0.5, 'π/2'], [1, 'π'], [1.5, '3π/2'], [2, '2π'], [-0.5, '−π/2'], [-1, '−π'], [-1.5, '−3π/2'], [-2, '−2π']] as [number, string][])
      reperes.push([k * Math.PI, t])
  for (const [t, texte] of reperes) {
    const q = placeDuReel(t, s, reg.deuxSens)
    // Une fois enroulés, les entiers gardent leur trait mais plus leur
    // nombre quand il y a aussi les valeurs remarquables (sinon tout se chevauche)
    // ±2π, enroulés, retombent sur I, où est déjà écrit 0
    const muet = q.enroule && ((Number.isInteger(t) && reg.reperes === 'les-deux') || Math.abs(Math.abs(t) - UN_TOUR) < 1e-9)
    marque(t, muet ? '' : texte, t > 0 ? BLEU : ORANGE)
  }
  marque(0, '0', null)
  // Les réels choisis, en vert : leur point, et une fois arrivés sur le cercle, leurs projections
  for (const r of reg.reels) {
    const q = placeDuReel(r.v, s, reg.deuxSens)
    const p = monde(q.x, q.y)
    if (q.enroule) {
      d.lignes.push({ pts: [p, { x: p.x, y: o.y }], couleur: VERT, taille: 1.5, tirets: true })
      d.lignes.push({ pts: [p, { x: o.x, y: p.y }], couleur: VERT, taille: 1.5, tirets: true })
    }
    d.points.push({ p, couleur: VERT })
    // Plus loin que les repères : un réel peut tomber sur l'un d'eux (−π/2 et 3π/2)
    const e = q.enroule ? 54 : 30, texte = q.enroule ? `M(${r.texte})` : r.texte
    d.etiquettes.push({ texte, latex: texteEnLatex(texte, true), p: { x: p.x + e * q.nx + (q.enroule ? 18 * Math.sign(q.nx || 1) : 0), y: p.y - e * q.ny }, couleur: VERT, taille: 19 })
  }
  return d
}

// ---------- Les fiches de formules ----------
/** \trou{…} marque ce que la version « à trous » laisse à compléter :
 *  sans trous, il reste son contenu ; avec, un blanc souligné de sa largeur. */
export function avecTrous(l: string, trous: boolean): string {
  let r = '', i = 0
  for (;;) {
    const j = l.indexOf('\\trou{', i)
    if (j < 0) return r + l.slice(i)
    let k = j + 6, prof = 1
    while (k < l.length && prof) { if (l[k] === '{') prof++; else if (l[k] === '}') prof--; k++ }
    const dedans = l.slice(j + 6, k - 1)
    r += l.slice(i, j) + (trous ? `\\underline{\\quad\\hphantom{${dedans}}\\quad}` : dedans)
    i = k
  }
}

/** La fiche, avec ou sans trous, prête à poser comme une démonstration */
export function ficheAvecTrous(d: Demonstration, trous: boolean): Demonstration {
  return { ...d, titre: avecTrous(d.titre, trous), etapes: d.etapes.map(e => e.map(l => avecTrous(l, trous))) }
}

const ligneTableau = (cellules: string[]) => cellules.join(' & ') + ' \\\\ \\hline'

export const FORMULES: readonly Demonstration[] = [
  {
    nom: 'Radians et degrés',
    niveau: '1re',
    chapitre: 'Trigonométrie',
    formules: true,
    titre: '\\textbf{Radians et degrés}',
    etapes: [
      ['Sur le cercle trigonométrique (de rayon $1$), l\'arc de $x$ radians a pour longueur $x$.'],
      ['Un tour complet mesure $2\\pi$ radians, donc $\\pi\\ \\text{rad} = \\trou{180^{\\circ}}$.'],
      ['$1\\ \\text{rad} = \\trou{\\dfrac{180^{\\circ}}{\\pi}} \\approx \\trou{57{,}3^{\\circ}}$ et $1^{\\circ} = \\trou{\\dfrac{\\pi}{180}}\\ \\text{rad}$.'],
      ['$\\begin{array}{|c|c|c|c|c|c|c|c|} \\hline ' +
        ligneTableau(['\\text{degrés}', '0^{\\circ}', '30^{\\circ}', '45^{\\circ}', '60^{\\circ}', '90^{\\circ}', '180^{\\circ}', '360^{\\circ}']) + ' ' +
        ligneTableau(['\\text{radians}', '\\trou{0}', '\\trou{\\dfrac{\\pi}{6}}', '\\trou{\\dfrac{\\pi}{4}}', '\\trou{\\dfrac{\\pi}{3}}', '\\trou{\\dfrac{\\pi}{2}}', '\\trou{\\pi}', '\\trou{2\\pi}']) +
        ' \\end{array}$'],
    ],
  },
  {
    nom: 'Mesure principale',
    niveau: '1re',
    chapitre: 'Trigonométrie',
    formules: true,
    titre: '\\textbf{Mesure principale}',
    etapes: [
      ['Les réels $x$ et $x + 2k\\pi$ (avec $k$ entier relatif) repèrent le même point du cercle.'],
      ['La mesure principale est celle de ces valeurs qui est dans l\'intervalle $\\mathopen{]}-\\pi\\,;\\pi]$.'],
      ['Méthode : on ajoute ou on retire des multiples de $2\\pi$ jusqu\'à tomber dans $\\mathopen{]}-\\pi\\,;\\pi]$.'],
      ['Exemple : $\\dfrac{17\\pi}{6} = \\dfrac{5\\pi}{6} + 2\\pi$, donc la mesure principale de $\\dfrac{17\\pi}{6}$ est $\\trou{\\dfrac{5\\pi}{6}}$.'],
      ['Exemple : $-\\dfrac{7\\pi}{4} = \\dfrac{\\pi}{4} - 2\\pi$, donc la mesure principale de $-\\dfrac{7\\pi}{4}$ est $\\trou{\\dfrac{\\pi}{4}}$.'],
    ],
  },
  {
    nom: 'Relations entre cos et sin',
    niveau: '1re',
    chapitre: 'Trigonométrie',
    formules: true,
    titre: '\\textbf{Pour tout réel } x \\textbf{ et tout entier relatif } k\\textbf{ :}',
    etapes: [
      ['$\\cos^2 x + \\sin^2 x = \\trou{1}$'],
      ['$-1 \\leqslant \\cos x \\leqslant 1 \\qquad -1 \\leqslant \\sin x \\leqslant 1$'],
      ['$\\cos(x + 2k\\pi) = \\trou{\\cos x} \\qquad \\sin(x + 2k\\pi) = \\trou{\\sin x}$'],
      ['$\\cos(-x) = \\trou{\\cos x} \\qquad \\sin(-x) = \\trou{-\\sin x}$'],
      ['$\\cos(\\pi - x) = \\trou{-\\cos x} \\qquad \\sin(\\pi - x) = \\trou{\\sin x}$'],
      ['$\\cos(\\pi + x) = \\trou{-\\cos x} \\qquad \\sin(\\pi + x) = \\trou{-\\sin x}$'],
      ['$\\cos\\left(\\dfrac{\\pi}{2} - x\\right) = \\trou{\\sin x} \\qquad \\sin\\left(\\dfrac{\\pi}{2} - x\\right) = \\trou{\\cos x}$'],
      ['$\\cos\\left(\\dfrac{\\pi}{2} + x\\right) = \\trou{-\\sin x} \\qquad \\sin\\left(\\dfrac{\\pi}{2} + x\\right) = \\trou{\\cos x}$'],
    ],
  },
  {
    nom: 'Valeurs remarquables',
    niveau: '1re',
    chapitre: 'Trigonométrie',
    formules: true,
    titre: '\\textbf{Valeurs remarquables}',
    etapes: [
      ['$\\begin{array}{|c|c|c|c|c|c|c|} \\hline ' +
        ligneTableau(['x', '0', '\\dfrac{\\pi}{6}', '\\dfrac{\\pi}{4}', '\\dfrac{\\pi}{3}', '\\dfrac{\\pi}{2}', '\\pi']) + ' ' +
        ligneTableau(['\\cos x', '\\trou{1}', '\\trou{\\dfrac{\\sqrt{3}}{2}}', '\\trou{\\dfrac{\\sqrt{2}}{2}}', '\\trou{\\dfrac{1}{2}}', '\\trou{0}', '\\trou{-1}']) + ' ' +
        ligneTableau(['\\sin x', '\\trou{0}', '\\trou{\\dfrac{1}{2}}', '\\trou{\\dfrac{\\sqrt{2}}{2}}', '\\trou{\\dfrac{\\sqrt{3}}{2}}', '\\trou{1}', '\\trou{0}']) +
        ' \\end{array}$'],
    ],
  },
  {
    nom: 'Fonctions cosinus et sinus',
    niveau: '1re',
    chapitre: 'Trigonométrie',
    formules: true,
    titre: '\\textbf{Les fonctions cosinus et sinus}',
    etapes: [
      ['Les fonctions $\\cos$ et $\\sin$ sont définies sur $\\mathbb{R}$, à valeurs dans $[-1\\,;1]$.'],
      ['Elles sont périodiques, de période $\\trou{2\\pi}$ : $\\cos(x + 2\\pi) = \\cos x$ et $\\sin(x + 2\\pi) = \\sin x$.'],
      ['$\\cos$ est paire : $\\cos(-x) = \\cos x$.', 'Sa courbe est symétrique par rapport à l\'axe des ordonnées.'],
      ['$\\sin$ est impaire : $\\sin(-x) = -\\sin x$.', 'Sa courbe est symétrique par rapport à l\'origine du repère.'],
      ['Sur $[0\\,;\\pi]$, $\\cos$ décroît de $1$ à $-1$.',
        '$\\sin$ croît de $0$ à $1$ sur $\\left[0\\,;\\dfrac{\\pi}{2}\\right]$, puis décroît de $1$ à $0$ sur $\\left[\\dfrac{\\pi}{2}\\,;\\pi\\right]$.'],
    ],
  },
]
