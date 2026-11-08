// =============================================================
// LES FIGURES DES AUTOMATISMES
// Des dessins SVG tirés au hasard comme les nombres : droite graduée,
// repère, angles, triangles et quadrilatères codés, empilements de
// cubes, patrons, perspective cavalière, symétrie, motifs. Chaque
// fonction rend une chaîne <svg…>, qui s'affiche telle quelle sous une
// question.
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
  return droiteGradueePoints(debut, fin, parts, [{ x, lettre }], etiquettes)
}
/** La même droite graduée, avec plusieurs points nommés */
export function droiteGradueePoints(debut: number, fin: number, parts: number, points: { x: number; lettre: string }[], etiquettes?: (k: number) => string) {
  const L = 520, g = 30, u = (L - 2 * g) / (fin - debut)
  const X = (v: number) => g + (v - debut) * u
  let r = ligne({ x: 10, y: 60 }, { x: L - 10, y: 60 }) + `<path d="M${L - 18} 54L${L - 8} 60L${L - 18} 66"/>`
  for (let k = 0; k <= (fin - debut) * parts; k++) {
    const v = debut + k / parts, unite = k % parts === 0
    r += ligne({ x: X(v), y: unite ? 50 : 54 }, { x: X(v), y: unite ? 70 : 66 }, `stroke-width="${unite ? 2 : 1.3}"`)
    if (unite) r += texte({ x: X(v), y: 92 }, etiquettes ? etiquettes(k / parts) : String(Math.round(v)).replace('-', '−'), 'font-size="22"')
  }
  for (const { x, lettre } of points) r += `<circle cx="${f2(X(x))}" cy="60" r="6" fill="#d0342c" stroke="none"/>` + nom({ x: X(x), y: 30 }, lettre, 24)
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
/** Un repère quadrillé (de −5 à 5), la droite (d) en pointillés (x = k pour
 *  un axe vertical, y = k pour un axe horizontal) et le point A */
export function symetriePoint(px: number, py: number, axe: 'vertical' | 'horizontal', k: number) {
  const n = 5, c = 24, O = { x: 20 + n * c, y: 20 + n * c }, T = 40 + 2 * n * c
  let r = ''
  for (let i = -n; i <= n; i++) {
    r += ligne({ x: O.x + i * c, y: 20 }, { x: O.x + i * c, y: T - 20 }, 'stroke="#9bb6dc" stroke-width="1"')
    r += ligne({ x: 20, y: O.y + i * c }, { x: T - 20, y: O.y + i * c }, 'stroke="#9bb6dc" stroke-width="1"')
  }
  r += ligne({ x: 14, y: O.y }, { x: T - 10, y: O.y }) + ligne({ x: O.x, y: T - 14 }, { x: O.x, y: 10 })
  r += `<path d="M${T - 18} ${O.y - 6}L${T - 10} ${O.y}L${T - 18} ${O.y + 6}M${O.x - 6} 18L${O.x} 10L${O.x + 6} 18"/>`
  r += texte({ x: O.x - 10, y: O.y + 14 }, '0', 'font-size="14"') + texte({ x: O.x + c, y: O.y + 14 }, '1', 'font-size="14"') + texte({ x: O.x - 12, y: O.y - c }, '1', 'font-size="14"')
  if (axe === 'vertical') {
    const x = O.x + k * c
    r += ligne({ x, y: 14 }, { x, y: T - 14 }, 'stroke="#1f5fbf" stroke-width="2.6" stroke-dasharray="8 5"') + nom({ x: x + 20, y: 30 }, '(d)', 19)
  } else {
    const y = O.y - k * c
    r += ligne({ x: 14, y }, { x: T - 14, y }, 'stroke="#1f5fbf" stroke-width="2.6" stroke-dasharray="8 5"') + nom({ x: T - 34, y: y - 14 }, '(d)', 19)
  }
  const A = { x: O.x + px * c, y: O.y - py * c }
  r += `<circle cx="${A.x}" cy="${A.y}" r="5" fill="#d0342c" stroke="none"/>` + nom({ x: A.x + 12, y: A.y - 12 }, 'A', 19)
  return svg(T, T, r)
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

// ---------- Patrons de cube ----------
export type Cases = [number, number][]
/** On replie le patron en faisant rouler un dé sur ses cases : la face
 *  du cube (B, H, N, S, E, O) qui revient à chaque case, ou null si deux
 *  cases tombent sur la même face (ce n'est pas un patron de cube) */
export function plierPatron(cases: Cases): Map<string, string> | null {
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
  return vues.size === 6 && new Set(vues.values()).size === 6 ? vues : null
}
/** Le patron se replie-t-il en cube ? */
export const estPatronDeCube = (cases: Cases): boolean => plierPatron(cases) !== null
/** Dans un patron de cube, la case opposée à la case i (son indice) */
export function caseOpposee(cases: Cases, i: number): number {
  const faces = plierPatron(cases)
  if (!faces) return -1
  const OPPOSEE: Record<string, string> = { B: 'H', H: 'B', N: 'S', S: 'N', E: 'O', O: 'E' }
  const f = OPPOSEE[faces.get(cases[i].join(','))!]
  return cases.findIndex(c => faces.get(c.join(',')) === f)
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
/** Un patron ; numeros : le numéro écrit dans chaque case (dans l'ordre des cases) */
export function patron(cases: Cases, numeros?: number[]) {
  const c = numeros ? 34 : 24, L = Math.max(...cases.map(q => q[0])) + 1, H = Math.max(...cases.map(q => q[1])) + 1
  return svg(8 + L * c, 8 + H * c, cases.map(([x, y], i) => `<rect x="${4 + x * c}" y="${4 + y * c}" width="${c}" height="${c}" fill="#e8eef8" stroke-width="1.6"/>`
    + (numeros ? texte({ x: 4 + x * c + c / 2, y: 4 + y * c + c / 2 + 1 }, String(numeros[i]), 'font-size="18"') : '')).join(''), numeros ? 'fig' : 'fig fig-petite')
}

// ---------- Perspective cavalière ----------
/** Un pavé droit ABCDEFGH en perspective cavalière (face avant ABCD, A en
 *  bas à gauche ; EFGH derrière), avec la longueur de [AB], [BC] et [BF]
 *  écrite à côté (en cm) */
export function paveCote(l: number, h: number, p: number) {
  const k = 0.5, s = 30
  const d = { x: p * k * s * Math.SQRT1_2, y: -p * k * s * Math.SQRT1_2 }
  const A = { x: 0, y: 0 }, B = { x: l * s, y: 0 }, C = { x: l * s, y: -h * s }, D = { x: 0, y: -h * s }
  const plus = (q: P, v: P) => ({ x: q.x + v.x, y: q.y + v.y })
  const E = plus(A, d), F = plus(B, d), G = plus(C, d), H = plus(D, d)
  const cache = 'stroke-dasharray="6 5"'
  let r = poly([A, B, C, D]) + ligne(B, F) + ligne(C, G) + ligne(D, H) + ligne(F, G) + ligne(G, H)
    + ligne(A, E, cache) + ligne(E, F, cache) + ligne(E, H, cache)
  const sommets: [P, string][] = [[A, 'A'], [B, 'B'], [C, 'C'], [D, 'D'], [E, 'E'], [F, 'F'], [G, 'G'], [H, 'H']]
  const c = centre(sommets.map(([q]) => q))
  r += sommets.map(([q, t]) => nomDehors(q, c, t)).join('')
  const cm = (v: number) => `${v} cm`
  r += texte({ x: l * s / 2, y: 22 }, cm(l), 'font-size="16"')
  r += texte({ x: -30, y: -h * s / 2 }, cm(h), 'font-size="16"')
  r += `<text x="${f2(B.x + d.x / 2 + 14)}" y="${f2(B.y + d.y / 2 + 8)}" fill="currentColor" stroke="none" dominant-baseline="middle" font-size="16">${cm(p)}</text>`
  return cadre([A, B, C, D, E, F, G, H, { x: B.x + d.x / 2 + 70, y: 0 }, { x: -62, y: 0 }], r, 30)
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

// ---------- Deux figures symétriques (ou non) ----------
/** Un triangle ABC et son image A'B'C' par une symétrie axiale (axe
 *  vertical ou horizontal) ou centrale. Ni l'axe ni le centre ne sont
 *  tracés. Le triangle est quelconque (aucun côté égal), pour que le miroir
 *  ne puisse pas se confondre avec le demi-tour. */
export function deuxFiguresSymetriques(sorte: 'axiale' | 'centrale') {
  const L = 540, H = 240
  const alea = (a: number, b: number) => a + Math.random() * (b - a)
  const vertical = sorte === 'centrale' || Math.random() < 0.65
  let A: P, B: P, C: P
  for (;;) {
    const zone = sorte === 'axiale' && !vertical ? { x: [60, 480], y: [20, 100] } : { x: [40, 230], y: [30, 210] }
    ;[A, B, C] = [0, 1, 2].map(() => ({ x: Math.round(alea(zone.x[0], zone.x[1])), y: Math.round(alea(zone.y[0], zone.y[1])) }))
    const c = [dist(A, B), dist(B, C), dist(C, A)]
    const aire = Math.abs((B.x - A.x) * (C.y - A.y) - (C.x - A.x) * (B.y - A.y)) / 2
    const etendue = Math.max(A.x, B.x, C.x) - Math.min(A.x, B.x, C.x)
    const ok = aire >= 3200 && Math.min(...c) >= 60 && Math.abs(c[0] - c[1]) > 18 && Math.abs(c[1] - c[2]) > 18 && Math.abs(c[2] - c[0]) > 18 && (vertical || etendue <= 250)
    if (ok) break
  }
  const image = (q: P): P => sorte === 'centrale' ? { x: L - q.x, y: H - q.y } : (vertical ? { x: L - q.x, y: q.y } : { x: q.x, y: H - q.y })
  const dessin = (t: P[], suffixe: string, couleur: string) => {
    const g = { x: (t[0].x + t[1].x + t[2].x) / 3, y: (t[0].y + t[1].y + t[2].y) / 3 }
    return poly(t, `stroke="${couleur}" stroke-width="2.4"`) + t.map((q, i) => {
      const d = dist(q, g) || 1
      return nom({ x: q.x + (q.x - g.x) / d * 17, y: q.y + (q.y - g.y) / d * 17 }, 'ABC'[i] + suffixe, 22)
    }).join('')
  }
  return svg(L, H, dessin([A, B, C], '', 'currentColor') + dessin([A, B, C].map(image), '′', '#1f5fbf'))
}

// =============================================================
// LES FIGURES DE 4e
// =============================================================

// ---------- Repère à plusieurs points ----------
/** Un repère quadrillé (de −5 à 5) et des points nommés ; un point
 *  `centre: true` est marqué d'une croix (le centre d'un demi-tour) */
export function reperePoints(pts: { x: number; y: number; nom: string; centre?: boolean }[]) {
  const n = 5, c = 24, O = { x: 20 + n * c, y: 20 + n * c }, T = 40 + 2 * n * c
  let r = ''
  for (let i = -n; i <= n; i++) {
    r += ligne({ x: O.x + i * c, y: 20 }, { x: O.x + i * c, y: T - 20 }, 'stroke="#9bb6dc" stroke-width="1"')
    r += ligne({ x: 20, y: O.y + i * c }, { x: T - 20, y: O.y + i * c }, 'stroke="#9bb6dc" stroke-width="1"')
  }
  r += ligne({ x: 14, y: O.y }, { x: T - 10, y: O.y }) + ligne({ x: O.x, y: T - 14 }, { x: O.x, y: 10 })
  r += `<path d="M${T - 18} ${O.y - 6}L${T - 10} ${O.y}L${T - 18} ${O.y + 6}M${O.x - 6} 18L${O.x} 10L${O.x + 6} 18"/>`
  r += texte({ x: O.x - 10, y: O.y + 14 }, '0', 'font-size="14"') + texte({ x: O.x + c, y: O.y + 14 }, '1', 'font-size="14"') + texte({ x: O.x - 12, y: O.y - c }, '1', 'font-size="14"')
  for (const q of pts) {
    const A = { x: O.x + q.x * c, y: O.y - q.y * c }
    r += q.centre ? `<path d="M${A.x - 6} ${A.y - 6}L${A.x + 6} ${A.y + 6}M${A.x + 6} ${A.y - 6}L${A.x - 6} ${A.y + 6}" stroke="#1f5fbf" stroke-width="2.6"/>`
      : `<circle cx="${A.x}" cy="${A.y}" r="5" fill="#d0342c" stroke="none"/>`
    r += nom({ x: A.x + 12, y: A.y - 12 }, q.nom, 19)
  }
  return svg(T, T, r)
}

// ---------- Quadrilatère et ses diagonales codées ----------
/** Un quadrilatère dessiné par ses diagonales, qui se coupent en leur
 *  milieu : codées de même longueur (`egales`) et/ou perpendiculaires
 *  (`perp`) ; les côtés ne sont pas codés */
export function diagonalesCodees(egales: boolean, perp: boolean, noms: string, tourne = 0) {
  const c = { x: 0, y: 0 }, a = 110, b = egales ? 110 : 62, t = perp ? 90 : 58
  const u = { x: 1, y: 0 }, v = { x: Math.cos(t * Math.PI / 180), y: -Math.sin(t * Math.PI / 180) }
  let p = [{ x: a * u.x, y: a * u.y }, { x: b * v.x, y: b * v.y }, { x: -a * u.x, y: -a * u.y }, { x: -b * v.x, y: -b * v.y }]
  p = tourner(p, c, tourne)
  const [A, B, C, D] = p
  let r = poly(p) + ligne(A, C, 'stroke="#1f5fbf"') + ligne(B, D, 'stroke="#1f5fbf"')
  const n2 = egales ? 1 : 2
  r += traits(A, c, 1) + traits(c, C, 1) + traits(B, c, n2) + traits(c, D, n2)
  if (perp) r += angleDroit(A, c, B, 11)
  r += p.map((q, i) => nomDehors(q, c, noms[i])).join('') + nom({ x: c.x + 4, y: c.y + 22 }, 'O', 17)
  return cadre(p, r, 34)
}

// ---------- Droites remarquables d'un triangle ----------
export type Remarquable = 'mediatrice' | 'mediane' | 'hauteur' | 'bissectrice'
/** Un triangle ABC (quelconque) et une droite (d) codée : la médiatrice
 *  de [BC], ou la médiane, la hauteur, la bissectrice issues de A */
export function droiteRemarquable(sorte: Remarquable, noms: string, tourne = 0) {
  let A = { x: 95, y: 30 }, B = { x: 30, y: 200 }, C = { x: 290, y: 200 }
  ;[A, B, C] = tourner([A, B, C], { x: 140, y: 140 }, tourne)
  const M = milieu(B, C), bc = { x: (C.x - B.x) / dist(B, C), y: (C.y - B.y) / dist(B, C) }
  let p1: P, p2: P, code = ''
  const prolonger = (a: P, b: P, avant: number, apres: number): [P, P] => {
    const l = dist(a, b), w = { x: (b.x - a.x) / l, y: (b.y - a.y) / l }
    return [{ x: a.x - w.x * avant, y: a.y - w.y * avant }, { x: b.x + w.x * apres, y: b.y + w.y * apres }]
  }
  if (sorte === 'mediatrice') {
    let n = { x: -bc.y, y: bc.x }
    if (n.x * (A.x - M.x) + n.y * (A.y - M.y) < 0) n = { x: -n.x, y: -n.y }
    ;[p1, p2] = [{ x: M.x + n.x * 120, y: M.y + n.y * 120 }, { x: M.x - n.x * 50, y: M.y - n.y * 50 }]
    code = traits(B, M, 1) + traits(M, C, 1) + angleDroit(C, M, p1, 11)
  } else if (sorte === 'mediane') {
    ;[p1, p2] = prolonger(A, M, 30, 40)
    code = traits(B, M, 1) + traits(M, C, 1)
  } else if (sorte === 'hauteur') {
    const k = (A.x - B.x) * bc.x + (A.y - B.y) * bc.y, H = { x: B.x + bc.x * k, y: B.y + bc.y * k }
    ;[p1, p2] = prolonger(A, H, 30, 40)
    code = angleDroit(C, H, A, 11)
  } else {
    const ab = { x: (B.x - A.x) / dist(A, B), y: (B.y - A.y) / dist(A, B) }, ac = { x: (C.x - A.x) / dist(A, C), y: (C.y - A.y) / dist(A, C) }
    const w = { x: ab.x + ac.x, y: ab.y + ac.y }, l = Math.hypot(w.x, w.y), Q = { x: A.x + w.x / l * 200, y: A.y + w.y / l * 200 }
    ;[p1, p2] = prolonger(A, Q, 30, 0)
    // Deux arcs de même rayon, chacun barré d'un petit trait en son milieu
    const bis = { x: w.x / l, y: w.y / l }
    const tic = (v: P) => { const m = { x: (v.x + bis.x) / 2, y: (v.y + bis.y) / 2 }, k = Math.hypot(m.x, m.y); return ligne({ x: A.x + m.x / k * 33, y: A.y + m.y / k * 33 }, { x: A.x + m.x / k * 47, y: A.y + m.y / k * 47 }, 'stroke-width="1.8"') }
    code = arcAngle(A, B, Q, 40) + arcAngle(A, Q, C, 40) + tic(ab) + tic(ac)
  }
  const c = centre([A, B, C])
  let r = poly([A, B, C]) + ligne(p1, p2, 'stroke="#1f5fbf" stroke-width="2.4"') + code
  r += nomDehors(A, c, noms[0]) + nomDehors(B, c, noms[1]) + nomDehors(C, c, noms[2])
  const e = { x: p1.x + (p2.x - p1.x) * 0.93, y: p1.y + (p2.y - p1.y) * 0.93 }
  r += nom({ x: e.x + 20, y: e.y }, '(d)', 17)
  return cadre([A, B, C, p1, p2], r, 30)
}

// ---------- Le losange de seize triangles ----------
/** Les neuf points du losange de seize triangles rectangles isocèles,
 *  en unités : le centre, les quatre milieux (un carré) et les quatre
 *  sommets du losange. L'ordre est celui des noms passés à la figure. */
export const POINTS_LOSANGE: [number, number][] = [[0, 2], [-2, 0], [0, -2], [2, 0], [-1, 1], [-1, -1], [1, -1], [1, 1], [0, 0]]
/** Le losange découpé en seize triangles : ses diagonales, le carré des
 *  milieux de ses côtés et les diagonales de ce carré. `noms` donne les
 *  neuf lettres, dans l'ordre de POINTS_LOSANGE. */
export function losangeTriangles(noms: string[]) {
  const u = 52, P0 = POINTS_LOSANGE.map(([x, y]) => ({ x: x * u, y: -y * u }))
  const [A, B, C, D, E, F, G, H] = P0
  let r = poly([A, D, C, B]) + poly([E, H, G, F]) + ligne(A, C) + ligne(B, D) + ligne(E, G) + ligne(H, F)
  const c = { x: 0, y: 0 }
  r += P0.slice(0, 8).map((q, i) => nomDehors(q, c, noms[i])).join('')
  r += nom({ x: 17, y: -11 }, noms[8], 17)
  return cadre(P0, r, 26)
}

// ---------- La droite des milieux ----------
/** Un triangle, les milieux de deux côtés codés et reliés ; une longueur
 *  écrite sur un segment (`ecrite`), et un « ? » sur un autre (`cherchee`).
 *  Les segments : 'base' (le troisième côté), 'milieux' (le segment qui
 *  joint les milieux). */
export function droiteMilieux(noms: string, ecrite: { ou: 'base' | 'milieux'; t: string }, cherchee: 'base' | 'milieux', tourne = 0) {
  let A = { x: 110, y: 20 }, B = { x: 20, y: 190 }, C = { x: 300, y: 190 }
  ;[A, B, C] = tourner([A, B, C], { x: 140, y: 130 }, tourne)
  const I = milieu(A, B), J = milieu(A, C), c = centre([A, B, C])
  let r = poly([A, B, C]) + ligne(I, J, 'stroke="#1f5fbf" stroke-width="2.4"')
  r += traits(A, I, 1) + traits(I, B, 1) + traits(A, J, 2) + traits(J, C, 2)
  r += nomDehors(A, c, noms[0]) + nomDehors(B, c, noms[1]) + nomDehors(C, c, noms[2])
  r += nomDehors(I, c, noms[3]) + nomDehors(J, c, noms[4])
  // Une étiquette posée sous le segment (du côté opposé au sommet A pour la base)
  const etiquette = (ou: 'base' | 'milieux', t: string) => {
    const [p, q] = ou === 'base' ? [B, C] : [I, J], m = milieu(p, q), l = dist(p, q)
    let n = { x: -(q.y - p.y) / l, y: (q.x - p.x) / l }
    if (n.x * (A.x - m.x) + n.y * (A.y - m.y) > 0) n = { x: -n.x, y: -n.y }
    const d = ou === 'base' ? 18 : 16
    return texte({ x: m.x + n.x * d, y: m.y + n.y * d }, t, 'font-size="16"')
  }
  r += etiquette(ecrite.ou, ecrite.t) + etiquette(cherchee, '?')
  return cadre([A, B, C], r, 32)
}

// ---------- Solides en perspective cavalière ----------
/** Un prisme droit : sa face avant `avant` (en vraie grandeur), reculée
 *  de `d` ; les arêtes cachées en pointillés. Un cube et un pavé droit
 *  sont des prismes dont la face avant est un carré ou un rectangle. */
function prismeCavalier(avant: P[], d: P) {
  const n = avant.length, arriere = avant.map(q => ({ x: q.x + d.x, y: q.y + d.y }))
  // Le sens des sommets : la normale extérieure d'un côté, et les faces
  // latérales qui regardent vers le fond (du côté de d) sont vues
  const aire = avant.reduce((s, q, i) => { const r2 = avant[(i + 1) % n]; return s + q.x * r2.y - r2.x * q.y }, 0)
  const vue = avant.map((q, i) => {
    const r2 = avant[(i + 1) % n], e = { x: r2.x - q.x, y: r2.y - q.y }
    const nrm = aire > 0 ? { x: e.y, y: -e.x } : { x: -e.y, y: e.x }
    return nrm.x * d.x + nrm.y * d.y > 0
  })
  const cache = 'stroke-dasharray="6 5"'
  let r = poly(avant)
  for (let i = 0; i < n; i++) {
    r += ligne(arriere[i], arriere[(i + 1) % n], vue[i] ? '' : cache)
    r += ligne(avant[i], arriere[i], vue[i] || vue[(i + n - 1) % n] ? '' : cache)
  }
  return { r, pts: [...avant, ...arriere] }
}
export type Solide = 'cube' | 'pave' | 'cylindre' | 'prisme3' | 'prisme4' | 'prisme5' | 'prisme6' | 'pyramide' | 'cone'
/** Un solide usuel en perspective cavalière, sans nom de sommet */
export function solide(sorte: Solide) {
  const d = { x: 46, y: -40 }
  if (sorte === 'cylindre') {
    const rx = 60, ry = 18, h = 150, c1 = { x: 0, y: 0 }, c2 = { x: 0, y: -h }
    const r = `<ellipse cx="${c2.x}" cy="${c2.y}" rx="${rx}" ry="${ry}"/>` + ligne({ x: -rx, y: 0 }, { x: -rx, y: -h }) + ligne({ x: rx, y: 0 }, { x: rx, y: -h })
      + `<path d="M${-rx} 0A${rx} ${ry} 0 0 0 ${rx} 0"/><path d="M${-rx} 0A${rx} ${ry} 0 0 1 ${rx} 0" stroke-dasharray="6 5"/>`
    return cadre([{ x: -rx, y: ry }, { x: rx, y: -h - ry }, c1], r, 24)
  }
  if (sorte === 'cone') {
    // Un cône de révolution : la base en ellipse (moitié arrière en pointillés), le sommet au-dessus du centre
    const rx = 70, ry = 20, h = 160, S = { x: 0, y: -h }
    const r = ligne({ x: -rx, y: 0 }, S) + ligne({ x: rx, y: 0 }, S)
      + `<path d="M${-rx} 0A${rx} ${ry} 0 0 0 ${rx} 0"/><path d="M${-rx} 0A${rx} ${ry} 0 0 1 ${rx} 0" stroke-dasharray="6 5"/>`
    return cadre([{ x: -rx, y: ry }, { x: rx, y: -ry }, S], r, 24)
  }
  if (sorte === 'pyramide') {
    const base = [{ x: 0, y: 0 }, { x: 150, y: 0 }, { x: 150 + d.x, y: d.y }, { x: d.x, y: d.y }], S = { x: 75 + d.x / 2, y: -170 }
    const cache = 'stroke-dasharray="6 5"'
    const r = ligne(base[0], base[1]) + ligne(base[1], base[2]) + ligne(base[2], base[3], cache) + ligne(base[3], base[0], cache)
      + ligne(S, base[0]) + ligne(S, base[1]) + ligne(S, base[2]) + ligne(S, base[3], cache)
    return cadre([...base, S], r, 24)
  }
  let avant: P[]
  if (sorte === 'cube') avant = [{ x: 0, y: 0 }, { x: 130, y: 0 }, { x: 130, y: -130 }, { x: 0, y: -130 }]
  else if (sorte === 'pave') avant = [{ x: 0, y: 0 }, { x: 190, y: 0 }, { x: 190, y: -100 }, { x: 0, y: -100 }]
  else if (sorte === 'prisme4') avant = [{ x: 0, y: 0 }, { x: 170, y: 0 }, { x: 120, y: -90 }, { x: 30, y: -90 }]
  else {
    // Un triangle, un pentagone ou un hexagone réguliers, pointe en haut
    const n = Number(sorte.slice(-1)), R = 75
    avant = Array.from({ length: n }, (_, i) => ({ x: R * Math.cos((90 + 360 * i / n) * Math.PI / 180), y: -R * Math.sin((90 + 360 * i / n) * Math.PI / 180) }))
  }
  const { r, pts } = prismeCavalier(avant, sorte === 'pave' ? { x: 60, y: -52 } : d)
  return cadre(pts, r, 24)
}

// ---------- Deux parallèles et une sécante ----------
/** Deux droites parallèles (d) et (d') coupées par une sécante qui fait
 *  l'angle m (en degrés) avec elles. Autour de chaque point
 *  d'intersection, les secteurs 0 à 3 tournent dans le sens direct à
 *  partir de la droite, vers la droite : 0 et 2 mesurent m, 1 et 3
 *  mesurent 180 − m. L'angle connu (sa mesure écrite) est dans le
 *  secteur `haut` de (d) ou `bas` de (d'), selon `connuEnHaut` ; l'autre
 *  porte un point d'interrogation. */
export function parallelesSecante(m: number, haut: number, bas: number, connuEnHaut: boolean, valeur: number) {
  const y1 = 70, y2 = 170, I1 = { x: 190, y: y1 }, dx = (y2 - y1) / Math.tan(m * Math.PI / 180), I2 = { x: I1.x - dx, y: y2 }
  const L = 380
  let r = ligne({ x: 15, y: y1 }, { x: L - 15, y: y1 }) + ligne({ x: 15, y: y2 }, { x: L - 15, y: y2 })
  const u = { x: dx / Math.hypot(dx, y2 - y1), y: (y2 - y1) / Math.hypot(dx, y2 - y1) }
  r += ligne({ x: I1.x + u.x * 60, y: I1.y - u.y * 60 }, { x: I2.x - u.x * 60, y: I2.y + u.y * 60 })
  r += nom({ x: L - 22, y: y1 - 14 }, '(d)', 16) + nom({ x: L - 22, y: y2 - 14 }, "(d')", 16)
  // Les directions des bords d'un secteur, en degrés (sens direct)
  const bords = [[0, m], [m, 180], [180, 180 + m], [180 + m, 360]]
  const marque = (s: P, k: number, t: string, couleur: string) => {
    const [a1, a2] = bords[k], rr = 24
    const A = dir(s, a1, 1), C = dir(s, a2, 1), mi = (a1 + a2) / 2
    return arcAngle(s, A, C, rr).replace('stroke-width="1.6"', `stroke-width="2" stroke="${couleur}"`) + texte(dir(s, mi, rr + 22), t, `font-size="15" fill="${couleur}"`).replace('fill="currentColor" ', '')
  }
  const connu = `${valeur}°`
  r += marque(I1, haut, connuEnHaut ? connu : '?', connuEnHaut ? 'currentColor' : '#d0342c')
  r += marque(I2, bas, connuEnHaut ? '?' : connu, connuEnHaut ? '#d0342c' : 'currentColor')
  const xs = [15, L - 15, I1.x + u.x * 60, I2.x - u.x * 60]
  const g = Math.min(...xs) - 10, d = Math.max(...xs) + 10
  return svg(d - g, 240, `<g transform="translate(${f2(-g)} 0)">${r}</g>`)
}

// =============================================================
// LES FIGURES DE 2nde ET DE 1re
// Une courbe ou une droite dans un repère quadrillé, un diagramme en
// barres, un diagramme circulaire (ou semi-circulaire), des boîtes à
// moustaches, un arbre pondéré.
// =============================================================

/** Un texte, ses réglages donnés une seule fois (une couleur, un
 *  alignement à droite, une taille) */
const ecrit = (p: P, t: string, o: { taille?: number; couleur?: string; ancre?: 'start' | 'middle' | 'end'; italique?: boolean; gras?: boolean } = {}) =>
  `<text x="${f2(p.x)}" y="${f2(p.y)}" fill="${o.couleur ?? 'currentColor'}" stroke="none" text-anchor="${o.ancre ?? 'middle'}" dominant-baseline="middle" font-size="${o.taille ?? 14}"${o.italique ? ' font-style="italic"' : ''}${o.gras ? ' font-weight="bold"' : ''}>${t}</text>`
const ROUGE = '#d0342c'

/** Un repère quadrillé de xmin à xmax et de ymin à ymax (en carreaux),
 *  un carreau valant pasX et pasY ; X et Y placent un point */
function grilleRepere(xmin: number, xmax: number, ymin: number, ymax: number, c: number, pasX = 1, pasY = 1, toutGraduer = false) {
  const m = 26, X = (x: number) => m + (x / pasX - xmin) * c, Y = (y: number) => m + (ymax - y / pasY) * c
  const L = 2 * m + (xmax - xmin) * c, H = 2 * m + (ymax - ymin) * c
  let r = ''
  for (let i = xmin; i <= xmax; i++) r += ligne({ x: m + (i - xmin) * c, y: m }, { x: m + (i - xmin) * c, y: H - m }, 'stroke="#9bb6dc" stroke-width="1"')
  for (let j = ymin; j <= ymax; j++) r += ligne({ x: m, y: m + (ymax - j) * c }, { x: L - m, y: m + (ymax - j) * c }, 'stroke="#9bb6dc" stroke-width="1"')
  const O = { x: m - xmin * c, y: m + ymax * c }
  // Les axes (au bord quand 0 n'est pas dans la fenêtre)
  const ax = Math.min(Math.max(O.y, m), H - m), ay = Math.min(Math.max(O.x, m), L - m)
  r += ligne({ x: m - 8, y: ax }, { x: L - m + 14, y: ax }) + ligne({ x: ay, y: H - m + 8 }, { x: ay, y: m - 14 })
  r += `<path d="M${f2(L - m + 6)} ${f2(ax - 6)}L${f2(L - m + 14)} ${f2(ax)}L${f2(L - m + 6)} ${f2(ax + 6)}M${f2(ay - 6)} ${f2(m - 6)}L${f2(ay)} ${f2(m - 14)}L${f2(ay + 6)} ${f2(m - 6)}"/>`
  const ecrire = (v: number) => String(Math.round(v * 1000) / 1000).replace('-', '−').replace('.', ',')
  if (toutGraduer) {
    for (let i = xmin; i <= xmax; i++) if (i !== 0 || ay !== O.x) r += ecrit({ x: m + (i - xmin) * c, y: ax + 13 }, ecrire(i * pasX), { taille: 12 })
    for (let j = ymin; j <= ymax; j++) if (j !== 0 || ax !== O.y) r += ecrit({ x: ay - 6, y: m + (ymax - j) * c }, ecrire(j * pasY), { taille: 12, ancre: 'end' })
  } else {
    r += ecrit({ x: O.x - 9, y: O.y + 13 }, '0', { taille: 13 }) + ecrit({ x: O.x + c, y: O.y + 13 }, ecrire(pasX), { taille: 13 }) + ecrit({ x: O.x - 10, y: O.y - c }, ecrire(pasY), { taille: 13 })
  }
  return { r, X, Y, L, H, m }
}

/** Les pentes d'une interpolation qui ne dépasse jamais entre deux nœuds
 *  (Fritsch et Carlson) : la courbe monte ou descend d'un nœud à l'autre,
 *  sans bosse cachée, et ne prend les valeurs entières qu'aux nœuds ou
 *  entre deux nœuds qui les encadrent. */
function pentesMonotones(p: P[]): number[] {
  const n = p.length, d = p.slice(1).map((q, i) => (q.y - p[i].y) / (q.x - p[i].x))
  const t = p.map((_, i) => i === 0 ? d[0] : i === n - 1 ? d[n - 2] : d[i - 1] * d[i] <= 0 ? 0 : (d[i - 1] + d[i]) / 2)
  for (let i = 0; i < n - 1; i++) {
    if (d[i] === 0) { t[i] = 0; t[i + 1] = 0; continue }
    const a = t[i] / d[i], b = t[i + 1] / d[i], s = a * a + b * b
    if (s > 9) { const k = 3 / Math.sqrt(s); t[i] = k * a * d[i]; t[i + 1] = k * b * d[i] }
  }
  return t
}

/** La courbe d'une fonction qui passe par les nœuds (abscisses entières,
 *  ordonnées entières), dans un repère quadrillé ; son nom à côté */
export function courbeFonction(noeuds: P[], nomCourbe = 'f', fenetre?: { ymin: number; ymax: number }) {
  const xmin = Math.min(...noeuds.map(q => q.x)) - 1, xmax = Math.max(...noeuds.map(q => q.x)) + 1
  const ymin = fenetre?.ymin ?? Math.min(-1, ...noeuds.map(q => q.y)) - 1, ymax = fenetre?.ymax ?? Math.max(1, ...noeuds.map(q => q.y)) + 1
  const g = grilleRepere(xmin, xmax, ymin, ymax, 22)
  const t = pentesMonotones(noeuds)
  let d = `M${f2(g.X(noeuds[0].x))} ${f2(g.Y(noeuds[0].y))}`
  for (let i = 0; i < noeuds.length - 1; i++) {
    const a = noeuds[i], b = noeuds[i + 1], h = b.x - a.x
    d += `C${f2(g.X(a.x + h / 3))} ${f2(g.Y(a.y + t[i] * h / 3))} ${f2(g.X(b.x - h / 3))} ${f2(g.Y(b.y - t[i + 1] * h / 3))} ${f2(g.X(b.x))} ${f2(g.Y(b.y))}`
  }
  let r = g.r + `<path d="${d}" stroke="${ROUGE}" stroke-width="2.6"/>`
  for (const q of [noeuds[0], noeuds[noeuds.length - 1]]) r += `<circle cx="${f2(g.X(q.x))}" cy="${f2(g.Y(q.y))}" r="3.5" fill="${ROUGE}" stroke="none"/>`
  const fin = noeuds[noeuds.length - 1]
  const dy = fin.y > (ymin + ymax) / 2 ? 16 : -16
  r += ecrit({ x: g.X(fin.x) + 12, y: g.Y(fin.y) + dy }, 'C', { taille: 18, couleur: ROUGE, italique: true }) + ecrit({ x: g.X(fin.x) + 21, y: g.Y(fin.y) + dy + 6 }, nomCourbe, { taille: 12, couleur: ROUGE, italique: true })
  return svg(g.L, g.H, r)
}

/** La droite y = m x + p dans un repère quadrillé (de −5 à 5), son nom à côté */
export function droiteRepere(m: number, p: number, nomDroite = '(d)') {
  const g = grilleRepere(-5, 5, -5, 5, 22)
  // Les deux bouts : là où la droite sort du carré [−5,5]²
  const pts: P[] = []
  for (const x of [-5, 5]) { const y = m * x + p; if (y >= -5 && y <= 5) pts.push({ x, y }) }
  for (const y of [-5, 5]) { if (m !== 0) { const x = (y - p) / m; if (x > -5 && x < 5) pts.push({ x, y }) } }
  pts.sort((a, b) => a.x - b.x)
  const [a, b] = [pts[0], pts[pts.length - 1]]
  let r = g.r + ligne({ x: g.X(a.x), y: g.Y(a.y) }, { x: g.X(b.x), y: g.Y(b.y) }, `stroke="${ROUGE}" stroke-width="2.6"`)
  const e = { x: a.x + (b.x - a.x) * 0.82, y: a.y + (b.y - a.y) * 0.82 }
  r += ecrit({ x: g.X(e.x) + 22, y: g.Y(e.y) + 4 }, nomDroite, { taille: 16, couleur: ROUGE, italique: true })
  return svg(g.L, g.H, r)
}

/** Une courbe de données : une valeur par graduation de l'axe des
 *  abscisses (debutX, debutX + pasX…), l'axe des ordonnées gradué de pasY
 *  en pasY ; les élèves lisent les échelles. `nuage` : les points seuls. */
export function courbeDonnees(valeurs: number[], pasY: number, debutX: number, pasX: number, nuage = false) {
  const n = valeurs.length, ymax = Math.ceil(Math.max(...valeurs) / pasY) + 1, c = 26, cx = 40
  const g = grilleRepere(0, n, 0, ymax, c, pasX, pasY, true)
  // Les abscisses sont plus espacées que les ordonnées (des années tiennent sous l'axe) : on étire le dessin
  const etire = (t: string) => t.replace(/ (x1|x2|x|cx)="([-\d.]+)"/g, (_, k, v) => ` ${k}="${f2(g.m + (Number(v) - g.m) * cx / c)}"`)
  // L'axe des abscisses gradué à partir de debutX : on réécrit ses étiquettes
  let r = g.r.replace(/<text[^>]*text-anchor="middle"[^>]*font-size="12"[^>]*>[^<]*<\/text>/g, '')
  // La flèche de l'axe des abscisses se dessine à la main, après l'étirement
  r = etire(r.replace(/<path d="M[^"]*"\/>/, ''))
  const Lx = g.m * 2 + n * cx
  r += `<path d="M${f2(Lx - g.m + 6)} ${f2(g.H - g.m - 6)}L${f2(Lx - g.m + 14)} ${f2(g.H - g.m)}L${f2(Lx - g.m + 6)} ${f2(g.H - g.m + 6)}M${f2(g.m - 6)} ${f2(g.m - 6)}L${f2(g.m)} ${f2(g.m - 14)}L${f2(g.m + 6)} ${f2(g.m - 6)}"/>`
  for (let i = 1; i <= n; i++) r += ecrit({ x: g.m + i * cx, y: g.H - g.m + 14 }, String(Math.round((debutX + (i - 1) * pasX) * 1000) / 1000).replace('.', ','), { taille: 13 })
  r += ecrit({ x: g.m - 6, y: g.H - g.m }, '0', { taille: 12, ancre: 'end' })
  const pts = valeurs.map((v, i) => ({ x: g.m + (i + 1) * cx, y: g.Y(v) }))
  if (!nuage) r += `<polyline points="${pts.map(q => `${f2(q.x)},${f2(q.y)}`).join(' ')}" stroke="${ROUGE}" stroke-width="2.4"/>`
  for (const q of pts) r += `<circle cx="${f2(q.x)}" cy="${f2(q.y)}" r="3.8" fill="${ROUGE}" stroke="none"/>`
  return svg(Lx + 6, g.H, r)
}

/** Un diagramme en barres : une barre par étiquette, l'axe gradué de pas en pas */
export function diagrammeBarres(etiquettes: string[], valeurs: number[], pas: number) {
  const n = etiquettes.length, haut = Math.ceil(Math.max(...valeurs) / pas) + 1, c = 26, m = 34, lb = 40
  const L = m + 20 + n * (lb + 14) + 10, H = 2 * m + haut * c
  const Y = (v: number) => m + (haut - v / pas) * c
  let r = ''
  for (let j = 0; j <= haut; j++) {
    r += ligne({ x: m, y: m + (haut - j) * c }, { x: L - 10, y: m + (haut - j) * c }, 'stroke="#9bb6dc" stroke-width="1"')
    r += ecrit({ x: m - 6, y: m + (haut - j) * c }, String(j * pas).replace('.', ','), { taille: 12, ancre: 'end' })
  }
  r += ligne({ x: m, y: H - m }, { x: L - 10, y: H - m }) + ligne({ x: m, y: H - m }, { x: m, y: m - 12 })
  etiquettes.forEach((e, i) => {
    const x = m + 20 + i * (lb + 14)
    r += `<rect x="${f2(x)}" y="${f2(Y(valeurs[i]))}" width="${lb}" height="${f2(H - m - Y(valeurs[i]))}" fill="#9bb6dc" fill-opacity="0.55" stroke="#1f5fbf"/>`
    r += ecrit({ x: x + lb / 2, y: H - m + 15 }, e, { taille: 13 })
  })
  return svg(L, H, r)
}

/** Un diagramme circulaire (ou semi-circulaire) : des secteurs, chacun
 *  avec son nom et son angle */
export function diagrammeCirculaire(parts: { nom: string; angle: number }[], demi = false) {
  const R = 100, C = { x: 150, y: demi ? 130 : 135 }
  const couleurs = ['#9bb6dc', '#f2c27b', '#a8d5b5', '#e8a3a0', '#c9b6e4', '#f0e08a']
  let r = '', a0 = 180
  parts.forEach((p, i) => {
    // Les angles tournent dans le sens des aiguilles d'une montre, à partir de la gauche
    const a1 = a0 - p.angle, rad = (a: number) => a * Math.PI / 180
    const A = { x: C.x + R * Math.cos(rad(a0)), y: C.y - R * Math.sin(rad(a0)) }, B = { x: C.x + R * Math.cos(rad(a1)), y: C.y - R * Math.sin(rad(a1)) }
    r += `<path d="M${C.x} ${C.y}L${f2(A.x)} ${f2(A.y)}A${R} ${R} 0 ${p.angle > 180 ? 1 : 0} 1 ${f2(B.x)} ${f2(B.y)}Z" fill="${couleurs[i % couleurs.length]}" stroke="#1b2433" stroke-width="1.4"/>`
    const am = rad((a0 + a1) / 2)
    r += ecrit({ x: C.x + R * 0.62 * Math.cos(am), y: C.y - R * 0.62 * Math.sin(am) - 7 }, p.nom, { taille: 13, couleur: '#1b2433' })
    r += ecrit({ x: C.x + R * 0.62 * Math.cos(am), y: C.y - R * 0.62 * Math.sin(am) + 9 }, `${String(p.angle).replace('.', ',')}°`, { taille: 12, couleur: '#1b2433' })
    a0 = a1
  })
  return svg(300, demi ? 150 : 270, r)
}

/** Des boîtes à moustaches au-dessus d'un axe gradué de debut à fin, de pas en pas */
export function boitesMoustaches(series: { nom: string; v: [number, number, number, number, number] }[], debut: number, fin: number, pas: number) {
  const n = Math.round((fin - debut) / pas), c = Math.min(34, 380 / n), m = 40, L = 2 * m + n * c + 20
  const X = (v: number) => m + 20 + (v - debut) / pas * c, H = 30 + series.length * 54 + 40
  let r = ''
  for (let i = 0; i <= n; i++) {
    const x = m + 20 + i * c
    r += ligne({ x, y: 20 }, { x, y: H - 34 }, 'stroke="#9bb6dc" stroke-width="1"') + ligne({ x, y: H - 38 }, { x, y: H - 30 })
    r += ecrit({ x, y: H - 16 }, String(Math.round((debut + i * pas) * 1000) / 1000).replace('.', ','), { taille: 14 })
  }
  r += ligne({ x: m + 10, y: H - 34 }, { x: L - 10, y: H - 34 })
  series.forEach((s, k) => {
    const y = 34 + k * 54, [a, q1, me, q3, b] = s.v
    r += ligne({ x: X(a), y: y + 16 }, { x: X(q1), y: y + 16 }) + ligne({ x: X(q3), y: y + 16 }, { x: X(b), y: y + 16 })
    r += ligne({ x: X(a), y: y + 8 }, { x: X(a), y: y + 24 }) + ligne({ x: X(b), y: y + 8 }, { x: X(b), y: y + 24 })
    r += `<rect x="${f2(X(q1))}" y="${y}" width="${f2(X(q3) - X(q1))}" height="32" fill="#9bb6dc" fill-opacity="0.45" stroke="#1f5fbf"/>`
    r += ligne({ x: X(me), y }, { x: X(me), y: y + 32 }, `stroke="${ROUGE}" stroke-width="2.6"`)
    r += ecrit({ x: m - 4, y: y + 16 }, s.nom, { taille: 14, gras: true })
  })
  return svg(L, H, r)
}

/** Un arbre pondéré à deux niveaux : A et son contraire, puis B et son
 *  contraire ; une probabilité vide (null) s'écrit « ? » */
export function arbrePondere(n1: [string, string], n2: [string, string], p: { a: string | null; ab: string | null; aBarreB: string | null; aB2?: string | null; aBarreB2?: string | null; aBarre?: string | null }) {
  const R = { x: 20, y: 130 }, A = { x: 150, y: 60 }, Ab = { x: 150, y: 200 }
  const f = [{ x: 290, y: 25 }, { x: 290, y: 95 }, { x: 290, y: 165 }, { x: 290, y: 235 }]
  // Les probabilités arrivent écrites pour KaTeX (0{,}3) : on les remet en texte
  const proba = (a: P, b: P, t: string | null | undefined, haut: boolean) => ecrit({ x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 + (haut ? -12 : 14) }, (t ?? '').replace('{,}', ','), { taille: 15 })
  // Un nom précédé de ¬ est l'évènement contraire : une barre au-dessus
  const evt = (q: P, t: string) => ecrit(q, t.replace(/^¬/, ''), { taille: 18, italique: true }) + (t.startsWith('¬') ? ligne({ x: q.x - 6, y: q.y - 13 }, { x: q.x + 8, y: q.y - 13 }, 'stroke-width="1.5"') : '')
  let r = ligne(R, { x: A.x - 16, y: A.y }) + ligne(R, { x: Ab.x - 16, y: Ab.y })
  r += proba(R, A, p.a, true) + proba(R, Ab, p.aBarre, false)
  r += evt(A, n1[0]) + evt(Ab, n1[1])
  const feuilles: [P, P, string | null | undefined, boolean, string][] = [
    [A, f[0], p.ab, true, n2[0]], [A, f[1], p.aB2, false, n2[1]], [Ab, f[2], p.aBarreB, true, n2[0]], [Ab, f[3], p.aBarreB2, false, n2[1]],
  ]
  for (const [d, e, t, haut, nm] of feuilles) {
    r += ligne({ x: d.x + 16, y: d.y }, { x: e.x - 16, y: e.y }) + proba({ x: d.x + 16, y: d.y }, { x: e.x - 16, y: e.y }, t, haut)
    r += evt(e, nm)
  }
  return svg(320, 260, r)
}
