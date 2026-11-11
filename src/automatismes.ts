// =============================================================
// LES AUTOMATISMES
// Toutes les questions sont à RÉPONSE COURTE, comme au brevet et à
// l'épreuve anticipée à partir de 2027 : l'élève écrit sa réponse, on ne
// lui montre jamais de propositions, et aucune question ne se réussit
// avec une chance sur deux (pas de « oui ou non »).
// - Les exercices : chaque automatisme est un GÉNÉRATEUR, qui tire des
//   valeurs au hasard et rend une question et sa réponse. Beaucoup savent
//   aussi poser leur question « à trou » (une égalité à compléter), qui se
//   mélange aux autres.
// - Les questions de cours : une définition, une propriété, le
//   vocabulaire, rangés dans les mêmes thèmes.
// Un flash (voir src/flash.ts) tire ses questions dans les thèmes
// choisis : par défaut 2 questions de cours, puis 3 exercices
// (tirerFlash, plus bas).
//
// Les réponses sont du LaTeX (KaTeX), un texte (préfixe §, avec $…$
// pour les maths) ou un dessin SVG. Une question peut porter une
// figure (droite graduée, repère, cubes, angles codés…).
//
// Chaque niveau a son fichier, dans le dossier automatismes/ :
// cinquieme.ts, quatrieme.ts, troisieme.ts et lycee.ts (2nde et 1re) ;
// les outils qu'ils partagent (le hasard, l'écriture des nombres, les
// noms de points…) sont dans automatismes/outils.ts. Ce fichier-ci range
// les niveaux et tire les questions d'un flash ; il redonne aussi tout ce
// que les autres fichiers de l'outil y prenaient déjà.
// =============================================================
import type { Automatisme, Question, QuestionCours } from './automatismes/outils'
import { choix } from './automatismes/outils'
import { AUTOMATISMES_5E, COURS_5E } from './automatismes/cinquieme'
import { AUTOMATISMES_4E, COURS_4E } from './automatismes/quatrieme'
import { AUTOMATISMES_1RE, AUTOMATISMES_2NDE, COURS_1RE, COURS_2NDE } from './automatismes/lycee'
import { AUTOMATISMES_3E, COURS_3E } from './automatismes/troisieme'
export type { Question, Automatisme, Facon, QuestionCours } from './automatismes/outils'
export { nb, mot } from './automatismes/outils'
export { AUTOMATISMES_5E, COURS_5E } from './automatismes/cinquieme'
export { AUTOMATISMES_4E, COURS_4E } from './automatismes/quatrieme'
export { AUTOMATISMES_2NDE, AUTOMATISMES_1RE, COURS_2NDE, COURS_1RE } from './automatismes/lycee'
export { AUTOMATISMES_3E, COURS_3E } from './automatismes/troisieme'

// =============================================================
// LES NIVEAUX
// Ceux qui n'ont pas encore d'automatismes paraissent dans le panneau,
// grisés (« bientôt » ; aucun depuis le 7 novembre 2026).
// =============================================================
export interface Niveau { id: string; nom: string; automatismes: Automatisme[]; cours: QuestionCours[] }
export const NIVEAUX: Niveau[] = [
  { id: '5e', nom: '5e', automatismes: AUTOMATISMES_5E, cours: COURS_5E },
  { id: '4e', nom: '4e', automatismes: AUTOMATISMES_4E, cours: COURS_4E },
  { id: '3e', nom: '3e', automatismes: AUTOMATISMES_3E, cours: COURS_3E },
  { id: '2nde', nom: '2nde', automatismes: AUTOMATISMES_2NDE, cours: COURS_2NDE },
  { id: '1re', nom: '1re', automatismes: AUTOMATISMES_1RE, cours: COURS_1RE },
]
/** Les thèmes d'un niveau, dans l'ordre de la liste */
export const themesDe = (n: Niveau) => [...new Set(n.automatismes.map(a => a.theme))]
/** Les exercices que le flash peut poser dans un niveau : seulement des
 *  automatismes, sans les applications directes (choix du professeur, le
 *  7 novembre 2026) */
export const automatismesDuFlash = (n: Niveau) => n.automatismes.filter(a => !a.application)

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
  /** La phrase du programme que l'exercice travaille, s'il en a une */
  programme?: string
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
    questions.push({ id: x.id, theme: x.theme, q, forme: 'application', ...(x.programme ? { programme: x.programme } : {}) })
  }
  return { questions, coursRemplaces }
}
