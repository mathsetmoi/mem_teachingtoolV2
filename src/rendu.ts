// =============================================================
// LE RENDU, EN TROIS COUCHES SUPERPOSÉES
// 1. « scène »   : le fond et les formes posées. Redessinée seulement
//                  quand quelque chose change (pas de boucle permanente).
// 2. « formules » : des éléments HTML rendus par KaTeX, déplacés et
//                  zoomés d'un seul transform CSS : nets à tout zoom.
// 3. « direct »  : le trait en cours (le mien et ceux des autres), les
//                  curseurs, la sélection. Petite, donc rapide : c'est
//                  elle qui fait la latence ressentie au stylet.
// =============================================================
import { getStroke } from 'perfect-freehand'
import katex from 'katex'
import type { Camera } from './camera'
import type { Figure, Fond, Forme, Formule, Presence, Trait } from './types'
import { dessinerFond } from './fonds'
import { codageDe, placesDesNoms, sommetsDe } from './formes'

export interface TraitDirect {
  pts: number[]; couleur: string; taille: number; opacite: number; pression: boolean
}

// ---------- Tracés à main levée ----------
function optionsTrait(t: { taille: number; pression: boolean }, fini: boolean) {
  return {
    size: t.taille,
    thinning: t.pression ? 0.6 : 0.45,
    smoothing: 0.55,
    streamline: 0.45,
    simulatePressure: !t.pression,
    last: fini,
  }
}

function regrouper(pts: number[]): number[][] {
  const r: number[][] = []
  for (let i = 0; i + 2 < pts.length; i += 3) r.push([pts[i], pts[i + 1], pts[i + 2]])
  return r
}

/** Contour de perfect-freehand → Path2D en courbes quadratiques */
export function cheminDuTrait(t: { pts: number[]; taille: number; pression: boolean }, fini: boolean): Path2D {
  const contour = getStroke(regrouper(t.pts), optionsTrait(t, fini))
  if (contour.length < 2) return new Path2D()
  let d = `M ${contour[0][0].toFixed(2)} ${contour[0][1].toFixed(2)} Q`
  for (let i = 0; i < contour.length; i++) {
    const [x0, y0] = contour[i]
    const [x1, y1] = contour[(i + 1) % contour.length]
    d += ` ${x0.toFixed(2)} ${y0.toFixed(2)} ${((x0 + x1) / 2).toFixed(2)} ${((y0 + y1) / 2).toFixed(2)}`
  }
  return new Path2D(d + ' Z')
}

export class Rendu {
  readonly scene: HTMLCanvasElement
  readonly direct: HTMLCanvasElement
  readonly coucheFormules: HTMLDivElement
  private cs: CanvasRenderingContext2D
  private cd: CanvasRenderingContext2D
  private dpr = 1
  l = 0
  h = 0

  private chemins = new Map<string, { cle: string; chemin: Path2D }>()
  private elementsFormules = new Map<string, { cle: string; el: HTMLDivElement }>()

  // État fourni par l'application à chaque image
  formes: Forme[] = []
  fond: Fond = 'carreaux'
  origine = { x: 0, y: 0 }
  selection = new Set<string>()
  decalage = { dx: 0, dy: 0 }                     // déplacement en cours de la sélection
  monTrait: TraitDirect | null = null
  monSegment: { x1: number; y1: number; x2: number; y2: number; couleur: string; taille: number } | null = null
  cadreSelection: { x: number; y: number; l: number; h: number } | null = null
  gomme: { x: number; y: number; r: number } | null = null
  apercu: Figure | null = null                     // figure en cours de construction
  remplacement: Figure | null = null               // figure dont on tire un morceau
  poignees = true                                  // montrer sommets et rayon de la figure choisie
  autres: Presence[] = []

  private sceneSale = true
  private directSale = true
  private image = 0

  constructor(private cam: Camera, conteneur: HTMLElement) {
    this.scene = document.createElement('canvas')
    this.direct = document.createElement('canvas')
    this.coucheFormules = document.createElement('div')
    this.scene.className = 'couche couche-scene'
    this.direct.className = 'couche couche-direct'
    this.coucheFormules.className = 'couche-formules'
    conteneur.append(this.scene, this.coucheFormules, this.direct)
    this.cs = this.scene.getContext('2d')!
    // Pas de « desynchronized » : sur certaines cartes graphiques, Chrome
    // affiche alors ce canvas transparent en noir opaque, qui cache tout.
    this.cd = this.direct.getContext('2d')!
    new ResizeObserver(() => this.redimensionner(conteneur)).observe(conteneur)
    this.redimensionner(conteneur)
  }

  private redimensionner(c: HTMLElement) {
    this.dpr = Math.min(window.devicePixelRatio || 1, 2)
    this.l = c.clientWidth; this.h = c.clientHeight
    for (const cv of [this.scene, this.direct]) {
      cv.width = Math.round(this.l * this.dpr); cv.height = Math.round(this.h * this.dpr)
      cv.style.width = this.l + 'px'; cv.style.height = this.h + 'px'
    }
    this.toutRedessiner()
  }

  toutRedessiner() { this.sceneSale = true; this.directSale = true; this.planifier() }
  redessinerDirect() { this.directSale = true; this.planifier() }

  private planifier() {
    if (!this.image) this.image = requestAnimationFrame(() => this.peindre())
  }

  private peindre() {
    this.image = 0
    if (this.sceneSale) { this.peindreScene(); this.placerFormules(); this.sceneSale = false }
    if (this.directSale) { this.peindreDirect(); this.directSale = false }
  }

  // ---------- Couche scène ----------
  private peindreScene() {
    const c = this.cs, cam = this.cam
    c.setTransform(this.dpr, 0, 0, this.dpr, 0, 0)
    dessinerFond(c, this.fond, cam, this.l, this.h, this.origine)
    c.setTransform(this.dpr * cam.z, 0, 0, this.dpr * cam.z, this.dpr * cam.x, this.dpr * cam.y)
    for (const f0 of this.formes) {
      const f = this.remplacement?.id === f0.id ? this.remplacement : f0
      const dec = this.selection.has(f.id) ? this.decalage : null
      if (f.type === 'trait') this.dessinerTrait(c, f, dec)
      else if (f.type === 'segment') {
        const x = f.x + (dec?.dx ?? 0), y = f.y + (dec?.dy ?? 0)
        c.strokeStyle = f.couleur; c.lineWidth = f.taille; c.lineCap = 'round'
        c.beginPath(); c.moveTo(x, y); c.lineTo(x + f.dx, y + f.dy); c.stroke()
      }
      else if (f.type === 'polygone' || f.type === 'cercle') this.dessinerFigure(c, f, dec)
    }
    // Nettoie le cache des formes disparues
    if (this.chemins.size > this.formes.length + 50) {
      const vivants = new Set(this.formes.map(f => f.id))
      for (const id of this.chemins.keys()) if (!vivants.has(id)) this.chemins.delete(id)
    }
  }

  private dessinerTrait(c: CanvasRenderingContext2D, t: Trait, dec: { dx: number; dy: number } | null) {
    const cle = `${t.pts.length}|${t.taille}|${t.pression}`
    let entree = this.chemins.get(t.id)
    if (!entree || entree.cle !== cle) {
      entree = { cle, chemin: cheminDuTrait(t, true) }
      this.chemins.set(t.id, entree)
    }
    c.save()
    c.translate(t.x + (dec?.dx ?? 0), t.y + (dec?.dy ?? 0))
    c.globalAlpha = t.opacite
    c.fillStyle = t.couleur
    c.fill(entree.chemin)
    c.restore()
  }

  // ---------- Figures géométriques ----------
  dessinerFigure(c: CanvasRenderingContext2D, f0: Figure, dec: { dx: number; dy: number } | null) {
    const f = dec ? { ...f0, x: f0.x + dec.dx, y: f0.y + dec.dy } : f0
    const trace = new Path2D()
    if (f.type === 'cercle') trace.arc(f.x, f.y, f.r, 0, Math.PI * 2)
    else {
      sommetsDe(f).forEach((p, i) => i ? trace.lineTo(p.x, p.y) : trace.moveTo(p.x, p.y))
      if (f.ferme) trace.closePath()
    }
    c.save()
    if (f.fond && (f.type === 'cercle' || f.ferme)) {
      c.globalAlpha = 0.22; c.fillStyle = f.fond; c.fill(trace); c.globalAlpha = 1
    }
    c.strokeStyle = f.couleur; c.lineWidth = f.taille; c.lineJoin = 'round'; c.lineCap = 'round'
    if (f.tirets) c.setLineDash([f.taille * 3, f.taille * 2.5])
    c.stroke(trace)
    c.setLineDash([])

    // Codage : petits traits sur les côtés égaux, carré sur les angles droits
    c.lineWidth = Math.max(1.5, f.taille * 0.6)
    if (f.codage && f.type === 'polygone') {
      const k = codageDe(f)
      for (const t of k.traits) {
        const l = Math.hypot(t.b.x - t.a.x, t.b.y - t.a.y) || 1
        const u = { x: (t.b.x - t.a.x) / l, y: (t.b.y - t.a.y) / l }
        const m = { x: (t.a.x + t.b.x) / 2, y: (t.a.y + t.b.y) / 2 }
        c.beginPath()
        for (let i = 0; i < t.n; i++) {
          const d = (i - (t.n - 1) / 2) * 5
          const o = { x: m.x + u.x * d, y: m.y + u.y * d }
          // traits légèrement penchés, comme à la main
          c.moveTo(o.x - u.y * 7 - u.x * 2, o.y + u.x * 7 - u.y * 2)
          c.lineTo(o.x + u.y * 7 + u.x * 2, o.y - u.x * 7 + u.y * 2)
        }
        c.stroke()
      }
      for (const d of k.droits) {
        const a = 11
        c.beginPath()
        c.moveTo(d.s.x + d.u.x * a, d.s.y + d.u.y * a)
        c.lineTo(d.s.x + (d.u.x + d.v.x) * a, d.s.y + (d.u.y + d.v.y) * a)
        c.lineTo(d.s.x + d.v.x * a, d.s.y + d.v.y * a)
        c.stroke()
      }
    }
    if (f.type === 'cercle' && (f.codage || f.sommets)) {
      c.beginPath()                                    // le centre, marqué d'une croix
      c.moveTo(f.x - 5, f.y - 5); c.lineTo(f.x + 5, f.y + 5); c.moveTo(f.x + 5, f.y - 5); c.lineTo(f.x - 5, f.y + 5)
      c.stroke()
    }

    // Sommets : un point et un nom
    if (f.sommets && f.noms) {
      c.fillStyle = f.couleur
      if (f.type === 'polygone') {
        for (const p of sommetsDe(f)) { c.beginPath(); c.arc(p.x, p.y, Math.max(2.5, f.taille * 0.7), 0, Math.PI * 2); c.fill() }
      }
      c.font = 'italic 22px "KaTeX_Math", "Times New Roman", serif'
      c.textAlign = 'center'; c.textBaseline = 'middle'
      placesDesNoms(f, 17).forEach((p, i) => {
        const nom = f.noms?.[i]
        if (nom) c.fillText(nom.replace(/_(\d+)/, '$1'), p.x, p.y)
      })
    }
    c.restore()
  }

  // ---------- Couche formules ----------
  private placerFormules() {
    const cam = this.cam
    this.coucheFormules.style.transform = `translate(${cam.x}px, ${cam.y}px) scale(${cam.z})`
    const vues = new Set<string>()
    for (const f of this.formes) {
      if (f.type !== 'formule') continue
      vues.add(f.id)
      const cle = `${f.latex}|${f.couleur}|${f.taille}`
      let e = this.elementsFormules.get(f.id)
      if (!e) {
        const el = document.createElement('div')
        el.className = 'formule'
        this.coucheFormules.appendChild(el)
        e = { cle: '', el }
        this.elementsFormules.set(f.id, e)
      }
      if (e.cle !== cle) {
        katex.render(f.latex || '\\square', e.el, { throwOnError: false, displayMode: false })
        e.el.style.color = f.couleur
        e.el.style.fontSize = f.taille + 'px'
        e.cle = cle
      }
      const dec = this.selection.has(f.id) ? this.decalage : { dx: 0, dy: 0 }
      e.el.style.left = (f.x + dec.dx) + 'px'
      e.el.style.top = (f.y + dec.dy) + 'px'
      e.el.style.zIndex = String(Math.floor(f.z / 1000) % 1e6)
    }
    for (const [id, e] of this.elementsFormules) {
      if (!vues.has(id)) { e.el.remove(); this.elementsFormules.delete(id) }
    }
  }

  /** Boîte d'une formule, en monde (sa taille vient du rendu KaTeX) */
  boiteFormule(f: Formule) {
    const e = this.elementsFormules.get(f.id)
    const l = e ? e.el.offsetWidth : f.taille * Math.max(1, f.latex.length * 0.5)
    const h = e ? e.el.offsetHeight : f.taille * 1.4
    return { x: f.x, y: f.y, l, h }
  }

  // ---------- Couche directe ----------
  private peindreDirect() {
    const c = this.cd, cam = this.cam
    c.setTransform(1, 0, 0, 1, 0, 0)
    c.clearRect(0, 0, this.direct.width, this.direct.height)
    c.setTransform(this.dpr * cam.z, 0, 0, this.dpr * cam.z, this.dpr * cam.x, this.dpr * cam.y)

    // Traits des autres participants, pendant qu'ils écrivent
    for (const p of this.autres) if (p.direct) this.dessinerDirect(c, p.direct)
    if (this.monTrait) this.dessinerDirect(c, this.monTrait)

    if (this.apercu) this.dessinerFigure(c, this.apercu, null)
    if (this.monSegment) {
      const s = this.monSegment
      c.strokeStyle = s.couleur; c.lineWidth = s.taille; c.lineCap = 'round'
      c.beginPath(); c.moveTo(s.x1, s.y1); c.lineTo(s.x2, s.y2); c.stroke()
    }

    // Sélection : un cadre en tirets autour de chaque forme tenue
    if (this.selection.size) {
      c.strokeStyle = '#3b6fb6'; c.lineWidth = 1.5 / cam.z; c.setLineDash([6 / cam.z, 4 / cam.z])
      for (const f0 of this.formes) {
        if (!this.selection.has(f0.id)) continue
        const f = this.remplacement?.id === f0.id ? this.remplacement : f0
        const b = this.boite(f)
        const m = 6 / cam.z
        c.strokeRect(b.x + this.decalage.dx - m, b.y + this.decalage.dy - m, b.l + 2 * m, b.h + 2 * m)
      }
      c.setLineDash([])
      // Les poignées : ce qu'on peut attraper dans la figure choisie
      const seule = this.selection.size === 1 ? this.formes.find(f => this.selection.has(f.id)) : undefined
      const f = seule && this.remplacement?.id === seule.id ? this.remplacement : seule
      if (this.poignees && f && (f.type === 'polygone' || f.type === 'cercle')) {
        const pts = f.type === 'polygone' ? sommetsDe(f)
          : [{ x: f.x + f.r * Math.SQRT1_2, y: f.y - f.r * Math.SQRT1_2 }]
        c.lineWidth = 1.6 / cam.z; c.strokeStyle = '#3b6fb6'; c.fillStyle = '#ffffff'
        for (const p of pts) { c.beginPath(); c.arc(p.x, p.y, 5.5 / cam.z, 0, Math.PI * 2); c.fill(); c.stroke() }
        if (f.sommets && f.noms) {
          c.setLineDash([2 / cam.z, 3 / cam.z]); c.strokeStyle = 'rgba(59, 111, 182, 0.55)'
          for (const p of placesDesNoms(f, 17)) { c.beginPath(); c.arc(p.x, p.y, 14, 0, Math.PI * 2); c.stroke() }
          c.setLineDash([])
        }
      }
    }
    if (this.cadreSelection) {
      const r = this.cadreSelection
      c.fillStyle = 'rgba(59, 111, 182, 0.08)'; c.strokeStyle = '#3b6fb6'; c.lineWidth = 1 / cam.z
      c.fillRect(r.x, r.y, r.l, r.h); c.strokeRect(r.x, r.y, r.l, r.h)
    }
    if (this.gomme) {
      c.strokeStyle = 'rgba(27, 34, 48, 0.55)'; c.lineWidth = 1.5 / cam.z
      c.beginPath(); c.arc(this.gomme.x, this.gomme.y, this.gomme.r, 0, Math.PI * 2); c.stroke()
    }

    // Curseurs des autres, avec leur nom
    c.setTransform(this.dpr, 0, 0, this.dpr, 0, 0)
    c.font = '600 12px "Atkinson Hyperlegible", system-ui, sans-serif'
    c.textBaseline = 'middle'
    for (const p of this.autres) {
      if (!p.curseur) continue
      const s = cam.versEcran(p.curseur.x, p.curseur.y)
      c.fillStyle = p.couleur
      c.beginPath(); c.arc(s.x, s.y, 5, 0, Math.PI * 2); c.fill()
      const larg = c.measureText(p.nom).width + 12
      c.beginPath()
      c.roundRect(s.x + 9, s.y + 6, larg, 20, 10)
      c.fill()
      c.fillStyle = '#ffffff'
      c.fillText(p.nom, s.x + 15, s.y + 16)
    }
  }

  private dessinerDirect(c: CanvasRenderingContext2D, t: TraitDirect) {
    if (t.pts.length < 3) return
    c.save()
    c.globalAlpha = t.opacite
    c.fillStyle = t.couleur
    c.fill(cheminDuTrait(t, false))
    c.restore()
  }

  /** Boîte englobante d'une forme, en monde */
  boite(f: Forme) {
    if (f.type === 'formule') return this.boiteFormule(f)
    if (f.type === 'cercle') {
      const m = f.r + f.taille / 2 + (f.sommets ? 28 : 0)
      return { x: f.x - m, y: f.y - m, l: 2 * m, h: 2 * m }
    }
    if (f.type === 'polygone') {
      let x1 = Infinity, y1 = Infinity, x2 = -Infinity, y2 = -Infinity
      for (const p of sommetsDe(f)) { x1 = Math.min(x1, p.x); x2 = Math.max(x2, p.x); y1 = Math.min(y1, p.y); y2 = Math.max(y2, p.y) }
      const m = f.taille / 2 + (f.sommets ? 28 : 0)
      return { x: x1 - m, y: y1 - m, l: x2 - x1 + 2 * m, h: y2 - y1 + 2 * m }
    }
    if (f.type === 'segment') {
      const m = f.taille / 2
      return { x: Math.min(f.x, f.x + f.dx) - m, y: Math.min(f.y, f.y + f.dy) - m,
        l: Math.abs(f.dx) + 2 * m, h: Math.abs(f.dy) + 2 * m }
    }
    let x1 = Infinity, y1 = Infinity, x2 = -Infinity, y2 = -Infinity
    for (let i = 0; i < f.pts.length; i += 3) {
      x1 = Math.min(x1, f.pts[i]); x2 = Math.max(x2, f.pts[i])
      y1 = Math.min(y1, f.pts[i + 1]); y2 = Math.max(y2, f.pts[i + 1])
    }
    const m = f.taille / 2
    return { x: f.x + x1 - m, y: f.y + y1 - m, l: x2 - x1 + 2 * m, h: y2 - y1 + 2 * m }
  }
}
