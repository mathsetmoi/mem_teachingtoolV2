// La trigonométrie de 1re dans le flash (src/automatismes/trigonometrie-1re.ts) :
// cinq questions de cours du professeur, une par compétence (PERSO), dans
// Analyse › Trigonométrie ; les valeurs exactes sont justes ; la réponse du
// cercle est la lettre du bon point ; les autres questions de cours de 1re
// suivent toujours leur domaine ; un domaine qui n'a que des questions de
// cours donne un flash complet.
import { describe, expect, it } from 'vitest'
import katex from 'katex'
import { AUTOMATISMES_1RE, COURS_1RE, tirerFlash } from '../src/automatismes'
import { PROGRAMME_AUTOMATISMES } from '../src/programme-automatismes'
import { SECTION_AUTOMATISMES } from '../src/objectifs-flash'
import { automatismesChoisis, coursChoisis, REGLAGES_PAR_DEFAUT } from '../src/flash'
import { ASSOCIES, COMPETENCES_TRIGONOMETRIE, T_TRIGONOMETRIE, VALEURS_REMARQUABLES, enDegres, mesurePrincipale, reelAuHasard, reelGrand, valeurExacte } from '../src/automatismes/trigonometrie-1re'

const trigo = COURS_1RE.filter(c => c.theme === T_TRIGONOMETRIE)
/** La valeur d'une écriture exacte : 0, 1, ±1/2, ±√2/2, ±√3/2 */
const valeur = (t: string) => {
  const s = t.startsWith('-') ? -1 : 1, x = t.replace(/^-/, '')
  return s * ({ '0': 0, '1': 1, '\\frac{1}{2}': 0.5, '\\frac{\\sqrt{2}}{2}': Math.SQRT2 / 2, '\\frac{\\sqrt{3}}{2}': Math.sqrt(3) / 2 } as Record<string, number>)[x]
}
/** La valeur d'un réel écrit kπ/d (0, π, −17π/3…) */
const reel = (t: string) => {
  const m = t.match(/^(-)?(?:\\frac\{(\d*)\\pi\}\{(\d+)\}|(\d*)\\pi|0)$/)!
  const num = t === '0' ? 0 : Number(m[2] ?? m[4] ?? '') || 1, den = Number(m[3] ?? 1)
  return (m[1] ? -1 : 1) * num * Math.PI / den
}
const reglage = (themes: string[], competences: string[] = []) => ({ ...REGLAGES_PAR_DEFAUT, niveaux: ['1re'], themes, competences })

describe('la trigonométrie de 1re', () => {
  it('les valeurs exactes du cosinus et du sinus des seize valeurs remarquables', () => {
    for (const v of VALEURS_REMARQUABLES) {
      const d = enDegres(v), r = d * Math.PI / 180
      expect(valeur(valeurExacte(d, 'cos'))).toBeCloseTo(Math.cos(r), 9)
      expect(valeur(valeurExacte(d, 'sin'))).toBeCloseTo(Math.sin(r), 9)
    }
  })

  it('les réels : de 0 à 2π, et parfois la même mesure en négatif, de −π à 0', () => {
    const vus = new Set<string>()
    for (let k = 0; k < 400; k++) vus.add(reelAuHasard().txt)
    expect(vus).toContain('\\frac{2\\pi}{3}')
    expect([...vus].some(t => t.startsWith('-'))).toBe(true)
    expect(vus).not.toContain('-\\pi')
  })

  it('les réels au-delà d\'un tour, et leur mesure principale', () => {
    for (let k = 0; k < 300; k++) {
      const r = reelGrand(), x = reel(r.txt)
      expect(Math.abs(x)).toBeGreaterThanOrEqual(2 * Math.PI - 1e-9)
      // Même point du cercle que l'angle en degrés
      expect(Math.cos(x)).toBeCloseTo(Math.cos(r.degres * Math.PI / 180), 9)
      expect(Math.sin(x)).toBeCloseTo(Math.sin(r.degres * Math.PI / 180), 9)
      const p = reel(mesurePrincipale(r.degres))
      expect(p).toBeGreaterThan(-Math.PI); expect(p).toBeLessThanOrEqual(Math.PI + 1e-9)
      expect(Math.cos(p)).toBeCloseTo(Math.cos(x), 9)
      expect(Math.sin(p)).toBeCloseTo(Math.sin(x), 9)
    }
  })

  it('les formules des angles associés sont justes', () => {
    const F = { cos: Math.cos, sin: Math.sin }
    for (const a of ASSOCIES) for (const x of [0.3, 1.1, 2.5, -0.7]) {
      expect(F[a.f](a.ajout + a.signe * x)).toBeCloseTo((a.moins ? -1 : 1) * F[a.g](x), 9)
    }
  })

  it('cinq questions de cours, une par compétence, rangées dans Analyse › Trigonométrie (PERSO)', () => {
    expect(trigo.map(c => c.competence)).toEqual([0, 1, 2, 3, 4])
    expect(COMPETENCES_TRIGONOMETRIE.length).toBe(5)
    const d = PROGRAMME_AUTOMATISMES['1re'].find(t => t.nom === 'Analyse')!.domaines.find(x => x.cle === T_TRIGONOMETRIE)!
    expect(d.competencesPerso).toBe(true)
    expect(d.competences).toEqual(COMPETENCES_TRIGONOMETRIE)
  })

  it('chaque façon donne une question et une réponse lisibles par KaTeX, et rien n\'est fixe', () => {
    for (const c of trigo) for (const f of c.facons) {
      const vus = new Set<string>()
      for (let k = 0; k < 40; k++) {
        const [enonce, reponse] = f()
        vus.add(enonce + reponse)
        for (const t of [enonce, reponse]) for (const m of t.split('$').filter((_, i) => i % 2)) expect(() => katex.renderToString(m, { throwOnError: true })).not.toThrow()
      }
      expect(vus.size).toBeGreaterThan(1)
    }
  })

  it('le cercle : seize points nommés, et la réponse est la lettre du point du réel', () => {
    const [direct, envers] = trigo[1].facons
    for (let k = 0; k < 60; k++) {
      const [enonce, reponse, figure] = direct() as [string, string, string]
      expect(figure.match(/<path /g)!.length).toBe(16)
      const lettres = [...figure.matchAll(/font-style="italic"[^>]*>([A-Z])</g)].map(m => m[1]).filter(l => l !== 'O')
      expect(lettres.length).toBe(16)
      // Le réel demandé (parfois au-delà d'un tour), ramené entre 0 et 2π,
      // donne le rang du point
      const t = enonce.match(/réel \$([^$]+)\$/)![1]
      const deg = ((Math.round(reel(t) * 180 / Math.PI) % 360) + 360) % 360
      const i = VALEURS_REMARQUABLES.findIndex(v => enDegres(v) === deg)
      expect(reponse).toBe(`le point $${lettres[i]}$`)
    }
    const [, reponse] = envers()
    expect(reponse).toMatch(/^\$/)
  })

  it('les autres questions de cours de 1re suivent toujours leur domaine', () => {
    const r = reglage(['1re/Probabilités'])
    expect(coursChoisis(r).map(c => c.id).sort()).toEqual(COURS_1RE.filter(c => c.theme === 'Probabilités').map(c => c.id).sort())
  })

  it('une compétence de trigonométrie cochée seule : seulement sa question de cours', () => {
    expect(coursChoisis(reglage(['1re/Trigonométrie'], ['1re/Trigonométrie/2'])).map(c => c.id)).toEqual([trigo[2].id])
    expect(coursChoisis(reglage(['1re/Trigonométrie'])).length).toBe(5)
  })

  it('la trigonométrie seule : un flash complet de questions de cours', () => {
    const r = reglage(['1re/Trigonométrie'])
    expect(automatismesChoisis(r)).toEqual([])
    const { questions } = tirerFlash([], coursChoisis(r), { cours: 2, application: 3 })
    expect(questions.length).toBe(5)
    expect(questions.every(q => q.forme === 'cours')).toBe(true)
  })

  it('les exercices de 1re disent leur compétence de la liste officielle', () => {
    // Les lignes OFFI sont rangées dans les domaines du programme (26 novembre 2026)
    const offi = PROGRAMME_AUTOMATISMES['1re'].filter(t => t.section === SECTION_AUTOMATISMES).flatMap(t => t.domaines).filter(d => !d.competencesPerso)
    for (const a of AUTOMATISMES_1RE.filter(x => x.competence !== undefined)) {
      const d = offi.find(x => x.cle === a.theme)!
      expect(d.competences[a.competence!]).toBeTruthy()
    }
    // Chaque phrase de la liste a au moins un exercice
    for (const d of offi) d.competences.forEach((_, k) => expect(AUTOMATISMES_1RE.some(a => a.theme === d.cle && a.competence === k)).toBe(true))
  })
})
