// =============================================================
// LES SÉANCES À L'ÉCRAN (lot 6)
// - la fenêtre d'accueil (« Bonjour ! ») : une nouvelle séance avec la
//   classe, changer de chapitre, continuer la séance d'avant, une autre
//   classe, un nouveau classeur vierge (voir main.ts, qui la remplit avec
//   la bibliothèque) ;
// - la fenêtre « Cette page est dans la séance de lundi… », au premier
//   geste d'écriture sur une page d'une séance passée ;
// - trois bandeaux posés sur le tableau, sous la barre du haut : la lecture
//   d'une séance passée (« vous la regardez sans la modifier », Retour à
//   aujourd'hui), « Reprendre » au début d'une séance (où s'était arrêtée
//   la séance d'avant), et, en bas, les vignettes de la séance précédente
//   (« Séance précédente », « ‹ Séance d'avant »).
// Rien de tout cela n'écrit dans le document : l'application le fait (voir
// App.nouvelleSeance, reprendrePage, voirPage, retourAujourdhui).
// =============================================================
import type { App } from './app'
import type { SeanceDuClasseur } from './seances'
import { dateCourteMajuscule, deLaSeance, libelleSeance, nomDeSeance, quandMajuscule, LONGUEUR_NOM_SEANCE } from './seances'
import type { Vignettes } from './pages/vignettes'
import { fermerSurLeFond } from './dialogue'
import { icone } from './icones'

const el = <K extends keyof HTMLElementTagNameMap>(tag: K, classe = '', texte = ''): HTMLElementTagNameMap[K] => {
  const x = document.createElement(tag)
  if (classe) x.className = classe
  if (texte) x.textContent = texte
  return x
}
const bouton = (classe: string, texte: string, faire: () => void): HTMLButtonElement => {
  const b = el('button', classe, texte)
  b.type = 'button'
  b.addEventListener('click', faire)
  return b
}
const pluriel = (n: number, mot: string) => `${n} ${mot}${n > 1 ? 's' : ''}`

// ---------- La fenêtre d'accueil ----------
export interface ChapitreAccueil { id: string; nom: string; seances: number | null; ici: boolean }
export interface HoteAccueil {
  /** La classe (le nom de son dossier de classe), sinon null */
  classe: string | null
  /** Le chapitre : le nom du classeur */
  chapitre: string
  /** La séance qu'on peut continuer (la dernière), dite dans une phrase */
  continuer: string | null
  /** Les autres dossiers de classe */
  classes: { id: string; nom: string }[]
  /** Les chapitres de la classe (null : pas de bibliothèque) */
  chapitres: (() => Promise<ChapitreAccueil[]>) | null
  nouvelleSeance(): void
  continuerSeance(): void
  autreClasse(id: string): void
  ouvrirChapitre(id: string): void
  nouveauChapitre(): void
  /** Un classeur vierge, hors de toute classe (null : pas de bibliothèque) */
  nouveauClasseurVierge: (() => void) | null
}

/** « la 5A », « la 5e B » ; un nom qui n'est pas une classe reste entre guillemets */
export function avecLaClasse(nom: string): string {
  return /^(\d|cp|ce\d|cm\d|seconde|2nde|1re|1ère|premi|tle|term|bts|cap)/i.test(nom.trim()) ? `la ${nom.trim()}` : `« ${nom.trim()} »`
}

/** La fenêtre « Bonjour ! » : par-dessus la dernière page, grisée. Le gros
 *  bouton (une nouvelle séance) a le focus : Entrée suffit. Échap ferme, et
 *  laisse la dernière page telle quelle (on continue la séance). */
export function ouvrirAccueil(racine: HTMLElement, h: HoteAccueil): HTMLDialogElement {
  document.querySelector('dialog.dialogue-accueil')?.remove()
  const d = el('dialog', 'dialogue dialogue-accueil')
  d.setAttribute('aria-labelledby', 'accueil-titre')
  const fermer = () => { if (d.open) d.close() }
  const faire = (f: () => void) => () => { fermer(); f() }
  // La vue principale
  const principale = el('div', 'accueil-vue')
  const titre = el('h2', '', 'Bonjour !'); titre.id = 'accueil-titre'
  const gros = bouton('principal accueil-nouvelle', h.classe ? `Nouvelle séance avec ${avecLaClasse(h.classe)}` : 'Nouvelle séance', faire(() => h.nouvelleSeance()))
  const chapitre = el('p', 'accueil-chapitre')
  chapitre.append(el('span', 'accueil-nom-chapitre', h.chapitre))
  if (h.chapitres) {
    chapitre.append(' — ')
    chapitre.append(bouton('lien accueil-changer', 'changer de chapitre', () => void montrerChapitres()))
  }
  principale.append(titre, gros, chapitre)
  if (h.continuer) principale.append(bouton('lien accueil-continuer', `Continuer la séance ${h.continuer}`, faire(() => h.continuerSeance())))
  if (h.classes.length) {
    const p = el('p', 'accueil-classes', 'Une autre classe : ')
    for (const c of h.classes) p.append(bouton('pastille-classe', c.nom, faire(() => h.autreClasse(c.id))))
    principale.append(p)
  }
  if (h.nouveauClasseurVierge) {
    const vierge = el('p', 'accueil-vierge')
    vierge.append(bouton('lien accueil-classeur-vierge', 'Nouveau classeur vierge…', faire(h.nouveauClasseurVierge)),
      el('small', '', 'Sans classe : vous l\'enregistrez quand vous voulez.'))
    principale.append(vierge)
  }
  // La liste des chapitres de la classe
  const liste = el('div', 'accueil-vue accueil-liste')
  liste.hidden = true
  const montrerChapitres = async () => {
    const l = await h.chapitres!().catch(() => [] as ChapitreAccueil[])
    liste.replaceChildren()
    const t = el('h2', '', h.classe ? `Chapitre de ${avecLaClasse(h.classe)}` : 'Changer de chapitre')
    const ul = el('ul', 'accueil-chapitres')
    const neuf = el('li'); neuf.append(bouton('secondaire accueil-nouveau-chapitre', '+ Nouveau chapitre…', faire(() => h.nouveauChapitre()))); ul.append(neuf)
    for (const c of l) {
      const li = el('li')
      const b = bouton('accueil-un-chapitre' + (c.ici ? ' ici' : ''), '', faire(() => h.ouvrirChapitre(c.id)))
      b.append(el('span', 'nom', c.nom), el('span', 'nombre', c.seances === null ? '' : ` · ${pluriel(c.seances, 'séance')}`))
      if (c.ici) b.setAttribute('aria-current', 'true')
      li.append(b); ul.append(li)
    }
    liste.append(t, ul, bouton('lien accueil-retour', '‹ Retour', () => { liste.hidden = true; principale.hidden = false; gros.focus() }))
    principale.hidden = true; liste.hidden = false
    ;(ul.querySelector('.ici') as HTMLElement | null ?? ul.querySelector('button'))?.focus()
  }
  d.append(principale, liste)
  d.addEventListener('close', () => d.remove())
  fermerSurLeFond(d, fermer)
  racine.appendChild(d)
  d.showModal()
  gros.focus()
  return d
}

// ---------- « Cette page est dans la séance de lundi » ----------
/** La question posée au premier geste d'écriture sur une page d'une séance
 *  passée : vrai pour « Reprendre et écrire », faux pour « Juste regarder »
 *  (Échap, le fond) */
export function demanderReprise(racine: HTMLElement, seance: SeanceDuClasseur): Promise<boolean> {
  return new Promise(ok => {
    const d = el('dialog', 'dialogue dialogue-reprise')
    const de = deLaSeance(seance, Date.now())
    const titre = el('h2', '', `Cette page est dans la séance ${de}`)
    const texte = el('p', '', `Pour écrire dessus aujourd'hui, MEM la reprend dans la séance du jour. La séance ${de} reste telle que la classe l'a vue.`)
    let reponse = false
    const actions = el('div', 'actions')
    const regarder = bouton('secondaire', 'Juste regarder', () => { reponse = false; d.close() })
    const reprendre = bouton('principal', 'Reprendre et écrire', () => { reponse = true; d.close() })
    actions.append(regarder, reprendre)
    d.append(titre, texte, actions)
    d.addEventListener('close', () => { d.remove(); ok(reponse) })
    fermerSurLeFond(d, () => d.close())
    racine.appendChild(d)
    d.showModal()
    reprendre.focus()
  })
}

/** « Renommer la séance… » : son nom (facultatif, 60 caractères) ; null :
 *  Annuler ; '' : retirer le nom */
export function demanderNomDeSeance(racine: HTMLElement, s: SeanceDuClasseur): Promise<string | null> {
  return new Promise(ok => {
    const d = el('dialog', 'dialogue dialogue-nom-seance')
    const form = el('form'); form.method = 'dialog'
    const titre = el('h2', '', 'Renommer la séance')
    const aide = el('p', '', `Sans nom, elle s'appelle « ${libelleSeance({ debut: s.debut, nom: null })} ».`)
    const champ = el('input', 'saisie-nom-seance') as HTMLInputElement
    champ.type = 'text'; champ.maxLength = LONGUEUR_NOM_SEANCE; champ.value = s.nom ?? ''
    champ.placeholder = 'Activité d\'intro, Contrôle…'; champ.setAttribute('aria-label', 'Nom de la séance')
    let reponse: string | null = null
    const actions = el('div', 'actions')
    const annuler = bouton('secondaire', 'Annuler', () => { reponse = null; d.close() })
    const garder = el('button', 'principal', 'Renommer'); garder.type = 'submit'
    actions.append(annuler, garder)
    form.append(titre, aide, champ, actions)
    form.addEventListener('submit', e => { e.preventDefault(); reponse = nomDeSeance(champ.value) ?? ''; d.close() })
    d.append(form)
    d.addEventListener('close', () => { d.remove(); ok(reponse) })
    fermerSurLeFond(d, () => d.close())
    racine.appendChild(d)
    d.showModal()
    champ.focus(); champ.select()
  })
}

// ---------- Les bandeaux sur le tableau ----------
export class BandeauxSeances {
  /** La lecture d'une séance passée, en haut de la page */
  readonly lecture: HTMLElement
  private texteLecture: HTMLElement
  /** « Lundi 8 h s'est arrêté page 3 · « Exercice 3 ». Reprendre la page · Voir la séance · × » */
  readonly reprise: HTMLElement
  private texteReprise: HTMLElement
  /** La séance que le bandeau « Reprendre » propose, et sa page */
  private proposee: { seance: string; page: string; pour: string } | null = null
  /** Les vignettes d'une séance passée, en bas */
  readonly tiroir: HTMLElement
  private titreTiroir: HTMLElement
  private rangee: HTMLElement
  private boutonAvant: HTMLButtonElement
  private boutonApres: HTMLButtonElement
  private boutonReprendre: HTMLButtonElement
  private boutonVoir: HTMLButtonElement
  /** La séance que montre le tiroir, et la vignette choisie */
  private montree: { seance: string; page: string | null } | null = null

  constructor(private app: App, private racine: HTMLElement, private vignettes: Vignettes) {
    this.lecture = el('div', 'bandeau-seance bandeau-lecture')
    this.lecture.setAttribute('role', 'status')
    this.lecture.hidden = true
    this.texteLecture = el('span', 'texte')
    this.lecture.append(this.texteLecture,
      bouton('principal petit', 'Reprendre la page', () => { this.app.reprendrePage(this.app.page) }),
      bouton('secondaire petit retour-aujourdhui', 'Retour à aujourd\'hui', () => this.app.retourAujourdhui()))
    this.reprise = el('div', 'bandeau-seance bandeau-reprise')
    this.reprise.setAttribute('role', 'status')
    this.reprise.hidden = true
    this.texteReprise = el('span', 'texte')
    const fermer = bouton('fermer-seance', '', () => this.fermerReprise())
    fermer.innerHTML = icone('fermer'); fermer.title = 'Fermer'; fermer.setAttribute('aria-label', 'Fermer')
    this.reprise.append(this.texteReprise,
      bouton('principal petit', 'Reprendre la page', () => { const p = this.proposee; this.fermerReprise(); if (p) this.app.reprendrePage(p.page) }),
      bouton('secondaire petit', 'Voir la séance', () => { const p = this.proposee; this.fermerReprise(); if (p) this.ouvrirTiroir(p.seance, p.page) }),
      fermer)
    this.tiroir = el('section', 'tiroir-seance')
    this.tiroir.setAttribute('aria-label', 'Séance précédente')
    this.tiroir.hidden = true
    const tete = el('div', 'tiroir-tete')
    this.titreTiroir = el('h3')
    const fermerTiroir = bouton('fermer-seance', '', () => this.fermerTiroir())
    fermerTiroir.innerHTML = icone('fermer'); fermerTiroir.title = 'Fermer (Échap)'; fermerTiroir.setAttribute('aria-label', 'Fermer')
    tete.append(this.titreTiroir, fermerTiroir)
    this.rangee = el('div', 'tiroir-vignettes')
    this.rangee.setAttribute('role', 'listbox'); this.rangee.setAttribute('aria-label', 'Les pages de la séance')
    const actions = el('div', 'tiroir-actions')
    this.boutonReprendre = bouton('principal petit', 'Reprendre la page', () => { const p = this.montree?.page; if (!p) return; this.fermerTiroir(); this.app.reprendrePage(p) })
    this.boutonVoir = bouton('secondaire petit', 'Voir la page', () => { const p = this.montree?.page; if (!p) return; this.fermerTiroir(); this.app.voirPage(p) })
    this.boutonAvant = bouton('secondaire petit', '‹ Séance d\'avant', () => this.voisine(-1))
    this.boutonApres = bouton('secondaire petit', 'Séance d\'après ›', () => this.voisine(1))
    actions.append(this.boutonReprendre, this.boutonVoir, this.boutonAvant, this.boutonApres)
    this.tiroir.append(tete, this.rangee, actions)
    racine.append(this.lecture, this.reprise, this.tiroir)
    window.addEventListener('keydown', e => {
      if (e.key === 'Escape' && !this.tiroir.hidden && !document.querySelector('dialog[open]')) { e.preventDefault(); e.stopPropagation(); this.fermerTiroir() }
    }, true)
  }

  /** Remis à jour avec l'interface : la lecture d'une séance passée se dit */
  maj() {
    const app = this.app, s = app.seanceVue
    const lecture = app.enSeancePassee && !!s
    if (lecture) {
      const t = `Séance ${deLaSeance(s!, Date.now())} : vous la regardez sans la modifier.`
      if (this.texteLecture.textContent !== t) this.texteLecture.textContent = t
    }
    if (this.lecture.hidden === lecture) this.lecture.hidden = !lecture
    document.body.classList.toggle('en-lecture-seance', lecture)
    // Le bandeau « Reprendre » s'en va dès qu'on change de séance ou qu'on écrit sur la page
    const p = this.proposee
    if (p && !this.reprise.hidden) {
      const jour = app.tableau.derniereSeance()
      if (!jour || jour.id !== p.pour || app.enSeancePassee || jour.pages.some(x => (app.tableau.formesDe(x)?.size ?? 0) > 0)) this.fermerReprise()
    }
  }

  /** Une séance commence : le bandeau « Reprendre » propose la page où la
   *  précédente s'est arrêtée (celle où l'on a écrit en dernier) */
  seanceCommencee(precedente: SeanceDuClasseur | null) {
    this.fermerTiroir()
    const t = this.app.tableau, jour = t.derniereSeance()
    if (!precedente || !jour) { this.fermerReprise(); return }
    const page = t.derniereEcriteDe(precedente.id)
    if (!page) { this.fermerReprise(); return }
    const k = precedente.pages.indexOf(page) + 1
    const nom = t.nomDe(page)
    this.proposee = { seance: precedente.id, page, pour: jour.id }
    this.texteReprise.textContent = `${quandMajuscule(precedente.debut, Date.now())} s'est arrêté page ${k}${nom ? ` · « ${nom} »` : ''}.`
    this.reprise.hidden = false
  }

  fermerReprise() { this.reprise.hidden = true; this.proposee = null }

  get tiroirOuvert() { return !this.tiroir.hidden }

  /** La séance précédente (la séance avant celle qu'on regarde), en vignettes */
  ouvrirSeancePrecedente() {
    const l = this.app.tableau.seancesDuClasseur().filter(s => s.pages.length)
    const ici = this.app.seanceVue ?? this.app.tableau.derniereSeance()
    const k = ici ? l.findIndex(s => s.id === ici.id) : l.length
    const avant = l[(k < 0 ? l.length : k) - 1]
    if (!avant) { this.app.ui.message('Pas de séance avant celle-ci dans ce chapitre.'); return }
    this.ouvrirTiroir(avant.id, this.app.tableau.derniereEcriteDe(avant.id))
  }

  /** Le tiroir sur cette séance (page : la vignette choisie) */
  ouvrirTiroir(seance: string, page: string | null) {
    const l = this.app.tableau.seancesDuClasseur().filter(s => s.pages.length)
    const s = l.find(x => x.id === seance)
    if (!s) return
    this.fermerReprise()
    this.montree = { seance, page: page && s.pages.includes(page) ? page : s.pages[s.pages.length - 1] }
    this.titreTiroir.textContent = `${s.nom ?? `Séance du ${dateCourteMajuscule(s.debut).replace(/^./, c => c.toLowerCase())}`} · ${pluriel(s.pages.length, 'page')}`
    const jour = this.app.tableau.derniereSeance()
    const k = l.indexOf(s)
    this.boutonAvant.hidden = k <= 0
    // Vers la séance du jour, on n'y va pas par ici
    this.boutonApres.hidden = k >= l.length - 1 || l[k + 1]?.id === jour?.id
    const passee = s.id !== jour?.id
    this.boutonReprendre.hidden = !passee
    this.rangee.replaceChildren()
    const hauteur = 96, largeur = 128
    s.pages.forEach((p, i) => {
      const v = el('button', 'tiroir-vignette')
      v.type = 'button'; v.dataset.page = p
      v.setAttribute('role', 'option')
      const nom = this.app.tableau.nomDe(p)
      v.setAttribute('aria-label', `Page ${i + 1}${nom ? `, ${nom}` : ''}`)
      v.append(this.vignettes.vignette(p, largeur, hauteur), el('span', 'numero', String(i + 1)))
      if (nom) v.append(el('span', 'nom', nom))
      v.addEventListener('click', () => { if (this.montree) this.montree.page = p; this.majChoix() })
      v.addEventListener('dblclick', () => { this.fermerTiroir(); this.app.voirPage(p) })
      this.rangee.append(v)
    })
    this.tiroir.hidden = false
    this.majChoix()
    ;(this.rangee.querySelector('[aria-selected="true"]') as HTMLElement | null)?.focus()
  }

  private majChoix() {
    for (const v of this.rangee.querySelectorAll<HTMLElement>('.tiroir-vignette')) {
      const oui = v.dataset.page === this.montree?.page
      v.setAttribute('aria-selected', String(oui))
    }
  }

  private voisine(sens: 1 | -1) {
    const l = this.app.tableau.seancesDuClasseur().filter(s => s.pages.length)
    const k = l.findIndex(s => s.id === this.montree?.seance)
    const s = l[k + sens]
    if (s) this.ouvrirTiroir(s.id, this.app.tableau.derniereEcriteDe(s.id))
  }

  fermerTiroir() { this.tiroir.hidden = true; this.montree = null; this.rangee.replaceChildren() }
}
