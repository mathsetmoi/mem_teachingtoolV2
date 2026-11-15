// =============================================================
// LES QUESTIONS DE COURS DE 5e, RANGÉES PAR COMPÉTENCE
// Chaque question de cours travaille une compétence précise : cocher une
// compétence (ou un objectif d'apprentissage) pose ses questions de cours.
// Celles qui n'ont pas de compétence ne sont plus posées (elles restent
// dans le code). Quand le professeur reformule une question, l'ancienne
// formulation n'est jamais perdue : elle devient un exercice de la même
// compétence (ou du même objectif).
//
// Les notions de départ sont celles de cinquieme.ts (COURS_5E_BRUT) ;
// rangerLesCours en fait la liste que le flash pose, et les exercices tirés
// des anciennes formulations.
// =============================================================
import * as F from '../figures'
import type { Automatisme, Facon, QuestionCours } from './outils'
import { choix, empilementAuHasard, ent, frac, mot, nb, notions } from './outils'
import { PROGRAMME_AUTOMATISMES } from '../programme-automatismes'
import { rangerSousObjectif } from '../objectifs-flash'
import { PROGRAMME_CYCLE4 } from '../programme-cycle4'

/** Pour chaque domaine, la compétence (rang dans la liste officielle) puis
 *  les numéros des notions qui la travaillent (le numéro de l'identifiant :
 *  « cours-Angles-3 » est la 3e notion d'Angles) */
const COMPETENCES: Record<string, Record<number, number[]>> = {
  'Opérations': { 0: [1], 1: [3, 4], 2: [5], 4: [7, 6] },
  'Nombres rationnels': { 1: [8], 2: [1], 4: [2, 3], 7: [4], 8: [7, 9], 9: [6], 10: [5] },
  'Puissances': { 1: [4] },
  'Calcul littéral et algébrique': { 3: [5] },
  'Repérage': { 1: [4] },
  'Représentation de l’espace': { 2: [1, 2, 3, 4, 5], 3: [6] },
  'Transformations': { 0: [5, 6, 7], 1: [1, 2, 3, 4] },
  'Angles': { 0: [2, 3, 4, 5, 6], 1: [1], 2: [7] },
  'Triangles': { 0: [2, 3], 1: [1, 4], 2: [5, 6, 7] },
  'Parallélogrammes': { 0: [1, 2, 3, 7], 1: [4, 5, 6] },
  'Probabilités': { 0: [1, 2], 2: [3, 4] },
  'Proportionnalité': { 0: [1, 2], 1: [3, 4, 5] },
}
/** Les notions qui travaillent un objectif d'apprentissage (rang dans la
 *  liste des objectifs du domaine) : les critères de divisibilité par 3 et
 *  par 9, les priorités opératoires, la substitution */
const OBJECTIFS: Record<string, Record<number, number[]>> = {
  'Opérations': { 6: [8], 9: [2] },
  'Calcul littéral et algébrique': { 1: [2] },
  'Transformations': { 0: [8, 9] },
}

// ---------- Les nouvelles façons de poser ----------
const vers = (verbe: string, k: string): [string, string] => {
  const r: Record<string, Record<string, string>> = {
    multiplier: { '0{,}1': 'le diviser par $10$', '0{,}5': 'le diviser par $2$ (en prendre la moitié)', '0{,}01': 'le diviser par $100$' },
    diviser: { '0{,}1': 'le multiplier par $10$', '0{,}5': 'le multiplier par $2$', '0{,}01': 'le multiplier par $100$' },
  }
  return [verbe, r[verbe][k]]
}
const CRITERES_2_5_10: [number, string][] = [[2, 'son chiffre des unités est $0$, $2$, $4$, $6$ ou $8$'], [5, 'son chiffre des unités est $0$ ou $5$'], [10, 'son chiffre des unités est $0$']]
const decale = (verbe: string, k: number): string => {
  const rangs = k === 10 ? 'd’un rang' : k === 100 ? 'de deux rangs' : 'de trois rangs'
  return `déplacer la virgule ${rangs} vers la ${verbe === 'multiplier' ? 'droite' : 'gauche'}`
}
const mil = (k: number) => k === 1000 ? '1\\,000' : String(k)
const POINTS_ANGLE: [string, string, string][] = [['x', 'O', 'y'], ['A', 'B', 'C'], ['E', 'F', 'G'], ['M', 'N', 'P'], ['R', 'S', 'T']]
const angle = () => { const [a, b, c] = choix(POINTS_ANGLE); return `\\widehat{${a}${b}${c}}` }

interface Retouche {
  /** Les anciennes façons (rang à partir de 0) qui deviennent des exercices */
  exos: number[]
  /** Les façons que le professeur a écrites à la place */
  nouvelles: Facon[]
  titre?: string
}
const RETOUCHES: Record<string, Retouche> = {
  // Divisibilité par 3 et par 9 : 3 ou 9 tiré au hasard
  'cours-Opérations-2': { exos: [0], nouvelles: [
    () => { const k = choix([3, 9]); return [`Compléter : un nombre entier est divisible par $${k}$ lorsque…`, `la somme de ses chiffres est divisible par $${k}$`] },
    () => { const k = choix([3, 9]); return [`Quand un nombre entier est-il divisible par $${k}$ ?`, `quand la somme de ses chiffres est divisible par $${k}$`] },
  ] },
  // Le reste d'une division euclidienne
  'cours-Opérations-4': { exos: [0, 1], nouvelles: [
    () => { const b = ent(3, 12), q = ent(4, 15), r = ent(1, b - 1); return [`Compléter : dans la division euclidienne de $${b * q + r}$ par $${b}$, le reste est toujours plus petit que le…`, 'diviseur'] },
  ] },
  // Multiplier ou diviser par 0,1 ; 0,5 ; 0,01
  'cours-Opérations-6': { exos: [0], nouvelles: [
    () => { const k = choix(['0{,}1', '0{,}5', '0{,}01']); const [, r] = vers('multiplier', k); return [`Compléter : multiplier un nombre par $${k}$ revient à…`, r] },
    () => { const k = choix(['0{,}1', '0{,}5', '0{,}01']); const [, r] = vers('diviser', k); return [`À quoi revient diviser un nombre par $${k}$ ?`, `à ${r}`] },
  ] },
  // Multiplier ou diviser par 10, 100, 1 000
  'cours-Opérations-7': { exos: [0], nouvelles: [
    () => { const v = choix(['multiplier', 'diviser']), k = choix([10, 100, 1000]); return [`Compléter : ${v} un nombre par $${mil(k)}$ revient à…`, decale(v, k)] },
    () => { const v = choix(['multiplier', 'diviser']), k = choix([10, 100, 1000]); return [`À quoi revient ${v === 'multiplier' ? 'multiplier' : 'diviser'} un nombre par $${mil(k)}$ ?`, `à ${decale(v, k)}`] },
  ] },
  // Les priorités opératoires
  'cours-Opérations-8': { exos: [0, 1, 2], titre: 'Les priorités opératoires', nouvelles: [
    () => { const l = choix(['des additions et des soustractions', 'des multiplications et des divisions']); return [`Compléter : dans un calcul sans parenthèses comportant uniquement ${l}, on effectue les calculs…`, 'de la gauche vers la droite'] },
    () => { const e = choix(['un calcul comportant des parenthèses', 'une expression comportant des parenthèses']); return [`Compléter : dans ${e}, on commence par…`, 'les calculs entre parenthèses'] },
    () => { const e = choix(['un calcul', 'une expression']); return [`Compléter : dans ${e} sans parenthèses, on effectue d’abord…`, 'les multiplications et les divisions'] },
  ] },
  // Additionner des fractions
  'cours-Nombres rationnels-4': { exos: [0], nouvelles: [
    () => { const v = choix(['additionne', 'soustrait']); return [`Comment ${v}-t-on deux fractions qui ont le même dénominateur ?`, `on ${v} les numérateurs et on garde le dénominateur`] },
  ] },
  // Les pourcentages simples : 1 %, 10 %, 50 %
  'cours-Nombres rationnels-6': { exos: [0], nouvelles: [
    () => {
      const [p, r] = choix<[string, string]>([['1', 'diviser ce nombre par $100$'], ['10', 'diviser ce nombre par $10$'], ['50', 'prendre la moitié de ce nombre (le diviser par $2$)']])
      return [`Prendre $${p}\\,\\%$ d’un nombre revient à…`, r]
    },
  ] },
  // La substitution
  'cours-Calcul littéral et algébrique-2': { exos: [0], titre: 'Calculer la valeur d’une expression littérale par substitution', nouvelles: [
    () => { const k = ent(2, 9), c = ent(1, 9), v = ent(2, 9), x = choix(['x', 'a', 'y', 'n']); return [`Pour calculer $${k}${x} + ${c}$ avec $${x} = ${v}$, que signifie substituer ?`, `remplacer $${x}$ par le nombre $${v}$`] },
  ] },
  // Les sortes d'angles : plat et droit
  'cours-Angles-1': { exos: [0], nouvelles: [
    () => { const d = choix([180, 90]); return [`Quelle est la mesure en degrés d’un angle ${d === 180 ? 'plat' : 'droit'} ?`, `$${d}°$`] },
    () => { const d = choix([180, 90]); return [`Combien mesure en degrés un angle ${d === 180 ? 'plat' : 'droit'} ?`, `$${d}°$`] },
    () => { const d = choix([180, 90]); return [`Compléter : un angle mesure $${d}°$. C’est donc un angle…`, d === 180 ? 'plat' : 'droit'] },
    () => { const d = choix([180, 90]); return ['Comment s’appelle cet angle ?', `un angle ${d === 180 ? 'plat' : 'droit'} (il mesure $${d}°$)`, F.unAngle(d, ent(0, 11) * 30)] },
    () => { const d = choix([180, 90]); return ['Combien mesure en degrés cet angle ?', `$${d}°$`, F.unAngle(d, ent(0, 11) * 30)] },
  ] },
  // Aigu, obtus
  'cours-Angles-2': { exos: [0], nouvelles: [
    () => { const t = choix(['aigu', 'obtus']); return [`Qu’est-ce qu’un angle ${t} ?`, t === 'aigu' ? 'un angle dont la mesure est comprise entre $0°$ et $90°$' : 'un angle dont la mesure est comprise entre $90°$ et $180°$'] },
    () => { const t = choix(['aigu', 'obtus']); return [`Dessine un angle ${t}.`, t === 'aigu' ? 'un angle plus petit qu’un angle droit (moins de $90°$)' : 'un angle plus grand qu’un angle droit (entre $90°$ et $180°$)'] },
  ] },
  // Les angles supplémentaires (ou complémentaires)
  'cours-Angles-5': { exos: [0, 1], nouvelles: [
    () => { const d = choix([180, 90]); return [`Compléter : la somme des mesures de deux angles vaut $${d}°$. Ces deux angles sont donc…`, d === 180 ? 'supplémentaires' : 'complémentaires'] },
    () => { const d = choix([180, 90]); return [`Comment appelle-t-on deux angles dont la somme des mesures vaut $${d}°$ ?`, d === 180 ? 'des angles supplémentaires' : 'des angles complémentaires'] },
  ] },
  // La bissectrice
  'cours-Angles-7': { exos: [0, 1], nouvelles: [
    () => [`Qu’est-ce que la bissectrice de l’angle $${angle()}$ ?`, 'la demi-droite qui partage l’angle en deux angles de même mesure'],
    () => [`De quelle notion s’agit-il : « la demi-droite qui partage l’angle $${angle()}$ en deux angles de même mesure » ?`, 'la bissectrice de l’angle'],
    () => { const m = ent(15, 80); return ['Comment s’appelle la demi-droite $[Oz)$ ?', 'la bissectrice de l’angle $\\widehat{xOy}$', F.bissectriceFig(m, m)] },
  ] },
}

/** Ce que Mathieu a ajouté : une question nouvelle pour une compétence qui
 *  n'en avait pas. [domaine, compétence ou objectif, titre, façons] */
const NOUVELLES: { theme: string; competence: number; titre: string; facons: Facon[] }[] = [
  { theme: 'Opérations', competence: 0, titre: 'Les critères de divisibilité par 2, 5 et 10', facons: [
    () => { const [k, r] = choix(CRITERES_2_5_10); return [`Compléter : un nombre entier est divisible par $${k}$ lorsque…`, r] },
    () => { const [k, r] = choix(CRITERES_2_5_10); return [`Quand un nombre entier est-il divisible par $${k}$ ?`, `quand ${r}`] },
  ] },
  { theme: 'Nombres relatifs', competence: 0, titre: 'Les chiffres après la virgule d’un produit', facons: [
    () => {
      // Deux décimaux à un chiffre après la virgule, ou à un et deux
      for (;;) {
        const da = choix([1, 1, 2]), db = choix([1, 1, 2]) , a = ent(1, 9) * 10 ** -da + (da === 2 ? ent(1, 9) * 0.01 : 0), b = ent(1, 9) * 10 ** -db + (db === 2 ? ent(1, 9) * 0.01 : 0)
        const u = Math.round(a * 10 ** da), v = Math.round(b * 10 ** db)
        if (u % 10 === 0 || v % 10 === 0 || (u * v) % 10 === 0) continue
        return [`Pour calculer $${nb(a)} \\times ${nb(b)}$, combien de chiffres après la virgule aura le résultat ?`, `$${da + db}$ (on additionne ceux des deux facteurs)`]
      }
    },
  ] },
  { theme: 'Nombres relatifs', competence: 1, titre: 'L’addition à trou', facons: [
    () => { const a = ent(2, 9), b = a + ent(2, 9); return [`Pour compléter $${a} + \\ldots = ${b}$, quel calcul fait-on ?`, `une soustraction : $${b} - ${a}$`] },
  ] },
  { theme: 'Nombres rationnels', competence: 3, titre: 'Les graduations d’une droite', facons: [
    () => { const [n, d] = choix<[string, number]>([['moitiés', 2], ['tiers', 3], ['quarts', 4], ['dixièmes', 10]]); return [`Sur une droite graduée en ${n}, combien d’intervalles y a-t-il entre $0$ et $1$ ?`, `$${d}$`] },
  ] },
  { theme: 'Nombres rationnels', competence: 5, titre: 'Comparer deux fractions de même dénominateur', facons: [
    () => { const d = ent(3, 12), a = ent(1, d - 1); let b = ent(1, d - 1); while (b === a) b = ent(1, d - 1); return [`Pour comparer $${frac(a, d)}$ et $${frac(b, d)}$, que compare-t-on ?`, 'leurs numérateurs : la plus grande fraction a le plus grand numérateur'] },
  ] },
  { theme: 'Nombres rationnels', competence: 6, titre: 'Une fraction plus grande que 1', facons: [
    () => { const [a, b] = choix([['a', 'b'], ['p', 'q'], ['n', 'd'], ['x', 'y']]); return [`À quelle condition la fraction $\\frac{${a}}{${b}}$ est-elle plus grande que $1$ ?`, `quand le numérateur $${a}$ est plus grand que le dénominateur $${b}$`] },
  ] },
  { theme: 'Repérage', competence: 1, titre: 'L’abscisse d’un point', facons: [
    () => { const p = choix(['A', 'B', 'C', 'M', 'P', 'R']); return [`Compléter : sur une droite graduée, le point $${p}$ est repéré par son…`, 'abscisse'] },
  ] },
  { theme: 'Représentation de l’espace', competence: 1, titre: 'Les cubes d’un empilement', facons: [
    () => {
      const h = empilementAuHasard()
      return ['Combien y a-t-il de cubes au total ?', `$${h.flat().reduce((s, v) => s + v, 0)}$`, F.empilement(h)]
    },
  ] },
  { theme: 'Représentation de l’espace', competence: 2, titre: 'Reconnaître le solide', facons: [
    () => {
      const cube = Math.random() < 0.5
      const l = ent(3, 5), h = cube ? l : choix([2, 3, 4, 6].filter(x => x !== l)), p = cube ? l : choix([3, 4, 5, 6].filter(x => x !== l && x !== h))
      return [choix(['De quel solide de l’espace s’agit-il ?', 'Comment s’appelle ce solide ?']), cube ? 'un cube' : 'un pavé droit', F.paveCote(l, h, p, false)]
    },
  ] },
  { theme: 'Angles', competence: 3, titre: 'Les angles de l’équerre', facons: [
    () => { const [a, t] = choix<[number, number]>([[60, 30], [30, 60], [45, 45]]); return [`Une équerre a un angle de $90°$ et un angle de $${a}°$. Combien mesure son troisième angle ?`, `$${t}°$`] },
  ] },
  { theme: 'Parallélogrammes', competence: 1, titre: 'La nature d’un parallélogramme codé', facons: [
    () => {
      const lg = Math.random() < 0.6, dr = lg ? Math.random() < 0.5 : true
      const noms = choix(['ABCD', 'EFGH', 'IJKL', 'MNPQ', 'RSTU'])
      return ['Quelle est la nature du parallélogramme ci-dessous ?', lg && dr ? 'un carré' : lg ? 'un losange' : 'un rectangle', F.parallelogrammeCode(lg, dr, noms, ent(-4, 4) * 10, ent(0, 3))]
    },
  ] },
  { theme: 'Probabilités', competence: 1, titre: 'Une probabilité en pourcentage', facons: [
    () => { const [n, d, p] = choix<[number, number, number]>([[1, 2, 50], [1, 4, 25], [3, 4, 75], [1, 10, 10], [1, 5, 20]]); return [`Une probabilité vaut $${frac(n, d)}$. Comment l’écrit-on en pourcentage ?`, `$${p}\\,\\%$`] },
  ] },
]
/** La phrase de la compétence ou de l'objectif, pour la correction des exercices */
function phrase(theme: string, competence: number | undefined, objectif: number | undefined): string | undefined {
  if (competence !== undefined) return PROGRAMME_AUTOMATISMES['5e'].slice(0, 5).flatMap(t => t.domaines).find(d => d.cle === theme)?.competences[competence]
  if (objectif === undefined) return undefined
  return PROGRAMME_CYCLE4['5e'].flatMap(t => t.domaines).find(d => d.nom === theme || d.nom.startsWith(theme))?.objectifs[objectif]?.texte
}

/** Range les notions de départ par compétence ; rend la liste que le flash
 *  pose et les exercices tirés des anciennes formulations */
export function rangerLesCours(brut: QuestionCours[]): { cours: QuestionCours[]; exercices: Automatisme[] } {
  const exercices: Automatisme[] = []
  const rang = (c: QuestionCours): { competence?: number; objectif?: number } => {
    const n = Number(c.id.split('-').pop())
    for (const [k, ns] of Object.entries(COMPETENCES[c.theme] ?? {})) if (ns.includes(n)) return { competence: Number(k) }
    for (const [k, ns] of Object.entries(OBJECTIFS[c.theme] ?? {})) if (ns.includes(n)) return { objectif: Number(k) }
    return {}
  }
  const cours = brut.map(c => {
    const r = rang(c), ret = RETOUCHES[c.id]
    if (!ret) return { ...c, ...r }
    // Les anciennes façons deviennent des exercices de la même compétence
    ret.exos.forEach(k => {
      const ancienne = c.facons[k]
      const id = `ancien-${c.id}-${k + 1}`
      const a: Automatisme = {
        id, theme: c.theme, titre: c.titre,
        // Sous un objectif, l'exercice est une application directe (il ne se
        // pose pas dans la liste officielle)
        ...(r.objectif !== undefined ? { application: true } : { competence: r.competence }),
        ...(phrase(c.theme, r.competence, r.objectif) ? { programme: phrase(c.theme, r.competence, r.objectif) } : {}),
        generer() { const [enonce, reponse, figure] = ancienne(); return { enonce, reponse: mot(reponse), ...(figure ? { figure } : {}) } },
      }
      exercices.push(a)
      if (r.objectif !== undefined) rangerSousObjectif('5e', id, c.theme, r.objectif)
    })
    const facons = [...c.facons.filter((_, k) => !ret.exos.includes(k)), ...ret.nouvelles]
    const refaite = notions(c.theme, [[ret.titre ?? c.titre, ...facons]])[0]
    return { ...refaite, id: c.id, ...r }
  })
  NOUVELLES.forEach((n, i) => {
    const [q] = notions(n.theme, [[n.titre, ...n.facons]])
    cours.push({ ...q, id: `cours-${n.theme}-${100 + i}`, competence: n.competence })
  })
  return { cours, exercices }
}
