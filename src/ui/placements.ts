// =============================================================
// L'INTERFACE : LA MISE À JOUR, LES PLACEMENTS, LES MESSAGES, L'ANNONCE DE LA PAGE
// Des méthodes de la classe UI (src/ui.ts), rangées ici par sujet :
// elles s'ajoutent à la classe à la fin de ui.ts (ajouterMethodes).
// =============================================================
import type { UI } from '../ui'
import { COULEURS } from '../app'
import { zoneEntreBarres } from '../camera'
import type { Bords } from '../camera'
import { icone } from '../icones'
import { allerAuxEntrees, entreeMenu, fermerMenu, focusAuClavier, focusNullePart } from '../menus'
import type { OptionsEntree } from '../menus'
import { tableauCache } from '../navigateur'
import { nocturne } from '../nuit'
import { reglages } from '../reglages'
import { dateCourteMajuscule, dateLongue, libelleAVenir, libelleSeance } from '../seances'
import { DOIGTS, TITRE_AJOUT, TITRE_SUIVANTE, griser } from '../ui'

export const methodesPlacements = {
  maj(this: UI): void {
    const app = this.app
    // Un objet verrouillé n'est sélectionné que le temps de son menu court
    // (lot 5) : le menu fermé, il ne l'est plus (avant tout le reste, qui lit
    // la sélection : la barre d'actions, « Supprimer » d'« Autres outils »)
    app.oublierProteges()
    // Un repère pris à la Sélection : le panneau « Courbes » le modifie
    this.courbes?.suivreSelection()
    for (const [id, b] of this.outils) b.classList.toggle('actif', app.outil === id)
    const doigt = DOIGTS.find(d => d.id === reglages.doigt)!
    if (this.boutonDoigt.dataset.badge !== doigt.marque) this.boutonDoigt.dataset.badge = doigt.marque
    // La Gomme dit ce qu'elle efface (lot 5) : son titre, et sa marque ◐
    // quand elle n'efface que là où elle passe
    const gomme = this.outils.get('gomme')!, zone = reglages.gomme === 'zone'
    const titreGomme = zone ? 'Gomme (E) — seulement là où elle passe ; retapez pour ses options' : 'Gomme (E) — trait entier ; retapez pour ses options'
    if (gomme.title !== titreGomme) { gomme.title = titreGomme; gomme.setAttribute('aria-label', titreGomme) }
    if (zone && gomme.dataset.badge !== '◐') gomme.dataset.badge = '◐'
    else if (!zone && gomme.dataset.badge !== undefined) delete gomme.dataset.badge
    const titre = doigt.id === 'auto' && reglages.styletDirect ? 'Rôle du doigt : auto (stylet détecté : il déplace la vue)' : doigt.titre
    if (this.boutonDoigt.title !== titre) { this.boutonDoigt.title = titre; this.boutonDoigt.setAttribute('aria-label', titre) }
    this.pastilles.forEach((b, i) => b.classList.toggle('actif', COULEURS[i].valeur === app.couleur))
    // Sur une page de nuit, les pastilles montrent les couleurs telles
    // qu'elles s'y affichent (le Noir s'y écrit en blanc, et s'appelle ainsi)
    if (this.pastillesDeNuit !== app.nuit) {
      this.pastillesDeNuit = app.nuit
      this.pastilles.forEach((b, i) => {
        const c = COULEURS[i], nom = app.nuit && c.nom === 'Noir' ? 'Blanc' : c.nom
        b.style.setProperty('--teinte', app.nuit ? nocturne(c.valeur) : c.valeur)
        b.title = nom; b.setAttribute('aria-label', nom)
      })
    }
    this.majBoutonEpaisseur()
    griser(this.boutonAnnuler, !app.peutAnnuler())
    griser(this.boutonRetablir, !app.peutRetablir())

    const pages = app.pages, i = pages.indexOf(app.page)
    // Le compteur, et le nom de la page (il change aussi sans changer de page).
    // Devant (lot 6), la séance : « Séance du mar 14 oct 14h · 1 / 2 » (ou
    // son nom) ; une séance passée, en lecture : « Lun 13 oct 8h · page 3 »
    const seance = app.seanceVue, passee = app.enSeancePassee
    const numero = !pages.length ? '…' : passee ? `page ${i + 1}` : `${i + 1} / ${pages.length}`
    const nom = i >= 0 ? app.tableau.nomDe(pages[i]) : null
    // Une séance à venir qu'on prépare (lot 25) : « À venir · lun 16 nov 8h05 », en violet
    const prepare = !!seance && !passee && seance.aVenir
    const texteSeance = !seance ? '' : passee ? `${seance.nom ?? dateCourteMajuscule(seance.debut)} · en lecture` : prepare ? libelleAVenir(seance) : libelleSeance(seance)
    if (this.rangSeanceTexte.textContent !== texteSeance) this.rangSeanceTexte.textContent = texteSeance
    this.rangSeance.hidden = !texteSeance
    this.rang.classList.toggle('en-lecture', passee)
    this.rangSeance.classList.toggle('en-lecture', passee)
    this.rang.classList.toggle('a-venir', prepare)
    this.rangSeance.classList.toggle('a-venir', prepare)
    if (this.rangNumero.textContent !== numero) this.rangNumero.textContent = numero
    const suite = nom ? ` · ${nom}` : ''
    if (this.rangNom.textContent !== suite) this.rangNom.textContent = suite
    const titreSeance = seance ? `${passee ? `Séance passée, en lecture : ${libelleSeance(seance)}` : prepare ? `Séance à venir, préparée pour le ${dateLongue(seance.debut)}` : libelleSeance(seance)} · Toutes les pages (Maj + P)` : ''
    if (this.rangSeanceTexte.title !== titreSeance) this.rangSeanceTexte.title = titreSeance
    const titreRang = nom ? `Page ${numero} · ${nom} · Toutes les pages (Maj + P)` : 'Toutes les pages (Maj + P)'
    if (this.rang.title !== titreRang) this.rang.title = titreRang
    const nomRang = `${passee && seance ? libelleSeance(seance) + ', en lecture, ' : ''}${i >= 0 ? `Page ${i + 1} sur ${pages.length}${nom ? `, ${nom}` : ''} : toutes les pages (Maj + P)` : 'Toutes les pages (Maj + P)'}`
    if (this.rang.getAttribute('aria-label') !== nomRang) this.rang.setAttribute('aria-label', nomRang)
    const avecNoms = pages.some(p => !!app.tableau.nomDe(p))
    const cle = `${String(pages.length).length}:${avecNoms}:${texteSeance}:${passee}`
    if (cle !== this.cleCompteur) { this.cleCompteur = cle; this.compteurARegler = true }
    if (this.compteurARegler) this.reglerCompteur(String(pages.length).length, avecNoms)
    // « › » sur la dernière page : une page de plus ; son contenu ne se
    // refait que si le mode change
    const mode = pages.length && i === pages.length - 1 && !passee ? 'ajout' : 'suivante'
    if (this.boutonApres.dataset.mode !== mode) {
      this.boutonApres.dataset.mode = mode
      this.boutonApres.innerHTML = icone(mode === 'ajout' ? 'page-suivante-plus' : 'apres')
      const t = mode === 'ajout' ? TITRE_AJOUT : TITRE_SUIVANTE
      this.boutonApres.title = t; this.boutonApres.setAttribute('aria-label', t)
    }
    if (!this.annonce.hidden) this.majAnnonce()
    this.bandeauxSeances?.maj()
    const ici = seance ?? app.tableau.derniereSeance()
    const sansAvant = !ici || !app.tableau.seancesDuClasseur().some(x => x.pages.length && x.id !== ici.id && x.debut < ici.debut)
    if (this.boutonPrecedente.hidden !== sansAvant) { this.boutonPrecedente.hidden = sansAvant; this.compteurARegler = true }
    this.majBoutonFond()
    for (const [id, b] of this.boutonsFormes) b.classList.toggle('actif', app.typeForme === id)
    for (const [id, b] of this.boutonsTraits) b.classList.toggle('actif', app.typeTrait === id)
    // Le petit panneau à côté de l'outil choisi (Formes ou Segment) ; au
    // téléphone, près de « Autres outils » (voir placerChoixDuTelephone)
    const telephone = this.telephone
    if (telephone || this.couleursRepliees) this.majBoutonsDuTelephone()
    for (const [panneau, outil] of [[this.choixFormes, 'forme'], [this.choixTraits, 'segment']] as const) {
      panneau.hidden = app.outil !== outil
      if (panneau.hidden) continue
      if (telephone) { this.placerChoixDuTelephone(panneau); continue }
      panneau.classList.remove('en-rangee')
      const r = this.outils.get(outil)!.getBoundingClientRect(), o = this.barreOutils.getBoundingClientRect()
      panneau.style.left = (o.right + 8) + 'px'
      panneau.style.top = Math.max(8, r.top - 6) + 'px'
      this.sousLaBarreDuHaut(panneau)
    }
    for (const [id, b] of this.boutonsInstruments) {
      const oui = app.instrumentVisible(id)
      b.classList.toggle('actif', oui); b.setAttribute('aria-pressed', String(oui))
    }
    this.boutonInstruments.classList.toggle('actif', !this.choixInstruments.hidden || [...this.boutonsInstruments.keys()].some(i => app.instrumentVisible(i)))
    if (!this.choixInstruments.hidden) {
      // Sous son bouton ; au téléphone, où il est caché (« Plus →
      // Instruments… »), centrée sous la barre du haut, jamais sur la barre
      // des outils
      const w = this.choixInstruments.offsetWidth
      const r = telephone ? this.barreHaut.getBoundingClientRect() : this.boutonInstruments.getBoundingClientRect()
      const min = telephone && !this.barreEnBas() ? this.barreOutils.getBoundingClientRect().right + 8 : 8
      this.choixInstruments.style.top = (r.bottom + 10) + 'px'
      this.choixInstruments.style.left = Math.max(min, Math.min(r.left + r.width / 2 - w / 2, window.innerWidth - w - 8)) + 'px'
    }
    this.majHautBarreBas()
    this.majPanneau()
    this.majMenuPartie()
    this.zoomTexte.textContent = Math.round(app.cam.z * 100) + ' %'
    this.majRetour()
    this.vignetteEnonce?.maj()
    // Après le menu complet : elle ne paraît que s'il est fermé
    this.barreActions.maj()
    // Le message ne couvre ni la barre d'actions ni la pastille ↻ (au
    // téléphone, rien de ce qui est pris : voir placerToast)
    this.placerToast()
  },

  /** Les choix des Formes ou du Segment au téléphone (lot 5, K10) : en
   *  portrait, une rangée juste au-dessus de la barre du bas, alignée sur
   *  « Autres outils » ; en paysage, une colonne à droite de la barre, à la
   *  hauteur de ce bouton ; toujours dans l'écran */
  placerChoixDuTelephone(this: UI, panneau: HTMLElement): void {
    const b = this.boutonAutres.getBoundingClientRect(), o = this.barreOutils.getBoundingClientRect()
    const enBas = this.barreEnBas()
    panneau.classList.toggle('en-rangee', enBas)
    const w = panneau.offsetWidth, h = panneau.offsetHeight
    if (enBas) {
      panneau.style.left = Math.max(8, Math.min(b.right - w, window.innerWidth - w - 8)) + 'px'
      panneau.style.top = Math.max(8, o.top - h - 8) + 'px'
    } else {
      panneau.style.left = (o.right + 8) + 'px'
      panneau.style.top = Math.max(8, Math.min(b.top - 6, window.innerHeight - h - 8)) + 'px'
      this.sousLaBarreDuHaut(panneau)
    }
  },

  /** Le haut de ce qui est posé en bas de l'écran au téléphone en portrait
   *  (la barre des outils, et les choix des Formes ou du Segment au-dessus
   *  d'elle), en pixels de la fenêtre ; ailleurs, le bas de la fenêtre. La
   *  barre d'actions, le menu complet, le message s'arrêtent au-dessus. */
  basUtile(this: UI): number {
    if (!this.barreEnBas()) return window.innerHeight
    let haut = this.barreOutils.getBoundingClientRect().top
    for (const p of [this.choixFormes, this.choixTraits]) if (!p.hidden) haut = Math.min(haut, p.getBoundingClientRect().top)
    return haut
  },

  /** --haut-barre-bas : la place que prend en bas ce qui y est posé (voir
   *  basUtile), du bas de la zone à son haut ; 0 sans barre en bas (le poste
   *  de la classe, le téléphone en paysage). « Revenir au contenu » et le
   *  message se posent au-dessus (style.css). */
  majHautBarreBas(this: UI): void {
    // (au poste de la classe, rien n'est mesuré : maj n'y fait pas plus qu'avant)
    const place = this.barreEnBas() ? Math.max(0, Math.ceil(this.racine.getBoundingClientRect().bottom - this.basUtile())) : 0
    if (place === this.hautBarreBas) return
    this.hautBarreBas = place
    this.racine.style.setProperty('--haut-barre-bas', place + 'px')
  },

  /** Les bords que ne recouvrent ni la barre d'actions ni le menu complet :
   *  le bord droit de la barre des outils, le bas de la barre du haut, et au
   *  téléphone le haut de la barre du bas (en portrait, la barre des outils
   *  ne borne plus la gauche) ; au poste de la classe, exactement ceux
   *  d'avant */
  bordsFlottants(this: UI): { gauche: number; haut: number; bas?: number } {
    const o = this.barreOutils.getBoundingClientRect(), h = this.barreHaut.getBoundingClientRect()
    if (!this.telephone) return { gauche: o.right, haut: h.bottom }
    let gauche = this.barreEnBas() ? 0 : o.right
    if (!this.barreEnBas()) for (const p of [this.choixFormes, this.choixTraits]) if (!p.hidden) gauche = Math.max(gauche, p.getBoundingClientRect().right)
    return { gauche, haut: h.bottom, bas: this.basUtile() }
  },

  /** Le message (en bas ; au téléphone, au-dessus de la barre du bas) ne
   *  couvre ni les barres, ni le bandeau, ni la barre d'actions, ni le menu
   *  complet, ni les choix des Formes, ni les poignées du cadre de ce qui
   *  est pris (sa pastille ↻, ses coins, ses côtés, à la portée du pointeur :
   *  voir App.poigneesAEviter) ; au téléphone, ni rien de ce qui est pris
   *  (son cadre), quand au poste de la classe il peut passer sur l'objet
   *  (retouches après le lot 5 : il ne se plaçait qu'au téléphone, et après
   *  l'import d'une image, le message et sa barre d'actions, posée sous
   *  elle, se couvraient ; zoomée, la pastille passait en bas, sous le
   *  message ; puis, posé sous la barre du haut à côté de la pastille, il
   *  couvrait le coin d'un énoncé en portrait, et son bouton « Fixer en
   *  fond » prenait le clic qui devait l'agrandir). Il essaie, dans
   *  l'ordre : en bas, sur sa largeur ; sous la barre du haut (.en-haut) ;
   *  puis, sous la barre du haut et enfin en bas, dans la plus large des
   *  bandes que rien n'occupe (sur un téléphone couché, 320 px de haut, un
   *  objet pris en bas : à côté de sa barre d'actions), un peu plus étroit
   *  et plus haut. Sinon il reste en bas. Caché, il garde sa place jusqu'au message
   *  suivant (il ne saute pas pendant qu'il s'efface). Les boîtes sont lues
   *  sans le petit glissement de son apparition (offsetTop). */
  placerToast(this: UI): void {
    const t = this.toast
    const remettre = (haut: boolean) => { t.classList.toggle('en-haut', haut); t.style.left = ''; t.style.maxWidth = '' }
    if (!t.classList.contains('visible')) return
    const app = this.app, z = app.rendu.scene.getBoundingClientRect(), cam = app.cam
    const obstacles: { left: number; top: number; right: number; bottom: number }[] = []
    for (const el of [this.barreHaut, this.barreOutils, this.barreClasseur, this.barreActions.el, this.panneau, this.bandeau, this.choixFormes, this.choixTraits, this.choixInstruments]) {
      if (el.hidden) continue
      const r = el.getBoundingClientRect()
      if (r.width && r.height) obstacles.push(r)
    }
    const ecran = (b: { x: number; y: number; l: number; h: number } | null) => {
      if (!b) return
      const a = cam.versEcran(b.x, b.y), c = cam.versEcran(b.x + b.l, b.y + b.h)
      obstacles.push({ left: z.left + a.x, top: z.top + a.y, right: z.left + c.x, bottom: z.top + c.y })
    }
    if (app.selection.size && !app.enLecture) {
      if (this.telephone) ecran(app.emprise(app.objetsChoisis()))
      for (const b of app.poigneesAEviter()) ecran(b)
    }
    // Rien n'a bougé depuis la dernière fois (maj passe souvent) : il reste où il est
    const cle = `${window.innerWidth}×${window.innerHeight}|${t.textContent}|` + obstacles.map(o => [o.left, o.top, o.right, o.bottom].map(Math.round).join(',')).join(';')
    if (cle === this.cleToast) return
    this.cleToast = cle
    const boite = () => {
      const l = t.offsetWidth, h = t.offsetHeight
      return { left: t.offsetLeft - l / 2, top: t.offsetTop, right: t.offsetLeft + l / 2, bottom: t.offsetTop + h }
    }
    const touche = (r: { left: number; top: number; right: number; bottom: number }, o: typeof r) => r.left < o.right && r.right > o.left && r.top < o.bottom && r.bottom > o.top
    const libre = () => { const r = boite(); return !obstacles.some(o => touche(r, o)) }
    for (const haut of [false, true]) { remettre(haut); if (libre()) return }
    // La plus large des bandes libres, à la hauteur du message (jusqu'à trois
    // fois sa hauteur : plus étroit, il prend des lignes)
    const gauche = this.barreEnBas() ? 8 : this.barreOutils.getBoundingClientRect().right + 12, droite = window.innerWidth - 8
    for (const haut of [true, false]) {
      remettre(haut)
      const r = boite(), h = r.bottom - r.top
      const bande = haut ? { top: r.top, bottom: r.top + 3 * h } : { top: r.bottom - 3 * h, bottom: r.bottom }
      const pris = obstacles.filter(o => o.top < bande.bottom && o.bottom > bande.top).map(o => [o.left, o.right]).sort((a, b) => a[0] - b[0])
      let mieux: [number, number] | null = null, x = gauche
      for (const [a, b] of [...pris, [droite, droite]]) {
        if (a - x > (mieux ? mieux[1] - mieux[0] : 0)) mieux = [x, Math.min(a, droite)]
        x = Math.max(x, b)
      }
      if (!mieux || mieux[1] - mieux[0] < 140) continue
      t.style.maxWidth = Math.floor(mieux[1] - mieux[0] - 8) + 'px'
      t.style.left = Math.round((mieux[0] + mieux[1]) / 2) + 'px'
      if (libre()) return
    }
    remettre(false)
  },

  /** Ferme ce qui flotte au-dessus du tableau : le petit menu ouvert, le menu
   *  d'un morceau (le morceau n'est plus choisi), le panneau d'options, la
   *  liste des instruments. Vrai si quelque chose était ouvert : l'appui sur
   *  le tableau qui l'a fermé ne fait rien d'autre (voir App.bas).
   *  garderOptions : l'appui prend l'objet même du panneau, qui reste. */
  fermerMenus(this: UI, garderOptions = false): boolean {
    const app = this.app
    let ferme = fermerMenu()
    if (!this.menuPartie.hidden) { this.fermerMenuPartie(); app.choisirPartie(null); ferme = true }
    if (!garderOptions) {
      if (!this.panneau.hidden) ferme = true
      app.options = null
    }
    if (!this.choixInstruments.hidden) { this.choixInstruments.hidden = true; ferme = true }
    if (ferme) this.maj()
    return ferme
  },

  /** Le clavier dans le menu complet ou le menu d'un morceau de figure,
   *  ouverts au clic droit, à l'appui long, au double-clic ou par
   *  « Options », comme dans le menu du système (les petits menus, celui de
   *  la page compris, font de même : voir menus.ts) :
   *  - le focus hors du menu (sur la page après un clic droit, ou sur un
   *    bouton) : ↓, → et Début mènent à sa première entrée ; ↑, ← et Fin à
   *    la dernière ; Tab et Maj+Tab aussi, depuis la page seulement (depuis
   *    un bouton, Tab passe au suivant comme d'habitude) ;
   *  - dans le menu : les flèches passent d'un bouton à l'autre, en
   *    tournant (pas par ses champs, que Tab atteint : voir BOUTONS) ;
   *    Début et Fin vont aux bouts ; Espace appuie sur le bouton
   *    (au relâcher, comme partout) au lieu d'armer « Espace + glisser »,
   *    si le focus y est venu du clavier (après un clic sur un bouton du
   *    menu, Espace + glisser déplace toujours la vue).
   *  L'objet n'est donc pas poussé, ni la vue déplacée, tant que le menu est
   *  ouvert : sans menu, les flèches font comme avant. Un champ de saisie du
   *  menu garde ses touches (App.clavier ne l'écoute pas). */
  clavierMenu(this: UI, e: KeyboardEvent): boolean {
    if (e.ctrlKey || e.metaKey || e.altKey) return false
    const m = !this.menuPartie.hidden ? this.menuPartie : !this.panneau.hidden ? this.panneau : null
    if (!m) return false
    const dedans = m.contains(document.activeElement)
    if (dedans && e.key === ' ' && focusAuClavier(document.activeElement)) return true
    const fleches: Record<string, number> = { ArrowDown: 1, ArrowRight: 1, ArrowUp: -1, ArrowLeft: -1, Home: -Infinity, End: Infinity }
    const sens = fleches[e.key] ?? (e.key === 'Tab' && !dedans && focusNullePart() ? (e.shiftKey ? -1 : 1) : undefined)
    if (sens === undefined || !allerAuxEntrees(m, sens)) return false
    e.preventDefault()
    return true
  },

  entrerDansMenu(this: UI): void {
    if (!this.panneau.hidden) allerAuxEntrees(this.panneau, -Infinity)
  },

  /** On vient de changer de page (voir App.allerPage) : son numéro, et son
   *  nom s'il en a un, en grand, en haut au centre de ce qu'on voit du
   *  tableau entre les barres (jamais au milieu, où l'on écrit en arrivant),
   *  sur un fond clair un peu transparent. Il paraît en 120 ms, reste 700 ms
   *  et s'efface en 300 ms ; un autre changement de page le relance ; le
   *  premier appui sur le tableau l'efface aussitôt. Aucun appui ne s'y
   *  arrête (pointer-events: none). Sous « animations réduites », sans
   *  fondu. Jamais quand le tableau est caché (la revue, une séance, la
   *  trieuse). L'heure du changement est retenue : « › » s'en sert. */
  annoncerPage(this: UI): void {
    this.changementDePage = performance.now()
    if (tableauCache(this.app)) return
    const a = this.annonce
    clearTimeout(this.minuterieAnnonce)
    this.majAnnonce()
    a.classList.remove('vite')
    // Pas plus large que ce qu'on voit du tableau (un long nom se coupe) :
    // sur un téléphone, il ne couvre pas la barre d'outils
    const z = this.app.rendu.scene.getBoundingClientRect(), r = this.zoneLibre()
    a.style.maxWidth = Math.max(160, Math.min(640, r.l)) + 'px'
    // Caché, il repart de l'opacité nulle (le style est relu avant le fondu)
    if (a.hidden) { a.hidden = false; void a.offsetWidth }
    // Centré sur ce qu'on voit, mais jamais hors de l'écran
    const demi = a.offsetWidth / 2, centre = z.left + r.x + r.l / 2
    a.style.left = Math.max(8 + demi, Math.min(window.innerWidth - 8 - demi, centre)) + 'px'
    a.style.top = (z.top + r.y + 16) + 'px'
    a.classList.add('visible')
    this.minuterieAnnonce = window.setTimeout(() => this.effacerAnnonce(false), 120 + 700)
  },

  /** Le numéro et le nom que montre l'annonce (le nombre de pages change
   *  juste après qu'on arrive, quand on vient de supprimer celle qu'on
   *  quittait : maj() le relit tant qu'elle se voit) */
  majAnnonce(this: UI): void {
    const pages = this.app.pages, i = pages.indexOf(this.app.page)
    const numero = i < 0 ? '' : this.app.enSeancePassee ? `page ${i + 1}` : `${i + 1} / ${pages.length}`
    const nom = (i >= 0 ? this.app.tableau.nomDe(pages[i]) : null) ?? ''
    if (this.annonceNumero.textContent !== numero) this.annonceNumero.textContent = numero
    if (this.annonceNom.textContent !== nom) this.annonceNom.textContent = nom
  },

  /** L'annonce s'efface : à son heure (300 ms), ou tout de suite (vite :
   *  120 ms) quand on touche le tableau. Puis elle se cache. */
  effacerAnnonce(this: UI, vite: boolean): void {
    const a = this.annonce
    if (a.hidden || !a.classList.contains('visible')) return
    clearTimeout(this.minuterieAnnonce)
    a.classList.toggle('vite', vite)
    a.classList.remove('visible')
    this.minuterieAnnonce = window.setTimeout(() => { a.hidden = true; a.classList.remove('vite') }, vite ? 120 : 300)
  },

  /** Ce qu'on voit du tableau entre les barres, en coordonnées de la zone :
   *  c'est là que « Tout voir » cadre la page (voir zoneEntreBarres) */
  zoneLibre(this: UI): { x: number; y: number; l: number; h: number; } {
    const z = this.app.rendu.scene.getBoundingClientRect()
    const bords = (el: HTMLElement): Bords | null => {
      const r = el.getBoundingClientRect()
      return r.width && r.height ? { left: r.left - z.left, top: r.top - z.top, right: r.right - z.left, bottom: r.bottom - z.top } : null
    }
    return zoneEntreBarres(z.width, z.height, { outils: bords(this.barreOutils), haut: bords(this.barreHaut), zoom: bords(this.barreZoom) })
  },

  /** La zone libre où se placent la pastille ↻ et la barre d'actions d'un
   *  objet pris : celle de zoneLibre, commencée sous l'étiquette de la
   *  séance quand elle pend sous la barre du haut (sans quoi la pastille
   *  d'une image posée en haut tomberait sous l'étiquette, qui prendrait
   *  l'appui) */
  zoneDuCadre(this: UI): { x: number; y: number; l: number; h: number; } {
    const zl = this.zoneLibre(), s = this.rangSeance
    if (s.hidden) return zl
    const r = s.getBoundingClientRect(), z = this.app.rendu.scene.getBoundingClientRect()
    // 4 px d'air, plus les 12 px dont un crayon sans survol (la tablette
    // graphique) peut viser trop haut : il touche la pastille, pas l'étiquette
    const bas = r.bottom - z.top + 16
    if (!r.height || r.top - z.top > zl.y || bas <= zl.y || zl.h - (bas - zl.y) < 200) return zl
    return { ...zl, y: bas, h: zl.h - (bas - zl.y) }
  },

  /** La pastille « Revenir au contenu » : elle paraît une seconde après qu'on
   *  a perdu de vue tout ce qui est écrit, et part dès qu'on le retrouve */
  majRetour(this: UI): void {
    const app = this.app
    if (app.enLecture || !app.contenuHorsVue()) {
      clearTimeout(this.minuterieRetour); this.minuterieRetour = 0
      this.retour.hidden = true
      return
    }
    if (!this.retour.hidden || this.minuterieRetour) return
    this.minuterieRetour = window.setTimeout(() => {
      this.minuterieRetour = 0
      if (!app.enLecture && app.contenuHorsVue()) this.retour.hidden = false
    }, 1000)
  },

  /** Une entrée d'un petit menu (voir menus.ts, entreeMenu) */
  entreeMenu(this: UI, m: HTMLElement, texte: string, faire: (e: MouseEvent) => void, o: OptionsEntree = {}): HTMLButtonElement {
    return entreeMenu(m, texte, faire, o)
  },
}
