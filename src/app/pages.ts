// =============================================================
// L'APP : LES PAGES, LES SÉANCES, LA LECTURE DU DOCUMENT
// Des méthodes de la classe App (src/app.ts), rangées ici par sujet :
// elles s'ajoutent à la classe à la fin de app.ts (ajouterMethodes).
// =============================================================
import type { App } from '../app'
import { tableauCache } from '../navigateur'
import { ordreDAffichage } from '../ordre'
import { UNE_HEURE, deLaSeance } from '../seances'
import type { SeanceDuClasseur } from '../seances'
import { CM, FOND_NEUF, libre } from '../types'
import type { Fond } from '../types'

export const methodesPages = {
  // ---------- Pages ----------
  /** On arrive sur une page TOUJOURS à 100 % (le choix du professeur, après
   *  le lot 5), à l'endroit où l'on était dans cette page : chaque page garde
   *  le centre de sa vue, pas son zoom. Une page qu'on n'a pas encore
   *  regardée s'ouvre sur une vue neutre si elle est vide (une page neuve),
   *  sur le début de son contenu sinon (un tableau d'avant, un fichier
   *  ouvert : voir appliquerVue). */
  allerPage(this: App, id: string): void {
    this.viderPointEnAttente()
    if (!id || id === this.page) return
    this.finirTexte()
    this.arreterAnimation()
    const avant = this.page
    if (this.page && this.rendu.l > 0) this.vues.set(this.page, this.vueActuelle())
    this.page = id
    this.tableau.pageVue = id
    if (!this.enSeancePassee) this.pageDuJour = id
    this.appliquerVue(id)
    // Rien ne reste choisi d'une page à l'autre : ni la sélection, ni un
    // morceau de figure (Suppr, au retour, l'ôterait sans qu'on le voie choisi)
    this.selection.clear()
    this.finirAjout()
    this.ui?.fermerMenuPartie()
    if (this.partie) this.choisirPartie(null)
    this.cacherCadenas()
    this.rafraichir()
    this.noterSession()
    // Le numéro de la page en grand, un instant : seulement quand on regardait
    // déjà une page et que le tableau est prêt (pas au démarrage, ni quand le
    // chargement mène à la première page, puis à celle qu'on regardait avant
    // de recharger), et jamais sous la revue, une séance ou la trieuse, qui
    // cachent le tableau
    if (avant && this.pret && !tableauCache(this)) this.ui?.annoncerPage()
  },

  /** Au démarrage (main.ts), le tableau chargé : la page qu'on regardait
   *  avant de recharger (voir pageDeDepart), sans annoncer son numéro */
  allerPageDeDepart(this: App): void {
    this.allerPage(this.pageDeDepart())
    this.pret = true
    // Les séances viennent peut-être d'être rangées (voir pageDeDepart) : le compteur les dit
    this.ui?.maj()
  },

  /** La page où reprendre : celle de la session si elle existe encore, sinon la première */
  pageDeDepart(this: App): string {
    // Les vues d'un autre tableau (aucune page commune) ne servent jamais :
    // leurs pages n'existent pas ici, et la prochaine écriture les oublie
    // Les séances (lot 6 ; celles d'un classeur qui n'en a pas encore écrit
    // sont en attente, voir Tableau.seancesActives) : on arrive dans la séance du jour, la plus
    // récente ; sur la page de la session si elle en est, sinon sur sa
    // première page
    const d = this.tableau.derniereSeance()
    const p = d ? d.pages : this.pages
    if (this.pageSession && p.includes(this.pageSession)) return this.pageSession
    return p[0] ?? this.tableau.ordre.get(0)
  },

  /** La page d'avant ou d'après (Page↑, Page↓, ‹ et ›). Faux s'il n'y en a
   *  pas : on ne crée jamais de page ici (voir clavier, et le bouton « › »
   *  de la dernière page, qui appelle nouvellePage). */
  pageSuivante(this: App, sens: 1 | -1): boolean {
    const p = this.pages, i = p.indexOf(this.page) + sens
    if (i < 0 || i >= p.length) return false
    this.allerPage(p[i])
    return true
  },

  /** Page↓ sur la dernière page : une télécommande de présentation (qui
   *  envoie Page↓) ne fabrique pas de pages. Un message dit comment en
   *  ajouter une, au plus une fois toutes les 5 s (une touche tenue, une
   *  télécommande qu'on presse plusieurs fois). */
  dernierePage(this: App): void {
    // Une séance passée, en lecture : on n'y ajoute pas de page
    if (this.enSeancePassee) return
    const t = performance.now()
    if (t - this.astuceDernierePage < 5000) return
    this.astuceDernierePage = t
    this.ui.message('Dernière page : le bouton Page suivante en ajoute une.')
  },

  /** Le bouton Nouvelle page, « › » sur la dernière : une page blanche juste
   *  après celle-ci (voir FOND_NEUF ; avant, elle prenait le fond de la page
   *  qu'on regardait), qui s'ouvre en vue neutre, à 100 % */
  nouvellePage(this: App): void {
    // Depuis une séance passée (en lecture) : la page neuve est de la séance
    // du jour, juste après celle où l'on y était
    if (this.enSeancePassee) this.retourAujourdhui()
    const ordre = this.tableau.ordre.toArray()
    const id = this.tableau.ajouterPage(FOND_NEUF, this.page ? ordre.indexOf(this.page) + 1 : ordre.length)
    this.allerPage(id)
  },

  /** Efface ce qui est sur la page (Ctrl+Z le rend), sauf ce qui est
   *  verrouillé ou fixé en fond (lot 5) : c'est pour cela qu'on l'a protégé.
   *  Rien de libre : rien n'est écrit. */
  viderPage(this: App): void {
    this.selection.clear(); this.choisirPartie(null)
    const ids = this.formes.filter(libre).map(f => f.id)
    if (!ids.length) return
    this.tableau.nouveauGeste()
    this.tableau.supprimer(this.page, ids)
  },

  /** La poubelle de la barre du haut. Pas de question : la page part tout
   *  de suite, et « Annuler » (dans le message, 7 s) ou Ctrl+Z, juste après,
   *  sur la page où l'on se retrouve, la ramène à sa place, entière (voir
   *  Tableau.jeterPage). On arrive sur la page d'avant (la suivante pour la
   *  première). Une page seule n'est jamais jetée : on l'efface, ce qui
   *  s'annule aussi ; vide, il n'y a rien à faire. */
  supprimerPage(this: App): void {
    this.viderPointEnAttente()
    if (this.enSeancePassee) return this.direLecture()
    const pages = this.pages, id = this.page, i = pages.indexOf(id)
    if (i < 0) return
    if (pages.length <= 1) {
      if (!this.formes.length) return this.ui.message('La page est déjà vide.')
      // Ce qui est verrouillé ou fixé en fond reste (lot 5), et le message le dit
      if (!this.formes.some(libre)) return this.ui.message('Rien à effacer : ce qui reste est verrouillé ou fixé en fond (menu de la page pour le détacher).')
      const reste = this.formes.some(f => !libre(f))
      this.viderPage()
      // L'effacement fait seul son étape : rien ne s'y ajoute ensuite
      this.tableau.nouveauGeste()
      const pile = this.tableau.annulationDe(id)
      const haut = pile?.undoStack[pile.undoStack.length - 1]
      this.ui.message(reste ? 'Page effacée (ce qui est verrouillé ou fixé en fond reste)' : 'Page effacée', { libelle: 'Annuler', faire: () => {
        // Le bouton ne défait que l'effacement, s'il est encore le dernier
        // geste de la page ; sinon il défairait autre chose, qu'on ne voit pas.
        // Jamais pendant la revue, qui n'écrit pas dans le tableau.
        if (this.enLecture) return
        this.viderPointEnAttente()
        const p = this.tableau.annulationDe(id)
        if (!haut || !p || p.undoStack[p.undoStack.length - 1] !== haut) return this.ui.message('La page a changé depuis : ↶ défait les gestes un à un.')
        this.allerPage(id)
        this.annuler()
      } })
      return
    }
    const voisine = pages[i > 0 ? i - 1 : 1]
    this.allerPage(voisine)
    if (!this.tableau.jeterPage(id, voisine)) return
    this.ui.message(`Page ${i + 1} supprimée`, { libelle: 'Annuler', faire: () => this.rendrePage(id), cle: 'page:' + id })
  },

  /** Rend une page jetée (le bouton « Annuler » de son message) : elle
   *  revient à sa place, avec tout ce qu'elle avait, et on la regarde. Rien
   *  si elle est déjà revenue (un Ctrl+Z l'a rendue), ni pendant la revue. Sa
   *  vue l'attend : on l'a gardée en la quittant. */
  rendrePage(this: App, id: string): boolean {
    if (this.enLecture) return false
    this.viderPointEnAttente()
    const k = this.tableau.rendrePage(id)
    if (k < 0) return false
    this.revenirSur(id, k)
    return true
  },

  /** On regarde la page qui vient de revenir, et un message le dit */
  revenirSur(this: App, id: string, k: number): void {
    this.allerPage(id)
    this.ui.oublierAction('page:' + id)
    this.ui.message(`Page ${k + 1} rétablie`)
  },

  /** « Dupliquer la page » (le menu de la page, Ctrl + Maj + D) : une copie
   *  juste après, avec toute son histoire (voir Tableau.dupliquerPage), au
   *  même fond (c'est une copie), et l'on arrive dessus, au même centre, à
   *  100 % (voir appliquerVue). Un message le dit, avec
   *  « Annuler » ; Ctrl+Z sur la copie, tant qu'on n'y a rien fait, la retire
   *  aussi et ramène à l'original (la marque posée sur la copie). Rien quand
   *  le tableau est caché (la revue, une séance, la trieuse). */
  dupliquerLaPage(this: App): void {
    if (tableauCache(this)) return
    this.viderPointEnAttente()
    // Une page d'une séance passée : la copie va dans la séance du jour (la reprendre)
    if (this.enSeancePassee) { this.reprendrePage(this.page); return }
    const p = this.page, k = this.pages.indexOf(p)
    if (k < 0) return
    const q = this.tableau.dupliquerPage(p, { marque: true })
    if (!q) return
    this.copierVue(p, q)
    this.allerPage(q)
    this.ui.message(`Page ${k + 1} dupliquée : vous êtes sur la copie (page ${this.pages.indexOf(q) + 1})`,
      { libelle: 'Annuler', faire: () => this.annulerCopie(q), cle: 'copie:' + q })
  },

  /** Le bouton « Annuler » du message de « Dupliquer la page ». La copie
   *  part seulement si elle est encore telle qu'à sa naissance et que sa
   *  marque vaut (elle et son original sont dans l'ordre) : on y va s'il le
   *  faut, puis on la retire, comme Ctrl+Z. Sinon un message dit pourquoi,
   *  et rien ne change : défaire d'abord ce qu'on y a écrit, ou la supprimer
   *  à la poubelle (son original n'est plus là, ou elle a changé autrement).
   *  Jamais pendant la revue, ni sous la trieuse. */
  annulerCopie(this: App, q: string): void {
    if (tableauCache(this)) return
    this.viderPointEnAttente()
    if (!this.pages.includes(q)) return
    const r = this.tableau.retraitDeCopie(q)
    if (r === 'ecrit') return this.ui.message('Vous avez écrit sur la copie : ↶ défait d\'abord ce que vous y avez écrit.')
    if (r === 'non') return this.ui.message('La copie ne peut plus être retirée ainsi : supprimez-la (poubelle).')
    if (this.page !== q) this.allerPage(q)
    const retour = this.tableau.retirerCopie(q)
    if (retour) this.copieRetiree(q, retour)
  },

  /** La copie toute neuve vient de partir : on revient sur son original (si
   *  l'on n'y est pas déjà, voir verifierPage), et un message le dit */
  copieRetiree(this: App, copie: string, retour: string): void {
    this.allerPage(retour)
    this.ui.oublierAction('copie:' + copie)
    this.ui.message('Copie retirée')
  },

  /** La garde du tableau (voir Tableau.garde) : on n'écrit que dans la
   *  séance du jour. Une écriture sur une page d'une séance passée ne se fait
   *  pas ; elle attend (retenues), et la fenêtre « Cette page est dans la
   *  séance de lundi… » s'ouvre une fois le geste fini. Un tableau sans
   *  séances écrit partout. */
  gardeSeance(this: App, page: string, refaire: (page: string) => void): boolean {
    // Le premier changement écrit les séances en attente, telles qu'on les voit
    this.tableau.ecrireLesSeances()
    const d = this.tableau.derniereSeance()
    if (!d) return true
    const s = this.tableau.seanceDe(page)
    if (!s || s.id === d.id) return true
    if (this.retenues && this.retenues.page === page) { this.retenues.refaire.push(refaire); return false }
    this.retenues = { page, refaire: [refaire] }
    const demander = () => {
      if (this.geste && this.geste.type !== 'retenu') { window.setTimeout(demander, 120); return }
      if (!this.retenues || this.retenues.page !== page) return
      if (this.ui?.ecritureSurSeancePassee) this.ui.ecritureSurSeancePassee(page)
      else this.retenues = null
    }
    queueMicrotask(demander)
    return false
  },

  /** La réponse à la fenêtre « Cette page est dans la séance de lundi… » :
   *  « Juste regarder » oublie ce qu'on voulait écrire ; « Reprendre et
   *  écrire » reprend la page dans la séance du jour, y refait ce qui a été
   *  refusé, et l'on arrive dessus */
  repondreSeancePassee(this: App, reprendre: boolean): void {
    const r = this.retenues
    this.retenues = null
    this.rafraichir()
    if (!reprendre || !r) return
    const q = this.reprendrePage(r.page)
    if (!q) return
    this.tableau.nouveauGeste()
    for (const f of r.refaire) f(q)
    this.tableau.nouveauGeste()
  },

  /** Le message d'une action qui ne se fait pas sur une séance passée */
  direLecture(this: App): void {
    const s = this.seanceVue
    this.ui.message(`Séance ${s ? deLaSeance(s, Date.now()) : 'passée'} : vous la regardez sans la modifier.`,
      [{ libelle: 'Reprendre la page', faire: () => this.reprendrePage(this.page) }, { libelle: 'Retour à aujourd\'hui', faire: () => this.retourAujourdhui() }])
  },

  /** Au démarrage (main.ts), le classeur chargé et la page de départ prise :
   *  que faire de la séance. Un classeur où rien n'est écrit (un classeur
   *  neuf) : sa séance commence, sans question ('rien'). Une séance du jour
   *  active depuis moins d'une heure : on y reste ('reprise' : un message le
   *  dit). Plus d'une heure : la fenêtre d'accueil ('accueil'). nouvelle :
   *  on arrive pour une nouvelle séance (un autre niveau, un autre chapitre,
   *  depuis la fenêtre d'accueil d'un autre classeur) : elle commence. */
  seanceAuDemarrage(this: App, o: { nouvelle?: boolean; maintenant?: number } = {}): { genre: 'rien' | 'reprise' | 'accueil'; seance?: SeanceDuClasseur } {
    const t = this.tableau, d = t.derniereSeance()
    if (!d) return { genre: 'rien' }
    const maintenant = o.maintenant ?? Date.now()
    if (t.seancesDuClasseur().every(s => t.seanceVierge(s.id))) {
      if (maintenant - t.derniereActivite(d.id) > UNE_HEURE) t.recommencerSeance(d.id, maintenant)
      return { genre: 'rien' }
    }
    if (o.nouvelle) { this.nouvelleSeance(); return { genre: 'rien' } }
    if (maintenant - t.derniereActivite(d.id) <= UNE_HEURE) return { genre: 'reprise', seance: d }
    return { genre: 'accueil', seance: d }
  },

  /** Une nouvelle séance (la fenêtre d'accueil, le menu ⋯) : sa page 1,
   *  blanche, à 100 %. La séance du jour qui n'a encore rien (ni écrit ni
   *  nom sur ses pages) ne se double pas : elle recommence maintenant (on
   *  ouvre MEM, on ne fait pas cours, on revient le lendemain). Hors
   *  annulation (voir Tableau.nouvelleSeance). Le bandeau « Reprendre »
   *  propose la dernière page de la séance d'avant. */
  nouvelleSeance(this: App): void {
    if (this.enLecture) return
    this.viderPointEnAttente()
    const d = this.tableau.derniereSeance()
    let page: string
    if (d && d.pages.length && this.tableau.seanceVierge(d.id)) {
      this.tableau.recommencerSeance(d.id)
      page = d.pages[0]
    } else page = this.tableau.nouvelleSeance().page
    const l = this.tableau.seancesDuClasseur()
    const precedente = [...l].reverse().find(s => s.id !== this.tableau.derniereSeance()?.id && s.pages.length) ?? null
    this.vues.delete(page)
    this.allerPage(page)
    this.ui?.seanceCommencee?.(precedente)
    this.ui?.maj()
  },

  /** Reprendre une page d'une séance passée dans la séance du jour (lot 6,
   *  voir Tableau.reprendrePage) : une copie qui hérite son passé, sous le
   *  même nom ; si la page 1 du jour est encore vide, la copie la remplace,
   *  sinon elle vient juste après la page du jour où l'on était. On arrive
   *  dessus, au centre de l'original, à 100 %. Le message le dit, avec
   *  « Annuler » ; Ctrl+Z sur la copie toute neuve la retire aussi. Rend la
   *  copie (null : rien). */
  reprendrePage(this: App, source: string): string | null {
    if (this.enLecture) return null
    this.viderPointEnAttente()
    const d = this.tableau.derniereSeance(), s = this.tableau.seanceDe(source)
    if (!d || !s || s.id === d.id) return null
    const jour = d.pages
    const apres = jour.includes(this.page) ? this.page : jour.includes(this.pageDuJour) ? this.pageDuJour : jour[jour.length - 1] ?? null
    const q = this.tableau.reprendrePage(source, { seance: d.id, apres, remplace: jour[0] ?? null })
    if (!q) return null
    this.copierVue(source, q)
    this.allerPage(q)
    this.ui.message(`Page reprise ${deLaSeance(s, Date.now())}`, { libelle: 'Annuler', faire: () => this.annulerReprise(q), cle: 'reprise:' + q })
    return q
  },

  /** « Annuler » du message « Page reprise de lundi » : comme Ctrl+Z sur la
   *  copie toute neuve (voir Tableau.retirerReprise) ; sinon un message dit
   *  pourquoi */
  annulerReprise(this: App, q: string): void {
    if (tableauCache(this)) return
    this.viderPointEnAttente()
    if (!this.tableau.ordre.toArray().includes(q)) return
    const r = this.tableau.retraitDeCopie(q)
    if (r === 'ecrit') return this.ui.message('Vous avez écrit sur la page reprise : ↶ défait d\'abord ce que vous y avez écrit.')
    if (r === 'non') return this.ui.message('La page reprise ne peut plus être retirée ainsi : supprimez-la (poubelle).')
    const retour = this.tableau.retirerReprise(q)
    if (retour) this.repriseRetiree(q, retour)
  },

  repriseRetiree(this: App, q: string, retour: string): void {
    this.allerPage(retour)
    this.ui.oublierAction('reprise:' + q)
    this.ui.message('Reprise annulée')
  },

  /** Regarder une page d'une séance passée (lot 6) : en lecture */
  voirPage(this: App, id: string): void {
    if (this.enLecture || !this.tableau.ordre.toArray().includes(id)) return
    this.allerPage(id)
  },

  /** « Retour à aujourd'hui » : la page de la séance du jour où l'on était */
  retourAujourdhui(this: App): void {
    const j = this.pagesDuJour
    const id = j.includes(this.pageDuJour) ? this.pageDuJour : j[j.length - 1]
    if (!id || id === this.page) return
    this.allerPage(id)
  },

  /** La vue gardée d'une page devient celle d'une autre, en mémoire et dans
   *  la session de ce navigateur : une copie s'ouvre sur le centre de son
   *  original, à 100 % comme toute page (« Dupliquer la page », la trieuse,
   *  la nouvelle page de « Envoyer vers… »). La vue de la page qu'on regarde
   *  est celle de l'écran. */
  copierVue(this: App, de: string, vers: string): void {
    const v = de === this.page && this.rendu.l > 0 ? this.vueActuelle() : this.vues.get(de)
    if (!v || !vers) return
    this.vues.set(vers, { ...v })
    this.noterSession()
  },

  /** Le repère se pose au milieu de ce qu'on regarde, calé sur le centimètre. */
  changerFond(this: App, f: Fond): void {
    let origine: { x: number; y: number } | undefined
    if (f === 'repere') {
      const v = this.cam.visible(this.rendu.l, this.rendu.h)
      origine = { x: Math.round((v.x + v.l / 2) / CM) * CM, y: Math.round((v.y + v.h / 2) / CM) * CM }
    }
    this.tableau.changerFond(this.page, f, origine)
  },

  /** L'ordre des pages a changé : si la page qu'on regardait l'a quitté, on
   *  va sur la première, ou, pour une copie retirée (Ctrl+Z juste après
   *  « Dupliquer la page »), sur son original */
  verifierPage(this: App): void {
    const p = this.pages
    if (!p.includes(this.page) && p.length) {
      const de = this.page ? this.tableau.herite(this.page) : null
      this.allerPage(de && p.includes(de) ? de : p[0])
    } else if (!p.length && this.tableau.ordre.length) {
      // La séance de la page qu'on regardait n'a plus de page : la séance du jour
      const j = this.pagesDuJour
      this.allerPage(j.includes(this.pageDuJour) ? this.pageDuJour : j[0] ?? this.tableau.ordre.get(0))
    }
    this.ui?.maj()
  },

  // ---------- Lecture du document ----------
  rafraichir(this: App): void {
    if (this.enLecture) return
    const formes = this.tableau.formesDe(this.page)
    // Dans l'ordre où on les voit (voir ordre.ts) : les images fixées, les
    // images, les tracés et les figures, les formules, chacun par z. L'indice
    // dans this.formes est la hauteur VUE : la prise, le survol et le clic
    // droit prennent ce qu'on voit (une image importée après un trait est
    // peinte dessous, et ne le cache plus)
    this.formes = formes ? ordreDAffichage(Array.from(formes.values())) : []
    const ids = new Set(this.formes.map(f => f.id))
    for (const id of this.selection) if (!ids.has(id)) this.selection.delete(id)
    // Ce qui ne se prend pas (lot 5) : compté une fois, la prise s'en sert
    // pour ne rien filtrer sur une page qui n'en a pas
    let non = 0, verrous = 0
    for (const f of this.formes) if (!libre(f)) { non++; if (!f.fixe) verrous++ }
    this.nonLibres = non; this.verrouilles = verrous
    if (this.rendu.cadenas && !ids.has(this.rendu.cadenas.id)) this.poserCadenas(null)
    this.rendu.formes = this.formes
    this.rendu.fond = this.fond
    this.rendu.nuit = this.nuit
    // Les barres s'assombrissent avec la page (le choix du professeur : rien
    // d'éblouissant autour d'une page noire, au vidéoprojecteur)
    document.body.classList.toggle('page-nuit', this.rendu.nuit)
    this.rendu.origine = this.tableau.origineDe(this.page)
    this.rendu.selection = this.selection
    // Une coupe de la gomme qui s'écrit en plein coup (lot 5) : la scène la
    // montre déjà telle quelle (les morceaux peints sous la gomme sont ceux
    // qui s'écrivent, à leur identifiant près) ; la repeindre entière à
    // chaque trait quitté ferait sauter la plume sur une page chargée. Le
    // lever repeint tout (voir finirGomme).
    if (this.coupeEcrite) this.rendu.redessinerDirect()
    else this.rendu.toutRedessiner()
    this.ui?.maj()
  },
}
