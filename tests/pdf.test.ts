// L'écrivain de PDF (src/sorties/pdf.ts) : un PDF écrit à la main, une image
// par feuille (couleurs indexées, ou JPEG pour une photo). Le fichier doit se
// lire partout : l'en-tête et sa ligne binaire, chaque décalage de la table
// des renvois exact, l'arbre des pages, la taille A4, le titre en UTF-16 avec
// ses accents. La palette : une image de 256 couleurs au plus revient telle
// quelle ; du bruit (une photo) n'en a pas ; une petite marque de couleur
// garde la sienne sur une page chargée ; un aplat qu'aucune couleur de la
// palette ne rend refuse la palette (la feuille part en RVB sans perte, dont
// les lignes prédites se relisent exactement).
import { describe, expect, it } from 'vitest'
import { unzlibSync } from 'fflate'
import { A4, couleurHex, datePdf, ecrirePdf, imageIndexee, imageRvb, lignesPredites, palettiser, palettiserLignes, utf16 } from '../src/sorties/pdf'
import type { Feuille } from '../src/sorties/pdf'
import { DPR_PDF, MARGE_CONTENU, PPP, PX_PAR_MM, Z_REEL, dateDeFichier, decouper, listeNumeros, mettreEnPage, nomDuPdf, papier, piedDePage, texteFini, texteProgression, texteRien, titreDuPdf } from '../src/sorties/mise-en-page'

/** Une image RVBA l × h faite d'un motif de quelques couleurs */
function motif(l: number, h: number, couleurs: number[][]): Uint8ClampedArray {
  const d = new Uint8ClampedArray(l * h * 4)
  for (let y = 0; y < h; y++) for (let x = 0; x < l; x++) {
    const c = couleurs[(Math.floor(x / 7) + Math.floor(y / 5) * 3) % couleurs.length]
    const k = (y * l + x) * 4
    d[k] = c[0]; d[k + 1] = c[1]; d[k + 2] = c[2]; d[k + 3] = 255
  }
  return d
}

/** Un faux JPEG (le PDF ne le décode pas : il le range) */
const jpegFactice = () => new Uint8Array([0xff, 0xd8, 0xff, 0xe0, 1, 2, 3, 4, 5, 0xff, 0xd9])

const latin1 = (o: Uint8Array) => Array.from(o, c => String.fromCharCode(c)).join('')

describe('ecrirePdf', () => {
  const l = 40, h = 30
  const p = palettiser(motif(l, h, [[255, 255, 255], [27, 34, 48], [214, 69, 69]]), l, h)!
  const feuilles: Feuille[] = [
    { l: A4.l, h: A4.h, image: imageIndexee(p, l, h) },
    { l: A4.h, h: A4.l, image: { genre: 'jpeg', largeur: 1654, hauteur: 2339, donnees: jpegFactice() } },
  ]
  const date = new Date(2026, 9, 9, 14, 30, 5).getTime()
  const octets = ecrirePdf(feuilles, { titre: 'Exercice 12 p. 84 — géométrie (été)', date })
  const texte = latin1(octets)

  it('commence par %PDF-1.4, puis une ligne de quatre octets binaires ; finit par %%EOF', () => {
    expect(texte.startsWith('%PDF-1.4\n%')).toBe(true)
    const ligne = octets.subarray(10, 14)
    expect([...ligne].every(c => c > 127)).toBe(true)
    expect(octets[14]).toBe(0x0a)
    expect(texte.endsWith('%%EOF\n')).toBe(true)
  })

  it('chaque décalage de la table des renvois pointe sur « n 0 obj » ; startxref pointe sur la table', () => {
    const debut = Number(/startxref\n(\d+)\n%%EOF\n$/.exec(texte)![1])
    expect(texte.slice(debut, debut + 5)).toBe('xref\n')
    const tete = /^xref\n0 (\d+)\n/.exec(texte.slice(debut))!
    const n = Number(tete[1])
    expect(n).toBe(3 + feuilles.length * 3 + 1)
    const entrees = texte.slice(debut + tete[0].length).split('trailer')[0]
    expect(entrees.length).toBe(n * 20)
    expect(entrees.slice(0, 20)).toBe('0000000000 65535 f \n')
    for (let i = 1; i < n; i++) {
      const e = entrees.slice(i * 20, i * 20 + 20)
      expect(e).toMatch(/^\d{10} 00000 n \n$/)
      const k = Number(e.slice(0, 10))
      expect(texte.slice(k, k + `${i} 0 obj`.length)).toBe(`${i} 0 obj`)
    }
    expect(texte).toMatch(new RegExp(`trailer\\n<< /Size ${n} /Root 1 0 R /Info ${n - 1} 0 R >>`))
  })

  it('deux pages (/Count 2), la première en A4 portrait, la seconde en paysage ; chaque page pose son image sur toute la feuille', () => {
    expect(texte).toContain('/Type /Pages /Kids [3 0 R 6 0 R] /Count 2')
    expect(texte).toContain('/MediaBox [0 0 595.28 841.89]')
    expect(texte).toContain('/MediaBox [0 0 841.89 595.28]')
    expect(texte).toContain('q 595.28 0 0 841.89 0 0 cm /Im0 Do Q')
    expect(texte).toContain('/Resources << /XObject << /Im0 5 0 R >> >> /Contents 4 0 R')
  })

  it('l\'image indexée : sa palette en hexadécimal, ses indices compressés (Flate) qui se relisent ; le JPEG en DCTDecode', () => {
    expect(texte).toContain(`/Width ${l} /Height ${h} /ColorSpace [/Indexed /DeviceRGB 2 <ffffff1b2230d64545>] /BitsPerComponent 8 /Filter /FlateDecode`)
    const m = /\/Filter \/FlateDecode \/Length (\d+) >>\nstream\n/.exec(texte)!
    const debut = m.index + m[0].length, long = Number(m[1])
    expect(unzlibSync(octets.subarray(debut, debut + long))).toEqual(p.indices)
    expect(texte.slice(debut + long, debut + long + 11)).toBe('\nendstream\n')
    expect(texte).toContain('/Width 1654 /Height 2339 /ColorSpace /DeviceRGB /BitsPerComponent 8 /Filter /DCTDecode /Length 11 >>')
  })

  it('les informations : le titre en UTF-16BE avec ses accents, le producteur, la date', () => {
    const t = /\/Title <([0-9A-F]+)>/.exec(texte)![1]
    expect(t.startsWith('FEFF')).toBe(true)
    let lu = ''
    for (let i = 4; i < t.length; i += 4) lu += String.fromCharCode(parseInt(t.slice(i, i + 4), 16))
    expect(lu).toBe('Exercice 12 p. 84 — géométrie (été)')
    expect(texte).toContain('/Producer (MEM teachingtool)')
    expect(texte).toContain('/CreationDate (D:20261009143005)')
    expect(datePdf(date)).toBe('20261009143005')
    // Un caractère hors du plan de base : sa paire de substitution
    expect(utf16('a😀')).toBe('FEFF0061D83DDE00')
  })
})

/** Défait les filtres PNG (0 aucun, 1 gauche, 2 haut, 3 moyenne, 4 Paeth) de
 *  ces lignes : ce que fait un lecteur de PDF avec le prédicteur 15 */
function defaire(o: Uint8Array, l: number, h: number): Uint8Array {
  const w = l * 3, r = new Uint8Array(w * h)
  for (let y = 0; y < h; y++) {
    const f = o[y * (w + 1)]
    for (let x = 0; x < w; x++) {
      const v = o[y * (w + 1) + 1 + x]
      const a = x >= 3 ? r[y * w + x - 3] : 0, b = y ? r[(y - 1) * w + x] : 0, c = x >= 3 && y ? r[(y - 1) * w + x - 3] : 0
      const p = a + b - c, pa = Math.abs(p - a), pb = Math.abs(p - b), pc = Math.abs(p - c)
      const pr = pa <= pb && pa <= pc ? a : pb <= pc ? b : c
      r[y * w + x] = (v + (f === 0 ? 0 : f === 1 ? a : f === 2 ? b : f === 3 ? (a + b) >> 1 : pr)) & 255
    }
  }
  return r
}

describe('le RVB sans perte', () => {
  // Un papier quadrillé, une écriture et un dégradé : chaque filtre a sa chance
  const l = 90, h = 60
  const d = new Uint8ClampedArray(l * h * 4)
  for (let y = 0; y < h; y++) for (let x = 0; x < l; x++) {
    const k = (y * l + x) * 4
    const ligne = x % 10 === 0 || y % 10 === 0
    const v = x > 60 ? [x * 3, y * 4, (x + y) & 255] : ligne ? [206, 220, 240] : [255, 255, 255]
    if ((x * 7 + y * 3) % 23 === 0) v.splice(0, 3, 27, 34, 48)
    d.set([...v, 255], k)
  }

  it('les lignes prédites se relisent exactement (filtre par ligne, comme un PNG) ; par tranches, le même résultat', () => {
    const g = lignesPredites(d, l, h, 7)
    const pas: number[] = []
    let r = g.next()
    while (!r.done) { pas.push(r.value); r = g.next() }
    expect(pas.length).toBe(Math.ceil(h / 7) - 1)
    const o = r.value
    expect(o.length).toBe(h * (1 + 3 * l))
    const lu = defaire(o, l, h)
    for (let i = 0; i < l * h; i++) expect([lu[i * 3], lu[i * 3 + 1], lu[i * 3 + 2]]).toEqual([d[i * 4], d[i * 4 + 1], d[i * 4 + 2]])
    // Des filtres choisis ligne par ligne, pas toujours le même
    const filtres = new Set(Array.from({ length: h }, (_, y) => o[y * (1 + 3 * l)]))
    expect(filtres.size).toBeGreaterThan(1)
    expect([...filtres].every(f => [0, 1, 2, 4].includes(f))).toBe(true)
  })

  it('dans le PDF : /DeviceRGB, FlateDecode, le prédicteur 15 et la largeur ; le flux se décompresse en ces lignes', () => {
    const im = imageRvb(d, l, h)
    const octets = ecrirePdf([{ l: A4.l, h: A4.h, image: im }], { titre: 't', date: 0 })
    const texte = latin1(octets)
    const m = new RegExp(`/Width ${l} /Height ${h} /ColorSpace /DeviceRGB /BitsPerComponent 8 /Filter /FlateDecode /DecodeParms << /Predictor 15 /Colors 3 /BitsPerComponent 8 /Columns ${l} >> /Length (\\d+) >>\nstream\n`).exec(texte)!
    expect(m).not.toBeNull()
    const debut = m.index + m[0].length, long = Number(m[1])
    const lu = defaire(unzlibSync(octets.subarray(debut, debut + long)), l, h)
    expect([...lu.subarray((l + 1) * 3, (l + 1) * 3 + 3)]).toEqual([255, 255, 255])
    expect([...lu.subarray((5 * l + 70) * 3, (5 * l + 70) * 3 + 3)]).toEqual([210, 20, 75])
  })
})

describe('palettiser', () => {
  it('256 couleurs au plus : rendues exactement, chaque pixel retrouve la sienne', () => {
    const l = 64, h = 48
    const couleurs = Array.from({ length: 256 }, (_, i) => [i, (i * 7) & 255, (i * 13) & 255])
    const d = new Uint8ClampedArray(l * h * 4)
    for (let i = 0; i < l * h; i++) { const c = couleurs[i % 256]; d.set([c[0], c[1], c[2], 255], i * 4) }
    const p = palettiser(d, l, h)!
    expect(p.palette.length).toBe(256 * 3)
    for (let i = 0; i < l * h; i++) {
      const q = p.indices[i]
      expect([p.palette[q * 3], p.palette[q * 3 + 1], p.palette[q * 3 + 2]]).toEqual([d[i * 4], d[i * 4 + 1], d[i * 4 + 2]])
    }
  })

  it('trois couleurs : une palette de trois, la plus fréquente en premier ; l\'alpha ignoré', () => {
    const d = motif(20, 10, [[255, 255, 255], [255, 255, 255], [0, 0, 0], [10, 20, 30]])
    for (let i = 3; i < d.length; i += 8) d[i] = 0          // un alpha quelconque ne change rien
    const p = palettiser(d, 20, 10)!
    expect(p.palette.length).toBe(9)
    expect([...p.palette.subarray(0, 3)]).toEqual([255, 255, 255])
  })

  it('une couleur rare hors des 256 prend la plus proche', () => {
    const l = 300, h = 10
    const d = new Uint8ClampedArray(l * h * 4)
    // 256 couleurs fréquentes (gris), puis quelques pixels d'une 257e
    for (let i = 0; i < l * h; i++) { const g = i % 256; d.set([g, g, g, 255], i * 4) }
    d.set([101, 99, 100, 255], 0)
    const p = palettiser(d, l, h)!
    const q = p.indices[0]
    expect(Math.abs(p.palette[q * 3] - 100)).toBeLessThanOrEqual(1)
  })

  it('du bruit (une photo) : null, la feuille partira en JPEG', () => {
    const l = 200, h = 150
    const d = new Uint8ClampedArray(l * h * 4)
    // xorshift32 : un hasard reproductible, sans motif dans ses bits de poids faible
    let s = 2463534242
    const hasard = () => { s ^= s << 13; s ^= s >>> 17; s ^= s << 5; return (s >>> 24) & 255 }
    for (let i = 0; i < l * h; i++) d.set([hasard(), hasard(), hasard(), 255], i * 4)
    expect(palettiser(d, l, h)).toBeNull()
  })

  /** Une page chargée : 300 nuances fréquentes (les bords lissés d'une encre
   *  sur le papier, de 0 à 255 par pas de 0,85), plus fréquentes chacune que
   *  la petite marque de couleur qu'on y pose */
  const chargee = (l: number, h: number) => {
    const d = new Uint8ClampedArray(l * h * 4)
    for (let i = 0; i < l * h; i++) {
      const t = Math.floor(i / 7) % 300, v = Math.round(t * 0.85)
      d.set([v, v, Math.min(255, v + 14), 255], i * 4)
    }
    return d
  }
  const poser = (d: Uint8ClampedArray, l: number, x0: number, y0: number, n: number, c: number[]) => {
    for (let y = y0; y < y0 + n; y++) for (let x = x0; x < x0 + n; x++) d.set([...c, 255], (y * l + x) * 4)
  }

  it('une petite marque de couleur sur une page chargée garde sa couleur exacte (les couleurs des formes passent d\'abord)', () => {
    const l = 400, h = 300
    const d = chargee(l, h)
    const vert = [46, 158, 91], bleu = [27, 95, 191]
    poser(d, l, 100, 100, 6, vert)
    poser(d, l, 200, 100, 6, bleu)
    const p = palettiser(d, l, h, [couleurHex('#2e9e5b')!, couleurHex('#1b5fbf')!, couleurHex('#123456')!])!
    expect(p).not.toBeNull()
    expect(p.palette.length).toBe(256 * 3)
    const lu = (x: number, y: number) => { const q = p.indices[y * l + x]; return [p.palette[q * 3], p.palette[q * 3 + 1], p.palette[q * 3 + 2]] }
    expect(lu(102, 102)).toEqual(vert)
    expect(lu(202, 102)).toEqual(bleu)
    // Une couleur forcée absente de l'image ne prend pas de place
    const pal = Array.from({ length: 256 }, (_, q) => (p.palette[q * 3] << 16) | (p.palette[q * 3 + 1] << 8) | p.palette[q * 3 + 2])
    expect(pal).not.toContain(0x123456)
    // Sans les couleurs des formes, les nuances voisines s'écartent d'abord et
    // laissent aussi la place aux marques
    const q = palettiser(d, l, h)!
    const lu2 = (x: number, y: number) => { const k = q.indices[y * l + x]; return [q.palette[k * 3], q.palette[k * 3 + 1], q.palette[k * 3 + 2]] }
    expect(lu2(102, 102)).toEqual(vert)
  })

  it('un aplat qu\'aucune couleur de la palette ne rend : pas de palette (null) ; des pixels faux isolés (des bords lissés) : la palette', () => {
    // 343 couleurs très différentes (une grille de pas 40), chacune en
    // grands aplats : 87 ne trouvent pas de place, et leurs aplats seraient faux
    const l = 343 * 8, h = 40
    const grille: number[][] = []
    for (let r = 0; r < 7; r++) for (let g = 0; g < 7; g++) for (let b = 0; b < 7; b++) grille.push([r * 40, g * 40, b * 40])
    const d = new Uint8ClampedArray(l * h * 4)
    for (let y = 0; y < h; y++) for (let x = 0; x < l; x++) d.set([...grille[Math.floor(x / 8)], 255], (y * l + x) * 4)
    expect(palettiser(d, l, h)).toBeNull()
    // 256 de ces couleurs en fond (des bandes de 7 pixels) remplissent la
    // palette ; 40 pixels isolés d'autres couleurs de la grille (des bords
    // lissés) sont faux, mais seuls : la palette est gardée, ils prennent la
    // plus proche
    const l2 = 400, h2 = 300
    const e = new Uint8ClampedArray(l2 * h2 * 4)
    for (let i = 0; i < l2 * h2; i++) e.set([...grille[Math.floor(i / 7) % 256], 255], i * 4)
    for (let i = 0; i < 40; i++) e.set([...grille[256 + i], 255], (i * 2003 % (l2 * h2)) * 4)
    expect(palettiser(e, l2, h2)).not.toBeNull()
    // Moins de pixels faux encore, mais en un aplat de 7 × 7 : refusée
    const f = new Uint8ClampedArray(l2 * h2 * 4)
    for (let i = 0; i < l2 * h2; i++) f.set([...grille[Math.floor(i / 7) % 256], 255], i * 4)
    for (let y = 50; y < 57; y++) for (let x = 50; x < 57; x++) f.set([...grille[300], 255], (y * l2 + x) * 4)
    expect(palettiser(f, l2, h2)).toBeNull()
  })

  it('couleurHex : « #rgb », « #rrggbb » ; une autre écriture, null', () => {
    expect(couleurHex('#1b2230')).toBe(0x1b2230)
    expect(couleurHex('#FFF')).toBe(0xffffff)
    expect(couleurHex('rgba(1, 2, 3, 0.5)')).toBeNull()
    expect(couleurHex(undefined)).toBeNull()
  })

  it('par tranches de lignes : le même résultat, et la main rendue entre deux tranches', () => {
    const l = 50, h = 37
    const d = motif(l, h, [[255, 255, 255], [27, 34, 48], [214, 69, 69], [59, 111, 182]])
    const g = palettiserLignes(d, l, h, 8)
    const pas: number[] = []
    let r = g.next()
    while (!r.done) { pas.push(r.value); r = g.next() }
    expect(pas.length).toBe(2 * Math.ceil(h / 8))
    expect(pas.every((v, i) => i === 0 || v > pas[i - 1])).toBe(true)
    expect(pas[pas.length - 1]).toBe(1)
    expect(r.value).toEqual(palettiser(d, l, h))
  })
})

// ---------- La mise en page (src/sorties/mise-en-page.ts) ----------
// Les feuilles d'une page : le sens, l'échelle (1 cm = 1 cm tant que le
// contenu tient dans la largeur), le nombre de feuilles d'une page haute, et
// des coupes qui tombent entre deux lignes d'écriture plutôt qu'au travers
// d'une figure ; puis les textes (pied de page, nom du fichier, titre,
// messages).
describe('mettreEnPage', () => {
  const boite = (x: number, y: number, l: number, h: number) => ({ x, y, l, h })

  it('portrait par défaut ; paysage si le contenu est nettement plus large que haut (> 1,25)', () => {
    expect(mettreEnPage(boite(0, 0, 400, 400), []).papier.orientation).toBe('portrait')
    // 416 × 336 avec l'air : 1,24, encore portrait
    expect(mettreEnPage(boite(0, 0, 400, 320), []).papier.orientation).toBe('portrait')
    expect(mettreEnPage(boite(0, 0, 400, 300), []).papier.orientation).toBe('paysage')
    const p = papier('portrait'), q = papier('paysage')
    expect(p.px).toEqual({ l: 1654, h: 2339 })
    expect(q.px).toEqual({ l: 2339, h: 1654 })
    expect(p.pt).toEqual({ l: A4.l, h: A4.h })
    expect(q.pt).toEqual({ l: A4.h, h: A4.l })
    // 186 mm × 269 mm utiles en portrait, 273 × 182 en paysage (px CSS à 96 ppp)
    expect(p.utile.l / PX_PAR_MM).toBeCloseTo(186, 6)
    expect(p.utile.h / PX_PAR_MM).toBeCloseTo(269, 6)
    expect(q.utile.l / PX_PAR_MM).toBeCloseTo(273, 6)
    expect(q.utile.h / PX_PAR_MM).toBeCloseTo(182, 6)
    expect(p.css.l * DPR_PDF).toBe(1654)
  })

  it('un contenu étroit : à l\'échelle réelle (k = 1, 40 unités = 1 cm sur le papier), centré, calé en haut', () => {
    const m = mettreEnPage(boite(100, -50, 600, 300), [])
    expect(m.k).toBe(1)
    expect(m.z).toBeCloseTo(Z_REEL, 9)
    // 40 unités = 1 cm = 37,8 px CSS = 78,7 pixels à 200 ppp
    expect(40 * m.z * DPR_PDF / PPP * 25.4).toBeCloseTo(10, 6)
    expect(m.feuilles).toHaveLength(1)
    const f = m.feuilles[0], u = m.papier.utile
    // Le haut du contenu (moins l'air de 8 unités) au haut de la zone utile
    expect((-50 - MARGE_CONTENU) * f.cam.z + f.cam.y).toBeCloseTo(u.y, 6)
    // Centré : autant de place à gauche qu'à droite
    const gauche = (100 - MARGE_CONTENU) * f.cam.z + f.cam.x, droite = (700 + MARGE_CONTENU) * f.cam.z + f.cam.x
    expect(gauche - u.x).toBeCloseTo(u.x + u.l - droite, 6)
    expect(f.y0).toBe(-58)
    expect(f.y1).toBe(258)
  })

  it('un contenu large : réduit juste à la largeur utile (k < 1)', () => {
    const m = mettreEnPage(boite(0, 0, 1000, 2000), [])
    expect(m.papier.orientation).toBe('portrait')
    expect(m.k).toBeCloseTo(186 / (1016 * 0.25), 6)
    expect(1016 * m.z).toBeCloseTo(m.papier.utile.l, 6)
    // En paysage, la largeur utile est 273 mm
    const q = mettreEnPage(boite(0, 0, 2000, 1000), [])
    expect(q.papier.orientation).toBe('paysage')
    expect(q.k).toBeCloseTo(273 / (2016 * 0.25), 6)
  })

  it('une page plus large que haute qui n\'est pas haute tient sur UNE feuille paysage, réduite à sa hauteur (pas deux feuilles)', () => {
    // Le triangle de 25 × 18,5 cm (1 062 × 802 unités), un écran 4:3, une photo 4:3
    for (const [l, h] of [[1062, 802], [1200, 900], [1300, 1000], [1400, 1000], [1000, 750]]) {
      const m = mettreEnPage(boite(0, 0, l, h), [boite(0, 0, l, h)])
      expect(m.feuilles, `${l} × ${h}`).toHaveLength(1)
      expect(m.papier.orientation, `${l} × ${h}`).toBe('paysage')
      // Elle tient en largeur et en hauteur ; réduite juste assez
      const u = m.papier.utile
      expect((l + 2 * MARGE_CONTENU) * m.z).toBeLessThanOrEqual(u.l + 1e-6)
      expect((h + 2 * MARGE_CONTENU) * m.z).toBeLessThanOrEqual(u.h + 1e-6)
      expect(Math.max((l + 2 * MARGE_CONTENU) * m.z / u.l, (h + 2 * MARGE_CONTENU) * m.z / u.h, m.k)).toBeCloseTo(1, 6)
    }
    // En paysage elle est plus grande qu'en portrait (réduite à la largeur de 186 mm)
    const t = mettreEnPage(boite(0, 0, 1062, 802), [])
    expect(t.k).toBeCloseTo(182 / (818 * 0.25), 6)
    expect(t.k).toBeGreaterThan(186 / (1078 * 0.25))
  })

  it('une page qui dépasse à peine une feuille portrait y est réduite (au plus 15 %) ; au-delà, découpée à l\'échelle réelle', () => {
    // 269 mm utiles : 1 076 unités. 1 150 unités avec l'air : réduite à 93,6 %, une feuille
    const a = mettreEnPage(boite(0, 0, 600, 1134), [])
    expect(a.feuilles).toHaveLength(1)
    expect(a.papier.orientation).toBe('portrait')
    expect(a.k).toBeCloseTo(269 / (1150 * 0.25), 6)
    // 1 400 unités : il faudrait 77 % : deux feuilles, à l'échelle réelle
    const b = mettreEnPage(boite(0, 0, 600, 1384), [])
    expect(b.feuilles).toHaveLength(2)
    expect(b.k).toBe(1)
  })

  it('une page haute : le nombre de feuilles, chacune d\'au plus la hauteur utile, sans trou ni recouvrement', () => {
    // 4 016 unités avec l'air = 1 004 mm ; 269 mm par feuille : 4 feuilles
    const m = mettreEnPage(boite(0, 0, 600, 4000), [])
    expect(m.feuilles).toHaveLength(4)
    const H = m.papier.utile.h / m.z
    m.feuilles.forEach((f, i) => {
      expect(f.partie).toBe(i + 1)
      expect(f.parties).toBe(4)
      expect(f.y1 - f.y0).toBeLessThanOrEqual(H + 1e-6)
      if (i) expect(f.y0).toBe(m.feuilles[i - 1].y1)
      // La caméra de chaque feuille pose le haut de sa bande au haut de la zone utile
      expect(f.y0 * f.cam.z + f.cam.y).toBeCloseTo(m.papier.utile.y, 6)
      expect(f.cam.x).toBe(m.feuilles[0].cam.x)
    })
    expect(m.feuilles[0].y0).toBe(-8)
    expect(m.feuilles[3].y1).toBe(4008)
  })
})

describe('decouper', () => {
  /** Un faux texte : des lignes de 50 unités de haut, tous les 80 (30 d'interligne),
   *  chaque ligne faite de mots (des boîtes côte à côte) */
  const texte = (lignes: number) => {
    const b: { x: number; y: number; l: number; h: number }[] = []
    for (let i = 0; i < lignes; i++) for (let m = 0; m < 6; m++) b.push({ x: m * 90, y: i * 80, l: 70, h: 50 + (m % 3) * 3 })
    return b
  }
  const traverse = (bs: { y: number; h: number }[], y: number) => bs.filter(b => b.y < y && b.y + b.h > y).length

  it('la coupe tombe dans l\'interligne, entre 60 et 100 % de la hauteur utile', () => {
    const bs = texte(40)
    const H = 1000
    const bandes = decouper(bs, -8, 40 * 80, H)
    expect(bandes.length).toBeGreaterThan(3)
    for (const [i, b] of bandes.entries()) {
      if (i === bandes.length - 1) break
      expect(traverse(bs, b.y1)).toBe(0)
      expect(b.y1 - b.y0).toBeGreaterThanOrEqual(0.6 * H - 1e-6)
      expect(b.y1 - b.y0).toBeLessThanOrEqual(H + 1e-6)
      // La plus basse des coupes libres : juste au-dessus de la ligne suivante
      const suivante = bs.filter(x => x.y >= b.y1).reduce((m, x) => Math.min(m, x.y), Infinity)
      expect(suivante - b.y1).toBeLessThanOrEqual(1 + 1e-9)
    }
  })

  it('pas au travers d\'une grande figure quand une coupe libre existe entre 60 et 100 %', () => {
    // Du texte jusqu'à 600, puis une figure de 900 à 1 300 : le bas de la
    // feuille (1 000) la traverserait ; on coupe juste au-dessus d'elle
    const bs = [...texte(8), { x: 0, y: 900, l: 500, h: 400 }]
    const bandes = decouper(bs, 0, 2000, 1000)
    expect(bandes[0].y1).toBe(899)
    expect(traverse(bs, bandes[0].y1)).toBe(0)
  })

  it('une figure qui commence vers le milieu de la feuille et tiendrait sur la suivante : coupée au-dessus d\'elle, pas au travers', () => {
    // Une feuille de 1 076 unités ; des lignes jusqu'à la moitié, un triangle
    // de 702 unités qui commence à 52 %, puis d'autres lignes
    const H = 1076
    const lignes = texte(6).map(b => ({ ...b, y: b.y - 11 }))
    const figure = { x: 100, y: 529, l: 800, h: 702 }
    const apres = texte(10).map(b => ({ ...b, y: b.y + 1300 }))
    const bs = [...lignes, figure, ...apres]
    const bandes = decouper(bs, -11, 2100, H)
    expect(bandes[0].y1).toBe(528)
    expect(traverse([figure], bandes[0].y1)).toBe(0)
    // La figure est entière sur la feuille 2
    expect(bandes[1].y0).toBeLessThanOrEqual(529)
    expect(bandes[1].y1).toBeGreaterThanOrEqual(529 + 702)
    // Pas plus haut que 25 % : une figure qui commence à 20 % est coupée
    const tot = { x: 0, y: 200, l: 800, h: 1000 }
    const b2 = decouper([tot], 0, 3000, H)
    expect(b2[0].y1).toBe(H)
  })

  it('un grand vide de la page infinie est sauté : pas de feuille blanche ; la feuille suivante part juste au-dessus de la suite', () => {
    // Un énoncé (5 lignes) en haut, la correction (5 lignes) un mètre plus bas
    const haut = texte(5)
    const bas = texte(5).map(b => ({ ...b, y: b.y + 4200 }))
    const bandes = decouper([...haut, ...bas], -8, 4200 + 4 * 80 + 56 + 8, 1076)
    expect(bandes).toHaveLength(2)
    expect(bandes[1].y0).toBe(4200 - 8)
    // Chaque feuille montre quelque chose
    for (const b of bandes) expect([...haut, ...bas].some(x => x.y < b.y1 && x.y + x.h > b.y0)).toBe(true)
    // Par mettreEnPage : deux feuilles, chacune avec sa caméra
    const m = mettreEnPage({ x: 0, y: 0, l: 520, h: 4200 + 4 * 80 + 56 }, [...haut, ...bas])
    expect(m.feuilles).toHaveLength(2)
    expect(m.feuilles[1].y0 * m.feuilles[1].cam.z + m.feuilles[1].cam.y).toBeCloseTo(m.papier.utile.y, 6)
  })

  it('une figure plus haute que la fenêtre de coupe : on coupe au bas de la feuille ; sans boîte, aussi', () => {
    const bs = [{ x: 0, y: 100, l: 500, h: 3000 }]
    expect(decouper(bs, 0, 3200, 1000)[0].y1).toBe(1000)
    const vide = decouper([], 0, 2500, 1000)
    expect(vide).toEqual([{ y0: 0, y1: 1000 }, { y0: 1000, y1: 2000 }, { y0: 2000, y1: 2500 }])
    // Une page qui tient : une seule bande
    expect(decouper(texte(3), -8, 300, 1000)).toEqual([{ y0: -8, y1: 300 }])
  })

  it('le moins de boîtes traversées quand aucune coupe n\'est libre ; dix mille boîtes restent rapides', () => {
    // Deux colonnes décalées : partout au moins une boîte, sauf nulle part ;
    // à 700 seule la colonne de gauche passe, ailleurs les deux
    const bs = [{ x: 0, y: 0, l: 10, h: 2000 }, { x: 20, y: 0, l: 10, h: 699 }, { x: 20, y: 701, l: 10, h: 1300 }]
    const b = decouper(bs, 0, 2000, 1000)
    expect(traverse(bs, b[0].y1)).toBe(1)
    expect(b[0].y1).toBeGreaterThanOrEqual(699)
    expect(b[0].y1).toBeLessThanOrEqual(701)
    const beaucoup = texte(1700)
    const t0 = performance.now()
    const r = decouper(beaucoup, 0, 1700 * 80, 1000)
    expect(performance.now() - t0).toBeLessThan(500)
    expect(r.slice(0, -1).every(x => traverse(beaucoup.slice(0, 600), x.y1) === 0)).toBe(true)
  })
})

describe('les textes de l\'export', () => {
  const date = new Date(2026, 9, 9, 14, 30).getTime()

  it('le pied de page : la page, son nom, sa partie, sa réduction ; le numéro de la feuille', () => {
    expect(piedDePage({ numero: 3, nom: null, partie: 1, parties: 1, k: 1, feuille: 4, feuilles: 12 }))
      .toEqual({ gauche: 'Page 3', droite: '4 / 12' })
    expect(piedDePage({ numero: 3, nom: 'Exercice 12 p. 84', partie: 2, parties: 3, k: 0.72, feuille: 5, feuilles: 12 }).gauche)
      .toBe('Page 3 · Exercice 12 p. 84 (2/3) · réduite à 72 %')
    expect(piedDePage({ numero: 1, nom: null, partie: 1, parties: 1, k: 0.996, feuille: 1, feuilles: 1 }).gauche).toBe('Page 1')
  })

  it('les noms des fichiers : tout le tableau, une page, une page nommée, plusieurs pages, plus de cinq', () => {
    expect(nomDuPdf({ tout: true, numeros: [1, 2, 3], nom: null, date })).toBe('tableau-2026-10-09.pdf')
    expect(nomDuPdf({ tout: false, numeros: [3], nom: null, date })).toBe('page-3-2026-10-09.pdf')
    expect(nomDuPdf({ tout: false, numeros: [3], nom: 'Exercice 12 p. 84', date })).toBe('Exercice 12 p. 84.pdf')
    expect(nomDuPdf({ tout: false, numeros: [3], nom: 'Fractions : a/b', date })).toBe('Fractions - a-b.pdf')
    expect(nomDuPdf({ tout: false, numeros: [2, 5, 7], nom: null, date })).toBe('pages-2-5-7-2026-10-09.pdf')
    expect(nomDuPdf({ tout: false, numeros: [1, 2, 3, 4, 5], nom: null, date })).toBe('pages-1-2-3-4-5-2026-10-09.pdf')
    expect(nomDuPdf({ tout: false, numeros: [1, 2, 3, 4, 5, 6], nom: null, date })).toBe('pages-2026-10-09.pdf')
    expect(dateDeFichier(new Date(2026, 0, 5).getTime())).toBe('2026-01-05')
  })

  it('les titres : « Tableau du 9 octobre 2026 », « Page 3 · nom », « Pages 2, 5 et 7 »', () => {
    expect(titreDuPdf({ tout: true, numeros: [1], nom: null, date })).toBe('Tableau du 9 octobre 2026')
    expect(titreDuPdf({ tout: true, numeros: [1], nom: null, date: new Date(2026, 9, 1).getTime() })).toBe('Tableau du 1er octobre 2026')
    expect(titreDuPdf({ tout: false, numeros: [3], nom: 'Exercice 12 p. 84', date })).toBe('Page 3 · Exercice 12 p. 84')
    expect(titreDuPdf({ tout: false, numeros: [3], nom: null, date })).toBe('Page 3')
    expect(titreDuPdf({ tout: false, numeros: [2, 5, 7], nom: null, date })).toBe('Pages 2, 5 et 7')
    expect(titreDuPdf({ tout: false, numeros: [2, 5], nom: null, date })).toBe('Pages 2 et 5')
    expect(titreDuPdf({ tout: false, numeros: [1, 2, 3, 4, 5, 6, 7], nom: null, date })).toBe('7 pages du tableau du 9 octobre 2026')
    expect(listeNumeros([4])).toBe('4')
  })

  it('les messages : prêt (feuilles, taille), pages vides, pages très réduites, rien à exporter, progression', () => {
    expect(texteFini({ fichier: 'tableau-2026-10-09.pdf', feuilles: 12, octets: 2.4 * 1024 * 1024, vides: [], tresReduites: [] }))
      .toBe('PDF prêt : tableau-2026-10-09.pdf (12 feuilles A4, 2,4\u00a0Mo).')
    expect(texteFini({ fichier: 'page-3.pdf', feuilles: 1, octets: 300 * 1024, vides: [4], tresReduites: [{ numero: 5, k: 0.18 }] }))
      .toBe('PDF prêt : page-3.pdf (1 feuille A4, 300\u00a0Ko). La page 4 est vide : elle n\'est pas dans le PDF. La page 5 est très large : réduite à 18 %.')
    expect(texteFini({ fichier: 'x.pdf', feuilles: 2, octets: 1, vides: [4, 6], tresReduites: [] }))
      .toContain('Les pages 4 et 6 sont vides : elles ne sont pas dans le PDF.')
    expect(texteRien('page')).toBe('Rien à exporter : la page est vide.')
    expect(texteRien('pages')).toBe('Rien à exporter : les pages choisies sont vides.')
    expect(texteProgression(3, 12)).toBe('Export en PDF : feuille 3 sur 12…')
  })
})
