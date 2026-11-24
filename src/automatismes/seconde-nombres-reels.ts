// =============================================================
// LES AUTOMATISMES DE 2nde : NOMBRES RÉELS, REVUS LIGNE PAR LIGNE
// Le professeur a revu le domaine le 24 novembre 2026, ligne OFFI par
// ligne OFFI : pour chacune, plusieurs exercices (A, B, C…) qui couvrent
// tout l'intitulé, puis les questions de cours (P1, P2…), des phrases à
// compléter dont le trou change de place.
// - Les anciens exercices de ces lignes sont repris dans les nouveaux
//   (l'ancienne liste reste dans lycee.ts, AUTOMATISMES_2NDE_AVANT, sans
//   être posée) ; les deux façons de l'ancienne notion « Un pourcentage
//   est une fraction » sont devenues des exercices (F et I des écritures),
//   à la demande du professeur.
// Ses règles : réponses courtes ; jamais une chance sur deux ; jamais la
// liste des réponses possibles ; rien de fixe ; pas de calculatrice, donc
// des fractions simples (demis, quarts, cinquièmes, dixièmes).
// =============================================================
import type { Automatisme, Facon, Question, QuestionCours } from './outils'
import { PRENOMS, arrondi, choix, ent, frac, grandNb, mot, nb, notions, unTrou, unite } from './outils'

const D = 'Nombres réels'
const pct = (x: number) => `${nb(x)}\\,\\%`
/** Les phrases de la liste officielle, dans l'ordre des lignes du domaine */
const LIGNES = [
  'Passer d’une écriture d’un nombre à une autre (décimale, fractionnaire, pourcentage).',
  'Estimer un ordre de grandeur.',
  'S’assurer de la vraisemblance, de la cohérence d’un résultat.',
  'Effectuer des conversions d’unités : longueurs, aires, volumes, contenances, durées, vitesses, masses.',
]
function exo(k: number, id: string, titre: string, generer: () => Question, trou?: () => Question): Automatisme {
  return { id: `2nde-nr-${id}`, theme: D, titre, competence: k, programme: LIGNES[k], generer, ...(trou ? { trou } : {}) }
}
/** Une phrase à compléter dont le trou change de place : chaque mot entre
 *  crochets peut être le trou */
export function phraseATrou(phrase: string): [string, string] {
  const mots = [...phrase.matchAll(/\[([^\]]+)\]/g)].map(m => m[1])
  const k = ent(0, mots.length - 1)
  let i = -1
  const texte = phrase.replace(/\[([^\]]+)\]/g, (_, m) => (++i === k ? '…' : m))
  return [`Compléter : ${texte.replace('….', '…')}`, mots[k]]
}
/** Une notion de cours sous sa ligne ; les numéros partent de 100 (les
 *  anciennes notions de 2nde gardent les leurs) */
function notion(k: number, i: number, titre: string, ...facons: Facon[]): QuestionCours {
  const [q] = notions(D, [[titre, ...facons]], '2nde-')
  return { ...q, id: `cours-2nde-${D}-${i}`, competence: k }
}

// ---------- Ligne 1 : passer d'une écriture à une autre ----------
/** Les fractions simples (choix du professeur : pas de huitièmes ni de vingtièmes) */
const SIMPLES: [number, number][] = [[1, 2], [1, 4], [3, 4], [1, 5], [2, 5], [3, 5], [4, 5], [1, 10], [3, 10], [7, 10], [9, 10]]
/** Plus grandes que 1 */
const PLUS_QUE_UN: [number, number][] = [[5, 4], [3, 2], [5, 2], [7, 4], [6, 5], [7, 5], [11, 10], [13, 10], [9, 4]]
const ECRITURES: Automatisme[] = [
  exo(0, 'fraction-decimal', 'Fraction → écriture décimale', () => {
    const [n, d] = choix(SIMPLES)
    return { enonce: `Donner l'écriture décimale de $${frac(n, d)}$.`, reponse: nb(n / d) }
  }),
  exo(0, 'fraction-pourcentage', 'Fraction → pourcentage', () => {
    const [n, d] = choix(SIMPLES)
    return { enonce: `Écrire $${frac(n, d)}$ sous la forme d'un pourcentage.`, reponse: pct(arrondi(n / d * 100)) }
  }),
  exo(0, 'decimal-fraction', 'Écriture décimale → fraction irréductible', () => {
    const [n, d] = choix(SIMPLES)
    return { enonce: `Écrire $${nb(n / d)}$ sous la forme d'une fraction irréductible.`, reponse: frac(n, d) }
  }),
  exo(0, 'decimal-pourcentage', 'Écriture décimale → pourcentage', () => {
    const x = choix([ent(1, 9) / 100, ent(11, 99) / 100, ent(1, 9) / 10])
    return { enonce: `Écrire $${nb(x)}$ sous la forme d'un pourcentage.`, reponse: pct(arrondi(x * 100)) }
  }),
  exo(0, 'pourcentage-fraction', 'Pourcentage → fraction irréductible', () => {
    const [n, d] = choix(SIMPLES)
    return { enonce: `Écrire $${pct(arrondi(n / d * 100))}$ sous la forme d'une fraction irréductible.`, reponse: frac(n, d) }
  }),
  // Avec l'ancienne question de cours « Comment écrit-on 39 % en écriture décimale ? »
  exo(0, 'pourcentage-decimal', 'Pourcentage → écriture décimale', () => {
    const t = choix([ent(1, 9), ent(11, 99), ent(1, 9) + 0.5])
    return choix([
      { enonce: `Écrire $${pct(t)}$ sous la forme d'un nombre décimal.`, reponse: nb(t / 100) },
      { enonce: `Comment écrit-on $${pct(t)}$ en écriture décimale ?`, reponse: nb(t / 100) },
    ])
  }),
  exo(0, 'plus-que-un', 'Un nombre plus grand que 1', () => {
    const [n, d] = choix(PLUS_QUE_UN)
    return choix([
      { enonce: `Écrire $${frac(n, d)}$ sous la forme d'un pourcentage.`, reponse: pct(arrondi(n / d * 100)) },
      { enonce: `Écrire $${nb(n / d)}$ sous la forme d'une fraction irréductible.`, reponse: frac(n, d) },
      { enonce: `Écrire $${pct(arrondi(n / d * 100))}$ sous la forme d'un nombre décimal.`, reponse: nb(n / d) },
    ])
  }),
  exo(0, 'ecritures-trou', 'Compléter une égalité entre écritures', () => {
    const [n, d] = choix(SIMPLES), p = arrondi(n / d * 100)
    return unTrou('', [
      [`$${frac(n, d)} = \\ldots\\,\\%$`, nb(p)],
      [`$${pct(p)} = \\frac{${n}}{\\ldots}$`, nb(d)],
      [`$${pct(p)} = \\frac{\\ldots}{${d}}$`, nb(n)],
      [`$${frac(n, d)} = \\ldots$ (écriture décimale)`, nb(n / d)],
    ])
  }),
  // Avec l'ancienne question de cours « Quelle fraction de dénominateur 100 est égale à 37 % ? »
  exo(0, 'pourcentage-sur-cent', 'Pourcentage → fraction de dénominateur 100', () => {
    const t = ent(1, 99)
    return choix([
      { enonce: `Quelle fraction de dénominateur $100$ est égale à $${pct(t)}$ ?`, reponse: `\\frac{${t}}{100}` },
      { enonce: `Compléter : $${pct(t)} = \\frac{\\ldots}{100}$`, reponse: nb(t) },
    ])
  }),
]
const COURS_ECRITURES: QuestionCours[] = [
  notion(0, 100, 'D’un pourcentage à l’écriture décimale',
    () => phraseATrou('Pour passer d’un pourcentage à l’écriture décimale, on [divise] par [100].')),
  notion(0, 101, 'De l’écriture décimale à un pourcentage',
    () => phraseATrou('Pour passer de l’écriture décimale à un pourcentage, on [multiplie] par [100].')),
]

// ---------- Ligne 2 : estimer un ordre de grandeur ----------
/** Un nombre un peu à côté de x (de 1 à 4 %), écrit avec `dec` décimales au plus */
const aCote = (x: number, dec: number) => Math.round(x * (1 + choix([-1, 1]) * ent(1, 4) / 100) * 10 ** dec) / 10 ** dec
const environ = (x: number, calcul: string) => mot(`environ $${grandNb(x)}$ (car $${calcul}$)`)
const ORDRE: Automatisme[] = [
  exo(1, 'ordre-produit', 'Ordre de grandeur d’un produit', () => {
    const A = choix([20, 30, 40, 50, 60, 200, 300, 400, 500]), B = choix([0.2, 0.3, 0.5, 2, 3, 4, 20, 30])
    return { enonce: `Donner un ordre de grandeur de $${nb(aCote(A, 1))} \\times ${nb(aCote(B, 2))}$.`, reponse: environ(arrondi(A * B), `${nb(A)} \\times ${nb(B)} = ${grandNb(arrondi(A * B))}`) }
  }),
  exo(1, 'ordre-quotient', 'Ordre de grandeur d’un quotient', () => {
    const A = choix([20, 30, 40, 50, 60, 200, 300, 400, 500]), B = choix([2, 3, 4, 5, 20, 30])
    return { enonce: `Donner un ordre de grandeur de $${grandNb(aCote(A * B, 0))} \\div ${nb(aCote(B, 2))}$.`, reponse: environ(A, `${grandNb(A * B)} \\div ${nb(B)} = ${nb(A)}`) }
  }),
  exo(1, 'ordre-somme', 'Ordre de grandeur d’une somme ou d’une différence', () => {
    const A = ent(2, 9) * 100, B = ent(10, 40) * 100
    const a = A + choix([-1, 1]) * ent(1, 4), b = B + choix([-1, 1]) * ent(1, 9)
    return choix([
      { enonce: `Donner un ordre de grandeur de $${grandNb(a)} + ${grandNb(b)}$.`, reponse: environ(A + B, `${grandNb(A)} + ${grandNb(B)} = ${grandNb(A + B)}`) },
      { enonce: `Donner un ordre de grandeur de $${grandNb(b)} - ${grandNb(a)}$.`, reponse: environ(B - A, `${grandNb(B)} - ${grandNb(A)} = ${grandNb(B - A)}`) },
    ])
  }),
  exo(1, 'ordre-grand-petit', 'Un très grand nombre par un très petit', () => {
    const [p, g] = choix<[number, number]>([[0.05, 2000], [0.02, 3000], [0.003, 4000], [0.4, 500], [0.005, 20000], [0.03, 3000], [0.002, 50000]])
    return { enonce: `Donner un ordre de grandeur de $${nb(aCote(p, 5))} \\times ${grandNb(aCote(g, 0))}$.`, reponse: environ(arrondi(p * g), `${nb(p)} \\times ${grandNb(g)} = ${grandNb(arrondi(p * g))}`) }
  }),
  exo(1, 'ordre-pourcentage', 'Ordre de grandeur d’un pourcentage', () => {
    const p = choix([10, 20, 25, 50]), N = ent(2, 9) * 1000
    const q = p + choix([-1, 1]), n = N + choix([-1, 1]) * ent(1, 20)
    return { enonce: `Donner un ordre de grandeur de $${pct(q)}$ de $${grandNb(n)}$.`, reponse: environ(p * N / 100, `${pct(p)} \\text{ de } ${grandNb(N)} = ${grandNb(p * N / 100)}`) }
  }),
]
const COURS_ORDRE: QuestionCours[] = [
  notion(1, 102, 'Estimer un ordre de grandeur',
    () => phraseATrou('Pour estimer un ordre de grandeur, on remplace chaque nombre par une [valeur proche], simple à [calculer].')),
]

// ---------- Ligne 3 : la vraisemblance d'un résultat ----------
const PAS_VRAI = 'Ce n\'est pas vraisemblable : quel est le bon résultat ?'
const VRAISEMBLANCE: Automatisme[] = [
  exo(2, 'vraisemblance-produit', 'Un produit de décimaux invraisemblable', () => {
    const a = ent(2, 9), b = ent(2, 9)
    return { enonce: `${choix(PRENOMS)} écrit $0{,}${a} \\times 0{,}${b} = ${nb(a * b / 10)}$. ${PAS_VRAI}`, reponse: nb(a * b / 100) }
  }),
  exo(2, 'vraisemblance-pourcentage', 'Un pourcentage invraisemblable', () => {
    const p = choix([5, 10, 15, 20, 30]), c = 20 * ent(2, 9)
    return { enonce: `${choix(PRENOMS)} trouve que $${pct(p)}$ de $${c}$ font $${nb(p * c / 10)}$. ${PAS_VRAI}`, reponse: nb(p * c / 100) }
  }),
  exo(2, 'vraisemblance-division', 'Une division par un nombre plus petit que 1', () => {
    const a = ent(2, 9), d = choix([0.5, 0.25, 0.1])
    return { enonce: `${choix(PRENOMS)} écrit $${a} \\div ${nb(d)} = ${nb(a * d)}$. ${PAS_VRAI}`, reponse: nb(a / d) }
  }),
  exo(2, 'vraisemblance-remise', 'Un prix soldé invraisemblable', () => {
    const t = choix([10, 20, 25, 50]), P = 20 * ent(2, 10)
    return { enonce: `${choix(PRENOMS)} trouve qu'un article à $${P}$ €, soldé de $${pct(t)}$, coûte $${nb(P * (1 + t / 100))}$ €. Ce n'est pas vraisemblable : quel est le bon prix ?`, reponse: mot(`$${nb(P * (1 - t / 100))}$ €`) }
  }),
  exo(2, 'vraisemblance-proportion', 'Une proportion impossible', () => {
    const x = choix([nb(ent(11, 30) / 10), pct(ent(11, 30) * 10)])
    return { enonce: `${choix(PRENOMS)} trouve une proportion de $${x}$. Pourquoi est-ce impossible ?`, reponse: mot('une proportion est toujours comprise entre $0$ et $1$ (entre $0\\,\\%$ et $100\\,\\%$)') }
  }),
]
const COURS_VRAISEMBLANCE: QuestionCours[] = [
  notion(2, 103, 'Multiplier par un nombre entre 0 et 1',
    () => phraseATrou('Multiplier un nombre positif par un nombre compris entre [0] et [1] le rend plus [petit].')),
  notion(2, 104, 'Diviser par un nombre entre 0 et 1',
    () => phraseATrou('Diviser un nombre positif par un nombre compris entre [0] et [1] le rend plus [grand].')),
]

// ---------- Ligne 4 : les conversions d'unités ----------
/** Une unité en LaTeX : « m² » donne \text{m}^2 */
const U = (u: string) => `\\text{${u.replace(/[²³]/, '')}}${u.includes('²') ? '^2' : u.includes('³') ? '^3' : ''}`
const conv = (v: string, de: string, vers: string) => `Convertir $${v}\\,${U(de)}$ en $${U(vers)}$.`
const CONVERSIONS: Automatisme[] = [
  exo(3, 'conversion-longueurs', 'Conversions de longueurs', () => choix<() => Question>([
    () => { const v = ent(11, 99) / 10; return { enonce: conv(nb(v), 'km', 'm'), reponse: unite(grandNb(v * 1000), 'm') } },
    () => { const v = ent(12, 95) * 100; return { enonce: conv(grandNb(v), 'm', 'km'), reponse: unite(nb(v / 1000), 'km') } },
    () => { const v = ent(12, 95); return { enonce: conv(nb(v), 'mm', 'cm'), reponse: unite(nb(v / 10), 'cm') } },
    () => { const v = ent(12, 95) / 10; return { enonce: conv(nb(v), 'cm', 'mm'), reponse: unite(nb(v * 10), 'mm') } },
  ])()),
  exo(3, 'conversion-aires', 'Conversions d’aires', () => choix<() => Question>([
    () => { const v = ent(2, 9) / choix([1, 10]); return { enonce: conv(nb(v), 'm²', 'cm²'), reponse: `${grandNb(v * 10000)}\\text{ cm}^2` } },
    () => { const v = ent(2, 9) * 10000; return { enonce: conv(grandNb(v), 'cm²', 'm²'), reponse: `${nb(v / 10000)}\\text{ m}^2` } },
    () => { const v = ent(15, 95) * 10; return { enonce: conv(nb(v), 'cm²', 'dm²'), reponse: `${nb(v / 100)}\\text{ dm}^2` } },
    () => { const v = ent(2, 30) / 10; return { enonce: conv(nb(v), 'dm²', 'cm²'), reponse: `${nb(v * 100)}\\text{ cm}^2` } },
  ])()),
  exo(3, 'conversion-volumes', 'Conversions de volumes', () => choix<() => Question>([
    () => { const v = ent(2, 9) / choix([1, 10]); return { enonce: conv(nb(v), 'dm³', 'cm³'), reponse: `${grandNb(v * 1000)}\\text{ cm}^3` } },
    () => { const v = ent(2, 95) * 100; return { enonce: conv(grandNb(v), 'cm³', 'dm³'), reponse: `${nb(v / 1000)}\\text{ dm}^3` } },
  ])()),
  exo(3, 'conversion-contenances', 'Conversions de contenances', () => choix<() => Question>([
    () => { const v = ent(2, 30) / 10; return { enonce: `Combien de litres y a-t-il dans $${nb(v)}\\text{ m}^3$ ?`, reponse: unite(grandNb(v * 1000), 'L') } },
    () => { const v = ent(5, 95) * 10; return { enonce: conv(nb(v), 'mL', 'L'), reponse: unite(nb(v / 1000), 'L') } },
    () => { const v = ent(2, 9) * 10 + 5; return { enonce: conv(nb(v), 'cL', 'L'), reponse: unite(nb(v / 100), 'L') } },
    () => { const v = ent(2, 9) / choix([1, 10]); return { enonce: conv(nb(v), 'L', 'cL'), reponse: unite(nb(v * 100), 'cL') } },
  ])()),
  exo(3, 'conversion-durees', 'Conversions de durées', () => choix<() => Question>([
    () => { const h = ent(1, 4), q = choix([0.25, 0.5, 0.75, 0.1, 0.2]); return { enonce: `Convertir $${unite(nb(h + q), 'h')}$ en heures et minutes.`, reponse: `${h}\\text{ h }${arrondi(q * 60)}\\text{ min}` } },
    () => { const m = choix([75, 90, 105, 135, 150, 45, 36, 12]); return { enonce: `Convertir $${unite(nb(m), 'min')}$ en heures (écriture décimale).`, reponse: unite(nb(m / 60), 'h') } },
  ])()),
  exo(3, 'conversion-vitesses', 'Conversions de vitesses', () => choix<() => Question>([
    () => { const v = choix([18, 36, 54, 72, 90, 108, 126]); return { enonce: conv(nb(v), 'km/h', 'm/s'), reponse: `${nb(v / 3.6)}\\text{ m/s}` } },
    () => { const v = choix([5, 10, 15, 20, 25, 30]); return { enonce: conv(nb(v), 'm/s', 'km/h'), reponse: `${nb(v * 3.6)}\\text{ km/h}` } },
  ])()),
  exo(3, 'conversion-masses', 'Conversions de masses', () => choix<() => Question>([
    () => { const v = ent(12, 95) / 10; return { enonce: conv(nb(v), 'kg', 'g'), reponse: unite(grandNb(v * 1000), 'g') } },
    () => { const v = ent(12, 95) * 100; return { enonce: conv(grandNb(v), 'g', 'kg'), reponse: unite(nb(v / 1000), 'kg') } },
    () => { const v = ent(150, 950); return { enonce: conv(nb(v), 'kg', 't'), reponse: unite(nb(v / 1000), 't') } },
    () => { const v = ent(12, 95) / 10; return { enonce: conv(nb(v), 't', 'kg'), reponse: unite(grandNb(v * 1000), 'kg') } },
  ])()),
  exo(3, 'conversion-trou', 'Compléter une conversion', () => {
    const h = ent(1, 3), q = choix([0.25, 0.5, 0.75]), v = choix([36, 54, 72, 90]), w = ent(2, 9)
    return unTrou('', [
      [`$${unite(nb(h + q), 'h')} = \\ldots\\text{ min}$`, nb((h + q) * 60)],
      [`$${nb(v)}\\text{ km/h} = \\ldots\\text{ m/s}$`, nb(v / 3.6)],
      [`$${nb(w)}\\text{ m}^3 = \\ldots\\text{ L}$`, grandNb(w * 1000)],
      [`$\\ldots\\text{ m}^3 = ${grandNb(w * 1000)}\\text{ L}$`, nb(w)],
    ])
  }),
]
const COURS_CONVERSIONS: QuestionCours[] = [
  notion(3, 105, 'Le mètre carré en centimètres carrés', () => phraseATrou('[1] m² = [10 000] cm².')),
  notion(3, 106, 'Le décimètre cube et le litre', () => phraseATrou('[1] dm³ = [1] L.')),
  notion(3, 107, 'L’heure en minutes et en secondes', () => phraseATrou('1 h = [60] min = [3 600] s.')),
  notion(3, 108, 'Des km/h aux m/s', () => phraseATrou('Pour passer des [km/h] aux [m/s], on divise par [3,6].')),
]

/** Les exercices du domaine Nombres réels, ligne par ligne */
export const AUTOMATISMES_2NDE_NOMBRES_REELS: Automatisme[] = [...ECRITURES, ...ORDRE, ...VRAISEMBLANCE, ...CONVERSIONS]
/** Ses questions de cours */
export const COURS_2NDE_NOMBRES_REELS: QuestionCours[] = [...COURS_ECRITURES, ...COURS_ORDRE, ...COURS_VRAISEMBLANCE, ...COURS_CONVERSIONS]