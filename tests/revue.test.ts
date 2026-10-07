// La revue en classe : ce qu'on revoit, image par image, et la garantie
// qu'elle ne fait que lire. Le tableau doit revenir intact : aucune
// transaction, le même vecteur d'état, le même film.
import { readFileSync, readdirSync } from 'node:fs'
import { join } from 'node:path'
import * as Y from 'yjs'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { Tableau } from '../src/document'
import type { Cercle, Forme, Polygone, Segment, Trait } from '../src/types'
import { seancesDuFilm } from '../src/revoir/exporter'
import { COUDE, PLAFOND, PLANCHER, tasser } from '../src/revoir/rythme'
import { TRACE_MAX, TRACE_MIN, dureeDuTrace, esquisse, longueur } from '../src/revoir/esquisse'
import type { Bande, Portion } from '../src/revue/bande'
import {
  ENTREE, PAUSE_DE_PARTIE, bandeParDefaut, compterGestes, construireBande, echeances, entreePrecedente, entreeSuivante, heureLisible, indiceAuTemps,
  listeDesPages, partieDe, pasPrecedent, pasSuivant, prochainArret, seancesDeLaPage,
} from '../src/revue/bande'
import { Planches, lectureDe } from '../src/revue/planches'

const MINUTE = 60_000
let horloge = new Date('2026-10-07T08:00:00').getTime()
let numero = 0

beforeEach(() => { vi.useFakeTimers({ toFake: ['Date'] }); vi.setSystemTime(horloge) })
afterEach(() => vi.useRealTimers())

/** Avance l'horloge, puis laisse le film noter l'étape (il le fait juste après) */
async function attendre(ms: number) { horloge += ms; vi.setSystemTime(horloge); await Promise.resolve(); await Promise.resolve() }

function trait(x: number, y: number, n = 6): Trait {
  const pts: number[] = []
  for (let i = 0; i < n; i++) pts.push(i * 3.333333, Math.sin(i) * 7.77777, 0.512345)
  return { id: 'T' + numero++, type: 'trait', x, y, z: numero, auteur: 'a', pts, couleur: '#1b2230', taille: 3, opacite: 1, pression: false }
}
function formule(latex: string, x = 0, y = 0): Forme {
  return { id: 'F' + numero++, type: 'formule', x, y, z: numero, auteur: 'a', latex, couleur: '#1b2230', taille: 28 }
}

/** Un tableau neuf, sans enregistrement, avec une page */
async function nouveauTableau() {
  const t = new Tableau(null)
  const page = t.ajouterPage('carreaux', 0)
  t.pageVue = page
  await attendre(1000)
  return { t, page }
}

/** Une nouvelle page, qu'on regarde aussitôt (comme « Nouvelle page ») */
async function pageNeuve(t: Tableau) {
  const p = t.ajouterPage('blanc', t.ordre.length)
  t.pageVue = p
  await attendre(500)
  return p
}

/** Une séance au hasard : on pose, on modifie, on efface, on change de page et de fond */
async function seanceAuHasard(gestes: number, graine = 1) {
  let s = graine
  const hasard = () => { s = (s * 16807) % 2147483647; return s / 2147483647 }
  const { t, page } = await nouveauTableau()
  const pages = [page]
  for (let i = 0; i < gestes; i++) {
    const r = hasard()
    if (r < 0.04 && pages.length < 4) { const p = t.ajouterPage('blanc', pages.length); pages.push(p); t.pageVue = p }
    else if (r < 0.1) t.pageVue = pages[Math.floor(hasard() * pages.length)]
    const p = t.pageVue
    const formes = t.formesDe(p)!
    const ids = [...formes.keys()]
    const q = hasard()
    if (q < 0.55 || !ids.length) t.poser(p, hasard() < 0.8 ? trait(hasard() * 900, hasard() * 600, 3 + Math.floor(hasard() * 30)) : formule('x^' + i))
    else if (q < 0.75) t.modifier(p, [{ id: ids[Math.floor(hasard() * ids.length)], patch: { x: hasard() * 900 } }])
    else if (q < 0.95) t.supprimer(p, [ids[Math.floor(hasard() * ids.length)]])
    else t.changerFond(p, hasard() < 0.5 ? 'seyes' : 'repere', { x: 3, y: 4 })
    await attendre(200 + Math.floor(hasard() * 4000))
  }
  return { t, pages }
}

/** Ce que la revue reçoit : une lecture seule, les séances, des noms de pages */
function revue(t: Tableau) {
  const lecture = lectureDe(t, () => t.ordre.toArray())
  const seances = seancesDuFilm(lecture.film)
  const nommer = (p: string) => { const i = t.ordre.toArray().indexOf(p); return i < 0 ? 'Page jetée' : `Page ${i + 1}` }
  const bande = (p: Portion) => construireBande(lecture, p, seances, nommer)!
  return { lecture, seances, nommer, bande, planches: new Planches(lecture) }
}

describe('le rythme', () => {
  it('garde le temps court, tasse les longs silences, ne dépasse jamais le plafond', () => {
    expect(tasser(NaN)).toBe(PLANCHER)
    expect(tasser(-5)).toBe(PLANCHER)
    expect(tasser(10)).toBe(PLANCHER)
    for (const dt of [51, 120, 700, 1199, COUDE]) expect(tasser(dt)).toBe(dt)
    let avant = 0
    for (let dt = 0; dt < 200_000; dt += 37) {
      const v = tasser(dt)
      expect(v).toBeGreaterThanOrEqual(avant)
      expect(v).toBeLessThanOrEqual(PLAFOND)
      avant = v
    }
    expect(tasser(COUDE + 1e-6) - tasser(COUDE)).toBeLessThan(1e-3)       // pas de marche au coude
    expect(tasser(10_000)).toBe(PLAFOND)
    expect(tasser(1e12)).toBe(PLAFOND)
  })
})

describe('le tracé en train de se faire', () => {
  const droit: Trait = { id: 'd', type: 'trait', x: 5, y: 5, z: 1, auteur: 'a', pts: Array.from({ length: 11 }, (_, i) => [i * 10, 0, 0.5]).flat(), couleur: '#000', taille: 3, opacite: 1, pression: false }
  const carre: Polygone = {
    id: 'c', type: 'polygone', x: 0, y: 0, z: 2, auteur: 'a', pts: [0, 0, 100, 0, 100, 100, 0, 100], ferme: true,
    couleur: '#000', taille: 3, sommets: true, noms: ['A', 'B', 'C', 'D'], codage: true, fond: '#1f5fbf',
    stylePoints: [{ marque: 'croix' }, null, null, null],
  }

  it('à la fin, la forme elle-même', () => {
    expect(esquisse(droit, 1)).toBe(droit)
    expect(esquisse(carre, 1.5)).toBe(carre)
  })

  it('un trait droit à mi-course a la moitié de sa longueur', () => {
    const e = esquisse(droit, 0.5) as Trait
    expect(Math.abs(longueur(e) - 50)).toBeLessThan(1e-9)
    expect(e.pts.length).toBe(6 * 3)
    const e2 = esquisse(droit, 0.37) as Trait
    expect(Math.abs(longueur(e2) - 37)).toBeLessThan(1e-9)
    expect(e2.pts.slice(-3)).toEqual([37, 0, 0.5])                 // le dernier point est interpolé
    expect((esquisse(droit, 0) as Trait).pts.length).toBe(3)       // au moins un point
  })

  it('un polygone se construit côté par côté, sans noms, codage ni remplissage', () => {
    const e = esquisse(carre, 0.5) as Polygone
    expect(e.ferme).toBe(false)
    expect(e.sommets).toBe(false)
    expect(e.codage).toBe(false)
    expect(e.fond).toBe(null)
    expect(e.stylePoints).toBeUndefined()
    expect(e.prolonge).toBeUndefined()
    expect(e.pts).toEqual([0, 0, 100, 0, 100, 100])
    const droite: Polygone = { ...carre, pts: [0, 0, 30, 40], ferme: false, prolonge: 'droite' }
    expect(longueur(droite)).toBe(50)
    expect((esquisse(droite, 0.5) as Polygone).pts).toEqual([0, 0, 15, 20])
  })

  it('un cercle s\'ouvre comme au compas, un arc garde son sens', () => {
    const c: Cercle = { id: 'r', type: 'cercle', x: 0, y: 0, z: 3, auteur: 'a', r: 50, couleur: '#000', taille: 3, codage: true, sommets: true, fond: '#f00' }
    const e = esquisse(c, 0.25) as Cercle
    expect(e.arc!.a0).toBeCloseTo(-Math.PI / 2)
    expect(e.arc!.a1 - e.arc!.a0).toBeCloseTo(Math.PI / 2)
    expect(e.codage).toBe(false); expect(e.sommets).toBe(false); expect(e.fond).toBe(null)
    const arc: Cercle = { ...c, arc: { a0: 1, a1: -1 } }
    const ea = esquisse(arc, 0.5) as Cercle
    expect(ea.arc).toEqual({ a0: 1, a1: 0 })
    expect(longueur(arc)).toBe(100)
  })

  it('un ancien segment s\'allonge ; formules et images paraissent d\'un coup', () => {
    const s: Segment = { id: 's', type: 'segment', x: 0, y: 0, z: 4, auteur: 'a', dx: 80, dy: -40, couleur: '#000', taille: 3 }
    expect(esquisse(s, 0.25)).toMatchObject({ dx: 20, dy: -10 })
    const f = formule('x^2')
    expect(esquisse(f, 0.3)).toBe(f)
    const img: Forme = { id: 'i', type: 'image', x: 0, y: 0, z: 5, auteur: 'a', src: 's', l: 10, h: 10, m: [1, 0, 0, 1] }
    expect(esquisse(img, 0.3)).toBe(img)
  })

  it('la durée du tracé reste dans ses bornes', () => {
    expect(dureeDuTrace([])).toBe(0)
    expect(dureeDuTrace([formule('x')])).toBe(0)
    expect(dureeDuTrace([{ ...droit, pts: [0, 0, 0.5, 1, 0, 0.5] }])).toBe(TRACE_MIN)
    expect(dureeDuTrace([{ ...droit, pts: [0, 0, 0.5, 100_000, 0, 0.5] }])).toBe(TRACE_MAX)
    const d = dureeDuTrace([droit, carre])
    expect(d).toBeGreaterThanOrEqual(TRACE_MIN); expect(d).toBeLessThanOrEqual(TRACE_MAX)
  })
})

describe('lire une seule page', () => {
  it('dit la même chose que la reconstruction, y compris pour une page jetée', async () => {
    const { t, pages } = await seanceAuHasard(120, 11)
    const brouillon = await pageNeuve(t)
    t.poser(brouillon, trait(1, 1)); await attendre(1000)
    t.poser(brouillon, formule('y')); await attendre(1000)
    t.pageVue = pages[0]
    t.supprimerPage(brouillon); await attendre(1000)
    const film = t.film.toArray()
    for (let i = 0; i < film.length; i += 2) {
      for (const p of [...pages, brouillon]) expect(t.pageA(film[i], p)).toEqual(t.pageReconstruite(film[i], p))
    }
    // La page jetée se lit encore dans un instantané ancien
    expect(t.pageA(film[film.length - 2], brouillon)!.formes).toHaveLength(2)
    expect(t.pageA(film[film.length - 1], brouillon)).toBeNull()
  })
})

describe('ce qu\'on revoit en ouvrant', () => {
  it('la page affichée dans sa dernière séance, sinon la dernière séance entière', async () => {
    const { t, page } = await nouveauTableau()
    t.poser(page, trait(0, 0)); await attendre(1000)
    await attendre(30 * MINUTE)
    const autre = await pageNeuve(t)
    t.poser(autre, trait(0, 0)); await attendre(1000)
    const jamais = t.ajouterPage('blanc', 5); await attendre(100)
    const r = revue(t)
    const s = r.seances
    const ouvrir = (p: string) => bandeParDefaut(r.lecture, s, p, r.nommer)?.portion
    // jamais : la création est notée sur la page qu'on regarde, pas sur elle
    expect(ouvrir(page)).toMatchObject({ genre: 'seance', seance: s[1], page })
    expect(ouvrir(autre)).toMatchObject({ genre: 'seance', seance: s[0], page: autre })
    expect(ouvrir('inconnue')).toMatchObject({ genre: 'seance', seance: s[0], page: null })
    expect(bandeParDefaut(r.lecture, [], page, r.nommer)).toBeNull()
    void jamais
  })

  it('une page toute neuve, après une pause ou le lendemain : la dernière séance qui montre quelque chose', async () => {
    for (const pause of [16 * 60 * MINUTE, 25 * MINUTE]) {
      const { t, page } = await nouveauTableau()
      for (let i = 0; i < 6; i++) { t.poser(page, trait(i, 0)); await attendre(800) }
      await attendre(pause)
      const neuve = await pageNeuve(t)                                  // « Nouvelle page », puis « Revoir »
      const r = revue(t)
      expect(r.seances).toHaveLength(2)
      // La dernière séance n'a fait que créer la page : elle n'a rien à montrer
      expect(construireBande(r.lecture, { genre: 'seance', seance: r.seances[0], page: null }, r.seances, r.nommer)).toBeNull()
      const b = bandeParDefaut(r.lecture, r.seances, neuve, r.nommer)!
      expect(b).not.toBeNull()
      expect(b.portion).toMatchObject({ genre: 'seance', seance: r.seances[1], page: null })
      expect(b.total).toBe(6)
      // Revenu sur la page 1 : sa dernière séance, avec ses six gestes
      expect(bandeParDefaut(r.lecture, r.seances, page, r.nommer)).toMatchObject({ portion: { seance: r.seances[1], page }, total: 6 })
    }
    // Un tableau où il n'y a encore rien eu : rien à montrer
    const { t, page } = await nouveauTableau()
    const r = revue(t)
    expect(bandeParDefaut(r.lecture, r.seances, page, r.nommer)).toBeNull()
  })
})

describe('une figure reconnue', () => {
  it('le trait à main levée puis la figure qui le remplace : une image, un geste, la figure seule se dessine', async () => {
    const { t, page } = await nouveauTableau()
    /** Comme le stylo : le trait est posé, puis, dans une seconde étape, la figure le remplace */
    const figure = async (p: string, x: number) => {
      const brut = trait(x, 0, 49)
      t.nouveauGeste(); t.poser(p, brut)
      await attendre(1)
      const carre: Polygone = { id: 'R' + numero++, type: 'polygone', x, y: 0, z: numero, auteur: 'a', pts: [0, 0, 80, 0, 80, 60, 0, 60], ferme: true, couleur: '#1b2230', taille: 3 }
      t.nouveauGeste(); t.doc.transact(() => { t.supprimer(p, [brut.id]); t.poser(p, carre) })
      await attendre(3000)
      return carre.id
    }
    const figures: string[] = []
    for (let i = 0; i < 6; i++) figures.push(await figure(page, i * 100))
    const r = revue(t)
    const b = r.bande({ genre: 'seance', seance: r.seances[0], page })
    expect(b.total).toBe(6)
    expect(b.images).toHaveLength(7)
    expect(r.planches.lire(b.images[0]).formes).toEqual([])            // le tracé à main levée n'est jamais montré
    for (let k = 1; k < b.images.length; k++) {
      // Chaque image montre la figure, jamais le tracé à main levée
      expect(r.planches.lire(b.images[k]).formes.map(f => f.type)).toEqual(Array(k).fill('polygone'))
      expect(r.planches.apparues(b.images[k - 1], b.images[k]).map(f => f.id)).toEqual([figures[k - 1]])
    }
    // Une figure en premier geste d'une page neuve : la partie s'ouvre sur la page vide
    const p2 = await pageNeuve(t)
    for (let i = 0; i < 3; i++) await figure(p2, i * 100)
    const r2 = revue(t)
    const b2 = r2.bande({ genre: 'seance', seance: r2.seances[0], page: null })
    expect(b2.total).toBe(9)
    expect(b2.parties).toHaveLength(2)
    expect(r2.planches.lire(b2.images[b2.parties[1].debut]).formes).toEqual([])
    expect(b2.images.every(img => r2.planches.lire(img).formes.every(f => f.type === 'polygone'))).toBe(true)
    // Deux gestes séparés de plus de 50 ms restent deux images
    const deux = await gestesEspaces([60])
    expect(deux.b.total).toBe(2)
  })
})

describe('la bande montre fidèlement le tableau', () => {
  it('chaque image est la page notée, telle qu\'elle était après son geste', async () => {
    const { t } = await seanceAuHasard(260, 5)
    const r = revue(t)
    const film = r.lecture.film
    const s = r.seances[Math.floor(r.seances.length / 2)]
    const b = r.bande({ genre: 'seance', seance: s, page: null })
    let precedente = -1
    for (const img of b.images) {
      if (!img.geste) continue
      expect(img.e).toBeGreaterThan(precedente)
      precedente = img.e
      expect(img.p).toBe(film[img.e].page)
      expect(r.planches.lire(img)).toEqual(t.pageA(film[img.e], img.p))
    }
    expect(b.total).toBe(b.images.filter(i => i.geste).length)
  })
})

describe('ce qui n\'est pas un geste', () => {
  it('la naissance d\'une page ne fait pas d\'image : un trait, c\'est un geste', async () => {
    const { t, page } = await nouveauTableau()
    t.poser(page, trait(0, 0)); await attendre(1000)
    const r = revue(t)
    expect(r.lecture.film).toHaveLength(2)
    expect(r.lecture.naissance(0)).toBe(true)
    expect(r.lecture.naissance(1)).toBe(false)
    const b = r.bande({ genre: 'seance', seance: r.seances[0], page })
    expect(b.images).toHaveLength(2)
    expect(b.total).toBe(1)
    expect(r.planches.lire(b.images[0]).formes).toHaveLength(0)
  })

  it('une page neuve au milieu d\'une séance : sa partie s\'ouvre sur elle, vide, sans geste de plus', async () => {
    const { t, page } = await nouveauTableau()
    for (let i = 0; i < 3; i++) { t.poser(page, trait(i, 0)); await attendre(800) }
    const p2 = await pageNeuve(t)
    for (let i = 0; i < 3; i++) { t.poser(p2, trait(i, 0)); await attendre(800) }
    const r = revue(t)
    const b = r.bande({ genre: 'seance', seance: r.seances[0], page: null })
    expect(b.total).toBe(6)
    expect(b.parties).toHaveLength(2)
    expect(r.planches.lire(b.images[b.parties[1].debut]).formes).toHaveLength(0)
    // Deux gestes sur une page neuve font une partie (la prendre pèse comme un geste) ;
    // un seul geste sur une autre page neuve, ou deux sur une page qu'on retrouve, restent un détour
    const p3 = await pageNeuve(t)
    for (let i = 0; i < 2; i++) { t.poser(p3, trait(i, 0)); await attendre(800) }
    const p4 = await pageNeuve(t)
    t.poser(p4, trait(0, 9)); await attendre(800)
    t.pageVue = p2
    for (let i = 0; i < 2; i++) { t.poser(p2, trait(i, 5)); await attendre(800) }
    const r1 = revue(t)
    const b1 = r1.bande({ genre: 'seance', seance: r1.seances[0], page: null })
    expect(b1.parties.map(x => x.page)).toEqual([page, p2, p3])
    expect(b1.total).toBe(11)
    // Une page qui n'a fait que naître n'a rien à montrer
    const vide = await pageNeuve(t)
    const r2 = revue(t)
    expect(construireBande(r2.lecture, { genre: 'seance', seance: r2.seances[0], page: vide }, r2.seances, r2.nommer)).toBeNull()
    expect(seancesDeLaPage(r2.lecture, r2.seances, vide)).toHaveLength(0)
    expect(seancesDeLaPage(r2.lecture, r2.seances, p3)).toHaveLength(1)
  })

  it('un Ctrl+Z fait depuis une autre page : la bande finit sur la page telle qu\'elle est', async () => {
    const { t, page } = await nouveauTableau()
    const dernier = trait(9, 9)
    for (const f of [trait(0, 0), trait(5, 5), dernier]) { t.nouveauGeste(); t.poser(page, f); await attendre(1000) }
    const p2 = await pageNeuve(t)
    t.nouveauGeste(); t.poser(p2, trait(1, 1)); await attendre(1000)
    // Deux Ctrl+Z en regardant la page 2 : le second retire le dernier trait de la page 1
    t.annulation.undo(); await attendre(500)
    t.annulation.undo(); await attendre(500)
    expect(t.formesDe(page)!.has(dernier.id)).toBe(false)
    const r = revue(t)
    for (const p of [{ genre: 'seance', seance: r.seances[0], page }, { genre: 'page', page }] as Portion[]) {
      const b = r.bande(p)
      const affiche = r.planches.lire(b.images[b.images.length - 1])
      expect(affiche.formes.map(f => f.id)).toEqual([...t.formesDe(page)!.values()].sort((a, c) => a.z - c.z).map(f => f.id))
      expect(b.parties[b.parties.length - 1].fin).toBe(b.images.length - 1)
      expect(b.total).toBe(b.images.filter(i => i.geste).length)
    }
    // La page 2, elle, finit déjà sur son état vrai : rien n'est ajouté
    const b2 = r.bande({ genre: 'seance', seance: r.seances[0], page: p2 })
    expect(b2.images.every(i => i.p === p2 && (!i.geste || r.lecture.film[i.e].page === p2))).toBe(true)
  })

  it('« Supprimer la page » ne compte pas comme un geste de la page où l\'on revient', async () => {
    const { t, page } = await nouveauTableau()
    for (let i = 0; i < 3; i++) { t.poser(page, trait(i, 0)); await attendre(800) }
    const brouillon = await pageNeuve(t)
    for (let i = 0; i < 2; i++) { t.poser(brouillon, trait(i, 5)); await attendre(800) }
    // Comme l'application : on revient sur la page 1, puis on jette le brouillon (l'étape est notée sur la page 1)
    t.pageVue = page
    t.supprimerPage(brouillon); await attendre(800)
    let r = revue(t)
    expect(r.lecture.film[r.lecture.film.length - 1].page).toBe(page)
    for (const p of [{ genre: 'seance', seance: r.seances[0], page }, { genre: 'page', page }] as Portion[]) {
      const b = r.bande(p)
      expect(b.total).toBe(3)
      expect(r.planches.lire(b.images[b.images.length - 1]).formes).toHaveLength(3)
    }
    expect(r.bande({ genre: 'seance', seance: r.seances[0], page: null }).total).toBe(5)
    // Au milieu de la portion aussi : on continue d'écrire sur la page 1
    for (let i = 0; i < 2; i++) { t.poser(page, trait(i, 9)); await attendre(800) }
    r = revue(t)
    const b = r.bande({ genre: 'seance', seance: r.seances[0], page })
    expect(b.total).toBe(5)
    for (let k = 1; k < b.images.length; k++) expect(r.planches.apparues(b.images[k - 1], b.images[k])).toHaveLength(1)
    expect(r.bande({ genre: 'seance', seance: r.seances[0], page: null }).total).toBe(7)
    // Deux pages jetées de suite depuis la page 1, puis on y écrit encore
    const [p4, p5] = [await pageNeuve(t), await pageNeuve(t)]
    t.poser(p5, trait(0, 0)); await attendre(800)
    t.pageVue = page
    t.supprimerPage(p4); await attendre(500)
    t.supprimerPage(p5); await attendre(500)
    t.poser(page, trait(7, 7)); await attendre(800)
    r = revue(t)
    const b3 = r.bande({ genre: 'seance', seance: r.seances[0], page })
    expect(b3.total).toBe(6)
    for (let k = 1; k < b3.images.length; k++) expect(r.planches.apparues(b3.images[k - 1], b3.images[k])).toHaveLength(1)
    // Une séance qui n'a fait que jeter une page n'a rien à montrer
    const p3 = await pageNeuve(t)
    t.poser(p3, trait(0, 0)); await attendre(800)
    t.pageVue = page
    await attendre(40 * MINUTE)
    t.supprimerPage(p3); await attendre(800)
    r = revue(t)
    expect(r.seances).toHaveLength(2)
    expect(construireBande(r.lecture, { genre: 'seance', seance: r.seances[0], page: null }, r.seances, r.nommer)).toBeNull()
    expect(bandeParDefaut(r.lecture, r.seances, page, r.nommer)!.portion).toMatchObject({ seance: r.seances[1], page })
  })

  it('une page jetée garde sa dernière image, sans page vide au bout', async () => {
    const { t, page } = await nouveauTableau()
    const p2 = await pageNeuve(t)
    for (let i = 0; i < 3; i++) { t.poser(p2, trait(i, 0)); await attendre(800) }
    t.pageVue = page
    t.supprimerPage(p2); await attendre(800)
    const r = revue(t)
    const b = r.bande({ genre: 'page', page: p2 })
    expect(b.total).toBe(3)
    expect(r.planches.lire(b.images[b.images.length - 1]).formes).toHaveLength(3)
  })
})

describe('le nombre de gestes annoncé', () => {
  it('« Effacer la page » à l\'arrivée de la classe : le tiroir compte comme la bande', async () => {
    const { t, page } = await nouveauTableau()
    for (let i = 0; i < 6; i++) { t.poser(page, trait(i, 0)); await attendre(800) }
    await attendre(16 * 60 * MINUTE)                                    // le lendemain
    t.supprimer(page, [...t.formesDe(page)!.keys()]); await attendre(1000)
    for (let i = 0; i < 3; i++) { t.poser(page, trait(i, 5)); await attendre(800) }
    const r = revue(t)
    for (const p of [{ genre: 'seance', seance: r.seances[0], page }, { genre: 'seance', seance: r.seances[0], page: null }] as Portion[]) {
      expect(r.bande(p).total).toBe(3)
      expect(compterGestes(r.lecture, p)).toBe(3)
    }
    expect(compterGestes(r.lecture, { genre: 'page', page })).toBe(r.bande({ genre: 'page', page }).total)
  })

  it('pour toutes les portions d\'un tableau au hasard, le compte est le total de la bande', async () => {
    const { t, pages } = await seanceAuHasard(400, 31)
    await attendre(30 * MINUTE)
    const brouillon = await pageNeuve(t)
    t.poser(brouillon, trait(3, 3)); await attendre(1000)
    t.pageVue = pages[0]
    t.supprimerPage(brouillon); await attendre(1000)
    t.annulation.undo(); await attendre(500)                             // un Ctrl+Z en fin de portion
    const r = revue(t)
    const portions: Portion[] = []
    for (const s of r.seances) {
      portions.push({ genre: 'seance', seance: s, page: null })
      for (const p of s.pages) portions.push({ genre: 'seance', seance: s, page: p })
    }
    for (const p of new Set(r.lecture.film.map(e => e.page))) if (p) portions.push({ genre: 'page', page: p })
    for (const p of portions) {
      const b = construireBande(r.lecture, p, r.seances, r.nommer)
      expect(compterGestes(r.lecture, p)).toBe(b?.total ?? 0)
      if (b) expect(b.total).toBe(b.images.filter(i => i.geste).length)
    }
  })
})

describe('les pages d\'une séance, en mots', () => {
  it('nomme les pages encore là, compte les jetées, accorde', () => {
    const ici = ['x', 'y', 'z', 'w', 'v']
    expect(listeDesPages(['x'], ici)).toBe('page 1')
    expect(listeDesPages(['y', 'x'], ici)).toBe('pages 1, 2')
    expect(listeDesPages(['a'], ici)).toBe('page jetée')
    expect(listeDesPages(['x', 'a', 'b'], ici)).toBe('page 1 et 2 pages jetées')
    expect(listeDesPages(['a', 'b', 'c', 'd', 'e'], ici)).toBe('5 pages jetées')
    expect(listeDesPages(['a', 'b', 'c', 'd', 'x'], ici)).toBe('page 1 et 4 pages jetées')
    expect(listeDesPages(['a', 'b', 'x', 'y', 'z'], ici)).toBe('pages 1, 2, 3 et 2 pages jetées')
    expect(listeDesPages(['x', 'y', 'z', 'w', 'a'], ici)).toBe('pages 1, 2, 3 et 2 autres')
    expect(listeDesPages(['x', 'y', 'z', 'w', 'v'], ici)).toBe('pages 1, 2, 3 et 2 autres')
  })
})

describe('le départ propre', () => {
  it('« Effacer la page » en premier geste : la revue part de la page vide', async () => {
    const { t, page } = await nouveauTableau()
    t.poser(page, formule('\\text{Absents : Noah}')); await attendre(1000)
    t.poser(page, trait(5, 5)); await attendre(16 * 60 * MINUTE)       // le lendemain matin
    t.supprimer(page, [...t.formesDe(page)!.keys()]); await attendre(2000)
    const suivant = trait(9, 9)
    t.poser(page, suivant); await attendre(1000)
    const r = revue(t)
    const b = r.bande({ genre: 'seance', seance: r.seances[0], page })
    expect(r.planches.lire(b.images[0]).formes).toHaveLength(0)
    expect(b.total).toBe(1)
    expect(r.planches.apparues(b.images[0], b.images[1]).map(f => f.id)).toEqual([suivant.id])
  })

  it('une séance qui ne fait qu\'effacer garde un geste', async () => {
    const { t, page } = await nouveauTableau()
    const a = trait(0, 0), c = trait(9, 9)
    t.poser(page, a); await attendre(1000)
    t.poser(page, c); await attendre(16 * 60 * MINUTE)
    t.supprimer(page, [a.id]); await attendre(1000)
    t.supprimer(page, [c.id]); await attendre(1000)
    const r = revue(t)
    const b = r.bande({ genre: 'seance', seance: r.seances[0], page })
    expect(b.total).toBe(1)
    expect(r.planches.lire(b.images[b.images.length - 1]).formes).toHaveLength(0)
  })
})

describe('les parties', () => {
  it('un changement de page ouvre une partie, sur la nouvelle page, avant son premier geste', async () => {
    const { t, page } = await nouveauTableau()
    for (let i = 0; i < 4; i++) { t.poser(page, trait(i, 0)); await attendre(800) }
    const p2 = await pageNeuve(t)
    for (let i = 0; i < 4; i++) { t.poser(p2, trait(i, 0)); await attendre(800) }
    const r = revue(t)
    const b = r.bande({ genre: 'seance', seance: r.seances[0], page: null })
    expect(b.parties).toHaveLength(2)
    const ouverture = b.images[b.parties[1].debut]
    expect(ouverture.geste).toBe(false)
    expect(ouverture.p).toBe(p2)
    expect(b.attentes[b.parties[1].debut]).toBe(PAUSE_DE_PARTIE)
    expect(b.attentes[b.parties[1].debut + 1]).toBe(ENTREE)
    expect(b.parties[0].fin + 1).toBe(b.parties[1].debut)
    expect(b.parties[1].titre).toBe(`Page 2 · ${heureLisible(b.parties[1].heure)}`)
    // Des espaces insécables : l'heure ne se coupe jamais en deux lignes
    expect(heureLisible(new Date('2026-10-07T08:03:00').getTime())).toBe('8\u00a0h\u00a003')
  })

  it('un détour d\'un ou deux gestes sur une autre page reste dans la partie', async () => {
    const { t, page } = await nouveauTableau()
    const p2 = await pageNeuve(t)
    t.pageVue = page
    await attendre(30 * MINUTE)                                      // une autre séance
    for (let i = 0; i < 4; i++) { t.poser(page, trait(i, 0)); await attendre(800) }
    t.pageVue = p2
    for (let i = 0; i < 2; i++) { t.poser(p2, trait(i, 9)); await attendre(800) }
    t.pageVue = page
    for (let i = 0; i < 4; i++) { t.poser(page, trait(i, 5)); await attendre(800) }
    const r = revue(t)
    const b = r.bande({ genre: 'seance', seance: r.seances[0], page: null })
    expect(b.parties).toHaveLength(1)
    expect(b.images.filter(i => !i.geste)).toHaveLength(1)                // l'image 0 seulement
    expect(new Set(b.images.map(i => i.p))).toEqual(new Set([page, p2]))
  })

  it('un silence de plus de trois minutes ouvre une partie sur la même page', async () => {
    const { t, page } = await nouveauTableau()
    for (let i = 0; i < 3; i++) { t.poser(page, trait(i, 0)); await attendre(1000) }
    await attendre(4 * MINUTE)
    for (let i = 0; i < 3; i++) { t.poser(page, trait(i, 5)); await attendre(1000) }
    const r = revue(t)
    expect(r.seances).toHaveLength(1)
    const b = r.bande({ genre: 'seance', seance: r.seances[0], page })
    expect(b.parties).toHaveLength(2)
    expect(b.parties.map(p => p.page)).toEqual([page, page])
  })

  it('l\'histoire d\'une page : une partie par séance', async () => {
    const { t, page } = await nouveauTableau()
    for (let s = 0; s < 3; s++) {
      for (let i = 0; i < 3; i++) { t.poser(page, trait(i, s)); await attendre(1000) }
      await attendre(40 * MINUTE)
    }
    const r = revue(t)
    expect(r.seances).toHaveLength(3)
    const b = r.bande({ genre: 'page', page })
    expect(b.parties).toHaveLength(3)
    for (const pa of b.parties) expect(pa.titre).toMatch(/^aujourd'hui · \d{1,2}\u00a0h\u00a0\d{2}$/)
  })
})

/** Une page, et des gestes séparés par ces silences (ms) */
async function gestesEspaces(silences: number[]) {
  const { t, page } = await nouveauTableau()
  t.poser(page, trait(0, 0))
  for (const s of silences) { await attendre(s); t.poser(page, trait(s, 0)) }
  await attendre(1000)
  const r = revue(t)
  return { t, page, r, b: r.bande({ genre: 'seance', seance: r.seances[0], page }) }
}

describe('les pas et les bornes', () => {
  it('des gestes à moins de 2 s forment un pas, à 2 s ou plus deux', async () => {
    const un = (await gestesEspaces([500, 1999])).b
    // images : 0, création de la page, puis trois gestes ; un seul pas après le premier
    expect(pasSuivant(un, 0)).toBe(un.images.length - 1)
    const deux = (await gestesEspaces([500, 2000])).b
    const n = deux.images.length
    expect(pasSuivant(deux, 0)).toBe(n - 2)
    expect(pasSuivant(deux, n - 2)).toBe(n - 1)
    expect(pasPrecedent(deux, n - 1)).toBe(n - 2)
    expect(pasPrecedent(deux, n - 2)).toBe(0)
  })

  it('un pas en avant traverse l\'ouverture d\'une partie ; un pas en arrière s\'y arrête', async () => {
    const { t, page } = await nouveauTableau()
    for (let i = 0; i < 4; i++) { t.poser(page, trait(i, 0)); await attendre(3000) }
    const p2 = await pageNeuve(t)
    for (let i = 0; i < 4; i++) { t.poser(p2, trait(i, 0)); await attendre(3000) }
    const r = revue(t)
    const b = r.bande({ genre: 'seance', seance: r.seances[0], page: null })
    const fin = b.parties[0].fin, ouverture = b.parties[1].debut
    const apres = pasSuivant(b, fin)
    expect(apres).toBeGreaterThan(ouverture)
    expect(b.images[apres].geste).toBe(true)
    expect(pasPrecedent(b, apres)).toBe(ouverture)
    expect(pasPrecedent(b, ouverture)).toBe(fin)
  })

  it('la prochaine halte est toujours plus loin ; [ revient au début de la partie, puis à la précédente', async () => {
    const { t } = await seanceAuHasard(160, 9)
    const r = revue(t)
    const b = r.bande({ genre: 'seance', seance: r.seances[0], page: null })
    const n = b.images.length
    expect(b.parties.length).toBeGreaterThan(1)
    for (let k = 0; k < n - 1; k++) {
      expect(prochainArret(b, k, true)).toBeGreaterThan(k)
      expect(prochainArret(b, k, false)).toBe(n - 1)
      expect(pasSuivant(b, k)).toBeGreaterThan(k)
      expect(pasPrecedent(b, k + 1)).toBeLessThan(k + 1)
    }
    const deuxieme = b.parties[1]
    const milieu = deuxieme.debut + 1
    expect(entreePrecedente(b, milieu)).toBe(deuxieme.debut)
    expect(entreePrecedente(b, deuxieme.debut)).toBe(b.parties[0].debut)
    expect(entreeSuivante(b, 0)).toBe(deuxieme.debut)
    expect(entreeSuivante(b, n - 1)).toBe(n - 1)
    expect(partieDe(b, milieu)).toBe(1)
  })
})

describe('le temps de la bande', () => {
  it('les échéances suivent l\'allure ; l\'indice au temps ne dépasse pas l\'arrêt', async () => {
    const { b } = await gestesEspaces([300, 900, 2500, 40_000, 100, 700])
    const e1 = echeances(b, 1), e3 = echeances(b, 3)
    expect(e1[0]).toBe(0)
    for (let k = 1; k < e1.length; k++) {
      expect(e3[k]).toBeCloseTo(e1[k] / 3)
      expect(e1[k]).toBeGreaterThan(e1[k - 1])
      expect(e1[k] - e1[k - 1]).toBeLessThanOrEqual(PLAFOND)
    }
    const n = b.images.length
    expect(indiceAuTemps(e1, 1e9, 0, 3)).toBe(3)
    expect(indiceAuTemps(e1, e1[5], 0, n - 1)).toBe(5)
    expect(indiceAuTemps(e1, e1[5] - 0.001, 0, n - 1)).toBe(4)
    expect(indiceAuTemps(e1, -1, 2, n - 1)).toBe(2)
  })
})

describe('la revue ne fait que lire', () => {
  it('toutes les portions, toutes les images : aucune écriture', async () => {
    const { t, pages } = await seanceAuHasard(200, 21)
    await attendre(30 * MINUTE)
    const brouillon = await pageNeuve(t)
    t.poser(brouillon, trait(3, 3)); await attendre(1000)
    t.pageVue = pages[0]
    t.supprimerPage(brouillon); await attendre(1000)

    let transactions = 0
    t.doc.on('afterTransaction', () => { transactions++ })
    const vecteur = Y.encodeStateVector(t.doc)
    const longueurDuFilm = t.film.length

    const r = revue(t)
    const portions: Portion[] = []
    for (const s of r.seances) {
      portions.push({ genre: 'seance', seance: s, page: null })
      for (const p of s.pages) portions.push({ genre: 'seance', seance: s, page: p })
    }
    for (const p of new Set(r.lecture.film.map(e => e.page))) if (p) portions.push({ genre: 'page', page: p })
    expect(portions.some(p => p.page === brouillon && p.genre === 'page')).toBe(true)
    let images = 0
    for (const p of portions) {
      // (la page où l'on est revenu pour jeter le brouillon n'a, dans cette séance, rien d'autre : rien à montrer)
      const b: Bande | null = construireBande(r.lecture, p, r.seances, r.nommer)
      if (!b) { expect(p).toMatchObject({ genre: 'seance', seance: r.seances[0], page: pages[0] }); continue }
      b.images.forEach((img, k) => {
        r.planches.lire(img)
        if (k) r.planches.apparues(b.images[k - 1], img)
        images++
      })
      r.lecture.image('nimporte')
      r.lecture.fondActuel(brouillon)
    }
    expect(images).toBeGreaterThan(400)
    expect(transactions).toBe(0)
    expect(Y.encodeStateVector(t.doc)).toEqual(vecteur)
    expect(t.film.length).toBe(longueurDuFilm)
  })
})

describe('un long film', () => {
  it('la bande se construit vite, une image se lit en moins de 2 ms', async () => {
    const { t } = await seanceAuHasard(3000, 77)
    const r = revue(t)
    const t0 = performance.now()
    const b = r.bande({ genre: 'seance', seance: r.seances[0], page: null })
    const construction = performance.now() - t0
    expect(b.images.length).toBeGreaterThan(2900)
    const planches = new Planches(r.lecture)
    let s = 3
    const t1 = performance.now()
    for (let i = 0; i < 300; i++) { s = (s * 16807) % 2147483647; planches.lire(b.images[s % b.images.length]) }
    const lecture = (performance.now() - t1) / 300
    expect(construction).toBeLessThan(150)
    expect(lecture).toBeLessThan(2)
  }, 60_000)
})

describe('le code de la revue ne peut pas écrire', () => {
  it('aucun appel qui écrit, ni stockage, ni accès direct au document', () => {
    const racine = join(__dirname, '..', 'src')
    const fichiers = [
      ...readdirSync(join(racine, 'revue'), { recursive: true }).map(String).filter(f => f.endsWith('.ts')).map(f => join(racine, 'revue', f)),
      ...['rythme.ts', 'esquisse.ts', 'icones.ts'].map(f => join(racine, 'revoir', f)),
    ]
    expect(fichiers.length).toBeGreaterThanOrEqual(8)
    const interdits = [
      /\.(poser|modifier|supprimer|ajouterPage|supprimerPage|changerFond|nouveauGeste|diffuser|importerImage|allerPage)\(/,
      /transact\(/,
      /annulation/,
      /localStorage|sessionStorage|indexedDB/,
      /pageReconstruite|createDocFromSnapshot/,
      /from 'yjs'/,
      /type=["']?range/,
      /pageVue\s*=/,
      /app\.cam\.[xyz]\s*=/,
    ]
    for (const f of fichiers) {
      const texte = readFileSync(f, 'utf8')
      for (const r of interdits) expect(texte, `${f} : ${r}`).not.toMatch(r)
    }
  })
})
