// =============================================================
// « ENVOYER LA PAGE VERS… » (lot 28)
// La fenêtre qui copie ou déplace la page qu'on regarde vers une autre
// séance de ce classeur, ou vers un autre classeur (un autre chapitre) :
// on choisit le classeur, puis la séance, puis la place (dans ce classeur :
// à la fin de la séance, ou après une page qu'on choisit ; dans un autre :
// à la fin de la séance). Vers une séance passée, c'est un complément de
// cette séance (voir seances.ts). Elle ne fait que demander : l'envoi
// lui-même est App.envoyerPage.
// Une <dialog class="dialogue">, créée au moment de s'ouvrir comme les
// autres fenêtres de l'outil, modale.
// =============================================================

/** Une séance qu'on peut choisir */
export interface SeanceDEnvoi {
  id: string
  libelle: string
  /** « aujourd'hui », « complément », « à venir » */
  aide: string | null
  /** La séance de la page qu'on envoie (grisée) */
  ici?: boolean
  /** Ses pages (dans ce classeur seulement : la place « après la page ») */
  pages?: { id: string; libelle: string }[]
}

/** Un classeur qu'on peut choisir ; 'ici' : celui de cet onglet */
export interface ClasseurDEnvoi { id: string; nom: string; seances: SeanceDEnvoi[] }

/** Ce qu'on a choisi */
export interface ChoixEnvoiPage { classeur: string; seance: string; apres: string | null; deplacer: boolean }

/** Ce que la fenêtre demande à l'interface */
export interface HoteEnvoiPage {
  /** « Page 2 · Démo » */
  titrePage: string
  /** Ce classeur d'abord (id 'ici'), puis les autres */
  classeurs: ClasseurDEnvoi[]
  /** La séance proposée d'office dans ce classeur */
  seanceProposee: string | null
  /** La page est d'une séance passée : la déplacer la retire de cette
   *  séance (on le dit sous les deux choix) ; « de lundi » */
  depuisPassee: string | null
  envoyer(c: ChoixEnvoiPage): void
  maj(): void
}

const creer = <K extends keyof HTMLElementTagNameMap>(tag: K, classe = '', texte = '') => {
  const e = document.createElement(tag)
  if (classe) e.className = classe
  if (texte) e.textContent = texte
  return e
}

/** Ouvre la fenêtre. Échap, « Annuler » ou un appui à côté ferment sans
 *  rien faire. */
export function ouvrirEnvoiPage(hote: HoteEnvoiPage): HTMLDialogElement {
  const d = creer('dialog', 'dialogue dialogue-envoi-page')
  d.append(creer('h2', '', `Envoyer la ${hote.titrePage.replace(/^Page/, 'page')} vers…`))
  const corps = creer('div', 'corps')
  const mode = creer('div', 'envoi-mode')
  mode.setAttribute('role', 'radiogroup'); mode.setAttribute('aria-label', 'Copier ou déplacer')
  const radio = (nom: string, valeur: string, texte: string, coche: boolean) => {
    const l = creer('label', 'case')
    const i = creer('input'); i.type = 'radio'; i.name = nom; i.value = valeur; i.checked = coche
    l.append(i, creer('span', '', texte))
    return { l, i }
  }
  const copier = radio('envoi-page-mode', 'copier', 'Copier (elle reste aussi ici)', true)
  const deplacer = radio('envoi-page-mode', 'deplacer', 'Déplacer (elle quitte cette séance)', false)
  mode.append(copier.l, deplacer.l)
  const avis = creer('p', 'envoi-avis', hote.depuisPassee ? `Déplacée, elle quitte la séance ${hote.depuisPassee} (son replay déjà publié ne change pas tant que vous ne la republiez pas). « Annuler » la remet.` : '')
  avis.hidden = true

  const colonnes = creer('div', 'envoi-colonnes')
  const colClasseurs = creer('div', 'envoi-colonne')
  colClasseurs.append(creer('div', 'envoi-titre', 'Classeur'))
  const listeClasseurs = creer('div', 'envoi-liste-choix'); listeClasseurs.setAttribute('role', 'listbox'); listeClasseurs.setAttribute('aria-label', 'Classeur')
  colClasseurs.append(listeClasseurs)
  const colSeances = creer('div', 'envoi-colonne')
  colSeances.append(creer('div', 'envoi-titre', 'Séance'))
  const listeSeances = creer('div', 'envoi-liste-choix'); listeSeances.setAttribute('role', 'listbox'); listeSeances.setAttribute('aria-label', 'Séance')
  colSeances.append(listeSeances)
  colonnes.append(colClasseurs, colSeances)

  const place = creer('div', 'envoi-place')
  place.append(creer('span', 'envoi-titre', 'Place'))
  const fin = radio('envoi-page-place', 'fin', 'À la fin de la séance', true)
  const apres = radio('envoi-page-place', 'apres', 'Après la page', false)
  const choixPage = creer('select', 'envoi-page-apres') as HTMLSelectElement
  choixPage.setAttribute('aria-label', 'Après quelle page')
  place.append(fin.l, apres.l, choixPage)

  const actions = creer('div', 'actions')
  const annuler = creer('button', 'secondaire', 'Annuler'); annuler.type = 'button'
  const valider = creer('button', 'principal valider-envoi-page', 'Copier la page'); valider.type = 'button'
  actions.append(annuler, valider)
  corps.append(mode, avis, colonnes, place, actions)
  d.append(corps)

  let classeur = hote.classeurs[0]
  let seance: SeanceDEnvoi | null = null

  const majValider = () => {
    avis.hidden = !(deplacer.i.checked && hote.depuisPassee)
    valider.textContent = deplacer.i.checked ? 'Déplacer la page' : 'Copier la page'
    valider.disabled = !seance
  }
  const majPlace = () => {
    const pages = seance?.pages ?? []
    choixPage.replaceChildren(...pages.map(p => { const o = creer('option', '', p.libelle) as HTMLOptionElement; o.value = p.id; return o }))
    if (pages.length) choixPage.value = pages[pages.length - 1].id
    const possible = classeur.id === 'ici' && pages.length > 0
    apres.l.hidden = !possible; choixPage.hidden = !possible
    if (!possible) fin.i.checked = true
    choixPage.disabled = !apres.i.checked
  }
  const choisirSeance = (s: SeanceDEnvoi | null) => {
    seance = s
    for (const b of listeSeances.querySelectorAll<HTMLButtonElement>('button')) b.setAttribute('aria-selected', String(b.dataset.id === s?.id))
    majPlace(); majValider()
  }
  const montrerSeances = () => {
    listeSeances.replaceChildren()
    for (const s of classeur.seances) {
      const b = creer('button', 'envoi-choix'); b.type = 'button'; b.dataset.id = s.id
      b.setAttribute('role', 'option')
      b.append(creer('span', 'libelle', s.libelle))
      if (s.ici) b.append(creer('span', 'aide', 'cette séance'))
      else if (s.aide) b.append(creer('span', 'aide', s.aide))
      if (s.ici) b.disabled = true
      b.addEventListener('click', () => choisirSeance(s))
      listeSeances.append(b)
    }
    if (!classeur.seances.length) listeSeances.append(creer('p', 'envoi-vide', 'Ce classeur n\'a pas encore de séance.'))
    const proposee = classeur.id === 'ici' ? classeur.seances.find(s => s.id === hote.seanceProposee && !s.ici) : null
    choisirSeance(proposee ?? classeur.seances.find(s => !s.ici) ?? null)
  }
  const choisirClasseur = (c: ClasseurDEnvoi) => {
    classeur = c
    for (const b of listeClasseurs.querySelectorAll<HTMLButtonElement>('button')) b.setAttribute('aria-selected', String(b.dataset.id === c.id))
    montrerSeances()
  }
  for (const c of hote.classeurs) {
    const b = creer('button', 'envoi-choix'); b.type = 'button'; b.dataset.id = c.id
    b.setAttribute('role', 'option')
    b.append(creer('span', 'libelle', c.id === 'ici' ? `${c.nom} (celui-ci)` : c.nom))
    b.addEventListener('click', () => choisirClasseur(c))
    listeClasseurs.append(b)
  }
  copier.i.addEventListener('change', majValider)
  deplacer.i.addEventListener('change', majValider)
  fin.i.addEventListener('change', majPlace)
  apres.i.addEventListener('change', majPlace)

  let choix: ChoixEnvoiPage | null = null
  annuler.addEventListener('click', () => d.close())
  valider.addEventListener('click', () => {
    if (!seance) return
    choix = { classeur: classeur.id, seance: seance.id, apres: apres.i.checked && !choixPage.hidden ? choixPage.value || null : null, deplacer: deplacer.i.checked }
    d.close()
  })
  d.addEventListener('click', e => {
    if (e.target !== d) return
    const r = d.getBoundingClientRect()
    if (e.clientX < r.left || e.clientX > r.right || e.clientY < r.top || e.clientY > r.bottom) d.close()
  })
  d.addEventListener('close', () => {
    d.remove()
    hote.maj()
    if (choix) hote.envoyer(choix)
  })
  choisirClasseur(classeur)
  document.body.appendChild(d)
  d.showModal()
  hote.maj()
  valider.focus()
  return d
}
