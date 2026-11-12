// =============================================================
// L'APP : LES FORMULES, LES TEXTES, LA MOLETTE ET LE CLAVIER
// Des méthodes de la classe App (src/app.ts), rangées ici par sujet :
// elles s'ajoutent à la classe à la fin de app.ts (ajouterMethodes).
// =============================================================
import type { App } from '../app'
import { COULEURS } from '../app'
import { rotationDe } from '../geometrie'
import { fenetreModaleOuverte, lireMolette, tableauCache, toucheMarquePage, toucheMenu, toucheTenueEnGeste, toucheVerrou } from '../navigateur'
import { reglages } from '../reglages'
import { TAILLE_TEXTE, champsDuTexte, estTexte } from '../texte'
import { EditeurTexte } from '../texte-editeur'
import { CM, uid } from '../types'
import type { Formule, LigneTexte, Outil, TypeForme } from '../types'
import { quiBouge } from '../verrou'

export const methodesClavier = {
  // ---------- Formules ----------
  async nouvelleFormule(this: App, x: number, y: number, sx: number, sy: number): Promise<void> {
    const latex = await this.ui.editerFormule('', sx, sy)
    if (!latex) return
    this.tableau.nouveauGeste()
    this.tableau.poser(this.page, { id: uid(), type: 'formule', x, y, latex, couleur: this.couleur,
      taille: 28, z: Date.now(), auteur: this.tableau.moi })
  },

  /** L'éditeur d'une formule : son double-clic, « Modifier » de son menu
   *  (qui se ferme : l'éditeur prend sa place) */
  async modifierFormule(this: App, f: Formule): Promise<void> {
    if (estTexte(f)) { this.modifierTexte(f); return }
    if (this.enLecture) return
    if (this.options) { this.options = null; this.ui.maj() }
    const s = this.cam.versEcran(f.x, f.y)
    const latex = await this.ui.editerFormule(f.latex, s.x, s.y)
    if (latex === null) return
    this.tableau.nouveauGeste()
    if (latex === '') this.tableau.supprimer(this.page, [f.id])
    else this.tableau.modifier(this.page, [{ id: f.id, patch: { latex } }])
  },

  /** Un texte neuf, à cet endroit (son coin haut-gauche, monde) ; largeur :
   *  il passe à la ligne tout seul. Il ne se pose qu'à la fin (voir
   *  finirTexte), et seulement s'il n'est pas vide. */
  ouvrirTexte(this: App, o: { x: number; y: number; largeur?: number }): void {
    if (this.enLecture) return
    this.finirTexte()
    this.commencerEdition(null, { ...o, taille: TAILLE_TEXTE, couleur: this.couleur })
  },

  /** L'éditeur d'un texte posé : son double-clic, « Modifier » de son menu,
   *  un clic à l'outil Texte */
  modifierTexte(this: App, f: Formule): void {
    if (this.enLecture || !estTexte(f)) return
    this.finirTexte()
    if (this.options) { this.options = null; this.ui.maj() }
    this.selection.clear()
    this.commencerEdition(f, { x: f.x, y: f.y, largeur: f.largeur, taille: f.taille, couleur: f.couleur, rotation: rotationDe(f), lignes: f.texte })
  },

  commencerEdition(this: App, f: Formule | null, o: { x: number; y: number; largeur?: number; taille: number; couleur: string; rotation?: number; lignes?: LigneTexte[] }): void {
    const page = this.page
    const ed = new EditeurTexte({
      ...o, couleurs: COULEURS, couche: this.rendu.coucheEdition,
      rendreFormule: this.rendu.rendreFormule,
      fini: r => this.texteFini(r),
    })
    this.edition = { ed, page, f, x: o.x, y: o.y, largeur: o.largeur, couleur: o.couleur }
    this.rendu.enEdition = f?.id ?? null
    this.rendu.toutRedessiner(); this.ui.maj()
  },

  /** Finit le texte qu'on tape (garder : il se pose ; sinon, rien ne change) */
  finirTexte(this: App, garder = true): void { this.edition?.ed.finir(garder) },

  /** Le texte fini : posé, modifié, ou supprimé s'il est vide ; une seule
   *  étape d'annulation, et rien si rien n'a changé */
  texteFini(this: App, r: { lignes: LigneTexte[]; taille: number } | null): void {
    const e = this.edition
    if (!e) return
    this.edition = null
    this.rendu.enEdition = null
    const c = r ? champsDuTexte(r.lignes) : null
    if (r && e.f) {
      const avant = e.f
      if (!c) { this.tableau.nouveauGeste(); this.tableau.supprimer(e.page, [avant.id]) }
      else if (JSON.stringify(c.texte) !== JSON.stringify(avant.texte) || r.taille !== avant.taille) {
        this.tableau.nouveauGeste()
        this.tableau.modifier(e.page, [{ id: avant.id, patch: { texte: c.texte, latex: c.latex, taille: r.taille } }])
      }
    } else if (r && c) {
      const f: Formule = { id: uid(), type: 'formule', x: e.x, y: e.y, latex: c.latex, texte: c.texte, couleur: e.couleur,
        taille: r.taille, z: Date.now(), auteur: this.tableau.moi }
      if (e.largeur) f.largeur = e.largeur
      this.tableau.nouveauGeste()
      this.tableau.poser(e.page, f)
    }
    this.rendu.toutRedessiner(); this.ui.maj()
  },

  // ---------- Molette et clavier ----------
  /** La molette et le pavé tactile défilent ; Ctrl/⌘ + molette et le pincement
   *  zooment autour du pointeur ; le réglage « la molette zoome » rend à la
   *  molette d'une souris son zoom (voir lireMolette). */
  molette(this: App, e: WheelEvent): void {
    e.preventDefault()
    this.arreterAnimation()
    if (this.pinceSafari && e.ctrlKey) return      // Safari sur Mac zoome déjà par gesturechange
    const effet = lireMolette(e, this.rendu.h, reglages.molette)
    if ('zoom' in effet) {
      const s = this.ecran(e)
      this.cam.zoomerAutour(s.x, s.y, effet.zoom)
    } else this.cam.deplacer(effet.dx, effet.dy)
    this.vueChangee()
  },

  /** Pousse la sélection (et les points liés à une image choisie) de dx, dy
   *  (monde), aux flèches. Une rafale de poussées (une flèche tenue, des
   *  appuis rapprochés) fait UNE étape d'annulation, mais jamais avec ce qui
   *  l'a précédée : Ctrl+D, Ctrl+V ou une couleur choisie juste avant
   *  restent leur propre étape (sans cela, la pile de la page fondait la
   *  poussée dans l'étape d'avant, venue moins de 400 ms plus tôt, et Ctrl+Z
   *  défaisait les deux). La poussée prolonge la rafale seulement si
   *  l'étape du haut de la pile est encore celle que la poussée précédente a
   *  faite : rien d'autre n'a été écrit depuis (une écriture qui suit
   *  nouveauGeste ouvre une autre étape ; une annulation la retire). */
  pousser(this: App, dx: number, dy: number): void {
    const haut = () => { const u = this.tableau.annulationDe(this.page); return u ? u.undoStack[u.undoStack.length - 1] : undefined }
    const p = this.poussee
    // Ce qui est libre dans la sélection, et les points repérés sur une
    // image qui bouge, même verrouillés (voir quiBouge) ; rien d'autre
    const bougent = quiBouge(this.formes, this.selection)
    if (!bougent.length) return
    if (!p || p.page !== this.page || !p.etape || p.etape !== haut()) this.tableau.nouveauGeste()
    this.tableau.modifier(this.page, bougent.map(f => ({ id: f.id, patch: { x: f.x + dx, y: f.y + dy } })))
    this.poussee = { page: this.page, etape: haut() }
  },

  clavier(this: App, e: KeyboardEvent): void {
    if (this.enLecture) return
    const cible = e.target as HTMLElement
    // Dans une fenêtre (publier, formule…), les raccourcis du tableau se
    // taisent. Ctrl+D (⌘D) n'y écrit rien : on empêche seulement le
    // marque-page du navigateur, que le réflexe de dupliquer ouvrirait
    // par-dessus l'éditeur d'une formule ou le menu d'un sommet
    if (cible.closest('input, textarea, select, [contenteditable], dialog')) {
      if (toucheMarquePage(e)) e.preventDefault()
      return
    }
    // Une fenêtre modale ouverte dont le focus est tombé sur la page (le
    // bouton « Publier », désactivé pendant l'envoi, l'a perdu) : la touche
    // vient d'elle quand même. Échap la ferme (le navigateur le fait) sans
    // passer le tableau en Sélection, et aucune autre touche ne change le
    // tableau qu'elle couvre (le contrôle final du lot 4 : après Publier puis
    // Échap, le premier trait sélectionnait au lieu d'écrire)
    if (fenetreModaleOuverte()) {
      if (toucheMarquePage(e)) e.preventDefault()
      return
    }
    // La trieuse des pages couvre le tableau : plus aucune touche du tableau
    // (elle a les siennes). Après les champs de saisie : Ctrl + D dans le
    // champ du nom d'une page reste empêché, comme ailleurs.
    if (tableauCache(this)) return
    const ctrl = e.ctrlKey || e.metaKey
    // Le menu complet ouvert (clic droit, appui long, « Options ») ou le menu
    // d'un sommet : les flèches et Tab y mènent, Espace y appuie sur un
    // bouton (voir Interface.clavierMenu)
    if (this.ui.clavierMenu(e)) return
    if (e.code === 'Space') { this.espace = true; e.preventDefault(); return }
    // En plein geste (un objet qu'on glisse, un trait, un cadre ou un lasso,
    // la vue qu'on déplace), ce qui changerait la page ou la sélection ne
    // fait rien (voir toucheTenueEnGeste) : Suppr ou Ctrl+Z ôteraient l'objet
    // tenu, qu'un lâcher ne poserait plus ; Ctrl+A ou Ctrl+V changeraient ce
    // que le lâcher déplace. Le doigt retenu un instant (voir
    // ecrireOuRetenir) n'a encore rien fait.
    if (this.geste && this.geste.type !== 'retenu' && toucheTenueEnGeste(e, this.selection.size > 0)) { e.preventDefault(); return }
    // La touche Menu, Maj + F10 : le menu de la sélection, ou de la page
    if (toucheMenu(e)) { e.preventDefault(); this.menuAuClavier(); return }
    // Ctrl+Z, Ctrl+Y ou Ctrl+Maj+Z (⌘ sur Mac) : sur la page qu'on regarde
    // seulement. Rien à faire : un message le dit, pour qui pressait Ctrl+Z
    // en pensant reprendre ce qu'il venait de faire sur une autre page.
    const lettre = e.key.toLowerCase()
    if (ctrl && (lettre === 'z' || lettre === 'y')) {
      e.preventDefault()
      const refaire = lettre === 'y' || e.shiftKey
      if (refaire ? !this.retablir() : !this.annuler()) this.ui.message(refaire ? 'Rien à rétablir sur cette page' : 'Rien à annuler sur cette page')
      return
    }
    // Ctrl + Maj + D (⌘ + Maj + D) : dupliquer la page, avec son histoire.
    // La lettre par e.key, comme Ctrl + D (en AZERTY comme en QWERTY) ;
    // toujours empêché, sinon le navigateur marque tous les onglets. Ni dans
    // une fenêtre ouverte, ni une touche tenue (une copie par appui).
    if (ctrl && e.shiftKey && !e.altKey && lettre === 'd') {
      e.preventDefault()
      if (!e.repeat && !document.querySelector('dialog[open]')) this.dupliquerLaPage()
      return
    }
    // Ctrl + P (⌘ + P) : le réflexe de qui veut imprimer. Le navigateur
    // imprimerait la page web (les barres comprises, le tableau coupé au bord
    // de l'écran) : la fenêtre « Exporter en PDF » de la page s'ouvre, avec le
    // choix de tout le classeur. Ni une touche tenue, ni en plein geste (une
    // fenêtre ne s'ouvre pas sous un trait qu'on écrit) ; Ctrl + Maj + P
    // reste au navigateur.
    if (ctrl && !e.shiftKey && !e.altKey && lettre === 'p') {
      e.preventDefault()
      if (!e.repeat && !this.enGeste && !document.querySelector('dialog[open]')) this.ui.exporterPdf({ page: this.page })
      return
    }
    // Ctrl + G : grouper ; Ctrl + Maj + G : dégrouper (⌘ sur Mac ; lot 5,
    // les raccourcis habituels). La lettre par e.key, en
    // AZERTY comme en QWERTY ; toujours empêché, même quand il n'y a rien à
    // grouper (sinon la recherche du navigateur s'ouvre, ou « suivant »
    // dans la page) ; une fois par appui ; ni dans une fenêtre ouverte (les
    // champs de saisie se sont tus plus haut). AltGr n'en est pas un.
    if (ctrl && !e.altKey && lettre === 'g') {
      e.preventDefault()
      if (!e.repeat && !document.querySelector('dialog[open]')) { if (e.shiftKey) this.degrouper(); else this.grouper() }
      return
    }
    // Ctrl+A, C, X, V, D (⌘ sur Mac) : tout sélectionner, copier, couper,
    // coller, dupliquer. La lettre se lit par e.key : en AZERTY, la touche
    // marquée A a pour e.code « KeyQ ». AltGr (Ctrl+Alt sous Windows) n'en
    // est pas un. Ni dans une fenêtre ouverte (les champs de saisie se sont
    // déjà tus plus haut : on y copie du texte).
    // Pas en plein geste : voir plus haut.
    if (ctrl && !e.altKey && !e.shiftKey && !document.querySelector('dialog[open]')) {
      switch (lettre) {
        case 'a': e.preventDefault(); if (!e.repeat) this.toutSelectionner(); return
        // Rien de choisi : le navigateur fait sa copie ordinaire
        case 'c': if (e.repeat) { e.preventDefault(); return } if (this.copier()) e.preventDefault(); return
        case 'x': if (e.repeat) { e.preventDefault(); return } if (this.couper()) e.preventDefault(); return
        // Toujours empêché : sinon le navigateur ajoute un marque-page
        case 'd': e.preventDefault(); this.dupliquerSelection(); return
        // L'événement paste suit (voir surColler) : on ne l'empêche pas. Un
        // navigateur qui ne le donne pas hors d'un champ de saisie colle tout
        // de même la copie gardée, un instant après (paste, s'il vient, passe
        // avant, dans la même tâche que la touche)
        case 'v':
          clearTimeout(this.collageAttendu)
          this.collageAttendu = window.setTimeout(() => { this.collageAttendu = 0; this.coller() }, 200)
          return
      }
    }
    if (e.key === 'Delete' || e.key === 'Backspace') { this.supprimerSelection(); return }
    // Page↓ sur la dernière page ne crée rien, et le dit (voir dernierePage)
    if (e.key === 'PageDown') { if (!this.pageSuivante(1) && this.pages.length) this.dernierePage(); return }
    if (e.key === 'PageUp') { this.pageSuivante(-1); return }
    if (e.key === 'Enter' && this.rognage) { this.finirRognage(true); return }
    if (e.key === 'Enter' && this.polyEnCours) { this.finirPolygone(false); return }
    if (e.key === 'Escape') { this.echap(); return }
    // L'ordre au clavier, comme Google Slides et les dessins de Docs :
    // Ctrl + ↑ / ↓ avance, recule ce qui est sélectionné ; avec Maj, premier
    // plan, arrière-plan (⌘ sur Mac, où Ctrl + ↑ est Mission Control et
    // n'arrive pas). Pas [ et ] : en AZERTY ils demandent AltGr, que
    // Windows envoie comme Ctrl + Alt. Jamais avec Alt ; une fois par appui
    // (une touche tenue ne fait rien de plus). Le menu complet ouvert ne les
    // prend pas (voir Interface.clavierMenu) : elles marchent menu ouvert.
    if (ctrl && !e.altKey && (e.key === 'ArrowUp' || e.key === 'ArrowDown') && this.selection.size) {
      e.preventDefault()
      const haut = e.key === 'ArrowUp'
      if (!e.repeat && !document.querySelector('dialog[open]')) this.ordonner(haut ? (e.shiftKey ? 'premier' : 'avancer') : (e.shiftKey ? 'arriere' : 'reculer'))
      return
    }
    // ⌘ + ← (Mac) et Alt + ← (Windows) reviennent à la page précédente du
    // navigateur (Alt + →, à la suivante) : en plein cours, on quitterait le
    // tableau. Hors des champs et des fenêtres (filtrés plus haut), avec ou
    // sans sélection, elles ne font rien, ni Ctrl + ← / → (qui poussaient
    // l'objet comme une flèche seule)
    if ((ctrl || e.altKey) && (e.key === 'ArrowLeft' || e.key === 'ArrowRight')) { e.preventDefault(); return }
    // Les flèches poussent la sélection : 1 mm, ou 1 cm avec Maj. Seules :
    // ni avec Ctrl, ⌘ (l'ordre, ci-dessus) ni avec Alt
    const fleches: Record<string, [number, number]> = { ArrowLeft: [-1, 0], ArrowRight: [1, 0], ArrowUp: [0, -1], ArrowDown: [0, 1] }
    if (fleches[e.key] && this.selection.size && !ctrl && !e.altKey) {
      e.preventDefault()
      const k = e.shiftKey ? CM : CM / 10, [dx, dy] = fleches[e.key]
      this.pousser(dx * k, dy * k)
      return
    }
    // Sans sélection, elles déplacent la vue : → montre ce qui est à droite.
    // Un quart de ce qu'on voit (trois quarts avec Maj), en douceur ; touche
    // tenue, un douzième à chaque répétition, tout de suite (sinon la vue
    // filerait à sept écrans par seconde)
    if (fleches[e.key] && !ctrl && !e.altKey) {
      e.preventDefault()
      const r = this.ui.zoneLibre(), [sx, sy] = fleches[e.key]
      const part = (e.shiftKey ? 3 / 4 : 1 / 4) / (e.repeat ? 3 : 1)
      const dx = sx * r.l * part, dy = sy * r.h * part
      if (e.repeat) { this.arreterAnimation(); this.cam.deplacer(-dx, -dy); this.vueChangee(); return }
      // Un appui pendant le glissement du précédent part de là où il allait
      const depart = this.cible ?? { x: this.cam.x, y: this.cam.y, z: this.cam.z }
      this.allerVers({ x: depart.x - dx, y: depart.y - dy, z: depart.z }, 150)
      return
    }
    // Maj + 1 : tout voir ; Maj + 2 : voir la sélection. Par la touche (e.code) :
    // en AZERTY, Maj + 1 donne « 1 », en QWERTY « ! »
    if (e.shiftKey && !ctrl && !e.altKey && (e.code === 'Digit1' || e.code === 'Digit2')) {
      e.preventDefault()
      if (e.code === 'Digit1') this.toutVoir(); else this.voirSelection()
      return
    }
    // Maj + P : la trieuse des pages (la lettre par e.key, en AZERTY comme en
    // QWERTY) ; P seul reste le Stylo, et Maj + P ne le choisit jamais
    if (e.shiftKey && !ctrl && !e.altKey && lettre === 'p') {
      e.preventDefault()
      if (!e.repeat) this.ui.ouvrirTrieuse(true)
      return
    }
    // Maj + L (lot 5) : verrouiller ce qui est sélectionné, ou
    // le déverrouiller (une sélection verrouillée : son menu est ouvert). Une
    // fois par appui ; sans rien de sélectionné, la lettre reste le Segment,
    // comme avant (on ne retire rien à qui la tapait). En plein geste, elle ne
    // fait rien (voir toucheTenueEnGeste, plus haut).
    if (toucheVerrou(e) && this.selection.size) {
      e.preventDefault()
      if (!e.repeat && !document.querySelector('dialog[open]')) this.basculerVerrou()
      return
    }
    // « ? » : l'aide et les raccourcis (Maj + virgule en AZERTY, Maj + / en QWERTY)
    if (e.key === '?' && !ctrl && !e.altKey) {
      e.preventDefault()
      if (!e.repeat) this.ui.ouvrirAide()
      return
    }
    if (ctrl) return
    const raccourcis: Record<string, Outil> = { p: 'stylo', h: 'surligneur', e: 'gomme', x: 'point', l: 'segment', f: 'formule', t: 'texte', v: 'selection' }
    const formes: Record<string, TypeForme> = { r: 'rectangle', c: 'cercle', g: 'polygone' }
    const k = e.key.toLowerCase()
    // N : la page en mode nuit, ou de nouveau de jour (une fois par appui)
    if (k === 'n' && !e.shiftKey && !e.altKey) { if (!e.repeat) this.basculerNuit(); return }
    if (formes[k]) { this.typeForme = formes[k]; this.choisirOutil('forme'); return }
    const o = raccourcis[k]
    // E quand la Gomme est déjà en main (lot 5) : ses options, au clavier
    if (o === 'gomme' && this.outil === 'gomme') { if (!e.repeat) this.ui.ouvrirMenuGomme(true); return }
    if (o) this.choisirOutil(o)
  },
}
