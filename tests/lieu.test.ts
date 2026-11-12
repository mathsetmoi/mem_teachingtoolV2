// Le lieu d'un classeur (lot 4 de l'audit, partie 3 : classeurs/lieu.ts).
// Chaque rangement que le professeur a rencontré devient un cas qui doit
// toujours donner le même chemin : un établissement (LFB niveau › classe,
// MEM), un dossier par élève à plat (Axiom), un dossier choisi pour un
// niveau seul (une clé USB), un niveau sans dossier, un sous-dossier qui a
// son propre nom sur l'ordinateur. Et le lieu donne exactement ce que
// calculaient avant lui le plan d'un déplacement (placeRangee) et le chemin
// du dossier d'un chapitre (cheminDuFichier).
import { describe, expect, it } from 'vitest'
import type { FicheClasseur, FicheDossier } from '../src/classeurs/demarrage'
import type { Emplacement } from '../src/classeurs/emplacements'
import { cheminDuFichier, sousDossiers } from '../src/classeurs/emplacements'
import type { Etablissement } from '../src/classeurs/etablissements'
import { placeRangee, planDeDeplacement } from '../src/classeurs/deplacer-fichier'
import { cheminALEcran, dossierDuNiveau, fichierDuClasseur, lieuDe, lieuSurLeDrive, lieuSurLOrdinateur } from '../src/classeurs/lieu'
import { nomSur } from '../src/fichier'

const dossier = (id: string, nom: string, parent: string | null, o: Partial<FicheDossier> = {}): FicheDossier =>
  ({ id, nom, parent, couleur: '#3b6fb6', cree: 1, ...o })
const classeur = (id: string, nom: string, dossierId: string | null, o: Partial<FicheClasseur> = {}): FicheClasseur =>
  ({ id, base: 'mem-teachingtool-classeur-' + id, nom, dossier: dossierId, etiquettes: [], cree: 1, modifie: 1, ouvert: 0, pages: 1, ...o } as FicheClasseur)

// L'arborescence d'essai, qui imite celle du professeur :
// - LFB : niveau « 2nde » › classe « 2A » › chapitres ; rangé chez
//   l'établissement « LFB classeurs », dossier « 2 » ;
// - MEM : niveau « 5ème », rangé chez « MEM classeurs », dossier « 5ème » ;
//   son sous-dossier « Géométrie » a son propre chemin sur l'ordinateur
//   (« Geo/Plane ») ;
// - Axiom : un dossier par élève (« 0s_Axiom »), relié à plat ;
// - « 4ème » : un dossier choisi pour ce niveau seul (une clé USB) ;
// - « 3ème » : pas rangé ;
// - « Vieux » : dans la corbeille.
const D2 = dossier('d2', '2nde', null), D2A = dossier('d2a', '2A', 'd2')
const D5 = dossier('d5', '5ème', null), GEO = dossier('dgeo', 'Géométrie', 'd5', { pc: ['Geo', 'Plane'] }), SANS = dossier('dsans', 'Sans dossier', 'd5', { pc: [] })
const AX = dossier('dax', '0s_Axiom', null), AXS = dossier('daxs', 'Suites', 'dax')
const D4 = dossier('d4', '4ème', null), D3 = dossier('d3', '3ème', null)
const VIEUX = dossier('dvieux', 'Vieux', null, { corbeille: 5 })
const DOSSIERS = [D2, D2A, D5, GEO, SANS, AX, AXS, D4, D3, VIEUX]
const LFB: Etablissement = { id: '0123456789abcdef', nom: 'LFB classeurs', cree: 1 }
const MEM: Etablissement = { id: '1123456789abcdef', nom: 'MEM classeurs', cree: 1 }
const E2: Emplacement = { id: 'aaaaaaaaaaaaaaaa', genre: 'ordinateur', dossier: 'd2', nom: '2', cree: 1, etablissement: LFB.id, etablissementNom: 'LFB classeurs' }
const E5: Emplacement = { id: 'bbbbbbbbbbbbbbbb', genre: 'ordinateur', dossier: 'd5', nom: '5ème', cree: 1, etablissement: MEM.id, etablissementNom: 'MEM classeurs' }
const EAX: Emplacement = { id: 'cccccccccccccccc', genre: 'ordinateur', dossier: 'dax', nom: '0s_Axiom', cree: 1, aPlat: true }
const E4: Emplacement = { id: 'dddddddddddddddd', genre: 'ordinateur', dossier: 'd4', nom: 'Cle 4eme', cree: 1 }
const EV: Emplacement = { id: 'eeeeeeeeeeeeeeee', genre: 'ordinateur', dossier: 'dvieux', nom: 'Vieux', cree: 1 }
const ED: Emplacement = { id: 'ffffffffffffffff', genre: 'drive', dossier: 'd5', nom: '5ème', cree: 1, compte: 'mem' }
const LISTE = [E2, E5, EAX, E4, EV, ED]
const O = { emplacements: LISTE, dossiers: DOSSIERS, etablissements: [LFB, MEM] }

describe('lieuSurLOrdinateur : où va le fichier d\'un classeur', () => {
  it('LFB, niveau › classe : l\'établissement, le dossier du niveau, la classe, le chapitre', () => {
    const l = lieuSurLOrdinateur('d2a', 'Fractions', O)!
    expect(l.emplacement).toBe(E2)
    expect(l.etablissement).toBe(LFB)
    expect(l.prefixe).toEqual(['LFB classeurs', '2'])
    expect(l.sous).toEqual(['2A'])
    expect(l.dossiers).toEqual(['2A', 'Fractions'])
    expect(l.chemin).toEqual(['LFB classeurs', '2', '2A', 'Fractions'])
    expect(cheminALEcran(l)).toBe('LFB classeurs › 2 › 2A › Fractions')
    expect(dossierDuNiveau(l)).toEqual(['LFB classeurs', '2', '2A'])
  })
  it('MEM : un sous-dossier qui a son propre chemin sur l\'ordinateur, ou aucun', () => {
    expect(lieuSurLOrdinateur('dgeo', 'Symétries', O)!.chemin).toEqual(['MEM classeurs', '5ème', 'Geo', 'Plane', 'Symétries'])
    expect(lieuSurLOrdinateur('dsans', 'Symétries', O)!.chemin).toEqual(['MEM classeurs', '5ème', 'Symétries'])
    expect(lieuSurLOrdinateur('d5', 'Symétries', O)!.chemin).toEqual(['MEM classeurs', '5ème', 'Symétries'])
  })
  it('Axiom, à plat : le fichier directement dans le dossier de l\'élève (et ses sous-dossiers)', () => {
    expect(lieuSurLOrdinateur('dax', 'Limites', O)!.chemin).toEqual(['0s_Axiom'])
    expect(lieuSurLOrdinateur('daxs', 'Limites', O)!.chemin).toEqual(['0s_Axiom', 'Suites'])
    expect(lieuSurLOrdinateur('dax', 'Limites', O)!.dossiers).toEqual([])
  })
  it('un dossier choisi pour ce niveau seul (une clé USB) : son nom, puis le chapitre, en nom sain', () => {
    const sur = nomSur('Th: a/b')
    expect(lieuSurLOrdinateur('d4', 'Th: a/b', O)!.chemin).toEqual(['Cle 4eme', sur])
    expect(lieuSurLOrdinateur('d4', 'Th: a/b', O)!.etablissement).toBeNull()
  })
  it('pas de lieu : un niveau sans dossier, la racine, la corbeille', () => {
    expect(lieuSurLOrdinateur('d3', 'Fractions', O)).toBeNull()
    expect(lieuSurLOrdinateur(null, 'Fractions', O)).toBeNull()
    expect(lieuSurLOrdinateur('dvieux', 'Fractions', O)).toBeNull()
  })
  it('l\'établissement retiré de la liste : le nom gardé au rangement reste en tête du chemin', () => {
    expect(lieuSurLOrdinateur('d2a', 'Fractions', { ...O, etablissements: [MEM] })!.chemin).toEqual(['LFB classeurs', '2', '2A', 'Fractions'])
    expect(lieuSurLOrdinateur('d2a', 'Fractions', { ...O, etablissements: [MEM] })!.etablissement).toBeNull()
  })
  it('le nom du dossier que donne sa poignée remplace celui gardé dans l\'emplacement', () => {
    expect(lieuSurLOrdinateur('d4', 'Fractions', O, { racine: 'CLE USB' })!.chemin).toEqual(['CLE USB', 'Fractions'])
  })
})

describe('le lieu donne les mêmes chemins qu\'avant lui', () => {
  const cas: [string | null, string][] = [['d2', 'Fractions'], ['d2a', 'Probas'], ['d5', 'Symétries'], ['dgeo', 'Aires'], ['dsans', 'Aires'], ['dax', 'Limites'], ['daxs', 'Limites'], ['d4', 'Th: a/b'], ['d3', 'Fonctions'], [null, 'Seul'], ['dvieux', 'Vieux']]
  it.each(cas)('%s, « %s » : le plan d\'un déplacement (placeRangee) et le dossier du chapitre (cheminDuFichier)', (id, nom) => {
    const l = lieuSurLOrdinateur(id, nom, O)
    const p = placeRangee(id, nom, O)
    if (!p) { expect(l).toBeNull(); return }
    expect(l).not.toBeNull()
    expect(l!.chemin).toEqual(p.chemin)
    expect(l!.dossiers).toEqual(p.sous)
    expect(l!.dossiers).toEqual(cheminDuFichier(id, nom, p.emplacement, DOSSIERS))
    expect(l!.sous).toEqual(sousDossiers(id, p.emplacement.dossier, DOSSIERS))
  })
})

describe('fichierDuClasseur : le fichier où le classeur est écrit', () => {
  const vecteur = new Uint8Array([0])
  it('pas de fichier', () => {
    expect(fichierDuClasseur(classeur('c0', 'Rien', 'd2'))).toBeNull()
  })
  it('rangé par l\'outil dans le dossier de son niveau, dans celui d\'un autre niveau, choisi à la main', () => {
    const prefixe = ['LFB classeurs', '2']
    const ici = classeur('c1', 'Fractions', 'd2', { cle: { nom: 'Fractions.memc', chemin: ['LFB classeurs', '2', 'Fractions'], date: 1, vecteur } })
    const ailleurs = classeur('c2', 'Fractions', 'd2', { cle: { nom: 'Fractions.memc', chemin: ['LFB classeurs', '5', 'Fractions'], date: 1, vecteur } })
    const main = classeur('c3', 'Fractions', 'd2', { cle: { nom: 'Fractions.memc', chemin: ['Mes cours'], date: 1, vecteur } })
    const choisi = classeur('c4', 'Fractions', 'd2', { cle: { nom: 'Fractions.memc', date: 1, vecteur } })
    expect(fichierDuClasseur(ici, prefixe)).toEqual({ nom: 'Fractions.memc', chemin: ['LFB classeurs', '2', 'Fractions'], rangement: 'ici' })
    expect(fichierDuClasseur(ailleurs, prefixe)!.rangement).toBe('ailleurs')
    expect(fichierDuClasseur(main, prefixe)!.rangement).toBe('main')
    expect(fichierDuClasseur(choisi, prefixe)).toEqual({ nom: 'Fractions.memc', chemin: null, rangement: 'inconnu' })
  })
  it('lieuDe : les deux d\'un coup', () => {
    const f = classeur('c1', 'Fractions', 'd2a', { cle: { nom: 'Fractions.memc', chemin: ['LFB classeurs', '2', '2A', 'Fractions'], date: 1, vecteur } })
    const l = lieuDe(f, O)
    expect(l.ordinateur!.chemin).toEqual(['LFB classeurs', '2', '2A', 'Fractions'])
    expect(l.fichier!.rangement).toBe('ici')
    expect(lieuDe(classeur('c5', 'Seul', 'd3'), O)).toEqual({ ordinateur: null, fichier: null })
  })
})

describe('lieuSurLeDrive : où va la copie sur le Drive', () => {
  it('le niveau relié à ce Drive, et ses sous-dossiers ; sinon le dossier des sauvegardes', () => {
    expect(lieuSurLeDrive('dgeo', 'mem', O)).toEqual({ emplacement: ED, niveau: D5 })
    expect(lieuSurLeDrive('dgeo', 'lfb', O)).toBeNull()
    expect(lieuSurLeDrive('d2', 'mem', O)).toBeNull()
    expect(lieuSurLeDrive(null, 'mem', O)).toBeNull()
  })
})

describe('un seul modèle : le plan d\'un déplacement et le chemin noté tombent d\'accord', () => {
  it('l\'établissement retiré de la liste : un classeur déjà à sa place n\'est pas déplacé', () => {
    // Le chemin noté dans la fiche porte le nom gardé au rangement ; avant le
    // modèle unique, le plan l'oubliait et voulait déplacer le fichier
    const f = classeur('c1', 'Fractions', 'd2a', { cle: { nom: 'Fractions.memc', chemin: ['LFB classeurs', '2', '2A', 'Fractions'], date: 1, vecteur: new Uint8Array([0]) } })
    const sansLFB = { ...O, etablissements: [MEM] }
    expect(planDeDeplacement({ fiche: f, cible: 'd2a', ...sansLFB }).genre).toBe('reste-meme-place')
    expect(planDeDeplacement({ fiche: f, cible: 'd2a', ...O }).genre).toBe('reste-meme-place')
  })
})
