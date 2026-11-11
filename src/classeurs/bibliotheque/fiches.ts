// =============================================================
// LA BIBLIOTHÈQUE : OUVRIR, FERMER, LES FICHES ET LEURS CARTES
// Des méthodes de la classe Bibliotheque (src/classeurs/bibliotheque.ts), rangées ici par sujet :
// elles s'ajoutent à la classe à la fin de bibliotheque.ts (ajouterMethodes).
// =============================================================
import type { Bibliotheque } from '../bibliotheque'
import { icone } from '../../icones'
import { dernierGesteAuClavier, fermerMenu, rendreLeFocus } from '../../menus'
import { ecranTactile } from '../../pointeurs'
import { ordreALaMain } from '../../seances'
import { TRIS, cheminLisible, cleDe, compter, couleurDe, dossierVisible, enfants, estDans, etiquettesDe, etiquettesEffectives, filAriane, libelleDossier, porte, texteLecteurDossier, trier } from '../arbre'
import { CASE, CLE_DOSSIER, CLE_FILTRE, DOSSIER, ECRIRE_LA_FICHE_MAX, FOCUSABLE, RAFRAICHIR, REGLAGE_CONSEIL, SVG_DOSSIER, attendre, ecrireSession } from '../bibliotheque'
import type { Liste } from '../bibliotheque'
import { urlDuClasseur, visible } from '../demarrage'
import type { FicheClasseur, FicheDossier } from '../demarrage'
import { resumeEtat } from '../etat'
import type { ActionEtat } from '../etat'
import { HORS_CHAPITRE, estSeancesIsolees, isoleesEnQueue } from '../isolees'
import { libelleCarte, libelleSeances, lignesDesSeances, nombreDeClasseurs, recents, texteLecteur, titreCle, titreDrive } from '../liste'
import type { LigneSeance } from '../liste'
import type { ChangementBibliotheque } from '../registre'

export const methodesFiches = {
  // ---------- Ouvrir, fermer ----------
  /** retour : l'élément qui reprend le focus à la fermeture (le bouton du
   *  classeur) ; auRetour : appelé quand le classeur revient */
  ouvrir(this: Bibliotheque, o: { retour?: HTMLElement | null; auRetour?: (() => void) | null } = {}): void {
    if (this.ouvert) return
    this.retour = o.retour ?? null
    this.ouverteAuClavier = dernierGesteAuClavier()
    this.auRetour = o.auRetour ?? null
    document.body.classList.add('en-bibliotheque')
    // La recherche relit les classeurs (ils ont pu changer depuis)
    this.recherche.oublier()
    if (this.recherche.active) this.recherche.rafraichir()
    // Le reste de l'écran ne répond plus, ni au clavier ni au lecteur
    // d'écran ; sauf le message (il passe au-dessus d'elle) et les fenêtres
    this.inertes = []
    for (const c of this.racine.children) {
      if (c === this.el || !(c instanceof HTMLElement) || c.inert || c.classList.contains('toast') || c instanceof HTMLDialogElement) continue
      c.inert = true; this.inertes.push(c)
    }
    this.el.classList.toggle('sans-tactile', !ecranTactile())
    this.fermerBouton.hidden = !this.peutFermer
    this.boutonBandeau.hidden = !this.menuDuBandeau.length
    this.survols = 0
    this.depot.hidden = true
    this.el.hidden = false
    window.addEventListener('keydown', this.surTouche, true)
    this.minuterie = window.setInterval(() => { if (!this.occupe) this.rendre(null) }, RAFRAICHIR)
    this.majLigneOuvert()
    // L'aperçu du classeur de cet onglet, s'il a changé depuis le dernier
    void this.hote.rafraichirApercu?.().then(fait => { if (fait && this.hote.classeur) void this.apercuChange(this.hote.classeur.id) }).catch(() => {})
    // Le focus d'abord sur le bandeau (l'écran est vide un instant), puis
    // sur la carte du classeur ouvert, ou la première
    this.el.querySelector<HTMLElement>('.biblio-nouveau')?.focus({ preventScroll: true })
    // La fiche du classeur de cet onglet d'abord (1 s au plus) : sa carte
    // dit son vrai nombre de pages et sa date
    const fiche = Promise.resolve(this.hote.ecrireLaFiche?.()).catch(() => { /* la carte dit ce que sait l'index */ })
    void Promise.race([fiche, attendre(ECRIRE_LA_FICHE_MAX)]).then(() => this.charger()).then(() => {
      // Les bases de classeur sans fiche : une fois par chargement de la page
      void this.chercherLesOrphelines()
      if (!this.ouvert || this.listes.some(l => l.el.contains(document.activeElement))) return
      const l = this.recents.ordre.length ? this.recents : this.tous
      const id = l.focusId ?? l.ordre[0]
      if (id && document.activeElement === this.el.querySelector('.biblio-nouveau')) this.focusCarte(l, id)
    })
    void this.majPlace()
  },

  /** Échap, ×, ou le classeur de cet onglet choisi : le classeur revient. La
   *  bibliothèque seule (sans classeur) ne se ferme pas, ni pendant qu'on
   *  part vers un autre classeur (ce qui attend s'écrit). Un nom qu'on
   *  tapait est gardé. */
  fermer(this: Bibliotheque): void {
    if (!this.ouvert || !this.peutFermer) return
    this.annulerGlisser()
    if (this.vue.ouverte) this.quitterCorbeille(false)
    if (this.vueSeances.ouverte) this.quitterVueSeances(false)
    if (this.menuCarte || this.menuBandeauOuvert || this.menuTriOuvert) fermerMenu()
    this.finirSaisie(true)
    this.annulerClicNom()
    window.removeEventListener('keydown', this.surTouche, true)
    clearInterval(this.minuterie); this.minuterie = 0
    this.annulerAppui()
    this.appuiLeve = null
    this.deuxDoigts = null
    // Les aperçus : leurs adresses objet sont révoquées (relues à la prochaine ouverture)
    this.oublierImages()
    this.el.hidden = true
    document.body.classList.remove('en-bibliotheque')
    for (const c of this.inertes) c.inert = false
    this.inertes = []
    this.hote.ui?.maj()
    // Le focus revient au bouton du classeur. Il ne compte comme venu du
    // clavier (Espace y rouvrirait la bibliothèque) que si elle a été ouverte
    // et fermée au clavier : ouverte d'un clic, puis fermée par ×, par Échap
    // ou par la carte, Espace + glisser déplace la vue, comme sur les autres
    // boutons de la barre
    const retour = this.retour
    this.retour = null
    if (retour?.isConnected) rendreLeFocus(retour, this.ouverteAuClavier && dernierGesteAuClavier())
    const apres = this.auRetour
    this.auRetour = null
    apres?.()
  },

  // ---------- Les fiches ----------
  /** Toutes les fiches et tous les dossiers, relus ; puis toutes les cartes */
  charger(this: Bibliotheque): Promise<void> {
    this.file = this.file.then(async () => {
      const [fiches, dossiers, conseil, images] = await Promise.all([this.registre.classeurs(), this.registre.dossiers(),
        this.registre.reglage<string>(REGLAGE_CONSEIL).catch(() => 'vu'), this.registre.apercus().catch(() => new Map<string, Blob>())])
      this.fiches = new Map(fiches.map(f => [f.id, f]))
      this.dossiers = new Map(dossiers.map(d => [d.id, d]))
      // Les aperçus : une adresse objet chacun (gardée si l'image n'a pas changé de taille)
      for (const id of [...this.images.keys()]) if (!images.has(id)) this.poserImage(id, undefined)
      for (const [id, b] of images) { const x = this.images.get(id); if (!x || x.blob.size !== b.size || x.blob.type !== b.type) this.poserImage(id, b) }
      this.conseilVu = conseil === 'vu'
      this.lu = true
      this.aAppliquer = { classeurs: new Set(), dossiers: false }
      if (this.ouvert) this.rendre(null)
    }).catch(() => {
      this.hote.message('La bibliothèque des classeurs ne se lit pas dans ce navigateur.')
    })
    return this.file
  },

  /** La fiche du classeur de cet onglet vient d'être écrite par son suivi
   *  (sa date, son nombre de pages) : sa carte se refait, comme pour un
   *  changement venu d'un autre onglet */
  ficheChange(this: Bibliotheque, id: string): void { this.surChangement({ type: 'change', classeurs: [id] }) },

  /** Ce qu'un autre onglet a changé (BroadcastChannel) : seulement ces
   *  classeurs-là (les dossiers, peu nombreux, se relisent tous) */
  surChangement(this: Bibliotheque, c: ChangementBibliotheque): void {
    for (const id of c.classeurs ?? []) this.aAppliquer.classeurs.add(id)
    if (c.dossiers?.length) this.aAppliquer.dossiers = true
    if (this.ouvert && !this.occupe) void this.appliquer()
  },

  appliquer(this: Bibliotheque): Promise<void> {
    this.file = this.file.then(async () => {
      if (!this.ouvert || this.occupe) return
      const ids = [...this.aAppliquer.classeurs], dossiers = this.aAppliquer.dossiers
      if (!ids.length && !dossiers && !this.aRefaire) return
      this.aAppliquer = { classeurs: new Set(), dossiers: false }
      const lus = await Promise.all(ids.map(id => this.registre.classeur(id).catch(() => null)))
      ids.forEach((id, i) => {
        const f = lus[i]
        if (f) this.fiches.set(id, f)
        else if (f === undefined) this.fiches.delete(id)
      })
      // Leurs aperçus aussi (un autre onglet a pu en écrire un)
      await Promise.all(ids.map(id => this.relireImage(id)))
      if (dossiers) this.dossiers = new Map((await this.registre.dossiers()).map(d => [d.id, d]))
      // Un menu s'est ouvert pendant la lecture : à sa fermeture
      if (this.occupe) { for (const id of ids) this.aAppliquer.classeurs.add(id); if (dossiers) this.aAppliquer.dossiers = true; return }
      const tout = dossiers || this.aRefaire
      this.aRefaire = false
      // Les dossiers changent les étiquettes héritées et ce que comptent leurs
      // cartes : tout se refait ; sinon, seulement ces classeurs-là
      if (this.ouvert) this.rendre(tout ? null : new Set(ids))
    }).catch(() => { /* la prochaine ouverture relira tout */ })
    return this.file
  },

  /** Les classeurs qu'on montre : visibles (ni dans la corbeille, ni en
   *  train de naître ou de partir) */
  visibles(this: Bibliotheque): FicheClasseur[] {
    return [...this.fiches.values()].filter(f => visible(f, this.dossiers))
  },

  /** Une écriture de l'index faite d'ici : la page ne part pas avant sa fin */
  suivre<T>(this: Bibliotheque, p: Promise<T>): Promise<T> {
    this.ecritures = Promise.all([this.ecritures, p.catch(() => {})])
    return p
  },

  /** Change le dossier affiché (null : la racine), retenu pour l'onglet */
  changerDossier(this: Bibliotheque, id: string | null): void {
    this.dossierAffiche = id
    ecrireSession(CLE_DOSSIER, id)
  },

  /** Change le filtre de niveau (null : tous), retenu pour l'onglet */
  changerFiltre(this: Bibliotheque, nom: string | null): void {
    this.filtre = nom
    ecrireSession(CLE_FILTRE, nom)
  },

  /** Met l'écran à jour : Récents (à la racine, sans filtre), la rangée du
   *  filtre, le fil d'Ariane, la grille (les dossiers par nom, puis les
   *  classeurs selon le tri ; ou, avec un filtre, tous les classeurs de
   *  cette étiquette, avec leur chemin), le conseil. Les cartes sont
   *  gardées, seules celles qui ne sont pas à leur place bougent ; le
   *  contenu des cartes des ids changés (null : toutes) se refait. Le focus
   *  reste sur la même carte. Rien ne bouge pendant qu'on renomme (le champ
   *  perdrait le focus) : tout se refera à sa fermeture. */
  rendre(this: Bibliotheque, changes: Set<string> | null): void {
    if (!this.lu) return
    if (this.saisie) { this.aRefaire = true; return }
    const d = this.dossiers
    const tous = this.visibles()
    // Le dossier affiché n'est plus là (supprimé, mis à la corbeille ailleurs) : la racine
    if (this.dossierAffiche !== null) {
      const x = d.get(this.dossierAffiche)
      if (!x || !dossierVisible(x, d)) this.changerDossier(null)
    }
    // Une étiquette que plus aucun classeur ne porte : plus de filtre
    const etiquettes = etiquettesDe(tous, d)
    if (this.filtre !== null && !etiquettes.some(e => cleDe(e.nom) === cleDe(this.filtre!))) this.changerFiltre(null)
    const filtre = this.filtre, ici = this.dossierAffiche
    const aLaRacine = ici === null && filtre === null
    const rec = aLaRacine ? recents(tous).map(f => f.id) : []
    // (le classeur « Séances isolées » d'un dossier, lot 17, toujours en
    // dernier, quel que soit le tri ; Récents ne change pas)
    let cles: string[], sousDossiers = 0
    if (filtre !== null) cles = isoleesEnQueue(trier(tous.filter(f => porte(f, filtre, d)), this.tri)).map(f => f.id)
    else {
      const sous = enfants(ici, d)
      sousDossiers = sous.length
      cles = [...sous.map(x => DOSSIER + x.id), ...isoleesEnQueue(trier(tous.filter(f => estDans(f, ici, d)), this.tri)).map(f => f.id)]
    }
    // Le chemin sous le nom paraît ou s'en va : toutes les cartes
    if ((filtre !== null) !== this.plat) { this.plat = filtre !== null; changes = null }
    this.reconcilier(this.recents, rec, changes)
    this.reconcilier(this.tous, cles, changes, { chemin: this.plat })
    const rienDuTout = !tous.length && !sousDossiers && aLaRacine
    this.sectionRecents.hidden = !rec.length
    this.sectionTous.hidden = rienDuTout
    this.tous.el.hidden = !cles.length
    this.videDossier.hidden = !(!cles.length && ici !== null && filtre === null)
    this.vide.hidden = !rienDuTout
    const n = nombreDeClasseurs(tous.length)
    if (this.compte.textContent !== n) this.compte.textContent = n
    const label = filtre !== null ? `Classeurs du niveau « ${filtre} »` : ici === null ? 'Bibliothèque' : `Dossier « ${d.get(ici)?.nom ?? ''} »`
    if (this.tous.el.getAttribute('aria-label') !== label) this.tous.el.setAttribute('aria-label', label)
    this.majFiltre(etiquettes)
    this.majFil()
    this.majTri()
    this.majLigneOuvert()
    this.conseil.hidden = !(aLaRacine && this.conseilVu === false && d.size === 0)
    this.majCorbeille()
    for (const f of this.apresRendu) f()
  },

  reconcilier(this: Bibliotheque, l: Liste, cles: string[], changes: Set<string> | null, o: { chemin?: boolean } = {}): void {
    const actif = document.activeElement
    const focusIci = actif instanceof HTMLElement && l.el.contains(actif) ? actif.closest<HTMLElement>(CASE)?.dataset.cle ?? null : null
    const vus = new Set(cles)
    for (const [cle, c] of l.cartes) {
      if (vus.has(cle)) continue
      c.remove(); l.cartes.delete(cle)
    }
    if (!l.focusId || !vus.has(l.focusId)) {
      const ici = this.hote.classeur?.id
      l.focusId = (ici && vus.has(ici) ? ici : cles[0]) ?? null
    }
    const maintenant = Date.now()
    const fiches = [...this.fiches.values()]
    let avant: Element | null = l.el.firstElementChild
    for (const cle of cles) {
      let c = l.cartes.get(cle)
      const neuve = !c
      const dossier = cle.startsWith(DOSSIER)
      if (!c) { c = dossier ? this.creerCarteDossier(cle.slice(DOSSIER.length)) : this.creerCarte(cle); l.cartes.set(cle, c) }
      if (c !== avant) l.el.insertBefore(c, avant)
      else avant = avant.nextElementSibling
      // Une carte de dossier se refait toujours (ce qu'il contient a pu changer) : rien n'est touché qui n'a pas changé
      if (dossier) this.majCarteDossier(c, this.dossiers.get(cle.slice(DOSSIER.length))!, fiches)
      else if (neuve || !changes || changes.has(cle)) this.majCarte(c, this.fiches.get(cle)!, maintenant, o.chemin === true)
      const a = c.querySelector<HTMLElement>(FOCUSABLE)!
      const t = cle === l.focusId ? 0 : -1
      if (a.tabIndex !== t) a.tabIndex = t
    }
    l.ordre = cles
    // Déplacer une carte dans le document lui ôte le focus : il revient
    // (sur elle, ou sur la carte qui a pris sa place dans la rangée)
    if (focusIci && !l.el.contains(document.activeElement)) {
      const c = l.cartes.get(focusIci) ?? (l.focusId ? l.cartes.get(l.focusId) : undefined)
      c?.querySelector<HTMLElement>(FOCUSABLE)?.focus({ preventScroll: true })
    }
  },

  /** Le bouton ⋯ d'une carte (classeur ou dossier) : hors de l'ordre de Tab
   *  (un arrêt par rangée) ; au clavier, la touche Menu l'ouvre */
  boutonOptions(this: Bibliotheque, li: HTMLElement): HTMLButtonElement {
    const cle = li.dataset.cle!
    const options = document.createElement('button')
    options.type = 'button'; options.className = 'options-classeur'; options.tabIndex = -1
    options.innerHTML = icone('points')
    options.setAttribute('aria-haspopup', 'menu'); options.setAttribute('aria-expanded', 'false')
    options.addEventListener('click', e => {
      if (this.menuCarte?.id === cle && this.menuCarte.menu.bouton === options) { fermerMenu(); return }
      const l = this.listeDe(li)
      if (l) this.focusCarte(l, cle, false)
      this.ouvrirMenuCarte(cle, { bouton: options, clavier: e.detail === 0 })
    })
    return options
  },

  creerCarte(this: Bibliotheque, id: string): HTMLElement {
    const li = document.createElement('li')
    li.className = 'case-classeur'; li.dataset.id = id; li.dataset.cle = id
    const a = document.createElement('a')
    a.className = 'carte-classeur'; a.dataset.id = id; a.tabIndex = -1; a.draggable = false
    a.href = urlDuClasseur(location.href, id)
    const apercu = Object.assign(document.createElement('span'), { className: 'carte-apercu' })
    // L'aperçu de la première page (voir apercu-classeur.ts), quand il y en a un
    const image = Object.assign(document.createElement('img'), { className: 'apercu-image', alt: '', draggable: false, decoding: 'async', hidden: true })
    image.addEventListener('error', () => { image.hidden = true; image.removeAttribute('src'); this.montrerSansApercu(li, true) })
    apercu.append(image, Object.assign(document.createElement('span'), { className: 'sans-apercu', textContent: 'Pas encore d\'aperçu' }),
      Object.assign(document.createElement('span'), { className: 'pastille-ouvert', textContent: 'Ouvert', hidden: true }), this.poignee())
    const nom = Object.assign(document.createElement('span'), { className: 'carte-nom-classeur' })
    // « Hors chapitre » sous le nom du classeur « Séances isolées » d'un niveau (lot 17)
    const horsChapitre = Object.assign(document.createElement('span'), { className: 'carte-hors-chapitre', textContent: HORS_CHAPITRE, hidden: true })
    // Son dossier, quand un filtre montre les classeurs de tous les dossiers
    const chemin = Object.assign(document.createElement('span'), { className: 'carte-chemin', hidden: true })
    const infos = Object.assign(document.createElement('span'), { className: 'carte-infos' })
    const date = Object.assign(document.createElement('span'), { className: 'carte-date' })
    const sauvegardes = Object.assign(document.createElement('span'), { className: 'carte-sauvegardes' })
    const cle = Object.assign(document.createElement('span'), { className: 'carte-icone icone-cle', innerHTML: icone('cle'), hidden: true })
    const drive = Object.assign(document.createElement('span'), { className: 'carte-icone icone-drive', innerHTML: icone('nuage'), hidden: true })
    sauvegardes.append(cle, drive)
    infos.append(date, sauvegardes)
    // Les étiquettes de niveau (propres, et celle héritée du dossier)
    const etiquettes = Object.assign(document.createElement('span'), { className: 'carte-etiquettes', hidden: true })
    for (const x of [apercu, nom, horsChapitre, chemin, infos, etiquettes]) x.setAttribute('aria-hidden', 'true')
    a.append(apercu, nom, horsChapitre, chemin, infos, etiquettes)
    li.append(a, this.boutonOptions(li), ...this.zoneSeances(li))
    return li
  },

  /** La ligne « 4 séances ▸ » sous la carte d'un classeur et sa liste
   *  dépliée (les séances où l'on a écrit, la plus récente d'abord) : hors de
   *  l'ordre de Tab comme le ⋯ ; au clavier, le menu de la carte la déplie.
   *  Chaque séance ouvre le classeur sur sa première page. */
  zoneSeances(this: Bibliotheque, li: HTMLElement): [HTMLButtonElement, HTMLUListElement] {
    const bascule = document.createElement('button')
    bascule.type = 'button'; bascule.className = 'carte-seances-bascule'; bascule.hidden = true; bascule.tabIndex = -1
    bascule.setAttribute('aria-expanded', 'false')
    bascule.append(Object.assign(document.createElement('span'), { className: 'carte-seances-texte' }),
      Object.assign(document.createElement('span'), { className: 'carte-seances-fleche', textContent: '▸' }))
    bascule.querySelector('.carte-seances-fleche')!.setAttribute('aria-hidden', 'true')
    bascule.addEventListener('click', e => { e.stopPropagation(); this.basculerSeances(li.dataset.cle!) })
    const liste = document.createElement('ul')
    liste.className = 'carte-seances-liste'; liste.hidden = true
    return [bascule, liste]
  },

  /** Déplier ou replier les séances d'un classeur */
  basculerSeances(this: Bibliotheque, cle: string): void {
    if (this.seancesOuvertes.has(cle)) this.seancesOuvertes.delete(cle); else this.seancesOuvertes.add(cle)
    this.rendre(new Set([cle]))
  },

  /** La ligne « séances » et sa liste (rien n'est touché qui n'a pas changé) */
  majSeances(this: Bibliotheque, c: HTMLElement, f: FicheClasseur): void {
    const bascule = c.querySelector<HTMLButtonElement>('.carte-seances-bascule')
    const liste = c.querySelector<HTMLElement>('.carte-seances-liste')
    if (!bascule || !liste) return
    const texte = libelleSeances(f)
    const ouvert = !!texte && this.seancesOuvertes.has(f.id)
    if (bascule.hidden === !!texte) bascule.hidden = !texte
    if (texte) {
      const t = bascule.querySelector<HTMLElement>('.carte-seances-texte')!
      if (t.textContent !== texte) t.textContent = texte
      const aria = String(ouvert)
      if (bascule.getAttribute('aria-expanded') !== aria) bascule.setAttribute('aria-expanded', aria)
      const label = `${texte} de « ${f.nom} »`
      if (bascule.getAttribute('aria-label') !== label) bascule.setAttribute('aria-label', label)
    }
    if (liste.hidden === ouvert) liste.hidden = !ouvert
    if (!ouvert) { if (liste.childElementCount) { liste.replaceChildren(); delete liste.dataset.sig } return }
    const lignes = lignesDesSeances(f)
    const aLaMain = ordreALaMain(f.listeSeances ?? [])
    const sig = lignes.map(l => `${l.id}\u0001${l.date}\u0001${l.nom ?? ''}\u0001${l.pages}`).join('\u0002') + '\u0003' + f.nom + (aLaMain ? '\u0004' : '')
    if (liste.dataset.sig === sig) return
    const focus = document.activeElement instanceof HTMLElement && liste.contains(document.activeElement) ? document.activeElement.closest<HTMLElement>('.carte-seance-ligne')?.dataset.seance : undefined
    liste.dataset.sig = sig
    liste.setAttribute('aria-label', `Séances de « ${f.nom} »`)
    const lis: HTMLLIElement[] = []
    if (aLaMain) {
      const li = Object.assign(document.createElement('li'), { className: 'carte-seances-ordre' })
      const remettre = Object.assign(document.createElement('button'), { type: 'button', className: 'lien-ordre-dates', textContent: 'Remettre dans l\'ordre des dates' })
      remettre.dataset.action = 'seances-par-dates'
      remettre.addEventListener('click', e => { e.stopPropagation(); void this.remettreSeancesParDates(f.id) })
      li.append(Object.assign(document.createElement('span'), { textContent: 'Ordre choisi à la main' }), remettre)
      lis.push(li)
    }
    for (const l of lignes) lis.push(this.ligneSeance(f, l))
    liste.replaceChildren(...lis)
    if (focus) liste.querySelector<HTMLElement>(`.carte-seance-ligne[data-seance="${CSS.escape(focus)}"] .carte-seance`)?.focus({ preventScroll: true })
  },

  /** Une séance de la liste dépliée : la poignée ⠿ (la glisser : plus haut,
   *  plus bas, ou sur un autre classeur), la séance (un clic l'ouvre), et son
   *  bouton … (son menu ; aussi au clic droit, au bouton du stylet, à la
   *  touche Menu) */
  ligneSeance(this: Bibliotheque, f: FicheClasseur, l: LigneSeance): HTMLLIElement {
    const li = document.createElement('li')
    li.className = 'carte-seance-ligne'; li.dataset.seance = l.id
    const poignee = Object.assign(document.createElement('span'), { className: 'poignee-seance', textContent: '⠿' })
    poignee.title = 'Glisser pour changer la séance de place, ou vers un autre classeur'
    poignee.setAttribute('aria-hidden', 'true')
    poignee.addEventListener('pointerdown', e => this.glisserSeance(e, f.id, l.id, li))
    const b = document.createElement('button')
    b.type = 'button'; b.className = 'carte-seance'
    b.append(Object.assign(document.createElement('span'), { className: 'seance-date', textContent: l.date }),
      Object.assign(document.createElement('span'), { className: 'seance-pages', textContent: l.pages }))
    if (l.nom) b.append(Object.assign(document.createElement('span'), { className: 'seance-nom', textContent: l.nom }))
    b.setAttribute('aria-keyshortcuts', 'F2 Delete Alt+ArrowUp Alt+ArrowDown')
    b.addEventListener('click', e => {
      e.stopPropagation()
      const x = this.fiches.get(f.id)
      if (x) void this.ouvrirClasseur(x, { seance: l.id, ...(e.detail !== 0 ? { x: e.clientX, y: e.clientY } : {}) })
    })
    b.addEventListener('dblclick', e => e.stopPropagation())
    const options = document.createElement('button')
    options.type = 'button'; options.className = 'options-seance'; options.tabIndex = -1
    options.innerHTML = icone('points')
    options.setAttribute('aria-label', `Actions de la séance ${l.nom ? `« ${l.nom} »` : `du ${l.date}`}`)
    options.setAttribute('aria-haspopup', 'menu'); options.setAttribute('aria-expanded', 'false')
    options.addEventListener('click', e => {
      e.stopPropagation()
      if (this.menuCarte?.menu.bouton === options) { fermerMenu(); return }
      this.ouvrirMenuSeance(f.id, l.id, { bouton: options, clavier: e.detail === 0 })
    })
    li.append(poignee, b, options)
    return li
  },

  /** Le nom, la date et les pages, les étiquettes, le chemin (avec un
   *  filtre), le texte du lecteur d'écran, « Ouvert », la clé et le Drive
   *  d'une carte (rien n'est touché qui n'a pas changé) */
  majCarte(this: Bibliotheque, c: HTMLElement, f: FicheClasseur, maintenant: number, avecChemin = false): void {
    const ici = this.hote.classeur?.id === f.id
    const a = c.querySelector<HTMLAnchorElement>('.carte-classeur')!
    const poser = (x: Element, t: string) => { if (x.textContent !== t) x.textContent = t }
    poser(c.querySelector('.carte-nom-classeur')!, f.nom)
    poser(c.querySelector('.carte-date')!, libelleCarte(f, maintenant))
    const effectives = etiquettesEffectives(f, this.dossiers)
    this.majPuces(c.querySelector<HTMLElement>('.carte-etiquettes')!, effectives.map(e => ({
      nom: e.nom, heritee: !!e.dossier, titre: e.dossier ? `Étiquette du dossier « ${e.dossier.nom} »` : `Étiquette de niveau « ${e.nom} »`,
    })))
    const ch = c.querySelector<HTMLElement>('.carte-chemin')!
    const chemin = avecChemin ? cheminLisible(f.dossier, this.dossiers) : ''
    poser(ch, chemin)
    if (ch.hidden === avecChemin) ch.hidden = !avecChemin
    // Le classeur « Séances isolées » d'un niveau (lot 17) : « Hors chapitre »
    // sous son nom, que le lecteur d'écran dit aussi ; la carte reste la même
    const isolees = estSeancesIsolees(f)
    const hc = c.querySelector<HTMLElement>('.carte-hors-chapitre')!
    if (hc.hidden === isolees) hc.hidden = !isolees
    c.classList.toggle('isolees', isolees)
    const label = texteLecteur(f, maintenant, { ouvertIci: ici, etiquettes: effectives.map(e => e.nom), chemin: avecChemin ? chemin : undefined, horsChapitre: isolees })
    if (a.getAttribute('aria-label') !== label) a.setAttribute('aria-label', label)
    if (a.title !== f.nom) a.title = f.nom
    const p = c.querySelector<HTMLElement>('.pastille-ouvert')!
    if (p.hidden === ici) p.hidden = !ici
    c.classList.toggle('ouvert-ici', ici)
    if (ici) a.setAttribute('aria-current', 'true'); else a.removeAttribute('aria-current')
    for (const [sel, titre] of [['.icone-cle', titreCle(f, maintenant)], ['.icone-drive', titreDrive(f, maintenant)]] as const) {
      const x = c.querySelector<HTMLElement>(sel)!
      if (x.hidden !== !titre) x.hidden = !titre
      if (titre && x.title !== titre) x.title = titre
    }
    const o = c.querySelector<HTMLElement>('.options-classeur')!, titre = `Options de « ${f.nom} »`
    if (o.title !== titre) { o.title = titre; o.setAttribute('aria-label', titre) }
    // L'aperçu de la première page, ou « Pas encore d'aperçu »
    const img = c.querySelector<HTMLImageElement>('.apercu-image')!, x = this.images.get(f.id)
    if (x) { if (img.getAttribute('src') !== x.url) img.src = x.url; if (img.hidden) img.hidden = false }
    else if (img.hasAttribute('src') || !img.hidden) { img.removeAttribute('src'); img.hidden = true }
    this.montrerSansApercu(c, !x)
    this.majSeances(c, f)
  },

  /** « Pas encore d'aperçu » et les petits carreaux, ou l'image */
  montrerSansApercu(this: Bibliotheque, c: HTMLElement, sans: boolean): void {
    const s = c.querySelector<HTMLElement>('.sans-apercu')
    if (s && s.hidden === sans) s.hidden = !sans
    c.classList.toggle('avec-apercu', !sans)
  },

  /** La poignée ⋮⋮ d'une carte : au doigt (et au stylet posé sur l'écran),
   *  elle tire la carte sans appui long ; sans écran tactile, elle n'est pas
   *  là (la souris et la tablette graphique tirent la carte de partout) */
  poignee(this: Bibliotheque): HTMLElement {
    const p = Object.assign(document.createElement('span'), { className: 'biblio-poignee', textContent: '⋮⋮', title: 'Glisser pour déplacer' })
    p.setAttribute('aria-hidden', 'true')
    return p
  },

  /** Les petites puces grises des étiquettes (l'héritée plus claire) */
  majPuces(this: Bibliotheque, zone: HTMLElement, puces: { nom: string; heritee: boolean; titre: string }[]): void {
    const sig = puces.map(p => `${p.heritee ? '~' : ''}${p.nom}\u0001${p.titre}`).join('\u0002')
    if (zone.dataset.sig === sig) return
    zone.dataset.sig = sig
    zone.replaceChildren(...puces.map(p => {
      const s = Object.assign(document.createElement('span'), { className: 'puce-etiquette' + (p.heritee ? ' heritee' : ''), textContent: p.nom, title: p.titre })
      return s
    }))
    zone.hidden = !puces.length
  },

  /** La carte d'un dossier : sa grande icône dans sa couleur, son nom, ce
   *  qu'il contient (« 4 classeurs · 2 dossiers »), l'étiquette d'un dossier
   *  de niveau ; un clic, un toucher ou Entrée y entre */
  creerCarteDossier(this: Bibliotheque, id: string): HTMLElement {
    const li = document.createElement('li')
    li.className = 'case-dossier'; li.dataset.dossier = id; li.dataset.cle = DOSSIER + id
    const b = document.createElement('button')
    b.type = 'button'; b.className = 'carte-dossier'; b.dataset.dossier = id; b.tabIndex = -1
    const ic = Object.assign(document.createElement('span'), { className: 'dossier-icone', innerHTML: SVG_DOSSIER })
    ic.appendChild(this.poignee())
    const nom = Object.assign(document.createElement('span'), { className: 'carte-nom-dossier' })
    const infos = Object.assign(document.createElement('span'), { className: 'carte-infos' })
    infos.append(Object.assign(document.createElement('span'), { className: 'carte-contenu' }))
    const etiquettes = Object.assign(document.createElement('span'), { className: 'carte-etiquettes', hidden: true })
    for (const x of [ic, nom, infos, etiquettes]) x.setAttribute('aria-hidden', 'true')
    b.append(ic, nom, infos, etiquettes)
    li.append(b, this.boutonOptions(li))
    return li
  },

  /** Les pastilles « PC ✓ » (ou « PC : 2 à copier ») des dossiers reliés à l'ordinateur ou au Drive */
  poserPastilles(this: Bibliotheque, m: Map<string, { texte: string; attention: boolean; pc?: boolean }>): void {
    this.pastilles = m
    for (const c of this.hautDuCorps.parentElement?.querySelectorAll<HTMLElement>('li.case-dossier') ?? []) this.majPastille(c, c.dataset.dossier ?? '')
  },

  majPastille(this: Bibliotheque, c: HTMLElement, id: string): void {
    const p = this.pastilles.get(id)
    let x = c.querySelector<HTMLElement>('.puce-emplacement')
    if (!p) { x?.remove(); return }
    if (!x) {
      x = Object.assign(document.createElement('span'), { className: 'puce-emplacement' })
      // Un clic sur la pastille d'un dossier enregistré sur le PC : ses choix
      // (Mettre à jour, Ne plus enregistrer), sans entrer dans le dossier ;
      // au clavier, les mêmes choix sont dans le menu du dossier
      const p0 = x
      x.addEventListener('click', ev => {
        if (!p0.classList.contains('cliquable') || !this.surPastille) return
        ev.stopPropagation(); ev.preventDefault()
        this.surPastille(c.dataset.dossier ?? id, p0)
      })
      c.querySelector('.carte-infos')?.appendChild(x)
    }
    x.classList.toggle('cliquable', !!p.pc)
    x.title = p.pc ? 'Enregistré sur le PC : cliquez pour mettre à jour ou ne plus enregistrer' : ''
    if (x.textContent !== p.texte) x.textContent = p.texte
    x.classList.toggle('attention', p.attention)
  },

  majCarteDossier(this: Bibliotheque, c: HTMLElement, d: FicheDossier, fiches: readonly FicheClasseur[]): void {
    const poser = (x: Element, t: string) => { if (x.textContent !== t) x.textContent = t }
    const n = compter(d.id, fiches, this.dossiers)
    poser(c.querySelector('.carte-nom-dossier')!, d.nom)
    poser(c.querySelector('.carte-contenu')!, libelleDossier(n))
    const couleur = couleurDe(d.couleur).valeur
    if (c.style.getPropertyValue('--c') !== couleur) c.style.setProperty('--c', couleur)
    this.majPuces(c.querySelector<HTMLElement>('.carte-etiquettes')!, d.etiquette
      ? [{ nom: d.etiquette, heritee: false, titre: `Dossier d'un niveau : ses classeurs portent l'étiquette « ${d.etiquette} »` }] : [])
    const b = c.querySelector<HTMLElement>('.carte-dossier')!
    const label = texteLecteurDossier(d, n)
    if (b.getAttribute('aria-label') !== label) b.setAttribute('aria-label', label)
    if (b.title !== d.nom) b.title = d.nom
    const o = c.querySelector<HTMLElement>('.options-classeur')!, titre = `Options du dossier « ${d.nom} »`
    if (o.title !== titre) { o.title = titre; o.setAttribute('aria-label', titre) }
    this.majPastille(c, d.id)
  },

  /** La rangée du filtre : « Niveaux : [Tous] [5ème · 4] [2nde · 2] »
   *  (aria-pressed), s'il y a au moins une étiquette. Refaite seulement si
   *  elle a changé ; le focus reste sur le même bouton. */
  majFiltre(this: Bibliotheque, etiquettes: { nom: string; n: number }[]): void {
    const f = this.filtreEl
    const actif = this.filtre === null ? null : cleDe(this.filtre)
    const sig = `${actif}|${etiquettes.map(e => `${e.nom}:${e.n}`).join('|')}`
    if (sig === this.cleFiltre) return
    this.cleFiltre = sig
    f.hidden = !etiquettes.length
    const focus = (document.activeElement as HTMLElement | null)?.closest?.('.biblio-filtre') ? (document.activeElement as HTMLElement).dataset.etiquette : undefined
    const titre = Object.assign(document.createElement('span'), { className: 'filtre-titre', textContent: 'Niveaux :' })
    titre.setAttribute('aria-hidden', 'true')
    const bouton = (texte: string, cle: string, nom: string | null, label: string) => {
      const b = Object.assign(document.createElement('button'), { type: 'button', className: 'filtre-etiquette', textContent: texte })
      b.dataset.etiquette = cle
      b.setAttribute('aria-pressed', String((nom === null ? null : cleDe(nom)) === actif))
      b.setAttribute('aria-label', label)
      b.addEventListener('click', () => this.choisirFiltre(nom !== null && cleDe(nom) === actif ? null : nom))
      return b
    }
    const boutons = [bouton('Tous', '', null, 'Tous les niveaux'),
      ...etiquettes.map(e => bouton(`${e.nom} · ${e.n}`, cleDe(e.nom), e.nom, `${e.nom}, ${nombreDeClasseurs(e.n).toLowerCase()}`))]
    f.replaceChildren(titre, ...boutons)
    if (focus !== undefined) (boutons.find(b => b.dataset.etiquette === focus) ?? boutons[0]).focus({ preventScroll: true })
  },

  /** Le fil d'Ariane : « Bibliothèque › 5e B › Géométrie », chaque dossier
   *  au-dessus un bouton, celui où l'on est en gras (aria-current) ; avec un
   *  filtre, « Niveau « 5ème » ». Refait seulement s'il a changé. */
  majFil(this: Bibliotheque): void {
    const chaine = this.filtre === null ? filAriane(this.dossierAffiche, this.dossiers) : []
    const sig = this.filtre !== null ? `f:${this.filtre}` : `r:${chaine.map(d => `${d.id}:${d.nom}`).join('|')}`
    if (sig === this.cleFil) return
    this.cleFil = sig
    const focus = this.filEl.contains(document.activeElement) ? (document.activeElement as HTMLElement).dataset.dossier ?? '' : null
    const items: HTMLElement[] = []
    // Là où l'on est : le titre de la grille (un titre, pour qui va de titre
    // en titre au lecteur d'écran, comme « Récents »)
    const ici = (texte: string, id?: string | null) => {
      const s = Object.assign(document.createElement('h3'), { className: 'fil-ici', textContent: texte })
      s.setAttribute('aria-current', 'location')
      // Une cible du glisser (lot 4 C7) : y lâcher une carte de Récents l'y range
      if (id !== undefined) s.dataset.dossier = id ?? ''
      return s
    }
    const element = (texte: string, id: string | null, venuDe: string | null, dernier: boolean) => {
      if (dernier) return ici(texte, id)
      const b = Object.assign(document.createElement('button'), { type: 'button', className: 'fil-bouton', textContent: texte })
      b.dataset.dossier = id ?? ''
      b.addEventListener('click', () => this.allerA(id, venuDe))
      return b
    }
    if (this.filtre !== null) items.push(ici(`Niveau « ${this.filtre} »`))
    else {
      items.push(element('Bibliothèque', null, chaine[0]?.id ?? null, !chaine.length))
      chaine.forEach((d, i) => items.push(element(d.nom, d.id, chaine[i + 1]?.id ?? null, i === chaine.length - 1)))
    }
    this.filEl.replaceChildren(...items.map((x, i) => {
      const li = document.createElement('li')
      if (i) {
        const sep = Object.assign(document.createElement('span'), { className: 'fil-sep', textContent: '›' })
        sep.setAttribute('aria-hidden', 'true')
        li.appendChild(sep)
      }
      li.appendChild(x)
      return li
    }))
    if (focus !== null) (this.filEl.querySelector<HTMLElement>(`button[data-dossier="${CSS.escape(focus)}"]`) ?? this.filEl.querySelector<HTMLElement>('button'))?.focus({ preventScroll: true })
  },

  /** « Trier : Modifiés récemment » */
  majTri(this: Bibliotheque): void {
    const nom = TRIS.find(t => t.id === this.tri)?.nom ?? TRIS[0].nom
    const l = this.triBouton.querySelector('.libelle')!, texte = `Trier : ${nom}`
    if (l.textContent !== texte) {
      l.textContent = texte
      this.triBouton.setAttribute('aria-label', `Trier les classeurs : ${nom}`)
      this.triBouton.title = `Trier les classeurs (${nom.toLowerCase()})`
    }
  },

  /** La ligne du classeur ouvert, sous le bandeau : « « Symétrie » :
   *  Enregistré dans ce navigateur · sur la clé il y a 2 min », et les
   *  boutons de ce qui demande un clic (ceux de l'état : enregistrer,
   *  reprendre la clé…). Refaite quand l'état change, sauf si le focus y est. */
  majLigneOuvert(this: Bibliotheque): void {
    const c = this.hote.classeur, s = this.hote.surveillance, l = this.ligneOuvert
    if (!c || !s) { l.hidden = true; return }
    l.hidden = false
    const t = s.texte
    const texte = `« ${c.nom} » : ${resumeEtat(s.etat, Date.now())}`
    const actions: ActionEtat[] = []
    for (const x of t.lignes) {
      if (x.niveau !== 'attention') continue
      for (const a of [x.action, ...(x.plus ?? [])]) if (a && !actions.includes(a) && this.hote.ui?.actionEtat(a)) actions.push(a)
    }
    const cle = `${texte}|${t.niveau}|${actions.join()}`
    if (cle === this.cleLigne || l.contains(document.activeElement)) return
    this.cleLigne = cle
    l.dataset.niveau = t.niveau
    const point = Object.assign(document.createElement('span'), { className: 'point-ligne' })
    point.setAttribute('aria-hidden', 'true')
    const span = Object.assign(document.createElement('span'), { className: 'texte-ouvert', textContent: texte })
    const boutons = actions.map(a => {
      const x = this.hote.ui!.actionEtat(a)!
      const b = Object.assign(document.createElement('button'), { type: 'button', className: 'bouton-bandeau', textContent: x.libelle })
      b.dataset.etatAction = a
      b.addEventListener('click', () => x.faire())
      return b
    })
    l.replaceChildren(point, span, ...boutons)
  },
}
