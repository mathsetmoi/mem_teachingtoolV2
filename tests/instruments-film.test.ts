// Les instruments au replay : la piste qui note ce que la classe a vu d'eux
// (piste.ts), son format (revoir/instruments-film.ts), ce qui part dans le
// film élève (exporter.ts) et ce que le lecteur et la revue en rejouent. Un
// tableau, un film ou un fichier sans instruments se rejoue exactement comme
// avant ; un lecteur plus ancien ignore ce qu'il ne connaît pas.
import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import * as Y from 'yjs'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { Tableau } from '../src/document'
import type { EtatInstrument, NomInstrument, Partie } from '../src/instruments'
import { Piste, POSES_MAX, REPOS_MORCEAU } from '../src/piste'
import type { Horloge, Peint, TraceInstrument } from '../src/piste'
import type { Cercle, Polygone, Trait } from '../src/types'
import type { EtatInstruments, InstrumentVu, Morceau, MorceauPoses, Piece } from '../src/revoir/instruments-film'
import { APRES_L_ETAPE, LecturePiste, decoderPoses, dejaTracee, encoderPoses, encoderTrace, enrouler, horaire, lireMorceau, morceauxEntre, poseA } from '../src/revoir/instruments-film'
import { AVANT_PROPOS, exporter, exporterDetaille, seancesDuFilm } from '../src/revoir/exporter'
import type { EtapeFilm, FilmEleve } from '../src/revoir/format'
import { VERSION, ecrireFilm, lireFilm } from '../src/revoir/format'
import { Bobine } from '../src/revoir/bobine'
import { COUDE, PLANCHER, tasser } from '../src/revoir/rythme'
import { ENTREE, SILENCE_DE_PAS, construireBande, departs, echeances, horlogeAuDepart } from '../src/revue/bande'
import { lectureDe } from '../src/revue/planches'

const DATE0 = new Date('2026-10-07T08:00:00').getTime()
let numero = 0

/** Une horloge factice : le temps n'avance que quand on le dit, et les
 *  minuteurs sonnent alors dans l'ordre. La date suit (Date.now() aussi). */
class Factice implements Horloge {
  t = 0
  private minuteurs: { a: number; f: () => void; id: number }[] = []
  private n = 0
  maintenant = () => this.t
  date = () => DATE0 + this.t
  plusTard = (f: () => void, ms: number) => { const id = ++this.n; this.minuteurs.push({ a: this.t + ms, f, id }); return id }
  annuler = (id: unknown) => { this.minuteurs = this.minuteurs.filter(m => m.id !== id) }
  /** Avance de ms, en faisant sonner ce qui doit sonner, à son heure */
  avancer(ms: number) {
    const fin = this.t + ms
    for (;;) {
      this.minuteurs.sort((x, y) => x.a - y.a || x.id - y.id)
      const m = this.minuteurs[0]
      if (!m || m.a > fin) break
      this.minuteurs.shift()
      this.t = Math.max(this.t, m.a); vi.setSystemTime(DATE0 + this.t)
      m.f()
    }
    this.t = fin; vi.setSystemTime(DATE0 + this.t)
  }
}

beforeEach(() => { vi.useFakeTimers({ toFake: ['Date'] }); vi.setSystemTime(DATE0) })
afterEach(() => vi.useRealTimers())

const peint = (nom: NomInstrument, x: number, y: number, a = 0, r = 0, actif: Partie | null = null): Peint => ({ nom, etat: { x, y, a, r }, actif })

/** Un tableau qui note sa piste, sur une horloge factice */
async function seance() {
  const h = new Factice()
  const t = new Tableau(null)
  const page = t.ajouterPage('carreaux', 0)
  t.pageVue = page
  const piste = new Piste(m => t.noterPiste(m), () => t.pageVue, h)
  const ecrits: Morceau[] = []
  t.piste.observe(e => { for (const d of e.changes.delta) if (d.insert) ecrits.push(...(d.insert as Morceau[])) })
  /** Les instruments à l'écran, comme le tableau les tient */
  const ecran = new Map<string, Peint>()
  const ecranC = new Map<string, Peint>()
  const peindre = () => piste.peinture([...ecran.values()], [...ecranC.values()])
  /** Avance le temps, et laisse le film noter ses étapes */
  const avancer = async (ms: number) => { h.avancer(ms); await Promise.resolve(); await Promise.resolve() }
  /** Un geste sur un instrument, image par image (16 ms) : on le prend, on le mène, on le lâche */
  const mener = async (nom: NomInstrument, vers: EtatInstrument, ms: number, partie: Partie = 'corps', c = false) => {
    const l = c ? ecranC : ecran
    const de = l.get(nom)!.etat
    l.set(nom, { nom, etat: de, actif: c ? null : partie }); peindre()
    const n = Math.max(1, Math.round(ms / 16))
    for (let i = 1; i <= n; i++) {
      await avancer(16)
      const u = i / n
      l.set(nom, { nom, etat: { x: de.x + (vers.x - de.x) * u, y: de.y + (vers.y - de.y) * u, a: de.a + (vers.a - de.a) * u, r: de.r + (vers.r - de.r) * u }, actif: c ? null : partie })
      peindre()
    }
    await avancer(16)
    l.set(nom, { nom, etat: { ...vers }, actif: null }); peindre()
  }
  const montrer = (p: Peint, c = false) => { (c ? ecranC : ecran).set(p.nom, p); peindre() }
  const ranger = (nom: NomInstrument, c = false) => { (c ? ecranC : ecran).delete(nom); peindre() }
  return { h, t, page, piste, ecrits, peindre, avancer, mener, montrer, ranger, ecran }
}

function polygone(pts: number[][], x = 0, y = 0): Polygone {
  return { id: 'P' + numero++, type: 'polygone', x, y, z: numero, auteur: 'a', pts: pts.flat(), ferme: false, couleur: '#1b2230', taille: 2.5 }
}
function cercle(x: number, y: number, r: number, arc?: { a0: number; a1: number }): Cercle {
  const c: Cercle = { id: 'C' + numero++, type: 'cercle', x, y, r, z: numero, auteur: 'a', couleur: '#1b2230', taille: 2.5 }
  if (arc) c.arc = arc
  return c
}
function trait(x: number, y: number, n = 6): Trait {
  const pts: number[] = []
  for (let i = 0; i < n; i++) pts.push(i * 3.3, Math.sin(i) * 7.7, 0.5)
  return { id: 'T' + numero++, type: 'trait', x, y, z: numero, auteur: 'a', pts, couleur: '#1b2230', taille: 3, opacite: 1, pression: true }
}

/** Les poses d'un morceau, relues (heures absolues) */
const poses = (m: Morceau) => (lireMorceau(m) as Piece).poses

// =============================================================
describe('la piste : ce qu\'on note', () => {
  it('un instrument immobile ne note rien, même après mille peintures', async () => {
    const s = await seance()
    s.montrer(peint('regle', 100, 200))
    await s.avancer(400)
    expect(s.ecrits).toHaveLength(1)                       // il paraît : une pose
    expect(s.ecrits[0]).toMatchObject({ n: 'regle', d: [0, 1000, 2000, 0] })
    for (let i = 0; i < 1000; i++) { s.peindre(); await s.avancer(16) }   // la caméra bouge : la couche se repeint
    expect(s.ecrits).toHaveLength(1)
  })

  it('un geste fait un morceau : la partie tenue, la pose de repos d\'abord, la dernière exacte', async () => {
    const s = await seance()
    s.montrer(peint('regle', 100, 200)); await s.avancer(2000)
    await s.mener('regle', { x: 317.77, y: 251.13, a: 0.3, r: 0 }, 600)
    await s.avancer(REPOS_MORCEAU + 20)
    const geste = s.ecrits.find(m => (m as MorceauPoses).q === 'corps') as MorceauPoses
    expect(geste).toBeTruthy()
    const p = poses(geste)
    expect(p[0]).toMatchObject({ x: 100, y: 200, a: 0 })
    expect(p[p.length - 1].x).toBeCloseTo(317.8, 5); expect(p[p.length - 1].y).toBeCloseTo(251.1, 5); expect(p[p.length - 1].a).toBeCloseTo(0.3, 4)
    // Le lever : un morceau d'une pose, sans partie tenue (la pastille s'éteint)
    const lever = s.ecrits[s.ecrits.length - 1] as MorceauPoses
    expect(lever.q).toBeUndefined()
    expect(lever.d.length).toBe(4)
    // Ni étape du film, ni page touchée
    expect(s.t.film.length).toBe(1)
  })

  it('se ferme après 250 ms sans changement, au changement de page, au rangement', async () => {
    const s = await seance()
    s.montrer(peint('compas', 0, 0, 0, 160)); await s.avancer(300)
    const n0 = s.ecrits.length
    // On tient le compas sans bouger : le morceau se ferme quand même
    s.montrer(peint('compas', 0, 0, 0, 160, 'mine')); await s.avancer(16)
    s.montrer(peint('compas', 0, 0, 0, 180, 'mine')); await s.avancer(REPOS_MORCEAU - 20)
    expect(s.ecrits.length).toBe(n0)
    await s.avancer(40)
    expect(s.ecrits.length).toBe(n0 + 1)
    expect((s.ecrits[n0] as MorceauPoses).q).toBe('mine')
    // Un changement de page ferme ce qui est ouvert, noté sur l'ancienne page
    s.montrer(peint('compas', 0, 0, 0.5, 180, 'mine')); await s.avancer(16)
    const avant = s.t.pageVue
    s.t.pageVue = s.t.ajouterPage('blanc', 1)
    s.peindre(); await s.avancer(1)
    const ferme = s.ecrits[s.ecrits.length - 1] as MorceauPoses
    expect(ferme.p).toBe(avant)
    // Le rangement : ce qui est ouvert se ferme, puis v: 0
    s.montrer(peint('compas', 0, 0, 0.7, 180, 'mine')); await s.avancer(16)
    s.ranger('compas'); await s.avancer(1)
    const [a, b] = s.ecrits.slice(-2) as MorceauPoses[]
    expect(a.v).toBeUndefined(); expect(a.q).toBe('mine')
    expect(b).toMatchObject({ n: 'compas', v: 0, d: [] })
    expect(b.p).toBe(s.t.pageVue)
  })

  it('au plus 60 poses par seconde, même à 240 images par seconde', async () => {
    const s = await seance()
    s.montrer(peint('equerre', 0, 0)); await s.avancer(500)
    s.montrer(peint('equerre', 0, 0, 0, 0, 'corps'))
    // Une seconde de mouvement en zigzag (rien de linéaire à simplifier), toutes les 4 ms
    for (let i = 1; i <= 250; i++) { s.h.avancer(4); s.montrer(peint('equerre', i * 2, ((i * 7) % 5) * 30, 0, 0, 'corps')) }
    s.piste.vider()
    const geste = s.ecrits.find(m => (m as MorceauPoses).q === 'corps')!
    expect(poses(geste).length).toBeLessThanOrEqual(1 + 67)
    expect(poses(geste).length).toBeGreaterThan(40)
  })

  it('au-delà de 1 200 poses, le morceau se ferme et un autre suit, sans rien perdre', async () => {
    const s = await seance()
    s.montrer(peint('regle', 0, 0)); await s.avancer(300)
    for (let i = 1; i <= POSES_MAX + 300; i++) { s.h.avancer(16); s.montrer(peint('regle', 0, (i % 2) * 20, 0, 0, 'corps')) }
    s.piste.vider()
    const gestes = s.ecrits.filter(m => (m as MorceauPoses).q === 'corps')
    expect(gestes.length).toBe(2)
    expect(poses(gestes[0]).length).toBeLessThanOrEqual(POSES_MAX)
  })

  it('simplifié, chaque pose d\'origine se retrouve à 0,5 unité et 2 mrad près', async () => {
    const s = await seance()
    s.montrer(peint('compas', 50, 50, 0, 120)); await s.avancer(300)
    const origine: { t: number; e: EtatInstrument }[] = []
    let graine = 7
    const hasard = () => { graine = (graine * 16807) % 2147483647; return graine / 2147483647 - 0.5 }
    for (let i = 0; i <= 400; i++) {
      // Un mouvement en cloche, avec un tremblement de main
      const u = i / 400, v = (1 - Math.cos(Math.PI * u)) / 2
      const e = { x: 50 + 300 * v + hasard() * 0.8, y: 50 + 120 * Math.sin(3 * u) + hasard() * 0.8, a: 2.5 * v + hasard() * 0.004, r: 120 + 60 * v }
      s.montrer({ nom: 'compas', etat: e, actif: 'tete' })
      origine.push({ t: s.h.t, e })
      s.h.avancer(16)
    }
    s.piste.vider()
    const m = s.ecrits.find(x => (x as MorceauPoses).q === 'tete')!
    const p = poses(m)
    expect(p.length).toBeLessThan(origine.length * 0.9)
    const t0 = DATE0
    for (const o of origine) {
      const q = poseA(p, t0 + o.t)
      expect(Math.hypot(q.x - o.e.x, q.y - o.e.y)).toBeLessThanOrEqual(0.5)
      expect(Math.abs(enrouler(q.a - o.e.a))).toBeLessThanOrEqual(0.002)
      expect(Math.abs(q.r - o.e.r)).toBeLessThanOrEqual(0.5)
    }
    // La première et la dernière sont exactes (à l'arrondi du format près)
    expect(p[p.length - 1].x).toBeCloseTo(origine[origine.length - 1].e.x, 1)
  })

  it('l\'angle est déroulé : de 170° à 190°, la règle ne fait pas un tour à l\'envers', async () => {
    const s = await seance()
    const deg = (d: number) => Math.atan2(Math.sin(d * Math.PI / 180), Math.cos(d * Math.PI / 180))     // comme atan2 le rend : saute à ±180°
    s.montrer(peint('regle', 0, 0, deg(170))); await s.avancer(300)
    for (let d = 170; d <= 190; d += 1) { s.montrer(peint('regle', 0, 0, deg(d), 0, 'rotation')); s.h.avancer(16) }
    s.piste.vider()
    const p = poses(s.ecrits.find(x => (x as MorceauPoses).q === 'rotation')!)
    for (let i = 1; i < p.length; i++) expect(p[i].a).toBeGreaterThanOrEqual(p[i - 1].a)
    expect(p[p.length - 1].a - p[0].a).toBeCloseTo(20 * Math.PI / 180, 3)
    // À mi-chemin, l'interpolation passe par 180°, pas par 0°
    const mi = poseA(p, (p[0].t + p[p.length - 1].t) / 2)
    expect(Math.abs(enrouler(mi.a - Math.PI))).toBeLessThan(0.1)
  })

  it('un instrument qui paraît et part aussitôt : ses morceaux se suivent sans se chevaucher', async () => {
    const s = await seance()
    // Comme le constructeur : le compas paraît, et bouge dès l'image suivante
    s.montrer(peint('compas', 0, 0, 0, 100), true)
    const vus: { t: number; a: number }[] = []
    for (let i = 1; i <= 30; i++) { s.h.avancer(16.7); const a = -i * 0.03; s.montrer(peint('compas', 0, 0, a, 100), true); vus.push({ t: DATE0 + s.h.t, a }) }
    s.piste.vider()
    const l = new LecturePiste(s.ecrits)
    const morceaux = l.poses.filter(x => x.cle === 'compas+')
    for (let i = 1; i < morceaux.length; i++) expect(morceaux[i].t0).toBeGreaterThan(morceaux[i - 1].poses[morceaux[i - 1].poses.length - 1].t)
    // (les dates des morceaux sont à la milliseconde : on regarde une milliseconde après chaque image)
    for (const v of vus) expect(l.etatA(Math.ceil(v.t) + 1).get('compas+')!.etat.a).toBeCloseTo(v.a, 2)
    expect(morceaux.length).toBe(2)                         // il paraît, puis il bouge
  })

  it('un instrument mené sans être tenu (le constructeur) fait un seul morceau, pas un par image', async () => {
    const s = await seance()
    s.montrer(peint('regle', 0, 0), true); await s.avancer(400)
    for (let i = 1; i <= 60; i++) { s.h.avancer(16.7); s.montrer(peint('regle', i * 3, i, i * 0.01), true) }
    s.piste.vider()
    expect(s.ecrits.filter(m => (m as MorceauPoses).n === 'regle')).toHaveLength(2)
  })

  it('les instruments du constructeur ont leur propre clé : deux règles à l\'écran', async () => {
    const s = await seance()
    s.montrer(peint('regle', 0, 0)); s.montrer(peint('regle', 400, 400), true)
    await s.avancer(300)
    await s.mener('regle', { x: 500, y: 300, a: 1, r: 0 }, 300, 'corps', true)
    s.piste.vider()
    const duConstructeur = s.ecrits.filter(m => (m as MorceauPoses).c === 1)
    const duProfesseur = s.ecrits.filter(m => !(m as MorceauPoses).c)
    expect(duProfesseur).toHaveLength(1)                       // la sienne n'a pas bougé
    expect(duConstructeur.length).toBeGreaterThanOrEqual(2)
    const l = new LecturePiste(s.ecrits)
    const e = l.etatA(Infinity)
    expect(e.get('regle')!.etat).toMatchObject({ x: 0, y: 0 })
    expect(e.get('regle+')!.etat.x).toBeCloseTo(500, 5)
  })

  it('le tracé aux instruments : l\'arc sous la mine, au plus 60 échantillons par seconde', async () => {
    const s = await seance()
    for (let i = 0; i <= 120; i++) {
      // Le pointeur bouge toutes les 4 ms ; la couche « direct » se peint quand elle peut (au plus à chaque fois)
      s.piste.trace({ k: 'arc', x: 10, y: 20, r: 160, a0: 0.25, a1: 0.25 - i * 0.03 + Math.sin(i) * 0.001, couleur: '#1f5fbf', taille: 2.5 })
      s.piste.peintureDirect()
      s.h.avancer(4)
    }
    s.piste.trace(null)
    s.h.avancer(1)
    const arc = s.ecrits.find(m => 'k' in m)!
    expect(arc).toMatchObject({ k: 'arc', s: ['#1f5fbf', 2.5], g: [100, 200, 1600, Math.round(0.25 * 180_000 / Math.PI)] })
    const x = lireMorceau(arc)
    expect(x && 'k' in x && x.ech.length).toBeLessThanOrEqual(35)
    // Un autre centre : un autre morceau
    const seg: TraceInstrument = { k: 'seg', ax: 0, ay: 0, zx: 10, zy: 0, couleur: '#000', taille: 2 }
    s.piste.trace(seg); s.piste.peintureDirect(); s.h.avancer(16); s.piste.trace({ ...seg, zx: 40 }); s.piste.peintureDirect(); s.h.avancer(16); s.piste.trace({ ...seg, ax: 5, zx: 50 }); s.piste.peintureDirect()
    s.piste.vider()
    expect(s.ecrits.filter(m => 'k' in m && m.k === 'seg')).toHaveLength(2)
  })
})

describe('la piste : le tracé est daté à sa peinture', () => {
  it('l\'arc et la mine du compas, peints ensemble, sont notés ensemble', async () => {
    const s = await seance()
    s.montrer(peint('compas', 0, 0, 0, 160)); await s.avancer(300)
    // Le pointeur arrive 10 ms avant que l'image se peigne
    for (let i = 1; i <= 40; i++) {
      const a = -i * 0.04
      s.piste.trace({ k: 'arc', x: 0, y: 0, r: 160, a0: 0, a1: a, couleur: '#000', taille: 2 })
      s.h.avancer(10)
      s.montrer(peint('compas', 0, 0, a, 160, 'tete')); s.piste.peintureDirect()
      s.h.avancer(6)
    }
    s.piste.trace(null); s.piste.vider()
    const compas = poses(s.ecrits.find(m => (m as MorceauPoses).q === 'tete')!)
    const arc = lireMorceau(s.ecrits.find(m => 'k' in m)!) as { ech: { t: number; v: number[] }[] }
    for (const e of arc.ech) expect(Math.abs(poseA(compas, e.t).a - e.v[0])).toBeLessThanOrEqual(0.004)
  })
})

describe('la piste : le format, relu défensivement', () => {
  it('relit ce qu\'elle écrit, à l\'arrondi près', () => {
    const p = [{ t: 0, x: 1.04, y: -2.56, a: 0.12344, r: 0 }, { t: 17, x: 3.3, y: 4.4, a: -3.14159, r: 0 }]
    const d = encoderPoses(p, false)
    expect(d.every(Number.isInteger)).toBe(true)
    const q = decoderPoses(d, false)!
    expect(q[1]).toMatchObject({ t: 17, x: 3.3, y: 4.4, r: 0 })
    expect(q[1].a).toBeCloseTo(-3.14159, 5)
  })

  it('un nombre entier de degrés se relit au bit près (la pastille ↻ tourne au degré)', () => {
    for (let d = -720; d <= 720; d += 7) {
      const a = d * Math.PI / 180
      const q = decoderPoses(encoderPoses([{ t: 0, x: 0, y: 0, a: 0, r: 0 }, { t: 5, x: 0, y: 0, a, r: 0 }], false), false)!
      expect(q[1].a).toBe(a)
    }
  })

  it('refuse les entiers abîmés, le mauvais pas, un instrument inconnu', () => {
    const bon = { t: 5, n: 'regle', d: [0, 10, 20, 30] }
    expect(lireMorceau(bon)).not.toBeNull()
    for (const m of [
      { ...bon, d: [0, 10, 20] },                 // pas un multiple du pas
      { ...bon, d: [3, 10, 20, 30] },             // première pose relative
      { ...bon, d: [0, 10.5, 20, 30] },           // pas un entier
      { ...bon, d: [0, 10, 20, 30, -1, 0, 0, 0] },// le temps recule
      { ...bon, d: [0, 1e12, 20, 30] },           // hors des bornes
      { ...bon, n: 'gomme' },
      { ...bon, q: 'manche' },
      { ...bon, c: 2 },
      { ...bon, t: 'hier' },
      { t: 0, n: 'compas', d: [0, 1, 2, 3] },     // le compas a un écartement
      { t: 0, k: 'arc', s: ['#000', 2], g: [0, 0, 10], d: [0, 1] },
      { t: 0, k: 'seg', s: ['#000', -2], g: [0, 0], d: [0, 1, 2] },
      null, 'regle', 42,
    ]) expect(lireMorceau(m)).toBeNull()
  })

  it('une piste aux morceaux abîmés garde les autres', () => {
    const l = new LecturePiste([{ t: 5, n: 'regle', d: [0, 10, 20, 30] }, { n: 'regle' }, { t: 9, n: 'equerre', d: [0, 1, 2, 3] }])
    expect([...l.etatA(10).keys()].sort()).toEqual(['equerre', 'regle'])
  })
})

describe('la piste dans le document : ni étape, ni annulation, ni forme', () => {
  it('noterPiste n\'ajoute aucune étape, Ctrl+Z ne la touche pas, les pages restent les mêmes', async () => {
    const s = await seance()
    s.t.poser(s.page, polygone([[0, 0], [100, 0]])); await s.avancer(1000)
    const film = s.t.film.length
    const pages = JSON.stringify(s.t.pages.toJSON())
    s.montrer(peint('regle', 0, 0)); await s.avancer(16)
    await s.mener('regle', { x: 300, y: 0, a: 0.5, r: 0 }, 500)
    s.piste.vider(); await s.avancer(1)
    const piste = s.t.piste.length
    expect(piste).toBeGreaterThan(0)
    expect(s.t.film.length).toBe(film)
    expect(JSON.stringify(s.t.pages.toJSON())).toBe(pages)
    // Ctrl+Z défait le segment, pas la piste ; Ctrl+Y le rend
    s.t.annulation.undo(); await s.avancer(1)
    expect(s.t.piste.length).toBe(piste)
    expect(s.t.formesDe(s.page)!.size).toBe(0)
    s.t.annulation.redo(); await s.avancer(1)
    expect(s.t.formesDe(s.page)!.size).toBe(1)
    expect(s.t.piste.length).toBe(piste)
    // Et la piste n'est pas dans la pile d'annulation
    s.t.annulation.undo(); s.t.annulation.undo(); s.t.annulation.undo()
    expect(s.t.piste.length).toBe(piste)
  })
})

// =============================================================
/** Une séance type : la règle paraît, on la pose sur la page, on trace le
 *  long de son bord ; on va sur une autre page (non publiée) la bouger ; on
 *  revient et l'on écrit. Rend aussi les heures utiles. */
async function seanceType() {
  const s = await seance()
  const A = s.page
  await s.avancer(5000)
  // La règle est sortie bien avant le premier geste (plus d'une minute)
  s.montrer(peint('regle', 100, 100)); await s.avancer(70_000)
  await s.mener('regle', { x: 200, y: 300, a: -0.4, r: 0 }, 800)       // la règle se pose
  await s.avancer(700)
  // Le crayon le long du bord, puis le segment posé
  for (let i = 0; i <= 30; i++) {
    s.piste.trace({ k: 'seg', ax: 200, ay: 300, zx: 200 + 6 * i * Math.cos(-0.4), zy: 300 + 6 * i * Math.sin(-0.4), couleur: '#1b2230', taille: 2.5 })
    s.piste.peintureDirect()
    await s.avancer(16)
  }
  s.piste.trace(null)
  const seg = polygone([[0, 0], [Math.round(180 * Math.cos(-0.4) * 10) / 10, Math.round(180 * Math.sin(-0.4) * 10) / 10]], 200, 300)
  s.t.poser(A, seg)
  const T1 = Date.now()
  await s.avancer(1)
  await s.avancer(3000)
  // Une autre page, qu'on ne publiera pas : la règle y bouge
  const B = s.t.ajouterPage('blanc', 1); s.t.pageVue = B; s.peindre(); await s.avancer(500)
  await s.mener('regle', { x: 600, y: 120, a: 1.2, r: 0 }, 600)
  await s.avancer(1500)
  s.t.poser(B, trait(50, 50)); await s.avancer(2000)
  // Retour sur la page A : un trait
  s.t.pageVue = A; s.peindre(); await s.avancer(1000)
  s.t.poser(A, trait(10, 10))
  const T2 = Date.now()
  await s.avancer(1)
  await s.avancer(400)
  s.piste.vider(); await s.avancer(1)
  return { ...s, A, B, seg, T1, T2 }
}

const toutes = (t: Tableau) => ({ de: 1, a: t.film.length - 1 })

describe('l\'export : ce qui part, ce qui ne part pas', () => {
  it('un tableau sans piste donne le même film, octet pour octet', async () => {
    const s = await seance()
    s.t.poser(s.page, polygone([[0, 0], [10, 10]])); await s.avancer(800)
    s.t.poser(s.page, trait(5, 5)); await s.avancer(800)
    const avec = JSON.stringify(exporter(s.t, { ...toutes(s.t), pages: [s.page], titre: 'x' }))
    const sans = JSON.stringify(exporter(s.t, { ...toutes(s.t), pages: [s.page], titre: 'x' }, { instruments: false }))
    expect(avec).toBe(sans)
    expect(avec).not.toMatch(/"inst"|"instruments"|"avant"/)
  })

  it('ne part que ce qui s\'est passé sur la page publiée ; un saut rend l\'état vrai', async () => {
    const s = await seanceType()
    const { film, sources } = exporterDetaille(s.t, { ...toutes(s.t), pages: [s.A], titre: 'Règle' })
    expect(film.etapes).toHaveLength(2)
    expect(film.etapes.every(e => e.p === s.A)).toBe(true)
    // Le premier geste : la règle se pose, puis le crayon longe son bord
    const g1 = film.etapes[0].inst!
    expect(g1.some(m => (m as MorceauPoses).q === 'corps')).toBe(true)
    expect(g1.some(m => 'k' in m && m.k === 'seg')).toBe(true)
    // Aucun morceau ne porte de page
    expect(JSON.stringify(film)).not.toContain(`"p":"${s.B}"`)
    for (const e of film.etapes) for (const m of e.inst ?? []) expect('p' in m).toBe(false)
    // Le second : rien de ce qui s'est fait sur B, seulement un saut à la fin (t = dt) vers l'état vrai
    const g2 = film.etapes[1].inst!
    expect(g2).toHaveLength(1)
    expect(g2[0]).toMatchObject({ n: 'regle', s: 1, t: film.etapes[1].dt })
    const vrai = poses(g2[0])[0]
    expect(vrai.x).toBeCloseTo(600, 5); expect(vrai.y).toBeCloseTo(120, 5); expect(vrai.a).toBeCloseTo(1.2, 4)
    // Les heures : la fenêtre du second geste va du premier geste au second
    expect(film.etapes[1].dt).toBe(s.T2 - s.T1)
    expect(s.t.film.get(sources[1]).t).toBe(s.T2)
  })

  it('les instruments visibles au départ sont dans film.instruments ; rangés, ils n\'y sont pas', async () => {
    const s = await seanceType()
    const film = exporter(s.t, { ...toutes(s.t), pages: [s.A], titre: '' })
    expect(film.instruments).toHaveLength(1)
    expect(film.instruments![0]).toMatchObject({ n: 'regle', t: 0, d: [0, 1000, 1000, 0] })
    // Le compas rangé avant la séance n'y est pas
    const t = await seance()
    t.montrer(peint('compas', 0, 0, 0, 100)); await t.avancer(500)
    t.ranger('compas'); await t.avancer(90_000)
    t.t.poser(t.page, trait(0, 0)); await t.avancer(1)
    t.piste.vider()
    const f = exporter(t.t, { ...toutes(t.t), pages: [t.page], titre: '' })
    expect(f.instruments).toBeUndefined()
    expect(f.etapes[0].inst).toBeUndefined()
    expect(f.avant).toBeUndefined()
  })

  it('l\'avant-propos ne remonte pas à plus d\'une minute avant le premier geste', async () => {
    const s = await seance()
    s.montrer(peint('regle', 0, 0)); await s.avancer(300)
    await s.mener('regle', { x: 500, y: 0, a: 0, r: 0 }, 400)                 // il y a deux minutes
    await s.avancer(2 * 60_000)
    await s.mener('regle', { x: 500, y: 200, a: 0.2, r: 0 }, 400)            // juste avant le trait
    await s.avancer(1500)
    s.t.poser(s.page, trait(0, 0)); await s.avancer(1)
    s.piste.vider(); await s.avancer(1)
    const film = exporter(s.t, { ...toutes(s.t), pages: [s.page], titre: '' })
    expect(film.avant).toBeGreaterThan(0)
    expect(film.avant).toBeLessThanOrEqual(AVANT_PROPOS)
    expect(film.avant).toBeLessThan(2500)                                  // il commence au premier mouvement
    // L'état de départ : la règle déjà en (500, 0), posée il y a deux minutes
    expect(poses(film.instruments![0])[0]).toMatchObject({ x: 500, y: 0 })
  })

  it('un morceau qui déborde le geste est coupé en deux, sans rien perdre', async () => {
    const s = await seance()
    s.montrer(peint('compas', 0, 0, 0, 160)); await s.avancer(500)
    s.t.poser(s.page, trait(0, 0)); await s.avancer(300)
    // Le compas tourne ; une étape tombe au milieu de son mouvement
    s.montrer(peint('compas', 0, 0, 0, 160, 'tete'))
    const vus: { t: number; a: number }[] = []
    for (let i = 1; i <= 60; i++) {
      await s.avancer(16)
      const a = -i * 0.05 + 0.02 * Math.sin(i / 3)
      s.montrer(peint('compas', 0, 0, a, 160, 'tete')); vus.push({ t: Date.now(), a })
      if (i === 30) { s.t.poser(s.page, cercle(0, 0, 160, { a0: 0, a1: a })); await s.avancer(0) }
    }
    s.ranger('compas'); await s.avancer(400)
    s.t.poser(s.page, trait(40, 40)); await s.avancer(1)
    s.piste.vider()
    const { film } = exporterDetaille(s.t, { ...toutes(s.t), pages: [s.page], titre: '' })
    const [, g2, g3] = film.etapes
    const m2 = g2.inst!.find(m => (m as MorceauPoses).q === 'tete')!, m3 = g3.inst!.find(m => (m as MorceauPoses).q === 'tete')!
    expect(m2).toBeTruthy(); expect(m3).toBeTruthy()
    const p2 = poses(m2), p3 = poses(m3)
    expect(p2[p2.length - 1].t).toBe(g2.dt)                     // coupé au geste
    expect(p3[0].t).toBe(0)                                      // et repris là
    expect(p3[0].a).toBeCloseTo(p2[p2.length - 1].a, 3)
    // Toutes les poses vues se retrouvent, d'un côté ou de l'autre
    const debut2 = s.t.film.get(1).t + APRES_L_ETAPE, debut3 = s.t.film.get(2).t + APRES_L_ETAPE
    for (const v of vus) {
      const q = v.t <= debut3 ? poseA(p2, v.t - debut2) : poseA(p3, v.t - debut3)
      expect(Math.abs(q.a - v.a)).toBeLessThanOrEqual(0.0021)
    }
    // Rangé avant le dernier geste : un morceau v: 0
    expect(g3.inst!.some(m => (m as MorceauPoses).v === 0)).toBe(true)
  })
})

describe('la dernière image d\'un geste', () => {
  it('peinte juste après l\'étape, elle reste au geste : l\'image suivante n\'a rien à rejouer', async () => {
    const s = await seance()
    s.montrer(peint('regle', 0, 0)); await s.avancer(400)
    s.t.poser(s.page, trait(0, 0)); await s.avancer(500)
    // La règle glisse ; le lever pose l'étape, et la dernière pose ne se peint qu'après
    s.montrer(peint('regle', 0, 0, 0, 0, 'corps'))
    for (let i = 1; i <= 20; i++) { await s.avancer(16); s.montrer(peint('regle', i * 10, 0, 0, 0, 'corps')) }
    s.t.poser(s.page, polygone([[0, 0], [200, 0]]))
    await s.avancer(9)
    s.montrer(peint('regle', 210, 0, 0, 0, 'corps'))         // l'image d'après l'étape
    await s.avancer(7)
    s.montrer(peint('regle', 210, 0))                         // la pastille s'éteint
    await s.avancer(3000)
    s.t.poser(s.page, trait(40, 40)); await s.avancer(1)
    s.piste.vider()
    const film = exporter(s.t, { ...toutes(s.t), pages: [s.page], titre: '' })
    const b = new Bobine(film)
    expect(b.geste(2)).toBeTruthy()
    expect(b.geste(2)!.fin.get('regle')!.etat.x).toBe(210)    // la dernière pose est dans le geste
    expect(b.geste(3)).toBeNull()                              // et pas dans le suivant
    expect(b.attente(3)).toBe(tasser(film.etapes[2].dt))
  })

  it('le tracé arrêté avant sa dernière peinture est daté à cette peinture', async () => {
    const s = await seance()
    const arc = (a1: number): TraceInstrument => ({ k: 'arc', x: 0, y: 0, r: 100, a0: 0, a1, couleur: '#000', taille: 2 })
    s.piste.trace(arc(-0.1)); s.piste.peintureDirect(); s.h.avancer(16)
    s.piste.trace(arc(-0.2)); s.h.avancer(4)
    s.piste.trace(null)                                        // le lever, avant que -0.2 ait paru
    s.h.avancer(12)
    s.piste.peintureDirect()                                   // il paraît maintenant
    s.piste.vider()
    const x = lireMorceau(s.ecrits.find(m => 'k' in m)!) as { ech: { t: number; v: number[] }[] }
    expect(x.ech).toHaveLength(2)
    expect(x.ech[1].t - x.ech[0].t).toBe(32)
    expect(x.ech[1].v[0]).toBeCloseTo(-0.2, 4)
  })
})

describe('le tracé reste à l\'écran jusqu\'à la figure', () => {
  /** Un arc au compas, peint image par image, le crayon tenu `tenue` ms avant
   *  le lever ; `pose` : le lever pose l'arc (sinon le tracé est abandonné) */
  async function arcTenu(tenue: number, pose = true) {
    const s = await seance()
    s.montrer(peint('compas', 0, 0, 0, 160)); await s.avancer(500)
    s.t.poser(s.page, trait(300, 300)); await s.avancer(1500)
    s.montrer(peint('compas', 0, 0, 0, 160, 'tete'))
    for (let i = 1; i <= 40; i++) {
      await s.avancer(16)
      s.montrer(peint('compas', 0, 0, -i * 0.03, 160, 'tete'))
      s.piste.trace({ k: 'arc', x: 0, y: 0, r: 160, a0: 0, a1: -i * 0.03, couleur: '#1b2230', taille: 2.5 })
      s.piste.peintureDirect()
    }
    await s.avancer(tenue)
    // Le lever : le tracé s'arrête, l'arc est posé, la pastille s'éteint à l'image d'après
    s.piste.trace(null)
    if (pose) s.t.poser(s.page, cercle(0, 0, 160, { a0: 0, a1: -1.2 }))
    await s.avancer(9)
    s.montrer(peint('compas', 0, 0, -1.2, 160)); s.piste.peintureDirect()
    await s.avancer(pose ? 2000 : 6000)
    s.t.poser(s.page, trait(40, 40)); await s.avancer(1)
    s.piste.vider()
    return s
  }
  /** Du premier instant où l'aperçu paraît jusqu'à la fin de la manipulation, il ne manque jamais */
  function sansTrou(g: { duree: number; apercuA(tau: number): unknown }) {
    let premier = -1, trous = 0
    for (let tau = 0; tau <= g.duree; tau += 1) {
      const f = g.apercuA(tau)
      if (premier < 0 && f) premier = tau
      if (premier >= 0 && !f) trous++
    }
    expect(premier).toBeGreaterThanOrEqual(0)
    return trous
  }

  it('la piste note l\'arrêt d\'un crayon resté immobile : le tracé dure jusqu\'au lever', async () => {
    const s = await arcTenu(800)
    const x = lireMorceau(s.ecrits.find(m => 'k' in m)!) as { ech: { t: number; v: number[] }[] }
    const n = x.ech.length
    expect(x.ech[n - 1].t - x.ech[n - 2].t).toBeGreaterThanOrEqual(800)     // tenu jusqu'au lever
    expect(x.ech[n - 1].v[0]).toBeCloseTo(-1.2, 4)
    expect(x.ech[n - 1].t).toBe(s.t.film.get(2).t)                          // le lever est l'étape
  })

  for (const tenue of [0, 800]) {
    it(`crayon tenu ${tenue} ms : au lecteur comme à la revue, l'arc ne s'efface jamais avant la figure`, async () => {
      const s = await arcTenu(tenue)
      const film = exporter(s.t, { ...toutes(s.t), pages: [s.page], titre: '' })
      const b = new Bobine(film)
      expect(film.etapes[1].o.some(o => o[0] === '=' && o[1].type === 'cercle')).toBe(true)
      expect(sansTrou(b.geste(2)!)).toBe(0)
      const fin = b.geste(2)!.apercuA(b.geste(2)!.duree)
      expect(fin?.type === 'cercle' && fin.arc!.a1).toBeCloseTo(-1.2, 3)
      expect(b.tracees(2).size).toBe(1)                                      // et l'arc posé ne se redessine pas
      const lecture = lectureDe(s.t, () => s.t.ordre.toArray())
      const seances = seancesDuFilm(lecture.film)
      const bande = construireBande(lecture, { genre: 'seance', seance: seances[0], page: s.page }, seances, p => p)!
      const k = bande.images.findIndex(i => i.e === 2)
      expect(sansTrou(bande.manips![k]!)).toBe(0)
    })
  }

  it('un tracé abandonné (rien de posé au lever) s\'efface à son arrêt, comme au tableau', async () => {
    const s = await arcTenu(300, false)
    const b = new Bobine(exporter(s.t, { ...toutes(s.t), pages: [s.page], titre: '' }))
    const g = b.geste(2)!
    expect(g.apercuA(g.duree)).toBeNull()
    expect(g.apercuA(g.duree / 2)).toBeNull()                              // le long silence qui suit
  })
})

describe('l\'épilogue d\'une page : ce qu\'on y fait après son dernier geste', () => {
  /** Sur la page A, la règle et le compas servent ; après le dernier geste de
   *  A, on range le compas et on pousse la règle, puis on passe sur la page B
   *  (neuve, ou déjà là : on y va sans rien noter) pour y écrire deux traits */
  async function deuxPages(neuve: boolean, traitsB = 2) {
    const s = await seance()
    const A = s.page
    const B0 = neuve ? '' : s.t.ajouterPage('blanc', 1)
    await s.avancer(1000)
    const de = s.t.film.length
    s.montrer(peint('regle', 100, 100)); s.montrer(peint('compas', 300, 300, 0, 120)); await s.avancer(500)
    s.t.poser(A, trait(0, 0)); await s.avancer(400)
    await s.mener('regle', { x: 200, y: 150, a: 0.3, r: 0 }, 400)
    await s.avancer(300)
    s.t.poser(A, polygone([[0, 0], [100, 0]], 200, 150)); await s.avancer(1)
    await s.avancer(1500)
    s.ranger('compas'); await s.avancer(600)
    await s.mener('regle', { x: 900, y: 700, a: 0.3, r: 0 }, 500)
    await s.avancer(800)
    const B = neuve ? s.t.ajouterPage('blanc', 1) : B0
    s.t.pageVue = B; s.peindre(); await s.avancer(1200)
    s.t.poser(B, trait(10, 10)); await s.avancer(700)
    if (traitsB > 1) { s.t.poser(B, trait(30, 10)); await s.avancer(1) }
    await s.avancer(500)
    s.piste.vider(); await s.avancer(1)
    return { ...s, A, B, de }
  }
  const sans = (e: EtatInstruments | null | undefined, n: string) => !e?.has(n)

  for (const neuve of [true, false]) {
    it(`lecteur (page B ${neuve ? 'neuve' : 'déjà là'}) : l'arrêt en fin de chapitre montre les instruments tels qu'on a quitté la page`, async () => {
      const s = await deuxPages(neuve)
      const film = exporter(s.t, { de: s.de, a: s.t.film.length - 1, pages: [s.A, s.B], titre: '' })
      const kA = film.etapes.findIndex(e => e.p === s.B)              // la dernière image de la page A
      expect(kA).toBe(2)
      const apres = film.etapes[kA - 1].apres!
      expect(apres.some(m => (m as MorceauPoses).n === 'compas' && (m as MorceauPoses).v === 0)).toBe(true)
      expect(apres.some(m => (m as MorceauPoses).n === 'regle' && (m as MorceauPoses).q === 'corps')).toBe(true)
      expect(JSON.stringify(film)).not.toContain(`"p":"${s.A}","n"`)  // aucun morceau ne porte de page
      const b = new Bobine(await lireFilm(await ecrireFilm(film)))
      expect(b.finDuChapitre(0)).toBe(kA)
      // Au geste, le compas est là ; à la fin de l'image (fin du chapitre), il est rangé et la règle poussée
      expect(b.instrumentsAuGeste(kA)!.has('compas')).toBe(true)
      const fin = b.instruments(kA)!
      expect(sans(fin, 'compas')).toBe(true)
      expect(fin.get('regle')!.etat).toMatchObject({ x: 900, y: 700 })
      // L'épilogue se joue après le geste, à son rythme : le compas part, puis la règle glisse
      const e = b.epilogue(kA)!
      expect(e.etatA(-1).has('compas')).toBe(true)
      expect(e.attente).toBeCloseTo(tasser(1500 - APRES_L_ETAPE, 0), -1)
      expect(e.duree).toBeGreaterThan(1000); expect(e.duree).toBeLessThan(1300)
      const mi = e.etatA(e.duree - 250).get('regle')!.etat.x
      expect(mi).toBeGreaterThan(250); expect(mi).toBeLessThan(850)
      expect(b.trace(kA)).toBe((b.geste(kA)?.duree ?? 0) + e.attente + e.duree)
      // Le temps qu'il a montré n'est pas rejoué avant l'image suivante
      const L = 1500 + 600 + 500 + 16 - APRES_L_ETAPE
      expect(b.attente(kA + 1)).toBeLessThan(tasser(film.etapes[kA].dt) - 500)
      expect(b.attente(kA + 1)).toBeCloseTo(tasser(film.etapes[kA].dt - L), -2)
      // Sur la page B, rien ne reparaît
      for (let k = kA + 1; k < b.n; k++) expect(sans(b.instruments(k), 'compas')).toBe(true)
    })

    it(`revue (page B ${neuve ? 'neuve' : 'déjà là'}) : la fin de la partie, l'ouverture de la suivante et l'affiche`, async () => {
      const s = await deuxPages(neuve)
      const lecture = lectureDe(s.t, () => s.t.ordre.toArray())
      const seances = seancesDuFilm(lecture.film)
      const toute = construireBande(lecture, { genre: 'seance', seance: seances[0], page: null }, seances, p => p)!
      expect(toute.parties).toHaveLength(2)
      const f = toute.parties[0].fin, img = toute.images[f]
      expect(img).toMatchObject({ p: s.A, geste: false, epilogue: true })
      expect(lecture.film[img.e].t).toBe(lecture.film[toute.images[f - 1].e].t)    // la page après son dernier geste
      expect(toute.manips![f]!.etatA(-1).has('compas')).toBe(true)
      expect(sans(toute.etats![f], 'compas')).toBe(true)
      expect(toute.etats![f].get('regle')!.etat).toMatchObject({ x: 900, y: 700 })
      expect(toute.total).toBe(4)                                       // ce n'est pas un geste
      // La partie suivante s'ouvre sur les instruments tels qu'on les a laissés
      const o = toute.parties[1].debut
      expect(sans(toute.etats![o], 'compas')).toBe(true)
      expect(toute.etats![o].get('regle')!.etat).toMatchObject({ x: 900, y: 700 })
      // L'affiche de la page A, revue seule : comme on l'a quittée
      const pageA = construireBande(lecture, { genre: 'seance', seance: seances[0], page: s.A }, seances, p => p)!
      const n = pageA.images.length
      expect(pageA.images[n - 1].epilogue).toBe(true)
      expect(sans(pageA.etats![n - 1], 'compas')).toBe(true)
      expect(pageA.etats![n - 1].get('regle')!.etat).toMatchObject({ x: 900, y: 700 })
      expect(pageA.bornes).toContain(n - 1)
    })
  }

  it('revue, un détour d\'un geste sur une autre page : l\'épilogue, puis l\'image suivante n\'attend pas son temps une seconde fois', async () => {
    const s = await deuxPages(false, 1)
    const lecture = lectureDe(s.t, () => s.t.ordre.toArray())
    const seances = seancesDuFilm(lecture.film)
    const b = construireBande(lecture, { genre: 'seance', seance: seances[0], page: null }, seances, p => p)!
    expect(b.parties).toHaveLength(1)
    const f = b.images.findIndex(i => i.epilogue)
    expect(b.images[f + 1]).toMatchObject({ p: s.B, geste: true })
    expect(sans(b.etats![f], 'compas')).toBe(true)
    const silence = lecture.film[b.images[f + 1].e].t - lecture.film[b.images[f].e].t
    const L = 1500 + 600 + 500 + 16 - APRES_L_ETAPE
    expect(b.attentes[f + 1]).toBeCloseTo(tasser(silence - L), -2)
    expect(b.attentes[f + 1]).toBeLessThan(tasser(silence) - 500)
  })

  it('au bout du film : l\'épilogue va au plus une minute après le dernier geste, et jamais au-delà de l\'étape suivante', async () => {
    for (const [attente, part] of [[2000, true], [70_000, false]] as const) {
      const s = await seance()
      s.montrer(peint('compas', 0, 0, 0, 100)); await s.avancer(500)
      s.t.poser(s.page, trait(0, 0)); await s.avancer(1)
      await s.avancer(attente)
      s.ranger('compas'); await s.avancer(500)
      s.piste.vider()
      const film = exporter(s.t, { ...toutes(s.t), pages: [s.page], titre: '' })
      expect(!!film.etapes[0].apres).toBe(part)
      expect(sans(new Bobine(film).instruments(1), 'compas')).toBe(part)
      // La revue, au bout du film : son affiche aussi
      const lecture = lectureDe(s.t, () => s.t.ordre.toArray())
      const seances = seancesDuFilm(lecture.film)
      const b = construireBande(lecture, { genre: 'seance', seance: seances[0], page: s.page }, seances, p => p)!
      const n = b.images.length
      expect(!!b.images[n - 1].epilogue).toBe(part)
      expect(sans(b.etats![n - 1], 'compas')).toBe(part)
    }
    // Une étape du tableau (non publiée) vient avant le rangement : il n'est pas de cette séance
    const s = await seance()
    s.montrer(peint('compas', 0, 0, 0, 100)); await s.avancer(500)
    s.t.poser(s.page, trait(0, 0)); await s.avancer(1000)
    const C = s.t.ajouterPage('blanc', 1); await s.avancer(1000)
    s.ranger('compas'); await s.avancer(500)
    s.piste.vider()
    const film = exporter(s.t, { de: 1, a: 1, pages: [s.page, C], titre: '' })
    expect(film.etapes).toHaveLength(1)
    expect(film.etapes[0].apres).toBeUndefined()
  })
})

describe('une piste de toute une année', () => {
  it('ce qui sert entre deux heures répond comme toute la piste (état, rang, fenêtres), pour des pistes au hasard', () => {
    let graine = 7
    const hasard = () => { graine = (graine * 16807) % 2147483647; return graine / 2147483647 }
    const cles: [NomInstrument, boolean][] = [['regle', false], ['compas', false], ['equerre', false], ['regle', true], ['rapporteur', true]]
    for (let essai = 0; essai < 40; essai++) {
      const morceaux: Morceau[] = []
      for (const [n, c] of cles) {
        let t = Math.floor(hasard() * 3000)
        while (t < 100_000) {
          const page = hasard() < 0.5 ? 'P1' : 'P2'
          const r = hasard()
          const base = { t, p: page, n, ...(c ? { c: 1 as const } : {}) }
          if (r < 0.12) { morceaux.push({ ...base, v: 0, d: [] }); t += 1 + Math.floor(hasard() * 4000); continue }
          const nb = 1 + Math.floor(hasard() * 6), poses = []
          for (let i = 0; i < nb; i++) poses.push({ t: i * Math.floor(1 + hasard() * 300), x: Math.round(hasard() * 900), y: Math.round(hasard() * 600), a: Math.round(hasard() * 6000) / 1000, r: n === 'compas' ? Math.round(hasard() * 300) : 0 })
          const m: MorceauPoses = { ...base, d: encoderPoses(poses, n === 'compas') }
          if (!c && r < 0.55) m.q = 'corps'
          if (hasard() < 0.03) m.d = [0, 1, 2]                          // abîmé : laissé de côté
          morceaux.push(m)
          t += poses[poses.length - 1].t + 1 + Math.floor(hasard() * 5000)
        }
      }
      for (let i = 0; i < 30; i++) {
        const t = Math.floor(hasard() * 100_000), arc = hasard() < 0.5
        const ech = Array.from({ length: 2 + Math.floor(hasard() * 5) }, (_, j) => ({ t: j * Math.floor(1 + hasard() * 2000), v: arc ? [hasard() * 3] : [hasard() * 500, hasard() * 500] }))
        morceaux.push({ t, p: hasard() < 0.5 ? 'P1' : 'P2', k: arc ? 'arc' : 'seg', s: ['#000', 2], g: arc ? [0, 0, 1000, 0] : [0, 0], d: encoderTrace(ech, arc) })
      }
      // L'ordre de la piste : celui où les morceaux se ferment, à peu près celui du temps
      morceaux.sort((x, y) => x.t - y.t + (hasard() - 0.5) * 3000)
      const a = 10_000 + Math.floor(hasard() * 60_000), b = a + Math.floor(hasard() * 30_000)
      const choisis = morceauxEntre(morceaux, a, b)
      const toute = new LecturePiste(morceaux), partie = new LecturePiste(choisis)
      expect(choisis.length).toBeLessThan(morceaux.length)
      const vu = (e: EtatInstruments) => [...e.values()].sort((x, y) => x.rang - y.rang).map(i => ({ n: i.n, c: i.c, q: i.q, ...i.etat }))
      for (let k = 0; k <= 20; k++) {
        const t = a + (b - a) * k / 20
        expect(vu(partie.etatA(t))).toEqual(vu(toute.etatA(t)))
        const x = a + Math.floor(hasard() * (b - a)), y = x + Math.floor(hasard() * (b - x))
        for (const p of [null, 'P1', 'P2']) {
          const f1 = toute.dans(x, y, p), f2 = partie.dans(x, y, p)
          expect(JSON.stringify(f2)).toBe(JSON.stringify(f1))
        }
        expect(partie.premierDans(x, y, 'P1')).toBe(toute.premierDans(x, y, 'P1'))
      }
    }
  })

  it('l\'export d\'une séance et sa revue ne décodent pas le passé de la piste', async () => {
    const s = await seance()
    // Deux cents jours d'instruments, avant la séance : chaque morceau compte ses lectures
    let lus = 0
    const passe: Morceau[] = []
    for (let i = 0; i < 2000; i++) {
      const d = encoderPoses([{ t: 0, x: i % 500, y: 0, a: 0, r: 0 }, { t: 400, x: i % 500 + 40, y: 10, a: 0.1, r: 0 }], i % 2 === 0)
      const m = { t: DATE0 - 200 * 86_400_000 + i * 8_000_000, p: s.page, n: i % 2 ? 'regle' : 'compas', q: 'corps' } as MorceauPoses
      Object.defineProperty(m, 'd', { get: () => { lus++; return d }, enumerable: true })
      passe.push(m)
    }
    s.t.noterPiste(passe)
    await s.avancer(1000)
    s.montrer(peint('regle', 0, 0)); await s.avancer(500)
    s.t.poser(s.page, trait(0, 0)); await s.avancer(400)
    await s.mener('regle', { x: 300, y: 100, a: 0.2, r: 0 }, 400); await s.avancer(300)
    s.t.poser(s.page, trait(20, 0)); await s.avancer(1)
    s.piste.vider(); await s.avancer(1)
    lus = 0
    const film = exporter(s.t, { de: 1, a: s.t.film.length - 1, pages: [s.page], titre: '' })
    expect(film.etapes[1].inst).toBeTruthy()
    expect(film.instruments!.map(m => (m as MorceauPoses).n).sort()).toEqual(['compas', 'regle'])   // l'état d'avant, lui, est là
    expect(lus).toBeLessThanOrEqual(4)
    lus = 0
    const lecture = lectureDe(s.t, () => s.t.ordre.toArray())
    const seances = seancesDuFilm(lecture.film)
    const b = construireBande(lecture, { genre: 'seance', seance: seances[0], page: s.page }, seances, p => p)!
    expect(b.manips!.some(m => m)).toBe(true)
    expect(lus).toBeLessThanOrEqual(4)
  })
})

describe('la compatibilité', () => {
  it('le format garde sa version : un lecteur d\'aujourd\'hui lit le film, un ancien y voit le film d\'avant', async () => {
    const s = await seanceType()
    expect(VERSION).toBe(1)
    const choix = { ...toutes(s.t), pages: [s.A], titre: 'Règle' }
    const film = await lireFilm(await ecrireFilm(exporter(s.t, choix)))
    expect(film.v).toBe(1)
    expect(film.instruments).toBeTruthy()
    // Ce qu'un lecteur plus ancien voit : les champs qu'il ne connaît pas en moins,
    // c'est exactement le film sans instruments
    const ancien = JSON.parse(JSON.stringify(film)) as FilmEleve
    delete ancien.instruments; delete ancien.avant
    for (const e of ancien.etapes) { delete e.inst; delete e.apres }
    expect(JSON.stringify(ancien)).toBe(JSON.stringify(exporter(s.t, choix, { instruments: false })))
    // Les temps d'un lecteur ancien (qui ignore inst) sont ceux du film sans instruments
    const b = new Bobine(ancien)
    expect(b.avecInstruments).toBe(false)
    for (let k = 1; k < b.n; k++) expect(b.delai(k)).toBe(tasser(ancien.etapes[k - 1].dt))
  })

  it('un fichier d\'une version plus récente est refusé avec une phrase claire, sans planter', async () => {
    const s = await seanceType()
    const texte = await ecrireFilm(exporter(s.t, { ...toutes(s.t), pages: [s.A], titre: '' }))
    const plusRecent = texte.replace('"v":1', '"v":2')
    await expect(lireFilm(plusRecent)).rejects.toThrow(/version plus récente/)
  })

  it('le fichier .mem d\'avant les instruments se rejoue exactement comme avant', async () => {
    const film = await lireFilm(readFileSync(join(__dirname, 'donnees', 'seance-sans-temps.mem'), 'utf8'))
    const b = new Bobine(film)
    expect(b.avecInstruments).toBe(false)
    expect(b.instruments(3)).toBeNull()
    let temps = 0
    for (let k = 1; k < b.n; k++) {
      expect(b.geste(k)).toBeNull()
      temps += tasser(film.etapes[k - 1].dt)
      expect(b.temps[k]).toBe(temps)
    }
  })

  it('des instruments abîmés : le film se rejoue comme s\'il n\'en avait pas', async () => {
    const s = await seanceType()
    const film = exporter(s.t, { ...toutes(s.t), pages: [s.A], titre: '' })
    const sans = new Bobine(exporter(s.t, { ...toutes(s.t), pages: [s.A], titre: '' }, { instruments: false }))
    for (const abimer of [
      (f: FilmEleve) => { f.etapes[0].inst![0] = { t: -4, n: 'regle', d: [0, 1, 2, 3] } },
      (f: FilmEleve) => { (f.etapes[1] as { inst: unknown }).inst = 'rien' },
      (f: FilmEleve) => { (f as { instruments: unknown }).instruments = [{ t: 0, n: 'gomme', d: [0, 1, 2, 3] }] },
      (f: FilmEleve) => { (f as { avant: unknown }).avant = -5 },
      (f: FilmEleve) => { (f.etapes[0].inst![0] as MorceauPoses).d = [0, 1, 2] },
    ]) {
      const f = JSON.parse(JSON.stringify(film)) as FilmEleve
      abimer(f)
      const b = new Bobine(f)
      expect(b.avecInstruments).toBe(false)
      expect(b.temps).toEqual(sans.temps)
    }
  })
})

// =============================================================
/** Un film élève fait à la main : une page, des gestes, et ce qu'y font les instruments */
function filmDe(etapes: EtapeFilm[], instruments?: Morceau[], avant?: number): FilmEleve {
  const f: FilmEleve = { format: 'mem-revoir', v: 1, titre: 't', date: DATE0, ordre: ['P'], pages: [{ id: 'P', fond: 'blanc', origine: { x: 0, y: 0 }, formes: [] }], etapes, chapitres: [{ i: 0, titre: 'x' }], images: {} }
  if (instruments) f.instruments = instruments
  if (avant) f.avant = avant
  return f
}
/** Un morceau de poses, depuis des poses en clair (t relatif à la fenêtre) */
function morceau(n: NomInstrument, pts: { t: number; x: number; y: number; a?: number; r?: number }[], q?: Partie, extra: Partial<MorceauPoses> = {}): MorceauPoses {
  const p = pts.map(x => ({ t: x.t, x: x.x, y: x.y, a: x.a ?? 0, r: x.r ?? 0 }))
  const m: MorceauPoses = { t: p[0].t, n, d: encoderPoses(p, n === 'compas'), ...extra }
  if (q) m.q = q
  return m
}

describe('le lecteur des élèves : le temps des instruments', () => {
  const debut = morceau('regle', [{ t: 0, x: 0, y: 0 }])

  it('sans événement dans la fenêtre, attente et tracé restent ceux d\'aujourd\'hui', () => {
    let graine = 3
    const hasard = () => { graine = (graine * 16807) % 2147483647; return graine / 2147483647 }
    for (let essai = 0; essai < 20; essai++) {
      const etapes: EtapeFilm[] = []
      for (let i = 0; i < 12; i++) {
        const tr = trait(i * 10, 0)
        const e: EtapeFilm = { dt: i ? Math.round(hasard() * 9000) : 0, p: 'P', o: [['=', tr]] }
        if (hasard() < 0.4) e.ms = [4, 5, 6, 7, 8, 30]
        // Rien qui bouge : un saut, ou la pastille qui s'éteint au lever
        if (hasard() < 0.5) e.inst = [hasard() < 0.5 ? morceau('regle', [{ t: e.dt, x: 50, y: hasard() * 100 }], undefined, { s: 1 }) : morceau('regle', [{ t: Math.floor(e.dt / 2), x: 0, y: 0 }])]
        etapes.push(e)
      }
      const avec = new Bobine(filmDe(etapes, [debut]))
      const sans = new Bobine(filmDe(etapes.map(e => { const { inst: _i, ...r } = e; return r })))
      expect(avec.avecInstruments).toBe(true)
      for (let k = 1; k < avec.n; k++) {
        expect(avec.geste(k)).toBeNull()
        expect(avec.attente(k)).toBe(sans.attente(k))
        expect(avec.trace(k)).toBe(sans.trace(k))
      }
      expect(avec.temps).toEqual(sans.temps)
    }
  })

  it('avec un mouvement : l\'attente est le silence d\'avant, la manipulation passe à sa vitesse', () => {
    // 6 s de silence, la règle bouge 900 ms (avec un arrêt de 300 ms au milieu), 500 ms, le geste
    const m = morceau('regle', [{ t: 6000, x: 0, y: 0 }, { t: 6300, x: 30, y: 0 }, { t: 6600, x: 30, y: 0 }, { t: 6900, x: 60, y: 10 }], 'corps')
    const b = new Bobine(filmDe([{ dt: 0, p: 'P', o: [] }, { dt: 7400, p: 'P', o: [['=', polygone([[0, 0], [10, 0]])]], inst: [m] }], [debut]))
    const g = b.geste(2)!
    expect(g).toBeTruthy()
    expect(b.attente(2)).toBe(tasser(6000))                    // le seul long silence
    expect(g.duree).toBe(900 + 500)                            // l'arrêt de 300 ms est dans le mouvement, puis 500 ms
    expect(b.trace(2)).toBe(g.duree)
    // Chaque pose notée se retrouve à son τ
    for (const [tau, x] of [[0, 0], [300, 30], [600, 30], [900, 60]]) expect(g.etatA(tau).get('regle')!.etat.x).toBeCloseTo(x, 6)
    expect(g.etatA(150).get('regle')!.etat.x).toBeCloseTo(15, 6)
    expect(g.etatA(150).get('regle')!.q).toBe('corps')
  })

  it('un long silence coupé en deux par un geste ne compte pas double', () => {
    const m = morceau('regle', [{ t: 4000, x: 0, y: 0 }, { t: 4200, x: 30, y: 0 }], 'corps')
    const b = new Bobine(filmDe([{ dt: 0, p: 'P', o: [] }, { dt: 8200, p: 'P', o: [['=', polygone([[0, 0], [10, 0]])]], inst: [m] }], [debut]))
    const g = b.geste(2)!
    const silences = tasser(8000, 0)
    expect(b.attente(2) + g.duree - 200).toBeCloseTo(silences, 6)
    expect(b.attente(2)).toBeCloseTo(silences / 2, 6)
    expect(b.attente(2) + b.trace(2)).toBeLessThan(2 * tasser(4000))
  })

  it('l\'état à chaque image est l\'état vrai au geste, et les allures divisent tout', async () => {
    const s = await seanceType()
    const film = await lireFilm(await ecrireFilm(exporter(s.t, { ...toutes(s.t), pages: [s.A], titre: '' })))
    const b = new Bobine(film)
    const piste = new LecturePiste(s.t.piste.toArray())
    for (const [k, T] of [[1, s.T1], [2, s.T2]] as const) {
      const vrai = piste.etatA(T).get('regle')!, vu = b.instruments(k)!.get('regle')!
      expect(vu.etat.x).toBeCloseTo(vrai.etat.x, 1); expect(vu.etat.y).toBeCloseTo(vrai.etat.y, 1); expect(vu.etat.a).toBeCloseTo(vrai.etat.a, 3)
    }
    // L'image 1 : la règle se pose, puis le crayon longe son bord
    const g = b.geste(1)!
    expect(g).toBeTruthy()
    expect(g.traces).toHaveLength(1)
    expect(b.tracees(1).has(s.seg.id)).toBe(true)              // le segment ne se redessine pas
    // Pendant le tracé le long du bord, l'aperçu est un segment qui part de (200, 300)
    let vu = false
    for (let tau = 0; tau <= g.duree; tau += 10) {
      const f = g.apercuA(tau)
      if (f?.type === 'polygone') { vu = true; expect(f.x).toBe(200); expect(f.y).toBe(300) }
    }
    expect(vu).toBe(true)
    expect(b.temps[1]).toBe(b.attente(1) + b.trace(1))
  })

  it('l\'arc du compas : l\'aperçu suit la mine, et l\'arc paru n\'est pas redessiné', () => {
    // Le compas tourne de 0 à −1,5 rad en 1 s ; l'arc suit sa mine
    const pts = Array.from({ length: 11 }, (_, i) => ({ t: 2000 + i * 100, x: 0, y: 0, a: -0.15 * i, r: 160 }))
    const m = morceau('compas', pts, 'tete')
    const arc: Morceau = { t: 2000, k: 'arc', s: ['#1f5fbf', 2.5], g: [0, 0, 1600, 0], d: encoderTrace(pts.map(p => ({ t: p.t, v: [p.a] })), true) }
    const c = cercle(0, 0, 160, { a0: 0, a1: -1.5 })
    const b = new Bobine(filmDe([{ dt: 0, p: 'P', o: [] }, { dt: 3100, p: 'P', o: [['=', c]], inst: [m, arc] }], [morceau('compas', [{ t: 0, x: 0, y: 0, a: 0, r: 160 }])]))
    const g = b.geste(2)!
    for (let tau = 0; tau <= 1000; tau += 50) {
      const f = g.apercuA(tau), a = g.etatA(tau).get('compas')!.etat.a
      expect(f?.type).toBe('cercle')
      if (f?.type === 'cercle') expect(f.arc!.a1).toBeCloseTo(a, 6)
    }
    // Arrêté 100 ms avant la fin de la manipulation : l'arc reste jusqu'au bout,
    // où la figure posée le remplace (le lecteur efface alors l'aperçu)
    const fin = g.apercuA(g.duree)
    expect(fin?.type === 'cercle' && fin.arc!.a1).toBeCloseTo(-1.5, 4)
    expect(dejaTracee(c, g.traces)).toBe(true)
    expect(b.tracees(2).has(c.id)).toBe(true)
    expect(dejaTracee(cercle(0, 0, 175), g.traces)).toBe(false)
  })

  it('le rythme des traits reste intact : le trait suit la manipulation et garde sa durée', () => {
    const tr = trait(0, 0)
    const ms = [10, 20, 30, 40, 50, 60]
    const m = morceau('regle', [{ t: 1000, x: 0, y: 0 }, { t: 1400, x: 50, y: 0 }], 'corps')
    const etapes: EtapeFilm[] = [{ dt: 0, p: 'P', o: [] }, { dt: 3000, p: 'P', o: [['=', tr]], ms, inst: [m] }]
    const avec = new Bobine(filmDe(etapes, [debut]))
    const sans = new Bobine(filmDe(etapes.map(e => { const { inst: _i, ...r } = e; return r })))
    expect(avec.main(2)!.instants).toEqual(sans.main(2)!.instants)
    expect(avec.main(2)!.duree).toBe(sans.main(2)!.duree)
    const g = avec.geste(2)!
    // La fenêtre s'arrête au poser du trait (3000 − 210) : 400 ms de mouvement, puis 1 390 ms jusqu'au trait
    expect(g.duree).toBe(400 + tasser(1390, 0))
    expect(avec.trace(2)).toBe(g.duree + sans.main(2)!.duree)
    expect(avec.attente(2)).toBe(tasser(1000, 0))
  })

  it('l\'avant-propos : le premier geste rejoue ce qui le précède', () => {
    const m = morceau('regle', [{ t: 1, x: 0, y: 0 }, { t: 501, x: 100, y: 0 }], 'corps')
    const b = new Bobine(filmDe([{ dt: 0, p: 'P', o: [['=', trait(0, 0)]], inst: [m] }], [debut], 1200))
    const g = b.geste(1)!
    expect(g.duree).toBe(500 + 699)
    expect(b.attente(1)).toBe(PLANCHER)
  })
})

// =============================================================
describe('la revue : les instruments', () => {
  it('sans piste, la bande ne change pas ; une piste sur une autre page non plus', async () => {
    const s = await seance()
    for (let i = 0; i < 8; i++) { s.t.poser(s.page, trait(i * 20, 0)); await s.avancer(400 + i * 900) }
    const sans = lectureDe(s.t, () => s.t.ordre.toArray())
    expect(sans.pisteEntre(-Infinity, Infinity)).toBeNull()
    const seances = seancesDuFilm(sans.film)
    const portion = { genre: 'seance' as const, seance: seances[0], page: s.page }
    const b0 = construireBande(sans, portion, seances, p => p)!
    expect(b0.etats).toBeUndefined(); expect(b0.manips).toBeUndefined()
    // La règle bouge, mais sur une autre page
    s.t.noterPiste([
      { t: DATE0 + 1500, p: 'ailleurs', n: 'regle', d: [0, 0, 0, 0] },
      { t: DATE0 + 2000, p: 'ailleurs', n: 'regle', q: 'corps', d: [0, 0, 0, 0, 300, 500, 0, 0] },
    ])
    const avec = lectureDe(s.t, () => s.t.ordre.toArray())
    const b1 = construireBande(avec, portion, seances, p => p)!
    expect(b1.manips!.every(m => m === null)).toBe(true)
    expect(Array.from(b1.attentes)).toEqual(Array.from(b0.attentes))
    expect(Array.from(b1.traces)).toEqual(Array.from(b0.traces))
    expect(b1.bornes).toEqual(b0.bornes)
    expect(Array.from(b1.gestes)).toEqual(Array.from(b0.gestes))
    expect(b1.images).toEqual(b0.images)
  })

  it('avec une piste : le tracé est la manipulation (et le trait), le pas se coupe au temps immobile', async () => {
    const s = await seanceType()
    const lecture = lectureDe(s.t, () => s.t.ordre.toArray())
    const seances = seancesDuFilm(lecture.film)
    const b = construireBande(lecture, { genre: 'seance', seance: seances[0], page: s.A }, seances, p => p)!
    const k = b.images.findIndex(i => i.geste && lecture.film[i.e].t === s.T1)
    const g = b.manips![k]!
    expect(g).toBeTruthy()
    expect(b.traces[k]).toBe(g.duree)
    expect(b.attentes[k]).toBe(ENTREE + g.duree)                // la première image d'une partie
    // L'état à chaque image est l'état vrai à son étape
    const piste = lecture.pisteEntre(-Infinity, Infinity)!
    b.images.forEach((img, i) => {
      if (img.e < 0) return
      const vrai = piste.etatA(lecture.film[img.e].t)
      expect(b.etats![i].get('regle')?.etat).toEqual(vrai.get('regle')?.etat)
    })
    // Les débuts : chaque image commence à son échéance moins son tracé
    for (const f of [1, 3]) {
      const ech = echeances(b, f), dep = departs(b, ech, f)
      expect(dep[k]).toBeCloseTo(ech[k] - g.duree / f, 6)
      // Relancée au milieu de la manipulation, la lecture la finit d'abord
      const reste = 300
      expect(horlogeAuDepart(ech, dep, k, reste, 100)).toBeCloseTo(ech[k] - reste, 6)
    }
  })

  it('l\'histoire d\'une page : ce qui s\'est fait sur une autre page n\'est pas rejoué, l\'état vrai reparaît', async () => {
    const s = await seanceType()
    const lecture = lectureDe(s.t, () => s.t.ordre.toArray())
    const seances = seancesDuFilm(lecture.film)
    const b = construireBande(lecture, { genre: 'page', page: s.A }, seances, p => p)!
    const k2 = b.images.findIndex(i => i.geste && lecture.film[i.e].t === s.T2)
    expect(k2).toBeGreaterThan(0)
    expect(b.images.every(i => i.p === s.A)).toBe(true)
    // La règle a bougé sur la page B : rien à rejouer avant le trait de la page A…
    expect(b.manips![k2]).toBeNull()
    // … mais elle y est, à sa vraie place
    expect(b.etats![k2].get('regle')!.etat).toMatchObject({ x: 600, y: 120 })
    expect(b.etats![k2 - 1].get('regle')!.etat.x).toBeCloseTo(200, 6)
  })

  it('le pas : un long temps immobile dans la fenêtre en commence un', async () => {
    const s = await seance()
    s.montrer(peint('regle', 0, 0)); await s.avancer(300)
    s.t.poser(s.page, trait(0, 0)); await s.avancer(500)
    // 4 s immobile, la règle bouge 300 ms, 200 ms, un trait
    await s.avancer(4000)
    await s.mener('regle', { x: 100, y: 0, a: 0, r: 0 }, 300)
    await s.avancer(200)
    s.t.poser(s.page, trait(20, 0)); await s.avancer(1)
    // 300 ms, la règle bouge 300 ms, 300 ms, un trait : même pas
    await s.avancer(300)
    await s.mener('regle', { x: 200, y: 0, a: 0, r: 0 }, 300)
    await s.avancer(300)
    s.t.poser(s.page, trait(40, 0)); await s.avancer(1)
    s.piste.vider()
    const lecture = lectureDe(s.t, () => s.t.ordre.toArray())
    const seances = seancesDuFilm(lecture.film)
    const b = construireBande(lecture, { genre: 'seance', seance: seances[0], page: s.page }, seances, p => p)!
    const n = b.images.length
    expect(b.manips![n - 2]!.immobile).toBeGreaterThanOrEqual(SILENCE_DE_PAS)
    expect(b.manips![n - 1]!.immobile).toBeLessThan(SILENCE_DE_PAS)
    expect(b.bornes).toContain(n - 3)                            // un pas commence à l'avant-dernière
    expect(b.bornes).not.toContain(n - 2)
  })

  it('la revue ne fait que lire : la piste et le document restent intacts', async () => {
    const s = await seanceType()
    const avant = Y.encodeStateVector(s.t.doc)
    let transactions = 0
    s.t.doc.on('afterTransaction', () => transactions++)
    const lecture = lectureDe(s.t, () => s.t.ordre.toArray())
    const seances = seancesDuFilm(lecture.film)
    for (const sc of seances) for (const page of [null, s.A, s.B]) construireBande(lecture, { genre: 'seance', seance: sc, page }, seances, p => p)
    construireBande(lecture, { genre: 'page', page: s.A }, seances, p => p)
    expect(transactions).toBe(0)
    expect(Y.encodeStateVector(s.t.doc)).toEqual(avant)
  })
})

describe('le rejeu d\'une fenêtre (horaire)', () => {
  const base = new Map<string, InstrumentVu>([['regle', { n: 'regle', c: false, etat: { x: 0, y: 0, a: 0, r: 0 }, q: null, rang: 1 }]])
  const piece = (pts: [number, number][], q: Partie | null = 'corps', saut = false): Piece => ({ cle: 'regle', n: 'regle', c: false, q, visible: true, saut, p: null, t0: pts[0][0], poses: pts.map(([t, x]) => ({ t, x, y: 0, a: 0, r: 0 })) })

  it('rien ne bouge (un saut, une pastille) : null', () => {
    expect(horaire([piece([[500, 40]], 'corps', true)], [], base, 3000, 0, PLANCHER)).toBeNull()
    expect(horaire([piece([[500, 0]], null)], [], base, 3000, 0, PLANCHER)).toBeNull()
  })

  it('une apparition et un rangement sont des événements', () => {
    const g = horaire([{ ...piece([[1000, 0]], null), cle: 'compas', n: 'compas' }], [], base, 2000, 0, PLANCHER)!
    expect(g).toBeTruthy()
    expect(g.etatA(-1).has('compas')).toBe(false)
    expect(g.etatA(g.duree).has('compas')).toBe(true)
    const r = horaire([{ ...piece([[1000, 0]], null), visible: false, poses: [] }], [], base, 2000, 0, PLANCHER)!
    expect(r.etatA(-1).has('regle')).toBe(true)
    expect(r.etatA(r.duree).has('regle')).toBe(false)
  })

  it('les petits arrêts gardent leur rythme ; au-delà du coude, ils sont tassés', () => {
    const g = horaire([piece([[0, 0], [100, 10]]), piece([[100 + COUDE, 10], [200 + COUDE, 20]])], [], base, 200 + COUDE, 0, PLANCHER)!
    expect(g.duree).toBe(100 + COUDE + 100)
    const h = horaire([piece([[0, 0], [100, 10]]), piece([[5100, 10], [5200, 20]])], [], base, 5200, 0, PLANCHER)!
    expect(h.duree).toBeCloseTo(200 + tasser(5000, 0), 6)
  })
})
