// Le film élève : ce qui part chez les élèves, et ce qu'ils en revoient.
// La règle d'or d'abord : rien de ce qui a été effacé avant la séance, ni
// le nom de l'appareil, ni le tracé brut d'une figure, ne doit s'y trouver.
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { Tableau } from '../src/document'
import type { Forme, Polygone, Trait } from '../src/types'
import { exporter, exporterDetaille, pagesDeLaSeance, seancesDuFilm } from '../src/revoir/exporter'
import { ErreurFilm, ecrireFilm, lireFilm } from '../src/revoir/format'
import { Bobine } from '../src/revoir/bobine'
import { PLAFOND } from '../src/revoir/rythme'

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
  return { id: 'T' + numero++, type: 'trait', x, y, z: numero, auteur: 'appareil-du-prof', pts, couleur: '#1b2230', taille: 3, opacite: 1, pression: false }
}
function formule(latex: string, x = 0, y = 0): Forme {
  return { id: 'F' + numero++, type: 'formule', x, y, z: numero, auteur: 'appareil-du-prof', latex, couleur: '#1b2230', taille: 28 }
}
function segment(): Polygone {
  return { id: 'P' + numero++, type: 'polygone', x: 10, y: 10, z: numero, auteur: 'appareil-du-prof', pts: [0, 0, 120, 40], ferme: false, couleur: '#1b2230', taille: 3,
    brut: { pts: [1, 2, 0.5, 3, 4, 0.5], taille: 3, pression: false } }
}

/** Un tableau neuf, sans enregistrement, avec une page */
async function nouveauTableau() {
  const t = new Tableau(null)
  const page = t.ajouterPage('carreaux', 0)
  t.pageVue = page
  await attendre(1000)
  return { t, page }
}

describe('séances repérées dans le film', () => {
  it('coupe aux longs silences et aux changements de jour', async () => {
    const { t, page } = await nouveauTableau()
    t.poser(page, trait(0, 0)); await attendre(2000)
    t.poser(page, trait(10, 0)); await attendre(25 * MINUTE)       // récréation
    t.poser(page, trait(20, 0)); await attendre(3000)
    t.poser(page, trait(30, 0)); await attendre(24 * 60 * MINUTE)  // le lendemain
    t.poser(page, trait(40, 0)); await attendre(1000)
    const s = seancesDuFilm(t.film.toArray())
    expect(s.map(x => x.gestes)).toEqual([1, 2, 3])                // la plus récente d'abord
    expect(s[0].pages).toEqual([page])
  })
})

describe('le film élève ne garde que ce qui a été vu', () => {
  it("n'emporte ni l'effacé d'avant la séance, ni l'auteur, ni le tracé brut", async () => {
    const { t, page } = await nouveauTableau()
    // Avant la séance : un prénom écrit puis effacé, et une forme qui reste
    const prenom = formule('\\text{Lucas Martin}')
    t.poser(page, prenom); await attendre(2000)
    t.supprimer(page, [prenom.id]); await attendre(2000)
    t.poser(page, trait(5, 5)); await attendre(40 * MINUTE)
    // La séance
    t.poser(page, segment()); await attendre(1500)
    t.poser(page, trait(50, 50)); await attendre(1500)
    const seance = seancesDuFilm(t.film.toArray())[0]
    const film = exporter(t, { de: seance.de, a: seance.a, pages: seance.pages, titre: 'Séance' })
    const texte = JSON.stringify(film)
    expect(texte).not.toContain('Lucas')
    expect(texte).not.toContain('appareil-du-prof')
    expect(texte).not.toContain('"brut"')
    // Ce qui était au tableau au début de la séance, lui, y est
    expect(film.pages[0].formes).toHaveLength(1)
    expect(film.etapes).toHaveLength(2)
    // Et le fichier publié non plus ne contient rien de tout cela
    const fichier = await ecrireFilm(film)
    const relu = await lireFilm(fichier)
    expect(JSON.stringify(relu)).not.toContain('Lucas')
    expect(relu).toEqual(film)
  })

  it("une page qu'on ne publie pas n'y est pas", async () => {
    const { t, page } = await nouveauTableau()
    const autre = t.ajouterPage('blanc', 1); await attendre(1000)
    t.poser(page, trait(0, 0)); await attendre(1000)
    t.pageVue = autre
    t.poser(autre, formule('\\text{Appel : Inès absente}')); await attendre(1000)
    t.pageVue = page
    t.poser(page, trait(9, 9)); await attendre(1000)
    const film = t.film.toArray()
    const r = exporter(t, { de: 0, a: film.length - 1, pages: [page], titre: 'x' })
    expect(JSON.stringify(r)).not.toContain('Inès')
    expect(r.ordre).toEqual([page])
  })

  it('les images : seulement celles qui servent', async () => {
    const { t, page } = await nouveauTableau()
    const images = t.doc.getMap('images')
    images.set('img-servie', 'data:image/png;base64,AAAA')
    images.set('img-autre', 'data:image/png;base64,SECRET')
    t.poser(page, { id: 'I1', type: 'image', x: 0, y: 0, z: 1, auteur: 'a', src: 'img-servie', l: 10, h: 10, m: [1, 0, 0, 1] })
    await attendre(1000)
    const film = t.film.toArray()
    const r = exporter(t, { de: 0, a: film.length - 1, pages: [page], titre: 'x' })
    expect(Object.keys(r.images)).toEqual(['img-servie'])
    expect(JSON.stringify(r)).not.toContain('SECRET')
  })
})

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

describe('la lecture rapide dit la même chose que la reconstruction', () => {
  it('à chaque étape, sur chaque page', async () => {
    const { t, pages } = await seanceAuHasard(220, 7)
    const film = t.film.toArray()
    for (let i = 0; i < film.length; i += 3) {
      for (const p of pages) {
        const vite = t.pageA(film[i], p), lent = t.pageReconstruite(film[i], p)
        expect(vite).toEqual(lent)
      }
    }
  })
})

describe('la bobine rejoue fidèlement', () => {
  it("l'image k est l'état du tableau après le k-ième geste", async () => {
    const { t, pages } = await seanceAuHasard(300, 42)
    const film = t.film.toArray()
    const de = 5
    const { film: r, sources } = exporterDetaille(t, { de, a: film.length - 1, pages, titre: 'x' })
    const b = new Bobine(await lireFilm(await ecrireFilm(r)))
    const ids = (formes: Forme[]) => formes.map(f => f.id + ':' + Math.round(f.x)).sort().join(',')
    // Au départ : l'état juste avant le premier geste de la séance
    for (const p of pages) expect(ids(b.image(0, p).formes)).toBe(ids(t.pageA(film[de - 1], p)?.formes ?? []))
    for (let k = 1; k < b.n; k++) {
      for (const p of pages) expect(ids(b.image(k, p).formes)).toBe(ids(t.pageA(film[sources[k - 1]], p)?.formes ?? []))
    }
    // L'état final de chaque page est exact
    for (const p of pages) {
      const fin = t.pageA(film[film.length - 1], p)!
      expect(ids(b.image(b.n - 1, p).formes)).toBe(ids(fin.formes))
      expect(b.image(b.n - 1, p).fond).toBe(fin.fond)
    }
  })

  it('sauter partout est rapide, même sur une longue séance', async () => {
    const { t, pages } = await seanceAuHasard(900, 3)
    const film = t.film.toArray()
    const t0 = performance.now()
    const r = exporter(t, { de: 0, a: film.length - 1, pages, titre: 'x' })
    const exporte = performance.now() - t0
    const b = new Bobine(r)
    const t1 = performance.now()
    for (let k = 0; k < 200; k++) b.image(Math.floor((k * 7919) % b.n))
    const saut = (performance.now() - t1) / 200
    expect(exporte).toBeLessThan(5000)
    expect(saut).toBeLessThan(15)
    const poids = (await ecrireFilm(r)).length
    expect(poids).toBeLessThan(400_000)
  })

  it('le temps et les chapitres', async () => {
    const { t, page } = await nouveauTableau()
    const autre = t.ajouterPage('blanc', 1); await attendre(500)
    t.poser(page, trait(0, 0)); await attendre(10_000)        // une longue explication
    t.poser(page, trait(1, 1)); await attendre(100)
    t.pageVue = autre
    t.poser(autre, trait(2, 2)); await attendre(800)
    const film = t.film.toArray()
    const r = exporter(t, { de: 2, a: film.length - 1, pages: [page, autre], titre: 'x' })   // après la création des deux pages
    const b = new Bobine(r)
    expect(b.n).toBe(4)
    expect(b.delai(2)).toBe(PLAFOND)                       // l'attente est bornée
    expect(b.chapitres.map(c => c.titre)).toEqual(['Page 1', 'Page 2'])
    expect(b.chapitres[1].i).toBe(3)
    expect(b.finDuChapitre(0)).toBe(2)
  })
})

describe('un fichier qui n’est pas une séance', () => {
  it('est refusé avec une phrase claire', async () => {
    await expect(lireFilm('pas du json')).rejects.toBeInstanceOf(ErreurFilm)
    await expect(lireFilm('{"format":"autre"}')).rejects.toBeInstanceOf(ErreurFilm)
    await expect(lireFilm('{"format":"mem-revoir","v":99}')).rejects.toThrow(/plus récente/)
    await expect(lireFilm('{"format":"mem-revoir","v":1,"gz":"@@@"}')).rejects.toThrow(/abîmé/)
  })
})

describe('ce que la relecture a trouvé', () => {
  it('tableau neuf : les gestes sont notés sur sa première page', async () => {
    const t = new Tableau(null)
    // Comme l'application : quand la page vue disparaît ou manque, elle va sur la première
    t.ordre.observe(() => { if (!t.ordre.toArray().includes(t.pageVue)) t.pageVue = t.ordre.get(0) })
    const page = t.ajouterPage('carreaux', 0)
    expect(t.pageVue).toBe(page)
    await attendre(1000)
    t.poser(page, trait(10, 10)); await attendre(1000)
    expect(t.film.toArray().every(e => e.page === page)).toBe(true)
  })

  it("« Nouvelle page » au début du cours : l'ancienne page (la classe d'avant) ne part pas", async () => {
    const { t, page } = await nouveauTableau()
    t.poser(page, formule('\\text{Groupe 1 : Lucas, Emma}')); await attendre(50 * MINUTE)
    // Le professeur est encore sur la page 1 quand il en crée une neuve
    const neuve = t.ajouterPage('carreaux', 1); await attendre(500)
    t.pageVue = neuve
    t.poser(neuve, trait(0, 0)); await attendre(1000)
    const s = seancesDuFilm(t.film.toArray())[0]
    expect(s.pages).toEqual([neuve])                                   // la création est notée sur la page neuve
    // Même si on coche les deux pages, seule celle de la séance part
    const r = exporter(t, { de: s.de, a: s.a, pages: [page, neuve], titre: 'x' })
    expect(JSON.stringify(r)).not.toContain('Lucas')
    expect(r.ordre).toEqual([neuve])
    expect(pagesDeLaSeance(t, s)).toEqual([neuve])
  })

  it("« Effacer la page » en premier geste : ce qu'on efface ne part pas", async () => {
    const { t, page } = await nouveauTableau()
    const absents = formule('\\text{Absents : Noah}')
    t.poser(page, absents); await attendre(1000)
    t.poser(page, trait(5, 5)); await attendre(16 * 60 * MINUTE)       // le lendemain matin
    t.supprimer(page, t.formesDe(page)!.keys()); await attendre(2000)
    t.poser(page, trait(9, 9)); await attendre(1000)
    const s = seancesDuFilm(t.film.toArray())[0]
    const r = exporter(t, { de: s.de, a: s.a, pages: s.pages, titre: 'x' })
    expect(JSON.stringify(r)).not.toContain('Noah')
    expect(r.pages[0].formes).toHaveLength(0)
    expect(r.etapes).toHaveLength(1)
    expect(r.etapes[0].dt).toBe(0)                                      // le silence d'avant ne compte pas
  })

  it("une page jetée : le replay revient sur la page qu'on regarde, sans montrer de page vide", async () => {
    const { t, page } = await nouveauTableau()
    t.poser(page, trait(0, 0)); await attendre(1000)
    const brouillon = t.ajouterPage('blanc', 1); t.pageVue = brouillon; await attendre(500)
    t.poser(brouillon, trait(1, 1)); await attendre(1000)
    t.pageVue = page
    t.supprimerPage(brouillon); await attendre(1000)
    const film = t.film.toArray()
    const b = new Bobine(exporter(t, { de: 1, a: film.length - 1, pages: [page, brouillon], titre: 'x' }))
    expect(b.page(b.n - 1)).toBe(page)
    expect(b.image(b.n - 1).formes).toHaveLength(1)
    expect(b.film.etapes.every(e => !(e.o.length === 1 && e.o[0][0] === 'x'))).toBe(true)
  })

  it('deux classes séparées par 5 minutes : un découpage plus fin les sépare', async () => {
    const { t, page } = await nouveauTableau()
    t.poser(page, trait(0, 0)); await attendre(1000)
    t.poser(page, trait(1, 0)); await attendre(6 * MINUTE)            // l'intercours
    t.poser(page, trait(2, 0)); await attendre(1000)
    expect(seancesDuFilm(t.film.toArray()).length).toBe(1)
    expect(seancesDuFilm(t.film.toArray(), 5 * MINUTE).map(s => s.gestes)).toEqual([1, 3])
  })
})
