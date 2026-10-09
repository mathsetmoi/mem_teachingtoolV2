// La trieuse des pages : où arrive une page qu'on lâche dans la grille
// (placeDInsertion, et la barre qui le montre), à quelle vitesse la grille
// défile près de son bord (vitesseDefilement), et ce que voient la revue et
// les séances après des pages rangées par le journal de la trieuse : rien
// de plus, rien de moins (un déplacement n'est un geste nulle part).
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
