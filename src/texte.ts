// =============================================================
// LE TEXTE TAPÉ AU CLAVIER
// L'outil Texte (touche T) pose un texte qu'on tape directement sur la
// page : des lignes, du gras, de l'italique, du souligné, les couleurs de
// la barre, des puces, et des formules au milieu des phrases, tapées entre
// deux $ (rendues par KaTeX, comme l'outil Formule).
// Un texte est une formule qui porte en plus le champ facultatif `texte`
// (ses lignes) et, s'il a une largeur choisie, `largeur` : tout ce qui sait
// prendre, déplacer, agrandir, tourner, copier, ranger dans l'ordre et
// peindre une formule (l'écran, les vignettes, le PDF, le replay) le sait
// donc pour un texte. Son champ latex garde une version KaTeX du même
// texte : une version d'avant, qui ignore `texte`, l'affiche comme une
// formule, sans rien perdre du classeur.
// Ici : le modèle (pur, testé sous Node) et son rendu en HTML (le même à
// l'écran et dans le rendu caché des sorties : voir sorties/formules.ts).
// L'éditeur, posé sur la page pendant qu'on tape, est dans texte-editeur.ts.
// =============================================================
import type { Forme, Formule, LigneTexte, MorceauTexte } from './types'

/** La police d'un texte : celle qu'on trouve partout (Windows, Mac, l'iPad,
 *  et ses jumelles métriques ailleurs), pour qu'un texte à largeur choisie
 *  passe à la ligne au même mot sur le poste de la classe, dans la version
 *  hors ligne et dans le replay des élèves */
export const POLICE_TEXTE = "Arial, 'Helvetica Neue', Helvetica, 'Liberation Sans', Arimo, sans-serif"
/** La taille d'un texte neuf (unités monde) : « Normale », comme une formule */
export const TAILLE_TEXTE = 28
/** La plus petite largeur choisie (unités monde) : un cadre glissé plus
 *  étroit est un clic (le texte s'allonge alors avec ce qu'on tape) */
export const LARGEUR_MIN = 60
/** Au plus, ce que garde un texte (au-delà, la liste blanche du
 *  presse-papiers le refuse) */
export const LIGNES_MAX = 500
export const CARACTERES_MAX = 20_000

/** Une forme est-elle un texte (et pas une formule) ? */
export function estTexte(f: Forme | null | undefined): f is Formule & { texte: LigneTexte[] } {
  return !!f && f.type === 'formule' && Array.isArray(f.texte)
}

const memeStyle = (a: MorceauTexte, b: MorceauTexte) =>
  !a.f && !b.f && !!a.g === !!b.g && !!a.i === !!b.i && !!a.s === !!b.s && (a.c ?? '') === (b.c ?? '')

/** Un morceau propre : les seuls drapeaux qu'il a, à vrai */
function morceau(t: string, o: { g?: unknown; i?: unknown; s?: unknown; c?: unknown; f?: unknown }): MorceauTexte {
  const m: MorceauTexte = { t }
  if (o.f) m.f = true
  if (o.g) m.g = true
  if (o.i) m.i = true
  if (o.s) m.s = true
  if (typeof o.c === 'string' && COULEUR.test(o.c)) m.c = o.c.toLowerCase()
  return m
}

/** Les morceaux voisins du même style réunis, les morceaux vides ôtés (sauf
 *  une formule : elle est son propre morceau) */
export function fusionner(morceaux: readonly MorceauTexte[]): MorceauTexte[] {
  const r: MorceauTexte[] = []
  for (const m of morceaux) {
    if (!m.t) continue
    const d = r[r.length - 1]
    if (d && memeStyle(d, m)) r[r.length - 1] = { ...d, t: d.t + m.t }
    else r.push({ ...m })
  }
  return r
}

/** Les lignes d'un texte, sans les lignes vides de la fin ; null s'il n'y
 *  reste rien (un texte vidé s'en va, comme une formule effacée) */
export function nettoyer(lignes: readonly LigneTexte[]): LigneTexte[] | null {
  const r = lignes.map(l => {
    const n: LigneTexte = { morceaux: fusionner(l.morceaux) }
    if (l.puce) n.puce = true
    return n
  })
  const ecrite = (l: LigneTexte) => l.morceaux.some(m => m.t.trim())
  while (r.length && !ecrite(r[r.length - 1])) r.pop()
  return r.length ? r : null
}

const COULEUR = /^#[0-9a-fA-F]{6}$/

/** Le champ `texte` lu d'un objet venu d'ailleurs (le presse-papiers, un
 *  fichier) : une copie propre, ou null s'il n'est pas un texte valable */
export function lireTexte(v: unknown): LigneTexte[] | null {
  if (!Array.isArray(v) || !v.length || v.length > LIGNES_MAX) return null
  let n = 0
  const lignes: LigneTexte[] = []
  for (const l of v) {
    if (!l || typeof l !== 'object' || !Array.isArray((l as LigneTexte).morceaux)) return null
    const ms = (l as LigneTexte).morceaux
    if (ms.length > CARACTERES_MAX) return null
    const morceaux: MorceauTexte[] = []
    for (const m of ms) {
      if (!m || typeof m !== 'object' || typeof m.t !== 'string') return null
      if (m.c !== undefined && (typeof m.c !== 'string' || !COULEUR.test(m.c))) return null
      n += m.t.length
      if (n > CARACTERES_MAX || (m.f && m.t.length > 2000)) return null
      morceaux.push(morceau(m.t.replace(/[\r\n]/g, ' '), m))
    }
    const ligne: LigneTexte = { morceaux }
    if ((l as LigneTexte).puce) ligne.puce = true
    lignes.push(ligne)
  }
  return lignes
}

/** Le texte à plat : ce qu'on colle dans un autre logiciel, ce que lit la
 *  recherche. Une formule y garde ses $ ; une puce, son « • ». */
export function texteBrut(lignes: readonly LigneTexte[]): string {
  return lignes.map(l => (l?.puce ? '• ' : '') + morceauxDe(l).map(m => m.f ? `$${m.t}$` : m.t).join('')).join('\n')
}

/** Les lignes d'un texte à plat (un collage) : une formule entre $…$ y
 *  redevient une formule, « • » ou « - » en tête de ligne une puce */
export function lignesDuBrut(brut: string): LigneTexte[] {
  return brut.replace(/\r\n?/g, '\n').split('\n').map(l => {
    const puce = /^\s*[•·\-–]\s+/.exec(l)
    const reste = puce ? l.slice(puce[0].length) : l
    const ligne: LigneTexte = { morceaux: morceauxDuBrut(reste) }
    if (puce) ligne.puce = true
    return ligne
  })
}

/** Les morceaux d'une ligne à plat : ce qui est entre deux $ est une formule */
export function morceauxDuBrut(t: string): MorceauTexte[] {
  const r: MorceauTexte[] = []
  let i = 0
  for (const m of formulesDe(t)) {
    if (m.debut > i) r.push({ t: t.slice(i, m.debut) })
    r.push({ t: m.latex, f: true })
    i = m.fin
  }
  if (i < t.length) r.push({ t: t.slice(i) })
  return r
}

/** Les formules entre $…$ d'une ligne : où elles commencent (le premier $),
 *  où elles finissent (après le second) et leur LaTeX (non vide, sur une
 *  seule ligne) */
export function formulesDe(t: string): { debut: number; fin: number; latex: string }[] {
  // Les $ vont par deux, de gauche à droite, comme en LaTeX (« $ $ » vide ne
  // fait pas une formule de ce qui suit) ; pas au-delà d'une fin de ligne
  const r: { debut: number; fin: number; latex: string }[] = []
  let ouvert = -1
  for (let i = 0; i < t.length; i++) {
    if (t[i] === '\n') ouvert = -1
    if (t[i] !== '$') continue
    if (ouvert < 0) { ouvert = i; continue }
    const latex = t.slice(ouvert + 1, i).trim()
    if (latex) r.push({ debut: ouvert, fin: i + 1, latex })
    ouvert = -1
  }
  return r
}

/** Le texte en LaTeX, pour KaTeX : ce qu'affiche une version d'avant (qui
 *  ignore le champ texte) et ce que mesure une estimation. Le gras,
 *  l'italique, la couleur et les formules y sont ; le souligné, non. */
export function latexDuTexte(lignes: readonly LigneTexte[]): string {
  const echapper = (s: string) => s.replace(/[\\{}$&%#_^~]/g, c =>
    c === '\\' ? '\\textbackslash{}' : c === '^' ? '\\textasciicircum{}' : c === '~' ? '\\textasciitilde{}' : '\\' + c)
  const ligne = (l: LigneTexte) => {
    const corps = l.morceaux.map(m => {
      let s = m.f ? `$${m.t}$` : echapper(m.t)
      if (!m.f && m.g) s = `\\textbf{${s}}`
      if (!m.f && m.i) s = `\\textit{${s}}`
      if (m.c) s = `\\textcolor{${m.c}}{${s}}`
      return s
    }).join('')
    return (l.puce ? '\\bullet\\ ' : '') + `\\text{${corps || ' '}}`
  }
  const ls = lignes.map(ligne)
  return ls.length === 1 ? ls[0] : `\\begin{array}{l}${ls.join('\\\\')}\\end{array}`
}

/** Un texte neuf, à poser : ses lignes nettoyées, et son latex pour une
 *  version d'avant */
export function champsDuTexte(lignes: readonly LigneTexte[]): { texte: LigneTexte[]; latex: string } | null {
  const t = nettoyer(lignes)
  return t ? { texte: t, latex: latexDuTexte(t) } : null
}

/** Ce qui change le rendu HTML d'une formule ou d'un texte : la clé de
 *  l'élément de l'écran et du cache des sorties (sans la couleur) */
export function cleDuContenu(f: Formule): string {
  return estTexte(f) ? `T${f.largeur ?? ''}|${JSON.stringify(f.texte)}|${f.taille}` : `${f.latex}|${f.taille}`
}

// ---------- Le rendu HTML ----------
/** Écrit une formule (par KaTeX) ou un texte dans son élément (classe
 *  .formule, et .texte pour un texte ; sa largeur choisie). L'élément garde
 *  sa couleur et sa taille, que l'appelant pose. Un texte : une ligne par
 *  bloc ; chaque mot (avec l'espace qui le suit) dans son propre élément,
 *  qui porte son style : le rendu caché des sorties (sorties/formules.ts)
 *  peint chaque nœud de texte d'un seul tenant, sur une seule ligne, et lit
 *  le souligné sur son parent. */
export function ecrireContenu(f: Formule, el: HTMLElement, rendreFormule: (latex: string, el: HTMLElement) => void) {
  const texte = estTexte(f)
  el.classList.add('formule')
  el.classList.toggle('texte', texte)
  el.classList.toggle('large', texte && !!f.largeur)
  el.style.width = texte && f.largeur ? f.largeur + 'px' : ''
  if (!texte) { rendreFormule(f.latex || '\\square', el); return }
  el.replaceChildren(...f.texte.map(l => ligneRendue(l, rendreFormule)))
}

/** Les morceaux d'une ligne, tels qu'on peut les écrire : une ligne abîmée
 *  (un fichier venu d'ailleurs) s'écrit vide plutôt que d'arrêter l'écran */
const morceauxDe = (l: LigneTexte | null | undefined): MorceauTexte[] =>
  l && Array.isArray(l.morceaux) ? l.morceaux.filter(m => m && typeof m.t === 'string') : []

function ligneRendue(l: LigneTexte, rendreFormule: (latex: string, el: HTMLElement) => void): HTMLElement {
  const d = document.createElement('div')
  d.className = 'ligne'
  if (l?.puce) {
    d.classList.add('puce')
    const p = document.createElement('span'); p.className = 'marque-puce'; p.textContent = '•'
    d.appendChild(p)
  }
  const corps = document.createElement('span'); corps.className = 'corps'
  for (const m of morceauxDe(l)) {
    if (m.f) {
      const s = document.createElement('span'); s.className = 'math'
      if (m.c) s.style.color = m.c
      try { rendreFormule(m.t, s) } catch { s.textContent = m.t }
      corps.appendChild(s)
      continue
    }
    // Le mot et ses espaces en deux nœuds : le témoin de la ligne de base
    // que pose le rendu caché se met juste après le mot, jamais après une
    // espace de fin de ligne (qui passerait, elle, à la ligne suivante)
    for (const [, mot, espaces] of m.t.matchAll(/(\S*)(\s*)/g)) {
      if (!mot && !espaces) continue
      const s = document.createElement('span')
      appliquerStyle(s, m)
      if (mot) s.appendChild(document.createTextNode(mot))
      if (espaces) s.appendChild(document.createTextNode(espaces))
      corps.appendChild(s)
    }
  }
  // Une ligne vide garde sa hauteur
  if (!corps.childNodes.length) corps.appendChild(document.createElement('br'))
  d.appendChild(corps)
  return d
}

/** Le style d'un morceau sur un élément (le rendu, l'éditeur) */
export function appliquerStyle(s: HTMLElement, m: MorceauTexte) {
  if (m.g) s.style.fontWeight = '700'
  if (m.i) s.style.fontStyle = 'italic'
  if (m.s) s.style.textDecoration = 'underline'
  if (m.c) s.style.color = m.c
}

/** La taille d'une formule ou d'un texte avant toute mesure (une estimation,
 *  remplacée dès que le rendu est mesuré) */
export function tailleEstimee(f: Formule): { l: number; h: number } {
  if (!estTexte(f)) return { l: f.taille * Math.max(1, f.latex.length * 0.5), h: f.taille * 1.4 }
  const longueurs = f.texte.map(l => morceauxDe(l).reduce((n, m) => n + m.t.length, 0) + (l?.puce ? 2 : 0))
  const l = f.largeur ?? f.taille * 0.55 * Math.max(1, ...longueurs)
  const n = f.largeur ? longueurs.reduce((n, c) => n + Math.max(1, Math.ceil(c * f.taille * 0.55 / f.largeur!)), 0) : f.texte.length
  return { l: f.largeur ?? l + 8, h: Math.max(1, n) * f.taille * 1.3 + 4 }
}
