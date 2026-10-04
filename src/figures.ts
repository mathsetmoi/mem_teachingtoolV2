// =============================================================
// LES FIGURES DES AUTOMATISMES
// Des dessins SVG tirés au hasard comme les nombres : droite graduée,
// repère, angles, triangles et quadrilatères codés, empilements de
// cubes, patrons, perspective cavalière, symétrie, motifs. Chaque
// fonction rend une chaîne <svg…>, qui s'affiche telle quelle dans une
// question ou dans une proposition de QCM.
// =============================================================

type P = { x: number; y: number }
const f2 = (v: number) => Math.round(v * 10) / 10

/** Un dessin : trait de la couleur du texte, noms de points en italique */
export function svg(l: number, h: number, contenu: string, classe = 'fig') {
  return `<svg class="${classe}" viewBox="0 0 ${f2(l)} ${f2(h)}" xmlns="http://www.w3.org/2000/svg" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" font-family="'KaTeX_Main','Times New Roman',serif">${contenu}</svg>`
}
const ligne = (a: P, b: P, extra = '') => `<line x1="${f2(a.x)}" y1="${f2(a.y)}" x2="${f2(b.x)}" y2="${f2(b.y)}" ${extra}/>`
const poly = (p: P[], extra = '') => `<polygon points="${p.map(q => `${f2(q.x)},${f2(q.y)}`).join(' ')}" ${extra}/>`
const texte = (p: P, t: string, extra = '') => `<text x="${f2(p.x)}" y="${f2(p.y)}" fill="currentColor" stroke="none" text-anchor="middle" dominant-baseline="middle" ${extra}>${t}</text>`
const nom = (p: P, t: string, taille = 18) => texte(p, t, `font-style="italic" font-size="${taille}"`)
const point = (p: P) => `<path d="M${f2(p.x - 5)} ${f2(p.y - 5)}L${f2(p.x + 5)} ${f2(p.y + 5)}M${f2(p.x + 5)} ${f2(p.y - 5)}L${f2(p.x - 5)} ${f2(p.y + 5)}"/>`
const dist = (a: P, b: P) => Math.hypot(a.x - b.x, a.y - b.y)
const milieu = (a: P, b: P) => ({ x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 })

// ---------- Codage ----------
/** n petits traits au milieu de [ab] (côtés de même longueur) */
export function traits(a: P, b: P, n: number) {
  const l = dist(a, b) || 1, u = { x: (b.x - a.x) / l, y: (b.y - a.y) / l }, m = milieu(a, b)
  let r = ''
  for (let i = 0; i < n; i++) {
    const d = (i - (n - 1) / 2) * 5, o = { x: m.x + u.x * d, y: m.y + u.y * d }
    r += ligne({ x: o.x - u.y * 7 - u.x * 2, y: o.y + u.x * 7 - u.y * 2 }, { x: o.x + u.y * 7 + u.x * 2, y: o.y - u.x * 7 + u.y * 2 }, 'stroke-width="1.8"')
  }
  return r
}
/** Le petit carré de l'angle droit en s, entre les directions de a et c */
export function angleDroit(a: P, s: P, c: P, k = 12) {
  const u = { x: (a.x - s.x) / dist(a, s), y: (a.y - s.y) / dist(a, s) }, v = { x: (c.x - s.x) / dist(c, s), y: (c.y - s.y) / dist(c, s) }
  return `<path d="M${f2(s.x + u.x * k)} ${f2(s.y + u.y * k)}L${f2(s.x + (u.x + v.x) * k)} ${f2(s.y + (u.y + v.y) * k)}L${f2(s.x + v.x * k)} ${f2(s.y + v.y * k)}" stroke-width="1.6"/>`
}
/** Un arc d'angle en s, de la direction a à la direction c */
function arcAngle(s: P, a: P, c: P, r = 22) {
  const a1 = Math.atan2(a.y - s.y, a.x - s.x), a2 = Math.atan2(c.y - s.y, c.x - s.x)
  let d = a2 - a1
  while (d > Math.PI) d -= 2 * Math.PI
  while (d < -Math.PI) d += 2 * Math.PI
  const p1 = { x: s.x + r * Math.cos(a1), y: s.y + r * Math.sin(a1) }, p2 = { x: s.x + r * Math.cos(a1 + d), y: s.y + r * Math.sin(a1 + d) }
  return `<path d="M${f2(p1.x)} ${f2(p1.y)}A${r} ${r} 0 0 ${d > 0 ? 1 : 0} ${f2(p2.x)} ${f2(p2.y)}" stroke-width="1.6"/>`
}
const dir = (s: P, deg: number, l: number): P => ({ x: s.x + l * Math.cos(-deg * Math.PI / 180), y: s.y + l * Math.sin(-deg * Math.PI / 180) })

// ---------- Droite graduée ----------
/** Unités de `debut` à `fin`, chaque unité coupée en `parts` ; un point nommé à l'abscisse `x` */
export function droiteGraduee(debut: number, fin: number, parts: number, x: number, lettre = 'A', etiquettes?: (k: number) => string) {
  const L = 520, g = 30, u = (L - 2 * g) / (fin - debut)
  const X = (v: number) => g + (v - debut) * u
  let r = ligne({ x: 10, y: 60 }, { x: L - 10, y: 60 }) + `<path d="M${L - 18} 54L${L - 8} 60L${L - 18} 66"/>`
  for (let k = 0; k <= (fin - debut) * parts; k++) {
    const v = debut + k / parts, unite = k % parts === 0
    r += ligne({ x: X(v), y: unite ? 50 : 54 }, { x: X(v), y: unite ? 70 : 66 }, `stroke-width="${unite ? 2 : 1.3}"`)
    if (unite) r += texte({ x: X(v), y: 92 }, etiquettes ? etiquettes(k / parts) : String(Math.round(v)).replace('-', '−'), 'font-size="22"')
  }
  r += `<circle cx="${f2(X(x))}" cy="60" r="6" fill="#d0342c" stroke="none"/>` + nom({ x: X(x), y: 30 }, lettre, 24)
  return svg(L, 108, r)
}

// ---------- Repère ----------
export function repere(px: number, py: number, lettre = 'A') {
  const n = 5, c = 26, O = { x: 20 + n * c, y: 20 + n * c }, T = 40 + 2 * n * c
  let r = ''
  for (let k = -n; k <= n; k++) {
    r += ligne({ x: O.x + k * c, y: 20 }, { x: O.x + k * c, y: T - 20 }, 'stroke="#9bb6dc" stroke-width="1"')
    r += ligne({ x: 20, y: O.y + k * c }, { x: T - 20, y: O.y + k * c }, 'stroke="#9bb6dc" stroke-width="1"')
  }
  r += ligne({ x: 14, y: O.y }, { x: T - 10, y: O.y }) + ligne({ x: O.x, y: T - 14 }, { x: O.x, y: 10 })
  r += `<path d="M${T - 18} ${O.y - 6}L${T - 10} ${O.y}L${T - 18} ${O.y + 6}M${O.x - 6} 18L${O.x} 10L${O.x + 6} 18"/>`
  r += texte({ x: O.x - 10, y: O.y + 14 }, '0', 'font-size="14"') + texte({ x: O.x + c, y: O.y + 14 }, '1', 'font-size="14"') + texte({ x: O.x - 12, y: O.y - c }, '1', 'font-size="14"')
  const A = { x: O.x + px * c, y: O.y - py * c }
  r += `<circle cx="${A.x}" cy="${A.y}" r="5" fill="#d0342c" stroke="none"/>` + nom({ x: A.x + 12, y: A.y - 12 }, lettre, 19)
  return svg(T, T, r)
}

// ---------- Angles ----------
/** Un angle de sommet O, de mesure `deg` (0 à 360), dessiné à partir d'une direction `depart` */
export function unAngle(deg: number, depart = 0) {
  const O = { x: 130, y: 110 }, L = 95
  const a = dir(O, depart, L), c = dir(O, depart + deg, L)
  let r = ligne(O, a)
  if (deg % 360 !== 0) r += ligne(O, c)
  if (deg === 90) r += angleDroit(a, O, c, 14)
  else if (deg === 360) r += `<circle cx="${O.x}" cy="${O.y}" r="20" stroke-width="1.6"/>`
  else if (deg !== 0) {
    const r0 = 24, a1 = -depart * Math.PI / 180, a2 = -(depart + deg) * Math.PI / 180
    const p1 = { x: O.x + r0 * Math.cos(a1), y: O.y + r0 * Math.sin(a1) }, p2 = { x: O.x + r0 * Math.cos(a2), y: O.y + r0 * Math.sin(a2) }
    r += `<path d="M${f2(p1.x)} ${f2(p1.y)}A${r0} ${r0} 0 ${deg > 180 ? 1 : 0} 0 ${f2(p2.x)} ${f2(p2.y)}" stroke-width="1.6" stroke="#d0342c"/>`
  }
  r += `<circle cx="${O.x}" cy="${O.y}" r="3" fill="currentColor" stroke="none"/>`
  return svg(260, 220, r)
}

/** Deux angles : adjacents, opposés par le sommet, ou supplémentaires (séparés) */
export function deuxAngles(sorte: 'adjacents' | 'opposes' | 'supplementaires' | 'complementaires', m1: number, m2: number) {
  let r = ''
  const marque = (s: P, a: P, c: P, t: string, rr = 24) => {
    const am = (Math.atan2(a.y - s.y, a.x - s.x) + Math.atan2(c.y - s.y, c.x - s.x)) / 2
    return arcAngle(s, a, c, rr) + texte({ x: s.x + (rr + 20) * Math.cos(am), y: s.y + (rr + 20) * Math.sin(am) }, t, 'font-size="15"')
  }
  if (sorte === 'adjacents') {
    const O = { x: 120, y: 160 }, a = dir(O, 5, 140), b = dir(O, 5 + m1, 140), c = dir(O, 5 + m1 + m2, 140)
    r = ligne(O, a) + ligne(O, b) + ligne(O, c) + marque(O, a, b, `${m1}°`, 30) + marque(O, b, c, `${m2}°`, 46)
    return svg(300, 190, r)
  }
  if (sorte === 'opposes') {
    const O = { x: 150, y: 100 }, t = m1
    const a = dir(O, t, 110), c = dir(O, t + 180, 110), b = dir(O, 180 - t + 40, 110), d = dir(O, -t + 40, 110)
    r = ligne(a, c) + ligne(b, d) + arcAngle(O, a, d, 26) + arcAngle(O, c, b, 26)
    return svg(300, 200, r)
  }
  // Deux angles séparés, de mesures m1 et m2
  const O1 = { x: 30, y: 130 }, O2 = { x: 190, y: 130 }
  r = ligne(O1, dir(O1, 0, 120)) + ligne(O1, dir(O1, m1, 110)) + marque(O1, dir(O1, 0, 1), dir(O1, m1, 1), `${m1}°`)
  r += ligne(O2, dir(O2, 0, 110)) + ligne(O2, dir(O2, m2, 100)) + marque(O2, dir(O2, 0, 1), dir(O2, m2, 1), `${m2}°`)
  void sorte
  return svg(320, 160, r)
}

/** Un angle xOy et une demi-droite [Oz) entre ses côtés, mesures écrites */
export function bissectriceFig(m1: number, m2: number) {
  const O = { x: 40, y: 170 }, x = dir(O, 8, 210), z = dir(O, 8 + m1, 210), y = dir(O, 8 + m1 + m2, 200)
  const marque = (a: P, c: P, t: string, rr: number) => {
    const am = (Math.atan2(a.y - O.y, a.x - O.x) + Math.atan2(c.y - O.y, c.x - O.x)) / 2
    return arcAngle(O, a, c, rr) + texte({ x: O.x + (rr + 22) * Math.cos(am), y: O.y + (rr + 22) * Math.sin(am) }, t, 'font-size="15"')
  }
  const r = ligne(O, x) + ligne(O, y) + ligne(O, z, 'stroke="#1f5fbf"') + marque(x, z, `${m1}°`, 60) + marque(z, y, `${m2}°`, 92)
    + nom(dir(O, 8, 226), 'x') + nom(dir(O, 8 + m1 + m2, 218), 'y') + nom(dir(O, 8 + m1, 226), 'z') + nom({ x: O.x - 12, y: O.y + 10 }, 'O')
  return cadre([O, dir(O, 8, 236), dir(O, 8 + m1 + m2, 228), dir(O, 8 + m1, 236)], r, 16)
}

// ---------- Figures qui tournent ----------
/** Tourne des points autour de c */
export const tourner = (pts: P[], c: P, deg: number) => {
  const t = deg * Math.PI / 180, co = Math.cos(t), si = Math.sin(t)
  return pts.map(q => ({ x: c.x + (q.x - c.x) * co - (q.y - c.y) * si, y: c.y + (q.x - c.x) * si + (q.y - c.y) * co }))
}
/** Un dessin cadré sur ses points, avec une marge (pour les figures tournées) */
function cadre(pts: P[], contenu: string, marge = 30, classe = 'fig') {
  const x1 = Math.min(...pts.map(p => p.x)) - marge, y1 = Math.min(...pts.map(p => p.y)) - marge
  const l = Math.max(...pts.map(p => p.x)) + marge - x1, h = Math.max(...pts.map(p => p.y)) + marge - y1
  return svg(l, h, contenu, classe).replace(/viewBox="0 0 /, `viewBox="${f2(x1)} ${f2(y1)} `)
}
/** Le nom d'un sommet, écarté du centre de la figure */
const nomDehors = (p: P, c: P, t: string) => { const d = dist(p, c) || 1; return nom({ x: p.x + (p.x - c.x) / d * 16, y: p.y + (p.y - c.y) / d * 16 }, t) }
const centre = (p: P[]) => ({ x: p.reduce((s, q) => s + q.x, 0) / p.length, y: p.reduce((s, q) => s + q.y, 0) / p.length })

// ---------- Triangles codés ----------
export type Triangle = 'isocele' | 'equilateral' | 'rectangle' | 'quelconque' | 'rectangle-isocele'
export function triangleCode(sorte: Triangle, tourne = 0) {
  let p: P[]
  if (sorte === 'equilateral') p = [0, 120, 240].map(a => ({ x: 150 + 85 * Math.cos((a - 90) * Math.PI / 180), y: 115 + 85 * Math.sin((a - 90) * Math.PI / 180) }))
  else if (sorte === 'isocele') p = [{ x: 150, y: 20 }, { x: 95, y: 195 }, { x: 205, y: 195 }]
  else if (sorte === 'rectangle') p = [{ x: 70, y: 40 }, { x: 70, y: 190 }, { x: 250, y: 190 }]
  else if (sorte === 'rectangle-isocele') p = [{ x: 80, y: 40 }, { x: 80, y: 190 }, { x: 230, y: 190 }]
  else p = [{ x: 60, y: 180 }, { x: 250, y: 190 }, { x: 120, y: 40 }]
  p = tourner(p, centre(p), tourne)
  let r = poly(p)
  if (sorte === 'equilateral') r += traits(p[0], p[1], 1) + traits(p[1], p[2], 1) + traits(p[2], p[0], 1)
  if (sorte === 'isocele') r += traits(p[0], p[1], 1) + traits(p[0], p[2], 1)
  if (sorte === 'rectangle' || sorte === 'rectangle-isocele') r += angleDroit(p[0], p[1], p[2])
  if (sorte === 'rectangle-isocele') r += traits(p[0], p[1], 2) + traits(p[1], p[2], 2)
  return cadre(p, r, 20)
}

// ---------- Quadrilatères et polygones ----------
export type Polygone = 'carre' | 'rectangle' | 'losange' | 'parallelogramme' | 'trapeze' | 'pentagone' | 'hexagone' | 'quadrilatere'
export function polygone(sorte: Polygone, tourne = 0) {
  let p: P[]
  switch (sorte) {
    case 'carre': p = [{ x: 90, y: 40 }, { x: 230, y: 40 }, { x: 230, y: 180 }, { x: 90, y: 180 }]; break
    case 'rectangle': p = [{ x: 50, y: 60 }, { x: 260, y: 60 }, { x: 260, y: 170 }, { x: 50, y: 170 }]; break
    case 'losange': p = [{ x: 160, y: 50 }, { x: 280, y: 115 }, { x: 160, y: 180 }, { x: 40, y: 115 }]; break
    case 'parallelogramme': p = [{ x: 90, y: 60 }, { x: 270, y: 60 }, { x: 220, y: 170 }, { x: 40, y: 170 }]; break
    case 'trapeze': p = [{ x: 100, y: 60 }, { x: 210, y: 60 }, { x: 270, y: 170 }, { x: 40, y: 170 }]; break
    case 'quadrilatere': p = [{ x: 70, y: 50 }, { x: 240, y: 80 }, { x: 260, y: 180 }, { x: 40, y: 160 }]; break
    default: { const n = sorte === 'pentagone' ? 5 : 6; p = Array.from({ length: n }, (_, i) => ({ x: 155 + 90 * Math.cos(2 * Math.PI * i / n - Math.PI / 2), y: 112 + 90 * Math.sin(2 * Math.PI * i / n - Math.PI / 2) })) }
  }
  p = tourner(p, centre(p), tourne)
  let r = poly(p)
  // Le codage dit ce qui est vrai : côtés égaux, angles droits
  if (sorte === 'carre' || sorte === 'losange') for (let i = 0; i < 4; i++) r += traits(p[i], p[(i + 1) % 4], 1)
  if (sorte === 'carre' || sorte === 'rectangle') r += angleDroit(p[3], p[0], p[1])
  if (sorte === 'rectangle' || sorte === 'parallelogramme') r += traits(p[0], p[1], 2) + traits(p[2], p[3], 2) + traits(p[1], p[2], 1) + traits(p[3], p[0], 1)
  if (sorte === 'pentagone' || sorte === 'hexagone') for (let i = 0; i < p.length; i++) r += traits(p[i], p[(i + 1) % p.length], 1)
  return cadre(p, r, 20)
}

/** Un parallélogramme dessiné « penché » : seul son codage permet de conclure */
export function parallelogrammeCode(longueurs: boolean, droit: boolean, noms: string, tourne = 0, coin = 0) {
  let p = [{ x: 80, y: 50 }, { x: 250, y: 50 }, { x: 220, y: 180 }, { x: 50, y: 180 }]
  p = tourner(p, centre(p), tourne)
  const c = centre(p)
  let r = poly(p) + p.map((q, i) => nomDehors(q, c, noms[i])).join('')
  if (longueurs) for (let i = 0; i < 4; i++) r += traits(p[i], p[(i + 1) % 4], 1)
  else r += traits(p[0], p[1], 2) + traits(p[2], p[3], 2)
  if (droit) r += angleDroit(p[(coin + 3) % 4], p[coin], p[(coin + 1) % 4])
  return cadre(p, r, 34)
}

// ---------- Médiatrice ----------
export function mediatriceFig(perpendiculaire: boolean, auMilieu: boolean, tourne = 0, noms = 'AB') {
  const xm = auMilieu ? 160 : choixDe([115, 205])
  let pts = [{ x: 50, y: 120 }, { x: 270, y: 120 }, perpendiculaire ? { x: xm, y: 10 } : { x: xm + 45, y: 10 }, perpendiculaire ? { x: xm, y: 220 } : { x: xm - 41, y: 220 }, { x: xm, y: 120 }]
  pts = tourner(pts, { x: 160, y: 120 }, tourne)
  const [A, B, haut, bas, I] = pts, c = { x: (A.x + B.x) / 2, y: (A.y + B.y) / 2 }
  let r = ligne(A, B) + ligne(haut, bas, 'stroke="#1f5fbf"') + point(A) + point(B) + nomDehors(A, c, noms[0]) + nomDehors(B, c, noms[1]) + nom({ x: haut.x + 22, y: haut.y + 6 }, '(d)', 16)
  if (perpendiculaire) r += angleDroit(B, I, haut, 12)
  if (auMilieu) r += traits(A, I, 1) + traits(I, B, 1)
  return cadre(pts, r, 30)
}
const choixDe = <T,>(t: T[]): T => t[Math.floor(Math.random() * t.length)]

// ---------- Symétrie axiale ----------
/** La figure rouge et une figure bleue ; l'erreur dit ce qui cloche (ou « aucune ») */
export function symetrie(forme: P[], axe: 'vertical' | 'horizontal', erreur: 'aucune' | 'translation' | 'decalage' | 'rotation') {
  const c = 22, n = 12
  let r = ''
  for (let k = 0; k <= n; k++) { r += ligne({ x: 10 + k * c, y: 10 }, { x: 10 + k * c, y: 10 + n * c }, 'stroke="#c9d6ea" stroke-width="1"'); r += ligne({ x: 10, y: 10 + k * c }, { x: 10 + n * c, y: 10 + k * c }, 'stroke="#c9d6ea" stroke-width="1"') }
  // La forme est donnée pour un axe vertical (x = 6) ; on la transpose pour un axe horizontal
  const T = (q: P) => axe === 'vertical' ? q : { x: q.y, y: q.x }
  const X = (q: P) => { const t = T(q); return { x: 10 + t.x * c, y: 10 + t.y * c } }
  let image = forme.map(q => ({ x: 12 - q.x, y: q.y }))
  if (erreur === 'translation') image = forme.map(q => ({ x: q.x + 6, y: q.y }))
  if (erreur === 'decalage') image = image.map(q => ({ x: q.x + 1, y: q.y }))
  if (erreur === 'rotation') image = forme.map(q => ({ x: 12 - q.x, y: 12 - q.y }))
  r += axe === 'vertical' ? ligne({ x: 10 + 6 * c, y: 2 }, { x: 10 + 6 * c, y: 18 + n * c }, 'stroke-width="2.4" stroke-dasharray="8 5"')
    : ligne({ x: 2, y: 10 + 6 * c }, { x: 18 + n * c, y: 10 + 6 * c }, 'stroke-width="2.4" stroke-dasharray="8 5"')
  r += poly(forme.map(X), 'stroke="#d0342c" fill="rgba(208,52,44,.15)" stroke-width="2.6"') + poly(image.map(X), 'stroke="#1f5fbf" fill="rgba(31,95,191,.15)" stroke-width="2.6"')
  r += axe === 'vertical' ? nom({ x: 34 + 6 * c, y: 24 }, '(d)', 20) : nom({ x: n * c - 6, y: 6 * c - 6 }, '(d)', 20)
  return svg(20 + n * c, 20 + n * c, r, 'fig fig-carree')
}

// ---------- Empilements de cubes ----------
/** Empilement en perspective cavalière : h[x][y] cubes sur la case (x, y) ; y = 0 est la rangée de devant */
export function empilement(h: number[][]) {
  const s = 30, k = 0.62 * s * Math.SQRT1_2
  const proj = (x: number, y: number, z: number): P => ({ x: x * s + y * k, y: -z * s - y * k })
  const cubes: [number, number, number][] = []
  h.forEach((col, x) => col.forEach((v, y) => { for (let z = 0; z < v; z++) cubes.push([x, y, z]) }))
  // Du fond vers l'avant, de bas en haut, de gauche à droite
  cubes.sort((a, b) => b[1] - a[1] || a[2] - b[2] || a[0] - b[0])
  const faces: { p: P[]; couleur: string }[] = []
  for (const [x, y, z] of cubes) {
    const q = (pts: [number, number, number][], couleur: string) => faces.push({ p: pts.map(([a, b, c]) => proj(a, b, c)), couleur })
    q([[x + 1, y, z], [x + 1, y + 1, z], [x + 1, y + 1, z + 1], [x + 1, y, z + 1]], '#8fa8d2')
    q([[x, y, z + 1], [x + 1, y, z + 1], [x + 1, y + 1, z + 1], [x, y + 1, z + 1]], '#e8eef8')
    q([[x, y, z], [x + 1, y, z], [x + 1, y, z + 1], [x, y, z + 1]], '#b9c9e4')
  }
  const pts = faces.flatMap(f => f.p)
  const r = faces.map(f => poly(f.p, `fill="${f.couleur}" stroke-width="1.5"`)).join('')
  return cadre(pts, r, 6)
}

/** Une vue (de dessus) : les cases remplies d'une grille */
export function vueGrille(cases: boolean[][]) {
  const c = 26, n = cases.length, m = cases[0].length
  let r = ''
  cases.forEach((l, i) => l.forEach((v, j) => { if (v) r += `<rect x="${4 + j * c}" y="${4 + i * c}" width="${c}" height="${c}" fill="#b9c9e4" stroke-width="1.6"/>` }))
  return svg(8 + m * c, 8 + n * c, r, 'fig fig-petite')
}

// ---------- Patrons de cube ----------
export type Cases = [number, number][]
/** Le patron se replie-t-il en cube ? On fait rouler un dé sur ses cases. */
export function estPatronDeCube(cases: Cases): boolean {
  const cle = (c: [number, number]) => c.join(',')
  const ens = new Set(cases.map(cle))
  const depart = { bas: 'B', haut: 'H', n: 'N', s: 'S', e: 'E', o: 'O' }
  const vues = new Map<string, string>([[cle(cases[0]), depart.bas]])
  const pile: [[number, number], typeof depart][] = [[cases[0], depart]]
  while (pile.length) {
    const [[x, y], d] = pile.pop()!
    const voisins: [[number, number], typeof depart][] = [
      [[x + 1, y], { bas: d.e, e: d.haut, haut: d.o, o: d.bas, n: d.n, s: d.s }],
      [[x - 1, y], { bas: d.o, o: d.haut, haut: d.e, e: d.bas, n: d.n, s: d.s }],
      [[x, y + 1], { bas: d.s, s: d.haut, haut: d.n, n: d.bas, e: d.e, o: d.o }],
      [[x, y - 1], { bas: d.n, n: d.haut, haut: d.s, s: d.bas, e: d.e, o: d.o }],
    ]
    for (const [c, nd] of voisins) if (ens.has(cle(c)) && !vues.has(cle(c))) { vues.set(cle(c), nd.bas); pile.push([c, nd]) }
  }
  return vues.size === 6 && new Set(vues.values()).size === 6
}
/** Six cases d'un seul tenant, tirées au hasard */
export function hexomino(): Cases {
  const r: Cases = [[0, 0]]
  while (r.length < 6) {
    const [x, y] = r[Math.floor(Math.random() * r.length)]
    const [dx, dy] = [[1, 0], [-1, 0], [0, 1], [0, -1]][Math.floor(Math.random() * 4)]
    const c: [number, number] = [x + dx, y + dy]
    if (!r.some(q => q[0] === c[0] && q[1] === c[1])) r.push(c)
  }
  const mx = Math.min(...r.map(c => c[0])), my = Math.min(...r.map(c => c[1]))
  return r.map(([x, y]) => [x - mx, y - my] as [number, number])
}
export function patron(cases: Cases) {
  const c = 24, L = Math.max(...cases.map(q => q[0])) + 1, H = Math.max(...cases.map(q => q[1])) + 1
  return svg(8 + L * c, 8 + H * c, cases.map(([x, y]) => `<rect x="${4 + x * c}" y="${4 + y * c}" width="${c}" height="${c}" fill="#e8eef8" stroke-width="1.6"/>`).join(''), 'fig fig-petite')
}

// ---------- Perspective cavalière ----------
/** Un pavé l × h × p en perspective cavalière ; `faute` : ce qui rend le dessin faux */
export type Faute = 'aucune' | 'caches-pleins' | 'fuyantes' | 'face'
export function cavaliere(l: number, h: number, p: number, faute: Faute = 'aucune') {
  const k = 0.5, s = 26
  const d = { x: p * k * s * Math.SQRT1_2, y: -p * k * s * Math.SQRT1_2 }
  // Face avant ABCD (A en bas à gauche), face arrière EFGH = ABCD décalée selon les fuyantes
  const pen = faute === 'face' ? 0.35 * h * s : 0
  const A = { x: 0, y: 0 }, B = { x: l * s, y: 0 }, C = { x: l * s + pen, y: -h * s }, D = { x: pen, y: -h * s }
  const plus = (q: P, v: P) => ({ x: q.x + v.x, y: q.y + v.y })
  const dG = faute === 'fuyantes' ? { x: d.x * 1.6, y: d.y * 0.45 } : d
  const E = plus(A, d), F = plus(B, d), G = plus(C, dG), H = plus(D, d)
  const cache = faute === 'caches-pleins' ? '' : 'stroke-dasharray="6 5"'
  const r = poly([A, B, C, D]) + ligne(B, F) + ligne(C, G) + ligne(D, H) + ligne(F, G) + ligne(G, H)
    + ligne(A, E, cache) + ligne(E, F, cache) + ligne(E, H, cache)
  return cadre([A, B, C, D, E, F, G, H], r, 8, 'fig fig-petite')
}

// ---------- Motifs ----------
/** Les motifs 1, 2, 3 d'une suite : `points(n)` donne les cases du motif n */
export function motifs(points: (n: number) => [number, number][]) {
  const c = 14
  let x0 = 10, r = ''
  for (let n = 1; n <= 3; n++) {
    const pts = points(n)
    const L = Math.max(...pts.map(q => q[0])) + 1
    for (const [x, y] of pts) r += `<circle cx="${x0 + x * c + c / 2}" cy="${120 - (y + 1) * c + c / 2}" r="${c * 0.36}" fill="#1f5fbf" stroke="none"/>`
    r += texte({ x: x0 + L * c / 2, y: 145 }, `Motif ${n}`, 'font-size="14"')
    x0 += Math.max(L * c, 60) + 34
  }
  return svg(x0, 155, r)
}

// ---------- Échelle de probabilité ----------
/** De 0 (impossible) à 1 (certain), cinq repères nommés */
export function echelleProba(lettres: string[]) {
  const X = (v: number) => 62 + v * 416
  let r = ligne({ x: X(0), y: 60 }, { x: X(1), y: 60 }, 'stroke-width="3"')
  ;[0, 0.25, 0.5, 0.75, 1].forEach((v, i) => {
    r += ligne({ x: X(v), y: 50 }, { x: X(v), y: 70 }) + nom({ x: X(v), y: 30 }, lettres[i], 26)
  })
  r += texte({ x: X(0), y: 94 }, '0', 'font-size="22"') + texte({ x: X(1), y: 94 }, '1', 'font-size="22"') + texte({ x: X(0.5), y: 94 }, '1/2', 'font-size="20"')
  r += texte({ x: X(0), y: 122 }, 'impossible', 'font-size="19" font-style="italic"') + texte({ x: X(1), y: 122 }, 'certain', 'font-size="19" font-style="italic"')
  return svg(540, 136, r)
}
