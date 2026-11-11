// =============================================================
// LES AUTOMATISMES DE 3e
// Les exercices de 3e (AUTOMATISMES_3E ; certains reprennent ceux de 4e)
// et les questions de cours (COURS_3E). Voir ../automatismes.ts pour
// l'ensemble.
// =============================================================
import * as F from '../figures'
import type { Automatisme, Facon, QuestionCours } from './outils'
import { PRENOMS, aTrou, choix, coord, ent, etL, frac, grandNb, irreductible, melange, mot, nb, notions, pgcd, pts, relNonNul, tri, unTrou, unite } from './outils'
import { AUTOMATISMES_4E } from './quatrieme'

// =============================================================
// LES AUTOMATISMES DE 3e (programme 2026 du cycle 4)
// Seulement les automatismes de la liste de 3e, chaque exercice rangé sous
// sa compétence (programme-automatismes.ts), et chaque compétence a au
// moins un exercice (choix du professeur, le 7 novembre 2026). Quand la
// liste de 3e redonne un automatisme déjà vu en 4e (repérage, solides,
// cercle circonscrit, droite des milieux…), on reprend l'exercice de 4e.
// Rien n'est fixe : nombres, noms de points, objets et prénoms sont tirés
// au hasard.
// =============================================================

/** L'exercice de 4e, repris en 3e sous un autre nom, rangé sous sa compétence de 3e */
export function reprendre4e(id4e: string, a: { id: string; theme: string; competence: number; programme: string; titre?: string }): Automatisme {
  const b = AUTOMATISMES_4E.find(x => x.id === id4e)!
  return { ...b, application: undefined, ...a, titre: a.titre ?? b.titre }
}
/** Écrire a x + b (ou a x − b) proprement : 1x devient x, −1x devient −x, + 0 disparaît */
export function affine(a: number, b: number, x = 'x'): string {
  const t = a === 0 ? '' : a === 1 ? x : a === -1 ? `-${x}` : `${nb(a)}${x}`
  if (b === 0) return t || '0'
  if (t === '') return nb(b)
  return `${t} ${b < 0 ? '-' : '+'} ${nb(Math.abs(b))}`
}
/** Un nombre écrit comme produit de facteurs premiers : 2^2 \times 3 \times 5 */
export function facteursPremiers(n: number): string {
  const f: string[] = []
  for (let p = 2; n > 1; p++) {
    let k = 0
    while (n % p === 0) { n /= p; k++ }
    if (k) f.push(k === 1 ? `${p}` : `${p}^{${k}}`)
  }
  return f.join(' \\times ')
}
/** Une fraction écrite telle quelle (lettres, pointillés) */
export const fr = (n: string | number, d: string | number) => `\\frac{${n}}{${d}}`
export const ppcm = (a: number, b: number) => a * b / pgcd(a, b)
export const P3 = {
  fractions: 'Additionner, soustraire, multiplier et diviser des fractions.',
  iteree: 'Puissance comme multiplication itérée : 3 × 3 × 3 × 3 = 3⁴.',
  memeNombre: 'Multiplication de puissances d’exposant positif d’un nombre.',
  memeExposant: 'Multiplication de puissances de même exposant positif de deux nombres.',
  carres: 'Donner les carrés des nombres entiers compris entre 0 et 12.',
  factoriser: 'Factoriser un nombre entier positif : 60 = 2² × 3 × 5.',
  simplifier: 'Simplifier une fraction dont le numérateur et le dénominateur sont dans une même table de multiplication.',
  denominateur: 'Trouver un dénominateur commun à deux fractions pour les additionner, les soustraire ou les comparer.',
  divisibilite: 'Appliquer les critères de divisibilité par 2, 3, 5, 9.',
  equations: 'Résoudre des équations du type ax = c, x + b = c, ax + b = c.',
  reduire: 'Simplifier des expressions littérales.',
  valeur: 'Calculer la valeur d’une expression algébrique avec des puissances ou non.',
  nature: 'Donner la nature d’une expression littérale : 3x + 2 est une somme, 5(x + 4) est un produit.',
  developper: 'Développer et factoriser une expression simple.',
  pair: 'Donner l’expression générique d’un nombre pair, d’un nombre impair.',
  oppose: 'Prendre l’opposé d’une expression : savoir que – (5 – 4x) = –5 + 4x.',
  placer: 'Placer sur une droite graduée un point dont l’abscisse est un nombre relatif.',
  reperer: 'Repérer un nombre relatif sur une droite graduée.',
  lire: 'Dans le plan muni d’un repère orthogonal, lire les coordonnées d’un point donné.',
  placerPoint: 'Dans le plan muni d’un repère orthogonal, placer un point de coordonnées données.',
  solides: 'Reconnaitre des solides (pavé droit, cube, prisme droit, cylindre, pyramide, cône).',
  volumes: 'Connaitre et utiliser les formules du volume d’une pyramide ou d’un cône.',
  face: 'Donner la nature d’une face d’une pyramide représentée en perspective cavalière.',
  patron: 'Identifier les patrons de pyramides données.',
  cercle: 'Utiliser la propriété du triangle rectangle et de son cercle circonscrit.',
  pythagore: 'Écrire l’égalité de Pythagore dans un triangle rectangle.',
  milieux: 'Utiliser la droite des milieux pour prouver que des droites sont parallèles, pour calculer une longueur, pour prouver qu’un point est le milieu d’un côté.',
  transformations: 'Mobiliser les connaissances sur la symétrie axiale, le demi-tour, la translation.',
  moyenne: 'Calculer une moyenne.',
  mediane: 'Donner une médiane pour une série comportant un petit nombre de valeurs.',
  etendue: 'Calculer l’étendue d’une série.',
  deuxParts: 'Partager une somme en deux parts selon un certain ratio.',
  troisParts: 'Partager une masse en trois parts selon un certain ratio.',
  ages: 'Partager une somme entre deux personnes proportionnellement à leur âge.',
  pourcentage: 'Calculer le pourcentage d’une quantité.',
  echelle: 'Calculer la distance réelle entre deux villes, connaissant la distance sur une carte dont l’échelle est connue.',
  evolution: 'Appliquer une augmentation ou une diminution exprimée en pourcentages, en utilisant ou non le coefficient multiplicateur.',
}
export const POLYGONES_BASE: [number, string][] = [[3, 'triangulaire'], [4, 'carrée'], [5, 'pentagonale'], [6, 'hexagonale'], [8, 'octogonale']]
export const NOM_POLYGONE: Record<number, string> = { 3: 'un triangle', 4: 'un quadrilatère', 5: 'un pentagone', 6: 'un hexagone', 8: 'un octogone' }
export const VILLES = ['Lyon', 'Nantes', 'Lille', 'Rennes', 'Dijon', 'Tours', 'Reims', 'Metz', 'Brest', 'Nîmes', 'Caen', 'Pau']

export const AUTOMATISMES_3E: Automatisme[] = [
  // ================= NOMBRES RATIONNELS =================
  {
    ...reprendre4e('4e-fractions-addsub', { id: '3e-fractions-addsub', theme: 'Nombres rationnels', competence: 0, programme: P3.fractions }),
    trou() {
      const d = choix([2, 3, 4, 5]), k = ent(2, 4), a = ent(1, d - 1 || 1), b = ent(1, 3 * d)
      return unTrou('', [[`$${frac(a, d)} + \\ldots = ${irreductible(a * k + b, d * k)}$`, irreductible(b, d * k)], [`$${frac(a, d)} + ${frac(b, d * k)} = ${fr('\\ldots', d * k)}$`, nb(a * k + b)]])
    },
  },
  {
    id: '3e-produit-fractions', theme: 'Nombres rationnels', titre: 'Multiplier des fractions', programme: P3.fractions, competence: 0,
    generer() {
      let a: number, b: number, c: number, d: number
      do { a = ent(1, 9); b = ent(2, 9); c = ent(1, 9); d = ent(2, 12) } while (a === b || c === d || pgcd(a, b) !== 1 || pgcd(c, d) !== 1 || pgcd(a * c, b * d) === 1 && Math.random() < 0.6)
      const moins = Math.random() < 0.3
      const ecrit = `${moins ? '-' : ''}${frac(a, b)} \\times ${frac(c, d)}`
      const r = irreductible(a * c, b * d)
      return { enonce: choix([`Calculer et simplifier : $${ecrit}$`, `Calculer et donner le résultat sous forme de fraction irréductible : $${ecrit}$`]), reponse: moins ? `-${r}` : r }
    },
  },
  {
    id: '3e-diviser-fractions', theme: 'Nombres rationnels', titre: 'Diviser par une fraction', programme: P3.fractions, competence: 0,
    generer() {
      let a: number, b: number, c: number, d: number
      do { a = ent(1, 9); b = ent(2, 9); c = ent(1, 9); d = ent(2, 9) } while (a === b || c === d || pgcd(a, b) !== 1 || pgcd(c, d) !== 1)
      if (Math.random() < 0.3) { const n = ent(2, 12); return { enonce: `Calculer et simplifier : $${frac(a, b)} \\div ${n}$`, reponse: irreductible(a, b * n) } }
      return { enonce: `Calculer et simplifier : $${frac(a, b)} \\div ${frac(c, d)}$`, reponse: irreductible(a * d, b * c) }
    },
    trou() {
      let a: number, b: number, c: number, d: number
      do { a = ent(1, 9); b = ent(2, 9); c = ent(1, 9); d = ent(2, 9) } while (a === b || c === d || pgcd(c, d) !== 1)
      return aTrou(`Compléter : $${frac(a, b)} \\div ${frac(c, d)} = ${frac(a, b)} \\times \\ldots$`, frac(d, c))
    },
  },

  // ================= PUISSANCES =================
  {
    id: '3e-puissance-iteree', theme: 'Puissances', titre: 'Une multiplication répétée est une puissance', programme: P3.iteree, competence: 0,
    generer() {
      const sorte = ent(0, 2)
      if (sorte === 0) {
        const a = choix([2, 3, 5, 7, 10, -2, -3, 'a', 'x']), n = ent(3, 7)
        const f = typeof a === 'number' && a < 0 ? `(${a})` : String(a)
        return { enonce: `Écrire sous la forme d'une puissance : $${Array(n).fill(f).join(' \\times ')}$`, reponse: `${f}^{${n}}` }
      }
      const [a, n] = choix<[number, number]>([[2, 3], [2, 4], [2, 5], [3, 2], [3, 3], [4, 3], [5, 3], [-2, 3], [-2, 4], [-3, 2], [-1, 7], [-1, 6], [10, 4], [-5, 2]])
      const f = a < 0 ? `(${a})` : String(a)
      if (sorte === 1) return { enonce: `Calculer : $${f}^{${n}}$`, reponse: nb(a ** n) }
      return { enonce: `Écrire $${f}^{${n}}$ sous la forme d'un produit, puis le calculer.`, reponse: `${Array(n).fill(f).join(' \\times ')} = ${nb(a ** n)}` }
    },
    trou() {
      const a = choix([2, 3, 5, 7, 9]), n = ent(3, 6)
      return unTrou('', [[`$${Array(n).fill(a).join(' \\times ')} = ${a}^{\\ldots}$`, nb(n)], [`$${Array(n).fill(a).join(' \\times ')} = \\ldots^{${n}}$`, nb(a)]])
    },
  },
  {
    id: '3e-produit-meme-nombre', theme: 'Puissances', titre: 'Multiplier des puissances d’un même nombre', programme: P3.memeNombre, competence: 1,
    generer() {
      const a = choix(['2', '3', '5', '7', '10', 'a', 'x', '(-2)']), m = ent(2, 9), n = ent(2, 9)
      if (Math.random() < 0.25) { const p = ent(2, 5); return { enonce: `Écrire sous la forme d'une seule puissance : $${a}^{${m}} \\times ${a}^{${n}} \\times ${a}^{${p}}$`, reponse: `${a}^{${m + n + p}}` } }
      return { enonce: `Écrire sous la forme d'une seule puissance : $${a}^{${m}} \\times ${a}^{${n}}$`, reponse: `${a}^{${m + n}}` }
    },
    trou() {
      const a = ent(2, 9), m = ent(2, 8), n = ent(2, 8)
      return unTrou('', [[`$${a}^{${m}} \\times ${a}^{\\ldots} = ${a}^{${m + n}}$`, nb(n)], [`$${a}^{${m}} \\times ${a}^{${n}} = ${a}^{\\ldots}$`, nb(m + n)]])
    },
  },
  {
    id: '3e-produit-meme-exposant', theme: 'Puissances', titre: 'Multiplier des puissances de même exposant', programme: P3.memeExposant, competence: 2,
    generer() {
      const [a, b] = choix<[string, string]>([['2', '5'], ['4', '5'], ['2', '3'], ['3', '4'], ['5', '2'], ['2', '7'], ['3', '3'], ['a', 'b'], ['x', 'y'], ['2', 'a']]), n = ent(2, 9)
      const produit = /^\d+$/.test(a) && /^\d+$/.test(b) ? String(Number(a) * Number(b)) : `(${a}${/^\d/.test(b) ? ' \\times ' : ''}${b})`
      if (Math.random() < 0.3 && /^\d+$/.test(a) && /^\d+$/.test(b) && Number(a) * Number(b) === 10) return { enonce: `Calculer : $${a}^{${n}} \\times ${b}^{${n}}$`, reponse: `10^{${n}} = ${grandNb(10 ** n)}` }
      return { enonce: `Écrire sous la forme d'une seule puissance : $${a}^{${n}} \\times ${b}^{${n}}$`, reponse: `${produit}^{${n}}` }
    },
    trou() {
      const [a, b] = choix<[number, number]>([[2, 5], [2, 3], [3, 4], [4, 5], [2, 7]]), n = ent(2, 9)
      return unTrou('', [[`$${a}^{${n}} \\times ${b}^{${n}} = \\ldots^{${n}}$`, nb(a * b)], [`$${a}^{${n}} \\times \\ldots^{${n}} = ${a * b}^{${n}}$`, nb(b)]])
    },
  },

  // ================= RACINE CARRÉE =================
  reprendre4e('4e-carres', { id: '3e-carres', theme: 'Racine carrée', competence: 0, programme: P3.carres, titre: 'Les carrés des entiers de 0 à 12' }),

  // ================= MULTIPLES ET DIVISEURS =================
  {
    id: '3e-decomposer', theme: 'Multiples et diviseurs', titre: 'Décomposer en produit de facteurs premiers', programme: P3.factoriser, competence: 0,
    generer() {
      let n: number
      do { n = choix([2, 2, 2, 3, 3, 5, 7]) ** ent(1, 3) * choix([3, 5, 7, 11, 3, 5]) * choix([1, 2, 3, 5]) } while (n < 20 || n > 400 || facteursPremiers(n).split('\\times').length < 2)
      return { enonce: `Décomposer $${n}$ en produit de facteurs premiers.`, reponse: facteursPremiers(n) }
    },
  },
  {
    id: '3e-simplifier-table', theme: 'Multiples et diviseurs', titre: 'Simplifier une fraction avec les tables', programme: P3.simplifier, competence: 1,
    generer() {
      let a: number, b: number, k: number
      do { k = ent(2, 9); a = ent(1, 9); b = ent(2, 9) } while (a === b || pgcd(a, b) !== 1)
      return { enonce: choix([`Simplifier : $${frac(a * k, b * k)}$`, `Rendre irréductible : $${frac(a * k, b * k)}$`]), reponse: frac(a, b) }
    },
    trou() {
      let a: number, b: number, k: number
      do { k = ent(2, 9); a = ent(1, 9); b = ent(2, 9) } while (a === b || pgcd(a, b) !== 1)
      return unTrou('', [[`$${frac(a * k, b * k)} = ${fr(a, '\\ldots')}$`, nb(b)], [`$${frac(a * k, b * k)} = ${fr('\\ldots', b)}$`, nb(a)]])
    },
  },
  {
    id: '3e-denominateur-commun', theme: 'Multiples et diviseurs', titre: 'Un dénominateur commun', programme: P3.denominateur, competence: 2,
    generer() {
      const [d1, d2] = choix<[number, number]>([[4, 6], [6, 8], [6, 9], [4, 10], [8, 12], [10, 15], [6, 10], [9, 12], [3, 4], [5, 6], [4, 5], [12, 18]])
      if (Math.random() < 0.5) {
        const a = ent(1, d1 - 1), b = ent(1, d2 - 1)
        return { enonce: `Donner le plus petit dénominateur commun aux fractions $${frac(a, d1)}$ et $${frac(b, d2)}$.`, reponse: nb(ppcm(d1, d2)) }
      }
      // Trois fractions à ranger, sur un dénominateur commun simple
      const D = ppcm(d1, d2)
      let vals: [number, number][]
      do { vals = [[ent(1, d1 - 1), d1], [ent(1, d2 - 1), d2], [ent(1, D - 1), D]] } while (new Set(vals.map(([n, d]) => n * D / d)).size < 3 || vals.some(([n, d]) => pgcd(n, d) !== 1))
      const ranges = [...vals].sort((x, y) => x[0] * D / x[1] - y[0] * D / y[1])
      return { enonce: `Ranger dans l'ordre croissant : $${melange(vals).map(([n, d]) => frac(n, d)).join(' \\; ; \\; ')}$`, reponse: ranges.map(([n, d]) => frac(n, d)).join(' < ') }
    },
  },
  reprendre4e('4e-ranger-ecritures', { id: '3e-ranger-ecritures', theme: 'Multiples et diviseurs', competence: 2, programme: P3.denominateur }),
  {
    id: '3e-divisibilite', theme: 'Multiples et diviseurs', titre: 'Les critères de divisibilité par 2, 3, 5, 9', programme: P3.divisibilite, competence: 3,
    generer() {
      if (Math.random() < 0.55) {
        let n: number
        do { n = ent(100, 9999) } while (![2, 3, 5, 9].some(d => n % d === 0))
        const oui = [2, 3, 5, 9].filter(d => n % d === 0)
        return { enonce: `Parmi $2$, $3$, $5$ et $9$, par quels nombres $${grandNb(n)}$ est-il divisible ?`, reponse: mot(`par ${etL(oui.map(d => `$${d}$`))}`) }
      }
      // Le chiffre manquant : une seule réponse possible
      // Par 9 : un seul chiffre convient (sauf quand 0 et 9 conviennent tous deux, qu'on écarte)
      const d = 9
      let gauche: number, droite: number, bons: number[]
      do {
        gauche = ent(1, 9); droite = ent(0, 9)
        bons = Array.from({ length: 10 }, (_, c) => c).filter(c => Number(`${gauche}${c}${droite}`) % d === 0)
      } while (bons.length !== 1)
      return { enonce: `Quel chiffre écrire à la place de … pour que le nombre $${gauche}\\ldots${droite}$ soit divisible par $${d}$ ?`, reponse: nb(bons[0]) }
    },
  },

  // ================= CALCUL LITTÉRAL ET ALGÉBRIQUE =================
  {
    id: '3e-equations', theme: 'Calcul littéral et algébrique', titre: 'Résoudre ax = c, x + b = c, ax + b = c', programme: P3.equations, competence: 0,
    generer() {
      const x = choix(['x', 'y', 't']), sorte = ent(0, 2)
      if (sorte === 0) { const b = relNonNul(1, 15), c = ent(-15, 15); return { enonce: `Résoudre : $${x} ${b < 0 ? '-' : '+'} ${Math.abs(b)} = ${c}$`, reponse: `${x} = ${nb(c - b)}` } }
      if (sorte === 1) {
        const a = relNonNul(2, 9), c = ent(-30, 30) || 7
        return { enonce: `Résoudre : $${a}${x} = ${c}$`, reponse: `${x} = ${c % a === 0 ? nb(c / a) : (c / a < 0 ? '-' : '') + irreductible(Math.abs(c), Math.abs(a))}` }
      }
      const a = ent(2, 9), s = ent(-6, 12), b = relNonNul(1, 15), c = a * s + b
      return { enonce: choix([`Résoudre : $${affine(a, b, x)} = ${c}$`, `Déterminer la solution de l'équation : $${affine(a, b, x)} = ${c}$`]), reponse: `${x} = ${nb(s)}` }
    },
  },
  {
    id: '3e-reduire', theme: 'Calcul littéral et algébrique', titre: 'Réduire une expression', programme: P3.reduire, competence: 1,
    generer() {
      const x = choix(['a', 'x', 'y'])
      if (Math.random() < 0.4) {
        let a: number, b: number, c: number, d: number
        do { a = relNonNul(1, 9); b = relNonNul(1, 9); c = relNonNul(1, 9); d = relNonNul(1, 9) } while (a + c === 0)
        const e = `${affine(a, b, x)} ${c < 0 ? '-' : '+'} ${Math.abs(c) === 1 ? x : `${Math.abs(c)}${x}`} ${d < 0 ? '-' : '+'} ${Math.abs(d)}`
        return { enonce: `Réduire : $${e}$`, reponse: affine(a + c, b + d, x) }
      }
      let a: number, b: number, k: number, c: number, d: number, signe: number
      do { a = relNonNul(1, 9); b = relNonNul(1, 9); k = ent(2, 6); c = ent(1, 5); d = relNonNul(1, 9); signe = choix([1, -1]) } while (a + signe * k * c === 0 || b + signe * k * d === 0)
      return { enonce: `Réduire l'expression : $${affine(a, b, x)} ${signe < 0 ? '-' : '+'} ${k}(${affine(c, d, x)})$`, reponse: affine(a + signe * k * c, b + signe * k * d, x) }
    },
  },
  {
    id: '3e-valeur', theme: 'Calcul littéral et algébrique', titre: 'La valeur d’une expression', programme: P3.valeur, competence: 2,
    generer() {
      const x = choix(['x', 'a', 't']), v = relNonNul(1, 5), a = ent(2, 5), b = relNonNul(1, 9), c = relNonNul(1, 9)
      const [e, r] = choix<[string, number]>([
        [`${a}${x}^2 ${b < 0 ? '-' : '+'} ${Math.abs(b)}${x} ${c < 0 ? '-' : '+'} ${Math.abs(c)}`, a * v * v + b * v + c],
        [`${x}^2 ${b < 0 ? '-' : '+'} ${Math.abs(b)}`, v * v + b],
        [`${a}${x}^3`, a * v ** 3],
        [`${affine(a, b, x)}`, a * v + b],
        [`(${x} ${b < 0 ? '-' : '+'} ${Math.abs(b)})^2`, (v + b) ** 2],
      ])
      return { enonce: `Calculer $${e}$ pour $${x} = ${nb(v)}$.`, reponse: nb(r) }
    },
  },
  {
    id: '3e-nature', theme: 'Calcul littéral et algébrique', titre: 'Somme, différence, produit ou quotient ?', programme: P3.nature, competence: 3,
    generer() {
      const x = choix(['x', 'a', 'y']), a = ent(2, 9), b = ent(1, 9), c = ent(2, 9)
      const [e, n] = choix<[string, string]>([
        [`${a}${x} + ${b}`, 'une somme'], [`${a}(${x} + ${b})`, 'un produit'], [`${b} - ${a}${x}`, 'une différence'], [`\\frac{${x} + ${b}}{${c}}`, 'un quotient'],
        [`(${x} + ${b})(${x} - ${c})`, 'un produit'], [`${a}${x}^2 - ${b}`, 'une différence'], [`(${x} - ${b})^2 + ${c}`, 'une somme'], [`(${a}${x} + ${b}) \\div ${c}`, 'un quotient'],
      ])
      return { enonce: `L'expression $${e}$ est-elle une somme, une différence, un produit ou un quotient ?`, reponse: mot(n) }
    },
  },
  {
    id: '3e-developper-factoriser', theme: 'Calcul littéral et algébrique', titre: 'Développer et factoriser une expression simple', programme: P3.developper, competence: 4,
    generer() {
      const x = choix(['x', 'a', 'y']), k = ent(2, 9), a = ent(1, 9), b = relNonNul(1, 9)
      const sorte = ent(0, 3)
      if (sorte === 0) return { enonce: `Développer : $${k}(${affine(a, b, x)})$`, reponse: affine(k * a, k * b, x) }
      if (sorte === 1) return { enonce: `Développer : $-${k}(${affine(a, b, x)})$`, reponse: affine(-k * a, -k * b, x) }
      if (sorte === 2) {
        let p: number, q: number
        do { p = ent(1, 6); q = relNonNul(1, 9) } while (pgcd(p, Math.abs(q)) !== 1)
        return { enonce: `Factoriser : $${affine(k * p, k * q, x)}$`, reponse: `${k}(${affine(p, q, x)})` }
      }
      return { enonce: `Factoriser : $${x}^2 ${b < 0 ? '-' : '+'} ${Math.abs(b)}${x}$`, reponse: `${x}(${affine(1, b, x)})` }
    },
    trou() {
      const x = choix(['x', 'a', 'y']), k = ent(2, 9), a = ent(1, 6), b = relNonNul(1, 9)
      return unTrou('', [[`$${affine(k * a, k * b, x)} = ${k}(\\ldots)$`, affine(a, b, x)], [`$${k}(${affine(a, b, x)}) = ${affine(k * a, 0, x)} \\ldots$`, `${k * b < 0 ? '-' : '+'} ${Math.abs(k * b)}`]])
    },
  },
  {
    id: '3e-pair-impair', theme: 'Calcul littéral et algébrique', titre: 'Écrire un nombre pair, un nombre impair', programme: P3.pair, competence: 5,
    generer() {
      const n = choix(['n', 'k', 'p']), sorte = ent(0, 4)
      if (sorte === 0) return { enonce: `$${n}$ est un nombre entier. Écrire en fonction de $${n}$ un nombre pair.`, reponse: `2${n}` }
      if (sorte === 1) return { enonce: `$${n}$ est un nombre entier. Écrire en fonction de $${n}$ un nombre impair.`, reponse: `2${n} + 1` }
      if (sorte === 2) { const j = ent(1, 3); return { enonce: `$${n}$ est un nombre entier. Quel est le ${j === 1 ? '' : j === 2 ? 'deuxième ' : 'troisième '}nombre pair qui suit $2${n}$ ?`, reponse: `2${n} + ${2 * j}` } }
      if (sorte === 3) return { enonce: `$${n}$ est un nombre entier. Quel est le nombre impair qui suit $2${n} + 1$ ?`, reponse: `2${n} + 3` }
      return { enonce: `$${n}$ est un nombre entier. Écrire en fonction de $${n}$ la somme des deux nombres impairs $2${n} + 1$ et $2${n} + 3$.`, reponse: `4${n} + 4` }
    },
  },
  {
    id: '3e-oppose', theme: 'Calcul littéral et algébrique', titre: 'L’opposé d’une expression', programme: P3.oppose, competence: 6,
    generer() {
      const x = choix(['x', 'a', 'y']), a = relNonNul(1, 9), b = relNonNul(1, 9), c = ent(1, 15)
      if (Math.random() < 0.5) return { enonce: `Supprimer les parenthèses : $-(${affine(a, b, x)})$`, reponse: affine(-a, -b, x) }
      return { enonce: `Réduire : $${c} - (${affine(a, b, x)})$`, reponse: affine(-a, c - b, x) }
    },
    trou() {
      const x = choix(['x', 'a', 'y']), a = relNonNul(1, 9), b = relNonNul(1, 9)
      return aTrou(`Compléter : $-(${affine(a, b, x)}) = \\ldots$`, affine(-a, -b, x))
    },
  },

  // ================= REPÉRAGE (la même liste qu'en 4e) =================
  reprendre4e('4e-placer-droite', { id: '3e-placer-droite', theme: 'Repérage', competence: 0, programme: P3.placer }),
  reprendre4e('4e-abscisse-relatif', { id: '3e-abscisse-relatif', theme: 'Repérage', competence: 1, programme: P3.reperer }),
  reprendre4e('4e-coordonnees', { id: '3e-coordonnees', theme: 'Repérage', competence: 2, programme: P3.lire }),
  reprendre4e('4e-placer-point', { id: '3e-placer-point', theme: 'Repérage', competence: 3, programme: P3.placerPoint }),

  // ================= REPRÉSENTATION DE L'ESPACE =================
  {
    id: '3e-reconnaitre-solide', theme: 'Représentation de l’espace', titre: 'Reconnaître un solide', programme: P3.solides, competence: 0,
    generer() {
      const [s, nom] = choix<[F.Solide, string]>([['cube', 'un cube'], ['pave', 'un pavé droit'], ['cylindre', 'un cylindre'], ['prisme3', 'un prisme droit'], ['prisme5', 'un prisme droit'], ['pyramide', 'une pyramide'], ['pyramide', 'une pyramide'], ['cone', 'un cône'], ['cone', 'un cône']])
      return { enonce: choix(['Comment s\'appelle ce solide ?', 'Quel est le nom de ce solide ?']), figure: F.solide(s), reponse: mot(nom) }
    },
  },
  reprendre4e('4e-volume-pyramide-cone', { id: '3e-volume-pyramide-cone', theme: 'Représentation de l’espace', competence: 1, programme: P3.volumes }),
  {
    id: '3e-faces-pyramide', theme: 'Représentation de l’espace', titre: 'Les faces d’une pyramide', programme: P3.face, competence: 2,
    generer() {
      const [n, nom] = choix(POLYGONES_BASE), sorte = ent(0, 3)
      if (sorte === 0) { const [S, A, B] = pts(3); return { enonce: `Voici une pyramide de sommet $${S}$. Quelle est la nature de sa face $${S}${A}${B}$, qui contient le sommet ?`, figure: F.solide('pyramide'), reponse: mot('un triangle') } }
      if (sorte === 1) return { enonce: `Combien de faces a une pyramide à base ${nom} ?`, reponse: nb(n + 1) }
      if (sorte === 2) return { enonce: `Une pyramide a $${n + 1}$ faces. Quelle est la nature de sa base ?`, reponse: mot(NOM_POLYGONE[n]) }
      return { enonce: `Une pyramide a pour base ${NOM_POLYGONE[n].replace('quadrilatère', 'carré')}. Combien de ses faces sont des triangles ?`, reponse: nb(n) }
    },
  },
  {
    id: '3e-patron-pyramide', theme: 'Représentation de l’espace', titre: 'Le patron d’une pyramide', programme: P3.patron, competence: 3,
    generer() {
      const [n, nom] = choix(POLYGONES_BASE), sorte = ent(0, 2)
      if (sorte === 0) return { enonce: `De quels polygones est fait le patron d'une pyramide à base ${nom} ?`, reponse: mot(`${NOM_POLYGONE[n].replace('quadrilatère', 'carré')} et $${n}$ triangles`) }
      if (sorte === 1) return { enonce: `Le patron d'une pyramide est fait d'${NOM_POLYGONE[n].replace('quadrilatère', 'carré')} et de $${n}$ triangles. Combien la pyramide a-t-elle d'arêtes ?`, reponse: nb(2 * n) }
      return { enonce: `Combien de triangles faut-il dessiner pour le patron d'une pyramide à base ${nom} ?`, reponse: nb(n) }
    },
  },

  // ================= TRIANGLES =================
  reprendre4e('4e-cercle-circonscrit', { id: '3e-cercle-circonscrit', theme: 'Triangles', competence: 0, programme: P3.cercle }),
  {
    id: '3e-egalite-pythagore', theme: 'Triangles', titre: 'Écrire l’égalité de Pythagore', programme: P3.pythagore, competence: 1,
    generer() {
      const [A, B, C] = melange(tri()), [x, y] = melange([B, C])
      if (Math.random() < 0.7) return { enonce: `$${A}${B}${C}$ est rectangle en $${A}$. Écrire l'égalité de Pythagore.`, reponse: `${B}${C}^2 = ${A}${x}^2 + ${A}${y}^2` }
      return { enonce: `$${A}${B}${C}$ est rectangle en $${A}$. Quel côté est l'hypoténuse ?`, reponse: mot(`$[${B}${C}]$`) }
    },
    trou() {
      const [A, B, C] = melange(tri())
      return aTrou(`$${A}${B}${C}$ est rectangle en $${A}$. Compléter : $${B}${C}^2 = ${A}${B}^2 + \\ldots$`, `${A}${C}^2`)
    },
  },
  {
    id: '3e-droite-milieux', theme: 'Triangles', titre: 'La droite des milieux', programme: P3.milieux, competence: 2,
    generer() {
      const sorte = ent(0, 2)
      if (sorte === 0) return AUTOMATISMES_4E.find(a => a.id === '4e-droite-milieux')!.generer()
      const [A, B, C, I, J] = pts(5)
      if (sorte === 1) return { enonce: `Dans le triangle $${A}${B}${C}$, $${I}$ est le milieu de $[${A}${B}]$ et $${J}$ le milieu de $[${A}${C}]$. Que peut-on dire des droites $(${I}${J})$ et $(${B}${C})$ ?`, reponse: mot('elles sont parallèles') }
      return { enonce: `Dans le triangle $${A}${B}${C}$, $${I}$ est le milieu de $[${A}${B}]$, $${J}$ est sur $[${A}${C}]$ et $(${I}${J})$ est parallèle à $(${B}${C})$. Que peut-on dire du point $${J}$ ?`, reponse: mot(`$${J}$ est le milieu de $[${A}${C}]$`) }
    },
  },

  // ================= TRANSLATIONS ET VECTEURS =================
  reprendre4e('4e-image-triangle', { id: '3e-image-triangle', theme: 'Translations et vecteurs', competence: 0, programme: P3.transformations }),

  // ================= STATISTIQUES =================
  {
    id: '3e-moyenne', theme: 'Statistiques', titre: 'Une moyenne', programme: P3.moyenne, competence: 0,
    generer() {
      const n = ent(3, 6)
      let l: number[]
      do { l = Array.from({ length: n }, () => ent(2, 20)) } while ((l.reduce((s, x) => s + x, 0) * 2) % n !== 0)
      return { enonce: `Calculer la moyenne de : $${l.join(' \\; ; \\; ')}$`, reponse: nb(l.reduce((s, x) => s + x, 0) / n) }
    },
  },
  {
    id: '3e-mediane', theme: 'Statistiques', titre: 'Une médiane', programme: P3.mediane, competence: 1,
    generer() {
      const n = choix([5, 6, 7, 4]), l = Array.from({ length: n }, () => ent(2, 25)), t = [...l].sort((a, b) => a - b)
      const m = n % 2 ? t[(n - 1) / 2] : (t[n / 2 - 1] + t[n / 2]) / 2
      return { enonce: `Donner ${n % 2 ? 'la' : 'une'} médiane de la série : $${l.join(' \\; ; \\; ')}$`, reponse: nb(m) }
    },
  },
  {
    id: '3e-etendue', theme: 'Statistiques', titre: 'L’étendue d’une série', programme: P3.etendue, competence: 2,
    generer() {
      const n = ent(5, 7), l = Array.from({ length: n }, () => ent(2, 40))
      if (Math.random() < 0.25) { const e = ent(5, 20), min = ent(2, 15); return { enonce: `Une série a pour plus petite valeur $${min}$ et pour étendue $${e}$. Quelle est sa plus grande valeur ?`, reponse: nb(min + e) } }
      return { enonce: `Calculer l'étendue de la série : $${l.join(' \\; ; \\; ')}$`, reponse: nb(Math.max(...l) - Math.min(...l)) }
    },
  },

  // ================= PROPORTIONNALITÉ =================
  reprendre4e('4e-partage-ratio', { id: '3e-partage-deux', theme: 'Proportionnalité', competence: 0, programme: P3.deuxParts, titre: 'Partager une somme selon un ratio (deux parts)' }),
  {
    id: '3e-partage-trois', theme: 'Proportionnalité', titre: 'Partager une masse selon un ratio (trois parts)', programme: P3.troisParts, competence: 1,
    generer() {
      const r = choix<[number, number, number]>([[1, 2, 3], [1, 1, 2], [2, 3, 5], [1, 2, 2], [1, 3, 4], [2, 2, 1], [3, 4, 5]]), k = choix([10, 20, 25, 50, 100, ent(2, 15)])
      const total = (r[0] + r[1] + r[2]) * k, quoi = choix(['g de farine', 'kg de sable', 'g de chocolat', 'kg de terreau'])
      const u = quoi.split(' ')[0]
      return { enonce: `On partage $${total}$ ${quoi} en trois parts selon le ratio $${r.join(' : ')}$. Quelles sont les trois parts ?`, reponse: `${r[0] * k}\\text{ ${u}}, ${r[1] * k}\\text{ ${u} et }${r[2] * k}\\text{ ${u}}` }
    },
  },
  {
    id: '3e-partage-ages', theme: 'Proportionnalité', titre: 'Partager proportionnellement à des âges', programme: P3.ages, competence: 2,
    generer() {
      const [a, b] = choix<[number, number]>([[20, 30], [10, 15], [12, 18], [8, 12], [6, 9], [10, 30], [14, 21], [15, 25]]), k = choix([1, 2, 3, 4, 5, 10])
      const total = (a + b) * k
      const [X, Y] = melange(PRENOMS).slice(0, 2)
      return { enonce: `${X} a $${a}$ ans et ${Y} a $${b}$ ans. On partage $${total}$ € entre eux proportionnellement à leur âge. Quelle est la part de chacun ?`, reponse: mot(`${X} : $${a * k}$ €, ${Y} : $${b * k}$ €`) }
    },
  },
  {
    id: '3e-pourcentage', theme: 'Proportionnalité', titre: 'Le pourcentage d’une quantité', programme: P3.pourcentage, competence: 3,
    generer() {
      const t = choix([5, 15, 20, 30, 40, 60, 75, 12, 35]), q = choix([20, 40, 60, 80, 120, 200, 300, 500, 250])
      if (!Number.isInteger(t * q / 100)) return { enonce: `Calculer $${t}\\,\\%$ de $${q * 4}$.`, reponse: nb(t * q * 4 / 100) }
      const quoi = choix(['', ' €', ' élèves', ' g'])
      return { enonce: `Calculer $${t}\\,\\%$ de $${q}$${quoi}.`, reponse: quoi.trim() ? (quoi.trim() === '€' ? unite(nb(t * q / 100), '€') : mot(`$${nb(t * q / 100)}$${quoi}`)) : nb(t * q / 100) }
    },
  },
  {
    id: '3e-echelle', theme: 'Proportionnalité', titre: 'Une distance sur une carte', programme: P3.echelle, competence: 4,
    generer() {
      const e = choix([100000, 200000, 250000, 500000, 1000000, 50000]), d = choix([ent(2, 12), ent(3, 19) / 2])
      const [V1, V2] = melange(VILLES).slice(0, 2), km = d * e / 100000
      return { enonce: `Sur une carte à l'échelle $${fr(1, grandNb(e))}$, ${V1} et ${V2} sont à $${nb(d)}$ cm. Quelle est la distance réelle entre ces villes ?`, reponse: unite(nb(km), 'km') }
    },
  },
  reprendre4e('4e-augmentation', { id: '3e-evolution', theme: 'Proportionnalité', competence: 5, programme: P3.evolution }),
]

// ---------- Les questions de cours de 3e (rien de fixe) ----------
export const n3 = (theme: string, liste: [string, ...Facon[]][]) => notions(theme, liste, '3e-')
export const COURS_3E: QuestionCours[] = [
  ...n3('Nombres rationnels', [
    ['Diviser par une fraction',
      () => { let a: number, b: number; do { a = ent(1, 9); b = ent(2, 9) } while (a === b || pgcd(a, b) !== 1); return [`Diviser par $${frac(a, b)}$ revient à…`, `multiplier par son inverse, $${frac(b, a)}$`] }],
    ['Multiplier deux fractions',
      () => { const a = ent(1, 9), b = ent(2, 9), c = ent(1, 9), d = ent(2, 9); return [`Comment calcule-t-on $${frac(a, b)} \\times ${frac(c, d)}$ ?`, `on multiplie les numérateurs entre eux et les dénominateurs entre eux : $${fr(`${a} \\times ${c}`, `${b} \\times ${d}`)}$`] }],
    ['Additionner deux fractions',
      () => { const [d1, d2] = choix<[number, number]>([[3, 8], [4, 6], [5, 2], [6, 9], [3, 4]]); return [`Que faut-il faire avant d'additionner $${frac(ent(1, 9), d1)}$ et $${frac(ent(1, 9), d2)}$ ?`, `les écrire avec le même dénominateur, par exemple $${ppcm(d1, d2)}$`] }],
    ['Une fraction irréductible',
      () => { const k = ent(2, 9), a = ent(1, 9), b = ent(2, 9); return [`Pourquoi la fraction $${frac(a * k, b * k)}$ n'est-elle pas irréductible ?`, `son numérateur et son dénominateur sont tous deux divisibles par $${k}$`] },
      () => { const n = choix(['a', 'n', 'p']), d = choix(['b', 'd', 'q']); return [`Quand dit-on que la fraction $${fr(n, d)}$ est irréductible ?`, `quand $${n}$ et $${d}$ n'ont pas d'autre diviseur commun que $1$`] }],
  ]),
  ...n3('Puissances', [
    ['Une puissance',
      () => { const a = ent(2, 9), n = ent(3, 7); return [`Que signifie $${a}^{${n}}$ ?`, `le produit de $${n}$ facteurs tous égaux à $${a}$`] }],
    ['Produit de puissances d’un même nombre',
      () => { const m = ent(2, 9), n = ent(2, 9), a = choix(['a', 'x', 'b']); return [`Que vaut $${a}^{${m}} \\times ${a}^{${n}}$ ?`, `$${a}^{${m + n}}$ : on ajoute les exposants`] }],
    ['Produit de puissances de même exposant',
      () => { const n = ent(2, 9), [a, b] = choix([['a', 'b'], ['x', 'y'], ['u', 'v']]); return [`Que vaut $${a}^{${n}} \\times ${b}^{${n}}$ ?`, `$(${a} \\times ${b})^{${n}}$ : on multiplie les nombres et on garde l'exposant`] }],
  ]),
  ...n3('Racine carrée', [
    ['Les carrés à connaître',
      () => { const n = ent(2, 12); return [`Quel nombre positif a pour carré $${n * n}$ ?`, `$${n}$, car $${n}^2 = ${n * n}$`] },
      () => { const n = ent(2, 12); return [`Que vaut $\\sqrt{${n * n}}$ ?`, `$${n}$, car $${n}^2 = ${n * n}$ et $${n}$ est positif`] }],
    ['Le carré d’un nombre',
      () => { const n = ent(2, 12); return [`Que vaut $(-${n})^2$ ?`, `$${n * n}$, comme $${n}^2$ : un carré n'est jamais négatif`] }],
  ]),
  ...n3('Multiples et diviseurs', [
    ['Un nombre premier',
      () => { const p = choix([7, 11, 13, 17, 19, 23, 29, 31]); return [`Pourquoi $${p}$ est-il un nombre premier ?`, `il a exactement deux diviseurs : $1$ et $${p}$`] }],
    ['Divisibilité par 3 et par 9',
      () => { const d = choix([3, 9]); return [`À quoi voit-on qu'un entier est divisible par $${d}$ ?`, `la somme de ses chiffres est divisible par $${d}$`] }],
    ['Divisibilité par 2 et par 5',
      () => { const d = choix([2, 5]); return [`À quoi voit-on qu'un entier est divisible par $${d}$ ?`, d === 2 ? 'son chiffre des unités est $0$, $2$, $4$, $6$ ou $8$' : 'son chiffre des unités est $0$ ou $5$'] }],
    ['Décomposer en facteurs premiers',
      () => { const n = choix([12, 18, 20, 28, 30, 45, 50, 60, 84]); return [`Que veut dire « décomposer $${n}$ en produit de facteurs premiers » ?`, `l'écrire comme un produit de nombres premiers : $${n} = ${facteursPremiers(n)}$`] }],
  ]),
  ...n3('Calcul littéral et algébrique', [
    ['La distributivité simple',
      () => { const k = choix(['k', 'a']), [b, c] = choix([['b', 'c'], ['x', 'y'], ['m', 'n']]); return [`Développer $${k}(${b} + ${c})$`, `$${k}${b} + ${k}${c}$`] }],
    ['L’opposé d’une somme',
      () => { const [a, b, c] = choix([['a', 'b', 'c'], ['x', 'y', 'z'], ['m', 'n', 'p']]); return [`Que devient $-(${a} - ${b} + ${c})$ sans parenthèses ?`, `$-${a} + ${b} - ${c}$ : on change le signe de chaque terme`] }],
    ['Pair et impair',
      () => { const n = choix(['n', 'k', 'p']); return choix<[string, string]>([[`Avec $${n}$ entier, comment s'écrit un nombre pair ?`, `$2${n}$`], [`Avec $${n}$ entier, comment s'écrit un nombre impair ?`, `$2${n} + 1$`]]) }],
    ['Somme ou produit',
      () => { const a = ent(2, 9), b = ent(1, 9), x = choix(['x', 'a']); return [`Pourquoi $${a}(${x} + ${b})$ est-il un produit ?`, 'la dernière opération à effectuer est une multiplication'] }],
    ['Résoudre une équation',
      () => { const a = ent(2, 9), x = choix(['x', 't']); return [`Comment résout-on $${a}${x} = c$ ?`, `on divise les deux membres par $${a}$ : $${x} = ${fr('c', a)}$`] }],
  ]),
  ...n3('Repérage', [
    ['L’ordre des coordonnées',
      () => { const x = relNonNul(1, 6), y = relNonNul(1, 6); return [`Dans le couple $${coord(x, y)}$, que donne le premier nombre ?`, 'l\'abscisse, lue sur l\'axe horizontal'] }],
  ]),
  ...n3('Représentation de l’espace', [
    ['Le volume d’une pyramide',
      () => { const s = choix(['pyramide', 'cône']); return [`Quelle est la formule du volume d'un${s === 'cône' ? '' : 'e'} ${s} ?`, s === 'cône' ? '$\\frac{1}{3} \\times \\pi r^2 \\times h$' : '$\\frac{1}{3} \\times \\text{aire de la base} \\times \\text{hauteur}$'] }],
    ['Les faces d’une pyramide',
      () => { const [n, nom] = choix(POLYGONES_BASE); return [`Combien une pyramide à base ${nom} a-t-elle de faces triangulaires ?`, `$${n}$, une par côté de la base`] }],
  ]),
  ...n3('Triangles', [
    ['Le cercle circonscrit à un triangle rectangle',
      () => { const [A, B, C] = tri(); return [`$${A}${B}${C}$ est rectangle en $${A}$. Où est le centre de son cercle circonscrit ?`, `au milieu de l'hypoténuse $[${B}${C}]$`] }],
    ['L’égalité de Pythagore',
      () => { const [A, B, C] = tri(); return [`$${A}${B}${C}$ est rectangle en $${C}$. Que vaut $${A}${B}^2$ ?`, `$${C}${A}^2 + ${C}${B}^2$`] }],
    ['La droite des milieux',
      () => { const [A, B, C] = tri(); return [`Dans $${A}${B}${C}$, la droite passe par les milieux de $[${A}${B}]$ et de $[${A}${C}]$. Que dire de cette droite ?`, `elle est parallèle à $(${B}${C})$`] },
      () => { const [A, B, C] = tri(); return [`Dans $${A}${B}${C}$, combien mesure le segment qui joint les milieux de $[${A}${B}]$ et de $[${A}${C}]$ ?`, `la moitié de $${B}${C}$`] }],
  ]),
  ...n3('Translations et vecteurs', [
    ['Les transformations',
      () => { const [A, B] = pts(2); return choix<[string, string]>([[`Par la symétrie de centre $${A}$, que devient le point $${A}$ ?`, `il reste $${A}$ : le centre est sa propre image`], [`Par la translation qui transforme $${A}$ en $${B}$, que conserve-t-on ?`, 'les longueurs, les angles et les aires'], [`Par la symétrie d'axe $(${A}${B})$, que deviennent les points $${A}$ et $${B}$ ?`, 'ils ne bougent pas : ils sont sur l\'axe']]) }],
  ]),
  ...n3('Statistiques', [
    ['La médiane',
      () => { const n = choix([5, 7, 9, 11]); return [`Une série a $${n}$ valeurs rangées dans l'ordre. Quelle valeur est la médiane ?`, `la $${(n + 1) / 2}$e`] }],
    ['L’étendue',
      () => { const s = choix(['notes', 'tailles', 'temps']); return [`Comment calcule-t-on l'étendue d'une série de ${s} ?`, 'plus grande valeur moins plus petite valeur'] }],
    ['La moyenne',
      () => { const n = ent(4, 9); return [`Comment calcule-t-on la moyenne de $${n}$ valeurs ?`, `on les additionne, puis on divise la somme par $${n}$`] }],
  ]),
  ...n3('Proportionnalité', [
    ['Le coefficient d’une hausse ou d’une baisse',
      () => { const t = choix([2, 5, 8, 10, 15, 20, 25, 30]), h = Math.random() < 0.5; return [`Par quel nombre multiplie-t-on un prix ${h ? 'augmenté' : 'baissé'} de $${t}\\,\\%$ ?`, `$${nb(1 + (h ? t : -t) / 100)}$`] }],
    ['L’échelle d’une carte',
      () => { const e = choix([25000, 50000, 100000, 200000]); return [`Que signifie une échelle de $${fr(1, grandNb(e))}$ ?`, `$1$ cm sur la carte représente $${grandNb(e)}$ cm en vrai`] }],
    ['Partager selon un ratio',
      () => { const [p, q] = choix([[2, 3], [1, 4], [3, 5], [2, 7]]); return [`Partager selon le ratio $${p} : ${q}$, qu'est-ce que cela veut dire ?`, `faire $${p + q}$ parts égales : la première personne en reçoit $${p}$, la seconde $${q}$`] }],
    ['Le pourcentage d’une quantité',
      () => { const t = choix([5, 12, 20, 35, 60]); return [`Comment calcule-t-on $${t}\\,\\%$ d'une quantité ?`, `on la multiplie par $${frac(t, 100)}$, c'est-à-dire par $${nb(t / 100)}$`] }],
  ]),
]
