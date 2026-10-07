// La publication : le site et le relais Apps Script doivent parler des mêmes
// dossiers et de la même extension, et le relais ne doit servir que des
// replays rangés là où il faut. Le relais tourne ici dans un bac à sable,
// avec un faux Drive.
import { existsSync, readFileSync, readdirSync, statSync } from 'node:fs'
import { join } from 'node:path'
import { runInNewContext } from 'node:vm'
import { describe, expect, it } from 'vitest'
import { COMPTES, EXTENSION, relaisValable } from '../src/publication/comptes'
import { ecrireFilm } from '../src/revoir/format'
import type { FilmEleve } from '../src/revoir/format'

const RACINE = join(__dirname, '..')
const SOURCE_RELAIS = readFileSync(join(RACINE, 'relais/relais-seances.gs'), 'utf8')

interface FauxDossier { nom: string; proprietaire: string; corbeille?: boolean }
interface FauxFichier { nom: string; contenu: string; parents: FauxDossier[]; corbeille?: boolean }

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

  it('refuse un identifiant mal formé, et le ping ne dit pas quel compte sert', () => {
    const r = relais({ [ID]: { nom: 'Séance.mem', contenu: '', parents: [mem] } }, MOI)
    expect(JSON.parse(r({ id: '../x' })).erreur).toMatch(/incomplet/)
    const ping = r({ ping: '1' })
    expect(JSON.parse(ping)).toMatchObject({ relais: 'MEM Replay', version: 3, pret: true, dossier: 'MEM - Replay séances' })
    expect(ping).not.toContain(MOI)
  })
})

describe('plus aucune trace du projet d’origine', () => {
  // L'ancien nom, son identifiant (« nouveauTableau » n'en est pas un), et l'ancienne extension
  const MOTIFS = [new RegExp('Au ' + 'Tableau'), new RegExp('\\bau' + 'tableau', 'i'), new RegExp('\\.pr' + 'of(?![\\w(])')]
  const fichiers = (dossier: string): string[] => readdirSync(dossier).flatMap(n => {
    const chemin = join(dossier, n)
    return statSync(chemin).isDirectory() ? fichiers(chemin) : [chemin]
  })

  it('ni dans le code, ni dans le relais, ni dans la documentation', () => {
    const lus = [...fichiers(join(RACINE, 'src')), ...fichiers(join(RACINE, 'relais')), ...fichiers(join(RACINE, 'tests')),
      ...['README.md', 'index.html', 'revoir.html', 'package.json', '.github/workflows/pages.yml'].map(f => join(RACINE, f))]
    const trouves = lus.flatMap(f => MOTIFS.filter(m => m.test(readFileSync(f, 'utf8'))).map(m => `${f.slice(RACINE.length + 1)} : ${m}`))
    expect(trouves).toEqual([])
  })

  it('le relais ne porte pas le mot « Tableau »', () => {
    expect(SOURCE_RELAIS).not.toMatch(/tableau/i)
  })

  it('l’outil s’appelle « MEM teachingtool » : plus de « Tableau MEM »', () => {
    const ancien = new RegExp('Tableau' + ' MEM')
    const lus = [...fichiers(join(RACINE, 'src')), ...['index.html', 'revoir.html', 'README.md', 'package.json'].map(f => join(RACINE, f))]
    expect(lus.filter(f => ancien.test(readFileSync(f, 'utf8'))).map(f => f.slice(RACINE.length + 1))).toEqual([])
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
