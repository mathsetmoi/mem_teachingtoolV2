// =============================================================
// LE FOND D'UNE FENÊTRE
// Un appui sur le fond (hors du cadre d'une fenêtre modale) la ferme, comme
// « Annuler ». Le clic que le navigateur envoie alors vise le <dialog>
// lui-même ; mais c'est aussi le cas d'un appui dans sa marge intérieure
// (20 à 22 px : voir .dialogue dans style.css), dans le cadre, que la plume
// imprécise d'une tablette graphique ou le doigt sur le TNI touchent souvent.
// Celui-là ne ferme rien : on ne perd pas le nom qu'on tapait. On regarde
// donc où l'appui a commencé et où il a fini, tous deux hors du cadre (un
// texte qu'on sélectionne en glissant jusqu'au fond ne ferme rien non plus).
// =============================================================

/** Le point (x, y) est-il hors du cadre de d ? */
function dehors(d: HTMLElement, x: number, y: number): boolean {
  const r = d.getBoundingClientRect()
  return x < r.left || x > r.right || y < r.top || y > r.bottom
}

/** Un appui commencé et fini sur le fond de la fenêtre d, hors de son cadre,
 *  appelle fermer ; jamais un appui dans sa marge intérieure */
export function fermerSurLeFond(d: HTMLDialogElement, fermer: () => void) {
  let debutDehors = false
  d.addEventListener('pointerdown', e => { debutDehors = e.target === d && dehors(d, e.clientX, e.clientY) })
  d.addEventListener('click', e => {
    const fond = e.target === d && debutDehors && dehors(d, e.clientX, e.clientY)
    debutDehors = false
    if (fond) fermer()
  })
}
