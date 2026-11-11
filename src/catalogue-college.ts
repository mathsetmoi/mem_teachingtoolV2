// =============================================================
// LE PROGRAMME DU COLLÈGE DANS LE CATALOGUE (5e, 4e, 3e)
// Les onglets 5e, 4e et 3e du catalogue montrent tout le programme du
// cycle 4 (programme-cycle4.ts), rangé comme lui : un titre par thème,
// un domaine qu'on déplie, et dans le domaine ses automatismes, ses
// objectifs d'apprentissage et ses prolongements possibles.
//  - « Poser » met la phrase sur la page, dans un encadré bleu
//    « Programme » (des formules et un cadre, groupés : on le déplace, on
//    écrit à côté, Ctrl + Z le retire ; il passe dans le replay).
//    « Poser tout le domaine » met tout le domaine dans un même encadré.
//  - « Exemple », sous un objectif qui a des exercices d'application
//    directe : un exercice tiré au hasard, posé là où l'on clique. C (ou
//    « Correction ») écrit la réponse en vert dessous, et la phrase du
//    programme en petit et en bleu, comme au flash. « Un autre exemple »
//    en pose un nouveau juste en dessous.
//  - « Flash sur ce domaine » ouvre le réglage du flash avec ce domaine
//    seul coché (seulement s'il a des automatismes dans le flash).
// =============================================================
import katex from 'katex'
import type { App } from './app'
import type { Automatisme, Question } from './automatismes'
import { NIVEAUX, themesDe } from './automatismes'
import type { P } from './construction'
import type { Figure, Formule, ImageForme } from './types'
import { uid } from './types'
import { rasteriser, reponseEnLatex, texteEnLatex } from './flash'
import type { Domaine, NiveauCollege } from './programme-cycle4'
import { NIVEAUX_COLLEGE, PROGRAMME_CYCLE4 } from './programme-cycle4'

const html = (t: string) => t.replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]!))
const sansAccents = (t: string) => t.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase()

/** Le bleu de l'encadré et de la phrase du programme (celui du flash) */
const BLEU = '#1f5fbf'
/** Le vert de la correction (celui du flash) */
const VERT = '#1e8a4c'
const GRIS = '#6b7686'
/** Les tailles, en unités du tableau */
const T_TITRE = 14, T_PHRASE = 20, T_SOUS_TITRE = 15, T_EXO = 24
/** La largeur du texte d'un encadré, d'un exemple */
const L_ENCADRE = 640, L_EXO = 620
const MARGE = 14

/** Ce que le panneau du catalogue prête */
export interface OutilsProgramme {
  mesurer: (latex: string, taille: number) => { l: number; h: number }
  placer: (fantomes: (w: P) => Figure[], poser: (w: P) => void) => void
  peutPoser: () => boolean
  message: (t: string) => void
  ouvrirFlash: (cocher: string[]) => void
}

// Le LaTeX d'un texte et d'une réponse : les mêmes que le flash (flash.ts)
export { texteEnLatex }

/** Une compétence : le niveau, le thème, le domaine, et « a3 » (automatisme), « o3 » (objectif) ou « p3 » (prolongement) */
interface Cle { niveau: NiveauCollege; t: number; d: number; sorte: 'a' | 'o' | 'p'; k: number }
const cleEnTexte = (c: Cle) => `${c.niveau}|${c.t}|${c.d}|${c.sorte}${c.k}`
function lireCle(s: string): Cle | null {
  const m = /^(5e|4e|3e)\|(\d+)\|(\d+)\|([aop])(\d+)$/.exec(s)
  return m ? { niveau: m[1] as NiveauCollege, t: +m[2], d: +m[3], sorte: m[4] as Cle['sorte'], k: +m[5] } : null
}
const domaineDe = (c: { niveau: NiveauCollege; t: number; d: number }) => PROGRAMME_CYCLE4[c.niveau][c.t]?.domaines[c.d]
function texteDe(c: Cle): string | undefined {
  const d = domaineDe(c)
  if (!d) return undefined
  return c.sorte === 'a' ? d.automatismes[c.k] : c.sorte === 'o' ? d.objectifs[c.k]?.texte : d.prolongements?.[c.k]
}

/** Tous les exercices, par leur id */
const PAR_ID = new Map<string, Automatisme>(NIVEAUX.flatMap(n => n.automatismes).map(a => [a.id, a]))
/** Les exercices d'un objectif (ceux qui existent) */
export function exemplesDe(c: Cle): Automatisme[] {
  if (c.sorte !== 'o') return []
  return (domaineDe(c)?.objectifs[c.k]?.exemples ?? []).map(id => PAR_ID.get(id)).filter((a): a is Automatisme => !!a)
}

/** Le thème du flash qui correspond à un domaine (« Repérage » pour
 *  « Repérage sur une droite et dans le plan »), s'il y en a un */
export function themeDuFlash(niveau: NiveauCollege, d: Domaine): string | null {
  const n = NIVEAUX.find(x => x.id === niveau)
  if (!n || !d.automatismes.length) return null
  const themes = themesDe(n)
  return themes.find(t => t === d.nom) ?? themes.find(t => d.nom.startsWith(t) || t.startsWith(d.nom)) ?? null
}

/** L'exemple posé en dernier : où il est, et sa question */
interface ExempleEnCours {
  cle: Cle
  page: string
  x: number
  /** Le bas de l'énoncé : la réponse s'écrit dessous */
  bas: number
  groupe: string
  q: Question
  programme: string
  corrige: boolean
}

export class Programme {
  private exemple: ExempleEnCours | null = null
  private panneau: HTMLElement | null = null

  constructor(private app: App, private o: OutilsProgramme) {}

  /** Une ligne du panneau : le texte en clair, seules les maths par KaTeX */
  private ligneHtml(l: string): string {
    return l.split('$').map((m, i) => i % 2 ? katex.renderToString(m, { throwOnError: false }) : html(m)).join('')
  }

  // ---------- Le panneau ----------
  /** Le contenu d'un onglet de niveau */
  html(niveau: NiveauCollege, ouverts: Set<string>): string {
    return PROGRAMME_CYCLE4[niveau].map((th, t) => `
      <h3>${html(th.nom)}</h3>${th.domaines.length ? th.domaines.map((d, i) => {
        const cle = `${niveau}|${t}|${i}`
        const nb = d.automatismes.length + d.objectifs.length
        return `<details class="chapitre domaine-prog" data-cle="${html(cle)}"${ouverts.has(cle) ? ' open' : ''}>
          <summary>${html(d.nom)}<span class="nombre">${nb}</span></summary>
          <div class="demos">${this.htmlDomaine(niveau, t, i, d)}</div>
        </details>`
      }).join('') : '<p class="note">Rien au programme dans ce thème.</p>'}`).join('')
  }

  private htmlDomaine(niveau: NiveauCollege, t: number, i: number, d: Domaine): string {
    const flash = themeDuFlash(niveau, d)
    const ligne = (c: Cle, texte: string) => {
      const ex = exemplesDe(c).length
      return `<div class="ligne-prog"><span class="sorte-prog sorte-${c.sorte}">${c.sorte === 'a' ? 'auto' : c.sorte === 'o' ? 'obj' : 'plus'}</span>
        <span class="texte-prog">${this.ligneHtml(texte)}</span>
        <span class="actions-prog"><button type="button" class="secondaire petit poser-prog" data-p="${cleEnTexte(c)}">Poser</button>${ex ? `<button type="button" class="secondaire petit exemple-prog" data-p="${cleEnTexte(c)}" title="Un exercice d'application directe, tiré au hasard">Exemple</button>` : ''}</span></div>`
    }
    const c = (sorte: Cle['sorte'], k: number): Cle => ({ niveau, t, d: i, sorte, k })
    return `<div class="tete-domaine">${flash ? `<button type="button" class="secondaire petit flash-prog" data-flash="${html(niveau + '/' + flash)}">Flash sur ce domaine</button>` : ''}<button type="button" class="secondaire petit tout-prog" data-domaine="${niveau}|${t}|${i}">Poser tout le domaine</button></div>
      ${d.automatismes.length ? `<p class="sous-titre-prog">Automatismes</p>${d.automatismes.map((x, k) => ligne(c('a', k), x)).join('')}` : ''}
      ${d.objectifs.length ? `<p class="sous-titre-prog">Objectifs d’apprentissage</p>${d.objectifs.map((x, k) => ligne(c('o', k), x.texte)).join('')}` : ''}
      ${d.prolongements?.length ? `<p class="sous-titre-prog">Prolongements possibles</p>${d.prolongements.map((x, k) => ligne(c('p', k), x)).join('')}` : ''}`
  }

  /** L'exemple en cours, sous le rangement */
  htmlPilote(): string {
    return `<section class="element exemple-en-cours" hidden>
      <h3>Exemple</h3>
      <p class="note objectif-exemple"></p>
      <div class="actions-construction">
        <button type="button" class="principal corriger-exemple" title="Montrer la réponse (C)">Correction</button>
        <button type="button" class="secondaire autre-exemple">Un autre exemple</button>
      </div>
    </section>`
  }

  brancher(p: HTMLElement) {
    this.panneau = p
    p.addEventListener('click', e => {
      const b = (e.target as HTMLElement).closest<HTMLButtonElement>('.poser-prog, .exemple-prog, .tout-prog, .flash-prog, .corriger-exemple, .autre-exemple')
      if (!b) return
      if (b.classList.contains('flash-prog')) { this.o.ouvrirFlash([b.dataset.flash!]); return }
      if (b.classList.contains('corriger-exemple')) { this.corriger(); return }
      if (b.classList.contains('autre-exemple')) { if (this.exemple) void this.poserExemple(this.exemple.cle, true); return }
      if (b.classList.contains('tout-prog')) {
        const [niveau, t, d] = b.dataset.domaine!.split('|')
        this.poserDomaine({ niveau: niveau as NiveauCollege, t: +t, d: +d })
        return
      }
      const c = lireCle(b.dataset.p ?? '')
      if (!c) return
      if (b.classList.contains('exemple-prog')) void this.poserExemple(c, false); else this.poserPhrase(c)
    })
  }

  /** Les lignes du programme qui contiennent tous ces mots (recherche du catalogue) */
  resultats(mots: string[]): string {
    const lignes: string[] = []
    let lieu = '', n = 0
    for (const niveau of NIVEAUX_COLLEGE) PROGRAMME_CYCLE4[niveau].forEach((th, t) => th.domaines.forEach((d, i) => {
      const toutes: [Cle, string][] = [
        ...d.automatismes.map((x, k): [Cle, string] => [{ niveau, t, d: i, sorte: 'a', k }, x]),
        ...d.objectifs.map((x, k): [Cle, string] => [{ niveau, t, d: i, sorte: 'o', k }, x.texte]),
        ...(d.prolongements ?? []).map((x, k): [Cle, string] => [{ niveau, t, d: i, sorte: 'p', k }, x]),
      ]
      for (const [c, x] of toutes) {
        const texte = sansAccents([x.replace(/\\[a-zA-Z]+/g, ' '), d.nom, th.nom, niveau].join(' '))
        if (!mots.every(m => texte.includes(m))) continue
        n++
        if (n > 40) continue
        const ici = `Programme de ${niveau} · ${d.nom}`
        if (ici !== lieu) lignes.push(`<p class="lieu">${html(ici)}</p>`)
        lieu = ici
        const ex = exemplesDe(c).length
        lignes.push(`<div class="ligne-prog"><span class="sorte-prog sorte-${c.sorte}">${c.sorte === 'a' ? 'auto' : c.sorte === 'o' ? 'obj' : 'plus'}</span>
          <span class="texte-prog">${this.ligneHtml(x)}</span>
          <span class="actions-prog"><button type="button" class="secondaire petit poser-prog" data-p="${cleEnTexte(c)}">Poser</button>${ex ? `<button type="button" class="secondaire petit exemple-prog" data-p="${cleEnTexte(c)}">Exemple</button>` : ''}</span></div>`)
      }
    }))
    if (n > 40) lignes.push(`<p class="note">Et ${n - 40} autres lignes du programme : précisez la recherche.</p>`)
    return lignes.join('')
  }

  /** C : la correction de l'exemple, s'il est sur cette page */
  touche(e: KeyboardEvent): boolean {
    const ex = this.exemple
    if (!ex || ex.corrige || ex.page !== this.app.page) return false
    if ((e.key !== 'c' && e.key !== 'C') || e.ctrlKey || e.metaKey || e.altKey) return false
    e.preventDefault(); e.stopPropagation()
    this.corriger()
    return true
  }

  /** Oublie l'exemple en cours (le panneau se ferme) */
  terminer() {
    this.exemple = null
    this.afficher()
  }

  private afficher() {
    const s = this.panneau?.querySelector<HTMLElement>('.exemple-en-cours')
    if (!s) return
    const ex = this.exemple
    s.hidden = !ex
    if (!ex) return
    s.querySelector('.objectif-exemple')!.innerHTML = this.ligneHtml(ex.programme)
    const b = s.querySelector<HTMLButtonElement>('.corriger-exemple')!
    b.disabled = ex.corrige
    b.textContent = ex.corrige ? 'Corrigé ✓' : 'Correction'
  }

  // ---------- Poser ----------
  /** Un texte coupé en lignes qui tiennent dans la largeur W (les maths, entre $, ne se coupent pas) */
  private couper(texte: string, W: number, T: number): string[] {
    const colles: string[] = []
    let espace = true
    for (const m of texte.match(/\$[^$]*\$|[^\s$]+|\s+/g) ?? []) {
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
      if (ligne && this.o.mesurer(texteEnLatex(essai), T).l > W) { lignes.push(ligne); ligne = m } else ligne = essai
    }
    if (ligne) lignes.push(ligne)
    return lignes
  }

  private formule(latex: string, x: number, y: number, taille: number, couleur: string, groupe: string): string {
    const f: Formule = { id: uid(), type: 'formule', x, y, latex, couleur, taille, z: Date.now(), auteur: this.app.tableau.moi, groupe }
    this.app.tableau.poser(this.app.page, f)
    return f.id
  }

  private cadre(o: P, l: number, h: number, tirets: boolean): Figure {
    const f = this.app.nouvelleFigure({ type: 'polygone', ferme: true, pts: [o, { x: o.x + l, y: o.y }, { x: o.x + l, y: o.y + h }, { x: o.x, y: o.y + h }] })
    f.couleur = BLEU
    if (tirets) f.tirets = true
    return f
  }

  /** Un encadré « Programme » : son titre, puis des morceaux (un sous-titre, ou une phrase avec ou sans puce) */
  private async poserEncadre(titre: string, morceaux: { texte: string; sous?: boolean; puce?: boolean }[]) {
    if (!this.o.peutPoser()) return
    await this.polices()
    const tTitre = `\\textsf{${texteEnLatex(titre).replace(/^\\text/, '')}}`
    // La mise en page, une fois : chaque ligne et son décalage
    const lignes: { latex: string; dx: number; dy: number; taille: number; couleur: string }[] = []
    let y = 0
    const mt = this.o.mesurer(tTitre, T_TITRE)
    lignes.push({ latex: tTitre, dx: 0, dy: y, taille: T_TITRE, couleur: BLEU })
    y += mt.h + 6
    const puce = this.o.mesurer('\\bullet\\;', T_PHRASE).l
    for (const m of morceaux) {
      if (m.sous) {
        const latex = `\\textbf{${texteEnLatex(m.texte)}}`
        y += 4
        lignes.push({ latex, dx: 0, dy: y, taille: T_SOUS_TITRE, couleur: BLEU })
        y += this.o.mesurer(latex, T_SOUS_TITRE).h + 2
        continue
      }
      const dx = m.puce ? puce : 0
      this.couper(m.texte, L_ENCADRE - dx, T_PHRASE).forEach((l, k) => {
        if (m.puce && k === 0) lignes.push({ latex: '\\bullet', dx: 0, dy: y, taille: T_PHRASE, couleur: this.app.couleur })
        const latex = texteEnLatex(l)
        lignes.push({ latex, dx, dy: y, taille: T_PHRASE, couleur: this.app.couleur })
        y += Math.max(this.o.mesurer(latex, T_PHRASE).h, T_PHRASE * 1.25)
      })
      y += 3
    }
    const l = Math.max(...lignes.map(x => x.dx + this.o.mesurer(x.latex, x.taille).l)) + 2 * MARGE
    const h = y + 2 * MARGE
    // Un grand encadré (tout un domaine) part du pointeur vers le bas
    const coin = (w: P) => ({ x: w.x - l / 2, y: w.y - Math.min(h / 2, 120) })
    this.o.placer(w => [this.cadre(coin(w), l, h, true)], w => {
      const c = coin(w)
      const groupe = uid()
      this.app.tableau.nouveauGeste()
      const f = this.cadre(c, l, h, false)
      f.groupe = groupe
      this.app.tableau.poser(this.app.page, f)
      for (const x of lignes) this.formule(x.latex, c.x + MARGE + x.dx, c.y + MARGE + x.dy, x.taille, x.couleur, groupe)
      this.o.message('Encadré posé : on le déplace, on écrit à côté, Ctrl + Z le retire.')
    })
  }

  /** Les polices de KaTeX, chargées avant de mesurer : sinon la première
   *  mesure se fait avec une autre police, et le texte sort du cadre */
  private async polices() {
    this.o.mesurer('\\text{a}\\textbf{a}\\textsf{a}\\textit{a}\\bullet', T_PHRASE)
    await document.fonts?.ready
  }

  private titre(c: { niveau: NiveauCollege; t: number; d: number }) {
    return `PROGRAMME · ${c.niveau} · ${PROGRAMME_CYCLE4[c.niveau][c.t].nom} · ${domaineDe(c)!.nom}`
  }

  poserPhrase(c: Cle) {
    const texte = texteDe(c)
    if (!texte) return
    const sorte = c.sorte === 'a' ? 'Automatisme' : c.sorte === 'o' ? 'Objectif d’apprentissage' : 'Prolongement possible'
    void this.poserEncadre(this.titre(c), [{ texte: sorte, sous: true }, { texte }])
  }

  poserDomaine(c: { niveau: NiveauCollege; t: number; d: number }) {
    const d = domaineDe(c)
    if (!d) return
    const m: { texte: string; sous?: boolean; puce?: boolean }[] = []
    if (d.automatismes.length) m.push({ texte: 'Automatismes', sous: true }, ...d.automatismes.map(texte => ({ texte, puce: true })))
    if (d.objectifs.length) m.push({ texte: 'Objectifs d’apprentissage', sous: true }, ...d.objectifs.map(x => ({ texte: x.texte, puce: true })))
    void this.poserEncadre(this.titre(c), m)
  }

  /** Un exercice d'application directe de l'objectif, tiré au hasard.
   *  dessous : sous l'exemple précédent, s'il est sur cette page */
  async poserExemple(c: Cle, dessous: boolean) {
    if (!this.o.peutPoser()) return
    const liste = exemplesDe(c), programme = texteDe(c)
    if (!liste.length || !programme) return
    const a = liste[Math.floor(Math.random() * liste.length)]
    const q = a.trou && Math.random() < 1 / 3 ? a.trou() : a.generer()
    const page = this.app.page
    await this.polices()
    // Le dessin de la question, rangé dans le classeur (une image)
    let image: { src: string; l: number; h: number } | null = null
    if (q.figure) {
      const img = await rasteriser(q.figure, this.app.couleur).catch(() => null)
      if (img) image = { src: this.app.rangerImage(img.donnees), l: img.l, h: img.h }
    }
    if (this.app.page !== page) return
    const lignes = this.couper(q.enonce, L_EXO, T_EXO).map(texteEnLatex)
    const etiquette = `\\textsf{${texteEnLatex('Exemple').replace(/^\\text/, '')}}`
    let h = this.o.mesurer(etiquette, T_TITRE).h + 4
    const dys = lignes.map(l => { const y = h; h += Math.max(this.o.mesurer(l, T_EXO).h, T_EXO * 1.2); return y })
    let img: { dy: number; l: number; h: number } | null = null
    if (image) {
      const k = Math.min((T_EXO * 5) / image.h, L_EXO / image.l)
      img = { dy: h + T_EXO * 0.3, l: image.l * k, h: image.h * k }
      h = img.dy + img.h + T_EXO * 0.3
    }
    const l = Math.max(L_EXO / 2, ...lignes.map(x => this.o.mesurer(x, T_EXO).l), img?.l ?? 0)
    const poser = (o: P) => {
      const groupe = uid()
      this.app.tableau.nouveauGeste()
      this.formule(etiquette, o.x, o.y, T_TITRE, GRIS, groupe)
      lignes.forEach((x, k) => this.formule(x, o.x, o.y + dys[k], T_EXO, this.app.couleur, groupe))
      if (image && img) {
        const e = img.l / image.l
        const forme: ImageForme = { id: uid(), type: 'image', src: image.src, l: image.l, h: image.h, m: [e, 0, 0, e], x: o.x, y: o.y + img.dy, z: Date.now(), auteur: this.app.tableau.moi, groupe }
        this.app.tableau.poser(this.app.page, forme)
      }
      this.exemple = { cle: c, page: this.app.page, x: o.x, bas: o.y + h, groupe, q, programme, corrige: false }
      // Pour le résumé de la séance (resume/fiche.ts)
      this.app.tableau.noterActivite(this.app.page, 'flash', `Exemple : ${a.titre}`)
      this.afficher()
      this.o.message('Exemple posé : C pour la correction.')
    }
    const avant = this.exemple
    if (dessous && avant && avant.page === this.app.page) {
      poser({ x: avant.x, y: avant.bas + T_EXO * (avant.corrige ? 1.2 : 3.5) })
      return
    }
    this.o.placer(w => [this.cadre({ x: w.x - l / 2, y: w.y - h / 2 }, l, h, true)], w => poser({ x: w.x - l / 2, y: w.y - h / 2 }))
  }

  /** La réponse en vert sous l'exemple, puis la phrase du programme en petit et en bleu */
  corriger() {
    const ex = this.exemple
    if (!ex || ex.corrige) return
    if (ex.page !== this.app.page) { this.o.message('L’exemple est sur une autre page.'); return }
    this.app.tableau.nouveauGeste()
    let y = ex.bas + 4
    const r = ex.q.reponse
    const lignes = r.startsWith('§') ? this.couper('Réponse : ' + r.slice(1), L_EXO, T_EXO).map(texteEnLatex) : [`\\text{Réponse : }${reponseEnLatex(r)}`]
    for (const l of lignes) {
      this.formule(l, ex.x, y, T_EXO, VERT, ex.groupe)
      y += Math.max(this.o.mesurer(l, T_EXO).h, T_EXO * 1.2)
    }
    const tp = T_EXO * 0.62
    for (const l of this.couper(ex.programme, L_EXO, tp)) {
      const latex = `\\textit{${texteEnLatex(l)}}`
      this.formule(latex, ex.x, y, tp, BLEU, ex.groupe)
      y += Math.max(this.o.mesurer(latex, tp).h, tp * 1.2)
    }
    ex.bas = y
    ex.corrige = true
    this.afficher()
  }
}
