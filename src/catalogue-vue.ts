// =============================================================
// LE PANNEAU DU CATALOGUE
// Le bouton « Catalogue » de la barre du haut l'ouvre, à droite, comme le
// programme de construction. Ce qu'il pose est fait d'objets ordinaires du
// tableau (des figures, des formules), groupés : on le déplace, on
// l'agrandit, on écrit dessus, on le dégroupe ; un Ctrl + Z le retire.
//
// Thème « Ensembles de nombres » :
//  - le dessin des ensembles emboîtés, vide ou avec des nombres ;
//    « Compléter le dessin » range les nombres tapés dans un dessin déjà
//    posé (le dernier, ou celui qui est pris), même déplacé ou agrandi ;
//  - deux démonstrations, posées ligne par ligne (→, Espace, ←).
// =============================================================
import katex from 'katex'
import type { App } from './app'
import type { Boite, Demonstration, Ensemble, Theme } from './catalogue'
import {
  classerNombre, COULEURS, DEMONSTRATIONS, dessinEnsembles, ENSEMBLES, HAUTEUR_DESSIN, LARGEUR_DESSIN,
  LATEX_ENSEMBLE, ligneEnLatex, lireListe, placeDansZone, SYMBOLE, THEMES,
} from './catalogue'
import type { P } from './construction'
import type { Figure, Forme, Formule } from './types'
import { uid } from './types'

const html = (t: string) => t.replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]!))
const CLE_NOMBRES = 'mem-catalogue-nombres'
const CLE_THEME = 'mem-catalogue-theme'

/** Tailles des formules, en unités du tableau, pour un dessin à sa taille */
const TAILLE_NOM = 36, TAILLE_NOMBRE = 24
const TAILLE_TITRE = 22, TAILLE_LIGNE = 19, ECART_LIGNES = 8

/** Un dessin des ensembles trouvé sur la page */
interface DessinPose {
  groupe: string
  ovales: Record<Ensemble, P[]>
  occupe: Boite[]
  deja: Set<string>
  echelle: number
}

/** La démonstration en cours : où elle est, ce que chaque étape a posé */
interface DemoEnCours {
  d: Demonstration
  page: string
  groupe: string
  x: number
  /** Le haut de la prochaine ligne, avant chaque étape (pour revenir) */
  hauts: number[]
  posees: string[][]
}

export class Catalogue {
  private panneau: HTMLDivElement
  private nombres!: HTMLTextAreaElement
  private erreurs!: HTMLDivElement
  private liste!: HTMLOListElement
  private demo: DemoEnCours | null = null
  private theme: Theme = 'nombres'
  private mesureur: HTMLDivElement
  private clavier = (e: KeyboardEvent) => this.touche(e)

  constructor(private app: App, racine: HTMLElement, private message: (t: string) => void) {
    this.panneau = document.createElement('div')
    this.panneau.className = 'panneau-catalogue'
    this.panneau.setAttribute('role', 'dialog')
    this.panneau.setAttribute('aria-label', 'Catalogue')
    this.panneau.hidden = true
    // Hors de l'écran : on y mesure une formule avant de la poser
    this.mesureur = document.createElement('div')
    this.mesureur.className = 'mesure-catalogue'
    this.mesureur.setAttribute('aria-hidden', 'true')
    racine.append(this.panneau, this.mesureur)
    this.construire()
  }

  get ouvert() { return !this.panneau.hidden }

  ouvrir() {
    this.panneau.hidden = false
    window.addEventListener('keydown', this.clavier, true)
    this.afficher()
  }

  fermer() {
    if (this.app.placement) this.app.echap()
    this.panneau.hidden = true
    window.removeEventListener('keydown', this.clavier, true)
    this.demo = null
    this.afficher()
  }

  // ---------- Le panneau ----------
  private construire() {
    const p = this.panneau
    let nombres = ''
    try {
      nombres = localStorage.getItem(CLE_NOMBRES) ?? ''
      const t = localStorage.getItem(CLE_THEME)
      if (THEMES.some(x => x.id === t)) this.theme = t as Theme
    } catch { /* navigateur sans mémoire */ }
    p.innerHTML = `
      <div class="tete"><h2>Catalogue</h2><button type="button" class="fermer" aria-label="Fermer" title="Fermer">×</button></div>
      <label class="exemples"><span>Thème</span><select class="theme" aria-label="Thème">${THEMES.map(t => `<option value="${t.id}">${html(t.nom)}</option>`).join('')}</select></label>
      <section class="element ensembles" data-theme="nombres">
        <h3>Les ensembles ℕ ⊂ ℤ ⊂ 𝔻 ⊂ ℚ ⊂ ℝ</h3>
        <label class="champ"><span>Nombres à ranger (facultatif), séparés par des points-virgules</span>
          <textarea class="nombres" spellcheck="false" rows="3" placeholder="−5 ; 3 ; 2,7 ; 1/3 ; √2 ; π"></textarea></label>
        <div class="actions-construction">
          <button type="button" class="principal poser-dessin">Poser le dessin</button>
          <button type="button" class="secondaire completer" title="Ranger ces nombres dans le dessin déjà posé">Compléter</button>
        </div>
        <div class="erreurs" role="status"></div>
        <p class="note">Chaque nombre va dans le plus petit ensemble qui le contient. On peut écrire 1/3, √2, π, 2,5, 0,333…, 10^-2.</p>
      </section>
      <section class="element">
        <h3>Démonstrations</h3>
        <div class="demos">${DEMONSTRATIONS.map((d, i) => `<button type="button" class="secondaire demo" data-demo="${i}" data-theme="${d.theme}">${html(d.nom)}</button>`).join('')}</div>
        <p class="note aucune-demo">Pas encore de démonstration dans ce thème.</p>
        <ol class="etapes"></ol>
        <div class="commandes" hidden>
          <button type="button" class="secondaire precedente" title="Ligne précédente (←)">◀</button>
          <button type="button" class="principal suivante" title="Ligne suivante (→, Espace)">Suivante ▶</button>
          <button type="button" class="secondaire tout" title="Tout montrer">⏩</button>
        </div>
      </section>`
    const q = <T extends HTMLElement>(s: string) => p.querySelector(s) as T
    this.nombres = q('.nombres'); this.erreurs = q('.erreurs'); this.liste = q('.etapes')
    this.nombres.value = nombres
    this.nombres.addEventListener('input', () => {
      try { localStorage.setItem(CLE_NOMBRES, this.nombres.value) } catch { /* navigateur sans mémoire */ }
    })
    const theme = q<HTMLSelectElement>('.theme')
    theme.value = this.theme
    theme.addEventListener('change', () => {
      this.theme = theme.value as Theme
      try { localStorage.setItem(CLE_THEME, this.theme) } catch { /* navigateur sans mémoire */ }
      this.montrerTheme()
    })
    this.montrerTheme()
    q('.fermer').addEventListener('click', () => this.fermer())
    q('.poser-dessin').addEventListener('click', () => this.poserDessin())
    q('.completer').addEventListener('click', () => this.completer())
    p.querySelectorAll<HTMLButtonElement>('.demo').forEach(b => b.addEventListener('click', () => this.poserDemo(DEMONSTRATIONS[Number(b.dataset.demo)])))
    q('.suivante').addEventListener('click', () => this.suivante())
    q('.precedente').addEventListener('click', () => this.precedente())
    q('.tout').addEventListener('click', () => { while (this.suivante()) { /* jusqu'au bout */ } })
  }

  /** Ne montre que ce qui est rangé dans le thème choisi */
  private montrerTheme() {
    let demos = 0
    this.panneau.querySelectorAll<HTMLElement>('[data-theme]').forEach(e => {
      e.hidden = e.dataset.theme !== this.theme
      if (!e.hidden && e.classList.contains('demo')) demos++
    })
    ;(this.panneau.querySelector('.aucune-demo') as HTMLElement).hidden = demos > 0
  }

  private afficher() {
    const d = this.demo
    const faites = d ? d.posees.length : 0
    this.liste.innerHTML = d ? d.d.etapes.map((e, i) =>
      `<li class="${i < faites ? 'faite' : i === faites ? 'courante' : ''}">${e.map(l => katex.renderToString(ligneEnLatex(l), { throwOnError: false })).join(' ')}</li>`).join('') : ''
    const cmd = this.panneau.querySelector('.commandes') as HTMLElement
    cmd.hidden = !d
    const fini = !!d && faites >= d.d.etapes.length
    const suiv = this.panneau.querySelector('.suivante') as HTMLButtonElement
    suiv.disabled = fini
    suiv.textContent = fini ? 'Démonstration terminée ✓' : 'Suivante ▶'
    ;(this.panneau.querySelector('.precedente') as HTMLButtonElement).disabled = !d || faites === 0
    ;(this.panneau.querySelector('.tout') as HTMLButtonElement).disabled = fini
  }

  private touche(e: KeyboardEvent) {
    if (e.key === 'Escape') {
      if ((e.target as HTMLElement).closest?.('dialog')) return
      e.preventDefault(); e.stopPropagation()
      if (this.app.placement) this.app.echap(); else this.fermer()
      return
    }
    if ((e.target as HTMLElement).closest?.('textarea, input, select, dialog')) return
    // Les flèches ne déroulent la démonstration que si elle est sur cette page
    if (!this.demo || this.demo.page !== this.app.page) return
    const actions: Record<string, () => void> = {
      ArrowRight: () => this.suivante(), PageDown: () => this.suivante(), ' ': () => this.suivante(),
      ArrowLeft: () => this.precedente(), PageUp: () => this.precedente(),
    }
    const a = actions[e.key]
    if (!a || e.ctrlKey || e.metaKey || e.altKey) return
    e.preventDefault(); e.stopPropagation()
    a()
  }

  // ---------- Poser ----------
  private peutPoser(): boolean {
    if (this.app.enLecture) { this.message('Cette séance est passée : elle est en lecture seule.'); return false }
    return true
  }

  /** Le milieu de ce qu'on voit, à gauche du panneau */
  private milieu(): P {
    const r = this.app.rendu
    return this.app.cam.versMonde(Math.max(200, (r.l - 380) / 2), r.h / 2)
  }

  /** Suit le pointeur en transparence ; un clic pose, Échap annule */
  private placer(fantomes: (w: P) => Figure[], poser: (w: P) => void) {
    const r = this.app.rendu
    const fin = () => { r.fantomes = []; r.redessinerDirect() }
    this.app.placement = {
      bouge: w => { r.fantomes = fantomes(w); r.redessinerDirect() },
      clic: w => { fin(); poser(w) },
      annuler: () => fin(),
    }
    this.app.placement.bouge(this.milieu())
    this.message('Cliquez sur la page là où le poser. Échap pour annuler.')
  }

  /** La taille d'une formule à l'écran, en unités du tableau */
  private mesurer(latex: string, taille: number): { l: number; h: number } {
    const el = document.createElement('div')
    el.className = 'formule'
    el.style.fontSize = taille + 'px'
    this.mesureur.appendChild(el)
    katex.render(latex, el, { throwOnError: false, displayMode: false })
    const m = { l: el.offsetWidth || taille * latex.length * 0.5, h: el.offsetHeight || taille * 1.4 }
    el.remove()
    return m
  }

  private formule(latex: string, x: number, y: number, taille: number, couleur: string, groupe: string): Formule {
    return { id: uid(), type: 'formule', x, y, latex, couleur, taille, z: Date.now(), auteur: this.app.tableau.moi, groupe }
  }

  private poser(f: Forme): string {
    this.app.tableau.poser(this.app.page, f)
    return f.id
  }

  // ---------- Les ensembles ----------
  private ovalesFigures(o: P): Figure[] {
    const { ovales } = dessinEnsembles(o)
    return ENSEMBLES.map(e => {
      const f = this.app.nouvelleFigure({ type: 'polygone', ferme: true, pts: ovales[e] })
      f.couleur = COULEURS[e]
      return f
    })
  }

  private poserDessin() {
    if (!this.peutPoser()) return
    const coin = (w: P) => ({ x: w.x - LARGEUR_DESSIN / 2, y: w.y - HAUTEUR_DESSIN / 2 })
    this.placer(w => this.ovalesFigures(coin(w)), w => {
      const o = coin(w)
      const groupe = uid()
      this.app.tableau.nouveauGeste()
      const ovales = this.ovalesFigures(o)
      ovales.forEach(f => { f.groupe = groupe; this.poser(f) })
      const { noms } = dessinEnsembles(o)
      const occupe: Boite[] = []
      for (const e of ENSEMBLES) {
        const m = this.mesurer(LATEX_ENSEMBLE[e], TAILLE_NOM)
        const x = noms[e].x - m.l / 2, y = noms[e].y - m.h / 2
        this.poser(this.formule(LATEX_ENSEMBLE[e], x, y, TAILLE_NOM, COULEURS[e], groupe))
        occupe.push({ x, y, l: m.l, h: m.h })
      }
      const textes = lireListe(this.nombres.value)
      const dessin: DessinPose = { groupe, ovales: dessinEnsembles(o).ovales, occupe, deja: new Set(), echelle: 1 }
      if (textes.length) this.ranger(textes, dessin)
      else { this.erreurs.innerHTML = ''; this.message('Dessin posé. Tapez des nombres, puis « Compléter le dessin ».') }
    })
  }

  /** Le dessin où ranger les nombres : celui qui est pris, sinon le dernier posé sur la page */
  private trouverDessin(): DessinPose | null {
    const formes = [...(this.app.tableau.formesDe(this.app.page)?.values() ?? [])]
    const noms = new Set(Object.values(LATEX_ENSEMBLE))
    const parGroupe = new Map<string, Forme[]>()
    for (const f of formes) if (f.groupe) {
      const l = parGroupe.get(f.groupe)
      if (l) l.push(f); else parGroupe.set(f.groupe, [f])
    }
    const candidats = [...parGroupe.entries()].filter(([, l]) => {
      const vus = new Set(l.filter((f): f is Formule => f.type === 'formule' && noms.has(f.latex)).map(f => f.latex))
      return vus.size === 5 && l.filter(f => f.type === 'polygone' && f.ferme).length >= 5
    })
    if (!candidats.length) return null
    const pris = candidats.find(([, l]) => l.some(f => this.app.selection.has(f.id)))
    const [groupe, membres] = pris ?? candidats.reduce((a, b) => Math.max(...b[1].map(f => f.z)) > Math.max(...a[1].map(f => f.z)) ? b : a)
    // Les cinq plus grands ovales, du plus petit (ℕ) au plus grand (ℝ)
    const aire = (p: P[]) => Math.abs(p.reduce((s, a, i) => { const b = p[(i + 1) % p.length]; return s + a.x * b.y - b.x * a.y }, 0)) / 2
    const polys = membres.filter(f => f.type === 'polygone' && f.ferme)
      .map(f => { const g = f as Extract<Forme, { type: 'polygone' }>; return Array.from({ length: g.pts.length / 2 }, (_, i) => ({ x: g.x + g.pts[2 * i], y: g.y + g.pts[2 * i + 1] })) })
      .sort((a, b) => aire(b) - aire(a)).slice(0, 5).reverse()
    const ovales = Object.fromEntries(ENSEMBLES.map((e, i) => [e, polys[i]])) as Record<Ensemble, P[]>
    const xs = ovales.R.map(p => p.x)
    const echelle = (Math.max(...xs) - Math.min(...xs)) / (LARGEUR_DESSIN - 20)
    const formules = membres.filter((f): f is Formule => f.type === 'formule')
    return {
      groupe, ovales, echelle,
      occupe: formules.map(f => { const m = this.app.mesureFormule(f); return { x: f.x, y: f.y, l: m.l, h: m.h } }),
      deja: new Set(formules.map(f => f.latex)),
    }
  }

  private completer() {
    if (!this.peutPoser()) return
    const textes = lireListe(this.nombres.value)
    if (!textes.length) { this.message('Tapez d\'abord les nombres à ranger, séparés par des points-virgules.'); this.nombres.focus(); return }
    const dessin = this.trouverDessin()
    if (!dessin) { this.message('Aucun dessin des ensembles sur cette page : posez-le d\'abord (« Poser le dessin »).'); return }
    this.app.tableau.nouveauGeste()
    this.ranger(textes, dessin)
  }

  /** Range chaque nombre dans sa zone ; dit ce qui a été fait et ce qui n'a pas pu l'être */
  private ranger(textes: string[], dessin: DessinPose) {
    const ranges: string[] = [], soucis: string[] = []
    const taille = Math.round(TAILLE_NOMBRE * dessin.echelle * 10) / 10
    for (const t of textes) {
      const c = classerNombre(t)
      if ('erreur' in c) { soucis.push(`« ${t} » : je ne sais pas le lire (${c.erreur}).`); continue }
      if (dessin.deja.has(c.latex)) { soucis.push(`« ${t} » est déjà dans le dessin.`); continue }
      const i = ENSEMBLES.indexOf(c.ensemble)
      const m = this.mesurer(c.latex, taille)
      const p = placeDansZone(dessin.ovales[c.ensemble], i ? dessin.ovales[ENSEMBLES[i - 1]] : null, m.l, m.h, dessin.occupe, dessin.echelle)
      if (!p) { soucis.push(`Plus de place pour « ${t} » dans ${SYMBOLE[c.ensemble]} : agrandissez le dessin, puis complétez-le.`); continue }
      const x = p.x - m.l / 2, y = p.y - m.h / 2
      this.poser(this.formule(c.latex, x, y, taille, this.app.couleur, dessin.groupe))
      dessin.occupe.push({ x, y, l: m.l, h: m.h })
      dessin.deja.add(c.latex)
      ranges.push(`${t} dans ${SYMBOLE[c.ensemble]}`)
      if (c.doute) soucis.push(`« ${t} » est rangé dans ℝ : je n'ai pas su dire s'il est rationnel, vérifiez.`)
    }
    this.erreurs.innerHTML = soucis.map(s => `<p>${html(s)}</p>`).join('')
    this.message(ranges.length ? 'Rangés : ' + ranges.join(', ') + '.' : 'Aucun nombre rangé.')
  }

  // ---------- Les démonstrations ----------
  private lignes(d: Demonstration) {
    return {
      titre: { latex: d.titre, ...this.mesurer(d.titre, TAILLE_TITRE) },
      etapes: d.etapes.map(e => e.map(l => { const latex = ligneEnLatex(l); return { latex, ...this.mesurer(latex, TAILLE_LIGNE) } })),
    }
  }

  private poserDemo(d: Demonstration) {
    if (!this.peutPoser()) return
    const m = this.lignes(d)
    const toutes = [m.titre, ...m.etapes.flat()]
    const l = Math.max(...toutes.map(t => t.l))
    const h = m.titre.h + ECART_LIGNES * 2 + m.etapes.flat().reduce((s, t) => s + t.h + ECART_LIGNES, 0)
    const coin = (w: P) => ({ x: w.x - l / 2, y: w.y - h / 2 })
    this.placer(w => {
      const o = coin(w)
      const f = this.app.nouvelleFigure({ type: 'polygone', ferme: true, pts: [o, { x: o.x + l, y: o.y }, { x: o.x + l, y: o.y + h }, { x: o.x, y: o.y + h }] })
      f.tirets = true
      return [f]
    }, w => {
      const o = coin(w)
      const groupe = uid()
      this.app.tableau.nouveauGeste()
      this.poser(this.formule(m.titre.latex, o.x, o.y, TAILLE_TITRE, this.app.couleur, groupe))
      this.demo = { d, page: this.app.page, groupe, x: o.x, hauts: [o.y + m.titre.h + ECART_LIGNES * 2], posees: [] }
      this.afficher()
      this.message('Démonstration posée : → ou Espace pour la ligne suivante, ← pour revenir.')
    })
  }

  /** Pose l'étape suivante ; faux s'il n'y en a plus */
  private suivante(): boolean {
    const d = this.demo
    if (!d || d.page !== this.app.page || d.posees.length >= d.d.etapes.length) return false
    const i = d.posees.length
    let y = d.hauts[i]
    this.app.tableau.nouveauGeste()
    const ids: string[] = []
    for (const l of d.d.etapes[i]) {
      const latex = ligneEnLatex(l), m = this.mesurer(latex, TAILLE_LIGNE)
      ids.push(this.poser(this.formule(latex, d.x, y, TAILLE_LIGNE, this.app.couleur, d.groupe)))
      y += m.h + ECART_LIGNES
    }
    d.posees.push(ids)
    d.hauts.push(y)
    this.afficher()
    return true
  }

  private precedente() {
    const d = this.demo
    if (!d || d.page !== this.app.page || !d.posees.length) return
    const ids = d.posees.pop()!
    d.hauts.pop()
    this.app.tableau.nouveauGeste()
    this.app.tableau.supprimer(this.app.page, ids)
    this.afficher()
  }
}
