// Le mode nuit d'une page : ses couleurs d'affichage, le champ « nuit » de
// la page (facultatif, absent de jour), la bascule notée dans le film, et le
// replay des élèves qui montre la page de nuit au même moment qu'en classe,
// quand un lecteur d'avant (sans cinquième valeur à l'opération 'f') la voit
// toujours de jour.
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { Tableau } from '../src/document'
import type { Formule, Polygone, Trait } from '../src/types'
import { exporter } from '../src/revoir/exporter'
import { Bobine } from '../src/revoir/bobine'
import { ecrireFilm, lireFilm } from '../src/revoir/format'
import { JournalPages } from '../src/pages/journal'
import * as actions from '../src/pages/actions'
import { formeDeNuit, formulesDeNuit, luminositeDeNuit, nocturne } from '../src/nuit'
import { COULEURS } from '../src/app'

let horloge = new Date('2026-10-08T08:00:00').getTime()
let numero = 0
beforeEach(() => { vi.useFakeTimers({ toFake: ['Date'] }); vi.setSystemTime(horloge) })
afterEach(() => vi.useRealTimers())
async function attendre(ms: number) { horloge += ms; vi.setSystemTime(horloge); await Promise.resolve(); await Promise.resolve() }

function trait(x: number, couleur = '#1b2230'): Trait {
  return { id: 'T' + numero++, type: 'trait', x, y: 0, z: numero, auteur: 'a', pts: [0, 0, 0.5, 10, 4, 0.5, 20, 2, 0.5], couleur, taille: 3, opacite: 1, pression: false }
}

/** La luminosité (0 à 1) d'une couleur #rrggbb */
function luminosite(c: string): number {
  const v = [1, 3, 5].map(i => parseInt(c.slice(i, i + 2), 16) / 255)
  return (Math.max(...v) + Math.min(...v)) / 2
}

describe('les couleurs de nuit', () => {
  it("l'encre sombre s'éclaircit, le blanc devient le noir du papier, le milieu ne change pas", () => {
    const noir = COULEURS.find(c => c.nom === 'Noir')!.valeur
    expect(luminosite(nocturne(noir))).toBeGreaterThan(0.9)
    expect(luminosite(nocturne('#000000'))).toBeGreaterThan(0.9)
    expect(luminosite(nocturne('#ffffff'))).toBeLessThan(0.1)
    expect(luminosite(nocturne('#fff'))).toBeLessThan(0.1)
    // Le bleu et le vert de la palette : plus clairs, de la même teinte
    for (const nom of ['Bleu', 'Vert']) {
      const c = COULEURS.find(x => x.nom === nom)!.valeur
      expect(luminosite(nocturne(c))).toBeGreaterThan(luminosite(c) + 0.1)
    }
    // Le jaune du surligneur (au milieu) ne bouge pas
    expect(luminositeDeNuit(0.68)).toBe(0.68)
    expect(nocturne('#ffe45c')).toBe('#ffe45c')
    // L'opacité est gardée ; une couleur qu'on ne sait pas lire reste telle
    expect(nocturne('rgba(27, 34, 48, 0.5)')).toMatch(/^rgba\(\d+, \d+, \d+, 0\.5\)$/)
    expect(nocturne('transparent')).toBe('transparent')
  })

  it("une forme de nuit est une copie (l'original ne change pas), gardée d'une peinture à l'autre", () => {
    const p: Polygone = { id: 'p', type: 'polygone', x: 0, y: 0, z: 1, auteur: 'a', pts: [0, 0, 10, 0, 0, 10], ferme: true, couleur: '#1b2230', taille: 2,
      fond: '#ffffff', stylePoints: [{ couleur: '#1f5fbf' }, null], styleNoms: [{ couleur: '#1b2230' }] }
    const n = formeDeNuit(p)
    expect(n).not.toBe(p)
    expect(p.couleur).toBe('#1b2230')
    expect(n.couleur).toBe(nocturne('#1b2230'))
    expect(n.fond).toBe(nocturne('#ffffff'))
    expect(n.stylePoints?.[0]?.couleur).toBe(nocturne('#1f5fbf'))
    expect(n.stylePoints?.[1]).toBeNull()
    expect(n.styleNoms?.[0]?.couleur).toBe(nocturne('#1b2230'))
    expect(formeDeNuit(p)).toBe(n)
    const t: Formule = { id: 'x', type: 'formule', x: 0, y: 0, z: 2, auteur: 'a', latex: 'x', couleur: '#1b2230', taille: 28,
      texte: [{ morceaux: [{ t: 'a' }, { t: 'b', c: '#1f5fbf' }] }] }
    const tn = formeDeNuit(t)
    expect(tn.texte?.[0].morceaux[1].c).toBe(nocturne('#1f5fbf'))
    expect(t.texte?.[0].morceaux[1].c).toBe('#1f5fbf')
    // Hors de l'écran : seules les formules changent (le rendu fait le reste)
    const tr = trait(0)
    expect(formulesDeNuit([tr, t])).toEqual([tr, tn])
  })
})

describe('le mode nuit d’une page', () => {
  it('se garde dans la page, se copie avec elle, et une page neuve est de jour', async () => {
    const t = new Tableau(null)
    const p = t.ajouterPage('carreaux', 0); t.pageVue = p
    await attendre(1000)
    expect(t.nuitDe(p)).toBe(false)
    expect(t.pages.get(p)!.has('nuit')).toBe(false)
    t.changerNuit(p, true); await attendre(1000)
    expect(t.nuitDe(p)).toBe(true)
    const q = t.dupliquerPage(p)!; await attendre(1000)
    expect(t.nuitDe(q)).toBe(true)
    const r = t.ajouterPage('blanc', 2); await attendre(1000)
    expect(t.nuitDe(r)).toBe(false)
    t.changerNuit(p, false); await attendre(1000)
    expect(t.nuitDe(p)).toBe(false)
    // Lu à une étape du film : de nuit, puis de jour
    const film = t.film.toArray()
    const etats = film.map(e => t.pageA(e, p)?.nuit ?? false)
    expect(etats).toContain(true)
    expect(etats[etats.length - 1]).toBe(false)
  })

  it('la trieuse le change, et son Annuler le défait', async () => {
    const t = new Tableau(null)
    const p = t.ajouterPage('blanc', 0); t.pageVue = p
    await attendre(1000)
    const j = new JournalPages(t)
    expect(actions.changerNuit(t, j, p, true)).not.toBeNull()
    await attendre(500)
    expect(t.nuitDe(p)).toBe(true)
    expect(actions.changerNuit(t, j, p, true)).toBeNull()
    expect(j.annuler()).toBe('fait'); await attendre(500)
    expect(t.nuitDe(p)).toBe(false)
  })
})

describe('le replay des élèves', () => {
  it('montre la page de nuit à partir du moment où elle y passe', async () => {
    const t = new Tableau(null)
    const p = t.ajouterPage('carreaux', 0); t.pageVue = p
    await attendre(1000)
    t.poser(p, trait(0)); await attendre(2000)
    t.changerNuit(p, true); await attendre(2000)
    t.poser(p, trait(30)); await attendre(2000)
    const film = exporter(t, { de: 0, a: t.film.length - 1, pages: [p], titre: 'Séance' })
    // La bascule : l'opération du fond, avec sa cinquième valeur
    const bascule = film.etapes.find(e => e.o.some(o => o[0] === 'f' && o.length === 5))
    expect(bascule?.o).toEqual([['f', 'carreaux', 0, 0, 1]])
    const relu = await lireFilm(await ecrireFilm(film))
    const b = new Bobine(relu)
    expect(b.image(0, p).nuit).toBe(false)
    expect(b.image(1, p).nuit).toBe(false)
    expect(b.image(b.n - 1, p).nuit).toBe(true)
    // Repasser de jour se voit aussi (cinquième valeur 0)
    t.changerNuit(p, false); await attendre(2000)
    t.poser(p, trait(60)); await attendre(2000)
    const film2 = exporter(t, { de: 0, a: t.film.length - 1, pages: [p], titre: 'Séance' })
    expect(film2.etapes.some(e => e.o.some(o => o[0] === 'f' && o[4] === 0))).toBe(true)
    expect(new Bobine(film2).image(film2.etapes.length, p).nuit).toBe(false)
  })

  it('une page de nuit dès le départ part de nuit ; une page de jour s’écrit comme avant', async () => {
    const t = new Tableau(null)
    const p = t.ajouterPage('blanc', 0); t.pageVue = p
    const q = t.ajouterPage('blanc', 1)
    await attendre(1000)
    t.changerNuit(p, true); await attendre(1000)
    t.poser(p, trait(0)); await attendre(2000)
    t.pageVue = q
    t.poser(q, trait(0)); await attendre(2000)
    const fin = t.film.length - 1
    const film = exporter(t, { de: fin - 1, a: fin, pages: [p, q], titre: 'Séance' })
    expect(film.pages.find(x => x.id === p)?.nuit).toBe(true)
    expect(film.pages.find(x => x.id === q)).not.toHaveProperty('nuit')
    expect(JSON.stringify(film.etapes)).not.toMatch(/"f",[^\]]*,[01]\]/)
    const b = new Bobine(film)
    expect(b.image(0, p).nuit).toBe(true)
    expect(b.image(0, q).nuit).toBe(false)
  })
})
