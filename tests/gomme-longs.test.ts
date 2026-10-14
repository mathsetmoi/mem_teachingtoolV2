// La gomme qui efface là où elle passe, sur un long trait (lot 5, la
// vérification des régressions) : pendant le coup, un long morceau ne se
// repeint qu'aux bouts que la gomme a changés (boutsDe), ne se redessine
// que par fenêtres de ses points près du rectangle sale (fenetresDe), et une
// grande boîte n'est redessinée que si son encre y passe (passePres). Ce qui
// compte : ne rien oublier de ce que l'encre couvre dans le rectangle (sinon
// un trou s'y verrait jusqu'au lever), et rester petit.
import { describe, expect, it } from 'vitest'
import { getStroke } from 'perfect-freehand'
import type { Trait } from '../src/types'
import { BORD, boutsDe, couperTrait, fenetresDe, passePres } from '../src/gomme'

type Boite = { x: number; y: number; l: number; h: number }
let numero = 0

/** Une spirale de n points autour de (x, y) : serrée au centre, espacée au bord */
function spirale(x: number, y: number, n = 5000, taille = 3): Trait {
  const pts: number[] = []
  for (let i = 0; i < n; i++) {
    const u = i / n, r = 20 + 230 * u, th = u * 60 * Math.PI
    pts.push(Math.round(r * Math.cos(th) * 10) / 10, Math.round(r * Math.sin(th) * 9) / 10, Math.round((0.3 + 0.4 * Math.abs(Math.sin(i / 50))) * 100) / 100)
  }
  return { id: 'S' + numero++, type: 'trait', x, y, z: 1, auteur: 'moi', pts, couleur: '#1b2230', taille, opacite: 1, pression: true }
}

/** Le contour de perfect-freehand d'un trait (comme Rendu), en points absolus */
function contour(t: Trait): number[][] {
  const p: number[][] = []
  for (let i = 0; i + 2 < t.pts.length; i += 3) p.push([t.pts[i], t.pts[i + 1], t.pts[i + 2]])
  return getStroke(p, { size: t.taille, thinning: t.pression ? 0.6 : 0.45, smoothing: 0.55, streamline: 0.45, simulatePressure: !t.pression, last: true })
    .map(([a, b]) => [a + t.x, b + t.y])
}
const dans = (q: number[], w: Boite) => q[0] >= w.x && q[0] <= w.x + w.l && q[1] >= w.y && q[1] <= w.y + w.h
const chevauche = (a: Boite, b: Boite) => a.x <= b.x + b.l && b.x <= a.x + a.l && a.y <= b.y + b.h && b.y <= a.y + a.h

describe('boutsDe : seuls les bouts que la gomme a changés se repeignent', () => {
  it('un long trait coupé au milieu : deux morceaux, chacun une boîte, près de la coupe ; pas ses bouts d\'origine', () => {
    const t = spirale(500, 400)
    const a = { x: 500 + 120, y: 300 }, b = { x: 500 + 126, y: 300 }
    const k = couperTrait(t, a, b, 14)!
    expect(k.length).toBeGreaterThanOrEqual(2)
    const cap = { x: 500 + 120 - 30, y: 300 - 30, l: 66, h: 60 }
    let boites = 0
    for (const m of k) {
      const q = boutsDe(m, t)
      boites += q.length
      // Chaque boîte touche la gomme (la coupe y est), et reste petite
      for (const x of q) { expect(chevauche(x, cap)).toBe(true); expect(Math.max(x.l, x.h)).toBeLessThan(120) }
    }
    // Le centre et le bout extérieur de la spirale ne se repeignent pas
    expect(boites).toBeGreaterThan(0)
    expect(boites).toBeLessThanOrEqual(2 * k.length)
  })

  it('au moins BORD.points points et BORD.longueur de tracé de chaque bout changé ; un morceau inchangé : rien', () => {
    const t = spirale(0, 0, 3000)
    expect(boutsDe(t, t)).toEqual([])
    const m = { ...t, pts: t.pts.slice(0, 3 * 2000) }
    const q = boutsDe(m, t)
    expect(q).toHaveLength(1)
    // la boîte couvre les derniers points (BORD.points au moins) et BORD.longueur de tracé
    let l = 0, i = 1999
    const p = m.pts
    for (let k = 0; k < BORD.points || l < BORD.longueur(m.taille); k++, i--) {
      expect(dans([p[3 * i], p[3 * i + 1]], q[0])).toBe(true)
      l += Math.hypot(p[3 * i] - p[3 * i - 3], p[3 * i + 1] - p[3 * i - 2])
    }
  })

  it('un morceau plus court que ses deux bouts : sa boîte entière', () => {
    const t = spirale(0, 0, 3000)
    const m = { ...t, pts: t.pts.slice(3 * 100, 3 * 104) }
    expect(boutsDe(m, t)).toHaveLength(1)
  })
})

describe('fenetresDe et passePres : rien de l\'encre ne manque dans le rectangle', () => {
  it('les fenêtres couvrent tout le contour du trait entier qui tombe dans le rectangle, et en restent loin de leurs bouts', () => {
    for (const taille of [3, 8, 15]) {
      const t = spirale(500, 400, 5000, taille)
      const c = contour(t)
      for (const w of [{ x: 600, y: 280, l: 40, h: 40 }, { x: 380, y: 380, l: 30, h: 90 }, { x: 490, y: 390, l: 25, h: 25 }, { x: 250, y: 150, l: 500, h: 30 }]) {
        const f = fenetresDe(t, w, 2)
        // Rangées, disjointes
        for (let k = 1; k < f.length; k++) expect(f[k][0]).toBeGreaterThan(f[k - 1][1] - 1)
        // Chaque point du contour du trait entier dans w vient d'un point du trait dans une fenêtre : on le vérifie par le
        // contour des fenêtres, qui doit couvrir celui du trait entier à moins d'un demi-pixel
        const cf = f.flatMap(([a, b]) => contour({ ...t, pts: t.pts.slice(3 * a, 3 * b) }))
        const manquent = c.filter(q => dans(q, w) && !cf.some(r => Math.hypot(r[0] - q[0], r[1] - q[1]) < taille))
        expect(manquent.length, `taille ${taille}, ${JSON.stringify(w)}`).toBe(0)
        // Et elles restent petites devant le trait
        const n = f.reduce((s, [a, b]) => s + b - a, 0)
        if (w.l * w.h < 5000) expect(n).toBeLessThan(5000 / 3)
      }
    }
  })

  it('passePres : vrai dès que le contour du trait entre dans la boîte (sur 400 boîtes au hasard), faux loin de son encre', () => {
    let graine = 7
    const hasard = () => { graine = (graine * 16807) % 2147483647; return graine / 2147483647 }
    const traits = [spirale(500, 400, 2000, 3), spirale(500, 400, 600, 12)]
    for (const t of traits) {
      const c = contour(t)
      for (let k = 0; k < 200; k++) {
        const w = { x: 200 + hasard() * 600, y: 100 + hasard() * 600, l: 5 + hasard() * 60, h: 5 + hasard() * 60 }
        if (c.some(q => dans(q, w))) expect(passePres(t, w, 0)).toBe(true)
      }
    }
    // Un anneau (la moitié d'un tour de spirale) : au milieu de sa boîte, rien
    const pts: number[] = []
    for (let i = 0; i <= 300; i++) pts.push(Math.round(200 * Math.cos(i * Math.PI / 300) * 10) / 10, Math.round(-200 * Math.sin(i * Math.PI / 300) * 10) / 10, 0.5)
    const anneau: Trait = { id: 'A', type: 'trait', x: 0, y: 0, z: 1, auteur: 'moi', pts, couleur: '#000', taille: 3, opacite: 1, pression: false }
    expect(passePres(anneau, { x: -40, y: -120, l: 80, h: 60 }, 2)).toBe(false)
    expect(passePres(anneau, { x: -40, y: -215, l: 80, h: 30 }, 2)).toBe(true)
  })
})
