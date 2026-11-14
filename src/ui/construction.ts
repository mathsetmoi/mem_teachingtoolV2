// =============================================================
// L'INTERFACE : LA MISE EN PAGE DU TÉLÉPHONE, LA CONSTRUCTION DES BARRES, LE COMPTEUR
// Des méthodes de la classe UI (src/ui.ts), rangées ici par sujet :
// elles s'ajoutent à la classe à la fin de ui.ts (ajouterMethodes).
// =============================================================
import type { UI } from '../ui'
import { COULEURS } from '../app'
import { BarreActions } from '../barre-actions'
import { Catalogue } from '../catalogue-vue'
import { Courbes } from '../courbes/panneau'
import { Constructeur } from '../constructeur'
import { VignetteEnonce } from '../enonce'
import { Flash } from '../flash'
import { icone } from '../icones'
import { INSTRUMENTS } from '../instruments'
import { VIGNETTE_BOUTON, densite, entreeCochee, vignetteDuFond } from '../menu-fonds'
import { basculerMenu, fermerMenu, focusVenuDuClavier, placerMenu } from '../menus'
import { CTRL, TELEPHONE } from '../navigateur'
import { OutilsDeClasse } from '../outils-classe'
import { Trieuse } from '../pages/trieuse'
import { Vignettes } from '../pages/vignettes'
import { messageNomsOutils, typePointeur } from '../pointeurs'
import { Publication } from '../publication/fenetre'
import { lireContenu } from '../recherche'
import { FenetreRecherche, TOUCHE_RECHERCHE } from '../recherche-vue'
import { choisirNomsOutils, nomsOutilsVisibles } from '../reglages'
import { RevueEnClasse } from '../revue/revue'
import { Sauvegarde } from '../sauvegarde'
import { BandeauxSeances } from '../seances-vue'
import { Apercus } from '../sorties/apercu'
import { imagePng } from '../sorties/image'
import { ESSENTIELS, ID_ETAT, MENU_FICHIER, NOMS_OUTILS, OUTILS, TITRE_FICHIER, TITRE_SUIVANTE, TYPES_FORMES, appareilTactile, bouton, nommer } from '../ui'
import katex from 'katex'

export const methodesConstruction = {
  /** Au téléphone, la barre des outils est-elle posée en bas (en portrait),
   *  plutôt qu'à gauche (en paysage) ? Mesuré : elle est alors plus large que
   *  haute. */
  barreEnBas(this: UI): boolean {
    if (!this.telephone) return false
    const r = this.barreOutils.getBoundingClientRect()
    return r.width > r.height
  },

  /** Les noms sous les outils (lot 5, D15) : body.noms-outils, d'après le
   *  réglage (voir nomsOutilsVisibles : en 'auto', l'écran décide, et la
   *  décision ne change pas quand on tourne la tablette), jamais dans la
   *  mise en page du téléphone. Quand ils paraissent ou s'en vont, les
   *  barres changent de taille : le compteur et le bouton du classeur se
   *  règlent de nouveau, la barre d'actions se replace (maj). */
  majNomsOutils(this: UI): void {
    const oui = nomsOutilsVisibles() && !(typeof matchMedia === 'function' && matchMedia(TELEPHONE).matches)
    if (oui === this.nomsMontres && document.body.classList.contains('noms-outils') === oui) return
    this.nomsMontres = oui
    document.body.classList.toggle('noms-outils', oui)
    this.compteurARegler = true
    if (this.app.ui === this) { this.majCouleursRepliees(); this.maj() }
  },

  /** Les couleurs et l'épaisseur de la barre des outils, sur un écran qu'on
   *  touche (contrôle final du lot 5 ; l'étude, [18] : des cibles agrandies
   *  au TNI). Sur l'iPad, la tablette Android, le TNI, l'écran tactile d'un
   *  portable (body.tactile : le doigt y a un rôle, comme pour son bouton),
   *  les pastilles de la grille font 44 × 44 au lieu de 34 × 34. Plus
   *  hautes, elles feraient défiler la barre sur un écran bas (depuis les
   *  gains rapides du lot 16, la barre est plus courte : Annuler et Rétablir
   *  sont en haut, l'épaisseur tient sur un bouton ; elle tient sur le TNI
   *  avec ses noms et sur l'iPad couché, et ne se replie plus que sur un
   *  écran de moins de 700 px de haut environ, une fenêtre de Chrome sur un
   *  portable tactile) : la barre replie alors la grille et le bouton de
   *  l'épaisseur dans « Couleur », le bouton du téléphone (un rond de la
   *  couleur en main ; son menu, les quatre pastilles et les trois tailles
   *  en 44 × 44), à leur place, après le filet. Mesuré : dépliée, la barre
   *  dépasse-t-elle la hauteur qu'elle a ? (la mesure se fait toujours
   *  dépliée, dans la même tâche : rien ne se peint entre les deux, et la
   *  décision ne dépend pas de l'état d'avant). Refait quand la fenêtre
   *  change (une tablette qu'on tourne), quand les noms paraissent ou s'en
   *  vont, et quand le bouton du doigt paraît. Au poste de la classe
   *  (souris, tablette graphique), rien ne change : la barre défile sur un
   *  écran très bas, comme depuis le lot 1 ; au téléphone, « Couleur » est
   *  déjà là (sa mise en page). */
  majCouleursRepliees(this: UI): void {
    const b = this.barreOutils
    if (!b) return
    const tactile = !this.boutonDoigt.hidden
    document.body.classList.toggle('tactile', tactile)
    let replier = false
    if (tactile && !this.telephone) {
      b.classList.remove('couleurs-repliees')
      replier = b.clientHeight > 0 && b.scrollHeight > b.clientHeight + 1
    }
    b.classList.toggle('couleurs-repliees', replier)
    if (replier === this.couleursRepliees) return
    this.couleursRepliees = replier
    // Dépliée, « Couleur » n'est plus là : son menu ouvert se ferme
    if (!replier && !this.telephone && !this.menuCouleur.el.hidden) fermerMenu()
    if (this.app.ui === this) this.maj()
  },

  /** « Contraste renforcé » (lot 5), du menu ⋯ de la barre du haut */
  choisirContraste(this: UI, oui: boolean): void {
    this.app.choisirContraste(oui)
    document.body.classList.toggle('contraste', oui)
    this.message(oui ? 'Contraste renforcé, sur cet appareil' : 'Contraste normal')
  },

  /** « Noms sous les outils » (lot 5), du menu ⋯ de la barre du haut : le
   *  message dit, à la souris et au stylet qui survole, que le nom paraît
   *  encore au survol ; au doigt, au TNI, il n'y a pas de survol. Le
   *  pointeur est celui du clic (au clavier, le dernier vu sur le tableau). */
  choisirNomsOutils(this: UI, oui: boolean, e?: MouseEvent): void {
    choisirNomsOutils(oui)
    this.majNomsOutils()
    const t = (e as PointerEvent | undefined)?.pointerType
    this.message(messageNomsOutils(oui, t ? typePointeur(t) : this.app.dernierPointeur))
  },

  construire(this: UI): void {
    const app = this.app

    // ----- Barre des outils, à gauche -----
    const outils = document.createElement('nav')
    outils.className = 'barre barre-outils'
    outils.setAttribute('aria-label', 'Outils')
    for (const o of OUTILS) {
      const b = bouton(o.id, `${o.nom} (${o.touche})`, e => (o.id === 'gomme' ? this.toucherGomme(e as MouseEvent) : app.choisirOutil(o.id)), 'outil')
      // Au téléphone (lot 5, K10), seuls le Stylo, la Gomme et la Sélection
      // restent dans la barre : les autres sont dans « Autres outils »
      if (!ESSENTIELS.includes(o.id)) b.classList.add('seulement-large')
      this.outils.set(o.id, b)
      outils.appendChild(b)
    }
    // La Gomme a ses options (lot 5) : son menu, à droite de la barre, à la
    // hauteur de son bouton, comme celui du doigt
    const menuGomme = document.createElement('div')
    menuGomme.className = 'menu-flottant'; menuGomme.setAttribute('role', 'menu'); menuGomme.setAttribute('aria-label', 'Gomme')
    menuGomme.hidden = true
    this.menuGomme = { el: menuGomme, bouton: this.outils.get('gomme')! }
    this.brancherBoutonGomme(this.outils.get('gomme')!)
    // Le rôle du doigt, après « Déplacer la vue » : seulement sur un appareil
    // tactile (sur le poste de la classe, souris et tablette graphique, il n'a
    // pas de sens). Il ouvre son menu, à droite de la barre.
    this.boutonDoigt = bouton('doigt', 'Rôle du doigt', e => this.basculerReglageDoigt((e as MouseEvent).detail === 0))
    this.boutonDoigt.setAttribute('aria-haspopup', 'menu'); this.boutonDoigt.setAttribute('aria-expanded', 'false')
    this.boutonDoigt.hidden = !appareilTactile()
    this.boutonDoigt.classList.add('seulement-large')
    outils.appendChild(this.boutonDoigt)
    const menuDoigt = document.createElement('div')
    menuDoigt.className = 'menu-flottant'; menuDoigt.setAttribute('role', 'menu'); menuDoigt.setAttribute('aria-label', 'Rôle du doigt')
    menuDoigt.hidden = true
    this.menuDoigt = { el: menuDoigt, bouton: this.boutonDoigt }
    outils.appendChild(Object.assign(document.createElement('hr'), { className: 'filet seulement-large' }))
    // Les quatre couleurs, en grille 2 × 2 (gains rapides, lot 16 : Noir,
    // Bleu / Rouge, Vert), chacune à un clic ; la grille tient la place de
    // deux pastilles d'avant, et la barre tient dans un écran de 657 px
    const grille = this.grillePastilles = document.createElement('div')
    grille.className = 'grille-pastilles seulement-large'
    for (const c of COULEURS) {
      const b = document.createElement('button')
      b.type = 'button'; b.className = 'pastille'; b.title = c.nom; b.setAttribute('aria-label', c.nom)
      b.style.setProperty('--teinte', c.valeur)
      b.addEventListener('click', () => this.choisirCouleur(c.valeur))
      this.pastilles.push(b); grille.appendChild(b)
    }
    outils.appendChild(grille)
    // L'épaisseur du trait (gains rapides, lot 16) : un seul bouton, qui
    // montre l'épaisseur de l'outil en main (le trait dessiné dessus, comme
    // sur les trois boutons d'avant), et ouvre le menu des trois, à droite
    // de la barre, à la hauteur du bouton (comme celui de la Gomme). Le
    // Surligneur garde son épaisseur à lui (voir App.tailleEnMain).
    const epaisseur = this.boutonEpaisseur = document.createElement('button')
    epaisseur.type = 'button'; epaisseur.className = 'bouton bouton-epaisseur seulement-large'
    epaisseur.setAttribute('aria-haspopup', 'menu'); epaisseur.setAttribute('aria-expanded', 'false')
    this.traitEpaisseur = Object.assign(document.createElement('span'), { className: 'trait' })
    this.traitEpaisseur.setAttribute('aria-hidden', 'true')
    epaisseur.appendChild(this.traitEpaisseur)
    const menuEpaisseur = document.createElement('div')
    menuEpaisseur.className = 'menu-flottant menu-epaisseur'; menuEpaisseur.setAttribute('role', 'menu'); menuEpaisseur.setAttribute('aria-label', 'Épaisseur du trait')
    menuEpaisseur.hidden = true
    this.menuEpaisseur = { el: menuEpaisseur, bouton: epaisseur }
    epaisseur.addEventListener('click', e => this.basculerMenuEpaisseur((e as MouseEvent).detail === 0))
    outils.appendChild(epaisseur)
    this.majBoutonEpaisseur()
    // « Couleur » (au téléphone, et sur un écran qu'on touche où la barre
    // replie ses couleurs) et « Autres outils » (au téléphone seulement) ;
    // au téléphone, Annuler et Rétablir viennent entre les deux (voir
    // placerHistorique) : le document a l'ordre de l'écran
    this.construireBoutonsDuTelephone(outils)
    this.barreOutils = outils
    // Les noms sous les outils (lot 5) : cachés, sauf sous body.noms-outils
    for (const [id, b] of this.outils) nommer(b, NOMS_OUTILS[id])
    nommer(this.boutonDoigt, 'Doigt')
    nommer(epaisseur, 'Épaisseur')
    // « Couleur » a son nom aussi : la barre repliée d'un écran qu'on touche,
    // avec les noms allumés, le montre (au téléphone, les noms ne viennent pas)
    nommer(this.boutonCouleur, 'Couleur')
    // Le bord droit de la barre des outils, mesuré, dans --droite-barre-outils
    // (lot 5) : avec les noms, elle s'élargit (jusqu'à 80 px), et la barre du
    // classeur, posée 12 px plus loin, et la largeur de la barre du haut
    // (style.css) le suivent. Quand il bouge, le bouton du classeur se
    // replace (avec le compteur, voir reglerCompteur), comme quand la
    // fenêtre change ; les choix des Formes et du Segment, les menus du
    // doigt et de la Gomme se placent déjà sur lui, mesuré, à chaque fois.
    let droiteVue = -1
    const droiteDeLaBarre = () => {
      const r = outils.getBoundingClientRect()
      if (!r.width) return
      const d = Math.ceil(r.right - this.racine.getBoundingClientRect().left)
      if (d === droiteVue) return
      const premiere = droiteVue < 0
      droiteVue = d
      this.racine.style.setProperty('--droite-barre-outils', d + 'px')
      if (!premiere) { this.compteurARegler = true; requestAnimationFrame(() => this.maj()) }
    }
    if (typeof ResizeObserver === 'function') new ResizeObserver(droiteDeLaBarre).observe(outils)
    window.addEventListener('resize', droiteDeLaBarre)
    // Sur un écran qu'on touche, la barre des outils replie ses couleurs
    // quand elle ne tient plus dans la hauteur (voir majCouleursRepliees)
    window.addEventListener('resize', () => this.majCouleursRepliees())
    // Sur un écran bas, la barre défile (voir style.css) : les choix des Formes
    // et du Segment suivent leur bouton, le menu du doigt le sien
    outils.addEventListener('scroll', () => {
      this.maj()
      if (!this.menuDoigt.el.hidden) this.placerMenuDoigt()
      if (!this.menuGomme.el.hidden) this.placerMenuGomme()
      if (!this.menuEpaisseur.el.hidden) this.placerMenuEpaisseur()
    }, { passive: true })

    // ----- Barre des pages, en haut à droite -----
    const haut = document.createElement('div')
    haut.className = 'barre barre-haut'
    this.barreHaut = haut
    // Le bas de la barre du haut, mesuré, dans --bas-barre-haut : sur un
    // téléphone en portrait, elle passe sur plusieurs rangées (trois sur un
    // iPhone 12 : jusqu'à y = 162), et la barre des outils, posée en bas, ne
    // monte jamais sous elle (voir style.css ; le contrôle final du lot 4 :
    // le bouton Stylo y était à moitié couvert, un toucher ne l'atteignait
    // pas). Suivi quand elle change de taille (sa largeur, ses rangées, le
    // bouton du classeur qui y entre), et quand la fenêtre change.
    const basDeLaBarreDuHaut = () => {
      const r = haut.getBoundingClientRect()
      if (!r.height) return
      const dans = this.racine.getBoundingClientRect().top
      this.racine.style.setProperty('--bas-barre-haut', Math.ceil(r.bottom - dans) + 'px')
    }
    if (typeof ResizeObserver === 'function') new ResizeObserver(basDeLaBarreDuHaut).observe(haut)
    window.addEventListener('resize', basDeLaBarreDuHaut)
    // Annuler et Rétablir, en tête de la barre du haut (gains rapides, lot
    // 16 : toujours dans l'écran, là où la barre de gauche les faisait
    // défiler sur un écran bas) ; un petit filet vertical les sépare de ‹.
    // Ils n'agissent que sur la page visible : grisés quand elle n'a rien à
    // défaire ou à refaire (ils gardent leur place). Au téléphone, les mêmes
    // deux boutons sont dans la barre du bas (voir placerHistorique).
    this.boutonAnnuler = bouton('annuler', `Annuler sur cette page (${CTRL}+Z)`, () => app.annuler(), 'historique')
    this.boutonRetablir = bouton('retablir', `Rétablir sur cette page (${CTRL}+Y)`, () => app.retablir(), 'historique')
    this.filetHistorique = Object.assign(document.createElement('hr'), { className: 'filet-vertical seulement-large' })
    const avant = bouton('avant', 'Page précédente (Page ↑)', () => app.pageSuivante(-1))
    // Le compteur : « 3 / 7 », puis le nom de la page s'il y en a un, coupé
    // au-delà d'une vingtaine de caractères (entier dans son titre), et caché
    // sur un téléphone. Sans nom, son texte reste exactement « 3 / 7 ». C'est
    // un bouton : il ouvre la trieuse des pages (comme Maj + P) ; ouverte au
    // clavier (Entrée, Espace), elle lui rend le focus en se fermant. Sa
    // largeur ne dépend jamais de la page qu'on regarde (voir reglerCompteur) :
    // ‹, › et la poubelle restent sous la main d'une page à l'autre.
    this.rang = document.createElement('button'); this.rang.type = 'button'; this.rang.className = 'rang'
    this.rang.addEventListener('click', e => this.ouvrirTrieuse(e.detail === 0))
    // La séance (lot 6) : une étiquette accrochée sous le compteur, hors de
    // son bouton (son texte reste « 3 / 7 ») et hors du flux de la barre (ses
    // boutons et le bouton du classeur ne bougent pas) ; un clic dessus ouvre
    // aussi la trieuse
    this.rangSeance = Object.assign(document.createElement('div'), { className: 'rang-seance' })
    this.rangSeanceTexte = Object.assign(document.createElement('span'), { className: 'texte' })
    this.rangSeanceTexte.addEventListener('click', () => this.ouvrirTrieuse(false))
    this.rangSeance.appendChild(this.rangSeanceTexte)
    this.rangNumero = Object.assign(document.createElement('span'), { className: 'rang-numero' })
    this.rangNom = Object.assign(document.createElement('span'), { className: 'rang-nom' })
    this.rang.append(this.rangNumero, this.rangNom)
    // « › » : sur la dernière page, il en ajoute une (blanche, comme toute
    // page neuve, en vue neutre), avec sa propre icône (voir maj). Le second
    // clic d'un double-clic ne fait rien, ni un clic moins de 600 ms après un
    // changement de page : le double-clic sur « › » qui vient d'arriver sur
    // la dernière page n'en crée pas une de plus. Les boutons de la barre ne
    // bougent jamais d'une page à l'autre : « Nouvelle page » reste là.
    const apres = this.boutonApres = bouton('apres', TITRE_SUIVANTE, e => {
      if (apres.dataset.mode !== 'ajout') { app.pageSuivante(1); return }
      if ((e as MouseEvent).detail > 1 || performance.now() - this.changementDePage < 600) return
      app.nouvellePage()
    })
    const nouvelle = this.boutonNouvelle = bouton('plus', 'Nouvelle page', () => app.nouvellePage(), 'nouvelle-page')
    // « Séance précédente » (lot 6) : les vignettes de la séance d'avant, à
    // reprendre ou à regarder ; seulement quand il y en a une
    const precedente = this.boutonPrecedente = bouton('seance-precedente', 'Séance précédente : ses pages, à reprendre ou à regarder', () => {
      if (this.bandeauxSeances.tiroirOuvert) this.bandeauxSeances.fermerTiroir(); else this.bandeauxSeances.ouvrirSeancePrecedente()
    }, 'seance-precedente')
    precedente.hidden = true
    // Avec l'étiquette de la séance, sous la barre (rien ne bouge dans la barre)
    precedente.insertAdjacentHTML('beforeend', '<span class="libelle-precedente">Séance précédente</span>')
    this.rangSeance.appendChild(precedente)
    // Supprimer la page : plus de poubelle dans la barre (lot 3 de l'audit),
    // une entrée en rouge, tout en bas du menu « Cette page » (voir
    // construireMenuPage). Pas de question : la page part tout de suite, et
    // s'annule (le message « Page N supprimée · Annuler », ou Ctrl+Z) ; le
    // menu se ferme au clic, un double-clic n'en jette pas deux.
    // Le fond de la page : un bouton qui le montre en petit, et ouvre sous
    // lui le menu des huit fonds en vignettes (voir menu-fonds.ts). Ouvert au
    // clavier, le focus va sur le fond de la page. Un choix le donne à la
    // page (le repère se pose au milieu de ce qu'on regarde, voir
    // App.changerFond) ; maj remet la vignette du bouton à jour.
    const boutonFond = this.boutonFond = document.createElement('button')
    boutonFond.type = 'button'; boutonFond.className = 'bouton choix-fond seulement-large'
    boutonFond.dataset.famille = 'Cette page'
    boutonFond.setAttribute('aria-haspopup', 'menu'); boutonFond.setAttribute('aria-expanded', 'false')
    this.vignetteFond = vignetteDuFond('blanc', VIGNETTE_BOUTON.l, VIGNETTE_BOUTON.h, densite())
    boutonFond.appendChild(this.vignetteFond)
    // Une petite flèche : le bouton ouvre un menu (lot 3 de l'audit)
    boutonFond.insertAdjacentHTML('beforeend', `<span class="fleche-menu" aria-hidden="true">${icone('fleche-bas')}</span>`)
    const menuFonds = document.createElement('div')
    menuFonds.className = 'menu-flottant menu-fonds'; menuFonds.setAttribute('role', 'menu'); menuFonds.setAttribute('aria-label', 'Fond de la page')
    menuFonds.hidden = true
    this.menuFonds = { el: menuFonds, bouton: boutonFond }
    // Le menu « Cette page » (lot 3 de l'audit) : les fonds en vignettes,
    // puis Mode nuit, Aimanter, Le stylo redresse, et tout en bas, seul et en
    // rouge, « Supprimer la page » (voir construireMenuPage)
    boutonFond.addEventListener('click', e => {
      if (menuFonds.hidden) this.construireMenuPage()
      menuFonds.classList.remove('deux-colonnes')
      basculerMenu(this.menuFonds)
      if (menuFonds.hidden) return
      placerMenu(menuFonds, boutonFond.getBoundingClientRect(), 'dessous')
      if (e.detail === 0) entreeCochee(menuFonds)?.focus()
    })
    // Le mode nuit (touche N), Aimanter et Le stylo redresse : des cases du
    // menu « Cette page » (lot 3 de l'audit ; voir casesDeLaPage)
    this.boutonInstruments = bouton('instruments', 'Instruments : règle, équerre, rapporteur, compas', () => {
      this.choixInstruments.hidden = !this.choixInstruments.hidden; this.maj()
    }, 'outil seulement-large')
    const construire = bouton('construction', 'Programme de construction, étape par étape', () => this.basculerConstructeur(), 'seulement-large')
    const catalogue = bouton('catalogue', 'Catalogue : des éléments de cours tout prêts', () => this.basculerCatalogue(), 'seulement-large')
    // Tracer une fonction (lot 27) : un repère sur la page, f(x) au clavier
    const courbe = this.boutonCourbes = bouton('courbe', 'Courbe : tracer une fonction sur un repère (Y)', () => this.basculerCourbes(), 'seulement-large')
    // Importer une image ou un PDF : bouton, ou coller (Ctrl+V), ou glisser le fichier sur le tableau
    const choixFichier = this.choixFichier = Object.assign(document.createElement('input'), { type: 'file', accept: 'image/*,application/pdf,.pdf', hidden: true })
    choixFichier.addEventListener('change', () => { const f = choixFichier.files?.[0]; if (f) app.importerImage(f, { pointeur: this.pointeurImport }); choixFichier.value = '' })
    const importer = bouton('image', 'Importer une image ou un PDF (ou coller avec Ctrl+V, ou glisser le fichier)', e => this.choisirImage(e), 'seulement-large')
    this.racine.appendChild(choixFichier)
    const automatismes = bouton('automatismes', 'Automatismes : un flash de questions sur une page de la séance', () => this.flash.ouvrir(), 'seulement-large')
    // Les outils de classe : rideau, pointeur laser, minuteur, tirage au
    // sort, aide (voir outils-classe.ts) ; un menu sous leur bouton
    this.outilsDeClasse = new OutilsDeClasse(this.racine, {
      laser: () => app.laser,
      basculerLaser: () => app.basculerLaser(),
      ouvrirAide: () => this.ouvrirAide(),
      classe: () => this.classeDuClasseur(),
      message: t => this.message(t),
      poserCalculatrice: m => void app.poserCalculatrice(m),
    }, () => {
      // Le rideau commence sous la barre du haut (et l'étiquette de la séance)
      let bas = haut.getBoundingClientRect().bottom
      const s = this.rangSeance.getBoundingClientRect()
      if (s.height && s.top < bas + 40) bas = Math.max(bas, s.bottom)
      return Math.ceil(bas + 8)
    })
    const menuOutilsClasse = document.createElement('div')
    menuOutilsClasse.className = 'menu-flottant menu-outils-classe'; menuOutilsClasse.setAttribute('role', 'menu'); menuOutilsClasse.setAttribute('aria-label', 'Outils de classe')
    menuOutilsClasse.hidden = true
    const outilsClasse = this.boutonOutilsClasse = bouton('outils-classe', 'Outils de classe : rideau, pointeur laser, minuteur, tirage au sort, aide', e => {
      if (menuOutilsClasse.hidden) this.construireMenuOutilsClasse(menuOutilsClasse)
      basculerMenu(this.menuOutilsClasse)
      if (menuOutilsClasse.hidden) return
      placerMenu(menuOutilsClasse, outilsClasse.getBoundingClientRect(), 'dessous')
      if ((e as MouseEvent).detail === 0) menuOutilsClasse.querySelector<HTMLElement>('.menu-item')?.focus()
    }, 'seulement-large outils-classe')
    outilsClasse.setAttribute('aria-haspopup', 'menu'); outilsClasse.setAttribute('aria-expanded', 'false')
    this.menuOutilsClasse = { el: menuOutilsClasse, bouton: outilsClasse }
    // La recherche : sa fenêtre, Ctrl F (⌘ F) ; le champ est posé plus bas
    // (voir placerChampRecherche). Dans la bibliothèque, Ctrl F va à son
    // propre champ.
    this.recherche = new FenetreRecherche(this.racine, {
      actions: () => this.actionsDeRecherche(),
      classeurs: () => this.rechercheClasseurs(),
      contenu: c => c.courant ? Promise.resolve(lireContenu(app.tableau.doc, app.tableau.seancesDuClasseur())) : this.contenuClasseur(c),
      aller: d => this.allerA(d),
    })
    const champ = this.champRecherche = document.createElement('button')
    champ.type = 'button'; champ.className = 'champ-recherche'; champ.hidden = true
    champ.title = `Rechercher un outil, une formule, un classeur, une page (${TOUCHE_RECHERCHE})`
    champ.innerHTML = `${icone('loupe')}<span>Rechercher</span><kbd>${TOUCHE_RECHERCHE}</kbd>`
    champ.addEventListener('click', () => this.ouvrirRecherche())
    window.addEventListener('keydown', e => {
      if (!(e.ctrlKey || e.metaKey) || e.altKey || e.shiftKey || e.key.toLowerCase() !== 'f') return
      if (document.body.classList.contains('en-bibliotheque')) return
      e.preventDefault()
      if (e.repeat || this.recherche.ouverte || document.querySelector('dialog[open]')) return
      this.ouvrirRecherche()
    })
    // Ctrl + B : la bibliothèque, sans passer par le menu du classeur ; pas
    // dans un champ ni dans le texte qu'on tape (Ctrl + B y met en gras)
    window.addEventListener('keydown', e => {
      if (!(e.ctrlKey || e.metaKey) || e.altKey || e.shiftKey || e.key.toLowerCase() !== 'b') return
      if (document.body.classList.contains('en-bibliotheque')) return
      const cible = e.target instanceof Element ? e.target : null
      if (cible?.closest('input, textarea, select, [contenteditable]:not([contenteditable="false"])')) return
      e.preventDefault()
      if (e.repeat) return
      this.ouvrirBibliotheque(this.formeClasseur === 'cache' ? this.boutonFichier : this.boutonClasseur)
    })
    const revoir = bouton('revue', 'Revoir la construction : une page, une séance, pas à pas', () => this.ouvrirRevue(revoir), 'seulement-large')
    const publier = bouton('publier', 'Publier le replay pour les élèves', () => this.publication.ouvrir(), 'seulement-large')
    // Enregistrer le classeur dans un fichier, en ouvrir un, l'exporter en
    // PDF : un menu discret au bout de la barre, sous son bouton, aligné à
    // droite. Son nom dit les trois (qui cherche « PDF » en survolant la
    // barre, ou au lecteur d'écran, le trouve ici)
    this.sauvegarde = new Sauvegarde(app, t => this.message(t), this.racine)
    const fichier = this.boutonFichier = bouton('points', TITRE_FICHIER, e => {
      if (menuFichier.hidden) this.construireMenuFichier()
      basculerMenu(this.menuFichier)
      if (menuFichier.hidden) return
      // Toujours sous son bouton, jamais dessus : plus long que la place
      // (depuis le lot 5, « Cet appareil » au bout ; à 1366 × 768, avec
      // l'entrée de la clé), il défile au lieu de remonter sur la barre
      // Au téléphone (« Plus », lot 5, K10), dans la hauteur qu'on voit
      // vraiment (le clavier virtuel, la barre d'adresse la réduisent)
      const r = fichier.getBoundingClientRect()
      const visible = this.telephone ? Math.min(window.innerHeight, window.visualViewport?.height ?? Infinity) : window.innerHeight
      menuFichier.style.maxHeight = Math.max(160, Math.floor(visible - r.bottom - 6 - 8)) + 'px'
      menuFichier.scrollTop = 0
      placerMenu(menuFichier, r, 'dessous')
      if ((e as MouseEvent).detail === 0) menuFichier.querySelector<HTMLElement>('.menu-item')?.focus()
    }, 'points')
    fichier.setAttribute('aria-haspopup', 'menu'); fichier.setAttribute('aria-expanded', 'false')
    const menuFichier = document.createElement('div')
    menuFichier.className = 'menu-flottant menu-large'; menuFichier.setAttribute('role', 'menu'); menuFichier.setAttribute('aria-label', MENU_FICHIER)
    menuFichier.hidden = true
    this.menuFichier = { el: menuFichier, bouton: fichier }
    // Le menu des fonds, ouvert par « Plus → Fond… » au téléphone (voir menuFondsPlus)
    this.menuFondsPlus = { el: menuFonds, bouton: fichier }
    // Le point de l'état, quand le bouton du classeur n'a pas la place
    this.pointFichier = Object.assign(document.createElement('span'), { className: 'point-etat', hidden: true })
    this.pointFichier.setAttribute('aria-hidden', 'true')
    fichier.appendChild(this.pointFichier)
    // La barre du haut, en familles (lot 3 de l'audit) : Annuler, Pages,
    // Cette page, Insérer, En classe, Élèves, puis ⋯. Un filet entre deux
    // familles ; leur nom au-dessus, en petit, sur le premier bouton de
    // chacune (data-famille, écrit par la feuille de style, dès 900 px de
    // large). Mode nuit, Aimanter, Le stylo redresse et « Supprimer la
    // page » sont dans le menu « Cette page ».
    const filet = () => Object.assign(document.createElement('hr'), { className: 'filet-vertical seulement-large' })
    this.boutonAnnuler.dataset.famille = 'Annuler'
    avant.dataset.famille = 'Pages'
    importer.dataset.famille = 'Insérer'
    outilsClasse.dataset.famille = 'En classe'
    publier.dataset.famille = 'Élèves'
    haut.classList.add('en-familles')
    haut.append(this.boutonAnnuler, this.boutonRetablir, this.filetHistorique, avant, this.rang, apres, nouvelle, filet(), boutonFond, filet(), importer, this.boutonInstruments, courbe, construire, catalogue, automatismes, filet(), outilsClasse, revoir, filet(), publier, fichier)
    // Les noms sous les outils (lot 5) : ni ‹, ni ›, ni le compteur, ni le
    // bouton du classeur
    nommer(this.boutonAnnuler, 'Annuler'); nommer(this.boutonRetablir, 'Rétablir')
    nommer(nouvelle, 'Nouvelle')
    // (pas de nom sous « Séance précédente » : il n'est là qu'avec une séance d'avant)
    this.racine.appendChild(this.rangSeance)
    nommer(boutonFond, 'Page')
    nommer(importer, 'Image'); nommer(this.boutonInstruments, 'Instruments'); nommer(courbe, 'Courbe'); nommer(construire, 'Construire'); nommer(catalogue, 'Catalogue')
    nommer(automatismes, 'Automatismes'); nommer(outilsClasse, 'Classe'); nommer(revoir, 'Revoir'); nommer(publier, 'Publier'); nommer(fichier, 'Fichier')

    // ----- Le bouton du classeur, à gauche de la barre du haut -----
    // L'icône, le nom en gras (entier dans le titre), l'état en court ; un
    // point ambre quand il faut y regarder. Sa place se règle avec le
    // compteur (voir placerBoutonClasseur).
    const barreClasseur = this.barreClasseur = document.createElement('div')
    barreClasseur.className = 'barre barre-classeur'
    // Le champ de la recherche suit la largeur du bouton (le nom, l'état)
    if (typeof ResizeObserver === 'function') new ResizeObserver(() => this.placerChampRecherche()).observe(barreClasseur)
    const bc = this.boutonClasseur = document.createElement('button')
    bc.type = 'button'; bc.className = 'bouton-classeur'
    bc.setAttribute('aria-describedby', ID_ETAT)
    const iconeClasseur = Object.assign(document.createElement('span'), { className: 'icone-classeur', innerHTML: icone('classeurs') })
    this.pointClasseur = Object.assign(document.createElement('span'), { className: 'point-etat', hidden: true })
    this.pointClasseur.setAttribute('aria-hidden', 'true')
    iconeClasseur.appendChild(this.pointClasseur)
    const textes = Object.assign(document.createElement('span'), { className: 'textes' })
    this.nomClasseur = Object.assign(document.createElement('span'), { className: 'nom-classeur' })
    this.etatClasseur = Object.assign(document.createElement('span'), { className: 'etat-classeur' })
    textes.append(this.nomClasseur, this.etatClasseur)
    bc.append(iconeClasseur, textes)
    // Un clic ouvre le menu du classeur (30 octobre 2026) : ses séances,
    // puis la bibliothèque des classeurs (voir construireMenuSeances)
    const menuSeances = document.createElement('div')
    menuSeances.className = 'menu-flottant menu-seances'; menuSeances.setAttribute('role', 'menu'); menuSeances.setAttribute('aria-label', 'Séances du chapitre')
    menuSeances.hidden = true
    this.menuSeances = { el: menuSeances, bouton: bc }
    bc.setAttribute('aria-haspopup', 'menu'); bc.setAttribute('aria-expanded', 'false')
    bc.addEventListener('click', e => this.basculerMenuSeances(bc, e.detail === 0))
    // Espace l'ouvre aussi, au relâcher, quand le focus y est venu du
    // clavier : l'application ne la voit pas (elle y armerait « Espace +
    // glisser ») ; après un clic à la souris, ou au retour d'une bibliothèque
    // ouverte d'un clic, Espace + glisser reste à elle. D'où vient le focus
    // se retient quand il arrive (focusVenuDuClavier), jamais à la touche :
    // Chrome rend alors :focus-visible le bouton, même cliqué
    bc.addEventListener('keydown', e => { if (e.key === ' ' && !e.ctrlKey && !e.metaKey && !e.altKey && focusVenuDuClavier(bc)) e.stopPropagation() })
    barreClasseur.appendChild(bc)
    this.descriptionEtat = Object.assign(document.createElement('div'), { id: ID_ETAT, hidden: true })
    // Le bandeau, sous le bouton du classeur (ou sous la barre du haut)
    this.bandeau = Object.assign(document.createElement('div'), { className: 'bandeau-sauvegarde', hidden: true })
    this.bandeau.setAttribute('role', 'status')
    // Enregistrer le classeur : le bouton des lignes de l'état et du bandeau
    // (la clé et le Drive inscrivent les leurs) ; comme Ctrl + S, sur la clé
    // quand elle enregistre ce classeur
    this.inscrireActionEtat('enregistrer', 'Enregistrer le classeur', () => void this.sauvegarde.ctrlS())
    this.majNomClasseur()

    // ----- Les instruments, sous leur bouton -----
    this.choixInstruments = document.createElement('div')
    this.choixInstruments.className = 'barre choix-instruments'
    this.choixInstruments.hidden = true
    for (const i of INSTRUMENTS) {
      const b = document.createElement('button')
      b.type = 'button'; b.className = 'option instrument'
      b.innerHTML = icone(i.id) + `<span>${i.nom}</span>`
      b.addEventListener('click', () => { app.basculerInstrument(i.id); this.maj() })
      this.boutonsInstruments.set(i.id, b)
      this.choixInstruments.appendChild(b)
    }

    // ----- Zoom, en bas à droite -----
    // Le pourcentage ouvre un petit menu : 100 %, tout voir, voir la
    // sélection, et ce que fait la molette de la souris
    const zoom = document.createElement('div')
    zoom.className = 'barre barre-zoom'
    this.barreZoom = zoom
    this.zoomTexte = document.createElement('button')
    this.zoomTexte.type = 'button'; this.zoomTexte.className = 'zoom-texte'; this.zoomTexte.title = 'Zoom et molette de la souris'
    this.zoomTexte.setAttribute('aria-haspopup', 'menu'); this.zoomTexte.setAttribute('aria-expanded', 'false')
    const menu = document.createElement('div')
    menu.className = 'menu-flottant'; menu.setAttribute('role', 'menu'); menu.setAttribute('aria-label', 'Zoom et molette de la souris')
    menu.hidden = true
    this.menuZoom = { el: menu, bouton: this.zoomTexte }
    this.zoomTexte.addEventListener('click', e => {
      if (menu.hidden) this.construireMenuZoom()
      basculerMenu(this.menuZoom)
      if (menu.hidden) return
      placerMenu(menu, zoom.getBoundingClientRect(), 'dessus')
      // Ouvert au clavier : la première entrée prend la main
      if (e.detail === 0) menu.querySelector<HTMLElement>('.menu-item')?.focus()
    })
    // Les noms sous les outils valent aussi ici (vérification « conformité »
    // du lot 5 : au TNI, sans survol, ⛶ n'avait pas de nom visible) ; le
    // pourcentage se lit déjà, comme le compteur des pages
    const moins = bouton('moins', `Dézoomer (${CTRL} + −)`, () => app.zoomer(1 / 1.25))
    const plus = bouton('plus', `Zoomer (${CTRL} + +)`, () => app.zoomer(1.25))
    const toutVoir = bouton('cadre', 'Tout voir (Maj + 1)', () => app.toutVoir())
    nommer(moins, 'Dézoomer'); nommer(plus, 'Zoomer'); nommer(toutVoir, 'Tout voir')
    zoom.append(moins, this.zoomTexte, plus, toutVoir)

    // ----- Revenir au contenu, quand on s'en est éloigné -----
    this.retour = document.createElement('button')
    this.retour.type = 'button'; this.retour.className = 'retour-contenu'; this.retour.hidden = true
    this.retour.title = 'Tout voir (Maj + 1)'
    this.retour.innerHTML = icone('cadre') + '<span>Revenir au contenu</span>'
    this.retour.addEventListener('click', () => app.toutVoir())

    this.toast = document.createElement('div')
    this.toast.className = 'toast'; this.toast.setAttribute('role', 'status')

    // ----- Le numéro de la page, en grand, quand on change de page -----
    // Sous le message, au-dessus du tableau ; aucun appui ne s'y arrête (le
    // stylet écrit à travers), et le premier appui sur le tableau l'efface
    this.annonce = document.createElement('div')
    this.annonce.className = 'annonce-page'; this.annonce.setAttribute('aria-hidden', 'true'); this.annonce.hidden = true
    this.annonceNumero = Object.assign(document.createElement('span'), { className: 'annonce-numero' })
    this.annonceNom = Object.assign(document.createElement('span'), { className: 'annonce-nom' })
    this.annonce.append(this.annonceNumero, this.annonceNom)
    ;(document.getElementById('zone') ?? this.racine).addEventListener('pointerdown', () => this.effacerAnnonce(true), true)
    // La place du nom dans le compteur se règle de nouveau quand la fenêtre
    // change (une tablette qu'on tourne, le zoom du navigateur), et quand la
    // police d'écriture arrive : elle ne retient plus le démarrage (voir
    // index.html), la barre peut donc changer de largeur après coup ; le
    // tableau se repeint alors avec elle (les noms des points, les graduations)
    let regler = 0
    const reglerBientot = () => {
      this.compteurARegler = true
      cancelAnimationFrame(regler)
      regler = requestAnimationFrame(() => this.maj())
    }
    window.addEventListener('resize', reglerBientot)
    document.fonts?.addEventListener?.('loadingdone', () => { reglerBientot(); app.rafraichir() })

    // ----- Choix de la forme, à côté de l'outil -----
    this.choixFormes = document.createElement('div')
    this.choixFormes.className = 'barre choix-formes'
    for (const t of TYPES_FORMES) {
      const b = bouton(t.id, `${t.nom} (${t.touche})`, () => { app.typeForme = t.id; app.choisirOutil('forme') }, 'outil')
      this.boutonsFormes.set(t.id, b); this.choixFormes.appendChild(b)
    }

    // ----- Segment, droite ou demi-droite, à côté de l'outil Segment -----
    this.choixTraits = document.createElement('div')
    this.choixTraits.className = 'barre choix-formes'
    for (const [id, nom] of [['segment', 'Segment [AB]'], ['droite', 'Droite (AB)'], ['demi', 'Demi-droite [AB)']] as const) {
      const b = bouton('trait-' + id, nom, () => { app.typeTrait = id; app.choisirOutil('segment') }, 'outil')
      this.boutonsTraits.set(id, b); this.choixTraits.appendChild(b)
    }

    // ----- Le menu complet de ce qui est pris (un objet, ou plusieurs) -----
    this.panneau = document.createElement('div')
    this.panneau.className = 'panneau-forme'
    this.panneau.setAttribute('role', 'toolbar')
    this.panneau.setAttribute('aria-label', 'Options')

    // ----- Le menu de la page, posé là où l'on a appuyé (voir ouvrirMenuPage) -----
    const menuPage = document.createElement('div')
    menuPage.className = 'menu-flottant menu-large'; menuPage.setAttribute('role', 'menu'); menuPage.setAttribute('aria-label', 'Page')
    menuPage.hidden = true
    this.menuPage = { el: menuPage }

    // ----- Le menu du bouton ⋯ du menu complet (voir boutonPlus) -----
    const menuPlus = document.createElement('div')
    menuPlus.className = 'menu-flottant menu-plus'; menuPlus.setAttribute('role', 'menu'); menuPlus.setAttribute('aria-label', 'Plus')
    menuPlus.hidden = true
    this.menuPlus = { el: menuPlus }

    // (les deux menus du téléphone, au bout : l'ordre des autres ne change pas)
    this.racine.append(outils, barreClasseur, haut, this.bandeau, this.descriptionEtat, zoom, this.retour, menu, menuDoigt, this.menuGomme.el, menuFichier, this.menuSeances.el, menuFonds, this.menuOutilsClasse.el, menuPage, menuPlus, this.annonce, this.toast, this.choixFormes, this.choixTraits, this.panneau, this.choixInstruments,
      this.menuCouleur.el, this.menuAutres.el, this.menuEpaisseur.el)
    // Annuler et Rétablir dans la barre qui leur revient (les deux barres existent)
    this.placerHistorique()
    // (le champ de la recherche au bout : l'ordre des autres ne change pas)
    this.racine.appendChild(this.champRecherche)
    // ----- La barre d'actions, au-dessus de ce qui est pris -----
    // Elle ne recouvre ni la barre d'outils (sauf sur un écran étroit, où
    // elle n'y tient pas ; au téléphone, jamais : voir bordsFlottants), ni la
    // barre du haut
    this.barreActions = new BarreActions(app, this.racine, () => this.bordsFlottants())
    this.revue = new RevueEnClasse(this.app, this.racine)
    // Les formules écrites comme à l'écran (voir App, rendu.rendreFormule)
    this.apercus = new Apercus({
      pixels: src => app.pixels(src),
      rendreFormule: (latex, el) => katex.render(latex, el, { throwOnError: false, displayMode: false }),
    })
    this.vignettes = new Vignettes(app.tableau, this.apercus)
    this.vignetteEnonce = new VignetteEnonce(app, this.apercus, () => this.zoneLibre())
    this.racine.append(this.vignetteEnonce.el)
    // Les séances (lot 6) : la lecture d'une séance passée, « Reprendre », la séance précédente
    this.bandeauxSeances = new BandeauxSeances(app, this.racine, this.vignettes)
    this.trieuse = new Trieuse(app, this.racine, this, this.vignettes)
    this.publication = new Publication(app, this.racine)
    // Les pages de la séance en images, pour la rédaction par Gemini (le papier blanc)
    this.publication.imageDePage = page => imagePng(this.apercus, this.pageAPeindre(page), { fond: false })
    this.constructeur = new Constructeur(app, this.racine, t => this.message(t, undefined, true))
    this.catalogue = new Catalogue(app, this.racine, t => this.message(t, undefined, true), c => this.flash.ouvrir(c))
    this.courbes = new Courbes(app, this.racine, {
      mesurer: (l, t) => this.catalogue.mesurer(l, t),
      placer: (f, p) => this.catalogue.placer(f, p),
      peutPoser: () => this.catalogue.peutPoser(),
      message: t => this.message(t, undefined, true),
    })
    this.flash = new Flash(app, this.racine, t => this.message(t, undefined, true))

    // ----- Menu d'un morceau de figure (point, extrémité, nom, rayon) -----
    this.menuPartie = document.createElement('div')
    this.menuPartie.className = 'menu-partie'
    this.menuPartie.setAttribute('role', 'dialog')
    this.menuPartie.hidden = true
    this.racine.appendChild(this.menuPartie)
    document.addEventListener('pointerdown', e => {
      if (!this.menuPartie.hidden && !this.menuPartie.contains(e.target as Node) && !(e.target as HTMLElement).closest('#zone')) this.fermerMenuPartie()
    }, true)
    window.addEventListener('keydown', e => { if (e.key === 'Escape') this.fermerMenuPartie() })
  },

  /** La largeur du compteur ne dépend que du tableau, jamais de la page
   *  qu'on regarde : sinon « 3 / 7 · Exercice 12 p. 84 » après « 2 / 7 »,
   *  ou « 10 / 12 » après « 9 / 12 », le font grandir, et ‹, ›, « Nouvelle
   *  page », la poubelle glissent d'une page à l'autre (le toucher suivant
   *  sur « › » tomberait sur le compteur). Le numéro prend la place du plus
   *  large de ce tableau (le total écrit deux fois : la feuille de style lit
   *  --chiffres). Dès qu'une page du tableau a un nom, une place lui est
   *  gardée sur toutes les pages, vide sur une page sans nom : une vingtaine
   *  de caractères (22 ch), moins si la barre n'a pas la place sur ses
   *  rangées (on essaie 22, 18, 14 puis 10 ch, sans qu'elle prenne une rangée
   *  de plus : à 1024 px, elle n'en a qu'une). S'il n'y a pas même 10 ch (une
   *  tablette, un vidéoprojecteur en 1024 × 768 : environ 90 px), le nom
   *  s'écrit plus petit (.serre) dans toute la place qui reste, de quoi en
   *  lire une dizaine de caractères (« 2 / 3 · Exercice 1… ») ; sous 56 px, il
   *  ne s'y montre pas (il reste dans l'infobulle, l'annonce et la trieuse),
   *  comme sur un téléphone. Réglé seulement quand le nombre de
   *  chiffres du total change, quand la première page reçoit un nom ou la
   *  dernière le perd, quand la fenêtre change et quand la police
   *  d'écriture arrive : une page qu'on nomme
   *  peut faire bouger la barre une fois, le passage d'une page à l'autre
   *  jamais. Une barre pas encore affichée attend son prochain maj.
   *  Le bouton du classeur (lot 4) se place aux mêmes moments, et seulement
   *  à eux : il sort d'abord de la barre du haut, le nom de la page s'y
   *  règle sans lui, exactement comme au lot 3, puis il prend sa place
   *  (voir placerBoutonClasseur). */
  reglerCompteur(this: UI, chiffres: number, avecNoms: boolean): void {
    const barre = this.barreHaut
    if (!barre.isConnected || !barre.getClientRects().length) return
    this.compteurARegler = false
    this.sortirBoutonClasseur()
    this.reglerNomDeLaPage(chiffres, avecNoms)
    this.placerBoutonClasseur()
    this.reglerSeance()
  },

  /** La séance sous le compteur (lot 6) : une étiquette accrochée sous la
   *  barre du haut, hors de son flux (rien n'y bouge), au bord gauche du
   *  compteur. Sur un téléphone, elle n'y est pas (elle reste dans le titre
   *  du compteur, la trieuse et le menu « Plus »). */
  reglerSeance(this: UI): void {
    const seance = this.rangSeance, haut = this.barreHaut
    // Sous la barre du haut, son bord gauche sur celui du compteur (hors de
    // la barre : ni ses enfants ni sa mise en page ne changent)
    const r = this.rang.getBoundingClientRect(), h = haut.getBoundingClientRect(), dans = this.racine.getBoundingClientRect()
    seance.style.left = Math.max(4, Math.round(r.left - dans.left)) + 'px'
    seance.style.top = Math.round(h.bottom - dans.top + 2) + 'px'
  },

  /** Le compteur et le nom de la page dans la barre du haut (voir reglerCompteur) */
  reglerNomDeLaPage(this: UI, chiffres: number, avecNoms: boolean): void {
    const barre = this.barreHaut, nom = this.rangNom
    this.rang.style.setProperty('--chiffres', String(chiffres))
    nom.classList.remove('sans-place', 'serre')
    nom.style.width = ''
    // Sur un téléphone (ou sans nom), la place du nom ne compte pas
    if (!avecNoms || getComputedStyle(nom).display === 'none') return
    nom.style.width = '0px'
    const hauteur = barre.getBoundingClientRect().height
    const tient = () => barre.getBoundingClientRect().height <= hauteur + 0.5
    for (const ch of [22, 18, 14, 10]) {
      nom.style.width = ch + 'ch'
      if (tient()) return
    }
    // Plus petit, dans la place qui reste (moins que 10 ch : de 2 px en 2 px)
    const dix = nom.getBoundingClientRect().width
    nom.classList.add('serre')
    for (let px = Math.floor(dix) - 2; px >= 56; px -= 2) {
      nom.style.width = px + 'px'
      if (tient()) return
    }
    nom.classList.remove('serre')
    nom.style.width = ''
    nom.classList.add('sans-place')
  },
}
