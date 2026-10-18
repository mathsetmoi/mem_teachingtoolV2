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

export interface Demonstration {
  nom: string
  /** Le titre, posé d'emblée */
  titre: string
  /** Les étapes, montrées une à une ; chacune a une ou deux lignes */
  etapes: string[][]
}

export const DEMONSTRATIONS: readonly Demonstration[] = [
  {
    nom: '1/3 n\'est pas décimal',
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
]
