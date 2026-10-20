// =============================================================
// REPRENDRE UN ANCIEN TABLEAU (.prof)
// Un ancien tableau est UNE séance : ses pages, et, quand il a été rangé
// dans un dossier, tout son film (chaque geste à son heure). On en fait une
// séance d'un classeur : un classeur neuf, ou le classeur ouvert, au bout de
// ses séances (voir classeurs/fichiers.ts, ouvrirAnciens).
//
// Le fichier : du JSON, { name, enregistreLe?, data: { pages, assets,
// currentBgIndex… } }. Chaque page a ses objets rangés par familles
// (freehands, images, texts…), et son film : filmArchive puis film, une
// suite d'états. Le premier état est entier ; chacun des suivants dit, pour
// chaque famille qui a bougé, soit tout son contenu (un tableau), soit ce
// qui s'ajoute au bout ({ '+': [...] }) ; t : son heure (Date.now()).
//
// Ce qui se reprend :
// - les traits (freehands) : des traits, avec leur pression ; le surligneur
//   reste un surligneur (en transparence, comme ici) ;
// - les images : des images, à leur place, à leur taille, tournées comme
//   elles l'étaient ; une image rognée devient l'image de la partie gardée
//   (comme « Rogner » ici) ; une image posée en fond est fixée en fond ;
// - les textes : des formules (\text{…}), à leur place, de leur couleur et
//   de leur taille ; la mise en forme (gras, listes, bulles) se perd ;
// - le film : chaque geste devient une étape du film, à son heure, sur sa
//   page. « Revoir la construction » et Publier le rejouent comme une
//   séance écrite ici.
// Le reste (figures, courbes, post-its) n'est pas repris : le bilan le
// compte, rien ne disparaît sans qu'on le dise.
// Le tableau est décalé pour que ce qui est écrit commence en haut à
// gauche de la page (on écrivait autour du centre de l'écran).
//
// Pur (ni interface ni base) : se teste sous Node. Ce qui demande le
// navigateur (lire une image, la rogner) est donné par l'appelant.
// =============================================================
import type { Tableau } from '../document'
import { ORIGINE_LOCALE } from '../document'
import type { Fond, Forme, Formule, ImageForme, Trait } from '../types'
import { uid } from '../types'

export const EXTENSION_ANCIEN = '.prof'

/** Les familles d'objets d'un ancien tableau */
const FAMILLES = ['points', 'segments', 'circles', 'rectangles', 'texts', 'freehands', 'curves', 'polygons', 'images', 'arcs', 'htmlPostits'] as const
type Famille = typeof FAMILLES[number]
/** Celles qui se reprennent */
const REPRISES: readonly Famille[] = ['freehands', 'images', 'texts']

/** Les fonds d'un ancien tableau, dans son ordre, et ce qu'ils deviennent :
 *  le Seyès avec marge et la copie double perdent leur marge */
const FONDS: Fond[] = ['blanc', 'carreaux', 'seyes', 'seyes', 'carreaux', 'millimetre', 'pointe', 'iso']

/** L'opacité du surligneur, comme celui d'ici (voir App, case 'surligneur') */
const OPACITE_SURLIGNEUR = 0.35

type Objet = Record<string, unknown> & { id?: unknown }
type Etat = Record<Famille, Objet[]>
type Pas = Partial<Record<Famille, Objet[] | { '+'?: Objet[] }>> & { t?: unknown }

/** Une page d'un ancien tableau : ses états, dans l'ordre, chacun à son
 *  heure ; le dernier est la page telle qu'elle a été enregistrée */
interface PageAncienne { etats: { t: number; etat: Etat }[] }

export interface AncienTableau {
  /** Son nom (celui du tableau, sinon du fichier) */
  nom: string
  /** L'heure de son premier geste (ou de son enregistrement, sans film) */
  debut: number
  /** L'heure de son dernier geste */
  fin: number
  fond: Fond
  pages: PageAncienne[]
  /** Les images : leur référence → leurs données (data:…) */
  sources: Map<string, string>
  /** Il a un film (sinon, chaque page paraît d'un coup) */
  film: boolean
}

/** Ce qui a été repris, et ce qui ne l'a pas été */
export interface BilanAncien {
  pages: number
  traits: number
  images: number
  textes: number
  /** Les objets qui ne se reprennent pas (figures, courbes, post-its),
   *  comptés une fois chacun, qu'ils soient restés ou non */
  laisses: number
  /** Des images qui n'ont pas pu être lues */
  imagesIllisibles: number
}

/** La partie gardée d'une image, en pixels de l'image */
export interface Rognure { x: number; y: number; l: number; h: number }
/** Lit une image (et la rogne) : ses données et sa taille en pixels ; null si
 *  elle ne se lit pas. Dans le navigateur, une image et un canevas. */
export type PreparerImage = (donnees: string, rognure: Rognure | null) => Promise<{ donnees: string; l: number; h: number } | null>

export class ErreurAncien extends Error {}
export const PAS_UN_ANCIEN = 'Ce fichier n\'est pas un ancien tableau (.prof) qu\'on sait lire.'

const nombre = (v: unknown, d = 0) => typeof v === 'number' && Number.isFinite(v) ? v : d
const heure = (v: unknown) => typeof v === 'number' && Number.isFinite(v) && v > 0 ? v : null

// ---------- Lire ----------
/** Un ancien tableau lu et vérifié, avec tous ses états. ErreurAncien : ce
 *  n'en est pas un. */
export function lireAncienTableau(texte: string, nomFichier = ''): AncienTableau {
  let o: unknown
  try { o = JSON.parse(texte) } catch { throw new ErreurAncien(PAS_UN_ANCIEN) }
  const r = o && typeof o === 'object' ? o as Record<string, unknown> : null
  const data = r && r.data && typeof r.data === 'object' ? r.data as Record<string, unknown> : null
  if (!data || !Array.isArray(data.pages) || !data.pages.length) throw new ErreurAncien(PAS_UN_ANCIEN)
  // Le nom du fichier d'abord : c'est celui que le professeur voit (le nom
  // gardé dedans peut être resté celui d'avant un renommage)
  const nom = nomFichier.replace(/^.*[\\/]/, '').replace(/\.prof$/i, '').trim()
    || (typeof r!.name === 'string' && r!.name.trim()) || (typeof data.nomDuTableau === 'string' && data.nomDuTableau.trim()) || 'Ancien tableau'
  const enregistre = heure(r!.enregistreLe) ?? heure(data.enregistreLe) ?? Date.now()
  const sources = new Map<string, string>()
  if (data.assets && typeof data.assets === 'object') {
    for (const [k, v] of Object.entries(data.assets as Record<string, unknown>)) if (typeof v === 'string' && v.startsWith('data:image/')) sources.set(k, v)
  }
  const fond = FONDS[nombre(data.currentBgIndex)] ?? 'blanc'
  let film = false
  const pages: PageAncienne[] = data.pages.map((p: unknown) => {
    const page = p && typeof p === 'object' ? p as Record<string, unknown> : {}
    const pas = ([] as unknown[]).concat(Array.isArray(page.filmArchive) ? page.filmArchive : [], Array.isArray(page.film) ? page.film : [])
      .filter((x): x is Pas => !!x && typeof x === 'object' && !Array.isArray(x))
    const etats: PageAncienne['etats'] = []
    let cour: Etat | null = null
    let t = 0
    for (const x of pas) {
      cour = appliquer(cour, x)
      t = Math.max(t, heure(x.t) ?? t)
      etats.push({ t, etat: cour })
    }
    // Les étapes d'avant la première heure connue prennent celle-ci
    const premiere = etats.find(e => e.t > 0)?.t ?? 0
    for (const e of etats) if (!e.t) e.t = premiere
    if (etats.length > 1) film = true
    // La page enregistrée fait foi : si le film ne s'y termine pas (pas de
    // film, ou un film coupé), elle est le dernier état (0 : sans heure)
    const finale = etatDe(page)
    if (!cour || !memesObjets(cour, finale)) etats.push({ t: etats.length ? etats[etats.length - 1].t : 0, etat: finale })
    return { etats }
  })
  // Une page sans aucune heure (sans film) était là dès le début de la
  // séance : elle paraît avec le premier geste du tableau (sans film du
  // tout, à son enregistrement)
  const connues = pages.flatMap(p => p.etats.map(e => e.t)).filter(t => t > 0)
  const premiere = connues.length ? Math.min(...connues) : enregistre
  for (const p of pages) for (const x of p.etats) if (!x.t) x.t = premiere
  const heures = pages.flatMap(p => p.etats.map(e => e.t))
  return { nom, debut: Math.min(...heures), fin: Math.max(...heures), fond, pages, sources, film }
}

function etatDe(p: Record<string, unknown>): Etat {
  const e = {} as Etat
  for (const f of FAMILLES) e[f] = Array.isArray(p[f]) ? (p[f] as unknown[]).filter((x): x is Objet => !!x && typeof x === 'object') : []
  return e
}

/** L'état après un pas du film (comme le faisait l'ancien tableau) */
function appliquer(cour: Etat | null, pas: Pas): Etat {
  const e = {} as Etat
  for (const f of FAMILLES) {
    const d = pas[f]
    const avant = cour ? cour[f] : []
    if (d === undefined) e[f] = avant
    else if (Array.isArray(d)) e[f] = d.filter((x): x is Objet => !!x && typeof x === 'object')
    else e[f] = avant.concat(Array.isArray(d?.['+']) ? d['+']!.filter((x): x is Objet => !!x && typeof x === 'object') : [])
  }
  return e
}

function memesObjets(a: Etat, b: Etat): boolean {
  for (const f of REPRISES) {
    if (a[f].length !== b[f].length) return false
    for (let i = 0; i < a[f].length; i++) if (a[f][i] !== b[f][i] && JSON.stringify(a[f][i]) !== JSON.stringify(b[f][i])) return false
  }
  return true
}

// ---------- Les objets ----------
type P = { x: number; y: number }

function pointsDe(o: Objet): { x: number; y: number; p: number }[] {
  const l = Array.isArray(o.points) ? o.points : []
  return l.filter((q): q is Record<string, unknown> => !!q && typeof q === 'object' && Number.isFinite(q.x) && Number.isFinite(q.y))
    .map(q => ({ x: q.x as number, y: q.y as number, p: Math.min(1, Math.max(0, nombre(q.p, 0.5))) }))
}

function boiteImage(o: Objet): { x: number; y: number; w: number; h: number } | null {
  const x = nombre(o.x, NaN), y = nombre(o.y, NaN), w = nombre(o.w, NaN), h = nombre(o.h, NaN)
  return Number.isFinite(x + y + w + h) && w && h ? { x, y, w, h } : null
}

/** Le coin haut-gauche de ce qu'occupe un objet repris (pour le décalage) */
function coins(f: Famille, o: Objet): P[] {
  if (f === 'freehands') return pointsDe(o)
  if (f === 'images') { const b = boiteImage(o); return b ? [{ x: b.x, y: b.y }, { x: b.x + b.w, y: b.y + b.h }] : [] }
  if (f === 'texts' && Number.isFinite(o.x) && Number.isFinite(o.y)) return [{ x: o.x as number, y: o.y as number }]
  return []
}

/** Le texte d'un bloc de texte : ses lignes, sans balises */
export function lignesDuTexte(html: string): string[] {
  const t = html
    .replace(/<br\s*\/?>/gi, '\n')
    .replace(/<\/(div|p|li|h[1-6])>/gi, '\n')
    .replace(/<[^>]*>/g, '')
    .replace(/&nbsp;/g, ' ').replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&quot;/g, '"').replace(/&#39;|&apos;/g, '\'')
    .replace(/&#(\d+);/g, (_, n) => String.fromCodePoint(Number(n))).replace(/&amp;/g, '&')
  return t.split('\n').map(l => l.replace(/\s+/g, ' ').trim()).filter(Boolean)
}

/** Une ligne de texte en LaTeX : le texte dans \text{…}, ce qui était entre
 *  $…$ (une formule) tel quel */
function ligneEnLatex(l: string): string {
  const morceaux = l.split('$')
  return morceaux.map((m, i) => {
    if (i % 2 === 1 && i < morceaux.length - 1) return m
    if (!m) return ''
    const e = m.replace(/[\\{}$&#^_%~]/g, c => ({ '\\': '\\textbackslash{}', '{': '\\{', '}': '\\}', '$': '\\$', '&': '\\&', '#': '\\#', '^': '\\textasciicircum{}', '_': '\\_', '%': '\\%', '~': '\\textasciitilde{}' }[c]!))
    return `\\text{${e}}`
  }).join('')
}

/** Le LaTeX d'un bloc de texte (vide : rien à écrire) */
export function latexDuTexte(html: string): string {
  const l = lignesDuTexte(html).map(ligneEnLatex)
  if (l.length <= 1) return l[0] ?? ''
  return `\\begin{array}{l}${l.join(' \\\\ ')}\\end{array}`
}

/** La taille des caractères d'un texte : sa taille, et la réduction d'un
 *  seul passage en « em » qui le couvre tout */
function tailleDuTexte(o: Objet): number {
  const base = nombre(o.fontSize, 24)
  const em = typeof o.content === 'string' ? [...o.content.matchAll(/font-size:\s*([\d.]+)em/g)] : []
  return Math.round(base * (em.length === 1 ? Number(em[0][1]) || 1 : 1) * 10) / 10
}

// ---------- Reprendre ----------
/** La séance la plus récente du classeur, et son dernier geste : un ancien
 *  tableau ne s'y ajoute qu'après (le film se lit dans l'ordre des heures) */
export function finDuClasseur(t: Tableau): number {
  let fin = 0
  const film = t.film
  if (film.length) fin = film.get(film.length - 1).t
  for (const s of t.seancesDuClasseur()) fin = Math.max(fin, s.debut)
  return fin
}

/** Ajoute un ancien tableau au document, comme une séance neuve, en
 *  rejouant son film (voir en tête). Le document ne doit avoir rien d'écrit
 *  après son début (voir finDuClasseur). */
export async function reprendre(tab: Tableau, a: AncienTableau, preparer: PreparerImage): Promise<BilanAncien> {
  const bilan: BilanAncien = { pages: a.pages.length, traits: 0, images: 0, textes: 0, laisses: 0, imagesIllisibles: 0 }
  const marque = uid()
  const idDe = (o: Objet) => `${marque}-${String(o.id)}`

  // Les images d'abord : chacune lue (et rognée) une fois
  const banque = tab.doc.getMap('images')
  const pretes = new Map<string, { src: string; l: number; h: number } | null>()
  const illisibles = new Set<string>()
  // Les images déjà dans le classeur (une séance reprise avant celle-ci)
  const memes = new Map<string, string>()
  banque.forEach((v, k) => { if (typeof v === 'string' && !memes.has(v)) memes.set(v, k) })
  for (const p of a.pages) for (const { etat } of p.etats) for (const o of etat.images) {
    const c = cleImage(o)
    if (!c || pretes.has(c.cle)) continue
    const d = a.sources.get(c.ref) ?? (c.ref.startsWith('data:image/') ? c.ref : null)
    const lue = d ? await preparer(d, c.rognure).catch(() => null) : null
    if (lue) {
      // Les mêmes pixels (une image reprise d'une page à l'autre) : une fois
      let src = memes.get(lue.donnees)
      if (!src) { src = `${marque}-${pretes.size}`; banque.set(src, lue.donnees); memes.set(lue.donnees, src) }
      pretes.set(c.cle, { src, l: lue.l, h: lue.h })
    } else pretes.set(c.cle, null)
  }

  // Le décalage de chaque page : ce qui y est écrit commence en haut à gauche
  const decalages = a.pages.map(p => {
    let x = Infinity, y = Infinity
    for (const { etat } of p.etats) for (const f of REPRISES) for (const o of etat[f]) for (const q of coins(f, o)) { x = Math.min(x, q.x); y = Math.min(y, q.y) }
    return Number.isFinite(x) ? { x: -x, y: -y } : { x: 0, y: 0 }
  })

  const forme = (f: Famille, o: Objet, page: number): Forme | null => {
    const d = decalages[page]
    const id = idDe(o), z = nombre(o.z), auteur = tab.moi
    if (f === 'freehands') {
      const pts = pointsDe(o)
      if (!pts.length) return null
      const x0 = pts[0].x, y0 = pts[0].y
      const surligneur = o.isHighlighter === true
      const p0 = pts[0].p
      const t: Trait = {
        id, type: 'trait', x: x0 + d.x, y: y0 + d.y, z, auteur,
        pts: pts.flatMap(q => [Math.round((q.x - x0) * 10) / 10, Math.round((q.y - y0) * 10) / 10, Math.round(q.p * 100) / 100]),
        couleur: typeof (o.strokeColor ?? o.color) === 'string' ? (o.strokeColor ?? o.color) as string : '#1b2230',
        taille: nombre(o.width, 3) || 3,
        opacite: surligneur ? OPACITE_SURLIGNEUR : Math.min(1, Math.max(0.05, nombre(o.strokeOpacity ?? o.opacity, 1))),
        pression: !surligneur && pts.some(q => Math.abs(q.p - p0) > 0.02),
      }
      return t
    }
    if (f === 'images') {
      const c = cleImage(o), b = boiteImage(o)
      const pr = c ? pretes.get(c.cle) : null
      if (!c || !b || !pr) { if (c) illisibles.add(c.cle); return null }
      const sx = b.w / pr.l, sy = b.h / pr.h
      const ang = nombre(o.angle ?? o.rotation)
      const cos = Math.cos(ang), sin = Math.sin(ang)
      const cx = b.x + b.w / 2, cy = b.y + b.h / 2
      const im: ImageForme = {
        id, type: 'image', src: pr.src, l: pr.l, h: pr.h, z, auteur,
        m: [cos * sx, sin * sx, -sin * sy, cos * sy],
        x: cx - cos * b.w / 2 + sin * b.h / 2 + d.x,
        y: cy - sin * b.w / 2 - cos * b.h / 2 + d.y,
      }
      if (o.isBg === true || o.sousLaGrille === true) im.fixe = true
      return im
    }
    if (f === 'texts') {
      const latex = latexDuTexte(typeof o.content === 'string' ? o.content : '')
      if (!latex || !Number.isFinite(o.x) || !Number.isFinite(o.y)) return null
      const fo: Formule = {
        id, type: 'formule', latex, z, auteur,
        couleur: typeof (o.strokeColor ?? o.color) === 'string' ? (o.strokeColor ?? o.color) as string : '#1b2230',
        taille: tailleDuTexte(o), x: (o.x as number) + d.x, y: (o.y as number) + d.y,
      }
      return fo
    }
    return null
  }

  // Les gestes de toutes les pages, dans l'ordre des heures
  const gestes: { t: number; page: number; poser: Forme[]; retirer: string[] }[] = []
  const laisses = new Set<string>()
  const reprises = new Map<Famille, Set<string>>(REPRISES.map(f => [f, new Set<string>()]))
  a.pages.forEach((p, page) => {
    let avant: Etat | null = null
    for (const { t, etat } of p.etats) {
      const poser: Forme[] = [], retirer: string[] = []
      for (const f of FAMILLES) {
        const nouveaux = etat[f], anciens = avant ? avant[f] : []
        if (nouveaux === anciens) continue
        if (!REPRISES.includes(f)) { for (const o of nouveaux) laisses.add(`${f}:${String(o.id)}`); continue }
        const deja = new Map(anciens.map(o => [String(o.id), o]))
        const restent = new Set<string>()
        for (const o of nouveaux) {
          const k = String(o.id)
          restent.add(k)
          const v = deja.get(k)
          if (v === o || (v && JSON.stringify(v) === JSON.stringify(o))) continue
          const g = forme(f, o, page)
          if (g) { poser.push(g); reprises.get(f)!.add(k) }
        }
        for (const k of deja.keys()) if (!restent.has(k)) retirer.push(`${marque}-${k}`)
      }
      avant = etat
      if (poser.length || retirer.length) gestes.push({ t, page, poser, retirer })
    }
  })
  gestes.sort((x, y) => x.t - y.t)

  // La séance, ses pages, puis chaque geste à son heure, sur sa page
  const horloge = tab.horloge
  const garde = tab.garde
  tab.garde = null
  tab.seancesActives = true
  try {
    tab.horloge = () => a.debut
    tab.ecrireLesSeances()
    const { seance, page } = tab.nouvelleSeance({ t: a.debut, fond: a.fond })
    const pages = [page]
    for (let k = 1; k < a.pages.length; k++) pages.push(tab.ajouterPage(a.fond, tab.ordre.length, { seance }))
    for (const g of gestes) {
      const id = pages[g.page]
      const formes = tab.formesDe(id)
      if (!formes) continue
      tab.horloge = () => g.t
      tab.pageVue = id
      tab.doc.transact(() => {
        for (const k of g.retirer) formes.delete(k)
        for (const f of g.poser) formes.set(f.id, f)
      }, ORIGINE_LOCALE)
    }
    // Les étapes du film se rangent après chaque transaction (une tâche
    // courte) : on les attend avant de rendre la main
    await new Promise<void>(ok => setTimeout(ok, 0))
  } finally {
    tab.horloge = horloge
    tab.garde = garde
  }
  // Ce qui est sur les pages à la fin (ce qui a été effacé en route est
  // dans le film seulement)
  for (const p of a.pages) {
    const fin = p.etats[p.etats.length - 1]?.etat
    if (!fin) continue
    bilan.traits += fin.freehands.filter(o => reprises.get('freehands')!.has(String(o.id))).length
    bilan.images += fin.images.filter(o => reprises.get('images')!.has(String(o.id))).length
    bilan.textes += fin.texts.filter(o => reprises.get('texts')!.has(String(o.id))).length
  }
  bilan.laisses = laisses.size
  bilan.imagesIllisibles = illisibles.size
  return bilan
}

/** Ce qui distingue une image à préparer : sa source et sa partie gardée */
function cleImage(o: Objet): { cle: string; ref: string; rognure: Rognure | null } | null {
  const ref = typeof o.srcRef === 'string' ? o.srcRef : typeof o.src === 'string' ? o.src : null
  if (!ref) return null
  const x = nombre(o.cx), y = nombre(o.cy), l = nombre(o.cw), h = nombre(o.ch)
  const rognure = l > 0 && h > 0 ? { x, y, l, h } : null
  return { cle: `${ref.length > 64 ? ref.slice(0, 32) + ref.length + ref.slice(-32) : ref}|${rognure ? [x, y, l, h].join(',') : ''}`, ref, rognure }
}

// ---------- Les mots ----------
const pluriel = (n: number, mot: string, pl = mot + 's') => `${n} ${n > 1 ? pl : mot}`

/** Ce qu'on dit d'un ancien tableau repris */
export function texteDuBilan(a: AncienTableau, b: BilanAncien): string {
  const morceaux = [pluriel(b.pages, 'page'), pluriel(b.traits, 'trait'), pluriel(b.images, 'image')]
  if (b.textes) morceaux.push(`${pluriel(b.textes, 'texte')} (${b.textes > 1 ? 'devenus des formules' : 'devenu une formule'})`)
  let t = `« ${a.nom} » : ${morceaux.join(', ')}${a.film ? ', avec son film' : ''}.`
  if (b.laisses) t += ` ${pluriel(b.laisses, 'objet')} (figures, courbes ou post-its) ${b.laisses > 1 ? 'n\'ont' : 'n\'a'} pas été repris.`
  if (b.imagesIllisibles) t += ` ${pluriel(b.imagesIllisibles, 'image')} n'${b.imagesIllisibles > 1 ? 'ont' : 'a'} pas pu être ${b.imagesIllisibles > 1 ? 'lues' : 'lue'}.`
  return t
}

/** La date d'une séance : « lundi 5 octobre 2026 » */
const JOURS = ['dimanche', 'lundi', 'mardi', 'mercredi', 'jeudi', 'vendredi', 'samedi']
const MOIS = ['janvier', 'février', 'mars', 'avril', 'mai', 'juin', 'juillet', 'août', 'septembre', 'octobre', 'novembre', 'décembre']
function jourLisible(t: number): string {
  const d = new Date(t)
  return `${JOURS[d.getDay()]} ${d.getDate() === 1 ? '1er' : d.getDate()} ${MOIS[d.getMonth()]} ${d.getFullYear()}`
}

/** Ce que dit la fenêtre avant de reprendre des anciens tableaux (rangés
 *  du plus ancien au plus récent). ici : le classeur ouvert et l'heure de
 *  ce qu'il a de plus récent (voir finDuClasseur), s'il y en a un. */
export function textesAvantAnciens(anciens: readonly AncienTableau[], ici: { nom: string; fin: number } | null): { textes: string[]; ajoutable: boolean } {
  const ligne = (a: AncienTableau) => `« ${a.nom} » : séance du ${jourLisible(a.debut)}, ${pluriel(a.pages.length, 'page')}.`
  const textes = anciens.length === 1 ? [ligne(anciens[0])]
    : [`${anciens.length} anciens tableaux, du plus ancien au plus récent :`, ...anciens.map(ligne)]
  textes.push(anciens.length === 1
    ? 'Il devient une séance d\'un classeur, avec ses traits, ses images, ses textes et son film.'
    : 'Chacun devient une séance du même classeur, avec ses traits, ses images, ses textes et son film.')
  const ajoutable = !!ici && anciens.length > 0 && ici.fin <= anciens[0].debut
  if (ici && !ajoutable) textes.push(`« ${ici.nom} » a déjà une séance plus récente : on ne peut y ajouter que des séances qui viennent après la sienne. Ajoutez les séances dans l'ordre des dates, la plus ancienne d'abord.`)
  return { textes, ajoutable }
}
