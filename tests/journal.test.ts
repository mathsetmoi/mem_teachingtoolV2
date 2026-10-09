// Le journal des pages (src/pages/journal.ts), celui de la trieuse : chaque
// action sur les pages (déplacer, renommer, supprimer, insérer, dupliquer,
// changer un fond) s'y inscrit avec l'état des pages avant et après. Annuler
// rend l'état d'avant seulement si le tableau est exactement dans l'état
// d'après ; sinon le journal le dit ('change') et se vide : jamais un
// changement invisible, jamais une page perdue. Une page créée par une action
// défaite ne va pas dans la corbeille (rien à y reprendre). Les actions du
// journal ne sont des gestes nulle part : des étapes seulOrdre, ou aucune
// étape (le fond, lui, se note sur sa page), et aucune pile n'est touchée.
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { Tableau } from '../src/document'
import { JournalPages } from '../src/pages/journal'
import type { Trait } from '../src/types'

let horloge = new Date('2026-10-09T10:00:00').getTime()
let numero = 0

beforeEach(() => { vi.useFakeTimers({ toFake: ['Date'] }); vi.setSystemTime(horloge) })
afterEach(() => vi.useRealTimers())

/** Avance l'horloge, puis laisse le film noter l'étape (il le fait juste après) */
async function attendre(ms = 500) { horloge += ms; vi.setSystemTime(horloge); await Promise.resolve(); await Promise.resolve() }

function trait(x: number, y: number, id = 'T' + numero++): Trait {
  return { id, type: 'trait', x, y, z: numero++, auteur: 'moi', pts: [0, 0, 0.5, 40, 5, 0.5, 80, 0, 0.5], couleur: '#1b2230', taille: 3, opacite: 1, pression: false }
}

/** Un tableau de n pages, un trait sur chacune (posé en son propre geste), en regardant la première */
async function tableau(n: number) {
  const t = new Tableau(null)
  const pages: string[] = []
  for (let i = 0; i < n; i++) { const p = t.ajouterPage('carreaux', i); pages.push(p); t.pageVue = p; await attendre() }
  for (const p of pages) { t.pageVue = p; t.nouveauGeste(); t.poser(p, trait(0, 0)); await attendre(800) }
  t.pageVue = pages[0]
  return { t, pages }
}

/** Les longueurs des piles de ces pages (elles ne doivent jamais bouger) */
const piles = (t: Tableau, pages: string[]) => pages.map(p => [t.annulationDe(p)!.undoStack.length, t.annulationDe(p)!.redoStack.length])
/** Les étapes du film notées depuis l'indice k */
const depuis = (t: Tableau, k: number) => t.film.toArray().slice(k)
const ordre = (t: Tableau) => t.ordre.toArray()

describe('le journal des pages', () => {
  it('déplacer, annuler, rétablir : l\'ordre revient, puis repart ; des étapes seulOrdre, aucune pile touchée', async () => {
    const { t, pages: [a, b, c, d] } = await tableau(4)
    const j = new JournalPages(t)
    const p0 = piles(t, [a, b, c, d]), k = t.film.length
    expect(j.peutAnnuler).toBe(false)
    const e = j.faire('Déplacer', () => { t.deplacerPages([d], 0) })
    expect(e).not.toBeNull()
    expect(ordre(t)).toEqual([d, a, b, c])
    expect(j.peutAnnuler).toBe(true)
    await attendre()
    expect(j.annuler()).toBe('fait'); await attendre()
    expect(ordre(t)).toEqual([a, b, c, d])
    expect(j.peutAnnuler).toBe(false); expect(j.peutRetablir).toBe(true)
    expect(j.retablir()).toBe('fait'); await attendre()
    expect(ordre(t)).toEqual([d, a, b, c])
    expect(j.annuler()).toBe('fait'); await attendre()
    expect(ordre(t)).toEqual([a, b, c, d])
    const etapes = depuis(t, k)
    expect(etapes.length).toBe(4)
    expect(etapes.every(x => x.seulOrdre === true)).toBe(true)
    expect(piles(t, [a, b, c, d])).toEqual(p0)
    // Rien à défaire de plus : 'rien'
    expect(j.annuler()).toBe('rien')
  })

  it('rien n\'a changé : rien n\'entre dans le journal, et ce qu\'on pouvait refaire le reste', async () => {
    const { t, pages: [a, b] } = await tableau(2)
    const j = new JournalPages(t)
    j.faire('Déplacer', () => { t.deplacerPages([b], 0) })
    j.annuler()
    expect(j.faire('Déplacer à sa place', () => { t.deplacerPages([a], 0) })).toBeNull()
    expect(j.faire('Rien', () => {})).toBeNull()
    expect(j.peutAnnuler).toBe(false)
    expect(j.peutRetablir).toBe(true)
  })

  it('un changement fait ailleurs entre l\'action et l\'annulation : \'change\', le journal se vide, rien ne bouge', async () => {
    const { t, pages: [a, b, c] } = await tableau(3)
    const j = new JournalPages(t)
    j.faire('Déplacer', () => { t.deplacerPages([c], 0) })
    j.faire('Renommer', () => { t.renommerPage(a, 'Exercice 12') })
    await attendre()
    // Ailleurs (un autre chemin que la trieuse) : la page b part à la corbeille
    t.pageVue = a
    t.jeterPage(b, a); await attendre()
    const avant = { ordre: ordre(t), noms: t.etatDesPages().noms, film: t.film.length }
    expect(j.annuler()).toBe('change')
    expect(j.peutAnnuler).toBe(false); expect(j.peutRetablir).toBe(false)
    await attendre()
    expect({ ordre: ordre(t), noms: t.etatDesPages().noms, film: t.film.length }).toEqual(avant)
    expect(j.annuler()).toBe('rien')

    // De même pour rétablir : défaire, puis changer un nom ailleurs
    const j2 = new JournalPages(t)
    expect(j2.faire('Déplacer', () => { t.deplacerPages([a], 0) })).not.toBeNull()
    expect(j2.annuler()).toBe('fait')
    t.renommerPage(c, 'Ailleurs')
    expect(j2.retablir()).toBe('change')
    expect(j2.peutRetablir).toBe(false)
  })

  it('une page créée dans l\'action (ajouterPage), annulée : ni dans l\'ordre, ni dans la corbeille ; rétablie, à sa place', async () => {
    const { t, pages: [a, b, c] } = await tableau(3)
    const j = new JournalPages(t)
    const p0 = piles(t, [a, b, c]), k = t.film.length
    let n = ''
    j.faire('Insérer', () => { n = t.ajouterPage('seyes', 1) })
    await attendre()
    expect(ordre(t)).toEqual([a, n, b, c])
    expect(j.annuler()).toBe('fait'); await attendre()
    expect(ordre(t)).toEqual([a, b, c])
    expect(t.dansLaCorbeille(n)).toBe(false)
    expect(t.pagesDeLaCorbeille().map(x => x.id)).not.toContain(n)
    expect(t.corbeille.get(n)?.definitif).toBe(true)
    expect(j.retablir()).toBe('fait'); await attendre()
    expect(ordre(t)).toEqual([a, n, b, c])
    expect(t.corbeille.has(n)).toBe(false)
    expect(t.fondDe(n)).toBe('seyes')
    // Défaite de nouveau, puis refaite : le journal suit
    expect(j.annuler()).toBe('fait')
    expect(ordre(t)).toEqual([a, b, c])
    expect(j.retablir()).toBe('fait')
    expect(ordre(t)).toEqual([a, n, b, c])
    await attendre()
    // La création est la naissance de la page (une étape notée sur elle, pas
    // seulOrdre : ajouterPage pose aussi la page) ; le reste ne change que l'ordre
    const etapes = depuis(t, k)
    expect(etapes[0].page).toBe(n)
    expect(etapes.slice(1).every(x => x.seulOrdre === true)).toBe(true)
    expect(piles(t, [a, b, c])).toEqual(p0)
  })

  it('une copie (dupliquerPage) annulée : retirée sans aller dans la corbeille ; rétablie, juste après l\'original', async () => {
    const { t, pages: [a, b] } = await tableau(2)
    t.renommerPage(a, 'Exercice 3')
    const j = new JournalPages(t)
    const p0 = piles(t, [a, b])
    let q = ''
    j.faire('Dupliquer', () => { q = t.dupliquerPage(a)! })
    await attendre()
    expect(ordre(t)).toEqual([a, q, b])
    expect(t.nomDe(q)).toBe('Exercice 3 (copie)')
    expect(t.annulationDe(q)!.undoStack.length).toBe(0)
    expect(j.annuler()).toBe('fait'); await attendre()
    expect(ordre(t)).toEqual([a, b])
    expect(t.dansLaCorbeille(q)).toBe(false)
    expect(t.pagesDeLaCorbeille().map(x => x.id)).not.toContain(q)
    // Le nom de la copie s'en va avec elle (l'état d'avant ne l'avait pas)
    expect(t.nomDe(q)).toBeNull()
    expect(j.retablir()).toBe('fait'); await attendre()
    expect(ordre(t)).toEqual([a, q, b])
    expect(t.nomDe(q)).toBe('Exercice 3 (copie)')
    expect(t.formesDe(q)!.size).toBe(1)
    expect(piles(t, [a, b])).toEqual(p0)
    expect(t.annulationDe(q)!.undoStack.length).toBe(0)
  })

  it('un fond changé dans l\'action revient, avec une étape notée sur la page (la revue le voit revenir)', async () => {
    const { t, pages: [a, b] } = await tableau(2)
    const j = new JournalPages(t)
    const p0 = piles(t, [a, b])
    t.pageVue = a
    j.faire('Fond', () => { t.changerFond(b, 'repere', { x: 40, y: 80 }) })
    await attendre()
    expect(t.fondDe(b)).toBe('repere')
    const k = t.film.length
    expect(j.annuler()).toBe('fait'); await attendre()
    expect(t.fondDe(b)).toBe('carreaux')
    const etapes = depuis(t, k)
    expect(etapes.length).toBe(1)
    expect(etapes[0].page).toBe(b)
    expect(etapes[0].seulOrdre).toBeUndefined()
    expect(j.retablir()).toBe('fait'); await attendre()
    expect(t.fondDe(b)).toBe('repere')
    expect(t.origineDe(b)).toEqual({ x: 40, y: 80 })
    expect(piles(t, [a, b])).toEqual(p0)
    // Un fond changé ailleurs après l'action : 'change'
    t.changerFond(b, 'blanc'); await attendre()
    expect(j.annuler()).toBe('change')
    expect(t.fondDe(b)).toBe('blanc')
  })

  it('renommer, puis supprimer (jeterPages) : annulés et rétablis, sans étape pour le nom, seulOrdre pour la suppression', async () => {
    const { t, pages: [a, b, c] } = await tableau(3)
    const j = new JournalPages(t)
    const p0 = piles(t, [a, b, c]), k = t.film.length
    j.faire('Renommer', () => { t.renommerPage(b, 'Exercice 12 p. 84') })
    await attendre()
    expect(t.film.length).toBe(k)               // un nom n'est pas une étape
    expect(j.annuler()).toBe('fait'); await attendre()
    expect(t.nomDe(b)).toBeNull()
    expect(t.film.length).toBe(k)
    expect(j.retablir()).toBe('fait')
    expect(t.nomDe(b)).toBe('Exercice 12 p. 84')

    t.pageVue = a
    const e = j.faire('Supprimer', () => { t.jeterPages([b, c]) })!
    await attendre()
    expect(ordre(t)).toEqual([a])
    expect(t.pagesDeLaCorbeille().map(x => x.id).sort()).toEqual([b, c].sort())
    expect(j.annulerSi(e)).toBe('fait'); await attendre()
    expect(ordre(t)).toEqual([a, b, c])
    expect(t.corbeille.has(b) || t.corbeille.has(c)).toBe(false)
    expect(t.nomDe(b)).toBe('Exercice 12 p. 84')
    expect(j.retablir()).toBe('fait'); await attendre()
    expect(ordre(t)).toEqual([a])
    expect(t.dansLaCorbeille(b) && t.dansLaCorbeille(c)).toBe(true)
    const etapes = depuis(t, k)
    expect(etapes.length).toBe(3)
    expect(etapes.every(x => x.seulOrdre === true)).toBe(true)
    expect(piles(t, [a, b, c])).toEqual(p0)
  })

  it('annulerSi d\'une entrée qui n\'est plus la dernière : \'change\', et rien ne bouge', async () => {
    const { t, pages: [a, b, c] } = await tableau(3)
    const j = new JournalPages(t)
    const e1 = j.faire('Déplacer', () => { t.deplacerPages([c], 0) })!
    const e2 = j.faire('Renommer', () => { t.renommerPage(a, 'A') })!
    expect(j.annulerSi(e1)).toBe('change')
    expect(ordre(t)).toEqual([c, a, b])
    expect(t.nomDe(a)).toBe('A')
    // Le journal reste juste : la dernière action se défait encore
    expect(j.annulerSi(e2)).toBe('fait')
    expect(t.nomDe(a)).toBeNull()
    expect(j.annulerSi(e1)).toBe('fait')
    expect(ordre(t)).toEqual([a, b, c])
    // Une entrée déjà défaite : 'change'
    expect(j.annulerSi(e1)).toBe('change')
  })

  it('deux copies, puis une insertion, défaites une à une puis refaites : aucune ne reparaît dans la corbeille', async () => {
    const { t, pages: [a, b] } = await tableau(2)
    const j = new JournalPages(t)
    let qa = '', qb = '', n = ''
    j.faire('Dupliquer a', () => { qa = t.dupliquerPage(a)! })
    j.faire('Dupliquer b', () => { qb = t.dupliquerPage(b)! })
    j.faire('Insérer', () => { n = t.ajouterPage('blanc', 0) })
    await attendre()
    expect(ordre(t)).toEqual([n, a, qa, b, qb])
    // Défaire la plus récente laisse une entrée définitive que les clichés
    // plus anciens ne connaissent pas : les annulations suivantes passent
    expect(j.annuler()).toBe('fait')
    expect(j.annuler()).toBe('fait')
    expect(j.annuler()).toBe('fait')
    expect(ordre(t)).toEqual([a, b])
    for (const p of [qa, qb, n]) expect(t.corbeille.get(p)?.definitif).toBe(true)
    // Les copies ont des formes : sans leur entrée, elles iraient dans la corbeille
    expect(t.pagesDeLaCorbeille()).toEqual([])
    expect(j.retablir()).toBe('fait')
    expect(ordre(t)).toEqual([a, qa, b])
    expect(t.corbeille.get(qb)?.definitif).toBe(true)
    expect(j.retablir()).toBe('fait')
    expect(j.retablir()).toBe('fait')
    expect(ordre(t)).toEqual([n, a, qa, b, qb])
    expect(j.annuler()).toBe('fait')
    expect(t.pagesDeLaCorbeille()).toEqual([])
  })

  it('vider : plus rien à annuler ni à refaire', async () => {
    const { t, pages: [, b] } = await tableau(2)
    const j = new JournalPages(t)
    j.faire('Déplacer', () => { t.deplacerPages([b], 0) })
    j.faire('Renommer', () => { t.renommerPage(b, 'B') })
    j.annuler()
    j.vider()
    expect(j.peutAnnuler).toBe(false); expect(j.peutRetablir).toBe(false)
    expect(j.annuler()).toBe('rien'); expect(j.retablir()).toBe('rien')
  })
})
