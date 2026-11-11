// =============================================================
// L'APP : LES GROUPES, ENVOYER VERS UNE AUTRE PAGE
// Des méthodes de la classe App (src/app.ts), rangées ici par sujet :
// elles s'ajoutent à la classe à la fin de app.ts (ajouterMethodes).
// =============================================================
import type { App } from '../app'
import { CLE_PRESSE_PAPIERS, GARDE_DUREE, GARDE_MAX } from '../app'
import { vueAuDebut } from '../camera'
import type { EtapeDePile } from '../document'
import { nomsLibres, sommetsDe } from '../formes'
import type { P } from '../formes'
import { touche } from '../geometrie'
import { avecGroupes, changementsDegrouper, changementsGrouper, groupeExact, membreSeul, membresDe, priseDuClic } from '../groupes'
import { estPdf } from '../import-pdf'
import { tableauCache } from '../navigateur'
import { texteEnvoi } from '../pages/envoi'
import { messageDetacher, messageVerrou } from '../pointeurs'
import { collage, lireHtml, lireJson, memeTexte, versTexte } from '../presse-papiers'
import type { Copie } from '../presse-papiers'
import { RAYON_TRAIT } from '../reglages'
import { estTexte } from '../texte'
import { CM, FOND_NEUF, libre, uid } from '../types'
import type { Figure, Forme, Polygone } from '../types'
import { quiBouge, texteCollage } from '../verrou'

export const methodesGroupes = {
  // ---------- Les groupes (lot 5) ----------
  /** Les membres du groupe de f sur la page, dans l'ordre d'affichage : f
   *  seul s'il n'a pas de groupe, ou si son groupe n'a plus que lui dans
   *  son état (voir membresDe dans groupes.ts) */
  membres(this: App, f: Forme): Forme[] { return membresDe(this.formes, f) },

  /** Ces identifiants, chacun étendu aux membres de son groupe */
  avecGroupes(this: App, ids: Iterable<string>): Set<string> { return avecGroupes(this.formes, ids) },

  /** La sélection est-elle exactement un groupe (le menu commun devient
   *  « Groupe · N objets », avec Dégrouper) ? Ses membres, sinon null. */
  groupePris(this: App): Forme[] | null { return groupeExact(this.formes, this.selection) },

  /** La sélection est-elle un membre pris seul (son menu ⋯ a alors « Sortir
   *  du groupe ») ? Cette forme, sinon null. */
  membrePris(this: App): Forme | null { return membreSeul(this.formes, this.selection) },

  /** Un clic (un toucher, un candidat levé sans glisser) prend f, qui n'est
   *  pas sélectionné. Sans ajout, f et son groupe deviennent la sélection
   *  (ou f seul, d'un membre pris seul à un autre membre du même groupe :
   *  voir priseDuClic) ; avec ajout (Maj, Ctrl ou ⌘, le mode « Ajouter »),
   *  tout son groupe entre dans la sélection, ou en sort s'il y était. */
  prendre(this: App, f: Forme, ajout: boolean): void {
    if (ajout) {
      const dedans = this.selection.has(f.id)
      for (const g of this.membres(f)) { if (dedans) this.selection.delete(g.id); else this.selection.add(g.id) }
      return
    }
    const l = priseDuClic(this.formes, this.selection, f)
    this.selection.clear()
    for (const g of l) this.selection.add(g.id)
    if (l.length === 1 && f.groupe && this.membres(f).length > 1) this.direMembreSeul()
  },

  /** La première fois de la session qu'on prend un seul membre d'un groupe,
   *  un message le dit. Il attend un instant : le second clic d'un
   *  double-clic, qui ne prend que le membre, est suivi du double-clic, qui
   *  rend le groupe et ouvre son menu ; le message ne vient alors pas. */
  direMembreSeul(this: App): void {
    if (this.astuceMembre) return
    clearTimeout(this.minuterieMembre)
    this.minuterieMembre = window.setTimeout(() => {
      if (this.astuceMembre || !membreSeul(this.formes, this.selection)) return
      this.astuceMembre = true
      this.ui.message('Un seul objet du groupe : ce que vous faites ne touche que lui.')
    }, 500)
  },

  /** « Grouper » (Ctrl + G, le menu commun) : ce qui est choisi et libre
   *  (les points libres repérés sur une image choisie la suivent : ils en
   *  sont ; verrouillés, ils n'en sont pas, mais suivent toujours leur
   *  image) devient UN groupe, sous un identifiant neuf ; les membres des
   *  groupes qu'ils avaient le rejoignent (un seul niveau). UNE
   *  transaction notée « réglage » : un Ctrl + Z défait le groupement d'un
   *  coup, et ni la revue, ni les séances, ni le film des élèves n'en font
   *  un geste (rien ne change à l'image). La sélection reste : tout le
   *  groupe. Moins de deux objets, ou déjà ce seul groupe : un message, et
   *  faux. */
  grouper(this: App): boolean {
    if (tableauCache(this)) return false
    this.viderPointEnAttente()
    const choisis = this.objetsChoisis()
    const libres = choisis.filter(libre)
    if (choisis.length && !libres.length) { this.ui.message('Verrouillé : déverrouillez-le d\'abord.'); return false }
    const id = uid()
    const changements = changementsGrouper(this.formes, libres.map(f => f.id), id)
    if (!changements.length) {
      this.ui.message(this.avecGroupes(libres.map(f => f.id)).size >= 2 ? 'Ces objets sont déjà groupés.' : 'Sélectionnez au moins deux objets pour les grouper.')
      return false
    }
    this.ui.fermerMenuPartie()
    if (this.partie) this.choisirPartie(null)
    this.tableau.nouveauGeste()
    this.tableau.modifier(this.page, changements, { note: 'reglage' })
    const membres = this.formes.filter(f => f.groupe === id)
    this.selection.clear()
    for (const f of membres) this.selection.add(f.id)
    this.rendu.redessinerDirect(); this.ui.maj()
    let texte = `Groupé : ${membres.length} objets`
    if (!this.astuceGroupe) {
      this.astuceGroupe = true
      texte += this.dernierPointeur === 'touch' ? ' — un toucher sur l\'un d\'eux, quand le groupe est pris, ne prend que lui'
        : ' — un clic sur l\'un d\'eux, quand le groupe est pris, ne prend que lui'
    }
    this.ui.message(texte)
    return true
  },

  /** « Dégrouper » (Ctrl + Maj + G, le menu du groupe) : ce qui est choisi,
   *  libre et membre d'un groupe n'en est plus (la clé s'en va) ; un membre
   *  pris seul sort de son groupe, et si son groupe n'a plus qu'un seul
   *  porteur sur la page, celui-ci perd le sien aussi (un groupe d'un seul
   *  membre n'en est plus un : rien ne traîne). UNE transaction notée
   *  « réglage », comme Grouper. La sélection reste : les mêmes objets, un
   *  par un. Rien à dégrouper : un message, et faux. */
  degrouper(this: App): boolean {
    if (tableauCache(this)) return false
    this.viderPointEnAttente()
    const choisis = this.objetsChoisis()
    const libres = choisis.filter(f => libre(f) && this.membres(f).length > 1)
    if (!libres.length) {
      this.ui.message(choisis.some(f => !libre(f) && this.membres(f).length > 1) ? 'Verrouillé : déverrouillez-le d\'abord.' : 'Aucun groupe dans la sélection.')
      return false
    }
    const sortent = new Set(libres.map(f => f.id))
    const changements = changementsDegrouper(this.formes, sortent)
    // Ce qui resterait seul dans son groupe le quitte aussi
    const restent = new Map<string, Forme[]>()
    for (const f of this.formes) if (f.groupe && !sortent.has(f.id)) restent.set(f.groupe, [...(restent.get(f.groupe) ?? []), f])
    const touches = new Set(libres.map(f => f.groupe!))
    for (const [g, l] of restent) if (touches.has(g) && l.length === 1) changements.push({ id: l[0].id, patch: { groupe: undefined } })
    this.ui.fermerMenuPartie()
    if (this.partie) this.choisirPartie(null)
    this.tableau.nouveauGeste()
    this.tableau.modifier(this.page, changements, { note: 'reglage' })
    this.rendu.redessinerDirect(); this.ui.maj()
    this.ui.message('Dégroupé')
    return true
  },

  /** La copie de ces formes : les données de leurs images, la page, le
   *  centre de leur boîte, l'heure. Une image dont la banque a perdu les
   *  données ne se copie pas (elle ne se collerait nulle part). */
  faireCopie(this: App, formes: Forme[]): Copie | null {
    const images: Record<string, string> = {}
    const gardees = formes.filter(f => {
      if (f.type !== 'image') return true
      const d = this.banqueImages.get(f.src)
      if (typeof d !== 'string') return false
      images[f.src] = d
      return true
    })
    if (!gardees.length) return null
    const b = this.boiteDuContenu(gardees)
    const centre = b ? { x: b.x + b.l / 2, y: b.y + b.h / 2 } : { x: gardees[0].x, y: gardees[0].y }
    this.heureCopie = Math.max(Date.now(), this.heureCopie + 1)
    return { v: 1, formes: gardees, images, page: this.page, centre, t: this.heureCopie }
  },

  /** La copie gardée dans le navigateur, sous la nouvelle clé. Trop grosse
   *  (des images), l'ancienne s'en va : un autre onglet ne doit pas coller
   *  une copie d'avant en croyant coller celle-ci. */
  garderCopie(this: App, c: Copie): void {
    try {
      const texte = JSON.stringify(c)
      if (texte.length <= GARDE_MAX) localStorage.setItem(CLE_PRESSE_PAPIERS, texte)
      else localStorage.removeItem(CLE_PRESSE_PAPIERS)
    } catch {
      try { localStorage.removeItem(CLE_PRESSE_PAPIERS) } catch { /* rien de gardé */ }
    }
  },

  /** La copie dans le presse-papiers du système : execCommand('copy')
   *  déclenche l'événement copy, qui la range (voir le constructeur). Un
   *  navigateur qui refuse ne casse rien : la copie reste en mémoire et dans
   *  le navigateur. */
  ecrireSysteme(this: App, c: Copie): void {
    this.copieAEcrire = c
    this.copieEcrite = false
    try { document.execCommand('copy') } catch { /* refusé : le presse-papiers du système ne l'aura pas */ }
    this.copieAEcrire = null
    this.copieHorsSysteme = this.copieEcrite ? 0 : c.t
  },

  /** Ctrl+X : la copie, puis ce qui est copié part, en une étape (Ctrl+Z le
   *  rend). Un sommet choisi : c'est la figure copiée qui part, pas le sommet.
   *  Seulement ce qui est libre (et les points repérés sur une image qui
   *  part) : un objet verrouillé, dont le menu est ouvert, ne se coupe pas. */
  couper(this: App): boolean {
    if (this.enLecture) return false
    const choisis = this.objetsChoisis()
    const formes = quiBouge(choisis, new Set(choisis.map(f => f.id)))
    if (choisis.length && !formes.length) { this.ui.message('Verrouillé : déverrouillez-le d\'abord.'); return false }
    if (!this.copier(false, formes)) return false
    this.ui.fermerMenuPartie()
    if (this.partie) this.choisirPartie(null)
    this.tableau.nouveauGeste()
    this.tableau.supprimer(this.page, formes.map(f => f.id))
    this.selection.clear()
    this.rendu.redessinerDirect(); this.ui.maj()
    const n = this.copie?.formes.length ?? formes.length
    this.ui.message(n === 1 ? '1 objet coupé' : `${n} objets coupés`)
    return true
  },

  /** La copie à coller : la plus récente de celle de cet onglet et de celle
   *  gardée dans le navigateur (un autre onglet a pu copier depuis). Une copie
   *  gardée depuis plus de 12 h ne compte plus. */
  copieGardee(this: App): Copie | null {
    let gardee: Copie | null = null
    try { gardee = lireJson(localStorage.getItem(CLE_PRESSE_PAPIERS)) } catch { /* rien de gardé */ }
    if (gardee && Date.now() - gardee.t > GARDE_DUREE) gardee = null
    const ici = this.copie && Date.now() - this.copie.t <= GARDE_DUREE ? this.copie : null
    if (ici && (!gardee || gardee.t <= ici.t)) return ici
    return gardee
  },

  /** Y a-t-il une copie à coller (« Coller ici ») ? Le presse-papiers du
   *  système ne se lit pas sans permission : seules comptent les copies de MEM */
  peutColler(this: App): boolean { return !this.enLecture && this.copieGardee() !== null },

  /** Colle la copie gardée (la plus récente) : en ou (monde) si on le donne,
   *  sinon comme Ctrl+V (voir collerCopie) */
  coller(this: App, ou?: P): boolean {
    if (this.enLecture) return false
    const c = this.copieGardee()
    if (!c) { this.ui.message('Rien à coller : copiez d\'abord un objet.'); return false }
    this.collerCopie(c, ou)
    return true
  },

  /** Colle une copie sur la page qu'on regarde, en une étape d'annulation ;
   *  ce qui est collé devient la sélection (l'outil ne change pas). Où :
   *  - en ou, si on le donne (« Coller ici ») ;
   *  - sous le pointeur s'il est sur le tableau et a bougé (plus de 4 px)
   *    depuis la copie ou le collage précédent ;
   *  - sinon, 1 cm plus loin que le collage précédent sur cette page ; le
   *    premier sur la page de la copie, 1 cm à côté de l'original ; sur une
   *    autre page ou dans un autre onglet, à la même place que l'original.
   *  Une place hors de ce qu'on voit devient le milieu de la vue : un Ctrl+V
   *  qui ne montre rien ferait croire qu'il n'a rien fait. */
  collerCopie(this: App, c: Copie, ou?: P): void {
    if (this.enLecture || !c.formes.length) return
    this.viderPointEnAttente()
    const page = this.page
    // Une copie de cet onglet (la même heure, les mêmes objets) : on colle
    // celle qu'on a, telle quelle, plutôt que sa version relue
    const memes = (a: Copie, b: Copie) => a.t === b.t && a.formes.length === b.formes.length && a.formes.every((f, k) => f.id === b.formes[k].id)
    const ici = !!this.copie && memes(this.copie, c)
    if (ici) c = this.copie!
    if (!this.collages || this.collages.cle !== c.t) this.collages = { cle: c.t, pointeur: null, pages: new Map() }
    const suivi = this.collages
    const ptr = this.pointeurSurZone
    const bouge = !!ptr && (!suivi.pointeur || Math.hypot(ptr.clientX - suivi.pointeur.clientX, ptr.clientY - suivi.pointeur.clientY) > 4)
    const avant = suivi.pages.get(page)
    let centre: P
    if (ou) centre = ou
    else if (ptr && bouge) centre = this.monde(ptr)
    else {
      centre = avant ? { x: avant.x + CM, y: avant.y + CM }
        : ici && c.page === page ? { x: c.centre.x + CM, y: c.centre.y + CM }
        : { ...c.centre }
      if (!this.dansLaVue(centre)) { const s = this.centreLibre(); centre = this.cam.versMonde(s.x, s.y) }
    }
    suivi.pages.set(page, centre)
    suivi.pointeur = ptr && { ...ptr }
    // Les images : leurs données entrent dans la banque si elles n'y sont pas
    // (une copie d'un autre tableau) ; sous le même identifiant d'autres
    // données (un autre tableau), elles prennent un identifiant neuf. Jamais
    // une image déjà là n'est remplacée.
    const autres = new Map<string, string>()
    for (const [src, d] of Object.entries(c.images)) {
      const deja = this.banqueImages.get(src)
      if (deja === undefined) this.banqueImages.set(src, d)
      else if (deja !== d) { const n = uid(); this.banqueImages.set(n, d); autres.set(src, n) }
    }
    const formes = autres.size ? c.formes.map(f => f.type === 'image' && autres.has(f.src) ? { ...f, src: autres.get(f.src)! } : f) : c.formes
    this.poserCollage(collage({ ...c, formes }, { dx: centre.x - c.centre.x, dy: centre.y - c.centre.y, moi: this.tableau.moi, existantes: this.formes }))
  },

  /** Pose ce qu'on colle ou duplique (une étape) et sélectionne ce qui en
   *  est libre. Le menu ouvert se ferme : il réglait l'original, pas la
   *  copie. Ce qui est verrouillé ou fixé en fond le reste (lot 5 : le
   *  collage le garde), mais ne se sélectionne pas (il ne se prend pas) :
   *  un message le dit, sinon on croirait que rien n'a été collé. */
  poserCollage(this: App, formes: Forme[]): void {
    this.ui.fermerMenuPartie()
    if (this.partie) this.choisirPartie(null)
    this.options = null
    this.tableau.nouveauGeste()
    this.tableau.poserPlusieurs(this.page, formes)
    this.selection.clear()
    for (const f of formes) if (libre(f)) this.selection.add(f.id)
    this.rendu.redessinerDirect(); this.ui.maj()
    const p = this.dernierPointeur
    const texte = texteCollage(formes, messageVerrou(p), messageDetacher(p))
    if (texte) this.ui.message(texte)
  },

  /** Ce point du monde est-il dans ce qu'on voit entre les barres ? */
  dansLaVue(this: App, w: P): boolean {
    const s = this.cam.versEcran(w.x, w.y)
    const r = this.ui?.zoneLibre() ?? { x: 0, y: 0, l: this.rendu.l, h: this.rendu.h }
    return s.x >= r.x && s.x <= r.x + r.l && s.y >= r.y && s.y <= r.y + r.h
  },

  /** Ctrl+D et « Dupliquer » : une copie 1 cm plus loin, en une étape, qui
   *  devient la sélection ; le presse-papiers n'y est pour rien. Les noms
   *  changent (ceux de l'original sont pris), les points liés à une image
   *  dupliquée suivent la nouvelle. */
  dupliquerSelection(this: App): boolean {
    if (this.enLecture) return false
    this.viderPointEnAttente()
    const formes = this.objetsChoisis()
    if (!formes.length) { this.ui.message('Rien n\'est sélectionné.'); return false }
    const c: Copie = { v: 1, formes, images: {}, page: this.page, centre: { x: 0, y: 0 }, t: 0 }
    this.poserCollage(collage(c, { dx: CM, dy: CM, moi: this.tableau.moi, existantes: this.formes }))
    return true
  },

  // ---------- Envoyer vers une autre page ----------
  /** « Envoyer vers… » (la fenêtre, voir pages/envoi.ts) : ce qui est pris
   *  (objetsChoisis : les points liés aux images choisies suivent) part vers
   *  une autre page. cible : une page de l'ordre, 'apres' (une nouvelle page
   *  juste après celle-ci) ou 'fin' (une nouvelle page à la fin), blanche
   *  comme toute page neuve (voir FOND_NEUF) et sur la vue de la page qu'on
   *  regarde, à 100 % (les objets y sont à la même place, autour du centre
   *  de l'écran). deplacer : ils quittent cette page (sinon ils y restent
   *  aussi). Ce qui arrive vient du collage : identifiants neufs, même
   *  place, au-dessus de tout, noms gardés s'ils sont libres sur la page
   *  d'arrivée, sinon une lettre libre par point. Voir Tableau.envoyer :
   *  l'arrivée, puis le retrait, chacun noté sur sa page ; jamais de perte ni
   *  de doublon caché, quelle que soit la page où l'on fait Ctrl+Z. On reste
   *  sur la page ; la sélection se vide (déplacer) ou reste (copier) ; le
   *  menu complet se ferme ; un message le dit, avec « Aller à la page N »
   *  et « Annuler ». Rien quand le tableau est caché. Vrai si quelque chose
   *  est parti. ids : d'autres objets que ce qui est pris (les images fixées
   *  en fond, que le menu de la page envoie, et les points repérés sur
   *  elles) ; la sélection ne change pas. Le verrou et le fond partent avec
   *  l'objet (lot 5 : voir collage), et une image fixée arrive sous tout. */
  envoyerSelection(this: App, cible: string, deplacer: boolean, ids?: string[]): boolean {
    if (tableauCache(this)) return false
    this.viderPointEnAttente()
    const formes = ids ? this.avecLeursPoints(ids) : this.objetsChoisis()
    const c = formes.length ? this.faireCopie(formes) : null
    if (!c) { this.ui.message('Rien n\'est sélectionné.'); return false }
    // Les pages de la séance du jour (lot 6) : on n'envoie que vers elles,
    // même depuis une séance passée (en lecture : copier, oui ; déplacer, non)
    const a = this.page, pages = this.pagesDuJour, ordre = this.tableau.ordre.toArray()
    let vers = cible
    let nouvelle: { id: string; place: number } | undefined
    if (cible === 'apres' || cible === 'fin') {
      const fin = pages.length ? ordre.indexOf(pages[pages.length - 1]) + 1 : ordre.length
      const place = cible === 'apres' && pages.includes(a) ? ordre.indexOf(a) + 1 : fin
      vers = this.tableau.ajouterPage(FOND_NEUF, place)
      nouvelle = { id: vers, place }
      this.copierVue(a, vers)
    } else if (cible === a || !pages.includes(cible)) {
      this.ui.message('Cette page n\'est plus dans le tableau : rien n\'a été envoyé.')
      return false
    }
    // Les noms pris sur la page d'arrivée. Un déplacement y arrive hors de
    // toute pile : un Ctrl+Z là-bas peut ensuite ramener une figure effacée
    // ou partie (voir Tableau.formesQuiPeuventRevenir) ; ses noms comptent
    // pour pris. Une copie, elle, est une étape de la pile d'arrivée,
    // défaite avant tout ce qui la précède, comme un collage.
    const existantes = [...(this.tableau.formesDe(vers)?.values() ?? [])]
    if (deplacer) existantes.push(...this.tableau.formesQuiPeuventRevenir(vers, { de: a, ids: new Set(c.formes.map(f => f.id)) }))
    const posees = collage(c, { dx: 0, dy: 0, moi: this.tableau.moi, existantes })
    const ok = this.tableau.envoyer(a, vers, posees, c.formes.map(f => f.id), { deplacer, nouvelle })
    this.ui.fermerMenuPartie()
    if (this.partie) this.choisirPartie(null)
    this.options = null
    if (!ok) { this.rendu.redessinerDirect(); this.ui.maj(); this.ui.message('Rien n\'a été envoyé.'); return false }
    // L'étape que « Annuler » défera, si elle est encore la prochaine
    const etape = this.tableau.prochaineAnnulation(deplacer ? a : vers)
    if (deplacer && !ids) this.selection.clear()
    this.rendu.redessinerDirect(); this.ui.maj()
    const k = this.pagesDuJour.indexOf(vers) + 1
    this.ui.message(texteEnvoi(posees.length, k, deplacer), [
      { libelle: `Aller à la page ${k}`, faire: () => this.allerAuxEnvoyes(vers, posees), garder: true },
      { libelle: 'Annuler', faire: () => deplacer ? this.annulerEnvoi(a, etape) : this.annulerCopieEnvoyee(vers, etape), cle: 'envoi:' + vers },
    ])
    return true
  },

  /** « Aller à la page N » du message d'un envoi : on y va, et ce qui y est
   *  arrivé (et y est encore) devient la sélection, sans changer d'outil
   *  (comme un collage), sauf ce qui est verrouillé ou fixé en fond (lot 5 :
   *  il ne se prend pas). Si rien de ce qui est arrivé n'est visible, la vue
   *  s'y porte, à 100 % comme toute page où l'on arrive (sur son début s'il
   *  ne tient pas : voir vueAuDebut). Le message reste, avec « Annuler ». */
  allerAuxEnvoyes(this: App, vers: string, posees: Forme[]): void {
    if (tableauCache(this)) return
    this.viderPointEnAttente()
    if (!this.pagesDuJour.includes(vers)) return this.ui.message('Cette page n\'est plus dans le tableau.')
    this.allerPage(vers)
    const envoyes = new Set(posees.map(f => f.id))
    const la = this.formes.filter(f => envoyes.has(f.id))
    this.selection.clear()
    for (const f of la) if (libre(f)) this.selection.add(f.id)
    this.rendu.redessinerDirect(); this.ui.maj()
    const b = la.length ? this.boiteDuContenu(la) : null
    if (!b) return
    const r = this.ui.zoneLibre()
    const p = this.cam.versEcran(b.x, b.y), q = this.cam.versEcran(b.x + b.l, b.y + b.h)
    const visible = q.x >= r.x && p.x <= r.x + r.l && q.y >= r.y && p.y <= r.y + r.h
    if (!visible) this.allerVers(vueAuDebut(b, r))
  },

  /** « Annuler » du message d'un DÉPLACEMENT : seulement si son retrait est
   *  encore la prochaine étape que Ctrl+Z défera sur la page de départ ; on
   *  y revient s'il le faut (on a pu aller voir la page d'arrivée), et l'on
   *  défait : les objets reparaissent sous les yeux, et le message dit qu'ils
   *  ont quitté l'arrivée. Sinon il défairait autre chose, qu'on ne voit pas. */
  annulerEnvoi(this: App, de: string, etape: EtapeDePile | null): void {
    if (tableauCache(this)) return
    this.viderPointEnAttente()
    if (!this.pages.includes(de)) return this.ui.message('La page d\'où les objets sont partis n\'est plus dans le tableau.')
    if (!etape || this.tableau.prochaineAnnulation(de) !== etape) return this.ui.message('La page a changé depuis : ↶ défait les gestes un à un.')
    if (this.page !== de) this.allerPage(de)
    this.annuler()
  },

  /** « Annuler » du message d'une COPIE : on va D'ABORD sur la page
   *  d'arrivée (jamais un Ctrl+Z sur une page qu'on ne regarde pas), puis
   *  l'on défait si l'arrivée est encore la prochaine étape de sa pile : les
   *  copies partent sous les yeux. */
  annulerCopieEnvoyee(this: App, vers: string, etape: EtapeDePile | null): void {
    if (tableauCache(this)) return
    this.viderPointEnAttente()
    const k = this.pages.indexOf(vers) + 1
    if (!k) return this.ui.message('La page où les objets ont été copiés n\'est plus dans le tableau.')
    this.allerPage(vers)
    if (!etape || this.tableau.prochaineAnnulation(vers) !== etape) return this.ui.message(`La page ${k} a changé depuis : ↶ y défait les gestes un à un.`)
    this.annuler()
  },

  /** Ctrl+A : tout ce qui est sur la page qu'on regarde et se prend (ni ce
   *  qui est verrouillé, ni ce qui est fixé en fond : lot 5). On passe à
   *  l'outil Sélection, comme Échap (on peut alors glisser le tout, et un
   *  second Échap rend l'outil d'avant). */
  toutSelectionner(this: App): void {
    if (this.enLecture) return
    this.viderPointEnAttente()
    if (!this.formes.length) { this.ui.message('La page est vide.'); return }
    const libres = this.formes.filter(libre)
    if (!libres.length) { this.ui.message('Rien à sélectionner : ce qui est sur la page est verrouillé ou fixé en fond.'); return }
    if (this.outil !== 'selection') this.choisirOutil('selection')
    this.ui.fermerMenuPartie()
    if (this.partie) this.choisirPartie(null)
    this.selection.clear()
    for (const f of libres) this.selection.add(f.id)
    this.rendu.redessinerDirect(); this.ui.maj()
    const n = libres.length
    this.ui.message(n === 1 ? '1 objet sélectionné' : `${n} objets sélectionnés`)
  },

  /** Y a-t-il quelque chose à sélectionner sur la page (« Tout
   *  sélectionner » se grise sinon : une page vide, ou dont tout est
   *  verrouillé ou fixé en fond) ? */
  rienASelectionner(this: App): boolean { return !this.formes.some(libre) },

  /** Ctrl+V (ou le menu Édition du navigateur), hors d'un champ de saisie :
   *  dans l'ordre, des objets de MEM teachingtool marqués dans le HTML (d'un
   *  autre onglet, de l'autre version) ; une image (comme avant) ; la copie
   *  gardée, si le texte du presse-papiers est vide ou est le sien (l'écriture
   *  dans le système a échoué, ou c'est bien elle) ; sinon on dit qu'il n'y a
   *  rien à coller. Ni quand le tableau est caché (la revue, une séance, la
   *  trieuse des pages : Ctrl+V y collerait une copie sur une page qu'on ne
   *  voit pas), ni dans une fenêtre ouverte. */
  surColler(this: App, e: ClipboardEvent): void {
    // Ctrl+V vient d'être pressé (voir clavier) : un clavier est là
    const auClavier = this.collageAttendu !== 0
    clearTimeout(this.collageAttendu); this.collageAttendu = 0
    if ((e.target as HTMLElement | null)?.closest?.('input, textarea, [contenteditable]')) return
    if (tableauCache(this) || document.querySelector('dialog[open]')) return
    const d = e.clipboardData
    if (!d) return
    const marquee = lireHtml(d.getData('text/html'))
    if (marquee) { e.preventDefault(); this.collerCopie(marquee); return }
    const f = [...d.files].find(x => x.type.startsWith('image/') || estPdf(x))
    if (f) { e.preventDefault(); this.importerImage(f, { clavier: auClavier }); return }
    const gardee = this.copieGardee(), texte = d.getData('text/plain')
    // Le presse-papiers du système a refusé cette copie : il a encore autre
    // chose, mais c'est bien elle qu'on vient de copier
    if (gardee && (!texte || memeTexte(texte, versTexte(gardee)) || gardee.t === this.copieHorsSysteme)) { e.preventDefault(); this.collerCopie(gardee); return }
    this.ui.message('Le presse-papiers ne contient ni objet ni image à coller.')
  },

  /** L'outil Point : un clic pose un point marqué d'une croix, nommé de la
   *  lettre libre suivante. Posé sur une image, il lui est lié : il la suit,
   *  et sert à construire son image par une transformation. */
  placerPoint(this: App, m: P): void {
    const p = this.aimanter(m)
    const sous = [...this.formes].reverse().find(f => f.type === 'image' && touche(f, p.x, p.y, 0, this.boiteTouche))
    const f = this.nouvelleFigure({ type: 'polygone', ferme: false, pts: [p] })
    f.sommets = true
    f.noms = nomsLibres(1, this.formes)
    f.stylePoints = [{ marque: 'croix' }]
    if (sous) f.lie = sous.id
    this.tableau.nouveauGeste()
    this.poserFigureSeule(f)
    this.rendu.redessinerDirect()
  },

  /** Les figures liées à une image (elles la suivent) */
  liees(this: App, id: string): Figure[] {
    return this.formes.filter((g): g is Figure => (g.type === 'polygone' || g.type === 'cercle') && g.lie === id)
  },

  sommetsDe(this: App, f: Polygone): P[] { return sommetsDe(f) },

  /** La gomme efface ce qu'elle touche, sauf ce qui est verrouillé ou fixé
   *  en fond (lot 5) : on gomme l'écriture sur un énoncé fixé sans l'abîmer.
   *  (La gomme au trait entier ; celle qui efface là où elle passe : voir
   *  gommerLa) */
  gommer(this: App, x: number, y: number, deja?: Set<string>): void {
    const r = RAYON_TRAIT / this.cam.z
    // Jamais une image ni un texte : on écrit dessus, la gomme n'y efface que
    // l'écriture (le souhait du professeur) ; ils s'enlèvent par « Supprimer »
    const touches = this.formes.filter(f => f.type !== 'image' && !estTexte(f) && libre(f) && !deja?.has(f.id) && touche(f, x, y, r, this.boiteTouche))
    if (!touches.length) return
    touches.forEach(f => deja?.add(f.id))
    this.tableau.supprimer(this.page, touches.map(f => f.id))
  },
}
