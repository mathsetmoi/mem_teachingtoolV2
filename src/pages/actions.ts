// =============================================================
// CE QUE LA TRIEUSE FAIT AUX PAGES
// Renommer, insérer une page vide, en ajouter une à la fin, dupliquer
// (avec l'histoire), supprimer (vers la corbeille), changer un fond, ranger
// d'une place : chaque action passe par le journal de la trieuse (voir
// journal.ts), en UNE entrée, qu'Annuler défait d'un coup. Aucune ne touche
// une pile d'annulation de page ; la seule marque d'annulation posée est
// celle du lot 2, quand on supprime la page qu'on regardait (voir
// supprimer). Pur : sans interface, il ne parle qu'au document et au
// journal, et se teste sous Node (tests/trieuse.test.ts) ; la trieuse
// (trieuse.ts) y ajoute les messages, le focus et la page où l'on va.
// =============================================================
import type { Tableau } from '../document'
import type { Entree, JournalPages } from './journal'
import type { Boite } from '../revoir/bobine'
import type { Fond } from '../types'
import { CM } from '../types'

/** Les pages sur lesquelles agit une action : les pages choisies, dans
 *  l'ordre du tableau ; sans page choisie, celle qui a le focus. */
export function pagesVisees(ordre: readonly string[], choisies: ReadonlySet<string>, focus: string | null): string[] {
  const l = ordre.filter(id => choisies.has(id))
  if (l.length) return l
  return focus && ordre.includes(focus) ? [focus] : []
}

/** Renomme une page (un nom vide le retire) : rend l'entrée du journal et
 *  le nom gardé (mis au propre), ou null si rien n'a changé. */
export function renommer(t: Tableau, j: JournalPages, id: string, nom: string | null): { entree: Entree; nom: string | null } | null {
  const e = j.faire('page renommée', () => { t.renommerPage(id, nom) })
  return e ? { entree: e, nom: t.nomDe(id) } : null
}

/** Une page neuve et vide, juste avant ou juste après la page `id`, au fond
 *  de celle-ci (on le change ensuite par « Fond »). rang : sa place (0 pour
 *  la première). */
export function inserer(t: Tableau, j: JournalPages, id: string, cote: 'avant' | 'apres'): { entree: Entree; page: string; rang: number } | null {
  const i = t.ordre.toArray().indexOf(id)
  if (i < 0) return null
  return ajouterA(t, j, 'page insérée', t.fondDe(id), cote === 'avant' ? i : i + 1)
}

/** Une page neuve et vide à la fin, au fond de la dernière page (le bouton
 *  « Ajouter une page » du bandeau) */
export function ajouterALaFin(t: Tableau, j: JournalPages): { entree: Entree; page: string; rang: number } | null {
  const ordre = t.ordre.toArray()
  const derniere = ordre[ordre.length - 1]
  return ajouterA(t, j, 'page ajoutée', derniere ? t.fondDe(derniere) : 'carreaux', ordre.length)
}

function ajouterA(t: Tableau, j: JournalPages, libelle: string, fond: Fond, place: number) {
  let page = ''
  const e = j.faire(libelle, () => { page = t.ajouterPage(fond, place) })
  if (!e || !page) return null
  return { entree: e, page, rang: t.ordre.toArray().indexOf(page) }
}

/** Duplique ces pages, chacune avec son histoire (voir Tableau.dupliquerPage :
 *  la copie juste après son original, même fond, même nom suivi de
 *  « (copie) »), SANS marque d'annulation : le journal les annule, et défaire
 *  les retire sans les mettre dans la corbeille (elles n'existaient pas).
 *  Toutes en UNE entrée. copies : chaque original et sa copie, dans l'ordre. */
export function dupliquer(t: Tableau, j: JournalPages, ids: readonly string[]): { entree: Entree; copies: { de: string; copie: string }[] } | null {
  const ordre = t.ordre.toArray()
  const liste = ordre.filter(id => ids.includes(id))
  if (!liste.length) return null
  const copies: { de: string; copie: string }[] = []
  const e = j.faire(liste.length > 1 ? `${liste.length} pages dupliquées` : 'page dupliquée', () => {
    for (const p of liste) { const q = t.dupliquerPage(p); if (q) copies.push({ de: p, copie: q }) }
  })
  return e && copies.length ? { entree: e, copies } : null
}

/** La page où aller quand celle qu'on regarde est supprimée avec d'autres :
 *  la plus proche AVANT elle qui reste (avant la première page du bloc
 *  supprimé qui la contient), sinon la première qui reste après elle ;
 *  comme la poubelle du lot 2 (la page d'avant, la suivante pour la
 *  première). null : aucune ne reste. */
export function pageDArrivee(ordre: readonly string[], ids: readonly string[], regardee: string): string | null {
  const parties = new Set(ids)
  const i = ordre.indexOf(regardee)
  if (i < 0) return ordre.find(id => !parties.has(id)) ?? null
  for (let k = i - 1; k >= 0; k--) if (!parties.has(ordre[k])) return ordre[k]
  for (let k = i + 1; k < ordre.length; k++) if (!parties.has(ordre[k])) return ordre[k]
  return null
}

export interface Suppression {
  entree: Entree
  /** Les pages retirées, dans l'ordre, et leur numéro d'avant (1 pour la première) */
  retirees: string[]
  numeros: number[]
  /** La page où l'on est après (celle qu'on regardait, si elle reste) */
  arrivee: string
  /** Celles qui ne sont pas allées dans la corbeille : vides, rien à reprendre */
  vides: string[]
}

/** Supprime ces pages : elles vont dans la corbeille (Tableau.jeterPages,
 *  UNE transaction), une page vide n'y va pas (rien à reprendre). Jamais
 *  toutes : 'tout', et rien ne change. Si la page qu'on regarde en est,
 *  `aller` mène d'abord à une page qui reste (voir pageDArrivee) ; le jet
 *  se note sur elle, et la page qu'on regardait y reçoit la marque du lot 2 :
 *  après la fermeture de la trieuse (le journal vidé), Ctrl+Z sur la page
 *  d'arrivée la rend, comme après la poubelle de la barre du haut. Les
 *  autres pages n'ont que le journal, puis la corbeille. */
export function supprimer(t: Tableau, j: JournalPages, ids: readonly string[], o: { regardee: string; aller: (page: string) => void }): Suppression | 'tout' | null {
  const ordre = t.ordre.toArray()
  const liste = ordre.filter(id => ids.includes(id))
  if (!liste.length) return null
  if (liste.length >= ordre.length) return 'tout'
  const arrivee = liste.includes(o.regardee) ? pageDArrivee(ordre, liste, o.regardee) : o.regardee
  if (!arrivee) return 'tout'
  if (arrivee !== o.regardee) o.aller(arrivee)
  let retirees: string[] = []
  const e = j.faire(liste.length > 1 ? `${liste.length} pages supprimées` : 'page supprimée', () => {
    retirees = t.jeterPages(liste, { vue: { page: o.regardee, depuis: arrivee } })
  })
  if (!e || !retirees.length) return null
  return {
    entree: e, retirees, arrivee,
    numeros: retirees.map(id => ordre.indexOf(id) + 1),
    vides: retirees.filter(id => !t.dansLaCorbeille(id)),
  }
}

/** L'origine du repère d'une page qui en prend un dans la trieuse : au
 *  centre de ce qui y est écrit, calée sur le centimètre ; (0, 0) sur une
 *  page vide (la vue neutre la montre près du coin). */
export function origineAuCentre(b: Boite | null): { x: number; y: number } {
  if (!b) return { x: 0, y: 0 }
  const cale = (v: number) => (Math.round(v / CM) * CM) || 0
  return { x: cale(b.x + b.l / 2), y: cale(b.y + b.h / 2) }
}

/** Change le fond d'une page (l'étape se note sur elle : la revue le voit
 *  changer). Le repère prend son origine au centre du contenu (boite : la
 *  boîte de ce qui y est écrit). null si la page a déjà ce fond. */
export function changerFond(t: Tableau, j: JournalPages, id: string, fond: Fond, boite: Boite | null): Entree | null {
  if (!t.pages.has(id) || t.fondDe(id) === fond) return null
  const origine = fond === 'repere' ? origineAuCentre(boite) : undefined
  return j.faire('fond changé', () => t.changerFond(id, fond, origine))
}

/** Ctrl + Maj + ← / → : ces pages (gardées dans leur ordre) reculent ou
 *  avancent d'une place, regroupées ; rend l'indice `avant` de
 *  Tableau.deplacerPages, ou 'debut' / 'fin' si la première est déjà en
 *  tête, la dernière déjà au bout. */
export function placeDUnPas(ordre: readonly string[], ids: readonly string[], sens: 1 | -1): number | 'debut' | 'fin' | null {
  const rangs = ordre.map((id, i) => ids.includes(id) ? i : -1).filter(i => i >= 0)
  if (!rangs.length) return null
  if (sens < 0) return rangs[0] === 0 ? 'debut' : rangs[0] - 1
  const der = rangs[rangs.length - 1]
  return der === ordre.length - 1 ? 'fin' : der + 2
}
