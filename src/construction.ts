// =============================================================
// LES CONSTRUCTIONS : DU PROGRAMME AUX GESTES
// On écrit le programme comme dans un manuel, une consigne par ligne :
//   « Trace un segment [AB] de 6 cm. »
//   « Trace la médiatrice de [AB]. »
// Chaque consigne devient une ou plusieurs ÉTAPES, et chaque étape une
// suite de GESTES d'instrument : la règle qu'on couche, le compas qu'on
// écarte puis qu'on tourne, l'équerre qu'on pose sur la droite. C'est
// le geste du tableau, que le lecteur rejoue avec ou sans les instruments.
//
// Les points déjà nommés sur la page (ou dans les lignes précédentes)
// servent : « Trace la perpendiculaire à (AB) passant par C » marche sur
// une figure déjà là.
// =============================================================
import { CM } from './types'

export type P = { x: number; y: number }

/** Un geste. « aide » : un trait de construction, fin et gris, qu'on garde */
export type Geste =
  | { k: 'point'; nom: string; p: P }
  | { k: 'regle'; a: P; b: P; aide?: boolean }
  | { k: 'compas'; c: P; r: number; a0: number; a1: number; aide?: boolean }
  | { k: 'equerre'; o: P; w: P; a: P; b: P; aide?: boolean }   // angle droit en o ; on trace [ab] le long de w
  | { k: 'rapporteur'; o: P; u: P; angle: number; marque: P }

export interface Etape { consigne: string; gestes: Geste[] }
export interface Programme { etapes: Etape[]; erreurs: string[] }

// ---------- Géométrie ----------
const dist = (a: P, b: P) => Math.hypot(a.x - b.x, a.y - b.y)
const plus = (a: P, u: P, k = 1): P => ({ x: a.x + u.x * k, y: a.y + u.y * k })
const unit = (a: P, b: P): P => { const l = dist(a, b) || 1; return { x: (b.x - a.x) / l, y: (b.y - a.y) / l } }
const milieu = (a: P, b: P): P => ({ x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 })
const ang = (c: P, p: P) => Math.atan2(p.y - c.y, p.x - c.x)
const DEG = Math.PI / 180

/** Les deux points communs à deux cercles (ou aucun) */
function intersectionCercles(c1: P, r1: number, c2: P, r2: number): [P, P] | null {
  const d = dist(c1, c2)
  if (d < 1e-9 || d > r1 + r2 + 1e-6 || d < Math.abs(r1 - r2) - 1e-6) return null
  const a = (r1 * r1 - r2 * r2 + d * d) / (2 * d)
  const h = Math.sqrt(Math.max(0, r1 * r1 - a * a))
  const u = unit(c1, c2), m = plus(c1, u, a)
  return [{ x: m.x + u.y * h, y: m.y - u.x * h }, { x: m.x - u.y * h, y: m.y + u.x * h }]
}

/** Le pied de la perpendiculaire à (ab) passant par p */
function projete(p: P, a: P, b: P): P {
  const u = unit(a, b), t = (p.x - a.x) * u.x + (p.y - a.y) * u.y
  return plus(a, u, t)
}

/** Un arc de compas court, centré sur la direction de `vers` : la trace qu'on
 *  laisse au compas quand on cherche un point, pas un cercle entier */
function arcVers(c: P, r: number, vers: P, demi = 22 * DEG, aide = true): Geste {
  const a = ang(c, vers)
  return { k: 'compas', c, r, a0: a - demi, a1: a + demi, aide }
}

// ---------- Lecture des phrases ----------
const NOM = "[A-Z](?:'|\\d)?"
const NOMBRE = '(\\d+(?:[.,]\\d+)?)'
const lireNombre = (t: string) => Number(t.replace(',', '.'))
const cmTexte = (v: number) => String(Math.round(v * 100) / 100).replace('.', ',') + ' cm'

/** Découpe « AB » en ["A", "B"] (gère A', B1…) */
function noms(t: string): string[] {
  return t.match(new RegExp(NOM, 'g')) ?? []
}

/**
 * Remet une phrase dans la forme que lit le compilateur. Un énoncé dit la
 * même chose de vingt façons — « segment AB de longueur 6 cm », « le segment
 * [AB] mesurant 6cm », « un segment [AB] tel que AB = 6 cm » — et chacune doit
 * marcher. Les noms de points restent en majuscules : ce sont eux qui disent
 * ce qui est un point (« de » n'est pas le segment [DE]).
 */
export function normaliser(t: string) {
  const N = "[A-Z](?:'|\\d)?"
  let l = t.trim().replace(/[.;!]+$/, '').replace(/\s+/g, ' ').replace(/[’‘]/g, "'").replace(/\u00a0/g, ' ')
  l = l.charAt(0).toLowerCase() + l.slice(1)                     // « Trace » comme « trace »
  const r = (re: RegExp, par: string) => { l = l.replace(re, par) }
  // Les unités
  r(/(\d+(?:[.,]\d+)?)\s*(?:cm|centim[èe]tres?)\b/g, '$1 cm')
  r(/(\d+(?:[.,]\d+)?)\s*(?:°|degr[ée]s?)/g, '$1°')
  r(/\s*=\s*/g, ' = ')
  // Les longueurs : « de longueur 6 cm », « mesurant 6 cm », « 6 cm de long »…
  r(/\b(?:d'une longueur de|de longueur|longueur|qui mesure|mesurant|long de|de mesure)\s+(\d)/g, 'de $1')
  r(/\b(\d+(?:[.,]\d+)?) cm de long(?:ueur)?\b/g, '$1 cm')
  r(/\b(?:de |d')?(\d+(?:[.,]\d+)?) cm de rayon\b/g, 'de rayon $1 cm')
  r(/\bde rayon (?:égal à |de )?(\d)/g, 'de rayon $1')
  r(/\b(?:de |d')?(\d+(?:[.,]\d+)?) cm de c[ôo]t[ée]\b/g, 'de côté $1 cm')
  r(/\bde (?:mesure )?(\d+(?:[.,]\d+)?)°/g, 'de $1°')
  // « segment AB » → « segment [AB] » ; « tel que AB = 6 cm » pour un segment
  r(new RegExp(`\\bsegment (${N})(${N})\\b`, 'g'), 'segment [$1$2]')
  r(new RegExp(`\\bsegment \\[(${N})(${N})\\] tel(?:le)? que \\1\\2 = (\\d)`, 'g'), 'segment [$1$2] de $3')
  // « du segment [AB] », « de AB » → « de [AB] » après médiatrice, milieu
  r(new RegExp(`\\b(m[ée]diatrice|milieu(?: ${N})?) (?:du segment|de segment|de|du) \\[?(${N})(${N})\\]?`, 'g'), '$1 de [$2$3]')
  // « à la droite (AB) », « à AB », « à [AB] » → « à (AB) » ; « passant par le point C » → « passant par C »
  r(new RegExp(`\\b(perpendiculaire|parall[èe]le) (?:à|a) (?:la droite |la demi-droite |le segment )?[\\[(]?(${N})(${N})[\\])]?`, 'g'), '$1 à ($2$3)')
  r(new RegExp(`\\b(passant par|qui passe par|en) le point (${N})`, 'g'), '$1 $2')
  // « bissectrice de ABC » → « bissectrice de l'angle ABC »
  r(new RegExp(`\\bbissectrice (?:de |du )(?:l'angle )?(?:\\\\widehat\\{)?(${N})(${N})(${N})`, 'g'), "bissectrice de l'angle $1$2$3")
  // « centre le point O », « de centre O, de rayon » → « de centre O de rayon »
  r(new RegExp(`\\bde centre (${N}),? (?:et )?(de rayon|passant par)`, 'g'), 'de centre $1 $2')
  return l
}

/** Une phrase modèle, selon le mot qui ressemble à ce qu'on voulait faire */
function suggestion(l: string): string {
  const modeles: [RegExp, string][] = [
    [/segment/, 'Trace un segment [AB] de 6 cm.'],
    [/cercle/, 'Trace le cercle de centre O et de rayon 3 cm.'],
    [/m[ée]diatrice/, 'Trace la médiatrice de [AB].'],
    [/milieu/, 'Place le milieu I de [AB].'],
    [/[ée]quilat/, 'Construis un triangle équilatéral ABC de côté 5 cm.'],
    [/triangle/, 'Construis un triangle ABC tel que AB = 6 cm, AC = 5 cm et BC = 4 cm.'],
    [/carr/, 'Construis un carré ABCD de côté 4 cm.'],
    [/rectangle/, 'Construis un rectangle ABCD de 6 cm sur 3 cm.'],
    [/perpendiculaire/, 'Trace la perpendiculaire à (AB) passant par C.'],
    [/parall/, 'Trace la parallèle à (AB) passant par C.'],
    [/bissectrice/, "Trace la bissectrice de l'angle ABC."],
    [/angle/, 'Trace un angle BAC de 50°.'],
    [/hexagone/, 'Construis un hexagone régulier ABCDEF de côté 3 cm.'],
    [/point/, 'Place les points A, B et C.'],
  ]
  const m = modeles.find(([re]) => re.test(l))
  return m ? ` Essaie par exemple : « ${m[1]} »` : ''
}

export function compiler(texte: string, connus: Map<string, P>, ancre: P): Programme {
  const pts = new Map(connus)
  const etapes: Etape[] = []
  const erreurs: string[] = []
  // Les nouvelles figures se posent les unes à côté des autres
  let place = { x: ancre.x, y: ancre.y }
  let recent: P | null = null                     // le milieu du dernier segment tracé
  const nouvellePlace = (largeur: number) => { const p = { ...place }; place = { x: place.x + largeur + 3 * CM, y: place.y }; return p }

  const point = (nom: string, p: P, consigne?: string) => {
    pts.set(nom, p)
    const g: Geste = { k: 'point', nom, p }
    if (consigne) etapes.push({ consigne, gestes: [g] })
    return g
  }
  const exiger = (...n: string[]) => {
    const manque = n.filter(x => !pts.has(x))
    if (manque.length) throw new Error(`Le point ${manque.join(', ')} n'existe pas encore : place-le d'abord.`)
    return n.map(x => pts.get(x)!)
  }

  /** [AB] de longueur l : la règle, puis le point B. A est créé s'il n'existe pas. */
  const segment = (a: string, b: string, l: number | null, direction = { x: 1, y: 0 }) => {
    const gestes: Geste[] = []
    let A = pts.get(a), B = pts.get(b)
    if (!A && !B) {
      const o = nouvellePlace(l ?? 6 * CM)
      A = o; gestes.push(point(a, A))
    } else if (!A) { A = plus(B!, direction, -(l ?? 6 * CM)); gestes.push(point(a, A)) }
    if (!B) {
      if (l === null) throw new Error(`Il manque la longueur de [${a}${b}].`)
      B = plus(A!, direction, l)
    }
    gestes.push({ k: 'regle', a: A!, b: B })
    recent = milieu(A!, B)
    if (!pts.has(b)) gestes.push(point(b, B))
    if (!pts.has(a)) pts.set(a, A!)
    etapes.push({ consigne: `Trace le segment [${a}${b}]` + (l ? ` de ${cmTexte(l / CM)}.` : '.'), gestes })
    return { A: A!, B }
  }

  /** Triangle ABC par ses trois côtés : [AB] à la règle, puis deux arcs */
  const triangle = (a: string, b: string, c: string, ab: number, ac: number, bc: number, nom = 'triangle') => {
    if (ab >= ac + bc || ac >= ab + bc || bc >= ab + ac) throw new Error(`Ce ${nom} n'existe pas : chaque côté doit être plus court que la somme des deux autres.`)
    const { A, B } = segment(a, b, ab)
    const inter = intersectionCercles(A, ac, B, bc)!
    const C = inter[0].y < inter[1].y ? inter[0] : inter[1]        // au-dessus de [AB]
    etapes.push({ consigne: `Pointe du compas en ${a}, écartement ${cmTexte(ac / CM)} : trace un arc.`, gestes: [arcVers(A, ac, C)] })
    etapes.push({ consigne: `Pointe du compas en ${b}, écartement ${cmTexte(bc / CM)} : trace un arc. Les arcs se coupent en ${c}.`, gestes: [arcVers(B, bc, C), point(c, C)] })
    etapes.push({ consigne: `Trace [${a}${c}] et [${b}${c}].`, gestes: [{ k: 'regle', a: A, b: C }, { k: 'regle', a: B, b: C }] })
  }

  /** Perpendiculaire à (ab) passant par p, à l'équerre */
  const perpendiculaire = (A: P, B: P, Pp: P, consigne: string, aide = false) => {
    let H = projete(Pp, A, B)
    const d = unit(A, B)
    let w: P
    if (dist(H, Pp) < 1) { H = Pp; w = { x: d.y, y: -d.x }; if (w.y > 0) w = { x: -w.x, y: -w.y } }
    else w = unit(H, Pp)
    const l = Math.max(dist(H, Pp) + 2 * CM, 6 * CM)
    const gestes: Geste[] = [{ k: 'equerre', o: H, w, a: plus(H, w, -1 * CM), b: plus(H, w, Math.min(l, 11.5 * CM)) }]
    if (aide) (gestes[0] as { aide?: boolean }).aide = true
    etapes.push({ consigne, gestes })
    return { H, w }
  }

  const lignes = texte.split(/\n|(?<=[a-zé\])0-9°])\.\s+(?=[A-ZÉ])/).map(x => x.trim()).filter(Boolean)
  for (const ligne of lignes) {
    const l = normaliser(ligne)
    let m: RegExpMatchArray | null
    try {
      // --- Points ---
      if ((m = l.match(new RegExp(`^(?:place|placer|soit|trace)\\s+(?:un |le |les |deux |trois |quatre )?(?:points? )\\s*((?:${NOM}(?:\\s*,\\s*|\\s+et\\s+)?)+)(?:\\s+non align[ée]s)?$`)))) {
        const n = noms(m[1]).filter(x => !pts.has(x))
        // Un point seul après une figure se pose au-dessus d'elle (pour y mener
        // une perpendiculaire, une parallèle…) ; sinon, à côté
        const dernier = recent as P | null       // modifié dans segment()
        const o = dernier && n.length === 1 ? { x: dernier.x + 1.2 * CM, y: dernier.y - 3.5 * CM } : nouvellePlace((n.length - 1) * 3 * CM)
        n.forEach((x, i) => point(x, { x: o.x + i * 3 * CM, y: o.y + (i % 2 ? -1.5 * CM : 0) }))
        etapes.push({ consigne: `Place ${n.length > 1 ? 'les points' : 'le point'} ${n.join(', ')}.`, gestes: n.map(x => ({ k: 'point', nom: x, p: pts.get(x)! })) })
      }
      // --- Segment [AB] de 5 cm, ou [AB] entre deux points connus ---
      else if ((m = l.match(new RegExp(`segment \\[(${NOM})(${NOM})\\](?:\\s+(?:de|mesurant|de longueur)\\s+${NOMBRE}\\s*cm)?`))) ||
               (m = l.match(new RegExp(`^(?:trace|relie)\\s+\\[(${NOM})(${NOM})\\](?:\\s+(?:de|mesurant)\\s+${NOMBRE}\\s*cm)?$`)))) {
        segment(m[1], m[2], m[3] ? lireNombre(m[3]) * CM : null)
      }
      // --- Un segment sans nom : ses extrémités prennent des lettres libres ---
      else if ((m = l.match(new RegExp(`segment de ${NOMBRE} cm`)))) {
        const libres = 'ABCDEFGHIJKLMNPQRSTUVWXYZ'.split('').filter(x => !pts.has(x))
        segment(libres[0], libres[1], lireNombre(m[1]) * CM)
      }
      // --- Cercle de centre O et de rayon r / passant par M ---
      else if ((m = l.match(new RegExp(`cercle\\s+(?:${NOM}\\s+)?de centre (${NOM})\\s+(?:et\\s+)?(?:de rayon ${NOMBRE}\\s*cm|passant par (${NOM}))`)))) {
        const nomC = m[1]
        const gestes: Geste[] = []
        const r = m[2] ? lireNombre(m[2]) * CM : dist(exiger(m[1])[0], exiger(m[3])[0])
        if (!pts.has(nomC)) gestes.push(point(nomC, plus(nouvellePlace(2 * r), { x: r, y: 0 })))
        const C = pts.get(nomC)!
        gestes.push({ k: 'compas', c: C, r, a0: -Math.PI / 2, a1: -Math.PI / 2 + 2 * Math.PI })
        etapes.push({ consigne: `Pointe du compas en ${nomC}, écartement ${cmTexte(r / CM)} : trace le cercle.`, gestes })
      }
      // --- Médiatrice de [AB] (et milieu) ---
      else if ((m = l.match(new RegExp(`(m[ée]diatrice|milieu)\\s+(?:(${NOM})\\s+)?de \\[(${NOM})(${NOM})\\]`)))) {
        const [A, B] = exiger(m[3], m[4])
        const r = dist(A, B) * 0.7
        const [h, b] = intersectionCercles(A, r, B, r)!
        const haut = h.y < b.y ? h : b, bas = h.y < b.y ? b : h
        etapes.push({ consigne: `Pointe du compas en ${m[3]}, un écartement plus grand que la moitié de [${m[3]}${m[4]}] : trace un arc de chaque côté.`,
          gestes: [arcVers(A, r, haut), arcVers(A, r, bas)] })
        etapes.push({ consigne: `Même écartement, pointe en ${m[4]} : les arcs se coupent en deux points.`, gestes: [arcVers(B, r, haut), arcVers(B, r, bas)] })
        const u = unit(haut, bas)
        if (/milieu/i.test(m[1])) {
          const I = milieu(A, B), nomI = m[2] ?? 'I'
          etapes.push({ consigne: `La droite qui passe par ces deux points coupe [${m[3]}${m[4]}] en son milieu ${nomI}.`,
            gestes: [{ k: 'regle', a: haut, b: bas, aide: true }, point(nomI, I)] })
        } else {
          etapes.push({ consigne: `Trace la droite qui passe par ces deux points : c'est la médiatrice de [${m[3]}${m[4]}].`,
            gestes: [{ k: 'regle', a: plus(haut, u, -1.5 * CM), b: plus(bas, u, 1.5 * CM) }] })
        }
      }
      // --- Triangle ABC tel que AB = 5 cm, AC = 4 cm, BC = 3 cm ---
      else if ((m = l.match(new RegExp(`triangle\\s+(${NOM})(${NOM})(${NOM})\\s+tel que\\s+(.+)$`)))) {
        const [a, b, c] = [m[1], m[2], m[3]]
        const L = new Map<string, number>()
        for (const x of m[4].matchAll(new RegExp(`(${NOM})(${NOM})\\s*=\\s*${NOMBRE}\\s*cm`, 'g'))) {
          const v = lireNombre(x[3]) * CM
          L.set(x[1] + x[2], v); L.set(x[2] + x[1], v)
        }
        const ab = L.get(a + b), ac = L.get(a + c), bc = L.get(b + c)
        if (!ab || !ac || !bc) throw new Error('Il faut les trois longueurs du triangle, par exemple AB = 5 cm, AC = 4 cm et BC = 3 cm.')
        triangle(a, b, c, ab, ac, bc)
      }
      // --- Triangle équilatéral ABC de côté 4 cm ---
      else if ((m = l.match(new RegExp(`triangle [ée]quilat[ée]ral\\s+(${NOM})(${NOM})(${NOM})\\s+de (?:c[ôo]t[ée]\\s+)?${NOMBRE}\\s*cm`)))) {
        const c = lireNombre(m[4]) * CM
        triangle(m[1], m[2], m[3], c, c, c, 'triangle équilatéral')
      }
      // --- Carré ABCD / rectangle ABCD ---
      else if ((m = l.match(new RegExp(`(carr[ée]|rectangle)\\s+(${NOM})(${NOM})(${NOM})(${NOM})\\s+(?:de |tel que )?(?:c[ôo]t[ée] |longueur )?${NOMBRE}\\s*cm(?:\\s+(?:sur|et|de largeur|et de largeur)\\s+${NOMBRE}\\s*cm)?`)))) {
        const carre = /carr/i.test(m[1])
        const [a, b, c, d] = [m[2], m[3], m[4], m[5]]
        const L = lireNombre(m[6]) * CM, H = carre ? L : m[7] ? lireNombre(m[7]) * CM : null
        if (H === null) throw new Error('Il faut la largeur du rectangle, par exemple « rectangle ABCD de 6 cm sur 4 cm ».')
        const { A, B } = segment(a, b, L)
        const haut = { x: 0, y: -1 }
        const D = plus(A, haut, H), C = plus(B, haut, H)
        etapes.push({ consigne: `Équerre en ${a} : trace la perpendiculaire à (${a}${b}) et place ${d} à ${cmTexte(H / CM)} de ${a}.`,
          gestes: [{ k: 'equerre', o: A, w: haut, a: A, b: D }, point(d, D)] })
        etapes.push({ consigne: `Équerre en ${b} : trace la perpendiculaire à (${a}${b}) et place ${c} à ${cmTexte(H / CM)} de ${b}.`,
          gestes: [{ k: 'equerre', o: B, w: haut, a: B, b: C }, point(c, C)] })
        etapes.push({ consigne: `Trace [${d}${c}] : le ${carre ? 'carré' : 'rectangle'} ${a}${b}${c}${d} est construit.`, gestes: [{ k: 'regle', a: D, b: C }] })
      }
      // --- Perpendiculaire à (AB) passant par C ---
      else if ((m = l.match(new RegExp(`perpendiculaire\\s+(?:à|a)\\s+\\((${NOM})(${NOM})\\)\\s+(?:passant par|qui passe par|en)\\s+(${NOM})`)))) {
        const [A, B, C] = exiger(m[1], m[2], m[3])
        perpendiculaire(A, B, C, `Pose l'équerre : un côté de l'angle droit sur (${m[1]}${m[2]}), l'autre contre ${m[3]}. Trace la perpendiculaire.`)
      }
      // --- Parallèle à (AB) passant par C : deux perpendiculaires ---
      else if ((m = l.match(new RegExp(`parall[èe]le\\s+(?:à|a)\\s+\\((${NOM})(${NOM})\\)\\s+(?:passant par|qui passe par)\\s+(${NOM})`)))) {
        const [A, B, C] = exiger(m[1], m[2], m[3])
        perpendiculaire(A, B, C, `D'abord, à l'équerre, la perpendiculaire à (${m[1]}${m[2]}) passant par ${m[3]}.`, true)
        const d = unit(A, B)
        // Deuxième perpendiculaire, en C, à la première
        etapes.push({ consigne: `Puis, à l'équerre, la perpendiculaire à cette droite en ${m[3]} : elle est parallèle à (${m[1]}${m[2]}).`,
          gestes: [{ k: 'equerre', o: C, w: d, a: plus(C, d, -5 * CM), b: plus(C, d, 6 * CM) }] })
      }
      // --- Bissectrice de l'angle ABC ---
      else if ((m = l.match(new RegExp(`bissectrice\\s+de\\s+l'angle\\s+(${NOM})(${NOM})(${NOM})`)))) {
        const [A, B, C] = exiger(m[1], m[2], m[3])
        const r = Math.min(dist(B, A), dist(B, C)) * 0.5
        const E = plus(B, unit(B, A), r), F = plus(B, unit(B, C), r)
        etapes.push({ consigne: `Pointe du compas en ${m[2]} : un arc qui coupe les deux côtés de l'angle.`, gestes: [{ k: 'compas', c: B, r, a0: ang(B, E) - 8 * DEG * Math.sign(angleSigne(B, E, F)), a1: ang(B, E) + angleSigne(B, E, F) + 8 * DEG * Math.sign(angleSigne(B, E, F)), aide: true }] })
        const r2 = dist(E, F) * 0.8
        const inter = intersectionCercles(E, r2, F, r2)!
        const G = dist(inter[0], B) > dist(inter[1], B) ? inter[0] : inter[1]
        etapes.push({ consigne: 'Même écartement, depuis chacun des deux points : deux arcs qui se coupent.', gestes: [arcVers(E, r2, G, 15 * DEG), arcVers(F, r2, G, 15 * DEG)] })
        etapes.push({ consigne: `Trace la demi-droite qui part de ${m[2]} et passe par ce point : c'est la bissectrice.`, gestes: [{ k: 'regle', a: B, b: plus(B, unit(B, G), Math.max(dist(B, G) + 2 * CM, 6 * CM)) }] })
      }
      // --- Angle BAC de 40° (au rapporteur) ---
      else if ((m = l.match(new RegExp(`angle\\s+(${NOM}|[a-z])(${NOM})(${NOM}|[a-z])\\s+(?:de|mesurant)\\s+${NOMBRE}\\s*°`)))) {
        const [n1, nA, n2] = [m[1], m[2], m[3]]
        const alpha = lireNombre(m[4])
        if (alpha <= 0 || alpha >= 180) throw new Error('Au rapporteur, un angle entre 0° et 180°.')
        let A = pts.get(nA), B = pts.get(n1)
        if (!A || !B) {
          const r = segment(nA, n1, 6 * CM); A = r.A; B = r.B
        }
        const u = unit(A, B)
        const dir = { x: u.x * Math.cos(alpha * DEG) + u.y * Math.sin(alpha * DEG), y: -u.x * Math.sin(alpha * DEG) + u.y * Math.cos(alpha * DEG) }
        const marque = plus(A, dir, 6.4 * CM)
        etapes.push({ consigne: `Centre du rapporteur en ${nA}, zéro sur [${nA}${n1}) : repère la graduation ${alpha}°.`, gestes: [{ k: 'rapporteur', o: A, u, angle: alpha, marque }] })
        const C = plus(A, dir, 7.5 * CM)                // au bout du trait, loin du repère
        etapes.push({ consigne: `Trace la demi-droite [${nA}${n2}) qui passe par ce repère.`, gestes: [{ k: 'regle', a: A, b: plus(A, dir, 8 * CM) }, ...(n2.toUpperCase() === n2 ? [point(n2, C)] : [])] })
      }
      // --- Hexagone régulier ABCDEF de côté 3 cm (au compas) ---
      else if ((m = l.match(new RegExp(`hexagone(?: r[ée]gulier)?\\s*((?:${NOM}){6})?\\s+de (?:c[ôo]t[ée]\\s+)?${NOMBRE}\\s*cm`)))) {
        const r = lireNombre(m[2]) * CM
        const n = m[1] ? noms(m[1]) : ['A', 'B', 'C', 'D', 'E', 'F'].filter(x => !pts.has(x))
        if (n.length < 6) throw new Error('Il faut six noms libres pour l\'hexagone.')
        const O = plus(nouvellePlace(2 * r), { x: r, y: -r * 0.2 })
        etapes.push({ consigne: `Trace un cercle de rayon ${cmTexte(r / CM)} : le côté de l'hexagone est égal au rayon.`, gestes: [{ k: 'compas', c: O, r, a0: 0, a1: 2 * Math.PI, aide: true }] })
        const S = Array.from({ length: 6 }, (_, i) => plus(O, { x: Math.cos(-i * Math.PI / 3 + Math.PI), y: Math.sin(-i * Math.PI / 3 + Math.PI) }, r))
        const g: Geste[] = [point(n[0], S[0])]
        for (let i = 1; i < 6; i++) { g.push(arcVers(S[i - 1], r, S[i], 12 * DEG)); g.push(point(n[i], S[i])) }
        etapes.push({ consigne: `Sans changer l'écartement, reporte le rayon six fois sur le cercle, à partir de ${n[0]}.`, gestes: g })
        etapes.push({ consigne: `Relie les six points : l'hexagone ${n.join('')} est construit.`, gestes: S.map((p, i) => ({ k: 'regle', a: p, b: S[(i + 1) % 6] }) as Geste) })
      }
      else if (/^(?:[ée]tape|que remarques|justifie|observe|explique)/i.test(l)) continue
      else erreurs.push(`Je ne sais pas faire : « ${ligne.replace(/[.;]+$/, '')} ».` + suggestion(l))
    } catch (e) {
      erreurs.push((e as Error).message)
    }
  }
  return { etapes, erreurs }
}

/** L'angle orienté de (B→E) à (B→F), entre −π et π */
function angleSigne(B: P, E: P, F: P) {
  let d = ang(B, F) - ang(B, E)
  while (d > Math.PI) d -= 2 * Math.PI
  while (d < -Math.PI) d += 2 * Math.PI
  return d
}

/** Des programmes tout prêts : on les choisit, on peut les modifier */
export const EXEMPLES: { nom: string; texte: string }[] = [
  { nom: 'Médiatrice', texte: 'Trace un segment [AB] de 6 cm.\nTrace la médiatrice de [AB].' },
  { nom: 'Milieu', texte: 'Trace un segment [AB] de 7 cm.\nPlace le milieu I de [AB].' },
  { nom: 'Triangle (3 côtés)', texte: 'Construis un triangle ABC tel que AB = 6 cm, AC = 5 cm et BC = 4 cm.' },
  { nom: 'Triangle équilatéral', texte: 'Construis un triangle équilatéral ABC de côté 5 cm.' },
  { nom: 'Carré', texte: 'Construis un carré ABCD de côté 4 cm.' },
  { nom: 'Rectangle', texte: 'Construis un rectangle ABCD de 6 cm sur 3,5 cm.' },
  { nom: 'Perpendiculaire', texte: 'Trace un segment [AB] de 8 cm.\nPlace le point C.\nTrace la perpendiculaire à (AB) passant par C.' },
  { nom: 'Parallèle', texte: 'Trace un segment [AB] de 8 cm.\nPlace le point C.\nTrace la parallèle à (AB) passant par C.' },
  { nom: 'Bissectrice', texte: 'Trace un segment [BA] de 6 cm.\nTrace un angle ABC de 70°.\nTrace la bissectrice de l\'angle ABC.' },
  { nom: 'Angle au rapporteur', texte: 'Trace un segment [AB] de 6 cm.\nTrace un angle BAC de 50°.' },
  { nom: 'Cercle', texte: 'Place le point O.\nTrace le cercle de centre O et de rayon 3 cm.' },
  { nom: 'Hexagone régulier', texte: 'Construis un hexagone régulier ABCDEF de côté 3 cm.' },
]
