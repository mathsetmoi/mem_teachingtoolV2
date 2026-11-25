// =============================================================
// LES AUTOMATISMES DE 2nde : VECTEURS ET PROBLÈMES DE GÉOMÉTRIE
// Le professeur a revu le domaine le 25 novembre 2026, ligne OFFI par
// ligne OFFI. Ces cinq lignes de la liste officielle n'avaient encore aucun
// exercice en 2nde : tout est neuf, sauf ce qui vient des automatismes de
// 3e, à sa demande (les questions de cours de Pythagore et de Thalès, et
// les exercices et questions de cours de trigonométrie).
// Ses règles : réponses courtes ; jamais une chance sur deux ; jamais la
// liste des réponses possibles ; rien de fixe ; pas de calculatrice (les
// réponses avec π restent écrites avec π, les longueurs viennent de
// triplets connus ou restent une racine) ; une figure quand elle aide.
// « Placer » : l'élève place le point sur son ardoise, et la correction
// montre le point placé (figureReponse).
// =============================================================
import * as F from '../figures'
import type { Automatisme, Facon, Question, QuestionCours } from './outils'
import { choix, coord, cm2, cm3, ent, frac, irreductible, melange, mot, nb, notions, piFois, pts, unite } from './outils'
import { phraseATrou } from './seconde-nombres-reels'
import { AUTOMATISMES_3E_OBJECTIFS_GEOMETRIE, COURS_3E_OBJECTIFS_GEOMETRIE } from './troisieme-objectifs-geometrie'

export const D2_GEOMETRIE = 'Vecteurs et problèmes de géométrie'
const D = D2_GEOMETRIE
/** Les phrases de la liste officielle, dans l'ordre des lignes du domaine */
const LIGNES = [
  'Sur une droite graduée, repérer ou placer un point dont l’abscisse est un nombre relatif.',
  'Dans le plan muni d’un repère orthogonal, lire les coordonnées d’un point donné, placer un point de coordonnées données.',
  'Calculer des périmètres (polygone et cercle), aires (rectangle, triangle et disque) et des volumes (pavé droit, prisme, cylindre, pyramide, cône et boule).',
  'Application simple du théorème de Pythagore, du théorème de Thalès.',
  'Connaître et utiliser les lignes trigonométriques dans le triangle rectangle : cosinus, sinus, tangente.',
]
function exo(k: number, id: string, titre: string, generer: () => Question): Automatisme {
  return { id: `2nde-geo-${id}`, theme: D, titre, competence: k, programme: LIGNES[k], generer }
}
/** Une notion de cours sous sa ligne (numéros à partir de 100) */
function notion(k: number, i: number, titre: string, ...facons: Facon[]): QuestionCours {
  const [q] = notions(D, [[titre, ...facons]], '2nde-')
  return { ...q, id: `cours-2nde-${D}-${i}`, competence: k }
}
/** Une question de cours de 3e reprise telle quelle, rangée sous une ligne
 *  de 2nde ; `facons` : seulement certaines de ses façons */
function deLa3e(k: number, i: number, id3e: string, titre?: string, facons?: number[]): QuestionCours {
  const q = COURS_3E_OBJECTIFS_GEOMETRIE.find(c => c.id === id3e)
  if (!q) throw new Error(`Question de cours de 3e introuvable : ${id3e}`)
  return notion(k, i, titre ?? q.titre, ...(facons ? facons.map(n => q.facons[n]) : q.facons))
}
/** Un nombre écrit sur une figure (virgule, vrai signe moins) */
const ecrire = (x: number) => String(Math.round(x * 1e6) / 1e6).replace('.', ',').replace('-', '−')
const lettreAuHasard = () => choix(['A', 'B', 'M', 'R', 'K', 'P'])

// ---------- Ligne 1 : la droite graduée ----------
/** Une graduation de −debut à fin « crans », pour un point qui n'est ni à
 *  l'origine ni sur un cran écrit */
function cranAuHasard(debut: number, fin: number, ecrits: number[]) {
  let k: number
  do { k = ent(debut + 1, fin - 1) } while (ecrits.includes(k))
  return k
}
const DROITE: Automatisme[] = [
  exo(0, 'droite-pas-1', 'Lire une abscisse, graduation de 1 en 1', () => {
    const debut = -ent(3, 7), fin = debut + 8, x = cranAuHasard(debut, fin, [0]), L = lettreAuHasard()
    return { enonce: `Quelle est l'abscisse du point $${L}$ ?`, figure: F.droiteGraduee(debut, fin, 1, x, L), reponse: nb(x) }
  }),
  exo(0, 'droite-autre-pas', 'Lire une abscisse, une autre graduation', () => {
    const pas = choix([0.5, 0.2, 0.1, 2, 5, 10, 100]), debut = -ent(3, 6), fin = debut + 8
    const k = cranAuHasard(debut, fin, [0, 1]), L = lettreAuHasard()
    return { enonce: `Quelle est l'abscisse du point $${L}$ ?`, figure: F.droiteGraduee(debut, fin, 1, k, L, u => debut + u === 0 ? '0' : debut + u === 1 ? ecrire(pas) : ''), reponse: nb(k * pas) }
  }),
  exo(0, 'droite-trouver-pas', 'Lire une abscisse, en trouvant le pas', () => {
    // Deux crans seulement portent un nombre, séparés de m crans
    const [pas, m] = choix<[number, number]>([[0.5, 2], [0.5, 4], [0.25, 4], [0.2, 5], [2, 5], [5, 4], [10, 3], [0.5, 3], [2, 3]])
    const debut = -ent(3, 5), fin = debut + 10
    const k = cranAuHasard(debut, fin, [0, m]), L = lettreAuHasard()
    return { enonce: `Quelle est l'abscisse du point $${L}$ ?`, figure: F.droiteGraduee(debut, fin, 1, k, L, u => debut + u === 0 ? '0' : debut + u === m ? ecrire(m * pas) : ''), reponse: nb(k * pas) }
  }),
  exo(0, 'droite-fraction', 'Lire une abscisse fractionnaire', () => {
    const d = choix([2, 3, 4]), debut = -3, fin = 3
    let n: number
    do { n = ent(-3 * d + 1, 3 * d - 1) } while (n % d === 0)
    const L = lettreAuHasard()
    return { enonce: `Quelle est l'abscisse du point $${L}$ ? Donner une fraction.`, figure: F.droiteGraduee(debut, fin, d, n / d, L), reponse: irreductible(n, d) }
  }),
  exo(0, 'droite-placer', 'Placer un point sur une droite graduée', () => {
    const parts = choix([1, 2, 4, 5]), debut = -ent(3, 5), fin = debut + (parts === 1 ? 8 : 6)
    let x: number
    do { x = debut + ent(1, (fin - debut) * parts - 1) / parts } while (x === 0)
    const L = choix(['B', 'C', 'E', 'N'])
    return {
      enonce: `Placer sur la droite graduée le point $${L}$ d'abscisse $${nb(x)}$.`,
      figure: F.droiteGradueePoints(debut, fin, parts, []),
      reponse: mot(`voici le point $${L}$ placé :`),
      figureReponse: F.droiteGraduee(debut, fin, parts, x, L),
    }
  }),
]
const COURS_DROITE: QuestionCours[] = [
  notion(0, 100, 'L’abscisse d’un point', () => phraseATrou('le nombre qui repère un point sur une [droite graduée] s\'appelle son [abscisse].')),
  notion(0, 101, 'L’origine', () => phraseATrou('l\'[origine] d\'une droite graduée est le point dont l\'[abscisse] est $0$.')),
  notion(0, 102, 'Les abscisses négatives', () => phraseATrou('sur une droite graduée, les points d\'abscisse [négative] sont du côté opposé aux points d\'abscisse [positive].')),
]

// ---------- Ligne 2 : le repère ----------
/** Des coordonnées entières de −4 à 4, aucune nulle */
const nonNul = () => { let v: number; do { v = ent(-4, 4) } while (v === 0); return v }
const REPERE: Automatisme[] = [
  exo(1, 'repere-lire', 'Lire les coordonnées d’un point', () => {
    const x = nonNul(), y = nonNul(), L = lettreAuHasard()
    return { enonce: `Quelles sont les coordonnées du point $${L}$ ?`, figure: F.repereGradue(1, 1, [{ x, y, nom: L }]), reponse: coord(x, y) }
  }),
  exo(1, 'repere-unites', 'Lire les coordonnées, unités différentes sur les axes', () => {
    const [px, py] = choix<[number, number]>([[1, 2], [2, 1], [1, 0.5], [0.5, 1], [1, 5], [5, 1], [10, 1], [1, 10], [2, 5], [0.5, 2]])
    const i = nonNul(), j = nonNul(), L = lettreAuHasard()
    return { enonce: `Quelles sont les coordonnées du point $${L}$ ?`, figure: F.repereGradue(px, py, [{ x: i * px, y: j * py, nom: L }]), reponse: coord(i * px, j * py) }
  }),
  exo(1, 'repere-axe', 'Lire les coordonnées d’un point sur un axe', () => {
    const [px, py] = choix<[number, number]>([[1, 1], [1, 1], [1, 2], [2, 1], [1, 0.5]])
    const v = nonNul(), surAbscisses = Math.random() < 0.5, L = lettreAuHasard()
    const x = surAbscisses ? v * px : 0, y = surAbscisses ? 0 : v * py
    return { enonce: `Quelles sont les coordonnées du point $${L}$ ?`, figure: F.repereGradue(px, py, [{ x, y, nom: L }]), reponse: coord(x, y) }
  }),
  exo(1, 'repere-demi', 'Lire les coordonnées, au milieu d’un carreau', () => {
    // Au moins une coordonnée en demi-unité
    const demi = () => (ent(-4, 3) + 0.5)
    const [x, y] = choix<[number, number]>([[demi(), nonNul()], [nonNul(), demi()], [demi(), demi()]]), L = lettreAuHasard()
    return { enonce: `Quelles sont les coordonnées du point $${L}$ ?`, figure: F.repereGradue(1, 1, [{ x, y, nom: L }]), reponse: coord(x, y) }
  }),
  exo(1, 'repere-placer', 'Placer un point de coordonnées données', () => {
    const [px, py] = choix<[number, number]>([[1, 1], [1, 1], [1, 2], [2, 1]])
    const x = choix([nonNul(), 0]) * px, y = (x === 0 ? nonNul() : choix([nonNul(), nonNul(), 0])) * py, L = choix(['B', 'C', 'E', 'N'])
    return {
      enonce: `Placer dans le repère le point $${L}${coord(x, y)}$.`,
      figure: F.repereGradue(px, py, []),
      reponse: mot(`voici le point $${L}$ placé :`),
      figureReponse: F.repereGradue(px, py, [{ x, y, nom: L }]),
    }
  }),
]
const COURS_REPERE: QuestionCours[] = [
  notion(1, 103, 'L’abscisse', () => phraseATrou('dans les [coordonnées] $(x\\,;\\,y)$ d\'un point, $x$ est son [abscisse].')),
  notion(1, 104, 'L’ordonnée', () => phraseATrou('dans les [coordonnées] $(x\\,;\\,y)$ d\'un point, $y$ est son [ordonnée].')),
  notion(1, 105, 'Un point sur un axe', () => choix<[string, string]>([
    ['Compléter : un point de l\'axe des abscisses a une ordonnée égale à …', '$0$'],
    ['Compléter : un point de l\'axe des ordonnées a une abscisse égale à …', '$0$'],
    ['Compléter : un point dont l\'ordonnée est égale à $0$ est sur l\'axe des …', 'abscisses'],
    ['Compléter : un point dont l\'abscisse est égale à $0$ est sur l\'axe des …', 'ordonnées'],
  ])),
  notion(1, 106, 'Un repère orthogonal', () => phraseATrou('un repère est [orthogonal] quand ses axes sont [perpendiculaires].')),
  // Les deux questions demandées par le professeur
  notion(1, 107, 'Le point-virgule', () => phraseATrou('on sépare les [coordonnées] d\'un point par un [point-virgule].')),
  notion(1, 108, 'Les parenthèses', () => phraseATrou('les [coordonnées] d\'un point s\'écrivent entre [parenthèses].')),
]

// ---------- Ligne 3 : périmètres, aires, volumes ----------
const cm = (v: number | string) => unite(typeof v === 'number' ? nb(v) : v, 'cm')
const MESURES: Automatisme[] = [
  exo(2, 'perimetre-polygone', 'Périmètre d’un polygone', () => {
    const l = Array.from({ length: ent(3, 6) }, () => ent(2, 9))
    return { enonce: 'Calculer le périmètre de ce polygone.', figure: F.polygoneCote(l.map(v => `${v} cm`), ent(0, 359)), reponse: cm(l.reduce((s, v) => s + v, 0)) }
  }),
  exo(2, 'perimetre-cercle', 'Périmètre d’un cercle', () => {
    const r = ent(2, 9), diametre = Math.random() < 0.5
    return { enonce: 'Calculer le périmètre de ce cercle. Donner la valeur exacte.', figure: F.cercleCote(`${diametre ? 2 * r : r} cm`, diametre, false), reponse: cm(piFois(2 * r)) }
  }),
  exo(2, 'aire-rectangle', 'Aire d’un rectangle', () => {
    const L = ent(4, 12), l = ent(2, L - 1)
    return { enonce: 'Calculer l\'aire de ce rectangle.', figure: F.rectangleCote(`${L} cm`, `${l} cm`), reponse: cm2(nb(L * l)) }
  }),
  exo(2, 'aire-triangle', 'Aire d’un triangle', () => {
    let b: number, h: number
    do { b = ent(3, 12); h = ent(2, 10) } while ((b * h) % 2)
    return { enonce: 'Calculer l\'aire de ce triangle.', figure: F.triangleHauteur(`${b} cm`, `${h} cm`, Math.random() < 0.35), reponse: cm2(nb(b * h / 2)) }
  }),
  exo(2, 'aire-disque', 'Aire d’un disque', () => {
    const r = ent(2, 9), diametre = Math.random() < 0.5
    return { enonce: 'Calculer l\'aire de ce disque. Donner la valeur exacte.', figure: F.cercleCote(`${diametre ? 2 * r : r} cm`, diametre, true), reponse: cm2(piFois(r * r)) }
  }),
  exo(2, 'volume-pave', 'Volume d’un pavé droit', () => {
    const l = ent(2, 7), h = ent(2, 5), p = ent(2, 5)
    return { enonce: 'Calculer le volume de ce pavé droit.', figure: F.paveCote(l, h, p), reponse: cm3(nb(l * h * p)) }
  }),
  exo(2, 'volume-prisme', 'Volume d’un prisme droit', () => {
    const h = ent(2, 10)
    if (Math.random() < 0.5) {
      const a = ent(2, 8), b = 2 * ent(1, 5)
      return { enonce: `Un prisme droit a pour base un triangle rectangle dont les côtés de l'angle droit mesurent $${a}$ cm et $${b}$ cm. Sa hauteur mesure $${h}$ cm. Calculer son volume.`, figure: F.solide('prisme3'), reponse: cm3(nb(a * b / 2 * h)) }
    }
    const B = ent(3, 15)
    return { enonce: `L'aire de la base d'un prisme droit est $${B}$ cm², et sa hauteur mesure $${h}$ cm. Calculer son volume.`, figure: F.solide(choix(['prisme3', 'prisme5', 'prisme6'] as const)), reponse: cm3(nb(B * h)) }
  }),
  exo(2, 'volume-cylindre', 'Volume d’un cylindre', () => {
    const r = ent(1, 5), h = ent(2, 10)
    return { enonce: `Un cylindre a pour rayon $${r}$ cm et pour hauteur $${h}$ cm. Calculer son volume. Donner la valeur exacte.`, figure: F.solide('cylindre'), reponse: cm3(piFois(r * r * h)) }
  }),
  exo(2, 'volume-pyramide', 'Volume d’une pyramide', () => {
    let c: number, h: number
    do { c = ent(2, 9); h = ent(2, 12) } while ((c * c * h) % 3)
    return { enonce: `Une pyramide a pour base un carré de côté $${c}$ cm, et sa hauteur mesure $${h}$ cm. Calculer son volume.`, figure: F.solideMesure('pyramide', `${c} cm`, `${h} cm`), reponse: cm3(nb(c * c * h / 3)) }
  }),
  exo(2, 'volume-cone', 'Volume d’un cône', () => {
    let r: number, h: number
    do { r = ent(1, 6); h = ent(2, 12) } while ((r * r * h) % 3)
    return { enonce: `Un cône de révolution a pour rayon $${r}$ cm et pour hauteur $${h}$ cm. Calculer son volume. Donner la valeur exacte.`, figure: F.solideMesure('cone', `${r} cm`, `${h} cm`), reponse: cm3(piFois(r * r * h / 3)) }
  }),
  exo(2, 'volume-boule', 'Volume d’une boule', () => {
    const r = ent(1, 6), f = irreductible(4 * r ** 3, 3)
    return { enonce: `Une boule a pour rayon $${r}$ cm. Calculer son volume. Donner la valeur exacte.`, reponse: cm3(`${f}\\pi`) }
  }),
]
const COURS_MESURES: QuestionCours[] = [
  notion(2, 109, 'Le périmètre d’un cercle', () => phraseATrou('le [périmètre] d\'un cercle de rayon $r$ est [$2\\pi r$].')),
  notion(2, 110, 'L’aire d’un disque', () => phraseATrou('l\'[aire] d\'un disque de rayon $r$ est [$\\pi r^2$].')),
  notion(2, 111, 'L’aire d’un triangle', () => phraseATrou('pour l\'aire d\'un [triangle], on multiplie la base par la [hauteur], puis on divise par [$2$].')),
  notion(2, 112, 'Le volume d’un prisme droit ou d’un cylindre', () => phraseATrou('le volume d\'un [prisme droit] ou d\'un [cylindre] est l\'aire de la [base] multipliée par la [hauteur].')),
  notion(2, 113, 'Le volume d’une pyramide ou d’un cône', () => phraseATrou('le volume d\'une [pyramide] ou d\'un [cône] est l\'aire de la base multipliée par la hauteur, puis divisée par [$3$].')),
  notion(2, 114, 'Le volume d’une boule', () => phraseATrou('le volume d\'une [boule] de rayon $r$ est [$\\frac{4}{3}\\pi r^3$].')),
]

// ---------- Ligne 4 : Pythagore et Thalès ----------
/** Des triangles rectangles aux côtés entiers (sans calculatrice) */
const TRIPLETS: [number, number, number][] = [[3, 4, 5], [6, 8, 10], [9, 12, 15], [12, 16, 20], [5, 12, 13], [8, 15, 17], [7, 24, 25], [15, 20, 25]]
const triplet = () => { const [a, b, c] = choix(TRIPLETS); return Math.random() < 0.5 ? [a, b, c] : [b, a, c] }
/** Des côtés de l'angle droit dont l'hypoténuse est une racine qui ne se simplifie pas */
const SOMMES_RACINES: [number, number][] = [[1, 1], [1, 2], [1, 3], [2, 3], [1, 4], [2, 5], [1, 5], [3, 5], [4, 5], [1, 6], [5, 6]]
/** Une hypoténuse et un côté, l'autre côté étant une racine qui ne se simplifie pas */
const DIFFERENCES_RACINES: [number, number][] = [[3, 2], [4, 1], [4, 3], [5, 2], [6, 5], [6, 1], [7, 4], [7, 6]]
/** Des rapports de Thalès simples */
const RAPPORTS: [number, number][] = [[1, 2], [1, 3], [2, 3], [2, 5], [3, 5], [3, 4], [1, 4]]
function thales(papillon: boolean): Question {
  const [A, M, B, N, C] = pts(5), [p, q] = choix(RAPPORTS), k = ent(1, 3), m = ent(1, 4)
  const figure = F.thales(A + M + B + N + C, papillon), parallele = `Les droites $(${M}${N})$ et $(${B}${C})$ sont parallèles.`
  if (Math.random() < 0.5) return { enonce: `${parallele} $${A}${M} = ${p * k}$ cm, $${A}${B} = ${q * k}$ cm et $${B}${C} = ${q * m}$ cm. Calculer $${M}${N}$.`, figure, reponse: cm(p * m) }
  return { enonce: `${parallele} $${A}${M} = ${p * k}$ cm, $${A}${B} = ${q * k}$ cm et $${A}${C} = ${q * m}$ cm. Calculer $${A}${N}$.`, figure, reponse: cm(p * m) }
}
const PYTHAGORE_THALES: Automatisme[] = [
  exo(3, 'pythagore-hypotenuse', 'Pythagore : calculer l’hypoténuse', () => {
    const [A, B, C] = pts(3), [a, b, c] = triplet()
    return { enonce: `Le triangle $${A}${B}${C}$ est rectangle en $${A}$, avec $${A}${B} = ${a}$ cm et $${A}${C} = ${b}$ cm. Calculer $${B}${C}$.`, figure: F.triangleRectangleNomme(A + B + C, ent(0, 359), { a1: `${a} cm`, a2: `${b} cm` }), reponse: cm(c) }
  }),
  exo(3, 'pythagore-cote', 'Pythagore : calculer un côté de l’angle droit', () => {
    const [A, B, C] = pts(3), [a, b, c] = triplet()
    return { enonce: `Le triangle $${A}${B}${C}$ est rectangle en $${A}$, avec $${B}${C} = ${c}$ cm et $${A}${B} = ${a}$ cm. Calculer $${A}${C}$.`, figure: F.triangleRectangleNomme(A + B + C, ent(0, 359), { a1: `${a} cm`, hyp: `${c} cm` }), reponse: cm(b) }
  }),
  exo(3, 'pythagore-racine', 'Pythagore : une longueur qui reste une racine', () => {
    const [A, B, C] = pts(3)
    if (Math.random() < 0.6) {
      const [a, b] = melange(choix(SOMMES_RACINES))
      return { enonce: `Le triangle $${A}${B}${C}$ est rectangle en $${A}$, avec $${A}${B} = ${a}$ cm et $${A}${C} = ${b}$ cm. Calculer $${B}${C}$. Donner la valeur exacte.`, figure: F.triangleRectangleNomme(A + B + C, ent(0, 359), { a1: `${a} cm`, a2: `${b} cm` }), reponse: cm(`\\sqrt{${a * a + b * b}}`) }
    }
    const [c, a] = choix(DIFFERENCES_RACINES)
    return { enonce: `Le triangle $${A}${B}${C}$ est rectangle en $${A}$, avec $${B}${C} = ${c}$ cm et $${A}${B} = ${a}$ cm. Calculer $${A}${C}$. Donner la valeur exacte.`, figure: F.triangleRectangleNomme(A + B + C, ent(0, 359), { a1: `${a} cm`, hyp: `${c} cm` }), reponse: cm(`\\sqrt{${c * c - a * a}}`) }
  }),
  exo(3, 'pythagore-reciproque', 'En quel sommet le triangle est-il rectangle ?', () => {
    // Pas de figure : elle montrerait l'angle droit
    const [A, B, C] = pts(3), [a, b, c] = triplet()
    // Le côté le plus long, [BC] ou un autre, est en face du sommet cherché
    const [droit, s1, s2] = choix([[A, B, C], [B, A, C], [C, A, B]])
    const cotes = melange<[string, number]>([[`${s1}${s2}`, c], [`${droit}${s1}`, a], [`${droit}${s2}`, b]])
    return { enonce: `Le triangle $${A}${B}${C}$ est rectangle, avec ${cotes.map(([n, v]) => `$${n} = ${v}$ cm`).join(', ').replace(/, ([^,]*)$/, ' et $1')}. En quel sommet est-il rectangle ?`, reponse: mot(`en $${droit}$`) }
  }),
  exo(3, 'thales-emboites', 'Thalès : triangles emboîtés', () => thales(false)),
  exo(3, 'thales-papillon', 'Thalès : en papillon', () => thales(true)),
  exo(3, 'thales-rapports', 'Écrire les rapports de Thalès', () => {
    const [A, M, B, N, C] = pts(5), figure = F.thales(A + M + B + N + C, Math.random() < 0.5)
    const debut = `Les droites $(${M}${N})$ et $(${B}${C})$ sont parallèles. Compléter : `
    if (Math.random() < 0.5) return { enonce: `${debut}$\\frac{${A}${M}}{${A}${B}} = \\frac{${A}${N}}{\\ldots} = \\frac{${M}${N}}{\\ldots}$`, figure, reponse: mot(`$${A}${C}$ et $${B}${C}$`) }
    return { enonce: `${debut}$\\frac{${A}${M}}{\\ldots} = \\frac{${A}${N}}{${A}${C}} = \\frac{\\ldots}{${B}${C}}$`, figure, reponse: mot(`$${A}${B}$ et $${M}${N}$`) }
  }),
]
const COURS_PYTHAGORE_THALES: QuestionCours[] = [
  // Q1 (la phrase de 3e, qui est aussi la P1 proposée)
  notion(3, 115, 'Le théorème de Pythagore', () => phraseATrou('dans un triangle rectangle, le [carré] de l\'[hypoténuse] est égal à la [somme] des carrés des deux autres côtés.')),
  // Q2 (3e)
  notion(3, 116, 'Le plus long côté', () => {
    const [A, B, C] = pts(3)
    return Math.random() < 0.5 ? ['Comment s\'appelle le plus long côté d\'un triangle rectangle ?', 'l\'hypoténuse']
      : [`Le triangle $${A}${B}${C}$ est rectangle en $${A}$. Comment s'appelle son plus long côté, $[${B}${C}]$ ?`, 'l\'hypoténuse']
  }),
  // P2
  notion(3, 117, 'L’hypoténuse', () => phraseATrou('dans un triangle rectangle, l\'[hypoténuse] est le côté opposé à l\'[angle droit].')),
  // Q3 (3e)
  notion(3, 118, 'L’égalité de Pythagore', () => {
    const [A, B, C] = pts(3)
    return [`$${A}${B}${C}$ est rectangle en $${C}$. Que vaut $${A}${B}^2$ ?`, `$${C}${A}^2 + ${C}${B}^2$`]
  }),
  // P3
  notion(3, 119, 'La réciproque du théorème de Pythagore', () => {
    const [A, B, C] = pts(3)
    return [`Compléter : si $${A}${C}^2 = ${A}${B}^2 + ${B}${C}^2$, alors le triangle $${A}${B}${C}$ est rectangle en …`, `$${B}$`]
  }),
  // Q4 à Q8 (3e)
  deLa3e(3, 120, 'cours-3e-Triangles-200'),
  deLa3e(3, 121, 'cours-3e-Triangles-204'),
  deLa3e(3, 122, 'cours-3e-Triangles-202'),
  deLa3e(3, 123, 'cours-3e-Triangles-201'),
  deLa3e(3, 124, 'cours-3e-Triangles-203'),
  // P4
  notion(3, 125, 'La proportionnalité dans Thalès', () => phraseATrou('dans une configuration de [Thalès], les longueurs des côtés des deux triangles sont [proportionnelles].')),
]

// ---------- Ligne 5 : la trigonométrie ----------
/** Les exercices de trigonométrie de 3e, repris tels quels sous cette ligne */
const TRIGO_3E = ['3e-obj-trigo-ecrire', '3e-obj-trigo-calculer-cos-sin', '3e-obj-trigo-calculer-tan', '3e-obj-trigo-cote-cos', '3e-obj-trigo-cote-sin-tan', '3e-obj-trigo-quel-rapport']
const TRIGO: Automatisme[] = [
  ...TRIGO_3E.map(id => {
    const a = AUTOMATISMES_3E_OBJECTIFS_GEOMETRIE.find(e => e.id === id)
    if (!a) throw new Error(`Exercice de 3e introuvable : ${id}`)
    return exo(4, id.replace('3e-obj-', ''), a.titre, a.generer)
  }),
  exo(4, 'trigo-cos2-sin2', 'Du cosinus au sinus : cos² + sin² = 1', () => {
    const [c, s] = choix<[string, string]>([['0,6', '0,8'], ['0,8', '0,6'], [frac(3, 5), frac(4, 5)], [frac(4, 5), frac(3, 5)], [frac(5, 13), frac(12, 13)], [frac(12, 13), frac(5, 13)]].map(([a, b]) => [a.replace(',', '{,}'), b.replace(',', '{,}')]))
    const [f, g] = Math.random() < 0.5 ? ['\\cos', '\\sin'] : ['\\sin', '\\cos']
    return { enonce: `$x$ est un angle aigu et $${f} x = ${c}$. Que vaut $${g} x$ ?`, reponse: s }
  }),
]
const COURS_TRIGO: QuestionCours[] = [
  // Q1 à Q3 : les trois façons de la notion de 3e, chacune à part
  deLa3e(4, 126, 'cours-3e-Triangles-205', 'Le cosinus', [0]),
  deLa3e(4, 127, 'cours-3e-Triangles-205', 'Le sinus', [1]),
  deLa3e(4, 128, 'cours-3e-Triangles-205', 'La tangente', [2]),
  // Q4, Q5 (3e)
  deLa3e(4, 129, 'cours-3e-Triangles-206'),
  deLa3e(4, 130, 'cours-3e-Triangles-207'),
  // P1, P2
  notion(4, 131, 'Le côté adjacent', () => phraseATrou('dans un triangle rectangle, le côté [adjacent] à un angle aigu est le côté de l\'angle droit qui [touche] cet angle.')),
  notion(4, 132, 'cos² + sin² = 1', () => {
    const x = choix(['x', 'a', '\\alpha', '\\theta']), [f, g] = Math.random() < 0.5 ? ['\\cos', '\\sin'] : ['\\sin', '\\cos']
    return phraseATrou(`pour tout angle aigu $${x}$, $${f}^2 ${x} + ${g}^2 ${x} =$ [$1$].`)
  }),
]

export const AUTOMATISMES_2NDE_GEOMETRIE: Automatisme[] = [...DROITE, ...REPERE, ...MESURES, ...PYTHAGORE_THALES, ...TRIGO]
export const COURS_2NDE_GEOMETRIE: QuestionCours[] = [...COURS_DROITE, ...COURS_REPERE, ...COURS_MESURES, ...COURS_PYTHAGORE_THALES, ...COURS_TRIGO]
