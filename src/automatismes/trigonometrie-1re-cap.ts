// =============================================================
// LA TRIGONOMÉTRIE DE 1re : LES DEUX CAPACITÉS ATTENDUES (CAP)
// Le professeur a demandé, le 26 novembre 2026, de commencer les capacités
// de 1re par la trigonométrie. Les cinq compétences PERSO restent telles
// quelles (trigonometrie-1re.ts) ; ici, les exercices et les questions de
// cours rangés sous les deux capacités du programme :
// - CAP1 « Placer un point sur le cercle trigonométrique » : placer le
//   point d'un réel (la correction montre le point placé), retrouver la
//   lettre d'un point, l'arc parcouru depuis I dans un sens ou dans l'autre ;
// - CAP2 « Par lecture du cercle trigonométrique, déterminer, pour des
//   valeurs remarquables de x, les cosinus et sinus d'angles associés à x » :
//   lecture sur le cercle avec les deux points dessinés, la valeur exacte
//   sans dessin, les coordonnées d'un point symétrique.
// Ses règles : réponses courtes ; jamais une chance sur deux ; jamais la
// liste des réponses possibles ; rien de fixe (le réel, la lettre, l'angle
// associé, le sens, la place du trou) ; pas de calculatrice.
// =============================================================
import * as F from '../figures'
import { rangerSousObjectif } from '../objectifs-flash'
import type { Automatisme, Facon, Question, QuestionCours } from './outils'
import { choix, mot, notions } from './outils'
import { phraseATrou } from './seconde-nombres-reels'
import { ANGLES_ASSOCIES, ASSOCIES, PLACER, T_TRIGONOMETRIE, VALEURS_REMARQUABLES, enDegres, mesurePrincipale, reelPi, reelVarie, valeurExacte } from './trigonometrie-1re'

const T = T_TRIGONOMETRIE
/** Les deux capacités attendues, telles que le programme les écrit */
const CAPACITES = [
  'Placer un point sur le cercle trigonométrique.',
  'Par lecture du cercle trigonométrique, déterminer, pour des valeurs remarquables de $x$, les cosinus et sinus d’angles associés à $x$.',
]
/** Un exercice rangé sous une capacité (k : son rang dans le domaine) */
function exo(k: number, id: string, titre: string, generer: () => Question): Automatisme {
  rangerSousObjectif('1re', `1re-trigo-${id}`, T, k)
  return { id: `1re-trigo-${id}`, theme: T, titre, application: true, programme: CAPACITES[k], generer }
}
/** Une façon de question de cours devenue exercice */
const deFacon = (f: Facon) => (): Question => { const [enonce, reponse, figure] = f(); return figure ? { enonce, reponse, figure } : { enonce, reponse } }

const LETTRES_POINT = ['M', 'N', 'P', 'A', 'B']
const LETTRES_REEL = ['x', 'a', 't', '\\theta']
/** Les valeurs remarquables du premier quart de tour (sans 0 ni π/2) */
const PREMIER_QUART: [number, number][] = [[1, 6], [1, 4], [1, 3]]
/** La mesure en degrés (entre 0 et 360) du point de l'angle associé */
const degresAssocie = (a: typeof ASSOCIES[number], dx: number) => ((Math.round(a.ajout * 180 / Math.PI + a.signe * dx) % 360) + 360) % 360

// ---------- CAP1 : placer un point sur le cercle ----------
const CAP1: Automatisme[] = [
  exo(0, 'placer', 'Placer le point d’un réel sur le cercle', () => {
    const r = reelVarie(), L = choix(LETTRES_POINT)
    return {
      enonce: `Placer sur le cercle trigonométrique le point $${L}$ associé au réel $${r.txt}$.`,
      figure: F.cercleTrigo([], []),
      reponse: mot(`voici le point $${L}$ placé :`),
      figureReponse: F.cercleTrigo([L], [r.degres]),
    }
  }),
  exo(0, 'lettre', 'Le point d’un réel parmi les points du cercle', deFacon(PLACER[0])),
  exo(0, 'arc', 'L’arc parcouru depuis I', () => {
    const v = choix(VALEURS_REMARQUABLES.slice(1)), d = enDegres(v), direct = Math.random() < 0.5
    return {
      enonce: `À partir du point $I$, on parcourt sur le cercle trigonométrique un arc de longueur $${reelPi(v)}$ dans le sens ${direct ? 'direct' : 'indirect'}. Quel réel de $]-\\pi\\,;\\,\\pi]$ est associé au point d'arrivée ?`,
      reponse: `$${mesurePrincipale(direct ? d : (360 - d) % 360)}$`,
    }
  }),
]

// ---------- CAP2 : cosinus et sinus des angles associés, lus sur le cercle ----------
const CAP2: Automatisme[] = [
  exo(1, 'lecture', 'Lire le cosinus ou le sinus d’un angle associé', () => {
    const v = choix(PREMIER_QUART), dx = enDegres(v), a = choix(ASSOCIES), x = choix(LETTRES_REEL)
    const dn = degresAssocie(a, dx), f = choix(['cos', 'sin'] as const)
    return {
      enonce: `Sur le cercle trigonométrique, $M$ est associé à $${x} = ${reelPi(v)}$ et $N$ à $${a.arg(x)}$. Donner la valeur exacte de $\\${f}\\left(${a.arg(x)}\\right)$.`,
      figure: F.cercleTrigo(['M', 'N'], [dx, dn]),
      reponse: `$${valeurExacte(dn, f)}$`,
    }
  }),
  exo(1, 'valeur', 'La valeur exacte pour un angle associé', () => {
    const v = choix(PREMIER_QUART), dx = enDegres(v), a = choix(ASSOCIES), f = choix(['cos', 'sin'] as const)
    return { enonce: `Donner la valeur exacte de $\\${f}\\left(${a.arg(reelPi(v))}\\right)$.`, reponse: `$${valeurExacte(degresAssocie(a, dx), f)}$` }
  }),
  exo(1, 'symetrique', 'Les coordonnées d’un point symétrique', () => {
    const v = choix(PREMIER_QUART), dx = enDegres(v), L = choix(LETTRES_POINT)
    const [axe, d] = choix<[string, number]>([['l\'axe des abscisses', 360 - dx], ['l\'axe des ordonnées', 180 - dx], ['l\'origine $O$ du repère', 180 + dx], ['la droite d\'équation $y = x$', 90 - dx]])
    return {
      enonce: `$${L}$ est le point du cercle trigonométrique associé au réel $${reelPi(v)}$. Donner les coordonnées de son symétrique par rapport à ${axe}.`,
      reponse: `$\\left(${valeurExacte(d, 'cos')}\\,;\\,${valeurExacte(d, 'sin')}\\right)$`,
    }
  }),
]

export const AUTOMATISMES_1RE_TRIGO_CAP: Automatisme[] = [...CAP1, ...CAP2]

// ---------- Les questions de cours des deux capacités ----------
/** Une notion de cours sous une capacité (numéros à partir de 100) */
function notion(k: number, i: number, titre: string, ...facons: Facon[]): QuestionCours {
  const [q] = notions(T, [[titre, ...facons]], '1re-')
  return { ...q, id: `cours-1re-${T}-${i}`, objectif: k }
}
const lettre = () => choix(LETTRES_REEL)
export const COURS_1RE_TRIGO_CAP: QuestionCours[] = [
  notion(0, 100, 'Le cercle trigonométrique', () => phraseATrou('Le cercle trigonométrique a pour centre l’[origine] du repère et pour rayon [1].')),
  notion(0, 101, 'Le sens direct', () => phraseATrou('Sur le cercle trigonométrique, le sens [direct] est le sens [contraire] des aiguilles d’une montre.')),
  notion(0, 102, 'Un tour de plus', () => { const x = lettre(); return phraseATrou(`Les réels $${x}$ et $${x} + 2k\\pi$, avec $k$ [entier], sont associés au même [point] du cercle trigonométrique.`) }),
  notion(1, 103, 'Les points de x et de −x', () => { const x = lettre(); return phraseATrou(`Les points du cercle associés à $${x}$ et à $-${x}$ sont [symétriques] par rapport à l’axe des [abscisses].`) }),
  notion(1, 104, 'Les points de x et de π − x', () => { const x = lettre(); return phraseATrou(`Les points du cercle associés à $${x}$ et à $\\pi - ${x}$ sont [symétriques] par rapport à l’axe des [ordonnées].`) }),
  notion(1, 105, 'Les points de x et de π + x', () => { const x = lettre(); return phraseATrou(`Les points du cercle associés à $${x}$ et à $\\pi + ${x}$ sont [symétriques] par rapport à l’[origine] du repère.`) }),
  notion(1, 106, 'Les formules des angles associés', ANGLES_ASSOCIES[0]),
]
