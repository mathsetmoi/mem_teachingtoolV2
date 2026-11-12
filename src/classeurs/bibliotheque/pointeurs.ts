// =============================================================
// LA BIBLIOTHÈQUE : LES DOSSIERS ET LE FILTRE, LE CLAVIER, LES POINTEURS, GLISSER UNE CARTE
// Des méthodes de la classe Bibliotheque (src/classeurs/bibliotheque.ts), rangées ici par sujet :
// elles s'ajoutent à la classe à la fin de bibliotheque.ts (ajouterMethodes).
// =============================================================
import type { Bibliotheque } from '../bibliotheque'
import { avale, fermerMenu } from '../../menus'
import { MAC } from '../../navigateur'
import { lignesDe } from '../../pages/glisser'
import { APPUI_LONG, SEUIL_GLISSER, ecranTactile, typePointeur } from '../../pointeurs'
import { parentAffiche } from '../arbre'
import { APRES_GLISSER, CASE, DOSSIER, DOUBLE_CLIC_NOM, FANTOME, FOCUSABLE } from '../bibliotheque'
import type { Appui, Glisse, Liste } from '../bibliotheque'
import { cibleSous, interdits, objetClasseur, objetDossier } from '../deplacer'

export const methodesPointeurs = {
  // ---------- Se promener dans les dossiers, filtrer ----------
  /** Va dans un dossier (null : la racine) ; le focus va à la carte du
   *  dossier d'où l'on vient (en remontant), sinon à la première carte, ou
   *  au « Nouveau classeur » d'un dossier vide */
  allerA(this: Bibliotheque, dossierId: string | null, venuDe: string | null = null): void {
    if (dossierId !== null && !this.dossiers.has(dossierId)) return
    this.annulerClicNom()
    this.finirSaisie(true)
    if (this.filtre !== null) this.changerFiltre(null)
    const descend = dossierId !== null && venuDe === null
    this.changerDossier(dossierId)
    this.rendre(null)
    if (descend) this.corps.scrollTop = 0
    const l = this.tous
    const cible = venuDe !== null && l.cartes.has(DOSSIER + venuDe) ? DOSSIER + venuDe : l.ordre[0]
    if (cible) this.focusCarte(l, cible)
    else this.videDossier.querySelector<HTMLElement>('button')?.focus()
  },

  /** Retour arrière : le dossier au-dessus */
  remonter(this: Bibliotheque): void {
    const ici = this.dossierAffiche
    if (ici === null) return
    const d = this.dossiers.get(ici)
    this.allerA(d ? parentAffiche(d, this.dossiers) : null, ici)
  },

  /** Une étiquette de la rangée du filtre (null : Toutes) */
  choisirFiltre(this: Bibliotheque, nom: string | null): void {
    this.annulerClicNom()
    this.finirSaisie(true)
    this.changerFiltre(nom)
    this.rendre(null)
  },

  // ---------- Le clavier ----------
  listeDe(this: Bibliotheque, x: Element): Liste | undefined {
    return this.listes.find(l => l.el.contains(x))
  },

  /** Le focus va à une carte, classeur ou dossier (un seul arrêt de Tab par rangée) */
  focusCarte(this: Bibliotheque, l: Liste, cle: string, defiler = true): void {
    const c = l.cartes.get(cle)
    if (!c) return
    if (l.focusId !== cle) {
      const avant = l.focusId ? l.cartes.get(l.focusId) : null
      const aa = avant?.querySelector<HTMLElement>(FOCUSABLE)
      if (aa) aa.tabIndex = -1
      l.focusId = cle
    }
    const a = c.querySelector<HTMLElement>(FOCUSABLE)!
    a.tabIndex = 0
    a.focus({ preventScroll: !defiler })
  },

  /** ↑ ↓ : la carte de la ligne d'avant ou d'après la plus proche en x,
   *  selon la mise en page réelle (au téléphone, « Récents » est une seule
   *  ligne qui défile : rien) */
  carteVoisine(this: Bibliotheque, l: Liste, id: string, sens: 1 | -1): string | null {
    const rects = l.ordre.map(x => { const r = l.cartes.get(x)!.getBoundingClientRect(); return { x: r.left, y: r.top, l: r.width, h: r.height } })
    const lignes = lignesDe(rects), i = l.ordre.indexOf(id)
    const k = lignes.findIndex(x => x.includes(i))
    const ligne = lignes[k + sens]
    if (k < 0 || !ligne) return null
    const cx = rects[i].x + rects[i].l / 2
    let meilleur = ligne[0]
    for (const j of ligne) if (Math.abs(rects[j].x + rects[j].l / 2 - cx) < Math.abs(rects[meilleur].x + rects[meilleur].l / 2 - cx)) meilleur = j
    return l.ordre[meilleur]
  },

  // ---------- Les pointeurs ----------
  /** Le clic simple d'une carte (souris, plume de la tablette, toucher bref,
   *  Entrée) ouvre le classeur, ou entre dans le dossier ; sur le nom, on
   *  attend un instant qu'un second clic en fasse un double-clic (renommer).
   *  Ctrl, Maj ou ⌘ + clic et le clic du milieu sur un classeur restent au
   *  navigateur (un autre onglet, une autre fenêtre). Le clic droit et le
   *  bouton du stylet, à l'APPUI, ouvrent le menu de la carte, là où l'on a
   *  appuyé (sur Mac, Ctrl + clic aussi) : ils ne tirent rien. L'appui qui
   *  vient de fermer un menu ne fait rien d'autre.
   *  Glisser une carte (lot 4 C7), comme dans la trieuse des pages : à la
   *  souris et à la tablette graphique (un stylet sans écran tactile : la
   *  Wacom de la classe), de n'importe où sur la carte, dès 4 px (6 au
   *  stylet), sans appui long ; au doigt et au stylet posé sur l'écran,
   *  seulement par la poignée ⋮⋮ (dès 8 px) ou après un appui long (500 ms
   *  sans bouger de plus de 8 px, une petite vibration) : sinon le doigt
   *  fait défiler (touch-action: pan-y), et deux doigts aussi, sans rien
   *  ouvrir. Le clic qui suit un glisser ne fait rien. */
  brancherPointeurs(this: Bibliotheque): void {
    const c = this.corps
    c.addEventListener('pointerdown', e => this.surBas(e))
    c.addEventListener('pointermove', e => this.surBouge(e))
    c.addEventListener('pointerup', e => this.surLeve(e, false))
    c.addEventListener('pointercancel', e => this.surLeve(e, true))
    // La grille perd le pointeur qu'elle tenait (pas la carte qui le lui
    // passe au début d'un glisser au doigt) : le glisser s'arrête, rien ne bouge
    c.addEventListener('lostpointercapture', e => { if (e.target === c && this.glisse?.id === e.pointerId) this.annulerGlisser() })
    // Deux doigts qui glissent font défiler, comme un seul (au TNI, la main
    // entière se pose souvent) : touch-action: pan-y interdit au navigateur
    // les gestes à plusieurs doigts (pour que le pincement n'agrandisse pas
    // la page), on le fait ici, comme dans la trieuse. Le second doigt arrête
    // le toucher du premier (ni classeur ouvert, ni appui long). Une carte
    // qu'on tire (à la souris, avec une paume posée sur le TNI) continue
    // seule, et rien ne défile sous elle.
    const surLeCorps = (e: TouchEvent) => [...e.touches].filter(t => t.target instanceof Node && c.contains(t.target))
    const hauteur = (l: Touch[]) => l.reduce((x, t) => x + t.clientY, 0) / l.length
    c.addEventListener('touchstart', e => {
      const l = surLeCorps(e)
      if (l.length < 2 || this.glisse) return
      if (this.appui?.direct) this.annulerAppui()
      this.annulerClicNom()
      this.deuxDoigts = { y: hauteur(l) }
      this.avalerClicJusqua = performance.now() + 800
    }, { passive: true })
    c.addEventListener('touchmove', e => {
      if (this.glisse || (this.appui?.arme && this.appui.direct)) { if (e.cancelable) e.preventDefault(); return }
      const l = surLeCorps(e), d = this.deuxDoigts
      if (!d || l.length < 2) return
      const y = hauteur(l)
      if (e.cancelable) { e.preventDefault(); c.scrollTop -= y - d.y }
      d.y = y
      this.avalerClicJusqua = performance.now() + 800
    }, { passive: false })
    const leve = (e: TouchEvent) => {
      const l = surLeCorps(e)
      if (l.length < 2) this.deuxDoigts = null
      else if (this.deuxDoigts) this.deuxDoigts.y = hauteur(l)
    }
    c.addEventListener('touchend', leve)
    c.addEventListener('touchcancel', leve)
    c.addEventListener('click', e => {
      const cible = e.target as HTMLElement
      const lien = cible.closest<HTMLElement>('a.carte-classeur, button.carte-dossier')
      const id = lien?.closest<HTMLElement>(CASE)?.dataset.cle
      if (!lien || !id) return
      const dossier = id.startsWith(DOSSIER)
      // Sur Mac, Ctrl + clic est le clic droit (le menu est déjà ouvert)
      if (MAC && e.ctrlKey) { e.preventDefault(); return }
      if (!dossier && (e.ctrlKey || e.metaKey || e.shiftKey || e.altKey)) return
      if (e.button !== 0) return
      e.preventDefault()
      const a = this.appuiLeve
      this.appuiLeve = null
      if (e.detail !== 0 && a && a.carte === id && (a.avale || a.bouge || (a.type === 'touch' && performance.now() - a.t0 > APPUI_LONG))) return
      const x = e.clientX, y = e.clientY, souris = e.detail !== 0
      const agir = () => {
        if (dossier) { this.allerA(id.slice(DOSSIER.length)); return }
        const f = this.fiches.get(id)
        if (f) void this.ouvrirClasseur(f, souris ? { x, y } : {})
      }
      // Sur le nom : un double-clic le renomme
      if (souris && cible.closest('.carte-nom-classeur, .carte-nom-dossier')) {
        if (this.clicNom?.cle === id) { this.annulerClicNom(); this.renommer(id); return }
        this.annulerClicNom()
        this.clicNom = { cle: id, minuterie: window.setTimeout(() => {
          this.clicNom = null
          if (this.ouvert && !this.occupe && !this.depart && !document.querySelector('dialog[open]')) agir()
        }, DOUBLE_CLIC_NOM) }
        return
      }
      this.annulerClicNom()
      agir()
    })
  },

  surBas(this: Bibliotheque, e: PointerEvent): void {
    // Une carte qu'on tire continue seule : une paume posée sur le TNI, un
    // second doigt n'y changent rien
    if (this.glisse) return
    // Un nouvel appui : le lever d'un glisser arrêté ne viendra plus
    this.pointeurFini = null
    const cible = e.target as HTMLElement
    const carte = cible.closest<HTMLElement>(CASE)
    const id = carte?.dataset.cle
    if (!carte || !id || cible.closest('.carte-saisie')) return
    const droit = e.button === 2 || (MAC && e.ctrlKey && e.button === 0 && e.pointerType !== 'touch')
    const ligneSeance = cible.closest<HTMLElement>('.carte-seance-ligne')
    if (droit && ligneSeance?.dataset.seance) {
      e.preventDefault()
      this.ouvrirMenuSeance(id, ligneSeance.dataset.seance, { x: e.clientX, y: e.clientY })
      return
    }
    if (droit) {
      e.preventDefault()
      const l = this.listeDe(carte)
      if (l) this.focusCarte(l, id, false)
      this.ouvrirMenuCarte(id, { x: e.clientX, y: e.clientY })
      return
    }
    if (cible.closest('.options-classeur, .carte-seances-bascule, .carte-seances-liste') || e.button !== 0) return
    // Un second doigt : rien (voir touchstart, qui arrête le premier)
    if (this.appui) return
    const l = this.listeDe(carte)
    if (!l) return
    this.focusCarte(l, id, false)
    const type = typePointeur(e.pointerType)
    const direct = type === 'touch' || (type === 'pen' && ecranTactile())
    const poignee = !!cible.closest('.biblio-poignee')
    const ferme = avale(e)
    const a: Appui = { id: e.pointerId, carte: id, li: carte, liste: l, type, direct, x0: e.clientX, y0: e.clientY, t0: performance.now(),
      bouge: false, avale: ferme, arme: !ferme && (!direct || poignee), minuterie: 0 }
    if (direct && !a.arme && !ferme) a.minuterie = window.setTimeout(() => this.appuiLong(a), APPUI_LONG)
    this.appui = a
  },

  /** L'appui long du doigt : la carte se soulève, prête à suivre le doigt */
  appuiLong(this: Bibliotheque, a: Appui): void {
    if (this.appui !== a || a.bouge || this.glisse || !this.ouvert) return
    a.arme = true
    this.annulerClicNom()
    try { navigator.vibrate?.(10) } catch { /* pas de vibreur */ }
    this.commencerGlisser(a, a.x0, a.y0)
  },

  surBouge(this: Bibliotheque, e: PointerEvent): void {
    const g = this.glisse
    if (g) { if (e.pointerId === g.id) { g.x = e.clientX; g.y = e.clientY; this.suivreGlisser() } return }
    const a = this.appui
    if (!a || a.id !== e.pointerId) return
    const d = Math.hypot(e.clientX - a.x0, e.clientY - a.y0)
    if (!a.arme) {
      // Le doigt part avant l'appui long : il fait défiler, ce n'est plus un toucher
      if (d > (a.direct ? SEUIL_GLISSER.touch : SEUIL_GLISSER[a.type])) { a.bouge = true; clearTimeout(a.minuterie) }
      return
    }
    const seuil = a.direct ? SEUIL_GLISSER.touch : SEUIL_GLISSER[a.type]
    if (d >= seuil) { a.bouge = true; this.commencerGlisser(a, e.clientX, e.clientY) }
  },

  surLeve(this: Bibliotheque, e: PointerEvent, annule: boolean): void {
    if (this.glisse?.id === e.pointerId) { if (annule) this.annulerGlisser(false); else void this.lacher(); return }
    // Le lever d'un glisser arrêté par Échap : son clic ne fait rien
    if (this.pointeurFini === e.pointerId) { this.pointeurFini = null; this.avalerClicJusqua = performance.now() + APRES_GLISSER; return }
    const a = this.appui
    if (!a || a.id !== e.pointerId) return
    this.annulerAppui()
    // Le clic, qui vient juste après, le relit
    if (!annule) this.appuiLeve = a
  },

  annulerAppui(this: Bibliotheque): void {
    const a = this.appui
    if (!a) return
    clearTimeout(a.minuterie)
    this.appui = null
  },

  // ---------- Glisser une carte (lot 4 C7) ----------
  /** Les cibles du glisser, telles qu'on les voit : les éléments du fil
   *  d'Ariane (les dossiers au-dessus, « Bibliothèque », et celui où l'on
   *  est), puis les cartes des dossiers de la grille. Avec un filtre de
   *  niveau (une liste plate), il n'y en a pas. */
  ciblesDuGlisser(this: Bibliotheque): { id: string | null; el: HTMLElement }[] {
    const r: { id: string | null; el: HTMLElement }[] = []
    if (this.filtre !== null) return r
    for (const x of this.filEl.querySelectorAll<HTMLElement>('[data-dossier]')) r.push({ id: x.dataset.dossier || null, el: x })
    for (const [cle, li] of this.tous.cartes) if (cle.startsWith(DOSSIER)) r.push({ id: cle.slice(DOSSIER.length), el: li })
    return r
  },

  /** La carte part : elle s'estompe, son image suit le pointeur, les cibles
   *  possibles s'éclairent (jamais elle-même, ni, pour un dossier, l'un de
   *  ses descendants, ni le dossier où elle est déjà), la grille défile près
   *  de son bord */
  commencerGlisser(this: Bibliotheque, a: Appui, x: number, y: number): void {
    this.annulerAppui()
    if (this.menuCarte || this.menuBandeauOuvert || this.menuTriOuvert) fermerMenu()
    this.finirSaisie(true)
    this.annulerClicNom()
    const cle = a.carte, dossier = cle.startsWith(DOSSIER)
    const f = dossier ? undefined : this.fiches.get(cle)
    const d = dossier ? this.dossiers.get(cle.slice(DOSSIER.length)) : undefined
    if ((!f && !d) || !a.li.isConnected) return
    const objet = f ? objetClasseur(f) : objetDossier(d!)
    const li = a.li, r = li.getBoundingClientRect()
    const fantome = li.cloneNode(true) as HTMLElement
    fantome.classList.add('biblio-fantome')
    fantome.classList.remove('ouvert-ici')
    for (const x of [fantome, ...fantome.querySelectorAll<HTMLElement>('*')]) {
      for (const k of ['data-cle', 'data-id', 'data-dossier', 'tabindex', 'aria-label', 'aria-current', 'href', 'title']) x.removeAttribute(k)
    }
    fantome.querySelector('.options-classeur')?.remove()
    fantome.querySelector('.carte-seances-bascule')?.remove()
    fantome.querySelector('.carte-seances-liste')?.remove()
    fantome.querySelector('.biblio-poignee')?.remove()
    fantome.querySelector('.carte-saisie')?.remove()
    fantome.setAttribute('aria-hidden', 'true')
    fantome.inert = true
    fantome.style.width = r.width + 'px'; fantome.style.height = r.height + 'px'
    this.el.appendChild(fantome)
    li.classList.add('tiree')
    this.el.classList.add('en-glisser')
    const refus = interdits(objet, this.dossiers)
    const cibles = this.ciblesDuGlisser()
    for (const c of cibles) c.el.classList.toggle('cible-possible', !refus.has(c.id))
    this.glisse = { id: a.id, cle, li, fantome, objet, refus, cibles, sous: null, dx: a.x0 - r.left, dy: a.y0 - r.top, x, y, reste: 0 }
    try { this.corps.setPointerCapture(a.id) } catch { /* pointeur déjà parti */ }
    this.suivreGlisser()
    cancelAnimationFrame(this.boucle)
    this.boucle = requestAnimationFrame(this.defiler)
  },

  /** L'image suit le pointeur ; la cible sous lui s'éclaire davantage (dans
   *  ce qu'on voit de la grille : une carte passée sous le bandeau n'en est
   *  plus une) */
  suivreGlisser(this: Bibliotheque): void {
    const g = this.glisse
    if (!g) return
    // Réduite, tenue là où on l'a prise : la cible sous le pointeur reste visible
    g.fantome.style.transform = `translate(${g.x - g.dx * FANTOME}px, ${g.y - g.dy * FANTOME}px) scale(${FANTOME}) rotate(1.5deg)`
    const corps = this.corps.getBoundingClientRect()
    const zones = g.cibles.map(c => {
      const r = c.el.getBoundingClientRect()
      const x1 = Math.max(r.left, corps.left), y1 = Math.max(r.top, corps.top), x2 = Math.min(r.right, corps.right), y2 = Math.min(r.bottom, corps.bottom)
      return { id: c.id, x: x1, y: y1, l: Math.max(0, x2 - x1), h: Math.max(0, y2 - y1) }
    })
    const z = cibleSous(g.x, g.y, zones, g.refus)
    const sous = z ? g.cibles.find(c => c.id === z.id) ?? null : null
    if (sous === g.sous) return
    g.sous?.el.classList.remove('cible-sous')
    sous?.el.classList.add('cible-sous')
    g.sous = sous
  },

  /** Le glisser s'arrête : l'image s'en va, la carte et les cibles
   *  reviennent ; ce que les autres onglets ont changé entre-temps se fait */
  finirGlisser(this: Bibliotheque): Glisse | null {
    const g = this.glisse
    if (!g) return null
    this.glisse = null
    cancelAnimationFrame(this.boucle); this.boucle = 0
    g.fantome.remove()
    g.li.classList.remove('tiree')
    for (const c of g.cibles) c.el.classList.remove('cible-possible', 'cible-sous')
    this.el.classList.remove('en-glisser')
    try { if (this.corps.hasPointerCapture(g.id)) this.corps.releasePointerCapture(g.id) } catch { /* déjà relâché */ }
    if (this.ouvert) void this.appliquer()
    return g
  },

  /** Échap, pointercancel, la bibliothèque qui se ferme : rien ne bouge ;
   *  le lever qui suit (le pointeur encore posé : leverAttendu) ne fait rien */
  annulerGlisser(this: Bibliotheque, leverAttendu = true): void {
    const g = this.finirGlisser()
    if (g && leverAttendu) this.pointeurFini = g.id
  },

  /** Le lâcher : sur une cible, comme « Déplacer vers… » (la cible est
   *  relue : partie entre-temps, « Ce dossier n'existe plus. ») ; ailleurs,
   *  rien ne bouge. Le clic qui suit ne fait rien. */
  async lacher(this: Bibliotheque): Promise<void> {
    const g = this.finirGlisser()
    if (!g) return
    this.avalerClicJusqua = performance.now() + APRES_GLISSER
    if (!g.sous) return
    await this.deplacerVers(g.cle, g.sous.id)
  },

  annulerClicNom(this: Bibliotheque): void {
    if (!this.clicNom) return
    clearTimeout(this.clicNom.minuterie)
    this.clicNom = null
  },
}
