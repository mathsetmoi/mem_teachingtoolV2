// =============================================================
// LA TRIGONOMÉTRIE DANS LE PANNEAU DU CATALOGUE
// (1re spé › Analyse › Trigonométrie)
//  - le cercle trigonométrique, en trois versions (vide, angles
//    remarquables, avec cos et sin), les degrés en option ;
//  - les courbes de cos et sin ;
//  - l'enroulement de la droite des réels : une animation qu'on lance,
//    met en pause, fait avancer pas à pas ou au curseur. Pendant qu'elle
//    tourne, elle n'est peinte qu'à l'écran ; à chaque arrêt, ce qu'on voit
//    est posé sur la page en objets ordinaires (le replay des élèves voit
//    ces arrêts, pas le mouvement : le choix du professeur) ;
//  - les fiches de formules, posées ligne par ligne comme une
//    démonstration, en entier ou à trous.
// Les calculs sont dans trigonometrie.ts ; ici, le panneau et la page.
// =============================================================
import type { App } from './app'
import type { P } from './construction'
import type { Demonstration } from './catalogue'
import type { Figure, Forme, Formule } from './types'
import { uid } from './types'
import type { Dessin, QuellesCourbes, Reel, Reperes, VersionCercle } from './trigonometrie'
import {
  courbesTrigo, cercleTrigo, enroulement, ficheAvecTrous, FORMULES, lireReels, RAYON_CERCLE, RAYON_ENROULEMENT, texteEnLatex, UN_TOUR,
} from './trigonometrie'

const html = (t: string) => t.replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]!))
const CLE_REGLAGES = 'mem-catalogue-trigo'
/** Un pas des flèches : π/12 */
const PAS = Math.PI / 12

/** Ce que le catalogue prête : mesurer une formule, suivre le pointeur,
 *  poser une fiche comme une démonstration, dire un message */
export interface OutilsCatalogue {
  mesurer(latex: string, taille: number): { l: number; h: number }
  placer(fantomes: (w: P) => Figure[], poser: (w: P) => void): void
  peutPoser(): boolean
  poserDemo(d: Demonstration): void
  message(t: string): void
  /** L'enroulement vient d'être posé : les touches iront à lui */
  enroulementPose(): void
}

interface Reglages {
  cercle: VersionCercle; degres: boolean; courbes: QuellesCourbes; trous: boolean
  reperes: Reperes; deuxSens: boolean; reels: string; duree: number
}

/** L'enroulement posé, qu'on pilote depuis le panneau */
interface Anim {
  page: string
  o: P
  r: number
  s: number
  joue: boolean
  groupe: string
  /** Ce qui est posé de l'état présent (vide pendant que ça tourne) */
  ids: string[]
  /** Le cercle posé : s'il a été déplacé ou agrandi, on suit */
  cercle: string | null
  boucle: number
  avant: number
  /** On tient le curseur */
  glisse: boolean
}

export class Trigo {
  private reg: Reglages = { cercle: 'points', degres: false, courbes: 'les-deux', trous: false, reperes: 'les-deux', deuxSens: true, reels: 'π/3', duree: 7 }
  private anim: Anim | null = null
  private p!: HTMLElement

  constructor(private app: App, private outils: OutilsCatalogue) {
    try {
      const r = JSON.parse(localStorage.getItem(CLE_REGLAGES) ?? 'null')
      if (r && typeof r === 'object') for (const k of Object.keys(this.reg) as (keyof Reglages)[])
        if (typeof r[k] === typeof this.reg[k]) (this.reg as unknown as Record<string, unknown>)[k] = r[k]
    } catch { /* navigateur sans mémoire */ }
  }

  /** Les dessins, pour la recherche (les fiches de formules s'y ajoutent) */
  static readonly ELEMENTS: readonly { cle: string; nom: string; mots: string }[] = [
    { cle: 'cercle', nom: 'Cercle trigonométrique', mots: 'cercle trigonometrique angles remarquables radians cos sin' },
    { cle: 'courbes', nom: 'Courbes de cos et sin', mots: 'courbes fonctions cosinus sinus sinusoide periode' },
    { cle: 'enroulement', nom: 'Enroulement de la droite des réels', mots: 'enroulement droite des reels animation cercle trigonometrique' },
  ]
  /** Les éléments en plus des démonstrations, dans le chapitre Trigonométrie */
  static readonly NOMBRE = Trigo.ELEMENTS.length + FORMULES.length

  /** Pose un élément par son nom (depuis une recherche) : vrai s'il est d'ici */
  poserElement(nom: string): boolean {
    if (nom === 'cercle') this.poserCercle()
    else if (nom === 'courbes') this.poserCourbes()
    else if (nom === 'enroulement') this.poserEnroulement()
    else {
      const f = FORMULES.find(x => x.nom === nom)
      if (!f) return false
      this.poserFiche(f)
    }
    return true
  }

  /** L'enroulement est-il piloté sur cette page ? (les touches vont à lui) */
  get actif(): boolean { return !!this.anim && this.anim.page === this.app.page }

  // ---------- Le panneau ----------
  html(): string {
    const choix = (nom: string, valeurs: [string, string][], v: string) =>
      `<div class="choix-trigo" role="group" aria-label="${html(nom)}">${valeurs.map(([k, t]) => `<button type="button" class="secondaire" data-${nom}="${k}" aria-pressed="${k === v}">${html(t)}</button>`).join('')}</div>`
    const option = (v: string, t: string, ici: string) => `<option value="${v}"${v === ici ? ' selected' : ''}>${html(t)}</option>`
    return `
      <div class="ensembles trigo">
        <h4>Cercle trigonométrique</h4>
        ${choix('cercle', [['vide', 'Vide'], ['points', 'Angles remarquables'], ['valeurs', 'Avec cos et sin']], this.reg.cercle)}
        <label class="coche"><input type="checkbox" class="degres"${this.reg.degres ? ' checked' : ''}> Angles aussi en degrés</label>
        <button type="button" class="principal poser-cercle">Poser le cercle</button>
      </div>
      <div class="ensembles trigo">
        <h4>Courbes de cos et sin</h4>
        ${choix('courbes', [['cos', 'cos'], ['sin', 'sin'], ['les-deux', 'Les deux']], this.reg.courbes)}
        <button type="button" class="principal poser-courbes">Poser les courbes</button>
      </div>
      <div class="ensembles trigo">
        <h4>Enroulement de la droite des réels</h4>
        <label class="champ"><span>Repères sur la droite</span>
          <select class="reperes">${option('aucun', 'Aucun', this.reg.reperes)}${option('remarquables', 'Valeurs remarquables (π/2, π…)', this.reg.reperes)}${option('entiers', 'Entiers (1, 2, 3…)', this.reg.reperes)}${option('les-deux', 'Les deux', this.reg.reperes)}</select></label>
        <label class="champ"><span>Sens</span>
          <select class="sens">${option('deux', 'Les deux sens', this.reg.deuxSens ? 'deux' : 'direct')}${option('direct', 'Sens direct seulement', this.reg.deuxSens ? 'deux' : 'direct')}</select></label>
        <label class="champ"><span>Réels à placer (facultatif), séparés par des points-virgules</span>
          <input type="text" class="reels" spellcheck="false" placeholder="π/3 ; 3π/4 ; −π/2 ; 2,5"></label>
        <div class="erreurs erreurs-reels" role="status"></div>
        <button type="button" class="principal poser-enroulement">Poser l'animation</button>
      </div>
      <div class="ensembles trigo">
        <h4>Formules</h4>
        <label class="coche"><input type="checkbox" class="trous"${this.reg.trous ? ' checked' : ''}> À trous (on complète en classe)</label>
        ${FORMULES.map((f, i) => `<button type="button" class="secondaire demo fiche" data-fiche="${i}">${html(f.nom)}</button>`).join('')}
        <p class="note">Ligne par ligne : → ou Espace pour la suivante, ← pour revenir.</p>
      </div>`
  }

  /** Le pilotage de l'enroulement posé, sous la liste */
  htmlPilote(): string {
    return `
      <section class="element pilote-enroulement" hidden>
        <h3>Enroulement en cours</h3>
        <div class="commandes">
          <button type="button" class="secondaire pas-avant" title="Reculer d'un pas (←)">◀</button>
          <button type="button" class="principal lecture" title="Lecture ou pause (Espace)">▶ Lecture</button>
          <button type="button" class="secondaire pas-apres" title="Avancer d'un pas (→)">▶</button>
          <button type="button" class="secondaire debut" title="Revenir au début">↺</button>
        </div>
        <input type="range" class="avancement" min="0" max="1000" value="0" aria-label="Avancement de l'enroulement">
        <div class="commandes">
          <label class="champ vitesse"><span>Vitesse</span>
            <select class="duree"><option value="12">Lente</option><option value="7">Normale</option><option value="4">Rapide</option></select></label>
          <button type="button" class="secondaire terminer" title="Laisser la figure telle quelle sur la page">Terminer</button>
        </div>
        <p class="note etat-enroulement"></p>
      </section>`
  }

  brancher(p: HTMLElement) {
    this.p = p
    const q = <T extends HTMLElement>(s: string) => p.querySelector(s) as T
    const garder = () => { try { localStorage.setItem(CLE_REGLAGES, JSON.stringify(this.reg)) } catch { /* navigateur sans mémoire */ } }
    const groupe = (nom: 'cercle' | 'courbes') => p.querySelectorAll<HTMLButtonElement>(`[data-${nom}]`).forEach(b => b.addEventListener('click', () => {
      ;(this.reg as unknown as Record<string, string>)[nom] = b.dataset[nom]!
      p.querySelectorAll<HTMLButtonElement>(`[data-${nom}]`).forEach(x => x.setAttribute('aria-pressed', String(x === b)))
      garder()
    }))
    groupe('cercle'); groupe('courbes')
    q<HTMLInputElement>('.degres').addEventListener('change', e => { this.reg.degres = (e.target as HTMLInputElement).checked; garder() })
    q<HTMLInputElement>('.trous').addEventListener('change', e => { this.reg.trous = (e.target as HTMLInputElement).checked; garder() })
    q('.poser-cercle').addEventListener('click', () => this.poserCercle())
    q('.poser-courbes').addEventListener('click', () => this.poserCourbes())
    q('.poser-enroulement').addEventListener('click', () => this.poserEnroulement())
    p.querySelectorAll<HTMLButtonElement>('.fiche').forEach(b => b.addEventListener('click', () => this.poserFiche(FORMULES[Number(b.dataset.fiche)])))
    const reels = q<HTMLInputElement>('.reels')
    reels.value = this.reg.reels
    const changer = () => { garder(); this.lireReels(); if (this.anim && !this.anim.joue) this.refaire() }
    reels.addEventListener('input', () => { this.reg.reels = reels.value; changer() })
    q<HTMLSelectElement>('.reperes').addEventListener('change', e => { this.reg.reperes = (e.target as HTMLSelectElement).value as Reperes; changer() })
    q<HTMLSelectElement>('.sens').addEventListener('change', e => { this.reg.deuxSens = (e.target as HTMLSelectElement).value === 'deux'; changer() })
    // Le pilotage
    const duree = q<HTMLSelectElement>('.duree')
    duree.value = String(this.reg.duree)
    duree.addEventListener('change', () => { this.reg.duree = Number(duree.value); garder() })
    q('.lecture').addEventListener('click', () => this.lectureOuPause())
    q('.pas-avant').addEventListener('click', () => this.pas(-1))
    q('.pas-apres').addEventListener('click', () => this.pas(1))
    q('.debut').addEventListener('click', () => this.aller(0))
    q('.terminer').addEventListener('click', () => this.terminer())
    const curseur = q<HTMLInputElement>('.avancement')
    curseur.addEventListener('input', () => this.glisser(Number(curseur.value) / 1000 * UN_TOUR))
    curseur.addEventListener('change', () => this.lacher())
    this.lireReels()
    this.afficher()
  }

  /** Les réels tapés ; ce qui ne se lit pas est dit sous le champ */
  private lireReels(): Reel[] {
    const { reels, erreurs } = lireReels(this.reg.reels)
    const e = this.p?.querySelector('.erreurs-reels')
    if (e) e.innerHTML = erreurs.length ? `<p>Je ne sais pas placer : ${html(erreurs.join(' ; '))}. Écrivez par exemple π/3, −3π/4 ou 2,5 (entre −8 et 8).</p>` : ''
    return reels
  }

  private afficher() {
    if (!this.p) return
    const a = this.anim
    const pilote = this.p.querySelector('.pilote-enroulement') as HTMLElement
    pilote.hidden = !a
    if (!a) return
    ;(this.p.querySelector('.lecture') as HTMLButtonElement).textContent = a.joue ? '⏸ Pause' : '▶ Lecture'
    ;(this.p.querySelector('.avancement') as HTMLInputElement).value = String(Math.round(a.s / UN_TOUR * 1000))
    const k = a.s / Math.PI
    this.p.querySelector('.etat-enroulement')!.textContent = a.s >= UN_TOUR - 1e-9
      ? 'Un tour complet : 2π est revenu sur I.'
      : `Longueur enroulée : ${k.toFixed(2).replace('.', ',')} π` + (a.page !== this.app.page ? ' (sur une autre page)' : '')
  }

  // ---------- Poser un dessin ----------
  /** Les traits d'un dessin, pour le voir suivre le pointeur */
  private fantomes(d: Dessin): Figure[] {
    return [
      ...d.lignes.map(l => this.app.nouvelleFigure({ type: 'polygone', ferme: false, pts: l.pts }, { couleur: l.couleur ?? this.app.couleur, taille: l.taille })),
      ...d.ronds.map(r => this.app.nouvelleFigure({ type: 'cercle', x: r.c.x, y: r.c.y, r: r.r }, { couleur: r.couleur ?? this.app.couleur, taille: r.taille })),
    ]
  }

  /** Pose le dessin sur la page, en objets ordinaires du même groupe */
  private poserDessin(page: string, d: Dessin, groupe: string): { ids: string[]; cercle: string | null } {
    const ids: string[] = []
    let cercle: string | null = null
    const poser = (f: Forme) => { f.groupe = groupe; this.app.tableau.poser(page, f); ids.push(f.id) }
    for (const r of d.ronds) {
      const f = this.app.nouvelleFigure({ type: 'cercle', x: r.c.x, y: r.c.y, r: r.r }, { couleur: r.couleur ?? this.app.couleur, taille: r.taille })
      poser(f)
      cercle ??= f.id
    }
    for (const l of d.lignes) {
      const f = this.app.nouvelleFigure({ type: 'polygone', ferme: false, pts: l.pts }, { couleur: l.couleur ?? this.app.couleur, taille: l.taille })
      if (l.tirets) f.tirets = true
      if (l.fleche) f.stylePoints = l.pts.map((_, i) => i === l.pts.length - 1 ? { bout: 'fleche' as const } : null)
      poser(f)
    }
    for (const m of d.points) {
      const f = this.app.nouvelleFigure({ type: 'polygone', ferme: false, pts: [m.p] }, { couleur: m.couleur ?? this.app.couleur, taille: 3 })
      f.stylePoints = [{ marque: 'point' }]
      poser(f)
    }
    for (const e of d.etiquettes) {
      const latex = e.latex ?? texteEnLatex(e.texte)
      const t = this.outils.mesurer(latex, e.taille)
      const f: Formule = { id: uid(), type: 'formule', x: e.p.x - t.l / 2, y: e.p.y - t.h / 2, latex, couleur: e.couleur ?? this.app.couleur, taille: e.taille, z: Date.now(), auteur: this.app.tableau.moi }
      poser(f)
    }
    return { ids, cercle }
  }

  private poserCercle() {
    if (!this.outils.peutPoser()) return
    const { cercle, degres } = this.reg
    this.outils.placer(w => this.fantomes(cercleTrigo(w, cercle, degres)), w => {
      this.app.tableau.nouveauGeste()
      this.app.tableau.noterActivite(this.app.page, 'dessin', 'Le cercle trigonométrique')
      this.poserDessin(this.app.page, cercleTrigo(w, cercle, degres), uid())
      this.outils.message(`Cercle trigonométrique posé (rayon ${RAYON_CERCLE / 40} cm à 100 %).`)
    })
  }

  private poserCourbes() {
    if (!this.outils.peutPoser()) return
    const quoi = this.reg.courbes
    this.outils.placer(w => this.fantomes(courbesTrigo(w, quoi)), w => {
      this.app.tableau.nouveauGeste()
      this.app.tableau.noterActivite(this.app.page, 'dessin', quoi === 'les-deux' ? 'Les courbes de cos et sin' : `La courbe de ${quoi}`)
      this.poserDessin(this.app.page, courbesTrigo(w, quoi), uid())
      this.outils.message('Courbes posées.')
    })
  }

  private poserFiche(d: Demonstration) {
    this.outils.poserDemo(ficheAvecTrous(d, this.reg.trous))
  }

  // ---------- L'enroulement ----------
  private reglagesEnroulement() {
    return { reperes: this.reg.reperes, deuxSens: this.reg.deuxSens, reels: lireReels(this.reg.reels).reels }
  }

  private poserEnroulement() {
    if (!this.outils.peutPoser()) return
    this.terminer()
    this.outils.placer(w => this.fantomes(enroulement(w, 0, this.reglagesEnroulement())), w => {
      this.anim = { page: this.app.page, o: w, r: RAYON_ENROULEMENT, s: 0, joue: false, groupe: uid(), ids: [], cercle: null, boucle: 0, avant: 0, glisse: false }
      this.app.tableau.nouveauGeste()
      this.app.tableau.noterActivite(this.app.page, 'dessin', 'L\'enroulement de la droite des réels')
      this.fixer()
      this.outils.enroulementPose()
      this.afficher()
      this.outils.message('Enroulement posé : Espace pour lancer ou arrêter, ← et → pour avancer pas à pas.')
    })
  }

  /** Pose l'état présent sur sa page */
  private fixer() {
    const a = this.anim
    if (!a) return
    const r = this.poserDessin(a.page, enroulement(a.o, a.s, this.reglagesEnroulement(), a.r), a.groupe)
    a.ids = r.ids; a.cercle = r.cercle
  }

  /** Retire l'état posé (avant de le refaire). Si le cercle posé a été
   *  déplacé ou agrandi, on suit ; s'il n'est plus là (effacé, annulé),
   *  l'enroulement s'arrête : rend faux. */
  private retirer(): boolean {
    const a = this.anim
    if (!a) return false
    const formes = this.app.tableau.formesDe(a.page)
    const c = a.cercle ? formes?.get(a.cercle) : undefined
    if (!c || c.type !== 'cercle') {
      this.anim = null
      this.app.rendu.dessinAnime = null
      this.afficher()
      this.outils.message('L\'enroulement n\'est plus sur la page : posez-le à nouveau.')
      return false
    }
    a.o = { x: c.x, y: c.y }; a.r = c.r
    const la = a.ids.filter(id => formes!.has(id))
    if (la.length) this.app.tableau.supprimer(a.page, la)
    a.ids = []
    return true
  }

  /** Refait l'état posé : un réglage a changé, ou un pas */
  private refaire() {
    const a = this.anim
    if (!a || a.joue) return
    if (!this.outils.peutPoser()) return
    this.app.tableau.nouveauGeste()
    if (!this.retirer()) return
    this.fixer()
    this.afficher()
  }

  private peindre(c: CanvasRenderingContext2D) {
    const a = this.anim
    if (!a || a.page !== this.app.page || a.ids.length) return
    peindreDessin(c, enroulement(a.o, a.s, this.reglagesEnroulement(), a.r), this.app.couleur)
  }

  lectureOuPause() {
    const a = this.anim
    if (!a) return
    if (a.joue) return this.pause()
    if (a.page !== this.app.page) { this.outils.message('L\'enroulement est sur une autre page.'); return }
    if (!this.outils.peutPoser()) return
    if (a.s >= UN_TOUR - 1e-9) a.s = 0
    // Toute la lecture, du départ à l'arrêt, ne fait qu'un Ctrl + Z
    this.app.tableau.gesteLong()
    if (!this.retirer()) { this.app.tableau.finGesteLong(); return }
    a.joue = true; a.avant = 0
    this.app.rendu.dessinAnime = c => this.peindre(c)
    const image = (t: number) => {
      if (!this.anim?.joue) return
      const dt = a.avant ? Math.min(64, t - a.avant) : 0
      a.avant = t
      a.s = Math.min(UN_TOUR, a.s + UN_TOUR * dt / (this.reg.duree * 1000))
      this.app.rendu.redessinerDirect()
      this.afficher()
      if (a.s >= UN_TOUR) { this.pause(); return }
      a.boucle = requestAnimationFrame(image)
    }
    a.boucle = requestAnimationFrame(image)
    this.afficher()
  }

  /** L'arrêt : ce qu'on voit est posé sur la page */
  private pause() {
    const a = this.anim
    if (!a || !a.joue) return
    cancelAnimationFrame(a.boucle)
    a.joue = false
    this.fixer()
    this.app.tableau.finGesteLong()
    this.app.rendu.dessinAnime = null
    this.app.rendu.redessinerDirect()
    this.afficher()
  }

  pas(sens: 1 | -1) {
    const a = this.anim
    if (!a) return
    if (a.joue) this.pause()
    // Un pas tombe sur un multiple de π/12 (π/6, π/4, π/3… y passent)
    const k = Math.round(a.s / PAS * 1e6) / 1e6
    this.aller((sens > 0 ? Math.floor(k) + 1 : Math.ceil(k) - 1) * PAS)
  }

  private aller(s: number) {
    const a = this.anim
    if (!a) return
    if (a.joue) this.pause()
    a.s = Math.max(0, Math.min(UN_TOUR, s))
    this.refaire()
  }

  /** On tient le curseur : l'écran suit, rien n'est posé avant qu'on le lâche */
  private glisser(s: number) {
    const a = this.anim
    if (!a) return
    if (a.joue) this.pause()
    if (!a.glisse) {
      if (a.page !== this.app.page || !this.outils.peutPoser()) { this.afficher(); return }
      this.app.tableau.gesteLong()
      if (!this.retirer()) { this.app.tableau.finGesteLong(); return }
      a.glisse = true
      this.app.rendu.dessinAnime = c => this.peindre(c)
    }
    a.s = s
    this.app.rendu.redessinerDirect()
    this.afficher()
  }

  private lacher() {
    const a = this.anim
    if (!a?.glisse) return
    a.glisse = false
    this.fixer()
    this.app.tableau.finGesteLong()
    this.app.rendu.dessinAnime = null
    this.app.rendu.redessinerDirect()
    this.afficher()
  }

  /** On lâche le pilotage : la figure reste telle quelle sur la page */
  terminer() {
    const a = this.anim
    if (!a) return
    if (a.joue) this.pause()
    if (a.glisse) this.lacher()
    this.anim = null
    this.afficher()
  }
}

// ---------- Peindre un dessin à l'écran (pendant l'animation) ----------
/** Comme le tableau peindra les objets posés : traits, cercles, points, et
 *  les étiquettes (une fraction « a/b » s'écrit en fraction). encre : la
 *  couleur du professeur, pour ce qui n'en a pas. */
export function peindreDessin(c: CanvasRenderingContext2D, d: Dessin, encre: string) {
  c.lineCap = 'round'; c.lineJoin = 'round'
  for (const r of d.ronds) {
    c.strokeStyle = r.couleur ?? encre; c.lineWidth = r.taille
    c.beginPath(); c.arc(r.c.x, r.c.y, r.r, 0, 2 * Math.PI); c.stroke()
  }
  for (const l of d.lignes) {
    c.strokeStyle = l.couleur ?? encre; c.lineWidth = l.taille
    c.setLineDash(l.tirets ? [l.taille * 3, l.taille * 2.5] : [])
    c.beginPath(); l.pts.forEach((p, i) => i ? c.lineTo(p.x, p.y) : c.moveTo(p.x, p.y)); c.stroke()
    c.setLineDash([])
    if (l.fleche && l.pts.length > 1) {
      const b = l.pts[l.pts.length - 1], a = l.pts[l.pts.length - 2], t = Math.atan2(b.y - a.y, b.x - a.x), k = 6 + l.taille * 3
      c.beginPath(); c.moveTo(b.x - k * Math.cos(t - 0.45), b.y - k * Math.sin(t - 0.45)); c.lineTo(b.x, b.y); c.lineTo(b.x - k * Math.cos(t + 0.45), b.y - k * Math.sin(t + 0.45)); c.stroke()
    }
  }
  for (const m of d.points) {
    c.fillStyle = m.couleur ?? encre
    c.beginPath(); c.arc(m.p.x, m.p.y, 4.5, 0, 2 * Math.PI); c.fill()
  }
  c.textAlign = 'center'; c.textBaseline = 'middle'
  for (const e of d.etiquettes) {
    const couleur = e.couleur ?? encre
    c.fillStyle = couleur; c.strokeStyle = couleur
    const police = (t: number) => `${t}px "KaTeX_Main", "Times New Roman", serif`
    const f = e.texte.match(/^(−?)([^/()]+)\/([^/()]+)$/)
    if (!f) { c.font = police(e.taille); c.fillText(e.texte, e.p.x, e.p.y); continue }
    const t = e.taille * 0.8
    c.font = police(t)
    const l = Math.max(c.measureText(f[2]).width, c.measureText(f[3]).width) + 4
    const s = f[1] ? c.measureText('−').width + 3 : 0
    const x = e.p.x + s / 2
    c.fillText(f[2], x, e.p.y - t * 0.58); c.fillText(f[3], x, e.p.y + t * 0.62)
    c.lineWidth = 1.3
    c.beginPath(); c.moveTo(x - l / 2, e.p.y); c.lineTo(x + l / 2, e.p.y); c.stroke()
    if (f[1]) c.fillText('−', x - l / 2 - s / 2, e.p.y)
  }
}
