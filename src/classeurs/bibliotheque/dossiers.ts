// =============================================================
// LA BIBLIOTHÈQUE : LES DOSSIERS, LES ÉTIQUETTES, DÉPLACER, DUPLIQUER, LA CORBEILLE
// Des méthodes de la classe Bibliotheque (src/classeurs/bibliotheque.ts), rangées ici par sujet :
// elles s'ajoutent à la classe à la fin de bibliotheque.ts (ajouterMethodes).
// =============================================================
import type { Bibliotheque } from '../bibliotheque'
import { fermerSurLeFond } from '../../dialogue'
import { icone } from '../../icones'
import { fermerMenu } from '../../menus'
import { COULEURS, COULEUR_DEFAUT, ETIQUETTES_MAX, LONGUEUR_ETIQUETTE, ajouterEtiquette, cheminLisible, cleDe, couleurDe, dossierVisible, etiquetteDuNom, etiquetteHeritee, etiquettesDe, etiquettesEffectives, nomDeDossier, nomLibre, ressembleAUneClasse } from '../arbre'
import { ANNULER, DOSSIER, PAS_DUPLIQUE, PATIENCE_COPIE, PLUS_DE_PLACE_COPIE, REGLAGE_CONSEIL, messageDe, nomErreur } from '../bibliotheque'
import { elementsDeLaCorbeille, libelleCorbeille } from '../corbeille'
import { LONGUEUR_NOM_DOSSIER, baseDe, idClasseur } from '../demarrage'
import type { FicheClasseur, FicheDossier } from '../demarrage'
import { DOSSIER_PARTI, REFUS_CYCLE, destinations, objetClasseur, objetDossier, ouIlEst, texteAllerA, texteDeplacement, texteRetour } from '../deplacer'
import { ecrivain } from '../ecrivain'
import type { CopieFaite } from '../ecrivain'
import { TEXTE_PUBLIEES_COPIE } from '../reconnaitre'
import { ErreurRegistre } from '../registre'
import { ouvrirDeplacerVers } from '../vers'

export const methodesDossiers = {
  // ---------- Les dossiers : couleur, dossier de niveau, nouveau dossier ----------
  /** Un dossier est relu, changé, écrit (une transaction), puis l'écran se
   *  refait ; null : il n'existe plus */
  async changerDossierFiche(this: Bibliotheque, id: string, f: (d: FicheDossier) => void): Promise<FicheDossier | null> {
    try {
      const d = await this.suivre(this.registre.modifierDossier(id, f))
      if (!d) { this.hote.message('Ce dossier n\'existe plus.'); return null }
      this.dossiers.set(id, d)
      this.rendre(null)
      return d
    } catch (e) {
      this.hote.message(`Le dossier n'a pas pu être changé : ${messageDe(e)}.`)
      return null
    }
  },

  async changerCouleur(this: Bibliotheque, id: string, valeur: string, annulation = false): Promise<void> {
    const avant = this.dossiers.get(id)?.couleur ?? COULEUR_DEFAUT
    if (couleurDe(avant).valeur === valeur) return
    const d = await this.changerDossierFiche(id, x => { x.couleur = valeur })
    if (!d) return
    const nom = couleurDe(valeur).nom
    this.hote.message(`Couleur du dossier « ${d.nom} » : ${nom.toLowerCase()}`,
      annulation ? undefined : { libelle: ANNULER, faire: () => void this.changerCouleur(id, avant, true) })
  },

  /** « Dossier d'un niveau » : ses classeurs portent son nom en étiquette
   *  (calculée : rien n'est écrit dans les classeurs), ou plus */
  async basculerClasse(this: Bibliotheque, id: string, vers?: string | null): Promise<void> {
    const x0 = this.dossiers.get(id)
    if (!x0) return
    const avant = x0.etiquette ?? null
    const apres = vers !== undefined ? vers : avant ? null : etiquetteDuNom(x0.nom)
    const d = await this.changerDossierFiche(id, x => { if (apres) x.etiquette = apres; else delete x.etiquette })
    if (!d) return
    const annuler = vers === undefined ? { libelle: ANNULER, faire: () => void this.basculerClasse(id, avant) } : undefined
    this.hote.message(d.etiquette ? `« ${d.nom} » est un dossier de niveau : ses classeurs portent l'étiquette « ${d.etiquette} ».` : `« ${d.nom} » n'est plus un dossier de niveau.`, annuler)
  },

  /** Le conseil du rangement par niveau ne revient plus (« Plus tard ») */
  ecarterConseil(this: Bibliotheque): void {
    this.conseilVu = true
    this.registre.ecrireReglage(REGLAGE_CONSEIL, 'vu').catch(() => { /* il reviendra à la prochaine ouverture */ })
    const avait = this.conseil.contains(document.activeElement)
    this.rendre(null)
    if (avait) {
      const l = this.recents.ordre.length ? this.recents : this.tous
      const cle = l.focusId ?? l.ordre[0]
      if (cle) this.focusCarte(l, cle)
      else this.el.querySelector<HTMLElement>('.biblio-nouveau')?.focus()
    }
  },

  /** « Nouveau dossier » : son nom (40 caractères, « 5e B » en exemple), sa
   *  couleur (Bleu), « Dossier d'un niveau » (cochée d'office quand le nom
   *  ressemble à un niveau ; son libellé suit le nom tapé). Il se crée dans
   *  le dossier affiché. classe : la case cochée d'avance (le conseil). */
  nouveauDossier(this: Bibliotheque, o: { classe?: boolean } = {}): void {
    if (document.querySelector('dialog[open]') || this.depart) return
    this.finirSaisie(true)
    const parent = this.dossierAffiche !== null && this.dossiers.has(this.dossierAffiche) ? this.dossierAffiche : null
    const d = document.createElement('dialog')
    d.className = 'dialogue dialogue-nouveau dialogue-dossier'
    d.innerHTML = `<form method="dialog"><h2>Nouveau dossier</h2><div class="corps">
      ${parent !== null ? '<p class="dans"></p>' : ''}
      <label class="champ"><span>Nom</span><input type="text" name="nom" maxlength="${LONGUEUR_NOM_DOSSIER}" placeholder="5ème" autocomplete="off" spellcheck="false"></label>
      <fieldset class="couleurs"><legend>Couleur</legend></fieldset>
      <label class="case case-classe"><input type="checkbox" name="classe"><span></span></label>
      <p class="erreur" role="alert" hidden></p>
      <div class="actions">
        <button type="button" class="secondaire" data-a="annuler">Annuler</button>
        <button type="submit" class="principal" data-a="creer">Créer</button>
      </div></div></form>`
    if (parent !== null) d.querySelector('.dans')!.textContent = `Dans : ${cheminLisible(parent, this.dossiers)}`
    const form = d.querySelector('form')!
    const champ = d.querySelector<HTMLInputElement>('input[name="nom"]')!
    const couleurs = d.querySelector('.couleurs')!
    for (const c of COULEURS) {
      const l = Object.assign(document.createElement('label'), { className: 'pastille-couleur', title: c.nom })
      const r = Object.assign(document.createElement('input'), { type: 'radio', name: 'couleur', value: c.valeur, checked: c.valeur === COULEUR_DEFAUT })
      r.setAttribute('aria-label', c.nom)
      const rond = Object.assign(document.createElement('span'), { className: 'rond', innerHTML: icone('coche') })
      rond.style.setProperty('--c', c.valeur)
      rond.setAttribute('aria-hidden', 'true')
      l.append(r, rond)
      couleurs.appendChild(l)
    }
    const caseClasse = d.querySelector<HTMLInputElement>('input[name="classe"]')!
    const libelleClasse = d.querySelector<HTMLElement>('.case-classe span')!
    // La case suit le nom tant qu'on ne l'a pas touchée
    let touchee = !!o.classe
    caseClasse.checked = !!o.classe
    const majClasse = () => {
      const e = etiquetteDuNom(champ.value)
      libelleClasse.textContent = e ? `Dossier d'un niveau : ses classeurs portent l'étiquette « ${e} »` : 'Dossier d\'un niveau : ses classeurs portent son nom en étiquette'
      if (!touchee) caseClasse.checked = ressembleAUneClasse(champ.value)
    }
    majClasse()
    champ.addEventListener('input', majClasse)
    caseClasse.addEventListener('change', () => { touchee = true })
    const erreur = d.querySelector<HTMLElement>('.erreur')!
    const annuler = d.querySelector<HTMLButtonElement>('[data-a="annuler"]')!
    const creer = d.querySelector<HTMLButtonElement>('[data-a="creer"]')!
    let enCours = false
    const fermer = () => { if (enCours) return; if (d.open) d.close() }
    d.addEventListener('cancel', e => { if (enCours) e.preventDefault() })
    d.addEventListener('close', () => d.remove())
    fermerSurLeFond(d, fermer)
    annuler.addEventListener('click', fermer)
    const dire = (t: string | null) => { erreur.textContent = t ?? ''; erreur.hidden = !t }
    form.addEventListener('submit', async e => {
      e.preventDefault()
      if (enCours) return
      const nom = nomDeDossier(champ.value)
      if (!nom) { dire('Un dossier a besoin d\'un nom.'); champ.focus(); return }
      dire(null)
      const couleur = (form.elements.namedItem('couleur') as RadioNodeList | null)?.value || COULEUR_DEFAUT
      const fiche: FicheDossier = { id: idClasseur(), nom, parent, couleur, cree: Date.now() }
      const etiquette = caseClasse.checked ? etiquetteDuNom(nom) : null
      if (etiquette) fiche.etiquette = etiquette
      enCours = true
      creer.disabled = annuler.disabled = true
      try { await this.suivre(this.registre.ajouterDossier(fiche)) } catch (x) {
        enCours = false
        creer.disabled = annuler.disabled = false
        dire(`Le dossier n'a pas pu être créé : ${nomErreur(x) === 'QuotaExceededError' ? 'il n\'y a plus de place dans ce navigateur' : messageDe(x)}.`)
        return
      }
      enCours = false
      fermer()
      this.dossiers.set(fiche.id, fiche)
      // Il paraît là où l'on est, même si l'on regardait un niveau
      if (this.filtre !== null) this.changerFiltre(null)
      if (this.dossierAffiche !== parent) this.changerDossier(parent)
      this.rendre(null)
      if (this.tous.cartes.has(DOSSIER + fiche.id)) this.focusCarte(this.tous, DOSSIER + fiche.id)
      this.hote.message(fiche.etiquette ? `Dossier « ${nom} » créé : ses classeurs porteront l'étiquette « ${fiche.etiquette} ».` : `Dossier « ${nom} » créé.`)
    })
    document.body.appendChild(d)
    d.showModal()
    champ.focus()
  },

  // ---------- Les étiquettes de niveau d'un classeur ----------
  /** « Étiquettes de niveau… » : ses étiquettes propres (chacune avec ×),
   *  celle qu'il hérite de son dossier (grisée, sans ×) ; « Ajouter un
   *  niveau » (les étiquettes déjà là sont proposées ; Entrée ajoute), 3 au
   *  plus, de 20 caractères, un double ignoré. Chaque changement s'écrit
   *  aussitôt ; à la fermeture, un message avec « Annuler » les rend toutes
   *  comme elles étaient. */
  etiquettesDuClasseur(this: Bibliotheque, id: string): void {
    const f0 = this.fiches.get(id)
    if (!f0 || document.querySelector('dialog[open]') || this.depart) return
    this.finirSaisie(true)
    const initiales = [...(f0.etiquettes ?? [])]
    const d = document.createElement('dialog')
    d.className = 'dialogue dialogue-nouveau dialogue-etiquettes'
    d.setAttribute('aria-labelledby', 'etiquettes-titre')
    const idListe = 'etiquettes-connues'
    d.innerHTML = `<h2 id="etiquettes-titre">Étiquettes de niveau</h2><div class="corps">
      <p class="pour"></p>
      <ul class="puces" aria-label="Ses étiquettes"></ul>
      <label class="champ"><span>Ajouter un niveau</span><input type="text" name="etiquette" maxlength="${LONGUEUR_ETIQUETTE}" list="${idListe}" placeholder="5ème" autocomplete="off" spellcheck="false" enterkeyhint="done"></label>
      <datalist id="${idListe}"></datalist>
      <p class="note" aria-live="polite"></p>
      <div class="actions"><button type="button" class="principal" data-a="fermer">Fermer</button></div>
    </div>`
    d.querySelector('.pour')!.textContent = `« ${f0.nom} » : ${ETIQUETTES_MAX} étiquettes au plus, en plus de celle de son dossier.`
    const ul = d.querySelector<HTMLElement>('.puces')!
    const champ = d.querySelector<HTMLInputElement>('input[name="etiquette"]')!
    const liste = d.querySelector<HTMLElement>('datalist')!
    const note = d.querySelector<HTMLElement>('.note')!
    let ecriture: Promise<void> = Promise.resolve()
    const actuelle = () => this.fiches.get(id) ?? f0
    const dessiner = (focusApres?: 'champ' | number) => {
      const f = actuelle()
      const h = f.dossier === null ? null : etiquetteHeritee(f.dossier, this.dossiers)
      const propres = etiquettesEffectives({ ...f, dossier: null }, this.dossiers).map(e => e.nom)
      const items: HTMLElement[] = propres.map((nom, i) => {
        const li = Object.assign(document.createElement('li'), { className: 'puce' })
        li.append(Object.assign(document.createElement('span'), { className: 'puce-nom', textContent: nom }))
        const x = Object.assign(document.createElement('button'), { type: 'button', className: 'puce-retirer', innerHTML: icone('fermer') })
        x.setAttribute('aria-label', `Retirer l'étiquette « ${nom} »`); x.title = `Retirer « ${nom} »`
        x.dataset.rang = String(i)
        x.addEventListener('click', () => changer(propres.filter((_, j) => j !== i), i))
        li.appendChild(x)
        return li
      })
      if (h && !propres.some(p => cleDe(p) === cleDe(h.nom))) {
        const li = Object.assign(document.createElement('li'), { className: 'puce heritee' })
        li.append(Object.assign(document.createElement('span'), { className: 'puce-nom', textContent: h.nom }),
          Object.assign(document.createElement('small'), { textContent: `vient du dossier « ${h.dossier.nom} »` }))
        items.push(li)
      }
      if (!items.length) items.push(Object.assign(document.createElement('li'), { className: 'puce-aucune', textContent: 'Aucune étiquette' }))
      ul.replaceChildren(...items)
      const plein = propres.length >= ETIQUETTES_MAX
      champ.disabled = plein
      if (plein) note.textContent = `${ETIQUETTES_MAX} étiquettes au plus : retirez-en une pour en ajouter une autre.`
      // Les étiquettes déjà dans la bibliothèque, sauf les siennes
      const siennes = new Set(etiquettesEffectives(f, this.dossiers).map(e => cleDe(e.nom)))
      liste.replaceChildren(...etiquettesDe(this.visibles(), this.dossiers).filter(e => !siennes.has(cleDe(e.nom)))
        .map(e => Object.assign(document.createElement('option'), { value: e.nom })))
      if (focusApres === 'champ' && !plein) champ.focus()
      else if (typeof focusApres === 'number') {
        const x = ul.querySelectorAll<HTMLElement>('.puce-retirer')
        ;(x[Math.min(focusApres, x.length - 1)] ?? (plein ? d.querySelector<HTMLElement>('[data-a="fermer"]') : champ))?.focus()
      } else if (focusApres === 'champ') d.querySelector<HTMLElement>('[data-a="fermer"]')?.focus()
    }
    const changer = (etiquettes: string[], focusApres: 'champ' | number) => {
      ecriture = ecriture.then(async () => {
        try {
          const f = await this.suivre(this.registre.modifierClasseur(id, x => { x.etiquettes = etiquettes }))
          if (!f) { note.textContent = 'Ce classeur n\'est plus dans la bibliothèque.'; return }
          this.fiches.set(id, f)
          this.rendre(new Set([id]))
          if (d.open) dessiner(focusApres)
        } catch (e) { note.textContent = `L'étiquette n'a pas pu être enregistrée : ${messageDe(e)}.` }
      })
    }
    const ajouter = () => {
      const f = actuelle()
      const h = f.dossier === null ? null : etiquetteHeritee(f.dossier, this.dossiers)
      const propres = etiquettesEffectives({ ...f, dossier: null }, this.dossiers).map(e => e.nom)
      const r = ajouterEtiquette(propres, champ.value, h?.nom)
      if (r.refus === 'vide') return
      if (r.refus === 'double') { note.textContent = `« ${champ.value.trim()} » y est déjà.`; champ.select(); return }
      if (r.refus === 'plein') { note.textContent = `${ETIQUETTES_MAX} étiquettes au plus : retirez-en une pour en ajouter une autre.`; return }
      note.textContent = `Étiquette « ${r.ajoutee} » ajoutée.`
      champ.value = ''
      changer(r.etiquettes, 'champ')
    }
    champ.addEventListener('keydown', e => {
      if (e.key === 'Enter' && !e.isComposing) { e.preventDefault(); e.stopPropagation(); ajouter() }
    })
    // Choisie dans la liste proposée (certains navigateurs n'envoient pas Entrée)
    champ.addEventListener('change', () => { if (champ.value.trim() && [...liste.children].some(o => (o as HTMLOptionElement).value === champ.value)) ajouter() })
    const fermer = () => { if (d.open) d.close() }
    d.querySelector('[data-a="fermer"]')!.addEventListener('click', fermer)
    fermerSurLeFond(d, fermer)
    d.addEventListener('close', () => {
      d.remove()
      void ecriture.then(() => {
        const apres = this.fiches.get(id)?.etiquettes ?? []
        const l = this.listes.find(x => x.cartes.has(id) && x.focusId === id) ?? this.listes.find(x => x.cartes.has(id))
        if (l && this.ouvert) this.focusCarte(l, id, false)
        if (JSON.stringify(apres) === JSON.stringify(initiales)) return
        const texte = apres.length ? `Étiquettes de « ${f0.nom} » : ${apres.join(', ')}` : `« ${f0.nom} » n'a plus d'étiquette propre`
        this.hote.message(texte, { libelle: ANNULER, faire: () => changer(initiales, 'champ') })
      })
    })
    document.body.appendChild(d)
    dessiner()
    d.showModal()
    if (!champ.disabled) champ.focus()
    else d.querySelector<HTMLElement>('[data-a="fermer"]')?.focus()
  },

  // ---------- Déplacer vers… (lot 4 C7) ----------
  /** « Déplacer vers… » (le menu d'un classeur ou d'un dossier) : la
   *  fenêtre de l'arbre des dossiers (voir vers.ts) ; le choix fait
   *  deplacerVers. Échap ou « Annuler » : le focus revient à la carte. Pour
   *  un classeur, la ligne sous l'arbre dit ce qu'il advient de son fichier
   *  (lot 18). */
  async deplacer(this: Bibliotheque, cle: string): Promise<void> {
    if (document.querySelector('dialog[open]') || this.depart || !this.ouvert) return
    this.finirSaisie(true)
    this.annulerClicNom()
    const dossier = cle.startsWith(DOSSIER)
    const f = dossier ? undefined : this.fiches.get(cle)
    const d = dossier ? this.dossiers.get(cle.slice(DOSSIER.length)) : undefined
    if (!f && !d) return
    const objet = f ? objetClasseur(f) : objetDossier(d!)
    const ligne = f ? await this.leDeplaceur.lignesPour(f) : undefined
    if (document.querySelector('dialog[open]') || this.depart || !this.ouvert) return
    const l = this.listes.find(x => x.focusId === cle && x.cartes.has(cle)) ?? this.listes.find(x => x.cartes.has(cle))
    ouvrirDeplacerVers({
      titre: f ? `Déplacer « ${f.nom} » vers…` : `Déplacer le dossier « ${d!.nom} » vers…`,
      destinations: destinations(objet, this.dossiers),
      ligne,
      fermee: () => { if (l && this.ouvert && l.cartes.has(cle)) this.focusCarte(l, cle, false) },
      choisir: id => void this.deplacerVers(cle, id),
    })
  },

  /** Range un classeur (ou un dossier, cle « d:… ») dans le dossier cible
   *  (null : la racine) : la fenêtre « Déplacer vers… », le lâcher d'un
   *  glisser, « Annuler ». La cible est relue d'abord : partie entre-temps
   *  (supprimée, à la corbeille, ailleurs), « Ce dossier n'existe plus. ».
   *  Un classeur : sa fiche seule change (modifierClasseur, son dossier) ;
   *  ses étiquettes propres restent, celles qu'il hérite suivent le dossier,
   *  et le message le dit. Un dossier : deplacerDossier, qui refuse dans sa
   *  transaction un dossier dans lui-même ou l'un de ses descendants (un
   *  autre onglet a pu en déplacer un). Le message, avec « Aller à « X » »
   *  et « Annuler » (7 s). siEncore : « Annuler » ne remet en place que s'il
   *  est encore là où on l'avait mis. Le focus reste sur la carte, ou, si
   *  elle quitte la grille, sur sa voisine. Vrai s'il a bougé.
   *  Lot 18 : le fichier d'un classeur suit son déplacement (le déplaceur,
   *  deplacer-fichier.ts : il suit, reste, ou arrive, et la phrase s'ajoute
   *  au message) ; « Annuler » le ramène de même. Depuis le menu ⋯ du
   *  classeur de l'onglet, la bibliothèque n'a peut-être jamais été ouverte
   *  ici : sa fiche est relue de l'index. */
  async deplacerVers(this: Bibliotheque, cle: string, cible: string | null, o: { siEncore?: string | null } = {}): Promise<boolean> {
    const dossier = cle.startsWith(DOSSIER), id = dossier ? cle.slice(DOSSIER.length) : cle
    const annulation = o.siEncore !== undefined
    // La place de la carte, pour y remettre le focus ensuite
    const actif = document.activeElement
    const l0 = actif instanceof HTMLElement ? this.listes.find(x => x.el.contains(actif)) : undefined
    const rang = l0 ? l0.ordre.indexOf(cle) : -1
    try {
      this.dossiers = new Map((await this.registre.dossiers()).map(d => [d.id, d]))
    } catch (e) { this.hote.message(`${dossier ? 'Le dossier' : 'Le classeur'} n'a pas pu être déplacé : ${messageDe(e)}.`); return false }
    const arrivee = cible === null ? null : this.dossiers.get(cible)
    if (cible !== null && (!arrivee || !dossierVisible(arrivee, this.dossiers))) {
      this.hote.message(DOSSIER_PARTI)
      this.rendre(null)
      return false
    }
    const vers = arrivee ? arrivee.nom : null
    let nom: string, avant: string | null, etiquettesAvant: string[], etiquettesApres: string[]
    /** Le dossier de la fiche avant le déplacement (le fichier suit depuis là) */
    let dossierDAvant: string | null = null
    if (!dossier) {
      let f0 = this.fiches.get(id)
      if (!f0) {
        const relu = await this.registre.classeur(id).catch(() => undefined)
        if (relu && !relu.corbeille) { f0 = relu; this.fiches.set(id, relu) }
      }
      if (!f0) { this.hote.message('Ce classeur n\'est plus dans la bibliothèque.'); return false }
      dossierDAvant = f0.dossier
      avant = ouIlEst(objetClasseur(f0), this.dossiers)
      if (avant === cible) return false
      etiquettesAvant = etiquettesEffectives(f0, this.dossiers).map(e => e.nom)
      let ailleurs = false
      let f: FicheClasseur | undefined
      try {
        f = await this.suivre(this.registre.modifierClasseur(id, x => {
          if (annulation && ouIlEst(objetClasseur(x), this.dossiers) !== o.siEncore) { ailleurs = true; return }
          x.dossier = cible
        }))
      } catch (e) { this.hote.message(`Le classeur n'a pas pu être déplacé : ${messageDe(e)}.`); return false }
      if (!f) { this.hote.message('Ce classeur n\'est plus dans la bibliothèque.'); return false }
      this.fiches.set(id, f)
      if (ailleurs) { this.rendre(null); this.hote.message(`« ${f.nom} » a changé de place depuis : il reste où il est.`); return false }
      nom = f.nom
      etiquettesApres = etiquettesEffectives(f, this.dossiers).map(e => e.nom)
    } else {
      const d0 = this.dossiers.get(id)
      if (!d0) { this.hote.message(DOSSIER_PARTI); this.rendre(null); return false }
      avant = ouIlEst(objetDossier(d0), this.dossiers)
      if (avant === cible) return false
      if (annulation && avant !== o.siEncore) { this.hote.message(`Le dossier « ${d0.nom} » a changé de place depuis : il reste où il est.`); return false }
      const h0 = etiquetteHeritee(id, this.dossiers)
      etiquettesAvant = h0 ? [h0.nom] : []
      try {
        await this.suivre(this.registre.deplacerDossier(id, cible))
      } catch (e) {
        this.hote.message(e instanceof ErreurRegistre && e.raison === 'cycle' ? REFUS_CYCLE
          : e instanceof ErreurRegistre ? e.message : `Le dossier n'a pas pu être déplacé : ${messageDe(e)}.`)
        try { this.dossiers = new Map((await this.registre.dossiers()).map(d => [d.id, d])) } catch { /* l'écran se relira */ }
        this.rendre(null)
        return false
      }
      // Tous relus : un autre onglet a pu en ranger d'autres
      try { this.dossiers = new Map((await this.registre.dossiers()).map(d => [d.id, d])) } catch { this.dossiers.set(id, { ...d0, parent: cible }) }
      nom = d0.nom
      const h1 = etiquetteHeritee(id, this.dossiers)
      etiquettesApres = h1 ? [h1.nom] : []
    }
    this.rendre(null)
    // Le focus : sur la carte si elle est encore là, sinon sur sa voisine
    const a = document.activeElement
    if (l0 && this.ouvert && (!a || a === document.body || !this.el.contains(a) || l0.el.contains(a))) {
      const suivante = l0.cartes.has(cle) ? cle : l0.ordre[Math.min(Math.max(rang, 0), l0.ordre.length - 1)]
      if (suivante) this.focusCarte(l0, suivante, false)
      else if (!this.videDossier.hidden) this.videDossier.querySelector<HTMLElement>('button')?.focus()
    }
    // Le fichier du classeur suit (lot 18), dans le clic : la phrase qui le
    // dit s'ajoute au message
    let fichier = ''
    if (!dossier) {
      const f = this.fiches.get(id)
      if (f) {
        fichier = await this.leDeplaceur.suivre(f, dossierDAvant, cible).catch(() => '')
        if (fichier) this.ficheChange(id)
      }
    }
    const apres = fichier ? `. ${fichier}` : ''
    const genre = dossier ? 'dossier' : 'classeur'
    if (annulation) { this.hote.message(texteRetour({ genre, nom, vers }) + apres); return true }
    const ancien = avant
    this.hote.message(texteDeplacement({ genre, nom, vers, avant: etiquettesAvant, apres: etiquettesApres }) + apres, [
      { libelle: texteAllerA(vers), faire: () => this.allerVers(cible, cle) },
      { libelle: ANNULER, faire: () => void this.deplacerVers(cle, ancien, { siEncore: cible }) },
    ])
    return true
  },

  /** « Aller à « 5e B » » : le dossier où l'on vient de ranger la carte, le
   *  focus sur elle. Depuis le menu ⋯ du classeur (la bibliothèque fermée,
   *  lot 18) : elle s'ouvre d'abord. */
  allerVers(this: Bibliotheque, dossierId: string | null, cle: string): void {
    if (this.depart) return
    if (!this.ouvert) {
      this.hote.ui?.ouvrirBibliotheque()
      if (!this.ouvert) return
      void this.charger().then(() => { if (this.ouvert && !this.depart) this.allerVers(dossierId, cle) })
      return
    }
    if (dossierId !== null && !this.dossiers.has(dossierId)) { this.hote.message(DOSSIER_PARTI); return }
    this.allerA(dossierId)
    if (this.tous.cartes.has(cle)) this.focusCarte(this.tous, cle)
  },

  // ---------- Dupliquer le classeur (lot 4 C7) ----------
  /** Une copie complète du classeur, avec toute son histoire (la revue et le
   *  replay y marchent), faite par l'écrivain hors du fil principal (voir
   *  ecrivain-pur.preparerCopie) : son registre des publications est vidé,
   *  et elle est marquée comme copie (publier depuis la copie une séance de
   *  l'original fait un nouveau lien, sans toucher à celui de l'autre
   *  classe : sans la marque, Publier retrouverait la séance de l'original
   *  sur le Drive par sa clé). La fiche : « Symétrie
   *  (copie) » (un nom libre), le même dossier, les mêmes étiquettes propres,
   *  créée maintenant, jamais ouverte, ses pages, l'aperçu de l'original ;
   *  ni clé, ni Drive. Par Registre.creerClasseur : si la copie échoue (plus
   *  de place), rien ne reste. Le classeur de cet onglet : ce qui attend
   *  s'écrit d'abord. « Copie du classeur… » au-delà de 300 ms. */
  async dupliquer(this: Bibliotheque, id: string): Promise<FicheClasseur | null> {
    const f = this.fiches.get(id)
    if (!f || this.depart || this.copieEnCours) return null
    this.copieEnCours = true
    this.finirSaisie(true)
    const patience = window.setTimeout(() => this.hote.message('Copie du classeur…'), PATIENCE_COPIE)
    try {
      if (this.hote.classeur?.id === f.id && this.hote.avantDeDupliquer && !await this.hote.avantDeDupliquer()) {
        clearTimeout(patience)
        this.hote.message(`${PAS_DUPLIQUE} : il n'est pas entièrement enregistré dans ce navigateur. Enregistrez-le d'abord dans un fichier.`)
        return null
      }
      const nouveau = idClasseur(), t = Date.now()
      const nom = nomLibre(f.nom, [...this.fiches.values()].map(x => x.nom))
      const fiche: FicheClasseur = { id: nouveau, base: baseDe(nouveau), nom, dossier: f.dossier, etiquettes: [...(f.etiquettes ?? [])], cree: t, modifie: t, ouvert: 0, pages: f.pages }
      let copie: CopieFaite | null = null
      let faite = await this.suivre(this.registre.creerClasseur(fiche, async base => {
        copie = await ecrivain.copierClasseur(f.base, base, { id: nouveau, nom })
        return { creee: true }
      }))
      const c = copie as CopieFaite | null
      if (c) faite = (await this.suivre(this.registre.modifierClasseur(nouveau, x => { x.pages = c.pages; x.vecteur = c.vecteur })).catch(() => undefined)) ?? faite
      // L'aperçu de l'original (la même première page)
      const image = await this.registre.apercu(f.id).catch(() => undefined)
      if (image && await this.registre.ecrireApercu(nouveau, image)) this.poserImage(nouveau, image)
      clearTimeout(patience)
      this.fiches.set(nouveau, faite)
      this.rendre(null)
      const l = this.listes.find(x => x.cartes.has(nouveau) && x.el.contains(document.activeElement)) ?? (this.tous.cartes.has(nouveau) ? this.tous : null)
      if (l && this.ouvert && !document.querySelector('dialog[open]')) this.focusCarte(l, nouveau)
      const texte = c?.publications ? `Classeur dupliqué : « ${nom} ». ${TEXTE_PUBLIEES_COPIE}` : `Classeur dupliqué : « ${nom} ».`
      this.hote.message(texte, { libelle: 'Ouvrir', faire: () => { const x = this.fiches.get(nouveau); if (x) void this.ouvrirClasseur(x) } })
      return faite
    } catch (e) {
      clearTimeout(patience)
      // La raison d'une ErreurEcrivain ou d'une ErreurBase, lue à sa forme
      const r = (e as { raison?: unknown } | null)?.raison
      const raison = typeof r === 'string' ? r : nomErreur(e) === 'QuotaExceededError' ? 'place' : 'autre'
      this.hote.message(raison === 'place' ? PLUS_DE_PLACE_COPIE
        : raison === 'abimee' ? `${PAS_DUPLIQUE} : il semble abîmé dans ce navigateur. Ouvrez-le, et enregistrez-le dans un fichier.`
        : raison === 'absente' ? `${PAS_DUPLIQUE} : sa base n'est plus dans ce navigateur.`
        : `${PAS_DUPLIQUE} : ${messageDe(e)}.`)
      return null
    } finally { this.copieEnCours = false }
  },

  // ---------- La corbeille de la bibliothèque (lot 4 C8) ----------
  /** Le bouton « Corbeille (3) » (grisé « Corbeille » quand elle est vide),
   *  le × (le classeur de l'onglet dans la corbeille : on ne peut plus y
   *  revenir sans le remettre), la vue si elle est montrée */
  majCorbeille(this: Bibliotheque): void {
    const n = elementsDeLaCorbeille([...this.fiches.values()], this.dossiers).length
    const l = libelleCorbeille(n), b = this.boutonCorbeille
    const long = b.querySelector('.libelle-long')!, court = b.querySelector('.libelle-court')!
    if (long.textContent !== l.texte) long.textContent = l.texte
    const c = n ? String(n) : ''
    if (court.textContent !== c) court.textContent = c
    if (b.getAttribute('aria-label') !== l.nom) b.setAttribute('aria-label', l.nom)
    const gris = !n && !this.vue.ouverte
    if (b.disabled !== gris) { b.disabled = gris; b.setAttribute('aria-disabled', String(gris)) }
    const sansCroix = !this.peutFermer
    if (this.fermerBouton.hidden !== sansCroix) this.fermerBouton.hidden = sansCroix
    if (this.vue.ouverte) this.vue.maj()
    if (this.vueSeances.ouverte) this.vueSeances.maj()
  },

  basculerCorbeille(this: Bibliotheque): void {
    if (this.vue.ouverte) this.quitterCorbeille()
    else this.ouvrirCorbeille()
  },

  /** La vue de la corbeille, à la place des cartes */
  ouvrirCorbeille(this: Bibliotheque): void {
    if (!this.ouvert || this.depart || this.vue.ouverte) return
    if (this.vueSeances.ouverte) this.quitterVueSeances(false)
    this.annulerGlisser()
    if (this.menuCarte || this.menuBandeauOuvert || this.menuTriOuvert) fermerMenu()
    this.finirSaisie(true)
    this.annulerClicNom()
    this.el.classList.add('en-corbeille')
    this.boutonCorbeille.setAttribute('aria-pressed', 'true')
    this.vue.ouvrir()
    this.majCorbeille()
  },

  /** Retour aux cartes (« Bibliothèque », Échap, le bouton « Corbeille ») ;
   *  le focus revient au bouton « Corbeille » */
  quitterCorbeille(this: Bibliotheque, rendreFocus = true): void {
    if (!this.vue.ouverte) return
    const avait = this.vue.el.contains(document.activeElement)
    this.vue.fermer()
    this.el.classList.remove('en-corbeille')
    this.boutonCorbeille.setAttribute('aria-pressed', 'false')
    this.rendre(null)
    if (this.ouvert && (rendreFocus || avait)) {
      if (!this.boutonCorbeille.disabled) this.boutonCorbeille.focus()
      else this.el.querySelector<HTMLElement>('.biblio-nouveau')?.focus()
    }
  },
}
