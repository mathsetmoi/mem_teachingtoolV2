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
// question, une phrase à compléter…), tirées au hasard, et beaucoup
// prennent des nombres au hasard. La réponse attendue est courte ; la
// correction l'écrit telle quelle. Aucune ne se réussit avec une
// chance sur deux. Les utiliser sur un exemple, c'est un exercice
// d'application.
// =============================================================
export interface QuestionCours { id: string; theme: string; titre: string; poser: () => Question }
/** Une façon de poser la notion : son énoncé et la réponse attendue (en mots, avec $…$) */
type Facon = () => [string, string]
const fixe = (enonce: string, reponse: string): Facon => () => [enonce, reponse]
const notions = (theme: string, liste: [string, ...Facon[]][]): QuestionCours[] =>
  liste.map(([titre, ...facons], i) => ({
    id: `cours-${theme}-${i + 1}`, theme, titre,
    poser: () => { const [enonce, reponse] = choix(facons)(); return { enonce, reponse: mot(reponse) } },
  }))
const CHIFFRES_PAIRS = '$0$, $2$, $4$, $6$ ou $8$'

export const COURS_5E: QuestionCours[] = [
  ...notions('Opérations', [
    ['Divisibilité par 2',
      fixe('Un nombre entier est divisible par $2$ quand…', `son chiffre des unités est ${CHIFFRES_PAIRS}`),
      fixe('Quel est le critère de divisibilité par $2$ ?', `son chiffre des unités est ${CHIFFRES_PAIRS}`),
      fixe('Compléter : un nombre entier est divisible par $2$ si son chiffre des unités est…', CHIFFRES_PAIRS)],
    ['Divisibilité par 5',
      fixe('Un nombre entier est divisible par $5$ quand…', 'son chiffre des unités est $0$ ou $5$'),
      fixe('Quel est le critère de divisibilité par $5$ ?', 'son chiffre des unités est $0$ ou $5$'),
      fixe('Compléter : un nombre entier est divisible par $5$ si son chiffre des unités est…', '$0$ ou $5$')],
    ['Divisibilité par 10',
      fixe('Un nombre entier est divisible par $10$ quand…', 'son chiffre des unités est $0$'),
      fixe('Quel est le critère de divisibilité par $10$ ?', 'son chiffre des unités est $0$')],
    ['Divisibilité par 3 et par 9', () => {
      const k = choix([3, 9])
      return choix<[string, string]>([[`Un nombre entier est divisible par $${k}$ quand…`, `la somme de ses chiffres est divisible par $${k}$`],
        [`Quel est le critère de divisibilité par $${k}$ ?`, `la somme de ses chiffres est divisible par $${k}$`]])
    }],
    ['Le vocabulaire de la division euclidienne', () => {
      const b = ent(3, 9), q = ent(4, 15), r = ent(1, b - 1), a = b * q + r
      const [x, nom] = choix<[number, string]>([[a, 'le dividende'], [b, 'le diviseur'], [q, 'le quotient'], [r, 'le reste']])
      return [`Dans la division euclidienne de $${a}$ par $${b}$, on a $${a} = ${b} \\times ${q} + ${r}$. Comment s'appelle le nombre $${x}$ ?`, nom]
    }],
    ['Le reste d\'une division euclidienne',
      fixe('Dans la division euclidienne de $a$ par $b$, le reste est toujours…', 'plus petit que $b$'),
      () => { const b = ent(3, 12); return [`Dans une division euclidienne par $${b}$, quel est le plus grand reste possible ?`, `$${b - 1}$`] }],
    ['Multiple et diviseur', () => {
      const a = ent(2, 9), b = ent(2, 9), n = a * b
      return choix<[string, string]>([[`On a $${n} = ${a} \\times ${b}$. Compléter : $${n}$ est un … de $${a}$.`, 'multiple'],
        [`On a $${n} = ${a} \\times ${b}$. Compléter : $${a}$ est un … de $${n}$.`, 'diviseur']])
    }],
    ['Multiplier par 0,1 ; 0,5 ; 0,01', () => {
      const [k, r] = choix<[string, string]>([['0{,}1', 'diviser par $10$'], ['0{,}01', 'diviser par $100$'], ['0{,}5', 'diviser par $2$ (prendre la moitié)'], ['0{,}25', 'diviser par $4$ (prendre le quart)']])
      return [`Multiplier un nombre par $${k}$ revient à…`, r]
    }],
    ['Diviser par 10, 100, 1 000', () => {
      const [k, n] = choix<[string, string]>([['10', 'un rang'], ['100', 'deux rangs'], ['1\\,000', 'trois rangs']])
      return [`Quand on divise un nombre par $${k}$, de combien de rangs chaque chiffre se décale-t-il, et dans quel sens ?`, `de ${n} vers la droite`]
    }],
  ]),
  ...notions('Nombres relatifs', [
    ['Deux nombres opposés',
      fixe('Quelle est la somme de deux nombres opposés ?', '$0$'),
      fixe('Comment appelle-t-on deux nombres dont la somme est égale à $0$ ?', 'des nombres opposés'),
      () => { const a = ent(2, 15); return [`Quel est l'opposé de $-${a}$ ?`, `$${a}$`] }],
    ['Soustraire un relatif',
      fixe('Soustraire un nombre revient à…', 'ajouter son opposé'),
      () => { const a = ent(2, 12); return choix<[string, string]>([[`Soustraire $(-${a})$ revient à…`, `ajouter $${a}$`], [`Soustraire $${a}$ revient à…`, `ajouter $-${a}$`]]) }],
    ['La règle des signes d\'un produit',
      fixe('Quelle est la règle des signes pour le produit de deux nombres relatifs ?', 'même signe : positif ; signes contraires : négatif'),
      () => { const n = choix([3, 4, 5]); return [`Comment trouve-t-on le signe d'un produit de ${n} nombres relatifs ?`, 'on compte les facteurs négatifs : en nombre pair, positif ; en nombre impair, négatif'] }],
    ['La distance à zéro',
      () => { const a = ent(2, 99) / choix([1, 10]); return [`Quelle est la distance à zéro de $${nb(-a)}$ ?`, `$${nb(a)}$`] },
      fixe('Un nombre relatif est formé d\'un signe et…', 'd\'une distance à zéro')],
    ['Comparer deux nombres négatifs',
      fixe('Comment compare-t-on deux nombres négatifs ?', 'le plus petit est celui qui a la plus grande distance à zéro'),
      fixe('Compléter : de deux nombres négatifs, le plus petit est celui qui a…', 'la plus grande distance à zéro')],
    ['Additionner deux relatifs de signes contraires',
      fixe('Comment additionne-t-on deux nombres de signes contraires ?', 'on soustrait les distances à zéro ; le signe est celui du nombre le plus loin de zéro'),
      fixe('Comment additionne-t-on deux nombres de même signe ?', 'on ajoute les distances à zéro et on garde le signe')],
  ]),
  ...notions('Nombres rationnels', [
    ['Le quotient', () => {
      let a: number, b: number
      do { a = ent(1, 9); b = ent(2, 11) } while (a === b)
      return choix<[string, string]>([[`Le quotient de $${a}$ par $${b}$ est le nombre qui, multiplié par $${b}$, donne…`, `$${a}$`],
        [`Comment s'écrit le quotient de $${a}$ par $${b}$ sous forme de fraction ?`, `$${frac(a, b)}$`],
        [`Quel nombre, multiplié par $${b}$, donne $${a}$ ? (réponse en fraction)`, `$${frac(a, b)}$`]])
    }],
    ['Les fractions égales',
      fixe('On obtient une fraction égale en multipliant le numérateur et le dénominateur…', 'par un même nombre non nul'),
      () => { const n = ent(1, 6), d = n + ent(1, 6); return [`Pour obtenir une fraction égale à $${frac(n, d)}$, que peut-on faire à son numérateur et à son dénominateur ?`, 'les multiplier (ou les diviser) par un même nombre non nul'] }],
    ['Simplifier une fraction',
      fixe('Simplifier une fraction, c\'est…', 'diviser son numérateur et son dénominateur par un même nombre'),
      fixe('Quand dit-on qu\'une fraction est irréductible ?', 'quand on ne peut plus la simplifier')],
    ['Additionner des fractions',
      fixe('Pour additionner deux fractions de même dénominateur…', 'on additionne les numérateurs et on garde le dénominateur'),
      fixe('Pour additionner deux fractions de dénominateurs différents, que faut-il faire d\'abord ?', 'les écrire avec le même dénominateur')],
    ['Ce que signifie un pourcentage', () => {
      const p = choix([5, 12, 25, 30, 40, 75, 85])
      return [`Que signifie « $${p}\\,\\%$ » ?`, `$${p}$ sur $100$ (soit $${frac(p, 100)}$)`]
    }],
    ['Les pourcentages simples', () => {
      const [p, r] = choix<[string, string]>([['10', 'diviser par $10$'], ['50', 'prendre la moitié'], ['25', 'prendre le quart'], ['1', 'diviser par $100$'], ['100', 'prendre le tout']])
      return [`Prendre $${p}\\,\\%$ d'un nombre revient à…`, r]
    }],
    ['Prendre une fraction d\'un nombre', () => {
      const d = ent(2, 8), n = ent(1, d - 1), N = d * ent(2, 9)
      return [`Prendre $${frac(n, d)}$ de $${N}$, c'est calculer…`, `$${frac(n, d)} \\times ${N}$ (ou $${N} \\div ${d} \\times ${n}$)`]
    }],
    ['Les écritures décimales à connaître', () => {
      const [n, d, v] = choix<[number, number, string]>([[1, 2, '0{,}5'], [1, 4, '0{,}25'], [3, 4, '0{,}75'], [1, 5, '0{,}2'], [1, 10, '0{,}1'], [1, 100, '0{,}01'], [3, 2, '1{,}5']])
      return choix<[string, string]>([[`Quelle est l'écriture décimale de $${frac(n, d)}$ ?`, `$${v}$`], [`Quelle fraction est égale à $${v}$ ?`, `$${frac(n, d)}$`]])
    }],
    ['Numérateur et dénominateur',
      () => { const d = ent(3, 12), n = ent(1, d - 1); return [`On mange $${frac(n, d)}$ d'une tarte. Que représente le nombre $${d}$ ?`, `le nombre de parts égales de la tarte`] }],
  ]),
  ...notions('Puissances et calcul littéral', [
    ['Le carré d\'un nombre', () => { const n = ent(2, 12); return choix<[string, string]>([[`Que signifie $${n}^2$ ?`, `$${n} \\times ${n}$`], [`Comment écrit-on $${n} \\times ${n}$ plus simplement ?`, `$${n}^2$`]]) }],
    ['Le cube d\'un nombre', () => { const n = ent(2, 9); return choix<[string, string]>([[`Que signifie $${n}^3$ ?`, `$${n} \\times ${n} \\times ${n}$`], [`Comment écrit-on $${n} \\times ${n} \\times ${n}$ plus simplement ?`, `$${n}^3$`]]) }],
    ['Le signe × sous-entendu', () => {
      const k = ent(2, 9), x = choix(['x', 'a', 'y', 'n'])
      return choix<[string, string]>([[`Dans l'expression $${k}${x}$, quelle opération est sous-entendue ?`, `une multiplication ($${k} \\times ${x}$)`],
        [`Comment écrit-on $${k} \\times ${x}$ plus simplement ?`, `$${k}${x}$`],
        [`Comment écrit-on $${x} \\times ${x}$ plus simplement ?`, `$${x}^2$`]])
    }],
    ['Calculer une expression pour une valeur', () => {
      const k = ent(2, 9), v = ent(2, 9)
      return [`Que faut-il faire pour calculer $${k}x + 1$ pour $x = ${v}$ ?`, `remplacer $x$ par $${v}$, soit $${k} \\times ${v} + 1$`]
    }],
    ['Réduire une expression',
      fixe('Que veut dire « réduire une expression » ?', 'l\'écrire avec le moins de termes possible'),
      () => { const a = ent(2, 9), b = ent(2, 9); return [`Pourquoi ne peut-on pas réduire $${a}x + ${b}$ ?`, `$${a}x$ et $${b}$ ne sont pas de la même sorte (l'un a un $x$, l'autre non)`] }],
    ['Les priorités opératoires',
      fixe('Dans un calcul sans parenthèses, que fait-on en premier ?', 'les multiplications et les divisions'),
      fixe('Dans un calcul avec des parenthèses, que fait-on en premier ?', 'les calculs entre parenthèses'),
      fixe('Dans un calcul avec seulement des additions et des soustractions, dans quel ordre calcule-t-on ?', 'de gauche à droite')],
  ]),
  ...notions('Repérage', [
    ['L\'ordre des coordonnées', () => {
      const x = ent(-6, 6), y = ent(-6, 6)
      return choix<[string, string]>([['Dans les coordonnées d\'un point, quel nombre écrit-on en premier ?', 'l\'abscisse (puis l\'ordonnée)'],
        [`Le point $A$ a pour abscisse $${x}$ et pour ordonnée $${y}$. Comment écrit-on ses coordonnées ?`, `$A(${x}\\,;\\,${y})$`]])
    }],
    ['L\'origine du repère',
      fixe('Comment s\'appelle le point de coordonnées $(0\\,;\\,0)$ ?', 'l\'origine du repère'),
      fixe('Quelles sont les coordonnées de l\'origine d\'un repère ?', '$(0\\,;\\,0)$')],
    ['Les axes du repère',
      fixe('Comment s\'appellent les deux axes d\'un repère ?', 'l\'axe des abscisses et l\'axe des ordonnées'),
      fixe('Quelle est l\'ordonnée d\'un point situé sur l\'axe des abscisses ?', '$0$'),
      fixe('Quelle est l\'abscisse d\'un point situé sur l\'axe des ordonnées ?', '$0$')],
    ['L\'abscisse sur une droite graduée',
      fixe('Sur une droite graduée, comment s\'appelle le nombre qui repère un point ?', 'son abscisse'),
      fixe('Sur une droite graduée, quelle est l\'abscisse de l\'origine ?', '$0$')],
  ]),
  ...notions('Représentation de l’espace', [
    ['Le cube', () => {
      const [quoi, v] = choix<[string, string]>([['de faces', '$6$'], ['d\'arêtes', '$12$'], ['de sommets', '$8$']])
      return choix<[string, string]>([[`Combien un cube a-t-il ${quoi} ?`, v], ['Combien un cube a-t-il de faces, d\'arêtes et de sommets ?', '$6$ faces, $12$ arêtes, $8$ sommets']])
    }],
    ['Le pavé droit',
      () => { const [quoi, v] = choix<[string, string]>([['de faces', '$6$'], ['d\'arêtes', '$12$'], ['de sommets', '$8$']]); return [`Combien un pavé droit a-t-il ${quoi} ?`, v] },
      fixe('Quelle est la forme des faces d\'un pavé droit ?', 'des rectangles')],
    ['Les arêtes cachées',
      fixe('En perspective cavalière, comment dessine-t-on les arêtes cachées ?', 'en pointillés'),
      fixe('Compléter : en perspective cavalière, les arêtes cachées sont dessinées…', 'en pointillés')],
    ['La face avant',
      fixe('En perspective cavalière, comment la face avant est-elle dessinée ?', 'en vraie grandeur'),
      fixe('En perspective cavalière, quelles faces sont dessinées en vraie grandeur ?', 'la face avant et la face arrière')],
    ['Les arêtes parallèles',
      fixe('En perspective cavalière, comment sont dessinées des arêtes parallèles dans la réalité ?', 'parallèles'),
      fixe('En perspective cavalière, comment appelle-t-on les arêtes dessinées en biais, plus courtes ?', 'les fuyantes')],
    ['Le patron',
      fixe('Combien de carrés compte un patron de cube ?', '$6$'),
      fixe('Qu\'est-ce que le patron d\'un solide ?', 'une figure plane qu\'on plie pour fabriquer le solide')],
  ]),
  ...notions('Transformations', [
    ['Ce que conserve la symétrie',
      fixe('Que conserve la symétrie axiale ?', 'les longueurs, les angles et les aires'),
      () => { const l = ent(2, 12); return [`Un segment mesure $${l}$ cm. Combien mesure son symétrique par rapport à une droite ?`, `$${l}$ cm`] },
      () => { const a = ent(20, 160); return [`Un angle mesure $${a}°$. Combien mesure son symétrique par rapport à une droite ?`, `$${a}°$`] }],
    ['Les points de l\'axe',
      fixe('Quel est le symétrique d\'un point de l\'axe ?', 'le point lui-même'),
      fixe('Quels points sont leur propre symétrique ?', 'les points de l\'axe de symétrie')],
    ['L\'axe et la médiatrice',
      fixe('$M\'$ est le symétrique de $M$ par rapport à la droite $(d)$. Que représente $(d)$ pour le segment $[MM\']$ ?', 'sa médiatrice')],
    ['Les images des figures',
      fixe('Quel est le symétrique d\'une droite par une symétrie axiale ?', 'une droite'),
      () => { const r = ent(2, 9); return [`Quel est le symétrique d'un cercle de rayon $${r}$ cm ?`, `un cercle de rayon $${r}$ cm`] }],
    ['Les axes de symétrie', () => {
      const [f, n] = choix<[string, string]>([['un carré', '$4$'], ['un rectangle (pas carré)', '$2$'], ['un losange (pas carré)', '$2$'], ['un triangle équilatéral', '$3$'], ['un cercle', 'une infinité'], ['un triangle isocèle (pas équilatéral)', '$1$']])
      return [`Combien d'axes de symétrie a ${f} ?`, n]
    }],
  ]),
  ...notions('Angles', [
    ['Les sortes d\'angles', () => {
      const [m, nom] = choix<[string, string]>([['90°', 'un angle droit'], ['180°', 'un angle plat'], ['0°', 'un angle nul'], ['360°', 'un angle plein']])
      return [`Comment appelle-t-on un angle de $${m}$ ?`, nom]
    }],
    ['Angle aigu, angle obtus', () => {
      const [nom, r] = choix<[string, string]>([['aigu', 'entre $0°$ et $90°$'], ['obtus', 'entre $90°$ et $180°$']])
      return [`Entre quelles mesures un angle ${nom} est-il compris ?`, r]
    }],
    ['Les angles opposés par le sommet',
      fixe('Que peut-on dire de deux angles opposés par le sommet ?', 'ils ont la même mesure'),
      () => { const a = ent(20, 160); return [`Deux angles sont opposés par le sommet. L'un mesure $${a}°$. Combien mesure l'autre ?`, `$${a}°$`] }],
    ['Les angles complémentaires',
      fixe('Deux angles sont complémentaires quand…', 'la somme de leurs mesures vaut $90°$'),
      fixe('Comment appelle-t-on deux angles dont la somme vaut $90°$ ?', 'des angles complémentaires')],
    ['Les angles supplémentaires',
      fixe('Deux angles sont supplémentaires quand…', 'la somme de leurs mesures vaut $180°$'),
      fixe('Comment appelle-t-on deux angles dont la somme vaut $180°$ ?', 'des angles supplémentaires')],
    ['Les angles adjacents',
      fixe('Deux angles sont adjacents quand…', 'ils ont le même sommet, un côté commun, et sont de part et d\'autre de ce côté')],
    ['La bissectrice',
      fixe('La bissectrice d\'un angle est la demi-droite qui…', 'le partage en deux angles de même mesure'),
      fixe('Comment s\'appelle la demi-droite qui partage un angle en deux angles de même mesure ?', 'la bissectrice')],
  ]),
  ...notions('Triangles', [
    ['La somme des angles',
      fixe('Combien vaut la somme des angles d\'un triangle ?', '$180°$'),
      fixe('Compléter : dans un triangle, la somme des mesures des trois angles vaut…', '$180°$')],
    ['Le triangle équilatéral',
      fixe('Combien mesure chaque angle d\'un triangle équilatéral ?', '$60°$'),
      fixe('Qu\'est-ce qu\'un triangle équilatéral ?', 'un triangle qui a ses trois côtés de même longueur')],
    ['Le triangle isocèle',
      fixe('Que peut-on dire des angles à la base d\'un triangle isocèle ?', 'ils ont la même mesure'),
      () => { const [A, B, C] = choix(['ABC', 'EFG', 'RST']); return [`$${A}${B}${C}$ est isocèle en $${A}$. Quels côtés ont la même longueur ?`, `$[${A}${B}]$ et $[${A}${C}]$`] }],
    ['Le triangle rectangle',
      fixe('Dans un triangle rectangle, combien vaut la somme des deux angles aigus ?', '$90°$'),
      fixe('Combien mesurent les angles aigus d\'un triangle rectangle isocèle ?', '$45°$ chacun')],
    ['La médiatrice',
      fixe('La médiatrice d\'un segment est la droite…', 'perpendiculaire au segment en son milieu'),
      fixe('Comment s\'appelle la droite perpendiculaire à un segment en son milieu ?', 'la médiatrice du segment')],
    ['La propriété de la médiatrice',
      () => { const [P, Q] = choix(['AB', 'EF', 'IJ', 'RS']); return [`Que peut-on dire d'un point de la médiatrice de $[${P}${Q}]$ ?`, `il est à égale distance de $${P}$ et de $${Q}$`] },
      fixe('Un point à égale distance de $A$ et de $B$ est forcément sur…', 'la médiatrice de $[AB]$')],
    ['Le cercle circonscrit',
      fixe('Le centre du cercle circonscrit à un triangle est le point de concours de ses…', 'médiatrices'),
      fixe('Comment s\'appelle le cercle qui passe par les trois sommets d\'un triangle ?', 'le cercle circonscrit au triangle')],
    ['L\'inégalité triangulaire',
      fixe('Énoncer l\'inégalité triangulaire.', 'dans un triangle, chaque côté est plus petit que la somme des deux autres'),
      () => { const a = ent(3, 8), b = ent(3, 8); return [`Deux côtés d'un triangle mesurent $${a}$ cm et $${b}$ cm. Le troisième doit être plus petit que…`, `$${a + b}$ cm`] }],
  ]),
  ...notions('Parallélogrammes et polygones', [
    ['Les diagonales du parallélogramme',
      fixe('Que peut-on dire des diagonales d\'un parallélogramme ?', 'elles se coupent en leur milieu'),
      fixe('Un quadrilatère dont les diagonales se coupent en leur milieu est un…', 'parallélogramme')],
    ['Les côtés du parallélogramme',
      fixe('Que peut-on dire des côtés opposés d\'un parallélogramme ?', 'ils sont parallèles et de même longueur'),
      () => { const a = ent(3, 12); return [`$ABCD$ est un parallélogramme et $AB = ${a}$ cm. Combien mesure $CD$ ?`, `$${a}$ cm`] }],
    ['Les angles du parallélogramme',
      fixe('Que peut-on dire des angles opposés d\'un parallélogramme ?', 'ils ont la même mesure'),
      fixe('Que peut-on dire de deux angles consécutifs d\'un parallélogramme ?', 'leur somme vaut $180°$')],
    ['Le rectangle',
      fixe('Un parallélogramme qui a un angle droit est un…', 'rectangle'),
      fixe('Que peut-on dire des diagonales d\'un rectangle ?', 'elles se coupent en leur milieu et ont la même longueur')],
    ['Le losange',
      fixe('Un parallélogramme qui a deux côtés consécutifs de même longueur est un…', 'losange'),
      fixe('Que peut-on dire des diagonales d\'un losange ?', 'elles se coupent en leur milieu et sont perpendiculaires')],
    ['Le carré',
      fixe('Un parallélogramme qui a un angle droit et deux côtés consécutifs de même longueur est un…', 'carré'),
      fixe('Un carré est à la fois…', 'un rectangle et un losange')],
    ['Le nom des polygones', () => {
      const [n, nom] = choix<[number, string]>([[5, 'un pentagone'], [6, 'un hexagone'], [8, 'un octogone'], [3, 'un triangle'], [4, 'un quadrilatère']])
      return choix<[string, string]>([[`Comment appelle-t-on un polygone à $${n}$ côtés ?`, nom], [`Combien de côtés a ${nom} ?`, `$${n}$`]])
    }],
  ]),
  ...notions('Probabilités', [
    ['Les valeurs d\'une probabilité',
      fixe('Une probabilité est un nombre compris entre…', '$0$ et $1$'),
      fixe('Entre quelles valeurs une probabilité est-elle toujours comprise ?', '$0$ et $1$')],
    ['Impossible et certain', () => {
      const [ev, p] = choix<[string, string]>([['impossible', '$0$'], ['certain', '$1$']])
      return choix<[string, string]>([[`Quelle est la probabilité d'un évènement ${ev} ?`, p], [`Comment appelle-t-on un évènement de probabilité ${p} ?`, `un évènement ${ev}`]])
    }],
    ['Une chance sur deux',
      fixe('Quelle est la probabilité d\'un évènement qui a une chance sur deux de se produire ?', '$\\frac{1}{2}$ (ou $0{,}5$)')],
    ['Les issues équiprobables',
      fixe('Quand toutes les issues ont la même chance, comment calcule-t-on la probabilité d\'un évènement ?', 'nombre d\'issues favorables ÷ nombre total d\'issues'),
      () => { const n = choix([6, 8, 10, 12, 20]); return [`Un dé équilibré a $${n}$ faces. Quelle est la probabilité d'obtenir une face donnée ?`, `$${frac(1, n)}$`] }],
  ]),
  ...notions('Proportionnalité', [
    ['Le coefficient de proportionnalité',
      fixe('Dans un tableau de proportionnalité, on passe d\'une ligne à l\'autre en…', 'multipliant par un même nombre'),
      fixe('Comment s\'appelle le nombre par lequel on multiplie une ligne d\'un tableau de proportionnalité pour obtenir l\'autre ?', 'le coefficient de proportionnalité')],
    ['Le graphique',
      fixe('Comment est la représentation graphique d\'une situation de proportionnalité ?', 'des points alignés avec l\'origine du repère')],
    ['Le retour à l\'unité',
      fixe('Qu\'est-ce que le « retour à l\'unité » ?', 'chercher la valeur pour $1$, puis multiplier'),
      () => { const n = ent(3, 9); return [`On connaît le prix de $${n}$ cahiers. Que calcule-t-on d'abord pour faire un « retour à l'unité » ?`, 'le prix d\'un seul cahier'] }],
    ['La linéarité', () => {
      const a = ent(2, 6), k = ent(2, 4)
      return [`Dans une situation de proportionnalité, si on connaît le prix de $${a}$ objets, comment obtient-on le prix de $${a * k}$ objets ?`, `on multiplie par $${k}$`]
    }],
    ['Appliquer un pourcentage', () => {
      const p = choix([5, 12, 15, 20, 30, 35, 60, 75])
      return [`Calculer $${p}\\,\\%$ d'un nombre, c'est le multiplier par…`, `$${frac(p, 100)}$ (ou $${nb(p / 100)}$)`]
    }],
  ]),
  ...notions('Hors liste officielle', [
    ['Aire et périmètre du rectangle', () => choix<[string, string]>([
      ['Quelle est la formule de l\'aire d\'un rectangle ?', 'longueur $\\times$ largeur'],
      ['Quelle est la formule du périmètre d\'un rectangle ?', '$2 \\times$ (longueur $+$ largeur)']])],
    ['Aire du triangle',
      fixe('Quelle est la formule de l\'aire d\'un triangle ?', 'base $\\times$ hauteur $\\div 2$')],
    ['Le cercle',
      fixe('Quelle est la formule du périmètre d\'un cercle de rayon $r$ ?', '$2 \\times \\pi \\times r$'),
      fixe('Quelle est la formule de l\'aire d\'un disque de rayon $r$ ?', '$\\pi \\times r \\times r$'),
      () => { const r = ent(2, 9); return [`Un cercle a un rayon de $${r}$ cm. Combien mesure son diamètre ?`, `$${2 * r}$ cm`] }],
    ['Les conversions à connaître', () => {
      const [de, vers, k] = choix<[string, string, string]>([['km', 'm', '1\\,000'], ['m', 'cm', '100'], ['m', 'mm', '1\\,000'], ['kg', 'g', '1\\,000'], ['L', 'cL', '100'], ['h', 'min', '60'], ['min', 's', '60']])
      return [`Combien y a-t-il de ${vers} dans $1$ ${de} ?`, `$${k}$`]
    }],
    ['La moyenne',
      fixe('Comment calcule-t-on la moyenne d\'une série de valeurs ?', 'somme des valeurs $\\div$ nombre de valeurs')],
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
  { id: '4e', nom: '4e', automatismes: [], cours: [] },
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
