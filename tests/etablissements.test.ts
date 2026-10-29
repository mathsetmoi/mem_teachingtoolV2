// Les établissements (lot 18) : la liste relue de l'index, les niveaux « Plus
// tard », le chemin pour l'écran et la phrase du rangement d'un niveau ; puis
// l'index lui-même sur un faux registre (garder, retirer, noter « Plus tard »).
import { describe, expect, it } from 'vitest'
import {
  REGLAGE_ETABLISSEMENTS, REGLAGE_RANGER_PLUS_TARD, cheminLisible, etablissements, garderEtablissement, lireEtablissements, lirePlusTard, noterPlusTard,
  nomDEtablissement, nouvelId, plusTard, reglagePoigneeEtablissement, retirerEtablissement, texteDuRangement,
} from '../src/classeurs/etablissements'
import type { BilanRelier } from '../src/classeurs/ordinateur'
import type { Registre } from '../src/classeurs/registre'

const ID1 = '0123456789abcdef', ID2 = 'fedcba9876543210'
const bilan = (b: Partial<BilanRelier> = {}): BilanRelier => ({ ecrits: [], adoptes: [], plusRiches: [], ailleurs: [], relies: [], aRelire: [], echecs: [], ...b })

describe('les établissements : la liste relue', () => {
  it('lireEtablissements : seulement ce qui est bien formé, sans doublon, par nom', () => {
    const l = lireEtablissements([
      { id: ID2, nom: 'MEM classeurs', cree: 4 },
      { id: ID1, nom: 'LFB classeurs', cree: 3 },
      { id: ID1, nom: 'doublon' },
      { id: 'court', nom: 'x' },
      { id: 'aaaaaaaaaaaaaaaa', nom: '   ' },
      { id: 'bbbbbbbbbbbbbbbb' },
      null, 12, 'texte',
    ])
    expect(l).toEqual([
      { id: ID1, nom: 'LFB classeurs', cree: 3 },
      { id: ID2, nom: 'MEM classeurs', cree: 4 },
    ])
    expect(lireEtablissements(undefined)).toEqual([])
    expect(lireEtablissements({ id: ID1, nom: 'x' })).toEqual([])
    // Une date absente vaut 0 (pas une erreur)
    expect(lireEtablissements([{ id: ID1, nom: 'Sans date' }])).toEqual([{ id: ID1, nom: 'Sans date', cree: 0 }])
  })

  it('lirePlusTard : des ids de dossiers, sans doublon ni vide', () => {
    expect(lirePlusTard(['d5a', 'd4a', 'd5a', '', 12, null])).toEqual(['d5a', 'd4a'])
    expect(lirePlusTard(undefined)).toEqual([])
    expect(lirePlusTard('d5a')).toEqual([])
  })

  it('les clés des réglages : des clés nouvelles, jamais celles des emplacements', () => {
    expect(REGLAGE_ETABLISSEMENTS).toBe('etablissements')
    expect(REGLAGE_RANGER_PLUS_TARD).toBe('ranger-plus-tard')
    expect(reglagePoigneeEtablissement(ID1)).toBe('etablissement-poignee:' + ID1)
  })

  it('nouvelId : 16 chiffres hexadécimaux, deux tirages diffèrent', () => {
    const a = nouvelId(), b = nouvelId()
    expect(a).toMatch(/^[0-9a-f]{16}$/)
    expect(a).not.toBe(b)
  })

  it('cheminLisible : les dossiers séparés par « › »', () => {
    expect(cheminLisible(['LFB classeurs', '2', '2_13_Probas'])).toBe('LFB classeurs › 2 › 2_13_Probas')
    expect(cheminLisible(['Cle 4eme'])).toBe('Cle 4eme')
  })
})

describe('la phrase du rangement', () => {
  const chemin = ['LFB classeurs', '2nde']

  it('sans classeur : « iront dans … (il n’y en a pas encore) »', () => {
    expect(texteDuRangement({ niveau: '2nde', chemin, bilan: bilan() })).toBe('Les classeurs de « 2nde » iront dans « LFB classeurs › 2nde » (il n\'y en a pas encore).')
  })

  it('écrits, déjà là, à ouvrir d’abord : la phrase de la maquette', () => {
    const b = bilan({ ecrits: ['A', 'B', 'C', 'D', 'E', 'F'], adoptes: ['G'], plusRiches: ['Fonctions'] })
    expect(texteDuRangement({ niveau: '2nde', chemin, bilan: b }))
      .toBe('Les classeurs de « 2nde » se rangent dans « LFB classeurs › 2nde » : 6 écrits, 1 déjà là, 1 à ouvrir d\'abord (« Fonctions » : son fichier a des changements que la bibliothèque n\'a pas).')
  })

  it('un seul écrit, un fichier gardé ailleurs, un échec avec sa raison', () => {
    const b = bilan({ ecrits: ['Fractions'], ailleurs: ['Symétrie'], echecs: ['X'], raison: 'la clé est pleine' })
    expect(texteDuRangement({ niveau: '5ème', chemin: ['Cle 5eme'], bilan: b }))
      .toBe('Les classeurs de « 5ème » se rangent dans « Cle 5eme » : 1 écrit, 1 garde son fichier ailleurs (« Symétrie »), 1 n\'a pas pu être écrit (« X » : la clé est pleine).')
  })

  it('au pluriel : « leur fichier », « gardent », « n’ont pas pu être écrits », et « 3 autres »', () => {
    const b = bilan({ plusRiches: ['A', 'B'], ailleurs: ['C', 'D'], echecs: ['E', 'F', 'G', 'H', 'I', 'J'] })
    expect(texteDuRangement({ niveau: '2nde', chemin, bilan: b }))
      .toBe('Les classeurs de « 2nde » se rangent dans « LFB classeurs › 2nde » : 2 à ouvrir d\'abord (« A », « B » : leur fichier a des changements que la bibliothèque n\'a pas), 2 gardent leur fichier ailleurs (« C », « D »), 6 n\'ont pas pu être écrits (« E », « F », « G » et 3 autres).')
  })

  it('tous déjà à leur place (« Mettre à jour ») : « Rien de nouveau : les 6 classeurs … sont dans … »', () => {
    expect(texteDuRangement({ niveau: '2nde', chemin, bilan: bilan({ relies: ['A', 'B', 'C', 'D', 'E', 'F'] }) }))
      .toBe('Rien de nouveau : les 6 classeurs de « 2nde » sont dans « LFB classeurs › 2nde ».')
    expect(texteDuRangement({ niveau: '2nde', chemin, bilan: bilan({ relies: ['A'] }) }))
      .toBe('Rien de nouveau : le classeur de « 2nde » est dans « LFB classeurs › 2nde ».')
    // Avec un écrit : « 1 écrit, 5 déjà à leur place »
    expect(texteDuRangement({ niveau: '2nde', chemin, bilan: bilan({ ecrits: ['G'], relies: ['A', 'B', 'C', 'D', 'E'] }) }))
      .toBe('Les classeurs de « 2nde » se rangent dans « LFB classeurs › 2nde » : 1 écrit, 5 déjà à leur place.')
    expect(texteDuRangement({ niveau: '2nde', chemin, bilan: bilan({ adoptes: ['G'], relies: ['A'] }) }))
      .toBe('Les classeurs de « 2nde » se rangent dans « LFB classeurs › 2nde » : 1 déjà là, 1 déjà à sa place.')
  })

  it('le fichier d’avant qui n’a pas pu être relu : il reste celui du classeur, à ouvrir puis « Mettre à jour »', () => {
    expect(texteDuRangement({ niveau: '2nde', chemin, bilan: bilan({ ecrits: ['A'], aRelire: ['Probas'] }), ancien: 'MEM classeurs › 2' }))
      .toBe('Les classeurs de « 2nde » se rangent dans « LFB classeurs › 2nde » : 1 écrit, 1 garde son fichier d\'avant (« Probas » : ce navigateur n\'a pas pu le relire ; ouvrez-le, puis « Mettre à jour »). Les fichiers d\'avant restent dans « MEM classeurs › 2 ».')
    expect(texteDuRangement({ niveau: '2nde', chemin, bilan: bilan({ aRelire: ['Probas', 'Stats'] }) }))
      .toBe('Les classeurs de « 2nde » se rangent dans « LFB classeurs › 2nde » : 2 gardent leur fichier d\'avant (« Probas », « Stats » : ce navigateur n\'a pas pu le relire ; ouvrez-les, puis « Mettre à jour »).')
  })

  it('après « Changer… » : les fichiers d’avant restent où ils sont', () => {
    expect(texteDuRangement({ niveau: '2nde', chemin, bilan: bilan({ ecrits: ['A'] }), ancien: 'MEM classeurs › 2nde' }))
      .toBe('Les classeurs de « 2nde » se rangent dans « LFB classeurs › 2nde » : 1 écrit. Les fichiers d\'avant restent dans « MEM classeurs › 2nde ».')
    expect(texteDuRangement({ niveau: '2nde', chemin, bilan: bilan(), ancien: null })).not.toMatch(/d'avant/)
  })
})

/** Un faux registre : les réglages en mémoire */
function fauxRegistre() {
  const etat = new Map<string, unknown>()
  const r = {
    async reglage(cle: string) { return etat.get(cle) },
    async ecrireReglage(cle: string, v: unknown) { if (v === undefined) etat.delete(cle); else etat.set(cle, v) },
  }
  return { registre: r as unknown as Registre, etat }
}

describe('l’index : garder, retirer, « Plus tard »', () => {
  it('garderEtablissement note la poignée puis la fiche ; la liste revient par nom', async () => {
    const { registre, etat } = fauxRegistre()
    const p1 = { kind: 'directory', name: 'MEM classeurs' }, p2 = { kind: 'directory', name: 'LFB classeurs' }
    await garderEtablissement(registre, { id: ID1, nom: 'MEM classeurs', cree: 1 }, p1)
    await garderEtablissement(registre, { id: ID2, nom: 'LFB classeurs', cree: 2 }, p2)
    expect(etat.get(reglagePoigneeEtablissement(ID1))).toBe(p1)
    expect(await etablissements(registre)).toEqual([{ id: ID2, nom: 'LFB classeurs', cree: 2 }, { id: ID1, nom: 'MEM classeurs', cree: 1 }])
    // Le même id de nouveau : remplacé, pas doublé
    await garderEtablissement(registre, { id: ID1, nom: 'MEM classeurs (2)', cree: 1 }, p1)
    expect((await etablissements(registre)).map(e => e.nom)).toEqual(['LFB classeurs', 'MEM classeurs (2)'])
  })

  it('une poignée qui ne se garde pas : rien n’est noté, l’erreur remonte', async () => {
    const { registre, etat } = fauxRegistre()
    registre.ecrireReglage = async () => { throw new DOMException('simulé', 'DataCloneError') }
    await expect(garderEtablissement(registre, { id: ID1, nom: 'X', cree: 1 }, {})).rejects.toThrow()
    expect(etat.size).toBe(0)
  })

  it('retirerEtablissement : la fiche et la poignée s’en vont, rien d’autre', async () => {
    const { registre, etat } = fauxRegistre()
    await garderEtablissement(registre, { id: ID1, nom: 'A', cree: 1 }, { name: 'A' })
    await garderEtablissement(registre, { id: ID2, nom: 'B', cree: 1 }, { name: 'B' })
    etat.set('emplacement-poignee:xxxx', { name: 'niveau' })
    await retirerEtablissement(registre, ID1)
    expect(await etablissements(registre)).toEqual([{ id: ID2, nom: 'B', cree: 1 }])
    expect(etat.has(reglagePoigneeEtablissement(ID1))).toBe(false)
    expect(etat.get('emplacement-poignee:xxxx')).toEqual({ name: 'niveau' })
  })

  it('noterPlusTard : une fois par niveau', async () => {
    const { registre } = fauxRegistre()
    expect(await plusTard(registre)).toEqual([])
    await noterPlusTard(registre, 'd5a')
    await noterPlusTard(registre, 'd4a')
    await noterPlusTard(registre, 'd5a')
    expect(await plusTard(registre)).toEqual(['d5a', 'd4a'])
  })
})

describe('le nom de l’établissement d’un emplacement', () => {
  const liste = [{ id: '0123456789abcdef', nom: 'LFB classeurs', cree: 1 }]
  it('celui de la liste ; sinon celui gardé par l’emplacement (l’établissement retiré) ; null pour un dossier seul', () => {
    expect(nomDEtablissement({ etablissement: '0123456789abcdef', etablissementNom: 'Ancien nom' }, liste)).toBe('LFB classeurs')
    expect(nomDEtablissement({ etablissement: 'fedcba9876543210', etablissementNom: 'MEM classeurs' }, liste)).toBe('MEM classeurs')
    expect(nomDEtablissement({ etablissement: 'fedcba9876543210' }, liste)).toBeNull()
    expect(nomDEtablissement({}, liste)).toBeNull()
    expect(nomDEtablissement({ etablissementNom: 'MEM classeurs' }, liste)).toBeNull()
  })
})
