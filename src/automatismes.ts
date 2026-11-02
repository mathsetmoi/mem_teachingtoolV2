// =============================================================
// LES AUTOMATISMES (5e)
// Rangés comme la liste officielle des automatismes de 5e. Toutes les
// questions sont à RÉPONSE COURTE, comme au brevet et à l'épreuve
// anticipée à partir de 2027 : l'élève écrit sa réponse, on ne lui
// montre jamais de propositions, et aucune question ne se réussit avec
// une chance sur deux (pas de « oui ou non »).
// - Les exercices d'application : chaque automatisme est un GÉNÉRATEUR,
//   qui tire des valeurs au hasard et rend une question et sa réponse.
//   Beaucoup savent aussi poser leur question « à trou » (une égalité à
//   compléter), qui se mélange aux autres.
// - Les questions de cours (COURS_5E) : une définition, une propriété,
//   le vocabulaire, rangés dans les mêmes thèmes.
// Un flash (voir src/flash.ts) tire ses questions dans les thèmes
// choisis : par défaut 2 questions de cours, puis 3 exercices
// d'application (tirerFlash).
//
// Les réponses sont du LaTeX (KaTeX), un texte (préfixe §, avec $…$
// pour les maths) ou un dessin SVG. Une question peut porter une
// figure (droite graduée, repère, cubes, angles codés…).
// =============================================================
import * as F from './figures'

export interface Question {
  enonce: string            // texte, avec $…$ pour les maths
  figure?: string           // un dessin SVG sous l'énoncé
  reponse: string           // LaTeX ou §texte
  /** Des erreurs d'élèves fréquentes (même format). Elles ne sont plus
   *  montrées depuis la fin des QCM ; facultatives. */
  faux?: string[]
}

export interface Automatisme {
  id: string
  titre: string
  theme: string
  generer: () => Question
  /** La même chose posée « à trou » : une égalité ou une phrase à
   *  compléter, avec … à la place de la réponse. Absent : l'automatisme ne
   *  s'y prête pas. */
  trou?: () => Question
  /** La phrase du programme que la question travaille, comme au brevet */
  programme?: string
  /** Une application directe d'un objectif d'apprentissage (et non un
   *  automatisme de la liste officielle) */
  application?: boolean
}

// ---------- Outils ----------
const ent = (a: number, b: number) => a + Math.floor(Math.random() * (b - a + 1))
const choix = <T,>(t: T[]): T => t[Math.floor(Math.random() * t.length)]
const pgcd = (a: number, b: number): number => b ? pgcd(b, a % b) : Math.abs(a)
const arrondi = (x: number) => Math.round(x * 1e6) / 1e6
/** Trois points (en unités) alignés */
const aligne = ([a, b, c]: [number, number][]) => (b[0] - a[0]) * (c[1] - a[1]) - (b[1] - a[1]) * (c[0] - a[0]) === 0
/** Deux points du losange de seize triangles reliés par un trait de la
 *  figure : les côtés du losange et du carré, et leurs diagonales */
const surUnTrait = (p: [number, number], q: [number, number]) => {
  const traits: [number, number][][] = [[[0, 2], [2, 0]], [[2, 0], [0, -2]], [[0, -2], [-2, 0]], [[-2, 0], [0, 2]], [[-1, 1], [1, 1]], [[1, 1], [1, -1]], [[1, -1], [-1, -1]], [[-1, -1], [-1, 1]], [[0, 2], [0, -2]], [[-2, 0], [2, 0]], [[-1, 1], [1, -1]], [[1, 1], [-1, -1]]]
  const dessus = (r: [number, number], [a, b]: [number, number][]) => aligne([a, b, r]) && Math.min(a[0], b[0]) <= r[0] && r[0] <= Math.max(a[0], b[0]) && Math.min(a[1], b[1]) <= r[1] && r[1] <= Math.max(a[1], b[1])
  return traits.some(t => dessus(p, t) && dessus(q, t))
}
const melange = <T,>(t: T[]) => { const r = [...t]; for (let i = r.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [r[i], r[j]] = [r[j], r[i]] } return r }

/** Un nombre décimal à la française : 3{,}5 (et −4) */
export const nb = (x: number) => {
  const s = String(arrondi(x)).replace('.', '{,}')
  return s.startsWith('-') ? '-' + s.slice(1) : s
}
/** Un relatif écrit avec son signe et ses parenthèses : (−3), (+5) */
const rel = (x: number) => x < 0 ? `(-${nb(-x)})` : `(+${nb(x)})`
/** Une fraction (simplifiée ou non), en LaTeX */
const frac = (n: number, d: number) => {
  if (d < 0) { n = -n; d = -d }
  if (d === 1) return nb(n)
  return (n < 0 ? '-' : '') + `\\frac{${Math.abs(n)}}{${d}}`
}
const irreductible = (n: number, d: number) => { const g = pgcd(n, d) || 1; return frac(n / g, d / g) }
const unite = (x: string, u: string) => `${x}\\text{ ${u}}`
const deg = (x: number) => `${nb(x)}°`
/** Une réponse en mots (avec, au besoin, des $…$) */
export const mot = (t: string) => '§' + t

/** « Par lesquels des nombres … le nombre N est-il divisible ? » : trois
 *  diviseurs tirés au hasard dans la liste, et un nombre de 3 ou 4
 *  chiffres, souvent multiple de l'un d'eux pour que la réponse ne soit
 *  pas toujours « par aucun ». */
function divisiblePar(liste: number[]): Question {
  const d = melange(liste).slice(0, 3).sort((x, y) => x - y)
  const N = Math.random() < 0.75 ? choix(d) * ent(Math.ceil(101 / 2), 999) : ent(101, 9999)
  const oui = d.filter(k => N % k === 0)
  const et = (t: string[]) => t.length < 2 ? t.join('') : `${t.slice(0, -1).join(', ')} et ${t[t.length - 1]}`
  return {
    enonce: `Par lesquels des nombres ${et(d.map(k => `$${k}$`))} le nombre $${N}$ est-il divisible ?`,
    reponse: mot(oui.length ? et(oui.map(k => `par $${k}$`)) : 'par aucun des trois'),
  }
}

/** Des réponses fausses, toutes différentes de la bonne et entre elles (trois au plus) */
function fausses(bonne: string, candidates: string[], secours?: () => string): string[] {
  const r: string[] = []
  for (const c of candidates) if (c !== bonne && !r.includes(c) && r.length < 3) r.push(c)
  for (let essai = 0; secours && r.length < 3 && essai < 60; essai++) {
    const c = secours()
    if (c !== bonne && !r.includes(c)) r.push(c)
  }
  return r
}
/** Secours numérique : la bonne réponse décalée un peu */
const autour = (v: number, pas = 1) => () => nb(v + choix([-3, -2, -1, 1, 2, 3]) * pas)
/** Une réponse parmi des mots : la bonne et trois autres du même lot */
const parmi = (bonne: string, lot: string[]) => ({ reponse: mot(bonne), faux: melange(lot.filter(x => x !== bonne)).slice(0, 3).map(mot) })
const tableau = (l1: string[], l2: string[]) => `\\begin{array}{|${'c|'.repeat(l1.length)}}\\hline ${l1.join(' & ')} \\\\ \\hline ${l2.join(' & ')} \\\\ \\hline\\end{array}`

/** Un empilement : h[x][y] cubes, plus hauts vers le fond pour qu'aucun ne soit caché par devant */
function empilementAuHasard(): number[][] {
  for (;;) {
    const X = ent(2, 3), Y = ent(2, 3)
    const h = Array.from({ length: X }, () => Array.from({ length: Y }, () => ent(0, 3)).sort((a, b) => a - b))
    const total = h.flat().reduce((s, v) => s + v, 0)
    if (total >= 4 && total <= 14 && h.every(c => c[Y - 1] > 0) && Math.max(...h.flat()) >= 2) return h
  }
}

// =============================================================
export const AUTOMATISMES_5E: Automatisme[] = [
  // ================= OPÉRATIONS =================
  {
    id: 'divisibilite-2-5-10', theme: 'Opérations', titre: 'Divisibilité par 2, 3, 5, 9 et 10',
    programme: 'Mobiliser les critères de divisibilité par 2, 5 et 10 ; connaître ceux par 3 et par 9.',
    generer() { return divisiblePar([2, 3, 5, 9, 10]) },
  },
  {
    id: 'division-euclidienne', theme: 'Opérations', titre: 'Quotient et reste d’une division euclidienne',
    programme: 'Déterminer le quotient et le reste dans une division euclidienne : 17 = 3 × 5 + 2.',
    generer() {
      const b = ent(3, 9), q = ent(3, 15), r = ent(1, b - 1), a = b * q + r
      const qr = (x: number, y: number) => `q = ${x} \\text{ et } r = ${y}`
      return { enonce: `Dans la division euclidienne de $${a}$ par $${b}$, quels sont le quotient $q$ et le reste $r$ ?`, reponse: qr(q, r),
        faux: fausses(qr(q, r), [qr(q - 1, r + b), qr(r, q), qr(q + 1, r), qr(q, b - r)], () => qr(q + ent(1, 2), r)) }
    },
  },
  {
    id: 'factoriser-tables', theme: 'Opérations', titre: 'Factoriser un entier avec les tables',
    programme: 'Utiliser les tables pour factoriser des entiers : 21 = 3 × 7.',
    generer() {
      const a = ent(2, 9), b = ent(2, 9), N = a * b
      return { enonce: `Compléter : $${N} = ${a} \\times \\ldots$`, reponse: nb(b), faux: fausses(nb(b), [nb(b + 1), nb(b - 1), nb(N - a)], autour(b)) }
    },
  },
  {
    id: 'produit-derive', theme: 'Opérations', titre: 'Produits dérivés des tables',
    programme: 'Calculer des produits en lien avec les tables : 0,6 × 7 ; 40 × 0,03.',
    generer() {
      const a = ent(2, 9), b = ent(2, 9)
      let e1: number, e2: number
      do { e1 = choix([-2, -1, 0, 1, 2]); e2 = choix([-2, -1, 0, 1]) } while ((e1 === 0 && e2 === 0) || e1 + e2 < -3 || e1 + e2 > 2)
      const x = a * 10 ** e1, y = b * 10 ** e2, v = a * b * 10 ** (e1 + e2)
      return { enonce: `Calculer : $${nb(x)} \\times ${nb(y)}$`, reponse: nb(v), faux: fausses(nb(v), [nb(v * 10), nb(v / 10), nb(v * 100), nb(v / 100)]) }
    },
  },
  {
    id: 'decimal-fois-10', theme: 'Opérations', titre: 'Multiplier un décimal par 10, 100 ou 1 000',
    programme: 'Multiplier et diviser par 10, 100, 1 000.',
    generer() {
      const x = ent(11, 999) / choix([10, 100]), k = choix([10, 100, 1000]), v = x * k
      // L'erreur classique : « on ajoute des zéros » derrière la virgule
      const zeros = nb(x) + String(k).slice(1)
      return { enonce: `Calculer : $${nb(x)} \\times ${k === 1000 ? '1\\,000' : k}$`, reponse: nb(v), faux: fausses(nb(v), [zeros, nb(v / 10), nb(v * 10), nb(x / k)]) }
    },
  },
  {
    id: 'decimal-divise-10', theme: 'Opérations', titre: 'Diviser un décimal par 10, 100 ou 1 000',
    programme: 'Multiplier et diviser par 10, 100, 1 000.',
    generer() {
      const x = choix([ent(11, 999) / 10, ent(2, 9999)]), k = choix([10, 100, 1000]), v = x / k
      return { enonce: `Calculer : $${nb(x)} \\div ${k === 1000 ? '1\\,000' : k}$`, reponse: nb(v), faux: fausses(nb(v), [nb(v * 10), nb(v / 10), nb(x * k), nb(v * 100)]) }
    },
  },
  {
    id: 'decimaux-addition', theme: 'Opérations', titre: 'Additionner des décimaux',
    programme: 'Additionner et soustraire des décimaux : 2,7 + 1,4 ; 3,4 – 0,8.',
    generer() {
      let a: number, b: number
      do { a = ent(11, 99) / 10; b = ent(101, 999) / 100 } while (Number.isInteger(a) || Number.isInteger(b * 10))
      const v = arrondi(a + b)
      // L'erreur : on ajoute les parties entières, puis les « parties décimales » comme des entiers (5,3 + 1,25 → 6,28)
      const [ia, da] = nb(a).split('{,}'), [ib, db] = nb(b).split('{,}')
      const mal = Number(da) + Number(db) < 100 ? `${Number(ia) + Number(ib)}{,}${Number(da) + Number(db)}` : nb(v + 1)
      const [x, y] = Math.random() < 0.5 ? [a, b] : [b, a]
      return { enonce: `Calculer : $${nb(x)} + ${nb(y)}$`, reponse: nb(v), faux: fausses(nb(v), [mal, nb(v + 1), nb(v - 0.1), nb(v + 0.1)], autour(v, 0.1)) }
    },
  },
  {
    id: 'decimaux-soustraction', theme: 'Opérations', titre: 'Soustraire des décimaux',
    programme: 'Additionner et soustraire des décimaux : 2,7 + 1,4 ; 3,4 – 0,8.',
    generer() {
      let a: number, b: number
      do { a = ent(21, 199) / 10; b = ent(101, 999) / 100 } while (b >= a)
      const v = arrondi(a - b)
      return { enonce: `Calculer : $${nb(a)} - ${nb(b)}$`, reponse: nb(v), faux: fausses(nb(v), [nb(v + 1), nb(v - 0.1), nb(v + 0.1), nb(arrondi(v - 1))].filter(t => !t.startsWith('-')), autour(v, 0.01)) }
    },
  },
  {
    id: 'tables', theme: 'Opérations', titre: 'Tables de multiplication',
    programme: 'Entretenir la connaissance et l’utilisation des tables de multiplication.',
    generer() {
      const a = ent(2, 10), b = ent(2, 10), v = a * b
      if (Math.random() < 0.3) return { enonce: `Compléter : $${a} \\times \\ldots = ${v}$`, reponse: nb(b), faux: fausses(nb(b), [nb(b + 1), nb(b - 1), nb(v - a)], autour(b)) }
      return { enonce: `Calculer : $${a} \\times ${b}$`, reponse: nb(v), faux: fausses(nb(v), [nb(a * (b + 1)), nb(a * (b - 1)), nb((a + 1) * b), nb(v + 2)], autour(v)) }
    },
  },
  {
    id: 'priorites', theme: 'Opérations', titre: 'Priorités opératoires',
    programme: 'Connaître et utiliser les priorités opératoires.', application: true,
    generer() {
      const a = ent(2, 12), b = ent(2, 9), c = ent(2, 9)
      const forme = ent(0, 3)
      let e: string, v: number, gauche: number
      if (forme === 0) { e = `${a} + ${b} \\times ${c}`; v = a + b * c; gauche = (a + b) * c }
      else if (forme === 1) { const a2 = b * c + ent(1, 20); e = `${a2} - ${b} \\times ${c}`; v = a2 - b * c; gauche = (a2 - b) * c }
      else if (forme === 2) { e = `(${a} + ${b}) \\times ${c}`; v = (a + b) * c; gauche = a + b * c }
      else {
        const q = ent(2, 9); const d = q * c; e = `${a} + ${d} \\div ${c}`; v = a + q
        // De gauche à droite, (a + d) ÷ c — sinon l'oubli de la division
        gauche = (a + d) % c === 0 ? (a + d) / c : a + d
      }
      return { enonce: `Calculer : $${e}$`, reponse: nb(v), faux: fausses(nb(v), [nb(gauche), nb(v + c), nb(v - 1)], autour(v)) }
    },
  },
  {
    id: 'distributivite-numerique', theme: 'Opérations', titre: 'La distributivité pour calculer',
    programme: 'Connaître et utiliser la distributivité simple sur des exemples numériques.', application: true,
    generer() {
      const k = ent(3, 9), sorte = ent(0, 2)
      if (sorte === 0) {
        // k × 99, k × 101, k × 19… : (100 − 1), (100 + 1), (20 − 1)
        const n = choix([99, 101, 19, 21, 49, 51, 98, 102, 999])
        return { enonce: `Calculer astucieusement : $${k} \\times ${n}$`, reponse: nb(k * n) }
      }
      if (sorte === 1) {
        const a = ent(11, 49), b = 100 - a
        return { enonce: `Calculer astucieusement : $${k} \\times ${a} + ${k} \\times ${b}$`, reponse: nb(k * 100) }
      }
      const a = choix([10, 20, 100]), b = ent(2, 9)
      return { enonce: `Calculer astucieusement : $${k} \\times ${a + b}$`, reponse: nb(k * (a + b)) }
    },
    trou() {
      const k = ent(3, 9), a = choix([10, 20, 100]), b = ent(2, 9)
      return unTrou('', [
        [`$${k} \\times (${a} + ${b}) = ${k} \\times ${a} + ${k} \\times \\ldots$`, nb(b)],
        [`$${k} \\times (${a} + ${b}) = \\ldots \\times ${a} + ${k} \\times ${b}$`, nb(k)],
        [`$${k} \\times ${a} + ${k} \\times ${b} = ${k} \\times (\\ldots + ${b})$`, nb(a)],
      ])
    },
  },
  {
    id: 'diviser-decimal', theme: 'Opérations', titre: 'Diviser par un nombre décimal',
    programme: 'Diviser par un nombre décimal.', application: true,
    generer() {
      // a ÷ 0,b avec un quotient entier : on multiplie les deux par 10 (ou 100)
      const d = choix([0.2, 0.4, 0.5, 0.6, 0.8, 0.3, 0.7, 1.2, 2.5, 0.25, 0.05]), q = ent(2, 12), a = arrondi(d * q)
      return { enonce: `Calculer : $${nb(a)} \\div ${nb(d)}$`, reponse: nb(q) }
    },
    trou() {
      const d = choix([0.2, 0.4, 0.5, 0.6, 0.8, 0.3, 0.7, 1.2, 2.5]), q = ent(2, 12), a = arrondi(d * q)
      const k = Number.isInteger(arrondi(d * 10)) ? 10 : 100
      return unTrou('', [[`$${nb(a)} \\div ${nb(d)} = ${nb(arrondi(a * k))} \\div \\ldots$`, nb(arrondi(d * k))], [`$${nb(a)} \\div ${nb(d)} = \\ldots$`, nb(q)]])
    },
  },
  {
    id: 'programme-calcul', theme: 'Opérations', titre: 'Un programme de calcul en une seule expression',
    programme: 'Traduire un programme de calcul en une seule expression, avec ou sans parenthèses.', application: true,
    generer() {
      const x = ent(2, 12), a = ent(2, 9), b = ent(2, 9)
      const [etapes, expr, v] = choix<[string, string, number]>([
        [`ajouter $${a}$, puis multiplier par $${b}$`, `(${x} + ${a}) \\times ${b}`, (x + a) * b],
        [`multiplier par $${b}$, puis ajouter $${a}$`, `${x} \\times ${b} + ${a}`, x * b + a],
        [`retrancher $${Math.min(a, x - 1)}$, puis multiplier par $${b}$`, `(${x} - ${Math.min(a, x - 1)}) \\times ${b}`, (x - Math.min(a, x - 1)) * b],
        [`multiplier par $${b}$, puis retrancher $${a}$`, `${x} \\times ${b} - ${a}`, x * b - a],
      ])
      return Math.random() < 0.5
        ? { enonce: `Programme : choisir un nombre, ${etapes}. Écrire en une seule expression le calcul fait avec $${x}$.`, reponse: expr }
        : { enonce: `Programme : choisir un nombre, ${etapes}. Quel résultat obtient-on avec $${x}$ ?`, reponse: nb(v) }
    },
  },
  {
    id: 'multiples-diviseurs', theme: 'Opérations', titre: 'Multiples et diviseurs',
    programme: 'Utiliser les notions de multiples et diviseurs.', application: true,
    generer() {
      const sorte = ent(0, 2)
      if (sorte === 0) {
        const k = ent(3, 12), n = ent(20, 90), v = (Math.floor(n / k) + 1) * k
        return { enonce: `Quel est le plus petit multiple de $${k}$ strictement supérieur à $${n}$ ?`, reponse: nb(v) }
      }
      if (sorte === 1) {
        const k = ent(3, 12), n = ent(30, 99), v = Math.floor(n / k) * k
        return { enonce: `Quel est le plus grand multiple de $${k}$ inférieur ou égal à $${n}$ ?`, reponse: nb(v) }
      }
      // Tous les diviseurs d'un petit nombre
      const N = choix([12, 15, 16, 18, 20, 21, 24, 28, 30, 36]), d = Array.from({ length: N }, (_, i) => i + 1).filter(i => N % i === 0)
      return { enonce: `Combien le nombre $${N}$ a-t-il de diviseurs ?`, reponse: mot(`$${d.length}$ : ${d.map(x => `$${x}$`).join(', ')}`) }
    },
  },

  // ================= NOMBRES RELATIFS =================
  {
    id: 'addition-trou', theme: 'Nombres relatifs', titre: 'Une addition à trou, par une soustraction',
    programme: 'Pour compléter une addition à trou, on utilise une soustraction : 2 + … = 7 se complète en calculant 7 – 2.',
    generer() {
      const a = ent(11, 99) / choix([1, 10]), b = arrondi(a + ent(11, 199) / choix([1, 10]))
      return Math.random() < 0.5
        ? { enonce: `Compléter : $${nb(a)} + \\ldots = ${nb(b)}$`, reponse: nb(arrondi(b - a)) }
        : { enonce: `Quelle soustraction donne le nombre manquant dans $${nb(a)} + \\ldots = ${nb(b)}$ ?`, reponse: `${nb(b)} - ${nb(a)}` }
    },
    trou() {
      const a = ent(11, 99) / choix([1, 10]), b = arrondi(a + ent(11, 199) / choix([1, 10]))
      return unTrou('', [[`$${nb(a)} + \\ldots = ${nb(b)}$`, nb(arrondi(b - a))], [`$\\ldots + ${nb(a)} = ${nb(b)}$`, nb(arrondi(b - a))]])
    },
  },
  {
    id: 'decimaux-produit', theme: 'Nombres relatifs', titre: 'Multiplier des décimaux',
    programme: 'Additionner, soustraire, multiplier des nombres décimaux à une ou deux décimales.',
    generer() {
      // Deux facteurs de 1 ou 2 chiffres significatifs, avec 1 ou 2 décimales en tout
      const a = ent(2, 9) / 10 + choix([0, 0, ent(1, 4)]), b = choix([ent(2, 9), ent(2, 9) / 10, ent(11, 15) / 10])
      const v = arrondi(a * b)
      return { enonce: `Calculer : $${nb(arrondi(a))} \\times ${nb(b)}$`, reponse: nb(v) }
    },
    trou() {
      const a = ent(2, 9), b = ent(2, 9)
      const x = nb(a / 10), y = nb(b / 10), v = nb(arrondi(a * b / 100))
      return unTrou('', [[`$${x} \\times \\ldots = ${v}$`, y], [`$${x} \\times ${y} = \\ldots$`, v]])
    },
  },
  {
    id: 'relatifs-addsub', theme: 'Nombres relatifs', titre: 'Additionner et soustraire des relatifs',
    programme: 'Additionner et soustraire deux nombres décimaux relatifs.', application: true,
    generer() {
      const tirer = () => (Math.random() < 0.3 ? ent(1, 99) / 10 : ent(1, 15)) * choix([-1, 1])
      const a = tirer(), b = tirer(), plus = Math.random() < 0.5
      const v = arrondi(plus ? a + b : a - b)
      const faux = plus ? [nb(-v), nb(arrondi(Math.abs(a) + Math.abs(b))), nb(arrondi(a - b))] : [nb(arrondi(a + b)), nb(-v), nb(arrondi(-(a + b)))]
      return { enonce: `Calculer : $${rel(a)} ${plus ? '+' : '-'} ${rel(b)}$`, reponse: nb(v), faux: fausses(nb(v), faux, autour(v)) }
    },
  },
  {
    id: 'relatifs-comparer', theme: 'Nombres relatifs', titre: 'Comparer des relatifs',
    programme: 'Comparer et ranger des nombres décimaux relatifs.', application: true,
    generer() {
      const t = new Set<number>()
      while (t.size < 4) t.add(ent(-12, 12) + choix([0, 0, 0.5]))
      const l = [...t], plusPetit = Math.min(...l)
      return { enonce: `Quel est le plus petit de ces nombres : $${l.map(nb).join(' \\; ; \\; ')}$ ?`, reponse: nb(plusPetit),
        faux: l.filter(x => x !== plusPetit).map(nb) }
    },
  },
  {
    id: 'relatifs-abscisse', theme: 'Nombres relatifs', titre: 'L’abscisse d’un relatif sur une droite graduée',
    programme: 'Lire l’abscisse d’un nombre relatif sur une droite graduée.', application: true,
    generer() {
      const debut = ent(-6, -1), parts = choix([1, 2, 4, 5, 10])
      let k: number
      do { k = ent(1, 4 * parts - 1) } while (debut + k / parts >= 0 && Math.random() < 0.7)
      const x = debut + k / parts, L = choix(['A', 'B', 'M', 'R', 'E'])
      return { enonce: `Quelle est l'abscisse du point $${L}$ ?`, figure: F.droiteGraduee(debut, debut + 4, parts, x, L), reponse: nb(x) }
    },
  },
  {
    id: 'relatifs-enchainer', theme: 'Nombres relatifs', titre: 'Enchaîner additions et soustractions de relatifs',
    programme: 'Simplifier l’écriture de sommes avec parenthèses ; enchaîner additions et soustractions de relatifs.', application: true,
    generer() {
      const t = [relNonNul(1, 12), relNonNul(1, 12), relNonNul(1, 12)], ops = [choix(['+', '-']), choix(['+', '-'])]
      const v = t[0] + (ops[0] === '+' ? t[1] : -t[1]) + (ops[1] === '+' ? t[2] : -t[2])
      if (Math.random() < 0.6) return { enonce: `Calculer : $${seul(t[0])} ${ops[0]} ${rel(t[1])} ${ops[1]} ${rel(t[2])}$`, reponse: nb(v) }
      // Écrire sans parenthèses : on garde le signe de chaque terme
      const terme = (x: number, op: string) => { const s = op === '+' ? x : -x; return `${s < 0 ? '-' : '+'} ${Math.abs(s)}` }
      return { enonce: `Écrire sans parenthèses, puis calculer : $${seul(t[0])} ${ops[0]} ${rel(t[1])} ${ops[1]} ${rel(t[2])}$`, reponse: `${seul(t[0])} ${terme(t[1], ops[0])} ${terme(t[2], ops[1])} = ${nb(v)}` }
    },
  },
  {
    id: 'relatifs-probleme', theme: 'Nombres relatifs', titre: 'Températures, altitudes : un problème avec des relatifs',
    programme: 'Résoudre des problèmes avec des relatifs (température, altitude…).', application: true,
    generer() {
      const sorte = ent(0, 3)
      if (sorte === 0) {
        const t = ent(-9, -1), h = ent(3, 15)
        return { enonce: `Le matin, il fait $${t}\\,°\\text{C}$. L'après-midi, la température a monté de $${h}\\,°\\text{C}$. Quelle température fait-il l'après-midi ?`, reponse: `${nb(t + h)}\\,°\\text{C}` }
      }
      if (sorte === 1) {
        const t = ent(-8, 6), b = ent(3, 12)
        return { enonce: `À midi, il fait $${t}\\,°\\text{C}$. La nuit, la température baisse de $${b}\\,°\\text{C}$. Quelle température fait-il la nuit ?`, reponse: `${nb(t - b)}\\,°\\text{C}` }
      }
      if (sorte === 2) {
        const t1 = ent(-12, -1), t2 = ent(1, 15)
        return { enonce: `Il fait $${t1}\\,°\\text{C}$ à Oslo et $${t2}\\,°\\text{C}$ à Paris. Quel est l'écart de température entre les deux villes ?`, reponse: `${nb(t2 - t1)}\\,°\\text{C}` }
      }
      const p = 10 * ent(5, 30), r = 10 * ent(1, Math.floor(p / 10) - 1)
      return { enonce: `Un plongeur est à $${-p}$ m (sous la surface). Il remonte de $${r}$ m. À quelle altitude est-il ?`, reponse: `${nb(r - p)}\\text{ m}` }
    },
  },

  // ================= NOMBRES RATIONNELS =================
  {
    id: 'fraction-decimal', theme: 'Nombres rationnels', titre: 'Écriture décimale de fractions simples',
    programme: 'Entretenir l’écriture décimale des fractions simples : 1/2 ; 3/4 ; 7/100…',
    generer() {
      const [n, d] = choix([[1, 2], [1, 4], [3, 4], [1, 5], [2, 5], [3, 5], [4, 5], [1, 10], [7, 10], [3, 2], [5, 4], [7, 2], [9, 10], [1, 20], [5, 2], [3, 10]])
      const v = n / d
      return { enonce: `Donner l'écriture décimale de $${frac(n, d)}$.`, reponse: nb(v),
        // Les erreurs classiques : « 3/4 = 3,4 », « 4,3 », la virgule mal placée
        faux: fausses(nb(v), [`${n}{,}${d}`, `${d}{,}${n}`, nb(v * 10), nb(v / 10)], autour(v, 0.1)) }
    },
  },
  {
    id: 'quotient-trou', theme: 'Nombres rationnels', titre: 'Le nombre quotient dans une multiplication à trou',
    programme: 'Faire vivre le nombre quotient en complétant des multiplications à trou : 3 × … = 7.',
    generer() {
      let a: number, b: number
      do { a = ent(3, 9); b = ent(2, 11) } while (b === a || pgcd(a, b) !== 1)
      return { enonce: `Compléter : $${a} \\times \\ldots = ${b}$`, reponse: frac(b, a), faux: fausses(frac(b, a), [frac(a, b), nb(Math.abs(b - a)), frac(1, a), nb(a * b)]) }
    },
  },
  {
    id: 'abscisse-fraction', theme: 'Nombres rationnels', titre: 'Abscisse d’un point (demis, tiers, quarts)',
    programme: 'Lire l’abscisse d’un point sur une droite graduée en moitiés, tiers, quarts, dixièmes.',
    generer() {
      const d = choix([2, 3, 4, 10])
      let k: number
      do { k = ent(1, 3 * d - 1) } while (pgcd(k, d) !== 1)
      return { enonce: `Quelle est l'abscisse du point $A$ ?`, figure: F.droiteGraduee(0, 3, d, k / d),
        // Les erreurs : compter les traits plutôt que les intervalles, inverser, se décaler
        reponse: frac(k, d), faux: fausses(frac(k, d), [frac(k, d + 1), frac(d, k), frac(k + 1, d), frac(k - 1, d)]) }
    },
  },
  {
    id: 'fraction-egales', theme: 'Nombres rationnels', titre: 'Reconnaître des fractions égales',
    programme: 'Reconnaître des fractions égales : 2/3 = …/15.',
    generer() {
      let n: number, d: number
      do { n = ent(1, 9); d = ent(2, 10) } while (pgcd(n, d) !== 1)
      const k = ent(2, 8)
      if (Math.random() < 0.5) {
        return { enonce: `Compléter : $${frac(n, d)} = \\dfrac{\\ldots}{${d * k}}$`, reponse: nb(n * k),
          faux: fausses(nb(n * k), [nb(n + k), nb(n * k + d), nb(d * k - n)], autour(n * k)) }
      }
      // Le dénominateur qui manque (l'erreur classique : ajouter le même nombre en haut et en bas)
      return { enonce: `Compléter : $${frac(n, d)} = \\dfrac{${n * k}}{\\ldots}$`, reponse: nb(d * k),
        faux: fausses(nb(d * k), [nb(d + n * k - n), nb(d * k + n), nb(n * k - d)], autour(d * k)) }
    },
  },
  {
    id: 'comparer-fractions', theme: 'Nombres rationnels', titre: 'Comparer des fractions',
    programme: 'Comparer deux fractions.',
    generer() {
      // Trois fractions de valeurs différentes : même dénominateur, même
      // numérateur, ou un dénominateur multiple de l'autre. Les ranger
      // (six ordres possibles) : on ne trouve pas au hasard.
      const sorte = ent(0, 2)
      let f: [number, number][]
      for (;;) {
        if (sorte === 0) { const d = ent(3, 12); f = melange([1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 13, 15]).slice(0, 3).map(n => [n, d] as [number, number]) }
        else if (sorte === 1) { const n = ent(1, 9); f = melange([2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12]).slice(0, 3).map(d => [n, d] as [number, number]) }
        else { const b = ent(2, 5), d = b * ent(2, 3); f = [[ent(1, 2 * b), b], [ent(1, 2 * d), d], [ent(1, 2 * d), d]] }
        const v = f.map(([n, d]) => n / d)
        if (new Set(v.map(x => arrondi(x))).size === 3 && f.every(([n, d]) => n % d !== 0)) break
      }
      const ecrire = (l: [number, number][]) => l.map(([n, d]) => frac(n, d)).join(' < ')
      const croissant = [...f].sort((x, y) => x[0] / x[1] - y[0] / y[1])
      return { enonce: `Ranger dans l'ordre croissant : $${f.map(([n, d]) => frac(n, d)).join(' \\; ; \\; ')}$`, reponse: ecrire(croissant),
        faux: [ecrire([...croissant].reverse())] }
    },
  },
  {
    id: 'entier-plus-fraction', theme: 'Nombres rationnels', titre: 'Écrire une fraction comme entier + fraction < 1',
    programme: 'Écrire une fraction comme la somme d’un entier et d’une fraction inférieure à 1 : 17/5 = 3 + 2/5.',
    generer() {
      const d = ent(2, 9), q = ent(1, 6), r = ent(1, d - 1), N = q * d + r
      const e = (x: number, f: string) => `${x} + ${f}`
      return { enonce: `Écrire $${frac(N, d)}$ sous la forme d'un entier et d'une fraction inférieure à 1.`, reponse: e(q, frac(r, d)),
        faux: fausses(e(q, frac(r, d)), [e(r, frac(q, d)), e(q + 1, frac(r, d)), e(q, frac(d - r, d)), e(q, frac(r, N))]) }
    },
  },
  {
    id: 'fractions-addsub', theme: 'Nombres rationnels', titre: 'Additionner et soustraire des fractions simples',
    programme: 'Additionner et soustraire des fractions simples : 3/5 + 4/5 ; 1 – 2/3 ; 4/7 – 2/21.',
    generer() {
      const d = ent(2, 7), k = choix([1, 2, 3]), D = d * k, moins = Math.random() < 0.4
      let a = ent(1, 9), c = ent(1, 9)
      if (moins && a * k <= c) { a = Math.ceil((c + 1) / k) + ent(0, 2) }
      const num = moins ? a * k - c : a * k + c, v = irreductible(num, D)
      const op = moins ? '-' : '+'
      return { enonce: `Calculer et simplifier si possible : $${frac(a, d)} ${op} ${frac(c, D)}$`, reponse: v,
        faux: fausses(v, [frac(moins ? Math.abs(a - c) : a + c, k === 1 ? D : d + D), frac(moins ? Math.abs(a - c) : a + c, D), irreductible(num + 1, D)], () => frac(num + ent(1, 4), D)) }
    },
  },
  {
    id: 'fraction-quantite', theme: 'Nombres rationnels', titre: 'Prendre une fraction d’un nombre',
    programme: 'Prendre une fraction simple d’un nombre : le tiers de 18, le quart de 12.',
    generer() {
      let n: number, d: number
      do { n = ent(1, 7); d = ent(2, 10) } while (n >= d || pgcd(n, d) !== 1)
      const N = d * ent(2, 12), v = N / d * n
      return { enonce: `Calculer $${frac(n, d)}$ de $${N}$.`, reponse: nb(v),
        faux: fausses(nb(v), [nb(N / d), nb(N * n), nb(N - n)], autour(v)) }
    },
  },
  {
    id: 'pourcentages-1-10-50', theme: 'Nombres rationnels', titre: 'Calculer 1 %, 10 % ou 50 % d’un nombre',
    programme: 'Prendre 1 %, 10 % ou 50 % d’un nombre.',
    generer() {
      const p = choix([1, 10, 50])
      const N = p === 1 ? ent(2, 90) * 10 : p === 10 ? ent(11, 99) * choix([1, 10]) : ent(3, 99) * 2 + choix([0, 1])
      const v = N * p / 100
      return { enonce: `Calculer $${p}\\,\\%$ de $${N}$.`, reponse: nb(v), faux: fausses(nb(v), [nb(N / 10), nb(N / 100), nb(N / 2), nb(N - p), nb(N / 5)].filter(t => !t.startsWith('-') && !/\{,\}\d{3}/.test(t))) }
    },
  },
  {
    id: 'ecritures-nombre', theme: 'Nombres rationnels', titre: 'Décimale, fraction, pourcentage',
    programme: 'Écrire un même nombre sous de multiples formes : 1,2 = 12/10 = 120 %.',
    generer() {
      const [n, d] = choix([[1, 2], [1, 4], [3, 4], [1, 5], [2, 5], [3, 5], [4, 5], [1, 10], [3, 10], [7, 10], [9, 10], [1, 100], [3, 100], [3, 20], [1, 20]])
      const v = n / d, pc = arrondi(v * 100)
      const pcs = (x: number) => `${nb(x)}\\,\\%`
      const sorte = ent(0, 3)
      if (sorte === 0) return { enonce: `Écrire $${nb(v)}$ sous la forme d'un pourcentage.`, reponse: pcs(pc), faux: fausses(pcs(pc), [pcs(v * 10), pcs(v), pcs(pc * 10), pcs(pc / 100)]) }
      if (sorte === 1) return { enonce: `Écrire $${pcs(pc)}$ sous la forme d'un nombre décimal.`, reponse: nb(v), faux: fausses(nb(v), [nb(pc), nb(v * 10), nb(pc / 10), nb(v / 10)].filter(t => !/\{,\}\d{3}/.test(t))) }
      if (sorte === 2) return { enonce: `Écrire $${pcs(pc)}$ sous la forme d'une fraction irréductible.`, reponse: frac(n, d),
        faux: fausses(frac(n, d), [frac(d, n), frac(pc, 10), frac(1, pc), frac(n, 10 * d)].filter(t => t !== frac(n, d))) }
      return { enonce: `Écrire $${frac(n, d)}$ sous la forme d'un pourcentage.`, reponse: pcs(pc), faux: fausses(pcs(pc), [pcs(n * 10 + d), pcs(n + d), pcs(d), pcs(pc / 10)]) }
    },
  },
  {
    id: 'fractions-quelconques', theme: 'Nombres rationnels', titre: 'Fractions de dénominateurs quelconques',
    programme: 'Additionner et soustraire des fractions de dénominateurs quelconques.', application: true,
    generer() {
      // Deux dénominateurs premiers entre eux, petits : 1/2 + 1/3, 2/3 − 1/4…
      let d1: number, d2: number
      do { d1 = ent(2, 6); d2 = ent(2, 7) } while (pgcd(d1, d2) !== 1)
      let n1: number, n2: number
      do { n1 = ent(1, d1 - 1); n2 = ent(1, d2 - 1) } while (pgcd(n1, d1) !== 1 || pgcd(n2, d2) !== 1)
      const moins = Math.random() < 0.4 && n1 * d2 > n2 * d1
      const num = moins ? n1 * d2 - n2 * d1 : n1 * d2 + n2 * d1
      return { enonce: `Calculer : $${frac(n1, d1)} ${moins ? '-' : '+'} ${frac(n2, d2)}$`, reponse: irreductible(num, d1 * d2) }
    },
  },
  {
    id: 'fractions-probleme', theme: 'Nombres rationnels', titre: 'Un problème avec des fractions',
    programme: 'Résoudre des problèmes avec des additions et soustractions de fractions.', application: true,
    generer() {
      let d1: number, d2: number
      do { d1 = choix([2, 3, 4, 5, 6, 8]); d2 = choix([3, 4, 5, 6, 8, 10, 12]) } while (d1 === d2 || 1 / d1 + 1 / d2 >= 1)
      const D = d1 * d2 / pgcd(d1, d2), lu = D / d1 + D / d2
      const [qui, quoi, j1, j2] = choix<[string, string, string, string]>([['Léa', 'de son livre', 'lundi', 'mardi'], ['Tom', 'de la pizza', 'à midi', 'le soir'], ['Inès', 'du trajet', 'le matin', 'l\'après-midi'], ['Noah', 'de son argent de poche', 'en janvier', 'en février']])
      const verbe = quoi.includes('livre') ? 'a lu' : quoi.includes('pizza') ? 'a mangé' : quoi.includes('trajet') ? 'a parcouru' : 'a dépensé'
      const debut = `${qui} ${verbe} $${frac(1, d1)}$ ${quoi} ${j1} et $${frac(1, d2)}$ ${j2}.`
      return Math.random() < 0.5
        ? { enonce: `${debut} Quelle fraction ${quoi} cela représente-t-il en tout ?`, reponse: irreductible(lu, D) }
        : { enonce: `${debut} Quelle fraction ${quoi} reste-t-il ?`, reponse: irreductible(D - lu, D) }
    },
  },

  // ================= PUISSANCES =================
  {
    id: 'carres', theme: 'Puissances', titre: 'Carrés des nombres entiers',
    programme: 'Connaître les carrés des entiers de 0 à 12.', application: true,
    generer() {
      const n = ent(2, 12), v = n * n
      if (Math.random() < 0.3) return { enonce: `Quel nombre positif a pour carré $${v}$ ?`, reponse: nb(n), faux: fausses(nb(n), [nb(v / 2), nb(n + 1), nb(n - 1), nb(2 * n)]) }
      return { enonce: `Calculer : $${n}^2$`, reponse: nb(v), faux: fausses(nb(v), [nb(2 * n), nb(n + 2), nb(v + n), nb(Number(`${n}${n}`))], autour(v)) }
    },
  },
  {
    id: 'cubes', theme: 'Puissances', titre: 'Le carré et le cube d’un nombre',
    programme: 'Découvrir la notion de puissance : le carré et le cube ; connaître le cube de 10.', application: true,
    generer() {
      const sorte = ent(0, 2)
      if (sorte === 0) { const n = choix([2, 3, 4, 5, 10, 1, 0]); return { enonce: `Calculer : $${n}^3$`, reponse: grandNb(n ** 3) } }
      if (sorte === 1) {
        const n = ent(2, 12), e = choix([2, 3]), f = Array(e).fill(n).join(' \\times ')
        return { enonce: `Écrire sous la forme d'une puissance : $${f}$`, reponse: `${n}^${e}` }
      }
      const n = ent(2, 9) / 10
      return { enonce: `Calculer : $${nb(n)}^2$`, reponse: nb(arrondi(n * n)) }
    },
  },
  {
    id: 'ecrire-puissance', theme: 'Puissances', titre: 'Écrire un nombre comme un carré ou un cube',
    programme: 'Savoir écrire un nombre sous la forme d’une puissance 2 ou 3.', application: true,
    generer() {
      if (Math.random() < 0.6) { const n = ent(2, 12); return { enonce: `Écrire $${n * n}$ sous la forme du carré d'un nombre entier.`, reponse: `${n}^2` } }
      const n = choix([2, 3, 4, 5, 10]); return { enonce: `Écrire $${grandNb(n ** 3)}$ sous la forme du cube d'un nombre entier.`, reponse: `${n}^3` }
    },
    trou() {
      const [n, e] = choix<[number, number]>([[2, 3], [3, 3], [10, 3], [5, 3], [4, 3], [7, 2], [9, 2], [11, 2], [12, 2], [6, 2], [8, 2]])
      return unTrou('', [[`$${grandNb(n ** e)} = ${n}^{\\ldots}$`, nb(e)], [`$${grandNb(n ** e)} = \\ldots^${e}$`, nb(n)], [`$${n}^${e} = \\ldots$`, grandNb(n ** e)]])
    },
  },
  {
    id: 'expression-puissances', theme: 'Puissances', titre: 'Une expression avec des puissances',
    programme: 'Calculer des expressions contenant des puissances simples, additions, soustractions et produits.', application: true,
    generer() {
      const a = ent(2, 9), b = ent(2, 6), c = ent(2, 5), sorte = ent(0, 3)
      if (sorte === 0) return { enonce: `Calculer : $${a}^2 + ${b} \\times ${c}$`, reponse: nb(a * a + b * c) }
      if (sorte === 1) return { enonce: `Calculer : $${c} \\times ${a}^2$`, reponse: nb(c * a * a) }
      if (sorte === 2) { const [p, q] = a > b ? [a, b] : [b + 3, b]; return { enonce: `Calculer : $${p}^2 - ${q}^2$`, reponse: nb(p * p - q * q) } }
      const m = choix([2, 3]); return { enonce: `Calculer : $${m}^3 + ${a}$`, reponse: nb(m ** 3 + a) }
    },
  },
  {
    id: 'unites-aires-volumes', theme: 'Puissances', titre: 'Les unités d’aire et de volume',
    programme: 'Connaître les unités d’aires et de volume.',
    generer() {
      const [de, vers, k] = choix<[string, string, number]>([
        ['m^2', 'dm^2', 100], ['dm^2', 'cm^2', 100], ['m^2', 'cm^2', 10000], ['cm^2', 'mm^2', 100], ['km^2', 'm^2', 1000000],
        ['m^3', 'dm^3', 1000], ['dm^3', 'cm^3', 1000], ['cm^3', 'mm^3', 1000], ['cm^2', 'dm^2', 0.01], ['cm^3', 'dm^3', 0.001]])
      const x = choix([1, 1, ent(2, 9), ent(11, 95) / 10])
      const u = (t: string) => `\\text{ ${t.slice(0, -2)}}^${t.slice(-1)}`
      return { enonce: `Convertir : $${nb(x)}${u(de)} = \\ldots${u(vers)}$`, reponse: `${grandNb(arrondi(x * k))}${u(vers)}` }
    },
  },

  // ================= CALCUL LITTÉRAL ET ALGÉBRIQUE =================
  {
    id: 'motifs', theme: 'Calcul littéral et algébrique', titre: 'Poursuivre une suite de motifs',
    programme: 'Poursuivre une suite de motifs ; trouver le nombre d’éléments à une étape donnée.',
    generer() {
      type M = { pts: (n: number) => [number, number][]; f: (n: number) => number }
      const rect = (l: number, h: number) => Array.from({ length: l * h }, (_, i) => [i % l, Math.floor(i / l)] as [number, number])
      const SUITES: M[] = [
        { pts: n => rect(n + 1, 2), f: n => 2 * n + 2 },
        { pts: n => [...Array.from({ length: n + 1 }, (_, i) => [0, i] as [number, number]), ...Array.from({ length: n }, (_, i) => [i + 1, 0] as [number, number])], f: n => 2 * n + 1 },
        { pts: n => rect(n, n), f: n => n * n },
        { pts: n => Array.from({ length: n }, (_, x) => Array.from({ length: x + 1 }, (_, y) => [x, y] as [number, number])).flat(), f: n => n * (n + 1) / 2 },
        { pts: n => [[n, n] as [number, number], ...Array.from({ length: n }, (_, i) => [[i, n], [2 * n - i, n], [n, i], [n, 2 * n - i]] as [number, number][]).flat()], f: n => 4 * n + 1 },
        { pts: n => rect(n + 1, n), f: n => n * (n + 1) },
        { pts: n => rect(3 * n, 1), f: n => 3 * n },
      ]
      const s = choix(SUITES), k = choix([4, 5, 6, 10])
      const v = s.f(k), lin = s.f(3) + (k - 3) * (s.f(3) - s.f(2))
      return { enonce: `Combien de points comportera le motif $${k}$ ?`, figure: F.motifs(s.pts), reponse: nb(v),
        faux: fausses(nb(v), [nb(lin), nb(s.f(k - 1)), nb(s.f(k + 1)), nb(k * s.f(1)), nb(v + 1)], autour(v)) }
    },
  },
  {
    id: 'produire-formule', theme: 'Calcul littéral et algébrique', titre: 'Écrire une formule avec une lettre',
    programme: 'Produire des formules : double, triple, carré, successeur, prédécesseur, aire, périmètre.', application: true,
    generer() {
      const x = choix(['n', 'x', 'a', 'y', 't'])
      const [quoi, f] = choix<[string, string]>([
        [`le double de $${x}$`, `2${x}`], [`le triple de $${x}$`, `3${x}`], [`le carré de $${x}$`, `${x}^2`], [`le successeur de l'entier $${x}$`, `${x} + 1`],
        [`le prédécesseur de l'entier $${x}$`, `${x} - 1`], [`la moitié de $${x}$`, `${x} \\div 2`], [`le périmètre d'un carré de côté $${x}$`, `4${x}`],
        [`l'aire d'un carré de côté $${x}$`, `${x}^2`], [`le périmètre d'un triangle équilatéral de côté $${x}$`, `3${x}`], [`le double de $${x}$, augmenté de $5$`, `2${x} + 5`],
      ])
      return { enonce: `Écrire en fonction de $${x}$ : ${quoi}.`, reponse: f }
    },
  },
  {
    id: 'litteral-substituer', theme: 'Calcul littéral et algébrique', titre: 'Calculer une expression pour une valeur',
    programme: 'Calculer la valeur d’une expression littérale par substitution.', application: true,
    generer() {
      const a = ent(2, 9), b = ent(1, 12), x = ent(2, 9)
      const forme = ent(0, 2)
      let e: string, v: number, faux: string[]
      if (forme === 0) { e = `${a}x + ${b}`; v = a * x + b; faux = [`${a}${x}`.length < 4 ? nb(Number(`${a}${x}`) + b) : nb(a + x + b), nb(a * (x + b)), nb(a + x + b)] }
      else if (forme === 1) { e = `${a}(x + ${b})`; v = a * (x + b); faux = [nb(a * x + b), nb(a + x + b), nb(a * x * b)] }
      else { e = `x^2 + ${b}`; v = x * x + b; faux = [nb(2 * x + b), nb(x + b), nb((x + b) * (x + b))] }
      return { enonce: `Calculer $${e}$ pour $x = ${x}$.`, reponse: nb(v), faux: fausses(nb(v), faux, autour(v)) }
    },
  },
  {
    id: 'tester-egalite', theme: 'Calcul littéral et algébrique', titre: 'Pour quelle valeur l’égalité est-elle vraie ?',
    programme: 'Tester si une égalité comportant une variable est vraie ou fausse.', application: true,
    generer() {
      // Quatre valeurs à essayer : une seule vérifie l'égalité (jamais une chance sur deux)
      const x = choix(['x', 'a', 'n']), s = ent(1, 8), a = ent(2, 6), b = ent(1, 9), c = a * s + b
      const valeurs = melange([s, ...melange([0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10].filter(v => v !== s)).slice(0, 3)]).sort((p, q) => p - q)
      return { enonce: `Pour laquelle de ces valeurs de $${x}$ l'égalité $${a}${x} + ${b} = ${c}$ est-elle vraie : ${valeurs.map(v => `$${v}$`).join(', ')} ?`, reponse: `${x} = ${s}` }
    },
  },
  {
    id: 'developper-factoriser', theme: 'Calcul littéral et algébrique', titre: 'Développer ou factoriser k(x + a)',
    programme: 'Exploiter k(a + b) = ka + kb pour développer ou factoriser une expression littérale.', application: true,
    generer() {
      const k = ent(2, 9), a = ent(1, 9), x = choix(['x', 'a', 'y']), moins = Math.random() < 0.3
      const s = moins ? '-' : '+'
      return Math.random() < 0.6
        ? { enonce: `Développer : $${k}(${x} ${s} ${a})$`, reponse: `${k}${x} ${s} ${k * a}` }
        : { enonce: `Factoriser : $${k}${x} ${s} ${k * a}$`, reponse: `${k}(${x} ${s} ${a})` }
    },
    trou() {
      const k = ent(2, 9), a = ent(1, 9), x = choix(['x', 'a', 'y'])
      return unTrou('', [[`$${k}(${x} + ${a}) = ${k}${x} + \\ldots$`, nb(k * a)], [`$${k}${x} + ${k * a} = ${k}(${x} + \\ldots)$`, nb(a)], [`$${k}${x} + ${k * a} = \\ldots(${x} + ${a})$`, nb(k)]])
    },
  },
  {
    id: 'litteral-reduire', theme: 'Calcul littéral et algébrique', titre: 'Réduire une expression',
    programme: 'Réduire une expression littérale de la forme ax + b.', application: true,
    generer() {
      const a = ent(2, 9), b = ent(2, 9), c = ent(1, 9)
      const terme = (k: number) => k === 1 ? 'x' : `${k}x`
      if (Math.random() < 0.5) {
        const v = terme(a + b)
        return { enonce: `Réduire : $${terme(a)} + ${terme(b)}$`, reponse: v, faux: fausses(v, [`${a + b}x^2`, `${a * b}x`, `${a}${b}x`], () => terme(a + b + ent(1, 3))) }
      }
      const v = `${terme(a + b)} + ${c}`
      return { enonce: `Réduire : $${terme(a)} + ${c} + ${terme(b)}$`, reponse: v,
        faux: fausses(v, [`${a + b + c}x`, `${terme(a + b)}x + ${c}`, `${terme(a * b)} + ${c}`], () => `${terme(a + b)} + ${c + ent(1, 3)}`) }
    },
  },
  {
    id: 'equations', theme: 'Calcul littéral et algébrique', titre: 'Résoudre x + b = c ou ax = c',
    programme: 'Résoudre des équations du type ax = c ou x + b = c par les opérations inverses.', application: true,
    generer() {
      const x = choix(['x', 'y', 'n', 't'])
      if (Math.random() < 0.5) { const b = ent(2, 30), s = ent(1, 40); return { enonce: `Résoudre : $${x} + ${b} = ${s + b}$`, reponse: `${x} = ${s}` } }
      const a = ent(2, 9), s = ent(2, 12)
      return { enonce: `Résoudre : $${a}${x} = ${a * s}$`, reponse: `${x} = ${s}` }
    },
    trou() {
      const a = ent(2, 9), s = ent(2, 12), b = ent(2, 30)
      const x = choix(['x', 'y', 'n'])
      return unTrou('', [[`$${a}${x} = ${a * s}$ a pour solution $${x} = \\ldots$`, nb(s)], [`$${x} + ${b} = ${s + b}$ a pour solution $${x} = \\ldots$`, nb(s)]])
    },
  },

  // ================= REPÉRAGE =================
  {
    id: 'reperer-decimal', theme: 'Repérage', titre: 'Repérer un décimal sur une demi-droite graduée',
    programme: 'Repérer un nombre décimal sur une demi-droite graduée.',
    generer() {
      const debut = ent(0, 6), parts = choix([2, 4, 5, 10, 10])
      let k: number
      do { k = ent(1, 3 * parts - 1) } while (k % parts === 0)
      const x = debut + k / parts
      return { enonce: `Quelle est l'abscisse du point $A$ ?`, figure: F.droiteGraduee(debut, debut + 3, parts, x),
        reponse: nb(x), faux: fausses(nb(x), [nb(debut + k / 10), nb(x + 1 / parts), nb(x - 1 / parts), nb(debut + Math.floor(k / parts) + (k % parts) / 10), nb(x + 1)]) }
    },
  },
  {
    id: 'coordonnees', theme: 'Repérage', titre: 'Lire les coordonnées d’un point',
    programme: 'Dans un repère, lire les coordonnées d’un point.', application: true,
    generer() {
      let x: number, y: number
      do { x = ent(-4, 4); y = ent(-4, 4) } while (x === 0 && y === 0 || x === y)
      const c = (a: number, b: number) => `(${nb(a)}\\,;\\,${nb(b)})`
      return { enonce: `Quelles sont les coordonnées du point $A$ ?`, figure: F.repere(x, y), reponse: c(x, y),
        faux: fausses(c(x, y), [c(y, x), c(-x, y), c(x, -y), c(-y, -x)]) }
    },
  },
  {
    id: 'placer-point', theme: 'Repérage', titre: 'Le point de coordonnées données',
    programme: 'Dans un repère, placer un point de coordonnées données.', application: true,
    generer() {
      // Le point cherché, et des pièges : coordonnées échangées, signes changés
      let x: number, y: number
      do { x = relNonNul(1, 5); y = relNonNul(1, 5) } while (Math.abs(x) === Math.abs(y))
      const lieux = [[x, y], [y, x], [-x, y], [x, -y], [-x, -y], [-y, -x]].filter((q, i, t) => t.findIndex(r => r[0] === q[0] && r[1] === q[1]) === i).slice(0, 4)
      const noms = melange(['E', 'F', 'G', 'H'])
      const pts = melange(lieux).map((q, i) => ({ x: q[0], y: q[1], nom: noms[i] }))
      const bon = pts.find(p => p.x === x && p.y === y)!
      return { enonce: `Quel point a pour coordonnées $${coord(x, y)}$ ?`, figure: F.reperePoints(pts), reponse: mot(`$${bon.nom}$`) }
    },
  },

  // ================= REPRÉSENTATION DE L'ESPACE =================
  {
    id: 'vues-cubes', theme: 'Représentation de l’espace', titre: 'Vues d’un empilement de cubes',
    programme: 'Reconnaître des vues (de dessus, de face…) d’empilements de cubes.',
    generer() {
      const h = empilementAuHasard()
      const X = h.length, Y = h[0].length, H = Math.max(...h.flat())
      const dessus = Array.from({ length: Y }, (_, i) => Array.from({ length: X }, (_, x) => h[x][Y - 1 - i] > 0))
      const face = Array.from({ length: H }, (_, i) => Array.from({ length: X }, (_, x) => Math.max(...h[x]) > H - 1 - i))
      const droite = Array.from({ length: H }, (_, i) => Array.from({ length: Y }, (_, y) => Math.max(...h.map(c => c[y])) > H - 1 - i))
      // Combien de carrés sur la vue : on la dessine dans sa tête, on ne
      // compte pas les cubes (l'erreur : le nombre de cubes)
      const vue = choix(['dessus', 'face', 'droite'] as const)
      const v = { dessus, face, droite }[vue].flat().filter(Boolean).length
      const total = h.flat().reduce((s, x) => s + x, 0)
      const nom = { dessus: 'de dessus', face: 'de face', droite: 'de droite' }[vue]
      return { enonce: `Combien de carrés compte la vue ${nom} de cet empilement ?`, figure: F.empilement(h),
        reponse: nb(v), faux: fausses(nb(v), [nb(total), nb(v + 1), nb(v - 1)].filter(t => Number(t) > 0)) }
    },
  },
  {
    id: 'denombrer-cubes', theme: 'Représentation de l’espace', titre: 'Dénombrer les cubes d’un empilement',
    programme: 'Dénombrer des cubes dans des empilements.',
    generer() {
      const h = empilementAuHasard()
      const total = h.flat().reduce((s, v) => s + v, 0)
      // Ce qu'on voit sans penser aux cubes cachés : les colonnes de devant et du dessus
      const vus = h.reduce((s, col) => s + col.filter(v => v > 0).length, 0) + Math.max(...h.map(c => c[0])) - 1
      return { enonce: `Combien de cubes compte cet empilement ? (Il n'y a pas de trou caché.)`, figure: F.empilement(h), reponse: nb(total),
        faux: fausses(nb(total), [nb(vus), nb(total - 1), nb(total + 1), nb(total - 2)].filter(t => Number(t) > 0), autour(total)) }
    },
  },
  {
    id: 'cavaliere', theme: 'Représentation de l’espace', titre: 'Pavé droit en perspective cavalière',
    programme: 'Reconnaître un cube, un pavé représenté en perspective cavalière.',
    generer() {
      // Trois longueurs différentes ; on demande une arête parallèle à
      // l'une d'elles, souvent une fuyante (dessinée plus courte) ou une
      // arête cachée
      let l: number, h: number, p: number
      do { l = ent(4, 8); h = ent(2, 5); p = ent(3, 7) } while (new Set([l, h, p]).size < 3)
      const [arete, v] = choix<[string, number]>([['DC', l], ['HG', l], ['EF', l], ['AD', h], ['FG', h], ['EH', h], ['AE', p], ['CG', p], ['DH', p], ['CG', p], ['DH', p]])
      return { enonce: `Ce pavé droit est dessiné en perspective cavalière. Quelle est la longueur réelle de l'arête $[${arete}]$ ?`, figure: F.paveCote(l, h, p),
        reponse: unite(nb(v), 'cm'), faux: fausses(unite(nb(v), 'cm'), [l, h, p].filter(x => x !== v).map(x => unite(nb(x), 'cm'))) }
    },
  },
  {
    id: 'patron-cube', theme: 'Représentation de l’espace', titre: 'Patron de cube : les faces opposées',
    programme: 'Reconnaître un patron d’un cube.',
    generer() {
      let c: F.Cases
      do c = F.hexomino(); while (!F.estPatronDeCube(c))
      // Les numéros dans l'ordre de lecture (de haut en bas, de gauche à droite)
      const ordre = c.map((_, i) => i).sort((i, j) => c[i][1] - c[j][1] || c[i][0] - c[j][0])
      const numeros = c.map((_, i) => ordre.indexOf(i) + 1)
      const i = ent(0, 5), o = F.caseOpposee(c, i)
      return { enonce: `On plie ce patron pour former un cube. Quelle face sera opposée à la face $${numeros[i]}$ ?`, figure: F.patron(c, numeros),
        reponse: nb(numeros[o]), faux: numeros.filter((n, j) => j !== o && j !== i).slice(0, 3).map(nb) }
    },
  },
  {
    id: 'volumes', theme: 'Représentation de l’espace', titre: 'Volume d’un cube, d’un pavé, d’un prisme droit',
    programme: 'Calculer le volume du cube, du pavé droit, du prisme droit.', application: true,
    generer() {
      const sorte = ent(0, 2)
      if (sorte === 0) { const a = ent(2, 10); return { enonce: `Quel est le volume d'un cube de $${a}$ cm d'arête ?`, reponse: cm3(grandNb(a ** 3)) } }
      if (sorte === 1) { const l = ent(2, 10), w = ent(2, 6), h = ent(2, 10); return { enonce: `Quel est le volume d'un pavé droit de $${l}$ cm sur $${w}$ cm sur $${h}$ cm ?`, reponse: cm3(grandNb(l * w * h)) } }
      const B = ent(3, 40), h = ent(2, 12)
      return { enonce: `Un prisme droit a une base d'aire $${B}\\text{ cm}^2$ et une hauteur de $${h}$ cm. Quel est son volume ?`, reponse: cm3(grandNb(B * h)) }
    },
  },
  {
    id: 'volume-capacite', theme: 'Représentation de l’espace', titre: 'Volumes et capacités',
    programme: 'Connaître et convertir des unités usuelles de volume et de capacité.', application: true,
    generer() {
      const [de, vers, k] = choix<[string, string, number]>([
        ['L', 'dm^3', 1], ['dm^3', 'L', 1], ['L', 'cL', 100], ['L', 'mL', 1000], ['cL', 'L', 0.01], ['mL', 'L', 0.001], ['cm^3', 'mL', 1], ['m^3', 'L', 1000], ['L', 'cm^3', 1000], ['dL', 'L', 0.1]])
      const x = k < 1 ? choix([10 * ent(2, 9), ent(11, 99), 250, 500, 750]) : choix([ent(2, 9), ent(11, 95) / 10, 10 * ent(2, 50)])
      const u = (t: string) => t.endsWith('^3') ? `\\text{ ${t.slice(0, -2)}}^3` : `\\text{ ${t}}`
      return { enonce: `Convertir : $${nb(x)}${u(de)} = \\ldots${u(vers)}$`, reponse: `${grandNb(arrondi(x * k))}${u(vers)}` }
    },
  },
  {
    id: 'disque-cylindre', theme: 'Représentation de l’espace', titre: 'Aire du disque, volume du cylindre',
    programme: 'Calculer l’aire du disque, le volume du cylindre de révolution.', application: true,
    generer() {
      const r = ent(1, 9)
      if (Math.random() < 0.5) {
        return Math.random() < 0.7
          ? { enonce: `Quelle est l'aire d'un disque de rayon $${r}$ cm ? (valeur exacte)`, reponse: cm2(piFois(r * r)) }
          : { enonce: `Quelle est l'aire d'un disque de diamètre $${2 * r}$ cm ? (valeur exacte)`, reponse: cm2(piFois(r * r)) }
      }
      const h = ent(2, 10), rr = ent(1, 5)
      return { enonce: `Quel est le volume d'un cylindre de rayon $${rr}$ cm et de hauteur $${h}$ cm ? (valeur exacte)`, reponse: cm3(piFois(rr * rr * h)) }
    },
  },

  // ================= TRANSFORMATIONS =================
  {
    id: 'symetrie-axiale', theme: 'Transformations', titre: 'Construire le symétrique d’un point',
    programme: 'Construire le symétrique d’un point par symétrie axiale, sur quadrillage.',
    generer() {
      // Un axe parallèle à un axe du repère (sans être l'un d'eux), A à 1 à
      // 4 carreaux de lui, et son symétrique A' encore dans le repère (de −5 à 5)
      const axe = choix(['vertical', 'horizontal'] as const)
      let k: number, a: number, b: number, s: number
      do { k = ent(-3, 3); a = k + choix([-1, 1]) * ent(1, 4); b = ent(-4, 4); s = 2 * k - a } while (k === 0 || Math.abs(a) > 5 || Math.abs(s) > 5 || a === 0 || s === 0)
      const [x, y, xs, ys] = axe === 'vertical' ? [a, b, s, b] : [b, a, b, s]
      const c = (u: number, v: number) => `(${nb(u)}\\,;\\,${nb(v)})`
      return { enonce: `Quelles sont les coordonnées du point $A'$, symétrique du point $A$ par rapport à la droite $(d)$ ?`, figure: F.symetriePoint(x, y, axe, k),
        reponse: c(xs, ys), faux: fausses(c(xs, ys), [c(-x, y), c(x, -y), axe === 'vertical' ? c(xs, -ys) : c(-xs, ys)]) }
    },
  },
  {
    id: 'demi-tour', theme: 'Transformations', titre: 'Le symétrique d’un point par demi-tour',
    programme: 'Définir le demi-tour, ou symétrie centrale : le symétrique d’un point.', application: true,
    generer() {
      let ax: number, ay: number, ix: number, iy: number, bx: number, by: number
      do { ix = ent(-2, 2); iy = ent(-2, 2); ax = ent(-4, 4); ay = ent(-4, 4); bx = 2 * ix - ax; by = 2 * iy - ay } while ((ax === ix && ay === iy) || Math.abs(bx) > 5 || Math.abs(by) > 5)
      const [A, I] = choix([['A', 'I'], ['B', 'O'], ['M', 'K'], ['E', 'C']])
      return { enonce: `Quelles sont les coordonnées du point $${A}'$, symétrique du point $${A}$ par le demi-tour de centre $${I}$ ?`, figure: F.reperePoints([{ x: ax, y: ay, nom: A }, { x: ix, y: iy, nom: I, centre: true }]), reponse: coord(bx, by) }
    },
  },
  {
    id: 'demi-tour-proprietes', theme: 'Transformations', titre: 'Les propriétés du demi-tour',
    programme: 'Connaître les propriétés du demi-tour (longueurs, angles, milieu).', application: true,
    generer() {
      const [A, B] = deuxPts(), sorte = ent(0, 2), l = nb(ent(2, 18) / 2)
      if (sorte === 0) return { enonce: `Le segment $[${A}${B}]$ mesure $${l}$ cm. Combien mesure son symétrique par un demi-tour ?`, reponse: unite(l, 'cm') }
      if (sorte === 1) {
        const d = ent(2, 9)
        return { enonce: `$${A}'$ est le symétrique de $${A}$ par le demi-tour de centre $O$, et $O${A} = ${d}$ cm. Combien mesure $${A}${A}'$ ?`, reponse: unite(nb(2 * d), 'cm') }
      }
      const m = ent(20, 160)
      return { enonce: `Un angle mesure $${m}°$. Combien mesure son symétrique par un demi-tour ?`, reponse: deg(m) }
    },
  },

  // ================= ANGLES =================
  {
    id: 'angles-nommer', theme: 'Angles', titre: 'Reconnaître et nommer les angles',
    programme: 'Reconnaître et citer des angles : nul, aigu, droit, obtus, plat, plein ; adjacents, opposés par le sommet, supplémentaires.',
    generer() {
      if (Math.random() < 0.6) {
        const sorte = choix(['aigu', 'aigu', 'obtus', 'obtus', 'droit', 'plat', 'nul', 'plein'])
        const m = { aigu: ent(15, 75), obtus: ent(105, 165), droit: 90, plat: 180, nul: 0, plein: 360 }[sorte]!
        const LOT = ['aigu', 'obtus', 'droit', 'plat', 'nul', 'plein']
        const proches: Record<string, string[]> = { aigu: ['obtus', 'droit', 'nul'], obtus: ['aigu', 'droit', 'plat'], droit: ['aigu', 'obtus', 'plat'], plat: ['obtus', 'plein', 'nul'], nul: ['plein', 'aigu', 'plat'], plein: ['plat', 'nul', 'obtus'] }
        void LOT
        return { enonce: `Comment appelle-t-on cet angle ?`, figure: F.unAngle(m, ent(0, 11) * 30), reponse: mot('un angle ' + sorte), faux: proches[sorte].map(x => mot('un angle ' + x)) }
      }
      const sorte = choix(['adjacents', 'opposes', 'supplementaires', 'complementaires'] as const)
      let m1 = 0, m2 = 0
      if (sorte === 'adjacents') { do { m1 = ent(25, 70); m2 = ent(25, 70) } while (m1 + m2 === 90 || m1 === m2) }
      else if (sorte === 'opposes') m1 = ent(50, 70)
      else { const t = sorte === 'supplementaires' ? 180 : 90; m1 = ent(t === 180 ? 40 : 20, t === 180 ? 140 : 70); m2 = t - m1 }
      const NOMS = { adjacents: 'adjacents', opposes: 'opposés par le sommet', supplementaires: 'supplémentaires', complementaires: 'complémentaires' }
      return { enonce: `Comment appelle-t-on ces deux angles ?`, figure: F.deuxAngles(sorte, m1, m2), reponse: mot(NOMS[sorte]), faux: Object.values(NOMS).filter(x => x !== NOMS[sorte]).map(mot) }
    },
  },
  {
    id: 'angle-manquant', theme: 'Angles', titre: 'Angle droit, angle plat : l’angle qui manque',
    programme: 'Savoir qu’un angle droit mesure 90°, un angle plat 180° ; connaître les angles de l’équerre.',
    generer() {
      const sorte = ent(0, 2)
      if (sorte === 0) {
        const m = ent(20, 160)
        return { enonce: `Les points $x$, $O$ et $y$ sont alignés dans cet ordre : $\\widehat{xOy}$ est un angle plat. Si $\\widehat{xOz} = ${m}°$, combien mesure $\\widehat{zOy}$ ?`, reponse: deg(180 - m) }
      }
      if (sorte === 1) {
        const m = ent(10, 80)
        return { enonce: `L'angle $\\widehat{xOy}$ est droit et $[Oz)$ est entre ses côtés. Si $\\widehat{xOz} = ${m}°$, combien mesure $\\widehat{zOy}$ ?`, reponse: deg(90 - m) }
      }
      const [a, b] = choix<[number, number]>([[30, 60], [60, 30], [45, 45], [90, 30], [90, 45], [30, 90], [45, 90], [90, 60], [60, 90]])
      return { enonce: `Une équerre a deux angles de $${a}°$ et $${b}°$. Combien mesure son troisième angle ?`, reponse: deg(180 - a - b) }
    },
  },
  {
    id: 'bissectrice', theme: 'Angles', titre: 'Reconnaître une bissectrice',
    programme: 'Reconnaître une bissectrice.',
    generer() {
      if (Math.random() < 0.5) {
        const m = ent(15, 80)
        return { enonce: `La demi-droite $[Oz)$ est la bissectrice de l'angle $\\widehat{xOy}$, et $\\widehat{xOz} = ${m}°$. Combien mesure l'angle $\\widehat{xOy}$ ?`, figure: F.bissectriceFig(m, m), reponse: deg(2 * m),
          faux: fausses(deg(2 * m), [deg(m), deg(m / 2), deg(180 - m)]) }
      }
      const t = 2 * ent(15, 80)
      return { enonce: `La demi-droite $[Oz)$ est la bissectrice de l'angle $\\widehat{xOy}$, qui mesure $${t}°$. Combien mesure l'angle $\\widehat{xOz}$ ?`, reponse: deg(t / 2),
        faux: fausses(deg(t / 2), [deg(t), deg(2 * t), deg(180 - t), deg(90 - t / 2)].filter(x => !x.startsWith('-') && x !== '0°')) }
    },
  },
  {
    id: 'paralleles-angles', theme: 'Angles', titre: 'Droites parallèles : angles alternes-internes, correspondants',
    programme: 'Caractériser le parallélisme par les angles : angles alternes-internes, angles correspondants.', application: true,
    generer() {
      let m: number
      do m = ent(35, 145); while (Math.abs(m - 90) < 8)
      const [i, j, nomRel] = choix<[number, number, string]>([[0, 0, 'correspondants'], [1, 1, 'correspondants'], [2, 2, 'correspondants'], [3, 3, 'correspondants'], [2, 0, 'alternes-internes'], [3, 1, 'alternes-internes']])
      const haut = Math.random() < 0.5
      // L'angle connu est dans le secteur i d'une intersection, l'angle cherché dans le secteur j de l'autre
      const valeur = (s: number) => s % 2 === 0 ? m : 180 - m
      return { enonce: `Les droites $(d)$ et $(d')$ sont parallèles. Combien mesure l'angle marqué d'un point d'interrogation ?`, figure: F.parallelesSecante(m, i, j, haut, valeur(i)), reponse: mot(`$${valeur(j)}°$ (angles ${nomRel})`) }
    },
  },

  // ================= TRIANGLES =================
  {
    id: 'triangle-nature', theme: 'Triangles', titre: 'Triangle isocèle, équilatéral ou rectangle',
    programme: 'Reconnaître un triangle isocèle, équilatéral ou rectangle à partir d’un schéma codé.',
    generer() {
      const sorte = choix(['isocele', 'equilateral', 'rectangle', 'rectangle-isocele', 'quelconque'] as F.Triangle[])
      const NOMS: Record<F.Triangle, string> = { isocele: 'isocèle', equilateral: 'équilatéral', rectangle: 'rectangle', 'rectangle-isocele': 'rectangle isocèle', quelconque: 'quelconque' }
      return { enonce: `D'après le codage, quelle est la nature de ce triangle ?`, figure: F.triangleCode(sorte, ent(0, 23) * 15), ...parmi(NOMS[sorte], Object.values(NOMS)) }
    },
  },
  {
    id: 'angles-triangle', theme: 'Triangles', titre: 'Somme des angles : le troisième angle',
    programme: 'Connaître la somme des angles d’un triangle ; calculer le troisième angle.',
    generer() {
      if (Math.random() < 0.3) {
        const s = 2 * ent(10, 70)
        return { enonce: `$ABC$ est isocèle en $A$ et $\\widehat{BAC} = ${s}°$. Combien mesure $\\widehat{ABC}$ ?`, reponse: deg((180 - s) / 2),
          faux: fausses(deg((180 - s) / 2), [deg(180 - s), deg(s), deg((360 - s) / 2), deg(90 - s / 2 + 10)]) }
      }
      const a = ent(25, 95), b = ent(20, 150 - a), v = 180 - a - b
      return { enonce: `Dans un triangle, deux angles mesurent $${a}°$ et $${b}°$. Combien mesure le troisième ?`, reponse: deg(v),
        faux: fausses(deg(v), [deg(360 - a - b), deg(a + b), deg(90 - Math.min(a, b) > 0 ? 90 - Math.min(a, b) : v + 10)], () => deg(v + choix([-10, -5, 5, 10]))) }
    },
  },
  {
    id: 'mediatrice', theme: 'Triangles', titre: 'Médiatrice et cercle circonscrit',
    programme: 'Connaître la notion de médiatrice, de cercle circonscrit.',
    generer() {
      const [P, Q] = choix(['AB', 'EF', 'IJ', 'RS', 'CD'])
      const l = ent(2, 12) + choix([0, 0, 0.5])
      if (Math.random() < 0.5) {
        return { enonce: `Le point $M$ est sur la médiatrice de $[${P}${Q}]$ et $M${P} = ${nb(l)}$ cm. Combien mesure $M${Q}$ ?`, figure: F.mediatriceFig(true, true, ent(-6, 6) * 6, P + Q), reponse: unite(nb(l), 'cm'),
          faux: fausses(unite(nb(l), 'cm'), [unite(nb(2 * l), 'cm'), unite(nb(l / 2), 'cm'), mot('On ne peut pas savoir')]) }
      }
      const [A, B, C] = choix(['ABC', 'EFG', 'RST', 'IJK'])
      return { enonce: `Le point $O$ est le centre du cercle circonscrit au triangle $${A}${B}${C}$, et $O${A} = ${nb(l)}$ cm. Combien mesure $O${C}$ ?`, reponse: unite(nb(l), 'cm'),
        faux: fausses(unite(nb(l), 'cm'), [unite(nb(2 * l), 'cm'), unite(nb(l / 2), 'cm')]) }
    },
  },
  {
    id: 'aire-triangle', theme: 'Triangles', titre: 'L’aire d’un triangle',
    programme: 'Calculer l’aire d’un triangle.', application: true,
    generer() {
      const [A, B, C] = tri(), b = ent(3, 14), h = 2 * ent(1, 7)
      return Math.random() < 0.6
        ? { enonce: `Dans le triangle $${A}${B}${C}$, la hauteur issue de $${A}$ mesure $${h}$ cm et $${B}${C} = ${b}$ cm. Quelle est son aire ?`, reponse: cm2(nb(b * h / 2)) }
        : { enonce: `Un triangle rectangle a des côtés de l'angle droit de $${b}$ cm et $${h}$ cm. Quelle est son aire ?`, reponse: cm2(nb(b * h / 2)) }
    },
  },
  {
    id: 'hauteur-mediane', theme: 'Triangles', titre: 'Hauteur, médiane ou médiatrice ?',
    programme: 'Définir et tracer les hauteurs et les médianes d’un triangle ; la médiatrice d’un côté.', application: true,
    generer() {
      const sorte = choix<F.Remarquable>(['mediatrice', 'mediane', 'hauteur'])
      const [A, B, C] = tri()
      const nom = { mediatrice: `la médiatrice de $[${B}${C}]$`, mediane: `la médiane issue de $${A}$`, hauteur: `la hauteur issue de $${A}$`, bissectrice: '' }[sorte]
      return { enonce: `Dans le triangle $${A}${B}${C}$, comment s'appelle la droite $(d)$ ?`, figure: F.droiteRemarquable(sorte, A + B + C, ent(-3, 3) * 15), reponse: mot(nom) }
    },
  },

  // ================= PARALLÉLOGRAMMES =================
  {
    id: 'polygones', theme: 'Parallélogrammes', titre: 'Nommer un quadrilatère ou un polygone',
    programme: 'Reconnaître un quadrilatère, un parallélogramme, un rectangle, un losange, un carré, un trapèze, un pentagone, un hexagone.',
    generer() {
      const sorte = choix(['carre', 'rectangle', 'losange', 'parallelogramme', 'trapeze', 'pentagone', 'hexagone', 'quadrilatere'] as F.Polygone[])
      const NOMS: Record<F.Polygone, string> = { carre: 'un carré', rectangle: 'un rectangle', losange: 'un losange', parallelogramme: 'un parallélogramme', trapeze: 'un trapèze', pentagone: 'un pentagone', hexagone: 'un hexagone', quadrilatere: 'un quadrilatère quelconque' }
      const proches: Record<F.Polygone, F.Polygone[]> = { carre: ['losange', 'rectangle', 'parallelogramme'], rectangle: ['carre', 'parallelogramme', 'losange'], losange: ['carre', 'parallelogramme', 'rectangle'], parallelogramme: ['losange', 'rectangle', 'trapeze'], trapeze: ['parallelogramme', 'quadrilatere', 'rectangle'], pentagone: ['hexagone', 'quadrilatere', 'trapeze'], hexagone: ['pentagone', 'quadrilatere', 'losange'], quadrilatere: ['trapeze', 'parallelogramme', 'losange'] }
      return { enonce: `Comment s'appelle ce polygone ?`, figure: F.polygone(sorte, ent(0, 23) * 15), reponse: mot(NOMS[sorte]), faux: proches[sorte].map(x => mot(NOMS[x])) }
    },
  },
  {
    id: 'parallelogramme-code', theme: 'Parallélogrammes', titre: 'Le codage d’un parallélogramme particulier',
    programme: 'Exploiter le codage d’une figure pour identifier des parallélogrammes particuliers.',
    generer() {
      const lg = Math.random() < 0.5, dr = Math.random() < 0.5
      const noms = choix(['ABCD', 'EFGH', 'IJKL', 'MNOP', 'RSTU'])
      const LOT = ['un carré', 'un losange', 'un rectangle', 'un parallélogramme quelconque']
      const bonne = lg && dr ? LOT[0] : lg ? LOT[1] : dr ? LOT[2] : LOT[3]
      return { enonce: `$${noms}$ est un parallélogramme. D'après le codage, quelle est sa nature ?`, figure: F.parallelogrammeCode(lg, dr, noms, ent(-4, 4) * 10, ent(0, 3)), reponse: mot(bonne), faux: LOT.filter(x => x !== bonne).map(mot) }
    },
  },
  {
    id: 'proprietes-parallelogramme', theme: 'Parallélogrammes', titre: 'Côtés et diagonales d’un parallélogramme',
    programme: 'Connaître les propriétés des côtés opposés et des diagonales d’un parallélogramme.', application: true,
    generer() {
      const [A, B, C, D] = quad(), O = 'O', sorte = ent(0, 2)
      if (sorte === 0) { const a = nb(ent(4, 24) / 2); return { enonce: `$${A}${B}${C}${D}$ est un parallélogramme et $${A}${B} = ${a}$ cm. Combien mesure $${C}${D}$ ?`, reponse: unite(a, 'cm') } }
      if (sorte === 1) { const d = ent(3, 12); return { enonce: `$${A}${B}${C}${D}$ est un parallélogramme de centre $${O}$ et $${A}${C} = ${2 * d}$ cm. Combien mesure $${O}${A}$ ?`, reponse: unite(nb(d), 'cm') } }
      const d = ent(4, 20) / 2
      return { enonce: `$${A}${B}${C}${D}$ est un parallélogramme de centre $${O}$ et $${O}${B} = ${nb(d)}$ cm. Combien mesure $${B}${D}$ ?`, reponse: unite(nb(2 * d), 'cm') }
    },
  },
  {
    id: 'diagonales-nature', theme: 'Parallélogrammes', titre: 'La nature d’un quadrilatère par ses diagonales',
    programme: 'Utiliser une propriété caractéristique des diagonales pour donner la nature d’un quadrilatère.', application: true,
    generer() {
      const eg = Math.random() < 0.5, pe = Math.random() < 0.5
      const noms = quad().join('')
      const nature = eg && pe ? 'un carré' : eg ? 'un rectangle' : pe ? 'un losange' : 'un parallélogramme'
      return { enonce: `D'après le codage de ses diagonales, quelle est la nature du quadrilatère $${noms}$ ?`, figure: F.diagonalesCodees(eg, pe, noms, ent(-6, 6) * 10), reponse: mot(nature) }
    },
  },
  {
    id: 'aire-parallelogramme', theme: 'Parallélogrammes', titre: 'L’aire d’un parallélogramme',
    programme: 'Savoir calculer l’aire d’un parallélogramme.', application: true,
    generer() {
      const [A, B, C, D] = quad(), b = ent(3, 12), h = ent(2, 9)
      const sorte = ent(0, 2)
      if (sorte === 0) return { enonce: `Le parallélogramme $${A}${B}${C}${D}$ a un côté $[${A}${B}]$ de $${b}$ cm, et la hauteur relative à ce côté mesure $${h}$ cm. Quelle est son aire ?`, reponse: cm2(nb(b * h)) }
      if (sorte === 1) return { enonce: `Quelle est l'aire d'un rectangle de $${b}$ cm sur $${h}$ cm ?`, reponse: cm2(nb(b * h)) }
      return { enonce: `Le parallélogramme $${A}${B}${C}${D}$ a une aire de $${b * h}\\text{ cm}^2$ et $${A}${B} = ${b}$ cm. Combien mesure la hauteur relative à $[${A}${B}]$ ?`, reponse: unite(nb(h), 'cm') }
    },
  },
  {
    id: 'conversions-aires', theme: 'Parallélogrammes', titre: 'Convertir des longueurs et des aires',
    programme: 'Résoudre des problèmes faisant appel à des conversions d’unités de longueur et d’aire.', application: true,
    generer() {
      const L: [string, string, number][] = [['m', 'cm', 100], ['cm', 'm', 0.01], ['km', 'm', 1000], ['mm', 'cm', 0.1], ['cm', 'mm', 10], ['dm', 'cm', 10], ['m', 'mm', 1000]]
      const A: [string, string, number][] = [['m^2', 'dm^2', 100], ['m^2', 'cm^2', 10000], ['dm^2', 'cm^2', 100], ['cm^2', 'dm^2', 0.01], ['dm^2', 'm^2', 0.01], ['ha', 'm^2', 10000], ['km^2', 'ha', 100]]
      const [de, vers, k] = choix(Math.random() < 0.5 ? L : A)
      const x = choix([ent(2, 95) / 10, ent(2, 99), ent(101, 999) / 100])
      const u = (t: string) => t.endsWith('^2') ? `\\text{ ${t.slice(0, -2)}}^2` : `\\text{ ${t}}`
      return { enonce: `Convertir : $${nb(x)}${u(de)} = \\ldots${u(vers)}$`, reponse: `${grandNb(arrondi(x * k))}${u(vers)}` }
    },
  },

  // ================= STATISTIQUES =================
  {
    id: 'moyenne', theme: 'Statistiques', titre: 'Calculer une moyenne',
    programme: 'Calculer la moyenne simple d’une série de données.', application: true,
    generer() {
      const n = choix([3, 4, 5])
      let l: number[]
      do { l = Array.from({ length: n }, () => ent(4, 20)) } while ((l.reduce((s, x) => s + x, 0) * 10) % n !== 0)
      const somme = l.reduce((s, x) => s + x, 0), v = somme / n
      const tri = [...l].sort((x, y) => x - y)
      return { enonce: `Quelle est la moyenne de : $${l.join(' \\; ; \\; ')}$ ?`, reponse: nb(v),
        faux: fausses(nb(v), [nb(somme), nb(tri[Math.floor(n / 2)]), nb((Math.max(...l) + Math.min(...l)) / 2)], autour(v)) }
    },
  },
  {
    id: 'frequence', theme: 'Statistiques', titre: 'Effectifs et fréquences',
    programme: 'Calculer des effectifs et des fréquences (fraction, écriture décimale, pourcentage).', application: true,
    generer() {
      const N = choix([10, 20, 25, 40, 50]), e = ent(2, N - 2)
      const [qui, quoi] = choix<[string, string]>([['élèves', 'viennent à vélo'], ['élèves', 'ont un chat'], ['personnes', 'ont répondu « oui »'], ['lancers de dé', 'ont donné $6$'], ['élèves', 'mangent à la cantine']])
      const sorte = ent(0, 2)
      if (sorte === 0) return { enonce: `Sur $${N}$ ${qui}, $${e}$ ${quoi}. Quelle est la fréquence de cette réponse, en pourcentage ?`, reponse: `${nb(e / N * 100)}\\,\\%` }
      if (sorte === 1) return { enonce: `Sur $${N}$ ${qui}, $${e}$ ${quoi}. Quelle est la fréquence de cette réponse, sous forme de fraction irréductible ?`, reponse: irreductible(e, N) }
      const p = choix([10, 20, 25, 50, 40, 30]), M = choix([20, 40, 60, 80, 100, 200])
      return { enonce: `Dans un groupe de $${M}$ ${qui}, la fréquence de ceux qui ${quoi} est $${p}\\,\\%$. Quel est leur effectif ?`, reponse: nb(M * p / 100) }
    },
  },
  {
    id: 'lire-tableau', theme: 'Statistiques', titre: 'Lire un tableau d’effectifs',
    programme: 'Lire et interpréter des informations présentées sous forme de tableaux.', application: true,
    generer() {
      const [titre, cats] = choix<[string, string[]]>([['Sport préféré', ['Foot', 'Basket', 'Danse', 'Judo']], ['Moyen de transport', ['Bus', 'Vélo', 'À pied', 'Voiture']], ['Fruit préféré', ['Pomme', 'Fraise', 'Kiwi', 'Mangue']]])
      const eff = cats.map(() => ent(2, 12)), total = eff.reduce((s, x) => s + x, 0)
      const t = tableau([`\\text{${titre}}`, ...cats.map(c => `\\text{${c}}`)], ['\\text{Effectif}', ...eff.map(nb)])
      const sorte = ent(0, 2)
      if (sorte === 0) return { enonce: `Quel est l'effectif total ? $${t}$`, reponse: nb(total) }
      const [a, b] = melange([0, 1, 2, 3]).slice(0, 2)
      if (sorte === 1 && eff[a] !== eff[b]) return { enonce: `Combien d'élèves de plus ont choisi « ${eff[a] > eff[b] ? cats[a] : cats[b]} » que « ${eff[a] > eff[b] ? cats[b] : cats[a]} » ? $${t}$`, reponse: nb(Math.abs(eff[a] - eff[b])) }
      return { enonce: `Combien d'élèves n'ont pas choisi « ${cats[a]} » ? $${t}$`, reponse: nb(total - eff[a]) }
    },
  },

  // ================= PROBABILITÉS =================
  {
    id: 'probabilite-echelle', theme: 'Probabilités', titre: 'Échelle de probabilité et fraction',
    programme: 'Positionner un évènement sur une échelle de probabilité ; donner sa probabilité.',
    generer() {
      const sorte = ent(0, 2)
      if (sorte === 0) {
        const [ev, n] = choix<[string, number]>([['obtenir 6', 1], ['obtenir un nombre pair', 3], ['obtenir un multiple de 3', 2], ['obtenir un nombre inférieur à 5', 4], ['obtenir 1 ou 2', 2], ['obtenir un nombre impair', 3], ['obtenir un nombre supérieur à 1', 5]])
        const v = irreductible(n, 6)
        return { enonce: `On lance un dé équilibré à 6 faces. Quelle est la probabilité d'${ev} ?`, reponse: v, faux: fausses(v, [frac(1, n === 1 ? 2 : n), frac(n, 6 - n), frac(6, n), irreductible(6 - n, 6)].filter(t => t !== v)) }
      }
      const r = ent(1, 7), b = ent(1, 7), t = r + b + choix([0, 0, ent(1, 4)])
      const autres = t - r - b
      if (sorte === 1) {
        const v = irreductible(r, t)
        return { enonce: `Une urne contient $${r}$ boule${r > 1 ? 's' : ''} rouge${r > 1 ? 's' : ''}, $${b}$ bleue${b > 1 ? 's' : ''}${autres ? ` et $${autres}$ verte${autres > 1 ? 's' : ''}` : ''}. On tire une boule au hasard. Quelle est la probabilité qu'elle soit rouge ?`, reponse: v,
          faux: fausses(v, [frac(r, t - r), frac(1, t), irreductible(t - r, t), frac(t, r)].filter(x => x !== v && x !== nb(1))) }
      }
      // Sur l'échelle : impossible, peu probable, une chance sur deux, très probable, certain
      const [rr, bb, couleur, p] = choix<[number, number, string, number]>([[3, 1, 'rouge', 3], [1, 3, 'rouge', 1], [2, 2, 'rouge', 2], [4, 0, 'rouge', 4], [3, 1, 'verte', 0], [1, 1, 'bleue', 2], [6, 2, 'bleue', 1], [2, 6, 'bleue', 3]])
      const L = ['A', 'B', 'C', 'D', 'E']
      return { enonce: `Une urne contient $${rr}$ boule${rr > 1 ? 's' : ''} rouge${rr > 1 ? 's' : ''}${bb ? ` et $${bb}$ bleue${bb > 1 ? 's' : ''}` : ''}. On tire une boule. Quelle lettre placer pour l'évènement « obtenir une boule ${couleur} » ?`,
        figure: F.echelleProba(L), reponse: mot(L[p]), faux: fausses(mot(L[p]), [L[4 - p], L[Math.min(4, p + 1)], L[Math.max(0, p - 1)], L[p === 2 ? 0 : 2]].map(mot)) }
    },
  },
  {
    id: 'chances-sur', theme: 'Probabilités', titre: '« Une chance sur quatre » et sa probabilité',
    programme: 'Lier l’expression « une chance sur quatre » et la probabilité 1/4 ; la donner sous diverses formes.',
    generer() {
      const n = choix([2, 4, 5, 10, 20, 100, 3, 6, 8]), k = n >= 4 && Math.random() < 0.4 ? ent(2, Math.min(n - 1, 4)) : 1
      const chances = k === 1 ? 'une chance' : `$${k}$ chances`
      const sorte = ent(0, 1)
      if (sorte === 0 || ![2, 4, 5, 10, 20, 100].includes(n)) return { enonce: `Un évènement a ${chances} sur $${n}$ de se produire. Quelle est sa probabilité (en fraction) ?`, reponse: frac(k, n) === irreductible(k, n) ? frac(k, n) : `${frac(k, n)} = ${irreductible(k, n)}` }
      return { enonce: `Un évènement a ${chances} sur $${n}$ de se produire. Quelle est sa probabilité, en pourcentage ?`, reponse: `${nb(k / n * 100)}\\,\\%` }
    },
  },
  {
    id: 'equiprobabilite', theme: 'Probabilités', titre: 'Des issues équiprobables',
    programme: 'Attribuer des probabilités dans des cas simples (équiprobabilité).', application: true,
    generer() {
      const sorte = ent(0, 2)
      if (sorte === 0) {
        const n = choix([8, 10, 12]), [ev, f] = choix<[string, (k: number) => boolean]>([['un nombre pair', k => k % 2 === 0], ['un multiple de 3', k => k % 3 === 0], ['un nombre supérieur à 6', k => k > 6], ['un multiple de 4', k => k % 4 === 0], ['un nombre inférieur ou égal à 3', k => k <= 3]])
        const fav = Array.from({ length: n }, (_, i) => i + 1).filter(f).length
        return { enonce: `Une roue de loterie a $${n}$ secteurs identiques, numérotés de $1$ à $${n}$. Quelle est la probabilité d'obtenir ${ev} ?`, reponse: irreductible(fav, n) }
      }
      if (sorte === 1) {
        const m = choix(['MATHS', 'COLLEGE', 'CINQUIEME', 'TABLEAU', 'FRACTION', 'GEOMETRIE']), v = [...m].filter(c => 'AEIOUY'.includes(c)).length
        return { enonce: `On tire au hasard une des lettres du mot ${m}. Quelle est la probabilité de tirer une voyelle ?`, reponse: irreductible(v, m.length) }
      }
      const N = ent(20, 30), g = ent(8, N - 8)
      return { enonce: `Une classe compte $${N}$ élèves, dont $${g}$ garçons. On tire un élève au hasard. Quelle est la probabilité que ce soit une fille ?`, reponse: irreductible(N - g, N) }
    },
  },

  // ================= PROPORTIONNALITÉ =================
  {
    id: 'situation-proportionnelle', theme: 'Proportionnalité', titre: 'Le coefficient de proportionnalité',
    programme: 'Reconnaître une situation de proportionnalité ; son coefficient.',
    generer() {
      const k = choix([2, 3, 4, 5, 6, 1.5, 2.5, 0.5]), xs = melange([1, 2, 3, 4, 5, 6, 8, 10]).slice(0, 3).sort((a, b) => a - b)
      const ys = xs.map(x => arrondi(x * k))
      if (Math.random() < 0.5) {
        return { enonce: `Ce tableau est un tableau de proportionnalité. Par quel nombre multiplie-t-on la première ligne pour obtenir la deuxième ? $${tableau(xs.map(nb), ys.map(nb))}$`, reponse: nb(k),
          faux: fausses(nb(k), [nb(ys[0] - xs[0]), nb(arrondi(1 / k)), nb(ys[1] - ys[0])].filter(t => t !== '0'), autour(k)) }
      }
      // Le prix à l'unité : le coefficient en situation
      const [chose, pu] = choix<[string, number]>([['cahiers', 2], ['stylos', 1.5], ['baguettes', 1.2], ['croissants', 1.1], ['places de cinéma', 8], ['tickets de bus', 1.6]])
      const n = ent(2, 9)
      return { enonce: `$${n}$ ${chose} coûtent $${nb(arrondi(n * pu))}$ €. Quel est le prix d'un seul ?`, reponse: unite(nb(pu), '€'),
        faux: fausses(unite(nb(pu), '€'), [unite(nb(arrondi(n * pu - n)), '€'), unite(nb(arrondi(n * pu * n)), '€')]) }
    },
  },
  {
    id: 'proportionnalite-procedure', theme: 'Proportionnalité', titre: 'Linéarité ou retour à l’unité',
    programme: 'Mobiliser une procédure adaptée : linéarité (addition, multiplication), retour à l’unité.',
    generer() {
      const [chose, une] = choix([['cahiers', 'cahier'], ['stylos', 'stylo'], ['baguettes', 'baguette'], ['croissants', 'croissant'], ['places de cinéma', 'place']])
      const pu = choix([0.5, 1.2, 1.5, 2, 2.5, 3, 0.8, 1.1, 4])
      const n1 = ent(2, 5), sorte = ent(0, 3)
      if (sorte === 3) {
        // Une recette pour 4 personnes, pour 2, 6 ou 8 (l'exemple du programme)
        const [ingr, q, u] = choix<[string, number, string]>([['de farine', 200, 'g'], ['de lait', 50, 'cL'], ['de sucre', 120, 'g'], ['de beurre', 80, 'g'], ['de chocolat', 160, 'g']])
        const p = choix([2, 6, 8, 10, 12].filter(x => x !== 4)), base = choix([4, 4, 6])
        const qq = q / 4 * base
        return { enonce: `Une recette pour $${base}$ personnes demande $${qq}$ ${u} ${ingr}. Combien en faut-il pour $${p}$ personnes ?`, reponse: unite(nb(arrondi(qq / base * p)), u) }
      }
      const prix = (n: number) => unite(nb(arrondi(n * pu)), '€')
      void une
      if (sorte === 0) {
        // Linéarité additive : on connaît deux prix, on les ajoute
        let n2 = ent(2, 6); if (n2 === n1) n2++
        const n3 = n1 + n2, v = prix(n3)
        return { enonce: `$${n1}$ ${chose} coûtent $${nb(n1 * pu)}$ € et $${n2}$ ${chose} coûtent $${nb(n2 * pu)}$ €. Combien coûtent $${n3}$ ${chose} ?`, reponse: v,
          faux: fausses(v, [unite(nb(arrondi(n1 * pu * n2)), '€'), unite(nb(arrondi(n2 * pu + n1)), '€'), prix(n3 + 1), prix(n3 - 1)]) }
      }
      if (sorte === 1) {
        // Linéarité multiplicative
        const k = ent(2, 4), n3 = n1 * k, v = prix(n3)
        return { enonce: `$${n1}$ ${chose} coûtent $${nb(n1 * pu)}$ €. Combien coûtent $${n3}$ ${chose} ?`, reponse: v,
          faux: fausses(v, [unite(nb(arrondi(n1 * pu + n3 - n1)), '€'), unite(nb(arrondi(n1 * pu * n3)), '€'), prix(n3 + k)], () => prix(n3 + choix([-1, 1, 2]))) }
      }
      // Retour à l'unité
      let n3 = ent(2, 9); while (n3 === n1 || n3 % n1 === 0) n3++
      const v = prix(n3)
      return { enonce: `$${n1}$ ${chose} coûtent $${nb(n1 * pu)}$ €. Combien coûtent $${n3}$ ${chose} ?`, reponse: v,
        faux: fausses(v, [unite(nb(arrondi(pu * n1 + (n3 - n1))), '€'), unite(nb(arrondi(pu * n1 * n3)), '€'), unite(nb(arrondi(pu * n1 + n3)), '€')], () => prix(n3 + choix([-1, 1, 2]))) }
    },
  },
  {
    id: 'pourcentage-situation', theme: 'Proportionnalité', titre: 'Un pourcentage en situation',
    programme: 'Calculer un pourcentage dans une situation simple (élection, soldes…).',
    generer() {
      const sorte = ent(0, 2)
      if (sorte === 0) {
        const P = choix([20, 40, 50, 60, 80, 120, 200, 30]), p = choix([10, 20, 25, 50]), v = P * p / 100
        return { enonce: `Un article coûte $${P}$ €. Il est soldé à $${p}\\,\\%$. De combien son prix baisse-t-il ?`, reponse: unite(nb(v), '€'),
          faux: fausses(unite(nb(v), '€'), [unite(nb(p), '€'), unite(nb(P - v), '€'), unite(nb(P - p), '€'), unite(nb(v * 2), '€')]) }
      }
      if (sorte === 1) {
        let N: number, p: number
        do { N = choix([20, 25, 30, 40, 50, 200, 300, 400, 500]); p = choix([10, 20, 50, 25, 30, 40]) } while (N * p % 100 !== 0)
        const v = N * p / 100
        return { enonce: `Dans un collège de $${N}$ élèves, $${p}\\,\\%$ sont demi-pensionnaires. Combien d'élèves sont demi-pensionnaires ?`, reponse: nb(v),
          faux: fausses(nb(v), [nb(p), nb(N - p), nb(N - v), nb(v * 2)], autour(v, 5)) }
      }
      const N = choix([10, 20, 25, 50]), k = ent(1, N - 1), v = k * 100 / N
      return { enonce: `Sur $${N}$ élèves, $${k}$ ont un chat. Quel pourcentage des élèves ont un chat ?`, reponse: `${nb(v)}\\,\\%`,
        faux: fausses(`${nb(v)}\\,\\%`, [`${nb(k)}\\,\\%`, `${nb(N - k)}\\,\\%`, `${nb(100 - v)}\\,\\%`, `${nb(k * 10)}\\,\\%`], () => `${nb(v + choix([-5, 5, 10]))}\\,\\%`) }
    },
  },
  {
    id: 'echelle', theme: 'Proportionnalité', titre: 'L’échelle d’un plan ou d’une carte',
    programme: 'Utiliser un coefficient de proportionnalité : l’échelle d’un plan, d’une carte.', application: true,
    generer() {
      const sorte = ent(0, 2)
      if (sorte === 0) { const d = ent(2, 15); return { enonce: `Sur un plan à l'échelle $\\frac{1}{100}$, une pièce mesure $${d}$ cm de long. Quelle est sa longueur réelle ?`, reponse: unite(nb(d), 'm') } }
      if (sorte === 1) { const d = ent(2, 12), [e, k] = choix<[string, number]>([['1\\,000', 10], ['10\\,000', 100], ['100\\,000', 1000], ['50\\,000', 500]]); return { enonce: `Sur une carte à l'échelle $\\frac{1}{${e}}$, deux villages sont à $${d}$ cm. Quelle est la distance réelle, en mètres ?`, reponse: unite(grandNb(d * k), 'm') } }
      const r = ent(2, 30), [e, k] = choix<[string, number]>([['\\frac{1}{100}', 1], ['\\frac{1}{50}', 2], ['\\frac{1}{200}', 0.5]])
      return { enonce: `À l'échelle $${e}$, comment représente-t-on un mur de $${r}$ m de long ? (en cm)`, reponse: unite(nb(r * k), 'cm') }
    },
  },
  {
    id: 'vitesse-moyenne', theme: 'Proportionnalité', titre: 'Une vitesse moyenne',
    programme: 'Utiliser un coefficient de proportionnalité : la vitesse moyenne.', application: true,
    generer() {
      const v = choix([4, 5, 12, 15, 20, 30, 40, 50, 60, 80, 90, 100, 120]), sorte = ent(0, 2)
      const [qui, va, il] = v <= 5 ? ['Un marcheur', 'marche', 'il'] : v <= 20 ? ['Une cycliste', 'roule', 'elle'] : ['Une voiture', 'roule', 'elle']
      if (sorte === 0) { const h = ent(2, 5); return { enonce: `${qui} ${va} à $${v}$ km/h de moyenne. Quelle distance parcourt-${il} en $${h}$ heures ?`, reponse: unite(nb(v * h), 'km') } }
      if (sorte === 1) { const [m, f] = choix<[number, number]>([[30, 0.5], [15, 0.25], [45, 0.75], [90, 1.5], [20, 1 / 3]]); return { enonce: `${qui} ${va} à $${v}$ km/h de moyenne. Quelle distance parcourt-${il} en $${m}$ minutes ?`, reponse: unite(nb(arrondi(v * f)), 'km') } }
      const h = ent(2, 4)
      return { enonce: `${qui} parcourt $${v * h}$ km en $${h}$ heures. Quelle est sa vitesse moyenne ?`, reponse: `${nb(v)}\\text{ km/h}` }
    },
  },

]

// =============================================================
// LES QUESTIONS À TROU
// Une égalité ou une phrase à compléter : l'élève écrit le nombre qui
// manque. Les pointillés changent de place d'un tirage à l'autre
// (24 = 3 × …, 24 = … × 8, … = 3 × 8). Les automatismes dont la
// question est déjà « Compléter… » la reprennent telle quelle.
// =============================================================
const aTrou = (enonce: string, reponse: string): Question => ({ enonce, reponse, faux: [] })
const mille = (k: number) => k === 1000 ? '1\\,000' : String(k)
const terme = (k: number) => k === 1 ? 'x' : `${k}x`
const memeQuestion = (id: string) => () => AUTOMATISMES_5E.find(a => a.id === id)!.generer()
/** Une question à trou dont les pointillés changent de place : l'une
 *  des écritures, tirée au hasard, après la consigne (« Compléter : »
 *  par défaut) */
const unTrou = (consigne: string, ecritures: [string, string][]): Question => {
  const [e, r] = choix(ecritures)
  return aTrou(`${consigne || 'Compléter :'} ${e}`, r)
}

const TROUS: Record<string, () => Question> = {
  'division-euclidienne': () => {
    const b = ent(3, 9), q = ent(3, 15), r = ent(1, b - 1), a = b * q + r
    return unTrou('', [
      [`$${a} = ${b} \\times \\ldots + ${r}$`, nb(q)],
      [`$${a} = \\ldots \\times ${q} + ${r}$`, nb(b)],
      [`$${a} = ${b} \\times ${q} + \\ldots$`, nb(r)],
      [`$\\ldots = ${b} \\times ${q} + ${r}$`, nb(a)],
    ])
  },
  'factoriser-tables': () => {
    const a = ent(2, 9), b = ent(2, 9)
    return unTrou('', [[`$${a * b} = ${a} \\times \\ldots$`, nb(b)], [`$${a * b} = \\ldots \\times ${b}$`, nb(a)], [`$\\ldots = ${a} \\times ${b}$`, nb(a * b)]])
  },
  'produit-derive': () => {
    const a = ent(2, 9), b = ent(2, 9), e1 = choix([-1, 0, 1, 2]), e2 = choix([-2, -1, 1])
    const x = nb(a * 10 ** e1), y = nb(b * 10 ** e2), v = nb(a * b * 10 ** (e1 + e2))
    return unTrou('', [[`$${x} \\times \\ldots = ${v}$`, y], [`$\\ldots \\times ${y} = ${v}$`, x], [`$${x} \\times ${y} = \\ldots$`, v]])
  },
  'decimal-fois-10': () => {
    const x = ent(11, 999) / choix([10, 100]), k = choix([10, 100, 1000])
    return unTrou('', [[`$${nb(x)} \\times \\ldots = ${nb(x * k)}$`, mille(k)], [`$\\ldots \\times ${mille(k)} = ${nb(x * k)}$`, nb(x)]])
  },
  'decimal-divise-10': () => {
    const x = choix([ent(11, 999) / 10, ent(2, 9999)]), k = choix([10, 100, 1000])
    return unTrou('', [[`$${nb(x)} \\div \\ldots = ${nb(x / k)}$`, mille(k)], [`$\\ldots \\div ${mille(k)} = ${nb(x / k)}$`, nb(x)]])
  },
  'decimaux-addition': () => {
    const a = ent(11, 99) / 10, b = ent(101, 999) / 100, s = nb(arrondi(a + b))
    return unTrou('', [[`$${nb(a)} + \\ldots = ${s}$`, nb(b)], [`$\\ldots + ${nb(b)} = ${s}$`, nb(a)]])
  },
  'decimaux-soustraction': () => {
    let a: number, b: number
    do { a = ent(21, 199) / 10; b = ent(101, 999) / 100 } while (b >= a)
    const d = nb(arrondi(a - b))
    return unTrou('', [[`$${nb(a)} - \\ldots = ${d}$`, nb(b)], [`$\\ldots - ${nb(b)} = ${d}$`, nb(a)]])
  },
  'tables': () => {
    const a = ent(2, 10), b = ent(2, 10)
    return unTrou('', [[`$${a} \\times \\ldots = ${a * b}$`, nb(b)], [`$\\ldots \\times ${b} = ${a * b}$`, nb(a)], [`$${a * b} = ${a} \\times \\ldots$`, nb(b)]])
  },
  'relatifs-addsub': () => {
    const a = ent(1, 15) * choix([-1, 1]), b = ent(1, 15) * choix([-1, 1])
    return unTrou('', [[`$${rel(a)} + \\ldots = ${nb(a + b)}$`, nb(b)], [`$\\ldots + ${rel(b)} = ${nb(a + b)}$`, nb(a)], [`$${rel(a)} - \\ldots = ${nb(a - b)}$`, nb(b)]])
  },
  'fraction-decimal': () => {
    const [n, d] = choix([[1, 2], [1, 4], [3, 4], [1, 5], [2, 5], [3, 5], [4, 5], [7, 10], [3, 2], [5, 4], [7, 2], [9, 10], [3, 10]])
    return unTrou('', [[`$\\dfrac{\\ldots}{${d}} = ${nb(n / d)}$`, nb(n)], [`$\\dfrac{${n}}{\\ldots} = ${nb(n / d)}$`, nb(d)]])
  },
  'quotient-trou': () => {
    let a: number, b: number
    do { a = ent(3, 9); b = ent(2, 11) } while (b === a || pgcd(a, b) !== 1)
    return unTrou('', [[`$${a} \\times \\ldots = ${b}$`, frac(b, a)], [`$\\ldots \\times ${a} = ${b}$`, frac(b, a)], [`$${a} \\times ${frac(b, a)} = \\ldots$`, nb(b)]])
  },
  'fraction-egales': () => {
    let n: number, d: number
    do { n = ent(1, 9); d = ent(2, 10) } while (pgcd(n, d) !== 1)
    const k = ent(2, 8)
    return unTrou('', [[`$${frac(n, d)} = \\dfrac{\\ldots}{${d * k}}$`, nb(n * k)], [`$${frac(n, d)} = \\dfrac{${n * k}}{\\ldots}$`, nb(d * k)], [`$\\dfrac{\\ldots}{${d}} = ${frac(n * k, d * k)}$`, nb(n)]])
  },
  'entier-plus-fraction': () => {
    const d = ent(2, 9), q = ent(1, 6), r = ent(1, d - 1)
    return unTrou('', [[`$${frac(q * d + r, d)} = ${q} + \\dfrac{\\ldots}{${d}}$`, nb(r)], [`$${frac(q * d + r, d)} = \\ldots + ${frac(r, d)}$`, nb(q)], [`$\\dfrac{\\ldots}{${d}} = ${q} + ${frac(r, d)}$`, nb(q * d + r)]])
  },
  'fraction-quantite': () => {
    let n: number, d: number
    do { n = ent(1, 7); d = ent(2, 10) } while (n >= d || pgcd(n, d) !== 1)
    const N = d * ent(2, 12), v = nb(N / d * n)
    return unTrou('', [
      [`$\\dfrac{\\ldots}{${d}}$ de $${N}$, c'est $${v}$.`, nb(n)],
      [`$${frac(n, d)}$ de $\\ldots$, c'est $${v}$.`, nb(N)],
      [`$${frac(n, d)}$ de $${N}$, c'est $\\ldots$`, v],
    ])
  },
  'pourcentages-1-10-50': () => {
    const p = choix([1, 10, 50]), N = choix([200, 300, 400, 500, 600, 800, 1000, 1200]), v = nb(N * p / 100)
    return unTrou('', [[`$\\ldots\\,\\%$ de $${N}$, c'est $${v}$.`, nb(p)], [`$${p}\\,\\%$ de $\\ldots$, c'est $${v}$.`, nb(N)], [`$${p}\\,\\%$ de $${N}$, c'est $\\ldots$`, v]])
  },
  'ecritures-nombre': () => {
    const [n, d] = choix([[1, 2], [1, 4], [3, 4], [1, 5], [2, 5], [3, 5], [4, 5], [1, 10], [3, 10], [7, 10], [9, 10], [3, 20]])
    const pc = nb(arrondi(n / d * 100))
    return unTrou('', [[`$${nb(n / d)} = \\ldots\\,\\%$`, pc], [`$\\ldots = ${pc}\\,\\%$ (écriture décimale)`, nb(n / d)], [`$${frac(n, d)} = \\ldots\\,\\%$`, pc]])
  },
  'carres': () => {
    const n = ent(2, 12)
    return unTrou('', [[`$\\ldots^2 = ${n * n}$ (avec un nombre positif)`, nb(n)], [`$${n}^2 = \\ldots$`, nb(n * n)], [`$${n} \\times \\ldots = ${n * n}$`, nb(n)]])
  },
  'angles-triangle': () => {
    const a = ent(25, 95), b = ent(20, 150 - a), c = 180 - a - b
    return unTrou('Dans un triangle, compléter :', [[`$${a}° + ${b}° + \\ldots = 180°$`, deg(c)], [`$${a}° + \\ldots + ${c}° = 180°$`, deg(b)], [`$\\ldots + ${b}° + ${c}° = 180°$`, deg(a)]])
  },
  'proportionnalite-procedure': () => {
    const k = choix([1.5, 2, 2.5, 3, 4, 5]), a = ent(2, 5)
    let b = ent(2, 9); while (b === a) b = ent(2, 9)
    // Le trou dans l'une des quatre cases
    const cases = [nb(a), nb(b), nb(a * k), nb(b * k)], i = ent(0, 3), rep = cases[i]
    cases[i] = '\\ldots'
    return aTrou(`Compléter ce tableau de proportionnalité : $${tableau(cases.slice(0, 2), cases.slice(2))}$`, rep)
  },
  'priorites': () => {
    const a = ent(2, 12), b = ent(2, 9), c = ent(2, 9)
    return unTrou('', [[`$${a} + ${b} \\times \\ldots = ${a + b * c}$`, nb(c)], [`$${a} + \\ldots \\times ${c} = ${a + b * c}$`, nb(b)], [`$\\ldots + ${b} \\times ${c} = ${a + b * c}$`, nb(a)]])
  },
  'litteral-reduire': () => {
    const a = ent(2, 9), b = ent(2, 9)
    return unTrou('', [[`$${terme(a)} + ${terme(b)} = \\ldots x$`, nb(a + b)], [`$${terme(a)} + \\ldots x = ${terme(a + b)}$`, nb(b)], [`$\\ldots x + ${terme(b)} = ${terme(a + b)}$`, nb(a)]])
  },
}
for (const a of AUTOMATISMES_5E) if (TROUS[a.id]) a.trou = TROUS[a.id]

// =============================================================
// LES QUESTIONS DE COURS (5e)
// Une définition, une propriété, le vocabulaire : on les apprend, on
// ne les calcule pas. Chaque NOTION se pose de plusieurs façons (une
// question, une phrase à compléter, la notion dans l'autre sens…), et
// RIEN N'EST FIXE : chaque façon tire au hasard ses nombres, les noms
// des points ou l'objet dont on parle. La réponse attendue est courte ;
// la correction l'écrit telle quelle. Aucune ne se réussit avec une
// chance sur deux.
// =============================================================
/** Une façon de poser la notion : son énoncé et la réponse attendue (en mots, avec $…$) */
export type Facon = () => [string, string]
export interface QuestionCours { id: string; theme: string; titre: string; facons: Facon[]; poser: () => Question }
/** Les notions d'un thème ; `niveau` (« 4e-… ») distingue leurs id de celles de 5e */
const notions = (theme: string, liste: [string, ...Facon[]][], niveau = ''): QuestionCours[] =>
  liste.map(([titre, ...facons], i) => ({
    id: `cours-${niveau}${theme}-${i + 1}`, theme, titre, facons,
    poser: () => { const [enonce, reponse] = choix(facons)(); return { enonce, reponse: mot(reponse) } },
  }))
/** Une des phrases, tirée au hasard */
const une = (...t: [string, string][]): [string, string] => choix(t)

// Des noms de points tirés au hasard (jamais O, réservé aux centres)
const TRIANGLES = ['ABC', 'DEF', 'EFG', 'IJK', 'KLM', 'MNP', 'RST', 'UVW', 'GHI']
const QUADRILATERES = ['ABCD', 'EFGH', 'IJKL', 'KLMN', 'MNPQ', 'RSTU', 'TUVW']
const LETTRES = [...'ABCDEFGHIJKLMNPRSTUVW']
const tri = () => [...choix(TRIANGLES)]
const quad = () => [...choix(QUADRILATERES)]
const pt = () => choix(LETTRES)
/** n noms de points, tous différents */
const pts = (n: number) => melange(LETTRES).slice(0, n)
const deuxPts = () => pts(2)
const ang = (s: string) => `\\widehat{${s}}`
const AXES = ['(d)', '(d_1)', '(d_2)', '(\\Delta)']
const OBJETS = ['cahiers', 'stylos', 'croissants', 'places de cinéma', 'tickets de bus', 'baguettes']
/** Un entier à 3 ou 4 chiffres, multiple de k */
const multipleDe = (k: number) => k * ent(Math.ceil(101 / k), Math.floor(9999 / k))
const chiffres = (n: number) => [...String(n)].map(Number)

export const COURS_5E: QuestionCours[] = [
  ...notions('Opérations', [
    ['Divisibilité par 2, 5 et 10',
      () => {
        const [k, crit] = choix<[number, string]>([[2, '$0$, $2$, $4$, $6$ ou $8$'], [5, '$0$ ou $5$'], [10, '$0$']])
        const N = multipleDe(k)
        return une([`Sans poser la division, comment savoir si $${N}$ est divisible par $${k}$ ?`, `on regarde son chiffre des unités : il doit être ${crit}`],
          [`Compléter : $${N}$ est divisible par $${k}$ car son chiffre des unités est…`, `$${N % 10}$ (un multiple de $${k}$ se termine par ${crit})`])
      }],
    ['Divisibilité par 3 et 9',
      () => {
        const k = choix([3, 9]), N = multipleDe(k), c = chiffres(N), s = c.reduce((x, y) => x + y, 0)
        return une([`Sans poser la division, comment savoir si $${N}$ est divisible par $${k}$ ?`, `on ajoute ses chiffres : $${c.join(' + ')} = ${s}$, qui est divisible par $${k}$`],
          [`Quel calcul permet de savoir si $${N}$ est divisible par $${k}$ ?`, `la somme de ses chiffres, $${c.join(' + ')} = ${s}$ : elle doit être divisible par $${k}$`])
      }],
    ['Le vocabulaire de la division euclidienne',
      () => {
        const b = ent(3, 9), q = ent(4, 15), r = ent(1, b - 1), a = b * q + r
        const [x, nom] = choix<[number, string]>([[a, 'le dividende'], [b, 'le diviseur'], [q, 'le quotient'], [r, 'le reste']])
        return [`Dans la division euclidienne de $${a}$ par $${b}$, on a $${a} = ${b} \\times ${q} + ${r}$. Comment s'appelle le nombre $${x}$ ?`, nom]
      }],
    ['Le reste d\'une division euclidienne',
      () => { const b = ent(3, 12); return [`Compléter : dans une division euclidienne par $${b}$, le reste est toujours plus petit que…`, `$${b}$`] },
      () => { const b = ent(3, 12); return [`Dans une division euclidienne par $${b}$, quel est le plus grand reste possible ?`, `$${b - 1}$`] }],
    ['Multiple et diviseur',
      () => {
        const a = ent(2, 9), b = ent(2, 9), n = a * b
        return une([`On a $${n} = ${a} \\times ${b}$. Compléter : $${n}$ est un … de $${a}$.`, 'multiple'],
          [`On a $${n} = ${a} \\times ${b}$. Compléter : $${a}$ est un … de $${n}$.`, 'diviseur'])
      }],
    ['Multiplier par 0,1 ; 0,5 ; 0,01',
      () => {
        const [k, r] = choix<[string, string]>([['0{,}1', 'diviser par $10$'], ['0{,}01', 'diviser par $100$'], ['0{,}5', 'diviser par $2$ (prendre la moitié)'], ['0{,}25', 'diviser par $4$ (prendre le quart)']])
        const n = ent(12, 480)
        return une([`Multiplier un nombre par $${k}$ revient à…`, r], [`Calculer $${n} \\times ${k}$, c'est…`, r])
      }],
    ['Multiplier ou diviser par 10, 100, 1 000',
      () => {
        const [k, n] = choix<[string, string]>([['10', 'un rang'], ['100', 'deux rangs'], ['1\\,000', 'trois rangs']])
        const x = nb(ent(11, 999) / 10)
        return une([`Quand on calcule $${x} \\div ${k}$, de combien de rangs chaque chiffre se décale-t-il, et dans quel sens ?`, `de ${n} vers la droite`],
          [`Quand on calcule $${x} \\times ${k}$, de combien de rangs chaque chiffre se décale-t-il, et dans quel sens ?`, `de ${n} vers la gauche`])
      }],
    ['Les priorités opératoires',
      () => { const a = ent(2, 20), b = ent(2, 9), c = ent(2, 9); return [`Dans $${a} + ${b} \\times ${c}$, quel calcul fait-on en premier ?`, `$${b} \\times ${c}$ : la multiplication passe avant l'addition`] },
      () => { const a = ent(2, 20), b = ent(2, 9), c = ent(2, 9); return [`Dans $(${a} + ${b}) \\times ${c}$, quel calcul fait-on en premier ?`, `$${a} + ${b}$ : les parenthèses d'abord`] },
      () => { const b = ent(2, 9), a = b + ent(2, 20), c = ent(2, 9); return [`Dans $${a} - ${b} + ${c}$, quel calcul fait-on en premier ?`, `$${a} - ${b}$ : on calcule de gauche à droite`] }],
  ]),
  ...notions('Nombres relatifs', [
    ['Deux nombres opposés',
      () => { const a = nb(ent(2, 150) / choix([1, 10])); return [`Quelle est la somme de $-${a}$ et de $${a}$ ?`, '$0$ (ce sont deux nombres opposés)'] },
      () => { const a = ent(2, 30); return [`Comment appelle-t-on $${a}$ et $-${a}$, dont la somme est égale à $0$ ?`, 'des nombres opposés'] },
      () => { const a = nb(ent(2, 150) / choix([1, 10])); return [`Quel est l'opposé de $-${a}$ ?`, `$${a}$`] }],
    ['Soustraire un relatif',
      () => { const a = ent(2, 12); return une([`Soustraire $(-${a})$ revient à…`, `ajouter $${a}$ (son opposé)`], [`Soustraire $${a}$ revient à…`, `ajouter $-${a}$ (son opposé)`]) },
      () => { const a = ent(2, 12), b = ent(2, 12); return [`Pour calculer $${a} - (-${b})$, par quelle addition la remplace-t-on ?`, `$${a} + ${b}$`] }],
    ['La distance à zéro',
      () => { const a = ent(2, 99) / choix([1, 10]); return [`Quelle est la distance à zéro de $${nb(-a)}$ ?`, `$${nb(a)}$`] },
      () => { const a = nb(ent(2, 99) / choix([1, 10])); return [`Le nombre $-${a}$ est formé d'un signe et d'une distance à zéro. Lesquels ?`, `le signe $-$ et la distance à zéro $${a}$`] }],
    ['Comparer deux nombres négatifs',
      () => { let a: number, b: number; do { a = ent(2, 40); b = ent(2, 40) } while (a === b); return [`Pour comparer $-${a}$ et $-${b}$, que regarde-t-on ?`, `leurs distances à zéro : le plus petit est celui qui en a la plus grande, ici $-${Math.max(a, b)}$`] },
      () => { const a = ent(2, 40); return [`Compléter : de deux nombres négatifs comme $-${a}$ et $-${a + ent(1, 9)}$, le plus petit est celui qui a…`, 'la plus grande distance à zéro'] }],
    ['Additionner deux relatifs',
      () => { let a: number, b: number; do { a = ent(2, 15); b = ent(2, 15) } while (a === b); return [`Comment calcule-t-on $(-${a}) + (+${b})$ ?`, `on soustrait les distances à zéro ($${Math.max(a, b)} - ${Math.min(a, b)}$) et on garde le signe du nombre le plus loin de zéro`] },
      () => { const a = ent(2, 15), b = ent(2, 15); return [`Comment calcule-t-on $(-${a}) + (-${b})$ ?`, `on ajoute les distances à zéro ($${a} + ${b}$) et on garde le signe $-$`] }],
  ]),
  ...notions('Nombres rationnels', [
    ['Le quotient',
      () => {
        let a: number, b: number
        do { a = ent(1, 9); b = ent(2, 11) } while (a === b)
        return une([`Le quotient de $${a}$ par $${b}$ est le nombre qui, multiplié par $${b}$, donne…`, `$${a}$`],
          [`Comment s'écrit le quotient de $${a}$ par $${b}$ sous forme de fraction ?`, `$${frac(a, b)}$`],
          [`Quel nombre, multiplié par $${b}$, donne $${a}$ ? (réponse en fraction)`, `$${frac(a, b)}$`])
      }],
    ['Les fractions égales',
      () => { const n = ent(1, 6), d = n + ent(1, 6), k = ent(2, 9); return [`Pour obtenir une fraction égale à $${frac(n, d)}$, que peut-on faire à son numérateur et à son dénominateur ?`, `les multiplier (ou les diviser) par un même nombre non nul, par exemple $${k}$ : $${frac(n * k, d * k)}$`] },
      () => { const n = ent(1, 6), d = n + ent(1, 6), k = ent(2, 9); return [`Pourquoi $${frac(n, d)} = ${frac(n * k, d * k)}$ ?`, `on a multiplié le numérateur et le dénominateur par le même nombre, $${k}$`] }],
    ['Simplifier une fraction',
      () => { const n = ent(1, 6), d = n + ent(1, 6), k = ent(2, 9); return [`Simplifier $${frac(n * k, d * k)}$, c'est…`, `diviser son numérateur et son dénominateur par un même nombre (ici $${k}$)`] },
      () => { let n: number, d: number; do { n = ent(1, 12); d = ent(n + 1, 20) } while (pgcd(n, d) !== 1); return [`Pourquoi la fraction $${frac(n, d)}$ est-elle irréductible ?`, `on ne peut plus la simplifier : $${n}$ et $${d}$ n'ont pas d'autre diviseur commun que $1$`] }],
    ['Additionner des fractions',
      () => { const d = ent(3, 12), a = ent(1, d), b = ent(1, d); return [`Comment calcule-t-on $${frac(a, d)} + ${frac(b, d)}$ ?`, `on additionne les numérateurs et on garde le dénominateur : $${frac(a + b, d)}$`] },
      () => { const d = ent(2, 5), k = ent(2, 4), a = ent(1, 9), b = ent(1, 9); return [`Que faut-il faire d'abord pour calculer $${frac(a, d)} + ${frac(b, d * k)}$ ?`, `les écrire avec le même dénominateur ($${d * k}$)`] }],
    ['Ce que signifie un pourcentage',
      () => { const p = choix([5, 12, 15, 25, 30, 40, 64, 75, 85]); return [`Que signifie « $${p}\\,\\%$ » ?`, `$${p}$ sur $100$ (soit $${frac(p, 100)}$)`] },
      () => { const p = choix([5, 12, 15, 25, 30, 40, 64, 75, 85]); return [`Quelle fraction de dénominateur $100$ est égale à $${p}\\,\\%$ ?`, `$${frac(p, 100)}$`] }],
    ['Les pourcentages simples',
      () => {
        const [p, r] = choix<[string, string]>([['10', 'diviser par $10$'], ['50', 'prendre la moitié'], ['25', 'prendre le quart'], ['1', 'diviser par $100$'], ['100', 'prendre le tout'], ['20', 'diviser par $5$']])
        const n = 20 * ent(2, 40)
        return une([`Prendre $${p}\\,\\%$ d'un nombre revient à…`, r], [`Pour calculer $${p}\\,\\%$ de $${n}$, on peut…`, r])
      }],
    ['Prendre une fraction d\'un nombre',
      () => { const d = ent(2, 8), n = ent(1, d - 1), N = d * ent(2, 9); return [`Prendre $${frac(n, d)}$ de $${N}$, c'est calculer…`, `$${frac(n, d)} \\times ${N}$ (ou $${N} \\div ${d} \\times ${n}$)`] }],
    ['Les écritures décimales à connaître',
      () => {
        const [n, d, v] = choix<[number, number, string]>([[1, 2, '0{,}5'], [1, 4, '0{,}25'], [3, 4, '0{,}75'], [1, 5, '0{,}2'], [1, 10, '0{,}1'], [1, 100, '0{,}01'], [3, 2, '1{,}5'], [2, 5, '0{,}4']])
        return une([`Quelle est l'écriture décimale de $${frac(n, d)}$ ?`, `$${v}$`], [`Quelle fraction est égale à $${v}$ ?`, `$${frac(n, d)}$`])
      }],
    ['Numérateur et dénominateur',
      () => {
        const d = ent(3, 12), n = ent(1, d - 1), [quoi, part] = choix<[string, string]>([['une tarte', 'parts'], ['une tablette de chocolat', 'carreaux'], ['un ruban', 'morceaux'], ['une pizza', 'parts']])
        return une([`On prend $${frac(n, d)}$ de ${quoi}. Que représente le nombre $${d}$ ?`, `le nombre de ${part} égales de ${quoi}`],
          [`On prend $${frac(n, d)}$ de ${quoi}. Que représente le nombre $${n}$ ?`, `le nombre de ${part} prises`])
      }],
  ]),
  ...notions('Puissances', [
    ['Le carré d\'un nombre', () => { const n = ent(2, 12); return une([`Que signifie $${n}^2$ ?`, `$${n} \\times ${n}$`], [`Comment écrit-on $${n} \\times ${n}$ plus simplement ?`, `$${n}^2$`]) }],
    ['Le cube d\'un nombre', () => { const n = ent(2, 9); return une([`Que signifie $${n}^3$ ?`, `$${n} \\times ${n} \\times ${n}$`], [`Comment écrit-on $${n} \\times ${n} \\times ${n}$ plus simplement ?`, `$${n}^3$`]) }],
    ['Le cube de 10',
      () => une(['Que vaut $10^3$ ?', '$1\\,000$'], ['Comment écrit-on $1\\,000$ sous la forme d\'une puissance de $10$ ?', '$10^3$'], ['Que vaut $10^2$ ?', '$100$'])],
    ['Les unités d\'aire et de volume',
      () => une(['Combien y a-t-il de $\\text{dm}^2$ dans $1\\text{ m}^2$ ?', '$100$'], ['Combien y a-t-il de $\\text{cm}^2$ dans $1\\text{ dm}^2$ ?', '$100$'],
        ['Combien y a-t-il de $\\text{dm}^3$ dans $1\\text{ m}^3$ ?', '$1\\,000$'], ['Combien y a-t-il de $\\text{cm}^3$ dans $1\\text{ dm}^3$ ?', '$1\\,000$'], ['À quel volume correspond $1$ litre ?', '$1\\text{ dm}^3$'], ['À quelle capacité correspond $1\\text{ cm}^3$ ?', '$1$ mL'])],
  ]),
  ...notions('Calcul littéral et algébrique', [
    ['Le signe × sous-entendu',
      () => {
        const k = ent(2, 9), x = choix(['x', 'a', 'y', 'n', 't'])
        return une([`Dans l'expression $${k}${x}$, quelle opération est sous-entendue ?`, `une multiplication ($${k} \\times ${x}$)`],
          [`Comment écrit-on $${k} \\times ${x}$ plus simplement ?`, `$${k}${x}$`],
          [`Comment écrit-on $${x} \\times ${x}$ plus simplement ?`, `$${x}^2$`])
      }],
    ['Calculer une expression pour une valeur',
      () => { const k = ent(2, 9), c = ent(1, 9), v = ent(2, 9), x = choix(['x', 'a', 'y', 'n']); return [`Que faut-il faire pour calculer $${k}${x} + ${c}$ pour $${x} = ${v}$ ?`, `remplacer $${x}$ par $${v}$ : $${k} \\times ${v} + ${c}$`] }],
    ['Réduire une expression',
      () => { const a = ent(2, 9), b = ent(2, 9), x = choix(['x', 'a', 'y']); return [`Que veut dire « réduire » l'expression $${a}${x} + ${b}${x}$ ?`, `l'écrire avec le moins de termes possible : $${a + b}${x}$`] },
      () => { const a = ent(2, 9), b = ent(2, 9), x = choix(['x', 'a', 'y']); return [`Pourquoi ne peut-on pas réduire $${a}${x} + ${b}$ ?`, `$${a}${x}$ et $${b}$ ne sont pas de la même sorte (l'un a un $${x}$, l'autre non)`] }],
    ['La distributivité',
      () => { const k = ent(2, 9), x = choix(['x', 'a', 'y']), a = ent(1, 9); return une([`Développer $${k}(${x} + ${a})$, c'est l'écrire sous la forme…`, `d'une somme : $${k}${x} + ${k * a}$`], [`Quelle égalité permet de développer $k(a + b)$ ?`, '$k(a + b) = ka + kb$']) }],
    ['La solution d\'une équation',
      () => { const a = ent(2, 9), s = ent(2, 9), x = choix(['x', 'y', 'n']); return une([`Que veut dire « $${s}$ est solution de l'équation $${a}${x} = ${a * s}$ » ?`, `qu'en remplaçant $${x}$ par $${s}$, l'égalité est vraie : $${a} \\times ${s} = ${a * s}$`], [`Pour résoudre $${x} + ${a} = ${a + s}$, quelle opération fait-on ?`, `une soustraction : $${a + s} - ${a}$`], [`Pour résoudre $${a}${x} = ${a * s}$, quelle opération fait-on ?`, `une division : $${a * s} \\div ${a}$`]) }],
  ]),
  ...notions('Repérage', [
    ['Les coordonnées d\'un point',
      () => { const P = pt(), x = ent(-6, 6), y = ent(-6, 6); return [`Le point $${P}$ a pour abscisse $${x}$ et pour ordonnée $${y}$. Comment écrit-on ses coordonnées ?`, `$${P}(${x}\\,;\\,${y})$`] },
      () => { const P = pt(), x = ent(-6, 6), y = ent(-6, 6); return [`Le point $${P}$ a pour coordonnées $(${x}\\,;\\,${y})$. Quelle est son abscisse, et quelle est son ordonnée ?`, `abscisse $${x}$, ordonnée $${y}$`] }],
    ['L\'origine du repère',
      () => { const P = pt(); return [`Le point $${P}$ est l'origine du repère. Quelles sont ses coordonnées ?`, `$${P}(0\\,;\\,0)$`] },
      () => { const P = pt(); return [`Le point $${P}$ a pour coordonnées $(0\\,;\\,0)$. Comment l'appelle-t-on ?`, 'l\'origine du repère'] }],
    ['Les points sur les axes',
      () => { const P = pt(), x = ent(-8, 8); return [`Le point $${P}$ est sur l'axe des abscisses, d'abscisse $${x}$. Quelles sont ses coordonnées ?`, `$(${x}\\,;\\,0)$`] },
      () => { const P = pt(), y = ent(-8, 8); return [`Le point $${P}$ est sur l'axe des ordonnées, d'ordonnée $${y}$. Quelles sont ses coordonnées ?`, `$(0\\,;\\,${y})$`] }],
    ['L\'abscisse sur une droite graduée',
      () => { const P = pt(), x = nb(ent(-50, 50) / 10); return [`Sur une droite graduée, le point $${P}$ est repéré par le nombre $${x}$. Comment appelle-t-on ce nombre ?`, `l'abscisse de $${P}$`] },
      () => { const P = pt(); return [`Sur une droite graduée, $${P}$ est l'origine. Quelle est son abscisse ?`, '$0$'] }],
  ]),
  ...notions('Représentation de l’espace', [
    ['Le cube',
      () => { const [quoi, v] = choix<[string, string]>([['de faces', '$6$'], ['d\'arêtes', '$12$'], ['de sommets', '$8$']]), a = ent(2, 9); return [`Combien un cube de $${a}$ cm d'arête a-t-il ${quoi} ?`, v] },
      () => { const a = ent(2, 12); return [`Un cube a une arête de $${a}$ cm. Combien mesurent ses autres arêtes ?`, `$${a}$ cm : ses $12$ arêtes ont la même longueur`] }],
    ['Le pavé droit',
      () => { const [quoi, v] = choix<[string, string]>([['de faces', '$6$'], ['d\'arêtes', '$12$'], ['de sommets', '$8$']]), l = ent(4, 9), h = ent(2, 3), p = ent(5, 8); return [`Combien un pavé droit de $${l}$ cm sur $${h}$ cm sur $${p}$ cm a-t-il ${quoi} ?`, v] },
      () => { const l = ent(4, 9), w = ent(2, 3), h = ent(5, 8); return [`Un pavé droit mesure $${l}$ cm, $${w}$ cm et $${h}$ cm. Quelle est la forme de ses faces ?`, 'des rectangles'] }],
    ['Les arêtes cachées',
      () => { const [l, h, p] = [ent(3, 8), ent(2, 6), ent(2, 6)], s = choix(['un pavé droit de', 'une boîte de']); return [`On dessine en perspective cavalière ${s} $${l}$ cm sur $${h}$ cm sur $${p}$ cm. Comment trace-t-on les arêtes cachées ?`, 'en pointillés'] },
      () => { const a = ent(2, 9); return [`Compléter : quand on dessine un cube de $${a}$ cm d'arête en perspective cavalière, les arêtes cachées sont…`, 'en pointillés'] }],
    ['La face avant',
      () => { const l = ent(3, 9), h = ent(2, 6), p = ent(2, 6); return [`On dessine en perspective cavalière un pavé droit de face avant $${l}$ cm sur $${h}$ cm, et de profondeur $${p}$ cm. Avec quelles dimensions dessine-t-on la face avant ?`, `$${l}$ cm sur $${h}$ cm, en vraie grandeur`] },
      () => { const a = ent(2, 8); return [`En perspective cavalière, un cube de $${a}$ cm d'arête : quelles faces dessine-t-on en vraie grandeur ?`, `la face avant et la face arrière (des carrés de $${a}$ cm)`] }],
    ['Les arêtes parallèles et les fuyantes',
      () => { const [x, y] = choix<[string, string]>([['AB', 'EF'], ['AD', 'EH'], ['AE', 'BF'], ['BC', 'FG'], ['CG', 'DH'], ['DC', 'HG']]); return [`Sur le pavé droit $ABCDEFGH$, les arêtes $[${x}]$ et $[${y}]$ sont parallèles. Comment les dessine-t-on en perspective cavalière ?`, 'parallèles'] },
      () => { const p = ent(3, 8); return [`On dessine en perspective cavalière un pavé droit de profondeur $${p}$ cm. Comment appelle-t-on les arêtes de profondeur, tracées en biais et plus courtes ?`, 'les fuyantes'] }],
    ['Le patron',
      () => { const a = ent(2, 9); return [`De quoi est formé un patron d'un cube de $${a}$ cm d'arête ?`, `de $6$ carrés de $${a}$ cm de côté`] },
      () => { const l = ent(4, 9), w = ent(2, 3), h = ent(5, 8); return [`Combien de rectangles compte un patron d'un pavé droit de $${l}$ cm sur $${w}$ cm sur $${h}$ cm ?`, '$6$'] }],
    ['Le cercle',
      () => { const r = ent(2, 9); return une([`Quel calcul donne le périmètre d'un cercle de rayon $${r}$ cm ?`, `$2 \\times \\pi \\times ${r}$`],
        [`Quel calcul donne l'aire d'un disque de rayon $${r}$ cm ?`, `$\\pi \\times ${r} \\times ${r}$`],
        [`Un cercle a un rayon de $${r}$ cm. Combien mesure son diamètre ?`, `$${2 * r}$ cm`]) }],
    ['Le volume du pavé',
      () => { const l = ent(2, 9), w = ent(2, 9), h = ent(2, 9); return [`Quel calcul donne le volume d'un pavé droit de $${l}$ cm sur $${w}$ cm sur $${h}$ cm ?`, `$${l} \\times ${w} \\times ${h}$`] }],
  ]),
  ...notions('Transformations', [
    ['Ce que conserve la symétrie',
      () => { const l = ent(2, 12), [A, B] = deuxPts(); return [`Le segment $[${A}${B}]$ mesure $${l}$ cm. Combien mesure son symétrique par rapport à une droite ?`, `$${l}$ cm : la symétrie conserve les longueurs`] },
      () => { const a = ent(20, 160); return [`Un angle mesure $${a}°$. Combien mesure son symétrique par rapport à une droite ?`, `$${a}°$ : la symétrie conserve les angles`] },
      () => { const s = ent(5, 60); return [`Une figure a une aire de $${s}$ cm². Quelle est l'aire de sa symétrique par rapport à une droite ?`, `$${s}$ cm² : la symétrie conserve les aires`] }],
    ['Les points de l\'axe',
      () => { const P = pt(), d = choix(AXES); return [`Le point $${P}$ est sur la droite $${d}$. Quel est son symétrique par rapport à $${d}$ ?`, `le point $${P}$ lui-même`] },
      () => { const d = choix(AXES); return [`Quels points sont leur propre symétrique par rapport à la droite $${d}$ ?`, `les points de la droite $${d}$`] }],
    ['L\'axe et la médiatrice',
      () => { const P = pt(), d = choix(AXES); return [`$${P}'$ est le symétrique de $${P}$ par rapport à la droite $${d}$. Que représente $${d}$ pour le segment $[${P}${P}']$ ?`, 'sa médiatrice'] },
      () => { const P = pt(), d = choix(AXES), n = 2 * ent(2, 9); return [`$${P}'$ est le symétrique de $${P}$ par rapport à $${d}$, et $${P}${P}' = ${n}$ cm. À quelle distance de $${d}$ est le point $${P}$ ?`, `$${n / 2}$ cm`] }],
    ['Les images des figures',
      () => { const [A, B] = deuxPts(), d = choix(AXES); return [`Quel est le symétrique de la droite $(${A}${B})$ par rapport à $${d}$ ?`, `la droite $(${A}'${B}')$, qui passe par les symétriques de $${A}$ et $${B}$`] },
      () => { const r = ent(2, 9), C = pt(); return [`Quel est le symétrique d'un cercle de centre $${C}$ et de rayon $${r}$ cm ?`, `un cercle de rayon $${r}$ cm, de centre $${C}'$ (le symétrique de $${C}$)`] }],
    ['Les axes de symétrie',
      () => {
        const [f, n] = choix<[string, string]>([['un carré', '$4$'], ['un rectangle (pas carré)', '$2$'], ['un losange (pas carré)', '$2$'], ['un triangle équilatéral', '$3$'], ['un cercle', 'une infinité'], ['un triangle isocèle (pas équilatéral)', '$1$'], ['un hexagone régulier', '$6$'], ['un segment', '$2$']])
        return [`Combien d'axes de symétrie a ${f} ?`, n]
      }],
  ]),
  ...notions('Angles', [
    ['Les sortes d\'angles',
      () => { const [m, nom] = choix<[string, string]>([['90°', 'un angle droit'], ['180°', 'un angle plat'], ['0°', 'un angle nul'], ['360°', 'un angle plein']]), [A, B, C] = tri(); return [`L'angle $${ang(A + B + C)}$ mesure $${m}$. Comment l'appelle-t-on ?`, nom] }],
    ['Angle aigu, angle obtus',
      () => { const [nom, r] = choix<[string, string]>([['aigu', 'entre $0°$ et $90°$'], ['obtus', 'entre $90°$ et $180°$']]), [A, B, C] = tri(); return [`L'angle $${ang(A + B + C)}$ est ${nom}. Entre quelles valeurs sa mesure est-elle comprise ?`, r] }],
    ['Les angles opposés par le sommet',
      () => { const [A, B, C, D] = quad(); return [`Les angles $${ang(A + 'O' + B)}$ et $${ang(C + 'O' + D)}$ sont opposés par le sommet. Que peut-on dire de leurs mesures ?`, 'elles sont égales'] },
      () => { const a = ent(20, 160); return [`Deux angles sont opposés par le sommet. L'un mesure $${a}°$. Combien mesure l'autre ?`, `$${a}°$`] }],
    ['Les angles complémentaires',
      () => { const a = ent(10, 80), [A, B, C] = tri(); return [`Les angles $${ang(A + B + C)}$ et $${ang(B + C + A)}$ sont complémentaires, et $${ang(A + B + C)} = ${a}°$. Combien mesure $${ang(B + C + A)}$ ?`, `$${90 - a}°$ (la somme vaut $90°$)`] },
      () => { const a = ent(10, 80); return [`Deux angles mesurent $${a}°$ et $${90 - a}°$. Comment les appelle-t-on ?`, 'des angles complémentaires'] }],
    ['Les angles supplémentaires',
      () => { const a = ent(10, 170), [A, B, C] = tri(); return [`Les angles $${ang(A + B + C)}$ et $${ang(B + C + A)}$ sont supplémentaires, et $${ang(A + B + C)} = ${a}°$. Combien mesure $${ang(B + C + A)}$ ?`, `$${180 - a}°$ (la somme vaut $180°$)`] },
      () => { const a = ent(10, 170); return [`Deux angles mesurent $${a}°$ et $${180 - a}°$. Comment les appelle-t-on ?`, 'des angles supplémentaires'] }],
    ['Les angles adjacents',
      () => { const [A, B, C, P] = pts(4); return [`Les angles $${ang(A + P + B)}$ et $${ang(B + P + C)}$ ont le même sommet $${P}$, le côté $[${P}${B})$ en commun, et sont de part et d'autre de ce côté. Comment les appelle-t-on ?`, 'des angles adjacents'] },
      () => { const [A, B, C, P] = pts(4); return [`Que faut-il pour que $${ang(A + P + B)}$ et $${ang(B + P + C)}$ soient adjacents ?`, `qu'ils aient le sommet $${P}$ et le côté $[${P}${B})$ en commun, et soient de part et d'autre de ce côté`] }],
    ['La bissectrice',
      () => { const [A, B] = deuxPts(), a = 2 * ent(10, 80); return [`La demi-droite $[Ot)$ partage l'angle $${ang(A + 'O' + B)}$ de $${a}°$ en deux angles de même mesure. Comment l'appelle-t-on ?`, `la bissectrice de $${ang(A + 'O' + B)}$`] },
      () => { const [A, B] = deuxPts(), a = 2 * ent(10, 80); return [`$[Ot)$ est la bissectrice de $${ang(A + 'O' + B)}$, qui mesure $${a}°$. Combien mesure $${ang(A + 'Ot')}$ ?`, `$${a / 2}°$`] }],
  ]),
  ...notions('Triangles', [
    ['La somme des angles',
      () => { const [A, B, C] = tri(); return [`Dans le triangle $${A}${B}${C}$, combien vaut $${ang(A)} + ${ang(B)} + ${ang(C)}$ ?`, '$180°$'] },
      () => { const [A, B, C] = tri(); return [`Compléter : dans le triangle $${A}${B}${C}$, la somme des mesures des trois angles vaut…`, '$180°$'] }],
    ['Le triangle équilatéral',
      () => { const [A, B, C] = tri(); return [`Le triangle $${A}${B}${C}$ est équilatéral. Combien mesure l'angle $${ang(A + B + C)}$ ?`, '$60°$'] },
      () => { const [A, B, C] = tri(), a = ent(3, 12); return [`Le triangle $${A}${B}${C}$ est équilatéral et $${A}${B} = ${a}$ cm. Que sait-on de ses autres côtés ?`, `ils mesurent aussi $${a}$ cm`] }],
    ['Le triangle isocèle',
      () => { const [A, B, C] = tri(); return [`$${A}${B}${C}$ est isocèle en $${A}$. Quels angles ont la même mesure ?`, `$${ang(A + B + C)}$ et $${ang(A + C + B)}$`] },
      () => { const [A, B, C] = tri(); return [`$${A}${B}${C}$ est isocèle en $${A}$. Quels côtés ont la même longueur ?`, `$[${A}${B}]$ et $[${A}${C}]$`] }],
    ['Le triangle rectangle',
      () => { const [A, B, C] = tri(); return [`$${A}${B}${C}$ est rectangle en $${A}$. Combien vaut $${ang(A + B + C)} + ${ang(A + C + B)}$ ?`, '$90°$'] },
      () => { const [A, B, C] = tri(); return [`$${A}${B}${C}$ est rectangle et isocèle en $${A}$. Combien mesure $${ang(A + B + C)}$ ?`, '$45°$'] }],
    ['La médiatrice',
      () => { const [A, B] = deuxPts(), d = choix(AXES); return [`La droite $${d}$ est perpendiculaire au segment $[${A}${B}]$ en son milieu. Comment l'appelle-t-on ?`, `la médiatrice de $[${A}${B}]$`] },
      () => { const [A, B] = deuxPts(); return [`Qu'est-ce que la médiatrice du segment $[${A}${B}]$ ?`, `la droite perpendiculaire à $[${A}${B}]$ en son milieu`] }],
    ['La propriété de la médiatrice',
      () => { const [A, B, M] = pts(3); return [`Le point $${M}$ est sur la médiatrice de $[${A}${B}]$. Que peut-on dire de $${M}${A}$ et $${M}${B}$ ?`, `elles sont égales : $${M}${A} = ${M}${B}$`] },
      () => { const [A, B, M] = pts(3), n = ent(2, 9); return [`$${M}${A} = ${M}${B} = ${n}$ cm. Sur quelle droite est le point $${M}$ ?`, `sur la médiatrice de $[${A}${B}]$`] }],
    ['Le cercle circonscrit',
      () => { const [A, B, C] = tri(); return [`Le centre du cercle circonscrit au triangle $${A}${B}${C}$ est le point de concours de ses…`, 'médiatrices'] },
      () => { const [A, B, C] = tri(); return [`Comment s'appelle le cercle qui passe par $${A}$, $${B}$ et $${C}$, les sommets du triangle $${A}${B}${C}$ ?`, `le cercle circonscrit au triangle $${A}${B}${C}$`] }],
    ['L\'inégalité triangulaire',
      () => { const [A, B, C] = tri(); return [`Dans le triangle $${A}${B}${C}$, compléter : $${A}${B} < \\ldots$`, `$${A}${C} + ${C}${B}$`] },
      () => { const a = ent(3, 8), b = ent(3, 8); return [`Deux côtés d'un triangle mesurent $${a}$ cm et $${b}$ cm. Le troisième doit être plus petit que…`, `$${a + b}$ cm`] }],
    ['Aire du triangle',
      () => { const b = ent(3, 15), h = ent(2, 12); return [`Un triangle a une base de $${b}$ cm et une hauteur de $${h}$ cm. Quel calcul donne son aire ?`, `$${b} \\times ${h} \\div 2$ (base $\\times$ hauteur $\\div 2$)`] }],
  ]),
  ...notions('Parallélogrammes', [
    ['Les diagonales du parallélogramme',
      () => { const [A, B, C, D] = quad(); return [`$${A}${B}${C}${D}$ est un parallélogramme de centre $O$. Que peut-on dire du point $O$ ?`, `c'est le milieu de $[${A}${C}]$ et de $[${B}${D}]$`] },
      () => { const [A, B, C, D] = quad(); return [`Les diagonales $[${A}${C}]$ et $[${B}${D}]$ du quadrilatère $${A}${B}${C}${D}$ se coupent en leur milieu. Quelle est sa nature ?`, 'un parallélogramme'] }],
    ['Les côtés du parallélogramme',
      () => { const [A, B, C, D] = quad(); return [`Que peut-on dire des côtés $[${A}${B}]$ et $[${C}${D}]$ du parallélogramme $${A}${B}${C}${D}$ ?`, 'ils sont parallèles et de même longueur'] },
      () => { const [A, B, C, D] = quad(), a = ent(3, 12); return [`$${A}${B}${C}${D}$ est un parallélogramme et $${A}${B} = ${a}$ cm. Combien mesure $${C}${D}$ ?`, `$${a}$ cm`] }],
    ['Les angles du parallélogramme',
      () => { const [A, B, C, D] = quad(), a = ent(30, 150); return [`$${A}${B}${C}${D}$ est un parallélogramme et $${ang(A)} = ${a}°$. Combien mesure $${ang(C)}$ ?`, `$${a}°$ (angles opposés)`] },
      () => { const [A, B, C, D] = quad(), a = ent(30, 150); return [`$${A}${B}${C}${D}$ est un parallélogramme et $${ang(A)} = ${a}°$. Combien mesure $${ang(B)}$ ?`, `$${180 - a}°$ (deux angles consécutifs font $180°$)`] }],
    ['Le rectangle',
      () => { const [A, B, C, D] = quad(); return [`Le parallélogramme $${A}${B}${C}${D}$ a un angle droit en $${A}$. Quelle est sa nature ?`, 'un rectangle'] },
      () => { const [A, B, C, D] = quad(), n = ent(4, 15); return [`$${A}${B}${C}${D}$ est un rectangle et $${A}${C} = ${n}$ cm. Combien mesure $${B}${D}$ ?`, `$${n}$ cm (les diagonales ont la même longueur)`] }],
    ['Le losange',
      () => { const [A, B, C, D] = quad(), n = ent(3, 9); return [`$${A}${B}${C}${D}$ est un parallélogramme et $${A}${B} = ${B}${C} = ${n}$ cm. Quelle est sa nature ?`, 'un losange'] },
      () => { const [A, B, C, D] = quad(); return [`$${A}${B}${C}${D}$ est un losange. Que peut-on dire de ses diagonales $[${A}${C}]$ et $[${B}${D}]$ ?`, 'elles se coupent en leur milieu et sont perpendiculaires'] }],
    ['Le carré',
      () => { const [A, B, C, D] = quad(), n = ent(3, 9); return [`Le parallélogramme $${A}${B}${C}${D}$ a un angle droit en $${A}$, et $${A}${B} = ${A}${D} = ${n}$ cm. Quelle est sa nature ?`, 'un carré'] },
      () => { const [A, B, C, D] = quad(); return [`Le carré $${A}${B}${C}${D}$ est à la fois…`, 'un rectangle et un losange'] }],
    ['Le nom des polygones',
      () => {
        const [n, nom] = choix<[number, string]>([[5, 'un pentagone'], [6, 'un hexagone'], [8, 'un octogone'], [3, 'un triangle'], [4, 'un quadrilatère'], [10, 'un décagone']])
        return une([`Comment appelle-t-on un polygone à $${n}$ côtés ?`, nom], [`Combien de côtés a ${nom} ?`, `$${n}$`])
      }],
    ['Aire et périmètre du rectangle',
      () => { const L = ent(5, 15), l = ent(2, L - 1); return une([`Un rectangle mesure $${L}$ cm sur $${l}$ cm. Quel calcul donne son aire ?`, `$${L} \\times ${l}$ (longueur $\\times$ largeur)`],
        [`Un rectangle mesure $${L}$ cm sur $${l}$ cm. Quel calcul donne son périmètre ?`, `$2 \\times (${L} + ${l})$`]) }],
    ['L\'aire du parallélogramme',
      () => { const b = ent(3, 12), h = ent(2, 9); return [`Un parallélogramme a un côté de $${b}$ cm et une hauteur relative à ce côté de $${h}$ cm. Quel calcul donne son aire ?`, `$${b} \\times ${h}$ (côté $\\times$ hauteur)`] }],
  ]),
  ...notions('Probabilités', [
    ['Les valeurs d\'une probabilité',
      () => { const n = choix([4, 6, 8, 12, 20]); return [`On lance un dé équilibré à $${n}$ faces. Entre quelles valeurs la probabilité d'un évènement est-elle forcément comprise ?`, '$0$ et $1$'] },
      () => { const r = ent(2, 9), b = ent(2, 9); return [`Un sac contient $${r}$ boules rouges et $${b}$ boules bleues. Entre quelles valeurs la probabilité de tirer une boule rouge est-elle forcément comprise ?`, '$0$ et $1$'] }],
    ['Impossible et certain',
      () => { const n = choix([4, 6, 8, 12]), k = n + ent(1, 5); return [`On lance un dé à $${n}$ faces numérotées de $1$ à $${n}$. Quelle est la probabilité d'obtenir $${k}$ ?`, '$0$ : c\'est un évènement impossible'] },
      () => { const n = choix([4, 6, 8, 12]); return [`On lance un dé à $${n}$ faces numérotées de $1$ à $${n}$. Quelle est la probabilité d'obtenir un nombre entre $1$ et $${n}$ ?`, '$1$ : c\'est un évènement certain'] },
      () => { const [ev, p] = choix<[string, string]>([['impossible', '$0$'], ['certain', '$1$']]); return [`Comment appelle-t-on un évènement de probabilité ${p} ?`, `un évènement ${ev}`] }],
    ['Une chance sur deux',
      () => { const n = choix([4, 6, 8, 10, 12, 20]); return [`On lance un dé équilibré à $${n}$ faces numérotées de $1$ à $${n}$. Quelle est la probabilité d'obtenir un nombre pair ?`, '$\\frac{1}{2}$ (une chance sur deux)'] },
      () => { const k = ent(2, 9), [c1, c2] = choix<[string, string]>([['rouges', 'vertes'], ['bleues', 'jaunes'], ['blanches', 'noires']]); return [`Un sac contient $${k}$ boules ${c1} et $${k}$ boules ${c2}. Quelle est la probabilité de tirer une boule ${c1} ?`, '$\\frac{1}{2}$ (une chance sur deux)'] }],
    ['Les issues équiprobables',
      () => { const r = ent(2, 9), b = ent(2, 9); return [`Un sac contient $${r}$ boules rouges et $${b}$ boules bleues, indiscernables au toucher. Comment calcule-t-on la probabilité de tirer une rouge ?`, `nombre de boules rouges ÷ nombre total de boules : $${frac(r, r + b)}$`] },
      () => { const n = choix([4, 6, 8, 10, 12, 20]); return [`Un dé équilibré a $${n}$ faces. Quelle est la probabilité d'obtenir une face donnée ?`, `$${frac(1, n)}$`] }],
  ]),
  ...notions('Proportionnalité', [
    ['Le coefficient de proportionnalité',
      () => { const k = nb(ent(2, 30) / 2); return [`Dans un tableau de proportionnalité, on passe de la première ligne à la deuxième en multipliant par $${k}$. Comment s'appelle $${k}$ ?`, 'le coefficient de proportionnalité'] },
      () => { const k = nb(ent(2, 30) / 2); return [`Le coefficient d'un tableau de proportionnalité vaut $${k}$. Comment passe-t-on de la première ligne à la deuxième ?`, `en multipliant par $${k}$`] }],
    ['Le graphique',
      () => { const o = choix(OBJETS), p = nb(ent(5, 40) / 10); return [`On représente le prix payé en fonction du nombre de ${o} achetés, à $${p}$ € l'unité. Comment sont les points du graphique ?`, 'alignés avec l\'origine du repère'] },
      () => { const o = choix(OBJETS); return [`Le prix de ${o} est proportionnel à leur nombre. Par quel point passe forcément la droite qui représente cette situation ?`, 'par l\'origine du repère'] }],
    ['Le retour à l\'unité',
      () => { const n = ent(3, 9), o = choix(OBJETS); return [`On connaît le prix de $${n}$ ${o}. Que calcule-t-on d'abord pour faire un « retour à l'unité » ?`, `le prix d'un seul (on divise par $${n}$)`] },
      () => { const n = ent(3, 9), m = ent(2, 12), o = choix(OBJETS); return [`On connaît le prix de $${n}$ ${o} et on cherche celui de $${m}$. En quoi consiste la méthode du « retour à l'unité » ?`, `chercher le prix d'un seul, puis le multiplier par $${m}$`] }],
    ['La linéarité',
      () => { const a = ent(2, 6), k = ent(2, 4), o = choix(OBJETS); return [`Si on connaît le prix de $${a}$ ${o}, comment obtient-on le prix de $${a * k}$ ${o} ?`, `on multiplie par $${k}$`] },
      () => { const a = ent(2, 6), b = ent(2, 6), o = choix(OBJETS); return [`On connaît le prix de $${a}$ ${o} et celui de $${b}$ ${o}. Comment obtient-on le prix de $${a + b}$ ${o} ?`, 'on additionne les deux prix'] }],
    ['Appliquer un pourcentage',
      () => { const p = choix([5, 12, 15, 20, 30, 35, 60, 75]); return [`Calculer $${p}\\,\\%$ d'un nombre, c'est le multiplier par…`, `$${frac(p, 100)}$ (ou $${nb(p / 100)}$)`] }],
  ]),
  ...notions('Statistiques', [
    ['La moyenne',
      () => { const t = Array.from({ length: ent(3, 5) }, () => ent(4, 20)); return [`Quel calcul donne la moyenne de ${t.map(x => `$${x}$`).join(', ')} ?`, `$(${t.join(' + ')}) \\div ${t.length}$`] },
      () => { const n = ent(3, 12); return [`On a relevé $${n}$ températures. Comment calcule-t-on leur moyenne ?`, `on ajoute les $${n}$ températures, puis on divise par $${n}$`] }],
    ['L\'effectif total',
      () => { const e = Array.from({ length: ent(3, 4) }, () => ent(2, 15)); return [`Dans un tableau, les effectifs sont ${e.map(x => `$${x}$`).join(', ')}. Comment obtient-on l'effectif total ?`, `on les ajoute : $${e.reduce((p, x) => p + x, 0)}$`] }],
    ['Le diagramme circulaire',
      () => { const [f, a] = choix<[string, number]>([['la moitié', 180], ['le quart', 90], ['le tiers', 120], ['le sixième', 60], ['les trois quarts', 270]]); return une([`Dans un diagramme circulaire, quel angle représente ${f} de l'effectif total ?`, `$${a}°$`], [`Dans un diagramme circulaire, un secteur a un angle de $${a}°$. Quelle part de l'effectif total représente-t-il ?`, f]) }],
    ['La fréquence',
      () => { const N = choix([20, 25, 30, 40]), e = ent(2, N - 2); return une([`Sur $${N}$ élèves, $${e}$ ont répondu « oui ». Quel calcul donne la fréquence de « oui » ?`, `$${e} \\div ${N}$ (effectif ÷ effectif total)`], [`Entre quelles valeurs une fréquence est-elle toujours comprise ?`, '$0$ et $1$ (ou $0\\,\\%$ et $100\\,\\%$)']) }],
  ]),
]

// =============================================================
// LES AUTOMATISMES (4e)
// Rangés comme la liste officielle des automatismes de 4e (programme
// 2026), avec quelques objectifs de l'année en « hors liste officielle ».
// Mêmes règles qu'en 5e : réponse courte, jamais une chance sur deux,
// des valeurs tirées au hasard à chaque question, et souvent une
// question à trou dont les pointillés changent de place.
// =============================================================
/** Un relatif en début de calcul : −7 ou 12 (sans parenthèses) */
const seul = (x: number) => nb(x)
/** Un entier relatif non nul */
const relNonNul = (a: number, b: number) => { let x: number; do { x = ent(-b, b) } while (x === 0 || Math.abs(x) < a); return x }
const cm3 = (v: string) => `${v}\\text{ cm}^3`
const cm2 = (v: string) => `${v}\\text{ cm}^2`
const piFois = (k: number) => k === 1 ? '\\pi' : `${k}\\pi`
const coord = (x: number, y: number) => `(${nb(x)}\\,;\\,${nb(y)})`
/** Un nombre avec l'espace des milliers : 12\,000 */
const grandNb = (x: number) => { const [e, d] = nb(x).split('{,}'); return e.replace(/\B(?=(\d{3})+(?!\d))/g, '\\,') + (d !== undefined ? '{,}' + d : '') }

export const AUTOMATISMES_4E: Automatisme[] = [
  // ================= OPÉRATIONS SUR LES NOMBRES RELATIFS =================
  {
    id: '4e-relatifs-sommes', theme: 'Opérations sur les nombres relatifs', titre: 'Sommes et différences de relatifs',
    programme: 'Manipuler des sommes et des différences de nombres relatifs.',
    generer() {
      const a = relNonNul(1, 15), b = relNonNul(1, 15), moins = Math.random() < 0.5
      const v = moins ? a - b : a + b
      return choix([
        { enonce: `Calculer : $${seul(a)} ${moins ? '-' : '+'} ${rel(b)}$`, reponse: nb(v) },
        { enonce: `Calculer : $${seul(a)} ${b < 0 ? '-' : '+'} ${Math.abs(b)}$`, reponse: nb(b < 0 ? a - Math.abs(b) : a + b) },
      ])
    },
    trou() {
      const a = relNonNul(1, 12), b = relNonNul(1, 12), c = a + b
      return unTrou('', [[`$${seul(a)} + \\ldots = ${nb(c)}$`, nb(b)], [`$\\ldots + ${rel(b)} = ${nb(c)}$`, nb(a)], [`$${seul(c)} - \\ldots = ${nb(a)}$`, nb(b)]])
    },
  },
  {
    id: '4e-opposes', theme: 'Opérations sur les nombres relatifs', titre: 'Opposés et somme d’opposés',
    programme: 'Opposé d’un nombre, somme des opposés.',
    generer() {
      const a = relNonNul(2, 15), b = relNonNul(2, 15), c = relNonNul(1, 15)
      const termes = melange([`${a}`, `${-a}`, `${b}`, `${-b}`, `${c}`])
      const ecrit = termes.map((t, i) => i === 0 ? seul(Number(t)) : (Number(t) < 0 ? `- ${-Number(t)}` : `+ ${t}`)).join(' ')
      const x = a / choix([1, 10])
      return Math.random() < 0.7 ? { enonce: `Calculer astucieusement : $${ecrit}$`, reponse: nb(c) }
        : { enonce: `Quel est l'opposé de $${nb(-x)}$ ?`, reponse: nb(x) }
    },
    trou() {
      const a = ent(2, 99) / choix([1, 10]), s = choix([1, -1])
      return unTrou('', [[`$${nb(s * a)} + \\ldots = 0$`, nb(-s * a)], [`$\\ldots + ${rel(s * a)} = 0$`, nb(-s * a)]])
    },
  },
  {
    id: '4e-tables', theme: 'Opérations sur les nombres relatifs', titre: 'Tables de multiplication',
    programme: 'Entretenir les tables de multiplication.',
    generer() { const a = ent(3, 9), b = ent(3, 9); return Math.random() < 0.6 ? { enonce: `Calculer : $${a} \\times ${b}$`, reponse: nb(a * b) } : { enonce: `Calculer : $${a * b} \\div ${a}$`, reponse: nb(b) } },
    trou() {
      const a = ent(3, 9), b = ent(3, 9), p = a * b
      return unTrou('', [[`$${a} \\times \\ldots = ${p}$`, nb(b)], [`$\\ldots \\times ${b} = ${p}$`, nb(a)], [`$${p} = ${a} \\times \\ldots$`, nb(b)], [`$\\ldots = ${a} \\times ${b}$`, nb(p)]])
    },
  },
  {
    id: '4e-fois-10', theme: 'Opérations sur les nombres relatifs', titre: 'Multiplier et diviser par 10, 100, 1 000',
    programme: 'Multiplier et diviser par 10, 100, 1 000.',
    generer() {
      const x = ent(11, 9999) / choix([10, 100, 1000]), k = choix([10, 100, 1000]), fois = Math.random() < 0.5
      return { enonce: `Calculer : $${nb(x)} ${fois ? '\\times' : '\\div'} ${mille(k)}$`, reponse: nb(fois ? x * k : x / k) }
    },
    trou() {
      const x = ent(11, 999) / choix([10, 100]), k = choix([10, 100, 1000]), y = x * k
      return unTrou('', [[`$${nb(x)} \\times \\ldots = ${nb(y)}$`, mille(k)], [`$${nb(y)} \\div \\ldots = ${nb(x)}$`, mille(k)], [`$\\ldots \\times ${mille(k)} = ${nb(y)}$`, nb(x)], [`$\\ldots \\div ${mille(k)} = ${nb(x)}$`, nb(y)]])
    },
  },
  {
    id: '4e-multiplication-trou', theme: 'Opérations sur les nombres relatifs', titre: 'Multiplication à trou et division',
    programme: 'Compléter des multiplications à trou ; faire le lien entre multiplication et division.',
    generer() {
      const a = ent(2, 12), b = ent(1, 30)
      return choix([
        { enonce: `Quel calcul donne le nombre manquant dans $${a} \\times \\ldots = ${b}$ ?`, reponse: `${b} \\div ${a}` },
        { enonce: `On sait que $${a} \\times ${b} = ${a * b}$. Quelle division donnant $${b}$ en déduit-on ?`, reponse: `${a * b} \\div ${a} = ${b}` },
      ])
    },
    trou() {
      let a: number, b: number
      do { a = ent(2, 12); b = ent(1, 20) } while (b % a === 0)
      return unTrou('', [[`$${a} \\times \\ldots = ${b}$`, irreductible(b, a)], [`$\\ldots \\times ${a} = ${b}$`, irreductible(b, a)]])
    },
  },
  {
    id: '4e-addition-iteree', theme: 'Opérations sur les nombres relatifs', titre: 'Une addition répétée est une multiplication',
    programme: 'La multiplication comme addition itérée : 3 + 3 + 3 + 3 = 4 × 3.',
    generer() {
      const b = choix([ent(2, 15), -ent(2, 9), ent(11, 49) / 10]), n = ent(3, 7)
      const somme = Array.from({ length: n }, (_, i) => i === 0 ? nb(b) : (b < 0 ? `+ (${nb(b)})` : `+ ${nb(b)}`)).join(' ')
      return { enonce: `Écrire sous la forme d'un produit : $${somme}$`, reponse: `${n} \\times ${b < 0 ? `(${nb(b)})` : nb(b)}` }
    },
    trou() {
      const b = ent(2, 15), n = ent(3, 6), somme = Array(n).fill(b).join(' + ')
      return unTrou('', [[`$${somme} = \\ldots \\times ${b}$`, nb(n)], [`$${somme} = ${n} \\times \\ldots$`, nb(b)]])
    },
  },
  {
    id: '4e-produit-relatifs', theme: 'Opérations sur les nombres relatifs', titre: 'Multiplier et diviser des relatifs',
    programme: 'Multiplier et diviser deux nombres relatifs.', application: true,
    generer() {
      const a = relNonNul(2, 9), b = relNonNul(2, 9)
      return Math.random() < 0.6 ? { enonce: `Calculer : $${rel(a)} \\times ${rel(b)}$`, reponse: nb(a * b) } : { enonce: `Calculer : $${rel(a * b)} \\div ${rel(b)}$`, reponse: nb(a) }
    },
  },
  {
    id: '4e-enchainement-relatifs', theme: 'Opérations sur les nombres relatifs', titre: 'Un enchaînement d’opérations avec des relatifs',
    programme: 'Calculer un enchaînement d’opérations avec des nombres relatifs.', application: true,
    generer() {
      // Comme au brevet : le premier nombre sans parenthèses, les négatifs suivants entre parenthèses
      const p = (x: number) => x < 0 ? `(${nb(x)})` : nb(x)
      let a: number, b: number, c: number
      do { a = relNonNul(1, 9); b = relNonNul(2, 9); c = relNonNul(2, 6) } while (a > 0 && b > 0 && c > 0)
      const [e, v] = choix<[string, number]>([[`${nb(a)} + ${p(b)} \\times ${p(c)}`, a + b * c], [`${nb(a)} \\times ${p(b)} - ${p(c)}`, a * b - c], [`(${nb(a)} - ${p(b)}) \\times ${p(c)}`, (a - b) * c], [`${nb(a)} - ${p(b)} \\times ${p(c)}`, a - b * c], [`${p(b)} \\times ${p(c)} + ${p(a)} \\times ${p(c)}`, b * c + a * c]])
      return { enonce: choix([`Calculer : $${e}$`, `Calculer $C = ${e}$`]), reponse: nb(v) }
    },
  },

  // ================= NOMBRES RATIONNELS =================
  {
    id: '4e-fractions-addsub', theme: 'Nombres rationnels', titre: 'Additionner et soustraire des fractions',
    programme: 'Additionner et soustraire des fractions de dénominateurs quelconques mais simples.',
    generer() {
      // Des dénominateurs simples : l'un multiple de l'autre, ou 2 et 3, 3 et 4…
      // … et, comme au brevet (3/5 − 1/4), deux dénominateurs sans diviseur commun : 4 et 5, 3 et 7…
      const [d1, d2] = choix<[number, number]>([[2, 4], [3, 6], [4, 8], [5, 10], [2, 6], [3, 9], [4, 12], [2, 3], [3, 4], [2, 5], [4, 6], [6, 9], [4, 5], [3, 5], [5, 6], [2, 7], [3, 7], [3, 8], [5, 4], [5, 3]])
      let a: number, b: number, moins: boolean, num: number
      const D = d1 * d2 / pgcd(d1, d2)
      do { a = ent(1, d1 + 3); b = ent(1, d2 + 3); moins = Math.random() < 0.4; num = moins ? a * D / d1 - b * D / d2 : a * D / d1 + b * D / d2 } while (num <= 0 || pgcd(a, d1) !== 1 || pgcd(b, d2) !== 1)
      const [f1, f2] = melange([frac(a, d1), frac(b, d2)])
      const ecrit = moins ? `${frac(a, d1)} - ${frac(b, d2)}` : `${f1} + ${f2}`
      const enonce = choix([`Calculer et simplifier si possible : $${ecrit}$`, `Calculer et donner le résultat sous forme de fraction irréductible : $${ecrit}$`, `Calculer $A = ${ecrit}$. Donner le résultat sous forme de fraction irréductible.`])
      return { enonce, reponse: irreductible(num, D) }
    },
  },
  {
    id: '4e-comparer-fractions', theme: 'Nombres rationnels', titre: 'Comparer des fractions',
    programme: 'Comparer des fractions.',
    generer() {
      const D = choix([6, 8, 10, 12])
      const divs = [1, 2, 3, 4, 5, 6].filter(k => D % k === 0 && k < D)
      let nums: number[]
      do { nums = melange(Array.from({ length: 2 * D - 1 }, (_, i) => i + 1)).slice(0, 3) } while (nums.includes(D) || new Set(nums.map(n => irreductible(n, D))).size < 3 || nums.every(n => pgcd(n, D) === 1))
      const ecrire = (n: number) => { const g = choix(divs.filter(k => n % k === 0)); return frac(n / g, D / g) }
      const f = nums.map(n => ({ n, t: ecrire(n) }))
      const tries = [...f].sort((x, y) => x.n - y.n).map(x => x.t)
      return { enonce: `Ranger dans l'ordre croissant : $${melange(f).map(x => x.t).join(' \; ; \; ')}$`, reponse: tries.join(' < ') }
    },
  },
  {
    id: '4e-ranger-ecritures', theme: 'Nombres rationnels', titre: 'Ranger des nombres écrits de façons différentes',
    programme: 'Comparer des fractions, des décimaux.',
    generer() {
      // Quatre nombres proches, écrits en décimal, en fraction, ou en
      // « 1 + 3/100 » : comme au brevet (1,25 ; 1 + 3/100 ; 1,3 ; 7/4)
      const i = ent(0, 2), K = [3, 4, 5, 7, 20, 25, 30, 40, 50, 60, 70, 75, 80]
      let ks: number[]
      const enFraction = (v: number) => { for (const q of [2, 4, 5]) if ((v * q) % 100 === 0) return frac(v * q / 100, q); return '' }
      do { ks = melange(K).slice(0, 4) } while (!ks.some(k => k % 5 === 0 && enFraction(i * 100 + k) !== '') || !ks.some(k => k < 10))
      // La fraction va à un nombre qui en a une ; la somme, de préférence aux centièmes « pièges »
      const v = ks.map(k => i * 100 + k)
      const iF = v.findIndex(x => enFraction(x) !== '')
      const iS = ks.findIndex((k, j) => j !== iF && k < 10)
      const ecrits = v.map((x, j) => {
        if (j === iF) return enFraction(x)
        if (j === iS) return i === 0 ? frac(ks[j], 100) : `${i} + ${frac(ks[j], 100)}`
        return nb(x / 100)
      })
      const l = v.map((x, j) => ({ x, t: ecrits[j] }))
      const croissant = Math.random() < 0.7
      const tries = [...l].sort((a, b) => croissant ? a.x - b.x : b.x - a.x).map(a => a.t)
      return { enonce: `Ranger dans l'ordre ${croissant ? 'croissant' : 'décroissant'} : $${melange(l).map(a => a.t).join(' \\;;\\; ')}$`, reponse: tries.join(croissant ? ' < ' : ' > ') }
    },
  },
  {
    id: '4e-quotient', theme: 'Nombres rationnels', titre: 'La fraction est un quotient',
    programme: 'Savoir qu’une fraction est aussi un quotient : 7 × 3/7 = 3.',
    generer() {
      let a: number, b: number
      do { a = ent(1, 12); b = ent(2, 13) } while (a % b === 0 || pgcd(a, b) !== 1)
      return choix([
        { enonce: `Quel nombre, multiplié par $${b}$, donne $${a}$ ?`, reponse: frac(a, b) },
        { enonce: `Calculer : $${b} \\times ${frac(a, b)}$`, reponse: nb(a) },
      ])
    },
    trou() {
      let a: number, b: number
      do { a = ent(1, 12); b = ent(2, 13) } while (a % b === 0 || pgcd(a, b) !== 1)
      return unTrou('', [[`$${b} \\times \\ldots = ${a}$`, frac(a, b)], [`$${b} \\times ${frac(a, b)} = \\ldots$`, nb(a)], [`$\\ldots \\times ${frac(a, b)} = ${a}$`, nb(b)]])
    },
  },
  {
    id: '4e-fraction-nombre', theme: 'Nombres rationnels', titre: 'Prendre une fraction d’un nombre',
    programme: 'Prendre la fraction d’un nombre revient à multiplier la fraction par ce nombre.',
    generer() {
      let n: number, d: number
      do { n = ent(1, 7); d = ent(2, 10) } while (n >= d || pgcd(n, d) !== 1)
      const N = d * ent(2, 12), v = N / d * n
      return choix([{ enonce: `Calculer : $${frac(n, d)} \\times ${N}$`, reponse: nb(v) }, { enonce: `Combien valent les $${frac(n, d)}$ de $${N}$ ?`, reponse: nb(v) }])
    },
    trou() {
      let n: number, d: number
      do { n = ent(1, 7); d = ent(2, 10) } while (n >= d || pgcd(n, d) !== 1)
      const N = d * ent(2, 12), v = N / d * n
      return unTrou('', [[`$${frac(n, d)} \\times ${N} = \\ldots$`, nb(v)], [`$${frac(n, d)} \\times \\ldots = ${v}$`, nb(N)]])
    },
  },
  {
    id: '4e-simplifier-fraction', theme: 'Nombres rationnels', titre: 'Simplifier une fraction',
    programme: 'Simplifier une fraction.', application: true,
    generer() {
      let n: number, d: number
      do { n = ent(1, 9); d = ent(2, 11) } while (n === d || pgcd(n, d) !== 1)
      const k = ent(2, 9)
      return { enonce: choix([`Simplifier le plus possible : $${frac(n * k, d * k)}$`, `Écrire sous forme de fraction irréductible : $${frac(n * k, d * k)}$`]), reponse: frac(n, d) }
    },
    trou() {
      let n: number, d: number
      do { n = ent(1, 9); d = ent(2, 11) } while (n === d || pgcd(n, d) !== 1)
      const k = ent(2, 9)
      return unTrou('', [[`$${frac(n * k, d * k)} = \\frac{\\ldots}{${d}}$`, nb(n)], [`$${frac(n * k, d * k)} = \\frac{${n}}{\\ldots}$`, nb(d)], [`$${frac(n, d)} = \\frac{\\ldots}{${d * k}}$`, nb(n * k)]])
    },
  },
  {
    id: '4e-produit-fractions', theme: 'Nombres rationnels', titre: 'Multiplier des fractions',
    programme: 'Calculer le produit de nombres rationnels.', application: true,
    generer() {
      let a: number, b: number, c: number, d: number
      do { a = ent(1, 7); b = ent(2, 9); c = ent(1, 7); d = ent(2, 9) } while (a === b || c === d)
      return { enonce: `Calculer et simplifier si possible : $${frac(a, b)} \\times ${frac(c, d)}$`, reponse: irreductible(a * c, b * d) }
    },
  },
  {
    id: '4e-inverse', theme: 'Nombres rationnels', titre: 'L’inverse d’un nombre',
    programme: 'Déterminer l’inverse d’un nombre, d’une fraction.', application: true,
    generer() {
      if (Math.random() < 0.5) { const n = choix([2, 3, 4, 5, 8, 10, -2, -4, 7]); return { enonce: `Quel est l'inverse de $${nb(n)}$ ?`, reponse: frac(1, n) } }
      let a: number, b: number
      do { a = ent(1, 9); b = ent(2, 9) } while (a === b || pgcd(a, b) !== 1)
      return { enonce: `Quel est l'inverse de $${frac(a, b)}$ ?`, reponse: frac(b, a) }
    },
  },
  {
    id: '4e-diviser-fractions', theme: 'Nombres rationnels', titre: 'Diviser par une fraction',
    programme: 'Diviser des fractions.', application: true,
    generer() {
      let a: number, b: number, c: number, d: number
      do { a = ent(1, 9); b = ent(2, 9); c = ent(1, 9); d = ent(2, 9) } while (a === b || c === d || pgcd(a, b) !== 1 || pgcd(c, d) !== 1 || c === 1 && Math.random() < 0.7)
      if (Math.random() < 0.3) { const n = ent(2, 9); return { enonce: `Calculer et simplifier si possible : $${n} \\div ${frac(c, d)}$`, reponse: irreductible(n * d, c) } }
      return { enonce: `Calculer et simplifier si possible : $${frac(a, b)} \\div ${frac(c, d)}$`, reponse: irreductible(a * d, b * c) }
    },
  },

  // ================= PUISSANCES =================
  {
    id: '4e-carres', theme: 'Puissances', titre: 'Les carrés parfaits de 0 à 144',
    programme: 'Connaître les carrés parfaits des entiers de 0 à 12.',
    generer() { const n = ent(0, 12); return { enonce: `Calculer : $${n}^2$`, reponse: nb(n * n) } },
    trou() { const n = ent(2, 12); return unTrou('', [[`$${n}^2 = \\ldots$`, nb(n * n)], [`$\\ldots^2 = ${n * n}$ (nombre positif)`, nb(n)], [`$${n * n} = ${n} \\times \\ldots$`, nb(n)]]) },
  },
  {
    id: '4e-fois-puissance-10', theme: 'Puissances', titre: 'Compléter 1 200 = 1,2 × …',
    programme: 'Multiplier et diviser par 10, 100, 1 000 ; compléter 1 200 = 1,2 × …',
    generer() {
      const x = ent(11, 99) / 10, k = choix([10, 100, 1000]), N = x * k
      return { enonce: `Par quel nombre faut-il multiplier $${nb(x)}$ pour obtenir $${grandNb(N)}$ ?`, reponse: mille(k) }
    },
    trou() {
      const x = ent(11, 99) / 10, k = choix([10, 100, 1000]), N = x * k
      return unTrou('', [[`$${grandNb(N)} = ${nb(x)} \\times \\ldots$`, mille(k)], [`$${grandNb(N)} = \\ldots \\times ${mille(k)}$`, nb(x)]])
    },
  },
  {
    id: '4e-puissances', theme: 'Puissances', titre: 'Puissances simples',
    programme: 'Puissances simples : 2² = 4 ; 2³ = 8 ; 3³ = 27 ; 10² = 100 ; 10³ = 1 000.',
    generer() {
      const [a, n] = choix<[number, number]>([[2, 2], [2, 3], [2, 4], [2, 5], [3, 2], [3, 3], [4, 2], [4, 3], [5, 2], [5, 3], [10, 2], [10, 3], [10, 4], [10, 6], [1, 7], [0, 5]])
      return { enonce: `Calculer : $${a}^{${n}}$`, reponse: grandNb(a ** n) }
    },
    trou() {
      const [a, n] = choix<[number, number]>([[2, 3], [2, 4], [3, 3], [5, 3], [10, 3], [10, 4], [10, 5], [2, 5], [4, 3]])
      return unTrou('', [[`$${a}^{\\ldots} = ${grandNb(a ** n)}$`, nb(n)], [`$\\ldots^{${n}} = ${grandNb(a ** n)}$`, nb(a)]])
    },
  },
  {
    id: '4e-calcul-puissances-10', theme: 'Puissances', titre: 'Calculer avec 10², 10³…',
    programme: '10² = 100 ; 10³ = 1 000 ; multiplier par 10, 100, 1 000.',
    generer() {
      // Comme au brevet (3,1 × 10² − 5 × 10 + …), avec des exposants positifs en 4e
      let termes: { a: number; n: number; signe: number }[], total: number
      do {
        const k = ent(2, 3)
        termes = Array.from({ length: k }, (_, j) => ({ a: choix([ent(2, 9), ent(11, 99) / 10]), n: j === 0 ? ent(2, 3) : ent(0, 2), signe: j === 0 ? 1 : choix([1, -1]) }))
        total = arrondi(termes.reduce((t, x) => t + x.signe * x.a * 10 ** x.n, 0))
      } while (total <= 0 || new Set(termes.map(x => x.n)).size < termes.length)
      const ecrire = (x: { a: number; n: number }) => x.n === 0 ? nb(x.a) : `${nb(x.a)} \\times ${x.n === 1 ? '10' : `10^{${x.n}}`}`
      const calcul = termes.map((x, j) => (j === 0 ? '' : x.signe < 0 ? ' - ' : ' + ') + ecrire(x)).join('')
      return { enonce: choix([`Calculer : $${calcul}$`, `Calculer $B = ${calcul}$`]), reponse: grandNb(total) }
    },
    trou() {
      const a = ent(11, 99) / 10, n = ent(2, 4), v = arrondi(a * 10 ** n)
      return unTrou('', [[`$${nb(a)} \\times 10^{\\ldots} = ${grandNb(v)}$`, nb(n)], [`$\\ldots \\times 10^{${n}} = ${grandNb(v)}$`, nb(a)], [`$${nb(a)} \\times 10^{${n}} = \\ldots$`, grandNb(v)]])
    },
  },
  {
    id: '4e-produit-puissances', theme: 'Puissances', titre: 'Multiplier des puissances',
    programme: 'Multiplier des puissances d’un même nombre, ou de même exposant.', application: true,
    generer() {
      if (Math.random() < 0.65) {
        const a = choix([2, 3, 5, 7, 10, ent(2, 9)]), m = ent(2, 9), n = ent(2, 9)
        return { enonce: `Écrire sous la forme d'une seule puissance : $${a}^{${m}} \\times ${a}^{${n}}$`, reponse: `${a}^{${m + n}}` }
      }
      const [a, b] = choix<[number, number]>([[2, 5], [4, 5], [2, 3], [3, 3], [5, 2], [2, 7]]), n = ent(2, 9)
      return { enonce: `Écrire sous la forme d'une seule puissance : $${a}^{${n}} \\times ${b}^{${n}}$`, reponse: `${a * b}^{${n}}` }
    },
    trou() {
      const a = ent(2, 9), m = ent(2, 8), n = ent(2, 8)
      return unTrou('', [[`$${a}^{${m}} \\times ${a}^{\\ldots} = ${a}^{${m + n}}$`, nb(n)], [`$${a}^{${m}} \\times ${a}^{${n}} = ${a}^{\\ldots}$`, nb(m + n)]])
    },
  },

  // ================= RACINE CARRÉE =================
  {
    id: '4e-racines', theme: 'Racine carrée', titre: 'Les carrés des entiers de 0 à 12, à l’envers',
    programme: 'Donner les carrés des nombres entiers de 0 à 12.',
    generer() {
      const n = ent(0, 12)
      if (Math.random() < 0.6) return { enonce: `Quel nombre positif a pour carré $${n * n}$ ?`, reponse: nb(n) }
      let v: number
      do { v = ent(2, 140) } while (Number.isInteger(Math.sqrt(v)))
      const k = Math.floor(Math.sqrt(v))
      return { enonce: `Le nombre positif dont le carré vaut $${v}$ est compris entre quels entiers consécutifs ?`, reponse: mot(`entre $${k}$ et $${k + 1}$`) }
    },
    trou() { const n = ent(1, 12); return unTrou('', [[`$\\sqrt{${n * n}} = \\ldots$`, nb(n)], [`$\\sqrt{\\ldots} = ${n}$`, nb(n * n)]]) },
  },
  {
    id: '4e-encadrer-racine', theme: 'Racine carrée', titre: 'Encadrer une racine carrée par deux entiers',
    programme: 'Encadrer la racine carrée d’un entier par deux entiers consécutifs.', application: true,
    generer() {
      let n: number
      do { n = ent(2, 140) } while (Number.isInteger(Math.sqrt(n)))
      const k = Math.floor(Math.sqrt(n))
      return { enonce: choix([`Encadrer $\\sqrt{${n}}$ par deux nombres entiers consécutifs.`, `Entre quels nombres entiers consécutifs se trouve $\\sqrt{${n}}$ ?`]), reponse: `${k} < \\sqrt{${n}} < ${k + 1}` }
    },
  },

  // ================= CALCUL LITTÉRAL ET ALGÉBRIQUE =================
  {
    id: '4e-valeur-expression', theme: 'Calcul littéral et algébrique', titre: 'La valeur d’une expression numérique',
    programme: 'Donner la valeur d’expressions numériques simples.',
    generer() {
      const a = ent(2, 12), b = ent(2, 9), c = ent(2, 9)
      const [e, v] = choix<[string, number]>([[`${a} + ${b} \\times ${c}`, a + b * c], [`${a} \\times ${b} - ${c}`, a * b - c], [`(${a} + ${b}) \\times ${c}`, (a + b) * c], [`${a} - ${b} \\times ${c}`, a - b * c], [`${b} \\times ${c} - ${a} \\times 2`, b * c - 2 * a], [`${a * b} \\div ${b} + ${c}`, a + c]])
      return { enonce: `Calculer : $${e}$`, reponse: nb(v) }
    },
  },
  {
    id: '4e-equations', theme: 'Calcul littéral et algébrique', titre: 'Résoudre x + b = c et ax = c',
    programme: 'Résoudre des équations du type ax = c et x + b = c.',
    generer() {
      const x = choix(['x', 'y', 't'])
      const sorte = ent(0, 2)
      if (sorte === 0) { const b = relNonNul(1, 15), c = ent(-15, 15); return { enonce: `Résoudre : $${x} ${b < 0 ? '-' : '+'} ${Math.abs(b)} = ${c}$`, reponse: `${x} = ${nb(c - b)}` } }
      if (sorte === 1) { const a = ent(2, 9), s = ent(-9, 12); return { enonce: `Résoudre : $${a}${x} = ${a * s}$`, reponse: `${x} = ${nb(s)}` } }
      let a: number, c: number
      do { a = ent(2, 9); c = ent(1, 20) } while (c % a === 0)
      return { enonce: `Résoudre : $${a}${x} = ${c}$`, reponse: `${x} = ${irreductible(c, a)}` }
    },
  },
  {
    id: '4e-ecriture-3x', theme: 'Calcul littéral et algébrique', titre: 'Écrire 3 × x sous la forme 3x',
    programme: 'Écrire 3 × x sous la forme 3x, et savoir que 3x c’est 3 × x.',
    generer() {
      const k = ent(2, 12), x = choix(['x', 'a', 'y', 'n'])
      const [e, r] = choix<[string, string]>([[`${k} \\times ${x}`, `${k}${x}`], [`${x} \\times ${k}`, `${k}${x}`], [`${k} \\times ${x} \\times ${x}`, `${k}${x}^2`], [`1 \\times ${x}`, x], [`${x} \\times ${x} \\times ${x}`, `${x}^3`]])
      return { enonce: `Écrire plus simplement : $${e}$`, reponse: r }
    },
  },
  {
    id: '4e-reduire', theme: 'Calcul littéral et algébrique', titre: 'x + x = 2x, x × x = x², 3x × 2x = 6x²',
    programme: '1 × x = x ; x + x = 2x ; x × x = x² ; 3x + 2x = 5x ; 3x × 2x = 6x².',
    generer() {
      const a = ent(2, 9), b = ent(2, 9), x = choix(['x', 'a', 'y'])
      const [e, r] = choix<[string, string]>([[`${x} + ${x}`, `2${x}`], [`${x} + ${x} + ${x}`, `3${x}`], [`${x} \\times ${x}`, `${x}^2`], [`${a}${x} + ${b}${x}`, `${a + b}${x}`], [`${a}${x} \\times ${b}${x}`, `${a * b}${x}^2`], [`${a + b}${x} - ${b}${x}`, `${a}${x}`], [`${a}${x} \\times ${b}`, `${a * b}${x}`]])
      return { enonce: `Réduire : $${e}$`, reponse: r }
    },
    trou() {
      const a = ent(2, 9), b = ent(2, 9), x = choix(['x', 'a', 'y'])
      return unTrou('', [[`$${a}${x} + \\ldots = ${a + b}${x}$`, `${b}${x}`], [`$${a}${x} \\times \\ldots = ${a * b}${x}^2$`, `${b}${x}`], [`$${x} \\times \\ldots = ${x}^2$`, x]])
    },
  },
  {
    id: '4e-double-triple', theme: 'Calcul littéral et algébrique', titre: 'Double, triple, moitié, prédécesseur, successeur, carré',
    programme: 'Donner le double, le triple, la moitié, le prédécesseur, le successeur, le carré d’un nombre.',
    generer() {
      if (Math.random() < 0.3) {
        const x = choix(['x', 'n', 'a'])
        const [quoi, r] = choix<[string, string]>([['le double', `2${x}`], ['le triple', `3${x}`], ['la moitié', `\\frac{${x}}{2}`], ['le successeur', `${x} + 1`], ['le prédécesseur', `${x} - 1`], ['le carré', `${x}^2`]])
        return { enonce: `Exprimer en fonction de $${x}$ ${quoi} de $${x}$.`, reponse: r }
      }
      const n = choix([ent(3, 99), ent(11, 99) / 10, -ent(2, 30)])
      const [quoi, v] = choix<[string, number]>(([['le double', 2 * n], ['le triple', 3 * n], ['la moitié', n / 2], ['le successeur', n + 1], ['le prédécesseur', n - 1], ['le carré', Number.isInteger(n) && Math.abs(n) <= 15 ? n * n : NaN]] as [string, number][]).filter(([, v]) => !Number.isNaN(v)))
      return { enonce: `Quel est ${quoi} de $${nb(n)}$ ?`, reponse: nb(v) }
    },
  },
  {
    id: '4e-tester-egalite', theme: 'Calcul littéral et algébrique', titre: 'Tester si un nombre vérifie une égalité',
    programme: 'Tester si un nombre vérifie une égalité.',
    generer() {
      // Une égalité px + q = rx + s, dont la solution est l'un des quatre nombres proposés
      let p: number, q: number, r: number, s: number, x0: number
      do { x0 = ent(-5, 6); p = ent(2, 7); r = ent(1, 6); q = ent(-9, 9); s = p * x0 + q - r * x0 } while (p === r || Math.abs(s) > 20 || q === 0 || s === 0)
      const candidats = melange([x0, ...melange([-6, -5, -4, -3, -2, -1, 0, 1, 2, 3, 4, 5, 6, 7].filter(v => v !== x0)).slice(0, 3)]).sort((a, b) => a - b)
      const terme = (k: number, c: number) => `${k === 1 ? '' : k}x ${c < 0 ? '-' : '+'} ${Math.abs(c)}`
      return { enonce: `Lequel des nombres ${candidats.map(c => `$${c}$`).join(', ')} vérifie l'égalité $${terme(p, q)} = ${terme(r, s)}$ ?`, reponse: nb(x0) }
    },
  },
  {
    id: '4e-developper', theme: 'Calcul littéral et algébrique', titre: 'Développer et factoriser k(x + a)',
    programme: 'Utiliser la distributivité simple pour développer et factoriser.', application: true,
    generer() {
      const k = ent(2, 9), a = relNonNul(1, 9), x = choix(['x', 'a', 'y'])
      return { enonce: `Développer : $${k}(${x} ${a < 0 ? '-' : '+'} ${Math.abs(a)})$`, reponse: `${k}${x} ${a < 0 ? '-' : '+'} ${Math.abs(k * a)}` }
    },
    trou() {
      const k = ent(2, 9), a = ent(1, 9), x = choix(['x', 'a', 'y'])
      return unTrou('', [[`$${k}${x} + ${k * a} = ${k}(${x} + \\ldots)$`, nb(a)], [`$${k}${x} + ${k * a} = \\ldots(${x} + ${a})$`, nb(k)], [`$${k}(${x} + ${a}) = ${k}${x} + \\ldots$`, nb(k * a)]])
    },
  },
  {
    id: '4e-reduire-parentheses', theme: 'Calcul littéral et algébrique', titre: 'Développer et réduire',
    programme: 'Développer avec la distributivité simple, puis réduire.', application: true,
    generer() {
      const x = choix(['a', 'x', 'y']), lin = (p: number, q: number) => {
        const t = p === 0 ? '' : p === 1 ? x : p === -1 ? `-${x}` : `${p}${x}`
        if (q === 0) return t || '0'
        return t === '' ? nb(q) : `${t} ${q < 0 ? '-' : '+'} ${Math.abs(q)}`
      }
      let a: number, b: number, k: number, c: number, d: number, signe: number
      do { a = relNonNul(1, 9); b = relNonNul(1, 9); k = ent(2, 6); c = ent(1, 5); d = relNonNul(1, 9); signe = choix([1, -1]) } while (a + signe * k * c === 0 || b + signe * k * d === 0)
      const calcul = `${lin(a, b)} ${signe < 0 ? '-' : '+'} ${k}(${lin(c, d)})`
      return { enonce: choix([`Réduire l'expression : $${calcul}$`, `Développer et réduire : $${calcul}$`]), reponse: lin(a + signe * k * c, b + signe * k * d) }
    },
  },
  {
    id: '4e-equation-affine', theme: 'Calcul littéral et algébrique', titre: 'Résoudre ax + b = c',
    programme: 'Résoudre une équation du premier degré du type ax + b = c.', application: true,
    generer() {
      const x = choix(['x', 'y', 't']), a = ent(2, 9), s = ent(-6, 12), b = relNonNul(1, 15), c = a * s + b
      const gauche = `${a}${x} ${b < 0 ? '-' : '+'} ${Math.abs(b)}`
      return { enonce: choix([`Résoudre : $${gauche} = ${c}$`, `Déterminer la solution de l'équation : $${gauche} = ${c}$`, `Résoudre : $${c} = ${gauche}$`]), reponse: `${x} = ${nb(s)}` }
    },
  },

  // ================= TRANSFORMATIONS =================
  {
    id: '4e-demi-tour', theme: 'Transformations', titre: 'Le symétrique d’un point par demi-tour',
    programme: 'Construire le symétrique d’un point par demi-tour.',
    generer() {
      let ax: number, ay: number, ix: number, iy: number, bx: number, by: number
      do { ix = ent(-2, 2); iy = ent(-2, 2); ax = ent(-4, 4); ay = ent(-4, 4); bx = 2 * ix - ax; by = 2 * iy - ay } while ((ax === ix && ay === iy) || Math.abs(bx) > 5 || Math.abs(by) > 5 || (ix === 0 && iy === 0 && Math.random() < 0.5))
      const [A, I] = choix([['A', 'I'], ['B', 'O'], ['M', 'K'], ['E', 'C']])
      return { enonce: `Quelles sont les coordonnées du point $${A}'$, symétrique du point $${A}$ par le demi-tour de centre $${I}$ ?`, figure: F.reperePoints([{ x: ax, y: ay, nom: A }, { x: ix, y: iy, nom: I, centre: true }]), reponse: coord(bx, by) }
    },
  },

  // ================= REPÉRAGE =================
  {
    id: '4e-abscisse-relatif', theme: 'Repérage', titre: 'Repérer un relatif sur une droite graduée',
    programme: 'Placer et repérer un nombre relatif sur une droite graduée.',
    generer() {
      const debut = ent(-6, -1), parts = choix([1, 2, 4, 5, 10])
      let k: number
      do { k = ent(1, 4 * parts - 1) } while (debut + k / parts === 0)
      const x = debut + k / parts
      const L = choix(['A', 'B', 'M', 'R'])
      return { enonce: `Quelle est l'abscisse du point $${L}$ ?`, figure: F.droiteGraduee(debut, debut + 4, parts, x, L), reponse: nb(x) }
    },
  },
  {
    id: '4e-coordonnees', theme: 'Repérage', titre: 'Lire les coordonnées d’un point',
    programme: 'Dans un repère orthogonal, lire les coordonnées d’un point.',
    generer() {
      const noms = melange(['A', 'B', 'C', 'D', 'E', 'F']).slice(0, 3)
      const pts: { x: number; y: number; nom: string }[] = []
      while (pts.length < 3) { const x = ent(-5, 5), y = ent(-5, 5); if (x !== 0 && y !== 0 && !pts.some(p => p.x === x && p.y === y)) pts.push({ x, y, nom: noms[pts.length] }) }
      const p = choix(pts)
      return { enonce: `Quelles sont les coordonnées du point $${p.nom}$ ?`, figure: F.reperePoints(pts), reponse: coord(p.x, p.y) }
    },
  },
  {
    id: '4e-placer-point', theme: 'Repérage', titre: 'Trouver le point de coordonnées données',
    programme: 'Dans un repère orthogonal, placer un point de coordonnées données.',
    generer() {
      // Le point cherché, et des pièges : coordonnées échangées, signes changés
      let x: number, y: number
      do { x = relNonNul(1, 5); y = relNonNul(1, 5) } while (Math.abs(x) === Math.abs(y))
      const lieux = [[x, y], [y, x], [-x, y], [x, -y], [-x, -y], [-y, -x]].filter((q, i, t) => t.findIndex(r => r[0] === q[0] && r[1] === q[1]) === i).slice(0, 4)
      const noms = melange(['E', 'F', 'G', 'H'])
      const pts = melange(lieux).map((q, i) => ({ x: q[0], y: q[1], nom: noms[i] }))
      const bon = pts.find(p => p.x === x && p.y === y)!
      return { enonce: `Quel point a pour coordonnées $${coord(x, y)}$ ?`, figure: F.reperePoints(pts), reponse: mot(`$${bon.nom}$`) }
    },
  },

  // ================= REPRÉSENTATION DE L'ESPACE =================
  {
    id: '4e-reconnaitre-solide', theme: 'Représentation de l’espace', titre: 'Reconnaître un solide',
    programme: 'Reconnaître les solides : cube, pavé, cylindre, prisme droit.',
    generer() {
      const [s, nom] = choix<[F.Solide, string]>([['cube', 'un cube'], ['pave', 'un pavé droit'], ['cylindre', 'un cylindre'], ['prisme3', 'un prisme droit'], ['prisme5', 'un prisme droit'], ['prisme4', 'un prisme droit'], ['pyramide', 'une pyramide']])
      return { enonce: 'Comment s\'appelle ce solide ?', figure: F.solide(s), reponse: mot(nom) }
    },
  },
  {
    id: '4e-base-prisme', theme: 'Représentation de l’espace', titre: 'La base d’un prisme droit',
    programme: 'Reconnaître la base d’un prisme en perspective cavalière.',
    generer() {
      const [s, base, n] = choix<[F.Solide, string, number]>([['prisme3', 'un triangle', 3], ['prisme4', 'un quadrilatère (un trapèze)', 4], ['prisme5', 'un pentagone', 5], ['prisme6', 'un hexagone', 6]])
      return Math.random() < 0.6 ? { enonce: 'Ce solide est un prisme droit. Quelle est la forme de ses bases ?', figure: F.solide(s), reponse: mot(base) }
        : { enonce: 'Ce solide est un prisme droit. Combien a-t-il de faces latérales ?', figure: F.solide(s), reponse: nb(n) }
    },
  },
  {
    id: '4e-volumes', theme: 'Représentation de l’espace', titre: 'Volume d’un cube, d’un pavé, d’un prisme, d’un cylindre',
    programme: 'Utiliser les formules du volume d’un cube, d’un pavé, d’un prisme, d’un cylindre.',
    generer() {
      const sorte = ent(0, 3)
      if (sorte === 0) { const a = ent(2, 10); return { enonce: `Quel est le volume d'un cube de $${a}$ cm d'arête ?`, reponse: cm3(grandNb(a ** 3)) } }
      if (sorte === 1) { const l = ent(2, 10), w = ent(2, 6), h = ent(2, 10); return { enonce: `Quel est le volume d'un pavé droit de $${l}$ cm sur $${w}$ cm sur $${h}$ cm ?`, reponse: cm3(grandNb(l * w * h)) } }
      if (sorte === 2) { const B = ent(3, 40), h = ent(2, 12); return { enonce: `Un prisme droit a une base d'aire $${B}$ cm² et une hauteur de $${h}$ cm. Quel est son volume ?`, reponse: cm3(grandNb(B * h)) } }
      const r = ent(1, 6), h = ent(2, 10)
      return { enonce: `Quel est le volume d'un cylindre de rayon $${r}$ cm et de hauteur $${h}$ cm ? (valeur exacte)`, reponse: cm3(piFois(r * r * h)) }
    },
  },
  {
    id: '4e-aires', theme: 'Représentation de l’espace', titre: 'Aire d’un triangle, d’un rectangle, d’un disque',
    programme: 'Calculer l’aire d’un triangle, d’un rectangle, d’un disque.',
    generer() {
      const sorte = ent(0, 2)
      if (sorte === 0) { const b = ent(2, 14), h = 2 * ent(1, 7); return { enonce: `Quelle est l'aire d'un triangle de base $${b}$ cm et de hauteur $${h}$ cm ?`, reponse: cm2(nb(b * h / 2)) } }
      if (sorte === 1) { const L = ent(3, 15), l = ent(2, 12); return { enonce: `Quelle est l'aire d'un rectangle de $${L}$ cm sur $${l}$ cm ?`, reponse: cm2(nb(L * l)) } }
      const r = ent(1, 10)
      return Math.random() < 0.5 ? { enonce: `Quelle est l'aire d'un disque de rayon $${r}$ cm ? (valeur exacte)`, reponse: cm2(piFois(r * r)) }
        : { enonce: `Quelle est l'aire d'un disque de diamètre $${2 * r}$ cm ? (valeur exacte)`, reponse: cm2(piFois(r * r)) }
    },
  },
  {
    id: '4e-volume-pyramide-cone', theme: 'Représentation de l’espace', titre: 'Volume d’une pyramide, d’un cône',
    programme: 'Connaître le volume de la pyramide et du cône de révolution.', application: true,
    generer() {
      if (Math.random() < 0.5) {
        let c: number, h: number
        do { c = ent(2, 9); h = ent(2, 12) } while ((c * c * h) % 3 !== 0)
        return choix([
          { enonce: `Une pyramide a pour base un carré de côté $${c}$ cm et pour hauteur $${h}$ cm. Calculer son volume.`, reponse: cm3(nb(c * c * h / 3)) },
          { enonce: `Une pyramide a une base d'aire $${c * c}$ cm² et une hauteur de $${h}$ cm. Calculer son volume.`, reponse: cm3(nb(c * c * h / 3)) },
        ])
      }
      let r: number, h: number
      do { r = ent(1, 6); h = ent(2, 12) } while ((r * r * h) % 3 !== 0)
      return { enonce: `Un cône de révolution a pour rayon $${r}$ cm et pour hauteur $${h}$ cm. Donner son volume en fonction de $\\pi$.`, reponse: cm3(piFois(r * r * h / 3)) }
    },
  },

  // ================= PARALLÉLOGRAMMES ET TRANSLATIONS =================
  {
    id: '4e-images-symetries', theme: 'Parallélogrammes et translations', titre: 'Images par une symétrie axiale ou un demi-tour',
    programme: 'Déterminer l’image d’un point par une symétrie axiale ou un demi-tour.',
    generer() {
      let x: number, y: number
      do { x = relNonNul(1, 4); y = relNonNul(1, 4) } while (Math.abs(x) === Math.abs(y))
      const images: [string, number, number][] = [['la symétrie de centre $O$ (l\'origine du repère)', -x, -y], ['la symétrie d\'axe l\'axe des abscisses', x, -y], ['la symétrie d\'axe l\'axe des ordonnées', -x, y]]
      const noms = melange(['B', 'C', 'D'])
      const pts = [{ x, y, nom: 'A' }, ...images.map((im, i) => ({ x: im[1], y: im[2], nom: noms[i] }))]
      const i = ent(0, 2), [t] = images[i]
      if (Math.random() < 0.6) return { enonce: `Quel point est l'image du point $A$ par ${t} ?`, figure: F.reperePoints(pts), reponse: mot(`$${noms[i]}$`) }
      return { enonce: `Par quelle symétrie le point $${noms[i]}$ est-il l'image du point $A$ ? (préciser l'axe ou le centre)`, figure: F.reperePoints(pts), reponse: mot(t) }
    },
  },
  {
    id: '4e-image-triangle', theme: 'Parallélogrammes et translations', titre: 'L’image d’un triangle dans une figure (symétrie, demi-tour, translation)',
    programme: 'Images de figures par une symétrie axiale, un demi-tour ; comprendre l’effet d’une translation.', application: true,
    generer() {
      // Le losange de seize triangles du sujet de brevet, aux lettres tirées au hasard
      const L = pts(9), P = F.POINTS_LOSANGE
      const ou = (x: number, y: number) => P.findIndex(([a, b]) => a === x && b === y)
      const nomPt = (i: number) => L[i]
      // Les transformations : axes (droites qui portent trois points), demi-tour de centre le point du milieu, translations
      const axes: [number, number, (x: number, y: number) => [number, number]][] = [[0, 2, (x, y) => [-x, y]], [1, 3, (x, y) => [x, -y]], [4, 6, (x, y) => [-y, -x]], [7, 5, (x, y) => [y, x]]]
      let triangle: number[], image: number[], texte: string
      do {
        // Un triangle dont les trois côtés suivent des traits de la figure
        do { triangle = melange([0, 1, 2, 3, 4, 5, 6, 7, 8]).slice(0, 3) } while (aligne(triangle.map(i => P[i])) || ![[0, 1], [1, 2], [0, 2]].every(([u, w]) => surUnTrait(P[triangle[u]], P[triangle[w]])))
        const sorte = choix(['translation', 'translation', 'axe', 'centre'])
        let f: (x: number, y: number) => [number, number]
        if (sorte === 'translation') {
          let a: number, b: number
          do { a = ent(0, 8); b = ent(0, 8) } while (a === b)
          const [dx, dy] = [P[b][0] - P[a][0], P[b][1] - P[a][1]]
          f = (x, y) => [x + dx, y + dy]
          texte = `la translation qui transforme $${nomPt(a)}$ en $${nomPt(b)}$`
        } else if (sorte === 'axe') {
          const [u, w, g] = choix(axes)
          f = g
          texte = `la symétrie d'axe $(${nomPt(u)}${nomPt(w)})$`
        } else {
          f = (x, y) => [-x, -y]
          texte = choix([`la symétrie de centre $${nomPt(8)}$`, `le demi-tour de centre $${nomPt(8)}$`])
        }
        image = triangle.map(i => ou(...f(...P[i])))
      } while (image.includes(-1) || [...image].sort().join() === [...triangle].sort().join())
      const t = triangle.map(nomPt).join(''), im = image.map(nomPt).join('')
      return { enonce: `La figure est formée de $16$ triangles rectangles isocèles superposables. Quelle est l'image du triangle $${t}$ par ${texte} ?`, figure: F.losangeTriangles(L), reponse: mot(`le triangle $${im}$`) }
    },
  },
  {
    id: '4e-diagonales', theme: 'Parallélogrammes et translations', titre: 'Un parallélogramme particulier par ses diagonales',
    programme: 'Reconnaître un parallélogramme particulier par les propriétés de ses diagonales.',
    generer() {
      const eg = Math.random() < 0.5, pe = Math.random() < 0.5
      const noms = choix(['ABCD', 'EFGH', 'IJKL', 'MNPQ', 'RSTU'])
      const nature = eg && pe ? 'un carré' : eg ? 'un rectangle' : pe ? 'un losange' : 'un parallélogramme'
      return { enonce: `D'après le codage de ses diagonales, quelle est la nature du quadrilatère $${noms}$ ?`, figure: F.diagonalesCodees(eg, pe, noms, ent(-6, 6) * 10), reponse: mot(nature) }
    },
  },
  {
    id: '4e-parallelogramme-code', theme: 'Parallélogrammes et translations', titre: 'Un parallélogramme particulier par ses côtés et ses angles',
    programme: 'Reconnaître un parallélogramme et sa nature grâce aux codages.',
    generer() {
      const lg = Math.random() < 0.5, dr = Math.random() < 0.5
      const noms = choix(['ABCD', 'EFGH', 'IJKL', 'MNPQ', 'RSTU'])
      const nature = lg && dr ? 'un carré' : lg ? 'un losange' : dr ? 'un rectangle' : 'un parallélogramme'
      return { enonce: `$${noms}$ est un parallélogramme. D'après le codage, quelle est sa nature ?`, figure: F.parallelogrammeCode(lg, dr, noms, ent(-4, 4) * 10, ent(0, 3)), reponse: mot(nature) }
    },
  },

  // ================= TRIANGLES =================
  {
    id: '4e-droites-remarquables', theme: 'Triangles', titre: 'Reconnaître une droite remarquable',
    programme: 'Reconnaître les droites remarquables : médiatrices, médianes, hauteurs, bissectrices.',
    generer() {
      const sorte = choix<F.Remarquable>(['mediatrice', 'mediane', 'hauteur', 'bissectrice'])
      const [A, B, C] = [...choix(['ABC', 'EFG', 'IJK', 'MNP', 'RST'])]
      const nom = { mediatrice: `la médiatrice de $[${B}${C}]$`, mediane: `la médiane issue de $${A}$`, hauteur: `la hauteur issue de $${A}$`, bissectrice: `la bissectrice de l'angle $\\widehat{${B}${A}${C}}$` }[sorte]
      return { enonce: `Dans le triangle $${A}${B}${C}$, comment s'appelle la droite $(d)$ ?`, figure: F.droiteRemarquable(sorte, A + B + C, ent(-3, 3) * 15), reponse: mot(nom) }
    },
  },
  {
    id: '4e-pythagore', theme: 'Triangles', titre: 'Le théorème de Pythagore',
    programme: 'Connaître et appliquer le théorème de Pythagore.', application: true,
    generer() {
      const [p, q, r] = choix([[3, 4, 5], [6, 8, 10], [5, 12, 13], [8, 15, 17], [9, 12, 15], [12, 16, 20]])
      const [A, B, C] = [...choix(['ABC', 'EFG', 'IJK', 'MNP', 'RST'])]
      if (Math.random() < 0.5) return { enonce: `$${A}${B}${C}$ est rectangle en $${A}$, $${A}${B} = ${p}$ cm et $${A}${C} = ${q}$ cm. Combien mesure $${B}${C}$ ?`, reponse: `${r}\\text{ cm}` }
      return { enonce: `$${A}${B}${C}$ est rectangle en $${A}$, $${B}${C} = ${r}$ cm et $${A}${B} = ${p}$ cm. Combien mesure $${A}${C}$ ?`, reponse: `${q}\\text{ cm}` }
    },
  },
  {
    id: '4e-reciproque-pythagore', theme: 'Triangles', titre: 'En quel sommet le triangle est-il rectangle ?',
    programme: 'Connaître la réciproque du théorème de Pythagore.', application: true,
    generer() {
      const [p, q, r] = choix([[3, 4, 5], [6, 8, 10], [5, 12, 13], [8, 15, 17], [9, 12, 15], [12, 16, 20], [7, 24, 25]])
      const S = pts(3)
      // Le sommet de l'angle droit est en face du plus grand côté
      const droit = ent(0, 2), [u, w] = [0, 1, 2].filter(i => i !== droit)
      const cote = (i: number, j: number) => S[Math.min(i, j)] + S[Math.max(i, j)]
      const cotes = melange([[cote(u, w), r], [cote(droit, u), p], [cote(droit, w), q]] as [string, number][])
      return { enonce: `Dans le triangle $${S.join('')}$ : ${cotes.map(([c, v]) => `$${c} = ${v}$ cm`).join(', ')}. Ce triangle est rectangle : en quel sommet ?`, reponse: mot(`en $${S[droit]}$`) }
    },
  },
  {
    id: '4e-droite-milieux', theme: 'Triangles', titre: 'La droite des milieux : une longueur',
    programme: 'Connaître les théorèmes de la droite des milieux.', application: true,
    generer() {
      const [A, B, C, I, J] = pts(5), base = choix([ent(4, 24), ent(21, 89) / 5])
      const enonce0 = `$${I}$ et $${J}$ sont les milieux de $[${A}${B}]$ et de $[${A}${C}]$.`
      if (Math.random() < 0.6) return { enonce: `${enonce0} Combien mesure $${I}${J}$ ?`, figure: F.droiteMilieux(A + B + C + I + J, { ou: 'base', t: `${nb(base).replace('{,}', ',')} cm` }, 'milieux', ent(-3, 3) * 12), reponse: unite(nb(base / 2), 'cm') }
      return { enonce: `${enonce0} Combien mesure $${B}${C}$ ?`, figure: F.droiteMilieux(A + B + C + I + J, { ou: 'milieux', t: `${nb(base / 2).replace('{,}', ',')} cm` }, 'base', ent(-3, 3) * 12), reponse: unite(nb(base), 'cm') }
    },
  },
  {
    id: '4e-cercle-circonscrit', theme: 'Triangles', titre: 'Le cercle circonscrit à un triangle rectangle',
    programme: 'Caractériser un triangle rectangle par son cercle circonscrit.', application: true,
    generer() {
      const [A, B, C] = pts(3), l = choix([ent(4, 20), ent(21, 99) / 5])
      return choix([
        { enonce: `$${A}${B}${C}$ est rectangle en $${A}$ et $${B}${C} = ${nb(l)}$ cm. Quel est le rayon de son cercle circonscrit ?`, reponse: unite(nb(l / 2), 'cm') },
        { enonce: `$${A}${B}${C}$ est rectangle en $${A}$. Où se trouve le centre de son cercle circonscrit ?`, reponse: mot(`au milieu de $[${B}${C}]$`) },
        { enonce: `Le point $${A}$ est sur le cercle de diamètre $[${B}${C}]$, et n'est ni $${B}$ ni $${C}$. Quelle est la nature du triangle $${A}${B}${C}$ ?`, reponse: mot(`rectangle en $${A}$`) },
      ])
    },
  },

  // ================= STATISTIQUES =================
  {
    id: '4e-moyenne', theme: 'Statistiques', titre: 'Une moyenne de quelques valeurs',
    programme: 'Calculer une moyenne pour un très petit nombre de valeurs.',
    generer() {
      const n = choix([2, 3, 4])
      let l: number[]
      do { l = Array.from({ length: n }, () => ent(4, 20)) } while ((l.reduce((s, x) => s + x, 0) * 2) % n !== 0)
      return { enonce: `Quelle est la moyenne de : $${l.join(' \; ; \; ')}$ ?`, reponse: nb(l.reduce((s, x) => s + x, 0) / n) }
    },
  },
  {
    id: '4e-effectif-manquant', theme: 'Statistiques', titre: 'Un effectif manquant',
    programme: 'Calculer un effectif manquant dans un tableau.',
    generer() {
      const [quoi, valeurs] = choix<[string, string[]]>([['Note', ['8', '10', '12', '15']], ['Frères et sœurs', ['0', '1', '2', '3']], ['Pointure', ['36', '37', '38', '39']], ['Couleur', ['\\text{bleu}', '\\text{rouge}', '\\text{vert}']]])
      const eff = valeurs.map(() => ent(1, 9)), k = ent(0, valeurs.length - 1), N = eff.reduce((s, x) => s + x, 0)
      const ligne = eff.map((e, i) => i === k ? '\\ldots' : String(e))
      return { enonce: `L'effectif total est $${N}$. Quel est l'effectif manquant ? $\\quad ${tableau([`\\text{${quoi}}`, ...valeurs], ['\\text{Effectif}', ...ligne])}$`, reponse: nb(eff[k]) }
    },
  },
  {
    id: '4e-frequence', theme: 'Statistiques', titre: 'Calculer une fréquence',
    programme: 'Calculer une fréquence simple.',
    generer() {
      const N = choix([10, 20, 25, 40, 50]), e = ent(1, N - 1)
      const [qui, quoi] = choix<[string, string]>([['élèves', 'ont un animal'], ['élèves', 'viennent à vélo'], ['personnes', 'ont répondu « oui »'], ['lancers', 'ont donné 6']])
      const pc = e / N * 100
      return { enonce: `Sur $${N}$ ${qui}, $${e}$ ${quoi}. Quelle est la fréquence de cette réponse (en fraction, puis en pourcentage) ?`, reponse: mot(`$${irreductible(e, N)}$, soit $${nb(pc)}\\,\\%$`) }
    },
  },
  {
    id: '4e-moyenne-ponderee', theme: 'Statistiques', titre: 'Une moyenne pondérée, à partir d’un tableau',
    programme: 'Calculer une moyenne pondérée à partir d’un tableau.', application: true,
    generer() {
      const [quoi, choixVal] = choix<[string, number[]]>([['Note', [8, 10, 12, 14, 15, 16, 18]], ['Frères et sœurs', [0, 1, 2, 3, 4]], ['Buts marqués', [0, 1, 2, 3, 4, 5]], ['Âge', [11, 12, 13, 14]]])
      let v: number[], e: number[], N: number, S: number
      do { v = melange(choixVal).slice(0, 3).sort((a, b) => a - b); e = v.map(() => ent(1, 6)); N = e.reduce((s, x) => s + x, 0); S = v.reduce((s, x, i) => s + x * e[i], 0) } while ((S * 10) % N !== 0 || new Set(e).size === 1)
      return { enonce: `Calculer la moyenne de cette série. $\\quad ${tableau([`\\text{${quoi}}`, ...v.map(String)], ['\\text{Effectif}', ...e.map(String)])}$`, reponse: nb(S / N) }
    },
  },
  {
    id: '4e-mediane-etendue', theme: 'Statistiques', titre: 'Médiane et étendue',
    programme: 'Déterminer une médiane ; calculer l’étendue d’une série.', application: true,
    generer() {
      const n = choix([5, 7]), l = Array.from({ length: n }, () => ent(2, 20))
      const tri = [...l].sort((a, b) => a - b)
      return Math.random() < 0.5 ? { enonce: `Quelle est la médiane de la série : $${l.join(' \; ; \; ')}$ ?`, reponse: nb(tri[(n - 1) / 2]) }
        : { enonce: `Quelle est l'étendue de la série : $${l.join(' \; ; \; ')}$ ?`, reponse: nb(tri[n - 1] - tri[0]) }
    },
  },

  // ================= PROBABILITÉS =================
  {
    id: '4e-probabilite', theme: 'Probabilités', titre: 'La probabilité d’un évènement',
    programme: 'Calculer la probabilité d’un évènement et de l’évènement contraire.', application: true,
    generer() {
      const sorte = ent(0, 3)
      if (sorte === 0) {
        const n = [ent(2, 7), ent(2, 7), ent(2, 7)], N = n[0] + n[1] + n[2], coul = ['rouges', 'bleues', 'vertes'], k = ent(0, 2)
        const sac = `Un sac contient $${n[0]}$ boules rouges, $${n[1]}$ bleues et $${n[2]}$ vertes. On tire une boule au hasard.`
        return Math.random() < 0.6 ? { enonce: `${sac} Quelle est la probabilité qu'elle soit ${coul[k].slice(0, -1)} ?`, reponse: irreductible(n[k], N) }
          : { enonce: `${sac} Quelle est la probabilité qu'elle ne soit pas ${coul[k].slice(0, -1)} ?`, reponse: irreductible(N - n[k], N) }
      }
      if (sorte === 1) {
        const [ev, f] = choix<[string, number]>([['un nombre pair', 3], ['un multiple de 3', 2], ['un nombre supérieur ou égal à 5', 2], [`le ${ent(1, 6)}`, 1], ['un nombre premier', 3], ['un nombre inférieur à 3', 2]])
        return { enonce: `On lance un dé équilibré à six faces. Quelle est la probabilité d'obtenir ${ev} ?`, reponse: irreductible(f, 6) }
      }
      if (sorte === 2) {
        const p = ent(5, 95) / 100, ev = choix(['qu\'il pleuve demain', 'de gagner à ce jeu', 'que le bus soit en retard'])
        return { enonce: `La probabilité ${ev} est $${nb(p)}$. Quelle est la probabilité de l'évènement contraire ?`, reponse: nb(1 - p) }
      }
      const [ev, f] = choix<[string, string]>([['deux fois pile', '\\frac{1}{4}'], ['deux fois face', '\\frac{1}{4}'], ['une fois pile et une fois face', '\\frac{1}{2}'], ['au moins une fois pile', '\\frac{3}{4}']])
      return { enonce: `On lance deux fois une pièce équilibrée. Quelle est la probabilité d'obtenir ${ev} ?`, reponse: f }
    },
  },

  // ================= PROPORTIONNALITÉ =================
  {
    id: '4e-pourcentages', theme: 'Proportionnalité', titre: 'a % de c, pour a = 100, 50, 25, 10, 1',
    programme: 'Déterminer a % de c quand a vaut 100, 50, 25, 10, 1 ; compléter 20 % de 120 = …',
    generer() {
      const a = choix([100, 50, 25, 10, 1]), c = a === 25 ? 4 * ent(3, 60) : a === 1 ? 100 * ent(1, 30) + choix([0, 50]) : 10 * ent(2, 90)
      return { enonce: `Calculer $${a}\\,\\%$ de $${grandNb(c)}$.`, reponse: nb(a * c / 100) }
    },
    trou() {
      const p = choix([10, 20, 25, 30, 40, 50, 75]), c = 20 * ent(1, 30), v = p * c / 100
      const k = choix([100, 1000]), m = ent(1, 9) * (k / 100), w = m * k / 100
      return unTrou('', [[`$${p}\\,\\% \\text{ de } ${c} = \\ldots$`, nb(v)], [`$${p}\\,\\% \\text{ de } \\ldots = ${nb(v)}$`, nb(c)], [`$${nb(w)} = \\frac{\\ldots}{100} \\times ${mille(k)}$`, nb(m)]])
    },
  },
  {
    id: '4e-quatrieme-proportionnelle', theme: 'Proportionnalité', titre: 'Une quatrième proportionnelle',
    programme: 'Déterminer une quatrième proportionnelle.', application: true,
    generer() {
      let a: number, c: number, pu: number
      do { a = ent(2, 9); c = ent(2, 12); pu = choix([ent(2, 15), ent(11, 49) / 10, ent(1, 9) / 2]) } while (a === c || !Number.isInteger(arrondi(a * pu * 100)))
      const b = arrondi(a * pu), d = arrondi(c * pu)
      const [chose, unite1] = choix<[string, string]>([['kg de pommes', '€'], ['litres d\'essence', '€'], ['m de tissu', '€'], ['cahiers', '€']])
      if (Math.random() < 0.5) return { enonce: `$${a}$ ${chose} coûtent $${nb(b)}$ ${unite1}. Combien coûtent $${c}$ ${chose} ?`, reponse: unite(nb(d), unite1) }
      return { enonce: `Ce tableau est un tableau de proportionnalité. Quel nombre manque ? $\\quad ${tableau([nb(a), nb(c)], [nb(b), '\\ldots'])}$`, reponse: nb(d) }
    },
  },
  {
    id: '4e-augmentation', theme: 'Proportionnalité', titre: 'Augmenter ou diminuer un prix d’un pourcentage',
    programme: 'Appliquer une augmentation ou une diminution, avec le coefficient multiplicateur.', application: true,
    generer() {
      const t = choix([10, 20, 25, 50, 5, 30, 40]), objet = choix(['Un livre', 'Un jeu', 'Un pull', 'Un casque', 'Un ballon', 'Une lampe', 'Un sac'])
      // Un prix qui donne un résultat simple : t % du prix est un nombre entier d'euros
      let p: number
      do { p = choix([ent(2, 30) * 5, ent(4, 60) * 2, ent(1, 12) * 10]) } while (!Number.isInteger(p * t / 100))
      const plus = Math.random() < 0.55
      const v = arrondi(p * (1 + (plus ? t : -t) / 100))
      if (Math.random() < 0.25) return { enonce: `Par quel nombre multiplie-t-on un prix pour ${plus ? 'l\'augmenter' : 'le diminuer'} de $${t}\\,\\%$ ?`, reponse: nb(1 + (plus ? t : -t) / 100) }
      return { enonce: plus ? `${objet} coûte $${p}$ euros. Quel sera son prix après une augmentation de $${t}\\,\\%$ ?` : `${objet} coûte $${p}$ euros. Quel sera son prix après une baisse de $${t}\\,\\%$ ?`, reponse: unite(nb(v), '€') }
    },
  },
  {
    id: '4e-partage-ratio', theme: 'Proportionnalité', titre: 'Un partage selon un ratio',
    programme: 'Résoudre des problèmes de partage proportionnel.', application: true,
    generer() {
      const [p, q] = choix<[number, number]>([[1, 2], [1, 3], [2, 3], [3, 4], [2, 5], [3, 5], [1, 4]]), k = ent(2, 15), total = (p + q) * k
      const [X, Y] = melange(['Léa', 'Tom', 'Inès', 'Hugo', 'Nina', 'Sami']).slice(0, 2)
      const quoi = choix<[string, string]>([['€', 'euros'], ['bonbons', 'bonbons'], ['billes', 'billes']])
      const premier = Math.random() < 0.5
      return { enonce: `${X} et ${Y} se partagent $${total}$ ${quoi[1]} selon le ratio $${p} : ${q}$ (${X} d'abord). Quelle est la part de ${premier ? X : Y} ?`, reponse: quoi[0] === '€' ? unite(nb((premier ? p : q) * k), '€') : mot(`$${(premier ? p : q) * k}$ ${quoi[1]}`) }
    },
  },
  {
    id: '4e-vitesse', theme: 'Proportionnalité', titre: 'Une vitesse moyenne',
    programme: 'Utiliser des grandeurs quotients : la vitesse moyenne.', application: true,
    generer() {
      // Des vitesses vraisemblables pour chacun
      const [vehicule, v] = choix<[string, number]>([['Une voiture', ent(10, 22) * 5], ['Un train', ent(8, 30) * 10], ['Un cycliste', ent(3, 6) * 5], ['Un bus', ent(6, 14) * 5], ['Un randonneur', ent(3, 6)]])
      const t = choix([[2, '2 h'], [3, '3 h'], [0.5, '30 min'], [1.5, '1 h 30 min'], [4, '4 h']] as [number, string][])
      const d = arrondi(v * t[0])
      if (Math.random() < 0.55) return { enonce: `${vehicule} parcourt $${nb(d)}$ km en ${t[1]}. Quelle est sa vitesse moyenne, en km/h ?`, reponse: `${nb(v)}\\text{ km/h}` }
      return { enonce: `${vehicule} avance à $${nb(v)}$ km/h de moyenne pendant ${t[1]}. Quelle distance parcourt-${vehicule.startsWith('Une') ? 'elle' : 'il'} ?`, reponse: unite(nb(d), 'km') }
    },
  },

  // ================= FONCTIONS =================
  {
    id: '4e-programme-calcul', theme: 'Fonctions', titre: 'Un programme de calcul',
    programme: 'Appliquer un programme de calcul à un nombre.', application: true,
    generer() {
      const a = ent(2, 6), b = relNonNul(1, 9), n = ent(-5, 9)
      const [op1, f] = choix<[string, (x: number) => number]>([[`multiplier par $${a}$`, x => a * x], [`ajouter $${a}$`, x => x + a], [`prendre son carré`, x => x * x]])
      return { enonce: `Programme : choisir un nombre ; ${op1} ; puis ${b < 0 ? `soustraire $${-b}$` : `ajouter $${b}$`}. Quel résultat obtient-on avec $${n}$ ?`, reponse: nb(f(n) + b) }
    },
  },
  {
    id: '4e-remonter-programme', theme: 'Fonctions', titre: 'Retrouver le nombre de départ d’un programme',
    programme: 'Retrouver le nombre de départ d’un programme de calcul simple.', application: true,
    generer() {
      const a = ent(2, 9), b = relNonNul(1, 12), x = ent(-5, 12), r = a * x + b
      const e1 = `multiplier par $${a}$`, e2 = b < 0 ? `soustraire $${-b}$` : `ajouter $${b}$`
      return { enonce: `Programme : choisir un nombre ; ${e1} ; puis ${e2}. On obtient $${r}$. Quel nombre a-t-on choisi au départ ?`, reponse: nb(x) }
    },
  },
  {
    id: '4e-formule', theme: 'Fonctions', titre: 'Utiliser une formule',
    programme: 'Utiliser une formule qui donne une grandeur en fonction d’une autre.', application: true,
    generer() {
      return choix([
        () => { const p = ent(4, 15), f = ent(2, 10), n = ent(2, 12); return { enonce: `Le prix à payer pour $n$ places de cinéma est $P = ${p}n + ${f}$ (en euros). Combien paie-t-on pour $${n}$ places ?`, reponse: unite(nb(p * n + f), '€') } },
        () => { const c = choix([ent(2, 15), ent(11, 99) / 10]); return { enonce: `Le périmètre d'un carré de côté $c$ est $P = 4c$. Calculer $P$ pour $c = ${nb(c)}$ cm.`, reponse: unite(nb(4 * c), 'cm') } },
        () => { const x = ent(2, 9), k = ent(2, 5); return { enonce: `Un rectangle a pour largeur $x$ cm et pour longueur $${k}x$ cm : son aire est $A = ${k}x^2$. Calculer $A$ pour $x = ${x}$.`, reponse: cm2(nb(k * x * x)) } },
        () => { const t = ent(2, 12), v = choix([2, 3, 5, 20, 50]), d0 = ent(0, 20) * 5; return { enonce: `Une cuve contient $V = ${d0 ? `${d0} + ` : ''}${v}t$ litres d'eau après $t$ minutes. Combien contient-elle après $${t}$ minutes ?`, reponse: unite(nb(d0 + v * t), 'L') } },
      ])()
    },
  },
]

// =============================================================
// LES QUESTIONS DE COURS (4e)
// Mêmes règles qu'en 5e : plusieurs façons de poser chaque notion, et
// rien de fixe (nombres, noms de points, objets tirés au hasard).
// =============================================================
const n4 = (theme: string, liste: [string, ...Facon[]][]) => notions(theme, liste, '4e-')
const lettre = () => choix(['x', 'a', 'y', 'n', 't'])

export const COURS_4E: QuestionCours[] = [
  ...n4('Opérations sur les nombres relatifs', [
    ['Soustraire un relatif',
      () => { const a = ent(2, 15), b = ent(2, 15); return [`Par quelle addition remplace-t-on $${a} - (-${b})$ ?`, `$${a} + ${b}$ : soustraire un nombre, c'est ajouter son opposé`] },
      () => { const b = ent(2, 15); return [`Soustraire $${b}$ revient à…`, `ajouter son opposé, $-${b}$`] }],
    ['La règle des signes d\'un produit',
      () => { const a = ent(2, 9), b = ent(2, 9); return [`Quelle règle donne le signe de $(-${a}) \\times (-${b})$ ?`, 'deux facteurs de même signe : le produit est positif'] },
      () => { const a = ent(2, 9), b = ent(2, 9); return [`Quelle règle donne le signe de $(-${a}) \\times ${b}$ ?`, 'deux facteurs de signes contraires : le produit est négatif'] },
      () => { const n = ent(3, 7), k = ent(1, n); return [`Un produit a $${n}$ facteurs non nuls, dont $${k}$ négatifs. Comment trouve-t-on son signe ?`, `on compte les facteurs négatifs : $${k}$ est ${k % 2 ? 'impair, le produit est négatif' : 'pair, le produit est positif'}`] }],
    ['Le signe d\'un quotient',
      () => { const a = ent(2, 9), b = ent(2, 9); return [`Quelle règle donne le signe de $${a * b} \\div (-${b})$ ?`, 'la même que pour un produit : signes contraires, quotient négatif'] },
      () => { const a = ent(2, 9), b = ent(2, 9); return [`Quelle règle donne le signe de $\\frac{-${a * b}}{-${b}}$ ?`, 'la même que pour un produit : même signe, quotient positif'] }],
    ['Le vocabulaire des opérations',
      () => {
        const a = ent(2, 20), b = ent(2, 20)
        const [op, nom] = choix<[string, string]>([['+', 'une somme'], ['-', 'une différence'], ['\\times', 'un produit'], ['\\div', 'un quotient']])
        return [`Comment appelle-t-on le résultat de $${a} ${op} ${b}$ ?`, nom]
      },
      () => { const a = ent(2, 9), b = ent(2, 9), c = ent(2, 9); return une([`L'expression $${a} \\times (${b} + ${c})$ est-elle une somme, une différence, un produit ou un quotient ?`, `un produit (la dernière opération est la multiplication)`], [`L'expression $${a} + ${b} \\times ${c}$ est-elle une somme, une différence, un produit ou un quotient ?`, `une somme (la dernière opération est l'addition)`]) }],
    ['Multiplication et division',
      () => { const a = ent(3, 9), b = ent(3, 9); return [`On sait que $${a} \\times ${b} = ${a * b}$. Quelles divisions en déduit-on ?`, `$${a * b} \\div ${a} = ${b}$ et $${a * b} \\div ${b} = ${a}$`] },
      () => { const a = ent(2, 12), b = ent(1, 30); return [`Le nombre manquant dans $${a} \\times \\ldots = ${b}$ est le résultat de quelle division ?`, `$${b} \\div ${a}$`] }],
    ['L\'addition répétée',
      () => { const b = ent(2, 15), n = ent(3, 7); return [`Comment écrire plus simplement une somme de $${n}$ termes tous égaux à $${b}$ ?`, `$${n} \\times ${b}$`] },
      () => { const n = ent(3, 7), x = lettre(); return [`Comment écrire plus simplement une somme de $${n}$ termes tous égaux à $${x}$ ?`, `$${n}${x}$`] }],
    ['Un facteur nul',
      () => { const n = ent(3, 8); return [`Un produit de $${n}$ facteurs relatifs contient un facteur égal à $0$. Que vaut ce produit ?`, '$0$'] }],
    ['Le signe d\'un produit',
      () => { const a = relNonNul(2, 9), b = relNonNul(2, 9); return [`Quel est le signe de $${rel(a)} \\times ${rel(b)}$ ?`, `${a * b > 0 ? 'positif' : 'négatif'} : ${a * b > 0 ? 'deux facteurs de même signe' : 'deux facteurs de signes contraires'}`] },
      () => { const n = ent(2, 7); return [`Un produit contient $${n}$ facteurs négatifs (et aucun nul). Quel est son signe ?`, `${n % 2 ? 'négatif' : 'positif'} : le nombre de facteurs négatifs est ${n % 2 ? 'impair' : 'pair'}`] }],
  ]),
  ...n4('Nombres rationnels', [
    ['Additionner des fractions de dénominateurs différents',
      () => { const d = ent(2, 5), k = ent(2, 4), a = ent(1, 9), b = ent(1, 9); return [`Que faut-il faire d'abord pour calculer $${frac(a, d)} + ${frac(b, d * k)}$ ?`, `écrire les deux fractions avec le même dénominateur ($${d * k}$)`] },
      () => { const d = ent(3, 12), a = ent(1, 9), b = ent(1, 9); return [`Comment calcule-t-on $${frac(a, d)} + ${frac(b, d)}$ ?`, `on additionne les numérateurs et on garde le dénominateur : $${frac(a + b, d)}$`] }],
    ['Comparer des fractions',
      () => { const d = ent(3, 12), a = ent(1, 20), b = ent(1, 20); return [`Comment compare-t-on $${frac(a, d)}$ et $${frac(b === a ? b + 1 : b, d)}$ ?`, 'elles ont le même dénominateur : on compare les numérateurs'] },
      () => { const d = ent(2, 5), k = ent(2, 3); return [`Que faut-il faire pour comparer $${frac(ent(1, 9), d)}$ et $${frac(ent(1, 20), d * k)}$ ?`, `les écrire avec le même dénominateur ($${d * k}$), puis comparer les numérateurs`] }],
    ['La fraction est un quotient',
      () => { let a: number, b: number; do { a = ent(1, 12); b = ent(2, 13) } while (a % b === 0); return [`Que vaut $${b} \\times ${frac(a, b)}$ ?`, `$${a}$ : $${frac(a, b)}$ est le nombre qui, multiplié par $${b}$, donne $${a}$`] },
      () => { let a: number, b: number; do { a = ent(1, 12); b = ent(2, 13) } while (a % b === 0); return [`Quel nombre, multiplié par $${b}$, donne $${a}$ ?`, `$${frac(a, b)}$`] }],
    ['Prendre une fraction d\'un nombre',
      () => { const d = ent(2, 8), n = ent(1, d - 1), N = d * ent(2, 9); return [`Prendre les $${frac(n, d)}$ de $${N}$, c'est…`, `multiplier $${frac(n, d)}$ par $${N}$`] }],
    ['Multiplier des fractions',
      () => { const a = ent(1, 9), b = ent(2, 9), c = ent(1, 9), d = ent(2, 9); return [`Comment calcule-t-on $${frac(a, b)} \\times ${frac(c, d)}$ ?`, `on multiplie les numérateurs entre eux et les dénominateurs entre eux : $\\frac{${a} \\times ${c}}{${b} \\times ${d}}$`] }],
    ['L\'inverse d\'un nombre',
      () => { const n = ent(2, 12); return [`Qu'est-ce que l'inverse de $${n}$ ?`, `le nombre qui, multiplié par $${n}$, donne $1$ : $${frac(1, n)}$`] },
      () => { let a: number, b: number; do { a = ent(1, 9); b = ent(2, 9) } while (a === b || pgcd(a, b) !== 1); return [`Quel est l'inverse de $${frac(a, b)}$ ?`, `$${frac(b, a)}$`] },
      () => { const n = ent(2, 12); return [`Comment note-t-on l'inverse de $${n}$ ?`, `$${frac(1, n)}$ (ou $${n}^{-1}$)`] }],
    ['Diviser par une fraction',
      () => { let a: number, b: number; do { a = ent(1, 9); b = ent(2, 9) } while (a === b || pgcd(a, b) !== 1); return [`Diviser par $${frac(a, b)}$, c'est…`, `multiplier par son inverse, $${frac(b, a)}$`] }],
    ['Comparer des nombres écrits de façons différentes',
      () => { const q = choix([2, 4, 5]); let n: number; do { n = q * ent(1, 2) + ent(1, q - 1) } while (pgcd(n, q) !== 1); const d = ent(1, 9); return [`Comment comparer $${frac(n, q)}$ et $1 + ${frac(d, 100)}$ ?`, `écrire les deux en décimal : $${nb(n / q)}$ et $${nb(1 + d / 100)}$`] },
      () => { const a = ent(1, 3), b = ent(1, 9); let c: number; do { c = ent(11, 99) } while (c % 10 === 0); return [`Lequel est le plus grand : $${a}{,}${b}$ ou $${a}{,}${c}$ ?`, `$${nb(b / 10 > c / 100 ? a + b / 10 : a + c / 100)}$ : on compare les dixièmes, puis les centièmes`] }],
  ]),
  ...n4('Puissances', [
    ['La définition d\'une puissance',
      () => { const a = ent(2, 9), n = ent(3, 7); return [`Que signifie $${a}^{${n}}$ ?`, `le produit de $${n}$ facteurs égaux à $${a}$ : $${Array(n).fill(a).join(' \\times ')}$`] },
      () => { const a = ent(2, 9), n = ent(3, 6); return [`Comment écrit-on $${Array(n).fill(a).join(' \\times ')}$ avec une puissance ?`, `$${a}^{${n}}$`] }],
    ['Les puissances de 10',
      () => { const n = ent(2, 9); return [`Comment s'écrit $10^{${n}}$ ?`, `un $1$ suivi de $${n}$ zéros`] },
      () => { const n = ent(2, 9); return [`Combien de zéros y a-t-il dans l'écriture de $10^{${n}}$ ?`, `$${n}$`] }],
    ['Multiplier des puissances d\'un même nombre',
      () => { const a = ent(2, 9), m = ent(2, 7), n = ent(2, 7); return [`Comment écrit-on $${a}^{${m}} \\times ${a}^{${n}}$ sous la forme d'une seule puissance ?`, `$${a}^{${m + n}}$ : on ajoute les exposants`] }],
    ['Multiplier des puissances de même exposant',
      () => { const a = ent(2, 5), b = ent(2, 5), n = ent(2, 6); return [`Comment écrit-on $${a}^{${n}} \\times ${b}^{${n}}$ sous la forme d'une seule puissance ?`, `$(${a} \\times ${b})^{${n}} = ${a * b}^{${n}}$`] }],
    ['Les cas particuliers',
      () => { const a = ent(2, 15); return une([`Que vaut $${a}^{1}$ ?`, `$${a}$`], [`Que vaut $1^{${a}}$ ?`, '$1$'], [`Que vaut $0^{${a}}$ ?`, '$0$']) }],
    ['Multiplier des puissances d\'un même nombre',
      () => { const a = ent(2, 9), m = ent(2, 6), n = ent(2, 6); return [`Comment écrire $${a}^{${m}} \\times ${a}^{${n}}$ avec une seule puissance ?`, `$${a}^{${m + n}}$ : on additionne les exposants`] }],
  ]),
  ...n4('Racine carrée', [
    ['La définition de la racine carrée',
      () => { const n = ent(1, 12); return [`Que signifie $\\sqrt{${n * n}}$ ?`, `le nombre positif dont le carré vaut $${n * n}$, c'est-à-dire $${n}$`] },
      () => { const a = ent(2, 50); return [`Comment appelle-t-on le nombre positif dont le carré vaut $${a}$ ?`, `la racine carrée de $${a}$, notée $\\sqrt{${a}}$`] }],
    ['Le carré d\'une racine',
      () => { const a = ent(2, 99); return [`Que vaut $\\left(\\sqrt{${a}}\\right)^2$ ?`, `$${a}$`] },
      () => { const n = ent(2, 15); return [`Que vaut $\\sqrt{${n}^2}$ ?`, `$${n}$`] }],
    ['La racine d\'un nombre négatif',
      () => { const n = ent(2, 12); return [`Pourquoi $\\sqrt{-${n * n}}$ n'existe-t-il pas ?`, 'un carré est toujours positif : aucun nombre n\'a pour carré un nombre négatif'] }],
    ['Encadrer une racine carrée',
      () => { let v: number; do { v = ent(2, 140) } while (Number.isInteger(Math.sqrt(v))); const k = Math.floor(Math.sqrt(v)); return [`Entre quels entiers consécutifs est $\\sqrt{${v}}$ ?`, `entre $${k}$ et $${k + 1}$, car $${k * k} < ${v} < ${(k + 1) * (k + 1)}$`] }],
    ['Encadrer une racine carrée',
      () => { let n: number; do { n = ent(2, 99) } while (Number.isInteger(Math.sqrt(n))); const k = Math.floor(Math.sqrt(n)); return [`Comment encadrer $\\sqrt{${n}}$ par deux entiers consécutifs ?`, `chercher les carrés qui l'entourent : $${k}^2 = ${k * k}$ et $${k + 1}^2 = ${(k + 1) * (k + 1)}$, donc $${k} < \\sqrt{${n}} < ${k + 1}$`] }],
  ]),
  ...n4('Calcul littéral et algébrique', [
    ['Le signe × sous-entendu',
      () => { const k = ent(2, 12), x = lettre(); return une([`Que signifie $${k}${x}$ ?`, `$${k} \\times ${x}$`], [`Comment écrit-on $${k} \\times ${x}$ plus simplement ?`, `$${k}${x}$`]) },
      () => { const x = lettre(); return une([`Comment écrit-on $${x} \\times ${x}$ plus simplement ?`, `$${x}^2$`], [`Comment écrit-on $1 \\times ${x}$ plus simplement ?`, `$${x}$`]) }],
    ['La distributivité',
      () => { const k = ent(2, 9), a = ent(1, 9), x = lettre(); return [`Comment développe-t-on $${k}(${x} + ${a})$ ?`, `on multiplie $${k}$ par chaque terme : $${k}${x} + ${k * a}$`] },
      () => { const k = ent(2, 9), a = ent(1, 9), x = lettre(); return [`Comment factorise-t-on $${k}${x} + ${k * a}$ ?`, `on met le facteur commun $${k}$ en évidence : $${k}(${x} + ${a})$`] }],
    ['Une solution d\'une équation',
      () => { const x0 = ent(1, 9), a = ent(2, 5), b = ent(1, 9); return [`Que veut dire « $${x0}$ est solution de $${a}x + ${b} = ${a * x0 + b}$ » ?`, `en remplaçant $x$ par $${x0}$, l'égalité est vraie`] },
      () => { const x0 = ent(1, 9), a = ent(2, 5), b = ent(1, 9); return [`Comment vérifie-t-on que $${x0}$ est solution de $${a}x + ${b} = ${a * x0 + b}$ ?`, `on calcule $${a} \\times ${x0} + ${b}$ et on regarde si on trouve $${a * x0 + b}$`] }],
    ['Résoudre x + b = c',
      () => { const b = ent(2, 15), c = ent(-10, 20), x = lettre(); return [`Pour résoudre $${x} + ${b} = ${c}$, que fait-on aux deux membres ?`, `on soustrait $${b}$ : $${x} = ${c - b}$`] }],
    ['Résoudre ax = c',
      () => { const a = ent(2, 9), c = ent(1, 30), x = lettre(); return [`Pour résoudre $${a}${x} = ${c}$, que fait-on aux deux membres ?`, `on divise par $${a}$ : $${x} = ${irreductible(c, a)}$`] }],
    ['Le double, la moitié, le successeur…',
      () => { const x = lettre(); const [q, r] = choix<[string, string]>([['le double', `2${x}`], ['le triple', `3${x}`], ['la moitié', `\\frac{${x}}{2}`], ['le successeur', `${x} + 1`], ['le prédécesseur', `${x} - 1`], ['le carré', `${x}^2`]]); return [`Comment écrit-on ${q} du nombre $${x}$ ?`, `$${r}$`] }],
    ['Un signe moins devant des parenthèses',
      () => { const k = ent(2, 9), x = lettre(), b = ent(1, 9); return [`Comment supprimer les parenthèses dans $-(${k}${x} + ${b})$ ?`, `on change tous les signes : $-${k}${x} - ${b}$`] },
      () => { const k = ent(2, 6), x = lettre(), b = ent(1, 9); return [`Que vaut $-${k}(${x} - ${b})$ une fois développé ?`, `$-${k}${x} + ${k * b}$ (moins par moins donne plus)`] }],
    ['Résoudre ax + b = c',
      () => { const a = ent(2, 9), s = ent(1, 9), b = ent(1, 9), x = lettre(); return [`Par quelles étapes résout-on $${a}${x} + ${b} = ${a * s + b}$ ?`, `on soustrait $${b}$ aux deux membres, puis on divise par $${a}$ : $${x} = ${s}$`] }],
  ]),
  ...n4('Transformations', [
    ['Le demi-tour',
      () => { const [A, I] = pts(2); return [`$${A}'$ est le symétrique de $${A}$ par le demi-tour de centre $${I}$. Que représente $${I}$ pour le segment $[${A}${A}']$ ?`, 'son milieu'] },
      () => { const [A, I] = pts(2), d = ent(2, 9); return [`$${A}'$ est le symétrique de $${A}$ par le demi-tour de centre $${I}$, et $${A}${I} = ${d}$ cm. Combien mesure $${A}${A}'$ ?`, `$${2 * d}$ cm`] }],
    ['Le centre du demi-tour',
      () => { const [I] = pts(1); return [`Quel est le symétrique du point $${I}$ par le demi-tour de centre $${I}$ ?`, `le point $${I}$ lui-même`] }],
    ['Ce que conserve le demi-tour',
      () => { const l = ent(2, 12), [A, B] = deuxPts(); return [`Le segment $[${A}${B}]$ mesure $${l}$ cm. Combien mesure son image par un demi-tour ?`, `$${l}$ cm : le demi-tour conserve les longueurs`] },
      () => { const a = ent(20, 160); return [`Un angle mesure $${a}°$. Combien mesure son image par un demi-tour ?`, `$${a}°$ : le demi-tour conserve les angles`] }],
    ['L\'image d\'une droite par un demi-tour',
      () => { const [A, B, I] = pts(3); return [`Que peut-on dire de la droite $(${A}${B})$ et de son image par le demi-tour de centre $${I}$ (qui n'est pas sur la droite) ?`, 'elles sont parallèles'] }],
  ]),
  ...n4('Repérage', [
    ['Lire les coordonnées',
      () => { const P = pt(), x = relNonNul(1, 6), y = relNonNul(1, 6); return [`Le point $${P}$ a pour coordonnées $(${x}\\,;\\,${y})$. Quelle est son abscisse, et quelle est son ordonnée ?`, `abscisse $${x}$, ordonnée $${y}$`] },
      () => { const P = pt(), x = relNonNul(1, 6), y = relNonNul(1, 6); return [`Le point $${P}$ a pour abscisse $${x}$ et pour ordonnée $${y}$. Comment écrit-on ses coordonnées ?`, `$${P}(${x}\\,;\\,${y})$`] }],
    ['Les quatre parties du repère',
      () => {
        const P = pt(), [sx, sy, ou] = choix<[string, string, string]>([['positive', 'positive', 'en haut à droite'], ['négative', 'positive', 'en haut à gauche'], ['négative', 'négative', 'en bas à gauche'], ['positive', 'négative', 'en bas à droite']])
        return [`Le point $${P}$ a une abscisse ${sx} et une ordonnée ${sy}. Dans quelle partie du repère est-il ?`, ou]
      }],
    ['Un relatif sur une droite graduée',
      () => { const P = pt(), a = ent(2, 9); return une([`Sur une droite graduée, le point $${P}$ est à $${a}$ unités à gauche de l'origine. Quelle est son abscisse ?`, `$-${a}$`], [`Sur une droite graduée, le point $${P}$ est à $${a}$ unités à droite de l'origine. Quelle est son abscisse ?`, `$${a}$`]) },
      () => { const a = relNonNul(1, 9), b = relNonNul(1, 9); return [`Sur une droite graduée, quelle est la distance entre les points d'abscisses $${a}$ et $${b === a ? b + 1 : b}$ ?`, `$${Math.abs(a - (b === a ? b + 1 : b))}$`] }],
  ]),
  ...n4('Représentation de l’espace', [
    ['Le volume d\'un pavé et d\'un cube',
      () => { const l = ent(2, 10), w = ent(2, 6), h = ent(2, 10); return [`Quel calcul donne le volume d'un pavé droit de $${l}$ cm sur $${w}$ cm sur $${h}$ cm ?`, `$${l} \\times ${w} \\times ${h}$ (longueur $\\times$ largeur $\\times$ hauteur)`] },
      () => { const a = ent(2, 10); return [`Quel calcul donne le volume d'un cube de $${a}$ cm d'arête ?`, `$${a} \\times ${a} \\times ${a} = ${a}^3$`] }],
    ['Le volume d\'un prisme et d\'un cylindre',
      () => { const B = ent(3, 40), h = ent(2, 12); return [`Un prisme droit a une base d'aire $${B}$ cm² et une hauteur de $${h}$ cm. Quel calcul donne son volume ?`, `$${B} \\times ${h}$ (aire de la base $\\times$ hauteur)`] },
      () => { const r = ent(1, 9), h = ent(2, 12); return [`Quel calcul donne le volume d'un cylindre de rayon $${r}$ cm et de hauteur $${h}$ cm ?`, `$\\pi \\times ${r}^2 \\times ${h}$`] }],
    ['Le volume d\'une pyramide et d\'un cône',
      () => { const B = 3 * ent(2, 15), h = ent(2, 12); return [`Une pyramide a une base d'aire $${B}$ cm² et une hauteur de $${h}$ cm. Quel calcul donne son volume ?`, `$${B} \\times ${h} \\div 3$ (aire de la base $\\times$ hauteur $\\div 3$)`] },
      () => { const r = ent(1, 9), h = 3 * ent(1, 5); return [`Quel calcul donne le volume d'un cône de révolution de rayon $${r}$ cm et de hauteur $${h}$ cm ?`, `$\\pi \\times ${r}^2 \\times ${h} \\div 3$`] }],
    ['Les faces d\'un prisme droit',
      () => { const [n, b] = choix<[number, string]>([[3, 'un triangle'], [4, 'un quadrilatère'], [5, 'un pentagone'], [6, 'un hexagone']]); return [`Un prisme droit a pour bases ${b}s. Combien a-t-il de faces en tout ?`, `$${n + 2}$ : $2$ bases et $${n}$ faces latérales`] },
      () => { const b = choix(['triangulaire', 'pentagonale', 'hexagonale', 'trapézoïdale']); return [`Quelle est la forme des faces latérales d'un prisme droit à base ${b} ?`, 'des rectangles'] }],
    ['Le cylindre',
      () => { const r = ent(1, 9); return [`Quelle est la forme des bases d'un cylindre de rayon $${r}$ cm ?`, `deux disques de rayon $${r}$ cm`] }],
    ['L\'aire des figures usuelles',
      () => { const b = ent(2, 14), h = ent(2, 12); return [`Quel calcul donne l'aire d'un triangle de base $${b}$ cm et de hauteur $${h}$ cm ?`, `$${b} \\times ${h} \\div 2$`] },
      () => { const r = ent(1, 10); return [`Quel calcul donne l'aire d'un disque de rayon $${r}$ cm ?`, `$\\pi \\times ${r}^2$`] }],
    ['Le volume d\'une pyramide, d\'un cône',
      () => { const c = ent(2, 9), h = ent(2, 12); return [`Quel calcul donne le volume d'une pyramide de base un carré de côté $${c}$ cm et de hauteur $${h}$ cm ?`, `$${c} \\times ${c} \\times ${h} \\div 3$ (aire de la base × hauteur ÷ 3)`] },
      () => { const r = ent(1, 9), h = ent(2, 12); return [`Quel calcul donne le volume d'un cône de rayon $${r}$ cm et de hauteur $${h}$ cm ?`, `$\\pi \\times ${r}^2 \\times ${h} \\div 3$`] }],
  ]),
  ...n4('Parallélogrammes et translations', [
    ['La définition du parallélogramme',
      () => { const [A, B, C, D] = quad(); return [`Que faut-il pour que le quadrilatère $${A}${B}${C}${D}$ soit un parallélogramme (définition) ?`, `que ses côtés opposés soient parallèles : $(${A}${B}) \\parallel (${C}${D})$ et $(${B}${C}) \\parallel (${A}${D})$`] }],
    ['Les diagonales du parallélogramme',
      () => { const [A, B, C, D] = quad(); return [`Les diagonales $[${A}${C}]$ et $[${B}${D}]$ du quadrilatère $${A}${B}${C}${D}$ ont le même milieu. Quelle est sa nature ?`, 'un parallélogramme'] },
      () => { const [A, B, C, D] = quad(); return [`$${A}${B}${C}${D}$ est un parallélogramme de centre $O$. Que peut-on dire de $O$ ?`, `c'est le milieu de $[${A}${C}]$ et de $[${B}${D}]$`] }],
    ['Le rectangle par ses diagonales',
      () => { const [A, B, C, D] = quad(), n = ent(4, 15); return [`$${A}${B}${C}${D}$ est un parallélogramme et $${A}${C} = ${B}${D} = ${n}$ cm. Quelle est sa nature ?`, 'un rectangle (diagonales de même longueur)'] }],
    ['Le losange par ses diagonales',
      () => { const [A, B, C, D] = quad(); return [`$${A}${B}${C}${D}$ est un parallélogramme dont les diagonales $[${A}${C}]$ et $[${B}${D}]$ sont perpendiculaires. Quelle est sa nature ?`, 'un losange'] }],
    ['Le carré par ses diagonales',
      () => { const [A, B, C, D] = quad(), n = ent(4, 15); return [`Les diagonales du parallélogramme $${A}${B}${C}${D}$ mesurent $${n}$ cm et sont perpendiculaires. Quelle est sa nature ?`, 'un carré'] }],
    ['La translation',
      () => { const [A, B, C, D] = pts(4); return [`La translation qui transforme $${A}$ en $${B}$ transforme $${C}$ en $${D}$. Quelle est la nature de $${A}${B}${D}${C}$ ?`, 'un parallélogramme (éventuellement aplati)'] },
      () => { const l = ent(2, 12), [A, B] = deuxPts(); return [`Le segment $[${A}${B}]$ mesure $${l}$ cm. Combien mesure son image par une translation ?`, `$${l}$ cm : la translation conserve les longueurs`] }],
  ]),
  ...n4('Triangles', [
    ['La hauteur',
      () => { const [A, B, C] = tri(); return [`Qu'est-ce que la hauteur issue de $${A}$ dans le triangle $${A}${B}${C}$ ?`, `la droite qui passe par $${A}$ et est perpendiculaire à $(${B}${C})$`] }],
    ['La médiane',
      () => { const [A, B, C] = tri(); return [`Qu'est-ce que la médiane issue de $${A}$ dans le triangle $${A}${B}${C}$ ?`, `la droite qui passe par $${A}$ et par le milieu de $[${B}${C}]$`] }],
    ['La médiatrice et la bissectrice',
      () => { const [A, B, C] = tri(); return [`Qu'est-ce que la médiatrice de $[${B}${C}]$ dans le triangle $${A}${B}${C}$ ?`, `la droite perpendiculaire à $[${B}${C}]$ en son milieu`] },
      () => { const [A, B, C] = tri(); return [`Qu'est-ce que la bissectrice de l'angle $${ang(B + A + C)}$ ?`, `la demi-droite qui le partage en deux angles de même mesure`] }],
    ['Le théorème de Pythagore',
      () => { const [A, B, C] = tri(); return [`$${A}${B}${C}$ est rectangle en $${A}$. Que dit le théorème de Pythagore ?`, `$${B}${C}^2 = ${A}${B}^2 + ${A}${C}^2$`] },
      () => { const [A, B, C] = tri(); return [`$${A}${B}${C}$ est rectangle en $${A}$. Comment s'appelle le côté $[${B}${C}]$ ?`, `l'hypoténuse`] }],
    ['La réciproque de Pythagore',
      () => { const [A, B, C] = tri(); return [`Dans le triangle $${A}${B}${C}$, $${B}${C}^2 = ${A}${B}^2 + ${A}${C}^2$. Que peut-on conclure ?`, `$${A}${B}${C}$ est rectangle en $${A}$ (réciproque du théorème de Pythagore)`] }],
    ['La droite des milieux',
      () => { const [A, B, C, I, J] = pts(5); return [`$${I}$ est le milieu de $[${A}${B}]$ et $${J}$ celui de $[${A}${C}]$. Que peut-on dire des droites $(${I}${J})$ et $(${B}${C})$ ?`, 'elles sont parallèles'] },
      () => { const [A, B, C] = tri(), n = 2 * ent(2, 9); return [`Dans le triangle $${A}${B}${C}$, $${B}${C} = ${n}$ cm. Combien mesure le segment qui joint les milieux de $[${A}${B}]$ et de $[${A}${C}]$ ?`, `$${n / 2}$ cm (la moitié de $${B}${C}$)`] }],
    ['Le cercle circonscrit à un triangle rectangle',
      () => { const [A, B, C] = tri(); return [`$${A}${B}${C}$ est rectangle en $${A}$. Où est le centre de son cercle circonscrit ?`, `au milieu de l'hypoténuse $[${B}${C}]$`] }],
  ]),
  ...n4('Statistiques', [
    ['La moyenne',
      () => { const t = Array.from({ length: ent(3, 5) }, () => ent(4, 20)); return [`Quel calcul donne la moyenne de ${t.map(x => `$${x}$`).join(', ')} ?`, `$(${t.join(' + ')}) \\div ${t.length}$`] }],
    ['La fréquence',
      () => { const N = choix([20, 25, 30, 40]), e = ent(1, N - 1); return [`Sur $${N}$ élèves, $${e}$ font du sport. Quel calcul donne la fréquence de cette réponse ?`, `$${e} \\div ${N}$ (effectif $\\div$ effectif total)`] }],
    ['L\'effectif total',
      () => { const e = Array.from({ length: ent(3, 4) }, () => ent(1, 12)); return [`Les effectifs d'une série sont ${e.map(x => `$${x}$`).join(', ')}. Quel est l'effectif total ?`, `$${e.reduce((s, x) => s + x, 0)}$ (la somme des effectifs)`] }],
    ['La médiane',
      () => { const n = choix([5, 7, 9]); return [`Une série de $${n}$ valeurs est rangée dans l'ordre croissant. Quelle valeur est la médiane ?`, `la $${(n + 1) / 2}$e valeur : il y en a autant avant qu'après`] }],
    ['L\'étendue',
      () => { const a = ent(2, 10), b = a + ent(3, 15); return [`La plus petite valeur d'une série est $${a}$ et la plus grande $${b}$. Quelle est l'étendue ?`, `$${b} - ${a} = ${b - a}$`] }],
    ['La moyenne pondérée',
      () => { const v = [ent(2, 6), ent(7, 12), ent(13, 20)], e = v.map(() => ent(2, 6)); return [`Quel calcul donne la moyenne de la série : $${v[0]}$ (effectif $${e[0]}$), $${v[1]}$ (effectif $${e[1]}$), $${v[2]}$ (effectif $${e[2]}$) ?`, `$(${v.map((x, i) => `${x} \\times ${e[i]}`).join(' + ')}) \\div ${e[0] + e[1] + e[2]}$`] }],
  ]),
  ...n4('Probabilités', [
    ['L\'évènement contraire',
      () => { const p = ent(1, 9) / 10; return [`La probabilité d'un évènement est $${nb(p)}$. Quelle est celle de l'évènement contraire ?`, `$1 - ${nb(p)} = ${nb(1 - p)}$`] }],
    ['Calculer une probabilité',
      () => { const f = ent(1, 9), N = f + ent(2, 12); return [`Dans une expérience où tous les résultats ont la même chance, $${f}$ issues sur $${N}$ réalisent l'évènement $A$. Que vaut $P(A)$ ?`, `$${frac(f, N)}$ : le nombre d'issues favorables divisé par le nombre d'issues possibles`] }],
    ['La somme des probabilités',
      () => { const n = ent(3, 5); return [`Une expérience a $${n}$ issues. Que vaut la somme de leurs probabilités ?`, '$1$'] }],
  ]),
  ...n4('Proportionnalité', [
    ['Appliquer un pourcentage',
      () => { const p = choix([5, 12, 15, 20, 30, 35, 60, 75]), c = 20 * ent(2, 30); return [`Quel calcul donne $${p}\\,\\%$ de $${c}$ ?`, `$\\frac{${p}}{100} \\times ${c}$`] }],
    ['Augmenter d\'un pourcentage',
      () => { const p = choix([5, 10, 15, 20, 25, 30, 50]); return [`Par quel nombre multiplie-t-on un prix pour l'augmenter de $${p}\\,\\%$ ?`, `$1 + \\frac{${p}}{100} = ${nb(1 + p / 100)}$`] }],
    ['Diminuer d\'un pourcentage',
      () => { const p = choix([5, 10, 15, 20, 25, 30, 50]); return [`Par quel nombre multiplie-t-on un prix pour le diminuer de $${p}\\,\\%$ ?`, `$1 - \\frac{${p}}{100} = ${nb(1 - p / 100)}$`] }],
    ['La quatrième proportionnelle',
      () => { const a = ent(2, 9), b = ent(2, 12), c = ent(2, 12); return [`$${a}$ ${choix(OBJETS)} coûtent $${b}$ €. Quel calcul donne le prix de $${c}$ ?`, `$${b} \\times ${c} \\div ${a}$`] }],
    ['Le ratio',
      () => { const a = ent(1, 5), b = ent(1, 5), k = ent(2, 10); return [`On partage $${(a + b) * k}$ € selon le ratio $${a} : ${b}$. En combien de parts égales partage-t-on la somme ?`, `$${a + b}$ parts de $${k}$ €`] }],
    ['La vitesse moyenne',
      () => { const d = ent(2, 30) * 10, t = ent(2, 5); return [`Quel calcul donne la vitesse moyenne d'un trajet de $${d}$ km en $${t}$ h ?`, `$${d} \\div ${t}$ (distance ÷ durée), en km/h`] }],
  ]),
  ...n4('Fonctions', [
    ['Remonter un programme de calcul',
      () => { const a = ent(2, 9), b = ent(1, 9), r = a * ent(2, 9) + b; return [`Programme : multiplier par $${a}$, puis ajouter $${b}$. On obtient $${r}$. Comment retrouve-t-on le nombre de départ ?`, `on soustrait $${b}$, puis on divise par $${a}$ : $${(r - b) / a}$`] }],
    ['Un programme de calcul',
      () => { const a = ent(2, 9), b = ent(1, 9), x = ent(2, 9); return [`Programme : multiplier par $${a}$, puis ajouter $${b}$. Quel calcul fait-on en partant de $${x}$ ?`, `$${a} \\times ${x} + ${b} = ${a * x + b}$`] },
      () => { const a = ent(2, 9), b = ent(1, 9), y = lettre(); return [`Programme : multiplier par $${a}$, puis ajouter $${b}$. Quelle expression obtient-on en partant de $${y}$ ?`, `$${a}${y} + ${b}$`] }],
  ]),
]

// =============================================================
// LES NIVEAUX
// Ceux qui n'ont pas encore d'automatismes paraissent dans le panneau,
// grisés (« bientôt »).
// =============================================================
export interface Niveau { id: string; nom: string; automatismes: Automatisme[]; cours: QuestionCours[] }
export const NIVEAUX: Niveau[] = [
  { id: '5e', nom: '5e', automatismes: AUTOMATISMES_5E, cours: COURS_5E },
  { id: '4e', nom: '4e', automatismes: AUTOMATISMES_4E, cours: COURS_4E },
  { id: '3e', nom: '3e', automatismes: [], cours: [] },
  { id: '2nde', nom: '2nde', automatismes: [], cours: [] },
  { id: '1re', nom: '1re', automatismes: [], cours: [] },
]
/** Les thèmes d'un niveau, dans l'ordre de la liste */
export const themesDe = (n: Niveau) => [...new Set(n.automatismes.map(a => a.theme))]

// =============================================================
// LE TIRAGE D'UN FLASH
// =============================================================
export type FormeQuestion = 'cours' | 'application'
export interface Composition { cours: number; application: number }
export const COMPOSITION_PAR_DEFAUT: Composition = { cours: 2, application: 3 }
/** Une question à trou, quand l'automatisme en a une : une fois sur trois */
const PART_DES_TROUS = 1 / 3
export interface QuestionFlash {
  /** L'automatisme (un exercice d'application) ou la question de cours */
  id: string
  theme: string
  q: Question
  forme: FormeQuestion
}

/** Une question tirée dans un lot, en faisant passer les thèmes chacun
 *  leur tour : d'abord le thème le moins servi (un thème de 3 questions
 *  vaut un thème de 10), puis sa question la moins servie ; on évite deux
 *  fois le même énoncé. */
function tirerDans<T extends { id: string; theme: string }>(lot: T[], pris: Map<string, number>, vus: Set<string>, poser: (x: T) => Question): { x: T; q: Question } {
  let x = lot[0], q = poser(x)
  for (let essai = 0; essai < 30; essai++) {
    const fois = (l: T[]) => l.reduce((n, a) => n + (pris.get(a.id) ?? 0), 0)
    const themes = [...new Set(lot.map(a => a.theme))]
    const moinsTheme = Math.min(...themes.map(t => fois(lot.filter(a => a.theme === t))))
    const theme = choix(themes.filter(t => fois(lot.filter(a => a.theme === t)) === moinsTheme))
    const dans = lot.filter(a => a.theme === theme)
    const moins = Math.min(...dans.map(a => pris.get(a.id) ?? 0))
    x = choix(dans.filter(a => (pris.get(a.id) ?? 0) === moins))
    q = poser(x)
    if (!vus.has(q.enonce + (q.figure ?? '') + q.reponse)) break
  }
  vus.add(q.enonce + (q.figure ?? '') + q.reponse)
  pris.set(x.id, (pris.get(x.id) ?? 0) + 1)
  return { x, q }
}

/** Les questions d'un flash, dans l'ordre : les questions de cours, puis
 *  les exercices d'application (une question à trou s'y glisse parfois).
 *  Les thèmes choisis passent chacun leur tour ; on évite de reprendre
 *  deux fois la même question tant qu'il en reste. Une question de cours
 *  qu'aucun thème choisi n'a devient un exercice d'application
 *  (coursRemplaces le compte). */
export function tirerFlash(autos: Automatisme[], lecons: QuestionCours[], c: Composition): { questions: QuestionFlash[]; coursRemplaces: number } {
  const questions: QuestionFlash[] = [], pris = new Map<string, number>(), vus = new Set<string>()
  let coursRemplaces = 0
  const nCours = Math.max(0, c.cours), nAppli = Math.max(0, c.application)
  for (let k = 0; k < nCours; k++) {
    if (!lecons.length) { coursRemplaces = nCours - k; break }
    const { x, q } = tirerDans(lecons, pris, vus, l => l.poser())
    questions.push({ id: x.id, theme: x.theme, q, forme: 'cours' })
  }
  if (!autos.length) return { questions, coursRemplaces: questions.length ? coursRemplaces : 0 }
  for (let k = 0; k < nAppli + coursRemplaces; k++) {
    const { x, q } = tirerDans(autos, pris, vus, a => a.trou && Math.random() < PART_DES_TROUS ? a.trou() : a.generer())
    questions.push({ id: x.id, theme: x.theme, q, forme: 'application' })
  }
  return { questions, coursRemplaces }
}
