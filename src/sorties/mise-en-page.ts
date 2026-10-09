// =============================================================
// LA MISE EN PAGE DU PDF
// Les feuilles A4 d'une page de MEM : chaque page est cadrée sur son
// contenu ; une page haute continue sur les feuilles suivantes (le choix
// du professeur : découpée en A4, imprimable), coupée entre deux lignes
// d'écriture plutôt qu'au travers d'une ligne ou d'une figure.
// Le papier : A4, marges de 12 mm à gauche, à droite et en haut, 16 mm en
// bas (le pied de page y tient). L'image d'une feuille fait 200 points par
// pouce (1654 × 2339 pixels) ; on la peint comme une page imprimée à 96
// ppp, avec 200 / 96 ≈ 2,083 pixels par px CSS : les lignes du fond, les
// noms des points, les graduations du repère gardent leur épaisseur et leur
// taille en px CSS, comme à l'écran (1 px = 0,26 mm).
// L'échelle : 1 cm sur la page (40 unités) = 1 cm sur le papier quand le
// contenu tient sur la feuille (186 × 269 mm utiles en portrait, 273 × 182
// en paysage) : les longueurs mesurées à la règle sur la feuille sont
// vraies. Sinon la page est réduite (k < 1), et son pied de page le dit
// (« réduite à 72 % »). Une page qui n'est pas haute tient sur UNE feuille,
// dans le sens qui la montre le plus grand : réduite à la largeur et à la
// hauteur de la feuille, en paysage si elle y est plus grande (un contenu
// 4:3, une grande figure plus large que haute), en portrait sinon ; à
// égalité (les deux à l'échelle réelle), paysage pour un contenu nettement
// plus large que haut (largeur / hauteur > 1,25). Une page haute (qu'il
// faudrait réduire de plus de 15 % pour la faire tenir sur une feuille)
// est en portrait, réduite seulement à la largeur, et découpée en feuilles.
// Ni plancher ni découpe en colonnes : une page bien plus large que haute
// est rare ; le message final avertit sous 30 %.
// Aussi les textes de l'export : le pied de page, le nom du fichier, le
// titre du PDF, les messages. Pur : se teste sous Node (tests/pdf.test.ts).
// =============================================================
import type { Boite } from '../revoir/bobine'
import { CM } from '../types'
import { A4 } from './pdf'
import { nomDeFichier } from './image'
import { tailleLisible } from '../fichier'

/** Les points par pouce des images des feuilles */
export const PPP = 200
/** Les pixels de l'image par px CSS : la feuille est peinte comme une page à 96 ppp */
export const DPR_PDF = PPP / 96
/** Les px CSS par millimètre (96 ppp) */
export const PX_PAR_MM = 96 / 25.4
/** Les millimètres d'une unité du monde, à l'échelle réelle (40 unités = 1 cm) */
export const MM_PAR_UNITE = 10 / CM
/** Les px CSS par unité du monde à l'échelle réelle : 0,9449 */
export const Z_REEL = PX_PAR_MM * MM_PAR_UNITE
/** Les marges de la feuille, en mm : le pied de page tient dans celle du bas */
export const MARGES = { gauche: 12, droite: 12, haut: 12, bas: 16 }
/** L'air autour du contenu, en unités du monde */
export const MARGE_CONTENU = 8
/** Un contenu plus large que haut de ce rapport part en paysage */
export const RAPPORT_PAYSAGE = 1.25
/** Une coupe tombe entre 60 % et 100 % de la hauteur utile… */
export const DEBUT_COUPE = 0.6
/** … ou, pour ne pas couper une figure qui tiendrait sur la feuille
 *  suivante, jusqu'à 25 % */
export const COUPE_AU_PLUS_HAUT = 0.25
/** Une page qui tiendrait sur une feuille réduite d'au plus 15 % (par
 *  rapport à sa largeur) y est réduite plutôt que découpée */
export const REDUCTION_POUR_UNE_FEUILLE = 0.85
/** Une coupe se pose à ce jeu (unités) au-dessus ou au-dessous d'un bord */
const JEU = 1
/** Sous cette réduction, le message final avertit (la page est très large) */
export const TRES_REDUITE = 0.3
/** Au-dessus de cette réduction, la page est dite à sa taille réelle */
const REELLE = 0.995

export type Orientation = 'portrait' | 'paysage'

/** Une feuille vierge, dans les trois mesures */
export interface Papier {
  orientation: Orientation
  /** En points, pour le PDF */
  pt: { l: number; h: number }
  /** En pixels de l'image (200 ppp) */
  px: { l: number; h: number }
  /** En px CSS (l'image fait px / DPR_PDF px CSS) */
  css: { l: number; h: number }
  /** La zone où l'on peint la page, dans les marges, en px CSS */
  utile: { x: number; y: number; l: number; h: number }
}

/** La feuille A4 dans ce sens */
export function papier(orientation: Orientation): Papier {
  const portrait = orientation === 'portrait'
  const lmm = portrait ? 210 : 297, hmm = portrait ? 297 : 210
  const px = { l: Math.round(lmm / 25.4 * PPP), h: Math.round(hmm / 25.4 * PPP) }
  return {
    orientation,
    pt: portrait ? { l: A4.l, h: A4.h } : { l: A4.h, h: A4.l },
    px,
    css: { l: px.l / DPR_PDF, h: px.h / DPR_PDF },
    utile: {
      x: MARGES.gauche * PX_PAR_MM, y: MARGES.haut * PX_PAR_MM,
      l: (lmm - MARGES.gauche - MARGES.droite) * PX_PAR_MM, h: (hmm - MARGES.haut - MARGES.bas) * PX_PAR_MM,
    },
  }
}

/** Une feuille d'une page : la bande du monde qu'elle montre (y0 à y1), la
 *  caméra qui l'y pose (écran = monde × z + (x, y), en px CSS de la
 *  feuille), son rang parmi les feuilles de la page */
export interface FeuilleDePage {
  y0: number; y1: number
  cam: { x: number; y: number; z: number }
  partie: number; parties: number
}

export interface MiseEnPage {
  papier: Papier
  /** La réduction : 1 à l'échelle réelle */
  k: number
  /** Les px CSS de la feuille par unité du monde */
  z: number
  feuilles: FeuilleDePage[]
}

/**
 * Les feuilles d'une page dont le contenu occupe cette boîte (unités du
 * monde) ; obstacles : les boîtes de ses formes, que les coupes évitent
 * (sans les droites prolongées, qui traversent tout). Le contenu, avec un
 * air de 8 unités, est centré dans la largeur utile et calé en haut ; la
 * même caméra, décalée, sert à chaque feuille : le quadrillage du fond
 * continue d'une feuille à l'autre. Le sens et l'échelle : voir plus haut.
 */
export function mettreEnPage(contenu: Boite, obstacles: readonly Boite[]): MiseEnPage {
  const fini = (v: number, d: number) => Number.isFinite(v) ? v : d
  const x0 = fini(contenu.x, 0), y0 = fini(contenu.y, 0)
  const L = Math.max(1, fini(contenu.l, 0) + 2 * MARGE_CONTENU), H = Math.max(1, fini(contenu.h, 0) + 2 * MARGE_CONTENU)
  const portrait = papier('portrait'), paysage = papier('paysage')
  /** L'échelle qui fait tenir le contenu dans la largeur de la feuille, et
   *  celle qui le fait tenir sur une seule feuille */
  const aLaLargeur = (p: Papier) => Math.min(1, p.utile.l / (L * Z_REEL))
  const surUne = (p: Papier) => Math.min(aLaLargeur(p), p.utile.h / (H * Z_REEL))
  const kp = surUne(portrait), kq = surUne(paysage), largeur = aLaLargeur(portrait)
  let p: Papier, k: number
  if (Math.max(kp, kq) >= REDUCTION_POUR_UNE_FEUILLE * largeur) {
    // Une seule feuille, dans le sens qui la montre le plus grand
    const egal = Math.abs(kq - kp) <= 1e-9 * Math.max(kp, kq)
    p = kq > kp && !egal ? paysage : egal && L / H > RAPPORT_PAYSAGE ? paysage : portrait
    k = p === paysage ? kq : kp
  } else {
    // Une page haute : portrait, à la largeur, découpée
    p = portrait; k = largeur
  }
  const z = Z_REEL * k
  const haut = y0 - MARGE_CONTENU, bas = haut + H
  const bandes = decouper(obstacles, haut, bas, p.utile.h / z)
  const x = p.utile.x + (p.utile.l - L * z) / 2 - (x0 - MARGE_CONTENU) * z
  return {
    papier: p, k, z,
    feuilles: bandes.map((b, i) => ({ ...b, cam: { x, y: p.utile.y - b.y0 * z, z }, partie: i + 1, parties: bandes.length })),
  }
}

/**
 * Découpe la hauteur de haut à bas (unités du monde) en bandes d'au plus
 * hauteurUtile. Tant que ce qui reste dépasse une feuille, on coupe là où le
 * moins de boîtes passent : d'abord le moins de boîtes qui tiendraient
 * entières sur une feuille (une figure, une ligne d'écriture : la couper
 * se voit, et elle tiendrait sur la suivante), puis le moins de boîtes en
 * tout (une figure plus haute qu'une feuille est coupée de toute façon) ;
 * à égalité, la plus basse (la feuille est la plus remplie). Les places
 * possibles : juste au-dessus ou juste au-dessous d'un bord de boîte, et le
 * bas de la feuille, entre 60 et 100 % de la hauteur utile ; si toutes y
 * traversent une boîte qui tiendrait sur une feuille, aussi plus haut,
 * jusqu'à 25 % (au-dessus d'une figure qui commence vers le milieu de la
 * feuille : elle passe entière sur la suivante). Des lignes d'écriture
 * sont coupées dans leur interligne. Un vide est sauté : quand rien ne
 * passe à la coupe, la bande suivante commence juste au-dessus de la
 * prochaine boîte (8 unités d'air), si bien qu'un grand vide de la page
 * infinie ne donne jamais de feuille blanche ; les bandes ne se suivent
 * alors pas (la caméra de chaque feuille part de son haut). Sans boîte, les
 * bandes se suivent. Le compte se fait par recherche dans les bords triés :
 * une page de dix mille traits reste rapide.
 */
export function decouper(boites: readonly Boite[], haut: number, bas: number, hauteurUtile: number): { y0: number; y1: number }[] {
  if (!(hauteurUtile > 0) || !Number.isFinite(haut) || !(bas > haut)) return [{ y0: haut, y1: Math.max(haut, bas) }]
  const valides = boites.filter(b => Number.isFinite(b.y) && Number.isFinite(b.h) && b.h > 0)
  const petites = valides.filter(b => b.h <= hauteurUtile)
  const tri = (bs: Boite[], f: (b: Boite) => number) => bs.map(f).sort((a, b) => a - b)
  const hauts = tri(valides, b => b.y), bass = tri(valides, b => b.y + b.h)
  const hautsP = tri(petites, b => b.y), bassP = tri(petites, b => b.y + b.h)
  /** Combien de ces boîtes la ligne y traverse : celles qui commencent
   *  au-dessus et finissent au-dessous (une boîte a une hauteur : finir
   *  au-dessus de y suppose d'avoir commencé au-dessus) */
  const traversees = (y: number) => compterAvant(hauts, y, false) - compterAvant(bass, y, true)
  const evitables = (y: number) => compterAvant(hautsP, y, false) - compterAvant(bassP, y, true)
  /** La meilleure coupe entre min et max (max compris) */
  const meilleure = (min: number, max: number) => {
    let c = max, ev = evitables(max), tr = traversees(max)
    const essayer = (y: number) => {
      if (!(y >= min && y <= max)) return
      const e = evitables(y), t = traversees(y)
      if (e < ev || (e === ev && (t < tr || (t === tr && y > c)))) { c = y; ev = e; tr = t }
    }
    for (let i = compterAvant(hauts, min + JEU, false); i < hauts.length && hauts[i] - JEU <= max; i++) essayer(hauts[i] - JEU)
    for (let i = compterAvant(bass, min - JEU, false); i < bass.length && bass[i] + JEU <= max; i++) essayer(bass[i] + JEU)
    return { c, ev }
  }
  const r: { y0: number; y1: number }[] = []
  let y = haut
  // Une coupe avance d'au moins 25 % de la hauteur utile : le nombre de
  // tours est borné ; la garde ne sert qu'aux nombres déraisonnables
  for (let tours = 0; bas - y > hauteurUtile * (1 + 1e-9) && tours < 100_000; tours++) {
    let m = meilleure(y + DEBUT_COUPE * hauteurUtile, y + hauteurUtile)
    if (m.ev > 0) {
      const plusHaut = meilleure(y + COUPE_AU_PLUS_HAUT * hauteurUtile, y + DEBUT_COUPE * hauteurUtile)
      if (plusHaut.ev < m.ev) m = plusHaut
    }
    r.push({ y0: y, y1: m.c })
    y = m.c
    // Un vide après la coupe : la bande suivante part au-dessus de ce qui suit
    if (traversees(y) === 0) {
      const i = compterAvant(hauts, y, false)
      if (i < hauts.length) y = Math.max(y, Math.min(bas, hauts[i] - MARGE_CONTENU))
    }
  }
  r.push({ y0: y, y1: bas })
  return r
}

/** Le nombre de valeurs de la liste triée qui sont < y (ou ≤ y, inclus) */
function compterAvant(triees: readonly number[], y: number, inclus: boolean): number {
  let a = 0, b = triees.length
  while (a < b) {
    const m = (a + b) >> 1
    if (triees[m] < y || (inclus && triees[m] === y)) a = m + 1
    else b = m
  }
  return a
}

// ---------- Les textes ----------

/** « 72 % » : une réduction lisible */
export function pourcent(k: number): string { return `${Math.round(k * 100)} %` }

/** La page est-elle réduite (pas à sa taille réelle) ? */
export function reduite(k: number): boolean { return k < REELLE }

/**
 * Le pied de page d'une feuille : à gauche « Page 3 · Exercice 12 p. 84 »
 * (le nom s'il y en a un), « (2/3) » sur une page en plusieurs feuilles,
 * « · réduite à 72 % » si elle n'est pas à sa taille réelle ; à droite le
 * numéro de la feuille dans le PDF, « 4 / 12 ».
 */
export function piedDePage(o: { numero: number; nom: string | null; partie: number; parties: number; k: number; feuille: number; feuilles: number }): { gauche: string; droite: string } {
  let gauche = `Page ${o.numero}`
  if (o.nom) gauche += ` · ${o.nom}`
  if (o.parties > 1) gauche += ` (${o.partie}/${o.parties})`
  if (reduite(o.k)) gauche += ` · réduite à ${pourcent(o.k)}`
  return { gauche, droite: `${o.feuille} / ${o.feuilles}` }
}

/** « 2 », « 2 et 5 », « 2, 5 et 7 » */
export function listeNumeros(ns: readonly number[]): string {
  if (ns.length <= 1) return ns.map(String).join('')
  return `${ns.slice(0, -1).join(', ')} et ${ns[ns.length - 1]}`
}

const deux = (n: number) => String(n).padStart(2, '0')
const MOIS = ['janvier', 'février', 'mars', 'avril', 'mai', 'juin', 'juillet', 'août', 'septembre', 'octobre', 'novembre', 'décembre']

/** « 2026-10-09 » : la date d'un nom de fichier (heure de l'ordinateur) */
export function dateDeFichier(t: number): string {
  const d = new Date(t)
  return `${d.getFullYear()}-${deux(d.getMonth() + 1)}-${deux(d.getDate())}`
}

/** « 9 octobre 2026 », « 1er octobre 2026 » */
function dateEnLettres(t: number): string {
  const d = new Date(t)
  return `${d.getDate() === 1 ? '1er' : d.getDate()} ${MOIS[d.getMonth()]} ${d.getFullYear()}`
}

/** Au-delà de ce nombre de numéros, le nom du fichier ne les donne plus */
const NUMEROS_AU_PLUS = 5

/** Ce qu'on exporte : tout le tableau, ou ces pages (leurs numéros dans
 *  l'ordre ; nom : celui de la page, quand il n'y en a qu'une) */
export interface QuoiExporter { tout: boolean; numeros: readonly number[]; nom: string | null; date: number }

/**
 * Le nom du fichier : « tableau-2026-10-09.pdf » (tout le tableau), le nom
 * de la page nettoyé (une page nommée), « page-3-2026-10-09.pdf »,
 * « pages-2-5-7-2026-10-09.pdf » (plusieurs pages ; au-delà de cinq
 * numéros, « pages-2026-10-09.pdf »).
 */
export function nomDuPdf(q: QuoiExporter): string {
  const jour = dateDeFichier(q.date)
  if (q.tout) return `tableau-${jour}.pdf`
  if (q.numeros.length === 1) return q.nom ? nomDeFichier(q.nom, 'pdf') : `page-${q.numeros[0]}-${jour}.pdf`
  if (q.numeros.length > NUMEROS_AU_PLUS) return `pages-${jour}.pdf`
  return `pages-${q.numeros.join('-')}-${jour}.pdf`
}

/** Le titre du PDF (ce que montre le lecteur de PDF) : « Tableau du 9
 *  octobre 2026 », « Page 3 · Exercice 12 p. 84 », « Pages 2, 5 et 7 »
 *  (au-delà de cinq numéros, « 12 pages du tableau du 9 octobre 2026 ») */
export function titreDuPdf(q: QuoiExporter): string {
  if (q.tout) return `Tableau du ${dateEnLettres(q.date)}`
  if (q.numeros.length === 1) return `Page ${q.numeros[0]}${q.nom ? ' · ' + q.nom : ''}`
  if (q.numeros.length > NUMEROS_AU_PLUS) return `${q.numeros.length} pages du tableau du ${dateEnLettres(q.date)}`
  return `Pages ${listeNumeros(q.numeros)}`
}

/** Le message quand rien ne s'exporte (pas de fichier) */
export function texteRien(quoi: 'page' | 'pages' | 'tout'): string {
  if (quoi === 'page') return 'Rien à exporter : la page est vide.'
  if (quoi === 'pages') return 'Rien à exporter : les pages choisies sont vides.'
  return 'Rien à exporter : le tableau est vide.'
}

/**
 * Le message final : « PDF prêt : tableau-2026-10-09.pdf (12 feuilles A4,
 * 2,4 Mo). », suivi des pages vides (« La page 4 est vide : elle n'est pas
 * dans le PDF. ») et des pages très réduites (« La page 4 est très large :
 * réduite à 18 %. »).
 */
export function texteFini(o: { fichier: string; feuilles: number; octets: number; vides: readonly number[]; tresReduites: readonly { numero: number; k: number }[] }): string {
  let t = `PDF prêt : ${o.fichier} (${o.feuilles} feuille${o.feuilles > 1 ? 's' : ''} A4, ${tailleLisible(o.octets)}).`
  if (o.vides.length === 1) t += ` La page ${o.vides[0]} est vide : elle n'est pas dans le PDF.`
  else if (o.vides.length > 1) t += ` Les pages ${listeNumeros(o.vides)} sont vides : elles ne sont pas dans le PDF.`
  for (const r of o.tresReduites) t += ` La page ${r.numero} est très large : réduite à ${pourcent(r.k)}.`
  return t
}

/** « Export en PDF : feuille 3 sur 12… » */
export function texteProgression(feuille: number, feuilles: number): string {
  return `Export en PDF : feuille ${feuille} sur ${feuilles}…`
}
