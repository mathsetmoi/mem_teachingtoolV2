// =============================================================
// LA CORBEILLE DES PAGES
// Les pages supprimées (la poubelle de la barre du haut, Supprimer dans la
// trieuse) attendent ici, une vue de la trieuse : chacune en vignette
// (son état actuel), son nom, quand elle a été supprimée ; « Remettre » la
// rend à sa place d'avant (après sa voisine si elle est encore là, sinon à
// la fin), avec toute son histoire ; « Supprimer définitivement » (une
// page) ou « Vider la corbeille » (toutes), après une question.
// OÙ C'EST NOTÉ : une page est dans la corbeille quand sa Y.Map est dans la
// carte `pages` du document, qu'elle n'est plus dans `ordre`, qu'elle a
// quelque chose (une forme, un nom) et que la carte de premier niveau
// `corbeille` (id → { t, apres, index, definitif }) ne la marque pas
// définitive (voir Tableau.dansLaCorbeille). Cette carte est hors des
// pages : y écrire n'est ni une étape du film, ni une étape d'annulation ;
// elle survit au rechargement et au fichier .memc sans autre code. Le
// retrait de l'ordre, lui, est une étape « seulOrdre » (jamais un geste).
// Une page jetée avant la corbeille (lot 2, sans entrée) y est aussi, et
// se remet à la fin ; une page effacée par l'ancienne suppression (sa Y.Map
// détruite) n'y est jamais.
// Remettre passe par le journal de la trieuse (« Annuler » la renvoie dans
// la corbeille). Supprimer définitivement n'efface rien : la page garde sa
// Y.Map et son histoire, elle ne revient seulement plus parmi les pages, par
// aucun chemin (ni Ctrl+Z, ni « Annuler ») ; dans la revue, elle reste une
// « Page jetée » du tiroir « Que revoir ? » avec toute son histoire, et une
// séance passée qui l'a vue s'exporte comme avant. C'est confirmé par une
// question : hors du journal, qui se vide (aucune de ses actions ne
// pourrait plus se défaire exactement).
// =============================================================
import type { Tableau } from '../document'
import type { Entree, JournalPages } from './journal'
import type { Vignettes } from './vignettes'
import { pagesLisibles, quandLisible } from '../fichier'
import { icone } from '../icones'

/** Une page de la corbeille, telle que la donne Tableau.pagesDeLaCorbeille */
export interface PageDeLaCorbeille { id: string; t: number | null; derniere: number | null; ancienne: boolean }

/** « Supprimée aujourd'hui à 10 h 05 » ; pour une page jetée avant la
 *  corbeille (sans heure de suppression) : « Supprimée avant cette version ·
 *  dernière écriture hier à 9 h 12 » */
export function dateDeSuppression(x: Pick<PageDeLaCorbeille, 't' | 'derniere'>, maintenant = Date.now()): string {
  if (x.t !== null && Number.isFinite(x.t)) return `Supprimée ${quandLisible(x.t, maintenant)}`
  const d = x.derniere !== null && Number.isFinite(x.derniere) ? ` · dernière écriture ${quandLisible(x.derniere, maintenant)}` : ''
  return `Supprimée avant cette version${d}`
}

/** Combien de pages dans la corbeille (le bouton du bandeau) : sans relire
 *  le film, contrairement à pagesDeLaCorbeille */
export function compterCorbeille(t: Tableau): number {
  const ordre = new Set(t.ordre.toArray())
  let n = 0
  for (const id of t.pages.keys()) if (t.dansLaCorbeille(id, ordre)) n++
  return n
}

/** Le libellé du bouton du bandeau : « Corbeille (3) », et son nom pour un
 *  lecteur d'écran : « Corbeille : 3 pages », « Corbeille : vide » */
export function libelleCorbeille(n: number): { texte: string; nom: string } {
  return n ? { texte: `Corbeille (${n})`, nom: `Corbeille : ${pagesLisibles(n)}` } : { texte: 'Corbeille', nom: 'Corbeille : vide' }
}

/** Ce que la question dit avant de vider la corbeille de n pages */
export function texteVider(n: number): string {
  return n > 1
    ? `Les ${n} pages de la corbeille seront supprimées définitivement : elles ne pourront plus être remises parmi les pages. Leur histoire reste visible dans Revoir la construction (le tableau garde tout ce qui a été écrit).`
    : 'La page de la corbeille sera supprimée définitivement : elle ne pourra plus être remise parmi les pages. Son histoire reste visible dans Revoir la construction (le tableau garde tout ce qui a été écrit).'
}

const TEXTE_UNE = 'Elle ne pourra plus être remise parmi les pages. Son histoire reste visible dans Revoir la construction (le tableau garde tout ce qui a été écrit).'

/** Ce que la vue demande à la trieuse */
export interface HoteCorbeille {
  readonly tableau: Tableau
  readonly journal: JournalPages
  readonly vignettes: Vignettes
  message(texte: string): void
  /** Un message avec son « Annuler » (le journal de la trieuse) */
  annoncer(texte: string, e: Entree): void
  /** Le message à action de cette clé s'en va (« Page N supprimée · Annuler »
   *  du tableau, clé 'page:' + id : il ne pourrait plus rien rendre) */
  oublierAction(cle?: string): void
  /** Le journal de la trieuse se vide, et son dernier « Annuler » s'en va */
  oublierJournal(): void
  /** La vue se ferme, les pages reviennent : page, la carte remise (montrée,
   *  avec le focus) ; null : le focus retourne au bouton « Corbeille »
   *  (rendreFocus : seulement s'il était dans la vue) */
  revenir(page: string | null, rendreFocus: boolean): void
}

/** Une carte de la corbeille et ce qu'on y met à jour */
interface Carte { el: HTMLElement; nom: HTMLElement; date: HTMLElement; remettre: HTMLButtonElement; supprimer: HTMLButtonElement }

export class VueCorbeille {
  readonly el: HTMLElement
  private grille: HTMLElement
  private compte: HTMLElement
  private vide: HTMLElement
  private boutonVider: HTMLButtonElement
  private retour: HTMLButtonElement
  private cartes = new Map<string, Carte>()
  /** Les pages montrées, dans l'ordre de la liste */
  private liste: string[] = []
  private taille = { l: 0, h: 0 }
  private ro: ResizeObserver | null = null
  private remiseATaille = 0
  /** Une mise à jour attend la fin de la transaction (l'ordre et la corbeille changent ensemble) */
  private majPrevue = false
  /** La question ouverte (Supprimer définitivement, Vider) */
  private question: HTMLDialogElement | null = null

  constructor(private hote: HoteCorbeille) {
    const el = this.el = document.createElement('div')
    el.className = 'trieuse-corbeille'
    el.setAttribute('role', 'region'); el.setAttribute('aria-label', 'Corbeille')
    el.hidden = true
    const tete = document.createElement('div'); tete.className = 'corbeille-tete'
    this.retour = this.bouton('Pages', 'avant', () => this.fermer(), 'Revenir aux pages (Échap)')
    this.retour.setAttribute('aria-label', 'Revenir aux pages')
    this.retour.classList.add('corbeille-retour')
    const titre = Object.assign(document.createElement('h2'), { textContent: 'Corbeille' })
    this.compte = Object.assign(document.createElement('span'), { className: 'trieuse-compte' })
    this.boutonVider = this.bouton('Vider la corbeille', 'poubelle', () => this.demanderVider(), 'Supprimer définitivement toutes les pages de la corbeille')
    this.boutonVider.classList.add('danger', 'corbeille-vider')
    tete.append(this.retour, titre, this.compte, this.boutonVider)
    const note = Object.assign(document.createElement('p'), { className: 'corbeille-note',
      textContent: 'Les pages supprimées attendent ici : Remettre les rend à leur place, avec toute leur histoire.' })
    this.grille = document.createElement('ul')
    this.grille.className = 'corbeille-grille'
    this.grille.setAttribute('aria-label', 'Les pages de la corbeille, la dernière supprimée d\'abord')
    this.vide = Object.assign(document.createElement('p'), { className: 'corbeille-vide', textContent: 'La corbeille est vide.', hidden: true })
    el.append(tete, note, this.grille, this.vide)
    // Ni le menu du navigateur sur une vignette (« Enregistrer l'image »)
    el.addEventListener('contextmenu', e => e.preventDefault())
  }

  get ouverte() { return !this.el.hidden }
  /** Une question est ouverte (Échap la ferme d'abord) */
  get enQuestion() { return !!this.question }

  private bouton(texte: string, nomIcone: string, faire: () => void, titre: string): HTMLButtonElement {
    const b = document.createElement('button')
    b.type = 'button'; b.className = 'trieuse-bouton'; b.title = titre
    b.innerHTML = icone(nomIcone)
    b.append(Object.assign(document.createElement('span'), { className: 'libelle', textContent: texte }))
    b.addEventListener('click', faire)
    return b
  }

  // ---------- Ouvrir, fermer ----------
  /** La vue s'ouvre (le bouton « Corbeille » de la trieuse) : le focus va au
   *  premier « Remettre » (la dernière page supprimée), ou à « Pages » */
  ouvrir() {
    if (this.ouverte) return
    this.el.hidden = false
    this.liste = []
    this.maj()
    this.majTailles()
    this.ro = new ResizeObserver(() => {
      cancelAnimationFrame(this.remiseATaille)
      this.remiseATaille = requestAnimationFrame(() => this.majTailles())
    })
    this.ro.observe(this.grille)
    const premier = this.liste.length ? this.cartes.get(this.liste[0])!.remettre : this.retour
    premier.focus({ preventScroll: true })
  }

  /** Retour aux pages (« Pages », Échap). page : la carte à montrer (une
   *  page remise). Les vignettes quittent le document (elles ne se
   *  repeignent plus). sansRetour : la trieuse se ferme (rien à montrer). */
  fermer(page: string | null = null, sansRetour = false) {
    if (!this.ouverte) return
    this.question?.close()
    const avaitFocus = this.el.contains(document.activeElement)
    this.ro?.disconnect(); this.ro = null
    cancelAnimationFrame(this.remiseATaille)
    this.el.hidden = true
    this.grille.replaceChildren()
    this.cartes.clear(); this.liste = []
    if (!sansRetour) this.hote.revenir(page, avaitFocus || page !== null)
  }

  /** La corbeille ou l'ordre a changé (une remise, une suppression, un
   *  autre onglet) : la liste se refait à la fin de la transaction */
  prevoirMaj() {
    if (!this.ouverte || this.majPrevue) return
    this.majPrevue = true
    queueMicrotask(() => { this.majPrevue = false; if (this.ouverte) this.maj() })
  }

  // ---------- La liste ----------
  /** Une carte par page de la corbeille, la dernière supprimée d'abord (les
   *  cartes déjà là sont gardées, avec leur vignette) ; le focus qui était
   *  sur une carte partie va à la suivante (ou à la précédente, ou à
   *  « Pages »). */
  private maj() {
    const pages = this.hote.tableau.pagesDeLaCorbeille()
    const ids = pages.map(x => x.id)
    const actif = document.activeElement as HTMLElement | null
    const carteActive = actif?.closest?.('.carte-corbeille') as HTMLElement | null
    const pageActive = carteActive?.dataset.page ?? null
    const rangActif = pageActive ? this.liste.indexOf(pageActive) : -1
    const boutonActif = carteActive && actif ? (actif === this.cartes.get(pageActive!)?.supprimer ? 'supprimer' : 'remettre') : null
    const vues = new Set(ids)
    for (const [id, c] of this.cartes) if (!vues.has(id)) { c.el.remove(); this.cartes.delete(id) }
    let avant: Element | null = this.grille.firstElementChild
    const maintenant = Date.now()
    for (const x of pages) {
      let c = this.cartes.get(x.id)
      if (!c) { c = this.creerCarte(x.id); this.cartes.set(x.id, c) }
      if (c.el !== avant) this.grille.insertBefore(c.el, avant)
      else avant = avant.nextElementSibling
      this.majCarte(c, x, maintenant)
    }
    this.liste = ids
    this.compte.textContent = ids.length ? pagesLisibles(ids.length) : ''
    this.vide.hidden = ids.length > 0
    this.grille.hidden = !ids.length
    this.boutonVider.disabled = !ids.length
    this.boutonVider.setAttribute('aria-disabled', String(!ids.length))
    // Les vignettes de la corbeille d'abord
    this.hote.vignettes.prioriser(ids)
    // Le focus perdu avec sa carte : la suivante, la précédente, sinon « Pages »
    if (pageActive && !vues.has(pageActive) && this.ouverte) {
      const suivante = ids[Math.min(Math.max(0, rangActif), ids.length - 1)]
      const c = suivante ? this.cartes.get(suivante) : null
      ;(c ? (boutonActif === 'supprimer' ? c.supprimer : c.remettre) : this.retour).focus({ preventScroll: true })
    }
  }

  private creerCarte(id: string): Carte {
    const el = document.createElement('li')
    el.className = 'carte-corbeille'; el.dataset.page = id
    const image = Object.assign(document.createElement('div'), { className: 'carte-image' })
    image.setAttribute('aria-hidden', 'true')
    const nom = Object.assign(document.createElement('div'), { className: 'corbeille-nom' })
    const date = Object.assign(document.createElement('div'), { className: 'corbeille-date' })
    const boutons = Object.assign(document.createElement('div'), { className: 'corbeille-boutons' })
    const remettre = Object.assign(document.createElement('button'), { type: 'button', className: 'corbeille-remettre', textContent: 'Remettre' })
    remettre.addEventListener('click', () => this.remettre(id))
    const supprimer = Object.assign(document.createElement('button'), { type: 'button', className: 'corbeille-supprimer danger', textContent: 'Supprimer définitivement' })
    supprimer.addEventListener('click', () => this.demanderSupprimer(id))
    boutons.append(remettre, supprimer)
    el.append(image, nom, date, boutons)
    const c: Carte = { el, nom, date, remettre, supprimer }
    if (this.taille.l) this.poserVignette(c, id)
    return c
  }

  private majCarte(c: Carte, x: PageDeLaCorbeille, maintenant: number) {
    const nom = this.hote.tableau.nomDe(x.id)
    const texte = nom ?? 'Page sans nom'
    if (c.nom.textContent !== texte) { c.nom.textContent = texte; c.nom.title = nom ?? '' }
    c.nom.classList.toggle('sans-nom', !nom)
    const date = dateDeSuppression(x, maintenant)
    if (c.date.textContent !== date) c.date.textContent = date
    // Le nom de la carte et de ses boutons, pour un lecteur d'écran
    const sujet = nom ? `« ${nom} »` : 'la page sans nom'
    c.el.setAttribute('aria-label', `${texte}, ${date.charAt(0).toLowerCase()}${date.slice(1)}`)
    c.remettre.setAttribute('aria-label', `Remettre ${sujet} parmi les pages`)
    c.supprimer.setAttribute('aria-label', `Supprimer définitivement ${sujet}`)
  }

  /** La taille des vignettes : celle des cartes de la grille (le même
   *  rapport que la trieuse, --rapport, posé sur elle) */
  private majTailles() {
    if (!this.ouverte) return
    const image = this.grille.querySelector<HTMLElement>('.carte-image')
    if (!image) return
    const l = image.clientWidth, h = image.clientHeight
    if (!(l > 0 && h > 0) || (Math.abs(l - this.taille.l) < 1 && Math.abs(h - this.taille.h) < 1)) return
    this.taille = { l, h }
    for (const [id, c] of this.cartes) this.poserVignette(c, id)
  }

  private poserVignette(c: Carte, id: string) {
    const v = this.hote.vignettes.vignette(id, this.taille.l, this.taille.h)
    const image = c.el.querySelector('.carte-image')!
    const ancien = image.querySelector('canvas')
    if (ancien === v) return
    if (ancien) ancien.replaceWith(v)
    else image.prepend(v)
  }

  // ---------- Remettre ----------
  /** La page revient parmi les pages, à sa place d'avant (voir
   *  Tableau.remettrePage), par le journal de la trieuse ; on revient aux
   *  pages, sa carte montrée, avec le focus ; « Page remise : c'est la page
   *  4 », avec « Annuler ». */
  private remettre(id: string) {
    const t = this.hote.tableau
    let place = -1
    const e = this.hote.journal.faire('page remise', () => { place = t.remettrePage(id) })
    if (!e || place < 0) { this.hote.message('Cette page n\'est plus dans la corbeille.'); this.maj(); return }
    // Le message de la poubelle qui la rendait n'a plus d'objet
    this.hote.oublierAction('page:' + id)
    this.fermer(id)
    this.hote.annoncer(`Page remise : c'est la page ${place + 1}`, e)
  }

  // ---------- Supprimer définitivement, vider ----------
  private demanderSupprimer(id: string) {
    if (!this.cartes.has(id)) return
    void this.demander({
      titre: 'Supprimer définitivement cette page ?', texte: TEXTE_UNE, bouton: 'Supprimer définitivement',
    }).then(oui => { if (oui) this.supprimerDefinitivement([id]) })
  }

  private demanderVider() {
    const n = this.liste.length
    if (!n) return
    void this.demander({ titre: 'Vider la corbeille ?', texte: texteVider(n), bouton: 'Vider la corbeille' })
      .then(oui => { if (oui) this.supprimerDefinitivement([...this.liste], true) })
  }

  /** Les pages ne reviendront plus (Tableau.supprimerDefinitivement : leur
   *  entrée le dit, leurs marques d'annulation s'en vont ; rien d'autre ne
   *  change, leur histoire reste). Le message « Page N supprimée · Annuler »
   *  encore à l'écran s'en va (il ne peut plus rien rendre), et le journal
   *  de la trieuse se vide : l'état des pages a changé hors de lui. */
  private supprimerDefinitivement(ids: string[], vider = false) {
    const n = this.hote.tableau.supprimerDefinitivement(ids)
    for (const id of ids) this.hote.oublierAction('page:' + id)
    if (!n) { this.maj(); return }
    this.hote.oublierJournal()
    this.maj()
    this.hote.message(vider ? `Corbeille vidée (${pagesLisibles(n)})` : 'Page supprimée définitivement')
  }

  /** Une question dans une fenêtre de l'outil (pas confirm()), créée au
   *  moment de s'ouvrir (jamais inerte), modale : « Annuler » a le focus
   *  d'abord ; Échap ou un clic à côté la ferment sans rien faire (la
   *  corbeille reste ouverte). Le focus revient où il était. Vrai : on a
   *  confirmé. */
  private demander(o: { titre: string; texte: string; bouton: string }): Promise<boolean> {
    this.question?.close()
    return new Promise(ok => {
      const avant = document.activeElement as HTMLElement | null
      const d = document.createElement('dialog')
      d.className = 'dialogue dialogue-corbeille'
      d.innerHTML = `<h2></h2><div class="corps"><p></p><div class="actions">
        <button type="button" class="secondaire" data-a="annuler">Annuler</button>
        <button type="button" class="principal danger-plein" data-a="oui"></button></div></div>`
      d.querySelector('h2')!.textContent = o.titre
      d.querySelector('p')!.textContent = o.texte
      const oui = d.querySelector<HTMLButtonElement>('[data-a="oui"]')!, non = d.querySelector<HTMLButtonElement>('[data-a="annuler"]')!
      oui.textContent = o.bouton
      let reponse = false
      d.addEventListener('close', () => {
        d.remove()
        if (this.question === d) this.question = null
        if (avant?.isConnected && !this.el.hidden) avant.focus({ preventScroll: true })
        ok(reponse)
      })
      d.addEventListener('click', e => { if (e.target === d) d.close() })
      non.addEventListener('click', () => d.close())
      oui.addEventListener('click', () => { reponse = true; d.close() })
      document.body.appendChild(d)
      this.question = d
      d.showModal()
      non.focus()
    })
  }
}
