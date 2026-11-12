// =============================================================
// LA BIBLIOTHÈQUE : LA VUE « SÉANCES », LES APERÇUS, OUVRIR UN AUTRE CLASSEUR, NOUVEAU CLASSEUR
// Des méthodes de la classe Bibliotheque (src/classeurs/bibliotheque.ts), rangées ici par sujet :
// elles s'ajoutent à la classe à la fin de bibliotheque.ts (ajouterMethodes).
// =============================================================
import type { Bibliotheque } from '../bibliotheque'
import { fermerSurLeFond } from '../../dialogue'
import { EXTENSION_TABLEAU, nomSur } from '../../fichier'
import { fermerMenu } from '../../menus'
import { avalerLeSecondAppui } from '../../pages/trieuse'
import { passerLaConnexion } from '../../publication/drive'
import { ecrire } from '../../reglages'
import { cleDernierEnregistrement, lireDernierEnregistrement } from '../../sauvegarde'
import { FOND_NEUF } from '../../types'
import type { Fond } from '../../types'
import { adopterLesOrphelines } from '../adoption'
import { cheminLisible, compter, dossierVisible, etiquetteHeritee } from '../arbre'
import { ANNULER, CLE_ARRIVEE, CLE_MESSAGE, CLE_RAPPEL_ARRIVEE, DEPART_MAX, DOSSIER, FONDS_NEUF, NOM_NOUVEAU, PATIENCE, PATIENCE_EFFACEMENT, PATIENCE_VERIFICATION, attendre, memesOctets, messageDe, nomErreur, noterRappel, question, rappelDejaFait, texteEchecCreation } from '../bibliotheque'
import type { Quoi, RappelArrivee } from '../bibliotheque'
import { AIDE_ACTIVER, ID_CHOIX, TYPES_CLASSEUR, ecrireLeNeuf, examinerPourUnNeuf, raisonCle } from '../cle'
import type { CleALArrivee, PoigneeFichier } from '../cle'
import { BLOQUE, PAS_EFFACE, TITRE_VIDER, VERIFICATION_IMAGES, contenuDeLaCorbeille, contenuDuDossier, jamaisEnregistre, pagesDe, sauvegardesDe, texteAvantVider, texteCeQuiReste, texteDefinitifClasseur, texteDefinitifDossier, texteEfface, texteJamais, texteMisALaCorbeille, texteNonVerifie, textePasRecopiees, textePlace, texteRecopiees, texteRemis, texteRetrouves, texteVidee, texteViderBibliotheque, titreDefinitifClasseur, titreDefinitifDossier } from '../corbeille'
import { LONGUEUR_NOM_CLASSEUR, parents, urlDuClasseur } from '../demarrage'
import type { FicheClasseur, FicheDossier } from '../demarrage'
import { DOSSIER_PARTI } from '../deplacer'
import { ecrivain } from '../ecrivain'
import { effacerLesClasseurs } from '../effacer'
import { enregistrerDepuisLaBase } from '../enregistrer'
import { rappelAuDepart, texteRappelDepart } from '../etat'
import { nomDeClasseur } from '../liste'
import type { Endroit } from '../ranger'
import { ecritDansUnFichier } from '../surveillance'
import type { AvantEffacement, Verification } from '../verification'

export const methodesVueSeances = {
  // ---------- La vue « Séances » (lot 8, idée B) ----------
  basculerVueSeances(this: Bibliotheque): void {
    if (this.vueSeances.ouverte) this.quitterVueSeances()
    else this.ouvrirVueSeances()
  },

  /** Toutes les séances, à la place des cartes */
  ouvrirVueSeances(this: Bibliotheque): void {
    if (!this.ouvert || this.depart || this.vueSeances.ouverte) return
    if (this.vue.ouverte) this.quitterCorbeille(false)
    this.annulerGlisser()
    if (this.menuCarte || this.menuBandeauOuvert || this.menuTriOuvert) fermerMenu()
    this.finirSaisie(true)
    this.annulerClicNom()
    this.el.classList.add('en-seances')
    this.boutonSeances.setAttribute('aria-pressed', 'true')
    this.vueSeances.ouvrir()
  },

  /** Retour aux cartes (« Bibliothèque », Échap, le bouton « Séances ») */
  quitterVueSeances(this: Bibliotheque, rendreFocus = true): void {
    if (!this.vueSeances.ouverte) return
    const avait = this.vueSeances.el.contains(document.activeElement)
    this.vueSeances.fermer()
    this.el.classList.remove('en-seances')
    this.boutonSeances.setAttribute('aria-pressed', 'false')
    this.rendre(null)
    if (this.ouvert && (rendreFocus || avait)) this.boutonSeances.focus()
  },

  /** « Supprimer » (le menu d'une carte, Suppr) : le classeur ou le dossier
   *  va dans la corbeille de la bibliothèque, sans question ; rien n'est
   *  effacé. Le message, avec « Annuler » (7 s), qui le rend tel quel. Le
   *  classeur de cet onglet (ou son dossier) : la bibliothèque reste
   *  ouverte, sans × (le Tableau garde sa base : « Annuler » le rend) ; au
   *  rechargement, la bibliothèque seule dit qu'il est dans la corbeille. */
  async supprimer(this: Bibliotheque, cle: string): Promise<boolean> {
    if (this.depart || !this.ouvert) return false
    this.finirSaisie(true)
    this.annulerClicNom()
    const dossier = cle.startsWith(DOSSIER), id = dossier ? cle.slice(DOSSIER.length) : cle
    const actif = document.activeElement
    const l0 = actif instanceof HTMLElement ? this.listes.find(x => x.el.contains(actif)) : undefined
    const rang = l0 ? l0.ordre.indexOf(cle) : -1
    const t = Date.now()
    let texte: string
    try {
      if (!dossier) {
        const f = await this.suivre(this.registre.modifierClasseur(id, x => { if (x.effacement == null) x.corbeille = { t } }))
        if (!f) { this.hote.message('Ce classeur n\'est plus dans la bibliothèque.'); return false }
        this.fiches.set(id, f)
        texte = texteMisALaCorbeille({ genre: 'classeur', nom: f.nom })
      } else {
        const d0 = this.dossiers.get(id)
        if (!d0) { this.hote.message(DOSSIER_PARTI); return false }
        const contenu = compter(id, [...this.fiches.values()], this.dossiers)
        const d = await this.suivre(this.registre.modifierDossier(id, x => { x.corbeille = { t } }))
        if (!d) { this.hote.message(DOSSIER_PARTI); return false }
        this.dossiers.set(id, d)
        texte = texteMisALaCorbeille({ genre: 'dossier', nom: d.nom, contenu })
      }
    } catch (e) {
      this.hote.message(`${dossier ? 'Le dossier' : 'Le classeur'} n'a pas pu être supprimé : ${messageDe(e)}.`)
      return false
    }
    this.rendre(null)
    // Le focus : sur la carte voisine
    const a = document.activeElement
    if (l0 && this.ouvert && !this.vue.ouverte && (!a || a === document.body || !this.el.contains(a) || l0.el.contains(a))) {
      const suivante = l0.cartes.has(cle) ? cle : l0.ordre[Math.min(Math.max(rang, 0), l0.ordre.length - 1)]
      if (suivante) this.focusCarte(l0, suivante, false)
      else if (!this.videDossier.hidden) this.videDossier.querySelector<HTMLElement>('button')?.focus()
      else this.el.querySelector<HTMLElement>('.biblio-nouveau')?.focus()
    }
    this.hote.message(texte, { libelle: ANNULER, faire: () => void this.annulerSuppression(cle, t), cle: CLE_MESSAGE + cle })
    return true
  },

  /** « Annuler » après Supprimer : il revient tel quel, s'il est encore dans
   *  la corbeille depuis ce moment-là */
  async annulerSuppression(this: Bibliotheque, cle: string, t: number): Promise<void> {
    const dossier = cle.startsWith(DOSSIER), id = dossier ? cle.slice(DOSSIER.length) : cle
    try {
      if (!dossier) {
        let la = false
        const f = await this.suivre(this.registre.modifierClasseur(id, x => { if (x.corbeille?.t === t && x.effacement == null) { delete x.corbeille; la = true } }))
        if (!f || !la) { this.hote.message('Ce classeur n\'est plus dans la corbeille.'); return }
        this.fiches.set(id, f)
        this.rendre(null)
        this.hote.message(`« ${f.nom} » est de retour.`)
      } else {
        let la = false
        const d = await this.suivre(this.registre.modifierDossier(id, x => { if (x.corbeille?.t === t) { delete x.corbeille; la = true } }))
        if (!d || !la) { this.hote.message('Ce dossier n\'est plus dans la corbeille.'); return }
        this.dossiers.set(id, d)
        this.rendre(null)
        this.hote.message(`Dossier « ${d.nom} » de retour.`)
      }
    } catch (e) { this.hote.message(`Rien n'a pu être rendu : ${messageDe(e)}.`) }
  },

  /** « Remettre » : le classeur ou le dossier revient dans son dossier, ou à
   *  la racine si celui-ci ne se montre plus (supprimé, ou dans la
   *  corbeille) ; le message le dit, avec « Annuler ». On reste dans la vue
   *  de la corbeille (le focus passe à la carte suivante). */
  async remettre(this: Bibliotheque, cle: string): Promise<void> {
    const dossier = cle.startsWith(DOSSIER), id = dossier ? cle.slice(DOSSIER.length) : cle
    try {
      if (!dossier) {
        const r = await this.suivre(this.registre.remettreClasseur(id))
        if (!r) { this.hote.message('Ce classeur n\'est plus dans la corbeille.'); await this.charger(); return }
        this.fiches.set(id, r.fiche)
        const vers = r.ou.dossier === null ? null : this.dossiers.get(r.ou.dossier)?.nom ?? null
        this.rendre(null)
        // Remis dans un niveau rangé (lot 18) : il reçoit son fichier à sa
        // place, et le message le dit (le clic sur « Remettre » est le geste)
        let fichier = ''
        if (this.ranger && !r.fiche.cle && r.fiche.dossier !== null) {
          const c = await this.ranger.donnerSonFichier(r.fiche, { geste: true, dire: t => { fichier += ' ' + t } })
          if (c) {
            const relu = await this.registre.classeur(id).catch(() => undefined)
            if (relu) this.fiches.set(id, relu)
            fichier += c.ok ? ` ${c.ok}` : ` Son fichier est écrit dans « ${relu?.cle?.chemin ? relu.cle.chemin.join(' › ') : c.nom} ».`
          }
        }
        this.hote.message(texteRemis({ genre: 'classeur', nom: r.fiche.nom, vers, raison: r.ou.raison }) + (fichier ? '.' + fichier : ''), { libelle: ANNULER, faire: () => void this.annulerRemise(cle, r.avant.t, r.avant.dossier), cle: CLE_MESSAGE + cle })
      } else {
        const r = await this.suivre(this.registre.remettreDossier(id))
        if (!r) { this.hote.message('Ce dossier n\'est plus dans la corbeille.'); await this.charger(); return }
        this.dossiers.set(id, r.dossier)
        const vers = r.ou.dossier === null ? null : this.dossiers.get(r.ou.dossier)?.nom ?? null
        this.rendre(null)
        this.hote.message(texteRemis({ genre: 'dossier', nom: r.dossier.nom, vers, raison: r.ou.raison }), { libelle: ANNULER, faire: () => void this.annulerRemise(cle, r.avant.t, r.avant.parent), cle: CLE_MESSAGE + cle })
      }
    } catch (e) {
      this.hote.message(`${dossier ? 'Le dossier' : 'Le classeur'} n'a pas pu être remis : ${messageDe(e)}.`)
    }
  },

  /** « Annuler » après Remettre : de nouveau dans la corbeille, là où il
   *  était (s'il n'y est pas déjà retourné, et sans jamais faire de cycle) */
  async annulerRemise(this: Bibliotheque, cle: string, t: number, ou: string | null): Promise<void> {
    const dossier = cle.startsWith(DOSSIER), id = dossier ? cle.slice(DOSSIER.length) : cle
    try {
      if (!dossier) {
        let fait = false
        const f = await this.suivre(this.registre.modifierClasseur(id, x => { if (x.corbeille || x.effacement != null) return; x.corbeille = { t }; x.dossier = ou; fait = true }))
        if (!f || !fait) return
        this.fiches.set(id, f)
        this.rendre(null)
        this.hote.message(`« ${f.nom} » est de nouveau dans la corbeille.`)
      } else {
        let fait = false
        const d = await this.suivre(this.registre.modifierDossier(id, x => {
          if (x.corbeille) return
          x.corbeille = { t }
          if (ou === null || (ou !== id && this.dossiers.has(ou) && !parents(ou, this.dossiers).some(p => p.id === id))) x.parent = ou
          fait = true
        }))
        if (!d || !fait) return
        this.dossiers.set(id, d)
        this.rendre(null)
        this.hote.message(`Dossier « ${d.nom} » de nouveau dans la corbeille.`)
      }
    } catch (e) { this.hote.message(`Rien n'a pu être défait : ${messageDe(e)}.`) }
  },

  /** La date du dernier enregistrement de ce classeur dans un fichier (null : jamais) */
  dernierEnregistrement(this: Bibliotheque, f: FicheClasseur): number | null {
    try { return lireDernierEnregistrement(localStorage.getItem(cleDernierEnregistrement(f))) } catch { return null }
  },

  /** « Enregistrer d'abord » : le classeur de l'onglet par sa sauvegarde (ce
   *  qui attend encore s'y écrit), un autre depuis sa base */
  enregistrerAvant(this: Bibliotheque, f: FicheClasseur): Promise<boolean> {
    const ui = this.hote.ui
    if (this.hote.classeur?.id === f.id && ui) return ui.sauvegarde.enregistrer().catch(() => false)
    return enregistrerDepuisLaBase(f, t => this.hote.message(t))
  },

  /** « Supprimer définitivement » (une carte de la corbeille) : une question,
   *  puis l'effacement (voir effacer). Un classeur jamais enregistré dans un
   *  fichier ni copié sur le Drive : la question le dit, et propose
   *  « Enregistrer d'abord ». Un dossier : tous ses classeurs et tous ses
   *  sous-dossiers. */
  async supprimerDefinitivement(this: Bibliotheque, cle: string): Promise<void> {
    if (this.effacementEnCours || this.gardeEnCours || this.depart) return
    const dossier = cle.startsWith(DOSSIER), id = dossier ? cle.slice(DOSSIER.length) : cle
    if (!dossier) {
      const f = this.fiches.get(id)
      if (!f) return
      const sauvegardes = sauvegardesDe(f, this.dernierEnregistrement(f))
      const jamais = !sauvegardes.fichier && !sauvegardes.drive
      const garde = await this.verifierAvant([f])
      const oui = await this.demanderEffacement({
        titre: titreDefinitifClasseur(f.nom), bouton: 'Supprimer définitivement',
        textes: [texteDefinitifClasseur(f.pages), texteCeQuiReste(sauvegardes), ...garde.textes],
        ...(jamais ? { enregistrer: () => this.enregistrerAvant(f), apres: texteCeQuiReste({ fichier: true, drive: false }) } : {}),
      })
      if (!oui) return
      const x = this.fiches.get(id)
      if (!x) return
      await this.recopierPuisEffacer([x], [], garde, { genre: 'classeur', nom: x.nom })
      return
    }
    const d = this.dossiers.get(id)
    if (!d) return
    const fiches = [...this.fiches.values()]
    const c = contenuDuDossier(id, fiches, this.dossiers)
    const jamais = c.classeurs.filter(f => jamaisEnregistre(f, this.dernierEnregistrement(f))).length
    const garde = await this.verifierAvant(c.classeurs)
    const oui = await this.demanderEffacement({
      titre: titreDefinitifDossier(d.nom), bouton: 'Supprimer définitivement',
      textes: [texteDefinitifDossier({ classeurs: c.classeurs.length, pages: pagesDe(c.classeurs), dossiers: c.dossiers.length }), texteJamais(jamais), ...garde.textes],
    })
    if (!oui) return
    // Relu : un autre onglet a pu changer quelque chose pendant la question
    const c2 = contenuDuDossier(id, [...this.fiches.values()], this.dossiers)
    await this.recopierPuisEffacer(c2.classeurs, [...c2.dossiers, d], garde, { genre: 'dossier', nom: d.nom })
  },

  /** « Vider la corbeille » : une question, puis tout ce qu'elle contient
   *  est effacé (les classeurs des dossiers aussi) */
  async viderLaCorbeille(this: Bibliotheque): Promise<void> {
    if (this.effacementEnCours || this.gardeEnCours || this.depart) return
    const c = contenuDeLaCorbeille([...this.fiches.values()], this.dossiers)
    if (!c.classeurs.length && !c.dossiers.length) return
    const jamais = c.classeurs.filter(f => jamaisEnregistre(f, this.dernierEnregistrement(f))).length
    const garde = await this.verifierAvant(c.classeurs)
    const oui = await this.demanderEffacement({
      titre: TITRE_VIDER, bouton: 'Vider la corbeille',
      textes: [texteViderBibliotheque({ classeurs: c.classeurs.length, pages: pagesDe(c.classeurs), dossiers: c.dossiers.length }), texteJamais(jamais), ...garde.textes],
    })
    if (!oui) return
    const c2 = contenuDeLaCorbeille([...this.fiches.values()], this.dossiers)
    await this.recopierPuisEffacer(c2.classeurs, c2.dossiers, garde, { vider: true })
  },

  /** Avant la question : les images dont ces classeurs tiennent la dernière
   *  copie, qu'un classeur qui reste montre encore (lot 17, voir
   *  verification.ts) ; au-delà de 0,4 s, le message « Vérification des
   *  images… ». Les paragraphes à ajouter à la question : les recopies à
   *  faire, les classeurs qui n'ont pas pu être vérifiés (on les effacera
   *  quand même). Sans vérification branchée, ou si elle échoue : rien. */
  async verifierAvant(this: Bibliotheque, classeurs: readonly FicheClasseur[]): Promise<AvantEffacement & { textes: string[] }> {
    const rien = { copies: [], nonVerifies: [], textes: [] }
    if (!this.verification || !classeurs.length) return rien
    this.gardeEnCours = true
    const patience = window.setTimeout(() => this.hote.message(VERIFICATION_IMAGES), PATIENCE_VERIFICATION)
    try {
      const r = await this.verification.avantDEffacer(classeurs)
      const images = new Set(r.copies.flatMap(c => c.images.map(i => i.src))).size
      return { ...r, textes: [texteAvantVider(images, r.copies.map(c => c.vers.nom)), texteNonVerifie(r.nonVerifies)] }
    } catch { return rien } finally { clearTimeout(patience); this.gardeEnCours = false }
  },

  /** Après la question : les recopies d'abord, puis l'effacement. Un
   *  classeur dont une recopie a échoué n'est pas effacé (ni les dossiers
   *  qui le gardent), et le message de fin le dit ; les autres le sont. */
  async recopierPuisEffacer(this: Bibliotheque, classeurs: FicheClasseur[], dossiers: FicheDossier[], garde: AvantEffacement, quoi: Quoi): Promise<void> {
    if (!garde.copies.length || !this.verification) { await this.effacer(classeurs, dossiers, quoi); return }
    if (this.effacementEnCours) return
    this.effacementEnCours = true
    const patience = window.setTimeout(() => this.hote.message('Recopie des images…'), PATIENCE_EFFACEMENT)
    let r: Awaited<ReturnType<Verification['recopier']>>
    try { r = await this.verification.recopier(garde.copies) } finally { clearTimeout(patience); this.effacementEnCours = false }
    const retenus = new Set(r.echecs.flatMap(e => e.depuis.map(x => x.id)))
    // Un dossier qui garde encore un classeur retenu reste aussi
    const dossiersGardes = new Set(classeurs.filter(f => retenus.has(f.id)).flatMap(f => parents(f.dossier, this.dossiers).map(d => d.id)))
    const suite = [texteRecopiees(r.faites), ...r.echecs.flatMap(e => e.depuis.map(x => textePasRecopiees(x.nom, [e.vers])))].filter(Boolean).join(' ')
    const restants = classeurs.filter(f => !retenus.has(f.id)), dossiersRestants = dossiers.filter(d => !dossiersGardes.has(d.id))
    if (!restants.length && !dossiersRestants.length) { this.hote.message(suite); return }
    await this.effacer(restants, dossiersRestants, { ...quoi, suite })
  },

  /** Efface pour de bon ces classeurs (voir effacer.ts : leurs fiches
   *  disparaissent, les onglets ouverts sur eux cessent d'écrire, leurs
   *  bases s'effacent), puis ces dossiers (le plus profond d'abord). Le
   *  classeur de cet onglet en fait partie : l'onglet passe sans classeur. */
  async effacer(this: Bibliotheque, classeurs: FicheClasseur[], dossiers: FicheDossier[], quoi: Quoi): Promise<void> {
    if (this.effacementEnCours) return
    this.effacementEnCours = true
    const patience = window.setTimeout(() => this.hote.message('Effacement…'), PATIENCE_EFFACEMENT)
    try {
      const ici = this.hote.classeur
      const r = await effacerLesClasseurs(this.registre, classeurs, {
        ici: ici && classeurs.some(f => f.id === ici.id) ? { id: ici.id, couper: () => this.classeurEffaceIci() } : null,
        vecteurDe: base => ecrivain.vecteurDeLaBase(base, { travailleurSeul: true }).then(x => x.vecteur),
        // Une base bloquée par un onglet, enfin effacée
        fini: () => { if (this.ouvert) { void this.charger(); void this.majPlace() } },
      })
      let dossiersPartis = 0
      for (const d of dossiers) {
        try { await this.suivre(this.registre.supprimerDossier(d.id)); dossiersPartis++ } catch { /* il reste, vide */ }
      }
      clearTimeout(patience)
      // Les « Annuler » de ce qui vient d'être effacé n'ont plus d'objet
      for (const f of classeurs) this.hote.oublierMessage?.(CLE_MESSAGE + f.id)
      for (const d of dossiers) this.hote.oublierMessage?.(CLE_MESSAGE + DOSSIER + d.id)
      await this.charger()
      // Ce qu'un onglet tient encore ouvert part à sa fermeture ; une erreur du
      // navigateur, au prochain démarrage (la fiche reste cachée d'ici là)
      const fin = [r.bloques.length ? BLOQUE : '', r.echecs.length ? PAS_EFFACE : ''].filter(Boolean).join(' ')
      let texte: string
      if ('vider' in quoi) texte = [texteVidee({ classeurs: r.effaces.length + r.bloques.length, dossiers: dossiersPartis }), fin].filter(Boolean).join(' ')
      else if (quoi.genre === 'dossier') texte = [texteEfface(quoi), fin].filter(Boolean).join(' ')
      else texte = r.effaces.length || !fin ? texteEfface(quoi) : fin
      // Les images recopiées avant d'effacer, et ce qui n'a pas été effacé (lot 17)
      if (quoi.suite) texte = `${texte} ${quoi.suite}`
      this.hote.message(texte)
      void this.majPlace()
    } catch (e) {
      clearTimeout(patience)
      this.hote.message(`L'effacement n'a pas pu se faire : ${messageDe(e)}.`)
    } finally { this.effacementEnCours = false }
  },

  /** Le classeur de cet onglet vient d'être effacé : l'onglet passe sans
   *  classeur, la bibliothèque reste ouverte, sans × */
  classeurEffaceIci(this: Bibliotheque): void {
    this.hote.classeurEfface?.()
    this.hote.classeur = null
    this.hote.surveillance = null
    this.fermerBouton.hidden = true
    this.majLigneOuvert()
  },

  /** La question avant d'effacer, dans une fenêtre de l'outil (pas
   *  confirm()) : « Annuler » a le focus ; Échap ou un clic à côté la
   *  ferment sans rien faire. enregistrer : « Enregistrer d'abord » (le choix
   *  du fichier s'ouvre dans le clic) ; une fois fait, le paragraphe qui
   *  disait « il n'en restera rien » dit apres. Vrai : on a confirmé. */
  demanderEffacement(this: Bibliotheque, o: { titre: string; textes: string[]; bouton: string; enregistrer?: () => Promise<boolean>; apres?: string }): Promise<boolean> {
    return new Promise(ok => {
      const avant = document.activeElement as HTMLElement | null
      const d = document.createElement('dialog')
      d.className = 'dialogue dialogue-corbeille dialogue-effacer'
      d.setAttribute('aria-labelledby', 'effacer-titre')
      d.innerHTML = `<h2 id="effacer-titre"></h2><div class="corps"><div class="textes"></div><div class="actions">
        <button type="button" class="secondaire" data-a="annuler">Annuler</button>
        ${o.enregistrer ? '<button type="button" class="secondaire" data-a="enregistrer">Enregistrer d\'abord</button>' : ''}
        <button type="button" class="principal danger-plein" data-a="oui"></button></div></div>`
      d.querySelector('h2')!.textContent = o.titre
      const textes = d.querySelector('.textes')!
      const ps = o.textes.filter(Boolean).map(t => Object.assign(document.createElement('p'), { textContent: t }))
      textes.append(...ps)
      const oui = d.querySelector<HTMLButtonElement>('[data-a="oui"]')!, non = d.querySelector<HTMLButtonElement>('[data-a="annuler"]')!
      oui.textContent = o.bouton
      let reponse = false
      d.addEventListener('close', () => {
        d.remove()
        if (avant?.isConnected && this.ouvert) avant.focus({ preventScroll: true })
        ok(reponse)
      })
      fermerSurLeFond(d, () => d.close())
      non.addEventListener('click', () => d.close())
      oui.addEventListener('click', () => { reponse = true; d.close() })
      const enr = d.querySelector<HTMLButtonElement>('[data-a="enregistrer"]')
      if (enr && o.enregistrer) {
        const faire = o.enregistrer
        enr.addEventListener('click', async () => {
          enr.disabled = true
          const fait = await faire().catch(() => false)
          if (!d.open) return
          if (fait) {
            enr.textContent = 'Enregistré ✓'
            const p = ps[ps.length - 1]
            if (p && o.apres) p.textContent = o.apres
          } else enr.disabled = false
        })
      }
      document.body.appendChild(d)
      d.showModal()
      non.focus()
    })
  },

  // ---------- Les classeurs retrouvés, la place (lot 4 C8) ----------
  /** Une fois par chargement de la page : les bases de classeur sans fiche
   *  sont examinées, et celles qui ne sont pas vides adoptées (voir
   *  adoption.ts), après le ménage de la reprise (qui a pu en libérer une) */
  async chercherLesOrphelines(this: Bibliotheque): Promise<void> {
    if (this.adoptionFaite) return
    this.adoptionFaite = true
    await this.registre.menage.catch(() => {})
    const r = await adopterLesOrphelines(this.registre, base => ecrivain.examinerBase(base))
    if (!r.adoptees.length) return
    await this.charger()
    this.hote.message(texteRetrouves(r.adoptees.map(f => f.nom)))
  },

  /** « Ce navigateur garde 120 Mo pour ce site. » (navigator.storage.estimate :
   *  l'origine est commune à tous les outils du site), ou l'alerte au-delà de
   *  80 % ; rien si le navigateur ne le dit pas. Rien ne s'efface tout seul. */
  async majPlace(this: Bibliotheque): Promise<void> {
    let e: { usage?: number; quota?: number } | null = null
    try { e = (await navigator.storage?.estimate?.()) ?? null } catch { e = null }
    const t = textePlace(e)
    this.placeEl.hidden = !t
    if (!t) return
    if (this.placeEl.textContent !== t.texte) this.placeEl.textContent = t.texte
    this.placeEl.classList.toggle('alerte', t.alerte)
    if (t.alerte) this.placeEl.setAttribute('role', 'alert'); else this.placeEl.removeAttribute('role')
  },

  // ---------- Les aperçus (lot 4 C7) ----------
  /** L'aperçu d'un classeur en adresse objet (undefined : plus d'aperçu) ;
   *  l'ancienne adresse est révoquée */
  poserImage(this: Bibliotheque, id: string, blob: Blob | undefined): void {
    const x = this.images.get(id)
    if (x && x.blob === blob) return
    if (x) URL.revokeObjectURL(x.url)
    if (!blob) { this.images.delete(id); return }
    this.images.set(id, { blob, url: URL.createObjectURL(blob) })
  },

  /** L'aperçu d'un classeur, relu dans l'index ; gardé tel quel s'il n'a pas
   *  changé (les mêmes octets : l'image ne clignote pas) */
  async relireImage(this: Bibliotheque, id: string): Promise<void> {
    let b: Blob | undefined
    try { b = await this.registre.apercu(id) } catch { return }
    const x = this.images.get(id)
    if (x && b && x.blob.size === b.size && await memesOctets(x.blob, b)) return
    if (!x && !b) return
    this.poserImage(id, b)
  },

  /** L'aperçu du classeur de cet onglet vient d'être refait (voir
   *  apercu-classeur.ts) : sa carte le montre */
  async apercuChange(this: Bibliotheque, id: string): Promise<void> {
    let b: Blob | undefined
    try { b = await this.registre.apercu(id) } catch { return }
    this.poserImage(id, b)
    if (this.ouvert && !this.occupe) this.rendre(new Set([id]))
    else this.aAppliquer.classeurs.add(id)
  },

  /** La bibliothèque se ferme : les adresses objet des aperçus sont
   *  révoquées, les cartes les oublient */
  oublierImages(this: Bibliotheque): void {
    for (const x of this.images.values()) URL.revokeObjectURL(x.url)
    this.images.clear()
    for (const l of this.listes) {
      for (const c of l.cartes.values()) {
        const img = c.querySelector<HTMLImageElement>('.apercu-image')
        if (!img) continue
        img.removeAttribute('src'); img.hidden = true
        this.montrerSansApercu(c, true)
      }
    }
  },

  // ---------- Ouvrir un autre classeur ----------
  /** Ouvrir un classeur, sans rien perdre de celui-ci :
   *  1) ce que la base n'a pas pu enregistrer (le trou) : on demande
   *     (Enregistrer le classeur, Quitter sans enregistrer, Annuler) ;
   *  2) tout ce qui attend s'écrit (avantDeQuitter : 10 s au plus, « Ouvrir
   *     sans attendre » au-delà de 5 s) ;
   *  3) le rappel d'enregistrer, s'il est dû, une fois par période de
   *     travail non enregistré : rien ne bloque, il se lira en arrivant,
   *     avec un bouton qui enregistre le classeur quitté depuis sa base
   *     (CLE_RAPPEL_ARRIVEE, voir main.ts) ;
   *  4) la page se recharge sur l'adresse du classeur.
   *  Celui de l'onglet : l'écran se ferme (le second clic d'un double-clic
   *  ne tombe pas sur le tableau). arrivee : ce qu'on dira en arrivant. */
  async ouvrirClasseur(this: Bibliotheque, f: FicheClasseur, o: { x?: number; y?: number; arrivee?: string; cle?: CleALArrivee; seance?: string; page?: string; forme?: string; publier?: boolean } = {}): Promise<void> {
    const ici = this.hote.classeur
    if (ici && f.id === ici.id) {
      this.fermer()
      const voir = o.publier ? this.hote.publierSeance : this.hote.voirSeance
      if (o.seance && voir?.(o.seance) === false) this.hote.message('Cette séance n\'existe plus dans ce classeur.')
      if (o.page && this.hote.voirPage?.(o.page, o.forme ?? null) === false) this.hote.message('Cette page n\'existe plus dans ce classeur.')
      if (o.x !== undefined && o.y !== undefined) avalerLeSecondAppui(o.x, o.y)
      return
    }
    if (this.depart) return
    this.depart = true
    let parti = false
    try {
      const s = this.hote.surveillance
      // 1) Le trou : ce qui s'est écrit depuis ne se relirait pas
      if (s?.peutQuitter()) {
        const r = await question({
          titre: 'Ce classeur n\'est pas entièrement enregistré',
          texte: `« ${ici?.nom ?? ''} » n'est pas entièrement enregistré dans ce navigateur : ce qui a été écrit depuis l'écriture refusée ne se relirait pas. Enregistrez-le d'abord dans un fichier.`,
          boutons: [
            { cle: 'annuler', libelle: 'Annuler', classe: 'secondaire' },
            { cle: 'quitter', libelle: 'Quitter sans enregistrer', classe: 'secondaire danger' },
            { cle: 'enregistrer', libelle: 'Enregistrer le classeur', classe: 'principal' },
          ],
          focus: 'enregistrer',
        })
        if (r === 'annuler') return
        if (r === 'enregistrer') {
          if (!await this.enregistrer()) return
          if (s.peutQuitter()) return
        } else s.laisserPartir()
      }
      // 2) Tout ce qui attend s'écrit
      await this.attendreLeDepart(f)
      // 3) Le rappel d'enregistrer, une fois par période de travail non
      // enregistré : plus de question ici, on part ; il se lira à l'arrivée
      if (s && ici && rappelAuDepart(s.etat, Date.now()) && !rappelDejaFait(ici.id, s.etat.nonEnregistreDepuis)) {
        noterRappel(ici.id, s.etat.nonEnregistreDepuis)
        const rappel: RappelArrivee & { pour: string } = { pour: f.id, id: ici.id, nom: ici.nom, texte: texteRappelDepart(ici.nom, s.etat, Date.now()) }
        try { sessionStorage.setItem(CLE_RAPPEL_ARRIVEE, JSON.stringify(rappel)) } catch { /* on arrivera sans le rappel */ }
      }
      // 4) La page se recharge sur le classeur, une fois écrit ce qu'on vient
      // de changer dans la bibliothèque (un nom, des étiquettes)
      await Promise.race([this.ecritures, attendre(3000)])
      // (la clé : ce qu'il en est se dira à l'arrivée, une fois vérifiée là-bas)
      if (o.arrivee) { try { sessionStorage.setItem(CLE_ARRIVEE, JSON.stringify({ id: f.id, message: o.arrivee, ...(o.cle ? { cle: o.cle } : {}) })) } catch { /* rien au retour */ } }
      parti = true
      // Ce qui attendait s'est écrit (ou l'on a dit « Ouvrir sans attendre ») :
      // la clé ne pose pas en plus la question du navigateur
      this.hote.surveillance?.partirParLaBibliotheque()
      // La connexion Google suit l'onglet d'un classeur à l'autre (la copie
      // sur le Drive continue sans un clic, voir publication/drive.ts)
      passerLaConnexion()
      location.assign(urlDuClasseur(location.href, f.id, o.seance, { page: o.page, forme: o.forme, publier: o.publier }))
    } finally {
      if (!parti) this.depart = false
    }
  },

  /** Enregistrer le classeur ouvert (Ctrl + S : sur la clé, ou un fichier) */
  async enregistrer(this: Bibliotheque): Promise<boolean> {
    const ui = this.hote.ui
    if (!ui) return false
    try { return await ui.sauvegarde.ctrlS() } catch { return false }
  },

  /** avantDeQuitter, 10 s au plus ; au-delà de 5 s, un bouton « Ouvrir sans attendre » */
  async attendreLeDepart(this: Bibliotheque, f: FicheClasseur): Promise<void> {
    if (!this.hote.classeur) return
    this.hote.message(`Ouverture de « ${f.nom} »…`)
    let sansAttendre: () => void = () => {}
    const bouton = new Promise<void>(ok => { sansAttendre = ok })
    const patience = window.setTimeout(() => {
      this.hote.message(`Ouverture de « ${f.nom} » : les dernières écritures de ce classeur se terminent…`, { libelle: 'Ouvrir sans attendre', faire: () => sansAttendre() })
    }, PATIENCE)
    try {
      await Promise.race([this.hote.avantDeQuitter().catch(() => { /* on part quand même : la base garde ce qu'elle a */ }), bouton, attendre(DEPART_MAX)])
    } finally { clearTimeout(patience) }
  },

  /** La fenêtre « Nouveau classeur » : le nom (« Nouveau classeur », tout
   *  choisi), le fond de la première page, et, quand le navigateur sait
   *  écrire seul dans un fichier, « Enregistrer automatiquement sur la
   *  clé » (cochée d'office dans la version hors ligne : le poste
   *  remis à zéro). Le choix du fichier s'ouvre dans le clic sur « Créer et
   *  ouvrir » ; y renoncer crée quand même le classeur, sans clé. Puis le
   *  classeur s'ouvre (voir ouvrirClasseur). « Nouveau classeur vierge… »
   *  (la fenêtre d'accueil) : le même, mais à la racine, hors de tout
   *  niveau, quel que soit le dossier affiché. */
  nouveauClasseur(this: Bibliotheque, o: { chapitre?: { dossier: string | null; dossiers: ReadonlyMap<string, FicheDossier> }; vierge?: boolean } = {}): void {
    if (document.querySelector('dialog[open]') || this.depart || this.nouveauEnCours) return
    this.finirSaisie(true)
    // Il naît dans le dossier affiché, et en prend l'étiquette de niveau
    // (calculée : pas de champ à remplir). « Nouveau chapitre… » (lot 6, la
    // fenêtre d'accueil) : dans le dossier du niveau, seulement le nom
    // (la première page est blanche) ; la clé comme pour un nouveau classeur
    const chapitre = o.chapitre
    if (chapitre) this.dossiers = new Map(chapitre.dossiers)
    const dossierVoulu = chapitre ? chapitre.dossier : o.vierge ? null : this.dossierAffiche
    const dans = dossierVoulu !== null && this.dossiers.has(dossierVoulu) ? dossierVoulu : null
    this.dossierDuNouveau = dans
    this.nouveauEnCours = true
    void this.fenetreNouveau(o, dans).finally(() => { this.nouveauEnCours = false })
  },

  /** La fenêtre « Nouveau classeur » elle-même (voir nouveauClasseur), après,
   *  s'il y a lieu, « Où ranger les classeurs de « 2nde » ? » (lot 18,
   *  ranger.ts) : au premier classeur d'un niveau pas encore rangé, quelle
   *  que soit la réponse, la fenêtre « Nouveau classeur » suit. Dans un niveau
   *  rangé, plus de case de la clé : la ligne « Son fichier ira dans « … »,
   *  écrit tout seul. », et le fichier s'écrit à sa place avant de partir. */
  async fenetreNouveau(this: Bibliotheque, o: { chapitre?: { dossier: string | null; dossiers: ReadonlyMap<string, FicheDossier> } }, dans: string | null): Promise<void> {
    const chapitre = o.chapitre
    const offrirCle = ecritDansUnFichier() && ecrivain.mode !== 'fil'
    let endroit: Endroit | null = null
    if (dans !== null && this.ranger) {
      // Plus de fenêtre « Où ranger… » d'elle-même (2026-11) : chaque dossier
      // s'enregistre par son menu, « Enregistrer ce dossier… » ; voir proposerOuRanger
      if (this.proposerOuRanger) {
        const niveau = await this.ranger.aProposerPour(dans).catch(() => null)
        if (niveau) await this.ranger.proposer(niveau, { origine: 'nouveau' })
        // Entre-temps : on est parti, ou une autre fenêtre s'est ouverte
        if (this.depart || document.querySelector('dialog[open]')) return
      }
      if (offrirCle) endroit = await this.ranger.endroitDe(dans).catch(() => null)
    }
    const d = document.createElement('dialog')
    d.className = 'dialogue dialogue-nouveau' + (chapitre ? ' dialogue-chapitre' : '')
    d.innerHTML = `<form method="dialog"><h2>${chapitre ? 'Nouveau chapitre' : 'Nouveau classeur'}</h2><div class="corps">
      ${dans !== null ? '<p class="dans"></p>' : ''}
      <label class="champ"><span>Nom</span><input type="text" name="nom" maxlength="${LONGUEUR_NOM_CLASSEUR}" autocomplete="off" spellcheck="false"></label>
      <fieldset class="fonds"${chapitre ? ' hidden' : ''}><legend>Fond de la première page</legend></fieldset>
      ${endroit ? '<p class="ou-fichier"></p>' : offrirCle ? '<label class="case case-cle"><input type="checkbox" name="cle"><span>Enregistrer automatiquement dans un fichier<small></small></span></label>' : ''}
      <p class="erreur" role="alert" hidden></p>
      <div class="actions">
        <button type="button" class="secondaire" data-a="annuler">Annuler</button>
        <button type="submit" class="principal" data-a="creer">Créer et ouvrir</button>
      </div></div></form>`
    if (dans !== null) {
      const h = etiquetteHeritee(dans, this.dossiers)
      d.querySelector('.dans')!.textContent = `Dans : ${cheminLisible(dans, this.dossiers)}${h ? ` · étiquette de niveau « ${h.nom} »` : ''}`
    }
    const form = d.querySelector('form')!
    const champ = d.querySelector<HTMLInputElement>('input[name="nom"]')!
    champ.value = chapitre ? 'Nouveau chapitre' : NOM_NOUVEAU
    const fonds = d.querySelector('.fonds')!
    for (const f of FONDS_NEUF) {
      const l = Object.assign(document.createElement('label'), { className: 'case' })
      const r = Object.assign(document.createElement('input'), { type: 'radio', name: 'fond', value: f.id, checked: f.id === FOND_NEUF })
      l.append(r, Object.assign(document.createElement('span'), { textContent: f.nom }))
      fonds.appendChild(l)
    }
    const caseCle = d.querySelector<HTMLInputElement>('input[name="cle"]')
    if (caseCle) {
      caseCle.checked = location.protocol === 'file:'
      d.querySelector('.case-cle small')!.textContent = AIDE_ACTIVER
    }
    // Le niveau est rangé : où ira le fichier, d'après le nom tapé
    const ouFichier = d.querySelector<HTMLElement>('.ou-fichier')
    const nomTape = () => nomDeClasseur(champ.value) ?? (chapitre ? 'Nouveau chapitre' : NOM_NOUVEAU)
    const majOu = () => { if (ouFichier && endroit && this.ranger) ouFichier.textContent = `Son fichier ira dans « ${this.ranger.cheminDuChapitre(endroit, nomTape())} », écrit tout seul.` }
    majOu()
    champ.addEventListener('input', majOu)
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
      dire(null)
      const nom = nomDeClasseur(champ.value) ?? (chapitre ? 'Nouveau chapitre' : NOM_NOUVEAU)
      const fond = ((form.elements.namedItem('fond') as RadioNodeList | null)?.value || FOND_NEUF) as Fond
      // Le fichier de la clé : dans ce clic (le navigateur ne l'ouvre qu'au
      // plus près d'un geste)
      let h: PoigneeFichier | null = null
      if (caseCle?.checked) {
        const choisir = (window as unknown as { showSaveFilePicker?: (o: unknown) => Promise<PoigneeFichier> }).showSaveFilePicker
        try {
          if (typeof choisir === 'function') h = await choisir.call(window, { suggestedName: nomSur(nom) + EXTENSION_TABLEAU, id: ID_CHOIX, types: TYPES_CLASSEUR })
        } catch (x) {
          // Renoncer : on crée quand même, sans clé
          if (nomErreur(x) !== 'AbortError') {
            dire(`Le fichier n'a pas pu être choisi : ${raisonCle(x).genre === 'permission' ? 'le navigateur ne l\'a pas permis' : (raisonCle(x) as { message: string }).message}. Décochez la case pour créer le classeur sans enregistrement automatique.`)
            return
          }
          h = null
        }
      }
      enCours = true
      for (const x of [champ, annuler, creer, ...d.querySelectorAll('input')] as (HTMLInputElement | HTMLButtonElement)[]) x.disabled = true
      creer.textContent = 'Création…'
      const reprendre = (t: string) => {
        enCours = false
        for (const x of [champ, annuler, creer, ...d.querySelectorAll('input')] as (HTMLInputElement | HTMLButtonElement)[]) x.disabled = false
        creer.textContent = 'Créer et ouvrir'
        dire(t)
      }
      // Un fichier qui a déjà quelque chose n'est pas écrasé : on en choisit un autre
      if (h) {
        let refus: string | null
        try { refus = await examinerPourUnNeuf(this.registre, h) } catch (x) { refus = `Ce fichier ne peut pas servir : ${raisonCle(x).genre === 'permission' ? 'le navigateur ne permet pas de le lire' : (raisonCle(x) as { message: string }).message}.` }
        if (refus) { reprendre(refus); return }
      }
      let fiche: FicheClasseur
      try { fiche = await this.creer(nom, fond) } catch (x) {
        const t = texteEchecCreation(x)
        reprendre(t)
        this.hote.message(t)
        return
      }
      let arrivee = `Classeur « ${fiche.nom} » créé.`
      let cle: CleALArrivee | undefined
      // La première écriture sur la clé, avant de partir (l'accord du choix
      // du fichier ne survit pas au changement de page : l'arrivée dira ce
      // qu'il en est, et le redemandera en un clic s'il le faut)
      if (h) {
        creer.textContent = 'Enregistrement du fichier…'
        const r = await ecrireLeNeuf(this.registre, h, fiche)
        if (r.date !== null) ecrire(cleDernierEnregistrement(fiche), String(r.date))
        if (r.message) arrivee += ' ' + r.message
        cle = r.cle
      } else if (endroit && this.ranger) {
        // Le niveau est rangé (lot 18) : son fichier, à sa place, avant de partir
        creer.textContent = 'Enregistrement du fichier…'
        cle = await this.ranger.donnerSonFichier(fiche, { geste: true, dire: t => { arrivee += ' ' + t } })
      }
      enCours = false
      fermer()
      this.fiches.set(fiche.id, fiche)
      await this.ouvrirClasseur(fiche, { arrivee, ...(cle ? { cle } : {}) })
      // On est resté (Annuler) : il attend dans la bibliothèque
      if (!this.depart && this.ouvert) {
        this.hote.message(`Classeur « ${fiche.nom} » créé : il est dans la bibliothèque.`)
        void this.charger()
      }
    })
    document.body.appendChild(d)
    d.showModal()
    champ.focus()
    champ.select()
  },

  /** Crée un classeur SANS fenêtre et l'ouvre (lot 17 : le classeur
   *  « Séances isolées » d'un niveau, à la première demande) : page blanche,
   *  dans ce dossier (s'il existe encore et n'est pas dans la corbeille ;
   *  sinon à la racine), sans fichier de clé (il viendra à la prochaine
   *  liaison du niveau, ou par « Enregistrer automatiquement dans un fichier… ») ;
   *  la copie sur le Drive suit comme pour tout classeur. avant(fiche) : juste
   *  avant de partir (la clé de l'onglet d'une nouvelle séance, main.ts) ;
   *  arrivee : le message dit en arrivant, à la place de « Classeur « X »
   *  créé. ». Un échec se dit en message et l'on reste sur le classeur
   *  ouvert. Vrai si le classeur a été créé. */
  async creerEtOuvrir(this: Bibliotheque, o: { nom: string; dossier: string | null; arrivee: string; avant?: (f: FicheClasseur) => void }): Promise<boolean> {
    if (this.depart) return false
    this.finirSaisie(true)
    // Les dossiers tels qu'ils sont à l'instant (la bibliothèque n'a peut-être
    // jamais été ouverte dans cet onglet, et le dossier a pu partir)
    try { this.dossiers = new Map((await this.registre.dossiers()).map(d => [d.id, d])) } catch { /* ceux qu'on a */ }
    const d = o.dossier !== null ? this.dossiers.get(o.dossier) : undefined
    const dans = d && dossierVisible(d, this.dossiers) ? d.id : null
    let fiche: FicheClasseur
    try { fiche = await this.creer(o.nom, 'blanc', dans) } catch (x) {
      this.hote.message(texteEchecCreation(x))
      return false
    }
    this.fiches.set(fiche.id, fiche)
    o.avant?.(fiche)
    // Dans un niveau rangé (lot 18) : son fichier, à sa place, avant de partir
    // (le clic qui nous amène est le geste)
    let arrivee = o.arrivee
    const cle = this.ranger ? await this.ranger.donnerSonFichier(fiche, { geste: true, dire: t => { arrivee += ' ' + t } }) : undefined
    await this.ouvrirClasseur(fiche, { arrivee, ...(cle ? { cle } : {}) })
    // On est resté (le trou : « Annuler ») : il attend dans la bibliothèque
    if (!this.depart) {
      this.hote.message(`Classeur « ${fiche.nom} » créé : il est dans la bibliothèque.`)
      if (this.ouvert) void this.charger()
    }
    return true
  },
}
