// Le coût des fonds (nombre d'appels de tracé) de 10 % à 2000 %, sur un écran
// de 1920 × 1080, comparé au quadrillage de toujours ; et le temps sous Node
import { it } from 'vitest'
import { dessinerFond } from '../../../../../../src/fonds'
import { Camera } from '../../../../../../src/camera'
function ctx() {
  const n = { trace: 0, rect: 0, stroke: 0, fill: 0 }
  const c: Record<string, unknown> = { save() {}, restore() {}, beginPath() {}, closePath() {}, setLineDash() {}, fillRect() {}, clip() {},
    moveTo() { n.trace++ }, lineTo() { n.trace++ }, rect() { n.rect++ }, arc() { n.rect++ }, stroke() { n.stroke++ }, fill() { n.fill++ }, fillText() {}, measureText: () => ({ width: 10 }), setTransform() {}, translate() {}, rotate() {} }
  return { c: c as unknown as CanvasRenderingContext2D, n }
}
it('coût', () => {
  const lignes: string[] = []
  for (const fond of ['carreaux', 'seyes', 'repere', 'grands-carreaux', 'millimetre', 'pointe', 'iso'] as const) {
    let pire = 0, pireZ = 0, tmax = 0
    for (let z = 0.1; z <= 20.001; z *= 1.07) {
      const cam = new Camera(); cam.z = z; cam.x = 13.7; cam.y = -7.3
      const { c, n } = ctx()
      const t0 = performance.now()
      for (let k = 0; k < 5; k++) dessinerFond(c, fond, cam, 1920, 1080, { x: 0, y: 0 })
      const t = (performance.now() - t0) / 5
      const total = (n.trace + n.rect) / 5
      if (total > pire) { pire = total; pireZ = z }
      tmax = Math.max(tmax, t)
    }
    lignes.push(`${fond.padEnd(16)} pire ${Math.round(pire)} appels (z=${pireZ.toFixed(2)}), ${tmax.toFixed(2)} ms au plus`)
  }
  console.log(lignes.join('\n'))
})
