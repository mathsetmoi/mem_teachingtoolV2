// =============================================================
// L'APP : LES IMAGES, LE CONSTRUCTEUR, LE PANNEAU D'OPTIONS
// Des méthodes de la classe App (src/app.ts), rangées ici par sujet :
// elles s'ajoutent à la classe à la fin de app.ts (ajouterMethodes).
// =============================================================
import type { App } from '../app'
import { BANDE, HAUTEUR as HAUTEUR_CALCULATRICE, echelleDePose, imageDeCalculatrice, largeurDuModele, nomDuModele } from '../calculatrice/dessin'
import { lireEmulateur } from '../calculatrice/emulateurs'
import { ouvrirInstallation } from '../calculatrice/fenetre'
import { estCalculatrice } from '../calculatrice/vivantes'
import { image, nomsLibres, sommetsDe, versRelatif } from '../formes'
import type { P, Transformation } from '../formes'
import { distanceAuSegment } from '../geometrie'
import { change } from '../habillage'
import type { Retouche } from '../habillage'
import { HAUTEUR_MAX_IMAGE, LARGEUR_IMAGE, estPdf, ouvrirFenetreImportPdf, ouvrirPdf, texteImportPdf } from '../import-pdf'
import type { ChoixPdf, PdfOuvert } from '../import-pdf'
import { tableauCache } from '../navigateur'
import { messageImagePosee, pointeurDuClic } from '../pointeurs'
import type { TypePointeur } from '../pointeurs'
import { FOND_NEUF, libre, uid } from '../types'
import type { Figure, Forme, Habillage, ImageForme, ModeleCalculatrice, Trait } from '../types'

export const methodesImages = {
  /** Range des pixels (une adresse data:) dans le classeur, une fois : rend
   *  la clé qu'une image du tableau porte dans src (les dessins d'un flash
   *  d'automatismes, voir flash.ts) */
  rangerImage(this: App, donnees: string): string {
    const src = uid()
    this.banqueImages.set(src, donnees)
    return src
  },
  signalerImageManquante(this: App): void {
    if (this.imagesCherchees || !this.chercherImages) return
    this.imagesCherchees = true
    // null : pas encore possible (le classeur s'ouvre) ; on cherchera à la prochaine
    void this.chercherImages().then(trouve => {
      if (trouve === null) this.imagesCherchees = false
      else if (trouve) this.rendu.toutRedessiner()
    }, () => undefined)
  },

  /** Les pixels d'une image, chargés une fois : la banque garde les données.
   *  Aussi pour peindre une page hors de l'écran (src/sorties/apercu.ts) */
  pixels(this: App, src: string): HTMLImageElement | null {
    let img = this.cachePixels.get(src)
    if (!img) {
      const donnees = this.banqueImages.get(src)
      if (!donnees) { this.signalerImageManquante(); return null }
      img = new Image()
      img.onload = () => this.rendu.toutRedessiner()
      img.src = donnees
      this.cachePixels.set(src, img)
    }
    return img
  },

  /** Importe un fichier image : réduit (1600 px au plus), rangé une fois dans
   *  le document, posé au milieu de la vue et sélectionné, à l'outil
   *  Sélection (retouches après le lot 5) : son cadre de taille et sa
   *  pastille ↻ tout de suite. Sous le Stylo, elle paraissait prise (son
   *  cadre en tirets), sans coins ni pastille (voir poigneesDuCadre), et le
   *  geste en rond pour la tourner écrivait de l'encre. L'outil quitté est
   *  retenu, comme pour Ctrl+A et « Détacher l'image du fond » : sa touche le
   *  rend (P le Stylo, E la Gomme…), et « Fixer en fond » aussi (la
   *  Sélection n'était que prêtée : voir preterSelection). Le message le dit
   *  dans les mots du pointeur (o.pointeur : celui qui a touché le bouton
   *  Image ; sinon le dernier vu sur le tableau, pour un fichier déposé ;
   *  o.clavier : Ctrl+V), avec ce que font les coins et la pastille (le
   *  message du cadre, dit une fois par session, n'est plus à dire), et il
   *  porte « Fixer en fond », dont le message parle la langue du pointeur
   *  qui touche ce bouton (le bouton est hors du tableau : dernierPointeur
   *  ne l'a pas vu). */
  async importerImage(this: App, fichier: Blob, o: { pointeur?: TypePointeur; clavier?: boolean } = {}): Promise<void> {
    // Un PDF a sa fenêtre : ses pages, où les mettre (voir import-pdf.ts)
    if (estPdf(fichier)) return this.importerPdf(fichier)
    if (!fichier.type.startsWith('image/')) return this.ui.message('Ce fichier n\'est ni une image ni un PDF.')
    const url = URL.createObjectURL(fichier)
    try {
      const img = await new Promise<HTMLImageElement>((ok, ko) => { const i = new Image(); i.onload = () => ok(i); i.onerror = ko; i.src = url })
      const k = Math.min(1, 1600 / Math.max(img.naturalWidth, img.naturalHeight))
      const l = Math.round(img.naturalWidth * k), h = Math.round(img.naturalHeight * k)
      const cv = Object.assign(document.createElement('canvas'), { width: l, height: h })
      cv.getContext('2d')!.drawImage(img, 0, 0, l, h)
      const png = fichier.type === 'image/png' || fichier.type === 'image/gif'
      const donnees = cv.toDataURL(png ? 'image/png' : 'image/jpeg', 0.86)
      const src = uid()
      this.banqueImages.set(src, donnees)
      // Elle occupe au plus la moitié de la vue
      const v = this.cam.visible(this.rendu.l, this.rendu.h)
      const e = Math.min(v.l * 0.5 / l, v.h * 0.6 / h, 1 / this.cam.z)
      const f: Forme = { id: uid(), type: 'image', src, l, h, m: [e, 0, 0, e],
        x: v.x + v.l / 2 - l * e / 2, y: v.y + v.h / 2 - h * e / 2, z: Date.now(), auteur: this.tableau.moi }
      const avant = this.preterSelection([f.id])
      this.poserFigure(f)
      this.astuceCadre = true
      // Un énoncé importé : « Fixer en fond » tout de suite, du message (rien
      // si l'image n'est plus sur la page, ou si l'on a changé de page)
      const page = this.page, id = f.id, pointeur = o.pointeur ?? this.dernierPointeur
      this.ui.message(messageImagePosee(pointeur, avant, undefined, o.clavier, this.typeForme),
        { libelle: 'Fixer en fond', faire: e => { if (this.page === page && this.forme(id) && !tableauCache(this)) this.fixerEnFond([id], pointeurDuClic(e, pointeur)) } })
    } catch { this.ui.message('Impossible de lire cette image.') }
    finally { URL.revokeObjectURL(url) }
  },

  /** Pose une calculatrice NumWorks (le menu Classe) : son dessin, une image
   *  marquée (voir calculatrice/dessin.ts), au milieu de la vue, sur les
   *  trois quarts de sa hauteur, prise à l'outil Sélection comme une image
   *  importée (ses coins l'agrandissent) ; la vraie calculatrice s'y pose
   *  aussitôt (vivantes.ts). Pas encore installée sur cet ordinateur : la
   *  fenêtre d'installation s'ouvre aussi. */
  async poserCalculatrice(this: App, modele: ModeleCalculatrice): Promise<void> {
    const l = largeurDuModele(modele), h = HAUTEUR_CALCULATRICE
    const src = `calc-accueil-${modele}-${l}`
    if (!this.banqueImages.has(src)) this.banqueImages.set(src, imageDeCalculatrice(modele))
    const v = this.cam.visible(this.rendu.l, this.rendu.h)
    const e = echelleDePose(v.h, this.cam.z)
    const f: Forme = { id: uid(), type: 'image', src, l, h, m: [e, 0, 0, e], calculatrice: modele,
      x: v.x + v.l / 2 - l * e / 2, y: v.y + v.h / 2 - h * e / 2, z: Date.now(), auteur: this.tableau.moi }
    this.calculatrices.posee(f.id)
    this.preterSelection([f.id])
    this.poserFigure(f)
    if (!this.forme(f.id)) return
    if (!(await lireEmulateur(modele))) this.installerCalculatrice(modele)
    else this.ui.message(`${nomDuModele(modele)} : elle se déplace en la prenant hors des touches et de l'écran, ses coins l'agrandissent, × la range.`)
  },

  /** La fenêtre « Installer la calculatrice NumWorks » */
  installerCalculatrice(this: App, modele?: ModeleCalculatrice): void {
    ouvrirInstallation({ maj: () => this.ui.maj(), change: () => this.calculatrices.rafraichir(), message: t => this.ui.message(t) }, modele)
  },

  /** Prend la calculatrice et commence à la déplacer depuis m (monde) */
  deplacerCalculatrice(this: App, f: ImageForme, m: P): void {
    if (!this.selection.has(f.id)) { this.selection.clear(); this.prendre(f, false) }
    this.geste = { type: 'deplacer', x: m.x, y: m.y, bouge: false }
    this.rendu.redessinerDirect(); this.ui.maj()
  },

  /** Un appui sur le corps de la vraie calculatrice (hors des touches et de
   *  l'écran), puis ses mouvements et son lever, reçus dans son cadre (voir
   *  calculatrice/vivantes.ts) : ils passent au tableau comme s'ils y
   *  avaient eu lieu, à ce point de l'écran (client) ; l'appui y prend la
   *  calculatrice et la déplace. */
  saisirCalculatrice(this: App, id: string, type: 'pointerdown' | 'pointermove' | 'pointerup' | 'pointercancel', e: PointerEvent, client: P): void {
    const copie = new PointerEvent(type, {
      bubbles: true, cancelable: true, clientX: client.x, clientY: client.y, pointerId: e.pointerId, pointerType: e.pointerType,
      isPrimary: e.isPrimary, button: e.button, buttons: e.buttons, pressure: e.pressure, shiftKey: e.shiftKey, ctrlKey: e.ctrlKey, altKey: e.altKey, metaKey: e.metaKey,
    })
    this.calculatriceSaisie = type === 'pointerdown' ? id : null
    try { this.zone.dispatchEvent(copie) } finally { this.calculatriceSaisie = null }
  },

  /** La calculatrice dont la bande du nom est sous ce point (monde), la plus
   *  haute : elle se prend par là sous tous les outils (voir bas) */
  bandeDeCalculatrice(this: App, m: P): ImageForme | null {
    for (let i = this.formes.length - 1; i >= 0; i--) {
      const f = this.formes[i]
      if (!estCalculatrice(f) || !libre(f)) continue
      const [a, b, c, d] = f.m, det = a * d - b * c
      if (!det) continue
      const x = m.x - f.x, y = m.y - f.y
      const u = (d * x - c * y) / det, w = (-b * x + a * y) / det
      if (u >= 0 && u <= f.l && w >= 0 && w <= BANDE) return f
    }
    return null
  },

  /** Un PDF à importer (le bouton Image, un fichier glissé, Ctrl+V) : on
   *  le lit, puis la fenêtre « Importer un PDF » s'ouvre (ses pages en
   *  vignettes, où les mettre, « Fixer en fond » ; voir import-pdf.ts). */
  async importerPdf(this: App, fichier: Blob): Promise<void> {
    if (tableauCache(this) || document.querySelector('dialog[open]')) return
    this.ui.message('Lecture du PDF…')
    let pdf: PdfOuvert
    try { pdf = await ouvrirPdf(fichier) } catch { return this.ui.message('Impossible de lire ce PDF (abîmé, ou protégé par un mot de passe).') }
    if (!pdf.pages) { pdf.fermer(); return this.ui.message('Ce PDF n\'a aucune page.') }
    if (tableauCache(this) || document.querySelector('dialog[open]')) { pdf.fermer(); return }
    const nom = (fichier as File).name || 'PDF'
    ouvrirFenetreImportPdf({
      numeroPage: Math.max(1, this.pages.indexOf(this.page) + 1),
      lecture: this.enSeancePassee,
      maj: () => this.ui.maj(),
      importer: c => { void this.poserPdf(pdf, c, nom).finally(() => pdf.fermer()) },
    }, pdf, nom)
  },

  /** Les pages choisies du PDF deviennent des images du tableau. Chacune est
   *  peinte à LARGEUR_IMAGE pixels (au plus HAUTEUR_MAX_IMAGE de haut), et
   *  posée assez large pour se lire à 100 % (la place entre les barres, au
   *  plus 1000). Une page du tableau par page du PDF : elles s'ajoutent
   *  après celle qu'on regarde (depuis une séance passée : à la séance du
   *  jour, comme Nouvelle page), la feuille en haut à gauche, et l'on va à
   *  la première. Sinon, toutes sur la page qu'on regarde, l'une sous
   *  l'autre, en haut de ce qu'on voit. Fixées en fond, elles passent sous
   *  tout ; sinon elles arrivent sélectionnées, comme une image importée. */
  async poserPdf(this: App, pdf: PdfOuvert, c: ChoixPdf, nom = 'PDF'): Promise<void> {
    // Pour le résumé de la séance (resume/fiche.ts) : le nom du fichier, sans son extension
    const fichier = nom.replace(/\.pdf$/i, '').replace(/[_]+/g, ' ').trim() || 'PDF'
    const images: { src: string; donnees: string; l: number; h: number }[] = []
    for (const [k, n] of c.pages.entries()) {
      if (c.pages.length > 1) this.ui.message(`Import du PDF : page ${k + 1} sur ${c.pages.length}…`)
      try {
        const cv = await pdf.dessiner(n, LARGEUR_IMAGE, HAUTEUR_MAX_IMAGE)
        images.push({ src: uid(), donnees: cv.toDataURL('image/jpeg', 0.88), l: cv.width, h: cv.height })
      } catch { return this.ui.message(`Impossible de lire la page ${n} du PDF : rien n'a été importé.`) }
    }
    if (tableauCache(this)) return this.ui.message('Import du PDF abandonné : le tableau n\'est plus affiché.')
    this.viderPointEnAttente()
    const zone = this.ui.zoneLibre()
    const moi = this.tableau.moi
    if (!c.ici) {
      if (this.enSeancePassee) this.retourAujourdhui()
      const largeur = Math.max(400, Math.min(1000, zone.l - 64))
      const place = this.tableau.ordre.toArray().indexOf(this.page) + 1
      const pages: string[] = []
      for (const [k, im] of images.entries()) {
        const e = largeur / im.l
        this.banqueImages.set(im.src, im.donnees)
        const page = this.tableau.ajouterPage(FOND_NEUF, place + k)
        const f: Forme = { id: uid(), type: 'image', src: im.src, l: im.l, h: im.h, m: [e, 0, 0, e], x: 0, y: 0, z: Date.now(), auteur: moi }
        if (c.fond) f.fixe = true
        this.tableau.poserSurLaPage(page, [f])
        this.tableau.noterActivite(page, 'pdf', `${fichier} p. ${c.pages[k]}`)
        pages.push(page)
      }
      this.allerPage(pages[0])
      const numeros = pages.map(p => this.pages.indexOf(p) + 1)
      return this.ui.message(texteImportPdf(images.length, numeros, c.fond))
    }
    if (this.enSeancePassee) return this.direLecture()
    // Sur la page qu'on regarde : en haut de ce qu'on voit, au milieu,
    // l'une sous l'autre
    const z = this.cam.z, largeur = Math.max(400, Math.min(1000, (zone.l - 64) / z))
    const haut = this.cam.versMonde(zone.x + zone.l / 2, zone.y + 32)
    let y = haut.y, zmin = Infinity
    for (const f of this.formes) if (f.z < zmin) zmin = f.z
    if (!Number.isFinite(zmin)) zmin = Date.now()
    const formes: Forme[] = images.map((im, k) => {
      const e = largeur / im.l
      const f: Forme = { id: uid(), type: 'image', src: im.src, l: im.l, h: im.h, m: [e, 0, 0, e], x: haut.x - largeur / 2, y, z: c.fond ? zmin - images.length + k : Date.now() + k, auteur: moi }
      if (c.fond) f.fixe = true
      y += im.h * e + 24
      return f
    })
    for (const im of images) this.banqueImages.set(im.src, im.donnees)
    const avant = c.fond ? null : this.preterSelection(formes.map(f => f.id))
    this.tableau.nouveauGeste()
    this.tableau.poserPlusieurs(this.page, formes)
    this.tableau.noterActivite(this.page, 'pdf', `${fichier} ${c.pages.length > 1 ? 'pp.' : 'p.'} ${c.pages.join(', ')}`)
    this.selection.clear()
    if (avant !== null) for (const f of formes) this.selection.add(f.id)
    this.rendu.redessinerDirect(); this.ui.maj()
    this.ui.message(texteImportPdf(formes.length, null, c.fond))
  },

  /** Désigner sur le tableau une droite ou un point parmi des candidats :
   *  ce qui est visé s'éclaire ; un clic le choisit ; Échap renonce. */
  designer(this: App, genre: 'axe' | 'centre', candidats: { cle: string; a: P; b?: P }[], fini: (cle: string) => void): void {
    if (!candidats.length) return this.ui.message(genre === 'axe' ? 'Aucune droite sur la page : trace l\'axe.' : 'Aucun point sur la page : trace le centre.')
    const vise = (w: P) => {
      const s = this.cam.versEcran(w.x, w.y)
      let mieux: { cle: string; a: P; b?: P } | null = null, d = 16
      for (const c of candidats) {
        const A = this.cam.versEcran(c.a.x, c.a.y)
        const e = c.b ? (() => { const B = this.cam.versEcran(c.b!.x, c.b!.y); return distanceAuSegment(s.x, s.y, A.x, A.y, B.x, B.y) })() : Math.hypot(A.x - s.x, A.y - s.y)
        if (e < d) { d = e; mieux = c }
      }
      return mieux
    }
    const fin = () => { this.rendu.cible = null; this.rendu.redessinerDirect() }
    const mode = {
      bouge: (w: P) => { const c = vise(w); this.rendu.cible = c ? { a: c.a, b: c.b } : null; this.rendu.redessinerDirect() },
      clic: (w: P) => {
        const c = vise(w)
        if (!c) { this.placement = mode; return this.ui.message(genre === 'axe' ? 'Clique sur une droite (ou Échap).' : 'Clique sur un point (ou Échap).') }
        fin(); fini(c.cle)
      },
      annuler: fin,
    }
    this.placement = mode
    this.ui.message(genre === 'axe' ? 'Clique sur la droite qui sert d\'axe.' : 'Clique sur le point qui sert de centre.')
  },

  /** Tracer un axe tout de suite : deux clics. Il devient un segment de la page. */
  tracerAxe(this: App, fini: (id: string) => void): void {
    let A: P | null = null
    const mode = {
      bouge: (w: P) => {
        if (!A) return
        const f = this.nouvelleFigure({ type: 'polygone', ferme: false, pts: [A, this.aimanter(w)] }, { couleur: '#1f5fbf', taille: 2.5 })
        f.tirets = true; this.rendu.apercu = f; this.rendu.redessinerDirect()
      },
      clic: (w: P) => {
        const p = this.aimanter(w)
        if (!A) { A = p; this.placement = mode; return this.ui.message('Second point de l\'axe…') }
        this.rendu.apercu = null
        if (Math.hypot(p.x - A.x, p.y - A.y) * this.cam.z < 8) { this.placement = mode; return }
        const f = this.nouvelleFigure({ type: 'polygone', ferme: false, pts: [A, p] }, { couleur: '#1f5fbf', taille: 2.5 })
        f.tirets = true
        this.tableau.nouveauGeste()
        fini(this.poserFigureSeule(f))
      },
      annuler: () => { this.rendu.apercu = null; this.rendu.redessinerDirect() },
    }
    this.placement = mode
    this.ui.message('Trace l\'axe : clique son premier point, puis le second.')
  },

  /** Tracer le centre tout de suite : un clic. C'est un point nommé (O…). */
  tracerCentre(this: App, fini: (nom: string) => void): void {
    this.placement = {
      bouge: () => {},
      clic: (w: P) => {
        const nom = nomsLibres(1, this.formes, true)[0]
        const f = this.nouvelleFigure({ type: 'polygone', ferme: false, pts: [this.aimanter(w)] })
        f.sommets = true; f.noms = [nom]
        this.tableau.nouveauGeste()
        this.poserFigureSeule(f)
        fini(nom)
      },
      annuler: () => {},
    }
    this.ui.message('Clique là où placer le centre.')
  },

  /** Les droites tracées sur la page (segments), pour servir d'axe */
  droitesDeLaPage(this: App, sauf?: string): { nom: string; a: P; b: P; id: string }[] {
    const r: { nom: string; a: P; b: P; id: string }[] = []
    let k = 0
    for (const f of this.formes) {
      if (f.id === sauf || f.type !== 'polygone' || f.ferme || f.pts.length !== 4) continue
      const [a, b] = sommetsDe(f)
      const n = f.sommets && f.noms?.[0] && f.noms?.[1] ? `Droite (${f.noms[0]}${f.noms[1]})` : `Droite tracée n° ${++k}`
      r.push({ nom: n, a, b, id: f.id })
    }
    return r
  },

  // ---------- Pour le constructeur ----------
  /** Les points nommés de la page : ils servent dans un programme de construction */
  pointsNommes(this: App): Map<string, P> {
    const r = new Map<string, P>()
    for (const f of this.formes) {
      if ((f.type !== 'polygone' && f.type !== 'cercle') || !f.sommets || !f.noms) continue
      const pts = f.type === 'cercle' ? [{ x: f.x, y: f.y }] : sommetsDe(f)
      f.noms.forEach((n, i) => { if (n && pts[i]) r.set(n, pts[i]) })
    }
    return r
  },

  /** Une figure neuve aux réglages du moment (ou à ceux d'un trait de construction) */
  nouvelleFigure(this: App, g: { type: 'polygone'; ferme: boolean; pts: P[] } | { type: 'cercle'; x: number; y: number; r: number },
    style?: { couleur: string; taille: number }): Figure {
    const f = g.type === 'polygone' ? this.figure({ type: 'polygone', ferme: g.ferme, ...versRelatif(g.pts) }) : this.figure(g)
    if (style) { f.couleur = style.couleur; f.taille = style.taille }
    return f
  },

  /** Pose une forme sans la sélectionner ; rend son identifiant */
  poserFigureSeule(this: App, f: Forme): string {
    this.tableau.poser(this.page, f)
    return f.id
  },

  forme(this: App, id: string): Forme | null { return this.formes.find(f => f.id === id) ?? null },

  /** Change le réglage du point (ou du nom) n° i d'une figure */
  reglerPartie(this: App, f: Figure, cle: 'stylePoints' | 'styleNoms', i: number, patch: Record<string, unknown>): void {
    const n = f.type === 'cercle' ? 1 : f.pts.length / 2
    const liste = Array.from({ length: n }, (_, k) => (f[cle]?.[k] ?? null) as Record<string, unknown> | null)
    const nouveau: Record<string, unknown> = { ...(liste[i] ?? {}), ...patch }
    for (const k of Object.keys(nouveau)) if (nouveau[k] === undefined) delete nouveau[k]
    liste[i] = Object.keys(nouveau).length ? nouveau : null
    this.habiller(f, { [cle]: liste } as Partial<Habillage>)
  },

  /** Renomme un seul point */
  renommerPoint(this: App, f: Figure, i: number, nom: string): void {
    const n = f.type === 'cercle' ? 1 : f.pts.length / 2
    const noms = Array.from({ length: n }, (_, k) => f.sommets ? f.noms?.[k] ?? '' : '')
    noms[i] = nom.trim()
    // Les autres points sans nom reçoivent des lettres libres sur la page
    const vides = noms.map((x, k) => x ? -1 : k).filter(k => k >= 0)
    if (vides.length) {
      const pris = this.formes.filter(g => g.id !== f.id)
      const libres = nomsLibres(vides.length, [...pris, { ...f, noms: noms.filter(Boolean) } as Forme])
      vides.forEach((k, j) => { noms[k] = libres[j] })
    }
    this.habiller(f, { noms, sommets: true })
  },

  /** Le nom revient à sa place automatique */
  replacerNom(this: App, f: Figure, i: number): void {
    if (!f.posNoms) return
    const posNoms = [...f.posNoms]; posNoms[i] = null
    this.habiller(f, { posNoms })
  },

  // ---------- Panneau d'options ----------
  /** Un geste qui cache le menu ouvert : on déplace ce qu'il règle, on tire
   *  un cadre… (déplacer la vue, pincer, tirer un sommet le laissent) */
  gesteQuiCache(this: App): boolean {
    return !!this.geste && this.geste.type !== 'pan' && this.geste.type !== 'pinch' && this.geste.type !== 'poignee'
  },

  /** La forme seule sélectionnée, s'il n'y en a qu'une et qu'aucun geste n'est en cours */
  formeChoisie(this: App): Forme | null {
    if (this.selection.size !== 1 || this.gesteQuiCache()) return null
    const id = [...this.selection][0]
    return this.formes.find(f => f.id === id) ?? null
  },

  /** Les objets d'une sélection de plusieurs, dans l'ordre d'empilement, si
   *  aucun geste n'est en cours : comme celui d'un objet, leur menu commun
   *  se cache pendant qu'on les déplace et revient au lâcher */
  formesChoisies(this: App): Forme[] | null {
    if (this.selection.size < 2 || this.gesteQuiCache()) return null
    return this.formes.filter(f => this.selection.has(f.id))
  },

  /** La page qu'on regarde est-elle vide ? (« Tout sélectionner » se grise) */
  pageVide(this: App): boolean { return !this.formes.length },

  habiller(this: App, f: Forme, patch: Partial<Habillage> & Partial<Trait>): void {
    this.tableau.nouveauGeste()
    this.tableau.modifier(this.page, [{ id: f.id, patch: patch as Partial<Forme> }])
  },

  /** Le menu commun de plusieurs objets : la retouche (une couleur, une
   *  épaisseur, les pointillés) va à tous ceux qu'elle concerne, en UNE
   *  transaction, donc une seule étape d'annulation : un Ctrl+Z rend leur
   *  couleur aux dix objets. Un objet qui l'a déjà n'est pas réécrit. */
  habillerSelection(this: App, retouche: Retouche): void {
    if (this.enLecture) return
    const changements: { id: string; patch: Partial<Forme> }[] = []
    for (const f of this.formes) {
      if (!this.selection.has(f.id)) continue
      const patch = retouche(f)
      if (patch && change(f, patch)) changements.push({ id: f.id, patch })
    }
    if (!changements.length) return
    this.tableau.nouveauGeste()
    this.tableau.modifier(this.page, changements)
  },

  basculerSommets(this: App, f: Figure): void {
    const n = f.type === 'cercle' ? 1 : f.pts.length / 2
    const noms = f.noms?.length === n ? f.noms : nomsLibres(n, this.formes.filter(g => g.id !== f.id), f.type === 'cercle')
    this.habiller(f, { sommets: !f.sommets, noms })
  },

  renommer(this: App, f: Figure, texte: string): void {
    // « ABCD » ou « A B C D » ou « A' B' C' D' »
    const n = f.type === 'cercle' ? 1 : f.pts.length / 2
    const morceaux = texte.includes(' ') ? texte.trim().split(/\s+/) : texte.match(/[A-Za-zΩ](?:'+|_\d+|\d+)?/g) ?? []
    if (morceaux.length !== n) return this.ui.message(`Il faut ${n} nom${n > 1 ? 's' : ''}.`)
    this.habiller(f, { noms: morceaux, sommets: true })
  },

  revenirMainLevee(this: App, f: Figure): void {
    if (!f.brut) return
    const t: Trait = { id: uid(), type: 'trait', x: f.x, y: f.y, pts: f.brut.pts, couleur: f.couleur, taille: f.brut.taille,
      opacite: 1, pression: f.brut.pression, z: f.z, auteur: this.tableau.moi }
    // Le tracé rendu prend la place de la figure, dans son groupe (lot 5) et
    // dans son état : sinon il en sortirait, et le groupe perdrait un membre
    if (f.groupe) t.groupe = f.groupe
    if (f.verrou) t.verrou = true
    this.tableau.nouveauGeste()
    this.tableau.doc.transact(() => { this.tableau.supprimer(this.page, [f.id]); this.tableau.poser(this.page, t) }, 'locale')
    this.selectionner(t.id)
  },

  /** L'image d'un objet par une transformation. Les points repérés sur une
   *  image ont aussi leur image, liée à la nouvelle. L'image et ses points
   *  font UN geste, posés dans une seule transaction : un seul Ctrl+Z les
   *  retire ensemble (sinon les points images resteraient seuls, liés à une
   *  image qui n'existe plus, ou se fondraient dans le geste d'avant). */
  transformer(this: App, f: Forme, t: Transformation): void {
    const img = image(f, t, this.tableau.moi)
    const points = this.liees(f.id).map(g => ({ ...image(g, t, this.tableau.moi), lie: img.id }) as Forme)
    this.tableau.nouveauGeste()
    this.tableau.poserPlusieurs(this.page, [...points, img])
    this.selectionner(img.id)
  },
}
