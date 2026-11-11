// =============================================================
// LES AUTOMATISMES DE 4e
// Les exercices de 4e (AUTOMATISMES_4E, avec le domaine PERSO
// « Pythagore ») et les questions de cours (COURS_4E). Voir
// ../automatismes.ts pour l'ensemble.
// =============================================================
import * as F from '../figures'
import type { Automatisme, Facon, QuestionCours } from './outils'
import { OBJETS, TRIANGLES, ang, arrondi, choix, cm2, cm3, coord, deuxPts, ent, frac, grandNb, irreductible, lettre, melange, mille, mot, nb, notions, pgcd, piFois, pt, pts, quad, rel, relNonNul, seul, tableau, tri, unTrou, une, unite } from './outils'

/** Trois points (en unités) alignés */
export const aligne = ([a, b, c]: [number, number][]) => (b[0] - a[0]) * (c[1] - a[1]) - (b[1] - a[1]) * (c[0] - a[0]) === 0
/** Deux points du losange de seize triangles reliés par un trait de la
 *  figure : les côtés du losange et du carré, et leurs diagonales */
export const surUnTrait = (p: [number, number], q: [number, number]) => {
  const traits: [number, number][][] = [[[0, 2], [2, 0]], [[2, 0], [0, -2]], [[0, -2], [-2, 0]], [[-2, 0], [0, 2]], [[-1, 1], [1, 1]], [[1, 1], [1, -1]], [[1, -1], [-1, -1]], [[-1, -1], [-1, 1]], [[0, 2], [0, -2]], [[-2, 0], [2, 0]], [[-1, 1], [1, -1]], [[1, 1], [-1, -1]]]
  const dessus = (r: [number, number], [a, b]: [number, number][]) => aligne([a, b, r]) && Math.min(a[0], b[0]) <= r[0] && r[0] <= Math.max(a[0], b[0]) && Math.min(a[1], b[1]) <= r[1] && r[1] <= Math.max(a[1], b[1])
  return traits.some(t => dessus(p, t) && dessus(q, t))
}

// ---------- PERSO : Pythagore (outils) ----------
export const PERSO_PYTHAGORE = 'PERSO · Pythagore : connaître le cours.'
export const TRIPLETS_PYTHAGORE = [[3, 4, 5], [6, 8, 10], [5, 12, 13], [8, 15, 17], [9, 12, 15], [7, 24, 25], [12, 16, 20]]
/** Trois longueurs qui ne font pas un triangle rectangle (a² + b² ≠ c²) */
export const PAS_RECTANGLES = [[4, 5, 7], [5, 6, 8], [6, 7, 9], [4, 6, 7], [5, 7, 9], [6, 8, 11], [3, 5, 6]]
/** Les étapes de chaque rédaction, en général, avec les mots du professeur */
export const ETAPES_PYTHAGORE: [string, string[]][] = [
  ['du théorème de Pythagore', ['Donner le triangle rectangle', 'Citer le théorème de Pythagore', 'Donner l’égalité de Pythagore', 'Calculer la longueur']],
  ['de la réciproque du théorème de Pythagore', ['Séparer les calculs', 'Confirmer l’égalité de Pythagore', 'Citer la réciproque du théorème de Pythagore', 'Conclure que le triangle est rectangle']],
  ['de la contraposée du théorème de Pythagore', ['Séparer les calculs', 'Confirmer la non égalité de Pythagore', 'Citer la contraposée du théorème de Pythagore', 'Conclure que le triangle n’est pas rectangle']],
]
/** Un triangle rectangle tiré au hasard : son nom, le sommet de l'angle
 *  droit, les côtés de l'angle droit et l'hypoténuse (lettres rangées) */
export function triangleRectangle() {
  const s = [...choix(TRIANGLES)], d = ent(0, 2)
  const [u, w] = s.filter((_, i) => i !== d)
  const seg = (x: string, y: string) => [x, y].sort().join('')
  return { nom: s.join(''), a: s[d], c1: seg(s[d], u), c2: seg(s[d], w), h: seg(u, w) }
}

export const AUTOMATISMES_4E: Automatisme[] = [
  // ================= OPÉRATIONS SUR LES NOMBRES RELATIFS =================
  {
    id: '4e-relatifs-sommes', theme: 'Opérations sur les nombres relatifs', titre: 'Sommes et différences de relatifs',
    programme: 'Manipuler des sommes et des différences de nombres relatifs.',
    competence: 0,
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
    competence: 1,
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
    competence: 2,
    generer() { const a = ent(3, 9), b = ent(3, 9); return Math.random() < 0.6 ? { enonce: `Calculer : $${a} \\times ${b}$`, reponse: nb(a * b) } : { enonce: `Calculer : $${a * b} \\div ${a}$`, reponse: nb(b) } },
    trou() {
      const a = ent(3, 9), b = ent(3, 9), p = a * b
      return unTrou('', [[`$${a} \\times \\ldots = ${p}$`, nb(b)], [`$\\ldots \\times ${b} = ${p}$`, nb(a)], [`$${p} = ${a} \\times \\ldots$`, nb(b)], [`$\\ldots = ${a} \\times ${b}$`, nb(p)]])
    },
  },
  {
    id: '4e-fois-10', theme: 'Opérations sur les nombres relatifs', titre: 'Multiplier et diviser par 10, 100, 1 000',
    programme: 'Multiplier et diviser par 10, 100, 1 000.',
    competence: 3,
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
    competence: 4,
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
    competence: 5,
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
    competence: 0,
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
    competence: 1,
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
    id: '4e-ranger-ecritures', theme: 'Nombres rationnels', titre: 'Ranger des nombres écrits de façons différentes',
    programme: 'Comparer des fractions, des décimaux.',
    competence: 1,
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
    competence: 2,
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
    competence: 3,
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
    competence: 0,
    generer() { const n = ent(0, 12); return { enonce: `Calculer : $${n}^2$`, reponse: nb(n * n) } },
    trou() { const n = ent(2, 12); return unTrou('', [[`$${n}^2 = \\ldots$`, nb(n * n)], [`$\\ldots^2 = ${n * n}$ (nombre positif)`, nb(n)], [`$${n * n} = ${n} \\times \\ldots$`, nb(n)]]) },
  },
  {
    id: '4e-fois-puissance-10', theme: 'Puissances', titre: 'Compléter 1 200 = 1,2 × …',
    programme: 'Multiplier et diviser par 10, 100, 1 000 ; compléter 1 200 = 1,2 × …',
    competence: 1,
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
    competence: 2,
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
    competence: 3,
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
    competence: 0,
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
    competence: 0,
    generer() {
      const a = ent(2, 12), b = ent(2, 9), c = ent(2, 9)
      const [e, v] = choix<[string, number]>([[`${a} + ${b} \\times ${c}`, a + b * c], [`${a} \\times ${b} - ${c}`, a * b - c], [`(${a} + ${b}) \\times ${c}`, (a + b) * c], [`${a} - ${b} \\times ${c}`, a - b * c], [`${b} \\times ${c} - ${a} \\times 2`, b * c - 2 * a], [`${a * b} \\div ${b} + ${c}`, a + c]])
      return { enonce: `Calculer : $${e}$`, reponse: nb(v) }
    },
  },
  {
    id: '4e-equations', theme: 'Calcul littéral et algébrique', titre: 'Résoudre x + b = c et ax = c',
    programme: 'Résoudre des équations du type ax = c et x + b = c.',
    competence: 1,
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
    competence: 2,
    generer() {
      const k = ent(2, 12), x = choix(['x', 'a', 'y', 'n'])
      const [e, r] = choix<[string, string]>([[`${k} \\times ${x}`, `${k}${x}`], [`${x} \\times ${k}`, `${k}${x}`], [`${k} \\times ${x} \\times ${x}`, `${k}${x}^2`], [`1 \\times ${x}`, x], [`${x} \\times ${x} \\times ${x}`, `${x}^3`]])
      return { enonce: `Écrire plus simplement : $${e}$`, reponse: r }
    },
  },
  {
    id: '4e-reduire', theme: 'Calcul littéral et algébrique', titre: 'x + x = 2x, x × x = x², 3x × 2x = 6x²',
    programme: '1 × x = x ; x + x = 2x ; x × x = x² ; 3x + 2x = 5x ; 3x × 2x = 6x².',
    competence: 3,
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
    competence: 4,
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
    competence: 5,
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
    competence: 0,
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
    competence: 1,
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
    id: '4e-placer-droite', theme: 'Repérage', titre: 'Placer un relatif sur une droite graduée',
    programme: 'Placer et repérer un nombre relatif sur une droite graduée.',
    competence: 0,
    generer() {
      const parts = choix([2, 4, 5]), debut = -ent(3, 5), fin = ent(3, 5), n = (fin - debut) * parts
      // Le nombre à placer, son opposé et ses voisins : les erreurs qu'on fait en lisant la graduation
      let k: number
      do { k = ent(1, n - 1) } while (debut + k / parts === 0)
      const x = debut + k / parts
      const pris = [x]
      for (const a of [-x, x + 1 / parts, x - 1 / parts]) if (a >= debut && a <= fin && !pris.some(b => Math.abs(a - b) < 1e-9)) pris.push(a)
      while (pris.length < 4) { const a = debut + ent(0, n) / parts; if (!pris.some(b => Math.abs(a - b) < 1e-9)) pris.push(a) }
      const noms = pts(4)
      const lettres = pris.slice(0, 4).map((a, i) => ({ x: a, lettre: noms[i] }))
      return { enonce: `Sur la droite graduée, quel point a pour abscisse $${nb(x)}$ ?`, figure: F.droiteGradueePoints(debut, fin, parts, lettres), reponse: mot(`$${noms[0]}$`) }
    },
  },
  {
    id: '4e-coordonnees', theme: 'Repérage', titre: 'Lire les coordonnées d’un point',
    programme: 'Dans un repère orthogonal, lire les coordonnées d’un point.',
    competence: 2,
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
    competence: 3,
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
    competence: 0,
    generer() {
      const [s, nom] = choix<[F.Solide, string]>([['cube', 'un cube'], ['pave', 'un pavé droit'], ['cylindre', 'un cylindre'], ['prisme3', 'un prisme droit'], ['prisme5', 'un prisme droit'], ['prisme4', 'un prisme droit'], ['pyramide', 'une pyramide']])
      return { enonce: 'Comment s\'appelle ce solide ?', figure: F.solide(s), reponse: mot(nom) }
    },
  },
  {
    id: '4e-base-prisme', theme: 'Représentation de l’espace', titre: 'La base d’un prisme droit',
    programme: 'Reconnaître la base d’un prisme en perspective cavalière.',
    competence: 2,
    generer() {
      const [s, base, n] = choix<[F.Solide, string, number]>([['prisme3', 'un triangle', 3], ['prisme4', 'un quadrilatère (un trapèze)', 4], ['prisme5', 'un pentagone', 5], ['prisme6', 'un hexagone', 6]])
      return Math.random() < 0.6 ? { enonce: 'Ce solide est un prisme droit. Quelle est la forme de ses bases ?', figure: F.solide(s), reponse: mot(base) }
        : { enonce: 'Ce solide est un prisme droit. Combien a-t-il de faces latérales ?', figure: F.solide(s), reponse: nb(n) }
    },
  },
  {
    id: '4e-volumes', theme: 'Représentation de l’espace', titre: 'Volume d’un cube, d’un pavé, d’un prisme, d’un cylindre',
    programme: 'Utiliser les formules du volume d’un cube, d’un pavé, d’un prisme, d’un cylindre.',
    competence: 1,
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
    competence: 3,
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
    competence: 1,
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
    id: '4e-symetrie-reconnue', theme: 'Parallélogrammes et translations', titre: 'Reconnaître la symétrie qui transforme un point en un autre',
    programme: 'Dire si des figures planes sont images l’une de l’autre par une symétrie axiale (dont on identifie l’axe) ou par un demi-tour (dont on identifie le centre).',
    competence: 0,
    generer() {
      const [A, B] = pts(2)
      let x: number, y: number
      do { x = relNonNul(1, 4); y = relNonNul(1, 4) } while (Math.abs(x) === Math.abs(y))
      const cas = ent(0, 3)
      let bx = 0, by = 0, rep = ''
      if (cas === 0) { bx = x; by = -y; rep = 'une symétrie d\'axe l\'axe des abscisses' }
      else if (cas === 1) { bx = -x; by = y; rep = 'une symétrie d\'axe l\'axe des ordonnées' }
      else if (cas === 2) { bx = -x; by = -y; rep = 'un demi-tour de centre $O$, l\'origine du repère' }
      else {
        // Un demi-tour dont le centre est le milieu de [AB]
        let a: number, b: number
        do { a = ent(-2, 2); b = ent(-2, 2); bx = 2 * a - x; by = 2 * b - y } while ((a === 0 && b === 0) || Math.abs(bx) > 5 || Math.abs(by) > 5 || (bx === x && by === y))
        rep = `un demi-tour de centre le milieu de $[${A}${B}]$, le point de coordonnées $(${nb(a)}\\,;\\,${nb(b)})$`
      }
      const c = (u: number, v: number) => `(${nb(u)}\\,;\\,${nb(v)})`
      return {
        enonce: `Dans un repère, $${A}${c(x, y)}$ et $${B}${c(bx, by)}$. Le point $${B}$ est l'image du point $${A}$ par une symétrie axiale ou par un demi-tour : laquelle ? (préciser l'axe ou le centre)`,
        figure: F.reperePoints([{ x, y, nom: A }, { x: bx, y: by, nom: B }]),
        reponse: mot(rep),
      }
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
    competence: 3,
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
    competence: 2,
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
    competence: 0,
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
    competence: 0,
    generer() {
      const n = choix([2, 3, 4])
      let l: number[]
      do { l = Array.from({ length: n }, () => ent(4, 20)) } while ((l.reduce((s, x) => s + x, 0) * 2) % n !== 0)
      return { enonce: `Quelle est la moyenne de : $${l.join(' \\; ; \\; ')}$ ?`, reponse: nb(l.reduce((s, x) => s + x, 0) / n) }
    },
  },
  {
    id: '4e-effectif-manquant', theme: 'Statistiques', titre: 'Un effectif manquant',
    programme: 'Calculer un effectif manquant dans un tableau.',
    competence: 1,
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
    competence: 2,
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
      return Math.random() < 0.5 ? { enonce: `Quelle est la médiane de la série : $${l.join(' \\; ; \\; ')}$ ?`, reponse: nb(tri[(n - 1) / 2]) }
        : { enonce: `Quelle est l'étendue de la série : $${l.join(' \\; ; \\; ')}$ ?`, reponse: nb(tri[n - 1] - tri[0]) }
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
    competence: 0,
    generer() {
      const a = choix([100, 50, 25, 10, 1]), c = a === 25 ? 4 * ent(3, 60) : a === 1 ? 100 * ent(1, 30) + choix([0, 50]) : 10 * ent(2, 90)
      return { enonce: `Calculer $${a}\\,\\%$ de $${grandNb(c)}$.`, reponse: nb(a * c / 100) }
    },
  },
  {
    id: '4e-pourcentages-trou', theme: 'Proportionnalité', titre: 'Compléter : 20 % de 120 = …',
    programme: 'Déterminer a % de c quand a vaut 100, 50, 25, 10, 1 ; compléter 20 % de 120 = …',
    competence: 1,
    generer() {
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
  // ---------- PERSO : Pythagore ----------
  // Un domaine du professeur, hors programme officiel (étiquette PERSO
  // dans la fenêtre) : une seule compétence, « Connaître le cours ».
  {
    id: 'perso-pythagore-choisir', theme: 'Pythagore', titre: 'Quel théorème utiliser ?', programme: PERSO_PYTHAGORE, competence: 0,
    generer() {
      const t = triangleRectangle(), k = ent(0, 2)
      const question = 'Quel est le théorème ou la propriété à utiliser ici ?'
      if (k === 0) {
        const [p, q] = choix(TRIPLETS_PYTHAGORE)
        return { enonce: `Le triangle $${t.nom}$ est rectangle en $${t.a}$, $${t.c1} = ${p}$ cm et $${t.c2} = ${q}$ cm. On demande de calculer $${t.h}$. ${question}`, reponse: mot('le théorème de Pythagore') }
      }
      const [p, q, r] = k === 1 ? choix(TRIPLETS_PYTHAGORE) : choix(PAS_RECTANGLES)
      return { enonce: `Dans le triangle $${t.nom}$, $${t.c1} = ${p}$ cm, $${t.c2} = ${q}$ cm et $${t.h} = ${r}$ cm. On demande de montrer que le triangle $${t.nom}$ ${k === 1 ? 'est' : 'n’est pas'} rectangle. ${question}`, reponse: mot(`la ${k === 1 ? 'réciproque' : 'contraposée'} du théorème de Pythagore`) }
    },
  },
  {
    id: 'perso-pythagore-redaction', theme: 'Pythagore', titre: 'L’étape manquante d’une rédaction', programme: PERSO_PYTHAGORE, competence: 0,
    generer() {
      const t = triangleRectangle(), k = ent(0, 2)
      // Les étapes de la rédaction, et celles qui peuvent manquer (choisies par le professeur)
      let etapes: string[], cachables: number[]
      if (k === 0) {
        const [p, q, r] = choix(TRIPLETS_PYTHAGORE)
        etapes = [`Dans le triangle $${t.nom}$ rectangle en $${t.a}$,`, 'd’après le théorème de Pythagore,', `$${t.h}^2 = ${t.c1}^2 + ${t.c2}^2$`,
          `$${t.h}^2 = ${p}^2 + ${q}^2$`, `$${t.h}^2 = ${p * p} + ${q * q} = ${r * r}$`, `$${t.h} = \\sqrt{${r * r}} = ${r}$ cm`]
        cachables = [0, 1, 2]
      } else {
        const [p, q, r] = k === 1 ? choix(TRIPLETS_PYTHAGORE) : choix(PAS_RECTANGLES)
        etapes = [`Dans le triangle $${t.nom}$, le plus grand côté est $[${t.h}]$.`, `D’une part, $${t.h}^2 = ${r}^2 = ${r * r}$.`,
          `D’autre part, $${t.c1}^2 + ${t.c2}^2 = ${p}^2 + ${q}^2 = ${p * p} + ${q * q} = ${p * p + q * q}$.`,
          `On constate que $${t.h}^2 ${k === 1 ? '=' : '\\neq'} ${t.c1}^2 + ${t.c2}^2$.`,
          `Donc, d’après la ${k === 1 ? 'réciproque' : 'contraposée'} du théorème de Pythagore,`,
          k === 1 ? `le triangle $${t.nom}$ est rectangle en $${t.a}$.` : `le triangle $${t.nom}$ n’est pas rectangle.`]
        cachables = k === 1 ? [0, 3, 4, 5] : [0, 3, 4]
      }
      const cachee = choix(cachables)
      const lignes = etapes.map((e, i) => i === cachee ? '$\\ldots\\ldots\\ldots$' : e)
      return { enonce: `Compléter l’étape manquante de la rédaction.\n${lignes.join('\n')}`, reponse: mot(etapes[cachee]) }
    },
  },
  {
    // Les étapes en général, en dehors d'un exercice (les mots du professeur)
    id: 'perso-pythagore-etapes', theme: 'Pythagore', titre: 'Les étapes d’une rédaction', programme: PERSO_PYTHAGORE, competence: 0,
    generer() {
      const [nom, etapes] = choix(ETAPES_PYTHAGORE)
      // Une seule forme : on complète l'étape qui manque, les trois autres sont données
      const cachee = ent(0, etapes.length - 1)
      const lignes = etapes.map((e, i) => `${i + 1}) ${i === cachee ? '$\\ldots\\ldots\\ldots$' : e}`)
      return { enonce: `Compléter l’étape manquante de la rédaction ${nom} :\n${lignes.join('\n')}`, reponse: mot(etapes[cachee]) }
    },
  },
  {
    id: 'perso-pythagore-egalite', theme: 'Pythagore', titre: 'L’égalité de Pythagore, l’hypoténuse', programme: PERSO_PYTHAGORE, competence: 0,
    generer() {
      const t = triangleRectangle()
      if (Math.random() < 0.5) return { enonce: `Le triangle $${t.nom}$ est rectangle en $${t.a}$. Écrire l’égalité de Pythagore.`, reponse: `${t.h}^2 = ${t.c1}^2 + ${t.c2}^2` }
      if (Math.random() < 0.5) return { enonce: `Le triangle $${t.nom}$ est rectangle en $${t.a}$. Quelle est son hypoténuse ?`, reponse: mot(`$[${t.h}]$`) }
      const [p, q, r] = choix([...TRIPLETS_PYTHAGORE, ...PAS_RECTANGLES])
      return { enonce: `Dans le triangle $${t.nom}$, $${t.c1} = ${p}$ cm, $${t.c2} = ${q}$ cm et $${t.h} = ${r}$ cm. Pour la réciproque ou la contraposée, quel côté met-on seul d’un côté de l’égalité ?`, reponse: mot(`$[${t.h}]$, le plus grand côté`) }
    },
  },
]

// =============================================================
// LES QUESTIONS DE COURS (4e)
// Mêmes règles qu'en 5e : plusieurs façons de poser chaque notion, et
// rien de fixe (nombres, noms de points, objets tirés au hasard).
// =============================================================
export const n4 = (theme: string, liste: [string, ...Facon[]][]) => notions(theme, liste, '4e-')

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
  // PERSO : Pythagore (un domaine du professeur)
  ...n4('Pythagore', [
    ['À quoi sert le théorème de Pythagore',
      () => { const t = triangleRectangle(); return [`Le triangle $${t.nom}$ est rectangle en $${t.a}$. À quoi sert le théorème de Pythagore ?`, `à calculer la longueur d’un côté de $${t.nom}$ quand on connaît les deux autres`] },
      () => { const t = triangleRectangle(); return [`Le triangle $${t.nom}$ est rectangle en $${t.a}$. On connaît $${t.c1}$ et $${t.c2}$. Quelle longueur le théorème de Pythagore permet-il de calculer ?`, `$${t.h}$`] }],
    ['À quoi sert la réciproque du théorème de Pythagore',
      () => { const t = triangleRectangle(); return [`On connaît les trois longueurs du triangle $${t.nom}$. À quoi sert la réciproque du théorème de Pythagore ?`, `à montrer que $${t.nom}$ est rectangle`] },
      () => { const t = triangleRectangle(); return [`On veut montrer que le triangle $${t.nom}$ est rectangle. Quel théorème utilise-t-on ?`, 'la réciproque du théorème de Pythagore'] }],
    ['À quoi sert la contraposée du théorème de Pythagore',
      () => { const t = triangleRectangle(); return [`On connaît les trois longueurs du triangle $${t.nom}$. À quoi sert la contraposée du théorème de Pythagore ?`, `à montrer que $${t.nom}$ n’est pas rectangle`] },
      () => { const t = triangleRectangle(); return [`On veut montrer que le triangle $${t.nom}$ n’est pas rectangle. Quel théorème utilise-t-on ?`, 'la contraposée du théorème de Pythagore'] }],
    ['L’hypoténuse',
      () => { const t = triangleRectangle(); return [`Le triangle $${t.nom}$ est rectangle en $${t.a}$. Comment s’appelle le côté $[${t.h}]$ ?`, 'l’hypoténuse'] },
      () => { const t = triangleRectangle(); return [`Le triangle $${t.nom}$ est rectangle en $${t.a}$. Quel est son plus grand côté ?`, `$[${t.h}]$, l’hypoténuse`] }],
  ]),
]
