// =============================================================
// DU FILM DU TABLEAU AU FILM ÉLÈVE
// On relit le film du tableau étape par étape (lecture directe des
// instantanés, rapide) et on n'en garde que ce que les élèves ont vu :
// les pages choisies, entre le début et la fin de la séance. Ce qui a
// été effacé AVANT la séance n'y est pas, ni le nom de l'appareil qui a
// tracé (auteur), ni le tracé brut d'une figure reconnue. Le rythme de la
// main (le temps de chaque point d'un trait) ne part qu'avec le geste où
// la classe a vu ce trait s'écrire. Les instruments (la règle qu'on pose,
// le compas qui trace) ne partent que tels que la classe les a vus sur une
// page publiée, pendant la séance : voir instrumentsDuFilm, plus bas.
// =============================================================
import type { Etape, EtatTableau, Tableau } from '../document'
import type { Fond, Forme } from '../types'
import type { Chapitre, EtapeFilm, FilmEleve, Op, PageFilm } from './format'
import { FORMAT, VERSION } from './format'
import { lireTemps } from './main-levee'
import type { EtatInstruments, InstrumentVu, Morceau, Piece } from './instruments-film'
import { APRES_L_ETAPE, IndexPieces, LecturePiste, cleDe, ecrireMorceau, memeEtat, morceauxEntre } from './instruments-film'

/** Les découpages proposés, en minutes : un silence plus long sépare deux
 *  séances. Le premier est celui qu'on prend sans rien régler. */
export const DECOUPAGES = [20, 10, 5, 2] as const

/** Un écart de plus de 20 minutes entre deux gestes : une autre séance */
const ENTRE_DEUX_SEANCES = DECOUPAGES[0] * 60 * 1000

/** Une séance repérée dans le film : de l'étape `de` à l'étape `a` (incluses) */
export interface Seance {
  de: number
  a: number
  debut: number
  fin: number
  gestes: number
  /** Les pages où l'on a écrit, dans l'ordre où on les a vues */
  pages: string[]
}

/** Les séances du film, de la plus récente à la plus ancienne. On coupe à
 *  chaque silence plus long que `ecart` et à chaque changement de jour. */
export function seancesDuFilm(film: readonly Etape[], ecart = ENTRE_DEUX_SEANCES): Seance[] {
  const r: Seance[] = []
  let cour: Seance | null = null
  film.forEach((e, i) => {
    const prec = i ? film[i - 1] : null
    const coupe = !prec || e.t - prec.t > ecart || new Date(e.t).toDateString() !== new Date(prec.t).toDateString()
    if (coupe || !cour) { cour = { de: i, a: i, debut: e.t, fin: e.t, gestes: 0, pages: [] }; r.push(cour) }
    cour.a = i; cour.fin = e.t; cour.gestes++
    if (e.page && !cour.pages.includes(e.page)) cour.pages.push(e.page)
  })
  return r.reverse()
}

export interface Choix {
  de: number            // première étape du film du tableau (incluse)
  a: number             // dernière étape (incluse)
  pages: string[]       // les pages à publier
  titre: string
}

/** Arrondi au dixième : le film pèse deux fois moins, l'œil n'y voit rien */
const r1 = (v: number) => Math.round(v * 10) / 10
const r2 = (v: number) => Math.round(v * 100) / 100

/** Ce qu'une forme garde dans le film élève */
function nettoyer(f: Forme): Forme {
  const { auteur: _a, ...reste } = f as Forme & { brut?: unknown }
  const c = { ...reste } as Record<string, unknown>
  delete c.brut
  if (f.type === 'trait') c.pts = f.pts.map((v, i) => i % 3 === 2 ? r2(v) : r1(v))
  return c as unknown as Forme
}

/** instruments : false pour ne pas chercher les instruments (quand on ne veut
 *  du film que ses pages, ses gestes ou ses chapitres) */
export interface OptionsExport { instruments?: boolean }

/** Le film élève d'une séance */
export function exporter(tableau: Tableau, choix: Choix, options: OptionsExport = {}): FilmEleve { return exporterDetaille(tableau, choix, options).film }

/** Le film élève, et pour chacun de ses gestes l'étape du tableau dont il vient (pour les tests) */
export function exporterDetaille(tableau: Tableau, choix: Choix, options: OptionsExport = {}): { film: FilmEleve; sources: number[] } {
  const film = tableau.film.toArray()
  const de = Math.max(0, Math.min(choix.de, film.length - 1)), a = Math.max(de, Math.min(choix.a, film.length - 1))
  const gardees = new Set(choix.pages)
  const propres = new Map<Forme, Forme>()                 // une forme n'est nettoyée qu'une fois
  const propre = (f: Forme) => { let c = propres.get(f); if (!c) { c = nettoyer(f); propres.set(f, c) } return c }
  const vide: EtatTableau = { ordre: [], pages: new Map() }

  // L'état juste AVANT le premier geste de la séance : le film rejoue ce geste
  let avant = de > 0 ? tableau.etatA(film[de - 1]) : vide
  // Les gestes d'ouverture qui ne font qu'effacer (« Effacer la page » à
  // l'arrivée de la classe) : le film part d'après eux. Ce qu'ils effacent
  // appartient à la séance d'avant, et ne part pas chez les élèves.
  let debut = de
  while (debut <= a) {
    const e = tableau.etatA(film[debut])
    const ops = [...gardees].flatMap(id => differences(avant.pages.get(id), e.pages.get(id), propre))
    if (ops.length && !ops.every(o => o[0] === '-' || o[0] === 'x')) break
    avant = e; debut++
  }
  const depart = avant

  const etapes: EtapeFilm[] = []
  const sources: number[] = []
  let attente = 0                                        // le temps des gestes sans rien de visible
  let ordre = avant.ordre.filter(id => gardees.has(id))
  let derniere = ''                                      // la page montrée au dernier geste
  for (let i = debut; i <= a; i++) {
    const etat = tableau.etatA(film[i])
    const parPage = new Map<string, Op[]>()
    for (const id of gardees) {
      const o = differences(avant.pages.get(id), etat.pages.get(id), propre)
      // Une page jetée n'a plus rien à montrer : on ne la rejoue pas
      if (o.length && !(o.length === 1 && o[0][0] === 'x')) parPage.set(id, o)
    }
    // Le silence d'avant la séance ne compte pas
    const dt = i > debut ? film[i].t - film[i - 1].t : 0
    const vue = film[i].page
    if (!parPage.size) {
      // Rien de visible n'a changé ; mais si l'on a jeté la page qu'on montrait,
      // le replay suit le professeur sur celle qu'il regarde maintenant
      if (derniere && !etat.pages.has(derniere) && gardees.has(vue) && etat.pages.has(vue) && vue !== derniere) {
        etapes.push({ dt: Math.max(0, Math.round(dt + attente)), p: vue, o: [] }); sources.push(i)
        derniere = vue; attente = 0
      } else attente += dt
      avant = etat; continue
    }
    // Plusieurs pages touchées d'un coup (rare) : un geste par page
    const ordreTouche = [...parPage.keys()].sort((x, y) => (x === vue ? -1 : 0) - (y === vue ? -1 : 0))
    let ms = film[i].ms
    ordreTouche.forEach((p, k) => {
      const g: EtapeFilm = { dt: k ? 0 : Math.max(0, Math.round(dt + attente)), p, o: parPage.get(p)! }
      // Le rythme du trait que ce geste a tracé à la main, avec lui seul
      if (ms && tracePose(g.o, avant.pages.get(p), ms)) { g.ms = [...ms]; ms = undefined }
      etapes.push(g)
      sources.push(i)
      derniere = p
    })
    attente = 0
    for (const id of etat.ordre) if (gardees.has(id) && !ordre.includes(id)) ordre.push(id)
    avant = etat
  }

  // Ne part que ce que le lecteur montrera : les pages où il s'est passé
  // quelque chose pendant la séance (une page cochée sans geste n'est jamais
  // montrée ; elle ne doit donc pas partir non plus)
  const montrees = new Set(etapes.map(e => e.p))
  if (!montrees.size) {
    const premiere = depart.ordre.find(id => gardees.has(id) && depart.pages.has(id))
    if (premiere) montrees.add(premiere)
  }
  const pages: PageFilm[] = []
  for (const [id, p] of depart.pages) {
    if (!montrees.has(id)) continue
    pages.push({ id, fond: p.fond, origine: p.origine, formes: [...p.formes.values()].map(propre) })
  }
  // L'ordre final des pages (celui du tableau), complété de celles qu'on a vues passer
  const fin = avant.ordre.filter(id => montrees.has(id))
  ordre = [...fin, ...ordre.filter(id => montrees.has(id) && !fin.includes(id))]

  // Les images utilisées, et elles seules
  const banque = tableau.doc.getMap('images')
  const images: Record<string, string> = {}
  const noter = (f: Forme) => {
    if (f.type !== 'image' || images[f.src]) return
    const d = banque.get(f.src)
    if (typeof d === 'string' && d.startsWith('data:image/')) images[f.src] = d
  }
  pages.forEach(p => p.formes.forEach(noter))
  etapes.forEach(e => e.o.forEach(o => { if (o[0] === '=') noter(o[1]) }))

  const resultat: FilmEleve = {
    format: FORMAT, v: VERSION, titre: choix.titre.trim() || 'Séance',
    date: film[debut <= a ? debut : de]?.t ?? Date.now(),
    ordre, pages, etapes,
    chapitres: chapitresAuto(etapes, ordre, pages),
    images,
  }
  if (options.instruments !== false && tableau.piste.length && etapes.length) {
    const heures = sources.map(k => film[k].t)
    // De la piste, on ne relit que ce qui sert à la séance : elle garde toute l'année
    const piste = new LecturePiste(morceauxEntre(tableau.piste.toArray(), heures[0] - AVANT_PROPOS, heures[heures.length - 1] + APRES_L_ETAPE + EPILOGUE))
    const i = instrumentsDuFilm(piste, etapes, heures, film[sources[0] - 1]?.t ?? -Infinity, film[sources[sources.length - 1] + 1]?.t ?? Infinity)
    if (i.depart.length) resultat.instruments = i.depart
    if (i.avant > 0) resultat.avant = i.avant
  }
  return { film: resultat, sources }
}

/** Au plus ce temps d'avant le premier geste (ms) : on rejoue la mise en place
 *  des instruments qui le précède (la règle qu'on pose avant le premier trait) */
export const AVANT_PROPOS = 60_000
/** Au bout du film, au plus ce temps après le dernier geste (ms) : on rejoue
 *  les instruments qu'on range après lui (l'épilogue de sa page) */
export const EPILOGUE = 60_000

/** Les instruments du film élève. `heures` : l'heure de l'étape d'où vient
 *  chaque geste ; `precedente` : celle de l'étape d'avant le premier ;
 *  `suivante` : celle de l'étape du tableau qui suit le dernier.
 *  Le geste j rejoue ce que les instruments ont fait dans ]heure j−1, heure j]
 *  (pour le premier : l'avant-propos, au plus une minute, après l'étape
 *  d'avant), et seulement sur la page de ce geste, qui est publiée : un
 *  mouvement fait sur une autre page, ou une page non publiée, ne part pas.
 *  On simule ce que le lecteur aura reconstruit ; s'il diffère de l'état vrai
 *  à la fin d'un geste (un instrument bougé ailleurs), un « saut » remet l'état
 *  vrai, celui que la classe avait sous les yeux à ce moment-là. Le dernier
 *  geste d'une page (on la quitte ensuite, ou le film finit) emporte aussi son
 *  épilogue : ce que les instruments font encore sur cette page jusqu'au geste
 *  suivant (au bout du film : au plus une minute, jusqu'à l'étape suivante du
 *  tableau). Les morceaux sont ceux de la piste, coupés aux bords de leur
 *  fenêtre, datés depuis l'image d'avant (l'épilogue : depuis la fin de la
 *  fenêtre du geste), sans page. Écrit dans les gestes (inst, apres) ; rend
 *  l'état de départ et l'avant-propos. */
export function instrumentsDuFilm(piste: LecturePiste, etapes: EtapeFilm[], heures: number[], precedente: number, suivante = Infinity): { depart: Morceau[]; avant: number } {
  // Chaque fenêtre se coupe juste après son étape : la dernière pose du geste
  // est peinte une image d'écran après lui (voir APRES_L_ETAPE)
  const fin = (j: number) => heures[j] + APRES_L_ETAPE
  const debut0 = Math.max(heures[0] - AVANT_PROPOS, precedente + APRES_L_ETAPE)
  const premier = piste.premierDans(debut0, fin(0), etapes[0].p)
  // La fenêtre du premier geste commence juste avant le premier mouvement
  const origine = premier === null ? fin(0) : Math.max(debut0, premier - 1)
  let sim: EtatInstruments = piste.etatA(origine)
  const depart = [...sim.values()].sort((x, y) => x.rang - y.rang).map(i => instantane(i, 0))
  etapes.forEach((g, j) => {
    const a = j ? fin(j - 1) : origine, b = fin(j)
    const d = piste.dans(a, b, g.p)
    const morceaux: { t: number; m: Morceau }[] = []
    for (const x of d.poses) morceaux.push({ t: x.t0, m: ecrireMorceau(x, a) })
    for (const x of d.traces) morceaux.push({ t: x.t0, m: ecrireMorceau(x, a) })
    morceaux.sort((x, y) => x.t - y.t)
    if (d.poses.length) sim = new IndexPieces(d.poses, sim).fin
    // Les raccords : l'état vrai au geste, s'il n'est pas celui qu'on a rejoué
    const vrai = piste.etatA(b)
    for (const [cle, i] of sim) if (!vrai.has(cle)) morceaux.push({ t: b, m: ecrireMorceau(rangeIci(i, b - a)) })
    for (const [cle, i] of vrai) {
      const s = sim.get(cle)
      if (!s || !memeEtat(s.etat, i.etat)) morceaux.push({ t: b, m: instantane(i, b - a, true) })
    }
    sim = vrai
    if (morceaux.length) g.inst = morceaux.map(x => x.m)
    // L'épilogue : au dernier geste d'une page, ce que les instruments y font
    // encore avant qu'on la quitte (on range l'équerre, on pousse la règle)
    const dernier = j + 1 >= etapes.length
    if (!dernier && etapes[j + 1].p === g.p) return
    const E = dernier ? Math.min(b + EPILOGUE, suivante + APRES_L_ETAPE) : fin(j + 1)
    const e = E > b ? piste.dans(b, E, g.p) : null
    if (!e || (!e.poses.length && !e.traces.length)) return
    g.apres = [...e.poses, ...e.traces].sort((x, y) => x.t0 - y.t0).map(x => ecrireMorceau(x, b))
    if (e.poses.length) sim = new IndexPieces(e.poses, sim).fin
  })
  return { depart, avant: fin(0) - origine }
}

/** Un instrument posé là, d'un coup, à l'instant t de la fenêtre (saut : un raccord) */
function instantane(i: InstrumentVu, t: number, saut = false): Morceau {
  const p: Piece = { cle: cleDe(i.n, i.c), n: i.n, c: i.c, q: i.q, visible: true, saut, p: null, t0: t, poses: [{ t, ...i.etat }] }
  return ecrireMorceau(p)
}

/** L'instrument rangé, d'un coup, à l'instant t de la fenêtre */
function rangeIci(i: InstrumentVu, t: number): Piece {
  return { cle: cleDe(i.n, i.c), n: i.n, c: i.c, q: null, visible: false, saut: true, p: null, t0: t, poses: [] }
}

/** Les pages où il se passe quelque chose pendant une séance (celles que le
 *  replay montrera) : ce sont elles que la fenêtre propose de publier */
export function pagesDeLaSeance(tableau: Tableau, s: Seance): string[] {
  const toutes = new Set<string>(s.pages)
  for (let i = s.de; i <= s.a; i++) for (const p of tableau.etatA(tableau.film.get(i)).ordre) toutes.add(p)
  const f = exporter(tableau, { de: s.de, a: s.a, pages: [...toutes], titre: '' }, { instruments: false })
  return f.ordre
}

/** Ces opérations posent-elles un trait neuf (absent de la page d'avant) qui
 *  va avec ces temps, un par point ? */
function tracePose(o: Op[], avant: { formes: Map<string, Forme> } | undefined, ms: number[]): boolean {
  return o.some(op => op[0] === '=' && op[1].type === 'trait' && !avant?.formes.has(op[1].id) && !!lireTemps(ms, op[1].pts.length / 3))
}

/** Ce qui a changé sur une page d'un état à l'autre */
function differences(
  a: { fond: Fond; origine: { x: number; y: number }; formes: Map<string, Forme> } | undefined,
  b: { fond: Fond; origine: { x: number; y: number }; formes: Map<string, Forme> } | undefined,
  propre: (f: Forme) => Forme,
): Op[] {
  if (!a && !b) return []
  if (a && !b) return [['x']]
  const o: Op[] = []
  if (!a || a.fond !== b!.fond || a.origine.x !== b!.origine.x || a.origine.y !== b!.origine.y) o.push(['f', b!.fond, b!.origine.x, b!.origine.y])
  for (const [id, f] of b!.formes) if (a?.formes.get(id) !== f) o.push(['=', propre(f)])
  if (a) for (const id of a.formes.keys()) if (!b!.formes.has(id)) o.push(['-', id])
  return o
}

/** Un chapitre à chaque changement de page */
function chapitresAuto(etapes: EtapeFilm[], ordre: string[], pages: PageFilm[]): Chapitre[] {
  const titre = (p: string) => ordre.length > 1 ? `Page ${ordre.indexOf(p) + 1}` : 'La séance'
  const premiere = etapes[0]?.p ?? pages[0]?.id ?? ''
  const r: Chapitre[] = [{ i: 0, titre: titre(premiere) }]
  let page = premiere
  etapes.forEach((e, k) => {
    if (e.p === page) return
    page = e.p
    r.push({ i: k + 1, titre: titre(e.p) })
  })
  return r
}
