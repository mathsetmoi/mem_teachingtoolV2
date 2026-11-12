// =============================================================
// L'APP : LES INSTRUMENTS ET LE POINTEUR LASER
// Des méthodes de la classe App (src/app.ts), rangées ici par sujet :
// elles s'ajoutent à la classe à la fin de app.ts (ajouterMethodes).
// =============================================================
import type { App } from '../app'
import type { Geste } from '../app'
import { sommetsDe, versRelatif } from '../formes'
import type { P } from '../formes'
import { LASER_TRAINEE, angleLisible, bords, etatParDefaut, toucher } from '../instruments'
import type { Bord, EtatInstrument, NomInstrument, Partie } from '../instruments'
import type { TraceInstrument } from '../piste'
import { Rendu } from '../rendu'
import { CM } from '../types'
import type { Figure } from '../types'
import * as Y from 'yjs'

export const methodesInstruments = {
  // ---------- Instruments ----------
  instrumentVisible(this: App, nom: NomInstrument): boolean { return this.instruments.has(nom) },

  /** Montre ou range un instrument ; il revient là où on l'avait laissé */
  basculerInstrument(this: App, nom: NomInstrument): void {
    const posés = this.tableau.doc.getMap('instruments') as Y.Map<EtatInstrument & { visible: boolean }>
    const avant = posés.get(nom)
    if (this.instruments.has(nom)) { posés.set(nom, { ...avant!, visible: false }); return }
    const v = this.cam.visible(this.rendu.l, this.rendu.h)
    const centre = { x: v.x + v.l / 2, y: v.y + v.h / 2 }
    // Un instrument rangé hors de la vue revient au milieu de l'écran
    const garde = avant && avant.x > v.x && avant.x < v.x + v.l && avant.y > v.y && avant.y < v.y + v.h
    posés.set(nom, { ...(garde ? avant : etatParDefaut(nom, centre)), visible: true })
    if (nom === 'compas') this.ui.message('Compas : la pointe le pose, la mine l\'écarte (Maj + mine : le tourner sans tracer), la tête ↻ trace l\'arc — un petit tour, un petit arc.')
  },

  enregistrerInstrument(this: App, nom: NomInstrument): void {
    const e = this.instruments.get(nom)
    if (e) (this.tableau.doc.getMap('instruments') as Y.Map<unknown>).set(nom, { ...e, visible: true })
  },

  majInstruments(this: App, actif?: { nom: NomInstrument; quoi: Partie }): void {
    this.rendu.instruments = this.peints(actif)
    this.rendu.redessinerInstruments()
    this.ui?.maj()
  },

  /** Ce que peint la couche des instruments : les instruments posés, puis
   *  le point du laser, toujours dessus */
  peints(this: App, actif?: { nom: NomInstrument; quoi: Partie }): Rendu['instruments'] {
    const r: Rendu['instruments'] = [...this.instruments].map(([nom, etat]) => ({ nom, etat, actif: actif?.nom === nom ? actif.quoi : null }))
    if (this.laser && this.pointLaser) r.push({ nom: 'laser', etat: { x: this.pointLaser.x, y: this.pointLaser.y, a: 0, r: 0 }, actif: null })
    return r
  },

  /** Le laser montre ce point (null : il quitte le tableau) */
  bougerLaser(this: App, m: P | null): void {
    if (!m && !this.pointLaser) return
    this.pointLaser = m
    if (m) this.rendu.traineeLaser.push({ x: m.x, y: m.y, t: performance.now() })
    this.rendu.instruments = this.peints()
    this.rendu.redessinerInstruments()
    this.animerTraineeLaser()
  },

  /** La traînée pâlit à chaque image d'écran, jusqu'à disparaître */
  animerTraineeLaser(this: App): void {
    if (this.animationLaser) return
    const image = () => {
      this.animationLaser = 0
      const l = this.rendu.traineeLaser, avant = performance.now() - LASER_TRAINEE
      let k = 0
      while (k < l.length && l[k].t < avant) k++
      if (k) l.splice(0, k)
      this.rendu.redessinerInstruments()
      if (l.length) this.animationLaser = requestAnimationFrame(image)
    }
    this.animationLaser = requestAnimationFrame(image)
  },

  /** L'instrument sous le pointeur, le plus haut d'abord */
  instrumentSous(this: App, w: P): { nom: NomInstrument; quoi: Partie } | null {
    const r = 9 / this.cam.z
    for (const [nom, e] of [...this.instruments].reverse()) {
      const quoi = toucher(nom, e, w, r)
      if (quoi) return { nom, quoi }
    }
    return null
  },

  /** Le bord d'instrument contre lequel on pose le crayon */
  bordSous(this: App, w: P): { bord: Bord; t: number } | null {
    const portee = 12 / this.cam.z
    let mieux: { bord: Bord; t: number; d: number } | null = null
    for (const [nom, e] of this.instruments) {
      for (const b of bords(nom, e)) {
        const dx = w.x - b.o.x, dy = w.y - b.o.y
        const t = dx * b.u.x + dy * b.u.y, d = Math.abs(-dx * b.u.y + dy * b.u.x)
        if (t >= b.debut - portee && t <= b.fin + portee && d < portee && (!mieux || d < mieux.d)) mieux = { bord: b, t, d }
      }
    }
    return mieux
  },

  /** Les points de la page où un instrument s'accroche */
  pointsAccroche(this: App): P[] {
    const r: P[] = []
    for (const f of this.formes) {
      if (f.type === 'polygone') r.push(...sommetsDe(f))
      else if (f.type === 'cercle') r.push({ x: f.x, y: f.y })
    }
    return r
  },

  accrocher(this: App, p: P, exclu?: P): { p: P; accroche: boolean } {
    const portee = 12 / this.cam.z
    let mieux: P | null = null, d = portee
    for (const q of this.pointsAccroche()) {
      if (exclu && Math.hypot(q.x - exclu.x, q.y - exclu.y) < 1e-6) continue
      const e = Math.hypot(q.x - p.x, q.y - p.y)
      if (e < d) { d = e; mieux = q }
    }
    return mieux ? { p: mieux, accroche: true } : { p: this.aimanter(p), accroche: false }
  },

  geste_instrument(this: App, g: Extract<Geste, { type: 'instrument' }>, m: P, maj = false): void {
    const e = { ...g.depart }
    const cm = (v: number) => (Math.round(v / CM * 10) / 10).toString().replace('.', ',') + ' cm'
    this.rendu.mesure = null
    switch (g.quoi) {
      case 'corps':
      case 'pointe': {
        const o = this.accrocher({ x: g.depart.x + m.x - g.x, y: g.depart.y + m.y - g.y })
        e.x = o.p.x; e.y = o.p.y
        break
      }
      case 'rotation': {
        // L'angle se lit au degré près, et s'aimante tous les 15°
        let a = Math.atan2(m.y - e.y, m.x - e.x) - g.ecart
        const deg = a * 180 / Math.PI, q = Math.round(deg / 15) * 15
        a = (Math.abs(deg - q) < 2.5 ? q : Math.round(deg)) * Math.PI / 180
        e.a = a
        this.rendu.mesure = { texte: angleLisible(a), x: m.x, y: m.y }
        break
      }
      case 'mine': {
        if (maj) {
          // Maj : on « lève » le compas et on le tourne sur sa pointe, sans
          // tracer ni changer l'écartement — pour amener la mine où l'arc doit
          // commencer (à côté de l'intersection qu'on cherche, par exemple)
          e.a = Math.atan2(m.y - e.y, m.x - e.x)
          this.rendu.mesure = { texte: 'r = ' + cm(e.r) + ' (compas levé)', x: m.x, y: m.y }
          break
        }
        // L'écartement se prend sur un point de la figure, sinon au millimètre
        const o = this.accrocher(m, { x: e.x, y: e.y })
        const d = Math.hypot(o.p.x - e.x, o.p.y - e.y)
        e.r = Math.max(0.2 * CM, o.accroche ? d : Math.round(d / 4) * 4)
        e.a = Math.atan2(o.p.y - e.y, o.p.x - e.x)
        this.rendu.mesure = { texte: 'r = ' + cm(e.r), x: m.x, y: m.y }
        break
      }
      case 'tete': {
        // Tourner la tête : la mine décrit l'arc
        const a = Math.atan2(m.y - e.y, m.x - e.x)
        let d = a - g.dernier
        while (d > Math.PI) d -= 2 * Math.PI
        while (d < -Math.PI) d += 2 * Math.PI
        g.balayage += d; g.dernier = a
        const tour = Math.abs(g.balayage) >= 2 * Math.PI - 0.02
        e.a = g.depart.a + g.balayage
        this.rendu.apercu = Math.abs(g.balayage) > 0.01 ? this.figure({ type: 'cercle', x: e.x, y: e.y, r: e.r }) : null
        if (this.rendu.apercu?.type === 'cercle' && !tour) this.rendu.apercu.arc = { a0: g.depart.a, a1: g.depart.a + g.balayage }
        const f = this.rendu.apercu
        this.piste.trace(f ? { k: 'arc', x: e.x, y: e.y, r: e.r, a0: g.depart.a, a1: e.a, couleur: f.couleur, taille: f.taille } : null)
        this.rendu.mesure = { texte: Math.round(Math.abs(g.balayage) * 180 / Math.PI) + '°', x: m.x, y: m.y }
        break
      }
    }
    this.instruments.set(g.nom, e)
    this.majInstruments({ nom: g.nom, quoi: g.quoi })
    this.rendu.redessinerDirect()
  },

  finirInstrument(this: App, g: Extract<Geste, { type: 'instrument' }>): void {
    this.rendu.mesure = null
    this.piste.trace(null)
    if (g.quoi === 'tete') {
      const f = this.rendu.apercu
      this.rendu.apercu = null
      // Un arc assez long pour se voir ; un tour complet donne le cercle
      if (f?.type === 'cercle' && Math.abs(g.balayage) * f.r * this.cam.z > 4) {
        this.tableau.nouveauGeste()
        this.tableau.poser(this.page, f)
      }
    }
    this.enregistrerInstrument(g.nom)
    this.majInstruments()
  },

  geste_longer(this: App, g: Extract<Geste, { type: 'longer' }>, m: P): void {
    const b = g.bord
    let t = (m.x - b.o.x) * b.u.x + (m.y - b.o.y) * b.u.y
    t = Math.max(b.debut, Math.min(b.fin, t))
    if (b.gradue) t = Math.round(t / 4) * 4                  // au millimètre, comme on lit la règle
    const a = { x: b.o.x + b.u.x * g.t0, y: b.o.y + b.u.y * g.t0 }, z = { x: b.o.x + b.u.x * t, y: b.o.y + b.u.y * t }
    const f = this.rendu.apercu = this.figure({ type: 'polygone', ferme: false, ...versRelatif([a, z]) })
    this.piste.trace(this.traceLe(f))
    this.rendu.mesure = { texte: (Math.round(Math.abs(t - g.t0) / CM * 10) / 10).toString().replace('.', ',') + ' cm', x: m.x, y: m.y }
    this.rendu.redessinerDirect()
  },

  /** Le tracé le long d'un bord (un segment de l'aperçu), pour la piste */
  traceLe(this: App, f: Figure): TraceInstrument | null {
    if (f.type !== 'polygone' || f.pts.length !== 4) return null
    return { k: 'seg', ax: f.x, ay: f.y, zx: f.x + f.pts[2], zy: f.y + f.pts[3], couleur: f.couleur, taille: f.taille }
  },

  /** Le temps depuis la fin du dernier geste (ms) ; 0 pendant un geste */
  depuisLeDernierGeste(this: App): number {
    return this.geste ? 0 : Math.max(0, performance.now() - this.finDuGeste)
  },
}
