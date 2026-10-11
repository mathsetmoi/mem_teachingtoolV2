// Toute la bibliothèque dans un fichier (lot 4 C9) : le zip écrit à la main
// (entrées stockées, somme et taille dans chaque en-tête local, aucun
// descripteur), relu par le répertoire central, jamais en balayant les
// octets ; un fichier tronqué relu par ses en-têtes locaux ; l'index et son
// format ; les limites (4 Gio, 65 535 entrées).
import { describe, expect, it } from 'vitest'
import * as Y from 'yjs'
import { execFileSync } from 'node:child_process'
import { mkdtempSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { unzipSync } from 'fflate'
import { Tableau } from '../src/document'
import type { Trait } from '../src/types'
import { crc32, ecrireTableau, lireTableau } from '../src/fichier'
import {
  ABIMEE, EcrivainArchive, ErreurArchive, NOM_INDEX, PAS_UNE_BIBLIOTHEQUE, PLUS_RECENTE, TROP_GRANDE, cheminApercu, cheminClasseur,
  estUneArchive, heureDos, indexDe, lireArchive, lireEntree, lireIndex, nomBibliotheque,
} from '../src/classeurs/archive'
import type { FicheClasseur, FicheDossier } from '../src/classeurs/demarrage'

let numero = 0
function trait(x: number): Trait {
  const pts: number[] = []
  for (let i = 0; i < 6; i++) pts.push(i * 5, Math.sin(i) * 4, 0.5)
  return { id: 'T' + numero++, type: 'trait', x, y: 0, z: numero, auteur: 'appareil-du-prof', pts, couleur: '#1b2230', taille: 3, opacite: 1, pression: false }
}
const micro = () => new Promise(r => setTimeout(r, 0))

/** Le .memc d'un petit classeur (n traits sur une page) */
async function unMemc(n: number, infos: { nom: string; id: string }): Promise<Uint8Array> {
  const t = new Tableau(null)
  const p = t.ajouterPage('carreaux', 0); t.pageVue = p
  await micro()
  for (let i = 0; i < n; i++) { t.nouveauGeste(); t.poser(p, trait(i * 10)); await micro() }
  const o = new Uint8Array(await ecrireTableau(t.doc, Date.now(), infos).arrayBuffer())
  t.doc.destroy()
  return o
}
/** Assemble une archive d'entrées (nom, octets) comme le fait l'enregistrement */
function archive(entrees: [string, Uint8Array][], date = Date.now()): Uint8Array {
  const z = new EcrivainArchive(date)
  const morceaux: Uint8Array[] = []
  for (const [nom, o] of entrees) { morceaux.push(z.entree(nom, crc32(o), o.length)); morceaux.push(o) }
  morceaux.push(z.fin())
  const tout = new Uint8Array(morceaux.reduce((s, m) => s + m.length, 0))
  let i = 0
  for (const m of morceaux) { tout.set(m, i); i += m.length }
  expect(z.taille + (tout.length - z.taille)).toBe(tout.length)
  return tout
}
/** Lire des octets comme File.slice */
const lecteur = (o: Uint8Array) => {
  const lus: [number, number][] = []
  const f = async (d: number, e: number) => { lus.push([d, e]); return o.slice(Math.max(0, d), Math.min(o.length, e)) }
  return Object.assign(f, { lus })
}
const fiche = (id: string, nom: string, o: Partial<FicheClasseur> = {}): FicheClasseur =>
  ({ id, base: 'mem-teachingtool-classeur-' + id, nom, dossier: null, etiquettes: [], cree: 1, modifie: 2, ouvert: 0, pages: 1, ...o })

describe('le zip écrit à la main', () => {
  it('aller et retour : deux classeurs, un aperçu, l\'index ; par le répertoire central', async () => {
    const ia = 'aaaaaaaaaaaaaaaa', ib = 'bbbbbbbbbbbbbbbb'
    const a = await unMemc(3, { nom: 'Symétrie', id: ia }), b = await unMemc(1, { nom: 'Fractions', id: ib })
    const png = new Uint8Array([0x89, 0x50, 0x4e, 0x47, 1, 2, 3])
    const fiches = [fiche(ia, 'Symétrie', { dossier: 'd1', etiquettes: ['Soutien'] }), fiche(ib, 'Fractions')]
    const dossiers: FicheDossier[] = [{ id: 'd1', nom: '5e B', parent: null, couleur: '#3b6fb6', etiquette: '5e B', cree: 5 }]
    const index = indexDe(fiches, dossiers, 1234, id => id === ia)
    const json = new TextEncoder().encode(JSON.stringify(index))
    const z = archive([[NOM_INDEX, json], [cheminClasseur(ia), a], [cheminClasseur(ib), b], [cheminApercu(ia), png]])
    expect(estUneArchive(z)).toBe(true)
    const l = lecteur(z)
    const { entrees, tronquee } = await lireArchive(l, z.length)
    expect(tronquee).toBe(false)
    expect(entrees.map(e => e.nom)).toEqual([NOM_INDEX, `classeurs/${ia}.memc`, `classeurs/${ib}.memc`, `apercus/${ia}.png`])
    expect(entrees.every(e => e.methode === 0 && e.taille === e.tailleArchive)).toBe(true)
    // L'index, vérifié par sa somme
    const lu = lireIndex((await lireEntree(l, entrees[0]))!)
    expect(lu).toEqual(index)
    expect(lu.classeurs[0]).toMatchObject({ id: ia, nom: 'Symétrie', dossier: 'd1', etiquettes: ['Soutien'], fichier: 'classeurs/aaaaaaaaaaaaaaaa.memc', apercu: 'apercus/aaaaaaaaaaaaaaaa.png' })
    expect(lu.classeurs[1].apercu).toBeUndefined()
    expect(lu.dossiers[0]).toEqual({ id: 'd1', nom: '5e B', parent: null, couleur: '#3b6fb6', etiquette: '5e B', cree: 5 })
    // Chaque .memc, tel qu'il a été écrit, et qui se rouvre seul
    for (const [e, src, pages] of [[entrees[1], a, 1], [entrees[2], b, 1]] as const) {
      const o = await l(e.debut, e.debut + e.tailleArchive)
      expect(Buffer.compare(Buffer.from(o), Buffer.from(src))).toBe(0)
      expect(crc32(o)).toBe(e.crc)
      expect(lireTableau(o).pages).toBe(pages)
    }
    expect((await lireEntree(l, entrees[3]))).toEqual(png)
    // fflate le relit aussi (par son répertoire central)
    const s = unzipSync(z)
    expect(Object.keys(s).sort()).toEqual([NOM_INDEX, `apercus/${ia}.png`, `classeurs/${ia}.memc`, `classeurs/${ib}.memc`].sort())
    expect(s[`classeurs/${ib}.memc`]).toEqual(b)
  })

  it('une entrée qui contient les trois signatures (PK\\x03\\x04, PK\\x07\\x08, PK\\x01\\x02) et celle de la fin est relue entière', async () => {
    const x = new Uint8Array(200_000)
    for (let i = 0; i < x.length; i++) x[i] = (i * 2654435761) >>> 24
    x.set([0x50, 0x4b, 0x03, 0x04], 1000)
    x.set([0x50, 0x4b, 0x07, 0x08], 100_000)
    x.set([0x50, 0x4b, 0x01, 0x02], 150_000)
    x.set([0x50, 0x4b, 0x05, 0x06, 0, 0, 0, 0], 199_000)
    const z = archive([[NOM_INDEX, new TextEncoder().encode('{}')], ['classeurs/0123456789abcdef.memc', x], ['apercus/0123456789abcdef.png', new Uint8Array([1, 2, 3])]])
    const { entrees, tronquee } = await lireArchive(lecteur(z), z.length)
    expect(tronquee).toBe(false)
    expect(entrees.map(e => e.nom)).toEqual([NOM_INDEX, 'classeurs/0123456789abcdef.memc', 'apercus/0123456789abcdef.png'])
    const o = await lireEntree(lecteur(z), entrees[1])
    expect(o?.length).toBe(200_000)
    expect(Buffer.compare(Buffer.from(o!), Buffer.from(x))).toBe(0)
  })

  it('unzip -t passe ; renommée en .zip, elle s\'ouvre partout', async () => {
    const a = await unMemc(2, { nom: 'Symétrie', id: 'cccccccccccccccc' })
    const z = archive([[NOM_INDEX, new TextEncoder().encode('{"format":"mem-bibliotheque","v":1}')], ['classeurs/cccccccccccccccc.memc', a], ['apercus/cccccccccccccccc.png', new Uint8Array([9, 9])]])
    const dir = mkdtempSync(join(tmpdir(), 'memb-'))
    const chemin = join(dir, 'Bibliothèque.zip')
    writeFileSync(chemin, z)
    const sortie = execFileSync('unzip', ['-t', chemin]).toString()
    expect(sortie).toMatch(/No errors detected/)
    expect(sortie).toMatch(/testing: classeurs\/cccccccccccccccc\.memc\s+OK/)
    // Les noms en UTF-8 (le drapeau 11)
    const l = execFileSync('unzip', ['-Z1', chemin]).toString().trim().split('\n')
    expect(l).toEqual([NOM_INDEX, 'classeurs/cccccccccccccccc.memc', 'apercus/cccccccccccccccc.png'])
  })

  it('un fichier tronqué : le repli suit les en-têtes locaux, et garde ce qui est entier', async () => {
    const a = await unMemc(2, { nom: 'A', id: 'dddddddddddddddd' }), b = await unMemc(4, { nom: 'B', id: 'eeeeeeeeeeeeeeee' })
    const json = new TextEncoder().encode('{"format":"mem-bibliotheque","v":1,"classeurs":[]}')
    const z = archive([[NOM_INDEX, json], ['classeurs/dddddddddddddddd.memc', a], ['classeurs/eeeeeeeeeeeeeeee.memc', b]])
    // Coupé au milieu du second classeur : ni lui, ni le répertoire
    const coupe = z.slice(0, z.length - 22 - 200 - Math.floor(b.length / 2))
    const r = await lireArchive(lecteur(coupe), coupe.length)
    expect(r.tronquee).toBe(true)
    expect(r.entrees.map(e => e.nom)).toEqual([NOM_INDEX, 'classeurs/dddddddddddddddd.memc'])
    const o = await lecteur(coupe)(r.entrees[1].debut, r.entrees[1].debut + r.entrees[1].tailleArchive)
    expect(crc32(o)).toBe(r.entrees[1].crc)
    // Coupé juste avant la fin du répertoire : tout ce qui précède se retrouve
    const r2 = await lireArchive(lecteur(z.slice(0, z.length - 10)), z.length - 10)
    expect(r2.tronquee).toBe(true)
    expect(r2.entrees.length).toBe(3)
    // Ce qui n'est pas un zip, ou un zip sans rien d'entier
    await expect(lireArchive(lecteur(a), a.length)).rejects.toMatchObject({ raison: 'pas-une-bibliotheque', message: PAS_UNE_BIBLIOTHEQUE })
    await expect(lireArchive(lecteur(z.slice(0, 40)), 40)).rejects.toMatchObject({ raison: 'abimee', message: ABIMEE })
  })

  it('une entrée abîmée (un bit changé) : sa somme ne va pas, lireEntree la refuse', async () => {
    const png = new Uint8Array(500).fill(7)
    const z = archive([[NOM_INDEX, new TextEncoder().encode('{}')], ['apercus/ffffffffffffffff.png', png]])
    const { entrees } = await lireArchive(lecteur(z), z.length)
    const abime = z.slice(); abime[entrees[1].debut + 200] ^= 0x10
    expect(await lireEntree(lecteur(abime), entrees[1])).toBeNull()
    expect(await lireEntree(lecteur(z), entrees[1])).toEqual(png)
  })

  it('les limites : 4 Gio en tout, 65 535 entrées ; refusées avant d\'être promises', () => {
    const z = new EcrivainArchive()
    z.entree('a', 0, 1000)
    expect(() => z.entree('classeurs/gros.memc', 0, 0xffffffff - 1000)).toThrow(ErreurArchive)
    try { z.entree('b', 0, 0xfffffff0) } catch (e) { expect((e as ErreurArchive).raison).toBe('trop-grande'); expect((e as Error).message).toBe(TROP_GRANDE) }
    // Rien n'a été promis pour ce qui est refusé : la fin ne compte que « a »
    const fin = z.fin()
    expect(fin[fin.length - 22 + 8]).toBe(1)
    const y = new EcrivainArchive()
    for (let i = 0; i < 65534; i++) y.entree('x' + i, 0, 0)
    expect(() => y.entree('encore', 0, 0)).toThrow(TROP_GRANDE)
  })
})

describe('l\'index et le nom', () => {
  it('lireIndex : son format, une version plus récente, ce qui n\'a pas la bonne forme', () => {
    const t = (o: unknown) => new TextEncoder().encode(JSON.stringify(o))
    expect(() => lireIndex(t({ format: 'mem-tableau', v: 1 }))).toThrow(PAS_UNE_BIBLIOTHEQUE)
    expect(() => lireIndex(new TextEncoder().encode('pas du json'))).toThrow(PAS_UNE_BIBLIOTHEQUE)
    expect(() => lireIndex(t({ format: 'mem-bibliotheque', v: 2 }))).toThrow(PLUS_RECENTE)
    const i = lireIndex(t({ format: 'mem-bibliotheque', v: 1, date: 5, dossiers: [{ id: 'x', nom: 'A', parent: 'y', couleur: '#2f8a57' }, { nom: 'sans id' }],
      classeurs: [{ id: 'aaaaaaaaaaaaaaaa', nom: 'N', fichier: 'classeurs/a.memc', etiquettes: ['5e B', 3] }, { id: 'b', nom: 'sans fichier' }] }))
    expect(i.dossiers).toEqual([{ id: 'x', nom: 'A', parent: 'y', couleur: '#2f8a57', cree: 0 }])
    expect(i.classeurs).toEqual([{ id: 'aaaaaaaaaaaaaaaa', nom: 'N', dossier: null, etiquettes: ['5e B'], cree: 0, modifie: 0, pages: 0, fichier: 'classeurs/a.memc' }])
    expect(i.date).toBe(5)
  })

  it('« Bibliothèque 2026-10-10 14h05.memb », l\'heure à la façon de MS-DOS', () => {
    const t = new Date(2026, 9, 10, 14, 5, 31).getTime()
    expect(nomBibliotheque(t)).toBe('Bibliothèque 2026-10-10 14h05.memb')
    const d = heureDos(t)
    expect(d.heure).toBe((14 << 11) | (5 << 5) | 15)
    expect(d.jour).toBe(((2026 - 1980) << 9) | (10 << 5) | 10)
    expect(heureDos(new Date(1970, 0, 1).getTime()).jour >> 9).toBe(0)
  })

  it('un .memc ne commence pas comme une archive', async () => {
    const a = await unMemc(1, { nom: 'A', id: '1111111111111111' })
    expect(estUneArchive(a)).toBe(false)
    expect(Y.encodeStateVector(new Y.Doc()).length).toBe(1)
  })
})
