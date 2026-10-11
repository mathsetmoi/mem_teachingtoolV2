// Reconnaître un fichier qu'on ouvre (lot 4 C9) : le même classeur (son
// id), un classeur de la corbeille, un fichier qui ressemble (un appareil
// commun dans les vecteurs d'état : la même histoire, même sans id), un
// nouveau ; ce qu'on fait d'un classeur déjà là (comparerVecteurs) ; le nom
// d'après le nom du fichier ; les phrases ; la réunion des dossiers. Avec de
// vrais classeurs (Tableau) qui divergent.
import { describe, expect, it } from 'vitest'
import * as Y from 'yjs'
import { Tableau } from '../src/document'
import type { Trait } from '../src/types'
import type { FicheClasseur, FicheDossier } from '../src/classeurs/demarrage'
import { comparerVecteurs } from '../src/classeurs/vecteurs'
import {
  TEXTE_CORBEILLE, TEXTE_PUBLIEES_COPIE, TEXTE_PUBLIEES_COPIES, appareils, bilanVide, decisionDe, identiteDuFichier, nomDepuisFichier, planDesDossiers, raisonCourte, texteApresBibliotheque,
  texteApresPlusieurs, texteAvantPlusieurs, texteComparaison, texteDejaLa, texteDuFichier,
} from '../src/classeurs/reconnaitre'
import { ABIME, UN_FILM, dateLisible, pagesLisibles } from '../src/fichier'

let numero = 0
function trait(x: number): Trait {
  const pts: number[] = []
  for (let i = 0; i < 6; i++) pts.push(i * 5, Math.sin(i) * 4, 0.5)
  return { id: 'T' + numero++, type: 'trait', x, y: 0, z: numero, auteur: 'appareil-du-prof', pts, couleur: '#1b2230', taille: 3, opacite: 1, pression: false }
}
const micro = () => new Promise(r => setTimeout(r, 0))
async function unClasseur(n = 1) {
  const t = new Tableau(null)
  const p = t.ajouterPage('carreaux', 0); t.pageVue = p
  await micro()
  for (let i = 0; i < n; i++) { t.nouveauGeste(); t.poser(p, trait(i * 10)); await micro() }
  return { t, p }
}
/** Le même état, rejoué ailleurs (une autre machine, une autre ouverture) */
function copie(t: Tableau): Tableau {
  const c = new Tableau(null)
  Y.applyUpdate(c.doc, Y.encodeStateAsUpdate(t.doc), 'film')
  c.pageVue = t.ordre.get(0)
  return c
}
const v = (t: Tableau) => Y.encodeStateVector(t.doc)
const fiche = (id: string, nom: string, o: Partial<FicheClasseur> = {}): FicheClasseur =>
  ({ id, base: 'mem-teachingtool-classeur-' + id, nom, dossier: null, etiquettes: [], cree: 1, modifie: 2, ouvert: 0, pages: 1, ...o })

describe('identiteDuFichier', () => {
  it('le même (son id), la corbeille (lui, ou son dossier), un nouveau', async () => {
    const { t } = await unClasseur()
    const ici = fiche('aaaaaaaaaaaaaaaa', 'Symétrie', { vecteur: v(t) })
    const jete = fiche('bbbbbbbbbbbbbbbb', 'Jeté', { corbeille: { t: 5 } })
    const dansDossierJete = fiche('cccccccccccccccc', 'Rangé', { dossier: 'd' })
    const dossiers: FicheDossier[] = [{ id: 'd', nom: '5e B', parent: null, couleur: '#3b6fb6', cree: 1, corbeille: { t: 3 } }]
    const fiches = [ici, jete, dansDossierJete]
    expect(identiteDuFichier({ id: ici.id }, v(t), fiches, { dossiers })).toEqual({ genre: 'meme', fiche: ici })
    expect(identiteDuFichier({ id: jete.id }, new Uint8Array([0]), fiches, { dossiers })).toEqual({ genre: 'corbeille', fiche: jete })
    expect(identiteDuFichier({ id: dansDossierJete.id }, new Uint8Array([0]), fiches, { dossiers }).genre).toBe('corbeille')
    const { t: autre } = await unClasseur()
    expect(identiteDuFichier({ id: 'dddddddddddddddd' }, v(autre), fiches, { dossiers })).toEqual({ genre: 'nouveau' })
    expect(identiteDuFichier({}, v(autre), fiches, { dossiers })).toEqual({ genre: 'nouveau' })
    // Une fiche qui part (effacement) ou qui naît ne compte pas
    expect(identiteDuFichier({ id: 'eeeeeeeeeeeeeeee' }, v(t), [fiche('eeeeeeeeeeeeeeee', 'Part', { effacement: 9, vecteur: v(t) })])).toEqual({ genre: 'nouveau' })
  })

  it('ressemble : un .memc d\'avant le lot 4 (sans id) du même tableau, ou d\'un id inconnu ici', async () => {
    const { t, p } = await unClasseur(2)
    // La bibliothèque a continué : un autre appareil (une autre ouverture) a écrit
    const ici = copie(t)
    ici.nouveauGeste(); ici.poser(p, trait(99)); await micro()
    const fiches = [fiche('aaaaaaaaaaaaaaaa', 'Mon tableau', { vecteur: v(ici) }), fiche('bbbbbbbbbbbbbbbb', 'Autre', { vecteur: v((await unClasseur()).t) })]
    const sansId = identiteDuFichier({}, v(t), fiches)
    expect(sansId).toMatchObject({ genre: 'ressemble', fiche: { id: 'aaaaaaaaaaaaaaaa' }, communs: 1 })
    expect(identiteDuFichier({ id: '9999999999999999' }, v(t), fiches).genre).toBe('ressemble')
    // Et la comparaison qui suit : la bibliothèque a tout, et plus
    expect(comparerVecteurs(v(t), v(ici))).toBe('contenu')
    expect(decisionDe(comparerVecteurs(v(t), v(ici)))).toBe('rien')
  })

  it('le plus d\'appareils en commun l\'emporte, puis le plus récent ; les vecteurs calculés passent avant ceux des fiches', async () => {
    const { t, p } = await unClasseur()
    const a = copie(t); a.nouveauGeste(); a.poser(p, trait(5)); await micro()
    const fichier = copie(a); fichier.nouveauGeste(); fichier.poser(p, trait(6)); await micro()
    // fichier : les appareils de t, de a, et le sien ; X n'a que t, Y a t et a
    const X = fiche('1111111111111111', 'X', { vecteur: v(t), modifie: 50 })
    const Yf = fiche('2222222222222222', 'Y', { vecteur: v(a), modifie: 10 })
    expect(identiteDuFichier({}, v(fichier), [X, Yf])).toMatchObject({ fiche: { id: Yf.id }, communs: 2 })
    // À égalité : le plus récemment modifié
    const Z = fiche('3333333333333333', 'Z', { vecteur: v(t), modifie: 60 })
    expect(identiteDuFichier({}, v(t), [X, Z])).toMatchObject({ fiche: { id: Z.id }, communs: 1 })
    // Une fiche sans vecteur (jamais ouverte depuis le lot 4) : le vecteur calculé par l'écrivain
    const W = fiche('4444444444444444', 'W')
    expect(identiteDuFichier({}, v(t), [W]).genre).toBe('nouveau')
    expect(identiteDuFichier({}, v(t), [W], { vecteurs: new Map([[W.id, v(a)]]) })).toMatchObject({ genre: 'ressemble', fiche: { id: W.id } })
    expect(appareils(v(fichier)).size).toBe(3)
  })

  it('les trois décisions, avec de vrais classeurs : divergence (copie), plus récent (mettre à jour), le même (rien)', async () => {
    const { t, p } = await unClasseur()
    const fichier = copie(t)
    expect(decisionDe(comparerVecteurs(v(fichier), v(t)))).toBe('rien')
    fichier.nouveauGeste(); fichier.poser(p, trait(20)); await micro()
    expect(comparerVecteurs(v(fichier), v(t))).toBe('contient')
    expect(decisionDe('contient')).toBe('mettre-a-jour')
    t.nouveauGeste(); t.poser(p, trait(30)); await micro()
    expect(comparerVecteurs(v(fichier), v(t))).toBe('diverge')
    expect(decisionDe('diverge')).toBe('copie')
    // Mis à jour sans perte : la base et le fichier réunis contiennent l'un et l'autre
    const base = copie(t)
    Y.applyUpdate(base.doc, Y.encodeStateAsUpdate(fichier.doc), 'film')
    expect(comparerVecteurs(v(base), v(fichier))).toBe('contient')
    expect(comparerVecteurs(v(base), v(t))).toBe('contient')
  })
})

describe('nomDepuisFichier', () => {
  it('sans l\'extension, sans la date de nomClasseur, le nom des lots 1 à 3 lisible', () => {
    expect(nomDepuisFichier('Symétrie centrale 2026-10-10 14h05.memc')).toBe('Symétrie centrale')
    expect(nomDepuisFichier('Symétrie centrale 2026-10-10 14h05 (1).memc')).toBe('Symétrie centrale')
    expect(nomDepuisFichier('tableau-2026-10-07-14h05.memc')).toBe('Tableau du 7 octobre 2026')
    expect(nomDepuisFichier('tableau-2026-11-01-08h00.MEMC')).toBe('Tableau du 1er novembre 2026')
    expect(nomDepuisFichier('Fractions.memc')).toBe('Fractions')
    expect(nomDepuisFichier('C:\\Users\\prof\\Fractions 2026-10-10.memc')).toBe('Fractions')
    expect(nomDepuisFichier('.memc')).toBe('Classeur')
    expect(nomDepuisFichier('   ')).toBe('Classeur')
    expect([...nomDepuisFichier('x'.repeat(90) + '.memc')].length).toBe(60)
  })
})

describe('les phrases', () => {
  it('la fenêtre d\'un fichier', () => {
    const t = new Date(2026, 9, 7, 14, 5).getTime()
    expect(texteDuFichier('f.memc', 12, t)).toBe(`« f.memc » : ${pagesLisibles(12)}, enregistré ${dateLisible(t)}.`)
    expect(dateLisible(t).replace(/[\u00a0\u202f]/g, ' ')).toMatch(/^le \S+ 7 octobre 2026 à 14 h 05$/)
    expect(texteDuFichier('f.memc', 1, 0)).toBe(`« f.memc » : ${pagesLisibles(1)}.`)
    const maintenant = new Date(2026, 9, 10, 16, 0).getTime()
    const f = fiche('aaaaaaaaaaaaaaaa', 'Symétrie', { modifie: new Date(2026, 9, 10, 14, 5).getTime() })
    expect(texteDejaLa({ genre: 'meme', fiche: f }, maintenant).replace(/[\u00a0\u202f]/g, ' ')).toBe('Ce classeur est déjà dans la bibliothèque : « Symétrie » (modifié aujourd\'hui à 14 h 05).')
    expect(texteDejaLa({ genre: 'ressemble', fiche: f }, maintenant)).toMatch(/^Ce fichier ressemble au classeur « Symétrie » de la bibliothèque \(modifié/)
    expect(texteComparaison('egal')).toBe('Celui de la bibliothèque contient déjà tout ce fichier.')
    expect(texteComparaison('contenu')).toBe('Celui de la bibliothèque contient déjà tout ce fichier.')
    expect(texteComparaison('contient')).toBe('Le fichier est plus récent : il contient tout ce que la bibliothèque a de ce classeur, et plus.')
    expect(texteComparaison('diverge')).toBe('Le fichier et celui de la bibliothèque ont changé chacun de leur côté.')
    expect(TEXTE_CORBEILLE).toBe('(Un classeur de même origine est dans la corbeille.)')
    expect(raisonCourte(ABIME)).toBe('ce fichier .memc est abîmé')
    expect(raisonCourte(UN_FILM)).toMatch(/film pour les élèves/)
  })

  it('plusieurs fichiers, avant et après ; une bibliothèque', () => {
    const avant = texteAvantPlusieurs([
      { nom: 'a.memc', genre: 'ajouter' }, { nom: 'b.memc', genre: 'ajouter' }, { nom: 'c.memc', genre: 'rien' },
      { nom: 'd.memc', genre: 'mettre-a-jour' }, { nom: 'x.memc', genre: 'illisible', raison: 'ce fichier .memc est abîmé' },
    ])
    expect(avant).toBe('5 fichiers : 2 classeurs à ajouter ; 1 déjà dans la bibliothèque (rien à faire) ; 1 plus récent dans le fichier (mis à jour) ; 1 illisible : « x.memc » : ce fichier .memc est abîmé.')
    expect(texteAvantPlusieurs([{ nom: 'a', genre: 'copie' }, { nom: 'b.memb', genre: 'bibliotheque' }]))
      .toBe('2 fichiers : 1 qui a changé des deux côtés (ajouté comme copie) ; 1 bibliothèque (.memb) à ouvrir seule : « b.memb ».')
    expect(texteApresPlusieurs({ ...bilanVide(), ajoutes: 3, misAJour: 1 })).toBe('3 classeurs ajoutés à la bibliothèque, 1 mis à jour.')
    expect(texteApresPlusieurs({ ...bilanVide(), ajoutes: 1 })).toBe('1 classeur ajouté à la bibliothèque.')
    expect(texteApresPlusieurs(bilanVide())).toBe('Aucun classeur ajouté.')
    expect(texteApresBibliotheque({ ...bilanVide(), ajoutes: 9, misAJour: 2, copies: 1, illisibles: [{ nom: 'x', raison: 'ce fichier .memc est abîmé' }] }))
      .toBe('Bibliothèque ouverte : 9 classeurs ajoutés, 2 mis à jour, 1 ajouté comme copie ; 1 illisible (« x » : ce fichier .memc est abîmé).')
    expect(texteApresBibliotheque({ ...bilanVide(), ajoutes: 2, manques: ['a', 'b'] }))
      .toBe('Bibliothèque ouverte : 2 classeurs ajoutés ; plus de place dans ce navigateur : 2 classeurs n\'ont pas été ajoutés (« a », « b »).')
  })
})

describe('planDesDossiers', () => {
  const d = (id: string, nom: string, parent: string | null, o: Partial<FicheDossier> = {}): FicheDossier => ({ id, nom, parent, couleur: '#3b6fb6', cree: 1, ...o })
  let n = 0
  const idNeuf = () => 'f' + String(++n).padStart(15, '0')
  it('le même id : on garde celui d\'ici ; le même nom sous le même parent : réunis ; sinon créé, parents d\'abord', () => {
    const locaux = [d('aaaaaaaaaaaaaaaa', '5e B', null, { etiquette: '5e B' }), d('bbbbbbbbbbbbbbbb', 'Géométrie', 'aaaaaaaaaaaaaaaa')]
    const importes = [
      // l'enfant avant le parent : le plan remet l'ordre
      { id: '3333333333333333', nom: 'Fonctions', parent: '2222222222222222', couleur: '#2f8a57', cree: 7 },
      { id: 'aaaaaaaaaaaaaaaa', nom: '5e B (renommé ailleurs)', parent: null, couleur: '#c24a4a', cree: 1 },
      { id: '1111111111111111', nom: 'géométrie', parent: 'aaaaaaaaaaaaaaaa', couleur: '#2f8a57', cree: 2 },
      { id: '2222222222222222', nom: '2nde 3', parent: null, couleur: '#c24a4a', etiquette: '2nde 3', cree: 3 },
    ]
    const p = planDesDossiers(locaux, importes, { idNeuf, maintenant: 100 })
    expect(p.correspondance.get('aaaaaaaaaaaaaaaa')).toBe('aaaaaaaaaaaaaaaa')
    expect(p.correspondance.get('1111111111111111')).toBe('bbbbbbbbbbbbbbbb')
    expect(p.reunis).toBe(2)
    expect(p.aCreer.map(x => [x.id, x.nom, x.parent, x.couleur, x.etiquette])).toEqual([
      ['2222222222222222', '2nde 3', null, '#c24a4a', '2nde 3'],
      ['3333333333333333', 'Fonctions', '2222222222222222', '#2f8a57', undefined],
    ])
  })

  it('un id pris par un dossier de la corbeille : un id neuf ; un cycle (A ⇄ B) : l\'un à la racine ; une couleur inconnue : bleu', () => {
    const locaux = [d('aaaaaaaaaaaaaaaa', 'Jeté', null, { corbeille: { t: 1 } })]
    const importes = [
      { id: 'aaaaaaaaaaaaaaaa', nom: 'Jeté', parent: null, couleur: '#123456', cree: 0 },
      { id: '5555555555555555', nom: 'A', parent: '6666666666666666', couleur: '', cree: 0 },
      { id: '6666666666666666', nom: 'B', parent: '5555555555555555', couleur: '', cree: 0 },
    ]
    const p = planDesDossiers(locaux, importes, { idNeuf, maintenant: 100 })
    const jete = p.aCreer.find(x => x.nom === 'Jeté')!
    expect(jete.id).not.toBe('aaaaaaaaaaaaaaaa')
    expect(jete.couleur).toBe('#3b6fb6')
    expect(jete.cree).toBe(100)
    const a = p.aCreer.find(x => x.nom === 'A')!, b = p.aCreer.find(x => x.nom === 'B')!
    expect([a.parent, b.parent].filter(x => x === null).length).toBe(1)
    expect(a.parent === b.id || b.parent === a.id).toBe(true)
  })
})

describe('les copies et les séances publiées (lot 4, corrections migration)', () => {
  it('le bilan dit qu\'une copie ne garde pas les séances publiées de son original', () => {
    expect(texteApresPlusieurs({ ...bilanVide(), ajoutes: 1, copies: 1, publiees: 1 }))
      .toBe(`1 classeur ajouté à la bibliothèque, 1 ajouté comme copie. ${TEXTE_PUBLIEES_COPIES}`)
    expect(texteApresBibliotheque({ ...bilanVide(), ajoutes: 2, copies: 1, publiees: 2 }))
      .toBe(`Bibliothèque ouverte : 2 classeurs ajoutés, 1 ajouté comme copie. ${TEXTE_PUBLIEES_COPIES}`)
    // Sans séance publiée retirée : le bilan d'avant, à la lettre
    expect(texteApresPlusieurs({ ...bilanVide(), copies: 2 })).toBe('2 ajoutés comme copie.')
    expect(bilanVide().publiees).toBe(0)
    expect(TEXTE_PUBLIEES_COPIE).toBe('Ses séances déjà publiées le restent depuis l\'original : en publier une depuis la copie fait un nouveau lien.')
  })
})
