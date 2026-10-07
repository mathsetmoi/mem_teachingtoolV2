// =============================================================
// DU FILM DU TABLEAU AU FILM ÉLÈVE
// On relit le film du tableau étape par étape (lecture directe des
// instantanés, rapide) et on n'en garde que ce que les élèves ont vu :
// les pages choisies, entre le début et la fin de la séance. Ce qui a
// été effacé AVANT la séance n'y est pas, ni le nom de l'appareil qui a
// tracé (auteur), ni le tracé brut d'une figure reconnue.
// =============================================================
import type { Etape, EtatTableau, Tableau } from '../document'
import type { Fond, Forme } from '../types'
import type { Chapitre, EtapeFilm, FilmEleve, Op, PageFilm } from './format'
import { FORMAT, VERSION } from './format'

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

/** Le film élève d'une séance */
export function exporter(tableau: Tableau, choix: Choix): FilmEleve { return exporterDetaille(tableau, choix).film }

/** Le film élève, et pour chacun de ses gestes l'étape du tableau dont il vient (pour les tests) */
export function exporterDetaille(tableau: Tableau, choix: Choix): { film: FilmEleve; sources: number[] } {
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
    ordreTouche.forEach((p, k) => {
      etapes.push({ dt: k ? 0 : Math.max(0, Math.round(dt + attente)), p, o: parPage.get(p)! })
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
  return { film: resultat, sources }
}

/** Les pages où il se passe quelque chose pendant une séance (celles que le
 *  replay montrera) : ce sont elles que la fenêtre propose de publier */
export function pagesDeLaSeance(tableau: Tableau, s: Seance): string[] {
  const toutes = new Set<string>(s.pages)
  for (let i = s.de; i <= s.a; i++) for (const p of tableau.etatA(tableau.film.get(i)).ordre) toutes.add(p)
  const f = exporter(tableau, { de: s.de, a: s.a, pages: [...toutes], titre: '' })
  return f.ordre
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
