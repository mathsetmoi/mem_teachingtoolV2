// =============================================================
// REVOIR LA CONSTRUCTION, EN CLASSE
// Au vidéoprojecteur, le professeur remonte le fil du tableau : comment
// une notion s'est construite, vite ou pas à pas, sur une page, une
// séance entière ou toute l'histoire d'une page.
//
// La revue est un calque posé par-dessus le tableau, avec sa propre
// caméra et son propre rendu, créés une fois pour toutes. Elle lit le
// film à travers une LectureSeule et ne garde la main que sur ce calque :
// le tableau, sa caméra, sa page, sa sélection et ses instruments ne sont
// jamais touchés, il n'y a donc rien à remettre en place en la fermant.
// Pendant qu'elle est ouverte, le calque arrête crayon et doigt, et le
// clavier lui revient tout entier (les raccourcis du navigateur passent).
//
// Elle s'ouvre en pause sur l'image finale de la portion (l'« affiche ») :
// à l'écran, rien ne bouge. Espace lit depuis le début, → avance d'un pas
// (une idée : des gestes rapprochés), ← remonte. Un cadre jaune et
// l'étiquette REVOIR disent à la classe qu'elle ne regarde pas le direct.
// =============================================================
import katex from 'katex'
import type { App } from '../app'
import { Camera } from '../camera'
import { Rendu } from '../rendu'
import type { Etape } from '../document'
import type { Forme } from '../types'
import { boiteDe } from '../revoir/bobine'
import type { Boite } from '../revoir/bobine'
import { DECOUPAGES, seancesDuFilm } from '../revoir/exporter'
import type { Seance } from '../revoir/exporter'
import { dureeDuTrace, esquisse, seDessine } from '../revoir/esquisse'
import { svg } from '../revoir/icones'
import type { NomIcone } from '../revoir/icones'
import { ALLURES } from '../revoir/rythme'
import type { Bande, Portion } from './bande'
import {
  bandeParDefaut, compterGestes, construireBande, dureeLisible, echeances, entreePrecedente, entreeSuivante, heureLisible, indiceAuTemps,
  jourCourt, jourDuMois, jourLisible, listeDesPages, partieDe, pasPrecedent, pasSuivant, pluriel,
  prochainArret, seancesDeLaPage,
} from './bande'
import { Frise } from './frise'
import type { LectureSeule } from './planches'
import { Planches, lectureDe, memeImage } from './planches'
import { Tiroir } from './tiroir'

const MINUTE = 60_000
/** Au-dessous de ce temps (ms), un tracé ne se verrait pas : la forme paraît d'un coup */
const TRACE_VISIBLE = 40
/** Au démarrage, le premier geste paraît au plus tard après ce temps (ms) */
const DEMARRAGE = 100
/** Au plus tant d'images sautées d'un coup quand on cherche le geste visible suivant */
const SAUTS_MAX = 30
/** Ce que la pastille du haut occupe, et la marge sous la barre (px) */
const HAUT = 70, SOUS_LA_BARRE = 24
/** La barre s'estompe après ce temps sans mouvement, pendant la lecture (ms) */
const REPOS = 3000
/** Le bandeau d'accueil s'en va de lui-même au bout de ce temps (ms) */
const ACCUEIL = 8000
/** Un appui plus court que ceci, sans bouger, lit ou met en pause */
const APPUI_BREF = 300, BOUGE = 10
/** Juste après l'ouverture, un appui sur la scène est la fin d'un double-clic
 *  (ou d'un double appui au tableau) sur « Revoir » : il ne lance rien (ms) */
const APRES_OUVERTURE = 500

/** Les commandes du clavier : chaque touche nomme une action */
type Action = 'basculer' | 'pasSuivant' | 'pasPrecedent' | 'gesteSuivant' | 'gestePrecedent'
  | 'partieSuivante' | 'partiePrecedente' | 'debut' | 'fin' | 'plusLent' | 'plusVite' | 'cadrer' | 'echap'
  | 'allure0' | 'allure1' | 'allure2' | 'allure3'

const TOUCHES: Record<string, Action> = {
  ' ': 'basculer', k: 'basculer', K: 'basculer',
  ArrowRight: 'pasSuivant', PageDown: 'pasSuivant',
  ArrowLeft: 'pasPrecedent', PageUp: 'pasPrecedent',
  'Maj+ArrowRight': 'gesteSuivant', 'Maj+ArrowLeft': 'gestePrecedent',
  ']': 'partieSuivante', '[': 'partiePrecedente',
  Home: 'debut', End: 'fin',
  '-': 'plusLent', '+': 'plusVite', '=': 'plusVite',
  c: 'cadrer', C: 'cadrer',
  Escape: 'echap',
  // Par la place de la touche : sans Maj, l'AZERTY donne &, é, ", '
  Digit1: 'allure0', Digit2: 'allure1', Digit3: 'allure2', Digit4: 'allure3',
  Numpad1: 'allure0', Numpad2: 'allure1', Numpad3: 'allure2', Numpad4: 'allure3',
}

/** La touche telle que la table la connaît. Le pavé numérique ne donne une
 *  allure que s'il donne un chiffre : sans Verr. num., ses touches sont des
 *  flèches, Fin, Origine… et font ce que font ces touches-là. */
function nomDeTouche(e: KeyboardEvent): string {
  if (/^Digit[1-4]$/.test(e.code) || (/^Numpad[1-4]$/.test(e.code) && /^[1-4]$/.test(e.key))) return e.code
  return (e.shiftKey && e.key.startsWith('Arrow') ? 'Maj+' : '') + e.key
}

/** Les actions qu'une touche tenue enfoncée ne répète pas : le clavier les
 *  enverrait trente fois par seconde, et l'on finirait au hasard en lecture
 *  ou en pause. Les pas, eux, s'enchaînent tant qu'on tient la flèche. */
const SANS_REPETITION: ReadonlySet<Action> = new Set<Action>(['basculer', 'echap', 'cadrer', 'debut', 'fin'])

/** « mardi 6 octobre », « aujourd'hui » */
const jour = (t: number) => { const j = jourLisible(t); return j.charAt(0).toLowerCase() + j.slice(1) }

export class RevueEnClasse {
  // ---------- Le calque ----------
  private el: HTMLDivElement
  private scene: HTMLDivElement
  private barre: HTMLDivElement
  private bandeau: HTMLDivElement
  private ligne1: HTMLSpanElement
  private ligne2: HTMLSpanElement
  private compteur: HTMLSpanElement
  private boutonLire: HTMLButtonElement
  private boutonChoisir: HTMLButtonElement
  private boutonsAllure: HTMLButtonElement[] = []
  private annonce: HTMLDivElement
  private frise: Frise
  private tiroir: Tiroir

  // ---------- Ce qu'on revoit ----------
  private film: readonly Etape[] = []
  private lecture: LectureSeule | null = null
  private seances: Seance[] = []
  private ecart = DECOUPAGES[0] * MINUTE
  private bande: Bande | null = null
  /** Le nombre de gestes de chaque portion déjà comptée (le film est figé tant que la revue est ouverte) */
  private totaux = new Map<string, number>()
  private planches: Planches | null = null
  /** L'instant de chaque image, à l'allure choisie */
  private ech: Float64Array = new Float64Array(1)
  /** L'image montrée */
  private k = 0

  // ---------- La lecture ----------
  private enMarche = false
  private mode: 'lecture' | 'pas' = 'lecture'
  /** L'image où la lecture en cours s'arrêtera */
  private arret = 0
  /** Le temps de la bande (ms) que la lecture a atteint */
  private horloge = 0
  private instant = 0
  private boucle = 0
  /** Les formes qui se dessinent en ce moment */
  private trace: { ids: Set<string>; debut: number; duree: number } | null = null
  /** Rapide par défaut ; retenue tant que l'onglet vit, nulle part ailleurs */
  private allure = 2
  private arretAuxParties = true
  private partieAnnoncee = -1

  // ---------- La vue ----------
  private vue: 'auto' | 'libre' = 'auto'
  private readonly cam = new Camera()
  private rendu: Rendu | null = null
  private images = new Map<string, HTMLImageElement>()
  private taille = { l: 0, h: 0 }
  private doigts = new Map<number, { x: number; y: number; x0: number; y0: number; bouge: boolean }>()
  private pince: { d: number; cx: number; cy: number } | null = null
  private appui: { id: number; t0: number } | null = null
  /** On glisse sur la frise : les traits sont montrés en simples lignes, vite */
  private glisse = false

  private retour: HTMLElement | null = null
  /** Ce que le branchement veut faire quand le tableau revient à l'écran */
  private auRetour: (() => void) | null = null
  /** L'instant de l'ouverture (performance.now()) */
  private ouverteA = -Infinity
  private inertes: HTMLElement[] = []
  private minuterieRepos = 0
  private minuterieBandeau = 0
  private reduit = window.matchMedia('(prefers-reduced-motion: reduce)')

  constructor(private app: App, private parent: HTMLElement) {
    const el = this.el = document.createElement('div')
    el.className = 'revue'
    el.setAttribute('role', 'dialog')
    el.setAttribute('aria-modal', 'true')
    el.setAttribute('aria-label', 'Revoir la construction')
    el.hidden = true
    el.innerHTML = `
      <div class="revue-scene"></div>
      <div class="revue-cadre" aria-hidden="true"></div>
      <div class="revue-ou"><span class="revue-etiquette">REVOIR</span><span class="ligne1"></span><span class="ligne2"></span></div>
      <div class="revue-barre">
        <div class="revue-bandeau" role="status" hidden></div>
        <div class="revue-ligne-frise"><span class="revue-compteur"></span></div>
        <div class="revue-rangee">
          <div class="revue-groupe"></div>
          <div class="revue-allures" role="group" aria-label="Allure"></div>
        </div>
      </div>
      <div class="revue-annonce" aria-live="polite"></div>`
    const $ = <T extends HTMLElement>(s: string) => el.querySelector(s) as T
    this.scene = $('.revue-scene'); this.barre = $('.revue-barre'); this.bandeau = $('.revue-bandeau')
    this.ligne1 = $('.ligne1'); this.ligne2 = $('.ligne2'); this.compteur = $('.revue-compteur')
    this.annonce = $('.revue-annonce')

    // La frise, son compteur et le cadrage
    this.frise = new Frise((k, glisse) => {
      this.fermerBandeau(); this.pause(false)
      this.glisse = glisse
      this.aller(k, false, !glisse)
    })
    const ligneFrise = $('.revue-ligne-frise')
    ligneFrise.prepend(this.frise.el)
    ligneFrise.append(this.bouton('cadrer', 'Toute la page (C)', () => this.recadrer()))

    // Choisir, avancer, l'allure, revenir
    const rangee = $('.revue-rangee')
    this.boutonChoisir = this.boutonTexte('liste', 'Que revoir ?', 'Que revoir ? Une page, une séance, une page jetée', () => this.basculerTiroir())
    this.boutonChoisir.classList.add('b-choisir')
    this.boutonChoisir.setAttribute('aria-expanded', 'false')
    rangee.prepend(this.boutonChoisir)
    this.boutonLire = this.bouton('lire', 'Lire (Espace)', () => this.basculer(), 'b-lire')
    $('.revue-groupe').append(
      this.bouton('partieAvant', 'Partie précédente ([)', () => this.partie(-1), 'repete'),
      this.bouton('pasAvant', 'Pas précédent (←)', () => this.pasEnArriere(), 'repete'),
      this.boutonLire,
      this.bouton('pasApres', 'Pas suivant (→)', () => this.pasEnAvant(), 'repete'),
      this.bouton('partieApres', 'Partie suivante (])', () => this.partie(1), 'repete'),
    )
    const allures = $('.revue-allures')
    ALLURES.forEach((a, i) => {
      const b = document.createElement('button')
      b.type = 'button'
      b.textContent = a.nom
      b.title = `Allure ${a.nom} (${i + 1})`
      b.addEventListener('click', () => this.choisirAllure(i))
      this.boutonsAllure.push(b)
      allures.append(b)
    })
    const revenir = this.boutonTexte('revenir', 'Revenir au direct', 'Revenir au direct (Échap)', () => this.fermer())
    revenir.classList.add('b-revenir')
    rangee.append(revenir)
    // Après un clic à la souris, le bouton rend la main : Espace lit, au lieu de recliquer
    this.barre.addEventListener('click', e => { if (e.detail > 0) (e.target as HTMLElement).closest('button')?.blur() })

    this.tiroir = new Tiroir(this.boutonChoisir, this.barre, this.scene, $('.revue-ou'))
    el.insertBefore(this.tiroir.el, this.annonce)
    parent.appendChild(el)
    this.brancherScene()

    // Pour les essais au navigateur, en développement seulement
    if (import.meta.env.DEV) Object.assign(window, { __revue: this })
  }

  get ouvert() { return !this.el.hidden }

  private get facteur() { return ALLURES[this.allure].facteur }

  // ---------- Ouvrir, fermer ----------
  /** retour : l'élément qui reprend le focus ; auRetour : appelé quand la revue rend l'écran au tableau */
  ouvrir(retour?: HTMLElement, auRetour?: () => void) {
    if (this.ouvert) return
    const app = this.app
    const film = app.tableau.film.toArray()
    if (film.length < 2) {
      app.ui.message('Rien à revoir pour l\'instant : la revue montre ce qui a été écrit pendant les séances.')
      return
    }
    app.enLecture = true
    this.ouverteA = performance.now()
    this.retour = retour ?? null
    this.auRetour = auRetour ?? null
    this.lecture = lectureDe(app.tableau, () => app.pages, film)
    this.film = this.lecture.film
    this.seances = seancesDuFilm(this.film, this.ecart)
    this.planches = new Planches(this.lecture)
    this.totaux.clear()

    // Le reste de l'écran ne répond plus, ni au clavier ni au lecteur d'écran
    // (le message du tableau, lui, reste lisible)
    this.inertes = []
    for (const c of this.parent.children) {
      if (c === this.el || !(c instanceof HTMLElement) || c.inert || c.classList.contains('toast')) continue
      c.inert = true; this.inertes.push(c)
    }
    this.el.hidden = false
    this.taille = { l: this.scene.clientWidth, h: this.scene.clientHeight }
    if (!this.rendu) {
      // Une fois pour toutes : masqué, son calque ne garde que des canevas de 0 × 0
      const r = this.rendu = new Rendu(this.cam, this.scene)
      r.poignees = false
      r.instrumentsCaches = true
      r.pixels = src => this.pixels(src)
      r.rendreFormule = (latex, e) => katex.render(latex, e, { throwOnError: false, displayMode: false })
    }
    window.addEventListener('keydown', this.surTouche, true)
    window.addEventListener('keyup', this.surRelache, true)

    // La page affichée dans sa dernière séance ; une page toute neuve (sa
    // naissance seule) n'a rien à montrer : la dernière séance qui montre quelque chose
    const b = bandeParDefaut(this.lecture, this.seances, app.page, pg => this.nommer(pg))
    if (!b) {
      this.fermer()
      app.ui.message('Rien à revoir pour l\'instant : la revue montre ce qui a été écrit pendant les séances.')
      return
    }
    this.montrer(b, true)
    this.boutonLire.focus()
  }

  fermer() {
    if (!this.ouvert) return
    this.enMarche = false
    this.trace = null
    this.glisse = false
    cancelAnimationFrame(this.boucle); this.boucle = 0
    clearTimeout(this.minuterieRepos); clearTimeout(this.minuterieBandeau)
    window.removeEventListener('keydown', this.surTouche, true)
    window.removeEventListener('keyup', this.surRelache, true)
    this.tiroir.fermer('personne')
    this.fermerBandeau()
    this.el.hidden = true
    this.el.classList.remove('repos')
    this.doigts.clear(); this.pince = null; this.appui = null
    this.planches?.vider()
    this.planches = null; this.bande = null; this.lecture = null; this.film = []; this.seances = []; this.totaux.clear()
    if (this.rendu) { this.rendu.formes = []; this.rendu.toutRedessiner() }
    this.images.clear()
    for (const c of this.inertes) c.inert = false
    this.inertes = []

    const app = this.app
    app.enLecture = false
    app.rafraichir()
    app.ui.maj()
    if (this.retour?.isConnected) this.retour.focus()
    this.retour = null
    const apres = this.auRetour
    this.auRetour = null
    apres?.()
  }

  // ---------- Ce qu'on revoit ----------
  /** Montre une portion ; false si elle n'a rien à montrer (la bande ne change pas) */
  private choisirPortion(p: Portion): boolean {
    this.pause(false)
    const b = construireBande(this.lecture!, p, this.seances, pg => this.nommer(pg))
    if (!b) {
      this.app.ui.message('Rien à revoir ici.')
      return false
    }
    this.montrer(b)
    return true
  }

  /** Combien de gestes montre une portion (0 : rien), comptés comme sa bande les compte */
  private totalDe(p: Portion): number {
    const cle = p.genre === 'page' ? `page|${p.page}` : `${p.seance.de}|${p.seance.a}|${p.page ?? ''}`
    let n = this.totaux.get(cle)
    if (n === undefined && this.lecture) {
      n = compterGestes(this.lecture, p)
      this.totaux.set(cle, n)
    }
    return n ?? 0
  }

  /** Montre une bande, en pause sur son affiche. `premiere` : à l'ouverture */
  private montrer(b: Bande, premiere = false) {
    const p = b.portion
    this.bande = b
    this.ech = echeances(b, this.facteur)
    this.frise.charger(b.images.length, b.parties)
    this.partieAnnoncee = -1
    // On ouvre sur l'affiche : la fin de la portion
    const n = b.images.length
    this.k = n - 1
    this.trace = null
    this.montrerBandeau(`${this.resume(p)} — Espace : revoir depuis le début · ← : remonter pas à pas`, ACCUEIL)
    const fin = b.images[n - 1]
    if (premiere && fin.p === this.app.page) {
      // La même vue que le tableau : au vidéoprojecteur, rien ne saute
      this.cam.x = this.app.cam.x; this.cam.y = this.app.cam.y; this.cam.z = this.app.cam.z
    } else this.cadrer(fin.p)
    this.vue = 'auto'
    this.peindre()
    this.majCommandes()
  }

  /** « Page 3 · mardi 6 octobre, 10 h 05 → 10 h 50 · 84 gestes » */
  private resume(p: Portion): string {
    const b = this.bande!
    const gestes = pluriel(b.total, 'geste')
    if (p.genre === 'seance') {
      const s = p.seance
      if (p.page !== null) {
        const de = b.parties[0].heure, a = this.heureDe(b.images.length - 1)
        return `${this.nommer(p.page)} · ${jour(de)}, ${heureLisible(de)} → ${heureLisible(a)} · ${gestes}`
      }
      const j = jour(s.debut)
      const quand = j === 'aujourd\'hui' ? 'Séance d\'aujourd\'hui' : j === 'hier' ? 'Séance d\'hier' : `Séance du ${j}`
      return `${quand}, ${heureLisible(s.debut)} → ${heureLisible(s.fin)} · ${listeDesPages(s.pages, this.app.pages)} · ${gestes}`
    }
    const nb = seancesDeLaPage(this.lecture!, this.seances, p.page).length
    return `${this.nommer(p.page)}, toute son histoire · ${pluriel(nb, 'séance')} depuis le ${jourDuMois(b.parties[0].heure)} · ${gestes}`
  }

  /** Le nom d'une page, tel que la classe le lit */
  private nommer(page: string): string {
    const pages = this.app.pages
    const i = pages.indexOf(page)
    if (i < 0) return 'Page jetée'
    return pages.length === 1 ? 'La page' : `Page ${i + 1}`
  }

  /** L'heure de l'image k : celle de son geste, ou du geste qui la suit */
  private heureDe(k: number): number {
    const b = this.bande!
    const img = b.images[k].geste || k + 1 >= b.images.length ? b.images[k] : b.images[k + 1]
    return this.film[Math.max(0, img.e)]?.t ?? Date.now()
  }

  // ---------- Montrer une image ----------
  /** Va à l'image j. `tracer` : ses formes nouvelles se dessinent ; `suivre` :
   *  en vue automatique, on garde à l'écran ce qui vient d'apparaître. */
  private aller(j: number, tracer = false, suivre = true) {
    const b = this.bande
    if (!b) return
    const n = b.images.length
    j = Math.max(0, Math.min(n - 1, j))
    const k0 = this.k
    const avant = b.images[k0], img = b.images[j]
    this.k = j
    this.trace = null
    if (suivre) this.glisse = false

    const voisine = j > 0 && b.images[j - 1].p === img.p ? b.images[j - 1] : null
    const voir = suivre && this.vue === 'auto' && (this.enMarche || j === k0 + 1)
    const apparues = voisine && (tracer || voir) ? this.planches!.apparues(voisine, img) : []
    if (tracer && !this.reduit.matches) {
      const f = apparues.filter(seDessine)
      if (f.length) {
        let duree = dureeDuTrace(f) / this.facteur
        // Pendant la lecture, le tracé finit toujours avant le geste suivant
        if (this.enMarche && j + 1 < n) duree = Math.min(duree, 0.85 * (this.ech[j + 1] - this.ech[j]))
        if (duree >= TRACE_VISIBLE) {
          this.trace = { ids: new Set(f.map(x => x.id)), debut: performance.now(), duree }
          this.assurerBoucle()
        }
      }
    }
    if (this.vue === 'auto') {
      // Pendant un glissé sur la frise, on cadre ce qu'on voit sans lire d'autre planche
      if (img.p !== avant.p) this.cadrer(img.p, !suivre)
      else if (voir && apparues.length) this.garderEnVue(apparues)
    }
    this.peindre()
    this.majCommandes()
  }

  private peindre() {
    const r = this.rendu, b = this.bande
    if (!r || !b || !this.planches) return
    const planche = this.planches.lire(b.images[this.k])
    const t = this.trace
    if (t) {
      const fait = Math.min(1, (performance.now() - t.debut) / t.duree)
      r.formes = planche.formes.map(f => t.ids.has(f.id) ? esquisse(f, fait) : f)
    } else if (this.glisse) r.formes = planche.formes.map(brouillon)
    else r.formes = planche.formes
    r.fond = planche.fond
    r.origine = planche.origine
    r.toutRedessiner()
  }

  private pixels(src: string): HTMLImageElement | null {
    let img = this.images.get(src)
    if (!img) {
      const d = this.lecture?.image(src)
      if (!d || !d.startsWith('data:image/')) return null
      img = new Image()
      img.onload = () => { if (this.ouvert) this.rendu?.toutRedessiner() }
      img.src = d
      this.images.set(src, img)
    }
    return img
  }

  // ---------- La lecture ----------
  private lire() {
    const b = this.bande
    if (!b) return
    this.fermerBandeau()
    if (this.k >= b.images.length - 1) this.aller(0)
    this.mode = 'lecture'
    this.arret = prochainArret(b, this.k, this.arretAuxParties)
    this.demarrer()
    this.annoncer(`Lecture, allure ${ALLURES[this.allure].nom}`)
  }

  /** Joue jusqu'à l'image `cible`, puis s'arrête sans rien dire */
  private jouerJusqua(cible: number) {
    this.mode = 'pas'
    this.arret = cible
    this.demarrer()
  }

  private demarrer() {
    const n = this.bande!.images.length
    // Quelque chose bouge en moins de 150 ms, quelle que soit l'attente d'origine
    // (le geste paraît au plus 100 ms après l'appui ; l'écran suit à l'image d'après)
    this.horloge = Math.max(this.ech[this.k], this.ech[Math.min(n - 1, this.k + 1)] - DEMARRAGE)
    this.instant = performance.now()
    this.enMarche = true
    this.majCommandes()
    this.reveiller()
    this.assurerBoucle()
  }

  private pause(dire = true) {
    const marchait = this.enMarche
    this.enMarche = false
    if (this.trace) { this.trace = null; this.peindre() }
    if (!this.bande) return
    this.majCommandes()
    this.reveiller()
    if (marchait && dire) this.annoncer('Pause')
  }

  private basculer() {
    if (this.enMarche) { this.fermerBandeau(); this.pause() } else this.lire()
  }

  private assurerBoucle() {
    if (this.boucle) return
    this.instant = performance.now()
    this.boucle = requestAnimationFrame(this.tic)
  }

  /** La seule horloge de la revue : une image d'écran à la fois */
  private tic = (now: number) => {
    this.boucle = 0
    if (!this.ouvert || !this.bande) return
    // Un onglet caché ne rattrape rien en revenant : au plus 100 ms par image
    const dt = Math.min(100, Math.max(0, now - this.instant))
    this.instant = now
    if (this.enMarche) {
      this.horloge += dt
      const j = indiceAuTemps(this.ech, this.horloge, this.k, this.arret)
      // Plusieurs gestes dans la même image d'écran : on montre le dernier, sans tracé
      if (j > this.k) this.aller(j, j === this.k + 1)
      if (this.k >= this.arret) this.arreter()
    }
    if (this.trace) {
      this.peindre()
      if (performance.now() - this.trace.debut >= this.trace.duree) { this.trace = null; this.peindre() }
    }
    if (this.enMarche || this.trace) this.boucle = requestAnimationFrame(this.tic)
  }

  private arreter() {
    this.enMarche = false
    const b = this.bande!
    const n = b.images.length
    if (this.k >= n - 1) {
      this.montrerBandeau('Fin. Espace : revoir depuis le début · Échap : revenir au direct.')
      this.annoncer('Fin')
    } else if (this.mode === 'lecture') {
      const q = partieDe(b, this.k)
      if (this.k === b.parties[q].fin && q + 1 < b.parties.length) {
        this.montrerBandeau(`Fin de « ${b.parties[q].titre} ». Espace : continuer avec « ${b.parties[q + 1].titre} ».`)
      }
    }
    this.majCommandes()
    this.reveiller()
  }

  // ---------- Les commandes ----------
  /** Un pas : jusqu'à la borne suivante, tracé compris. Appuyer pendant
   *  un pas le finit tout de suite, et joue le suivant. */
  private pasEnAvant() {
    const b = this.bande
    if (!b) return
    this.fermerBandeau()
    if (this.enMarche && this.mode === 'pas') { this.enMarche = false; this.aller(this.arret) }
    const cible = pasSuivant(b, this.k)
    if (cible > this.k) this.jouerJusqua(cible)
    else this.pause(false)
  }

  private pasEnArriere() {
    const b = this.bande
    if (!b) return
    this.fermerBandeau()
    this.pause(false)
    this.aller(pasPrecedent(b, this.k))
  }

  /** Un geste visible plus loin (ou plus tôt) : on saute ceux qui ne changent rien à l'écran */
  private geste(sens: 1 | -1) {
    const b = this.bande
    if (!b || !this.planches) return
    this.fermerBandeau()
    this.pause(false)
    const n = b.images.length, ici = b.images[this.k]
    const vu = this.planches.lire(ici)
    let j = this.k + sens, sauts = 0
    while (j > 0 && j < n - 1 && sauts < SAUTS_MAX && b.images[j].p === ici.p && memeImage(this.planches.lire(b.images[j]), vu)) { j += sens; sauts++ }
    this.aller(j, sens > 0)
  }

  private partie(sens: 1 | -1) {
    const b = this.bande
    if (!b) return
    this.fermerBandeau()
    this.pause(false)
    this.aller(sens > 0 ? entreeSuivante(b, this.k) : entreePrecedente(b, this.k))
  }

  private bout(fin: boolean) {
    const b = this.bande
    if (!b) return
    this.fermerBandeau()
    this.pause(false)
    this.aller(fin ? b.images.length - 1 : 0)
  }

  /** Change d'allure tout de suite, sans perdre la place dans l'attente en cours */
  private choisirAllure(i: number) {
    this.fermerBandeau()
    i = Math.max(0, Math.min(ALLURES.length - 1, i))
    const b = this.bande
    if (b && i !== this.allure) {
      const f0 = this.facteur, avant = this.ech
      this.allure = i
      const f1 = this.facteur
      this.ech = echeances(b, f1)
      if (this.enMarche) this.horloge = this.ech[this.k] + (this.horloge - avant[this.k]) * f0 / f1
      const t = this.trace
      if (t) {
        const maintenant = performance.now(), fait = Math.min(1, (maintenant - t.debut) / t.duree)
        t.duree = t.duree * f0 / f1
        t.debut = maintenant - fait * t.duree
      }
    } else this.allure = i
    this.majCommandes()
    this.annoncer(`Allure ${ALLURES[i].nom}`)
  }

  private basculerTiroir() {
    if (this.tiroir.ouvert) { this.tiroir.fermer(); this.majCommandes(); return }
    this.ouvrirTiroir()
  }

  private ouvrirTiroir() {
    const b = this.bande
    if (!b || !this.lecture) return
    this.fermerBandeau()
    this.tiroir.ouvrir({
      film: this.film,
      seances: this.seances,
      pageVue: b.images[this.k].p,
      nommer: p => this.nommer(p),
      pagesActuelles: this.app.pages,
      naissance: i => this.lecture?.naissance(i) ?? false,
      gestes: p => this.totalDe(p),
      portion: b.portion,
      arretAuxParties: this.arretAuxParties,
      ecart: this.ecart,
      surPortion: p => { this.choisirPortion(p); this.boutonLire.focus() },
      surArret: oui => {
        this.arretAuxParties = oui
        if (this.enMarche && this.mode === 'lecture' && this.bande) this.arret = prochainArret(this.bande, this.k, oui)
      },
      surEcart: ms => {
        // Le découpage change la liste des séances, pas ce qu'on regarde
        this.ecart = ms
        this.seances = seancesDuFilm(this.film, ms)
        this.ouvrirTiroir()
      },
    })
    this.majCommandes()
  }

  private recadrer() {
    const b = this.bande
    if (!b) return
    this.fermerBandeau()
    this.vue = 'auto'
    this.cadrer(b.images[this.k].p)
    this.rendu?.toutRedessiner()
  }

  // ---------- Le clavier ----------
  private surTouche = (e: KeyboardEvent) => {
    const cible = e.target as HTMLElement
    // Une fenêtre ouverte par-dessus (Publier) garde son clavier
    if (cible.closest?.('dialog')) return
    e.stopPropagation()
    this.reveiller()
    this.ouverteA = -Infinity
    if (this.tiroir.el.contains(cible) || cible.matches?.('input, select, textarea')) {
      if (e.key === 'Escape') { e.preventDefault(); this.tiroir.fermer(); this.majCommandes() }
      return
    }
    if (cible.closest?.('button') && (e.key === ' ' || e.key === 'Enter')) {
      // Entrée tenue sur un bouton le cliquerait à chaque répétition : seuls les pas s'enchaînent
      if (e.repeat && e.key === 'Enter' && !cible.closest('.repete')) e.preventDefault()
      return
    }
    // Les raccourcis du navigateur restent au navigateur (AltGr, qui vaut Ctrl+Alt, n'en est pas)
    if (e.metaKey || (e.ctrlKey && !e.altKey) || (e.altKey && !e.ctrlKey && e.key.length > 1)) return
    const action = TOUCHES[nomDeTouche(e)]
    if (!action) return
    e.preventDefault()
    if (e.repeat && SANS_REPETITION.has(action)) return
    this.agir(action)
  }

  private surRelache = (e: KeyboardEvent) => {
    if ((e.target as HTMLElement).closest?.('dialog')) return
    e.stopPropagation()
  }

  private agir(a: Action) {
    switch (a) {
      case 'basculer': return this.basculer()
      case 'pasSuivant': return this.pasEnAvant()
      case 'pasPrecedent': return this.pasEnArriere()
      case 'gesteSuivant': return this.geste(1)
      case 'gestePrecedent': return this.geste(-1)
      case 'partieSuivante': return this.partie(1)
      case 'partiePrecedente': return this.partie(-1)
      case 'debut': return this.bout(false)
      case 'fin': return this.bout(true)
      case 'plusLent': return this.choisirAllure(this.allure - 1)
      case 'plusVite': return this.choisirAllure(this.allure + 1)
      case 'cadrer': return this.recadrer()
      case 'echap':
        if (this.tiroir.ouvert) { this.tiroir.fermer(); this.majCommandes(); return }
        return this.fermer()
      default: return this.choisirAllure(Number(a.slice(-1)))
    }
  }

  // ---------- La scène : regarder, jamais écrire ----------
  private brancherScene() {
    const s = this.scene
    s.addEventListener('pointerdown', e => {
      try { s.setPointerCapture(e.pointerId) } catch { /* pointeur déjà parti : on suit quand même */ }
      this.doigts.set(e.pointerId, { x: e.clientX, y: e.clientY, x0: e.clientX, y0: e.clientY, bouge: false })
      const t0 = performance.now()
      // Le second clic d'un double-clic sur « Revoir » tombe ici : on ne le compte pas comme un appui
      this.appui = this.doigts.size === 1 && e.button === 0 && t0 - this.ouverteA >= APRES_OUVERTURE ? { id: e.pointerId, t0 } : null
      this.repincer()
    })
    s.addEventListener('pointermove', e => {
      const p = this.doigts.get(e.pointerId)
      if (!p || !this.rendu) return
      if (this.doigts.size === 1) {
        // Un appui qui tremble n'est pas un déplacement
        if (!p.bouge && Math.hypot(e.clientX - p.x0, e.clientY - p.y0) <= BOUGE) return
        p.bouge = true
        this.cam.deplacer(e.clientX - p.x, e.clientY - p.y)
        p.x = e.clientX; p.y = e.clientY
      } else {
        p.bouge = true
        p.x = e.clientX; p.y = e.clientY
        if (this.doigts.size !== 2 || !this.pince) return
        const [a, b] = [...this.doigts.values()]
        const r = s.getBoundingClientRect()
        const d = Math.hypot(a.x - b.x, a.y - b.y), cx = (a.x + b.x) / 2, cy = (a.y + b.y) / 2
        this.cam.deplacer(cx - this.pince.cx, cy - this.pince.cy)
        if (this.pince.d > 0) this.cam.zoomerAutour(cx - r.left, cy - r.top, d / this.pince.d)
        this.pince = { d, cx, cy }
      }
      this.vueLibre()
    })
    const lacher = (e: PointerEvent, annule: boolean) => {
      const p = this.doigts.get(e.pointerId)
      const a = this.appui
      this.doigts.delete(e.pointerId)
      this.repincer()
      if (!a || a.id !== e.pointerId) return
      this.appui = null
      if (annule || !p || p.bouge || performance.now() - a.t0 >= APPUI_BREF) return
      // Fermé d'un geste, le tiroir ne rend pas le focus à son bouton : Espace lira
      if (this.tiroir.ouvert) { this.tiroir.fermer('personne'); this.majCommandes() } else this.basculer()
    }
    s.addEventListener('pointerup', e => lacher(e, false))
    s.addEventListener('pointercancel', e => lacher(e, true))
    s.addEventListener('wheel', e => {
      e.preventDefault()
      const r = s.getBoundingClientRect()
      // Comme au tableau : une vraie molette zoome (crans entiers, sans mouvement de côté) ;
      // sur un pavé tactile, deux doigts déplacent et le pincement (ctrl) zoome
      const molette = e.deltaMode !== 0 || (e.deltaX === 0 && Number.isInteger(e.deltaY) && Math.abs(e.deltaY) >= 50)
      if (e.ctrlKey || e.metaKey || molette) {
        const d = e.deltaMode === 1 ? e.deltaY * 33 : e.deltaY
        this.cam.zoomerAutour(e.clientX - r.left, e.clientY - r.top, Math.exp(-d * (e.ctrlKey && !molette ? 0.01 : 0.0015)))
      } else this.cam.deplacer(-e.deltaX, -e.deltaY)
      this.vueLibre()
    }, { passive: false })
    // Ni menu, ni fichier ouvert par le navigateur, ni image importée
    for (const type of ['contextmenu', 'dragover', 'drop'] as const) this.el.addEventListener(type, e => e.preventDefault())
    // La barre se montre dès qu'on bouge
    this.el.addEventListener('pointermove', () => this.reveiller())
    // Un appui ailleurs (barre, tiroir) n'est plus la fin d'un double-clic : le tableau répond de nouveau
    this.el.addEventListener('pointerdown', e => { if (!this.scene.contains(e.target as Node)) this.ouverteA = -Infinity })
    // L'écran tourne, la barre change de hauteur : le tiroir se replace, la vue automatique se recadre
    const suivre = new ResizeObserver(() => {
      if (!this.ouvert || !this.bande) return
      if (this.tiroir.ouvert) this.tiroir.placer()
      const l = this.scene.clientWidth, h = this.scene.clientHeight
      if (l === this.taille.l && h === this.taille.h) return
      this.taille = { l, h }
      if (this.vue === 'auto') { this.cadrer(this.bande.images[this.k].p); this.rendu?.toutRedessiner() }
    })
    suivre.observe(this.scene)
    suivre.observe(this.barre)
  }

  private repincer() {
    if (this.doigts.size !== 2) { this.pince = null; return }
    const [a, b] = [...this.doigts.values()]
    this.pince = { d: Math.hypot(a.x - b.x, a.y - b.y), cx: (a.x + b.x) / 2, cy: (a.y + b.y) / 2 }
    if (this.appui) this.appui = null
  }

  private vueLibre() {
    this.vue = 'libre'
    this.rendu?.toutRedessiner()
  }

  // ---------- Le cadrage ----------
  /** La hauteur utile : sous la pastille, au-dessus de la barre */
  private zoneUtile() {
    return { l: this.scene.clientWidth, h: this.scene.clientHeight - this.barre.offsetHeight - SOUS_LA_BARRE - HAUT }
  }

  /** Toute la page (ce qu'elle porte à la fin de la partie, et maintenant) à l'écran, zoom 2 au plus.
   *  `ici` : seulement ce que porte l'image montrée. */
  private cadrer(page: string, ici = false) {
    const b = this.bande, pl = this.planches
    if (!b || !pl) return
    const pa = b.parties[partieDe(b, this.k)]
    const formes: Forme[] = []
    if (!ici) for (let i = pa.fin; i >= pa.debut; i--) if (b.images[i].p === page) { formes.push(...pl.lire(b.images[i]).formes); break }
    if (b.images[this.k].p === page) formes.push(...pl.lire(b.images[this.k]).formes)
    const z = boiteDes(formes)
    const { l, h } = this.zoneUtile()
    if (!z || l <= 0 || h <= 0) return
    const m = Math.max(40, 0.08 * Math.max(z.l, z.h))
    const cx = z.x + z.l / 2, cy = z.y + z.h / 2
    this.cam.cadrer(cx, cy, Math.max(480, z.l + 2 * m), Math.max(320, z.h + 2 * m), l, h)
    if (this.cam.z > 2) { this.cam.z = 2; this.cam.x = l / 2 - cx * 2; this.cam.y = h / 2 - cy * 2 }
    this.cam.y += HAUT
  }

  /** Ce qui vient d'apparaître reste à l'écran : on recentre, sans changer le zoom */
  private garderEnVue(formes: Forme[]) {
    const z = boiteDes(formes)
    const { l, h } = this.zoneUtile()
    if (!z || l <= 0 || h <= 0) return
    const c = this.cam
    const x1 = -c.x / c.z, y1 = (HAUT - c.y) / c.z, x2 = (l - c.x) / c.z, y2 = (HAUT + h - c.y) / c.z
    if (z.x >= x1 && z.y >= y1 && z.x + z.l <= x2 && z.y + z.h <= y2) return
    if (z.l * c.z > l || z.h * c.z > h) { this.cadrer(this.bande!.images[this.k].p); return }
    c.x = l / 2 - (z.x + z.l / 2) * c.z
    c.y = HAUT + h / 2 - (z.y + z.h / 2) * c.z
  }

  // ---------- Ce que dit l'écran ----------
  private majCommandes() {
    const b = this.bande
    if (!b) return
    const n = b.images.length, k = this.k, img = b.images[k]
    const q = partieDe(b, k), nbParties = b.parties.length
    const pages = this.app.pages
    const h = this.heureDe(k)
    const sur = pages.length > 1 && pages.includes(img.p) ? ` / ${pages.length}` : ''
    this.ligne1.textContent = `${this.nommer(img.p)}${sur} · ${jourCourt(h)} · ${heureLisible(h)}`
    this.ligne2.textContent = nbParties > 1 ? `Partie ${q + 1} / ${nbParties}` : ''
    this.ligne2.hidden = nbParties < 2
    this.compteur.textContent = `${b.gestes[k]} / ${b.total}`
    this.compteur.title = `Encore environ ${dureeLisible(this.ech[n - 1] - this.ech[k])} à cette allure`
    // Pendant la lecture, la frise avance sans rien dire : focalisée, elle ferait
    // lire chaque geste au lecteur d'écran. Elle le dit à l'arrêt.
    this.frise.placer(k, q, this.enMarche ? null : `Geste ${b.gestes[k]} sur ${b.total} · ${this.nommer(img.p)} · partie ${q + 1} sur ${nbParties}`)

    const icone: NomIcone = this.enMarche ? 'pause' : 'lire'
    if (this.boutonLire.dataset.icone !== icone) {
      this.boutonLire.dataset.icone = icone
      this.boutonLire.innerHTML = svg(icone)
      const titre = this.enMarche ? 'Pause (Espace)' : 'Lire (Espace)'
      this.boutonLire.title = titre
      this.boutonLire.setAttribute('aria-label', titre)
    }
    this.boutonsAllure.forEach((bt, i) => bt.setAttribute('aria-pressed', String(i === this.allure)))
    this.boutonChoisir.setAttribute('aria-expanded', String(this.tiroir.ouvert))

    if (q !== this.partieAnnoncee) {
      if (this.partieAnnoncee >= 0) this.annoncer(`Partie ${q + 1} sur ${nbParties} : ${b.parties[q].titre}`)
      this.partieAnnoncee = q
    }
  }

  private montrerBandeau(texte: string, duree = 0) {
    clearTimeout(this.minuterieBandeau)
    this.bandeau.textContent = texte
    this.bandeau.hidden = false
    if (duree) this.minuterieBandeau = window.setTimeout(() => this.fermerBandeau(), duree)
  }

  private fermerBandeau() {
    clearTimeout(this.minuterieBandeau)
    this.bandeau.hidden = true
  }

  private annoncer(t: string) {
    this.annonce.textContent = ''
    requestAnimationFrame(() => { this.annonce.textContent = t })
  }

  /** Pendant la lecture, la barre s'estompe après quelques secondes sans mouvement */
  private reveiller() {
    clearTimeout(this.minuterieRepos)
    this.el.classList.remove('repos')
    if (!this.enMarche || this.reduit.matches) return
    this.minuterieRepos = window.setTimeout(() => {
      if (this.enMarche && this.ouvert && !this.tiroir.ouvert) this.el.classList.add('repos')
    }, REPOS)
  }

  // ---------- Les boutons ----------
  private bouton(icone: NomIcone, titre: string, action: () => void, classe = ''): HTMLButtonElement {
    const b = document.createElement('button')
    b.type = 'button'
    b.className = `bouton ${classe}`.trim()
    b.innerHTML = svg(icone)
    b.title = titre
    b.setAttribute('aria-label', titre)
    b.addEventListener('click', action)
    return b
  }

  private boutonTexte(icone: NomIcone, texte: string, titre: string, action: () => void): HTMLButtonElement {
    const b = document.createElement('button')
    b.type = 'button'
    b.className = 'revue-texte'
    b.innerHTML = svg(icone)
    b.append(texte)
    b.title = titre
    b.addEventListener('click', action)
    return b
  }
}

/** Pendant un glissé sur la frise, chaque image d'écran peut montrer une autre
 *  heure du tableau : un trait y devient une simple ligne de même couleur, sans
 *  le calcul de son contour à la plume, qui coûte cher sur une page chargée.
 *  Au lâcher, tout reprend sa vraie forme. */
function brouillon(f: Forme): Forme {
  if (f.type !== 'trait') return f
  const pts: number[] = []
  for (let i = 0; i + 2 < f.pts.length; i += 3) pts.push(f.pts[i], f.pts[i + 1])
  if (pts.length === 2) pts.push(pts[0], pts[1])                // un point reste un point
  return { id: f.id, type: 'polygone', x: f.x, y: f.y, z: f.z, auteur: f.auteur, pts, ferme: false, couleur: voile(f.couleur, f.opacite), taille: f.taille * 0.8 }
}

/** « #1f5fbf » à 35 % : « rgba(31, 95, 191, 0.35) » */
function voile(couleur: string, opacite: number): string {
  const m = /^#([0-9a-f]{2})([0-9a-f]{2})([0-9a-f]{2})$/i.exec(couleur)
  if (!m || !(opacite < 1)) return couleur
  return `rgba(${parseInt(m[1], 16)}, ${parseInt(m[2], 16)}, ${parseInt(m[3], 16)}, ${opacite})`
}

/** La boîte qui contient toutes ces formes (null : aucune) */
function boiteDes(formes: Forme[]): Boite | null {
  let x1 = Infinity, y1 = Infinity, x2 = -Infinity, y2 = -Infinity
  for (const f of formes) {
    const b = boiteDe(f)
    if (!b) continue
    x1 = Math.min(x1, b.x); y1 = Math.min(y1, b.y); x2 = Math.max(x2, b.x + b.l); y2 = Math.max(y2, b.y + b.h)
  }
  return x1 === Infinity ? null : { x: x1, y: y1, l: x2 - x1, h: y2 - y1 }
}
