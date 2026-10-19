// La bibliothèque des classeurs (lot 4, C5) : ce qui va dans « Récents » et
// dans « Tous les classeurs », dans quel ordre, ce qu'on lit sur une carte
// (la date, les pages, le lecteur d'écran, la clé et le Drive), le nom d'un
// classeur neuf ; la ligne de l'état du classeur ouvert et le rappel au
// départ. Tout est pur.
import { describe, expect, it } from 'vitest'
import type { FicheClasseur, FicheDossier } from '../src/classeurs/demarrage'
import { baseDe } from '../src/classeurs/demarrage'
import { RECENTS, aLaRacine, depuisQuand, libelleCarte, libelleSeances, lignesDesSeances, seancesParMois, nombreDeClasseurs, nomDeClasseur, parDate, quandCourt, recents, texteLecteur, titreCle, titreDrive } from '../src/classeurs/liste'
import type { EtatSauvegarde } from '../src/classeurs/etat'
import { rappelAuDepart, resumeEtat } from '../src/classeurs/etat'

const MIN = 60_000, H = 60 * MIN, J = 24 * H
/** Le samedi 10 octobre 2026 à 14 h 05, à l'heure de la machine */
const T = new Date(2026, 9, 10, 14, 5).getTime()
const sp = (s: string) => s.replace(/[  ]/g, ' ')

function fiche(id: string, o: Partial<FicheClasseur> = {}): FicheClasseur {
  return { id, base: baseDe(id), nom: 'Classeur ' + id, dossier: null, etiquettes: [], cree: 1, modifie: 1, ouvert: 0, pages: 1, ...o }
}
function etat(o: Partial<EtatSauvegarde> = {}): EtatSauvegarde {
  return { navigateur: 'ok', modifie: null, fichier: null, nonEnregistreDepuis: null, cle: { etat: 'absente' }, drive: { etat: 'absente' }, ...o }
}

describe('Récents', () => {
  it('les six derniers ouverts, le plus récent d\'abord ; jamais ouverts : pas dedans', () => {
    const f = Array.from({ length: 30 }, (_, i) => fiche(String(i).padStart(16, '0'), { ouvert: i < 20 ? T - i * MIN : 0, modifie: T - (30 - i) * MIN }))
    const r = recents(f)
    expect(RECENTS).toBe(6)
    expect(r.map(x => x.ouvert)).toEqual([0, 1, 2, 3, 4, 5].map(i => T - i * MIN))
    expect(recents(f, 3)).toHaveLength(3)
    expect(recents(f.filter(x => !x.ouvert))).toEqual([])
    // Le tableau d'entrée n'est pas changé
    expect(f[0].id).toBe('0000000000000000')
  })

  it('à égalité d\'ouverture, le plus récemment modifié, puis l\'id', () => {
    const a = fiche('a', { ouvert: T, modifie: T - H }), b = fiche('b', { ouvert: T, modifie: T }), c = fiche('c', { ouvert: T, modifie: T })
    expect(recents([a, c, b]).map(x => x.id)).toEqual(['b', 'c', 'a'])
  })
})

describe('le tri par date', () => {
  it('le plus récemment modifié d\'abord ; puis créé ; puis le nom, comme on le lit ; puis l\'id', () => {
    const l = [
      fiche('1', { modifie: T - J, nom: 'Vieux' }),
      fiche('2', { modifie: T, nom: 'Neuf' }),
      fiche('3', { modifie: T - H, cree: 5, nom: 'B' }),
      fiche('4', { modifie: T - H, cree: 9, nom: 'A' }),
      fiche('5', { modifie: 0, cree: 0, nom: 'Chapitre 10' }),
      fiche('6', { modifie: 0, cree: 0, nom: 'chapitre 2' }),
      fiche('8', { modifie: 0, cree: 0, nom: 'Même' }),
      fiche('7', { modifie: 0, cree: 0, nom: 'Même' }),
    ]
    expect(parDate(l).map(x => x.id)).toEqual(['2', '4', '3', '1', '6', '5', '7', '8'])
    expect(l[0].id).toBe('1')
  })

  it('à la racine : sans dossier, ou dans un dossier qui n\'existe plus', () => {
    const d: FicheDossier = { id: 'd', nom: '5e B', parent: null, couleur: '#1f5fbf', cree: 1 }
    const dossiers = new Map([[d.id, d]])
    expect(aLaRacine(fiche('a'), dossiers)).toBe(true)
    expect(aLaRacine(fiche('b', { dossier: 'd' }), dossiers)).toBe(false)
    expect(aLaRacine(fiche('c', { dossier: 'parti' }), dossiers)).toBe(true)
  })
})

describe('les dates des cartes', () => {
  it('aujourd\'hui à 14 h 05, hier, le 7 octobre, une autre année', () => {
    expect(sp(quandCourt(T, T))).toBe('aujourd\'hui à 14 h 05')
    expect(sp(quandCourt(T - 5 * H, T))).toBe('aujourd\'hui à 9 h 05')
    expect(sp(quandCourt(T - J, T))).toBe('hier à 14 h 05')
    expect(sp(quandCourt(new Date(2026, 9, 7, 8, 0).getTime(), T))).toBe('le 7 octobre')
    expect(sp(quandCourt(new Date(2026, 9, 1, 8, 0).getTime(), T))).toBe('le 1er octobre')
    expect(sp(quandCourt(new Date(2025, 8, 30, 8, 0).getTime(), T))).toBe('le 30 septembre 2025')
  })

  it('depuis quand : à l\'instant, il y a 7 min, il y a 3 h, hier, il y a 3 jours, puis la date', () => {
    expect(depuisQuand(T - 20_000, T)).toBe('à l\'instant')
    expect(depuisQuand(T + 5 * MIN, T)).toBe('à l\'instant')
    expect(sp(depuisQuand(T - 7 * MIN, T))).toBe('il y a 7 min')
    expect(sp(depuisQuand(T - 3 * H - 10 * MIN, T))).toBe('il y a 3 h')
    expect(depuisQuand(T - 20 * H, T)).toBe('hier')
    expect(sp(depuisQuand(T - 3 * J, T))).toBe('il y a 3 jours')
    expect(sp(depuisQuand(T - 6 * J, T))).toBe('il y a 6 jours')
    expect(sp(depuisQuand(T - 9 * J, T))).toBe('le 1er octobre')
  })
})

describe('les séances sous la carte d\'un classeur', () => {
  const lundi = new Date(2026, 9, 12, 8, 0).getTime(), mercredi = new Date(2026, 9, 14, 10, 0).getTime(), vendredi = new Date(2026, 9, 16, 14, 0).getTime()
  const f = fiche('x', { listeSeances: [{ id: 'b', debut: mercredi, pages: 4 }, { id: 'a', debut: lundi, nom: 'Rappels du cours', pages: 3 }, { id: 'c', debut: vendredi, pages: 1 }] })

  it('« 3 séances », « 1 séance » ; rien quand on ne les connaît pas', () => {
    expect(libelleSeances(f)).toBe('3 séances')
    expect(libelleSeances(fiche('x', { listeSeances: [{ id: 'a', debut: lundi, pages: 2 }] }))).toBe('1 séance')
    expect(libelleSeances(fiche('x'))).toBeNull()
    expect(libelleSeances(fiche('x', { listeSeances: [] }))).toBeNull()
  })

  it('la plus récente d\'abord, avec son nom et ses pages', () => {
    const l = lignesDesSeances(f)
    expect(l.map(x => x.id)).toEqual(['c', 'b', 'a'])
    expect(l.map(x => sp(x.pages))).toEqual(['1 page', '4 pages', '3 pages'])
    expect(l[2].nom).toBe('Rappels du cours')
    expect(l[0].nom).toBeNull()
    expect(sp(l[0].date)).toMatch(/^Ven 16 oct 14h/)
  })

  it('la fiche d\'un classeur sans liste n\'a aucune ligne', () => {
    expect(lignesDesSeances(fiche('x'))).toEqual([])
  })
})

describe('la vue « Séances » de la bibliothèque', () => {
  const t = (j: number, h = 9) => new Date(2026, j < 100 ? 9 : 10, j < 100 ? j : j - 100, h, 0).getTime()
  const a = fiche('a', { nom: 'Fractions', listeSeances: [{ id: 's1', debut: t(5), pages: 2 }, { id: 's2', debut: t(12), pages: 3 }] })
  const b = fiche('b', { nom: 'Triangles', listeSeances: [{ id: 's3', debut: t(103), nom: 'Révisions', pages: 1 }] })

  it('la plus récente d\'abord, rangées par mois', () => {
    const g = seancesParMois([a, b], f => f.id === 'a' ? '5ème › Fractions' : '5ème')
    expect(g.map(x => x.mois)).toEqual(['Novembre 2026', 'Octobre 2026'])
    expect(g[0].seances.map(x => x.seance)).toEqual(['s3'])
    expect(g[1].seances.map(x => x.seance)).toEqual(['s2', 's1'])
    expect(g[0].seances[0]).toMatchObject({ classeur: 'b', nomClasseur: 'Triangles', chemin: '5ème', nom: 'Révisions' })
  })

  it('un seul classeur, ou aucune séance', () => {
    expect(seancesParMois([a], () => '').flatMap(x => x.seances).map(x => x.classeur)).toEqual(['a', 'a'])
    expect(seancesParMois([fiche('c')], () => '')).toEqual([])
  })
})

describe('la carte d\'un classeur', () => {
  const f = fiche('0123456789abcdef', { nom: 'Symétrie centrale', modifie: T - 10 * MIN, pages: 12 })

  it('« Modifié aujourd\'hui à 14 h 05 · 12 pages »', () => {
    expect(sp(libelleCarte(fiche('x', { modifie: T, pages: 12 }), T))).toBe('Modifié aujourd\'hui à 14 h 05 · 12 pages')
    expect(sp(libelleCarte(fiche('x', { modifie: T - J, pages: 1 }), T))).toBe('Modifié hier à 14 h 05 · 1 page')
    // Le premier, repris, jamais rouvert : on ne sait rien
    expect(libelleCarte(fiche('x', { modifie: 0, cree: 0, pages: null }), T)).toBe('Pas encore ouvert depuis la mise à jour')
    expect(sp(libelleCarte(fiche('x', { modifie: 0, cree: T, pages: null }), T))).toBe('Créé aujourd\'hui à 14 h 05')
  })

  it('le lecteur d\'écran : « Symétrie centrale, 12 pages, modifié aujourd\'hui à 13 h 55 »', () => {
    expect(sp(texteLecteur(f, T))).toBe('Symétrie centrale, 12 pages, modifié aujourd\'hui à 13 h 55')
    expect(sp(texteLecteur(f, T, { ouvertIci: true }))).toBe('Symétrie centrale, 12 pages, modifié aujourd\'hui à 13 h 55, ouvert dans cet onglet')
    expect(texteLecteur(fiche('x', { nom: 'Mon tableau', modifie: 0, cree: 0, pages: null }), T)).toBe('Mon tableau, pas encore ouvert depuis la mise à jour')
    const avec = { ...f, cle: { nom: 'Symétrie.memc', t: T - 3 * J }, drive: { compte: 'mem' as const, id: 'f', t: T - 10 * MIN, taille: 1 } }
    expect(sp(texteLecteur(avec, T))).toBe('Symétrie centrale, 12 pages, modifié aujourd\'hui à 13 h 55, sur la clé il y a 3 jours (Symétrie.memc), sur le Drive il y a 10 min')
    // (C6) Ses étiquettes de classe, et son dossier quand un filtre les montre tous ensemble
    expect(sp(texteLecteur(f, T, { etiquettes: ['5e B'], chemin: '5e B › Géométrie', ouvertIci: true })))
      .toBe('Symétrie centrale, 12 pages, modifié aujourd\'hui à 13 h 55, classe 5e B, dans 5e B › Géométrie, ouvert dans cet onglet')
    expect(sp(texteLecteur(f, T, { etiquettes: ['5e B', 'Soutien'] }))).toBe('Symétrie centrale, 12 pages, modifié aujourd\'hui à 13 h 55, classes 5e B, Soutien')
  })

  it('les icônes de la clé et du Drive : la date de la dernière écriture réussie', () => {
    expect(titreCle(f, T)).toBe(null)
    expect(titreDrive(f, T)).toBe(null)
    expect(sp(titreCle({ ...f, cle: { nom: 'Symétrie.memc', t: T - 3 * J } }, T)!)).toBe('Sur la clé il y a 3 jours (Symétrie.memc)')
    expect(titreCle({ ...f, cle: { nom: 'Symétrie.memc' } }, T)).toBe('Enregistrement automatique sur la clé (Symétrie.memc) : pas encore écrit')
    expect(sp(titreDrive({ ...f, drive: { compte: 'mem', id: 'x', t: T - 2 * H, taille: 10 } }, T)!)).toBe('Sur le Drive il y a 2 h')
  })

  it('le nombre de classeurs', () => {
    expect(nombreDeClasseurs(0)).toBe('Aucun classeur')
    expect(nombreDeClasseurs(1)).toBe('1 classeur')
    expect(nombreDeClasseurs(12)).toBe('12 classeurs')
  })

  it('le nom d\'un classeur neuf : les blancs réunis, sans contrôle, 60 caractères ; vide : null', () => {
    expect(nomDeClasseur('  Symétrie   centrale ')).toBe('Symétrie centrale')
    expect(nomDeClasseur('A\tB\nC\u0007D')).toBe('A B C D')
    expect(nomDeClasseur('   ')).toBe(null)
    expect(nomDeClasseur('é'.repeat(80))).toBe('é'.repeat(60))
    expect([...nomDeClasseur('😀'.repeat(70))!].length).toBe(60)
  })
})

describe('la ligne du classeur ouvert (la bibliothèque)', () => {
  it('« Enregistré dans ce navigateur · sur la clé il y a 2 min · sur le Drive il y a 10 min »', () => {
    const e = etat({ cle: { etat: 'ok', t: T - 2 * MIN, nom: 'S.memc' }, drive: { etat: 'ok', t: T - 10 * MIN }, fichier: T - 2 * MIN })
    expect(sp(resumeEtat(e, T))).toBe('Enregistré dans ce navigateur · sur la clé il y a 2 min · sur le Drive il y a 10 min')
  })

  it('ce qui manque, ce qui est en pause, ce qui a échoué ; jamais « il y a » après un échec', () => {
    expect(resumeEtat(etat(), T)).toBe('Enregistré dans ce navigateur · jamais enregistré dans un fichier')
    expect(sp(resumeEtat(etat({ fichier: T - 25 * MIN }), T))).toBe('Enregistré dans ce navigateur · dans un fichier il y a 25 min')
    expect(resumeEtat(etat({ cle: { etat: 'permission' } }), T)).toBe('Enregistré dans ce navigateur · clé en pause · jamais enregistré dans un fichier')
    const echec = resumeEtat(etat({ cle: { etat: 'erreur', t: T - MIN, message: 'la clé est pleine' }, fichier: T - MIN }), T)
    expect(sp(echec)).toBe('Enregistré dans ce navigateur · clé : pas à jour · dans un fichier il y a 1 min')
    expect(echec).not.toMatch(/sur la clé il y a/)
    expect(resumeEtat(etat({ cle: { etat: 'conflit' } }), T)).toMatch(/clé : pas à jour/)
    expect(resumeEtat(etat({ cle: { etat: 'autre-onglet' } }), T)).toBe('Enregistré dans ce navigateur · sur la clé (par l\'autre onglet)')
    expect(resumeEtat(etat({ cle: { etat: 'absente', message: 'le fichier « X.memc » est à choisir de nouveau' } }), T)).toBe('Enregistré dans ce navigateur · clé : fichier à choisir de nouveau · jamais enregistré dans un fichier')
    expect(resumeEtat(etat({ drive: { etat: 'connexion' } }), T)).toBe('Enregistré dans ce navigateur · Drive en attente de la connexion Google · jamais enregistré dans un fichier')
    expect(resumeEtat(etat({ cle: { etat: 'impossible' }, drive: { etat: 'impossible' } }), T)).toBe('Enregistré dans ce navigateur · jamais enregistré dans un fichier')
  })

  it('jamais « Enregistré dans ce navigateur » quand la base a dit une erreur', () => {
    const r = resumeEtat(etat({ navigateur: 'erreur', erreurBase: 'place' }), T)
    expect(r).toBe('Ce navigateur n\'enregistre plus ce classeur · jamais enregistré dans un fichier')
    expect(r).not.toMatch(/Enregistré dans ce navigateur/)
  })
})

describe('le rappel au départ', () => {
  it('20 minutes de travail que rien ne protège, sans attendre 2 minutes sans geste', () => {
    expect(rappelAuDepart(etat({ nonEnregistreDepuis: T - 25 * MIN, modifie: T }), T)).toBe(true)
    expect(rappelAuDepart(etat({ nonEnregistreDepuis: T - 10 * MIN, modifie: T }), T)).toBe(false)
    expect(rappelAuDepart(etat(), T)).toBe(false)
    expect(rappelAuDepart(etat({ nonEnregistreDepuis: T - 25 * MIN, modifie: T, cle: { etat: 'ok', t: T } }), T)).toBe(false)
    expect(rappelAuDepart(etat({ nonEnregistreDepuis: T - 25 * MIN, modifie: T, drive: { etat: 'ok', t: T - 5 * MIN } }), T)).toBe(false)
    expect(rappelAuDepart(etat({ nonEnregistreDepuis: T - 25 * MIN, modifie: T, cle: { etat: 'permission' } }), T)).toBe(true)
  })
})
