// =============================================================
// LES PLANCHES : CE QU'ON VOIT À CHAQUE INSTANT
// Une planche, c'est une page telle qu'elle était juste après une étape
// du film. On ne prépare rien d'avance : chaque planche est lue dans
// l'instantané de son étape au moment où on veut la montrer, une seule
// page à la fois (quelques dixièmes de milliseconde), et les dernières
// lues restent sous la main pour les allers-retours.
// La revue ne touche au tableau qu'à travers une LectureSeule : une copie
// figée du film et quelques questions sans effet. Ce module ne connaît
// du document que ses types ; il n'a aucun moyen d'y écrire.
// =============================================================
import type { Etape, ImagePage, Tableau } from '../document'
import type { Fond, Forme } from '../types'
import { LecturePiste, morceauxEntre } from '../revoir/instruments-film'
import type { ImageBande } from './bande'

/** Tout ce que la revue peut demander au tableau, et rien d'autre */
export interface LectureSeule {
  /** Le film, copié et figé à l'ouverture */
  readonly film: readonly Etape[]
  /** La piste des instruments, copiée à l'ouverture ; on n'en relit que ce
   *  qui sert entre les heures de et a (ms), à la première question sur elles
   *  (null : rien, les instruments ne se rejouent pas) */
  pisteEntre(de: number, a: number): LecturePiste | null
  /** La page `page` juste après l'étape i ; null si i est hors du film ou si la page n'existait pas */
  page(i: number, page: string): ImagePage | null
  /** Les pages du tableau aujourd'hui, dans leur ordre */
  pagesActuelles(): readonly string[]
  /** Le fond actuel d'une page (null : la page n'existe plus) */
  fondActuel(page: string): Fond | null
  /** Les données d'une image importée (data: URL) */
  image(src: string): string | null
  /** L'étape i ne fait-elle que créer sa page, vide ? Une page qui naît ne
   *  montre rien (une page vide paraît là où il n'y avait rien) : ce n'est
   *  pas un geste, la bande la saute et les comptes l'ignorent. */
  naissance(i: number): boolean
  /** La forme `id` était-elle déjà passée sur la page à l'étape i, ou avant ?
   *  Une forme absente à l'étape i qui paraît ensuite revient alors : rendue
   *  par Ctrl+Z ou Ctrl+Y, telle qu'on l'a déjà vue. */
  dejaPassee(i: number, page: string, id: string): boolean
}

/** La lecture seule d'un tableau. `film` : la copie déjà faite, s'il y en a une.
 *  Une étape notée sans page (sur un tableau tout neuf, avant le premier
 *  changement de page) reçoit celle de l'étape d'avant : c'est là qu'on écrivait. */
export function lectureDe(t: Tableau, pagesActuelles: () => readonly string[], film: readonly Etape[] = t.film.toArray()): LectureSeule {
  let derniere = ''
  const fige = Object.freeze(film.map(e => {
    if (e.page) { derniere = e.page; return e }
    return derniere ? { ...e, page: derniere } : e
  }))
  const banque = t.doc.getMap('images')
  const page = (i: number, p: string) => i < 0 || i >= fige.length ? null : t.pageA(fige[i], p)
  // Une page naît toujours sur la première étape notée sur elle (le tableau
  // note la création sur la nouvelle page). On le vérifie à la première
  // question, une fois par page : elle n'existait pas juste avant, elle est vide.
  const premieres = new Map<string, number>()
  fige.forEach((e, i) => { if (e.page && !premieres.has(e.page)) premieres.set(e.page, i) })
  const verdicts = new Map<number, boolean>()
  const morceaux = t.piste.toArray()
  /** Les dernières pistes relues, par intervalle (les plus anciennes s'en vont d'abord) */
  const pistes = new Map<string, LecturePiste | null>()
  return {
    film: fige,
    pisteEntre(de, a) {
      if (!morceaux.length) return null
      const cle = `${de}|${a}`
      let l = pistes.get(cle)
      if (l === undefined) {
        const lue = new LecturePiste(morceauxEntre(morceaux, de, a))
        l = lue.vide ? null : lue
        pistes.set(cle, l)
        if (pistes.size > 8) pistes.delete(pistes.keys().next().value as string)
      }
      return l
    },
    page,
    pagesActuelles,
    fondActuel: p => pagesActuelles().includes(p) ? t.fondDe(p) : null,
    image: src => { const d = banque.get(src); return typeof d === 'string' ? d : null },
    dejaPassee: (i, p, id) => i >= 0 && i < fige.length && t.dejaPassee(fige[i], p, id),
    naissance: i => {
      const p = fige[i]?.page
      if (!p || premieres.get(p) !== i) return false
      let v = verdicts.get(i)
      if (v === undefined) {
        const apres = page(i, p)
        v = !!apres && !apres.formes.length && page(i - 1, p) === null
        verdicts.set(i, v)
      }
      return v
    },
  }
}

/** Deux planches identiques à l'œil : même fond, même origine, et les mêmes
 *  formes (les mêmes objets, dans le même ordre). Une forme qui n'a pas
 *  changé d'une étape à l'autre est le même objet : la comparaison est sûre. */
export function memeImage(a: ImagePage, b: ImagePage): boolean {
  if (a === b) return true
  if (a.fond !== b.fond || a.origine.x !== b.origine.x || a.origine.y !== b.origine.y || a.formes.length !== b.formes.length) return false
  for (let i = 0; i < a.formes.length; i++) if (a.formes[i] !== b.formes[i]) return false
  return true
}

/** Les planches d'une revue, lues à la demande et gardées en petit nombre
 *  (les plus anciennement vues s'en vont d'abord) */
export class Planches {
  private gardees = new Map<string, ImagePage>()

  constructor(private lecture: LectureSeule, private taille = 64) {}

  /** La planche d'une image de la bande. Une page qui n'existait pas encore
   *  (ou plus) est une page vide, sur son fond d'aujourd'hui. */
  lire(img: ImageBande): ImagePage {
    const cle = `${img.e}|${img.p}`
    const deja = this.gardees.get(cle)
    if (deja) {
      this.gardees.delete(cle); this.gardees.set(cle, deja)       // revue à l'instant : passe en dernier
      return deja
    }
    const lue = this.lecture.page(img.e, img.p)
      ?? { fond: this.lecture.fondActuel(img.p) ?? 'blanc', origine: { x: 0, y: 0 }, formes: [] }
    this.gardees.set(cle, lue)
    if (this.gardees.size > this.taille) this.gardees.delete(this.gardees.keys().next().value as string)
    return lue
  }

  /** Les formes qui apparaissent en passant de `avant` à `img` (une forme
   *  déplacée ou recolorée garde son identifiant : elle n'y est pas) */
  apparues(avant: ImageBande, img: ImageBande): Forme[] {
    if (avant.p !== img.p) return []
    const deja = new Set(this.lire(avant).formes.map(f => f.id))
    return this.lire(img).formes.filter(f => !deja.has(f.id))
  }

  /** Parmi les formes apparues en passant de `avant` à `img`, celles qui
   *  naissent. Une forme qui revient (rendue par Ctrl+Z ou Ctrl+Y) n'y est
   *  pas : au tableau, elle revient d'un coup, sans se redessiner. */
  neuves(avant: ImageBande, apparues: readonly Forme[]): Forme[] {
    return apparues.filter(f => !this.lecture.dejaPassee(avant.e, avant.p, f.id))
  }

  vider() { this.gardees.clear() }
}

/** Combien d'étapes de tête ne font qu'effacer (« Effacer la page » à
 *  l'arrivée de la classe) : la revue part d'après elles, sans montrer ce
 *  qui appartient à la séance d'avant. On en garde toujours une. */
export function departPropre(lecture: LectureSeule, etapes: number[], pageDe: (j: number) => string, max = 50): number {
  let n = 0
  while (n < etapes.length - 1 && n < max) {
    const p = pageDe(n)
    const avant = lecture.page(etapes[n] - 1, p), apres = lecture.page(etapes[n], p)
    if (!avant || !apres || !effaceSeulement(avant, apres)) break
    n++
  }
  return n
}

/** `apres` ne fait que retirer des formes à `avant`, sans rien changer d'autre */
function effaceSeulement(avant: ImagePage, apres: ImagePage): boolean {
  if (apres.fond !== avant.fond || apres.origine.x !== avant.origine.x || apres.origine.y !== avant.origine.y) return false
  if (apres.formes.length >= avant.formes.length) return false
  const presentes = new Set(avant.formes)
  return apres.formes.every(f => presentes.has(f))
}
