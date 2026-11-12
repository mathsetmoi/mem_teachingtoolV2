// =============================================================
// L'INTERFACE : LES OUTILS DE CLASSE, LA RECHERCHE, L'AIDE, LES MENUS DU ZOOM ET DU FICHIER
// Des méthodes de la classe UI (src/ui.ts), rangées ici par sujet :
// elles s'ajoutent à la classe à la fin de ui.ts (ajouterMethodes).
// =============================================================
import type { UI } from '../ui'
import { montrerConseils, ouvrirAide } from '../aide'
import { NIVEAUX, automatismesDuFlash } from '../automatismes'
import { DEMONSTRATIONS } from '../catalogue'
import { Trigo } from '../catalogue-trigo'
import { AIDE_AUTRES } from '../classeurs/autres-sauvegardes'
import { AIDE_ACTIVER } from '../classeurs/cle'
import { aSonFichier } from '../classeurs/etat'
import type { LigneEtat } from '../classeurs/etat'
import { AIDE_OUVRIR } from '../classeurs/fichiers'
import { EXEMPLES } from '../construction'
import { nomSur } from '../fichier'
import { icone } from '../icones'
import { INSTRUMENTS } from '../instruments'
import { construireMenuFonds, entreeCochee, nomDuFond } from '../menu-fonds'
import { entreeMenu, fermerMenu, filetMenu, menuOuvert, ouvrirMenu, placerMenu, titreMenu } from '../menus'
import { CTRL } from '../navigateur'
import { ecranTactile, typePointeur } from '../pointeurs'
import { TOUCHE_RECHERCHE } from '../recherche-vue'
import type { Action, Destination } from '../recherche-vue'
import { choisirMolette, nomsOutilsVisibles, reglages } from '../reglages'
import type { Molette } from '../reglages'
import { FORMULES } from '../trigonometrie'
import { FONDS } from '../types'
import type { Outil } from '../types'
import { MENU_FICHIER } from '../ui'

export const methodesMenus = {
  /** Le menu des outils de classe : chaque outil avec son icône, coché quand
   *  il est à l'écran (un second choix le range) */
  construireMenuOutilsClasse(this: UI, m: HTMLElement): void {
    m.replaceChildren()
    for (const x of this.outilsDeClasse.entrees()) {
      if (x.id === 'aide' || x.id === 'calculatrice-lycee') filetMenu(m)
      // L'aide et les calculatrices ne se cochent pas : on les ouvre, on les pose
      const action = x.id === 'aide' || x.id.startsWith('calculatrice')
      const b = entreeMenu(m, x.texte, x.faire, { action: 'outil-classe-' + x.id, aide: x.aide, touche: x.touche,
        ...(action ? {} : { coche: x.coche, caseACocher: true }) })
      // Rien de coché : l'icône de l'outil tient la place de la coche
      const coche = b.querySelector('.coche')
      if (coche && !x.coche) { coche.innerHTML = icone(x.icone); coche.classList.add('icone-entree') }
    }
  },

  /** Le champ « Rechercher », à droite du bouton du classeur, dans la place
   *  qui reste entre lui et la barre du haut : seulement s'il y tient
   *  (150 px au moins, 240 au plus), sinon sa loupe seule (44 px) ; il ne
   *  prend rien à la place du bouton du classeur, qui se règle sans lui.
   *  Sans place du tout : Ctrl F. */
  placerChampRecherche(this: UI): void {
    const c = this.champRecherche
    if (!c) return
    const barre = this.barreClasseur
    if (this.telephone || this.formeClasseur !== 'large' || barre.hidden) { c.hidden = true; return }
    const r = barre.getBoundingClientRect(), h = this.barreHaut.getBoundingClientRect()
    const libre = Math.floor(h.left - 12 - (r.right + 12))
    if (libre < 44 || r.width === 0) { c.hidden = true; return }
    c.hidden = false
    c.classList.toggle('compact', libre < 150)
    c.style.left = Math.round(r.right + 12) + 'px'
    c.style.top = Math.round(r.top + (r.height - 40) / 2) + 'px'
    c.style.width = (libre < 150 ? 44 : Math.min(240, libre)) + 'px'
  },

  /** La fenêtre de la recherche (Ctrl F, le champ) */
  ouvrirRecherche(this: UI, texte = ''): void {
    fermerMenu()
    this.recherche.ouvrir(texte)
  },

  /** Va où la recherche mène : dans ce classeur, la page (la formule prise)
   *  ou la séance ; dans un autre, il s'ouvre (main.ts) */
  allerA(this: UI, d: Destination): void {
    const app = this.app
    if (d.classeur !== this.idClasseur) { this.ouvrirAilleurs(d); return }
    if (this.bibliotheque?.ouvert) this.bibliotheque.fermer()
    const page = d.page ?? (d.seance ? app.tableau.seancesDuClasseur().find(s => s.id === d.seance)?.pages[0] : undefined)
    if (page) app.voirPage(page)
    if (d.forme) { const f = d.forme; requestAnimationFrame(() => { if (!app.montrerForme(f)) this.message('Cette formule n\'est plus sur la page.') }) }
  },

  /** Tout ce que la recherche trouve parmi les outils : les outils, les
   *  instruments, les fonds, les fenêtres, les outils de classe, les
   *  programmes de construction, le catalogue, les automatismes */
  actionsDeRecherche(this: UI): Action[] {
    const app = this.app
    const outil = (o: Outil, titre: string, touche: string, mots: string, ic: string = o, avant?: () => void): Action =>
      ({ titre, genre: 'Outil', touche, mots, icone: ic, faire: () => { avant?.(); app.choisirOutil(o) } })
    const l: Action[] = [
      outil('stylo', 'Stylo', 'P', 'ecrire crayon main levee dessiner'),
      outil('surligneur', 'Surligneur', 'H', 'surligner fluo mettre en evidence'),
      outil('gomme', 'Gomme', 'E', 'effacer'),
      outil('point', 'Point', 'X', 'placer nommer un point'),
      outil('segment', 'Segment', 'L', 'trait regle tracer', 'trait-segment', () => { app.typeTrait = 'segment' }),
      outil('segment', 'Droite', 'L', 'trait tracer', 'trait-droite', () => { app.typeTrait = 'droite' }),
      outil('segment', 'Demi-droite', 'L', 'trait tracer', 'trait-demi', () => { app.typeTrait = 'demi' }),
      outil('forme', 'Rectangle', 'R', 'carre forme figure', 'rectangle', () => { app.typeForme = 'rectangle' }),
      outil('forme', 'Cercle', 'C', 'rond disque forme figure', 'cercle', () => { app.typeForme = 'cercle' }),
      outil('forme', 'Polygone', 'G', 'triangle forme figure', 'polygone', () => { app.typeForme = 'polygone' }),
      outil('formule', 'Formule', 'F', 'latex equation ecrire calcul racine fraction puissance'),
      outil('texte', 'Texte', 'T', 'taper clavier ecrire phrase traitement de texte consigne enonce titre'),
      outil('selection', 'Sélection', 'V', 'selectionner prendre deplacer bouger agrandir tourner'),
      outil('main', 'Déplacer la vue', 'Espace', 'main vue faire defiler'),
    ]
    for (const i of INSTRUMENTS) l.push({ titre: i.nom, genre: 'Instrument', icone: i.id, mots: 'instrument poser mesurer angle', faire: () => { app.basculerInstrument(i.id); this.maj() } })
    for (const f of FONDS) l.push({ titre: f.nom, genre: 'Fond', icone: 'cadre', mots: 'fond page papier quadrillage', faire: () => app.changerFond(f.id) })
    l.push({ titre: 'Mode nuit', detail: 'Cette page : fond noir, écriture claire', icone: 'lune', touche: 'N', mots: 'nuit noir sombre fond page jour', faire: () => app.basculerNuit() })
    const mots: Record<string, string> = { rideau: 'cacher devoiler correction masquer', laser: 'montrer pointer', minuteur: 'chrono chronometre temps compte a rebours sablier', tirage: 'hasard eleve interroger au sort', aide: 'raccourcis clavier gestes',
      'calculatrice-lycee': 'calculatrice numworks graphique emulateur lycee', 'calculatrice-college': 'calculatrice numworks scientifique emulateur college' }
    for (const x of this.outilsDeClasse.entrees()) l.push({ titre: x.texte, genre: x.id === 'aide' ? undefined : 'Outil de classe', detail: x.aide, icone: x.icone, touche: x.touche, mots: mots[x.id], faire: x.faire })
    l.push(
      { titre: 'Nouvelle page', icone: 'plus', mots: 'ajouter page', faire: () => app.nouvellePage() },
      { titre: 'Toutes les pages', icone: 'trier', touche: 'Maj P', mots: 'pages trier ranger vignettes', faire: () => this.ouvrirTrieuse() },
      { titre: '100 %', icone: 'loupe', touche: `${CTRL} 0`, mots: 'zoom cent pour cent', faire: () => app.zoom100() },
      { titre: 'Tout voir', icone: 'loupe', touche: 'Maj 1', mots: 'zoom toute la page', faire: () => app.toutVoir() },
      { titre: 'Importer une image ou un PDF', icone: 'image', mots: 'image photo fichier pdf fiche énoncé', faire: () => this.choisirImage() },
      { titre: 'Programme de construction', icone: 'construction', mots: 'construire etape par etape', faire: () => this.basculerConstructeur() },
      { titre: 'Catalogue', icone: 'catalogue', mots: 'elements de cours tout prets', faire: () => this.basculerCatalogue() },
      { titre: 'Automatismes', icone: 'automatismes', mots: 'flash questions calcul mental', faire: () => this.flash.ouvrir() },
      { titre: 'Revoir la construction', icone: 'revue', mots: 'revoir replay pas a pas', faire: () => this.ouvrirRevue(this.champRecherche.hidden ? this.boutonFichier : this.champRecherche) },
      { titre: 'Publier le replay', icone: 'publier', mots: 'publier eleves drive lien', faire: () => this.publication.ouvrir() },
      { titre: 'Bibliothèque des classeurs', icone: 'classeurs', mots: 'classeurs dossiers', faire: () => this.ouvrirBibliotheque() },
      { titre: 'Enregistrer le classeur', icone: 'cle', touche: `${CTRL} S`, mots: 'sauvegarder fichier memc', faire: () => void this.sauvegarde.ctrlS() },
      { titre: 'Ouvrir un classeur', icone: 'ouvrir', touche: `${CTRL} O`, mots: 'fichier memc', faire: () => this.sauvegarde.ouvrir() },
      { titre: 'Exporter le classeur en PDF', icone: 'pdf', mots: 'imprimer pdf', faire: () => this.exporterPdf('classeur') },
    )
    for (const e of EXEMPLES) l.push({ titre: e.nom, genre: 'Construction', icone: 'construction', detail: 'Programme de construction', mots: e.texte, faire: () => this.constructeur.ouvrirAvec(e.texte) })
    l.push({ titre: 'Les ensembles ℕ ⊂ ℤ ⊂ 𝔻 ⊂ ℚ ⊂ ℝ', genre: 'Catalogue', icone: 'catalogue', detail: 'Le dessin à poser', mots: 'ensembles de nombres entiers naturels relatifs decimaux rationnels reels', faire: () => this.catalogue.poserElement() })
    for (const t of Trigo.ELEMENTS) l.push({ titre: t.nom, genre: 'Catalogue', icone: 'catalogue', detail: 'Trigonométrie (1re spé)', mots: t.mots, faire: () => this.catalogue.poserElement(t.cle) })
    for (const d of FORMULES) l.push({ titre: `Formules : ${d.nom}`, genre: 'Catalogue', icone: 'catalogue', detail: 'Trigonométrie (1re spé)', mots: `formules trigonometrie ${d.titre}`, faire: () => this.catalogue.poserElement(d.nom) })
    for (const d of DEMONSTRATIONS) l.push({ titre: d.nom, genre: 'Catalogue', icone: 'catalogue', detail: 'Démonstration à poser', mots: `demonstration ${d.titre} ${d.nom.replace('√', ' racine ')}`, faire: () => this.catalogue.poserElement(d.nom) })
    // Les automatismes de chaque niveau qui en a (5e, 4e…) : le thème, et chaque automatisme
    for (const n of NIVEAUX.filter(x => x.automatismes.length)) {
      // Seulement ce que le flash pose : pas les applications directes
      const autos = automatismesDuFlash(n)
      for (const theme of new Set(autos.map(a => a.theme))) l.push({ titre: `${theme} (${n.nom})`, genre: 'Automatismes', icone: 'automatismes', detail: 'Le thème coché', mots: autos.filter(a => a.theme === theme).map(a => a.titre).join(' '), faire: () => this.flash.ouvrir([`${n.id}/${theme}`]) })
      for (const a of autos) l.push({ titre: a.titre, genre: 'Automatismes', icone: 'automatismes', detail: `${a.theme} (${n.nom})`, faire: () => this.flash.ouvrir([`${n.id}/${a.theme}`]) })
    }
    return l
  },

  /** L'aide et les raccourcis (la touche « ? », ou les outils de classe) */
  ouvrirAide(this: UI): void {
    fermerMenu()
    ouvrirAide(this.racine)
  },

  /** Les conseils du premier lancement (voir aide.ts) : une fois le tableau
   *  prêt, quand aucune fenêtre n'est ouverte */
  lancerConseils(this: UI): void {
    montrerConseils(this.racine, [
      { titre: 'Nouveau : les outils de classe', texte: 'Le rideau, le pointeur laser, le minuteur et le tirage au sort sont réunis sous ce bouton.', ancre: () => this.boutonOutilsClasse },
      { titre: 'L\'aide, à tout moment', texte: 'La touche « ? » ouvre l\'aide : tous les raccourcis du clavier et les gestes.', ancre: () => this.boutonOutilsClasse },
      { titre: 'Nouveau : la recherche', texte: `Un outil, une formule écrite dans n'importe quel classeur, une page, une séance : tapez quelques mots ici, ou ${TOUCHE_RECHERCHE} depuis n'importe où.`, ancre: () => this.champRecherche, serie: 2 },
    ], () => !document.querySelector('dialog[open]') && !document.body.classList.contains('en-bibliotheque') && !menuOuvert())
  },

  /** « Importer une image » (le bouton de la barre du haut, ou « Plus » au
   *  téléphone) : le choix du fichier s'ouvre. Le pointeur qui l'a touché
   *  est noté : le message de l'import parle sa langue (P à la souris et à
   *  la tablette graphique, le bouton Stylo au doigt ; au clavier, Entrée :
   *  le dernier vu sur le tableau, voir App.importerImage). */
  choisirImage(this: UI, e?: Event): void {
    const t = (e as PointerEvent | undefined)?.pointerType
    this.pointeurImport = t ? typePointeur(t) : undefined
    this.choixFichier.click()
  },

  /** Le menu du zoom, refait à chaque ouverture (la sélection a pu changer) */
  construireMenuZoom(this: UI): void {
    const app = this.app, m = this.menuZoom.el
    m.replaceChildren()
    const entree = (texte: string, faire: () => void, o: Parameters<UI['entreeMenu']>[3] = {}) => this.entreeMenu(m, texte, faire, o)
    const rien = !app.selection.size && !app.partie
    entree('100 %', () => app.zoom100(), { touche: `${CTRL} + 0` })
    entree('Tout voir', () => app.toutVoir(), { touche: 'Maj + 1' })
    entree('Voir la sélection', () => app.voirSelection(), { touche: 'Maj + 2', inactif: rien })
    m.appendChild(Object.assign(document.createElement('hr'), { className: 'menu-filet' }))
    m.appendChild(Object.assign(document.createElement('div'), { className: 'menu-titre', textContent: 'Molette de la souris' }))
    const molette = (choix: Molette, texte: string, aide?: string) => entree(texte, () => {
      choisirMolette(choix)
      this.message(choix === 'defile' ? `La molette fait défiler la page ; ${CTRL} + molette zoome.`
        : 'La molette zoome ; Maj + molette fait défiler.')
    }, { coche: reglages.molette === choix, aide })
    molette('defile', 'Fait défiler', `${CTRL} + molette : zoomer`)
    molette('zoome', 'Zoome')
  },

  /** Le menu du bouton ⋯, refait à chaque ouverture (l'état de la
   *  sauvegarde a pu changer) : en tête, le bloc du classeur (son nom, l'état
   *  de sa sauvegarde, ligne par ligne, et le bouton d'une ligne qui demande
   *  quelque chose) ; puis les entrées, chacune avec son data-action. */
  construireMenuFichier(this: UI): void {
    const m = this.menuFichier.el, s = this.sauvegarde
    m.replaceChildren()
    // Au téléphone (lot 5, K10), « Plus » commence par ce que la barre du
    // haut n'y montre pas : la page, les outils de cours, la vue
    const telephone = this.telephone
    m.setAttribute('aria-label', telephone ? 'Plus' : MENU_FICHIER)
    if (telephone) {
      this.sectionsDuTelephone(m)
      filetMenu(m)
    } else if (!this.boutonNuit.getClientRects().length) {
      // Entre 900 et 1100 px de large (un vidéoprojecteur de 1024 × 768), la
      // barre du haut n'a pas la place de ces trois boutons (.replie-etroit) :
      // ils sont ici, en cases, en tête du menu
      this.casesDeLaPage(m)
      filetMenu(m)
    }
    const bloc = this.blocEtat = document.createElement('div')
    bloc.className = 'bloc-classeur'
    bloc.setAttribute('role', 'group')
    this.remplirBlocEtat()
    m.appendChild(bloc)
    m.appendChild(Object.assign(document.createElement('hr'), { className: 'menu-filet' }))
    // Les séances et la bibliothèque d'abord : le bouton du classeur y mène
    // aussi ; caché faute de place (le téléphone), c'est le seul chemin
    if (this.formeClasseur === 'cache') this.entreeMenu(m, 'Séances du chapitre…', e => this.basculerMenuSeances(this.boutonFichier, e.detail === 0), { action: 'seances-du-chapitre' })
    this.entreeMenu(m, 'Bibliothèque des classeurs…', () => this.ouvrirBibliotheque(this.formeClasseur === 'cache' ? this.boutonFichier : this.boutonClasseur), { action: 'bibliotheque',
      aide: 'Tous vos classeurs : en ouvrir un autre, en créer un.' })
    // L'emploi du temps (lot 2 de l'audit) : une ligne courte, sans aide
    const edt = this.emploiDuTemps
    if (edt) this.entreeMenu(m, 'Emploi du temps…', () => edt(), { action: 'emploi-du-temps' })
    m.appendChild(Object.assign(document.createElement('hr'), { className: 'menu-filet' }))
    // Le menu réduit du lot 18 : trois états, selon le fichier du classeur.
    // (1) Le classeur a son fichier (la clé active : à jour, en pause, en
    // conflit, par l'autre onglet…) : Ctrl + S y écrit aussitôt quand cet
    // onglet écrit (sauvegarde.ctrlS), sinon il fait « Enregistrer une
    // copie… » ; « Déplacer le classeur… » (le fichier suit, C2) ; plus
    // d'entrée pour arrêter (déplacer le propose, pour un fichier choisi à
    // la main). (2) Pas de fichier, sur Chrome ou Edge : « Enregistrer le
    // classeur… », puis ranger le niveau (« Ranger « 2nde » dans un
    // dossier… »), ou lui donner son fichier (le niveau est rangé), ou
    // choisir un fichier à la main (un classeur à la racine, un navigateur
    // qui ne choisit pas de dossier). (3) Le navigateur ne sait pas écrire
    // un fichier tout seul (iPad, Firefox, Safari) : Enregistrer, et c'est
    // tout. Puis, toujours : le PDF, « Autres sauvegardes… » (le Drive, le
    // .memb, récupérer), Ouvrir.
    const cle = this.cle
    const { aUnFichier, rangeable, rangeDans, forme } = this.formeDuMenuFichier()
    this.formeMenuFichier = forme
    if (aUnFichier && cle) {
      this.entreeMenu(m, 'Enregistrer une copie…', () => void s.enregistrer(), { touche: cle.peutEnregistrer() ? undefined : `${CTRL} + S`, action: 'enregistrer',
        aide: 'Un autre fichier .memc, daté, avec toutes les pages et tout l\'historique. Ne le donnez pas aux élèves (pour eux : Publier).' })
      // (gris tant que main.ts ne l'a pas branché : le morceau C2)
      const deplacer = this.deplacerClasseur
      this.entreeMenu(m, 'Déplacer le classeur…', () => deplacer?.(), { action: 'deplacer-classeur', inactif: !deplacer,
        aide: 'Dans un autre niveau ou un autre dossier : son fichier suit.' })
    } else {
      this.entreeMenu(m, 'Enregistrer le classeur…', () => void s.enregistrer(), { touche: `${CTRL} + S`, action: 'enregistrer',
        aide: 'Un fichier .memc avec toutes les pages et tout l\'historique, à garder ou à ouvrir ailleurs. Il garde aussi ce qui a été effacé : ne le donnez pas aux élèves (pour eux : Publier).' })
      const ranger = this.actionsEtat.get('ranger-niveau'), donner = this.actionsEtat.get('donner-fichier')
      if (cle?.disponible && rangeable !== null && ranger) {
        this.entreeMenu(m, this.libelleDe(ranger), () => ranger.faire(), { action: 'ranger-niveau',
          aide: 'Choisissez une fois le dossier de l\'ordinateur où va ce dossier : chacun de ses classeurs y a son fichier, écrit tout seul.' })
      } else if (cle?.disponible && rangeDans !== null && donner) {
        this.entreeMenu(m, this.libelleDe(donner), () => donner.faire(), { action: 'donner-fichier',
          aide: `Son fichier ira dans « ${rangeDans} › ${nomSur(this.app.classeur.nom)} », écrit tout seul.` })
      } else if (cle?.disponible) this.entreeMenu(m, 'Enregistrer automatiquement dans un fichier…', () => void cle.activer(), { action: 'activer-cle', aide: AIDE_ACTIVER })
    }
    // Tout le classeur, séance après séance (lot 6 : la trieuse et le menu de la page exportent la séance)
    this.entreeMenu(m, 'Exporter le classeur en PDF…', () => this.exporterPdf('classeur'), { action: 'exporter-pdf',
      aide: 'Toutes les pages, cadrées sur leur contenu, en feuilles A4 à imprimer ou à déposer dans l\'ENT.' })
    // Le reste de ce qui sauvegarde (lot 18) : la copie sur le Drive par
    // connexion Google (lot 4 C10), le .memb, récupérer une sauvegarde, les
    // niveaux sur le Drive (lot 7) ; pas dans le repli (rien à y mettre)
    const autres = this.autresSauvegardes
    if (autres) this.entreeMenu(m, 'Autres sauvegardes…', () => autres(), { action: 'autres-sauvegardes', aide: AIDE_AUTRES })
    this.entreeMenu(m, 'Ouvrir un classeur…', () => s.ouvrir(), { touche: `${CTRL} + O`, action: 'ouvrir',
      aide: this.fichiers ? AIDE_OUVRIR : 'Remplace ce classeur par celui d\'un fichier .memc.' })
    // Les séances du chapitre (lot 6), après ce qui touche au classeur
    const seance = this.app.seanceVue
    // (courtes, sans aide : le menu tient sans défiler au poste de la classe ;
    // « Séance précédente » est à côté de l'étiquette de la séance, et ici
    // au téléphone, où l'étiquette n'est pas, et sur un écran qu'on touche,
    // où son petit bouton est loin du doigt)
    if (seance) {
      filetMenu(m)
      this.entreeMenu(m, 'Nouvelle séance', () => this.nouvelleSeance(), { action: 'nouvelle-seance' })
      this.entreeMenu(m, 'Renommer la séance…', () => void this.renommerSeance(), { action: 'renommer-seance' })
      const avant = this.app.tableau.seancesDuClasseur().filter(x => x.pages.length && x.debut < seance.debut).length > 0
      if (telephone || ecranTactile()) this.entreeMenu(m, 'Séance précédente…', () => this.bandeauxSeances.ouvrirSeancePrecedente(), { action: 'seance-precedente', inactif: !avant })
      if (this.app.enSeancePassee) this.entreeMenu(m, 'Retour à aujourd\'hui', () => this.app.retourAujourdhui(), { action: 'retour-aujourdhui' })
    }
    // Cet appareil (lot 5) : l'affichage de CET écran, gardé dans ce
    // navigateur ; rien ne change dans le classeur, ni pour les élèves. Les
    // noms sous les outils ne vont pas dans la mise en page du téléphone (la
    // place y manque) : grisés là, ils reviennent en la quittant.
    filetMenu(m)
    titreMenu(m, 'Cet appareil')
    this.entreeMenu(m, 'Contraste renforcé', () => this.choisirContraste(!reglages.contraste), { action: 'contraste',
      coche: reglages.contraste, caseACocher: true,
      aide: 'Pour le vidéoprojecteur : lignes du fond, barres et sélection plus marquées. Rien ne change dans le classeur.' })
    this.entreeMenu(m, 'Noms sous les outils', e => this.choisirNomsOutils(!nomsOutilsVisibles(), e), { action: 'noms-outils',
      coche: nomsOutilsVisibles(), caseACocher: true, inactif: telephone,
      aide: telephone ? 'Un mot sous chaque bouton des barres (pas sur un téléphone : la place manque)' : 'Un mot sous chaque bouton des barres' })
  },

  /** Ce dont dépendent les entrées du menu ⋯ (lot 18) : le classeur a son
   *  fichier (la clé active, son état), Ctrl + S y écrit directement, le
   *  niveau à ranger, le dossier où irait le fichier ; et le tout en une
   *  chaîne, pour savoir si le menu ouvert est à refaire */
  formeDuMenuFichier(this: UI): { aUnFichier: boolean; rangeable: string | null; rangeDans: string | null; forme: string } {
    const cle = this.cle, c = this.surveillance?.etat.cle
    const aUnFichier = !!cle?.actif && !!c && aSonFichier(c)
    const rangeable = !aUnFichier && c?.etat === 'absente' ? c.rangeable?.niveau ?? null : null
    const rangeDans = !aUnFichier && c?.etat === 'absente' && !c.message ? c.rangeDans ?? null : null
    const forme = `${aUnFichier ? 'fichier' : cle?.disponible ? 'sans' : 'impossible'}|${cle?.peutEnregistrer() ? 'direct' : ''}|${rangeable ?? ''}|${rangeDans ?? ''}|${this.deplacerClasseur ? 'deplacer' : ''}|${this.autresSauvegardes ? 'autres' : ''}`
    return { aUnFichier, rangeable, rangeDans, forme }
  },

  /** Les cases de la page : « Mode nuit », « Aimanter au quadrillage », « Le
   *  stylo redresse les figures » (au téléphone, et entre 900 et 1100 px de
   *  large, où leurs boutons n'ont pas la place) */
  casesDeLaPage(this: UI, m: HTMLElement): void {
    const app = this.app
    this.entreeMenu(m, 'Mode nuit', () => app.basculerNuit(), { action: 'nuit', coche: app.nuit, caseACocher: true, aide: 'Fond noir, écriture claire' })
    this.entreeMenu(m, 'Aimanter au quadrillage', () => this.basculerAimant(), { action: 'aimant', coche: app.aimant, caseACocher: true })
    this.entreeMenu(m, 'Le stylo redresse les figures', () => this.basculerReconnaissance(), { action: 'reconnaissance', coche: app.reconnaissance, caseACocher: true,
      aide: 'Carré, cercle, triangle…' })
  },

  /** Les premières sections de « Plus », au téléphone (lot 5, K10) : ce que
   *  la barre du haut et la barre des outils n'y montrent pas, chaque entrée
   *  de 44 px au moins (le menu défile s'il dépasse l'écran : voir le bouton) :
   *  - « Page » : « Nouvelle page » quand son bouton n'a pas la place (sous
   *    360 px de large), « Supprimer la page » (« Effacer la page » si elle
   *    est seule), « Fond… » (le menu des fonds en vignettes), « Aimanter au
   *    quadrillage » et « Le stylo redresse les figures » (des cases) ;
   *  - « Outils de cours » : « Importer une image… », « Instruments… » (leur
   *    liste, sous la barre du haut), « Programme de construction »,
   *    « Automatismes », « Revoir la construction », « Publier le replay » ;
   *  - « Vue » : « 100 % », « Tout voir » (la barre du zoom est cachée : le
   *    pincement zoome). */
  sectionsDuTelephone(this: UI, m: HTMLElement): void {
    const app = this.app, plus = this.boutonFichier
    titreMenu(m, 'Page')
    if (!this.boutonNouvelle.getClientRects().length) this.entreeMenu(m, 'Nouvelle page', () => app.nouvellePage(), { action: 'nouvelle-page' })
    const seule = app.pages.length <= 1
    this.entreeMenu(m, seule ? 'Effacer la page' : 'Supprimer la page', () => app.supprimerPage(), { action: 'supprimer-page' })
    this.entreeMenu(m, 'Fond…', e => this.ouvrirFondsDepuisPlus(e.detail === 0), { action: 'fond', aide: nomDuFond(app.fond) })
    this.casesDeLaPage(m)
    filetMenu(m)
    titreMenu(m, 'Outils de cours')
    this.entreeMenu(m, 'Importer une image ou un PDF…', e => this.choisirImage(e), { action: 'importer' })
    this.entreeMenu(m, 'Instruments…', () => { this.choixInstruments.hidden = false; this.maj() }, { action: 'instruments',
      aide: 'Règle, équerre, rapporteur, compas' })
    this.entreeMenu(m, 'Programme de construction', () => this.basculerConstructeur(), { action: 'construction', aide: 'Étape par étape' })
    this.entreeMenu(m, 'Catalogue', () => this.basculerCatalogue(), { action: 'catalogue', aide: 'Ensembles de nombres…' })
    this.entreeMenu(m, 'Automatismes', () => this.flash.ouvrir(), { action: 'automatismes', aide: 'Un flash de questions' })
    this.entreeMenu(m, 'Outils de classe…', () => this.ouvrirOutilsClasseDepuisPlus(), { action: 'outils-classe', aide: 'Rideau, laser, minuteur, tirage au sort' })
    this.entreeMenu(m, 'Revoir la construction', () => this.ouvrirRevue(plus), { action: 'revue', aide: 'Une page, une séance, pas à pas' })
    this.entreeMenu(m, 'Publier le replay', () => this.publication.ouvrir(), { action: 'publier', aide: 'Pour les élèves' })
    filetMenu(m)
    titreMenu(m, 'Vue')
    this.entreeMenu(m, '100 %', () => app.zoom100(), { action: 'zoom-100', touche: `${CTRL} + 0` })
    this.entreeMenu(m, 'Tout voir', () => app.toutVoir(), { action: 'tout-voir', touche: 'Maj + 1' })
  },

  /** « Plus → Outils de classe… » au téléphone : leur menu, sous « Plus » */
  ouvrirOutilsClasseDepuisPlus(this: UI): void {
    const el = this.menuOutilsClasse.el
    this.construireMenuOutilsClasse(el)
    ouvrirMenu({ el, bouton: this.boutonFichier })
    placerMenu(el, this.boutonFichier.getBoundingClientRect(), 'dessous')
  },

  /** « Plus → Fond… » au téléphone : le menu des fonds en vignettes, sous
   *  « Plus » (son bouton à lui est caché), sur deux colonnes en portrait (en
   *  paysage, ses deux rangées de quatre tiennent dans la hauteur, que quatre
   *  rangées de deux dépasseraient) */
  ouvrirFondsDepuisPlus(this: UI, auClavier: boolean): void {
    const app = this.app, el = this.menuFonds.el
    construireMenuFonds(el, app.fond, f => app.changerFond(f))
    el.classList.toggle('deux-colonnes', this.barreEnBas())
    ouvrirMenu(this.menuFondsPlus)
    placerMenu(el, this.boutonFichier.getBoundingClientRect(), 'dessous')
    if (auClavier) entreeCochee(el)?.focus()
  },

  /** Le bloc de l'état en tête du menu ⋯ : le nom du classeur, ses lignes
   *  (data-ligne : navigateur, cle, drive, fichier), et pour une ligne qui
   *  demande quelque chose, son bouton (une entrée du menu : les flèches y
   *  passent). Refait quand l'état change, sauf si le focus y est. */
  remplirBlocEtat(this: UI): void {
    const bloc = this.blocEtat
    if (!bloc) return
    const nom = Object.assign(document.createElement('div'), { className: 'bloc-nom', id: 'bloc-classeur-nom', textContent: this.app.classeur.nom, title: this.app.classeur.nom })
    bloc.setAttribute('aria-labelledby', nom.id)
    const liste = document.createElement('ul')
    liste.className = 'bloc-lignes'
    const lignes: LigneEtat[] = this.surveillance?.texte.lignes ?? []
    lignes.forEach((l, i) => {
      const li = document.createElement('li')
      li.className = 'ligne-etat ' + l.niveau
      li.dataset.ligne = l.quoi
      const texte = Object.assign(document.createElement('span'), { className: 'texte-ligne', id: `ligne-etat-${i}`, textContent: l.texte })
      li.appendChild(texte)
      // Le bouton de la ligne, et les suivants ; ni « Enregistrer
      // automatiquement dans un fichier… » ni « Lui donner son fichier » :
      // l'entrée du menu, juste dessous, le fait
      for (const action of [l.action, ...(l.plus ?? [])]) {
        const a = action && action !== 'activer-cle' && action !== 'donner-fichier' ? this.actionsEtat.get(action) : undefined
        if (!a || !action) continue
        const b = document.createElement('button')
        b.type = 'button'; b.className = 'menu-item action-etat'
        b.setAttribute('role', 'menuitem')
        b.dataset.etatAction = action
        b.setAttribute('aria-describedby', texte.id)
        b.textContent = this.libelleDe(a)
        b.addEventListener('click', () => { fermerMenu(); a.faire() })
        li.appendChild(b)
      }
      liste.appendChild(li)
    })
    bloc.replaceChildren(nom, liste)
  },
}
