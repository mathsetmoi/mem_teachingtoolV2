// =============================================================
// LES GROUPES (lot 5)
// « Grouper » (Ctrl + G) fait de plusieurs objets un seul bloc : il se
// prend, se déplace, se copie, se duplique, s'envoie vers une autre page et
// se règle d'un coup. Un seul niveau, et rien d'autre qu'un champ `groupe`
// sur chaque membre (le même identifiant pour tous) : simple à copier, et
// la version d'avant (fdf3f72) l'ignore sans dommage.
// Les membres d'une forme sont les formes de sa page qui portent le même
// groupe ET sont dans le même état qu'elle (libres, ou verrouillées) ; il en
// faut au moins deux, sinon ce n'est plus un groupe (la forme est seule).
// Une image fixée en fond n'est d'aucun groupe (Fixer en fond l'en sort ;
// une version d'avant qui la duplique peut lui en laisser un : il ne compte
// pas). Un groupe est toujours libre en entier ou verrouillé en entier :
// verrouiller un membre verrouille tout son groupe (voir porteurs).
// « Un membre pris seul » n'est pas un état qu'on garde : c'est une
// sélection d'exactement une forme dont le groupe en compte d'autres (voir
// membreSeul), et il n'y a donc rien à oublier quand la sélection change.
// Ce fichier calcule ce que Grouper et Dégrouper écrivent (Tableau.modifier
// en UNE transaction notée « réglage » : un Ctrl + Z, une étape du film qui
// ne change rien à l'image), ce qu'un clic prend, et ce que le rendu
// encadre ; l'application (app.ts) l'écrit, les menus (ui.ts) le
// proposent. Rien ici ne touche au DOM : le calcul se vérifie sous Node.
// =============================================================
import type { Forme } from './types'
import { libre } from './types'
import type { Changement } from './verrou'

/** L'état d'une forme, pour les groupes : libre, verrouillée, ou fixée en
 *  fond (alors seule, toujours) */
function etat(f: Forme): 'libre' | 'verrou' | 'fixe' { return f.fixe ? 'fixe' : f.verrou ? 'verrou' : 'libre' }

/** Les porteurs de chaque groupe de la page, dans l'ordre de `formes` */
function porteursParGroupe(formes: readonly Forme[]): Map<string, Forme[]> {
  const r = new Map<string, Forme[]>()
  for (const f of formes) {
    if (!f.groupe) continue
    const l = r.get(f.groupe)
    if (l) l.push(f); else r.set(f.groupe, [f])
  }
  return r
}

/** Les membres du groupe de f sur sa page (`formes` : toute la page, dans
 *  l'ordre d'affichage ; ils sortent dans cet ordre) : f seul s'il n'a pas
 *  de groupe ; sinon les formes qui portent ce groupe et sont dans le même
 *  état que f (libres, ou verrouillées) ; moins de deux, ou f fixée en
 *  fond : f seul (un groupe d'un seul membre n'en est plus un). */
export function membresDe(formes: readonly Forme[], f: Forme): Forme[] {
  if (!f.groupe || f.fixe) return [f]
  const e = etat(f)
  const l = formes.filter(g => g.groupe === f.groupe && etat(g) === e)
  return l.length >= 2 && l.includes(f) ? l : [f]
}

/** Ces identifiants, chacun étendu aux membres de son groupe (un
 *  identifiant qui n'est pas sur la page reste tel quel) */
export function avecGroupes(formes: readonly Forme[], ids: Iterable<string>): Set<string> {
  const r = new Set(ids)
  let groupes: Set<string> | null = null
  for (const f of formes) if (r.has(f.id) && f.groupe) (groupes ??= new Set()).add(f.groupe)
  if (!groupes) return r
  // Chaque groupe (et chaque état) n'est étendu qu'une fois : mille traits
  // groupés, pris d'un cadre, ne font pas mille parcours de leur groupe
  const parGroupe = porteursParGroupe(formes), faits = new Set<string>()
  for (const f of formes) {
    if (!r.has(f.id) || !f.groupe || f.fixe || !groupes.has(f.groupe)) continue
    const e = etat(f), cle = e + '|' + f.groupe
    if (faits.has(cle)) continue
    faits.add(cle)
    const l = parGroupe.get(f.groupe)!.filter(g => etat(g) === e)
    if (l.length >= 2) for (const g of l) r.add(g.id)
  }
  return r
}

/** Ces identifiants et TOUS les porteurs de leurs groupes sur la page, quel
 *  que soit leur état : ce que verrouillent et déverrouillent Verrouiller,
 *  Maj + L et « Déverrouiller tout » (un groupe n'est jamais à moitié
 *  verrouillé, même quand on en verrouille un membre pris seul) */
export function porteurs(formes: readonly Forme[], ids: Iterable<string>): Set<string> {
  const r = new Set(ids)
  const groupes = new Set<string>()
  for (const f of formes) if (r.has(f.id) && f.groupe) groupes.add(f.groupe)
  if (groupes.size) for (const f of formes) if (f.groupe && groupes.has(f.groupe)) r.add(f.id)
  return r
}

/** Ce que Grouper écrit pour ces objets (`ids` : ce qu'on groupe, libre) :
 *  chacun, et les membres des groupes qu'ils avaient déjà (grouper des
 *  groupes les fond en un : un seul niveau), reçoivent l'identifiant `id`.
 *  Seulement ce qui change ; rien s'ils sont moins de deux, ni s'ils forment
 *  déjà ce seul groupe (rien à grouper de plus). */
export function changementsGrouper(formes: readonly Forme[], ids: Iterable<string>, id: string): Changement[] {
  const veut = new Set(ids)
  const tous = avecGroupes(formes, formes.filter(f => veut.has(f.id) && libre(f)).map(f => f.id))
  const pris = formes.filter(f => tous.has(f.id))
  if (pris.length < 2) return []
  const g0 = pris[0].groupe
  if (g0 && pris.every(f => f.groupe === g0) && membresDe(formes, pris[0]).length === pris.length) return []
  return pris.filter(f => f.groupe !== id).map(f => ({ id: f.id, patch: { groupe: id } }))
}

/** Ce que Dégrouper écrit pour ces objets : ceux qui ont un groupe le
 *  perdent (la clé s'en va : voir Tableau.modifier), et redeviennent des
 *  objets un par un. Les autres membres de leur groupe qui ne sont pas du
 *  nombre gardent le leur (un membre pris seul, dégroupé, sort de son
 *  groupe ; les autres restent ensemble). */
export function changementsDegrouper(formes: readonly Forme[], ids: Iterable<string>): Changement[] {
  const veut = new Set(ids)
  return formes.filter(f => veut.has(f.id) && f.groupe !== undefined).map(f => ({ id: f.id, patch: { groupe: undefined } }))
}

/** La sélection est-elle EXACTEMENT un groupe (ses membres, au moins deux,
 *  et rien d'autre) ? Ses membres, sinon null. */
export function groupeExact(formes: readonly Forme[], selection: ReadonlySet<string>): Forme[] | null {
  if (selection.size < 2) return null
  const f = formes.find(g => selection.has(g.id))
  if (!f?.groupe) return null
  const m = membresDe(formes, f)
  return m.length === selection.size && m.every(g => selection.has(g.id)) ? m : null
}

/** La sélection est-elle un membre pris seul (une seule forme, dont le
 *  groupe en compte d'autres) ? Cette forme, sinon null. */
export function membreSeul(formes: readonly Forme[], selection: ReadonlySet<string>): Forme | null {
  if (selection.size !== 1) return null
  const [id] = selection
  const f = formes.find(g => g.id === id)
  return f?.groupe && membresDe(formes, f).length > 1 ? f : null
}

/** Ce que prend un clic (ou un toucher) simple sur f, qui n'est pas dans la
 *  sélection : tout son groupe ; mais si la sélection est un autre membre
 *  du même groupe pris seul, f seul (on passe d'un membre à l'autre sans
 *  ressortir du groupe). Dans l'ordre de `formes`. */
export function priseDuClic(formes: readonly Forme[], selection: ReadonlySet<string>, f: Forme): Forme[] {
  const m = membresDe(formes, f)
  if (m.length < 2) return m
  const seul = membreSeul(formes, selection)
  return seul && seul.id !== f.id && m.includes(seul) ? [f] : m
}

/** Les groupes que touche la sélection, pour le dessin : les membres (libres,
 *  au moins deux) de chaque groupe dont au moins un membre est sélectionné,
 *  et s'ils le sont tous (entier : le cadre plein du groupe pris ; sinon le
 *  pointillé clair d'un membre pris seul). Ce qui est verrouillé a son cadre
 *  gris et son cadenas (voir Rendu). Vide sans rien de groupé de choisi,
 *  sans parcourir la page. */
export function groupesTouches(formes: readonly Forme[], selection: ReadonlySet<string>): { membres: Forme[]; entier: boolean }[] {
  if (!selection.size) return []
  let groupes: Set<string> | null = null
  for (const f of formes) if (f.groupe && selection.has(f.id) && libre(f)) (groupes ??= new Set()).add(f.groupe)
  if (!groupes) return []
  const parGroupe = porteursParGroupe(formes)
  const r: { membres: Forme[]; entier: boolean }[] = []
  for (const g of groupes) {
    const membres = parGroupe.get(g)!.filter(libre)
    if (membres.length < 2) continue
    r.push({ membres, entier: membres.every(f => selection.has(f.id)) })
  }
  return r
}
