// =============================================================
// LE CONSTRUCTEUR : JOUER UN PROGRAMME DE CONSTRUCTION
// Étape par étape, à la main (→ ou la télécommande de présentation) ou
// d'un trait : la consigne s'affiche en grand, les instruments se
// déplacent tout seuls et font le geste — la règle se couche, le compas
// s'écarte puis tourne — ou, sans instruments, le trait se dessine seul.
//
// Ce qui est construit devient de vraies figures du tableau : on peut
// ensuite les prendre, les nommer, les transformer. Revenir d'une étape
// retire ce qu'elle avait posé.
// =============================================================
import type { App } from './app'
import type { Etape, Geste, P, Programme } from './construction'
import { compiler, EXEMPLES } from './construction'
import type { EtatInstrument, NomInstrument } from './instruments'
import { etatParDefaut } from './instruments'
import type { Figure } from './types'
import { CM } from './types'

const CLE_INSTRUMENTS = 'mem-construction-instruments'
const CLE_EXISTANTS = 'mem-construction-existants'
const AIDE = { couleur: '#7d8799', taille: 1.6 }        // traits de construction

const pause = (ms: number) => new Promise(r => setTimeout(r, ms))
const html = (t: string) => t.replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]!))

export class Constructeur {
  private panneau: HTMLDivElement
  private bandeau: HTMLDivElement
  private champ!: HTMLTextAreaElement
  private liste!: HTMLOListElement
  private erreurs!: HTMLDivElement
  private programme: Programme | null = null
  private messages: string[] = []                 // ce que le dernier essai n'a pas compris
  private faites = 0                              // étapes déjà construites
  private posees: string[][] = []                 // ce que chaque étape a posé
  private enCours = false
  private enBoucle = false
  private jeton = 0                               // change quand on interrompt
  private avecInstruments = true
  /** Construire à partir des points déjà sur la page, ou à part */
  private existants = true
  private poses = new Map<NomInstrument, EtatInstrument>()
  private clavier = (e: KeyboardEvent) => this.touche(e)

  constructor(private app: App, racine: HTMLElement, private message: (t: string) => void) {
    try {
      this.avecInstruments = localStorage.getItem(CLE_INSTRUMENTS) !== 'non'
      this.existants = localStorage.getItem(CLE_EXISTANTS) !== 'non'
    } catch { /* navigateur sans mémoire : le réglage vaut pour cette fois */ }
    this.panneau = document.createElement('div')
    this.panneau.className = 'panneau-construction'
    this.panneau.setAttribute('role', 'dialog')
    this.panneau.setAttribute('aria-label', 'Programme de construction')
    this.panneau.hidden = true
    this.bandeau = document.createElement('div')
    this.bandeau.className = 'consigne-construction'
    this.bandeau.setAttribute('aria-live', 'polite')
    this.bandeau.hidden = true
    racine.append(this.panneau, this.bandeau)
    this.construire()
  }

  get ouvert() { return !this.panneau.hidden }

  get instruments() { return this.avecInstruments }
  set instruments(v: boolean) {
    this.avecInstruments = v
    try { localStorage.setItem(CLE_INSTRUMENTS, v ? 'oui' : 'non') } catch { /* navigateur sans mémoire : le réglage vaut pour cette fois */ }
    const c = this.panneau.querySelector('.instruments input') as HTMLInputElement | null
    if (c) c.checked = v
  }

  /** Joue des étapes déjà prêtes (l'image d'une figure, par exemple) */
  jouerEtapes(etapes: Etape[], titre: string) {
    this.interrompre()
    this.ouvrir()
    this.champ.value = titre
    this.messages = []
    this.programme = { etapes, erreurs: [] }
    this.faites = 0; this.posees = []
    this.afficher()
    this.suivante()
  }

  ouvrir() {
    this.panneau.hidden = false
    this.noter()
    window.addEventListener('keydown', this.clavier, true)
    this.champ.focus()
  }

  fermer() {
    this.interrompre()
    if (this.app.placement) this.app.echap()
    this.panneau.hidden = true
    this.bandeau.hidden = true
    window.removeEventListener('keydown', this.clavier, true)
    this.programme = null; this.faites = 0; this.posees = []
    this.app.rendu.instrumentsAnimes = []
    this.app.rendu.apercu = null; this.app.rendu.mesure = null
    this.app.rendu.redessinerInstruments()
    this.afficher()
  }

  // ---------- Le panneau ----------
  private construire() {
    const p = this.panneau
    p.innerHTML = `
      <div class="tete"><h2>Construction</h2><button type="button" class="fermer" aria-label="Fermer" title="Fermer">×</button></div>
      <label class="exemples"><span>Exemples</span><select><option value="">Choisir…</option>${EXEMPLES.map((e, i) => `<option value="${i}">${html(e.nom)}</option>`).join('')}</select></label>
      <textarea spellcheck="false" rows="5" aria-label="Programme de construction" placeholder="Une consigne par ligne, comme dans un manuel :
Trace un segment [AB] de 6 cm.
Trace la médiatrice de [AB]."></textarea>
      <div class="erreurs" role="status"></div>
      <label class="interrupteur instruments"><input type="checkbox"><span>Avec les instruments</span></label>
      <label class="interrupteur existants"><input type="checkbox"><span>Utiliser les objets existants</span></label>
      <p class="note-existants"></p>
      <div class="actions-construction">
        <button type="button" class="principal pas">Pas à pas</button>
        <button type="button" class="secondaire tout">Tout construire</button>
      </div>
      <ol class="etapes"></ol>
      <div class="commandes" hidden>
        <button type="button" class="secondaire recommencer" title="Tout retirer et recommencer">⏮</button>
        <button type="button" class="secondaire precedente" title="Étape précédente (←)">◀</button>
        <button type="button" class="principal suivante" title="Étape suivante (→, Espace)">Suivante ▶</button>
        <button type="button" class="secondaire boucle" title="Jouer toutes les étapes">⏩</button>
      </div>
      <details class="aide-phrases"><summary>Ce que je sais construire</summary><ul>
        <li>Place les points A, B, C.</li><li>Trace un segment [AB] de 5 cm.</li>
        <li>Trace le cercle de centre O et de rayon 3 cm (ou passant par A).</li>
        <li>Trace la médiatrice de [AB]. Place le milieu I de [AB].</li>
        <li>Construis un triangle ABC tel que AB = 6 cm, AC = 5 cm et BC = 4 cm.</li>
        <li>Construis un triangle équilatéral ABC de côté 5 cm.</li>
        <li>Construis un carré ABCD de côté 4 cm. Un rectangle ABCD de 6 cm sur 3 cm.</li>
        <li>Trace la perpendiculaire (ou la parallèle) à (AB) passant par C.</li>
        <li>Trace un angle BAC de 50°. Trace la bissectrice de l'angle ABC.</li>
        <li>Construis un hexagone régulier ABCDEF de côté 3 cm.</li>
      </ul><p>Les points déjà nommés sur la page peuvent servir.</p></details>`
    const q = <T extends HTMLElement>(s: string) => p.querySelector(s) as T
    this.champ = q('textarea'); this.liste = q('.etapes'); this.erreurs = q('.erreurs')
    q('.fermer').addEventListener('click', () => this.fermer())
    const ex = q<HTMLSelectElement>('.exemples select')
    ex.addEventListener('change', () => {
      if (ex.value === '') return
      this.champ.value = EXEMPLES[Number(ex.value)].texte; ex.value = ''
      this.oublier()
    })
    this.champ.addEventListener('input', () => { this.messages = []; this.oublier(); this.afficher() })
    const exist = q<HTMLInputElement>('.existants input')
    exist.checked = this.existants
    exist.addEventListener('change', () => {
      this.existants = exist.checked
      try { localStorage.setItem(CLE_EXISTANTS, exist.checked ? 'oui' : 'non') } catch { /* navigateur sans mémoire : le réglage vaut pour cette fois */ }
      this.oublier(); this.noter()
    })
    this.noter()
    const coche = q<HTMLInputElement>('.instruments input')
    coche.checked = this.avecInstruments
    coche.addEventListener('change', () => {
      this.avecInstruments = coche.checked
      try { localStorage.setItem(CLE_INSTRUMENTS, coche.checked ? 'oui' : 'non') } catch { /* navigateur sans mémoire : le réglage vaut pour cette fois */ }
      if (!coche.checked) { this.app.rendu.instrumentsAnimes = []; this.app.rendu.redessinerInstruments() }
    })
    q('.pas').addEventListener('click', () => this.lancer(false))
    q('.tout').addEventListener('click', () => this.lancer(true))
    q('.suivante').addEventListener('click', () => this.suivante())
    q('.precedente').addEventListener('click', () => this.precedente())
    q('.recommencer').addEventListener('click', () => this.recommencer())
    q('.boucle').addEventListener('click', () => this.enBoucle ? this.interrompre() : this.boucle())
  }

  /** Le programme a changé : ce qui a été construit reste, on repartira de zéro */
  private oublier() {
    if (!this.programme) return
    this.interrompre()
    this.programme = null; this.faites = 0; this.posees = []
    this.afficher()
  }

  /** Démarre : d'abord, si on l'a demandé, choisir où poser la construction */
  private lancer(tout: boolean) {
    const go = (ancre?: P) => { if (this.preparer(ancre)) { if (tout) this.boucle(); else this.suivante() } }
    if (this.programme) return go()
    const texte = this.champ.value.trim()
    if (!texte) return go()
    const connus = this.connus()
    // Rien à placer si le programme ne s'appuie que sur des points déjà là
    const a = compiler(texte, connus, { x: 0, y: 0 }), b = compiler(texte, connus, { x: 1000, y: 1000 })
    if (!a.etapes.length || JSON.stringify(a.etapes) === JSON.stringify(b.etapes)) return go()
    this.bandeau.hidden = false
    this.bandeau.innerHTML = '<span class="numero">⌖</span>Clique sur la page là où la construction doit commencer. Échap pour annuler.'
    const fin = () => { this.app.rendu.fantomes = []; this.app.rendu.redessinerDirect(); this.bandeau.hidden = true }
    this.app.placement = {
      bouge: w => { this.app.rendu.fantomes = fantomes(compiler(texte, connus, w), this.app); this.app.rendu.redessinerDirect() },
      clic: w => { fin(); go(w) },
      annuler: () => fin(),
    }
    this.app.placement.bouge(this.ancreParDefaut())
  }

  /** Les points de la page dont le programme peut se servir (aucun : à part) */
  private connus(): Map<string, P> {
    return this.existants ? this.app.pointsNommes() : new Map()
  }

  /** Sous la case : ce que « objets existants » veut dire, ici et maintenant */
  noter() {
    const n = this.app.pointsNommes()
    const el = this.panneau.querySelector('.note-existants') as HTMLElement
    el.textContent = this.existants
      ? (n.size ? `Les points ${[...n.keys()].slice(0, 12).join(', ')}${n.size > 12 ? '…' : ''} de la page peuvent servir.` : 'Aucun point nommé sur la page pour l\'instant.')
      : 'La construction se fait à part, sans tenir compte de ce qui est déjà tracé.'
  }

  /** Dans la partie gauche de l'écran : le panneau est à droite */
  private ancreParDefaut(): P {
    const r = this.app.rendu, cam = this.app.cam
    return cam.versMonde(Math.max(140, r.l * 0.3 - 3 * CM * cam.z), r.h * 0.62)
  }

  /** Compile le programme (s'il ne l'est pas déjà) */
  private preparer(ancre?: P): boolean {
    if (this.programme && this.faites < this.programme.etapes.length) return true
    const texte = this.champ.value.trim()
    if (!texte) { this.message('Écris d\'abord le programme, ou choisis un exemple.'); return false }
    const prog = compiler(texte, this.connus(), ancre ?? this.ancreParDefaut())
    this.messages = [...prog.erreurs]
    // Les points manquent ici, mais ils sont sur la page : on le dit
    if (!this.existants && prog.erreurs.some(e => /n'existen?t? pas/.test(e)) && this.app.pointsNommes().size) {
      this.messages.push('Ces points sont déjà sur la page : coche « Utiliser les objets existants » pour construire à partir d\'eux.')
    }
    this.faites = 0; this.posees = []
    // Rien de compris : on montre pourquoi, sans lancer de construction vide
    this.programme = prog.etapes.length ? prog : null
    this.afficher()
    return !!this.programme
  }

  private afficher() {
    const prog = this.programme
    this.erreurs.innerHTML = this.messages.map(e => `<p>${html(e)}</p>`).join('')
    this.liste.innerHTML = prog ? prog.etapes.map((e, i) =>
      `<li class="${i < this.faites ? 'faite' : i === this.faites ? 'courante' : ''}">${html(e.consigne)}</li>`).join('') : ''
    this.liste.querySelector('.courante, .faite:last-child')?.scrollIntoView?.({ block: 'nearest' })
    const cmd = this.panneau.querySelector('.commandes') as HTMLElement
    cmd.hidden = !prog
    ;(this.panneau.querySelector('.actions-construction') as HTMLElement).hidden = !!prog
    const fini = !!prog && this.faites >= prog.etapes.length
    const suiv = this.panneau.querySelector('.suivante') as HTMLButtonElement
    suiv.disabled = fini || this.enCours
    suiv.textContent = fini ? 'Construction terminée ✓' : 'Suivante ▶'
    ;(this.panneau.querySelector('.precedente') as HTMLButtonElement).disabled = !prog || this.faites === 0 || this.enCours
    ;(this.panneau.querySelector('.boucle') as HTMLButtonElement).textContent = this.enBoucle ? '⏸' : '⏩'
  }

  private montrerConsigne(i: number) {
    const e = this.programme?.etapes[i]
    this.bandeau.hidden = !e
    if (e) this.bandeau.innerHTML = `<span class="numero">${i + 1}</span>${html(e.consigne)}`
  }

  // ---------- Jouer ----------
  private async suivante() {
    const prog = this.programme
    if (!prog || this.enCours || this.faites >= prog.etapes.length) return
    this.enCours = true
    const i = this.faites
    this.montrerConsigne(i)
    this.afficher()
    const jeton = this.jeton
    const ids: string[] = []
    this.app.tableau.nouveauGeste()
    try {
      for (const g of prog.etapes[i].gestes) {
        if (jeton !== this.jeton) break
        await this.jouer(g, ids, jeton)
      }
    } finally {
      this.posees[i] = ids
      if (jeton === this.jeton) this.faites = i + 1
      // Construction terminée : on range les instruments
      if (this.faites >= prog.etapes.length) setTimeout(() => {
        if (this.programme === prog && this.faites >= prog.etapes.length) { this.app.rendu.instrumentsAnimes = []; this.poses.clear(); this.app.rendu.redessinerInstruments() }
      }, 900)
      this.enCours = false
      this.app.rendu.apercu = null; this.app.rendu.mesure = null
      this.app.rendu.redessinerDirect()
      this.afficher()
    }
  }

  private async boucle() {
    this.enBoucle = true; this.afficher()
    while (this.enBoucle && this.programme && this.faites < this.programme.etapes.length) {
      await this.suivante()
      if (this.enBoucle) await pause(this.avecInstruments ? 700 : 350)
    }
    this.enBoucle = false; this.afficher()
  }

  private interrompre() {
    this.enBoucle = false
    this.jeton++
  }

  private precedente() {
    if (!this.programme || this.enCours || this.faites === 0) return
    this.faites--
    this.app.tableau.nouveauGeste()
    this.app.tableau.supprimer(this.app.page, this.posees[this.faites] ?? [])
    this.posees.length = this.faites
    this.montrerConsigne(this.faites - 1)
    this.afficher()
  }

  private recommencer() {
    this.interrompre()
    const tout = this.posees.flat()
    if (tout.length) { this.app.tableau.nouveauGeste(); this.app.tableau.supprimer(this.app.page, tout) }
    this.faites = 0; this.posees = []
    this.programme = null
    this.bandeau.hidden = true
    this.app.rendu.instrumentsAnimes = []; this.app.rendu.redessinerInstruments()
    this.afficher()
  }

  private touche(e: KeyboardEvent) {
    if (this.app.placement && e.key === 'Escape') { e.preventDefault(); e.stopPropagation(); this.app.echap(); return }
    if ((e.target as HTMLElement).closest('textarea, input, select')) { if (e.key === 'Escape') this.fermer(); return }
    const actions: Record<string, () => void> = {
      ArrowRight: () => this.lancer(false), PageDown: () => this.lancer(false), ' ': () => this.lancer(false),
      ArrowLeft: () => this.precedente(), PageUp: () => this.precedente(),
      Escape: () => this.fermer(),
    }
    const a = actions[e.key]
    if (!a) return
    e.preventDefault(); e.stopPropagation()
    a()
  }

  // ---------- Les gestes ----------
  private duree(ms: number) { return this.avecInstruments ? ms : ms * 0.45 }

  /** t de 0 à 1 sur `ms` millisecondes, en douceur */
  private animer(ms: number, jeton: number, f: (t: number) => void): Promise<void> {
    return new Promise(fin => {
      const debut = performance.now()
      const pas = () => {
        if (jeton !== this.jeton) return fin()
        const t = Math.min(1, (performance.now() - debut) / ms)
        f(t < 0.5 ? 2 * t * t : 1 - (-2 * t + 2) ** 2 / 2)
        if (t < 1) requestAnimationFrame(pas); else fin()
      }
      pas()
    })
  }

  /** Amène un instrument (montré) à sa pose, en glissant depuis la précédente */
  private async amener(nom: NomInstrument, cible: EtatInstrument, jeton: number) {
    if (!this.avecInstruments) return
    const depart = this.poses.get(nom) ?? { ...cible, x: cible.x - 3 * CM, y: cible.y + 3 * CM, a: cible.a - 0.3 }
    // Le plus court chemin en angle
    let da = cible.a - depart.a
    while (da > Math.PI) da -= 2 * Math.PI
    while (da < -Math.PI) da += 2 * Math.PI
    const loin = Math.hypot(cible.x - depart.x, cible.y - depart.y) + Math.abs(da) * 4 * CM
    await this.animer(Math.min(900, 250 + loin / CM * 25), jeton, t => {
      this.poserInstrument(nom, { x: depart.x + (cible.x - depart.x) * t, y: depart.y + (cible.y - depart.y) * t, a: depart.a + da * t, r: depart.r + (cible.r - depart.r) * t })
    })
    this.poserInstrument(nom, cible)
  }

  private poserInstrument(nom: NomInstrument, e: EtatInstrument) {
    this.poses.set(nom, e)
    // Seul l'instrument qui sert reste à l'écran, avec la règle si elle vient de servir
    this.app.rendu.instrumentsAnimes = [{ nom, etat: e, actif: null }]
    this.app.rendu.redessinerInstruments()
  }

  private async tracer(a: P, b: P, aide: boolean | undefined, ids: string[], jeton: number, mesure: boolean, poser = true, prolonge?: 'droite' | 'demi') {
    const r = this.app.rendu
    const l = Math.hypot(b.x - a.x, b.y - a.y)
    await this.animer(this.duree(Math.min(1300, 300 + l / CM * 70)), jeton, t => {
      const z = { x: a.x + (b.x - a.x) * t, y: a.y + (b.y - a.y) * t }
      r.apercu = this.app.nouvelleFigure({ type: 'polygone', ferme: false, pts: [a, z] }, aide ? AIDE : undefined)
      // Le crayon le long de la règle (ou de l'équerre) : la piste le note pour le replay
      if (this.avecInstruments) this.app.piste.trace(this.app.traceLe(r.apercu))
      r.mesure = mesure && !aide ? { texte: (Math.round(l * t / CM * 10) / 10).toString().replace('.', ',') + ' cm', x: z.x, y: z.y } : null
      r.redessinerDirect()
    })
    this.app.piste.trace(null)
    r.apercu = null; r.mesure = null
    if (jeton === this.jeton && poser) {
      const f = this.app.nouvelleFigure({ type: 'polygone', ferme: false, pts: [a, b] }, aide ? AIDE : undefined)
      if (prolonge && f.type === 'polygone') f.prolonge = prolonge
      ids.push(this.app.poserFigureSeule(f))
    }
  }

  /** Le centre des points de la construction en cours */
  private centreFigure(): P | null {
    const prog = this.programme
    if (!prog) return null
    const pts: P[] = []
    for (const e of prog.etapes) for (const g of e.gestes) if (g.k === 'point') pts.push(g.p)
    if (!pts.length) return null
    return { x: pts.reduce((a, p) => a + p.x, 0) / pts.length, y: pts.reduce((a, p) => a + p.y, 0) / pts.length }
  }

  private async jouer(g: Geste, ids: string[], jeton: number, poser = true) {
    const r = this.app.rendu
    switch (g.k) {
      case 'forme': {
        // L'image finale : ses côtés à la règle (ou son cercle au compas), puis
        // la vraie figure. Ses noms restent rangés (les points sont déjà là).
        for (const [a, b] of g.cotes ?? []) {
          if (jeton !== this.jeton) break
          await this.amener('regle', { x: a.x, y: a.y, a: Math.atan2(b.y - a.y, b.x - a.x), r: 0 }, jeton)
          await this.tracer(a, b, false, [], jeton, false, false)
        }
        if (g.cercle && jeton === this.jeton) {
          await this.jouer({ k: 'compas', c: g.cercle.c, r: g.cercle.r, a0: -Math.PI / 2, a1: 1.5 * Math.PI }, [], jeton, false)
        }
        if (jeton !== this.jeton) break
        const f = { ...g.f } as Figure
        if ((f.type === 'polygone' || f.type === 'cercle') && f.sommets) f.sommets = false
        ids.push(this.app.poserFigureSeule(f))
        break
      }
      case 'point': {
        const f = this.app.nouvelleFigure({ type: 'polygone', ferme: false, pts: [g.p] })
        f.sommets = !!g.nom; f.noms = [g.nom]
        if (g.lie) f.lie = g.lie
        if (!g.nom) f.stylePoints = [{ marque: 'croix' }]
        ids.push(this.app.poserFigureSeule(f))
        await pause(this.duree(220))
        break
      }
      case 'regle': {
        // La règle se couche du côté opposé à la figure, pour ne pas la cacher :
        // sinon on la pose depuis l'autre bout (son corps passe de l'autre côté)
        const c = this.centreFigure()
        const u = { x: g.b.x - g.a.x, y: g.b.y - g.a.y }
        const cote = c ? (c.x - g.a.x) * -u.y + (c.y - g.a.y) * u.x : -1      // > 0 : la figure est du côté du corps
        // Une demi-droite part toujours de son origine : on ne la retourne pas
        const [o, vers] = cote > 0 && g.prolonge !== 'demi' ? [g.b, g.a] : [g.a, g.b]
        await this.amener('regle', { x: o.x, y: o.y, a: Math.atan2(vers.y - o.y, vers.x - o.x), r: 0 }, jeton)
        // Le crayon part du zéro : la mesure lue est celle des graduations
        await this.tracer(o, vers, g.aide, ids, jeton, true, true, g.prolonge)
        break
      }
      case 'equerre': {
        // Le grand côté de l'angle droit le long du trait, le petit sur la droite
        await this.amener('equerre', { x: g.o.x, y: g.o.y, a: Math.atan2(g.w.y, g.w.x), r: 0 }, jeton)
        await this.tracer(g.a, g.b, g.aide, ids, jeton, true, true, g.prolonge)
        break
      }
      case 'rapporteur': {
        await this.amener('rapporteur', { x: g.o.x, y: g.o.y, a: Math.atan2(g.u.y, g.u.x), r: 0 }, jeton)
        r.mesure = { texte: g.angle + '°', x: g.marque.x, y: g.marque.y }; r.redessinerDirect()
        await pause(this.duree(500))
        const f = this.app.nouvelleFigure({ type: 'polygone', ferme: false, pts: [g.marque] }, AIDE)
        f.stylePoints = [{ marque: 'croix', taille: 1.4 }]
        if (jeton === this.jeton) ids.push(this.app.poserFigureSeule(f))
        await pause(this.duree(350))
        r.mesure = null
        break
      }
      case 'compas': {
        const depart = this.poses.get('compas') ?? etatParDefaut('compas', g.c)
        // 1. poser la pointe, 2. écarter, 3. tourner la tête
        await this.amener('compas', { x: g.c.x, y: g.c.y, a: g.a0, r: depart.r }, jeton)
        if (this.avecInstruments) {
          const r0 = depart.r
          await this.animer(450, jeton, t => {
            const e = { x: g.c.x, y: g.c.y, a: g.a0, r: r0 + (g.r - r0) * t }
            this.poserInstrument('compas', e)
            r.mesure = { texte: 'r = ' + (Math.round(e.r / CM * 10) / 10).toString().replace('.', ',') + ' cm', x: g.c.x + e.r * Math.cos(g.a0), y: g.c.y + e.r * Math.sin(g.a0) }
            r.redessinerDirect()
          })
          await pause(250)
        }
        r.mesure = null
        const balayage = g.a1 - g.a0
        const plein = Math.abs(balayage) >= 2 * Math.PI - 1e-6
        await this.animer(this.duree(Math.min(1800, 350 + Math.abs(balayage) * 260)), jeton, t => {
          const a = g.a0 + balayage * t
          if (this.avecInstruments) this.poserInstrument('compas', { x: g.c.x, y: g.c.y, a, r: g.r })
          const f = this.app.nouvelleFigure({ type: 'cercle', x: g.c.x, y: g.c.y, r: g.r }, g.aide ? AIDE : undefined)
          ;(f as Extract<Figure, { type: 'cercle' }>).arc = { a0: g.a0, a1: a }
          if (this.avecInstruments) this.app.piste.trace({ k: 'arc', x: g.c.x, y: g.c.y, r: g.r, a0: g.a0, a1: a, couleur: f.couleur, taille: f.taille })
          r.apercu = f; r.redessinerDirect()
        })
        this.app.piste.trace(null)
        r.apercu = null
        if (jeton !== this.jeton) break
        if (!poser) break
        const f = this.app.nouvelleFigure({ type: 'cercle', x: g.c.x, y: g.c.y, r: g.r }, g.aide ? AIDE : undefined)
        if (!plein) (f as Extract<Figure, { type: 'cercle' }>).arc = { a0: g.a0, a1: g.a1 }
        ids.push(this.app.poserFigureSeule(f))
        break
      }
    }
  }
}

export type { Etape }

/** La construction entière, en traits, pour la montrer avant de la poser */
function fantomes(prog: Programme, app: App): Figure[] {
  const r: Figure[] = []
  for (const e of prog.etapes) for (const g of e.gestes) {
    if (g.k === 'forme' && (g.f.type === 'polygone' || g.f.type === 'cercle')) r.push(g.f as Figure)
    else if (g.k === 'regle' || g.k === 'equerre') r.push(app.nouvelleFigure({ type: 'polygone', ferme: false, pts: [g.a, g.b] }, g.aide ? AIDE : undefined))
    else if (g.k === 'point') { const f = app.nouvelleFigure({ type: 'polygone', ferme: false, pts: [g.p] }); f.sommets = true; f.noms = [g.nom]; r.push(f) }
    else if (g.k === 'compas') {
      const f = app.nouvelleFigure({ type: 'cercle', x: g.c.x, y: g.c.y, r: g.r }, g.aide ? AIDE : undefined)
      if (Math.abs(g.a1 - g.a0) < 2 * Math.PI - 1e-6) (f as Extract<Figure, { type: 'cercle' }>).arc = { a0: g.a0, a1: g.a1 }
      r.push(f)
    }
  }
  return r
}
