// Le presse-papiers des objets : la copie écrite en HTML marqué et relue, la
// copie gardée dans le navigateur (JSON), tout ce qui n'en est pas une
// refusé sans exception, et le collage (identifiants et rangs neufs, noms
// gardés ou changés, points liés). Ces tests tournent sous Node, sans aucune
// API du DOM : la lecture du HTML venu du presse-papiers n'en a pas besoin,
// et ne doit jamais en avoir besoin (un HTML piégé ne passe pas par le DOM).
import { describe, expect, it } from 'vitest'
import { collage, lireHtml, lireJson, memeTexte, validerCopie, versHtml, versTexte } from '../src/presse-papiers'
import type { Copie } from '../src/presse-papiers'
import type { Cercle, Formule, ImageForme, Polygone, Trait } from '../src/types'

const base = { auteur: 'moi' }
const trait = (id: string, x = 10, y = 20, z = 1): Trait =>
  ({ ...base, id, z, type: 'trait', x, y, pts: [0, 0, 0.5, 30, 10, 0.6, 60, 0, 0.5], couleur: '#1b2230', taille: 4.5, opacite: 1, pression: true })
const triangle = (id: string, noms?: string[], z = 2): Polygone =>
  ({ ...base, id, z, type: 'polygone', x: 100, y: 100, pts: [0, 0, 80, 0, 0, 60], ferme: true, couleur: '#1f5fbf', taille: 2.5,
    sommets: !!noms, noms, brut: { pts: [0, 0, 0.5, 80, 0, 0.5], taille: 4, pression: false } })
const formule = (id: string, latex: string, z = 3): Formule => ({ ...base, id, z, type: 'formule', x: 5, y: 6, latex, couleur: '#d0342c', taille: 28 })
const PNG = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg=='
const img = (id: string, src = 'banque1', z = 4): ImageForme => ({ ...base, id, z, type: 'image', src, x: 0, y: 0, l: 100, h: 50, m: [1, 0, 0, 1] })
const point = (id: string, nom: string, lie?: string, z = 5): Polygone =>
  ({ ...base, id, z, type: 'polygone', x: 10, y: 10, pts: [0, 0], ferme: false, couleur: '#1b2230', taille: 2.5, sommets: true, noms: [nom], stylePoints: [{ marque: 'croix' }], lie })
const copie = (formes: Copie['formes'], images: Record<string, string> = {}): Copie => ({ v: 1, formes, images, page: 'p1', centre: { x: 50, y: 50 }, t: 1700000000000 })

describe('écrire et relire une copie', () => {
  it('aller-retour par le HTML : accents, formule, image (ses données)', () => {
    const c = copie([trait('t1'), formule('f1', '\\text{périmètre} = 2\\pi r'), img('i1')], { banque1: PNG })
    const html = versHtml(c)
    expect(html).toContain('data-mem-teachingtool=\'1\'')
    expect(html).toMatch(/data-copie='[A-Za-z0-9+/=]+'/)
    const relue = lireHtml(html)!
    expect(relue).not.toBeNull()
    expect(relue.formes.map(f => f.id)).toEqual(['t1', 'f1', 'i1'])
    expect((relue.formes[1] as Formule).latex).toBe('\\text{périmètre} = 2\\pi r')
    expect(relue.images.banque1).toBe(PNG)
    expect(relue.centre).toEqual({ x: 50, y: 50 })
    expect(relue.t).toBe(c.t)
  })

  it('le HTML montre le texte de la copie (le LaTeX des formules, échappé), et se relit', () => {
    const c = copie([formule('a', 'a<b & c>d'), formule('b', 'x^2')])
    const html = versHtml(c)
    expect(html.endsWith(">a&lt;b &amp; c&gt;d<br>x^2</div>")).toBe(true)
    expect((lireHtml(html)!.formes[0] as Formule).latex).toBe('a<b & c>d')
  })

  it('le HTML tel que le rend le presse-papiers de Windows (fragment, guillemets doubles) se relit', () => {
    const c = copie([trait('t1')])
    const b64 = /data-copie='([^']+)'/.exec(versHtml(c))![1]
    const windows = `<html><body>\r\n<!--StartFragment--><meta charset="utf-8"><div data-mem-teachingtool="1" data-copie="${b64}">MEM teachingtool</div><!--EndFragment-->\r\n</body></html>`
    expect(lireHtml(windows)?.formes[0].id).toBe('t1')
  })

  it('aller-retour par le JSON gardé dans le navigateur', () => {
    const c = copie([triangle('p1', ['A', 'B', 'C'])])
    const relue = lireJson(JSON.stringify(c))!
    expect(relue.formes[0]).toMatchObject({ id: 'p1', type: 'polygone', noms: ['A', 'B', 'C'], ferme: true })
  })

  it('le texte : le LaTeX des formules seules, sinon une phrase', () => {
    expect(versTexte(copie([formule('a', 'x^2'), formule('b', '\\frac{1}{2}')]))).toBe('x^2\n\\frac{1}{2}')
    expect(versTexte(copie([trait('a')]))).toBe('MEM teachingtool : 1 objet')
    expect(versTexte(copie([trait('a'), formule('b', 'x')]))).toBe('MEM teachingtool : 2 objets')
    // Windows rend les fins de ligne en \r\n
    expect(memeTexte('x^2\r\n\\frac{1}{2}\r\n', 'x^2\n\\frac{1}{2}')).toBe(true)
    expect(memeTexte('autre chose', 'x^2')).toBe(false)
  })
})

describe('ce qui n\'est pas une copie est refusé, sans exception', () => {
  const b64 = (o: unknown) => Buffer.from(JSON.stringify(o), 'utf8').toString('base64')
  const html = (o: unknown) => `<div data-mem-teachingtool='1' data-copie='${b64(o)}'>x</div>`

  it('du texte, du JSON abîmé, un autre HTML, rien', () => {
    for (const v of [undefined, null, 42, '', 'bonjour', '{', '[]', '{"v":1}', 'null', '<p>bonjour</p>', '<b>data-mem-teachingtool</b>']) {
      expect(lireJson(v)).toBeNull()
      expect(lireHtml(v)).toBeNull()
    }
    // La marque sans copie, une copie qui n'est pas du base64, du base64 qui
    // n'est pas de l'UTF-8
    expect(lireHtml('<div data-mem-teachingtool=\'1\'>x</div>')).toBeNull()
    expect(lireHtml('<div data-mem-teachingtool=\'1\' data-copie=\'!!!\'>x</div>')).toBeNull()
    expect(lireHtml(`<div data-mem-teachingtool='1' data-copie='${Buffer.from([0xff, 0xfe, 0xfd]).toString('base64')}'>x</div>`)).toBeNull()
    // La marque dans le texte, pas en attribut
    expect(lireHtml(`<p>data-mem-teachingtool='1' data-copie='${b64(copie([trait('t')]))}'</p>`)).toBeNull()
  })

  it('un HTML piégé (<img onerror>) avec une fausse marque : refusé, et rien ne s\'exécute (pas de DOM ici)', () => {
    expect(typeof (globalThis as { document?: unknown }).document).toBe('undefined')
    expect(lireHtml('<img src=x onerror="globalThis.__pwn=1">')).toBeNull()
    expect(lireHtml('<img src=x onerror=globalThis.__pwn=1 data-mem-teachingtool=1 data-copie=\'e30=\'>')).toBeNull()
    expect(lireHtml(`<img src=x onerror=globalThis.__pwn=1 data-mem-teachingtool='1' data-copie='${b64({ v: 1, formes: [{ type: 'script' }] })}'>`)).toBeNull()
    expect((globalThis as { __pwn?: unknown }).__pwn).toBeUndefined()
  })

  it('une image qui n\'est pas une image (data:text/html, svg), ou absente des données', () => {
    expect(lireHtml(html(copie([img('i')], { banque1: 'data:text/html;base64,PHNjcmlwdD4=' })))).toBeNull()
    expect(lireHtml(html(copie([img('i')], { banque1: 'data:image/svg+xml;base64,PHN2Zz4=' })))).toBeNull()
    expect(lireHtml(html(copie([img('i')], { autre: PNG })))).toBeNull()
    expect(lireHtml(html(copie([img('i', '__proto__')], {})))).toBeNull()
    // Une matrice qui écrase l'image
    expect(validerCopie(copie([{ ...img('i'), m: [1, 2, 2, 4] }], { banque1: PNG }))).toBeNull()
  })

  it('des points qui ne sont pas des nombres, une taille NaN, une couleur qui n\'en est pas une', () => {
    expect(validerCopie(copie([{ ...trait('t'), pts: ['a'] as unknown as number[] }]))).toBeNull()
    expect(validerCopie(copie([{ ...trait('t'), pts: [0, 0] }]))).toBeNull()
    expect(validerCopie(copie([{ ...trait('t'), taille: NaN }]))).toBeNull()
    expect(lireJson(JSON.stringify(copie([trait('t')])).replace('"taille":4.5', '"taille":null'))).toBeNull()
    expect(validerCopie(copie([{ ...trait('t'), couleur: 'red;background:url(x)' }]))).toBeNull()
    expect(validerCopie(copie([{ ...trait('t'), opacite: 2 }]))).toBeNull()
    expect(validerCopie(copie([{ ...triangle('p'), pts: [0, 0, 1] }]))).toBeNull()
    expect(validerCopie(copie([{ ...triangle('p'), prolonge: 'loin' as never }]))).toBeNull()
    expect(validerCopie(copie([{ ...triangle('p', ['A', 'B', 'C', 'D']) }]))).toBeNull()
    expect(validerCopie(copie([{ ...triangle('p', ['ABCDEFGHIJ', 'B', 'C']) }]))).toBeNull()
    expect(validerCopie(copie([{ ...triangle('p'), stylePoints: [{ marque: 'tete-de-mort' as never }] }]))).toBeNull()
    expect(validerCopie(copie([{ ...formule('f', 'x'.repeat(2001)) }]))).toBeNull()
    expect(validerCopie(copie([{ ...base, id: 'c', z: 1, type: 'cercle', x: 0, y: 0, r: -3, couleur: '#000', taille: 2 } as Cercle]))).toBeNull()
    expect(validerCopie(copie([{ ...trait('t'), type: 'inconnu' as never }]))).toBeNull()
    // Deux formes du même identifiant, une copie vide, trop de formes, une autre version
    expect(validerCopie(copie([trait('t'), trait('t')]))).toBeNull()
    expect(validerCopie(copie([]))).toBeNull()
    expect(validerCopie(copie(Array.from({ length: 5001 }, (_, i) => trait('t' + i))))).toBeNull()
    expect(validerCopie({ ...copie([trait('t')]), v: 2 })).toBeNull()
    expect(validerCopie({ ...copie([trait('t')]), centre: { x: Infinity, y: 0 } })).toBeNull()
  })

  it('des grandeurs démesurées (finies, mais qui gèleraient la vue à chaque chargement) : refusées', () => {
    // La copie piégée d'un site hostile : un trait à 1e300, de taille 1e300
    const piege = { v: 1, formes: [{ id: 'q', type: 'trait', x: 1e300, y: 1e300, z: 1, pts: [0, 0, 0.5, 1e300, 1e300, 0.5], couleur: '#000000', taille: 1e300, opacite: 1, pression: false }], images: {}, page: 'p', centre: { x: 0, y: 0 }, t: 1700000000000 }
    expect(lireHtml(html(piege))).toBeNull()
    const G = 1e300
    const cercle = (o: Partial<Cercle>): Cercle => ({ ...base, id: 'c', z: 1, type: 'cercle', x: 0, y: 0, r: 30, couleur: '#000', taille: 2, ...o })
    for (const f of [
      { ...trait('t'), x: G }, { ...trait('t'), y: -G }, { ...trait('t'), pts: [0, 0, 0.5, G, 0, 0.5] }, { ...trait('t'), taille: G },
      { ...triangle('p'), pts: [0, 0, 1e8, 0, 0, 60] }, { ...triangle('p'), taille: 5000 },
      { ...triangle('p', ['A', 'B', 'C']), posNoms: [{ x: G, y: 0 }, null, null] },
      { ...triangle('p', ['A', 'B', 'C']), styleNoms: [{ taille: G }, null, null] },
      { ...triangle('p', ['A', 'B', 'C']), stylePoints: [{ taille: G }, null, null] },
      cercle({ r: G }), cercle({ arc: { a0: 0, a1: G } }),
      { ...base, id: 's', z: 1, type: 'segment', x: 0, y: 0, dx: G, dy: 0, couleur: '#000', taille: 2 },
      { ...formule('f', 'x'), taille: G },
    ]) expect(validerCopie(copie([f as never])), JSON.stringify(f).slice(0, 120)).toBeNull()
    for (const i of [{ ...img('i'), l: G }, { ...img('i'), m: [G, 0, 0, 1] }, { ...img('i'), m: [1e-9, 0, 0, 1e-9] }])
      expect(validerCopie(copie([i as never], { banque1: PNG }))).toBeNull()
    expect(validerCopie({ ...copie([trait('t')]), centre: { x: G, y: 0 } })).toBeNull()
    // Aux bornes, ou d'une taille ordinaire, tout passe
    expect(validerCopie(copie([{ ...trait('t'), x: 1e7, y: -1e7, taille: 1000 }, cercle({ r: 1e7 })]))).not.toBeNull()
    expect(validerCopie(copie([{ ...img('i'), l: 4000, h: 3000, m: [0.25, 0, 0, 0.25] }], { banque1: PNG }))).not.toBeNull()
  })

  it('un champ inconnu est jeté, comme le tracé d\'origine et l\'auteur', () => {
    const c = validerCopie(copie([{ ...triangle('p', ['A', 'B', 'C']), pirate: '<script>', stylePoints: [{ marque: 'croix', onclick: 'x' }] } as never]))!
    const f = c.formes[0] as Polygone & Record<string, unknown>
    expect(f.pirate).toBeUndefined()
    expect(f.brut).toBeUndefined()
    expect(f.auteur).toBe('')
    expect(f.stylePoints).toEqual([{ marque: 'croix' }])
    expect(Object.keys(f).sort()).toEqual(['couleur', 'ferme', 'id', 'noms', 'pts', 'sommets', 'stylePoints', 'taille', 'type', 'x', 'y', 'z', 'auteur'].sort())
  })

  it('un HTML écrit pour piéger la lecture (des milliers de marques, des balises sans fin) se lit vite', () => {
    const pieges = [
      '<a>' + 'data-mem-teachingtool>'.repeat(800_000),
      '<a ' + 'data-mem-teachingtool '.repeat(800_000) + '>',
      '<a ' + 'data-mem-teachingtool=1 data-copie=\'' + 'A'.repeat(15_000_000),
      '<' + 'a'.repeat(15_000_000) + ' data-mem-teachingtool=1',
      ('<a data-mem-teachingtool<').repeat(700_000),
    ]
    for (const h of pieges) {
      const t0 = performance.now()
      expect(lireHtml(h)).toBeNull()
      expect(performance.now() - t0).toBeLessThan(1500)
    }
  })

  it('le plafond : un texte de plus de 20 Mo n\'est pas lu', () => {
    const gros = 'x'.repeat(20 * 1024 * 1024 + 1)
    expect(lireHtml(gros)).toBeNull()
    expect(lireJson(gros)).toBeNull()
  })
})

describe('le collage', () => {
  it('ids neufs, rangs croissants dans l\'ordre d\'origine, déplacé, brut retiré', () => {
    const c = copie([triangle('p', ['A', 'B', 'C'], 30), trait('t', 10, 20, 10)])
    const r = collage(c, { dx: 40, dy: -40, moi: 'moi2', existantes: [], maintenant: 1000 })
    expect(r.map(f => f.type)).toEqual(['trait', 'polygone'])
    expect(r.map(f => f.z)).toEqual([1000, 1001])
    expect(r.every(f => !['p', 't'].includes(f.id) && f.auteur === 'moi2')).toBe(true)
    expect(new Set(r.map(f => f.id)).size).toBe(2)
    expect(r[0]).toMatchObject({ x: 50, y: -20 })
    expect(r[1]).toMatchObject({ x: 140, y: 60 })
    expect((r[1] as Polygone).brut).toBeUndefined()
    // Rien de partagé avec la copie
    expect((r[0] as Trait).pts).not.toBe((c.formes[1] as Trait).pts)
  })

  it('une figure ABC garde ses noms sur une page libre, en reçoit d\'autres sur la même page ; jamais de primes', () => {
    const abc = triangle('p', ['A', 'B', 'C'])
    expect((collage(copie([abc]), { dx: 0, dy: 0, moi: 'm', existantes: [] })[0] as Polygone).noms).toEqual(['A', 'B', 'C'])
    expect((collage(copie([abc]), { dx: 40, dy: 40, moi: 'm', existantes: [abc] })[0] as Polygone).noms).toEqual(['D', 'E', 'F'])
    // Deux triangles ABC copiés ensemble sur une page vide, à deux places :
    // six points, deux à deux distincts ; le second change
    const r = collage(copie([abc, { ...triangle('q', ['A', 'B', 'C'], 3), x: 300 }]), { dx: 0, dy: 0, moi: 'm', existantes: [] })
    expect(r.map(f => (f as Polygone).noms)).toEqual([['A', 'B', 'C'], ['D', 'E', 'F']])
    // Une figure sans noms n'en reçoit pas
    expect((collage(copie([triangle('p')]), { dx: 0, dy: 0, moi: 'm', existantes: [] })[0] as Polygone).noms).toBeUndefined()
  })

  it('un point partagé par plusieurs figures garde UN nom : triangle ABC, hauteur [AH], cercle de centre A', () => {
    const tri: Polygone = { ...base, id: 'tri', z: 1, type: 'polygone', x: 300, y: 200, pts: [0, 0, 200, 160, -100, 160], ferme: true, couleur: '#1b2230', taille: 3, sommets: true, noms: ['A', 'B', 'C'] }
    const hau: Polygone = { ...base, id: 'hau', z: 2, type: 'polygone', x: 300, y: 200, pts: [0, 0, 0, 160], ferme: false, couleur: '#1b2230', taille: 3, sommets: true, noms: ['A', 'H'] }
    const cer: Cercle = { ...base, id: 'cer', z: 3, type: 'cercle', x: 300.04, y: 199.97, r: 60, couleur: '#1b2230', taille: 3, sommets: true, noms: ['A'] }
    const noms = (r: ReturnType<typeof collage>) => r.map(f => (f as Polygone | Cercle).noms)
    // Sur une page vide : tout est gardé
    expect(noms(collage(copie([tri, hau, cer]), { dx: 130, dy: 19, moi: 'm', existantes: [] }))).toEqual([['A', 'B', 'C'], ['A', 'H'], ['A']])
    // Sur la même page (Ctrl+D) : une lettre neuve par point, la même partout
    expect(noms(collage(copie([tri, hau, cer]), { dx: 40, dy: 40, moi: 'm', existantes: [tri, hau, cer] }))).toEqual([['D', 'E', 'F'], ['D', 'G'], ['D']])
    // Un seul nom pris sur la page (H) : chaque point prend la première lettre
    // libre (A, B, C le sont encore), et le partage tient
    const h: Polygone = { ...base, id: 'h', z: 0, type: 'polygone', x: 0, y: 0, pts: [0, 0], ferme: false, couleur: '#1b2230', taille: 3, sommets: true, noms: ['H'] }
    expect(noms(collage(copie([tri, hau, cer]), { dx: 0, dy: 0, moi: 'm', existantes: [h] }))).toEqual([['A', 'B', 'C'], ['A', 'D'], ['A']])
    // Un cercle seul, son centre pris : il reçoit O, comme un cercle qu'on nomme
    expect(noms(collage(copie([cer]), { dx: 40, dy: 40, moi: 'm', existantes: [cer] }))).toEqual([['O']])
    // Un sommet sans nom reste sans nom
    const sansC: Polygone = { ...tri, noms: ['A', 'B', ''] }
    expect(noms(collage(copie([sansC]), { dx: 40, dy: 40, moi: 'm', existantes: [tri] }))).toEqual([['D', 'E', '']])
  })

  it('un point lié suit la nouvelle image si elle est copiée avec lui ; sinon il n\'est plus lié', () => {
    const c = copie([img('i'), point('a', 'A', 'i')], { banque1: PNG })
    const r = collage(c, { dx: 10, dy: 10, moi: 'm', existantes: [] })
    const nouvelle = r.find(f => f.type === 'image')!
    expect((r.find(f => f.type === 'polygone') as Polygone).lie).toBe(nouvelle.id)
    expect((nouvelle as ImageForme).src).toBe('banque1')
    const seul = collage(copie([point('a', 'A', 'i')]), { dx: 0, dy: 0, moi: 'm', existantes: [] })
    expect('lie' in seul[0]).toBe(false)
  })
})

describe('poser un collage dans le document', () => {
  it('poserPlusieurs : une étape d\'annulation, une étape du film, sur la page visée seulement', async () => {
    const { Tableau } = await import('../src/document')
    const t = new Tableau(null)
    await t.charger()
    const a = t.ordre.get(0), b = t.ajouterPage('blanc', 1)
    t.pageVue = a
    const attendre = async () => { await Promise.resolve(); await Promise.resolve() }
    await attendre()
    const film0 = t.film.length
    const formes = collage(copie([triangle('p', ['A', 'B', 'C']), trait('t'), formule('f', 'x')]), { dx: 40, dy: 40, moi: t.moi, existantes: [] })
    t.nouveauGeste()
    t.poserPlusieurs(a, formes)
    await attendre()
    expect(t.formesDe(a)!.size).toBe(3)
    expect(t.formesDe(b)!.size).toBe(0)
    expect(t.film.length).toBe(film0 + 1)
    expect(t.annulationDe(a)!.undoStack.length).toBe(1)
    expect(t.peutAnnuler(b)).toBe(false)
    expect(t.annuler(a)).toEqual({})
    expect(t.formesDe(a)!.size).toBe(0)
    // Rien à poser : rien ne s'écrit
    t.poserPlusieurs(a, [])
    await attendre()
    expect(t.film.length).toBe(film0 + 2)
  })
})
