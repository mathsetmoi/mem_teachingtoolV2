// =============================================================
// LA BIBLIOTHÈQUE : RENOMMER, LES SÉANCES D'UN CLASSEUR, LE MENU D'UNE CARTE
// Des méthodes de la classe Bibliotheque (src/classeurs/bibliotheque.ts), rangées ici par sujet :
// elles s'ajoutent à la classe à la fin de bibliotheque.ts (ajouterMethodes).
// =============================================================
import type { Bibliotheque } from '../bibliotheque'
import { copierSeance, retirerSeance, supprimerSeance } from '../../deplacer-seance'
import { fermerSurLeFond } from '../../dialogue'
import type { Tableau } from '../../document'
import { ENTREES, allerAuxEntrees, entreeMenu, fermerMenu, filetMenu, focusAuClavier, ouvrirMenu, placerMenu, titreMenu } from '../../menus'
import type { Menu } from '../../menus'
import { MAC, toucheMenu } from '../../navigateur'
import { ecrire } from '../../reglages'
import { dateCourteMajuscule, libelleSeance, ordreALaMain, ordreApres } from '../../seances'
import { demanderNomDeSeance } from '../../seances-vue'
import { COULEURS, TRIS, cheminLisible, cleDe, couleurDe, etiquetteDuNom, nomDeDossier } from '../arbre'
import { ecrireInfos } from '../bases'
import { ANNULER, CLE_MESSAGE, CLE_TRI, DOSSIER, FOCUSABLE, messageDe } from '../bibliotheque'
import type { Liste, Saisie } from '../bibliotheque'
import { LONGUEUR_NOM_CLASSEUR, LONGUEUR_NOM_DOSSIER } from '../demarrage'
import type { FicheClasseur, FicheDossier } from '../demarrage'
import { classeursDeLaClasse } from '../emplacements'
import { libelleSeances, lignesDesSeances, nomDeClasseur } from '../liste'

export const methodesSeances = {
  // ---------- Renommer ----------
  /** F2, « Renommer… », un double-clic sur le nom : un champ dans la carte
   *  (classeur : 60 caractères ; dossier : 40), prérempli, tout choisi.
   *  Entrée ou un clic ailleurs gardent le nom, Échap rend l'ancien ; un nom
   *  vide est refusé. Au doigt, le champ reste au-dessus du clavier virtuel. */
  renommer(this: Bibliotheque, cle: string): void {
    if (this.depart || !this.ouvert) return
    const dossier = cle.startsWith(DOSSIER)
    const ancien = dossier ? this.dossiers.get(cle.slice(DOSSIER.length))?.nom : this.fiches.get(cle)?.nom
    const actif = document.activeElement
    const l = this.listes.find(x => x.cartes.has(cle) && x.el.contains(actif)) ?? (this.tous.cartes.has(cle) ? this.tous : this.listes.find(x => x.cartes.has(cle)))
    const li = l?.cartes.get(cle)
    if (!l || !li || ancien === undefined) return
    if (this.saisie?.cle === cle && this.saisie.liste === l) { this.saisie.input.focus(); return }
    this.finirSaisie(true)
    this.annulerClicNom()
    this.focusCarte(l, cle, false)
    const input = document.createElement('input')
    input.type = 'text'; input.className = 'carte-saisie'
    input.maxLength = dossier ? LONGUEUR_NOM_DOSSIER : LONGUEUR_NOM_CLASSEUR
    input.value = ancien
    input.autocomplete = 'off'; input.spellcheck = false; input.enterKeyHint = 'done'
    input.setAttribute('aria-label', dossier ? `Nom du dossier « ${ancien} »` : `Nom du classeur « ${ancien} »`)
    const s: Saisie = { cle, liste: l, li, input, ancien, dossier }
    input.addEventListener('keydown', e => {
      if (e.key === 'Enter' && !e.isComposing) {
        e.preventDefault(); e.stopPropagation()
        // Un nom vide : refusé, le champ reste
        if (!(dossier ? nomDeDossier(input.value) : nomDeClasseur(input.value))) { this.hote.message(dossier ? 'Un dossier a besoin d\'un nom.' : 'Un classeur a besoin d\'un nom.'); return }
        this.finirSaisie(true, true)
      } else if (e.key === 'Escape') { e.preventDefault(); e.stopPropagation(); this.finirSaisie(false, true) }
    })
    input.addEventListener('blur', () => { if (this.saisie === s) this.finirSaisie(true) })
    // Ni le menu de la carte ni son ouverture : le champ est à part du lien
    input.addEventListener('pointerdown', e => e.stopPropagation())
    input.addEventListener('click', e => e.stopPropagation())
    // Le champ par-dessus le nom (le lien de la carte ne peut pas contenir de champ)
    const nom = li.querySelector<HTMLElement>('.carte-nom-classeur, .carte-nom-dossier')!
    const rl = li.getBoundingClientRect(), rn = nom.getBoundingClientRect()
    input.style.top = `${Math.round(rn.top - rl.top - 7)}px`
    li.classList.add('en-saisie')
    li.appendChild(input)
    this.saisie = s
    input.focus({ preventScroll: true })
    input.select()
    window.visualViewport?.addEventListener('resize', this.montrerSaisie)
    this.montrerSaisie()
  },

  /** Le champ du nom se ferme : garder (Entrée, le focus parti ailleurs,
   *  l'écran qui se ferme) ou non (Échap) ; rendreFocus : le focus revient
   *  à la carte. Un nom vide n'est pas gardé (le message le dit). */
  finirSaisie(this: Bibliotheque, garder: boolean, rendreFocus = false): void {
    const s = this.saisie
    if (!s) return
    this.saisie = null
    window.visualViewport?.removeEventListener('resize', this.montrerSaisie)
    this.corps.style.removeProperty('--clavier')
    const texte = s.input.value
    s.input.remove()
    s.li.classList.remove('en-saisie')
    if (rendreFocus && this.ouvert && s.liste.cartes.get(s.cle) === s.li) this.focusCarte(s.liste, s.cle, false)
    if (garder) {
      const nom = s.dossier ? nomDeDossier(texte) : nomDeClasseur(texte)
      if (!nom) this.hote.message(s.dossier ? 'Un dossier a besoin d\'un nom.' : 'Un classeur a besoin d\'un nom.')
      else if (nom !== s.ancien) void this.donnerUnNom(s.cle, nom, s.ancien)
    }
    // Ce qui a changé pendant qu'on tapait
    if (this.ouvert) void this.appliquer()
  },

  /** Écrit le nouveau nom d'un classeur ou d'un dossier, avec « Annuler »
   *  (7 s). Un classeur : sa fiche, puis son identité dans sa base (pour
   *  qu'une adoption retrouve son nom ; sans attendre) ; celui de cet onglet,
   *  son bouton et le titre de l'onglet suivent (les autres onglets
   *  l'apprennent par le canal). Un dossier de niveau renommé garde son
   *  étiquette accordée à son nom. siEncore : seulement si le nom n'a pas
   *  changé entre-temps (« Annuler »). */
  async donnerUnNom(this: Bibliotheque, cle: string, nom: string, ancien: string, siEncore?: string): Promise<void> {
    const annuler = siEncore === undefined ? { libelle: ANNULER, faire: () => void this.donnerUnNom(cle, ancien, nom, nom) } : undefined
    try {
      if (cle.startsWith(DOSSIER)) {
        const id = cle.slice(DOSSIER.length)
        const d = await this.suivre(this.registre.modifierDossier(id, x => {
          if (siEncore !== undefined && x.nom !== siEncore) return
          const avant = etiquetteDuNom(x.nom)
          if (x.etiquette && avant && cleDe(x.etiquette) === cleDe(avant)) x.etiquette = etiquetteDuNom(nom) ?? x.etiquette
          x.nom = nom
        }))
        if (!d) { this.hote.message('Ce dossier n\'existe plus.'); return }
        this.dossiers.set(id, d)
        this.rendre(null)
        if (d.nom === nom) {
          this.hote.message(siEncore === undefined ? 'Dossier renommé' : `Le dossier s'appelle de nouveau « ${nom} ».`, annuler)
          void this.suivreLeNom(id)
        }
        return
      }
      const f = await this.suivre(this.registre.modifierClasseur(cle, x => {
        if (siEncore !== undefined && x.nom !== siEncore) return
        x.nom = nom
      }))
      if (!f) { this.hote.message('Ce classeur n\'est plus dans la bibliothèque.'); return }
      this.fiches.set(cle, f)
      this.rendre(new Set([cle]))
      if (f.nom !== nom) return
      void this.suivre(ecrireInfos(f.base, { id: f.id, nom: f.nom })).catch(() => { /* l'index le garde : c'est lui qui compte */ })
      if (this.hote.classeur?.id === f.id) { this.hote.classeurChange?.(f); this.majLigneOuvert() }
      this.hote.message(siEncore === undefined ? 'Classeur renommé' : `Le classeur s'appelle de nouveau « ${nom} ».`, annuler)
      void this.suivreLeNom(undefined, f.id)
    } catch (e) {
      this.hote.message(`${cle.startsWith(DOSSIER) ? 'Le dossier' : 'Le classeur'} n'a pas pu être renommé : ${messageDe(e)}.`)
    }
  },

  /** Après un nom changé : le fichier de chaque classeur concerné (celui du
   *  dossier renommé et de ses sous-dossiers, ou le classeur renommé) suit
   *  son nouveau chemin sur l'ordinateur, sans doublon (deplacer-fichier.ts,
   *  suivreLeNom) ; ne dit que ce qui bouge ou ce qui n'a pas pu bouger */
  async suivreLeNom(this: Bibliotheque, dossier?: string, classeur?: string): Promise<void> {
    try {
      let ids: string[]
      if (classeur) ids = [classeur]
      else {
        const [fiches, dossiers] = await Promise.all([this.registre.classeurs(), this.registre.dossiers()])
        ids = classeursDeLaClasse(dossier!, fiches, dossiers).map(f => f.id)
      }
      if (!ids.length) return
      const t = await this.leDeplaceur.suivreLeNom(ids)
      if (t) this.hote.message(t)
    } catch { /* le nom est changé ; les fichiers restent où ils sont */ }
  },

  // ---------- Les séances d'un classeur ----------
  // Sous la carte d'un classeur, chaque séance a son menu … : l'ouvrir, la
  // renommer, la monter ou la descendre (l'ordre choisi à la main), la
  // déplacer vers un autre classeur, la supprimer. Le classeur est lu, changé
  // et réécrit par les fichiers (voir fichiers.lireUnClasseur), même s'il
  // n'est pas ouvert ; ce qui se fait est dans deplacer-seance.ts.

  /** Une séance de la liste dépliée d'un classeur, à l'écran */
  ligneDeSeance(this: Bibliotheque, fid: string, sid: string): HTMLElement | null {
    for (const x of this.el.querySelectorAll<HTMLElement>(`.case-classeur[data-cle="${CSS.escape(fid)}"] .carte-seance-ligne[data-seance="${CSS.escape(sid)}"]`)) {
      if (x.offsetParent) return x
    }
    return null
  },

  /** Les touches d'une séance de la liste : Menu, F2, Suppr, Alt + ↑ ↓ (la
   *  changer de place), ↑ ↓ (aller à la voisine). Vrai : la touche est prise. */
  toucheSeance(this: Bibliotheque, e: KeyboardEvent, ligne: HTMLElement): boolean {
    const fid = ligne.closest<HTMLElement>('.case-classeur')?.dataset.cle, sid = ligne.dataset.seance
    if (!fid || !sid) return false
    if (toucheMenu(e)) { if (!e.repeat) this.ouvrirMenuSeance(fid, sid, { clavier: true }); return true }
    if ((e.key === 'Delete' && !e.ctrlKey && !e.metaKey && !e.altKey) || (MAC && e.key === 'Backspace' && e.metaKey && !e.altKey)) {
      if (!e.repeat) void this.supprimerSeanceDe(fid, sid)
      return true
    }
    if (e.altKey && !e.ctrlKey && !e.metaKey && (e.key === 'ArrowUp' || e.key === 'ArrowDown')) {
      if (!e.repeat) void this.placerSeance(fid, sid, { pas: e.key === 'ArrowUp' ? -1 : 1 })
      return true
    }
    if (e.ctrlKey || e.metaKey || e.altKey) return false
    if (e.key === 'F2') { if (!e.repeat) void this.renommerSeanceDe(fid, sid); return true }
    if (e.key === 'ArrowUp' || e.key === 'ArrowDown') {
      const lignes = [...(ligne.parentElement?.querySelectorAll<HTMLElement>('.carte-seance-ligne') ?? [])]
      const i = lignes.indexOf(ligne) + (e.key === 'ArrowUp' ? -1 : 1)
      if (i >= 0 && i < lignes.length) lignes[i].querySelector<HTMLElement>('.carte-seance')?.focus()
      else ligne.closest<HTMLElement>('.case-classeur')?.querySelector<HTMLElement>(FOCUSABLE)?.focus()
      return true
    }
    return false
  },

  /** Le menu d'une séance : par son bouton …, au clic droit ou au bouton du
   *  stylet (là où l'on a appuyé), à la touche Menu */
  ouvrirMenuSeance(this: Bibliotheque, fid: string, sid: string, o: { bouton?: HTMLElement; x?: number; y?: number; clavier?: boolean }): void {
    const f = this.fiches.get(fid)
    const lignes = f ? lignesDesSeances(f) : []
    const i = lignes.findIndex(l => l.id === sid)
    if (!f || i < 0) return
    this.finirSaisie(true)
    this.annulerClicNom()
    const l = lignes[i]
    const m = this.menuEl
    m.replaceChildren()
    m.setAttribute('aria-label', l.nom ?? `Séance du ${l.date}`)
    entreeMenu(m, 'Ouvrir la séance', () => void this.ouvrirClasseur(f, { seance: sid }), { touche: 'Entrée', action: 'ouvrir-seance' })
    entreeMenu(m, 'Renommer…', () => void this.renommerSeanceDe(fid, sid), { touche: 'F2', action: 'renommer-seance' })
    // Son replay : la fenêtre Publier, sur elle (le classeur garde chaque séance : on la publie quand on veut)
    entreeMenu(m, 'Publier la séance…', () => void this.ouvrirClasseur(f, { seance: sid, publier: true }), { action: 'publier-seance', aide: 'Son replay, pour les élèves' })
    filetMenu(m)
    if (i > 0) entreeMenu(m, 'Monter', () => void this.placerSeance(fid, sid, { pas: -1 }), { touche: 'Alt + ↑', action: 'monter-seance' })
    if (i < lignes.length - 1) entreeMenu(m, 'Descendre', () => void this.placerSeance(fid, sid, { pas: 1 }), { touche: 'Alt + ↓', action: 'descendre-seance' })
    if (ordreALaMain(f.listeSeances ?? [])) entreeMenu(m, 'Remettre dans l\'ordre des dates', () => void this.remettreSeancesParDates(fid), { action: 'seances-par-dates' })
    entreeMenu(m, 'Déplacer vers…', () => void this.choisirClasseurPour(fid, sid), { action: 'deplacer-seance', aide: 'Un autre classeur' })
    filetMenu(m)
    entreeMenu(m, 'Supprimer la séance', () => void this.supprimerSeanceDe(fid, sid), { touche: 'Suppr', action: 'supprimer-seance' })
    const ligne = this.ligneDeSeance(fid, sid)
    const menu: Menu = {
      el: m, bouton: o.bouton,
      fermer: () => {
        if (this.menuCarte?.menu !== menu) return
        this.menuCarte = null
        const a = document.activeElement
        if ((!a || a === document.body || this.menuEl.contains(a)) && this.ouvert) this.ligneDeSeance(fid, sid)?.querySelector<HTMLElement>('.carte-seance')?.focus({ preventScroll: true })
        if (this.ouvert) void this.appliquer()
      },
    }
    this.menuCarte = { id: fid, menu }
    ouvrirMenu(menu)
    const ancre = o.bouton ?? ligne?.querySelector<HTMLElement>('.options-seance') ?? null
    if (ancre && (o.bouton || o.x === undefined || o.y === undefined)) placerMenu(m, ancre.getBoundingClientRect(), 'dessous')
    else placerMenu(m, new DOMRect(o.x ?? 0, o.y ?? 0, 0, 0), 'droite')
    if (o.clavier) allerAuxEntrees(m, 1, ENTREES)
  },

  /** Une séance dite dans un message : « la séance du Lun 5 oct 7h39 », ou son nom */
  texteSeance(this: Bibliotheque, f: FicheClasseur | undefined, sid: string): string {
    const s = f?.listeSeances?.find(x => x.id === sid)
    if (!s) return 'La séance'
    return s.nom ? `La séance « ${s.nom} »` : `La séance du ${dateCourteMajuscule(s.debut)}`
  },

  /** La fiche d'un classeur relue après un changement, et sa carte refaite */
  async rafraichirFiche(this: Bibliotheque, id: string): Promise<void> {
    const f = await this.registre.classeur(id).catch(() => null)
    if (!f) return
    this.fiches.set(id, f)
    if (this.ouvert) this.rendre(new Set([id]))
  },

  /** Change un classeur (voir l'en-tête de ce morceau) ; ok dit si ce qu'a
   *  rendu faire mérite d'être écrit. Une seule chose à la fois. */
  async changerSeances<R>(this: Bibliotheque, fid: string, faire: (t: Tableau) => R, ok: (r: R) => boolean): Promise<R | null> {
    const F = this.fiches.get(fid)
    if (!F || !this.fichiers || this.seancesOccupees) return null
    this.seancesOccupees = true
    try {
      const t = await this.fichiers.lireUnClasseur(F)
      if (!t) return null
      const r = faire(t)
      if (!ok(r)) return r
      if (!(await this.fichiers.ecrireUnClasseur(F, t))) return null
      await this.rafraichirFiche(fid)
      return r
    } finally { this.seancesOccupees = false }
  },

  /** « Renommer… » (F2) : le nom d'une séance (vide : elle reprend sa date) */
  async renommerSeanceDe(this: Bibliotheque, fid: string, sid: string): Promise<void> {
    const f = this.fiches.get(fid)
    const s = f?.listeSeances?.find(x => x.id === sid)
    if (!s) return
    const nom = await demanderNomDeSeance(this.racine, { id: sid, debut: s.debut, depuis: s.debut, nom: s.nom ?? null, ancienne: false, rang: null, pages: [] })
    if (nom === null) return
    const r = await this.changerSeances(fid, t => t.renommerSeance(sid, nom || null), x => x)
    if (r) this.hote.message(nom ? `Séance renommée : « ${nom} »` : `Nom de la séance retiré : « ${libelleSeance({ debut: s.debut, nom: null })} »`)
  },

  /** Monter, Descendre (Alt + ↑ ↓), ou glisser à une autre place : l'ordre
   *  choisi à la main (voir seances.ts) */
  async placerSeance(this: Bibliotheque, fid: string, sid: string, o: { pas?: -1 | 1; vers?: number }): Promise<void> {
    const f = this.fiches.get(fid)
    if (!f) return
    const ordre = ordreApres(lignesDesSeances(f).map(l => l.id), sid, o)
    if (!ordre) return
    this.seancesOuvertes.add(fid)
    await this.changerSeances(fid, t => t.rangerLesSeances(ordre), x => x)
  },

  /** « Remettre dans l'ordre des dates » */
  async remettreSeancesParDates(this: Bibliotheque, fid: string): Promise<void> {
    if (await this.changerSeances(fid, t => t.rangerLesSeances(null), x => x)) this.hote.message('Séances remises dans l\'ordre des dates.')
  },

  /** « Supprimer la séance » (Suppr) : ses pages vont dans la corbeille du
   *  classeur (où elle fait un bloc, « Remettre la séance », lot 17) ;
   *  « Annuler » les rend. La seule séance d'un classeur : c'est le classeur
   *  qui va dans la corbeille de la bibliothèque. */
  async supprimerSeanceDe(this: Bibliotheque, fid: string, sid: string): Promise<void> {
    const f = this.fiches.get(fid)
    if (!f) return
    if ((f.listeSeances?.length ?? 0) <= 1) { await this.supprimer(fid); return }
    const texte = this.texteSeance(f, sid)
    const r = await this.changerSeances(fid, t => supprimerSeance(t, sid), x => 'pages' in x)
    if (!r) return
    if ('refus' in r) {
      if (r.refus === 'seule') await this.supprimer(fid)
      else this.hote.message('Cette séance n\'est plus dans le classeur.')
      return
    }
    const pages = r.pages
    this.hote.message(`${texte} est supprimée : ses pages sont dans la corbeille du classeur (Maj + P, Corbeille).`, {
      libelle: ANNULER, cle: CLE_MESSAGE + 'seance-' + sid,
      faire: () => void this.changerSeances(fid, t => t.rendrePages(pages), n => n > 0).then(n => { if (n) this.hote.message(`${texte} est de retour.`) }),
    })
  },

  /** « Déplacer vers… » : la fenêtre des autres classeurs, par dossier */
  async choisirClasseurPour(this: Bibliotheque, fid: string, sid: string): Promise<void> {
    const f = this.fiches.get(fid)
    const s = f?.listeSeances?.find(x => x.id === sid)
    if (!f || !s) return
    const chemin = (x: FicheClasseur) => cheminLisible(x.dossier, this.dossiers) || 'Bibliothèque'
    const ici = chemin(f)
    const autres = this.visibles().filter(x => x.id !== fid)
    if (!autres.length) { this.hote.message('Il n\'y a pas d\'autre classeur où la mettre.'); return }
    const groupes = new Map<string, FicheClasseur[]>()
    for (const x of autres.sort((a, b) => a.nom.localeCompare(b.nom, 'fr'))) {
      const c = chemin(x)
      groupes.set(c, [...(groupes.get(c) ?? []), x])
    }
    const noms = [...groupes.keys()].sort((a, b) => (a === ici ? -1 : b === ici ? 1 : a.localeCompare(b, 'fr')))
    const choix = await new Promise<string | null>(fin => {
      const d = document.createElement('dialog')
      d.className = 'dialogue dialogue-deplacer-seance'
      const form = document.createElement('form'); form.method = 'dialog'
      const titre = Object.assign(document.createElement('h2'), { textContent: 'Déplacer la séance' })
      const texte = Object.assign(document.createElement('p'), { textContent: `${this.texteSeance(f, sid)}, ${s.pages > 1 ? `${s.pages} pages` : '1 page'}. Elle part avec ses pages et son film, et se range à sa date.` })
      const liste = Object.assign(document.createElement('div'), { className: 'classeurs-cibles' })
      let reponse: string | null = null
      const garder = Object.assign(document.createElement('button'), { type: 'submit', className: 'principal', textContent: 'Déplacer', disabled: true })
      for (const n of noms) {
        const g = document.createElement('fieldset')
        g.append(Object.assign(document.createElement('legend'), { textContent: n }))
        for (const x of groupes.get(n)!) {
          const lab = document.createElement('label')
          const r = Object.assign(document.createElement('input'), { type: 'radio', name: 'cible', value: x.id, id: 'cible-' + x.id })
          r.addEventListener('change', () => { garder.disabled = false })
          lab.addEventListener('dblclick', () => { reponse = x.id; d.close() })
          lab.append(r, Object.assign(document.createElement('span'), { textContent: x.nom }))
          g.append(lab)
        }
        liste.append(g)
      }
      const actions = Object.assign(document.createElement('div'), { className: 'actions' })
      const annuler = Object.assign(document.createElement('button'), { type: 'button', className: 'secondaire', textContent: ANNULER })
      annuler.addEventListener('click', () => { reponse = null; d.close() })
      actions.append(annuler, garder)
      form.append(titre, texte, liste, actions)
      form.addEventListener('submit', e => { e.preventDefault(); reponse = (form.querySelector<HTMLInputElement>('input[name="cible"]:checked'))?.value ?? null; d.close() })
      d.append(form)
      d.addEventListener('close', () => { d.remove(); fin(reponse) })
      fermerSurLeFond(d, () => d.close())
      this.racine.appendChild(d)
      d.showModal()
      annuler.focus()
    })
    if (choix) await this.deplacerSeanceVers(fid, sid, choix)
  },

  /** Déplace une séance vers un autre classeur (voir deplacer-seance.ts) :
   *  copiée là-bas, à sa date, puis retirée d'ici. La seule séance d'un
   *  classeur : il part ensuite, vide, dans la corbeille de la bibliothèque.
   *  « Annuler » la remet où elle était. */
  async deplacerSeanceVers(this: Bibliotheque, fid: string, sid: string, gid: string): Promise<void> {
    const F = this.fiches.get(fid), G = this.fiches.get(gid)
    if (!F || !G || !this.fichiers || this.seancesOccupees || fid === gid) return
    const texte = this.texteSeance(F, sid)
    this.seancesOccupees = true
    try {
      this.hote.message(`Déplacement vers « ${G.nom} »…`)
      const source = await this.fichiers.lireUnClasseur(F)
      const cible = source && await this.fichiers.lireUnClasseur(G)
      if (!source || !cible) return
      const r = copierSeance(source, sid, cible)
      if ('refus' in r) {
        this.hote.message(r.refus === 'chevauche'
          ? `« ${G.nom} » a déjà quelque chose pendant cette séance (une séance à la même heure) : elle n'a pas été déplacée.`
          : r.refus === 'deja' ? `« ${G.nom} » a déjà cette séance : elle n'a pas été déplacée.`
          : 'Cette séance n\'est plus dans le classeur.')
        return
      }
      const retrait = retirerSeance(source, sid)
      const seule = !('pages' in retrait)
      if (!(await this.fichiers.ecrireUnClasseur(G, cible))) return
      await this.rafraichirFiche(gid)
      this.seancesOuvertes.add(gid)
      let t = 0
      if (!seule) {
        if (!(await this.fichiers.ecrireUnClasseur(F, source))) {
          this.hote.message(`${texte} est maintenant aussi dans « ${G.nom} », mais elle n'a pas pu être retirée de « ${F.nom} ».`)
          return
        }
      } else {
        t = Date.now()
        await this.registre.modifierClasseur(fid, x => { if (x.effacement == null) x.corbeille = { t } }).catch(() => undefined)
      }
      await this.rafraichirFiche(fid)
      if (this.ouvert) this.rendre(null)
      const pagesIci = 'pages' in retrait ? retrait.pages : []
      this.hote.message(`${texte} est dans « ${G.nom} ».${seule ? ` « ${F.nom} », vide, est dans la corbeille.` : ''}`, {
        libelle: ANNULER, cle: CLE_MESSAGE + 'seance-' + sid,
        faire: () => void this.annulerDeplacement(fid, gid, r.pages, pagesIci, t, texte),
      })
    } finally { this.seancesOccupees = false }
  },

  /** « Annuler » après un déplacement : la séance quitte le classeur
   *  d'arrivée et revient dans le sien (ou le sien sort de la corbeille) */
  async annulerDeplacement(this: Bibliotheque, fid: string, gid: string, arrivees: string[], parties: string[], t: number, texte: string): Promise<void> {
    const r = await this.changerSeances(gid, x => { const p = x.jeterPages(arrivees); x.marquerDefinitives(p); return p.length }, n => n > 0)
    if (!r) { this.hote.message(`${texte} n'a pas pu être retirée du classeur où elle est arrivée.`); return }
    if (t) {
      await this.registre.modifierClasseur(fid, x => { if (x.corbeille?.t === t) delete x.corbeille }).catch(() => undefined)
      await this.rafraichirFiche(fid)
      if (this.ouvert) this.rendre(null)
    } else await this.changerSeances(fid, x => x.rendrePages(parties), n => n > 0)
    this.hote.message(`${texte} est de retour.`)
  },

  /** Glisser une séance par sa poignée ⠿ : dans sa liste, elle change de
   *  place ; lâchée sur un autre classeur, elle y part (comme « Déplacer
   *  vers… »). Échap, ou lâcher ailleurs : rien ne bouge. */
  glisserSeance(this: Bibliotheque, e: PointerEvent, fid: string, sid: string, li: HTMLElement): void {
    if (e.button !== 0 || this.glisse || this.seancesOccupees || this.seanceTiree) return
    e.preventDefault(); e.stopPropagation()
    const liste = li.parentElement
    if (!liste) return
    const x0 = e.clientX, y0 = e.clientY
    let fantome: HTMLElement | null = null
    let but: { genre: 'place'; vers: number } | { genre: 'classeur'; id: string } | null = null
    const effacer = () => {
      for (const x of liste.querySelectorAll('.dessus, .dessous')) x.classList.remove('dessus', 'dessous')
      for (const x of this.el.querySelectorAll('.cible-seance')) x.classList.remove('cible-seance')
    }
    const bouger = (ev: PointerEvent) => {
      if (ev.pointerId !== e.pointerId) return
      if (!fantome) {
        if (Math.hypot(ev.clientX - x0, ev.clientY - y0) < 6) return
        fantome = li.cloneNode(true) as HTMLElement
        fantome.classList.add('fantome-seance')
        fantome.style.width = li.getBoundingClientRect().width + 'px'
        fantome.setAttribute('aria-hidden', 'true')
        document.body.append(fantome)
        li.classList.add('seance-tiree')
      }
      fantome.style.transform = `translate(${ev.clientX + 10}px, ${ev.clientY + 10}px)`
      effacer()
      but = null
      const sous = document.elementFromPoint(ev.clientX, ev.clientY) as HTMLElement | null
      const ligne = sous?.closest<HTMLElement>('.carte-seance-ligne')
      if (ligne && ligne.parentElement === liste) {
        const lignes = [...liste.querySelectorAll<HTMLElement>('.carte-seance-ligne')]
        const r = ligne.getBoundingClientRect(), haut = ev.clientY < r.top + r.height / 2
        const k = lignes.indexOf(ligne) + (haut ? 0 : 1), i = lignes.indexOf(li)
        const vers = k > i ? k - 1 : k
        if (vers !== i) { ligne.classList.add(haut ? 'dessus' : 'dessous'); but = { genre: 'place', vers } }
        return
      }
      const carte = sous?.closest<HTMLElement>('.case-classeur')
      const gid = carte?.dataset.cle
      if (carte && gid && gid !== fid && this.fiches.has(gid)) { carte.classList.add('cible-seance'); but = { genre: 'classeur', id: gid } }
    }
    const finir = (garder: boolean) => {
      window.removeEventListener('pointermove', bouger, true)
      window.removeEventListener('pointerup', lever, true)
      window.removeEventListener('pointercancel', abandon, true)
      this.seanceTiree = null
      const etait = !!fantome
      fantome?.remove(); fantome = null
      li.classList.remove('seance-tiree')
      effacer()
      if (!garder || !etait || !but) return
      if (but.genre === 'place') void this.placerSeance(fid, sid, { vers: but.vers })
      else void this.deplacerSeanceVers(fid, sid, but.id)
    }
    const lever = (ev: PointerEvent) => { if (ev.pointerId === e.pointerId) finir(true) }
    const abandon = (ev: PointerEvent) => { if (ev.pointerId === e.pointerId) finir(false) }
    this.seanceTiree = finir
    window.addEventListener('pointermove', bouger, true)
    window.addEventListener('pointerup', lever, true)
    window.addEventListener('pointercancel', abandon, true)
  },

  // ---------- Le menu d'une carte ----------
  /** Ce que propose le menu d'un classeur, par blocs : « Ouvrir », puis les
   *  blocs des morceaux suivants (blocsDuMenu : renommer, les étiquettes…) */
  entreesDuMenu(this: Bibliotheque, f: FicheClasseur, m: HTMLElement): void {
    const ici = this.hote.classeur?.id === f.id
    entreeMenu(m, 'Ouvrir', () => void this.ouvrirClasseur(f), { touche: 'Entrée', action: 'ouvrir-classeur', aide: ici ? 'Il est ouvert dans cet onglet' : undefined })
    const seances = libelleSeances(f)
    if (seances) entreeMenu(m, this.seancesOuvertes.has(f.id) ? 'Cacher les séances' : `Voir les séances (${seances})`, () => this.basculerSeances(f.id), { action: 'voir-seances' })
    for (const bloc of this.blocsDuMenu) { filetMenu(m); bloc(f, m) }
  },

  /** Ce que propose le menu d'un dossier : « Ouvrir », « Renommer… », sa
   *  couleur (les huit, la sienne cochée), « Dossier d'un niveau » ; puis
   *  les blocs des morceaux suivants (blocsDuMenuDossier) */
  entreesDuMenuDossier(this: Bibliotheque, d: FicheDossier, m: HTMLElement): void {
    entreeMenu(m, 'Ouvrir', () => this.allerA(d.id), { touche: 'Entrée', action: 'ouvrir-dossier' })
    filetMenu(m)
    entreeMenu(m, 'Renommer…', () => this.renommer(DOSSIER + d.id), { touche: 'F2', action: 'renommer-dossier' })
    filetMenu(m)
    titreMenu(m, 'Couleur')
    const rangee = Object.assign(document.createElement('div'), { className: 'menu-couleurs' })
    rangee.setAttribute('role', 'group'); rangee.setAttribute('aria-label', 'Couleur')
    const sienne = couleurDe(d.couleur).valeur
    for (const c of COULEURS) {
      const b = entreeMenu(rangee, c.nom, () => void this.changerCouleur(d.id, c.valeur), { coche: c.valeur === sienne, action: 'couleur' })
      b.dataset.couleur = c.valeur; b.title = c.nom
      b.style.setProperty('--c', c.valeur)
    }
    m.appendChild(rangee)
    const etiquette = etiquetteDuNom(d.nom) ?? d.nom
    entreeMenu(m, 'Dossier d\'un niveau', () => void this.basculerClasse(d.id), {
      coche: !!d.etiquette, caseACocher: true, action: 'classe-dossier',
      aide: d.etiquette ? `Ses classeurs portent l'étiquette « ${d.etiquette} »` : `Ses classeurs porteront l'étiquette « ${etiquette} »`,
    })
    for (const bloc of this.blocsDuMenuDossier) { filetMenu(m); bloc(d, m) }
  },

  /** Le menu d'une carte (classeur ou dossier) : par son bouton ⋯ (sous
   *  lui), au clic droit ou au bouton du stylet (là où l'on a appuyé), à la
   *  touche Menu (sous le bouton ⋯, le focus dans la première entrée).
   *  Échap, un choix ou un appui ailleurs le ferment ; le focus revient à la
   *  carte. */
  ouvrirMenuCarte(this: Bibliotheque, cle: string, o: { bouton?: HTMLElement; x?: number; y?: number; clavier?: boolean }): void {
    const dossier = cle.startsWith(DOSSIER)
    const f = dossier ? undefined : this.fiches.get(cle)
    const d = dossier ? this.dossiers.get(cle.slice(DOSSIER.length)) : undefined
    const l = this.listes.find(x => x.focusId === cle && x.el.contains(document.activeElement)) ?? this.listes.find(x => x.cartes.has(cle))
    const c = l?.cartes.get(cle)
    if ((!f && !d) || !c) return
    this.finirSaisie(true)
    this.annulerClicNom()
    const m = this.menuEl
    m.replaceChildren()
    m.setAttribute('aria-label', f ? f.nom : `Dossier « ${d!.nom} »`)
    if (f) this.entreesDuMenu(f, m)
    else this.entreesDuMenuDossier(d!, m)
    const options = c.querySelector<HTMLElement>('.options-classeur')!
    const menu: Menu = { el: m, bouton: o.bouton, fermer: () => this.surMenuFerme(menu, cle, l!) }
    this.menuCarte = { id: cle, menu }
    ouvrirMenu(menu)
    if (o.bouton || o.x === undefined || o.y === undefined) placerMenu(m, options.getBoundingClientRect(), 'dessous')
    else placerMenu(m, new DOMRect(o.x, o.y, 0, 0), 'droite')
    if (o.clavier) allerAuxEntrees(m, 1, ENTREES)
  },

  /** Le menu d'une carte vient de se fermer : le focus qui y était revient
   *  à la carte ; ce que les autres onglets ont changé entre-temps se fait */
  surMenuFerme(this: Bibliotheque, menu: Menu, id: string, l: Liste): void {
    if (this.menuCarte?.menu !== menu) return
    this.menuCarte = null
    const a = document.activeElement
    const perdu = !a || a === document.body || this.menuEl.contains(a) || !!(a as HTMLElement).closest?.('.options-classeur')
    if (perdu && this.ouvert && l.cartes.has(id)) this.focusCarte(l, id, false)
    if (this.ouvert) void this.appliquer()
  },

  basculerMenuBandeau(this: Bibliotheque): void {
    if (this.menuBandeauOuvert) { fermerMenu(); return }
    const m = this.menuBandeau
    m.replaceChildren()
    for (const f of this.menuDuBandeau) f(m)
    const menu: Menu = { el: m, bouton: this.boutonBandeau, fermer: () => { if (this.menuBandeauOuvert === menu) { this.menuBandeauOuvert = null; if (this.ouvert) void this.appliquer() } } }
    this.menuBandeauOuvert = menu
    ouvrirMenu(menu)
    placerMenu(m, this.boutonBandeau.getBoundingClientRect(), 'dessous')
  },

  /** « Trier : … » : Modifiés récemment, Nom (A → Z) ; le choix est retenu
   *  sur l'appareil */
  basculerMenuTri(this: Bibliotheque): void {
    if (this.menuTriOuvert) { fermerMenu(); return }
    this.finirSaisie(true)
    const m = this.menuTriEl
    m.replaceChildren()
    for (const t of TRIS) {
      entreeMenu(m, t.nom, () => {
        if (this.tri === t.id) return
        this.tri = t.id
        ecrire(CLE_TRI, t.id)
        this.rendre(null)
      }, { coche: this.tri === t.id, action: 'tri-' + t.id })
    }
    const menu: Menu = { el: m, bouton: this.triBouton, fermer: () => { if (this.menuTriOuvert === menu) { this.menuTriOuvert = null; if (this.ouvert) void this.appliquer() } } }
    this.menuTriOuvert = menu
    ouvrirMenu(menu)
    placerMenu(m, this.triBouton.getBoundingClientRect(), 'dessous')
    if (focusAuClavier(this.triBouton)) allerAuxEntrees(m, 1, ENTREES)
  },
}
