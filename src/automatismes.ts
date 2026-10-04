// =============================================================
// LES AUTOMATISMES (5e)
// Chaque automatisme est un GÉNÉRATEUR : il tire des valeurs au hasard
// et rend une question, sa réponse, et trois réponses fausses qui sont
// de vraies erreurs d'élèves (pour le QCM et le vrai/faux). Une séance
// en tire dix ; « Nouveaux exemples » en tire dix autres.
//
// Les textes sont en LaTeX (KaTeX) : $…$ dans l'énoncé, les réponses
// sont des expressions mathématiques.
// =============================================================

export interface Question {
  enonce: string            // texte, avec $…$ pour les maths
  reponse: string           // LaTeX
  faux: string[]            // trois réponses fausses, LaTeX
}

export interface Automatisme {
  id: string
  titre: string
  theme: string
  generer: () => Question
}

// ---------- Outils ----------
const ent = (a: number, b: number) => a + Math.floor(Math.random() * (b - a + 1))
const choix = <T,>(t: T[]): T => t[Math.floor(Math.random() * t.length)]
const pgcd = (a: number, b: number): number => b ? pgcd(b, a % b) : Math.abs(a)
const arrondi = (x: number) => Math.round(x * 1e6) / 1e6

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

/** Trois réponses fausses, toutes différentes de la bonne et entre elles */
function fausses(bonne: string, candidates: string[], secours: () => string): string[] {
  const r: string[] = []
  for (const c of candidates) if (c !== bonne && !r.includes(c) && r.length < 3) r.push(c)
  for (let essai = 0; r.length < 3 && essai < 60; essai++) {
    const c = secours()
    if (c !== bonne && !r.includes(c)) r.push(c)
  }
  return r
}
/** Secours numérique : la bonne réponse décalée un peu */
const autour = (v: number, pas = 1) => () => nb(v + choix([-3, -2, -1, 1, 2, 3]) * pas)

// =============================================================
export const AUTOMATISMES_5E: Automatisme[] = [
  // ---------- Nombres et calculs ----------
  {
    id: 'priorites', theme: 'Calcul', titre: 'Priorités opératoires',
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
    id: 'relatifs-somme', theme: 'Nombres relatifs', titre: 'Additionner des relatifs',
    generer() {
      const a = ent(1, 15) * choix([-1, 1]), b = ent(1, 15) * choix([-1, 1])
      const v = a + b
      return { enonce: `Calculer : $${rel(a)} + ${rel(b)}$`, reponse: nb(v),
        faux: fausses(nb(v), [nb(-v), nb(Math.abs(a) + Math.abs(b)), nb(-(Math.abs(a) + Math.abs(b))), nb(a - b)], autour(v)) }
    },
  },
  {
    id: 'relatifs-difference', theme: 'Nombres relatifs', titre: 'Soustraire des relatifs',
    generer() {
      const a = ent(1, 12) * choix([-1, 1]), b = ent(1, 12) * choix([-1, 1])
      const v = a - b
      return { enonce: `Calculer : $${rel(a)} - ${rel(b)}$`, reponse: nb(v),
        faux: fausses(nb(v), [nb(a + b), nb(-v), nb(-(a + b))], autour(v)) }
    },
  },
  {
    id: 'relatifs-comparer', theme: 'Nombres relatifs', titre: 'Comparer des relatifs',
    generer() {
      const t = new Set<number>()
      while (t.size < 4) t.add(ent(-12, 12) + choix([0, 0, 0.5]))
      const l = [...t], plusPetit = Math.min(...l)
      return { enonce: `Quel est le plus petit de ces nombres : $${l.map(nb).join(' \\; ; \\; ')}$ ?`, reponse: nb(plusPetit),
        faux: l.filter(x => x !== plusPetit).map(nb) }
    },
  },
  {
    id: 'decimaux-10', theme: 'Calcul', titre: 'Multiplier ou diviser par 10, 100, 0,1…',
    generer() {
      const x = ent(11, 999) / choix([10, 100])
      const [op, k, v] = choix<[string, string, number]>([
        ['\\times', '10', x * 10], ['\\times', '100', x * 100], ['\\times', '0{,}1', x / 10],
        ['\\div', '10', x / 10], ['\\div', '100', x / 100], ['\\times', '1\\,000', x * 1000]])
      return { enonce: `Calculer : $${nb(x)} ${op} ${k}$`, reponse: nb(v),
        faux: fausses(nb(v), [nb(v * 10), nb(v / 10), nb(v * 100), nb(v / 100)], autour(v, 0.1)) }
    },
  },
  // ---------- Fractions ----------
  {
    id: 'fraction-simplifier', theme: 'Fractions', titre: 'Simplifier une fraction',
    generer() {
      let n: number, d: number
      do { n = ent(1, 9); d = ent(2, 12) } while (pgcd(n, d) !== 1 || n === d)
      const k = ent(2, 9), N = n * k, D = d * k
      const partiel = k % 2 === 0 && k > 2 ? frac(N / 2, D / 2) : frac(N - 1, D - 1)
      return { enonce: `Écrire sous forme irréductible : $${frac(N, D)}$`, reponse: frac(n, d),
        faux: fausses(frac(n, d), [partiel, frac(d, n), frac(n + 1, d)], () => frac(n + ent(1, 3), d)) }
    },
  },
  {
    id: 'fraction-egales', theme: 'Fractions', titre: 'Fractions égales',
    generer() {
      let n: number, d: number
      do { n = ent(1, 9); d = ent(2, 10) } while (pgcd(n, d) !== 1)
      const k = ent(2, 8)
      return { enonce: `Compléter : $${frac(n, d)} = \\frac{\\ldots}{${d * k}}$`, reponse: nb(n * k),
        faux: fausses(nb(n * k), [nb(n + k), nb(n * k + d), nb(d * k - n)], autour(n * k)) }
    },
  },
  {
    id: 'fraction-somme', theme: 'Fractions', titre: 'Additionner des fractions',
    generer() {
      const d = ent(2, 7), k = choix([1, 2, 3]), D = d * k
      const a = ent(1, 9), c = ent(1, 9)
      const v = irreductible(a * k + c, D)
      return { enonce: `Calculer et simplifier si possible : $${frac(a, d)} + ${frac(c, D)}$`, reponse: v,
        faux: fausses(v, [frac(a + c, d + D), frac(a + c, D), irreductible(a * k + c + 1, D)], () => frac(a * k + c + ent(1, 4), D)) }
    },
  },
  {
    id: 'fraction-quantite', theme: 'Fractions', titre: "Fraction d'une quantité",
    generer() {
      let n: number, d: number
      do { n = ent(1, 7); d = ent(2, 10) } while (n >= d || pgcd(n, d) !== 1)
      const N = d * ent(2, 12), v = N / d * n
      return { enonce: `Calculer $${frac(n, d)}$ de $${N}$.`, reponse: nb(v),
        faux: fausses(nb(v), [nb(N / d), nb(N * n), nb(N - n)], autour(v)) }
    },
  },
  {
    id: 'fraction-decimal', theme: 'Fractions', titre: 'Fraction et écriture décimale',
    generer() {
      const [n, d] = choix([[1, 2], [1, 4], [3, 4], [1, 5], [2, 5], [3, 5], [4, 5], [1, 10], [7, 10], [3, 2], [5, 4], [7, 2], [9, 10], [1, 20]])
      const v = n / d
      return { enonce: `Donner l'écriture décimale de $${frac(n, d)}$.`, reponse: nb(v),
        // Les erreurs classiques : « 3/4 = 3,4 », « 4,3 », la virgule mal placée
        faux: fausses(nb(v), [`${n}{,}${d}`, `${d}{,}${n}`, nb(v * 10), nb(v / 10)], autour(v, 0.1)) }
    },
  },
  // ---------- Arithmétique ----------
  {
    id: 'divisibilite', theme: 'Arithmétique', titre: 'Critères de divisibilité',
    generer() {
      // Un nombre divisible par exactement un de 2, 3, 5, 9
      const cibles = [2, 3, 5, 9]
      for (;;) {
        const N = ent(101, 999)
        const ok = cibles.filter(k => N % k === 0 && !(k === 3 && N % 9 === 0))
        const vrais = cibles.filter(k => N % k === 0)
        if (vrais.length === 1 && ok.length === 1) {
          return { enonce: `Le nombre $${N}$ est divisible par :`, reponse: nb(ok[0]), faux: cibles.filter(k => k !== ok[0]).map(nb) }
        }
      }
    },
  },
  // ---------- Calcul littéral ----------
  {
    id: 'litteral-substituer', theme: 'Calcul littéral', titre: 'Calculer une expression pour une valeur',
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
    id: 'litteral-reduire', theme: 'Calcul littéral', titre: 'Réduire une expression',
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
  // ---------- Proportionnalité ----------
  {
    id: 'proportionnalite', theme: 'Proportionnalité', titre: 'Quatrième proportionnelle',
    generer() {
      const [chose, unitePrix] = choix([['cahiers', '€'], ['stylos', '€'], ['baguettes', '€'], ['places de cinéma', '€']])
      const pu = choix([0.5, 1.2, 1.5, 2, 2.5, 3, 0.8, 1.1, 4])
      const n1 = ent(2, 6)
      let n2 = ent(2, 9); if (n2 === n1) n2++
      const v = pu * n2
      return { enonce: `$${n1}$ ${chose} coûtent $${nb(pu * n1)}$ ${unitePrix}. Combien coûtent $${n2}$ ${chose} ?`, reponse: unite(nb(v), unitePrix),
        faux: fausses(unite(nb(v), unitePrix), [unite(nb(pu * n1 + (n2 - n1)), unitePrix), unite(nb(pu * n1 * n2), unitePrix), unite(nb(pu * n1 + n2), unitePrix)], () => unite(nb(v + choix([-1, 1, 2]) * pu), unitePrix)) }
    },
  },
  {
    id: 'pourcentages', theme: 'Proportionnalité', titre: 'Pourcentages simples',
    generer() {
      const p = choix([10, 20, 25, 50, 75, 5, 30])
      const N = choix([20, 40, 60, 80, 120, 200, 300, 400, 500, 160])
      const v = N * p / 100
      return { enonce: `Calculer $${p}\\,\\%$ de $${N}$.`, reponse: nb(v),
        // Les erreurs : enlever le pourcentage, oublier de diviser par 100, se tromper de dizaine
        faux: fausses(nb(v), [nb(N - p), nb(p * N / 10), nb(N * p), nb(v * 2)], autour(v, 5)) }
    },
  },
  // ---------- Grandeurs et mesures ----------
  {
    id: 'conversions', theme: 'Grandeurs et mesures', titre: 'Conversions de longueurs et de masses',
    generer() {
      const [de, vers, k] = choix<[string, string, number]>([
        ['m', 'cm', 100], ['cm', 'm', 0.01], ['km', 'm', 1000], ['m', 'km', 0.001], ['mm', 'cm', 0.1], ['cm', 'mm', 10],
        ['kg', 'g', 1000], ['g', 'kg', 0.001], ['dm', 'cm', 10], ['m', 'mm', 1000]])
      const x = choix([ent(2, 95) / 10, ent(1, 99), ent(101, 999) / 100])
      const v = x * k
      return { enonce: `Convertir : $${unite(nb(x), de)} = \\ldots\\text{ ${vers}}$`, reponse: unite(nb(v), vers),
        faux: fausses(unite(nb(v), vers), [unite(nb(v * 10), vers), unite(nb(v / 10), vers), unite(nb(x / k), vers)], () => unite(nb(v * choix([100, 0.01])), vers)) }
    },
  },
  {
    id: 'aires-perimetres', theme: 'Grandeurs et mesures', titre: 'Périmètres et aires',
    generer() {
      const a = ent(2, 12), b = ent(2, 12)
      const cas = ent(0, 3)
      if (cas === 0) { const v = 2 * (a + b); return { enonce: `Périmètre d'un rectangle de longueur $${a}$ cm et de largeur $${b}$ cm ?`, reponse: unite(nb(v), 'cm'), faux: fausses(unite(nb(v), 'cm'), [unite(nb(a * b), 'cm'), unite(nb(a + b), 'cm'), unite(nb(a * b), 'cm}^2\\text{')], () => unite(nb(v + choix([-2, 2, 4])), 'cm')) } }
      if (cas === 1) { const v = a * b; return { enonce: `Aire d'un rectangle de longueur $${a}$ cm et de largeur $${b}$ cm ?`, reponse: `${nb(v)}\\text{ cm}^2`, faux: fausses(`${nb(v)}\\text{ cm}^2`, [`${nb(2 * (a + b))}\\text{ cm}^2`, `${nb(a + b)}\\text{ cm}^2`, `${nb(v)}\\text{ cm}`], () => `${nb(v + choix([-2, 2, 4]))}\\text{ cm}^2`) } }
      if (cas === 2) { const v = 4 * a; return { enonce: `Périmètre d'un carré de côté $${a}$ cm ?`, reponse: unite(nb(v), 'cm'), faux: fausses(unite(nb(v), 'cm'), [unite(nb(a * a), 'cm'), unite(nb(2 * a), 'cm'), unite(nb(a + 4), 'cm')], () => unite(nb(v + choix([-4, 4])), 'cm')) } }
      const p = 2 * ent(1, 6); const v = p * b / 2
      return { enonce: `Aire d'un triangle rectangle dont les côtés de l'angle droit mesurent $${p}$ cm et $${b}$ cm ?`, reponse: `${nb(v)}\\text{ cm}^2`,
        faux: fausses(`${nb(v)}\\text{ cm}^2`, [`${nb(p * b)}\\text{ cm}^2`, `${nb(p + b)}\\text{ cm}^2`, `${nb(2 * (p + b))}\\text{ cm}^2`], () => `${nb(v + choix([-2, 2]))}\\text{ cm}^2`) }
    },
  },
  {
    id: 'angles-triangle', theme: 'Géométrie', titre: "Somme des angles d'un triangle",
    generer() {
      const a = ent(25, 95), b = ent(20, 150 - a), v = 180 - a - b
      return { enonce: `Dans un triangle, deux angles mesurent $${a}°$ et $${b}°$. Combien mesure le troisième ?`, reponse: `${v}°`,
        faux: fausses(`${v}°`, [`${360 - a - b}°`, `${a + b}°`, `${90 - Math.min(a, b) > 0 ? 90 - Math.min(a, b) : v + 10}°`], () => `${v + choix([-10, -5, 5, 10])}°`) }
    },
  },
  {
    id: 'angles-symetrie', theme: 'Géométrie', titre: 'Angles et parallélogramme',
    generer() {
      const a = ent(35, 145)
      if (Math.random() < 0.5) {
        return { enonce: `Dans un parallélogramme, un angle mesure $${a}°$. Combien mesure l'angle consécutif ?`, reponse: `${180 - a}°`,
          faux: fausses(`${180 - a}°`, [`${a}°`, `${360 - a}°`, `${90 - a > 0 ? 90 - a : a - 90}°`], () => `${180 - a + choix([-10, 10])}°`) }
      }
      return { enonce: `Dans un parallélogramme, un angle mesure $${a}°$. Combien mesure l'angle opposé ?`, reponse: `${a}°`,
        faux: fausses(`${a}°`, [`${180 - a}°`, `${360 - a}°`, `${2 * a <= 360 ? 2 * a : a / 2}°`], () => `${a + choix([-10, 10])}°`) }
    },
  },
  // ---------- Statistiques ----------
  {
    id: 'moyenne', theme: 'Statistiques', titre: 'Calculer une moyenne',
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
]

/** Dix questions différentes (on évite deux fois le même énoncé) */
export function dixQuestions(autos: Automatisme[], n = 10): { auto: Automatisme; q: Question }[] {
  const r: { auto: Automatisme; q: Question }[] = []
  const vus = new Set<string>()
  for (let essai = 0; r.length < n && essai < n * 40; essai++) {
    const auto = autos[r.length % autos.length]
    const q = auto.generer()
    if (vus.has(q.enonce)) continue
    vus.add(q.enonce); r.push({ auto, q })
  }
  // Plusieurs automatismes : on mélange l'ordre
  if (autos.length > 1) r.sort(() => Math.random() - 0.5)
  return r
}
