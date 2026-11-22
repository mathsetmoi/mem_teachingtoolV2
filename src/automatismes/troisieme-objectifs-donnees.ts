// =============================================================
// LES OBJECTIFS D'APPRENTISSAGE DE 3e : DONNÉES ET PROBABILITÉS
// Revus par le professeur le 22 novembre 2026, objectif par objectif,
// comme ceux des thèmes précédents (troisieme-objectifs.ts donne les
// outils exoObjectif, notion et phraseATrou).
// - Jamais de question à une chance sur deux : pour comparer deux séries,
//   on demande un écart chiffré, pas « laquelle ».
// - Pas de calculatrice : des effectifs petits, des moyennes qui tombent
//   juste, des probabilités en fractions simples ou en décimaux à un
//   chiffre après la virgule.
// - Le premier quartile est la plus petite valeur telle qu'au moins 25 %
//   des valeurs lui sont inférieures ou égales (rang : le quart de
//   l'effectif, arrondi à l'entier supérieur) ; de même pour le
//   troisième quartile avec 75 %.
// =============================================================
import * as F from '../figures'
import type { Automatisme, QuestionCours } from './outils'
import { choix, ent, irreductible, melange, mot, nb, tableau } from './outils'
import { exoObjectif, notion, phraseATrou } from './troisieme-objectifs'

const ST = 'Statistiques', PB = 'Probabilités'

// ---------- Des séries statistiques au hasard ----------
interface Serie { quoi: string; qui: string; avoir: string; valeurs: number[]; eff: number[]; N: number; ecc: number[] }
/** Une série donnée par un tableau d'effectifs : des notes, des pointures,
 *  le nombre de frères et sœurs ; nMax borne l'effectif total */
function serie(nMax = 40, parite?: 'pair' | 'impair'): Serie {
  for (;;) {
    const [quoi, qui, avoir, valeurs] = choix<[string, string, string, number[]]>([
      ['Note', 'élèves', 'ont une note', (() => { const d = ent(6, 11), p = choix([1, 2]); return [0, 1, 2, 3, 4].map(i => d + i * p) })()],
      ['Pointure', 'élèves', 'chaussent du', (() => { const d = ent(35, 39); return [0, 1, 2, 3, 4].map(i => d + i) })()],
      ['Nombre de frères et sœurs', 'élèves', 'ont', [0, 1, 2, 3, 4]],
      ['Nombre de buts', 'matchs', 'ont un nombre de buts', [0, 1, 2, 3, 4, 5]],
    ])
    const eff = valeurs.map(() => ent(1, 8)), N = eff.reduce((s, x) => s + x, 0)
    if (N > nMax || N < 8) continue
    if (parite && (N % 2 === 0) !== (parite === 'pair')) continue
    const ecc: number[] = []; eff.reduce((s, x, i) => (ecc[i] = s + x), 0)
    return { quoi, qui, avoir, valeurs, eff, N, ecc }
  }
}
/** La valeur de rang k (à partir de 1) dans la série rangée */
const auRang = (s: Serie, k: number) => s.valeurs[s.ecc.findIndex(c => c >= k)]
const tableauSerie = (s: Serie) => tableau([`\\text{${s.quoi}}`, ...s.valeurs.map(nb)], ['\\text{Effectif}', ...s.eff.map(String)])
/** Un tableau à trois lignes : valeur, effectif, effectifs cumulés croissants */
const tableau3 = (l1: string[], l2: string[], l3: string[]) => `\\begin{array}{|l|${'c|'.repeat(l1.length - 1)}}\\hline ${l1.join(' & ')} \\\\ \\hline ${l2.join(' & ')} \\\\ \\hline ${l3.join(' & ')} \\\\ \\hline\\end{array}`
const barres = (s: Serie) => F.diagrammeBarres(s.valeurs.map(String), s.eff, 1)
const rangQ1 = (N: number) => Math.ceil(N / 4), rangQ3 = (N: number) => Math.ceil(3 * N / 4)
const mediane = (s: Serie) => s.N % 2 ? auRang(s, (s.N + 1) / 2) : (auRang(s, s.N / 2) + auRang(s, s.N / 2 + 1)) / 2
const eme = (k: number) => (k === 1 ? '1re' : `${k}e`)
/** « Combien d'élèves », « Combien de matchs » */
const combien = (qui: string) => (/^[aeéiouy]/.test(qui) ? `Combien d'${qui}` : `Combien de ${qui}`)
const pourcent = (x: number) => `${nb(x)}\\,\\%`
/** Un entier avec l'espace des milliers : 12\\,000 */
const milliers = (x: number) => String(x).replace(/\B(?=(\d{3})+$)/g, '\\,')

/** Les cinq valeurs d'une boîte à moustaches, paires, entre 0 et 20 */
function cinqValeurs(): [number, number, number, number, number] {
  for (;;) {
    const v = [ent(0, 10), 0, 0, 0, 0].map(x => x * 2)
    for (let i = 1; i < 5; i++) v[i] = v[i - 1] + 2 * ent(1, 3)
    if (v[4] <= 20) return v as [number, number, number, number, number]
  }
}
const NOMS_BOITE = ['le minimum', 'le premier quartile', 'la médiane', 'le troisième quartile', 'le maximum']

// ---------- Les événements d'un lancer de dé ----------
const EVENEMENTS_DE: [string, number[]][] = [
  ['obtenir un nombre pair', [2, 4, 6]], ['obtenir un nombre impair', [1, 3, 5]], ['obtenir au moins 4', [4, 5, 6]],
  ['obtenir au plus 2', [1, 2]], ['obtenir un multiple de 3', [3, 6]], ['obtenir un nombre premier', [2, 3, 5]],
  ['obtenir 1', [1]], ['obtenir 6', [6]], ['obtenir 5 ou 6', [5, 6]], ['obtenir au plus 3', [1, 2, 3]],
]
const inter = (a: number[], b: number[]) => a.filter(x => b.includes(x))
const ou = (t: number[]) => (t.length === 1 ? `$${t[0]}$` : `${t.slice(0, -1).map(x => `$${x}$`).join(', ')} ou $${t[t.length - 1]}$`)

/** Une capture de tableur : une ligne de valeurs, colonnes à partir de B */
const COLONNES = [...'ABCDEFGHIJKL']
function tableur(ligne: number, valeurs: number[], titre: string) {
  const cols = COLONNES.slice(0, valeurs.length + 1)
  return `\\begin{array}{|c|l|${'c|'.repeat(valeurs.length)}}\\hline & ${cols.map(c => `\\textbf{${c}}`).join(' & ')} \\\\ \\hline \\textbf{${ligne}} & \\text{${titre}} & ${valeurs.map(nb).join(' & ')} \\\\ \\hline\\end{array}`
}
/** La plage d'une ligne de valeurs : B2:I2 */
const plageLigne = (ligne: number, n: number) => `B${ligne}:${COLONNES[n]}${ligne}`

export const AUTOMATISMES_3E_OBJECTIFS_DONNEES: Automatisme[] = [
  // ================= STATISTIQUES · OBJ1 : les effectifs cumulés croissants =================
  exoObjectif(ST, 0, '3e-obj-ecc-valeur', 'L’effectif cumulé croissant d’une valeur', () => {
    const s = serie(), i = ent(1, s.valeurs.length - 2)
    return { enonce: `Quel est l'effectif cumulé croissant de la valeur $${nb(s.valeurs[i])}$ ? $\\quad ${tableauSerie(s)}$`, reponse: String(s.ecc[i]) }
  }),
  exoObjectif(ST, 0, '3e-obj-ecc-case', 'La case manquante des effectifs cumulés', () => {
    const s = serie(), i = ent(1, s.valeurs.length - 1)
    const t = tableau3([`\\text{${s.quoi}}`, ...s.valeurs.map(nb)], ['\\text{Effectif}', ...s.eff.map(String)], ['\\text{Eff. cumulé croissant}', ...s.ecc.map((c, j) => (j === i ? '\\ldots' : String(c)))])
    return { enonce: `Compléter la case manquante : $${t}$`, reponse: String(s.ecc[i]) }
  }),
  exoObjectif(ST, 0, '3e-obj-ecc-au-plus', 'Combien ont au plus… ?', () => {
    const s = serie(), i = ent(1, s.valeurs.length - 2), v = nb(s.valeurs[i])
    const q = s.quoi === 'Note' ? `ont une note inférieure ou égale à $${v}$` : s.quoi === 'Pointure' ? `chaussent une pointure inférieure ou égale à $${v}$` : s.quoi === 'Nombre de buts' ? `ont au plus $${v}$ but${s.valeurs[i] > 1 ? 's' : ''}` : `ont au plus $${v}$ frères et sœurs`
    return { enonce: `${combien(s.qui)} ${q} ? $\\quad ${tableauSerie(s)}$`, reponse: String(s.ecc[i]) }
  }),
  exoObjectif(ST, 0, '3e-obj-ecc-plus-que', 'Combien ont strictement plus… ?', () => {
    const s = serie(), i = ent(1, s.valeurs.length - 2), v = nb(s.valeurs[i])
    const q = s.quoi === 'Note' ? `ont une note strictement supérieure à $${v}$` : s.quoi === 'Pointure' ? `chaussent une pointure strictement supérieure à $${v}$` : s.quoi === 'Nombre de buts' ? `ont strictement plus de $${v}$ but${s.valeurs[i] > 1 ? 's' : ''}` : `ont strictement plus de $${v}$ frères et sœurs`
    return { enonce: `${combien(s.qui)} ${q} ? $\\quad ${tableauSerie(s)}$`, reponse: String(s.N - s.ecc[i]) }
  }),
  exoObjectif(ST, 0, '3e-obj-ecc-retrouver-effectif', 'Retrouver un effectif', () => {
    const v = ent(8, 15), b = ent(5, 20), a = b + ent(2, 9)
    return { enonce: `Dans une classe, l'effectif cumulé croissant de la note $${v}$ est $${a}$, et celui de la note $${v - 1}$ est $${b}$. Combien d'élèves ont exactement $${v}$ ?`, reponse: String(a - b) }
  }),
  exoObjectif(ST, 0, '3e-obj-ecc-total', 'Le dernier effectif cumulé', () => {
    const N = ent(18, 35), [quoi, qui] = choix([['des notes d\'un contrôle', 'élèves'], ['des pointures d\'une classe', 'élèves'], ['des tailles des joueurs d\'un club', 'joueurs'], ['des temps d\'une course', 'coureurs']])
    return { enonce: `Dans le tableau ${quoi}, le dernier effectif cumulé croissant est $${N}$. ${combien(qui)} y a-t-il en tout ?`, reponse: String(N) }
  }),
  exoObjectif(ST, 0, '3e-obj-ecc-diagramme', 'L’effectif cumulé lu sur un diagramme', () => {
    const s = serie(), i = ent(1, s.valeurs.length - 2)
    return { enonce: `Le diagramme donne la série « ${s.quoi.toLowerCase()} ». Quel est l'effectif cumulé croissant de la valeur $${nb(s.valeurs[i])}$ ?`, reponse: String(s.ecc[i]), figure: barres(s) }
  }),

  // ================= STATISTIQUES · OBJ2 : la médiane et les quartiles =================
  exoObjectif(ST, 1, '3e-obj-mediane-impair', 'La médiane (effectif impair)', () => {
    const s = serie(39, 'impair')
    return { enonce: `Quelle est la médiane de cette série ? $\\quad ${tableauSerie(s)}$`, reponse: nb(mediane(s)) }
  }),
  exoObjectif(ST, 1, '3e-obj-mediane-pair', 'La médiane (effectif pair)', () => {
    const s = serie(38, 'pair')
    return { enonce: `Quelle est la médiane de cette série ? $\\quad ${tableauSerie(s)}$`, reponse: nb(mediane(s)) }
  }),
  exoObjectif(ST, 1, '3e-obj-premier-quartile', 'Le premier quartile', () => {
    const s = serie(39)
    return { enonce: `Quel est le premier quartile de cette série ? $\\quad ${tableauSerie(s)}$`, reponse: nb(auRang(s, rangQ1(s.N))) }
  }),
  exoObjectif(ST, 1, '3e-obj-troisieme-quartile', 'Le troisième quartile', () => {
    const s = serie(39)
    return { enonce: `Quel est le troisième quartile de cette série ? $\\quad ${tableauSerie(s)}$`, reponse: nb(auRang(s, rangQ3(s.N))) }
  }),
  exoObjectif(ST, 1, '3e-obj-rang-quartile', 'Le rang d’un quartile', () => {
    const N = ent(9, 39), q = choix([1, 3])
    return { enonce: `Une série compte $${N}$ valeurs, rangées dans l'ordre croissant. Quel est le rang du ${q === 1 ? 'premier' : 'troisième'} quartile ?`, reponse: mot(`la ${eme(q === 1 ? rangQ1(N) : rangQ3(N))} valeur`) }
  }),
  exoObjectif(ST, 1, '3e-obj-mediane-diagramme', 'La médiane lue sur un diagramme', () => {
    const s = serie(39)
    return { enonce: `Le diagramme donne la série « ${s.quoi.toLowerCase()} ». Quelle est sa médiane ?`, reponse: nb(mediane(s)), figure: barres(s) }
  }),
  exoObjectif(ST, 1, '3e-obj-quartile-diagramme', 'Un quartile lu sur un diagramme', () => {
    const s = serie(39), q = choix([1, 3])
    return { enonce: `Le diagramme donne la série « ${s.quoi.toLowerCase()} ». Quel est son ${q === 1 ? 'premier' : 'troisième'} quartile ?`, reponse: nb(auRang(s, q === 1 ? rangQ1(s.N) : rangQ3(s.N))), figure: barres(s) }
  }),
  exoObjectif(ST, 1, '3e-obj-mediane-ecc', 'La médiane avec les effectifs cumulés', () => {
    const s = serie(39)
    const t = tableau([`\\text{${s.quoi}}`, ...s.valeurs.map(nb)], ['\\text{Eff. cumulé croissant}', ...s.ecc.map(String)])
    return { enonce: `Voici les effectifs cumulés croissants d'une série. Quelle est sa médiane ? $\\quad ${t}$`, reponse: nb(mediane(s)) }
  }),

  // ================= STATISTIQUES · OBJ3 : les boîtes à moustaches =================
  exoObjectif(ST, 2, '3e-obj-boite-lire', 'Lire une boîte à moustaches', () => {
    const v = cinqValeurs(), k = ent(0, 4)
    return { enonce: `Cette boîte à moustaches représente les notes d'une classe. Quel est ${NOMS_BOITE[k]} ?`, reponse: nb(v[k]), figure: F.boitesMoustaches([{ nom: '', v }], 0, 20, 2) }
  }),
  exoObjectif(ST, 2, '3e-obj-boite-etendue', 'L’étendue sur une boîte', () => {
    const v = cinqValeurs()
    return { enonce: 'Cette boîte à moustaches représente les notes d\'une classe. Quelle est l\'étendue de la série ?', reponse: nb(v[4] - v[0]), figure: F.boitesMoustaches([{ nom: '', v }], 0, 20, 2) }
  }),
  exoObjectif(ST, 2, '3e-obj-boite-interquartile', 'L’écart interquartile', () => {
    const v = cinqValeurs()
    return { enonce: 'Cette boîte à moustaches représente les notes d\'une classe. Quel est l\'écart interquartile ?', reponse: nb(v[3] - v[1]), figure: F.boitesMoustaches([{ nom: '', v }], 0, 20, 2) }
  }),
  exoObjectif(ST, 2, '3e-obj-boite-pourcentage', 'Au moins quel pourcentage ?', () => {
    const v = cinqValeurs(), k = ent(1, 3)
    return { enonce: `Cette boîte à moustaches représente les notes d'une classe. Au moins quel pourcentage des élèves a une note inférieure ou égale à $${v[k]}$ ?`, reponse: pourcent(25 * k), figure: F.boitesMoustaches([{ nom: '', v }], 0, 20, 2) }
  }),
  exoObjectif(ST, 2, '3e-obj-boite-effectif', 'Combien entre les quartiles ?', () => {
    const v = cinqValeurs(), N = choix([20, 24, 28, 32, 36, 40])
    return { enonce: `Cette boîte à moustaches représente les notes des $${N}$ élèves d'une classe. Environ combien d'élèves ont une note comprise entre $${v[1]}$ et $${v[3]}$ ?`, reponse: mot(`environ $${N / 2}$ (la moitié)`), figure: F.boitesMoustaches([{ nom: '', v }], 0, 20, 2) }
  }),
  exoObjectif(ST, 2, '3e-obj-boite-comparer', 'Comparer deux boîtes', () => {
    for (;;) {
      const a = cinqValeurs(), b = cinqValeurs()
      if (a[2] === b[2]) continue
      const [grand, petit] = a[2] > b[2] ? ['3eA', '3eB'] : ['3eB', '3eA']
      return { enonce: `Ces boîtes à moustaches représentent les notes de deux classes. De combien la médiane de la ${grand} dépasse-t-elle celle de la ${petit} ?`, reponse: nb(Math.abs(a[2] - b[2])), figure: F.boitesMoustaches([{ nom: '3eA', v: a }, { nom: '3eB', v: b }], 0, 20, 2) }
    }
  }),
  exoObjectif(ST, 2, '3e-obj-boite-construire', 'Les valeurs à placer sur la boîte', () => {
    const t: number[] = [ent(1, 6)]
    for (let i = 1; i < 11; i++) t.push(t[i - 1] + ent(0, 2))
    return {
      enonce: `Voici une série de $11$ valeurs, rangées dans l'ordre croissant : $${t.join('\\ ;\\ ')}$. Quelles sont les cinq valeurs à placer sur sa boîte à moustaches ?`,
      reponse: mot(`minimum $${t[0]}$, $Q_1 = ${t[2]}$, médiane $${t[5]}$, $Q_3 = ${t[8]}$, maximum $${t[10]}$`),
    }
  }),

  // ================= STATISTIQUES · OBJ4 : comprendre et interpréter =================
  exoObjectif(ST, 3, '3e-obj-interpreter-mediane', 'Interpréter une médiane', () => {
    const [serieNom, sujet, v, u] = choix<[string, string, number, string]>([
      ['des temps de trajet des élèves', 'des élèves mettent', ent(10, 30), 'min'], ['des notes d\'un contrôle', 'des élèves ont une note de', ent(9, 15), ''],
      ['des tailles des joueurs d\'un club', 'des joueurs mesurent', ent(150, 185), 'cm'], ['des temps d\'une course', 'des coureurs mettent', ent(40, 60), 'min'],
    ])
    return { enonce: `La médiane ${serieNom} est $${v}$${u ? ` ${u}` : ''}. Que peut-on dire ?`, reponse: mot(`au moins la moitié ${sujet} $${v}$${u ? ` ${u}` : ''} ou moins`) }
  }),
  exoObjectif(ST, 3, '3e-obj-interpreter-quartile', 'Interpréter un quartile', () => {
    const [serieNom, sujet, v, u] = choix<[string, string, number, string]>([
      ['des temps de trajet des élèves', 'des élèves mettent', ent(10, 30), 'min'], ['des notes d\'un contrôle', 'des élèves ont une note de', ent(8, 16), ''],
      ['des tailles des joueurs d\'un club', 'des joueurs mesurent', ent(150, 185), 'cm'],
    ])
    const q = choix([1, 3])
    return { enonce: `Le ${q === 1 ? 'premier' : 'troisième'} quartile ${serieNom} est $${v}$${u ? ` ${u}` : ''}. Que peut-on dire ?`, reponse: mot(`au moins $${25 * q}\\,\\%$ ${sujet} $${v}$${u ? ` ${u}` : ''} ou moins`) }
  }),
  exoObjectif(ST, 3, '3e-obj-valeur-extreme', 'Une valeur extrême', () => {
    for (;;) {
      const t = melange([0, 1, 2, 3, 4, 5]).slice(0, 4).map(i => 1400 + 100 * i).sort((x, y) => x - y), g = ent(6, 12) * 1000
      const s = [...t, g], somme = s.reduce((x, y) => x + y, 0)
      if (somme % 5) continue
      const euros = (x: number) => `${milliers(x)}\\text{ €}`
      const enonce = `Les salaires mensuels, en euros, des cinq employés d'une petite entreprise sont : $${s.map(milliers).join('\\ ;\\ ')}$.`
      return choix([
        { enonce: `${enonce} Calculer le salaire moyen.`, reponse: euros(somme / 5) },
        { enonce: `${enonce} Quelle est la médiane de ces salaires ?`, reponse: euros(t[2]) },
        { enonce: `${enonce} Quel salaire fait monter la moyenne bien au-dessus de la médiane ?`, reponse: euros(g) },
      ])
    }
  }),
  exoObjectif(ST, 3, '3e-obj-frequence-pourcentage', 'Une fréquence en pourcentage', () => {
    const N = choix([20, 25, 40, 50]), k = choix([...Array(N - 1)].map((_, i) => i + 1).filter(x => (100 * x) % N === 0))
    const [qui, quoi] = choix([['élèves', 'viennent en bus'], ['élèves', 'font du sport en club'], ['élèves', 'sont demi-pensionnaires'], ['spectateurs', 'ont moins de $18$ ans']])
    return { enonce: `${k} ${qui} sur ${N} ${quoi}. Quelle est la fréquence, en pourcentage ?`.replace(/^(\d+) /, '$$$1$ ').replace(/ sur (\d+) /, ' sur $$$1$ '), reponse: pourcent(100 * k / N) }
  }),
  exoObjectif(ST, 3, '3e-obj-pourcentage-effectif', 'Un effectif à partir d’un pourcentage', () => {
    const [p, N] = choix<[number, number]>([[25, 40], [25, 32], [10, 30], [20, 25], [50, 28], [75, 20], [40, 30], [30, 20], [60, 25], [75, 32]])
    const quoi = choix(['font du sport', 'viennent à vélo', 'ont un animal', 'jouent d\'un instrument'])
    return { enonce: `$${p}\\,\\%$ des $${N}$ élèves d'une classe ${quoi}. Combien d'élèves cela fait-il ?`, reponse: nb(p * N / 100) }
  }),
  exoObjectif(ST, 3, '3e-obj-moyenne-tableau', 'La moyenne d’un tableau d’effectifs', () => {
    for (;;) {
      const s = serie(20), somme = s.valeurs.reduce((x, v, i) => x + v * s.eff[i], 0), m = somme / s.N
      if (Math.round(m * 10) !== m * 10) continue
      return { enonce: `Calculer la moyenne de cette série. $\\quad ${tableauSerie(s)}$`, reponse: nb(m) }
    }
  }),
  exoObjectif(ST, 3, '3e-obj-note-manquante', 'La note manquante', () => {
    for (;;) {
      const n = ent(2, 5), m = ent(8, 14), m2 = m + choix([-1, 1, 2]), note = m2 * (n + 1) - m * n
      if (note < 0 || note > 20 || note === m2) continue
      return { enonce: `Après $${n}$ contrôles, la moyenne de Sacha est $${m}$. Quelle note lui faut-il au contrôle suivant pour avoir $${m2}$ de moyenne ?`, reponse: String(note) }
    }
  }),
  exoObjectif(ST, 3, '3e-obj-comparer-etendues', 'Comparer deux étendues', () => {
    for (;;) {
      const a = [...Array(6)].map(() => ent(2, 20)), b = [...Array(6)].map(() => ent(2, 20))
      const ea = Math.max(...a) - Math.min(...a), eb = Math.max(...b) - Math.min(...b)
      if (ea === eb) continue
      const [g, p] = ea > eb ? ['de Lina', 'de Tom'] : ['de Tom', 'de Lina']
      return { enonce: `Les notes de Lina : $${a.join('\\ ;\\ ')}$. Les notes de Tom : $${b.join('\\ ;\\ ')}$. De combien l'étendue des notes ${g} dépasse-t-elle celle des notes ${p} ?`, reponse: String(Math.abs(ea - eb)) }
    }
  }),

  // ================= STATISTIQUES · OBJ5 : le tableur =================
  ...(['moyenne', 'mediane', 'etendue'] as const).map(quoi => exoObjectif(ST, 4, `3e-obj-tableur-${quoi}`, quoi === 'moyenne' ? 'Le tableur : la moyenne' : quoi === 'mediane' ? 'Le tableur : la médiane' : 'Le tableur : l’étendue', () => {
    const n = ent(5, 9), ligne = ent(2, 4), v = [...Array(n)].map(() => ent(5, 18)), p = plageLigne(ligne, n)
    const rep = quoi === 'moyenne' ? `=MOYENNE(${p})` : quoi === 'mediane' ? `=MEDIANE(${p})` : `=MAX(${p})-MIN(${p})`
    return { enonce: `Quelle formule écrire dans le tableur pour calculer ${quoi === 'moyenne' ? 'la moyenne' : quoi === 'mediane' ? 'la médiane' : 'l\'étendue'} de ces notes ? $\\quad ${tableur(ligne, v, 'Note')}$`, reponse: mot(rep) }
  })),
  exoObjectif(ST, 4, '3e-obj-tableur-resultat', 'Le résultat d’une formule', () => {
    for (;;) {
      const n = ent(5, 8), ligne = ent(2, 4), v = [...Array(n)].map(() => ent(5, 18)), p = plageLigne(ligne, n)
      const somme = v.reduce((x, y) => x + y, 0)
      const [f, r] = choix<[string, number]>([[`=MAX(${p})`, Math.max(...v)], [`=MIN(${p})`, Math.min(...v)], [`=SOMME(${p})`, somme], [`=MOYENNE(${p})`, somme / n], [`=MAX(${p})-MIN(${p})`, Math.max(...v) - Math.min(...v)]])
      if (r !== Math.round(r)) continue
      return { enonce: `On écrit la formule $\\texttt{${f}}$ dans une cellule. Quel résultat le tableur affiche-t-il ? $\\quad ${tableur(ligne, v, 'Note')}$`, reponse: nb(r) }
    }
  }),
  exoObjectif(ST, 4, '3e-obj-tableur-plage', 'Les cellules d’une plage', () => {
    if (Math.random() < 0.5) {
      const c = choix([...'BCDE']), a = ent(1, 4), b = a + ent(4, 12)
      return { enonce: `Quelles cellules la formule $\\texttt{=MOYENNE(${c}${a}:${c}${b})}$ utilise-t-elle ?`, reponse: mot(`les cellules de ${c}${a} à ${c}${b}, dans la colonne ${c} (soit $${b - a + 1}$ cellules)`) }
    }
    const l = ent(1, 9), i = ent(1, 3), j = i + ent(3, 7)
    return { enonce: `Quelles cellules la formule $\\texttt{=SOMME(${COLONNES[i]}${l}:${COLONNES[j]}${l})}$ utilise-t-elle ?`, reponse: mot(`les cellules de ${COLONNES[i]}${l} à ${COLONNES[j]}${l}, sur la ligne ${l} (soit $${j - i + 1}$ cellules)`) }
  }),
  exoObjectif(ST, 4, '3e-obj-tableur-somme-moyenne', 'Une autre formule pour la moyenne', () => {
    const c = choix([...'BCD']), a = ent(1, 3), n = ent(5, 12), b = a + n - 1
    return { enonce: `La formule $\\texttt{=SOMME(${c}${a}:${c}${b})/${n}}$ donne le même résultat qu'une formule plus courte. Laquelle ?`, reponse: mot(`=MOYENNE(${c}${a}:${c}${b})`) }
  }),

  // ================= PROBABILITÉS · OBJ1 : P(A ∪ B) + P(A ∩ B) = P(A) + P(B) =================
  ...(['union', 'intersection', 'B'] as const).map(cherche => exoObjectif(PB, 0, `3e-obj-proba-relation-${cherche}`, cherche === 'union' ? 'Calculer P(A ∪ B)' : cherche === 'intersection' ? 'Calculer P(A ∩ B)' : 'Calculer P(B)', () => {
    for (;;) {
      const a = ent(2, 8), b = ent(2, 8), i = ent(0, Math.min(a, b) - 1), u = a + b - i
      if (u > 10 || (i === 0 && cherche === 'intersection')) continue
      const d = (x: number) => nb(x / 10)
      if (cherche === 'union') return { enonce: `On sait que $P(A) = ${d(a)}$, $P(B) = ${d(b)}$ et $P(A \\cap B) = ${d(i)}$. Calculer $P(A \\cup B)$.`, reponse: d(u) }
      if (cherche === 'intersection') return { enonce: `On sait que $P(A) = ${d(a)}$, $P(B) = ${d(b)}$ et $P(A \\cup B) = ${d(u)}$. Calculer $P(A \\cap B)$.`, reponse: d(i) }
      return { enonce: `On sait que $P(A) = ${d(a)}$, $P(A \\cup B) = ${d(u)}$ et $P(A \\cap B) = ${d(i)}$. Calculer $P(B)$.`, reponse: d(b) }
    }
  })),
  exoObjectif(PB, 0, '3e-obj-proba-incompatibles', 'Des événements incompatibles', () => {
    for (;;) {
      const [A, B] = melange(EVENEMENTS_DE).slice(0, 2)
      if (inter(A[1], B[1]).length) continue
      return { enonce: `On lance un dé à six faces. $A$ est l'événement « ${A[0]} » et $B$ l'événement « ${B[0]} ». Ces événements sont incompatibles. Calculer $P(A \\cup B)$.`, reponse: irreductible(A[1].length + B[1].length, 6) }
    }
  }),
  exoObjectif(PB, 0, '3e-obj-proba-de', 'Avec un dé : A et B, A ou B', () => {
    for (;;) {
      const [A, B] = melange(EVENEMENTS_DE).slice(0, 2), ab = inter(A[1], B[1])
      if (!ab.length || ab.length === A[1].length || ab.length === B[1].length) continue
      const debut = `On lance un dé à six faces. $A$ est l'événement « ${A[0]} » et $B$ l'événement « ${B[0]} ».`
      return choix([
        { enonce: `${debut} Calculer $P(A \\cap B)$.`, reponse: irreductible(ab.length, 6) },
        { enonce: `${debut} Calculer $P(A \\cup B)$.`, reponse: irreductible(A[1].length + B[1].length - ab.length, 6) },
      ])
    }
  }),
  exoObjectif(PB, 0, '3e-obj-proba-cartes', 'Avec un jeu de cartes', () => {
    const [A, nA] = choix<[string, number]>([['tirer un cœur', 8], ['tirer un pique', 8], ['tirer un carreau', 8], ['tirer un trèfle', 8], ['tirer une carte rouge', 16], ['tirer une carte noire', 16]])
    const [B, nB, parCouleur] = choix<[string, number, number]>([['tirer un roi', 4, 1], ['tirer une dame', 4, 1], ['tirer un as', 4, 1], ['tirer une figure (roi, dame ou valet)', 12, 3]])
    const i = parCouleur * (nA === 16 ? 2 : 1)
    return { enonce: `On tire une carte au hasard dans un jeu de $32$ cartes. $A$ est l'événement « ${A} » et $B$ l'événement « ${B} ». Calculer $P(A \\cup B)$.`, reponse: irreductible(nA + nB - i, 32) }
  }),
  exoObjectif(PB, 0, '3e-obj-proba-decrire', 'Décrire A et B, A ou B', () => {
    for (;;) {
      const [A, B] = melange(EVENEMENTS_DE).slice(0, 2), ab = inter(A[1], B[1])
      if (!ab.length || ab.length === A[1].length || ab.length === B[1].length) continue
      const union = [...new Set([...A[1], ...B[1]])].sort()
      const debut = `On lance un dé à six faces. $A$ est l'événement « ${A[0]} » et $B$ l'événement « ${B[0]} ».`
      if (union.length < 6 && Math.random() < 0.4) return { enonce: `${debut} Que signifie l'événement $A \\cup B$ ?`, reponse: mot(`obtenir ${ou(union)}`) }
      return { enonce: `${debut} Que signifie l'événement $A \\cap B$ ?`, reponse: mot(`obtenir ${ou(ab)}`) }
    }
  }),

  // ================= PROBABILITÉS · OBJ2 : des expériences indépendantes =================
  exoObjectif(PB, 1, '3e-obj-deux-pieces', 'Deux lancers de pièce', () => {
    const [ev, p] = choix<[string, string]>([['Pile puis Pile', '\\frac{1}{4}'], ['Face puis Face', '\\frac{1}{4}'], ['Pile puis Face', '\\frac{1}{4}'], ['deux fois la même face', '\\frac{1}{2}'], ['au moins une fois Pile', '\\frac{3}{4}'], ['au moins une fois Face', '\\frac{3}{4}']])
    return { enonce: `On lance deux fois une pièce équilibrée. Quelle est la probabilité d'obtenir ${ev} ?`, reponse: p }
  }),
  exoObjectif(PB, 1, '3e-obj-de-puis-piece', 'Un dé puis une pièce', () => {
    const [ev, n] = choix<[string, number]>([[`$${ent(1, 6)}$`, 1], ['un nombre pair', 3], ['au moins $5$', 2], ['un multiple de $3$', 2], ['au plus $4$', 4]])
    const face = choix(['Pile', 'Face'])
    return { enonce: `On lance un dé équilibré à six faces, puis une pièce. Quelle est la probabilité d'obtenir ${ev} et ${face} ?`, reponse: irreductible(n, 12) }
  }),
  exoObjectif(PB, 1, '3e-obj-nombre-issues', 'Le nombre d’issues', () => {
    const k = ent(3, 8)
    const [exp, n] = choix<[string, number]>([['on lance un dé à six faces, puis une pièce', 12], ['on lance deux dés à six faces', 36], ['on lance deux fois une pièce', 4], ['on lance trois fois une pièce', 8], [`on fait tourner une roue de $${k}$ secteurs numérotés, puis on lance une pièce`, 2 * k], [`on lance un dé à six faces, puis on fait tourner une roue de $${k}$ secteurs numérotés`, 6 * k]])
    return { enonce: `Combien d'issues compte l'expérience suivante : ${exp} ?`, reponse: String(n) }
  }),
  exoObjectif(PB, 1, '3e-obj-urne-remise', 'Deux tirages avec remise', () => {
    const r = ent(1, 5), b = ent(1, 5), n = r + b
    const [ev, k] = choix<[string, number]>([['rouge puis rouge', r * r], ['bleue puis bleue', b * b], ['rouge puis bleue', r * b], ['bleue puis rouge', r * b]])
    return { enonce: `Une urne contient $${r}$ boule${r > 1 ? 's' : ''} rouge${r > 1 ? 's' : ''} et $${b}$ boule${b > 1 ? 's' : ''} bleue${b > 1 ? 's' : ''}. On tire une boule, on la remet, puis on en tire une deuxième. Quelle est la probabilité de tirer ${ev} ?`, reponse: irreductible(k, n * n) }
  }),
  exoObjectif(PB, 1, '3e-obj-independance', 'Le lancer suivant', () => {
    const n = ent(3, 9)
    if (Math.random() < 0.6) { const f = choix(['Pile', 'Face']); return { enonce: `On a obtenu $${n}$ fois ${f} de suite avec une pièce équilibrée. Quelle est la probabilité d'obtenir ${f} au lancer suivant ?`, reponse: '\\frac{1}{2}' } }
    const k = ent(1, 6)
    return { enonce: `Avec un dé équilibré à six faces, le $${k}$ n'est pas sorti depuis $${n + 5}$ lancers. Quelle est la probabilité d'obtenir $${k}$ au lancer suivant ?`, reponse: '\\frac{1}{6}' }
  }),
  exoObjectif(PB, 1, '3e-obj-simuler-tableur', 'Simuler avec le tableur', () => {
    const [objet, n] = choix<[string, number]>([['un dé à six faces', 6], ['un dé à huit faces', 8], ['un dé à douze faces', 12], ['un dé à vingt faces', 20], [`une roue de ${ent(3, 10)} secteurs numérotés à partir de 1`, 0]])
    const m = n || Number(/roue de (\d+)/.exec(objet)![1])
    return { enonce: `Quelle formule du tableur simule le lancer d'${objet} ?`, reponse: mot(`=ALEA.ENTRE.BORNES(1;${m})`) }
  }),
  exoObjectif(PB, 1, '3e-obj-simuler-scratch', 'Simuler avec Scratch', () => {
    return choix([
      { enonce: 'En Scratch, quelle instruction simule le lancer d\'une pièce, si l\'on code Pile par $1$ et Face par $2$ ?', reponse: mot('« nombre aléatoire entre $1$ et $2$ »') },
      { enonce: 'En Scratch, quelle instruction simule le lancer d\'une pièce, si l\'on code Pile par $0$ et Face par $1$ ?', reponse: mot('« nombre aléatoire entre $0$ et $1$ »') },
      (() => { const n = choix([4, 6, 8, 12]); return { enonce: `En Scratch, quelle instruction simule le lancer d'un dé à $${n}$ faces ?`, reponse: mot(`« nombre aléatoire entre $1$ et $${n}$ »`) } })(),
    ])
  }),

  // ================= PROBABILITÉS · OBJ3 : fréquences et probabilité =================
  exoObjectif(PB, 2, '3e-obj-frequence-observee', 'Une fréquence observée', () => {
    const N = choix([50, 100, 200, 500, 1000]), k = ent(Math.round(N * 0.3), Math.round(N * 0.7)), f = choix(['Pile', 'Face'])
    return { enonce: `On lance une pièce $${milliers(N)}$ fois et on obtient $${k}$ fois ${f}. Quelle est la fréquence de ${f} ?`, reponse: nb(k / N) }
  }),
  exoObjectif(PB, 2, '3e-obj-estimer-probabilite', 'Estimer une probabilité', () => {
    const [objet, issue, p, f] = choix<[string, string, string, number]>([
      ['un dé', 'le $6$', '\\frac{1}{6}', choix([0.165, 0.168, 0.167, 0.169, 0.164])], ['une pièce', 'Pile', '\\frac{1}{2}', choix([0.498, 0.502, 0.503, 0.497])],
      ['une roue à quatre secteurs égaux', 'le secteur rouge', '\\frac{1}{4}', choix([0.248, 0.251, 0.252, 0.249])],
    ])
    return { enonce: `On simule $10\\,000$ lancers d'${objet} : ${issue} sort avec une fréquence de $${nb(f)}$. Quelle probabilité peut-on estimer ?`, reponse: `\\approx ${p}` }
  }),
  exoObjectif(PB, 2, '3e-obj-de-truque', 'Un dé truqué', () => {
    const N = choix([500, 1000, 2000]), p = choix([0.3, 0.35, 0.4, 0.45, 0.5, 0.25]), k = p * N, face = ent(1, 6)
    return { enonce: `Sur $${milliers(N)}$ lancers d'un dé truqué, le $${face}$ sort $${milliers(k)}$ fois. Estimer la probabilité d'obtenir $${face}$.`, reponse: mot(`environ $${nb(p)}$`) }
  }),
  exoObjectif(PB, 2, '3e-obj-urne-inconnue', 'Le contenu d’une urne', () => {
    const n = choix([10, 20]), r = ent(2, n / 2 + 2), f = r / n, coul = choix(['rouge', 'verte', 'blanche'])
    return { enonce: `Une urne contient $${n}$ boules. Après $500$ tirages avec remise, la fréquence de la couleur ${coul} est $${nb(f)}$. Combien de boules ${coul}s l'urne contient-elle probablement ?`, reponse: String(r) }
  }),
  exoObjectif(PB, 2, '3e-obj-courbe-frequences', 'La fréquence se stabilise', () => {
    const p = choix([0.2, 0.25, 0.3, 0.4, 0.5, 0.6, 0.75])
    const vals = [...Array(8)].map((_, i) => Math.max(0.02, Math.round((p + (Math.random() * 2 - 1) * 0.3 / (i + 1)) * 100) / 100))
    vals[7] = p; vals[6] = Math.round((p + (Math.random() < 0.5 ? 0.01 : -0.01)) * 100) / 100
    return { enonce: 'La courbe donne la fréquence d\'une issue en fonction du nombre de lancers (de $100$ à $800$). Vers quelle valeur la fréquence se stabilise-t-elle ?', reponse: mot(`vers $${nb(p)}$ environ`), figure: F.courbeDonnees(vals, 0.1, 100, 100) }
  }),
  exoObjectif(PB, 2, '3e-obj-nombre-attendu', 'Combien de fois environ ?', () => {
    const [p, N] = choix<[number, number]>([[0.2, 500], [0.1, 300], [0.25, 400], [0.5, 600], [0.3, 200], [0.4, 500], [0.2, 150], [0.75, 200]])
    return { enonce: `Un événement a une probabilité de $${nb(p)}$. On répète l'expérience $${N}$ fois. Environ combien de fois se produit-il ?`, reponse: mot(`environ $${nb(p * N)}$ fois`) }
  }),
  exoObjectif(PB, 2, '3e-obj-ecart-frequence', 'L’écart entre fréquence et probabilité', () => {
    for (;;) {
      const n = choix([10, 20, 50]), k = ent(1, n - 1), f = choix(['Pile', 'Face'])
      if (k * 2 === n || Math.abs(k / n - 0.5) > 0.35) continue
      return { enonce: `Sur $${n}$ lancers d'une pièce équilibrée, on obtient $${k}$ fois ${f}. Quel est l'écart entre la fréquence de ${f} et sa probabilité ?`, reponse: nb(Math.abs(k / n - 0.5)) }
    }
  }),
]

// ---------- Les questions de cours ----------
export const COURS_3E_OBJECTIFS_DONNEES: QuestionCours[] = [
  // Statistiques · OBJ1
  notion(ST, 200, 0, 'L’effectif cumulé croissant', () => phraseATrou('l\'[effectif cumulé croissant] d\'une valeur est la somme des effectifs des valeurs [inférieures] ou égales à cette valeur.')),
  notion(ST, 201, 0, 'Le dernier effectif cumulé', () => phraseATrou('le dernier [effectif cumulé croissant] est égal à l\'[effectif total].')),
  // Statistiques · OBJ2
  notion(ST, 202, 1, 'Les quartiles',
    () => phraseATrou('le [premier] quartile est la plus petite valeur telle qu\'au moins [$25$] % des valeurs lui sont inférieures ou égales.'),
    () => phraseATrou('le [troisième] quartile est la plus petite valeur telle qu\'au moins [$75$] % des valeurs lui sont inférieures ou égales.')),
  notion(ST, 203, 1, 'La médiane', () => phraseATrou('la [médiane] partage la série en deux groupes de même [effectif].')),
  // Statistiques · OBJ3
  notion(ST, 204, 2, 'La boîte à moustaches', () => phraseATrou('une boîte à moustaches représente le [minimum], le [premier quartile], la [médiane], le [troisième quartile] et le [maximum].')),
  notion(ST, 205, 2, 'L’écart interquartile', () => phraseATrou('la longueur de la boîte est l\'[écart interquartile] : la différence entre le [troisième quartile] et le [premier quartile].')),
  // Statistiques · OBJ4
  notion(ST, 206, 3, 'Moyenne et valeurs extrêmes', () => phraseATrou('la [moyenne] est sensible aux valeurs [extrêmes], contrairement à la [médiane].')),
  notion(ST, 207, 3, 'La fréquence d’une valeur', () => phraseATrou('la [fréquence] d\'une valeur est égale à son [effectif] divisé par l\'[effectif total].')),
  // Statistiques · OBJ5
  notion(ST, 208, 4, 'Une formule du tableur', () => phraseATrou('dans un tableur, une [formule] commence toujours par le signe [$=$].')),
  notion(ST, 209, 4, 'Une plage de cellules', () => {
    const c = choix([...'ABCDE']), a = ent(1, 4), b = a + ent(3, 12)
    return [`Que veut dire $\\texttt{${c}${a}:${c}${b}}$ dans une formule du tableur ?`, `toutes les cellules de ${c}${a} à ${c}${b}`]
  }),
  // Probabilités · OBJ1
  notion(PB, 200, 0, 'La relation entre P(A ∪ B) et P(A ∩ B)', () => {
    const [E, G] = choix([['A', 'B'], ['E', 'F'], ['R', 'S']])
    const morceaux = [`P(${E} \\cup ${G})`, `P(${E} \\cap ${G})`, `P(${E})`, `P(${G})`], k = ent(0, 3)
    const m = morceaux.map((x, i) => (i === k ? '\\ldots' : x))
    return [`Compléter : $${m[0]} + ${m[1]} = ${m[2]} + ${m[3]}$`, `$${morceaux[k]}$`]
  }),
  notion(PB, 201, 0, 'Des événements incompatibles', () => {
    const [E, G] = choix([['A', 'B'], ['E', 'F'], ['R', 'S']])
    return choix<[string, string]>([
      [`Compléter : si $${E}$ et $${G}$ sont incompatibles, $P(${E} \\cap ${G}) = \\ldots$`, '$0$'],
      [`Compléter : si $P(${E} \\cap ${G}) = 0$, les événements $${E}$ et $${G}$ sont …`, 'incompatibles'],
    ])
  }),
  notion(PB, 202, 0, 'Lire A ∪ B et A ∩ B', () => {
    const [E, G] = choix([['A', 'B'], ['E', 'F'], ['R', 'S'], ['M', 'N']])
    return choix<[string, string]>([[`Comment se lit $${E} \\cup ${G}$ ?`, `« $${E}$ ou $${G}$ »`], [`Comment se lit $${E} \\cap ${G}$ ?`, `« $${E}$ et $${G}$ »`]])
  }),
  // Probabilités · OBJ2
  notion(PB, 203, 1, 'La probabilité d’un chemin', () => phraseATrou('dans un arbre, la probabilité d\'un [chemin] est le [produit] des probabilités rencontrées sur ce chemin.')),
  notion(PB, 204, 1, 'Des expériences indépendantes', () => phraseATrou('deux expériences sont [indépendantes] quand le résultat de l\'une n\'a pas d\'[influence] sur l\'autre.')),
  // Probabilités · OBJ3
  notion(PB, 205, 2, 'Fréquence et probabilité', () => phraseATrou('quand on répète une expérience un grand nombre de fois, la [fréquence] d\'une issue se rapproche de sa [probabilité].')),
  notion(PB, 206, 2, 'La fréquence d’une issue', () => phraseATrou('la [fréquence] d\'une issue est le nombre de fois où elle apparaît divisé par le nombre de [répétitions].')),
]
