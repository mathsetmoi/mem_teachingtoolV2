// =============================================================
// LES PETITS MENUS FLOTTANTS
// Un menu s'ouvre sous (ou au-dessus de) son bouton : celui du zoom, du
// doigt, du bouton ⋯ ; ou là où l'on a appuyé, sans bouton : le menu de la
// page (un clic droit dans le vide). Un seul est ouvert à la fois : en
// ouvrir un ferme l'autre. Un appui ailleurs le ferme, Échap aussi, et le
// focus qui part ailleurs (Tab, une fenêtre qui s'ouvre) ; cet appui-là ne
// doit rien faire d'autre (pas de point d'encre posé en fermant un menu) :
// « avale » le dit à qui reçoit l'appui ensuite.
// Le balisage est celui des menus du système : role=menu ; des entrées
// <button class=menu-item role=menuitem|menuitemradio|menuitemcheckbox aria-checked>,
// leur raccourci à droite dans <span class=touche>, une aide dessous
// dans <small> ; des <hr class=menu-filet> et des <div class=menu-titre>.
// =============================================================

/** Un menu, et le bouton qui l'ouvre s'il en a un (le menu de la page n'en a
 *  pas : il s'ouvre au clic droit, là où l'on a appuyé) */
export interface Menu { el: HTMLElement; bouton?: HTMLElement; fermer?: () => void }

let ouvert: Menu | null = null
/** L'appui qui vient de fermer un menu (le même événement repasse ensuite par la zone) */
let fermeur: { pointerId: number; timeStamp: number } | null = null
let installe = false

/** Les écouteurs communs à tous les menus. L'interface les pose au démarrage :
 *  Échap doit passer AVANT ceux que le programme de construction, la revue
 *  ou la séance posent plus tard sur window, en capture (même cible : c'est
 *  l'ordre d'inscription qui compte). Sinon, Échap fermerait le programme de
 *  construction et laisserait le menu ouvert. */
export function installerMenus() {
  if (installe || typeof window === 'undefined') return
  installe = true
  // En capture, sur le document : avant la zone d'écriture et les boutons
  document.addEventListener('pointerdown', e => {
    if (!ouvert) return
    const cible = e.target as Node
    if (ouvert.el.contains(cible) || ouvert.bouton?.contains(cible)) return
    fermer(false)
    fermeur = { pointerId: e.pointerId, timeStamp: e.timeStamp }
  }, true)
  // Échap ferme le menu, et seulement le menu : l'outil en main ne change pas.
  // stopImmediatePropagation : les autres écouteurs de window ne l'entendent pas
  window.addEventListener('keydown', e => {
    if (e.key !== 'Escape' || !ouvert) return
    fermerMenu()
    e.preventDefault(); e.stopImmediatePropagation()
  }, true)
  // Le focus part ailleurs (Tab, une fenêtre qui s'ouvre) : le menu se ferme
  document.addEventListener('focusin', e => {
    const cible = e.target as Node
    if (ouvert && !ouvert.el.contains(cible) && !ouvert.bouton?.contains(cible)) fermer(false)
  })
  // La fenêtre change de taille (on tourne la tablette) : il ne serait plus
  // collé à son bouton
  window.addEventListener('resize', () => fermer(false))
}

/** Les flèches passent d'une entrée à l'autre ; ni elles ni Espace ne vont
 *  jusqu'au tableau (← → y déplaceraient la vue, Espace y est « Espace +
 *  glisser » et n'activerait plus l'entrée). */
function brancherClavier(el: HTMLElement) {
  if (el.dataset.menuClavier) return
  el.dataset.menuClavier = 'oui'
  el.addEventListener('keydown', e => {
    if (e.key === ' ' || e.key === 'ArrowLeft' || e.key === 'ArrowRight') {
      e.stopPropagation()
      if (e.key !== ' ') e.preventDefault()
      return
    }
    const sens = ({ ArrowDown: 1, ArrowUp: -1, Home: -Infinity, End: Infinity } as Record<string, number>)[e.key]
    if (!sens) return
    e.preventDefault(); e.stopPropagation()
    const entrees = [...el.querySelectorAll<HTMLElement>('.menu-item:not([aria-disabled="true"])')]
    if (!entrees.length) return
    const i = entrees.indexOf(document.activeElement as HTMLElement)
    const j = sens === -Infinity ? 0 : sens === Infinity ? entrees.length - 1
      : i < 0 ? (sens > 0 ? 0 : entrees.length - 1) : (i + sens + entrees.length) % entrees.length
    entrees[j].focus()
  })
}

export function ouvrirMenu(m: Menu) {
  installerMenus()
  if (ouvert && ouvert !== m) fermer(false)
  ouvert = m
  brancherClavier(m.el)
  m.el.hidden = false
  m.bouton?.setAttribute('aria-expanded', 'true')
}

export function basculerMenu(m: Menu) {
  if (ouvert === m) fermerMenu()
  else ouvrirMenu(m)
}

/** Ferme le menu ouvert ; faux s'il n'y en avait pas. Le focus qui était
 *  dans le menu (on l'avait ouvert au clavier) revient à son bouton, s'il en a un. */
export function fermerMenu(): boolean { return fermer(true) }

function fermer(rendreFocus: boolean): boolean {
  const m = ouvert
  if (!m) return false
  const dedans = rendreFocus && m.el.contains(document.activeElement)
  ouvert = null
  m.el.hidden = true
  m.bouton?.setAttribute('aria-expanded', 'false')
  if (dedans) m.bouton?.focus()
  m.fermer?.()
  return true
}

export function menuOuvert(): boolean { return !!ouvert }

/** Cet appui vient-il de fermer un menu ? Alors il ne pose rien. */
export function avale(e: PointerEvent): boolean {
  return !!fermeur && fermeur.pointerId === e.pointerId && fermeur.timeStamp === e.timeStamp
}

export type Cote = 'dessus' | 'dessous' | 'droite'

/** Où poser un menu l × h collé à son ancre, à 8 px au moins des bords de la
 *  fenêtre : du côté demandé, ou de l'autre s'il n'y a pas la place. */
export function positionMenu(ancre: { left: number; top: number; right: number; bottom: number }, l: number, h: number,
  cote: Cote, fenetre: { l: number; h: number }, marge = 8, ecart = 6): { left: number; top: number } {
  let left: number, top: number
  if (cote === 'droite') {
    left = ancre.right + ecart; top = ancre.top
    if (left + l > fenetre.l - marge) left = ancre.left - l - ecart
  } else {
    left = ancre.right - l                              // aligné sur le bord droit de l'ancre
    top = cote === 'dessus' ? ancre.top - h - ecart : ancre.bottom + ecart
    if (cote === 'dessus' && top < marge) top = ancre.bottom + ecart
    if (cote === 'dessous' && top + h > fenetre.h - marge) top = ancre.top - h - ecart
  }
  left = Math.max(marge, Math.min(left, fenetre.l - l - marge))
  top = Math.max(marge, Math.min(top, fenetre.h - h - marge))
  return { left, top }
}

/** Place un menu déjà visible (il faut pouvoir le mesurer) */
export function placerMenu(el: HTMLElement, ancre: DOMRect, cote: Cote) {
  const p = positionMenu(ancre, el.offsetWidth, el.offsetHeight, cote, { l: window.innerWidth, h: window.innerHeight })
  el.style.left = p.left + 'px'
  el.style.top = p.top + 'px'
}
