// Vérification « données et replay » du lot 5 : le Ctrl + Z (et le Ctrl + Y)
// d'un réglage (verrouiller, grouper) est-il encore un réglage pour le film ?
import { afterEach, beforeEach, expect, it, vi } from 'vitest'
import { Tableau } from '../../../../../../src/document'
import { exporterDetaille, seancesAPublier, seancesDuFilm } from '../../../../../../src/revoir/exporter'
import { compterGestes } from '../../../../../../src/revue/bande'
import { lectureDe } from '../../../../../../src/revue/planches'
import { MINUTE, attendre, geste, reglerHorloge, trait } from './banc'

beforeEach(() => reglerHorloge())
afterEach(() => vi.useRealTimers())

it('verrouiller le lendemain puis Ctrl + Z : pas de séance d\'un geste, pas de geste dans la revue ni dans le film élève', async () => {
  const t = new Tableau(null)
  const p = t.ajouterPage('carreaux', 0); t.pageVue = p; await attendre(500)
  await attendre(30 * MINUTE)
  for (let k = 0; k < 4; k++) await geste(t, p, trait(k * 100, 0, 'e' + k))
  const seancesAvant = seancesDuFilm(t.film.toArray())
  // Le lendemain, en préparant : on verrouille l'énoncé, puis on se ravise (Ctrl + Z)
  await attendre(20 * 60 * MINUTE)
  t.pageVue = p; t.nouveauGeste()
  t.modifier(p, [{ id: 'e0', patch: { verrou: true } }], { note: 'reglage' }); await attendre(800)
  t.nouveauGeste(); t.annuler(p); await attendre(800)
  const film = t.film.toArray()
  const deux = film.slice(-2).map(e => ({ reglage: !!e.reglage, seulOrdre: !!e.seulOrdre }))
  console.log('les deux dernières étapes du film :', JSON.stringify(deux))
  const seances = seancesDuFilm(film)
  console.log('séances avant :', seancesAvant.length, '— après :', seances.length, JSON.stringify(seances.map(s => ({ gestes: s.gestes, de: s.de, a: s.a }))))
  const l = lectureDe(t, () => t.ordre.toArray())
  const gestesPage = compterGestes(l as never, { genre: 'page', page: p } as never)
  console.log('gestes de la page dans la revue :', gestesPage)
  const derniere = seances.at(-1)!
  const f = exporterDetaille(t, { de: derniere.de, a: derniere.a, pages: [p], titre: 'x' }).film
  console.log('film élève de la dernière séance :', f.etapes.length, 'étape(s)', JSON.stringify(f.etapes.map(e => e.o.map(o => o[0]))))
  const publier = seancesAPublier(t)
  const office = publier[0]
  const fo = exporterDetaille(t, { de: office.de, a: office.a, pages: [p], titre: 'x' }).film
  console.log('Publier propose', publier.length, 'séance(s) ; choisie d\'office :', JSON.stringify({ gestes: office.gestes, de: office.de, a: office.a }), '; son film élève :', JSON.stringify(fo.etapes.map(e => e.o)))
  // Ce qu'on attend (D24) : l'annulation d'un réglage ne change rien à l'image non plus
  expect(seances.length).toBe(seancesAvant.length)
  expect(gestesPage).toBe(4)
})

it('grouper puis Ctrl + Z puis Ctrl + Y pendant le cours : la revue n\'en fait pas de geste', async () => {
  const t = new Tableau(null)
  const p = t.ajouterPage('carreaux', 0); t.pageVue = p; await attendre(500)
  await attendre(30 * MINUTE)
  for (let k = 0; k < 3; k++) await geste(t, p, trait(k * 100, 0, 'e' + k))
  t.pageVue = p; t.nouveauGeste()
  t.modifier(p, [{ id: 'e0', patch: { groupe: 'g' } }, { id: 'e1', patch: { groupe: 'g' } }], { note: 'reglage' }); await attendre(800)
  t.nouveauGeste(); t.annuler(p); await attendre(800)
  t.nouveauGeste(); t.retablir(p); await attendre(800)
  await geste(t, p, trait(0, 200, 'e9'))
  const film = t.film.toArray()
  console.log('notes :', JSON.stringify(film.map(e => e.reglage ? 'R' : e.seulOrdre ? 'O' : e.naissance ? 'N' : 'G').join('')))
  const l = lectureDe(t, () => t.ordre.toArray())
  const gestesPage = compterGestes(l as never, { genre: 'page', page: p } as never)
  const s = seancesDuFilm(film).at(-1)!
  const f = exporterDetaille(t, { de: s.de, a: s.a, pages: [p], titre: 'x' }).film
  console.log('revue :', gestesPage, 'gestes ; séance :', s.gestes, 'gestes ; film élève :', f.etapes.length, 'étapes', JSON.stringify(f.etapes.map(e => e.o.map(o => o[0] + (o[0] === '=' ? (o[1] as { id: string }).id : '')))))
  expect(gestesPage).toBe(4)
  expect(s.gestes).toBe(4)
  expect(f.etapes.length).toBe(4)
})
