// =============================================================
// L'ORDRE D'AFFICHAGE : DES CALQUES, PUIS LE RANG
// Ce qui est sur une page se peint en quatre calques, toujours dans le
// même ordre : les images fixées en fond, les images, les tracés et les
// figures, les formules. Dans un calque, le rang z décide (le plus grand
// dessus). Pourquoi des calques plutôt qu'un seul ordre pour tout, comme
// tldraw ou Excalidraw :
// - c'est déjà ce que peignait MEM : une image (et son papier) ne recouvre
//   jamais un trait de construction, et les formules KaTeX restent en HTML
//   au-dessus du canevas, pour rester nettes à tout zoom (un ordre total
//   obligerait à les peindre dans le canevas) ;
// - c'est le modèle des carnets (GoodNotes, Notability) : l'encre est
//   toujours au-dessus des images, et un énoncé importé ne cache jamais ce
//   qu'on écrit dessus.
// La prise suit cet ordre (on prend ce qu'on voit : voir cibleParmi dans
// geometrie.ts), le rendu, le PDF et les vignettes aussi. Les commandes
// d'ordre (premier plan, avancer, reculer, arrière-plan) n'agissent que DANS
// le calque de l'objet.
// z n'est qu'un ordre : tout le code, et la version d'avant (fdf3f72),
// trient par a.z − b.z ; un z fractionnaire (entre deux voisins) ou négatif
// (sous tout) ne gêne rien. Les z de naissance sont des heures (Date.now()),
// environ 1,76e12 : entre deux formes posées à une milliseconde d'écart, on
// peut glisser une douzaine de rangs l'un dans l'autre avant que l'écart ne
// s'épuise ; un repli LOCAL fait alors de la place (voir faireDeLaPlace).
// Rien ici ne touche au DOM : le calcul se vérifie sous Node.
// =============================================================
import { chevauche } from './geometrie'
import type { Boite } from './geometrie'
import type { Forme } from './types'
import { libre } from './types'

/** 0 : une image fixée en fond ; 1 : une image ; 2 : un trait, un segment,
 *  un polygone, un cercle ; 3 : une formule (en HTML au-dessus du canevas) */
export type Couche = 0 | 1 | 2 | 3

/** Le calque d'une forme. « Fixé en fond » ne compte que sur une image (la
 *  liste blanche du presse-papiers le jette ailleurs) : un trait qui le
 *  porterait (un fichier abîmé) reste avec les tracés. */
export function couche(f: Forme): Couche {
  if (f.type === 'image') return f.fixe ? 0 : 1
  return f.type === 'formule' ? 3 : 2
}

/** Une copie de ces formes dans l'ordre où on les voit, de la plus basse à
 *  la plus haute : par calque, puis par z. Le tri est STABLE : deux formes du
 *  même calque et du même z gardent l'ordre où on les a données (celui de la
 *  page, comme le tri par z d'avant). Une page sans image fixée se peint
 *  donc exactement comme avant le lot 5 : les images d'abord, par z, puis
 *  tout le reste, par z. */
export function ordreDAffichage<T extends Forme>(formes: readonly T[]): T[] {
  return [...formes].sort((a, b) => couche(a) - couche(b) || a.z - b.z)
}

/** Ces formes sont-elles déjà dans l'ordre d'affichage ? (un seul parcours :
 *  le rendu ne trie que s'il le faut) */
export function enOrdreDAffichage(formes: readonly Forme[]): boolean {
  for (let i = 1; i < formes.length; i++) {
    const a = formes[i - 1], b = formes[i], ca = couche(a), cb = couche(b)
    if (ca > cb || (ca === cb && a.z > b.z)) return false
  }
  return true
}

/** Les quatre commandes d'ordre du menu complet */
export type Sens = 'premier' | 'avancer' | 'reculer' | 'arriere'

/** L'aide des commandes d'ordre du menu ⋯ : elles n'agissent que dans le
 *  calque de ce qui est pris, et le menu le dit (D1). Celle de « Mettre au
 *  premier plan » dit ce qui reste au-dessus, celle de « Mettre à
 *  l'arrière-plan » ce qui reste dessous, quand on ne le devinerait pas :
 *  un trait mis au premier plan reste sous une formule, un trait mis à
 *  l'arrière-plan au-dessus d'une image (la vérification « conformité » du
 *  lot 5 : seules les images et les formules avaient leur aide). Une
 *  sélection mêlée monte ou descend dans chacun de ses calques. Une image
 *  à l'arrière-plan n'a pas d'aide : elle passe sous les autres images,
 *  comme on l'attend. */
export function aidesOrdre(pris: readonly Forme[]): { premier?: string; arriere?: string } {
  if (!pris.length) return {}
  const calques = new Set(pris.map(f => Math.max(1, couche(f))))
  if (calques.size > 1) return { premier: 'Chacun dans son calque : images, puis écriture et figures, puis formules' }
  const c = [...calques][0]
  if (c === 3) return { premier: 'Devant les autres formules ; les formules restent au-dessus de tout',
    arriere: 'Derrière les autres formules, toujours au-dessus de l\'écriture et des figures' }
  if (c === 2) return { premier: 'Devant l\'écriture et les figures ; les formules restent au-dessus',
    arriere: 'Derrière l\'écriture et les figures ; les images restent dessous' }
  return { premier: 'Devant les autres images ; l\'écriture et les figures restent devant' }
}

/**
 * Les rangs neufs que donne une commande d'ordre aux formes `ids` de la page
 * (`formes` : toute la page, dans n'importe quel ordre), et à celles qu'il a
 * fallu décaler pour leur faire de la place ; vide : rien à faire. Le tableau
 * les écrit en une transaction (un Ctrl+Z, une étape du film).
 * Calque par calque : une image et un trait choisis ensemble montent chacun
 * dans le sien. Dans un calque, S est l'ensemble des choisies LIBRES (ni
 * verrouillées ni fixées), dans l'ordre des z ; A, les autres formes du
 * calque, les verrouillées comprises : elles gardent leur place dans
 * l'ordre (seul le repli peut leur donner un autre z, sans rien changer à
 * l'ordre). Les z voisins se lisent dans toute la page, tels que les
 * calques déjà traités les ont laissés.
 * - premier : rien si toutes les S sont déjà au-dessus de toutes les A ;
 *   sinon elles prennent, dans leur ordre, le plus grand z de la page + 1, + 2…
 * - arriere : rien si toutes les S sont déjà sous toutes les A ; sinon le plus
 *   petit z de la page − n, …, − 1. Une IMAGE, elle, ne passe jamais sous une
 *   image fixée : elle prend des z entre le plus grand z des images fixées et
 *   le plus petit des A, par parts égales. Sur une page, toute image fixée
 *   reste ainsi sous toute image libre, ce que la version d'avant, son
 *   lecteur et son export PDF, qui ne rangent les images que par z, peignent
 *   donc aussi. Sans image fixée, ou si ces bornes se croisent (un fichier
 *   repassé par la version d'avant), comme une autre forme.
 * - avancer : la plus basse des A plus haute que la plus haute des S et dont
 *   la boîte chevauche celle des S (B) ; aucune : rien (« Avancer » qui ne
 *   change rien de visible ne fait rien : tldraw fait de même). Sinon les S
 *   prennent des z entre celui de B et le z suivant au-dessus de B dans la
 *   page (hors des S), par parts égales, ou B + 1, + 2… s'il n'y a rien
 *   au-dessus.
 * - reculer : de même vers le bas, sous la plus haute des A plus basse que
 *   la plus basse des S qui les chevauche. Une image ne passe ainsi jamais
 *   sous une image fixée : B est une image libre, et le z suivant au-dessous
 *   d'elle est au moins celui de la plus haute image fixée.
 * `boite` : la boîte d'une forme (une formule se mesure à l'écran ; une
 * droite compte par ses deux points).
 */
export function nouveauxRangs(formes: readonly Forme[], ids: Iterable<string>, sens: Sens,
  boite: (f: Forme) => Boite | null): { id: string; z: number }[] {
  const voulus = new Set(ids)
  if (!voulus.size) return []
  // Les rangs tels qu'ils seront : chaque calque lit ceux que les calques
  // d'avant ont laissés
  const rang = new Map<string, number>()
  for (const f of formes) rang.set(f.id, f.z)
  const changes = new Map<string, number>()
  const zDe = (f: Forme) => rang.get(f.id)!
  for (const c of [0, 1, 2, 3] as Couche[]) {
    const S = formes.filter(f => couche(f) === c && voulus.has(f.id) && libre(f)).sort((a, b) => zDe(a) - zDe(b))
    if (!S.length) continue
    const dansS = new Set(S.map(f => f.id))
    const A = formes.filter(f => couche(f) === c && !dansS.has(f.id))
    const sBas = zDe(S[0]), sHaut = zDe(S[S.length - 1])
    let aBas = Infinity, aHaut = -Infinity
    for (const f of A) { const v = zDe(f); if (v < aBas) aBas = v; if (v > aHaut) aHaut = v }
    let place: Map<string, number> | null = null
    if (sens === 'premier') {
      if (sBas > aHaut) continue
      const haut = extreme(rang, 1)
      place = new Map(S.map((f, k) => [f.id, haut + 1 + k]))
    } else if (sens === 'arriere') {
      if (sHaut < aBas) continue
      // Une image : au-dessus de la plus haute image fixée (D25)
      const fixees = c === 1 ? formes.filter(f => couche(f) === 0).map(zDe) : []
      const plafondFixees = fixees.length ? Math.max(...fixees) : -Infinity
      if (c === 1 && fixees.length && plafondFixees < aBas) place = placerEntre(rang, dansS, S, plafondFixees, aBas, true)
      else {
        const bas = extreme(rang, -1)
        place = new Map(S.map((f, k) => [f.id, bas - (S.length - k)]))
      }
    } else {
      const u = boiteReunie(S, boite)
      if (!u) continue
      const monte = sens === 'avancer'
      // B : la voisine qui chevauche, juste au-dessus (au-dessous) des S
      let b: Forme | null = null
      for (const f of A) {
        const v = zDe(f)
        if (monte ? v <= sHaut : v >= sBas) continue
        if (b && (monte ? v >= zDe(b) : v <= zDe(b))) continue
        const bf = boite(f)
        if (bf && chevauche(bf, u)) b = f
      }
      if (!b) continue
      const zB = zDe(b)
      // C : le z suivant au-delà de B, dans toute la page, hors des S
      let zC = monte ? Infinity : -Infinity
      for (const [id, v] of rang) {
        if (dansS.has(id)) continue
        if (monte ? v > zB && v < zC : v < zB && v > zC) zC = v
      }
      place = monte ? placerEntre(rang, dansS, S, zB, zC, true) : placerEntre(rang, dansS, S, zC, zB, false)
    }
    if (!place) continue
    for (const [id, v] of place) { rang.set(id, v); changes.set(id, v) }
  }
  return [...changes].map(([id, z]) => ({ id, z }))
}

/** Le plus grand (sens 1) ou le plus petit (sens −1) des rangs de la page */
function extreme(rang: Map<string, number>, sens: 1 | -1): number {
  let r = sens > 0 ? -Infinity : Infinity
  for (const v of rang.values()) if (sens > 0 ? v > r : v < r) r = v
  return r
}

/** La boîte qui réunit celles des formes (null : aucune n'en a) */
function boiteReunie(formes: readonly Forme[], boite: (f: Forme) => Boite | null): Boite | null {
  let x1 = Infinity, y1 = Infinity, x2 = -Infinity, y2 = -Infinity
  for (const f of formes) {
    const b = boite(f)
    if (!b) continue
    x1 = Math.min(x1, b.x); y1 = Math.min(y1, b.y); x2 = Math.max(x2, b.x + b.l); y2 = Math.max(y2, b.y + b.h)
  }
  return x1 === Infinity ? null : { x: x1, y: y1, l: x2 - x1, h: y2 - y1 }
}

/** n rangs strictement croissants, strictement entre bas et haut, par parts
 *  égales (bas ou haut peuvent être infinis : rien de ce côté) ; null si
 *  l'écart est épuisé (les nombres à virgule n'y ont plus de place) */
function rangsEntre(bas: number, haut: number, n: number): number[] | null {
  const r: number[] = []
  for (let k = 0; k < n; k++) {
    r.push(haut === Infinity ? bas + k + 1 : bas === -Infinity ? haut - (n - k) : bas + (haut - bas) * (k + 1) / (n + 1))
  }
  let avant = bas
  for (const v of r) { if (!(v > avant)) return null; avant = v }
  return avant < haut ? r : null
}

/** Les S entre bas et haut ; si l'écart y est épuisé, le repli local d'abord
 *  (voir faireDeLaPlace) : du côté de haut (versLeHaut) ou de bas. Rend
 *  tous les rangs à écrire, ceux des S et ceux qu'il a fallu décaler. */
function placerEntre(rang: Map<string, number>, dansS: Set<string>, S: readonly Forme[], bas: number, haut: number, versLeHaut: boolean): Map<string, number> | null {
  const n = S.length
  let r = rangsEntre(bas, haut, n)
  const place = new Map<string, number>()
  if (!r) {
    const decales = faireDeLaPlace(rang, dansS, versLeHaut ? haut : bas, n + 1, versLeHaut)
    for (const [id, v] of decales) place.set(id, v)
    const nouveau = decales[0]?.[1]
    if (nouveau === undefined) return null
    r = versLeHaut ? rangsEntre(bas, nouveau, n) : rangsEntre(nouveau, haut, n)
    // Des rangs si grands que + 1 ne s'y voit plus (au-delà de 2⁵³) : rien
    if (!r) return null
  }
  S.forEach((f, k) => place.set(f.id, r![k]))
  return place
}

/**
 * Le repli LOCAL, quand l'écart entre deux voisins est épuisé : on décale de
 * `pas` (n + 1) les formes de rang ≥ depuis (versLeHaut ; ≤ depuis sinon),
 * hors des S, une à une dans l'ordre des rangs en s'éloignant, jusqu'au
 * premier écart d'au moins `pas` entre deux voisins : l'ordre de toute la
 * page est gardé, et la place est faite. Les z sont des heures : cet écart
 * vient en général après une ou deux formes. On ne décale jamais toute la
 * page : avec gc: false, chaque forme réécrite est recopiée ENTIÈRE dans le
 * document (un décalage des 500 traits d'une page y ajouterait 1 à 2 Mo).
 * Rend les formes décalées et leur rang neuf, la plus proche de `depuis`
 * d'abord.
 */
function faireDeLaPlace(rang: Map<string, number>, dansS: Set<string>, depuis: number, pas: number, versLeHaut: boolean): [string, number][] {
  const l = [...rang].filter(([id, v]) => !dansS.has(id) && (versLeHaut ? v >= depuis : v <= depuis))
    .sort((a, b) => versLeHaut ? a[1] - b[1] : b[1] - a[1])
  const r: [string, number][] = []
  for (let j = 0; j < l.length; j++) {
    const v = l[j][1], neuf = versLeHaut ? v + pas : v - pas
    r.push([l[j][0], neuf])
    const suivant = l[j + 1]?.[1]
    if (suivant === undefined || (versLeHaut ? suivant > neuf : suivant < neuf)) break
  }
  return r
}
