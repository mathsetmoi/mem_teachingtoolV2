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
// - les figures : un point devient un point marqué de sa croix (comme
//   l'outil Point, sans nom) ; un segment ou une droite, une ligne entre
//   ses deux points (prolongée pour une droite), qui suit ses points s'ils
//   bougent ; un arc tracé au compas, un arc de cercle. Les pointillés
//   restent en tirets ; une figure posée sur une image lui reste liée ;
//   un rectangle, un rectangle (rempli comme ici s'il l'était) ; un cache
//   (un rectangle plein posé pour masquer une partie d'une image) devient
//   un aplat opaque de sa couleur, une petite image étirée, qu'on efface
//   pour découvrir ce qu'il cachait ; les coins d'un cache ne se voient pas ;
// - une calculatrice NumWorks (un post-it qui la montrait, lycée ou
//   collège) : une calculatrice d'ici (voir calculatrice/), son dessin à
//   l'écran d'accueil, tenu dans le cadre du post-it, centré ; elle paraît,
//   bouge et s'en va dans le film comme lui. Le dessin est donné par
//   l'appelant (il demande un canevas) ;
// - le mode nuit : un tableau enregistré en mode nuit (ou une page qui
//   l'était) donne des pages en mode nuit (voir nuit.ts), dès le début de
//   la séance (l'ancien film ne dit pas quand il a basculé) ; son encre
//   blanche y devient le Noir, que le mode nuit montre presque blanc (le
//   blanc, lui, y deviendrait le noir du papier) ;
// - le film : chaque geste devient une étape du film, à son heure, sur sa
//   page. « Revoir la construction » et Publier le rejouent comme une
//   séance écrite ici.
// Le reste (cercles, polygones, courbes, les autres post-its) n'est pas repris : le bilan le
// compte, rien ne disparaît sans qu'on le dise.
// Le tableau est décalé pour que ce qui est écrit commence en haut à
// gauche de la page (on écrivait autour du centre de l'écran).
//
// Pur (ni interface ni base) : se teste sous Node. Ce qui demande le
// navigateur (lire une image, la rogner) est donné par l'appelant.
// =============================================================
import type { Tableau } from '../document'
import { ORIGINE_LOCALE } from '../document'
import type { Cercle, Fond, Forme, Formule, ImageForme, MarquePoint, ModeleCalculatrice, Polygone, Trait } from '../types'
import { uid } from '../types'
import { HAUTEUR as HAUTEUR_CALCULATRICE, LARGEURS as LARGEURS_CALCULATRICE } from '../calculatrice/dessin'

export const EXTENSION_ANCIEN = '.prof'

/** Les familles d'objets d'un ancien tableau */
const FAMILLES = ['points', 'segments', 'circles', 'rectangles', 'texts', 'freehands', 'curves', 'polygons', 'images', 'arcs', 'htmlPostits'] as const
type Famille = typeof FAMILLES[number]
/** Celles qui se reprennent */
const REPRISES: readonly Famille[] = ['freehands', 'images', 'texts', 'points', 'segments', 'arcs', 'rectangles', 'htmlPostits']
/** Celles qui vont d'un point à l'autre : elles suivent leurs points */
const SUR_POINTS: readonly Famille[] = ['segments', 'rectangles']

/** Les fonds d'un ancien tableau, dans son ordre, et ce qu'ils deviennent :
 *  le Seyès avec marge et la copie double perdent leur marge */
const FONDS: Fond[] = ['blanc', 'carreaux', 'seyes', 'seyes', 'carreaux', 'millimetre', 'pointe', 'iso']

/** L'opacité du surligneur, comme celui d'ici (voir App, case 'surligneur') */
const OPACITE_SURLIGNEUR = 0.35

/** L'épaisseur d'une figure ne dépasse pas celle d'ici (voir App.figure) */
const TAILLE_FIGURE_MAX = 4.5

/** Les marques d'un point d'un ancien tableau, et ce qu'elles deviennent */
const MARQUES: Record<string, MarquePoint> = { cross: 'croix', plus: 'plus', dot: 'point', point: 'point', circle: 'rond', none: 'aucun' }

type Objet = Record<string, unknown> & { id?: unknown }
type Etat = Record<Famille, Objet[]>
type Pas = Partial<Record<Famille, Objet[] | { '+'?: Objet[] }>> & { t?: unknown }

/** Une page d'un ancien tableau : ses états, dans l'ordre, chacun à son
 *  heure ; le dernier est la page telle qu'elle a été enregistrée */
interface PageAncienne { etats: { t: number; etat: Etat }[]; nuit?: boolean }

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
  /** Points, segments, droites et arcs */
  figures: number
  /** Les calculatrices NumWorks */
  calculatrices: number
  /** Les objets qui ne se reprennent pas (cercles, courbes, post-its…),
   *  comptés une fois chacun, qu'ils soient restés ou non */
  laisses: number
  /** Des images qui n'ont pas pu être lues */
  imagesIllisibles: number
  /** Des images effacées pendant la séance dont le fichier n'a pas gardé
   *  les données : elles manquent au film seulement */
  imagesHorsFilm: number
}

/** La partie gardée d'une image, en pixels de l'image */
export interface Rognure { x: number; y: number; l: number; h: number }
/** Lit une image (et la rogne) : ses données et sa taille en pixels ; null si
 *  elle ne se lit pas. Dans le navigateur, une image et un canevas. */
export type PreparerImage = (donnees: string, rognure: Rognure | null) => Promise<{ donnees: string; l: number; h: number } | null>
/** Le dessin d'une calculatrice à l'écran d'accueil (data:image/png), de
 *  LARGEURS[modele] × HAUTEUR (voir calculatrice/dessin.ts) */
export type DessinerCalculatrice = (modele: ModeleCalculatrice) => string

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
  const nuitDuTableau = data.modeNuit === true
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
    // De nuit : la page le dit, sinon le tableau entier
    const nuit = page.modeNuit === true || (page.modeNuit !== false && nuitDuTableau)
    return nuit ? { etats, nuit } : { etats }
  })
  // Une page sans aucune heure (sans film) était là dès le début de la
  // séance : elle paraît avec le premier geste du tableau (sans film du
  // tout, à son enregistrement)
  const connues = pages.flatMap(p => p.etats.map(e => e.t)).filter(t => t > 0)
  if (connues.length) {
    const premiere = Math.min(...connues)
    for (const p of pages) for (const x of p.etats) if (!x.t) x.t = premiere
  } else {
    // Aucune heure : le film a été enregistré sans elles. La séance prend
    // la date écrite dans son nom (son enregistrement peut venir bien plus
    // tard : un tableau rouvert la veille d'un autre cours), à 8 h ; ses
    // gestes se suivent, PAS_SANS_HEURE l'un après l'autre, page après page
    const jour = dateDuNom(nom) ?? dateDuNom(typeof r!.name === 'string' ? r!.name : '') ?? dateDuNom(typeof data.nomDuTableau === 'string' ? data.nomDuTableau : '')
    let t = jour ?? enregistre
    for (const p of pages) for (const x of p.etats) { x.t = t; t += PAS_SANS_HEURE }
  }
  const heures = pages.flatMap(p => p.etats.map(e => e.t))
  return { nom, debut: Math.min(...heures), fin: Math.max(...heures), fond, pages, sources, film }
}

/** Le Noir de la palette : l'encre par défaut, et celle qui remplace le
 *  blanc d'une page de nuit */
const NOIR = '#1b2230'

/** Une couleur presque blanche (#rgb, #rrggbb, white) */
function presqueBlanc(c: string): boolean {
  const s = c.trim().toLowerCase()
  if (s === 'white') return true
  const m = /^#([0-9a-f]{3}|[0-9a-f]{6})$/.exec(s)
  if (!m) return false
  const h = m[1].length === 3 ? [...m[1]].map(x => x + x).join('') : m[1]
  return [0, 2, 4].every(i => parseInt(h.slice(i, i + 2), 16) >= 235)
}

/** L'écart entre deux gestes d'un film sans heures */
const PAS_SANS_HEURE = 5000

const MOIS_DU_NOM = ['janvier', 'fevrier', 'mars', 'avril', 'mai', 'juin', 'juillet', 'aout', 'septembre', 'octobre', 'novembre', 'decembre']
/** La date écrite dans un nom (« Mardi 22 septembre 2026 », « 1er
 *  octobre 2026 », « 2026-10-13 »), à 8 h ; null s'il n'y en a pas */
export function dateDuNom(nom: string): number | null {
  const n = nom.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase()
  const m = n.match(/\b(\d{1,2})(?:er)?\s+(janvier|fevrier|mars|avril|mai|juin|juillet|aout|septembre|octobre|novembre|decembre)\s+(\d{4})\b/)
  const d = m ? { a: Number(m[3]), m: MOIS_DU_NOM.indexOf(m[2]), j: Number(m[1]) } : null
  const iso = d ? null : n.match(/\b(\d{4})-(\d{2})-(\d{2})\b/)
  const x = d ?? (iso ? { a: Number(iso[1]), m: Number(iso[2]) - 1, j: Number(iso[3]) } : null)
  if (!x || x.m < 0 || x.m > 11 || x.j < 1 || x.j > 31) return null
  const t = new Date(x.a, x.m, x.j, 8, 0)
  return t.getDate() === x.j ? t.getTime() : null
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
  if ((f === 'texts' || f === 'points') && Number.isFinite(o.x) && Number.isFinite(o.y)) return [{ x: o.x as number, y: o.y as number }]
  if (f === 'htmlPostits' && modeleDe(o)) { const b = boiteImage(o); return b ? [{ x: b.x, y: b.y }, { x: b.x + b.w, y: b.y + b.h }] : [] }
  if (f === 'arcs') { const a = arcDe(o); return a ? Array.from({ length: 17 }, (_, i) => { const t = a.a0 + (a.a1 - a.a0) * i / 16; return { x: a.x + a.r * Math.cos(t), y: a.y + a.r * Math.sin(t) } }) : [] }
  // Un segment va d'un point à l'autre : ses points sont comptés
  return []
}

/** Le modèle d'une calculatrice NumWorks montrée par un post-it (son titre
 *  ou son adresse le disent), sinon null */
function modeleDe(o: Objet): ModeleCalculatrice | null {
  const t = `${typeof o.titre === 'string' ? o.titre : ''} ${typeof o.url === 'string' ? o.url : ''}`.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase()
  if (!t.includes('numworks')) return null
  return t.includes('college') ? 'college' : 'lycee'
}

/** Un arc d'un ancien tableau : son centre, son rayon, ses angles dans le
 *  sens du tracé (comme Cercle.arc : a1 < a0 quand il tourne à l'envers) */
function arcDe(o: Objet): { x: number; y: number; r: number; a0: number; a1: number } | null {
  const x = nombre(o.cx, NaN), y = nombre(o.cy, NaN), r = nombre(o.radius, NaN)
  const a0 = nombre(o.startAngle, NaN)
  let a1 = nombre(o.endAngle, NaN)
  if (!Number.isFinite(x + y + r + a0 + a1) || r <= 0) return null
  const tour = Math.PI * 2
  if (o.counterClockwise === true) { while (a1 > a0) a1 -= tour }
  else { while (a1 < a0) a1 += tour }
  return { x, y, r, a0, a1 }
}

/** Les deux points d'un segment ou d'un rectangle (deux coins opposés),
 *  dans l'état où il est (null : un point manque) */
function boutsDe(o: Objet, etat: Etat): [Objet, Objet] | null {
  const p1 = etat.points.find(q => q.id === o.p1_id), p2 = etat.points.find(q => q.id === o.p2_id)
  return p1 && p2 && Number.isFinite(p1.x) && Number.isFinite(p1.y) && Number.isFinite(p2.x) && Number.isFinite(p2.y) ? [p1, p2] : null
}

/** L'image sur laquelle une figure a été posée (son id ici), si elle est là */
function imageSous(o: Objet, etat: Etat, idDe: (o: Objet) => string): string | undefined {
  const s = o.surObjet && typeof o.surObjet === 'object' ? o.surObjet as Record<string, unknown> : null
  if (!s || s.type !== 'image') return undefined
  const im = etat.images.find(i => i.id === s.id)
  return im ? idDe(im) : undefined
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
export async function reprendre(tab: Tableau, a: AncienTableau, preparer: PreparerImage, calculatrice?: DessinerCalculatrice): Promise<BilanAncien> {
  const bilan: BilanAncien = { pages: a.pages.length, traits: 0, images: 0, textes: 0, figures: 0, calculatrices: 0, laisses: 0, imagesIllisibles: 0, imagesHorsFilm: 0 }
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

  // Un point sous un segment (ou un rectangle) posé sur une image suit
  // l'image, comme lui ; les coins d'un cache ne se montrent pas (sauf
  // s'ils servent aussi à un segment)
  const pointsSurImage = a.pages.map(p => {
    const l = new Map<unknown, Objet>()
    for (const { etat } of p.etats) for (const f of SUR_POINTS) for (const s of etat[f]) if (s.surObjet) { l.set(s.p1_id, s); l.set(s.p2_id, s) }
    return l
  })
  const coinsCaches = a.pages.map(p => {
    const caches = new Set<unknown>(), segments = new Set<unknown>()
    for (const { etat } of p.etats) {
      for (const r of etat.rectangles) if (r.cache === true) { caches.add(r.p1_id); caches.add(r.p2_id) }
      for (const s of etat.segments) { segments.add(s.p1_id); segments.add(s.p2_id) }
    }
    for (const k of segments) caches.delete(k)
    return caches
  })
  // Les aplats des caches : une image d'un pixel par couleur, gardée une fois
  const aplat = (couleur: string) => {
    const donnees = pixel(couleur)
    let src = memes.get(donnees)
    if (!src) { src = `${marque}-aplat-${memes.size}`; banque.set(src, donnees); memes.set(donnees, src) }
    return src
  }

  // L'encre d'une page de nuit : le blanc devient le Noir (voir en tête)
  const encre = (c: unknown, page: number, sinon = NOIR) => {
    const x = typeof c === 'string' ? c : sinon
    return a.pages[page].nuit && presqueBlanc(x) ? NOIR : x
  }

  const forme = (f: Famille, o: Objet, page: number, etat: Etat): Forme | null => {
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
        couleur: encre(o.strokeColor ?? o.color, page),
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
        couleur: encre(o.strokeColor ?? o.color, page),
        taille: tailleDuTexte(o), x: (o.x as number) + d.x, y: (o.y as number) + d.y,
      }
      return fo
    }
    const couleur = encre(o.strokeColor ?? o.color, page)
    const taille = Math.min(nombre(o.width, 3) || 3, TAILLE_FIGURE_MAX)
    if (f === 'points') {
      if (!Number.isFinite(o.x) || !Number.isFinite(o.y) || coinsCaches[page].has(o.id)) return null
      const po: Polygone = {
        id, type: 'polygone', ferme: false, pts: [0, 0], z, auteur, couleur, taille: 3,
        x: (o.x as number) + d.x, y: (o.y as number) + d.y,
        sommets: true, stylePoints: [{ marque: MARQUES[String(o.shape)] ?? 'croix' }],
      }
      const sous = pointsSurImage[page].get(o.id)
      const lie = sous && imageSous(sous, etat, idDe)
      if (lie) po.lie = lie
      return po
    }
    if (f === 'segments') {
      const b = boutsDe(o, etat)
      if (!b) return null
      const [p1, p2] = b
      const x = (p1.x as number) + d.x, y = (p1.y as number) + d.y
      const se: Polygone = {
        id, type: 'polygone', ferme: false, z, auteur, couleur, taille, x, y,
        pts: [0, 0, (p2.x as number) - (p1.x as number), (p2.y as number) - (p1.y as number)],
      }
      const genre = String(o.lineType ?? '')
      if (genre === 'droite') se.prolonge = 'droite'
      else if (/demi|ray/i.test(genre)) se.prolonge = 'demi'
      if (o.dash && o.dash !== 'solid') se.tirets = true
      if (nombre(o.arrowStart) || nombre(o.arrowEnd)) se.stylePoints = [nombre(o.arrowStart) ? { bout: 'fleche' } : null, nombre(o.arrowEnd) ? { bout: 'fleche' } : null]
      const lie = imageSous(o, etat, idDe)
      if (lie) se.lie = lie
      return se
    }
    if (f === 'rectangles') {
      const b = boutsDe(o, etat)
      if (!b) return null
      const x0 = Math.min(b[0].x as number, b[1].x as number), y0 = Math.min(b[0].y as number, b[1].y as number)
      const l = Math.abs((b[1].x as number) - (b[0].x as number)), h = Math.abs((b[1].y as number) - (b[0].y as number))
      if (!l || !h) return null
      const fond = typeof o.fillColor === 'string' ? o.fillColor : couleur
      if (o.cache === true) {
        // (un cache est une image : il reste de sa couleur, de nuit aussi)
        const im: ImageForme = { id, type: 'image', src: aplat(fond), l: 1, h: 1, m: [l, 0, 0, h], x: x0 + d.x, y: y0 + d.y, z, auteur }
        return im
      }
      const re: Polygone = { id, type: 'polygone', ferme: true, z, auteur, couleur, taille, x: x0 + d.x, y: y0 + d.y, pts: [0, 0, l, 0, l, h, 0, h] }
      if (o.isFilled === true) re.fond = encre(fond, page)
      if (o.dash && o.dash !== 'solid') re.tirets = true
      const lie = imageSous(o, etat, idDe)
      if (lie) re.lie = lie
      return re
    }
    if (f === 'htmlPostits') {
      const modele = modeleDe(o), b = boiteImage(o)
      if (!modele || !b || !calculatrice) return null
      const LARGEUR_CALCULATRICE = LARGEURS_CALCULATRICE[modele]
      const src = `calc-accueil-${modele}-${LARGEUR_CALCULATRICE}`
      if (!banque.has(src)) banque.set(src, calculatrice(modele))
      const k = Math.min(Math.abs(b.w) / LARGEUR_CALCULATRICE, Math.abs(b.h) / HAUTEUR_CALCULATRICE)
      const ca: ImageForme = {
        id, type: 'image', src, l: LARGEUR_CALCULATRICE, h: HAUTEUR_CALCULATRICE, m: [k, 0, 0, k], calculatrice: modele, z, auteur,
        x: b.x + (b.w - LARGEUR_CALCULATRICE * k) / 2 + d.x, y: b.y + (b.h - HAUTEUR_CALCULATRICE * k) / 2 + d.y,
      }
      return ca
    }
    if (f === 'arcs') {
      const ar = arcDe(o)
      if (!ar) return null
      const ce: Cercle = { id, type: 'cercle', x: ar.x + d.x, y: ar.y + d.y, r: ar.r, arc: { a0: ar.a0, a1: ar.a1 }, z, auteur, couleur, taille }
      if (o.dash && o.dash !== 'solid') ce.tirets = true
      const lie = imageSous(o, etat, idDe)
      if (lie) ce.lie = lie
      return ce
    }
    return null
  }
  // Ce qui fait qu'un objet a changé : lui, et pour un segment ou un
  // rectangle, ses points
  const empreinte = (f: Famille, o: Objet, etat: Etat) => {
    if (!SUR_POINTS.includes(f)) return JSON.stringify(o)
    const b = boutsDe(o, etat)
    return JSON.stringify([o, b && [b[0].x, b[0].y, b[1].x, b[1].y]])
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
        // (un segment suit ses points : il change quand eux changent)
        if (nouveaux === anciens && !(SUR_POINTS.includes(f) && avant && etat.points !== avant.points)) continue
        if (!REPRISES.includes(f)) { for (const o of nouveaux) laisses.add(`${f}:${String(o.id)}`); continue }
        const deja = new Map(anciens.map(o => [String(o.id), o]))
        const restent = new Set<string>()
        for (const o of nouveaux) {
          const k = String(o.id)
          restent.add(k)
          const v = deja.get(k)
          if ((v === o && !SUR_POINTS.includes(f)) || (v && empreinte(f, v, avant!) === empreinte(f, o, etat))) continue
          const g = forme(f, o, page, etat)
          if (g) { poser.push(g); reprises.get(f)!.add(k) }
          else if (v) retirer.push(`${marque}-${k}`)
          // Un post-it qui n'est pas une calculatrice ne se reprend pas
          if (!g && f === 'htmlPostits') laisses.add(`${f}:${k}`)
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
    a.pages.forEach((p, k) => { if (p.nuit) tab.changerNuit(pages[k], true) })
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
    bilan.calculatrices += fin.htmlPostits.filter(o => reprises.get('htmlPostits')!.has(String(o.id))).length
    for (const f of ['points', 'segments', 'arcs', 'rectangles'] as const) bilan.figures += fin[f].filter(o => reprises.get(f)!.has(String(o.id))).length
  }
  bilan.laisses = laisses.size
  // Une image illisible encore sur une page manque à la page ; effacée en
  // route, elle ne manque qu'au film
  const restees = new Set(a.pages.flatMap(p => p.etats[p.etats.length - 1]?.etat.images.map(o => cleImage(o)?.cle) ?? []))
  for (const c of illisibles) if (restees.has(c)) bilan.imagesIllisibles++; else bilan.imagesHorsFilm++
  return bilan
}

/** Une image PNG d'un pixel, de cette couleur (#rrggbb) : l'aplat d'un
 *  cache. Écrite à la main (ni canevas ni bibliothèque : se fait sous Node) */
function pixel(couleur: string): string {
  const c = /^#([0-9a-f]{6})$/i.exec(couleur.trim())?.[1] ?? 'ffffff'
  const rvb = [0, 2, 4].map(i => parseInt(c.slice(i, i + 2), 16))
  const crc = (o: number[]) => {
    let r = -1
    for (const b of o) { r ^= b; for (let k = 0; k < 8; k++) r = (r >>> 1) ^ (0xedb88320 & -(r & 1)) }
    return ~r >>> 0
  }
  const mot = (n: number) => [n >>> 24, (n >>> 16) & 255, (n >>> 8) & 255, n & 255]
  const morceau = (type: string, o: number[]) => { const t = [...type].map(x => x.charCodeAt(0)).concat(o); return [...mot(o.length), ...t, ...mot(crc(t))] }
  // La ligne : un filtre (0) et le pixel ; zlib sans compression
  const ligne = [0, ...rvb]
  let s1 = 1, s2 = 0
  for (const b of ligne) { s1 = (s1 + b) % 65521; s2 = (s2 + s1) % 65521 }
  const octets = [
    137, 80, 78, 71, 13, 10, 26, 10,
    ...morceau('IHDR', [...mot(1), ...mot(1), 8, 2, 0, 0, 0]),
    ...morceau('IDAT', [0x78, 0x01, 1, ligne.length, 0, 255 - ligne.length, 255, ...ligne, ...mot((s2 << 16 | s1) >>> 0)]),
    ...morceau('IEND', []),
  ]
  return 'data:image/png;base64,' + btoa(String.fromCharCode(...octets))
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
  if (b.figures) morceaux.push(pluriel(b.figures, 'figure'))
  if (b.calculatrices) morceaux.push(pluriel(b.calculatrices, 'calculatrice'))
  if (b.textes) morceaux.push(`${pluriel(b.textes, 'texte')} (${b.textes > 1 ? 'devenus des formules' : 'devenu une formule'})`)
  let t = `« ${a.nom} » : ${morceaux.join(', ')}${a.film ? ', avec son film' : ''}.`
  if (b.laisses) t += ` ${pluriel(b.laisses, 'objet')} (cercles, polygones, courbes ou post-its) ${b.laisses > 1 ? 'n\'ont' : 'n\'a'} pas été repris.`
  if (b.imagesIllisibles) t += ` ${pluriel(b.imagesIllisibles, 'image')} n'${b.imagesIllisibles > 1 ? 'ont' : 'a'} pas pu être ${b.imagesIllisibles > 1 ? 'lues' : 'lue'}.`
  if (b.imagesHorsFilm) t += ` ${b.imagesHorsFilm > 1 ? `${b.imagesHorsFilm} images effacées` : '1 image effacée'} pendant la séance ${b.imagesHorsFilm > 1 ? 'manquent' : 'manque'} au film.`
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
    ? 'Il devient une séance d\'un classeur, avec ses traits, ses images, ses figures, ses textes et son film.'
    : 'Chacun devient une séance du même classeur, avec ses traits, ses images, ses figures, ses textes et son film.')
  const ajoutable = !!ici && anciens.length > 0 && ici.fin <= anciens[0].debut
  if (ici && !ajoutable) textes.push(`« ${ici.nom} » a déjà une séance plus récente : on ne peut y ajouter que des séances qui viennent après la sienne. Ajoutez les séances dans l'ordre des dates, la plus ancienne d'abord.`)
  return { textes, ajoutable }
}
