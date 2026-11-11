// =============================================================
// L'APP : LES FIGURES GÉOMÉTRIQUES, LES TRAITS, LES MORCEAUX D'UNE FIGURE
// Des méthodes de la classe App (src/app.ts), rangées ici par sujet :
// elles s'ajoutent à la classe à la fin de app.ts (ajouterMethodes).
// =============================================================
import type { App } from '../app'
import { TOUTE_LA_SELECTION, poigneeDuRayon } from '../app'
import type { Prise } from '../app'
import { bornerDecalage, placesDesNoms, sommetsDe, versRelatif } from '../formes'
import type { P, Reconnue } from '../formes'
import { cacheAuDessus } from '../geometrie'
import { tableauCache } from '../navigateur'
import { messageOptions } from '../pointeurs'
import type { TypePointeur } from '../pointeurs'
import { libre, uid } from '../types'
import type { Figure, Forme, Habillage, Outil, Trait } from '../types'

export const methodesFigures = {
  // ---------- Figures géométriques ----------
  /** Une figure neuve, avec l'habillage courant */
  figure(this: App, g: { type: 'polygone'; x: number; y: number; pts: number[]; ferme: boolean } | { type: 'cercle'; x: number; y: number; r: number }): Figure {
    return { ...g, id: uid(), z: Date.now(), auteur: this.tableau.moi, couleur: this.couleur, taille: Math.min(this.taille, 4.5) }
  },

  depuisReconnue(this: App, r: Reconnue, t: Trait): Figure {
    const f = r.type === 'cercle'
      ? this.figure({ type: 'cercle', x: r.c.x, y: r.c.y, r: r.r })
      : this.figure({ type: 'polygone', ferme: r.ferme, ...versRelatif(r.pts) })
    f.couleur = t.couleur
    f.brut = { pts: t.pts.map((v, i) => i % 3 === 0 ? v + t.x - f.x : i % 3 === 1 ? v + t.y - f.y : v), taille: t.taille, pression: t.pression }
    return f
  },

  /** Rectangle (Maj : carré) ou cercle tiré à la souris ou au stylet */
  figureTiree(this: App, g: { type: 'rectangle' | 'cercle'; x: number; y: number }, b: P, carre: boolean): Figure | null {
    if (g.type === 'cercle') return this.figure({ type: 'cercle', x: g.x, y: g.y, r: Math.hypot(b.x - g.x, b.y - g.y) })
    let l = b.x - g.x, h = b.y - g.y
    if (carre) { const c = Math.max(Math.abs(l), Math.abs(h)); l = Math.sign(l || 1) * c; h = Math.sign(h || 1) * c }
    const x1 = Math.min(g.x, g.x + l), x2 = Math.max(g.x, g.x + l), y1 = Math.min(g.y, g.y + h), y2 = Math.max(g.y, g.y + h)
    // Sens direct, en partant du coin en bas à gauche : A B C D
    return this.figure({ type: 'polygone', ferme: true, ...versRelatif([{ x: x1, y: y2 }, { x: x2, y: y2 }, { x: x2, y: y1 }, { x: x1, y: y1 }]) })
  },

  /** Polygone point par point : cliquer sur le premier point le ferme,
   *  cliquer deux fois au même endroit (ou Entrée) le laisse ouvert. */
  pointDuPolygone(this: App, a: P, ecran: P): void {
    const pts = this.polyEnCours
    if (!pts) { this.polyEnCours = [a]; return }
    const prem = this.cam.versEcran(pts[0].x, pts[0].y), der = this.cam.versEcran(pts[pts.length - 1].x, pts[pts.length - 1].y)
    if (pts.length >= 3 && Math.hypot(prem.x - ecran.x, prem.y - ecran.y) < 12) return this.finirPolygone(true)
    if (Math.hypot(der.x - ecran.x, der.y - ecran.y) < 6) return this.finirPolygone(false)
    pts.push(a)
  },

  finirPolygone(this: App, ferme: boolean): void {
    const pts = this.polyEnCours
    this.annulerPolygone()
    if (pts && pts.length >= (ferme ? 3 : 2)) this.poserFigure(this.figure({ type: 'polygone', ferme, ...versRelatif(pts) }), false)
  },

  /** L'extrémité visée : accrochée à un point existant, ou tous les 15° avec Maj */
  boutDuTrait(this: App, a: P, m: P, maj: boolean): P {
    if (!maj) return this.accrocher(m, a).p
    const b = this.aimanter(m)
    const ang = Math.round(Math.atan2(b.y - a.y, b.x - a.x) / (Math.PI / 12)) * (Math.PI / 12)
    const d = Math.hypot(b.x - a.x, b.y - a.y)
    return { x: a.x + d * Math.cos(ang), y: a.y + d * Math.sin(ang) }
  },

  /** Un point existant sous le pointeur s'éclaire : on sait qu'on s'y accrochera */
  montrerAccroche(this: App, m: P, exclu?: P): void {
    const o = this.accrocher(m, exclu)
    const c = o.accroche ? { a: o.p } : null
    const avant = this.rendu.cible
    if (!c && !avant) return
    if (c && avant && !avant.b && avant.a.x === c.a.x && avant.a.y === c.a.y) return
    this.rendu.cible = c
    this.rendu.redessinerDirect()
  },

  apercuTrait(this: App, a: P, b: P): void {
    this.rendu.monSegment = { x1: a.x, y1: a.y, x2: b.x, y2: b.y, couleur: this.couleur, taille: this.taille }
    // Une droite ou une demi-droite se voit prolongée pendant qu'on la trace
    this.rendu.apercu = null
    if (this.typeTrait !== 'segment' && Math.hypot(b.x - a.x, b.y - a.y) > 1) {
      const f = this.figure({ type: 'polygone', ferme: false, ...versRelatif([a, b]) })
      if (f.type === 'polygone') f.prolonge = this.typeTrait
      this.rendu.apercu = f
    }
    const o = this.accrocher(b, a)
    this.rendu.cible = o.accroche && o.p.x === b.x && o.p.y === b.y ? { a: b } : null
    this.rendu.redessinerDirect()
  },

  finirTrait(this: App, a: P, b: P): void {
    this.rendu.monSegment = null; this.rendu.apercu = null; this.rendu.cible = null
    if (Math.hypot(b.x - a.x, b.y - a.y) > 2) {
      const f = this.figure({ type: 'polygone', ferme: false, ...versRelatif([a, b]) })
      if (this.typeTrait !== 'segment' && f.type === 'polygone') f.prolonge = this.typeTrait
      this.poserFigure(f, false)
    }
    this.rendu.redessinerDirect()
  },

  annulerTrait(this: App): void {
    if (!this.traitEnAttente) return
    this.traitEnAttente = null
    this.rendu.monSegment = null; this.rendu.apercu = null; this.rendu.cible = null
    this.rendu.redessinerDirect()
  },

  annulerPolygone(this: App): void {
    if (!this.polyEnCours) return
    this.polyEnCours = null; this.rendu.apercu = null; this.rendu.cible = null; this.rendu.redessinerDirect()
  },

  /** Pose une forme ; prendre : elle devient la sélection (une copie, une
   *  image, une figure transformée). Ce qu'on vient de tracer ne l'est pas :
   *  sous l'outil de dessin, ses sommets ne doivent pas se prendre. */
  poserFigure(this: App, f: Forme, prendre = true): void {
    this.tableau.nouveauGeste()
    this.tableau.poser(this.page, f)
    if (prendre) this.selectionner(f.id)
  },

  selectionner(this: App, id: string): void {
    this.selection.clear(); this.selection.add(id)
    this.rendu.redessinerDirect(); this.ui.maj()
  },

  /** Le menu complet d'un objet ne s'ouvre qu'à la demande (voir
   *  demanderOptions) : l'objet devient la sélection, seul */
  ouvrirOptions(this: App, f: Forme): void {
    this.astuceOptions = true
    this.selection.clear(); this.selection.add(f.id)
    this.options = f.id
    this.rendu.redessinerDirect(); this.ui.maj()
  },

  /** Le menu commun d'une sélection de plusieurs objets : elle reste
   *  entière (« N objets » : couleur, épaisseur, dupliquer, copier, couper,
   *  supprimer) */
  ouvrirOptionsSelection(this: App): void {
    this.astuceOptions = true
    this.options = TOUTE_LA_SELECTION
    this.rendu.redessinerDirect(); this.ui.maj()
  },

  /** Le menu commun d'un groupe (« Groupe · N objets ») : ses membres
   *  deviennent la sélection */
  ouvrirOptionsGroupe(this: App, membres: Forme[]): void {
    this.selection.clear()
    for (const g of membres) this.selection.add(g.id)
    this.ouvrirOptionsSelection()
  },

  /** Le menu complet de ce qui est sous le pointeur (client : le point de
   *  l'appui dans la fenêtre). Le clic droit (le bouton du stylet en est
   *  un) et l'appui long (voir armerAppuiLong) passent par ici ; « Options »
   *  de la barre d'actions ouvre le même menu (ouvrirOptions,
   *  ouvrirOptionsSelection) : le même menu, de la même façon, partout. Dans
   *  l'ordre :
   *  - un objet d'une sélection de plusieurs : leur menu commun, et la
   *    sélection reste entière (même près du sommet d'une de ses figures) ;
   *  - un morceau d'une figure (un sommet, le centre ou le rayon d'un
   *    cercle, un nom), de n'importe quelle figure : le menu de ce morceau ;
   *  - un objet (une formule comprise) : son menu, l'objet seul sélectionné ;
   *  - rien : le menu de la page (Coller ici, Tout sélectionner, Tout voir).
   *  L'objet se vise comme le clic de la Sélection, à la portée du pointeur ;
   *  l'intérieur d'une figure fermée ne compte qu'à la Sélection et au doigt
   *  qui déplace (le Stylo en main, un clic droit dans le vide d'un triangle
   *  ouvre le menu de la page, comme à côté). Rien quand le tableau est
   *  caché (la revue, la trieuse des pages : voir
   *  tableauCache), ni quand un clic est attendu ; rien sur un
   *  instrument, qui recouvre ce qui est dessous et n'a pas de menu. */
  demanderOptions(this: App, client: { clientX: number; clientY: number }, pointeur: TypePointeur): void {
    if (tableauCache(this) || this.placement) return
    this.viderPointEnAttente()
    const m = this.monde(client), s = this.ecran(client)
    if (this.instruments.size && this.instrumentSous(m)) { this.ui.fermerMenus(); return }
    const dedans = this.outil === 'selection' || (pointeur === 'touch' && this.doigtDeplace)
    // Un objet verrouillé ouvre ici son menu court (lot 5) : c'est par là
    // qu'on le déverrouille. Une image fixée en fond, jamais : pour la prise,
    // elle est le vide, et le menu de la page la détache.
    const c = this.cibleSous(m, s, { pointeur, dedans, verrouilles: true })
    // Le morceau visé, dans n'importe quelle figure : c'est une demande
    // d'options. Pas à travers une image ou une figure coloriée peinte
    // dessus : c'est elle qu'on touche (voir cibleSous). Une formule, au fond
    // transparent, ne cache pas le sommet qu'on voit à travers elle.
    let prise = this.priseSous(s, { toutes: true })
    if (prise && cacheAuDessus(this.formes, this.formes.indexOf(prise.f), m.x, m.y, g => this.boiteDeForme(g))) prise = null
    // Un seul menu ouvert : celui d'avant (un morceau, un objet, la liste
    // des instruments) se ferme
    this.ui.fermerMenus()
    if (c && this.selection.size > 1 && this.selection.has(c.f.id)) { this.ouvrirOptionsSelection(); return }
    if (prise) {
      this.choisirPartie(prise.f.id, prise.prise)
      this.ui.ouvrirMenuPartie(prise.f.id, prise.prise, client.clientX, client.clientY)
      return
    }
    this.ui.fermerMenuPartie()
    if (this.partie) this.choisirPartie(null)
    // Un membre d'un groupe qui n'est pas pris (lot 5) : le groupe entier
    // devient la sélection, et son menu commun s'ouvre (celui d'un groupe
    // verrouillé : son menu court) ; un membre pris seul ouvre le sien
    if (c) {
      const membres = this.membres(c.f)
      if (membres.length > 1 && !this.selection.has(c.f.id)) { this.ouvrirOptionsGroupe(membres); return }
      this.ouvrirOptions(c.f); return
    }
    this.ui.ouvrirMenuPage(client.clientX, client.clientY, m)
  },

  /** La touche Menu du clavier, ou Maj + F10 (voir toucheMenu) : le menu
   *  complet de ce qui est sélectionné (son objet, une formule comprise, ou
   *  le menu commun de plusieurs), sinon le menu de la page, au milieu de ce
   *  qu'on voit entre les barres (« Coller ici » y colle). Comme un menu
   *  ouvert au clavier, le focus va à sa première entrée. Un menu déjà
   *  ouvert se ferme (un seul à la fois) ; celui d'un sommet aussi : la
   *  touche ouvre le menu de la figure. Rien pendant la revue, ni quand un
   *  clic est attendu (la séance et les champs de saisie gardent leurs
   *  touches : voir clavier). */
  menuAuClavier(this: App): void {
    if (tableauCache(this) || this.placement) return
    this.viderPointEnAttente()
    this.ui.fermerMenus()
    this.toucheMenuA = performance.now()
    const seul = this.selection.size === 1 ? this.forme([...this.selection][0]) : null
    if (this.selection.size > 1) this.ouvrirOptionsSelection()
    else if (seul) this.ouvrirOptions(seul)
    else {
      const z = this.zone.getBoundingClientRect(), r = this.ui.zoneLibre()
      const client = { clientX: z.left + r.x + r.l / 2, clientY: z.top + r.y + r.h / 2 }
      this.ui.ouvrirMenuPage(client.clientX, client.clientY, this.monde(client), true)
      return
    }
    this.ui.entrerDansMenu()
  },

  /** Un toucher du doigt en ce point de la fenêtre prendrait-il quelque
   *  chose, par son tracé, par un morceau ou par un plein (une formule, une
   *  image, une figure coloriée) ; ou un instrument ? L'intérieur nu d'une
   *  figure fermée ne compte pas : écrire dans un grand cadre est courant,
   *  et la barre d'actions de ce qu'on y a pris flotte souvent au-dessus de
   *  ce vide (voir BarreActions.appui). */
  quelqueChoseSousLeDoigt(this: App, client: { clientX: number; clientY: number }): boolean {
    const m = this.monde(client), s = this.ecran(client)
    if (this.instruments.size && this.instrumentSous(m)) return true
    return !!this.cibleSous(m, s, { pointeur: 'touch', dedans: false })
  },

  /** La première fois qu'on prend un objet, on dit où sont toutes ses
   *  options, dans les mots du pointeur (voir messageOptions) : le clic droit
   *  à la souris, le bouton du stylet à la tablette graphique, l'appui long
   *  au stylet posé sur l'écran et au doigt (l'objet a été pris à l'outil
   *  Sélection ou au doigt qui déplace, où l'appui long existe ; le double
   *  appui marche toujours, mais l'appui long est le geste qu'on essaie
   *  d'instinct sur une tablette) */
  direOptions(this: App): void {
    // Une image seule, la première fois : ce que fait son cadre (lot 5) ; le
    // message des options attend le prochain objet pris
    if (this.direCadre()) return
    if (this.astuceOptions || this.selection.size !== 1) return
    const f = this.formeChoisie()
    // Une formule, elle, se modifie au double-clic : le message ne lui va pas
    if (!f || f.type === 'formule') return
    this.astuceOptions = true
    this.ui.message(messageOptions(this.dernierPointeur))
  },

  // ---------- Morceaux d'une figure ----------
  /** Le morceau (nom, sommet, centre, rayon) sous le pointeur (écran). On ne
   *  le prend que dans la figure sélectionnée, et seulement avec l'outil
   *  Sélection (o.outil : celui qui compte, l'outil en main par défaut) :
   *  jamais sous un outil de dessin, sinon on ne pourrait plus écrire près
   *  d'un point. o.toutes : dans n'importe quelle figure, la sélectionnée
   *  d'abord, puis la plus haute (le clic droit, qui demande des options).
   *  Jamais un morceau d'une figure verrouillée (lot 5), même au clic droit :
   *  ses sommets, ses noms, son centre et son rayon ne se tirent plus. */
  priseSous(this: App, s: P, o: { outil?: Outil; toutes?: boolean } = {}): { prise: Prise; f: Figure } | null {
    if (this.enLecture) return null
    const choisie = this.formeChoisie() ?? (this.partie && this.forme(this.partie.id))
    const candidates = o.toutes ? [...(choisie ? [choisie] : []), ...[...this.formes].reverse()]
      : (o.outil ?? this.outil) === 'selection' && choisie ? [choisie] : []
    for (const f of candidates) {
      if ((f.type !== 'polygone' && f.type !== 'cercle') || !libre(f)) continue
      const r = this.priseDans(f, s)
      if (r) return r
    }
    return null
  },

  priseDans(this: App, f: Figure, s: P): { prise: Prise; f: Figure } | null {
    const pres = (w: P, r: number) => { const e = this.cam.versEcran(w.x, w.y); return Math.hypot(e.x - s.x, e.y - s.y) < r }
    if (f.sommets && f.noms) {
      const places = placesDesNoms(f)
      for (let i = 0; i < places.length; i++) {
        if (f.noms[i] && !f.styleNoms?.[i]?.cache && pres(places[i], Math.max(12, 15 * this.cam.z))) return { prise: { quoi: 'nom', i }, f }
      }
    }
    if (f.type === 'polygone') {
      const pts = sommetsDe(f)
      for (let i = 0; i < pts.length; i++) if (pres(pts[i], 11)) return { prise: { quoi: 'sommet', i }, f }
    } else {
      if (pres(poigneeDuRayon(f), 11)) return { prise: { quoi: 'rayon' }, f }
      if (pres({ x: f.x, y: f.y }, 10)) return { prise: { quoi: 'sommet', i: 0 }, f }   // le centre
    }
    return null
  },

  /** La figure, avec le morceau saisi amené en m (monde) */
  manipuler(this: App, f: Figure, p: Prise, m: P): Figure {
    if (p.quoi === 'rayon' && f.type === 'cercle') {
      const a = this.aimanter(m)
      return { ...f, r: Math.max(4, Math.hypot(a.x - f.x, a.y - f.y)) }
    }
    if (p.quoi === 'sommet' && f.type === 'cercle') {
      const a = this.aimanter(m)
      return { ...f, x: a.x, y: a.y }
    }
    if (p.quoi === 'sommet' && f.type === 'polygone') {
      const pts = sommetsDe(f)
      pts[p.i] = this.aimanter(m)
      return { ...f, ...versRelatif(pts) }
    }
    if (p.quoi === 'nom') {
      const point = f.type === 'cercle' ? { x: f.x, y: f.y } : sommetsDe(f)[p.i]
      const n = f.type === 'cercle' ? 1 : f.pts.length / 2
      const posNoms = Array.from({ length: n }, (_, i) => f.posNoms?.[i] ?? null)
      posNoms[p.i] = bornerDecalage({ x: m.x - point.x, y: m.y - point.y })
      return { ...f, posNoms }
    }
    return f
  },

  /** Choisit un seul morceau d'une figure (null : plus rien) */
  choisirPartie(this: App, id: string | null, prise?: Prise): void {
    this.partie = id && prise ? { id, prise } : null
    if (this.partie) this.selection.clear()
    this.rendu.partie = this.partie
    this.rendu.redessinerDirect(); this.ui?.maj()
  },

  /** Suppr sur un sommet le retire de la figure ; sur un nom, le masque */
  supprimerPartie(this: App): void {
    const p = this.partie, f = p && this.forme(p.id)
    if (!p || !f || (f.type !== 'polygone' && f.type !== 'cercle')) return
    this.ui.fermerMenuPartie()
    if (p.prise.quoi === 'nom') { this.reglerPartie(f, 'styleNoms', p.prise.i, { cache: true }); return this.choisirPartie(null) }
    if (p.prise.quoi !== 'sommet' || f.type !== 'polygone') return
    const n = f.pts.length / 2, i = p.prise.i
    if (n <= (f.ferme ? 3 : 2)) return this.ui.message('La figure n\'a plus assez de sommets : Suppr sur la figure l\'efface.')
    const sans = <T,>(l?: T[]) => l?.filter((_, k) => k !== i)
    const pts = sommetsDe(f).filter((_, k) => k !== i)
    this.habiller(f, { ...versRelatif(pts), noms: sans(f.noms), posNoms: sans(f.posNoms), stylePoints: sans(f.stylePoints), styleNoms: sans(f.styleNoms) } as Partial<Habillage>)
    this.choisirPartie(null)
  },

  /** Échap : d'abord annuler ce qui est en cours ; s'il n'y a rien,
   *  passer à la Sélection — et un second Échap rend l'outil d'avant. */
  echap(this: App): void {
    if (this.laser) { this.basculerLaser(false); this.ui.message('Pointeur laser rangé'); return }
    if (this.rognage) { this.finirRognage(false); return }
    // En train de changer la taille ou de tourner (lot 5) : le geste
    // s'abandonne, tout revient, et la sélection reste
    if (this.geste?.type === 'taille' || this.geste?.type === 'tourner') { this.abandonnerGeste(); this.ui.maj(); return }
    this.viderPointEnAttente()
    if (this.placement) { const p = this.placement; this.placement = null; p.annuler(); return }
    if (this.traitEnAttente) { this.annulerTrait(); return }
    const enCours = !!this.polyEnCours || this.selection.size > 0 || !!this.partie
    this.annulerPolygone(); this.selection.clear(); this.choisirPartie(null); this.finirAjout()
    this.ui.fermerMenuPartie()
    if (!enCours) {
      if (this.outil !== 'selection') {
        this.choisirOutil('selection')
        this.ui.message('Sélection : glisser un objet le déplace, glisser dans le vide sélectionne. Échap : revenir.')
      } else {
        this.choisirOutil(this.outilAvant)
        this.ui.message('Retour à l\'outil précédent')
      }
    }
    this.rendu.toutRedessiner(); this.ui.maj()
  },
}
