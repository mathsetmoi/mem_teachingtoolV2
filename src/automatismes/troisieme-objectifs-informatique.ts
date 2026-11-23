// =============================================================
// LES OBJECTIFS D'APPRENTISSAGE DE 3e : LA PENSÉE INFORMATIQUE
// Revus par le professeur le 23 novembre 2026, objectif par objectif,
// comme ceux des thèmes précédents (troisieme-objectifs.ts donne les
// outils exoObjectif, notion et phraseATrou).
// - Les scripts sont dessinés comme dans Scratch (F.scriptScratch) :
//   blocs de couleur, valeurs dans des ovales, conditions en hexagone.
// - OBJ2 (conditions composées) et OBJ4 (structurer des programmes) sont
//   en suspens, à sa demande : leurs lignes restent grises.
// - Jamais « gagné ou perdu ? » : l'élève donne un nombre, ou écrit
//   lui-même une condition ou une valeur.
// =============================================================
import * as F from '../figures'
import type { BlocScratch } from '../figures'
import type { Automatisme, QuestionCours } from './outils'
import { choix, ent, mot } from './outils'
import { exoObjectif, notion, phraseATrou } from './troisieme-objectifs'

const PI = 'Pensée informatique'
const NOMS = ['a', 'b', 'n', 'x', 'k', 'p']
/** Deux (ou trois) noms de variables différents */
const deuxNoms = (): [string, string] => choix<[string, string]>([['a', 'b'], ['x', 'y'], ['m', 'n'], ['u', 'v']])
const varb = (c: BlocScratch['c'], t: string): BlocScratch => ({ c, t })
const mettre = (v: string, val: string | number) => varb('var', typeof val === 'number' ? `mettre [${v}] à (${val})` : `mettre [${v}] à {${val}}`)
const ajouter = (val: string | number, v: string) => varb('var', typeof val === 'number' ? `ajouter (${val}) à [${v}]` : `ajouter [${val}] à [${v}]`)
const dire = (v: string) => varb('app', `dire [${v}]`)
/** Les polygones réguliers dont l'angle de rotation est entier */
const POLYGONES: [number, string][] = [[3, 'un triangle équilatéral'], [4, 'un carré'], [5, 'un pentagone régulier'], [6, 'un hexagone régulier'], [8, 'un octogone régulier'], [10, 'un décagone régulier']]

export const AUTOMATISMES_3E_OBJECTIFS_INFORMATIQUE: Automatisme[] = [
  // ================= OBJ1 : approfondir la notion de variables =================
  exoObjectif(PI, 0, '3e-obj-variable-finale', 'La valeur d’une variable à la fin', () => {
    const v = choix(NOMS), d = ent(2, 9), p = ent(2, 9), m = ent(2, 4)
    const [op, val] = choix<[string, number]>([[`${v} × ${m}`, (d + p) * m], [`${v} − ${m}`, d + p - m], [`${v} + ${v}`, 2 * (d + p)]])
    return { enonce: `Que vaut la variable $${v}$ à la fin de ce script ?`, reponse: String(val), figure: F.scriptScratch([mettre(v, d), ajouter(p, v), mettre(v, op), dire(v)]) }
  }),
  exoObjectif(PI, 0, '3e-obj-deux-variables', 'Deux variables', () => {
    const [a, b] = deuxNoms(), p = ent(2, 9), q = ent(2, 9), laquelle = choix([a, b])
    return { enonce: `Que vaut la variable $${laquelle}$ à la fin de ce script ?`, reponse: String(laquelle === a ? p + q : p), figure: F.scriptScratch([mettre(a, p), mettre(b, q), mettre(a, `${a} + ${b}`), mettre(b, `${a} − ${b}`)]) }
  }),
  exoObjectif(PI, 0, '3e-obj-echange-rate', 'Un échange raté', () => {
    const [a, b] = deuxNoms(), p = ent(1, 9)
    let q = ent(1, 9); if (q === p) q = p + 1
    const dAbord = choix([a, b]), ensuite = dAbord === a ? b : a, finale = dAbord === a ? q : p
    return {
      enonce: `On veut échanger les valeurs de $${a}$ et $${b}$. Que valent $${a}$ et $${b}$ à la fin de ce script ?`,
      reponse: mot(`$${a} = ${finale}$ et $${b} = ${finale}$`),
      figure: F.scriptScratch([mettre(a, p), mettre(b, q), varb('var', `mettre [${dAbord}] à [${ensuite}]`), varb('var', `mettre [${ensuite}] à [${dAbord}]`)]),
    }
  }),
  exoObjectif(PI, 0, '3e-obj-echange', 'Échanger deux variables', () => {
    const [a, b, c] = choix<[string, string, string]>([['a', 'b', 'c'], ['x', 'y', 't'], ['m', 'n', 'r'], ['u', 'v', 'w']]), trou = ent(0, 2)
    const lignes: [string, string][] = [[c, a], [a, b], [b, c]]
    return {
      enonce: `Ce script échange les valeurs de $${a}$ et $${b}$ à l'aide de la variable $${c}$. Que faut-il écrire à la place de … ?`,
      reponse: lignes[trou][1],
      figure: F.scriptScratch(lignes.map(([v, w], i) => varb('var', `mettre [${v}] à ${i === trou ? '(…)' : `[${w}]`}`))),
    }
  }),
  exoObjectif(PI, 0, '3e-obj-compteur', 'Un compteur', () => {
    const v = choix(NOMS), d = ent(0, 5), k = ent(3, 9), p = ent(2, 6)
    return { enonce: `Que vaut la variable $${v}$ à la fin de ce script ?`, reponse: String(d + k * p), figure: F.scriptScratch([mettre(v, d), { c: 'ctl', t: `répéter (${k}) fois`, dans: [ajouter(p, v)] }, dire(v)]) }
  }),
  exoObjectif(PI, 0, '3e-obj-somme', 'Une somme dans une boucle', () => {
    const i0 = ent(1, 3), k = ent(3, 5)
    let s = 0; for (let j = 0; j < k; j++) s += i0 + j
    return { enonce: 'Que vaut la variable $s$ à la fin de ce script ?', reponse: String(s), figure: F.scriptScratch([mettre('s', 0), mettre('i', i0), { c: 'ctl', t: `répéter (${k}) fois`, dans: [ajouter('i', 's'), ajouter(1, 'i')] }, dire('s')]) }
  }),
  exoObjectif(PI, 0, '3e-obj-reponse', 'Une réponse saisie', () => {
    const v = choix(['y', 'r', 'z']), a = ent(2, 5), b = ent(1, 9), x = ent(2, 9)
    const [calcul, val] = choix<[string, number]>([[`${a} × réponse + ${b}`, a * x + b], [`${a} × réponse − ${b}`, a * x - b], [`(réponse + ${b}) × ${a}`, (x + b) * a]])
    return {
      enonce: `On lance ce script et on répond $${x}$. Que dit le lutin ?`,
      reponse: String(val),
      figure: F.scriptScratch([varb('cap', 'demander (Choisis un nombre) et attendre'), mettre(v, calcul), dire(v)]),
    }
  }),

  // ================= OBJ2 : conditions composées, en suspens (choix du professeur) =================

  // ================= OBJ3 : la boucle conditionnelle =================
  exoObjectif(PI, 2, '3e-obj-jusqua-produit', 'Répéter jusqu’à : multiplier', () => {
    const v = choix(NOMS), d = ent(1, 3), m = choix([2, 3]), L = ent(15, 60)
    let n = d; while (!(n > L)) n *= m
    return { enonce: `Que vaut la variable $${v}$ à la fin de ce script ?`, reponse: String(n), figure: F.scriptScratch([mettre(v, d), { c: 'ctl', t: `répéter jusqu’à ⟨${v} > ${L}⟩`, dans: [mettre(v, `${v} × ${m}`)] }, dire(v)]) }
  }),
  exoObjectif(PI, 2, '3e-obj-jusqua-tours', 'Répéter jusqu’à : combien de tours ?', () => {
    const v = choix(NOMS), d = ent(0, 4), p = ent(2, 6), k = ent(3, 8)
    return { enonce: 'Combien de fois la boucle de ce script tourne-t-elle ?', reponse: String(k), figure: F.scriptScratch([mettre(v, d), { c: 'ctl', t: `répéter jusqu’à ⟨${v} = ${d + k * p}⟩`, dans: [ajouter(p, v)] }]) }
  }),
  exoObjectif(PI, 2, '3e-obj-jusqua-somme', 'Répéter jusqu’à : une somme', () => {
    const L = ent(8, 30)
    let s = 0, i = 1; while (!(s > L)) { s += i; i++ }
    return { enonce: 'Que vaut la variable $s$ à la fin de ce script ?', reponse: String(s), figure: F.scriptScratch([mettre('s', 0), mettre('i', 1), { c: 'ctl', t: `répéter jusqu’à ⟨s > ${L}⟩`, dans: [ajouter('i', 's'), ajouter(1, 'i')] }, dire('s')]) }
  }),
  exoObjectif(PI, 2, '3e-obj-jusqua-condition', 'Écrire la condition d’arrêt', () => {
    const v = choix(NOMS), L = choix([50, 100, 200, 500, 1000])
    const [quand, cond, debut, pas] = choix<[string, string, number, string]>([
      [`dès que $${v}$ dépasse $${L}$`, `${v} > ${L}`, 1, `${v} × 2`],
      [`dès que $${v}$ devient négatif`, `${v} < 0`, L, `${v} − 7`],
    ])
    return { enonce: `La boucle doit s'arrêter ${quand}. Que faut-il écrire à la place de … ?`, reponse: cond, figure: F.scriptScratch([mettre(v, debut), { c: 'ctl', t: 'répéter jusqu’à ⟨…⟩', dans: [mettre(v, pas)] }]) }
  }),
  exoObjectif(PI, 2, '3e-obj-jusqua-infini', 'Une boucle qui ne s’arrête pas', () => {
    const v = choix(NOMS), p = choix([2, 3, 5]), d = ent(1, p - 1)
    let cible = ent(4, 12) * p + d + ent(1, p - 1); if ((cible - d) % p === 0) cible++
    return {
      enonce: 'Que se passe-t-il quand on lance ce script ?',
      reponse: mot(`il ne s'arrête jamais : $${v}$ ne vaut jamais $${cible}$`),
      figure: F.scriptScratch([mettre(v, d), { c: 'ctl', t: `répéter jusqu’à ⟨${v} = ${cible}⟩`, dans: [ajouter(p, v)] }]),
    }
  }),
  exoObjectif(PI, 2, '3e-obj-jusqua-tirelire', 'Une tirelire', () => {
    const A = choix([50, 80, 100, 120]), p = choix([15, 20, 25, 30]), B = A + ent(2, 5) * p - ent(1, p - 1)
    let n = A; while (!(n > B)) n += p
    return {
      enonce: `Une tirelire contient $${A}$ €. On y ajoute $${p}$ € jusqu'à dépasser $${B}$ €. Combien contient-elle à la fin ?`,
      reponse: `${n}\\text{ €}`,
      figure: F.scriptScratch([mettre('tirelire', A), { c: 'ctl', t: `répéter jusqu’à ⟨tirelire > ${B}⟩`, dans: [ajouter(p, 'tirelire')] }, dire('tirelire')]),
    }
  }),

  // ================= OBJ4 : structurer des programmes, en suspens (choix du professeur) =================

  // ================= OBJ5 : écrire un programme pour un objectif =================
  exoObjectif(PI, 4, '3e-obj-polygone-programme', 'Tracer un polygone régulier', () => {
    const [n, nom] = choix(POLYGONES), c = choix([40, 50, 60, 80]), angle = choix([true, false])
    return {
      enonce: `Ce script doit tracer ${nom}. ${angle ? 'De combien de degrés' : 'Combien de fois'} faut-il ${angle ? 'tourner' : 'répéter'} à la place de … ?`,
      reponse: angle ? `${360 / n}^\\circ` : String(n),
      figure: F.scriptScratch([varb('stylo', 'stylo en position d’écriture'), { c: 'ctl', t: `répéter (${angle ? n : '…'}) fois`, dans: [varb('mvt', `avancer de (${c}) pas`), varb('mvt', `tourner ↻ de (${angle ? '…' : 360 / n}) degrés`)] }]),
    }
  }),
  exoObjectif(PI, 4, '3e-obj-programme-calcul', 'Écrire le calcul', () => {
    const a = ent(2, 5), b = ent(1, 9)
    const [dit, calcul] = choix<[string, string]>([
      [`le ${a === 2 ? 'double' : a === 3 ? 'triple' : `produit par $${a}$`} du nombre choisi, plus $${b}$`, `${a} \\times \\text{réponse} + ${b}`],
      [`le ${a === 2 ? 'double' : a === 3 ? 'triple' : `produit par $${a}$`} du nombre choisi, moins $${b}$`, `${a} \\times \\text{réponse} - ${b}`],
      [`le nombre choisi augmenté de $${b}$, puis multiplié par $${a}$`, `(\\text{réponse} + ${b}) \\times ${a}`],
      ['le carré du nombre choisi', '\\text{réponse} \\times \\text{réponse}'],
    ])
    return { enonce: `Le lutin doit dire ${dit}. Que faut-il écrire à la place de … ?`, reponse: calcul, figure: F.scriptScratch([varb('cap', 'demander (Choisis un nombre) et attendre'), varb('app', 'dire (…)')]) }
  }),
  exoObjectif(PI, 4, '3e-obj-corriger-angle', 'Corriger un programme', () => {
    const [n, nom] = choix(POLYGONES.filter(([m]) => m !== 4)), c = choix([40, 50, 60, 80]), faux = 180 - 360 / n
    return {
      enonce: `Ce script doit tracer ${nom}, mais il tourne de $${faux}^\\circ$. Quel angle faut-il mettre à la place ?`,
      reponse: `${360 / n}^\\circ`,
      figure: F.scriptScratch([varb('stylo', 'stylo en position d’écriture'), { c: 'ctl', t: `répéter (${n}) fois`, dans: [varb('mvt', `avancer de (${c}) pas`), varb('mvt', `tourner ↻ de (${faux}) degrés`)] }]),
    }
  }),
  exoObjectif(PI, 4, '3e-obj-combien-repetitions', 'Le nombre de répétitions', () => {
    const v = choix(NOMS), d = choix([0, 0, 10, 20]), p = choix([2, 4, 5, 10, 25]), k = ent(4, 20)
    return { enonce: `Pour que $${v}$ vaille $${d + k * p}$ à la fin, combien de fois faut-il répéter ?`, reponse: String(k), figure: F.scriptScratch([mettre(v, d), { c: 'ctl', t: 'répéter (…) fois', dans: [ajouter(p, v)] }, dire(v)]) }
  }),
  exoObjectif(PI, 4, '3e-obj-modulo', 'Tester avec modulo', () => {
    const v = choix(NOMS)
    const [m, r, dit, sinon] = choix<[number, number, string, string]>([
      [2, 0, 'pair', 'impair'], [2, 1, 'impair', 'pair'], [3, 0, 'multiple de 3', 'pas multiple de 3'],
      [5, 0, 'multiple de 5', 'pas multiple de 5'], [10, 0, 'finit par 0', 'ne finit pas par 0'],
    ])
    return {
      enonce: `Le lutin doit dire « ${dit} » quand c'est vrai pour $${v}$. Que faut-il écrire à la place de … ?`,
      reponse: String(r),
      figure: F.scriptScratch([{ c: 'ctl', t: `si ⟨${v} modulo ${m} = …⟩ alors`, dans: [varb('app', `dire (${dit})`)], sinon: [varb('app', `dire (${sinon})`)] }]),
    }
  }),
]

// ---------- Les questions de cours ----------
export const COURS_3E_OBJECTIFS_INFORMATIQUE: QuestionCours[] = [
  // OBJ1
  notion(PI, 200, 0, 'Une variable', () => phraseATrou('une variable porte un [nom] et contient une [valeur].')),
  notion(PI, 201, 0, 'Changer la valeur d’une variable', () => phraseATrou('quand on donne une [nouvelle] valeur à une variable, l\'ancienne valeur est [effacée].')),
  // OBJ3
  notion(PI, 202, 2, 'Répéter jusqu’à', () => phraseATrou('la boucle « répéter jusqu\'à » répète les [instructions] tant que la condition est [fausse].')),
  notion(PI, 203, 2, 'Quand utiliser « répéter jusqu’à »', () => phraseATrou('on utilise « répéter jusqu\'à » quand on ne connaît pas à l\'[avance] le [nombre de répétitions].')),
  // OBJ5
  notion(PI, 204, 4, 'L’angle d’un polygone régulier', () => { const n = choix(['n', 'k', 'p']); return [`Compléter : pour tracer un polygone régulier à $${n}$ côtés, le lutin tourne à chaque fois de … degrés.`, `$360 \\div ${n}$`] }),
]
