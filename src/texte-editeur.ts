// =============================================================
// L'ÉDITEUR D'UN TEXTE
// Pendant qu'on tape, le texte est un élément modifiable (contenteditable)
// posé sur la page, à sa place et à sa taille, dans une couche qui suit la
// vue comme celle des formules : ce qu'on voit en tapant est ce qui restera.
// Au-dessus de lui, une petite barre : gras, italique, souligné (Ctrl + G
// ou B, Ctrl + I, Ctrl + U), les quatre couleurs, trois tailles, les puces,
// une formule, et « Terminé ». Une formule se tape entre deux $ : dès que
// le second est tapé (ou que le curseur quitte la formule), elle s'affiche,
// rendue par KaTeX ; un double-clic dessus la rend à son texte. Échap, un
// clic ailleurs ou « Terminé » finissent : l'App pose le texte (voir
// App.finirTexte), le modifie, ou le supprime s'il est vide.
// Ce qu'écrit le navigateur (des <b>, des <font color>, des <div>) n'est
// jamais gardé tel quel : à la fin, l'éditeur est relu morceau par morceau,
// par les styles calculés (lireEditeur), en lignes du modèle (texte.ts).
// =============================================================
import type { LigneTexte, MorceauTexte } from './types'
import { appliquerStyle, formulesDe } from './texte'
import { TAILLES_FORMULE } from './habillage'

/** Les couleurs de la barre (celles de la barre des outils) */
export interface CouleurTexte { nom: string; valeur: string }

export interface OptionsEditeur {
  x: number; y: number
  taille: number
  couleur: string
  largeur?: number
  rotation?: number
  lignes?: readonly LigneTexte[]
  couleurs: readonly CouleurTexte[]
  rendreFormule: (latex: string, el: HTMLElement) => void
  /** La couche (qui suit la vue) où l'éditeur se pose */
  couche: HTMLElement
  /** Fini : garder (Échap, Terminé, un clic ailleurs) ; annule : rien ne change */
  fini: (r: { lignes: LigneTexte[]; taille: number } | null) => void
}

/** Le caractère sans largeur que l'éditeur glisse après une formule : le
 *  curseur peut s'y poser (relu, il disparaît) */
const ZL = '​'

export class EditeurTexte {
  readonly el: HTMLDivElement
  readonly barre: HTMLDivElement
  taille: number
  private termine = false
  private boucle = 0
  private derniere = ''
  private boutons = new Map<string, HTMLButtonElement>()

  constructor(private o: OptionsEditeur) {
    this.taille = o.taille
    const el = this.el = document.createElement('div')
    el.className = 'formule texte editeur-texte' + (o.largeur ? ' large' : '')
    el.contentEditable = 'true'
    el.spellcheck = true
    el.lang = 'fr'
    el.setAttribute('role', 'textbox')
    el.setAttribute('aria-multiline', 'true')
    el.setAttribute('aria-label', 'Texte : tapez au clavier ; Échap pour finir')
    el.style.left = o.x + 'px'; el.style.top = o.y + 'px'
    el.style.fontSize = o.taille + 'px'
    el.style.color = o.couleur
    if (o.largeur) el.style.width = o.largeur + 'px'
    if (o.rotation) { el.style.transform = `rotate(${o.rotation}rad)`; el.style.transformOrigin = '0 0' }
    remplirEditeur(el, o.lignes?.length ? o.lignes : [{ morceaux: [] }], o.rendreFormule)
    this.brancher()
    o.couche.appendChild(el)

    this.barre = this.construireBarre()
    document.body.appendChild(this.barre)
    el.focus({ preventScroll: true })
    placerCurseurALaFin(el)
    this.majBarre()
    const suivre = () => { this.placerBarre(); this.boucle = requestAnimationFrame(suivre) }
    suivre()
  }

  /** Fini (garder : le texte relu ; sinon, rien ne change) */
  finir(garder = true) {
    if (this.termine) return
    this.termine = true
    cancelAnimationFrame(this.boucle)
    document.removeEventListener('selectionchange', this.surSelection)
    let r: { lignes: LigneTexte[]; taille: number } | null = null
    if (garder) {
      convertirFormules(this.el, this.o.rendreFormule, false)
      r = { lignes: lireEditeur(this.el), taille: this.taille }
    }
    this.el.remove(); this.barre.remove()
    this.o.fini(r)
  }

  get fini(): boolean { return this.termine }

  // ---------- Le clavier, la souris ----------
  private brancher() {
    const el = this.el
    // L'éditeur est dans la zone du tableau : ses appuis ne sont pas des
    // gestes du tableau (le curseur, la sélection du texte au glisser), son
    // clic droit ouvre le menu du navigateur (copier, coller, l'orthographe)
    for (const t of ['pointerdown', 'pointermove', 'pointerup', 'dblclick', 'contextmenu', 'click'] as const) {
      el.addEventListener(t, e => e.stopPropagation())
    }
    el.addEventListener('dblclick', e => {
      const m = (e.target as HTMLElement).closest?.('.math')
      if (m && el.contains(m)) { e.preventDefault(); rendreSource(m as HTMLElement) }
    })
    el.addEventListener('keydown', e => this.clavier(e))
    el.addEventListener('input', () => {
      normaliser(el)
      convertirFormules(el, this.o.rendreFormule, true)
      this.majBarre()
    })
    // Coller : le texte seul (pas les styles ni les images d'une page web) ;
    // ce qui est entre $…$ devient une formule
    el.addEventListener('paste', e => {
      e.preventDefault(); e.stopPropagation()
      const t = e.clipboardData?.getData('text/plain')
      if (t) document.execCommand('insertText', false, t.replace(/\r\n?/g, '\n'))
    })
    el.addEventListener('drop', e => { e.preventDefault(); e.stopPropagation() })
    // Le focus part ailleurs (un bouton de la barre des outils, Tab) : c'est
    // fini. Pas quand on quitte la fenêtre (une autre application) : en
    // revenant, on tape encore.
    el.addEventListener('focusout', e => {
      const vers = e.relatedTarget as Node | null
      if (vers && (el.contains(vers) || this.barre.contains(vers))) return
      setTimeout(() => {
        if (this.termine || !document.hasFocus()) return
        const a = document.activeElement
        if (a && (el.contains(a) || this.barre.contains(a))) return
        this.finir()
      }, 0)
    })
    document.addEventListener('selectionchange', this.surSelection)
  }

  /** Le curseur bouge : une formule qu'il quitte s'affiche ; la barre dit
   *  le style de ce qui est sous lui */
  private surSelection = () => {
    if (this.termine) return
    const s = document.getSelection()
    if (!s || !s.anchorNode || !this.el.contains(s.anchorNode)) return
    convertirFormules(this.el, this.o.rendreFormule, true)
    this.majBarre()
  }

  private clavier(e: KeyboardEvent) {
    e.stopPropagation()
    const ctrl = e.ctrlKey || e.metaKey
    if (e.key === 'Escape') { e.preventDefault(); this.finir(); return }
    if (e.key === 'Enter' && ctrl) { e.preventDefault(); this.finir(); return }
    if (ctrl && !e.altKey && !e.shiftKey) {
      const k = e.key.toLowerCase()
      // Ctrl + G (le gras des traitements de texte en français) ou B ; I ; U
      const commande = k === 'g' || k === 'b' ? 'bold' : k === 'i' ? 'italic' : k === 'u' ? 'underline' : null
      if (commande) { e.preventDefault(); this.commande(commande); return }
    }
    // Entrée sur une ligne à puce vide : la puce s'en va (comme dans un
    // traitement de texte), on ne crée pas une autre ligne
    if (e.key === 'Enter' && !e.shiftKey) {
      const l = ligneDuCurseur(this.el)
      if (l?.classList.contains('puce') && !(l.textContent ?? '').replace(ZL, '').trim() && !l.querySelector('.math')) {
        e.preventDefault(); l.classList.remove('puce'); this.majBarre()
      }
    }
  }

  private commande(c: 'bold' | 'italic' | 'underline' | 'foreColor', valeur?: string) {
    this.el.focus({ preventScroll: true })
    document.execCommand('styleWithCSS', false, 'false')
    document.execCommand(c, false, valeur)
    this.majBarre()
  }

  // ---------- La barre ----------
  private construireBarre(): HTMLDivElement {
    const b = document.createElement('div')
    b.className = 'barre-texte'
    b.setAttribute('role', 'toolbar')
    b.setAttribute('aria-label', 'Mise en forme du texte')
    // Ses boutons ne prennent pas le focus : le curseur et ce qu'on a choisi
    // dans le texte restent où ils sont
    for (const t of ['pointerdown', 'mousedown'] as const) b.addEventListener(t, e => { if ((e.target as HTMLElement).closest('button')) e.preventDefault() })
    b.addEventListener('pointerdown', e => e.stopPropagation())
    const bouton = (id: string, texte: string, titre: string, faire: () => void, classe = '') => {
      const x = document.createElement('button')
      x.type = 'button'; x.className = 'bouton-texte ' + classe; x.textContent = texte
      x.title = titre; x.setAttribute('aria-label', titre); x.tabIndex = -1
      x.addEventListener('click', () => faire())
      this.boutons.set(id, x)
      b.appendChild(x)
      return x
    }
    const separer = () => { const s = document.createElement('span'); s.className = 'separation-texte'; b.appendChild(s) }
    const ctrl = /Mac|iPhone|iPad/.test(navigator.platform) ? '⌘' : 'Ctrl'
    bouton('gras', 'G', `Gras (${ctrl} + G)`, () => this.commande('bold'), 'gras')
    bouton('italique', 'I', `Italique (${ctrl} + I)`, () => this.commande('italic'), 'italique')
    bouton('souligne', 'S', `Souligné (${ctrl} + U)`, () => this.commande('underline'), 'souligne')
    separer()
    for (const c of this.o.couleurs) {
      const x = bouton('couleur:' + c.valeur, '', c.nom, () => this.commande('foreColor', c.valeur), 'pastille-texte')
      x.style.setProperty('--teinte', c.valeur)
    }
    separer()
    for (const t of TAILLES_FORMULE) bouton('taille:' + t.valeur, t.nom, t.titre + ' (tout le texte)', () => this.changerTaille(t.valeur), 'taille-texte')
    separer()
    bouton('puce', '• Puces', 'Liste à puces (les lignes choisies)', () => this.basculerPuces())
    bouton('formule', '$ Formule', 'Une formule dans le texte : tapez-la entre deux $', () => this.insererFormule())
    separer()
    bouton('fini', 'Terminé', 'Terminé (Échap)', () => this.finir(), 'fini')
    return b
  }

  private changerTaille(v: number) {
    this.taille = v
    this.el.style.fontSize = v + 'px'
    this.el.focus({ preventScroll: true })
    this.majBarre()
  }

  /** Les puces des lignes choisies : toutes en ont, elles s'en vont ;
   *  sinon, toutes en prennent une */
  private basculerPuces() {
    normaliser(this.el)
    const lignes = lignesChoisies(this.el)
    if (!lignes.length) return
    const toutes = lignes.every(l => l.classList.contains('puce'))
    for (const l of lignes) l.classList.toggle('puce', !toutes)
    this.el.focus({ preventScroll: true })
    this.majBarre()
  }

  /** « Formule » : ce qui est choisi devient une formule ; sans rien de
   *  choisi, deux $ et le curseur entre eux */
  private insererFormule() {
    this.el.focus({ preventScroll: true })
    const s = document.getSelection()
    if (!s || !s.rangeCount) return
    const choisi = s.toString().replace(/\$/g, '').replace(/\n/g, ' ')
    if (choisi.trim()) {
      document.execCommand('insertText', false, `$${choisi}$`)
      convertirFormules(this.el, this.o.rendreFormule, false)
    } else {
      document.execCommand('insertText', false, '$$')
      const n = s.anchorNode, o = s.anchorOffset
      if (n && n.nodeType === Node.TEXT_NODE && o > 0) s.collapse(n, o - 1)
    }
    this.majBarre()
  }

  private majBarre() {
    if (this.termine) return
    const actif = (id: string, oui: boolean) => {
      const x = this.boutons.get(id)
      if (!x) return
      x.classList.toggle('actif', oui); x.setAttribute('aria-pressed', String(oui))
    }
    const etat = (c: string) => { try { return document.queryCommandState(c) } catch { return false } }
    const dedans = this.el.contains(document.getSelection()?.anchorNode ?? null)
    actif('gras', dedans && etat('bold'))
    actif('italique', dedans && etat('italic'))
    actif('souligne', dedans && etat('underline'))
    for (const t of TAILLES_FORMULE) actif('taille:' + t.valeur, this.taille === t.valeur)
    const lignes = dedans ? lignesChoisies(this.el) : []
    actif('puce', !!lignes.length && lignes.every(l => l.classList.contains('puce')))
    let couleur = ''
    const n = document.getSelection()?.anchorNode
    const p = n && this.el.contains(n) ? (n.nodeType === Node.TEXT_NODE ? n.parentElement : n as HTMLElement) : null
    if (p) couleur = versHex(getComputedStyle(p).color)
    for (const c of this.o.couleurs) actif('couleur:' + c.valeur, couleur === c.valeur.toLowerCase())
  }

  /** La barre au-dessus du texte (dessous s'il est collé en haut), dans
   *  l'écran ; repassée à chaque image : elle suit la vue, la taille, les
   *  lignes qui s'ajoutent */
  private placerBarre() {
    const r = this.el.getBoundingClientRect(), b = this.barre
    const cle = `${Math.round(r.left)}|${Math.round(r.top)}|${Math.round(r.bottom)}|${innerWidth}|${innerHeight}`
    if (cle === this.derniere) return
    this.derniere = cle
    const l = b.offsetWidth, h = b.offsetHeight, marge = 8
    let x = Math.min(Math.max(marge, r.left), innerWidth - l - marge)
    let y = r.top - h - marge
    if (y < 64) y = r.bottom + marge
    if (y + h > innerHeight - marge) y = Math.max(marge, innerHeight - h - marge)
    x = Math.max(marge, x)
    b.style.left = Math.round(x) + 'px'; b.style.top = Math.round(y) + 'px'
  }
}

// ---------- L'éditeur, du modèle au HTML et retour ----------
/** L'éditeur rempli de ces lignes : un bloc par ligne, un élément par
 *  morceau ; une formule, rendue, qu'on ne modifie pas lettre à lettre */
export function remplirEditeur(el: HTMLElement, lignes: readonly LigneTexte[], rendreFormule: (latex: string, el: HTMLElement) => void) {
  el.replaceChildren(...lignes.map(l => {
    const d = document.createElement('div')
    d.className = 'ligne' + (l.puce ? ' puce' : '')
    for (const m of l.morceaux) {
      if (m.f) { d.appendChild(spanFormule(m.t, rendreFormule, m.c)); d.appendChild(document.createTextNode(ZL)); continue }
      const s = document.createElement('span')
      appliquerStyle(s, m)
      s.textContent = m.t
      d.appendChild(s)
    }
    if (!d.childNodes.length) d.appendChild(document.createElement('br'))
    return d
  }))
}

function spanFormule(latex: string, rendreFormule: (latex: string, el: HTMLElement) => void, couleur?: string): HTMLSpanElement {
  const s = document.createElement('span')
  s.className = 'math'
  s.contentEditable = 'false'
  s.dataset.tex = latex
  s.title = 'Double-clic : modifier la formule'
  if (couleur) s.style.color = couleur
  try { rendreFormule(latex, s) } catch { s.textContent = latex }
  return s
}

/** Une formule de l'éditeur rendue à son texte ($…$), choisi entre ses $ */
function rendreSource(m: HTMLElement) {
  const t = document.createTextNode(`$${m.dataset.tex ?? ''}$`)
  m.replaceWith(t)
  const s = document.getSelection()
  if (!s) return
  const r = document.createRange()
  r.setStart(t, 1); r.setEnd(t, t.length - 1)
  s.removeAllRanges(); s.addRange(r)
}

const BLOC = /^(DIV|P|LI|UL|OL|H[1-6]|BLOCKQUOTE|PRE)$/

/** Tout ce que contient l'éditeur dans des blocs .ligne : le navigateur
 *  laisse parfois la première ligne nue, ou des <div> sans classe */
export function normaliser(el: HTMLElement) {
  let enCours: HTMLDivElement | null = null
  for (const n of [...el.childNodes]) {
    if (n.nodeType === Node.ELEMENT_NODE && BLOC.test((n as Element).tagName)) {
      enCours = null
      ;(n as Element).classList.add('ligne')
      continue
    }
    if (n.nodeType === Node.TEXT_NODE && !n.textContent) { n.remove(); continue }
    if (!enCours) { enCours = document.createElement('div'); enCours.className = 'ligne'; el.insertBefore(enCours, n) }
    enCours.appendChild(n)
  }
  if (!el.childNodes.length) {
    const d = document.createElement('div'); d.className = 'ligne'; d.appendChild(document.createElement('br'))
    el.appendChild(d)
  }
}

/** Les $…$ de l'éditeur deviennent des formules rendues, sauf celle où est
 *  le curseur (garderCurseur : on la tape encore) ; le curseur, s'il était
 *  juste après, reste juste après */
export function convertirFormules(el: HTMLElement, rendreFormule: (latex: string, el: HTMLElement) => void, garderCurseur: boolean) {
  const sel = document.getSelection()
  const curseur = sel && sel.rangeCount && sel.isCollapsed ? { n: sel.anchorNode, o: sel.anchorOffset } : null
  const textes: Text[] = []
  const tw = document.createTreeWalker(el, NodeFilter.SHOW_TEXT)
  for (let n = tw.nextNode(); n; n = tw.nextNode()) if (!n.parentElement?.closest('.math') && n.textContent?.includes('$')) textes.push(n as Text)
  for (const t of textes) {
    const v = t.textContent ?? ''
    const ici = curseur?.n === t ? curseur.o : -1
    const fs = formulesDe(v).filter(m => !(garderCurseur && ici > m.debut && ici < m.fin))
    if (!fs.length) continue
    const morceaux: Node[] = []
    let i = 0, apres: Node | null = null
    for (const m of fs) {
      if (m.debut > i) morceaux.push(document.createTextNode(v.slice(i, m.debut)))
      morceaux.push(spanFormule(m.latex, rendreFormule))
      const z = document.createTextNode(ZL)
      morceaux.push(z)
      if (ici === m.fin) apres = z
      i = m.fin
    }
    let fin: Text | null = null
    if (i < v.length) { fin = document.createTextNode(v.slice(i)); morceaux.push(fin) }
    t.replaceWith(...morceaux)
    if (sel && apres) sel.collapse(apres, 1)
    else if (sel && fin && ici > i) sel.collapse(fin, ici - i)
  }
}

/** Le bloc de la ligne où est le curseur */
function ligneDuCurseur(el: HTMLElement): HTMLElement | null {
  const n = document.getSelection()?.anchorNode
  if (!n || !el.contains(n)) return null
  let e: Node | null = n
  while (e && e.parentNode !== el) e = e.parentNode
  return e instanceof HTMLElement ? e : null
}

/** Les blocs des lignes que touche ce qui est choisi (ou celle du curseur) */
function lignesChoisies(el: HTMLElement): HTMLElement[] {
  const s = document.getSelection()
  if (!s || !s.rangeCount) return []
  const r = s.getRangeAt(0)
  return [...el.children].filter((c): c is HTMLElement => c instanceof HTMLElement && r.intersectsNode(c))
}

function placerCurseurALaFin(el: HTMLElement) {
  const s = document.getSelection()
  if (!s) return
  const r = document.createRange()
  const der = el.lastElementChild ?? el
  r.selectNodeContents(der); r.collapse(false)
  // Pas derrière le <br> d'une ligne vide : devant lui
  if (der.lastChild?.nodeName === 'BR') { r.setStartBefore(der.lastChild); r.collapse(true) }
  s.removeAllRanges(); s.addRange(r)
}

/** Une couleur calculée (rgb(…)) en #rrggbb */
export function versHex(c: string): string {
  const m = /rgba?\(\s*(\d+)[,\s]+(\d+)[,\s]+(\d+)/.exec(c)
  if (!m) return c.toLowerCase()
  return '#' + [m[1], m[2], m[3]].map(v => Number(v).toString(16).padStart(2, '0')).join('')
}

/** L'éditeur relu en lignes du modèle, par les styles calculés de chaque
 *  morceau (quoi que le navigateur ait écrit : <b>, <strong>, <font>, des
 *  styles) : un bloc par ligne, un <br> au milieu d'une ligne en commence
 *  une autre, celui qui finit un bloc n'est que sa hauteur. */
export function lireEditeur(el: HTMLElement): LigneTexte[] {
  const base = versHex(getComputedStyle(el).color)
  const lignes: LigneTexte[] = []
  let ligne: LigneTexte | null = null
  const nouvelle = (puce: boolean) => { ligne = { morceaux: [] }; if (puce) ligne.puce = true; lignes.push(ligne) }
  const souligne = (p: Element) => {
    for (let a: Element | null = p; a && a !== el; a = a.parentElement) {
      if (getComputedStyle(a).textDecorationLine.includes('underline')) return true
    }
    return false
  }
  const ajouter = (m: MorceauTexte) => { if (!ligne) nouvelle(false); ligne!.morceaux.push(m) }
  const marcher = (n: Node, bloc: Element) => {
    if (n.nodeType === Node.TEXT_NODE) {
      const t = (n.textContent ?? '').replace(/​/g, '').replace(/\n/g, ' ')
      if (!t) return
      const p = n.parentElement ?? el, st = getComputedStyle(p)
      const m: MorceauTexte = { t }
      if ((parseInt(st.fontWeight, 10) || 400) >= 600) m.g = true
      if (st.fontStyle === 'italic' || st.fontStyle.startsWith('oblique')) m.i = true
      if (souligne(p)) m.s = true
      const c = versHex(st.color)
      if (c !== base && /^#[0-9a-f]{6}$/.test(c)) m.c = c
      ajouter(m)
      return
    }
    if (n.nodeType !== Node.ELEMENT_NODE) return
    const e = n as HTMLElement
    if (e.classList.contains('math')) {
      const m: MorceauTexte = { t: e.dataset.tex ?? '', f: true }
      const c = versHex(getComputedStyle(e).color)
      if (c !== base && /^#[0-9a-f]{6}$/.test(c)) m.c = c
      if (m.t) ajouter(m)
      return
    }
    if (e.tagName === 'BR') {
      if (!rienApres(e, bloc)) nouvelle(false)
      return
    }
    if (BLOC.test(e.tagName)) {
      nouvelle(e.classList.contains('puce') || e.tagName === 'LI')
      for (const k of [...e.childNodes]) marcher(k, e)
      return
    }
    for (const k of [...e.childNodes]) marcher(k, bloc)
  }
  let nu = false
  for (const n of [...el.childNodes]) {
    const bloc = n.nodeType === Node.ELEMENT_NODE && BLOC.test((n as Element).tagName)
    if (!bloc && !nu) { nouvelle(false); nu = true }
    if (bloc) nu = false
    marcher(n, bloc ? n as Element : el)
  }
  return lignes
}

/** Ce <br> est-il le dernier de son bloc (rien d'écrit après lui) ? */
function rienApres(br: Element, bloc: Element): boolean {
  const tw = document.createTreeWalker(bloc, NodeFilter.SHOW_ALL)
  tw.currentNode = br
  for (let n = tw.nextNode(); n; n = tw.nextNode()) {
    if (n.nodeType === Node.TEXT_NODE && (n.textContent ?? '').replace(/​/g, '')) return false
    if (n.nodeType === Node.ELEMENT_NODE && ((n as Element).tagName === 'BR' || (n as Element).classList.contains('math'))) return false
  }
  return true
}
