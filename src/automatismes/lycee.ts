// =============================================================
// LES AUTOMATISMES DE 2nde ET DE 1re (épreuve anticipée, 2027)
// Les exercices de 2nde (en italique dans la liste officielle), ceux de
// 1re, et les questions de cours des deux niveaux. Voir
// ../automatismes.ts pour l'ensemble.
// =============================================================
import * as F from '../figures'
import type { Automatisme, Facon, Question, QuestionCours } from './outils'
import { PRENOMS, arrondi, choix, coord, deg, ent, etL, frac, grandNb, irreductible, lettre, melange, mot, nb, notions, pgcd, pt, pts, relNonNul, tableau, unTrou, une, unite } from './outils'

// =============================================================
// LES AUTOMATISMES DE 2nde ET DE 1re
// Rangés comme la liste officielle des automatismes de l'épreuve
// anticipée de mathématiques (session 2027) : ceux « relevant du
// programme de seconde » (en italique dans la liste) sont en 2nde, les
// autres en 1re. Pour réviser toute l'épreuve, on coche les deux niveaux.
// Mêmes règles qu'au collège : réponse courte, jamais une chance sur
// deux, rien de fixe.
// =============================================================
export const T_CALCUL = 'Calcul numérique et algébrique'
export const T_PROPORTIONS = 'Proportions et pourcentages'
export const T_EVOLUTIONS = 'Évolutions et variations'
export const T_FONCTIONS = 'Fonctions et représentations'
export const T_STATS = 'Statistiques'
export const T_PROBAS = 'Probabilités'

// ---------- Outils du lycée ----------
/** Un polynôme, ses coefficients du plus haut degré au plus bas :
 *  [2, −3, 1] donne 2x^2 - 3x + 1 (sans « 1x », sans « + 0 ») */
export function polynome(coefs: number[], v = 'x'): string {
  const deg = coefs.length - 1
  let r = ''
  coefs.forEach((c, i) => {
    if (c === 0) return
    const k = deg - i, a = Math.abs(c)
    const corps = k === 0 ? nb(a) : (a === 1 ? '' : nb(a)) + v + (k > 1 ? `^${k}` : '')
    r += r === '' ? (c < 0 ? '-' : '') + corps : (c < 0 ? ' - ' : ' + ') + corps
  })
  return r || '0'
}
/** (ax + b), entre parenthèses */
export const facteur = (a: number, b: number, v = 'x') => `(${polynome([a, b], v)})`
/** Un intervalle : [a ; b], ]−∞ ; b[… (fa, fb : crochets fermés) */
export const intervalle = (a: string, b: string, fa: boolean, fb: boolean) => `${fa ? '[' : ']'}${a}\\,;\\,${b}${fb ? ']' : '['}`
/** Un ensemble de solutions : S = {−2 ; 3}, ou l'ensemble vide */
export const ensemble = (vals: string[]) => vals.length ? `S = \\{${vals.join('\\,;\\,')}\\}` : 'S = \\varnothing'
export const pct = (x: number) => `${nb(x)}\\,\\%`
export const fracDec = (n: number, d: number) => irreductible(n, d)
/** Un nombre au hasard dans une liste, différent de ceux donnés */
export const autreQue = <T,>(t: T[], ...pas: T[]) => choix(t.filter(x => !pas.includes(x)))

// ---------- Les courbes au hasard (lecture graphique) ----------
export type Noeud = { x: number; y: number }
/** Des nœuds aux abscisses entières qui se suivent, d'ordonnées entières
 *  entre −4 et 4, jamais deux égales de suite : la courbe tracée par
 *  F.courbeFonction monte ou descend d'un nœud au suivant, sans bosse
 *  cachée. Elle change de sens une à trois fois. */
export function noeudsAuHasard(): Noeud[] {
  for (;;) {
    const n = ent(6, 9), x0 = ent(-5, 5 - (n - 1))
    const ys = [ent(-3, 3)]
    let sens = choix([1, -1])
    for (let i = 1; i < n; i++) {
      if (Math.random() < 0.3) sens = -sens
      let y = ys[i - 1] + sens * choix([1, 1, 2])
      if (y > 4 || y < -4) { sens = -sens; y = ys[i - 1] + sens * choix([1, 2]) }
      ys.push(Math.max(-4, Math.min(4, y)))
    }
    if (ys.some((y, i) => i > 0 && y === ys[i - 1])) continue
    const tours = ys.slice(1, -1).filter((y, i) => (y - ys[i]) * (ys[i + 2] - y) < 0).length
    if (tours >= 1 && tours <= 3) return ys.map((y, i) => ({ x: x0 + i, y }))
  }
}
/** La courbe ne passe par la hauteur k qu'en des nœuds (aucun morceau ne
 *  l'enjambe) : on peut lire exactement les solutions */
export const lisibleEn = (p: Noeud[], k: number) => p.every((q, i) => i === 0 || !(Math.min(q.y, p[i - 1].y) < k && k < Math.max(q.y, p[i - 1].y)))
/** L'ensemble des x de la courbe où vrai(f(x)) : une suite de nœuds et
 *  de morceaux entre deux nœuds (dont on connaît le signe par rapport à
 *  k, puisque k n'est jamais enjambé), réunis en intervalles */
export function ensembleLu(p: Noeud[], vrai: (y: number) => boolean): string {
  const el: { v: boolean; x: number; noeud: boolean }[] = []
  p.forEach((q, i) => {
    el.push({ v: vrai(q.y), x: q.x, noeud: true })
    if (i < p.length - 1) el.push({ v: vrai((q.y + p[i + 1].y) / 2), x: q.x, noeud: false })
  })
  const morceaux: string[] = []
  for (let i = 0; i < el.length;) {
    if (!el[i].v) { i++; continue }
    let j = i
    while (j + 1 < el.length && el[j + 1].v) j++
    const a = el[i], b = el[j]
    if (i === j && a.noeud) morceaux.push(`\\{${nb(a.x)}\\}`)
    else {
      // Un morceau commence ouvert au nœud qui le précède, finit ouvert au nœud qui le suit
      const xa = a.noeud ? a.x : a.x, xb = b.noeud ? b.x : el[j + 1].x
      morceaux.push(intervalle(nb(xa), nb(xb), a.noeud, b.noeud))
    }
    i = j + 1
  }
  return morceaux.length ? `S = ${morceaux.join(' \\cup ')}` : 'S = \\varnothing'
}
/** Les intervalles où la courbe monte (ou descend) */
export function sensDeVariation(p: Noeud[], monte: boolean): string[] {
  const r: string[] = []
  for (let i = 0; i < p.length - 1;) {
    if ((p[i + 1].y > p[i].y) !== monte) { i++; continue }
    let j = i + 1
    while (j < p.length - 1 && (p[j + 1].y > p[j].y) === monte) j++
    r.push(intervalle(nb(p[i].x), nb(p[j].x), true, true))
    i = j
  }
  return r
}
export const NOMS_FONCTIONS = ['f', 'g', 'h']

// ---------- Contextes ----------
export const POPULATIONS: [string, string, number[]][] = [
  ['un lycée', 'élèves', [400, 500, 600, 800, 1000, 1200]],
  ['un club de sport', 'adhérents', [120, 160, 200, 240, 300]],
  ['un village', 'habitants', [600, 800, 1500, 2000, 2400]],
  ['une entreprise', 'salariés', [80, 120, 150, 250, 400]],
]
/** Une population et un pourcentage dont la partie est un nombre entier de personnes */
export function populationEtPart(pourcents: number[]): { lieu: string; gens: string; N: number; p: number; n: number } {
  for (;;) {
    const [lieu, gens, tailles] = choix(POPULATIONS), N = choix(tailles), p = choix(pourcents)
    if (N * p % 100 === 0) return { lieu, gens, N, p, n: N * p / 100 }
  }
}
export const CARACTERES = ['sont externes', 'portent des lunettes', 'viennent à vélo', 'pratiquent la natation', 'ont plus de 40 ans', 'jouent d\'un instrument']

export const AUTOMATISMES_2NDE: Automatisme[] = [
  // ================= CALCUL NUMÉRIQUE ET ALGÉBRIQUE =================
  {
    id: '2nde-comparer-difference', theme: T_CALCUL, titre: 'Comparer deux nombres par leur différence',
    programme: 'Comparer deux nombres par le calcul de leur différence.',
    generer() {
      for (;;) {
        const b = ent(3, 12), d = autreQue([3, 4, 5, 6, 7, 8, 9, 10, 11, 12], b), a = ent(1, b - 1), c = ent(1, d - 1)
        const [X, Y] = choix([['A', 'B'], ['a', 'b'], ['x', 'y']])
        const n = a * d - c * b, den = b * d
        if (n === 0 || Math.abs(n) > 4 || pgcd(a, b) !== 1 || pgcd(c, d) !== 1) continue
        const signe = n > 0 ? '>' : '<'
        return { enonce: `On donne $${X} = ${frac(a, b)}$ et $${Y} = ${frac(c, d)}$. Calculer $${X} - ${Y}$, puis comparer $${X}$ et $${Y}$.`, reponse: mot(`$${X} - ${Y} = ${fracDec(n, den)} ${signe} 0$, donc $${X} ${signe} ${Y}$`) }
      }
    },
  },
  {
    id: '2nde-comparer-quotient', theme: T_CALCUL, titre: 'Comparer deux nombres positifs par leur quotient',
    programme: 'Comparer deux nombres strictement positifs par le calcul de leur quotient.',
    generer() {
      for (;;) {
        const a = choix([2, 3, 5]), n = ent(6, 12), k = ent(1, 3), c = ent(2, 9)
        if (a ** k === c) continue
        const [X, Y] = choix([['A', 'B'], ['a', 'b'], ['u', 'v']])
        const q = fracDec(a ** k, c), signe = a ** k > c ? '>' : '<'
        return { enonce: `On donne $${X} = ${a}^{${n}}$ et $${Y} = ${c} \\times ${a}^{${n - k}}$. Calculer $\\frac{${X}}{${Y}}$, puis comparer $${X}$ et $${Y}$.`, reponse: mot(`$\\frac{${X}}{${Y}} = ${q} ${signe} 1$, donc $${X} ${signe} ${Y}$`) }
      }
    },
  },
  {
    id: '2nde-fractions', theme: T_CALCUL, titre: 'Opérations sur les fractions simples',
    programme: 'Effectuer des opérations et des comparaisons entre des fractions simples.',
    generer() {
      let a: number, b: number, c: number, d: number
      do { b = ent(2, 7); d = autreQue([2, 3, 4, 5, 6, 7, 8, 9, 10], b); a = ent(1, 9); c = ent(1, 9) } while (pgcd(a, b) !== 1 || pgcd(c, d) !== 1)
      const op = choix(['+', '-', '\\times', '\\div'])
      const [n, den] = op === '+' ? [a * d + c * b, b * d] : op === '-' ? [a * d - c * b, b * d] : op === '\\times' ? [a * c, b * d] : [a * d, b * c]
      return { enonce: `Calculer et donner le résultat sous forme irréductible : $${frac(a, b)} ${op} ${frac(c, d)}$`, reponse: fracDec(n, den) }
    },
    trou() {
      const b = ent(2, 9), a = ent(1, b - 1), k = ent(2, 5), c = ent(2, 9)
      return unTrou('', [[`$${frac(a, b)} + \\ldots = ${frac(a * k + c, b * k)}$`, frac(c, b * k)], [`$${frac(a, b)} = \\frac{\\ldots}{${b * k}}$`, nb(a * k)], [`$${frac(a, b)} \\times \\ldots = ${frac(a * c, b)}$`, nb(c)]])
    },
  },
  {
    id: '2nde-puissances', theme: T_CALCUL, titre: 'Opérations sur les puissances',
    programme: 'Effectuer des opérations sur les puissances.',
    generer() {
      const a = choix(['2', '3', '5', '7', '10', 'x', 'a']), n = ent(2, 9), m = ent(2, 9)
      return choix([
        { enonce: `Écrire sous la forme d'une seule puissance : $${a}^{${n}} \\times ${a}^{${m}}$`, reponse: `${a}^{${n + m}}` },
        { enonce: `Écrire sous la forme d'une seule puissance : $\\frac{${a}^{${n}}}{${a}^{${m}}}$`, reponse: n - m === 1 ? a : `${a}^{${n - m}}` },
        { enonce: `Écrire sous la forme d'une seule puissance : $(${a}^{${n}})^{${m}}$`, reponse: `${a}^{${n * m}}` },
        { enonce: `Écrire sous la forme d'une seule puissance : $${a}^{-${n}} \\times ${a}^{${m}}$`, reponse: m - n === 1 ? a : m === n ? '1' : `${a}^{${m - n}}` },
      ].filter(q => q.reponse !== `${a}^{0}`))
    },
    trou() {
      const a = choix(['2', '3', '10', 'x']), n = ent(2, 9), m = ent(2, 9)
      return unTrou('', [[`$${a}^{${n}} \\times ${a}^{\\ldots} = ${a}^{${n + m}}$`, nb(m)], [`$(${a}^{${n}})^{\\ldots} = ${a}^{${n * m}}$`, nb(m)], [`$\\frac{1}{${a}^{${n}}} = ${a}^{\\ldots}$`, nb(-n)]])
    },
  },
  {
    id: '2nde-ecritures', theme: T_CALCUL, titre: 'Écriture décimale, fractionnaire, pourcentage',
    programme: 'Passer d’une écriture d’un nombre à une autre (décimale, fractionnaire, pourcentage).',
    generer() {
      const [n, d] = choix<[number, number]>([[1, 4], [3, 4], [1, 5], [2, 5], [3, 5], [4, 5], [1, 8], [3, 8], [5, 8], [7, 8], [1, 20], [3, 20], [7, 20], [9, 25], [3, 50], [1, 2], [7, 10], [9, 10]])
      const v = n / d
      return choix([
        { enonce: `Écrire $${frac(n, d)}$ sous la forme d'un pourcentage.`, reponse: pct(v * 100) },
        { enonce: `Donner l'écriture décimale de $${frac(n, d)}$.`, reponse: nb(v) },
        { enonce: `Écrire $${pct(v * 100)}$ sous la forme d'une fraction irréductible.`, reponse: frac(n, d) },
        { enonce: `Écrire $${nb(v)}$ sous la forme d'un pourcentage.`, reponse: pct(v * 100) },
        { enonce: `Écrire $${nb(v)}$ sous la forme d'une fraction irréductible.`, reponse: frac(n, d) },
      ])
    },
    trou() {
      const [n, d] = choix<[number, number]>([[1, 4], [3, 4], [2, 5], [3, 8], [7, 20], [9, 25], [3, 50]])
      return unTrou('', [[`$${frac(n, d)} = \\ldots\\,\\%$`, nb(n / d * 100)], [`$${pct(n / d * 100)} = \\frac{${n}}{\\ldots}$`, nb(d)], [`$${frac(n, d)} = \\ldots$ (écriture décimale)`, nb(n / d)]])
    },
  },
  {
    id: '2nde-ordre-grandeur', theme: T_CALCUL, titre: 'Estimer un ordre de grandeur',
    programme: 'Estimer un ordre de grandeur.',
    generer() {
      const A = choix([20, 30, 40, 50, 60, 200, 300, 400, 500]), B = choix([0.2, 0.3, 0.5, 2, 3, 4, 20, 30])
      const a = arrondi(A * (1 + choix([-1, 1]) * ent(1, 4) / 100) * 10) / 10, b = arrondi(B * (1 + choix([-1, 1]) * ent(1, 4) / 100) * 100) / 100
      return Math.random() < 0.6
        ? { enonce: `Donner un ordre de grandeur de $${nb(a)} \\times ${nb(b)}$.`, reponse: mot(`environ $${grandNb(A * B)}$ (car $${nb(A)} \\times ${nb(B)} = ${grandNb(A * B)}$)`) }
        : { enonce: `Donner un ordre de grandeur de $${grandNb(arrondi(a * B))} \\div ${nb(b)}$.`, reponse: mot(`environ $${nb(A)}$ (car $${grandNb(A * B)} \\div ${nb(B)} = ${nb(A)}$)`) }
    },
  },
  {
    id: '2nde-vraisemblance', theme: T_CALCUL, titre: 'S’assurer de la vraisemblance d’un résultat',
    programme: 'S’assurer de la vraisemblance, de la cohérence d’un résultat.',
    generer() {
      const qui = choix(PRENOMS)
      return choix([
        () => { const a = ent(2, 9), b = ent(2, 9); return { enonce: `${qui} écrit $0{,}${a} \\times 0{,}${b} = ${nb(a * b / 10)}$. Ce n'est pas vraisemblable : quel est le bon résultat ?`, reponse: nb(a * b / 100) } },
        () => { const p = choix([5, 10, 15, 20, 30]), c = 20 * ent(2, 9); return { enonce: `${qui} trouve que $${p}\\,\\%$ de $${c}$ font $${nb(p * c / 10)}$. Ce n'est pas vraisemblable : quel est le bon résultat ?`, reponse: nb(p * c / 100) } },
        () => { const a = ent(2, 9), d = choix([0.5, 0.25, 0.1]); return { enonce: `${qui} écrit $${a} \\div ${nb(d)} = ${nb(a * d)}$. Ce n'est pas vraisemblable : quel est le bon résultat ?`, reponse: nb(a / d) } },
      ])()
    },
  },
  {
    id: '2nde-conversions', theme: T_CALCUL, titre: 'Conversions d’unités',
    programme: 'Effectuer des conversions d’unités : longueurs, aires, volumes, contenances, durées, vitesses, masses.',
    generer() {
      const sortes: (() => Question)[] = [
        () => { const v = ent(11, 99) / 10; return { enonce: `Convertir $${unite(nb(v), 'km')}$ en mètres.`, reponse: unite(nb(v * 1000), 'm') } },
        () => { const v = ent(12, 95); return { enonce: `Convertir $${unite(nb(v), 'mm')}$ en centimètres.`, reponse: unite(nb(v / 10), 'cm') } },
        () => { const v = ent(2, 9) / choix([1, 10]); return { enonce: `Convertir $${nb(v)}\\text{ m}^2$ en $\\text{cm}^2$.`, reponse: `${grandNb(v * 10000)}\\text{ cm}^2` } },
        () => { const v = ent(15, 95) * 10; return { enonce: `Convertir $${nb(v)}\\text{ cm}^2$ en $\\text{dm}^2$.`, reponse: `${nb(v / 100)}\\text{ dm}^2` } },
        () => { const v = ent(2, 9) / choix([1, 10]); return { enonce: `Convertir $${nb(v)}\\text{ dm}^3$ en $\\text{cm}^3$.`, reponse: `${grandNb(v * 1000)}\\text{ cm}^3` } },
        () => { const v = ent(2, 30) / 10; return { enonce: `Combien de litres y a-t-il dans $${nb(v)}\\text{ m}^3$ ?`, reponse: unite(grandNb(v * 1000), 'L') } },
        () => { const v = ent(5, 95) * 10; return { enonce: `Convertir $${unite(nb(v), 'mL')}$ en litres.`, reponse: unite(nb(v / 1000), 'L') } },
        () => { const v = ent(2, 9) * 10 + 5; return { enonce: `Convertir $${unite(nb(v), 'cL')}$ en litres.`, reponse: unite(nb(v / 100), 'L') } },
        () => { const h = ent(1, 4), q = choix([0.25, 0.5, 0.75, 0.1, 0.2]); return { enonce: `Convertir $${unite(nb(h + q), 'h')}$ en heures et minutes.`, reponse: `${h}\\text{ h }${q * 60}\\text{ min}` } },
        () => { const m = choix([75, 90, 105, 135, 150, 45, 36, 12]); return { enonce: `Convertir $${unite(nb(m), 'min')}$ en heures (écriture décimale).`, reponse: unite(nb(m / 60), 'h') } },
        () => { const v = choix([18, 36, 54, 72, 90, 108, 126]); return { enonce: `Convertir $${nb(v)}\\text{ km/h}$ en $\\text{m/s}$.`, reponse: `${nb(v / 3.6)}\\text{ m/s}` } },
        () => { const v = choix([5, 10, 15, 20, 25, 30]); return { enonce: `Convertir $${nb(v)}\\text{ m/s}$ en $\\text{km/h}$.`, reponse: `${nb(v * 3.6)}\\text{ km/h}` } },
        () => { const v = ent(12, 95) / 10; return { enonce: `Convertir $${unite(nb(v), 'kg')}$ en grammes.`, reponse: unite(grandNb(v * 1000), 'g') } },
        () => { const v = ent(150, 950); return { enonce: `Convertir $${unite(nb(v), 'kg')}$ en tonnes.`, reponse: unite(nb(v / 1000), 't') } },
      ]
      return choix(sortes)()
    },
    trou() {
      const h = ent(1, 3), q = choix([0.25, 0.5, 0.75]), v = choix([36, 54, 72, 90])
      return unTrou('', [[`$${unite(nb(h + q), 'h')} = \\ldots\\text{ min}$`, nb((h + q) * 60)], [`$${nb(v)}\\text{ km/h} = \\ldots\\text{ m/s}$`, nb(v / 3.6)], [`$${nb(h)}\\text{ m}^3 = \\ldots\\text{ L}$`, grandNb(h * 1000)]])
    },
  },
  {
    id: '2nde-litteral-additif', theme: T_CALCUL, titre: 'Supprimer des parenthèses précédées d’un signe moins',
    programme: 'Effectuer un calcul littéral élémentaire : −(a + b) = −a − b, −(a − b) = b − a.',
    generer() {
      const a = relNonNul(1, 9), b = relNonNul(1, 9), v = lettre()
      return { enonce: `Supprimer les parenthèses : $-(${polynome([a, b], v)})$`, reponse: polynome([-a, -b], v) }
    },
    trou() {
      const a = ent(2, 9), b = ent(2, 9), v = lettre()
      return unTrou('', [[`$-(\\ldots) = ${polynome([-a, b], v)}$`, polynome([a, -b], v)], [`$\\ldots - (${polynome([1, -b], v)}) = ${polynome([a - 1, b], v)}$`, polynome([a, 0], v)]])
    },
  },
  {
    id: '2nde-litteral-multiplicatif', theme: T_CALCUL, titre: 'Expressions multiplicatives et quotients',
    programme: 'Effectuer un calcul littéral élémentaire : expressions multiplicatives et quotients.',
    generer() {
      const a = ent(2, 9), b = autreQue([2, 3, 4, 5, 7, 8, 9, 11], a), c = ent(2, 9), d = autreQue([2, 3, 5, 7, 9, 11], c), v = lettre()
      return choix([
        { enonce: `Écrire sous la forme d'une seule fraction : $\\dfrac{${frac(a, b)}}{${frac(c, d)}}$`, reponse: fracDec(a * d, b * c) },
        { enonce: `Écrire sous la forme d'une seule fraction : $\\dfrac{${frac(a, b)}}{${c}}$`, reponse: fracDec(a, b * c) },
        { enonce: `Écrire sous la forme d'une seule fraction : $\\dfrac{${a}}{${frac(c, d)}}$`, reponse: fracDec(a * d, c) },
        { enonce: `Écrire plus simplement : $\\dfrac{1}{${frac(c, d)}}$`, reponse: frac(d, c) },
        { enonce: `Simplifier : $\\dfrac{${a * c}${v}}{${c}}$`, reponse: `${a}${v}` },
        { enonce: `Simplifier : $(-1) \\times ${frac(a, b)} \\times ${v}$`, reponse: `-${frac(a, b)}${v}` },
        { enonce: `Écrire avec un seul trait de fraction : $${a} \\times \\dfrac{${v}}{${b}}$`, reponse: `\\frac{${a}${v}}{${b}}` },
      ])
    },
    trou() {
      const a = ent(2, 9), b = autreQue([3, 5, 7, 11], a), v = lettre()
      return unTrou('', [[`$\\dfrac{${v}}{${b}} = \\dfrac{1}{${b}} \\times \\ldots$`, v], [`$\\dfrac{${a}${v}}{${b}} = ${a} \\times \\ldots$`, `\\frac{${v}}{${b}}`], [`$\\dfrac{${a}}{${b}} \\div ${frac(a, b + 2)} = \\ldots$`, fracDec(b + 2, b)]])
    },
  },
  {
    id: '2nde-identites', theme: T_CALCUL, titre: 'Identités remarquables',
    programme: 'Développer, factoriser : identités (a + b)², (a − b)², (a + b)(a − b).',
    generer() {
      let a: number, b: number
      do { a = ent(1, 3); b = ent(1, 9) } while (pgcd(a, b) !== 1)
      const v = choix(['x', 'x', 'a', 't']), ax = a === 1 ? v : `${a}${v}`
      return choix([
        { enonce: `Développer : $(${ax} + ${b})^2$`, reponse: polynome([a * a, 2 * a * b, b * b], v) },
        { enonce: `Développer : $(${ax} - ${b})^2$`, reponse: polynome([a * a, -2 * a * b, b * b], v) },
        { enonce: `Développer : $(${ax} + ${b})(${ax} - ${b})$`, reponse: polynome([a * a, 0, -b * b], v) },
        { enonce: `Factoriser : $${polynome([a * a, 0, -b * b], v)}$`, reponse: `(${ax} - ${b})(${ax} + ${b})` },
        { enonce: `Factoriser : $${polynome([a * a, 2 * a * b, b * b], v)}$`, reponse: `(${ax} + ${b})^2` },
        { enonce: `Factoriser : $${polynome([a * a, -2 * a * b, b * b], v)}$`, reponse: `(${ax} - ${b})^2` },
      ])
    },
    trou() {
      const b = ent(2, 9), v = choix(['x', 'a', 't'])
      return unTrou('', [[`$(${v} + ${b})^2 = ${v}^2 + \\ldots + ${b * b}$`, `${2 * b}${v}`], [`$(${v} - ${b})^2 = ${v}^2 - ${2 * b}${v} + \\ldots$`, nb(b * b)], [`$${v}^2 - ${b * b} = (${v} - \\ldots)(${v} + ${b})$`, nb(b)]])
    },
  },
  {
    id: '2nde-factoriser', theme: T_CALCUL, titre: 'Factoriser par un facteur commun',
    programme: 'Factoriser ax² + bx, ax + bx.',
    generer() {
      for (;;) {
        const k = ent(1, 6), a = ent(1, 7), b = relNonNul(1, 7), v = choix(['x', 'x', 'a', 't'])
        if (pgcd(a, b) !== 1) continue
        if (k > 1 && Math.random() < 0.4) return { enonce: `Factoriser : $${polynome([k * a, k * b], v)}$`, reponse: `${k}${facteur(a, b, v)}` }
        return { enonce: `Factoriser : $${polynome([k * a, k * b, 0], v)}$`, reponse: `${k === 1 ? '' : k}${v}${facteur(a, b, v)}` }
      }
    },
    trou() {
      const k = ent(2, 6), a = ent(1, 7), b = relNonNul(1, 7), v = choix(['x', 'a', 't'])
      return unTrou('', [[`$${polynome([k * a, k * b, 0], v)} = ${k}${v}(\\ldots)$`, polynome([a, b], v)], [`$${polynome([k * a, k * b], v)} = \\ldots${facteur(a, b, v)}$`, nb(k)]])
    },
  },
  {
    id: '2nde-equations', theme: T_CALCUL, titre: 'Résoudre une équation ou une inéquation',
    programme: 'Résoudre une équation du type x² = a, ax + b = cx + d ou a/x = b, ou une inéquation du premier degré.',
    generer() {
      const sortes: (() => Question)[] = [
        () => { const r = ent(1, 12); return { enonce: `Résoudre : $x^2 = ${r * r}$`, reponse: ensemble([`-${r}`, `${r}`]) } },
        () => { const r = choix([2, 3, 5, 6, 7, 10, 11]); return { enonce: `Résoudre : $x^2 = ${r}$`, reponse: ensemble([`-\\sqrt{${r}}`, `\\sqrt{${r}}`]) } },
        () => { const r = ent(1, 30); return { enonce: `Résoudre : $x^2 = -${r}$`, reponse: ensemble([]) } },
        () => {
          for (;;) {
            const a = relNonNul(1, 9), c = relNonNul(1, 9), b = relNonNul(1, 12), d = relNonNul(1, 12)
            if (a === c) continue
            return { enonce: `Résoudre : $${polynome([a, b])} = ${polynome([c, d])}$`, reponse: `x = ${fracDec(d - b, a - c)}` }
          }
        },
        () => { const a = ent(1, 20) * choix([1, -1]), b = relNonNul(1, 9); return { enonce: `Résoudre : $\\dfrac{${a}}{x} = ${b}$`, reponse: `x = ${fracDec(a, b)}` } },
        () => {
          const a = relNonNul(1, 9), b = relNonNul(1, 12), c = ent(-12, 12), s = choix(['<', '>', '\\leqslant', '\\geqslant'])
          const inv: Record<string, string> = { '<': '>', '>': '<', '\\leqslant': '\\geqslant', '\\geqslant': '\\leqslant' }
          return { enonce: `Résoudre : $${polynome([a, b])} ${s} ${c}$`, reponse: `x ${a < 0 ? inv[s] : s} ${fracDec(c - b, a)}` }
        },
      ]
      return choix(sortes)()
    },
  },
  {
    id: '2nde-isoler', theme: T_CALCUL, titre: 'Isoler une variable dans une formule',
    programme: 'Isoler une variable dans une égalité qui en comporte plusieurs.',
    generer() {
      const formules: [string, string, string][] = [
        ['U = R \\times I', 'I', 'I = \\frac{U}{R}'], ['U = R \\times I', 'R', 'R = \\frac{U}{I}'],
        ['v = \\frac{d}{t}', 'd', 'd = v \\times t'], ['v = \\frac{d}{t}', 't', 't = \\frac{d}{v}'],
        ['P = U \\times I', 'U', 'U = \\frac{P}{I}'], ['\\rho = \\frac{m}{V}', 'V', 'V = \\frac{m}{\\rho}'], ['\\rho = \\frac{m}{V}', 'm', 'm = \\rho \\times V'],
        ['E_c = \\frac{1}{2} m v^2', 'm', 'm = \\frac{2E_c}{v^2}'], ['P = 2(L + \\ell)', 'L', 'L = \\frac{P}{2} - \\ell'], ['C = \\frac{n}{V}', 'n', 'n = C \\times V'],
        ['P = m \\times g', 'g', 'g = \\frac{P}{m}'], ['\\mathcal{A} = \\pi r^2', 'r', 'r = \\sqrt{\\frac{\\mathcal{A}}{\\pi}}'],
      ]
      if (Math.random() < 0.4) {
        const a = ent(2, 9), b = relNonNul(1, 9), c = ent(1, 20)
        return { enonce: `Exprimer $y$ en fonction de $x$ : $${polynome([b, 0])} + ${a}y = ${c}$`, reponse: `y = \\frac{${c} ${b < 0 ? '+' : '-'} ${Math.abs(b) === 1 ? '' : Math.abs(b)}x}{${a}}` }
      }
      const [f, v, r] = choix(formules)
      return { enonce: `Dans la formule $${f}$, exprimer $${v}$ en fonction des autres grandeurs.`, reponse: r }
    },
  },
  {
    id: '2nde-application-numerique', theme: T_CALCUL, titre: 'Application numérique d’une formule',
    programme: 'Effectuer une application numérique d’une formule.',
    generer() {
      return choix<() => Question>([
        () => { const v = ent(2, 12) * 10, t = choix([0.5, 1.5, 2, 2.5, 3]); return { enonce: `Avec $v = \\frac{d}{t}$, calculer $v$ pour $d = ${unite(nb(v * t), 'km')}$ et $t = ${unite(nb(t), 'h')}$.`, reponse: `${nb(v)}\\text{ km/h}` } },
        () => { const R = ent(2, 50) * 10, I = choix([0.1, 0.2, 0.5, 0.05, 2]); return { enonce: `Avec $U = R \\times I$, calculer $U$ pour $R = ${nb(R)}\\ \\Omega$ et $I = ${unite(nb(I), 'A')}$.`, reponse: unite(nb(R * I), 'V') } },
        () => { const m = ent(1, 6) * 2, v = ent(2, 10); return { enonce: `Avec $E_c = \\frac{1}{2} m v^2$, calculer $E_c$ pour $m = ${unite(nb(m), 'kg')}$ et $v = ${nb(v)}\\text{ m/s}$.`, reponse: unite(nb(m * v * v / 2), 'J') } },
        () => { const C = choix([-10, 0, 10, 20, 25, 30, 35, 40, 100]); return { enonce: `Avec $F = 1{,}8 \\times C + 32$, calculer $F$ pour $C = ${nb(C)}$.`, reponse: nb(1.8 * C + 32) } },
        () => { const r = ent(2, 30) / 10, V = choix([2, 5, 10, 20]); return { enonce: `Avec $\\rho = \\frac{m}{V}$, calculer $\\rho$ pour $m = ${unite(nb(r * V), 'g')}$ et $V = ${nb(V)}\\text{ cm}^3$.`, reponse: `${nb(r)}\\text{ g/cm}^3` } },
        () => { const a = ent(2, 9), b = relNonNul(1, 9), x = relNonNul(1, 5); return { enonce: `Calculer $${polynome([a, 0, b])}$ pour $x = ${nb(x)}$.`, reponse: nb(a * x * x + b) } },
      ])()
    },
  },
  // ================= PROPORTIONS ET POURCENTAGES =================
  {
    id: '2nde-proportion', theme: T_PROPORTIONS, titre: 'Calculer et écrire une proportion',
    programme: 'Calculer, appliquer, exprimer une proportion sous différentes formes (décimale, fractionnaire, pourcentage).',
    generer() {
      const { lieu, gens, N, p, n } = populationEtPart([5, 10, 15, 20, 25, 30, 35, 40, 45, 60, 75])
      const debut = `Dans ${lieu} de $${grandNb(N)}$ ${gens}, $${grandNb(n)}$ ${choix(CARACTERES)}.`
      return choix([
        { enonce: `${debut} Quelle proportion cela représente-t-il, en pourcentage ?`, reponse: pct(p) },
        { enonce: `${debut} Quelle proportion cela représente-t-il, en écriture décimale ?`, reponse: nb(p / 100) },
        { enonce: `${debut} Quelle proportion cela représente-t-il, en fraction irréductible ?`, reponse: fracDec(n, N) },
      ])
    },
  },
  {
    id: '2nde-partie-tout', theme: T_PROPORTIONS, titre: 'Une partie connaissant le tout, le tout connaissant une partie',
    programme: 'Utiliser une proportion pour calculer une partie connaissant le tout, ou le tout connaissant une partie.',
    generer() {
      const { lieu, gens, N, p, n } = populationEtPart([5, 10, 15, 20, 25, 30, 40, 60, 75]), car = choix(CARACTERES)
      return Math.random() < 0.5
        ? { enonce: `Dans ${lieu} de $${grandNb(N)}$ ${gens}, $${pct(p)}$ ${car}. Combien sont-ils ?`, reponse: grandNb(n) }
        : { enonce: `Dans ${lieu}, $${grandNb(n)}$ ${gens} ${car}, soit $${pct(p)}$ des ${gens}. Combien y a-t-il de ${gens} en tout ?`, reponse: grandNb(N) }
    },
    trou() {
      const p = choix([10, 20, 25, 40, 50]), N = 20 * ent(2, 20)
      return unTrou('', [[`$${pct(p)} \\text{ de } ${N} = \\ldots$`, nb(N * p / 100)], [`$${pct(p)} \\text{ de } \\ldots = ${nb(N * p / 100)}$`, nb(N)], [`$\\ldots\\,\\% \\text{ de } ${N} = ${nb(N * p / 100)}$`, nb(p)]])
    },
  },
  // ================= ÉVOLUTIONS ET VARIATIONS =================
  {
    id: '2nde-coefficient-multiplicateur', theme: T_EVOLUTIONS, titre: 'Formulation additive et multiplicative',
    programme: 'Passer d’une formulation additive (« augmenter de 5 % ») à une formulation multiplicative (« multiplier par 1,05 »).',
    generer() {
      const t = choix([1, 2, 3, 4, 5, 7, 8, 10, 12, 15, 20, 25, 30, 40, 50, 60, 100, 150])
      const [quoi, le, il] = choix([['un prix', 'le', 'il'], ['une population', 'la', 'elle'], ['un salaire', 'le', 'il'], ['une quantité', 'la', 'elle']])
      const baisse = t < 100 && Math.random() < 0.5, c = baisse ? 1 - t / 100 : 1 + t / 100
      return Math.random() < 0.5
        ? { enonce: `Par quel nombre multiplie-t-on ${quoi} pour ${baisse ? `${le} diminuer` : 'l\'augmenter'} de $${pct(t)}$ ?`, reponse: nb(c) }
        : { enonce: `On multiplie ${quoi} par $${nb(c)}$. De quel pourcentage évolue-t-${il} ?`, reponse: mot(`${baisse ? 'une baisse' : 'une hausse'} de $${pct(t)}$`) }
    },
    trou() {
      const t = choix([2, 3, 5, 8, 12, 15, 20, 35]), baisse = Math.random() < 0.5
      return unTrou('', [[`${baisse ? 'diminuer' : 'augmenter'} de $${pct(t)}$, c'est multiplier par $\\ldots$`, nb(baisse ? 1 - t / 100 : 1 + t / 100)], [`multiplier par $${nb(baisse ? 1 - t / 100 : 1 + t / 100)}$, c'est ${baisse ? 'diminuer' : 'augmenter'} de $\\ldots\\,\\%$`, nb(t)]])
    },
  },
  // ================= FONCTIONS ET REPRÉSENTATIONS =================
  {
    id: '2nde-image-antecedent', theme: T_FONCTIONS, titre: 'Lire graphiquement images et antécédents',
    programme: 'Déterminer graphiquement des images et des antécédents.',
    generer() {
      for (;;) {
        const p = noeudsAuHasard(), f = choix(NOMS_FONCTIONS), figure = F.courbeFonction(p, f)
        if (Math.random() < 0.45) {
          const q = choix(p)
          return { enonce: `Voici la courbe de la fonction $${f}$. Lire l'image de $${nb(q.x)}$ par $${f}$.`, figure, reponse: nb(q.y) }
        }
        const ks = [...new Set(p.map(q => q.y))].filter(k => lisibleEn(p, k))
        if (!ks.length) continue
        const k = choix(ks), xs = p.filter(q => q.y === k).map(q => nb(q.x))
        return { enonce: `Voici la courbe de la fonction $${f}$. Lire le ou les antécédents de $${nb(k)}$ par $${f}$.`, figure, reponse: mot(etL(xs.map(x => `$${x}$`))) }
      }
    },
  },
  {
    id: '2nde-equation-courbe', theme: T_FONCTIONS, titre: 'Exploiter l’équation d’une courbe',
    programme: 'Exploiter une équation de courbe (appartenance d’un point, calcul de coordonnées).',
    generer() {
      const P = pt(), a = relNonNul(1, 4), b = relNonNul(1, 9), x = relNonNul(1, 4)
      return choix<() => Question>([
        () => ({ enonce: `Le point $${P}$ d'abscisse $${nb(x)}$ est sur la courbe d'équation $y = ${polynome([a, 0, b])}$. Quelle est son ordonnée ?`, reponse: nb(a * x * x + b) }),
        () => ({ enonce: `Le point $${P}$ d'abscisse $${nb(x)}$ est sur la courbe d'équation $y = ${polynome([1, 0, 0, b])}$. Quelle est son ordonnée ?`, reponse: nb(x ** 3 + b) }),
        () => { const k = ent(-6, 6); return { enonce: `Le point $${P}(a\\,;\\,${nb(a * k + b)})$ est sur la droite d'équation $y = ${polynome([a, b])}$. Que vaut $a$ ?`, reponse: nb(k) } },
        () => { const k = choix([1, 2, 3, 4, 6, 12]) * choix([1, -1]); return { enonce: `Le point $${P}(${nb(k)}\\,;\\,b)$ est sur la courbe d'équation $y = \\dfrac{12}{x}$. Que vaut $b$ ?`, reponse: nb(12 / k) } },
      ])()
    },
  },
  {
    id: '2nde-lineaire-affine', theme: T_FONCTIONS, titre: 'Reconnaître une fonction linéaire, affine',
    programme: 'Reconnaître l’expression d’une fonction linéaire, d’une fonction affine.',
    generer() {
      const sortes: [string, () => string][] = [
        ['lineaire', () => polynome([relNonNul(1, 9), 0])], ['lineaire', () => `\\frac{x}{${ent(2, 9)}}`],
        ['affine', () => polynome([relNonNul(1, 9), relNonNul(1, 9)])],
        ['affine', () => { const m = relNonNul(1, 9); return `${nb(relNonNul(1, 9))} ${m < 0 ? '-' : '+'} ${Math.abs(m) === 1 ? '' : Math.abs(m)}x` }],
        ['constante', () => nb(relNonNul(1, 9))],
        ['autre', () => polynome([relNonNul(1, 3), 0, relNonNul(0, 9)])], ['autre', () => `\\frac{${ent(1, 9)}}{x}`], ['autre', () => `\\sqrt{x}`], ['autre', () => `x^3 ${choix(['+', '-'])} ${ent(1, 9)}`],
      ]
      for (;;) {
        const choisies = melange(sortes).slice(0, 4), noms = ['f', 'g', 'h', 'k']
        const quoi = choix(['affines', 'linéaires'])
        const oui = choisies.map(([s], i) => (quoi === 'linéaires' ? s === 'lineaire' : s !== 'autre') ? noms[i] : '').filter(Boolean)
        if (!oui.length || oui.length === 4) continue
        const liste = choisies.map(([, e], i) => `$${noms[i]}(x) = ${e()}$`)
        return { enonce: `Parmi les fonctions ${etL(liste)}, lesquelles sont ${quoi} ?`, reponse: mot(etL(oui.map(n => `$${n}$`)) + (oui.length === 1 ? ' seulement' : '')) }
      }
    },
  },
  // ================= STATISTIQUES =================
  {
    id: '2nde-diagramme-barres', theme: T_STATS, titre: 'Lire un diagramme en barres',
    programme: 'Lire et commenter des graphiques usuels : diagramme en barres.',
    generer() {
      const [etiquettes, question] = choix<[string[], (e: string) => string]>([
        [['8', '10', '12', '14', '16'], e => `combien d'élèves ont eu la note $${e}$`],
        [['0', '1', '2', '3', '4'], e => `combien de familles ont $${e}$ enfant${e === '0' || e === '1' ? '' : 's'}`],
        [['Foot', 'Judo', 'Danse', 'Tennis', 'Rugby'], e => `combien d'élèves pratiquent ${{ Foot: 'le foot', Judo: 'le judo', Danse: 'la danse', Tennis: 'le tennis', Rugby: 'le rugby' }[e]}`],
      ])
      const n = ent(4, 5), et = etiquettes.slice(0, n), pas = choix([1, 2, 5]), v = et.map(() => pas * ent(1, 8))
      const i = ent(0, n - 1), figure = F.diagrammeBarres(et, v, pas)
      return Math.random() < 0.6
        ? { enonce: `D'après ce diagramme en barres, ${question(et[i])} ?`, figure, reponse: nb(v[i]) }
        : { enonce: 'D\'après ce diagramme en barres, quel est l\'effectif total ?', figure, reponse: nb(v.reduce((s2, x) => s2 + x, 0)) }
    },
  },
  {
    id: '2nde-diagramme-circulaire', theme: T_STATS, titre: 'Lire un diagramme circulaire ou semi-circulaire',
    programme: 'Lire et commenter des graphiques usuels : diagramme circulaire, semi-circulaire.',
    generer() {
      for (;;) {
        const noms = melange(['Bus', 'Vélo', 'À pied', 'Voiture', 'Train']).slice(0, ent(3, 4)), demi = Math.random() < 0.4
        const ps = noms.map(() => 5 * ent(2, 8)), reste = 100 - ps.slice(0, -1).reduce((s, x) => s + x, 0)
        if (reste < 10 || reste > 60) continue
        ps[ps.length - 1] = reste
        const k = demi ? 1.8 : 3.6, parts = noms.map((nm, i) => ({ nom: nm, angle: arrondi(ps[i] * k) }))
        const i = ent(0, noms.length - 1), N = 20 * ent(2, 15), figure = F.diagrammeCirculaire(parts, demi)
        const mode = noms[i] === 'À pied' ? 'à pied' : noms[i] === 'Vélo' ? 'à vélo' : `en ${noms[i].toLowerCase()}`
        return Math.random() < 0.5
          ? { enonce: `Ce diagramme ${demi ? 'semi-circulaire' : 'circulaire'} montre comment des élèves viennent au lycée. Quel pourcentage d'entre eux vient ${mode} ?`, figure, reponse: pct(ps[i]) }
          : { enonce: `Ce diagramme ${demi ? 'semi-circulaire' : 'circulaire'} montre comment $${N}$ élèves viennent au lycée. Combien viennent ${mode} ?`, figure, reponse: nb(N * ps[i] / 100) }
      }
    },
  },
  {
    id: '2nde-courbe-nuage', theme: T_STATS, titre: 'Lire une courbe ou un nuage de points',
    programme: 'Lire et commenter des graphiques usuels : courbe, nuage de points.',
    generer() {
      const [quoi, debut, pasY] = choix<[string, number, number]>([['la température (en °C) relevée chaque heure à partir de $8$ h', 8, 2], ['la taille (en cm) d\'une plante, jour après jour à partir du jour $1$', 1, 1], ['le nombre de visiteurs (en centaines) d\'un musée chaque mois à partir du mois $1$', 1, 1]])
      const n = ent(6, 8), v: number[] = []
      for (let i = 0; i < n; i++) v.push(pasY * Math.max(1, Math.min(10, (i ? v[i - 1] / pasY : ent(2, 5)) + choix([-2, -1, 1, 1, 2]))))
      const nuage = Math.random() < 0.3, figure = F.courbeDonnees(v, pasY, debut, 1, nuage), i = ent(0, n - 1)
      const max = Math.max(...v), ou = v.map((x, j) => x === max ? debut + j : null).filter(x => x !== null) as number[]
      return Math.random() < 0.6 || ou.length > 1
        ? { enonce: `Ce ${nuage ? 'nuage de points' : 'graphique'} donne ${quoi}. Quelle valeur lit-on pour $${debut + i}$ en abscisse ?`, figure, reponse: nb(v[i]) }
        : { enonce: `Ce ${nuage ? 'nuage de points' : 'graphique'} donne ${quoi}. Pour quelle abscisse la valeur est-elle la plus grande ?`, figure, reponse: nb(ou[0]) }
    },
  },
  {
    id: '2nde-indicateurs', theme: T_STATS, titre: 'Moyenne, médiane, quartiles',
    programme: 'Calculer et interpréter des indicateurs statistiques (moyenne, médiane, quartiles).',
    generer() {
      return choix<() => Question>([
        () => { for (;;) { const m = ent(8, 15), v = Array.from({ length: 4 }, () => ent(4, 19)), d = 5 * m - v.reduce((s, x) => s + x, 0); if (d < 0 || d > 20) continue; const t = melange([...v, d]); return { enonce: `Calculer la moyenne de la série : $${t.join('\\,;\\,')}$`, reponse: nb(m) } } },
        () => { const n = ent(5, 8), v = Array.from({ length: n }, () => ent(2, 20)), s = [...v].sort((a, b) => a - b), med = n % 2 ? s[(n - 1) / 2] : (s[n / 2 - 1] + s[n / 2]) / 2; return { enonce: `Donner la médiane de la série : $${v.join('\\,;\\,')}$`, reponse: nb(med) } },
        () => {
          const n = ent(8, 12), v = Array.from({ length: n }, () => ent(2, 20)), s = [...v].sort((a, b) => a - b), q = choix([1, 3])
          return { enonce: `Donner le ${q === 1 ? 'premier' : 'troisième'} quartile de la série : $${v.join('\\,;\\,')}$`, reponse: nb(s[Math.ceil(q * n / 4) - 1]) }
        },
        () => {
          const vals = melange([8, 9, 10, 11, 12, 13, 14, 15, 16]).slice(0, 4).sort((a, b) => a - b), tot = choix([10, 20])
          for (;;) { const e = vals.slice(0, 3).map(() => ent(1, tot / 2 - 1)), r = tot - e.reduce((s, x) => s + x, 0); if (r < 1) continue; e.push(r); return { enonce: `Calculer la moyenne de la série : $${tableau(['\\text{Valeur}', ...vals.map(String)], ['\\text{Effectif}', ...e.map(String)])}$`, reponse: nb(vals.reduce((s, x, i) => s + x * e[i], 0) / tot) } }
        },
        () => {
          const a = choix([0, 10, 20]), l = choix([10, 20]), e = [ent(1, 5), ent(1, 5), 0]; e[2] = 10 - e[0] - e[1]
          if (e[2] < 1) { e[0] = 3; e[1] = 4; e[2] = 3 }
          const classes = [0, 1, 2].map(i => `[${a + i * l}\\,;\\,${a + (i + 1) * l}[`)
          return { enonce: `Calculer la moyenne de la série (en prenant le centre de chaque classe) : $${tableau(['\\text{Classe}', ...classes], ['\\text{Effectif}', ...e.map(String)])}$`, reponse: nb(e.reduce((s, x, i) => s + x * (a + i * l + l / 2), 0) / 10) }
        },
      ])()
    },
  },
  {
    id: '2nde-boites', theme: T_STATS, titre: 'Lire et comparer des boîtes à moustaches',
    programme: 'Comparer des distributions à l’aide de boîtes à moustaches.',
    generer() {
      const pas = choix([1, 2, 5]), boite = (): [number, number, number, number, number] => {
        const v = melange(Array.from({ length: 14 }, (_, i) => i + 1)).slice(0, 5).sort((a, b) => a - b)
        return v.map(x => x * pas) as [number, number, number, number, number]
      }
      const deux = Math.random() < 0.5, A = boite(), B = boite(), figure = F.boitesMoustaches(deux ? [{ nom: 'A', v: A }, { nom: 'B', v: B }] : [{ nom: 'A', v: A }], 0, 15 * pas, pas)
      const S = deux && Math.random() < 0.5 ? 'B' : 'A', s = S === 'A' ? A : B
      const [, q1, me, q3] = s, [X, pourc] = choix<[number, number]>([[q1, 75], [me, 50], [q3, 25]])
      return choix<Question>([
        { enonce: `Lire la médiane de la série ${S}.`, figure, reponse: nb(me) },
        { enonce: `Quel est l'écart interquartile de la série ${S} ?`, figure, reponse: nb(q3 - q1) },
        { enonce: `Quelle est l'étendue de la série ${S} ?`, figure, reponse: nb(s[4] - s[0]) },
        { enonce: `Au moins quel pourcentage des valeurs de la série ${S} est supérieur ou égal à $${nb(X)}$ ?`, figure, reponse: pct(pourc) },
        ...(deux ? [{ enonce: 'De combien la médiane de la série B dépasse-t-elle celle de la série A (une réponse négative est possible) ?', figure, reponse: nb(B[2] - A[2]) }] : []),
      ])
    },
  },
  // ================= PROBABILITÉS =================
  {
    id: '2nde-proba-0-1', theme: T_PROBAS, titre: 'Une probabilité est un nombre entre 0 et 1',
    programme: 'Savoir qu’une probabilité est un nombre entre 0 et 1.',
    generer() {
      for (;;) {
        const candidats: [string, boolean][] = melange<[string, boolean]>([
          [nb(ent(1, 99) / 100), true], [nb(ent(101, 150) / 100), false], [nb(-ent(1, 9) / 10), false], [frac(ent(1, 6), 7), true], [frac(ent(8, 12), 7), false],
          [`${ent(2, 9) * 10}\\,\\%`, true], ['0', true], ['1', true], [`${ent(11, 15) * 10}\\,\\%`, false],
        ]).slice(0, 5)
        const oui = candidats.filter(c => c[1]).map(c => `$${c[0]}$`)
        if (!oui.length || oui.length === 5) continue
        return { enonce: `Parmi les nombres ${etL(candidats.map(c => `$${c[0]}$`))}, lesquels peuvent être des probabilités ?`, reponse: mot(etL(oui)) }
      }
    },
  },
  {
    id: '2nde-proba-contraire', theme: T_PROBAS, titre: 'La probabilité de l’évènement contraire',
    programme: 'Savoir calculer la probabilité de l’événement contraire.',
    generer() {
      const E = choix(['A', 'B', 'E', 'R', 'G'])
      return Math.random() < 0.6
        ? (() => { const p = ent(1, 99) / 100; return { enonce: `On sait que $P(${E}) = ${nb(p)}$. Calculer $P(\\overline{${E}})$.`, reponse: nb(1 - p) } })()
        : (() => { const d = ent(3, 12), n = ent(1, d - 1); return { enonce: `On sait que $P(${E}) = ${frac(n, d)}$. Calculer $P(\\overline{${E}})$.`, reponse: frac(d - n, d) } })()
    },
    trou() {
      const p = ent(1, 99) / 100, E = choix(['A', 'B', 'E'])
      return unTrou('', [[`$P(${E}) = ${nb(p)}$ donc $P(\\overline{${E}}) = \\ldots$`, nb(1 - p)], [`$P(\\overline{${E}}) = ${nb(1 - p)}$ donc $P(${E}) = \\ldots$`, nb(p)]])
    },
  },
  {
    id: '2nde-proba-somme', theme: T_PROBAS, titre: 'Probabilité d’un évènement : somme des issues',
    programme: 'Calculer la probabilité d’un événement comme somme des probabilités des issues qui le composent.',
    generer() {
      for (;;) {
        const p = Array.from({ length: 6 }, () => ent(5, 30) / 100), s = p.slice(0, 5).reduce((a, b) => a + b, 0)
        p[5] = arrondi(1 - s)
        if (p[5] < 0.05) continue
        const t = tableau(['\\text{Issue}', '1', '2', '3', '4', '5', '6'], ['P', ...p.map(nb)])
        return choix<() => Question>([
          () => ({ enonce: `Un dé est truqué : $${t}$. Quelle est la probabilité d'obtenir un nombre pair ?`, reponse: nb(arrondi(p[1] + p[3] + p[5])) }),
          () => { const k = ent(3, 5); return { enonce: `Un dé est truqué : $${t}$. Quelle est la probabilité d'obtenir au moins $${k}$ ?`, reponse: nb(arrondi(p.slice(k - 1).reduce((a, b) => a + b, 0))) } },
          () => ({ enonce: `Un dé est truqué : $${tableau(['\\text{Issue}', '1', '2', '3', '4', '5', '6'], ['P', ...p.slice(0, 5).map(nb), '\\ldots'])}$. Quelle est la probabilité d'obtenir $6$ ?`, reponse: nb(p[5]) }),
        ])()
      }
    },
  },
  {
    id: '2nde-equiprobabilite', theme: T_PROBAS, titre: 'Équiprobabilité : favorables sur possibles',
    programme: 'Utiliser la relation P(A) = Card(A)/Card(Ω) dans le cas de l’équiprobabilité.',
    generer() {
      return choix<() => Question>([
        () => { const r = ent(1, 9), b = ent(1, 9), v = ent(1, 9), [c, nc] = choix<[string, number]>([['rouge', r], ['bleue', b], ['verte', v]]); return { enonce: `Une urne contient $${r}$ boules rouges, $${b}$ bleues et $${v}$ vertes, indiscernables au toucher. On en tire une au hasard. Quelle est la probabilité qu'elle soit ${c} ?`, reponse: fracDec(nc, r + b + v) } },
        () => { const [quoi, k] = choix<[string, number]>([['un cœur', 8], ['un roi', 4], ['une figure (valet, dame ou roi)', 12], ['une carte rouge', 16], ['l\'as de pique', 1], ['un as ou un roi', 8]]); return { enonce: `On tire une carte au hasard dans un jeu de $32$ cartes. Quelle est la probabilité d'obtenir ${quoi} ?`, reponse: fracDec(k, 32) } },
        () => { const n = choix([6, 8, 10, 12, 20]), d = choix([2, 3, 4, 5]); const k = Math.floor(n / d); return { enonce: `On lance un dé équilibré à $${n}$ faces numérotées de $1$ à $${n}$. Quelle est la probabilité d'obtenir un multiple de $${d}$ ?`, reponse: fracDec(k, n) } },
      ])()
    },
  },
]

// =============================================================
// LES AUTOMATISMES DE 1re (en romain dans la liste officielle)
// =============================================================
export const AUTOMATISMES_1RE: Automatisme[] = [
  // ================= CALCUL NUMÉRIQUE ET ALGÉBRIQUE =================
  {
    id: '1re-produit-nul', theme: T_CALCUL, titre: 'Résoudre une équation produit nul',
    programme: 'Déterminer les solutions d’une équation produit nul.',
    generer() {
      for (;;) {
        const a = ent(1, 5), b = relNonNul(1, 9), c = ent(1, 5), d = relNonNul(1, 9)
        const r1 = -b / a, r2 = -d / c
        if (r1 === r2) continue
        const sol = [[r1, fracDec(-b, a)], [r2, fracDec(-d, c)]].sort((x, y) => (x[0] as number) - (y[0] as number)).map(x => x[1] as string)
        if (Math.random() < 0.3) return { enonce: `Résoudre : $x${facteur(a, b)} = 0$`, reponse: ensemble([[0, '0'], [r1, fracDec(-b, a)]].sort((x, y) => (x[0] as number) - (y[0] as number)).map(x => x[1] as string)) }
        return { enonce: `Résoudre : $${facteur(a, b)}${facteur(c, d)} = 0$`, reponse: ensemble(sol) }
      }
    },
  },
  {
    id: '1re-signe-affine', theme: T_CALCUL, titre: 'Signe d’une expression du premier degré',
    programme: 'Déterminer le signe d’une expression du premier degré.',
    generer() {
      const a = relNonNul(1, 6), r = ent(-6, 6), b = -a * r, s = choix(['>', '<', '\\geqslant', '\\leqslant'])
      // ax + b > 0 : x > r si a > 0
      const droite = (s === '>' || s === '\\geqslant') === a > 0, ferme = s === '\\geqslant' || s === '\\leqslant'
      const rep = droite ? intervalle(nb(r), '+\\infty', ferme, false) : intervalle('-\\infty', nb(r), false, ferme)
      const mots: Record<string, string> = { '>': 'strictement positive', '<': 'strictement négative', '\\geqslant': 'positive ou nulle', '\\leqslant': 'négative ou nulle' }
      return Math.random() < 0.5
        ? { enonce: `Sur quel intervalle l'expression $${polynome([a, b])}$ est-elle ${mots[s]} ?`, reponse: rep }
        : { enonce: `Résoudre : $${polynome([a, b])} ${s} 0$`, reponse: `S = ${rep}` }
    },
  },
  {
    id: '1re-signe-produit', theme: T_CALCUL, titre: 'Signe d’une expression factorisée du second degré',
    programme: 'Déterminer le signe d’une expression factorisée du second degré.',
    generer() {
      for (;;) {
        const a = ent(-6, 6), b = ent(-6, 6)
        if (a >= b) continue
        const k = choix([1, 1, -1]), s = choix(['>', '<', '\\geqslant', '\\leqslant'])
        // k(x − a)(x − b) : du signe de k à l'extérieur des racines
        const exterieur = (s === '>' || s === '\\geqslant') === k > 0, ferme = s === '\\geqslant' || s === '\\leqslant'
        const rep = exterieur ? `${intervalle('-\\infty', nb(a), false, ferme)} \\cup ${intervalle(nb(b), '+\\infty', ferme, false)}` : intervalle(nb(a), nb(b), ferme, ferme)
        const f1 = k > 0 ? facteur(1, -a) : facteur(-1, a), f2 = facteur(1, -b)
        return { enonce: `Résoudre : $${melange([f1, f2]).join('')} ${s} 0$`, reponse: `S = ${rep}` }
      }
    },
  },
  {
    id: '1re-developper-reduire', theme: T_CALCUL, titre: 'Développer, factoriser, réduire',
    programme: 'Développer, factoriser, réduire une expression algébrique simple.',
    generer() {
      const a = ent(1, 5), b = relNonNul(1, 9), c = ent(1, 5), d = relNonNul(1, 9)
      return choix<() => Question>([
        () => ({ enonce: `Développer et réduire : $${facteur(a, b)}${facteur(c, d)}$`, reponse: polynome([a * c, a * d + b * c, b * d]) }),
        () => { const e = relNonNul(1, 5), g = relNonNul(1, 9); return { enonce: `Réduire : $${polynome([a, b, d])} ${e < 0 ? '-' : '+'} ${polynome([Math.abs(e), 0, 0])} ${g < 0 ? '-' : '+'} ${polynome([Math.abs(g), 0])}$`, reponse: polynome([a + e, b + g, d]) } },
        () => {
          for (;;) {
            const r = relNonNul(1, 6), p = ent(1, 4), q = relNonNul(1, 6), m = ent(1, 4), n = relNonNul(1, 6)
            if (p + m === 0 || pgcd(p + m, q + n) !== 1 && q + n !== 0) continue
            return { enonce: `Factoriser : $${facteur(1, r)}${facteur(p, q)} + ${facteur(1, r)}${facteur(m, n)}$`, reponse: `${facteur(1, r)}${facteur(p + m, q + n)}` }
          }
        },
      ])()
    },
    trou() {
      const a = ent(2, 5), b = relNonNul(1, 9), c = relNonNul(1, 9)
      return unTrou('', [[`$${facteur(a, b)}${facteur(1, c)} = ${a}x^2 + \\ldots x ${b * c < 0 ? '-' : '+'} ${Math.abs(b * c)}$`, nb(a * c + b)], [`$${facteur(a, b)}${facteur(1, c)} = ${polynome([a, a * c + b, 0])} + \\ldots$`, nb(b * c)]])
    },
  },
  // ================= ÉVOLUTIONS ET VARIATIONS =================
  {
    id: '1re-appliquer-taux', theme: T_EVOLUTIONS, titre: 'Appliquer un taux : valeur finale ou initiale',
    programme: 'Appliquer un taux d’évolution pour calculer une valeur finale ou initiale.',
    generer() {
      const t = choix([5, 10, 15, 20, 25, 30, 40, 50]), baisse = Math.random() < 0.5, V0 = 20 * ent(2, 20), c = baisse ? 1 - t / 100 : 1 + t / 100, V1 = arrondi(V0 * c)
      const [quoi, u] = choix<[string, string]>([['Un prix', '€'], ['Un loyer', '€'], ['Une population', 'habitants']])
      return Math.random() < 0.5
        ? { enonce: `${quoi} de $${grandNb(V0)}$ ${u} ${baisse ? 'baisse' : 'augmente'} de $${pct(t)}$. Quelle est sa nouvelle valeur ?`, reponse: mot(`$${grandNb(V1)}$ ${u}`) }
        : { enonce: `Après ${baisse ? 'une baisse' : 'une hausse'} de $${pct(t)}$, ${quoi.toLowerCase()} vaut $${grandNb(V1)}$ ${u}. Quelle était sa valeur initiale ?`, reponse: mot(`$${grandNb(V0)}$ ${u}`) }
    },
  },
  {
    id: '1re-calculer-taux', theme: T_EVOLUTIONS, titre: 'Calculer un taux d’évolution',
    programme: 'Calculer un taux d’évolution, l’exprimer en pourcentage.',
    generer() {
      const t = choix([-50, -40, -25, -20, -10, -5, 5, 10, 15, 20, 25, 30, 50, 75, 100, 150]), V0 = 20 * ent(1, 25), V1 = arrondi(V0 * (1 + t / 100))
      const quoi = choix(['Un prix passe', 'Le nombre d\'abonnés passe', 'Une production passe'])
      return { enonce: `${quoi} de $${grandNb(V0)}$ à $${grandNb(V1)}$. Quel est le taux d'évolution, en pourcentage ?`, reponse: t > 0 ? `+${pct(t)}` : `-${pct(-t)}` }
    },
  },
  {
    id: '1re-taux-successifs', theme: T_EVOLUTIONS, titre: 'Évolutions successives',
    programme: 'Calculer le taux d’évolution équivalent à plusieurs évolutions successives.',
    generer() {
      const t1 = choix([-50, -20, -10, 10, 20, 25, 50, 100]), t2 = choix([-50, -20, -10, 10, 20, 30, 50])
      const g = arrondi(((1 + t1 / 100) * (1 + t2 / 100) - 1) * 100)
      const dire = (t: number) => t > 0 ? `une hausse de $${pct(t)}$` : `une baisse de $${pct(-t)}$`
      return { enonce: `${choix(['Un prix', 'Une action', 'Un loyer'])} connaît ${dire(t1)}, puis ${dire(t2)}. Quelle est l'évolution globale, en pourcentage ?`, reponse: g === 0 ? mot('aucune : $0\\,\\%$') : mot(dire(g)) }
    },
  },
  {
    id: '1re-taux-reciproque', theme: T_EVOLUTIONS, titre: 'Taux d’évolution réciproque',
    programme: 'Calculer un taux d’évolution réciproque.',
    generer() {
      const [t, r] = choix<[number, number]>([[25, -20], [100, -50], [60, -37.5], [150, -60], [300, -75], [-20, 25], [-50, 100], [-60, 150], [-75, 300], [-37.5, 60], [-80, 400], [400, -80]])
      const quoi = choix(['un prix', 'une population', 'un tarif'])
      const dire = (x: number) => x > 0 ? `une hausse de $${pct(x)}$` : `une baisse de $${pct(-x)}$`
      return { enonce: `Après ${dire(t)}, quelle évolution ramène ${quoi} à sa valeur de départ ?`, reponse: mot(dire(r)) }
    },
  },
  // ================= FONCTIONS ET REPRÉSENTATIONS =================
  {
    id: '1re-resoudre-graphique', theme: T_FONCTIONS, titre: 'Résoudre graphiquement f(x) = k, f(x) < k…',
    programme: 'Résoudre graphiquement une équation, une inéquation du type f(x) = k, f(x) < k.',
    generer() {
      for (;;) {
        const p = noeudsAuHasard(), f = choix(NOMS_FONCTIONS)
        const ks = [...new Set(p.map(q => q.y))].filter(k => lisibleEn(p, k) && k !== p[0].y && k !== p[p.length - 1].y)
        if (!ks.length) continue
        const k = choix(ks), s = choix(['=', '<', '>', '\\leqslant', '\\geqslant'])
        const vrai = (y: number) => s === '=' ? y === k : s === '<' ? y < k : s === '>' ? y > k : s === '\\leqslant' ? y <= k : y >= k
        return { enonce: `Voici la courbe de la fonction $${f}$, définie sur $${intervalle(nb(p[0].x), nb(p[p.length - 1].x), true, true)}$. Résoudre graphiquement $${f}(x) ${s} ${nb(k)}$.`, figure: F.courbeFonction(p, f), reponse: s === '=' ? ensemble(p.filter(q => q.y === k).map(q => nb(q.x))) : ensembleLu(p, vrai) }
      }
    },
  },
  {
    id: '1re-signe-variations', theme: T_FONCTIONS, titre: 'Signe et variations lus sur une courbe',
    programme: 'Déterminer graphiquement le signe d’une fonction ou son tableau de variations.',
    generer() {
      for (;;) {
        const p = noeudsAuHasard(), f = choix(NOMS_FONCTIONS), figure = F.courbeFonction(p, f)
        const dom = `$${intervalle(nb(p[0].x), nb(p[p.length - 1].x), true, true)}$`
        const sorte = choix(['signe', 'croissante', 'decroissante', 'max', 'min'])
        if (sorte === 'signe') {
          if (!lisibleEn(p, 0) || !p.some(q => q.y > 0) || !p.some(q => q.y < 0)) continue
          const pos = Math.random() < 0.5
          return { enonce: `Voici la courbe de la fonction $${f}$, définie sur ${dom}. Sur quel ensemble $${f}$ est-elle ${pos ? 'positive ou nulle' : 'strictement négative'} ?`, figure, reponse: ensembleLu(p, pos ? y => y >= 0 : y => y < 0) }
        }
        if (sorte === 'max' || sorte === 'min') {
          const ext = sorte === 'max' ? Math.max(...p.map(q => q.y)) : Math.min(...p.map(q => q.y)), ou = p.filter(q => q.y === ext)
          if (ou.length > 1) continue
          return { enonce: `Voici la courbe de la fonction $${f}$, définie sur ${dom}. Quel est le ${sorte === 'max' ? 'maximum' : 'minimum'} de $${f}$, et en quelle valeur est-il atteint ?`, figure, reponse: mot(`$${nb(ext)}$, atteint en $x = ${nb(ou[0].x)}$`) }
        }
        const iv = sensDeVariation(p, sorte === 'croissante')
        return { enonce: `Voici la courbe de la fonction $${f}$, définie sur ${dom}. Sur quel(s) intervalle(s) $${f}$ est-elle ${sorte === 'croissante' ? 'croissante' : 'décroissante'} ?`, figure, reponse: mot(etL(iv.map(x => `$${x}$`))) }
      }
    },
  },
  {
    id: '1re-tracer-droite', theme: T_FONCTIONS, titre: 'Tracer une droite : deux de ses points',
    programme: 'Tracer une droite donnée par son équation réduite ou par un point et son coefficient directeur.',
    generer() {
      const m = relNonNul(1, 4), p = ent(-5, 5)
      if (Math.random() < 0.5) {
        const x = choix([1, 2, -1, -2, 3])
        return { enonce: `Pour tracer la droite d'équation $y = ${polynome([m, p])}$, donner son point d'abscisse $0$ et son point d'abscisse $${x}$.`, reponse: mot(`$${coord(0, p)}$ et $${coord(x, m * x + p)}$`) }
      }
      const P = pt(), xa = ent(-4, 4), ya = ent(-4, 4), d = choix([1, 2])
      return { enonce: `Une droite passe par $${P}${coord(xa, ya)}$ et a pour coefficient directeur $${nb(m)}$. Donner les coordonnées de son point d'abscisse $${nb(xa + d)}$.`, reponse: coord(xa + d, ya + m * d) }
    },
  },
  {
    id: '1re-lire-equation', theme: T_FONCTIONS, titre: 'Lire l’équation réduite d’une droite',
    programme: 'Lire graphiquement l’équation réduite d’une droite.',
    generer() {
      for (;;) {
        const [n, d] = choix<[number, number]>([[1, 1], [2, 1], [3, 1], [-1, 1], [-2, 1], [-3, 1], [1, 2], [-1, 2], [3, 2], [-3, 2], [2, 3], [-2, 3], [1, 3], [-1, 3], [0, 1]])
        const p = ent(-3, 3)
        if (Math.abs(p + n) > 4) continue
        const [enLatex, dessin] = choix([['(d)', '(d)'], ['(D)', '(D)'], ['(\\Delta)', '(Δ)'], ['(d_1)', '(d₁)']])
        const mx = n === 0 ? '' : n === d ? 'x' : n === -d ? '-x' : `${frac(n, d)}x`
        const eq = n === 0 ? nb(p) : p === 0 ? mx : `${mx} ${p < 0 ? '-' : '+'} ${Math.abs(p)}`
        return { enonce: `Lire l'équation réduite de la droite $${enLatex}$.`, figure: F.droiteRepere(n / d, p, dessin), reponse: `y = ${eq}` }
      }
    },
  },
  {
    id: '1re-coefficient-directeur', theme: T_FONCTIONS, titre: 'Coefficient directeur à partir de deux points',
    programme: 'Déterminer le coefficient directeur d’une droite à partir des coordonnées de deux de ses points.',
    generer() {
      for (;;) {
        const [A, B] = pts(2), xa = ent(-6, 6), xb = ent(-6, 6), ya = ent(-8, 8), yb = ent(-8, 8)
        if (xa === xb) continue
        return { enonce: `Calculer le coefficient directeur de la droite $(${A}${B})$, avec $${A}${coord(xa, ya)}$ et $${B}${coord(xb, yb)}$.`, reponse: fracDec(yb - ya, xb - xa) }
      }
    },
  },
  // ================= STATISTIQUES =================
  {
    id: '1re-lire-echelle', theme: T_STATS, titre: 'Lire un graphique : origine, unités, échelles',
    programme: 'Lire un graphique (repérer l’origine du repère, les unités de graduations ou les échelles).',
    generer() {
      const [quoi, pasY] = choix<[string, number]>([
        ['le chiffre d\'affaires (en milliers d\'euros) d\'une entreprise', choix([0.5, 5, 10, 20])],
        ['le nombre d\'inscrits à un club', choix([5, 10, 20, 50])],
        ['la production (en tonnes) d\'une coopérative', choix([0.5, 2, 20, 50])],
      ])
      const an = ent(2015, 2019), n = ent(6, 7)
      const v: number[] = []
      for (let i = 0; i < n; i++) v.push(pasY * Math.max(1, Math.min(9, (i ? v[i - 1] / pasY : ent(2, 5)) + choix([-2, -1, 1, 1, 2]))))
      const figure = F.courbeDonnees(v, pasY, an, 1), i = ent(0, n - 1), j = ent(0, n - 1)
      return Math.random() < 0.55 || i === j
        ? { enonce: `Ce graphique donne ${quoi}, année après année. Quelle valeur lit-on en $${an + i}$ ?`, figure, reponse: nb(v[i]) }
        : { enonce: `Ce graphique donne ${quoi}, année après année. De combien la valeur a-t-elle changé entre $${an + Math.min(i, j)}$ et $${an + Math.max(i, j)}$ (une réponse négative est possible) ?`, figure, reponse: nb(arrondi(v[Math.max(i, j)] - v[Math.min(i, j)])) }
    },
  },
  {
    id: '1re-graphique-donnees', theme: T_STATS, titre: 'Passer du graphique aux données et inversement',
    programme: 'Passer du graphique aux données et vice-versa.',
    generer() {
      return choix<() => Question>([
        () => { const p = 5 * ent(1, 18); return { enonce: `Dans un diagramme circulaire, quel angle représente une part de $${pct(p)}$ ?`, reponse: deg(arrondi(p * 3.6)) } },
        () => { const p = 5 * ent(1, 18); return { enonce: `Dans un diagramme semi-circulaire, quel angle représente une part de $${pct(p)}$ ?`, reponse: deg(arrondi(p * 1.8)) } },
        () => { const a = 18 * ent(1, 15); return { enonce: `Dans un diagramme circulaire, un secteur mesure $${deg(a)}$. Quelle part, en pourcentage, représente-t-il ?`, reponse: pct(arrondi(a / 3.6)) } },
        () => { const k = choix([10, 20, 25, 50]), h = ent(2, 16) / 2; return { enonce: `Dans un diagramme en barres, $1$ cm de hauteur représente $${k}$ personnes. Quelle hauteur faut-il pour $${nb(h * k)}$ personnes ?`, reponse: unite(nb(h), 'cm') } },
      ])()
    },
  },
  {
    id: '1re-indicateurs', theme: T_STATS, titre: 'Calculer et interpréter des indicateurs',
    programme: 'Calculer et interpréter des indicateurs statistiques pour une série statistique.',
    generer() {
      return choix<() => Question>([
        () => { const m = ent(8, 15) + choix([0, 0.5]), k = ent(1, 4); return Math.random() < 0.5 ? { enonce: `La moyenne d'une série est $${nb(m)}$. On ajoute $${k}$ à chaque valeur. Quelle est la nouvelle moyenne ?`, reponse: nb(m + k) } : { enonce: `La moyenne d'une série est $${nb(m)}$. On multiplie chaque valeur par $${k + 1}$. Quelle est la nouvelle moyenne ?`, reponse: nb(m * (k + 1)) } },
        () => { for (;;) { const n1 = choix([10, 15, 20, 25]), n2 = choix([5, 10, 15, 20]), m1 = ent(8, 14), m2 = ent(8, 15), m = (n1 * m1 + n2 * m2) / (n1 + n2); if (m1 === m2 || Math.abs(m * 10 - Math.round(m * 10)) > 1e-9) continue; return { enonce: `Un groupe de $${n1}$ élèves a $${nb(m1)}$ de moyenne, un autre de $${n2}$ élèves a $${nb(m2)}$. Quelle est la moyenne des $${n1 + n2}$ élèves ?`, reponse: nb(m) } } },
        () => { for (;;) { const n = ent(4, 6), m = ent(9, 14), v = Array.from({ length: n - 1 }, () => ent(6, 18)), x = n * m - v.reduce((s, y) => s + y, 0); if (x < 0 || x > 20) continue; return { enonce: `La moyenne de $${n}$ notes est $${m}$. Les ${n - 1} premières sont $${v.join('\\,;\\,')}$. Quelle est la dernière ?`, reponse: nb(x) } } },
      ])()
    },
  },
  // ================= PROBABILITÉS =================
  {
    id: '1re-tableau-croise', theme: T_PROBAS, titre: 'Probabilités conditionnelles : tableau croisé',
    programme: 'Calculer des probabilités conditionnelles (tableau croisé d’effectifs).',
    generer() {
      const [[A, nA], [Ab, nAb], [B, nB], [Bb, nBb]] = choix<[string, string][]>([
        [['F', 'Filles'], ['G', 'Garçons'], ['I', 'Internes'], ['E', 'Externes']],
        [['V', 'Vaccinés'], ['N', 'Non vaccinés'], ['M', 'Malades'], ['S', 'Sains']],
        [['L', 'Lycéens'], ['C', 'Collégiens'], ['T', 'Téléphone'], ['S', 'Sans téléphone']],
      ])
      const a = ent(5, 40), b = ent(5, 40), c = ent(5, 40), d = ent(5, 40), N = a + b + c + d
      // lignes : B et non B ; colonnes : A et non A
      const t = `\\begin{array}{|l|c|c|c|}\\hline & \\text{${nA}} & \\text{${nAb}} & \\text{Total} \\\\ \\hline \\text{${nB}} & ${a} & ${b} & ${a + b} \\\\ \\hline \\text{${nBb}} & ${c} & ${d} & ${c + d} \\\\ \\hline \\text{Total} & ${a + c} & ${b + d} & ${N} \\\\ \\hline\\end{array}`
      const [q, r] = choix<[string, string]>([[`P_{${A}}(${B})`, fracDec(a, a + c)], [`P_{${B}}(${A})`, fracDec(a, a + b)], [`P(${A} \\cap ${B})`, fracDec(a, N)], [`P_{${Ab}}(${Bb})`, fracDec(d, b + d)], [`P(${B})`, fracDec(a + b, N)]])
      return { enonce: `On choisit une personne au hasard ($${A}$ : ${nA.toLowerCase()}, $${B}$ : ${nB.toLowerCase()}…). $${t}$ Calculer $${q}$.`, reponse: r }
    },
  },
  {
    id: '1re-arbre', theme: T_PROBAS, titre: 'Probabilités conditionnelles : arbre pondéré',
    programme: 'Calculer des probabilités conditionnelles (arbre pondéré).',
    generer() {
      const [A, B] = choix([['A', 'B'], ['M', 'T'], ['F', 'R'], ['C', 'D']])
      const p = ent(1, 9) / 10, q = ent(1, 9) / 10, r = ent(1, 9) / 10
      const figure = F.arbrePondere([A, '¬' + A], [B, '¬' + B], { a: nb(p), ab: nb(q), aBarreB: nb(r), aBarre: null, aB2: null, aBarreB2: null })
      const [quoi, rep] = choix<[string, number]>([[`P(${A} \\cap ${B})`, p * q], [`P(${B})`, p * q + (1 - p) * r], [`P(\\overline{${A}} \\cap ${B})`, (1 - p) * r], [`P_{${A}}(\\overline{${B}})`, 1 - q], [`P(${A} \\cap \\overline{${B}})`, p * (1 - q)]])
      return { enonce: `D'après l'arbre pondéré, calculer $${quoi}$.`, figure, reponse: nb(arrondi(rep)) }
    },
  },
  {
    id: '1re-distinguer', theme: T_PROBAS, titre: 'Distinguer P(A ∩ B), P_A(B) et P_B(A)',
    programme: 'Distinguer P(A ∩ B), P_A(B), P_B(A).',
    generer() {
      const [A, nA, B, nB] = choix([['F', 'filles', 'I', 'internes'], ['M', 'malades', 'T', 'testés positifs'], ['S', 'sportifs', 'L', 'lecteurs'], ['C', 'clients fidèles', 'R', 'clients ayant une réduction']])
      const t = 5 * ent(2, 18), x = nb(t / 100)
      return choix<Question>([
        { enonce: `Dans un groupe, parmi les ${nA}, $${pct(t)}$ sont ${nB}. Quelle probabilité connaît-on ainsi ($${A}$ : ${nA}, $${B}$ : ${nB}) ?`, reponse: `P_{${A}}(${B}) = ${x}` },
        { enonce: `Dans un groupe, parmi les ${nB}, $${pct(t)}$ sont ${nA}. Quelle probabilité connaît-on ainsi ($${A}$ : ${nA}, $${B}$ : ${nB}) ?`, reponse: `P_{${B}}(${A}) = ${x}` },
        { enonce: `Dans un groupe, $${pct(t)}$ des personnes sont à la fois ${nA} et ${nB}. Quelle probabilité connaît-on ainsi ($${A}$ : ${nA}, $${B}$ : ${nB}) ?`, reponse: `P(${A} \\cap ${B}) = ${x}` },
        { enonce: `Dans un groupe, $${pct(t)}$ des personnes sont ${nA}. Quelle probabilité connaît-on ainsi ($${A}$ : ${nA}, $${B}$ : ${nB}) ?`, reponse: `P(${A}) = ${x}` },
      ])
    },
  },
]

// =============================================================
// LES QUESTIONS DE COURS DE 2nde ET DE 1re
// Mêmes règles : plusieurs façons de poser chaque notion, rien de fixe
// (nombres, lettres, noms des évènements tirés au hasard).
// =============================================================
export const n2 = (theme: string, liste: [string, ...Facon[]][]) => notions(theme, liste, '2nde-')
export const n1 = (theme: string, liste: [string, ...Facon[]][]) => notions(theme, liste, '1re-')
export const DEUX_NOMS = [['A', 'B'], ['a', 'b'], ['x', 'y'], ['u', 'v'], ['X', 'Y']]
export const EVENEMENTS = [['A', 'B'], ['E', 'F'], ['M', 'T'], ['R', 'S'], ['C', 'D'], ['G', 'H']]
export const nomF = () => choix(['f', 'g', 'h', 'u'])

export const COURS_2NDE: QuestionCours[] = [
  ...n2(T_CALCUL, [
    ['Comparer par la différence',
      () => { const [a, b] = choix(DEUX_NOMS); return [`Comment compare-t-on deux nombres $${a}$ et $${b}$ à l'aide de leur différence ?`, `on étudie le signe de $${a} - ${b}$ : si $${a} - ${b} > 0$, alors $${a} > ${b}$`] },
      () => { const [a, b] = choix(DEUX_NOMS), d = nb(ent(1, 9) / 10); return [`On sait que $${a} - ${b} = -${d}$. Quel calcul a permis de comparer $${a}$ et $${b}$, et que conclut-on ?`, `le signe de la différence : elle est négative, donc $${a} < ${b}$`] }],
    ['Comparer par le quotient',
      () => { const [a, b] = choix(DEUX_NOMS); return [`Comment compare-t-on deux nombres strictement positifs $${a}$ et $${b}$ à l'aide de leur quotient ?`, `on compare $\\frac{${a}}{${b}}$ à $1$ : si $\\frac{${a}}{${b}} > 1$, alors $${a} > ${b}$`] }],
    ['Produit et quotient de puissances',
      () => { const a = choix(['a', 'x', '2', '10']), n = ent(2, 9), m = ent(2, 9); return [`Comment écrit-on $${a}^{${n}} \\times ${a}^{${m}}$ sous la forme d'une seule puissance ?`, `on ajoute les exposants : $${a}^{${n + m}}$`] },
      () => { const a = choix(['a', 'x', '3', '10']), n = ent(5, 12), m = ent(2, 4); return [`Comment écrit-on $\\frac{${a}^{${n}}}{${a}^{${m}}}$ sous la forme d'une seule puissance ?`, `on soustrait les exposants : $${a}^{${n - m}}$`] },
      () => { const a = choix(['a', 'x', '5', '10']), n = ent(2, 6), m = ent(2, 5); return [`Comment écrit-on $(${a}^{${n}})^{${m}}$ sous la forme d'une seule puissance ?`, `on multiplie les exposants : $${a}^{${n * m}}$`] }],
    ['Puissance d\'exposant négatif',
      () => { const a = choix(['a', 'x', '2', '10']), n = ent(1, 9); return [`Que vaut $${a}^{-${n}}$ ?`, `$\\frac{1}{${a}^{${n}}}$, l'inverse de $${a}^{${n}}$`] },
      () => { const a = choix(['a', 'x', 't']), b = ent(2, 15); return une([`Que vaut $${a}^{0}$ (avec $${a} \\neq 0$) ?`, '$1$'], [`Que vaut $${b}^{0}$ ?`, '$1$']) }],
    ['Un pourcentage est une fraction',
      () => { const t = ent(1, 99); return [`Quelle fraction de dénominateur $100$ est égale à $${pct(t)}$ ?`, `$\\frac{${t}}{100}$`] },
      () => { const t = ent(1, 99); return [`Comment écrit-on $${pct(t)}$ en écriture décimale ?`, `$${nb(t / 100)}$ (on divise par $100$)`] }],
    ['Des parenthèses précédées de −',
      () => { const [a, b] = choix(DEUX_NOMS); return [`Que devient $-(${a} + ${b})$ sans parenthèses ?`, `$-${a} - ${b}$ : on change tous les signes`] },
      () => { const [a, b] = choix(DEUX_NOMS); return [`Que devient $-(${a} - ${b})$ sans parenthèses ?`, `$${b} - ${a}$ (soit $-${a} + ${b}$)`] }],
    ['Diviser par une fraction',
      () => { const c = ent(2, 9), d = autreQue([2, 3, 5, 7, 11], c); return [`Diviser par $\\frac{${c}}{${d}}$ revient à…`, `multiplier par son inverse, $\\frac{${d}}{${c}}$`] },
      () => { const [a, b] = choix(DEUX_NOMS), [c, d] = choix([['c', 'd'], ['p', 'q'], ['m', 'n']]); return [`Comment écrit-on plus simplement $\\dfrac{\\frac{${a}}{${b}}}{\\frac{${c}}{${d}}}$ ?`, `$\\frac{${a}}{${b}} \\times \\frac{${d}}{${c}} = \\frac{${a}${d}}{${b}${c}}$`] }],
    ['Les identités remarquables',
      () => { const [a, b] = choix(DEUX_NOMS); return [`Développer $(${a} + ${b})^2$.`, `$${a}^2 + 2${a}${b} + ${b}^2$`] },
      () => { const [a, b] = choix(DEUX_NOMS); return [`Développer $(${a} - ${b})^2$.`, `$${a}^2 - 2${a}${b} + ${b}^2$`] },
      () => { const [a, b] = choix(DEUX_NOMS); return [`Factoriser $${a}^2 - ${b}^2$.`, `$(${a} - ${b})(${a} + ${b})$`] }],
    ['L\'équation x² = a',
      () => { const k = ent(2, 50); return [`Combien de solutions a l'équation $x^2 = ${k}$, et lesquelles ?`, `deux : $\\sqrt{${k}}$ et $-\\sqrt{${k}}$`] },
      () => { const k = ent(1, 50); return [`Pourquoi l'équation $x^2 = -${k}$ n'a-t-elle aucune solution ?`, 'un carré est toujours positif ou nul'] }],
    ['Inéquation et nombre négatif',
      () => { const k = ent(2, 9), c = ent(1, 30); return [`On divise les deux membres de $-${k}x < ${c}$ par $-${k}$. Quelle inéquation obtient-on ?`, `$x > -\\frac{${c}}{${k}}$ : diviser par un nombre négatif change le sens`] },
      () => { const k = ent(2, 9); return [`Que devient le sens d'une inéquation quand on multiplie ses deux membres par $-${k}$ ?`, 'il change : $<$ devient $>$'] }],
    ['Isoler une variable',
      () => { const [f, v, r] = choix([['U = RI', 'I', 'I = \\frac{U}{R}'], ['v = \\frac{d}{t}', 't', 't = \\frac{d}{v}'], ['P = UI', 'U', 'U = \\frac{P}{I}'], ['\\rho = \\frac{m}{V}', 'm', 'm = \\rho V'], ['y = ax + b', 'x', 'x = \\frac{y - b}{a}']]); return [`Dans $${f}$, comment isole-t-on $${v}$ ?`, `$${r}$`] }],
  ]),
  ...n2(T_PROPORTIONS, [
    ['La proportion',
      () => { const N = choix([200, 400, 500, 800]), n = ent(10, 150); return [`Dans une population de $${N}$ personnes, $${n}$ ont un caractère. Quel calcul donne la proportion de ce caractère ?`, `$\\frac{${n}}{${N}}$ : la partie divisée par le tout`] }],
    ['Une partie connaissant le tout',
      () => { const p = choix([10, 15, 20, 30, 35]), N = choix([200, 300, 500]); return [`Une proportion de $${pct(p)}$ d'une population de $${N}$ personnes : quel calcul donne l'effectif ?`, `$\\frac{${p}}{100} \\times ${N}$ (proportion × tout)`] }],
    ['Le tout connaissant une partie',
      () => { const p = choix([10, 20, 25, 40]), n = ent(2, 20) * 5; return [`$${n}$ personnes représentent $${pct(p)}$ d'une population. Quel calcul donne la population totale ?`, `$${n} \\div ${nb(p / 100)}$ (partie ÷ proportion)`] }],
    ['Une proportion est entre 0 et 1',
      () => { const x = ent(11, 30) / 10; return [`Pourquoi une proportion ne peut-elle pas valoir $${nb(x)}$ ?`, 'une proportion est toujours comprise entre $0$ et $1$ (entre $0\\,\\%$ et $100\\,\\%$)'] }],
  ]),
  ...n2(T_EVOLUTIONS, [
    ['Le coefficient d\'une hausse',
      () => { const t = choix([2, 3, 5, 8, 12, 15, 20, 35]); return [`Augmenter de $${pct(t)}$ revient à multiplier par…`, `$1 + \\frac{${t}}{100} = ${nb(1 + t / 100)}$`] }],
    ['Le coefficient d\'une baisse',
      () => { const t = choix([2, 3, 5, 8, 12, 15, 20, 35]); return [`Diminuer de $${pct(t)}$ revient à multiplier par…`, `$1 - \\frac{${t}}{100} = ${nb(1 - t / 100)}$`] }],
    ['Le taux d\'évolution',
      () => { const [a, b] = choix([['V_0', 'V_1'], ['y_1', 'y_2'], ['a', 'b'], ['P_0', 'P_1']]); return [`Une grandeur passe de $${a}$ à $${b}$. Quelle formule donne le taux d'évolution ?`, `$\\frac{${b} - ${a}}{${a}}$`] }],
  ]),
  ...n2(T_FONCTIONS, [
    ['Image et antécédent',
      () => { const f = nomF(), a = ent(-9, 9), b = ent(-9, 9); return une([`On a $${f}(${a}) = ${b}$. Comment appelle-t-on $${b}$ ?`, `l'image de $${a}$ par $${f}$`], [`On a $${f}(${a}) = ${b}$. Comment appelle-t-on $${a}$ ?`, `un antécédent de $${b}$ par $${f}$`]) }],
    ['Lire une image, un antécédent',
      () => { const f = nomF(), a = ent(-5, 5); return [`Comment lit-on l'image de $${a}$ sur la courbe de $${f}$ ?`, `on part de $${a}$ sur l'axe des abscisses, on va jusqu'à la courbe et on lit l'ordonnée`] },
      () => { const f = nomF(), b = ent(-5, 5); return [`Comment lit-on les antécédents de $${b}$ sur la courbe de $${f}$ ?`, `on part de $${b}$ sur l'axe des ordonnées, on cherche les points de la courbe à cette hauteur et on lit leurs abscisses`] }],
    ['Un point sur une courbe',
      () => { const f = nomF(), P = pt(), a = ent(-9, 9), b = ent(-9, 9); return [`Le point $${P}${coord(a, b)}$ est sur la courbe de $${f}$. Quelle égalité peut-on écrire ?`, `$${f}(${a}) = ${b}$`] }],
    ['Fonction linéaire',
      () => { const f = nomF(), a = relNonNul(1, 9); return [`La fonction $${f}(x) = ${polynome([a, 0])}$ est linéaire. Quelle est sa représentation graphique ?`, 'une droite qui passe par l\'origine du repère'] },
      () => { const f = nomF(); return [`Quelle est la forme de l'expression d'une fonction linéaire $${f}$ ?`, `$${f}(x) = ax$, avec $a$ un nombre`] }],
    ['Fonction affine',
      () => { const f = nomF(), m = relNonNul(1, 9), p = relNonNul(1, 9); return [`La fonction $${f}(x) = ${polynome([m, p])}$ est affine. Quelle est sa représentation graphique ?`, 'une droite'] },
      () => { const f = nomF(); return [`Quelle est la forme de l'expression d'une fonction affine $${f}$ ?`, `$${f}(x) = mx + p$, avec $m$ et $p$ des nombres`] }],
    ['Coefficient directeur et ordonnée à l\'origine',
      () => { const f = nomF(), m = relNonNul(1, 9), p = relNonNul(1, 9); return une([`Pour $${f}(x) = ${polynome([m, p])}$, comment appelle-t-on le nombre $${nb(m)}$ ?`, 'le coefficient directeur'], [`Pour $${f}(x) = ${polynome([m, p])}$, comment appelle-t-on le nombre $${nb(p)}$ ?`, 'l\'ordonnée à l\'origine']) }],
  ]),
  ...n2(T_STATS, [
    ['La moyenne',
      () => { const n = ent(4, 30); return [`Comment calcule-t-on la moyenne d'une série de $${n}$ valeurs ?`, `on additionne les $${n}$ valeurs et on divise la somme par $${n}$`] }],
    ['La médiane',
      () => { const n = 2 * ent(2, 15) + 1; return [`Une série de $${n}$ valeurs est rangée dans l'ordre croissant. Quelle valeur est la médiane ?`, `la $${(n + 1) / 2}$e : il y a autant de valeurs avant qu'après`] },
      () => { const n = 2 * ent(2, 15); return [`Une série de $${n}$ valeurs est rangée dans l'ordre croissant. Comment trouve-t-on la médiane ?`, `on prend la moyenne de la $${n / 2}$e et de la $${n / 2 + 1}$e valeur`] }],
    ['Les quartiles',
      () => { const n = ent(8, 40), q = choix([1, 3]); return [`Une série de $${n}$ valeurs est rangée dans l'ordre croissant. Quelle valeur est le ${q === 1 ? 'premier' : 'troisième'} quartile ?`, `la $${Math.ceil(q * n / 4)}$e : la plus petite valeur telle qu'au moins $${q * 25}\\,\\%$ des valeurs lui soient inférieures ou égales`] }],
    ['Écart interquartile et étendue',
      () => { const a = ent(2, 10), b = a + ent(3, 10); return une([`$Q_1 = ${a}$ et $Q_3 = ${b}$. Comment s'appelle $Q_3 - Q_1$, et que vaut-il ?`, `l'écart interquartile, $${b - a}$`], [`La plus petite valeur est $${a}$, la plus grande $${b}$. Comment s'appelle leur différence, et que vaut-elle ?`, `l'étendue, $${b - a}$`]) }],
    ['Lire une boîte à moustaches',
      () => { const v = ent(5, 40), [ou, quoi] = choix([['le trait à l\'intérieur de la boîte', 'la médiane'], ['le bord gauche de la boîte', 'le premier quartile $Q_1$'], ['le bord droit de la boîte', 'le troisième quartile $Q_3$'], ['le bout de la moustache de droite', 'le maximum'], ['le bout de la moustache de gauche', 'le minimum']]); return [`Sur une boîte à moustaches, ${ou} est à $${v}$. Que représente $${v}$ ?`, quoi] }],
    ['Un diagramme circulaire',
      () => { const p = 5 * ent(1, 18); return [`Dans un diagramme circulaire, quel calcul donne l'angle d'une part de $${pct(p)}$ ?`, `$360° \\times \\frac{${p}}{100} = ${deg(arrondi(3.6 * p))}$`] }],
  ]),
  ...n2(T_PROBAS, [
    ['Une probabilité est entre 0 et 1',
      () => { const x = choix([nb(ent(11, 30) / 10), nb(-ent(1, 9) / 10), frac(choix([8, 9, 10, 11, 12, 13]), 7)]); return [`Pourquoi $${x}$ ne peut-il pas être une probabilité ?`, 'une probabilité est toujours comprise entre $0$ et $1$'] }],
    ['L\'évènement contraire',
      () => { const [A] = choix(EVENEMENTS); return [`Comment calcule-t-on $P(\\overline{${A}})$ à partir de $P(${A})$ ?`, `$P(\\overline{${A}}) = 1 - P(${A})$`] }],
    ['La somme des issues',
      () => { const [A] = choix(EVENEMENTS), n = ent(2, 4); return [`L'évènement $${A}$ est formé de $${n}$ issues. Comment calcule-t-on $P(${A})$ ?`, `on additionne les probabilités des $${n}$ issues qui le composent`] }],
    ['L\'équiprobabilité',
      () => { const n = ent(3, 50); return [`Une expérience a $${n}$ issues équiprobables. Quelle est la probabilité de chacune ?`, `$\\frac{1}{${n}}$`] },
      () => { const [A] = choix(EVENEMENTS); return [`En situation d'équiprobabilité, quelle formule donne $P(${A})$ ?`, `$\\frac{\\text{nombre d'issues favorables à } ${A}}{\\text{nombre d'issues possibles}}$`] }],
    ['Évènement certain, évènement impossible',
      () => { const k = ent(7, 12); return une([`On lance un dé à six faces. Quelle est la probabilité d'obtenir $${k}$, et comment appelle-t-on cet évènement ?`, '$0$ : c\'est un évènement impossible'], [`On lance un dé à six faces. Quelle est la probabilité d'obtenir un nombre inférieur à $${k}$, et comment appelle-t-on cet évènement ?`, '$1$ : c\'est un évènement certain']) }],
  ]),
]

export const COURS_1RE: QuestionCours[] = [
  ...n1(T_CALCUL, [
    ['L\'équation produit nul',
      () => { const a = ent(1, 9), b = ent(1, 9); return [`Quelle propriété permet de résoudre $(x - ${a})(x + ${b}) = 0$ ?`, 'un produit est nul si et seulement si l\'un de ses facteurs est nul'] },
      () => { const [a, b] = choix(DEUX_NOMS); return [`Compléter : $${a} \\times ${b} = 0$ si et seulement si…`, `$${a} = 0$ ou $${b} = 0$`] }],
    ['Le signe de mx + p',
      () => { const m = relNonNul(1, 6), r = ent(-6, 6); return [`Où s'annule $${polynome([m, -m * r])}$, et quel est son signe pour $x > ${r}$ ?`, `en $x = ${r}$ ; ensuite du signe de $${m}$ (le coefficient de $x$), donc ${m > 0 ? 'positif' : 'négatif'}`] },
      () => { const m = relNonNul(1, 6); return [`Le signe de $${polynome([m, 0])} + p$ à droite de sa racine dépend de quel nombre ?`, `de $${m}$, le coefficient de $x$`] }],
    ['Le signe d\'un produit',
      () => { const a = ent(1, 9), b = ent(1, 9); return [`Comment étudie-t-on le signe de $(x - ${a})(x + ${b})$ ?`, 'on étudie le signe de chaque facteur dans un tableau de signes, puis on applique la règle des signes'] }],
    ['Développer un produit',
      () => { const [a, b] = choix(DEUX_NOMS), [c, d] = choix([['c', 'd'], ['p', 'q'], ['m', 'n']]); return [`Développer $(${a} + ${b})(${c} + ${d})$.`, `$${a}${c} + ${a}${d} + ${b}${c} + ${b}${d}$`] }],
    ['Factoriser par un facteur commun',
      () => { const [a, b] = choix(DEUX_NOMS), k = choix(['k', '(x + 1)', '3', 'x']); return [`Factoriser $${k}${a} + ${k}${b}$.`, `$${k}(${a} + ${b})$`] }],
  ]),
  ...n1(T_EVOLUTIONS, [
    ['La valeur finale',
      () => { const t = choix([5, 10, 15, 20, 30]), [v] = choix([['V_0'], ['P_0'], ['y_0']]); return [`Une valeur $${v}$ augmente de $${pct(t)}$. Quel calcul donne la valeur finale ?`, `$${v} \\times ${nb(1 + t / 100)}$`] }],
    ['La valeur initiale',
      () => { const t = choix([5, 10, 15, 20, 30]), [v] = choix([['V_1'], ['P_1'], ['y_1']]); return [`Après une baisse de $${pct(t)}$, on obtient $${v}$. Quel calcul redonne la valeur initiale ?`, `$${v} \\div ${nb(1 - t / 100)}$`] }],
    ['Des évolutions successives',
      () => { const n = ent(2, 4); return [`Comment obtient-on le coefficient multiplicateur global de $${n}$ évolutions successives ?`, `on multiplie les $${n}$ coefficients multiplicateurs`] }],
    ['L\'évolution réciproque',
      () => { const c = nb(1 + choix([5, 10, 20, 25, 50]) / 100); return [`Une évolution a pour coefficient multiplicateur $${c}$. Quel est le coefficient de l'évolution réciproque ?`, `$\\frac{1}{${c}}$, l'inverse`] }],
    ['Du coefficient au taux',
      () => { const t = choix([-40, -25, -12, -5, 3, 8, 15, 35, 60]); return [`Le coefficient multiplicateur est $${nb(1 + t / 100)}$. Quel est le taux d'évolution ?`, `$${nb(1 + t / 100)} - 1 = ${nb(t / 100)}$, soit $${t > 0 ? '+' : ''}${pct(t)}$`] }],
  ]),
  ...n1(T_FONCTIONS, [
    ['Résoudre f(x) = k graphiquement',
      () => { const f = nomF(), k = ent(-5, 5); return [`Comment résout-on graphiquement $${f}(x) = ${k}$ ?`, `on lit les abscisses des points de la courbe d'ordonnée $${k}$`] }],
    ['Résoudre f(x) < k graphiquement',
      () => { const f = nomF(), k = ent(-5, 5); return [`Comment résout-on graphiquement $${f}(x) < ${k}$ ?`, `on lit les abscisses des points de la courbe situés strictement sous la droite d'équation $y = ${k}$`] }],
    ['Le signe d\'une fonction sur sa courbe',
      () => { const f = nomF(), a = ent(-5, 0), b = ent(1, 6); return [`La fonction $${f}$ est strictement positive sur $${intervalle(nb(a), nb(b), false, false)}$. Où est sa courbe sur cet intervalle ?`, 'au-dessus de l\'axe des abscisses'] }],
    ['Le coefficient directeur',
      () => { const [A, B] = pts(2); return [`Quelle formule donne le coefficient directeur de la droite $(${A}${B})$ ?`, `$\\frac{y_${B} - y_${A}}{x_${B} - x_${A}}$`] },
      () => { const m = relNonNul(1, 5), p = relNonNul(1, 5); return [`Sur la droite $y = ${polynome([m, p])}$, de combien varie $y$ quand $x$ augmente de $1$ ?`, `de $${nb(m)}$, le coefficient directeur`] }],
    ['L\'ordonnée à l\'origine',
      () => { const m = relNonNul(1, 5), p = relNonNul(1, 5); return [`Que représente $${nb(p)}$ pour la droite $y = ${polynome([m, p])}$ ?`, `l'ordonnée à l'origine : la droite coupe l'axe des ordonnées au point $${coord(0, p)}$`] }],
    ['Tracer une droite',
      () => { const m = relNonNul(1, 4), p = ent(-4, 4); return [`De quoi a-t-on besoin pour tracer la droite d'équation $y = ${polynome([m, p])}$ ?`, `de deux de ses points, par exemple $${coord(0, p)}$ et $${coord(1, m + p)}$`] }],
  ]),
  ...n1(T_STATS, [
    ['Moyenne et transformation',
      () => { const m = ent(8, 15), k = ent(2, 5); return une([`Une série a pour moyenne $${m}$. On ajoute $${k}$ à chaque valeur. Que devient la moyenne ?`, `elle augmente de $${k}$ : $${m + k}$`], [`Une série a pour moyenne $${m}$. On multiplie chaque valeur par $${k}$. Que devient la moyenne ?`, `elle est multipliée par $${k}$ : $${m * k}$`]) }],
    ['La moyenne pondérée',
      () => { const [x, n] = choix([['x_i', 'n_i'], ['v_i', 'e_i']]); return [`Une série est donnée par ses valeurs $${x}$ et leurs effectifs $${n}$. Comment calcule-t-on sa moyenne ?`, `on additionne les produits $${n} \\times ${x}$, puis on divise par l'effectif total`] }],
    ['Lire un graphique',
      () => { const a = choix([100, 200, 1000, 50]); return [`L'axe des ordonnées d'un graphique commence à $${a}$. Que faut-il repérer avant de lire une valeur ?`, 'l\'origine du repère, les unités et le pas des graduations de chaque axe'] }],
    ['Interpréter la médiane',
      () => { const m = ent(5, 40); return [`La médiane d'une série vaut $${m}$. Qu'est-ce que cela signifie ?`, `au moins la moitié des valeurs sont inférieures ou égales à $${m}$, au moins la moitié supérieures ou égales`] }],
  ]),
  ...n1(T_PROBAS, [
    ['La probabilité conditionnelle',
      () => { const [A, B] = choix(EVENEMENTS); return [`Quelle formule donne $P_{${A}}(${B})$ ?`, `$P_{${A}}(${B}) = \\frac{P(${A} \\cap ${B})}{P(${A})}$`] },
      () => { const [A, B] = choix(EVENEMENTS); return [`Comment lit-on $P_{${A}}(${B})$ ?`, `la probabilité de $${B}$ sachant $${A}$`] }],
    ['L\'intersection sur un arbre',
      () => { const [A, B] = choix(EVENEMENTS); return [`Sur un arbre pondéré, comment calcule-t-on $P(${A} \\cap ${B})$ ?`, `on multiplie les probabilités du chemin : $P(${A}) \\times P_{${A}}(${B})$`] }],
    ['Un tableau croisé',
      () => { const [A, B] = choix(EVENEMENTS); return [`Dans un tableau croisé d'effectifs, comment calcule-t-on $P_{${A}}(${B})$ ?`, `l'effectif de $${A} \\cap ${B}$ divisé par l'effectif de $${A}$`] }],
    ['Les probabilités totales',
      () => { const [A, B] = choix(EVENEMENTS); return [`Sur un arbre où $${A}$ et $\\overline{${A}}$ mènent à $${B}$, comment calcule-t-on $P(${B})$ ?`, `$P(${B}) = P(${A} \\cap ${B}) + P(\\overline{${A}} \\cap ${B})$`] }],
    ['Les branches d\'un nœud',
      () => { const x = ent(1, 9) / 10; return [`Deux branches partent d'un même nœud d'un arbre pondéré ; l'une porte $${nb(x)}$. Que porte l'autre ?`, `$${nb(1 - x)}$ : la somme des branches issues d'un nœud vaut $1$`] }],
  ]),
]
