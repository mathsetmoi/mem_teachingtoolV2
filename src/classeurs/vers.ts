// =============================================================
// « DÉPLACER VERS… » (la bibliothèque des classeurs)
// La fenêtre qui range un classeur ou un dossier dans un autre dossier :
// l'arbre des dossiers, en retrait et dans leur couleur, « Bibliothèque (la
// racine) » en premier (voir deplacer.destinations). Là où il est déjà est
// grisé, « (ici) » ; pour un dossier, lui-même et ses descendants le sont
// aussi. Elle ne fait que demander : le déplacement lui-même (et sa
// vérification dans la transaction du registre) est Bibliotheque.deplacerVers.
// Une <dialog class="dialogue">, comme « Envoyer vers… » (pages/envoi.ts),
// modale : la bibliothèque derrière ne reçoit rien.
// Clavier : un seul arrêt de Tab dans la liste, les flèches, Début et Fin
// d'un dossier à l'autre (les grisés sont sautés), Entrée choisit, Échap
// ferme sans rien faire, Tab mène à « Annuler ». Des lignes de 44 px ; au
// téléphone, toute la largeur, la liste défile.
// =============================================================
import type { Destination } from './deplacer'
import { icone } from '../icones'
import { fermerSurLeFond } from '../dialogue'

/** La petite icône d'un dossier, dans sa couleur (--c) : le dos plus pâle, et la face */
const SVG_MINI = '<svg viewBox="0 0 48 38" aria-hidden="true"><path class="dos" d="M2 6a4 4 0 014-4h11.5l4.5 5h20a4 4 0 014 4v3H2z"/><path class="face" d="M2 12h44v20a4 4 0 01-4 4H6a4 4 0 01-4-4z"/></svg>'

/** Le retrait d'un niveau (px), et le plus grand retrait (au-delà, la
 *  ligne garderait trop peu de place pour le nom, au téléphone) */
const RETRAIT = 20
const RETRAIT_MAX = 8

/** Ouvre la fenêtre. titre : « Déplacer « Symétrie » vers… ». choisir :
 *  l'id du dossier choisi (null : la racine), après la fermeture ; rien si
 *  l'on ferme sans choisir. Le focus va à la première destination
 *  possible. */
export function ouvrirDeplacerVers(o: { titre: string; destinations: Destination[]; choisir: (id: string | null) => void; fermee?: () => void }): HTMLDialogElement {
  const d = document.createElement('dialog')
  d.className = 'dialogue dialogue-deplacer'
  d.setAttribute('aria-labelledby', 'deplacer-titre')
  d.innerHTML = `<h2 id="deplacer-titre"></h2><div class="corps">
    <div class="deplacer-liste" role="group" aria-label="Vers quel dossier"></div>
    <div class="actions"><button type="button" class="secondaire" data-a="annuler">Annuler</button></div></div>`
  d.querySelector('h2')!.textContent = o.titre
  const liste = d.querySelector<HTMLElement>('.deplacer-liste')!
  let choix: { id: string | null } | null = null
  for (const x of o.destinations) {
    const b = document.createElement('button')
    b.type = 'button'; b.className = 'vers-dossier'; b.tabIndex = -1
    b.dataset.dossier = x.id ?? ''
    b.style.setProperty('--retrait', `${Math.min(x.profondeur, RETRAIT_MAX) * RETRAIT}px`)
    const ic = Object.assign(document.createElement('span'), { className: 'vers-icone' })
    ic.setAttribute('aria-hidden', 'true')
    if (x.id === null) { ic.innerHTML = icone('classeurs'); ic.classList.add('vers-racine') }
    else { ic.innerHTML = SVG_MINI; ic.style.setProperty('--c', x.couleur ?? '') }
    const nom = Object.assign(document.createElement('span'), { className: 'libelle', textContent: x.nom })
    b.append(ic, nom)
    if (x.ici) b.append(Object.assign(document.createElement('span'), { className: 'vers-ici', textContent: '(ici)' }))
    // Le lecteur d'écran lit le chemin : « 5e B › Géométrie (ici) »
    b.setAttribute('aria-label', x.id === null ? `${x.nom}${x.ici ? ' (ici)' : ''}` : `${x.chemin}${x.ici ? ' (ici)' : ''}`)
    if (x.ici || x.interdit) { b.disabled = true; b.setAttribute('aria-disabled', 'true') }
    b.addEventListener('click', () => { if (b.disabled) return; choix = { id: x.id }; d.close() })
    liste.appendChild(b)
  }
  // Un seul arrêt de Tab ; les flèches, Début, Fin (les grisés sont sautés)
  const actives = () => [...liste.querySelectorAll<HTMLButtonElement>('.vers-dossier:not(:disabled)')]
  const prendre = (b: HTMLButtonElement | undefined, focus = true) => {
    if (!b) return
    for (const x of liste.querySelectorAll<HTMLButtonElement>('.vers-dossier')) x.tabIndex = x === b ? 0 : -1
    if (focus) { b.focus({ preventScroll: true }); b.scrollIntoView({ block: 'nearest' }) }
  }
  liste.addEventListener('keydown', e => {
    if (e.altKey || e.ctrlKey || e.metaKey) return
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
  liste.addEventListener('focusin', e => { const b = (e.target as HTMLElement).closest<HTMLButtonElement>('.vers-dossier'); if (b && !b.disabled) prendre(b, false) })
  d.querySelector('[data-a="annuler"]')!.addEventListener('click', () => d.close())
  // Un appui à côté (sur le fond) ferme ; pas un appui dans la marge de la fenêtre
  fermerSurLeFond(d, () => d.close())
  d.addEventListener('close', () => {
    d.remove()
    o.fermee?.()
    if (choix) o.choisir(choix.id)
  })
  document.body.appendChild(d)
  d.showModal()
  const l = actives()
  if (l.length) prendre(l[0])
  else d.querySelector<HTMLElement>('[data-a="annuler"]')!.focus()
  return d
}
