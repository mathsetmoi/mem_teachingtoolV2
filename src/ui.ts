// =============================================================
// L'INTERFACE
// Elle ne décide de rien : elle montre l'état de l'application et
// lui transmet les clics. Tout est reconstruit par « maj() ».
// =============================================================
import katex from 'katex'
import type { App, Interface } from './app'
import { COULEURS, TAILLES } from './app'
import type { Outil } from './types'
import { FONDS } from './types'

const ICONES: Record<string, string> = {
  stylo: 'M4 20l4-1L19 8l-3-3L5 16l-1 4zM14 7l3 3',
  surligneur: 'M14 4l6 6-8 8H6v-6zM4 21h9',
  gomme: 'M8 20h12M4.5 15.5l9-9 6 6-7.5 7.5H8.5z',
  segment: 'M6 18L18 6M4 18a2 2 0 104 0 2 2 0 10-4 0M16 6a2 2 0 104 0 2 2 0 10-4 0',
  formule: 'M3 13h3l3 7 4-16h8',
  selection: 'M5 3l14 8-6.5 1.8L10.5 19z',
  main: 'M12 3v18M3 12h18M12 3l-3 3M12 3l3 3M12 21l-3-3M12 21l3-3M3 12l3-3M3 12l3 3M21 12l-3-3M21 12l-3 3',
  annuler: 'M9 14L4 9l5-5M4 9h10a6 6 0 010 12h-3',
  retablir: 'M15 14l5-5-5-5M20 9H10a6 6 0 000 12h3',
  poubelle: 'M4 7h16M10 11v6M14 11v6M6 7l1 13h10l1-13M9 7V4h6v3',
  plus: 'M12 5v14M5 12h14',
  moins: 'M5 12h14',
  avant: 'M15 6l-6 6 6 6',
  apres: 'M9 6l6 6-6 6',
  aimant: 'M6 4v8a6 6 0 0012 0V4h-4v8a2 2 0 01-4 0V4zM6 8h4M14 8h4',
  partager: 'M4 13v7h16v-7M12 3v12M8 7l4-4 4 4',
}

const OUTILS: { id: Outil; nom: string; touche: string }[] = [
  { id: 'stylo', nom: 'Stylo', touche: 'P' },
  { id: 'surligneur', nom: 'Surligneur', touche: 'H' },
  { id: 'gomme', nom: 'Gomme', touche: 'E' },
  { id: 'segment', nom: 'Segment (Maj : angles de 15°)', touche: 'L' },
  { id: 'formule', nom: 'Formule', touche: 'F' },
  { id: 'selection', nom: 'Sélectionner et déplacer', touche: 'V' },
  { id: 'main', nom: 'Déplacer la vue', touche: 'Espace' },
]

const RACCOURCIS_LATEX = [
  ['\\frac{a}{b}', '\\frac{}{}'], ['\\sqrt{x}', '\\sqrt{}'], ['x^{n}', '^{}'], ['x_{n}', '_{}'],
  ['\\vec{u}', '\\vec{}'], ['\\overrightarrow{AB}', '\\overrightarrow{}'], ['\\in', '\\in '],
  ['\\mathbb{R}', '\\mathbb{R}'], ['\\leqslant', '\\leqslant '], ['\\infty', '\\infty'],
  ['\\pi', '\\pi'], ['\\lim', '\\lim_{x \\to }'],
]

function icone(nom: string) {
  return `<svg viewBox="0 0 24 24" aria-hidden="true"><path d="${ICONES[nom]}"/></svg>`
}

function bouton(nom: string, titre: string, action: () => void, classe = '') {
  const b = document.createElement('button')
  b.type = 'button'
  b.className = 'bouton ' + classe
  b.innerHTML = icone(nom)
  b.title = titre
  b.setAttribute('aria-label', titre)
  b.addEventListener('click', action)
  return b
}

export class UI implements Interface {
  private outils = new Map<Outil, HTMLButtonElement>()
  private pastilles: HTMLButtonElement[] = []
  private tailles: HTMLButtonElement[] = []
  private boutonSupprimer!: HTMLButtonElement
  private rang!: HTMLSpanElement
  private choixFond!: HTMLSelectElement
  private boutonAimant!: HTMLButtonElement
  private zoomTexte!: HTMLButtonElement
  private etat!: HTMLSpanElement
  private bandeau!: HTMLDivElement
  private barreOutils!: HTMLElement
  private outilsPage: HTMLElement[] = []
  private toast!: HTMLDivElement
  private dialogue: HTMLDialogElement | null = null

  constructor(private app: App, private racine: HTMLElement, private partager: () => Promise<string | null>) {
    this.construire()
    app.ui = this
    app.tableau.surEtat = () => this.maj()
    this.maj()
  }

  private construire() {
    const app = this.app

    // ----- Barre des outils, à gauche -----
    const outils = document.createElement('nav')
    outils.className = 'barre barre-outils'
    outils.setAttribute('aria-label', 'Outils')
    for (const o of OUTILS) {
      const b = bouton(o.id, `${o.nom} (${o.touche})`, () => app.choisirOutil(o.id), 'outil')
      this.outils.set(o.id, b)
      outils.appendChild(b)
    }
    outils.appendChild(Object.assign(document.createElement('hr'), { className: 'filet' }))
    for (const c of COULEURS) {
      const b = document.createElement('button')
      b.type = 'button'; b.className = 'pastille'; b.title = c.nom; b.setAttribute('aria-label', c.nom)
      b.style.setProperty('--teinte', c.valeur)
      b.addEventListener('click', () => { app.couleur = c.valeur; if (app.outil !== 'surligneur' && app.outil !== 'segment' && app.outil !== 'formule') app.choisirOutil('stylo'); this.maj() })
      this.pastilles.push(b); outils.appendChild(b)
    }
    const rangee = document.createElement('div'); rangee.className = 'tailles'
    TAILLES.forEach((t, i) => {
      const b = document.createElement('button')
      b.type = 'button'; b.className = 'taille'; b.title = t.nom; b.setAttribute('aria-label', 'Trait ' + t.nom.toLowerCase())
      b.innerHTML = `<span style="--d:${4 + i * 4}px"></span>`
      b.addEventListener('click', () => { app.taille = t.valeur; this.maj() })
      this.tailles.push(b); rangee.appendChild(b)
    })
    outils.appendChild(rangee)
    outils.appendChild(Object.assign(document.createElement('hr'), { className: 'filet' }))
    outils.appendChild(bouton('annuler', 'Annuler (Ctrl+Z)', () => app.annuler()))
    outils.appendChild(bouton('retablir', 'Rétablir (Ctrl+Y)', () => app.retablir()))
    this.boutonSupprimer = bouton('poubelle', 'Supprimer la sélection (Suppr)', () => app.supprimerSelection(), 'danger')
    outils.appendChild(this.boutonSupprimer)
    this.barreOutils = outils

    // ----- Barre des pages, en haut à droite -----
    const haut = document.createElement('div')
    haut.className = 'barre barre-haut'
    const avant = bouton('avant', 'Page précédente (Page ↑)', () => app.pageSuivante(-1))
    this.rang = document.createElement('span'); this.rang.className = 'rang'
    const apres = bouton('apres', 'Page suivante (Page ↓)', () => app.pageSuivante(1))
    const nouvelle = bouton('plus', 'Nouvelle page', () => app.nouvellePage())
    const jeter = bouton('poubelle', 'Supprimer cette page', () => {
      if (confirm('Supprimer cette page et tout ce qui y est écrit ?')) app.supprimerPage()
    }, 'danger')
    this.choixFond = document.createElement('select')
    this.choixFond.className = 'choix-fond'
    this.choixFond.setAttribute('aria-label', 'Fond de la page')
    for (const f of FONDS) this.choixFond.add(new Option(f.nom, f.id))
    this.choixFond.addEventListener('change', () => app.changerFond(this.choixFond.value as never))
    this.boutonAimant = bouton('aimant', 'Aimanter au quadrillage', () => { app.aimant = !app.aimant; this.maj() }, 'outil')
    this.outilsPage = [nouvelle, jeter, this.choixFond, this.boutonAimant]
    haut.append(avant, this.rang, apres, nouvelle, jeter, this.choixFond, this.boutonAimant)

    if (app.role === 'prof') {
      const p = document.createElement('button')
      p.type = 'button'; p.className = 'partager'
      p.innerHTML = icone('partager') + '<span>Partager</span>'
      p.addEventListener('click', () => this.ouvrirPartage())
      haut.appendChild(p)
    }
    this.etat = document.createElement('span'); this.etat.className = 'etat'
    haut.appendChild(this.etat)

    // ----- Zoom, en bas à droite -----
    const zoom = document.createElement('div')
    zoom.className = 'barre barre-zoom'
    this.zoomTexte = document.createElement('button')
    this.zoomTexte.type = 'button'; this.zoomTexte.className = 'zoom-texte'; this.zoomTexte.title = 'Revenir à 100 %'
    this.zoomTexte.addEventListener('click', () => app.zoom100())
    zoom.append(bouton('moins', 'Dézoomer', () => app.zoomer(1 / 1.25)), this.zoomTexte, bouton('plus', 'Zoomer', () => app.zoomer(1.25)))

    // ----- Bandeau élève -----
    this.bandeau = document.createElement('div')
    this.bandeau.className = 'bandeau'

    this.toast = document.createElement('div')
    this.toast.className = 'toast'; this.toast.setAttribute('role', 'status')

    this.racine.append(outils, haut, zoom, this.bandeau, this.toast)
  }

  maj() {
    const app = this.app
    const ecrit = app.peutEcrire
    this.barreOutils.hidden = !ecrit
    for (const [id, b] of this.outils) b.classList.toggle('actif', app.outil === id)
    this.pastilles.forEach((b, i) => b.classList.toggle('actif', COULEURS[i].valeur === app.couleur))
    this.tailles.forEach((b, i) => b.classList.toggle('actif', TAILLES[i].valeur === app.taille))
    this.boutonSupprimer.hidden = app.selection.size === 0

    const pages = app.pages, i = pages.indexOf(app.page)
    this.rang.textContent = pages.length ? `${i + 1} / ${pages.length}` : '…'
    this.choixFond.value = app.fond
    this.boutonAimant.classList.toggle('actif', app.aimant)
    for (const el of this.outilsPage) el.hidden = app.role !== 'prof'
    this.zoomTexte.textContent = Math.round(app.cam.z * 100) + ' %'

    // État de la connexion, en mots simples
    const t = app.tableau
    const eleves = [...t.autres().values()].filter(p => p.role === 'eleve').length
    const textes: Record<string, string> = {
      'hors-ligne': 'Sur cet appareil',
      'connexion': 'Connexion…',
      'en-ligne': app.role === 'prof' ? (eleves ? `${eleves} élève${eleves > 1 ? 's' : ''} connecté${eleves > 1 ? 's' : ''}` : 'En ligne, aucun élève') : 'Connecté au tableau du prof',
      'injoignable': 'Serveur injoignable',
    }
    this.etat.textContent = textes[t.etat]
    this.etat.dataset.etat = t.etat

    // Élève : où en est-on par rapport au prof ?
    this.bandeau.replaceChildren()
    if (app.role === 'eleve') {
      if (!app.suivre) {
        const b = document.createElement('button')
        b.type = 'button'; b.textContent = 'Revenir au tableau du prof'
        b.addEventListener('click', () => app.revenirAuProf())
        this.bandeau.appendChild(b)
      }
      if (!ecrit) {
        const s = document.createElement('span'); s.textContent = 'Lecture seule'
        this.bandeau.appendChild(s)
      }
    }
    this.bandeau.hidden = !this.bandeau.childElementCount
  }

  message(texte: string) {
    this.toast.textContent = texte
    this.toast.classList.add('visible')
    clearTimeout((this.toast as unknown as { t: number }).t)
    ;(this.toast as unknown as { t: number }).t = window.setTimeout(() => this.toast.classList.remove('visible'), 2600)
  }

  // ----- Partage -----
  private async ouvrirPartage() {
    const lien = await this.partager()
    if (!lien) return
    const d = this.nouveauDialogue('Faire entrer la classe')
    const corps = d.querySelector('.corps')!
    corps.innerHTML = `
      <p>Les élèves ouvrent ce lien sur leur appareil. Ils voient votre tableau en direct et suivent vos changements de page.</p>
      <div class="lien"><input readonly aria-label="Lien élève"><button type="button" class="principal">Copier</button></div>
      <label class="interrupteur"><input type="checkbox"><span>Les élèves peuvent écrire</span></label>`
    const champ = corps.querySelector('input[readonly]') as HTMLInputElement
    champ.value = lien
    corps.querySelector('.lien button')!.addEventListener('click', async () => {
      try { await navigator.clipboard.writeText(lien) } catch { champ.select(); document.execCommand('copy') }
      this.message('Lien copié')
    })
    const coche = corps.querySelector('.interrupteur input') as HTMLInputElement
    coche.checked = this.app.tableau.reglages.get('elevesEcrivent') === true
    coche.addEventListener('change', () => this.app.tableau.reglages.set('elevesEcrivent', coche.checked))
    d.showModal()
  }

  // ----- Éditeur de formules -----
  editerFormule(latex: string, sx: number, sy: number): Promise<string | null> {
    return new Promise(resolve => {
      const d = this.nouveauDialogue(latex ? 'Modifier la formule' : 'Nouvelle formule', 'dialogue-formule')
      const corps = d.querySelector('.corps')!
      corps.innerHTML = `
        <div class="apercu" aria-live="polite"></div>
        <input class="saisie" spellcheck="false" autocomplete="off" placeholder="f(x) = \\frac{1}{x}" aria-label="Formule en LaTeX">
        <div class="raccourcis"></div>
        <div class="actions"><button type="button" class="secondaire">Annuler</button><button type="button" class="principal"></button></div>`
      const saisie = corps.querySelector('.saisie') as HTMLInputElement
      const apercu = corps.querySelector('.apercu') as HTMLDivElement
      const valider = corps.querySelector('.principal') as HTMLButtonElement
      const montrer = () => {
        const v = saisie.value.trim()
        katex.render(v || '\\text{Tapez une formule}', apercu, { throwOnError: false, displayMode: true })
        apercu.classList.toggle('vide', !v)
        valider.textContent = !v && latex ? 'Supprimer' : latex ? 'Mettre à jour' : 'Placer'
      }
      for (const [rendu, code] of RACCOURCIS_LATEX) {
        const b = document.createElement('button')
        b.type = 'button'; b.className = 'raccourci'; b.title = code
        katex.render(rendu, b, { throwOnError: false })
        b.addEventListener('click', () => {
          const a = saisie.selectionStart ?? saisie.value.length
          saisie.setRangeText(code, a, saisie.selectionEnd ?? a, 'end')
          // On place le curseur dans la première accolade vide
          const vide = saisie.value.lastIndexOf('{}', a + code.length)
          if (vide >= a) saisie.setSelectionRange(vide + 1, vide + 1)
          saisie.focus(); montrer()
        })
        corps.querySelector('.raccourcis')!.appendChild(b)
      }
      let fini = false
      const finir = (v: string | null) => { if (fini) return; fini = true; d.close(); d.remove(); resolve(v) }
      saisie.value = latex
      saisie.addEventListener('input', montrer)
      saisie.addEventListener('keydown', e => { if (e.key === 'Enter') { e.preventDefault(); finir(saisie.value.trim()) } })
      valider.addEventListener('click', () => finir(saisie.value.trim()))
      corps.querySelector('.secondaire')!.addEventListener('click', () => finir(null))
      d.addEventListener('close', () => finir(null))
      // Près de l'endroit visé, sans sortir de l'écran
      d.style.left = Math.max(12, Math.min(sx, window.innerWidth - 440)) + 'px'
      d.style.top = Math.max(12, Math.min(sy + 16, window.innerHeight - 330)) + 'px'
      d.show()
      montrer()
      saisie.focus()
    })
  }

  demanderNom(): Promise<string> {
    return new Promise(resolve => {
      const d = this.nouveauDialogue('Entrer dans la classe')
      const corps = d.querySelector('.corps')!
      corps.innerHTML = `<p>Votre prénom s'affichera à côté de votre curseur quand vous écrirez.</p>
        <input class="saisie" autocomplete="given-name" placeholder="Prénom" aria-label="Prénom">
        <div class="actions"><button type="button" class="principal">Entrer</button></div>`
      const champ = corps.querySelector('input') as HTMLInputElement
      try { champ.value = localStorage.getItem('mem-prenom') || '' } catch { /* stockage refusé */ }
      const ok = () => {
        const v = champ.value.trim() || 'Élève'
        try { localStorage.setItem('mem-prenom', v) } catch { /* stockage refusé */ }
        d.close(); d.remove(); resolve(v)
      }
      corps.querySelector('button')!.addEventListener('click', ok)
      champ.addEventListener('keydown', e => { if (e.key === 'Enter') ok() })
      d.addEventListener('cancel', e => e.preventDefault())
      d.showModal(); champ.focus()
    })
  }

  private nouveauDialogue(titre: string, classe = '') {
    this.dialogue?.remove()
    const d = document.createElement('dialog')
    d.className = 'dialogue ' + classe
    d.innerHTML = `<h2></h2><div class="corps"></div>`
    d.querySelector('h2')!.textContent = titre
    d.addEventListener('click', e => { if (e.target === d && d.open) d.close() })
    this.racine.appendChild(d)
    this.dialogue = d
    return d
  }
}
