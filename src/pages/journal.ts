// =============================================================
// LE JOURNAL DES PAGES
// La trieuse des pages range, renomme, duplique, insère, supprime des
// pages. Rien de cela n'entre dans une pile d'annulation de page (le lot 2
// a donné à chaque page la sienne, et une action de la trieuse en touche
// plusieurs) : la trieuse garde son propre journal. Chaque action y entre
// avec deux clichés, celui d'avant et celui d'après (l'ordre, les noms, la
// corbeille, le fond de chaque page). Annuler rend le cliché d'avant, mais
// SEULEMENT si le tableau est exactement dans l'état d'après : sinon
// quelque chose a changé ailleurs entre-temps (une page remise de la
// corbeille, un autre onglet, une copie retirée), et défaire ferait un
// changement qu'on ne verrait pas, ou perdrait une page. Le journal le dit
// alors ('change') et se vide ; la corbeille reste le filet.
// Pur : il ne parle qu'au document (Tableau), sans interface, et se teste
// sous Node (tests/journal.test.ts).
// =============================================================
import * as Y from 'yjs'
import type { EntreeCorbeille, EtatDesPages, Tableau } from '../document'
import type { Fond } from '../types'

/** Le fond d'une page et l'origine de son repère */
interface FondDePage { fond: Fond; origine: { x: number; y: number } }

/** Ce que le journal photographie avant et après chaque action. pages :
 *  l'ordre, les noms et la corbeille (Tableau.etatDesPages) ; fonds : le
 *  fond de chaque page de l'ordre et de la corbeille ; existantes : toutes
 *  les pages qui ont leur Y.Map (une page créée par l'action n'y est pas
 *  avant). */
interface Cliche {
  pages: EtatDesPages
  fonds: Record<string, FondDePage>
  existantes: ReadonlySet<string>
}

/** Une action du journal (le bouton « Annuler » d'un message la retient :
 *  voir annulerSi) */
export interface Entree {
  readonly libelle: string
  readonly avant: Cliche
  readonly apres: Cliche
}

export class JournalPages {
  /** Les actions faites, la plus récente en dernier */
  private faites: Entree[] = []
  /** Les actions défaites, qu'on peut refaire, la plus récemment défaite en dernier */
  private defaites: Entree[] = []

  constructor(private readonly tableau: Tableau) {}

  get peutAnnuler(): boolean { return this.faites.length > 0 }
  get peutRetablir(): boolean { return this.defaites.length > 0 }

  /** Fait une action sur les pages et l'inscrit. Une page CRÉÉE par l'action
   *  (une insertion, une copie) reçoit, dans le cliché d'avant, une entrée
   *  de corbeille définitive : défaire l'action la retire sans la mettre
   *  dans la corbeille (rien à y reprendre : elle n'existait pas), refaire
   *  l'y remet à sa place (l'entrée s'en va). Rend l'entrée, ou null si rien
   *  n'a changé (rien n'entre alors dans le journal, et ce qu'on pouvait
   *  refaire le reste). Une action faite oublie ce qu'on pouvait refaire. */
  faire(libelle: string, action: () => void): Entree | null {
    const avant = this.cliche()
    action()
    const apres = this.cliche()
    if (memeCliche(avant, apres)) return null
    const t = Date.now()
    for (const id of apres.existantes) {
      if (!avant.existantes.has(id)) avant.pages.corbeille[id] = { t, definitif: true }
    }
    const e: Entree = { libelle, avant, apres }
    this.faites.push(e)
    this.defaites = []
    return e
  }

  /** Défait la dernière action : 'fait' ; 'rien' s'il n'y en a pas ;
   *  'change' si le tableau n'est plus dans l'état qu'elle a laissé (le
   *  journal se vide alors, rien ne change). */
  annuler(): 'fait' | 'rien' | 'change' {
    const e = this.faites[this.faites.length - 1]
    if (!e) return 'rien'
    if (!memeCliche(this.cliche(), e.apres)) { this.vider(); return 'change' }
    this.rendre(e.avant)
    this.faites.pop()
    this.defaites.push(e)
    return 'fait'
  }

  /** Refait la dernière action défaite, à la même condition (le tableau est
   *  exactement dans l'état d'avant elle) */
  retablir(): 'fait' | 'rien' | 'change' {
    const e = this.defaites[this.defaites.length - 1]
    if (!e) return 'rien'
    if (!memeCliche(this.cliche(), e.avant)) { this.vider(); return 'change' }
    this.rendre(e.apres)
    this.defaites.pop()
    this.faites.push(e)
    return 'fait'
  }

  /** Le bouton « Annuler » d'un message : seulement si cette action est
   *  encore la dernière faite et que le tableau est dans l'état qu'elle a
   *  laissé. Une autre action faite depuis (la sienne a encore son
   *  « Annuler ») ne vide pas le journal ; un tableau changé ailleurs, si. */
  annulerSi(e: Entree): 'fait' | 'change' {
    if (this.faites[this.faites.length - 1] !== e) return 'change'
    return this.annuler() === 'fait' ? 'fait' : 'change'
  }

  vider() {
    this.faites = []
    this.defaites = []
  }

  /** L'état des pages tel qu'il est maintenant */
  private cliche(): Cliche {
    const t = this.tableau
    const pages = t.etatDesPages()
    const existantes = new Set<string>()
    for (const [id, p] of t.pages) if (p instanceof Y.Map) existantes.add(id)
    // Les pages de l'ordre, et celles de la corbeille : avec une entrée qui
    // n'est pas définitive (une page vide comprise), ou jetées avant elle
    // (lot 2, sans entrée). Ni une page supprimée définitivement (ou créée
    // par une action défaite : elle n'existait pas), ni une page effacée par
    // l'ancienne suppression : leur fond ne se rend jamais.
    const ordre = new Set(pages.ordre)
    const suivies = new Set<string>(pages.ordre)
    for (const [id, e] of Object.entries(pages.corbeille)) if (existantes.has(id) && !ordre.has(id) && !e.definitif) suivies.add(id)
    for (const id of existantes) if (!suivies.has(id) && t.dansLaCorbeille(id, ordre)) suivies.add(id)
    const fonds: Record<string, FondDePage> = {}
    for (const id of suivies) fonds[id] = { fond: t.fondDe(id), origine: { ...t.origineDe(id) } }
    return { pages, fonds, existantes }
  }

  /** Rend un cliché : l'ordre, les noms et la corbeille d'un coup (une
   *  étape seulOrdre si l'ordre change, aucune sinon), puis chaque fond qui
   *  a changé, sur sa page (une étape notée sur elle : la revue voit le fond
   *  revenir). Aucune pile d'annulation n'est touchée. */
  private rendre(c: Cliche) {
    const t = this.tableau
    t.retablirEtatDesPages(c.pages)
    for (const [id, f] of Object.entries(c.fonds)) {
      if (!t.pages.has(id)) continue
      const o = t.origineDe(id)
      if (t.fondDe(id) !== f.fond || o.x !== f.origine.x || o.y !== f.origine.y) t.changerFond(id, f.fond, { ...f.origine })
    }
  }
}

/** Deux clichés disent-ils la même chose (l'ordre, les noms, la corbeille,
 *  les fonds) ? Les pages existantes n'y comptent pas : une page créée puis
 *  retirée existe toujours (gc: false), elle a seulement quitté l'ordre. */
function memeCliche(a: Cliche, b: Cliche): boolean {
  const pa = a.pages, pb = b.pages
  if (pa.ordre.length !== pb.ordre.length || pa.ordre.some((id, i) => id !== pb.ordre[i])) return false
  if (!memesCles(pa.noms, pb.noms, (x, y) => x === y)) return false
  if (!memesCles(pa.corbeille, pb.corbeille, memeEntree)) return false
  return memesCles(a.fonds, b.fonds, (x, y) => x.fond === y.fond && x.origine.x === y.origine.x && x.origine.y === y.origine.y)
}

function memesCles<T>(a: Record<string, T>, b: Record<string, T>, egal: (x: T, y: T) => boolean): boolean {
  const ka = Object.keys(a)
  if (ka.length !== Object.keys(b).length) return false
  return ka.every(k => Object.prototype.hasOwnProperty.call(b, k) && egal(a[k], b[k]))
}

function memeEntree(a: EntreeCorbeille, b: EntreeCorbeille): boolean {
  const texte = (x: EntreeCorbeille) => JSON.stringify(x, Object.keys(x).sort())
  return texte(a) === texte(b)
}
