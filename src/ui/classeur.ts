// =============================================================
// L'INTERFACE : LE BOUTON DU CLASSEUR, COPIER EN IMAGE, LE PDF, LES SÉANCES, ENVOYER VERS
// Des méthodes de la classe UI (src/ui.ts), rangées ici par sujet :
// elles s'ajoutent à la classe à la fin de ui.ts (ajouterMethodes).
// =============================================================
import type { UI } from '../ui'
import type { EnregistrementCle } from '../classeurs/cle'
import type { CopieDrive } from '../classeurs/copie-drive'
import type { ActionEtat, Bandeau } from '../classeurs/etat'
import type { Fichiers } from '../classeurs/fichiers'
import type { Registre } from '../classeurs/registre'
import type { Surveillance } from '../classeurs/surveillance'
import { pagesLisibles } from '../fichier'
import type { P } from '../formes'
import { icone } from '../icones'
import { ENTREES, allerAuxEntrees, fermerMenu, filetMenu, ouvrirMenu, placerMenu, titreMenu } from '../menus'
import { CTRL, tableauCache } from '../navigateur'
import { ouvrirEnvoi } from '../pages/envoi'
import { pointeurDuClic } from '../pointeurs'
import { dateCourteMajuscule, libelleSeance, seancesDansLOrdre } from '../seances'
import type { SeanceDuClasseur } from '../seances'
import { demanderNomDeSeance, demanderReprise } from '../seances-vue'
import type { PageAPeindre } from '../sorties/apercu'
import { ouvrirFenetrePdf } from '../sorties/export-pdf'
import type { CibleExport, HoteFenetrePdf } from '../sorties/export-pdf'
import { copierEnImage, nomDeLImage } from '../sorties/image'
import { AUTOUR_DU_TEXTE, COURTS_LES_PLUS_LONGS, ID_ETAT, PLUSIEURS_RANGEES, SEANCES_AU_MENU, TITRE_FICHIER, TITRE_PLUS_TELEPHONE } from '../ui'
import type { FormeBoutonClasseur } from '../ui'
import { accorder, compterObjets } from '../verrou'

export const methodesClasseur = {
  // ----- Le bouton du classeur, l'état de la sauvegarde, le bandeau (lot 4) -----
  /** Une action de l'état (le bouton d'une ligne du menu ⋯ ou du bandeau) :
   *  la clé (C4), le Drive (C10) et le rangement (lot 18, main.ts)
   *  inscrivent les leurs ; le libellé peut être une fonction (recalculé à
   *  chaque affichage) */
  inscrireActionEtat(this: UI, action: ActionEtat, libelle: string | (() => string), faire: () => void): void {
    this.actionsEtat.set(action, { libelle, faire })
    this.majEtat()
  },

  /** Le libellé d'une action, maintenant */
  libelleDe(this: UI, a: { libelle: string | (() => string) }): string { return typeof a.libelle === 'function' ? a.libelle() : a.libelle },

  /** Ce que fait une action de l'état, si un morceau l'a inscrite (la
   *  bibliothèque en fait les boutons de la ligne du classeur ouvert) */
  actionEtat(this: UI, action: ActionEtat): { libelle: string; faire: () => void } | undefined {
    const a = this.actionsEtat.get(action)
    return a && { libelle: this.libelleDe(a), faire: a.faire }
  },

  /** L'enregistrement automatique dans un fichier (la clé, lot 4 C4) : ses
   *  entrées du menu ⋯ et les boutons de l'état et du bandeau (activer,
   *  reprendre après un rechargement, choisir un autre fichier, remplacer
   *  quand même). Le mot « clé » ne paraît pas à l'écran (lot 18). */
  brancherCle(this: UI, cle: EnregistrementCle | null): void {
    this.cle = cle
    if (!cle?.disponible) return
    this.inscrireActionEtat('activer-cle', 'Enregistrer automatiquement dans un fichier…', () => void cle.activer())
    this.inscrireActionEtat('reprendre-cle', 'Reprendre l\'enregistrement', () => void cle.reprendre())
    this.inscrireActionEtat('choisir-cle', 'Choisir un autre fichier…', () => void cle.choisirUnAutre())
    this.inscrireActionEtat('forcer-cle', 'Remplacer quand même', () => void cle.remplacerQuandMeme())
  },

  /** La copie sur le Drive (lot 4 C10) : les boutons de sa ligne et de ses
   *  bandeaux (se connecter, récupérer la copie, la remplacer quand même) ;
   *  son compte se choisit dans « Autres sauvegardes… » du menu ⋯ (lot 18) */
  brancherDrive(this: UI, drive: CopieDrive | null): void {
    this.drive = drive
    if (!drive?.enLigne) return
    this.inscrireActionEtat('connecter-drive', 'Se connecter à Google', () => void drive.seConnecter())
    this.inscrireActionEtat('recuperer-drive', 'Récupérer la copie du Drive', () => void drive.recuperer())
    this.inscrireActionEtat('forcer-drive', 'Remplacer quand même', () => void drive.remplacerQuandMeme())
  },

  /** L'état de la sauvegarde arrive (après le chargement du classeur) : le
   *  bouton, le menu et le bandeau le suivent */
  brancherEtat(this: UI, s: Surveillance): void {
    this.surveillance = s
    s.quandChange(() => this.majEtat())
    this.majEtat()
  },

  /** Le nom du classeur (il peut changer après coup : « Premier classeur »
   *  sur un navigateur neuf, un classeur renommé) */
  majNomClasseur(this: UI): void {
    const nom = this.app.classeur.nom, b = this.boutonClasseur
    if (this.nomClasseur.textContent !== nom) this.nomClasseur.textContent = nom
    if (b.title !== nom) b.title = nom
    const nomAccessible = `Classeur « ${nom} » : ses séances et la bibliothèque`
    if (b.getAttribute('aria-label') !== nomAccessible) b.setAttribute('aria-label', nomAccessible)
    this.majBoutonFichier()
  },

  /** Le bouton ⋯ quand le bouton du classeur est caché : il porte le point,
   *  son titre nomme le classeur, le lecteur d'écran y lit l'état */
  majBoutonFichier(this: UI): void {
    const f = this.boutonFichier, cache = this.formeClasseur === 'cache'
    // Au téléphone (lot 5, K10), il devient « Plus » : la page, les outils de
    // cours et le classeur y sont
    const base = this.telephone ? TITRE_PLUS_TELEPHONE : TITRE_FICHIER
    const titre = cache ? `${base} · Classeur « ${this.app.classeur.nom} »` : base
    if (f.title !== titre) { f.title = titre; f.setAttribute('aria-label', titre) }
    if (cache) f.setAttribute('aria-describedby', ID_ETAT)
    else f.removeAttribute('aria-describedby')
    const sansPoint = !(cache && this.attention)
    if (this.pointFichier.hidden !== sansPoint) this.pointFichier.hidden = sansPoint
  },

  /** L'état a changé (ou il est temps de vieillir « il y a 2 min ») */
  majEtat(this: UI): void {
    const s = this.surveillance
    if (!s) return
    const t = s.texte
    this.majNomClasseur()
    if (this.etatClasseur.textContent !== t.court) this.etatClasseur.textContent = t.court
    if (this.boutonClasseur.dataset.niveau !== t.niveau) this.boutonClasseur.dataset.niveau = t.niveau
    if (this.pointClasseur.hidden !== (t.niveau !== 'attention')) this.pointClasseur.hidden = t.niveau !== 'attention'
    // Pour le lecteur d'écran : toutes les lignes, chacune finie par un point
    const description = t.lignes.map(l => /[.…!]$/.test(l.texte) ? l.texte : l.texte + '.').join(' ')
    if (this.descriptionEtat.textContent !== description) this.descriptionEtat.textContent = description
    // Le bloc du menu ⋯ ouvert se refait, sauf si le focus y est (son bouton) ;
    // tout le menu, si ses entrées ne sont plus les bonnes (le classeur
    // vient de recevoir son fichier, lot 18) et que le focus n'y est pas
    const bloc = this.blocEtat, menu = this.menuFichier.el
    if (bloc?.isConnected && !menu.hidden) {
      if (this.formeDuMenuFichier().forme !== this.formeMenuFichier && !menu.contains(document.activeElement)) this.construireMenuFichier()
      else if (!bloc.contains(document.activeElement)) this.remplirBlocEtat()
    }
    this.majBandeau(s.bandeau)
  },

  /** Le bandeau discret : une ligne sous le bouton du classeur (ou sous la
   *  barre du haut), seulement pour une action qui demande un clic. Son
   *  texte est celui de son apparition (le lecteur d'écran le lit une fois). */
  majBandeau(this: UI, b: Bandeau | null): void {
    const el = this.bandeau
    const actions = b ? b.actions.filter(a => this.actionsEtat.has(a)) : []
    // (les libellés aussi : « Ranger « 2nde » dans un dossier… » suit le niveau)
    const forme = b ? `${b.raison}|${actions.map(a => this.libelleDe(this.actionsEtat.get(a)!)).join()}|${b.fermable}` : ''
    if (el.dataset.forme !== forme) {
      el.dataset.forme = forme
      el.dataset.raison = b?.raison ?? ''
      el.replaceChildren()
      if (b) {
        const texte = Object.assign(document.createElement('span'), { className: 'texte-bandeau', textContent: b.texte })
        const boutons = Object.assign(document.createElement('span'), { className: 'actions-bandeau' })
        for (const a of actions) {
          const x = this.actionsEtat.get(a)!
          const bt = Object.assign(document.createElement('button'), { type: 'button', className: 'bouton-bandeau', textContent: this.libelleDe(x) })
          bt.dataset.etatAction = a
          bt.addEventListener('click', () => x.faire())
          boutons.appendChild(bt)
        }
        el.append(texte)
        if (b.fermable) {
          const raison = b.raison
          const fermer = Object.assign(document.createElement('button'), { type: 'button', className: 'fermer-bandeau', innerHTML: icone('fermer') })
          fermer.title = 'Fermer'; fermer.setAttribute('aria-label', 'Fermer')
          fermer.addEventListener('click', () => this.surveillance?.fermerBandeau(raison))
          el.append(fermer)
        }
        el.append(boutons)
      }
    }
    if (el.hidden !== !b) el.hidden = !b
    if (b) this.placerBandeau()
  },

  /** Sous le bouton du classeur quand il a sa barre ; sinon sous la barre
   *  du haut, aligné à droite, mais jamais sous la barre des outils : sur un
   *  téléphone en portrait, la barre du haut va d'un bord à l'autre, et la
   *  barre des outils (au-dessus du bandeau) en cacherait le début du texte
   *  et des boutons. Il s'arrête alors à 8 px à droite d'elle. */
  placerBandeau(this: UI): void {
    const el = this.bandeau
    if (el.hidden) return
    if (this.formeClasseur === 'large' || this.formeClasseur === 'etroit') {
      const r = this.barreClasseur.getBoundingClientRect()
      el.style.left = Math.round(r.left) + 'px'; el.style.right = ''; el.style.top = Math.round(r.bottom + 8) + 'px'
      el.style.maxWidth = ''
    } else {
      const r = this.barreHaut.getBoundingClientRect(), o = this.barreOutils.getBoundingClientRect()
      const droite = Math.round(window.innerWidth - r.right), haut = Math.round(r.bottom + 8)
      el.style.left = ''; el.style.right = droite + 'px'; el.style.top = haut + 'px'
      // (la barre des outils posée en bas, au téléphone en portrait, n'est
      // pas à côté de lui : lot 5, K10)
      const gauche = o.width > 0 && o.bottom > haut && o.left < window.innerWidth / 2 && !this.barreEnBas() ? Math.round(o.right + 8) : 12
      el.style.maxWidth = `min(360px, ${Math.max(160, window.innerWidth - droite - gauche)}px)`
    }
  },

  /** Le bouton du classeur revient dans sa barre (avant de régler le nom de
   *  la page : la barre du haut est alors celle du lot 3) */
  sortirBoutonClasseur(this: UI): void {
    if (this.boutonClasseur.parentElement !== this.barreClasseur) this.barreClasseur.appendChild(this.boutonClasseur)
  },

  /** La place du bouton du classeur, MESURÉE, entre la barre des outils et
   *  la barre du haut : place = bord gauche de la barre du haut − (bord droit
   *  de la barre des outils + 12) − 12.
   *  a) assez pour que le plus long des textes courts de l'état y tienne
   *     entier (placeDeLaFormeLarge : 252 px), et 140 px au moins : sa propre
   *     barre, à 12 px à droite de la barre des outils, avec l'icône, le nom
   *     et l'état (au plus toute la place) ;
   *  b) de 58 px à la place de a) : sa barre, avec l'icône et le point ;
   *  c) moins, et la barre du haut déjà sur plusieurs rangées : il devient
   *     son premier élément (l'icône et le point), s'il n'y ajoute pas de
   *     rangée ; sinon d) ;
   *  d) sinon, il est caché : le bouton ⋯ porte le point, son titre nomme le
   *     classeur (« · Classeur « X » »), son menu commence par le bloc du
   *     classeur.
   *  Mesuré : 1366 × 768 → 424 px (a) ; 1280 × 720 → 338 (a) ; TNI 1920 →
   *  978 (a) ; 1194 × 834 → 252 (a) ; 1180 × 820 → 238 (b : « Seulement
   *  dans ce navigateur » y serait coupé) ; 1112 × 834 → 170 (b) ; 1024 ×
   *  768 sans nom de page → 82 (b),
   *  avec un nom → −5 (d : le compteur y prend la place jusqu'à x = 89 ; la
   *  barre du haut et le nom de la page restent ceux du lot 3) ; 1100 avec
   *  un nom → 24 (d) ; 960 × 600 → 18 sur une rangée (d : l'insérer
   *  ajouterait une rangée) ; 768 × 1024, 820 × 1180, 844 × 390, 641 × 900
   *  → −6 sur deux rangées (c : la hauteur reste 104) ; 390 × 844 (c : 150).
   *  Appelé par reglerCompteur seulement (jamais d'une page à l'autre). */
  placerBoutonClasseur(this: UI): void {
    const haut = this.barreHaut, barre = this.barreClasseur, b = this.boutonClasseur
    const o = this.barreOutils.getBoundingClientRect(), h = haut.getBoundingClientRect()
    const gauche = Math.round(o.right + 12)
    const place = Math.floor(h.left - gauche - 12)
    let forme: FormeBoutonClasseur
    if (this.telephone) {
      // La mise en page du téléphone (lot 5, K10) : la barre du haut est sur
      // une rangée, et le bouton du classeur en est le premier bouton (son
      // icône et le point) s'il y tient sans en ajouter une ; sinon sa barre,
      // étroite, si elle a la place ; sinon caché (le point sur « Plus »)
      b.classList.add('etroit')
      haut.prepend(b)
      if (haut.getBoundingClientRect().height <= h.height + 0.5) forme = 'dans-la-barre'
      else { barre.appendChild(b); forme = place >= 58 ? 'etroit' : 'cache' }
    } else if (place >= Math.max(140, this.placeDeLaFormeLarge())) forme = 'large'
    else if (place >= 58) forme = 'etroit'
    else if (h.height > PLUSIEURS_RANGEES) {
      b.classList.add('etroit')
      haut.prepend(b)
      forme = haut.getBoundingClientRect().height > h.height + 0.5 ? 'cache' : 'dans-la-barre'
      if (forme === 'cache') barre.appendChild(b)
    } else forme = 'cache'
    this.formeClasseur = forme
    b.classList.toggle('etroit', forme !== 'large')
    this.placerChampRecherche()
    barre.hidden = forme === 'cache' || forme === 'dans-la-barre'
    barre.dataset.forme = forme
    if (!barre.hidden) {
      barre.style.left = gauche + 'px'
      // Large : au plus toute la place, et au moins 200 px (quand elle les
      // a), pour que la barre ne change pas de largeur à chaque minute
      barre.style.maxWidth = forme === 'large' ? place + 'px' : ''
      barre.style.minWidth = forme === 'large' ? Math.min(place, 200) + 'px' : ''
    }
    this.majBoutonFichier()
    this.placerBandeau()
  },

  /** La place que demande la forme large pour que le plus long des textes
   *  courts de l'état y tienne entier (« Seulement dans ce navigateur » :
   *  184 px de texte, 252 px en tout). Mesurée dans la police de l'état, par
   *  un texte caché (le texte du bouton est caché dans les autres formes). */
  placeDeLaFormeLarge(this: UI): number {
    let m = this.mesureCourt
    if (!m?.isConnected) {
      m = this.mesureCourt = Object.assign(document.createElement('span'), { className: 'mesure-etat' })
      m.setAttribute('aria-hidden', 'true')
      document.body.appendChild(m)
    }
    let texte = 0
    for (const t of COURTS_LES_PLUS_LONGS) { m.textContent = t; texte = Math.max(texte, m.getBoundingClientRect().width) }
    return Math.ceil(texte) + AUTOUR_DU_TEXTE
  },

  /** Ouvre ou ferme le menu du classeur sous ancre (le bouton du classeur,
   *  ou ⋯ quand il est caché). Pas pendant la revue, la trieuse, une fenêtre
   *  ouverte, ni en plein geste. auClavier : le focus va à sa première entrée. */
  basculerMenuSeances(this: UI, ancre: HTMLElement, auClavier: boolean): void {
    const m = this.menuSeances, app = this.app
    if (!m.el.hidden && m.bouton === ancre) { fermerMenu(); return }
    if (this.bibliotheque?.ouvert || tableauCache(app) || this.revue.ouvert || this.trieuse.ouvert || document.querySelector('dialog[open]') || app.enGeste) return
    m.bouton = ancre
    this.construireMenuSeances()
    ouvrirMenu(m)
    // Sous son bouton ; plus long que la place, il défile
    const r = ancre.getBoundingClientRect()
    const visible = Math.min(window.innerHeight, window.visualViewport?.height ?? Infinity)
    m.el.style.maxHeight = Math.max(160, Math.floor(visible - r.bottom - 6 - 8)) + 'px'
    m.el.scrollTop = 0
    placerMenu(m.el, r, 'dessous')
    // Aligné à gauche sur la carte du classeur (elle est au bord gauche)
    if (ancre === this.boutonClasseur) m.el.style.left = Math.max(8, Math.min(r.left, window.innerWidth - m.el.offsetWidth - 8)) + 'px'
    if (auClavier) m.el.querySelector<HTMLElement>(ENTREES)?.focus()
  },

  /** Le menu du classeur (30 octobre 2026), refait à chaque ouverture : ses
   *  séances qui ont des pages, la première en haut (la plus récente, ou
   *  celle que le professeur y a mise), six au plus, celle qu'on regarde
   *  cochée, les passées « en lecture » ; « Toutes les séances… » (la vue
   *  « Séances » de la bibliothèque, sur ce chapitre) ; « Nouvelle séance » ;
   *  puis la bibliothèque des classeurs. */
  construireMenuSeances(this: UI): void {
    const m = this.menuSeances.el, app = this.app
    m.replaceChildren()
    const seances = seancesDansLOrdre(app.tableau.seancesDuClasseur().filter(s => s.pages.length))
    const vue = app.seanceVue, derniere = app.tableau.derniereSeance()
    if (seances.length) {
      titreMenu(m, 'Séances de ce chapitre')
      for (const s of seances.slice(0, SEANCES_AU_MENU)) {
        const n = s.pages.length
        const aide = [s.nom ? dateCourteMajuscule(s.debut) : null, `${n} page${n > 1 ? 's' : ''}`, s.id === derniere?.id ? null : 'en lecture'].filter(x => x).join(' · ')
        const b = this.entreeMenu(m, libelleSeance(s), () => this.voirSeance(s.id), { action: 'voir-seance', coche: s.id === vue?.id, aide })
        b.dataset.seance = s.id
      }
      if (this.bibliotheque) this.entreeMenu(m, `Toutes les séances (${seances.length})…`, () => this.toutesLesSeances(), { action: 'toutes-les-seances' })
    }
    if (vue) this.entreeMenu(m, 'Nouvelle séance', () => this.nouvelleSeance(), { action: 'nouvelle-seance' })
    if (m.childElementCount) filetMenu(m)
    this.entreeMenu(m, 'Bibliothèque des classeurs', () => this.ouvrirBibliotheque(this.menuSeances.bouton ?? this.boutonClasseur), { action: 'bibliotheque', touche: this.telephone ? undefined : `${CTRL} + B` })
  },

  /** Va à une séance du classeur : la séance du jour, là où on en était ;
   *  une autre, à sa première page (en lecture si elle est passée) */
  voirSeance(this: UI, id: string): void {
    const app = this.app
    if (app.seanceVue?.id === id) return
    if (app.tableau.derniereSeance()?.id === id && app.enSeancePassee) { app.retourAujourdhui(); return }
    const page = app.tableau.pagesDeLaSeance(id)[0]
    if (page) app.voirPage(page)
  },

  /** La fenêtre Publier sur une séance du classeur (« Publier la séance… »,
   *  le menu d'une séance de la bibliothèque) */
  publierLaSeance(this: UI, id: string): void {
    void this.publication.ouvrir({ seance: id })
  },

  /** « Toutes les séances… » : la bibliothèque, ouverte sur sa vue « Séances » (ce chapitre d'abord) */
  toutesLesSeances(this: UI): void {
    this.ouvrirBibliotheque(this.menuSeances.bouton ?? this.boutonClasseur)
    this.bibliotheque?.ouvrirVueSeances()
  },

  /** Des fichiers glissés sur le tableau (.memc, .memb, ou .mem) : comme
   *  « Ouvrir un classeur » (plusieurs à la fois avec la bibliothèque ; sans
   *  elle, le premier, qui remplace le classeur ouvert) */
  ouvrirFichiers(this: UI, f: File[]): void {
    if (this.fichiers) void this.fichiers.ouvrir(f.map(fichier => ({ fichier })))
    else if (f[0]) void this.sauvegarde.ouvrirFichier(f[0])
  },
  /** La bibliothèque et ce classeur : Publier retrouve le dossier du chapitre et retient le dossier et le Drive choisis */
  brancherReplay(this: UI, registre: Registre, idClasseur: string): void { this.publication.lieu = { registre, idClasseur } },

  /** Les fichiers (lot 4 C9) : Ouvrir ajoute à la bibliothèque, et le
   *  conflit de la clé propose d'ouvrir son fichier */
  brancherFichiers(this: UI, f: Fichiers | null): void {
    this.fichiers = f
    if (f) this.inscrireActionEtat('ouvrir-cle', 'Ouvrir le fichier', () => void f.ouvrirLeFichierDeLaCle())
  },

  // ----- Copier en image (voir sorties/image.ts) -----
  /** Une page telle que le document la garde : son fond, son origine, ses formes */
  pageAPeindre(this: UI, id: string): PageAPeindre {
    const t = this.app.tableau
    return { fond: t.fondDe(id), origine: t.origineDe(id), formes: [...(t.formesDe(id)?.values() ?? [])] }
  },

  /** « Copier la page en image » (le menu de la page) ou « Copier en image »
   *  (le menu complet : ce qui est pris, les points liés aux images
   *  compris). Dans le geste : la copie part tout de suite. */
  copierEnImage(this: UI, quoi: 'page' | 'selection'): void {
    const app = this.app
    if (app.enLecture) return
    const id = app.page, numero = app.pages.indexOf(id) + 1
    if (quoi === 'selection') {
      const formes = app.objetsChoisis()
      if (!formes.length) return this.message('Rien n\'est sélectionné.')
      copierEnImage(this, { page: this.pageAPeindre(id), formes, nom: nomDeLImage(numero, null, true) })
      return
    }
    // Le point d'un simple toucher qui attend encore est de la page
    app.poserCeQuiAttend()
    this.copierPageEnImage(id)
  },

  /** La page entière en image (le menu de la page ; celui d'une vignette de
   *  la trieuse, qui reste ouverte) */
  copierPageEnImage(this: UI, id: string): void {
    const page = this.pageAPeindre(id)
    if (!page.formes.length) return this.message('La page est vide : rien à copier.')
    const numero = this.app.pages.indexOf(id) + 1
    // Une page plus haute que trois fois sa largeur : le message propose le
    // PDF, qui la découpe en feuilles A4 au lieu de la réduire
    copierEnImage(this, { page, nom: nomDeLImage(numero, this.app.tableau.nomDe(id), false), pdf: () => this.exporterPdf({ page: id }) })
  },

  // ----- Exporter en PDF (voir sorties/export-pdf.ts) -----
  /** La fenêtre « Exporter en PDF » : la page (le menu de la page, Ctrl + P ;
   *  elle propose aussi tout le classeur), les pages choisies dans la
   *  trieuse, ou tout le classeur (le menu ⋯, la trieuse). Pas pendant la
   *  revue ni une séance, ni par-dessus une autre fenêtre ; la trieuse
   *  reste ouverte et utilisable pendant l'export. */
  exporterPdf(this: UI, cible: CibleExport): void {
    const app = this.app
    if (app.enLecture || this.revue.ouvert || document.querySelector('dialog[open]')) return
    // Le point d'un simple toucher qui attend encore est de la page
    app.poserCeQuiAttend()
    this.fermerMenus()
    ouvrirFenetrePdf(this.hotePdf(), cible)
  },

  /** Ce que l'export lit du classeur : le document, l'ordre, le geste en cours, son nom */
  hotePdf(this: UI): HoteFenetrePdf {
    const app = this.app, t = app.tableau
    return {
      apercus: this.apercus,
      fondDe: p => t.fondDe(p),
      origineDe: p => t.origineDe(p),
      formesDe: p => t.formesDe(p)?.values() ?? [],
      nomDe: p => t.nomDe(p),
      // Le PDF d'une séance (lot 6) : celle qu'on regarde (la trieuse : celle du jour)
      pages: () => this.trieuse?.ouvert ? app.pagesDuJour : app.pages,
      // (« Toute la séance » quand le classeur en a d'autres ; une seule : c'est tout le classeur)
      toutLibelle: n => `${n < t.ordre.length ? 'Toute la séance' : 'Tout le classeur'} : ${pagesLisibles(n)}`,
      toutesLesPages: () => t.ordre.toArray(),
      enGeste: () => app.enGeste,
      classeur: () => app.classeur.nom,
      message: (texte, action) => this.message(texte, action),
      maj: () => this.maj(),
    }
  },

  // ----- Les séances (lot 6, voir seances-vue.ts) -----
  /** Une écriture sur une page d'une séance passée a été retenue : la
   *  question « Juste regarder / Reprendre et écrire » (une seule à la fois) */
  ecritureSurSeancePassee(this: UI, page: string): void {
    const s = this.app.tableau.seanceDe(page)
    if (!s || document.querySelector('dialog.dialogue-reprise')) return
    if (document.querySelector('dialog[open]')) { this.app.repondreSeancePassee(false); return }
    this.fermerMenus()
    void demanderReprise(this.racine, s).then(oui => this.app.repondreSeancePassee(oui))
  },

  /** Une séance commence : le bandeau « Reprendre » */
  seanceCommencee(this: UI, precedente: SeanceDuClasseur | null): void { this.bandeauxSeances.seanceCommencee(precedente) },

  /** « Renommer la séance… » (le menu ⋯) : la séance qu'on regarde */
  async renommerSeance(this: UI): Promise<void> {
    const s = this.app.seanceVue
    if (!s || document.querySelector('dialog[open]')) return
    const nom = await demanderNomDeSeance(this.racine, s)
    if (nom === null) return
    if (this.app.tableau.renommerSeance(s.id, nom || null)) this.message(nom ? `Séance renommée : « ${nom} »` : `Nom de la séance retiré : « ${libelleSeance({ debut: s.debut, nom: null })} »`)
    this.maj()
  },

  /** « Nouvelle séance » (le menu ⋯) */
  nouvelleSeance(this: UI): void {
    if (tableauCache(this.app) || document.querySelector('dialog[open]')) return
    this.app.nouvelleSeance()
    const s = this.app.seanceVue
    if (s) this.message(`Nouvelle séance : ${libelleSeance(s)}`)
  },

  // ----- Envoyer vers une autre page (voir pages/envoi.ts) -----
  /** « Envoyer vers… » (le menu complet) : la fenêtre des destinations, pour
   *  ce qui est pris, ou pour ces objets (ids : les images fixées en fond,
   *  depuis le menu de la page, lot 5). Pas quand le tableau est caché, ni
   *  par-dessus une autre fenêtre. */
  ouvrirEnvoi(this: UI, ids?: string[]): void {
    const app = this.app
    if (tableauCache(app) || document.querySelector('dialog[open]')) return
    app.poserCeQuiAttend()
    const n = (ids ? app.avecLeursPoints(ids) : app.objetsChoisis()).length
    if (!n) return this.message('Rien n\'est sélectionné.')
    ouvrirEnvoi({
      n, pages: app.pagesDuJour, page: app.page,
      nomDe: p => app.tableau.nomDe(p),
      vignette: (p, l, h) => this.vignettes.vignette(p, l, h),
      envoyer: (cible, deplacer) => { app.envoyerSelection(cible, deplacer, ids) },
      maj: () => this.maj(),
    })
  },

  /** Le menu de la page : un clic droit dans le vide (voir App.demanderOptions).
   *  Il se pose au point de l'appui, à sa droite et vers le bas comme le
   *  menu du système (de l'autre côté s'il n'y a pas la place), et se ferme
   *  comme les autres petits menus : Échap, un choix, ou un appui ailleurs
   *  (qui ne laisse pas d'encre). Coller ici, Tout sélectionner, Tout voir,
   *  ce qui ne se prend pas (lot 5 : l'image fixée en fond, à détacher,
   *  copier, envoyer ; Déverrouiller tout : voir sectionProtegee), puis ce qui
   *  touche la page elle-même (Dupliquer la page, Toutes les
   *  pages…), et ce qui en sort (Copier la page en image, Exporter la page
   *  en PDF…).
   *  m : le point du monde où « Coller ici »
   *  colle. Refait à chaque ouverture : la copie et la page ont pu changer.
   *  auClavier : ouvert par la touche Menu (voir App.menuAuClavier), le
   *  focus va à sa première entrée active. */
  ouvrirMenuPage(this: UI, x: number, y: number, m: P, auClavier = false): void {
    const app = this.app, el = this.menuPage.el
    el.replaceChildren()
    this.entreeMenu(el, 'Coller ici', () => app.coller(m), { touche: `${CTRL} + V`, inactif: !app.peutColler(),
      aide: `Le dernier objet copié dans MEM ; ${CTRL} + V colle aussi une image ou ce qu'on a copié dans une autre version de MEM` })
    // Grisé aussi quand tout ce qui est sur la page est verrouillé ou fixé en fond (lot 5)
    this.entreeMenu(el, 'Tout sélectionner', () => app.toutSelectionner(), { touche: `${CTRL} + A`, inactif: app.rienASelectionner() })
    this.entreeMenu(el, 'Tout voir', () => app.toutVoir(), { touche: 'Maj + 1' })
    this.sectionProtegee(el, m)
    // Une page d'une séance passée (lot 6) : la reprendre, ou en copier ce qui est pris
    if (app.enSeancePassee) {
      filetMenu(el)
      if (app.selection.size) this.entreeMenu(el, 'Copier dans la séance d\'aujourd\'hui', () => app.copierVersAujourdhui(), { action: 'copier-aujourdhui',
        aide: 'Sur la page du jour où vous étiez, à la même place' })
      this.entreeMenu(el, 'Reprendre la page', () => app.reprendrePage(app.page), { action: 'reprendre-page',
        aide: 'Une copie dans la séance du jour, telle qu\'elle est ici ; celle-ci ne change pas' })
      this.entreeMenu(el, 'Retour à aujourd\'hui', () => app.retourAujourdhui(), { action: 'retour-aujourdhui' })
    }
    // La page elle-même : Dupliquer la page · Toutes les pages… · ─ ·
    // Copier la page en image · Exporter la page en PDF…
    el.appendChild(Object.assign(document.createElement('hr'), { className: 'menu-filet' }))
    this.entreeMenu(el, 'Dupliquer la page', () => app.dupliquerLaPage(), { touche: `${CTRL} + Maj + D`,
      aide: 'Une copie juste après, avec toute son histoire (Revoir la montre se construire)' })
    // Ouverte au clavier (Entrée sur l'entrée), la trieuse rend le focus au compteur
    this.entreeMenu(el, 'Toutes les pages…', e => this.ouvrirTrieuse(e.detail === 0), { touche: 'Maj + P',
      aide: 'Les pages en vignettes : aller à une page, les ranger' })
    // Ce qui sort de la page : son image, pour l'ENT ou Pronote (pas de
    // raccourci : Ctrl + Maj + C ouvre l'inspecteur du navigateur), et son
    // PDF ; toutes deux grisées sur une page vide (tout le classeur reste à
    // portée : le menu ⋯, et Ctrl + P, dont la fenêtre propose les deux)
    el.appendChild(Object.assign(document.createElement('hr'), { className: 'menu-filet' }))
    this.entreeMenu(el, 'Copier la page en image', () => this.copierEnImage('page'), { inactif: app.pageVide(),
      aide: `Une image PNG, à coller dans l'ENT ou Pronote (${CTRL}+V)` })
    this.entreeMenu(el, 'Exporter la page en PDF…', () => this.exporterPdf({ page: app.page }), { touche: `${CTRL} + P`,
      inactif: app.pageVide(), aide: 'Cadrée sur son contenu, en feuilles A4 à imprimer' })
    ouvrirMenu(this.menuPage)
    placerMenu(el, new DOMRect(x, y, 0, 0), 'droite')
    if (auClavier) allerAuxEntrees(el, 1, ENTREES)
  },

  /** Ce que le menu de la page fait de ce qui ne se prend pas (lot 5), après
   *  un filet, s'il y en a. Les images fixées en fond : le clic droit (le
   *  bouton du stylet, l'appui long) sur l'une d'elles ouvre ce menu, comme
   *  dans le vide ; on y détache, copie ou envoie la plus haute de celles qui
   *  sont sous le pointeur, ou, à côté d'elles, toutes celles de la page (un
   *  professeur veut qu'un énoncé fixé survive à la copie et à l'envoi, et
   *  il ne peut ni le prendre ni le sélectionner). Puis « Déverrouiller
   *  tout », s'il y a des objets verrouillés (un réglage, comme Verrouiller). */
  sectionProtegee(this: UI, el: HTMLElement, m: P): void {
    const app = this.app
    const fixes = app.fixesDeLaPage(), verrous = app.verrouillesDeLaPage()
    if (!fixes.length && !verrous.length) return
    filetMenu(el)
    if (fixes.length) {
      const sous = app.fixesSous(m)
      const cible = sous.length ? [sous[0]] : fixes
      const ids = cible.map(f => f.id), plusieurs = cible.length > 1
      const aide = plusieurs ? `${cible.length} images fixées en fond sur cette page` : undefined
      this.entreeMenu(el, plusieurs ? 'Détacher le fond' : 'Détacher l\'image du fond', e => app.detacherDuFond(ids, pointeurDuClic(e, app.dernierPointeur)),
        { action: 'detacher-fond', aide: aide ?? 'Elle se prend et se déplace de nouveau' })
      this.entreeMenu(el, plusieurs ? 'Copier le fond' : 'Copier l\'image du fond', () => app.copierFond(ids),
        { action: 'copier-fond', aide: aide ?? `${CTRL}+V la colle ici ou ailleurs, fixée en fond` })
      this.entreeMenu(el, plusieurs ? 'Envoyer le fond vers…' : 'Envoyer l\'image du fond vers…', () => this.ouvrirEnvoi(ids),
        { action: 'envoyer-fond', aide: aide ?? 'La déplacer ou la copier sur une autre page, fixée en fond' })
    }
    if (verrous.length) {
      this.entreeMenu(el, 'Déverrouiller tout', () => app.verrouiller(false, verrous.map(f => f.id)), { action: 'deverrouiller-tout',
        aide: accorder(compterObjets(verrous), 'objet verrouillé sur cette page', 'objets verrouillés sur cette page') })
    }
  },
}
