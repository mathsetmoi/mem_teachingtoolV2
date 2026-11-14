// =============================================================
// TRACER UNE FONCTION : LE PANNEAU « COURBES » ET LE REPÈRE POSÉ (lot 27)
// Le bouton « Courbe » de la famille Insérer (touche Y) ouvre ce panneau, à
// droite, à la place du catalogue. On y tape f(x) au clavier (jusqu'à
// quatre courbes), les lettres autres que x deviennent des curseurs, on
// règle la fenêtre, le point M (ses pointillés vers les axes) et la
// tangente. Des modèles tout prêts : lycée (fonctions de référence, second
// degré) et 3e (fonctions affines).
//
// Le repère posé est fait d'objets ordinaires du tableau (des lignes, des
// points, des formules), groupés : on le déplace, on l'agrandit, on écrit
// dessus, et le replay des élèves le montre, même le lecteur d'avant.
// L'axe des abscisses garde la recette (champ facultatif `courbes`) : un
// repère pris à la Sélection se modifie depuis le panneau, même déplacé ou
// agrandi, même dans une autre séance.
//
// Quand on tape ou qu'on bouge un curseur, le repère n'est peint qu'à
// l'écran ; à chaque arrêt (le curseur lâché, la frappe finie), ce qu'on
// voit est posé sur la page : le replay montre ces arrêts, pas le
// mouvement (le choix du professeur). Chaque arrêt fait un Ctrl + Z.
// Le calcul est dans calcul.ts.
// =============================================================
import katex from 'katex'
import type { App } from '../app'
import type { P } from '../construction'
import type { Figure, Forme, Formule, Polygone } from '../types'
import { uid } from '../types'
import { sommetsDe } from '../formes'
import { peindreDessin } from '../catalogue-trigo'
import type { Dessin } from '../trigonometrie'
import { texteEnLatex } from '../trigonometrie'
import type { LigneAxe, Modele, RecetteCourbes } from './calcul'
import {
  ajusterFenetre, coinDepuisAxe, COULEURS_COURBES, dessinCourbes, lettresDe, lire, lireRecette, MAX_COURBES, MODELES,
  NOMS_FONCTIONS, nombreFr, recetteParDefaut,
} from './calcul'

const html = (t: string) => t.replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]!))
const CLE_REGLAGES = 'mem-courbes'
/** L'encre des axes et des nombres : le noir du tableau (blanc en mode nuit) */
const ENCRE = '#1b2230'
/** Après la dernière frappe, ou un curseur tenu immobile, on pose */
const ATTENTE_FRAPPE = 800, ATTENTE_CURSEUR = 500

/** Ce que le panneau emprunte au catalogue : mesurer une formule, suivre
 *  le pointeur jusqu'au clic, savoir si l'on peut poser, dire un message */
export interface OutilsCourbes {
  mesurer(latex: string, taille: number): { l: number; h: number }
  placer(fantomes: (w: P) => Figure[], poser: (w: P) => void): void
  peutPoser(): boolean
  message(t: string): void
}

/** Le repère que le panneau modifie */
interface Actif {
  page: string
  groupe: string
}

export class Courbes {
  private panneau: HTMLDivElement
  private r: RecetteCourbes = recetteParDefaut()
  private onglet: 'lycee' | 'college' = 'lycee'
  private actif: Actif | null = null
  /** On tape, ou l'on tient un curseur : le repère n'est que peint */
  private enCours: { o: P; k: number; avaitSelection: boolean } | null = null
  private minuteur = 0
  /** Les bornes des curseurs, par lettre (dans le panneau seulement) */
  private bornes: Record<string, { min: number; max: number }> = {}

  constructor(private app: App, racine: HTMLElement, private outils: OutilsCourbes) {
    this.panneau = document.createElement('div')
    this.panneau.className = 'panneau-catalogue panneau-courbes'
    this.panneau.setAttribute('role', 'dialog')
    this.panneau.setAttribute('aria-label', 'Courbes')
    this.panneau.hidden = true
    racine.appendChild(this.panneau)
    try {
      const v = JSON.parse(localStorage.getItem(CLE_REGLAGES) ?? 'null')
      const r = lireRecette(v?.recette)
      if (r) this.r = r
      if (v?.onglet === 'college' || v?.onglet === 'lycee') this.onglet = v.onglet
    } catch { /* navigateur sans mémoire */ }
  }

  get ouvert() { return !this.panneau.hidden }

  ouvrir() {
    this.panneau.hidden = false
    this.actif = null
    this.suivreSelection(true)
    this.construire()
  }

  fermer() {
    if (this.app.placement) this.app.echap()
    this.poserMaintenant()
    this.actif = null
    this.panneau.hidden = true
  }

  private garder() {
    try { localStorage.setItem(CLE_REGLAGES, JSON.stringify({ recette: this.r, onglet: this.onglet })) } catch { /* navigateur sans mémoire */ }
  }

  // ---------- Le repère pris à la Sélection ----------
  /** Le repère d'un groupe sur une page : son axe (qui porte la recette) et
   *  ce qui a été posé avec lui */
  private repere(page: string, groupe: string): { axe: Polygone; recette: RecetteCourbes; ids: string[] } | null {
    const formes = this.app.tableau.formesDe(page)
    if (!formes) return null
    let axe: Polygone | null = null, recette: RecetteCourbes | null = null
    const ids: string[] = []
    formes.forEach(f => {
      if (f.groupe !== groupe) return
      // L'écriture du professeur (des traits) reste : seul ce que l'outil a
      // posé est refait
      if (f.type === 'polygone' || f.type === 'formule' || f.type === 'cercle') ids.push(f.id)
      if (!axe && f.type === 'polygone' && f.courbes) { const r = lireRecette(f.courbes); if (r) { axe = f; recette = r } }
    })
    return axe && recette ? { axe, recette, ids } : null
  }

  /** Un repère vient d'être pris à la Sélection : le panneau le modifie.
   *  Appelée à chaque mise à jour de l'interface ; ne fait rien si rien n'a
   *  changé. */
  suivreSelection(force = false) {
    if (!this.ouvert && !force) return
    const a = this.actif
    if (a && a.page !== this.app.page) { this.poserMaintenant(); this.actif = null; this.afficherEtat() }
    if (this.enCours) return
    // Le repère modifié a changé sans le panneau (Ctrl + Z, Ctrl + Y) : le
    // panneau le suit
    if (this.actif) {
      const rep = this.repere(this.actif.page, this.actif.groupe)
      if (rep && JSON.stringify(rep.recette) !== JSON.stringify(this.r)) { this.r = rep.recette; if (!force) this.construire() }
    }
    if (this.app.selection.size === 0) return
    const formes = this.app.tableau.formesDe(this.app.page)
    if (!formes) return
    let groupe: string | null = null
    for (const id of this.app.selection) { const f = formes.get(id); if (f?.groupe) { groupe = f.groupe; break } }
    if (!groupe || groupe === this.actif?.groupe) return
    const rep = this.repere(this.app.page, groupe)
    if (!rep) return
    this.actif = { page: this.app.page, groupe }
    this.r = rep.recette
    if (!force) this.construire()
  }

  // ---------- Le panneau ----------
  private construire() {
    const p = this.panneau
    const modeles = MODELES[this.onglet]
    p.innerHTML = `
      <div class="tete"><h2>Courbes</h2><button type="button" class="fermer" title="Fermer" aria-label="Fermer">×</button></div>
      <div class="onglets" role="group" aria-label="Modèles">
        <button type="button" class="onglet" data-onglet="lycee" aria-pressed="${this.onglet === 'lycee'}">Lycée</button>
        <button type="button" class="onglet" data-onglet="college" aria-pressed="${this.onglet === 'college'}">3e</button>
      </div>
      <div class="modeles">${modeles.map((m, i) => `<button type="button" class="secondaire modele" data-modele="${i}" title="Poser ce repère sur la page">${html(m.nom)}</button>`).join('')}</div>
      <section class="element liste-courbes"></section>
      <section class="element curseurs-courbes"></section>
      <section class="element">
        <div class="ligne-titre"><h3>Fenêtre</h3><button type="button" class="lien ajuster">Ajuster aux courbes</button></div>
        <div class="fenetre-courbes">
          <label>x de <input type="number" step="any" data-fenetre="0"></label><label>à <input type="number" step="any" data-fenetre="1"></label>
          <label>y de <input type="number" step="any" data-fenetre="2"></label><label>à <input type="number" step="any" data-fenetre="3"></label>
        </div>
      </section>
      <section class="element options-courbes">
        <label class="coche"><input type="checkbox" data-option="point"> Point M sur la courbe, avec ses pointillés vers les axes</label>
        <div class="curseur-courbes point-x"><b>x</b><input type="range" class="x0" aria-label="Abscisse du point M"><input type="number" step="any" class="x0-valeur" aria-label="Abscisse du point M"></div>
        <label class="coche"><input type="checkbox" data-option="tangente"> Tangente en M, avec son équation</label>
        <label class="coche"><input type="checkbox" data-option="noms"> Nommer les courbes (C<sub>f</sub>, C<sub>g</sub>…)</label>
        <label class="coche"><input type="checkbox" data-option="grille"> Quadrillage</label>
      </section>
      <section class="element pied-courbes">
        <p class="note etat-courbes" role="status"></p>
        <button type="button" class="principal poser-repere"></button>
      </section>`
    const q = <T extends HTMLElement>(s: string) => p.querySelector(s) as T
    q('.fermer').addEventListener('click', () => this.app.ui.basculerCourbes())
    p.querySelectorAll<HTMLButtonElement>('[data-onglet]').forEach(b => b.addEventListener('click', () => {
      this.onglet = b.dataset.onglet as 'lycee' | 'college'; this.garder(); this.construire()
    }))
    p.querySelectorAll<HTMLButtonElement>('[data-modele]').forEach(b => b.addEventListener('click', () => this.poserModele(modeles[Number(b.dataset.modele)])))
    q('.ajuster').addEventListener('click', () => {
      const y = ajusterFenetre(this.r)
      if (!y) { this.outils.message('Aucune courbe à montrer : vérifiez les écritures.'); return }
      this.r.fenetre = [this.r.fenetre[0], this.r.fenetre[1], y[0], y[1]]
      this.majFenetre(); this.changer(true)
    })
    p.querySelectorAll<HTMLInputElement>('[data-fenetre]').forEach(i => i.addEventListener('change', () => {
      const v = Number(i.value.replace(',', '.')), w = this.r.fenetre.slice() as RecetteCourbes['fenetre']
      if (!i.value || !Number.isFinite(v)) { this.majFenetre(); return }
      w[Number(i.dataset.fenetre)] = v
      if (w[0] >= w[1] || w[2] >= w[3]) { this.outils.message('Le début de la fenêtre doit être avant sa fin.'); this.majFenetre(); return }
      this.r.fenetre = w
      this.majPointX(); this.changer(true)
    }))
    p.querySelectorAll<HTMLInputElement>('[data-option]').forEach(i => {
      const k = i.dataset.option as 'point' | 'tangente' | 'noms' | 'grille'
      i.checked = this.r[k]
      i.addEventListener('change', () => { this.r[k] = i.checked; this.majPointX(); this.changer(true) })
    })
    const x0 = q<HTMLInputElement>('.x0'), x0v = q<HTMLInputElement>('.x0-valeur')
    x0.addEventListener('input', () => { this.r.x0 = Number(x0.value); x0v.value = String(this.r.x0); this.changer(false, ATTENTE_CURSEUR) })
    x0.addEventListener('change', () => this.poserMaintenant())
    x0v.addEventListener('change', () => {
      const v = Number(x0v.value.replace(',', '.'))
      if (!Number.isFinite(v)) return
      this.r.x0 = Math.min(Math.max(v, this.r.fenetre[0]), this.r.fenetre[1]); this.majPointX(); this.changer(true)
    })
    q('.poser-repere').addEventListener('click', () => this.poserNouveau())
    this.majListe()
    this.majCurseurs()
    this.majFenetre()
    this.majPointX()
    this.afficherEtat()
  }

  /** Les courbes : f(x) = …, sa formule bien écrite dessous */
  private majListe() {
    const s = this.panneau.querySelector('.liste-courbes') as HTMLElement
    s.innerHTML = `<h3>Fonctions</h3>` + this.r.fonctions.map((t, i) => `
      <div class="courbe" data-courbe="${i}">
        <div class="ligne-courbe"><span class="pastille-courbe" style="background:${COULEURS_COURBES[i]}"></span>
          <label class="nom-courbe" for="courbe-${i}">${NOMS_FONCTIONS[i]}(x) =</label>
          <input type="text" id="courbe-${i}" class="ecriture" spellcheck="false" autocomplete="off" value="${html(t)}" placeholder="x^2">
          ${this.r.fonctions.length > 1 ? `<button type="button" class="retirer" title="Retirer ${NOMS_FONCTIONS[i]}" aria-label="Retirer ${NOMS_FONCTIONS[i]}">×</button>` : ''}
        </div>
        <div class="lu-courbe"></div>
      </div>`).join('') +
      (this.r.fonctions.length < MAX_COURBES ? `<button type="button" class="lien ajouter-courbe">+ Ajouter une courbe</button>` : '') +
      `<p class="note">Par exemple : 2x+1, x^2, a(x-α)^2+β, 1/x, racine(x), |x|. Les lettres autres que x deviennent des curseurs.</p>`
    s.querySelectorAll<HTMLElement>('.courbe').forEach(d => {
      const i = Number(d.dataset.courbe)
      const champ = d.querySelector('input') as HTMLInputElement
      this.majLu(i)
      champ.addEventListener('input', () => {
        this.r.fonctions[i] = champ.value
        this.majLu(i)
        this.majCurseurs()
        this.changer(false, ATTENTE_FRAPPE)
      })
      champ.addEventListener('keydown', e => { if (e.key === 'Enter') { e.preventDefault(); this.poserMaintenant() } })
      champ.addEventListener('blur', () => this.poserMaintenant())
      d.querySelector('.retirer')?.addEventListener('click', () => {
        this.r.fonctions.splice(i, 1); this.majListe(); this.majCurseurs(); this.changer(true)
      })
    })
    s.querySelector('.ajouter-courbe')?.addEventListener('click', () => {
      this.r.fonctions.push(this.r.fonctions.length === 1 ? '2x+1' : 'x')
      this.majListe(); this.majCurseurs(); this.changer(true)
      const champs = s.querySelectorAll<HTMLInputElement>('.ecriture')
      const c = champs[champs.length - 1]
      c?.focus(); c?.select()
    })
  }

  private majLu(i: number) {
    const d = this.panneau.querySelector(`[data-courbe="${i}"]`)
    if (!d) return
    const lu = d.querySelector('.lu-courbe') as HTMLElement, champ = d.querySelector('input') as HTMLInputElement
    const l = lire(this.r.fonctions[i])
    champ.classList.toggle('faux', !l.ok)
    champ.setAttribute('aria-invalid', String(!l.ok))
    if (l.ok) katex.render(`${NOMS_FONCTIONS[i]}(x) = ${l.latex}`, lu, { throwOnError: false })
    else lu.textContent = l.erreur
    lu.classList.toggle('erreur', !l.ok)
  }

  /** Les curseurs : une ligne par lettre, refaite seulement si les lettres
   *  changent (sinon un curseur tenu se lâcherait) */
  private majCurseurs() {
    const s = this.panneau.querySelector('.curseurs-courbes') as HTMLElement
    const lettres = lettresDe(this.r)
    for (const l of lettres) if (!(l in this.r.curseurs)) this.r.curseurs[l] = 1
    for (const l of Object.keys(this.r.curseurs)) if (!lettres.includes(l)) delete this.r.curseurs[l]
    if (s.dataset.lettres === lettres.join(',')) return
    s.dataset.lettres = lettres.join(',')
    s.hidden = !lettres.length
    s.innerHTML = `<h3>Curseurs</h3>` + lettres.map(l => {
      const v = this.r.curseurs[l], b = this.bornesDe(l, v)
      return `<div class="curseur-courbes" data-lettre="${html(l)}"><b>${html(l)}</b>
        <input type="range" min="${b.min}" max="${b.max}" step="0.1" value="${v}" aria-label="Valeur de ${html(l)}">
        <input type="number" step="any" value="${v}" aria-label="Valeur de ${html(l)}"></div>`
    }).join('') + `<p class="note">De −5 à 5 par pas de 0,1 ; tapez une valeur pour aller plus loin. À chaque arrêt, le repère est posé sur la page.</p>`
    s.querySelectorAll<HTMLElement>('.curseur-courbes').forEach(d => {
      const l = d.dataset.lettre!
      const [glisse, champ] = d.querySelectorAll('input') as unknown as [HTMLInputElement, HTMLInputElement]
      glisse.addEventListener('input', () => { this.r.curseurs[l] = Number(glisse.value); champ.value = glisse.value; this.changer(false, ATTENTE_CURSEUR) })
      glisse.addEventListener('change', () => this.poserMaintenant())
      champ.addEventListener('change', () => {
        const v = Number(champ.value.replace(',', '.'))
        if (!champ.value || !Number.isFinite(v) || Math.abs(v) > 1e6) { champ.value = String(this.r.curseurs[l]); return }
        this.r.curseurs[l] = v
        const b = this.bornesDe(l, v)
        glisse.min = String(b.min); glisse.max = String(b.max); glisse.value = String(v)
        this.changer(true)
      })
    })
  }

  private bornesDe(l: string, v: number) {
    const b = this.bornes[l] ?? { min: -5, max: 5 }
    if (v < b.min) b.min = Math.floor(v)
    if (v > b.max) b.max = Math.ceil(v)
    return (this.bornes[l] = b)
  }

  private majFenetre() {
    this.panneau.querySelectorAll<HTMLInputElement>('[data-fenetre]').forEach(i => { i.value = String(this.r.fenetre[Number(i.dataset.fenetre)]) })
  }

  private majPointX() {
    const [x0, x1] = this.r.fenetre
    this.r.x0 = Math.min(Math.max(this.r.x0, x0), x1)
    const d = this.panneau.querySelector('.point-x') as HTMLElement
    if (!d) return
    d.hidden = !this.r.point && !this.r.tangente
    const glisse = d.querySelector('.x0') as HTMLInputElement, champ = d.querySelector('.x0-valeur') as HTMLInputElement
    const pas = (x1 - x0) <= 20 ? 0.1 : (x1 - x0) / 200
    glisse.min = String(x0); glisse.max = String(x1); glisse.step = String(pas); glisse.value = String(this.r.x0)
    champ.value = String(Math.round(this.r.x0 * 1000) / 1000)
  }

  private afficherEtat() {
    const etat = this.panneau.querySelector('.etat-courbes')
    const bouton = this.panneau.querySelector('.poser-repere')
    if (!etat || !bouton) return
    const a = this.actif
    etat.textContent = a
      ? 'Vous modifiez le repère de la page : il change à chaque arrêt. Prenez un autre repère à la Sélection pour le modifier.'
      : 'Choisissez un modèle, ou réglez le repère, puis posez-le sur la page.'
    bouton.textContent = a ? 'Poser un nouveau repère' : 'Poser le repère'
  }

  // ---------- Poser ----------
  /** Les objets d'un dessin, pour le voir suivre le pointeur */
  private fantomes(d: Dessin): Figure[] {
    return d.lignes.filter(l => l.couleur !== '#d4dce8').map(l => this.app.nouvelleFigure({ type: 'polygone', ferme: false, pts: l.pts }, { couleur: l.couleur ?? ENCRE, taille: l.taille }))
  }

  private poserModele(m: Modele) {
    this.poserMaintenant()
    const r = this.r
    this.r = { ...r, fonctions: m.fonctions.slice(), fenetre: m.fenetre.slice() as RecetteCourbes['fenetre'], curseurs: { ...(m.curseurs ?? {}) }, point: false, tangente: false, x0: (m.fenetre[0] + m.fenetre[1]) / 2 + (m.fenetre[1] - m.fenetre[0]) / 5 }
    this.x0Rond()
    this.actif = null
    this.construire()
    this.garder()
    this.poserNouveau()
  }

  private x0Rond() { this.r.x0 = Math.round(this.r.x0 * 10) / 10 }

  /** Le repère suit le pointeur ; un clic le pose (son coin haut gauche à
   *  gauche du pointeur, le pointeur au milieu) */
  private poserNouveau() {
    if (!this.outils.peutPoser()) return
    this.poserMaintenant()
    const r: RecetteCourbes = JSON.parse(JSON.stringify(this.r))
    const coin = (w: P): P => ({ x: w.x - 300, y: w.y - 225 })
    this.outils.placer(w => this.fantomes(dessinCourbes(coin(w), r)), w => {
      const groupe = uid()
      this.app.tableau.nouveauGeste()
      this.app.tableau.noterActivite(this.app.page, 'dessin', r.fonctions.length > 1 ? 'Un repère et ses courbes' : 'Une courbe')
      this.poserDessin(this.app.page, dessinCourbes(coin(w), r), groupe, r)
      this.actif = { page: this.app.page, groupe }
      this.r = r
      this.afficherEtat()
      this.garder()
      this.outils.message('Repère posé : ce que vous changez dans le panneau le modifie.')
    })
  }

  /** Pose le dessin sur la page, en objets ordinaires du même groupe ;
   *  l'axe des abscisses garde la recette. Rend les identifiants posés. */
  private poserDessin(page: string, d: Dessin, groupe: string, r: RecetteCourbes): string[] {
    const ids: string[] = []
    const poser = (f: Forme) => { f.groupe = groupe; this.app.tableau.poser(page, f); ids.push(f.id) }
    for (const l of d.lignes) {
      const f = this.app.nouvelleFigure({ type: 'polygone', ferme: false, pts: l.pts }, { couleur: l.couleur ?? ENCRE, taille: l.taille }) as Polygone
      if (l.tirets) f.tirets = true
      if (l.fleche) f.stylePoints = l.pts.map((_, i) => i === l.pts.length - 1 ? { bout: 'fleche' as const } : null)
      if ((l as LigneAxe).axe) f.courbes = JSON.parse(JSON.stringify(r))
      poser(f)
    }
    for (const m of d.points) {
      const f = this.app.nouvelleFigure({ type: 'polygone', ferme: false, pts: [m.p] }, { couleur: m.couleur ?? ENCRE, taille: 3 }) as Polygone
      f.stylePoints = [{ marque: 'point' }]
      poser(f)
    }
    for (const e of d.etiquettes) {
      const latex = e.latex ?? texteEnLatex(e.texte)
      const t = this.outils.mesurer(latex, e.taille)
      const f: Formule = { id: uid(), type: 'formule', x: e.p.x - t.l / 2, y: e.p.y - t.h / 2, latex, couleur: e.couleur ?? ENCRE, taille: e.taille, z: Date.now(), auteur: this.app.tableau.moi }
      poser(f)
    }
    return ids
  }

  // ---------- Modifier le repère posé ----------
  /** La recette a changé. Sans repère sur la page, seul le panneau change.
   *  Sinon, le repère est retiré et peint à l'écran ; il est posé de
   *  nouveau tout de suite (immediat), ou après un instant sans changement. */
  private changer(immediat: boolean, attente = ATTENTE_FRAPPE) {
    this.garder()
    const a = this.actif
    if (!a) return
    if (a.page !== this.app.page) { this.actif = null; this.afficherEtat(); return }
    if (!this.enCours) {
      if (!this.outils.peutPoser()) return
      const rep = this.repere(a.page, a.groupe)
      if (!rep) {
        this.actif = null; this.afficherEtat()
        this.outils.message('Ce repère n\'est plus sur la page : posez-en un nouveau.')
        return
      }
      const s = sommetsDe(rep.axe)
      const { o, k } = coinDepuisAxe(s[0], s[s.length - 1], rep.recette)
      // Toute la modification, jusqu'à l'arrêt, ne fait qu'un Ctrl + Z
      this.app.tableau.gesteLong()
      const avaitSelection = rep.ids.some(id => this.app.selection.has(id))
      this.enCours = { o, k, avaitSelection }
      if (avaitSelection) { this.app.selection.clear(); this.app.ui.maj() }
      this.app.tableau.supprimer(a.page, rep.ids)
      this.app.rendu.dessinAnime = c => this.peindre(c)
    }
    this.app.rendu.redessinerDirect()
    clearTimeout(this.minuteur)
    if (immediat) this.poserMaintenant()
    else this.minuteur = window.setTimeout(() => this.poserMaintenant(), attente)
  }

  /** Pendant une modification : le repère peint à l'écran */
  private peindre(c: CanvasRenderingContext2D) {
    const e = this.enCours, a = this.actif
    if (!e || !a || a.page !== this.app.page) return
    peindreDessin(c, dessinCourbes(e.o, this.r, e.k), ENCRE)
  }

  /** L'arrêt : le repère tel qu'on le voit est posé sur sa page */
  poserMaintenant() {
    clearTimeout(this.minuteur)
    const e = this.enCours, a = this.actif
    if (!e) return
    this.enCours = null
    this.app.rendu.dessinAnime = null
    if (a) {
      const ids = this.poserDessin(a.page, dessinCourbes(e.o, this.r, e.k), a.groupe, this.r)
      if (e.avaitSelection && a.page === this.app.page) { this.app.selection.clear(); for (const id of ids) this.app.selection.add(id) }
    }
    this.app.tableau.finGesteLong()
    this.app.rendu.redessinerDirect()
    this.app.ui.maj()
  }
}
