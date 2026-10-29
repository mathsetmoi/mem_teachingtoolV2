// Reprendre un ancien tableau (.prof) : lire son film, en faire une séance
// d'un classeur, avec chaque geste à son heure (classeurs/ancien-tableau.ts)
import { describe, expect, it } from 'vitest'
import * as Y from 'yjs'
import { Tableau } from '../src/document'
import type { AncienTableau, LigneApercu, PreparerImage, SeanceDApercu } from '../src/classeurs/ancien-tableau'
import {
  ErreurAncien, apercuDuRangement, dateDuNom, latexDuTexte, lireAncienTableau, rangerDansLeClasseur, reprendre, seanceGenante, texteApresAjout, texteDesRefus, texteDuBilan,
  textesAvantAnciens,
} from '../src/classeurs/ancien-tableau'
import { supprimerSeance } from '../src/deplacer-seance'
import { ecrireTableau, lireTableau, pagesLisibles } from '../src/fichier'
import { seancesDuTableau } from '../src/revoir/exporter'
import { dateCourte, dateCourteMajuscule } from '../src/seances'
import type { Cercle, Formule, ImageForme, Polygone, Trait } from '../src/types'

const T0 = new Date(2026, 8, 29, 8, 0).getTime()
const MIN = 60_000
const PNG = 'data:image/png;base64,AAAA'
const trait = (id: number, x: number, y: number, o: Record<string, unknown> = {}) => ({
  id, points: [{ x, y, p: 0.3 }, { x: x + 10, y: y + 5, p: 0.6 }], color: '#e74c3c', width: 3, isHighlighter: false, z: id, ...o,
})
const vide = { points: [], segments: [], circles: [], rectangles: [], texts: [], freehands: [], curves: [], polygons: [], images: [], arcs: [], htmlPostits: [] }

/** Un ancien tableau de deux pages : la première écrite en trois gestes
 *  (dont un effacement), la seconde sans film */
function fichier(o: { debut?: number } = {}) {
  const t = o.debut ?? T0
  const image = { id: 2, x: -100, y: -50, w: 200, h: 100, cx: 0, cy: 0, cw: 400, ch: 200, z: 2, srcRef: 'a1', isBg: true }
  const t1 = trait(1, 0, 0), t3 = trait(3, 50, 50, { isHighlighter: true, width: 18 }), post = { id: 9, x: 0, y: 0, w: 150, h: 150, content: '' }
  const texte = { id: 4, x: 20, y: 30, content: '<span style="font-size: 0.5em;">Voir 50 %</span><div>p_1 et $x^2$</div>', color: '#16a085', fontSize: 40, z: 4 }
  return JSON.stringify({
    id: 'x', name: 'Nom gardé dedans', enregistreLe: t + 60 * MIN,
    data: {
      currentBgIndex: 2, assets: { a1: PNG },
      pages: [
        {
          ...vide, freehands: [t1, t3], images: [image], texts: [texte],
          filmArchive: [{ ...vide, t }],
          film: [
            { freehands: { '+': [t1] }, images: { '+': [image] }, t: t + MIN },
            { freehands: { '+': [trait(5, 9, 9)] }, htmlPostits: { '+': [post] }, t: t + 2 * MIN },
            { freehands: [t1, t3], htmlPostits: [], t: t + 3 * MIN },
            { texts: [texte], t: t + 4 * MIN },
          ],
        },
        { ...vide, freehands: [trait(7, 100, 100)] },
      ],
    },
  })
}

/** Sous Node : ni image ni canevas ; une image a la taille qu'elle dit */
const preparer: PreparerImage = async (d, r) => ({ donnees: d, l: r ? r.l : 400, h: r ? r.h : 200 })

describe('lire un ancien tableau', () => {
  it('rejoue son film, page par page, et prend le nom du fichier', () => {
    const a = lireAncienTableau(fichier(), 'C:\\Classe\\2 - Mardi 29 septembre 2026.prof')
    expect(a.nom).toBe('2 - Mardi 29 septembre 2026')
    expect(a.fond).toBe('seyes')
    expect(a.film).toBe(true)
    expect(a.pages).toHaveLength(2)
    expect(a.pages[0].etats.map(e => e.t)).toEqual([T0, T0 + MIN, T0 + 2 * MIN, T0 + 3 * MIN, T0 + 4 * MIN])
    expect(a.pages[0].etats[2].etat.freehands.map(o => o.id)).toEqual([1, 5])
    // Sans film : la page telle qu'elle est enregistrée, d'un coup
    expect(a.pages[1].etats).toHaveLength(1)
    expect(a.debut).toBe(T0)
    expect(a.fin).toBe(T0 + 4 * MIN)
  })

  it('refuse ce qui n\'en est pas un', () => {
    expect(() => lireAncienTableau('pas du json')).toThrow(ErreurAncien)
    expect(() => lireAncienTableau('{"data":{"pages":[]}}')).toThrow(ErreurAncien)
  })

  it('un texte devient une formule : les lignes, le texte protégé, les formules gardées', () => {
    expect(latexDuTexte('<span>(voir partie exercices )</span>')).toBe('\\text{(voir partie exercices )}')
    expect(latexDuTexte('<div>https://basthon.fr/</div>')).toBe('\\text{https://basthon.fr/}')
    expect(latexDuTexte('a &amp; b<br>50 % de $x^2$'))
      .toBe('\\begin{array}{l}\\text{a \\& b} \\\\ \\text{50 \\% de }x^2\\end{array}')
    expect(latexDuTexte('<div> </div>')).toBe('')
  })
})

describe('reprendre un ancien tableau', () => {
  it('une séance neuve, chaque geste à son heure, sur sa page', async () => {
    const tab = new Tableau(null)
    const a = lireAncienTableau(fichier(), 'Séance.prof')
    const b = await reprendre(tab, a, preparer)
    expect(b).toEqual({ seance: expect.any(String), pages: 2, traits: 3, images: 1, textes: 1, figures: 0, calculatrices: 0, laisses: 1, imagesIllisibles: 0, imagesHorsFilm: 0 })
    expect(texteDuBilan(a, b)).toBe('« Séance » : 2 pages, 3 traits, 1 image, 1 texte (devenu une formule), avec son film. 1 objet (cercles, polygones, courbes ou post-its) n\'a pas été repris.')
    const seances = tab.seancesDuClasseur()
    expect(seances).toHaveLength(1)
    expect(seances[0].debut).toBe(T0)
    // Le bilan dit la séance créée
    expect(b.seance).toBe(seances[0].id)
    const [p1, p2] = seances[0].pages
    expect(tab.ordre.toArray()).toEqual([p1, p2])
    // Le film : les deux naissances, puis les gestes (le post-it seul n'en fait pas)
    const film = tab.film.toArray()
    expect(film.map(e => [e.t, e.page === p1 ? 1 : 2, !!e.naissance])).toEqual([
      [T0, 1, true], [T0, 2, true],
      [T0, 2, false],
      [T0 + MIN, 1, false], [T0 + 2 * MIN, 1, false], [T0 + 3 * MIN, 1, false], [T0 + 4 * MIN, 1, false],
    ])
    // Le trait effacé est parti ; le surligneur reste un surligneur
    const formes = [...tab.formesDe(p1)!.values()]
    expect(formes.map(f => f.type).sort()).toEqual(['formule', 'image', 'trait', 'trait'])
    const traits = formes.filter((f): f is Trait => f.type === 'trait')
    const stylo = traits.find(t => t.opacite === 1)!, surligneur = traits.find(t => t.opacite < 1)!
    // Décalé : ce qui est écrit commence en haut à gauche (l'image à -100, -50)
    expect([stylo.x, stylo.y]).toEqual([100, 50])
    expect(stylo.pts).toEqual([0, 0, 0.3, 10, 5, 0.6])
    expect(stylo.pression).toBe(true)
    expect(stylo.taille).toBe(3)
    expect(surligneur.opacite).toBe(0.35)
    expect(surligneur.pression).toBe(false)
    expect(surligneur.taille).toBe(18)
    const im = formes.find((f): f is ImageForme => f.type === 'image')!
    expect([im.x, im.y, im.l, im.h, im.m, im.fixe]).toEqual([0, 0, 400, 200, [0.5, 0, -0, 0.5], true])
    expect(tab.doc.getMap('images').get(im.src)).toBe(PNG)
    const fo = formes.find((f): f is Formule => f.type === 'formule')!
    expect([fo.x, fo.y, fo.couleur, fo.taille]).toEqual([120, 80, '#16a085', 20])
  })

  it('les figures : points en croix, segment et droite qui suivent leurs points, arc au compas, liés à leur image', async () => {
    const tab = new Tableau(null)
    const image = { id: 1, x: 0, y: 0, w: 400, h: 200, cx: 0, cy: 0, cw: 400, ch: 200, srcRef: 'a1', z: 1 }
    const A = { id: 2, x: 10, y: 20, color: '#e74c3c', shape: 'cross', z: 2 }, B = { id: 3, x: 110, y: 20, color: '#e74c3c', shape: 'cross', z: 3 }
    const C = { id: 4, x: 50, y: 300, color: '#2d3436', shape: 'cross', z: 4 }
    const seg = { id: 5, p1_id: 2, p2_id: 3, lineType: 'segment', color: '#e74c3c', width: 3, dash: 'solid', arrowStart: 0, arrowEnd: 0, z: 5, surObjet: { type: 'image', id: 1, aCote: false } }
    const droite = { id: 6, p1_id: 2, p2_id: 4, lineType: 'droite', color: '#2d3436', width: 8, dash: 'dashed', arrowStart: 0, arrowEnd: 0, z: 6 }
    const arc = { id: 7, type: 'arc', cx: 0, cy: 0, radius: 100, startAngle: 3, endAngle: 0.5, counterClockwise: false, color: '#2d3436', width: 3, dash: 'dotted', z: 7 }
    const B2 = { ...B, y: 60 }
    const a = lireAncienTableau(JSON.stringify({ name: 'x', data: { assets: { a1: PNG }, pages: [{
      ...vide, images: [image], points: [A, B2, C], segments: [seg, droite], arcs: [arc],
      filmArchive: [{ ...vide, images: [image], t: T0 }],
      film: [
        { points: { '+': [A, B] }, segments: { '+': [seg] }, t: T0 + MIN },
        { points: { '+': [C] }, segments: { '+': [droite] }, arcs: { '+': [arc] }, t: T0 + 2 * MIN },
        // B bouge : le segment le suit
        { points: [A, B2, C], t: T0 + 3 * MIN },
      ],
    }] } }))
    const b = await reprendre(tab, a, preparer)
    expect(b.figures).toBe(6)
    expect(b.laisses).toBe(0)
    expect(texteDuBilan(a, b)).toBe('« x » : 1 page, 0 trait, 1 image, 6 figures, avec son film.')
    const formes = [...tab.formesDe(tab.ordre.get(0))!.values()]
    const im = formes.find(f => f.type === 'image')!
    const lignes = formes.filter((f): f is Polygone => f.type === 'polygone' && f.pts.length === 4)
    const points = formes.filter((f): f is Polygone => f.type === 'polygone' && f.pts.length === 2)
    expect(points).toHaveLength(3)
    for (const p of points) expect([p.sommets, p.stylePoints, p.noms]).toEqual([true, [{ marque: 'croix' }], undefined])
    // A et B, sous le segment posé sur l'image, la suivent ; C non
    expect(points.filter(p => p.lie === im.id)).toHaveLength(2)
    const s = lignes.find(l => !l.prolonge)!, dr = lignes.find(l => l.prolonge)!
    expect(s.lie).toBe(im.id)
    expect([s.x - im.x, s.y - im.y, s.pts]).toEqual([10, 20, [0, 0, 100, 40]])
    expect([dr.prolonge, dr.tirets, dr.taille, dr.couleur, dr.lie]).toEqual(['droite', true, 4.5, '#2d3436', undefined])
    const ce = formes.find((f): f is Cercle => f.type === 'cercle')!
    expect([ce.x - im.x, ce.y - im.y, ce.r, ce.tirets]).toEqual([0, 0, 100, true])
    expect(ce.arc!.a0).toBe(3)
    expect(ce.arc!.a1).toBeCloseTo(0.5 + 2 * Math.PI)
    // Le film : le segment est posé, puis reposé quand B bouge
    expect(tab.film.toArray().map(e => e.t)).toEqual([T0, T0, T0 + MIN, T0 + 2 * MIN, T0 + 3 * MIN])
  })

  it('un rectangle, rempli ou non ; un cache devient un aplat opaque, sans ses coins', async () => {
    const tab = new Tableau(null)
    const image = { id: 1, x: 0, y: 0, w: 400, h: 200, cx: 0, cy: 0, cw: 400, ch: 200, srcRef: 'a1', z: 1 }
    const pt = (id: number, x: number, y: number) => ({ id, x, y, color: '#e74c3c', shape: 'cross', z: id })
    const cadre = { id: 4, p1_id: 2, p2_id: 3, color: '#2ecc71', width: 3, dash: 'solid', isFilled: false, fillColor: '#e74c3c', fillOpacity: 0.2, z: 4 }
    const plein = { id: 7, p1_id: 5, p2_id: 6, color: '#e74c3c', width: 3, dash: 'dashed', isFilled: true, fillColor: '#3498db', fillOpacity: 0.2, z: 7 }
    const cache = { id: 10, p1_id: 8, p2_id: 9, color: '#ffffff', width: 1, dash: 'solid', isFilled: true, fillColor: '#ffffff', fillOpacity: 1, cache: true, z: 10, surObjet: { type: 'image', id: 1, aCote: false } }
    const a = lireAncienTableau(JSON.stringify({ name: 'x', data: { assets: { a1: PNG }, pages: [{
      ...vide, images: [image], points: [pt(2, 10, 10), pt(3, 110, 60), pt(5, 300, 100), pt(6, 200, 150), pt(8, 50, 50), pt(9, 150, 100)], rectangles: [cadre, plein, cache],
    }] } }))
    const b = await reprendre(tab, a, preparer)
    // 4 coins visibles (ceux du cache, non) et 3 rectangles
    expect(b.figures).toBe(7)
    const formes = [...tab.formesDe(tab.ordre.get(0))!.values()]
    const rect = formes.filter((f): f is Polygone => f.type === 'polygone' && f.ferme)
    expect(rect).toHaveLength(2)
    const vide_ = rect.find(r => !r.fond)!, rempli = rect.find(r => r.fond)!
    expect([vide_.pts, vide_.tirets, vide_.couleur]).toEqual([[0, 0, 100, 0, 100, 50, 0, 50], undefined, '#2ecc71'])
    expect([rempli.pts, rempli.fond, rempli.tirets]).toEqual([[0, 0, 100, 0, 100, 50, 0, 50], '#3498db', true])
    expect(formes.filter(f => f.type === 'polygone' && !f.ferme)).toHaveLength(4)
    const ap = formes.find((f): f is ImageForme => f.type === 'image' && f.l === 1)!
    expect([ap.x, ap.y, ap.m]).toEqual([50, 50, [100, 0, 0, 50]])
    // Un PNG d'un pixel blanc, valable
    const png = atob((tab.doc.getMap('images').get(ap.src) as string).split(',')[1])
    expect(png.slice(1, 4)).toBe('PNG')
    expect(png.length).toBe(72)
  })

  it('un film sans heures : la date de son nom, à 8 h, ses gestes à la suite', () => {
    expect(dateDuNom('4 - Mardi 22 septembre 2026')).toBe(new Date(2026, 8, 22, 8, 0).getTime())
    expect(dateDuNom('5A - Jeudi 1er octobre 2026')).toBe(new Date(2026, 9, 1, 8, 0).getTime())
    expect(dateDuNom('2026-10-13-5a-mardi')).toBe(new Date(2026, 9, 13, 8, 0).getTime())
    expect(dateDuNom('Février 2026')).toBe(null)
    const t1 = trait(1, 0, 0), t2 = trait(2, 9, 9)
    const a = lireAncienTableau(JSON.stringify({ name: 'x', enregistreLe: T0 + 13 * 24 * 60 * MIN, data: { pages: [{
      ...vide, freehands: [t1, t2], film: [{ ...vide }, { freehands: { '+': [t1] } }, { freehands: { '+': [t2] } }],
    }] } }), '4 - Mardi 22 septembre 2026.prof')
    const d = new Date(2026, 8, 22, 8, 0).getTime()
    expect(a.pages[0].etats.map(e => e.t)).toEqual([d, d + 5000, d + 10000])
    expect([a.debut, a.fin]).toEqual([d, d + 10000])
  })

  it('un tableau en mode nuit : ses pages de nuit dès le début, son encre blanche devient le Noir', async () => {
    const tab = new Tableau(null)
    const blanc = trait(1, 0, 0, { color: '#ffffff' }), rouge = trait(2, 9, 9, { color: '#e74c3c' })
    const a = lireAncienTableau(JSON.stringify({ name: 'x', data: { modeNuit: true, pages: [
      { ...vide, freehands: [blanc, rouge], texts: [{ id: 3, x: 0, y: 0, content: 'A', color: '#FFF', fontSize: 20, z: 3 }],
        filmArchive: [{ ...vide, t: T0 }], film: [{ freehands: { '+': [blanc, rouge] }, t: T0 + MIN }, { texts: [{ id: 3, x: 0, y: 0, content: 'A', color: '#FFF', fontSize: 20, z: 3 }], t: T0 + 2 * MIN }] },
      // Une page qui dit être de jour le reste, son blanc aussi
      { ...vide, modeNuit: false, freehands: [trait(4, 0, 0, { color: '#ffffff' })] },
    ] } }))
    expect(a.pages.map(p => !!p.nuit)).toEqual([true, false])
    await reprendre(tab, a, preparer)
    const [p1, p2] = [tab.ordre.get(0), tab.ordre.get(1)]
    expect([tab.nuitDe(p1), tab.nuitDe(p2)]).toEqual([true, false])
    const couleurs = (id: string) => [...tab.formesDe(id)!.values()].map(f => (f as Trait).couleur).sort()
    expect(couleurs(p1)).toEqual(['#1b2230', '#1b2230', '#e74c3c'])
    expect(couleurs(p2)).toEqual(['#ffffff'])
    // La bascule est au début de la séance, avant les gestes
    const film = tab.film.toArray()
    expect(film.every(e => e.t >= T0)).toBe(true)
    expect(tab.seancesDuClasseur()[0].debut).toBe(T0)
  })

  it('une calculatrice NumWorks : une calculatrice d\'ici, tenue et centrée dans son cadre, qui bouge dans le film', async () => {
    const tab = new Tableau(null)
    const calc = (x: number, w: number, h: number) => ({ id: 5, x, y: 0, w, h, mode: 'web', titre: 'NumWorks lycée', url: 'https://example.com/calculatrice.html?modele=lycee', content: '', z: 5 })
    const autre = { id: 6, x: 0, y: 0, w: 100, h: 100, mode: 'web', titre: 'Une page', url: 'https://example.com/', content: '', z: 6 }
    const a = lireAncienTableau(JSON.stringify({ name: 'x', data: { pages: [{
      ...vide, htmlPostits: [calc(100, 720, 660), autre],
      filmArchive: [{ ...vide, t: T0 }],
      film: [{ htmlPostits: { '+': [calc(0, 360, 660)] }, t: T0 + MIN }, { htmlPostits: [calc(100, 720, 660), autre], t: T0 + 2 * MIN }],
    }] } }))
    const vus: string[] = []
    const b = await reprendre(tab, a, preparer, m => { vus.push(m); return PNG })
    expect([b.calculatrices, b.laisses]).toEqual([1, 1])
    expect(texteDuBilan(a, b)).toContain('1 calculatrice, avec son film. 1 objet')
    expect(vus).toEqual(['lycee'])
    expect(tab.doc.getMap('images').get('calc-accueil-lycee-314')).toBe(PNG)
    const [c] = [...tab.formesDe(tab.ordre.get(0))!.values()] as ImageForme[]
    // 720 × 660 : la calculatrice (314 de large) tient en hauteur (échelle 1), centrée en largeur
    expect([c.type, c.calculatrice, c.src, c.l, c.h, c.m, c.x, c.y]).toEqual(['image', 'lycee', 'calc-accueil-lycee-314', 314, 660, [1, 0, 0, 1], 303, 0])
    expect(tab.film.toArray().map(e => e.t)).toEqual([T0, T0 + MIN, T0 + 2 * MIN])
    // Sans dessin donné, elle n'est pas reprise (comptée)
    const b2 = await reprendre(new Tableau(null), a, preparer)
    expect([b2.calculatrices, b2.laisses]).toEqual([0, 2])
  })

  it('une image tournée garde son centre', async () => {
    const tab = new Tableau(null)
    const image = { id: 1, x: 0, y: 0, w: 200, h: 100, cx: 0, cy: 0, cw: 400, ch: 200, srcRef: 'a1', angle: Math.PI / 2 }
    const a = lireAncienTableau(JSON.stringify({ name: 'x', data: { assets: { a1: PNG }, pages: [{ ...vide, images: [image], freehands: [trait(2, -500, -500)] }] } }))
    await reprendre(tab, a, preparer)
    const im = [...tab.formesDe(tab.ordre.get(0))!.values()].find((f): f is ImageForme => f.type === 'image')!
    // Le centre (100, 50) + le décalage (500, 500)
    const cx = im.x + im.m[0] * im.l / 2 + im.m[2] * im.h / 2, cy = im.y + im.m[1] * im.l / 2 + im.m[3] * im.h / 2
    expect(cx).toBeCloseTo(600)
    expect(cy).toBeCloseTo(550)
    expect(im.m[1]).toBeCloseTo(0.5)
  })

  it('une image rognée devient la partie gardée ; une image illisible est comptée', async () => {
    const tab = new Tableau(null)
    const vues: unknown[] = []
    const rognee = { id: 1, x: 0, y: 0, w: 100, h: 50, cx: 10, cy: 20, cw: 200, ch: 100, srcRef: 'a1' }
    const perdue = { id: 2, x: 0, y: 0, w: 100, h: 50, cx: 0, cy: 0, cw: 1, ch: 1, srcRef: 'absente' }
    const a = lireAncienTableau(JSON.stringify({ name: 'x', data: { assets: { a1: PNG }, pages: [{ ...vide, images: [rognee, perdue] }] } }))
    const b = await reprendre(tab, a, async (d, r) => { vues.push(r); return preparer(d, r) })
    expect(vues).toEqual([{ x: 10, y: 20, l: 200, h: 100 }])
    expect(b.images).toBe(1)
    expect(b.imagesIllisibles).toBe(1)
    expect(texteDuBilan(a, b)).toContain('1 image n\'a pas pu être lue.')
  })

  it('la fenêtre dit les séances, du plus ancien au plus récent ; sans classeur ouvert, aucune liste', () => {
    const a = lireAncienTableau(fichier(), '2 - Mardi 29 septembre 2026.prof') as AncienTableau
    expect(textesAvantAnciens([a], null)).toEqual({
      textes: [
        '« 2 - Mardi 29 septembre 2026 » : séance du mardi 29 septembre 2026, 2 pages.',
        'Il devient une séance d\'un classeur, avec ses traits, ses images, ses figures, ses textes et son film.',
      ],
      lignes: [],
      ajoutable: false,
      aide: null,
    })
    expect(textesAvantAnciens([a, a], null).textes[0]).toBe('2 anciens tableaux, du plus ancien au plus récent :')
  })

  it('la fenêtre dit où il se rangera dans le classeur ouvert, ou pourquoi il n\'y entre pas', () => {
    const a = lireAncienTableau(fichier(), '2 - Mardi 29 septembre 2026.prof')
    const b = lireAncienTableau(fichier({ debut: T0 + JOUR }), 'Copie.prof')
    const lignes: LigneApercu[] = [{ texte: 'x', sort: '— ira ici', genre: 'ici' }]
    const r = textesAvantAnciens([a], { nom: 'Fractions', lignes, verdicts: [{ verdict: 'place' }] })
    expect(r.textes.at(-1)).toBe('Dans « Fractions », il se rangera à sa date :')
    expect([r.lignes, r.ajoutable, r.aide]).toEqual([lignes, true, null])
    // Deux, dont un qui n'entre pas : « ils se rangeront », et le survol du bouton le dit
    const r2 = textesAvantAnciens([a, b], { nom: 'Fractions', lignes, verdicts: [{ verdict: 'place' }, { verdict: 'deja', gene: null }] })
    expect(r2.textes.at(-1)).toBe('Dans « Fractions », ils se rangeront à leur date :')
    expect([r2.ajoutable, r2.aide]).toEqual([true, 'Ajoute le tableau qui se range ; « Copie » ne sera pas ajouté.'])
    // Un seul, qui n'entre pas : la phrase dit la séance qui gêne, pas de liste, pas de bouton
    const gene: SeanceDApercu = { debut: T0 - 10 * MIN, nom: null, pages: 2 }
    const r3 = textesAvantAnciens([a], { nom: 'Fractions', lignes, verdicts: [{ verdict: 'chevauche', gene }] })
    expect(r3.textes.at(-1)).toBe(`« Fractions » a déjà une séance écrite à ces heures-là (${dateCourteMajuscule(gene.debut)} · ${pagesLisibles(2)}) : cet ancien tableau ne peut pas s'y ajouter.`)
    expect([r3.lignes, r3.ajoutable]).toEqual([[], false])
    const r4 = textesAvantAnciens([a], { nom: 'Fractions', lignes, verdicts: [{ verdict: 'deja', gene: { debut: T0, nom: null, pages: 2 } }] })
    expect(r4.textes.at(-1)).toBe(`« 2 - Mardi 29 septembre 2026 » est déjà dans « Fractions » (séance du ${dateCourte(T0)}).`)
    // Plusieurs, aucun n'entre : la liste reste (elle dit lequel gêne), le bouton non
    const r5 = textesAvantAnciens([a, b], { nom: 'Fractions', lignes, verdicts: [{ verdict: 'deja', gene: null }, { verdict: 'chevauche', gene: null }] })
    expect(r5.textes.at(-1)).toBe('« Fractions » a déjà une séance aux heures de chacun de ces anciens tableaux : aucun ne peut s\'y ajouter.')
    expect([r5.lignes, r5.ajoutable]).toEqual([lignes, false])
  })

  it('la séance qui gêne : celle du même début, sinon celle en cours à ses heures, sinon la première', () => {
    const S: SeanceDApercu[] = [{ debut: T0, nom: null, pages: 2 }, { debut: T0 + JOUR, nom: 'B', pages: 1 }, { debut: T0 + 3 * JOUR, nom: null, pages: 1 }]
    expect(seanceGenante(S, { debut: T0 + JOUR, fin: T0 + JOUR + MIN })).toBe(S[1])
    expect(seanceGenante(S, { debut: T0 + 2 * JOUR, fin: T0 + 2 * JOUR + MIN })).toBe(S[1])
    expect(seanceGenante(S, { debut: T0 - JOUR, fin: T0 - JOUR + MIN })).toBe(S[0])
    expect(seanceGenante([], { debut: T0, fin: T0 })).toBeNull()
  })
})

/** Un ancien tableau rejoué dans son classeur brouillon */
async function brouillon(json: string, nom: string) {
  const a = lireAncienTableau(json, nom)
  const tab = new Tableau(null)
  return { a, tab, bilan: await reprendre(tab, a, preparer) }
}
const JOUR = 24 * 60 * MIN
const trie = (t: Tableau) => { const h = t.film.toArray().map(e => e.t); return [...h].sort((x, y) => x - y).join() === h.join() }

describe('ranger les anciens tableaux à leur date', () => {
  it('le brouillon : une séance, ses pages, son film trié de son début à sa fin ; le bilan dit la séance', async () => {
    const { a, tab, bilan } = await brouillon(fichier(), 'Lundi.prof')
    const s = tab.seancesDuClasseur()
    expect(s).toHaveLength(1)
    expect([s[0].id, s[0].debut, s[0].pages.length]).toEqual([bilan.seance, a.debut, 2])
    const h = tab.film.toArray().map(e => e.t)
    expect([h[0], h[h.length - 1], trie(tab)]).toEqual([a.debut, a.fin, true])
  })

  it('plusieurs séances dans un classeur, chacune à sa date : chacune la sienne, dans le film comme dans le fichier', async () => {
    const lundi = await brouillon(fichier(), 'Lundi.prof')
    const mardi = await brouillon(fichier({ debut: T0 + JOUR }), 'Mardi.prof')
    const dimanche = await brouillon(fichier({ debut: T0 - JOUR }), 'Dimanche.prof')
    // Lundi puis mardi, dans un classeur vide (« Nouveau classeur »)
    const r1 = rangerDansLeClasseur(new Tableau(null), [lundi, mardi])
    expect(r1.verdicts).toEqual([{ verdict: 'place' }, { verdict: 'place' }])
    expect(r1.ajoutes.map(b => b.a.nom)).toEqual(['Lundi', 'Mardi'])
    const tab = r1.cible
    expect(tab.seancesDuClasseur().map(s => [s.debut, s.pages.length])).toEqual([[T0, 2], [T0 + JOUR, 2]])
    // La même image, reprise par les deux séances : gardée une fois
    expect(tab.doc.getMap('images').size).toBe(1)
    // Un plus ancien ensuite, dans ce classeur lu dans un document neuf (comme celui de l'onglet) : il se range en premier
    const lu = new Tableau(null); lu.seancesActives = true; lu.lireEtat(Y.encodeStateAsUpdate(tab.doc))
    const r2 = rangerDansLeClasseur(lu, [dimanche])
    expect(r2.verdicts).toEqual([{ verdict: 'place' }])
    expect(r2.cible.doc.getMap('images').size).toBe(1)
    // Le classeur de l'onglet reçoit la différence
    tab.lireEtat(Y.encodeStateAsUpdate(r2.cible.doc, Y.encodeStateVector(tab.doc)))
    expect(tab.seancesDuClasseur().map(s => s.debut)).toEqual([T0 - JOUR, T0, T0 + JOUR])
    expect(trie(tab)).toBe(true)
    // Ses pages avant celles des séances d'après
    expect(tab.ordre.toArray().slice(0, 2)).toEqual(tab.seancesDuClasseur()[0].pages)
    // Relu depuis le fichier : trois séances, chacune avec ses deux pages et ses gestes
    const relu = new Tableau(null)
    relu.lireEtat(lireTableau(new Uint8Array(await ecrireTableau(tab.doc, Date.now(), { nom: 'Chapitre' }).arrayBuffer())).etat)
    expect(relu.film.length).toBe(tab.film.length)
    const s = seancesDuTableau(relu)!
    expect(s.map(x => [x.debut, x.pagesDeSeance.length, x.gestes])).toEqual([[T0 + JOUR, 2, 5], [T0, 2, 5], [T0 - JOUR, 2, 5]])
  })

  it('la chaîne refuse un doublon (déjà là) et un chevauchement, ajoute les autres, et le dit', async () => {
    const lundi = await brouillon(fichier(), 'Lundi.prof')
    const copie = await brouillon(fichier(), 'Lundi (copie).prof')
    const pendant = await brouillon(fichier({ debut: T0 + 2 * MIN }), 'Pendant.prof')
    const mardi = await brouillon(fichier({ debut: T0 + JOUR }), 'Mardi.prof')
    const r = rangerDansLeClasseur(new Tableau(null), [lundi, copie, pendant, mardi])
    expect(r.verdicts.map(v => v.verdict)).toEqual(['place', 'deja', 'chevauche', 'place'])
    expect(r.refuses.map(x => x.a.nom)).toEqual(['Lundi (copie)', 'Pendant'])
    // La séance qui gêne : celle de lundi, les deux fois
    expect(r.refuses.map(x => (x.verdict as { gene: SeanceDApercu | null }).gene?.debut)).toEqual([T0, T0])
    // Un refus ne change rien : les deux autres sont là, le film reste trié
    expect(r.cible.seancesDuClasseur().map(s => s.debut)).toEqual([T0, T0 + JOUR])
    expect(trie(r.cible)).toBe(true)
    expect(texteDesRefus('Chapitre', r.refuses)).toBe('« Lundi (copie) » n\'a pas été ajouté : il est déjà dans « Chapitre ». « Pendant » n\'a pas été ajouté : « Chapitre » a déjà une séance à cette heure.')
    expect(texteApresAjout('Chapitre', ['b1', 'b2'], r.refuses)).toBe('2 séances ajoutées à « Chapitre ». b1 b2 « Lundi (copie) » n\'a pas été ajouté : il est déjà dans « Chapitre ». « Pendant » n\'a pas été ajouté : « Chapitre » a déjà une séance à cette heure.')
    expect(texteApresAjout('Chapitre', ['b1'], [])).toBe('Séance ajoutée à « Chapitre ». b1')
    // La même séance supprimée du classeur (ses pages à la corbeille) : le même ancien tableau y revient, à la place de sa trace
    const C = new Tableau(null); C.seancesActives = true; C.lireEtat(Y.encodeStateAsUpdate(r.cible.doc))
    const s0 = C.seancesDuClasseur()[0]
    expect(supprimerSeance(C, s0.id)).toEqual({ pages: s0.pages })
    const r3 = rangerDansLeClasseur(C, [lundi])
    expect(r3.verdicts).toEqual([{ verdict: 'place' }])
    expect(r3.cible.seancesDuClasseur().filter(s => s.pages.length).map(s => s.debut)).toEqual([T0, T0 + JOUR])
    expect(trie(r3.cible)).toBe(true)
  })
})

describe('l\'aperçu du rangement', () => {
  const S = (k: number, nom: string | null = null, pages = 3): SeanceDApercu => ({ debut: T0 + k * JOUR, nom, pages })
  const A = (k: number, nom: string, verdict: 'place' | 'chevauche' | 'deja' = 'place') => ({ debut: T0 + k * JOUR, nom, pages: 6, verdict })
  const D = (k: number) => dateCourteMajuscule(T0 + k * JOUR)

  it('un ancien au milieu : une voisine de chaque côté, le reste compté, la plus récente en haut', () => {
    const l = apercuDuRangement([S(0), S(2, 'Fractions (1)', 2), S(6), S(7), S(8), S(9)], [A(4, '2 - Lundi 28 septembre 2026')], 'Fractions')
    expect(l.map(x => x.genre)).toEqual(['plus', 'seance', 'ici', 'seance', 'plus'])
    expect(l.map(x => x.texte)).toEqual(['… 3 séances plus récentes', `${D(6)} · ${pagesLisibles(3)}`, `${D(4)} · « 2 - Lundi 28 septembre 2026 » · ${pagesLisibles(6)}`, `${D(2)} · Fractions (1) · ${pagesLisibles(2)}`, '… 1 séance plus ancienne'])
    expect(l.map(x => x.sort)).toEqual([undefined, undefined, '— ira ici', undefined, undefined])
  })

  it('en tête, en queue, deux anciens voisins, un refusé, deux voisines, sans ancien', () => {
    expect(apercuDuRangement([S(0), S(1)], [A(5, 'X')], 'C').map(x => x.genre)).toEqual(['ici', 'seance', 'plus'])
    expect(apercuDuRangement([S(3), S(4)], [A(0, 'X')], 'C').map(x => x.genre)).toEqual(['plus', 'seance', 'ici'])
    // Deux anciens : aucune ligne en double, la séance entre leurs voisines comptée
    const l = apercuDuRangement([S(0), S(2), S(3), S(4), S(6)], [A(1, 'X'), A(5, 'Y')], 'C')
    expect(l.map(x => x.genre)).toEqual(['seance', 'ici', 'seance', 'plus', 'seance', 'ici', 'seance'])
    expect(l[3].texte).toBe('… 1 autre séance')
    // Un refusé : à la même heure qu'une séance, juste avant elle, avec son sort
    const r = apercuDuRangement([S(0), S(2)], [A(2, 'X', 'chevauche'), A(0, 'Y', 'deja')], 'Fractions')
    expect(r.map(x => [x.genre, x.sort])).toEqual([
      ['refuse', '— déjà une séance à cette heure : ne sera pas ajouté'], ['seance', undefined],
      ['refuse', '— déjà dans « Fractions » : ne sera pas ajouté'], ['seance', undefined],
    ])
    expect(apercuDuRangement([S(0), S(1), S(2), S(4), S(5), S(6)], [A(3, 'X')], 'C', 2).map(x => x.genre)).toEqual(['plus', 'seance', 'seance', 'ici', 'seance', 'seance', 'plus'])
    // Une séance sans page ne compte pas ; sans ancien tableau, rien
    expect(apercuDuRangement([S(0), S(1, null, 0)], [A(5, 'X')], 'C').map(x => x.genre)).toEqual(['ici', 'seance'])
    expect(apercuDuRangement([S(0)], [], 'C')).toEqual([])
  })

})
