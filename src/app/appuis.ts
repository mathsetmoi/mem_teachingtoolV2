// =============================================================
// L'APP : LES GESTES, LE CADENAS, APPUYER, GLISSER, LEVER
// Des méthodes de la classe App (src/app.ts), rangées ici par sujet :
// elles s'ajoutent à la classe à la fin de app.ts (ajouterMethodes).
// =============================================================
import type { App } from '../app'
import { TOUTE_LA_SELECTION, heureDe } from '../app'
import type { DoigtPose, Geste, Prise } from '../app'
import type { Cadre, Poignee } from '../cadre'
import { Immobilite } from '../formes'
import type { P } from '../formes'
import { cibleParmi, touche } from '../geometrie'
import type { Cible } from '../geometrie'
import { groupeExact } from '../groupes'
import { avale } from '../menus'
import { MAC } from '../navigateur'
import { PRISE_GLISSER, TOLERANCE_PRISE, TOUCHER_DOIGTS, contactLarge, depasseSeuil, ecranTactile, messageVerrou, nouveauDepart, typePointeur } from '../pointeurs'
import type { TypePointeur } from '../pointeurs'
import { noterStyletDirect, reglages, choisirContraste as reglerContraste, choisirDoigt as reglerDoigt } from '../reglages'
import type { Doigt } from '../reglages'
import type { Boite } from '../revoir/bobine'
import { CM, libre } from '../types'
import type { Figure, Forme } from '../types'
import { minuscule } from '../verrou'

export const methodesAppuis = {
  // ---------- Gestes ----------
  monde(this: App, e: { clientX: number; clientY: number }): { x: number; y: number; } {
    const r = this.zone.getBoundingClientRect()
    return this.cam.versMonde(e.clientX - r.left, e.clientY - r.top)
  },
  ecran(this: App, e: { clientX: number; clientY: number }): { x: number; y: number; } {
    const r = this.zone.getBoundingClientRect()
    return { x: e.clientX - r.left, y: e.clientY - r.top }
  },

  aimanter(this: App, p: { x: number; y: number }): { x: number; y: number; } {
    if (!this.aimant) return p
    const pas = CM / 2
    return { x: Math.round(p.x / pas) * pas, y: Math.round(p.y / pas) * pas }
  },

  /** L'objet libre sous ce point du monde, le plus haut d'abord, à `rayon`
   *  pixels d'écran près (le doigt vise moins juste que la souris) ; parmi
   *  ceux qu'accepte `filtre`, s'il y en a un. Jamais ce qui est verrouillé
   *  ou fixé en fond (lot 5) : le double-clic au Stylo sur une formule
   *  verrouillée y pose son point d'encre, comme ailleurs. */
  formeSous(this: App, x: number, y: number, rayon = 6, filtre?: (f: Forme) => boolean): Forme | null {
    const r = rayon / this.cam.z
    for (let i = this.formes.length - 1; i >= 0; i--) {
      const f = this.formes[i]
      if (libre(f) && (!filtre || filtre(f)) && touche(f, x, y, r, this.boiteTouche)) return f
    }
    return null
  },

  /** Ce qu'on prend sous le pointeur (outil Sélection, doigt qui déplace,
   *  clic droit), m dans le monde, s à l'écran, et par où on le prend (voir
   *  Cible et cibleParmi dans geometrie.ts) : la page dans l'ordre où on la
   *  voit, à TOLERANCE_PRISE pixels d'écran selon le pointeur, un tracé à
   *  6 px ou moins passant avant tout. L'intérieur nu d'une figure fermée ne
   *  compte que si o.dedans (l'outil Sélection, le toucher du doigt qui
   *  déplace : jamais sous un outil de dessin, où écrire dans un triangle ne
   *  doit pas le prendre), et pas quand la figure déborde tout ce qu'on voit
   *  entre les barres. Un plein cache ce qui est sous lui, sauf une formule :
   *  ce qu'on écrit sur elle se prend à travers elle.
   *  Ce qui est verrouillé ou fixé en fond (lot 5) est transparent : on prend
   *  ce qui est dessous, ou le vide. o.verrouilles (le clic droit, le bouton
   *  du stylet, l'appui long, qui ouvrent le menu court d'un verrouillé ; le
   *  cadenas du survol) garde les verrouillés, jamais une image fixée : pour
   *  la prise, elle est le vide (c'est le menu de la page qui la détache). */
  cibleSous(this: App, m: P, s: P, o: { pointeur: TypePointeur; dedans: boolean; verrouilles?: boolean }): Cible | null {
    let zl: { x: number; y: number; l: number; h: number } | null = null
    const formes = this.nonLibres ? this.formes.filter(o.verrouilles ? (f => !f.fixe) : libre) : this.formes
    return cibleParmi(formes, m.x, m.y, {
      zoom: this.cam.z, tolerance: TOLERANCE_PRISE[o.pointeur], net: TOLERANCE_PRISE.mouse, dedans: o.dedans,
      boite: f => this.boiteDeForme(f),
      morceau: () => this.priseSous(s, { toutes: true })?.f ?? null,
      deborde: f => {
        zl ??= this.ui?.zoneLibre() ?? { x: 0, y: 0, l: this.rendu.l, h: this.rendu.h }
        const g = this.boiteGeometrique(f)
        const a = this.cam.versEcran(g.x, g.y), c = this.cam.versEcran(g.x + g.l, g.y + g.h)
        return a.x <= zl.x && a.y <= zl.y && c.x >= zl.x + zl.l && c.y >= zl.y + zl.h
      },
    })
  },

  /** L'objet que prend le pointeur (voir cibleSous) */
  objetSous(this: App, m: P, s: P, o: { pointeur: TypePointeur; dedans: boolean }): Forme | null {
    return this.cibleSous(m, s, o)?.f ?? null
  },

  /** L'objet verrouillé qu'on voit sous le pointeur (rien de libre devant
   *  lui à prendre), s'il y en a un ; son identifiant */
  verrouilleSous(this: App, m: P, s: P, pointeur: TypePointeur): string | null {
    if (!this.verrouilles) return null
    const c = this.cibleSous(m, s, { pointeur, dedans: true, verrouilles: true })
    return c && !libre(c.f) ? c.f.id : null
  },

  // ---------- Le cadenas (lot 5) ----------
  /** Le cadenas sur cet objet (null : plus de cadenas). Seule l'App le pose,
   *  à l’écran : jamais dans la revue, le lecteur ni les sorties. Celui d'un
   *  objet dont le menu est ouvert, le rendu le peint de lui-même (ce qui
   *  est sélectionné et verrouillé : voir Rendu.peindreDirect). */
  poserCadenas(this: App, id: string | null): void {
    if ((this.rendu.cadenas?.id ?? null) === id) return
    this.rendu.cadenas = id ? { id, cadre: false } : null
    this.rendu.redessinerDirect()
  },

  /** Plus de cadenas, même celui d'un appui (une autre page, un autre outil) */
  cacherCadenas(this: App): void {
    clearTimeout(this.minuterieCadenas)
    this.cadenasTenu = false
    this.poserCadenas(null)
  },

  /** Un appui de la Sélection (ou un toucher du doigt qui déplace) levé sans
   *  avoir glissé ni rien pris : s'il était sur un objet verrouillé, son
   *  cadenas le dit 1,5 s, et la première fois de la session un message dit
   *  comment le déverrouiller. Vrai s'il y avait un verrouillé. */
  appuiSurVerrouille(this: App, m: P, s: P, pointeur: TypePointeur): boolean {
    const id = this.verrouilleSous(m, s, pointeur)
    if (!id) return false
    clearTimeout(this.minuterieCadenas)
    this.cadenasTenu = true
    this.poserCadenas(id)
    this.minuterieCadenas = window.setTimeout(() => { this.cadenasTenu = false; this.poserCadenas(null) }, 1500)
    if (!this.astuceVerrou) {
      this.astuceVerrou = true
      this.ui.message('Objet verrouillé : ' + minuscule(messageVerrou(pointeur)))
    }
    return true
  },

  /** L'appui SAISIT-il l'objet visé (glissé, il l'emporte) ? Par un morceau,
   *  par un plein, ou tout près de son tracé (PRISE_GLISSER) ; plus loin, un
   *  toucher le prend mais un glisser ne l'emporte pas. */
  saisi(this: App, c: { par: string; ecart: number }, pointeur: TypePointeur): boolean {
    return c.par === 'morceau' || c.par === 'plein' || (c.par === 'trace' && c.ecart <= PRISE_GLISSER[pointeur])
  },

  /** La boîte d'une figure fermée, sans marge pour l'épaisseur ni les noms */
  boiteGeometrique(this: App, f: Forme): Boite {
    if (f.type === 'cercle') return { x: f.x - f.r, y: f.y - f.r, l: 2 * f.r, h: 2 * f.r }
    const b = this.boiteVue(f)
    if (f.type !== 'polygone') return b ?? { x: f.x, y: f.y, l: 0, h: 0 }
    let x1 = Infinity, y1 = Infinity, x2 = -Infinity, y2 = -Infinity
    for (let i = 0; i < f.pts.length; i += 2) {
      x1 = Math.min(x1, f.pts[i]); x2 = Math.max(x2, f.pts[i]); y1 = Math.min(y1, f.pts[i + 1]); y2 = Math.max(y2, f.pts[i + 1])
    }
    return { x: f.x + x1, y: f.y + y1, l: x2 - x1, h: y2 - y1 }
  },

  brancherGestes(this: App): void {
    const z = this.zone
    z.addEventListener('pointerdown', e => this.bas(e))
    z.addEventListener('pointermove', e => this.bouge(e))
    z.addEventListener('pointerup', e => this.haut(e))
    z.addEventListener('pointercancel', e => this.haut(e, true))
    z.addEventListener('wheel', e => this.molette(e), { passive: false })
    // Le clic droit ouvre le menu complet à l'APPUI du bouton (voir bas et
    // demanderOptions) ; l'événement contextmenu, lui, ne fait plus rien
    // d'autre qu'écarter le menu du navigateur. Sous Windows Ink (la tablette
    // graphique de la classe), « appuyer longuement pour cliquer avec le
    // bouton droit » envoie un clic droit AU LEVER, après la fin du trait : un
    // stylet tenu immobile une seconde (une hésitation, ou un tracé tenu pour
    // que la figure soit reconnue) ouvrirait un menu, celui de la page dans le
    // vide. Android, la Surface et Windows tactile en envoient un aussi à
    // l'appui long du doigt, que l'appui long de MEM remplace par son propre
    // minuteur (voir armerAppuiLong ; l'iPad n'en envoie pas) : jamais deux
    // menus. Un vrai clic droit, lui, commence toujours par l'appui du
    // bouton 2, comme le bouton du stylet. La touche Menu du clavier (et
    // Maj + F10) passe par sa touche (voir menuAuClavier), pas par cet
    // événement.
    z.addEventListener('contextmenu', e => e.preventDefault())
    // La touche Menu (ou Maj + F10) vient d'ouvrir le menu de MEM : le
    // contextmenu que le navigateur tire ensuite de la même touche (sous
    // Windows, au relâcher), visant le focus (la page, ou l'entrée du menu
    // qui vient de le prendre), n'ouvre pas le sien par-dessus
    document.addEventListener('contextmenu', e => {
      if (!this.toucheMenuA || performance.now() - this.toucheMenuA > 1500) return
      this.toucheMenuA = 0
      e.preventDefault()
    }, true)
    // Double-clic : le menu complet de l'objet (une formule, elle, se modifie,
    // comme un texte partout ; dans une sélection de plusieurs objets, le
    // menu commun).
    // Pas sur un morceau choisi (son menu vient de s'ouvrir), ni juste après
    // un double appui déjà traité (au Stylo, voir doubleClicPlume ; au
    // doigt, voir secondToucher)
    z.addEventListener('dblclick', e => {
      if (this.enLecture || this.partie || performance.now() - this.doubleTraite < 500) return
      if (this.quartAuClic && performance.now() - this.quartAuClic.t < 600) return
      // Sur une poignée du cadre de taille ou sur sa pastille ↻ (lot 5) : rien
      // (la pastille, hors de l'objet, est souvent au-dessus d'un autre)
      if (this.poigneeVisee(this.ecran(e))) return
      // Au Stylo et au Surligneur, le double-clic est celui de la plume, plus
      // serré que celui du navigateur (voir secondClic) : deux points écrits
      // tout près sur une formule n'ouvrent pas son éditeur
      if (this.outil === 'stylo' || this.outil === 'surligneur') return
      // Au doigt, l'outil Sélection et le doigt qui déplace ont leur double
      // appui (secondToucher) : la même règle sur l'iPad et ailleurs
      if (this.dernierPointeur === 'touch' && (this.outil === 'selection' || this.doigtDeplace)) return
      // La Sélection vise comme son clic (l'intérieur d'une figure compris) ;
      // la Main et le Segment, le tracé seul, à la portée du pointeur
      const p = this.monde(e), pointeur = this.dernierPointeur
      const f = this.outil === 'selection' ? this.objetSous(p, this.ecran(e), { pointeur, dedans: true })
        : this.outil === 'main' || this.outil === 'segment' ? this.formeSous(p.x, p.y, TOLERANCE_PRISE[pointeur])
        : this.formeSous(p.x, p.y)
      if (f) this.ouvrirAuDouble(f, this.outil === 'selection' || this.outil === 'main' || this.outil === 'segment')
    })
    // Le clic que le navigateur tire du lever d'un appui long : Chrome (sous
    // Windows, au TNI, sur une Surface) en donne un, même après une seconde,
    // et il tomberait sur le menu qui vient de s'ouvrir sous le doigt (sa
    // poubelle…). Il ne fait rien. On le reconnaît à son pointeur (le clic
    // de Chrome porte celui du doigt) ; un navigateur qui n'en dit rien, au
    // clic qui suit le lever de tout près. Un vrai clic d'après passe.
    window.addEventListener('click', e => {
      const c = this.clicApresAppuiLong
      if (!c || !c.leve) return
      const id = (e as Partial<PointerEvent>).pointerId, depuis = performance.now() - c.leve
      const sien = id === c.pointeur || (id === undefined && depuis < 100)
      if (sien || depuis > 1000) this.clicApresAppuiLong = null
      if (sien) { e.preventDefault(); e.stopPropagation() }
    }, true)
    // Le clic que le navigateur tire du second appui d'un double appui
    // viserait ce qui vient de s'ouvrir sous le doigt ou le stylet (l'éditeur
    // d'une formule, qui se fermerait aussitôt) : il ne fait rien
    window.addEventListener('click', e => {
      if (!this.clicFantome) return
      this.clicFantome = false
      if (performance.now() - this.doubleTraite < 500 && !z.contains(e.target as Node)) { e.preventDefault(); e.stopPropagation() }
    }, true)
    window.addEventListener('keydown', e => this.clavier(e))
    window.addEventListener('keyup', e => { if (e.code === 'Space') this.espace = false })
    // Le calme (voir calme) : chaque appui, chaque lever, chaque touche le
    // remet à zéro ; en capture, avant que le geste ne commence ou ne finisse
    const geste = () => { this.finDuGeste = performance.now() }
    for (const t of ['pointerdown', 'pointerup', 'pointercancel'] as const) z.addEventListener(t, geste, true)
    window.addEventListener('keydown', geste, true)
  },

  /** Le rôle du doigt, choisi dans son menu */
  choisirDoigt(this: App, d: Doigt): void {
    reglerDoigt(d)
    this.majPoignees()
    this.rendu.toutRedessiner()
    this.ui?.maj()
  },

  /** Le contraste renforcé (lot 5), pour le vidéoprojecteur : retenu sur
   *  cet appareil, il change l'écran et lui seul (voir Rendu.contraste ; la
   *  feuille de style suit body.contraste, que pose l'interface) */
  choisirContraste(this: App, oui: boolean): void {
    reglerContraste(oui)
    this.rendu.contraste = oui
    this.rendu.toutRedessiner()
    this.ui?.maj()
  },

  /** Les ronds des poignées ne se montrent que là où on peut les prendre :
   *  avec l'outil Sélection, ou au doigt qui « déplace » */
  majPoignees(this: App): void {
    this.rendu.poigneesActives = this.outil === 'selection' || this.doigtDeplace
  },

  /** « Auto » : le premier stylet posé sur l'écran lui-même (iPad, Surface,
   *  tablette Android) fait passer le doigt en « déplace ». Une tablette
   *  graphique, sur un ordinateur dont l'écran n'est pas tactile, jamais. */
  detecterStylet(this: App): void {
    if (reglages.doigt !== 'auto' || reglages.styletDirect || !ecranTactile()) return
    noterStyletDirect(true)
    this.majPoignees()
    this.rendu.toutRedessiner()
    this.ui.maj()
    this.ui.message('Stylet détecté : le doigt déplace la vue', { libelle: 'Changer', faire: () => this.ui.ouvrirReglageDoigt() })
  },

  /** Une paume, quand le doigt ne dessine pas : un contact large, ou tout
   *  contact pendant que le stylet touche l'écran */
  paume(this: App, e: PointerEvent): boolean {
    if (e.pointerType !== 'touch' || !this.doigtDeplace) return false
    return contactLarge(e) || [...this.pointeurs.values()].some(p => p.type === 'pen')
  },

  /** Les doigts posés, dans l'ordre où ils sont arrivés */
  doigts(this: App): { id: number; x: number; y: number; }[] {
    return [...this.pointeurs].filter(([, p]) => p.type === 'touch').map(([id, p]) => ({ id, x: p.x, y: p.y }))
  },

  /** Un pincement des deux premiers doigts. parti : la vue suit déjà les
   *  doigts (un pincement réancré quand un troisième se lève) ; sinon elle
   *  attend qu'ils aient bougé (voir bouge) */
  pincement(this: App, doigts: DoigtPose[], parti = false): Geste {
    const [a, b] = doigts
    const dist = Math.hypot(a.x - b.x, a.y - b.y)
    return { type: 'pinch', dist, cx: (a.x + b.x) / 2, cy: (a.y + b.y) / 2, parti, depart: { a: { ...a }, b: { ...b }, dist } }
  },

  /** L'appui est-il devenu un glisser ? (voir SEUIL_GLISSER) */
  aGlisse(this: App, s: P): boolean { return depasseSeuil(this.depart, s.x, s.y) },

  // ---------- Appuyer, glisser, lever ----------
  /** Un appui. L'ordre compte : l'appui long d'un autre pointeur oublié, la
   *  paume écartée, le doigt noté pour le toucher à plusieurs doigts, le
   *  pointeur noté, le stylet qui reprend la main au doigt, deux doigts qui
   *  pincent ; puis, si rien n'est en cours, le clic droit qui ouvre un menu,
   *  un menu ouvert qui se ferme, le second toucher d'un double-clic, et
   *  enfin ce que fait le pointeur avec l'outil (et l'appui long qui s'arme) :
   *  le bord d'un instrument, un instrument, une poignée du cadre de taille
   *  ou sa pastille ↻ (lot 5), un sommet, puis l'objet. */
  bas(this: App, e: PointerEvent): void {
    // Le pointeur laser : un appui montre, il n'écrit ni ne prend rien
    if (this.laser) { e.preventDefault(); this.bougerLaser(this.monde(e)); return }
    const s = this.ecran(e)
    // Tout autre appui (le second doigt d'un pincement, une paume, le stylet)
    // n'est plus un appui long
    this.desarmerAppuiLong()
    // Le bout gomme du stylet (le stylet retourné) efface, quel que soit l'outil
    const gommeDuStylet = e.pointerType === 'pen' && (e.button === 5 || (e.buttons & 32) !== 0)
    // La paume, quand le doigt ne dessine pas : rien jusqu'à son lever, et ce
    // n'est pas un toucher à deux doigts
    if (this.paume(e)) { this.ignores.add(e.pointerId); this.toucherDoigts.oublier(); return }
    // Le toucher à deux ou trois doigts (voir gesteDesDoigts) se suit doigt
    // par doigt ; un stylet posé l'abandonne. Jamais pendant la revue.
    if (e.pointerType === 'touch' && !this.enLecture) this.toucherDoigts.poser(e.pointerId, s.x, s.y, heureDe(e))
    else this.toucherDoigts.oublier()
    // Un pointeur synthétique, ou déjà levé, refuse d'être capturé : le geste a lieu quand même
    try { this.zone.setPointerCapture(e.pointerId) } catch { /* sans capture */ }
    this.pointeurs.set(e.pointerId, { x: s.x, y: s.y, type: e.pointerType })
    this.dernierPointeur = typePointeur(e.pointerType)
    // Le cadre tel qu'il est à l'écran, peint pour le pointeur d'avant (un
    // doigt après la souris, le crayon après le doigt) : sa pastille se prend
    // là où on la voit (voir poigneeVisee)
    const peint = this.rendu.cadre
    this.voirPointeur(e.pointerType)

    // Le stylet : « Auto » apprend que l'écran se touche au stylet ; ce que
    // faisait le doigt (une paume posée juste avant, souvent) s'arrête là
    if (e.pointerType === 'pen') {
      this.detecterStylet()
      if (this.doigtDeplace && this.geste && (this.geste.type === 'pinch' || this.depart.type === 'touch')) this.laisserLeStylet()
    }

    // Deux doigts : pincer pour zoomer, quoi qu'on fût en train de faire
    const doigts = this.doigts()
    if (doigts.length === 2) {
      this.abandonnerGeste()
      this.geste = this.pincement(doigts)
      // La barre d'actions se cache le temps du pincement (voir enMouvement)
      if (this.selection.size) this.ui.maj()
      return
    }
    if (this.geste) return
    // Pendant qu'on rogne, l'appui est pour l'image (sauf pour déplacer la vue)
    if (this.rognage && e.button !== 1 && !this.espace) { this.basRognage(e, s); return }

    // Le clic droit (le bouton du stylet en est un ; sur Mac, Ctrl + clic) :
    // le menu complet, à l'APPUI du bouton, et aucun geste. Seulement quand
    // rien n'est en cours : un bouton pressé pendant un glisser ou un trait
    // n'envoie pas d'appui (le navigateur l'accorde au geste), il n'ouvre
    // rien. Le petit menu qui était ouvert vient de se fermer (menus.ts, en
    // capture) ; l'autre s'ouvre (voir demanderOptions).
    const droit = e.button === 2 || (MAC && e.ctrlKey && e.button === 0 && e.pointerType !== 'touch')
    if (droit) { this.demanderOptions(e, typePointeur(e.pointerType)); return }

    const m = this.monde(e)
    const doigt = e.pointerType === 'touch' && this.doigtDeplace
    // Déplacer la vue (bouton du milieu, Espace, outil Main) n'écrit jamais :
    // le menu d'un morceau et le panneau d'options restent (ils suivent la vue)
    const pan = e.button === 1 || this.espace || (this.outil === 'main' && !gommeDuStylet)
    // Un appui sur la page pendant qu'on tape un texte le finit, et rien d'autre
    // (le clic suivant, à l'outil Texte, en commence un autre)
    if (this.edition && !pan) { this.finirTexte(); return }
    // Le morceau visé se lit avant de fermer les menus : fermer le menu d'un
    // sommet oublie le morceau choisi, et l'appui sur un autre sommet de la
    // même figure doit le prendre
    const prise = this.priseSous(s, doigt ? { outil: 'selection' } : {})
    // Une poignée du cadre de taille ou sa pastille ↻ (lot 5), lue elle aussi
    // avant de fermer les menus : à l'outil Sélection, et au doigt qui
    // déplace sous les autres outils (voir poigneesDuCadre : jamais sous la
    // plume) ; la pastille dessinée pour un autre pointeur compte
    let poignee = e.button === 0 && !gommeDuStylet && !pan && (this.outil === 'selection' || doigt) ? this.poigneeVisee(s, peint) : null
    // Juste après un quart de tour d'un clic sur la pastille, un clic au même
    // endroit la reprend : elle a tourné avec l'objet, mais le second clic
    // d'un double-clic (un demi-tour) est encore pour elle
    const q = this.quartAuClic
    if (!poignee && q && e.button === 0 && !pan && performance.now() - q.t < 600 && Math.hypot(s.x - q.x, s.y - q.y) < 12) {
      const c = this.cadreDeLaSelection()
      if (c) poignee = { cadre: c, p: { quoi: 'pastille', i: q.i } }
    }

    // Un menu ouvert (un petit menu, celui d'un morceau, le panneau d'options,
    // la liste des instruments) : ce premier appui le ferme, sans encre. Il
    // continue seulement sur un instrument, sur un objet qu'on prend (outil
    // Sélection, doigt qui déplace), ou au Stylo : le trait commence (on ne
    // perd pas la première lettre), mais un simple appui ne posera rien.
    // L'objet dont le menu est ouvert, qu'on prend pour le déplacer, le
    // garde : il reparaît au lever (le menu commun d'une sélection de
    // plusieurs objets, quand on en prend un). Un clic attendu par le menu
    // (Désigner, Tracer un axe ou un centre) est pour lui : le menu reste.
    const prend = this.outil === 'selection' || doigt
    const pointeur = typePointeur(e.pointerType)
    const vise = prend ? this.objetSous(m, s, { pointeur, dedans: true }) : null
    const garder = (!!vise && (this.options === TOUTE_LA_SELECTION ? this.selection.has(vise.id) : vise.id === this.options))
      || (!!poignee && this.options !== null)
    const apresMenu = !pan && !this.placement && (avale(e) || this.ui.fermerMenus(garder))
    if (apresMenu) {
      // Deux doigts posés pour fermer un menu n'annulent rien
      this.toucherDoigts.oublier()
      const continuer = e.button === 0 && !gommeDuStylet && (
        (this.instruments.size > 0 && !!this.instrumentSous(m))
        || (prend && (!!prise || !!vise || !!poignee))
        || (!doigt && (this.outil === 'stylo' || this.outil === 'surligneur')))
      if (!continuer) return
    }

    // Le point d'un simple toucher au Stylo sur un objet attend peut-être ce
    // second toucher (le double-clic, voir secondClic). Tout autre appui le
    // pose d'abord, à sa place dans l'historique.
    if (this.pointEnAttente && (pan || !!apresMenu || !this.secondClic(e, s, doigt || gommeDuStylet))) this.viderPointEnAttente()
    // Le second toucher d'un double appui au doigt (outil Sélection, ou doigt
    // qui déplace) : noté ici, il ouvrira les options de l'objet à son lever
    this.secondToucher(e, s, m)

    this.depart = nouveauDepart(s.x, s.y, e.pointerId, e.pointerType, performance.now())
    // Le corps d'une calculatrice, pris dans son cadre (voir saisirCalculatrice) :
    // elle se déplace, sous tous les outils
    const saisie = this.calculatriceSaisie ? this.forme(this.calculatriceSaisie) : null
    if (saisie?.type === 'image') { this.deplacerCalculatrice(saisie, m); return }
    if (pan) {
      this.geste = { type: 'pan', dernierX: s.x, dernierY: s.y }
      // L'outil Main au doigt qui « déplace » : l'appui long y ouvre le menu,
      // comme sous les autres outils (voir armerAppuiLong)
      if (this.outil === 'main' && e.button === 0) this.armerAppuiLong(e)
      return
    }
    if (e.button !== 0 && !gommeDuStylet) return

    // Un clic attendu (où commencer une construction, Désigner, Tracer un axe
    // ou un centre) : c'est celui-ci. Au doigt « qui déplace », c'est son
    // lever, s'il n'a pas glissé (voir basDoigt) : glissé, il déplace la vue
    // pour chercher la place.
    if (this.placement && !doigt) { const p = this.placement; this.placement = null; p.clic(m); return }
    this.tableau.nouveauGeste()
    // Le bout gomme passe avant tout le reste : le bord d'un instrument, les
    // instruments, les sommets. L'outil en main ne change pas.
    if (gommeDuStylet) { this.commencerGomme(m, true); return }
    // Le doigt qui « déplace » a son propre geste sous les autres outils. À la
    // Sélection, il fait comme la souris et le stylet (un doigt qui glisse dans
    // le vide trace un lasso, la vue se déplace à deux doigts), sauf quand un
    // clic est attendu : il cherche alors la place en déplaçant la vue.
    if (doigt && (this.outil !== 'selection' || this.placement)) { this.basDoigt(e, s, m, prise, poignee); this.armerAppuiLong(e); return }
    // Le crayon posé contre le bord d'un instrument trace le long du bord.
    // Sauf sur une pastille ↻ : à petit zoom, la portée du bord l'atteindrait
    // (celle du rapporteur est dans le prolongement de son bord)
    const dessine = this.outil === 'stylo' || this.outil === 'segment'
    const pastille = dessine && this.instruments.size ? this.instrumentSous(m)?.quoi === 'rotation' : false
    const bord = dessine && !pastille ? this.bordSous(m) : null
    if (bord) {
      const t0 = bord.bord.gradue ? Math.round(Math.max(bord.bord.debut, Math.min(bord.bord.fin, bord.t)) / 4) * 4 : bord.t
      this.geste = { type: 'longer', bord: bord.bord, t0 }
      this.geste_longer(this.geste, m)
      return
    }
    // Un instrument : on le déplace, on le tourne, on écarte ou on tourne le compas
    const inst = this.instrumentSous(m)
    if (inst) { this.prendreInstrument(inst, m); return }
    // Une poignée du cadre de taille, sa pastille ↻ (lot 5) : avant les sommets
    if (poignee) { this.prendreCadre(poignee, m); return }
    // Un morceau de la figure sélectionnée (outil Sélection) : son nom, un sommet, son rayon
    if (prise) { this.prendrePoignee(prise); return }
    // La bande du nom d'une calculatrice (voir calculatrice/) : elle se prend
    // et se glisse sous tous les outils, comme à la Sélection
    const bande = this.outil !== 'selection' ? this.bandeDeCalculatrice(m) : null
    if (bande) { this.deplacerCalculatrice(bande, m); return }
    this.ui.fermerMenuPartie()
    if (this.partie) this.choisirPartie(null)
    // Sous un outil de dessin, ce qui restait sélectionné (une copie, une
    // image importée, l'objet dont on a ouvert les options) ne l'est plus
    if (this.outil !== 'selection' && this.selection.size) {
      this.selection.clear(); this.rendu.redessinerDirect(); this.ui.maj()
    }
    switch (this.outil) {
      case 'stylo':
      case 'surligneur': {
        const surligneur = this.outil === 'surligneur'
        this.rendu.monTrait = {
          pts: [m.x, m.y, e.pointerType === 'pen' ? e.pressure : 0.5],
          couleur: this.couleur,
          taille: surligneur ? this.tailleSurligneur * 5 : this.taille,
          opacite: surligneur ? 0.35 : 1,
          pression: e.pointerType === 'pen' && !surligneur,
        }
        this.heuresDuTrait = [heureDe(e)]
        // Parti d'une figure ou d'une formule (même sous ce qu'on a écrit
        // dessus) : un simple toucher y attendra peut-être un second (le
        // double-clic qui ouvre ses options)
        const surObjet = this.formeSous(m.x, m.y, 6, f => f.type === 'polygone' || f.type === 'cercle' || f.type === 'formule')?.id
        this.geste = { type: 'dessin', pointeur: e.pointerId, apresMenu: apresMenu || undefined, surObjet, second: !!this.pointEnAttente || undefined }
        this.dernierMouvement = performance.now()
        this.immobilite = new Immobilite(m)
        this.attendreImmobilite()
        this.rendu.redessinerDirect()
        break
      }
      case 'segment': {
        // Second clic d'un trait en deux clics : il le finit
        if (this.traitEnAttente) { this.ecrireOuRetenir(e, m, s); break }
        const a = this.accrocher(m).p
        this.geste = { type: 'segment', x: a.x, y: a.y }
        this.rendu.monSegment = { x1: a.x, y1: a.y, x2: a.x, y2: a.y, couleur: this.couleur, taille: this.taille }
        break
      }
      case 'forme': {
        if (this.typeForme === 'polygone') { this.ecrireOuRetenir(e, m, s); break }
        const a = this.aimanter(m)
        this.geste = { type: this.typeForme, x: a.x, y: a.y }
        break
      }
      case 'point':
      case 'gomme': this.ecrireOuRetenir(e, m, s); break
      case 'selection': {
        const c = this.cibleSous(m, s, { pointeur, dedans: true })
        // Maj + clic, ou Ctrl + clic (⌘ sur Mac, où Ctrl + clic est un clic
        // droit), ou le mode « Ajouter » au doigt : l'objet entre dans la
        // sélection, ou en sort ; un cadre ou un lasso s'y ajoute
        const ajout = e.shiftKey || (MAC ? e.metaKey : e.ctrlKey) || this.ajoutTactile
        // Saisir ou entourer. Un objet qu'on saisit (tout près de son tracé, par
        // un morceau, par un plein) ou déjà sélectionné se glisse. Sinon, même
        // si l'appui touche quelque chose (l'intérieur d'une figure fermée sans
        // fond, un tracé un peu plus loin), glisser entoure : on prend ce qu'on
        // a écrit dans un grand cadre, ou un mot dont on part à 15 px, comme
        // on s'y attend ; levé sans glisser, l'appui prend l'objet.
        // Un membre d'un groupe prend tout son groupe (lot 5, voir prendre) ;
        // Maj + clic l'ajoute ou le retire en entier. Un clic simple sur un
        // membre du groupe qui est exactement la sélection ne prendra que lui
        // à son lever (glissé, il emporte tout le groupe) ; une sélection qui
        // a le groupe ET d'autres objets n'est jamais réduite (un clic dans
        // une sélection de plusieurs la garde).
        if (c && (this.saisi(c, pointeur) || this.selection.has(c.f.id))) {
          const f = c.f
          const deja = this.selection.has(f.id)
          const retirer = ajout && deja ? this.membres(f).map(g => g.id) : undefined
          const seul = !ajout && deja && f.groupe && groupeExact(this.formes, this.selection)?.includes(f) ? f.id : undefined
          if (!deja) this.prendre(f, ajout)
          this.direOptions()
          this.geste = { type: 'deplacer', x: m.x, y: m.y, bouge: false, retirer, seul }
        } else {
          // Un cadre à la souris (le pavé tactile en est une), un lasso libre au
          // stylet (tablette graphique comprise) et au doigt
          this.geste = { type: 'zone', forme: e.pointerType === 'mouse' ? 'cadre' : 'lasso', x: m.x, y: m.y, pts: [m.x, m.y], ajout, candidat: c?.f.id }
        }
        this.armerAppuiLong(e)
        this.rendu.redessinerDirect(); this.ui.maj()
        break
      }
      case 'formule':
        this.geste = { type: 'formule' }
        break
      case 'texte':
        this.geste = { type: 'texte', x: m.x, y: m.y }
        break
    }
  },

  /** Le doigt qui « déplace et sélectionne », sous un autre outil que la
   *  Sélection (ou quand un clic est attendu) : jamais d'encre. Il prend un
   *  instrument, une poignée du cadre de taille ou sa pastille (poignee, lu
   *  par bas() : lot 5), un morceau de la figure sélectionnée (prise, lu par bas()),
   *  ou ce qui est déjà sélectionné pour le déplacer ; ailleurs, même sur un
   *  objet, il déplace la vue (un doigt qui traverse une page chargée
   *  n'emporte pas un trait). Levé sans avoir glissé, il choisit l'objet
   *  touché (voir toucherObjet). Quand un clic est attendu (voir placement),
   *  il déplace la vue, ou, levé sans avoir glissé, il fait ce clic. */
  basDoigt(this: App, e: PointerEvent, s: P, m: P, prise: { prise: Prise; f: Figure } | null, poignee: { cadre: Cadre; p: Poignee } | null = null): void {
    if (this.placement) { this.geste = { type: 'pan', dernierX: s.x, dernierY: s.y, pointeur: e.pointerId, toucher: true }; return }
    const inst = this.instruments.size ? this.instrumentSous(m) : null
    if (inst) { this.prendreInstrument(inst, m); return }
    // Une poignée du cadre de taille, sa pastille ↻ (lot 5) : avant les sommets
    if (poignee) { this.prendreCadre(poignee, m); return }
    if (prise) { this.prendrePoignee(prise); return }
    // Glisser n'emporte qu'un objet sélectionné saisi par son tracé (ou son
    // plein) : un doigt qui fait défiler en partant du milieu d'un grand cadre
    // sélectionné déplace la vue, pas le cadre
    const c = this.cibleSous(m, s, { pointeur: 'touch', dedans: false })
    if (c && this.selection.has(c.f.id) && this.saisi(c, 'touch')) { this.geste = { type: 'deplacer', x: m.x, y: m.y, bouge: false, doigt: true }; return }
    this.geste = { type: 'pan', dernierX: s.x, dernierY: s.y, pointeur: e.pointerId, toucher: true }
  },

  // ---------- Le premier doigt d'un outil qui écrit dès l'appui ----------
  /** La Gomme efface ce qu'elle touche, le Point se pose, le Polygone prend
   *  un sommet, le second clic du Segment finit le trait : ces outils écrivent
   *  dès l'appui. Au doigt qui dessine, les gestes à deux doigts allumés, le
   *  premier doigt attend un peu (TOUCHER_DOIGTS.arrivee) : sans cela, le
   *  toucher à deux doigts défairait ce que le premier vient de faire, au
   *  lieu du geste d'avant. Un second doigt pendant l'attente fait un
   *  pincement (abandonnerGeste efface la minuterie) : rien n'est écrit.
   *  Sinon, l'appui fait ce qu'il a toujours fait, au premier de ces moments :
   *  l'échéance, le seuil du glisser passé (voir bouge), le lever (voir
   *  leverGeste). Le Stylo et le Surligneur n'attendent pas : leur encre part
   *  tout de suite, et le pincement la jette déjà. */
  ecrireOuRetenir(this: App, e: PointerEvent, m: P, s: P): void {
    if (e.pointerType !== 'touch' || !reglages.gestes) { this.ecrireDesLAppui(m, s, e.shiftKey); return }
    const g: Extract<Geste, { type: 'retenu' }> = { type: 'retenu', m, s, maj: e.shiftKey, pointeur: e.pointerId, minuterie: 0 }
    g.minuterie = window.setTimeout(() => { if (this.geste === g) this.lancerRetenu(g) }, TOUCHER_DOIGTS.arrivee)
    this.geste = g
  },

  /** Ce que fait l'appui de ces outils (m, s : le point de l'appui, dans le
   *  monde et à l'écran ; maj : Maj tenue) */
  ecrireDesLAppui(this: App, m: P, s: P, maj: boolean): void {
    switch (this.outil) {
      case 'point': this.placerPoint(m); break
      case 'gomme': this.commencerGomme(m, false); break
      case 'forme': if (this.typeForme === 'polygone') this.pointDuPolygone(this.accrocher(m).p, s); break
      case 'segment': {
        const a = this.traitEnAttente
        if (!a) break
        this.traitEnAttente = null
        this.finirTrait(a, this.boutDuTrait(a, m, maj))
        break
      }
    }
  },

  /** Le doigt retenu agit enfin : la Gomme devient le geste en cours (elle
   *  efface ce que le doigt traverse ensuite), le reste est fait */
  lancerRetenu(this: App, g: Extract<Geste, { type: 'retenu' }>): void {
    clearTimeout(g.minuterie)
    if (this.geste === g) this.geste = null
    this.tableau.nouveauGeste()
    this.ecrireDesLAppui(g.m, g.s, g.maj)
  },
}
