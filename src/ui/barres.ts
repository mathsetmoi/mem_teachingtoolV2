// =============================================================
// L'INTERFACE : LA BARRE DU TÉLÉPHONE, ANNULER, RÉTABLIR, L'ÉPAISSEUR, LA GOMME
// Des méthodes de la classe UI (src/ui.ts), rangées ici par sujet :
// elles s'ajoutent à la classe à la fin de ui.ts (ajouterMethodes).
// =============================================================
import type { UI } from '../ui'
import { COULEURS, TAILLES } from '../app'
import { icone } from '../icones'
import { VIGNETTE_BOUTON, densite, nomDuFond, peindreVignette } from '../menu-fonds'
import { ENTREES, basculerMenu, fermerMenu, filetMenu, naviguerDansLaGrille, ouvrirMenu, placerMenu, titreMenu } from '../menus'
import type { Menu } from '../menus'
import { nocturne } from '../nuit'
import { APPUI_LONG } from '../pointeurs'
import { choisirGestes, choisirGomme, choisirTailleGomme, reglages } from '../reglages'
import type { ModeGomme, TailleGomme } from '../reglages'
import { AUTRES_OUTILS, DOIGTS, NOMS_OUTILS, OUTILS } from '../ui'

export const methodesBarres = {
  // ----- La barre des outils du téléphone (lot 5, K10) -----
  /** « Couleur » et « Autres outils », au bout de la barre (la feuille de
   *  style les cache hors de la mise en page du téléphone ; au téléphone, la
   *  barre montre Stylo, Gomme, Sélection, Couleur, Annuler, Rétablir, Autres
   *  outils, dans l'ordre du document : Annuler et Rétablir viennent entre
   *  les deux, voir placerHistorique), et leurs deux petits menus (menus.ts) :
   *  un seul ouvert à la fois, Échap ou un appui ailleurs les ferme, un choix
   *  aussi. */
  construireBoutonsDuTelephone(this: UI, barre: HTMLElement): void {
    const couleur = this.boutonCouleur = document.createElement('button')
    couleur.type = 'button'; couleur.className = 'bouton bouton-couleur seulement-telephone'
    couleur.title = 'Couleur et épaisseur'; couleur.setAttribute('aria-label', 'Couleur et épaisseur')
    couleur.setAttribute('aria-haspopup', 'menu'); couleur.setAttribute('aria-expanded', 'false')
    this.rondCouleur = Object.assign(document.createElement('span'), { className: 'rond-couleur' })
    this.rondCouleur.setAttribute('aria-hidden', 'true')
    couleur.appendChild(this.rondCouleur)
    const menuCouleur = document.createElement('div')
    menuCouleur.className = 'menu-flottant menu-couleur'; menuCouleur.setAttribute('role', 'menu'); menuCouleur.setAttribute('aria-label', 'Couleur et épaisseur')
    menuCouleur.hidden = true
    this.menuCouleur = { el: menuCouleur, bouton: couleur }
    couleur.addEventListener('click', e => this.basculerMenuDuTelephone(this.menuCouleur, () => this.construireMenuCouleur(), e.detail === 0))

    const autres = this.boutonAutres = document.createElement('button')
    autres.type = 'button'; autres.className = 'bouton autres-outils seulement-telephone'
    autres.title = 'Autres outils'; autres.setAttribute('aria-label', 'Autres outils')
    autres.setAttribute('aria-haspopup', 'menu'); autres.setAttribute('aria-expanded', 'false')
    autres.dataset.icone = 'points'; autres.innerHTML = icone('points')
    const menuAutres = document.createElement('div')
    menuAutres.className = 'menu-flottant menu-autres'; menuAutres.setAttribute('role', 'menu'); menuAutres.setAttribute('aria-label', 'Autres outils')
    menuAutres.hidden = true
    this.menuAutres = { el: menuAutres, bouton: autres }
    autres.addEventListener('click', e => this.basculerMenuDuTelephone(this.menuAutres, () => this.construireMenuAutres(), e.detail === 0))
    barre.append(couleur, autres)
    // (leurs menus vont à la racine avec les autres, après eux : voir construire)
  },

  /** Ouvre (ou referme) un des deux menus de la barre du téléphone (le menu
   *  « Couleur » aussi dans la barre repliée d'un écran qu'on touche, voir
   *  majCouleursRepliees), refait à chaque ouverture ; au clavier, le focus
   *  va sur le choix coché */
  basculerMenuDuTelephone(this: UI, m: Menu, construire: () => void, auClavier: boolean): void {
    if (m.el.hidden) construire()
    basculerMenu(m)
    if (m.el.hidden) return
    this.placerPresDeLaBarre(m.el, m.bouton!)
    if (auClavier) (m.el.querySelector<HTMLElement>('.menu-item[aria-checked="true"]') ?? m.el.querySelector<HTMLElement>(ENTREES))?.focus()
  },

  /** Un menu de la barre des outils, près de son bouton : au-dessus en
   *  portrait (la barre est en bas), à droite de la barre en paysage (à la
   *  hauteur du bouton), comme ceux de la Gomme et du doigt au poste de la
   *  classe ; toujours dans l'écran (placerMenu) */
  placerPresDeLaBarre(this: UI, el: HTMLElement, b: HTMLElement): void {
    const r = b.getBoundingClientRect(), o = this.barreOutils.getBoundingClientRect(), h = this.barreHaut.getBoundingClientRect()
    // Il ne couvre ni la barre des outils ni celle du haut : il tient dans la
    // place qui reste entre elles (sur un téléphone couché, 320 px de haut,
    // le menu de la Gomme y défile), et s'y pose
    if (this.barreEnBas()) {
      el.style.maxWidth = ''
      el.style.maxHeight = Math.max(120, Math.floor(o.top - 6 - (h.bottom + 8))) + 'px'
      placerMenu(el, new DOMRect(r.left, o.top, r.width, o.height), 'dessus')
      return
    }
    el.style.maxWidth = Math.floor(window.innerWidth - o.right - 6 - 8) + 'px'
    el.style.maxHeight = ''
    placerMenu(el, new DOMRect(o.left, r.top, o.width, r.height), 'droite')
    const m = el.getBoundingClientRect()
    if (m.right <= h.left || m.left >= h.right || m.top >= h.bottom || m.bottom <= h.top) return
    // Sous la barre du haut : jusqu'en bas de l'écran, et il défile s'il le faut
    el.style.maxHeight = Math.max(120, Math.floor(window.innerHeight - (h.bottom + 8) - 8)) + 'px'
    el.style.top = Math.max(8, Math.min(h.bottom + 8, window.innerHeight - el.offsetHeight - 8)) + 'px'
  },

  /** Une couleur choisie (une pastille de la barre, ou du menu « Couleur ») :
   *  le Stylo la prend, sauf si l'on tient le Surligneur, le Segment ou la
   *  Formule, qui la gardent */
  choisirCouleur(this: UI, valeur: string): void {
    const app = this.app
    app.couleur = valeur
    if (app.outil !== 'surligneur' && app.outil !== 'segment' && app.outil !== 'formule') app.choisirOutil('stylo')
    this.maj()
  },

  /** Le menu « Couleur » : les quatre pastilles, puis les trois tailles,
   *  44 × 44 chacune, en grille (les flèches s'y déplacent comme dans celle
   *  des fonds) */
  construireMenuCouleur(this: UI): void {
    const app = this.app, m = this.menuCouleur.el
    m.replaceChildren()
    const grille = Object.assign(document.createElement('div'), { className: 'grille-couleur' })
    const choix = (classe: string, titre: string, coche: boolean, faire: () => void) => {
      const b = document.createElement('button')
      b.type = 'button'; b.className = 'menu-item case-couleur ' + classe
      b.setAttribute('role', 'menuitemradio'); b.setAttribute('aria-checked', String(coche))
      b.title = titre; b.setAttribute('aria-label', titre)
      b.addEventListener('click', () => { fermerMenu(); faire() })
      grille.appendChild(b)
      return b
    }
    for (const c of COULEURS) choix('pastille', c.nom, app.couleur === c.valeur, () => this.choisirCouleur(c.valeur)).style.setProperty('--teinte', c.valeur)
    TAILLES.forEach((t, i) => {
      const b = choix('taille', 'Trait ' + t.nom.toLowerCase(), app.tailleEnMain() === t.valeur, () => { app.choisirTaille(t.valeur); this.maj() })
      b.innerHTML = `<span style="--d:${4 + i * 4}px"></span>`
    })
    grille.addEventListener('keydown', e => naviguerDansLaGrille(grille, e))
    m.appendChild(grille)
  },

  // ----- Annuler, Rétablir et l'épaisseur du trait (gains rapides, lot 16) -----
  /** Annuler et Rétablir dans la barre qui leur revient : en tête de la
   *  barre du haut, devant leur filet (toujours dans l'écran) ; dans la mise
   *  en page du téléphone, dans la barre du bas, entre « Couleur » et
   *  « Autres outils » (l'ordre de l'écran, lot 5, K10). Les mêmes deux
   *  boutons, déplacés d'une barre à l'autre quand la mise en page change
   *  (au départ, et dans suivre), comme le bouton du classeur. */
  placerHistorique(this: UI): void {
    const telephone = this.telephone
    const dans = telephone ? this.barreOutils : this.barreHaut
    if (this.boutonAnnuler.parentElement === dans) return
    if (telephone) this.boutonAutres.before(this.boutonAnnuler, this.boutonRetablir)
    else this.filetHistorique.before(this.boutonAnnuler, this.boutonRetablir)
  },

  /** Le bouton de l'épaisseur montre celle de l'outil en main (au
   *  Surligneur, la sienne) : son trait (--d : 4, 8 ou 12 px), son titre
   *  (« Épaisseur du trait : Fin ») et data-taille ; refait seulement quand
   *  elle change. Une épaisseur qui n'est pas l'une des trois (un vieux
   *  réglage) montre la plus proche. */
  majBoutonEpaisseur(this: UI): void {
    const v = this.app.tailleEnMain()
    const i = TAILLES.reduce((meilleur, t, k) => Math.abs(t.valeur - v) < Math.abs(TAILLES[meilleur].valeur - v) ? k : meilleur, 0)
    const nom = TAILLES[i].nom
    if (nom === this.epaisseurMontree) return
    this.epaisseurMontree = nom
    this.traitEpaisseur.style.setProperty('--d', `${4 + i * 4}px`)
    const t = `Épaisseur du trait : ${nom}`
    this.boutonEpaisseur.title = t; this.boutonEpaisseur.setAttribute('aria-label', t)
    this.boutonEpaisseur.dataset.taille = nom
  },

  /** Le menu de l'épaisseur : ouvert (ou refermé) par son bouton, refait à
   *  chaque ouverture, posé à droite de la barre ; ouvert au clavier, le
   *  focus va sur l'épaisseur cochée (Échap le ferme et le rend au bouton) */
  basculerMenuEpaisseur(this: UI, auClavier: boolean): void {
    const m = this.menuEpaisseur
    if (m.el.hidden) this.construireMenuEpaisseur()
    basculerMenu(m)
    if (m.el.hidden) return
    this.placerMenuEpaisseur()
    if (auClavier) m.el.querySelector<HTMLElement>('.menu-item[aria-checked="true"]')?.focus()
  },

  /** Les trois épaisseurs, en rangée (44 × 44 chacune, comme dans le menu
   *  « Couleur » ; les flèches s'y déplacent, Entrée choisit) : un choix
   *  règle l'épaisseur de l'outil en main et ferme le menu */
  construireMenuEpaisseur(this: UI): void {
    const app = this.app, m = this.menuEpaisseur.el
    m.replaceChildren()
    const grille = Object.assign(document.createElement('div'), { className: 'grille-epaisseur' })
    TAILLES.forEach((t, i) => {
      const b = document.createElement('button')
      b.type = 'button'; b.className = 'menu-item case-couleur taille'
      b.setAttribute('role', 'menuitemradio'); b.setAttribute('aria-checked', String(app.tailleEnMain() === t.valeur))
      b.title = t.nom; b.setAttribute('aria-label', 'Trait ' + t.nom.toLowerCase())
      b.innerHTML = `<span style="--d:${4 + i * 4}px"></span>`
      b.addEventListener('click', () => { fermerMenu(); app.choisirTaille(t.valeur); this.maj() })
      grille.appendChild(b)
    })
    grille.addEventListener('keydown', e => naviguerDansLaGrille(grille, e))
    m.appendChild(grille)
  },

  /** Le menu de l'épaisseur, à droite de la barre, à la hauteur de son
   *  bouton, jamais sous la barre du haut (comme celui de la Gomme) */
  placerMenuEpaisseur(this: UI): void {
    const b = this.boutonEpaisseur.getBoundingClientRect(), o = this.barreOutils.getBoundingClientRect()
    placerMenu(this.menuEpaisseur.el, new DOMRect(o.left, b.top, o.width, b.height), 'droite')
    this.sousLaBarreDuHaut(this.menuEpaisseur.el)
  },

  /** Le menu « Autres outils » : une grille de 60 × 56, l'icône et son nom
   *  dessous : Surligneur, Point, Segment, Formes, Formule, Vue, puis le
   *  Doigt (sur un appareil tactile : il ouvre son menu, au même endroit) et
   *  « Supprimer la sélection » (grisée sans sélection). Formes et Segment
   *  prennent leur outil, et leurs choix paraissent au-dessus de la barre (à
   *  sa droite en paysage) : un type de forme ou de segment en trois
   *  touchers (Autres outils, Formes, Rectangle). */
  construireMenuAutres(this: UI): void {
    const app = this.app, m = this.menuAutres.el
    m.replaceChildren()
    const grille = Object.assign(document.createElement('div'), { className: 'grille-autres' })
    const entree = (nomIcone: string, mot: string, titre: string, faire: () => void, o: { coche?: boolean; inactif?: boolean; menu?: boolean; danger?: boolean } = {}) => {
      const b = document.createElement('button')
      b.type = 'button'; b.className = 'menu-item outil-grille' + (o.danger ? ' danger' : '')
      b.setAttribute('role', o.coche === undefined ? 'menuitem' : 'menuitemradio')
      if (o.coche !== undefined) b.setAttribute('aria-checked', String(o.coche))
      if (o.inactif) b.setAttribute('aria-disabled', 'true')
      if (o.menu) b.setAttribute('aria-haspopup', 'menu')
      b.title = titre; b.setAttribute('aria-label', titre)
      b.dataset.action = nomIcone
      b.innerHTML = icone(nomIcone)
      b.appendChild(Object.assign(document.createElement('span'), { className: 'nom', textContent: mot }))
      b.addEventListener('click', e => {
        if (o.inactif) return
        fermerMenu()
        faire()
        // Ouvert au clavier, le menu qui suit (le doigt) prend le focus
        if (o.menu && e.detail === 0) this.menuDoigt.el.querySelector<HTMLElement>('.menu-item[aria-checked="true"]')?.focus()
      })
      grille.appendChild(b)
    }
    for (const id of AUTRES_OUTILS) {
      const o = OUTILS.find(x => x.id === id)!
      entree(id, NOMS_OUTILS[id], `${o.nom} (${o.touche})`, () => app.choisirOutil(id), { coche: app.outil === id })
    }
    if (!this.boutonDoigt.hidden) entree('doigt', 'Doigt', this.boutonDoigt.title, () => this.basculerReglageDoigt(false), { menu: true })
    entree('poubelle', 'Supprimer', 'Supprimer la sélection (Suppr)', () => app.supprimerSelection(), { inactif: !(app.selection.size || app.partie), danger: true })
    grille.addEventListener('keydown', e => naviguerDansLaGrille(grille, e))
    m.appendChild(grille)
  },

  /** « Autres outils » montre l'outil qu'on tient s'il en est un (son icône et
   *  le coup de surligneur), sinon ses points ; « Couleur », la couleur en
   *  main */
  majBoutonsDuTelephone(this: UI): void {
    const app = this.app, b = this.boutonAutres
    const autre = AUTRES_OUTILS.includes(app.outil)
    const nom = autre ? app.outil : 'points'
    if (b.dataset.icone !== nom) { b.dataset.icone = nom; b.innerHTML = icone(nom) }
    b.classList.toggle('actif', autre)
    const teinte = app.nuit ? nocturne(app.couleur) : app.couleur
    if (this.rondCouleur.style.getPropertyValue('--teinte') !== teinte) this.rondCouleur.style.setProperty('--teinte', teinte)
  },

  /** L'aimant du quadrillage (le bouton de la barre du haut, ou la case de « Plus ») */
  basculerAimant(this: UI): void {
    this.app.aimant = !this.app.aimant
    this.maj()
  },

  /** Le stylo qui redresse les figures (le bouton, ou la case de « Plus ») */
  basculerReconnaissance(this: UI): void {
    const app = this.app
    app.reconnaissance = !app.reconnaissance
    this.message(app.reconnaissance ? 'Le stylo reconnaît les figures' : 'Le stylo laisse les tracés à main levée')
    this.maj()
  },

  /** Le programme de construction s'ouvre ou se ferme (son bouton, ou « Plus ») */
  basculerConstructeur(this: UI): void {
    if (this.constructeur.ouvert) this.constructeur.fermer(); else { if (this.catalogue.ouvert) this.catalogue.fermer(); if (this.courbes.ouvert) this.courbes.fermer(); this.constructeur.ouvrir() }
  },
  /** Le catalogue prend la place du programme de construction, à droite */
  basculerCatalogue(this: UI): void {
    if (this.catalogue.ouvert) this.catalogue.fermer(); else { if (this.constructeur.ouvert) this.constructeur.fermer(); if (this.courbes.ouvert) this.courbes.fermer(); this.catalogue.ouvrir() }
  },
  /** Le panneau « Courbes » (tracer une fonction, lot 27), à la même place */
  basculerCourbes(this: UI): void {
    if (this.courbes.ouvert) { this.courbes.fermer(); this.boutonCourbes?.classList.remove('actif'); return }
    if (this.constructeur.ouvert) this.constructeur.fermer()
    if (this.catalogue.ouvert) this.catalogue.fermer()
    this.courbes.ouvrir()
    this.boutonCourbes?.classList.add('actif')
  },


  // ----- Le menu de la Gomme (lot 5) -----
  /** Un clic (ou un toucher) sur le bouton de la Gomme : il la prend ; déjà
   *  en main, il ouvre ses options (ou les referme) ; le clic qui suit
   *  l'appui long qui les a ouvertes ne fait rien */
  toucherGomme(this: UI, e: MouseEvent): void {
    if (performance.now() - this.gommeOuverteA < 1500) { this.gommeOuverteA = -Infinity; return }
    if (!this.menuGomme.el.hidden) { fermerMenu(); if (this.app.outil !== 'gomme') this.app.choisirOutil('gomme'); return }
    if (this.app.outil === 'gomme') this.ouvrirMenuGomme(e.detail === 0)
    else this.app.choisirOutil('gomme')
  },

  /** Le clic droit sur le bouton de la Gomme (le bouton du stylet en est un)
   *  et l'appui long du doigt ouvrent ses options, sans la prendre. (Pas
   *  d'aria-haspopup : son clic prend d'abord l'outil, ce n'est pas un bouton
   *  de menu ; son titre dit qu'on le retape pour ses options.) */
  brancherBoutonGomme(this: UI, b: HTMLButtonElement): void {
    const ouvrir = () => { this.gommeOuverteA = performance.now(); this.ouvrirMenuGomme(false) }
    b.addEventListener('contextmenu', e => { e.preventDefault(); clearTimeout(this.appuiLongGomme); ouvrir() })
    const lacher = () => clearTimeout(this.appuiLongGomme)
    b.addEventListener('pointerdown', e => {
      clearTimeout(this.appuiLongGomme)
      this.gommeOuverteA = -Infinity
      if (e.pointerType !== 'touch' || e.button !== 0) return
      this.appuiLongGomme = window.setTimeout(() => {
        try { navigator.vibrate?.(10) } catch { /* pas de vibreur */ }
        ouvrir()
      }, APPUI_LONG)
    })
    b.addEventListener('pointerup', lacher)
    b.addEventListener('pointercancel', lacher)
    b.addEventListener('pointerleave', lacher)
  },

  ouvrirMenuGomme(this: UI, auClavier: boolean): void {
    const m = this.menuGomme.el
    if (m.hidden) { this.construireMenuGomme(); ouvrirMenu(this.menuGomme) }
    this.placerMenuGomme()
    if (auClavier) m.querySelector<HTMLElement>('.menu-item[aria-checked="true"]')?.focus()
  },

  /** Le bouton du fond montre le fond de la page : sa vignette, son titre et
   *  son nom lu (« Fond de la page : Papier pointé »), refaits seulement
   *  quand le fond change */
  majBoutonFond(this: UI): void {
    const fond = this.app.fond, nuit = this.app.nuit
    if (fond === this.fondMontre && nuit === this.fondMontreDeNuit) return
    this.fondMontre = fond; this.fondMontreDeNuit = nuit
    peindreVignette(this.vignetteFond, fond, VIGNETTE_BOUTON.l, VIGNETTE_BOUTON.h, densite(), nuit)
    const t = `Cette page : fond « ${nomDuFond(fond)} », mode nuit, aimanter, supprimer`
    this.boutonFond.title = t; this.boutonFond.setAttribute('aria-label', t)
  },

  /** Le menu de la Gomme, à droite de la barre, à la hauteur de son bouton ;
   *  au téléphone, au-dessus de son bouton en portrait (voir placerPresDeLaBarre) */
  placerMenuGomme(this: UI): void {
    if (this.telephone) { this.placerPresDeLaBarre(this.menuGomme.el, this.outils.get('gomme')!); return }
    // (ce que la mise en page du téléphone lui avait donné ne vaut plus)
    this.menuGomme.el.style.maxWidth = this.menuGomme.el.style.maxHeight = ''
    const b = this.outils.get('gomme')!.getBoundingClientRect(), o = this.barreOutils.getBoundingClientRect()
    placerMenu(this.menuGomme.el, new DOMRect(o.left, b.top, o.width, b.height), 'droite')
    this.sousLaBarreDuHaut(this.menuGomme.el)
  },

  /** Un menu posé à droite de la barre des outils ne passe pas sous la barre
   *  du haut : avec les noms sous les outils (lot 5), elle peut être sur deux
   *  rangées (1024 × 768) et descendre jusqu'à la hauteur des boutons de la
   *  Gomme et du doigt. Il descend alors juste sous elle (s'il y tient). */
  sousLaBarreDuHaut(this: UI, el: HTMLElement): void {
    const m = el.getBoundingClientRect(), h = this.barreHaut.getBoundingClientRect()
    if (!h.height || m.right <= h.left || m.left >= h.right || m.top >= h.bottom || m.bottom <= h.top) return
    el.style.top = Math.max(8, Math.min(h.bottom + 8, window.innerHeight - m.height - 8)) + 'px'
  },

  construireMenuGomme(this: UI): void {
    const m = this.menuGomme.el, zone = reglages.gomme === 'zone'
    m.replaceChildren()
    titreMenu(m, 'Gomme')
    const mode = (id: ModeGomme, texte: string, aide: string) => this.entreeMenu(m, texte, () => {
      choisirGomme(id)
      if (this.app.outil !== 'gomme') this.app.choisirOutil('gomme')
      this.maj()
      this.message(id === 'zone' ? 'La gomme efface seulement là où elle passe.' : 'La gomme efface le trait entier.')
    }, { coche: reglages.gomme === id, aide, action: 'gomme-' + id })
    mode('trait', 'Effacer le trait entier', 'Ce qu\'elle touche part en entier : un trait, une figure, une formule (jamais une image)')
    mode('zone', 'Effacer seulement là où elle passe', 'Coupe l\'écriture et le surligneur ; les figures, les images et les formules restent')
    filetMenu(m)
    titreMenu(m, 'Taille (là où elle passe)')
    const tailles: [TailleGomme, string][] = [['petite', 'Petite'], ['moyenne', 'Moyenne'], ['grande', 'Grande']]
    for (const [id, nom] of tailles) {
      this.entreeMenu(m, nom, () => {
        choisirTailleGomme(id)
        if (this.app.outil !== 'gomme') this.app.choisirOutil('gomme')
        this.message(`Gomme : ${nom.toLowerCase()}.`)
      }, { coche: reglages.tailleGomme === id, inactif: !zone, action: 'gomme-' + id })
    }
  },

  /** Le menu du rôle du doigt : ouvert par son bouton, ou par « Changer »
   *  dans le message « Stylet détecté » */
  ouvrirReglageDoigt(this: UI): void {
    if (this.menuDoigt.el.hidden) this.basculerReglageDoigt(false)
  },

  basculerReglageDoigt(this: UI, auClavier: boolean): void {
    const m = this.menuDoigt.el
    // Un stylet s'est posé sur l'écran : il est tactile, le bouton a sa place
    // (et la barre, plus haute, replie peut-être ses couleurs)
    if (this.boutonDoigt.hidden) { this.boutonDoigt.hidden = false; this.majCouleursRepliees() }
    // Au téléphone (lot 5, K10), le bouton du doigt est dans « Autres outils » :
    // son menu y est rattaché (le focus y revient)
    this.menuDoigt.bouton = this.telephone ? this.boutonAutres : this.boutonDoigt
    if (m.hidden) this.construireMenuDoigt()
    basculerMenu(this.menuDoigt)
    if (m.hidden) return
    this.placerMenuDoigt()
    if (auClavier) m.querySelector<HTMLElement>('.menu-item[aria-checked="true"]')?.focus()
  },

  /** Le menu du doigt, à droite de la barre, à la hauteur de son bouton ; au
   *  téléphone, près de « Autres outils » */
  placerMenuDoigt(this: UI): void {
    if (this.telephone) { this.placerPresDeLaBarre(this.menuDoigt.el, this.boutonAutres); return }
    this.menuDoigt.el.style.maxWidth = this.menuDoigt.el.style.maxHeight = ''
    const b = this.boutonDoigt.getBoundingClientRect(), o = this.barreOutils.getBoundingClientRect()
    placerMenu(this.menuDoigt.el, new DOMRect(o.left, b.top, o.width, b.height), 'droite')
    this.sousLaBarreDuHaut(this.menuDoigt.el)
  },

  construireMenuDoigt(this: UI): void {
    const m = this.menuDoigt.el
    m.replaceChildren()
    m.appendChild(Object.assign(document.createElement('div'), { className: 'menu-titre', textContent: 'Le doigt' }))
    for (const d of DOIGTS) {
      const aide = d.id === 'auto' && reglages.styletDirect ? 'stylet détecté : le doigt déplace la vue' : d.aide
      this.entreeMenu(m, d.nom, () => { this.app.choisirDoigt(d.id); this.message(d.dit) }, { coche: reglages.doigt === d.id, aide })
    }
    // Le toucher à deux doigts qui annule (à trois, qui rétablit) : allumé au
    // départ sur un écran tactile ; au TNI, une manche ou une paume peut en
    // faire un, on le coupe ici
    m.appendChild(Object.assign(document.createElement('hr'), { className: 'menu-filet' }))
    m.appendChild(Object.assign(document.createElement('div'), { className: 'menu-titre', textContent: 'Gestes' }))
    this.entreeMenu(m, 'Deux doigts : annuler', () => {
      choisirGestes(!reglages.gestes)
      this.message(reglages.gestes ? 'Toucher à deux doigts : annuler ; à trois : rétablir.' : 'Gestes à deux et trois doigts coupés.')
    }, { coche: reglages.gestes, caseACocher: true, aide: 'trois doigts : rétablir · un toucher bref' })
  },
}
