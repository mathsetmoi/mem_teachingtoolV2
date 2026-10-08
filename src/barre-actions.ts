// =============================================================
// LA BARRE D'ACTIONS
// Dès qu'un objet ou une sélection est pris (à l'outil Sélection : un
// clic, Maj + clic, un cadre, un lasso, Ctrl + A, ce qu'on vient de
// coller ou de dupliquer ; au doigt qui « déplace » : un toucher), une
// petite barre paraît juste au-dessus : Dupliquer, Copier, Supprimer et
// Options, à portée du doigt, sans clavier ni clic droit (le choix du
// professeur : elle vient tout de suite, sans geste à apprendre). Le
// menu complet (Options, le clic droit, le double-clic) garde tout le
// reste ; la barre ne fait que les gestes de tous les jours.
// Elle ne paraît jamais sous un outil de dessin à la souris ou au
// stylet : au Stylo, à la tablette graphique de la classe, l'écriture
// n'est jamais gênée, et ce qu'on vient de dessiner n'est pas
// sélectionné (lot 1). Elle se cache pendant qu'on déplace, qu'on
// entoure, qu'on pince, quand le menu complet est ouvert (il contient
// tout : un clic droit ouvre ce menu, pas la barre), pendant la revue,
// une séance d'automatismes, un placement, ou quand une fenêtre est
// ouverte. Discrète au vidéoprojecteur : le gris des barres, des
// libellés gris, aucune couleur vive.
// =============================================================
import type { App } from './app'
import type { Forme } from './types'
import type { TypePointeur } from './pointeurs'
import { ecranTactile } from './pointeurs'
import type { Boite } from './revoir/bobine'
import { CTRL } from './navigateur'
import { icone } from './icones'

export type IdAction = 'modifier' | 'dupliquer' | 'copier' | 'supprimer' | 'ajouter' | 'options'

/** Un bouton de la barre : son icône, son libellé court (sous l'icône), son
 *  titre (l'infobulle et le nom lu, avec le raccourci) */
export interface ActionBarre {
  id: IdAction
  icone: string
  libelle: string
  titre: string
  /** Supprimer : rouge au survol seulement */
  danger?: boolean
  /** Ajouter : un interrupteur (aria-pressed), allumé tant que le mode dure */
  interrupteur?: boolean
}

/** Ce que montre la barre, dans l'ordre, selon ce qui est pris (n objets,
 *  une formule seule) et le dernier pointeur. « Modifier » en tête pour une
 *  formule (comme son double-clic) ; « Ajouter » au doigt seulement (la
 *  souris et le stylet ont Maj + clic). Les titres parlent la langue du
 *  pointeur : jamais « clic » au doigt ; le stylet posé sur l'écran (direct,
 *  l'Apple Pencil, qui n'a pas de bouton) a l'appui long, celui d'une
 *  tablette graphique son bouton. */
export function actionsDe(pris: { n: number; formule: boolean }, pointeur: TypePointeur, ctrl = CTRL, direct = ecranTactile()): ActionBarre[] {
  const seul = pris.n === 1, doigt = pointeur === 'touch'
  const l: ActionBarre[] = []
  if (seul && pris.formule) l.push({ id: 'modifier', icone: 'stylo', libelle: 'Modifier', titre: doigt ? 'Modifier la formule' : 'Modifier la formule (double-clic)' })
  l.push({ id: 'dupliquer', icone: 'dupliquer', libelle: 'Dupliquer', titre: `Dupliquer (${ctrl} + D)` })
  l.push({ id: 'copier', icone: 'copier', libelle: 'Copier', titre: `Copier (${ctrl} + C)` })
  l.push({ id: 'supprimer', icone: 'poubelle', libelle: 'Supprimer', titre: seul ? 'Supprimer (Suppr)' : `Supprimer les ${pris.n} objets (Suppr)`, danger: true })
  if (doigt) l.push({ id: 'ajouter', icone: 'plus', libelle: 'Ajouter', titre: 'Ajouter d\'autres objets : touchez-les', interrupteur: true })
  l.push({ id: 'options', icone: 'points', libelle: 'Options',
    titre: pointeur === 'mouse' ? 'Toutes les options (clic droit)'
      : pointeur === 'pen' ? (direct ? 'Toutes les options (appui long)' : 'Toutes les options (bouton du stylet)') : 'Toutes les options' })
  return l
}

/** Un rectangle de la fenêtre (pixels CSS) */
export interface Rect { left: number; top: number; right: number; bottom: number }

/** À 8 px au moins des bords de la fenêtre et des barres ; à 10 px de l'objet */
const MARGE = 8, ECART = 10

/** Où poser la barre (l × h) pour l'objet dont la boîte, à l'écran, est
 *  `objet` (coordonnées de la fenêtre) :
 *  - juste au-dessus, à 10 px, centrée sur lui : elle ne le cache pas ;
 *  - dessous, à 10 px, si le haut passait au-dessus du bas de la barre du
 *    haut (bords.haut, plus 8 px) ;
 *  - si dessous déborde la fenêtre (un objet plus haut que l'écran), en haut
 *    de la zone libre, sous la barre du haut ;
 *  - jamais à gauche du bord droit de la barre d'outils (bords.gauche, plus
 *    8 px), sauf si elle n'y tient pas (un téléphone) : elle passe alors
 *    devant, à 8 px du bord de la fenêtre au moins ;
 *  - toujours dans la fenêtre, à 8 px de ses bords. */
export function placeBarre(objet: Rect, l: number, h: number, bords: { gauche: number; haut: number },
  fenetre: { l: number; h: number }): { left: number; top: number; dessous: boolean } {
  let top = objet.top - ECART - h, dessous = false
  if (top < bords.haut + MARGE) {
    top = objet.bottom + ECART; dessous = true
    if (top + h > fenetre.h - MARGE) { top = bords.haut + MARGE; dessous = false }
  }
  top = Math.max(MARGE, Math.min(top, fenetre.h - h - MARGE))
  const droite = fenetre.l - l - MARGE
  const min = bords.gauche + MARGE <= droite ? bords.gauche + MARGE : MARGE
  const left = Math.max(min, Math.min((objet.left + objet.right) / 2 - l / 2, droite))
  return { left, top, dessous }
}

export class BarreActions {
  readonly el: HTMLDivElement
  /** Ce que montrent les boutons (voir maj) : ils ne se refont que s'il change */
  private cle = ''
  private boutons = new Map<IdAction, HTMLButtonElement>()
  /** Le dernier appui sur la barre était celui d'un stylet qui voulait écrire
   *  (voir appui) : le clic qui le suit ne fait rien */
  private stylet = false

  /** bords : le bord droit de la barre d'outils et le bas de la barre du
   *  haut (pixels de la fenêtre), que la barre ne recouvre pas */
  constructor(private app: App, racine: HTMLElement, private bords: () => { gauche: number; haut: number }) {
    const el = this.el = document.createElement('div')
    el.className = 'barre-actions'
    el.setAttribute('role', 'toolbar')
    el.setAttribute('aria-label', 'Actions sur la sélection')
    el.hidden = true
    // En capture : avant le bouton touché (voir appui)
    el.addEventListener('pointerdown', e => this.appui(e), true)
    racine.appendChild(el)
    // On tourne la tablette : elle reste au-dessus de l'objet
    window.addEventListener('resize', () => this.maj())
  }

  /** La barre se montre-t-elle ? Il faut tout : quelque chose de sélectionné,
   *  aucun morceau de figure choisi (il a son menu), le menu complet fermé
   *  (il contient déjà tout), rien qui bouge (voir App.enMouvement), ni
   *  revue, ni placement, ni séance d'automatismes, ni fenêtre ouverte (une
   *  fenêtre de l'outil, l'éditeur d'une formule) ; et l'outil Sélection en
   *  main, ou le doigt qui « déplace » qui vient de toucher. Sous un outil
   *  de dessin, à la souris ou au stylet, jamais. */
  private visible(): boolean {
    const app = this.app
    if (!app.selection.size || app.partie || app.options !== null) return false
    if (app.enMouvement || app.enLecture || app.placement) return false
    if (document.body.classList.contains('en-seance') || document.querySelector('dialog[open]')) return false
    return app.outil === 'selection' || (app.doigtDeplace && app.dernierPointeur === 'touch')
  }

  /** À chaque mise à jour de l'interface : elle paraît, se cache, suit la vue
   *  et l'objet (un zoom, la molette, la vue déplacée, l'objet posé ailleurs) */
  maj() {
    const app = this.app
    if (!this.visible()) { this.cacher(); return }
    const formes = app.objetsChoisis()
    const b = this.boiteDe(formes)
    if (!b) { this.cacher(); return }
    // Ce qui est pris, à l'écran ; hors de la vue, rien à montrer : on
    // n'agit pas sur ce qu'on ne voit pas
    const z = app.rendu.scene.getBoundingClientRect(), cam = app.cam
    const a = cam.versEcran(b.x, b.y), c = cam.versEcran(b.x + b.l, b.y + b.h)
    const objet: Rect = { left: z.left + a.x, top: z.top + a.y, right: z.left + c.x, bottom: z.top + c.y }
    if (objet.right < z.left || objet.left > z.right || objet.bottom < z.top || objet.top > z.bottom) { this.cacher(); return }

    const seul = app.selection.size === 1 ? formes.find(f => app.selection.has(f.id)) ?? null : null
    const pointeur = app.dernierPointeur
    const cle = `${seul ? seul.type : 'plusieurs'}|${app.selection.size}|${pointeur}`
    if (cle !== this.cle) {
      this.construire(actionsDe({ n: app.selection.size, formule: seul?.type === 'formule' }, pointeur))
      this.cle = cle
    }
    const ajouter = this.boutons.get('ajouter')
    if (ajouter) {
      const oui = app.ajoutTactile
      ajouter.classList.toggle('actif', oui)
      if (ajouter.getAttribute('aria-pressed') !== String(oui)) ajouter.setAttribute('aria-pressed', String(oui))
    }
    this.el.hidden = false
    const p = placeBarre(objet, this.el.offsetWidth, this.el.offsetHeight, this.bords(), { l: window.innerWidth, h: window.innerHeight })
    this.el.style.left = p.left + 'px'
    this.el.style.top = p.top + 'px'
  }

  private cacher() {
    if (!this.el.hidden) this.el.hidden = true
  }

  /** La boîte de ce qui est pris, en monde (avec les points liés à une image).
   *  Une droite compte par ce qu'on en voit, pas par ses deux points : la
   *  barre se pose au-dessus de la droite qu'on a sous les yeux. */
  private boiteDe(formes: Forme[]): Boite | null {
    const app = this.app
    let b = app.boiteDuContenu(formes.filter(f => !(f.type === 'polygone' && f.prolonge)))
    for (const f of formes) {
      if (f.type !== 'polygone' || !f.prolonge) continue
      const d = app.rendu.boite(f)
      b = !b ? d : {
        x: Math.min(b.x, d.x), y: Math.min(b.y, d.y),
        l: Math.max(b.x + b.l, d.x + d.l) - Math.min(b.x, d.x), h: Math.max(b.y + b.h, d.y + d.h) - Math.min(b.y, d.y),
      }
    }
    return b
  }

  private construire(actions: ActionBarre[]) {
    this.el.replaceChildren()
    this.boutons.clear()
    for (const a of actions) {
      const b = document.createElement('button')
      b.type = 'button'
      b.className = `action-barre action-${a.id}` + (a.danger ? ' danger' : '')
      b.innerHTML = icone(a.icone)
      b.appendChild(Object.assign(document.createElement('span'), { className: 'libelle', textContent: a.libelle }))
      b.title = a.titre
      b.setAttribute('aria-label', a.titre)
      if (a.interrupteur) b.setAttribute('aria-pressed', 'false')
      b.addEventListener('click', () => this.agir(a.id))
      this.el.appendChild(b)
      this.boutons.set(a.id, b)
    }
  }

  /** Un bouton : il agit, puis l'interface se remet à jour (la barre passe
   *  sur la copie, part avec ce qu'on supprime, laisse la place au menu
   *  complet ou à l'éditeur de la formule) */
  private agir(id: IdAction) {
    if (this.stylet) return
    const app = this.app
    const seul = app.selection.size === 1 ? app.forme([...app.selection][0]) : null
    switch (id) {
      case 'modifier': if (seul?.type === 'formule') void app.modifierFormule(seul); break
      case 'dupliquer': app.dupliquerSelection(); break
      case 'copier': app.copier(); break
      case 'supprimer': app.supprimerSelection(); break
      case 'ajouter': app.basculerAjout(); break
      case 'options': if (seul) app.ouvrirOptions(seul); else app.ouvrirOptionsSelection(); break
    }
    app.ui.maj()
  }

  /** Un appui sur la barre. Sous un autre outil que la Sélection, elle n'est
   *  là que pour le doigt qui « déplace » : un stylet qui s'y pose veut
   *  écrire (sur l'iPad, le crayon qui commence une lettre juste au-dessus de
   *  l'objet qu'on vient de toucher). Rien ne s'y déclenche : la barre
   *  s'efface et l'appui passe au tableau, qui le capture (voir App.bas),
   *  comme si elle n'avait pas été là. Elle ne vole jamais l'encre. */
  private appui(e: PointerEvent) {
    this.stylet = e.pointerType === 'pen' && this.app.outil !== 'selection'
    if (!this.stylet) return
    e.preventDefault(); e.stopPropagation()
    this.el.hidden = true
    this.app.rendu.scene.parentElement?.dispatchEvent(new PointerEvent('pointerdown', e))
  }
}
