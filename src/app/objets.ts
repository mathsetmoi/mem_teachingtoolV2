// =============================================================
// L'APP : COPIER, L'ORDRE, PROTÉGER, LA TAILLE, LE CADRE, ROGNER
// Des méthodes de la classe App (src/app.ts), rangées ici par sujet :
// elles s'ajoutent à la classe à la fin de app.ts (ajouterMethodes).
// =============================================================
import type { App } from '../app'
import { RIEN_A_ORDONNER, SelectionSuivie, union } from '../app'
import type { Geste } from '../app'
import { IDENTITE, bornesEchelle, cadreTransforme, composer, curseurPoignee, dansLesBornes, estIdentite, etendueDuCadre, facteurDe, imageTournee, inverser, matriceImage, poigneeDeLAppui, quartDeTour, redresser, transformerForme, zonePastille, zonesDesPoignees } from '../cadre'
import type { Cadre, Matrice, Poignee } from '../cadre'
import type { P } from '../formes'
import { rotationDe } from '../geometrie'
import { tableauCache } from '../navigateur'
import { nouveauxRangs } from '../ordre'
import type { Sens } from '../ordre'
import { POIGNEE, messageCadre, nouveauDepart, typePointeur } from '../pointeurs'
import type { CadreVu } from '../rendu'
import type { Boite } from '../revoir/bobine'
import { imageRognee, priseRognage, rienARogner, tirerPartie, toute, versImage } from '../rognage'
import { libre, uid } from '../types'
import type { Forme, Formule, ImageForme, Outil } from '../types'
import { fixesSous, quiBouge } from '../verrou'

export const methodesObjets = {
  // ---------- Copier, couper, coller, dupliquer ----------
  /** Ce que copient Ctrl+C, Ctrl+X, Ctrl+D : la sélection, ou la figure du
   *  morceau choisi (un sommet choisi, c'est la figure qu'on copie), avec les
   *  points liés aux images choisies (ils les suivent) ; dans l'ordre
   *  d'empilement. */
  objetsChoisis(this: App): Forme[] {
    const ids = new Set(this.selection)
    if (!ids.size && this.partie) ids.add(this.partie.id)
    if (!ids.size) return []
    return this.formes.filter(f => ids.has(f.id) || ((f.type === 'polygone' || f.type === 'cercle') && !!f.lie && ids.has(f.lie)))
  },

  // ---------- L'ordre : premier plan, avancer, reculer, arrière-plan ----------
  /** Les rangs neufs d'une commande d'ordre (voir nouveauxRangs dans
   *  ordre.ts) pour ce qui est choisi et libre (les points liés à une image
   *  choisie suivent, comme à la copie) ; 'verrou' : rien de libre dans ce
   *  qui est choisi ; null : rien de choisi, ou le tableau caché (la revue,
   *  la trieuse) ou en lecture. */
  rangsPour(this: App, sens: Sens): { id: string; z: number }[] | 'verrou' | null {
    if (tableauCache(this)) return null
    const choisis = this.objetsChoisis()
    if (!choisis.length) return null
    const libres = choisis.filter(libre)
    if (!libres.length) return 'verrou'
    return nouveauxRangs(this.formes, libres.map(f => f.id), sens, f => this.boiteVue(f))
  },

  /** La commande d'ordre ferait-elle quelque chose ? (le menu grise celles
   *  qui ne feraient rien) */
  peutOrdonner(this: App, sens: Sens): boolean {
    const r = this.rangsPour(sens)
    return Array.isArray(r) && r.length > 0
  },

  /** Mettre au premier plan, avancer, reculer, mettre à l'arrière-plan ce
   *  qui est choisi, dans son calque (une image reste sous l'écriture, une
   *  formule au-dessus de tout : voir ordre.ts). UNE transaction : un
   *  Ctrl+Z rend tous les rangs, et le film en fait une étape (la revue et
   *  le lecteur montrent l'ordre nouveau à l'étape d'après). La sélection
   *  reste. Rien à faire : un message, et faux. */
  ordonner(this: App, sens: Sens): boolean {
    const r = this.rangsPour(sens)
    if (r === null) return false
    if (r === 'verrou') { this.ui.message('Verrouillé : déverrouillez-le d\'abord.'); return false }
    if (!r.length) { this.ui.message(RIEN_A_ORDONNER[sens]); return false }
    this.tableau.nouveauGeste()
    this.tableau.modifier(this.page, r.map(({ id, z }) => ({ id, patch: { z } })))
    return true
  },

  /** Maj + L : verrouiller ce qui est sélectionné et libre ; une sélection
   *  toute verrouillée (son menu est ouvert), la déverrouiller */
  basculerVerrou(this: App): void {
    const choisis = this.objetsChoisis()
    if (!choisis.length) return
    this.verrouiller(choisis.some(f => this.selection.has(f.id) && libre(f)))
  },

  /** Passe à la Sélection pour ces images (leur import, « Détacher l'image
   *  du fond »), en la prêtant : l'outil qu'on avait est retenu (Échap le
   *  rend, comme pour Ctrl+A), et « Fixer en fond » de l'une d'elles le rend
   *  aussi (voir fixerEnFond). Déjà prêtée (une deuxième image importée
   *  aussitôt), elle le reste, pour toutes, avec le même outil. Rend l'outil
   *  à reprendre ('selection' : on l'avait choisie, rien n'est prêté). */
  preterSelection(this: App, ids: Iterable<string>): Outil {
    const pretee = this.outil === 'selection' ? this.selectionPretee : null
    const avant = this.outil === 'selection' ? pretee?.avant ?? 'selection' : this.outil
    if (this.outil !== 'selection') this.choisirOutil('selection')
    this.selectionPretee = avant === 'selection' ? null : { avant, ids: new Set([...(pretee?.ids ?? []), ...ids]) }
    return avant
  },

  /** Les images fixées en fond sous ce point du monde, la plus haute d'abord */
  fixesSous(this: App, m: P): ImageForme[] { return fixesSous(this.formes, m.x, m.y) },

  /** Toutes les images fixées en fond de la page, la plus haute d'abord */
  fixesDeLaPage(this: App): ImageForme[] {
    return this.formes.filter((f): f is ImageForme => f.type === 'image' && !!f.fixe).sort((a, b) => b.z - a.z)
  },

  /** Ce qui est verrouillé sur la page (« Déverrouiller tout ») */
  verrouillesDeLaPage(this: App): Forme[] { return this.verrouilles ? this.formes.filter(f => !!f.verrou && !f.fixe) : [] },

  /** Ces objets, et les points repérés sur ceux qui sont des images (comme
   *  objetsChoisis, pour ce qui n'est pas pris : les images du fond) */
  avecLeursPoints(this: App, ids: Iterable<string>): Forme[] {
    const l = new Set(ids)
    return this.formes.filter(f => l.has(f.id) || ((f.type === 'polygone' || f.type === 'cercle') && !!f.lie && l.has(f.lie)))
  },

  /** « Copier l'image du fond » (le menu de la page) : comme Ctrl+C, mais
   *  sur ces images, qui ne se prennent pas ; la copie les garde fixées
   *  (collées, elles arrivent sous tout, sans être sélectionnées) */
  copierFond(this: App, ids: string[]): boolean {
    const formes = this.avecLeursPoints(ids)
    if (!this.copier(false, formes)) return false
    const n = formes.filter(f => f.type === 'image' && f.fixe).length
    this.ui.message(n === 1 ? 'Image du fond copiée' : `${n} images du fond copiées`)
    return true
  },

  /** La sélection contient-elle ce qui ne se prend pas (un objet verrouillé
   *  dont le menu est ouvert) ? La barre d'actions ne s'y montre pas. */
  selectionProtegee(this: App): boolean {
    if (!this.nonLibres || !this.selection.size) return false
    return this.formes.some(f => !libre(f) && this.selection.has(f.id))
  },

  /** Un objet verrouillé n'est sélectionné que le temps de son menu : le
   *  menu fermé (options revenu à null), une sélection faite seulement de ce
   *  qui ne se prend pas se vide (l'interface l'appelle à chaque mise à
   *  jour du menu complet). Vrai si elle s'est vidée. */
  oublierProteges(this: App): boolean {
    if (this.options !== null || !this.selectionProtegee()) return false
    if (this.formes.some(f => libre(f) && this.selection.has(f.id))) return false
    this.selection.clear()
    this.rendu.redessinerDirect()
    return true
  },

  /** Ce que change une transformation de ces objets (la sélection par
   *  défaut, ou la figure du morceau choisi) : ce qui y est libre, et les
   *  points repérés sur une image qui change, quel que soit leur verrou (ils
   *  la suivent, comme au glisser : voir quiBouge dans verrou.ts) */
  aTransformer(this: App, ids?: Iterable<string>): Forme[] {
    const pris = new Set(ids ?? (this.selection.size ? this.selection : this.partie ? [this.partie.id] : []))
    return quiBouge(this.formes, pris)
  },

  /**
   * Transforme ce qui est pris (ou ces objets) par M (voir cadre.ts : le
   * cadre de taille et la pastille ↻ de K6 y mènent, et window.__app en
   * développement) : chaque forme est réécrite ENTIÈRE (Tableau.remplacer),
   * en UNE transaction : un Ctrl + Z la défait d'un coup, le film en fait une
   * étape, et la revue et le lecteur montrent le résultat d'un coup, comme
   * un déplacement (chaque forme garde son identifiant). Une rotation d'une
   * formule revenue à zéro disparaît vraiment (modifier, qui fond un patch,
   * la laisserait). Rien (et faux) quand rien de libre n'est pris, quand M
   * ne change rien, quand son facteur sort de bornesEchelle (une forme
   * deviendrait illisible, ou sa copie serait refusée), ou quand le tableau
   * est caché ou en lecture. La sélection reste.
   */
  transformerSelection(this: App, M: Matrice, ids?: string[]): boolean {
    if (tableauCache(this) || estIdentite(M)) return false
    const formes = this.aTransformer(ids)
    if (!formes.length) return false
    const { min, max } = bornesEchelle(formes, this.mesureFormule), k = facteurDe(M)
    if (!(k >= min && k <= max)) return false
    const neuves = formes.map(f => transformerForme(f, M, this.mesureFormule))
    if (!neuves.every(dansLesBornes)) return false
    this.viderPointEnAttente()
    this.tableau.nouveauGeste()
    this.tableau.remplacer(this.page, neuves)
    this.noterTransformation()
    return true
  },

  /** L'objet que « Remettre droit » redresserait : ce qui est pris, seul et
   *  libre, une image tournée ou une formule tournée (null sinon) */
  redressable(this: App): ImageForme | Formule | null {
    if (this.selection.size !== 1 || tableauCache(this)) return null
    const f = this.formes.find(g => this.selection.has(g.id))
    if (!f || !libre(f)) return null
    if (f.type === 'image') return imageTournee(f) ? f : null
    if (f.type === 'formule') return rotationDe(f) ? f : null
    return null
  },

  /** « Remettre droit » (le menu ⋯, section « Position ») : la rotation de
   *  l'image ou de la formule prise s'annule, sa taille et son centre restent
   *  (voir redresser dans cadre.ts) ; les points repérés sur l'image la
   *  suivent. Une transaction, par Tableau.remplacer : la clé rotation d'une
   *  formule disparaît vraiment, et Ctrl + Z la rend. */
  redresserSelection(this: App): boolean {
    const f = this.redressable()
    const g = f && redresser(f, this.mesureFormule)
    if (!f || !g) return false
    const neuves: Forme[] = [g]
    if (f.type === 'image' && g.type === 'image') {
      // Ce que le redressement fait au plan de l'image : ses points le suivent
      const avant = inverser(matriceImage(f))
      if (avant) {
        const M = composer(avant, matriceImage(g))
        for (const l of this.liees(f.id)) neuves.push(transformerForme(l, M))
      }
    }
    this.viderPointEnAttente()
    this.tableau.nouveauGeste()
    this.tableau.remplacer(this.page, neuves)
    this.noterTransformation()
    return true
  },

  // ---------- Le cadre de taille et la pastille ↻ à l'écran (lot 5) ----------
  /** Le pointeur qu'on vient de voir sur le tableau (un appui, un mouvement,
   *  le survol d'un stylet) : s'il change, les poignées changent de taille,
   *  la couche directe se repeint et la barre d'actions se replace autour */
  voirPointeur(this: App, type: string): void {
    const p = typePointeur(type)
    if (p === this.pointeurPoignees) return
    this.pointeurPoignees = p
    if (this.selection.size) { this.rendu.redessinerDirect(); this.ui?.maj() }
  },

  /** Les poignées du cadre se prennent-elles maintenant ? À l'outil
   *  Sélection, quel que soit le pointeur ; sous un autre outil, seulement au
   *  doigt qui déplace (le dernier pointeur vu est un doigt) : jamais sous un
   *  outil de dessin à la souris, jamais sous la plume au Stylo (un trait
   *  commencé sur le coin d'une image qu'on vient d'importer écrit) */
  poigneesDuCadre(this: App): boolean {
    return this.outil === 'selection' || (this.doigtDeplace && this.pointeurPoignees === 'touch')
  },

  /**
   * Le cadre de taille de ce qui est pris (D7, D8, D10 du lot 5 ; voir
   * cadreDe dans cadre.ts), ou null : rien de pris ; un geste en cours qui
   * bouge (un objet qu'on glisse, un cadre ou un lasso qu'on tire, un sommet
   * qu'on tire, le cadre lui-même : pendant qu'on le tire, c'est le geste qui
   * le donne, voir cadreVu ; un clic qui n'a pas encore glissé le laisse, la
   * vue qu'on déplace ou qu'on pince aussi) ; un clic attendu ; la revue ou le
   * tableau caché ; les poignées pas actives (voir poigneesDuCadre) ; ou un
   * objet pris qui n'est pas libre (verrouillé, sélectionné le temps de son
   * menu court : jamais de cadre). Les points repérés sur une image prise ne
   * changent pas son cadre : ils la suivent (une image et ses points gardent
   * le cadre orienté de l'image, ses côtés compris).
   */
  cadreDeLaSelection(this: App): Cadre | null {
    if (!this.selection.size || this.enLecture || this.placement || tableauCache(this) || !this.poigneesDuCadre()) return null
    const g = this.geste
    if (g && g.type !== 'pan' && g.type !== 'pinch' && g.type !== 'retenu' && (this.depart.parti || g.type === 'taille' || g.type === 'tourner')) return null
    const cam = this.cam, zl = this.ui?.zoneDuCadre() ?? { x: 0, y: 0, l: this.rendu.l, h: this.rendu.h }
    // Le cadre gardé (voir SelectionSuivie) : la même sélection, la même page (ses
    // formes : un tableau neuf à chaque changement, voir rafraichir), la même
    // vue, la même zone libre, le même pointeur, et les formules prises à la
    // même taille (KaTeX les met en page après coup, et leurs boîtes sont
    // celles du DOM)
    const sel = this.selection, version = sel instanceof SelectionSuivie ? sel.version : -1
    const cle = `${cam.x},${cam.y},${cam.z},${this.pointeurPoignees},${zl.x},${zl.y},${zl.l},${zl.h}`
    const r = this.cadreRetenu
    if (r && version >= 0 && r.sel === sel && r.version === version && r.formes === this.formes && r.cle === cle
      && r.formules.every(([f, l, h]) => { const m = this.mesureFormule(f); return m.l === l && m.h === h })) return r.cadre
    const pris = this.formes.filter(f => sel.has(f.id))
    const cadre = this.calculerCadre(pris, zl)
    const formules = pris.filter((f): f is Formule => f.type === 'formule').map(f => { const m = this.mesureFormule(f); return [f, m.l, m.h] as [Formule, number, number] })
    this.cadreRetenu = { sel, version, formes: this.formes, cle, formules, cadre }
    return cadre
  },

  /** Le centre autour duquel « Tourner d'un quart de tour » (le menu ⋯,
   *  section Position) tournerait ce qui est pris : celui de la pastille ↻
   *  (le milieu du cadre d'une image, d'une formule, d'un trait, d'un
   *  groupe ou de plusieurs objets ; le centre d'une figure seule). null :
   *  rien qui tourne (rien de pris, un objet qui n'est pas libre, un point
   *  seul, un cercle entier, le tableau caché ou la revue). Sous tous les
   *  outils : le bouton du stylet ouvre ce menu au Stylo. */
  tournable(this: App): P | null {
    if (!this.selection.size || this.enLecture || tableauCache(this)) return null
    return this.calculerCadre(this.formes.filter(f => this.selection.has(f.id)))?.centre ?? null
  },

  /** « Tourner d'un quart de tour à gauche » (↺) ou « … à droite » (↻), le
   *  menu ⋯ (retouches après le lot 5 : le chemin de la tablette graphique,
   *  dont le bouton latéral ouvre le menu complet) : autour du centre de la
   *  pastille, en une étape d'annulation, comme elle (voir
   *  transformerSelection) ; la sélection reste. */
  tournerQuart(this: App, sens: 'gauche' | 'droite'): boolean {
    const c = this.tournable()
    return !!c && this.transformerSelection(quartDeTour(c, sens))
  },

  // ---------- Rogner une image (retouches après le lot 5, voir rognage.ts) ----------
  /** L'image que « Rogner » rognerait : ce qui est pris, seul, une image
   *  libre (null sinon, et pendant la revue) */
  rognable(this: App): ImageForme | null {
    if (!this.selection.size || this.enLecture || tableauCache(this)) return null
    // Les points repérés sur l'image prise ne comptent pas : ils restent où ils sont
    const pris = this.formes.filter(f => this.selection.has(f.id) && !((f.type === 'polygone' || f.type === 'cercle') && f.lie && this.selection.has(f.lie)))
    const f = pris.length === 1 ? pris[0] : null
    return f?.type === 'image' && libre(f) && !f.calculatrice ? f : null
  },

  /** « Rogner » (la barre d'actions d'une image, son menu ⋯) : l'image
   *  entière paraît, la partie gardée claire et le reste assombri, avec ses
   *  huit poignées ; la sélection se vide le temps de rogner (ni cadre, ni
   *  barre d'actions dessus). Le message dit comment finir, dans les mots du
   *  pointeur, avec « Terminer » et « Annuler ». */
  commencerRognage(this: App): boolean {
    const f = this.rognable()
    if (!f) return false
    this.ui.fermerMenus()
    this.rognage = { id: f.id, page: this.page, partie: toute(f) }
    this.selection.clear()
    this.survol = null; this.rendu.survol = null; this.rendu.survolAussi = []
    this.majRognage()
    const doigt = this.dernierPointeur === 'touch'
    this.ui.message(doigt ? 'Rogner : tirez les coins ou les côtés, puis touchez à côté.'
      : 'Rogner : tirez les coins ou les côtés, puis cliquez à côté (Échap : annuler).',
      [{ libelle: 'Terminer', cle: 'rognage', faire: () => this.finirRognage(true) }, { libelle: 'Annuler', cle: 'rognage', faire: () => this.finirRognage(false) }])
    this.ui.maj()
    return true
  },

  /** Le rendu suit la partie gardée */
  majRognage(this: App): void {
    const r = this.rognage
    this.rendu.rognage = r && { id: r.id, partie: r.partie, pointeur: this.pointeurPoignees }
    this.rendu.redessinerDirect()
  },

  /** Un appui pendant qu'on rogne : une poignée ou la partie gardée se
   *  prend ; à côté (ou l'image disparue), on a fini, la partie gardée est
   *  rognée. Le clic droit (le bouton du stylet) ne fait rien. */
  basRognage(this: App, e: PointerEvent, s: P): void {
    if (e.button !== 0) return
    const r = this.rognage!
    const f = this.forme(r.id)
    if (f?.type !== 'image' || r.page !== this.page) { this.finirRognage(false); return }
    const cam = this.cam
    const prise = priseRognage(f, r.partie, s, p => cam.versEcran(p.x, p.y), POIGNEE.prise[this.pointeurPoignees])
    const u = versImage(f, this.monde(e))
    if (!prise || !u) { this.finirRognage(true); return }
    this.depart = nouveauDepart(s.x, s.y, e.pointerId, e.pointerType, performance.now())
    this.geste = { type: 'rogner', prise, depart: { ...r.partie }, u }
  },

  /** La prise tirée jusqu'en m (monde) */
  tirerRognage(this: App, g: Extract<Geste, { type: 'rogner' }>, m: P): void {
    const r = this.rognage, f = r && this.forme(r.id)
    if (!r || f?.type !== 'image') return
    const u = versImage(f, m)
    if (!u) return
    r.partie = tirerPartie(g.depart, g.prise, u.x - g.u.x, u.y - g.u.y, f)
    this.majRognage()
  },

  /** On a fini de rogner : garder (Entrée, « Terminer », un clic à côté)
   *  écrit l'image rognée, en une étape d'annulation, et la reprend ;
   *  sinon (Échap, « Annuler ») rien ne change, et elle est reprise aussi */
  finirRognage(this: App, garder: boolean): void {
    const r = this.rognage
    if (!r) return
    this.rognage = null
    if (this.geste?.type === 'rogner') this.geste = null
    this.ui.oublierAction('rognage')
    this.zone.style.cursor = ''
    this.majRognage()
    const f = this.forme(r.id)
    if (f?.type !== 'image' || r.page !== this.page) { this.ui.maj(); return }
    if (garder && !rienARogner(f, r.partie)) {
      const img = this.pixels(f.src)
      if (img?.complete && img.naturalWidth) {
        const px = img.naturalWidth / f.l, py = img.naturalHeight / f.h
        const src = uid()
        const { patch, decoupe } = imageRognee(f, r.partie, src, px, py)
        const cv = Object.assign(document.createElement('canvas'), { width: decoupe.l, height: decoupe.h })
        cv.getContext('2d')!.drawImage(img, decoupe.x, decoupe.y, decoupe.l, decoupe.h, 0, 0, decoupe.l, decoupe.h)
        const avant = this.banqueImages.get(f.src) ?? ''
        const png = avant.startsWith('data:image/png') || avant.startsWith('data:image/gif')
        this.banqueImages.set(src, cv.toDataURL(png ? 'image/png' : 'image/jpeg', 0.9))
        this.viderPointEnAttente()
        this.tableau.nouveauGeste()
        this.tableau.modifier(this.page, [{ id: f.id, patch }])
        this.ui.message('Image rognée (Ctrl + Z : la rendre entière)')
      } else this.ui.message('L\'image n\'est pas encore chargée : réessayez dans un instant.')
    }
    this.selection.clear(); this.selection.add(f.id)
    this.rendu.toutRedessiner(); this.ui.maj()
  },

  /** Le cadre que peint le rendu : pendant qu'on le tire ou qu'on tourne,
   *  celui de l'appui transformé (il suit) ; sinon celui de la sélection */
  cadreVu(this: App): CadreVu | null {
    const g = this.geste
    if (g?.type === 'taille' || g?.type === 'tourner') return { cadre: cadreTransforme(g.cadre, g.M), pointeur: g.pointeur, geste: g.type, gauche: g.type === 'tourner' && g.sens === 'gauche' }
    const c = this.cadreDeLaSelection()
    return c && { cadre: c, pointeur: this.pointeurPoignees, geste: null }
  },

  /** La poignée du cadre (un coin, un côté, la pastille) sous ce point de
   *  l'écran, à la portée du dernier pointeur vu (POIGNEE.prise), avec son
   *  cadre ; null : aucune, ou pas de cadre. peint (l'appui) : le cadre tel
   *  qu'on le voyait avant lui ; peint pour un autre pointeur, un appui sur
   *  sa pastille la prend (voir poigneeDeLAppui : un doigt après la souris
   *  déformait l'image au lieu de la tourner) */
  poigneeVisee(this: App, s: P, peint?: CadreVu | null): { cadre: Cadre; p: Poignee } | null {
    const c = this.cadreDeLaSelection()
    if (!c) return null
    const p = poigneeDeLAppui(c, s, this.cam, this.pointeurPoignees, peint && !peint.geste ? peint : null)
    return p ? { cadre: c, p } : null
  },

  /** L'appui sur une poignée du cadre : le geste commence ('taille' pour un
   *  coin ou un côté, 'tourner' pour la pastille). Rien ne bouge avant le
   *  seuil du glisser ; le menu d'un morceau se ferme, le halo du survol
   *  s'éteint, et un second toucher qui suivrait n'est pas un double appui. */
  prendreCadre(this: App, v: { cadre: Cadre; p: Poignee }, m: P): void {
    this.ui.fermerMenuPartie()
    this.doubleEnCours = null; this.toucherPrecedent = null
    this.survol = null; this.rendu.survol = null; this.rendu.survolAussi = []
    const pointeur = this.pointeurPoignees, ids = new Set(this.aTransformer().map(f => f.id))
    if (v.p.quoi === 'pastille') {
      const c = v.cadre.centre
      this.geste = { type: 'tourner', cadre: v.cadre, pointeur, ids, dernier: Math.atan2(m.y - c.y, m.x - c.x), total: 0, M: IDENTITE, sens: v.p.i === 1 ? 'gauche' : 'droite' }
      this.zone.style.cursor = 'grabbing'
    } else {
      const seule = this.selection.size === 1 ? this.forme([...this.selection][0]) : null
      this.geste = { type: 'taille', cadre: v.cadre, quoi: v.p.quoi, i: v.p.i, pointeur, ids,
        bornes: bornesEchelle(this.aTransformer(), this.mesureFormule), image: seule?.type === 'image', M: IDENTITE }
      this.zone.style.cursor = curseurPoignee(v.cadre, v.p)
    }
    this.rendu.redessinerDirect()
  },

  /** Le geste du cadre en est à M : le rendu peint ce qui change sous M, sans
   *  rien écrire (voir Rendu.transfo), la mesure près du pointeur (en m) */
  montrerTransfo(this: App, g: Extract<Geste, { type: 'taille' | 'tourner' }>, M: Matrice, texte: string, m: P): void {
    g.M = M
    this.rendu.transfo = { ids: g.ids, m: M, appliquer: f => transformerForme(f, M, this.mesureFormule) }
    this.rendu.mesure = { texte, x: m.x, y: m.y }
    this.rendu.toutRedessiner()
  },

  /** Le geste du cadre s'arrête (lâché ou abandonné) : plus d'aperçu, plus de mesure */
  finirCadre(this: App): void {
    this.rendu.transfo = null; this.rendu.mesure = null
    this.zone.style.cursor = ''
    this.rendu.toutRedessiner()
  },

  /**
   * Ce que ces formes (ce qui est pris) occupent à l'écran, en monde, au
   * zoom du moment : leur boîte (base, ou celle de la barre d'actions : une
   * droite par ce qu'on en voit), et le cadre de taille, ses poignées et sa
   * pastille ↻ quand il est montré. La barre d'actions et le menu complet se
   * posent autour (au-dessus de la pastille, ou dessous), jamais dessus.
   */
  emprise(this: App, formes: Forme[], base?: Boite | null): Boite | null {
    let b = base !== undefined ? base : this.boiteDuContenu(formes.filter(f => !(f.type === 'polygone' && f.prolonge)))
    if (base === undefined) {
      for (const f of formes) {
        if (f.type !== 'polygone' || !f.prolonge) continue
        b = union(b, this.rendu.boite(f))
      }
    }
    const c = this.cadreDeLaSelection()
    return c ? union(b, etendueDuCadre(c, this.pointeurPoignees, this.cam.z)) : b
  },

  /** Le disque de la pastille ↻ (monde), s'il est montré : la barre
   *  d'actions et le menu complet ne le couvrent jamais */
  pastilleAEviter(this: App): Boite | null {
    const c = this.cadreDeLaSelection()
    return c && zonePastille(c, this.pointeurPoignees, this.cam.z)
  },

  /** Les poignées du cadre de ce qui est pris (monde : ses coins, ses côtés,
   *  sa pastille ↻, à la portée du dernier pointeur vu), s'il est montré :
   *  le message ne les couvre jamais (voir UI.placerToast et
   *  zonesDesPoignees) */
  poigneesAEviter(this: App): Boite[] {
    const c = this.cadreDeLaSelection()
    return c ? zonesDesPoignees(c, this.pointeurPoignees, this.cam.z) : []
  },

  /** La première fois de la session qu'on prend une image seule, son cadre
   *  à l'écran : ce que font ses coins, ses côtés et sa pastille, dans les
   *  mots du pointeur (voir messageCadre). Vrai si le message est dit. */
  direCadre(this: App): boolean {
    if (this.astuceCadre || this.selection.size !== 1) return false
    const f = this.forme([...this.selection][0])
    if (f?.type !== 'image' || !this.cadreDeLaSelection()) return false
    this.astuceCadre = true
    this.ui.message(messageCadre(this.dernierPointeur))
    return true
  },
}
