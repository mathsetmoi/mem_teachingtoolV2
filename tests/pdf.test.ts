// L'écrivain de PDF (src/sorties/pdf.ts) : un PDF écrit à la main, une image
// par feuille (couleurs indexées, ou JPEG pour une photo). Le fichier doit se
// lire partout : l'en-tête et sa ligne binaire, chaque décalage de la table
// des renvois exact, l'arbre des pages, la taille A4, le titre en UTF-16 avec
// ses accents. La palette : une image de 256 couleurs au plus revient telle
// quelle ; du bruit (une photo) n'en a pas.
import { describe, expect, it } from 'vitest'
import { unzlibSync } from 'fflate'
import { A4, datePdf, ecrirePdf, imageIndexee, palettiser, palettiserLignes, utf16 } from '../src/sorties/pdf'
import type { Feuille } from '../src/sorties/pdf'

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
