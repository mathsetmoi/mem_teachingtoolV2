// =============================================================
// LE NAVIGATEUR NE PREND PLUS LE TABLEAU
// Ctrl + « + » grossissait toute la page (barres comprises) au lieu du
// tableau ; F5, qu'envoient les télécommandes de présentation, rechargeait
// en plein cours ; pincer sur iPad zoomait la page ; un balayage à deux
// doigts faisait « page précédente ». Les gardes posées ici rendent ces
// gestes au tableau, ou les éteignent.
// =============================================================
import type { App } from './app'
import type { Molette } from './reglages'

/** Safari : le pincement du pavé arrive en événements gesture* */
interface GestureEvent extends UIEvent { scale: number; clientX: number; clientY: number }

export const MAC = typeof navigator !== 'undefined' && /Mac|iPhone|iPad/.test(navigator.platform)
/** La touche des raccourcis, comme le clavier la nomme */
export const CTRL = MAC ? '⌘' : 'Ctrl'

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
      // Pendant une séance d'automatismes, le professeur peut vouloir grossir l'écran
      if (document.body.classList.contains('en-seance')) return
      e.preventDefault()
      // Dans la revue ou une fenêtre ouverte : la page ne zoome pas, le tableau non plus
      if (app.enLecture || document.querySelector('dialog[open]')) return
      if (z === 'plus') app.zoomerClavier(1.25)
      else if (z === 'moins') app.zoomerClavier(1 / 1.25)
      else app.zoom100()
      return
    }
    if (toucheRecharger(e)) {
      e.preventDefault()
      app.ui.message(`F5 ne recharge pas MEM teachingtool pendant le cours (les télécommandes l'envoient). Pour recharger la page : ${CTRL}+R.`)
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
    if (!app.enLecture && g.scale > 0 && echelle > 0) app.zoomerAutourClient(g.clientX, g.clientY, g.scale / echelle)
    echelle = g.scale
  }, { passive: false })
  document.addEventListener('gestureend', e => {
    e.preventDefault()
    if (bureauSafari) app.pinceSafari = false
  }, { passive: false })
}
