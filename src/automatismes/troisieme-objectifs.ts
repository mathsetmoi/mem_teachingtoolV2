// =============================================================
// LES OBJECTIFS D'APPRENTISSAGE DE 3e : NOMBRES ET CALCULS
// Le professeur a revu, le 22 novembre 2026, chaque objectif
// d'apprentissage du thème « Nombres et calculs », un par un : les
// exercices et les questions de cours qu'il garde. Cocher un objectif
// dans la fenêtre du flash pose ses questions de cours ; un objectif sans
// question de cours pose ses exercices à la place.
// - Chaque proposition balaie tout l'intitulé de l'objectif : une sorte de
//   problème par exercice.
// - Pas de calculatrice : les nombres restent faciles.
// - L'analyse-synthèse (6e objectif du calcul littéral) est en suspens, à
//   sa demande : rien n'est posé pour elle.
// Ses règles, comme pour le reste de la 3e : réponses courtes, aucune
// réponse possible listée, aucune question à une chance sur deux, rien de
// fixe sauf les phrases qu'il a écrites lui-même.
// =============================================================
import * as F from '../figures'
import type { Automatisme, Facon, QuestionCours } from './outils'
import { PRENOMS, aTrou, choix, ent, frac, grandNb, irreductible, mot, nb, notions, pgcd, relNonNul, unite } from './outils'
import { affine, ppcm } from './troisieme'
import { rangerSousObjectif } from '../objectifs-flash'
import { PROGRAMME_CYCLE4 } from '../programme-cycle4'

const NR = 'Nombres rationnels', PU = 'Puissances', RC = 'Racine carrée', CL = 'Calcul littéral et algébrique'

/** La phrase d'un objectif d'apprentissage de 3e, pour la correction */
const phraseObjectif = (theme: string, k: number) => PROGRAMME_CYCLE4['3e'].flatMap(t => t.domaines).find(d => d.nom === theme || d.nom.startsWith(theme))!.objectifs[k].texte
/** Un exercice rangé sous un objectif d'apprentissage */
export function exoObjectif(theme: string, k: number, id: string, titre: string, generer: Automatisme['generer']): Automatisme {
  rangerSousObjectif('3e', id, theme, k)
  return { id, theme, titre, application: true, programme: phraseObjectif(theme, k), generer }
}
/** Une question de cours rangée sous un objectif (numéros à partir de 200,
 *  pour ne pas croiser ceux des compétences) */
export function notion(theme: string, i: number, objectif: number, titre: string, ...facons: Facon[]): QuestionCours {
  const [q] = notions(theme, [[titre, ...facons]], '3e-')
  return { ...q, id: `cours-3e-${theme}-${i}`, objectif }
}
/** Une phrase à compléter dont le trou change de place (mots entre crochets) */
export function phraseATrou(phrase: string): [string, string] {
  const mots = [...phrase.matchAll(/\[([^\]]+)\]/g)].map(m => m[1])
  const k = ent(0, mots.length - 1)
  let i = -1
  const texte = phrase.replace(/\[([^\]]+)\]/g, (_, m) => (++i === k ? '…' : m))
  return [`Compléter : ${texte.replace('….', '…')}`, mots[k]]
}
/** Les questions de cours dont la phrase est celle du professeur, sans
 *  rien à tirer au hasard (son choix) */
export const PHRASES_DU_PROFESSEUR_3E_OBJECTIFS = new Set<string>()
export const sienne = (q: QuestionCours) => { PHRASES_DU_PROFESSEUR_3E_OBJECTIFS.add(q.id); return q }

// ---------- Petits outils d'écriture ----------
const signe = (x: number) => x < 0 ? '-' : '+'
/** a x² + b x + c, sans les termes nuls ni les 1 inutiles */
function trinome(a: number, b: number, c: number, x = 'x') {
  const t: string[] = []
  if (a) t.push(`${a === 1 ? '' : a === -1 ? '-' : nb(a)}${x}^2`)
  if (b) t.push(`${t.length ? ` ${signe(b)} ` : b < 0 ? '-' : ''}${Math.abs(b) === 1 ? '' : nb(Math.abs(b))}${x}`)
  if (c) t.push(`${t.length ? ` ${signe(c)} ` : c < 0 ? '-' : ''}${nb(Math.abs(c))}`)
  return t.join('') || '0'
}
/** x + a écrit proprement : x + 3, x − 4 */
const xPlus = (a: number, x = 'x') => a === 0 ? x : `${x} ${signe(a)} ${Math.abs(a)}`
/** Une puissance, exposant entre accolades */
const pui = (a: number | string, n: number) => `${a}^{${n}}`
/** « x = 3 ou x = −5 », dans l'ordre croissant */
const ou = (x: string, ...v: string[]) => v.map(s => `${x} = ${s}`).join(' \\text{ ou } ')
const deuxSol = (x: string, a: number, b: number) => a === b ? `${x} = ${nb(a)}` : ou(x, ...[a, b].sort((p, q) => p - q).map(nb))
/** Un nombre en notation scientifique, à partir de ses chiffres (« 45 ») et
 *  de son exposant : 4{,}5 \times 10^{4} */
const ns = (chiffres: string, n: number) => `${chiffres[0]}${chiffres.length > 1 ? `{,}${chiffres.slice(1)}` : ''} \\times 10^{${n}}`
/** L'écriture décimale de « chiffres » × 10^(n − nombre de chiffres + 1) :
 *  ce que vaut ns(chiffres, n) */
function decimal(chiffres: string, n: number) {
  if (n >= 0) {
    const e = n + 1 >= chiffres.length ? chiffres + '0'.repeat(n + 1 - chiffres.length) : `${chiffres.slice(0, n + 1)}.${chiffres.slice(n + 1)}`
    return grandNb(Number(e))
  }
  return `0{,}${'0'.repeat(-n - 1)}${chiffres}`
}
/** Deux chiffres significatifs (le second parfois absent) */
const chiffresAuHasard = () => { const d1 = ent(1, 9), d2 = ent(0, 9); return d2 ? `${d1}${d2}` : `${d1}` }
const INEG = ['\\geqslant', '\\leqslant', '>', '<'] as const
const CONTRAIRE: Record<string, string> = { '\\geqslant': '\\leqslant', '\\leqslant': '\\geqslant', '>': '<', '<': '>' }

export const AUTOMATISMES_3E_OBJECTIFS: Automatisme[] = [
  // ================= NOMBRES RATIONNELS · OBJ3 : problèmes avec des fractions =================
  exoObjectif(NR, 2, '3e-obj-fraction-quantite', 'Une fraction d’une quantité', () => {
    const d = choix([3, 4, 5, 6, 8, 10]); let n: number; do { n = ent(2, d - 1) } while (pgcd(n, d) !== 1)
    const k = ent(2, 8), T = d * k
    const [debut, question] = choix<[string, string]>([
      [`Dans une classe de $${T}$ élèves, les $${frac(n, d)}$ sont demi-pensionnaires.`, 'Combien d\'élèves sont demi-pensionnaires ?'],
      [`${choix(PRENOMS)} a $${T}$ billes et en donne les $${frac(n, d)}$.`, 'Combien de billes sont données ?'],
      [`Un trajet mesure $${T}$ km. On en a parcouru les $${frac(n, d)}$.`, 'Combien de kilomètres a-t-on parcourus ?'],
    ])
    return { enonce: `${debut} ${question}`, reponse: nb(n * k) }
  }),
  exoObjectif(NR, 2, '3e-obj-retrouver-tout', 'Retrouver le tout à partir d’une part', () => {
    const d = choix([3, 4, 5, 6, 8]); let n: number; do { n = ent(2, d - 1) } while (pgcd(n, d) !== 1)
    const k = ent(2, 9)
    return { enonce: choix([`Les $${frac(n, d)}$ d'un nombre valent $${n * k}$. Quel est ce nombre ?`, `Les $${frac(n, d)}$ des élèves d'un club, soit $${n * k}$ élèves, sont des filles. Combien d'élèves compte le club ?`]), reponse: nb(d * k) }
  }),
  exoObjectif(NR, 2, '3e-obj-part-restante', 'La part qui reste', () => {
    const d = ent(3, 10); let n: number; do { n = ent(2, d - 1) } while (pgcd(n, d) !== 1)
    const p = choix(PRENOMS)
    const [e, q] = choix<[string, string]>([[`${p} a lu les $${frac(n, d)}$ d'un livre.`, 'Quelle fraction du livre lui reste-t-il à lire ?'], [`${p} a mangé les $${frac(n, d)}$ d'une tarte.`, 'Quelle fraction de la tarte reste-t-il ?'], [`On a déjà rempli les $${frac(n, d)}$ d'une piscine.`, 'Quelle fraction de la piscine reste-t-il à remplir ?']])
    return { enonce: `${e} ${q}`, reponse: frac(d - n, d) }
  }),
  exoObjectif(NR, 2, '3e-obj-additionner-parts', 'Additionner des parts d’un même tout', () => {
    let a: number, b: number, n1: number, n2: number
    do { [a, b] = [ent(2, 6), ent(2, 6)]; n1 = ent(1, a - 1); n2 = ent(1, b - 1) } while (a === b || n1 * b + n2 * a >= a * b || pgcd(n1, a) !== 1 || pgcd(n2, b) !== 1)
    const p = choix(PRENOMS)
    return { enonce: `${p} dépense $${frac(n1, a)}$ de son argent le lundi et $${frac(n2, b)}$ le mardi. Quelle fraction de son argent est dépensée en tout ?`, reponse: irreductible(n1 * b + n2 * a, a * b) }
  }),
  exoObjectif(NR, 2, '3e-obj-fraction-reste', 'Une fraction du reste', () => {
    const [p, q] = choix<[number, number]>([[1, 3], [1, 4], [1, 2], [1, 5], [2, 5], [3, 4], [2, 3]]), m = choix([2, 3, 4])
    const part = m === 2 ? 'la moitié' : m === 3 ? 'le tiers' : 'le quart'
    return { enonce: `${choix(PRENOMS)} dépense $${frac(p, q)}$ de son argent, puis ${part} de ce qui lui reste. Quelle fraction de son argent lui reste-t-il ?`, reponse: irreductible((q - p) * (m - 1), q * m) }
  }),
  exoObjectif(NR, 2, '3e-obj-proportion-fraction', 'Écrire une proportion sous forme de fraction', () => {
    const d = choix([3, 4, 5, 6, 8, 10]); let n: number; do { n = ent(1, d - 1) } while (pgcd(n, d) !== 1)
    const k = ent(2, 6), T = d * k
    const [debut, question] = choix<[string, string]>([
      [`Dans un club de $${T}$ membres, $${n * k}$ sont des filles.`, 'Quelle fraction des membres sont des filles ?'],
      [`Dans un collège de $${T * 10}$ élèves, $${n * k * 10}$ sont externes.`, 'Quelle fraction des élèves sont externes ?'],
      [`Sur $${T}$ jours, il a plu $${n * k}$ jours.`, 'Pendant quelle fraction des jours a-t-il plu ?'],
    ])
    return { enonce: `${debut} ${question} Donner la fraction irréductible.`, reponse: frac(n, d) }
  }),
  exoObjectif(NR, 2, '3e-obj-comparer-proportions', 'Comparer deux proportions', () => {
    for (;;) {
      const [b, d] = choix<[number, number]>([[5, 10], [4, 8], [3, 6], [2, 5], [4, 5], [3, 4], [5, 4], [10, 5]])
      const a = ent(1, b - 1), c = ent(1, d - 1), D = ppcm(b, d)
      if (a * (D / b) === c * (D / d) || pgcd(a, b) !== 1 || pgcd(c, d) !== 1) continue
      const [x, y] = choix([['A', 'B'], ['Nord', 'Sud'], ['Jean Moulin', 'Victor Hugo']])
      const gagne = a / b > c / d ? x : y
      const eleves = (k: number) => `$${k}$ élève${k > 1 ? 's' : ''}`
      const enD = (p: number, q: number) => q === D ? `$${frac(p, q)}$` : `$${frac(p, q)} = ${frac(p * D / q, D)}$`
      return {
        enonce: `Au collège ${x}, ${eleves(a)} sur $${b}$ ${a > 1 ? 'sont externes' : 'est externe'}. Au collège ${y}, ${eleves(c)} sur $${d}$. Dans quel collège la proportion d'externes est-elle la plus grande ?`,
        reponse: mot(`au collège ${gagne} (${enD(a, b)} et ${enD(c, d)})`),
      }
    }
  }),
  exoObjectif(NR, 2, '3e-obj-diviser-fraction', 'Combien de fois une fraction tient dans une quantité', () => {
    const [n, d] = choix<[number, number]>([[1, 2], [1, 4], [3, 4], [1, 3], [2, 3], [1, 5], [3, 2]]), j = ent(2, 6)
    const [objet, u] = choix([['bouteilles de', 'L'], ['verres de', 'L'], ['morceaux de', 'm']])
    return { enonce: `Combien de ${objet} $${frac(n, d)}$ ${u} peut-on ${u === 'm' ? 'découper dans' : 'remplir avec'} $${n * j}$ ${u} ?`,reponse: nb(d * j) }
  }),
  exoObjectif(NR, 2, '3e-obj-fraction-heure', 'Une fraction d’heure', () => {
    const d = choix([2, 3, 4, 5, 6, 10, 12, 15, 20]); let n: number; do { n = ent(1, d - 1) } while (pgcd(n, d) !== 1)
    return { enonce: `Combien de minutes font $${frac(n, d)}$ d'heure ?`, reponse: unite(nb(60 * n / d), 'min') }
  }),

  // ================= PUISSANCES · OBJ1 : les exposants négatifs =================
  exoObjectif(PU, 0, '3e-obj-puissance-en-fraction', 'D’une puissance négative à une fraction', () => {
    const [a, n] = choix<[number, number]>([[2, 1], [2, 2], [2, 3], [2, 4], [3, 1], [3, 2], [3, 3], [4, 2], [5, 2], [10, 2], [10, 3]])
    return { enonce: `Écrire $${pui(a, -n)}$ sous la forme d'une fraction.`, reponse: `${frac(1, a ** n)}` }
  }),
  exoObjectif(PU, 0, '3e-obj-fraction-en-puissance', 'D’une fraction à une puissance négative', () => {
    const [a, n] = choix<[number, number]>([[2, 2], [2, 3], [2, 4], [3, 2], [3, 3], [4, 2], [5, 2], [5, 3], [10, 3], [10, 4]])
    return { enonce: `Écrire $${frac(1, a ** n)}$ sous la forme d'une puissance de $${a}$.`, reponse: pui(a, -n) }
  }),
  exoObjectif(PU, 0, '3e-obj-produit-en-puissance', 'D’un produit à une puissance négative', () => {
    const a = ent(2, 9), n = ent(2, 5)
    return { enonce: `Écrire $\\frac{1}{${Array(n).fill(a).join(' \\times ')}}$ sous la forme d'une puissance de $${a}$.`, reponse: pui(a, -n) }
  }),
  exoObjectif(PU, 0, '3e-obj-exposant-moins-un', 'L’exposant −1, c’est l’inverse', () => {
    const a = ent(2, 12)
    return { enonce: `Écrire $${pui(a, -1)}$ sous la forme d'une fraction.`, reponse: frac(1, a) }
  }),
  exoObjectif(PU, 0, '3e-obj-dix-negatif-decimal', 'Une puissance de 10 négative en écriture décimale', () => {
    const n = ent(1, 6)
    return { enonce: `Donner l'écriture décimale de $${pui(10, -n)}$.`, reponse: decimal('1', -n) }
  }),
  exoObjectif(PU, 0, '3e-obj-decimal-dix-negatif', 'Un nombre décimal en puissance de 10', () => {
    const n = ent(1, 6)
    return { enonce: `Écrire $${decimal('1', -n)}$ sous la forme d'une puissance de $10$.`, reponse: pui(10, -n) }
  }),
  exoObjectif(PU, 0, '3e-obj-inverse-puissance-negative', 'L’inverse d’une puissance négative', () => {
    const [a, n] = choix<[number, number]>([[2, 2], [2, 3], [2, 4], [3, 2], [3, 3], [4, 2], [5, 2], [10, 3]])
    return { enonce: `Calculer $\\frac{1}{${pui(a, -n)}}$`, reponse: `${pui(a, n)} = ${grandNb(a ** n)}` }
  }),

  // ================= PUISSANCES · OBJ2 : multiplier et diviser =================
  exoObjectif(PU, 1, '3e-obj-produit-meme-base', 'Un produit de puissances d’un même nombre', () => {
    const a = ent(2, 9), m = ent(2, 7), n = ent(2, 7)
    return { enonce: `Écrire $${pui(a, m)} \\times ${pui(a, n)}$ sous la forme d'une puissance de $${a}$.`, reponse: pui(a, m + n) }
  }),
  exoObjectif(PU, 1, '3e-obj-produit-exposant-negatif', 'Un produit avec un exposant négatif', () => {
    const a = choix([2, 3, 5, 7, 10]), m = -ent(1, 7), n = choix([2, 3, 4, 5, 6, 7, 8, 9].filter(k => k + m > 1 || k + m < 0))
    const [p, q] = Math.random() < 0.5 ? [m, n] : [n, m]
    return { enonce: `Écrire $${pui(a, p)} \\times ${pui(a, q)}$ sous la forme d'une puissance de $${a}$.`, reponse: pui(a, m + n) }
  }),
  exoObjectif(PU, 1, '3e-obj-quotient-meme-base', 'Un quotient de puissances d’un même nombre', () => {
    const a = ent(2, 9), n = ent(2, 5), m = n + ent(2, 6)
    return { enonce: `Écrire $\\frac{${pui(a, m)}}{${pui(a, n)}}$ sous la forme d'une puissance de $${a}$.`, reponse: pui(a, m - n) }
  }),
  exoObjectif(PU, 1, '3e-obj-quotient-exposant-negatif', 'Un quotient qui donne un exposant négatif', () => {
    const a = choix([10, 10, 2, 3, 5]), m = ent(2, 5), n = m + ent(1, 5)
    return { enonce: `Écrire $\\frac{${pui(a, m)}}{${pui(a, n)}}$ sous la forme d'une puissance de $${a}$.`, reponse: pui(a, m - n) }
  }),
  exoObjectif(PU, 1, '3e-obj-produit-meme-exposant', 'Un produit de puissances de même exposant', () => {
    const [a, b] = choix<[number, number]>([[2, 5], [2, 3], [3, 5], [4, 5], [2, 7], [5, 2], [3, 4]]), n = ent(2, 9)
    return { enonce: `Écrire $${pui(a, n)} \\times ${pui(b, n)}$ sous la forme d'une seule puissance.`, reponse: pui(a * b, n) }
  }),
  exoObjectif(PU, 1, '3e-obj-quotient-meme-exposant', 'Un quotient de puissances de même exposant', () => {
    const [a, b] = choix<[number, number]>([[6, 3], [10, 2], [10, 5], [15, 5], [12, 4], [14, 7], [12, 3], [6, 2]]), n = ent(2, 9)
    return { enonce: `Écrire $\\frac{${pui(a, n)}}{${pui(b, n)}}$ sous la forme d'une seule puissance.`, reponse: pui(a / b, n) }
  }),
  exoObjectif(PU, 1, '3e-obj-produit-quotient-dix', 'Produit et quotient de puissances de 10', () => {
    let p: number, q: number, r: number
    do { p = relNonNul(1, 7); q = relNonNul(1, 7); r = relNonNul(1, 6) } while (p + q - r === 0 || p + q - r === 1)
    return { enonce: `Écrire $\\frac{${pui(10, p)} \\times ${pui(10, q)}}{${pui(10, r)}}$ sous la forme d'une puissance de $10$.`, reponse: pui(10, p + q - r) }
  }),
  exoObjectif(PU, 1, '3e-obj-exposant-manquant', 'Retrouver l’exposant', () => {
    const a = ent(2, 9), m = ent(2, 8); let k: number; do { k = ent(-4, 10) } while (k === m || k === 0 || k === 1 || k - m === 1)
    return choix([
      aTrou(`Compléter : $${pui(a, m)} \\times ${a}^{\\ldots} = ${pui(a, k)}$`, nb(k - m)),
      aTrou(`Compléter : $\\frac{${pui(a, k)}}{${a}^{\\ldots}} = ${pui(a, k - m)}$`, nb(m)),
    ])
  }),

  // ================= PUISSANCES · OBJ3 : la notation scientifique =================
  exoObjectif(PU, 2, '3e-obj-ns-grand', 'La notation scientifique d’un grand nombre', () => {
    const c = chiffresAuHasard(), n = ent(3, 8)
    return { enonce: `Écrire $${decimal(c, n)}$ en notation scientifique.`, reponse: ns(c, n) }
  }),
  exoObjectif(PU, 2, '3e-obj-ns-petit', 'La notation scientifique d’un petit nombre', () => {
    const c = chiffresAuHasard(), n = -ent(1, 5)
    return { enonce: `Écrire $${decimal(c, n)}$ en notation scientifique.`, reponse: ns(c, n) }
  }),
  exoObjectif(PU, 2, '3e-obj-ns-vers-decimal', 'De la notation scientifique à l’écriture décimale', () => {
    const c = chiffresAuHasard(), n = ent(2, 6)
    return { enonce: `Donner l'écriture décimale de $${ns(c, n)}$.`, reponse: decimal(c, n) }
  }),
  exoObjectif(PU, 2, '3e-obj-ns-vers-decimal-negatif', 'De la notation scientifique à l’écriture décimale (exposant négatif)', () => {
    const c = chiffresAuHasard(), n = -ent(1, 5)
    return { enonce: `Donner l'écriture décimale de $${ns(c, n)}$.`, reponse: decimal(c, n) }
  }),
  exoObjectif(PU, 2, '3e-obj-ns-corriger-grand', 'Corriger une écriture qui n’est pas scientifique', () => {
    const d1 = ent(1, 9), d2 = ent(1, 9), n = choix([-8, -7, -6, -5, -4, -3, -2, 1, 2, 3, 4, 5, 6, 7, 8])
    return { enonce: `Écrire $${d1}${d2} \\times ${pui(10, n)}$ en notation scientifique.`, reponse: ns(`${d1}${d2}`, n + 1) }
  }),
  exoObjectif(PU, 2, '3e-obj-ns-corriger-petit', 'Corriger une écriture qui n’est pas scientifique (trop petit)', () => {
    const c = chiffresAuHasard(), n = choix([-6, -5, -4, -3, -2, -1, 2, 3, 4, 5, 6])
    return { enonce: `Écrire $0{,}${c} \\times ${pui(10, n)}$ en notation scientifique.`, reponse: ns(c, n - 1) }
  }),
  exoObjectif(PU, 2, '3e-obj-ns-produit', 'Un produit en notation scientifique', () => {
    let a: number, b: number; do { a = ent(2, 4); b = ent(2, 4) } while (a * b >= 10)
    let p: number, q: number; do { p = relNonNul(1, 8); q = relNonNul(1, 8) } while (p + q === 0)
    return { enonce: `Écrire $(${a} \\times ${pui(10, p)}) \\times (${b} \\times ${pui(10, q)})$ en notation scientifique.`, reponse: `${a * b} \\times ${pui(10, p + q)}` }
  }),
  exoObjectif(PU, 2, '3e-obj-ns-exposant', 'L’exposant de la notation scientifique', () => {
    const c = chiffresAuHasard(), n = Math.random() < 0.6 ? ent(2, 8) : -ent(1, 5)
    return { enonce: `Quel est l'exposant de $10$ dans la notation scientifique de $${decimal(c, n)}$ ?`, reponse: nb(n) }
  }),

  // ================= PUISSANCES · OBJ4 : des problèmes =================
  exoObjectif(PU, 3, '3e-obj-ns-grandeur', 'Écrire une grandeur en notation scientifique', () => {
    const [e, r] = choix<[string, string]>([
      [`La population mondiale est d'environ $${ent(7, 9)}$ milliards d'habitants.`, ''],
      [`La France compte environ $68$ millions d'habitants.`, '6{,}8 \\times 10^{7}'],
      [`La distance entre la Terre et le Soleil est d'environ $150$ millions de km.`, '1{,}5 \\times 10^{8}\\text{ km}'],
      [`La Terre a environ $4{,}5$ milliards d'années.`, '4{,}5 \\times 10^{9}\\text{ ans}'],
      [`Un cheveu a une épaisseur d'environ $0{,}07$ mm.`, '7 \\times 10^{-2}\\text{ mm}'],
      [`Un globule rouge mesure environ $0{,}000\\,007$ m.`, '7 \\times 10^{-6}\\text{ m}'],
      [`La Lune est à environ $384\\,000$ km de la Terre.`, '3{,}84 \\times 10^{5}\\text{ km}'],
    ])
    const rep = r || `${e.match(/\$(\d)\$/)![1]} \\times 10^{9}`
    return { enonce: `${e} Écrire ce nombre en notation scientifique.`, reponse: rep }
  }),
  exoObjectif(PU, 3, '3e-obj-pile-feuilles', 'Un produit : empiler', () => {
    const p = ent(3, 5), q = ent(p + 1, p + 4)
    const [objet, quoi] = choix([['une feuille', 'feuilles'], ['une pièce de monnaie', 'pièces'], ['une carte', 'cartes']])
    const ep = objet === 'une feuille' ? p : Math.min(p, 3)
    return { enonce: `${objet[0].toUpperCase() + objet.slice(1)} a une épaisseur de $${pui(10, -ep)}$ m. Quelle est la hauteur d'une pile de $${pui(10, q)}$ ${quoi} ?`, reponse: `${pui(10, q - ep)}\\text{ m} = ${grandNb(10 ** (q - ep))}\\text{ m}` }
  }),
  exoObjectif(PU, 3, '3e-obj-vitesse-duree', 'Une vitesse et une durée', () => {
    const k = ent(1, 3), n = ent(1, 3)
    return { enonce: `La lumière parcourt $3 \\times 10^{5}$ km en une seconde. Quelle distance parcourt-elle en $${k === 1 ? '' : `${k} \\times `}${pui(10, n)}$ secondes ?`, reponse: `${3 * k} \\times ${pui(10, 5 + n)}\\text{ km}` }
  }),
  exoObjectif(PU, 3, '3e-obj-partager', 'Un quotient : partager', () => {
    const [b, c] = choix<[number, number]>([[2, 2], [2, 3], [2, 4], [3, 3], [4, 2], [3, 2]]), p = ent(9, 12), q = ent(5, 7)
    return { enonce: `Une clé contient $${b * c} \\times ${pui(10, p)}$ octets. Elle est remplie de photos de $${b} \\times ${pui(10, q)}$ octets chacune. Combien de photos contient-elle ?`, reponse: mot(`$${c} \\times ${pui(10, p - q)}$ photos, soit $${grandNb(c * 10 ** (p - q))}$ photos`) }
  }),
  exoObjectif(PU, 3, '3e-obj-combien-de-fois', 'Combien de fois plus grand', () => {
    const [b, c] = choix<[number, number]>([[2, 3], [2, 4], [3, 3], [2, 2], [4, 2], [3, 2]]), q = ent(2, 6), p = q + ent(1, 4)
    return { enonce: `Une distance de $${b * c} \\times ${pui(10, p)}$ km est combien de fois plus grande qu'une distance de $${b} \\times ${pui(10, q)}$ km ?`, reponse: mot(`$${c} \\times ${pui(10, p - q)}$ fois, soit $${grandNb(c * 10 ** (p - q))}$ fois`) }
  }),
  exoObjectif(PU, 3, '3e-obj-changer-unite', 'Changer d’unité', () => {
    const a = ent(2, 9), n = ent(4, 8), [u, k] = choix<[string, number]>([['mm', 3], ['cm', 2]])
    const [objet, pronom] = choix([['Une bactérie', 'elle'], ['Un grain de pollen', 'il'], ['Un virus', 'il']])
    return { enonce: `${objet} mesure $${a} \\times ${pui(10, -n)}$ m. Combien mesure-t-${pronom} en ${u} ?`,reponse: `${a} \\times ${pui(10, k - n)}\\text{ ${u}}` }
  }),
  exoObjectif(PU, 3, '3e-obj-prefixes', 'Les préfixes', () => {
    const [p, n] = choix<[string, number]>([['kilo', 3], ['méga', 6], ['giga', 9], ['milli', -3], ['micro', -6], ['nano', -9]])
    const [u, s] = choix([['mètre', 'm'], ['gramme', 'g']])
    return aTrou(`Compléter : $1$ ${p}${u} $= 10^{\\ldots}$ ${s}`, nb(n))
  }),
  exoObjectif(PU, 3, '3e-obj-croissance', 'Une croissance par puissances', () => {
    const [b, mot1] = choix<[number, string]>([[2, 'double'], [3, 'triple'], [10, 'est multiplié par $10$']]), n = b === 2 ? ent(3, 6) : b === 3 ? ent(2, 4) : ent(2, 6)
    return { enonce: `Le nombre de bactéries d'une culture ${mot1} toutes les heures. Par combien est-il multiplié en $${n}$ heures ?`, reponse: `${pui(b, n)} = ${grandNb(b ** n)}` }
  }),

  // ================= RACINE CARRÉE · OBJ1 : x² = a =================
  exoObjectif(RC, 0, '3e-obj-x2-carre-parfait', 'x² = a, avec a un carré parfait', () => {
    const k = ent(1, 12), x = choix(['x', 'y', 't'])
    return { enonce: `Résoudre l'équation $${x}^2 = ${k * k}$.`, reponse: ou(x, `-${k}`, `${k}`) }
  }),
  exoObjectif(RC, 0, '3e-obj-x2-racine', 'x² = a, sans carré parfait', () => {
    let a: number; do { a = ent(2, 30) } while (Number.isInteger(Math.sqrt(a)))
    const x = choix(['x', 'y', 't'])
    return { enonce: `Résoudre l'équation $${x}^2 = ${a}$.`, reponse: ou(x, `-\\sqrt{${a}}`, `\\sqrt{${a}}`) }
  }),
  exoObjectif(RC, 0, '3e-obj-x2-zero', 'x² = 0', () => {
    const x = choix(['x', 'y', 't']), k = choix([1, 1, 2, 3, 5])
    return { enonce: `Résoudre l'équation $${k === 1 ? '' : k}${x}^2 = 0$.`, reponse: `${x} = 0` }
  }),
  exoObjectif(RC, 0, '3e-obj-x2-negatif', 'x² = a, avec a négatif', () => {
    const a = ent(1, 50), x = choix(['x', 'y', 't'])
    return { enonce: `Résoudre l'équation $${x}^2 = -${a}$.`, reponse: mot('aucune solution (un carré n\'est jamais négatif)') }
  }),
  exoObjectif(RC, 0, '3e-obj-x2-nombre-solutions', 'Le nombre de solutions de x² = a', () => {
    const a = choix([relNonNul(1, 50), relNonNul(1, 50), 0]), x = choix(['x', 'y', 't'])
    return { enonce: `Combien de solutions l'équation $${x}^2 = ${nb(a)}$ a-t-elle ?`, reponse: mot(a > 0 ? `deux : $-\\sqrt{${a}}$ et $\\sqrt{${a}}$` : a === 0 ? 'une seule : $0$' : 'aucune') }
  }),
  exoObjectif(RC, 0, '3e-obj-x2-se-ramener', 'Se ramener à x² = a', () => {
    const m = ent(2, 9), x = choix(['x', 'y', 't'])
    if (Math.random() < 0.5) { const k = ent(2, 5); return { enonce: `Résoudre l'équation $${k}${x}^2 = ${k * m * m}$.`, reponse: ou(x, `-${m}`, `${m}`) } }
    const b = ent(1, 20), s = choix([1, -1])
    return { enonce: `Résoudre l'équation $${x}^2 ${s > 0 ? '+' : '-'} ${b} = ${m * m + s * b}$.`, reponse: ou(x, `-${m}`, `${m}`) }
  }),
  exoObjectif(RC, 0, '3e-obj-x2-lire-graphique', 'Lire les solutions de x² = a sur un graphique', () => {
    const a = choix([1, 4, 9, 4, 9, 0, -1, -2])
    return {
      enonce: `On a tracé la courbe de $y = x^2$ et la droite d'équation $y = ${nb(a)}$. Lire sur le graphique les solutions de l'équation $x^2 = ${nb(a)}$.`,
      reponse: a > 0 ? ou('x', `-${Math.sqrt(a)}`, `${Math.sqrt(a)}`) : a === 0 ? 'x = 0' : mot('aucune solution : la droite ne coupe pas la courbe'),
      figure: F.paraboleEtDroite(a),
    }
  }),
  exoObjectif(RC, 0, '3e-obj-x2-quelle-droite', 'Quelle droite tracer pour résoudre x² = a', () => {
    const a = ent(1, 20)
    return { enonce: `Pour résoudre graphiquement l'équation $x^2 = ${a}$, on trace la courbe de $y = x^2$. Quelle droite faut-il tracer aussi ?`, reponse: mot(`la droite (horizontale) d'équation $y = ${a}$`) }
  }),

  // ================= RACINE CARRÉE · OBJ2 : des problèmes =================
  exoObjectif(RC, 1, '3e-obj-cote-carre', 'Le côté d’un carré d’aire donnée', () => {
    const k = ent(2, 12), u = choix(['cm', 'm'])
    return { enonce: `Un carré a une aire de $${k * k}$ ${u}². Quelle est la longueur de son côté ?`, reponse: unite(nb(k), u) }
  }),
  exoObjectif(RC, 1, '3e-obj-cote-carre-racine', 'Le côté d’un carré, sans carré parfait', () => {
    let A: number; do { A = ent(2, 99) } while (Number.isInteger(Math.sqrt(A)))
    const u = choix(['cm', 'm'])
    return { enonce: `Un carré a une aire de $${A}$ ${u}². Donner la valeur exacte de la longueur de son côté.`, reponse: `\\sqrt{${A}}\\text{ ${u}}` }
  }),
  exoObjectif(RC, 1, '3e-obj-cote-encadrer', 'Encadrer le côté d’un carré', () => {
    let A: number; do { A = ent(5, 140) } while (Number.isInteger(Math.sqrt(A)))
    const k = Math.floor(Math.sqrt(A))
    return { enonce: `Le côté d'un carré d'aire $${A}$ cm² est compris entre deux nombres entiers consécutifs. Lesquels ?`, reponse: mot(`entre $${k}$ cm et $${k + 1}$ cm ($${k * k} < ${A} < ${(k + 1) * (k + 1)}$)`) }
  }),
  exoObjectif(RC, 1, '3e-obj-pythagore-hypotenuse', 'Pythagore : l’hypoténuse', () => {
    const [a, b, c] = choix<[number, number, number]>([[3, 4, 5], [6, 8, 10], [5, 12, 13], [9, 12, 15], [12, 16, 20], [8, 6, 10], [4, 3, 5]])
    return { enonce: `Un triangle rectangle a des côtés de l'angle droit de $${a}$ cm et $${b}$ cm. Quelle est la longueur de son hypoténuse ?`, reponse: unite(nb(c), 'cm') }
  }),
  exoObjectif(RC, 1, '3e-obj-pythagore-cote', 'Pythagore : un côté de l’angle droit', () => {
    const [a, b, c] = choix<[number, number, number]>([[3, 4, 5], [6, 8, 10], [5, 12, 13], [9, 12, 15], [8, 6, 10], [4, 3, 5], [12, 5, 13]])
    return { enonce: `L'hypoténuse d'un triangle rectangle mesure $${c}$ cm et un côté de l'angle droit $${a}$ cm. Quelle est la longueur de l'autre côté de l'angle droit ?`, reponse: unite(nb(b), 'cm') }
  }),
  exoObjectif(RC, 1, '3e-obj-diagonale', 'La longueur d’une diagonale', () => {
    if (Math.random() < 0.5) {
      const c = ent(1, 4)
      return { enonce: `Quelle est la valeur exacte de la longueur de la diagonale d'un carré de côté $${c}$ cm ?`, reponse: c === 1 ? '\\sqrt{2}\\text{ cm}' : `\\sqrt{${2 * c * c}}\\text{ cm} = ${c}\\sqrt{2}\\text{ cm}` }
    }
    const [a, b] = choix<[number, number]>([[1, 2], [1, 3], [2, 3], [1, 4], [2, 5], [3, 4]])
    const d2 = a * a + b * b
    return { enonce: `Quelle est la valeur exacte de la longueur de la diagonale d'un rectangle de $${a}$ cm sur $${b}$ cm ?`, reponse: Number.isInteger(Math.sqrt(d2)) ? unite(nb(Math.sqrt(d2)), 'cm') : `\\sqrt{${d2}}\\text{ cm}` }
  }),
  exoObjectif(RC, 1, '3e-obj-rayon-disque', 'Le rayon d’un disque d’aire donnée', () => {
    const k = ent(2, 10)
    return { enonce: `Un disque a une aire de $${k * k}\\pi$ cm². Quel est son rayon ?`, reponse: unite(nb(k), 'cm') }
  }),
  exoObjectif(RC, 1, '3e-obj-carre-meme-aire', 'Un carré de même aire qu’un rectangle', () => {
    const [a, b, c] = choix<[number, number, number]>([[4, 9, 6], [2, 8, 4], [1, 16, 4], [4, 16, 8], [9, 16, 12], [2, 18, 6], [3, 12, 6], [5, 20, 10], [3, 27, 9], [1, 25, 5]])
    return { enonce: `Un carré a la même aire qu'un rectangle de $${a}$ cm sur $${b}$ cm. Quelle est la longueur de son côté ?`, reponse: unite(nb(c), 'cm') }
  }),

  // ================= CALCUL LITTÉRAL · OBJ1 : simplifier produits et rapports =================
  exoObjectif(CL, 0, '3e-obj-produit-une-lettre', 'Simplifier un produit (une seule lettre)', () => {
    const x = choix(['x', 'a', 'y', 't']), a = ent(2, 9), b = ent(2, 9)
    return { enonce: `Simplifier : $${a}${x} \\times ${b}${x}$`, reponse: `${a * b}${x}^2` }
  }),
  exoObjectif(CL, 0, '3e-obj-produit-lettres', 'Simplifier un produit (plusieurs lettres)', () => {
    const [x, y] = choix([['a', 'b'], ['x', 'y'], ['m', 'n']]), a = ent(2, 9), b = ent(2, 9)
    return choix([
      { enonce: `Simplifier : $${a}${x} \\times ${b}${x}${y}$`, reponse: `${a * b}${x}^2${y}` },
      { enonce: `Simplifier : $${a}${x}${y} \\times ${b}${y}$`, reponse: `${a * b}${x}${y}^2` },
      { enonce: `Simplifier : $${a}${x} \\times ${b}${y}$`, reponse: `${a * b}${x}${y}` },
    ])
  }),
  exoObjectif(CL, 0, '3e-obj-carre-produit', 'Simplifier un carré', () => {
    const x = choix(['x', 'a', 'y']), k = ent(2, 9)
    return { enonce: `Simplifier : $(${k}${x})^2$`, reponse: `${k * k}${x}^2` }
  }),
  exoObjectif(CL, 0, '3e-obj-rapport-nombre', 'Simplifier un rapport (un nombre en commun)', () => {
    const x = choix(['x', 'a', 'y']), a = ent(2, 9), b = ent(2, 9)
    return { enonce: `Simplifier : $\\frac{${a * b}${x}}{${a}}$`, reponse: `${b}${x}` }
  }),
  exoObjectif(CL, 0, '3e-obj-rapport-lettre', 'Simplifier un rapport (une lettre en commun)', () => {
    const x = choix(['x', 'a', 'y']), c = ent(2, 9), k = ent(2, 9)
    return { enonce: `Simplifier : $\\frac{${k * c}${x}}{${c}${x}}$ (avec $${x} \\neq 0$)`, reponse: nb(k) }
  }),
  exoObjectif(CL, 0, '3e-obj-rapport-puissances', 'Simplifier un rapport avec des puissances', () => {
    const x = choix(['x', 'a', 'y']), b = ent(2, 5), c = ent(2, 5), n = ent(1, 3), m = n + ent(1, 3)
    const p = (k: number) => k === 1 ? x : `${x}^${k}`
    return { enonce: `Simplifier : $\\frac{${b * c}${p(m)}}{${b}${p(n)}}$ (avec $${x} \\neq 0$)`, reponse: `${c}${p(m - n)}` }
  }),
  exoObjectif(CL, 0, '3e-obj-rapport-lettres', 'Simplifier un rapport (plusieurs lettres)', () => {
    const [x, y] = choix([['a', 'b'], ['x', 'y'], ['m', 'n']]), b = ent(2, 9), c = ent(2, 9)
    return { enonce: `Simplifier : $\\frac{${b * c}${x}${y}}{${b}${x}}$ (avec $${x} \\neq 0$)`, reponse: `${c}${y}` }
  }),
  exoObjectif(CL, 0, '3e-obj-rapport-parenthese', 'Simplifier un rapport (une parenthèse en commun)', () => {
    let p: number, r: number; do { p = ent(2, 9); r = ent(2, 9) } while (pgcd(p, r) !== 1)
    const x = choix(['x', 'a', 'y']), q = relNonNul(1, 9)
    return { enonce: `Simplifier : $\\frac{${p}(${xPlus(q, x)})}{${r}(${xPlus(q, x)})}$ (avec $${x} \\neq ${-q}$)`, reponse: frac(p, r) }
  }),

  // ================= CALCUL LITTÉRAL · OBJ2 : la double distributivité =================
  exoObjectif(CL, 1, '3e-obj-double-simple', 'Développer (x + a)(x + b)', () => {
    const a = ent(1, 9), b = ent(1, 9), x = choix(['x', 'a', 'y'])
    return { enonce: `Développer et réduire : $(${xPlus(a, x)})(${xPlus(b, x)})$`, reponse: trinome(1, a + b, a * b, x) }
  }),
  exoObjectif(CL, 1, '3e-obj-double-signe', 'Développer avec un signe moins', () => {
    const a = -ent(1, 9), b = choix([-9, -8, -7, -6, -5, -4, -3, -2, -1, 1, 2, 3, 4, 5, 6, 7, 8, 9].filter(v => v !== a)), x = choix(['x', 'a', 'y'])
    const [p, q] = Math.random() < 0.5 ? [a, b] : [b, a]
    return { enonce: `Développer et réduire : $(${xPlus(p, x)})(${xPlus(q, x)})$`, reponse: trinome(1, a + b, a * b, x) }
  }),
  exoObjectif(CL, 1, '3e-obj-double-coefficient', 'Développer avec un coefficient devant x', () => {
    const k = ent(2, 5), a = relNonNul(1, 7), b = relNonNul(1, 7), x = choix(['x', 'a', 'y'])
    return { enonce: `Développer et réduire : $(${affine(k, a, x)})(${xPlus(b, x)})$`, reponse: trinome(k, k * b + a, a * b, x) }
  }),
  exoObjectif(CL, 1, '3e-obj-double-completer', 'Compléter un développement', () => {
    const a = relNonNul(1, 9), b = relNonNul(1, 9)
    if (a + b === 0) return aTrou(`Compléter : $(${xPlus(a)})(${xPlus(b)}) = x^2 \\ldots$`, nb(a * b))
    return aTrou(`Compléter : $(${xPlus(a)})(${xPlus(b)}) = x^2 ${signe(a + b)} \\ldots x ${signe(a * b)} ${Math.abs(a * b)}$`, nb(Math.abs(a + b)))
  }),
  exoObjectif(CL, 1, '3e-obj-facteur-commun', 'Trouver le facteur commun', () => {
    const a = relNonNul(1, 9), k = ent(2, 9), m = ent(1, 9), s = choix(['+', '-'])
    return { enonce: `Quel est le facteur commun dans l'expression $${k}x(${xPlus(a)}) ${s} ${m}(${xPlus(a)})$ ?`, reponse: `(${xPlus(a)})` }
  }),
  exoObjectif(CL, 1, '3e-obj-factoriser-somme', 'Factoriser une somme', () => {
    let p: number, q: number, r: number, s: number
    do { p = ent(1, 4); q = relNonNul(1, 6); r = ent(1, 4); s = relNonNul(1, 6) } while (q + s === 0 || pgcd(p + r, q + s) !== 1)
    const a = relNonNul(1, 6)
    return { enonce: `Factoriser : $(${xPlus(a)})(${affine(p, q)}) + (${xPlus(a)})(${affine(r, s)})$`, reponse: `(${xPlus(a)})(${affine(p + r, q + s)})` }
  }),
  exoObjectif(CL, 1, '3e-obj-factoriser-difference', 'Factoriser une différence', () => {
    let p: number, q: number, r: number, s: number
    do { p = ent(1, 4); q = relNonNul(1, 6); r = ent(1, 4); s = relNonNul(1, 6) } while (p === r || q === s || pgcd(p - r, q - s) !== 1)
    const a = relNonNul(1, 6)
    return { enonce: `Factoriser : $(${xPlus(a)})(${affine(p, q)}) - (${xPlus(a)})(${affine(r, s)})$`, reponse: `(${xPlus(a)})(${affine(p - r, q - s)})` }
  }),
  exoObjectif(CL, 1, '3e-obj-factoriser-seul', 'Factoriser quand le facteur apparaît seul', () => {
    let a: number, b: number; const s = choix([1, -1])
    do { a = relNonNul(1, 6); b = relNonNul(1, 6) } while (b + s === 0 || a === b || b + s === a)
    return { enonce: `Factoriser : $(${xPlus(a)})(${xPlus(b)}) ${s > 0 ? '+' : '-'} (${xPlus(a)})$`, reponse: `(${xPlus(a)})(${xPlus(b + s)})` }
  }),

  // ================= CALCUL LITTÉRAL · OBJ3 : l'inéquation ax ⩾ b =================
  exoObjectif(CL, 2, '3e-obj-ineq-positif', 'Résoudre ax ⩾ b, avec a positif', () => {
    const a = ent(2, 9), s = relNonNul(1, 9), sy = choix([...INEG]), x = choix(['x', 'y', 't'])
    return { enonce: `Résoudre l'inéquation $${a}${x} ${sy} ${a * s}$.`, reponse: `${x} ${sy} ${nb(s)}` }
  }),
  exoObjectif(CL, 2, '3e-obj-ineq-negatif', 'Résoudre ax ⩾ b, avec a négatif', () => {
    const a = -ent(2, 9), s = relNonNul(1, 9), sy = choix([...INEG]), x = choix(['x', 'y', 't'])
    return { enonce: `Résoudre l'inéquation $${a}${x} ${sy} ${nb(a * s)}$.`, reponse: mot(`$${x} ${CONTRAIRE[sy]} ${nb(s)}$ (on divise par $${a}$, un nombre négatif : le sens change)`) }
  }),
  exoObjectif(CL, 2, '3e-obj-ineq-fraction', 'Une inéquation dont la solution est une fraction', () => {
    let a: number, b: number; do { a = ent(2, 9); b = relNonNul(1, 20) } while (b % a === 0)
    const sy = choix([...INEG])
    return { enonce: `Résoudre l'inéquation $${a}x ${sy} ${b}$.`, reponse: `x ${sy} ${irreductible(b, a)}` }
  }),
  exoObjectif(CL, 2, '3e-obj-ineq-plus-petit-entier', 'Le plus petit entier solution', () => {
    let a: number, b: number; do { a = ent(2, 9); b = ent(1, 50) } while (b % a === 0)
    if (Math.random() < 0.5) return { enonce: `Quel est le plus petit nombre entier solution de l'inéquation $${a}x ${choix(['\\geqslant', '>'])} ${b}$ ?`, reponse: nb(Math.ceil(b / a)) }
    return { enonce: `Quel est le plus grand nombre entier solution de l'inéquation $${a}x ${choix(['\\leqslant', '<'])} ${b}$ ?`, reponse: nb(Math.floor(b / a)) }
  }),
  exoObjectif(CL, 2, '3e-obj-ineq-droite-graduee', 'Lire les solutions sur une droite graduée', () => {
    const borne = ent(-5, 5), droite = Math.random() < 0.5, compris = Math.random() < 0.5
    const sy = droite ? (compris ? '\\geqslant' : '>') : (compris ? '\\leqslant' : '<')
    return { enonce: 'Les solutions d\'une inéquation sont coloriées sur cette droite graduée. Quelle inégalité les nombres $x$ solutions vérifient-ils ?', reponse: `x ${sy} ${nb(borne)}`, figure: F.intervalleGradue(borne, droite, compris) }
  }),
  exoObjectif(CL, 2, '3e-obj-ineq-graphique', 'Résoudre ax ⩾ b avec la droite y = ax', () => {
    const a = choix([2, -1, -2]), s = choix([-2, -1, 1, 2]), sy = choix(['\\geqslant', '\\leqslant'])
    const rep = a > 0 ? sy : CONTRAIRE[sy]
    const ax = a === 1 ? 'x' : a === -1 ? '-x' : `${a}x`
    return { enonce: `On a tracé la droite d'équation $y = ${ax}$. Lire sur le graphique les solutions de l'inéquation $${ax} ${sy} ${nb(a * s)}$.`, reponse: `x ${rep} ${nb(s)}`, figure: F.droitesRepere([{ m: a, p: 0 }]) }
  }),
  exoObjectif(CL, 2, '3e-obj-ineq-deux-droites', 'Où une droite est au-dessus de l’autre', () => {
    const a = choix([1, 2, -1, -2]), s = choix([-2, -1, 1, 2]), dessus = Math.random() < 0.5
    const ax = a === 1 ? 'x' : a === -1 ? '-x' : `${a}x`
    const rep = (a > 0) === dessus ? '>' : '<'
    return { enonce: `On a tracé les droites d'équations $y = ${ax}$ et $y = ${nb(a * s)}$. Pour quelles valeurs de $x$ la droite $y = ${ax}$ est-elle ${dessus ? 'au-dessus' : 'en dessous'} de la droite $y = ${nb(a * s)}$ ?`, reponse: `x ${rep} ${nb(s)}`, figure: F.droitesRepere([{ m: a, p: 0 }, { m: 0, p: a * s }]) }
  }),

  // ================= CALCUL LITTÉRAL · OBJ4 : l'équation produit nul =================
  exoObjectif(CL, 3, '3e-obj-produit-nul-simple', 'Une équation produit nul', () => {
    let a: number, b: number; do { a = relNonNul(1, 9); b = relNonNul(1, 9) } while (a === b)
    return { enonce: `Résoudre l'équation $(${xPlus(-a)})(${xPlus(-b)}) = 0$.`, reponse: deuxSol('x', a, b) }
  }),
  exoObjectif(CL, 3, '3e-obj-produit-nul-coefficient', 'Une équation produit nul avec un coefficient', () => {
    let a: number, b: number; do { a = relNonNul(1, 6); b = relNonNul(1, 9) } while (a === b)
    const k = ent(2, 5)
    return { enonce: `Résoudre l'équation $(${affine(k, -k * a)})(${xPlus(-b)}) = 0$.`, reponse: deuxSol('x', a, b) }
  }),
  exoObjectif(CL, 3, '3e-obj-produit-nul-fraction', 'Une équation produit nul dont une solution est une fraction', () => {
    let p: number, q: number; do { p = ent(2, 5); q = relNonNul(1, 9) } while (q % p === 0)
    const r = relNonNul(1, 9), sol = [[-q / p, irreductible(-q, p)], [r, nb(r)]] as [number, string][]
    sol.sort((u, v) => u[0] - v[0])
    return { enonce: `Résoudre l'équation $(${affine(p, q)})(${xPlus(-r)}) = 0$.`, reponse: ou('x', ...sol.map(s => s[1])) }
  }),
  exoObjectif(CL, 3, '3e-obj-produit-nul-x', 'x est un des facteurs', () => {
    const a = relNonNul(1, 9), k = choix([1, 1, 2, 3])
    return { enonce: `Résoudre l'équation $${k === 1 ? '' : k}x(${xPlus(-a)}) = 0$.`, reponse: deuxSol('x', 0, a) }
  }),
  exoObjectif(CL, 3, '3e-obj-produit-nul-carre', 'Un carré nul', () => {
    const a = relNonNul(1, 9)
    return { enonce: `Résoudre l'équation $(${xPlus(a)})^2 = 0$.`, reponse: `x = ${nb(-a)}` }
  }),
  exoObjectif(CL, 3, '3e-obj-produit-nul-factoriser-x', 'Factoriser d’abord (facteur x)', () => {
    const a = relNonNul(1, 9)
    return { enonce: `Résoudre l'équation $${trinome(1, -a, 0)} = 0$.`, reponse: mot(`$x(${xPlus(-a)}) = 0$, donc $${deuxSol('x', 0, a)}$`) }
  }),
  exoObjectif(CL, 3, '3e-obj-produit-nul-factoriser', 'Factoriser d’abord (facteur apparent)', () => {
    let a: number, b: number, c: number
    do { a = relNonNul(1, 5); b = relNonNul(1, 6); c = relNonNul(1, 6) } while (b === c || c === -b || a === -b || a === c || (b - c) / 2 === -a)
    // (x + a)(x − b) + (x + a)(x + c) = (x + a)(2x + c − b)
    const sol = [[-a, nb(-a)], [(b - c) / 2, irreductible(b - c, 2)]] as [number, string][]
    sol.sort((u, v) => u[0] - v[0])
    return { enonce: `Résoudre l'équation $(${xPlus(a)})(${xPlus(-b)}) + (${xPlus(a)})(${xPlus(c)}) = 0$.`, reponse: mot(`$(${xPlus(a)})(${affine(2, c - b)}) = 0$, donc $${ou('x', ...sol.map(s => s[1]))}$`) }
  }),
  exoObjectif(CL, 3, '3e-obj-produit-nul-inverse', 'Écrire une équation de solutions données', () => {
    let a: number, b: number; do { a = relNonNul(1, 9); b = relNonNul(1, 9) } while (a === b)
    return { enonce: `Écrire une équation produit nul dont les solutions sont $${nb(a)}$ et $${nb(b)}$.`, reponse: mot(`par exemple $(${xPlus(-a)})(${xPlus(-b)}) = 0$`) }
  }),

  // ================= CALCUL LITTÉRAL · OBJ5 : les identités remarquables =================
  exoObjectif(CL, 4, '3e-obj-ir-somme', 'Développer (a + b)²', () => {
    const a = ent(1, 9), x = choix(['x', 'a', 'y'])
    return { enonce: `Développer : $(${xPlus(a, x)})^2$`, reponse: trinome(1, 2 * a, a * a, x) }
  }),
  exoObjectif(CL, 4, '3e-obj-ir-difference', 'Développer (a − b)²', () => {
    const a = ent(1, 9), x = choix(['x', 'a', 'y'])
    return { enonce: `Développer : $(${xPlus(-a, x)})^2$`, reponse: trinome(1, -2 * a, a * a, x) }
  }),
  exoObjectif(CL, 4, '3e-obj-ir-produit', 'Développer (a − b)(a + b)', () => {
    const a = ent(1, 12), x = choix(['x', 'a', 'y'])
    return { enonce: `Développer : ${choix([`$(${xPlus(-a, x)})(${xPlus(a, x)})$`, `$(${xPlus(a, x)})(${xPlus(-a, x)})$`])}`, reponse: trinome(1, 0, -a * a, x) }
  }),
  exoObjectif(CL, 4, '3e-obj-ir-coefficient', 'Développer une identité avec un coefficient', () => {
    const p = ent(2, 5), q = choix([1, 2, 3, 4, 5].filter(v => pgcd(v, p) === 1)), s = choix([1, -1]), x = choix(['x', 'a', 'y'])
    return { enonce: `Développer : $(${affine(p, s * q, x)})^2$`, reponse: trinome(p * p, 2 * p * q * s, q * q, x) }
  }),
  exoObjectif(CL, 4, '3e-obj-ir-factoriser-difference-carres', 'Factoriser a² − b²', () => {
    const a = ent(1, 12), x = choix(['x', 'a', 'y'])
    return { enonce: `Factoriser : $${x}^2 - ${a * a}$`, reponse: `(${xPlus(-a, x)})(${xPlus(a, x)})` }
  }),
  exoObjectif(CL, 4, '3e-obj-ir-factoriser-somme', 'Factoriser a² + 2ab + b²', () => {
    const a = ent(1, 9), x = choix(['x', 'a', 'y'])
    return { enonce: `Factoriser : $${trinome(1, 2 * a, a * a, x)}$`, reponse: `(${xPlus(a, x)})^2` }
  }),
  exoObjectif(CL, 4, '3e-obj-ir-factoriser-difference', 'Factoriser a² − 2ab + b²', () => {
    const a = ent(1, 9), x = choix(['x', 'a', 'y'])
    return { enonce: `Factoriser : $${trinome(1, -2 * a, a * a, x)}$`, reponse: `(${xPlus(-a, x)})^2` }
  }),
  exoObjectif(CL, 4, '3e-obj-ir-factoriser-coefficient', 'Factoriser a² − b² avec un coefficient', () => {
    let p: number, q: number; do { p = ent(2, 5); q = ent(1, 9) } while (pgcd(p, q) !== 1)
    const x = choix(['x', 'a', 'y'])
    return { enonce: `Factoriser : $${p * p}${x}^2 - ${q * q}$`, reponse: `(${affine(p, -q, x)})(${affine(p, q, x)})` }
  }),
  exoObjectif(CL, 4, '3e-obj-ir-completer', 'Compléter une identité remarquable', () => {
    const a = ent(1, 9), s = choix([1, -1])
    return aTrou(`Compléter : $(x ${s > 0 ? '+' : '-'} \\ldots)^2 = ${trinome(1, 2 * a * s, a * a)}$`, nb(a))
  }),
  exoObjectif(CL, 4, '3e-obj-ir-calcul-mental', 'Calculer de tête avec une identité remarquable', () => {
    const b = choix([100, 100, 1000, 20, 30, 50]), k = ent(1, b >= 100 ? 5 : 2)
    return choix([
      { enonce: `Calculer de tête : $${grandNb(b + k)}^2$`, reponse: grandNb((b + k) ** 2) },
      { enonce: `Calculer de tête : $${grandNb(b - k)}^2$`, reponse: grandNb((b - k) ** 2) },
      { enonce: `Calculer de tête : $${grandNb(b - k)} \\times ${grandNb(b + k)}$`, reponse: grandNb(b * b - k * k) },
    ])
  }),
]

// ---------- Les questions de cours des objectifs ----------
export const COURS_3E_OBJECTIFS: QuestionCours[] = [
  // Puissances · OBJ1
  notion(PU, 200, 0, 'L’exposant −1',
    () => { const a = choix(['a', 'b', String(ent(2, 9))]); return [`Compléter : ${/\d/.test(a) ? '' : `pour un nombre $${a}$ non nul, `}$${a}^{-1}$ est l'… de $${a}$.`, 'inverse'] }),
  notion(PU, 201, 0, 'Les puissances de 10 d’exposant négatif',
    () => { const n = choix(['n', 'k', 'p']); return [`Compléter : pour un entier $${n}$ positif, $10^{-${n}}$ s'écrit avec le chiffre $1$ au …-ième rang après la virgule.`, `$${n}$`] }),
  notion(PU, 202, 0, 'L’exposant 0',
    () => { const a = choix(['a', 'b', String(ent(2, 12))]); return [`Compléter : ${/\d/.test(a) ? '' : `pour un nombre $${a}$ non nul, `}$${a}^{0} = \\ldots$`, '$1$'] }),
  // Puissances · OBJ3
  notion(PU, 203, 2, 'La notation scientifique',
    () => choix<[string, string]>([
      ['Compléter : en notation scientifique, un nombre s\'écrit $a \\times 10^n$, avec $1 \\leqslant a < \\ldots$ et $n$ un entier relatif.', '$10$'],
      ['Compléter : en notation scientifique, un nombre s\'écrit $a \\times 10^n$, avec $\\ldots \\leqslant a < 10$ et $n$ un entier relatif.', '$1$'],
    ])),
  notion(PU, 204, 2, 'Le nombre a de la notation scientifique',
    () => phraseATrou('en notation scientifique $a \\times 10^n$, le nombre $a$ n\'a qu\'un seul [chiffre], différent de $0$, avant la [virgule].')),
  sienne(notion(PU, 205, 2, 'Le nom de la notation',
    () => ['Un nombre se note $a \\times 10^n$, avec $1 \\leqslant a < 10$ et $n$ un entier relatif. Comment s\'appelle cette notation ?', 'la notation scientifique'])),
  // Puissances · OBJ4
  notion(PU, 206, 3, 'Mille, million, milliard',
    () => { const [m, n] = choix<[string, number]>([['mille', 3], ['un million', 6], ['un milliard', 9]]); return [`Compléter : ${m} $= 10^{\\ldots}$`, `$${n}$`] }),
  // Racine carrée · OBJ1
  notion(RC, 200, 0, 'Les deux solutions de x² = a',
    () => { const a = choix(['a', 'k', 'b']); return [`Compléter : si $${a} > 0$, l'équation $x^2 = ${a}$ a deux solutions : $\\sqrt{${a}}$ et …`, `$-\\sqrt{${a}}$`] }),
  notion(RC, 201, 0, 'x² = a avec a négatif',
    () => { const a = choix(['a', 'k', 'b']); return [`Compléter : si $${a} < 0$, l'équation $x^2 = ${a}$ a … solution.`, 'aucune'] }),
  notion(RC, 202, 0, 'Résoudre x² = a graphiquement',
    () => { const a = choix(['a', 'k', 'b']); return [`Compléter : graphiquement, les solutions de $x^2 = ${a}$ sont les … des points d'intersection de la courbe de $y = x^2$ et de la droite d'équation $y = ${a}$.`, 'abscisses'] }),
  // Calcul littéral · OBJ1
  notion(CL, 200, 0, 'Simplifier un quotient',
    () => phraseATrou('on ne peut simplifier un quotient que par un [facteur] commun au [numérateur] et au [dénominateur].')),
  // Calcul littéral · OBJ2
  notion(CL, 201, 1, 'La double distributivité',
    () => {
      const [a, b, c, d] = choix([['a', 'b', 'c', 'd'], ['x', 'y', 'u', 'v'], ['k', 'm', 'p', 'q']])
      const termes = [`${a}${c}`, `${a}${d}`, `${b}${c}`, `${b}${d}`], k = ent(0, 3)
      return [`Compléter : $(${a} + ${b})(${c} + ${d}) = ${termes.map((t, i) => i === k ? '\\ldots' : t).join(' + ')}$`, `$${termes[k]}$`]
    }),
  notion(CL, 202, 1, 'Développer et factoriser',
    () => choix<() => [string, string]>([
      () => phraseATrou('[développer], c\'est transformer un produit en une [somme].'),
      () => phraseATrou('[factoriser], c\'est transformer une somme en un [produit].'),
    ])()),
  // Calcul littéral · OBJ3
  notion(CL, 203, 2, 'Le sens d’une inégalité',
    () => phraseATrou('quand on multiplie ou qu\'on divise les deux membres d\'une inéquation par un nombre [négatif], on change le [sens] de l\'inégalité.')),
  notion(CL, 204, 2, 'Résoudre ax ⩾ b graphiquement',
    () => { const g = Math.random() < 0.5; return [`Compléter : graphiquement, les solutions de $ax ${g ? '\\geqslant' : '\\leqslant'} b$ sont les abscisses des points de la droite $y = ax$ situés … de la droite $y = b$ (ou sur elle).`, g ? 'au-dessus' : 'en dessous'] }),
  // Calcul littéral · OBJ4
  notion(CL, 205, 3, 'Un produit nul',
    () => phraseATrou('un produit de facteurs est nul si et seulement si l\'un au moins de ses [facteurs] est [nul].')),
  // Calcul littéral · OBJ5
  notion(CL, 206, 4, 'Les identités remarquables',
    () => {
      const [a, b] = choix([['a', 'b'], ['x', 'y']])
      const [gauche, droite] = choix<[string, string[]]>([
        [`(${a} + ${b})^2`, [`${a}^2`, `+ 2${a}${b}`, `+ ${b}^2`]],
        [`(${a} - ${b})^2`, [`${a}^2`, `- 2${a}${b}`, `+ ${b}^2`]],
        [`(${a} - ${b})(${a} + ${b})`, [`${a}^2`, `- ${b}^2`]],
      ])
      const k = ent(0, droite.length - 1)
      const ecrit = droite.map((t, i) => i !== k ? t : i === 0 ? '\\ldots' : `${t[0]} \\ldots`).join(' ')
      return [`Compléter : $${gauche} = ${ecrit}$`, `$${droite[k].replace(/^[+-] /, '')}$`]
    }),
]
