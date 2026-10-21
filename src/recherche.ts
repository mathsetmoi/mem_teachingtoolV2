// =============================================================
// LA RECHERCHE : LE CALCUL
// Ce que la recherche compare, sans l'écran : un texte mis à plat (sans
// accent ni majuscule), une formule LaTeX lue avec des mots simples
// (« racine », « fraction », « pi », « carré »…), et le contenu d'un
// classeur lu dans son document (les pages, leurs noms et numéros, leurs
// séances, les formules). La fenêtre de recherche (recherche-vue.ts) et la
// bibliothèque s'en servent ; l'écriture au stylo, elle, ne se recherche pas.
// Testé dans tests/recherche.test.ts.
// =============================================================
import type * as Y from 'yjs'
import type { SeanceDuClasseur } from './seances'
import { rangerLesPages } from './seances'
import type { LigneTexte } from './types'
import { texteBrut } from './texte'

/** Un texte mis à plat : minuscules, sans accent, les ligatures défaites,
 *  les espaces resserrés */
export function aplatir(t: string): string {
  return t.normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/œ/g, 'oe').replace(/æ/g, 'ae')
    .toLowerCase().replace(/[’']/g, ' ').replace(/\s+/g, ' ').trim()
}

/** Les mots d'un texte mis à plat (lettres et chiffres) */
function mots(t: string): string[] {
  return aplatir(t).split(/[^a-z0-9√π²³]+/).filter(Boolean)
}

// Les commandes LaTeX et ce qu'elles disent, en mots simples
const COMMANDES: Record<string, string> = {
  sqrt: 'racine carree √', frac: 'fraction quotient', dfrac: 'fraction quotient', tfrac: 'fraction quotient',
  pi: 'pi π', times: 'fois multiplication produit', cdot: 'fois multiplication produit', div: 'division divise',
  le: 'inferieur inegalite', leq: 'inferieur inegalite', leqslant: 'inferieur inegalite',
  ge: 'superieur inegalite', geq: 'superieur inegalite', geqslant: 'superieur inegalite',
  lt: 'inferieur inegalite', gt: 'superieur inegalite', neq: 'different', ne: 'different',
  approx: 'environ valeur approchee', simeq: 'environ', equiv: 'equivalent', pm: 'plus ou moins',
  in: 'appartient', notin: 'appartient pas', subset: 'inclus', subseteq: 'inclus', cup: 'union reunion', cap: 'intersection',
  emptyset: 'ensemble vide', varnothing: 'ensemble vide', infty: 'infini',
  overrightarrow: 'vecteur', vec: 'vecteur', widehat: 'angle', hat: 'angle', overline: 'barre', parallel: 'parallele', perp: 'perpendiculaire',
  sum: 'somme', prod: 'produit', int: 'integrale', lim: 'limite', log: 'logarithme', ln: 'logarithme', exp: 'exponentielle',
  sin: 'sinus trigonometrie', cos: 'cosinus trigonometrie', tan: 'tangente trigonometrie',
  alpha: 'alpha', beta: 'beta', gamma: 'gamma', delta: 'delta', Delta: 'delta discriminant', theta: 'theta', lambda: 'lambda', mu: 'mu', sigma: 'sigma', omega: 'omega',
  degree: 'degre degres', circ: 'degre degres', percent: 'pourcentage pourcent', '%': 'pourcentage pourcent',
  Rightarrow: 'implique donc', Leftrightarrow: 'equivalent', rightarrow: 'fleche tend vers', to: 'tend vers',
}
// Les ensembles de nombres (\mathbb{R}, ou ℝ tapé tel quel)
const ENSEMBLES: Record<string, string> = { N: 'entiers naturels', Z: 'entiers relatifs', D: 'decimaux', Q: 'rationnels', R: 'reels', C: 'complexes' }
const LETTRES_ENSEMBLES: Record<string, string> = { 'ℕ': 'N', 'ℤ': 'Z', '𝔻': 'D', 'ℚ': 'Q', 'ℝ': 'R', 'ℂ': 'C' }

/** Une formule LaTeX lue en mots, pour la retrouver : ses commandes dites
 *  simplement (\sqrt → « racine carrée »), ses puissances (² → « carré »),
 *  ses ensembles (ℝ → « réels »), puis ce qui est écrit (lettres, nombres) */
export function motsDeLatex(latex: string): string {
  const dits: string[] = []
  for (const m of latex.matchAll(/\\([A-Za-z]+|%)/g)) { const d = COMMANDES[m[1]]; if (d) dits.push(d) }
  for (const m of latex.matchAll(/\\mathbb\s*\{?\s*([A-Z])/g)) { const d = ENSEMBLES[m[1]]; if (d) dits.push(d) }
  for (const [l, e] of Object.entries(LETTRES_ENSEMBLES)) if (latex.includes(l)) dits.push(ENSEMBLES[e])
  if (/\^\s*\{?\s*2\b|²/.test(latex)) dits.push('carre au carre ²')
  if (/\^\s*\{?\s*3\b|³/.test(latex)) dits.push('cube ³')
  if (/\^/.test(latex)) dits.push('puissance exposant')
  if (latex.includes('√')) dits.push('racine carree')
  if (latex.includes('π')) dits.push('pi')
  if (latex.includes('%')) dits.push('pourcentage pourcent')
  if (/=/.test(latex)) dits.push('egal egalite')
  // Ce qui est écrit, sans les commandes
  const ecrit = latex.replace(/\\[A-Za-z]+/g, ' ').replace(/[{}^_\\]/g, ' ')
  return aplatir(dits.join(' ') + ' ' + ecrit)
}

/** Ce que rend la comparaison : un score (plus haut, mieux), null si un
 *  des mots cherchés manque */
export function score(requete: string, texte: string): number | null {
  const q = mots(requete)
  if (!q.length) return null
  const t = mots(texte)
  if (!t.length) return null
  let s = 0
  for (const m of q) {
    let meilleur = 0
    t.forEach((w, i) => {
      // Le mot entier, le début d'un mot, puis un morceau (3 lettres au moins)
      const v = w === m ? 3 : w.startsWith(m) ? 2 : m.length >= 3 && w.includes(m) ? 1 : 0
      // Un peu mieux au début du texte (le nom avant le détail)
      if (v) meilleur = Math.max(meilleur, v + (i === 0 ? 0.5 : 0) - Math.min(i, 20) * 0.01)
    })
    if (!meilleur) return null
    s += meilleur
  }
  return s
}

/** Les morceaux d'un texte à mettre en évidence pour la requête (le début
 *  des mots cherchés), pour l'affichage : [avant, trouvé, après, trouvé…] */
export function morceaux(texte: string, requete: string): { t: string; trouve: boolean }[] {
  const q = mots(requete).filter(m => m.length)
  if (!q.length) return [{ t: texte, trouve: false }]
  // On compare caractère à caractère sur la version à plat (même longueur
  // que le texte d'origine, lettre par lettre)
  const plat = [...texte].map(c => aplatir(c) || ' ')
  const marque = new Array(plat.length).fill(false)
  const bas = plat.map(c => c[0] ?? ' ').join('')
  for (const m of q) {
    let i = bas.indexOf(m)
    while (i >= 0) {
      const debutDeMot = i === 0 || !/[a-z0-9]/.test(bas[i - 1])
      if (debutDeMot || m.length >= 3) { for (let k = i; k < i + m.length; k++) marque[k] = true }
      i = bas.indexOf(m, i + 1)
    }
  }
  const r: { t: string; trouve: boolean }[] = []
  const lettres = [...texte]
  lettres.forEach((c, k) => {
    const d = r[r.length - 1]
    if (d && d.trouve === marque[k]) d.t += c
    else r.push({ t: c, trouve: marque[k] })
  })
  return r
}

// ---------- Le contenu d'un classeur ----------

export interface PageLue {
  id: string
  /** Son nom donné (null : sans nom) */
  nom: string | null
  /** Son numéro dans sa séance (à partir de 1), ou dans le classeur */
  numero: number
  seance: { id: string; debut: number; nom: string | null } | null
}
/** Ce qu'on cherche dans une formule (ses mots, voir motsDeLatex) ou dans
 *  un texte (ses mots tels qu'il les écrit, et ceux de ses formules) */
export function motsDeFormule(f: { latex: string; texte?: string }): string {
  return f.texte !== undefined ? `${f.texte} ${motsDeLatex(f.texte.match(/\$[^$]*\$/g)?.join(' ') ?? '')}` : motsDeLatex(f.latex)
}

/** Une formule écrite sur une page ; texte : un texte tapé (l'outil Texte),
 *  à plat (voir texte.ts), qu'on cherche mot à mot */
export interface FormuleLue { id: string; page: string; latex: string; texte?: string }
export interface ContenuClasseur {
  pages: PageLue[]
  formules: FormuleLue[]
  seances: { id: string; debut: number; nom: string | null; pages: number }[]
}

/** Le contenu d'un classeur, lu dans son document (ouvert ou non) : les
 *  pages de l'ordre (pas celles de la corbeille), numérotées dans leur
 *  séance, et les formules écrites dessus. seances : le rangement par séance
 *  déjà fait (le tableau ouvert, dont les séances peuvent être encore en
 *  attente, voir Tableau.seancesDuClasseur) ; sans lui, celui du document. */
export function lireContenu(doc: Y.Doc, seances?: readonly SeanceDuClasseur[]): ContenuClasseur {
  const ordre = (doc.getArray('ordre').toArray() as unknown[]).filter((x): x is string => typeof x === 'string')
  const pages = doc.getMap('pages') as Y.Map<Y.Map<unknown>>
  const noms = doc.getMap('nomsPages') as Y.Map<unknown>
  const seanceDes = doc.getMap('seanceDesPages') as Y.Map<unknown>
  const rangees = seances ?? rangerLesPages(ordre, doc.getMap('seances').entries(), p => seanceDes.get(p))
  const r: ContenuClasseur = { pages: [], formules: [], seances: [] }
  const seanceDe = new Map<string, { s: (typeof rangees)[number]; n: number }>()
  for (const s of rangees) s.pages.forEach((p, i) => seanceDe.set(p, { s, n: i + 1 }))
  for (const s of rangees) if (s.pages.length) r.seances.push({ id: s.id, debut: s.debut, nom: s.nom, pages: s.pages.length })
  ordre.forEach((id, i) => {
    const nom = noms.get(id)
    const ici = seanceDe.get(id)
    r.pages.push({ id, nom: typeof nom === 'string' && nom.trim() ? nom.trim() : null, numero: ici ? ici.n : i + 1,
      seance: ici ? { id: ici.s.id, debut: ici.s.debut, nom: ici.s.nom } : null })
    const formes = pages.get(id)?.get?.('formes') as Y.Map<unknown> | undefined
    if (!formes || typeof formes.forEach !== 'function') return
    formes.forEach((f, fid) => {
      const o = f as { type?: unknown; latex?: unknown; texte?: unknown }
      if (!o || o.type !== 'formule' || typeof o.latex !== 'string') return
      if (Array.isArray(o.texte)) r.formules.push({ id: fid, page: id, latex: o.latex, texte: texteBrut(o.texte as LigneTexte[]) })
      else if (o.latex.trim()) r.formules.push({ id: fid, page: id, latex: o.latex })
    })
  })
  return r
}

/** La date d'une séance, en mots : « mardi 20 octobre 2026 » (et aussi
 *  « 20/10 », pour la retrouver tapée en chiffres) */
export function dateEnMots(t: number): string {
  const d = new Date(t)
  const jour = d.toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })
  return `${jour} ${d.getDate()}/${d.getMonth() + 1}`
}
