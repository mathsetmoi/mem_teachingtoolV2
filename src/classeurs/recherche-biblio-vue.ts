// =============================================================
// LA RECHERCHE DANS LA BIBLIOTHÈQUE : LE CHAMP ET SES RÉSULTATS
// En haut de la bibliothèque, un champ « Rechercher » (Ctrl F y va) : dès
// qu'on tape, les résultats prennent la place des cartes, en quatre
// groupes : les classeurs (par leur nom, leur classe, le nom d'une de leurs
// pages), les dossiers, les séances (par leur date ou leur nom), les
// formules écrites. Un clic ouvre le classeur (à la séance, à la page, la
// formule prise) ou le dossier. Échap efface ; le champ vide, les cartes
// reviennent. Le calcul est celui de la fenêtre de recherche (recherche.ts) ;
// le contenu des classeurs est lu en lecture seule (recherche-bibliotheque.ts).
// =============================================================
import katex from 'katex'
import type { FicheClasseur, FicheDossier } from './demarrage'
import { cheminLisible, etiquetteHeritee } from './arbre'
import { contenuDeLaBase } from './recherche-bibliotheque'
import type { ContenuClasseur } from '../recherche'
import { dateEnMots, morceaux, motsDeLatex, score } from '../recherche'
import { icone } from '../icones'
import { TOUCHE_RECHERCHE } from '../recherche-vue'

export interface HoteRechercheBiblio {
  /** Les classeurs visibles (hors corbeille) */
  fiches(): FicheClasseur[]
  dossiers(): Map<string, FicheDossier>
  /** Le classeur ouvert dans cet onglet (son contenu se lit dans le tableau) */
  contenuOuvert(): { id: string; contenu: ContenuClasseur } | null
  ouvrir(f: FicheClasseur, o: { seance?: string; page?: string; forme?: string }): void
  allerAuDossier(id: string): void
  /** Le champ s'est rempli ou vidé : les cartes s'en vont ou reviennent */
  enRecherche(oui: boolean): void
}

interface Ligne { score: number; faire: () => void; rendre: (q: string) => HTMLElement }

function el<K extends keyof HTMLElementTagNameMap>(tag: K, classe = '', texte = ''): HTMLElementTagNameMap[K] {
  const e = document.createElement(tag)
  if (classe) e.className = classe
  if (texte) e.textContent = texte
  return e
}
function surligne(texte: string, q: string): DocumentFragment {
  const f = document.createDocumentFragment()
  for (const m of morceaux(texte, q)) f.appendChild(m.trouve ? el('mark', '', m.t) : document.createTextNode(m.t))
  return f
}
function dateLongue(t: number): string {
  const s = new Date(t).toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })
  return s.charAt(0).toUpperCase() + s.slice(1)
}
function dateCourte(t: number): string {
  return new Date(t).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' }).replace('.', '')
}

export class RechercheBiblio {
  /** Le champ, pour le bandeau */
  readonly champ: HTMLElement
  /** Les résultats, à la place des cartes */
  readonly resultats: HTMLElement
  private input: HTMLInputElement
  private contenus = new Map<string, ContenuClasseur | null>()
  private lecture = 0
  private minuterie = 0

  constructor(private hote: HoteRechercheBiblio) {
    const c = this.champ = el('label', 'biblio-recherche')
    c.innerHTML = icone('loupe')
    const i = this.input = el('input')
    i.type = 'search'; i.placeholder = 'Rechercher'; i.autocomplete = 'off'; i.spellcheck = false
    i.setAttribute('aria-label', 'Rechercher un classeur, une page, une séance, une formule')
    i.title = `Un classeur, un dossier, une page, une séance, une formule (${TOUCHE_RECHERCHE})`
    c.appendChild(i)
    this.resultats = el('div', 'resultats-biblio'); this.resultats.hidden = true
    this.resultats.setAttribute('aria-live', 'polite')
    i.addEventListener('input', () => { clearTimeout(this.minuterie); this.minuterie = window.setTimeout(() => this.rafraichir(), 120) })
    i.addEventListener('keydown', e => {
      if (e.key === 'Escape' && i.value) { e.preventDefault(); e.stopPropagation(); this.vider() }
      else if (e.key === 'Enter') { e.preventDefault(); this.resultats.querySelector<HTMLElement>('.resultat-biblio')?.click() }
      else if (e.key === 'ArrowDown') { e.preventDefault(); this.resultats.querySelector<HTMLElement>('.resultat-biblio')?.focus() }
    })
  }

  get active() { return !!this.input.value.trim() }

  /** Ctrl F : le champ, son texte choisi */
  focus() { this.input.focus(); this.input.select() }

  vider() {
    this.input.value = ''
    this.rafraichir()
  }

  /** La bibliothèque s'ouvre : les contenus seront relus (ils ont pu changer) */
  oublier() { this.contenus.clear() }

  private async lire() {
    const n = ++this.lecture
    const ouvert = this.hote.contenuOuvert()
    if (ouvert) this.contenus.set(ouvert.id, ouvert.contenu)
    let lus = 0
    for (const f of [...this.hote.fiches()].sort((a, b) => b.modifie - a.modifie)) {
      if (this.contenus.has(f.id)) continue
      this.contenus.set(f.id, await contenuDeLaBase(f).catch(() => null))
      if (n !== this.lecture) return
      if (++lus % 8 === 0) this.dessiner()
    }
    if (n === this.lecture) this.dessiner()
  }

  rafraichir() {
    const actif = this.active
    this.hote.enRecherche(actif)
    this.resultats.hidden = !actif
    if (!actif) { this.resultats.replaceChildren(); return }
    this.dessiner()
    void this.lire()
  }

  private dessiner() {
    const q = this.input.value
    if (!q.trim()) return
    const dossiers = this.hote.dossiers()
    const classeurs: Ligne[] = [], lesDossiers: Ligne[] = [], seances: Ligne[] = [], formules: Ligne[] = []
    for (const f of this.hote.fiches()) {
      const classe = f.dossier === null ? null : (etiquetteHeritee(f.dossier, dossiers)?.nom ?? dossiers.get(f.dossier)?.nom ?? null)
      const chemin = f.dossier === null ? 'Bibliothèque' : cheminLisible(f.dossier, dossiers)
      const k = this.contenus.get(f.id) ?? null
      const sNom = score(q, f.nom), sChemin = sNom === null ? score(q, `${f.nom} ${chemin}`) : null
      const page = sNom === null && sChemin === null ? k?.pages.find(p => p.nom && score(q, p.nom) !== null) : undefined
      const s = sNom ?? (sChemin !== null ? sChemin - 0.5 : page ? score(q, page.nom!)! - 0.8 : null)
      if (s !== null) classeurs.push({ score: s + f.modifie / 1e15, faire: () => this.hote.ouvrir(f, page ? { page: page.id } : {}), rendre: q => {
        const b = this.bouton('classeurs')
        const t = el('span', 'rb-titre'); t.appendChild(surligne(f.nom, q))
        const n = el('small', 'rb-note')
        if (page) { n.append('Une page s\'appelle « '); n.appendChild(surligne(page.nom!, q)); n.append(' »') }
        else n.append(`${chemin} · modifié le ${dateCourte(f.modifie)}`)
        b.append(t, n)
        if (classe) b.appendChild(el('span', 'rb-etiquette', classe))
        return b
      } })
      if (!k) continue
      for (const x of k.seances) {
        const v = score(q, `${x.nom ?? ''} ${dateEnMots(x.debut)} seance ${f.nom}`)
        if (v === null) continue
        seances.push({ score: v + x.debut / 1e15, faire: () => this.hote.ouvrir(f, { seance: x.id }), rendre: q => {
          const b = this.bouton('calendrier')
          const t = el('span', 'rb-titre', dateLongue(x.debut))
          const n = el('small', 'rb-note'); n.appendChild(surligne(`${x.nom ? x.nom + ' · ' : ''}${f.nom}`, q))
          n.append(` · ${x.pages} page${x.pages > 1 ? 's' : ''}`)
          b.append(t, n)
          if (classe) b.appendChild(el('span', 'rb-etiquette', classe))
          return b
        } })
      }
      const pages = new Map(k.pages.map(p => [p.id, p]))
      for (const fo of k.formules) {
        const v = score(q, motsDeLatex(fo.latex))
        if (v === null) continue
        const p = pages.get(fo.page)
        formules.push({ score: v + f.modifie / 1e15, faire: () => this.hote.ouvrir(f, { page: fo.page, forme: fo.id }), rendre: () => {
          const b = this.bouton(null)
          const m = el('span', 'rb-formule')
          try { m.innerHTML = katex.renderToString(fo.latex, { throwOnError: false, output: 'html' }) } catch { m.textContent = fo.latex }
          b.prepend(m)
          b.append(el('span', 'rb-titre', `${f.nom} · page ${p?.numero ?? '?'}`),
            el('small', 'rb-note', p?.seance ? 'Séance du ' + dateCourte(p.seance.debut) : ''))
          if (classe) b.appendChild(el('span', 'rb-etiquette', classe))
          return b
        } })
      }
    }
    for (const d of dossiers.values()) {
      if (d.corbeille) continue
      const v = score(q, d.nom)
      if (v === null) continue
      lesDossiers.push({ score: v, faire: () => { this.vider(); this.hote.allerAuDossier(d.id) }, rendre: q => {
        const b = this.bouton('dossier')
        const t = el('span', 'rb-titre'); t.appendChild(surligne(d.nom, q))
        b.append(t, el('small', 'rb-note', d.parent ? cheminLisible(d.parent, dossiers) : 'Bibliothèque'))
        return b
      } })
    }
    const lecture = this.hote.fiches().some(f => !this.contenus.has(f.id))
    this.resultats.replaceChildren()
    const groupe = (titre: string, l: Ligne[], max: number) => {
      const h = el('h3', 'rb-groupe', titre)
      h.appendChild(el('small', '', l.length ? `${l.length} trouvé${l.length > 1 ? 's' : ''}` : (lecture ? 'recherche…' : 'aucun')))
      this.resultats.appendChild(h)
      const ul = el('ul', 'rb-liste')
      for (const x of l.sort((a, b) => b.score - a.score).slice(0, max)) {
        const li = el('li')
        const b = x.rendre(q)
        b.addEventListener('click', () => x.faire())
        li.appendChild(b); ul.appendChild(li)
      }
      this.resultats.appendChild(ul)
    }
    groupe('Classeurs', classeurs, 30)
    if (lesDossiers.length) groupe('Dossiers', lesDossiers, 12)
    groupe('Séances', seances, 20)
    groupe('Formules', formules, 20)
    if (!classeurs.length && !lesDossiers.length && !seances.length && !formules.length && !lecture)
      this.resultats.appendChild(el('p', 'rb-vide', 'Rien trouvé. L\'écriture au stylo ne se recherche pas.'))
  }

  private bouton(ic: string | null): HTMLButtonElement {
    const b = el('button', 'resultat-biblio'); b.type = 'button'
    if (ic) { const s = el('span', 'rb-icone'); s.innerHTML = icone(ic); b.appendChild(s) }
    b.addEventListener('keydown', e => {
      if (e.key !== 'ArrowDown' && e.key !== 'ArrowUp') return
      e.preventDefault()
      const l = [...this.resultats.querySelectorAll<HTMLElement>('.resultat-biblio')]
      const i = l.indexOf(b) + (e.key === 'ArrowDown' ? 1 : -1)
      if (i < 0) this.input.focus(); else l[Math.min(i, l.length - 1)]?.focus()
    })
    return b
  }
}
