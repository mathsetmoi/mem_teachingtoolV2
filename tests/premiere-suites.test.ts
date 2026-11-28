// Les suites de 1re dans le flash (src/automatismes/premiere-suites.ts) : les
// quatre lignes officielles des taux d'évolution, revues par le professeur le
// 28 novembre 2026, rangées dans le sous-domaine « Évolutions et variations ».
// Chaque ligne a des exercices et des questions de cours ; tout s'écrit en
// KaTeX ; les nombres se calculent de tête (pas de calculatrice).
import { describe, expect, it } from 'vitest'
import katex from 'katex'
import { AUTOMATISMES_1RE, COURS_1RE } from '../src/automatismes'
import { AUTOMATISMES_1RE_SUITES, COURS_1RE_SUITES } from '../src/automatismes/premiere-suites'
import { PROGRAMME_AUTOMATISMES } from '../src/programme-automatismes'

const D = 'Suites numériques, modèles discrets'
/** Les morceaux de maths d'un texte : une réponse brute est toute en maths */
const maths = (t: string) => t.startsWith('§') ? t.slice(1).split('$').filter((_, i) => i % 2) : [t]
const enMaths = (t: string) => t.split('$').filter((_, i) => i % 2)
const rendre = (m: string) => katex.renderToString(m, { throwOnError: true })

describe('les suites de 1re', () => {
  const dom = PROGRAMME_AUTOMATISMES['1re'].flatMap(t => t.domaines).find(d => d.cle === D)!

  it('le domaine a ses quatre lignes dans le sous-domaine « Évolutions et variations »', () => {
    expect(dom.sousDomaine).toBe('Évolutions et variations')
    expect(dom.competences.length).toBe(4)
  })

  it('chaque ligne a au moins deux exercices et une question de cours, tous dans le flash', () => {
    for (let k = 0; k < 4; k++) {
      expect(AUTOMATISMES_1RE_SUITES.filter(a => a.competence === k).length, `ligne ${k + 1}`).toBeGreaterThanOrEqual(2)
      expect(COURS_1RE_SUITES.filter(c => c.competence === k).length, `ligne ${k + 1}`).toBeGreaterThanOrEqual(1)
    }
    for (const a of AUTOMATISMES_1RE_SUITES) expect(AUTOMATISMES_1RE).toContain(a)
    for (const c of COURS_1RE_SUITES) expect(COURS_1RE).toContain(c)
    // Les anciennes questions de cours de Suites sont devenues des exercices
    expect(COURS_1RE.filter(c => c.theme === D).every(c => COURS_1RE_SUITES.includes(c))).toBe(true)
  })

  it('les exercices et les cours s’écrivent en KaTeX, sans $ dans une réponse brute', () => {
    for (const a of AUTOMATISMES_1RE_SUITES) for (let i = 0; i < 40; i++) {
      const q = a.generer()
      for (const m of enMaths(q.enonce)) expect(() => rendre(m), a.id).not.toThrow()
      if (!q.reponse.startsWith('§')) expect(q.reponse, a.id).not.toContain('$')
      for (const m of maths(q.reponse)) expect(() => rendre(m), a.id).not.toThrow()
    }
    for (const c of COURS_1RE_SUITES) for (const f of c.facons) for (let i = 0; i < 20; i++) {
      const [q, r] = f()
      for (const m of [...enMaths(q), ...enMaths(r)]) expect(() => rendre(m), c.id).not.toThrow()
      expect(q.includes('[') || q.includes(']'), c.id).toBe(false)
    }
  })

  it('le cours de la ligne 1 cache tour à tour augmenter/diminuer, t %, et le coefficient', () => {
    const c = COURS_1RE_SUITES.find(x => x.id.endsWith('-100'))!
    const vus = new Set<string>()
    for (let i = 0; i < 300; i++) for (const f of c.facons) {
      const r = f()[1]
      vus.add(/^(Augmenter|Diminuer)$/i.test(r) ? 'verbe' : r.includes('frac{t}') ? 'formule' : r.includes('\\%') ? 'taux' : 'coef')
    }
    expect([...vus].sort()).toEqual(['coef', 'formule', 'taux', 'verbe'])
  })

  it('les évolutions successives et réciproques tombent juste, sans calculatrice', () => {
    // Le résultat d'un taux a au plus deux chiffres après la virgule du coefficient
    const ids = ['meme-taux', 'aller-retour', 'revenir', 'coef-reciproque', 'plusieurs-fois']
    for (const id of ids) {
      const a = AUTOMATISMES_1RE_SUITES.find(x => x.id === `1re-suites-${id}`)!
      for (let i = 0; i < 60; i++) {
        const r = a.generer().reponse
        const n = r.replace(/\\,\\%|[+]/g, '').replace('{,}', '.')
        expect(Number.isFinite(Number(n)), `${id} : ${r}`).toBe(true)
        expect((n.split('.')[1] ?? '').length, `${id} : ${r}`).toBeLessThanOrEqual(3)
      }
    }
  })
})
