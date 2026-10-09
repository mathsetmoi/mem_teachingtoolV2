// =============================================================
// « ENVOYER VERS… »
// La fenêtre qui envoie ce qui est pris vers une autre page : vers une
// page existante (une petite vignette devant chacune), une nouvelle page
// juste après, ou une nouvelle page à la fin ; en le déplaçant (par
// défaut) ou en le copiant. Elle ne fait que demander : l'envoi lui-même
// est App.envoyerSelection, et son annulation Tableau.envoyer.
// Une <dialog class="dialogue">, créée au moment de s'ouvrir comme les
// autres fenêtres de l'outil, modale : le tableau derrière ne reçoit rien.
// =============================================================

/** Ce que la fenêtre demande à l'interface */
export interface HoteEnvoi {
  /** Combien d'objets partent (les points liés aux images compris) */
  n: number
  /** L'ordre des pages, et celle qu'on regarde */
  pages: string[]
  page: string
  nomDe(page: string): string | null
  /** La vignette d'une page, l × h px CSS (voir Vignettes.vignette) : elle
   *  se peint dès qu'elle est attachée, trieuse ouverte ou non */
  vignette(page: string, l: number, h: number): HTMLCanvasElement
  /** cible : une page, 'apres' ou 'fin' */
  envoyer(cible: string, deplacer: boolean): void
  /** La fenêtre s'ouvre ou se ferme : la barre d'actions se cache, revient */
  maj(): void
}

/** La taille des vignettes de la liste (px CSS) */
const VIGNETTE = { l: 64, h: 40 }

/** Le message d'un envoi fait : « 3 objets envoyés vers la page 5 »,
 *  « 1 objet copié sur la page 5 » */
export function texteEnvoi(n: number, page: number, deplacer: boolean): string {
  if (deplacer) return n === 1 ? `1 objet envoyé vers la page ${page}` : `${n} objets envoyés vers la page ${page}`
  return n === 1 ? `1 objet copié sur la page ${page}` : `${n} objets copiés sur la page ${page}`
}

/** Le message d'un déplacement défait sur la page de départ (voir
 *  Tableau.annuler) : les objets revenus, d'où, ceux qui, modifiés depuis
 *  sur la page d'arrivée, y restent aussi (un doublon visible, qu'il faut
 *  dire), et ceux qui n'y étaient plus (absents : effacés ou envoyés
 *  ailleurs depuis, sur une page supprimée définitivement). « revenus de la
 *  page 5 » seulement si quelque chose en est vraiment parti. page : le
 *  numéro qu'avait la page d'arrivée ; encore : elle est toujours dans
 *  l'ordre (sinon, une page supprimée depuis). */
export function texteEnvoiAnnule(e: { revenus: number; restes: number; absents?: number; pageRetiree: boolean }, page: number, encore: boolean): string {
  const absents = e.absents ?? 0
  const partis = e.revenus - e.restes - absents
  const debut = e.revenus === 1 ? 'Envoi annulé : l\'objet est revenu' : `Envoi annulé : les ${e.revenus} objets sont revenus`
  if (e.pageRetiree) return `${debut} ; la nouvelle page ${page}, vide, est retirée`
  const ou = encore && page ? `la page ${page}` : 'la page supprimée'
  const restes = !e.restes ? ''
    : e.restes === 1 ? ` ; 1 objet, modifié depuis sur ${ou}, y reste aussi`
    : ` ; ${e.restes} objets, modifiés depuis sur ${ou}, y restent aussi`
  const absentsTexte = !absents ? ''
    : absents === 1 ? ` ; 1 objet n'était plus sur ${ou} (effacé ou envoyé ailleurs depuis)`
    : ` ; ${absents} objets n'étaient plus sur ${ou} (effacés ou envoyés ailleurs depuis)`
  const dou = partis <= 0 ? '' : ` ${encore && page ? `de la page ${page}` : 'd\'une page supprimée'}`
  return `${debut}${dou}${restes}${absentsTexte}`
}

/** Le message d'un déplacement qui ne se défait pas encore (voir
 *  Tableau.annuler, envoiBloque) : sur la page d'arrivée, n des objets
 *  posés ont depuis été effacés ou renvoyés ailleurs, et la pile de cette
 *  page peut les y ramener. On y défait d'abord cela. total : les objets de
 *  l'envoi ; page : le numéro de la page d'arrivée (0 : elle est dans la
 *  corbeille, on l'en remet d'abord). */
export function texteEnvoiBloque(n: number, total: number, page: number): string {
  const ou = page ? `sur la page ${page}` : 'sur la page supprimée où l\'envoi est arrivé'
  const qui = total <= 1 ? 'l\'objet a depuis été effacé ou renvoyé ailleurs'
    : n >= total ? `les ${total} objets ont depuis été effacés ou renvoyés ailleurs`
    : n === 1 ? `1 des ${total} objets a depuis été effacé ou renvoyé ailleurs`
    : `${n} des ${total} objets ont depuis été effacés ou renvoyés ailleurs`
  const faire = page ? `Annulez d'abord cela sur la page ${page} (↶).` : 'Remettez cette page (Toutes les pages, corbeille), puis annulez d\'abord cela sur elle (↶).'
  return `Cet envoi ne s'annule pas encore : ${ou}, ${qui}. ${faire}`
}

/** Le message d'un déplacement qui ne se refait pas (voir Tableau.retablir,
 *  envoiImpossible) */
export const TEXTE_ENVOI_IMPOSSIBLE = 'La page d\'arrivée a été supprimée définitivement : l\'envoi n\'est pas refait.'

/** Le libellé d'une page de la liste : « Page 2 », « Page 2 · Exercice 12
 *  p. 84 », « Page 3 (cette page) » */
export function libelleDestination(numero: number, nom: string | null, ici: boolean): string {
  return `Page ${numero}${nom ? ' · ' + nom : ''}${ici ? ' (cette page)' : ''}`
}

/** Ouvre la fenêtre. Un clic, un toucher ou Entrée sur une destination
 *  envoie et ferme ; Échap, « Annuler » ou un appui à côté ferment sans rien
 *  faire. Clavier : Tab va des deux choix à la liste puis à « Annuler » ; dans
 *  la liste (un seul arrêt de Tab), les flèches, Début et Fin. La page qu'on
 *  regarde y est, grisée. Le focus va d'abord à la page qui suit celle-ci. */
export function ouvrirEnvoi(hote: HoteEnvoi): HTMLDialogElement {
  const n = hote.n
  const d = document.createElement('dialog')
  d.className = 'dialogue dialogue-envoi'
  d.innerHTML = `<h2></h2><div class="corps">
    <div class="envoi-mode" role="radiogroup" aria-label="Déplacer ou copier">
      <label class="case"><input type="radio" name="envoi-mode" value="deplacer" checked><span></span></label>
      <label class="case"><input type="radio" name="envoi-mode" value="copier"><span></span></label>
    </div>
    <div class="envoi-liste" role="group" aria-label="Vers quelle page"></div>
    <div class="actions"><button type="button" class="secondaire" data-a="annuler">Annuler</button></div></div>`
  d.querySelector('h2')!.textContent = n === 1 ? 'Envoyer l\'objet vers…' : `Envoyer les ${n} objets vers…`
  const [deplacer, copier] = [...d.querySelectorAll<HTMLSpanElement>('.envoi-mode .case span')]
  deplacer.textContent = n === 1 ? 'Déplacer (il quitte cette page)' : 'Déplacer (ils quittent cette page)'
  copier.textContent = n === 1 ? 'Copier (il reste aussi ici)' : 'Copier (ils restent aussi ici)'
  const liste = d.querySelector<HTMLDivElement>('.envoi-liste')!

  let choix: string | null = null
  const destination = (cible: string, libelle: string, o: { page?: string; inactif?: boolean; neuve?: boolean } = {}) => {
    const b = document.createElement('button')
    b.type = 'button'; b.className = 'destination' + (o.neuve ? ' neuve' : ''); b.dataset.cible = cible
    b.tabIndex = -1
    if (o.page) {
      const c = hote.vignette(o.page, VIGNETTE.l, VIGNETTE.h)
      c.classList.add('vignette-envoi'); c.setAttribute('aria-hidden', 'true')
      b.appendChild(c)
    } else {
      const plus = document.createElement('span')
      plus.className = 'plus'; plus.setAttribute('aria-hidden', 'true'); plus.textContent = '+'
      b.appendChild(plus)
    }
    const t = document.createElement('span')
    t.className = 'libelle'; t.textContent = libelle
    b.appendChild(t)
    if (o.inactif) { b.disabled = true; b.setAttribute('aria-disabled', 'true') }
    b.addEventListener('click', () => { if (b.disabled) return; choix = cible; d.close() })
    liste.appendChild(b)
    return b
  }
  hote.pages.forEach((p, i) => destination(p, libelleDestination(i + 1, hote.nomDe(p), p === hote.page), { page: p, inactif: p === hote.page }))
  destination('apres', 'Une nouvelle page juste après', { neuve: true })
  destination('fin', 'Une nouvelle page à la fin', { neuve: true })

  // Un seul arrêt de Tab dans la liste ; les flèches, Début et Fin y vont
  // d'une destination à l'autre (la page qu'on regarde est sautée)
  const actives = () => [...liste.querySelectorAll<HTMLButtonElement>('.destination:not(:disabled)')]
  const prendre = (b: HTMLButtonElement | undefined, focus = true) => {
    if (!b) return
    for (const x of liste.querySelectorAll<HTMLButtonElement>('.destination')) x.tabIndex = x === b ? 0 : -1
    if (focus) { b.focus({ preventScroll: true }); b.scrollIntoView({ block: 'nearest' }) }
  }
  liste.addEventListener('keydown', e => {
    const l = actives(), k = l.indexOf(document.activeElement as HTMLButtonElement)
    let j = -1
    if (e.key === 'ArrowDown' || e.key === 'ArrowRight') j = Math.min(l.length - 1, k + 1)
    else if (e.key === 'ArrowUp' || e.key === 'ArrowLeft') j = Math.max(0, k - 1)
    else if (e.key === 'Home') j = 0
    else if (e.key === 'End') j = l.length - 1
    if (j < 0) return
    e.preventDefault()
    prendre(l[j])
  })
  liste.addEventListener('focusin', e => { const b = (e.target as HTMLElement).closest<HTMLButtonElement>('.destination'); if (b && !b.disabled) prendre(b, false) })

  d.querySelector('[data-a="annuler"]')!.addEventListener('click', () => d.close())
  // Un appui à côté (sur le fond) ferme ; pas un appui dans la marge de la fenêtre
  d.addEventListener('click', e => {
    if (e.target !== d) return
    const r = d.getBoundingClientRect()
    if (e.clientX < r.left || e.clientX > r.right || e.clientY < r.top || e.clientY > r.bottom) d.close()
  })
  d.addEventListener('close', () => {
    d.remove()
    hote.maj()
    if (choix === null) return
    const mode = d.querySelector<HTMLInputElement>('input[name="envoi-mode"]:checked')?.value
    hote.envoyer(choix, mode !== 'copier')
  })
  document.body.appendChild(d)
  d.showModal()
  hote.maj()
  // Le focus : la page qui suit celle-ci (ou la première destination)
  const i = hote.pages.indexOf(hote.page)
  const l = actives()
  prendre(l.find(b => b.dataset.cible === hote.pages[i + 1]) ?? l.find(b => b.dataset.cible === 'apres') ?? l[0])
  // Les vignettes, maintenant attachées, se peignent (la file repart)
  for (const p of hote.pages) hote.vignette(p, VIGNETTE.l, VIGNETTE.h)
  return d
}
