// Vérification « données et replay » du lot 3 : envoyer vers une autre page,
// Ctrl+Z sur la page d'origine et sur la page d'arrivée, dans les deux ordres.
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { Tableau } from '../../../../../../src/document'
import type { Forme, Polygone, Trait } from '../../../../../../src/types'
import { collage } from '../../../../../../src/presse-papiers'
import type { Copie } from '../../../../../../src/presse-papiers'
import { exporterDetaille, seancesDuFilm } from '../../../../../../src/revoir/exporter'
import { lectureDe } from '../../../../../../src/revue/planches'
import { compterGestes, construireBande } from '../../../../../../src/revue/bande'
import { Planches } from '../../../../../../src/revue/planches'

const MINUTE = 60_000
let horloge = new Date('2026-10-09T08:00:00').getTime()
let numero = 0
beforeEach(() => { vi.useFakeTimers({ toFake: ['Date'] }); vi.setSystemTime(horloge) })
afterEach(() => vi.useRealTimers())
async function attendre(ms: number) { horloge += ms; vi.setSystemTime(horloge); await Promise.resolve(); await Promise.resolve() }

function trait(x: number, y: number, id = 'T' + numero++): Trait {
  return { id, type: 'trait', x, y, z: numero++, auteur: 'moi', pts: [0, 0, 0.5, 40, 5, 0.5, 80, 0, 0.5], couleur: '#1b2230', taille: 3, opacite: 1, pression: false }
}
async function geste(t: Tableau, page: string, f: Forme) {
  t.pageVue = page
  t.nouveauGeste(); t.poser(page, f)
  await attendre(800)
}
async function tableau(n: number) {
  const t = new Tableau(null)
  const pages: string[] = []
  for (let i = 0; i < n; i++) { const p = t.ajouterPage('carreaux', i); pages.push(p); t.pageVue = p; await attendre(500) }
  t.pageVue = pages[0]
  await attendre(30 * MINUTE)
  return { t, pages }
}
/** Comme App.envoyerSelection : objets de `de`, collage, envoi. Mis à jour
 *  au contrôle final : comme l'application depuis la correction « données »
 *  (noms des points), un déplacement compte pour pris les noms de ce que la
 *  pile de la page d'arrivée peut y ramener (formesQuiPeuventRevenir) */
async function envoyer(t: Tableau, de: string, vers: string, ids: string[], deplacer = true) {
  t.pageVue = de
  const formes = [...t.formesDe(de)!.values()].filter(f => ids.includes(f.id)).sort((a, b) => a.z - b.z)
  const c: Copie = { v: 1, formes, images: {}, page: de, centre: { x: 0, y: 0 }, t: 0 }
  const existantes = [...t.formesDe(vers)!.values()]
  if (deplacer) existantes.push(...t.formesQuiPeuventRevenir(vers, { de, ids: new Set(formes.map(f => f.id)) }))
  const posees = collage(c, { dx: 0, dy: 0, moi: t.moi, existantes })
  const ok = t.envoyer(de, vers, posees, formes.map(f => f.id), { deplacer })
  await attendre(800)
  return { ok, posees }
}
/** Combien d'exemplaires du trait d'origine (reconnu à sa position et à ses points) il y a, page par page */
function exemplaires(t: Tableau, pages: string[], x: number) {
  return pages.map(p => [...t.formesDe(p)!.values()].filter(f => f.type === 'trait' && f.x === x).length)
}
async function ctrlZ(t: Tableau, page: string) { t.pageVue = page; const r = t.annuler(page); await attendre(500); return r }

describe('envoi : jamais d\'objet perdu ni de doublon caché', () => {
  it('aller-retour A → B → A, puis Ctrl+Z sur A d\'abord, puis sur B', async () => {
    const { t, pages: [a, b] } = await tableau(2)
    await geste(t, a, trait(123, 0, 'x'))
    const { posees: p1 } = await envoyer(t, a, b, ['x'])       // X part sur B (X1)
    expect(exemplaires(t, [a, b], 123)).toEqual([0, 1])
    const { posees: p2 } = await envoyer(t, b, a, [p1[0].id])  // X1 revient sur A (X2), depuis B
    expect(exemplaires(t, [a, b], 123)).toEqual([1, 0])
    // Le professeur est sur A, il fait Ctrl+Z (le dernier geste de SA pile : le départ de X)
    const r = await ctrlZ(t, a)
    console.log('Ctrl+Z sur A :', JSON.stringify(r), 'exemplaires [A, B] =', JSON.stringify(exemplaires(t, [a, b], 123)), 'ids A =', JSON.stringify([...t.formesDe(a)!.keys()]))
    // Deux exemplaires superposés exactement sur A ?
    const surA = [...t.formesDe(a)!.values()].filter(f => f.x === 123)
    console.log('positions sur A :', JSON.stringify(surA.map(f => [f.id, f.x, f.y])))
    // Depuis la correction « données » : ce Ctrl+Z ne défait pas encore l'aller
    // (rien ne change, la réponse le dit : envoiBloque) ; il attend celui de B
    expect(r).toMatchObject({ envoiBloque: { vers: b, n: 1 } })
    expect(exemplaires(t, [a, b], 123)).toEqual([1, 0])
    const r2 = await ctrlZ(t, b)
    console.log('Ctrl+Z sur B :', JSON.stringify(r2), 'exemplaires [A, B] =', JSON.stringify(exemplaires(t, [a, b], 123)))
    expect(exemplaires(t, [a, b], 123)).toEqual([0, 1])
    // Puis sur A : l'aller se défait ; au départ il y avait UN objet, il y en a un
    await ctrlZ(t, a)
    expect(exemplaires(t, [a, b], 123)).toEqual([1, 0])
    void p2
  })

  it('aller-retour A → B → A, puis Ctrl+Z sur B d\'abord, puis sur A (l\'ordre naturel)', async () => {
    const { t, pages: [a, b] } = await tableau(2)
    await geste(t, a, trait(123, 0, 'x'))
    const { posees: p1 } = await envoyer(t, a, b, ['x'])
    await envoyer(t, b, a, [p1[0].id])
    const r1 = await ctrlZ(t, b)
    const e1 = exemplaires(t, [a, b], 123)
    const r2 = await ctrlZ(t, a)
    const e2 = exemplaires(t, [a, b], 123)
    console.log('ordre naturel', JSON.stringify({ r1, e1, r2, e2 }))
    expect(e1).toEqual([0, 1])
    expect(e2).toEqual([1, 0])
  })

  it('A → B, puis B → C ; Ctrl+Z sur A', async () => {
    const { t, pages: [a, b, c] } = await tableau(3)
    await geste(t, a, trait(321, 0, 'x'))
    const { posees: p1 } = await envoyer(t, a, b, ['x'])
    await envoyer(t, b, c, [p1[0].id])
    expect(exemplaires(t, [a, b, c], 321)).toEqual([0, 0, 1])
    const r = await ctrlZ(t, a)
    const e = exemplaires(t, [a, b, c], 321)
    console.log('A→B→C, Ctrl+Z sur A :', JSON.stringify(r), JSON.stringify(e))
    expect.soft(e.reduce((s, n) => s + n, 0) === 1 || ((r?.envoi?.restes ?? 0) > 0), 'un doublon sur C sans que la réponse le dise').toBe(true)
  })

  it('A → B, X effacé sur B, Ctrl+Z sur A puis Ctrl+Z sur B', async () => {
    const { t, pages: [a, b] } = await tableau(2)
    await geste(t, a, trait(222, 0, 'x'))
    const { posees: p1 } = await envoyer(t, a, b, ['x'])
    t.pageVue = b; t.nouveauGeste(); t.supprimer(b, [p1[0].id]); await attendre(800)
    const r = await ctrlZ(t, a)
    const e1 = exemplaires(t, [a, b], 222)
    const r2 = await ctrlZ(t, b)
    const e2 = exemplaires(t, [a, b], 222)
    console.log('effacé sur B :', JSON.stringify({ r, e1, r2, e2 }))
  })

  it('copier A → B, Ctrl+Z sur A puis sur B, et l\'inverse', async () => {
    const { t, pages: [a, b] } = await tableau(2)
    await geste(t, a, trait(0, 0, 'avant'))
    await geste(t, a, trait(444, 0, 'x'))
    await envoyer(t, a, b, ['x'], false)
    expect(exemplaires(t, [a, b], 444)).toEqual([1, 1])
    const r = await ctrlZ(t, a)    // défait « x posé » sur A
    const e1 = exemplaires(t, [a, b], 444)
    const r2 = await ctrlZ(t, b)   // défait la copie sur B
    const e2 = exemplaires(t, [a, b], 444)
    console.log('copie :', JSON.stringify({ r, e1, r2, e2 }))
    expect(e2).toEqual([0, 0])
  })

  it('replay des deux pages après un déplacement : la revue et le film élève', async () => {
    const { t, pages: [a, b] } = await tableau(2)
    await geste(t, a, trait(10, 0, 'x'))
    await geste(t, a, trait(20, 0, 'y'))
    await geste(t, b, trait(500, 0, 'b1'))
    t.pageVue = a
    const { posees } = await envoyer(t, a, b, ['x'])
    await geste(t, a, trait(30, 0, 'z'))
    const lecture = lectureDe(t, () => t.ordre.toArray())
    const seances = seancesDuFilm(lecture.film)
    const nommer = (p: string) => `Page ${t.ordre.toArray().indexOf(p) + 1}`
    const ba = construireBande(lecture, { genre: 'page', page: a }, seances, nommer)!
    const bb = construireBande(lecture, { genre: 'page', page: b }, seances, nommer)!
    const pl = new Planches(lecture)
    const derA = pl.lire(ba.images.at(-1)!).formes.map(f => f.id).sort()
    const derB = pl.lire(bb.images.at(-1)!).formes.map(f => f.id).sort()
    expect(derA).toEqual(['y', 'z'])
    expect(derB).toEqual(['b1', posees[0].id].sort())
    expect(compterGestes(lecture, { genre: 'page', page: a })).toBe(4)
    expect(compterGestes(lecture, { genre: 'page', page: b })).toBe(2)
    const s = seances[0]
    const f = exporterDetaille(t, { de: s.de, a: s.a, pages: [a, b], titre: 'x' }).film
    console.log('film élève : chapitres', JSON.stringify(f.chapitres), 'étapes', JSON.stringify(f.etapes.map(e => [e.p === a ? 'A' : 'B', e.o.map(o => o[0] + (o[0] === '=' ? (o[1] as Forme).id : o[0] === '-' ? o[1] : '')).join(',')])))
  })
})

describe('envoi et corbeille', () => {
  it('A → B, B jetée puis supprimée définitivement, Ctrl+Z sur A puis Ctrl+Y sur A : où est l\'objet ?', async () => {
    const { t, pages: [a, b, c] } = await tableau(3)
    await geste(t, a, trait(555, 0, 'x'))
    await geste(t, b, trait(0, 0, 'b0'))
    await envoyer(t, a, b, ['x'])
    t.pageVue = c; expect(t.jeterPage(b, c)).toBe(true); await attendre(800)
    expect(t.supprimerDefinitivement([b])).toBe(1); await attendre(800)
    const r = await ctrlZ(t, a)
    const e1 = exemplaires(t, [a, b], 555)
    t.pageVue = a; const r2 = t.retablir(a); await attendre(800)
    const e2 = exemplaires(t, [a, b], 555)
    console.log('définitive :', JSON.stringify({ r, e1, r2, e2, ordre: t.ordre.toArray().map(p => [a, b, c].indexOf(p)), dansLaCorbeille: t.dansLaCorbeille(b), definitif: t.corbeille.get(b)?.definitif }))
  })
})

describe('envoi et noms des points', () => {
  const triangle = (id: string, x: number, noms = ['A', 'B', 'C']): Polygone =>
    ({ id, type: 'polygone', x, y: 100, z: numero++, auteur: 'moi', pts: [0, 0, 80, 0, 0, 60], ferme: true, couleur: '#1f5fbf', taille: 2.5, sommets: true, noms } as Polygone)
  const noms = (t: Tableau, p: string) => [...t.formesDe(p)!.values()].filter(f => f.type === 'polygone').map(f => (f as Polygone).noms!.join(''))
  it('ABC de A part sur B ; un ABC de C arrive sur A ; Ctrl+Z sur A : deux triangles ABC sur A ?', async () => {
    const { t, pages: [a, b, c] } = await tableau(3)
    await geste(t, a, triangle('t1', 100))
    await geste(t, c, triangle('t3', 400))
    await envoyer(t, a, b, ['t1'])                 // ABC quitte A (B est libre : il reste ABC)
    await envoyer(t, c, a, ['t3'])                 // un autre ABC arrive sur A (A est libre : il reste ABC)
    const avant = noms(t, a)
    const r = await ctrlZ(t, a)                    // défait le départ de t1 (le haut de la pile de A)
    console.log('noms sur A :', JSON.stringify({ avant, apres: noms(t, a), b: noms(t, b), c: noms(t, c), r }))
    const tous = noms(t, a).join('')
    expect.soft(new Set(tous).size, 'chaque lettre une seule fois sur la page A').toBe(tous.length)
  })
  it('ABC effacé sur A ; un ABC de C arrive sur A ; Ctrl+Z sur A (défaire l\'effacement)', async () => {
    const { t, pages: [a, , c] } = await tableau(3)
    await geste(t, a, triangle('t1', 100))
    await geste(t, c, triangle('t3', 400))
    t.pageVue = a; t.nouveauGeste(); t.supprimer(a, ['t1']); await attendre(800)
    await envoyer(t, c, a, ['t3'])
    const avant = noms(t, a)
    const r = await ctrlZ(t, a)
    console.log('effacé puis arrivé :', JSON.stringify({ avant, apres: noms(t, a), r }))
    const tous = noms(t, a).join('')
    expect.soft(new Set(tous).size, 'chaque lettre une seule fois sur la page A').toBe(tous.length)
  })
})
