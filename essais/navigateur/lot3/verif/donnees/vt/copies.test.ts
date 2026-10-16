// Vérification « données et replay » du lot 3 : copies avec historique,
// corbeille et séances passées, réordonner et insérer.
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import * as Y from 'yjs'
import { Tableau } from '../../../../../../src/document'
import type { Trait } from '../../../../../../src/types'
import { exporterDetaille, pagesDeLaSeance, seancesDuFilm } from '../../../../../../src/revoir/exporter'
import { lectureDe, Planches } from '../../../../../../src/revue/planches'
import { compterGestes, construireBande } from '../../../../../../src/revue/bande'
import { Bobine } from '../../../../../../src/revoir/bobine'
import { ecrireTableau, lireTableau } from '../../../../../../src/fichier'

const MINUTE = 60_000
let horloge = new Date('2026-10-01T08:00:00').getTime()
let numero = 0
beforeEach(() => { vi.useFakeTimers({ toFake: ['Date'] }); vi.setSystemTime(horloge) })
afterEach(() => vi.useRealTimers())
async function attendre(ms: number) { horloge += ms; vi.setSystemTime(horloge); await Promise.resolve(); await Promise.resolve() }
function trait(x: number, y: number, id = 'T' + numero++, n = 3): Trait {
  const pts: number[] = []
  for (let i = 0; i < n; i++) pts.push(i * 7.3, Math.sin(i) * 20, 0.5)
  return { id, type: 'trait', x, y, z: numero++, auteur: 'moi', pts, couleur: '#1b2230', taille: 3, opacite: 1, pression: false }
}
async function geste(t: Tableau, page: string, id: string, x = 0) { t.pageVue = page; t.nouveauGeste(); t.poser(page, trait(x, 0, id)); await attendre(800) }
async function tableau(n: number) {
  const t = new Tableau(null)
  const pages: string[] = []
  for (let i = 0; i < n; i++) { const p = t.ajouterPage('carreaux', i); pages.push(p); t.pageVue = p; await attendre(500) }
  t.pageVue = pages[0]
  await attendre(30 * MINUTE)
  return { t, pages }
}
function recharger(t: Tableau): Tableau { const u = new Tableau(null); Y.applyUpdate(u.doc, Y.encodeStateAsUpdate(t.doc), 'film'); return u }
const nommer = (t: Tableau) => (p: string) => { const i = t.ordre.toArray().indexOf(p); return i < 0 ? 'Page jetée' : `Page ${i + 1}` }
function revue(t: Tableau) {
  const lecture = lectureDe(t, () => t.ordre.toArray())
  const seances = seancesDuFilm(lecture.film)
  return { lecture, seances, planches: new Planches(lecture), bande: (p: any) => construireBande(lecture, p, seances, nommer(t)) }
}
/** Les identifiants des formes de la dernière image d'une bande */
function finDe(r: ReturnType<typeof revue>, page: string) {
  const b = r.bande({ genre: 'page', page })!
  return r.planches.lire(b.images.at(-1)!).formes.map(f => f.id).sort()
}
/** Le film élève d'une séance (toutes les étapes), lu par le lecteur : l'état final de chaque page */
function filmLu(t: Tableau, pages: string[], s = seancesDuFilm(t.film.toArray())[0]) {
  const f = exporterDetaille(t, { de: s.de, a: s.a, pages, titre: 'S' }, { instruments: false }).film
  // Le lecteur lit le fichier, pas l'objet : passer par JSON
  const lu = JSON.parse(JSON.stringify(f))
  const bob = new Bobine(lu)
  const fin = bob.etatA ? bob.etatA(bob.n - 1) : null
  return { f: lu, bob, fin }
}

describe('dupliquer une page avec son historique', () => {
  it('copie de copie ; l\'original modifié, puis jeté, puis supprimé définitivement (vidé) : la copie garde son passé, revue et film élève', async () => {
    const { t, pages: [p, x] } = await tableau(2)
    for (const id of ['p1', 'p2', 'p3']) await geste(t, p, id)
    t.pageVue = p; const q = t.dupliquerPage(p)!; t.pageVue = q; await attendre(800)
    await geste(t, q, 'q1', 50)
    t.pageVue = q; const r = t.dupliquerPage(q)!; t.pageVue = r; await attendre(800)
    await geste(t, r, 'r1', 90)
    // L'original change ensuite : un trait de plus, un trait effacé
    await geste(t, p, 'p4')
    t.pageVue = p; t.nouveauGeste(); t.supprimer(p, ['p1']); await attendre(800)
    // puis il part dans la corbeille et la corbeille est vidée
    t.pageVue = x; expect(t.jeterPage(p, x)).toBe(true); await attendre(800)
    expect(t.supprimerDefinitivement([p])).toBe(1); await attendre(800)
    for (const tab of [t, recharger(t)]) {
      const rv = revue(tab)
      expect(compterGestes(rv.lecture, { genre: 'page', page: r })).toBe(5)
      expect(compterGestes(rv.lecture, { genre: 'page', page: q })).toBe(4)
      expect(compterGestes(rv.lecture, { genre: 'page', page: p })).toBe(5)
      expect(finDe(rv, r)).toEqual(['p1', 'p2', 'p3', 'q1', 'r1'])
      expect(finDe(rv, q)).toEqual(['p1', 'p2', 'p3', 'q1'])
      expect(finDe(rv, p)).toEqual(['p2', 'p3', 'p4'])
      // Film élève de la copie de copie, seule : p1 p2 p3 q1 r1, chaque trait se dessine
      const { f, bob } = filmLu(tab, [r])
      expect(f.etapes.map((e: any) => e.o.map((o: any) => o[0] === '=' ? o[1].id : o[0]).join(' '))).toEqual(['p1', 'p2', 'p3', 'q1', 'r1'])
      expect([1, 2, 3, 4, 5].map(k => [...bob.ajoutees(k)])).toEqual([['p1'], ['p2'], ['p3'], ['q1'], ['r1']])
    }
  })

  it('annulation sur la copie : sa pile commence vide ; Ctrl+Z ne touche jamais l\'original', async () => {
    const { t, pages: [p] } = await tableau(1)
    for (const id of ['p1', 'p2']) await geste(t, p, id)
    t.pageVue = p; const q = t.dupliquerPage(p)!; t.pageVue = q; await attendre(800)     // sans marque (la trieuse)
    expect(t.peutAnnuler(q)).toBe(false)
    expect(t.annuler(q)).toBeNull()
    await geste(t, q, 'q1')
    t.pageVue = q; t.nouveauGeste(); t.supprimer(q, ['p1']); await attendre(800)
    expect(t.annuler(q)).toEqual({}); await attendre(500)   // p1 revient sur la copie
    expect(t.annuler(q)).toEqual({}); await attendre(500)   // q1 part
    expect(t.annuler(q)).toBeNull()
    expect([...t.formesDe(q)!.keys()].sort()).toEqual(['p1', 'p2'])
    expect([...t.formesDe(p)!.keys()].sort()).toEqual(['p1', 'p2'])
    expect(t.annulationDe(p)!.undoStack.length).toBe(2)
    // Au replay de la copie, p1 qui revient paraît d'un coup (déjà vu), sans se redessiner
    const { bob, f } = filmLu(t, [q])
    const k = f.etapes.findIndex((e: any) => e.o.some((o: any) => o[0] === '=' && o[1].id === 'p1')) // le premier p1 : son trait
    const k2 = f.etapes.findLastIndex((e: any) => e.o.some((o: any) => o[0] === '=' && o[1].id === 'p1'))
    expect(k2).toBeGreaterThan(k)
    expect([...bob.ajoutees(k2 + 1)]).toEqual([])
  })

  it('la taille : copier une page de 5 000 étapes ne recopie pas son film', async () => {
    const { t, pages: [p] } = await tableau(1)
    t.pageVue = p
    // 1 000 traits de 40 points, puis 4 000 déplacements : 5 000 étapes sur la page
    for (let k = 0; k < 1000; k++) { t.nouveauGeste(); t.poser(p, trait(k, 0, 'k' + k, 40)); await attendre(450) }
    for (let k = 0; k < 4000; k++) { t.nouveauGeste(); t.modifier(p, [{ id: 'k' + (k % 1000), patch: { y: k } }]); await attendre(450) }
    const etapes = t.film.toArray().filter(e => e.page === p).length
    const avant = Y.encodeStateAsUpdate(t.doc).length
    const page = JSON.stringify([...t.formesDe(p)!.values()]).length
    const filmAvant = t.film.length
    const t0 = performance.now()
    const q = t.dupliquerPage(p)!; t.pageVue = q; await attendre(800)
    const duree = performance.now() - t0
    const apres = Y.encodeStateAsUpdate(t.doc).length
    const fichierAvant = avant
    const fichier = new Uint8Array(await ecrireTableau(t.doc).arrayBuffer()).length
    console.log(JSON.stringify({ etapes, avantKo: Math.round(avant / 1024), apresKo: Math.round(apres / 1024), croissanceKo: Math.round((apres - avant) / 1024), pageJsonKo: Math.round(page / 1024), etapeDeNaissanceKo: Math.round(t.film.get(filmAvant).s.length / 1024), dureeMs: Math.round(duree), memcKo: Math.round(fichier / 1024), fichierAvantKo: Math.round(fichierAvant / 1024) }))
    expect(t.film.length).toBe(filmAvant + 1)
    expect(apres - avant).toBeLessThan(page * 2 + 200 * 1024)
    // La revue de la copie : 5 000 gestes hérités
    const t1 = performance.now()
    const rv = revue(t)
    expect(compterGestes(rv.lecture, { genre: 'page', page: q })).toBeGreaterThan(4000)
    console.log('revue de la copie (compter) :', Math.round(performance.now() - t1), 'ms')
  })
})

describe('corbeille et séances passées', () => {
  it('une page vidée de la corbeille : la revue et le film élève d\'une séance passée qui la montrait ne changent pas', async () => {
    const { t, pages: [a, b, c] } = await tableau(3)
    await geste(t, a, 'a1'); await geste(t, b, 'b1'); await geste(t, b, 'b2'); await geste(t, c, 'c1'); await geste(t, a, 'a2')
    t.renommerPage(b, 'Exercice 3')
    t.changerFond(b, 'seyes'); await attendre(800)
    await attendre(90 * MINUTE)
    await geste(t, a, 'a3')
    const s = seancesDuFilm(t.film.toArray()).find(x => x.pages.includes(b) && x.gestes > 3)!   // la séance où b a été écrite
    const photo = (tab: Tableau) => {
      const rv = revue(tab)
      const bs = rv.bande({ genre: 'seance', seance: s, page: null })!
      const pages = pagesDeLaSeance(tab, s)
      const f = exporterDetaille(tab, { de: s.de, a: s.a, pages, titre: 'S' }).film
      return { total: bs.total, images: bs.images, formes: bs.images.map(i => rv.planches.lire(i).formes.map(x => x.id)), pages, f: JSON.stringify(f), gestesB: compterGestes(rv.lecture, { genre: 'page', page: b }) }
    }
    const avant = photo(t)
    t.pageVue = a; expect(t.jeterPage(b, a)).toBe(true); await attendre(800)
    const jete = photo(t)
    expect(t.supprimerDefinitivement([b])).toBe(1); await attendre(800)
    const vide = photo(t)
    const relu = photo(recharger(t))
    for (const x of [jete, vide, relu]) {
      expect(x.pages).toEqual(avant.pages)
      expect(x.total).toBe(avant.total)
      expect(x.formes).toEqual(avant.formes)
      expect(x.gestesB).toBe(avant.gestesB)
      expect(x.f).toBe(avant.f)
    }
    // Le .memc garde la page définitive (Y.Map) et son entrée
    const { etat } = lireTableau(new Uint8Array(await ecrireTableau(t.doc).arrayBuffer()))
    const u = new Tableau(null); Y.applyUpdate(u.doc, etat, 'film')
    expect(u.corbeille.get(b)?.definitif).toBe(true)
    expect(u.pagesDeLaCorbeille()).toEqual([])
    expect(photo(u).f).toBe(avant.f)
  })

  it('remettre une page après un rechargement : contenu, fond, nom, place ; son histoire continue', async () => {
    const { t, pages: [a, b, c] } = await tableau(3)
    await geste(t, a, 'a1'); await geste(t, b, 'b1'); await geste(t, c, 'c1')
    t.renommerPage(b, 'Exo 7'); t.changerFond(b, 'seyes'); await attendre(800)
    t.pageVue = a; expect(t.jeterPage(b, a)).toBe(true); await attendre(800)
    await geste(t, c, 'c2')
    const u = recharger(t)
    expect(u.pagesDeLaCorbeille().map(x => x.id)).toEqual([b])
    u.pageVue = a
    expect(u.remettrePage(b)).toBe(1)
    await attendre(800)
    expect(u.ordre.toArray()).toEqual([a, b, c])
    expect(u.fondDe(b)).toBe('seyes')
    expect(u.nomDe(b)).toBe('Exo 7')
    expect([...u.formesDe(b)!.keys()]).toEqual(['b1'])
    const e = u.film.get(u.film.length - 1)
    expect([e.page, e.seulOrdre]).toEqual([b, true])
    const rv = revue(u)
    expect(compterGestes(rv.lecture, { genre: 'page', page: b })).toBe(2)     // b1, le fond
    expect(u.corbeille.has(b)).toBe(false)
  })
})

describe('réordonner et insérer : le film élève et la revue', () => {
  it('pendant la séance, la page 3 passe en tête, puis une page vide est insérée : l\'ordre du film élève, ses chapitres', async () => {
    const { t, pages: [a, b, c] } = await tableau(3)
    await geste(t, a, 'a1'); await geste(t, b, 'b1'); await geste(t, c, 'c1')
    t.pageVue = c; expect(t.deplacerPages([c], 0)).toBe(true); await attendre(800)
    t.pageVue = c; const n = t.ajouterPage('carreaux', 1); t.pageVue = n; await attendre(800)
    await geste(t, n, 'n1')
    await geste(t, a, 'a2')
    expect(t.ordre.toArray()).toEqual([c, n, a, b])
    const s = seancesDuFilm(t.film.toArray())[0]
    const pages = pagesDeLaSeance(t, s)
    const { f } = filmLu(t, pages)
    console.log('ordre du film', JSON.stringify(f.ordre.map((p: string) => [a, b, c, n].indexOf(p))), 'chapitres', JSON.stringify(f.chapitres))
    expect(f.ordre).toEqual([c, n, a, b])
    const rv = revue(t)
    const bs = rv.bande({ genre: 'seance', seance: s, page: null })!
    expect(bs.total).toBe(5)
  })
})

describe('remettre pendant une séance : le film élève', () => {
  it('B jetée depuis B (on arrive sur A), A écrite, B remise de la corbeille, B écrite', async () => {
    const { t, pages: [a, b] } = await tableau(2)
    await geste(t, a, 'a1'); await geste(t, b, 'b1')
    t.pageVue = a; expect(t.jeterPage(b, a)).toBe(true); await attendre(3000)
    await geste(t, a, 'a2')
    t.pageVue = a; expect(t.remettrePage(b)).toBe(1); await attendre(3000)
    t.pageVue = b; await geste(t, b, 'b2')
    const s = seancesDuFilm(t.film.toArray())[0]
    const pages = pagesDeLaSeance(t, s)
    const { f } = filmLu(t, pages)
    const lettre = (p: string) => p === a ? 'A' : p === b ? 'B' : '?'
    console.log('remise :', JSON.stringify(f.etapes.map((e: any) => lettre(e.p) + ':' + e.o.map((o: any) => o[0] === '=' ? o[1].id : o[0]).join(' '))), JSON.stringify(f.chapitres), JSON.stringify(f.ordre.map(lettre)))
    expect(f.ordre).toEqual([a, b])
    const rv = revue(t)
    const bs = rv.bande({ genre: 'seance', seance: s, page: null })!
    expect(bs.total).toBe(4)
    expect(compterGestes(rv.lecture, { genre: 'page', page: b })).toBe(2)
  })
})
