// =============================================================
// LES AUTOMATISMES (5e)
// Rangés comme la liste officielle des automatismes de 5e. Chaque
// automatisme est un GÉNÉRATEUR : il tire des valeurs au hasard et rend
// une question, sa réponse, et des réponses fausses qui sont de vraies
// erreurs d'élèves (pour le QCM et le vrai/faux). Une séance en tire
// dix ; « Nouveaux exemples » en tire dix autres.
//
// Les réponses sont du LaTeX (KaTeX), un texte (préfixe §, avec $…$
// pour les maths) ou un dessin SVG. Une question peut porter une
// figure (droite graduée, repère, cubes, angles codés…).
// =============================================================
import * as F from './figures'

export interface Question {
  enonce: string            // texte, avec $…$ pour les maths
  figure?: string           // un dessin SVG sous l'énoncé
  reponse: string           // LaTeX, §texte ou <svg…>
  faux: string[]            // une à trois réponses fausses, même format
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
const melange = <T,>(t: T[]) => [...t].sort(() => Math.random() - 0.5)

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
const OUI_NON = (oui: boolean) => ({ reponse: mot(oui ? 'Oui' : 'Non'), faux: [mot(oui ? 'Non' : 'Oui')] })
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
    id: 'divisibilite-2-5-10', theme: 'Opérations', titre: 'Divisibilité par 2, 5 et 10',
    generer() {
      const LOT = ['par 2 seulement', 'par 5 seulement', 'par 2, par 5 et par 10', 'ni par 2, ni par 5']
      const fin = choix([0, 5, 2, 4, 6, 8, 1, 3, 7, 9])
      const N = ent(10, 999) * 10 + fin
      const bonne = fin === 0 ? LOT[2] : fin === 5 ? LOT[1] : fin % 2 === 0 ? LOT[0] : LOT[3]
      return { enonce: `Le nombre $${N}$ est divisible…`, reponse: mot(bonne), faux: LOT.filter(x => x !== bonne).map(mot) }
    },
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
      if (Math.random() < 0.5) {
        return { enonce: `Compléter : $${N} = ${a} \\times \\ldots$`, reponse: nb(b), faux: fausses(nb(b), [nb(b + 1), nb(b - 1), nb(N - a)], autour(b)) }
      }
      const p = (x: number, y: number) => `${x} \\times ${y}`
      const cands = [[a, b + 1], [a + 1, b - 1], [a - 1, b + 1], [a + 1, b], [a, b - 1]].filter(([x, y]) => x > 1 && y > 1 && x * y !== N).map(([x, y]) => p(x, y))
      return { enonce: `Quel produit est égal à $${N}$ ?`, reponse: p(a, b), faux: fausses(p(a, b), cands, () => p(a + ent(1, 2), b + ent(1, 2))) }
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
        return { enonce: `Compléter : $${frac(n, d)} = \\frac{\\ldots}{${d * k}}$`, reponse: nb(n * k),
          faux: fausses(nb(n * k), [nb(n + k), nb(n * k + d), nb(d * k - n)], autour(n * k)) }
      }
      // Laquelle est égale ? (on ajoute le même nombre en haut et en bas : l'erreur classique)
      return { enonce: `Quelle fraction est égale à $${frac(n, d)}$ ?`, reponse: frac(n * k, d * k),
        faux: fausses(frac(n * k, d * k), [frac(n + k, d + k), frac(n * k, d + k), frac(n + k, d * k), frac(d * k, n * k)].filter(t => t !== frac(n, d))) }
    },
  },
  {
    id: 'comparer-fractions', theme: 'Nombres rationnels', titre: 'Comparer deux fractions',
    generer() {
      let a: number, b: number, c: number, d: number
      const sorte = ent(0, 2)
      if (sorte === 0) { d = b = ent(3, 12); a = ent(1, 15); do { c = ent(1, 15) } while (c === a) }
      else if (sorte === 1) { a = c = ent(1, 9); b = ent(2, 12); do { d = ent(2, 12) } while (d === b) }
      else { b = ent(2, 6); const k = ent(2, 3); d = b * k; a = ent(1, 2 * b); c = ent(1, 2 * d) }
      const s = a * d < c * b ? '<' : a * d > c * b ? '>' : '='
      return { enonce: `Compléter par $<$, $>$ ou $=$ : $${frac(a, b)} \\;\\ldots\\; ${frac(c, d)}$`, reponse: s, faux: ['<', '>', '='].filter(x => x !== s) }
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
      const miroir = (g: boolean[][]) => g.map(l => [...l].reverse())
      const vue = Math.random() < 0.5 ? 'dessus' : 'face'
      const bonne = vue === 'dessus' ? dessus : face
      const faux = vue === 'dessus' ? [face, miroir(dessus), droite] : [dessus, miroir(face), droite]
      const abime = () => { const g = bonne.map(l => [...l]); const i = ent(0, g.length - 1), j = ent(0, g[0].length - 1); g[i][j] = !g[i][j]; return F.vueGrille(g) }
      return { enonce: `Quelle est la vue de ${vue === 'dessus' ? 'dessus' : 'face'} de cet empilement ?`, figure: F.empilement(h),
        reponse: F.vueGrille(bonne), faux: fausses(F.vueGrille(bonne), faux.map(F.vueGrille), abime) }
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
    id: 'cavaliere', theme: 'Représentation de l’espace', titre: 'Cube ou pavé en perspective cavalière',
    generer() {
      const cube = Math.random() < 0.4
      const l = cube ? ent(3, 4) : ent(4, 6), h = cube ? l : ent(2, l - 1), p = cube ? l : ent(2, 5)
      const dessin = (f: F.Faute) => F.cavaliere(l, h, p, f)
      return { enonce: `Quel dessin représente correctement ${cube ? 'un cube' : 'un pavé droit'} en perspective cavalière ?`,
        reponse: dessin('aucune'), faux: (['caches-pleins', 'fuyantes', 'face'] as F.Faute[]).map(dessin) }
    },
  },
  {
    id: 'patron-cube', theme: 'Représentation de l’espace', titre: 'Reconnaître un patron de cube',
    generer() {
      const tirer = (bon: boolean) => { for (;;) { const c = F.hexomino(); if (F.estPatronDeCube(c) === bon) return F.patron(c) } }
      const bonne = tirer(true)
      return { enonce: `Lequel de ces assemblages est un patron de cube ?`, reponse: bonne, faux: fausses(bonne, [tirer(false), tirer(false), tirer(false)], () => tirer(false)) }
    },
  },

  // ================= TRANSFORMATIONS =================
  {
    id: 'symetrie-axiale', theme: 'Transformations', titre: 'Reconnaître le symétrique d’une figure',
    generer() {
      const FORMES = [
        [[0, 0], [3, 0], [3, 1], [1, 1], [1, 3], [0, 3]],
        [[0, 0], [3, 0], [0, 4]],
        [[0, 0], [4, 0], [3, 2], [0, 2]],
        [[0, 0], [0, 5], [3, 4], [1, 3], [1, 0]],
        [[0, 0], [2, 0], [2, 1], [4, 1], [4, 3], [0, 3]],
      ]
      let f = choix(FORMES).map(([x, y]) => ({ x, y }))
      const w = Math.max(...f.map(q => q.x)), h = Math.max(...f.map(q => q.y))
      if (Math.random() < 0.5) f = f.map(q => ({ x: w - q.x, y: q.y }))
      if (Math.random() < 0.5) f = f.map(q => ({ x: q.x, y: h - q.y }))
      const dx = ent(1, 5 - w), dy = ent(1, 11 - h)
      f = f.map(q => ({ x: q.x + dx, y: q.y + dy }))
      const LOT: Record<string, string> = { aucune: 'Oui', translation: 'Non, elle a glissé', decalage: 'Non, mauvaise distance à l’axe', rotation: 'Non, elle a fait un demi-tour' }
      const erreur = choix(['aucune', 'aucune', 'translation', 'decalage', 'rotation'] as const)
      return { enonce: `La figure bleue est-elle la symétrique de la rouge par rapport à $(d)$ ?`, figure: F.symetrie(f, choix(['vertical', 'horizontal']), erreur),
        reponse: mot(LOT[erreur]), faux: Object.values(LOT).filter(x => x !== LOT[erreur]).map(mot) }
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
      return { enonce: `Ces deux angles sont…`, figure: F.deuxAngles(sorte, m1, m2), reponse: mot(NOMS[sorte]), faux: Object.values(NOMS).filter(x => x !== NOMS[sorte]).map(mot) }
    },
  },
  {
    id: 'bissectrice', theme: 'Angles', titre: 'Reconnaître une bissectrice',
    generer() {
      if (Math.random() < 0.5) {
        const m1 = ent(20, 55), egal = Math.random() < 0.5, m2 = egal ? m1 : m1 + choix([-1, 1]) * ent(4, 12)
        return { enonce: `La demi-droite $[Oz)$ est-elle la bissectrice de l'angle $\\widehat{xOy}$ ?`, figure: F.bissectriceFig(m1, m2), ...OUI_NON(egal) }
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
      return { enonce: `D'après le codage, ce triangle est…`, figure: F.triangleCode(sorte, ent(0, 23) * 15), ...parmi(NOMS[sorte], Object.values(NOMS)) }
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
      const sorte = ent(0, 4)
      const [P, Q] = choix(['AB', 'EF', 'IJ', 'RS', 'CD'])
      if (sorte <= 2) {
        const perp = Math.random() < 0.5, mil = Math.random() < (perp ? 0.6 : 0.5)
        const LOT = ['Oui', `Non : elle n'est pas perpendiculaire à $[${P}${Q}]$`, `Non : elle ne passe pas par le milieu de $[${P}${Q}]$`, 'Non : ni perpendiculaire, ni par le milieu']
        const bonne = perp && mil ? LOT[0] : !perp && mil ? LOT[1] : perp ? LOT[2] : LOT[3]
        return { enonce: `La droite $(d)$ est-elle la médiatrice du segment $[${P}${Q}]$ ?`, figure: F.mediatriceFig(perp, mil, ent(-6, 6) * 6, P + Q), reponse: mot(bonne), faux: LOT.filter(x => x !== bonne).map(mot) }
      }
      if (sorte === 3) {
        const l = ent(2, 12) + choix([0, 0, 0.5])
        return { enonce: `Le point $M$ est sur la médiatrice de $[${P}${Q}]$ et $M${P} = ${nb(l)}$ cm. Combien mesure $M${Q}$ ?`, reponse: unite(nb(l), 'cm'),
          faux: fausses(unite(nb(l), 'cm'), [unite(nb(2 * l), 'cm'), unite(nb(l / 2), 'cm'), mot('On ne peut pas savoir')]) }
      }
      return { enonce: `Le centre du cercle circonscrit à un triangle est le point de concours de ses…`, ...parmi('médiatrices', ['médiatrices', 'hauteurs', 'médianes', 'bissectrices']) }
    },
  },

  // ================= PARALLÉLOGRAMMES ET POLYGONES =================
  {
    id: 'polygones', theme: 'Parallélogrammes et polygones', titre: 'Nommer un quadrilatère ou un polygone',
    generer() {
      const sorte = choix(['carre', 'rectangle', 'losange', 'parallelogramme', 'trapeze', 'pentagone', 'hexagone', 'quadrilatere'] as F.Polygone[])
      const NOMS: Record<F.Polygone, string> = { carre: 'un carré', rectangle: 'un rectangle', losange: 'un losange', parallelogramme: 'un parallélogramme', trapeze: 'un trapèze', pentagone: 'un pentagone', hexagone: 'un hexagone', quadrilatere: 'un quadrilatère quelconque' }
      const proches: Record<F.Polygone, F.Polygone[]> = { carre: ['losange', 'rectangle', 'parallelogramme'], rectangle: ['carre', 'parallelogramme', 'losange'], losange: ['carre', 'parallelogramme', 'rectangle'], parallelogramme: ['losange', 'rectangle', 'trapeze'], trapeze: ['parallelogramme', 'quadrilatere', 'rectangle'], pentagone: ['hexagone', 'quadrilatere', 'trapeze'], hexagone: ['pentagone', 'quadrilatere', 'losange'], quadrilatere: ['trapeze', 'parallelogramme', 'losange'] }
      return { enonce: `Ce polygone est…`, figure: F.polygone(sorte, ent(0, 23) * 15), reponse: mot(NOMS[sorte]), faux: proches[sorte].map(x => mot(NOMS[x])) }
    },
  },
  {
    id: 'parallelogramme-code', theme: 'Parallélogrammes et polygones', titre: 'Le codage d’un parallélogramme particulier',
    generer() {
      const lg = Math.random() < 0.5, dr = Math.random() < 0.5
      const noms = choix(['ABCD', 'EFGH', 'IJKL', 'MNOP', 'RSTU'])
      const LOT = ['un carré', 'un losange', 'un rectangle', 'un parallélogramme quelconque']
      const bonne = lg && dr ? LOT[0] : lg ? LOT[1] : dr ? LOT[2] : LOT[3]
      return { enonce: `$${noms}$ est un parallélogramme. D'après le codage, c'est…`, figure: F.parallelogrammeCode(lg, dr, noms, ent(-4, 4) * 10, ent(0, 3)), reponse: mot(bonne), faux: LOT.filter(x => x !== bonne).map(mot) }
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
    id: 'situation-proportionnelle', theme: 'Proportionnalité', titre: 'Reconnaître une situation de proportionnalité',
    generer() {
      if (Math.random() < 0.55) {
        const k = choix([2, 3, 4, 5, 1.5, 2.5]), xs = melange([1, 2, 3, 4, 5, 6, 8, 10]).slice(0, 3).sort((a, b) => a - b)
        const oui = Math.random() < 0.5
        const ys = xs.map(x => x * k)
        if (!oui) { if (Math.random() < 0.5) { const d = ent(1, 3); for (let i = 0; i < 3; i++) ys[i] += d } else ys[ent(1, 2)] += choix([-1, 1]) }
        return { enonce: `Ce tableau est-il un tableau de proportionnalité ? $${tableau(xs.map(nb), ys.map(nb))}$`, ...OUI_NON(oui) }
      }
      const [phrase, oui] = choix<[string, boolean]>([
        ['Le prix payé et la masse de pommes achetées à 2 € le kilo.', true], ['L’âge d’un enfant et sa taille.', false],
        ['Le périmètre d’un carré et la longueur de son côté.', true], ['L’aire d’un carré et la longueur de son côté.', false],
        ['Le prix d’une course en taxi (3 € de prise en charge, puis 1 € par km) et la distance parcourue.', false],
        ['La quantité d’essence et le prix payé à la pompe.', true], ['La distance parcourue à vitesse constante et la durée du trajet.', true],
        ['La pointure d’une personne et son âge.', false], ['Le nombre de tickets de bus achetés au même prix et la somme payée.', true],
        ['La température extérieure et l’heure de la journée.', false], ['Le nombre d’œufs et la masse de farine dans une recette.', true],
        ['Le prix d’un abonnement de 10 € par mois plus 2 € par séance et le nombre de séances.', false]])
      return { enonce: `Est-ce une situation de proportionnalité ? ${phrase}`, ...OUI_NON(oui) }
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
    id: 'divisibilite', theme: 'Hors liste officielle', titre: 'Divisibilité par 2, 3, 5 et 9',
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

/** Dix questions différentes (on évite deux fois le même énoncé) */
export function dixQuestions(autos: Automatisme[], n = 10): { auto: Automatisme; q: Question }[] {
  const r: { auto: Automatisme; q: Question }[] = []
  const vus = new Set<string>()
  for (let essai = 0; r.length < n && essai < n * 40; essai++) {
    const auto = autos[r.length % autos.length]
    const q = auto.generer()
    const cle = q.enonce + (q.figure ?? '') + q.reponse
    if (vus.has(cle)) continue
    vus.add(cle); r.push({ auto, q })
  }
  // Plusieurs automatismes : on mélange l'ordre
  if (autos.length > 1) r.sort(() => Math.random() - 0.5)
  return r
}
