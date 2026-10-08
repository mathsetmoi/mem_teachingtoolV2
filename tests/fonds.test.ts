// Les fonds se dessinent toujours, et vite, même très loin de l'origine :
// une forme démesurée entrée dans un document (x = 1e300) met la vue de
// « Tout voir » là-bas, où x + 1 cm vaut x. Une boucle qui avançait de pas en
// pas n'y finissait jamais, et le tableau gelait à chaque chargement. Le
// contexte de dessin est simulé : il compte les lignes, et lève une erreur
// au-delà d'un plafond (une boucle sans fin échoue au lieu de bloquer le test).
import { describe, expect, it } from 'vitest'
import { Camera } from '../src/camera'
import { dessinerFond } from '../src/fonds'
import type { Fond } from '../src/types'

function contexte() {
  let traits = 0
  const ctx = {
    fillStyle: '', strokeStyle: '', lineWidth: 1, globalAlpha: 1, font: '', textAlign: '', textBaseline: '',
    fillRect() {}, beginPath() {}, stroke() {}, fill() {}, closePath() {}, save() {}, restore() {}, translate() {}, rotate() {}, fillText() {},
    moveTo() { if (++traits > 100_000) throw new Error('trop de lignes : la boucle ne finit pas') },
    lineTo() {},
  }
  return { ctx: ctx as unknown as CanvasRenderingContext2D, traits: () => traits }
}

describe('les fonds', () => {
  it('très loin de l\'origine (la vue de Tout voir sur une forme à 1e300) : chaque fond se dessine, en un nombre borné de lignes', () => {
    for (const fond of ['carreaux', 'seyes', 'repere', 'blanc'] as Fond[]) {
      for (const [x, y, z] of [[-5.21e298, -5.21e298, 0.916], [1e20, -3e19, 1], [-1e17, 0, 20]]) {
        const cam = new Camera()
        cam.x = x; cam.y = y; cam.z = z
        const { ctx, traits } = contexte()
        // Le repère passe par la vue, comme si l'origine était là-bas aussi
        const o = cam.versMonde(683, 384)
        dessinerFond(ctx, fond, cam, 1366, 768, fond === 'repere' ? o : undefined)
        expect(traits(), `${fond} ${x}`).toBeLessThan(20_000)
      }
    }
  })

  it('près de l\'origine : les mêmes lignes qu\'avant (une tous les 5 mm à 100 %)', () => {
    const cam = new Camera()
    const { ctx, traits } = contexte()
    dessinerFond(ctx, 'carreaux', cam, 1366, 768)
    // 1366 / 20 + 1 verticales, 768 / 20 + 1 horizontales
    expect(traits()).toBe(Math.floor(1366 / 20) + 1 + Math.floor(768 / 20) + 1)
  })
})
