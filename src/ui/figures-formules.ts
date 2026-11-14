// =============================================================
// L'INTERFACE : LE MENU D'UN MORCEAU DE FIGURE, L'ÉDITEUR DE FORMULES
// Des méthodes de la classe UI (src/ui.ts), rangées ici par sujet :
// elles s'ajoutent à la classe à la fin de ui.ts (ajouterMethodes).
// =============================================================
import type { UI } from '../ui'
import { COULEURS, poigneeDuRayon } from '../app'
import type { ActionMessage, Prise } from '../app'
import { fermerSurLeFond } from '../dialogue'
import { placesDesNoms, sommetsDe } from '../formes'
import type { P } from '../formes'
import { refaireEnGardantLeFocus } from '../menus'
import { tableauCache } from '../navigateur'
import { CM } from '../types'
import type { Figure } from '../types'
import { BOUTS, DUREE_MESSAGE_ACTION, MARQUES, RACCOURCIS_LATEX, nombre } from '../ui'
import katex from 'katex'

export const methodesFiguresFormules = {
  // ----- Menu d'un morceau de figure -----
  /** Le menu s'ouvre collé au morceau (x, y : le pointeur, s'il fallait) */
  ouvrirMenuPartie(this: UI, id: string, prise: Prise, x: number, y: number): void {
    this.partie = { id, prise }
    if (!this.ancrePartie()) { this.partie = null; return }
    this.construireMenuPartie()
    this.menuPartie.hidden = false
    this.placerMenuPartie(x, y)
  },

  /** Où est, dans le monde, le morceau dont le menu est ouvert : un sommet,
   *  le centre ou le rayon d'un cercle, un nom (null : il n'existe plus) */
  ancrePartie(this: UI): P | null {
    const p = this.partie, f = p && this.app.forme(p.id)
    if (!p || !f || (f.type !== 'polygone' && f.type !== 'cercle')) return null
    const pr = p.prise
    if (pr.quoi === 'rayon') return f.type === 'cercle' ? poigneeDuRayon(f) : null
    if (pr.quoi === 'nom') return placesDesNoms(f)[pr.i] ?? null
    return f.type === 'cercle' ? { x: f.x, y: f.y } : sommetsDe(f)[pr.i] ?? null
  },

  /** Le menu suit son morceau quand la vue bouge (zoom, déplacement), à
   *  14 px en bas à droite, sans sortir de la fenêtre */
  placerMenuPartie(this: UI, x?: number, y?: number): void {
    const m = this.menuPartie, a = this.ancrePartie()
    if (a) {
      const z = this.app.rendu.scene.getBoundingClientRect(), e = this.app.cam.versEcran(a.x, a.y)
      x = z.left + e.x; y = z.top + e.y
    }
    if (x === undefined || y === undefined) return
    m.style.left = Math.max(8, Math.min(x + 14, window.innerWidth - m.offsetWidth - 8)) + 'px'
    m.style.top = Math.max(8, Math.min(y + 14, window.innerHeight - m.offsetHeight - 8)) + 'px'
  },

  /** À chaque mise à jour : le menu ouvert suit son morceau ; il se ferme si
   *  le morceau n'est plus choisi, ou n'existe plus (une annulation l'a ôté) */
  majMenuPartie(this: UI): void {
    if (this.menuPartie.hidden) return
    const p = this.partie, a = this.app.partie
    const meme = !!p && !!a && a.id === p.id && a.prise.quoi === p.prise.quoi
      && (a.prise.quoi === 'rayon' || p.prise.quoi === 'rayon' || a.prise.i === p.prise.i)
    if (!meme || !this.ancrePartie()) { this.fermerMenuPartie(); return }
    this.placerMenuPartie()
  },

  /** La revue ou la trieuse des pages prend tout l'écran : le programme de
   *  construction se ferme d'abord (son clavier, sur window en capture,
   *  passerait avant le leur : Espace ou → joueraient une étape sur la page
   *  cachée, et Échap fermerait les deux), avec le menu d'un morceau. Un
   *  instrument qu'il amenait finit pourtant son trajet à l'image d'après, et
   *  resterait seul sur le tableau : la fonction rendue le range quand le
   *  tableau revient (null : le programme n'était pas ouvert). */
  fermerConstruction(this: UI): (() => void) | null {
    const construisait = this.constructeur.ouvert
    if (construisait) this.constructeur.fermer()
    if (this.catalogue.ouvert) this.catalogue.fermer()
    if (this.courbes.ouvert) this.basculerCourbes()
    this.fermerMenuPartie()
    if (!construisait) return null
    return () => {
      const r = this.app.rendu
      if (this.constructeur.ouvert || !r.instrumentsAnimes.length) return
      r.instrumentsAnimes = []
      r.redessinerInstruments()
    }
  },

  /** La revue prend tout l'écran (voir fermerConstruction ; si elle n'a rien
   *  eu à montrer, l'instrument se range deux images plus tard) */
  ouvrirRevue(this: UI, b: HTMLElement): void {
    const ranger = this.fermerConstruction()
    this.revue.ouvrir(b, ranger ?? undefined)
    if (ranger && !this.revue.ouvert) requestAnimationFrame(() => requestAnimationFrame(ranger))
    // La barre d'actions et le menu complet n'ont rien à faire pendant la revue
    this.maj()
  },

  /** La trieuse des pages (le compteur, Maj + P, « Toutes les pages… » du
   *  menu de la page). Pas pendant la revue, une
   *  fenêtre ouverte, ni en plein geste (un trait, un objet qu'on glisse).
   *  Avant, ce qui attend sur le tableau se pose (le point d'un simple
   *  toucher), un placement en attente (désigner un axe, un centre, poser
   *  une construction) s'annule, le programme de construction se ferme (voir
   *  fermerConstruction), les menus aussi, et le message à action du tableau
   *  s'en va : son « Annuler » changerait une page qu'on ne voit plus
   *  (Ctrl+Z, une fois la trieuse fermée, et la corbeille restent).
   *  auClavier : elle rend le focus au compteur en se fermant. */
  ouvrirTrieuse(this: UI, auClavier = false): void {
    const app = this.app
    if (this.trieuse.ouvert || tableauCache(app) || this.revue.ouvert || document.querySelector('dialog[open]') || app.enGeste) return
    app.poserCeQuiAttend()
    // Sans placement, Échap changerait d'outil
    if (app.placement) app.echap()
    const ranger = this.fermerConstruction()
    this.fermerMenus()
    this.oublierAction()
    this.trieuse.ouvrir({ retour: auClavier ? this.rang : null, auRetour: ranger })
    // La barre d'actions ne paraît pas sous la trieuse (elle compte comme une fenêtre)
    this.maj()
  },

  fermerMenuPartie(this: UI): void {
    if (this.menuPartie.hidden) return
    this.menuPartie.hidden = true
    this.partie = null
  },

  /** Le menu d'un morceau, refait à chaque choix : le focus qui y était
   *  (un choix fait au clavier) y reste */
  construireMenuPartie(this: UI): void {
    refaireEnGardantLeFocus(this.menuPartie, () => this.remplirMenuPartie())
  },

  remplirMenuPartie(this: UI): void {
    const app = this.app, m = this.menuPartie
    const f0 = this.partie && app.forme(this.partie.id)
    if (!this.partie || !f0 || (f0.type !== 'polygone' && f0.type !== 'cercle')) return this.fermerMenuPartie()
    const f = f0 as Figure
    const prise = this.partie.prise
    const refaire = () => this.construireMenuPartie()
    m.replaceChildren()

    const titre = document.createElement('h3')
    const ligne = (etiquette: string) => {
      const l = document.createElement('div'); l.className = 'rang-menu'
      const t = document.createElement('span'); t.textContent = etiquette
      l.appendChild(t); m.appendChild(l); return l
    }
    const choix = (l: HTMLElement, nom: string, contenu: string, actif: boolean, faire: () => void) => {
      const b = document.createElement('button')
      b.type = 'button'; b.className = 'choix' + (actif ? ' actif' : ''); b.title = nom; b.setAttribute('aria-label', nom)
      b.setAttribute('aria-pressed', String(actif)); b.innerHTML = contenu
      b.addEventListener('click', () => { faire(); refaire() })
      l.appendChild(b); return b
    }
    const couleurs = (l: HTMLElement, actuelle: string | undefined, faire: (c: string | undefined) => void) => {
      choix(l, 'Couleur de la figure', '<span class="meme">=</span>', !actuelle, () => faire(undefined))
      for (const c of COULEURS) choix(l, c.nom, `<span class="rond" style="background:${c.valeur}"></span>`, actuelle === c.valeur, () => faire(c.valeur))
    }
    const icone = (d: string) => `<svg viewBox="0 0 24 24" aria-hidden="true"><path d="${d}"/></svg>`
    const nomDe = (i: number) => f.noms?.[i]?.replace(/_(\d+)/, '$1') || ''

    if (prise.quoi === 'rayon' && f.type === 'cercle') {
      titre.textContent = 'Rayon'; m.appendChild(titre)
      const l = ligne('r (cm)')
      const champ = Object.assign(document.createElement('input'), { className: 'saisie', inputMode: 'decimal' })
      champ.value = String(Math.round(f.r / CM * 100) / 100).replace('.', ',')
      champ.addEventListener('change', () => {
        const v = nombre(champ.value)
        if (v && v > 0) app.habiller(f, { r: v * CM } as never); else this.message('Rayon : un nombre positif, en centimètres')
      })
      l.appendChild(champ)
      return
    }

    const i = prise.quoi === 'rayon' ? 0 : prise.i
    const ouvert = f.type === 'polygone' && !f.ferme
    const extremite = ouvert && !(f.type === 'polygone' && f.prolonge) && (i === 0 || i === f.pts.length / 2 - 1)
    const nom = nomDe(i)

    if (prise.quoi === 'nom') {
      const st = f.styleNoms?.[i] ?? {}
      titre.textContent = 'Nom ' + nom; m.appendChild(titre)
      const lt = ligne('Texte')
      const champ = Object.assign(document.createElement('input'), { className: 'saisie nom' })
      champ.value = f.noms?.[i] ?? ''
      champ.addEventListener('change', () => { app.renommerPoint(f, i, champ.value); refaire() })
      lt.appendChild(champ)
      couleurs(ligne('Couleur'), st.couleur, c => app.reglerPartie(f, 'styleNoms', i, { couleur: c }))
      const ltaille = ligne('Taille')
      for (const [n, v] of [['Petit', 16], ['Normal', 22], ['Grand', 32]] as const) {
        choix(ltaille, n, `<span style="font-size:${v * 0.62}px">A</span>`, (st.taille ?? 22) === v, () => app.reglerPartie(f, 'styleNoms', i, { taille: v === 22 ? undefined : v }))
      }
      const lstyle = ligne('Style')
      choix(lstyle, 'Italique', '<i>A</i>', !st.droit, () => app.reglerPartie(f, 'styleNoms', i, { droit: undefined }))
      choix(lstyle, 'Droit', 'A', !!st.droit, () => app.reglerPartie(f, 'styleNoms', i, { droit: true }))
      const la = ligne('')
      choix(la, 'Remettre à sa place', 'Replacer', false, () => app.replacerNom(f, i))
      choix(la, 'Masquer ce nom', 'Masquer', false, () => { app.reglerPartie(f, 'styleNoms', i, { cache: true }); this.fermerMenuPartie() })
      return
    }

    // Un point : sommet, extrémité ou centre
    const st = f.stylePoints?.[i] ?? {}
    titre.textContent = (f.type === 'cercle' ? 'Centre ' : f.type === 'polygone' && f.prolonge ? 'Point ' : extremite ? 'Extrémité ' : 'Sommet ') + nom
    m.appendChild(titre)
    const ln = ligne('Nom')
    const champ = Object.assign(document.createElement('input'), { className: 'saisie nom', placeholder: '—' })
    champ.value = f.sommets ? (f.noms?.[i] ?? '') : ''
    champ.addEventListener('change', () => { app.renommerPoint(f, i, champ.value); refaire() })
    ln.appendChild(champ)
    if (f.sommets && f.styleNoms?.[i]?.cache) choix(ln, 'Afficher le nom', 'Afficher', false, () => app.reglerPartie(f, 'styleNoms', i, { cache: undefined }))
    const marqueActuelle = st.marque ?? (f.sommets && f.type === 'polygone' && !(st.bout && st.bout !== 'aucun') ? 'point' : 'aucun')
    const lm = ligne('Point')
    for (const k of MARQUES) choix(lm, k.nom, icone(k.d), marqueActuelle === k.id, () => app.reglerPartie(f, 'stylePoints', i, { marque: k.id }))
    if (extremite) {
      const lb = ligne('Extrémité')
      for (const k of BOUTS) choix(lb, k.nom, icone(k.d), (st.bout ?? 'aucun') === k.id, () => app.reglerPartie(f, 'stylePoints', i, { bout: k.id === 'aucun' ? undefined : k.id }))
    }
    couleurs(ligne('Couleur'), st.couleur, c => app.reglerPartie(f, 'stylePoints', i, { couleur: c }))
    const lt = ligne('Taille')
    for (const [n, v, d] of [['Petit', 0.7, 3], ['Normal', 1, 5], ['Grand', 1.6, 8]] as const) {
      choix(lt, n, `<span class="rond" style="width:${d * 2}px;height:${d * 2}px;background:currentColor"></span>`, (st.taille ?? 1) === v, () => app.reglerPartie(f, 'stylePoints', i, { taille: v === 1 ? undefined : v }))
    }
  },

  /** Un message en bas de l'écran. Avec une action, un bouton suit le texte
   *  (« Changer ») et le message reste 7 s ; seul ce bouton reçoit les appuis,
   *  et seulement quand le message se voit. Plusieurs actions : un bouton
   *  chacune, dans l'ordre (« Aller à la page 5 », « Annuler ») ; la clé du
   *  message est la première qu'elles donnent. Un bouton fait son action et
   *  le message s'en va, sauf pour une action à garder : seul ce bouton
   *  part, les autres restent le temps qu'il reste. Il passe sous les menus
   *  et les panneaux (il ne cache pas ce qu'on va toucher), sauf pendant la
   *  revue, qui couvre tout, et pour le
   *  programme de construction (dessus), dont le panneau prend presque tout
   *  l'écran d'une tablette, et pendant un placement (la consigne de
   *  « Désigner » ou « Tracer » : le menu complet reste ouvert pendant
   *  qu'on clique sur la page).
   *  Un message ordinaire ne chasse pas un message à action encore à l'écran
   *  (« Stylet détecté … Changer », que suit souvent la figure reconnue du
   *  premier trait) : il s'écrit au-dessus de lui, et s'en va seul.
   *  Pendant la revue, un message à action ne se montre pas, et son bouton ne
   *  fait rien : un message ordinaire (F5, que la télécommande envoie) passe
   *  au-dessus de la revue, et « Annuler » d'une page qu'on vient de jeter
   *  écrirait alors dans le tableau, que la revue ne doit jamais changer. */
  message(this: UI, texte: string, action?: ActionMessage | ActionMessage[], dessus = false): void {
    // Pendant un placement (« Désigner », « Tracer » : la consigne dit où
    // cliquer), le message passe aussi au-dessus des panneaux : le menu
    // complet reste ouvert pendant qu'on clique, il ne doit pas la cacher
    this.toast.classList.toggle('dessus', dessus || this.app.enLecture || !!this.app.placement)
    const el = document.createElement('span')
    el.className = 'ligne'
    el.append(texte)
    const maintenant = performance.now()
    const actions = action === undefined ? [] : Array.isArray(action) ? action : [action]
    if (actions.length) {
      // 7 s, ou plus si une action le demande (ActionMessage.duree)
      const toast = { el, fin: maintenant + Math.max(DUREE_MESSAGE_ACTION, ...actions.map(a => a.duree ?? 0)), cle: actions.find(a => a.cle !== undefined)?.cle }
      for (const a of actions) {
        const b = document.createElement('button')
        b.type = 'button'; b.className = 'action'; b.textContent = a.libelle
        b.addEventListener('click', e => {
          if (this.app.enLecture) return
          if (a.garder && this.toastAction === toast) b.remove()
          else { this.toastSimple = this.toastAction = null; this.majToast() }
          a.faire(e)
        })
        el.appendChild(b)
      }
      this.toastAction = toast
      this.toastSimple = null
    } else {
      this.toastSimple = { el, fin: maintenant + Math.max(2600, texte.length * 60) }
    }
    this.majToast()
    this.placerToast()
  },

  /** Dans combien de temps (ms) ce que le message montre s'en va ; 0 : rien
   *  à l'écran. Ce qu'on veut dire sans couvrir le message en cours attend
   *  tant (le rappel d'enregistrer le classeur quitté, voir main.ts). */
  finDuMessage(this: UI): number {
    const maintenant = performance.now()
    return Math.max(0, ...[this.toastSimple, this.toastAction].filter(p => p !== null).map(p => p.fin - maintenant))
  },

  /** Le message à action de cette clé s'en va, s'il est encore là : son
   *  bouton n'a plus rien à faire (la page qu'il rendait est revenue). Sans
   *  clé, quel qu'il soit (la trieuse s'ouvre : son « Annuler » changerait
   *  une page qu'on ne voit plus). */
  oublierAction(this: UI, cle?: string): void {
    if (!this.toastAction || (cle !== undefined && this.toastAction.cle !== cle)) return
    this.toastAction = null
    this.majToast()
  },

  /** Le message montre ce qui n'a pas encore passé son échéance ; plus rien,
   *  il s'efface (son texte reste le temps du fondu) */
  majToast(this: UI): void {
    clearTimeout(this.minuterieToast)
    const maintenant = performance.now()
    if (this.toastSimple && this.toastSimple.fin <= maintenant) this.toastSimple = null
    if (this.toastAction && this.toastAction.fin <= maintenant) this.toastAction = null
    const parts = [this.toastSimple, this.app.enLecture ? null : this.toastAction].filter(p => p !== null)
    if (!parts.length) { this.toast.classList.remove('visible'); return }
    this.toast.replaceChildren(...parts.map(p => p.el))
    this.toast.classList.add('visible')
    this.minuterieToast = window.setTimeout(() => this.majToast(), Math.min(...parts.map(p => p.fin)) - maintenant)
  },

  // ----- Éditeur de formules -----
  editerFormule(this: UI, latex: string, sx: number, sy: number): Promise<string | null> {
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
      // Fermé (validé ou non), la barre d'actions revient sur la formule
      const finir = (v: string | null) => { if (fini) return; fini = true; d.close(); d.remove(); this.maj(); resolve(v) }
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
      // Ses boutons hors de l'écran (au téléphone, la fenêtre est plus haute :
      // les raccourcis y passent sur deux rangées, et y font 44 px), elle
      // remonte pour qu'ils y reviennent, et défile si l'écran est plus bas
      // qu'elle (la vérification « conformité » du lot 5 : à 320 × 568 et
      // couché, Annuler et Placer sortaient par le bas). Au poste de la
      // classe, ses boutons sont toujours dans l'écran : elle ne bouge pas.
      const bas = corps.querySelector('.actions')!.getBoundingClientRect().bottom
      if (bas > window.innerHeight - 4) {
        const place = window.innerHeight - 24
        if (d.offsetHeight > place) { d.style.maxHeight = place + 'px'; d.style.overflowY = 'auto'; d.style.overscrollBehavior = 'contain' }
        d.style.top = Math.max(12, window.innerHeight - 12 - d.offsetHeight) + 'px'
      }
      // Ouvert, la barre d'actions s'efface : elle couvrirait la formule
      this.maj()
      montrer()
      saisie.focus()
    })
  },

  nouveauDialogue(this: UI, titre: string, classe = ''): HTMLDialogElement {
    this.dialogue?.remove()
    const d = document.createElement('dialog')
    d.className = 'dialogue ' + classe
    d.innerHTML = `<h2></h2><div class="corps"></div>`
    d.querySelector('h2')!.textContent = titre
    fermerSurLeFond(d, () => { if (d.open) d.close() })
    this.racine.appendChild(d)
    this.dialogue = d
    return d
  },
}
