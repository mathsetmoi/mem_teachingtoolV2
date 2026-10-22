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
//
// Une copie de page (« Dupliquer la page ») hérite le passé de son original
// jusqu'à sa naissance (voir heritage.ts), mais seulement si l'original n'est
// pas publié avec elle. Publiée seule, elle se construit sous les yeux de
// l'élève, comme l'original s'est construit en classe, puis continue avec ce
// qu'on a fait sur elle. Publiée avec l'original, l'élève voit l'original se
// construire, puis la copie paraître d'un coup à sa naissance, comme la
// classe l'a vue (le lecteur la montre d'un coup : ses formes sont déjà
// vues). Le format du film élève ne change pas.
// =============================================================
import type { Etape, EtatDePage, EtatTableau, Tableau } from '../document'
import type { Fond, Forme } from '../types'
import { filiationDe } from '../heritage'
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
 *  chaque silence plus long que `ecart` et à chaque changement de jour.
 *  Une étape qui ne change que l'ordre des pages (une page jetée, ou rendue)
 *  n'est ni un geste, ni une page de la séance, ni une coupure : on la
 *  saute, et le silence se mesure depuis l'étape gardée d'avant. De même la
 *  naissance d'une page (une copie, « Dupliquer la page », ou une page vide,
 *  voir Etape) et le rangement de la trieuse (un fond changé sans aller sur
 *  la page) : ranger après le cours ne fait pas une séance, ni un pont entre
 *  deux cours ; ce qu'on range pendant le cours y reste (la séance va d'une
 *  étape à l'autre, celles qu'on saute comprises). De même encore un réglage
 *  (lot 5 : verrouiller, déverrouiller, grouper, dégrouper, voir Etape), qui
 *  ne change rien à l'image : verrouiller l'énoncé le lendemain, en
 *  préparant, ne fait pas une séance d'un geste que Publier choisirait
 *  d'office, et verrouiller entre deux cours ne les réunit pas.
 *  Une page qui naît juste avant le premier geste d'une séance (« Nouvelle
 *  page » en arrivant, une copie qu'on va compléter), à moins d'un écart et
 *  le même jour, est de cette séance sans en être un geste : la séance
 *  commence à sa naissance (de), son heure reste celle du premier geste
 *  (debut). La revue y voit ainsi une page neuve, comme quand la création
 *  comptait pour un geste. Un fond changé dans la trieuse entre les deux
 *  arrête cette remontée : il est d'avant la séance (l'élève voit la page
 *  avec son nouveau fond dès le départ) ; un réglage ne l'arrête pas (il ne
 *  se voit pas : la copie qu'on verrouille avant d'y écrire reste neuve). */
export function seancesDuFilm(film: readonly Etape[], ecart = ENTRE_DEUX_SEANCES): Seance[] {
  const r: Seance[] = []
  let cour: Seance | null = null
  let prec: Etape | null = null
  const jour = (t: number) => new Date(t).toDateString()
  /** Où commence la séance que le geste i ouvre : à la plus ancienne
   *  naissance de la suite de naissances (et d'étapes qui ne changent que
   *  l'ordre) qui le précède, à moins d'un écart et le même jour ; sinon à lui */
  const depart = (i: number) => {
    let de = i
    for (let k = i - 1; k >= 0; k--) {
      const x = film[k]
      if (!(x.seulOrdre || x.naissance || x.reglage) || film[i].t - x.t > ecart || jour(x.t) !== jour(film[i].t)) break
      if (x.naissance) de = k
    }
    return de
  }
  film.forEach((e, i) => {
    if (e.seulOrdre || e.naissance || e.rangement || e.reglage) return
    const coupe = !prec || e.t - prec.t > ecart || jour(e.t) !== jour(prec.t)
    prec = e
    if (coupe || !cour) { cour = { de: depart(i), a: i, debut: e.t, fin: e.t, gestes: 0, pages: [] }; r.push(cour) }
    cour.a = i; cour.fin = e.t; cour.gestes++
    if (e.page && !cour.pages.includes(e.page)) cour.pages.push(e.page)
  })
  return r.reverse()
}

/** Une séance explicite (lot 6, voir seances.ts), lue dans le film comme
 *  une séance repérée (de, a, debut, fin, gestes, pages : les pages où l'on
 *  a écrit), avec son id, son nom, son début tel qu'il est écrit (debut :
 *  sa création, la clé de sa publication) et SES pages (pagesDeSeance, dans
 *  l'ordre du document). */
export interface SeanceExplicite extends Seance {
  id: string
  nom: string | null
  ancienne: boolean
  pagesDeSeance: string[]
}

/** Les séances explicites dans le film, de la plus récente à la plus
 *  ancienne. Le film se partage en plages qui se suivent : celle d'une
 *  séance va de sa première étape (la première dont l'heure n'est pas
 *  avant son début, ou depuis pour une séance reprise du découpage d'avant)
 *  jusqu'à l'étape avant celle de la séance suivante ; la première séance
 *  prend aussi ce qui la précède (la naissance de la toute première page).
 *  Une séance sans étape a de > a. gestes, fin et pages comptent comme
 *  seancesDuFilm (ni l'ordre changé, ni une naissance, ni un rangement, ni
 *  un réglage) ; debut reste celui de la séance. */
export function seancesExplicitesDuFilm(film: readonly Etape[], seances: readonly { id: string; debut: number; depuis: number; nom: string | null; ancienne?: boolean; pages: string[] }[]): SeanceExplicite[] {
  const asc = [...seances].sort((x, y) => x.debut - y.debut)
  const departs: number[] = []
  let i = 0
  asc.forEach((s, k) => {
    if (k === 0) { departs.push(0); return }
    while (i < film.length && film[i].t < s.depuis) i++
    departs.push(Math.max(i, departs[k - 1]))
  })
  const jour = (t: number) => new Date(t).toDateString()
  const r: SeanceExplicite[] = asc.map((s, k) => {
    let de = departs[k]
    const a = (k + 1 < asc.length ? departs[k + 1] : film.length) - 1
    // Ce qui précède le premier geste (la naissance de la page 1, un ordre
    // changé, un rangement) n'est de la plage que comme dans seancesDuFilm :
    // une page qui naît juste avant le premier geste (moins de 20 minutes, le
    // même jour) en est ; plus tôt, elle est dans l'état de départ du film
    let g = de
    while (g <= a && (film[g].seulOrdre || film[g].naissance || film[g].rangement || film[g].reglage)) g++
    if (g <= a) {
      let d = g
      for (let j = g - 1; j >= de; j--) {
        const x = film[j]
        if (!(x.seulOrdre || x.naissance || x.reglage) || film[g].t - x.t > ENTRE_DEUX_SEANCES || jour(x.t) !== jour(film[g].t)) break
        if (x.naissance) d = j
      }
      de = d
    }
    const x: SeanceExplicite = { id: s.id, nom: s.nom, ancienne: !!s.ancienne, pagesDeSeance: [...s.pages], de, a, debut: s.debut, fin: s.debut, gestes: 0, pages: [] }
    for (let j = de; j <= a; j++) {
      const e = film[j]
      if (e.seulOrdre || e.naissance || e.rangement || e.reglage) continue
      x.gestes++; x.fin = Math.max(x.fin, e.t)
      if (e.page && !x.pages.includes(e.page)) x.pages.push(e.page)
    }
    return x
  })
  return r.reverse()
}

/** Le film élève d'une séance a-t-il quelque chose à montrer ? Au moins un
 *  geste (un film sans geste n'est qu'une image fixe : une séance qui n'a
 *  fait qu'effacer, ou que créer une page), et quelque chose sur ses pages. */
export function aMontrer(f: FilmEleve): boolean {
  return f.etapes.length > 0 && (f.pages.some(p => p.formes.length) || f.etapes.some(e => e.o.some(o => o[0] === '=')))
}

/** Les séances que la fenêtre Publier propose, la plus récente d'abord (la
 *  première est choisie d'office) : celles dont le film élève, avec les pages
 *  qu'elle propose, a quelque chose à montrer. */
export function seancesAPublier(tableau: Tableau, ecart = ENTRE_DEUX_SEANCES): Seance[] {
  const explicites = seancesDuTableau(tableau)
  if (explicites) return explicites.filter(s => s.de <= s.a && aMontrer(exporter(tableau, { de: s.de, a: s.a, pages: pagesAPublier(tableau, s), titre: '' }, { instruments: false })))
  return seancesDuFilm(tableau.film.toArray(), ecart)
    .filter(s => aMontrer(exporter(tableau, { de: s.de, a: s.a, pages: pagesDeLaSeance(tableau, s), titre: '' }, { instruments: false })))
}

/** Les séances explicites du tableau (lot 6), la plus récente d'abord ;
 *  null s'il n'en a pas (un tableau d'avant, les essais) */
export function seancesDuTableau(tableau: Tableau, film: readonly Etape[] = tableau.film.toArray()): SeanceExplicite[] | null {
  const l = tableau.seancesDuClasseur()
  if (!l.length) return null
  // Les pages qu'une séance a eues, même hors de l'ordre (la corbeille)
  const eues = new Map<string, string[]>()
  for (const [p, id] of tableau.seanceDesPages) { const x = eues.get(id) ?? []; x.push(p); eues.set(id, x) }
  return seancesExplicitesDuFilm(film, l.map(s => ({ ...s, pages: [...s.pages, ...(eues.get(s.id) ?? []).filter(p => !s.pages.includes(p))] })))
}

/** Les pages que Publier coche pour une séance explicite (lot 6) : SES pages,
 *  dans son ordre (celles de l'ordre du document), puis celles qu'on a
 *  jetées pendant elle et où il s'est passé quelque chose ; pour une séance reprise
 *  du découpage d'avant, aussi les pages où l'on a écrit pendant elle (une
 *  page née dans une séance et continuée dans la suivante y était publiée,
 *  elle l'est encore). */
export function pagesAPublier(tableau: Tableau, s: SeanceExplicite): string[] {
  const ordre = new Set(tableau.ordre.toArray())
  const vues = pagesDeLaSeance(tableau, s)
  const siennes = s.pagesDeSeance.filter(p => ordre.has(p))
  // Une page de la séance jetée pendant elle, où il s'est passé quelque chose
  // (pas la page 1 vide qu'une page reprise a remplacée : elle n'a rien)
  const jetees = vues.filter(p => !ordre.has(p) && s.pagesDeSeance.includes(p) && (tableau.formesDe(p)?.size ?? 0) > 0)
  const autres = s.ancienne ? vues.filter(p => !siennes.includes(p) && !jetees.includes(p)) : []
  return [...siennes, ...jetees, ...autres]
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

/** Ce qu'une forme garde dans le film élève : tout, sauf l'auteur et le tracé
 *  brut d'une figure reconnue. Les champs du lot 5 (verrou, fixe, groupe, la
 *  rotation d'une formule) y passent donc : des ajouts facultatifs, qu'un
 *  lecteur d'avant ignore (il peint une image fixée par son z, sous les
 *  autres images ; une formule tournée, droite). */
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

  // Les copies de pages : une page publiée qui est la copie d'une page non
  // publiée se lit, avant sa naissance, dans la page d'où elle vient. Un
  // passé ne se montre jamais deux fois : l'héritage s'arrête à une page
  // publiée, et à une page dont une autre page publiée, née avant, descend
  // aussi (deux copies d'un même énoncé publiées sans lui : la première se
  // construit, la seconde paraît d'un coup à sa naissance ; sans quoi chaque
  // geste de l'énoncé se jouerait sur les deux pages, tour à tour, avec un
  // chapitre à chaque fois).
  const fil = filiationDe(tableau, film)
  const arrets = new Map<string, (o: string) => boolean>()
  if (fil.copies) {
    const lignees = [...gardees].map(id => ({ id, nee: fil.naissance(id), ascendants: new Set(fil.ascendants(id)) }))
    for (const { id, nee } of lignees) {
      const avant = lignees.filter(x => x.id !== id && x.nee >= 0 && x.nee < nee)
      arrets.set(id, o => gardees.has(o) || avant.some(x => x.ascendants.has(o)))
    }
  }
  /** La page publiée `id` juste après l'étape i : quelle page lire (null : elle n'existe pas encore) */
  const sourceDe = (id: string, i: number) => fil.source(id, i, arrets.get(id))
  /** Le tableau juste après l'étape i (−1 : avant tout), vu par le film élève */
  const etatA = (i: number): EtatTableau => resoudre(i < 0 ? vide : tableau.etatA(film[i]), i, gardees, sourceDe, fil.copies)
  /** À l'étape i, la source de la page publiée change-t-elle (sa naissance,
   *  après le passé hérité d'une autre page) ? */
  const jonction = (id: string, i: number) => fil.copies && sourceDe(id, i - 1) !== sourceDe(id, i)

  // L'état juste AVANT le premier geste de la séance : le film rejoue ce geste
  let avant = etatA(de - 1)
  // Les gestes d'ouverture qui ne font qu'effacer (« Effacer la page » à
  // l'arrivée de la classe) : le film part d'après eux. Ce qu'ils effacent
  // appartient à la séance d'avant, et ne part pas chez les élèves. Un
  // réglage (lot 5 : l'énoncé qu'on verrouille en arrivant, voir Etape) ne
  // commence pas le film non plus : il ne montre rien, et son changement est
  // dans l'état de départ.
  let debut = de
  while (debut <= a) {
    const e = etatA(debut)
    if (!film[debut].reglage) {
      const ops = [...gardees].flatMap(id => differences(avant.pages.get(id), e.pages.get(id), propre, jonction(id, debut)))
      if (ops.length && !ops.every(o => o[0] === '-' || o[0] === 'x')) break
    }
    avant = e; debut++
  }
  const depart = avant

  const etapes: EtapeFilm[] = []
  const sources: number[] = []
  let attente = 0                                        // le temps des gestes sans rien de visible
  let ordre = avant.ordre.filter(id => gardees.has(id))
  let derniere = ''                                      // la page montrée au dernier geste
  /** Le replay suit le professeur quand on jette la page qu'il montrait (le
   *  pas vide qui change de page). Ce pas n'est écrit qu'au geste visible
   *  suivant, ou au bout : si la page revient d'abord (« Annuler », Ctrl+Z),
   *  le replay ne l'a jamais quittée, et son attente revient au geste
   *  suivant. Plusieurs jets de suite, sans geste entre eux, s'empilent
   *  (on jette la page 2, on arrive sur la 1, on la jette aussi) : une page
   *  qui revient défait son jet et ceux d'après, et si rien ne revient, un
   *  seul pas vide part, vers la page où l'on est arrivé en dernier, avec le
   *  temps de tous (les pages traversées sans y écrire ne se montrent pas,
   *  pas plus qu'une page qu'on regarde sans rien y faire). Chaque jet :
   *  quittee, la page jetée ; attente, le temps qu'il emportait. */
  const suivre: { g: EtapeFilm; source: number; quittee: string; attente: number }[] = []
  const ecrireSuivre = () => {
    const haut = suivre[suivre.length - 1]
    if (!haut) return
    const temps = suivre.reduce((s, x) => s + x.attente, 0)
    etapes.push({ ...haut.g, dt: Math.max(0, Math.round(temps)) }); sources.push(haut.source)
    suivre.length = 0
  }
  /** Les réglages (lot 5 : verrouiller, déverrouiller, grouper, dégrouper,
   *  voir Etape) ne sont pas des gestes du film élève : ils ne changent rien
   *  à l'image. Leur étape passe comme une étape sans rien de visible (son
   *  temps va à l'attente du geste suivant), et les formes qu'ils ont
   *  réglées, par page, attendent ici le prochain geste visible de LEUR page,
   *  qui les emporte telles qu'elles sont alors. Pas le prochain geste
   *  visible tout court : sur une autre page, il ferait un geste de plus
   *  sur celle-ci, qui ne montrerait rien (et y emmènerait le replay) ; ni
   *  le prochain changement, quel qu'il soit : une étape notée sur une page
   *  qu'on ne publie pas deviendrait un geste. Au bout du film, ce qui
   *  attend encore ne part pas : rien ne le montrait. */
  const reglees = new Map<string, Set<string>>()
  /** Une page neuve, encore vide, ne se montre pas à sa naissance : son fond
   *  attend ici le premier geste écrit sur ELLE, et paraît avec lui. Sans
   *  quoi des pages créées d'avance (un ancien tableau repris, voir
   *  classeurs/ancien-tableau.ts ; « Nouvelle page » deux fois de suite)
   *  feraient chacune un chapitre vide au début du replay, l'élève y
   *  relançant la lecture pour rien. Une page qu'on n'écrit jamais ne part
   *  pas (voir montrees). */
  const naissances = new Map<string, Op[]>()
  for (let i = debut; i <= a; i++) {
    const etat = etatA(i)
    const parPage = new Map<string, Op[]>()
    for (const id of gardees) {
      const o = differences(avant.pages.get(id), etat.pages.get(id), propre, jonction(id, i))
      const av = avant.pages.get(id)
      if (film[i].reglage && o.length && o.every(op => op[0] === '=' && !!av?.formes.has(op[1].id))) {
        let r = reglees.get(id)
        if (!r) reglees.set(id, r = new Set())
        for (const op of o) r.add((op[1] as Forme).id)
        continue
      }
      if (!av && o.length && o.every(op => op[0] === 'f') && !etat.pages.get(id)?.formes.size) { naissances.set(id, o); continue }
      // Une page jetée n'a plus rien à montrer : on ne la rejoue pas
      if (o.length && !(o.length === 1 && o[0][0] === 'x')) {
        const n = naissances.get(id)
        if (n) { o.unshift(...n); naissances.delete(id) }
        const r = reglees.get(id), formes = etat.pages.get(id)?.formes
        if (r && formes) {
          // Ce que les réglages d'avant ont changé part avec ce geste-ci
          const deja = new Set(o.map(op => op[0] === '=' ? op[1].id : op[0] === '-' ? op[1] : ''))
          for (const fid of r) { const f = formes.get(fid); if (f && !deja.has(fid)) o.push(['=', propre(f)]) }
          reglees.delete(id)
        }
        parPage.set(id, o)
      }
    }
    // Le silence d'avant la séance ne compte pas
    const dt = i > debut ? film[i].t - film[i - 1].t : 0
    const vue = film[i].page
    if (!parPage.size) {
      // Rien de visible n'a changé ; mais si l'on a jeté la page qu'on montrait,
      // le replay suit le professeur sur celle qu'il regarde maintenant. On le
      // lit sur l'ordre : une page jetée garde ses formes (voir
      // Tableau.jeterPage) ; sur un tableau d'avant, elle manquait aux deux.
      const revient = suivre.findIndex(x => etat.ordre.includes(x.quittee))
      if (revient >= 0) {
        // Une page jetée revient avant tout autre geste : on ne l'a pas
        // quittée, ni celles où l'on est passé depuis
        derniere = suivre[revient].quittee
        attente += suivre.splice(revient).reduce((s, x) => s + x.attente, 0) + dt
      } else if (derniere && !etat.ordre.includes(derniere) && gardees.has(vue) && etat.ordre.includes(vue) && vue !== derniere) {
        suivre.push({ g: { dt: 0, p: vue, o: [] }, source: i, quittee: derniere, attente: dt + attente })
        derniere = vue; attente = 0
      } else attente += dt
      avant = etat; continue
    }
    ecrireSuivre()
    // Plusieurs pages touchées d'un coup (rare) : un geste par page
    const ordreTouche = [...parPage.keys()].sort((x, y) => (x === vue ? -1 : 0) - (y === vue ? -1 : 0))
    let ms = film[i].ms
    ordreTouche.forEach((p, k) => {
      const g: EtapeFilm = { dt: k ? 0 : Math.max(0, Math.round(dt + attente)), p, o: parPage.get(p)! }
      // Un trait coupé par la gomme qui efface là où elle passe (lot 5) : le
      // lecteur fait paraître ses morceaux d'un coup (voir EtapeFilm.coupe)
      if (film[i].coupe) g.coupe = true
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
  ecrireSuivre()

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
    pages.push({ id, fond: p.fond, ...(p.nuit ? { nuit: true as const } : {}), origine: p.origine, formes: [...p.formes.values()].map(propre) })
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
    // La piste a noté la page où l'on était : pour un geste hérité par une
    // copie, la page d'où elle vient
    const pistes = fil.copies ? etapes.map((g, j) => sourceDe(g.p, sources[j]) ?? g.p) : undefined
    const i = instrumentsDuFilm(piste, etapes, heures, film[sources[0] - 1]?.t ?? -Infinity, film[sources[sources.length - 1] + 1]?.t ?? Infinity, pistes)
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
 *  `suivante` : celle de l'étape du tableau qui suit le dernier ; `pistes` :
 *  pour chaque geste, la page que la piste a notée (celle du geste, sauf
 *  pour le passé hérité d'une copie : la page d'où elle vient).
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
export function instrumentsDuFilm(piste: LecturePiste, etapes: EtapeFilm[], heures: number[], precedente: number, suivante = Infinity, pistes?: readonly string[]): { depart: Morceau[]; avant: number } {
  const pageDe = (j: number) => pistes?.[j] ?? etapes[j].p
  // Chaque fenêtre se coupe juste après son étape : la dernière pose du geste
  // est peinte une image d'écran après lui (voir APRES_L_ETAPE)
  const fin = (j: number) => heures[j] + APRES_L_ETAPE
  const debut0 = Math.max(heures[0] - AVANT_PROPOS, precedente + APRES_L_ETAPE)
  const premier = piste.premierDans(debut0, fin(0), pageDe(0))
  // La fenêtre du premier geste commence juste avant le premier mouvement
  const origine = premier === null ? fin(0) : Math.max(debut0, premier - 1)
  let sim: EtatInstruments = piste.etatA(origine)
  const depart = [...sim.values()].sort((x, y) => x.rang - y.rang).map(i => instantane(i, 0))
  etapes.forEach((g, j) => {
    const a = j ? fin(j - 1) : origine, b = fin(j)
    const d = piste.dans(a, b, pageDe(j))
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
    const e = E > b ? piste.dans(b, E, pageDe(j)) : null
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
 *  replay montrera) : ce sont elles que la fenêtre propose de publier. Pas
 *  une copie qui a quitté le tableau (retirée par Ctrl+Z juste après
 *  « Dupliquer la page », ou supprimée) sans rien avoir reçu à elle pendant
 *  la séance : son histoire est celle de son original, qui se publie déjà ;
 *  proposée, elle rejouerait l'original une seconde fois si on décochait
 *  celui-ci (la revue ne la range pas non plus dans « Pages jetées »). Un
 *  réglage (verrouiller, grouper : voir Etape) n'est pas reçu à elle. */
export function pagesDeLaSeance(tableau: Tableau, s: Seance): string[] {
  const toutes = new Set<string>(s.pages)
  const film = tableau.film.toArray()
  for (let i = s.de; i <= s.a; i++) for (const p of tableau.etatA(film[i]).ordre) toutes.add(p)
  const fil = filiationDe(tableau, film)
  if (fil.copies) {
    const actuelles = new Set(tableau.ordre.toArray())
    const aSesGestes = new Set<string>()
    for (let i = Math.max(0, s.de); i <= Math.min(s.a, film.length - 1); i++) {
      const e = film[i]
      if (e.page && !e.seulOrdre && !e.reglage && fil.naissance(e.page) !== i) aSesGestes.add(e.page)
    }
    for (const p of [...toutes]) if (!actuelles.has(p) && fil.origineDe(p) && !aSesGestes.has(p)) toutes.delete(p)
  }
  const f = exporter(tableau, { de: s.de, a: s.a, pages: [...toutes], titre: '' }, { instruments: false })
  return f.ordre
}

/** Ces opérations posent-elles un trait neuf (absent de la page d'avant) qui
 *  va avec ces temps, un par point ? */
function tracePose(o: Op[], avant: { formes: Map<string, Forme> } | undefined, ms: number[]): boolean {
  return o.some(op => op[0] === '=' && op[1].type === 'trait' && !avant?.formes.has(op[1].id) && !!lireTemps(ms, op[1].pts.length / 3))
}

/** Ce qui a changé sur une page d'un état à l'autre. Une forme qui n'a pas
 *  changé est le même objet. jonction : on passe du passé hérité d'une copie
 *  à la copie elle-même (sa naissance) ; ses formes sont des copies de
 *  celles de la page d'où elle vient, sous les mêmes identifiants : une
 *  forme au contenu égal n'a pas changé (sans quoi la naissance serait un
 *  geste qui « change » tout sans rien montrer). */
function differences(
  a: EtatDePage | undefined,
  b: EtatDePage | undefined,
  propre: (f: Forme) => Forme,
  jonction = false,
): Op[] {
  if (!a && !b) return []
  if (a && !b) return [['x']]
  const o: Op[] = []
  // Le mode nuit part avec le fond, en cinquième valeur (1 : de nuit), et
  // seulement s'il y a lieu : une page de jour s'écrit comme avant
  if (!a || a.fond !== b!.fond || !!a.nuit !== !!b!.nuit || a.origine.x !== b!.origine.x || a.origine.y !== b!.origine.y) {
    o.push(b!.nuit || a?.nuit ? ['f', b!.fond, b!.origine.x, b!.origine.y, b!.nuit ? 1 : 0] : ['f', b!.fond, b!.origine.x, b!.origine.y])
  }
  for (const [id, f] of b!.formes) {
    const g = a?.formes.get(id)
    if (g !== f && !(jonction && g && JSON.stringify(g) === JSON.stringify(f))) o.push(['=', propre(f)])
  }
  if (a) for (const id of a.formes.keys()) if (!b!.formes.has(id)) o.push(['-', id])
  return o
}

/** Le tableau vu par le film élève : chaque page publiée qui est une copie,
 *  avant sa naissance, prend l'état de la page d'où elle hérite (sourceDe ;
 *  null : elle n'existe pas encore). Dans l'ordre, une page ainsi résolue
 *  sur une autre qui n'y est pas encore se range juste après sa source (à
 *  la fin si la source n'y est pas) : sans cela, avant sa naissance, la
 *  copie aurait des gestes sans être dans l'ordre, et la règle « suivre »
 *  prendrait une étape sans effet notée sur une autre page publiée (jeter,
 *  remettre, déplacer des pages depuis elle) pour l'abandon de la copie : un
 *  pas vide vers l'autre page, puis le retour. Sans copie : l'état tel quel. */
function resoudre(etat: EtatTableau, i: number, gardees: ReadonlySet<string>, sourceDe: (id: string, i: number) => string | null, copies: boolean): EtatTableau {
  if (!copies) return etat
  let pages: EtatTableau['pages'] | null = null
  const rangees: [string, string][] = []
  for (const id of gardees) {
    const s = sourceDe(id, i)
    if (s === id) continue
    pages ??= new Map(etat.pages)
    const p = s === null ? undefined : etat.pages.get(s)
    if (p) { pages.set(id, p); rangees.push([id, s!]) } else pages.delete(id)
  }
  if (!pages) return etat
  const ordre = etat.ordre.filter(id => !gardees.has(id) || pages!.has(id))
  for (const [id, s] of rangees) {
    if (ordre.includes(id)) continue
    const k = ordre.indexOf(s)
    if (k >= 0) ordre.splice(k + 1, 0, id); else ordre.push(id)
  }
  return { ordre, pages }
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
