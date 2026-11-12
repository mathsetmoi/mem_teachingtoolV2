// =============================================================
// L'INTERFACE : LE MENU COMPLET DE CE QUI EST PRIS
// Des méthodes de la classe UI (src/ui.ts), rangées ici par sujet :
// elles s'ajoutent à la classe à la fin de ui.ts (ajouterMethodes).
// =============================================================
import type { UI } from '../ui'
import { COULEURS, TAILLES, TOUTE_LA_SELECTION } from '../app'
import { etapesImage } from '../construction'
import { centreDe, image, versRelatif } from '../formes'
import type { P, Transformation } from '../formes'
import { TAILLES_FORMULE, changerCouleur, changerEpaisseur, changerPointilles, habillageCommun, titreDuMenu } from '../habillage'
import { icone } from '../icones'
import { fermerMenu, filetMenu, placerMenu, positionPanneau, refaireEnGardantLeFocus, titreMenu } from '../menus'
import type { OptionsEntree } from '../menus'
import { CTRL } from '../navigateur'
import { aidesOrdre } from '../ordre'
import type { Sens } from '../ordre'
import { messageVerrou, pointeurDuClic, titreModifierFormule } from '../pointeurs'
import { estTexte } from '../texte'
import { CM, libre } from '../types'
import type { Figure, Forme, Formule } from '../types'
import { FONDS_FIGURE, TITRE_ENVOI, TITRE_IMAGE, TITRE_PLUS_VERROUILLE, bouton, html, nombre } from '../ui'
import type { Section } from '../ui'
import { minuscule } from '../verrou'

export const methodesMenuComplet = {
  // ----- Le menu complet de ce qui est pris -----
  /** Le menu complet (le panneau sous le nom d'avant) : celui de l'objet seul
   *  sélectionné dont app.options est l'identifiant, ou le menu commun d'une
   *  sélection de plusieurs objets (app.options vaut TOUTE_LA_SELECTION). Il
   *  se ferme dès que ce qu'il règle n'est plus choisi, se cache pendant
   *  qu'on le déplace (formeChoisie, formesChoisies) et revient au lâcher. */
  majPanneau(this: UI): void {
    const app = this.app
    const plusieurs = app.options === TOUTE_LA_SELECTION
    if (plusieurs ? app.selection.size < 2 : app.options && !(app.selection.size === 1 && app.selection.has(app.options))) app.options = null
    // Le menu fermé, ce qui est verrouillé ne reste pas sélectionné (lot 5 ;
    // maj l'a déjà fait, sauf si le menu vient de se fermer ici)
    app.oublierProteges()
    let formes: Forme[] | null = null
    if (!app.enLecture && plusieurs) formes = app.formesChoisies()
    else if (!app.enLecture && app.options) { const f = app.formeChoisie(); if (f && f.id === app.options) formes = [f] }
    if (!formes?.length) {
      this.panneau.hidden = true; this.clePanneau = ''; this.formesPanneau = []
      // Son menu ⋯ s'en va avec lui (son bouton n'est plus là)
      if (!this.menuPlus.el.hidden) fermerMenu()
      return
    }
    const id = plusieurs ? TOUTE_LA_SELECTION + formes.map(f => f.id).join(',') : formes[0].id
    if (id !== this.idPanneau) { this.idPanneau = id; this.section = null }
    if (plusieurs) {
      // Plusieurs objets : on refait le menu quand l'un d'eux a changé (une
      // forme changée, même déplacée, est un nouvel objet) ; comparer les
      // objets eux-mêmes ne coûte rien, même sur mille traits sélectionnés
      const cle = TOUTE_LA_SELECTION + '|' + this.section
      if (cle !== this.clePanneau || formes.length !== this.formesPanneau.length || formes.some((f, i) => f !== this.formesPanneau[i])) {
        refaireEnGardantLeFocus(this.panneau, () => this.construireMenuPlusieurs(formes!)); this.clePanneau = cle; this.formesPanneau = formes
      }
    } else {
      // Un objet : on ne reconstruit que s'il a changé (sauf sa place) : sinon
      // un champ en cours de saisie perdrait le curseur à chaque mise à jour
      const { x: _x, y: _y, ...props } = formes[0]
      const cle = JSON.stringify(props) + '|' + this.section
      if (cle !== this.clePanneau) { const f = formes[0]; refaireEnGardantLeFocus(this.panneau, () => this.construirePanneau(f)); this.clePanneau = cle; this.formesPanneau = [] }
    }
    this.panneau.hidden = false
    // Au-dessus de ce qu'il règle (toute la sélection), sinon en dessous,
    // sinon à côté : jamais dessus quand il a la place ailleurs (voir
    // positionPanneau). Sa rangée d'onglets tient sur une ligne : ce qui
    // sort de la page (une image, une autre page) est dans son menu ⋯.
    // Le cadre de taille et sa pastille ↻ comptent comme l'objet (lot 5 : voir
    // App.emprise) : le menu ne les couvre pas (sans la place, il ne couvre
    // ni la pastille, ni, s'il le peut, la figure elle-même)
    const base = plusieurs ? app.boiteDuContenu(formes) : app.rendu.boite(formes[0])
    const b = app.emprise(formes, base)
    if (!b) return
    const cam = app.cam, z = app.rendu.scene.getBoundingClientRect()
    const a = cam.versEcran(b.x, b.y), c = cam.versEcran(b.x + b.l, b.y + b.h)
    const d = app.pastilleAEviter()
    const pa = d && cam.versEcran(d.x, d.y), pb = d && cam.versEcran(d.x + d.l, d.y + d.h)
    const fa = base && cam.versEcran(base.x, base.y), fb = base && cam.versEcran(base.x + base.l, base.y + base.h)
    // Au téléphone (lot 5, K10) : entre la barre du haut et celle du bas (en
    // portrait, sur toute la largeur) ou à droite de la barre des outils (en
    // paysage), jamais sur elles ; il défile s'il est plus haut que la place
    const telephone = this.telephone
    let bornes: { gauche: number; haut: number; bas?: number } | null = null
    if (telephone) {
      const f = this.bordsFlottants()
      bornes = { gauche: f.gauche ? f.gauche + 8 : 8, haut: Math.ceil(f.haut + 6), bas: f.bas }
      const hauteur = Math.max(120, Math.floor((f.bas ?? window.innerHeight) - bornes.haut - 8)) + 'px'
      if (this.panneau.style.maxHeight !== hauteur) this.panneau.style.maxHeight = hauteur
    } else if (this.panneau.style.maxHeight) this.panneau.style.maxHeight = ''
    const l = this.panneau.offsetWidth, h = this.panneau.offsetHeight
    // À droite de la barre d'outils ; sur un écran étroit où il n'y tient pas
    // (il passe alors à la ligne sur toute la largeur), il la couvre plutôt
    // que de sortir de l'écran, comme la barre d'actions (au téléphone, il
    // ne la couvre jamais : voir plus haut)
    const barre = this.barreOutils.getBoundingClientRect().right + 8
    const gauche = l <= window.innerWidth - barre - 8 ? barre : 8
    const p = positionPanneau({ left: z.left + a.x, top: z.top + a.y, right: z.left + c.x, bottom: z.top + c.y }, l, h,
      { l: window.innerWidth, h: window.innerHeight }, bornes ?? { gauche, haut: 76 }, undefined, undefined,
      pa && pb ? { left: z.left + pa.x, top: z.top + pa.y, right: z.left + pb.x, bottom: z.top + pb.y } : undefined,
      fa && fb ? { left: z.left + fa.x, top: z.top + fa.y, right: z.left + fb.x, bottom: z.top + fb.y } : undefined)
    this.panneau.style.left = p.left + 'px'
    this.panneau.style.top = p.top + 'px'
    // Son menu ⋯ ouvert le suit (le menu complet a pu bouger ou se refaire)
    const plus = this.menuPlus.bouton
    if (!this.menuPlus.el.hidden && plus && this.panneau.contains(plus)) placerMenu(this.menuPlus.el, plus.getBoundingClientRect(), 'dessous')
  },

  /** Le petit menu ⋯ du menu complet, que partagent le menu d'un objet et
   *  le menu commun de plusieurs. Refait à chaque ouverture (la sélection a
   *  pu changer), en SECTIONS séparées d'un filet : chacune ajoute ses
   *  lignes sans toucher aux autres : ce qui sort de la page, l'ordre,
   *  « Protéger », « Groupe » pour un membre pris seul, et « Position »
   *  quand il y a de quoi redresser (lot 5). */
  construireMenuPlus(this: UI): void {
    const m = this.menuPlus.el
    m.replaceChildren()
    // --- Ce qui sort de la page : une image, une autre page ---
    if (this.app.enSeancePassee) this.entreeMenu(m, 'Copier dans la séance d\'aujourd\'hui', () => this.app.copierVersAujourdhui(), { action: 'copier-aujourdhui',
      aide: 'Sur la page du jour où vous étiez, à la même place' })
    this.entreeMenu(m, 'Copier en image', () => this.copierEnImage('selection'), { aide: TITRE_IMAGE })
    this.entreeMenu(m, 'Envoyer vers…', () => this.ouvrirEnvoi(), { aide: TITRE_ENVOI })
    // Le menu court d'un verrouillé (lot 5) : rien d'autre, il ne change plus
    if (this.app.selectionProtegee()) return
    // --- L'ordre, dans le calque de l'objet (voir ordre.ts) ---
    filetMenu(m)
    this.sectionOrdre(m)
    // --- Protéger : verrouiller, fixer en fond (lot 5) ---
    filetMenu(m)
    this.sectionProteger(m)
    // --- Groupe : sortir un membre pris seul de son groupe (lot 5) ---
    const membre = this.app.membrePris()
    if (membre) {
      filetMenu(m)
      this.sectionGroupe(m, membre)
    }
    // --- Position : tourner d'un quart de tour, remettre droit (lot 5, retouches) ---
    if (this.app.tournable() || this.app.redressable() || this.app.rognable()) {
      filetMenu(m)
      this.sectionPosition(m)
    }
  },

  /** La section « Position » du menu ⋯, pour ce qui tourne à la pastille ↻
   *  (une image, une formule, un trait, une figure, un groupe, plusieurs
   *  objets libres) : « Tourner d'un quart de tour à gauche » (↺) et « … à
   *  droite » (↻), autour du centre de la pastille, chacun en une étape
   *  d'annulation (retouches après le lot 5 : à la tablette graphique, le
   *  bouton du stylet ouvre ce menu, et tourner à la pastille demande de
   *  viser) ; puis, pour une image ou une formule seule tournée (lot 5),
   *  « Remettre droit », qui annule sa rotation et garde sa taille et son
   *  centre (le chemin de retour quand l'aimant de la pastille n'a pas
   *  suffi, et le seul moyen de revenir exactement à 0) */
  sectionPosition(this: UI, m: HTMLElement): void {
    const app = this.app
    titreMenu(m, 'Position')
    if (app.tournable()) {
      this.entreeMenu(m, 'Tourner d\'un quart de tour à gauche', () => app.tournerQuart('gauche'), { action: 'quart-gauche', aide: '↺ 90°, autour de son centre' })
      this.entreeMenu(m, 'Tourner d\'un quart de tour à droite', () => app.tournerQuart('droite'), { action: 'quart-droite', aide: '↻ 90°, autour de son centre' })
    }
    if (app.redressable()) this.entreeMenu(m, 'Remettre droit', () => app.redresserSelection(), { action: 'redresser', aide: 'Annule la rotation, garde la taille' })
    if (app.rognable()) this.entreeMenu(m, 'Rogner', () => app.commencerRognage(), { action: 'rogner', aide: 'Ne garder qu\'une partie de l\'image' })
  },

  /** La section « Protéger » du menu ⋯ (lot 5) : « Verrouiller » (Maj + L ;
   *  son aide dit comment le déverrouiller, dans les mots du pointeur), et
   *  « Fixer en fond » quand on n'a pris que des images (un énoncé
   *  importé ; une formule ou une figure ne passe pas sous l'encre : voir
   *  ordre.ts). */
  sectionProteger(this: UI, m: HTMLElement): void {
    const app = this.app
    titreMenu(m, 'Protéger')
    this.entreeMenu(m, 'Verrouiller', () => app.verrouiller(true), { touche: 'Maj + L', action: 'verrouiller',
      aide: 'Il ne bouge plus et ne se prend plus ; ' + minuscule(messageVerrou(app.dernierPointeur)) })
    const pris = app.objetsChoisis().filter(f => app.selection.has(f.id))
    if (pris.length && pris.every(f => f.type === 'image')) {
      this.entreeMenu(m, 'Fixer en fond', e => app.fixerEnFond(pris.map(f => f.id), pointeurDuClic(e, app.dernierPointeur)), { action: 'fixer',
        aide: 'Sous tout le reste : on écrit et on entoure par-dessus ; le menu de la page la détache' })
    }
  },

  /** La section « Ordre » du menu ⋯ : les quatre commandes, grisées quand
   *  elles ne feraient rien, et leurs raccourcis (Ctrl + flèche, ⌘ sur Mac).
   *  Une image ne passe jamais devant l'écriture, une formule jamais
   *  derrière : l'aide de « Mettre au premier plan » (et de « Mettre à
   *  l'arrière-plan », quand on ne le devinerait pas) le dit, d'après le
   *  calque de ce qui est pris (aidesOrdre, dans ordre.ts). */
  sectionOrdre(this: UI, m: HTMLElement): void {
    const app = this.app
    titreMenu(m, 'Ordre')
    const aides = aidesOrdre(app.objetsChoisis().filter(f => app.selection.has(f.id)))
    const entree = (texte: string, sens: Sens, touche: string, o: OptionsEntree = {}) =>
      this.entreeMenu(m, texte, () => app.ordonner(sens), { touche, inactif: !app.peutOrdonner(sens), action: 'ordre-' + sens, ...o })
    entree('Mettre au premier plan', 'premier', `${CTRL} + Maj + ↑`, { aide: aides.premier })
    entree('Avancer', 'avancer', `${CTRL} + ↑`)
    entree('Reculer', 'reculer', `${CTRL} + ↓`)
    entree('Mettre à l\'arrière-plan', 'arriere', `${CTRL} + Maj + ↓`, { aide: aides.arriere })
  },

  /** La section « Groupe » du menu ⋯ (lot 5), pour un membre pris seul (le
   *  second clic, le second toucher sur un membre du groupe pris) : « Sortir
   *  du groupe », comme Ctrl + Maj + G sur lui. La vérification
   *  « conformité » du lot 5 : ce n'était qu'au clavier, donc impossible au
   *  TNI, sur l'iPad et au téléphone. Les autres membres restent groupés ;
   *  s'il n'en reste qu'un, il n'est plus groupé non plus (App.degrouper). */
  sectionGroupe(this: UI, m: HTMLElement, membre: Forme): void {
    const app = this.app
    titreMenu(m, 'Groupe')
    const autres = app.membres(membre).length - 1
    this.entreeMenu(m, 'Sortir du groupe', () => app.degrouper(), { touche: `${CTRL} + Maj + G`, action: 'sortir-du-groupe',
      aide: autres > 1 ? 'Les autres restent groupés' : 'L\'autre n\'est plus groupé non plus' })
  },

  /** Un bouton texte du menu, dans sa ligne */
  optionMenu(this: UI, ligne: HTMLElement, texte: string, titre: string, faire: () => void, actif = false): HTMLButtonElement {
    const b = document.createElement('button')
    b.type = 'button'; b.className = 'option' + (actif ? ' actif' : ''); b.textContent = texte; b.title = titre
    b.setAttribute('aria-pressed', String(actif))
    b.addEventListener('click', faire)
    ligne.appendChild(b)
    return b
  },

  /** Ouvre (ou referme) une section du menu, qui se refait aussitôt */
  basculerSection(this: UI, s: Section): void {
    this.section = this.section === s ? null : s
    this.clePanneau = ''
    this.maj()
  },

  construirePanneau(this: UI, f: Forme): void {
    const app = this.app
    const p = this.panneau
    // Un objet verrouillé (lot 5) : son menu court
    if (!libre(f)) return this.construireMenuVerrouille([f])
    p.replaceChildren()
    const ligne = document.createElement('div'); ligne.className = 'ligne'
    const action = (texte: string, titre: string, faire: () => void, actif = false) => this.optionMenu(ligne, texte, titre, faire, actif)
    const ouvrir = (s: Section) => this.basculerSection(s)
    const figure = f.type === 'polygone' || f.type === 'cercle' ? f as Figure : null
    const segment = f.type === 'polygone' && !f.ferme && f.pts.length === 4
    // « Copier », puis ⋯ (« Copier en image », « Envoyer vers… » : voir
    // boutonPlus), avant Supprimer
    const copier = () => {
      action('Copier', `Copier (${CTRL}+C) : ${CTRL}+V la colle ici, sur une autre page ou dans un autre onglet`, () => app.copier())
      this.boutonPlus(ligne)
    }
    const jeter = () => ligne.appendChild(bouton('poubelle', 'Supprimer (Suppr)', () => app.supprimerSelection(), 'danger'))

    if (f.type === 'formule') {
      // Une formule : la modifier (comme son double-clic), sa couleur et sa
      // taille. Pas de « Transformer » : l'image d'une formule n'en déplace
      // que le coin, sans la tourner ni la retourner.
      p.setAttribute('aria-label', titreDuMenu(f))
      // Son titre parle la langue du pointeur qui a ouvert le menu : jamais
      // « double-clic » au doigt
      action('Modifier', titreModifierFormule(app.dernierPointeur, estTexte(f)), () => app.modifierFormule(f))
      action('Couleur et taille', 'La couleur et la taille des caractères', () => ouvrir('couleur'), this.section === 'couleur')
      action('Dupliquer', `Une copie, décalée d'un centimètre (${CTRL}+D)`, () => app.dupliquerSelection())
      copier(); jeter()
      p.appendChild(ligne)
      if (this.section === 'couleur') p.appendChild(this.sectionFormule(f))
      return
    }
    // Le nom de ce qu'il règle : du trait, de l'image, du segment, du cercle…
    p.setAttribute('aria-label', titreDuMenu(f))

    if (segment && f.type === 'polygone') {
      // Segment, droite ou demi-droite : on passe de l'un à l'autre d'un clic
      for (const [id, nom] of [[undefined, 'Segment'], ['droite', 'Droite'], ['demi', 'Demi-droite']] as const) {
        action(nom, nom === 'Segment' ? 'Segment [AB]' : nom === 'Droite' ? 'Droite (AB)' : 'Demi-droite [AB)', () => app.habiller(f, { prolonge: id } as never), f.prolonge === id)
      }
    }
    if (figure) {
      action(f.type === 'cercle' ? 'Centre' : segment ? (f.type === 'polygone' && f.prolonge ? 'Points' : 'Extrémités') : 'Sommets', 'Afficher les points et leurs noms',
        () => app.basculerSommets(figure), !!figure.sommets)
      if (!segment) action('Codage', 'Côtés de même longueur, angles droits', () => app.habiller(f, { codage: !figure.codage }), !!figure.codage)
    }
    // Une image : la rogner d'abord (une photo d'énoncé avec le bureau autour)
    if (f.type === 'image' && app.rognable()) action('Rogner', 'Ne garder qu\'une partie de l\'image', () => app.commencerRognage())
    if (f.type !== 'image') action('Contour', 'Couleur, épaisseur, pointillés', () => ouvrir('contour'), this.section === 'contour')
    if (figure && ((f.type === 'cercle' && !f.arc) || (f.type === 'polygone' && f.ferme))) action('Fond', 'Remplir la figure', () => ouvrir('fond'), this.section === 'fond')
    action('Transformer', 'Translation, rotation, symétrie, homothétie', () => ouvrir('transformer'), this.section === 'transformer')
    if (figure?.brut) action('Main levée', 'Revenir au tracé d\'origine', () => app.revenirMainLevee(figure))
    action('Dupliquer', `Une copie, décalée d'un centimètre (${CTRL}+D)`, () => app.dupliquerSelection())
    copier(); jeter()
    p.appendChild(ligne)

    // Noms des sommets, modifiables
    if (figure?.sommets && figure.noms) {
      const r = document.createElement('label'); r.className = 'noms'
      r.innerHTML = `<span>Noms</span><input class="saisie" spellcheck="false" aria-label="Noms des sommets">`
      const champ = r.querySelector('input')!
      champ.value = figure.noms.join(' ')
      champ.addEventListener('change', () => app.renommer(figure, champ.value))
      champ.addEventListener('keydown', e => { if (e.key === 'Enter') champ.blur() })
      p.appendChild(r)
    }

    if (this.section === 'contour') p.appendChild(this.sectionContour(f, figure))
    if (this.section === 'fond' && figure) p.appendChild(this.sectionFond(figure))
    if (this.section === 'transformer') p.appendChild(this.sectionTransformer(f))
  },

  sectionContour(this: UI, f: Forme, figure: Figure | null): HTMLDivElement {
    const app = this.app
    const s = document.createElement('div'); s.className = 'section'
    const couleur = 'couleur' in f ? f.couleur : ''
    for (const c of COULEURS) {
      const b = document.createElement('button')
      b.type = 'button'; b.className = 'pastille' + (c.valeur === couleur ? ' actif' : ''); b.title = c.nom; b.setAttribute('aria-label', c.nom)
      b.style.setProperty('--teinte', c.valeur)
      b.addEventListener('click', () => app.habiller(f, { couleur: c.valeur }))
      s.appendChild(b)
    }
    const taille = 'taille' in f ? f.taille : 0
    TAILLES.forEach((t, i) => {
      const valeur = f.type === 'trait' ? t.valeur * (f.opacite < 1 ? 5 : 1) : t.valeur
      const b = document.createElement('button')
      b.type = 'button'; b.className = 'taille' + (Math.abs(valeur - taille) < 0.01 ? ' actif' : ''); b.title = t.nom
      b.setAttribute('aria-label', 'Trait ' + t.nom.toLowerCase())
      b.innerHTML = `<span style="--d:${4 + i * 4}px"></span>`
      b.addEventListener('click', () => app.habiller(f, { taille: valeur }))
      s.appendChild(b)
    })
    if (figure) {
      const b = document.createElement('button')
      b.type = 'button'; b.className = 'option' + (figure.tirets ? ' actif' : ''); b.textContent = 'Pointillés'
      b.setAttribute('aria-pressed', String(!!figure.tirets))
      b.addEventListener('click', () => app.habiller(f, { tirets: !figure.tirets }))
      s.appendChild(b)
    }
    return s
  },

  sectionFond(this: UI, f: Figure): HTMLDivElement {
    const s = document.createElement('div'); s.className = 'section'
    const aucun = document.createElement('button')
    aucun.type = 'button'; aucun.className = 'option' + (!f.fond ? ' actif' : ''); aucun.textContent = 'Aucun'
    aucun.addEventListener('click', () => this.app.habiller(f, { fond: null }))
    s.appendChild(aucun)
    for (const c of FONDS_FIGURE) {
      const b = document.createElement('button')
      b.type = 'button'; b.className = 'pastille' + (f.fond === c.valeur ? ' actif' : ''); b.title = c.nom; b.setAttribute('aria-label', 'Fond ' + c.nom.toLowerCase())
      b.style.setProperty('--teinte', c.valeur)
      b.addEventListener('click', () => this.app.habiller(f, { fond: c.valeur }))
      s.appendChild(b)
    }
    return s
  },

  /** Une pastille de couleur du menu (active : la couleur de l'objet, ou de tous) */
  pastilleMenu(this: UI, s: HTMLElement, c: { nom: string; valeur: string }, actif: boolean, faire: () => void): void {
    const b = document.createElement('button')
    b.type = 'button'; b.className = 'pastille' + (actif ? ' actif' : ''); b.title = c.nom; b.setAttribute('aria-label', c.nom)
    b.setAttribute('aria-pressed', String(actif))
    b.style.setProperty('--teinte', c.valeur)
    b.addEventListener('click', faire)
    s.appendChild(b)
  },

  /** La couleur et la taille d'une formule : les quatre couleurs de la barre,
   *  et trois tailles de caractères */
  sectionFormule(this: UI, f: Formule): HTMLDivElement {
    const app = this.app
    const s = document.createElement('div'); s.className = 'section'
    for (const c of COULEURS) this.pastilleMenu(s, c, f.couleur === c.valeur, () => app.habiller(f, { couleur: c.valeur }))
    for (const t of TAILLES_FORMULE) this.optionMenu(s, t.nom, t.titre, () => app.habiller(f, { taille: t.valeur }), f.taille === t.valeur)
    return s
  },

  /** Le menu commun d'une sélection de plusieurs objets : « N objets » en
   *  tête, puis ce qu'on fait à tous d'un coup. Chaque action fait UNE étape
   *  d'annulation, quel que soit le nombre d'objets. */
  construireMenuPlusieurs(this: UI, formes: Forme[]): void {
    const app = this.app, p = this.panneau
    // Tous verrouillés (lot 5) : leur menu court
    if (formes.every(f => !libre(f))) return this.construireMenuVerrouille(formes)
    p.replaceChildren()
    const n = formes.length
    // Une sélection qui est exactement un groupe (lot 5) : « Groupe · 3
    // objets », et Dégrouper ; une autre sélection de plusieurs : Grouper
    const groupe = !!app.groupePris()
    p.setAttribute('aria-label', groupe ? `Options du groupe de ${n} objets` : `Options des ${n} objets`)
    // Une rangée un peu plus serrée (voir style.css) : avec Grouper ou
    // Dégrouper, elle tient encore sur une ligne de 820 px au plus
    const ligne = document.createElement('div'); ligne.className = 'ligne commun'
    const titre = document.createElement('span'); titre.className = 'titre-selection'; titre.textContent = groupe ? `Groupe · ${n} objets` : `${n} objets`
    ligne.appendChild(titre)
    const commun = habillageCommun(formes, TAILLES.map(t => t.valeur))
    // Des formules seules n'ont pas d'épaisseur, des images rien à régler
    if (commun.couleurs || commun.epaisseurs) {
      const texte = commun.epaisseurs ? 'Couleur, épaisseur' : 'Couleur'
      this.optionMenu(ligne, texte, commun.epaisseurs ? 'La couleur, l\'épaisseur et les pointillés de tous' : 'La couleur de tous', () => this.basculerSection('couleur'), this.section === 'couleur')
    }
    if (groupe) this.optionMenu(ligne, 'Dégrouper', `Dégrouper (${CTRL} + Maj + G)`, () => app.degrouper()).dataset.action = 'degrouper'
    else this.optionMenu(ligne, 'Grouper', `Grouper (${CTRL} + G) : ils se prennent, se déplacent et se règlent ensemble`, () => app.grouper()).dataset.action = 'grouper'
    this.optionMenu(ligne, 'Dupliquer', `Une copie de tous, décalée d'un centimètre (${CTRL}+D)`, () => app.dupliquerSelection())
    this.optionMenu(ligne, 'Copier', `Copier (${CTRL}+C) : ${CTRL}+V les colle ici, sur une autre page ou dans un autre onglet`, () => app.copier())
    this.optionMenu(ligne, 'Couper', `Couper (${CTRL}+X) : ils partent, ${CTRL}+V les remet`, () => app.couper())
    this.boutonPlus(ligne)
    ligne.appendChild(bouton('poubelle', `Supprimer les ${n} objets (Suppr)`, () => app.supprimerSelection(), 'danger'))
    p.appendChild(ligne)
    if (this.section !== 'couleur') return

    // Seulement ce que le code sait appliquer à chacun : la couleur (pas à une
    // image), l'épaisseur (traits et figures ; un trait de surligneur garde sa
    // largeur de surligneur), les pointillés (les figures). Un choix est
    // actif quand tous les objets qu'il concerne l'ont.
    const s = document.createElement('div'); s.className = 'section'
    if (commun.couleurs) for (const c of COULEURS) this.pastilleMenu(s, c, commun.couleur === c.valeur, () => app.habillerSelection(changerCouleur(c.valeur)))
    if (commun.epaisseurs) TAILLES.forEach((t, i) => {
      const actif = commun.taille === t.valeur
      const b = document.createElement('button')
      b.type = 'button'; b.className = 'taille' + (actif ? ' actif' : ''); b.title = t.nom
      b.setAttribute('aria-label', 'Trait ' + t.nom.toLowerCase()); b.setAttribute('aria-pressed', String(actif))
      b.innerHTML = `<span style="--d:${4 + i * 4}px"></span>`
      b.addEventListener('click', () => app.habillerSelection(changerEpaisseur(t.valeur)))
      s.appendChild(b)
    })
    if (commun.pointilles !== null) this.optionMenu(s, 'Pointillés', 'Les figures en pointillés', () => app.habillerSelection(changerPointilles(!commun.pointilles)), commun.pointilles)
    p.appendChild(s)
  },

  /** Le menu court d'un objet verrouillé, ou de plusieurs (lot 5) : le
   *  cadenas et « Verrouillé » en tête, puis seulement ce qui ne le change
   *  pas : « Déverrouiller » (Maj + L), « Copier » (la copie reste
   *  verrouillée), ⋯ (Copier en image, Envoyer vers…). Ni Supprimer, ni
   *  Dupliquer, ni Contour, ni Transformer : il ne bouge plus et ne change
   *  plus. Il s'ouvre au clic droit, au bouton du stylet, à l'appui long sur
   *  lui ; l'objet n'est sélectionné que le temps de ce menu. */
  construireMenuVerrouille(this: UI, formes: Forme[]): void {
    const app = this.app, p = this.panneau
    p.replaceChildren()
    const n = formes.length
    p.setAttribute('aria-label', n === 1 ? `${titreDuMenu(formes[0])}, verrouillé` : `Options des ${n} objets, verrouillés`)
    const ligne = document.createElement('div'); ligne.className = 'ligne'
    const titre = document.createElement('span'); titre.className = 'titre-selection verrouille'
    titre.innerHTML = icone('cadenas')
    titre.append(n === 1 ? 'Verrouillé' : `Verrouillés · ${n} objets`)
    ligne.appendChild(titre)
    this.optionMenu(ligne, 'Déverrouiller', n === 1 ? 'Déverrouiller (Maj + L) : il se prend et se déplace de nouveau'
      : 'Déverrouiller (Maj + L) : ils se prennent et se déplacent de nouveau', () => app.verrouiller(false)).dataset.action = 'deverrouiller'
    this.optionMenu(ligne, 'Copier', `Copier (${CTRL}+C) : ${CTRL}+V ${n === 1 ? 'la colle' : 'les colle'} ici, sur une autre page ou dans un autre onglet, ${n === 1 ? 'verrouillée' : 'verrouillées'}`, () => app.copier())
    this.boutonPlus(ligne, TITRE_PLUS_VERROUILLE)
    p.appendChild(ligne)
  },

  sectionTransformer(this: UI, f: Forme): HTMLDivElement {
    const app = this.app
    const s = document.createElement('div'); s.className = 'section transformer'
    const T = this.transfo
    const sommets: { nom: string; p: P }[] = f.type === 'polygone'
      ? app.sommetsDe(f).map((p, i) => ({ nom: f.sommets && f.noms?.[i] ? f.noms[i] : String(i + 1), p })) : []
    const centreFig = f.type === 'polygone' || f.type === 'cercle' ? centreDe(f)
      : (() => { const b = app.rendu.boite(f); return { x: b.x + b.l / 2, y: b.y + b.h / 2 } })()
    const origine = app.origineRepere

    // Seulement ce qui est sur le tableau : la figure elle-même, les points
    // nommés et les droites tracées de la page, le repère s'il y en a un
    const centres: { cle: string; nom: string; p: P }[] = [{ cle: 'centre', nom: f.type === 'cercle' ? 'Centre du cercle' : f.type === 'image' ? "Centre de l'image" : 'Centre de la figure', p: centreFig }]
    sommets.forEach((v, i) => centres.push({ cle: 'som:' + i, nom: 'Sommet ' + v.nom, p: v.p }))
    const deja = new Set(sommets.map(v => v.nom))
    for (const [nom, p] of app.pointsNommes()) if (!deja.has(nom)) centres.push({ cle: 'pt:' + nom, nom: 'Point ' + nom, p })
    if (origine) centres.push({ cle: 'origine', nom: 'Origine du repère', p: origine })

    const axes: { cle: string; nom: string; a: P; b: P }[] = app.droitesDeLaPage(f.id).map(d => ({ cle: 'seg:' + d.id, nom: d.nom, a: d.a, b: d.b }))
    const n = sommets.length, ferme = f.type === 'polygone' && f.ferme
    if (n >= 2) for (let i = 0; i < (ferme ? n : n - 1); i++) {
      const a = sommets[i], b = sommets[(i + 1) % n]
      axes.push({ cle: 'cote:' + i, nom: `Côté (${a.nom}${b.nom})`, a: a.p, b: b.p })
    }
    if (origine) {
      axes.push({ cle: 'ox', nom: 'Axe des abscisses', a: origine, b: { x: origine.x + 1, y: origine.y } })
      axes.push({ cle: 'oy', nom: 'Axe des ordonnées', a: origine, b: { x: origine.x, y: origine.y + 1 } })
    }

    const vecteurs: { cle: string; nom: string; dx: number; dy: number }[] = []
    for (let i = 0; i < n; i++) for (let j = 0; j < n; j++) {
      if (i !== j && vecteurs.length < 12) vecteurs.push({ cle: `v:${i}:${j}`, nom: `Vecteur ${sommets[i].nom}${sommets[j].nom}`, dx: sommets[j].p.x - sommets[i].p.x, dy: sommets[j].p.y - sommets[i].p.y })
    }

    // Le choix gardé, s'il existe encore ; sinon le premier de la liste
    if (!axes.some(a => a.cle === T.axe)) T.axe = axes[0]?.cle ?? ''
    if (!centres.some(c => c.cle === T.centre)) T.centre = centres[0].cle
    if (T.vecteur !== 'libre' && !vecteurs.some(v => v.cle === T.vecteur)) T.vecteur = vecteurs[0]?.cle ?? 'libre'

    const options = (l: { cle: string; nom: string }[], actuel: string) => l.map(o => `<option value="${o.cle}"${o.cle === actuel ? ' selected' : ''}>${html(o.nom)}</option>`).join('')
    const types = [['symetrie-axiale', 'Symétrie axiale'], ['symetrie-centrale', 'Symétrie centrale'], ['rotation', 'Rotation'], ['translation', 'Translation'], ['homothetie', 'Homothétie']]
    s.innerHTML = `
      <label class="champ"><span>Transformation</span><select class="t-type">${types.map(([v, t]) => `<option value="${v}"${v === T.type ? ' selected' : ''}>${t}</option>`).join('')}</select></label>
      <div class="champ choix-sur-tableau" data-pour="symetrie-axiale"><span>Axe</span>
        <select class="t-axe"${axes.length ? '' : ' hidden'}>${options(axes, T.axe)}</select>${axes.length ? '' : '<em>Aucune droite sur la page</em>'}
        <button type="button" class="secondaire petit designer-axe" title="Cliquer sur une droite de la page"${axes.length ? '' : ' hidden'}>Désigner</button>
        <button type="button" class="secondaire petit tracer-axe" title="Tracer l'axe sur la page (deux clics)">Tracer</button></div>
      <div class="champ choix-sur-tableau" data-pour="symetrie-centrale rotation homothetie"><span>Centre</span>
        <select class="t-centre">${options(centres, T.centre)}</select>
        <button type="button" class="secondaire petit designer-centre" title="Cliquer sur un point de la page">Désigner</button>
        <button type="button" class="secondaire petit tracer-centre" title="Placer le centre sur la page (un clic)">Tracer</button></div>
      <label class="champ" data-pour="rotation"><span>Angle (°, sens direct)</span><input class="saisie t-angle" value="${html(T.angle)}" inputmode="decimal"></label>
      <label class="champ" data-pour="homothetie"><span>Rapport k</span><input class="saisie t-k" value="${html(T.k)}" inputmode="decimal"></label>
      <label class="champ" data-pour="translation"><span>Vecteur</span><select class="t-vecteur">${options(vecteurs, T.vecteur)}<option value="libre"${T.vecteur === 'libre' ? ' selected' : ''}>Coordonnées (en cm)</option></select></label>
      <div class="champ coords" data-pour="libre"><span>x ; y</span><input class="saisie t-vx" value="${html(T.vx)}" inputmode="decimal" aria-label="x"><input class="saisie t-vy" value="${html(T.vy)}" inputmode="decimal" aria-label="y"></div>
      <label class="interrupteur instruments-transfo"><input type="checkbox"${this.constructeur.instruments ? ' checked' : ''}><span>Pas à pas avec les instruments</span></label>
      <div class="actions"><button type="button" class="secondaire pas-a-pas">Pas à pas</button><button type="button" class="principal construire">Construire l'image</button></div>`
    const q = <T extends HTMLElement>(c: string) => s.querySelector(c) as T
    const type = q<HTMLSelectElement>('.t-type'), vecteur = q<HTMLSelectElement>('.t-vecteur')
    const lire = () => {
      T.type = type.value; T.vecteur = vecteur.value
      T.axe = q<HTMLSelectElement>('.t-axe').value; T.centre = q<HTMLSelectElement>('.t-centre').value
      T.angle = q<HTMLInputElement>('.t-angle').value; T.k = q<HTMLInputElement>('.t-k').value
      T.vx = q<HTMLInputElement>('.t-vx').value; T.vy = q<HTMLInputElement>('.t-vy').value
    }
    const montrer = () => {
      s.querySelectorAll<HTMLElement>('[data-pour]').forEach(el => {
        const pour = el.dataset.pour!.split(' ')
        el.hidden = pour[0] === 'libre' ? !(type.value === 'translation' && vecteur.value === 'libre') : !pour.includes(type.value)
      })
    }
    s.addEventListener('change', () => { lire(); montrer() })
    s.addEventListener('input', lire)
    montrer()

    // Désigner ou tracer sur le tableau : le choix revient dans la liste
    const refaire = () => { this.clePanneau = ''; this.maj() }
    q('.designer-axe').addEventListener('click', () => app.designer('axe', axes.map(a => ({ cle: a.cle, a: a.a, b: a.b })), cle => { T.axe = cle; refaire() }))
    q('.tracer-axe').addEventListener('click', () => app.tracerAxe(id => { T.axe = 'seg:' + id; refaire() }))
    q('.designer-centre').addEventListener('click', () => app.designer('centre', centres.map(c => ({ cle: c.cle, a: c.p })), cle => { T.centre = cle; refaire() }))
    q('.tracer-centre').addEventListener('click', () => app.tracerCentre(nom => { T.centre = 'pt:' + nom; refaire() }))
    q<HTMLInputElement>('.instruments-transfo input').addEventListener('change', e => { this.constructeur.instruments = (e.target as HTMLInputElement).checked })

    /** La transformation choisie, et comment en parler dans les consignes */
    const transformation = (): { t: Transformation; noms: { axe?: string; centre?: string } } | null => {
      lire()
      const centre = centres.find(c => c.cle === T.centre)!
      const nomCentre = centre.cle.startsWith('pt:') ? centre.cle.slice(3) : centre.cle.startsWith('som:') ? centre.nom.replace('Sommet ', '') : centre.cle === 'origine' ? 'O' : 'le centre'
      switch (T.type) {
        case 'symetrie-axiale': {
          const a = axes.find(x => x.cle === T.axe)
          if (!a) { this.message('Choisis l\'axe : désigne une droite de la page, ou trace-la.'); return null }
          const m = a.nom.match(/\((.+)\)/)
          return { t: { type: 'symetrie-axiale', a: a.a, b: a.b }, noms: { axe: m ? `(${m[1]})` : "l'axe" } }
        }
        case 'symetrie-centrale': return { t: { type: 'symetrie-centrale', c: centre.p }, noms: { centre: nomCentre } }
        case 'rotation': {
          const angle = nombre(T.angle)
          if (angle === null) { this.message('Angle : un nombre de degrés, par exemple 90'); return null }
          return { t: { type: 'rotation', c: centre.p, angle }, noms: { centre: nomCentre } }
        }
        case 'homothetie': {
          const k = nombre(T.k)
          if (!k) { this.message('Rapport : un nombre non nul, par exemple 2, −0,5 ou 1/3'); return null }
          return { t: { type: 'homothetie', c: centre.p, k }, noms: { centre: nomCentre } }
        }
        default: {
          if (T.vecteur !== 'libre') { const v = vecteurs.find(x => x.cle === T.vecteur)!; return { t: { type: 'translation', dx: v.dx, dy: v.dy }, noms: {} } }
          const vx = nombre(T.vx), vy = nombre(T.vy)
          if (vx === null || vy === null) { this.message('Coordonnées : deux nombres, en centimètres'); return null }
          return { t: { type: 'translation', dx: vx * CM, dy: -vy * CM }, noms: {} }       // y vers le haut, comme au cahier
        }
      }
    }
    q('.construire').addEventListener('click', () => {
      const r = transformation(); if (!r) return
      this.section = null
      app.transformer(f, r.t)
    })
    q('.pas-a-pas').addEventListener('click', () => {
      const r = transformation(); if (!r) return
      this.section = null
      app.selection.clear(); this.maj()
      // Une image dont on a repéré la figure : on construit l'image de CETTE
      // figure (ses sommets nommés), et l'image se pose avec elle à la fin
      let source: Forme = f, aussi: Forme[] = []
      const finale = image(f, r.t, app.tableau.moi)
      let imgSource: Forme = finale
      if (f.type === 'image') {
        const liees = app.liees(f.id)
        const pg = liees.find(g => g.type === 'polygone' && g.ferme)
        const points = liees.filter(g => g.type === 'polygone' && !g.ferme && g.pts.length === 2) as Extract<Figure, { type: 'polygone' }>[]
        if (pg) {
          source = pg
          imgSource = { ...image(pg, r.t, app.tableau.moi), lie: finale.id } as Forme
          aussi = [finale, ...liees.filter(g => g !== pg).map(g => ({ ...image(g, r.t, app.tableau.moi), lie: finale.id }) as Forme)]
        } else if (points.length) {
          // Les points placés à la main sur l'image : on construit l'image de
          // chacun, puis l'image se pose sur eux
          const pts = points.map(g => app.sommetsDe(g)[0])
          source = { ...points[0], id: 'source', ...versRelatif(pts), noms: points.map(g => g.noms?.[0] ?? ''), sommets: true } as Forme
          imgSource = finale             // les points A', B'… naissent des étapes, liés à elle
        }
      }
      const noms = source.type === 'polygone' && source.sommets && source.noms ? ' de ' + source.noms.join('') : ''
      const titre = `${types.find(x => x[0] === T.type)![1]} : construction de l'image${noms}.`
      this.constructeur.jouerEtapes(etapesImage(source, r.t, imgSource, r.noms, aussi), titre)
    })
    return s
  },
}
