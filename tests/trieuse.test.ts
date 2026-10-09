// La trieuse des pages : où arrive une page qu'on lâche dans la grille
// (placeDInsertion, et la barre qui le montre), à quelle vitesse la grille
// défile près de son bord (vitesseDefilement), et ce que voient la revue et
// les séances après des pages rangées par le journal de la trieuse : rien
// de plus, rien de moins (un déplacement n'est un geste nulle part). Puis
// ce qu'elle fait aux pages (pages/actions.ts) : renommer, insérer,
// ajouter, dupliquer avec l'histoire, supprimer vers la corbeille, changer
// un fond ; chaque action s'annule et se rétablit par le journal, et
// aucune ne touche une pile d'annulation de page.
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { Tableau } from '../src/document'
import type { Trait } from '../src/types'
import { JournalPages } from '../src/pages/journal'
import { BORD_DEFILEMENT, VITESSE_DEFILEMENT, barreDInsertion, lignesDe, placeDInsertion, vitesseDefilement } from '../src/pages/glisser'
import type { Rect } from '../src/pages/glisser'
import { seancesDuFilm } from '../src/revoir/exporter'
import type { Portion } from '../src/revue/bande'
import { compterGestes, construireBande, seancesDeLaPage } from '../src/revue/bande'
import { lectureDe } from '../src/revue/planches'
import * as actions from '../src/pages/actions'

/** Une grille de `colonnes` × `lignes` cartes de 200 × 150, espacées de 16,
 *  la première en (16, 100) ; la dernière ligne peut être incomplète (n cartes) */
function grille(colonnes: number, lignes: number, n = colonnes * lignes): Rect[] {
  const r: Rect[] = []
  for (let i = 0; i < n && i < colonnes * lignes; i++) {
    const c = i % colonnes, l = Math.floor(i / colonnes)
    r.push({ x: 16 + c * 216, y: 100 + l * 166, l: 200, h: 150 })
  }
  return r
}

describe('placeDInsertion : la place d\'arrivée d\'une page lâchée', () => {
  // 3 colonnes, 4 lignes : les cartes 0 1 2 / 3 4 5 / 6 7 8 / 9 10 11
  const g = grille(3, 4)
  const milieu = (i: number) => ({ x: g[i].x + g[i].l / 2, y: g[i].y + g[i].h / 2 })

  it('les lignes de la grille', () => {
    expect(lignesDe(g)).toEqual([[0, 1, 2], [3, 4, 5], [6, 7, 8], [9, 10, 11]])
    // Un arrondi d'un pixel ne fait pas une nouvelle ligne
    const g2 = g.map((r, i) => ({ ...r, y: r.y + (i % 2 ? 0.6 : 0) }))
    expect(lignesDe(g2)).toEqual(lignesDe(g))
    expect(lignesDe([])).toEqual([])
  })

  it('au milieu d\'une carte : à gauche du milieu, avant elle ; à droite, après elle', () => {
    const m = milieu(4)
    expect(placeDInsertion(g, m.x - 10, m.y)).toBe(4)
    expect(placeDInsertion(g, m.x + 10, m.y)).toBe(5)
    expect(placeDInsertion(g, milieu(0).x - 1, milieu(0).y)).toBe(0)
  })

  it('entre deux cartes d\'une ligne : avant la seconde', () => {
    // L'espace entre la carte 6 et la carte 7
    expect(placeDInsertion(g, g[7].x - 8, milieu(7).y)).toBe(7)
    // Dans l'espace entre deux lignes, la ligne la plus proche décide
    expect(placeDInsertion(g, milieu(4).x - 10, g[4].y - 5)).toBe(4)
    expect(placeDInsertion(g, milieu(4).x - 10, g[1].y + g[1].h + 3)).toBe(1)
  })

  it('au bout d\'une ligne : après sa dernière carte (la première de la ligne suivante)', () => {
    expect(placeDInsertion(g, g[5].x + g[5].l + 40, milieu(5).y)).toBe(6)
    expect(placeDInsertion(g, milieu(2).x + 5, milieu(2).y)).toBe(3)
    // Avant la première carte d'une ligne
    expect(placeDInsertion(g, 2, milieu(3).y)).toBe(3)
  })

  it('sous la dernière ligne : la dernière ligne ; à droite de tout, à la fin', () => {
    expect(placeDInsertion(g, milieu(10).x - 10, 2000)).toBe(10)
    expect(placeDInsertion(g, 5000, 2000)).toBe(12)
    // Au-dessus de la première ligne : la première ligne
    expect(placeDInsertion(g, milieu(1).x + 10, 0)).toBe(2)
    // Une dernière ligne incomplète (10 cartes) : à droite de la dixième, la fin
    const g10 = grille(3, 4, 10)
    expect(placeDInsertion(g10, 600, g10[9].y + 20)).toBe(10)
    expect(placeDInsertion([], 10, 10)).toBe(0)
  })

  it('la barre se pose là où l\'on lâche : entre deux cartes, ou après la dernière de la ligne', () => {
    // Avant la carte 4 : à gauche d'elle, au milieu de l'écart
    expect(barreDInsertion(g, 4, milieu(4).y, 16)).toEqual({ x: g[4].x - 8, y: g[4].y, h: 150 })
    // Au bout de la ligne du milieu (place 6, première carte de la ligne suivante) :
    // après la carte 5, sur la ligne du milieu
    expect(barreDInsertion(g, 6, milieu(5).y, 16)).toEqual({ x: g[5].x + 200 + 8, y: g[5].y, h: 150 })
    // Avant la carte 6 quand le pointeur est sur sa ligne
    expect(barreDInsertion(g, 6, milieu(6).y, 16)).toEqual({ x: g[6].x - 8, y: g[6].y, h: 150 })
    // À la fin
    expect(barreDInsertion(g, 12, milieu(11).y, 16)).toEqual({ x: g[11].x + 200 + 8, y: g[11].y, h: 150 })
    expect(barreDInsertion([], 0, 0)).toBeNull()
  })
})

describe('vitesseDefilement : la grille défile seule près de son bord', () => {
  const haut = 60, bas = 700
  it('rien hors des 60 px du bord', () => {
    expect(vitesseDefilement(380, haut, bas)).toBe(0)
    expect(vitesseDefilement(haut + BORD_DEFILEMENT, haut, bas)).toBe(0)
    expect(vitesseDefilement(bas - BORD_DEFILEMENT, haut, bas)).toBe(0)
  })
  it('de plus en plus vite vers le bord, 18 px par image au bord et au-delà ; négative vers le haut', () => {
    expect(vitesseDefilement(haut, haut, bas)).toBe(-VITESSE_DEFILEMENT)
    expect(vitesseDefilement(haut - 100, haut, bas)).toBe(-VITESSE_DEFILEMENT)
    expect(vitesseDefilement(bas, haut, bas)).toBe(VITESSE_DEFILEMENT)
    expect(vitesseDefilement(bas + 300, haut, bas)).toBe(VITESSE_DEFILEMENT)
    expect(vitesseDefilement(haut + 30, haut, bas)).toBeCloseTo(-9)
    expect(vitesseDefilement(bas - 15, haut, bas)).toBeCloseTo(13.5)
    const v = [50, 40, 30, 20, 10].map(d => vitesseDefilement(bas - d, haut, bas))
    for (let i = 1; i < v.length; i++) expect(v[i]).toBeGreaterThan(v[i - 1])
    expect(VITESSE_DEFILEMENT).toBe(18)
  })
  it('une grille sans hauteur ne défile pas ; une grille basse partage ses bords', () => {
    expect(vitesseDefilement(10, 100, 100)).toBe(0)
    expect(vitesseDefilement(150, 100, 200)).toBe(0)
    expect(vitesseDefilement(100, 100, 200)).toBe(-VITESSE_DEFILEMENT)
  })
})

// ---------- La revue après des pages rangées dans la trieuse ----------
let horloge = new Date('2026-10-09T10:00:00').getTime()
let numero = 0
beforeEach(() => { vi.useFakeTimers({ toFake: ['Date'] }); vi.setSystemTime(horloge) })
afterEach(() => vi.useRealTimers())

/** Avance l'horloge, puis laisse le film noter l'étape (il le fait juste après) */
async function attendre(ms = 500) { horloge += ms; vi.setSystemTime(horloge); await Promise.resolve(); await Promise.resolve() }

function trait(x: number, y: number, id = 'T' + numero++): Trait {
  return { id, type: 'trait', x, y, z: numero++, auteur: 'moi', pts: [0, 0, 0.5, 40, 5, 0.5, 80, 0, 0.5], couleur: '#1b2230', taille: 3, opacite: 1, pression: false }
}

/** Ce que la revue et la fenêtre Publier comptent : les gestes de chaque
 *  portion, et les séances (gestes, pages) */
function comptes(t: Tableau) {
  const lecture = lectureDe(t, () => t.ordre.toArray())
  const seances = seancesDuFilm(lecture.film)
  const nommer = (p: string) => { const i = t.ordre.toArray().indexOf(p); return i < 0 ? 'Page jetée' : `Page ${i + 1}` }
  const pages = [...new Set(lecture.film.map(e => e.page))].sort()
  const portions: Portion[] = []
  for (const s of seances) {
    portions.push({ genre: 'seance', seance: s, page: null })
    for (const p of [...s.pages].sort()) portions.push({ genre: 'seance', seance: s, page: p })
  }
  for (const p of pages) portions.push({ genre: 'page', page: p })
  return {
    seances: seances.map(s => ({ gestes: s.gestes, pages: [...s.pages].sort(), debut: s.debut })),
    gestes: portions.map(p => compterGestes(lecture, p)),
    totaux: portions.map(p => construireBande(lecture, p, seances, nommer)?.total ?? 0),
    seancesDesPages: pages.map(p => seancesDeLaPage(lecture, seances, p).length),
  }
}

describe('des pages rangées par le journal de la trieuse : la revue n\'y voit aucun geste', () => {
  it('compterGestes, les bandes et les séances sont les mêmes après des déplacements, annulés et rétablis', async () => {
    const t = new Tableau(null)
    const pages: string[] = []
    for (let i = 0; i < 5; i++) { const p = t.ajouterPage('carreaux', i); pages.push(p); t.pageVue = p; await attendre() }
    for (const p of pages) for (let k = 0; k < 2; k++) { t.pageVue = p; t.nouveauGeste(); t.poser(p, trait(k * 10, 0)); await attendre(800) }
    t.pageVue = pages[2]
    const avant = comptes(t)
    const film0 = t.film.length
    const j = new JournalPages(t)
    // Comme la trieuse : glisser la page 5 en tête, la page 1 à la fin, puis
    // Ctrl + Maj + → sur la page 3 ; annuler, rétablir
    expect(j.faire('page déplacée', () => { t.deplacerPages([pages[4]], 0) })).not.toBeNull(); await attendre()
    expect(j.faire('page déplacée', () => { t.deplacerPages([pages[0]], 5) })).not.toBeNull(); await attendre()
    const i3 = t.ordre.toArray().indexOf(pages[2])
    expect(j.faire('page déplacée', () => { t.deplacerPages([pages[2]], i3 + 2) })).not.toBeNull(); await attendre()
    expect(t.ordre.toArray()).toEqual([pages[4], pages[1], pages[3], pages[2], pages[0]])
    expect(j.annuler()).toBe('fait'); await attendre()
    expect(j.annuler()).toBe('fait'); await attendre()
    expect(j.retablir()).toBe('fait'); await attendre()
    // Un lâcher à sa propre place ne change rien et n'entre pas dans le journal
    expect(j.faire('page déplacée', () => { t.deplacerPages([pages[1]], t.ordre.toArray().indexOf(pages[1])) })).toBeNull()
    // Le film a noté chaque changement de l'ordre, sans geste
    const notees = t.film.toArray().slice(film0)
    expect(notees.length).toBeGreaterThan(0)
    expect(notees.every(e => e.seulOrdre)).toBe(true)
    // La revue : les mêmes gestes, les mêmes bandes, les mêmes séances
    expect(comptes(t)).toEqual(avant)
  })
})

// ---------- Ce que la trieuse fait aux pages (pages/actions.ts) ----------
/** n pages, un trait sur chacune (son propre geste) ; vides : les indices
 *  des pages laissées vides ; on regarde la première */
async function pages(n: number, vides: number[] = []) {
  const t = new Tableau(null)
  const ids: string[] = []
  for (let i = 0; i < n; i++) { const p = t.ajouterPage('carreaux', i); ids.push(p); t.pageVue = p; await attendre() }
  for (const [i, p] of ids.entries()) {
    if (vides.includes(i)) continue
    t.pageVue = p; t.nouveauGeste(); t.poser(p, trait(i * 10, 0)); await attendre(800)
  }
  t.pageVue = ids[0]
  return { t, ids, j: new JournalPages(t) }
}
/** Les longueurs des piles d'annulation de ces pages (aucune action de la trieuse n'y touche) */
const piles = (t: Tableau, ids: string[]) => ids.map(p => [t.annulationDe(p)?.undoStack.length ?? 0, t.annulationDe(p)?.redoStack.length ?? 0])
const ordreDe = (t: Tableau) => t.ordre.toArray()

describe('les actions de la trieuse', () => {
  it('renommer, annuler, rétablir ; un nom vide le retire ; ni étape du film ni pile', async () => {
    const { t, ids, j } = await pages(3)
    const p0 = piles(t, ids), film = t.film.length
    const r = actions.renommer(t, j, ids[1], '  Exercice   12 p. 84 ')
    expect(r?.nom).toBe('Exercice 12 p. 84')
    expect(t.nomDe(ids[1])).toBe('Exercice 12 p. 84')
    // Le même nom : rien ne change, rien n'entre dans le journal
    expect(actions.renommer(t, j, ids[1], 'Exercice 12 p. 84')).toBeNull()
    expect(j.annuler()).toBe('fait')
    expect(t.nomDe(ids[1])).toBeNull()
    expect(j.retablir()).toBe('fait')
    expect(t.nomDe(ids[1])).toBe('Exercice 12 p. 84')
    const vide = actions.renommer(t, j, ids[1], '   ')
    expect(vide?.nom).toBeNull()
    expect(t.nomDe(ids[1])).toBeNull()
    expect(j.annuler()).toBe('fait')
    expect(t.nomDe(ids[1])).toBe('Exercice 12 p. 84')
    await attendre()
    expect(t.film.length).toBe(film)
    expect(piles(t, ids)).toEqual(p0)
  })

  it('insérer avant, après, à la fin : au fond de la voisine ; annulée, ni dans l\'ordre ni dans la corbeille ; rétablie, à sa place', async () => {
    const { t, ids: [a, b, c], j } = await pages(3)
    t.changerFond(b, 'seyes'); await attendre()
    const p0 = piles(t, [a, b, c])
    const avant = actions.inserer(t, j, b, 'avant')!
    expect(avant.rang).toBe(1)
    expect(ordreDe(t)).toEqual([a, avant.page, b, c])
    expect(t.fondDe(avant.page)).toBe('seyes')
    expect(t.formesDe(avant.page)?.size).toBe(0)
    const apres = actions.inserer(t, j, b, 'apres')!
    expect(ordreDe(t)).toEqual([a, avant.page, b, apres.page, c])
    expect(apres.rang).toBe(3)
    const fin = actions.ajouterALaFin(t, j)!
    expect(fin.rang).toBe(5)
    expect(t.fondDe(fin.page)).toBe('carreaux')                 // le fond de la dernière page
    await attendre()
    // Défaire les trois : elles quittent l'ordre, et la corbeille ne les montre pas
    expect(j.annuler()).toBe('fait')
    expect(j.annuler()).toBe('fait')
    expect(j.annuler()).toBe('fait')
    expect(ordreDe(t)).toEqual([a, b, c])
    expect(t.pagesDeLaCorbeille()).toEqual([])
    for (const p of [avant.page, apres.page, fin.page]) expect(t.dansLaCorbeille(p)).toBe(false)
    // Rétablies, chacune à sa place
    expect(j.retablir()).toBe('fait')
    expect(ordreDe(t)).toEqual([a, avant.page, b, c])
    expect(j.retablir()).toBe('fait')
    expect(ordreDe(t)).toEqual([a, avant.page, b, apres.page, c])
    expect(t.corbeille.has(avant.page)).toBe(false)
    // Une page inconnue : rien
    expect(actions.inserer(t, j, 'inconnue', 'apres')).toBeNull()
    expect(piles(t, [a, b, c])).toEqual(p0)
  })

  it('insérer à un autre fond que la voisine (le second temps du menu) : une seule action, un seul Annuler', async () => {
    const { t, ids: [a, b], j } = await pages(2)
    t.changerFond(b, 'seyes'); await attendre()
    const p0 = piles(t, [a, b])
    const r = actions.inserer(t, j, b, 'apres', 'repere')!
    expect(ordreDe(t)).toEqual([a, b, r.page])
    expect(t.fondDe(r.page)).toBe('repere')
    expect(t.fondDe(b)).toBe('seyes')                          // la voisine n'est pas touchée
    const avant = actions.inserer(t, j, a, 'avant', 'blanc')!
    expect(ordreDe(t)).toEqual([avant.page, a, b, r.page])
    expect(t.fondDe(avant.page)).toBe('blanc')
    await attendre()
    // Un Annuler retire la page entière (pas de second temps « fond changé » à défaire)
    expect(j.annuler()).toBe('fait')
    expect(ordreDe(t)).toEqual([a, b, r.page])
    expect(j.annuler()).toBe('fait')
    expect(ordreDe(t)).toEqual([a, b])
    expect(j.annuler()).not.toBe('fait')
    expect(piles(t, [a, b])).toEqual(p0)
  })

  it('dupliquer plusieurs pages : chaque copie juste après son original, avec son histoire ; annulé, copies définitives hors de la corbeille ; rétabli', async () => {
    const { t, ids: [a, b, c, d], j } = await pages(4)
    t.renommerPage(c, 'Exercice 3')
    const p0 = piles(t, [a, b, c, d])
    const r = actions.dupliquer(t, j, [c, a])!                  // dans l'ordre du tableau, quel que soit l'ordre donné
    expect(r.entree.libelle).toBe('2 pages dupliquées')
    expect(r.copies.map(x => x.de)).toEqual([a, c])
    const [qa, qc] = r.copies.map(x => x.copie)
    expect(ordreDe(t)).toEqual([a, qa, b, c, qc, d])
    expect(t.herite(qa)).toBe(a)
    expect(t.herite(qc)).toBe(c)
    expect(t.nomDe(qc)).toBe('Exercice 3 (copie)')
    // Les mêmes formes, sous les mêmes identifiants
    expect([...t.formesDe(qc)!.keys()]).toEqual([...t.formesDe(c)!.keys()])
    // Aucune pile touchée : celle des copies commence vide
    expect(piles(t, [a, b, c, d])).toEqual(p0)
    expect(t.peutAnnuler(qa)).toBe(false)
    await attendre()
    expect(j.annuler()).toBe('fait')
    expect(ordreDe(t)).toEqual([a, b, c, d])
    for (const q of [qa, qc]) {
      expect(t.corbeille.get(q)?.definitif).toBe(true)
      expect(t.dansLaCorbeille(q)).toBe(false)
    }
    expect(t.pagesDeLaCorbeille()).toEqual([])
    expect(j.retablir()).toBe('fait')
    expect(ordreDe(t)).toEqual([a, qa, b, c, qc, d])
    expect(t.corbeille.has(qa)).toBe(false)
    expect(actions.dupliquer(t, j, ['inconnue'])).toBeNull()
    const seule = actions.dupliquer(t, j, [d])!
    expect(seule.entree.libelle).toBe('page dupliquée')
    expect(piles(t, [a, b, c, d])).toEqual(p0)
  })

  it('supprimer plusieurs pages : dans la corbeille (une page vide non) ; jamais toutes ; annulé, le même ordre qu\'avant', async () => {
    const { t, ids: [a, b, c, d, e], j } = await pages(5, [3])
    const p0 = piles(t, [a, b, c, d, e])
    const aller: string[] = []
    // Toutes : refusé, rien ne change
    expect(actions.supprimer(t, j, [a, b, c, d, e], { regardee: a, aller: p => aller.push(p) })).toBe('tout')
    expect(ordreDe(t)).toEqual([a, b, c, d, e])
    expect(j.peutAnnuler).toBe(false)
    const r = actions.supprimer(t, j, [d, b], { regardee: a, aller: p => aller.push(p) })
    expect(r).not.toBe('tout')
    const s = r as actions.Suppression
    expect(s.retirees).toEqual([b, d])
    expect(s.numeros).toEqual([2, 4])
    expect(s.arrivee).toBe(a)
    expect(s.vides).toEqual([d])                                // vide : rien à reprendre
    expect(aller).toEqual([])                                   // on regardait a, qui reste
    expect(ordreDe(t)).toEqual([a, c, e])
    expect(t.pagesDeLaCorbeille().map(x => x.id)).toEqual([b])
    await attendre()
    expect(t.film.toArray().at(-1)).toMatchObject({ page: a, seulOrdre: true })
    expect(j.annuler()).toBe('fait')
    expect(ordreDe(t)).toEqual([a, b, c, d, e])
    expect(t.pagesDeLaCorbeille()).toEqual([])
    expect(j.retablir()).toBe('fait')
    expect(ordreDe(t)).toEqual([a, c, e])
    expect(piles(t, [a, b, c, d, e])).toEqual(p0)
  })

  it('supprimer la page qu\'on regarde : on va d\'abord sur la page d\'avant ; le journal vidé, Ctrl+Z sur elle la rend', async () => {
    const { t, ids: [a, b, c, d], j } = await pages(4)
    // On regarde c ; on supprime b et c : on arrive sur a (la plus proche avant elles)
    t.pageVue = c
    const vue = { regardee: c, aller: (p: string) => { t.pageVue = p } }
    const s = actions.supprimer(t, j, [b, c], vue) as actions.Suppression
    expect(s.arrivee).toBe(a)
    expect(t.pageVue).toBe(a)
    expect(ordreDe(t)).toEqual([a, d])
    await attendre()
    expect(t.film.toArray().at(-1)).toMatchObject({ page: a, seulOrdre: true })
    // Annuler dans la trieuse les rend toutes deux, à leur place
    expect(j.annuler()).toBe('fait')
    expect(ordreDe(t)).toEqual([a, b, c, d])
    expect(j.retablir()).toBe('fait')
    expect(ordreDe(t)).toEqual([a, d])
    // Une autre suppression, puis la trieuse se ferme (le journal se vide) :
    // Ctrl+Z sur la page d'arrivée rend la page qu'on regardait, et elle seule
    t.pageVue = d
    const s2 = actions.supprimer(t, j, [d], { regardee: d, aller: p => { t.pageVue = p } }) as actions.Suppression
    expect(s2.arrivee).toBe(a)
    j.vider()
    expect(t.peutAnnuler(a)).toBe(true)
    expect(t.annuler(a)).toEqual({ page: d })
    expect(ordreDe(t)).toEqual([a, d])
    expect(t.pagesDeLaCorbeille().map(x => x.id).sort()).toEqual([b, c].sort())
  })

  it('changer le fond : l\'étape se note sur la page ; le repère au centre du contenu, au centimètre ; annulé, le fond revient', async () => {
    const { t, ids: [a, b], j } = await pages(2)
    const p0 = piles(t, [a, b])
    expect(actions.changerFond(t, j, b, 'carreaux', null)).toBeNull()       // déjà ce fond
    const film = t.film.length
    const e = actions.changerFond(t, j, b, 'repere', { x: 100, y: -30, l: 205, h: 50 })!
    expect(e.libelle).toBe('fond changé')
    expect(t.fondDe(b)).toBe('repere')
    expect(t.origineDe(b)).toEqual({ x: 200, y: 0 })                       // (202,5 ; −5) calé sur 40
    await attendre()
    expect(t.film.length).toBe(film + 1)
    expect(t.film.toArray().at(-1)?.page).toBe(b)
    expect(t.film.toArray().at(-1)?.seulOrdre).toBeUndefined()
    expect(j.annuler()).toBe('fait')
    expect(t.fondDe(b)).toBe('carreaux')
    await attendre()
    expect(t.film.toArray().at(-1)?.page).toBe(b)
    // Une page vide prend l'origine (0, 0)
    actions.changerFond(t, j, a, 'repere', null)
    expect(t.origineDe(a)).toEqual({ x: 0, y: 0 })
    expect(piles(t, [a, b])).toEqual(p0)
  })

  it('pageDArrivee, placeDUnPas, pagesVisees', () => {
    const o = ['a', 'b', 'c', 'd', 'e']
    expect(actions.pageDArrivee(o, ['c'], 'c')).toBe('b')
    expect(actions.pageDArrivee(o, ['b', 'c'], 'c')).toBe('a')
    expect(actions.pageDArrivee(o, ['a', 'b'], 'a')).toBe('c')          // la première : la suivante qui reste
    expect(actions.pageDArrivee(o, ['b', 'e'], 'e')).toBe('d')          // la plus proche avant celle qu'on regardait
    expect(actions.pageDArrivee(o, o, 'c')).toBeNull()
    expect(actions.placeDUnPas(o, ['c'], -1)).toBe(1)
    expect(actions.placeDUnPas(o, ['c'], 1)).toBe(4)
    expect(actions.placeDUnPas(o, ['a'], -1)).toBe('debut')
    expect(actions.placeDUnPas(o, ['e'], 1)).toBe('fin')
    expect(actions.placeDUnPas(o, ['b', 'd'], -1)).toBe(0)
    expect(actions.placeDUnPas(o, ['b', 'd'], 1)).toBe(5)
    expect(actions.placeDUnPas(o, [], 1)).toBeNull()
    expect(actions.pagesVisees(o, new Set(['d', 'b']), 'a')).toEqual(['b', 'd'])
    expect(actions.pagesVisees(o, new Set(), 'c')).toEqual(['c'])
    expect(actions.pagesVisees(o, new Set(), null)).toEqual([])
    expect(actions.origineAuCentre(null)).toEqual({ x: 0, y: 0 })
    expect(actions.origineAuCentre({ x: -50, y: -50, l: 20, h: 20 })).toEqual({ x: -40, y: -40 })
  })
})
