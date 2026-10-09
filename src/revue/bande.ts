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
// suivent à moins de deux secondes (stylo levé, quand le film connaît le
// rythme de la main) forment une seule idée (un mot, une figure et ses
// noms). La télécommande avance d'un pas à la fois.
//
// Le temps : un trait tracé à la main dont le film a noté le rythme (voir
// revoir/main-levee.ts) s'écrit à la fin de l'attente de son image, à la
// vitesse de la main ; l'attente qui le précède est le vrai temps stylo levé.
// Ce que les instruments ont fait avant un geste (la piste du tableau, voir
// revoir/instruments-film.ts) se rejoue de même, avant le trait : la
// manipulation fait partie du tracé de l'image. Ce qu'ils font sur une page
// après son dernier geste, avant qu'on la quitte (on range l'équerre, on
// pousse la règle), est une image de plus, sans geste : l'épilogue de la
// page. La fin d'une partie et l'affiche montrent ainsi les instruments tels
// que la classe les a vus en quittant la page.
//
// Une copie de page (« Dupliquer la page ») a pour histoire celle de son
// original jusqu'à sa naissance, puis la sienne (voir heritage.ts) : les
// étapes héritées sont notées sur l'original mais se montrent sur la copie,
// et sa naissance n'est jamais un geste (elle ne montre rien de neuf).
// =============================================================
import type { Seance } from '../revoir/exporter'
import { AVANT_PROPOS, EPILOGUE } from '../revoir/exporter'
import { dureesDuTrace } from '../revoir/main-levee'
import type { EtatInstruments, GesteAuxInstruments } from '../revoir/instruments-film'
import { APRES_L_ETAPE, IndexPieces, finDesPieces, horaire } from '../revoir/instruments-film'
import { PLANCHER, tasser } from '../revoir/rythme'
import type { LectureSeule } from './planches'
import { departPropre, memeImage } from './planches'

export type Portion =
  | { genre: 'seance'; seance: Seance; page: string | null }   // page null : toutes les pages de la séance
  | { genre: 'page'; page: string }                            // toute l'histoire d'une page

/** L'état de la page p après l'étape e du film (e = −1 : avant tout).
 *  geste : false pour l'image 0, pour l'ouverture d'une partie et pour
 *  l'épilogue d'une page. main : l'étape où ce geste a tracé un trait à la
 *  main, dont le film a noté le rythme. C'est e, ou, dans un geste fondu,
 *  l'étape du trait que la figure reconnue remplace : le trait s'écrit, puis
 *  la figure paraît, comme au tableau. epilogue : la page ne change pas, seuls
 *  les instruments bougent (ce qu'ils y font après son dernier geste). */
export interface ImageBande { e: number; p: string; geste: boolean; main?: number; epilogue?: true }

/** Une partie : ses images de debut à fin (incluses), sa page, l'heure de son premier geste */
export interface Partie { debut: number; fin: number; page: string; heure: number; titre: string }

export interface Bande {
  portion: Portion
  images: ImageBande[]
  /** L'attente avant chaque image, en ms, à l'allure Normale (son tracé à la main compris) */
  attentes: Float64Array
  /** Le temps que chaque image met à s'écrire à la main, à la fin de son
   *  attente (ms, allure Normale ; 0 : elle paraît d'un coup) */
  traces: Float64Array
  parties: Partie[]
  /** Les images où l'on s'arrête en allant pas à pas (triées, sans doublon) */
  bornes: number[]
  /** Le nombre de gestes montrés jusqu'à l'image k, incluse */
  gestes: Int32Array
  total: number
  /** Si le tableau a noté ses instruments : leur état à chaque image, et ce
   *  qu'ils font avant chaque geste (null : rien ne bouge). Absents sinon. */
  etats?: EtatInstruments[]
  manips?: (GesteAuxInstruments | null)[]
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

/** Les étapes du film qui appartiennent à une portion, dans l'ordre. Pour
 *  une portion qui a une page, celles de son histoire (voir
 *  LectureSeule.deLaPage : pour une copie, avant sa naissance, celles de la
 *  page d'où elle vient) ; pour une séance entière, toutes les siennes. */
export function etapesDe(lecture: Pick<LectureSeule, 'film' | 'deLaPage'>, p: Portion): number[] {
  const film = lecture.film
  const r: number[] = []
  const de = p.genre === 'seance' ? Math.max(0, p.seance.de) : 0
  const a = p.genre === 'seance' ? Math.min(film.length - 1, p.seance.a) : film.length - 1
  for (let i = de; i <= a; i++) if (p.page === null || lecture.deLaPage(i, p.page)) r.push(i)
  return r
}

/** Une séance concerne-t-elle une page ? Oui si l'on y a vu la page, ou si
 *  l'une de ses étapes (hors celles qui ne changent que l'ordre) est de
 *  l'histoire de la page : la séance où l'on a construit l'original d'une
 *  copie concerne aussi la copie. Sans copie dans le film, rien à parcourir. */
export function seanceTouche(lecture: Pick<LectureSeule, 'film' | 'deLaPage' | 'copies'>, s: Seance, page: string): boolean {
  if (s.pages.includes(page)) return true
  if (!lecture.copies) return false
  for (let i = s.de; i <= s.a; i++) {
    const e = lecture.film[i]
    if (e && !e.seulOrdre && e.page !== page && lecture.deLaPage(i, page)) return true
  }
  return false
}

/** Les séances où une page a reçu au moins un geste de son histoire, les
 *  plus récentes d'abord (sa naissance seule n'en est pas un, ni une étape
 *  qui ne change que l'ordre des pages : la jeter, la rendre) */
export function seancesDeLaPage(lecture: Pick<LectureSeule, 'film' | 'naissance' | 'deLaPage' | 'copies'>, seances: readonly Seance[], page: string): Seance[] {
  return seances.filter(s => {
    if (!seanceTouche(lecture, s, page)) return false
    for (let i = s.de; i <= s.a; i++) {
      const e = lecture.film[i]
      if (e && !e.seulOrdre && lecture.deLaPage(i, page) && !lecture.naissance(i)) return true
    }
    return false
  })
}

/** Ce qu'on montre en ouvrant : la page affichée dans la dernière séance où
 *  elle a quelque chose à montrer ; à défaut (une page toute neuve, dont la
 *  séance n'a fait que la créer), la dernière séance qui montre quelque chose,
 *  toutes pages. null : rien à montrer nulle part. */
export function bandeParDefaut(lecture: LectureSeule, seances: readonly Seance[], page: string, nommer: (page: string) => string): Bande | null {
  for (const s of seances) {                                // la plus récente d'abord
    if (!seanceTouche(lecture, s, page)) continue
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
  // Une étape qui ne change que l'ordre des pages (une page jetée, ou rendue
  // par Ctrl+Z) ne montre rien, nulle part : ce n'est jamais un geste. Une
  // page qui naît ne montre rien non plus : sa naissance n'est pas une image.
  // On retient seulement que la page est neuve (voir les parties, plus bas).
  // La naissance d'une copie non plus : elle continue la page d'où elle vient.
  const neuves = new Set<string>()
  const toutes = etapesDe(lecture, p).filter(i => {
    if (film[i].seulOrdre) return false
    if (!lecture.naissance(i)) return true
    neuves.add(p.page ?? film[i].page)
    return false
  })
  if (!toutes.length) return null

  // La page de chaque étape : celle qu'on regardait, à défaut celle d'avant.
  // Pour une portion qui a une page, c'est elle : une étape héritée par une
  // copie est notée sur l'original, mais se montre sur la copie.
  const repli = p.page ?? lecture.pagesActuelles()[0] ?? ''
  const pagesDe: string[] = []
  for (let j = 0; j < toutes.length; j++) pagesDe.push(p.page ?? (film[toutes[j]].page || (j ? pagesDe[j - 1] : repli)))
  const retire = departPropre(lecture, toutes, j => pagesDe[j])
  let etapes = toutes.slice(retire), pages = pagesDe.slice(retire)

  // Une étape qui ne change rien à sa page n'est pas un geste. Sur un tableau
  // d'avant, « Supprimer la page » effaçait la page jetée, sans marquer
  // l'étape, notée sur la page où l'on revient sans la toucher : on la
  // reconnaît sans tout relire, juste après une étape notée sur une page jetée
  // depuis (ou juste après une autre étape sans effet : on jette deux pages
  // de suite), et au bout de la portion (un Ctrl+Z qui change une autre page).
  // « Une autre page » : une autre que celle qu'on lisait à l'étape d'avant
  // (pour une copie, avant sa naissance, la page d'où elle vient).
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
    if (((q && q !== lecture.source(i - 1, pages[j]) && !actuelles.has(q)) || sansEffet.has(i - 1)) && rienNeChange(j)) { invisibles.add(j); sansEffet.add(i) }
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
 *  dernière image : il n'y a plus rien à rattraper. Une copie sans geste à
 *  elle finit sur la dernière image de son original avant la copie : elle
 *  lui est égale (memeImage), sans geste de plus. */
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
  const traces: number[] = [0]
  const parties: Partie[] = []
  const debutsDePas: number[] = []
  // Les instruments, si le tableau les a notés : l'état à chaque image, et la
  // manipulation qui précède chaque geste
  const heureDe = (e: number) => film[e]?.t ?? -Infinity
  // De la piste, seulement ce qui sert à la portion : de l'état d'avant son
  // premier geste (au plus une minute avant lui) à l'épilogue de son dernier
  const piste = lecture.pisteEntre(
    Math.min(heureDe(avants[0]), film[etapes[0]].t - AVANT_PROPOS) + APRES_L_ETAPE,
    film[etapes[etapes.length - 1]].t + APRES_L_ETAPE + EPILOGUE)
  // L'état des instruments juste après une étape (sa dernière pose est peinte un peu après elle)
  const apres = (e: number) => piste!.etatA(heureDe(e) + APRES_L_ETAPE)
  const etats: EtatInstruments[] | undefined = piste ? [apres(avants[0])] : undefined
  const manips: (GesteAuxInstruments | null)[] | undefined = piste ? [null] : undefined
  /** Où finit, au temps réel, l'épilogue qu'on vient de montrer (−∞ : aucun) :
   *  la fenêtre du geste suivant commence là, sans le rejouer */
  let finEpilogue = -Infinity
  groupes.forEach((g, q) => {
    const debut = q ? images.length : 0
    if (q) {
      images.push({ e: avants[g.de], p: g.page, geste: false }); attentes.push(PAUSE_DE_PARTIE); traces.push(0)
      // Les instruments tels qu'on les a laissés en quittant la page d'avant
      if (piste) etats!.push(piste.etatA(Math.max(heureDe(avants[g.de]) + APRES_L_ETAPE, finEpilogue)))
      manips?.push(null)
    }
    for (let j = g.de; j <= g.a; j++) {
      const premier = j === g.de
      // Le temps que l'épilogue d'avant a déjà montré ne s'attend pas une seconde fois
      const deja = j && finEpilogue > -Infinity ? finEpilogue - film[etapes[j - 1]].t - APRES_L_ETAPE : 0
      const silence = j ? film[etapes[j]].t - film[etapes[j - 1]].t - deja : 0
      // Le geste commence à l'étape qui suit l'état d'avant (la première d'un geste fondu)
      const m = avants[j] + 1, d = dureesDuTrace(film[m]?.ms)
      // Le temps stylo levé : jusqu'au poser du trait, et non jusqu'à son lever
      const leve = d ? film[m].t - d.vecue - (j ? film[etapes[j - 1]].t + deja : film[m].t) : silence
      // Ce que les instruments ont fait sur cette page depuis l'image d'avant
      // (au plus une minute pour la première d'une partie), jusqu'au geste
      let manip: GesteAuxInstruments | null = null
      if (piste) {
        const fin = film[d ? m : etapes[j]].t + APRES_L_ETAPE
        let debutF = heureDe(images[images.length - 1].e)
        if (premier) debutF = Math.max(debutF, fin - APRES_L_ETAPE - AVANT_PROPOS)
        // Après un épilogue, la fenêtre commence où il s'est arrêté
        const depuis = Math.max(debutF + APRES_L_ETAPE, finEpilogue)
        // La piste a noté la page où l'on était : pour une étape héritée par
        // une copie, la page d'où elle vient
        const w = piste.fenetre(depuis, fin, lecture.source(etapes[j], pages[j]))
        manip = horaire(w.poses, w.traces, piste.etatA(depuis), Math.max(0, fin - depuis), d?.vecue ?? 0, premier ? ENTREE : d ? 0 : PLANCHER)
        etats!.push(apres(etapes[j])); manips!.push(manip)
        finEpilogue = -Infinity
      }
      // Avec une manipulation, le pas se coupe au temps immobile de la fenêtre
      // (sans elle, c'est le temps stylo levé ou le silence d'avant, comme avant)
      if (premier || (manip ? manip.immobile : leve) >= SILENCE_DE_PAS) debutsDePas.push(images.length)
      const lent = (manip?.duree ?? 0) + (d?.duree ?? 0)
      attentes.push((premier ? ENTREE : manip ? manip.attente : d ? tasser(leve, 0) : tasser(silence)) + lent)
      traces.push(lent)
      images.push(d ? { e: etapes[j], p: pages[j], geste: true, main: m } : { e: etapes[j], p: pages[j], geste: true })
      // L'épilogue de la page, quand on la quitte ensuite ou que la partie finit
      if (piste) {
        const quitte = j + 1 < etapes.length && pages[j + 1] !== pages[j]
        if (quitte || j === g.a) {
          // Jusqu'au geste suivant, s'il est sur une autre page ; sinon au plus
          // une minute, jusqu'à l'étape suivante du film
          const T = heureDe(etapes[j]) + APRES_L_ETAPE
          const borne = quitte ? heureDe(avants[j + 1] + 1) + APRES_L_ETAPE : Math.min(T + EPILOGUE, (film[etapes[j] + 1]?.t ?? Infinity) + APRES_L_ETAPE)
          const w = borne > T ? piste.fenetre(T, borne, lecture.source(etapes[j], pages[j])) : null
          if (w && (w.poses.length || w.traces.length)) {
            const base = etats![etats!.length - 1], fin = finDesPieces(w.poses, w.traces)
            const epilogue = horaire(w.poses, w.traces, base, fin, 0, 0)
            const quitteeAinsi = w.poses.length ? new IndexPieces(w.poses, base).fin : base
            if (epilogue) {
              images.push({ e: etapes[j], p: pages[j], geste: false, epilogue: true })
              attentes.push(epilogue.attente + epilogue.duree); traces.push(epilogue.duree)
              etats!.push(quitteeAinsi); manips!.push(epilogue)
              finEpilogue = T + fin
            } else etats![etats!.length - 1] = quitteeAinsi       // rien de visible ne bouge
          }
        }
      }
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
    traces.push(0)
    images.push({ e: bout, p: der.p, geste: true })
    // Les instruments tels que la classe les a vus en quittant la page
    if (piste) etats!.push(etats![etats!.length - 1])
    manips?.push(null)
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

  const b: Bande = { portion: p, images, attentes: Float64Array.from(attentes), traces: Float64Array.from(traces), parties, bornes, gestes, total: gestes[n - 1] }
  if (etats && manips) { b.etats = etats; b.manips = manips }
  return b
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

/** L'instant où chaque image est là, finie, en ms depuis l'image 0, à une allure donnée */
export function echeances(b: Bande, facteur: number): Float64Array {
  const e = new Float64Array(b.images.length)
  for (let k = 1; k < e.length; k++) e[k] = e[k - 1] + b.attentes[k] / facteur
  return e
}

/** L'instant où chaque image commence à paraître : son échéance, moins le
 *  temps de l'écrire à la main. Jamais avant que l'image d'avant soit finie. */
export function departs(b: Bande, ech: Float64Array, facteur: number): Float64Array {
  return ech.map((v, k) => Math.max(k ? ech[k - 1] : 0, v - b.traces[k] / facteur))
}

/** L'horloge au départ d'une lecture depuis l'image k. Un trait qui s'y écrit
 *  encore à la main va jusqu'au lever : l'horloge se cale sur ce qu'il lui
 *  reste (`reste`, en ms d'horloge), et l'image suivante vient après le vrai
 *  temps stylo levé, comme au tableau. Sinon, quelle que soit l'attente
 *  d'origine, l'image suivante commence au plus tard après `demarrage` ms. */
export function horlogeAuDepart(ech: Float64Array, debuts: Float64Array, k: number, reste: number, demarrage: number): number {
  if (reste > 0) return ech[k] - reste
  return Math.max(ech[k], debuts[Math.min(ech.length - 1, k + 1)] - demarrage)
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
