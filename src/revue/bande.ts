// =============================================================
// LA BANDE : CE QU'ON REVOIT
// Le professeur choisit une portion du film : une page pendant une
// séance, une séance entière (toutes ses pages), ou toute l'histoire
// d'une page, de séance en séance. La bande en fait une suite d'images,
// chacune désignée par une étape du film et une page. On compte sur les
// métadonnées (heure, page notée) ; on ne lit que quelques instantanés,
// une ou deux fois par page : pour sauter sa naissance (une page vide qui
// paraît ne montre rien), pour partir d'une page propre, et pour finir
// sur la page telle qu'elle est au bout de la portion, même si un Ctrl+Z
// fait depuis une autre page l'a changée en dernier.
//
// La bande est découpée en parties, qu'on peut titrer et rejoindre :
// - pour une séance entière, une partie par page où l'on s'est attardé
//   (un détour de deux gestes sur une autre page reste dans la partie) ;
// - pour l'histoire d'une page, une partie par séance ;
// - partout, un silence de plus de trois minutes ouvre une partie.
// Chaque partie après la première s'ouvre sur l'état de sa page juste
// avant son premier geste : c'est là que mènent [ et ].
//
// Dans une partie, les gestes se groupent en pas : des gestes qui se
// suivent à moins de deux secondes forment une seule idée (un mot, une
// figure et ses noms). La télécommande avance d'un pas à la fois.
// =============================================================
import type { Etape } from '../document'
import type { Seance } from '../revoir/exporter'
import { PLANCHER, tasser } from '../revoir/rythme'
import type { LectureSeule } from './planches'
import { departPropre, memeImage } from './planches'

export type Portion =
  | { genre: 'seance'; seance: Seance; page: string | null }   // page null : toutes les pages de la séance
  | { genre: 'page'; page: string }                            // toute l'histoire d'une page

/** L'état de la page p après l'étape e du film (e = −1 : avant tout).
 *  geste : false pour l'image 0 et pour l'ouverture d'une partie. */
export interface ImageBande { e: number; p: string; geste: boolean }

/** Une partie : ses images de debut à fin (incluses), sa page, l'heure de son premier geste */
export interface Partie { debut: number; fin: number; page: string; heure: number; titre: string }

export interface Bande {
  portion: Portion
  images: ImageBande[]
  /** L'attente avant chaque image, en ms, à l'allure Normale */
  attentes: Float64Array
  parties: Partie[]
  /** Les images où l'on s'arrête en allant pas à pas (triées, sans doublon) */
  bornes: number[]
  /** Le nombre de gestes montrés jusqu'à l'image k, incluse */
  gestes: Int32Array
  total: number
}

/** Au-delà de ce silence (ms), un nouveau pas commence */
export const SILENCE_DE_PAS = 2000
/** Au-delà de ce silence (ms), une nouvelle partie commence */
export const SILENCE_DE_PARTIE = 3 * 60_000
/** Le temps de montrer l'ouverture d'une partie (ms) */
export const PAUSE_DE_PARTIE = 800
/** Le temps de lire l'image avant le premier geste d'une partie (ms) */
export const ENTREE = 400
/** Un détour sur une autre page plus court que ceci (en gestes) reste dans sa partie */
export const PARTIE_MIN = 3

// ---------- Ce qu'on revoit ----------

/** Les étapes du film qui appartiennent à une portion, dans l'ordre */
export function etapesDe(film: readonly Etape[], p: Portion): number[] {
  const r: number[] = []
  if (p.genre === 'seance') {
    const a = Math.min(film.length - 1, p.seance.a)
    for (let i = Math.max(0, p.seance.de); i <= a; i++) if (p.page === null || film[i].page === p.page) r.push(i)
  } else {
    for (let i = 0; i < film.length; i++) if (film[i].page === p.page) r.push(i)
  }
  return r
}

/** Les séances où une page a reçu au moins un geste, les plus récentes
 *  d'abord (sa naissance seule n'en est pas un) */
export function seancesDeLaPage(lecture: Pick<LectureSeule, 'film' | 'naissance'>, seances: readonly Seance[], page: string): Seance[] {
  return seances.filter(s => {
    if (!s.pages.includes(page)) return false
    for (let i = s.de; i <= s.a; i++) if (lecture.film[i]?.page === page && !lecture.naissance(i)) return true
    return false
  })
}

/** Ce qu'on montre en ouvrant : la page affichée dans la dernière séance où
 *  elle a quelque chose à montrer ; à défaut (une page toute neuve, dont la
 *  séance n'a fait que la créer), la dernière séance qui montre quelque chose,
 *  toutes pages. null : rien à montrer nulle part. */
export function bandeParDefaut(lecture: LectureSeule, seances: readonly Seance[], page: string, nommer: (page: string) => string): Bande | null {
  for (const s of seances) {                                // la plus récente d'abord
    if (!s.pages.includes(page)) continue
    const b = construireBande(lecture, { genre: 'seance', seance: s, page }, seances, nommer)
    if (b) return b
  }
  for (const s of seances) {
    const b = construireBande(lecture, { genre: 'seance', seance: s, page: null }, seances, nommer)
    if (b) return b
  }
  return null
}

type Cause = 'debut' | 'page' | 'seance' | 'silence'

/** Les gestes qu'une portion montre : leurs étapes, leurs pages, l'état
 *  juste avant chacun, et les pages qui naissent (null : rien à montrer) */
function gestesMontres(lecture: LectureSeule, p: Portion): { etapes: number[]; pages: string[]; avants: number[]; neuves: Set<string> } | null {
  const film = lecture.film
  // Une page qui naît ne montre rien : sa naissance n'est pas une image. On
  // retient seulement que la page est neuve (voir les parties, plus bas).
  const neuves = new Set<string>()
  const toutes = etapesDe(film, p).filter(i => {
    if (!lecture.naissance(i)) return true
    neuves.add(film[i].page)
    return false
  })
  if (!toutes.length) return null

  // La page de chaque étape : celle qu'on regardait, à défaut celle d'avant
  const repli = p.page ?? lecture.pagesActuelles()[0] ?? ''
  const pagesDe: string[] = []
  for (let j = 0; j < toutes.length; j++) pagesDe.push(film[toutes[j]].page || (j ? pagesDe[j - 1] : repli))
  const retire = departPropre(lecture, toutes, j => pagesDe[j])
  let etapes = toutes.slice(retire), pages = pagesDe.slice(retire)

  // Une étape qui ne change rien à sa page n'est pas un geste. « Supprimer la
  // page » se note sur la page où l'on revient, sans la toucher : on la
  // reconnaît sans tout relire, juste après une étape notée sur une page jetée
  // depuis (ou juste après une autre étape sans effet : on jette deux pages
  // de suite), et au bout de la portion (un Ctrl+Z qui change une autre page).
  const actuelles = new Set(lecture.pagesActuelles())
  const rienNeChange = (j: number) => {
    const avant = lecture.page(etapes[j] - 1, pages[j]), apres = lecture.page(etapes[j], pages[j])
    return !!avant && !!apres && memeImage(avant, apres)
  }
  const invisibles = new Set<number>()
  /** Les étapes du film reconnues sans effet */
  const sansEffet = new Set<number>()
  for (let j = 0; j < etapes.length; j++) {
    const i = etapes[j], q = film[i - 1]?.page
    if (((q && q !== pages[j] && !actuelles.has(q)) || sansEffet.has(i - 1)) && rienNeChange(j)) { invisibles.add(j); sansEffet.add(i) }
  }
  for (let j = etapes.length - 1; j >= 0 && (invisibles.has(j) || rienNeChange(j)); j--) invisibles.add(j)
  // Deux étapes de la même page à moins de PLANCHER ms sont un seul geste (un
  // trait, puis la figure reconnue qui le remplace) : on ne montre que la
  // seconde, et ce qui précède le geste est l'état d'avant la première.
  const fondue = (j: number) => j + 1 < etapes.length && !invisibles.has(j + 1) && pages[j + 1] === pages[j]
    && film[etapes[j + 1]].t - film[etapes[j]].t < PLANCHER
  /** L'état juste avant chaque geste gardé (l'étape d'avant, dans le film) */
  let avants = etapes.map(e => e - 1)
  if (invisibles.size || etapes.some((_, j) => fondue(j))) {
    const gardees: number[] = [], av: number[] = []
    let debut = -1
    for (let j = 0; j < etapes.length; j++) {
      if (invisibles.has(j)) continue
      if (fondue(j)) { if (debut < 0) debut = j; continue }
      gardees.push(j); av.push(etapes[debut < 0 ? j : debut] - 1); debut = -1
    }
    etapes = gardees.map(j => etapes[j]); pages = gardees.map(j => pages[j]); avants = av
  }
  return etapes.length ? { etapes, pages, avants, neuves } : null
}

/** L'affiche est la page telle qu'elle est au bout de la portion. Un Ctrl+Z
 *  fait depuis une autre page a pu la changer sans être noté sur elle : on
 *  finit alors sur son état vrai, comme un geste de plus (l'étape du bout ;
 *  null : la dernière image y suffit). Une page jetée depuis garde sa
 *  dernière image : il n'y a plus rien à rattraper. */
function boutEnPlus(lecture: LectureSeule, p: Portion, derniere: number, page: string): number | null {
  if (p.page === null || page !== p.page) return null
  const film = lecture.film
  const bout = p.genre === 'page' ? film.length - 1 : Math.min(film.length - 1, p.seance.a)
  const vraie = bout > derniere ? lecture.page(bout, p.page) : null
  const montree = vraie && lecture.page(derniere, p.page)
  return vraie && (!montree || !memeImage(vraie, montree)) ? bout : null
}

/** Combien de gestes montre une portion (0 : rien), sans construire sa bande :
 *  c'est le total de sa bande */
export function compterGestes(lecture: LectureSeule, p: Portion): number {
  const g = gestesMontres(lecture, p)
  if (!g) return 0
  const n = g.etapes.length
  return n + (boutEnPlus(lecture, p, g.etapes[n - 1], g.pages[n - 1]) === null ? 0 : 1)
}

/** La bande d'une portion (null : la portion est vide) */
export function construireBande(lecture: LectureSeule, p: Portion, seances: readonly Seance[], nommer: (page: string) => string): Bande | null {
  const film = lecture.film
  const g0 = gestesMontres(lecture, p)
  if (!g0) return null
  const { etapes, pages, avants, neuves } = g0

  // À quelle séance appartient une étape (pour l'histoire d'une page)
  const debuts = seances.map(s => s.de).sort((a, b) => a - b)
  const seanceDe = (i: number) => dernierAuPlus(debuts, i)

  // 1. Les passages : on coupe aux changements de page, de séance, et aux longs silences
  const passages: { de: number; a: number; cause: Cause }[] = []
  for (let j = 0; j < etapes.length; j++) {
    let cause: Cause | null = j ? null : 'debut'
    if (j) {
      const silence = film[etapes[j]].t - film[etapes[j - 1]].t
      if (silence > SILENCE_DE_PARTIE) cause = 'silence'
      else if (p.genre === 'page' && seanceDe(etapes[j]) !== seanceDe(etapes[j - 1])) cause = 'seance'
      else if (p.genre === 'seance' && p.page === null && pages[j] !== pages[j - 1]) cause = 'page'
    }
    if (cause) passages.push({ de: j, a: j, cause })
    else passages[passages.length - 1].a = j
  }

  // 2. Les parties : un court détour sur une autre page, ou un retour sur
  //    la page de la partie, ne fait pas une partie de plus. Prendre une
  //    page neuve pèse ici comme un geste, sans en être un à l'écran : deux
  //    gestes sur une page qu'on vient de créer font une partie, un seul
  //    reste un détour.
  const groupes: { de: number; a: number; page: string }[] = []
  for (const q of passages) {
    const der = groupes[groupes.length - 1]
    const poids = q.a - q.de + 1 + (neuves.delete(pages[q.de]) ? 1 : 0)
    if (der && q.cause === 'page' && (poids < PARTIE_MIN || pages[q.de] === der.page)) der.a = q.a
    else groupes.push({ de: q.de, a: q.a, page: pages[q.de] })
  }

  // 3. Les images, leurs attentes et les débuts de pas
  const images: ImageBande[] = [{ e: avants[0], p: pages[0], geste: false }]
  const attentes: number[] = [0]
  const parties: Partie[] = []
  const debutsDePas: number[] = []
  groupes.forEach((g, q) => {
    const debut = q ? images.length : 0
    if (q) { images.push({ e: avants[g.de], p: g.page, geste: false }); attentes.push(PAUSE_DE_PARTIE) }
    for (let j = g.de; j <= g.a; j++) {
      const premier = j === g.de
      const silence = j ? film[etapes[j]].t - film[etapes[j - 1]].t : 0
      if (premier || silence >= SILENCE_DE_PAS) debutsDePas.push(images.length)
      attentes.push(premier ? ENTREE : tasser(silence))
      images.push({ e: etapes[j], p: pages[j], geste: true })
    }
    const heure = film[etapes[g.de]].t
    const titre = p.genre === 'page' ? `${jourCourt(heure)} · ${heureLisible(heure)}` : `${nommer(g.page)} · ${heureLisible(heure)}`
    parties.push({ debut, fin: images.length - 1, page: g.page, heure, titre })
  })

  // L'affiche : la page telle qu'elle est au bout de la portion
  const der = images[images.length - 1]
  const bout = boutEnPlus(lecture, p, der.e, der.p)
  if (bout !== null) {
    const silence = film[bout].t - film[der.e].t
    if (silence >= SILENCE_DE_PAS) debutsDePas.push(images.length)
    attentes.push(tasser(silence))
    images.push({ e: bout, p: der.p, geste: true })
    parties[parties.length - 1].fin = images.length - 1
  }

  // 4. Les arrêts du pas à pas : les deux bouts, l'ouverture et la fin de
  //    chaque partie, et l'image qui précède chaque pas
  const n = images.length
  const arrets = new Set<number>([0, n - 1])
  for (const pa of parties) { arrets.add(pa.debut); arrets.add(pa.fin) }
  for (const d of debutsDePas) arrets.add(d - 1)
  const bornes = [...arrets].sort((a, b) => a - b)

  const gestes = new Int32Array(n)
  for (let k = 1; k < n; k++) gestes[k] = gestes[k - 1] + (images[k].geste ? 1 : 0)

  return { portion: p, images, attentes: Float64Array.from(attentes), parties, bornes, gestes, total: gestes[n - 1] }
}

// ---------- Se déplacer dans la bande ----------

/** L'indice du dernier élément ≤ v d'une liste triée (−1 s'il n'y en a pas) */
function dernierAuPlus(liste: ArrayLike<number>, v: number): number {
  let bas = 0, haut = liste.length - 1, r = -1
  while (bas <= haut) {
    const m = (bas + haut) >> 1
    if (liste[m] <= v) { r = m; bas = m + 1 } else haut = m - 1
  }
  return r
}

/** Où mène un pas en avant depuis k : la borne suivante. Une ouverture de
 *  partie se traverse : on va jusqu'au bout du premier pas de la partie. */
export function pasSuivant(b: Bande, k: number): number {
  const n = b.images.length
  const i = dernierAuPlus(b.bornes, k) + 1
  if (i >= b.bornes.length) return n - 1
  let c = b.bornes[i]
  if (c > 0 && !b.images[c].geste && i + 1 < b.bornes.length) c = b.bornes[i + 1]
  return Math.min(n - 1, c)
}

/** Où mène un pas en arrière depuis k : la borne précédente (une ouverture en est une) */
export function pasPrecedent(b: Bande, k: number): number {
  const i = dernierAuPlus(b.bornes, k - 1)
  return i < 0 ? 0 : b.bornes[i]
}

/** La partie de l'image k (son rang) */
export function partieDe(b: Bande, k: number): number {
  let bas = 0, haut = b.parties.length - 1, r = 0
  while (bas <= haut) {
    const m = (bas + haut) >> 1
    if (b.parties[m].debut <= k) { r = m; bas = m + 1 } else haut = m - 1
  }
  return r
}

/** Le début de la partie suivante (la fin de la bande s'il n'y en a plus) */
export function entreeSuivante(b: Bande, k: number): number {
  const q = partieDe(b, k)
  return q + 1 < b.parties.length ? b.parties[q + 1].debut : b.images.length - 1
}

/** Le début de la partie en cours si l'on est au milieu, sinon celui de la précédente */
export function entreePrecedente(b: Bande, k: number): number {
  const q = partieDe(b, k)
  if (b.parties[q].debut < k) return b.parties[q].debut
  return q > 0 ? b.parties[q - 1].debut : 0
}

/** Où s'arrête une lecture partie de k : la fin de la bande, ou la fin de
 *  la partie où l'on entre. Toujours après k, tant que k n'est pas la fin. */
export function prochainArret(b: Bande, k: number, auxParties: boolean): number {
  const n = b.images.length
  if (!auxParties) return n - 1
  return Math.min(n - 1, b.parties[partieDe(b, Math.min(n - 1, k + 1))].fin)
}

/** L'instant où chaque image paraît, en ms depuis l'image 0, à une allure donnée */
export function echeances(b: Bande, facteur: number): Float64Array {
  const e = new Float64Array(b.images.length)
  for (let k = 1; k < e.length; k++) e[k] = e[k - 1] + b.attentes[k] / facteur
  return e
}

/** La dernière image parue à l'instant `temps`, entre les images de et a */
export function indiceAuTemps(ech: Float64Array, temps: number, de: number, a: number): number {
  let bas = de + 1, haut = a, r = de
  while (bas <= haut) {
    const m = (bas + haut) >> 1
    if (ech[m] <= temps) { r = m; bas = m + 1 } else haut = m - 1
  }
  return r
}

// ---------- Les mots ----------

/** Les espaces qui ne coupent pas : « 10 h 05 » et « mar. 6 oct. » restent sur une ligne */
const INSECABLE = '\u00a0'

/** « 10 h 05 » */
export function heureLisible(t: number): string {
  const d = new Date(t)
  return `${d.getHours()}${INSECABLE}h${INSECABLE}${String(d.getMinutes()).padStart(2, '0')}`
}

/** Combien de jours séparent t d'aujourd'hui (0 : aujourd'hui, 1 : hier) */
function joursEcoules(t: number): number {
  const a = new Date(t); a.setHours(12, 0, 0, 0)
  const b = new Date(); b.setHours(12, 0, 0, 0)
  return Math.round((b.getTime() - a.getTime()) / 86_400_000)
}

/** « Aujourd'hui », « Hier » ou « Mardi 6 octobre » */
export function jourLisible(t: number): string {
  const j = joursEcoules(t)
  if (j === 0) return 'Aujourd\'hui'
  if (j === 1) return 'Hier'
  const d = new Date(t).toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long' })
  return d.charAt(0).toUpperCase() + d.slice(1)
}

/** « aujourd'hui », « hier » ou « mar. 6 oct. » */
export function jourCourt(t: number): string {
  const j = joursEcoules(t)
  if (j === 0) return 'aujourd\'hui'
  if (j === 1) return 'hier'
  return new Date(t).toLocaleDateString('fr-FR', { weekday: 'short', day: 'numeric', month: 'short' }).replace(/\s/g, INSECABLE)
}

/** « 42 s », « 1 min 10 », « 3 min » */
export function dureeLisible(ms: number): string {
  const s = Math.max(0, Math.round(ms / 1000))
  if (s < 60) return `${s} s`
  const m = Math.floor(s / 60), r = s % 60
  return r ? `${m} min ${String(r).padStart(2, '0')}` : `${m} min`
}

/** « 12 septembre » */
export function jourDuMois(t: number): string {
  return new Date(t).toLocaleDateString('fr-FR', { day: 'numeric', month: 'long' })
}

/** « page 2 », « pages 2, 3 », « pages 2, 3, 5 et 2 autres », « page jetée »,
 *  « page 1 et 4 pages jetées » : les pages d'une séance, par leur numéro
 *  dans le tableau d'aujourd'hui. Au-delà de quatre pages encore là, on n'en nomme que trois. */
export function listeDesPages(pages: readonly string[], actuelles: readonly string[]): string {
  const numeros = pages.map(p => actuelles.indexOf(p)).filter(i => i >= 0).map(i => i + 1).sort((a, b) => a - b)
  const jetees = pages.length - numeros.length
  if (pages.length > 4 && numeros.length > 3) return `pages ${numeros.slice(0, 3).join(', ')} et ${pages.length - 3} autres`
  const morceaux: string[] = []
  if (numeros.length) morceaux.push(`${numeros.length > 1 ? 'pages' : 'page'} ${numeros.join(', ')}`)
  if (jetees) morceaux.push(jetees > 1 ? `${jetees} pages jetées` : 'page jetée')
  return morceaux.join(' et ') || 'aucune page'
}

/** « 1 geste », « 84 gestes » */
export function pluriel(n: number, mot: string): string {
  return `${n} ${mot}${n > 1 ? 's' : ''}`
}
