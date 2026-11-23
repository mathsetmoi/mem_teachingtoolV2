// =============================================================
// LA TRIGONOMÉTRIE DE 1re (questions de cours du professeur, PERSO)
// Cinq compétences du domaine « Trigonométrie » (Analyse) : le cosinus
// et le sinus des valeurs remarquables, placer un réel sur le cercle
// trigonométrique (réponse : une lettre), convertir degrés et radians,
// la mesure principale d'un réel, les angles associés.
// Les réels sont les seize valeurs remarquables de 0 à 2π, une fois sur
// trois la même mesure prise en négatif (de −π à 0), et pour le cosinus,
// le sinus et le cercle, une fois sur quatre un réel au-delà (13π/6,
// −11π/4…). Rien n'est fixe : le réel, le sens de la question et les
// lettres du cercle changent.
// =============================================================
import * as F from '../figures'
import type { Facon, QuestionCours } from './outils'
import { choix, ent, melange, nb } from './outils'

export const T_TRIGONOMETRIE = 'Trigonométrie'

/** Les seize valeurs remarquables, en π : [numérateur, dénominateur] */
export const VALEURS_REMARQUABLES: readonly [number, number][] = [
  [0, 1], [1, 6], [1, 4], [1, 3], [1, 2], [2, 3], [3, 4], [5, 6],
  [1, 1], [7, 6], [5, 4], [4, 3], [3, 2], [5, 3], [7, 4], [11, 6],
]
/** La mesure en degrés d'une valeur remarquable */
export const enDegres = ([n, d]: readonly [number, number]) => n * 180 / d

/** Un réel kπ/d écrit en LaTeX : 0, π, −π/3, 5π/6… */
export function reelPi([n, d]: readonly [number, number], negatif = false): string {
  if (n === 0) return '0'
  const num = n === 1 ? '\\pi' : `${n}\\pi`
  return (negatif ? '-' : '') + (d === 1 ? num : `\\frac{${num}}{${d}}`)
}

/** La valeur exacte du cosinus ou du sinus d'un angle remarquable (en degrés) */
export function valeurExacte(degres: number, f: 'cos' | 'sin'): string {
  // Le cosinus de a est le sinus de 90° − a
  const a = (((f === 'cos' ? degres : 90 - degres) % 360) + 360) % 360
  // Sur le premier quart de tour : 0, 30, 45, 60, 90 degrés
  const base = (x: number) => ({ 0: '1', 30: '\\frac{\\sqrt{3}}{2}', 45: '\\frac{\\sqrt{2}}{2}', 60: '\\frac{1}{2}', 90: '0' } as Record<number, string>)[x]
  const ref = a <= 90 ? a : a <= 180 ? 180 - a : a <= 270 ? a - 180 : 360 - a
  const v = base(ref)
  const negatif = a > 90 && a < 270
  return v === '0' ? '0' : (negatif ? '-' : '') + v
}

/** Un réel au hasard parmi les valeurs remarquables : de 0 à 2π, ou une
 *  fois sur trois (pour une mesure de plus de π) la même mesure en négatif.
 *  Rend son écriture et sa mesure en degrés entre 0 et 360. */
export function reelAuHasard(): { txt: string; degres: number } {
  const v = choix([...VALEURS_REMARQUABLES]), d = enDegres(v)
  if (d > 180 && Math.random() < 1 / 3) return { txt: reelPi([2 * v[1] - v[0], v[1]], true), degres: d }
  return { txt: reelPi(v), degres: d }
}

/** Un réel au-delà de 2π ou en dessous de −2π : une valeur remarquable
 *  plus un à trois tours (17π/3, −13π/6, 6π…). Rend son écriture et la
 *  mesure en degrés, entre 0 et 360, de son point sur le cercle. */
export function reelGrand(): { txt: string; degres: number } {
  const v = choix([...VALEURS_REMARQUABLES]), d = enDegres(v), k = ent(1, 3)
  // La fraction reste irréductible : pgcd(n + 2kd, d) = pgcd(n, d) = 1
  const n = v[0] + 2 * k * v[1]
  if (Math.random() < 0.5) return { txt: reelPi([n, v[1]], true), degres: (360 - d) % 360 }
  return { txt: reelPi([n, v[1]]), degres: d }
}
/** Le plus souvent un réel de −π à 2π, une fois sur quatre au-delà */
export const reelVarie = () => Math.random() < 0.25 ? reelGrand() : reelAuHasard()

/** La mesure principale (dans ]−π ; π]) du point d'angle donné en degrés */
export function mesurePrincipale(degres: number): string {
  const v = VALEURS_REMARQUABLES.find(x => enDegres(x) === (degres > 180 ? 360 - degres : degres))!
  return reelPi(v, degres > 180)
}

/** Les lettres des seize points du cercle, mélangées à chaque question
 *  (ni I ni J ni O, déjà pris sur le cercle trigonométrique) */
const LETTRES = 'ABCDEFGHKLMNPRST'.split('')
const cercle = () => {
  const lettres = melange(LETTRES)
  return { lettres, figure: F.cercleTrigo(lettres, VALEURS_REMARQUABLES.map(enDegres)) }
}

const COSINUS_SINUS: Facon[] = [
  () => { const r = reelVarie(), f = choix(['cos', 'sin'] as const); return [`Donner la valeur exacte de $\\${f}\\left(${r.txt}\\right)$.`, `$${valeurExacte(r.degres, f)}$`] },
  () => { const r = reelVarie(); return [`Compléter : $\\cos\\left(${r.txt}\\right) = \\ldots$ et $\\sin\\left(${r.txt}\\right) = \\ldots$`, `$${valeurExacte(r.degres, 'cos')}$ et $${valeurExacte(r.degres, 'sin')}$`] },
  // À l'envers : un réel de [0 ; π] pour le cosinus, de [−π/2 ; π/2] pour le sinus, une seule réponse
  () => {
    if (Math.random() < 0.5) {
      const v = choix(VALEURS_REMARQUABLES.filter(v => enDegres(v) <= 180))
      return [`Donner le réel $x$ de $[0\\,;\\,\\pi]$ tel que $\\cos x = ${valeurExacte(enDegres(v), 'cos')}$.`, `$x = ${reelPi(v)}$`]
    }
    const v = choix(VALEURS_REMARQUABLES.filter(v => enDegres(v) <= 90 || enDegres(v) >= 270)), d = enDegres(v)
    const x = d >= 270 ? reelPi([2 * v[1] - v[0], v[1]], true) : reelPi(v)
    return [`Donner le réel $x$ de $\\left[-\\frac{\\pi}{2}\\,;\\,\\frac{\\pi}{2}\\right]$ tel que $\\sin x = ${valeurExacte(d, 'sin')}$.`, `$x = ${x}$`]
  },
]

const PLACER: Facon[] = [
  () => {
    const { lettres, figure } = cercle(), r = reelVarie()
    const i = VALEURS_REMARQUABLES.findIndex(v => enDegres(v) === r.degres)
    return [`Sur le cercle trigonométrique ci-dessous, quel point est associé au réel $${r.txt}$ ?`, `le point $${lettres[i]}$`, figure]
  },
  () => {
    const { lettres, figure } = cercle(), i = Math.floor(Math.random() * VALEURS_REMARQUABLES.length)
    return [`Sur le cercle trigonométrique ci-dessous, quel réel de $[0\\,;\\,2\\pi[$ est associé au point $${lettres[i]}$ ?`, `$${reelPi(VALEURS_REMARQUABLES[i])}$`, figure]
  },
]

/** Les valeurs remarquables sans 0, pour les conversions */
const NON_NULLES = VALEURS_REMARQUABLES.slice(1)
const CONVERTIR: Facon[] = [
  () => { const v = choix(NON_NULLES); return [`Convertir ${'$'}{${enDegres(v)}}^\\circ$ en radians.`, `$${reelPi(v)}$ rad`] },
  () => { const v = choix(NON_NULLES); return [`Convertir $${reelPi(v)}$ rad en degrés.`, `${'$'}{${enDegres(v)}}^\\circ$`] },
  () => choix<[string, string]>([
    ['Compléter : $\\pi$ rad $= \\ldots^\\circ$.', '${180}^\\circ$'],
    ['Compléter : $1^\\circ = \\ldots$ rad.', '$\\frac{\\pi}{180}$ rad'],
    ['Compléter : un tour complet mesure $\\ldots$ rad.', '$2\\pi$ rad'],
  ]),
]

// La mesure principale d'un réel au-delà d'un tour (dans ]−π ; π]), ou le
// réel de [0 ; 2π[ du même point
const MESURE_PRINCIPALE: Facon[] = [
  () => { const r = reelGrand(); return [`Donner la mesure principale de $${r.txt}$.`, `$${mesurePrincipale(r.degres)}$`] },
  () => {
    const r = reelGrand(), v = VALEURS_REMARQUABLES.find(x => enDegres(x) === r.degres)!
    return [`Quel réel de $[0\\,;\\,2\\pi[$ est associé au même point du cercle trigonométrique que $${r.txt}$ ?`, `$${reelPi(v)}$`]
  },
]

/** Les angles associés : f(argument) = ± g(x), pour tout réel x */
export const ASSOCIES: { f: 'cos' | 'sin'; arg: (x: string) => string; moins: boolean; g: 'cos' | 'sin'; ajout: number; signe: number }[] = [
  { f: 'cos', arg: x => `-${x}`, moins: false, g: 'cos', ajout: 0, signe: -1 },
  { f: 'sin', arg: x => `-${x}`, moins: true, g: 'sin', ajout: 0, signe: -1 },
  { f: 'cos', arg: x => `\\pi - ${x}`, moins: true, g: 'cos', ajout: Math.PI, signe: -1 },
  { f: 'sin', arg: x => `\\pi - ${x}`, moins: false, g: 'sin', ajout: Math.PI, signe: -1 },
  { f: 'cos', arg: x => `\\pi + ${x}`, moins: true, g: 'cos', ajout: Math.PI, signe: 1 },
  { f: 'sin', arg: x => `\\pi + ${x}`, moins: true, g: 'sin', ajout: Math.PI, signe: 1 },
  { f: 'cos', arg: x => `\\frac{\\pi}{2} - ${x}`, moins: false, g: 'sin', ajout: Math.PI / 2, signe: -1 },
  { f: 'sin', arg: x => `\\frac{\\pi}{2} - ${x}`, moins: false, g: 'cos', ajout: Math.PI / 2, signe: -1 },
  { f: 'cos', arg: x => `\\frac{\\pi}{2} + ${x}`, moins: true, g: 'sin', ajout: Math.PI / 2, signe: 1 },
  { f: 'sin', arg: x => `\\frac{\\pi}{2} + ${x}`, moins: false, g: 'cos', ajout: Math.PI / 2, signe: 1 },
]
const LETTRE_REEL = ['x', 'a', 't', '\\theta']
const ANGLES_ASSOCIES: Facon[] = [
  () => {
    const a = choix(ASSOCIES), x = choix(LETTRE_REEL)
    return [`Compléter : pour tout réel $${x}$, $\\${a.f}\\left(${a.arg(x)}\\right) = \\ldots$`, `$${a.moins ? '-' : ''}\\${a.g} ${x}$`]
  },
  () => {
    const a = choix(ASSOCIES), x = choix(LETTRE_REEL), c = ent(1, 9) / 10
    return [`Sachant que $\\${a.g} ${x} = ${nb(c)}$, donner $\\${a.f}\\left(${a.arg(x)}\\right)$.`, `$${nb(a.moins ? -c : c)}$`]
  },
]

/** Les intitulés des cinq compétences (étiquette PERSO dans la fenêtre) */
export const COMPETENCES_TRIGONOMETRIE = [
  'Connaître le cosinus et le sinus des valeurs remarquables.',
  'Placer un réel (valeur remarquable) sur le cercle trigonométrique.',
  'Convertir des degrés en radians et inversement (valeurs remarquables).',
  'Déterminer la mesure principale d\'un réel.',
  'Utiliser les angles associés (−x, π − x, π + x, π/2 − x, π/2 + x).',
]

/** Les questions de cours, une par compétence (rang = competence) */
export function coursTrigonometrie(notions: (theme: string, liste: [string, ...Facon[]][]) => QuestionCours[]): QuestionCours[] {
  return notions(T_TRIGONOMETRIE, [
    ['Cosinus et sinus des valeurs remarquables', ...COSINUS_SINUS],
    ['Placer un réel sur le cercle trigonométrique', ...PLACER],
    ['Degrés et radians', ...CONVERTIR],
    ['La mesure principale d\'un réel', ...MESURE_PRINCIPALE],
    ['Les angles associés', ...ANGLES_ASSOCIES],
  ]).map((c, i) => ({ ...c, competence: i }))
}
