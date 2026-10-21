// =============================================================
// LE NAVIGATEUR NE PREND PLUS LE TABLEAU
// Ctrl + « + » grossissait toute la page (barres comprises) au lieu du
// tableau ; F5, qu'envoient les télécommandes de présentation, rechargeait
// en plein cours ; pincer sur iPad zoomait la page ; un balayage à deux
// doigts faisait « page précédente ». Les gardes posées ici rendent ces
// gestes à l’écran, ou les éteignent.
// =============================================================
import type { App } from './app'
import type { Molette } from './reglages'

/** Safari : le pincement du pavé arrive en événements gesture* */
interface GestureEvent extends UIEvent { scale: number; clientX: number; clientY: number }

export const MAC = typeof navigator !== 'undefined' && /Mac|iPhone|iPad/.test(navigator.platform)
/** La touche des raccourcis, comme le clavier la nomme */
export const CTRL = MAC ? '⌘' : 'Ctrl'

/** La mise en page du téléphone (lot 5, D16) : une fenêtre étroite, ou basse
 *  sous le doigt (un téléphone en paysage). Écrite ici, une seule fois : les
 *  noms sous les outils s'y éteignent (voir UI.majNomsOutils), et la mise en
 *  page du téléphone la reprend. */
export const TELEPHONE = '(max-width: 640px), (max-height: 500px) and (pointer: coarse)'

/** Un appareil qu'on ne fait que toucher (ni souris, ni pavé, ni stylet :
 *  l'iPad, la tablette Android, le téléphone) n'a souvent pas de clavier :
 *  les textes y nomment l'entrée du menu plutôt que le raccourci. L'iPad
 *  avec son clavier et son pavé a un pointeur fin : le raccourci (⌘). */
const TOUCHER_SEUL = typeof matchMedia === 'function'
  && !matchMedia('(any-pointer: fine)').matches && matchMedia('(any-pointer: coarse)').matches
/** Comment enregistrer le classeur, ou en ouvrir un, dit entre parenthèses
 *  dans un texte : le raccourci comme le menu ⋯ le montre (Ctrl + S, ⌘ + S
 *  sur Mac et sur iPad), ou, au doigt seulement, l'entrée du menu ⋯ */
export const POUR_ENREGISTRER = TOUCHER_SEUL ? 'menu ⋯ → Enregistrer le classeur' : `${CTRL} + S`
export const POUR_OUVRIR = TOUCHER_SEUL ? 'menu ⋯ → Ouvrir un classeur' : `${CTRL} + O`

/** Ctrl (⌘) + « + », « − » ou « 0 », au clavier principal ou au pavé numérique.
 *  Les signes se lisent par e.key (en AZERTY, « - » est sur la touche 6) ; le
 *  zéro aussi par e.code (en AZERTY, la touche 0 sans Maj donne « à »). AltGr,
 *  qui vaut Ctrl + Alt sous Windows, n'en est pas. */
export function toucheZoom(e: Pick<KeyboardEvent, 'key' | 'code' | 'ctrlKey' | 'metaKey' | 'altKey'>): 'plus' | 'moins' | 'zero' | null {
  if (!(e.ctrlKey || e.metaKey) || e.altKey) return null
  if (e.key === '+' || e.key === '=' || e.code === 'NumpadAdd') return 'plus'
  if (e.key === '-' || e.key === '_' || e.code === 'NumpadSubtract' || e.code === 'Minus') return 'moins'
  if (e.key === '0' || e.code === 'Digit0' || e.code === 'Numpad0') return 'zero'
  return null
}

/** F5 (ou la touche « Actualiser »), Maj compris ; Ctrl + F5 reste au navigateur */
export function toucheRecharger(e: Pick<KeyboardEvent, 'key' | 'ctrlKey' | 'metaKey' | 'altKey'>): boolean {
  return (e.key === 'F5' || e.key === 'BrowserRefresh') && !e.ctrlKey && !e.metaKey && !e.altKey
}

/** Ctrl (⌘) + D : le marque-page du navigateur, que MEM remplace par
 *  « Dupliquer ». Dans un champ de saisie (une formule qu'on tape, le nom
 *  d'un sommet), où cette touche n'écrit rien, on l'empêche seulement (voir
 *  App.clavier) : le réflexe de dupliquer n'ouvre pas « Ajouter aux
 *  favoris » par-dessus l'éditeur. Maj compris (Ctrl + Maj + D marque tous
 *  les onglets) ; AltGr, qui vaut Ctrl + Alt sous Windows, n'en est pas. */
export function toucheMarquePage(e: Pick<KeyboardEvent, 'key' | 'ctrlKey' | 'metaKey' | 'altKey'>): boolean {
  return (e.ctrlKey || e.metaKey) && !e.altKey && e.key.toLowerCase() === 'd'
}

/** Une fenêtre modale est-elle ouverte (Publier, Exporter en PDF, une
 *  question…) ? Elle couvre le tableau, et une touche pressée pendant ce
 *  temps vient d'elle, même quand son focus est tombé sur la page (un bouton
 *  désactivé pendant un envoi le perd : la touche vise alors body, voir
 *  App.clavier). L'éditeur d'une formule, ouvert sans être modal (show), n'en
 *  est pas une. Un navigateur qui ne connaît pas :modal : toute fenêtre
 *  ouverte en est une. */
export function fenetreModaleOuverte(): boolean {
  if (typeof document === 'undefined') return false
  for (const d of document.querySelectorAll('dialog[open]')) {
    try { if (d.matches(':modal')) return true } catch { return true }
  }
  return false
}

/** Les touches qui font quitter MEM ou ouvrent la recherche du navigateur
 *  (lot 5, D3) : Alt + ← / → (Windows), ⌘ + ← / → (Mac) reviennent à la
 *  page précédente du navigateur, ou vont à la suivante, en plein cours ;
 *  Ctrl + ← / → n'y font rien d'utile hors d'un champ (à l’écran, elles
 *  poussaient l'objet comme une flèche seule). Ctrl (⌘) + G, Maj compris :
 *  grouper, dégrouper à l’écran, la recherche du navigateur ailleurs.
 *  AltGr (Ctrl + Alt) + G n'en est pas : c'est une lettre. Hors des champs
 *  et des fenêtres, on les empêche partout, à l’écran comme dans la revue,
 *  la trieuse et la bibliothèque (voir
 *  installerGardes) ; le tableau fait en plus son travail (App.clavier). */
export function toucheQuitteLaPage(e: Pick<KeyboardEvent, 'key' | 'ctrlKey' | 'metaKey' | 'altKey'>): boolean {
  if ((e.ctrlKey || e.metaKey || e.altKey) && (e.key === 'ArrowLeft' || e.key === 'ArrowRight')) return true
  return (e.ctrlKey || e.metaKey) && !e.altKey && e.key.toLowerCase() === 'g'
}

/** La touche Menu du clavier, ou Maj + F10 : le menu contextuel au clavier
 *  (voir App.menuAuClavier). Sans Ctrl, ⌘ ni Alt. */
export function toucheMenu(e: Pick<KeyboardEvent, 'key' | 'shiftKey' | 'ctrlKey' | 'metaKey' | 'altKey'>): boolean {
  if (e.ctrlKey || e.metaKey || e.altKey) return false
  return e.key === 'ContextMenu' || (e.key === 'F10' && e.shiftKey)
}

/** Le tableau est-il caché ? La revue (app.enLecture), la trieuse
 *  des pages (body.en-trieuse)
 *  et la bibliothèque des classeurs (body.en-bibliotheque) le couvrent : tout ce qui écrirait sur la page qu'on ne voit plus se tait
 *  (le collage par l'événement paste, les menus du clic droit, la barre
 *  d'actions, le zoom au clavier et le pincement de Safari, Ctrl + O,
 *  « Dupliquer la page », l'annonce du numéro de page). Sinon un geste
 *  invisible changerait la page, et l'on ne verrait rien. */
export function tableauCache(app: { enLecture: boolean }): boolean {
  if (app.enLecture) return true
  const corps = typeof document === 'undefined' ? null : document.body
  return !!corps && (corps.classList.contains('en-trieuse') || corps.classList.contains('en-bibliotheque'))
}

/** Les touches qui ne font rien pendant un geste (un objet qu'on glisse, un
 *  trait qu'on écrit, un cadre ou un lasso, la vue qu'on déplace) : celles
 *  qui changeraient la page, la sélection ou l'objet tenu. Le lâcher
 *  déplacerait ce que la touche vient de prendre (tout ce que Ctrl + A a
 *  pris, la copie que Ctrl + V vient de poser), ou rien du tout (l'objet
 *  tenu que Suppr ou Ctrl + Z vient d'ôter), ou poserait sur une autre page
 *  ce qu'on écrit. Ctrl (⌘) + A, C, X, V, D, Z, Y, G (Maj compris ; G :
 *  grouper, dégrouper, lot 5), Suppr, Retour arrière, Page↑, Page↓ et la
 *  touche Menu ; les flèches quand quelque chose est sélectionné (elles le
 *  poussent), et Maj + L (lot 5 : elle verrouillerait l'objet qu'on
 *  glisse). AltGr n'en fait pas des
 *  raccourcis. Les autres (Échap, Espace, Maj) gardent leur rôle. */
export function toucheTenueEnGeste(e: Pick<KeyboardEvent, 'key' | 'shiftKey' | 'ctrlKey' | 'metaKey' | 'altKey'>, selection: boolean): boolean {
  if ((e.ctrlKey || e.metaKey) && !e.altKey && /^[acxdvzyg]$/.test(e.key.toLowerCase())) return true
  if (e.key === 'Delete' || e.key === 'Backspace' || e.key === 'PageUp' || e.key === 'PageDown' || toucheMenu(e)) return true
  if (selection && toucheVerrou(e)) return true
  return selection && e.key.startsWith('Arrow')
}

/** Maj + L (lot 5, comme tldraw) : verrouiller ce qui est sélectionné, ou
 *  le déverrouiller (son menu ouvert). La lettre par e.key, en AZERTY comme
 *  en QWERTY ; ni avec Ctrl, ⌘ ou Alt. L seul reste le Segment (et Maj + L
 *  sans rien de sélectionné aussi, comme avant). */
export function toucheVerrou(e: Pick<KeyboardEvent, 'key' | 'shiftKey' | 'ctrlKey' | 'metaKey' | 'altKey'>): boolean {
  return e.shiftKey && !e.ctrlKey && !e.metaKey && !e.altKey && e.key.toLowerCase() === 'l'
}

/** Un cran au plus ×1,1 par événement : exp(−0,01 · d) avec d borné */
export const PLAFOND_MOLETTE = Math.log(1.1) / 0.01

/** Ce que fait un événement de molette : zoomer d'un facteur (autour du
 *  pointeur), ou déplacer la vue (en pixels d'écran).
 *  - Par défaut, la molette et le pavé défilent ; Maj : à l'horizontale
 *    (Chrome convertit déjà en deltaX, Firefox non).
 *  - Ctrl/⌘ + molette et le pincement du pavé (que le navigateur envoie avec
 *    ctrlKey) zooment. Le pincement envoie de petits pas : il reste continu ;
 *    un cran de molette (deltaY = 100) donne exactement ×1,1, et une molette
 *    libre qui envoie des à-coups ne dépasse jamais ×1,1 par événement.
 *  - Réglage « la molette zoome » : seule une molette à crans zoome (des
 *    lignes ou des pages, ou des pas entiers et larges sans aucun mouvement
 *    de côté) ; les deux doigts sur le pavé continuent de déplacer. */
export function lireMolette(e: Pick<WheelEvent, 'deltaX' | 'deltaY' | 'deltaMode' | 'ctrlKey' | 'metaKey' | 'shiftKey'>,
  hauteurPage: number, reglage: Molette): { zoom: number } | { dx: number; dy: number } {
  const k = e.deltaMode === 1 ? 33 : e.deltaMode === 2 ? hauteurPage : 1      // lignes (Firefox), pages
  const dx = e.deltaX * k, dy = e.deltaY * k
  const cran = e.deltaMode !== 0 || (e.deltaX === 0 && Number.isInteger(e.deltaY) && Math.abs(e.deltaY) >= 50)
  const zoome = e.ctrlKey || e.metaKey || (reglage === 'zoome' && cran && !e.shiftKey)
  if (zoome) {
    const d = Math.max(-PLAFOND_MOLETTE, Math.min(PLAFOND_MOLETTE, dy))
    return { zoom: Math.exp(-d * 0.01) }
  }
  if (e.shiftKey && !dx) return { dx: -dy, dy: 0 }
  return { dx: -dx, dy: -dy }
}

export function installerGardes(app: App) {
  // En capture sur window, posée au démarrage : elle passe AVANT les écouteurs
  // que la revue, le programme de construction et la séance posent plus tard
  // au même endroit (même cible : c'est l'ordre d'inscription qui compte),
  // et leur stopPropagation ne l'arrête pas.
  window.addEventListener('keydown', e => {
    const z = toucheZoom(e)
    if (z) {
      e.preventDefault()
      // Dans la revue, la trieuse des pages ou une fenêtre ouverte : la page
      // ne zoome pas, le tableau (caché) non plus
      if (tableauCache(app) || document.querySelector('dialog[open]')) return
      if (z === 'plus') app.zoomerClavier(1.25)
      else if (z === 'moins') app.zoomerClavier(1 / 1.25)
      else app.zoom100()
      return
    }
    if (toucheRecharger(e)) {
      e.preventDefault()
      app.ui.message(`F5 ne recharge pas MEM teachingtool pendant le cours (les télécommandes l'envoient). Pour recharger la page : ${CTRL}+R.`)
      return
    }
    // Alt + ← (⌘ + ← sur Mac) et Ctrl + G (voir toucheQuitteLaPage) : ici
    // plutôt que dans chaque écran, parce que la revue, la trieuse et la
    // bibliothèque arrêtent en capture ce qu'elles reçoivent (App.clavier,
    // qui les empêche à l’écran, ne les voyait pas : la vérification du
    // lot 5, Alt + ← dans la revue quittait MEM). Les mêmes exceptions
    // qu'à l’écran : un champ de saisie (Ctrl + ← y va de mot en mot, ⌘ + ←
    // au début de la ligne), une fenêtre. On empêche seulement : chaque
    // écran fait ensuite ce qu'il fait de la touche (la trieuse déplace une
    // page par Ctrl + Maj + ← / →, le tableau groupe par Ctrl + G).
    if (toucheQuitteLaPage(e)) {
      const cible = e.target as Element | null
      if (!cible?.closest?.('input, textarea, select, [contenteditable], dialog') && !fenetreModaleOuverte()) e.preventDefault()
    }
  }, true)

  // Ctrl + molette (ou pincer le pavé) au-dessus des barres, des menus ou d'un
  // panneau : la page ne zoome plus. Le tableau, la revue et la séance ont
  // leurs propres écouteurs ; ailleurs, le reste défile normalement.
  document.addEventListener('wheel', e => {
    if (!(e.ctrlKey || e.metaKey)) return
    if ((e.target as Element | null)?.closest?.('#zone, .revue-scene, .seance')) return
    e.preventDefault()
  }, { passive: false, capture: true })

  // iPad, iPhone, Safari sur Mac : la page ne zoome jamais d'elle-même. Sur
  // Mac seulement, le pincement du pavé zoome le tableau (sur iOS, il passe
  // déjà par les pointeurs).
  const bureauSafari = 'GestureEvent' in window && navigator.maxTouchPoints === 0
  let echelle = 1
  document.addEventListener('gesturestart', e => {
    e.preventDefault()
    if (bureauSafari) { echelle = 1; app.pinceSafari = true }
  }, { passive: false })
  document.addEventListener('gesturechange', e => {
    e.preventDefault()
    if (!bureauSafari) return
    const g = e as GestureEvent
    if (!tableauCache(app) && g.scale > 0 && echelle > 0) app.zoomerAutourClient(g.clientX, g.clientY, g.scale / echelle)
    echelle = g.scale
  }, { passive: false })
  document.addEventListener('gestureend', e => {
    e.preventDefault()
    if (bureauSafari) app.pinceSafari = false
  }, { passive: false })
}
