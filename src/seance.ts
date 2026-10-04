// =============================================================
// UNE SÉANCE D'AUTOMATISMES
// On choisit un ou plusieurs automatismes, un mode (réponse directe,
// QCM, vrai/faux, ou au hasard pour chaque question) et un affichage :
// en diaporama — une question à la fois, qui change toutes les 30 s —
// ou les dix d'un coup. Une minuterie (5 min par défaut) tourne ; la
// correction s'affiche à la fin du temps, ou quand le professeur la
// demande.
// =============================================================
import katex from 'katex'
import type { Automatisme, Question } from './automatismes'
import { AUTOMATISMES_5E, dixQuestions } from './automatismes'

type Mode = 'directe' | 'qcm' | 'vraifaux' | 'aleatoire'
type ModeQuestion = Exclude<Mode, 'aleatoire'>
interface Item { auto: Automatisme; q: Question; mode: ModeQuestion; options: string[]; propose: string }

const CLE = 'mem-automatismes'
const html = (t: string) => t.replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]!))
const LETTRES = ['A', 'B', 'C', 'D']

/** Un texte avec des $…$ : les maths passent par KaTeX */
function rendre(texte: string): string {
  return texte.split(/(\$[^$]*\$)/).map(m => m.startsWith('$') && m.endsWith('$') && m.length > 1
    ? katex.renderToString(m.slice(1, -1), { throwOnError: false })
    : html(m)).join('')
}
const maths = (t: string) => katex.renderToString(t, { throwOnError: false })
const melanger = <T,>(t: T[]) => { const r = [...t]; for (let i = r.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [r[i], r[j]] = [r[j], r[i]] } return r }
const mmss = (s: number) => { const t = Math.max(0, Math.ceil(s - 1e-6)); return `${Math.floor(t / 60)}:${String(t % 60).padStart(2, '0')}` }

export class Seance {
  private ecran: HTMLDivElement
  private reglages = { choisis: ['priorites'] as string[], mode: 'qcm' as Mode, affichage: 'diaporama' as 'diaporama' | 'grille', minutes: 5, parDiapo: 30, correctionAuto: true }
  private items: Item[] = []
  private i = 0                    // diapo courante
  private reste = 0                // secondes restantes (toute la séance)
  private resteDiapo = 0
  private enPause = false
  private corrige = false
  private minuterie = 0
  private clavier = (e: KeyboardEvent) => this.touche(e)

  constructor(racine: HTMLElement) {
    try { Object.assign(this.reglages, JSON.parse(localStorage.getItem(CLE) || '{}')) } catch { /* rien de gardé */ }
    this.ecran = document.createElement('div')
    this.ecran.className = 'seance'
    this.ecran.setAttribute('role', 'dialog')
    this.ecran.setAttribute('aria-label', 'Automatismes')
    this.ecran.hidden = true
    racine.appendChild(this.ecran)
  }

  ouvrir() {
    this.ecran.hidden = false
    document.body.classList.add('en-seance')
    window.addEventListener('keydown', this.clavier, true)
    this.montrerReglages()
  }

  fermer() {
    clearInterval(this.minuterie)
    this.ecran.hidden = true
    document.body.classList.remove('en-seance')
    window.removeEventListener('keydown', this.clavier, true)
  }

  private garder() { try { localStorage.setItem(CLE, JSON.stringify(this.reglages)) } catch { /* refusé */ } }

  // ---------- 1. Les réglages ----------
  private montrerReglages() {
    clearInterval(this.minuterie)
    const R = this.reglages
    const themes = [...new Set(AUTOMATISMES_5E.map(a => a.theme))]
    this.ecran.innerHTML = `
      <div class="seance-reglages">
        <div class="seance-tete"><h2>Automatismes — 5<sup>e</sup></h2><button type="button" class="fermer" aria-label="Fermer">×</button></div>
        <div class="seance-colonnes">
          <fieldset class="liste-autos"><legend>Automatismes <span class="compte"></span></legend>
            ${themes.map(t => `<div class="theme"><h3>${html(t)}</h3>${AUTOMATISMES_5E.filter(a => a.theme === t).map(a =>
              `<label><input type="checkbox" value="${a.id}"${R.choisis.includes(a.id) ? ' checked' : ''}><span>${html(a.titre)}</span><button type="button" class="apercu-auto" data-id="${a.id}" title="Voir un exemple">👁</button></label>`).join('')}</div>`).join('')}
          </fieldset>
          <div class="options-seance">
            <fieldset><legend>Mode</legend>
              ${[['directe', 'Réponse directe'], ['qcm', 'QCM'], ['vraifaux', 'Vrai / Faux'], ['aleatoire', 'Au hasard (un mode par question)']].map(([v, t]) =>
                `<label><input type="radio" name="mode" value="${v}"${R.mode === v ? ' checked' : ''}><span>${t}</span></label>`).join('')}
            </fieldset>
            <fieldset><legend>Affichage</legend>
              <label><input type="radio" name="aff" value="diaporama"${R.affichage === 'diaporama' ? ' checked' : ''}><span>Diaporama, une question à la fois</span></label>
              <label><input type="radio" name="aff" value="grille"${R.affichage === 'grille' ? ' checked' : ''}><span>Les 10 questions d'un coup</span></label>
            </fieldset>
            <fieldset><legend>Temps</legend>
              <label class="nombre"><span>Minuterie</span><input type="number" class="minutes" min="1" max="60" value="${R.minutes}"> min</label>
              <label class="nombre par-diapo"><span>Une diapo toutes les</span><input type="number" class="secondes" min="5" max="300" value="${R.parDiapo}"> s</label>
              <label><input type="checkbox" class="auto"${R.correctionAuto ? ' checked' : ''}><span>Afficher la correction à la fin du temps</span></label>
            </fieldset>
            <div class="exemple-auto" aria-live="polite"></div>
            <button type="button" class="principal lancer">Lancer les 10 questions</button>
          </div>
        </div>
      </div>`
    const q = <T extends HTMLElement>(s: string) => this.ecran.querySelector(s) as T
    const compter = () => {
      const n = this.ecran.querySelectorAll('.liste-autos input:checked').length
      q('.compte').textContent = n ? `(${n} choisi${n > 1 ? 's' : ''})` : '(choisis-en au moins un)'
      q<HTMLButtonElement>('.lancer').disabled = !n
      q('.par-diapo').hidden = !(this.ecran.querySelector('input[name=aff]:checked') as HTMLInputElement).value.startsWith('diapo')
    }
    this.ecran.addEventListener('change', compter)
    compter()
    q('.fermer').addEventListener('click', () => this.fermer())
    this.ecran.querySelectorAll<HTMLButtonElement>('.apercu-auto').forEach(b => b.addEventListener('click', e => {
      e.preventDefault()
      const a = AUTOMATISMES_5E.find(x => x.id === b.dataset.id)!, ex = a.generer()
      q('.exemple-auto').innerHTML = `<strong>${html(a.titre)}</strong> — ${rendre(ex.enonce)} <span class="rep">→ ${maths(ex.reponse)}</span>`
    }))
    q('.lancer').addEventListener('click', () => {
      R.choisis = [...this.ecran.querySelectorAll<HTMLInputElement>('.liste-autos input:checked')].map(x => x.value)
      R.mode = (this.ecran.querySelector('input[name=mode]:checked') as HTMLInputElement).value as Mode
      R.affichage = (this.ecran.querySelector('input[name=aff]:checked') as HTMLInputElement).value as 'diaporama' | 'grille'
      R.minutes = Math.max(1, Number(q<HTMLInputElement>('.minutes').value) || 5)
      R.parDiapo = Math.max(5, Number(q<HTMLInputElement>('.secondes').value) || 30)
      R.correctionAuto = q<HTMLInputElement>('.auto').checked
      this.garder()
      this.lancer()
    })
  }

  // ---------- 2. La séance ----------
  private lancer() {
    const R = this.reglages
    const autos = AUTOMATISMES_5E.filter(a => R.choisis.includes(a.id))
    this.items = dixQuestions(autos).map(({ auto, q }) => {
      const mode: ModeQuestion = R.mode === 'aleatoire' ? (['directe', 'qcm', 'vraifaux'] as const)[Math.floor(Math.random() * 3)] : R.mode
      // Vrai/faux : une fois sur deux, on propose une réponse fausse
      const propose = Math.random() < 0.5 ? q.reponse : q.faux[Math.floor(Math.random() * q.faux.length)]
      return { auto, q, mode, options: melanger([q.reponse, ...q.faux.slice(0, 3)]), propose }
    })
    this.i = 0; this.corrige = false; this.enPause = false
    this.reste = R.minutes * 60
    this.resteDiapo = R.parDiapo
    this.ecran.innerHTML = `
      <div class="seance-jeu">
        <div class="barre-seance">
          <div class="titre-seance"></div>
          <div class="temps"><span class="chrono" aria-live="off"></span><div class="jauge"><div></div></div></div>
          <div class="commandes-seance">
            <button type="button" class="secondaire avant" title="Question précédente (←)">◀</button>
            <button type="button" class="secondaire pause" title="Pause (Espace)">Pause</button>
            <button type="button" class="secondaire apres" title="Question suivante (→)">▶</button>
            <button type="button" class="principal corriger" title="Afficher la correction (C)">Correction</button>
            <button type="button" class="secondaire nouveaux" title="Dix autres exemples">Nouveaux exemples</button>
            <button type="button" class="secondaire reglages" title="Changer les réglages">Réglages</button>
            <button type="button" class="fermer" aria-label="Fermer (Échap)" title="Fermer (Échap)">×</button>
          </div>
        </div>
        <div class="scene-seance"></div>
      </div>`
    const q = (s: string) => this.ecran.querySelector(s) as HTMLElement
    q('.avant').addEventListener('click', () => this.aller(this.i - 1))
    q('.apres').addEventListener('click', () => this.aller(this.i + 1))
    q('.pause').addEventListener('click', () => this.basculerPause())
    q('.corriger').addEventListener('click', () => this.corriger())
    q('.nouveaux').addEventListener('click', () => this.lancer())
    q('.reglages').addEventListener('click', () => this.montrerReglages())
    q('.fermer').addEventListener('click', () => this.fermer())
    const titres = [...new Set(this.items.map(x => x.auto.titre))]
    q('.titre-seance').textContent = titres.length === 1 ? titres[0] : `${titres.length} automatismes`
    clearInterval(this.minuterie)
    let avant = performance.now()
    this.minuterie = window.setInterval(() => {
      const t = performance.now(), dt = (t - avant) / 1000; avant = t
      if (this.enPause || this.corrige) return
      this.reste -= dt
      if (this.reglages.affichage === 'diaporama') {
        this.resteDiapo -= dt
        if (this.resteDiapo <= 0) {
          if (this.i < this.items.length - 1) this.aller(this.i + 1, true)
          else { this.reste = 0 }
        }
      }
      if (this.reste <= 0) {
        this.reste = 0
        if (this.reglages.correctionAuto) this.corriger()
        else { this.enPause = true; this.majTemps(); this.message('Temps écoulé') }
      }
      this.majTemps()
    }, 200)
    this.afficher()
  }

  private aller(i: number, auto = false) {
    if (this.reglages.affichage !== 'diaporama' || this.corrige) return
    this.i = Math.max(0, Math.min(this.items.length - 1, i))
    this.resteDiapo = this.reglages.parDiapo
    if (!auto) this.enPause = this.enPause && true
    this.afficher()
  }

  private basculerPause() {
    this.enPause = !this.enPause
    ;(this.ecran.querySelector('.pause') as HTMLElement).textContent = this.enPause ? 'Reprendre' : 'Pause'
    this.majTemps()
  }

  private corriger() {
    this.corrige = true
    this.afficher()
  }

  private message(t: string) {
    const m = document.createElement('div'); m.className = 'seance-message'; m.textContent = t
    this.ecran.appendChild(m); setTimeout(() => m.remove(), 2500)
  }

  private majTemps() {
    const chrono = this.ecran.querySelector('.chrono') as HTMLElement | null
    if (!chrono) return
    const diapo = this.reglages.affichage === 'diaporama' && !this.corrige
    chrono.textContent = (this.enPause ? 'En pause · ' : '') + mmss(this.reste) + (diapo ? `  ·  ${mmss(this.resteDiapo)}` : '')
    const jauge = this.ecran.querySelector('.jauge > div') as HTMLElement
    const part = diapo ? this.resteDiapo / this.reglages.parDiapo : this.reste / (this.reglages.minutes * 60)
    jauge.style.width = Math.max(0, Math.min(100, part * 100)) + '%'
    jauge.classList.toggle('presque', part < 0.2)
  }

  // ---------- 3. L'affichage ----------
  private afficher() {
    const scene = this.ecran.querySelector('.scene-seance') as HTMLElement
    const diapo = this.reglages.affichage === 'diaporama' && !this.corrige
    for (const s of ['.avant', '.apres']) (this.ecran.querySelector(s) as HTMLElement).hidden = !diapo
    ;(this.ecran.querySelector('.corriger') as HTMLElement).hidden = this.corrige
    ;(this.ecran.querySelector('.pause') as HTMLElement).hidden = this.corrige
    if (diapo) {
      const it = this.items[this.i]
      scene.className = 'scene-seance diapo'
      scene.innerHTML = `<div class="points-diapo">${this.items.map((_, k) => `<span class="${k === this.i ? 'ici' : k < this.i ? 'vu' : ''}"></span>`).join('')}</div>
        ${this.carte(it, this.i, false)}`
    } else {
      scene.className = 'scene-seance grille' + (this.corrige ? ' corrigee' : '')
      scene.innerHTML = this.items.map((it, k) => this.carte(it, k, this.corrige)).join('')
    }
    this.majTemps()
  }

  /** Une question, dans son mode ; corrigée si `corr` */
  private carte(it: Item, k: number, corr: boolean): string {
    const { q, mode } = it
    let corps = ''
    if (mode === 'qcm') {
      corps = `<ol class="options">${it.options.map((o, j) =>
        `<li class="${corr && o === q.reponse ? 'juste' : corr ? 'ecartee' : ''}"><span class="lettre">${LETTRES[j]}</span>${maths(o)}</li>`).join('')}</ol>`
    } else if (mode === 'vraifaux') {
      const vrai = it.propose === q.reponse
      corps = `<p class="propose">Réponse proposée : ${maths(it.propose)}</p>
        <div class="vf"><span class="${corr && vrai ? 'juste' : corr ? 'ecartee' : ''}">Vrai</span><span class="${corr && !vrai ? 'juste' : corr ? 'ecartee' : ''}">Faux</span></div>
        ${corr && !vrai ? `<p class="correction">La bonne réponse : ${maths(q.reponse)}</p>` : ''}`
    } else {
      corps = corr ? `<p class="correction">${maths(q.reponse)}</p>` : `<p class="a-repondre">…</p>`
    }
    const etiquette = { directe: 'Réponse directe', qcm: 'QCM', vraifaux: 'Vrai ou faux' }[mode]
    return `<article class="question-auto ${mode}${corr ? ' corrigee' : ''}">
      <header><span class="numero">${k + 1}</span><span class="genre">${etiquette}</span></header>
      <p class="enonce">${rendre(q.enonce)}</p>${corps}</article>`
  }

  private touche(e: KeyboardEvent) {
    if ((e.target as HTMLElement).closest('input, select, textarea')) { if (e.key === 'Escape') this.fermer(); return }
    const a: Record<string, () => void> = {
      Escape: () => this.fermer(), ArrowRight: () => this.aller(this.i + 1), ArrowLeft: () => this.aller(this.i - 1),
      PageDown: () => this.aller(this.i + 1), PageUp: () => this.aller(this.i - 1),
      ' ': () => this.basculerPause(), c: () => this.corriger(), C: () => this.corriger(),
    }
    if (!a[e.key] || !this.ecran.querySelector('.seance-jeu') && e.key !== 'Escape') return
    e.preventDefault(); e.stopPropagation()
    a[e.key]()
  }
}
