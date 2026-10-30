// =============================================================
// LE RÉSUMÉ D'UNE SÉANCE
// L'outil résume tout seul ce qui a été fait pendant une séance, sans
// internet : ses pages (leur nom, la minute où l'on y est arrivé), le texte
// tapé au clavier, les figures, la calculatrice, et ce qui a été posé d'un
// coup (un flash d'automatismes, une démonstration du catalogue, des pages
// d'un PDF), que le tableau note au moment où on le pose (Tableau.noterActivite :
// les séances d'avant n'en ont pas, leur résumé se fait sans). L'écriture à
// la main ne se lit pas : c'est ce que la rédaction par Gemini ajoute
// (voir gemini.ts), dans la version en ligne.
//
// Ce qu'on en tire :
// - la fiche de la séance (la trieuse, « Bonjour ! ») : une ligne de ce qui
//   a été fait ;
// - le texte du cahier de textes (Publier, « Copier pour Pronote ») : rédigé
//   par l'outil (le secours), ou par Gemini ; le professeur peut le corriger,
//   il est gardé avec la séance (Tableau.textesCahier).
//
// Ce fichier est pur (ni interface ni base) : il se teste sous Node.
// =============================================================
import type { Forme, LigneTexte } from '../types'

/** Ce qui a été posé d'un coup sur une page. t : quand (Date.now()) */
export interface Activite { t: number; page: string; type: 'flash' | 'demonstration' | 'dessin' | 'pdf'; titre: string }

/** Le texte du cahier de textes d'une séance, gardé dans le document. par :
 *  qui l'a écrit en dernier (l'outil, Gemini, ou le professeur qui l'a
 *  corrigé) ; gestes : le nombre d'étapes du film de la séance quand il a été
 *  rédigé (la séance a continué depuis : on le rédige à nouveau, sauf s'il
 *  est du professeur) */
export interface TexteCahier { texte: string; par: 'outil' | 'gemini' | 'professeur'; quand: number; gestes?: number }

/** Une activité qui se lit (un document abîmé, une autre version) */
export function activiteValable(v: unknown): v is Activite {
  const a = v as Activite | null
  return !!a && typeof a === 'object' && typeof a.t === 'number' && typeof a.page === 'string' && typeof a.titre === 'string'
    && ['flash', 'demonstration', 'dessin', 'pdf'].includes(a.type)
}

/** Une page de la séance, telle que le résumé la voit */
export interface PageResumee {
  id: string
  /** Son numéro dans la séance (à partir de 1) */
  numero: number
  nom: string | null
  /** Quand on y a écrit pour la première fois pendant la séance, en ms
   *  depuis son début (null : on n'y a pas écrit) */
  minute: number | null
  /** Les textes tapés au clavier, de haut en bas, une ligne chacun */
  textes: string[]
  traits: number
  figures: number
  images: number
  calculatrice: boolean
  /** Reprise d'une autre séance : « de lundi » */
  reprise: string | null
}

/** Ce qu'on sait d'une séance pour la résumer */
export interface FicheDeSeance {
  debut: number
  /** Le dernier geste de la séance */
  fin: number
  chapitre: string
  pages: PageResumee[]
  activites: Activite[]
}

const JOURS = ['Dimanche', 'Lundi', 'Mardi', 'Mercredi', 'Jeudi', 'Vendredi', 'Samedi']
const MOIS = ['janvier', 'février', 'mars', 'avril', 'mai', 'juin', 'juillet', 'août', 'septembre', 'octobre', 'novembre', 'décembre']
/** « Lundi 26 octobre » */
export function jourDit(t: number): string {
  const d = new Date(t)
  return `${JOURS[d.getDay()]} ${d.getDate()} ${MOIS[d.getMonth()]}`
}

// ---------- Ce qui est écrit sur une page ----------
/** Les commandes LaTeX les plus courantes, en caractères ordinaires : le
 *  texte du cahier de textes se lit sans KaTeX */
const SIGNES: [RegExp, string][] = [
  [/\\mathbb\{N\}/g, 'ℕ'], [/\\mathbb\{Z\}/g, 'ℤ'], [/\\mathbb\{D\}/g, '𝔻'], [/\\mathbb\{Q\}/g, 'ℚ'], [/\\mathbb\{R\}/g, 'ℝ'],
  [/\\sqrt\{([^{}]*)\}/g, '√$1'], [/\\frac\{([^{}]*)\}\{([^{}]*)\}/g, '$1/$2'], [/\\times/g, '×'], [/\\div/g, '÷'],
  [/\\leq?(?![a-z])/g, '≤'], [/\\geq?(?![a-z])/g, '≥'], [/\\neq?(?![a-z])/g, '≠'], [/\\notin/g, '∉'], [/\\in(?![a-z])/g, '∈'],
  [/\\subset(?![a-z])/g, '⊂'], [/\\pi(?![a-z])/g, 'π'], [/\\infty/g, '∞'], [/\\cdot/g, '·'], [/\\approx/g, '≈'],
  [/\^\{?2\}?/g, '²'], [/\^\{?3\}?/g, '³'], [/\\(left|right)/g, ''], [/\\[,;:! ]/g, ' '], [/\\text\{([^{}]*)\}/g, '$1'],
]
export function latexLisible(latex: string): string {
  let s = latex
  for (const [re, r] of SIGNES) s = s.replace(re, r)
  return s.replace(/\\[a-zA-Z]+/g, '').replace(/[{}]/g, '').replace(/\s+/g, ' ').trim()
}

/** Une ligne d'un texte tapé, en clair */
export function ligneLisible(l: LigneTexte): string {
  return l.morceaux.map(m => m.f ? latexLisible(m.t) : m.t).join('').replace(/\s+/g, ' ').trim()
}

/** Ce qu'il y a sur une page : ses textes tapés (de haut en bas : la
 *  première ligne de chaque texte), ses traits, ses figures, ses images */
export function contenuDeLaPage(formes: readonly Forme[]): Pick<PageResumee, 'textes' | 'traits' | 'figures' | 'images' | 'calculatrice'> {
  const textes: { y: number; x: number; t: string }[] = []
  let traits = 0, figures = 0, images = 0, calculatrice = false
  for (const f of formes) {
    if (f.type === 'trait' || f.type === 'segment') traits++
    else if (f.type === 'polygone' || f.type === 'cercle') figures++
    else if (f.type === 'image') { if (f.calculatrice) calculatrice = true; else images++ }
    else if (f.type === 'formule' && f.texte?.length) {
      const t = f.texte.map(ligneLisible).find(x => x)
      if (t) textes.push({ y: f.y, x: f.x, t })
    }
  }
  textes.sort((a, b) => (a.y - b.y) || (a.x - b.x))
  return { textes: textes.map(x => x.t), traits, figures, images, calculatrice }
}

// ---------- Le nom d'une page ----------
const court = (t: string, n = 60) => { const c = [...t]; return c.length > n ? c.slice(0, n - 1).join('').trimEnd() + '…' : t }

/** Le nom que l'outil propose pour une page sans nom : ce qui y a été posé
 *  d'un coup (le flash, la démonstration, la page du PDF), sinon le premier
 *  texte tapé ; null : rien à proposer */
export function nomPropose(p: Pick<PageResumee, 'id' | 'textes'>, activites: readonly Activite[]): string | null {
  const a = activites.find(x => x.page === p.id)
  if (a) return court(a.titre)
  return p.textes.length ? court(p.textes[0]) : null
}

/** Ce qui dit une page dans le résumé : son nom, sinon le nom proposé */
const libelleDeLaPage = (p: PageResumee, activites: readonly Activite[]) => p.nom ?? nomPropose(p, activites)

// ---------- Ce qui a été fait ----------
/** Ce qui a été fait, dans l'ordre de la séance, sans doublon : ce qui a été
 *  posé d'un coup, et le nom de chaque page (ou le nom proposé) */
export function faitEnClasse(f: FicheDeSeance): string[] {
  const vus = new Set<string>(), r: string[] = []
  const ajouter = (t: string | null) => {
    if (!t) return
    const k = t.toLowerCase()
    if (vus.has(k)) return
    vus.add(k); r.push(t)
  }
  for (const p of f.pages) {
    for (const a of f.activites) if (a.page === p.id) ajouter(a.titre)
    // Le nom de la page, sinon son premier texte tapé (l'énoncé d'un exercice
    // posé sous la page d'un PDF)
    ajouter(p.nom ?? (p.textes.length ? court(p.textes[0]) : null))
  }
  return r
}

/** Les petites étiquettes de la fiche : ce qui a été posé, la calculatrice */
export function etiquettes(f: FicheDeSeance): string[] {
  const r = f.activites.map(a => a.titre)
  if (f.pages.some(p => p.calculatrice)) r.push('Calculatrice')
  const figures = f.pages.reduce((s, p) => s + p.figures, 0)
  if (figures) r.push(figures > 1 ? `${figures} figures` : '1 figure')
  return [...new Set(r)]
}

/** Une ligne pour « Bonjour ! » et la trieuse : « Flash : 5 questions ·
 *  √2 n'est pas rationnel · Exercice 12 p. 42 » (null : rien à dire) */
export function ligneDeResume(f: FicheDeSeance, max = 4): string | null {
  const l = faitEnClasse(f)
  if (!l.length) return null
  return l.length > max ? l.slice(0, max).join(' · ') + ' …' : l.join(' · ')
}

/** La durée dite : « 55 min », « 1 h 10 » */
export function dureeDite(ms: number): string {
  const m = Math.max(1, Math.round(ms / 60_000))
  return m < 60 ? `${m} min` : `${Math.floor(m / 60)} h${m % 60 ? ' ' + String(m % 60).padStart(2, '0') : ''}`
}

/** « 9:40 » : la minute d'une page dans la séance */
export function minuteDite(ms: number): string {
  const s = Math.max(0, Math.round(ms / 1000))
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`
}

const majuscule = (t: string) => t.charAt(0).toUpperCase() + t.slice(1)
const minusculeSaufSigle = (t: string) => /^[A-ZÀ-Ý]{2}/.test(t) ? t : t.charAt(0).toLowerCase() + t.slice(1)

/** Le texte du cahier de textes, rédigé par l'outil (sans internet) :
 *  « Lundi 26 octobre · Ensembles de nombres », puis « Fait en classe : … ».
 *  C'est aussi le secours quand Gemini ne répond pas. */
export function texteCahierDeLOutil(f: FicheDeSeance): string {
  const tete = `${jourDit(f.debut)} · ${f.chapitre}`
  const l = faitEnClasse(f)
  if (!l.length) {
    const n = f.pages.length
    return `${tete}\nFait en classe : ${n > 1 ? `${n} pages` : 'une page'} au tableau (voir le replay).`
  }
  return `${tete}\nFait en classe : ${l.map((x, i) => i ? minusculeSaufSigle(x) : majuscule(x)).join(' ; ')}.`
}

/** Le texte copié pour Pronote : le texte du cahier de textes, puis le lien
 *  du replay et ses pages (comme avant) */
export function texteAvecLeLien(texte: string, lien: string, pages: string): string {
  const t = texte.trim()
  return `${t ? t + '\n' : ''}Revoir la séance : ${lien}${pages}`
}

// ---------- Ce qu'on demande à Gemini ----------
/** La consigne envoyée à Gemini avec les images des pages : ce que l'outil
 *  sait déjà (le chapitre, la date, les pages et ce qui y a été posé), et la
 *  forme du texte attendu */
export function consigneGemini(f: FicheDeSeance, niveau: string | null): string {
  const pages = f.pages.map(p => {
    const bits = [libelleDeLaPage(p, f.activites), ...f.activites.filter(a => a.page === p.id && a.titre !== libelleDeLaPage(p, f.activites)).map(a => a.titre)]
      .filter(Boolean)
    return `- page ${p.numero}${bits.length ? ' : ' + bits.join(' ; ') : ''}${p.reprise ? ` (reprise de la séance ${p.reprise})` : ''}${p.calculatrice ? ' (calculatrice utilisée)' : ''}`
  }).join('\n')
  return [
    'Tu aides un professeur de mathématiques à remplir le cahier de textes de Pronote.',
    `Les images jointes sont les ${f.pages.length > 1 ? `${f.pages.length} pages` : 'pages'} du tableau de la séance du ${jourDit(f.debut).toLowerCase()}${niveau ? `, en ${niveau}` : ''}, chapitre « ${f.chapitre} », dans l'ordre.`,
    'Ce que l\'outil sait déjà :',
    pages,
    '',
    'Écris le texte du cahier de textes, en français, comme un professeur l\'écrit pour ses élèves et leurs parents :',
    '- une ligne qui commence par « Fait en classe : », qui dit les notions vues, les définitions, propriétés et démonstrations, et les exercices (avec leur numéro et leur page du manuel quand ils sont écrits au tableau) ;',
    '- s\'il est écrit au tableau un travail à faire pour la prochaine fois, une ligne qui commence par « À faire : » ; sinon, pas de ligne « À faire ».',
    'Au plus 4 lignes en tout. Pas de titre, pas de date, pas de formule de politesse, pas de mise en forme (ni astérisques, ni dièses).',
    'Écris les mathématiques en caractères simples (√2, x², ≤, ℝ, 3/4), sans LaTeX.',
    'N\'invente rien : seulement ce qui se voit sur les pages. N\'écris jamais un prénom ou un nom d\'élève.',
  ].join('\n')
}

/** Le texte rendu par Gemini, mis au propre : sans mise en forme, sans
 *  lignes vides, et la date et le chapitre en tête (comme le texte de
 *  l'outil) */
export function texteCahierDeGemini(f: FicheDeSeance, brut: string): string | null {
  const lignes = brut.replace(/\r/g, '').split('\n')
    .map(l => l.replace(/^\s*[-*•#>]+\s*/, '').replace(/\*\*|__|`/g, '').replace(/\s+/g, ' ').trim())
    .filter(Boolean)
  if (!lignes.length) return null
  return `${jourDit(f.debut)} · ${f.chapitre}\n${lignes.slice(0, 6).join('\n')}`
}
