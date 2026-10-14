// Les données du lot 5 : les attaches des formes (verrou, fixation en fond,
// groupe, rotation d'une formule), Tableau.modifier qui retire une clé
// undefined, Tableau.remplacer qui écrit une forme entière, image() qui fait
// un objet neuf (libre, hors de tout groupe), et les étapes « réglage » :
// une étape de la pile d'annulation et du film, mais ni un geste d'une
// séance, ni un geste de la revue, ni une étape du film élève.
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { Tableau } from '../src/document'
import { image } from '../src/formes'
import type { Transformation } from '../src/formes'
import { exporterDetaille, seancesAPublier, seancesDuFilm } from '../src/revoir/exporter'
import { Bobine } from '../src/revoir/bobine'
import { compterGestes } from '../src/revue/bande'
import { lectureDe, memeImage } from '../src/revue/planches'
import type { Cercle, Forme, Formule, ImageForme, Polygone, Segment, Trait } from '../src/types'
import { libre } from '../src/types'

const MINUTE = 60_000
let horloge = new Date('2026-10-12T08:00:00').getTime()
let numero = 0

beforeEach(() => { vi.useFakeTimers({ toFake: ['Date'] }); vi.setSystemTime(horloge) })
afterEach(() => vi.useRealTimers())

/** Avance l'horloge, puis laisse le film noter l'étape (il le fait juste après) */
async function attendre(ms: number) { horloge += ms; vi.setSystemTime(horloge); await Promise.resolve(); await Promise.resolve() }

function trait(x: number, y: number, id = 'T' + numero++): Trait {
  return { id, type: 'trait', x, y, z: numero++, auteur: 'moi', pts: [0, 0, 0.5, 40, 5, 0.5, 80, 0, 0.5], couleur: '#1b2230', taille: 3, opacite: 1, pression: false }
}
const formule = (id: string, rotation?: number): Formule =>
  ({ id, type: 'formule', x: 100, y: 100, z: numero++, auteur: 'moi', latex: 'x^2', couleur: '#d0342c', taille: 28, ...(rotation === undefined ? {} : { rotation }) })

/** Pose une forme en son propre geste, sur la page qu'on regarde */
async function geste(t: Tableau, page: string, id: string, x = 0, y = 0) {
  t.pageVue = page
  t.nouveauGeste(); t.poser(page, trait(x, y, id))
  await attendre(800)
}

/** Un réglage, comme le fera l'application : verrouiller (ou déverrouiller) des formes */
async function verrouiller(t: Tableau, page: string, ids: string[], oui = true) {
  t.pageVue = page
  t.nouveauGeste()
  t.modifier(page, ids.map(id => ({ id, patch: { verrou: oui ? true : undefined } })), { note: 'reglage' })
  await attendre(800)
}

/** Un tableau de n pages, sans enregistrement ; une demi-heure plus tard, la séance commence */
async function tableau(n: number) {
  const t = new Tableau(null)
  const pages: string[] = []
  for (let i = 0; i < n; i++) { const p = t.ajouterPage('carreaux', i); pages.push(p); t.pageVue = p; await attendre(500) }
  t.pageVue = pages[0]
  await attendre(30 * MINUTE)
  return { t, pages }
}

const forme = (t: Tableau, page: string, id: string) => t.formesDe(page)!.get(id) as Forme & Record<string, unknown>

describe('types.ts : libre', () => {
  it('ni verrouillé ni fixé en fond', () => {
    const f = trait(0, 0)
    expect(libre(f)).toBe(true)
    expect(libre({ ...f, verrou: true })).toBe(false)
    expect(libre({ ...f, fixe: true })).toBe(false)
    expect(libre({ ...f, groupe: 'g' })).toBe(true)
  })
})

describe('image() : un objet neuf, libre et hors de tout groupe', () => {
  const att = { groupe: 'g1', verrou: true as const, fixe: true as const }
  const six: Forme[] = [
    { ...trait(10, 10), ...att },
    { id: 'p', type: 'polygone', x: 0, y: 0, z: 1, auteur: 'a', pts: [0, 0, 80, 0, 0, 60], ferme: true, couleur: '#000', taille: 2, noms: ['A', 'B', 'C'], sommets: true, ...att } as Polygone,
    { id: 'c', type: 'cercle', x: 0, y: 0, z: 1, auteur: 'a', r: 40, couleur: '#000', taille: 2, ...att } as Cercle,
    { id: 's', type: 'segment', x: 0, y: 0, z: 1, auteur: 'a', dx: 40, dy: 0, couleur: '#000', taille: 2, ...att } as Segment,
    { ...formule('f', 0.5), ...att },
    { id: 'i', type: 'image', x: 0, y: 0, z: 1, auteur: 'a', src: 'b', l: 10, h: 10, m: [1, 0, 0, 1], ...att } as ImageForme,
  ]
  const transformations: Transformation[] = [
    { type: 'translation', dx: 40, dy: 0 },
    { type: 'symetrie-centrale', c: { x: 0, y: 0 } },
    { type: 'rotation', c: { x: 0, y: 0 }, angle: 90 },
    { type: 'homothetie', c: { x: 0, y: 0 }, k: 2 },
    { type: 'symetrie-axiale', a: { x: 0, y: 0 }, b: { x: 0, y: 100 } },
  ]
  it('pour les six types et toutes les transformations : ni groupe, ni verrou, ni fixe ; l\'original n\'est pas touché', () => {
    for (const f of six) for (const t of transformations) {
      const g = image(f, t, 'moi') as Forme & Record<string, unknown>
      for (const k of ['groupe', 'verrou', 'fixe']) expect(k in g, `${f.type} ${t.type} ${k}`).toBe(false)
      expect(g.id).not.toBe(f.id)
      expect(f).toMatchObject(att)
    }
    // La rotation d'une formule, elle, est à elle (la translation la garde)
    expect((image(six[4], transformations[0], 'moi') as Formule).rotation).toBe(0.5)
  })

  it('Transformer un membre d\'un groupe verrouillé et ses points liés : les images n\'ont ni groupe ni verrou', () => {
    const img: ImageForme = { id: 'i', type: 'image', x: 0, y: 0, z: 1, auteur: 'a', src: 'b', l: 10, h: 10, m: [1, 0, 0, 1], groupe: 'g', verrou: true }
    const pt: Polygone = { id: 'pt', type: 'polygone', x: 5, y: 5, z: 2, auteur: 'a', pts: [0, 0], ferme: false, couleur: '#000', taille: 2, sommets: true, noms: ['A'], lie: 'i', groupe: 'g', verrou: true }
    const t: Transformation = { type: 'symetrie-centrale', c: { x: 50, y: 50 } }
    // Comme App.transformer : l'image, puis ses points, liés à la nouvelle
    const nouvelle = image(img, t, 'moi')
    const point = { ...image(pt, t, 'moi'), lie: nouvelle.id } as Polygone
    for (const g of [nouvelle, point]) { expect(g.groupe).toBeUndefined(); expect(g.verrou).toBeUndefined() }
    expect(point.lie).toBe(nouvelle.id)
    expect(point.noms).toEqual(["A'"])
  })
})

describe('Tableau.modifier et Tableau.remplacer', () => {
  it('modifier : une clé du patch qui vaut undefined quitte la forme ; une étape ; Ctrl+Z la rend', async () => {
    const { t, pages: [p] } = await tableau(1)
    await geste(t, p, 'a')
    const u = t.annulationDe(p)!
    await verrouiller(t, p, ['a'])
    expect(forme(t, p, 'a').verrou).toBe(true)
    const n = u.undoStack.length
    await verrouiller(t, p, ['a'], false)
    expect(Object.keys(forme(t, p, 'a'))).not.toContain('verrou')
    expect(u.undoStack.length).toBe(n + 1)
    t.annuler(p)
    expect(forme(t, p, 'a').verrou).toBe(true)
    t.annuler(p)
    expect('verrou' in forme(t, p, 'a')).toBe(false)
    // Une clé absente du patch garde sa valeur (modifier fond le patch)
    t.nouveauGeste(); t.modifier(p, [{ id: 'a', patch: { groupe: 'g' } }]); await attendre(800)
    t.nouveauGeste(); t.modifier(p, [{ id: 'a', patch: { x: 5 } }]); await attendre(800)
    expect(forme(t, p, 'a')).toMatchObject({ x: 5, groupe: 'g' })
    // Revenir au segment : prolonge: undefined disparaît aussi
    const d: Polygone = { id: 'd', type: 'polygone', x: 0, y: 0, z: 9, auteur: 'a', pts: [0, 0, 40, 0], ferme: false, couleur: '#000', taille: 2, prolonge: 'droite' }
    t.nouveauGeste(); t.poser(p, d); await attendre(800)
    t.nouveauGeste(); t.modifier(p, [{ id: 'd', patch: { prolonge: undefined } as Partial<Forme> }]); await attendre(800)
    expect('prolonge' in forme(t, p, 'd')).toBe(false)
    t.annuler(p)
    expect(forme(t, p, 'd').prolonge).toBe('droite')
  })

  it('remplacer : la forme entière ; une clé absente de la forme neuve disparaît ; une étape ; Ctrl+Z la rend ; un identifiant absent est ignoré', async () => {
    const { t, pages: [p, q] } = await tableau(2)
    t.pageVue = p
    t.nouveauGeste(); t.poser(p, formule('f', 0.5)); await attendre(800)
    const u = t.annulationDe(p)!
    const n = u.undoStack.length, film = t.film.length
    // modifier ne redresse pas : la rotation absente du patch reste
    const { rotation: _r, ...droite } = forme(t, p, 'f') as Formule
    t.nouveauGeste(); t.modifier(p, [{ id: 'f', patch: droite as Partial<Forme> }]); await attendre(800)
    expect((forme(t, p, 'f') as Formule).rotation).toBe(0.5)
    t.annuler(p)
    // remplacer, si
    t.nouveauGeste(); t.remplacer(p, [{ ...droite, x: 120 } as Formule, trait(0, 0, 'inconnu')]); await attendre(800)
    expect('rotation' in forme(t, p, 'f')).toBe(false)
    expect(forme(t, p, 'f').x).toBe(120)
    expect(t.formesDe(p)!.has('inconnu')).toBe(false)
    expect(u.undoStack.length).toBe(n + 1)
    expect(t.film.length).toBe(film + 3)
    // Une clé qui vaut undefined dans la forme neuve n'est pas écrite
    t.nouveauGeste(); t.remplacer(p, [{ ...forme(t, p, 'f'), rotation: undefined } as Formule]); await attendre(800)
    expect(Object.keys(forme(t, p, 'f'))).not.toContain('rotation')
    t.annuler(p); t.annuler(p); await attendre(800)
    expect(forme(t, p, 'f')).toMatchObject({ x: 100, rotation: 0.5 })
    // Rien de la page : rien ne s'écrit, aucune étape
    const f2 = t.film.length
    t.remplacer(p, [trait(0, 0, 'ailleurs')])
    t.remplacer(q, [{ ...droite } as Formule])
    await attendre(800)
    expect(t.film.length).toBe(f2)
    expect(t.formesDe(q)!.size).toBe(0)
  })

  it('la note « réglage » est posée sur l\'étape de cette transaction, et sur elle seule ; remplacer peut noter « coupe »', async () => {
    const { t, pages: [p] } = await tableau(1)
    await geste(t, p, 'a')
    const n = t.film.length
    await verrouiller(t, p, ['a'])
    await geste(t, p, 'b')
    t.nouveauGeste(); t.modifier(p, [{ id: 'b', patch: { x: 50 } }]); await attendre(800)
    t.nouveauGeste(); t.remplacer(p, [{ ...forme(t, p, 'b'), groupe: 'g' } as Forme], { note: 'reglage' }); await attendre(800)
    t.nouveauGeste(); t.remplacer(p, [{ ...forme(t, p, 'b'), x: 0 } as Forme], { note: 'coupe' }); await attendre(800)
    const etapes = t.film.toArray().slice(n)
    expect(etapes.map(e => [!!e.reglage, !!e.coupe])).toEqual([[true, false], [false, false], [false, false], [true, false], [false, true]])
    expect(etapes.every(e => e.page === p && !e.seulOrdre && !e.naissance && !e.rangement)).toBe(true)
    // Une exception dans la transaction ne laisse pas la note en place
    expect(() => t.modifier(p, [{ id: 'a', get patch(): Partial<Forme> { throw new Error('x') } }], { note: 'reglage' })).toThrow()
    await geste(t, p, 'c')
    expect(t.film.get(t.film.length - 1).reglage).toBeUndefined()
  })
})

describe('les étapes « réglage » dans les séances, le film élève et la revue', () => {
  it('un réglage le lendemain d\'une séance ne crée aucune séance : Publier propose le cours, avec ses gestes', async () => {
    const { t, pages: [p] } = await tableau(1)
    for (let k = 0; k < 5; k++) await geste(t, p, 'c' + k)
    await attendre(24 * 60 * MINUTE)
    await verrouiller(t, p, ['c0', 'c1'])
    await verrouiller(t, p, ['c1'], false)
    const s = seancesDuFilm(t.film.toArray())
    expect(s.map(x => x.gestes)).toEqual([5])
    expect(seancesAPublier(t)[0]).toEqual(s[0])
    const l = lectureDe(t, () => t.ordre.toArray())
    expect(compterGestes(l, { genre: 'seance', seance: s[0], page: null })).toBe(5)
    // Toute l'histoire de la page : pas un geste de plus au bout, bien que la page ait changé depuis
    expect(compterGestes(l, { genre: 'page', page: p })).toBe(5)
  })

  it('entre deux gestes, un réglage ne coupe rien ; entre deux cours, il ne les réunit pas', async () => {
    const { t, pages: [p] } = await tableau(1)
    for (let k = 0; k < 3; k++) await geste(t, p, 'a' + k)
    await verrouiller(t, p, ['a0'])
    for (let k = 0; k < 3; k++) await geste(t, p, 'b' + k)
    let s = seancesDuFilm(t.film.toArray())
    expect(s.map(x => x.gestes)).toEqual([6])
    const l = lectureDe(t, () => t.ordre.toArray())
    expect(compterGestes(l, { genre: 'seance', seance: s[0], page: null })).toBe(6)
    // Deux cours à 29 minutes l'un de l'autre, verrouillés à mi-chemin
    await attendre(14 * MINUTE)
    await verrouiller(t, p, ['b0'])
    await attendre(15 * MINUTE)
    for (let k = 0; k < 2; k++) await geste(t, p, 'c' + k)
    s = seancesDuFilm(t.film.toArray())
    expect(s.map(x => x.gestes)).toEqual([2, 6])
  })

  it('le film élève : pas d\'étape pour un réglage ; son changement part avec le geste visible suivant de sa page, son temps dans l\'attente', async () => {
    const { t, pages: [p, q] } = await tableau(2)
    await geste(t, p, 'a')
    await attendre(5000)
    await verrouiller(t, p, ['a'])                 // 800 ms après, l'étape suivante
    await geste(t, q, 'q1')                        // un geste sur une autre page publiée
    await geste(t, p, 'b')
    const s = seancesDuFilm(t.film.toArray())[0]
    expect(s.gestes).toBe(3)
    const { film, sources } = exporterDetaille(t, { de: s.de, a: s.a, pages: [p, q], titre: '' }, { instruments: false })
    expect(film.etapes).toHaveLength(3)
    expect(sources.every(i => !t.film.get(i).reglage)).toBe(true)
    expect(film.etapes.map(e => e.p)).toEqual([p, q, p])
    // Le geste sur q n'emporte rien de p
    expect(film.etapes[1].o.map(o => o[0] === '=' ? o[1].id : o[0])).toEqual(['q1'])
    // Le geste suivant sur p emporte le trait verrouillé, tel qu'il est
    const ops = film.etapes[2].o
    expect(ops.filter(o => o[0] === '=').map(o => (o[1] as Forme).id).sort()).toEqual(['a', 'b'])
    expect(ops.find(o => o[0] === '=' && o[1].id === 'a')![1]).toMatchObject({ verrou: true })
    // Le temps du réglage s'ajoute à l'attente du geste suivant (q1) : 5 s + 0,8 s + 0,8 s
    expect(film.etapes[1].dt).toBe(t.film.get(sources[1]).t - t.film.get(sources[0]).t)
    // Le lecteur le rejoue sans rien de plus : au bout, le trait est verrouillé
    const b = new Bobine(film)
    expect(b.n).toBe(4)
    expect(b.image(3, p).formes.find(f => f.id === 'a')).toMatchObject({ verrou: true })
    expect(b.ajoutees(3).has('a')).toBe(false)
  })

  it('le film élève : un réglage en ouverture est dans l\'état de départ ; un réglage au bout ne fait pas d\'étape', async () => {
    const { t, pages: [p] } = await tableau(1)
    await geste(t, p, 'a')
    await attendre(2 * 60 * MINUTE)
    await verrouiller(t, p, ['a'])
    await attendre(MINUTE)
    await geste(t, p, 'b')
    await geste(t, p, 'c')
    await verrouiller(t, p, ['b'])
    const s = seancesDuFilm(t.film.toArray())[0]
    expect(s.gestes).toBe(2)
    // La séance commence au geste b : le réglage d'avant est de l'état de départ
    const f1 = exporterDetaille(t, { de: s.de, a: s.a, pages: [p], titre: '' }, { instruments: false }).film
    expect(f1.etapes).toHaveLength(2)
    expect(f1.pages[0].formes.find(f => f.id === 'a')).toMatchObject({ verrou: true })
    // Une séance qu'on ferait commencer AU réglage : il ne commence pas le film
    const f2 = exporterDetaille(t, { de: s.de - 1, a: t.film.length - 1, pages: [p], titre: '' }, { instruments: false })
    expect(f2.film.etapes).toHaveLength(2)
    expect(f2.film.pages[0].formes.find(f => f.id === 'a')).toMatchObject({ verrou: true })
    expect(f2.sources.every(i => !t.film.get(i).reglage)).toBe(true)
  })

  it('Ctrl + Z et Ctrl + Y d\'un réglage, le lendemain, sont des réglages : aucune séance fantôme, rien de plus dans la revue ni le film élève', async () => {
    const { t, pages: [p] } = await tableau(1)
    for (let k = 0; k < 3; k++) await geste(t, p, 'm' + k)
    const cours = seancesDuFilm(t.film.toArray())
    expect(cours.map(x => x.gestes)).toEqual([3])
    const l0 = lectureDe(t, () => t.ordre.toArray())
    const avant = compterGestes(l0, { genre: 'page', page: p })
    // Le lendemain : verrouiller un mot, se raviser, se raviser encore
    await attendre(26 * 60 * MINUTE)
    await verrouiller(t, p, ['m0'])
    expect(t.annuler(p)).toEqual({}); await attendre(800)
    expect(forme(t, p, 'm0').verrou).toBeUndefined()
    expect(t.retablir(p)).toBe(true); await attendre(800)
    expect(forme(t, p, 'm0').verrou).toBe(true)
    expect(t.annuler(p)).toEqual({}); await attendre(800)
    // Grouper deux mots, Ctrl + Z, Ctrl + Y
    t.nouveauGeste(); t.modifier(p, [{ id: 'm1', patch: { groupe: 'g' } }, { id: 'm2', patch: { groupe: 'g' } }], { note: 'reglage' }); await attendre(800)
    t.annuler(p); await attendre(800)
    expect(forme(t, p, 'm1').groupe).toBeUndefined()
    t.retablir(p); await attendre(800)
    expect(forme(t, p, 'm2').groupe).toBe('g')
    const fin = t.film.toArray().slice(-7)
    expect(fin.map(e => !!e.reglage)).toEqual([true, true, true, true, true, true, true])
    const s = seancesDuFilm(t.film.toArray())
    expect(s).toEqual(cours)
    expect(seancesAPublier(t)[0]).toEqual(cours[0])
    const l = lectureDe(t, () => t.ordre.toArray())
    expect(compterGestes(l, { genre: 'page', page: p })).toBe(avant)
    // Puis un vrai geste, défait et refait : des gestes, comme avant
    await geste(t, p, 'n')
    t.annuler(p); await attendre(800)
    t.retablir(p); await attendre(800)
    expect(t.film.toArray().slice(-3).map(e => !!e.reglage)).toEqual([false, false, false])
    expect(seancesDuFilm(t.film.toArray())[0].gestes).toBe(3)
  })

  it('Ctrl + Z et Ctrl + Y de Dégrouper et de Déverrouiller, en cours puis le lendemain : des réglages ; la revue, la séance et le film élève n\'ont que les gestes visibles, sans étape vide', async () => {
    const { t, pages: [p] } = await tableau(1)
    const vus = ['d0', 'd1', 'd2']
    for (const id of vus) await geste(t, p, id)
    // Pendant le cours : grouper d0 et d1, verrouiller d2, puis un geste visible
    t.nouveauGeste(); t.modifier(p, [{ id: 'd0', patch: { groupe: 'g' } }, { id: 'd1', patch: { groupe: 'g' } }], { note: 'reglage' }); await attendre(800)
    await verrouiller(t, p, ['d2'])
    await geste(t, p, 'v1'); vus.push('v1')
    // Dégrouper, Ctrl + Z, Ctrl + Y ; Déverrouiller, Ctrl + Z, Ctrl + Y ; puis un geste visible
    const n0 = t.film.length
    t.nouveauGeste(); t.modifier(p, [{ id: 'd0', patch: { groupe: undefined } }, { id: 'd1', patch: { groupe: undefined } }], { note: 'reglage' }); await attendre(800)
    expect(t.annuler(p)).toEqual({}); await attendre(800)
    expect(forme(t, p, 'd0').groupe).toBe('g')
    expect(t.retablir(p)).toBe(true); await attendre(800)
    expect(forme(t, p, 'd1').groupe).toBeUndefined()
    await verrouiller(t, p, ['d2'], false)
    expect(t.annuler(p)).toEqual({}); await attendre(800)
    expect(forme(t, p, 'd2').verrou).toBe(true)
    expect(t.retablir(p)).toBe(true); await attendre(800)
    expect(forme(t, p, 'd2').verrou).toBeUndefined()
    expect(t.film.toArray().slice(n0).map(e => !!e.reglage)).toEqual([true, true, true, true, true, true])
    await geste(t, p, 'v2'); vus.push('v2')
    const cours = seancesDuFilm(t.film.toArray())
    expect(cours.map(x => x.gestes)).toEqual([5])
    const l = lectureDe(t, () => t.ordre.toArray())
    expect(compterGestes(l, { genre: 'page', page: p })).toBe(5)
    expect(compterGestes(l, { genre: 'seance', seance: cours[0], page: null })).toBe(5)
    // Le film élève : une étape par geste visible, chacune avec le trait
    // qu'elle pose ; aucune étape faite seulement de formes réécrites à leur
    // verrou ou leur groupe près
    const eleve = () => exporterDetaille(t, { de: cours[0].de, a: cours[0].a, pages: [p], titre: '' }, { instruments: false }).film
    const f = eleve()
    expect(f.etapes).toHaveLength(5)
    const deja = new Set<string>(f.pages[0].formes.map(x => x.id))
    f.etapes.forEach((e, i) => {
      const neufs = e.o.filter(o => o[0] === '=' && !deja.has((o[1] as Forme).id)).map(o => (o[1] as Forme).id)
      expect(neufs).toEqual([vus[i]])
      for (const id of neufs) deja.add(id)
    })
    const b = new Bobine(f)
    const finale = b.image(b.n - 1, p).formes
    expect(finale.find(x => x.id === 'd0')!.groupe).toBeUndefined()
    expect(finale.find(x => x.id === 'd2')!.verrou).toBeUndefined()
    // Le lendemain, en préparant : regrouper, reverrouiller, et se raviser
    // (Ctrl + Z, Ctrl + Y, Ctrl + Z) : aucune séance, rien de plus nulle part
    await attendre(26 * 60 * MINUTE)
    const n1 = t.film.length
    t.nouveauGeste(); t.modifier(p, [{ id: 'd0', patch: { groupe: 'h' } }, { id: 'd1', patch: { groupe: 'h' } }], { note: 'reglage' }); await attendre(800)
    t.annuler(p); await attendre(800); t.retablir(p); await attendre(800); t.annuler(p); await attendre(800)
    expect(forme(t, p, 'd0').groupe).toBeUndefined()
    t.nouveauGeste(); t.modifier(p, [{ id: 'd0', patch: { groupe: 'h' } }, { id: 'd1', patch: { groupe: 'h' } }], { note: 'reglage' }); await attendre(800)
    t.nouveauGeste(); t.modifier(p, [{ id: 'd0', patch: { groupe: undefined } }, { id: 'd1', patch: { groupe: undefined } }], { note: 'reglage' }); await attendre(800)
    t.annuler(p); await attendre(800); t.retablir(p); await attendre(800); t.annuler(p); await attendre(800)
    expect(forme(t, p, 'd1').groupe).toBe('h')
    await verrouiller(t, p, ['d2'])
    await verrouiller(t, p, ['d2'], false)
    t.annuler(p); await attendre(800); t.retablir(p); await attendre(800); t.annuler(p); await attendre(800)
    expect(forme(t, p, 'd2').verrou).toBe(true)
    expect(t.film.toArray().slice(n1).every(e => e.reglage)).toBe(true)
    expect(seancesDuFilm(t.film.toArray())).toEqual(cours)
    expect(seancesAPublier(t)[0]).toEqual(cours[0])
    expect(compterGestes(lectureDe(t, () => t.ordre.toArray()), { genre: 'page', page: p })).toBe(5)
    expect(eleve().etapes).toHaveLength(5)
  })

  it('un geste visible fondu dans l\'étape d\'un réglage (la fenêtre de capture) lui ôte la note : le défaire se voit', async () => {
    const { t, pages: [p] } = await tableau(1)
    await geste(t, p, 'a')
    t.pageVue = p
    t.nouveauGeste()
    t.modifier(p, [{ id: 'a', patch: { verrou: true } }], { note: 'reglage' })
    await attendre(100)
    // Même pile, dans les 400 ms, sans nouveau geste : une seule étape de pile
    t.modifier(p, [{ id: 'a', patch: { x: 50 } }])
    await attendre(800)
    expect(t.film.toArray().slice(-2).map(e => !!e.reglage)).toEqual([true, false])
    t.annuler(p); await attendre(800)
    expect(forme(t, p, 'a')).toMatchObject({ x: 0 })
    expect(forme(t, p, 'a').verrou).toBeUndefined()
    expect(t.film.get(t.film.length - 1).reglage).toBeUndefined()
    // Dans l'autre sens : un réglage fondu dans un geste visible ne le fait pas réglage
    await attendre(800)
    t.nouveauGeste()
    t.modifier(p, [{ id: 'a', patch: { x: 60 } }])
    await attendre(100)
    t.modifier(p, [{ id: 'a', patch: { verrou: true } }], { note: 'reglage' })
    await attendre(800)
    t.annuler(p); await attendre(800)
    expect(forme(t, p, 'a')).toMatchObject({ x: 0 })
    expect(t.film.get(t.film.length - 1).reglage).toBeUndefined()
  })

  it('la revue : un réglage n\'est pas un geste, nulle part ; memeImage tient pour égales deux formes qui ne diffèrent que par verrou ou groupe', async () => {
    const { t, pages: [p] } = await tableau(1)
    for (let k = 0; k < 3; k++) await geste(t, p, 'c' + k)
    const l0 = lectureDe(t, () => t.ordre.toArray())
    const avant = compterGestes(l0, { genre: 'page', page: p })
    t.pageVue = p
    t.nouveauGeste(); t.modifier(p, [{ id: 'c0', patch: { groupe: 'g' } }, { id: 'c1', patch: { groupe: 'g' } }], { note: 'reglage' }); await attendre(800)
    await verrouiller(t, p, ['c0', 'c1'])
    const l = lectureDe(t, () => t.ordre.toArray())
    expect(compterGestes(l, { genre: 'page', page: p })).toBe(avant)
    const a = l.page(t.film.length - 3, p)!, b = l.page(t.film.length - 1, p)!
    expect(a.formes[0]).not.toBe(b.formes[0])
    expect(memeImage(a, b)).toBe(true)
    // Un vrai changement reste un changement
    const c = { ...b, formes: b.formes.map((f, i) => i ? f : { ...f, x: f.x + 1 }) }
    expect(memeImage(a, c)).toBe(false)
  })
})
