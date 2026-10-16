// Les outils partagés des essais vitest des données du lot 5 (l'horloge
// simulée, des formes, un classeur du lot 5, son fichier, ce que lisent la
// revue, l'exporteur et la bobine). Rangé dans le dépôt : les outils qui
// passaient par la version d'avant le lot 5 (construite depuis un commit
// qui n'existe plus) sont retirés, avec les essais de compatibilité qui s'en
// servaient.
import * as Y from 'yjs'
import { vi } from 'vitest'
import { Tableau } from '../../../../../../src/document'
import { ecrireTableau, lireTableau } from '../../../../../../src/fichier'
import type { Forme } from '../../../../../../src/types'
import { lectureDe } from '../../../../../../src/revue/planches'
import { compterGestes, construireBande } from '../../../../../../src/revue/bande'
import { exporterDetaille, seancesDuFilm } from '../../../../../../src/revoir/exporter'
import type { Seance } from '../../../../../../src/revoir/exporter'
import { Bobine } from '../../../../../../src/revoir/bobine'
import type { FilmEleve } from '../../../../../../src/revoir/format'
export const PNG = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg=='
export const MINUTE = 60_000

// ---------- L'horloge (Date seule est simulée) ----------
let horloge = new Date('2026-10-12T08:00:00').getTime()
export function reglerHorloge() { vi.useFakeTimers({ toFake: ['Date'] }); vi.setSystemTime(horloge) }
/** Avance l'horloge, puis laisse le film noter l'étape (il le fait juste après) */
export async function attendre(ms: number) { horloge += ms; vi.setSystemTime(horloge); await Promise.resolve(); await Promise.resolve() }
export const maintenant = () => horloge

// ---------- Des formes ----------
let numero = 0
export function trait(x: number, y: number, id = 'T' + numero++, plus: Partial<Forme> = {}): Forme {
  return { id, type: 'trait', x, y, z: horloge + numero++, auteur: 'moi', pts: [0, 0, 0.5, 40, 5, 0.5, 80, 0, 0.5], couleur: '#1b2230', taille: 3, opacite: 1, pression: false, ...plus } as Forme
}
export function triangle(id: string, x: number, y: number, plus: Partial<Forme> = {}): Forme {
  return { id, type: 'polygone', x, y, z: horloge + numero++, auteur: 'moi', pts: [0, 0, 80, 0, 0, 60], ferme: true, couleur: '#1f5fbf', taille: 2.5, sommets: true, noms: ['A', 'B', 'C'], ...plus } as Forme
}
export function formule(id: string, x: number, y: number, plus: Partial<Forme> = {}): Forme {
  return { id, type: 'formule', x, y, z: horloge + numero++, auteur: 'moi', latex: '\\frac{1}{2}', couleur: '#d0342c', taille: 28, ...plus } as Forme
}
export function photo(id: string, x: number, y: number, plus: Partial<Forme> = {}): Forme {
  return { id, type: 'image', x, y, z: horloge + numero++, auteur: 'moi', src: 'banque1', l: 200, h: 100, m: [1, 0, 0, 1], ...plus } as Forme
}

/** Pose une forme en son propre geste, sur la page qu'on regarde */
export async function geste(t: { pageVue: string; nouveauGeste(): void; poser(p: string, f: never): void }, page: string, f: Forme, ms = 800) {
  t.pageVue = page
  t.nouveauGeste(); t.poser(page, f as never)
  await attendre(ms)
}

/** Le classeur du lot 5 : deux pages ; sur la première, un énoncé importé
 *  fixé en fond, une image libre, un trait verrouillé, un trait et un
 *  triangle du même groupe, une formule tournée (0,5 rad), quelques traits,
 *  puis une étape « réglage » (un trait qu'on verrouille) et encore un
 *  geste ; sur la seconde, deux gestes. plus : ce qu'un autre morceau veut y
 *  ajouter (sur la première page, avant le réglage). */
export async function classeurLot5(plus?: (t: Tableau, p1: string, p2: string) => Promise<void>) {
  const t = new Tableau(null)
  t.doc.getMap('images').set('banque1', PNG)
  const p1 = t.ajouterPage('carreaux', 0); t.pageVue = p1; await attendre(500)
  const p2 = t.ajouterPage('seyes', 1); t.pageVue = p1; await attendre(500)
  await attendre(30 * MINUTE)
  await geste(t, p1, photo('enonce', 0, 0, { fixe: true }))
  await geste(t, p1, photo('libre', 300, 0))
  await geste(t, p1, trait(0, 200, 'verrouille', { verrou: true }))
  t.pageVue = p1; t.nouveauGeste()
  t.poserPlusieurs(p1, [trait(0, 300, 'm1', { groupe: 'g1' }), triangle('m2', 100, 300, { groupe: 'g1' })]); await attendre(800)
  await geste(t, p1, formule('tournee', 0, 400, { rotation: 0.5 } as Partial<Forme>))
  for (let k = 0; k < 3; k++) await geste(t, p1, trait(k * 100, 500, 'e' + k))
  if (plus) await plus(t, p1, p2)
  t.pageVue = p1; t.nouveauGeste()
  t.modifier(p1, [{ id: 'e0', patch: { verrou: true } }], { note: 'reglage' }); await attendre(800)
  await geste(t, p1, trait(0, 600, 'apres'))
  await geste(t, p2, trait(0, 0, 'q1'))
  await geste(t, p2, trait(0, 100, 'q2'))
  return { t, p1, p2 }
}

export const octets = async (doc: Y.Doc, date = maintenant()) => new Uint8Array(await ecrireTableau(doc, date).arrayBuffer())

/** Le fichier du lot 5, relu par le lot 5 */
export async function nouveauDepuisNouveau(t: Tableau): Promise<Tableau> {
  const lu = lireTableau(await octets(t.doc))
  const n = new Tableau(null)
  Y.applyUpdate(n.doc, lu.etat, 'film')
  return n
}

/** Ce que lisent la revue, l'exporteur et la bobine  */
export interface Parcours {
  seances: { gestes: number; pages: number }[]
  /** Pour chaque séance : ce que la revue en compte (toutes pages) */
  gestesRevue: number[]
  /** Pour chaque page : toute son histoire, dans la revue */
  gestesPages: Record<string, number>
  /** Pour chaque séance : les étapes du film élève, et la bobine qui le rejoue */
  films: { etapes: number; images: number; formes: number }[]
  dernier: FilmEleve | null
}

type Outils = {
  ordre: () => string[]
  film: () => readonly unknown[]
  lecture: () => unknown
  seances: (film: readonly unknown[]) => Seance[]
  compter: (l: unknown, p: unknown) => number
  bande: (l: unknown, p: unknown, s: readonly Seance[]) => unknown
  exporter: (s: Seance, pages: string[]) => FilmEleve
  bobine: (f: FilmEleve) => { n: number; image(k: number, page?: string): { formes: unknown[] } }
}

function parcourir(o: Outils): Parcours {
  const l = o.lecture()
  const seances = o.seances(o.film())
  const r: Parcours = { seances: seances.map(s => ({ gestes: s.gestes, pages: s.pages.length })), gestesRevue: [], gestesPages: {}, films: [], dernier: null }
  for (const s of seances) {
    r.gestesRevue.push(o.compter(l, { genre: 'seance', seance: s, page: null }))
    for (const p of o.ordre()) o.bande(l, { genre: 'seance', seance: s, page: p }, seances)
    o.bande(l, { genre: 'seance', seance: s, page: null }, seances)
    const f = o.exporter(s, o.ordre())
    const b = o.bobine(f)
    let formes = 0
    for (let k = 0; k < b.n; k++) formes += b.image(k).formes.length
    r.films.push({ etapes: f.etapes.length, images: b.n, formes })
    r.dernier = f
  }
  for (const p of o.ordre()) {
    r.gestesPages[p] = o.compter(l, { genre: 'page', page: p })
    o.bande(l, { genre: 'page', page: p }, seances)
  }
  return r
}

export function parcourirNouveau(t: Tableau): Parcours {
  return parcourir({
    ordre: () => t.ordre.toArray(),
    film: () => t.film.toArray(),
    lecture: () => lectureDe(t, () => t.ordre.toArray()),
    seances: f => seancesDuFilm(f as never),
    compter: (l, p) => compterGestes(l as never, p as never),
    bande: (l, p, s) => construireBande(l as never, p as never, s, x => x),
    exporter: (s, pages) => exporterDetaille(t, { de: s.de, a: s.a, pages, titre: 'Essai' }).film,
    bobine: f => new Bobine(f),
  })
}

/** Les formes d'une page, par identifiant (des objets à plat) */
export function formesPar(t: { formesDe(p: string): Y.Map<unknown> | null }, page: string): Map<string, Forme & Record<string, unknown>> {
  return new Map([...(t.formesDe(page)?.entries() ?? [])].map(([id, f]) => [id, f as Forme & Record<string, unknown>]))
}
