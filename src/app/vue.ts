// =============================================================
// L'APP : LES OUTILS ET LA VUE
// Des méthodes de la classe App (src/app.ts), rangées ici par sujet :
// elles s'ajoutent à la classe à la fin de app.ts (ajouterMethodes).
// =============================================================
import type { App } from '../app'
import { VUE_NEUTRE } from '../app'
import { vueAuDebut, vuePour } from '../camera'
import type { EtapeDePile } from '../document'
import { chevauche, englobante } from '../geometrie'
import { tableauCache } from '../navigateur'
import { TEXTE_ENVOI_IMPOSSIBLE, texteEnvoiAnnule, texteEnvoiBloque } from '../pages/envoi'
import { boiteDe } from '../revoir/bobine'
import type { Boite } from '../revoir/bobine'
import { ecrireSession, oublierSession } from '../session'
import type { Vue } from '../session'
import { libre } from '../types'
import type { Forme, Outil } from '../types'

export const methodesVue = {
  // ---------- Outils ----------
  /** L'épaisseur que montrent et règlent les boutons d'épaisseur : celle du
   *  Surligneur quand on le tient, celle du Stylo (et des segments, des
   *  formes) sinon */
  tailleEnMain(this: App): number { return this.outil === 'surligneur' ? this.tailleSurligneur : this.taille },
  choisirTaille(this: App, v: number): void {
    if (this.outil === 'surligneur') this.tailleSurligneur = v
    else this.taille = v
  },

  /** Prend l'outil o. Passer à la Sélection depuis un autre outil (Échap,
   *  V, son bouton, Ctrl + A, Détacher) retient l'outil quitté : c'est lui
   *  que rend Échap depuis la Sélection (contrôle final du lot 5 : seul
   *  Échap le retenait, et après V, Échap rendait l'outil quitté par un
   *  Échap d'avant, la Formule par exemple). Tout choix oublie la Sélection
   *  prêtée par une image (voir selectionPretee) : choisie, même à nouveau
   *  (V, son bouton), elle n'est plus prêtée. */
  choisirOutil(this: App, o: Outil): void {
    this.finirTexte()
    if (this.laser) this.basculerLaser(false)
    if (o === 'selection' && this.outil !== 'selection') this.outilAvant = this.outil
    this.selectionPretee = null
    this.viderPointEnAttente()
    this.annulerPolygone()
    this.annulerTrait()
    this.survol = null; this.rendu.survol = null; this.rendu.survolAussi = []
    if (this.partie) this.choisirPartie(null)
    this.finirAjout()
    this.outil = o
    if (o !== 'selection') this.selection.clear()
    this.cacherCadenas()
    this.majPoignees()
    this.rendu.gomme = null
    this.rendu.toutRedessiner()
    this.zone.dataset.outil = o
    // La sorte de trait ou de forme : le curseur en montre l'icône (curseurs.ts)
    this.zone.dataset.trait = this.typeTrait
    this.zone.dataset.forme = this.typeForme
    this.ui?.maj()
  },

  /** Défait le dernier geste de la page qu'on regarde, et d'elle seule :
   *  chaque page garde sa pile (voir Tableau.annulationDe), et rien ne change
   *  jamais là où l'on ne regarde pas. Le point d'un simple toucher au Stylo,
   *  qui attend un double-clic, se pose d'abord : c'est le dernier geste
   *  visible, c'est lui qui part. Vrai si un geste a été défait.
   *  L'interface est remise à jour APRÈS avoir vidé la sélection : le
   *  rafraîchissement déclenché par l'annulation passe avant, et laisserait
   *  le panneau d'options ouvert sur une figure qui n'est plus choisie.
   *  Juste après « Supprimer la page », c'est la page jetée qui revient : on
   *  y va, un message le dit, et la réponse est 'page' (le message est déjà
   *  dit). Juste après « Dupliquer la page », sur la copie où l'on n'a rien
   *  fait, c'est la copie qui part : on revient sur l'original, « Copie
   *  retirée », et la réponse est aussi 'page'. Un envoi défait (« Envoyer
   *  vers… », voir Tableau.envoyer) : sur la page de départ, les objets y
   *  reviennent sous les yeux, et le message dit ceux qui ont quitté la page
   *  d'arrivée et ceux qui, modifiés là-bas, y restent ; sur la page
   *  d'arrivée d'une copie, les copies partent (« Copie annulée ») ; la
   *  réponse est 'dit' (le message est dit). Un déplacement dont des objets
   *  ont depuis quitté la page d'arrivée (renvoyés ailleurs, effacés) ne se
   *  défait pas encore : rien ne change (la sélection reste), le message dit
   *  d'y défaire cela d'abord, avec « Aller à la page N », et la réponse est
   *  'dit'. Sinon, vrai si un geste a été défait. Une transformation défaite
   *  (la taille, la rotation, un quart de tour, « Remettre droit ») laisse
   *  pris ce qui l'était, à l'outil Sélection (voir reprendreTransformes). */
  annuler(this: App): 'page' | 'dit' | boolean {
    if (this.enLecture) return false
    this.viderPointEnAttente()
    if (this.enSeancePassee) { this.direLecture(); return 'dit' }
    // Les numéros d'avant : la nouvelle page d'un envoi défait peut partir
    const numeros = new Map(this.pages.map((p, i) => [p, i + 1]))
    const etape = this.tableau.prochaineAnnulation(this.page)
    const prises = etape ? this.prisesDesTransformations.get(etape) : undefined
    const r = this.tableau.annuler(this.page)
    if (r?.envoiBloque) {
      const { vers, n, total } = r.envoiBloque
      const k = this.pages.indexOf(vers) + 1
      this.ui.message(texteEnvoiBloque(n, total, k), k ? { libelle: `Aller à la page ${k}`, faire: () => { if (!tableauCache(this) && this.pages.includes(vers)) this.allerPage(vers) } } : undefined)
      return 'dit'
    }
    if (r?.page) {
      this.revenirSur(r.page, this.pages.indexOf(r.page))
      return 'page'
    }
    // La page reprise toute neuve s'en va (lot 6) : on revient dans la séance du jour
    if (r?.reprise && r.retour) {
      this.repriseRetiree(r.reprise, r.retour)
      return 'page'
    }
    // La copie toute neuve qu'on regardait s'en va : on revient sur son original
    if (r?.copie && r.retour) {
      this.copieRetiree(r.copie, r.retour)
      return 'page'
    }
    this.selection.clear()
    if (prises && r && !r.envoi && !r.copieRecue) this.reprendreTransformes(prises, this.tableau.prochainRetablissement(this.page))
    this.rendu.redessinerDirect(); this.ui?.maj()
    if (r?.envoi) {
      this.ui.oublierAction('envoi:' + r.envoi.vers)
      this.ui.message(texteEnvoiAnnule(r.envoi, numeros.get(r.envoi.vers) ?? 0, this.pages.includes(r.envoi.vers)))
      return 'dit'
    }
    if (r?.copieRecue) {
      this.ui.oublierAction('envoi:' + this.page)
      this.ui.message('Copie annulée')
      return 'dit'
    }
    return r !== null
  },

  /** Refait le dernier geste défait sur la page qu'on regarde. Comme annuler :
   *  la sélection se vide (ce qui revient peut recouvrir ce qui était choisi)
   *  et l'interface se remet à jour. Vrai si un geste a été refait ; 'dit'
   *  pour un envoi refait (les objets repartent sur la page d'arrivée, et le
   *  message le dit), ou pour un envoi qui ne se refait pas (sa page
   *  d'arrivée est supprimée définitivement : rien ne change, le message le
   *  dit). Une transformation refaite laisse pris ce qui l'était, comme
   *  annuler. */
  retablir(this: App): 'dit' | boolean {
    if (this.enLecture) return false
    this.viderPointEnAttente()
    if (this.enSeancePassee) { this.direLecture(); return 'dit' }
    const etape = this.tableau.prochainRetablissement(this.page)
    const prises = etape ? this.prisesDesTransformations.get(etape) : undefined
    const fait = this.tableau.retablir(this.page)
    if (typeof fait === 'object' && 'envoiImpossible' in fait) {
      this.ui.message(TEXTE_ENVOI_IMPOSSIBLE)
      return 'dit'
    }
    this.selection.clear()
    if (prises && fait === true) this.reprendreTransformes(prises, this.tableau.prochaineAnnulation(this.page))
    this.rendu.redessinerDirect(); this.ui?.maj()
    if (typeof fait === 'object') {
      const e = fait.envoi, k = this.pages.indexOf(e.vers) + 1
      this.ui.oublierAction('envoi:' + e.vers)
      const ou = k ? `${e.pageRemise ? 'la nouvelle page' : 'la page'} ${k}` : 'une page supprimée'
      this.ui.message(e.repartis === 1 ? `Envoi refait : l'objet est reparti sur ${ou}` : `Envoi refait : les ${e.repartis} objets sont repartis sur ${ou}`)
      return 'dit'
    }
    return fait
  },

  /** La transformation qu'on vient d'écrire retient ce qui est pris : Ctrl+Z
   *  ou Ctrl+Y de son étape le reprend */
  noterTransformation(this: App): void {
    const e = this.tableau.prochaineAnnulation(this.page)
    if (e && this.selection.size) this.prisesDesTransformations.set(e, [...this.selection])
  },

  /** Après Ctrl+Z ou Ctrl+Y d'une transformation (retouches après le lot 5) :
   *  à l'outil Sélection, ce qui était pris l'est de nouveau, ce qui en est
   *  encore sur la page et libre. Avant, la sélection se vidait comme après
   *  tout geste défait : le cadre, la pastille et la barre d'actions
   *  partaient, et le même coin tiré de nouveau pour agrandir un peu moins
   *  emportait l'image. Sous un autre outil, rien n'est repris (son appui
   *  suivant lâcherait l'objet). L'étape que Yjs a poussée en face (etape :
   *  à refaire, ou de nouveau à défaire) le retient à son tour. */
  reprendreTransformes(this: App, prises: string[], etape: EtapeDePile | null): void {
    if (etape) this.prisesDesTransformations.set(etape, prises)
    if (this.outil !== 'selection') return
    const ici = new Set(this.formes.filter(libre).map(f => f.id))
    for (const id of prises) if (ici.has(id)) this.selection.add(id)
  },

  /** ↶ a-t-il quelque chose à faire sur cette page ? Le point qui attend un
   *  double-clic compte : Ctrl+Z le pose, puis le retire. */
  peutAnnuler(this: App): boolean {
    return this.pointEnAttente?.page === this.page || this.tableau.peutAnnuler(this.page)
  },

  /** ↷ ? Pas pendant qu'un point attend : posé, il oublie ce qui était à refaire. */
  peutRetablir(this: App): boolean {
    return this.pointEnAttente?.page !== this.page && this.tableau.peutRetablir(this.page)
  },

  /** Suppr : ce qui est sélectionné et libre part (un objet verrouillé, dont
   *  le menu est ouvert, reste, et le message le dit) */
  supprimerSelection(this: App): void {
    if (this.partie) return this.supprimerPartie()
    if (!this.selection.size) return
    const ids = this.formes.filter(f => this.selection.has(f.id) && libre(f)).map(f => f.id)
    if (!ids.length) { this.ui.message('Verrouillé : déverrouillez-le d\'abord.'); return }
    this.tableau.nouveauGeste()
    this.tableau.supprimer(this.page, ids)
    this.selection.clear()
  },

  /** Le centre de ce qu'on voit entre les barres (écran) */
  centreLibre(this: App): { x: number; y: number; } {
    const r = this.ui?.zoneLibre() ?? { x: 0, y: 0, l: this.rendu.l, h: this.rendu.h }
    return { x: r.x + r.l / 2, y: r.y + r.h / 2 }
  },

  arreterAnimation(this: App): void {
    if (this.animation) cancelAnimationFrame(this.animation)
    this.animation = 0; this.cible = null
  },

  /** Amène la caméra en c, en douceur : le zoom change géométriquement, et le
   *  point du monde au centre de la zone libre va en ligne droite de son départ
   *  à son arrivée. Un pointeur posé sur le tableau, la molette, le clavier ou
   *  un changement de page l'arrêtent. */
  allerVers(this: App, c: { x: number; y: number; z: number }, duree = 250): void {
    this.arreterAnimation()
    const cam = this.cam
    const calme = typeof matchMedia === 'function' && matchMedia('(prefers-reduced-motion: reduce)').matches
    if (duree <= 0 || calme || (cam.x === c.x && cam.y === c.y && cam.z === c.z)) {
      cam.x = c.x; cam.y = c.y; cam.z = c.z
      this.vueChangee(); return
    }
    const s = this.centreLibre(), z0 = cam.z, z1 = c.z
    const a = cam.versMonde(s.x, s.y), b = { x: (s.x - c.x) / z1, y: (s.y - c.y) / z1 }
    const debut = performance.now()
    this.cible = { ...c }
    const pas = () => {
      const u = Math.max(0, Math.min(1, (performance.now() - debut) / duree))
      if (u >= 1) {
        this.animation = 0; this.cible = null
        cam.x = c.x; cam.y = c.y; cam.z = c.z
      } else {
        const k = 1 - (1 - u) ** 3
        const z = z0 * (z1 / z0) ** k
        cam.z = z
        cam.x = s.x - (a.x + (b.x - a.x) * k) * z
        cam.y = s.y - (a.y + (b.y - a.y) * k) * z
        this.animation = requestAnimationFrame(pas)
      }
      this.vueChangee()
    }
    this.animation = requestAnimationFrame(pas)
  },

  /** La vue qu'on a : le point du monde au centre de l'écran, et le zoom */
  vueActuelle(this: App): Vue {
    const c = this.cam.versMonde(this.rendu.l / 2, this.rendu.h / 2)
    return { cx: c.x, cy: c.y, z: this.cam.z }
  },

  /** La vue de la page qu'on ouvre (voir allerPage), toujours à 100 % :
   *  une page déjà regardée reprend le centre qu'elle avait à l'écran (gardé
   *  en mémoire et dans la session de ce navigateur, avec un zoom qui ne sert
   *  plus) ; une page jamais regardée, le début de son contenu (vueAuDebut :
   *  centré s'il tient entre les barres, sinon son coin en haut à gauche,
   *  avec une marge) ; une page vide, la vue neutre. C'est vrai à
   *  l'ouverture d'un classeur (la page de la session), à chaque changement
   *  de page, et pour une copie (« Dupliquer la page », la trieuse, une
   *  nouvelle page de « Envoyer vers… ») : le centre de son original. */
  appliquerVue(this: App, id: string): void {
    const cam = this.cam, l = this.rendu.l, h = this.rendu.h
    const v = this.vues.get(id)
    let c = VUE_NEUTRE
    if (l > 0 && h > 0) {
      if (v) c = { x: l / 2 - v.cx, y: h / 2 - v.cy, z: 1 }
      else {
        // this.formes n'est relue qu'à rafraichir : on lit celles de la page
        const formes = this.tableau.formesDe(id)
        const b = formes?.size ? this.boiteDuContenu(formes.values()) : null
        if (b) c = vueAuDebut(b, this.ui?.zoneLibre() ?? { x: 0, y: 0, l, h })
      }
    }
    cam.x = c.x; cam.y = c.y; cam.z = c.z
  },

  /** La boîte d'une forme, comme la veulent les fonctions de geometrie.ts :
   *  pour une formule, sa boîte LOCALE, mesurée à l'écran (son rendu KaTeX ;
   *  pas de cache) et non tournée (lot 5 : elles en déduisent elles-mêmes ses
   *  coins tournés) ; pour une droite, celle de ses deux points */
  boiteDeForme(this: App, f: Forme): Boite | null {
    if (f.type === 'formule') return this.rendu.boiteFormule(f)
    let b = this.boites.get(f)
    if (b === undefined) { b = boiteDe(f); this.boites.set(f, b) }
    return b
  },

  /** La boîte droite de ce qu'on voit d'une forme (une formule tournée : celle
   *  de ses coins tournés), pour écarter vite et pour cadrer */
  boiteVue(this: App, f: Forme): Boite | null {
    const b = this.boiteDeForme(f)
    return b && englobante(f, b)
  },

  /** Tout ce qui est sur la page, jamais au-delà de 100 % : un petit contenu
   *  reste à 100 % et se centre */
  toutVoir(this: App): void {
    const b = this.boiteDuContenu()
    if (!b) { this.allerVers(VUE_NEUTRE); this.ui.message('La page est vide.'); return }
    this.allerVers(vuePour(b, this.ui.zoneLibre(), 1))
  },

  /** La sélection (ou la figure du morceau choisi), à 200 % au plus */
  voirSelection(this: App): void {
    const ids = this.selection.size ? this.selection : this.partie ? new Set([this.partie.id]) : null
    const b = ids ? this.boiteDuContenu(this.formes.filter(f => ids.has(f.id))) : null
    if (!b) { this.ui.message('Rien n\'est sélectionné.'); return }
    this.allerVers(vuePour(b, this.ui.zoneLibre(), 2))
  },

  /** Prend un objet de la page (la recherche : une formule trouvée) et le
   *  montre, au zoom où l'on est : la vue ne bouge que s'il n'est pas déjà
   *  entier à l'écran (il vient alors au centre). Faux : il n'est pas là. */
  montrerForme(this: App, id: string): boolean {
    const f = this.formes.find(x => x.id === id)
    const b = f ? this.boiteDuContenu([f]) : null
    if (!f || !b) return false
    this.selection.clear()
    this.selection.add(id)
    this.rafraichir()
    const r = this.ui.zoneLibre(), z = this.cam.z
    const g = b.x * z + this.cam.x, h = b.y * z + this.cam.y
    if (g < r.x || h < r.y || g + b.l * z > r.x + r.l || h + b.h * z > r.y + r.h)
      this.allerVers({ x: r.x + r.l / 2 - (b.x + b.l / 2) * z, y: r.y + r.h / 2 - (b.y + b.h / 2) * z, z })
    return true
  },

  /** Les boutons − et + : autour du centre de l'écran, tout de suite */
  zoomer(this: App, facteur: number): void {
    this.arreterAnimation()
    this.cam.zoomerAutour(this.rendu.l / 2, this.rendu.h / 2, facteur)
    this.vueChangee()
  },

  /** 100 %, en gardant le point au centre de ce qu'on voit */
  zoom100(this: App): void {
    const s = this.centreLibre(), w = this.cam.versMonde(s.x, s.y)
    this.allerVers({ x: s.x - w.x, y: s.y - w.y, z: 1 })
  },

  /** Ctrl + « + » ou « − » : autour du pointeur s'il est sur le tableau */
  zoomerClavier(this: App, facteur: number): void {
    this.arreterAnimation()
    const s = this.pointeurSurZone ? this.ecran(this.pointeurSurZone) : this.centreLibre()
    this.cam.zoomerAutour(s.x, s.y, facteur)
    this.vueChangee()
  },

  /** Zoome autour d'un point de la fenêtre (le pincement de Safari) */
  zoomerAutourClient(this: App, clientX: number, clientY: number, facteur: number): void {
    this.arreterAnimation()
    const s = this.ecran({ clientX, clientY })
    this.cam.zoomerAutour(s.x, s.y, facteur)
    this.vueChangee()
  },

  /** La page a des formes, et aucune n'est à l'écran : on s'est perdu */
  contenuHorsVue(this: App): boolean {
    if (!this.formes.length || this.rendu.l <= 0) return false
    const v = this.cam.visible(this.rendu.l, this.rendu.h)
    for (const f of this.formes) {
      if (f.type === 'polygone' && f.prolonge) { if (this.rendu.etendueVisible(f)) return false; continue }
      const b = this.boiteVue(f)
      if (b && chevauche(v, b)) return false
    }
    return true
  },

  /** Note la page et sa vue dans la session de ce navigateur (jamais dans le document) */
  noterSession(this: App): void {
    clearTimeout(this.minuterieSession); this.minuterieSession = 0
    if (!this.page || this.sessionArretee) return
    if (this.rendu.l > 0) this.vues.set(this.page, this.vueActuelle())
    ecrireSession(this.page, this.vues, this.tableau.ordre.toArray(), this.cleSession)
  },

  /** Un autre tableau s'ouvre (un fichier) : les vues gardées ne sont plus les
   *  siennes. Celles qu'on tient en mémoire partent aussi, sinon la prochaine
   *  écriture les remettrait dans la session. */
  oublierVues(this: App): void {
    clearTimeout(this.minuterieSession); this.minuterieSession = 0
    this.vues.clear(); this.pageSession = null
    oublierSession(this.cleSession)
  },

  /** Avant d'enregistrer le classeur dans un fichier : le point d'un simple
   *  toucher, qui attendait un éventuel double-clic, est posé tout de suite */
  poserCeQuiAttend(this: App): void { this.viderPointEnAttente() },

  /** Plus rien ne s'écrit dans la session jusqu'au rechargement : un autre
   *  onglet vient d'ouvrir un autre tableau, ou celui-ci va le faire (en
   *  quittant la page, on y remettrait la page et la vue de l'ancien) */
  arreterSession(this: App): void {
    clearTimeout(this.minuterieSession); this.minuterieSession = 0
    this.sessionArretee = true
  },

  vueChangee(this: App): void {
    this.rendu.toutRedessiner()
    this.ui?.maj()
    // La vue se note un peu après le dernier mouvement, pas à chaque image
    clearTimeout(this.minuterieSession)
    this.minuterieSession = window.setTimeout(() => this.noterSession(), 400)
  },
}
