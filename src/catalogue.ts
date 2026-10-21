// =============================================================
// LE CATALOGUE : DES ÉLÉMENTS DE COURS TOUT PRÊTS
// Ce fichier ne touche ni au tableau ni à l'écran : il dit ce qu'il faut
// poser (des figures et des formules ordinaires) et où. Le panneau
// (catalogue-vue.ts) les pose, groupées, d'un seul geste.
//
// Premier thème, en 2nde : les ensembles de nombres.
//  - Le dessin des ensembles emboîtés ℕ ⊂ ℤ ⊂ 𝔻 ⊂ ℚ ⊂ ℝ, vide ou complété :
//    chaque nombre tapé va dans le plus petit ensemble qui le contient.
//  - Deux démonstrations du programme, ligne par ligne.
// =============================================================
import type { P } from './construction'

// ---------- Les nombres : lire, classer, écrire ----------

/** Les cinq ensembles, du plus petit au plus grand */
export type Ensemble = 'N' | 'Z' | 'D' | 'Q' | 'R'
export const ENSEMBLES: readonly Ensemble[] = ['N', 'Z', 'D', 'Q', 'R']
export const SYMBOLE: Record<Ensemble, string> = { N: 'ℕ', Z: 'ℤ', D: '𝔻', Q: 'ℚ', R: 'ℝ' }
export const LATEX_ENSEMBLE: Record<Ensemble, string> = { N: '\\mathbb{N}', Z: '\\mathbb{Z}', D: '\\mathbb{D}', Q: '\\mathbb{Q}', R: '\\mathbb{R}' }

/** Un rationnel exact, toujours réduit, le dénominateur positif */
interface Rat { n: bigint; d: bigint }
/** Ce que vaut une expression : un rationnel ; c·√r (r sans facteur carré,
 *  plus grand que 1) ; un irrationnel qu'on ne sait pas écrire (π, 1 + √2) ;
 *  ou « on ne sait pas » (√2 + π − π, par exemple) */
type Valeur = { k: 'q'; q: Rat } | { k: 'rac'; c: Rat; r: bigint } | { k: 'irr' } | { k: '?' }

const abs = (a: bigint) => a < 0n ? -a : a
function pgcd(a: bigint, b: bigint): bigint { a = abs(a); b = abs(b); while (b) [a, b] = [b, a % b]; return a }
function rat(n: bigint, d = 1n): Rat {
  if (d === 0n) throw new Erreur('division par zéro')
  if (d < 0n) { n = -n; d = -d }
  const g = pgcd(n, d) || 1n
  return { n: n / g, d: d / g }
}
const ZERO = rat(0n)
const estNul = (q: Rat) => q.n === 0n
const plus = (a: Rat, b: Rat) => rat(a.n * b.d + b.n * a.d, a.d * b.d)
const fois = (a: Rat, b: Rat) => rat(a.n * b.n, a.d * b.d)
const inverse = (a: Rat) => rat(a.d, a.n)

/** n = s² · t, t sans facteur carré */
function sansCarre(n: bigint): { s: bigint; t: bigint } {
  let s = 1n, t = n
  for (let p = 2n; p * p <= t; p++) while (t % (p * p) === 0n) { t /= p * p; s *= p }
  return { s, t }
}
/** c·√r, simplifié (r = 1 : un rationnel) */
function racine(c: Rat, r: bigint): Valeur {
  if (estNul(c) || r === 0n) return { k: 'q', q: ZERO }
  const { s, t } = sansCarre(r)
  const c2 = fois(c, rat(s))
  return t === 1n ? { k: 'q', q: c2 } : { k: 'rac', c: c2, r: t }
}
const q = (v: Rat): Valeur => ({ k: 'q', q: v })
const nul = (v: Valeur) => v.k === 'q' && estNul(v.q)

function somme(a: Valeur, b: Valeur): Valeur {
  if (nul(a)) return b
  if (nul(b)) return a
  if (a.k === 'q' && b.k === 'q') return q(plus(a.q, b.q))
  if (a.k === 'rac' && b.k === 'rac' && a.r === b.r) return racine(plus(a.c, b.c), a.r)
  // Un rationnel (non nul) plus un irrationnel, ou deux racines différentes : irrationnel
  if (a.k === 'q' || b.k === 'q') return a.k === '?' || b.k === '?' ? { k: '?' } : { k: 'irr' }
  if (a.k === 'rac' && b.k === 'rac') return { k: 'irr' }
  return { k: '?' }
}
const oppose = (a: Valeur): Valeur => a.k === 'q' ? q(rat(-a.q.n, a.q.d)) : a.k === 'rac' ? { k: 'rac', c: rat(-a.c.n, a.c.d), r: a.r } : a
function produit(a: Valeur, b: Valeur): Valeur {
  if (nul(a) || nul(b)) return q(ZERO)
  if (a.k === 'q' && b.k === 'q') return q(fois(a.q, b.q))
  if (a.k === 'q' && b.k === 'rac') return racine(fois(a.q, b.c), b.r)
  if (a.k === 'rac' && b.k === 'q') return racine(fois(a.c, b.q), a.r)
  if (a.k === 'rac' && b.k === 'rac') return racine(fois(a.c, b.c), a.r * b.r)
  if ((a.k === 'q' && b.k === 'irr') || (a.k === 'irr' && b.k === 'q')) return { k: 'irr' }
  return { k: '?' }
}
function quotient(a: Valeur, b: Valeur): Valeur {
  if (nul(b)) throw new Erreur('division par zéro')
  if (b.k === 'q') return produit(a, q(inverse(b.q)))
  // a / (c√r) = a · √r / (c·r)
  if (b.k === 'rac') return produit(a, racine(inverse(fois(b.c, rat(b.r))), b.r))
  return nul(a) ? a : a.k === 'q' ? { k: 'irr' } : { k: '?' }
}
function puissance(a: Valeur, e: Valeur): Valeur {
  if (e.k !== 'q' || e.q.d !== 1n) throw new Erreur('exposant non entier')
  const n = e.q.n
  if (abs(n) > 400n) throw new Erreur('exposant trop grand')
  if (n === 0n) { if (nul(a)) throw new Erreur('0 puissance 0'); return q(rat(1n)) }
  let r: Valeur = q(rat(1n))
  for (let i = 0n; i < abs(n); i++) r = produit(r, a)
  return n < 0n ? quotient(q(rat(1n)), r) : r
}
function racineDe(a: Valeur): Valeur {
  if (a.k === 'q') {
    if (a.q.n < 0n) throw new Erreur('racine d\'un nombre négatif')
    // √(n/d) = √(n·d) / d
    return racine(rat(1n, a.q.d), a.q.n * a.q.d)
  }
  if (a.k === 'rac') {
    if (a.c.n < 0n) throw new Erreur('racine d\'un nombre négatif')
    return { k: 'irr' }       // √(c√r) : r n'est pas un carré, sa racine quatrième non plus
  }
  return { k: '?' }
}

class Erreur extends Error {}

// ----- L'arbre d'une expression -----
type Noeud =
  | { t: 'nb'; ecrit: string; v: Rat; suite?: boolean }       // suite : écrit avec « … »
  | { t: 'pi' }
  | { t: 'rac'; a: Noeud }
  | { t: 'neg'; a: Noeud }
  | { t: 'op'; op: '+' | '-' | '×' | '·' | '/' | '÷' | '^'; a: Noeud; b: Noeud }
  | { t: 'par'; a: Noeud }

/** Ce qu'on tape au clavier, ramené à quelques signes : − → -, sqrt et
 *  \sqrt → √, pi et \pi → π, \frac{a}{b} → (a)/(b), accolades → parenthèses */
function normaliser(s: string): string {
  let t = s.trim()
    .replace(/\$/g, '')
    .replace(/[−–]/g, '-').replace(/[*]/g, '×').replace(/\\times|\\cdot/g, '×').replace(/\\div/g, '÷')
    .replace(/\.\.\.|\\ldots|\\dots/g, '…')
    .replace(/\\left|\\right/g, '')
    .replace(/\\[dt]?frac/g, '\\frac')
  // \sqrt{x} → √(x), \frac{a}{b} → ((a)/(b)), de l'intérieur vers l'extérieur
  for (let i = 0; i < 30; i++) {
    const avant = t
    t = t.replace(/\\sqrt\s*\{([^{}]*)\}/g, '√($1)')
      .replace(/\\frac\s*\{([^{}]*)\}\s*\{([^{}]*)\}/g, '(($1)/($2))')
      .replace(/\\frac\s*(\d)\s*(\d)/g, '($1/$2)')
    if (t === avant) break
  }
  return t
    .replace(/\\sqrt|racine|sqrt|rac/gi, '√')
    .replace(/\\pi|pi/gi, 'π')
    .replace(/[{[]/g, '(').replace(/[}\]]/g, ')')
    .replace(/\s+/g, '')
}

/** Lit une expression (déjà normalisée) en arbre */
function lire(s: string): Noeud {
  let i = 0
  const voir = () => s[i]
  const attendre = (c: string) => { if (s[i] !== c) throw new Erreur(i >= s.length ? 'expression incomplète' : `« ${s[i]} » inattendu`); i++ }
  const debutFacteur = (c: string | undefined) => !!c && (/[0-9,.(√π]/.test(c))
  function expression(): Noeud {
    let a = terme()
    while (voir() === '+' || voir() === '-') { const op = s[i++] as '+' | '-'; a = { t: 'op', op, a, b: terme() } }
    return a
  }
  function terme(): Noeud {
    let a = unaire()
    for (;;) {
      const c = voir()
      if (c === '×' || c === '·' || c === '/' || c === '÷' || c === ':') {
        i++
        a = { t: 'op', op: c === ':' ? '÷' : c, a, b: unaire() }
      } else if (debutFacteur(c)) a = { t: 'op', op: '·', a, b: puissanceDe() }     // 2√3, 3π, 2(1+√2)
      else return a
    }
  }
  function unaire(): Noeud {
    if (voir() === '-') { i++; return { t: 'neg', a: unaire() } }
    if (voir() === '+') { i++; return unaire() }
    return puissanceDe()
  }
  function puissanceDe(): Noeud {
    const a = primaire()
    if (voir() === '^') { i++; return { t: 'op', op: '^', a, b: unaire() } }
    return a
  }
  function primaire(): Noeud {
    const c = voir()
    if (c === undefined) throw new Erreur('expression incomplète')
    if (c === '(') { i++; const a = expression(); attendre(')'); return { t: 'par', a } }
    if (c === 'π') { i++; return { t: 'pi' } }
    if (c === '√') { i++; return { t: 'rac', a: voir() === '(' ? primaire() : puissanceDeNombre() } }
    if (/[0-9,.]/.test(c)) return nombre()
    throw new Erreur(`« ${c} » inattendu`)
  }
  // √2^2 se lit (√2)², mais √16 se lit √(16) : après √ sans parenthèse, un nombre seul
  function puissanceDeNombre(): Noeud { return nombre() }
  function nombre(): Noeud {
    const m = /^(\d*)(?:[,.](\d*))?(…)?/.exec(s.slice(i))!
    if (!m[0] || (!m[1] && !m[2])) throw new Erreur(`« ${s[i]} » inattendu`)
    i += m[0].length
    const ent = m[1] || '0', dec = m[2] ?? ''
    const v = rat(BigInt(ent + dec), 10n ** BigInt(dec.length))
    const ecrit = (m[1] || '0') + (m[2] !== undefined ? ',' + dec : '')
    if (m[3]) {
      // 0,333… : la dernière décimale se répète (0,1212… : les deux dernières,
      // si elles sont déjà écrites deux fois). Le nombre est rationnel.
      return { t: 'nb', ecrit, v: periodique(ent, dec), suite: true }
    }
    return { t: 'nb', ecrit, v }
  }
  const a = expression()
  if (i < s.length) throw new Erreur(`« ${s[i]} » inattendu`)
  return a
}

/** La fraction d'une écriture décimale illimitée périodique : la plus
 *  courte période qui se répète au moins deux fois à la fin des décimales
 *  écrites (0,333… : 3 ; 0,1212… : 12 ; 2,4545… : 45 ; 0,16… : 6) */
function periodique(ent: string, dec: string): Rat {
  if (!dec) throw new Erreur('des décimales avant « … »')
  let l = 1
  for (let k = 1; 2 * k <= dec.length; k++) {
    if (dec.slice(-k) === dec.slice(-2 * k, -k)) { l = k; break }
  }
  const avant = dec.slice(0, dec.length - l), periode = dec.slice(-l)
  // x = ent,avant(periode) : (ent avant periode − ent avant) / (99…9 00…0)
  const tout = BigInt(ent + avant + periode), debut = BigInt(ent + avant || '0')
  return rat(tout - debut, (10n ** BigInt(l) - 1n) * 10n ** BigInt(avant.length))
}

function valeur(n: Noeud): Valeur {
  switch (n.t) {
    case 'nb': return q(n.v)
    case 'pi': return { k: 'irr' }
    case 'rac': return racineDe(valeur(n.a))
    case 'neg': return oppose(valeur(n.a))
    case 'par': return valeur(n.a)
    case 'op': {
      const a = valeur(n.a), b = valeur(n.b)
      switch (n.op) {
        case '+': return somme(a, b)
        case '-': return somme(a, oppose(b))
        case '×': case '·': return produit(a, b)
        case '/': case '÷': return quotient(a, b)
        case '^': return puissance(a, b)
      }
    }
  }
}

/** L'arbre en LaTeX : la fraction tapée a/b devient \frac{a}{b} */
function enLatex(n: Noeud): string {
  const sansPar = (m: Noeud) => m.t === 'par' ? m.a : m
  switch (n.t) {
    case 'nb': return n.ecrit.replace(',', '{,}') + (n.suite ? '\\!\\ldots' : '')
    case 'pi': return '\\pi'
    case 'rac': return `\\sqrt{${enLatex(sansPar(n.a))}}`
    case 'neg': return '-' + enLatex(n.a)
    case 'par': return `(${enLatex(n.a)})`
    case 'op':
      // −2/7 s'écrit −2⁄7 avec le signe devant la barre
      if (n.op === '/' && n.a.t === 'neg') return `-\\frac{${enLatex(sansPar(n.a.a))}}{${enLatex(sansPar(n.b))}}`
      if (n.op === '/') return `\\frac{${enLatex(sansPar(n.a))}}{${enLatex(sansPar(n.b))}}`
      if (n.op === '^') return `${enLatex(n.a)}^{${enLatex(sansPar(n.b))}}`
      if (n.op === '·') return enLatex(n.a) + enLatex(n.b)
      return enLatex(n.a) + ({ '+': ' + ', '-': ' - ', '×': ' \\times ', '÷': ' \\div ' } as Record<string, string>)[n.op] + enLatex(n.b)
  }
}

export interface NombreClasse {
  /** Ce qui a été tapé */
  texte: string
  /** Comme il s'écrit au tableau */
  latex: string
  /** Le plus petit des cinq ensembles qui le contient */
  ensemble: Ensemble
  /** Placé dans ℝ faute de savoir conclure (√2 × √2 se calcule, √2 + π − π non) */
  doute?: boolean
}

/** Lit un nombre tapé (« −5 », « 2,7 », « 1/3 », « √16 », « 0,333… »,
 *  « 2π », « 1 + √2 », « 10^-2 »…) et dit le plus petit ensemble qui le
 *  contient. Rend un message s'il ne le comprend pas. */
export function classerNombre(texte: string): NombreClasse | { texte: string; erreur: string } {
  const t = texte.trim()
  try {
    const arbre = lire(normaliser(t))
    const v = valeur(arbre)
    const latex = enLatex(arbre)
    if (v.k !== 'q') return { texte: t, latex, ensemble: 'R', ...(v.k === '?' ? { doute: true } : {}) }
    const { n, d } = v.q
    let ensemble: Ensemble
    if (d === 1n) ensemble = n >= 0n ? 'N' : 'Z'
    else {
      let r = d
      while (r % 2n === 0n) r /= 2n
      while (r % 5n === 0n) r /= 5n
      ensemble = r === 1n ? 'D' : 'Q'
    }
    return { texte: t, latex, ensemble }
  } catch (e) {
    if (e instanceof Erreur) return { texte: t, erreur: e.message }
    if (e instanceof RangeError || e instanceof SyntaxError) return { texte: t, erreur: 'nombre illisible' }
    throw e
  }
}

/** La liste tapée par le professeur : séparée par des points-virgules ou
 *  des retours à la ligne (la virgule est celle des décimaux) */
export function lireListe(texte: string): string[] {
  return texte.split(/[;\n]+/).map(s => s.trim()).filter(Boolean)
}

// ---------- Le dessin des ensembles emboîtés ----------

/** Chaque ensemble est un ovale : celui de ℝ, et les autres, de plus en
 *  plus petits, réduits depuis un point en bas à gauche de lui. Réduire un
 *  ovale depuis un point intérieur le garde dedans : chacun est bien dans
 *  le suivant, et la place libre de chaque zone est à droite, pour ses
 *  nombres. En unités du tableau, depuis le coin haut-gauche du dessin
 *  (900 × 520 : 22,5 cm sur 13 à 100 %). */
const GRAND = { cx: 450, cy: 260, rx: 440, ry: 250 }
const POLE = { x: GRAND.cx - 0.7 * GRAND.rx, y: GRAND.cy + 0.45 * GRAND.ry }
const REDUCTION: Record<Ensemble, number> = { R: 1, Q: 0.81, D: 0.62, Z: 0.45, N: 0.3 }
const OVALES = Object.fromEntries(ENSEMBLES.map(e => {
  const k = REDUCTION[e]
  return [e, [POLE.x + k * (GRAND.cx - POLE.x), POLE.y + k * (GRAND.cy - POLE.y), k * GRAND.rx, k * GRAND.ry]]
})) as Record<Ensemble, [number, number, number, number]>
export const LARGEUR_DESSIN = 900
export const HAUTEUR_DESSIN = 520
/** Le nom de chaque ensemble, en haut à droite de son ovale (l'angle, en
 *  radians, depuis le centre ; l'ovale réduit où il se pose) */
const ANGLE_NOM = -0.72, REDUIT_NOM = 0.86

export const COULEURS: Record<Ensemble, string> = { N: '#2f6fd6', Z: '#1f9e77', D: '#d9822b', Q: '#b2457a', R: '#6b4fc8' }

/** Les sommets d'un ovale (en partant de la droite, dans le sens horaire de l'écran) */
export function ovale(cx: number, cy: number, rx: number, ry: number, n = 72): P[] {
  return Array.from({ length: n }, (_, i) => {
    const a = 2 * Math.PI * i / n
    return { x: Math.round((cx + rx * Math.cos(a)) * 10) / 10, y: Math.round((cy + ry * Math.sin(a)) * 10) / 10 }
  })
}

/** Le dessin posé avec son coin haut-gauche en o : les cinq ovales, et le
 *  centre du nom de chaque ensemble */
export function dessinEnsembles(o: P): { ovales: Record<Ensemble, P[]>; noms: Record<Ensemble, P> } {
  const ovales = {} as Record<Ensemble, P[]>, noms = {} as Record<Ensemble, P>
  for (const e of ENSEMBLES) {
    const [cx, cy, rx, ry] = OVALES[e]
    ovales[e] = ovale(o.x + cx, o.y + cy, rx, ry)
    noms[e] = { x: o.x + cx + rx * REDUIT_NOM * Math.cos(ANGLE_NOM), y: o.y + cy + ry * REDUIT_NOM * Math.sin(ANGLE_NOM) }
  }
  return { ovales, noms }
}

// ----- Où poser un nombre -----

export function dansPolygone(p: P, poly: P[]): boolean {
  let dedans = false
  for (let i = 0, j = poly.length - 1; i < poly.length; j = i++) {
    const a = poly[i], b = poly[j]
    if ((a.y > p.y) !== (b.y > p.y) && p.x < (b.x - a.x) * (p.y - a.y) / (b.y - a.y) + a.x) dedans = !dedans
  }
  return dedans
}
function distanceAuBord(p: P, poly: P[]): number {
  let m = Infinity
  for (let i = 0, j = poly.length - 1; i < poly.length; j = i++) {
    const a = poly[j], b = poly[i]
    const dx = b.x - a.x, dy = b.y - a.y, l2 = dx * dx + dy * dy
    const t = l2 ? Math.max(0, Math.min(1, ((p.x - a.x) * dx + (p.y - a.y) * dy) / l2)) : 0
    m = Math.min(m, Math.hypot(p.x - a.x - t * dx, p.y - a.y - t * dy))
  }
  return m
}

/** Une boîte posée sur le dessin (un nom, un nombre déjà là) */
export interface Boite { x: number; y: number; l: number; h: number }

const chevauche = (a: Boite, b: Boite, marge: number) =>
  a.x < b.x + b.l + marge && b.x < a.x + a.l + marge && a.y < b.y + b.h + marge && b.y < a.y + a.h + marge

/** Le centre où poser une étiquette de taille l × h dans la zone de
 *  l'ensemble : dans son ovale, hors de l'ovale plus petit (sauf pour ℕ),
 *  sans toucher les bords ni ce qui est déjà posé. Parmi les places
 *  possibles, la plus éloignée de ce qui est déjà là (les nombres
 *  s'étalent dans la zone). null : la zone est pleine. */
export function placeDansZone(exterieur: P[], interieur: P[] | null, l: number, h: number, occupe: Boite[], echelle = 1): P | null {
  const xs = exterieur.map(p => p.x), ys = exterieur.map(p => p.y)
  const x0 = Math.min(...xs), x1 = Math.max(...xs), y0 = Math.min(...ys), y1 = Math.max(...ys)
  const pas = 8 * echelle, marge = 4 * echelle
  let mieux: P | null = null, score = -Infinity
  for (let y = y0 + h / 2; y <= y1 - h / 2; y += pas) for (let x = x0 + l / 2; x <= x1 - l / 2; x += pas) {
    const c = { x, y }
    // D'abord ce qui coûte peu : rien de posé dessous, les coins dans la
    // zone ; ensuite seulement, loin des bords
    const b = { x: x - l / 2, y: y - h / 2, l, h }
    if (occupe.some(o => chevauche(b, o, 2 * marge))) continue
    const coins = [c, { x: x - l / 2, y: y - h / 2 }, { x: x + l / 2, y: y - h / 2 }, { x: x - l / 2, y: y + h / 2 }, { x: x + l / 2, y: y + h / 2 }]
    if (!coins.every(p => dansPolygone(p, exterieur)) || (interieur && coins.some(p => dansPolygone(p, interieur)))) continue
    if (coins.some(p => distanceAuBord(p, exterieur) < marge || (interieur && distanceAuBord(p, interieur) < marge))) continue
    // Loin de ce qui est posé, et pas collé aux bords
    const bord = Math.min(distanceAuBord(c, exterieur), interieur ? distanceAuBord(c, interieur) : Infinity)
    const voisin = occupe.reduce((m, o) => Math.min(m, Math.hypot(o.x + o.l / 2 - x, o.y + o.h / 2 - y)), Infinity)
    const s = Math.min(voisin, bord * 2.5)
    if (s > score) { score = s; mieux = c }
  }
  return mieux
}

// ---------- Les démonstrations ----------

/** Une ligne mêle du texte et des maths entre $…$ ; elle devient une
 *  formule (le texte dans \text{…}) */
export function ligneEnLatex(ligne: string): string {
  return ligne.split('$').map((m, i) => i % 2 ? m : m ? `\\text{${m.replace(/[\\{}]/g, c => '\\' + c)}}` : '').join('')
}

/** Les niveaux du catalogue */
export type Niveau = '2nde' | '1re'

/**
 * Le rangement du programme (BO 2026) : pour chaque niveau, ses thèmes, et
 * dans chaque thème ses chapitres. Un thème sans chapitre est un thème où le
 * programme ne demande aucune démonstration.
 */
export const PROGRAMME: readonly { niveau: Niveau; nom: string; themes: readonly { nom: string; chapitres: readonly string[] }[] }[] = [
  {
    niveau: '2nde', nom: '2nde', themes: [
      { nom: 'Nombres et calculs', chapitres: ['Arithmétique', 'Nombres réels', 'Algèbre'] },
      { nom: 'Géométrie', chapitres: ['Vecteurs', 'Droites du plan'] },
      { nom: 'Fonctions', chapitres: ['Variations et extrémums'] },
      { nom: 'Statistiques et probabilités', chapitres: [] },
    ],
  },
  {
    niveau: '1re', nom: '1re spé', themes: [
      { nom: 'Algèbre', chapitres: ['Suites', 'Second degré'] },
      { nom: 'Analyse', chapitres: ['Dérivation', 'Trigonométrie'] },
      { nom: 'Géométrie', chapitres: ['Produit scalaire'] },
      { nom: 'Probabilités et statistiques', chapitres: [] },
    ],
  },
]

/** Le dessin des ensembles de nombres se range ici */
export const PLACE_ENSEMBLES = { niveau: '2nde' as Niveau, chapitre: 'Nombres réels' }

export interface Demonstration {
  nom: string
  niveau: Niveau
  /** Le chapitre du programme où elle se range (un nom de PROGRAMME) */
  chapitre: string
  /** Le titre, posé d'emblée */
  titre: string
  /** Les étapes, montrées une à une ; chacune a une ou deux lignes */
  etapes: string[][]
}

export const DEMONSTRATIONS: readonly Demonstration[] = [
  {
    nom: 'Somme de deux multiples',
    niveau: '2nde',
    chapitre: 'Arithmétique',
    titre: '\\textbf{Démonstration : la somme de deux multiples de } 7 \\textbf{ est un multiple de } 7\\textbf{.}',
    etapes: [
      ['Soit $m$ et $n$ deux multiples de $7$.',
        'Il existe deux entiers $k$ et $k\'$ tels que $m = 7k$ et $n = 7k\'$.'],
      ['Alors $m + n = 7k + 7k\' = 7(k + k\')$.'],
      ['Or $k + k\'$ est un entier, comme somme de deux entiers.'],
      ['Donc $m + n$ est un multiple de $7$.'],
      ['Le même raisonnement vaut pour tout autre entier $a$ à la place de $7$ : $m + n = a(k + k\')$.'],
    ],
  },
  {
    nom: 'Le carré d\'un impair est impair',
    niveau: '2nde',
    chapitre: 'Arithmétique',
    titre: '\\textbf{Démonstration : le carré d\'un nombre impair est impair.}',
    etapes: [
      ['Soit $n$ un nombre impair : il existe un entier $k$ tel que $n = 2k + 1$.'],
      ['Alors $n^2 = (2k + 1)^2 = 4k^2 + 4k + 1$.'],
      ['Donc $n^2 = 2(2k^2 + 2k) + 1$.'],
      ['Or $k\' = 2k^2 + 2k$ est un entier : ainsi $n^2 = 2k\' + 1$.'],
      ['Donc $n^2$ est impair.'],
    ],
  },
  {
    nom: '1/3 n\'est pas décimal',
    niveau: '2nde',
    chapitre: 'Nombres réels',
    titre: '\\textbf{Démonstration : } \\dfrac{1}{3} \\textbf{ n\'est pas un nombre décimal.}',
    etapes: [
      ['Raisonnons par l\'absurde : supposons que $\\dfrac{1}{3}$ est décimal.',
        'Il existe alors $a \\in \\mathbb{Z}$ et $n \\in \\mathbb{N}$ tels que $\\dfrac{1}{3} = \\dfrac{a}{10^n}$.'],
      ['En multipliant les deux membres par $3 \\times 10^n$, on obtient $10^n = 3a$.'],
      ['Donc $10^n$ est un multiple de $3$.'],
      ['Or la somme des chiffres de $10^n$ vaut $1$, qui n\'est pas un multiple de $3$ :',
        'donc $10^n$ n\'est pas un multiple de $3$.'],
      ['C\'est une contradiction. Donc $\\dfrac{1}{3}$ n\'est pas décimal : $\\dfrac{1}{3} \\notin \\mathbb{D}$.'],
    ],
  },
  {
    nom: '√2 n\'est pas rationnel',
    niveau: '2nde',
    chapitre: 'Nombres réels',
    titre: '\\textbf{Démonstration : } \\sqrt{2} \\textbf{ n\'est pas un nombre rationnel.}',
    etapes: [
      ['Raisonnons par l\'absurde : supposons que $\\sqrt{2}$ est rationnel.',
        'Il s\'écrit alors $\\sqrt{2} = \\dfrac{p}{q}$ avec $p \\in \\mathbb{N}$, $q \\in \\mathbb{N}^*$ et $\\dfrac{p}{q}$ irréductible.'],
      ['En élevant au carré : $2 = \\dfrac{p^2}{q^2}$, donc $p^2 = 2q^2$.'],
      ['Ainsi $p^2$ est pair, donc $p$ est pair (le carré d\'un nombre impair est impair).',
        'On écrit $p = 2k$ avec $k \\in \\mathbb{N}$.'],
      ['Alors $(2k)^2 = 2q^2$, soit $4k^2 = 2q^2$, donc $q^2 = 2k^2$.',
        'Ainsi $q^2$ est pair, donc $q$ est pair.'],
      ['$p$ et $q$ sont tous les deux pairs : la fraction $\\dfrac{p}{q}$ n\'est pas irréductible.'],
      ['C\'est une contradiction. Donc $\\sqrt{2} \\notin \\mathbb{Q}$ : $\\sqrt{2}$ est irrationnel.'],
    ],
  },
  {
    nom: '√(ab) = √a × √b',
    niveau: '2nde',
    chapitre: 'Algèbre',
    titre: '\\textbf{Démonstration : pour tous réels positifs } a \\textbf{ et } b\\textbf{, } \\sqrt{ab} = \\sqrt{a} \\times \\sqrt{b}\\textbf{.}',
    etapes: [
      ['Soit $a$ et $b$ deux réels positifs.'],
      ['$\\sqrt{a} \\times \\sqrt{b}$ est positif, comme produit de deux nombres positifs.'],
      ['Son carré vaut $\\left(\\sqrt{a} \\times \\sqrt{b}\\right)^2 = \\left(\\sqrt{a}\\right)^2 \\times \\left(\\sqrt{b}\\right)^2 = a \\times b$.'],
      ['Or $\\sqrt{ab}$ est l\'unique nombre positif dont le carré vaut $ab$.'],
      ['Donc $\\sqrt{ab} = \\sqrt{a} \\times \\sqrt{b}$.'],
    ],
  },
  {
    nom: 'Colinéarité et déterminant',
    niveau: '2nde',
    chapitre: 'Vecteurs',
    titre: '\\textbf{Démonstration : caractérisations de la colinéarité de deux vecteurs non nuls.}',
    etapes: [
      ['Dans une base orthonormée, soit $\\vec{u}\\begin{pmatrix}x\\\\y\\end{pmatrix}$ et $\\vec{v}\\begin{pmatrix}x\'\\\\y\'\\end{pmatrix}$ deux vecteurs non nuls,',
        'et $\\det(\\vec{u}, \\vec{v}) = xy\' - x\'y$.'],
      ['Supposons $\\vec{u}$ et $\\vec{v}$ colinéaires : il existe un réel $k$ tel que $\\vec{v} = k\\vec{u}$,',
        'soit $x\' = kx$ et $y\' = ky$ : les coordonnées sont proportionnelles.'],
      ['Alors $\\det(\\vec{u}, \\vec{v}) = x \\times ky - kx \\times y = 0$.'],
      ['Réciproquement, supposons $xy\' - x\'y = 0$. Comme $\\vec{u} \\neq \\vec{0}$, on a $x \\neq 0$ ou $y \\neq 0$.'],
      ['Si $x \\neq 0$, on pose $k = \\dfrac{x\'}{x}$ : alors $x\' = kx$ et $y\' = \\dfrac{x\'y}{x} = ky$.'],
      ['Si $y \\neq 0$, on pose $k = \\dfrac{y\'}{y}$ : alors $y\' = ky$ et $x\' = \\dfrac{xy\'}{y} = kx$.'],
      ['Dans les deux cas $\\vec{v} = k\\vec{u}$ : les coordonnées sont proportionnelles et les vecteurs colinéaires.'],
      ['Conclusion : $\\vec{u}$ et $\\vec{v}$ colinéaires $\\iff$ coordonnées proportionnelles $\\iff \\det(\\vec{u}, \\vec{v}) = 0$.'],
    ],
  },
  {
    nom: 'Équation cartésienne d\'une droite',
    niveau: '2nde',
    chapitre: 'Droites du plan',
    titre: '\\textbf{Démonstration : forme générale d\'une équation de droite.}',
    etapes: [
      ['Soit $d$ la droite passant par $A(x_A\\,;y_A)$, de vecteur directeur $\\vec{u}\\begin{pmatrix}\\alpha\\\\\\beta\\end{pmatrix}$ non nul.'],
      ['Un point $M(x\\,;y)$ est sur $d$ si et seulement si $\\overrightarrow{AM}\\begin{pmatrix}x - x_A\\\\y - y_A\\end{pmatrix}$ et $\\vec{u}$ sont colinéaires,',
        'c\'est-à-dire si et seulement si $\\det(\\overrightarrow{AM}, \\vec{u}) = 0$.'],
      ['$M \\in d \\iff (x - x_A)\\beta - (y - y_A)\\alpha = 0 \\iff \\beta x - \\alpha y + \\alpha y_A - \\beta x_A = 0$.'],
      ['On pose $a = \\beta$, $b = -\\alpha$ et $c = \\alpha y_A - \\beta x_A$ : $M \\in d \\iff ax + by + c = 0$,',
        'avec $(a\\,;b) \\neq (0\\,;0)$ car $\\vec{u} \\neq \\vec{0}$.'],
      ['Réciproquement, soit $a$, $b$, $c$ trois réels avec $(a\\,;b) \\neq (0\\,;0)$.',
        'Il existe un point $A(x_A\\,;y_A)$ tel que $ax_A + by_A + c = 0$ : $A\\left(0\\,;-\\dfrac{c}{b}\\right)$ si $b \\neq 0$, $A\\left(-\\dfrac{c}{a}\\,;0\\right)$ sinon.'],
      ['Alors $ax + by + c = 0 \\iff a(x - x_A) + b(y - y_A) = 0 \\iff \\det\\left(\\overrightarrow{AM}, \\vec{u}\\right) = 0$ avec $\\vec{u}\\begin{pmatrix}-b\\\\a\\end{pmatrix}$.'],
      ['Conclusion : toute droite a une équation de la forme $ax + by + c = 0$ avec $(a\\,;b) \\neq (0\\,;0)$,',
        'et une telle équation est celle de la droite de vecteur directeur $\\vec{u}\\begin{pmatrix}-b\\\\a\\end{pmatrix}$.'],
    ],
  },
  {
    nom: 'Variations des fonctions affines',
    niveau: '2nde',
    chapitre: 'Variations et extrémums',
    titre: '\\textbf{Démonstration : variations de la fonction affine } f : x \\mapsto mx + p\\textbf{.}',
    etapes: [
      ['Soit $a$ et $b$ deux réels tels que $a < b$.'],
      ['$f(b) - f(a) = (mb + p) - (ma + p) = m(b - a)$.'],
      ['Comme $a < b$, on a $b - a > 0$ : $f(b) - f(a)$ est du signe de $m$.'],
      ['Si $m > 0$ : $f(b) - f(a) > 0$, donc $f(a) < f(b)$. $f$ est strictement croissante sur $\\mathbb{R}$.'],
      ['Si $m < 0$ : $f(b) - f(a) < 0$, donc $f(a) > f(b)$. $f$ est strictement décroissante sur $\\mathbb{R}$.'],
      ['Si $m = 0$ : $f(a) = f(b) = p$. $f$ est constante sur $\\mathbb{R}$.'],
    ],
  },
  {
    nom: 'Position de y = x et y = x²',
    niveau: '2nde',
    chapitre: 'Variations et extrémums',
    titre: '\\textbf{Démonstration : position relative des courbes d\'équation } y = x \\textbf{ et } y = x^2 \\textbf{ pour } x \\geqslant 0\\textbf{.}',
    etapes: [
      ['On étudie le signe de la différence $x^2 - x = x(x - 1)$ pour $x \\geqslant 0$.'],
      ['Si $0 < x < 1$ : $x > 0$ et $x - 1 < 0$, donc $x^2 - x < 0$, soit $x^2 < x$.',
        'La courbe de $y = x^2$ est en dessous de la droite $y = x$.'],
      ['Si $x > 1$ : $x > 0$ et $x - 1 > 0$, donc $x^2 - x > 0$, soit $x^2 > x$.',
        'La courbe de $y = x^2$ est au-dessus de la droite $y = x$.'],
      ['Si $x = 0$ ou $x = 1$ : $x^2 = x$. Les deux courbes se coupent aux points $O(0\\,;0)$ et $(1\\,;1)$.'],
    ],
  },
  {
    nom: 'Variations de la fonction carré',
    niveau: '2nde',
    chapitre: 'Variations et extrémums',
    titre: '\\textbf{Démonstration : variations de la fonction carré } f : x \\mapsto x^2\\textbf{.}',
    etapes: [
      ['Soit $a$ et $b$ deux réels tels que $a < b$ : $f(b) - f(a) = b^2 - a^2 = (b - a)(b + a)$, avec $b - a > 0$.'],
      ['Sur $[0\\,;+\\infty[$ : si $0 \\leqslant a < b$, alors $b + a > 0$, donc $f(b) - f(a) > 0$ : $f(a) < f(b)$.',
        '$f$ est strictement croissante sur $[0\\,;+\\infty[$.'],
      ['Sur $\\mathopen{]}-\\infty\\,;0]$ : si $a < b \\leqslant 0$, alors $b + a < 0$, donc $f(b) - f(a) < 0$ : $f(a) > f(b)$.',
        '$f$ est strictement décroissante sur $\\mathopen{]}-\\infty\\,;0]$.'],
    ],
  },
  {
    nom: 'Variations de la fonction inverse',
    niveau: '2nde',
    chapitre: 'Variations et extrémums',
    titre: '\\textbf{Démonstration : variations de la fonction inverse } f : x \\mapsto \\dfrac{1}{x}\\textbf{.}',
    etapes: [
      ['Soit $a$ et $b$ deux réels non nuls tels que $a < b$ : $f(b) - f(a) = \\dfrac{1}{b} - \\dfrac{1}{a} = \\dfrac{a - b}{ab}$, avec $a - b < 0$.'],
      ['Sur $]0\\,;+\\infty[$ : si $0 < a < b$, alors $ab > 0$, donc $f(b) - f(a) < 0$ : $f(a) > f(b)$.',
        '$f$ est strictement décroissante sur $]0\\,;+\\infty[$.'],
      ['Sur $\\mathopen{]}-\\infty\\,;0[$ : si $a < b < 0$, alors $ab > 0$ (même signe), donc $f(b) - f(a) < 0$ : $f(a) > f(b)$.',
        '$f$ est strictement décroissante sur $\\mathopen{]}-\\infty\\,;0[$.'],
      ['Attention : $f$ n\'est pas décroissante sur $\\mathbb{R}^*$ tout entier : $-1 < 1$ et $f(-1) = -1 < f(1) = 1$.'],
    ],
  },
  {
    nom: 'Terme général d\'une suite arithmétique',
    niveau: '1re',
    chapitre: 'Suites',
    titre: '\\textbf{Démonstration : terme général d\'une suite arithmétique.}',
    etapes: [
      ['Soit $(u_n)$ une suite arithmétique de raison $r$ : pour tout $n \\in \\mathbb{N}$, $u_{n+1} = u_n + r$.'],
      ['Pour $n \\geqslant 1$, on écrit : $u_1 = u_0 + r$, $u_2 = u_1 + r$, …, $u_n = u_{n-1} + r$.'],
      ['On additionne ces $n$ égalités membre à membre.',
        'Les termes $u_1, u_2, \\ldots, u_{n-1}$ sont des deux côtés et s\'éliminent.'],
      ['Il reste $u_n = u_0 + nr$, ce qui est vrai aussi pour $n = 0$.'],
      ['Conclusion : pour tout $n \\in \\mathbb{N}$, $u_n = u_0 + nr$, et pour tous $n$ et $p$, $u_n = u_p + (n - p)r$.'],
    ],
  },
  {
    nom: 'Terme général d\'une suite géométrique',
    niveau: '1re',
    chapitre: 'Suites',
    titre: '\\textbf{Démonstration : terme général d\'une suite géométrique.}',
    etapes: [
      ['Soit $(u_n)$ une suite géométrique de raison $q$ : pour tout $n \\in \\mathbb{N}$, $u_{n+1} = q \\times u_n$.'],
      ['De proche en proche : $u_1 = q u_0$, $u_2 = q u_1 = q^2 u_0$, $u_3 = q u_2 = q^3 u_0$.'],
      ['À chaque rang, on multiplie encore par $q$ : après $n$ multiplications par $q$, on obtient $u_n = q^n u_0$.'],
      ['Conclusion : pour tout $n \\in \\mathbb{N}$, $u_n = u_0 \\times q^n$, et pour tous $n$ et $p$, $u_n = u_p \\times q^{n-p}$.'],
    ],
  },
  {
    nom: 'Somme 1 + 2 + … + n',
    niveau: '1re',
    chapitre: 'Suites',
    titre: '\\textbf{Démonstration : pour tout } n \\in \\mathbb{N}^*\\textbf{, } 1 + 2 + \\cdots + n = \\dfrac{n(n+1)}{2}\\textbf{.}',
    etapes: [
      ['On note $S = 1 + 2 + \\cdots + (n - 1) + n$.'],
      ['On l\'écrit aussi dans l\'autre sens : $S = n + (n - 1) + \\cdots + 2 + 1$.'],
      ['On additionne terme à terme : $1 + n = n + 1$, $2 + (n - 1) = n + 1$, …, $n + 1 = n + 1$.'],
      ['Donc $2S = (n + 1) + (n + 1) + \\cdots + (n + 1)$, avec $n$ termes : $2S = n(n + 1)$.'],
      ['Conclusion : $S = 1 + 2 + \\cdots + n = \\dfrac{n(n + 1)}{2}$.'],
    ],
  },
  {
    nom: 'Somme 1 + q + … + qⁿ',
    niveau: '1re',
    chapitre: 'Suites',
    titre: '\\textbf{Démonstration : pour } q \\neq 1\\textbf{, } 1 + q + q^2 + \\cdots + q^n = \\dfrac{1 - q^{n+1}}{1 - q}\\textbf{.}',
    etapes: [
      ['Soit $q$ un réel différent de $1$ et $n \\in \\mathbb{N}$. On note $S = 1 + q + q^2 + \\cdots + q^n$.'],
      ['En multipliant par $q$ : $qS = q + q^2 + q^3 + \\cdots + q^{n+1}$.'],
      ['On soustrait : dans $S - qS$, les termes $q, q^2, \\ldots, q^n$ s\'éliminent, donc $S - qS = 1 - q^{n+1}$.'],
      ['Soit $(1 - q)S = 1 - q^{n+1}$. Comme $q \\neq 1$, on peut diviser par $1 - q \\neq 0$.'],
      ['Conclusion : $1 + q + \\cdots + q^n = \\dfrac{1 - q^{n+1}}{1 - q}$. (Si $q = 1$, la somme vaut $n + 1$.)'],
    ],
  },
  {
    nom: 'Équation du second degré',
    niveau: '1re',
    chapitre: 'Second degré',
    titre: '\\textbf{Démonstration : résolution de l\'équation } ax^2 + bx + c = 0 \\textbf{ avec } a \\neq 0\\textbf{.}',
    etapes: [
      ['On factorise par $a$ : $ax^2 + bx + c = a\\left(x^2 + \\dfrac{b}{a}x + \\dfrac{c}{a}\\right)$.'],
      ['Or $x^2 + \\dfrac{b}{a}x = \\left(x + \\dfrac{b}{2a}\\right)^2 - \\dfrac{b^2}{4a^2}$, donc $ax^2 + bx + c = a\\left[\\left(x + \\dfrac{b}{2a}\\right)^2 - \\dfrac{b^2 - 4ac}{4a^2}\\right]$.'],
      ['On pose $\\Delta = b^2 - 4ac$. Comme $a \\neq 0$, l\'équation équivaut à $\\left(x + \\dfrac{b}{2a}\\right)^2 = \\dfrac{\\Delta}{4a^2}$.'],
      ['Si $\\Delta < 0$ : $\\dfrac{\\Delta}{4a^2} < 0$ alors qu\'un carré est positif. L\'équation n\'a pas de solution.'],
      ['Si $\\Delta = 0$ : $\\left(x + \\dfrac{b}{2a}\\right)^2 = 0$, donc une seule solution : $x_0 = -\\dfrac{b}{2a}$.'],
      ['Si $\\Delta > 0$ : $\\dfrac{\\Delta}{4a^2} = \\left(\\dfrac{\\sqrt{\\Delta}}{2a}\\right)^2$, donc $x + \\dfrac{b}{2a} = \\dfrac{\\sqrt{\\Delta}}{2a}$ ou $x + \\dfrac{b}{2a} = -\\dfrac{\\sqrt{\\Delta}}{2a}$.'],
      ['Deux solutions : $x_1 = \\dfrac{-b - \\sqrt{\\Delta}}{2a}$ et $x_2 = \\dfrac{-b + \\sqrt{\\Delta}}{2a}$.'],
    ],
  },
  {
    nom: 'Équation de la tangente',
    niveau: '1re',
    chapitre: 'Dérivation',
    titre: '\\textbf{Démonstration : équation de la tangente à la courbe de } f \\textbf{ au point d\'abscisse } a\\textbf{.}',
    etapes: [
      ['Soit $f$ dérivable en $a$ et $A(a\\,;f(a))$.',
        'La tangente en $A$ est la droite passant par $A$ de coefficient directeur $f\'(a)$.'],
      ['Elle n\'est pas parallèle à l\'axe des ordonnées : elle a une équation de la forme $y = f\'(a)\\,x + p$.'],
      ['$A$ est sur la tangente : $f(a) = f\'(a) \\times a + p$, donc $p = f(a) - a\\,f\'(a)$.'],
      ['Donc $y = f\'(a)\\,x + f(a) - a\\,f\'(a)$.'],
      ['Conclusion : la tangente a pour équation $y = f(a) + f\'(a)(x - a)$.'],
    ],
  },
  {
    nom: '√ n\'est pas dérivable en 0',
    niveau: '1re',
    chapitre: 'Dérivation',
    titre: '\\textbf{Démonstration : la fonction racine carrée n\'est pas dérivable en } 0\\textbf{.}',
    etapes: [
      ['Pour $h > 0$, le taux de variation de $x \\mapsto \\sqrt{x}$ entre $0$ et $h$ vaut $\\dfrac{\\sqrt{h} - \\sqrt{0}}{h} = \\dfrac{\\sqrt{h}}{h} = \\dfrac{1}{\\sqrt{h}}$.'],
      ['Quand $h$ se rapproche de $0$, $\\sqrt{h}$ se rapproche de $0$, donc $\\dfrac{1}{\\sqrt{h}}$ devient aussi grand qu\'on veut.',
        'Par exemple, pour $h = 10^{-2n}$, le taux vaut $10^n$.'],
      ['Le taux de variation n\'a donc pas de limite finie quand $h$ tend vers $0$.'],
      ['Conclusion : la fonction racine carrée n\'est pas dérivable en $0$.',
        'Sa courbe a une tangente verticale à l\'origine.'],
    ],
  },
  {
    nom: 'Dérivée de la fonction carré',
    niveau: '1re',
    chapitre: 'Dérivation',
    titre: '\\textbf{Démonstration : la fonction } f : x \\mapsto x^2 \\textbf{ a pour dérivée } f\'(x) = 2x\\textbf{.}',
    etapes: [
      ['Soit $a$ un réel et $h \\neq 0$. Le taux de variation de $f$ entre $a$ et $a + h$ vaut $\\dfrac{(a + h)^2 - a^2}{h}$.'],
      ['$\\dfrac{(a + h)^2 - a^2}{h} = \\dfrac{a^2 + 2ah + h^2 - a^2}{h} = \\dfrac{h(2a + h)}{h} = 2a + h$.'],
      ['Quand $h$ tend vers $0$, $2a + h$ tend vers $2a$ : $f$ est dérivable en $a$ et $f\'(a) = 2a$.'],
      ['Conclusion : $f$ est dérivable sur $\\mathbb{R}$ et, pour tout réel $x$, $f\'(x) = 2x$.'],
    ],
  },
  {
    nom: 'Dérivée de la fonction inverse',
    niveau: '1re',
    chapitre: 'Dérivation',
    titre: '\\textbf{Démonstration : la fonction } f : x \\mapsto \\dfrac{1}{x} \\textbf{ a pour dérivée } f\'(x) = -\\dfrac{1}{x^2}\\textbf{.}',
    etapes: [
      ['Soit $a \\neq 0$ et $h \\neq 0$ tel que $a + h \\neq 0$. Le taux de variation vaut $\\dfrac{1}{h}\\left(\\dfrac{1}{a + h} - \\dfrac{1}{a}\\right)$.'],
      ['$\\dfrac{1}{a + h} - \\dfrac{1}{a} = \\dfrac{a - (a + h)}{a(a + h)} = \\dfrac{-h}{a(a + h)}$, donc le taux vaut $\\dfrac{-1}{a(a + h)}$.'],
      ['Quand $h$ tend vers $0$, $a(a + h)$ tend vers $a^2$ : le taux tend vers $-\\dfrac{1}{a^2}$.'],
      ['Conclusion : $f$ est dérivable sur $\\mathopen{]}-\\infty\\,;0[$ et sur $]0\\,;+\\infty[$, et $f\'(x) = -\\dfrac{1}{x^2}$.'],
    ],
  },
  {
    nom: 'Dérivée d\'un produit',
    niveau: '1re',
    chapitre: 'Dérivation',
    titre: '\\textbf{Démonstration : } (uv)\' = u\'v + uv\'\\textbf{.}',
    etapes: [
      ['Soit $u$ et $v$ dérivables en $a$, et $h \\neq 0$. Le taux de variation de $uv$ vaut $\\dfrac{u(a + h)v(a + h) - u(a)v(a)}{h}$.'],
      ['On ajoute et on retranche $u(a)v(a + h)$ au numérateur :',
        '$u(a + h)v(a + h) - u(a)v(a + h) + u(a)v(a + h) - u(a)v(a)$.'],
      ['Le taux s\'écrit donc $\\dfrac{u(a + h) - u(a)}{h} \\times v(a + h) + u(a) \\times \\dfrac{v(a + h) - v(a)}{h}$.'],
      ['Quand $h$ tend vers $0$ : $\\dfrac{u(a + h) - u(a)}{h}$ tend vers $u\'(a)$, $\\dfrac{v(a + h) - v(a)}{h}$ tend vers $v\'(a)$,',
        'et $v(a + h)$ tend vers $v(a)$ (admis : une fonction dérivable en $a$ y est continue).'],
      ['Conclusion : $uv$ est dérivable en $a$ et $(uv)\'(a) = u\'(a)v(a) + u(a)v\'(a)$.'],
    ],
  },
  {
    nom: 'cos et sin de π/4 et de π/3',
    niveau: '1re',
    chapitre: 'Trigonométrie',
    titre: '\\textbf{Démonstration : valeurs de } \\cos \\textbf{ et } \\sin \\textbf{ en } \\dfrac{\\pi}{4} \\textbf{ et } \\dfrac{\\pi}{3}\\textbf{.}',
    etapes: [
      ['Sur le cercle trigonométrique de centre $O$, on note $I(1\\,;0)$ et $M$ le point associé au réel $x$.',
        '$M$ a pour coordonnées $(\\cos x\\,;\\sin x)$, et $\\cos^2 x + \\sin^2 x = 1$.'],
      ['Pour $x = \\dfrac{\\pi}{4}$ : $M$ est sur la bissectrice du premier quadrant, donc $\\cos\\dfrac{\\pi}{4} = \\sin\\dfrac{\\pi}{4} = c$ avec $c > 0$.'],
      ['Alors $c^2 + c^2 = 1$, soit $c^2 = \\dfrac{1}{2}$ et $c = \\dfrac{1}{\\sqrt{2}} = \\dfrac{\\sqrt{2}}{2}$ : $\\cos\\dfrac{\\pi}{4} = \\sin\\dfrac{\\pi}{4} = \\dfrac{\\sqrt{2}}{2}$.'],
      ['Pour $x = \\dfrac{\\pi}{3}$ : $OI = OM = 1$ et $\\widehat{IOM} = 60°$, donc le triangle $OIM$ est équilatéral.'],
      ['Le projeté $H$ de $M$ sur $(OI)$ est le pied d\'une hauteur, qui est aussi une médiane.',
        '$H$ est donc le milieu de $[OI]$ : $\\cos\\dfrac{\\pi}{3} = OH = \\dfrac{1}{2}$.'],
      ['Puis $\\sin^2\\dfrac{\\pi}{3} = 1 - \\dfrac{1}{4} = \\dfrac{3}{4}$, avec $\\sin\\dfrac{\\pi}{3} > 0$ : $\\sin\\dfrac{\\pi}{3} = \\dfrac{\\sqrt{3}}{2}$.'],
    ],
  },
  {
    nom: 'Formule d\'Al-Kashi',
    niveau: '1re',
    chapitre: 'Produit scalaire',
    titre: '\\textbf{Démonstration : formule d\'Al-Kashi } BC^2 = AB^2 + AC^2 - 2\\,AB \\times AC \\times \\cos\\widehat{A}\\textbf{.}',
    etapes: [
      ['Soit $ABC$ un triangle. D\'après la relation de Chasles, $\\overrightarrow{BC} = \\overrightarrow{BA} + \\overrightarrow{AC} = \\overrightarrow{AC} - \\overrightarrow{AB}$.'],
      ['Donc $BC^2 = \\left\\|\\overrightarrow{AC} - \\overrightarrow{AB}\\right\\|^2 = AC^2 - 2\\,\\overrightarrow{AB} \\cdot \\overrightarrow{AC} + AB^2$.'],
      ['Or $\\overrightarrow{AB} \\cdot \\overrightarrow{AC} = AB \\times AC \\times \\cos\\widehat{BAC}$.'],
      ['Conclusion : $BC^2 = AB^2 + AC^2 - 2\\,AB \\times AC \\times \\cos\\widehat{BAC}$.',
        'Avec $a = BC$, $b = AC$, $c = AB$ : $a^2 = b^2 + c^2 - 2bc\\cos\\widehat{A}$.'],
    ],
  },
  {
    nom: 'Points M tels que MA · MB = 0',
    niveau: '1re',
    chapitre: 'Produit scalaire',
    titre: '\\textbf{Démonstration : ensemble des points } M \\textbf{ tels que } \\overrightarrow{MA} \\cdot \\overrightarrow{MB} = 0\\textbf{.}',
    etapes: [
      ['Soit $A$ et $B$ deux points distincts et $I$ le milieu de $[AB]$ : $\\overrightarrow{IB} = -\\overrightarrow{IA}$.'],
      ['$\\overrightarrow{MA} \\cdot \\overrightarrow{MB} = \\left(\\overrightarrow{MI} + \\overrightarrow{IA}\\right) \\cdot \\left(\\overrightarrow{MI} + \\overrightarrow{IB}\\right) = \\left(\\overrightarrow{MI} + \\overrightarrow{IA}\\right) \\cdot \\left(\\overrightarrow{MI} - \\overrightarrow{IA}\\right)$.'],
      ['Donc $\\overrightarrow{MA} \\cdot \\overrightarrow{MB} = MI^2 - IA^2 = MI^2 - \\dfrac{AB^2}{4}$.'],
      ['Ainsi $\\overrightarrow{MA} \\cdot \\overrightarrow{MB} = 0 \\iff MI^2 = \\dfrac{AB^2}{4} \\iff MI = \\dfrac{AB}{2}$.'],
      ['Conclusion : l\'ensemble cherché est le cercle de centre $I$ et de rayon $\\dfrac{AB}{2}$,',
        'c\'est-à-dire le cercle de diamètre $[AB]$.'],
    ],
  },
]
