// =============================================================
// LE PASSÉ D'UNE COPIE DE PAGE
// « Dupliquer la page » (voir Tableau.dupliquerPage) crée une page qui
// reprend les formes de l'original sous les mêmes identifiants et note
// `herite: { de }` ; sa naissance est la première étape du film notée sur
// elle. Rien du film n'est recopié : l'histoire d'une copie Q de P, ce sont
// les étapes notées sur P AVANT la naissance de Q (et, si P est elle-même
// une copie, celles de son origine avant la naissance de P, et ainsi de
// suite), puis celles notées sur Q. Q juste après l'étape i, quand i est
// avant sa naissance, c'est P juste après l'étape i : la revue et
// l'exporteur lisent l'instantané de P (le document garde tout, gc: false :
// il reste lisible même si P est ensuite modifiée, jetée, supprimée
// définitivement ou effacée).
// Ce module est pur : il ne connaît du tableau que la question « de quelle
// page celle-ci est-elle la copie ? », qui ne change jamais (on la pose sur
// le document actuel). La filiation se calcule une fois par film, en un
// passage.
// =============================================================
import type { Etape, Tableau } from './document'

/** Au-delà de tant de copies en chaîne, on s'arrête : une donnée abîmée (une
 *  page qui hériterait d'elle-même par un détour) ne gèle rien */
const COPIES_MAX = 64

export class Filiation {
  /** La première étape notée sur chaque page */
  private naissances = new Map<string, number>()
  /** L'origine de chaque page déjà demandée (null : pas une copie) */
  private origines = new Map<string, string | null>()
  /** Au moins une page du film est une copie. Sinon, rien ne se résout :
   *  chaque page est sa propre source, et l'on n'a jamais à parcourir quoi
   *  que ce soit pour le savoir. */
  readonly copies: boolean

  constructor(film: readonly { page: string }[], private origine: (page: string) => string | null) {
    film.forEach((e, i) => { if (e.page && !this.naissances.has(e.page)) this.naissances.set(e.page, i) })
    let copies = false
    for (const p of this.naissances.keys()) if (this.origineDe(p)) { copies = true; break }
    this.copies = copies
  }

  /** La page dont celle-ci est la copie (null : une page ordinaire) */
  origineDe(page: string): string | null {
    let o = this.origines.get(page)
    if (o === undefined) {
      const lue = this.origine(page)
      o = typeof lue === 'string' && lue && lue !== page ? lue : null
      this.origines.set(page, o)
    }
    return o
  }

  /** La première étape du film notée sur la page (−1 : aucune) */
  naissance(page: string): number { return this.naissances.get(page) ?? -1 }

  /** Les pages d'où celle-ci descend, de son origine à la plus lointaine
   *  (vide : une page ordinaire) */
  ascendants(page: string): string[] {
    const r: string[] = []
    for (let o = this.origineDe(page); o && r.length < COPIES_MAX && !r.includes(o) && o !== page; o = this.origineDe(o)) r.push(o)
    return r
  }

  /** La page qu'on lit vraiment pour montrer `page` juste après l'étape i :
   *  la page elle-même à partir de sa naissance, ou si ce n'est pas une
   *  copie, ou si sa naissance est introuvable ; avant sa naissance, la
   *  source de son origine à l'étape i. arret : si l'origine le vérifie,
   *  l'héritage s'arrête là, et la page n'existe pas encore (null) : le film
   *  élève d'une copie publiée avec son original ne reprend pas le passé de
   *  celui-ci, qui se montre déjà (ni celui qu'une autre copie publiée, née
   *  avant elle, montre déjà). */
  source(page: string, i: number, arret?: (o: string) => boolean): string | null {
    if (!this.copies) return page
    let p = page
    for (let n = 0; n < COPIES_MAX; n++) {
      const o = this.origineDe(p)
      if (!o) return p
      const nee = this.naissance(p)
      if (nee < 0 || i >= nee) return p
      if (arret?.(o)) return null
      p = o
    }
    return p
  }

  /** L'étape i, notée sur `pageDeLEtape`, est-elle de l'histoire de `page` ? */
  deLaPage(i: number, page: string, pageDeLEtape: string): boolean {
    return pageDeLEtape === this.source(page, i)
  }
}

/** La filiation des pages d'un tableau, pour ce film (une copie figée) */
export function filiationDe(t: Pick<Tableau, 'herite'>, film: readonly Etape[]): Filiation {
  return new Filiation(film, p => t.herite(p))
}
