// =============================================================
// TRACER UNE FONCTION : LE CALCUL (lot 27)
// Ce qui se calcule, sans rien toucher au tableau :
//  - lire une écriture tapée au clavier (« 2x+1 », « a(x-α)^2+β »,
//    « racine(x) », « |x| », « 1/x »…) : sa valeur pour chaque x, les
//    lettres qui deviennent des curseurs, et sa formule bien écrite ;
//  - le dessin du repère et de ses courbes, en unités du tableau
//    (y vers le bas), au même format que les dessins de la trigonométrie
//    (des lignes, des points, des étiquettes) : panneau.ts en fait des
//    objets ordinaires du tableau, ou le peint à l'écran pendant qu'on
//    bouge un curseur ;
//  - « la recette » (les fonctions, les curseurs, la fenêtre), rangée dans
//    un champ facultatif de l'axe des abscisses posé : c'est ce qui permet
//    de rouvrir le repère et de le modifier. Le lecteur d'avant ne la lit
//    pas et montre le dessin tel quel.
// Tout est calculé ici, sans bibliothèque : la version hors ligne trace
// aussi bien que la version en ligne.
// =============================================================
import type { P } from '../construction'
import type { Dessin, Ligne } from '../trigonometrie'

/** Une ligne du dessin ; axe : l'axe des abscisses, qui porte la recette */
export type LigneAxe = Ligne & { axe?: true }

// ---------- Lire une écriture ----------
/** Un nœud de l'écriture lue */
type Noeud =
  | { k: 'nombre'; v: number }
  | { k: 'lettre'; v: string }
  | { k: 'op'; o: '+' | '-' | '*' | '/' | '^'; a: Noeud; b: Noeud; implicite?: boolean }
  | { k: 'moins'; a: Noeud }
  | { k: 'fonction'; f: NomFonction; a: Noeud }

type NomFonction = 'racine' | 'abs' | 'exp' | 'ln' | 'cos' | 'sin' | 'tan'
const FONCTIONS: Record<string, NomFonction> = {
  racine: 'racine', sqrt: 'racine', abs: 'abs', exp: 'exp', ln: 'ln', cos: 'cos', sin: 'sin', tan: 'tan',
}
const CALCULS: Record<NomFonction, (x: number) => number> = {
  racine: Math.sqrt, abs: Math.abs, exp: Math.exp, ln: Math.log, cos: Math.cos, sin: Math.sin, tan: Math.tan,
}
/** Les lettres grecques qu'on peut taper pour un curseur (α, β : la forme
 *  canonique ; λ, μ…), et leur écriture en formule */
const GRECQUES: Record<string, string> = {
  'α': '\\alpha', 'β': '\\beta', 'γ': '\\gamma', 'δ': '\\delta', 'λ': '\\lambda', 'μ': '\\mu', 'θ': '\\theta',
}
/** Au plus, des curseurs par repère */
export const MAX_CURSEURS = 6

type Jeton = { k: 'n'; v: number } | { k: 'l'; v: string } | { k: 'f'; v: NomFonction } | { k: '+' | '-' | '*' | '/' | '^' | '(' | ')' | '|'; ferme?: boolean }

/** Les jetons d'une écriture, la multiplication sous-entendue écrite :
 *  2x, 3(x+1), ax, (x+1)(x-2), 2√x, 2|x|… Un « | » ferme la valeur absolue
 *  ouverte quand une valeur vient de finir. */
function jetons(texte: string): Jeton[] {
  const s = texte.replace(/\s+/g, '').replace(/²/g, '^2').replace(/³/g, '^3').replace(/[−–]/g, '-')
    .replace(/[×·]/g, '*').replace(/÷/g, '/').replace(/,/g, '.')
  const t: Jeton[] = []
  let i = 0
  while (i < s.length) {
    const c = s[i]
    if (/[0-9.]/.test(c)) {
      let j = i
      while (j < s.length && /[0-9.]/.test(s[j])) j++
      const v = Number(s.slice(i, j))
      if (!Number.isFinite(v)) throw new Error(`Je ne sais pas lire le nombre « ${s.slice(i, j)} ».`)
      t.push({ k: 'n', v }); i = j; continue
    }
    if (/[a-zA-Z]/.test(c)) {
      const mot = Object.keys(FONCTIONS).find(f => s.startsWith(f, i))
      if (mot) { t.push({ k: 'f', v: FONCTIONS[mot] }); i += mot.length; continue }
      if (s.startsWith('pi', i)) { t.push({ k: 'n', v: Math.PI }); i += 2; continue }
      t.push({ k: 'l', v: c }); i++; continue
    }
    if (GRECQUES[c]) { t.push({ k: 'l', v: c }); i++; continue }
    if (c === 'π') { t.push({ k: 'n', v: Math.PI }); i++; continue }
    if (c === '√') { t.push({ k: 'f', v: 'racine' }); i++; continue }
    if ('+-*/^()|'.includes(c)) { t.push({ k: c as '+' }); i++; continue }
    throw new Error(`Je ne connais pas « ${c} ».`)
  }
  const r: Jeton[] = []
  let ouvertes = 0
  for (const b of t) {
    const a = r[r.length - 1]
    const finit = !!a && (a.k === 'n' || a.k === 'l' || a.k === ')' || (a.k === '|' && !!a.ferme))
    if (b.k === '|') { b.ferme = ouvertes > 0 && finit; ouvertes += b.ferme ? -1 : 1 }
    const ouvre = b.k === 'n' || b.k === 'l' || b.k === 'f' || b.k === '(' || (b.k === '|' && !b.ferme)
    if (finit && ouvre) r.push({ k: '*', ferme: true })
    r.push(b)
  }
  return r
}

/** L'arbre d'une écriture ; une erreur dit ce qui ne va pas */
function arbre(texte: string): Noeud {
  const t = jetons(texte)
  if (!t.length) throw new Error('Tapez une expression en x, par exemple 2x + 1.')
  let p = 0
  const voir = () => t[p]
  const attendre = (k: string) => {
    if (!t[p] || t[p].k !== k) throw new Error(k === ')' ? 'Il manque une parenthèse fermante.' : 'Il manque une barre | pour fermer la valeur absolue.')
    p++
  }
  const somme = (): Noeud => {
    let g = produit()
    while (voir() && (voir().k === '+' || voir().k === '-')) { const o = t[p++].k as '+' | '-'; g = { k: 'op', o, a: g, b: produit() } }
    return g
  }
  const produit = (): Noeud => {
    let g = signe()
    while (voir() && (voir().k === '*' || voir().k === '/')) {
      const j = t[p++]
      g = { k: 'op', o: j.k as '*' | '/', a: g, b: signe(), implicite: j.k === '*' && !!j.ferme }
    }
    return g
  }
  const signe = (): Noeud => {
    if (voir()?.k === '-') { p++; return { k: 'moins', a: signe() } }
    if (voir()?.k === '+') { p++; return signe() }
    return puissance()
  }
  const puissance = (): Noeud => {
    const b = atome()
    if (voir()?.k === '^') { p++; return { k: 'op', o: '^', a: b, b: signe() } }
    return b
  }
  const atome = (): Noeud => {
    const j = voir()
    if (!j) throw new Error('L\'écriture s\'arrête trop tôt.')
    if (j.k === 'n') { p++; return { k: 'nombre', v: j.v } }
    if (j.k === 'l') { p++; return { k: 'lettre', v: j.v } }
    if (j.k === 'f') {
      p++
      if (voir()?.k === '(') { p++; const a = somme(); attendre(')'); return { k: 'fonction', f: j.v, a } }
      return { k: 'fonction', f: j.v, a: puissance() }
    }
    if (j.k === '(') { p++; const a = somme(); attendre(')'); return a }
    if (j.k === '|') { p++; const a = somme(); attendre('|'); return { k: 'fonction', f: 'abs', a } }
    throw new Error(j.k === ')' ? 'Une parenthèse fermante est en trop.' : `Il manque quelque chose avant « ${j.k} ».`)
  }
  const g = somme()
  if (p < t.length) throw new Error(t[p].k === ')' ? 'Une parenthèse fermante est en trop.' : 'Je ne comprends pas la fin de l\'écriture.')
  return g
}

/** Les valeurs des curseurs, par lettre */
export type Valeurs = Record<string, number>

function valeur(n: Noeud, x: number, v: Valeurs): number {
  switch (n.k) {
    case 'nombre': return n.v
    case 'lettre': return n.v === 'x' ? x : n.v === 'e' ? Math.E : (v[n.v] ?? NaN)
    case 'moins': return -valeur(n.a, x, v)
    case 'fonction': return CALCULS[n.f](valeur(n.a, x, v))
    case 'op': {
      const a = valeur(n.a, x, v), b = valeur(n.b, x, v)
      switch (n.o) {
        case '+': return a + b
        case '-': return a - b
        case '*': return a * b
        case '/': return a / b
        case '^': return puissanceReelle(a, b)
      }
    }
  }
}

/** a^b, et aussi la racine cubique d'un négatif : (−8)^(1/3) = −2 */
function puissanceReelle(a: number, b: number): number {
  const r = Math.pow(a, b)
  if (!Number.isNaN(r) || a >= 0) return r
  // b = p/q avec q impair : le signe se garde
  for (const q of [3, 5, 7]) {
    const pq = b * q
    if (Math.abs(pq - Math.round(pq)) < 1e-9) return (Math.round(pq) % 2 ? -1 : 1) * Math.pow(-a, b)
  }
  return NaN
}

function lettres(n: Noeud, l: Set<string>) {
  if (n.k === 'lettre' && n.v !== 'x' && n.v !== 'e') l.add(n.v)
  if (n.k === 'moins' || n.k === 'fonction') lettres(n.a, l)
  if (n.k === 'op') { lettres(n.a, l); lettres(n.b, l) }
}

/** Un nombre écrit à la française : 2,5 ; −0,75 ; au plus deux décimales */
export function nombreFr(v: number, decimales = 2): string {
  const k = Math.pow(10, decimales)
  let r = Math.round(v * k) / k
  if (Object.is(r, -0) || Math.abs(r) < 1e-12) r = 0
  return String(r).replace('.', ',').replace('-', '−')
}
/** Le même, en formule (la virgule sans espace après) */
export function nombreLatex(v: number, decimales = 2): string {
  return nombreFr(v, decimales).replace(',', '{,}').replace('−', '-')
}

/** La formule d'un nœud ; prio : la priorité de ce qui l'entoure (pour les
 *  parenthèses) */
function latex(n: Noeud, prio = 0): string {
  const par = (s: string, p: number) => p < prio ? parentheses(s) : s
  switch (n.k) {
    case 'nombre': return Math.abs(n.v - Math.PI) < 1e-12 ? '\\pi' : nombreLatex(n.v, 6)
    case 'lettre': return GRECQUES[n.v] ?? n.v
    case 'moins': return par('-' + latex(n.a, 2), 1)
    case 'fonction': {
      const a = latex(n.a)
      switch (n.f) {
        case 'racine': return `\\sqrt{${a}}`
        case 'abs': return `\\left|${a}\\right|`
        case 'exp': return `\\mathrm{e}^{${a}}`
        default: return par(`\\${n.f}${estSimple(n.a) ? ' ' + latex(n.a, 4) : parentheses(a)}`, 3)
      }
    }
    case 'op':
      switch (n.o) {
        case '+': return par(`${latex(n.a, 1)} + ${latex(n.b, 1)}`, 1)
        case '-': return par(`${latex(n.a, 1)} - ${latex(n.b, 2)}`, 1)
        case '/': return par(`\\dfrac{${latex(n.a)}}{${latex(n.b)}}`, 3)
        case '*': {
          const a = latex(n.a, 2), b = latex(n.b, 2)
          // 2x, ax, 3(x+1), (x+1)(x−2) : sans signe ; 2 × 3, x × 2 : avec
          const sans = n.implicite || (n.b.k !== 'nombre' && !commenceParNombre(n.b))
          return par(sans ? `${a}${/^[a-zA-Z\\(]/.test(b) ? '' : ' '}${b}` : `${a} \\times ${b}`, 2)
        }
        case '^': {
          const base = n.a.k === 'nombre' || n.a.k === 'lettre' ? latex(n.a) : parentheses(latex(n.a))
          return par(`${base}^{${latex(n.b)}}`, 4)
        }
      }
  }
}
/** Des parenthèses : à leur taille ordinaire, sauf autour d'une fraction */
function parentheses(s: string) { return s.includes('\\dfrac') ? `\\left(${s}\\right)` : `(${s})` }
function estSimple(n: Noeud) { return n.k === 'lettre' || n.k === 'nombre' }
function commenceParNombre(n: Noeud): boolean {
  if (n.k === 'nombre' || n.k === 'moins') return true
  if (n.k === 'op' && n.o !== '+' && n.o !== '-') return commenceParNombre(n.a)
  return false
}

/** Une écriture lue */
export type Lecture =
  | { ok: true; calcul: (x: number, v: Valeurs) => number; lettres: string[]; latex: string }
  | { ok: false; erreur: string }

/** Lit une écriture tapée au clavier. Les lettres autres que x (et e, le
 *  nombre d'Euler) sont des curseurs, dans l'ordre où elles paraissent. */
export function lire(texte: string): Lecture {
  try {
    if (texte.length > 200) return { ok: false, erreur: 'L\'écriture est trop longue.' }
    const n = arbre(texte)
    const l = new Set<string>()
    lettres(n, l)
    if (l.size > MAX_CURSEURS) return { ok: false, erreur: `Au plus ${MAX_CURSEURS} lettres en plus de x.` }
    return { ok: true, calcul: (x, v) => valeur(n, x, v), lettres: [...l], latex: latex(n) }
  } catch (e) {
    return { ok: false, erreur: e instanceof Error ? e.message : 'Écriture à vérifier.' }
  }
}

// ---------- La recette d'un repère ----------
/** Ce qui fait un repère : de quoi le refaire, ou le modifier plus tard.
 *  Rangée dans le champ facultatif `courbes` de l'axe des abscisses posé. */
export interface RecetteCourbes {
  v: 1
  /** Les écritures tapées, une par courbe (1 à 4) ; une écriture fausse
   *  est gardée telle quelle, sans courbe */
  fonctions: string[]
  /** La valeur de chaque curseur */
  curseurs: Valeurs
  /** La fenêtre : x de… à…, y de… à… */
  fenetre: [number, number, number, number]
  /** Le point M sur la première courbe, ses pointillés vers les axes */
  point: boolean
  /** L'abscisse du point M */
  x0: number
  /** La tangente en M, avec son équation */
  tangente: boolean
  /** Les noms des courbes (C_f, C_g…) */
  noms: boolean
  /** Le quadrillage */
  grille: boolean
}

export const MAX_COURBES = 4
export const NOMS_FONCTIONS = ['f', 'g', 'h', 'k'] as const
/** Les couleurs des courbes : celles des dessins du catalogue */
export const COULEURS_COURBES = ['#2f6fd6', '#d64545', '#1e8a4c', '#7b4fb3'] as const
const COULEUR_TANGENTE = '#d9822b', COULEUR_GRILLE = '#d4dce8', GRIS = '#5a6577'

export function recetteParDefaut(): RecetteCourbes {
  return { v: 1, fonctions: ['x^2'], curseurs: {}, fenetre: [-5, 5, -2, 8], point: false, x0: 1, tangente: false, noms: true, grille: true }
}

/** Une recette relue (un fichier, une copie) : null si elle est abîmée.
 *  Les champs inconnus sont laissés de côté. */
export function lireRecette(v: unknown): RecetteCourbes | null {
  if (!v || typeof v !== 'object') return null
  const o = v as Record<string, unknown>
  const fini = (x: unknown): x is number => typeof x === 'number' && Number.isFinite(x) && Math.abs(x) <= 1e6
  if (o.v !== 1 || !Array.isArray(o.fonctions) || !o.fonctions.length || o.fonctions.length > MAX_COURBES) return null
  if (!o.fonctions.every(f => typeof f === 'string' && f.length <= 200)) return null
  const w = o.fenetre
  if (!Array.isArray(w) || w.length !== 4 || !w.every(fini) || w[0] >= w[1] || w[2] >= w[3]) return null
  if (!o.curseurs || typeof o.curseurs !== 'object') return null
  const curseurs: Valeurs = {}
  for (const [k, x] of Object.entries(o.curseurs as Record<string, unknown>)) {
    if (k.length !== 1 || !fini(x)) return null
    curseurs[k] = x
  }
  if (Object.keys(curseurs).length > MAX_CURSEURS * MAX_COURBES) return null
  const oui = (x: unknown, d: boolean) => typeof x === 'boolean' ? x : d
  return {
    v: 1, fonctions: (o.fonctions as string[]).slice(), curseurs, fenetre: [w[0], w[1], w[2], w[3]],
    point: oui(o.point, false), x0: fini(o.x0) ? o.x0 : 0, tangente: oui(o.tangente, false), noms: oui(o.noms, true), grille: oui(o.grille, true),
  }
}

/** Les lettres de toutes les courbes (les curseurs), dans l'ordre */
export function lettresDe(r: RecetteCourbes): string[] {
  const l: string[] = []
  for (const f of r.fonctions) { const x = lire(f); if (x.ok) for (const c of x.lettres) if (!l.includes(c)) l.push(c) }
  return l
}

// ---------- Les modèles du panneau ----------
export interface Modele { nom: string; fonctions: string[]; fenetre: [number, number, number, number]; curseurs?: Valeurs }
export const MODELES: { lycee: Modele[]; college: Modele[] } = {
  lycee: [
    { nom: 'x²', fonctions: ['x^2'], fenetre: [-4, 4, -1, 9] },
    { nom: '1/x', fonctions: ['1/x'], fenetre: [-5, 5, -5, 5] },
    { nom: '√x', fonctions: ['racine(x)'], fenetre: [-1, 9, -1, 4] },
    { nom: 'x³', fonctions: ['x^3'], fenetre: [-3, 3, -8, 8] },
    { nom: '|x|', fonctions: ['|x|'], fenetre: [-5, 5, -1, 5] },
    { nom: 'Comparer x, x², x³', fonctions: ['x', 'x^2', 'x^3'], fenetre: [-2, 2, -2, 2] },
    { nom: 'a(x − α)² + β', fonctions: ['a(x-α)^2+β'], fenetre: [-6, 6, -6, 8], curseurs: { a: 1, 'α': 1, 'β': -2 } },
    { nom: 'ax² + bx + c', fonctions: ['ax^2+bx+c'], fenetre: [-6, 6, -6, 8], curseurs: { a: 1, b: -2, c: -3 } },
    { nom: 'a(x − p)(x − q)', fonctions: ['a(x-p)(x-q)'], fenetre: [-6, 6, -6, 8], curseurs: { a: -1, p: -1, q: 3 } },
  ],
  college: [
    { nom: 'ax + b', fonctions: ['ax+b'], fenetre: [-6, 6, -6, 6], curseurs: { a: 2, b: -1 } },
    { nom: 'Fonction linéaire ax', fonctions: ['ax'], fenetre: [-6, 6, -6, 6], curseurs: { a: 0.5 } },
    { nom: 'Deux droites', fonctions: ['2x-1', '-x+5'], fenetre: [-2, 6, -3, 8] },
    { nom: 'Affine ou pas ?', fonctions: ['3x+2', 'x^2'], fenetre: [-4, 4, -4, 10] },
  ],
}

// ---------- Le dessin ----------
/** La taille du repère posé, à 100 % : 15 cm sur 11,25 cm */
export const LARGEUR_REPERE = 600, HAUTEUR_REPERE = 450
/** L'axe des abscisses dépasse à gauche et (avec sa flèche) à droite */
const AVANT_AXE = 8, APRES_AXE = 18

/** Le pas des graduations : 1, 2 ou 5 fois une puissance de 10, pour une
 *  dizaine de graduations */
export function pasDe(etendue: number): number {
  const brut = etendue / 10, p = Math.pow(10, Math.floor(Math.log10(brut))), n = brut / p
  return (n < 1.5 ? 1 : n < 3.5 ? 2 : n < 7.5 ? 5 : 10) * p
}

/** Où est l'axe des abscisses dans le repère (en y du repère), et l'axe des
 *  ordonnées (en x) : à 0, ou sur le bord le plus proche si 0 n'y est pas */
function placeAxes(r: RecetteCourbes) {
  const [x0, x1, y0, y1] = r.fenetre
  return { ax: Math.min(Math.max(0, y0), y1), ay: Math.min(Math.max(0, x0), x1) }
}

/** Le coin haut gauche et l'échelle d'un repère posé, retrouvés d'après son
 *  axe des abscisses (deux points, de gauche à droite) et sa recette : le
 *  repère a pu être déplacé ou agrandi. */
export function coinDepuisAxe(a: P, b: P, r: RecetteCourbes): { o: P; k: number } {
  const k = Math.max(0.05, Math.hypot(b.x - a.x, b.y - a.y) / (LARGEUR_REPERE + AVANT_AXE + APRES_AXE))
  const [, , y0, y1] = r.fenetre, { ax } = placeAxes(r)
  return { o: { x: a.x + AVANT_AXE * k, y: a.y - (y1 - ax) / (y1 - y0) * HAUTEUR_REPERE * k }, k }
}

/** Le dessin d'un repère et de ses courbes, son coin haut gauche en o, à
 *  l'échelle k. L'axe des abscisses est marqué (axe) : la recette se pose
 *  sur lui. */
export function dessinCourbes(o: P, r: RecetteCourbes, k = 1): Dessin {
  const d: Dessin = { lignes: [], ronds: [], points: [], etiquettes: [] }
  const [x0, x1, y0, y1] = r.fenetre, L = LARGEUR_REPERE * k, H = HAUTEUR_REPERE * k
  const X = (x: number) => o.x + (x - x0) / (x1 - x0) * L
  const Y = (y: number) => o.y + (y1 - y) / (y1 - y0) * H
  const arrondi = (p: P): P => ({ x: Math.round(p.x * 10) / 10, y: Math.round(p.y * 10) / 10 })
  const { ax, ay } = placeAxes(r)
  const ep = Math.max(1, 2 * k), taille = Math.max(10, Math.round(16 * k))
  // Le quadrillage et les graduations
  const px = pasDe(x1 - x0), py = pasDe(y1 - y0)
  const graduations = (a: number, b: number, p: number) => {
    const l: number[] = []
    for (let i = Math.ceil(a / p - 1e-9); i * p <= b + 1e-9; i++) l.push(Math.round(i * p * 1e9) / 1e9)
    return l
  }
  const gx = graduations(x0, x1, px), gy = graduations(y0, y1, py)
  if (r.grille) {
    // Un seul trait en zigzag par sens (moins d'objets sur la page) : les
    // allers-retours courent sur le bord du repère, qui sert de cadre
    const fin = Math.max(0.5, k)
    const verticales: P[] = [{ x: o.x, y: o.y + H }, { x: o.x, y: o.y }]
    gx.forEach((x, i) => { const [a, b] = i % 2 ? [o.y + H, o.y] : [o.y, o.y + H]; verticales.push({ x: X(x), y: a }, { x: X(x), y: b }) })
    const bas = verticales[verticales.length - 1].y
    verticales.push({ x: o.x + L, y: bas }, { x: o.x + L, y: bas === o.y ? o.y + H : o.y })
    const horizontales: P[] = [{ x: o.x, y: o.y }, { x: o.x + L, y: o.y }]
    gy.forEach((y, i) => { const [a, b] = i % 2 ? [o.x, o.x + L] : [o.x + L, o.x]; horizontales.push({ x: a, y: Y(y) }, { x: b, y: Y(y) }) })
    const cote = horizontales[horizontales.length - 1].x
    horizontales.push({ x: cote, y: o.y + H }, { x: cote === o.x ? o.x + L : o.x, y: o.y + H })
    d.lignes.push({ pts: verticales.map(arrondi), couleur: COULEUR_GRILLE, taille: fin }, { pts: horizontales.map(arrondi), couleur: COULEUR_GRILLE, taille: fin })
  }
  // Les axes, par-dessus, avec leur flèche ; l'axe des abscisses porte la
  // recette (marqué axe)
  const axe: LigneAxe = { pts: [{ x: o.x - AVANT_AXE * k, y: Y(ax) }, { x: o.x + L + APRES_AXE * k, y: Y(ax) }], couleur: null, taille: ep, fleche: true, axe: true }
  d.lignes.push(axe)
  d.lignes.push({ pts: [{ x: X(ay), y: o.y + H + AVANT_AXE * k }, { x: X(ay), y: o.y - APRES_AXE * k }], couleur: null, taille: ep, fleche: true })
  // Les graduations : un seul trait par axe, qui court sur l'axe d'une
  // graduation à l'autre
  const tic = 5 * k
  const ticsX: P[] = [], ticsY: P[] = []
  for (const x of gx) {
    if (Math.abs(x - ay) < 1e-9) continue
    ticsX.push({ x: X(x), y: Y(ax) }, { x: X(x), y: Y(ax) - tic }, { x: X(x), y: Y(ax) + tic }, { x: X(x), y: Y(ax) })
    d.etiquettes.push({ texte: nombreFr(x, 4), latex: nombreLatex(x, 4), p: { x: X(x), y: Y(ax) + (ax === y0 && y0 !== 0 ? -1 : 1) * 16 * k }, couleur: null, taille })
  }
  for (const y of gy) {
    if (Math.abs(y - ax) < 1e-9) continue
    ticsY.push({ x: X(ay), y: Y(y) }, { x: X(ay) - tic, y: Y(y) }, { x: X(ay) + tic, y: Y(y) }, { x: X(ay), y: Y(y) })
    const t = nombreFr(y, 4)
    d.etiquettes.push({ texte: t, latex: nombreLatex(y, 4), p: { x: X(ay) + (ay === x1 && x1 !== 0 ? 1 : -1) * (12 + t.length * 5) * k, y: Y(y) }, couleur: null, taille })
  }
  for (const t of [ticsX, ticsY]) if (t.length > 1) d.lignes.push({ pts: t.map(arrondi), couleur: null, taille: ep })
  if (ax === 0 && ay === 0) d.etiquettes.push({ texte: 'O', p: { x: X(0) - 11 * k, y: Y(0) + 13 * k }, couleur: null, taille })
  // Les courbes
  const lues = r.fonctions.map(f => lire(f))
  lues.forEach((l, i) => {
    if (!l.ok) return
    const f = (x: number) => l.calcul(x, r.curseurs)
    for (const morceau of morceaux(f, r.fenetre)) d.lignes.push({ pts: morceau.map(p => arrondi({ x: X(p.x), y: Y(p.y) })), couleur: COULEURS_COURBES[i], taille: Math.max(1, 3 * k) })
    if (r.noms) {
      const place = placeDuNom(f, r.fenetre)
      if (place) d.etiquettes.push({ texte: `C${NOMS_FONCTIONS[i]}`, latex: `\\mathcal{C}_{${NOMS_FONCTIONS[i]}}`, p: { x: Math.min(X(place.x) + 18 * k, o.x + L - 16 * k), y: Y(place.y) - 18 * k }, couleur: COULEURS_COURBES[i], taille: Math.round(taille * 1.3) })
    }
  })
  // Le point M et la tangente, sur la première courbe qui se lit
  const i = lues.findIndex(l => l.ok)
  const l = lues[i]
  if (l?.ok && (r.point || r.tangente)) {
    const f = (x: number) => l.calcul(x, r.curseurs)
    const xa = Math.min(Math.max(r.x0, x0), x1), ya = f(xa)
    if (Number.isFinite(ya)) {
      if (r.tangente) {
        const m = derivee(f, xa)
        if (m !== null) {
          for (const morceau of morceaux(x => ya + m * (x - xa), r.fenetre, 2))
            d.lignes.push({ pts: morceau.map(p => arrondi({ x: X(p.x), y: Y(p.y) })), couleur: COULEUR_TANGENTE, taille: Math.max(1, 2.5 * k) })
          const eq = equationDroite(m, ya - m * xa)
          d.etiquettes.push({ texte: eq.texte, latex: eq.latex, p: { x: o.x + L / 2, y: o.y - 18 * k }, couleur: COULEUR_TANGENTE, taille: Math.round(taille * 1.15) })
        }
      }
      if (r.point && ya >= y0 && ya <= y1) {
        const M = { x: X(xa), y: Y(ya) }
        if (Math.abs(ya - ax) > 1e-9) d.lignes.push({ pts: [M, { x: M.x, y: Y(ax) }], couleur: GRIS, taille: Math.max(1, 1.5 * k), tirets: true })
        if (Math.abs(xa - ay) > 1e-9) d.lignes.push({ pts: [M, { x: X(ay), y: M.y }], couleur: GRIS, taille: Math.max(1, 1.5 * k), tirets: true })
        d.points.push({ p: M, couleur: COULEURS_COURBES[i] })
        d.etiquettes.push({ texte: 'M', p: { x: M.x + 14 * k, y: M.y - 16 * k }, couleur: null, taille: Math.round(taille * 1.3) })
        // Les valeurs, en gras, de l'autre côté de l'axe
        const tx = nombreFr(xa), ty = nombreFr(ya)
        d.etiquettes.push({ texte: tx, latex: `\\mathbf{${nombreLatex(xa)}}`, p: { x: M.x, y: Y(ax) + (ya >= ax ? 36 : -36) * k }, couleur: COULEURS_COURBES[i], taille })
        d.etiquettes.push({ texte: ty, latex: `\\mathbf{${nombreLatex(ya)}}`, p: { x: X(ay) + (xa >= ay ? -1 : 1) * (30 + ty.length * 5) * k, y: M.y }, couleur: COULEURS_COURBES[i], taille })
      }
    }
  }
  return d
}

/** La dérivée en x, approchée ; null si la fonction n'y est pas dérivable
 *  (un coin, une demi-tangente verticale) */
export function derivee(f: (x: number) => number, x: number): number | null {
  const h = 1e-5
  const g = (f(x + h) - f(x)) / h, d = (f(x) - f(x - h)) / h, m = (f(x + h) - f(x - h)) / (2 * h)
  if (!Number.isFinite(m) || !Number.isFinite(g) || !Number.isFinite(d)) return null
  if (Math.abs(g - d) > 1e-2 * Math.max(1, Math.abs(m))) return null
  return Math.abs(m) < 1e-9 ? 0 : m
}

/** L'équation y = mx + p, écrite comme au tableau (y = 2x − 1 ; y = −x ; y = 3) */
export function equationDroite(m: number, p: number): { texte: string; latex: string } {
  const r = (v: number) => Math.round(v * 100) / 100
  const M = r(m), Pp = r(p)
  let t = '', l = ''
  if (M !== 0) {
    const coef = M === 1 ? '' : M === -1 ? '−' : nombreFr(M)
    t = `${coef}x`; l = `${coef.replace('−', '-').replace(',', '{,}')}x`
  }
  if (Pp !== 0 || M === 0) {
    if (!t) { t = nombreFr(Pp); l = nombreLatex(Pp) }
    else { t += Pp < 0 ? ` − ${nombreFr(-Pp)}` : ` + ${nombreFr(Pp)}`; l += Pp < 0 ? ` - ${nombreLatex(-Pp)}` : ` + ${nombreLatex(Pp)}` }
  }
  return { texte: `y = ${t}`, latex: `y = ${l}` }
}

/** Les morceaux de courbe dans la fenêtre : une ligne brisée par morceau,
 *  coupée là où la fonction n'est pas définie, là où elle sort de la
 *  fenêtre (au bord exactement), et aux sauts (1/x en 0). n : le nombre de
 *  points (une droite n'en demande que 2). */
export function morceaux(f: (x: number) => number, fenetre: [number, number, number, number], n = 480): P[][] {
  const [x0, x1, y0, y1] = fenetre, h = y1 - y0
  const res: P[][] = []
  let cour: P[] = []
  const finir = () => { if (cour.length > 1) res.push(cour); cour = [] }
  const dedans = (y: number) => y >= y0 && y <= y1
  const bord = (a: P, b: P, y: number): P => ({ x: a.x + (b.x - a.x) * (y - a.y) / (b.y - a.y), y })
  let avant: P | null = null
  for (let i = 0; i <= n; i++) {
    const x = x0 + (x1 - x0) * i / n, y = f(x)
    const p = Number.isFinite(y) ? { x, y } : null
    if (!p) { finir(); avant = null; continue }
    if (avant) {
      const a = avant, b = p
      // Un saut : on passe d'un bord à l'autre d'un coup (une asymptote)
      const saut = Math.abs(b.y - a.y) > 3 * h && ((a.y > y1 && b.y < y0) || (a.y < y0 && b.y > y1))
      if (saut) { finir(); avant = p; continue }
      const ia = dedans(a.y), ib = dedans(b.y)
      if (ia && ib) { if (!cour.length) cour.push(a); cour.push(b) }
      else if (ia && !ib) { if (!cour.length) cour.push(a); cour.push(bord(a, b, b.y > y1 ? y1 : y0)); finir() }
      else if (!ia && ib) { finir(); cour.push(bord(a, b, a.y > y1 ? y1 : y0), b) }
      else if ((a.y > y1 && b.y < y0) || (a.y < y0 && b.y > y1)) {
        // Elle traverse toute la fenêtre entre deux points (très raide)
        finir(); res.push([bord(a, b, a.y > y1 ? y1 : y0), bord(a, b, b.y > y1 ? y1 : y0)])
      }
    }
    avant = p
  }
  finir()
  return res
}

/** Où écrire le nom d'une courbe : vers la droite de la fenêtre, là où la
 *  courbe y est bien (pas collée à un bord) */
function placeDuNom(f: (x: number) => number, fenetre: [number, number, number, number]): P | null {
  const [x0, x1, y0, y1] = fenetre, m = (y1 - y0) * 0.08
  for (let t = 0.9; t >= 0.2; t -= 0.02) {
    const x = x0 + (x1 - x0) * t, y = f(x)
    if (Number.isFinite(y) && y > y0 + m && y < y1 - m) return { x, y }
  }
  return null
}

/** Une fenêtre en y qui montre les courbes sur [x0 ; x1] (le bouton
 *  « Ajuster aux courbes ») ; null si aucune courbe ne se lit */
export function ajusterFenetre(r: RecetteCourbes): [number, number] | null {
  const [x0, x1] = r.fenetre
  const vals: number[] = []
  for (const t of r.fonctions) {
    const l = lire(t)
    if (!l.ok) continue
    for (let i = 0; i <= 200; i++) { const y = l.calcul(x0 + (x1 - x0) * i / 200, r.curseurs); if (Number.isFinite(y) && Math.abs(y) < 1e4) vals.push(y) }
  }
  if (!vals.length) return null
  // Sans les valeurs extrêmes (près d'une asymptote) : du 3e au 97e centile
  vals.sort((a, b) => a - b)
  const lo = vals[Math.floor(vals.length * 0.03)], hi = vals[Math.ceil(vals.length * 0.97) - 1]
  const marge = Math.max(0.5, (hi - lo) * 0.1)
  return [Math.floor(Math.min(lo - marge, -1)), Math.ceil(Math.max(hi + marge, 1))]
}
