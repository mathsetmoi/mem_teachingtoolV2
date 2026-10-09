// Envoyer des objets vers une autre page (« Envoyer vers… ») : déplacer ou
// copier, sans perte ni doublon caché, quelle que soit la page où l'on fait
// Ctrl+Z. Le déplacement est deux transactions : l'arrivée, hors de toute
// pile, notée sur la page d'arrivée ; puis le retrait, une étape de la pile
// de la page de départ, avec sa méta 'envoi'. La copie est une étape de la
// pile de la page d'arrivée. Les objets posés viennent du collage (noms
// libres, points liés), comme dans l'application.
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { Tableau } from '../src/document'
import type { Forme, ImageForme, Polygone, Trait } from '../src/types'
import { collage } from '../src/presse-papiers'
import type { Copie } from '../src/presse-papiers'
import { compterGestes } from '../src/revue/bande'
import { lectureDe } from '../src/revue/planches'
import { exporterDetaille, seancesDuFilm } from '../src/revoir/exporter'
import { libelleDestination, texteEnvoi, texteEnvoiAnnule } from '../src/pages/envoi'

const MINUTE = 60_000
let horloge = new Date('2026-10-09T08:00:00').getTime()
let numero = 0

beforeEach(() => { vi.useFakeTimers({ toFake: ['Date'] }); vi.setSystemTime(horloge) })
afterEach(() => vi.useRealTimers())

/** Avance l'horloge, puis laisse le film noter l'étape (il le fait juste après) */
async function attendre(ms: number) { horloge += ms; vi.setSystemTime(horloge); await Promise.resolve(); await Promise.resolve() }

function trait(x: number, y: number, id = 'T' + numero++): Trait {
  return { id, type: 'trait', x, y, z: numero++, auteur: 'moi', pts: [0, 0, 0.5, 40, 5, 0.5, 80, 0, 0.5], couleur: '#1b2230', taille: 3, opacite: 1, pression: false }
}
const triangle = (id: string, noms: string[], x = 100): Polygone =>
  ({ id, type: 'polygone', x, y: 100, z: numero++, auteur: 'moi', pts: [0, 0, 80, 0, 0, 60], ferme: true, couleur: '#1f5fbf', taille: 2.5, sommets: true, noms })

/** Pose une forme en son propre geste, sur la page qu'on regarde */
async function geste(t: Tableau, page: string, f: Forme) {
  t.pageVue = page
  t.nouveauGeste(); t.poser(page, f)
  await attendre(800)
}

/** Un tableau de n pages ; une demi-heure plus tard, la séance commence */
async function tableau(n: number) {
  const t = new Tableau(null)
  const pages: string[] = []
  for (let i = 0; i < n; i++) { const p = t.ajouterPage('carreaux', i); pages.push(p); t.pageVue = p; await attendre(500) }
  t.pageVue = pages[0]
  await attendre(30 * MINUTE)
  return { t, pages }
}

/** Ce que fait l'application : les objets pris sur la page `de`, leur copie
 *  par collage (même place, noms libres sur l'arrivée), puis l'envoi. On
 *  regarde la page de départ. */
async function envoyer(t: Tableau, de: string, vers: string, ids: string[], deplacer = true, nouvelle?: { id: string; place: number }) {
  t.pageVue = de
  const formes = [...t.formesDe(de)!.values()].filter(f => ids.includes(f.id)).sort((a, b) => a.z - b.z)
  const c: Copie = { v: 1, formes, images: {}, page: de, centre: { x: 0, y: 0 }, t: 0 }
  const posees = collage(c, { dx: 0, dy: 0, moi: t.moi, existantes: [...t.formesDe(vers)!.values()] })
  const ok = t.envoyer(de, vers, posees, formes.map(f => f.id), { deplacer, nouvelle })
  await attendre(800)
  return { ok, posees }
}

const ids = (t: Tableau, p: string) => [...t.formesDe(p)!.keys()].sort()
const pile = (t: Tableau, p: string) => t.annulationDe(p)!.undoStack.length

describe('déplacer des objets vers une autre page', () => {
  it('ils arrivent sur B (identifiants neufs, mêmes places) et quittent A ; l\'arrivée est notée sur B, puis le retrait sur A ; la pile de B n\'a rien', async () => {
    const { t, pages: [a, b] } = await tableau(2)
    for (const [k, id] of ['x', 'y', 'z'].entries()) await geste(t, a, trait(10 * k, 20 * k, id))
    await geste(t, a, trait(300, 300, 'reste'))
    const film0 = t.film.length
    const { ok, posees } = await envoyer(t, a, b, ['x', 'y', 'z'])
    expect(ok).toBe(true)
    expect(ids(t, a)).toEqual(['reste'])
    expect(t.formesDe(b)!.size).toBe(3)
    for (const f of posees) expect(['x', 'y', 'z']).not.toContain(f.id)
    expect([...t.formesDe(b)!.values()].map(f => [f.x, f.y]).sort((p, q) => p[0] - q[0])).toEqual([[0, 0], [10, 20], [20, 40]])
    // Deux étapes du film : l'arrivée sur B, puis le retrait sur A
    expect(t.film.length).toBe(film0 + 2)
    expect([t.film.get(film0).page, t.film.get(film0 + 1).page]).toEqual([b, a])
    expect(t.film.get(film0).seulOrdre).toBeUndefined()
    expect(pile(t, b)).toBe(0)
    expect(t.peutAnnuler(b)).toBe(false)
    expect(pile(t, a)).toBe(5)                                    // quatre traits, puis le retrait
  })

  it('annuler(A) : ils reviennent sur A (mêmes identifiants) et quittent B ; retablir(A) : ils repartent ; et de nouveau', async () => {
    const { t, pages: [a, b] } = await tableau(2)
    for (const id of ['x', 'y', 'z']) await geste(t, a, trait(0, 0, id))
    const avantA = new Map(t.formesDe(a)!)
    await envoyer(t, a, b, ['x', 'y', 'z'])
    t.pageVue = a
    expect(t.annuler(a)).toEqual({ envoi: { vers: b, revenus: 3, restes: 0, pageRetiree: false } })
    await attendre(500)
    expect(ids(t, a)).toEqual(['x', 'y', 'z'])
    for (const [k, f] of avantA) expect(t.formesDe(a)!.get(k)).toEqual(f)
    expect(t.formesDe(b)!.size).toBe(0)
    expect(t.retablir(a)).toEqual({ envoi: { vers: b, repartis: 3, pageRemise: false } })
    await attendre(500)
    expect(t.formesDe(a)!.size).toBe(0)
    expect(t.formesDe(b)!.size).toBe(3)
    // La méta suit l'étape d'une pile à l'autre, autant de fois qu'on veut
    expect(t.annuler(a)?.envoi?.revenus).toBe(3)
    expect([t.formesDe(a)!.size, t.formesDe(b)!.size]).toEqual([3, 0])
    expect(t.retablir(a)).toMatchObject({ envoi: { repartis: 3 } })
    expect([t.formesDe(a)!.size, t.formesDe(b)!.size]).toEqual([0, 3])
    // Puis les trois traits, un à un
    t.annuler(a); expect(ids(t, a)).toEqual(['x', 'y', 'z'])
    expect(t.annuler(a)).toEqual({})
    expect(t.formesDe(b)!.size).toBe(0)
  })

  it('un objet modifié sur B puis annuler(A) : il reste sur B, et la réponse le compte ; rien de ce qu\'on a fait sur B n\'est perdu', async () => {
    const { t, pages: [a, b] } = await tableau(2)
    for (const id of ['x', 'y']) await geste(t, a, trait(0, 0, id))
    const { posees } = await envoyer(t, a, b, ['x', 'y'])
    t.pageVue = b
    t.nouveauGeste(); t.modifier(b, [{ id: posees[0].id, patch: { x: 99 } }]); await attendre(800)
    t.pageVue = a
    expect(t.annuler(a)).toEqual({ envoi: { vers: b, revenus: 2, restes: 1, pageRetiree: false } })
    expect(ids(t, a)).toEqual(['x', 'y'])
    expect([...t.formesDe(b)!.keys()]).toEqual([posees[0].id])  // le modifié reste (un doublon visible, annoncé)
    expect(t.formesDe(b)!.get(posees[0].id)!.x).toBe(99)
    // Défaire la modification sur B rend l'objet arrivé tel quel : il est encore là
    t.pageVue = b
    expect(t.annuler(b)).toEqual({})
    expect(t.formesDe(b)!.get(posees[0].id)!.x).toBe(0)
  })

  it('une annulation faite sur B rend le même objet : il compte comme « tel quel » et part avec l\'envoi', async () => {
    const { t, pages: [a, b] } = await tableau(2)
    await geste(t, a, trait(0, 0, 'x'))
    const { posees } = await envoyer(t, a, b, ['x'])
    t.pageVue = b
    t.nouveauGeste(); t.modifier(b, [{ id: posees[0].id, patch: { x: 99 } }]); await attendre(800)
    t.annuler(b); await attendre(500)
    expect(t.formesDe(b)!.get(posees[0].id)).toBe(posees[0])
    t.pageVue = a
    expect(t.annuler(a)).toMatchObject({ envoi: { revenus: 1, restes: 0 } })
    expect(t.formesDe(b)!.size).toBe(0)
  })

  it('(limite connue, dite au README) une modification défaite sur B, puis l\'envoi défait sur A : Ctrl+Y sur B la refait, l\'objet y reparaît, visible', async () => {
    const { t, pages: [a, b] } = await tableau(2)
    await geste(t, a, trait(0, 0, 'x'))
    const { posees } = await envoyer(t, a, b, ['x'])
    t.pageVue = b
    t.nouveauGeste(); t.modifier(b, [{ id: posees[0].id, patch: { x: 99 } }]); await attendre(800)
    t.annuler(b); await attendre(500)
    t.pageVue = a
    expect(t.annuler(a)).toMatchObject({ envoi: { revenus: 1, restes: 0 } })
    expect([t.formesDe(a)!.size, t.formesDe(b)!.size]).toEqual([1, 0])
    t.pageVue = b
    expect(t.retablir(b)).toBe(true)
    expect(t.formesDe(b)!.get(posees[0].id)!.x).toBe(99)            // sur la page qu'on regarde : on le voit
    expect(t.formesDe(a)!.has('x')).toBe(true)
  })

  it('annuler(B) ne retire jamais un objet arrivé', async () => {
    const { t, pages: [a, b] } = await tableau(2)
    await geste(t, b, trait(500, 0, 'b1'))
    for (const id of ['x', 'y']) await geste(t, a, trait(0, 0, id))
    const { posees } = await envoyer(t, a, b, ['x', 'y'])
    t.pageVue = b
    // Ctrl+Z sur B défait ce qu'on y avait fait avant (b1), jamais l'arrivée
    expect(t.annuler(b)).toEqual({})
    expect(ids(t, b)).toEqual(posees.map(f => f.id).sort())
    expect(t.annuler(b)).toBeNull()
    expect(t.formesDe(b)!.size).toBe(2)
    // On y efface un objet arrivé, puis on le rend : il revient, et Ctrl+Z
    // ne va pas plus loin
    t.nouveauGeste(); t.supprimer(b, [posees[1].id]); await attendre(800)
    expect(t.annuler(b)).toEqual({})
    expect(t.formesDe(b)!.size).toBe(2)
    expect(t.annuler(b)).toBeNull()
    expect(t.formesDe(b)!.size).toBe(2)
    expect(t.formesDe(a)!.size).toBe(0)
  })

  it('« déplacer X », puis envoyer X, puis deux annuler(A) : X revient, puis reprend sa place d\'avant ; jamais en double', async () => {
    const { t, pages: [a, b] } = await tableau(2)
    await geste(t, a, trait(0, 0, 'x'))
    t.nouveauGeste(); t.modifier(a, [{ id: 'x', patch: { x: 50 } }]); await attendre(800)
    await envoyer(t, a, b, ['x'])
    t.pageVue = a
    expect(t.annuler(a)?.envoi?.revenus).toBe(1)
    expect(t.formesDe(a)!.get('x')!.x).toBe(50)
    expect(t.formesDe(b)!.size).toBe(0)
    expect(t.annuler(a)).toEqual({})
    expect(t.formesDe(a)!.get('x')!.x).toBe(0)
    expect(t.formesDe(b)!.size).toBe(0)
    expect(t.annuler(a)).toEqual({})
    expect(t.formesDe(a)!.size).toBe(0)
    expect(t.formesDe(b)!.size).toBe(0)
    // Et tout se refait dans l'ordre
    t.retablir(a); t.retablir(a)
    expect(t.retablir(a)).toMatchObject({ envoi: { repartis: 1 } })
    expect([t.formesDe(a)!.size, t.formesDe(b)!.size]).toEqual([0, 1])
    expect([...t.formesDe(b)!.values()][0].x).toBe(50)
  })

  it('des objets déjà partis de A : rien n\'est envoyé, B ne change pas, et la méta ne tombe pas sur le geste précédent de A', async () => {
    const { t, pages: [a, b] } = await tableau(2)
    await geste(t, a, trait(0, 0, 'x'))
    await geste(t, a, trait(0, 0, 'y'))
    // La copie de x est faite, puis x part de A (un effacement, sa propre étape)
    const posees = collage({ v: 1, formes: [t.formesDe(a)!.get('x')!], images: {}, page: a, centre: { x: 0, y: 0 }, t: 0 }, { dx: 0, dy: 0, moi: t.moi, existantes: [] })
    t.nouveauGeste(); t.supprimer(a, ['x']); await attendre(800)
    const film0 = t.film.length
    t.pageVue = a
    expect(t.envoyer(a, b, posees, ['x'], { deplacer: true })).toBe(false)
    await attendre(500)
    expect(t.formesDe(b)!.size).toBe(0)
    expect(t.film.length).toBe(film0)                             // rien n'est noté
    for (const e of t.annulationDe(a)!.undoStack) expect(e.meta.size).toBe(0)
    // Ctrl+Z sur A défait ce qui y était fait avant (l'effacement de x), sans toucher B
    expect(t.annuler(a)).toEqual({})
    expect(ids(t, a)).toEqual(['x', 'y'])
    expect(t.formesDe(b)!.size).toBe(0)
  })

  it('si le retrait n\'empile aucune étape, l\'arrivée repart de B et la méta n\'est posée nulle part', async () => {
    const { t, pages: [a, b] } = await tableau(2)
    await geste(t, a, trait(0, 0, 'avant'))
    await geste(t, a, trait(0, 0, 'x'))
    const posees = collage({ v: 1, formes: [t.formesDe(a)!.get('x')!], images: {}, page: a, centre: { x: 0, y: 0 }, t: 0 }, { dx: 0, dy: 0, moi: t.moi, existantes: [] })
    // Un retrait qui ne change rien (la page refuse, par exemple)
    const supprimer = t.supprimer.bind(t)
    t.supprimer = () => {}
    t.pageVue = a
    expect(t.envoyer(a, b, posees, ['x'], { deplacer: true })).toBe(false)
    t.supprimer = supprimer
    await attendre(500)
    expect(t.formesDe(b)!.size).toBe(0)
    expect(ids(t, a)).toEqual(['avant', 'x'])
    for (const e of t.annulationDe(a)!.undoStack) expect(e.meta.size).toBe(0)
    expect(t.annuler(a)).toEqual({})                              // « poser x » se défait, B intacte
    expect(ids(t, a)).toEqual(['avant'])
  })

  it('une page qui n\'existe pas, la même page, rien à poser : rien n\'est envoyé', async () => {
    const { t, pages: [a, b] } = await tableau(2)
    await geste(t, a, trait(0, 0, 'x'))
    const p = collage({ v: 1, formes: [t.formesDe(a)!.get('x')!], images: {}, page: a, centre: { x: 0, y: 0 }, t: 0 }, { dx: 0, dy: 0, moi: t.moi, existantes: [] })
    expect(t.envoyer(a, 'inconnue', p, ['x'], { deplacer: true })).toBe(false)
    expect(t.envoyer(a, a, p, ['x'], { deplacer: true })).toBe(false)
    expect(t.envoyer(a, b, [], ['x'], { deplacer: true })).toBe(false)
    expect(ids(t, a)).toEqual(['x'])
    expect(t.formesDe(b)!.size).toBe(0)
  })
})

describe('avec les marques d\'annulation des pages', () => {
  it('vers une copie toute neuve : Ctrl+Z sur la copie ne la retire plus (elle a reçu des objets) ; défait au départ, elle redevient vierge', async () => {
    const { t, pages: [a, p] } = await tableau(2)
    await geste(t, p, trait(0, 0, 'p1'))
    await geste(t, a, trait(0, 0, 'x'))
    t.pageVue = p
    const q = t.dupliquerPage(p, { marque: true })!
    await attendre(500)
    await envoyer(t, a, q, ['x'])
    t.pageVue = q
    expect(t.retraitDeCopie(q)).toBe('non')
    expect(t.annuler(q)).toBeNull()                                // rien ne part avec elle
    expect(t.ordre.toArray()).toContain(q)
    expect(t.formesDe(q)!.size).toBe(2)
    t.pageVue = a
    expect(t.annuler(a)?.envoi?.revenus).toBe(1)
    expect(ids(t, q)).toEqual(['p1'])
  })

  it('une page jetée depuis A après l\'envoi revient d\'abord ; prochaineAnnulation le dit', async () => {
    const { t, pages: [a, b, c] } = await tableau(3)
    await geste(t, a, trait(0, 0, 'x'))
    await envoyer(t, a, b, ['x'])
    const etape = t.prochaineAnnulation(a)
    expect(etape).not.toBeNull()
    expect(t.jeterPage(c, a)).toBe(true)
    expect(t.prochaineAnnulation(a)).toBeNull()                    // la marque passe avant
    t.pageVue = a
    expect(t.annuler(a)).toEqual({ page: c })
    expect(t.prochaineAnnulation(a)).toBe(etape)
    expect(t.annuler(a)?.envoi?.vers).toBe(b)
    expect(t.formesDe(b)!.size).toBe(0)
  })
})

describe('copier des objets sur une autre page', () => {
  it('A ne change pas ; l\'arrivée est une étape de la pile de B : annuler(B) retire les copies (« copie reçue »), annuler(A) n\'y touche pas', async () => {
    const { t, pages: [a, b] } = await tableau(2)
    for (const id of ['x', 'y']) await geste(t, a, trait(0, 0, id))
    const film0 = t.film.length
    const { ok, posees } = await envoyer(t, a, b, ['x', 'y'], false)
    expect(ok).toBe(true)
    expect(ids(t, a)).toEqual(['x', 'y'])
    expect(ids(t, b)).toEqual(posees.map(f => f.id).sort())
    expect(t.film.length).toBe(film0 + 1)
    expect(t.film.get(film0).page).toBe(b)
    expect(pile(t, a)).toBe(2)
    expect(pile(t, b)).toBe(1)
    // Ctrl+Z sur A défait ses propres gestes, jamais la copie
    t.pageVue = a
    expect(t.annuler(a)).toEqual({})
    expect(t.formesDe(b)!.size).toBe(2)
    expect(t.retablir(a)).toBe(true)
    // Ctrl+Z sur B retire les copies ; les originaux sont sur A
    t.pageVue = b
    expect(t.annuler(b)).toEqual({ copieRecue: { de: a, n: 2 } })
    expect(t.formesDe(b)!.size).toBe(0)
    expect(ids(t, a)).toEqual(['x', 'y'])
    expect(t.retablir(b)).toBe(true)
    expect(t.formesDe(b)!.size).toBe(2)
    expect(t.annuler(b)).toEqual({ copieRecue: { de: a, n: 2 } })   // la méta suit
  })
})

describe('noms et figures', () => {
  it('un triangle ABC envoyé vers une page qui a déjà ABC devient DEF ; vers une page libre, il garde ses noms', async () => {
    const { t, pages: [a, b, c] } = await tableau(3)
    await geste(t, a, triangle('abc', ['A', 'B', 'C']))
    await geste(t, b, triangle('deja', ['A', 'B', 'C'], 400))
    const { posees } = await envoyer(t, a, b, ['abc'], false)
    expect((posees[0] as Polygone).noms).toEqual(['D', 'E', 'F'])
    expect((t.formesDe(b)!.get(posees[0].id) as Polygone).noms).toEqual(['D', 'E', 'F'])
    const libre = await envoyer(t, a, c, ['abc'])
    expect((t.formesDe(c)!.get(libre.posees[0].id) as Polygone).noms).toEqual(['A', 'B', 'C'])
  })

  it('un point lié à une image suit l\'image envoyée avec lui', async () => {
    const { t, pages: [a, b] } = await tableau(2)
    const img: ImageForme = { id: 'img', type: 'image', src: 'banque1', x: 0, y: 0, z: numero++, auteur: 'moi', l: 100, h: 50, m: [1, 0, 0, 1] }
    const pt: Polygone = { id: 'pt', type: 'polygone', x: 10, y: 10, z: numero++, auteur: 'moi', pts: [0, 0], ferme: false, couleur: '#1b2230', taille: 2.5, sommets: true, noms: ['A'], lie: 'img' }
    await geste(t, a, img)
    await geste(t, a, pt)
    const { posees } = await envoyer(t, a, b, ['img', 'pt'])
    const nouvelle = posees.find(f => f.type === 'image')!
    expect((t.formesDe(b)!.get(posees.find(f => f.type === 'polygone')!.id) as Polygone).lie).toBe(nouvelle.id)
    expect((nouvelle as ImageForme).src).toBe('banque1')
    expect(t.formesDe(a)!.size).toBe(0)
  })
})

describe('vers une nouvelle page', () => {
  it('créée pour l\'envoi, elle quitte l\'ordre à annuler(A) (vide : pas dans la corbeille), et revient à sa place à retablir(A)', async () => {
    const { t, pages: [a, b] } = await tableau(2)
    for (const id of ['x', 'y']) await geste(t, a, trait(0, 0, id))
    t.pageVue = a
    const n = t.ajouterPage(t.fondDe(a), 1)
    await attendre(500)
    expect(t.ordre.toArray()).toEqual([a, n, b])
    expect(t.fondDe(n)).toBe('carreaux')
    await envoyer(t, a, n, ['x', 'y'], true, { id: n, place: 1 })
    expect(t.formesDe(n)!.size).toBe(2)
    t.pageVue = a
    expect(t.annuler(a)).toEqual({ envoi: { vers: n, revenus: 2, restes: 0, pageRetiree: true } })
    await attendre(500)
    expect(t.ordre.toArray()).toEqual([a, b])
    expect(t.pagesDeLaCorbeille()).toEqual([])
    expect(ids(t, a)).toEqual(['x', 'y'])
    expect(t.retablir(a)).toEqual({ envoi: { vers: n, repartis: 2, pageRemise: true } })
    await attendre(500)
    expect(t.ordre.toArray()).toEqual([a, n, b])
    expect(t.formesDe(n)!.size).toBe(2)
    expect(t.formesDe(a)!.size).toBe(0)
  })

  it('une nouvelle page où l\'on a écrit depuis reste dans l\'ordre ; rien d\'envoyé : elle repart, vide', async () => {
    const { t, pages: [a] } = await tableau(1)
    await geste(t, a, trait(0, 0, 'x'))
    t.pageVue = a
    const n = t.ajouterPage('blanc', 1); await attendre(500)
    await envoyer(t, a, n, ['x'], true, { id: n, place: 1 })
    await geste(t, n, trait(200, 0, 'ecrit'))
    t.pageVue = a
    expect(t.annuler(a)).toMatchObject({ envoi: { revenus: 1, pageRetiree: false } })
    expect(t.ordre.toArray()).toEqual([a, n])
    expect(ids(t, n)).toEqual(['ecrit'])
    // Un envoi qui ne se fait pas (rien à poser) ne laisse pas de page vide
    const m = t.ajouterPage('blanc', 2); await attendre(500)
    expect(t.envoyer(a, m, [], ['x'], { deplacer: true, nouvelle: { id: m, place: 2 } })).toBe(false)
    expect(t.ordre.toArray()).toEqual([a, n])
  })
})

describe('la revue et le film élève', () => {
  it('compterGestes : un geste de plus sur A (le départ) et sur B (l\'arrivée)', async () => {
    const { t, pages: [a, b] } = await tableau(2)
    for (const id of ['x', 'y', 'z']) await geste(t, a, trait(0, 0, id))
    await geste(t, b, trait(300, 0, 'b1'))
    const compter = () => {
      const l = lectureDe(t, () => t.ordre.toArray())
      return [compterGestes(l, { genre: 'page', page: a }), compterGestes(l, { genre: 'page', page: b })]
    }
    const [ga, gb] = compter()
    await envoyer(t, a, b, ['x', 'y'])
    expect(compter()).toEqual([ga + 1, gb + 1])
  })

  it('exporterDetaille de la séance, avec A et B : les objets disparaissent de A et paraissent sur B', async () => {
    const { t, pages: [a, b] } = await tableau(2)
    for (const id of ['x', 'y']) await geste(t, a, trait(0, 0, id))
    const { posees } = await envoyer(t, a, b, ['x', 'y'])
    const seance = seancesDuFilm(t.film.toArray())[0]                 // la plus récente
    const { film: f } = exporterDetaille(t, { de: seance.de, a: seance.a, pages: [a, b], titre: 'Séance' }, { instruments: false })
    const resume = f.etapes.map(e => [e.p, e.o.map(o => o[0] === '=' ? '+' + o[1].id : o[0] === '-' ? '-' + o[1] : o[0]).sort().join(' ')])
    expect(resume.slice(-2)).toEqual([
      [b, posees.map(p => '+' + p.id).sort().join(' ')],
      [a, '-x -y'],
    ])
    // Publiée seule, chaque page a son histoire juste
    const seuleB = exporterDetaille(t, { de: seance.de, a: seance.a, pages: [b], titre: 'B' }, { instruments: false }).film
    expect(seuleB.etapes.map(e => e.o.length)).toEqual([2])
    const seuleA = exporterDetaille(t, { de: seance.de, a: seance.a, pages: [a], titre: 'A' }, { instruments: false }).film
    expect(seuleA.etapes.map(e => e.o.map(o => o[0]).join(''))).toEqual(['=', '=', '--'])
  })
})

describe('les textes (pur)', () => {
  it('le message d\'un envoi, au singulier et au pluriel', () => {
    expect(texteEnvoi(3, 5, true)).toBe('3 objets envoyés vers la page 5')
    expect(texteEnvoi(1, 5, true)).toBe('1 objet envoyé vers la page 5')
    expect(texteEnvoi(3, 5, false)).toBe('3 objets copiés sur la page 5')
    expect(texteEnvoi(1, 2, false)).toBe('1 objet copié sur la page 2')
  })

  it('le message d\'un envoi défait : revenus, restes, la nouvelle page retirée, une page supprimée depuis', () => {
    expect(texteEnvoiAnnule({ revenus: 3, restes: 0, pageRetiree: false }, 5, true)).toBe('Envoi annulé : les 3 objets sont revenus de la page 5')
    expect(texteEnvoiAnnule({ revenus: 3, restes: 1, pageRetiree: false }, 5, true)).toBe('Envoi annulé : les 3 objets sont revenus de la page 5 ; 1 objet, modifié depuis sur la page 5, y reste aussi')
    expect(texteEnvoiAnnule({ revenus: 3, restes: 2, pageRetiree: false }, 5, true)).toBe('Envoi annulé : les 3 objets sont revenus de la page 5 ; 2 objets, modifiés depuis sur la page 5, y restent aussi')
    expect(texteEnvoiAnnule({ revenus: 1, restes: 0, pageRetiree: true }, 2, false)).toBe('Envoi annulé : l\'objet est revenu ; la nouvelle page 2, vide, est retirée')
    expect(texteEnvoiAnnule({ revenus: 2, restes: 1, pageRetiree: false }, 0, false)).toBe('Envoi annulé : les 2 objets sont revenus d\'une page supprimée ; 1 objet, modifié depuis sur la page supprimée, y reste aussi')
  })

  it('le libellé d\'une destination', () => {
    expect(libelleDestination(1, null, false)).toBe('Page 1')
    expect(libelleDestination(2, 'Exercice 12 p. 84', false)).toBe('Page 2 · Exercice 12 p. 84')
    expect(libelleDestination(3, null, true)).toBe('Page 3 (cette page)')
  })
})
