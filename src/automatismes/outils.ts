// =============================================================
// LES OUTILS DES AUTOMATISMES
// Ce que partagent les exercices de tous les niveaux : la forme d'une
// question, le hasard, l'écriture des nombres, des fractions et des
// unités, les noms de points et de figures, les questions à trou. Voir
// ../automatismes.ts pour l'ensemble.
// =============================================================


export interface Question {
  enonce: string            // texte, avec $…$ pour les maths
  figure?: string           // un dessin SVG sous l'énoncé
  reponse: string           // LaTeX ou §texte
  /** Des erreurs d'élèves fréquentes (même format). Elles ne sont plus
   *  montrées depuis la fin des QCM ; facultatives. */
  faux?: string[]
}

export interface Automatisme {
  id: string
  titre: string
  theme: string
  generer: () => Question
  /** La même chose posée « à trou » : une égalité ou une phrase à
   *  compléter, avec … à la place de la réponse. Absent : l'automatisme ne
   *  s'y prête pas. */
  trou?: () => Question
  /** La phrase du programme que la question travaille, comme au brevet */
  programme?: string
  /** Une application directe d'un objectif d'apprentissage (et non un
   *  automatisme de la liste officielle). Depuis le 7 novembre 2026, le
   *  flash ne les pose plus (voir automatismesDuFlash) ; elles restent ici,
   *  pour servir plus tard avec le programme entier. */
  application?: boolean
  /** La compétence travaillée : le rang de sa phrase dans la liste
   *  « Automatismes » de son domaine (programme-automatismes.ts).
   *  Absente : l'exercice suit son domaine entier. */
  competence?: number
}

// ---------- Outils ----------
export const ent = (a: number, b: number) => a + Math.floor(Math.random() * (b - a + 1))
export const choix = <T,>(t: T[]): T => t[Math.floor(Math.random() * t.length)]
export const pgcd = (a: number, b: number): number => b ? pgcd(b, a % b) : Math.abs(a)
export const arrondi = (x: number) => Math.round(x * 1e6) / 1e6
export const melange = <T,>(t: T[]) => { const r = [...t]; for (let i = r.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [r[i], r[j]] = [r[j], r[i]] } return r }

/** Un nombre décimal à la française : 3{,}5 (et −4) */
export const nb = (x: number) => {
  const s = String(arrondi(x)).replace('.', '{,}')
  return s.startsWith('-') ? '-' + s.slice(1) : s
}
/** Un relatif écrit avec son signe et ses parenthèses : (−3), (+5) */
export const rel = (x: number) => x < 0 ? `(-${nb(-x)})` : `(+${nb(x)})`
/** Une fraction (simplifiée ou non), en LaTeX */
export const frac = (n: number, d: number) => {
  if (d < 0) { n = -n; d = -d }
  if (d === 1) return nb(n)
  return (n < 0 ? '-' : '') + `\\frac{${Math.abs(n)}}{${d}}`
}
export const irreductible = (n: number, d: number) => { const g = pgcd(n, d) || 1; return frac(n / g, d / g) }
export const unite = (x: string, u: string) => `${x}\\text{ ${u}}`
export const deg = (x: number) => `${nb(x)}°`
/** Une réponse en mots (avec, au besoin, des $…$) */
export const mot = (t: string) => '§' + t
export const tableau = (l1: string[], l2: string[]) => `\\begin{array}{|${'c|'.repeat(l1.length)}}\\hline ${l1.join(' & ')} \\\\ \\hline ${l2.join(' & ')} \\\\ \\hline\\end{array}`

// =============================================================
// LES QUESTIONS À TROU
// Une égalité ou une phrase à compléter : l'élève écrit le nombre qui
// manque. Les pointillés changent de place d'un tirage à l'autre
// (24 = 3 × …, 24 = … × 8, … = 3 × 8). Les automatismes dont la
// question est déjà « Compléter… » la reprennent telle quelle.
// =============================================================
export const aTrou = (enonce: string, reponse: string): Question => ({ enonce, reponse, faux: [] })
export const mille = (k: number) => k === 1000 ? '1\\,000' : String(k)
export const terme = (k: number) => k === 1 ? 'x' : `${k}x`
/** Une question à trou dont les pointillés changent de place : l'une
 *  des écritures, tirée au hasard, après la consigne (« Compléter : »
 *  par défaut) */
export const unTrou = (consigne: string, ecritures: [string, string][]): Question => {
  const [e, r] = choix(ecritures)
  return aTrou(`${consigne || 'Compléter :'} ${e}`, r)
}

// =============================================================
// LES QUESTIONS DE COURS (5e)
// Une définition, une propriété, le vocabulaire : on les apprend, on
// ne les calcule pas. Chaque NOTION se pose de plusieurs façons (une
// question, une phrase à compléter, la notion dans l'autre sens…), et
// RIEN N'EST FIXE : chaque façon tire au hasard ses nombres, les noms
// des points ou l'objet dont on parle. La réponse attendue est courte ;
// la correction l'écrit telle quelle. Aucune ne se réussit avec une
// chance sur deux.
// =============================================================
/** Une façon de poser la notion : son énoncé et la réponse attendue (en mots, avec $…$) */
export type Facon = () => [string, string]
export interface QuestionCours { id: string; theme: string; titre: string; facons: Facon[]; poser: () => Question }
/** Les notions d'un thème ; `niveau` (« 4e-… ») distingue leurs id de celles de 5e */
export const notions = (theme: string, liste: [string, ...Facon[]][], niveau = ''): QuestionCours[] =>
  liste.map(([titre, ...facons], i) => ({
    id: `cours-${niveau}${theme}-${i + 1}`, theme, titre, facons,
    poser: () => { const [enonce, reponse] = choix(facons)(); return { enonce, reponse: mot(reponse) } },
  }))
/** Une des phrases, tirée au hasard */
export const une = (...t: [string, string][]): [string, string] => choix(t)

// Des noms de points tirés au hasard (jamais O, réservé aux centres)
export const TRIANGLES = ['ABC', 'DEF', 'EFG', 'IJK', 'KLM', 'MNP', 'RST', 'UVW', 'GHI']
export const QUADRILATERES = ['ABCD', 'EFGH', 'IJKL', 'KLMN', 'MNPQ', 'RSTU', 'TUVW']
export const LETTRES = [...'ABCDEFGHIJKLMNPRSTUVW']
export const tri = () => [...choix(TRIANGLES)]
export const quad = () => [...choix(QUADRILATERES)]
export const pt = () => choix(LETTRES)
/** n noms de points, tous différents */
export const pts = (n: number) => melange(LETTRES).slice(0, n)
export const deuxPts = () => pts(2)
export const ang = (s: string) => `\\widehat{${s}}`
export const OBJETS = ['cahiers', 'stylos', 'croissants', 'places de cinéma', 'tickets de bus', 'baguettes']

// =============================================================
// LES AUTOMATISMES (4e)
// Rangés comme la liste officielle des automatismes de 4e (programme
// 2026), avec quelques objectifs de l'année en « hors liste officielle ».
// Mêmes règles qu'en 5e : réponse courte, jamais une chance sur deux,
// des valeurs tirées au hasard à chaque question, et souvent une
// question à trou dont les pointillés changent de place.
// =============================================================
/** Un relatif en début de calcul : −7 ou 12 (sans parenthèses) */
export const seul = (x: number) => nb(x)
/** Un entier relatif non nul */
export const relNonNul = (a: number, b: number) => { let x: number; do { x = ent(-b, b) } while (x === 0 || Math.abs(x) < a); return x }
export const cm3 = (v: string) => `${v}\\text{ cm}^3`
export const cm2 = (v: string) => `${v}\\text{ cm}^2`
export const piFois = (k: number) => k === 1 ? '\\pi' : `${k}\\pi`
export const coord = (x: number, y: number) => `(${nb(x)}\\,;\\,${nb(y)})`
/** Un nombre avec l'espace des milliers : 12\,000 */
export const grandNb = (x: number) => { const [e, d] = nb(x).split('{,}'); return e.replace(/\B(?=(\d{3})+(?!\d))/g, '\\,') + (d !== undefined ? '{,}' + d : '') }
export const lettre = () => choix(['x', 'a', 'y', 'n', 't'])
export const PRENOMS = ['Léa', 'Tom', 'Inès', 'Hugo', 'Jade', 'Noah', 'Lina', 'Sami', 'Chloé', 'Yanis']
export const etL = (t: string[]) => t.length < 2 ? t.join('') : `${t.slice(0, -1).join(', ')} et ${t[t.length - 1]}`
