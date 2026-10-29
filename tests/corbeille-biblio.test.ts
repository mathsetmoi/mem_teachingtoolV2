// La corbeille de la bibliothèque (lot 4 C8) : ce qu'elle montre, ce
// qu'effacent « Supprimer définitivement » et « Vider la corbeille », où va
// ce qu'on remet, tous les textes, la place du navigateur ; et l'adoption des
// bases sans fiche : ce qu'est une base vide (au sens strict), la fiche d'une
// base retrouvée, l'examen d'une base par l'écrivain. Tout est pur, sauf
// l'examen (un Tableau sans base, rejoué dans un Y.Doc nu).
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import * as Y from 'yjs'
import type { FicheClasseur, FicheDossier } from '../src/classeurs/demarrage'
import { BASE_PREMIER, baseDe } from '../src/classeurs/demarrage'
import {
  BLOQUE, JAMAIS_ENREGISTRE, NOM_RETROUVE, NOM_RETROUVE_PREMIER, VERIFICATION_IMAGES, contenuDeLaCorbeille, contenuDuDossier, dateDeSuppression, elementsDeLaCorbeille, estVide,
  etaitDans, ficheRetrouvee, jamaisEnregistre, libelleCorbeille, ouRemettre, pagesDe, sauvegardesDe, texteAvantVider, texteCeQuiReste, texteDefinitifClasseur,
  texteDefinitifDossier, texteEfface, texteJamais, texteMisALaCorbeille, texteNonVerifie, textePasRecopiees, textePlace, texteRecopiees, texteRemis, texteRetrouves, texteVidee, texteViderBibliotheque,
  titreDefinitifClasseur, titreDefinitifDossier,
} from '../src/classeurs/corbeille'
import type { ExamenBase } from '../src/classeurs/ecrivain-pur'
import { examinerMisesAJour } from '../src/classeurs/ecrivain-pur'
import { Tableau } from '../src/document'
import type { Trait } from '../src/types'

const n = (t: string) => t.replace(/[  ]/g, ' ')
function fiche(id: string, o: Partial<FicheClasseur> = {}): FicheClasseur {
  return { id, base: baseDe(id), nom: 'Classeur ' + id, dossier: null, etiquettes: [], cree: 1, modifie: 1, ouvert: 0, pages: 1, ...o }
}
function dossier(id: string, parent: string | null, o: Partial<FicheDossier> = {}): FicheDossier {
  return { id, nom: 'Dossier ' + id, parent, couleur: '#3b6fb6', cree: 1, ...o }
}
const MAINTENANT = new Date('2026-10-10T10:05:00').getTime()

describe('ce que montre la corbeille', () => {
  it('les dossiers et les classeurs marqués, le dernier supprimé d\'abord ; ni ceux qui partent, ni ceux qui naissent', () => {
    const dossiers = [dossier('D', null, { corbeille: { t: 30 } }), dossier('E', 'D'), dossier('F', null)]
    const fiches = [
      fiche('a', { corbeille: { t: 10 } }),
      fiche('b', { dossier: 'D' }),
      fiche('c', { dossier: 'D', corbeille: { t: 20 } }),
      fiche('x', { corbeille: { t: 40 }, effacement: 50 }),
      fiche('y', { corbeille: { t: 45 }, creation: 46 }),
      fiche('z', { dossier: 'F' }),
    ]
    const l = elementsDeLaCorbeille(fiches, dossiers)
    expect(l.map(e => (e.genre === 'classeur' ? e.fiche.id : 'd:' + e.dossier.id) + '@' + e.t)).toEqual(['d:D@30', 'c@20', 'a@10'])
    expect(libelleCorbeille(3)).toEqual({ texte: 'Corbeille (3)', nom: 'Corbeille de la bibliothèque : 3 éléments' })
    expect(libelleCorbeille(0)).toEqual({ texte: 'Corbeille', nom: 'Corbeille de la bibliothèque : vide' })
  })

  it('un dossier efface tous ses classeurs (supprimés pour eux-mêmes aussi) et ses sous-dossiers, le plus profond d\'abord', () => {
    const dossiers = [dossier('D', null, { corbeille: { t: 30 } }), dossier('E', 'D'), dossier('G', 'E'), dossier('F', null)]
    const fiches = [fiche('b', { dossier: 'D', pages: 12 }), fiche('c', { dossier: 'E', corbeille: { t: 20 }, pages: 5 }), fiche('d', { dossier: 'G', pages: null }),
      fiche('e', { dossier: 'G', effacement: 3 }), fiche('z', { dossier: 'F' })]
    const c = contenuDuDossier('D', fiches, dossiers)
    expect(c.classeurs.map(f => f.id).sort()).toEqual(['b', 'c', 'd'])
    expect(c.dossiers.map(d => d.id)).toEqual(['G', 'E'])
    expect(pagesDe(c.classeurs)).toBe(17)
    // Vider : chaque classeur une fois, les dossiers du plus profond au moins profond
    const v = contenuDeLaCorbeille([...fiches, fiche('a', { corbeille: { t: 10 } })], dossiers)
    expect(v.classeurs.map(f => f.id).sort()).toEqual(['a', 'b', 'c', 'd'])
    expect(v.dossiers.map(d => d.id)).toEqual(['G', 'E', 'D'])
  })

  it('un cycle de dossiers (deux onglets) ne fait pas boucler', () => {
    const dossiers = [dossier('A', 'B', { corbeille: { t: 1 } }), dossier('B', 'A')]
    expect(() => contenuDeLaCorbeille([fiche('a', { dossier: 'A' })], dossiers)).not.toThrow()
  })

  it('les cartes : la date de suppression, ce que contient un dossier, où il était', () => {
    expect(n(dateDeSuppression(MAINTENANT, MAINTENANT))).toBe('Supprimé aujourd\'hui à 10 h 05')
    expect(n(dateDeSuppression(MAINTENANT, MAINTENANT, { classeurs: 4, dossiers: 0 }))).toBe('Supprimé aujourd\'hui à 10 h 05 · 4 classeurs')
    expect(n(dateDeSuppression(MAINTENANT, MAINTENANT, { classeurs: 0, dossiers: 0 }))).toBe('Supprimé aujourd\'hui à 10 h 05 · vide')
    const ds = [dossier('B', null, { nom: '5e B' }), dossier('G', 'B', { nom: 'Géométrie' })]
    expect(etaitDans('G', ds)).toBe('Était dans : 5e B › Géométrie')
    expect(etaitDans(null, ds)).toBe('Était dans : Bibliothèque')
  })
})

describe('supprimer, remettre', () => {
  it('les messages de Supprimer', () => {
    expect(texteMisALaCorbeille({ genre: 'classeur', nom: 'Symétrie' })).toBe('« Symétrie » est dans la corbeille de la bibliothèque.')
    expect(texteMisALaCorbeille({ genre: 'dossier', nom: '5e B', contenu: { classeurs: 4, dossiers: 2 } })).toBe('Dossier « 5e B » mis à la corbeille (4 classeurs)')
    expect(texteMisALaCorbeille({ genre: 'dossier', nom: '5e B', contenu: { classeurs: 1, dossiers: 0 } })).toBe('Dossier « 5e B » mis à la corbeille (1 classeur)')
    expect(texteMisALaCorbeille({ genre: 'dossier', nom: '5e B', contenu: { classeurs: 0, dossiers: 0 } })).toBe('Dossier « 5e B » mis à la corbeille')
  })

  it('où va ce qu\'on remet : son dossier, sinon la racine, et pourquoi', () => {
    const ds = [dossier('B', null, { nom: '5e B' }), dossier('C', null, { corbeille: { t: 1 } }), dossier('E', 'C')]
    expect(ouRemettre('B', ds)).toEqual({ dossier: 'B' })
    expect(ouRemettre(null, ds)).toEqual({ dossier: null })
    expect(ouRemettre('X', ds)).toEqual({ dossier: null, raison: 'absent' })
    expect(ouRemettre('C', ds)).toEqual({ dossier: null, raison: 'corbeille' })
    expect(ouRemettre('E', ds)).toEqual({ dossier: null, raison: 'corbeille' })
    expect(texteRemis({ genre: 'classeur', nom: 'Symétrie', vers: '5e B' })).toBe('« Symétrie » remis dans « 5e B »')
    expect(texteRemis({ genre: 'classeur', nom: 'Symétrie', vers: null, raison: 'absent' })).toBe('« Symétrie » remis à la racine de la bibliothèque (son dossier n\'existe plus)')
    expect(texteRemis({ genre: 'classeur', nom: 'Symétrie', vers: null, raison: 'corbeille' })).toBe('« Symétrie » remis à la racine de la bibliothèque (son dossier est dans la corbeille)')
    expect(texteRemis({ genre: 'classeur', nom: 'Symétrie', vers: null })).toBe('« Symétrie » remis à la racine de la bibliothèque')
    expect(texteRemis({ genre: 'dossier', nom: '5e B', vers: 'Collège' })).toBe('Dossier « 5e B » remis dans « Collège »')
  })
})

describe('supprimer définitivement, vider : les questions et les messages', () => {
  it('un classeur', () => {
    expect(titreDefinitifClasseur('Symétrie')).toBe('Supprimer définitivement « Symétrie » ?')
    expect(texteDefinitifClasseur(12)).toBe('Ses 12 pages et tout son historique (la revue, les séances à publier) seront effacés de ce navigateur. Ce n\'est pas annulable.')
    expect(texteDefinitifClasseur(1)).toMatch(/^Sa page et tout son historique/)
    expect(texteDefinitifClasseur(null)).toMatch(/^Ses pages et tout son historique/)
  })

  it('jamais enregistré : ni la date du dernier enregistrement, ni la clé, ni le Drive', () => {
    const f = fiche('a')
    expect(jamaisEnregistre(f, null)).toBe(true)
    expect(texteCeQuiReste(sauvegardesDe(f, null))).toBe(JAMAIS_ENREGISTRE)
    expect(JAMAIS_ENREGISTRE).toBe('Il n\'a jamais été enregistré dans un fichier ni copié sur le Drive : il n\'en restera rien.')
    expect(jamaisEnregistre(f, 123)).toBe(false)
    expect(jamaisEnregistre(fiche('a', { cle: { nom: 'a.memc', t: 5 } }), null)).toBe(false)
    // Une clé choisie mais jamais écrite ne compte pas
    expect(jamaisEnregistre(fiche('a', { cle: { nom: 'a.memc' } }), null)).toBe(true)
    expect(jamaisEnregistre(fiche('a', { drive: { compte: 'mem', id: 'x', t: 9, taille: 1 } }), null)).toBe(false)
    expect(texteCeQuiReste({ fichier: true, drive: true })).toBe('Ses fichiers enregistrés et sa copie sur le Drive ne sont pas effacés.')
    expect(texteCeQuiReste({ fichier: true, drive: false })).toBe('Ses fichiers enregistrés ne sont pas effacés.')
    expect(texteCeQuiReste({ fichier: false, drive: true })).toBe('Sa copie sur le Drive n\'est pas effacée.')
  })

  it('un dossier', () => {
    expect(titreDefinitifDossier('5e B')).toBe('Supprimer définitivement le dossier « 5e B » ?')
    expect(n(texteDefinitifDossier({ classeurs: 4, pages: 27, dossiers: 2 }))).toBe('Ses 4 classeurs (27 pages en tout) et ses 2 dossiers seront effacés de ce navigateur. Ce n\'est pas annulable.')
    expect(n(texteDefinitifDossier({ classeurs: 1, pages: 12, dossiers: 0 }))).toBe('Son classeur (12 pages) sera effacé de ce navigateur. Ce n\'est pas annulable.')
    expect(n(texteDefinitifDossier({ classeurs: 2, pages: 3, dossiers: 1 }))).toBe('Ses 2 classeurs (3 pages en tout) et son dossier seront effacés de ce navigateur. Ce n\'est pas annulable.')
    expect(n(texteDefinitifDossier({ classeurs: 0, pages: 0, dossiers: 0 }))).toBe('Il ne contient aucun classeur. Ce n\'est pas annulable.')
  })

  it('vider', () => {
    expect(n(texteViderBibliotheque({ classeurs: 3, pages: 27, dossiers: 1 }))).toBe('3 classeurs (27 pages) et 1 dossier seront effacés de ce navigateur. Ce n\'est pas annulable.')
    expect(n(texteViderBibliotheque({ classeurs: 1, pages: 1, dossiers: 0 }))).toBe('1 classeur (1 page) sera effacé de ce navigateur. Ce n\'est pas annulable.')
    expect(texteJamais(1)).toBe('Dont 1 qui n\'a jamais été enregistré dans un fichier.')
    expect(texteJamais(2)).toBe('Dont 2 qui n\'ont jamais été enregistrés dans un fichier.')
    expect(texteJamais(0)).toBe('')
    expect(texteEfface({ genre: 'classeur', nom: 'Symétrie' })).toBe('« Symétrie » supprimé définitivement.')
    expect(texteEfface({ genre: 'dossier', nom: '5e B' })).toBe('Dossier « 5e B » supprimé définitivement.')
    expect(texteVidee({ classeurs: 3, dossiers: 1 })).toBe('Corbeille vidée (3 classeurs, 1 dossier).')
    expect(texteVidee({ classeurs: 1, dossiers: 0 })).toBe('Corbeille vidée (1 classeur).')
    expect(BLOQUE).toBe('Le classeur sera effacé dès que l\'onglet où il est encore ouvert sera fermé.')
  })

  it('les images dont la corbeille tient la dernière copie (lot 17) : le paragraphe de la question, le classeur non vérifié, les messages de fin', () => {
    expect(n(texteAvantVider(2, ['Fractions', 'Équations']))).toBe('2 images que « Fractions » et « Équations » montrent encore n\'existent que dans la corbeille : elles seront d\'abord recopiées dans ces classeurs.')
    expect(n(texteAvantVider(1, ['Fractions']))).toBe('1 image que « Fractions » montre encore n\'existe que dans la corbeille : elle sera d\'abord recopiée dans ce classeur.')
    expect(n(texteAvantVider(1, ['Fractions', 'Équations']))).toBe('1 image que « Fractions » et « Équations » montrent encore n\'existe que dans la corbeille : elle sera d\'abord recopiée dans ces classeurs.')
    expect(n(texteAvantVider(3, ['Fractions']))).toBe('3 images que « Fractions » montre encore n\'existent que dans la corbeille : elles seront d\'abord recopiées dans ce classeur.')
    // Aucune image concernée : la question ne change pas
    expect(texteAvantVider(0, [])).toBe('')
    expect(texteAvantVider(0, ['Fractions'])).toBe('')
    expect(n(texteNonVerifie(['Vieux chapitre']))).toBe('« Vieux chapitre » n\'a pas pu être vérifié.')
    expect(n(texteNonVerifie(['A', 'B']))).toBe('« A » et « B » n\'ont pas pu être vérifiés.')
    expect(texteNonVerifie([])).toBe('')
    expect(n(texteRecopiees([{ nom: 'Fractions', n: 2 }]))).toBe('2 images recopiées dans « Fractions ».')
    expect(n(texteRecopiees([{ nom: 'Fractions', n: 1 }, { nom: 'Équations', n: 2 }]))).toBe('3 images recopiées dans « Fractions » et « Équations ».')
    expect(n(texteRecopiees([{ nom: 'Fractions', n: 1 }, { nom: 'Rien', n: 0 }]))).toBe('1 image recopiée dans « Fractions ».')
    expect(texteRecopiees([])).toBe('')
    expect(n(textePasRecopiees('Symétrie', ['Fractions']))).toBe('« Symétrie » n\'a pas été effacé : ses images n\'ont pas pu être recopiées dans « Fractions ». Recommencez.')
    expect(n(textePasRecopiees('Symétrie', ['Fractions', 'Équations']))).toBe('« Symétrie » n\'a pas été effacé : ses images n\'ont pas pu être recopiées dans « Fractions » et « Équations ». Recommencez.')
    expect(n(VERIFICATION_IMAGES)).toBe('Vérification des images…')
  })
})

describe('la place', () => {
  it('ce que garde le navigateur, l\'alerte au-delà de 80 %, rien si on ne sait pas', () => {
    const p = textePlace({ usage: 120 * 1024 * 1024, quota: 10 * 1024 ** 3 })!
    expect(n(p.texte)).toBe("Ce navigateur garde 120 Mo pour ce site.")
    expect(p.alerte).toBe(false)
    const a = textePlace({ usage: 85, quota: 100 })!
    expect(a.alerte).toBe(true)
    expect(n(a.texte)).toBe('Le navigateur manque de place (85 % utilisés) : enregistrez vos classeurs dans des fichiers, puis videz la corbeille.')
    expect(textePlace({ usage: 80, quota: 100 })!.alerte).toBe(false)
    expect(textePlace(null)).toBeNull()
    expect(textePlace({})).toBeNull()
  })
})

// ---------- L'adoption ----------
let horloge = new Date('2026-10-09T08:00:00').getTime()
let numero = 0
beforeEach(() => { vi.useFakeTimers({ toFake: ['Date'] }); vi.setSystemTime(horloge) })
afterEach(() => vi.useRealTimers())
async function attendre(ms: number) { horloge += ms; vi.setSystemTime(horloge); await Promise.resolve(); await Promise.resolve() }
const trait = (): Trait => ({ id: 'T' + numero++, type: 'trait', x: 0, y: 0, z: numero++, auteur: 'moi', pts: [0, 0, 0.5, 40, 5, 0.5], couleur: '#1b2230', taille: 3, opacite: 1, pression: false })
const examen = (o: Partial<ExamenBase> = {}): ExamenBase => ({ entrees: 2, incomplet: false, pages: 1, formes: 0, film: 1, piste: 0, publications: 0, noms: 0, corbeille: 0, cree: 5, modifie: 9, vecteur: new Uint8Array([0]), ...o })

describe('les bases sans fiche : vide au sens strict', () => {
  it('rien de plus qu\'une page blanche et sa naissance', () => {
    expect(estVide(examen())).toBe(true)
    for (const x of [{ formes: 1 }, { film: 2 }, { piste: 1 }, { publications: 1 }, { noms: 1 }, { corbeille: 1 }, { incomplet: true }] as Partial<ExamenBase>[]) {
      expect(estVide(examen(x)), JSON.stringify(x)).toBe(false)
    }
  })

  it('l\'examen d\'une base : une page blanche est vide ; un trait, ou une page pleine dans la corbeille des pages, non', async () => {
    const t = new Tableau(null)
    const a = t.ajouterPage('carreaux', 0)
    await attendre(500)
    const vide = examinerMisesAJour([Y.encodeStateAsUpdate(t.doc)])
    expect(vide).toMatchObject({ entrees: 1, incomplet: false, pages: 1, formes: 0, film: 1, piste: 0, publications: 0, noms: 0, corbeille: 0 })
    expect(estVide(vide)).toBe(true)
    // Une seconde page avec un trait, puis jetée : la seule page de l'ordre est vide
    const b = t.ajouterPage('carreaux', 1)
    t.pageVue = b
    await attendre(500)
    t.nouveauGeste(); t.poser(b, trait())
    await attendre(800)
    t.pageVue = a
    expect(t.jeterPage(b, a)).toBe(true)
    await attendre(500)
    const plein = examinerMisesAJour([Y.encodeStateAsUpdate(t.doc), new Uint8Array([0, 0])])
    expect(plein.pages).toBe(1)
    expect(plein.formes).toBe(1)
    expect(plein.corbeille).toBe(1)
    expect(plein.entrees).toBe(2)
    expect(plein.cree).toBeGreaterThan(0)
    expect(plein.modifie).toBeGreaterThanOrEqual(plein.cree)
    expect(estVide(plein)).toBe(false)
    expect(Y.decodeStateVector(plein.vecteur).size).toBeGreaterThan(0)
  })

  it('sans entrée, ou des octets illisibles', () => {
    expect(examinerMisesAJour([])).toMatchObject({ entrees: 0, formes: 0 })
    const x = examinerMisesAJour([new Uint8Array([9, 9, 9, 9, 9])])
    expect(x.incomplet).toBe(true)
    expect(estVide(x)).toBe(false)
  })

  it('la fiche d\'une base retrouvée : son id (libre) et son nom rangés à côté, sinon les noms par défaut', () => {
    const o = { libre: (id: string) => id !== '0000000000000000', idNeuf: () => 'ffffffffffffffff', maintenant: 100 }
    const e = examen({ cree: 5, modifie: 9, pages: 3 })
    expect(ficheRetrouvee(baseDe('aaaaaaaaaaaaaaaa'), e, { id: 'aaaaaaaaaaaaaaaa', nom: 'Fractions' }, o))
      .toMatchObject({ id: 'aaaaaaaaaaaaaaaa', nom: 'Fractions', dossier: null, etiquettes: [], cree: 5, modifie: 9, ouvert: 0, pages: 3 })
    // Pris, ou pas un id : un neuf (le nom reste)
    expect(ficheRetrouvee(baseDe('x'), e, { id: '0000000000000000', nom: 'Fractions' }, o)).toMatchObject({ id: 'ffffffffffffffff', nom: 'Fractions' })
    expect(ficheRetrouvee(baseDe('x'), e, { id: 'pas un id' }, o)).toMatchObject({ id: 'ffffffffffffffff', nom: NOM_RETROUVE })
    expect(ficheRetrouvee(BASE_PREMIER, e, undefined, o)).toMatchObject({ base: BASE_PREMIER, nom: NOM_RETROUVE_PREMIER })
    expect(NOM_RETROUVE_PREMIER).toBe('Tableau retrouvé (version d\'avant)')
    expect(ficheRetrouvee(BASE_PREMIER, examen({ cree: 0, modifie: 0 }), undefined, o)).toMatchObject({ cree: 100, modifie: 100 })
    expect(texteRetrouves(['Tableau retrouvé (version d\'avant)'])).toBe('Un classeur retrouvé dans ce navigateur a été remis dans la bibliothèque : « Tableau retrouvé (version d\'avant) ».')
    expect(texteRetrouves(['A', 'B'])).toBe('2 classeurs retrouvés dans ce navigateur ont été remis dans la bibliothèque : « A », « B ».')
  })
})
