// La publication : le site et le relais Apps Script doivent parler des mêmes
// dossiers et de la même extension, et le relais ne doit servir que des
// replays rangés là où il faut. Le relais tourne ici dans un bac à sable,
// avec un faux Drive.
import { existsSync, readFileSync, readdirSync, statSync } from 'node:fs'
import { join } from 'node:path'
import { runInNewContext } from 'node:vm'
import { describe, expect, it } from 'vitest'
import * as Y from 'yjs'
import { COMPTES, EXTENSION, EXTENSION_SAUVEGARDE, relaisValable } from '../src/publication/comptes'
import { ecrireFilm } from '../src/revoir/format'
import { ecrireTableau } from '../src/fichier'
import type { FilmEleve } from '../src/revoir/format'

const RACINE = join(__dirname, '..')
const SOURCE_RELAIS = readFileSync(join(RACINE, 'relais/relais-seances.gs'), 'utf8')

interface FauxDossier { nom: string; proprietaire: string; corbeille?: boolean }
interface FauxFichier { nom: string; contenu: string; parents: FauxDossier[]; corbeille?: boolean; proprietaire?: string; modifie?: number }

/** Le relais, chargé avec un faux Drive dont `moi` est le compte */
function relais(fichiers: Record<string, FauxFichier>, moi = 'prof@exemple.fr') {
  const reponse = (texte: string) => ({ texte, setMimeType() { return this } })
  const iterer = <T>(l: T[]) => { let i = 0; return { hasNext: () => i < l.length, next: () => l[i++] } }
  const dossier = (d: FauxDossier) => ({ getName: () => d.nom, isTrashed: () => !!d.corbeille, getOwner: () => ({ getEmail: () => d.proprietaire }) })
  const bac: Record<string, unknown> = {
    console: { log() {}, error() {} },
    Session: { getEffectiveUser: () => ({ getEmail: () => moi }) },
    CacheService: { getScriptCache: () => ({ get: () => null, put() {} }) },
    ContentService: { MimeType: { JSON: 'json' }, createTextOutput: reponse },
    DriveApp: {
      getFileById(id: string) {
        const f = fichiers[id]
        if (!f) throw new Error('introuvable')
        return { getName: () => f.nom, isTrashed: () => !!f.corbeille, getParents: () => iterer(f.parents.map(dossier)), getBlob: () => ({ getDataAsString: () => f.contenu }) }
      },
      // La recherche du Drive : « title contains 'code' and trashed = false »
      searchFiles(requete: string) {
        const mot = /contains '([^']+)'/.exec(requete)?.[1] ?? ''
        return iterer(Object.values(fichiers).filter(f => f.nom.includes(mot) && !f.corbeille).map(f => ({
          getName: () => f.nom, isTrashed: () => !!f.corbeille, getOwner: () => ({ getEmail: () => f.proprietaire ?? moi }),
          getLastUpdated: () => new Date(f.modifie ?? 0), getBlob: () => ({ getDataAsString: () => f.contenu }),
        })))
      },
      getFoldersByName: (nom: string) => iterer(Object.values(fichiers).flatMap(f => f.parents).filter(d => d.nom === nom).map(dossier)),
    },
  }
  runInNewContext(SOURCE_RELAIS, bac)
  const doGet = bac.doGet as (e: unknown) => { texte: string }
  return (parametres: Record<string, string>) => doGet({ parameter: parametres }).texte
}

function filmMinimal(): FilmEleve {
  return { format: 'mem-revoir', v: 1, titre: 'Essai', date: 0, ordre: ['p'], pages: [{ id: 'p', fond: 'blanc', origine: { x: 0, y: 0 }, formes: [] }], etapes: [], chapitres: [], images: {} }
}

describe('le site et le relais parlent des mêmes dossiers', () => {
  const dossiersDuRelais = runInNewContext(`${SOURCE_RELAIS}; DOSSIERS`, { console }) as string[]

  it('chaque compte a son dossier, et le relais les connaît tous', () => {
    expect(COMPTES.map(c => c.dossier)).toEqual(['MEM - Replay séances', 'LFB - Replay séances'])
    expect([...dossiersDuRelais].sort()).toEqual(COMPTES.map(c => c.dossier).sort())
  })

  it("même extension, et le relais reconnaît le début d'un vrai fichier séance", async () => {
    expect(EXTENSION).toBe('.mem')
    expect(runInNewContext(`${SOURCE_RELAIS}; EXTENSION`, { console })).toBe(EXTENSION)
    const debut = runInNewContext(`${SOURCE_RELAIS}; DEBUT`, { console }) as string
    expect((await ecrireFilm(filmMinimal())).startsWith(debut)).toBe(true)
  })

  it('les dossiers des sauvegardes (lot 4 C10) ne sont jamais ceux que sert le relais', () => {
    expect(COMPTES.map(c => c.sauvegardes)).toEqual(['MEM - Sauvegardes', 'LFB - Sauvegardes'])
    for (const c of COMPTES) {
      expect(dossiersDuRelais).not.toContain(c.sauvegardes)
      expect(COMPTES.map(x => x.dossier)).not.toContain(c.sauvegardes)
    }
    expect(EXTENSION_SAUVEGARDE).toBe('.memc')
    expect(EXTENSION_SAUVEGARDE).not.toBe(EXTENSION)
  })

  it('les dossiers des classes (lot 7) ne sont jamais ceux que sert le relais', () => {
    expect(COMPTES.map(c => c.classeurs)).toEqual(['MEM - Classeurs', 'LFB - Classeurs'])
    for (const c of COMPTES) {
      expect(dossiersDuRelais).not.toContain(c.classeurs)
      expect(COMPTES.flatMap(x => [x.dossier, x.sauvegardes])).not.toContain(c.classeurs)
    }
  })

  it('les adresses des relais renseignés sont bien des déploiements Apps Script', () => {
    for (const c of COMPTES) if (c.relais) expect(relaisValable(c.relais), c.cle).toBe(true)
  })
})

describe('le relais ne sert que les replays rangés au bon endroit', () => {
  const MOI = 'prof@exemple.fr'
  const mem: FauxDossier = { nom: 'MEM - Replay séances', proprietaire: MOI }
  const lfb: FauxDossier = { nom: 'LFB - Replay séances', proprietaire: MOI }
  let replay = ''
  const servir = async (fichiers: Record<string, FauxFichier>, id: string) => {
    replay ||= await ecrireFilm(filmMinimal())
    for (const f of Object.values(fichiers)) if (f.contenu === 'REPLAY') f.contenu = replay
    return relais(fichiers, MOI)({ id })
  }
  const ID = 'abcdefghij12345'

  it('sert un replay .mem de l’un des deux dossiers', async () => {
    expect(await servir({ [ID]: { nom: 'Séance.mem', contenu: 'REPLAY', parents: [mem] } }, ID)).toBe(replay)
    expect(await servir({ [ID]: { nom: 'Séance.mem', contenu: 'REPLAY', parents: [lfb] } }, ID)).toBe(replay)
  })

  const refus: [string, FauxFichier][] = [
    ['une autre extension', { nom: 'Séance.json', contenu: 'REPLAY', parents: [mem] }],
    ['un autre dossier', { nom: 'Séance.mem', contenu: 'REPLAY', parents: [{ nom: 'Mes documents', proprietaire: MOI }] }],
    ['un dossier qui n’est pas à ce compte', { nom: 'Séance.mem', contenu: 'REPLAY', parents: [{ ...mem, proprietaire: 'autre@exemple.fr' }] }],
    ['un dossier à la corbeille', { nom: 'Séance.mem', contenu: 'REPLAY', parents: [{ ...mem, corbeille: true }] }],
    ['un fichier à la corbeille', { nom: 'Séance.mem', contenu: 'REPLAY', parents: [mem], corbeille: true }],
    ['un .mem qui n’est pas un replay', { nom: 'Notes.mem', contenu: '{"secret":"bulletins"}', parents: [mem] }],
  ]
  for (const [cas, fichier] of refus) {
    it(`refuse ${cas}`, async () => {
      expect(JSON.parse(await servir({ [ID]: fichier }, ID)).erreur).toMatch(/introuvable/)
    })
  }

  // Une sauvegarde de classeur (lot 4 C10) n'est jamais servie : ni son
  // dossier, ni son extension, ni son contenu (il commence par
  // {"format":"mem-tableau", et non par celui d'un replay)
  describe('une sauvegarde de classeur (.memc) n\'est jamais servie', () => {
    const sauvegardes: FauxDossier = { nom: 'MEM - Sauvegardes', proprietaire: MOI }
    let memc = ''
    const classeur = async () => {
      if (memc) return memc
      const doc = new Y.Doc({ gc: false })
      doc.getArray('ordre').push(['p'])
      // Lu comme le relais le lit (getDataAsString) : du texte, le début compris
      memc = new TextDecoder('latin1').decode(new Uint8Array(await ecrireTableau(doc, Date.now(), { nom: 'Symétrie', id: 'aaaaaaaaaaaaaaaa' }).arrayBuffer()))
      return memc
    }
    const cas: [string, () => Promise<FauxFichier>][] = [
      ['« Symétrie.memc » dans « MEM - Sauvegardes »', async () => ({ nom: 'Symétrie.memc', contenu: await classeur(), parents: [sauvegardes] })],
      ['un .memc renommé « x.mem » dans « MEM - Replay séances » (il commence par mem-tableau)', async () => ({ nom: 'x.mem', contenu: await classeur(), parents: [mem] })],
      ['un .memc dans le dossier des replays', async () => ({ nom: 'Symétrie.memc', contenu: await classeur(), parents: [mem] })],
      ['« Symétrie.memc » dans le dossier d\'une classe (« MEM - Classeurs », lot 7)', async () => ({ nom: 'Symétrie.memc', contenu: await classeur(), parents: [{ nom: '5A', proprietaire: MOI }] })],
      ['un .memc dans les deux dossiers à la fois', async () => ({ nom: 'Symétrie.memc', contenu: await classeur(), parents: [sauvegardes, lfb] })],
    ]
    for (const [quoi, faire] of cas) {
      it(`refuse ${quoi}`, async () => {
        const f = await faire()
        expect(f.contenu.startsWith('{"format":"mem-tableau"')).toBe(true)
        expect(JSON.parse(relais({ [ID]: f }, MOI)({ id: ID })).erreur).toMatch(/introuvable/)
      })
    }
  })

  it('refuse un identifiant mal formé, et le ping ne dit pas quel compte sert', () => {
    const r = relais({ [ID]: { nom: 'Séance.mem', contenu: '', parents: [mem] } }, MOI)
    expect(JSON.parse(r({ id: '../x' })).erreur).toMatch(/incomplet/)
    const ping = r({ ping: '1' })
    expect(JSON.parse(ping)).toMatchObject({ relais: 'MEM Replay', version: 4, pret: true, dossier: 'MEM - Replay séances' })
    expect(ping).not.toContain(MOI)
  })
})

describe('le relais sert aussi un replay posé dans un dossier du Drive, par son code (version 4)', () => {
  const MOI = 'prof@exemple.fr'
  const CODE = 'k7f3q9xa'
  let replay = ''
  const servir = async (fichiers: Record<string, FauxFichier>, code: string) => {
    replay ||= await ecrireFilm(filmMinimal())
    for (const f of Object.values(fichiers)) if (f.contenu === 'REPLAY') f.contenu = replay
    return relais(fichiers, MOI)({ code })
  }
  const chapitre: FauxDossier = { nom: '02 - Limites de suites', proprietaire: MOI }

  it('sert le fichier « Titre [code].mem » de n’importe quel dossier', async () => {
    expect(await servir({ a1: { nom: `Mercredi 7 octobre 2026 [${CODE}].mem`, contenu: 'REPLAY', parents: [chapitre] } }, CODE)).toBe(replay)
  })

  it('prend le plus récent quand le titre a changé à la republication', async () => {
    const vieux = JSON.stringify({ format: 'mem-revoir', v: 1, titre: 'Ancien' })
    const r = await servir({
      a1: { nom: `Ancien titre [${CODE}].mem`, contenu: vieux, parents: [chapitre], modifie: 1 },
      a2: { nom: `Nouveau titre [${CODE}].mem`, contenu: 'REPLAY', parents: [chapitre], modifie: 2 },
    }, CODE)
    expect(r).toBe(replay)
  })

  const refus: [string, FauxFichier][] = [
    ['un autre code', { nom: 'Séance [zzzzzzzz].mem', contenu: 'REPLAY', parents: [chapitre] }],
    ['un code sans crochets', { nom: `Séance ${CODE}.mem`, contenu: 'REPLAY', parents: [chapitre] }],
    ['une autre extension', { nom: `Séance [${CODE}].json`, contenu: 'REPLAY', parents: [chapitre] }],
    ['un .memc', { nom: `Séance [${CODE}].memc`, contenu: 'REPLAY', parents: [chapitre] }],
    ['un fichier d’un autre compte', { nom: `Séance [${CODE}].mem`, contenu: 'REPLAY', parents: [chapitre], proprietaire: 'autre@exemple.fr' }],
    ['un fichier à la corbeille', { nom: `Séance [${CODE}].mem`, contenu: 'REPLAY', parents: [chapitre], corbeille: true }],
    ['un .mem qui n’est pas un replay', { nom: `Notes [${CODE}].mem`, contenu: '{"secret":"bulletins"}', parents: [chapitre] }],
  ]
  for (const [cas, fichier] of refus) {
    it(`refuse ${cas}`, async () => {
      expect(JSON.parse(await servir({ a1: fichier }, CODE)).erreur).toMatch(/introuvable/)
    })
  }

  it('refuse un code mal formé, sans interroger le Drive', async () => {
    for (const mauvais of ['', 'abc', "k7f3q9x' or 1=1", 'K7F3Q9XA', 'k7f3q9xaa']) {
      expect(JSON.parse(await servir({}, mauvais)).erreur, mauvais).toMatch(/incomplet/)
    }
  })

  it('l’identifiant d’avant marche comme avant (les liens déjà donnés)', async () => {
    const ID = 'abcdefghij12345'
    const mem: FauxDossier = { nom: 'MEM - Replay séances', proprietaire: MOI }
    replay ||= await ecrireFilm(filmMinimal())
    expect(relais({ [ID]: { nom: 'Séance.mem', contenu: replay, parents: [mem] } }, MOI)({ id: ID })).toBe(replay)
  })
})

describe('l’outil lui-même', () => {
  const fichiers = (dossier: string): string[] => readdirSync(dossier).flatMap(n => {
    const chemin = join(dossier, n)
    return statSync(chemin).isDirectory() ? fichiers(chemin) : [chemin]
  })

  it('s’appelle « mem-teachingtool »', () => {
    expect(JSON.parse(readFileSync(join(RACINE, 'package.json'), 'utf8')).name).toBe('mem-teachingtool')
  })

  it('ni élève connecté, ni partage en direct : plus de y-websocket ni de serveur/', () => {
    const MOTS = [new RegExp('y-' + 'websocket'), new RegExp('Websocket' + 'Provider'), new RegExp('y-' + 'protocols'),
      new RegExp('eleves' + 'Ecrivent'), new RegExp('VITE_SERVEUR' + '_SYNC'), new RegExp('VITE_SANS' + '_SERVEUR')]
    const lus = [...fichiers(join(RACINE, 'src')),
      ...['index.html', 'revoir.html', 'README.md', 'package.json', 'package-lock.json', '.env.pages'].map(f => join(RACINE, f))]
    const trouves = lus.flatMap(f => MOTS.filter(m => m.test(readFileSync(f, 'utf8'))).map(m => `${f.slice(RACINE.length + 1)} : ${m}`))
    expect(trouves).toEqual([])
    expect(existsSync(join(RACINE, 'serveur'))).toBe(false)
    expect(existsSync(join(RACINE, '.env.exemple'))).toBe(false)
  })
})
