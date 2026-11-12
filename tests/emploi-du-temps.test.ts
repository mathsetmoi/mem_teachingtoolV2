// L'emploi du temps : les créneaux relus, les semaines A et B, le créneau du
// moment (« Bonjour ! », la bulle), le chapitre en cours d'une classe, le
// .memb ; puis la lecture d'un fichier de Pronote (.ics) et ses créneaux.
import { describe, expect, it } from 'vitest'
import {
  adopter, avecSemainesAB, classeurDuCreneau, colorier, creneauDeLaBulle, creneauDuMoment, creneauxDuJour, direLaSemaine, etablissementDe,
  heureDite, horaireDit, lireEmploiDuTemps, lireHeure, lundiDe, prochainCreneau, semaineDe, VIDE, type Creneau, type EmploiDuTemps,
} from '../src/emploi-du-temps/donnees'
import { coursDuJour, devinerDossier, enCreneaux, importer, lireCalendrier, lireDate, nettoyer } from '../src/emploi-du-temps/ics'

const ID = (n: number) => n.toString(16).padStart(16, '0')
const cr = (n: number, o: Partial<Creneau> = {}): Creneau => ({ id: ID(n), jour: 1, debut: 605, fin: 660, semaines: 'AB', dossier: 'd2nde3', nom: '', ...o })
/** Lundi 9 novembre 2026 (une semaine A dans ces essais), à l'heure dite */
const lun = (h: number, m = 0) => new Date(2026, 10, 9, h, m).getTime()
const LUNDI_A = new Date(2026, 10, 9).getTime()
const DOSSIERS = [
  { id: 'lfb', nom: 'LFB', parent: null }, { id: 'n2', nom: '2', parent: 'lfb' }, { id: 'd2nde3', nom: '2nde 3', parent: 'n2' },
  { id: 'n1', nom: '1s', parent: 'lfb' }, { id: 'd1spe2', nom: '1re spé 2', parent: 'n1' },
  { id: 'lyfel', nom: 'LyFEL', parent: null }, { id: 'd4b', nom: '4e B', parent: 'lyfel' },
  { id: 'vieux', nom: 'Vieux', parent: null, corbeille: { t: 1 } },
]

describe('l\'emploi du temps relu', () => {
  it('garde ce qui est bien formé, sans doublon, par jour et par heure', () => {
    const e = lireEmploiDuTemps({
      creneaux: [cr(2, { jour: 2 }), cr(1), cr(1), { ...cr(3), fin: 600 }, { ...cr(4), jour: 7 }, { id: 'court', jour: 1, debut: 1, fin: 2 }, null, 'x',
        { ...cr(5), semaines: 'Z', salle: '  B12 ', classeur: 'c1', pronote: 'MATHS - 2NDE3' }],
      couleurs: { LFB: 0, LyFEL: 9, MEM: 2 }, correspondances: { a: 'd1', b: null, c: 3 }, lundiA: LUNDI_A,
    })
    expect(e.creneaux.map(c => c.id)).toEqual([ID(1), ID(5), ID(2)])
    expect(e.creneaux[1]).toMatchObject({ semaines: 'AB', salle: 'B12', classeur: 'c1', pronote: 'MATHS - 2NDE3' })
    expect(e.couleurs).toEqual({ LFB: 0, MEM: 2 })
    expect(e.correspondances).toEqual({ a: 'd1', b: null })
    expect(e.lundiA).toBe(LUNDI_A)
    expect(lireEmploiDuTemps(undefined)).toEqual(VIDE)
  })
  it('les heures : dites, et lues comme on les tape', () => {
    expect(heureDite(605)).toBe('10 h 05')
    expect(heureDite(480)).toBe('8 h')
    expect(horaireDit({ debut: 605, fin: 660 })).toBe('10 h 05 – 11 h 00')
    expect(['10h05', '10 h 05', '10:05', '10.05', ' 10H5 '].map(lireHeure)).toEqual([605, 605, 605, 605, 605])
    expect(lireHeure('8')).toBe(480)
    expect([lireHeure('25h'), lireHeure('10h75'), lireHeure('midi')]).toEqual([null, null, null])
  })
})

describe('les semaines A et B', () => {
  const e = { lundiA: LUNDI_A }
  it('alternent à partir du lundi d\'une semaine A, même d\'un mercredi', () => {
    expect(lundiDe(new Date(2026, 10, 11, 15).getTime())).toBe(LUNDI_A)
    expect(lundiDe(new Date(2026, 10, 15, 23).getTime())).toBe(LUNDI_A)
    expect(semaineDe(e, lun(10))).toBe('A')
    expect(semaineDe(e, new Date(2026, 10, 18).getTime())).toBe('B')
    expect(semaineDe(e, new Date(2026, 10, 23).getTime())).toBe('A')
    expect(semaineDe(e, new Date(2026, 10, 2).getTime())).toBe('B')
    // Par-dessus le changement d'heure de mars
    expect(semaineDe(e, new Date(2027, 3, 5).getTime())).toBe(semaineDe(e, new Date(2027, 2, 22).getTime()))
    // Sans référence : la semaine en cours est A
    expect(semaineDe({}, Date.now())).toBe('A')
  })
  it('« On est en semaine B » : corrige pour toute la suite', () => {
    const f = direLaSemaine({ ...VIDE, lundiA: LUNDI_A }, new Date(2026, 10, 25).getTime(), 'B')
    expect(semaineDe(f, new Date(2026, 10, 25).getTime())).toBe('B')
    expect(semaineDe(f, new Date(2026, 11, 2).getTime())).toBe('A')
    const g = direLaSemaine(f, new Date(2026, 11, 2).getTime(), 'B')
    expect(semaineDe(g, new Date(2026, 11, 2).getTime())).toBe('B')
  })
  it('A et B n\'ont de sens qu\'avec un créneau d\'une seule semaine', () => {
    expect(avecSemainesAB({ ...VIDE, creneaux: [cr(1)] })).toBe(false)
    expect(avecSemainesAB({ ...VIDE, creneaux: [cr(1), cr(2, { semaines: 'B' })] })).toBe(true)
  })
})

describe('le créneau du moment', () => {
  const e: EmploiDuTemps = { ...VIDE, lundiA: LUNDI_A, creneaux: [
    cr(1, { debut: 605, fin: 660 }), cr(2, { debut: 665, fin: 720, dossier: 'd1spe2' }), cr(3, { debut: 845, fin: 960, dossier: 'd4b' }),
    cr(4, { jour: 2, debut: 725, fin: 780, semaines: 'A' }), cr(5, { jour: 2, debut: 725, fin: 780, semaines: 'B', nom: '2nde 3 (groupe 1)' }),
  ] }
  const jour = creneauxDuJour(e, lun(10))
  it('les créneaux du jour, selon la semaine', () => {
    expect(jour.map(c => c.id)).toEqual([ID(1), ID(2), ID(3)])
    expect(creneauxDuJour(e, new Date(2026, 10, 10, 12).getTime()).map(c => c.id)).toEqual([ID(4)])
    expect(creneauxDuJour(e, new Date(2026, 10, 17, 12).getTime()).map(c => c.id)).toEqual([ID(5)])
    expect(creneauxDuJour(e, new Date(2026, 10, 14, 12).getTime())).toEqual([])
  })
  it('10 minutes avant, pendant, et le suivant quand on change de classe', () => {
    expect(creneauDuMoment(jour, lun(9, 50))).toBeNull()
    expect(creneauDuMoment(jour, lun(9, 58))?.id).toBe(ID(1))
    expect(creneauDuMoment(jour, lun(10, 12))?.id).toBe(ID(1))
    expect(creneauDuMoment(jour, lun(10, 58))?.id).toBe(ID(2))
    expect(creneauDuMoment(jour, lun(10, 30))?.id).toBe(ID(1))
    expect(creneauDuMoment(jour, lun(12, 40))).toBeNull()
  })
  it('le prochain cours, et la bulle (5 minutes avant, 10 après le début)', () => {
    expect(prochainCreneau(jour, lun(12, 40))?.id).toBe(ID(3))
    expect(prochainCreneau(jour, lun(15))).toBeNull()
    expect(creneauDeLaBulle(jour, lun(10, 59))).toBeNull()
    expect(creneauDeLaBulle(jour, lun(11, 0))?.id).toBe(ID(2))
    expect(creneauDeLaBulle(jour, lun(11, 14))?.id).toBe(ID(2))
    expect(creneauDeLaBulle(jour, lun(11, 15))).toBeNull()
  })
  it('le lien de Pronote remplace la semaine type de son établissement seulement', () => {
    const lien = { etablissements: new Set(['LFB']), creneaux: [cr(9, { debut: 900, fin: 960, salle: 'C1' })] }
    expect(creneauxDuJour(e, lun(10), DOSSIERS, lien).map(c => c.id)).toEqual([ID(3), ID(9)])
    // Vacances à LFB : aucun cours de LFB, ceux de LyFEL restent
    expect(creneauxDuJour(e, lun(10), DOSSIERS, { etablissements: new Set(['LFB']), creneaux: [] }).map(c => c.id)).toEqual([ID(3)])
  })
})

describe('la classe d\'un créneau', () => {
  it('l\'établissement est le dossier du haut', () => {
    expect(etablissementDe('d2nde3', DOSSIERS)).toBe('LFB')
    expect(etablissementDe('d4b', DOSSIERS)).toBe('LyFEL')
    expect(etablissementDe('lfb', DOSSIERS)).toBe('LFB')
    expect(etablissementDe(null, DOSSIERS)).toBeNull()
  })
  it('chaque établissement a sa couleur, la première libre', () => {
    const e = colorier({ ...VIDE, couleurs: { LFB: 1 } }, ['LFB', 'LyFEL', 'MEM'])
    expect(e.couleurs).toEqual({ LFB: 1, LyFEL: 0, MEM: 2 })
  })
  const f = (id: string, dossier: string, o: object = {}) => ({ id, nom: id, dossier, ouvert: 0, modifie: 0, ...o })
  const isolees = (x: { nom: string }) => x.nom === 'Séances isolées'
  const classeurs = [
    f('probas', 'd2nde3', { listeSeances: [{ debut: 50 }], ouvert: 10 }),
    f('stats', 'd2nde3', { listeSeances: [{ debut: 20 }], ouvert: 90 }),
    f('Séances isolées', 'd2nde3', { listeSeances: [{ debut: 99 }] }),
    f('jete', 'd2nde3', { listeSeances: [{ debut: 200 }], corbeille: { t: 1 } }),
    f('trigo', 'd1spe2', { ouvert: 5 }),
  ]
  it('le chapitre en cours : celui de la dernière séance, hors « Séances isolées »', () => {
    expect(classeurDuCreneau(cr(1), classeurs, DOSSIERS, isolees)?.id).toBe('probas')
    expect(classeurDuCreneau(cr(1, { dossier: 'n2' }), classeurs, DOSSIERS, isolees)?.id).toBe('probas')
    expect(classeurDuCreneau(cr(1, { dossier: 'd1spe2' }), classeurs, DOSSIERS, isolees)?.id).toBe('trigo')
    expect(classeurDuCreneau(cr(1, { dossier: 'd4b' }), classeurs, DOSSIERS, isolees)).toBeNull()
    expect(classeurDuCreneau(cr(1, { dossier: null }), classeurs, DOSSIERS, isolees)).toBeNull()
  })
  it('un classeur choisi, tant qu\'il existe', () => {
    expect(classeurDuCreneau(cr(1, { classeur: 'stats' }), classeurs, DOSSIERS, isolees)?.id).toBe('stats')
    expect(classeurDuCreneau(cr(1, { classeur: 'jete' }), classeurs, DOSSIERS, isolees)?.id).toBe('probas')
  })
  it('le .memb : les dossiers changent d\'id, un classeur absent redevient le chapitre en cours', () => {
    const e = adopter({ ...VIDE, creneaux: [cr(1, { classeur: 'x' }), cr(2, { dossier: 'perdu', classeur: 'y' })], correspondances: { a: 'd2nde3', b: null } },
      new Map([['d2nde3', 'neuf']]), new Set(['y']))
    expect(e.creneaux.map(c => [c.dossier, c.classeur])).toEqual([['neuf', undefined], [null, 'y']])
    expect(e.correspondances).toEqual({ a: 'neuf', b: null })
  })
})

// ---------- Pronote ----------
const ev = (debut: string, fin: string, resume: string, o: { salle?: string; extra?: string } = {}) =>
  ['BEGIN:VEVENT', `DTSTART:${debut}`, `DTEND:${fin}`, `SUMMARY:${resume}`, ...(o.salle ? [`LOCATION:${o.salle}`] : []), ...(o.extra ? [o.extra] : []), 'END:VEVENT'].join('\r\n')
const cal = (...e: string[]) => ['BEGIN:VCALENDAR', 'VERSION:2.0', ...e, 'END:VCALENDAR'].join('\r\n')
/** Un cours de la semaine k (0 : celle du 9 novembre), le jour j (0 : lundi), heures sans fuseau */
const date = (k: number, j: number, h: number, m: number) => {
  const d = new Date(2026, 10, 9 + 7 * k + j, h, m)
  const p = (n: number) => String(n).padStart(2, '0')
  return `${d.getFullYear()}${p(d.getMonth() + 1)}${p(d.getDate())}T${p(h)}${p(m)}00`
}

describe('un fichier de Pronote', () => {
  it('les dates : UTC, avec un fuseau, ou à l\'heure de l\'ordinateur', () => {
    expect(lireDate('20261109T090500Z')).toBe(Date.UTC(2026, 10, 9, 9, 5))
    expect(lireDate('20261109T100500', 'Europe/Paris')).toBe(Date.UTC(2026, 10, 9, 9, 5))
    expect(lireDate('20260709T100500', 'Europe/Paris')).toBe(Date.UTC(2026, 6, 9, 8, 5))
    expect(lireDate('20261109T100500')).toBe(new Date(2026, 10, 9, 10, 5).getTime())
    expect(lireDate('pas une date')).toBeNaN()
  })
  it('les cours : lignes repliées, échappements, cours annulés', () => {
    const l = lireCalendrier(cal(
      ev(date(0, 0, 10, 5), date(0, 0, 11, 0), 'MATHEMATIQUES - 2NDE3', { salle: 'B12' }),
      ['BEGIN:VEVENT', `DTSTART;TZID=Europe/Paris:${date(0, 1, 9, 5)}`, `DTEND;TZID=Europe/Paris:${date(0, 1, 10, 0)}`, 'SUMMARY:MATHEMATIQUES - 1G2 SP', ' E\\, groupe 1', 'END:VEVENT'].join('\r\n'),
      ev(date(0, 2, 8, 0), date(0, 2, 9, 0), 'Cours annulé - MATHEMATIQUES - 2NDE3'),
      ev(date(0, 3, 8, 0), date(0, 3, 9, 0), 'MATHEMATIQUES - 2NDE3', { extra: 'STATUS:CANCELLED' }),
    ))
    expect(l).toHaveLength(4)
    expect(l[0]).toMatchObject({ cours: 'MATHEMATIQUES - 2NDE3', salle: 'B12', annule: false })
    expect(l[1].cours).toBe('MATHEMATIQUES - 1G2 SPE, groupe 1')
    expect(l[2]).toMatchObject({ cours: 'MATHEMATIQUES - 2NDE3', annule: true })
    expect(l[3].annule).toBe(true)
    expect(lireCalendrier('<html>Connexion</html>')).toEqual([])
    expect(nettoyer('[Modifié] MATHS - 2NDE3')).toBe('MATHS - 2NDE3')
  })
  // Deux semaines types sur quatre semaines : la 2nde 3 le lundi (A et B),
  // le mardi en classe entière en A et en groupe en B, une exception
  const fichier = cal(...[0, 1, 2, 3].flatMap(k => [
    ev(date(k, 0, 10, 5), date(k, 0, 11, 0), 'MATHEMATIQUES - 2NDE3', { salle: k === 2 ? 'A01' : 'B12' }),
    ev(date(k, 1, 12, 5), date(k, 1, 13, 0), k % 2 ? 'MATHEMATIQUES - 2NDE3 GR1' : 'MATHEMATIQUES - 2NDE3', { salle: 'A04' }),
  ]), ev(date(1, 4, 15, 0), date(1, 4, 16, 0), 'CONSEIL DE CLASSE - 2NDE3'))
  const cours = lireCalendrier(fichier)
  const lus = enCreneaux(cours, { lundiA: LUNDI_A, depuis: lun(8) })
  it('rangés en créneaux : A et B, la salle la plus fréquente, sans l\'exception', () => {
    expect(lus.map(c => [c.jour, c.debut, c.fin, c.semaines, c.cours, c.salle])).toEqual([
      [1, 605, 660, 'AB', 'MATHEMATIQUES - 2NDE3', 'B12'],
      [2, 725, 780, 'A', 'MATHEMATIQUES - 2NDE3', 'A04'],
      [2, 725, 780, 'B', 'MATHEMATIQUES - 2NDE3 GR1', 'A04'],
    ])
  })
  it('une seule semaine dans le fichier : tout est en A et B', () => {
    const une = enCreneaux(cours.filter(c => c.debut < new Date(2026, 10, 16).getTime()), { depuis: lun(8) })
    expect(une.map(c => c.semaines)).toEqual(['AB', 'AB'])
  })
  it('la classe se devine d\'après le nom, le plus long d\'abord', () => {
    const d = [{ id: '2', nom: '2' }, { id: 'a', nom: '2nde 3' }, { id: 'b', nom: '2nde 3 GR1' }]
    expect(devinerDossier('MATHEMATIQUES - 2NDE3', d)?.id).toBe('a')
    expect(devinerDossier('MATHEMATIQUES - 2NDE3 GR1', d)?.id).toBe('b')
    expect(devinerDossier('MATHEMATIQUES - 1G2', d)).toBeNull()
  })
  it('importer : les créneaux de Pronote de l\'établissement sont remplacés, le reste reste', () => {
    const e: EmploiDuTemps = { ...VIDE, lundiA: LUNDI_A, creneaux: [
      cr(1, { pronote: 'MATHEMATIQUES - 2NDE3', classeur: 'probas', nom: '2nde 3 (B12)' }),
      cr(2, { pronote: 'VIEUX COURS', jour: 5 }),
      cr(3, { jour: 3, dossier: 'd4b' }),
    ] }
    const f = importer(e, lus, { 'MATHEMATIQUES - 2NDE3': 'd2nde3', 'MATHEMATIQUES - 2NDE3 GR1': null }, c => etablissementDe(c.dossier, DOSSIERS) === 'LFB')
    expect(f.creneaux.map(c => [c.jour, c.debut, c.semaines, c.dossier])).toEqual([[1, 605, 'AB', 'd2nde3'], [2, 725, 'A', 'd2nde3'], [3, 605, 'AB', 'd4b']])
    // Le créneau qui existait garde son id, son nom et son classeur choisi
    expect(f.creneaux[0]).toMatchObject({ id: ID(1), nom: '2nde 3 (B12)', classeur: 'probas', salle: 'B12' })
    expect(f.correspondances).toEqual({ 'MATHEMATIQUES - 2NDE3': 'd2nde3', 'MATHEMATIQUES - 2NDE3 GR1': null })
  })
  it('le lien, pour un jour : la salle changée, le cours annulé absent, hors de ce qu\'il couvre : rien', () => {
    const e = importer({ ...VIDE, lundiA: LUNDI_A }, lus, { 'MATHEMATIQUES - 2NDE3': 'd2nde3' }, () => true)
    const couvre = { de: new Date(2026, 10, 9).getTime(), a: new Date(2026, 11, 7).getTime() }
    const lundi3 = new Date(2026, 10, 23, 8).getTime()
    expect(coursDuJour(cours, couvre, lundi3, e)?.map(c => [c.debut, c.salle, c.id])).toEqual([[605, 'A01', e.creneaux[0].id]])
    const annules = lireCalendrier(cal(ev(date(0, 0, 10, 5), date(0, 0, 11, 0), 'MATHEMATIQUES - 2NDE3', { extra: 'STATUS:CANCELLED' })))
    expect(coursDuJour(annules, couvre, lun(10), e)).toEqual([])
    expect(coursDuJour(cours, couvre, new Date(2027, 0, 4).getTime(), e)).toBeNull()
  })
})

describe('le .memb garde l\'emploi du temps, en champ facultatif', () => {
  it('écrit seulement s\'il y en a un, et se relit ; un ancien .memb n\'en a pas', async () => {
    const { indexDe, lireIndex } = await import('../src/classeurs/archive')
    const e: EmploiDuTemps = { ...VIDE, creneaux: [cr(1)], couleurs: { LFB: 0 } }
    const avec = indexDe([], [], 1, () => false, e)
    const relu = lireIndex(new TextEncoder().encode(JSON.stringify(avec)))
    expect(lireEmploiDuTemps(relu.emploiDuTemps).creneaux).toEqual([cr(1)])
    const sans = indexDe([], [], 1, () => false)
    expect('emploiDuTemps' in sans).toBe(false)
    expect(lireIndex(new TextEncoder().encode(JSON.stringify(sans))).emploiDuTemps).toBeUndefined()
  })
})
