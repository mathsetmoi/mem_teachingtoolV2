// =============================================================
// LES OBJECTIFS D'APPRENTISSAGE DE 3e : PROPORTIONNALITÉ ET FONCTIONS
// Revus par le professeur le 22 novembre 2026, objectif par objectif,
// comme ceux des thèmes précédents (troisieme-objectifs.ts donne les
// outils exoObjectif, notion et phraseATrou).
// - Proportionnalité OBJ2 (représentation graphique et Thalès) est en
//   suspens, à sa demande : sa ligne reste grise.
// - Fonctions OBJ3 (fonctions linéaires) met l'accent sur les nombres
//   négatifs et sur le graphique, pour ne pas répéter Proportionnalité
//   OBJ3 ; le recoupement avec Fonctions OBJ5 reste à revoir (« on
//   verra »).
// - Pas de calculatrice : des pourcentages et des coefficients simples,
//   des solutions entières lues sur des droites quadrillées.
// =============================================================
import * as F from '../figures'
import type { Automatisme, QuestionCours } from './outils'
import { choix, ent, mot, nb, tableau } from './outils'
import { exoObjectif, notion, phraseATrou } from './troisieme-objectifs'

const PO = 'Proportionnalité', FO = 'Fonctions'
const NOMS = ['f', 'g', 'h']

/** ax + b en LaTeX : 2x + 3, -x, 0{,}5x - 1, 4 */
function affine(a: number, b: number) {
  const ax = a === 0 ? '' : a === 1 ? 'x' : a === -1 ? '-x' : `${nb(a)}x`
  if (!ax) return nb(b)
  return b === 0 ? ax : `${ax} ${b < 0 ? '-' : '+'} ${nb(Math.abs(b))}`
}
const nonNul = (a: number, b: number) => { let x: number; do { x = ent(a, b) } while (x === 0); return x }
const pourcent = (x: number) => `${nb(x)}\\,\\%`
const SIGNES: [string, (x: number, y: number) => boolean][] = [['\\geqslant', (x, y) => x >= y], ['\\leqslant', (x, y) => x <= y], ['>', (x, y) => x > y], ['<', (x, y) => x < y]]
/** Le contraire d'un signe d'inégalité (quand on divise par un négatif) */
const RETOURNE: Record<string, string> = { '\\geqslant': '\\leqslant', '\\leqslant': '\\geqslant', '>': '<', '<': '>' }

/** Des nœuds de courbe (x de −3 à 3) et une valeur k atteinte seulement en
 *  des nœuds : on lit ses antécédents sans ambiguïté */
function courbeAvecValeur() {
  for (;;) {
    const ys = [ent(-3, 3)]
    for (let i = 1; i < 7; i++) ys.push(Math.max(-4, Math.min(5, ys[i - 1] + choix([-2, -1, 1, 2]))))
    if (ys.some((y, i) => i && y === ys[i - 1])) continue
    const k = choix(ys)
    if (ys.some((y, i) => i && Math.min(y, ys[i - 1]) < k && k < Math.max(y, ys[i - 1]))) continue
    const noeuds = ys.map((y, i) => ({ x: i - 3, y }))
    return { noeuds, k, ante: noeuds.filter(q => q.y === k).map(q => q.x) }
  }
}
const etOu = (t: number[]) => (t.length === 1 ? `$${nb(t[0])}$` : `${t.slice(0, -1).map(x => `$${nb(x)}$`).join(', ')} et $${nb(t[t.length - 1])}$`)

/** Une droite entière y = a x + b qui traverse bien le carré [−5, 5]² */
function droiteEntiere(a: number) {
  for (;;) {
    const b = ent(-4, 4), x0 = ent(-4, 4), k = a * x0 + b
    if (Math.abs(k) <= 5) return { b, x0, k }
  }
}

export const AUTOMATISMES_3E_OBJECTIFS_FONCTIONS: Automatisme[] = [
  // ================= PROPORTIONNALITÉ · OBJ1 : augmentations et diminutions en pourcentages =================
  ...([1, -1] as const).map(sens => exoObjectif(PO, 0, sens > 0 ? '3e-obj-hausse-prix' : '3e-obj-baisse-prix', sens > 0 ? 'Appliquer une hausse' : 'Appliquer une baisse', () => {
    for (;;) {
      const P = choix([20, 30, 40, 50, 60, 80, 120, 150, 200, 250]), t = choix([5, 10, 15, 20, 25, 30, 40, 50])
      const N = P * (100 + sens * t) / 100
      if (N !== Math.round(N)) continue
      return { enonce: `Un prix de $${P}$ € ${sens > 0 ? 'augmente' : 'baisse'} de $${pourcent(t)}$. Quel est le nouveau prix ?`, reponse: `${nb(N)}\\text{ €}` }
    }
  })),
  ...([1, -1] as const).map(sens => exoObjectif(PO, 0, sens > 0 ? '3e-obj-coefficient-hausse' : '3e-obj-coefficient-baisse', sens > 0 ? 'Le coefficient d’une hausse' : 'Le coefficient d’une baisse', () => {
    const t = ent(1, 60)
    return { enonce: `Par quel nombre faut-il multiplier pour ${sens > 0 ? 'augmenter' : 'diminuer'} de $${pourcent(t)}$ ?`, reponse: nb((100 + sens * t) / 100) }
  })),
  exoObjectif(PO, 0, '3e-obj-coefficient-evolution', 'Du coefficient à l’évolution', () => {
    const t = ent(1, 60), sens = choix([1, -1]), k = (100 + sens * t) / 100
    return { enonce: `Multiplier un prix par $${nb(k)}$, à quelle évolution cela correspond-il ?`, reponse: mot(`une ${sens > 0 ? 'augmentation' : 'baisse'} de $${pourcent(t)}$`) }
  }),
  exoObjectif(PO, 0, '3e-obj-pourcentage-evolution', 'Le pourcentage d’une évolution', () => {
    for (;;) {
      const a = choix([20, 25, 40, 50, 60, 80, 120, 200]), t = choix([5, 10, 20, 25, 50, 75]), sens = choix([1, -1]), b = a * (100 + sens * t) / 100
      if (b !== Math.round(b)) continue
      return { enonce: `Un prix passe de $${a}$ € à $${nb(b)}$ €. Quel est le pourcentage ${sens > 0 ? 'd\'augmentation' : 'de baisse'} ?`, reponse: pourcent(t) }
    }
  }),
  exoObjectif(PO, 0, '3e-obj-prix-initial', 'Le prix avant l’évolution', () => {
    for (;;) {
      const P0 = choix([20, 30, 40, 50, 60, 80, 100, 120, 200]), t = choix([10, 20, 25, 50]), sens = choix([1, -1]), P1 = P0 * (100 + sens * t) / 100
      if (P1 !== Math.round(P1)) continue
      return { enonce: `Après une ${sens > 0 ? 'hausse' : 'baisse'} de $${pourcent(t)}$, un objet coûte $${nb(P1)}$ €. Quel était son prix avant ?`, reponse: `${P0}\\text{ €}` }
    }
  }),
  exoObjectif(PO, 0, '3e-obj-evolutions-successives', 'Deux évolutions successives', () => {
    const [t1, t2] = choix<[number, number]>([[10, 10], [20, 20], [10, -10], [50, -50], [20, -20], [-10, -10], [50, 50], [-20, -20], [25, -20]])
    const k = (100 + t1) * (100 + t2) / 10000, e = Math.round((k - 1) * 100)
    const dire = (t: number) => `une ${t > 0 ? 'hausse' : 'baisse'} de $${pourcent(Math.abs(t))}$`
    return { enonce: `Un prix subit ${dire(t1)}, puis ${dire(t2)}. Par combien est-il multiplié en tout ?`, reponse: mot(`par $${nb(k)}$, soit ${e === 0 ? 'aucune évolution' : dire(e)}`) }
  }),

  // ================= PROPORTIONNALITÉ · OBJ2 : en suspens (choix du professeur) =================

  // ================= PROPORTIONNALITÉ · OBJ3 : les fonctions linéaires =================
  exoObjectif(PO, 2, '3e-obj-lineaire-image', 'L’image par une fonction linéaire', () => {
    const f = choix(NOMS), a = ent(2, 9), x = ent(2, 9)
    return { enonce: `$${f}(x) = ${a}x$. Quelle est l'image de $${x}$ ?`, reponse: String(a * x) }
  }),
  exoObjectif(PO, 2, '3e-obj-lineaire-antecedent', 'L’antécédent par une fonction linéaire', () => {
    const f = choix(NOMS), a = ent(2, 9), x = ent(2, 9)
    return { enonce: `$${f}(x) = ${a}x$. Quel est l'antécédent de $${a * x}$ ?`, reponse: String(x) }
  }),
  exoObjectif(PO, 2, '3e-obj-lineaire-prix', 'Un prix proportionnel', () => {
    const [objet, u] = choix([['des pommes', 'kg'], ['du fromage', 'kg'], ['du tissu', 'm'], ['de l\'essence', 'L']])
    const p = choix([1.5, 2, 2.5, 3, 4, 1.2, 0.5]), m = choix([2, 3, 4, 5, 6, 10])
    const debut = `Le prix ${objet} est de $${nb(p)}$ € le ${u === 'L' ? 'litre' : u === 'm' ? 'mètre' : 'kilo'}. Le prix $p$ est une fonction linéaire de la quantité $x$.`
    return choix([
      { enonce: `${debut} Quel est le prix de $${m}$ ${u} ?`, reponse: `${nb(p * m)}\\text{ €}` },
      { enonce: `${debut} Quelle est l'expression de $p(x)$ ?`, reponse: `p(x) = ${affine(p, 0)}` },
    ])
  }),
  exoObjectif(PO, 2, '3e-obj-lineaire-coefficient', 'Retrouver la fonction linéaire', () => {
    for (;;) {
      const f = choix(NOMS), a = choix([1.5, 2.5, 3, 4, 0.5, 1.2, 2, 5, 0.8]), n = choix([2, 4, 5, 10]), m = a * n
      if (m !== Math.round(m)) continue
      return { enonce: `$${f}$ est une fonction linéaire et $${f}(${n}) = ${nb(m)}$. Quelle est l'expression de $${f}$ ?`, reponse: `${f}(x) = ${affine(a, 0)}` }
    }
  }),
  exoObjectif(PO, 2, '3e-obj-lineaire-pourcentage', 'Un pourcentage comme fonction linéaire', () => {
    const t = choix([5, 10, 15, 20, 25, 30, 40, 50, 75])
    const [quoi, k] = choix<[string, number]>([[`de prendre $${pourcent(t)}$ d'un nombre`, t / 100], [`d'augmenter un nombre de $${pourcent(t)}$`, 1 + t / 100], [`de diminuer un nombre de $${pourcent(t)}$`, 1 - t / 100]])
    return { enonce: `Quelle fonction linéaire permet ${quoi} ?`, reponse: `x \\mapsto ${affine(k, 0)}` }
  }),
  exoObjectif(PO, 2, '3e-obj-lineaire-tableau', 'Le tableau d’une fonction linéaire', () => {
    const f = choix(NOMS), a = ent(2, 9), xs = [...new Set([...Array(4)].map(() => ent(1, 12)))].sort((p, q) => p - q)
    if (xs.length < 3) xs.push(xs[xs.length - 1] + 1)
    const k = ent(1, xs.length - 1), ligneX = Math.random() < 0.5
    const l1 = ['x', ...xs.map((x, i) => (ligneX && i === k ? '\\ldots' : String(x)))], l2 = [`${f}(x)`, ...xs.map((x, i) => (!ligneX && i === k ? '\\ldots' : String(a * x)))]
    return { enonce: `$${f}$ est une fonction linéaire. Compléter la case manquante : $${tableau(l1, l2)}$`, reponse: String(ligneX ? xs[k] : a * xs[k]) }
  }),
  exoObjectif(PO, 2, '3e-obj-lineaire-multiple', 'Multiplier l’antécédent', () => {
    const f = choix(NOMS), a = ent(2, 6), n = ent(2, 5), k = ent(2, 4)
    return { enonce: `$${f}$ est une fonction linéaire et $${f}(${n}) = ${a * n}$. Que vaut $${f}(${k * n})$ ?`, reponse: String(a * k * n) }
  }),

  // ================= FONCTIONS · OBJ1 : les différentes représentations =================
  exoObjectif(FO, 0, '3e-obj-fonction-expression', 'Calculer une image avec l’expression', () => {
    const f = choix(NOMS), a = nonNul(-5, 5), b = nonNul(-9, 9), n = nonNul(-5, 5)
    return { enonce: `$${f}(x) = ${affine(a, b)}$. Calculer $${f}(${n})$.`, reponse: String(a * n + b) }
  }),
  exoObjectif(FO, 0, '3e-obj-fonction-tableau', 'Lire un tableau de valeurs', () => {
    for (;;) {
      const f = choix(NOMS), xs = [-2, -1, 0, 1, 2, 3], ys = xs.map(() => ent(-6, 9))
      if (new Set(ys).size < ys.length) continue
      const i = ent(0, 5), t = tableau(['x', ...xs.map(String)], [`${f}(x)`, ...ys.map(String)])
      return choix([
        { enonce: `Voici un tableau de valeurs de la fonction $${f}$. Quelle est l'image de $${xs[i]}$ ? $\\quad ${t}$`, reponse: String(ys[i]) },
        { enonce: `Voici un tableau de valeurs de la fonction $${f}$. Quel est l'antécédent de $${ys[i]}$ dans ce tableau ? $\\quad ${t}$`, reponse: String(xs[i]) },
      ])
    }
  }),
  exoObjectif(FO, 0, '3e-obj-fonction-courbe-image', 'Lire une image sur la courbe', () => {
    const { noeuds } = courbeAvecValeur(), f = choix(NOMS), q = choix(noeuds)
    return { enonce: `Voici la courbe de la fonction $${f}$. Lire l'image de $${q.x}$.`, reponse: String(q.y), figure: F.courbeFonction(noeuds, f) }
  }),
  exoObjectif(FO, 0, '3e-obj-fonction-courbe-antecedents', 'Lire des antécédents sur la courbe', () => {
    const { noeuds, k, ante } = courbeAvecValeur(), f = choix(NOMS)
    return { enonce: `Voici la courbe de la fonction $${f}$. Lire le ou les antécédents de $${k}$.`, reponse: mot(etOu(ante)), figure: F.courbeFonction(noeuds, f) }
  }),
  exoObjectif(FO, 0, '3e-obj-fonction-completer-tableau', 'De l’expression au tableau', () => {
    const f = choix(NOMS), c = ent(-5, 5), a = nonNul(-3, 3)
    const [expr, val] = choix<[string, (x: number) => number]>([[`x^2 ${c < 0 ? '-' : '+'} ${Math.abs(c)}`, x => x * x + c], [affine(a, c), x => a * x + c], [`${Math.abs(a) + 1}x^2`, x => (Math.abs(a) + 1) * x * x]])
    const xs = [-2, -1, 0, 1, 2], k = ent(0, 4)
    const t = tableau(['x', ...xs.map(String)], [`${f}(x)`, ...xs.map((x, i) => (i === k ? '\\ldots' : String(val(x))))])
    return { enonce: `$${f}(x) = ${expr.replace(/ \+ 0$/, '')}$. Compléter le tableau de valeurs : $${t}$`, reponse: String(val(xs[k])) }
  }),
  exoObjectif(FO, 0, '3e-obj-fonction-point-courbe', 'Un point de la courbe', () => {
    const f = choix(NOMS), a = nonNul(-4, 4), b = nonNul(-6, 6), n = nonNul(-5, 5)
    return { enonce: `Quelle est l'ordonnée du point d'abscisse $${n}$ de la courbe de $${f}(x) = ${affine(a, b)}$ ?`, reponse: String(a * n + b) }
  }),
  exoObjectif(FO, 0, '3e-obj-fonction-programme', 'Du programme de calcul à l’expression', () => {
    const a = ent(2, 9), b = ent(1, 9), f = choix(NOMS)
    return choix([
      { enonce: `Programme : « Choisir un nombre, le multiplier par $${a}$, puis ajouter $${b}$. » Quelle est l'expression de la fonction $${f}$ qui donne le résultat ?`, reponse: `${f}(x) = ${a}x + ${b}` },
      { enonce: `Programme : « Choisir un nombre, lui ajouter $${b}$, puis multiplier par $${a}$. » Quelle est l'expression de la fonction $${f}$ qui donne le résultat ?`, reponse: `${f}(x) = ${a}(x + ${b})` },
      { enonce: `Programme : « Choisir un nombre, le multiplier par $${a}$, puis soustraire $${b}$. » Quelle est l'expression de la fonction $${f}$ qui donne le résultat ?`, reponse: `${f}(x) = ${a}x - ${b}` },
    ])
  }),

  // ================= FONCTIONS · OBJ2 : image et antécédents =================
  exoObjectif(FO, 1, '3e-obj-vocabulaire-image', 'Lire une image', () => {
    const f = choix(NOMS), a = ent(-9, 9), b = ent(-9, 9)
    return { enonce: `On sait que $${f}(${a}) = ${b}$. Quelle est l'image de $${a}$ par $${f}$ ?`, reponse: String(b) }
  }),
  exoObjectif(FO, 1, '3e-obj-vocabulaire-antecedent', 'Lire un antécédent', () => {
    const f = choix(NOMS), a = ent(-9, 9), b = ent(-9, 9)
    return { enonce: `On sait que $${f}(${a}) = ${b}$. Donner un antécédent de $${b}$ par $${f}$.`, reponse: String(a) }
  }),
  exoObjectif(FO, 1, '3e-obj-traduire-image', 'Traduire une image par une égalité', () => {
    const f = choix(NOMS), a = ent(-9, 9), b = ent(-9, 9)
    return { enonce: `Traduire par une égalité : « l'image de $${a}$ par $${f}$ est $${b}$ ».`, reponse: `${f}(${a}) = ${b}` }
  }),
  exoObjectif(FO, 1, '3e-obj-traduire-antecedent', 'Traduire un antécédent par une égalité', () => {
    const f = choix(NOMS), a = ent(-9, 9), b = ent(-9, 9)
    return { enonce: `Traduire par une égalité : « $${a}$ est un antécédent de $${b}$ par $${f}$ ».`, reponse: `${f}(${a}) = ${b}` }
  }),
  exoObjectif(FO, 1, '3e-obj-antecedents-carre', 'Les antécédents par la fonction carré', () => {
    const f = choix(NOMS), k = choix([1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 0, -1])
    const n = k <= 0 ? (k === 0 ? 0 : -choix([1, 4, 9, 16])) : k * k
    return { enonce: `$${f}(x) = x^2$. Quels sont les antécédents de $${n}$ ?`, reponse: mot(n < 0 ? 'aucun : un carré n\'est jamais négatif' : n === 0 ? 'un seul : $0$' : `$-${k}$ et $${k}$`) }
  }),
  exoObjectif(FO, 1, '3e-obj-antecedent-affine', 'Quel nombre a pour image… ?', () => {
    const f = choix(NOMS), a = nonNul(-5, 5), b = nonNul(-9, 9), x = nonNul(-6, 6)
    return { enonce: `$${f}(x) = ${affine(a, b)}$. Quel nombre a pour image $${a * x + b}$ ?`, reponse: String(x) }
  }),

  // ================= FONCTIONS · OBJ3 : les fonctions linéaires (négatifs et graphique) =================
  exoObjectif(FO, 2, '3e-obj-lineaire-lire-coefficient', 'Le coefficient d’une fonction linéaire', () => {
    const f = choix(NOMS), a = choix([-4, -3, -2, -1, 0.5, -0.5, 1.5, -1.5, -0.2, 3])
    return { enonce: `Quel est le coefficient de la fonction linéaire $${f}(x) = ${affine(a, 0)}$ ?`, reponse: nb(a) }
  }),
  exoObjectif(FO, 2, '3e-obj-lineaire-negatif', 'Une image avec des négatifs', () => {
    const f = choix(NOMS), a = nonNul(-6, -1), n = nonNul(-6, 6)
    return { enonce: `$${f}(x) = ${affine(a, 0)}$. Calculer $${f}(${n})$.`, reponse: String(a * n) }
  }),
  exoObjectif(FO, 2, '3e-obj-lineaire-retrouver-negatif', 'Retrouver la fonction linéaire (négatifs)', () => {
    const f = choix(NOMS), a = nonNul(-6, 6), n = nonNul(-5, 5)
    if (a * n > 0 && Math.random() < 0.7) { const m = -a; return { enonce: `$${f}$ est une fonction linéaire et $${f}(${n}) = ${m * n}$. Quelle est l'expression de $${f}$ ?`, reponse: `${f}(x) = ${affine(m, 0)}` } }
    return { enonce: `$${f}$ est une fonction linéaire et $${f}(${n}) = ${a * n}$. Quelle est l'expression de $${f}$ ?`, reponse: `${f}(x) = ${affine(a, 0)}` }
  }),
  exoObjectif(FO, 2, '3e-obj-lineaire-lire-droite', 'Lire une fonction linéaire sur sa droite', () => {
    const f = choix(NOMS), a = choix([1, 2, 3, -1, -2, -3, 0.5, -0.5, 1.5, -1.5])
    return { enonce: `La droite $(d)$ représente une fonction linéaire $${f}$. Quelle est l'expression de $${f}$ ?`, reponse: `${f}(x) = ${affine(a, 0)}`, figure: F.droitesRepere([{ m: a, p: 0, nom: '(d)' }]) }
  }),
  exoObjectif(FO, 2, '3e-obj-lineaire-ordonnee', 'Un point de la droite', () => {
    const f = choix(NOMS), a = choix([0.5, -0.5, 2, -2, 3, -3, -1.5]), n = nonNul(-4, 4) * 2
    return { enonce: `Quelle est l'ordonnée du point d'abscisse $${n}$ de la droite qui représente $${f}(x) = ${affine(a, 0)}$ ?`, reponse: nb(a * n) }
  }),

  // ================= FONCTIONS · OBJ4 : résoudre graphiquement =================
  exoObjectif(FO, 3, '3e-obj-graphique-lineaire', 'Résoudre graphiquement ax = k', () => {
    const a = choix([1, 2, -1, -2]), x0 = ent(-2, 2) || 2, f = choix(NOMS)
    return { enonce: `La droite représente $${f}(x) = ${affine(a, 0)}$. Résoudre graphiquement $${affine(a, 0)} = ${a * x0}$.`, reponse: `x = ${x0}`, figure: F.droitesRepere([{ m: a, p: 0, nom: f }]) }
  }),
  exoObjectif(FO, 3, '3e-obj-graphique-egalite', 'Résoudre graphiquement f(x) = k', () => {
    const a = choix([1, 2, -1, -2, 0.5, -0.5]), f = choix(NOMS)
    for (;;) {
      const { b, x0, k } = droiteEntiere(a)
      if (k !== Math.round(k)) continue
      return { enonce: `La droite représente une fonction $${f}$. Résoudre graphiquement $${f}(x) = ${k}$.`, reponse: `x = ${x0}`, figure: F.droitesRepere([{ m: a, p: b, nom: f }]) }
    }
  }),
  ...([false, true] as const).map(zero => exoObjectif(FO, 3, zero ? '3e-obj-graphique-signe' : '3e-obj-graphique-inequation', zero ? 'Résoudre graphiquement f(x) < 0' : 'Résoudre graphiquement une inéquation', () => {
    const a = choix([1, 2, -1, -2]), f = choix(NOMS)
    for (;;) {
      const { b, x0, k } = droiteEntiere(a)
      if (zero && k !== 0) continue
      const [s] = choix(SIGNES), sol = a > 0 ? s : RETOURNE[s]
      return { enonce: `La droite représente une fonction $${f}$. Résoudre graphiquement $${f}(x) ${s} ${k}$.`, reponse: `x ${sol} ${x0}`, figure: F.droitesRepere([{ m: a, p: b, nom: f }]) }
    }
  })),
  ...([false, true] as const).map(ineg => exoObjectif(FO, 3, ineg ? '3e-obj-graphique-deux-droites-ineq' : '3e-obj-graphique-deux-droites', ineg ? 'Résoudre graphiquement f(x) > g(x)' : 'Résoudre graphiquement f(x) = g(x)', () => {
    for (;;) {
      const x0 = ent(-3, 3), y0 = ent(-3, 3), a1 = choix([1, 2, -1, -2, 0]), a2 = choix([1, 2, -1, -2, 0])
      if (a1 === a2) continue
      const b1 = y0 - a1 * x0, b2 = y0 - a2 * x0
      if (Math.abs(b1) > 6 || Math.abs(b2) > 6) continue
      const fig = F.droitesRepere([{ m: a1, p: b1, nom: 'f' }, { m: a2, p: b2, nom: 'g' }])
      if (!ineg) return { enonce: 'Les droites représentent deux fonctions $f$ et $g$. Résoudre graphiquement $f(x) = g(x)$.', reponse: `x = ${x0}`, figure: fig }
      const [s] = choix(SIGNES), sol = a1 > a2 ? s : RETOURNE[s]
      return { enonce: `Les droites représentent deux fonctions $f$ et $g$. Résoudre graphiquement $f(x) ${s} g(x)$.`, reponse: `x ${sol} ${x0}`, figure: fig }
    }
  })),
  exoObjectif(FO, 3, '3e-obj-graphique-quelle-droite', 'Quelle droite tracer ?', () => {
    const f = choix(NOMS), k = nonNul(-5, 9)
    return { enonce: `La courbe de $${f}$ est tracée. Pour résoudre graphiquement $${f}(x) = ${k}$, quelle droite faut-il tracer ?`, reponse: mot(`la droite horizontale d'équation $y = ${k}$`) }
  }),

  // ================= FONCTIONS · OBJ5 : fonctions linéaires et proportionnalité =================
  exoObjectif(FO, 4, '3e-obj-tableau-vers-lineaire', 'Du tableau de proportionnalité à la fonction', () => {
    const f = choix(NOMS), a = choix([2, 3, 4, 5, 6, 7, 8, 9, 1.5, 2.5]), xs = [...new Set([...Array(3)].map(() => ent(1, 6) * 2))].sort((p, q) => p - q)
    return { enonce: `Ce tableau est un tableau de proportionnalité : $${tableau(['x', ...xs.map(String)], ['y', ...xs.map(x => nb(a * x))])}$. Quelle fonction linéaire $${f}$ lui correspond ?`, reponse: `${f}(x) = ${affine(a, 0)}` }
  }),
  exoObjectif(FO, 4, '3e-obj-coefficient-proportionnalite', 'Le coefficient de proportionnalité', () => {
    const f = choix(NOMS), a = choix([1.5, 2.5, 0.5, 1.2, 0.8, 3, 4, 7, 0.3])
    return { enonce: `$${f}(x) = ${affine(a, 0)}$. Quel est le coefficient de proportionnalité entre $x$ et $${f}(x)$ ?`, reponse: nb(a) }
  }),
  exoObjectif(FO, 4, '3e-obj-situation-lineaire', 'Une situation de proportionnalité', () => {
    const [debut, unite, lettre] = choix([['Un taxi coûte', 'par kilomètre', 'x kilomètres'], ['Une place de concert coûte', 'l\'unité', 'x places'], ['Le jus de pomme coûte', 'le litre', 'x litres'], ['Une heure de location de vélo coûte', 'l\'heure', 'x heures']])
    const p = choix([2, 3, 4, 5, 1.5, 2.5, 12, 15])
    return { enonce: `${debut} $${nb(p)}$ € ${unite}. Quelle fonction $p$ donne le prix de $${lettre.replace(' ', '$ ')} ?`, reponse: `p(x) = ${affine(p, 0)}` }
  }),
  exoObjectif(FO, 4, '3e-obj-quatrieme-proportionnelle', 'La quatrième proportionnelle', () => {
    for (;;) {
      const f = choix(NOMS), a = choix([2.5, 1.5, 3, 4, 5, 0.5, 2]), n = choix([2, 4, 6, 8, 10]), n2 = choix([3, 5, 6, 12, 7, 9])
      if (n === n2 || a * n !== Math.round(a * n) || a * n2 !== Math.round(a * n2)) continue
      return { enonce: `$${f}$ est une fonction linéaire et $${f}(${n}) = ${nb(a * n)}$. Que vaut $${f}(${n2})$ ?`, reponse: nb(a * n2) }
    }
  }),
  exoObjectif(FO, 4, '3e-obj-droite-prix-masse', 'Un prix lu par proportionnalité', () => {
    const a = choix([2, 3, 4, 5, 1.5, 2.5]), n = choix([2, 4, 5]), k = choix([3, 6, 8, 10, 12])
    return { enonce: `Une droite passant par l'origine donne le prix (en €) en fonction de la masse (en kg). Elle passe par le point $(${n}\\,;\\,${nb(a * n)})$. Quel est le prix de $${k}$ kg ?`, reponse: `${nb(a * k)}\\text{ €}` }
  }),
  exoObjectif(FO, 4, '3e-obj-vitesse-lineaire', 'Distance et durée', () => {
    const v = choix([40, 50, 60, 80, 90, 100, 120]), t = choix([0.5, 1.5, 2, 2.5, 3])
    const debut = `Un ${v >= 90 ? 'train' : 'car'} roule à la vitesse constante de $${v}$ km/h.`
    return choix([
      { enonce: `${debut} Quelle fonction $d$ donne la distance parcourue (en km) en $t$ heures ?`, reponse: `d(t) = ${v}t` },
      { enonce: `${debut} Quelle distance parcourt-il en $${nb(t)}$ h ?`, reponse: `${nb(v * t)}\\text{ km}` },
    ])
  }),

  // ================= FONCTIONS · OBJ6 : les fonctions affines =================
  exoObjectif(FO, 5, '3e-obj-affine-image', 'L’image par une fonction affine', () => {
    const f = choix(NOMS), a = nonNul(-5, 6), b = nonNul(-9, 9), n = nonNul(-5, 6)
    return { enonce: `$${f}(x) = ${affine(a, b)}$. Quelle est l'image de $${n}$ ?`, reponse: String(a * n + b) }
  }),
  exoObjectif(FO, 5, '3e-obj-affine-antecedent', 'L’antécédent par une fonction affine', () => {
    const f = choix(NOMS), a = nonNul(-5, 6), b = nonNul(-9, 9), x = nonNul(-6, 8)
    return { enonce: `$${f}(x) = ${affine(a, b)}$. Quel est l'antécédent de $${a * x + b}$ ?`, reponse: String(x) }
  }),
  exoObjectif(FO, 5, '3e-obj-affine-coefficients', 'Les nombres a et b', () => {
    const f = choix(NOMS), a = nonNul(-6, 6), b = nonNul(-9, 9), quoi = choix(['a', 'b'])
    return { enonce: `$${f}(x) = ${affine(a, b)}$ s'écrit $ax + b$. Quelle est la valeur de $${quoi}$ ?`, reponse: String(quoi === 'a' ? a : b) }
  }),
  exoObjectif(FO, 5, '3e-obj-affine-desordre', 'Les nombres a et b dans le désordre', () => {
    const f = choix(NOMS), a = choix([-1, -2, -3, 2, 3, -4]), b = ent(1, 9)
    const expr = a < 0 ? `${b} - ${a === -1 ? '' : -a}x` : `${b} + ${a}x`
    return { enonce: `$${f}(x) = ${expr}$ s'écrit $ax + b$. Quels sont $a$ et $b$ ?`, reponse: mot(`$a = ${a}$ et $b = ${b}$`) }
  }),
  exoObjectif(FO, 5, '3e-obj-affine-abonnement', 'Un abonnement', () => {
    const [chose, seance] = choix([['à la piscine', 'séance'], ['au cinéma', 'place'], ['à la salle de sport', 'séance'], ['à la médiathèque', 'location de film']])
    const b = choix([10, 15, 20, 25, 30]), a = choix([2, 3, 4, 5, 1.5, 2.5]), n = ent(3, 12)
    const debut = `Un abonnement ${chose} coûte $${b}$ €, puis $${nb(a)}$ € par ${seance}.`
    return choix([
      { enonce: `${debut} Quelle fonction $p$ donne le prix payé pour $x$ ${seance}s ?`.replace('location de films', 'locations de film'), reponse: `p(x) = ${affine(a, b)}` },
      { enonce: `${debut} Combien coûtent $${n}$ ${seance}s ?`.replace('location de films', 'locations de film'), reponse: `${nb(a * n + b)}\\text{ €}` },
    ])
  }),
  exoObjectif(FO, 5, '3e-obj-affine-deux-valeurs', 'Retrouver une fonction affine', () => {
    const f = choix(NOMS), a = nonNul(-4, 5), b = nonNul(-6, 8), n = ent(1, 4)
    return { enonce: `$${f}$ est une fonction affine, avec $${f}(0) = ${b}$ et $${f}(${n}) = ${a * n + b}$. Quelle est l'expression de $${f}$ ?`, reponse: `${f}(x) = ${affine(a, b)}` }
  }),

  // ================= FONCTIONS · OBJ7 : les coefficients lus sur le graphique =================
  ...(['b', 'a', 'tout', 'descend'] as const).map(quoi => exoObjectif(FO, 6, `3e-obj-coefficients-graphique-${quoi}`, quoi === 'b' ? 'Lire b sur le graphique' : quoi === 'a' ? 'Lire a sur le graphique' : quoi === 'tout' ? 'Lire l’expression sur le graphique' : 'Lire a quand la droite descend', () => {
    const f = choix(NOMS), a = quoi === 'descend' ? choix([-1, -2, -3]) : quoi === 'a' ? choix([1, 2, 3]) : choix([1, 2, 3, -1, -2]), b = ent(-3, 3)
    const fig = F.droitesRepere([{ m: a, p: b, nom: '(d)' }])
    const debut = `La droite $(d)$ représente la fonction affine $${f}(x) = ax + b$.`
    if (quoi === 'b') return { enonce: `${debut} Lire la valeur de $b$.`, reponse: `b = ${b}`, figure: fig }
    if (quoi === 'tout') return { enonce: `${debut} Quelle est l'expression de $${f}$ ?`, reponse: `${f}(x) = ${affine(a, b)}`, figure: fig }
    return { enonce: `${debut} Lire la valeur de $a$.`, reponse: `a = ${a}`, figure: fig }
  })),
  exoObjectif(FO, 6, '3e-obj-coefficients-horizontale', 'Une droite horizontale', () => {
    const f = choix(NOMS), b = nonNul(-4, 4)
    return { enonce: `La droite $(d)$ représente la fonction affine $${f}(x) = ax + b$. Quels sont $a$ et $b$ ?`, reponse: mot(`$a = 0$ et $b = ${b}$`), figure: F.droitesRepere([{ m: 0, p: b, nom: '(d)' }]) }
  }),
  exoObjectif(FO, 6, '3e-obj-coefficient-deux-points', 'Le nombre a avec deux points', () => {
    const a = nonNul(-4, 4), x1 = ent(-3, 2), x2 = x1 + ent(1, 4), b = ent(-5, 5), y1 = a * x1 + b, y2 = a * x2 + b
    return { enonce: `La droite qui représente une fonction affine passe par $A(${x1}\\,;\\,${y1})$ et $B(${x2}\\,;\\,${y2})$. Calculer $a$.`, reponse: mot(`$a = \\frac{${y2} - ${y1 < 0 ? `(${y1})` : y1}}{${x2} - ${x1 < 0 ? `(${x1})` : x1}} = ${a}$`) }
  }),

  // ================= FONCTIONS · OBJ8 : la fonction carré =================
  exoObjectif(FO, 7, '3e-obj-carre-tableau', 'Le tableau de la fonction carré', () => {
    const xs = [-3, -2, -1, 0, 1, 2, 3], k = choix([0, 1, 2, 4, 5, 6])
    const t = tableau(['x', ...xs.map(String)], ['x^2', ...xs.map((x, i) => (i === k ? '\\ldots' : String(x * x)))])
    return { enonce: `Compléter le tableau de valeurs de la fonction carré : $${t}$`, reponse: String(xs[k] ** 2) }
  }),
  exoObjectif(FO, 7, '3e-obj-carre-decimal', 'Le carré d’un décimal', () => {
    const f = choix(NOMS), x = choix([-1.5, 0.5, -0.5, 1.5, 2.5, -2.5, 0.1, -0.3, 1.2, -0.2, 0.4])
    return { enonce: `$${f}(x) = x^2$. Calculer l'image de $${nb(x)}$.`, reponse: nb(x * x) }
  }),
  exoObjectif(FO, 7, '3e-obj-carre-courbe-antecedents', 'Les antécédents lus sur la parabole', () => {
    const k = choix([1, 4, 9])
    return { enonce: `Voici la courbe de la fonction carré et la droite d'équation $y = ${k}$. Lire les antécédents de $${k}$.`, reponse: mot(`$-${Math.sqrt(k)}$ et $${Math.sqrt(k)}$`), figure: F.paraboleEtDroite(k) }
  }),
  exoObjectif(FO, 7, '3e-obj-carre-ordonnee', 'Un point de la parabole', () => {
    const n = nonNul(-9, 9)
    return { enonce: `Quelle est l'ordonnée du point d'abscisse $${n}$ de la courbe de la fonction carré ?`, reponse: String(n * n) }
  }),
  exoObjectif(FO, 7, '3e-obj-carre-proprietes', 'La parabole', () => choix([
    { enonce: 'Voici la courbe de la fonction carré. Quel est son point le plus bas ?', reponse: mot('l\'origine du repère, $O(0\\,;\\,0)$'), figure: F.paraboleEtDroite(null) },
    { enonce: 'Voici la courbe de la fonction carré. Par rapport à quelle droite est-elle symétrique ?', reponse: mot('l\'axe des ordonnées'), figure: F.paraboleEtDroite(null) },
    { enonce: 'Voici la courbe de la fonction carré. Comment s\'appelle cette courbe ?', reponse: mot('une parabole'), figure: F.paraboleEtDroite(null) },
  ])),
]

// ---------- Les questions de cours ----------
export const COURS_3E_OBJECTIFS_FONCTIONS: QuestionCours[] = [
  // Proportionnalité · OBJ1
  notion(PO, 200, 0, 'Le coefficient d’une hausse', () => { const t = choix(['t', 'p', 'n']); return [`Compléter : augmenter de $${t}\\,\\%$ revient à multiplier par …`, `$1 + \\frac{${t}}{100}$`] }),
  notion(PO, 201, 0, 'Le coefficient d’une baisse', () => { const t = choix(['t', 'p', 'n']); return [`Compléter : diminuer de $${t}\\,\\%$ revient à multiplier par …`, `$1 - \\frac{${t}}{100}$`] }),
  // Proportionnalité · OBJ3
  notion(PO, 202, 2, 'L’écriture d’une fonction linéaire', () => { const f = choix(NOMS); return [`Compléter : une fonction linéaire s'écrit $${f}(x) = \\ldots$`, '$ax$'] }),
  notion(PO, 203, 2, 'Fonction linéaire et proportionnalité', () => phraseATrou('une fonction [linéaire] traduit une situation de [proportionnalité].')),
  notion(PO, 204, 2, 'Le coefficient', () => { const f = choix(NOMS), a = choix(['a', 'k']); return [`Compléter : dans $${f}(x) = ${a}x$, le nombre $${a}$ s'appelle le … de la fonction linéaire.`, 'coefficient'] }),
  // Fonctions · OBJ1
  notion(FO, 200, 0, 'Les représentations d’une fonction', () => phraseATrou('une fonction peut être donnée par une [expression], un [tableau] de valeurs ou une [courbe].')),
  notion(FO, 201, 0, 'Un point de la courbe', () => { const f = choix(NOMS); return [`Compléter : sur la courbe de $${f}$, le point d'abscisse $x$ a pour ordonnée …`, `$${f}(x)$`] }),
  // Fonctions · OBJ2
  notion(FO, 202, 1, 'Image et antécédent', () => phraseATrou('si $f(a) = b$, $b$ est l\'[image] de $a$ et $a$ est un [antécédent] de $b$.')),
  notion(FO, 203, 1, 'Une seule image', () => phraseATrou('par une fonction, un nombre a [une seule] [image].')),
  notion(FO, 204, 1, 'Plusieurs antécédents', () => phraseATrou('par une fonction, un nombre peut avoir [plusieurs] [antécédents].')),
  // Fonctions · OBJ3
  notion(FO, 205, 2, 'La droite d’une fonction linéaire', () => phraseATrou('la représentation graphique d\'une fonction linéaire est une [droite] qui passe par l\'[origine] du repère.')),
  notion(FO, 206, 2, 'L’image de 1', () => { const f = choix(NOMS), a = choix(['a', 'k']); return [`Compléter : si $${f}(x) = ${a}x$, alors $${f}(1) = \\ldots$`, `$${a}$`] }),
  // Fonctions · OBJ4
  notion(FO, 207, 3, 'Résoudre f(x) = k', () => phraseATrou('les solutions de $f(x) = k$ sont les [abscisses] des points de la courbe de $f$ d\'[ordonnée] $k$.')),
  notion(FO, 208, 3, 'Résoudre f(x) = g(x)', () => phraseATrou('les solutions de $f(x) = g(x)$ sont les [abscisses] des points d\'[intersection] des deux courbes.')),
  // Fonctions · OBJ5
  notion(FO, 209, 4, 'Modéliser la proportionnalité', () => phraseATrou('une situation de [proportionnalité] se modélise par une fonction [linéaire].')),
  notion(FO, 210, 4, 'Le coefficient de proportionnalité', () => phraseATrou('le coefficient d\'une fonction [linéaire] est le coefficient de [proportionnalité].')),
  // Fonctions · OBJ6
  notion(FO, 211, 5, 'L’écriture d’une fonction affine', () => { const f = choix(NOMS); return [`Compléter : une fonction affine s'écrit $${f}(x) = \\ldots$`, '$ax + b$'] }),
  notion(FO, 212, 5, 'Les fonctions linéaires', () => phraseATrou('une fonction [linéaire] est une fonction affine dont le nombre $b$ est égal à [$0$].')),
  notion(FO, 213, 5, 'Les fonctions constantes', () => phraseATrou('une fonction [constante] est une fonction affine dont le nombre $a$ est égal à [$0$].')),
  notion(FO, 214, 5, 'Le nombre b', () => { const f = choix(NOMS); return [`Compléter : pour $${f}(x) = ax + b$, le nombre $b$ est l'image de …`, '$0$'] }),
  // Fonctions · OBJ7
  notion(FO, 215, 6, 'L’ordonnée à l’origine', () => phraseATrou('pour $f(x) = ax + b$, le nombre $b$ est l\'[ordonnée] à l\'[origine].')),
  notion(FO, 216, 6, 'Le nombre a', () => { const f = choix(NOMS); return [`Compléter : pour $${f}(x) = ax + b$, quand $x$ augmente de $1$, $${f}(x)$ augmente de …`, '$a$'] }),
  // Fonctions · OBJ8
  notion(FO, 217, 7, 'La parabole', () => phraseATrou('la courbe de la fonction [carré] s\'appelle une [parabole].')),
  notion(FO, 218, 7, 'x et −x', () => phraseATrou('par la fonction carré, $x$ et [$-x$] ont la même [image].')),
  notion(FO, 219, 7, 'Le signe d’un carré', () => phraseATrou('le [carré] d\'un nombre est toujours [positif ou nul].')),
]
