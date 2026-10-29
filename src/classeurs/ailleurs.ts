// =============================================================
// OUVRIR ET ENREGISTRER, SUR L'ORDINATEUR OU SUR LE DRIVE (lot 7)
// Deux fenêtres, comme sur les maquettes validées par le professeur :
// - « Ouvrir » (le bouton « Ouvrir… » de la bibliothèque) : deux onglets,
//   « Cet ordinateur » (des fichiers, ou tout un dossier : Chrome et Edge)
//   et « Google Drive » (les niveaux de « MEM - Classeurs », et la fenêtre
//   de Google pour le reste du Drive). Les classeurs d'un dossier arrivent
//   dans le dossier du même nom de la bibliothèque (créé s'il n'existe pas),
//   et ce dossier peut rester RELIÉ : tenu à jour tout seul (choix 1B).
// - « Enregistrer » (le menu ⋯ du classeur, le menu d'un dossier) : quoi
//   (ce classeur, le dossier du niveau, toute la bibliothèque), où (cet
//   ordinateur, le Drive), et « Le garder à jour tout seul ».
// Et « Mes emplacements », en haut de la bibliothèque (choix 3A) : les
// dossiers reliés, avec « Mettre à jour » et « Retirer ».
//
// Le Drive : seulement depuis la version en ligne (la version hors ligne
// le grise et le dit). La connexion Google se fait toujours dans un clic,
// jamais sans lui. MEM teachingtool ne voit du Drive que ce qu'il y a créé
// (le droit drive.file) : « MEM - Classeurs », « MEM - Sauvegardes ».
// =============================================================
import type { CompteDrive, FicheClasseur, FicheDossier, InfosClasseur } from './demarrage'
import { idClasseur, visible } from './demarrage'
import type { Bibliotheque } from './bibliotheque'
import type { Choisi, Fichiers } from './fichiers'
import type { Registre } from './registre'
import type { ActionMessage } from '../app'
import type { Emplacement } from './emplacements'
import { classeursDeLaClasse, emplacements, garderEmplacement, reglagePoignee, retirerEmplacement } from './emplacements'
import type { PoigneeDossier } from './ordinateur'
import { accordDuDossier, choisirUnDossier, choisitUnDossier, lireLeDossier } from './ordinateur'
import type { BilanRelier } from './ordinateur'
import type { Etablissement } from './etablissements'
import { cheminLisible, etablissements, garderEtablissement, nomDEtablissement, nouvelId, reglagePoigneeEtablissement, retirerEtablissement, texteDuRangement } from './etablissements'
import type { Ranger } from './ranger'
import { relierLeNiveau } from './ranger'
import { copierDepuisLaBase, origineDe } from './copie-drive'
import { remontee, dossierVisible, etiquetteDuNom, COULEUR_DEFAUT } from './arbre'
import { fabriquerFichier } from './ecrivain'
import { confirmer } from './cle'
import { entreeMenu } from '../menus'
import { CLIENT_GOOGLE, COMPTES, compteDe } from '../publication/comptes'
import type { ClasseDuDrive } from '../publication/drive'
import {
  connecte, connecter, courrielDe, dernierCompteGoogle, dossierDeClasse, envoyerDansLeDrive, listerLesClasses, lireFichierDuDrive, preparerGoogle, versionEnLigne,
} from '../publication/drive'
import { choixValable, raisonDrive } from './drive-pur'
import { EXTENSION_TABLEAU, nomSur, quandLisible, tailleLisible } from '../fichier'
import { fermerSurLeFond } from '../dialogue'

/** Ce que disent les fenêtres dans la version hors ligne */
export const HORS_LIGNE_DRIVE = 'Le Drive marche seulement depuis la version en ligne (mathsetmoi.github.io).'

/** Ce que les fenêtres demandent à qui les ouvre */
export interface HoteAilleurs {
  registre: Registre
  bibliotheque: Bibliotheque
  fichiers: Fichiers
  message(texte: string, action?: ActionMessage | ActionMessage[]): void
  /** Le classeur ouvert dans cet onglet ; null : la bibliothèque seule */
  classeur(): InfosClasseur | null
  /** Ce classeur, sur l'ordinateur, gardé à jour : la clé (cle.ts) ; absent :
   *  ce navigateur ne sait pas écrire seul dans un fichier */
  activerCle?: () => void
  /** Ce classeur, une fois, dans un fichier .memc (la sauvegarde) */
  enregistrerClasseur?: () => void
  /** Avant de fabriquer le fichier d'un classeur depuis sa base : celui de
   *  cet onglet écrit d'abord ce qui attend */
  avantDEcrire?: (f: FicheClasseur) => Promise<void>
  /** Après que des classeurs (ids) ont reçu ou changé de fichier par ici :
   *  la clé du classeur de cet onglet repart depuis sa fiche (voir ranger.ts) */
  apresRangement?: (ids: readonly string[]) => Promise<void>
}

type Quoi = 'classeur' | 'classe' | 'bibliotheque'
type Ou = 'ordinateur' | 'drive'

const texteErreurDrive = (e: unknown) => {
  const r = raisonDrive(e, typeof navigator === 'undefined' || navigator.onLine !== false)
  if (r.genre === 'connexion') return 'La connexion Google a expiré : cliquez de nouveau.'
  if (r.genre === 'hors-ligne') return 'Pas de réseau : le Drive ne répond pas.'
  const m = e instanceof Error && !(e as { statut?: number }).statut ? e.message : ''
  return m || `Le Drive a refusé : ${r.message ?? 'erreur inconnue'}.`
}

const pluriel = (n: number, mot: string) => `${n} ${mot}${n > 1 ? 's' : ''}`

/** Une liste de noms pour un message : « Fractions », « Symétrie » et 3 autres */
function noms(l: string[]): string {
  const q = l.slice(0, 3).map(n => `« ${n} »`)
  return l.length > 3 ? `${q.join(', ')} et ${l.length - 3} autre${l.length > 4 ? 's' : ''}` : q.join(', ')
}

/** Ce qu'a fait le lien avec un dossier de l'ordinateur, en une phrase */
export function texteDuBilan(b: BilanRelier, dossier: string): string {
  const t: string[] = []
  const n = b.ecrits.length + b.adoptes.length
  t.push(n ? `${pluriel(n, 'classeur')} dans « ${dossier} », tenu${n > 1 ? 's' : ''} à jour tout seul${n > 1 ? 's' : ''}.` : `Rien de nouveau dans « ${dossier} ».`)
  if (b.ailleurs.length) t.push(`${noms(b.ailleurs)} ${b.ailleurs.length > 1 ? 'gardent leur fichier' : 'garde son fichier'} ailleurs.`)
  if (b.aRelire.length) t.push(`${noms(b.aRelire)} ${b.aRelire.length > 1 ? 'gardent leur fichier d\'avant : ce navigateur n\'a pas pu le relire ; ouvrez-les' : 'garde son fichier d\'avant : ce navigateur n\'a pas pu le relire ; ouvrez-le'}, puis « Mettre à jour ».`)
  if (b.plusRiches.length) t.push(`${noms(b.plusRiches)} : le fichier du dossier a des changements que la bibliothèque n'a pas ; ouvrez-le d'abord (il n'a pas été touché).`)
  if (b.echecs.length) t.push(`${noms(b.echecs)} : pas pu être écrit${b.echecs.length > 1 ? 's' : ''}.`)
  return t.join(' ')
}

export class Ailleurs {
  /** La version en ligne, avec la connexion Google : le Drive y est possible */
  readonly enLigne = versionEnLigne() && !!CLIENT_GOOGLE
  /** La liste « Mes emplacements », en haut de la bibliothèque */
  private section: HTMLElement
  private occupe = false
  /** Ce que montre « Mes emplacements » (pour ne la refaire que si cela change) */
  private signature = ''
  /** Où ranger les classeurs d'un niveau (lot 18, ranger.ts), posé par
   *  main.ts : les établissements, « Ranger… » et « Changer… » dans « Mes
   *  emplacements » ; null : ce navigateur ne range pas */
  ranger: Ranger | null = null

  constructor(private h: HoteAilleurs) {
    const b = h.bibliotheque
    b.ouvrirFenetre = () => void this.ouvrir()
    // Avant « Supprimer », qui finit le menu d'un dossier (le dernier bloc)
    b.blocsDuMenuDossier.splice(Math.max(0, b.blocsDuMenuDossier.length - 1), 0, (d, m) => {
      entreeMenu(m, 'Enregistrer ce dossier…', () => void this.enregistrer({ quoi: 'classe', classe: d.id }), { action: 'enregistrer-dossier',
        aide: 'Sur l\'ordinateur ou sur le Drive, tenu à jour tout seul' })
    })
    this.section = Object.assign(document.createElement('section'), { className: 'emplacements', hidden: true })
    this.section.setAttribute('aria-label', 'Mes emplacements')
    b.hautDuCorps.appendChild(this.section)
    b.apresRendu.push(() => void this.majEmplacements())
  }

  private get registre() { return this.h.registre }

  // =============================================================
  // OUVRIR
  // =============================================================

  /** La fenêtre « Ouvrir » */
  async ouvrir(): Promise<void> {
    if (document.querySelector('dialog[open]')) { this.h.message('Fermez d\'abord la fenêtre ouverte.'); return }
    if (this.enLigne) preparerGoogle()
    const defaut = await this.registre.reglage('copieDrive').catch(() => undefined)
    const connu = COMPTES.find(c => connecte(c.cle))?.cle ?? (choixValable(defaut) && defaut !== 'aucune' ? defaut : 'mem')
    const d = document.createElement('dialog')
    d.className = 'dialogue dialogue-ailleurs dialogue-ouvrir-ailleurs'
    d.setAttribute('aria-labelledby', 'titre-ouvrir-ailleurs')
    const dossierOk = choisitUnDossier()
    d.innerHTML = `<h2 id="titre-ouvrir-ailleurs">Ouvrir</h2><div class="corps">
      <div class="onglets" role="tablist">
        <button type="button" role="tab" class="onglet" data-ou="ordinateur" aria-selected="true">Cet ordinateur</button>
        <button type="button" role="tab" class="onglet" data-ou="drive" aria-selected="false">Google Drive</button>
      </div>
      <div class="panneau" data-ou="ordinateur">
        <p>Un classeur (.memc), une bibliothèque (.memb) ou un ancien tableau (.prof). Vous pouvez aussi glisser les fichiers sur la page.</p>
        <p class="boutons"><button type="button" class="principal a-fichiers">Choisir des fichiers…</button>
        <button type="button" class="secondaire a-dossier"${dossierOk ? '' : ' hidden'}>Choisir un dossier…</button></p>
        <p class="aide">${dossierOk
          ? '« Choisir un dossier » ouvre tous les classeurs qu\'il contient, rangés dans le dossier du même nom de la bibliothèque.'
          : 'Pour ouvrir tout un dossier, choisissez tous ses fichiers (dans Chrome ou Edge, on peut choisir le dossier lui-même).'}</p>
        <label class="case a-relier-ordi"${dossierOk ? '' : ' hidden'}><input type="checkbox" checked><span>Garder ce dossier relié : chaque classeur s'y enregistre tout seul</span></label>
      </div>
      <div class="panneau" data-ou="drive" hidden>
        <p class="hors-ligne"${this.enLigne ? ' hidden' : ''}>${HORS_LIGNE_DRIVE}</p>
        <div class="en-ligne"${this.enLigne ? '' : ' hidden'}>
          <fieldset class="a-comptes"><legend>Le Drive</legend><div class="cases"></div></fieldset>
          <p class="a-google"><span class="a-qui"></span> <button type="button" class="principal a-connecter">Se connecter à Google</button></p>
          <p class="a-etat" role="status" aria-live="polite"></p>
          <div class="a-classes" hidden></div>
          <p class="aide">MEM teachingtool ne voit que ce qu'il a rangé lui-même sur le Drive. Un classeur déposé ailleurs dans le Drive : téléchargez-le, puis ouvrez-le depuis « Cet ordinateur ».</p>
        </div>
      </div>
      <div class="actions"><button type="button" class="secondaire a-fermer">Annuler</button></div></div>`
    const q = <T extends HTMLElement>(s: string) => d.querySelector(s) as T
    const onglets = [...d.querySelectorAll<HTMLButtonElement>('.onglet')]
    const montrer = (ou: Ou) => {
      for (const o of onglets) o.setAttribute('aria-selected', String(o.dataset.ou === ou))
      for (const p of d.querySelectorAll<HTMLElement>('.panneau')) p.hidden = p.dataset.ou !== ou
    }
    for (const o of onglets) o.addEventListener('click', () => { montrer(o.dataset.ou as Ou); if (o.dataset.ou === 'drive') regler() })
    // Les comptes
    const cases = q('.cases')
    for (const c of COMPTES) {
      const l = Object.assign(document.createElement('label'), { className: 'case' })
      l.append(Object.assign(document.createElement('input'), { type: 'radio', name: 'a-compte', value: c.cle, checked: c.cle === connu }),
        Object.assign(document.createElement('span'), { textContent: c.nom }))
      cases.appendChild(l)
    }
    const compte = () => (q<HTMLInputElement>('input[name=a-compte]:checked')?.value ?? 'mem') as CompteDrive
    const etat = (t: string, erreur = false) => { const p = q('.a-etat'); p.textContent = t; p.classList.toggle('erreur', erreur) }
    const classes = q('.a-classes')
    const regler = () => {
      const c = compte(), qui = courrielDe(c)
      q('.a-qui').textContent = connecte(c) ? `Connecté : ${qui || 'compte Google'}.` : dernierCompteGoogle(c) ? `Google proposera ${dernierCompteGoogle(c)}.` : ''
      q<HTMLButtonElement>('.a-connecter').hidden = connecte(c)
    }
    let fini = false
    const fermer = () => { if (!fini) { fini = true; d.close() } }
    q('.a-fermer').addEventListener('click', fermer)
    d.addEventListener('close', () => d.remove())
    fermerSurLeFond(d, fermer)

    // ---- Cet ordinateur ----
    q('.a-fichiers').addEventListener('click', () => {
      fermer()
      this.h.fichiers.choisir()
    })
    q('.a-dossier').addEventListener('click', async () => {
      const relier = q<HTMLInputElement>('.a-relier-ordi input').checked
      let dossier: PoigneeDossier | null
      try { dossier = await choisirUnDossier() } catch (e) { this.h.message(`Ce dossier n'a pas pu être ouvert : ${e instanceof Error ? e.message : 'erreur inconnue'}.`); return }
      if (!dossier) return
      // L'accord d'écrire, dans ce clic encore (relier)
      if (relier) await accordDuDossier(dossier, true).catch(() => false)
      fermer()
      await this.ouvrirUnDossier(dossier, relier)
    })

    // ---- Google Drive ----
    const lister = async (c: CompteDrive) => {
      etat(`Recherche de vos niveaux sur le ${compteDe(c)?.nom ?? 'Drive'}…`)
      classes.hidden = true
      let l: ClasseDuDrive[]
      try { l = await listerLesClasses(c) } catch (e) { etat(texteErreurDrive(e), true); regler(); return }
      if (compte() !== c) return
      classes.replaceChildren()
      const dossierDrive = compteDe(c)?.classeurs ?? 'MEM - Classeurs'
      if (!l.length) { etat(`Rien encore dans « ${dossierDrive} » sur ce Drive.`); return }
      etat(`Dans « ${dossierDrive} » :`)
      for (const x of l) {
        const bloc = Object.assign(document.createElement('div'), { className: 'classe-drive' })
        const tete = Object.assign(document.createElement('div'), { className: 'tete' })
        tete.append(Object.assign(document.createElement('span'), { className: 'nom', textContent: x.classe ? x.nom : 'Fichiers déposés' }),
          Object.assign(document.createElement('span'), { className: 'n', textContent: pluriel(x.fichiers.length, 'fichier') }))
        if (x.classe && x.fichiers.length) {
          const tout = Object.assign(document.createElement('button'), { type: 'button', className: 'secondaire ouvrir-classe', textContent: 'Ouvrir tout le niveau' })
          tout.addEventListener('click', () => { fermer(); void this.ouvrirDuDrive(c, x.fichiers, { classe: x }) })
          tete.appendChild(tout)
        }
        bloc.appendChild(tete)
        const ul = document.createElement('ul')
        for (const f of x.fichiers) {
          const li = document.createElement('li')
          const b = Object.assign(document.createElement('button'), { type: 'button', className: 'fichier-drive' })
          b.dataset.id = f.id
          b.append(Object.assign(document.createElement('span'), { className: 'r-nom', textContent: f.nom }),
            Object.assign(document.createElement('span'), { className: 'r-quand', textContent: `${f.modifie ? quandLisible(f.modifie) : ''} · ${tailleLisible(f.taille)}` }))
          b.addEventListener('click', () => { fermer(); void this.ouvrirDuDrive(c, [f], x.classe ? { classe: x, seul: true } : {}) })
          li.appendChild(b)
          ul.appendChild(li)
        }
        bloc.appendChild(ul)
        classes.appendChild(bloc)
      }
      classes.hidden = false
    }
    q('.a-connecter').addEventListener('click', async () => {
      const c = compte()
      etat('Connexion à Google…')
      const indice = dernierCompteGoogle(c)
      // Dans ce clic : la fenêtre de Google (jamais sans lui)
      try { await connecter(c, indice, indice ? '' : 'select_account') } catch (e) {
        etat(e instanceof Error ? e.message.replace(/^Pour publier, autorisez/, 'Pour ouvrir vos classeurs du Drive, autorisez') : 'La connexion à Google a échoué. Réessayez.', true)
        regler()
        return
      }
      regler()
      await lister(c)
    })
    d.addEventListener('change', e => {
      if (!(e.target as HTMLElement).closest('.a-comptes')) return
      regler()
      classes.hidden = true; classes.replaceChildren(); etat('')
      if (connecte(compte())) void lister(compte())
    })
    regler()
    document.body.appendChild(d)
    d.showModal()
    q<HTMLButtonElement>('.a-fichiers').focus()
    if (this.enLigne && connecte(compte())) void lister(compte())
  }

  /** Le dossier de la bibliothèque, à la racine, qui porte ce nom (sans
   *  tenir compte des majuscules), sinon un nouveau ; marque : celui qui a
   *  déjà cet id (un niveau du Drive) passe d'abord */
  private async dossierNomme(nom: string, id?: string): Promise<FicheDossier> {
    const dossiers = await this.registre.dossiers()
    const vivants = dossiers.filter(x => dossierVisible(x, dossiers))
    const deja = (id ? vivants.find(x => x.id === id) : undefined)
      ?? vivants.find(x => x.parent === null && x.nom.toLocaleLowerCase('fr') === nom.toLocaleLowerCase('fr'))
    if (deja) return deja
    const fiche: FicheDossier = { id: idClasseur(), nom: nom.slice(0, 80) || 'Niveau', parent: null, couleur: COULEUR_DEFAUT, cree: Date.now() }
    const etiquette = etiquetteDuNom(fiche.nom)
    if (etiquette) fiche.etiquette = etiquette
    await this.registre.ajouterDossier(fiche)
    return fiche
  }

  /** Tout un dossier de l'ordinateur : ses classeurs dans le dossier du même
   *  nom de la bibliothèque ; relier : ce dossier devient l'emplacement de
   *  ce niveau (chaque classeur y garde son fichier) */
  private async ouvrirUnDossier(d: PoigneeDossier, relier: boolean) {
    this.h.message(`Lecture du dossier « ${d.name} »…`)
    let trouves
    try { trouves = await lireLeDossier(d) } catch (e) { this.h.message(`Le dossier « ${d.name} » n'a pas pu être lu : ${e instanceof Error ? e.message : 'erreur inconnue'}.`); return }
    let classe: FicheDossier
    try { classe = await this.dossierNomme(d.name) } catch (e) { this.h.message(`Le dossier n'a pas pu être créé dans la bibliothèque : ${e instanceof Error ? e.message : 'erreur inconnue'}.`); return }
    if (trouves.length) {
      const choisis: Choisi[] = trouves.map(t => ({ fichier: t.fichier, poignee: t.poignee }))
      const ok = await this.h.fichiers.ouvrir(choisis, { dossier: classe.id, lot: true })
      if (!ok) { void this.h.bibliotheque.charger(); return }
    } else if (!relier) { this.h.message(`Il n'y a aucun classeur (.memc) dans « ${d.name} ».`); void this.h.bibliotheque.charger(); return }
    if (relier) await this.relierOrdinateur(classe, d, { silencieux: trouves.length > 0 })
    void this.h.bibliotheque.charger()
  }

  /** Des fichiers du Drive : téléchargés, puis ouverts comme des fichiers.
   *  classe : ceux d'un niveau de « MEM - Classeurs », rangés dans le
   *  dossier de ce niveau (seul : un seul classeur, avec sa question) ;
   *  tout le niveau reste relié au Drive. */
  private async ouvrirDuDrive(compte: CompteDrive, l: { id: string; nom: string; taille: number }[], o: { classe?: ClasseDuDrive; seul?: boolean }) {
    const choisis: Choisi[] = []
    for (let k = 0; k < l.length; k++) {
      const f = l[k]
      this.h.message(l.length > 1 ? `Téléchargement : ${k + 1} sur ${l.length}…` : `Téléchargement de « ${f.nom} »…`)
      try {
        const octets = await lireFichierDuDrive(f.id)
        const nom = /\.mem[cb]$/i.test(f.nom) ? f.nom : f.nom + EXTENSION_TABLEAU
        choisis.push({ fichier: new File([octets as BlobPart], nom, { type: 'application/octet-stream' }) })
      } catch (e) { this.h.message(`« ${f.nom} » n'a pas pu être téléchargé : ${texteErreurDrive(e)}`); return }
    }
    let dossier: string | null | undefined
    let classe: FicheDossier | null = null
    if (o.classe?.classe) {
      try { classe = await this.dossierNomme(o.classe.nom, o.classe.classe); dossier = classe.id } catch { dossier = undefined }
    }
    // Un seul fichier : sa question ; tout un niveau : la fenêtre de plusieurs
    const lot = o.seul ? false : !!o.classe || choisis.length > 1
    const ok = await this.h.fichiers.ouvrir(choisis, { ...(dossier !== undefined ? { dossier } : {}), lot })
    // Tout le niveau ouvert : il reste relié à ce Drive
    if (ok && classe && !o.seul) await this.relierDrive(classe, compte, { silencieux: true })
    void this.h.bibliotheque.charger()
  }

  // =============================================================
  // ENREGISTRER
  // =============================================================

  /** Le niveau d'un classeur ou d'un dossier : son dossier le plus haut */
  private async classeDe(dossierId: string | null): Promise<FicheDossier | null> {
    if (!dossierId) return null
    const dossiers = await this.registre.dossiers()
    const chaine = remontee(dossierId, dossiers)
    const haut = chaine[chaine.length - 1]
    return haut && dossierVisible(haut, dossiers) ? haut : null
  }

  /** La fenêtre « Enregistrer » ; quoi : ce qui est choisi d'abord ;
   *  classe : le dossier (son menu) */
  async enregistrer(o: { quoi?: Quoi; classe?: string } = {}): Promise<void> {
    if (document.querySelector('dialog[open]')) { this.h.message('Fermez d\'abord la fenêtre ouverte.'); return }
    if (this.enLigne) preparerGoogle()
    const ici = this.h.classeur()
    const [fiches, dossiers, defaut] = await Promise.all([this.registre.classeurs(), this.registre.dossiers(), this.registre.reglage('copieDrive').catch(() => undefined)])
    const fiche = ici ? fiches.find(f => f.id === ici.id) ?? null : null
    const classe = o.classe ? dossiers.find(x => x.id === o.classe && dossierVisible(x, dossiers)) ?? null
      : await this.classeDe(fiche?.dossier ?? this.h.bibliotheque.dossierPourAjouter())
    const nClasse = classe ? classeursDeLaClasse(classe.id, fiches, dossiers).length : 0
    const nTous = fiches.filter(f => visible(f, dossiers)).length
    const liste = await emplacements(this.registre)
    const connu = COMPTES.find(c => connecte(c.cle))?.cle ?? (choixValable(defaut) && defaut !== 'aucune' ? defaut : 'mem')

    const d = document.createElement('dialog')
    d.className = 'dialogue dialogue-ailleurs dialogue-enregistrer-ailleurs'
    d.setAttribute('aria-labelledby', 'titre-enregistrer-ailleurs')
    d.innerHTML = `<h2 id="titre-enregistrer-ailleurs">Enregistrer</h2><div class="corps">
      <fieldset class="e-quoi"><legend>Quoi ?</legend><div class="choix"></div></fieldset>
      <fieldset class="e-ou"><legend>Où ?</legend><div class="choix">
        <label class="case"><input type="radio" name="e-ou" value="ordinateur" checked><span>Cet ordinateur</span></label>
        <label class="case"><input type="radio" name="e-ou" value="drive"${this.enLigne ? '' : ' disabled'}><span>Google Drive</span></label>
      </div><p class="aide e-hors-ligne"${this.enLigne ? ' hidden' : ''}>${HORS_LIGNE_DRIVE}</p>
      <div class="e-comptes" hidden><div class="cases"></div><p class="e-qui aide"></p></div></fieldset>
      <label class="case e-garder"><input type="checkbox" checked><span>Le garder à jour tout seul</span></label>
      <p class="aide e-explication"></p>
      <p class="e-etat" role="status" aria-live="polite"></p>
      <div class="actions"><button type="button" class="secondaire e-annuler">Annuler</button><button type="button" class="principal e-ok">Enregistrer</button></div></div>`
    const q = <T extends HTMLElement>(s: string) => d.querySelector(s) as T
    const quoiEl = q('.e-quoi .choix')
    const options: { v: Quoi; titre: string; detail: string }[] = []
    if (fiche) options.push({ v: 'classeur', titre: 'Ce classeur', detail: `« ${fiche.nom} » · .memc` })
    if (classe) options.push({ v: 'classe', titre: 'Le dossier du niveau', detail: `« ${classe.nom} » · ${pluriel(nClasse, 'classeur')}` })
    options.push({ v: 'bibliotheque', titre: 'Toute la bibliothèque', detail: `${pluriel(nTous, 'classeur')} · .memb` })
    const premier = options.find(x => x.v === o.quoi)?.v ?? options[0].v
    for (const x of options) {
      const l = Object.assign(document.createElement('label'), { className: 'case' })
      l.append(Object.assign(document.createElement('input'), { type: 'radio', name: 'e-quoi', value: x.v, checked: x.v === premier }))
      const s = document.createElement('span')
      s.append(Object.assign(document.createElement('strong'), { textContent: x.titre }), ' ', Object.assign(document.createElement('small'), { textContent: x.detail }))
      l.appendChild(s)
      quoiEl.appendChild(l)
    }
    const cases = q('.e-comptes .cases')
    for (const c of COMPTES) {
      const l = Object.assign(document.createElement('label'), { className: 'case' })
      l.append(Object.assign(document.createElement('input'), { type: 'radio', name: 'e-compte', value: c.cle, checked: c.cle === connu }),
        Object.assign(document.createElement('span'), { textContent: c.nom }))
      cases.appendChild(l)
    }
    const quoi = () => (q<HTMLInputElement>('input[name=e-quoi]:checked')?.value ?? 'bibliotheque') as Quoi
    const ou = () => (q<HTMLInputElement>('input[name=e-ou]:checked')?.value ?? 'ordinateur') as Ou
    const compte = () => (q<HTMLInputElement>('input[name=e-compte]:checked')?.value ?? 'mem') as CompteDrive
    const garderEl = q<HTMLInputElement>('.e-garder input')
    const etat = (t: string, erreur = false) => { const p = q('.e-etat'); p.textContent = t; p.classList.toggle('erreur', erreur) }

    /** Le garder à jour : possible ici ? et ce que fera le bouton */
    const regler = () => {
      const x = quoi(), y = ou(), c = compte()
      q('.e-comptes').hidden = y !== 'drive'
      q('.e-qui').textContent = connecte(c) ? `Connecté : ${courrielDe(c) || 'compte Google'}.` : 'Google demandera la connexion.'
      const dossierDrive = compteDe(c)?.classeurs ?? 'MEM - Classeurs'
      let garder = false, explication = ''
      if (x === 'classeur') {
        if (y === 'ordinateur') {
          garder = !!this.h.activerCle
          explication = garder
            ? (garderEl.checked ? 'Vous choisissez le fichier (une clé USB, un dossier) : il se remplace peu après chaque changement.' : 'Un fichier .memc, enregistré une fois.')
            : 'Un fichier .memc, enregistré une fois (ce navigateur ne sait pas le tenir à jour tout seul).'
        } else {
          explication = classe
            ? `Une fois, dans « ${dossierDrive} ». Pour qu'il se tienne à jour tout seul sur le Drive, enregistrez le dossier de son niveau « ${classe.nom} ».`
            : `Une fois, dans « ${dossierDrive} ». Pour qu'il se tienne à jour tout seul sur le Drive, rangez-le dans le dossier d'un niveau.`
        }
      } else if (x === 'classe' && classe) {
        const relie = liste.find(e => e.dossier === classe.id && e.genre === y)
        if (y === 'ordinateur') {
          garder = choisitUnDossier()
          explication = garder
            ? (garderEl.checked ? `Choisissez un dossier (une clé USB, G:\\Mon Drive…) : chaque classeur de « ${classe.nom} » y aura son fichier, remplacé peu après chaque changement.${relie ? ` Il remplacera le dossier « ${relie.nom} ».` : ''}` : `Un seul fichier .memb avec toute la classe, enregistré une fois.`)
            : 'Un seul fichier .memb avec tout le niveau, enregistré une fois (ce navigateur ne sait pas écrire dans un dossier).'
        } else {
          garder = true
          explication = garderEl.checked
            ? `Dans « ${dossierDrive} › ${nomSur(classe.nom, { repli: 'Niveau' })} » : un fichier par classeur, remplacé peu après chaque changement.`
            : `Un seul fichier .memb avec tout le niveau, dans « ${dossierDrive} ».`
        }
      } else {
        explication = y === 'ordinateur' ? 'Un seul fichier .memb avec tous les classeurs et les dossiers, enregistré une fois.' : `Un seul fichier .memb, une fois, dans « ${dossierDrive} ».`
      }
      q('.e-garder').hidden = !garder
      q('.e-explication').textContent = explication
      q('.e-ok').textContent = y === 'drive' ? (connecte(c) ? 'Enregistrer sur le Drive' : 'Se connecter et enregistrer') : 'Enregistrer…'
    }
    d.addEventListener('change', () => { etat(''); regler() })
    let fini = false
    const fermer = () => { if (!fini && !this.occupe) { fini = true; d.close() } }
    q('.e-annuler').addEventListener('click', fermer)
    d.addEventListener('close', () => d.remove())
    fermerSurLeFond(d, fermer)
    d.addEventListener('cancel', e => { if (this.occupe) e.preventDefault() })

    q('.e-ok').addEventListener('click', async () => {
      if (this.occupe) return
      const x = quoi(), y = ou(), c = compte()
      const garder = !q('.e-garder').hidden && garderEl.checked
      if (y === 'ordinateur') {
        // Le choix du fichier ou du dossier vient tout de suite, dans ce clic
        if (x === 'classeur') {
          fermer()
          if (garder && this.h.activerCle) this.h.activerCle()
          else if (this.h.enregistrerClasseur) this.h.enregistrerClasseur()
          else if (fiche) void this.h.bibliotheque.enregistrerUnClasseur(fiche.id)
          return
        }
        if (x === 'classe' && classe && garder) {
          let dossier: PoigneeDossier | null
          try { dossier = await choisirUnDossier() } catch (e) { etat(`Ce dossier n'a pas pu être choisi : ${e instanceof Error ? e.message : 'erreur inconnue'}.`, true); return }
          if (!dossier) return
          await accordDuDossier(dossier, true).catch(() => false)
          fermer()
          await this.relierOrdinateur(classe, dossier)
          return
        }
        fermer()
        void this.h.fichiers.enregistrerLaBibliotheque(x === 'classe' && classe ? { classe: classe.id } : {})
        return
      }
      // Le Drive : la connexion dans ce clic
      if (!connecte(c)) {
        etat('Connexion à Google…')
        const indice = dernierCompteGoogle(c)
        try { await connecter(c, indice, indice ? '' : 'select_account') } catch (e) {
          etat(e instanceof Error ? e.message.replace(/^Pour publier, autorisez/, 'Pour enregistrer sur le Drive, autorisez') : 'La connexion à Google a échoué. Réessayez.', true)
          regler()
          return
        }
        regler()
      }
      fermer()
      const nomDrive = compteDe(c)?.nom ?? 'Drive'
      if (x === 'classe' && classe && garder) { await this.relierDrive(classe, c); return }
      if (x === 'classeur' && fiche) { await this.deposerUnClasseur(fiche, c); return }
      void this.h.fichiers.enregistrerLaBibliotheque({
        ...(x === 'classe' && classe ? { classe: classe.id } : {}),
        rendre: async (fichier, nom) => { const r = await envoyerDansLeDrive(c, null, nom, fichier); return `« ${nom} » dans « ${r.dossier} » sur le ${nomDrive}` },
      })
    })
    regler()
    document.body.appendChild(d)
    d.showModal()
    q<HTMLButtonElement>('.e-ok').focus()
  }

  /** Un classeur, une fois, à la racine de « MEM - Classeurs » */
  private async deposerUnClasseur(f: FicheClasseur, compte: CompteDrive) {
    if (this.occupe) return
    this.occupe = true
    try {
      this.h.message(`Envoi de « ${f.nom} » sur le Drive…`)
      await this.h.avantDEcrire?.(f)
      const fab = await fabriquerFichier(f.base, { nom: f.nom, id: f.id }, Date.now(), { travailleurSeul: true })
      const nom = nomSur(f.nom) + EXTENSION_TABLEAU
      const r = await envoyerDansLeDrive(compte, null, nom, fab.fichier)
      this.h.message(`« ${f.nom} » est enregistré dans « ${r.dossier} » sur le ${compteDe(compte)?.nom ?? 'Drive'}.`)
    } catch (e) { this.h.message(`« ${f.nom} » n'a pas pu être envoyé : ${texteErreurDrive(e)}`) } finally { this.occupe = false }
  }

  // =============================================================
  // RELIER UN NIVEAU
  // =============================================================

  /** Le niveau relié à un dossier de l'ordinateur (accord déjà demandé
   *  dans le clic) : relierLeNiveau (ranger.ts), l'implémentation unique ;
   *  silencieux : ne dit le bilan que s'il y a un souci ; etablissement :
   *  celui du niveau déjà rangé par la fenêtre « Où ranger… » (lot 18), que
   *  « Mettre à jour » garde, avec sa phrase */
  private async relierOrdinateur(classe: FicheDossier, d: PoigneeDossier, o: { silencieux?: boolean; etablissement?: Etablissement | null } = {}) {
    if (this.occupe) return
    this.occupe = true
    let ids: string[] = []
    try {
      const etab = o.etablissement ?? null
      const [fiches, dossiers] = await Promise.all([this.registre.classeurs().catch(() => [] as FicheClasseur[]), this.registre.dossiers().catch(() => [] as FicheDossier[])])
      ids = classeursDeLaClasse(classe.id, fiches, dossiers).map(f => f.id)
      // reprendre : un classeur dont l'outil avait rangé le fichier ailleurs
      // (« Changer… » interrompu, un déplacement) le reçoit ici, une fois
      // l'ancien relu ; un fichier choisi à la main reste le sien
      const b = await relierLeNiveau({ registre: this.registre, message: t => this.h.message(t), avantDEcrire: this.h.avantDEcrire }, classe, d,
        { reprendre: true, ...(etab ? { prefixe: [etab.nom, d.name], etablissement: etab.id, etablissementNom: etab.nom } : {}) })
      if (!b) return
      const souci = b.plusRiches.length + b.echecs.length + b.ailleurs.length + b.aRelire.length > 0
      if (!o.silencieux || souci) {
        this.h.message(etab
          ? texteDuRangement({ niveau: classe.nom, chemin: [etab.nom, d.name], bilan: b })
          : `« ${classe.nom} » est relié au dossier « ${d.name} ». ${texteDuBilan(b, d.name)}`)
      }
    } catch (e) {
      this.h.message(`« ${classe.nom} » n'a pas pu être relié : ${e instanceof Error ? e.message : 'erreur inconnue'}.`)
    } finally {
      this.occupe = false
      await this.h.apresRangement?.(ids).catch(() => {})
      void this.h.bibliotheque.charger()
    }
  }

  /** Le niveau relié au Drive (connecté) : son dossier dans « MEM -
   *  Classeurs », la copie de ses classeurs voulue sur ce Drive, et chacun
   *  copié tout de suite (ceux qui y sont déjà : rien) */
  private async relierDrive(classe: FicheDossier, compte: CompteDrive, o: { silencieux?: boolean } = {}) {
    if (this.occupe) return
    this.occupe = true
    const nomDrive = compteDe(compte)?.nom ?? 'Drive'
    try {
      const dd = await dossierDeClasse(compte, classe)
      const deja = (await emplacements(this.registre)).find(e => e.dossier === classe.id && e.genre === 'drive')
      await garderEmplacement(this.registre, { id: deja?.id ?? nouvelId(), genre: 'drive', dossier: classe.id, nom: dd.nom, compte, cree: deja?.cree ?? Date.now() })
      const r = await this.copierLaClasse(classe, compte)
      const souci = r.ecartes.length + r.echecs.length > 0
      if (!o.silencieux || souci) {
        const t = [`« ${classe.nom} » est relié au ${nomDrive} (« ${compteDe(compte)?.classeurs ?? ''} › ${dd.nom} »).`]
        t.push(r.copies ? `${pluriel(r.copies, 'classeur')} copié${r.copies > 1 ? 's' : ''}.` : 'Tout y était déjà.')
        if (r.ecartes.length) t.push(`${noms(r.ecartes)} : pas copié${r.ecartes.length > 1 ? 's' : ''} (ouvrez-le${r.ecartes.length > 1 ? 's' : ''} pour voir pourquoi).`)
        if (r.echecs.length) t.push(`${noms(r.echecs)} : ${r.raison}`)
        this.h.message(t.join(' '))
      }
    } catch (e) {
      this.h.message(`« ${classe.nom} » n'a pas pu être relié au ${nomDrive} : ${texteErreurDrive(e)}`)
    } finally {
      this.occupe = false
      void this.h.bibliotheque.charger()
    }
  }

  /** Chaque classeur du niveau : sa copie voulue sur ce Drive, puis
   *  copiée depuis sa base (dans le dossier du niveau) */
  private async copierLaClasse(classe: FicheDossier, compte: CompteDrive): Promise<{ copies: number; ecartes: string[]; echecs: string[]; raison: string }> {
    const [fiches, dossiers] = await Promise.all([this.registre.classeurs(), this.registre.dossiers()])
    const l = classeursDeLaClasse(classe.id, fiches, dossiers)
    const origine = await origineDe(this.registre)
    const r = { copies: 0, ecartes: [] as string[], echecs: [] as string[], raison: '' }
    for (let k = 0; k < l.length; k++) {
      const f = l[k]
      this.h.message(`Copie de « ${classe.nom} » sur le Drive : ${k + 1} sur ${l.length}…`)
      try {
        await this.registre.modifierClasseur(f.id, x => { x.copieDrive = compte })
        await this.h.avantDEcrire?.(f)
        const fait = await copierDepuisLaBase(this.registre, f.id, compte, { origine, voulu: (x, ds) => visible(x, ds) })
        if (fait === 'copie') r.copies++
        else if (fait === 'ecarte') r.ecartes.push(f.nom)
      } catch (e) {
        r.echecs.push(f.nom)
        r.raison = texteErreurDrive(e)
        // La connexion, le réseau : les suivants n'iraient pas mieux
        const g = raisonDrive(e, navigator.onLine !== false).genre
        if (g === 'connexion' || g === 'hors-ligne') { r.echecs.push(...l.slice(k + 1).map(x => x.nom)); break }
      }
    }
    return r
  }

  // =============================================================
  // MES EMPLACEMENTS
  // =============================================================

  /** La liste en haut de la bibliothèque : à la racine, tous les dossiers
   *  reliés ; dans un dossier, ceux de son niveau. Lot 18 : en tête, les
   *  établissements (quand ce navigateur sait ranger) ; un niveau rangé chez
   *  un établissement a « Changer… » ; le niveau affiché pas encore rangé a
   *  sa ligne et « Ranger… » (jamais à la racine) */
  private async majEmplacements() {
    const b = this.h.bibliotheque
    const peut = !!this.ranger?.peutRanger()
    const [liste, fiches, dossiers, etabs] = await Promise.all([
      emplacements(this.registre), this.registre.classeurs().catch(() => []), this.registre.dossiers().catch(() => []), etablissements(this.registre),
    ])
    const ici = b.dossierAffiche
    const classe = ici ? remontee(ici, dossiers).slice(-1)[0]?.id ?? null : null
    const montres = liste.filter(e => {
      const d = dossiers.find(x => x.id === e.dossier)
      return d && dossierVisible(d, dossiers) && (classe === null || e.dossier === classe)
    }).sort((a, b) => (dossiers.find(x => x.id === a.dossier)?.nom ?? '').localeCompare(dossiers.find(x => x.id === b.dossier)?.nom ?? '', 'fr', { numeric: true }) || (a.genre < b.genre ? -1 : 1))
    // Le niveau affiché, pas encore rangé sur l'ordinateur (lot 18)
    const niveauIci = classe ? dossiers.find(x => x.id === classe) : undefined
    const pasRange = peut && niveauIci && dossierVisible(niveauIci, dossiers) && !liste.some(e => e.genre === 'ordinateur' && e.dossier === classe) ? niveauIci : null
    const s = this.section
    if (!montres.length && !pasRange && !(peut && etabs.length)) { s.hidden = true; s.replaceChildren(); this.signature = ''; return }
    // Rien de changé : la liste reste (le focus d'un bouton aussi)
    const signature = JSON.stringify([this.enLigne, peut, etabs, classe, pasRange?.nom ?? null, montres, montres.map(e => {
      const l = classeursDeLaClasse(e.dossier, fiches, dossiers)
      return [dossiers.find(x => x.id === e.dossier)?.nom, l.map(f => [f.cle?.nom, f.drive?.compte, f.drive?.dossier, f.copieDrive])]
    })])
    if (signature === this.signature && !s.hidden) return
    this.signature = signature
    const bouton = (classe: string, texte: string, faire: () => void, title?: string) => {
      const x = Object.assign(document.createElement('button'), { type: 'button', className: classe, textContent: texte })
      if (title) x.title = title
      x.addEventListener('click', faire)
      return x
    }
    const titre = Object.assign(document.createElement('h3'), { textContent: 'Mes emplacements' })
    const haut: Node[] = [titre]
    if (peut) {
      const ligne = Object.assign(document.createElement('div'), { className: 'etablissements' })
      ligne.append(Object.assign(document.createElement('strong'), { textContent: 'Établissements :' }))
      if (!etabs.length) ligne.append(Object.assign(document.createElement('span'), { className: 'aucun', textContent: 'aucun dossier choisi' }))
      etabs.forEach((e, i) => {
        if (i) ligne.append(' · ')
        const x = Object.assign(document.createElement('span'), { className: 'etablissement' })
        x.dataset.id = e.id
        x.append(Object.assign(document.createElement('span'), { className: 'nom', textContent: e.nom }),
          bouton('secondaire e-retirer-etab', 'Retirer', () => void this.retirerEtablissement(e), 'Ne plus le proposer (rien n\'est effacé, les niveaux rangés le restent)'))
        ligne.append(x)
      })
      ligne.append(bouton('secondaire e-ajouter', 'Ajouter un dossier…', () => void this.ajouterEtablissement(), 'Le dossier d\'un établissement, proposé pour ranger les niveaux'))
      haut.push(ligne)
    }
    const ul = document.createElement('ul')
    for (const e of montres) {
      const d = dossiers.find(x => x.id === e.dossier)!
      const l = classeursDeLaClasse(d.id, fiches, dossiers)
      const manquent = e.genre === 'ordinateur'
        ? l.filter(f => !f.cle).length
        : l.filter(f => f.drive?.compte !== e.compte || !f.drive?.dossier || f.copieDrive !== e.compte).length
      // Le nom de l'établissement (gardé par l'emplacement si l'établissement a été retiré de la liste)
      const etab = e.genre === 'ordinateur' ? nomDEtablissement(e, etabs) : null
      const li = Object.assign(document.createElement('li'), { className: 'emplacement' })
      li.dataset.genre = e.genre
      li.dataset.id = e.id
      const ou = e.genre === 'drive' ? `${compteDe(e.compte ?? '')?.nom ?? 'Drive'} › ${compteDe(e.compte ?? '')?.classeurs ?? ''} › ${e.nom}`
        : etab ? cheminLisible([etab, e.nom]) : `Cet ordinateur › ${e.nom}`
      const texte = Object.assign(document.createElement('span'), { className: 'texte' })
      texte.append(Object.assign(document.createElement('strong'), { textContent: d.nom }), ' → ', Object.assign(document.createElement('span'), { className: 'ou', textContent: ou }))
      if (manquent) texte.append(Object.assign(document.createElement('small'), { className: 'manque', textContent: `${pluriel(manquent, 'classeur')} pas encore dedans` }))
      const maj = bouton('secondaire e-maj', 'Mettre à jour', () => void this.mettreAJour(e, d))
      const inactif = e.genre === 'drive' && !this.enLigne
      maj.disabled = inactif
      if (inactif) maj.title = HORS_LIGNE_DRIVE
      li.append(texte, maj)
      // Rangé chez un établissement : « Changer… » (la fenêtre « Où ranger… »,
      // qui remplace l'emplacement ; les fichiers d'avant restent) ; sinon
      // « Retirer », comme au lot 7
      if (etab && this.ranger) li.append(bouton('secondaire e-changer', 'Changer…', () => void this.ranger?.proposer(d, { origine: 'emplacements' }), 'Ranger ce niveau dans un autre dossier (les fichiers d\'avant restent où ils sont)'))
      else li.append(bouton('secondaire e-retirer', 'Retirer', () => void this.retirer(e, d), 'Ne plus tenir ce dossier à jour (rien n\'y est effacé)'))
      ul.appendChild(li)
    }
    if (pasRange && this.ranger) {
      const li = Object.assign(document.createElement('li'), { className: 'emplacement pas-range' })
      li.dataset.genre = 'aucun'
      li.dataset.dossier = pasRange.id
      const texte = Object.assign(document.createElement('span'), { className: 'texte' })
      texte.append(Object.assign(document.createElement('strong'), { textContent: pasRange.nom }), ' → ', Object.assign(document.createElement('span'), { className: 'ou pas-range', textContent: 'pas encore rangé dans un dossier' }))
      li.append(texte, bouton('secondaire e-ranger', 'Ranger…', () => void this.ranger?.proposer(pasRange, { origine: 'emplacements' }), 'Chaque classeur du niveau aura son fichier, écrit tout seul'))
      ul.appendChild(li)
    }
    s.replaceChildren(...haut, ul)
    s.hidden = false
  }

  /** « Ajouter un dossier… » (lot 18) : un établissement de plus, choisi
   *  dans ce clic ; le même dossier qu'un établissement déjà là : rien */
  private async ajouterEtablissement() {
    if (this.occupe) return
    let h: PoigneeDossier | null
    try { h = await choisirUnDossier('mem-etablissements') } catch (e) { this.h.message(`Ce dossier n'a pas pu être choisi : ${e instanceof Error ? e.message : 'erreur inconnue'}.`); return }
    if (!h) return
    const liste = await etablissements(this.registre)
    for (const e of liste) {
      const p = await this.registre.reglage(reglagePoigneeEtablissement(e.id)).catch(() => undefined)
      if (await memeDossier(h, p)) { this.h.message(`« ${e.nom} » est déjà dans la liste des établissements.`); return }
    }
    const e: Etablissement = { id: nouvelId(), nom: h.name, cree: Date.now() }
    try { await garderEtablissement(this.registre, e, h) } catch (x) {
      this.h.message((x as { name?: string } | null)?.name === 'DataCloneError' ? 'Ce navigateur ne peut pas garder le dossier.' : `Le dossier n'a pas pu être gardé : ${x instanceof Error ? x.message : 'erreur inconnue'}.`)
      return
    }
    // Les niveaux rangés chez un établissement retiré du même nom (le même
    // dossier, choisi de nouveau) se rattachent à celui-ci
    let rattaches = 0
    for (const x of await emplacements(this.registre)) {
      if (x.genre !== 'ordinateur' || !x.etablissement || x.etablissementNom !== e.nom || liste.some(y => y.id === x.etablissement)) continue
      await garderEmplacement(this.registre, { ...x, etablissement: e.id }).catch(() => {})
      rattaches++
    }
    this.h.message(`« ${e.nom} » est ajouté aux établissements : il sera proposé pour ranger les niveaux.${rattaches ? ` ${rattaches > 1 ? `Les ${rattaches} niveaux déjà rangés chez lui le retrouvent.` : 'Le niveau déjà rangé chez lui le retrouve.'}` : ''}`)
    void this.majEmplacements()
  }

  /** « Retirer » un établissement (lot 18), après confirmation : plus
   *  proposé ; rien n'est effacé, les niveaux rangés chez lui gardent leur
   *  dossier, son nom à l'écran et le chemin de leurs fichiers */
  private async retirerEtablissement(e: Etablissement) {
    if (this.occupe) return
    const n = (await emplacements(this.registre)).filter(x => x.genre === 'ordinateur' && x.etablissement === e.id).length
    const niveaux = n ? ` ${n > 1 ? `Les ${n} niveaux rangés chez lui gardent leur dossier et continuent` : 'Le niveau rangé chez lui garde son dossier et continue'} de s'enregistrer.` : ''
    const oui = await confirmer(`Ne plus proposer « ${e.nom} » ?`, `Il ne sera plus proposé pour ranger un niveau. Rien n'est effacé.${niveaux}`, 'Retirer')
    if (!oui) return
    await retirerEtablissement(this.registre, e.id)
    this.h.message(`« ${e.nom} » n'est plus proposé. Rien n'est effacé : les niveaux rangés chez lui le restent.`)
    void this.majEmplacements()
  }

  /** « Mettre à jour » : chaque classeur du niveau dans son dossier relié
   *  (l'accord du navigateur, ou la connexion Google, dans ce clic) ; aussi
   *  depuis « Autres sauvegardes » (lot 18), pour un niveau sur le Drive */
  async mettreAJour(e: Emplacement, classe: FicheDossier) {
    if (this.occupe) return
    if (e.genre === 'drive') {
      const c = e.compte ?? 'mem'
      if (!connecte(c)) {
        const indice = dernierCompteGoogle(c)
        try { await connecter(c, indice, indice ? '' : 'select_account') } catch (x) { this.h.message(x instanceof Error ? x.message : 'La connexion à Google a échoué. Réessayez.'); return }
      }
      await this.relierDrive(classe, c)
      return
    }
    const d = await this.registre.reglage(reglagePoignee(e.id)).catch(() => undefined) as PoigneeDossier | undefined
    if (!d || typeof d.getFileHandle !== 'function') {
      this.h.message(`Ce navigateur ne retrouve plus le dossier « ${e.nom} » : choisissez-le de nouveau (menu du dossier → Enregistrer ce dossier…).`)
      return
    }
    // Dans ce clic : l'accord (le navigateur l'oublie parfois d'un jour sur l'autre)
    if (!await accordDuDossier(d, true).catch(() => false)) {
      this.h.message(`Le navigateur n'a pas permis d'écrire dans « ${e.nom} ». Cliquez « Autoriser ».`)
      return
    }
    // Un niveau rangé chez un établissement (lot 18) le reste, même si
    // l'établissement a été retiré de la liste (son nom est dans l'emplacement)
    const nomEtab = e.etablissement ? nomDEtablissement(e, await etablissements(this.registre)) : null
    const etab = e.etablissement && nomEtab ? { id: e.etablissement, nom: nomEtab, cree: 0 } : null
    await this.relierOrdinateur(classe, d, { etablissement: etab })
  }

  /** « Retirer » : le dossier n'est plus tenu à jour ; rien n'y est effacé
   *  (aussi depuis « Autres sauvegardes », lot 18, pour un niveau sur le Drive) */
  async retirer(e: Emplacement, classe: FicheDossier) {
    if (this.occupe) return
    await retirerEmplacement(this.registre, e.id)
    this.h.message(e.genre === 'drive'
      ? `« ${classe.nom} » n'est plus relié au Drive : ses classeurs y restent, et leur copie privée continue sur le Drive.`
      : `« ${classe.nom} » n'est plus relié à « ${e.nom} » : les fichiers y restent. Chaque classeur garde son enregistrement automatique (menu ⋯ du classeur pour l'arrêter).`)
    void this.majEmplacements()
  }
}

/** Le même dossier ? (isSameEntry ; sans lui, on ne sait pas : non) */
async function memeDossier(a: PoigneeDossier, b: unknown): Promise<boolean> {
  try { return typeof a.isSameEntry === 'function' && !!b && await a.isSameEntry(b) } catch { return false }
}
