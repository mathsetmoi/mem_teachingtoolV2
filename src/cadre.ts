// =============================================================
// LE CADRE DE TAILLE ET LA PASTILLE ↻ (lot 5) : LE CALCUL
// Agrandir, réduire et tourner ce qu'on a pris (une image, une formule, un
// trait, un groupe, plusieurs objets) : les matrices, ce qu'elles font à
// chaque type de forme, les bornes à ne pas franchir, les aimants, « Remettre
// droit », où se placent les poignées, et ce que font leurs gestes (K6 : la
// matrice d'un coin ou d'un côté tiré, l'angle tourné, les mesures, les
// curseurs, le cadre pendant le geste, ce que la barre d'actions et le menu
// complet contournent). Tout est pur (aucun DOM) : il se teste sous Node. Le
// dessin des poignées vient du rendu, le câblage des gestes de l'App ;
// App.transformerSelection écrit ce que calcule transformerForme, en une
// seule transaction.
//
// Une transformation est une matrice affine M = (a, b, c, d, e, f), dans
// l'ordre de ctx.transform : le point (x, y) va en (a·x + c·y + e,
// b·x + d·y + f). Les angles sont en radians, dans le sens de ctx.rotate
// (horaire à l'écran : l'axe des y descend) ; c'est aussi celui de la
// rotation d'une formule (types.ts).
//
// Ce qu'une transformation fait à une forme (D9 du lot 5). Tout est « cuit »
// dans ses coordonnées (les points d'un trait, les sommets d'une figure, la
// matrice d'une image) : la version d'avant le lot 5 voit le résultat tel
// quel. Seule une formule garde sa rotation dans un champ : son texte reste
// en HTML, vectoriel, net à tout zoom (la version d'avant la montre droite).
// Un trait agrandi s'épaissit avec lui, comme l'image d'une écriture (c'est
// surtout de l'écriture : agrandir un mot, c'est en faire une image plus
// grande) ; réduit, il garde au moins 1 d'épaisseur, pour rester lisible au
// vidéoprojecteur. Une figure garde l'épaisseur de son contour et la taille
// de ses noms, comme l'homothétie de « Transformer » ; ses noms tournent
// avec elle à la même distance de leur point, et son codage se recalcule.
// =============================================================
import type { Boite } from './geometrie'
import { coinsFormule, coinsImage, rotationDe } from './geometrie'
import type { P } from './formes'
import { centreDe, sommetsDe, versRelatif } from './formes'
import type { Forme, Formule, Habillage, ImageForme } from './types'
import { BORNE, ECHELLE_MAX, TAILLE_MAX } from './presse-papiers'
import type { TypePointeur } from './pointeurs'
import { POIGNEE } from './pointeurs'

const DEG = Math.PI / 180

// ---------- Les matrices ----------
/** (a, b, c, d, e, f) : x' = a·x + c·y + e, y' = b·x + d·y + f (comme ctx.transform) */
export type Matrice = [number, number, number, number, number, number]

export const IDENTITE: Matrice = [1, 0, 0, 1, 0, 0]

export function appliquer(M: Matrice, p: P): P {
  return { x: M[0] * p.x + M[2] * p.y + M[4], y: M[1] * p.x + M[3] * p.y + M[5] }
}

/** M d'abord, puis N : appliquer(composer(M, N), p) = appliquer(N, appliquer(M, p)) */
export function composer(M: Matrice, N: Matrice): Matrice {
  const [a, b, c, d, e, f] = M, [A, B, C, D, E, F] = N
  return [A * a + C * b, B * a + D * b, A * c + C * d, B * c + D * d, A * e + C * f + E, B * e + D * f + F]
}

/** Un cosinus ou un sinus qui n'est presque rien est nul : un quart de tour
 *  donne des sommets exacts, et une image tournée d'un quart de tour garde
 *  des coefficients nuls (pas 6e-17) */
const net = (v: number) => (Math.abs(v) < 1e-15 ? 0 : v)

/** Une échelle de kx et ky autour de l'ancre, dans des axes tournés de
 *  `angle` (ceux d'une image, pour la déformer dans ses propres axes ; 0 :
 *  les axes de l'écran). kx = ky : une homothétie. */
export function echelle(ancre: P, kx: number, ky: number, angle = 0): Matrice {
  const c = net(Math.cos(angle)), s = net(Math.sin(angle))
  const a = kx * c * c + ky * s * s, b = (kx - ky) * c * s, d = kx * s * s + ky * c * c
  return [a, b, b, d, ancre.x - a * ancre.x - b * ancre.y, ancre.y - b * ancre.x - d * ancre.y]
}

/** Une rotation de a radians (sens de ctx.rotate) autour du centre */
export function rotation(centre: P, a: number): Matrice {
  const c = net(Math.cos(a)), s = net(Math.sin(a))
  return [c, s, -s, c, centre.x - c * centre.x + s * centre.y, centre.y - s * centre.x - c * centre.y]
}

/** La transformation inverse (null : M écrase le plan) */
export function inverser(M: Matrice): Matrice | null {
  const [a, b, c, d, e, f] = M, det = a * d - b * c
  if (!Number.isFinite(det) || Math.abs(det) < 1e-300) return null
  const A = d / det, B = -b / det, C = -c / det, D = a / det
  return [A, B, C, D, -(A * e + C * f), -(B * e + D * f)]
}

/** La place d'une image comme une matrice : le pixel (u, v) va en
 *  appliquer(matriceImage(f), { x: u, y: v }) */
export function matriceImage(f: { x: number; y: number; m: ImageForme['m'] }): Matrice {
  return [f.m[0], f.m[1], f.m[2], f.m[3], f.x, f.y]
}

export function estIdentite(M: Matrice, tol = 1e-9): boolean {
  return M.every((v, i) => Math.abs(v - IDENTITE[i]) <= tol)
}

/** L'angle dont M tourne (celui de l'image de l'axe des x) */
export function angleDe(M: Matrice): number { return Math.atan2(M[1], M[0]) }

/** Le facteur moyen de M : la racine de son déterminant (une similitude :
 *  son rapport ; sinon la moyenne géométrique de ses deux étirements) */
export function facteurDe(M: Matrice): number { return Math.sqrt(Math.abs(M[0] * M[3] - M[1] * M[2])) }

/** Un angle ramené dans ]−π, π] */
export function angleNormal(a: number): number { return a - 2 * Math.PI * Math.ceil((a - Math.PI) / (2 * Math.PI)) }

// ---------- Ce qu'une transformation fait à une forme ----------
/** La plus petite taille d'une formule (unités monde) : en dessous, elle ne se lit plus */
export const TAILLE_FORMULE_MIN = 6
/** Le plus petit côté d'une image (unités monde) qu'une réduction laisse */
export const COTE_IMAGE_MIN = 4
/** La plus petite épaisseur qu'une réduction laisse à un trait (unités monde) */
export const EPAISSEUR_MIN = 1
/** Le déterminant d'une image que la liste blanche du presse-papiers refuse en deçà */
const DET_MIN = 1e-12

const dixieme = (v: number) => Math.round(v * 10) / 10 || 0
const centieme = (v: number) => Math.round(v * 100) / 100 || 0
const demi = (v: number) => Math.round(v * 2) / 2 || 0

/** Une taille v multipliée par k, arrondie, sans FRANCHIR les bornes : elle
 *  s'arrête à une borne qu'elle passerait ; une taille déjà hors des bornes
 *  (un trait déjà plus fin que 1) ne change pas dans ce sens-là (réduit, il
 *  garde la sienne), mais revient librement vers elles */
function borner(v: number, k: number, min: number, max: number, arrondi: (x: number) => number): number {
  const t = arrondi(v * k)
  if (t < min) return Math.max(t, Math.min(v, min))
  if (t > max) return Math.min(t, Math.max(v, max))
  return t
}

/** L'épaisseur d'un trait (et du tracé d'origine d'une figure) : × k, au centième, entre 1 et 1000 */
const epaisseur = (v: number, k: number) => borner(v, k, EPAISSEUR_MIN, TAILLE_MAX, centieme)

/** Les décalages des noms (relatifs à leur point), tournés de t : même longueur */
function tournerDecalages(l: Habillage['posNoms'], t: number): Habillage['posNoms'] {
  if (!l) return l
  const c = net(Math.cos(t)), s = net(Math.sin(t))
  return l.map(o => (o ? { x: o.x * c - o.y * s, y: o.x * s + o.y * c } : o))
}

/** Le tracé à main levée d'origine d'une figure reconnue (relatif à (x, y)
 *  de l'ancienne), transformé, relatif au (x, y) de la nouvelle : « Main
 *  levée » rend le tracé tourné et agrandi */
function transformerBrut(b: Habillage['brut'], de: P, vers: P, M: Matrice, k: number): Habillage['brut'] {
  if (!b) return b
  const pts: number[] = []
  for (let i = 0; i + 2 < b.pts.length; i += 3) {
    const q = appliquer(M, { x: de.x + b.pts[i], y: de.y + b.pts[i + 1] })
    pts.push(dixieme(q.x - vers.x), dixieme(q.y - vers.y), b.pts[i + 2])
  }
  return { ...b, pts, taille: epaisseur(b.taille, k) }
}

/**
 * La forme transformée par M : le même identifiant, le même rang, tout le
 * reste gardé (verrou, groupe, lien à une image, couleurs, noms, styles…).
 * - un trait : chaque point par M, (x, y) au premier, les autres relatifs au
 *   dixième, la pression telle quelle ; son épaisseur × le facteur de M
 *   (au centième, entre 1 et 1000 ; un trait déjà plus fin que 1 garde la
 *   sienne quand on le réduit) ;
 * - une image : son coin par M, sa matrice composée avec la partie
 *   linéaire de M (elle tourne, s'agrandit, se déforme dans ses axes) ;
 * - une formule : son coin par M ; sa taille × le facteur (au demi, entre 6
 *   et 1000), KaTeX la remet en page, nette ; sa rotation + l'angle de M,
 *   dans ]−π, π], la clé absente quand elle ne tourne plus (une formule ne se
 *   déforme jamais : pour une M qui ne serait pas une similitude, son facteur
 *   moyen) ;
 * - un polygone : ses sommets par M (au dixième, comme Transformer) ; son
 *   épaisseur, ses noms, leurs styles, son codage, sa droite gardés ; les
 *   noms déplacés à la main tournent de l'angle de M, à la même distance ; le
 *   tracé d'origine suit (au facteur de M) ;
 * - un cercle : son centre par M, son rayon × le facteur, un arc tourne de
 *   l'angle de M ; ses noms et son tracé d'origine comme ci-dessus ;
 * - un ancien segment (v0.1) : ses deux bouts par M, son épaisseur gardée.
 */
export function transformerForme(f: Forme, M: Matrice): Forme {
  const k = facteurDe(M), t = angleDe(M)
  const par = (x: number, y: number) => appliquer(M, { x, y })
  switch (f.type) {
    case 'trait': {
      const n = Math.floor(f.pts.length / 3)
      if (!n) { const o = par(f.x, f.y); return { ...f, x: o.x, y: o.y, taille: epaisseur(f.taille, k) } }
      const abs: P[] = []
      for (let i = 0; i < n; i++) abs.push(par(f.x + f.pts[3 * i], f.y + f.pts[3 * i + 1]))
      const o = abs[0], pts: number[] = []
      abs.forEach((q, i) => pts.push(dixieme(q.x - o.x), dixieme(q.y - o.y), f.pts[3 * i + 2]))
      return { ...f, x: o.x, y: o.y, pts, taille: epaisseur(f.taille, k) }
    }
    case 'image': {
      const o = par(f.x, f.y), [a, b, c, d] = f.m, [A, B, C, D] = M
      return { ...f, x: o.x, y: o.y, m: [A * a + C * b, B * a + D * b, A * c + C * d, B * c + D * d] }
    }
    case 'formule': {
      const o = par(f.x, f.y)
      const g: Formule = { ...f, x: o.x, y: o.y, taille: borner(f.taille, k, TAILLE_FORMULE_MIN, TAILLE_MAX, demi) }
      const r = angleNormal(rotationDe(f) + t)
      if (Math.abs(r) < 1e-6) delete g.rotation
      else g.rotation = r
      return g
    }
    case 'polygone': {
      const s = sommetsDe(f)
      if (!s.length) { const o = par(f.x, f.y); return { ...f, x: o.x, y: o.y } }
      const r = versRelatif(s.map(q => appliquer(M, q)))
      const g = { ...f, ...r }
      if (f.posNoms) g.posNoms = tournerDecalages(f.posNoms, t)
      if (f.brut) g.brut = transformerBrut(f.brut, f, g, M, k)
      return g
    }
    case 'cercle': {
      const o = par(f.x, f.y)
      const g = { ...f, x: o.x, y: o.y, r: f.r * k }
      if (f.arc) g.arc = { a0: f.arc.a0 + t, a1: f.arc.a1 + t }
      if (f.posNoms) g.posNoms = tournerDecalages(f.posNoms, t)
      if (f.brut) g.brut = transformerBrut(f.brut, f, g, M, k)
      return g
    }
    case 'segment': {
      const a = par(f.x, f.y), b = par(f.x + f.dx, f.y + f.dy)
      return { ...f, x: a.x, y: a.y, dx: b.x - a.x, dy: b.y - a.y }
    }
  }
}

/**
 * Les facteurs uniformes (de min à max) pour lesquels TOUTE forme
 * transformée reste dans les bornes de la liste blanche du presse-papiers
 * (presse-papiers.ts : places et longueurs sous BORNE, tailles sous
 * TAILLE_MAX, coefficients d'une image sous 10 000, son déterminant au-dessus
 * de 1e-12 ; sinon sa copie serait refusée en entier) et reste visible :
 * une formule d'au moins 6 de taille, une image d'au moins 4 unités de côté.
 * Un trait ne borne rien en bas : transformerForme lui laisse toujours au
 * moins 1 d'épaisseur s'il l'avait. Les places : la boîte de ces formes, que
 * l'ancre (un coin du cadre, son centre) touche, ne s'éloigne pas au-delà de
 * BORNE. mesure : la taille d'une formule (sa boîte locale). Toujours
 * min ≤ 1 ≤ max : ce qu'on a déjà (une forme d'avant hors de ces bornes)
 * tourne encore sans changer de taille.
 */
export function bornesEchelle(formes: readonly Forme[], mesure: (f: Formule) => { l: number; h: number }): { min: number; max: number } {
  let min = 0, max = Infinity
  const auMoins = (k: number) => { if (k > min) min = k }
  const auPlus = (k: number) => { if (k < max) max = k }
  let x1 = Infinity, y1 = Infinity, x2 = -Infinity, y2 = -Infinity
  const voir = (q: P) => { x1 = Math.min(x1, q.x); x2 = Math.max(x2, q.x); y1 = Math.min(y1, q.y); y2 = Math.max(y2, q.y) }
  for (const f of formes) {
    voir(f)
    switch (f.type) {
      case 'trait':
        if (f.taille > 0 && f.taille <= TAILLE_MAX) auPlus(TAILLE_MAX / f.taille)
        for (let i = 0; i + 1 < f.pts.length; i += 3) voir({ x: f.x + f.pts[i], y: f.y + f.pts[i + 1] })
        break
      case 'formule': {
        if (f.taille > 0 && f.taille <= TAILLE_MAX) auPlus(TAILLE_MAX / f.taille)
        if (f.taille >= TAILLE_FORMULE_MIN) auMoins(TAILLE_FORMULE_MIN / f.taille)
        const m = mesure(f)
        coinsFormule(f, { x: f.x, y: f.y, l: m.l, h: m.h }).forEach(voir)
        break
      }
      case 'image': {
        const [a, b, c, d] = f.m, nu = Math.hypot(a, b), nv = Math.hypot(c, d), det = Math.abs(a * d - b * c)
        const cote = Math.min(nu * f.l, nv * f.h)
        if (cote >= COTE_IMAGE_MIN) auMoins(COTE_IMAGE_MIN / cote)
        if (det > 0) auMoins(Math.sqrt(DET_MIN / det))
        // Tournée, un coefficient ne dépasse jamais la longueur de sa colonne
        const n = Math.max(nu, nv)
        if (n > 0 && n <= ECHELLE_MAX) auPlus(ECHELLE_MAX / n)
        coinsImage(f).forEach(voir)
        break
      }
      case 'polygone': sommetsDe(f).forEach(voir); break
      case 'cercle':
        if (f.r > 0 && f.r <= BORNE) auPlus(BORNE / f.r)
        voir({ x: f.x - f.r, y: f.y - f.r }); voir({ x: f.x + f.r, y: f.y + f.r })
        break
      case 'segment': voir({ x: f.x + f.dx, y: f.y + f.dy }); break
    }
  }
  if (x1 !== Infinity) {
    const loin = Math.max(Math.abs(x1), Math.abs(x2), Math.abs(y1), Math.abs(y2)), diag = Math.hypot(x2 - x1, y2 - y1)
    if (diag > 0) auPlus((BORNE - loin) / (2 * diag))
  }
  // Un rien en deçà des bornes : un calcul aux bornes mêmes ne les dépasse pas d'un arrondi
  return { min: Math.min(1, min * (1 + 1e-9)), max: Math.max(1, max * (1 - 1e-9)) }
}

/** La forme est-elle dans les bornes de la liste blanche du presse-papiers
 *  pour ce qu'une transformation change (ses places, ses longueurs, ses
 *  tailles, la matrice d'une image) ? Un dernier garde-fou après
 *  transformerForme (bornesEchelle borne déjà le facteur) : une forme qui en
 *  sortirait ne pourrait plus se copier. */
export function dansLesBornes(f: Forme): boolean {
  const place = (v: number) => Number.isFinite(v) && Math.abs(v) <= BORNE
  const taille = (v: number) => Number.isFinite(v) && v > 0 && v <= TAILLE_MAX
  const noms = (l: Habillage['posNoms']) => !l || l.every(o => !o || (place(o.x) && place(o.y)))
  if (!place(f.x) || !place(f.y)) return false
  switch (f.type) {
    case 'trait': return taille(f.taille) && f.pts.every(place)
    case 'polygone': return f.pts.every(place) && noms(f.posNoms)
    case 'cercle': return place(f.r) && f.r > 0 && noms(f.posNoms) && (!f.arc || (place(f.arc.a0) && place(f.arc.a1)))
    case 'segment': return place(f.dx) && place(f.dy)
    case 'formule': return taille(f.taille) && (f.rotation === undefined || Number.isFinite(f.rotation))
    case 'image': {
      const [a, b, c, d] = f.m, det = a * d - b * c
      return f.m.every(v => Number.isFinite(v) && Math.abs(v) <= ECHELLE_MAX) && Number.isFinite(det) && Math.abs(det) >= DET_MIN
    }
  }
}

// ---------- Les aimants ----------
/** À cet écart (degrés) ou moins, un multiple de 45° attire l'angle tourné */
export const AIMANT_ANGLE = 3
/** À cet écart relatif ou moins, la taille d'origine (× 1) attire le facteur */
export const AIMANT_ECHELLE = 0.03

/**
 * L'angle dont on a tourné (radians), aimanté (D8 du lot 5) : avec Maj, le
 * multiple de 15° le plus proche (comme tldraw, Excalidraw, Figma) ; sans
 * Maj, un multiple de 45° l'attire à ±3°, SAUF 0 (et les tours entiers) ;
 * sinon l'arrondi au degré. Un choix propre à MEM, qui s'écarte de l'étude
 * (un aimant à 0) et des instruments (aimantés tous les 15° à ±2,5°) : un
 * instrument a une orientation qui compte en elle-même (la règle
 * horizontale) ; un objet tourne depuis là où il est, et l'énoncé
 * photographié de travers doit pouvoir tourner de 2° (« Remettre droit »
 * ramène exactement à 0). Sans aimant, 90° pile serait introuvable au TNI.
 */
export function aimanterAngle(delta: number, maj: boolean): number {
  const deg = delta / DEG
  if (maj) return Math.round(deg / 15) * 15 * DEG
  const q = Math.round(deg / 45) * 45
  if (q % 360 !== 0 && Math.abs(deg - q) <= AIMANT_ANGLE) return q * DEG
  return Math.round(deg) * DEG
}

/** Le facteur de taille, aimanté : × 1 l'attire à ±3 % (on revient à la
 *  taille d'origine sans viser) ; sinon l'arrondi au centième (jamais 0) */
export function aimanterEchelle(k: number): number {
  if (Math.abs(k - 1) <= AIMANT_ECHELLE) return 1
  return Math.max(0.01, Math.round(k * 100) / 100)
}

// ---------- Remettre droit ----------
/** L'angle dont une image est tournée : celui de son bord du haut ; pour une
 *  image retournée par une symétrie (son déterminant est négatif), celui de
 *  son bord de gauche (le haut de l'image en haut : retournée de gauche à
 *  droite, elle se lit à l'envers mais elle est droite) */
export function angleImage(m: ImageForme['m']): number {
  const [a, b, c, d] = m
  return a * d - b * c >= 0 ? Math.atan2(b, a) : Math.atan2(-c, d)
}

/** Une image tourne-t-elle (de plus d'un demi-degré) ? */
export function imageTournee(f: ImageForme): boolean { return Math.abs(angleImage(f.m)) > 0.5 * DEG }

/**
 * « Remettre droit » (D20 du lot 5) : une image tournée (de plus d'un
 * demi-degré) ou une formule tournée, sans sa rotation, la taille et le
 * centre gardés ; une image retournée par une symétrie le reste (elle est
 * seulement remise le haut en haut, voir angleImage). Pour une formule, son
 * centre vient de sa mesure (sa boîte locale) ; sans elle, elle tourne autour
 * de son coin. null : rien à redresser. C'est le chemin de retour quand
 * l'aimant n'a pas suffi, et le seul moyen de revenir exactement à 0.
 */
export function redresser(f: Forme, mesure?: (f: Formule) => { l: number; h: number }): Forme | null {
  if (f.type === 'image') {
    if (!imageTournee(f)) return null
    const t = angleImage(f.m), c = net(Math.cos(-t)), s = net(Math.sin(-t))
    const [a, b, cc, d] = f.m
    let m: [number, number, number, number] = [c * a - s * b, s * a + c * b, c * cc - s * d, s * cc + c * d]
    // Ce que l'arrondi laisse d'une rotation (1e-17) est nul : droite, exactement
    const n = Math.max(...m.map(Math.abs))
    m = m.map(v => (Math.abs(v) < n * 1e-12 ? 0 : v)) as typeof m
    const centre = { x: f.x + (a * f.l + cc * f.h) / 2, y: f.y + (b * f.l + d * f.h) / 2 }
    return { ...f, m, x: centre.x - (m[0] * f.l + m[2] * f.h) / 2, y: centre.y - (m[1] * f.l + m[3] * f.h) / 2 }
  }
  if (f.type === 'formule' && rotationDe(f)) {
    const g: Formule = { ...f }
    delete g.rotation
    if (!mesure) return g
    const { l, h } = mesure(f)
    const c = coinsFormule(f, { x: f.x, y: f.y, l, h })
    const centre = { x: (c[0].x + c[2].x) / 2, y: (c[0].y + c[2].y) / 2 }
    g.x = centre.x - l / 2; g.y = centre.y - h / 2
    return g
  }
  return null
}

// ---------- Le cadre et ses poignées ----------
/**
 * Le cadre de taille de ce qu'on a pris, dans le monde (D7 et D8 du lot 5) :
 * - 'oriente' : une image seule (ses quatre coins, ses côtés pour la
 *   déformer), une formule seule (ses quatre coins) : le cadre tourne avec
 *   elle ;
 * - 'droit' : un trait seul, un groupe, plusieurs objets (un ancien segment
 *   seul aussi) : la boîte de tout, agrandie de 6 px d'écran, ses quatre
 *   coins (les proportions gardées) ;
 * - 'pastille' : une figure seule (un polygone d'au moins deux sommets, un
 *   arc) : pas de cadre, ses sommets restent ses poignées (lots 1 et 2), et
 *   l'homothétie de « Transformer » garde son sens ; seulement la pastille,
 *   qui la tourne autour de son centre.
 * coins : haut-gauche, haut-droit, bas-droit, bas-gauche (de l'objet, pour un
 * cadre orienté ; vide pour 'pastille') ; cotes : des poignées au milieu des
 * côtés ; centre : autour duquel la pastille fait tourner ; pastille : son
 * centre ; filet : du bord du cadre à elle ; dessous : elle est sous le
 * cadre (au-dessus, elle serait sortie de la zone libre).
 */
export interface Cadre {
  genre: 'oriente' | 'droit' | 'pastille'
  coins: P[]
  cotes: boolean
  centre: P
  pastille: P
  filet: [P, P]
  dessous: boolean
}

/** La marge du cadre droit autour de la boîte de ce qu'on a pris (px d'écran),
 *  celle du cadre en tirets de la sélection */
export const MARGE_CADRE = 6

/**
 * Le cadre de ces formes (celles qu'on a prises, libres ; un groupe y est
 * entier), ou null quand il n'y en a pas (rien, un point seul, un cercle
 * entier). o.boite : la boîte droite de chacune (englobante : pour une
 * formule tournée, celle de ses coins ; une droite par ses deux points) ;
 * o.mesure : la boîte locale d'une formule ; o.z : le zoom (px d'écran par
 * unité) ; o.pointeur : le dernier vu ; o.zoneLibre : ce qu'on voit entre les
 * barres, dans le monde.
 * Un cadre plus petit à l'écran que quatre poignées dans un sens : ses coins
 * sortent d'une poignée vers l'extérieur dans ce sens-là (l'objet lui-même
 * reste à prendre entre eux), et il n'a pas de côtés.
 * La pastille est AU-DESSUS du cadre, au milieu de son bord du haut (le haut
 * de l'objet, pour un cadre orienté), à POIGNEE.ecart du bord, au bout d'un
 * filet ; dessous si son centre sortait de la zone libre. C'est ce que
 * recommande l'étude et ce que font SMART, ActivInspire, Excalidraw et
 * PowerPoint.
 */
export function cadreDe(formes: readonly Forme[], o: {
  boite: (f: Forme) => Boite | null
  mesure: (f: Formule) => { l: number; h: number }
  z: number; pointeur: TypePointeur; zoneLibre: Boite
}): Cadre | null {
  if (!formes.length) return null
  const z = o.z > 0 ? o.z : 1, seule = formes.length === 1 ? formes[0] : null
  const marge = MARGE_CADRE / z
  let genre: Cadre['genre'], coins: P[], cotes = false, centre: P
  if (seule?.type === 'image') {
    genre = 'oriente'; coins = coinsImage(seule); cotes = true
    centre = milieu(coins[0], coins[2])
  } else if (seule?.type === 'formule') {
    const m = o.mesure(seule)
    genre = 'oriente'; coins = coinsFormule(seule, { x: seule.x, y: seule.y, l: m.l, h: m.h })
    centre = milieu(coins[0], coins[2])
  } else if (seule && (seule.type === 'polygone' || seule.type === 'cercle')) {
    if (seule.type === 'cercle' ? !seule.arc : seule.pts.length < 4) return null
    // Une droite, une demi-droite : le milieu de [AB], dans la boîte de [AB]
    // (jamais son étendue à l'écran, qui enverrait la pastille au bord, sous
    // une barre)
    let b: Boite | null
    if (seule.type === 'polygone' && seule.prolonge) {
      const [A, B] = sommetsDe(seule)
      centre = milieu(A, B)
      b = { x: Math.min(A.x, B.x), y: Math.min(A.y, B.y), l: Math.abs(B.x - A.x), h: Math.abs(B.y - A.y) }
    } else {
      centre = centreDe(seule)
      b = o.boite(seule)
    }
    if (!b) return null
    const r = grandir(b, marge)
    const haut = { x: r.x + r.l / 2, y: r.y }, bas = { x: r.x + r.l / 2, y: r.y + r.h }
    return { genre: 'pastille', coins: [], cotes: false, centre, ...pastille(haut, bas, { x: 0, y: -1 }, z, o, r) }
  } else {
    // Un trait, un ancien segment, un groupe, plusieurs objets : la boîte de tout
    let x1 = Infinity, y1 = Infinity, x2 = -Infinity, y2 = -Infinity
    for (const f of formes) {
      const b = o.boite(f)
      if (!b) continue
      x1 = Math.min(x1, b.x); y1 = Math.min(y1, b.y); x2 = Math.max(x2, b.x + b.l); y2 = Math.max(y2, b.y + b.h)
    }
    if (x1 === Infinity) return null
    const r = grandir({ x: x1, y: y1, l: x2 - x1, h: y2 - y1 }, marge)
    genre = 'droit'
    coins = [{ x: r.x, y: r.y }, { x: r.x + r.l, y: r.y }, { x: r.x + r.l, y: r.y + r.h }, { x: r.x, y: r.y + r.h }]
    centre = { x: r.x + r.l / 2, y: r.y + r.h / 2 }
  }
  // Les axes du cadre : u le long du bord du haut, v le long du bord de
  // gauche (vers le bas de l'objet)
  const lu = dist(coins[0], coins[1]), lv = dist(coins[0], coins[3])
  const u = lu > 0 ? { x: (coins[1].x - coins[0].x) / lu, y: (coins[1].y - coins[0].y) / lu } : { x: 1, y: 0 }
  let v = lv > 0 ? { x: (coins[3].x - coins[0].x) / lv, y: (coins[3].y - coins[0].y) / lv } : { x: -u.y, y: u.x }
  if (lv === 0 && lu === 0) v = { x: 0, y: 1 }
  // Trop petit à l'écran : les coins sortent d'une poignée dans le sens court
  const p = POIGNEE.dessin[o.pointeur], seuil = 4 * p
  const courtU = lu * z < seuil, courtV = lv * z < seuil
  if (courtU || courtV) {
    const d = p / z, su = courtU ? d : 0, sv = courtV ? d : 0
    const signes: [number, number][] = [[-1, -1], [1, -1], [1, 1], [-1, 1]]
    coins = coins.map((c, i) => ({ x: c.x + signes[i][0] * su * u.x + signes[i][1] * sv * v.x, y: c.y + signes[i][0] * su * u.y + signes[i][1] * sv * v.y }))
    cotes = false
  }
  const haut = milieu(coins[0], coins[1]), bas = milieu(coins[3], coins[2])
  return { genre, coins, cotes, centre, ...pastille(haut, bas, { x: -v.x, y: -v.y }, z, o, boiteDes(coins)) }
}

/** La pastille au-dessus du bord du haut (n : vers le dehors, depuis lui), ou
 *  sous le bord du bas si elle sortait de la zone libre. Ni l'un ni l'autre
 *  (un objet plus grand que ce qu'on voit, à 2000 % : ses deux bords sont
 *  hors de l'écran) : elle reste dans la zone libre, en bas, au plus près du
 *  milieu du bord du bas (la barre d'actions se pose alors en haut de la
 *  zone, voir placeBarre) ; seulement quand l'objet est en vue (cadre : sa
 *  boîte), sinon on montrerait une pastille sans objet. */
function pastille(haut: P, bas: P, n: P, z: number, o: { pointeur: TypePointeur; zoneLibre: Boite }, cadre: Boite): Pick<Cadre, 'pastille' | 'filet' | 'dessous'> {
  const e = POIGNEE.ecart[o.pointeur] / z
  const dessus = { x: haut.x + n.x * e, y: haut.y + n.y * e }
  const zl = o.zoneLibre
  const dans = (q: P) => q.x >= zl.x && q.x <= zl.x + zl.l && q.y >= zl.y && q.y <= zl.y + zl.h
  if (dans(dessus)) return { pastille: dessus, filet: [haut, dessus], dessous: false }
  const dessous = { x: bas.x - n.x * e, y: bas.y - n.y * e }
  const enVue = cadre.x <= zl.x + zl.l && cadre.x + cadre.l >= zl.x && cadre.y <= zl.y + zl.h && cadre.y + cadre.h >= zl.y
  if (dans(dessous) || !enVue) return { pastille: dessous, filet: [bas, dessous], dessous: true }
  const r = (POIGNEE.pastille[o.pointeur] + 4) / z
  const borne = (v: number, a: number, b: number) => Math.max(a, Math.min(b, v))
  const p = { x: borne(dessous.x, zl.x + r, zl.x + zl.l - r), y: borne(dessous.y, zl.y + r, zl.y + zl.h - r) }
  return { pastille: p, filet: [bas, p], dessous: true }
}

/** La boîte droite de ces points */
function boiteDes(pts: readonly P[]): Boite {
  let x1 = Infinity, y1 = Infinity, x2 = -Infinity, y2 = -Infinity
  for (const q of pts) { x1 = Math.min(x1, q.x); x2 = Math.max(x2, q.x); y1 = Math.min(y1, q.y); y2 = Math.max(y2, q.y) }
  return x1 === Infinity ? { x: 0, y: 0, l: 0, h: 0 } : { x: x1, y: y1, l: x2 - x1, h: y2 - y1 }
}

/**
 * La poignée sous ce point de l'écran (s, en px d'écran ; cam : écran =
 * monde × z + (x, y)), à POIGNEE.prise du pointeur (la pastille, à son rayon
 * si elle est plus grande) : la plus proche, la pastille d'abord à égalité,
 * puis un coin, puis un côté. Les côtés : i = 0 en haut, 1 à droite, 2 en
 * bas, 3 à gauche (le milieu du bord qui part du coin i). null : aucune.
 */
export function poigneeSous(cadre: Cadre, s: P, cam: { x: number; y: number; z: number }, pointeur: TypePointeur):
  Poignee | null {
  const ecran = (p: P) => ({ x: p.x * cam.z + cam.x, y: p.y * cam.z + cam.y })
  const r = POIGNEE.prise[pointeur]
  let meilleur: { quoi: 'coin' | 'cote' | 'pastille'; i: number } | null = null, dmin = Infinity
  const essayer = (p: P, quoi: 'coin' | 'cote' | 'pastille', i: number, rayon: number) => {
    const d = dist(ecran(p), s)
    if (d <= rayon && d < dmin) { dmin = d; meilleur = { quoi, i } }
  }
  essayer(cadre.pastille, 'pastille', 0, Math.max(r, POIGNEE.pastille[pointeur]))
  cadre.coins.forEach((c, i) => essayer(c, 'coin', i, r))
  if (cadre.cotes && cadre.coins.length === 4) {
    for (let i = 0; i < 4; i++) essayer(milieu(cadre.coins[i], cadre.coins[(i + 1) % 4]), 'cote', i, r)
  }
  return meilleur
}

/**
 * La poignée que prend un appui (s, en px d'écran) du pointeur qui appuie
 * (retouches après le lot 5) : celle sous lui, à sa portée (voir
 * poigneeSous) ; mais la pastille qu'on VOIT a pu être peinte pour un autre
 * pointeur (peint : le cadre tel qu'il est à l'écran, et le pointeur dont il
 * a pris la taille). Le doigt qui se pose après la souris la voit à 24 px du
 * cadre, là où la sienne serait à 36 : un appui un peu sous son centre
 * tombait sur le côté du haut et déformait l'image ; le crayon de l'iPad
 * après le doigt, sans survol, la voit à 36 px, la sienne à 28. Un appui sur
 * la pastille dessinée la prend donc, à la portée du plus large des deux
 * pointeurs, plutôt que le coin ou le côté du cadre recalculé pour lui. Elle
 * tourne autour du même centre (il ne dépend pas du pointeur) ; un cadre peint
 * autour d'un autre centre est celui d'autre chose (la sélection a changé
 * depuis la dernière image d'écran) : on n'en tient pas compte. Seulement la
 * pastille : les coins et les côtés sont au même endroit pour les deux.
 */
export function poigneeDeLAppui(cadre: Cadre, s: P, cam: { x: number; y: number; z: number }, pointeur: TypePointeur,
  peint?: { cadre: Cadre; pointeur: TypePointeur } | null): Poignee | null {
  const p = poigneeSous(cadre, s, cam, pointeur)
  if (p?.quoi === 'pastille' || !peint || peint.pointeur === pointeur) return p
  if (dist(peint.cadre.centre, cadre.centre) * cam.z > 0.5) return p
  const portee = (t: TypePointeur) => Math.max(POIGNEE.prise[t], POIGNEE.pastille[t])
  const large = portee(peint.pointeur) >= portee(pointeur) ? peint.pointeur : pointeur
  const q = poigneeSous(peint.cadre, s, cam, large)
  return q?.quoi === 'pastille' ? q : p
}

/** Un quart de tour autour du centre (« Tourner d'un quart de tour », la
 *  section Position du menu ⋯ : le chemin de la tablette graphique, dont le
 *  bouton ouvre ce menu) : à gauche, dans le sens direct (↺, contraire des
 *  aiguilles d'une montre à l'écran) ; à droite, dans l'autre (↻). Exact :
 *  ses coefficients sont 0 et ±1 (voir net). */
export function quartDeTour(centre: P, sens: 'gauche' | 'droite'): Matrice {
  return rotation(centre, (sens === 'droite' ? 1 : -1) * Math.PI / 2)
}

// ---------- Les gestes du cadre (K6) ----------
/** Une poignée du cadre (voir poigneeSous) */
export type Poignee = { quoi: 'coin' | 'cote' | 'pastille'; i: number }

/**
 * Ce que fait le pointeur arrivé en m (monde) sur le coin ou le côté p du
 * cadre (D7 du lot 5) : la matrice, et les facteurs dans les axes du cadre
 * (kx le long de son bord du haut, ky le long de son bord de gauche).
 * - un coin : l'ancre est le coin opposé ; le facteur est la projection du
 *   pointeur sur la diagonale ancre → coin (les proportions gardées) ; avec
 *   o.libre (Maj + coin sur une image seule), kx et ky se lisent chacun le
 *   long de son axe, et l'image se déforme dans ses axes ;
 * - un côté (une image) : l'ancre est le milieu du côté opposé, et seul
 *   l'axe de ce côté change (en haut et en bas : ky ; à droite et à
 *   gauche : kx).
 * Chaque facteur est aimanté (× 1 à ±3 %, sinon au centième, voir
 * aimanterEchelle) puis borné par o.bornes (voir bornesEchelle) : jamais de
 * retournement (le pointeur passé de l'autre côté de l'ancre laisse le
 * plus petit facteur permis, toujours positif), jamais une forme hors des
 * bornes de la liste blanche.
 */
export function matriceTaille(cadre: Cadre, p: { quoi: 'coin' | 'cote'; i: number }, m: P,
  o: { bornes: { min: number; max: number }; libre?: boolean }): { M: Matrice; kx: number; ky: number } {
  const c = cadre.coins
  const lim = (k: number) => Math.min(o.bornes.max, Math.max(o.bornes.min, aimanterEchelle(k)))
  const lu = dist(c[0], c[1])
  const u = lu > 0 ? { x: (c[1].x - c[0].x) / lu, y: (c[1].y - c[0].y) / lu } : { x: 1, y: 0 }
  const w = { x: -u.y, y: u.x }, angle = Math.atan2(u.y, u.x)
  const dot = (a: P, b: P) => a.x * b.x + a.y * b.y
  const moins = (a: P, b: P) => ({ x: a.x - b.x, y: a.y - b.y })
  const proj = (q: P, d: P) => { const n = dot(d, d); return n > 0 ? dot(q, d) / n : 1 }
  if (p.quoi === 'coin') {
    const ancre = c[(p.i + 2) % 4], d = moins(c[p.i], ancre), q = moins(m, ancre)
    if (o.libre) {
      const du = dot(d, u), dw = dot(d, w)
      const kx = lim(du ? dot(q, u) / du : 1), ky = lim(dw ? dot(q, w) / dw : 1)
      return { M: echelle(ancre, kx, ky, angle), kx, ky }
    }
    const k = lim(proj(q, d))
    return { M: echelle(ancre, k, k), kx: k, ky: k }
  }
  const h = milieu(c[p.i], c[(p.i + 1) % 4]), ancre = milieu(c[(p.i + 2) % 4], c[(p.i + 3) % 4])
  const k = lim(proj(moins(m, ancre), moins(h, ancre)))
  const kx = p.i % 2 ? k : 1, ky = p.i % 2 ? 1 : k
  return { M: echelle(ancre, kx, ky, angle), kx, ky }
}

/** La mesure d'un changement de taille : « 150 % », ou « 150 % × 80 % »
 *  quand l'image se déforme (deux : les deux facteurs sont libres, ou un
 *  côté) */
export function texteTaille(kx: number, ky: number, deux: boolean): string {
  return deux ? `${Math.round(kx * 100)} % × ${Math.round(ky * 100)} %` : `${Math.round(kx * 100)} %`
}

/** La mesure d'une rotation : l'angle TOURNÉ depuis l'appui (D8 du lot 5 ;
 *  pas l'orientation, comme aux instruments), « ↺ 30° » dans le sens direct
 *  (contraire des aiguilles d'une montre à l'écran : un angle négatif dans
 *  le sens de ctx.rotate), « ↻ 30° » dans l'autre, « 0° » sans rotation */
export function texteRotation(a: number): string {
  const d = Math.round(Math.abs(a) / DEG)
  return d === 0 ? '0°' : `${a < 0 ? '↺' : '↻'} ${d}°`
}

/** L'angle (radians) dont on a tourné, déroulé : l'angle d'avant plus le
 *  petit pas d'une position du pointeur à la suivante (plus d'un tour
 *  possible), sans saut au passage de ±π */
export function deroule(total: number, avant: number, apres: number): number {
  let d = apres - avant
  while (d > Math.PI) d -= 2 * Math.PI
  while (d < -Math.PI) d += 2 * Math.PI
  return total + d
}

/** Le curseur d'une poignée au survol, selon le cadre : la pastille, une
 *  main (« grab ») ; un coin, la double flèche de sa diagonale (« nwse » ou
 *  « nesw », selon qu'elle descend ou monte à l'écran) ; un côté, celle de
 *  son axe (« ew » ou « ns ») ; les deux suivent l'orientation du cadre */
export function curseurPoignee(cadre: Cadre, p: Poignee): string {
  if (p.quoi === 'pastille') return 'grab'
  const c = cadre.coins
  const q = p.quoi === 'coin' ? c[p.i] : milieu(c[p.i], c[(p.i + 1) % 4])
  const a = ((Math.atan2(q.y - cadre.centre.y, q.x - cadre.centre.x) / DEG) % 180 + 180) % 180
  if (p.quoi === 'coin') return a < 90 ? 'nwse-resize' : 'nesw-resize'
  return a >= 45 && a < 135 ? 'ns-resize' : 'ew-resize'
}

/** Le cadre pendant le geste : ses coins et son centre par M ; la pastille
 *  reste à son écart du bord, dans la direction que M donne au filet (elle
 *  tourne avec le cadre, mais ne s'éloigne pas quand il grandit) */
export function cadreTransforme(cadre: Cadre, M: Matrice): Cadre {
  const base = appliquer(M, cadre.filet[0])
  const d = { x: cadre.pastille.x - cadre.filet[0].x, y: cadre.pastille.y - cadre.filet[0].y }
  const e = Math.hypot(d.x, d.y)
  const t = { x: M[0] * d.x + M[2] * d.y, y: M[1] * d.x + M[3] * d.y }, lt = Math.hypot(t.x, t.y)
  const p = lt > 0 ? { x: base.x + t.x / lt * e, y: base.y + t.y / lt * e } : appliquer(M, cadre.pastille)
  return { ...cadre, coins: cadre.coins.map(q => appliquer(M, q)), centre: appliquer(M, cadre.centre), pastille: p, filet: [base, p] }
}

/** Ce que le cadre occupe (monde, au zoom z), ses poignées et sa pastille
 *  comprises : la barre d'actions et le menu complet se posent autour (voir
 *  App.emprise), jamais dessus */
export function etendueDuCadre(cadre: Cadre, pointeur: TypePointeur, z: number): Boite {
  const k = z > 0 ? z : 1, d = POIGNEE.dessin[pointeur] / 2 / k, r = POIGNEE.pastille[pointeur] / k
  let x1 = cadre.pastille.x - r, y1 = cadre.pastille.y - r, x2 = cadre.pastille.x + r, y2 = cadre.pastille.y + r
  for (const q of cadre.coins) { x1 = Math.min(x1, q.x - d); y1 = Math.min(y1, q.y - d); x2 = Math.max(x2, q.x + d); y2 = Math.max(y2, q.y + d) }
  return { x: x1, y: y1, l: x2 - x1, h: y2 - y1 }
}

/** Le disque de la pastille (monde, au zoom z ; marge : px d'écran autour) :
 *  ce que la barre d'actions et le menu complet ne couvrent jamais */
export function zonePastille(cadre: Cadre, pointeur: TypePointeur, z: number, marge = 0): Boite {
  const r = (POIGNEE.pastille[pointeur] + marge) / (z > 0 ? z : 1)
  return { x: cadre.pastille.x - r, y: cadre.pastille.y - r, l: 2 * r, h: 2 * r }
}

/** Les poignées du cadre (monde, au zoom z), là où un appui les prend : un
 *  carré de la portée du pointeur (POIGNEE.prise) autour de chaque coin et
 *  du milieu de chaque côté, et le disque de la pastille à la sienne (voir
 *  poigneeSous). Ce que le message ne couvre jamais (retouches après le lot
 *  5, voir UI.placerToast) : posé sous la barre du haut, à côté de la
 *  pastille, il couvrait le coin en haut à droite d'un énoncé importé, et
 *  son bouton « Fixer en fond » prenait le clic qui devait l'agrandir. */
export function zonesDesPoignees(cadre: Cadre, pointeur: TypePointeur, z: number): Boite[] {
  const k = z > 0 ? z : 1, r = POIGNEE.prise[pointeur] / k
  const autour = (q: P): Boite => ({ x: q.x - r, y: q.y - r, l: 2 * r, h: 2 * r })
  const zones = [zonePastille(cadre, pointeur, z, Math.max(0, POIGNEE.prise[pointeur] - POIGNEE.pastille[pointeur]))]
  for (const q of cadre.coins) zones.push(autour(q))
  if (cadre.cotes && cadre.coins.length === 4) {
    for (let i = 0; i < 4; i++) zones.push(autour(milieu(cadre.coins[i], cadre.coins[(i + 1) % 4])))
  }
  return zones
}

const milieu = (a: P, b: P): P => ({ x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 })
const dist = (a: P, b: P) => Math.hypot(a.x - b.x, a.y - b.y)
const grandir = (b: Boite, m: number): Boite => ({ x: b.x - m, y: b.y - m, l: b.l + 2 * m, h: b.h + 2 * m })
