// =============================================================
// LE LECTEUR : REJOUER CE QUI S'EST PASSÉ AU TABLEAU
// Chaque geste a laissé une étape dans le film du document (heure,
// page, état). Rejouer, c'est reconstruire chaque état dans l'ordre :
// « regardez comment on est arrivé là ».
//
// Deux règles :
// - Le lecteur ne touche à rien. Il n'écrit pas dans le document ; en
//   se refermant, il rend le tableau tel qu'il l'a trouvé.
// - Il respecte le rythme d'origine, entre deux bornes : une rafale de
//   gestes reste visible, une longue explication ne fige pas l'écran.
// =============================================================
import type { App } from './app'
import type { ImagePage } from './document'
import type { Forme, Trait } from './types'

const RYTHME_MIN = 60          // ms : au-dessous, l'étape passerait inaperçue
const RYTHME_MAX = 2500        // ms : au-dessus, on regarderait un tableau figé
const VITESSE_MIN = 0.05, VITESSE_MAX = 8, CRANS = 100
const CLE_VITESSE = 'mem-lecture-vitesse'

// La vitesse se règle sur une échelle logarithmique : un même geste du
// curseur vaut partout le même rapport, et le lent a autant de place que le vif.
const vitesseDuCran = (c: number) => VITESSE_MIN * Math.pow(VITESSE_MAX / VITESSE_MIN, c / CRANS)
const cranDeVitesse = (v: number) => Math.round(CRANS * Math.log(v / VITESSE_MIN) / Math.log(VITESSE_MAX / VITESSE_MIN))
const lisible = (v: number) => '×' + (v < 1 ? v.toFixed(2) : v.toFixed(1)).replace(/\.?0+$/, '').replace('.', ',')

const ICONES = {
  debut: 'M6 5v14M18 6l-9 6 9 6z',
  avant: 'M17 6l-8 6 8 6z',
  lire: 'M8 5l11 7-11 7z',
  pause: 'M8 5v14M16 5v14',
  apres: 'M7 6l8 6-8 6z',
  fin: 'M18 5v14M6 6l9 6-9 6z',
  fermer: 'M6 6l12 12M18 6L6 18',
}
const svg = (d: string) => `<svg viewBox="0 0 24 24" aria-hidden="true"><path d="${d}"/></svg>`

export class Lecteur {
  private i = 0
  private enMarche = false
  private minuterie = 0
  private animation = 0
  private vitesse = 1
  private page = ''
  private barre: HTMLDivElement
  private voile: HTMLDivElement
  private curseur!: HTMLInputElement
  private compteur!: HTMLSpanElement
  private boutonLire!: HTMLButtonElement
  private texteVitesse!: HTMLSpanElement
  private clavier = (e: KeyboardEvent) => this.touche(e)

  constructor(private app: App, private racine: HTMLElement, private message: (t: string) => void) {
    try {
      const v = parseFloat(localStorage.getItem(CLE_VITESSE) || '')
      if (v >= VITESSE_MIN && v <= VITESSE_MAX) this.vitesse = v
    } catch { /* stockage refusé */ }

    // Le voile arrête crayons et doigts : on regarde, on n'écrit pas
    this.voile = document.createElement('div')
    this.voile.className = 'voile-lecture'
    this.barre = document.createElement('div')
    this.barre.className = 'barre barre-lecture'
    this.barre.setAttribute('role', 'toolbar')
    this.barre.setAttribute('aria-label', 'Lecteur')
    this.construire()
    this.voile.hidden = this.barre.hidden = true
    racine.append(this.voile, this.barre)
  }

  get ouvert() { return !this.barre.hidden }
  private get film() { return this.app.tableau.film }

  private construire() {
    const b = (nom: keyof typeof ICONES, titre: string, faire: () => void) => {
      const x = document.createElement('button')
      x.type = 'button'; x.className = 'bouton'; x.title = titre; x.setAttribute('aria-label', titre)
      x.innerHTML = svg(ICONES[nom]); x.addEventListener('click', faire)
      return x
    }
    this.boutonLire = b('lire', 'Lire (Espace)', () => this.enMarche ? this.pause() : this.lire())
    this.curseur = Object.assign(document.createElement('input'), { type: 'range', min: '0', className: 'avancee' })
    this.curseur.setAttribute('aria-label', 'Étape')
    this.curseur.addEventListener('input', () => { this.pause(); this.montrer(Number(this.curseur.value), false) })
    this.compteur = document.createElement('span'); this.compteur.className = 'compteur'

    const vit = document.createElement('label'); vit.className = 'vitesse'
    const reglage = Object.assign(document.createElement('input'), { type: 'range', min: '0', max: String(CRANS), value: String(cranDeVitesse(this.vitesse)) })
    reglage.setAttribute('aria-label', 'Vitesse')
    this.texteVitesse = document.createElement('span')
    this.texteVitesse.textContent = lisible(this.vitesse)
    reglage.addEventListener('input', () => {
      this.vitesse = vitesseDuCran(Number(reglage.value))
      this.texteVitesse.textContent = lisible(this.vitesse)
      try { localStorage.setItem(CLE_VITESSE, String(this.vitesse)) } catch { /* refusé */ }
    })
    vit.append(reglage, this.texteVitesse)

    this.barre.append(
      b('debut', 'Début (Origine)', () => { this.pause(); this.montrer(0, false) }),
      b('avant', 'Étape précédente (←)', () => { this.pause(); this.montrer(this.i - 1, false) }),
      this.boutonLire,
      b('apres', 'Étape suivante (→)', () => { this.pause(); this.montrer(this.i + 1, true) }),
      b('fin', 'Fin (Fin)', () => { this.pause(); this.montrer(this.film.length - 1, false) }),
      this.curseur, this.compteur, vit,
      b('fermer', 'Fermer le lecteur (Échap)', () => this.fermer()),
    )
  }

  ouvrir() {
    const n = this.film.length
    if (n < 2) return this.message('Rien à rejouer pour l\'instant : le lecteur rejoue ce qui est tracé à partir de maintenant.')
    this.app.enLecture = true
    this.app.selection.clear()
    this.app.rendu.poignees = false
    this.app.rendu.instrumentsCaches = true
    document.body.classList.add('en-lecture')
    this.voile.hidden = this.barre.hidden = false
    this.curseur.max = String(n - 1)
    window.addEventListener('keydown', this.clavier, true)
    this.app.ui.maj()
    this.montrer(0, false)
    this.lire()
  }

  fermer() {
    this.pause()
    window.removeEventListener('keydown', this.clavier, true)
    this.voile.hidden = this.barre.hidden = true
    document.body.classList.remove('en-lecture')
    this.app.enLecture = false
    this.app.rendu.poignees = true
    this.app.rendu.instrumentsCaches = false
    this.app.rendu.redessinerInstruments()
    // Le tableau revient tel qu'on l'a laissé : rien n'y a été écrit
    this.app.rafraichir()
  }

  private lire() {
    if (this.i >= this.film.length - 1) this.montrer(0, false)   // relancer depuis le début
    this.enMarche = true
    this.boutonLire.innerHTML = svg(ICONES.pause); this.boutonLire.title = 'Pause (Espace)'
    this.suivante()
  }

  private pause() {
    this.enMarche = false
    clearTimeout(this.minuterie)
    this.boutonLire.innerHTML = svg(ICONES.lire); this.boutonLire.title = 'Lire (Espace)'
  }

  /** L'écart réel avec l'étape d'avant, borné, puis divisé par la vitesse */
  private delai(i: number) {
    const a = this.film.get(i - 1)?.t, b = this.film.get(i)?.t
    const vrai = a && b ? Math.max(RYTHME_MIN, Math.min(RYTHME_MAX, b - a)) : 700
    return Math.max(16, vrai / this.vitesse)
  }

  private suivante() {
    if (!this.enMarche) return
    if (this.i >= this.film.length - 1) return this.pause()
    this.minuterie = window.setTimeout(() => { this.montrer(this.i + 1, true); this.suivante() }, this.delai(this.i + 1))
  }

  /** Montre l'étape i ; `anime` : les nouveaux traits se dessinent sous les yeux */
  private montrer(i: number, anime: boolean) {
    const n = this.film.length
    i = Math.max(0, Math.min(n - 1, i))
    const etape = this.film.get(i)
    const page = etape.page || this.page || this.app.page
    const img = this.app.tableau.pageA(etape, page) ?? this.app.tableau.pageA(etape, this.app.page)
    if (!img) return
    const avant = anime && i === this.i + 1 && page === this.page ? this.app.tableau.pageA(this.film.get(this.i), page) : null
    this.i = i; this.page = page
    this.curseur.value = String(i)
    const pages = this.app.pages, numero = pages.indexOf(page)
    this.compteur.textContent = `${i + 1} / ${n}` + (pages.length > 1 && numero >= 0 ? ` · page ${numero + 1}` : '')
    cancelAnimationFrame(this.animation)
    this.afficher(img, img.formes)

    // Les traits apparus à cette étape se tracent point par point
    if (!avant) return
    const deja = new Set(avant.formes.map(f => f.id))
    const nouveaux = img.formes.filter((f): f is Trait => f.type === 'trait' && !deja.has(f.id))
    if (!nouveaux.length) return
    const duree = Math.min(900, this.delai(Math.min(n - 1, i + 1)) * 0.8)
    const debut = performance.now()
    const pas = () => {
      const t = Math.min(1, (performance.now() - debut) / duree)
      this.afficher(img, img.formes.map(f => nouveaux.includes(f as Trait) ? partiel(f as Trait, t) : f))
      if (t < 1) this.animation = requestAnimationFrame(pas)
    }
    pas()
  }

  private afficher(img: ImagePage, formes: Forme[]) {
    const r = this.app.rendu
    r.formes = formes; r.fond = img.fond; r.origine = img.origine
    r.selection = new Set()
    r.toutRedessiner()
  }

  private touche(e: KeyboardEvent) {
    const actions: Record<string, () => void> = {
      ' ': () => this.enMarche ? this.pause() : this.lire(),
      ArrowLeft: () => { this.pause(); this.montrer(this.i - 1, false) },
      ArrowRight: () => { this.pause(); this.montrer(this.i + 1, true) },
      Home: () => { this.pause(); this.montrer(0, false) },
      End: () => { this.pause(); this.montrer(this.film.length - 1, false) },
      Escape: () => this.fermer(),
    }
    const a = actions[e.key]
    // Pendant la lecture, les raccourcis du tableau sont coupés
    if ((e.target as HTMLElement).closest?.('input[type=range]') && e.key.startsWith('Arrow')) return
    e.preventDefault(); e.stopPropagation()
    a?.()
  }
}

/** Le début d'un trait, jusqu'à la fraction t de ses points */
function partiel(f: Trait, t: number): Trait {
  const n = Math.max(1, Math.round((f.pts.length / 3) * t))
  return { ...f, pts: f.pts.slice(0, n * 3) }
}
