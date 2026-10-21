// =============================================================
// LE FLASH D'AUTOMATISMES
// Il se joue sur une page de la séance, comme tout ce qu'on écrit : les
// questions sont des formules et des dessins ordinaires du tableau,
// groupés par question. Elles passent donc dans le replay, dans l'ordre
// où elles sont venues, avec ce que le professeur écrit par-dessus.
//
// 1. Le réglage (une fenêtre) : les niveaux, les thèmes, le nombre de
//    questions de chaque forme (par défaut 2 QCM, 2 questions directes et
//    1 question à trou), l'affichage. Rien n'est tiré pendant le réglage,
//    et rien n'en est montré : les élèves voient la fenêtre.
// 2. Le flash : sur la page du jour si elle est encore vide, sinon sur
//    une page neuve juste après. Une question à la fois, en grand au
//    milieu, qui va se ranger dans sa case à la fin de son temps (ou
//    avec →) ; ou toutes d'un coup. La minuterie et le numéro de la
//    question sont dans un bandeau, hors de la page.
// 3. La correction (à la fin du temps, ou C) : chaque réponse s'écrit en
//    vert sous sa question. « Nouveaux exemples » rejoue le même réglage
//    sur une nouvelle page, juste après.
// =============================================================
import katex from 'katex'
import type { App } from './app'
import type { Automatisme, Composition, QuestionFlash } from './automatismes'
import { COMPOSITION_PAR_DEFAUT, NIVEAUX, themesDe, tirerFlash } from './automatismes'
import type { Formule, ImageForme } from './types'
import { uid } from './types'
import { fermerSurLeFond } from './dialogue'

const html = (t: string) => t.replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]!))
const mmss = (s: number) => { const t = Math.max(0, Math.ceil(s - 1e-6)); return `${Math.floor(t / 60)}:${String(t % 60).padStart(2, '0')}` }
const LETTRES = ['A', 'B', 'C', 'D']
/** Le vert de la correction : celui du stylo */
const VERT = '#1e8a4c'
const MAX_PAR_FORME = 10

/** Ce qu'on règle, gardé sur l'appareil : pour chaque classeur, et le
 *  dernier réglage (pour un classeur qui n'en a pas encore) */
const CLE = 'mem-flash'
const cleDuClasseur = (id: string) => `mem-flash-${id}`

export interface ReglagesFlash extends Composition {
  niveaux: string[]
  /** « 5e/Nombres relatifs » : le niveau et le thème */
  themes: string[]
  affichage: 'une' | 'toutes'
  /** Une question à la fois : le temps de chacune, en secondes */
  parQuestion: number
  /** Toutes d'un coup : la minuterie, en minutes */
  minutes: number
}
export const REGLAGES_PAR_DEFAUT: ReglagesFlash = {
  niveaux: ['5e'], themes: [], ...COMPOSITION_PAR_DEFAUT, affichage: 'une', parQuestion: 30, minutes: 5,
}

/** Un réglage relu : ce qui manque ou n'a pas de sens reprend la valeur par défaut */
export function lireReglages(t: string | null): ReglagesFlash {
  const r: ReglagesFlash = { ...REGLAGES_PAR_DEFAUT, niveaux: [...REGLAGES_PAR_DEFAUT.niveaux], themes: [] }
  let o: Partial<ReglagesFlash> = {}
  try { o = t ? JSON.parse(t) : {} } catch { /* illisible : par défaut */ }
  if (!o || typeof o !== 'object') return r
  const entier = (v: unknown, min: number, max: number, d: number) => typeof v === 'number' && Number.isFinite(v) ? Math.max(min, Math.min(max, Math.round(v))) : d
  if (Array.isArray(o.niveaux)) r.niveaux = o.niveaux.filter(n => typeof n === 'string' && NIVEAUX.some(x => x.id === n && x.automatismes.length))
  if (!r.niveaux.length) r.niveaux = [...REGLAGES_PAR_DEFAUT.niveaux]
  if (Array.isArray(o.themes)) r.themes = o.themes.filter(x => typeof x === 'string')
  r.qcm = entier(o.qcm, 0, MAX_PAR_FORME, r.qcm)
  r.directe = entier(o.directe, 0, MAX_PAR_FORME, r.directe)
  r.trou = entier(o.trou, 0, MAX_PAR_FORME, r.trou)
  if (r.qcm + r.directe + r.trou === 0) Object.assign(r, COMPOSITION_PAR_DEFAUT)
  if (o.affichage === 'toutes' || o.affichage === 'une') r.affichage = o.affichage
  r.parQuestion = entier(o.parQuestion, 5, 300, r.parQuestion)
  r.minutes = entier(o.minutes, 1, 60, r.minutes)
  return r
}

/** Les automatismes des thèmes cochés, dans les niveaux cochés */
export function automatismesChoisis(r: ReglagesFlash): Automatisme[] {
  return NIVEAUX.filter(n => r.niveaux.includes(n.id))
    .flatMap(n => n.automatismes.filter(a => r.themes.includes(`${n.id}/${a.theme}`)))
}

/** Un texte avec des $…$ en LaTeX : le texte dans \text{}, les maths telles quelles */
function texteEnLatex(t: string): string {
  return t.split('$').map((m, i) => i % 2 ? m : m ? `\\text{${m.replace(/[\\{}%&#_^~$]/g, c => c === '\\' ? '\\textbackslash{}' : c === '~' ? '\\textasciitilde{}' : c === '^' ? '\\textasciicircum{}' : '\\' + c)}}` : '').join('')
}
/** Une réponse en LaTeX : un texte (§…), ou déjà du LaTeX (entre
 *  accolades : « −3 » après une lettre garde le signe d'un nombre) */
const reponseEnLatex = (r: string) => r.startsWith('§') ? texteEnLatex(r.slice(1)) : `{${r}}`
const estDessin = (r: string) => r.startsWith('<svg')

/** La taille d'un dessin SVG (sa viewBox) */
function tailleSvg(svg: string): { l: number; h: number } {
  const m = /viewBox="\s*[-\d.]+\s+[-\d.]+\s+([\d.]+)\s+([\d.]+)"/.exec(svg)
  return m ? { l: Number(m[1]) || 100, h: Number(m[2]) || 100 } : { l: 100, h: 100 }
}

// ---------- La mise en page ----------
/** Un morceau d'une question, placé par rapport à son coin haut gauche */
type Morceau =
  | { genre: 'formule'; latex: string; dx: number; dy: number; taille: number; couleur?: string }
  | { genre: 'dessin'; svg: string; dx: number; dy: number; l: number; h: number }
interface Bloc { morceaux: Morceau[]; h: number }

/** La case d'une question : où elle est, et où va sa réponse */
interface Case { x: number; y: number; l: number; taille: number; reponseDy: number; groupe: string }

interface EnCours {
  page: string
  reglages: ReglagesFlash
  questions: QuestionFlash[]
  /** Chaque dessin (le texte SVG), déjà rangé dans le classeur */
  images: Map<string, { src: string; l: number; h: number }>
  cases: Case[]
  /** Ce qu'on voit de la page, sous le titre : où vont les cases */
  cadre: { x: number; l: number; haut: number; bas: number }
  /** Ce qu'a posé chaque case */
  posees: string[][]
  /** La zone de la question en grand (une à la fois) */
  grande: { x: number; y: number; l: number; h: number } | null
  /** Ce qu'a posé la question en grand */
  enGrand: string[]
  i: number
  reste: number
  pause: boolean
  corrige: boolean
}

export class Flash {
  private dialogue: HTMLDialogElement | null = null
  private bandeau: HTMLDivElement
  private mesureur: HTMLDivElement
  private flash: EnCours | null = null
  private minuterie = 0
  private clavier = (e: KeyboardEvent) => this.touche(e)

  constructor(private app: App, racine: HTMLElement, private message: (t: string) => void) {
    this.bandeau = document.createElement('div')
    this.bandeau.className = 'bandeau-flash'
    this.bandeau.setAttribute('role', 'toolbar')
    this.bandeau.setAttribute('aria-label', 'Flash d\'automatismes')
    this.bandeau.hidden = true
    // Hors de l'écran : on y mesure une formule avant de la poser
    this.mesureur = document.createElement('div')
    this.mesureur.className = 'mesure-catalogue'
    this.mesureur.setAttribute('aria-hidden', 'true')
    racine.append(this.bandeau, this.mesureur)
  }

  /** Un flash est en cours (son bandeau est là) */
  get enCours(): boolean { return !!this.flash }
  /** La fenêtre de réglage est ouverte */
  get enReglage(): boolean { return !!this.dialogue?.open }

  // ---------- 1. Le réglage ----------
  private lireLeReglage(): ReglagesFlash {
    let t: string | null = null
    try { t = localStorage.getItem(cleDuClasseur(this.app.classeur.id)) ?? localStorage.getItem(CLE) } catch { /* navigateur sans mémoire */ }
    return lireReglages(t)
  }

  private garder(r: ReglagesFlash) {
    const t = JSON.stringify(r)
    try { localStorage.setItem(cleDuClasseur(this.app.classeur.id), t); localStorage.setItem(CLE, t) } catch { /* le réglage vaut pour cette fois */ }
  }

  /** Ouvre la fenêtre de réglage. Rien n'est tiré avant « Lancer le flash ».
   *  cocher : les thèmes à cocher, seuls (« 5e/Opérations », depuis la
   *  recherche) ; sinon le dernier réglage */
  ouvrir(cocher?: string[]) {
    if (this.app.enLecture) { this.message('Cette séance est passée : elle est en lecture seule.'); return }
    if (this.dialogue?.open) return
    if (this.flash) this.arreter()
    const R = this.lireLeReglage()
    if (cocher?.length) { R.themes = cocher; R.niveaux = [...new Set(cocher.map(t => t.split('/')[0]))] }
    const d = this.dialogue = document.createElement('dialog')
    d.className = 'dialogue dialogue-flash'
    d.setAttribute('aria-labelledby', 'flash-titre')
    const niveaux = NIVEAUX.map(n => {
      const vide = !n.automatismes.length
      return `<button type="button" class="niveau-flash" data-niveau="${n.id}" aria-pressed="${!vide && R.niveaux.includes(n.id)}"${vide ? ' disabled title="Bientôt"' : ''}>${html(n.nom)}${vide ? ' <small>bientôt</small>' : ''}</button>`
    }).join('')
    const themes = NIVEAUX.filter(n => n.automatismes.length).map(n => `
      <div class="themes-niveau" data-niveau="${n.id}">
        <h3>${html(n.nom)}<button type="button" class="lien tout-cocher" data-niveau="${n.id}">tout cocher</button></h3>
        ${themesDe(n).map(t => {
          const cle = `${n.id}/${t}`, nb = n.automatismes.filter(a => a.theme === t).length
          return `<label><input type="checkbox" value="${html(cle)}"${R.themes.includes(cle) ? ' checked' : ''}><span>${html(t)}</span><small>${nb}</small></label>`
        }).join('')}
      </div>`).join('')
    const forme = (cle: keyof Composition, nom: string) => `
      <div class="forme-flash" data-forme="${cle}"><span>${nom}</span>
        <button type="button" class="moins" aria-label="Une de moins">−</button><output>${R[cle]}</output><button type="button" class="plus" aria-label="Une de plus">+</button></div>`
    d.innerHTML = `
      <h2 id="flash-titre">Automatismes</h2>
      <p class="note-flash">Les questions sont tirées au hasard quand vous lancez le flash.</p>
      <div class="colonnes-flash">
        <div>
          <fieldset><legend>Niveaux</legend><div class="niveaux-flash">${niveaux}</div></fieldset>
          <fieldset class="liste-themes"><legend>Thèmes</legend>${themes}</fieldset>
        </div>
        <div>
          <fieldset><legend>Questions</legend>
            ${forme('qcm', 'QCM')}${forme('directe', 'Questions directes')}${forme('trou', 'Questions à trou')}
            <p class="total-flash"></p>
          </fieldset>
          <fieldset><legend>Affichage</legend>
            <label><input type="radio" name="affichage-flash" value="une"${R.affichage === 'une' ? ' checked' : ''}><span>Une question à la fois</span></label>
            <label class="nombre"><span>chacune pendant</span><input type="number" class="par-question" min="5" max="300" value="${R.parQuestion}"> s</label>
            <label><input type="radio" name="affichage-flash" value="toutes"${R.affichage === 'toutes' ? ' checked' : ''}><span>Toutes d'un coup</span></label>
            <label class="nombre"><span>pendant</span><input type="number" class="minutes" min="1" max="60" value="${R.minutes}"> min</label>
          </fieldset>
        </div>
      </div>
      <div class="actions">
        <button type="button" class="secondaire annuler">Annuler</button>
        <button type="button" class="principal lancer">Lancer le flash</button>
      </div>`
    const q = <T extends HTMLElement>(s: string) => d.querySelector(s) as T
    const compo: Composition = { qcm: R.qcm, directe: R.directe, trou: R.trou }
    const maj = () => {
      const choisis = new Set([...d.querySelectorAll<HTMLButtonElement>('.niveau-flash[aria-pressed=true]')].map(b => b.dataset.niveau!))
      d.querySelectorAll<HTMLElement>('.themes-niveau').forEach(e => { e.hidden = !choisis.has(e.dataset.niveau!) })
      const themes = [...d.querySelectorAll<HTMLInputElement>('.themes-niveau:not([hidden]) input:checked')].length
      d.querySelectorAll<HTMLElement>('.forme-flash').forEach(e => {
        const k = e.dataset.forme as keyof Composition
        e.querySelector('output')!.textContent = String(compo[k])
        ;(e.querySelector('.moins') as HTMLButtonElement).disabled = compo[k] <= 0
        ;(e.querySelector('.plus') as HTMLButtonElement).disabled = compo[k] >= MAX_PAR_FORME
      })
      const n = compo.qcm + compo.directe + compo.trou
      q('.total-flash').textContent = n ? `${n} question${n > 1 ? 's' : ''}` : 'Aucune question'
      const lancer = q<HTMLButtonElement>('.lancer')
      lancer.disabled = !n || !themes || !choisis.size
      lancer.title = !choisis.size ? 'Choisissez un niveau' : !themes ? 'Cochez au moins un thème' : !n ? 'Ajoutez au moins une question' : ''
    }
    d.querySelectorAll<HTMLButtonElement>('.niveau-flash:not(:disabled)').forEach(b => b.addEventListener('click', () => {
      b.setAttribute('aria-pressed', String(b.getAttribute('aria-pressed') !== 'true')); maj()
    }))
    d.querySelectorAll<HTMLButtonElement>('.tout-cocher').forEach(b => b.addEventListener('click', () => {
      const cases = [...d.querySelectorAll<HTMLInputElement>(`.themes-niveau[data-niveau="${b.dataset.niveau}"] input`)]
      const tout = cases.every(c => c.checked)
      cases.forEach(c => { c.checked = !tout })
      maj()
    }))
    d.querySelectorAll<HTMLElement>('.forme-flash').forEach(e => {
      const k = e.dataset.forme as keyof Composition
      e.querySelector('.moins')!.addEventListener('click', () => { compo[k] = Math.max(0, compo[k] - 1); maj() })
      e.querySelector('.plus')!.addEventListener('click', () => { compo[k] = Math.min(MAX_PAR_FORME, compo[k] + 1); maj() })
    })
    d.addEventListener('change', maj)
    const fermer = () => { if (d.open) d.close() }
    q('.annuler').addEventListener('click', fermer)
    q('.lancer').addEventListener('click', () => {
      const r: ReglagesFlash = {
        niveaux: [...d.querySelectorAll<HTMLButtonElement>('.niveau-flash[aria-pressed=true]')].map(b => b.dataset.niveau!),
        themes: [...d.querySelectorAll<HTMLInputElement>('.themes-niveau:not([hidden]) input:checked')].map(c => c.value),
        ...compo,
        affichage: (d.querySelector('input[name=affichage-flash]:checked') as HTMLInputElement).value === 'toutes' ? 'toutes' : 'une',
        parQuestion: Math.max(5, Math.min(300, Math.round(Number(q<HTMLInputElement>('.par-question').value) || 30))),
        minutes: Math.max(1, Math.min(60, Math.round(Number(q<HTMLInputElement>('.minutes').value) || 5))),
      }
      this.garder(r)
      fermer()
      void this.lancer(r)
    })
    d.addEventListener('close', () => { d.remove(); if (this.dialogue === d) this.dialogue = null })
    fermerSurLeFond(d, fermer)
    document.getElementById('app')?.appendChild(d) ?? document.body.appendChild(d)
    d.showModal()
    maj()
    q<HTMLButtonElement>('.lancer').focus()
  }

  // ---------- 2. Le flash ----------
  /** Tire les questions et les joue : sur la page du jour si elle est
   *  encore vide, sinon sur une page neuve juste après celle où l'on est */
  async lancer(r: ReglagesFlash) {
    const app = this.app
    if (app.enLecture) { this.message('Cette séance est passée : elle est en lecture seule.'); return }
    const autos = automatismesChoisis(r)
    if (!autos.length) { this.message('Cochez au moins un thème.'); return }
    const { questions, trousRemplaces } = tirerFlash(autos, r)
    if (!questions.length) return
    if (app.enSeancePassee || (app.tableau.formesDe(app.page)?.size ?? 0) > 0) app.nouvellePage()
    const page = app.page
    // Les dessins, rangés une fois dans le classeur (des images)
    const images = new Map<string, { src: string; l: number; h: number }>()
    const dessins = new Set<string>()
    for (const it of questions) {
      if (it.q.figure) dessins.add(it.q.figure)
      for (const o of it.options) if (estDessin(o)) dessins.add(o)
    }
    for (const svg of dessins) {
      const img = await rasteriser(svg, app.couleur).catch(() => null)
      if (img) images.set(svg, { src: app.rangerImage(img.donnees), l: img.l, h: img.h })
    }
    if (app.page !== page) app.allerPage(page)
    const f: EnCours = { page, reglages: r, questions, images, cadre: { x: 0, l: 0, haut: 0, bas: 0 }, posees: [], cases: [], grande: null, enGrand: [], i: 0, reste: 0, pause: false, corrige: false }
    this.flash = f
    this.mettreEnPage(f)
    app.tableau.nouveauGeste()
    if (r.affichage === 'toutes') {
      f.cases.forEach((_, k) => this.poserCase(f, k))
      f.reste = r.minutes * 60
    } else {
      this.poserEnGrand(f, 0)
      f.reste = r.parQuestion
    }
    this.montrerBandeau()
    window.addEventListener('keydown', this.clavier, true)
    clearInterval(this.minuterie)
    let avant = performance.now()
    this.minuterie = window.setInterval(() => {
      const t = performance.now(), dt = (t - avant) / 1000; avant = t
      const fl = this.flash
      if (!fl || fl.corrige) return
      // Ailleurs que sur sa page : la minuterie attend
      if (fl.pause || this.app.page !== fl.page) { this.majBandeau(); return }
      fl.reste -= dt
      if (fl.reste <= 0) {
        if (fl.reglages.affichage === 'une' && fl.i < fl.questions.length - 1) this.suivante()
        else this.corriger()
      }
      this.majBandeau()
    }, 200)
    if (trousRemplaces) this.message(trousRemplaces > 1
      ? `Les thèmes choisis n'ont pas de question à trou : ${trousRemplaces} questions directes à la place.`
      : 'Les thèmes choisis n\'ont pas de question à trou : une question directe à la place.')
  }

  /** Le titre de la page, et la place de chaque case (et de la question en
   *  grand) : à gauche pour une question à la fois, en grille pour toutes
   *  d'un coup */
  private mettreEnPage(f: EnCours) {
    const app = this.app, z = app.cam.z
    const zone = app.ui.zoneLibre()
    const o = app.cam.versMonde(zone.x, zone.y)
    const L = zone.l / z, H = zone.h / z, marge = 36
    const titre = texteEnLatex(`Automatismes — ${new Date().toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long' })}`)
    const tTitre = 26, yTitre = o.y + 84
    const groupeTitre = uid()
    this.poserFormule(f.page, titre, o.x + marge, yTitre, tTitre, app.couleur, groupeTitre)
    const haut = yTitre + this.mesurer(titre, tTitre).h + 22, bas = o.y + H - marge
    f.cadre = { x: o.x + marge, l: L - 2 * marge, haut, bas }
    if (f.reglages.affichage === 'une') {
      const gx = o.x + L * 0.42
      f.grande = { x: gx, y: haut, l: o.x + L - marge - gx, h: bas - haut }
      this.placerCases(f, false)
    } else this.placerCases(f, true)
  }

  /** La place de chaque case, à la plus grande taille qui tient : en
   *  grille (deux colonnes dès 4 questions, avec la place des réponses),
   *  ou dans la colonne de gauche (une question à la fois, sans les
   *  réponses : la correction remet les questions en grille) */
  private placerCases(f: EnCours, grille: boolean) {
    const { x, l: L, haut, bas } = f.cadre, n = f.questions.length
    let colonnes: { x: number; l: number }[]
    if (!grille) colonnes = [{ x, l: (f.grande ? f.grande.x - x : L) - L * 0.05 }]
    else {
      const k = n >= 4 ? 2 : 1, ecart = 48, l = (L - ecart * (k - 1)) / k
      colonnes = Array.from({ length: k }, (_, i) => ({ x: x + i * (l + ecart), l }))
    }
    const tailles = grille ? [28, 26, 24, 22, 20, 18, 16, 14, 13, 12] : [22, 20, 18, 16, 14, 13, 12, 11, 10]
    for (const T of tailles) {
      // La hauteur de chaque case ; deux colonnes : la coupure (dans
      // l'ordre) qui rend la plus haute la moins haute possible
      const h = f.questions.map((it, k) => this.bloc(f, it, colonnes[0].l, T, k + 1, false).h)
      const pas = h.map(v => v + (grille ? T * 1.5 : 0) + T * 1.1)
      let coupe = n
      if (colonnes.length === 2) {
        let mieux = Infinity
        for (let c = 1; c < n; c++) {
          const a = pas.slice(0, c).reduce((x, y) => x + y, 0), b = pas.slice(c).reduce((x, y) => x + y, 0)
          if (Math.max(a, b) < mieux) { mieux = Math.max(a, b); coupe = c }
        }
      }
      const cases: Case[] = []
      let ok = true
      colonnes.forEach((c, j) => {
        let y = haut
        for (let k = j ? coupe : 0; k < (j ? n : coupe); k++) {
          cases.push({ x: c.x, y, l: c.l, taille: T, reponseDy: h[k] + T * 0.15, groupe: uid() })
          y += pas[k]
        }
        if (y - T * 1.1 > bas) ok = false
      })
      f.cases = cases
      if (ok) break
    }
  }

  /** Une question, mise en page dans la largeur l à la taille T : son
   *  numéro (dans une case), son énoncé coupé en lignes, sa figure, ses
   *  propositions (QCM) */
  private bloc(f: EnCours, it: QuestionFlash, l: number, T: number, numero: number | null, grand: boolean): Bloc {
    const morceaux: Morceau[] = []
    let retrait = 0, y = 0
    if (numero !== null) {
      const n = `\\textbf{${numero}.}`
      morceaux.push({ genre: 'formule', latex: n, dx: 0, dy: 0, taille: T })
      retrait = this.mesurer(n, T).l + T * 0.45
    }
    const W = Math.max(T * 6, l - retrait)
    for (const ligne of this.couper(it.q.enonce, W, T)) {
      const latex = texteEnLatex(ligne), m = this.mesurer(latex, T)
      morceaux.push({ genre: 'formule', latex, dx: retrait, dy: y, taille: T })
      y += Math.max(m.h, T * 1.2)
    }
    if (it.q.figure && f.images.has(it.q.figure)) {
      const s = tailleSvg(it.q.figure)
      const hMax = grand && f.grande ? Math.min(f.grande.h * 0.42, T * 7) : T * 5
      const k = Math.min(hMax / s.h, W / s.l)
      y += T * 0.3
      morceaux.push({ genre: 'dessin', svg: it.q.figure, dx: retrait, dy: y, l: s.l * k, h: s.h * k })
      y += s.h * k + T * 0.3
    }
    if (it.forme === 'qcm') y = this.propositions(it, morceaux, retrait, y + T * 0.3, W, T, grand)
    return { morceaux, h: y }
  }

  /** Les propositions d'un QCM, en une rangée si elles tiennent, sinon en
   *  deux colonnes, sinon une par ligne ; rend le bas */
  private propositions(it: QuestionFlash, morceaux: Morceau[], x: number, y: number, W: number, T: number, grand: boolean): number {
    const n = it.options.length, ecart = T * 1.4
    const lettres = it.options.map((_, j) => `\\textbf{${LETTRES[j]}}`)
    if (it.options.some(estDessin)) {
      // Des dessins : sur une rangée, ou deux colonnes s'ils seraient trop petits
      const cols = W / n >= T * 6 ? n : 2, cellule = (W - ecart * (cols - 1)) / cols
      const lettreL = this.mesurer(lettres[0], T).l + T * 0.4
      let hRangee = 0
      it.options.forEach((o, j) => {
        const c = j % cols, rang = Math.floor(j / cols)
        if (c === 0 && rang > 0) { y += hRangee + T * 0.5; hRangee = 0 }
        const cx = x + c * (cellule + ecart)
        morceaux.push({ genre: 'formule', latex: lettres[j], dx: cx, dy: y, taille: T })
        if (estDessin(o)) {
          const s = tailleSvg(o), k = Math.min((grand ? T * 4 : T * 3.2) / s.h, (cellule - lettreL) / s.l)
          morceaux.push({ genre: 'dessin', svg: o, dx: cx + lettreL, dy: y, l: s.l * k, h: s.h * k })
          hRangee = Math.max(hRangee, s.h * k, T * 1.2)
        } else {
          const latex = `${lettres[j]}\\;\\; ${reponseEnLatex(o)}`
          morceaux.pop()
          morceaux.push({ genre: 'formule', latex, dx: cx, dy: y, taille: T })
          hRangee = Math.max(hRangee, this.mesurer(latex, T).h)
        }
      })
      return y + hRangee
    }
    const latex = it.options.map((o, j) => `${lettres[j]}\\;\\; ${reponseEnLatex(o)}`)
    const tailles = latex.map(t => this.mesurer(t, T))
    const hLigne = Math.max(T * 1.25, ...tailles.map(m => m.h))
    if (tailles.reduce((s, m) => s + m.l, 0) + ecart * (n - 1) <= W) {
      let cx = x
      latex.forEach((t, j) => { morceaux.push({ genre: 'formule', latex: t, dx: cx, dy: y, taille: T }); cx += tailles[j].l + ecart })
      return y + hLigne
    }
    const moitie = (W - ecart) / 2
    if (tailles.every(m => m.l <= moitie)) {
      latex.forEach((t, j) => morceaux.push({ genre: 'formule', latex: t, dx: x + (j % 2) * (moitie + ecart), dy: y + Math.floor(j / 2) * (hLigne + T * 0.3), taille: T }))
      return y + Math.ceil(n / 2) * (hLigne + T * 0.3) - T * 0.3
    }
    latex.forEach((t, j) => { morceaux.push({ genre: 'formule', latex: t, dx: x, dy: y, taille: T }); y += tailles[j].h + T * 0.3 })
    return y - T * 0.3
  }

  /** L'énoncé coupé en lignes qui tiennent dans la largeur W (les maths,
   *  entre $, ne se coupent pas) */
  private couper(enonce: string, W: number, T: number): string[] {
    // Les mots : ce qui se touche reste ensemble (« $178$. »), et une
    // ponctuation seule ne commence jamais une ligne (« $A$ ? »)
    const colles: string[] = []
    let espace = true
    for (const m of enonce.match(/\$[^$]*\$|[^\s$]+|\s+/g) ?? []) {
      if (/^\s+$/.test(m)) { espace = true; continue }
      if (!colles.length) colles.push(m)
      else if (!espace) colles[colles.length - 1] += m
      else if (/^[?!:;.,)»]+$/.test(m)) colles[colles.length - 1] += ' ' + m
      else colles.push(m)
      espace = false
    }
    const lignes: string[] = []
    let ligne = ''
    for (const m of colles) {
      const essai = ligne ? ligne + ' ' + m : m
      if (ligne && this.mesurer(texteEnLatex(essai), T).l > W) { lignes.push(ligne); ligne = m } else ligne = essai
    }
    if (ligne) lignes.push(ligne)
    return lignes
  }

  /** La taille d'une formule à l'écran, en unités du tableau */
  private mesurer(latex: string, taille: number): { l: number; h: number } {
    const el = document.createElement('div')
    el.className = 'formule'
    el.style.fontSize = taille + 'px'
    this.mesureur.appendChild(el)
    katex.render(latex, el, { throwOnError: false, displayMode: false })
    const m = { l: el.offsetWidth || taille * latex.length * 0.5, h: el.offsetHeight || taille * 1.4 }
    el.remove()
    return m
  }

  private poserFormule(page: string, latex: string, x: number, y: number, taille: number, couleur: string, groupe: string): string {
    const f: Formule = { id: uid(), type: 'formule', x, y, latex, couleur, taille, z: Date.now(), auteur: this.app.tableau.moi, groupe }
    this.app.tableau.poser(page, f)
    return f.id
  }

  /** Pose un bloc en (x, y) ; rend ce qui a été posé */
  private poserBloc(f: EnCours, b: Bloc, x: number, y: number, groupe: string): string[] {
    const ids: string[] = []
    for (const m of b.morceaux) {
      if (m.genre === 'formule') { ids.push(this.poserFormule(f.page, m.latex, x + m.dx, y + m.dy, m.taille, m.couleur ?? this.app.couleur, groupe)); continue }
      const img = f.images.get(m.svg)
      if (!img) continue
      const e = m.l / img.l
      const forme: ImageForme = { id: uid(), type: 'image', src: img.src, l: img.l, h: img.h, m: [e, 0, 0, e], x: x + m.dx, y: y + m.dy, z: Date.now(), auteur: this.app.tableau.moi, groupe }
      this.app.tableau.poser(f.page, forme)
      ids.push(forme.id)
    }
    return ids
  }

  private poserCase(f: EnCours, k: number) {
    const c = f.cases[k]
    f.posees[k] = this.poserBloc(f, this.bloc(f, f.questions[k], c.l, c.taille, k + 1, false), c.x, c.y, c.groupe)
  }

  /** La question k en grand, dans sa zone : la plus grande taille qui tient */
  private poserEnGrand(f: EnCours, k: number) {
    const g = f.grande
    if (!g) return
    let b: Bloc | null = null
    for (const T of [44, 40, 36, 32, 28, 24, 20, 18]) {
      b = this.bloc(f, f.questions[k], g.l, T, null, true)
      if (b.h <= g.h) break
    }
    const titre = `\\text{Question ${k + 1}}`
    const groupe = uid()
    f.enGrand = [this.poserFormule(f.page, titre, g.x, g.y, 18, '#6b7686', groupe), ...this.poserBloc(f, b!, g.x, g.y + 34, groupe)]
  }

  /** La question en cours va dans sa case ; la suivante arrive en grand.
   *  Après la dernière : la correction. */
  suivante() {
    const f = this.flash
    if (!f || f.corrige || f.reglages.affichage !== 'une') return
    this.app.tableau.nouveauGeste()
    this.app.tableau.supprimer(f.page, f.enGrand)
    f.enGrand = []
    this.poserCase(f, f.i)
    f.i++
    if (f.i >= f.questions.length) { this.corriger(false); return }
    this.poserEnGrand(f, f.i)
    f.reste = f.reglages.parQuestion
    this.majBandeau()
  }

  basculerPause() {
    const f = this.flash
    if (!f || f.corrige) return
    f.pause = !f.pause
    this.majBandeau()
  }

  // ---------- 3. La correction ----------
  /** Chaque réponse en vert sous sa question. Une question à la fois :
   *  les questions reviennent d'abord en grille, sur toute la page, plus
   *  grandes, avec la place de leur réponse. */
  corriger(geste = true) {
    const f = this.flash
    if (!f || f.corrige) return
    if (geste) this.app.tableau.nouveauGeste()
    if (f.reglages.affichage === 'une') {
      const ids = [...f.enGrand, ...f.posees.flat()].filter(id => this.app.tableau.formesDe(f.page)?.has(id))
      if (ids.length) this.app.tableau.supprimer(f.page, ids)
      f.enGrand = []; f.posees = []; f.grande = null
      this.placerCases(f, true)
      f.cases.forEach((_, k) => this.poserCase(f, k))
      f.i = f.questions.length
    }
    f.questions.forEach((it, k) => {
      const c = f.cases[k]
      const juste = it.forme === 'qcm' ? it.options.indexOf(it.q.reponse) : -1
      const rep = juste >= 0
        ? `\\textbf{${LETTRES[juste]}}${estDessin(it.q.reponse) ? '' : `\\;\\; ${reponseEnLatex(it.q.reponse)}`}`
        : estDessin(it.q.reponse) ? '' : reponseEnLatex(it.q.reponse)
      if (!rep) return
      const retrait = this.mesurer(`\\textbf{${k + 1}.}`, c.taille).l + c.taille * 0.45
      this.poserFormule(f.page, `\\text{Réponse : }${rep}`, c.x + retrait, c.y + c.reponseDy, c.taille, VERT, c.groupe)
    })
    f.corrige = true
    this.majBandeau()
  }

  /** Le même réglage, d'autres questions, sur une page neuve juste après */
  nouveauxExemples() {
    const f = this.flash
    if (!f) return
    const r = f.reglages
    this.arreter()
    if (this.app.page !== f.page) this.app.allerPage(f.page)
    this.app.nouvellePage()
    void this.lancer(r)
  }

  /** Le flash s'arrête : ce qui est posé reste sur la page */
  arreter() {
    clearInterval(this.minuterie)
    this.minuterie = 0
    this.flash = null
    this.bandeau.hidden = true
    window.removeEventListener('keydown', this.clavier, true)
  }

  // ---------- Le bandeau ----------
  private montrerBandeau() {
    const b = this.bandeau
    b.innerHTML = `
      <span class="etat-flash" aria-live="off"></span>
      <button type="button" class="secondaire pause" title="Pause (Espace)">Pause</button>
      <button type="button" class="secondaire suivante" title="Question suivante (→)">Suivante ▶</button>
      <button type="button" class="principal corriger" title="Afficher la correction (C)">Correction</button>
      <button type="button" class="secondaire nouveaux" title="D'autres questions, sur une nouvelle page">Nouveaux exemples</button>
      <button type="button" class="fermer" aria-label="Fermer le flash" title="Fermer le flash (les questions restent sur la page)">×</button>`
    const q = (s: string) => b.querySelector(s) as HTMLButtonElement
    q('.pause').addEventListener('click', () => this.basculerPause())
    q('.suivante').addEventListener('click', () => this.suivante())
    q('.corriger').addEventListener('click', () => this.corriger())
    q('.nouveaux').addEventListener('click', () => this.nouveauxExemples())
    q('.fermer').addEventListener('click', () => this.arreter())
    b.hidden = false
    this.majBandeau()
  }

  private majBandeau() {
    const f = this.flash, b = this.bandeau
    if (!f) return
    const n = f.questions.length, une = f.reglages.affichage === 'une'
    const ailleurs = this.app.page !== f.page
    const etat = f.corrige ? 'Correction'
      : (une ? `Question ${Math.min(f.i + 1, n)} sur ${n} · ` : `${n} question${n > 1 ? 's' : ''} · `) + mmss(f.reste)
        + (ailleurs ? ' · en attente (autre page)' : f.pause ? ' · en pause' : '')
    ;(b.querySelector('.etat-flash') as HTMLElement).textContent = etat
    const q = (s: string) => b.querySelector(s) as HTMLButtonElement
    q('.pause').hidden = f.corrige
    q('.pause').textContent = f.pause ? 'Reprendre' : 'Pause'
    q('.suivante').hidden = f.corrige || !une
    q('.corriger').hidden = f.corrige
    q('.nouveaux').hidden = !f.corrige
    b.classList.toggle('presque', !f.corrige && f.reste <= 5)
  }

  /** → (ou Page↓) : la question suivante ; Espace : pause ; C : la
   *  correction. Seulement sur la page du flash, hors des champs et des
   *  fenêtres, et jusqu'à la correction. */
  private touche(e: KeyboardEvent) {
    const f = this.flash
    if (!f || f.corrige || this.app.page !== f.page) return
    if (e.ctrlKey || e.metaKey || e.altKey) return
    const cible = e.target as HTMLElement
    if (cible.closest?.('input, textarea, select, [contenteditable], dialog') || document.querySelector('dialog[open]')) return
    const actions: Record<string, () => void> = {
      ArrowRight: () => this.suivante(), PageDown: () => this.suivante(),
      ' ': () => this.basculerPause(), c: () => this.corriger(), C: () => this.corriger(),
    }
    const a = actions[e.key]
    if (!a) return
    e.preventDefault(); e.stopPropagation()
    if (!e.repeat) a()
  }
}

/** Un dessin SVG en image PNG (2,5 pixels par unité, pour rester net en
 *  grand), du trait de la couleur du stylo */
function rasteriser(svg: string, couleur: string): Promise<{ donnees: string; l: number; h: number }> {
  const s = tailleSvg(svg), k = 2.5
  const l = Math.max(1, Math.round(s.l * k)), h = Math.max(1, Math.round(s.h * k))
  const texte = svg.replace('<svg ', `<svg width="${l}" height="${h}" style="color:${couleur}" `)
  return new Promise((ok, ko) => {
    const img = new Image()
    img.onload = () => {
      const cv = Object.assign(document.createElement('canvas'), { width: l, height: h })
      cv.getContext('2d')!.drawImage(img, 0, 0, l, h)
      try { ok({ donnees: cv.toDataURL('image/png'), l, h }) } catch (e) { ko(e) }
    }
    img.onerror = ko
    img.src = 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(texte)
  })
}
