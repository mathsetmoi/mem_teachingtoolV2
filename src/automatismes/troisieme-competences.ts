// =============================================================
// LES AUTOMATISMES DE 3e, RANGÉS PAR COMPÉTENCE
// Le professeur a revu la 3e compétence par compétence (du 18 au
// 22 novembre 2026) : pour chacune, les questions de cours et les
// exercices qu'il garde. Ce fichier en fait les deux listes que le flash
// pose, AUTOMATISMES_3E et COURS_3E.
// - Chaque question de cours travaille une compétence de la liste
//   officielle (ou un objectif d'apprentissage) : cocher la compétence
//   pose ses questions de cours. Une compétence sans question de cours
//   pose un exercice à la place ; une compétence sans exercice (le pair et
//   l'impair) ne pose que des questions de cours.
// - Quand le professeur reformule une question de cours, l'ancienne
//   formulation devient un exercice de la même compétence (identifiant
//   « ancien-… ») : on ne la supprime jamais.
// - Ce qu'il ne veut plus voir posé reste dans troisieme.ts
//   (AUTOMATISMES_3E_AVANT, COURS_3E_AVANT), tel quel.
// Ses règles : on ne garde que ce qui correspond exactement à l'intitulé
// de la compétence ; les élèves n'ont pas de calculatrice, donc les calculs
// restent simples ; les questions ne listent jamais les réponses
// possibles ; les réponses sont courtes ; rien n'est fixe, sauf les
// phrases du cours que le professeur a écrites lui-même.
// =============================================================
import * as F from '../figures'
import type { Automatisme, Facon, QuestionCours } from './outils'
import { PRENOMS, aTrou, choix, cm3, ent, etL, frac, grandNb, irreductible, melange, mot, nb, notions, pgcd, piFois, pts, relNonNul, tableau, tri, unite } from './outils'
import { AUTOMATISMES_3E_AVANT, COURS_3E_AVANT, NOM_POLYGONE, VILLES, affine, facteursPremiers, fr, ppcm } from './troisieme'
import { AUTOMATISMES_4E, aligne, surUnTrait } from './quatrieme'
import { rangerSousObjectif } from '../objectifs-flash'
import { PROGRAMME_CYCLE4 } from '../programme-cycle4'

// ---------- Ce qu'on reprend de la liste d'avant ----------
const avant = (id: string): Automatisme => AUTOMATISMES_3E_AVANT.find(a => a.id === id)!
const coursAvant = (theme: string, i: number): QuestionCours => COURS_3E_AVANT.find(c => c.id === `cours-3e-${theme}-${i}`)!
/** La phrase d'une compétence, pour la correction : celle que portaient
 *  déjà les exercices de la liste d'avant */
const phraseDe = (theme: string, competence: number) => AUTOMATISMES_3E_AVANT.find(a => a.theme === theme && a.competence === competence)!.programme!
/** La phrase d'un objectif d'apprentissage de 3e */
const phraseObjectif = (theme: string, k: number) => PROGRAMME_CYCLE4['3e'].flatMap(t => t.domaines).find(d => d.nom === theme || d.nom.startsWith(theme))!.objectifs[k].texte

type Rang = { competence: number } | { objectif: number }
/** Un exercice de la liste officielle, rangé sous sa compétence */
function exo(theme: string, competence: number, id: string, titre: string, generer: Automatisme['generer'], trou?: Automatisme['trou']): Automatisme {
  return { id, theme, titre, competence, programme: phraseDe(theme, competence), generer, ...(trou ? { trou } : {}) }
}
/** Un exercice d'application directe, rangé sous un ou plusieurs objectifs */
function exoObjectif(theme: string, ks: number[], id: string, titre: string, generer: Automatisme['generer'], trou?: Automatisme['trou']): Automatisme {
  rangerSousObjectif('3e', id, theme, ks)
  return { id, theme, titre, application: true, programme: phraseObjectif(theme, ks[0]), generer, ...(trou ? { trou } : {}) }
}
/** Un exercice de la liste d'avant, rangé de nouveau, avec un nouveau tirage */
const refait = (id: string, generer: Automatisme['generer'], trou?: Automatisme['trou']): Automatisme => {
  const a = avant(id)
  return { ...a, generer, trou }
}
/** L'ancienne formulation d'une question de cours, devenue un exercice */
function ancien(theme: string, i: number, k: number, rang: Rang): Automatisme {
  const c = coursAvant(theme, i), f = c.facons[k], id = `ancien-${c.id}-${k + 1}`
  const generer = () => { const [enonce, reponse, figure] = f(); return { enonce, reponse: mot(reponse), ...(figure ? { figure } : {}) } }
  return 'objectif' in rang ? exoObjectif(theme, [rang.objectif], id, c.titre, generer) : exo(theme, rang.competence, id, c.titre, generer)
}

// ---------- Les questions de cours ----------
/** Une notion de cours, rangée sous sa compétence ou son objectif. Une
 *  notion de la liste d'avant garde son identifiant (i) ; une nouvelle a
 *  un numéro à partir de 100. */
function notion(theme: string, i: number, rang: Rang, titre: string, ...facons: Facon[]): QuestionCours {
  const [q] = notions(theme, [[titre, ...facons]], '3e-')
  return { ...q, id: `cours-3e-${theme}-${i}`, ...rang }
}
/** Une phrase à compléter dont le trou change de place : chaque mot entre
 *  crochets peut être le trou (« la [médiane] partage… ») */
function phraseATrou(phrase: string): [string, string] {
  const mots = [...phrase.matchAll(/\[([^\]]+)\]/g)].map(m => m[1])
  const k = ent(0, mots.length - 1)
  let i = -1
  const texte = phrase.replace(/\[([^\]]+)\]/g, (_, m) => (++i === k ? '…' : m))
  return [`Compléter : ${texte.replace('….', '…')}`, mots[k]]
}
/** Les notions dont une façon est une phrase que le professeur a écrite
 *  lui-même, sans rien à tirer au hasard (son choix) */
export const PHRASES_DU_PROFESSEUR_3E = new Set<string>()
const sienne = (q: QuestionCours) => { PHRASES_DU_PROFESSEUR_3E.add(q.id); return q }

const NR = 'Nombres rationnels', PU = 'Puissances', RC = 'Racine carrée', MD = 'Multiples et diviseurs', CL = 'Calcul littéral et algébrique'
const RE = 'Repérage', ES = 'Représentation de l’espace', TR = 'Triangles', TV = 'Translations et vecteurs', ST = 'Statistiques', PR = 'Proportionnalité'

// =============================================================
// LES EXERCICES
// =============================================================
const POINTS_LOSANGE = F.POINTS_LOSANGE
/** Les transformations de la figure aux seize triangles : quatre axes, le
 *  demi-tour de centre le point du milieu, et les translations d'un point
 *  de la figure à un autre */
function transformationsLosange(L: string[]) {
  const P = POINTS_LOSANGE
  const axes: [number, number, (x: number, y: number) => [number, number]][] = [[0, 2, (x, y) => [-x, y]], [1, 3, (x, y) => [x, -y]], [4, 6, (x, y) => [-y, -x]], [7, 5, (x, y) => [y, x]]]
  const liste: { nom: (t: number[], im: number[]) => string; f: (x: number, y: number) => [number, number]; cle: string }[] = []
  for (const [u, w, g] of axes) liste.push({ nom: () => `la symétrie d'axe $(${L[u]}${L[w]})$`, f: g, cle: `axe${u}` })
  liste.push({ nom: () => `le demi-tour de centre $${L[8]}$`, f: (x, y) => [-x, -y], cle: 'centre' })
  const vus = new Set<string>()
  for (let a = 0; a < 9; a++) for (let b = 0; b < 9; b++) {
    if (a === b) continue
    const dx = P[b][0] - P[a][0], dy = P[b][1] - P[a][1]
    if (vus.has(`${dx},${dy}`)) continue
    vus.add(`${dx},${dy}`)
    liste.push({
      // Le nom le plus parlant : un sommet du triangle et son image
      nom: (t, im) => `la translation qui transforme $${L[t[0]]}$ en $${L[im[0]]}$`,
      f: (x, y) => [x + dx, y + dy], cle: `t${dx},${dy}`,
    })
  }
  return liste
}
const indice = (x: number, y: number) => POINTS_LOSANGE.findIndex(([a, b]) => a === x && b === y)
/** Un triangle de la figure : trois points non alignés, reliés par des traits */
function triangleDuLosange(): number[] {
  const P = POINTS_LOSANGE
  let t: number[]
  do { t = melange([0, 1, 2, 3, 4, 5, 6, 7, 8]).slice(0, 3) } while (aligne(t.map(i => P[i])) || ![[0, 1], [1, 2], [0, 2]].every(([u, w]) => surUnTrait(P[t[u]], P[t[w]])))
  return t
}

/** Les nombres premiers jusqu'à 100 */
const PREMIERS = Array.from({ length: 99 }, (_, i) => i + 2).filter(n => Array.from({ length: n - 2 }, (_, k) => k + 2).every(d => n % d !== 0))
const estPremier = (n: number) => PREMIERS.includes(n)

export const AUTOMATISMES_3E: Automatisme[] = [
  // ================= NOMBRES RATIONNELS =================
  // C1 : les trois exercices d'avant, et les anciennes formulations des questions de cours
  avant('3e-fractions-addsub'),
  avant('3e-produit-fractions'),
  avant('3e-diviser-fractions'),
  ancien(NR, 1, 0, { competence: 0 }),
  ancien(NR, 2, 0, { competence: 0 }),
  ancien(NR, 3, 0, { competence: 0 }),
  // OBJ1 et OBJ2 : mettre une fraction sous forme irréductible (des fractions simples)
  ancien(NR, 4, 0, { objectif: 0 }),
  ancien(NR, 4, 1, { objectif: 0 }),
  exoObjectif(NR, [0, 1], '3e-forme-irreductible', 'Écrire une fraction sous forme irréductible',
    () => {
      let a: number, b: number
      do { a = ent(1, 9); b = ent(2, 9) } while (a === b || pgcd(a, b) !== 1)
      const k = ent(2, 6)
      return { enonce: `Écrire $${frac(a * k, b * k)}$ sous forme irréductible.`, reponse: frac(a, b) }
    },
    () => {
      let a: number, b: number
      do { a = ent(1, 9); b = ent(2, 9) } while (a === b || pgcd(a, b) !== 1)
      const k = ent(2, 9)
      return aTrou(`Compléter : $${frac(a * k, b * k)} = ${fr(`${a} \\times ${k}`, `${b} \\times ${k}`)} = ${fr('\\ldots', b)}$`, nb(a))
    }),

  // ================= PUISSANCES =================
  // C1 : écrire en puissance (sans les calculs d'avant), et dans l'autre sens
  refait('3e-puissance-iteree',
    () => {
      const a = choix([2, 3, 5, 7, 10, -2, -3, 'a', 'x']), n = ent(3, 7)
      const f = typeof a === 'number' && a < 0 ? `(${a})` : String(a)
      return { enonce: `Écrire sous la forme d'une puissance : $${Array(n).fill(f).join(' \\times ')}$`, reponse: `${f}^{${n}}` }
    },
    avant('3e-puissance-iteree').trou),
  exo(PU, 0, '3e-puissance-en-produit', 'Une puissance écrite comme un produit', () => {
    const a = ent(2, 9), n = ent(3, 7)
    return { enonce: `Écrire le nombre $${a}^{${n}}$ sous la forme d'un produit de facteurs.`, reponse: Array(n).fill(a).join(' \\times ') }
  }),
  // C2
  avant('3e-produit-meme-nombre'),
  exo(PU, 1, '3e-calculer-meme-nombre', 'Calculer un produit de puissances d’un même nombre', () => {
    const a = choix(['a', 'x', 'b', 'y', 't']), m = ent(2, 9), n = ent(2, 9)
    return { enonce: `Calculer $${a}^{${m}} \\times ${a}^{${n}}$`, reponse: `${a}^{${m + n}}` }
  }),
  // C3 : jamais deux fois le même nombre (3⁴ × 3⁴ s'écrirait aussi 3⁸)
  refait('3e-produit-meme-exposant',
    () => {
      const [a, b] = choix<[string, string]>([['2', '5'], ['4', '5'], ['2', '3'], ['3', '4'], ['5', '2'], ['2', '7'], ['a', 'b'], ['x', 'y'], ['2', 'a']]), n = ent(2, 9)
      const produit = /^\d+$/.test(a) && /^\d+$/.test(b) ? String(Number(a) * Number(b)) : `(${a}${/^\d/.test(b) ? ' \\times ' : ''}${b})`
      if (Math.random() < 0.3 && Number(a) * Number(b) === 10) return { enonce: `Calculer : $${a}^{${n}} \\times ${b}^{${n}}$`, reponse: `10^{${n}} = ${grandNb(10 ** n)}` }
      return { enonce: `Écrire sous la forme d'une seule puissance : $${a}^{${n}} \\times ${b}^{${n}}$`, reponse: `${produit}^{${n}}` }
    },
    avant('3e-produit-meme-exposant').trou),
  exo(PU, 2, '3e-calculer-meme-exposant', 'Calculer un produit de puissances de même exposant', () => {
    const [a, b] = choix([['x', 'y'], ['a', 'b'], ['u', 'v'], ['m', 'n']]), n = ent(2, 9)
    return { enonce: `Calculer $${a}^{${n}} \\times ${b}^{${n}}$`, reponse: `(${a}${b})^{${n}}` }
  }),

  // ================= RACINE CARRÉE =================
  avant('3e-carres'),
  ancien(RC, 1, 0, { competence: 0 }),
  ancien(RC, 1, 1, { competence: 0 }),

  // ================= MULTIPLES ET DIVISEURS =================
  // C1 : décomposer un nombre pas trop grand ; à trou pour les plus grands
  refait('3e-decomposer',
    () => {
      let n: number
      do { n = ent(12, 100) } while (estPremier(n) || facteursPremiers(n).split('\\times').length < 2)
      return { enonce: `Décomposer $${n}$ en produit de facteurs premiers.`, reponse: facteursPremiers(n) }
    },
    () => {
      let n: number, f: string[]
      do { n = ent(101, 400); f = facteursPremiers(n).split(' \\times ') } while (f.length < 3 || f.some(x => Number(x.split('^')[0]) > 11))
      const k = ent(0, f.length - 1)
      return aTrou(`Compléter : $${n} = ${f.map((x, i) => i === k ? '\\ldots' : x).join(' \\times ')}$`, f[k])
    }),
  exo(MD, 0, '3e-premier-entre', 'Le nombre premier entre deux nombres', () => {
    for (;;) {
      const p = choix(PREMIERS.filter(x => x > 10 && x < 90)), a = p - ent(1, 5), b = p + ent(1, 5)
      const entre = PREMIERS.filter(x => x > a && x < b)
      if (entre.length === 1 && !estPremier(a) && !estPremier(b)) return { enonce: `Quel nombre premier se trouve entre $${a}$ et $${b}$ ?`, reponse: nb(p) }
    }
  }),
  exo(MD, 0, '3e-liste-premiers', 'La liste des nombres premiers', () => {
    const debut = ent(0, 7), n = ent(4, 6), l = PREMIERS.slice(debut, debut + n), k = ent(1, n - 2)
    return { enonce: `Compléter cette liste de nombres premiers qui se suivent : $${l.map((x, i) => i === k ? '\\ldots' : x).join(' \\; ; \\; ')}$`, reponse: nb(l[k]) }
  }),
  // C2 : simplifier, avec des nombres d'une même table ; la correction dit par quoi on divise
  refait('3e-simplifier-table',
    () => {
      let t: number, a: number, b: number
      if (Math.random() < 0.15) [t, a, b] = choix<[number, number, number]>([[5, 3, 7], [7, 9, 2]])
      else do { t = ent(2, 10); a = ent(1, 10); b = ent(1, 10) } while (a === b || b / pgcd(a, b) === 1)
      const g = pgcd(t * a, t * b)
      return { enonce: `Simplifier : $${frac(t * a, t * b)}$`, reponse: mot(`$${irreductible(t * a, t * b)}$ (on divise le numérateur et le dénominateur par $${g}$)`) }
    },
    avant('3e-simplifier-table').trou),
  // C3 : le dénominateur commun, pour additionner, soustraire ou comparer
  refait('3e-denominateur-commun', () => {
    const [d1, d2] = choix<[number, number]>([[4, 6], [6, 8], [6, 9], [4, 10], [8, 12], [10, 15], [6, 10], [9, 12], [3, 4], [5, 6], [4, 5], [12, 18], [2, 3], [3, 5]])
    let a: number, b: number
    do { a = ent(1, 2 * d1); b = ent(1, 2 * d2) } while (a % d1 === 0 || b % d2 === 0)
    const D = ppcm(d1, d2)
    const pour = choix([`calculer $${frac(a, d1)} + ${frac(b, d2)}$`, `calculer $${frac(a, d1)} - ${frac(b, d2)}$`, `comparer $${frac(a, d1)}$ et $${frac(b, d2)}$`])
    return { enonce: `Quel dénominateur commun choisir pour ${pour} ?`, reponse: mot(`$${D}$ (le plus petit multiple commun de $${d1}$ et de $${d2}$ ; un autre multiple commun convient aussi)`) }
  }),
  // C4 : le chiffre qui manque (toute bonne réponse convient), un nombre divisible par deux nombres
  refait('3e-divisibilite', () => {
    const d = choix([2, 3, 5, 9])
    for (;;) {
      // Par 2 et par 5, c'est le chiffre des unités qui compte : c'est lui qui manque
      const aGauche = d === 2 || d === 5 ? String(ent(10, 99)) : String(ent(1, 9)), aDroite = d === 2 || d === 5 ? '' : String(ent(0, 99))
      const bons = Array.from({ length: 10 }, (_, c) => c).filter(c => Number(`${aGauche}${c}${aDroite}`) % d === 0)
      if (!bons.length) continue
      return {
        enonce: `Quel chiffre écrire à la place de … pour que le nombre $${aGauche}\\ldots${aDroite}$ soit divisible par $${d}$ ?`,
        reponse: bons.length === 1 ? nb(bons[0]) : mot(`$${bons[0]}$ par exemple ; conviennent : ${etL(bons.map(c => `$${c}$`))}`),
      }
    }
  }),
  exo(MD, 3, '3e-divisible-par-deux', 'Un nombre divisible par deux nombres', () => {
    const [d1, d2] = choix<[number, number]>([[2, 3], [2, 5], [2, 9], [3, 5], [5, 9]]), l = d1 * d2
    const x = l * ent(Math.ceil(100 / l), Math.floor(999 / l))
    return { enonce: `Donner un nombre de trois chiffres divisible à la fois par $${d1}$ et par $${d2}$.`, reponse: mot(`par exemple $${x}$ (un multiple de $${l}$)`) }
  }),

  // ================= CALCUL LITTÉRAL ET ALGÉBRIQUE =================
  // C1
  avant('3e-equations'),
  exo(CL, 0, '3e-solution-ax', 'La solution d’une équation ax = c', () => {
    const a = ent(2, 9), s = relNonNul(1, 10), x = choix(['x', 'y', 't'])
    return { enonce: `Compléter : la solution de l'équation $${a}${x} = ${a * s}$ est $${x} = \\ldots$`, reponse: nb(s) }
  }),
  // C2 : la consigne du programme (« simplifier ») ou « réduire », des produits, et le trou
  refait('3e-reduire',
    () => {
      const x = choix(['a', 'x', 'y']), consigne = choix(['Simplifier l\'expression suivante :', 'Réduire l\'expression suivante :'])
      if (Math.random() < 0.5) {
        let a: number, b: number, c: number, d: number
        do { a = relNonNul(1, 9); b = relNonNul(1, 9); c = relNonNul(1, 9); d = relNonNul(1, 9) } while (a + c === 0)
        const e = `${affine(a, b, x)} ${c < 0 ? '-' : '+'} ${Math.abs(c) === 1 ? x : `${Math.abs(c)}${x}`} ${d < 0 ? '-' : '+'} ${Math.abs(d)}`
        return { enonce: `${consigne} $${e}$`, reponse: affine(a + c, b + d, x) }
      }
      let a: number, b: number, k: number, c: number, d: number, signe: number
      do { a = relNonNul(1, 9); b = relNonNul(1, 9); k = ent(2, 6); c = ent(1, 5); d = relNonNul(1, 9); signe = choix([1, -1]) } while (a + signe * k * c === 0 || b + signe * k * d === 0)
      return { enonce: `${consigne} $${affine(a, b, x)} ${signe < 0 ? '-' : '+'} ${k}(${affine(c, d, x)})$`, reponse: affine(a + signe * k * c, b + signe * k * d, x) }
    },
    () => {
      const x = choix(['a', 'x', 'y']), a = ent(3, 9), b = ent(1, a - 1), c = ent(1, 9)
      return aTrou(`Compléter : $${a}${x} - ${b}${x} + ${c} = \\ldots ${x} + ${c}$`, nb(a - b))
    }),
  exo(CL, 1, '3e-simplifier-produit', 'Simplifier un produit', () => {
    const x = choix(['x', 'a', 'y', 't']), a = ent(2, 9), b = ent(2, 9)
    const e = choix([`${a} \\times ${x} \\times ${b}`, `${x} \\times ${a} \\times ${b}`, `${a} \\times ${b} \\times ${x}`])
    return { enonce: `Simplifier l'expression : $${e}$`, reponse: `${a * b}${x}` }
  }),
  // C3 : des valeurs simples, sans calculatrice
  refait('3e-valeur',
    () => {
      const x = choix(['x', 'a', 't']), v = relNonNul(1, 3), a = ent(2, 5), b = relNonNul(1, 6), c = relNonNul(1, 9)
      const [e, r] = choix<[string, number]>([
        [`${a}${x}^2 ${b < 0 ? '-' : '+'} ${Math.abs(b)}${x} ${c < 0 ? '-' : '+'} ${Math.abs(c)}`, a * v * v + b * v + c],
        [`${x}^2 ${b < 0 ? '-' : '+'} ${Math.abs(b)}`, v * v + b],
        [`${Math.min(a, 3)}${x}^3`, Math.min(a, 3) * v ** 3],
        [`${affine(a, b, x)}`, a * v + b],
        [`(${x} ${b < 0 ? '-' : '+'} ${Math.abs(b)})^2`, (v + b) ** 2],
      ])
      return { enonce: choix([`Calculer $${e}$ pour $${x} = ${nb(v)}$.`, `Calculer la valeur de l'expression $${e}$ pour $${x} = ${nb(v)}$.`]), reponse: nb(r) }
    },
    () => { const a = ent(2, 6), v = ent(2, 5); return aTrou(`Compléter : $${a} \\times ${v}^2 = \\ldots$`, nb(a * v * v)) }),
  // C4 : la nature d'une expression, sans lister les réponses ; écrire une expression
  refait('3e-nature', () => {
    const x = choix(['x', 'a', 'y']), a = ent(2, 9), b = ent(1, 9), c = ent(2, 9)
    const [e, n] = choix<[string, string]>([
      [`${a}${x} + ${b}`, 'une somme'], [`${a}(${x} + ${b})`, 'un produit'], [`${b} - ${a}${x}`, 'une différence'], [`\\frac{${x} + ${b}}{${c}}`, 'un quotient'],
      [`(${x} + ${b})(${x} - ${c})`, 'un produit'], [`${a}${x}^2 - ${b}`, 'une différence'], [`(${x} - ${b})^2 + ${c}`, 'une somme'], [`(${a}${x} + ${b}) \\div ${c}`, 'un quotient'],
    ])
    return { enonce: `Quelle est la nature de l'expression $${e}$ ?`, reponse: mot(n) }
  }),
  exo(CL, 3, '3e-ecrire-expression', 'Écrire une expression de nature donnée', () => {
    const x = choix(['x', 'a', 'y']), k = ent(2, 9), b = ent(1, 9)
    return choix([
      { enonce: `Écrire une expression qui est le produit de $${x} + ${b}$ par $${k}$.`, reponse: `${k}(${x} + ${b})` },
      { enonce: `Écrire une expression qui est la somme de $${k}${x}$ et de $${b}$.`, reponse: `${k}${x} + ${b}` },
      { enonce: `Écrire une expression qui est la différence de $${k}${x}$ et de $${b}$.`, reponse: `${k}${x} - ${b}` },
      { enonce: `Écrire une expression qui est le quotient de $${x} + ${b}$ par $${k}$.`, reponse: `\\frac{${x} + ${b}}{${k}}` },
    ])
  }),
  // C5 : développer et factoriser, aussi par un facteur négatif ; l'ancienne 16, avec des lettres et des nombres
  refait('3e-developper-factoriser',
    () => {
      const x = choix(['x', 'a', 'y']), k = ent(2, 9), a = ent(1, 9), b = relNonNul(1, 9)
      const sorte = ent(0, 4)
      if (sorte === 0) return { enonce: `Développer : $${k}(${affine(a, b, x)})$`, reponse: affine(k * a, k * b, x) }
      if (sorte === 1) return { enonce: `Développer : $-${k}(${affine(a, b, x)})$`, reponse: affine(-k * a, -k * b, x) }
      if (sorte === 4) {
        // Par un facteur négatif : −6x − 9 = −3(2x + 3)
        let p: number, q: number
        do { p = ent(1, 6); q = ent(1, 9) } while (pgcd(p, q) !== 1)
        return { enonce: `Factoriser par $-${k}$ : $${affine(-k * p, -k * q, x)}$`, reponse: `-${k}(${affine(p, q, x)})` }
      }
      if (sorte === 2) {
        let p: number, q: number
        do { p = ent(1, 6); q = relNonNul(1, 9) } while (pgcd(p, Math.abs(q)) !== 1)
        return { enonce: `Factoriser : $${affine(k * p, k * q, x)}$`, reponse: `${k}(${affine(p, q, x)})` }
      }
      return { enonce: `Factoriser : $${x}^2 ${b < 0 ? '-' : '+'} ${Math.abs(b)}${x}$`, reponse: `${x}(${affine(1, b, x)})` }
    },
    avant('3e-developper-factoriser').trou),
  exo(CL, 4, '3e-developper-lettres', 'La distributivité simple', () => {
    const [b, c] = choix([['b', 'c'], ['x', 'y'], ['m', 'n'], ['a', 'b']]), k = choix(['k', String(ent(2, 9))]), s = choix(['+', '-']), moins = Math.random() < 0.3
    const kb = (l: string) => `${moins ? '-' : ''}${k}${l}`
    return { enonce: `Développer $${moins ? '-' : ''}${k}(${b} ${s} ${c})$`, reponse: `${kb(b)} ${moins === (s === '-') ? '+' : '-'} ${k}${c}` }
  }),
  // C6 : que des questions de cours
  // C7 : l'opposé d'une expression de deux termes
  refait('3e-oppose',
    () => {
      const x = choix(['x', 'a', 'y']), a = relNonNul(1, 9), b = relNonNul(1, 9)
      if (Math.random() < 0.5) return { enonce: `Écrire l'expression $-(${affine(a, b, x)})$ sans parenthèses.`, reponse: affine(-a, -b, x) }
      return { enonce: `Quel est l'opposé de $${affine(a, b, x)}$ ?`, reponse: affine(-a, -b, x) }
    },
    avant('3e-oppose').trou),

  // ================= REPÉRAGE =================
  avant('3e-placer-droite'),
  avant('3e-abscisse-relatif'),
  exo(RE, 1, '3e-graduation', 'Ce que vaut une graduation', () => {
    const parts = choix([2, 4, 5, 10]), debut = ent(-6, -1)
    return { enonce: 'Sur la droite graduée, combien vaut une graduation ?', figure: F.droiteGradueePoints(debut, debut + 4, parts, []), reponse: nb(1 / parts) }
  }),
  avant('3e-coordonnees'),
  exo(RE, 2, '3e-abscisse-ordonnee', 'L’abscisse ou l’ordonnée d’un point', () => {
    const noms = melange(['A', 'B', 'C', 'D', 'E', 'F']).slice(0, 3)
    const lieux: { x: number; y: number; nom: string }[] = []
    while (lieux.length < 3) { const x = ent(-5, 5), y = ent(-5, 5); if (x !== 0 && y !== 0 && !lieux.some(p => p.x === x && p.y === y)) lieux.push({ x, y, nom: noms[lieux.length] }) }
    const p = choix(lieux), abs = Math.random() < 0.5
    return { enonce: `Quelle est ${abs ? 'l\'abscisse' : 'l\'ordonnée'} du point $${p.nom}$ ?`, figure: F.reperePoints(lieux), reponse: nb(abs ? p.x : p.y) }
  }),
  ancien(RE, 1, 0, { competence: 2 }),
  avant('3e-placer-point'),
  exo(RE, 3, '3e-point-abscisse', 'Le point d’abscisse ou d’ordonnée donnée', () => {
    // Une seule réponse possible sur le dessin
    const noms = melange(['E', 'F', 'G', 'H'])
    for (;;) {
      const lieux = noms.map(nom => ({ x: relNonNul(1, 5), y: relNonNul(1, 5), nom }))
      const p = choix(lieux), abs = Math.random() < 0.5, v = abs ? p.x : p.y
      if (lieux.filter(q => (abs ? q.x : q.y) === v).length !== 1) continue
      if (new Set(lieux.map(q => `${q.x},${q.y}`)).size < 4) continue
      return { enonce: `Quel point a pour ${abs ? 'abscisse' : 'ordonnée'} $${nb(v)}$ ?`, figure: F.reperePoints(lieux), reponse: mot(`$${p.nom}$`) }
    }
  }),

  // ================= REPRÉSENTATION DE L'ESPACE =================
  // C1 : le nom du solide est devenu une question de cours ; ici, ses faces
  exo(ES, 0, '3e-faces-solide', 'Le nombre de faces d’un solide', () => {
    const [s, n] = choix<[F.Solide, number]>([['cube', 6], ['pave', 6], ['prisme3', 5], ['prisme4', 6], ['prisme5', 7], ['prisme6', 8], ['pyramide', 5]])
    return { enonce: 'Combien ce solide a-t-il de faces ?', figure: F.solide(s), reponse: nb(n) }
  }),
  // C2 : des volumes qui se calculent sans calculatrice ; le solide dessiné avec ses mesures
  refait('3e-volume-pyramide-cone', () => {
    if (Math.random() < 0.5) {
      let c: number, h: number
      do { c = ent(2, 6); h = choix([3, 4, 5, 6, 9]) } while ((c * c * h) % 3 !== 0)
      return choix([
        { enonce: `Une pyramide a pour base un carré de côté $${c}$ cm et pour hauteur $${h}$ cm. Calculer son volume.`, reponse: cm3(nb(c * c * h / 3)) },
        { enonce: `Une pyramide a une base d'aire $${c * c}$ cm² et une hauteur de $${h}$ cm. Calculer son volume.`, reponse: cm3(nb(c * c * h / 3)) },
      ])
    }
    let r: number, h: number
    do { r = ent(1, 5); h = choix([3, 4, 6, 9]) } while ((r * r * h) % 3 !== 0)
    return { enonce: `Un cône de révolution a pour rayon $${r}$ cm et pour hauteur $${h}$ cm. Donner son volume en fonction de $\\pi$.`, reponse: cm3(piFois(r * r * h / 3)) }
  }),
  exo(ES, 1, '3e-volume-dessine', 'Le volume d’un solide dessiné', () => {
    if (Math.random() < 0.5) {
      let c: number, h: number
      do { c = ent(2, 6); h = choix([3, 4, 5, 6, 9]) } while ((c * c * h) % 3 !== 0)
      return { enonce: choix(['Calculer le volume de cette pyramide à base carrée.', 'Quel est le volume de cette pyramide à base carrée ?']), figure: F.solideMesure('pyramide', `${c} cm`, `${h} cm`), reponse: cm3(nb(c * c * h / 3)) }
    }
    let r: number, h: number
    do { r = ent(1, 5); h = choix([3, 4, 6, 9]) } while ((r * r * h) % 3 !== 0)
    return { enonce: choix(['Calculer le volume de ce cône, en fonction de $\\pi$.', 'Quel est le volume de ce cône, en fonction de $\\pi$ ?']), figure: F.solideMesure('cone', `${r} cm`, `${h} cm`), reponse: cm3(piFois(r * r * h / 3)) }
  }),
  // C3 : une pyramide dessinée, ses sommets nommés : la nature d'une face latérale ou de la base
  refait('3e-faces-pyramide', () => {
    const n = choix([3, 4, 4, 5, 6]), L = pts(n + 1), S = L[0], base = L.slice(1)
    const figure = F.pyramideNommee(n, L.join(''))
    if (Math.random() < 0.55) {
      const i = ent(0, n - 1)
      return { enonce: `Voici une pyramide de sommet $${S}$. Quelle est la nature de sa face $${S}${base[i]}${base[(i + 1) % n]}$ ?`, figure, reponse: mot('un triangle') }
    }
    return { enonce: `Voici une pyramide de sommet $${S}$. Quelle est la nature de sa base $${base.join('')}$ ?`, figure, reponse: mot(NOM_POLYGONE[n]) }
  }),
  // C4 : le patron dessiné
  refait('3e-patron-pyramide', () => {
    const [n, nom] = choix<[number, string]>([[3, 'triangulaire'], [4, 'carrée'], [5, 'pentagonale']])
    return { enonce: 'Ce patron est celui de quel solide ?', figure: F.patronPyramide(n), reponse: mot(`une pyramide à base ${nom}`) }
  }),

  // ================= TRIANGLES =================
  // C1 : le rayon à partir de l'hypoténuse (avec ou sans dessin), et dans l'autre sens
  exo(TR, 0, '3e-cercle-rayon', 'Le rayon du cercle circonscrit', () => {
    const [A, B, C] = pts(3), l = choix([ent(2, 10) * 2, ent(2, 10) * 2, 2 * ent(2, 9) + 1])
    const sorte = ent(0, 2)
    if (sorte === 2) return { enonce: `$${A}${B}${C}$ est rectangle en $${A}$, et son cercle circonscrit a pour rayon $${nb(l / 2)}$ cm. Combien mesure $${B}${C}$ ?`, reponse: unite(nb(l), 'cm') }
    const enonce = `$${A}${B}${C}$ est rectangle en $${A}$ et $${B}${C} = ${nb(l)}$ cm. Quel est le rayon de son cercle circonscrit ?`
    if (sorte === 1) return { enonce, figure: F.triangleDansCercle(A + B + C, { droit: true, diametre: `${nb(l).replace('{,}', ',')} cm` }), reponse: unite(nb(l / 2), 'cm') }
    return { enonce, reponse: unite(nb(l / 2), 'cm') }
  }),
  // C2 : l'égalité de Pythagore, aussi sur un triangle dessiné (avec l'ancienne 25)
  avant('3e-egalite-pythagore'),
  exo(TR, 1, '3e-pythagore-dessin', 'L’égalité de Pythagore sur un dessin', () => {
    const [A, B, C] = melange(tri()), figure = F.triangleRectangleNomme(A + B + C, ent(0, 23) * 15)
    if (Math.random() < 0.5) return { enonce: 'Écrire l\'égalité de Pythagore dans ce triangle rectangle.', figure, reponse: `${B}${C}^2 = ${A}${B}^2 + ${A}${C}^2` }
    return { enonce: `Le triangle $${A}${B}${C}$ ci-dessous est rectangle en $${A}$. Que vaut $${B}${C}^2$ ?`, figure, reponse: `${A}${B}^2 + ${A}${C}^2` }
  }),
  // C3 : une longueur (dans les deux sens), des droites parallèles, un milieu, avec un dessin
  refait('3e-droite-milieux', () => {
    const sorte = ent(0, 2)
    if (sorte === 0) return AUTOMATISMES_4E.find(a => a.id === '4e-droite-milieux')!.generer()
    const [A, B, C, I, J] = pts(5), noms = A + B + C + I + J
    if (sorte === 1) return { enonce: `Dans le triangle $${A}${B}${C}$, $${I}$ est le milieu de $[${A}${B}]$ et $${J}$ le milieu de $[${A}${C}]$. Que peut-on dire des droites $(${I}${J})$ et $(${B}${C})$ ?`, figure: F.droiteMilieux(noms, null, null, ent(-3, 3) * 12), reponse: mot('elles sont parallèles') }
    return { enonce: `Dans le triangle $${A}${B}${C}$, $${I}$ est le milieu de $[${A}${B}]$, $${J}$ est sur $[${A}${C}]$ et $(${I}${J})$ est parallèle à $(${B}${C})$. Que peut-on dire du point $${J}$ ?`, figure: F.droiteMilieux(noms, null, null, ent(-3, 3) * 12, true), reponse: mot(`$${J}$ est le milieu de $[${A}${C}]$`) }
  }),

  // ================= TRANSLATIONS ET VECTEURS =================
  avant('3e-image-triangle'),
  exo(TV, 0, '3e-quelle-transformation', 'Quelle transformation ?', () => {
    const L = pts(9)
    for (;;) {
      const liste = transformationsLosange(L), t = triangleDuLosange()
      const tf = choix(liste), im = t.map(i => indice(...tf.f(...POINTS_LOSANGE[i])))
      if (im.includes(-1) || [...im].sort().join() === [...t].sort().join()) continue
      // Une seule transformation de la figure envoie ce triangle sur cette image
      const memes = liste.filter(u => { const j = t.map(i => indice(...u.f(...POINTS_LOSANGE[i]))); return !j.includes(-1) && [...j].sort().join() === [...im].sort().join() })
      if (memes.length !== 1) continue
      const nt = t.map(i => L[i]).join(''), ni = im.map(i => L[i]).join('')
      return { enonce: `La figure est formée de $16$ triangles rectangles isocèles superposables. Par quelle transformation le triangle $${nt}$ a-t-il pour image le triangle $${ni}$ ?`, figure: F.losangeTriangles(L), reponse: mot(tf.nom(t, im)) }
    }
  }),
  // L'ancienne 29, devenue un exercice
  exo(TV, 0, 'ancien-cours-3e-Translations et vecteurs-1-2', 'Ce que conserve une translation', () => {
    const [A, B] = pts(2)
    return { enonce: `Par la translation qui transforme $${A}$ en $${B}$, que conserve-t-on ?`, reponse: mot('les longueurs, les angles et les aires') }
  }),

  // ================= STATISTIQUES =================
  // C1 : sans calculatrice ; plus de moyenne de cinq ou six valeurs
  exo(ST, 0, '3e-moyenne-simple', 'Une moyenne, sans calculatrice', () => {
    if (Math.random() < 0.5) {
      // La note qui manque pour avoir une moyenne donnée
      for (;;) {
        const m = ent(8, 16), a = ent(6, 20), b = ent(6, 20), c = 3 * m - a - b, P = choix(PRENOMS)
        if (c < 0 || c > 20) continue
        return { enonce: `${P} a eu $${a}$ et $${b}$ à ses deux premiers contrôles. Quelle note faut-il à ${P} au troisième contrôle pour avoir $${m}$ de moyenne ?`, reponse: nb(c) }
      }
    }
    const n = choix([10, 20, 25, 30, 24]), m = ent(9, 15)
    return { enonce: `La somme des notes d'une classe de $${n}$ élèves est $${n * m}$. Quelle est la moyenne de la classe ?`, reponse: nb(m) }
  }, () => {
    for (;;) {
      const m = ent(8, 16), a = ent(m - 5, m + 5), c = 2 * m - a
      if (c < 0 || c > 20 || c === a) continue
      return aTrou(`Compléter : la moyenne de $${a}$ ; $\\ldots$ est $${m}$.`, nb(c))
    }
  }),
  // C2 : cinq ou sept valeurs, parfois déjà rangées
  refait('3e-mediane', () => {
    const n = choix([5, 7]), l = Array.from({ length: n }, () => ent(2, 25)), t = [...l].sort((a, b) => a - b)
    return { enonce: `Donner la médiane de la série : $${(Math.random() < 0.3 ? t : l).join(' \\; ; \\; ')}$`, reponse: nb(t[(n - 1) / 2]) }
  }),
  ancien(ST, 1, 0, { competence: 1 }),
  // C3 : dans les deux sens, une liste ou un tableau
  refait('3e-etendue', () => {
    const sorte = ent(0, 3)
    if (sorte === 0) { const e = ent(5, 20), min = ent(2, 15); return { enonce: `Une série a pour plus petite valeur $${min}$ et pour étendue $${e}$. Quelle est sa plus grande valeur ?`, reponse: nb(min + e) } }
    if (sorte === 1) { const e = ent(5, 20), max = ent(e + 2, 40); return { enonce: `Une série a pour plus grande valeur $${max}$ et pour étendue $${e}$. Quelle est sa plus petite valeur ?`, reponse: nb(max - e) } }
    const n = ent(5, 7), l = melange(Array.from({ length: 40 }, (_, i) => i + 2)).slice(0, n)
    if (sorte === 2) return { enonce: `Calculer l'étendue de cette série : $${l.join(' \\; ; \\; ')}$`, reponse: nb(Math.max(...l) - Math.min(...l)) }
    const v = [...l].sort((a, b) => a - b).slice(0, 5)
    return { enonce: `Calculer l'étendue de cette série : $${tableau(['\\text{Valeur}', ...v.map(String)], ['\\text{Effectif}', ...v.map(() => String(ent(1, 6)))])}$`, reponse: nb(v[v.length - 1] - v[0]) }
  }),

  // ================= PROPORTIONNALITÉ =================
  // C1 : des parts faciles, le nombre de parts, l'autre part
  refait('3e-partage-deux', () => {
    const [p, q] = choix<[number, number]>([[1, 2], [1, 3], [2, 3], [3, 4], [2, 5], [3, 5], [1, 4]]), k = choix([2, 3, 4, 5, 10]), total = (p + q) * k
    const [X, Y] = melange(PRENOMS).slice(0, 2)
    if (Math.random() < 0.35) return { enonce: `${X} et ${Y} se partagent des euros selon le ratio $${p} : ${q}$ (${X} d'abord). ${X} reçoit $${p * k}$ €. Combien reçoit ${Y} ?`, reponse: unite(nb(q * k), '€') }
    const premier = Math.random() < 0.5
    return { enonce: `${X} et ${Y} se partagent $${total}$ euros selon le ratio $${p} : ${q}$ (${X} d'abord). Quelle est la part de ${premier ? X : Y} ?`, reponse: unite(nb((premier ? p : q) * k), '€') }
  }, () => {
    const [p, q] = choix<[number, number]>([[1, 2], [1, 3], [2, 3], [3, 4], [2, 5], [1, 4]]), k = choix([5, 10, 20])
    return aTrou(`Compléter : partager $${(p + q) * k}$ € selon le ratio $${p} : ${q}$, c'est faire $\\ldots$ parts égales.`, nb(p + q))
  }),
  // C2 : ce que vaut une part, la plus grande part
  refait('3e-partage-trois', () => {
    const r = choix<[number, number, number]>([[1, 2, 3], [1, 1, 2], [2, 3, 5], [1, 2, 2], [1, 3, 4], [2, 2, 1], [1, 2, 5]]), k = choix([2, 3, 4, 5, 10, 20])
    const total = (r[0] + r[1] + r[2]) * k, [quoi, u] = choix<[string, string]>([['g de farine', 'g'], ['kg de sable', 'kg'], ['g de chocolat', 'g'], ['kg de terreau', 'kg']])
    const debut = `On partage $${total}$ ${quoi} en trois parts selon le ratio $${r.join(' : ')}$.`
    if (Math.random() < 0.5) return { enonce: `${debut} Combien vaut une part ?`, reponse: unite(nb(k), u) }
    return { enonce: `${debut} Quelle est la plus grande part ?`, reponse: unite(nb(Math.max(...r) * k), u) }
  }),
  // C3 : une seule part, des âges et des sommes faciles
  refait('3e-partage-ages', () => {
    const [a, b] = choix<[number, number]>([[20, 30], [10, 15], [12, 18], [8, 12], [6, 9], [10, 30], [14, 21], [15, 25], [12, 24]]), g = pgcd(a, b)
    const m = choix([5, 10, 20]), total = (a + b) / g * m
    const [X, Y] = melange(PRENOMS).slice(0, 2), premier = Math.random() < 0.5
    return { enonce: `${X} a $${a}$ ans et ${Y} a $${b}$ ans. On partage $${total}$ € entre eux proportionnellement à leur âge. Quelle est la part de ${premier ? X : Y} ?`, reponse: unite(nb((premier ? a : b) / g * m), '€') }
  }, () => {
    const [a, b] = choix<[number, number]>([[12, 18], [10, 15], [8, 12], [20, 30], [14, 21], [15, 25], [6, 9]]), g = pgcd(a, b)
    const [X, Y] = melange(PRENOMS).slice(0, 2)
    return aTrou(`Compléter : ${X} a $${a}$ ans et ${Y} a $${b}$ ans, donc on partage selon le ratio $${a} : ${b}$, c'est-à-dire $${a / g} : \\ldots$`, nb(b / g))
  }),
  // C4 : des pourcentages faciles, des quantités rondes
  refait('3e-pourcentage', () => {
    if (Math.random() < 0.3) {
      const n = choix([20, 25, 30]), t = choix([10, 20, 40, 60, 80].filter(x => Number.isInteger(n * x / 100)))
      return { enonce: `Dans une classe de $${n}$ élèves, $${t}\\,\\%$ sont des filles. Combien y a-t-il de filles ?`, reponse: nb(n * t / 100) }
    }
    const t = choix([10, 20, 25, 50, 75]), q = choix([20, 40, 60, 80, 100, 120, 200, 240, 400])
    const [quoi, u] = choix<[string, string]>([['', ''], [' €', '€'], [' g', 'g'], [' élèves', 'élèves']])
    return { enonce: `Calculer $${t}\\,\\%$ de $${q}$${quoi}.`, reponse: u ? unite(nb(t * q / 100), u) : nb(t * q / 100) }
  }, () => {
    const t = choix([10, 20, 30, 50]), q = choix([50, 80, 120, 150, 200, 300])
    return aTrou(`Compléter : $${t}\\,\\%$ de $${q} = ${nb(t / 100)} \\times ${q} = \\ldots$`, nb(t * q / 100))
  }),
  // C5 : la distance réelle, dans les deux sens, et le calcul en centimètres
  refait('3e-echelle', () => {
    const e = choix([100000, 200000, 500000, 1000000]), d = ent(2, 12), km = d * e / 100000
    const [V1, V2] = melange(VILLES).slice(0, 2)
    if (Math.random() < 0.4) return { enonce: `${V1} et ${V2} sont à $${grandNb(km)}$ km l'une de l'autre. À quelle distance sont-elles sur une carte à l'échelle $${fr(1, grandNb(e))}$ ?`, reponse: unite(nb(d), 'cm') }
    return { enonce: `Sur une carte à l'échelle $${fr(1, grandNb(e))}$, ${V1} et ${V2} sont à $${nb(d)}$ cm. Quelle est la distance réelle entre ces villes ?`, reponse: unite(grandNb(km), 'km') }
  }, () => {
    const e = choix([100000, 200000, 500000, 1000000]), d = ent(2, 9)
    return aTrou(`Compléter : sur une carte à l'échelle $${fr(1, grandNb(e))}$, $${d}$ cm représentent $${d} \\times ${grandNb(e)} = \\ldots$ cm.`, grandNb(d * e))
  }),
  // C6 : des pourcentages et des prix faciles ; le coefficient ; le pourcentage à partir du coefficient
  refait('3e-evolution', () => {
    const t = choix([10, 20, 25, 50]), plus = Math.random() < 0.5
    const sorte = ent(0, 3)
    if (sorte === 1) return { enonce: `Par quel nombre multiplie-t-on un prix pour ${plus ? 'l\'augmenter' : 'le diminuer'} de $${t}\\,\\%$ ?`, reponse: nb(1 + (plus ? t : -t) / 100) }
    if (sorte === 2) return { enonce: `Un prix est multiplié par $${nb(1 + (plus ? t : -t) / 100)}$. De quel pourcentage a-t-il ${plus ? 'augmenté' : 'baissé'} ?`, reponse: `${t}\\,\\%` }
    const objet = choix(['Un livre', 'Un jeu', 'Un pull', 'Un casque', 'Un ballon', 'Une lampe', 'Un sac']), p = choix([20, 40, 60, 80, 100, 120, 200])
    return { enonce: `${objet} coûte $${p}$ euros. Quel sera son prix après ${plus ? 'une augmentation' : 'une baisse'} de $${t}\\,\\%$ ?`, reponse: unite(nb(p * (1 + (plus ? t : -t) / 100)), '€') }
  }),
]

// =============================================================
// LES QUESTIONS DE COURS
// =============================================================
const SOLIDES_DECRITS: [string, string][] = [
  ['Quel solide a deux bases qui sont des disques ?', 'un cylindre'],
  ['Quel solide a six faces qui sont toutes des carrés ?', 'un cube'],
  ['Quel solide a une base qui est un disque, et un sommet ?', 'un cône'],
  ['Quel solide a une base qui est un polygone, et des faces latérales qui sont des triangles ayant un sommet commun ?', 'une pyramide'],
  ['Quel solide a deux bases qui sont des polygones superposables, et des faces latérales qui sont des rectangles ?', 'un prisme droit'],
  ['Quel solide a six faces qui sont des rectangles, sans que toutes soient des carrés ?', 'un pavé droit'],
]
const lettreEntiere = () => choix(['n', 'k', 'p'])
const TRANSFOS = ['une translation', 'une symétrie axiale', 'un demi-tour', 'une symétrie centrale']
const ECHELLES: [number, string][] = [[100000, '$1$ km'], [200000, '$2$ km'], [1000000, '$10$ km'], [50000, '$500$ m'], [25000, '$250$ m']]
/** Repérage : les mêmes questions de cours en C1 et en C2, en C3 et en C4 */
const coursDroite: Facon = () => {
  const p = choix(['A', 'B', 'M', 'R', 'K'])
  return choix<[string, string]>([[`Compléter : sur une droite graduée, le point $${p}$ est repéré par son …`, 'abscisse'], ['Sur une droite graduée, comment s\'appelle le point d\'abscisse $0$ ?', 'l\'origine']])
}
const coursRepere: Facon = () => choix<() => [string, string]>([
  () => { const deux = Math.random() < 0.5; return [`Dans un repère orthogonal, comment s'appelle la ${deux ? 'deuxième' : 'première'} coordonnée d'un point ?`, deux ? 'l\'ordonnée' : 'l\'abscisse'] },
  () => phraseATrou('dans un repère [orthogonal], un point est repéré par ses [coordonnées].'),
  () => phraseATrou('dans un repère orthogonal, un point est repéré par son [abscisse] et son [ordonnée].'),
  () => ['Dans un repère orthogonal, comment s\'appelle le point de coordonnées $(0\\,;\\,0)$ ?', 'l\'origine du repère'],
  () => ['Dans un repère orthogonal, quelles sont les coordonnées de l\'origine ?', '$(0\\,;\\,0)$'],
  () => { const o = Math.random() < 0.5; return [`Dans un repère orthogonal, sur quel axe se trouvent les points ${o ? 'd\'ordonnée' : 'd\'abscisse'} $0$ ?`, o ? 'sur l\'axe des abscisses (l\'axe horizontal)' : 'sur l\'axe des ordonnées (l\'axe vertical)'] },
])()

/** Les notions de cours rangées par compétence (et un objectif) */
const RANGEES: QuestionCours[] = [
  // ================= NOMBRES RATIONNELS =================
  sienne(notion(NR, 1, { competence: 0 }, 'Diviser par une fraction',
    () => ['Compléter : diviser par une fraction revient à …', 'multiplier par son inverse'])),
  sienne(notion(NR, 2, { competence: 0 }, 'Multiplier deux fractions',
    () => choix<[string, string]>([
      ['Comment multiplier deux fractions entre elles ?', 'on multiplie les numérateurs entre eux et les dénominateurs entre eux'],
      ['Compléter : pour multiplier deux fractions, on … et les dénominateurs entre eux.', 'multiplie les numérateurs entre eux'],
      ['Compléter : pour multiplier deux fractions, on multiplie les numérateurs et … entre eux.', 'les dénominateurs'],
    ]))),
  notion(NR, 3, { competence: 0 }, 'Additionner ou soustraire deux fractions',
    () => [`Que faut-il faire avant ${choix(['d\'additionner ou de soustraire', 'd\'additionner', 'de soustraire'])} deux fractions ?`, 'les écrire avec le même dénominateur']),
  sienne(notion(NR, 4, { objectif: 0 }, 'Une fraction irréductible',
    () => ['Quelle est la définition d\'une fraction irréductible ?', 'une fraction dont le numérateur et le dénominateur n\'ont pas d\'autre diviseur commun que $1$'])),

  // ================= PUISSANCES =================
  notion(PU, 1, { competence: 0 }, 'L’exposant',
    () => { const a = ent(2, 9); let n = ent(2, 9); while (n === a) n = ent(2, 9); return [`Dans $${a}^{${n}}$, comment s'appelle le nombre $${n}$ ?`, 'l\'exposant'] }),

  // ================= RACINE CARRÉE =================
  sienne(notion(RC, 1, { competence: 0 }, 'Le carré d’un nombre',
    () => ['Compléter : le carré d\'un nombre, c\'est ce nombre multiplié par…', 'lui-même'])),

  // ================= MULTIPLES ET DIVISEURS =================
  notion(MD, 1, { competence: 0 }, 'Un nombre premier',
    coursAvant(MD, 1).facons[0],
    () => choix<[string, string]>([['Qu\'est-ce qu\'un nombre premier ?', 'un nombre entier qui a exactement deux diviseurs : $1$ et lui-même'], ['Donner un exemple de nombre premier.', 'par exemple $2$, $3$, $5$, $7$, $11$ ou $13$']])),
  notion(MD, 100, { competence: 0 }, 'La décomposition en facteurs premiers',
    () => { const n = choix([12, 18, 20, 28, 30, 45, 50, 60, 84, 90]); return [`Le nombre $${n}$ peut se décomposer ainsi : $${n} = ${facteursPremiers(n)}$. Comment s'appelle cette décomposition ?`, 'la décomposition en produit de facteurs premiers'] }),
  notion(MD, 101, { competence: 1 }, 'Simplifier une fraction',
    () => phraseATrou('pour [simplifier] une fraction, on divise le [numérateur] et le [dénominateur] par [un même nombre].')),
  notion(MD, 102, { competence: 2 }, 'Le même dénominateur',
    () => {
      const [v, p] = choix([['additionner', 'additionne'], ['soustraire', 'soustrait'], ['comparer', 'compare']])
      return [`Compléter : pour ${v} deux fractions de dénominateurs différents, 1) on … ; 2) on ${p} les numérateurs entre eux.`, 'les écrit avec le même dénominateur']
    }),
  notion(MD, 2, { competence: 3 }, 'Divisibilité par 3 et par 9',
    coursAvant(MD, 2).facons[0],
    () => {
      const [d, r] = choix<[number, string]>([[2, 'quand son chiffre des unités est $0$, $2$, $4$, $6$ ou $8$'], [3, 'quand la somme de ses chiffres est divisible par $3$'], [5, 'quand son chiffre des unités est $0$ ou $5$'], [9, 'quand la somme de ses chiffres est divisible par $9$']])
      return [`Quand est-ce qu'un nombre est divisible par $${d}$ ?`, r]
    }),
  notion(MD, 3, { competence: 3 }, 'Divisibilité par 2 et par 5', coursAvant(MD, 3).facons[0]),

  // ================= CALCUL LITTÉRAL ET ALGÉBRIQUE =================
  notion(CL, 100, { competence: 0 }, 'Résoudre une équation',
    () => choix<() => [string, string]>([
      () => ['Compléter : résoudre une équation, c\'est déterminer toutes ses …', 'solutions'],
      () => ['Compléter : résoudre une …, c\'est déterminer toutes ses solutions.', 'équation'],
      () => ['Que signifie résoudre une équation ?', 'déterminer toutes ses solutions : les valeurs de l\'inconnue pour lesquelles l\'égalité est vraie'],
    ])()),
  notion(CL, 101, { competence: 0 }, 'Vérifier une solution',
    () => {
      const a = ent(2, 9), s = ent(1, 9), b = ent(1, 9), x = choix(['x', 'y', 't'])
      return [`$${s}$ est solution de $${a}${x} + ${b} = ${a * s + b}$. Que faut-il faire pour le vérifier ?`, `remplacer $${x}$ par $${s}$ et vérifier que l'égalité est vraie : $${a} \\times ${s} + ${b} = ${a * s + b}$`]
    }),
  notion(CL, 102, { competence: 2 }, 'La valeur d’une expression',
    () => { const a = ent(2, 9), b = ent(1, 9), v = ent(1, 9), x = choix(['x', 'a', 't']); return [`Pour calculer la valeur de $${a}${x} + ${b}$ quand $${x} = ${v}$, que fait-on de $${x}$ ?`, `on remplace $${x}$ par $${v}$`] }),
  notion(CL, 103, { competence: 3 }, 'Le nom du résultat d’une opération',
    () => {
      const [op, res] = choix([['d\'une addition', 'une somme'], ['d\'une soustraction', 'une différence'], ['d\'une multiplication', 'un produit'], ['d\'une division', 'un quotient']])
      return Math.random() < 0.5 ? [`Compléter : le résultat ${op} est …`, res] : [`Compléter : le résultat … est ${res}.`, op]
    }),
  sienne(notion(CL, 104, { competence: 3 }, 'La nature d’une expression',
    () => ['Comment trouve-t-on la nature d\'une expression ?', 'on regarde la dernière opération à effectuer'])),
  notion(CL, 105, { competence: 4 }, 'Développer et factoriser',
    () => choix<() => [string, string]>([
      () => phraseATrou('[développer], c\'est transformer un produit en une [somme].'),
      () => phraseATrou('[factoriser], c\'est transformer une somme en un [produit].'),
    ])()),
  notion(CL, 106, { competence: 4 }, 'La distributivité',
    () => {
      const k = choix(['k', 'a']), [b, c] = choix([['b', 'c'], ['x', 'y'], ['m', 'n']]), s = choix(['+', '-'])
      return Math.random() < 0.5 ? [`Compléter : $${k}(${b} ${s} ${c}) = \\ldots$`, `$${k}${b} ${s} ${k}${c}$`] : [`Compléter : $\\ldots = ${k}(${b} ${s} ${c})$`, `$${k}${b} ${s} ${k}${c}$`]
    }),
  notion(CL, 3, { competence: 5 }, 'Pair et impair',
    coursAvant(CL, 3).facons[0],
    () => { const n = lettreEntiere(), i = Math.random() < 0.5; return [`$${n}$ est un nombre entier. Écrire en fonction de $${n}$ un nombre ${i ? 'impair' : 'pair'}.`, i ? `$2${n} + 1$` : `$2${n}$`] },
    () => { const n = lettreEntiere(), i = Math.random() < 0.5; return [`Compléter : avec $${n}$ entier, un nombre ${i ? 'impair' : 'pair'} s'écrit …`, i ? `$2${n} + 1$` : `$2${n}$`] },
    () => { const n = lettreEntiere(), i = Math.random() < 0.5; return [`Un nombre s'écrit $${i ? `2${n} + 1` : `2${n}`}$, avec $${n}$ un nombre entier. De quel type de nombre s'agit-il ?`, i ? 'un nombre impair' : 'un nombre pair'] }),
  sienne(notion(CL, 107, { competence: 6 }, 'L’opposé d’une expression',
    () => choix<[string, string]>([
      ['Compléter : la présence d\'un signe moins devant une parenthèse revient à …', 'prendre l\'opposé de l\'expression entre parenthèses : on change le signe de tous ses termes'],
      ['Compléter : calculer l\'… d\'une expression revient à changer de signe tous ses termes.', 'opposé'],
      ['Compléter : calculer l\'opposé d\'une expression revient à … tous ses termes.', 'changer le signe de'],
    ]))),

  // ================= REPÉRAGE =================
  notion(RE, 100, { competence: 0 }, 'L’abscisse et l’origine', coursDroite),
  notion(RE, 101, { competence: 1 }, 'L’abscisse et l’origine', coursDroite),
  notion(RE, 102, { competence: 2 }, 'Les coordonnées d’un point', coursRepere),
  notion(RE, 103, { competence: 3 }, 'Les coordonnées d’un point', coursRepere),

  // ================= REPRÉSENTATION DE L'ESPACE =================
  notion(ES, 100, { competence: 0 }, 'Le nom d’un solide',
    () => { const q = avant('3e-reconnaitre-solide').generer(); return [q.enonce, q.reponse.replace(/^§/, ''), q.figure!] }),
  notion(ES, 101, { competence: 0 }, 'Reconnaître un solide',
    () => Math.random() < 0.2 ? ['Quelle est la forme des faces latérales d\'un prisme droit ?', 'des rectangles'] : choix(SOLIDES_DECRITS)),
  notion(ES, 1, { competence: 1 }, 'Le volume d’une pyramide, d’un cône',
    coursAvant(ES, 1).facons[0],
    () => { const [r, h] = choix([['r', 'h'], ['R', 'h'], ['r', 'H']]); return [`Quelle est la formule du volume d'un cône de rayon $${r}$ et de hauteur $${h}$ ?`, `$V = \\frac{1}{3} \\times \\pi \\times ${r}^2 \\times ${h}$`] },
    () => {
      // Une formule à trou : π, r, h, le 3 du dénominateur, le 1 du numérateur…
      const cone = Math.random() < 0.6
      const morceaux = cone ? ['1', '3', '\\pi', 'r', 'h'] : ['1', '3', '\\text{aire de la base}', '\\text{hauteur}']
      const k = ent(0, morceaux.length - 1), m = morceaux.map((x, i) => i === k ? '\\ldots' : x)
      const formule = cone ? `\\frac{${m[0]}}{${m[1]}} \\times ${m[2]} \\times ${m[3]}^2 \\times ${m[4]}` : `\\frac{${m[0]}}{${m[1]}} \\times ${m[2]} \\times ${m[3]}`
      return [`Compléter la formule du volume d'${cone ? 'un cône de rayon $r$ et de hauteur $h$' : 'une pyramide'} : $V = ${formule}$`, `$${morceaux[k]}$`]
    },
    () => Math.random() < 0.5 ? ['Un solide a pour volume $\\frac{1}{3} \\times \\pi r^2 \\times h$. De quel solide s\'agit-il ?', 'un cône de révolution'] : ['Un solide a pour volume $\\frac{1}{3} \\times \\text{aire de la base} \\times \\text{hauteur}$, et sa base est un polygone. De quel solide s\'agit-il ?', 'une pyramide']),
  sienne(notion(ES, 102, { competence: 2 }, 'Les faces latérales d’une pyramide',
    () => ['Compléter : les faces latérales d\'une pyramide sont des …', 'triangles'])),

  // ================= TRIANGLES =================
  notion(TR, 1, { competence: 0 }, 'Le cercle circonscrit à un triangle rectangle',
    coursAvant(TR, 1).facons[0],
    () => {
      const [A, B, C] = pts(3)
      if (Math.random() < 0.5) return [`Le triangle $${A}${B}${C}$ est inscrit dans un cercle dont le diamètre est $[${B}${C}]$. Quelle est la nature de ce triangle ?`, `rectangle en $${A}$`]
      return [`Le triangle $${A}${B}${C}$ est inscrit dans le cercle de diamètre $[${B}${C}]$ ci-dessous. Quelle est la nature de ce triangle ?`, `rectangle en $${A}$`, F.triangleDansCercle(A + B + C, { centre: choix(['O', 'I', 'K']) })]
    },
    () => Math.random() < 0.75 ? phraseATrou('si un triangle est rectangle, alors son [cercle] [circonscrit] a pour diamètre son [hypoténuse].')
      : ['Compléter : si un triangle est inscrit dans un cercle qui a pour diamètre l\'un de ses côtés, alors ce triangle est …', 'rectangle']),
  notion(TR, 100, { competence: 1 }, 'L’hypoténuse',
    () => Math.random() < 0.7 ? phraseATrou('dans un triangle rectangle, le [carré] de l\'[hypoténuse] est égal à la [somme] des carrés des deux autres côtés.')
      : ['Comment s\'appelle le plus long côté d\'un triangle rectangle ?', 'l\'hypoténuse']),
  notion(TR, 3, { competence: 2 }, 'La droite des milieux',
    () => {
      const [A, B, C, I, J] = pts(5)
      return [`Dans le triangle $${A}${B}${C}$, $${I}$ et $${J}$ sont les milieux de $[${A}${B}]$ et de $[${A}${C}]$. Combien mesure le segment $[${I}${J}]$ ?`, `la moitié de $${B}${C}$`, F.droiteMilieux(A + B + C + I + J, null, null, ent(-3, 3) * 12)]
    },
    () => {
      const e = choix([
        'Dans un triangle, la droite qui passe par les milieux de deux côtés est parallèle au troisième côté.',
        'Dans un triangle, le segment qui joint les milieux de deux côtés mesure la moitié du troisième côté.',
        'Dans un triangle, la droite qui passe par le milieu d\'un côté et qui est parallèle à un deuxième côté coupe le troisième côté en son milieu.',
      ])
      return [`De quel théorème s'agit-il ? « ${e} »`, 'le théorème de la droite des milieux']
    },
    () => phraseATrou('dans un triangle, la [droite] qui passe par les [milieux] de deux côtés est [parallèle] au troisième côté.'),
    () => phraseATrou('dans un triangle, la [droite] qui passe par le milieu d\'un côté et qui est [parallèle] à un deuxième côté coupe le troisième côté en son [milieu].')),

  // ================= TRANSLATIONS ET VECTEURS =================
  notion(TV, 100, { competence: 0 }, 'Ce que conserve une transformation',
    () => phraseATrou(`${choix(TRANSFOS)} conserve les [longueurs], les [angles] et les [aires].`)),
  notion(TV, 101, { competence: 0 }, 'Reconnaître une transformation',
    () => choix<[string, string]>([
      ['Par quelle transformation une figure glisse-t-elle, sans tourner, dans une direction donnée ?', 'une translation'],
      ['Par quelle transformation une figure tourne-t-elle d\'un demi-tour autour d\'un point ?', 'un demi-tour (une symétrie centrale)'],
      ['Par quelle transformation une figure se retourne-t-elle, comme par un pliage le long d\'une droite ?', 'une symétrie axiale'],
    ])),

  // ================= STATISTIQUES =================
  notion(ST, 100, { competence: 0 }, 'Calculer une moyenne',
    () => phraseATrou('pour calculer la moyenne d\'une série, on [additionne] toutes les valeurs, puis on divise par l\'[effectif].')),
  notion(ST, 1, { competence: 1 }, 'La médiane',
    () => { const n = choix([5, 7, 9, 11]); return [`Une série a $${n}$ valeurs rangées dans l'ordre croissant. Où se trouve la médiane ?`, `à la $${(n + 1) / 2}$e place : il y a autant de valeurs avant qu'après`] },
    () => Math.random() < 0.7 ? phraseATrou('la [médiane] d\'une série partage ses valeurs rangées dans l\'ordre croissant en deux groupes de même [effectif].')
      : ['Que faut-il faire avant de chercher la médiane d\'une série ?', 'ranger ses valeurs dans l\'ordre croissant']),
  notion(ST, 2, { competence: 2 }, 'L’étendue',
    coursAvant(ST, 2).facons[0],
    () => phraseATrou('l\'étendue d\'une série est la [différence] entre sa plus [grande] valeur et sa plus [petite] valeur.')),

  // ================= PROPORTIONNALITÉ =================
  notion(PR, 100, { competence: 1 }, 'Le nombre de parts',
    () => { const r = choix([[1, 2, 3], [1, 1, 2], [2, 3, 5], [1, 2, 2], [1, 3, 4]]); return [`Compléter : partager selon le ratio $${r.join(' : ')}$, c'est faire … parts égales.`, `$${r[0] + r[1] + r[2]}$`] }),
  notion(PR, 101, { competence: 3 }, 'Le pourcentage d’une quantité',
    () => {
      if (Math.random() < 0.3) return [`Compléter : ${choix(['prendre', 'calculer'])} un pourcentage d'une quantité, c'est … ce pourcentage par cette quantité.`, 'multiplier']
      const [t, r] = choix<[number, string]>([[50, 'en prendre la moitié (la diviser par $2$)'], [25, 'en prendre le quart (la diviser par $4$)'], [10, 'la diviser par $10$'], [75, 'en prendre les trois quarts']])
      return [`Prendre $${t}\\,\\%$ d'une quantité revient à…`, r]
    }),
  notion(PR, 2, { competence: 4 }, 'L’échelle d’une carte',
    coursAvant(PR, 2).facons[0],
    () => { const [e, r] = choix(ECHELLES); return [`Compléter : sur une carte à l'échelle $${fr(1, grandNb(e))}$, $1$ cm représente … en vrai.`, r] }),
  notion(PR, 102, { competence: 5 }, 'Le coefficient d’une hausse ou d’une baisse',
    () => {
      const t = choix([5, 10, 15, 20, 25, 30, 40, 50]), h = Math.random() < 0.5
      return [`Compléter : ${h ? 'augmenter' : 'baisser'} un prix de $${t}\\,\\%$, c'est le multiplier par $1 ${h ? '+' : '-'} \\ldots$`, `$${frac(t, 100)}$, c'est-à-dire $${nb(t / 100)}$`]
    }),
]

const RANGEES_IDS = new Set(RANGEES.map(c => c.id))
export const COURS_3E: QuestionCours[] = [
  ...RANGEES,
  // Les notions d'avant que le professeur ne garde pas : sans compétence,
  // le flash ne les pose plus (elles restent ici, telles quelles)
  ...COURS_3E_AVANT.filter(c => !RANGEES_IDS.has(c.id)),
]
