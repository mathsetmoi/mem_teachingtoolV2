// =============================================================
// DÉPLACER UN CLASSEUR OU UN DOSSIER (un modèle pur)
// Où peut aller ce qu'on déplace, par « Déplacer vers… » ou en glissant
// sa carte : la liste des dossiers de la fenêtre (en arbre, la racine
// d'abord), ceux qu'on ne peut pas choisir, la cible sous le pointeur
// pendant un glisser, et le message qui dit ce qui s'est passé.
//
// La règle : un classeur va dans n'importe quel dossier visible, sauf celui
// où il est déjà (« (ici) ») ; un dossier, ni dans lui-même, ni dans l'un de
// ses descendants (le registre le refuse aussi dans sa transaction, même si
// un autre onglet vient d'en déplacer un : voir Registre.deplacerDossier),
// ni dans celui où il est déjà. La racine (« Bibliothèque ») a l'id null.
// Toute remontée est bornée (voir arbre.ts) : un cycle fait par deux
// onglets ne fait jamais boucler la liste.
//
// Ce fichier est pur (sans DOM ni IndexedDB) : il se teste sous Node.
// =============================================================
import type { FicheClasseur, FicheDossier } from './demarrage'
import { PROFONDEUR_MAX } from './demarrage'
import type { Dossiers } from './arbre'
import { cheminLisible, cleDe, couleurDe, descendants, enfants, estDans, parentAffiche } from './arbre'

/** Ce qu'on déplace : un classeur (son dossier tel qu'il est rangé), ou un dossier */
export type ObjetDeplace =
  | { genre: 'classeur'; dossier: string | null }
  | { genre: 'dossier'; id: string }

/** Le nom de la racine, dans la fenêtre et le fil d'Ariane */
export const RACINE = 'Bibliothèque'
export const LIBELLE_RACINE = 'Bibliothèque (la racine)'

const enCarte = (d: Dossiers): ReadonlyMap<string, FicheDossier> =>
  d instanceof Map ? d : new Map((d as readonly FicheDossier[]).map(x => [x.id, x]))

/** Là où il est, tel que la bibliothèque le montre (null : la racine ; un
 *  classeur dont le dossier n'existe plus est à la racine, comme estDans) */
export function ouIlEst(objet: ObjetDeplace, dossiers: Dossiers): string | null {
  const carte = enCarte(dossiers)
  if (objet.genre === 'classeur') return objet.dossier !== null && carte.has(objet.dossier) ? objet.dossier : null
  const d = carte.get(objet.id)
  return d ? parentAffiche(d, carte) : null
}

/** Ce qu'on déplace, depuis sa fiche */
export const objetClasseur = (f: Pick<FicheClasseur, 'dossier'>): ObjetDeplace => ({ genre: 'classeur', dossier: f.dossier })
export const objetDossier = (d: Pick<FicheDossier, 'id'>): ObjetDeplace => ({ genre: 'dossier', id: d.id })

/** Les places qu'on ne peut pas choisir : celle où il est déjà, et, pour un
 *  dossier, lui-même et tous ses descendants (ni dans soi-même ni dans un
 *  descendant) */
export function interdits(objet: ObjetDeplace, dossiers: Dossiers): Set<string | null> {
  const carte = enCarte(dossiers)
  const r = new Set<string | null>([ouIlEst(objet, carte)])
  if (objet.genre === 'dossier') {
    r.add(objet.id)
    for (const d of descendants(objet.id, carte)) r.add(d.id)
  }
  return r
}

/** Une ligne de la fenêtre « Déplacer vers… » */
export interface Destination {
  /** null : la racine */
  id: string | null
  nom: string
  /** 0 : la racine ; 1 : un dossier de la racine… */
  profondeur: number
  /** La couleur du dossier (la racine : aucune) */
  couleur: string | null
  /** « 5e B › Géométrie » : pour le lecteur d'écran */
  chemin: string
  /** Là où il est déjà : grisé, « (ici) » */
  ici: boolean
  /** Un dossier qu'on déplace, ou l'un de ses descendants : grisé */
  interdit: boolean
}

/** Les destinations de la fenêtre, dans l'ordre de l'arbre : « Bibliothèque
 *  (la racine) », puis chaque dossier visible suivi de ses sous-dossiers (par
 *  nom, en retrait). Bornée : chaque dossier une fois, PROFONDEUR_MAX
 *  niveaux au plus (un dossier d'un cycle se montre à la racine). */
export function destinations(objet: ObjetDeplace, dossiers: Dossiers): Destination[] {
  const carte = enCarte(dossiers)
  const ici = ouIlEst(objet, carte)
  const refus = interdits(objet, carte)
  refus.delete(ici)
  const r: Destination[] = [{ id: null, nom: LIBELLE_RACINE, profondeur: 0, couleur: null, chemin: RACINE, ici: ici === null, interdit: false }]
  const vus = new Set<string>()
  const descendre = (parent: string | null, profondeur: number) => {
    if (profondeur > PROFONDEUR_MAX) return
    for (const d of enfants(parent, carte)) {
      if (vus.has(d.id)) continue
      vus.add(d.id)
      r.push({ id: d.id, nom: d.nom, profondeur, couleur: couleurDe(d.couleur).valeur, chemin: cheminLisible(d.id, carte), ici: ici === d.id, interdit: refus.has(d.id) })
      descendre(d.id, profondeur + 1)
    }
  }
  descendre(null, 1)
  return r
}

/** Une cible du glisser : la carte d'un dossier, un élément du fil d'Ariane
 *  (la racine : id null), et son rectangle (coordonnées de la fenêtre) */
export interface Zone { id: string | null; x: number; y: number; l: number; h: number }

/** La cible sous le point (x, y) : la première zone qui le contient (bords
 *  compris) ; null hors de toute zone, ou si celle qui le contient est
 *  interdite (lâcher là ne fait rien) */
export function cibleSous(x: number, y: number, zones: readonly Zone[], refus: ReadonlySet<string | null>): Zone | null {
  for (const z of zones) {
    if (!(z.l > 0 && z.h > 0)) continue
    if (x < z.x || x > z.x + z.l || y < z.y || y > z.y + z.h) continue
    return refus.has(z.id) ? null : z
  }
  return null
}

/** « « 5e B » et « Soutien » » */
function liste(noms: string[]): string {
  const q = noms.map(n => `« ${n} »`)
  return q.length <= 1 ? q.join('') : `${q.slice(0, -1).join(', ')} et ${q[q.length - 1]}`
}

/** Le message d'un déplacement : « « Symétrie » déplacé dans « 5e B » »,
 *  « Dossier « Géométrie » déplacé dans « 5e B » », « « Symétrie » déplacé à
 *  la racine de la bibliothèque » ; et, quand ses étiquettes de classe
 *  (calculées, voir arbre.etiquettesEffectives) changent, ce qu'il porte
 *  maintenant : « … : il porte maintenant l'étiquette « 5e B » », « … : il
 *  ne porte plus l'étiquette « 2nde 3 » » (pour un dossier : « ses
 *  classeurs portent maintenant… »). avant, apres : ses étiquettes. */
export function texteDeplacement(o: { genre: 'classeur' | 'dossier'; nom: string; vers: string | null; avant: readonly string[]; apres: readonly string[] }): string {
  const debut = o.genre === 'classeur' ? `« ${o.nom} » déplacé` : `Dossier « ${o.nom} » déplacé`
  const ou = o.vers === null ? 'à la racine de la bibliothèque' : `dans « ${o.vers} »`
  const cles = (l: readonly string[]) => new Set(l.map(cleDe))
  const ka = cles(o.avant), kb = cles(o.apres)
  const gagnees = o.apres.filter((e, i) => !ka.has(cleDe(e)) && o.apres.findIndex(x => cleDe(x) === cleDe(e)) === i)
  const perdues = o.avant.filter((e, i) => !kb.has(cleDe(e)) && o.avant.findIndex(x => cleDe(x) === cleDe(e)) === i)
  const mot = (n: number) => n > 1 ? 'les étiquettes' : 'l\'étiquette'
  const qui = o.genre === 'classeur' ? { gagne: 'il porte maintenant', perd: 'il ne porte plus' } : { gagne: 'ses classeurs portent maintenant', perd: 'ses classeurs ne portent plus' }
  let suite = ''
  if (gagnees.length && perdues.length) suite = ` : ${qui.gagne} ${mot(gagnees.length)} ${liste(gagnees)} (et plus ${liste(perdues)})`
  else if (gagnees.length) suite = ` : ${qui.gagne} ${mot(gagnees.length)} ${liste(gagnees)}`
  else if (perdues.length) suite = ` : ${qui.perd} ${mot(perdues.length)} ${liste(perdues)}`
  return `${debut} ${ou}${suite}`
}

/** Le message d'un déplacement annulé (« Annuler ») : « « Symétrie » est
 *  revenu dans « 2nde 3 » », « Le dossier « Géométrie » est revenu à la
 *  racine de la bibliothèque » */
export function texteRetour(o: { genre: 'classeur' | 'dossier'; nom: string; vers: string | null }): string {
  const qui = o.genre === 'classeur' ? `« ${o.nom} »` : `Le dossier « ${o.nom} »`
  return `${qui} est revenu ${o.vers === null ? 'à la racine de la bibliothèque' : `dans « ${o.vers} »`}`
}

/** Le bouton du message qui y mène : « Aller à « 5e B » », « Aller à la racine » */
export const texteAllerA = (vers: string | null) => vers === null ? 'Aller à la racine' : `Aller à « ${vers} »`

/** Le refus d'un dossier dans lui-même ou l'un de ses sous-dossiers (un
 *  autre onglet vient de le déplacer, voir Registre.deplacerDossier) */
export const REFUS_CYCLE = 'Ce dossier ne peut pas aller dans l\'un de ses propres sous-dossiers.'
/** La cible a disparu (supprimée, mise à la corbeille ailleurs) */
export const DOSSIER_PARTI = 'Ce dossier n\'existe plus.'

/** Le classeur est-il déjà là ? (un classeur dont le dossier n'existe plus
 *  est à la racine) */
export const dejaLa = (f: FicheClasseur, cible: string | null, dossiers: Dossiers) => estDans(f, cible, dossiers)
