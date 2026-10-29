// « Déplacer le classeur… » : le fichier suit (lot 18). Le plan d'un
// déplacement (deplacer-fichier.ts, la partie pure) : ce qu'il advient du
// fichier d'un classeur selon d'où il vient et où il va, la ligne qui le dit
// sous l'arbre de la fenêtre, et les phrases d'un échec.
import { describe, expect, it } from 'vitest'
import type { FicheClasseur, FicheDossier } from '../src/classeurs/demarrage'
import type { Emplacement } from '../src/classeurs/emplacements'
import type { Etablissement } from '../src/classeurs/etablissements'
import { placeRangee, planDeDeplacement, texteEchec } from '../src/classeurs/deplacer-fichier'
import { nomSur } from '../src/fichier'

const dossier = (id: string, nom: string, parent: string | null, o: Partial<FicheDossier> = {}): FicheDossier =>
  ({ id, nom, parent, couleur: '#3b6fb6', cree: 1, ...o })
const classeur = (id: string, nom: string, dossierId: string | null, o: Partial<FicheClasseur> = {}): FicheClasseur =>
  ({ id, base: 'mem-teachingtool-classeur-' + id, nom, dossier: dossierId, etiquettes: [], cree: 1, modifie: 1, ouvert: 0, pages: 1, ...o } as FicheClasseur)

// Trois niveaux : « 5eme » rangé chez l'établissement « LFB classeurs » (le
// dossier « 5 »), « 4eme » relié à un dossier pour lui seul (« Cle 4eme »,
// lot 7), « 3eme » pas rangé ; « Géométrie » est un sous-dossier de « 5eme »
const D5 = dossier('d5', '5eme', null), D4 = dossier('d4', '4eme', null), D3 = dossier('d3', '3eme', null)
const GEO = dossier('dgeo', 'Géométrie', 'd5'), SOUS3 = dossier('dsous3', 'Fonctions', 'd3')
const DOSSIERS = [D5, D4, D3, GEO, SOUS3]
const LFB: Etablissement = { id: '0123456789abcdef', nom: 'LFB classeurs', cree: 1 }
const E5: Emplacement = { id: 'aaaaaaaaaaaaaaaa', genre: 'ordinateur', dossier: 'd5', nom: '5', cree: 1, etablissement: LFB.id }
const E4: Emplacement = { id: 'bbbbbbbbbbbbbbbb', genre: 'ordinateur', dossier: 'd4', nom: 'Cle 4eme', cree: 1 }
const O = { emplacements: [E5, E4], dossiers: DOSSIERS, etablissements: [LFB] }

/** « Fractions », rangé dans « 5eme », son fichier à sa place */
const FRACTIONS = classeur('c1', 'Fractions', 'd5', { cle: { nom: 'Fractions.memc', chemin: ['LFB classeurs', '5', 'Fractions'], date: 10, vecteur: new Uint8Array([0]) } })

describe('placeRangee : où irait le fichier d\'un classeur rangé dans ce dossier', () => {
  it('chez un établissement : son nom, le dossier du niveau, les sous-dossiers, le dossier du chapitre', () => {
    expect(placeRangee('d5', 'Fractions', O)).toEqual({ emplacement: E5, etablissement: LFB, chemin: ['LFB classeurs', '5', 'Fractions'], sous: ['Fractions'] })
    expect(placeRangee('dgeo', 'Fractions', O)).toEqual({ emplacement: E5, etablissement: LFB, chemin: ['LFB classeurs', '5', 'Géométrie', 'Fractions'], sous: ['Géométrie', 'Fractions'] })
  })
  it('un dossier pour ce niveau seul (lot 7) : le dossier, puis le chapitre ; le nom passé au crible des noms de fichier', () => {
    const sur = nomSur('Th: a/b')
    expect(sur).not.toBe('Th: a/b')
    expect(placeRangee('d4', 'Th: a/b', O)).toEqual({ emplacement: E4, etablissement: null, chemin: ['Cle 4eme', sur], sous: [sur] })
  })
  it('un niveau pas rangé, la racine : rien ; un établissement disparu : le dossier du niveau seul', () => {
    expect(placeRangee('d3', 'F', O)).toBeNull()
    expect(placeRangee('dsous3', 'F', O)).toBeNull()
    expect(placeRangee(null, 'F', O)).toBeNull()
    expect(placeRangee('d5', 'F', { ...O, etablissements: [] })?.chemin).toEqual(['5', 'F'])
  })
})

describe('planDeDeplacement : ce qu\'il advient du fichier', () => {
  it('un classeur rangé vers un autre niveau rangé : le fichier suit', () => {
    const p = planDeDeplacement({ fiche: FRACTIONS, cible: 'd4', ...O })
    expect(p.genre).toBe('suit')
    expect(p.nouveau?.chemin).toEqual(['Cle 4eme', 'Fractions'])
    expect(p.ancien).toEqual({ chemin: ['LFB classeurs', '5', 'Fractions'], emplacement: E5, sous: ['Fractions'] })
    expect(p.texte).toBe('Son fichier ira dans « Cle 4eme › Fractions ». L\'ancien sera retiré une fois le nouveau écrit.')
  })
  it('vers un niveau pas rangé (ou l\'un de ses sous-dossiers) : il reste, la ligne nomme le niveau', () => {
    const p = planDeDeplacement({ fiche: FRACTIONS, cible: 'd3', ...O })
    expect(p.genre).toBe('reste-pas-range')
    expect(p.nouveau).toBeUndefined()
    expect(p.ancien?.emplacement).toEqual(E5)
    expect(p.texte).toBe('Le niveau « 3eme » n\'est pas rangé dans un dossier : le fichier reste où il est.')
    expect(planDeDeplacement({ fiche: FRACTIONS, cible: 'dsous3', ...O }).texte).toBe('Le niveau « 3eme » n\'est pas rangé dans un dossier : le fichier reste où il est.')
  })
  it('vers la racine : il reste', () => {
    const p = planDeDeplacement({ fiche: FRACTIONS, cible: null, ...O })
    expect(p.genre).toBe('reste-pas-range')
    expect(p.texte).toBe('La racine de la bibliothèque n\'a pas de dossier : le fichier reste où il est.')
  })
  it('le même dossier : rien à faire, le fichier est déjà là', () => {
    const p = planDeDeplacement({ fiche: FRACTIONS, cible: 'd5', ...O })
    expect(p.genre).toBe('reste-meme-place')
    expect(p.texte).toBe('Son fichier est déjà dans « LFB classeurs › 5 › Fractions ».')
  })
  it('un fichier choisi à la main (sans chemin) : il reste, où qu\'aille le classeur', () => {
    const f = classeur('c2', 'Symétrie', 'd5', { cle: { nom: 'Symétrie.memc', date: 3 } })
    for (const cible of ['d4', 'd3', 'dgeo', null]) {
      const p = planDeDeplacement({ fiche: f, cible, ...O })
      expect(p.genre).toBe('reste-choisi-a-la-main')
      expect(p.ancien).toBeUndefined()
      expect(p.texte).toBe('« Symétrie.memc » a été choisi à la main : il reste où il est.')
    }
  })
  it('sans fichier vers un niveau rangé : il en reçoit un ; vers un niveau pas rangé : rien à dire', () => {
    const f = classeur('c3', 'Angles', null)
    const p = planDeDeplacement({ fiche: f, cible: 'd4', ...O })
    expect(p.genre).toBe('recoit-un-fichier')
    expect(p.nouveau?.chemin).toEqual(['Cle 4eme', 'Angles'])
    expect(p.texte).toBe('Il recevra son fichier dans « Cle 4eme › Angles », écrit tout seul.')
    expect(planDeDeplacement({ fiche: f, cible: 'd3', ...O })).toEqual({ genre: 'sans-fichier', texte: '' })
    expect(planDeDeplacement({ fiche: f, cible: null, ...O })).toEqual({ genre: 'sans-fichier', texte: '' })
  })
  it('le même niveau, mais un sous-dossier : il suit (un autre chemin sous le même dossier)', () => {
    const p = planDeDeplacement({ fiche: FRACTIONS, cible: 'dgeo', ...O })
    expect(p.genre).toBe('suit')
    expect(p.nouveau?.chemin).toEqual(['LFB classeurs', '5', 'Géométrie', 'Fractions'])
    expect(p.nouveau?.emplacement).toEqual(E5)
    expect(p.ancien?.sous).toEqual(['Fractions'])
    expect(p.texte).toBe('Son fichier ira dans « LFB classeurs › 5 › Géométrie › Fractions ». L\'ancien sera retiré une fois le nouveau écrit.')
  })
  it('un emplacement chez un établissement : le chemin lisible commence par le nom de l\'établissement', () => {
    const f = classeur('c4', 'Thales', 'd4', { cle: { nom: 'Thales.memc', chemin: ['Cle 4eme', 'Thales'] } })
    const p = planDeDeplacement({ fiche: f, cible: 'd5', ...O })
    expect(p.genre).toBe('suit')
    expect(p.nouveau?.chemin).toEqual(['LFB classeurs', '5', 'Thales'])
    expect(p.nouveau?.etablissement).toEqual(LFB)
    expect(p.ancien).toEqual({ chemin: ['Cle 4eme', 'Thales'], emplacement: E4, sous: ['Thales'] })
    expect(p.texte).toBe('Son fichier ira dans « LFB classeurs › 5 › Thales ». L\'ancien sera retiré une fois le nouveau écrit.')
  })
  it('le chemin noté ne commence pas par le dossier du niveau d\'avant (rangé ailleurs, « Un autre dossier de l\'ordinateur… ») : l\'ancien dossier n\'est pas retrouvé par le niveau', () => {
    const f = classeur('c5', 'Probas', 'd5', { cle: { nom: 'Probas.memc', chemin: ['2_13_Proba'] } })
    const p = planDeDeplacement({ fiche: f, cible: 'd4', ...O })
    expect(p.genre).toBe('suit')
    expect(p.ancien).toEqual({ chemin: ['2_13_Proba'], emplacement: null, sous: null })
    // Et depuis un niveau pas rangé vers sa place d'aujourd'hui : rien à faire
    const g = classeur('c6', 'Fractions', 'd3', { cle: { nom: 'Fractions.memc', chemin: ['LFB classeurs', '5', 'Fractions'] } })
    expect(planDeDeplacement({ fiche: g, cible: 'd5', ...O }).genre).toBe('reste-meme-place')
  })
})

describe('texteEchec : pourquoi le fichier n\'a pas été déplacé', () => {
  const f = { nom: 'Fractions', cle: { nom: 'Fractions.memc', chemin: ['LFB classeurs', '5', 'Fractions'] } }
  const cible = { nom: '4', chemin: ['Cle 4eme', 'Fractions'] }
  it('un fichier plus riche (l\'histoire perdue ici, ou un fichier déjà là-bas) : ouvrez-le d\'abord', () => {
    expect(texteEchec({ r: 'conflit', raison: 'Fractions.memc' }, f, cible)).toBe('Le fichier « Fractions.memc » a des changements que ce classeur n\'a pas : il n\'est pas déplacé. Ouvrez-le d\'abord (Ctrl + O).')
    expect(texteEchec({ r: 'plus-riche', raison: 'Fractions.memc' }, f, cible)).toBe('Le fichier « Fractions.memc » déjà dans « Cle 4eme › Fractions » a des changements que ce classeur n\'a pas : il n\'est pas déplacé. Ouvrez-le d\'abord (Ctrl + O).')
  })
  it('un autre onglet, la permission, une erreur, rien', () => {
    expect(texteEchec({ r: 'autre-onglet', raison: '' }, f, cible)).toBe('Son fichier n\'a pas été déplacé : un autre onglet est ouvert sur ce classeur. Fermez-le, puis recommencez.')
    expect(texteEchec({ r: 'permission', raison: '' }, f, cible)).toBe('Son fichier n\'a pas été déplacé : le navigateur n\'a pas permis d\'écrire dans « 4 ».')
    expect(texteEchec({ r: 'erreur', raison: 'le disque est plein' }, f, cible)).toBe('Son fichier n\'a pas été déplacé : le disque est plein.')
    expect(texteEchec({ r: 'rien', raison: '' }, f, cible)).toBe('Son fichier reste dans « LFB classeurs › 5 › Fractions ».')
    expect(texteEchec({ r: 'rien', raison: '' }, { nom: 'S', cle: { nom: 'S.memc' } }, cible)).toBe('Son fichier reste dans « S.memc ».')
  })
})
