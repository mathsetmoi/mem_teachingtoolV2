// =============================================================
// LES OUTILS DE CLASSE
// Un bouton de la barre du haut, entre Automatismes et Revoir, ouvre leur
// menu : le rideau, le pointeur laser, le minuteur, le tirage au sort, et
// l'aide. Sauf le laser (voir App.basculerLaser), ce ne sont que des
// panneaux posés sur l'écran du professeur : rien n'entre dans le
// classeur, le replay, le PDF ni le Drive.
//
// - Le RIDEAU couvre le tableau sous la barre du haut ; on le fait glisser
//   vers le bas (sa poignée, ou n'importe où sur lui, ou la molette) pour
//   dévoiler une correction ligne après ligne. Il est fixé à l'écran : la
//   page défile dessous. On n'écrit pas sous lui (il prend les appuis), mais
//   les barres restent devant.
// - Le MINUTEUR : une durée toute prête (1, 3, 5, 10 min) ou tapée ; à la
//   fin, il clignote en rouge et sonne (trois notes, faites par le
//   navigateur : rien à télécharger, la version hors ligne sonne aussi). Le
//   haut-parleur coupe le son ; le choix reste sur cet appareil.
// - Le TIRAGE AU SORT : la liste des élèves de la classe (le dossier de
//   classe du classeur), un prénom par ligne. Un élève tiré ne revient pas
//   avant que toute la classe soit passée. La liste reste dans ce
//   navigateur (sa mémoire locale), jamais dans le classeur ni ses fichiers.
//
// Les panneaux du minuteur et du tirage se déplacent par leur titre.
// Le calcul (lire une durée, lire une liste, tirer un nom) est pur, plus bas,
// et testé (tests/outils-classe.test.ts).
// =============================================================
import { icone } from './icones'

// ---------- Le calcul ----------

/** Une durée tapée : « 5 » (minutes), « 2,5 », « 2:30 », « 90 s », « 1 min 30 ».
 *  En millisecondes ; null si on ne sait pas la lire, ou hors de 1 s à 3 h. */
export function lireDuree(texte: string): number | null {
  const t = texte.trim().toLowerCase().replace(/\s+/g, ' ')
  if (!t) return null
  let ms: number | null = null
  let m: RegExpMatchArray | null
  if ((m = t.match(/^(\d{1,3}):(\d{1,2})$/))) {
    if (+m[2] < 60) ms = (+m[1] * 60 + +m[2]) * 1000
  } else if ((m = t.match(/^(\d{1,3}(?:[.,]\d+)?) ?(min|mn|m)?$/))) {
    ms = parseFloat(m[1].replace(',', '.')) * 60_000
  } else if ((m = t.match(/^(\d{1,5}) ?(s|sec|secondes?)$/))) {
    ms = +m[1] * 1000
  } else if ((m = t.match(/^(\d{1,3}) ?(?:min|mn|m) ?(\d{1,2}) ?(?:s|sec|secondes?)?$/))) {
    if (+m[2] < 60) ms = (+m[1] * 60 + +m[2]) * 1000
  }
  if (ms === null || !Number.isFinite(ms)) return null
  ms = Math.round(ms / 1000) * 1000
  return ms >= 1000 && ms <= 3 * 3_600_000 ? ms : null
}

/** Le temps qui reste, à l'affichage : « 04:32 », « 1:05:00 » au-delà d'une
 *  heure. Arrondi à la seconde du dessus : « 00:00 » seulement à la fin. */
export function formaterTemps(ms: number): string {
  const s = Math.max(0, Math.ceil(ms / 1000))
  const h = Math.floor(s / 3600), mn = Math.floor((s % 3600) / 60), sec = s % 60
  const deux = (n: number) => String(n).padStart(2, '0')
  return h ? `${h}:${deux(mn)}:${deux(sec)}` : `${deux(mn)}:${deux(sec)}`
}

/** La liste tapée ou collée (depuis un tableur, une liste de classe) : un élève par
 *  ligne (ou séparés par des points-virgules, ou des tabulations), sans les
 *  vides ni les doublons (à la casse et aux accents près). */
export function lireListe(texte: string): string[] {
  const vus = new Set<string>(), r: string[] = []
  for (const brut of texte.split(/[\n\r;\t]+/)) {
    const nom = brut.replace(/\s+/g, ' ').trim().slice(0, 60)
    if (!nom) continue
    const cle = nom.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase()
    if (vus.has(cle)) continue
    vus.add(cle); r.push(nom)
  }
  return r.slice(0, 200)
}

/** Tire un élève parmi ceux qui ne sont pas encore passés ; quand tous le
 *  sont, un nouveau tour commence (le dernier tiré n'ouvre pas le suivant,
 *  s'il y en a d'autres). `hasard` rend un nombre de [0, 1). */
export function tirer(noms: readonly string[], passes: readonly string[], hasard: () => number = Math.random): { nom: string; passes: string[] } | null {
  if (!noms.length) return null
  const deja = new Set(passes.filter(n => noms.includes(n)))
  let restants = noms.filter(n => !deja.has(n))
  let tour = [...deja]
  if (!restants.length) {
    const dernier = passes[passes.length - 1]
    restants = noms.length > 1 ? noms.filter(n => n !== dernier) : [...noms]
    tour = []
  }
  const nom = restants[Math.min(restants.length - 1, Math.floor(hasard() * restants.length))]
  return { nom, passes: [...tour, nom] }
}

// ---------- Ce que le menu demande à l'application ----------
export interface HoteOutils {
  /** Le laser est-il en main ? Le prendre ou le rendre */
  laser(): boolean
  basculerLaser(): void
  /** L'aide et les raccourcis */
  ouvrirAide(): void
  /** La classe du classeur ouvert (son dossier de classe), si elle est connue */
  classe(): Promise<{ id: string; nom: string } | null>
  message(texte: string): void
}

/** La mémoire de cet appareil : sans elle (navigation privée, réglage du
 *  navigateur), les réglages valent pour cette fois */
function lire(cle: string): string | null {
  try { return localStorage.getItem(cle) } catch { return null }
}
function ecrire(cle: string, v: string | null) {
  try { if (v === null) localStorage.removeItem(cle); else localStorage.setItem(cle, v) } catch { /* pour cette fois seulement */ }
}

const CLE_SON = 'mem-minuteur-son'
const PREFIXE_TIRAGE = 'mem-tirage-'
const SANS_CLASSE = 'sans-classe'

function el<K extends keyof HTMLElementTagNameMap>(tag: K, classe = '', texte = ''): HTMLElementTagNameMap[K] {
  const e = document.createElement(tag)
  if (classe) e.className = classe
  if (texte) e.textContent = texte
  return e
}

function boutonIcone(nom: string, titre: string, classe: string, faire: () => void): HTMLButtonElement {
  const b = el('button', 'bouton-panneau ' + classe)
  b.type = 'button'; b.innerHTML = icone(nom); b.title = titre; b.setAttribute('aria-label', titre)
  b.addEventListener('click', faire)
  return b
}

function boutonTexte(texte: string, classe: string, faire: () => void): HTMLButtonElement {
  const b = el('button', classe, texte)
  b.type = 'button'
  b.addEventListener('click', faire)
  return b
}

const mouvementReduit = () => !!window.matchMedia?.('(prefers-reduced-motion: reduce)').matches

/** Un panneau qui se déplace par sa poignée (son titre), sans sortir de l'écran */
function deplacable(panneau: HTMLElement, poignee: HTMLElement) {
  poignee.addEventListener('pointerdown', e => {
    if ((e.target as HTMLElement).closest('button, input, textarea')) return
    e.preventDefault()
    const r = panneau.getBoundingClientRect(), dx = e.clientX - r.left, dy = e.clientY - r.top
    try { poignee.setPointerCapture(e.pointerId) } catch { /* sans capture */ }
    const bouge = (m: PointerEvent) => {
      const x = Math.max(4, Math.min(window.innerWidth - r.width - 4, m.clientX - dx))
      const y = Math.max(4, Math.min(window.innerHeight - 40, m.clientY - dy))
      panneau.style.left = x + 'px'; panneau.style.top = y + 'px'; panneau.style.right = 'auto'
    }
    const fin = () => { poignee.removeEventListener('pointermove', bouge); poignee.removeEventListener('pointerup', fin); poignee.removeEventListener('pointercancel', fin) }
    poignee.addEventListener('pointermove', bouge)
    poignee.addEventListener('pointerup', fin)
    poignee.addEventListener('pointercancel', fin)
  })
}

/** Le panneau garde un bout dans l'écran quand la fenêtre change de taille */
function rentrerDansLEcran(p: HTMLElement) {
  if (p.hidden || !p.style.left) return
  const r = p.getBoundingClientRect()
  p.style.left = Math.max(4, Math.min(window.innerWidth - r.width - 4, r.left)) + 'px'
  p.style.top = Math.max(4, Math.min(window.innerHeight - 40, r.top)) + 'px'
}

// ---------- Le rideau ----------
class Rideau {
  readonly el = el('div', 'rideau')
  private haut = 0

  constructor(racine: HTMLElement, private hauteurBarre: () => number) {
    this.el.hidden = true
    this.el.setAttribute('role', 'region'); this.el.setAttribute('aria-label', 'Rideau')
    const poignee = el('div', 'rideau-poignee')
    poignee.innerHTML = icone('rideau-tirer') + '<span>Glisser pour dévoiler</span>'
    const mot = el('div', 'rideau-mot', 'La suite est cachée : faites glisser le rideau vers le bas')
    const fermer = boutonIcone('fermer', 'Retirer le rideau', 'rideau-fermer', () => this.fermer())
    this.el.append(poignee, mot, fermer)
    racine.appendChild(this.el)
    // Glisser le rideau, par sa poignée ou n'importe où sur lui
    this.el.addEventListener('pointerdown', e => {
      if ((e.target as HTMLElement).closest('button')) return
      e.preventDefault()
      const y0 = e.clientY, h0 = this.haut
      try { this.el.setPointerCapture(e.pointerId) } catch { /* sans capture */ }
      this.el.classList.add('tire')
      const bouge = (m: PointerEvent) => this.placer(h0 + m.clientY - y0)
      const fin = () => {
        this.el.classList.remove('tire')
        this.el.removeEventListener('pointermove', bouge); this.el.removeEventListener('pointerup', fin); this.el.removeEventListener('pointercancel', fin)
      }
      this.el.addEventListener('pointermove', bouge)
      this.el.addEventListener('pointerup', fin)
      this.el.addEventListener('pointercancel', fin)
    })
    // La molette le fait descendre ou remonter, sans faire défiler la page
    this.el.addEventListener('wheel', e => { e.preventDefault(); this.placer(this.haut + (e.deltaMode === 1 ? e.deltaY * 16 : e.deltaY)) }, { passive: false })
    this.el.addEventListener('contextmenu', e => e.preventDefault())
    window.addEventListener('resize', () => { if (!this.el.hidden) this.placer(this.haut) })
  }

  get ouvert() { return !this.el.hidden }

  ouvrir() {
    this.el.hidden = false
    this.placer(this.hauteurBarre())
  }

  fermer() { this.el.hidden = true }

  basculer() { if (this.ouvert) this.fermer(); else this.ouvrir() }

  /** Le bord du haut du rideau, entre le bas de la barre du haut et le bas
   *  de l'écran (sa poignée reste toujours à prendre) */
  private placer(y: number) {
    this.haut = Math.round(Math.max(this.hauteurBarre(), Math.min(window.innerHeight - 56, y)))
    this.el.style.top = this.haut + 'px'
  }
}

// ---------- Le minuteur ----------
const DUREES = [1, 3, 5, 10]

class Minuteur {
  readonly el = el('div', 'panneau-classe minuteur')
  private affichage = el('div', 'minuteur-temps', '05:00')
  private jauge = el('i')
  private boutonPause: HTMLButtonElement
  private boutonSon: HTMLButtonElement
  private titre = el('span', 'panneau-titre', 'Minuteur')
  private durees = new Map<number, HTMLButtonElement>()
  private saisie = el('input', 'minuteur-saisie')
  private duree = 5 * 60_000
  /** L'heure de la fin quand il tourne, le temps qui reste quand il est arrêté */
  private fin: number | null = null
  private reste = 5 * 60_000
  private tic: ReturnType<typeof setInterval> | null = null
  private son = lire(CLE_SON) !== 'non'
  private audio: AudioContext | null = null

  constructor(racine: HTMLElement, private dire: (t: string) => void) {
    this.el.hidden = true
    this.el.setAttribute('role', 'timer'); this.el.setAttribute('aria-label', 'Minuteur')
    const tete = el('div', 'panneau-tete')
    this.boutonSon = boutonIcone('son', '', 'minuteur-son', () => this.basculerSon())
    tete.append(this.titre, this.boutonSon, boutonIcone('fermer', 'Fermer le minuteur', 'panneau-fermer', () => this.fermer()))
    const jauge = el('div', 'minuteur-jauge'); jauge.appendChild(this.jauge)
    const choix = el('div', 'minuteur-durees')
    for (const d of DUREES) {
      const b = boutonTexte(`${d} min`, 'minuteur-duree', () => this.lancer(d * 60_000))
      this.durees.set(d * 60_000, b); choix.appendChild(b)
    }
    const autre = boutonTexte('…', 'minuteur-duree', () => { saisieLigne.hidden = !saisieLigne.hidden; if (!saisieLigne.hidden) this.saisie.focus() })
    autre.title = 'Une autre durée'; autre.setAttribute('aria-label', 'Une autre durée')
    choix.appendChild(autre)
    const saisieLigne = el('form', 'minuteur-autre')
    saisieLigne.hidden = true
    this.saisie.type = 'text'; this.saisie.inputMode = 'decimal'; this.saisie.placeholder = 'ex. 7 ou 2:30'
    this.saisie.setAttribute('aria-label', 'Durée en minutes (ou minutes:secondes)')
    saisieLigne.append(this.saisie, boutonTexte('Lancer', 'principal petit', () => saisieLigne.requestSubmit()))
    saisieLigne.addEventListener('submit', e => {
      e.preventDefault()
      const ms = lireDuree(this.saisie.value)
      if (ms === null) { this.dire('Durée non comprise : tapez des minutes (7, 2,5) ou minutes:secondes (2:30)'); this.saisie.select(); return }
      saisieLigne.hidden = true; this.saisie.value = ''
      this.lancer(ms)
    })
    const actions = el('div', 'minuteur-actions')
    this.boutonPause = boutonTexte('Pause', 'secondaire petit', () => this.pauseOuReprise())
    actions.append(this.boutonPause, boutonTexte('Recommencer', 'secondaire petit', () => this.lancer(this.duree)))
    this.el.append(tete, this.affichage, jauge, choix, saisieLigne, actions)
    racine.appendChild(this.el)
    deplacable(this.el, tete)
    window.addEventListener('resize', () => rentrerDansLEcran(this.el))
    this.majSon()
    this.afficher()
  }

  get ouvert() { return !this.el.hidden }

  ouvrir() {
    this.el.hidden = false
    this.afficher()
  }

  fermer() {
    this.el.hidden = true
    this.arreter()
    this.reste = this.duree
    this.el.classList.remove('fini')
    this.afficher()
  }

  basculer() { if (this.ouvert) this.fermer(); else this.ouvrir() }

  private lancer(ms: number) {
    this.duree = ms; this.reste = ms
    this.el.classList.remove('fini')
    this.fin = performance.now() + ms
    this.demarrerTic()
    // Le premier son se prépare dans le geste (les navigateurs ne laissent
    // jouer un son qu'après un clic)
    if (this.son) this.preparerAudio()
    this.afficher()
  }

  private pauseOuReprise() {
    if (this.fin !== null) { this.reste = Math.max(0, this.fin - performance.now()); this.arreter() }
    else if (this.reste > 0) { this.fin = performance.now() + this.reste; this.demarrerTic() }
    else { this.lancer(this.duree); return }
    this.afficher()
  }

  private demarrerTic() {
    if (this.tic === null) this.tic = setInterval(() => this.afficher(), 200)
  }

  private arreter() {
    this.fin = null
    if (this.tic !== null) { clearInterval(this.tic); this.tic = null }
  }

  private afficher() {
    const reste = this.fin !== null ? this.fin - performance.now() : this.reste
    if (this.fin !== null && reste <= 0) { this.reste = 0; this.arreter(); this.sonner() }
    const r = Math.max(0, this.fin !== null ? reste : this.reste)
    this.affichage.textContent = formaterTemps(r)
    this.jauge.style.width = (this.duree ? 100 * r / this.duree : 0) + '%'
    this.boutonPause.textContent = this.fin !== null ? 'Pause' : this.reste > 0 && this.reste < this.duree ? 'Reprendre' : 'Lancer'
    for (const [d, b] of this.durees) b.setAttribute('aria-pressed', String(d === this.duree))
  }

  /** La fin : le cadre clignote en rouge et, si le son est permis, trois notes */
  private sonner() {
    this.el.classList.remove('fini')
    void this.el.offsetWidth
    this.el.classList.add('fini')
    this.titre.textContent = 'Le temps est écoulé'
    setTimeout(() => { this.titre.textContent = 'Minuteur' }, 8000)
    if (!this.son) return
    const a = this.preparerAudio()
    if (!a) return
    const t0 = a.currentTime + 0.05
    ;[0, 0.35, 0.7].forEach((d, i) => {
      const o = a.createOscillator(), g = a.createGain()
      o.type = 'sine'; o.frequency.value = i === 2 ? 1046.5 : 880
      g.gain.setValueAtTime(0.0001, t0 + d)
      g.gain.exponentialRampToValueAtTime(0.3, t0 + d + 0.02)
      g.gain.exponentialRampToValueAtTime(0.0001, t0 + d + 0.3)
      o.connect(g).connect(a.destination)
      o.start(t0 + d); o.stop(t0 + d + 0.32)
    })
  }

  private preparerAudio(): AudioContext | null {
    try {
      const C = window.AudioContext ?? (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext
      if (!C) return null
      this.audio ??= new C()
      if (this.audio.state === 'suspended') void this.audio.resume()
      return this.audio
    } catch { return null }
  }

  private basculerSon() {
    this.son = !this.son
    ecrire(CLE_SON, this.son ? 'oui' : 'non')
    if (this.son) this.preparerAudio()
    this.majSon()
  }

  private majSon() {
    const t = this.son ? 'Son à la fin : activé (couper)' : 'Son à la fin : coupé (activer)'
    this.boutonSon.innerHTML = icone(this.son ? 'son' : 'son-coupe')
    this.boutonSon.title = t; this.boutonSon.setAttribute('aria-label', t)
    this.boutonSon.setAttribute('aria-pressed', String(!this.son))
  }
}

// ---------- Le tirage au sort ----------
interface ListeDeClasse { noms: string[]; passes: string[] }

function lireListeDeClasse(cle: string): ListeDeClasse {
  try {
    const o = JSON.parse(lire(PREFIXE_TIRAGE + cle) ?? 'null') as unknown
    if (o && typeof o === 'object') {
      const { noms, passes } = o as Record<string, unknown>
      const chaines = (x: unknown) => Array.isArray(x) ? x.filter((n): n is string => typeof n === 'string') : []
      return { noms: chaines(noms), passes: chaines(passes) }
    }
  } catch { /* une liste abîmée : on repart d'une liste vide */ }
  return { noms: [], passes: [] }
}

class Tirage {
  readonly el = el('div', 'panneau-classe tirage')
  private titre = el('span', 'panneau-titre', 'Tirage au sort')
  private vueTirage = el('div', 'tirage-vue')
  private vueListe = el('div', 'tirage-vue')
  private nom = el('div', 'tirage-nom', '')
  private reste = el('div', 'tirage-reste', '')
  private deja = el('div', 'tirage-deja')
  private texte = el('textarea', 'tirage-liste')
  private boutonTirer: HTMLButtonElement
  private cle = SANS_CLASSE
  private liste: ListeDeClasse = { noms: [], passes: [] }
  private animation: ReturnType<typeof setInterval> | null = null

  constructor(racine: HTMLElement, private hote: HoteOutils) {
    this.el.hidden = true
    this.el.setAttribute('role', 'dialog'); this.el.setAttribute('aria-label', 'Tirage au sort')
    const tete = el('div', 'panneau-tete')
    tete.append(this.titre, boutonIcone('fermer', 'Fermer le tirage au sort', 'panneau-fermer', () => this.fermer()))
    // La vue du tirage
    this.nom.setAttribute('aria-live', 'polite')
    const b = el('div', 'tirage-boutons')
    this.boutonTirer = boutonTexte('Tirer un nom', 'principal', () => this.tirer())
    b.append(this.boutonTirer, boutonTexte('La liste', 'secondaire', () => this.montrer('liste')))
    this.vueTirage.append(this.nom, this.reste, this.deja, b)
    // La vue de la liste
    const aide = el('p', 'tirage-aide', 'Un prénom par ligne. Vous pouvez coller la liste depuis un tableur.')
    this.texte.setAttribute('aria-label', 'Les élèves, un par ligne'); this.texte.spellcheck = false
    const prive = el('p', 'tirage-prive')
    prive.innerHTML = icone('cadenas') + '<span>Cette liste reste sur cet ordinateur. Elle n\'est jamais envoyée sur le Drive, ni dans le replay, ni dans les fichiers du classeur.</span>'
    const b2 = el('div', 'tirage-boutons')
    b2.append(boutonTexte('Enregistrer', 'principal', () => this.enregistrer()), boutonTexte('Recommencer le tour', 'secondaire', () => this.recommencer()))
    this.vueListe.append(aide, this.texte, prive, b2)
    this.el.append(tete, this.vueTirage, this.vueListe)
    racine.appendChild(this.el)
    deplacable(this.el, tete)
    window.addEventListener('resize', () => rentrerDansLEcran(this.el))
  }

  get ouvert() { return !this.el.hidden }

  async ouvrir() {
    this.el.hidden = false
    let classe: { id: string; nom: string } | null = null
    try { classe = await this.hote.classe() } catch { /* sans la bibliothèque */ }
    this.cle = classe?.id ?? SANS_CLASSE
    this.titre.textContent = classe ? `Tirage au sort · ${classe.nom}` : 'Tirage au sort'
    this.liste = lireListeDeClasse(this.cle)
    this.nom.textContent = ''
    this.montrer(this.liste.noms.length ? 'tirage' : 'liste')
  }

  fermer() {
    this.arreterAnimation()
    this.el.hidden = true
  }

  basculer() { if (this.ouvert) this.fermer(); else void this.ouvrir() }

  private montrer(vue: 'tirage' | 'liste') {
    this.vueTirage.hidden = vue !== 'tirage'
    this.vueListe.hidden = vue !== 'liste'
    if (vue === 'liste') { this.texte.value = this.liste.noms.join('\n'); this.texte.focus() }
    else this.majTirage()
  }

  private majTirage() {
    const { noms, passes } = this.liste
    const passesIci = passes.filter(n => noms.includes(n))
    const r = noms.length - passesIci.length
    this.reste.textContent = !noms.length ? 'Aucun élève dans la liste'
      : r === 0 ? 'Tout le monde est passé : le prochain tirage commence un nouveau tour'
        : r === noms.length ? `${noms.length} élève${noms.length > 1 ? 's' : ''} dans la liste`
          : `Encore ${r} élève${r > 1 ? 's' : ''} avant de recommencer`
    this.deja.replaceChildren(...passesIci.map(n => el('span', '', n)))
    this.boutonTirer.disabled = !noms.length
  }

  private tirer() {
    const r = tirer(this.liste.noms, this.liste.passes)
    if (!r) return
    this.liste.passes = r.passes
    this.sauver()
    this.arreterAnimation()
    const noms = this.liste.noms
    const montrerLeNom = () => { this.nom.textContent = r.nom; this.nom.classList.remove('defile'); this.majTirage(); this.boutonTirer.disabled = false }
    if (mouvementReduit() || noms.length < 2) { montrerLeNom(); return }
    // Les prénoms défilent un court instant, puis s'arrêtent sur l'élève tiré
    let k = 0
    this.boutonTirer.disabled = true
    this.nom.classList.add('defile')
    this.animation = setInterval(() => {
      if (++k >= 12) { this.arreterAnimation(); montrerLeNom(); return }
      this.nom.textContent = noms[Math.floor(Math.random() * noms.length)]
    }, 70)
  }

  private arreterAnimation() {
    if (this.animation !== null) { clearInterval(this.animation); this.animation = null }
  }

  private enregistrer() {
    this.liste.noms = lireListe(this.texte.value)
    this.sauver()
    this.hote.message(this.liste.noms.length ? `Liste enregistrée : ${this.liste.noms.length} élève${this.liste.noms.length > 1 ? 's' : ''}, sur cet ordinateur seulement` : 'La liste est vide')
    this.montrer(this.liste.noms.length ? 'tirage' : 'liste')
  }

  private recommencer() {
    this.liste.passes = []
    this.sauver()
    this.hote.message('Nouveau tour : tout le monde peut être tiré')
    this.nom.textContent = ''
    if (this.liste.noms.length) this.montrer('tirage')
  }

  private sauver() {
    ecrire(PREFIXE_TIRAGE + this.cle, this.liste.noms.length || this.liste.passes.length ? JSON.stringify(this.liste) : null)
  }
}

// ---------- Le menu ----------
export class OutilsDeClasse {
  readonly rideau: Rideau
  readonly minuteur: Minuteur
  readonly tirage: Tirage

  constructor(racine: HTMLElement, private hote: HoteOutils, hauteurBarre: () => number) {
    this.rideau = new Rideau(racine, hauteurBarre)
    this.minuteur = new Minuteur(racine, t => hote.message(t))
    this.tirage = new Tirage(racine, hote)
  }

  /** Les entrées du menu : le texte, l'aide, l'icône, l'action, et si l'outil est là */
  entrees(): { id: string; texte: string; aide: string; icone: string; faire: () => void; coche: boolean; touche?: string }[] {
    const h = this.hote
    return [
      { id: 'rideau', texte: 'Rideau', aide: 'Cacher, puis dévoiler petit à petit', icone: 'rideau', faire: () => this.rideau.basculer(), coche: this.rideau.ouvert },
      { id: 'laser', texte: 'Pointeur laser', aide: 'Montrer sans écrire', icone: 'laser', faire: () => h.basculerLaser(), coche: h.laser() },
      { id: 'minuteur', texte: 'Minuteur', aide: '1, 3, 5, 10 min ou au choix', icone: 'sablier', faire: () => this.minuteur.basculer(), coche: this.minuteur.ouvert },
      { id: 'tirage', texte: 'Tirage au sort', aide: 'Un élève de la classe', icone: 'de', faire: () => this.tirage.basculer(), coche: this.tirage.ouvert },
      { id: 'aide', texte: 'Aide et raccourcis', aide: 'Les gestes et les touches', icone: 'aide', faire: () => h.ouvrirAide(), coche: false, touche: '?' },
    ]
  }
}
