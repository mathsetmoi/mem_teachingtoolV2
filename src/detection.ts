// =============================================================
// REPÉRER LA FIGURE DANS UNE IMAGE
// Une photo d'énoncé, une capture de manuel : on y cherche les sommets
// des figures et les points marqués, sans IA, dans le navigateur.
//
//  1. Encre ou papier : niveaux de gris, puis un seuil choisi par la
//     méthode d'Otsu (celui qui sépare le mieux les deux).
//  2. Les taches d'encre qui se touchent forment des composantes.
//  3. Une grande composante est un tracé : on suit son contour, on le
//     simplifie (Ramer-Douglas-Peucker) ; ses coins sont les sommets.
//     Si elle entoure du papier, c'est une figure fermée (un polygone).
//  4. Une petite composante en forme de point ou de croix (× ou +) est
//     un point marqué. Les lettres, elles, ne ressemblent à rien de tel.
//
// Tout est en pixels de l'image d'origine.
// =============================================================

export type P = { x: number; y: number }
export interface Reperage {
  polygones: P[][]          // figures fermées, sommets dans l'ordre du contour
  points: P[]               // points isolés : marques, extrémités de traits
}

const TRAVAIL = 700          // on travaille sur une copie de 700 px au plus

export function reperer(img: HTMLImageElement | HTMLCanvasElement): Reperage {
  const L0 = 'naturalWidth' in img ? img.naturalWidth : img.width
  const H0 = 'naturalHeight' in img ? img.naturalHeight : img.height
  const k = Math.min(1, TRAVAIL / Math.max(L0, H0))
  const L = Math.max(1, Math.round(L0 * k)), H = Math.max(1, Math.round(H0 * k))
  const cv = Object.assign(document.createElement('canvas'), { width: L, height: H })
  const c = cv.getContext('2d', { willReadFrequently: true })!
  c.fillStyle = '#fff'; c.fillRect(0, 0, L, H)
  c.drawImage(img, 0, 0, L, H)
  const px = c.getImageData(0, 0, L, H).data

  // 1. Niveaux de gris et seuil d'Otsu
  const gris = new Uint8Array(L * H)
  const histo = new Array(256).fill(0)
  for (let i = 0; i < L * H; i++) {
    const v = Math.round(0.299 * px[4 * i] + 0.587 * px[4 * i + 1] + 0.114 * px[4 * i + 2])
    gris[i] = v; histo[v]++
  }
  const seuil = otsu(histo, L * H)
  let encre = new Uint8Array(L * H), n = 0
  for (let i = 0; i < L * H; i++) if (gris[i] < seuil) { encre[i] = 1; n++ }
  // Craie sur tableau noir : l'encre est claire
  if (n > L * H * 0.5) { for (let i = 0; i < L * H; i++) encre[i] = 1 - encre[i] }
  encre = nettoyer(encre, L, H)

  // 2. Composantes connexes (8 voisins)
  const comp = composantes(encre, L, H)
  const diag = Math.hypot(L, H)
  const res: Reperage = { polygones: [], points: [] }
  const papier = papierExterieur(encre, L, H)

  for (const cp of comp) {
    const lb = cp.x2 - cp.x1 + 1, hb = cp.y2 - cp.y1 + 1
    const taille = Math.hypot(lb, hb)
    if (taille > diag * 0.12) {
      // 3. Un tracé : épaisseur ≈ aire / (demi-périmètre du contour)
      const contour = suivreContour(encre, L, H, cp.depart)
      if (contour.length < 12) continue
      const epaisseur = Math.max(1, 2 * cp.n / contour.length)
      const ferme = entoureDuPapier(cp, papier, encre, L)
      let coins = simplifier(contour, Math.max(2.5, taille * 0.025))
      coins = sansFauxCoins(coins, Math.max(4, epaisseur * 2.5), ferme)
      if (ferme && coins.length >= 3 && coins.length <= 10) {
        // Le contour extérieur est décalé d'une demi-épaisseur : on rentre
        const g = centre(coins)
        res.polygones.push(coins.map(p => { const d = Math.hypot(p.x - g.x, p.y - g.y) || 1; return { x: p.x + (g.x - p.x) / d * epaisseur / 2, y: p.y + (g.y - p.y) / d * epaisseur / 2 } }))
      } else if (!ferme) {
        // Un trait ouvert : ses bouts et ses coins deviennent des points
        for (const p of coins) res.points.push(p)
      }
    } else if (taille > diag * 0.008 && taille < diag * 0.06 && lb < 4 * hb && hb < 4 * lb) {
      // 4. Petite marque : point plein, croix × ou + ?
      const forme = petiteMarque(cp, encre, L)
      if (forme) res.points.push(forme)
    }
  }
  // Un point marqué sur un sommet déjà trouvé n'en fait pas un second
  const tous = res.polygones.flat()
  res.points = fusionner(res.points, diag * 0.02).filter(p => !tous.some(q => Math.hypot(p.x - q.x, p.y - q.y) < diag * 0.025))
  // Retour aux pixels de l'image d'origine
  const r = (p: P) => ({ x: p.x / k, y: p.y / k })
  return { polygones: res.polygones.map(pg => pg.map(r)), points: res.points.map(r) }
}

// ---------- 1. Seuil ----------
function otsu(h: number[], total: number) {
  let somme = 0
  for (let i = 0; i < 256; i++) somme += i * h[i]
  let sB = 0, wB = 0, mieux = 0, seuil = 128
  for (let t = 0; t < 256; t++) {
    wB += h[t]; if (!wB) continue
    const wF = total - wB; if (!wF) break
    sB += t * h[t]
    const mB = sB / wB, mF = (somme - sB) / wF
    const v = wB * wF * (mB - mF) ** 2
    if (v > mieux) { mieux = v; seuil = t }
  }
  return seuil
}

/** Retire les pixels isolés (poussière, bruit de photo) */
function nettoyer(m: Uint8Array, L: number, H: number) {
  const r = new Uint8Array(m)
  for (let y = 1; y < H - 1; y++) for (let x = 1; x < L - 1; x++) {
    const i = y * L + x
    if (!m[i]) continue
    let v = 0
    for (let dy = -1; dy <= 1; dy++) for (let dx = -1; dx <= 1; dx++) v += m[i + dy * L + dx]
    if (v <= 2) r[i] = 0
  }
  return r
}

// ---------- 2. Composantes ----------
interface Composante { n: number; x1: number; y1: number; x2: number; y2: number; depart: number; pixels: Int32Array }

function composantes(m: Uint8Array, L: number, H: number): Composante[] {
  const vu = new Uint8Array(L * H), r: Composante[] = []
  const pile = new Int32Array(L * H)
  for (let s = 0; s < L * H; s++) {
    if (!m[s] || vu[s]) continue
    let haut = 0, n = 0, x1 = L, y1 = H, x2 = 0, y2 = 0
    const liste: number[] = []
    pile[haut++] = s; vu[s] = 1
    while (haut) {
      const i = pile[--haut]; n++; liste.push(i)
      const x = i % L, y = (i / L) | 0
      if (x < x1) x1 = x; if (x > x2) x2 = x; if (y < y1) y1 = y; if (y > y2) y2 = y
      for (let dy = -1; dy <= 1; dy++) for (let dx = -1; dx <= 1; dx++) {
        const xx = x + dx, yy = y + dy
        if (xx < 0 || yy < 0 || xx >= L || yy >= H) continue
        const j = yy * L + xx
        if (m[j] && !vu[j]) { vu[j] = 1; pile[haut++] = j }
      }
    }
    if (n >= 4) r.push({ n, x1, y1, x2, y2, depart: s, pixels: Int32Array.from(liste) })
  }
  return r
}

/** Le papier qu'on atteint depuis les bords de l'image */
function papierExterieur(m: Uint8Array, L: number, H: number) {
  const ext = new Uint8Array(L * H), pile: number[] = []
  const pousser = (i: number) => { if (!m[i] && !ext[i]) { ext[i] = 1; pile.push(i) } }
  for (let x = 0; x < L; x++) { pousser(x); pousser((H - 1) * L + x) }
  for (let y = 0; y < H; y++) { pousser(y * L); pousser(y * L + L - 1) }
  while (pile.length) {
    const i = pile.pop()!, x = i % L, y = (i / L) | 0
    if (x > 0) pousser(i - 1); if (x < L - 1) pousser(i + 1)
    if (y > 0) pousser(i - L); if (y < H - 1) pousser(i + L)
  }
  return ext
}

/** La composante enferme-t-elle du papier (un trou assez grand) ? */
function entoureDuPapier(cp: Composante, ext: Uint8Array, m: Uint8Array, L: number) {
  let trou = 0
  for (let y = cp.y1; y <= cp.y2; y++) for (let x = cp.x1; x <= cp.x2; x++) {
    const i = y * L + x
    if (!m[i] && !ext[i]) trou++
  }
  return trou > (cp.x2 - cp.x1) * (cp.y2 - cp.y1) * 0.08
}

// ---------- 3. Contour et coins ----------
/** Suivi de contour de Moore, depuis le premier pixel de la composante */
function suivreContour(m: Uint8Array, L: number, H: number, depart: number): P[] {
  const dirs = [[1, 0], [1, 1], [0, 1], [-1, 1], [-1, 0], [-1, -1], [0, -1], [1, -1]]
  const encre = (x: number, y: number) => x >= 0 && y >= 0 && x < L && y < H && m[y * L + x] === 1
  const x0 = depart % L, y0 = (depart / L) | 0
  const r: P[] = [{ x: x0, y: y0 }]
  let x = x0, y = y0, d = 7
  for (let pas = 0; pas < L * H; pas++) {
    let trouve = false
    for (let k = 0; k < 8; k++) {
      const nd = (d + 6 + k) % 8                  // on tourne en partant de la gauche
      const nx = x + dirs[nd][0], ny = y + dirs[nd][1]
      if (encre(nx, ny)) { x = nx; y = ny; d = nd; trouve = true; break }
    }
    if (!trouve || (x === x0 && y === y0)) break
    r.push({ x, y })
  }
  return r
}

function distSeg(p: P, a: P, b: P) {
  const vx = b.x - a.x, vy = b.y - a.y, l2 = vx * vx + vy * vy
  const t = l2 ? Math.max(0, Math.min(1, ((p.x - a.x) * vx + (p.y - a.y) * vy) / l2)) : 0
  return Math.hypot(p.x - a.x - t * vx, p.y - a.y - t * vy)
}

function rdp(p: P[], i: number, j: number, eps: number, garde: number[]) {
  let max = 0, k = -1
  for (let m = i + 1; m < j; m++) { const d = distSeg(p[m], p[i], p[j]); if (d > max) { max = d; k = m } }
  if (k >= 0 && max > eps) { rdp(p, i, k, eps, garde); garde.push(k); rdp(p, k, j, eps, garde) }
}

/** Contour fermé → ses coins */
function simplifier(c: P[], eps: number): P[] {
  let loin = 0
  for (let i = 1; i < c.length; i++) if (Math.hypot(c[i].x - c[0].x, c[i].y - c[0].y) > Math.hypot(c[loin].x - c[0].x, c[loin].y - c[0].y)) loin = i
  const garde = [0]
  rdp(c, 0, loin, eps, garde); garde.push(loin); rdp([...c, c[0]], loin, c.length, eps, garde)
  return garde.filter(i => i < c.length).map(i => c[i])
}

function angle(a: P, b: P, c: P) {
  const u = { x: a.x - b.x, y: a.y - b.y }, v = { x: c.x - b.x, y: c.y - b.y }
  const cos = (u.x * v.x + u.y * v.y) / ((Math.hypot(u.x, u.y) * Math.hypot(v.x, v.y)) || 1)
  return Math.acos(Math.max(-1, Math.min(1, cos))) * 180 / Math.PI
}

/** Retire les coins plats et réunit ceux qui se touchent (les deux bords d'un trait) */
function sansFauxCoins(s: P[], proche: number, ferme: boolean): P[] {
  let r = fusionner(s, proche)
  let change = true
  while (change && r.length > (ferme ? 3 : 2)) {
    change = false
    for (let k = 0; k < r.length; k++) {
      const a = r[(k - 1 + r.length) % r.length], b = r[k], c = r[(k + 1) % r.length]
      if (angle(a, b, c) > 158) { r = r.filter((_, m) => m !== k); change = true; break }
    }
  }
  return r
}

/** Réunit les points à moins de `d` les uns des autres (moyenne) */
function fusionner(p: P[], d: number): P[] {
  const groupes: P[][] = []
  for (const q of p) {
    const g = groupes.find(gr => gr.some(x => Math.hypot(x.x - q.x, x.y - q.y) < d))
    if (g) g.push(q); else groupes.push([q])
  }
  return groupes.map(centre)
}

function centre(p: P[]): P {
  return { x: p.reduce((a, q) => a + q.x, 0) / p.length, y: p.reduce((a, q) => a + q.y, 0) / p.length }
}

// ---------- 4. Petites marques ----------
/** Un point plein, ou une croix (× ou +) : rend son centre */
function petiteMarque(cp: Composante, m: Uint8Array, L: number): P | null {
  const lb = cp.x2 - cp.x1 + 1, hb = cp.y2 - cp.y1 + 1
  const remplissage = cp.n / (lb * hb)
  const c = { x: (cp.x1 + cp.x2) / 2, y: (cp.y1 + cp.y2) / 2 }
  if (remplissage > 0.6) return c                                // un point plein
  if (!m[Math.round(c.y) * L + Math.round(c.x)]) {
    // Le centre doit être de l'encre (une croix se croise en son milieu)
    let ok = false
    for (let dy = -1; dy <= 1 && !ok; dy++) for (let dx = -1; dx <= 1; dx++) if (m[(Math.round(c.y) + dy) * L + Math.round(c.x) + dx]) ok = true
    if (!ok) return null
  }
  // Tous les pixels près des deux diagonales (×) ou des deux médianes (+) ?
  const e = Math.max(1.5, Math.min(lb, hb) * 0.18)
  let surX = 0, surPlus = 0
  for (const i of cp.pixels) {
    const x = i % L - c.x, y = ((i / L) | 0) - c.y
    const dx1 = Math.abs(x * hb - y * lb) / Math.hypot(lb, hb), dx2 = Math.abs(x * hb + y * lb) / Math.hypot(lb, hb)
    if (Math.min(dx1, dx2) <= e) surX++
    if (Math.min(Math.abs(x), Math.abs(y)) <= e) surPlus++
  }
  // Une croix a quatre bras : de l'encre dans les quatre coins (×) ou au milieu
  // des quatre côtés (+). Un « A » ou un « V » n'a pas ses quatre bras.
  const bras = (zones: [number, number][]) => zones.every(([fx, fy]) => {
    const zx = cp.x1 + fx * (lb - 1), zy = cp.y1 + fy * (hb - 1), r = Math.max(1.5, Math.min(lb, hb) * 0.22)
    for (const i of cp.pixels) { const x = i % L, y = (i / L) | 0; if (Math.abs(x - zx) <= r && Math.abs(y - zy) <= r) return true }
    return false
  })
  if (surX > cp.n * 0.88 && bras([[0, 0], [1, 0], [0, 1], [1, 1]])) return c
  if (surPlus > cp.n * 0.88 && bras([[0.5, 0], [0.5, 1], [0, 0.5], [1, 0.5]])) return c
  return null
}
