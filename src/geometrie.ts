import type { Forme, Formule } from './types'

export function distanceAuSegment(px: number, py: number, ax: number, ay: number, bx: number, by: number) {
  const vx = bx - ax, vy = by - ay
  const l2 = vx * vx + vy * vy
  let t = l2 ? ((px - ax) * vx + (py - ay) * vy) / l2 : 0
  t = Math.max(0, Math.min(1, t))
  return Math.hypot(px - (ax + t * vx), py - (ay + t * vy))
}

export type Boite = { x: number; y: number; l: number; h: number }

/** La forme passe-t-elle à moins de r du point (x, y) ? `boite` : sa boîte ;
 *  pour une formule, sa boîte LOCALE (voir coinsFormule) : on l'écarte
 *  d'abord par son englobante, puis on ramène le point dans son repère. */
export function touche(f: Forme, x: number, y: number, r: number, boite: (f: Forme) => Boite): boolean {
  const b0 = boite(f), b = englobante(f, b0)
  const infinie = f.type === 'polygone' && !!f.prolonge       // une droite dépasse son cadre
  if (!infinie && (x < b.x - r || x > b.x + b.l + r || y < b.y - r || y > b.y + b.h + r)) return false
  if (f.type === 'formule') {
    if (!rotationDe(f)) return true
    const p = versFormule(f, x, y)
    return p.x >= b0.x - r && p.x <= b0.x + b0.l + r && p.y >= b0.y - r && p.y <= b0.y + b0.h + r
  }
  if (f.type === 'segment') return distanceAuSegment(x, y, f.x, f.y, f.x + f.dx, f.y + f.dy) <= r + f.taille / 2
  if (f.type === 'cercle') {
    const d = Math.hypot(x - f.x, y - f.y)
    if (f.arc && !dansLArc(Math.atan2(y - f.y, x - f.x), f.arc)) return false
    return Math.abs(d - f.r) <= r + f.taille / 2 || (!f.arc && !!f.fond && d <= f.r)
  }
  if (f.type === 'polygone') {
    const q = f.pts, n = q.length / 2, lx = x - f.x, ly = y - f.y
    if (n === 1) return Math.hypot(lx - q[0], ly - q[1]) <= r + 6         // un point seul
    if (f.prolonge && n === 2) {
      // Distance à la droite (ou à la demi-droite)
      const ax = q[0], ay = q[1], vx = q[2] - ax, vy = q[3] - ay, l = Math.hypot(vx, vy) || 1
      const t = ((lx - ax) * vx + (ly - ay) * vy) / l
      if (f.prolonge === 'demi' && t < 0) return Math.hypot(lx - ax, ly - ay) <= r + f.taille / 2
      return Math.abs((lx - ax) * vy - (ly - ay) * vx) / l <= r + f.taille / 2
    }
    const fin = f.ferme ? n : n - 1
    for (let i = 0; i < fin; i++) {
      const j = (i + 1) % n
      if (distanceAuSegment(lx, ly, q[2 * i], q[2 * i + 1], q[2 * j], q[2 * j + 1]) <= r + f.taille / 2) return true
    }
    return !!f.fond && f.ferme && dedans(lx, ly, q)
  }
  if (f.type === 'image') return dansImage(f, x, y, r)
  const lx = x - f.x, ly = y - f.y, seuil = r + f.taille / 2
  const p = f.pts
  if (p.length === 3) return Math.hypot(lx - p[0], ly - p[1]) <= seuil
  for (let i = 0; i + 5 < p.length; i += 3) {
    if (distanceAuSegment(lx, ly, p[i], p[i + 1], p[i + 3], p[i + 4]) <= seuil) return true
  }
  return false
}

export function chevauche(a: Boite, b: Boite) {
  return a.x < b.x + b.l && a.x + a.l > b.x && a.y < b.y + b.h && a.y + a.h > b.y
}

/** Rectangle normalisé à partir de deux coins */
export function rectangle(x1: number, y1: number, x2: number, y2: number): Boite {
  return { x: Math.min(x1, x2), y: Math.min(y1, y2), l: Math.abs(x2 - x1), h: Math.abs(y2 - y1) }
}

/** Le point est-il dans le polygone ? (règle pair-impair) */
export function dedans(x: number, y: number, q: number[]) {
  let oui = false
  for (let i = 0, j = q.length / 2 - 1; i < q.length / 2; j = i++) {
    const xi = q[2 * i], yi = q[2 * i + 1], xj = q[2 * j], yj = q[2 * j + 1]
    if ((yi > y) !== (yj > y) && x < (xj - xi) * (y - yi) / (yj - yi) + xi) oui = !oui
  }
  return oui
}

/** L'angle a tombe-t-il dans l'arc parcouru de a0 à a1 ? */
export function dansLArc(a: number, arc: { a0: number; a1: number }) {
  const lo = Math.min(arc.a0, arc.a1), hi = Math.max(arc.a0, arc.a1)
  const t = ((a - lo) % (2 * Math.PI) + 2 * Math.PI) % (2 * Math.PI)
  return t <= hi - lo
}

/** Les quatre coins d'une image, dans l'ordre (haut-gauche, haut-droit, bas-droit, bas-gauche de l'image) */
export function coinsImage(f: { x: number; y: number; l: number; h: number; m: [number, number, number, number] }) {
  const [a, b, c, d] = f.m
  const p = (u: number, v: number) => ({ x: f.x + a * u + c * v, y: f.y + b * u + d * v })
  return [p(0, 0), p(f.l, 0), p(f.l, f.h), p(0, f.h)]
}

/** Le point (x, y) est-il sur l'image, à `marge` près (unités monde) ? On le
 *  ramène dans le repère de l'image, qui peut être tournée ou retournée. */
export function dansImage(f: { x: number; y: number; l: number; h: number; m: [number, number, number, number] },
  x: number, y: number, marge = 0): boolean {
  const [a, b, c, d] = f.m, det = a * d - b * c
  if (Math.abs(det) < 1e-12) return false
  const dx = x - f.x, dy = y - f.y
  const u = (d * dx - c * dy) / det, v = (-b * dx + a * dy) / det
  const k = marge / Math.sqrt(Math.abs(det))
  return u >= -k && u <= f.l + k && v >= -k && v <= f.h + k
}

// ---------- Une formule tournée (lot 5) ----------
// Une formule garde sa rotation dans un champ (radians, sens de ctx.rotate :
// horaire à l'écran, autour de son coin (x, y) ; voir types.ts). Toutes les
// fonctions de ce fichier reçoivent, pour une formule, sa boîte LOCALE : le
// coin (x, y), la largeur et la hauteur mesurées à l'écran, NON tournée (ce
// que rend Rendu.boiteFormule) ; elles en déduisent elles-mêmes le reste
// (les coins tournés, l'englobante) et ramènent le point dans le repère de la
// formule (la rotation inverse autour de son coin). Un seul chemin : la
// prise, le lasso, la gomme, le placement d'un point disent la même chose.
// Sans rotation, rien n'est calculé de plus : les résultats d'avant.

/** La rotation d'une formule (0 sans rotation, ou si elle n'est pas un
 *  nombre fini : un fichier abîmé, ou d'une version plus récente, se lit
 *  sans planter, la formule droite) */
export function rotationDe(f: { rotation?: unknown }): number {
  const r = f.rotation
  return typeof r === 'number' && Number.isFinite(r) ? r : 0
}

/** Le point (x, y) tourné de `a` (sens de ctx.rotate) autour de (cx, cy) */
function tourner(cx: number, cy: number, a: number, x: number, y: number): { x: number; y: number } {
  const c = Math.cos(a), s = Math.sin(a), dx = x - cx, dy = y - cy
  return { x: cx + dx * c - dy * s, y: cy + dx * s + dy * c }
}

/** Le point du monde (x, y), dans le repère de la formule (non tournée) */
function versFormule(f: Formule, x: number, y: number): { x: number; y: number } {
  const a = rotationDe(f)
  return a ? tourner(f.x, f.y, -a, x, y) : { x, y }
}

/** Les quatre coins d'une formule dans le monde (haut-gauche, haut-droit,
 *  bas-droit, bas-gauche de la formule), sa boîte LOCALE b tournée de sa
 *  rotation autour de son coin (x, y) */
export function coinsFormule(f: { x: number; y: number; rotation?: number }, b: Boite): { x: number; y: number }[] {
  const c = [{ x: b.x, y: b.y }, { x: b.x + b.l, y: b.y }, { x: b.x + b.l, y: b.y + b.h }, { x: b.x, y: b.y + b.h }]
  const a = rotationDe(f)
  return a ? c.map(p => tourner(f.x, f.y, a, p.x, p.y)) : c
}

/** La boîte droite qui contient ce qu'on voit de la forme : pour une
 *  formule tournée, celle de ses quatre coins tournés ; sinon b telle
 *  quelle (toute autre forme a déjà sa boîte droite) */
export function englobante(f: Forme, b: Boite): Boite {
  if (f.type !== 'formule' || !rotationDe(f)) return b
  const c = coinsFormule(f, b), xs = c.map(p => p.x), ys = c.map(p => p.y)
  const x1 = Math.min(...xs), y1 = Math.min(...ys)
  return { x: x1, y: y1, l: Math.max(...xs) - x1, h: Math.max(...ys) - y1 }
}

/** Ce qu'on voit d'une forme, en quatre coins (dans l'ordre du tour) : une
 *  image, son rectangle (tourné, retourné ou non, voir coinsImage) ; une
 *  formule tournée, le sien (b : sa boîte LOCALE) ; tout autre objet, sa
 *  boîte droite b. Le cadre gris et le cadenas d'un objet verrouillé (lot 5,
 *  voir Rendu.peindreDirect) s'y posent : autour d'une image tournée, la
 *  boîte droite laisserait le cadenas dans le vide, loin de l'image. */
export function coinsVus(f: Forme, b: Boite): { x: number; y: number }[] {
  if (f.type === 'image') return coinsImage(f)
  if (f.type === 'formule' && rotationDe(f)) return coinsFormule(f, b)
  return [{ x: b.x, y: b.y }, { x: b.x + b.l, y: b.y }, { x: b.x + b.l, y: b.y + b.h }, { x: b.x, y: b.y + b.h }]
}

/** Les quatre coins d'un parallélogramme (un rectangle, tourné ou non),
 *  écartés de m vers l'extérieur le long de ses deux côtés : un rectangle
 *  droit grandit de m de chaque côté, comme les cadres de la sélection. Un
 *  côté nul (une image écrasée) ne pousse pas. */
export function ecarterCoins(c: readonly { x: number; y: number }[], m: number): { x: number; y: number }[] {
  if (!m) return c.map(p => ({ ...p }))
  const unite = (dx: number, dy: number) => { const d = Math.hypot(dx, dy); return d > 1e-12 ? { x: dx / d, y: dy / d } : { x: 0, y: 0 } }
  return c.map((p, i) => {
    const a = c[(i + c.length - 1) % c.length], s = c[(i + 1) % c.length]
    const u = unite(p.x - a.x, p.y - a.y), v = unite(p.x - s.x, p.y - s.y)
    return { x: p.x + m * (u.x + v.x), y: p.y + m * (u.y + v.y) }
  })
}

/** Le coin le plus en haut à droite à l'écran (y vers le bas) : le plus
 *  grand x − y ; à égalité (un carré tourné de 45°), le plus haut. Pour une
 *  boîte droite, c'est son coin haut droit. */
export function coinHautDroit(c: readonly { x: number; y: number }[]): { x: number; y: number } {
  let m = c[0]
  for (const p of c) {
    const d = (p.x - p.y) - (m.x - m.y)
    if (d > 1e-9 || (Math.abs(d) <= 1e-9 && p.y < m.y)) m = p
  }
  return m
}

// ---------- Ce que vise la sélection ----------
// touche() dit seulement si une forme passe près d'un point (la gomme s'en
// sert). Pour prendre un objet, il faut savoir de combien on l'a manqué, et
// distinguer son tracé de son intérieur : un trait écrit dans un grand cadre
// doit se prendre avant le cadre, le bord le plus proche l'emportant. Les
// trois fonctions qui suivent le disent ; cibleParmi choisit (app.ts
// cibleSous lui donne la page dans l'ordre d'affichage).

/** La distance (unités monde) du point (x, y) à ce qu'on voit du TRACÉ de la
 *  forme, épaisseur déduite (0 sur le trait lui-même). Un intérieur ne compte
 *  pas : une formule touchée dans sa boîte, une image, l'intérieur d'une
 *  figure coloriée sont des « pleins » (voir interieur) ; leur distance est
 *  Infinity, ou celle des côtés pour une figure. `boite` : la boîte de la
 *  forme (une formule se mesure à l'écran). */
export function distanceAuTrace(f: Forme, x: number, y: number, boite: Boite | null): number {
  const sans = (d: number, e: number) => Math.max(0, d - e)
  switch (f.type) {
    case 'formule': {
      if (!boite) return Infinity
      // Dans le repère de la formule (une rotation garde les distances)
      const p = versFormule(f, x, y)
      const dx = Math.max(boite.x - p.x, 0, p.x - (boite.x + boite.l)), dy = Math.max(boite.y - p.y, 0, p.y - (boite.y + boite.h))
      return dx === 0 && dy === 0 ? Infinity : Math.hypot(dx, dy)
    }
    case 'image': return Infinity
    case 'segment': return sans(distanceAuSegment(x, y, f.x, f.y, f.x + f.dx, f.y + f.dy), f.taille / 2)
    case 'cercle': {
      const a = Math.atan2(y - f.y, x - f.x)
      // Hors de l'arc, c'est l'un de ses deux bouts qui est le plus près
      if (f.arc && !dansLArc(a, f.arc)) {
        const bout = (t: number) => Math.hypot(x - f.x - f.r * Math.cos(t), y - f.y - f.r * Math.sin(t))
        return sans(Math.min(bout(f.arc.a0), bout(f.arc.a1)), f.taille / 2)
      }
      return sans(Math.abs(Math.hypot(x - f.x, y - f.y) - f.r), f.taille / 2)
    }
    case 'polygone': {
      const q = f.pts, n = q.length / 2, lx = x - f.x, ly = y - f.y
      if (n === 1) return sans(Math.hypot(lx - q[0], ly - q[1]), 6)          // un point seul, comme touche
      if (f.prolonge && n === 2) {
        // La droite (ou la demi-droite) : sur toute sa longueur
        const ax = q[0], ay = q[1], vx = q[2] - ax, vy = q[3] - ay, l = Math.hypot(vx, vy) || 1
        const t = ((lx - ax) * vx + (ly - ay) * vy) / l
        if (f.prolonge === 'demi' && t < 0) return sans(Math.hypot(lx - ax, ly - ay), f.taille / 2)
        return sans(Math.abs((lx - ax) * vy - (ly - ay) * vx) / l, f.taille / 2)
      }
      let d = Infinity
      const fin = f.ferme ? n : n - 1
      for (let i = 0; i < fin; i++) {
        const j = (i + 1) % n
        d = Math.min(d, distanceAuSegment(lx, ly, q[2 * i], q[2 * i + 1], q[2 * j], q[2 * j + 1]))
      }
      return sans(d, f.taille / 2)
    }
    case 'trait': {
      const p = f.pts, lx = x - f.x, ly = y - f.y
      if (p.length < 3) return Infinity
      let d = p.length === 3 ? Math.hypot(lx - p[0], ly - p[1]) : Infinity
      for (let i = 0; i + 5 < p.length; i += 3) d = Math.min(d, distanceAuSegment(lx, ly, p[i], p[i + 1], p[i + 3], p[i + 4]))
      return sans(d, f.taille / 2)
    }
  }
}

/** Le point (x, y) est-il DANS la forme ? 'plein' : une formule (sa boîte),
 *  une image, une figure fermée coloriée ; on la prend là, et elle cache ce
 *  qui est sous elle. 'nu' : une figure fermée sans fond (un polygone fermé
 *  d'au moins trois sommets, un cercle entier) ; l'outil Sélection la prend
 *  aussi par là, après les tracés proches. null : rien qui ait un dedans (un
 *  trait, même refermé, une ligne ouverte, une droite, un arc). */
export function interieur(f: Forme, x: number, y: number, boite: Boite | null): 'plein' | 'nu' | null {
  switch (f.type) {
    case 'formule': {
      if (!boite) return null
      const p = versFormule(f, x, y)
      return p.x >= boite.x && p.x <= boite.x + boite.l && p.y >= boite.y && p.y <= boite.y + boite.h ? 'plein' : null
    }
    case 'image': return dansImage(f, x, y) ? 'plein' : null
    case 'polygone':
      if (!f.ferme || f.prolonge || f.pts.length < 6 || !dedans(x - f.x, y - f.y, f.pts)) return null
      return f.fond ? 'plein' : 'nu'
    case 'cercle':
      if (f.arc || Math.hypot(x - f.x, y - f.y) > f.r) return null
      return f.fond ? 'plein' : 'nu'
  }
  return null
}

/** L'aire de la forme (unités monde au carré) : entre deux intérieurs qui se
 *  recouvrent, le plus petit l'emporte (un triangle dessiné dans un grand
 *  rectangle se prend par son milieu). Sans dedans : l'aire de sa boîte (pour
 *  une formule, sa boîte locale : tournée, elle ne grandit pas). */
export function aireDe(f: Forme, boite: Boite | null): number {
  if (f.type === 'polygone') {
    const q = f.pts, n = q.length / 2
    let s = 0
    for (let i = 0, j = n - 1; i < n; j = i++) s += q[2 * j] * q[2 * i + 1] - q[2 * i] * q[2 * j + 1]
    return Math.abs(s) / 2
  }
  if (f.type === 'cercle') return Math.PI * f.r * f.r
  if (f.type === 'image') return Math.abs(f.m[0] * f.m[3] - f.m[1] * f.m[2]) * f.l * f.h
  return boite ? boite.l * boite.h : 0
}

/** Ce que prend un appui, et par où :
 *  - 'trace' : près de son tracé, à la portée du pointeur (ecart : à combien,
 *    en pixels d'écran) ;
 *  - 'morceau' : un morceau qui sort d'une figure (le centre d'un cercle, le
 *    nom d'un sommet) ; c'est la figure entière qu'on prend, le morceau au
 *    clic suivant ;
 *  - 'plein' : dans une formule, une image, une figure coloriée ;
 *  - 'dedans' : dans une figure fermée sans fond. */
export type Cible = { f: Forme; par: 'trace' | 'morceau' | 'plein' | 'dedans'; ecart: number }

/**
 * Ce que prend un appui en (x, y), monde, parmi ces formes, données dans
 * l'ORDRE D'AFFICHAGE (voir ordre.ts : la plus haute vue en dernier) : on
 * prend ce qu'on voit. Une image importée après un trait est peinte sous lui
 * et ne le cache donc pas : c'est le trait qu'on prend sur son tracé.
 * Le bord le plus proche l'emporte : un trait ou une petite figure écrits
 * dans un grand cadre se prennent avant le cadre. Un plein (une image, une
 * figure coloriée) cache ce qui est peint sous lui à cet endroit ; pas une
 * formule, au fond transparent : ce qu'on a écrit sur elle (un soulignement,
 * une flèche, un entourage) se voit à travers elle et s'y prend, et elle
 * reste un plein pour elle-même (cliquée en son milieu, la règle du plus
 * petit intérieur la donne). L'ordre, en détail : les tracés à `net` pixels
 * ou moins (le plus proche, puis le plus haut), les morceaux, l'intérieur
 * s'il est plein (entre lui et les intérieurs nus, le plus petit), les
 * tracés plus loin, enfin l'intérieur nu (seulement si o.dedans : l'outil
 * Sélection, le doigt qui déplace ; jamais sous un outil de dessin, où écrire
 * dans un triangle ne doit pas le prendre). Une seule boucle sur les formes,
 * chacune écartée d'abord par sa boîte : le survol reste léger sur une page
 * de milliers de traits.
 * o.zoom : les pixels d'écran par unité monde ; o.tolerance : la portée du
 * pointeur (pixels d'écran) ; o.net : en deçà, un tracé passe avant tout ;
 * o.boite : la boîte d'une forme (une formule se mesure à l'écran : sa
 * boîte locale, non tournée ; voir coinsFormule) ;
 * o.morceau : la figure dont un morceau est sous le pointeur, cherchée
 * seulement s'il le faut ; o.deborde : l'intérieur de cette figure
 * couvre-t-il toute la vue ? (vu de près, il ne prend rien).
 */
export function cibleParmi(formes: readonly Forme[], x: number, y: number, o: {
  zoom: number; tolerance: number; net: number; dedans: boolean
  boite: (f: Forme) => Boite | null
  morceau?: () => Forme | null
  deborde?: (f: Forme) => boolean
}): Cible | null {
  const z = o.zoom, tol = o.tolerance, r = tol / z
  type Candidat = { f: Forme; i: number; ecart: number }
  const traces: Candidat[] = [], pleins: Candidat[] = [], nus: Candidat[] = []
  // Le plus haut plein qui cache ce qui est sous lui (pas une formule)
  let haut = -1
  for (let i = 0; i < formes.length; i++) {
    const f = formes[i]
    const infinie = f.type === 'polygone' && !!f.prolonge          // une droite dépasse sa boîte
    const b = o.boite(f)
    if (!infinie) {
      if (!b) continue
      // Un point seul se prend à 6 unités de plus (voir distanceAuTrace) ;
      // une formule tournée s'écarte par son englobante
      const k = r + (f.type === 'polygone' && f.pts.length === 2 ? 6 : 0), e = englobante(f, b)
      if (x < e.x - k || x > e.x + e.l + k || y < e.y - k || y > e.y + e.h + k) continue
    }
    const d = distanceAuTrace(f, x, y, b) * z
    if (d <= tol) traces.push({ f, i, ecart: d })
    const dans = interieur(f, x, y, b)
    if (dans === 'plein') { pleins.push({ f, i, ecart: 0 }); if (f.type !== 'formule') haut = i }
    else if (dans === 'nu' && o.dedans) nus.push({ f, i, ecart: 0 })
  }
  // Vu de près, l'intérieur d'une figure qui déborde tout l'écran (un grand
  // cercle à 800 %) ne prend rien : on regarde ce qui est dedans, et un
  // toucher dans le vide doit pouvoir désélectionner (règle de tldraw)
  if (nus.length && o.deborde) for (let k = nus.length - 1; k >= 0; k--) if (o.deborde(nus[k].f)) nus.splice(k, 1)
  // Un plein cache ce qui est sous lui : un trait sous une figure coloriée
  // ne se prend pas à travers elle, une formule posée sur une image se prend
  // par la formule
  const visibles = (l: Candidat[]) => l.filter(c => c.i >= haut)
  const tous = visibles(traces), plein = pleins.length ? pleins[pleins.length - 1] : null, vides = visibles(nus)
  // Le plus proche, et à un demi-pixel près, le plus haut
  const plusProche = (l: Candidat[]) => {
    if (!l.length) return null
    const min = Math.min(...l.map(c => c.ecart))
    return l.filter(c => c.ecart <= min + 0.5).reduce((a, c) => (c.i > a.i ? c : a))
  }
  const net = plusProche(tous.filter(c => c.ecart <= o.net))
  if (net) return { f: net.f, par: 'trace', ecart: net.ecart }
  // Le sommet d'une figure cachée sous une image ne se prend pas à travers
  // elle : c'est l'image qu'on touche
  const morceau = o.morceau?.() ?? null
  if (morceau && formes.indexOf(morceau) >= haut) return { f: morceau, par: 'morceau', ecart: 0 }
  // L'intérieur : le plus petit l'emporte (un triangle sans fond dans un
  // grand rectangle colorié se prend par son milieu), puis le plus haut
  const dedans = [...(plein ? [plein] : []), ...vides].map(c => ({ ...c, aire: aireDe(c.f, o.boite(c.f)) }))
  const gagnant = dedans.length ? dedans.reduce((a, c) => (c.aire < a.aire || (c.aire === a.aire && c.i > a.i) ? c : a)) : null
  if (gagnant && gagnant === dedans[0] && plein) return { f: gagnant.f, par: 'plein', ecart: 0 }
  const loin = plusProche(tous)
  if (loin) return { f: loin.f, par: 'trace', ecart: loin.ecart }
  return gagnant ? { f: gagnant.f, par: 'dedans', ecart: 0 } : null
}

/** Un plein peint au-dessus de la forme n° i (dans l'ordre d'affichage)
 *  cache-t-il ce point ? Une formule ne cache rien : son fond est
 *  transparent (voir cibleParmi). Le clic droit s'en sert : le sommet d'une
 *  figure ne se vise pas à travers une image posée dessus. */
export function cacheAuDessus(formes: readonly Forme[], i: number, x: number, y: number, boite: (f: Forme) => Boite | null): boolean {
  for (let k = i + 1; k < formes.length; k++) {
    const g = formes[k]
    if (g.type !== 'formule' && interieur(g, x, y, boite(g)) === 'plein') return true
  }
  return false
}

// ---------- Ce que prend un cadre ou un lasso ----------
// Une boîte qui touche le cadre ne suffit pas : un long trait en diagonale
// serait pris par un cadre posé dans un coin vide de sa boîte. Un objet est
// pris s'il est à plus de moitié dans la zone, mesuré sur ce qu'on en voit :
// la longueur de son tracé, ou la surface d'une image ou d'une formule.

/** Au plus autant de morceaux testés par trait : un trait de mille points ne
 *  coûte pas plus qu'un trait de soixante, et un lasso autour d'une page
 *  chargée se lâche sans attendre */
const MORCEAUX_PAR_TRAIT = 64

/** La part (de 0 à 1) de la forme qui est dans la zone. dansZone(x, y) dit si
 *  un point du monde y est (le cadre, ou le lasso par la règle pair-impair de
 *  dedans). Un tracé se mesure à sa longueur, chaque morceau testé en son
 *  milieu : les segments d'un trait (regroupés au-delà de 64), chaque côté
 *  d'un polygone ou d'un ancien segment coupé en 8, 48 points sur un cercle
 *  ou un arc. Un point seul y est ou n'y est pas. Une droite est infinie : on
 *  la prend si ses deux points de définition sont dedans. Une formule (dans sa
 *  boîte locale, `boite`, mesurée à l'écran, tournée avec elle) et une image
 *  (dans son parallélogramme) se mesurent à leur surface, sur une grille de
 *  7 × 7. */
export function partDedans(f: Forme, dansZone: (x: number, y: number) => boolean, boite: Boite | null): number {
  // Des morceaux pesés : la somme des poids de ceux qui sont dedans, sur le total
  let dans = 0, total = 0
  const morceau = (x: number, y: number, poids: number) => { total += poids; if (dansZone(x, y)) dans += poids }
  /** Le côté (ax, ay)–(bx, by) coupé en k morceaux égaux */
  const cote = (ax: number, ay: number, bx: number, by: number, k: number) => {
    const l = Math.hypot(bx - ax, by - ay) / k
    for (let i = 0; i < k; i++) { const t = (i + 0.5) / k; morceau(ax + (bx - ax) * t, ay + (by - ay) * t, l) }
  }
  const part = () => (total > 0 ? dans / total : 0)
  const grille = (point: (u: number, v: number) => { x: number; y: number }) => {
    for (let i = 0; i < 7; i++) for (let j = 0; j < 7; j++) { const p = point((i + 0.5) / 7, (j + 0.5) / 7); morceau(p.x, p.y, 1) }
    return part()
  }
  switch (f.type) {
    case 'trait': {
      const p = f.pts, n = p.length / 3
      if (n < 1) return 0
      const seul = () => (dansZone(f.x + p[0], f.y + p[1]) ? 1 : 0)
      if (n === 1) return seul()
      // Les segments consécutifs se regroupent par paquets de g : chaque paquet
      // pèse sa longueur et se teste au milieu de son segment du milieu
      const segs = n - 1, g = Math.ceil(segs / MORCEAUX_PAR_TRAIT)
      for (let k = 0; k < segs; k += g) {
        const fin = Math.min(segs, k + g)
        let l = 0
        for (let i = k; i < fin; i++) l += Math.hypot(p[3 * i + 3] - p[3 * i], p[3 * i + 4] - p[3 * i + 1])
        const i = k + Math.floor((fin - k) / 2)
        morceau(f.x + (p[3 * i] + p[3 * i + 3]) / 2, f.y + (p[3 * i + 1] + p[3 * i + 4]) / 2, l)
      }
      // Un trait sans longueur (tous ses points au même endroit) : un point seul
      return total > 0 ? part() : seul()
    }
    case 'polygone': {
      const q = f.pts, n = q.length / 2
      if (n < 1) return 0
      if (n === 1) return dansZone(f.x + q[0], f.y + q[1]) ? 1 : 0
      if (f.prolonge && n === 2) return dansZone(f.x + q[0], f.y + q[1]) && dansZone(f.x + q[2], f.y + q[3]) ? 1 : 0
      const fin = f.ferme ? n : n - 1
      for (let i = 0; i < fin; i++) {
        const j = (i + 1) % n
        cote(f.x + q[2 * i], f.y + q[2 * i + 1], f.x + q[2 * j], f.y + q[2 * j + 1], 8)
      }
      return total > 0 ? part() : (dansZone(f.x + q[0], f.y + q[1]) ? 1 : 0)
    }
    case 'cercle': {
      const a0 = f.arc ? f.arc.a0 : 0, da = f.arc ? f.arc.a1 - f.arc.a0 : 2 * Math.PI
      for (let i = 0; i < 48; i++) { const a = a0 + da * (i + 0.5) / 48; morceau(f.x + f.r * Math.cos(a), f.y + f.r * Math.sin(a), 1) }
      return part()
    }
    case 'segment':
      cote(f.x, f.y, f.x + f.dx, f.y + f.dy, 8)
      return total > 0 ? part() : (dansZone(f.x, f.y) ? 1 : 0)
    case 'formule': {
      if (!boite) return 0
      // La grille couvre sa boîte locale, tournée avec elle
      const a = rotationDe(f)
      return grille((u, v) => {
        const x = boite.x + u * boite.l, y = boite.y + v * boite.h
        return a ? tourner(f.x, f.y, a, x, y) : { x, y }
      })
    }
    case 'image': {
      const [a, b, c, d] = f.m
      return grille((u, v) => ({ x: f.x + a * u * f.l + c * v * f.h, y: f.y + b * u * f.l + d * v * f.h }))
    }
  }
}

/** Le test « ce point est-il dans le lasso q ? », prêt pour des milliers de
 *  points. La règle est celle de l'enroulement non nul, et non la règle
 *  pair-impair de dedans : on « repasse » souvent sur son lasso pour être
 *  sûr (un tour et demi, deux tours), et ce qui est entouré deux fois doit
 *  rester dedans ; avec pair-impair, il en sortait (deux mots entourés d'un
 *  tour et demi : l'un n'était pas pris). Chaque côté croisé par la demi-
 *  droite vers la droite compte +1 s'il monte, -1 s'il descend ; le point est
 *  dedans si la somme n'est pas nulle. Un lasso d'un seul tour, même tremblé,
 *  concave ou en huit, dit la même chose que pair-impair. Chaque côté est
 *  rangé dans les bandes horizontales qu'il traverse, et un point ne regarde
 *  que les côtés de sa bande. Un lasso tremblé de plusieurs centaines de
 *  côtés autour d'une page de 2000 traits se lâche ainsi en quelques
 *  millisecondes, au lieu de cinquante. */
export function dansLasso(q: number[]): (x: number, y: number) => boolean {
  const n = q.length / 2
  if (n < 3) return () => false
  let x1 = Infinity, y1 = Infinity, x2 = -Infinity, y2 = -Infinity
  for (let i = 0; i < n; i++) {
    x1 = Math.min(x1, q[2 * i]); x2 = Math.max(x2, q[2 * i]); y1 = Math.min(y1, q[2 * i + 1]); y2 = Math.max(y2, q[2 * i + 1])
  }
  const nb = Math.max(1, Math.min(256, n)), h = (y2 - y1) / nb || 1
  const bande = (y: number) => Math.max(0, Math.min(nb - 1, Math.floor((y - y1) / h)))
  const bandes: number[][] = Array.from({ length: nb }, () => [])
  for (let i = 0, j = n - 1; i < n; j = i++) {
    const a = q[2 * i + 1], b = q[2 * j + 1]
    for (let k = bande(Math.min(a, b)), fin = bande(Math.max(a, b)); k <= fin; k++) bandes[k].push(i, j)
  }
  return (x, y) => {
    if (x < x1 || x > x2 || y < y1 || y > y2) return false
    const c = bandes[bande(y)]
    let tours = 0
    for (let k = 0; k < c.length; k += 2) {
      // Le côté va du sommet j au sommet i (j le précède)
      const i = c[k], j = c[k + 1]
      const xi = q[2 * i], yi = q[2 * i + 1], xj = q[2 * j], yj = q[2 * j + 1]
      if ((yi > y) !== (yj > y) && x < (xj - xi) * (y - yi) / (yj - yi) + xi) tours += yi > yj ? 1 : -1
    }
    return tours !== 0
  }
}

/** Le chemin à plat [x, y, x, y, …] simplifié (Douglas-Peucker) : un point qui
 *  s'écarte de moins de `tolerance` de la corde de ses voisins gardés s'en
 *  va ; les extrémités et les coins restent. Sans récursion : un lasso de
 *  milliers de points ne fait pas déborder la pile. */
export function simplifier(pts: number[], tolerance: number): number[] {
  const n = pts.length / 2
  if (n <= 2) return pts.slice()
  const garde = new Uint8Array(n)
  garde[0] = 1; garde[n - 1] = 1
  const pile: [number, number][] = [[0, n - 1]]
  while (pile.length) {
    const [a, b] = pile.pop()!
    let loin = -1, dmax = tolerance
    for (let i = a + 1; i < b; i++) {
      const d = distanceAuSegment(pts[2 * i], pts[2 * i + 1], pts[2 * a], pts[2 * a + 1], pts[2 * b], pts[2 * b + 1])
      if (d > dmax) { dmax = d; loin = i }
    }
    if (loin < 0) continue
    garde[loin] = 1
    pile.push([a, loin], [loin, b])
  }
  const r: number[] = []
  for (let i = 0; i < n; i++) if (garde[i]) r.push(pts[2 * i], pts[2 * i + 1])
  return r
}
