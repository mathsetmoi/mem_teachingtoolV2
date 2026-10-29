// Comparer deux vecteurs d'état (lot 4, C4) : la clé ne remplace jamais un
// fichier qui contient plus que le classeur, et voit qu'un classeur a perdu
// une partie de son histoire. Avec de vrais classeurs (Tableau) qui
// divergent : deux copies d'un même état, chacune écrite de son côté.
import { describe, expect, it } from 'vitest'
import * as Y from 'yjs'
import { Tableau } from '../src/document'
import type { Trait } from '../src/types'
import { comparerVecteurs, contient, reunir, verdictAncienFichier } from '../src/classeurs/vecteurs'

let numero = 0
function trait(x: number): Trait {
  const pts: number[] = []
  for (let i = 0; i < 6; i++) pts.push(i * 5, Math.sin(i) * 4, 0.5)
  return { id: 'T' + numero++, type: 'trait', x, y: 0, z: numero, auteur: 'appareil-du-prof', pts, couleur: '#1b2230', taille: 3, opacite: 1, pression: false }
}
const micro = () => new Promise(r => setTimeout(r, 0))

/** Un classeur d'une page, avec un trait */
async function unClasseur() {
  const t = new Tableau(null)
  const p = t.ajouterPage('carreaux', 0); t.pageVue = p
  await micro()
  t.nouveauGeste(); t.poser(p, trait(0)); await micro()
  return { t, p }
}
/** Une copie : le même état, rejoué dans un autre document (un autre appareil) */
function copie(t: Tableau): Tableau {
  const c = new Tableau(null)
  Y.applyUpdate(c.doc, Y.encodeStateAsUpdate(t.doc), 'film')
  c.pageVue = t.ordre.get(0)
  return c
}
const vecteur = (t: Tableau) => Y.encodeStateVector(t.doc)

describe('comparerVecteurs', () => {
  it('égal, contient, contenu : une copie qui a avancé', async () => {
    const { t, p } = await unClasseur()
    const c = copie(t)
    expect(comparerVecteurs(vecteur(t), vecteur(c))).toBe('egal')
    c.nouveauGeste(); c.poser(p, trait(10)); await micro()
    expect(comparerVecteurs(vecteur(c), vecteur(t))).toBe('contient')
    expect(comparerVecteurs(vecteur(t), vecteur(c))).toBe('contenu')
    expect(contient(vecteur(c), vecteur(t))).toBe(true)
    expect(contient(vecteur(t), vecteur(c))).toBe(false)
    expect(contient(vecteur(t), vecteur(t))).toBe(true)
    // La copie rattrapée : égaux de nouveau
    Y.applyUpdate(t.doc, Y.encodeStateAsUpdate(c.doc, vecteur(t)), 'film')
    expect(comparerVecteurs(vecteur(t), vecteur(c))).toBe('egal')
  })

  it('diverge : deux histoires séparées (chacune écrite de son côté)', async () => {
    const { t, p } = await unClasseur()
    const c = copie(t)
    t.nouveauGeste(); t.poser(p, trait(20)); await micro()
    c.nouveauGeste(); c.poser(p, trait(30)); await micro()
    expect(comparerVecteurs(vecteur(t), vecteur(c))).toBe('diverge')
    expect(comparerVecteurs(vecteur(c), vecteur(t))).toBe('diverge')
    expect(contient(vecteur(t), vecteur(c))).toBe(false)
  })

  it('un classeur remplacé par un autre (une autre histoire) : diverge ; un document vide est contenu partout', async () => {
    const a = (await unClasseur()).t, b = (await unClasseur()).t
    expect(comparerVecteurs(vecteur(a), vecteur(b))).toBe('diverge')
    const vide = Y.encodeStateVector(new Y.Doc())
    expect(comparerVecteurs(vide, vecteur(a))).toBe('contenu')
    expect(comparerVecteurs(vecteur(a), vide)).toBe('contient')
    expect(comparerVecteurs(vide, vide)).toBe('egal')
  })

  it('le vecteur d\'un fichier (encodeStateVectorFromUpdate) se compare comme celui du document', async () => {
    const { t, p } = await unClasseur()
    const fichier = Y.encodeStateVectorFromUpdate(Y.encodeStateAsUpdate(t.doc))
    expect(comparerVecteurs(fichier, vecteur(t))).toBe('egal')
    t.nouveauGeste(); t.poser(p, trait(40)); await micro()
    expect(comparerVecteurs(fichier, vecteur(t))).toBe('contenu')
  })

  it('reunir : tout ce qu\'ont deux copies qui divergent', async () => {
    const { t, p } = await unClasseur()
    const c = copie(t)
    t.nouveauGeste(); t.poser(p, trait(50)); await micro()
    c.nouveauGeste(); c.poser(p, trait(60)); await micro()
    const u = reunir(vecteur(t), vecteur(c))
    expect(comparerVecteurs(u, vecteur(t))).toBe('contient')
    expect(comparerVecteurs(u, vecteur(c))).toBe('contient')
    // Les deux fusionnées : exactement la réunion
    Y.applyUpdate(t.doc, Y.encodeStateAsUpdate(c.doc), 'film')
    expect(comparerVecteurs(u, vecteur(t))).toBe('egal')
    expect(comparerVecteurs(reunir(vecteur(t), vecteur(t)), vecteur(t))).toBe('egal')
  })

  it('un appareil noté à 0 compte comme absent', () => {
    const enc = (m: Map<number, number>) => {
      // Le codage de Yjs : le nombre d'appareils, puis (appareil, horloge)
      const o: number[] = []
      const v = (n: number) => { while (n > 127) { o.push((n & 127) | 128); n = Math.floor(n / 128) } o.push(n) }
      v(m.size); for (const [c, n] of m) { v(c); v(n) }
      return new Uint8Array(o)
    }
    expect(comparerVecteurs(enc(new Map([[5, 3], [7, 0]])), enc(new Map([[5, 3]])))).toBe('egal')
    expect(comparerVecteurs(enc(new Map([[5, 3]])), enc(new Map([[5, 2], [9, 0]])))).toBe('contient')
  })
})

describe('l’ancien fichier d’un classeur dont le niveau change de dossier (lot 18)', () => {
  const vecteur = (d: Y.Doc) => Y.encodeStateVector(d)
  it('la base a tout ce qu’a le fichier (égal, ou plus) : « pareil », il peut rester où il est', () => {
    const a = new Y.Doc()
    a.getMap('m').set('x', 1)
    const fichier = vecteur(a)
    expect(verdictAncienFichier({ id: 'c1', vecteur: fichier }, 'c1', vecteur(a))).toBe('pareil')
    a.getMap('m').set('y', 2)
    expect(verdictAncienFichier({ id: 'c1', vecteur: fichier }, 'c1', vecteur(a))).toBe('pareil')
  })
  it('le fichier a des changements que la base n’a pas (modifié ailleurs, ou une base qui a perdu) : « plus-riche »', () => {
    const a = new Y.Doc()
    a.getMap('m').set('x', 1)
    const base = vecteur(a)
    a.getMap('m').set('y', 2)
    expect(verdictAncienFichier({ id: 'c1', vecteur: vecteur(a) }, 'c1', base)).toBe('plus-riche')
    // Un autre poste a écrit de son côté : les deux divergent
    const b = new Y.Doc()
    Y.applyUpdate(b, Y.encodeStateAsUpdate(a))
    b.getMap('m').set('z', 3)
    a.getMap('m').set('w', 4)
    expect(verdictAncienFichier({ id: 'c1', vecteur: vecteur(b) }, 'c1', vecteur(a))).toBe('plus-riche')
  })
  it('un fichier qui n’est pas à ce classeur (un autre id) : « pareil », il n’a rien à lui', () => {
    const a = new Y.Doc()
    a.getMap('m').set('x', 1)
    expect(verdictAncienFichier({ id: 'autre', vecteur: vecteur(a) }, 'c1', vecteur(new Y.Doc()))).toBe('pareil')
    // Sans id dans l'en-tête (un vieux fichier) : seul le vecteur compte
    expect(verdictAncienFichier({ vecteur: vecteur(a) }, 'c1', vecteur(new Y.Doc()))).toBe('plus-riche')
  })
})
