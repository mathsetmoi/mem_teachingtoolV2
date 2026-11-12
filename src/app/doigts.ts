// =============================================================
// L'APP : L'APPUI LONG, LES DOIGTS, LE DOUBLE-CLIC, LE MODE « AJOUTER »
// Des méthodes de la classe App (src/app.ts), rangées ici par sujet :
// elles s'ajoutent à la classe à la fin de app.ts (ajouterMethodes).
// =============================================================
import type { App } from '../app'
import { cadreDuTexte, heureDe } from '../app'
import type { Coupe, DoigtPose, Geste, Prise } from '../app'
import { aimanterAngle, curseurPoignee, deroule, estIdentite, matriceTaille, quartDeTour, rotation, texteRotation, texteTaille } from '../cadre'
import { reconnaitre, versRelatif } from '../formes'
import type { P } from '../formes'
import { chevauche, dansLasso, englobante, partDedans, rectangle, simplifier, touche } from '../geometrie'
import type { Cible } from '../geometrie'
import { GRAND_MORCEAU, LONG_MORCEAU, boutsDe, couperTrait, lePlusLong } from '../gomme'
import { groupeExact, priseDuClic } from '../groupes'
import type { NomInstrument, Partie } from '../instruments'
import { CTRL } from '../navigateur'
import { APPUI_LONG, DOUBLE_CLIC_PLUME, DOUBLE_TOUCHER, POIGNEE, SEUIL_GLISSER, doubleToucher, ecranTactile, messageReconnue, messageSecondPoint, nouveauDepart, procheDuPremier, typePointeur } from '../pointeurs'
import type { ToucherReconnu } from '../pointeurs'
import { rayonGomme, reglages } from '../reglages'
import type { TraitDirect } from '../rendu'
import { boiteDe } from '../revoir/bobine'
import type { Boite } from '../revoir/bobine'
import { tempsDesPoints } from '../revoir/main-levee'
import { coinsGardes, curseurRognage, priseRognage } from '../rognage'
import { LARGEUR_MIN, TAILLE_TEXTE, estTexte } from '../texte'
import { libre, uid } from '../types'
import type { Figure, Forme, Trait } from '../types'
import { quiBouge } from '../verrou'

export const methodesDoigts = {
  // ---------- L'appui long ----------
  /** Un appui tenu APPUI_LONG ms sans glisser ouvrira le menu complet de ce
   *  qui est dessous (le menu de la page dans le vide), comme un clic droit.
   *  Au doigt : à l'outil Sélection (quel que soit le rôle du doigt), et au
   *  doigt qui « déplace » sous n'importe quel outil. Au stylet : seulement
   *  posé sur l'écran lui-même (iPad, Surface, tablette Android) et à la
   *  Sélection ; celui d'une tablette graphique a son bouton, et un stylet
   *  qui marque un temps sur un objet avant de le glisser ne doit pas ouvrir
   *  de menu. Jamais au Stylo ni au Surligneur (un point qu'on tient, une
   *  lettre qu'on commence), ni quand un clic est attendu ; et seulement sur
   *  un appui qui prend, déplace ou entoure (pas sur un instrument, un
   *  sommet, un trait qu'on tire). Notre propre minuterie : l'iPad n'envoie
   *  pas de contextmenu, et celui d'Android ou de Windows n'ouvre plus rien. */
  armerAppuiLong(this: App, e: PointerEvent): void {
    const g = this.geste
    if (!g || this.placement || this.enLecture || this.depart.pointeur !== e.pointerId) return
    const doigt = e.pointerType === 'touch' && (this.outil === 'selection' || this.doigtDeplace)
    const stylet = e.pointerType === 'pen' && this.outil === 'selection' && ecranTactile()
    if (!doigt && !stylet) return
    if (!(g.type === 'deplacer' && !g.bouge) && g.type !== 'zone' && !(g.type === 'pan' && (g.toucher || this.outil === 'main'))) return
    this.desarmerAppuiLong()
    this.appuiLong = { pointeur: e.pointerId, clientX: e.clientX, clientY: e.clientY, type: typePointeur(e.pointerType),
      minuterie: window.setTimeout(() => this.appuiLongEchu(), APPUI_LONG) }
  },

  /** L'appui a glissé, s'est levé, un autre s'est posé : pas d'appui long */
  desarmerAppuiLong(this: App): void {
    if (!this.appuiLong) return
    clearTimeout(this.appuiLong.minuterie)
    this.appuiLong = null
  },

  /** L'appui long : le geste commencé s'abandonne sans rien laisser (l'objet
   *  revient à sa place, le lasso s'efface), le pointeur ne compte plus
   *  jusqu'à son lever (qui ne désélectionne rien et ne prend rien), une
   *  petite vibration le dit sous le doigt, et le menu s'ouvre (voir
   *  demanderOptions), comme au clic droit. */
  appuiLongEchu(this: App): void {
    const a = this.appuiLong
    this.appuiLong = null
    if (!a || !this.geste || this.depart.pointeur !== a.pointeur) return
    this.abandonnerGeste()
    this.pointeurs.delete(a.pointeur); this.ignores.add(a.pointeur)
    this.toucherDoigts.oublier()
    this.toucherPrecedent = null; this.doubleEnCours = null
    try { navigator.vibrate?.(10) } catch { /* pas de vibreur */ }
    this.clicApresAppuiLong = { pointeur: a.pointeur, leve: 0 }
    this.demanderOptions({ clientX: a.clientX, clientY: a.clientY }, a.type)
    this.ui.maj()
  },

  // ---------- Le toucher à deux ou trois doigts ----------
  /** Un toucher bref à deux doigts annule le dernier geste de la page qu'on
   *  regarde, à trois il le rétablit (voir TOUCHER_DOIGTS, reconnu par
   *  ToucherADoigts au lever du dernier doigt), comme Ctrl+Z et Ctrl+Y. Un
   *  message bref le dit. La page jetée que ↶ ramène le dit elle-même (« Page
   *  N rétablie »). Coupé dans le menu du doigt (reglages.gestes). Le doigt
   *  qui dessinait a déjà perdu son trait quand le second s'est posé (le
   *  pincement le jette) ; l'objet que le premier doigt a pris à la Sélection
   *  est relâché par annuler() et retablir(), qui vident la sélection. */
  gesteDesDoigts(this: App, r: ToucherReconnu): void {
    if (!reglages.gestes || this.enLecture) return
    if (r === 'annuler') {
      const fait = this.annuler()
      if (fait === true) this.ui.message('Annulé')
      else if (!fait) this.ui.message('Rien à annuler sur cette page')
    } else {
      const fait = this.retablir()
      if (fait !== 'dit') this.ui.message(fait ? 'Rétabli' : 'Rien à rétablir sur cette page')
    }
  },

  /** Un coup de gomme : à l'outil Gomme, ou au bout gomme du stylet (le
   *  curseur et le cercle de la gomme le temps du geste, puis l'outil d'avant,
   *  qui n'a jamais changé). Tout le coup ne fait qu'une étape d'annulation,
   *  même lent ; le film garde une étape par trait effacé. La gomme suit le
   *  réglage de l'appareil (lot 5, reglages.gomme), le bout gomme du stylet
   *  aussi : le trait entier (comme toujours), ou seulement là où elle passe
   *  (zone : voir gommerLa). */
  commencerGomme(this: App, m: P, stylet: boolean): void {
    const zone = reglages.gomme === 'zone'
    const g: Geste = { type: 'gomme', effaces: new Set(), stylet: stylet || undefined, zone: zone ? { dernier: m, traits: new Map() } : undefined }
    this.geste = g
    if (stylet) { this.zone.dataset.outil = 'gomme'; this.zone.style.cursor = '' }
    this.tableau.gesteLong()
    this.rendu.gomme = { x: m.x, y: m.y, r: rayonGomme(zone ? 'zone' : 'trait') / this.cam.z }
    if (g.zone) this.gommerLa(g.zone, [m])
    else this.gommer(m.x, m.y, g.effaces)
    this.rendu.redessinerDirect()
  },

  /** La fin d'un coup de gomme (le lever, un geste abandonné : un second
   *  doigt, le navigateur qui le coupe) : ce que la gomme qui efface là où
   *  elle passe coupait encore s'écrit (ce qu'on a vu effacé reste effacé),
   *  et la scène se repeint entière ; puis le coup devient UNE étape
   *  d'annulation. */
  finirGomme(this: App, g: Extract<Geste, { type: 'gomme' }>): void {
    if (g.zone) {
      for (const id of [...g.zone.traits.keys()]) this.ecrireCoupe(g.zone, id)
      this.rendu.coupe = null
      this.rendu.toutRedessiner()
    }
    this.tableau.finGesteLong()
    if (!g.stylet) return
    this.zone.dataset.outil = this.outil
    if (this.outil !== 'gomme') { this.rendu.gomme = null; this.rendu.redessinerDirect() }
  },

  /** La gomme qui efface là où elle passe (lot 5) a glissé jusqu'à ces
   *  points (monde : ceux d'un mouvement, ses événements fusionnés compris).
   *  Entre deux points, la capsule du segment parcouru coupe chaque trait
   *  libre à main levée qu'elle touche (voir couperTrait) : ses morceaux du
   *  moment, en mémoire ; l'encre disparaît sous la gomme sans que rien ne
   *  s'écrive. Un trait que la gomme a quitté (son cercle hors de la boîte
   *  du trait agrandie de son rayon) s'écrit alors, en une étape du film
   *  (voir ecrireCoupe) : au plus une écriture par trait touché, jamais une
   *  par mouvement (un instantané par mouvement ferait grossir le classeur
   *  de centaines de Ko par coup). Les figures, les images, les formules ne
   *  sont pas touchées : la première fois de la session que la gomme passe
   *  sur l'une d'elles, un message le dit. Ce qui est verrouillé ou fixé en
   *  fond non plus. Seul le rectangle sale se repeint (voir
   *  Rendu.repeindreZone) : là où la gomme est passée, et chaque morceau
   *  neuf en entier (un long morceau, à ses bouts : voir neuf). */
  gommerLa(this: App, z: Coupe, points: P[]): void {
    const r = rayonGomme('zone') / this.cam.z
    let x1 = Infinity, y1 = Infinity, x2 = -Infinity, y2 = -Infinity, epais = 0
    const salir = (q: Boite) => { x1 = Math.min(x1, q.x); y1 = Math.min(y1, q.y); x2 = Math.max(x2, q.x + q.l); y2 = Math.max(y2, q.y + q.h) }
    /** Un morceau neuf (ce qui reste d'un trait, ou d'un morceau, que la
     *  gomme vient de couper) : perfect-freehand le lisse depuis son début
     *  (sa pression simulée, l'espacement de son contour, les premières
     *  unités qu'il saute) jusqu'à sa fin (ses dernières unités, son bout
     *  rond) ; coupé à un bout, tout son contour peut bouger d'une fraction
     *  de pixel. Il se repeint en entier : un mot, une lettre, c'est peu. Un
     *  long morceau (une spirale, des hachures, une écriture liée : voir
     *  gomme.ts), ou grand à l'écran, seulement aux bouts que la gomme a
     *  changés ; le reste attend que la gomme quitte le trait (ecrireCoupe)
     *  ou le lever, où la scène se repeint entière. Le repeindre en entier à
     *  chaque mouvement faisait traîner la gomme derrière la plume (la
     *  vérification du lot 5). */
    const neuf = (k: Trait, de: Trait) => {
      const q = boiteDe(k)
      if (!q) return
      if (k.pts.length > 3 * LONG_MORCEAU || Math.max(q.l, q.h) * this.cam.z > GRAND_MORCEAU) { for (const b of boutsDe(k, de)) salir(b); return }
      salir(q)
    }
    // Les traits que ce mouvement peut toucher, choisis une fois pour tous
    // ses points (une plume en envoie plusieurs par image d'écran)
    let gx1 = z.dernier.x, gy1 = z.dernier.y, gx2 = gx1, gy2 = gy1
    for (const q of points) { gx1 = Math.min(gx1, q.x); gy1 = Math.min(gy1, q.y); gx2 = Math.max(gx2, q.x); gy2 = Math.max(gy2, q.y) }
    const tout = { x: gx1 - r, y: gy1 - r, l: gx2 - gx1 + 2 * r, h: gy2 - gy1 + 2 * r }
    const proches: Trait[] = []
    for (const f of this.formes) {
      if (f.type !== 'trait' || (this.nonLibres && !libre(f))) continue
      const bf = this.boiteDeForme(f)
      if (bf && chevauche(bf, tout)) proches.push(f)
    }
    for (const b of points) {
      const a = z.dernier
      z.dernier = b
      const cap = { x: Math.min(a.x, b.x) - r, y: Math.min(a.y, b.y) - r, l: Math.abs(b.x - a.x) + 2 * r, h: Math.abs(b.y - a.y) + 2 * r }
      let coupe = false
      // Les traits déjà coupés pendant ce coup : leurs morceaux du moment
      for (const [id, c] of z.traits) {
        if (!chevauche(c.boite, cap)) continue
        let change = false
        const suite: Trait[] = []
        for (const m of c.morceaux) {
          const k = couperTrait(m, a, b, r)
          if (k === null) { suite.push(m); continue }
          change = true
          for (const x of k) { if (x.id !== m.id) x.id = id + '~' + c.n++; neuf(x, m) }
          suite.push(...k)
        }
        if (change) { c.morceaux = suite; coupe = true; epais = Math.max(epais, c.taille) }
      }
      // Les traits que la gomme touche pour la première fois
      for (const f of proches) {
        if (z.traits.has(f.id)) continue
        const bf = this.boiteDeForme(f)
        if (!bf || !chevauche(bf, cap)) continue
        const k = couperTrait(f, a, b, r)
        if (k === null) continue
        const c = { morceaux: k, n: 0, boite: bf, taille: f.taille }
        for (const x of k) { x.id = f.id + '~' + c.n++; neuf(x, f) }
        z.traits.set(f.id, c)
        coupe = true; epais = Math.max(epais, f.taille)
      }
      if (coupe) salir(cap)
      // Une figure, une image, une formule sous la gomme : elle n'y touche
      // pas, et le dit une fois
      if (!this.astuceGommeZone && this.formes.some(f => f.type !== 'trait' && libre(f) && touche(f, b.x, b.y, r, this.boiteTouche))) {
        this.astuceGommeZone = true
        this.ui.message('Cette gomme ne coupe que l\'écriture : pour une figure ou une formule, prenez « Effacer le trait entier » (retapez la Gomme). Une image s\'enlève par Supprimer.')
      }
    }
    // Ce que la gomme a quitté s'écrit (la scène, qui le montre déjà, ne se
    // repeint pas pour autant : voir rafraichir)
    const p = z.dernier
    for (const [id, c] of [...z.traits]) {
      const b = c.boite, m = 2 * r
      if (p.x < b.x - m || p.x > b.x + b.l + m || p.y < b.y - m || p.y > b.y + b.h + m) this.ecrireCoupe(z, id)
    }
    this.montrerCoupe(z)
    // Le rectangle sale : les capsules du mouvement et les morceaux neufs,
    // agrandis de la plus grande épaisseur des traits coupés (leur encre
    // déborde leurs points)
    if (x1 < Infinity) this.rendu.repeindreZone({ x: x1 - epais, y: y1 - epais, l: x2 - x1 + 2 * epais, h: y2 - y1 + 2 * epais })
  },

  /** La coupe d'un trait s'écrit (Tableau.couperTraits : une étape du
   *  film, notée coupe ; l'étape d'annulation est celle du coup, voir
   *  gesteLong) : le plus long morceau garde l'identifiant du trait, les
   *  autres en reçoivent un neuf. Il n'est plus « en cours » : ce que la
   *  gomme y coupera encore partira d'une nouvelle coupe. */
  ecrireCoupe(this: App, z: Coupe, id: string): void {
    const c = z.traits.get(id)
    if (!c) return
    z.traits.delete(id)
    const long = lePlusLong(c.morceaux)
    const morceaux = c.morceaux.map((m, k) => ({ ...m, id: k === long ? id : uid() }))
    this.coupeEcrite = true
    try { this.tableau.couperTraits(this.page, [{ id, morceaux }]) } finally { this.coupeEcrite = false }
    this.montrerCoupe(z)
    // Un long morceau ne s'est repeint qu'à ses bouts pendant le coup (voir
    // gommerLa), et redessiné par fenêtres : la gomme l'a quitté, son
    // contour exact se peint maintenant, une fois. (Un grand morceau de peu
    // de points, aux points espacés, a déjà le sien hors de ses bouts.)
    let x1 = Infinity, y1 = Infinity, x2 = -Infinity, y2 = -Infinity, borne = false
    for (const m of morceaux) {
      const b = boiteDe(m)
      if (!b) continue
      x1 = Math.min(x1, b.x); y1 = Math.min(y1, b.y); x2 = Math.max(x2, b.x + b.l); y2 = Math.max(y2, b.y + b.h)
      if (m.pts.length > 3 * LONG_MORCEAU) borne = true
    }
    if (borne) this.rendu.repeindreZone({ x: x1, y: y1, l: x2 - x1, h: y2 - y1 })
  },

  /** Ce que le rendu montre du coup en cours : les traits coupés cachés, et
   *  leurs morceaux à leur place */
  montrerCoupe(this: App, z: Coupe): void {
    if (!z.traits.size) { this.rendu.coupe = null; return }
    const morceaux: Trait[] = []
    for (const c of z.traits.values()) morceaux.push(...c.morceaux)
    this.rendu.coupe = { caches: new Set(z.traits.keys()), morceaux }
  },

  // ---------- Le double-clic au Stylo ----------
  /** Un simple toucher du Stylo (ou du Surligneur) sur une figure ou une
   *  formule : son point d'encre attend 300 ms avant d'être posé (dessiné en
   *  attendant). Un second toucher tout près en fait peut-être un double-clic
   *  (voir secondClic) ; sinon il se pose à l'échéance, ou dès qu'autre chose
   *  arrive (viderPointEnAttente). Son rythme, pour le film, est celui du
   *  toucher, compté jusqu'au lever, et son heure celle du lever. */
  mettreEnAttente(this: App, objet: string): void {
    const t = this.rendu.monTrait, heures = this.heuresDuTrait
    this.heuresDuTrait = []
    this.rendu.monTrait = null
    const trait = t ? this.traitDe(t) : null
    if (!t || !trait) { this.rendu.redessinerDirect(); return }
    const ms = heures.length * 3 === t.pts.length ? tempsDesPoints(heures, performance.now()) : []
    this.rendu.enAttente = t
    this.pointEnAttente = { trait, ms, heure: Date.now(), page: this.page, objet, x: this.depart.x, y: this.depart.y,
      minuterie: window.setTimeout(() => this.viderPointEnAttente(), DOUBLE_CLIC_PLUME.ms) }
    this.rendu.redessinerDirect()
  },

  /** Un appui pendant que le point du premier toucher attend : est-ce peut-être
   *  le second toucher d'un double-clic ? Il faut le bouton principal, la même
   *  page, une plume qui écrit (ni le doigt « qui déplace », ni le bout gomme,
   *  ni un clic attendu) et le rayon du double-clic (voir DOUBLE_CLIC_PLUME).
   *  Alors le point attend encore, le temps de ce toucher : levé vite et sans
   *  avoir glissé, c'est le double-clic (voir haut) ; sinon les deux points
   *  sont posés, l'un après l'autre. */
  secondClic(this: App, e: PointerEvent, s: P, autre: boolean): boolean {
    const a = this.pointEnAttente
    if (!a || autre || e.button !== 0 || a.page !== this.page || this.placement) return false
    if (this.outil !== 'stylo' && this.outil !== 'surligneur') return false
    if (!procheDuPremier(a, s.x, s.y, typePointeur(e.pointerType))) return false
    clearTimeout(a.minuterie)
    a.minuterie = window.setTimeout(() => this.viderPointEnAttente(), DOUBLE_CLIC_PLUME.duree)
    return true
  },

  /** Le double-clic au Stylo, au lever de son second toucher : ni l'un ni
   *  l'autre point ne se pose, et l'objet ouvre ses options (une formule se
   *  modifie) */
  doubleClicPlume(this: App): void {
    const a = this.pointEnAttente
    if (!a) return
    clearTimeout(a.minuterie)
    this.pointEnAttente = null
    this.rendu.enAttente = null
    this.rendu.monTrait = null; this.heuresDuTrait = []
    this.rendu.redessinerDirect()
    this.ouvrirParDouble(a.objet)
  },

  /** Le second toucher d'un double appui au doigt : moins de 300 ms après le
   *  lever du premier, à moins de 35 px, sur le même objet. Il fait d'abord
   *  ce que fait tout toucher (glissé, il déplace l'objet ou la vue) ; levé
   *  sans avoir glissé, il ouvre les options de l'objet (voir ouvrirParDouble),
   *  comme le double-clic à la souris, que Safari ne donne pas au doigt. Tout
   *  autre appui oublie le premier toucher. */
  secondToucher(this: App, e: PointerEvent, s: P, m: P): void {
    const a = this.toucherPrecedent
    this.toucherPrecedent = null
    this.doubleEnCours = null
    if (!a || e.pointerType !== 'touch' || e.button !== 0 || a.page !== this.page) return
    if (this.outil !== 'selection' && !this.doigtDeplace) return
    if (!doubleToucher(a, s.x, s.y, performance.now())) return
    const f = this.objetSous(m, s, { pointeur: 'touch', dedans: true })
    if (f && f.id === a.objet) this.doubleEnCours = { objet: f.id, pointeur: e.pointerId }
  },

  /** Le double appui au doigt, au lever du second toucher : le menu complet
   *  de l'objet (une formule se modifie ; un objet d'une sélection de
   *  plusieurs ouvre leur menu commun ; un membre d'un groupe, le menu du
   *  groupe : voir ouvrirAuDouble). Le dblclick du navigateur, s'il
   *  suit, ne refait rien, ni le clic qu'il tire du toucher (voir brancherGestes). */
  ouvrirParDouble(this: App, id: string): void {
    const f = this.forme(id)
    if (!f) return
    this.doubleTraite = performance.now(); this.clicFantome = true
    this.ouvrirAuDouble(f, true)
  },

  /** Ce qu'ouvrent le double-clic et le double appui sur f (un seul sens par
   *  geste) : dans une sélection de plusieurs qui n'est pas son seul groupe,
   *  leur menu commun ; une formule, son éditeur, même membre d'un groupe
   *  (elle devient la sélection, prise seule dans son groupe) ; un autre
   *  membre d'un groupe, le menu commun du groupe, qui redevient la
   *  sélection, quel qu'ait été l'effet du second clic qui précède le
   *  double-clic (il venait de ne prendre que ce membre) ; sinon, avec
   *  menu (l'outil Sélection, la Main, le Segment, le Stylo), le menu
   *  complet de l'objet. Pour prendre un objet dans un groupe, c'est un
   *  second clic SIMPLE (voir bas). */
  ouvrirAuDouble(this: App, f: Forme, menu: boolean): void {
    clearTimeout(this.minuterieMembre)
    const m = this.membres(f)
    const sonGroupe = m.length > 1 && m.length === this.selection.size && m.every(g => this.selection.has(g.id))
    if (this.selection.size > 1 && this.selection.has(f.id) && !sonGroupe) return this.ouvrirOptionsSelection()
    if (f.type === 'formule') {
      if (estTexte(f)) { this.modifierTexte(f); return }
      if (m.length > 1) this.selectionner(f.id)
      this.modifierFormule(f)
      return
    }
    if (!menu) return
    if (m.length > 1) return this.ouvrirOptionsGroupe(m)
    this.ouvrirOptions(f)
  },

  /** Un simple toucher du doigt sur un objet, bref (moins de 300 ms) et levé
   *  sans avoir glissé : un second peut suivre (voir secondToucher) */
  noterToucher(this: App, e: PointerEvent, g: Geste, glisse: boolean, m: P): void {
    if (e.pointerType !== 'touch' || glisse || this.placement || (this.outil !== 'selection' && !this.doigtDeplace)) return
    // Un appui de la Sélection qui touchait sans saisir prend son candidat à
    // son lever : c'est aussi un premier toucher
    if (g.type !== 'deplacer' && !(g.type === 'pan' && g.toucher) && !(g.type === 'zone' && g.candidat)) return
    if (performance.now() - this.depart.t >= DOUBLE_TOUCHER.ms) return
    const s = this.ecran(e)
    const f = this.objetSous(m, s, { pointeur: 'touch', dedans: true })
    if (!f) return
    this.toucherPrecedent = { x: s.x, y: s.y, t: performance.now(), objet: f.id, page: this.page }
  },

  /** Le point d'encre en attente se pose maintenant, sur sa page, à l'heure
   *  de son lever. Il fait sa propre étape d'annulation : ce qui suit (le
   *  trait du second toucher, posé aussitôt) en fait une autre. */
  viderPointEnAttente(this: App): void {
    const a = this.pointEnAttente
    if (!a) return
    clearTimeout(a.minuterie)
    this.pointEnAttente = null
    this.rendu.enAttente = null
    this.tableau.nouveauGeste()
    this.tableau.poserTrace(a.page, a.trait, a.ms, a.heure)
    this.tableau.nouveauGeste()
    this.rendu.redessinerDirect()
  },

  /** Un simple toucher du doigt « qui déplace » : l'objet touché (à 20 px
   *  de son tracé, par un morceau ou par son intérieur, voir cibleSous)
   *  devient la sélection, seul, ou avec son groupe (lot 5, voir prendre) ;
   *  rien dessous, elle se vide. Le second toucher sur un membre du groupe
   *  qui est exactement la sélection ne prend que lui, s'il n'est pas le
   *  second d'un double appui (double : celui-là ouvre le menu du groupe).
   *  Le mode « Ajouter » allumé, l'objet touché y entre ou en sort, avec son
   *  groupe, et le vide éteint le mode. */
  toucherObjet(this: App, m: P, s: P, double = false): void {
    const f = this.objetSous(m, s, { pointeur: 'touch', dedans: true })
    this.ui.fermerMenuPartie()
    if (this.partie) this.choisirPartie(null)
    if (f && this.ajoutTactile) this.prendre(f, true)
    else if (f && !double && f.groupe && groupeExact(this.formes, this.selection)?.includes(f)) {
      this.selection.clear(); this.selection.add(f.id)
      this.direMembreSeul()
    } else if (!f) {
      this.finirAjout()
      this.selection.clear()
    } else if (!(this.selection.size === 1 && this.selection.has(f.id))) {
      // (un membre déjà pris seul le reste : un toucher sur lui ne ressort pas du groupe)
      this.prendre(f, false)
    }
    this.rendu.redessinerDirect(); this.ui.maj()
    if (f) this.direOptions()
    // Rien de pris : un objet verrouillé ? son cadenas le dit
    else this.appuiSurVerrouille(m, s, 'touch')
  },

  basculerAjout(this: App): void {
    this.ajout = { actif: !this.ajout.actif, vu: this.selection.size > 0 }
    if (this.ajout.actif && !this.astuceAjout) {
      this.astuceAjout = true
      this.ui.message('Touchez d\'autres objets pour les ajouter ou les retirer ; touchez le vide pour finir.')
    }
    this.ui.maj()
  },

  finirAjout(this: App): void { this.ajout.actif = false },

  prendreInstrument(this: App, inst: { nom: NomInstrument; quoi: Partie }, m: P): void {
    const depart = { ...this.instruments.get(inst.nom)! }
    // Celui qu'on prend passe au-dessus des autres
    this.instruments.delete(inst.nom); this.instruments.set(inst.nom, depart)
    const a = Math.atan2(m.y - depart.y, m.x - depart.x)
    this.geste = { type: 'instrument', nom: inst.nom, quoi: inst.quoi, depart, x: m.x, y: m.y,
      ecart: a - depart.a, balayage: 0, dernier: a }
    this.majInstruments(inst)
  },

  prendrePoignee(this: App, prise: { prise: Prise; f: Figure }): void {
    this.ui.fermerMenuPartie()
    this.choisirPartie(prise.f.id, prise.prise)
    this.geste = { type: 'poignee', ...prise, bouge: false }
    this.ui.maj()
  },

  /** Le stylet se pose pendant un geste du doigt : le geste s'arrête là où
   *  le doigt l'a laissé (la vue, un instrument, un objet déplacé ou tiré) ;
   *  un trait du doigt (une paume, sans doute) est jeté. Les doigts encore
   *  posés ne font plus rien jusqu'à leur lever : le stylet a la main. */
  laisserLeStylet(this: App): void {
    const g = this.geste
    this.geste = null
    this.desarmerAppuiLong()
    this.toucherDoigts.oublier()
    switch (g?.type) {
      case 'pan': case 'pinch': break
      case 'instrument': this.finirInstrument(g); break
      case 'deplacer': this.poserDeplacement(g); break
      case 'poignee': this.poserPoignee(g.bouge ? this.rendu.remplacement : null); break
      default: this.abandonnerGeste(g)
    }
    for (const [id, p] of this.pointeurs) if (p.type === 'touch') { this.pointeurs.delete(id); this.ignores.add(id) }
    this.ui.maj()
  },

  /** Un doigt se lève pendant un pincement (g). Deux restent ou plus : le
   *  pincement continue, réancré sur les deux premiers (la vue ne saute pas).
   *  Un seul : il continue de déplacer la vue, sans jamais reprendre le
   *  dessin, jusqu'à son lever. Si le pincement est parti (la vue suivait les
   *  doigts), ce doigt la déplace aussitôt ; sinon (un toucher à deux doigts,
   *  dont les doigts ne se lèvent jamais tout à fait ensemble), il repart
   *  avec le seuil du glisser : un doigt qui tremble ne déplace rien. */
  finPincement(this: App, g: Extract<Geste, { type: 'pinch' }>): void {
    const doigts = this.doigts()
    if (doigts.length >= 2) { this.geste = this.pincement(doigts, g.parti); return }
    if (!doigts.length) { this.geste = null; return }
    const d = doigts[0]
    this.geste = { type: 'pan', dernierX: d.x, dernierY: d.y, pointeur: d.id }
    this.depart = nouveauDepart(d.x, d.y, d.id, 'touch', performance.now())
    this.depart.parti = g.parti
  },

  bouge(this: App, e: PointerEvent): void {
    if (this.ignores.has(e.pointerId)) return
    if (this.laser) { this.bougerLaser(this.monde(e)); return }
    // Le pointeur qu'on voit (le survol compte) : les poignées en prennent la taille
    this.voirPointeur(e.pointerType)
    const s = this.ecran(e)
    const avant = this.pointeurs.get(e.pointerId)
    if (avant) { avant.x = s.x; avant.y = s.y }
    if (e.pointerType === 'touch') this.toucherDoigts.bouger(e.pointerId, s.x, s.y)
    const m = this.monde(e)
    const t = performance.now()
    let g = this.geste
    if (this.outil === 'gomme' || g?.type === 'gomme') {
      // Son cercle : le rayon de son mode (lot 5), celui du coup en cours s'il y en a un
      const mode = g?.type === 'gomme' ? (g.zone ? 'zone' : 'trait') : reglages.gomme
      this.rendu.gomme = { x: m.x, y: m.y, r: rayonGomme(mode) / this.cam.z }
      this.rendu.redessinerDirect()
    }

    if (this.polyEnCours && this.outil === 'forme') {
      const o = this.accrocher(m)
      this.rendu.apercu = this.figure({ type: 'polygone', ferme: false, ...versRelatif([...this.polyEnCours, o.p]) })
      this.rendu.cible = o.accroche ? { a: o.p } : null
      this.rendu.redessinerDirect()
    }

    if (this.placement && !g) { this.placement.bouge(m); this.zone.style.cursor = 'copy'; return }
    // Pendant qu'on rogne : le curseur dit ce que prendrait l'appui, rien ne s'éclaire
    if (this.rognage && !g) {
      const r = this.rognage, f = this.forme(r.id)
      if (f?.type === 'image') {
        const prise = priseRognage(f, r.partie, s, p => this.cam.versEcran(p.x, p.y), POIGNEE.prise[this.pointeurPoignees])
        this.zone.style.cursor = curseurRognage(prise, coinsGardes(f, r.partie))
      }
      return
    }
    // Ce qu'un appui de l'outil Sélection prendrait ici (voir cibleSous)
    const pointeur = typePointeur(e.pointerType)
    let vise: Cible | null = null
    if (!g && this.outil === 'selection') {
      // Ce qu'on survole s'éclaire : au pavé tactile, on sait ce qu'on va
      // prendre ; l'intérieur d'une figure fermée aussi
      vise = this.cibleSous(m, s, { pointeur, dedans: true })
      const id = vise && !this.selection.has(vise.f.id) ? vise.f.id : null
      // Un membre d'un groupe : tout ce que le clic prendrait s'éclaire (le
      // groupe ; ou lui seul, d'un membre pris seul à un autre du même groupe)
      const aussi = id && vise!.f.groupe ? priseDuClic(this.formes, this.selection, vise!.f).filter(g => g.id !== id).map(g => g.id) : []
      const avant = this.rendu.survolAussi
      if (id !== this.survol || aussi.length !== avant.length || aussi.some((x, k) => x !== avant[k])) {
        this.survol = id; this.rendu.survol = id; this.rendu.survolAussi = aussi; this.rendu.redessinerDirect()
      }
      // Un objet verrouillé sous le pointeur, sans rien de libre devant lui :
      // son cadenas le dit (lot 5), sans halo, puisqu'il ne se prend pas
      if (!this.cadenasTenu) this.poserCadenas(vise ? null : this.verrouilleSous(m, s, pointeur))
    }
    if (!g && this.outil === 'segment') {
      if (this.traitEnAttente) this.apercuTrait(this.traitEnAttente, this.boutDuTrait(this.traitEnAttente, m, e.shiftKey))
      else this.montrerAccroche(m)
    }
    if (!g) {
      const inst = this.instruments.size ? this.instrumentSous(m) : null
      // À la Sélection, le curseur dit ce que fera l'appui (au survol de la
      // tablette graphique aussi) : « move », il saisit l'objet et le glisse ;
      // « pointer », il le prend d'un clic, mais glisser entoure ; la croix,
      // dans le vide, glisser sélectionne. Sur une poignée du cadre de taille
      // (lot 5) : la double flèche de son coin ou de son côté, la main sur la
      // pastille ↻ (voir curseurPoignee)
      const pg = !inst && this.outil === 'selection' ? this.poigneeVisee(s) : null
      this.zone.style.cursor = inst ? (inst.quoi === 'corps' || inst.quoi === 'pointe' ? 'grab' : 'pointer') : pg ? curseurPoignee(pg.cadre, pg.p) : this.priseSous(s) ? 'move'
        : this.outil === 'selection' ? (!vise ? 'crosshair' : this.saisi(vise, pointeur) || this.selection.has(vise.f.id) ? 'move' : 'pointer') : ''
      return
    }
    // Le geste n'écoute que le pointeur qui l'a commencé (pas un stylet qui
    // survole, ni un autre doigt). Tant que l'appui n'est pas devenu un
    // glisser, rien ne bouge ; passé le seuil, le déplacement compte depuis
    // le départ. L'encre, elle, part tout de suite.
    if (g.type !== 'pinch' && e.pointerId !== this.depart.pointeur) return
    const parti = this.depart.parti
    const glisse = g.type !== 'pinch' && this.aGlisse(s)
    if (glisse && !parti) {
      // Un appui qui glisse n'est plus un appui long ; un doigt qui glisse
      // (la vue, un lasso, un objet qui part) ne fait plus un toucher à deux
      // doigts : un toucher qui a déplacé quelque chose n'annule jamais
      if (this.appuiLong?.pointeur === e.pointerId) this.desarmerAppuiLong()
      if (e.pointerType === 'touch') this.toucherDoigts.oublier()
      // L'appui devient un glisser (un objet qui part, un cadre ou un lasso
      // qui commence) : la barre d'actions se cache, une fois, jusqu'au lâcher
      // (voir enMouvement). Rien de sélectionné, pas de barre : un trait du
      // Stylo ne paie pas cette mise à jour.
      if (this.selection.size) this.ui?.maj()
    }
    // Le doigt retenu (voir ecrireOuRetenir) a glissé : il agit au point de
    // l'appui, et ce mouvement continue avec le vrai geste (la Gomme efface
    // ce qu'elle traverse)
    if (g.type === 'retenu') {
      if (!glisse) return
      this.lancerRetenu(g)
      g = this.geste
      if (!g) return
    }
    switch (g.type) {
      case 'rogner': this.tirerRognage(g, m); break
      case 'instrument':
        if (g.quoi !== 'tete' && !glisse) break          // l'arc du compas, lui, se trace tout de suite
        this.geste_instrument(g, m, e.shiftKey)
        break
      case 'longer':
        if (!glisse) break                               // posé contre le bord, pas encore tiré
        this.geste_longer(g, m)
        break
      case 'poignee':
        if (!glisse) break                               // un clic, pas encore un glisser
        g.bouge = true
        this.rendu.remplacement = this.manipuler(g.f, g.prise, m)
        this.rendu.toutRedessiner()
        break
      case 'rectangle':
      case 'cercle':
        if (!glisse) break                               // un appui qui tremble ne tire rien
        this.rendu.apercu = this.figureTiree(g, this.aimanter(m), e.shiftKey)
        this.rendu.redessinerDirect()
        break
      case 'texte':
        if (!glisse) break
        this.rendu.cadreTexte = cadreDuTexte(g, m)
        this.rendu.redessinerDirect()
        break
      case 'pinch': {
        const doigts = this.doigts()
        if (doigts.length < 2) return
        const [a, b] = doigts
        const dist = Math.hypot(a.x - b.x, a.y - b.y)
        // La vue ne bouge pas tant qu'aucun des deux doigts n'a bougé de 8 px
        // (le seuil du glisser au doigt) et que leur écart n'a pas changé de
        // 8 px : un toucher à deux doigts qui tremble ne décale pas la vue
        // avant d'annuler. Passé ce seuil, elle suit les doigts depuis le
        // départ du pincement (dist, cx, cy n'ont pas bougé jusque-là), et ce
        // n'est plus un toucher.
        if (!g.parti) {
          const d = g.depart, k = SEUIL_GLISSER.touch
          const loin = (p: DoigtPose, q: DoigtPose) => p.id !== q.id || Math.hypot(p.x - q.x, p.y - q.y) >= k
          if (!loin(a, d.a) && !loin(b, d.b) && Math.abs(dist - d.dist) < k) return
          g.parti = true
          this.toucherDoigts.oublier()
        }
        const cx = (a.x + b.x) / 2, cy = (a.y + b.y) / 2
        this.cam.deplacer(cx - g.cx, cy - g.cy)
        if (g.dist > 0) this.cam.zoomerAutour(cx, cy, dist / g.dist)
        g.dist = dist; g.cx = cx; g.cy = cy
        this.vueChangee()
        break
      }
      case 'pan':
        if (!glisse) break
        this.cam.deplacer(s.x - g.dernierX, s.y - g.dernierY)
        g.dernierX = s.x; g.dernierY = s.y
        this.vueChangee()
        break
      case 'dessin': {
        if (e.pointerId !== g.pointeur) return
        const trait = this.rendu.monTrait!
        // Les événements « fusionnés » : tous les points que le stylet a
        // envoyés entre deux images, pas seulement le dernier.
        const evts = e.getCoalescedEvents?.() ?? [e]
        const seuil = 0.6 / this.cam.z
        for (const ev of evts.length ? evts : [e]) {
          const p = this.monde(ev)
          const n = trait.pts.length
          if (Math.hypot(p.x - trait.pts[n - 3], p.y - trait.pts[n - 2]) < seuil) continue
          trait.pts.push(p.x, p.y, ev.pointerType === 'pen' ? ev.pressure : 0.5)
          this.heuresDuTrait.push(heureDe(ev))
          if (this.immobilite.bouge(p, this.cam.z)) { this.dernierMouvement = t; this.attendreImmobilite() }
        }
        this.rendu.redessinerDirect()
        break
      }
      case 'segment':
        this.apercuTrait(g, this.boutDuTrait(g, m, e.shiftKey))
        break
      case 'gomme':
        if (g.zone) {
          // Là où elle passe : tous les points que la plume a envoyés entre deux images
          const evts = e.getCoalescedEvents?.() ?? []
          this.gommerLa(g.zone, evts.length ? evts.map(ev => this.monde(ev)) : [m])
        } else this.gommer(m.x, m.y, g.effaces)
        break
      case 'deplacer': {
        if (!glisse) break
        g.bouge = true
        this.rendu.decalage = { dx: m.x - g.x, dy: m.y - g.y }
        this.rendu.toutRedessiner()
        break
      }
      case 'taille': {
        if (!glisse) break                               // un clic sur un coin ne change rien
        // Maj + coin d'une image seule : ses deux axes, chacun le sien
        const libre = g.image && !g.cadre.fixe && g.quoi === 'coin' && e.shiftKey
        const r = matriceTaille(g.cadre, g, m, { bornes: g.bornes, libre })
        this.montrerTransfo(g, r.M, texteTaille(r.kx, r.ky, libre || g.quoi === 'cote'), m)
        break
      }
      case 'tourner': {
        // L'angle se suit dès l'appui (déroulé : plus d'un tour se compte),
        // mais rien ne tourne avant le seuil du glisser
        const c = g.cadre.centre, a = Math.atan2(m.y - c.y, m.x - c.x)
        g.total = deroule(g.total, g.dernier, a); g.dernier = a
        if (!glisse) break
        const t = aimanterAngle(g.total, e.shiftKey)
        this.montrerTransfo(g, rotation(c, t), texteRotation(t), m)
        break
      }
      case 'zone': {
        if (!glisse) break
        // Le halo de l'objet sous l'appui s'éteint : ce n'est plus lui qu'on prend
        if (this.survol) { this.survol = null; this.rendu.survol = null; this.rendu.survolAussi = [] }
        if (g.forme === 'cadre') this.rendu.cadreSelection = rectangle(g.x, g.y, m.x, m.y)
        else {
          // Un point tous les 3 px d'écran au moins : le lasso reste léger
          const n = g.pts.length
          if (Math.hypot(m.x - g.pts[n - 2], m.y - g.pts[n - 1]) * this.cam.z > 3) g.pts.push(m.x, m.y)
          this.rendu.lasso = g.pts
        }
        this.rendu.redessinerDirect()
        break
      }
    }
  },

  /** Un lever (annule : coupé par le navigateur, pointercancel). Le toucher à
   *  deux ou trois doigts se reconnaît au lever du dernier doigt (voir
   *  ToucherADoigts), et n'agit qu'une fois ce lever fait. */
  haut(this: App, e: PointerEvent, annule = false): void {
    // Le doigt qui montrait au laser se lève : le point s'en va (la souris et
    // le stylet qui survole, eux, le gardent tant qu'ils sont sur le tableau)
    if (this.laser && !this.pointeurs.has(e.pointerId)) { if (e.pointerType === 'touch' || annule) this.bougerLaser(null); return }
    // Une paume, ou le doigt d'un appui long, sort de la liste à son lever,
    // sans rien faire d'autre (le clic qui suit le lever d'un appui long non
    // plus : voir brancherGestes)
    if (this.ignores.delete(e.pointerId)) {
      if (this.clicApresAppuiLong?.pointeur === e.pointerId) this.clicApresAppuiLong.leve = performance.now()
      return
    }
    if (this.appuiLong?.pointeur === e.pointerId) this.desarmerAppuiLong()
    let doigts: ToucherReconnu | null = null
    if (e.pointerType === 'touch') {
      if (annule || this.enLecture) this.toucherDoigts.oublier()
      else doigts = this.toucherDoigts.lever(e.pointerId, heureDe(e))
    }
    this.leverGeste(e, annule)
    if (doigts) this.gesteDesDoigts(doigts)
  },

  leverGeste(this: App, e: PointerEvent, annule: boolean): void {
    this.pointeurs.delete(e.pointerId)
    let g = this.geste
    if (!g) return
    // La fin d'un pincement : la barre d'actions revient quand plus rien ne bouge
    if (g.type === 'pinch') { this.finPincement(g); this.ui.maj(); return }
    if ((g.type === 'dessin' || g.type === 'retenu') && e.pointerId !== g.pointeur) return
    if (g.type === 'pan' && g.pointeur !== undefined && e.pointerId !== g.pointeur) return
    // Le doigt retenu (voir ecrireOuRetenir) se lève avant d'avoir agi : il
    // agit (la Gomme efface ce qu'elle touche, le Point se pose…), puis c'est
    // le lever du vrai geste. Coupé par le navigateur, il n'écrit rien.
    if (g.type === 'retenu') {
      if (annule) { this.abandonnerGeste(g); return }
      this.lancerRetenu(g)
      g = this.geste
      if (!g) return
    }
    // Clic ou glisser ? Le lever compte aussi (un appui levé loin de son départ a glissé)
    const glisse = this.aGlisse(this.ecran(e))
    this.geste = null
    // Le second toucher d'un double appui au doigt (voir secondToucher)
    const double = this.doubleEnCours?.pointeur === e.pointerId ? this.doubleEnCours : null
    if (double) this.doubleEnCours = null
    // Un geste coupé par le navigateur (un second doigt sur le pavé tactile,
    // une fenêtre système…) garde ce qu'il a tracé : un arc de compas, un
    // trait à la règle ou au stylo ne doit pas s'effacer sous les yeux
    const garder = g.type === 'instrument' || g.type === 'longer' || g.type === 'dessin'
    if (annule && !garder) { this.abandonnerGeste(g); this.ui.maj(); return }

    const m = this.monde(e)
    if (!double) this.noterToucher(e, g, glisse, m)
    switch (g.type) {
      case 'rogner': break                               // la partie gardée suit déjà le pointeur
      case 'pan':
        // Un simple toucher du doigt « qui déplace » fait le clic attendu (voir
        // placement), ou choisit l'objet touché
        if (glisse) break
        if (g.toucher && this.placement) { const p = this.placement; this.placement = null; p.clic(m) }
        else if (g.toucher) this.toucherObjet(m, this.ecran(e), !!double)
        break
      case 'dessin': {
        clearTimeout(this.minuterieForme)
        // L'appui qui fermait un menu, levé sans avoir glissé : rien n'est posé
        if (g.apresMenu && !glisse) { this.rendu.monTrait = null; this.heuresDuTrait = []; this.rendu.redessinerDirect(); break }
        const bref = !glisse && !annule && performance.now() - this.depart.t < DOUBLE_CLIC_PLUME.duree
        // Le second toucher d'un double-clic, bref et levé sans avoir glissé :
        // les options de l'objet. Sinon, le point du premier se pose d'abord.
        if (g.second && bref && this.pointEnAttente) { this.doubleClicPlume(); break }
        if (g.second) this.viderPointEnAttente()
        // Un simple toucher sur un objet : un double-clic peut suivre
        if (g.surObjet && bref) { this.mettreEnAttente(g.surObjet); break }
        this.validerTrait(false)
        break
      }
      case 'gomme': this.finirGomme(g); break
      case 'segment': {
        const s = this.rendu.monSegment!
        // Un simple clic (sans glisser) pose le premier point : le second clic finira le trait
        if (!glisse) {
          this.traitEnAttente = { x: g.x, y: g.y }
          if (!this.astuceDeuxClics) { this.astuceDeuxClics = true; this.ui.message(messageSecondPoint(this.dernierPointeur)) }
          this.rendu.redessinerDirect()
          break
        }
        this.finirTrait({ x: s.x1, y: s.y1 }, { x: s.x2, y: s.y2 })
        break
      }
      case 'instrument': this.finirInstrument(g); break
      case 'longer': {
        const f = this.rendu.apercu
        this.rendu.apercu = null; this.rendu.mesure = null
        this.piste.trace(null)
        // Le segment n'est posé que si le crayon a glissé le long du bord (voir SEUIL_GLISSER)
        if (glisse && f?.type === 'polygone' && Math.hypot(f.pts[2], f.pts[3]) * this.cam.z > 3) {
          this.tableau.nouveauGeste()
          this.tableau.poser(this.page, f)
        }
        this.rendu.redessinerDirect()
        break
      }
      case 'poignee':
        // Un clic sans glisser : les options de ce morceau-là
        if (!glisse) { this.ui.ouvrirMenuPartie(g.f.id, g.prise, e.clientX, e.clientY); break }
        this.poserPoignee(this.manipuler(g.f, g.prise, m))
        break
      case 'rectangle':
      case 'cercle': {
        const f = this.figureTiree(g, this.aimanter(m), e.shiftKey)
        this.rendu.apercu = null
        // Un appui qui n'a pas glissé (un stylet ou un doigt qui tremble) ne pose rien
        if (glisse && f && (f.type === 'cercle' ? f.r : Math.abs(f.pts[4]) + Math.abs(f.pts[5])) * this.cam.z > 6) this.poserFigure(f, false)
        this.rendu.redessinerDirect()
        break
      }
      case 'deplacer':
        if (g.doigt && !glisse) { this.rendu.decalage = { dx: 0, dy: 0 }; this.toucherObjet(m, this.ecran(e), !!double); break }
        // Maj + clic sur un objet déjà sélectionné : il en sort, avec son
        // groupe (glissé, c'est toute la sélection qui a bougé)
        if (g.retirer && !glisse) { this.rendu.decalage = { dx: 0, dy: 0 }; for (const id of g.retirer) this.selection.delete(id); this.rendu.redessinerDirect(); break }
        // Le second clic simple sur un membre du groupe pris : lui seul (au
        // doigt, le second toucher d'un double appui ouvre le menu du groupe)
        if (g.seul && !glisse && !double && this.forme(g.seul)) {
          this.rendu.decalage = { dx: 0, dy: 0 }
          this.selection.clear(); this.selection.add(g.seul)
          this.direMembreSeul()
          this.rendu.redessinerDirect()
          break
        }
        this.poserDeplacement(g)
        break
      case 'zone': {
        this.rendu.cadreSelection = null; this.rendu.lasso = null
        if (g.forme === 'lasso') {
          const n = g.pts.length
          if (m.x !== g.pts[n - 2] || m.y !== g.pts[n - 1]) g.pts.push(m.x, m.y)
        }
        // Un lasso resté tout petit (un doigt qui a roulé) est un toucher
        if (glisse && !(g.forme === 'lasso' && this.petitLasso(g.pts))) { this.prendreZone(g, m); this.direCadre() }
        else if (g.candidat && this.forme(g.candidat)) {
          // Un toucher sur l'objet qu'on ne saisissait pas : il est pris (avec
          // Maj, Ctrl ou le mode « Ajouter », il entre dans la sélection ou en sort)
          // (un membre d'un groupe prend tout son groupe : voir prendre)
          this.prendre(this.forme(g.candidat)!, g.ajout)
          this.direOptions()
        } else {
          // Un clic dans le vide désélectionne, sauf avec Maj ou Ctrl (on a
          // visé à côté) ; un toucher dans le vide éteint le mode « Ajouter »,
          // et vide la sélection
          const tactile = this.ajoutTactile
          this.finirAjout()
          if (!g.ajout || tactile) this.selection.clear()
          // Ce « vide » (un clic, un lasso resté tout petit) était peut-être un
          // objet verrouillé : son cadenas le dit
          this.appuiSurVerrouille(m, this.ecran(e), typePointeur(e.pointerType))
        }
        this.rendu.redessinerDirect(); this.ui.maj()
        break
      }
      case 'formule': {
        if (glisse) break
        const s = this.ecran(e)
        const f = this.formeSous(m.x, m.y)
        if (f?.type === 'formule' && !estTexte(f)) this.modifierFormule(f)
        else this.nouvelleFormule(m.x, m.y, s.x, s.y)
        break
      }
      case 'texte': {
        // Un cadre glissé assez large : un texte de cette largeur, qui passe
        // à la ligne tout seul ; un clic (sur un texte : il se modifie) : un
        // texte qui s'allonge avec ce qu'on tape
        this.rendu.cadreTexte = null; this.rendu.redessinerDirect()
        const b = glisse ? cadreDuTexte(g, m) : null
        if (b && b.l >= LARGEUR_MIN) { this.ouvrirTexte({ x: b.x, y: b.y, largeur: b.l }); break }
        const f = this.formeSous(m.x, m.y)
        if (estTexte(f) && libre(f)) { this.modifierTexte(f); break }
        this.ouvrirTexte({ x: m.x - 4, y: m.y - TAILLE_TEXTE * 0.65 - 2 })
        break
      }
      case 'taille':
      case 'tourner':
        // Le lâcher écrit le geste, en une étape (voir transformerSelection) ;
        // levé sans avoir glissé, rien sur un coin ou un côté, et un quart de
        // tour sur une pastille (retouches après le lot 5, le souhait du
        // professeur : un clic, et l'énoncé photographié couché se relève) :
        // à droite sur ↻, à gauche sur ↺, autour du même centre qu'en la
        // tournant
        this.finirCadre()
        if (glisse && !estIdentite(g.M)) this.transformerSelection(g.M)
        else if (!glisse && g.type === 'tourner' && this.transformerSelection(quartDeTour(g.cadre.centre, g.sens))) {
          const s = this.ecran(e)
          this.quartAuClic = { t: performance.now(), x: s.x, y: s.y, i: g.sens === 'gauche' ? 1 : 0 }
        }
        break
    }
    // Le second toucher d'un double appui, bref et levé sans avoir glissé
    if (double && !glisse && performance.now() - this.depart.t < DOUBLE_TOUCHER.ms) this.ouvrirParDouble(double.objet)
    this.ui.maj()                       // le panneau d'options réapparaît
  },

  /** Le lasso tient-il dans moins de 8 px d'écran ? */
  petitLasso(this: App, pts: number[]): boolean {
    let x1 = Infinity, y1 = Infinity, x2 = -Infinity, y2 = -Infinity
    for (let i = 0; i < pts.length; i += 2) {
      x1 = Math.min(x1, pts[i]); x2 = Math.max(x2, pts[i]); y1 = Math.min(y1, pts[i + 1]); y2 = Math.max(y2, pts[i + 1])
    }
    return Math.max(x2 - x1, y2 - y1) * this.cam.z < 8
  },

  /** Le cadre ou le lasso lâché : ce qui y est à plus de moitié est pris (la
   *  longueur d'un tracé, la surface d'une image ou d'une formule, les deux
   *  points d'une droite : voir partDedans). Sans ajout, il remplace la
   *  sélection ; avec (Maj, Ctrl, le mode « Ajouter »), il s'y ajoute sans
   *  rien en retirer. Le lasso est d'abord
   *  simplifié (à 2 px d'écran près) et rangé par bandes (dansLasso), et les
   *  formes dont la boîte ne touche pas celle de la zone sont écartées sans
   *  calcul : le lâcher reste immédiat sur une page de milliers de traits. */
  prendreZone(this: App, g: Extract<Geste, { type: 'zone' }>, m: P): void {
    let b: Boite, dansZone: (x: number, y: number) => boolean
    if (g.forme === 'cadre') {
      const r = rectangle(g.x, g.y, m.x, m.y)
      b = r
      dansZone = (x, y) => x >= r.x && x <= r.x + r.l && y >= r.y && y <= r.y + r.h
    } else {
      const q = simplifier(g.pts, 2 / this.cam.z)
      let x1 = Infinity, y1 = Infinity, x2 = -Infinity, y2 = -Infinity
      for (let i = 0; i < q.length; i += 2) {
        x1 = Math.min(x1, q[i]); x2 = Math.max(x2, q[i]); y1 = Math.min(y1, q[i + 1]); y2 = Math.max(y2, q[i + 1])
      }
      b = { x: x1, y: y1, l: x2 - x1, h: y2 - y1 }
      dansZone = dansLasso(q)
    }
    if (!g.ajout) this.selection.clear()
    const pris: string[] = []
    for (const f of this.formes) {
      // Ce qui est verrouillé ou fixé en fond ne se prend pas (lot 5) : le
      // lasso qui part sur un énoncé fixé entoure ce qu'on a écrit dessus
      if (!libre(f)) continue
      // Une droite compte par ses deux points (sa boîte est la leur) ; une
      // formule tournée s'écarte par son englobante, et se mesure dans son
      // rectangle tourné (partDedans reçoit sa boîte locale)
      const fb = this.boiteDeForme(f), vue = fb && englobante(f, fb)
      if (!fb || !vue || !chevauche(b, vue)) continue
      // Toute la boîte dans le cadre : tout l'objet y est, sans rien mesurer
      const entiere = g.forme === 'cadre' && vue.x >= b.x && vue.y >= b.y && vue.x + vue.l <= b.x + b.l && vue.y + vue.h <= b.y + b.h
      if (entiere || partDedans(f, dansZone, fb) > 0.5) pris.push(f.id)
    }
    // Un membre d'un groupe pris : tout le groupe l'est (lot 5)
    for (const id of this.avecGroupes(pris)) this.selection.add(id)
  },

  /** La sélection déplacée se pose là où on l'a laissée : ce qui y est libre,
   *  et les points repérés sur une image déplacée, même verrouillés (voir
   *  quiBouge dans verrou.ts) */
  poserDeplacement(this: App, g: { bouge: boolean }): void {
    const { dx, dy } = this.rendu.decalage
    this.rendu.decalage = { dx: 0, dy: 0 }
    const bougent = g.bouge && (dx || dy) ? quiBouge(this.formes, this.selection) : []
    if (bougent.length) this.tableau.modifier(this.page, bougent.map(f => ({ id: f.id, patch: { x: f.x + dx, y: f.y + dy } })))
    else this.rendu.toutRedessiner()
  },

  /** La figure dont on a tiré un morceau prend sa nouvelle forme (null : elle garde l'ancienne) */
  poserPoignee(this: App, f: Figure | null): void {
    this.rendu.remplacement = null
    if (f) {
      const { id: _i, type: _t, ...patch } = f
      this.tableau.modifier(this.page, [{ id: f.id, patch: patch as Partial<Forme> }])
    }
    this.rendu.toutRedessiner()
  },

  /** Le trait à poser, en coordonnées relatives à son premier point (null : rien à poser) */
  traitDe(this: App, t: TraitDirect): Trait | null {
    if (t.pts.length < 3) return null
    const x0 = t.pts[0], y0 = t.pts[1]
    const pts: number[] = []
    for (let i = 0; i < t.pts.length; i += 3) {
      pts.push(Math.round((t.pts[i] - x0) * 10) / 10, Math.round((t.pts[i + 1] - y0) * 10) / 10,
        Math.round(t.pts[i + 2] * 100) / 100)
    }
    return { id: uid(), type: 'trait', x: x0, y: y0, pts, couleur: t.couleur,
      taille: t.taille, opacite: t.opacite, pression: t.pression, z: Date.now(), auteur: this.tableau.moi }
  },

  validerTrait(this: App, maintenu: boolean): void {
    const t = this.rendu.monTrait
    const heures = this.heuresDuTrait
    this.rendu.monTrait = null
    this.heuresDuTrait = []
    const trait = t ? this.traitDe(t) : null
    if (!t || !trait) return
    // Le temps passé sur chaque point, jusqu'au lever (maintenant) : l'étape du film le note
    if (heures.length * 3 === t.pts.length) this.tableau.poserTrace(this.page, trait, tempsDesPoints(heures, performance.now()))
    else this.tableau.poser(this.page, trait)
    this.rendu.redessinerDirect()

    // Le tracé ressemble-t-il à une figure ? Elle remplace le trait dans
    // une SECONDE étape d'annulation : Ctrl+Z rend le tracé à main levée.
    if (this.outil !== 'stylo' || !this.reconnaissance) return
    const abs: P[] = []
    for (let i = 0; i < t.pts.length; i += 3) abs.push({ x: t.pts[i], y: t.pts[i + 1] })
    const r = reconnaitre(abs, maintenu, this.cam.z)
    if (!r) return
    const f = this.depuisReconnue(r, trait)
    this.tableau.nouveauGeste()
    this.tableau.doc.transact(() => {
      this.tableau.supprimer(this.page, [trait.id])
      this.tableau.poser(this.page, f)
    }, 'locale')
    // La figure n'est pas sélectionnée : ses sommets n'ont pas à se prendre
    // sous la plume qui continue d'écrire (ses options : double-clic, clic droit)
    this.ui.message(messageReconnue(r.nom, this.dernierPointeur, CTRL))
  },

  /** Stylo posé et immobile un instant : la figure se forme aussitôt,
   *  sans attendre qu'on lève le stylo. */
  attendreImmobilite(this: App): void {
    clearTimeout(this.minuterieForme)
    if (this.outil !== 'stylo' || !this.reconnaissance) return
    this.minuterieForme = window.setTimeout(() => {
      const g = this.geste
      if (g?.type !== 'dessin') return
      // L'appui qui fermait un menu, resté sur place : il n'écrit rien
      if (g.apresMenu && !this.depart.parti) return
      this.geste = null
      this.validerTrait(true)
    }, 550)
  },
}
