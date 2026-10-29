// Les séances explicites (lot 6) : le rangement des pages par séance, la
// migration des classeurs d'avant, la séance neuve, la reprise d'une page
// d'une séance passée (et son annulation), la garde des séances passées, et
// ce que Publier et la revue en lisent.
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import * as Y from 'yjs'
import { Tableau } from '../src/document'
import type { Trait } from '../src/types'
import { dateCourte, deLaSeance, libelleSeance, migration, nomDeSeance, quandDit, rangerLesPages } from '../src/seances'
import { exporter, pagesAPublier, seancesAPublier, seancesDuFilm, seancesDuTableau } from '../src/revoir/exporter'
import { deNiveau, enNiveau, texteNouvelleSeance } from '../src/seances-vue'

let horloge = new Date('2026-10-13T08:00:00').getTime()
let numero = 0
beforeEach(() => { vi.useFakeTimers({ toFake: ['Date'] }); vi.setSystemTime(horloge) })
afterEach(() => vi.useRealTimers())

async function attendre(ms: number) { horloge += ms; vi.setSystemTime(horloge); await Promise.resolve(); await Promise.resolve() }
function trait(x: number, y: number, id = 'T' + numero++): Trait {
  return { id, type: 'trait', x, y, z: numero++, auteur: 'moi', pts: [0, 0, 0.5, 40, 5, 0.5, 80, 0, 0.5], couleur: '#1b2230', taille: 3, opacite: 1, pression: false }
}
async function geste(t: Tableau, page: string, x = 0, id?: string) {
  t.pageVue = page
  t.nouveauGeste(); t.poser(page, trait(x, 0, id))
  await attendre(800)
}

describe('rangerLesPages', () => {
  const seances = new Map([['b', { debut: 20 }], ['a', { debut: 10 }]])
  it('range par séance, dans l\'ordre du document, les séances de la plus ancienne à la plus récente', () => {
    const de = new Map([['p1', 'a'], ['p2', 'b'], ['p3', 'a'], ['p4', 'b']])
    const r = rangerLesPages(['p1', 'p2', 'p3', 'p4'], seances, p => de.get(p))
    expect(r.map(s => s.id)).toEqual(['a', 'b'])
    expect(r[0].pages).toEqual(['p1', 'p3'])
    expect(r[1].pages).toEqual(['p2', 'p4'])
  })
  it('une page sans séance suit la page d\'avant, sinon la suivante, sinon la dernière séance', () => {
    const de = new Map([['p2', 'a'], ['p4', 'b']])
    const r = rangerLesPages(['p1', 'p2', 'p3', 'p4', 'p5'], seances, p => de.get(p))
    expect(r[0].pages).toEqual(['p1', 'p2', 'p3'])
    expect(r[1].pages).toEqual(['p4', 'p5'])
    const seul = rangerLesPages(['x', 'y'], seances, () => undefined)
    expect(seul[1].pages).toEqual(['x', 'y'])
    expect(seul[0].pages).toEqual([])
  })
  it('une fiche abîmée est ignorée ; sans séance, rien', () => {
    expect(rangerLesPages(['p'], new Map([['z', { debut: 'x' }]]), () => 'z')).toEqual([])
    expect(rangerLesPages(['p'], [], () => undefined)).toEqual([])
  })
})

describe('les mots', () => {
  it('dit les dates comme les maquettes', () => {
    const lundi8 = new Date('2026-10-13T08:00:00').getTime()
    const mardi14 = new Date('2026-10-14T14:00:00').getTime()
    expect(dateCourte(mardi14)).toBe('mer 14 oct 14h'.replace('mer', new Date(mardi14).getDay() === 2 ? 'mar' : 'mer'))
    expect(libelleSeance({ debut: lundi8, nom: null })).toMatch(/^Séance du \w+ 13 oct 8h$/)
    expect(libelleSeance({ debut: lundi8, nom: 'Activité d\'intro' })).toBe('Activité d\'intro')
    expect(quandDit(mardi14, mardi14 + 3600_000)).toBe('14 h')
    expect(deLaSeance({ debut: lundi8, nom: null }, mardi14)).toMatch(/^de \w+$/)
    expect(deLaSeance({ debut: lundi8, nom: null }, mardi14, true)).toMatch(/^de \w+ 8 h$/)
    expect(deLaSeance({ debut: lundi8, nom: null }, lundi8 + 30 * 24 * 3600_000)).toBe('du 13 octobre')
    expect(nomDeSeance('  Intro \n  fractions ')).toBe('Intro fractions')
    expect(nomDeSeance('   ')).toBeNull()
  })
})

describe('la migration', () => {
  it('une page va dans la séance où elle est née', () => {
    const film = [
      { t: 0, page: 'p1', naissance: true }, { t: 10, page: 'p1' },
      { t: 2_000_000, page: 'p2', naissance: true }, { t: 2_000_100, page: 'p2' }, { t: 2_000_200, page: 'p1' },
    ]
    const m = migration(film, seancesDuFilm(film as never), ['p1', 'p2', 'p3'], 99)
    expect(m.seances.map(([id]) => id)).toEqual(['ancienne-10', 'ancienne-2000100'])
    expect(m.seances[1][1]).toEqual({ debut: 2_000_100, depuis: 2_000_000, ancienne: true })
    expect(new Map(m.seanceDe)).toEqual(new Map([['p1', 'ancienne-10'], ['p2', 'ancienne-2000100']]))
  })
  it('une séance où aucune page n\'est née (on a continué la veille) ne devient pas une séance', () => {
    const film = [{ t: 0, page: 'p1', naissance: true }, { t: 10, page: 'p1' }, { t: 9_000_000, page: 'p1' }]
    const m = migration(film, seancesDuFilm(film as never), ['p1'], 99)
    expect(m.seances.map(([id]) => id)).toEqual(['ancienne-10'])
  })
  it('sans geste, une seule séance', () => {
    const m = migration([{ t: 5, page: 'p' }], [], ['p'], 99)
    expect(m.seances).toEqual([['ancienne-5', { debut: 5, ancienne: true }]])
    expect(m.seanceDe).toEqual([['p', 'ancienne-5']])
  })
  it('sur un tableau : une fois, rien ne se perd, et rien n\'entre au film', async () => {
    const t = new Tableau(null)
    const p1 = t.ajouterPage('blanc', 0); await attendre(100)
    await geste(t, p1, 0); await geste(t, p1, 10)
    await attendre(3 * 3600_000)
    const p2 = t.ajouterPage('blanc', 1); t.pageVue = p2; await attendre(100)
    await geste(t, p2, 0)
    const p3 = t.ajouterPage('blanc', 2); t.pageVue = p3; await attendre(100)
    await geste(t, p3, 0)
    t.jeterPage(p3, p2); await attendre(100)
    const film = t.film.length
    expect(t.migrerSeances()).toBe(true)
    await attendre(10)
    expect(t.film.length).toBe(film)
    expect(t.migrerSeances()).toBe(false)
    const l = t.seancesDuClasseur()
    expect(l.map(s => s.pages)).toEqual([[p1], [p2]])
    expect(t.seanceDe(p3)?.id).toBe(l[1].id)
    // L'ordre du document n'a pas changé
    expect(t.ordre.toArray()).toEqual([p1, p2])
    expect(t.seancesDuClasseur().every(s => s.ancienne)).toBe(true)
  })
})

/** Lundi : deux pages écrites ; mardi, une séance neuve */
async function deuxSeances() {
  const t = new Tableau(null)
  const p1 = t.ajouterPage('blanc', 0); await attendre(100)
  t.migrerSeances()
  const lundi = t.derniereSeance()!.id
  await geste(t, p1, 0, 'L1')
  const p2 = t.ajouterPage('carreaux', 1); t.pageVue = p2; await attendre(100)
  t.renommerPage(p2, 'Exercice 3')
  await geste(t, p2, 0, 'L2'); await geste(t, p2, 10, 'L3')
  await attendre(30 * 3600_000)
  const { seance: mardi, page: m1 } = t.nouvelleSeance()
  t.pageVue = m1
  await attendre(100)
  return { t, p1, p2, lundi, mardi, m1 }
}

describe('la séance neuve', () => {
  it('a sa page 1, blanche, au bout de l\'ordre ; les pages ajoutées sont à elle', async () => {
    const { t, p1, p2, lundi, mardi, m1 } = await deuxSeances()
    expect(t.derniereSeance()!.id).toBe(mardi)
    expect(t.pagesDeLaSeance(mardi)).toEqual([m1])
    expect(t.fondDe(m1)).toBe('blanc')
    expect(t.ordre.toArray()).toEqual([p1, p2, m1])
    const m2 = t.ajouterPage('blanc', 3); await attendre(100)
    expect(t.pagesDeLaSeance(mardi)).toEqual([m1, m2])
    expect(t.pagesDeLaSeance(lundi)).toEqual([p1, p2])
    // Une copie (la trieuse) va aussi dans la séance du jour
    const c = t.dupliquerPage(m2)!
    expect(t.seanceDe(c)?.id).toBe(mardi)
  })
  it('se nomme, et perd son nom', async () => {
    const { t, mardi } = await deuxSeances()
    expect(t.renommerSeance(mardi, ' Activité  d\'intro ')).toBe(true)
    expect(t.derniereSeance()!.nom).toBe('Activité d\'intro')
    expect(t.renommerSeance(mardi, 'Activité d\'intro')).toBe(false)
    expect(t.renommerSeance(mardi, '')).toBe(true)
    expect(t.derniereSeance()!.nom).toBeNull()
  })
  it('la dernière activité, la page où l\'on a écrit en dernier, une séance vierge', async () => {
    const { t, p2, lundi, mardi } = await deuxSeances()
    expect(t.derniereEcriteDe(lundi)).toBe(p2)
    expect(t.derniereActivite(lundi)).toBeLessThan(Date.now() - 29 * 3600_000)
    expect(t.seanceVierge(mardi)).toBe(true)
    expect(t.seanceVierge(lundi)).toBe(false)
    t.recommencerSeance(mardi, Date.now() + 5)
    expect(t.derniereSeance()!.debut).toBe(Date.now() + 5)
  })
})

describe('reprendre une page', () => {
  it('la copie remplace la page 1 vide, garde le nom, hérite le passé ; Ctrl+Z la retire et rend la page 1', async () => {
    const { t, p1, p2, mardi, m1 } = await deuxSeances()
    const q = t.reprendrePage(p2, { seance: mardi, apres: m1, remplace: m1 })!
    await attendre(100)
    expect(t.pagesDeLaSeance(mardi)).toEqual([q])
    expect(t.nomDe(q)).toBe('Exercice 3')
    expect(t.herite(q)).toBe(p2)
    expect(t.fondDe(q)).toBe('carreaux')
    expect([...t.formesDe(q)!.keys()].sort()).toEqual(['L2', 'L3'])
    expect(t.ordre.toArray()).toEqual([p1, p2, q])
    // La page 1 vide n'est pas dans la corbeille
    expect(t.dansLaCorbeille(m1)).toBe(false)
    expect(t.peutAnnuler(q)).toBe(true)
    const r = t.annuler(q)
    expect(r).toEqual({ reprise: q, retour: m1 })
    expect(t.pagesDeLaSeance(mardi)).toEqual([m1])
    expect(t.ordre.toArray()).toEqual([p1, p2, m1])
    expect(t.dansLaCorbeille(q)).toBe(false)
    // Lundi n'a pas changé
    expect([...t.formesDe(p2)!.keys()].sort()).toEqual(['L2', 'L3'])
  })
  it('sur une page 1 écrite, la copie va après la page courante ; écrite, elle ne se retire plus', async () => {
    const { t, p2, mardi, m1 } = await deuxSeances()
    await geste(t, m1, 0, 'M1')
    const q = t.reprendrePage(p2, { seance: mardi, apres: m1, remplace: m1 })!
    await attendre(100)
    expect(t.pagesDeLaSeance(mardi)).toEqual([m1, q])
    expect(t.retraitDeCopie(q)).toBe('oui')
    await geste(t, q, 50, 'M2')
    expect(t.retraitDeCopie(q)).toBe('ecrit')
    expect(t.retirerReprise(q)).toBeNull()
  })
  it('le replay de la séance du jour part de la page telle qu\'à la fin de lundi, puis montre les ajouts', async () => {
    const { t, p2, mardi, m1 } = await deuxSeances()
    const q = t.reprendrePage(p2, { seance: mardi, apres: m1, remplace: m1 })!
    t.pageVue = q
    await attendre(100)
    await geste(t, q, 50, 'M2')
    const s = seancesDuTableau(t)![0]
    expect(s.id).toBe(mardi)
    const pages = pagesAPublier(t, s)
    expect(pages).toEqual([q])
    const f = exporter(t, { de: s.de, a: s.a, pages, titre: '' }, { instruments: false })
    const depart = f.pages.find(p => p.id === q)!
    expect(depart.formes.map(x => x.id).sort()).toEqual(['L2', 'L3'])
    expect(f.etapes).toHaveLength(1)
    expect(f.etapes[0].o.map(o => o[0] === '=' ? o[1].id : '')).toEqual(['M2'])
    // Publier propose mardi d'abord, puis lundi
    expect(seancesAPublier(t).map(x => (x as { id: string }).id)).toEqual([mardi, t.seancesDuClasseur()[0].id])
  })
})

describe('la garde des séances passées', () => {
  it('rien ne s\'écrit sur une page de lundi, et le geste se refait sur la copie', async () => {
    const { t, p2, mardi, m1 } = await deuxSeances()
    const refus: ((p: string) => void)[] = []
    t.garde = (page, refaire) => {
      if (t.seanceDe(page)?.id === t.derniereSeance()?.id) return true
      refus.push(refaire); return false
    }
    const avant = Y.encodeStateVector(t.doc)
    t.poser(p2, trait(0, 0, 'X'))
    t.modifier(p2, [{ id: 'L2', patch: { couleur: '#ff0000' } as never }])
    t.supprimer(p2, ['L3'])
    t.changerFond(p2, 'seyes')
    expect(Y.encodeStateVector(t.doc)).toEqual(avant)
    expect(refus).toHaveLength(4)
    const q = t.reprendrePage(p2, { seance: mardi, apres: m1, remplace: m1 })!
    for (const r of refus) r(q)
    expect([...t.formesDe(q)!.keys()].sort()).toEqual(['L2', 'X'])
    expect((t.formesDe(q)!.get('L2') as Trait).couleur).toBe('#ff0000')
    expect(t.fondDe(q)).toBe('seyes')
    expect([...t.formesDe(p2)!.keys()].sort()).toEqual(['L2', 'L3'])
    // Sur la séance du jour, tout s'écrit
    t.poser(q, trait(0, 0, 'Y'))
    expect(t.formesDe(q)!.has('Y')).toBe(true)
  })
  it('envoyer : copier depuis lundi vers aujourd\'hui, oui ; déplacer, non', async () => {
    const { t, p2, m1 } = await deuxSeances()
    t.garde = page => t.seanceDe(page)?.id === t.derniereSeance()?.id
    const f = { ...(t.formesDe(p2)!.get('L2') as Trait), id: 'C' }
    expect(t.envoyer(p2, m1, [f], ['L2'], { deplacer: true })).toBe(false)
    expect(t.formesDe(p2)!.has('L2')).toBe(true)
    expect(t.envoyer(p2, m1, [f], ['L2'], { deplacer: false })).toBe(true)
    expect(t.formesDe(m1)!.has('C')).toBe(true)
  })
})

describe('les séances dans le film', () => {
  it('chaque étape est d\'une séance ; la plus récente d\'abord', async () => {
    const { t, lundi, mardi, m1 } = await deuxSeances()
    await geste(t, m1, 0, 'M1')
    const l = seancesDuTableau(t)!
    expect(l.map(s => s.id)).toEqual([mardi, lundi])
    expect(l[1].de).toBe(0)
    expect(l[0].de).toBe(l[1].a + 1)
    expect(l[0].a).toBe(t.film.length - 1)
    expect(l[1].gestes).toBe(3)
    expect(l[0].gestes).toBe(1)
    expect(l[0].pages).toEqual([m1])
  })
})

describe('dans un fichier', () => {
  it('le document recopié (un .memc) garde les séances ; une version d\'avant voit toutes les pages dans l\'ordre', async () => {
    const { t, p1, p2, mardi, m1 } = await deuxSeances()
    t.renommerSeance(mardi, 'Intro')
    const u = Y.encodeStateAsUpdate(t.doc)
    const t2 = new Tableau(null)
    Y.applyUpdate(t2.doc, u)
    expect(t2.seancesDuClasseur().map(s => [s.nom, s.pages])).toEqual(t.seancesDuClasseur().map(s => [s.nom, s.pages]))
    // Ce que lit une version d'avant le lot 6 : l'ordre, les pages
    const d = new Y.Doc(); Y.applyUpdate(d, u)
    expect(d.getArray('ordre').toArray()).toEqual([p1, p2, m1])
    // Une page ajoutée par une version d'avant (sans séance) suit sa voisine
    d.getArray('ordre').push(['vieille'])
    const t3 = new Tableau(null)
    Y.applyUpdate(t3.doc, Y.encodeStateAsUpdate(d))
    expect(t3.pagesDeLaSeance(mardi)).toEqual([m1, 'vieille'])
  })
})

describe('les séances en attente (un classeur qu\'on ouvre sans rien y changer)', () => {
  it('se voient sans s\'écrire ; le premier changement les écrit telles qu\'on les voyait', async () => {
    const t = new Tableau(null)
    const p1 = t.ajouterPage('blanc', 0); await attendre(100)
    await geste(t, p1, 0)
    await attendre(3 * 3600_000)
    const p2 = t.ajouterPage('blanc', 1); t.pageVue = p2; await attendre(100)
    await geste(t, p2, 0)
    expect(t.seancesDuClasseur()).toEqual([])
    t.seancesActives = true
    const avant = Y.encodeStateVector(t.doc)
    const vues = t.seancesDuClasseur().map(s => [s.id, s.pages])
    expect(vues.map(x => x[1])).toEqual([[p1], [p2]])
    expect(Y.encodeStateVector(t.doc)).toEqual(avant)
    expect(t.seances.size).toBe(0)
    const p3 = t.ajouterPage('blanc', 2); await attendre(100)
    expect(t.seances.size).toBe(2)
    expect(t.seancesDuClasseur().map(s => [s.id, s.pages])).toEqual([vues[0], [vues[1][0], [p2, p3]]])
  })
})

// La fenêtre « Bonjour ! » dit « niveau » (gains rapides du lot 16) : le nom
// du dossier de niveau dans la phrase, avec la même règle que la case
// « Dossier d'un niveau » (ressembleAUneClasse, arbre.ts).
describe('le niveau dans la phrase (seances-vue)', () => {
  it('enNiveau : « en 5ème », « en 2nde », « en 1re spé », « en Tle spé »', () => {
    expect(enNiveau('5ème')).toBe('en 5ème')
    expect(enNiveau('2nde')).toBe('en 2nde')
    expect(enNiveau('1re spé')).toBe('en 1re spé')
    expect(enNiveau('Tle spé')).toBe('en Tle spé')
    expect(enNiveau('  4ème ')).toBe('en 4ème')
    expect(enNiveau('5e B')).toBe('en 5e B')
  })
  it('un nom qui n\'est pas un niveau reste entre guillemets : « dans « Soutien » »', () => {
    expect(enNiveau('Soutien')).toBe('dans « Soutien »')
    expect(enNiveau('Auguste')).toBe('dans « Auguste »')
    expect(enNiveau('3 exercices')).toBe('dans « 3 exercices »')
  })
  it('deNiveau : « de 5ème », « de Tle spé » ; sinon « de « Soutien » »', () => {
    expect(deNiveau('5ème')).toBe('de 5ème')
    expect(deNiveau('Tle spé')).toBe('de Tle spé')
    expect(deNiveau('Soutien')).toBe('de « Soutien »')
  })
  // (lot 17) Le gros bouton quand le classeur ouvert est « Séances isolées »
  it('le gros bouton : « Nouvelle séance en 5ème » ; dans « Séances isolées », « Nouvelle séance isolée en 5ème »', () => {
    expect(texteNouvelleSeance('5ème')).toBe('Nouvelle séance en 5ème')
    expect(texteNouvelleSeance('Soutien')).toBe('Nouvelle séance dans « Soutien »')
    expect(texteNouvelleSeance(null)).toBe('Nouvelle séance')
    expect(texteNouvelleSeance('5ème', true)).toBe('Nouvelle séance isolée en 5ème')
    expect(texteNouvelleSeance('Soutien', true)).toBe('Nouvelle séance isolée dans « Soutien »')
    expect(texteNouvelleSeance(null, true)).toBe('Nouvelle séance isolée')
  })
})
