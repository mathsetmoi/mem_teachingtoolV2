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
}

// ---------- Outils ----------
const ent = (a: number, b: number) => a + Math.floor(Math.random() * (b - a + 1))
const choix = <T,>(t: T[]): T => t[Math.floor(Math.random() * t.length)]
const pgcd = (a: number, b: number): number => b ? pgcd(b, a % b) : Math.abs(a)
const arrondi = (x: number) => Math.round(x * 1e6) / 1e6
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
    generer() { return divisiblePar([2, 3, 5, 9, 10]) },
  },
  {
    id: 'division-euclidienne', theme: 'Opérations', titre: 'Quotient et reste d’une division euclidienne',
    generer() {
      const b = ent(3, 9), q = ent(3, 15), r = ent(1, b - 1), a = b * q + r
      const qr = (x: number, y: number) => `q = ${x} \\text{ et } r = ${y}`
      return { enonce: `Dans la division euclidienne de $${a}$ par $${b}$, quels sont le quotient $q$ et le reste $r$ ?`, reponse: qr(q, r),
        faux: fausses(qr(q, r), [qr(q - 1, r + b), qr(r, q), qr(q + 1, r), qr(q, b - r)], () => qr(q + ent(1, 2), r)) }
    },
  },
  {
    id: 'factoriser-tables', theme: 'Opérations', titre: 'Factoriser un entier avec les tables',
    generer() {
      const a = ent(2, 9), b = ent(2, 9), N = a * b
      return { enonce: `Compléter : $${N} = ${a} \\times \\ldots$`, reponse: nb(b), faux: fausses(nb(b), [nb(b + 1), nb(b - 1), nb(N - a)], autour(b)) }
    },
  },
  {
    id: 'produit-derive', theme: 'Opérations', titre: 'Produits dérivés des tables',
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
    generer() {
      const x = ent(11, 999) / choix([10, 100]), k = choix([10, 100, 1000]), v = x * k
      // L'erreur classique : « on ajoute des zéros » derrière la virgule
      const zeros = nb(x) + String(k).slice(1)
      return { enonce: `Calculer : $${nb(x)} \\times ${k === 1000 ? '1\\,000' : k}$`, reponse: nb(v), faux: fausses(nb(v), [zeros, nb(v / 10), nb(v * 10), nb(x / k)]) }
    },
  },
  {
    id: 'decimal-divise-10', theme: 'Opérations', titre: 'Diviser un décimal par 10, 100 ou 1 000',
    generer() {
      const x = choix([ent(11, 999) / 10, ent(2, 9999)]), k = choix([10, 100, 1000]), v = x / k
      return { enonce: `Calculer : $${nb(x)} \\div ${k === 1000 ? '1\\,000' : k}$`, reponse: nb(v), faux: fausses(nb(v), [nb(v * 10), nb(v / 10), nb(x * k), nb(v * 100)]) }
    },
  },
  {
    id: 'decimaux-addition', theme: 'Opérations', titre: 'Additionner des décimaux',
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
    generer() {
      let a: number, b: number
      do { a = ent(21, 199) / 10; b = ent(101, 999) / 100 } while (b >= a)
      const v = arrondi(a - b)
      return { enonce: `Calculer : $${nb(a)} - ${nb(b)}$`, reponse: nb(v), faux: fausses(nb(v), [nb(v + 1), nb(v - 0.1), nb(v + 0.1), nb(arrondi(v - 1))].filter(t => !t.startsWith('-')), autour(v, 0.01)) }
    },
  },
  {
    id: 'tables', theme: 'Opérations', titre: 'Tables de multiplication',
    generer() {
      const a = ent(2, 10), b = ent(2, 10), v = a * b
      if (Math.random() < 0.3) return { enonce: `Compléter : $${a} \\times \\ldots = ${v}$`, reponse: nb(b), faux: fausses(nb(b), [nb(b + 1), nb(b - 1), nb(v - a)], autour(b)) }
      return { enonce: `Calculer : $${a} \\times ${b}$`, reponse: nb(v), faux: fausses(nb(v), [nb(a * (b + 1)), nb(a * (b - 1)), nb((a + 1) * b), nb(v + 2)], autour(v)) }
    },
  },

  // ================= NOMBRES RELATIFS =================
  {
    id: 'relatifs-addsub', theme: 'Nombres relatifs', titre: 'Additionner et soustraire des relatifs',
    generer() {
      const tirer = () => (Math.random() < 0.3 ? ent(1, 99) / 10 : ent(1, 15)) * choix([-1, 1])
      const a = tirer(), b = tirer(), plus = Math.random() < 0.5
      const v = arrondi(plus ? a + b : a - b)
      const faux = plus ? [nb(-v), nb(arrondi(Math.abs(a) + Math.abs(b))), nb(arrondi(a - b))] : [nb(arrondi(a + b)), nb(-v), nb(arrondi(-(a + b)))]
      return { enonce: `Calculer : $${rel(a)} ${plus ? '+' : '-'} ${rel(b)}$`, reponse: nb(v), faux: fausses(nb(v), faux, autour(v)) }
    },
  },
  {
    id: 'relatifs-produit', theme: 'Nombres relatifs', titre: 'Multiplier des relatifs',
    generer() {
      const a = ent(1, 10) * choix([-1, 1]), b = (Math.random() < 0.25 ? choix([0.5, 0.2, 1.5]) : ent(1, 10)) * choix([-1, 1])
      const v = arrondi(a * b)
      return { enonce: `Calculer : $${rel(a)} \\times ${rel(b)}$`, reponse: nb(v), faux: fausses(nb(v), [nb(-v), nb(arrondi(a + b)), nb(arrondi(-(Math.abs(a) + Math.abs(b))))], autour(v)) }
    },
  },
  {
    id: 'relatifs-trou', theme: 'Nombres relatifs', titre: 'Addition à trou',
    generer() {
      const a = ent(1, 12) * choix([-1, 1]), b = ent(-12, 12), v = b - a
      const e = Math.random() < 0.5 ? `${rel(a)} + \\ldots = ${nb(b)}` : `\\ldots + ${rel(a)} = ${nb(b)}`
      return { enonce: `Compléter : $${e}$`, reponse: nb(v), faux: fausses(nb(v), [nb(a - b), nb(a + b), nb(-(a + b))], autour(v)) }
    },
  },

  // ================= NOMBRES RATIONNELS =================
  {
    id: 'fraction-decimal', theme: 'Nombres rationnels', titre: 'Écriture décimale de fractions simples',
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
    generer() {
      let a: number, b: number
      do { a = ent(3, 9); b = ent(2, 11) } while (b === a || pgcd(a, b) !== 1)
      return { enonce: `Compléter : $${a} \\times \\ldots = ${b}$`, reponse: frac(b, a), faux: fausses(frac(b, a), [frac(a, b), nb(Math.abs(b - a)), frac(1, a), nb(a * b)]) }
    },
  },
  {
    id: 'abscisse-fraction', theme: 'Nombres rationnels', titre: 'Abscisse d’un point (demis, tiers, quarts)',
    generer() {
      const d = choix([2, 3, 4])
      let k: number
      do { k = ent(1, 3 * d - 1) } while (pgcd(k, d) !== 1)
      return { enonce: `Quelle est l'abscisse du point $A$ ?`, figure: F.droiteGraduee(0, 3, d, k / d),
        // Les erreurs : compter les traits plutôt que les intervalles, inverser, se décaler
        reponse: frac(k, d), faux: fausses(frac(k, d), [frac(k, d + 1), frac(d, k), frac(k + 1, d), frac(k - 1, d)]) }
    },
  },
  {
    id: 'fraction-egales', theme: 'Nombres rationnels', titre: 'Reconnaître des fractions égales',
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
    generer() {
      const d = ent(2, 9), q = ent(1, 6), r = ent(1, d - 1), N = q * d + r
      const e = (x: number, f: string) => `${x} + ${f}`
      return { enonce: `Écrire $${frac(N, d)}$ sous la forme d'un entier et d'une fraction inférieure à 1.`, reponse: e(q, frac(r, d)),
        faux: fausses(e(q, frac(r, d)), [e(r, frac(q, d)), e(q + 1, frac(r, d)), e(q, frac(d - r, d)), e(q, frac(r, N))]) }
    },
  },
  {
    id: 'fractions-addsub', theme: 'Nombres rationnels', titre: 'Additionner et soustraire des fractions simples',
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
    generer() {
      const p = choix([1, 10, 50])
      const N = p === 1 ? ent(2, 90) * 10 : p === 10 ? ent(11, 99) * choix([1, 10]) : ent(3, 99) * 2 + choix([0, 1])
      const v = N * p / 100
      return { enonce: `Calculer $${p}\\,\\%$ de $${N}$.`, reponse: nb(v), faux: fausses(nb(v), [nb(N / 10), nb(N / 100), nb(N / 2), nb(N - p), nb(N / 5)].filter(t => !t.startsWith('-') && !/\{,\}\d{3}/.test(t))) }
    },
  },
  {
    id: 'ecritures-nombre', theme: 'Nombres rationnels', titre: 'Décimale, fraction, pourcentage',
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

  // ================= PUISSANCES ET CALCUL LITTÉRAL =================
  {
    id: 'carres', theme: 'Puissances et calcul littéral', titre: 'Carrés des nombres entiers',
    generer() {
      const n = ent(2, 15), v = n * n
      if (Math.random() < 0.3) return { enonce: `Quel nombre positif a pour carré $${v}$ ?`, reponse: nb(n), faux: fausses(nb(n), [nb(v / 2), nb(n + 1), nb(n - 1), nb(2 * n)]) }
      return { enonce: `Calculer : $${n}^2$`, reponse: nb(v), faux: fausses(nb(v), [nb(2 * n), nb(n + 2), nb(v + n), nb(Number(`${n}${n}`))], autour(v)) }
    },
  },
  {
    id: 'motifs', theme: 'Puissances et calcul littéral', titre: 'Poursuivre une suite de motifs',
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

  // ================= REPÉRAGE =================
  {
    id: 'reperer-decimal', theme: 'Repérage', titre: 'Repérer un décimal sur une demi-droite graduée',
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
    generer() {
      let x: number, y: number
      do { x = ent(-4, 4); y = ent(-4, 4) } while (x === 0 && y === 0 || x === y)
      const c = (a: number, b: number) => `(${nb(a)}\\,;\\,${nb(b)})`
      return { enonce: `Quelles sont les coordonnées du point $A$ ?`, figure: F.repere(x, y), reponse: c(x, y),
        faux: fausses(c(x, y), [c(y, x), c(-x, y), c(x, -y), c(-y, -x)]) }
    },
  },

  // ================= REPRÉSENTATION DE L'ESPACE =================
  {
    id: 'vues-cubes', theme: 'Représentation de l’espace', titre: 'Vues d’un empilement de cubes',
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

  // ================= TRANSFORMATIONS =================
  {
    id: 'symetrie-axiale', theme: 'Transformations', titre: 'Construire le symétrique d’un point',
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

  // ================= ANGLES =================
  {
    id: 'angles-nommer', theme: 'Angles', titre: 'Reconnaître et nommer les angles',
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
    id: 'bissectrice', theme: 'Angles', titre: 'Reconnaître une bissectrice',
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

  // ================= TRIANGLES =================
  {
    id: 'triangle-nature', theme: 'Triangles', titre: 'Triangle isocèle, équilatéral ou rectangle',
    generer() {
      const sorte = choix(['isocele', 'equilateral', 'rectangle', 'rectangle-isocele', 'quelconque'] as F.Triangle[])
      const NOMS: Record<F.Triangle, string> = { isocele: 'isocèle', equilateral: 'équilatéral', rectangle: 'rectangle', 'rectangle-isocele': 'rectangle isocèle', quelconque: 'quelconque' }
      return { enonce: `D'après le codage, quelle est la nature de ce triangle ?`, figure: F.triangleCode(sorte, ent(0, 23) * 15), ...parmi(NOMS[sorte], Object.values(NOMS)) }
    },
  },
  {
    id: 'angles-triangle', theme: 'Triangles', titre: 'Somme des angles : le troisième angle',
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

  // ================= PARALLÉLOGRAMMES ET POLYGONES =================
  {
    id: 'polygones', theme: 'Parallélogrammes et polygones', titre: 'Nommer un quadrilatère ou un polygone',
    generer() {
      const sorte = choix(['carre', 'rectangle', 'losange', 'parallelogramme', 'trapeze', 'pentagone', 'hexagone', 'quadrilatere'] as F.Polygone[])
      const NOMS: Record<F.Polygone, string> = { carre: 'un carré', rectangle: 'un rectangle', losange: 'un losange', parallelogramme: 'un parallélogramme', trapeze: 'un trapèze', pentagone: 'un pentagone', hexagone: 'un hexagone', quadrilatere: 'un quadrilatère quelconque' }
      const proches: Record<F.Polygone, F.Polygone[]> = { carre: ['losange', 'rectangle', 'parallelogramme'], rectangle: ['carre', 'parallelogramme', 'losange'], losange: ['carre', 'parallelogramme', 'rectangle'], parallelogramme: ['losange', 'rectangle', 'trapeze'], trapeze: ['parallelogramme', 'quadrilatere', 'rectangle'], pentagone: ['hexagone', 'quadrilatere', 'trapeze'], hexagone: ['pentagone', 'quadrilatere', 'losange'], quadrilatere: ['trapeze', 'parallelogramme', 'losange'] }
      return { enonce: `Comment s'appelle ce polygone ?`, figure: F.polygone(sorte, ent(0, 23) * 15), reponse: mot(NOMS[sorte]), faux: proches[sorte].map(x => mot(NOMS[x])) }
    },
  },
  {
    id: 'parallelogramme-code', theme: 'Parallélogrammes et polygones', titre: 'Le codage d’un parallélogramme particulier',
    generer() {
      const lg = Math.random() < 0.5, dr = Math.random() < 0.5
      const noms = choix(['ABCD', 'EFGH', 'IJKL', 'MNOP', 'RSTU'])
      const LOT = ['un carré', 'un losange', 'un rectangle', 'un parallélogramme quelconque']
      const bonne = lg && dr ? LOT[0] : lg ? LOT[1] : dr ? LOT[2] : LOT[3]
      return { enonce: `$${noms}$ est un parallélogramme. D'après le codage, quelle est sa nature ?`, figure: F.parallelogrammeCode(lg, dr, noms, ent(-4, 4) * 10, ent(0, 3)), reponse: mot(bonne), faux: LOT.filter(x => x !== bonne).map(mot) }
    },
  },

  // ================= PROBABILITÉS =================
  {
    id: 'probabilite-echelle', theme: 'Probabilités', titre: 'Échelle de probabilité et fraction',
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

  // ================= PROPORTIONNALITÉ =================
  {
    id: 'situation-proportionnelle', theme: 'Proportionnalité', titre: 'Le coefficient de proportionnalité',
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
    generer() {
      const [chose, une] = choix([['cahiers', 'cahier'], ['stylos', 'stylo'], ['baguettes', 'baguette'], ['croissants', 'croissant'], ['places de cinéma', 'place']])
      const pu = choix([0.5, 1.2, 1.5, 2, 2.5, 3, 0.8, 1.1, 4])
      const n1 = ent(2, 5), sorte = ent(0, 2)
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

  // ================= HORS LISTE OFFICIELLE =================
  {
    id: 'priorites', theme: 'Hors liste officielle', titre: 'Priorités opératoires',
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
    id: 'relatifs-comparer', theme: 'Hors liste officielle', titre: 'Comparer des relatifs',
    generer() {
      const t = new Set<number>()
      while (t.size < 4) t.add(ent(-12, 12) + choix([0, 0, 0.5]))
      const l = [...t], plusPetit = Math.min(...l)
      return { enonce: `Quel est le plus petit de ces nombres : $${l.map(nb).join(' \\; ; \\; ')}$ ?`, reponse: nb(plusPetit),
        faux: l.filter(x => x !== plusPetit).map(nb) }
    },
  },
  {
    id: 'fraction-simplifier', theme: 'Hors liste officielle', titre: 'Simplifier une fraction',
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
    id: 'divisibilite', theme: 'Hors liste officielle', titre: 'Divisibilité par 2, 3, 4, 5, 9 et 10',
    generer() { return divisiblePar([2, 3, 4, 5, 9, 10]) },
  },
  // ---------- Calcul littéral ----------,
  {
    id: 'litteral-substituer', theme: 'Hors liste officielle', titre: 'Calculer une expression pour une valeur',
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
    id: 'litteral-reduire', theme: 'Hors liste officielle', titre: 'Réduire une expression',
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
  // ---------- Proportionnalité ----------,
  {
    id: 'conversions', theme: 'Hors liste officielle', titre: 'Conversions de longueurs et de masses',
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
    id: 'aires-perimetres', theme: 'Hors liste officielle', titre: 'Périmètres et aires',
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
    id: 'angles-symetrie', theme: 'Hors liste officielle', titre: 'Angles et parallélogramme',
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
  // ---------- Statistiques ----------,
  {
    id: 'moyenne', theme: 'Hors liste officielle', titre: 'Calculer une moyenne',
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
  'relatifs-produit': () => {
    const a = ent(2, 10) * choix([-1, 1]), b = ent(2, 10) * choix([-1, 1])
    return unTrou('', [[`$${rel(a)} \\times \\ldots = ${nb(a * b)}$`, nb(b)], [`$\\ldots \\times ${rel(b)} = ${nb(a * b)}$`, nb(a)]])
  },
  'relatifs-trou': memeQuestion('relatifs-trou'),
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
    const n = ent(2, 15)
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
  'conversions': () => {
    const [de, vers, k] = choix<[string, string, number]>([
      ['m', 'cm', 100], ['cm', 'm', 0.01], ['km', 'm', 1000], ['m', 'km', 0.001], ['mm', 'cm', 0.1], ['cm', 'mm', 10],
      ['kg', 'g', 1000], ['g', 'kg', 0.001], ['dm', 'cm', 10], ['m', 'mm', 1000]])
    const x = choix([ent(2, 95) / 10, ent(1, 99), ent(101, 999) / 100]), v = x * k
    return unTrou('Convertir :', [[`$${unite(nb(x), de)} = \\ldots\\text{ ${vers}}$`, unite(nb(v), vers)], [`$\\ldots\\text{ ${de}} = ${unite(nb(v), vers)}$`, unite(nb(x), de)]])
  },
  'aires-perimetres': () => {
    const a = ent(3, 12), b = ent(2, 12)
    return unTrou('', [
      [`Un rectangle de longueur $${a}$ cm et de largeur $\\ldots$ cm a une aire de $${a * b}\\text{ cm}^2$.`, unite(nb(b), 'cm')],
      [`Un rectangle de largeur $${b}$ cm et de longueur $\\ldots$ cm a un périmètre de $${2 * (a + b)}$ cm.`, unite(nb(a), 'cm')],
      [`Un carré de côté $\\ldots$ cm a un périmètre de $${4 * a}$ cm.`, unite(nb(a), 'cm')],
    ])
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
  ]),
  ...notions('Nombres relatifs', [
    ['Deux nombres opposés',
      () => { const a = nb(ent(2, 150) / choix([1, 10])); return [`Quelle est la somme de $-${a}$ et de $${a}$ ?`, '$0$ (ce sont deux nombres opposés)'] },
      () => { const a = ent(2, 30); return [`Comment appelle-t-on $${a}$ et $-${a}$, dont la somme est égale à $0$ ?`, 'des nombres opposés'] },
      () => { const a = nb(ent(2, 150) / choix([1, 10])); return [`Quel est l'opposé de $-${a}$ ?`, `$${a}$`] }],
    ['Soustraire un relatif',
      () => { const a = ent(2, 12); return une([`Soustraire $(-${a})$ revient à…`, `ajouter $${a}$ (son opposé)`], [`Soustraire $${a}$ revient à…`, `ajouter $-${a}$ (son opposé)`]) },
      () => { const a = ent(2, 12), b = ent(2, 12); return [`Pour calculer $${a} - (-${b})$, par quelle addition la remplace-t-on ?`, `$${a} + ${b}$`] }],
    ['La règle des signes d\'un produit',
      () => {
        const a = ent(2, 9), b = ent(2, 9), [x, y] = choix<[string, string]>([[`(-${a})`, `(-${b})`], [`(-${a})`, `(+${b})`], [`(+${a})`, `(-${b})`]])
        return [`Quelle règle des signes utilise-t-on pour calculer $${x} \\times ${y}$ ?`, 'deux nombres de même signe : produit positif ; de signes contraires : produit négatif']
      },
      () => { const n = choix([3, 4, 5, 6]); return [`Comment trouve-t-on le signe d'un produit de $${n}$ nombres relatifs ?`, 'on compte les facteurs négatifs : en nombre pair, positif ; en nombre impair, négatif'] }],
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
  ...notions('Puissances et calcul littéral', [
    ['Le carré d\'un nombre', () => { const n = ent(2, 15); return une([`Que signifie $${n}^2$ ?`, `$${n} \\times ${n}$`], [`Comment écrit-on $${n} \\times ${n}$ plus simplement ?`, `$${n}^2$`]) }],
    ['Le cube d\'un nombre', () => { const n = ent(2, 9); return une([`Que signifie $${n}^3$ ?`, `$${n} \\times ${n} \\times ${n}$`], [`Comment écrit-on $${n} \\times ${n} \\times ${n}$ plus simplement ?`, `$${n}^3$`]) }],
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
    ['Les priorités opératoires',
      () => { const a = ent(2, 20), b = ent(2, 9), c = ent(2, 9); return [`Dans $${a} + ${b} \\times ${c}$, quel calcul fait-on en premier ?`, `$${b} \\times ${c}$ : la multiplication passe avant l'addition`] },
      () => { const a = ent(2, 20), b = ent(2, 9), c = ent(2, 9); return [`Dans $(${a} + ${b}) \\times ${c}$, quel calcul fait-on en premier ?`, `$${a} + ${b}$ : les parenthèses d'abord`] },
      () => { const b = ent(2, 9), a = b + ent(2, 20), c = ent(2, 9); return [`Dans $${a} - ${b} + ${c}$, quel calcul fait-on en premier ?`, `$${a} - ${b}$ : on calcule de gauche à droite`] }],
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
  ]),
  ...notions('Parallélogrammes et polygones', [
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
  ...notions('Hors liste officielle', [
    ['Aire et périmètre du rectangle',
      () => { const L = ent(5, 15), l = ent(2, L - 1); return une([`Un rectangle mesure $${L}$ cm sur $${l}$ cm. Quel calcul donne son aire ?`, `$${L} \\times ${l}$ (longueur $\\times$ largeur)`],
        [`Un rectangle mesure $${L}$ cm sur $${l}$ cm. Quel calcul donne son périmètre ?`, `$2 \\times (${L} + ${l})$`]) }],
    ['Aire du triangle',
      () => { const b = ent(3, 15), h = ent(2, 12); return [`Un triangle a une base de $${b}$ cm et une hauteur de $${h}$ cm. Quel calcul donne son aire ?`, `$${b} \\times ${h} \\div 2$ (base $\\times$ hauteur $\\div 2$)`] }],
    ['Le cercle',
      () => { const r = ent(2, 9); return une([`Quel calcul donne le périmètre d'un cercle de rayon $${r}$ cm ?`, `$2 \\times \\pi \\times ${r}$`],
        [`Quel calcul donne l'aire d'un disque de rayon $${r}$ cm ?`, `$\\pi \\times ${r} \\times ${r}$`],
        [`Un cercle a un rayon de $${r}$ cm. Combien mesure son diamètre ?`, `$${2 * r}$ cm`]) }],
    ['Les conversions à connaître',
      () => {
        const [de, vers, k] = choix<[string, string, string]>([['km', 'm', '1\\,000'], ['m', 'cm', '100'], ['m', 'mm', '1\\,000'], ['kg', 'g', '1\\,000'], ['L', 'cL', '100'], ['h', 'min', '60'], ['min', 's', '60'], ['cm', 'mm', '10']])
        return [`Combien y a-t-il de ${vers} dans $1$ ${de} ?`, `$${k}$`]
      }],
    ['La moyenne',
      () => { const t = Array.from({ length: ent(3, 5) }, () => ent(4, 20)); return [`Quel calcul donne la moyenne de ${t.map(x => `$${x}$`).join(', ')} ?`, `$(${t.join(' + ')}) \\div ${t.length}$`] },
      () => { const n = ent(3, 12); return [`On a relevé $${n}$ températures. Comment calcule-t-on leur moyenne ?`, `on ajoute les $${n}$ températures, puis on divise par $${n}$`] }],
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
    generer() { const a = ent(3, 9), b = ent(3, 9); return Math.random() < 0.6 ? { enonce: `Calculer : $${a} \\times ${b}$`, reponse: nb(a * b) } : { enonce: `Calculer : $${a * b} \\div ${a}$`, reponse: nb(b) } },
    trou() {
      const a = ent(3, 9), b = ent(3, 9), p = a * b
      return unTrou('', [[`$${a} \\times \\ldots = ${p}$`, nb(b)], [`$\\ldots \\times ${b} = ${p}$`, nb(a)], [`$${p} = ${a} \\times \\ldots$`, nb(b)], [`$\\ldots = ${a} \\times ${b}$`, nb(p)]])
    },
  },
  {
    id: '4e-fois-10', theme: 'Opérations sur les nombres relatifs', titre: 'Multiplier et diviser par 10, 100, 1 000',
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

  // ================= NOMBRES RATIONNELS =================
  {
    id: '4e-fractions-addsub', theme: 'Nombres rationnels', titre: 'Additionner et soustraire des fractions',
    generer() {
      // Des dénominateurs simples : l'un multiple de l'autre, ou 2 et 3, 3 et 4…
      const [d1, d2] = choix<[number, number]>([[2, 4], [3, 6], [4, 8], [5, 10], [2, 6], [3, 9], [4, 12], [2, 3], [3, 4], [2, 5], [4, 6], [6, 9]])
      let a: number, b: number, moins: boolean, num: number
      const D = d1 * d2 / pgcd(d1, d2)
      do { a = ent(1, d1 + 3); b = ent(1, d2 + 3); moins = Math.random() < 0.4; num = moins ? a * D / d1 - b * D / d2 : a * D / d1 + b * D / d2 } while (num <= 0)
      const [f1, f2] = melange([frac(a, d1), frac(b, d2)])
      const ecrit = moins ? `${frac(a, d1)} - ${frac(b, d2)}` : `${f1} + ${f2}`
      return { enonce: `Calculer et simplifier si possible : $${ecrit}$`, reponse: irreductible(num, D) }
    },
  },
  {
    id: '4e-comparer-fractions', theme: 'Nombres rationnels', titre: 'Comparer des fractions',
    generer() {
      const D = choix([6, 8, 10, 12])
      const divs = [1, 2, 3, 4, 5, 6].filter(k => D % k === 0 && k < D)
      let nums: number[]
      do { nums = melange(Array.from({ length: 2 * D - 1 }, (_, i) => i + 1)).slice(0, 3) } while (nums.includes(D) || new Set(nums.map(n => irreductible(n, D))).size < 3 || nums.every(n => pgcd(n, D) === 1))
      const ecrire = (n: number) => { const g = choix(divs.filter(k => n % k === 0)); return frac(n / g, D / g) }
      const f = nums.map(n => ({ n, t: ecrire(n) }))
      const tries = [...f].sort((x, y) => x.n - y.n).map(x => x.t)
      return { enonce: `Ranger dans l'ordre croissant : $${melange(f).map(x => x.t).join(' \\; ; \\; ')}$`, reponse: tries.join(' < ') }
    },
  },
  {
    id: '4e-quotient', theme: 'Nombres rationnels', titre: 'La fraction est un quotient',
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

  // ================= PUISSANCES =================
  {
    id: '4e-carres', theme: 'Puissances', titre: 'Les carrés parfaits de 0 à 144',
    generer() { const n = ent(0, 12); return { enonce: `Calculer : $${n}^2$`, reponse: nb(n * n) } },
    trou() { const n = ent(2, 12); return unTrou('', [[`$${n}^2 = \\ldots$`, nb(n * n)], [`$\\ldots^2 = ${n * n}$ (nombre positif)`, nb(n)], [`$${n * n} = ${n} \\times \\ldots$`, nb(n)]]) },
  },
  {
    id: '4e-fois-puissance-10', theme: 'Puissances', titre: 'Compléter 1 200 = 1,2 × …',
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
    generer() {
      const [a, n] = choix<[number, number]>([[2, 2], [2, 3], [2, 4], [2, 5], [3, 2], [3, 3], [4, 2], [4, 3], [5, 2], [5, 3], [10, 2], [10, 3], [10, 4], [10, 6], [1, 7], [0, 5]])
      return { enonce: `Calculer : $${a}^{${n}}$`, reponse: grandNb(a ** n) }
    },
    trou() {
      const [a, n] = choix<[number, number]>([[2, 3], [2, 4], [3, 3], [5, 3], [10, 3], [10, 4], [10, 5], [2, 5], [4, 3]])
      return unTrou('', [[`$${a}^{\\ldots} = ${grandNb(a ** n)}$`, nb(n)], [`$\\ldots^{${n}} = ${grandNb(a ** n)}$`, nb(a)]])
    },
  },

  // ================= RACINE CARRÉE =================
  {
    id: '4e-racines', theme: 'Racine carrée', titre: 'Les carrés des entiers de 0 à 12, à l’envers',
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

  // ================= CALCUL LITTÉRAL ET ALGÉBRIQUE =================
  {
    id: '4e-valeur-expression', theme: 'Calcul littéral et algébrique', titre: 'La valeur d’une expression numérique',
    generer() {
      const a = ent(2, 12), b = ent(2, 9), c = ent(2, 9)
      const [e, v] = choix<[string, number]>([[`${a} + ${b} \\times ${c}`, a + b * c], [`${a} \\times ${b} - ${c}`, a * b - c], [`(${a} + ${b}) \\times ${c}`, (a + b) * c], [`${a} - ${b} \\times ${c}`, a - b * c], [`${b} \\times ${c} - ${a} \\times 2`, b * c - 2 * a], [`${a * b} \\div ${b} + ${c}`, a + c]])
      return { enonce: `Calculer : $${e}$`, reponse: nb(v) }
    },
  },
  {
    id: '4e-equations', theme: 'Calcul littéral et algébrique', titre: 'Résoudre x + b = c et ax = c',
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
    generer() {
      const k = ent(2, 12), x = choix(['x', 'a', 'y', 'n'])
      const [e, r] = choix<[string, string]>([[`${k} \\times ${x}`, `${k}${x}`], [`${x} \\times ${k}`, `${k}${x}`], [`${k} \\times ${x} \\times ${x}`, `${k}${x}^2`], [`1 \\times ${x}`, x], [`${x} \\times ${x} \\times ${x}`, `${x}^3`]])
      return { enonce: `Écrire plus simplement : $${e}$`, reponse: r }
    },
  },
  {
    id: '4e-reduire', theme: 'Calcul littéral et algébrique', titre: 'x + x = 2x, x × x = x², 3x × 2x = 6x²',
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
    generer() {
      // Une égalité px + q = rx + s, dont la solution est l'un des quatre nombres proposés
      let p: number, q: number, r: number, s: number, x0: number
      do { x0 = ent(-5, 6); p = ent(2, 7); r = ent(1, 6); q = ent(-9, 9); s = p * x0 + q - r * x0 } while (p === r || Math.abs(s) > 20 || q === 0 || s === 0)
      const candidats = melange([x0, ...melange([-6, -5, -4, -3, -2, -1, 0, 1, 2, 3, 4, 5, 6, 7].filter(v => v !== x0)).slice(0, 3)]).sort((a, b) => a - b)
      const terme = (k: number, c: number) => `${k === 1 ? '' : k}x ${c < 0 ? '-' : '+'} ${Math.abs(c)}`
      return { enonce: `Lequel des nombres ${candidats.map(c => `$${c}$`).join(', ')} vérifie l'égalité $${terme(p, q)} = ${terme(r, s)}$ ?`, reponse: nb(x0) }
    },
  },

  // ================= TRANSFORMATIONS =================
  {
    id: '4e-demi-tour', theme: 'Transformations', titre: 'Le symétrique d’un point par demi-tour',
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
    generer() {
      const [s, nom] = choix<[F.Solide, string]>([['cube', 'un cube'], ['pave', 'un pavé droit'], ['cylindre', 'un cylindre'], ['prisme3', 'un prisme droit'], ['prisme5', 'un prisme droit'], ['prisme4', 'un prisme droit'], ['pyramide', 'une pyramide']])
      return { enonce: 'Comment s\'appelle ce solide ?', figure: F.solide(s), reponse: mot(nom) }
    },
  },
  {
    id: '4e-base-prisme', theme: 'Représentation de l’espace', titre: 'La base d’un prisme droit',
    generer() {
      const [s, base, n] = choix<[F.Solide, string, number]>([['prisme3', 'un triangle', 3], ['prisme4', 'un quadrilatère (un trapèze)', 4], ['prisme5', 'un pentagone', 5], ['prisme6', 'un hexagone', 6]])
      return Math.random() < 0.6 ? { enonce: 'Ce solide est un prisme droit. Quelle est la forme de ses bases ?', figure: F.solide(s), reponse: mot(base) }
        : { enonce: 'Ce solide est un prisme droit. Combien a-t-il de faces latérales ?', figure: F.solide(s), reponse: nb(n) }
    },
  },
  {
    id: '4e-volumes', theme: 'Représentation de l’espace', titre: 'Volume d’un cube, d’un pavé, d’un prisme, d’un cylindre',
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
    generer() {
      const sorte = ent(0, 2)
      if (sorte === 0) { const b = ent(2, 14), h = 2 * ent(1, 7); return { enonce: `Quelle est l'aire d'un triangle de base $${b}$ cm et de hauteur $${h}$ cm ?`, reponse: cm2(nb(b * h / 2)) } }
      if (sorte === 1) { const L = ent(3, 15), l = ent(2, 12); return { enonce: `Quelle est l'aire d'un rectangle de $${L}$ cm sur $${l}$ cm ?`, reponse: cm2(nb(L * l)) } }
      const r = ent(1, 10)
      return Math.random() < 0.5 ? { enonce: `Quelle est l'aire d'un disque de rayon $${r}$ cm ? (valeur exacte)`, reponse: cm2(piFois(r * r)) }
        : { enonce: `Quelle est l'aire d'un disque de diamètre $${2 * r}$ cm ? (valeur exacte)`, reponse: cm2(piFois(r * r)) }
    },
  },

  // ================= PARALLÉLOGRAMMES ET TRANSLATIONS =================
  {
    id: '4e-images-symetries', theme: 'Parallélogrammes et translations', titre: 'Images par une symétrie axiale ou un demi-tour',
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
    id: '4e-diagonales', theme: 'Parallélogrammes et translations', titre: 'Un parallélogramme particulier par ses diagonales',
    generer() {
      const eg = Math.random() < 0.5, pe = Math.random() < 0.5
      const noms = choix(['ABCD', 'EFGH', 'IJKL', 'MNPQ', 'RSTU'])
      const nature = eg && pe ? 'un carré' : eg ? 'un rectangle' : pe ? 'un losange' : 'un parallélogramme'
      return { enonce: `D'après le codage de ses diagonales, quelle est la nature du quadrilatère $${noms}$ ?`, figure: F.diagonalesCodees(eg, pe, noms, ent(-6, 6) * 10), reponse: mot(nature) }
    },
  },
  {
    id: '4e-parallelogramme-code', theme: 'Parallélogrammes et translations', titre: 'Un parallélogramme particulier par ses côtés et ses angles',
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
    generer() {
      const sorte = choix<F.Remarquable>(['mediatrice', 'mediane', 'hauteur', 'bissectrice'])
      const [A, B, C] = [...choix(['ABC', 'EFG', 'IJK', 'MNP', 'RST'])]
      const nom = { mediatrice: `la médiatrice de $[${B}${C}]$`, mediane: `la médiane issue de $${A}$`, hauteur: `la hauteur issue de $${A}$`, bissectrice: `la bissectrice de l'angle $\\widehat{${B}${A}${C}}$` }[sorte]
      return { enonce: `Dans le triangle $${A}${B}${C}$, comment s'appelle la droite $(d)$ ?`, figure: F.droiteRemarquable(sorte, A + B + C, ent(-3, 3) * 15), reponse: mot(nom) }
    },
  },

  // ================= STATISTIQUES =================
  {
    id: '4e-moyenne', theme: 'Statistiques', titre: 'Une moyenne de quelques valeurs',
    generer() {
      const n = choix([2, 3, 4])
      let l: number[]
      do { l = Array.from({ length: n }, () => ent(4, 20)) } while ((l.reduce((s, x) => s + x, 0) * 2) % n !== 0)
      return { enonce: `Quelle est la moyenne de : $${l.join(' \\; ; \\; ')}$ ?`, reponse: nb(l.reduce((s, x) => s + x, 0) / n) }
    },
  },
  {
    id: '4e-effectif-manquant', theme: 'Statistiques', titre: 'Un effectif manquant',
    generer() {
      const [quoi, valeurs] = choix<[string, string[]]>([['Note', ['8', '10', '12', '15']], ['Frères et sœurs', ['0', '1', '2', '3']], ['Pointure', ['36', '37', '38', '39']], ['Couleur', ['\\text{bleu}', '\\text{rouge}', '\\text{vert}']]])
      const eff = valeurs.map(() => ent(1, 9)), k = ent(0, valeurs.length - 1), N = eff.reduce((s, x) => s + x, 0)
      const ligne = eff.map((e, i) => i === k ? '\\ldots' : String(e))
      return { enonce: `L'effectif total est $${N}$. Quel est l'effectif manquant ? $\\quad ${tableau([`\\text{${quoi}}`, ...valeurs], ['\\text{Effectif}', ...ligne])}$`, reponse: nb(eff[k]) }
    },
  },
  {
    id: '4e-frequence', theme: 'Statistiques', titre: 'Calculer une fréquence',
    generer() {
      const N = choix([10, 20, 25, 40, 50]), e = ent(1, N - 1)
      const [qui, quoi] = choix<[string, string]>([['élèves', 'ont un animal'], ['élèves', 'viennent à vélo'], ['personnes', 'ont répondu « oui »'], ['lancers', 'ont donné 6']])
      const pc = e / N * 100
      return { enonce: `Sur $${N}$ ${qui}, $${e}$ ${quoi}. Quelle est la fréquence de cette réponse (en fraction, puis en pourcentage) ?`, reponse: mot(`$${irreductible(e, N)}$, soit $${nb(pc)}\\,\\%$`) }
    },
  },

  // ================= PROPORTIONNALITÉ =================
  {
    id: '4e-pourcentages', theme: 'Proportionnalité', titre: 'a % de c, pour a = 100, 50, 25, 10, 1',
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

  // ================= HORS LISTE OFFICIELLE =================
  {
    id: '4e-produit-relatifs', theme: 'Hors liste officielle', titre: 'Multiplier et diviser des relatifs',
    generer() {
      const a = relNonNul(2, 9), b = relNonNul(2, 9)
      return Math.random() < 0.6 ? { enonce: `Calculer : $${rel(a)} \\times ${rel(b)}$`, reponse: nb(a * b) } : { enonce: `Calculer : $${rel(a * b)} \\div ${rel(b)}$`, reponse: nb(a) }
    },
  },
  {
    id: '4e-inverse', theme: 'Hors liste officielle', titre: 'L’inverse d’un nombre',
    generer() {
      if (Math.random() < 0.5) { const n = choix([2, 3, 4, 5, 8, 10, -2, -4, 7]); return { enonce: `Quel est l'inverse de $${nb(n)}$ ?`, reponse: frac(1, n) } }
      let a: number, b: number
      do { a = ent(1, 9); b = ent(2, 9) } while (a === b || pgcd(a, b) !== 1)
      return { enonce: `Quel est l'inverse de $${frac(a, b)}$ ?`, reponse: frac(b, a) }
    },
  },
  {
    id: '4e-produit-fractions', theme: 'Hors liste officielle', titre: 'Multiplier des fractions',
    generer() {
      let a: number, b: number, c: number, d: number
      do { a = ent(1, 7); b = ent(2, 9); c = ent(1, 7); d = ent(2, 9) } while (a === b || c === d)
      return { enonce: `Calculer et simplifier si possible : $${frac(a, b)} \\times ${frac(c, d)}$`, reponse: irreductible(a * c, b * d) }
    },
  },
  {
    id: '4e-developper', theme: 'Hors liste officielle', titre: 'Développer et factoriser k(x + a)',
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
    id: '4e-pythagore', theme: 'Hors liste officielle', titre: 'Le théorème de Pythagore',
    generer() {
      const [p, q, r] = choix([[3, 4, 5], [6, 8, 10], [5, 12, 13], [8, 15, 17], [9, 12, 15], [12, 16, 20]])
      const [A, B, C] = [...choix(['ABC', 'EFG', 'IJK', 'MNP', 'RST'])]
      if (Math.random() < 0.5) return { enonce: `$${A}${B}${C}$ est rectangle en $${A}$, $${A}${B} = ${p}$ cm et $${A}${C} = ${q}$ cm. Combien mesure $${B}${C}$ ?`, reponse: `${r}\\text{ cm}` }
      return { enonce: `$${A}${B}${C}$ est rectangle en $${A}$, $${B}${C} = ${r}$ cm et $${A}${B} = ${p}$ cm. Combien mesure $${A}${C}$ ?`, reponse: `${q}\\text{ cm}` }
    },
  },
  {
    id: '4e-mediane-etendue', theme: 'Hors liste officielle', titre: 'Médiane et étendue',
    generer() {
      const n = choix([5, 7]), l = Array.from({ length: n }, () => ent(2, 20))
      const tri = [...l].sort((a, b) => a - b)
      return Math.random() < 0.5 ? { enonce: `Quelle est la médiane de la série : $${l.join(' \\; ; \\; ')}$ ?`, reponse: nb(tri[(n - 1) / 2]) }
        : { enonce: `Quelle est l'étendue de la série : $${l.join(' \\; ; \\; ')}$ ?`, reponse: nb(tri[n - 1] - tri[0]) }
    },
  },
  {
    id: '4e-programme-calcul', theme: 'Hors liste officielle', titre: 'Un programme de calcul',
    generer() {
      const a = ent(2, 6), b = relNonNul(1, 9), n = ent(-5, 9)
      const [op1, f] = choix<[string, (x: number) => number]>([[`multiplier par $${a}$`, x => a * x], [`ajouter $${a}$`, x => x + a], [`prendre son carré`, x => x * x]])
      return { enonce: `Programme : choisir un nombre ; ${op1} ; puis ${b < 0 ? `soustraire $${-b}$` : `ajouter $${b}$`}. Quel résultat obtient-on avec $${n}$ ?`, reponse: nb(f(n) + b) }
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
  ]),
  ...n4('Hors liste officielle', [
    ['L\'évènement contraire',
      () => { const p = ent(1, 9) / 10; return [`La probabilité d'un évènement est $${nb(p)}$. Quelle est celle de l'évènement contraire ?`, `$1 - ${nb(p)} = ${nb(1 - p)}$`] }],
    ['Remonter un programme de calcul',
      () => { const a = ent(2, 9), b = ent(1, 9), r = a * ent(2, 9) + b; return [`Programme : multiplier par $${a}$, puis ajouter $${b}$. On obtient $${r}$. Comment retrouve-t-on le nombre de départ ?`, `on soustrait $${b}$, puis on divise par $${a}$ : $${(r - b) / a}$`] }],
    ['Un facteur nul',
      () => { const n = ent(3, 8); return [`Un produit de $${n}$ facteurs relatifs contient un facteur égal à $0$. Que vaut ce produit ?`, '$0$'] }],
  ]),
]

// =============================================================
// LES AUTOMATISMES DE 2nde ET DE 1re
// Rangés comme la liste officielle des automatismes de l'épreuve
// anticipée de mathématiques (session 2027) : ceux « relevant du
// programme de seconde » (en italique dans la liste) sont en 2nde, les
// autres en 1re. Pour réviser toute l'épreuve, on coche les deux niveaux.
// Mêmes règles qu'au collège : réponse courte, jamais une chance sur
// deux, rien de fixe.
// =============================================================
const T_CALCUL = 'Calcul numérique et algébrique'
const T_PROPORTIONS = 'Proportions et pourcentages'
const T_EVOLUTIONS = 'Évolutions et variations'
const T_FONCTIONS = 'Fonctions et représentations'
const T_STATS = 'Statistiques'
const T_PROBAS = 'Probabilités'

// ---------- Outils du lycée ----------
/** Un polynôme, ses coefficients du plus haut degré au plus bas :
 *  [2, −3, 1] donne 2x^2 - 3x + 1 (sans « 1x », sans « + 0 ») */
function polynome(coefs: number[], v = 'x'): string {
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
const facteur = (a: number, b: number, v = 'x') => `(${polynome([a, b], v)})`
/** Un intervalle : [a ; b], ]−∞ ; b[… (fa, fb : crochets fermés) */
const intervalle = (a: string, b: string, fa: boolean, fb: boolean) => `${fa ? '[' : ']'}${a}\\,;\\,${b}${fb ? ']' : '['}`
/** Un ensemble de solutions : S = {−2 ; 3}, ou l'ensemble vide */
const ensemble = (vals: string[]) => vals.length ? `S = \\{${vals.join('\\,;\\,')}\\}` : 'S = \\varnothing'
const pct = (x: number) => `${nb(x)}\\,\\%`
const fracDec = (n: number, d: number) => irreductible(n, d)
/** Un nombre au hasard dans une liste, différent de ceux donnés */
const autreQue = <T,>(t: T[], ...pas: T[]) => choix(t.filter(x => !pas.includes(x)))
const PRENOMS = ['Léa', 'Tom', 'Inès', 'Hugo', 'Jade', 'Noah', 'Lina', 'Sami', 'Chloé', 'Yanis']
const etL = (t: string[]) => t.length < 2 ? t.join('') : `${t.slice(0, -1).join(', ')} et ${t[t.length - 1]}`

// ---------- Les courbes au hasard (lecture graphique) ----------
type Noeud = { x: number; y: number }
/** Des nœuds aux abscisses entières qui se suivent, d'ordonnées entières
 *  entre −4 et 4, jamais deux égales de suite : la courbe tracée par
 *  F.courbeFonction monte ou descend d'un nœud au suivant, sans bosse
 *  cachée. Elle change de sens une à trois fois. */
function noeudsAuHasard(): Noeud[] {
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
const lisibleEn = (p: Noeud[], k: number) => p.every((q, i) => i === 0 || !(Math.min(q.y, p[i - 1].y) < k && k < Math.max(q.y, p[i - 1].y)))
/** L'ensemble des x de la courbe où vrai(f(x)) : une suite de nœuds et
 *  de morceaux entre deux nœuds (dont on connaît le signe par rapport à
 *  k, puisque k n'est jamais enjambé), réunis en intervalles */
function ensembleLu(p: Noeud[], vrai: (y: number) => boolean): string {
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
function sensDeVariation(p: Noeud[], monte: boolean): string[] {
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
const NOMS_FONCTIONS = ['f', 'g', 'h']

// ---------- Contextes ----------
const POPULATIONS: [string, string, number[]][] = [
  ['un lycée', 'élèves', [400, 500, 600, 800, 1000, 1200]],
  ['un club de sport', 'adhérents', [120, 160, 200, 240, 300]],
  ['un village', 'habitants', [600, 800, 1500, 2000, 2400]],
  ['une entreprise', 'salariés', [80, 120, 150, 250, 400]],
]
/** Une population et un pourcentage dont la partie est un nombre entier de personnes */
function populationEtPart(pourcents: number[]): { lieu: string; gens: string; N: number; p: number; n: number } {
  for (;;) {
    const [lieu, gens, tailles] = choix(POPULATIONS), N = choix(tailles), p = choix(pourcents)
    if (N * p % 100 === 0) return { lieu, gens, N, p, n: N * p / 100 }
  }
}
const CARACTERES = ['sont externes', 'portent des lunettes', 'viennent à vélo', 'pratiquent la natation', 'ont plus de 40 ans', 'jouent d\'un instrument']

export const AUTOMATISMES_2NDE: Automatisme[] = [
  // ================= CALCUL NUMÉRIQUE ET ALGÉBRIQUE =================
  {
    id: '2nde-comparer-difference', theme: T_CALCUL, titre: 'Comparer deux nombres par leur différence',
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
    generer() {
      for (;;) {
        const p = Array.from({ length: 6 }, () => ent(5, 30) / 100), s = p.slice(0, 5).reduce((a, b) => a + b, 0)
        p[5] = arrondi(1 - s)
        if (p[5] < 0.05) continue
        const t = tableau(['\\text{Issue}', '1', '2', '3', '4', '5', '6'], ['\\text{Probabilité}', ...p.map(nb)])
        return choix<() => Question>([
          () => ({ enonce: `Un dé est truqué : $${t}$. Quelle est la probabilité d'obtenir un nombre pair ?`, reponse: nb(arrondi(p[1] + p[3] + p[5])) }),
          () => { const k = ent(3, 5); return { enonce: `Un dé est truqué : $${t}$. Quelle est la probabilité d'obtenir au moins $${k}$ ?`, reponse: nb(arrondi(p.slice(k - 1).reduce((a, b) => a + b, 0))) } },
          () => ({ enonce: `Un dé est truqué : $${tableau(['\\text{Issue}', '1', '2', '3', '4', '5', '6'], ['\\text{Probabilité}', ...p.slice(0, 5).map(nb), '\\ldots'])}$. Quelle est la probabilité d'obtenir $6$ ?`, reponse: nb(p[5]) }),
        ])()
      }
    },
  },
  {
    id: '2nde-equiprobabilite', theme: T_PROBAS, titre: 'Équiprobabilité : favorables sur possibles',
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
    generer() {
      const t = choix([-50, -40, -25, -20, -10, -5, 5, 10, 15, 20, 25, 30, 50, 75, 100, 150]), V0 = 20 * ent(1, 25), V1 = arrondi(V0 * (1 + t / 100))
      const quoi = choix(['Un prix passe', 'Le nombre d\'abonnés passe', 'Une production passe'])
      return { enonce: `${quoi} de $${grandNb(V0)}$ à $${grandNb(V1)}$. Quel est le taux d'évolution, en pourcentage ?`, reponse: t > 0 ? `+${pct(t)}` : `-${pct(-t)}` }
    },
  },
  {
    id: '1re-taux-successifs', theme: T_EVOLUTIONS, titre: 'Évolutions successives',
    generer() {
      const t1 = choix([-50, -20, -10, 10, 20, 25, 50, 100]), t2 = choix([-50, -20, -10, 10, 20, 30, 50])
      const g = arrondi(((1 + t1 / 100) * (1 + t2 / 100) - 1) * 100)
      const dire = (t: number) => t > 0 ? `une hausse de $${pct(t)}$` : `une baisse de $${pct(-t)}$`
      return { enonce: `${choix(['Un prix', 'Une action', 'Un loyer'])} connaît ${dire(t1)}, puis ${dire(t2)}. Quelle est l'évolution globale, en pourcentage ?`, reponse: g === 0 ? mot('aucune : $0\\,\\%$') : mot(dire(g)) }
    },
  },
  {
    id: '1re-taux-reciproque', theme: T_EVOLUTIONS, titre: 'Taux d’évolution réciproque',
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
    generer() {
      const [[A, nA], [Ab, nAb], [B, nB], [Bb, nBb]] = choix<[string, string][]>([
        [['F', 'Filles'], ['G', 'Garçons'], ['I', 'Internes'], ['E', 'Externes']],
        [['V', 'Vaccinés'], ['N', 'Non vaccinés'], ['M', 'Malades'], ['S', 'Sains']],
        [['L', 'Lycéens'], ['C', 'Collégiens'], ['T', 'Téléphone'], ['P', 'Pas de téléphone']],
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
const n2 = (theme: string, liste: [string, ...Facon[]][]) => notions(theme, liste, '2nde-')
const n1 = (theme: string, liste: [string, ...Facon[]][]) => notions(theme, liste, '1re-')
const DEUX_NOMS = [['A', 'B'], ['a', 'b'], ['x', 'y'], ['u', 'v'], ['X', 'Y']]
const EVENEMENTS = [['A', 'B'], ['E', 'F'], ['M', 'T'], ['R', 'S'], ['C', 'D'], ['G', 'H']]
const nomF = () => choix(['f', 'g', 'h', 'u'])

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
  { id: '2nde', nom: '2nde', automatismes: AUTOMATISMES_2NDE, cours: COURS_2NDE },
  { id: '1re', nom: '1re', automatismes: AUTOMATISMES_1RE, cours: COURS_1RE },
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
