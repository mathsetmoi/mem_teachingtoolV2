// =============================================================
// OUVRIR DES FICHIERS, ET TOUTE LA BIBLIOTHÈQUE DANS UN FICHIER (lot 4 C9)
// « Ouvrir un classeur » (Ctrl + O, le menu ⋯, « Ouvrir… » du bandeau de
// la bibliothèque, un fichier glissé sur le tableau ou sur la bibliothèque)
// AJOUTE le classeur d'un fichier .memc à la bibliothèque, comme un nouveau
// classeur, sans rien remplacer ; ou, au choix, remplace celui qui est
// ouvert (la question du lot 1). Avant, on le reconnaît (reconnaitre.ts) :
// - un nouveau : [Ajouter à la bibliothèque] (ou [Remplacer « … »…]) ;
// - déjà là (son id, ou la même histoire) : on compare le fichier et la
//   base. Rien de plus dans le fichier : [Ouvrir celui de la bibliothèque] ;
//   plus récent : [Mettre à jour le classeur], SANS RIEN PERDRE (voir
//   mettreAJour) ; chacun a changé de son côté : [Ajouter comme copie], ou
//   [Remplacer celui de la bibliothèque…] après la question du lot 1. On
//   ne fusionne jamais deux histoires qui ont divergé ;
// - dans la corbeille : ajouté sous un id neuf, et on le dit.
// Plusieurs fichiers d'un coup (choisis, ou lâchés ensemble) : une seule
// fenêtre dit tout ce qui sera fait, puis un bilan.
// Toute la bibliothèque : « Enregistrer toute la bibliothèque… » écrit un
// .memb (archive.ts) au fil de l'eau, un classeur à la fois en mémoire,
// chacun fabriqué par l'écrivain hors du fil principal ; « Ouvrir » d'un
// .memb l'ajoute à celle-ci sans rien écraser (les dossiers réunis, ce qui
// est déjà là n'est pas touché, sauf la case qui met à jour les classeurs
// plus récents dans le fichier).
// Le fichier est toujours lu et vérifié en entier dans le travailleur
// avant de toucher à quoi que ce soit (un .memc dans un .memb : sa tranche,
// et sa somme). Rien n'est jamais créé ni effacé par-dessus une base qui
// existe : un id dont la base est là sans fiche, on l'adopte d'abord (C8).
// =============================================================
import * as Y from 'yjs'
import type { ActionMessage, App } from '../app'
import type { Sauvegarde } from '../sauvegarde'
import { cleDernierEnregistrement, lireDernierEnregistrement, raison, telecharger } from '../sauvegarde'
import { ErreurFichier, crc32, ecrireLisible, ecrireTableau, lireTableau, nomSur, pagesLisibles, tailleLisible } from '../fichier'
import { ecrire as ecrireCle } from '../reglages'
import type { FicheClasseur, InfosClasseur } from './demarrage'
import { CANAL_CLASSEUR, CANAL_PREMIER, baseDe, estPremier, idClasseur, urlDuClasseur, visible } from './demarrage'
import { passerLaConnexion } from '../publication/drive'
import { POUR_ENREGISTRER } from '../navigateur'
import type { Registre } from './registre'
import type { Bibliotheque } from './bibliotheque'
import { CLE_ARRIVEE } from './bibliotheque'
import type { CleALArrivee, EnregistrementCle, PoigneeFichier } from './cle'
import { ID_CHOIX, accordPour, memeFichier, permission, raisonCle, repris } from './cle'
import type { FichierLu } from './ecrivain'
import { ErreurEcrivain, ecrivain, fabriquerFichier } from './ecrivain'
import { ABIME_ENTREE } from './ecrivain-taches'
import { ErreurBase, compterEntrees, creerBase, remplacerBase } from './bases'
import type { ComparaisonVecteurs } from './vecteurs'
import { comparerVecteurs, reunir } from './vecteurs'
import { adopterUneBase } from './adoption'
import type { Surveillance } from './surveillance'
import { ecritDansUnFichier } from './surveillance'
import type { Verification } from './verification'
import type { Ranger } from './ranger'
import { enregistrerDepuisLaBase } from './enregistrer'
import { nomDeClasseur } from './liste'
import { descendants, dossierVisible, nomDEtiquette, nomLibre, cleDe, ETIQUETTES_MAX } from './arbre'
import type { Identite, Prevu, Bilan } from './reconnaitre'
import {
  TEXTE_CORBEILLE, TEXTE_PUBLIEES_COPIE, bilanVide, decisionDe, identiteDuFichier, nomDepuisFichier, planDesDossiers, raisonCourte, texteApresBibliotheque,
  texteApresPlusieurs, texteAvantBibliotheque, texteAvantPlusieurs, texteCasePlusRecents, texteComparaison, texteDejaLa, texteDuFichier,
} from './reconnaitre'
import type { ClasseurArchive, EntreeArchive } from './archive'
import {
  ABIMEE, EXTENSION_BIBLIOTHEQUE, EcrivainArchive, ErreurArchive, NOM_INDEX, PAS_UNE_BIBLIOTHEQUE, cheminApercu, cheminClasseur,
  estUneArchive, indexDe, lireArchive, lireEntree, lireIndex, nomBibliotheque,
} from './archive'
import { fermerSurLeFond } from '../dialogue'
import { Tableau } from '../document'
import { resumeDesSeances } from '../seances'
import type { AncienTableau, Brouillon, IciPourLaFenetre, LigneApercu, Rangement, Rognure } from './ancien-tableau'
import {
  EXTENSION_ANCIEN, ErreurAncien, apercuDuRangement, lireAncienTableau, rangerDansLeClasseur, reprendre, seancesDApercu, texteApresAjout, texteDesRefus,
  texteDuBilan, textesAvantAnciens,
} from './ancien-tableau'
import { imageDeCalculatrice } from '../calculatrice/dessin'

/** Ce que demandent les fichiers à qui les ouvre (main.ts) */
export interface HoteFichiers {
  registre: Registre
  bibliotheque: Bibliotheque
  message(texte: string, action?: ActionMessage | ActionMessage[]): void
  /** Le classeur ouvert dans cet onglet ; null : la bibliothèque seule (ou
   *  il vient d'y être effacé) */
  classeur(): InfosClasseur | null
  app?: App
  sauvegarde?: Sauvegarde
  cle?: EnregistrementCle | null
  surveillance?: Surveillance | null
  /** Montrer la bibliothèque (depuis le tableau, après plusieurs fichiers) */
  voirLaBibliotheque?(): void
}

/** Un fichier choisi ou lâché ; poignee : par showOpenFilePicker (on
 *  pourra y enregistrer automatiquement) */
export interface Choisi { fichier: File; poignee?: PoigneeFichier }

/** Lire ou réécrire un classeur de la bibliothèque (lireUnClasseur,
 *  ecrireUnClasseur) depuis une fenêtre : fenetre, la fenêtre d'où l'on
 *  agit, qui ne compte pas comme une fenêtre ouverte ; dire : à qui dire ce
 *  qui a empêché (le message du bas sinon) */
export interface OptionsLecture { fenetre?: Element | null; dire?: (texte: string) => void }

/** Le choix des fichiers à ouvrir : des classeurs et des bibliothèques */
export const TYPES_OUVRIR = [{ description: 'Classeur, bibliothèque ou ancien tableau (MEM teachingtool)', accept: { 'application/octet-stream': ['.memc', '.memb', EXTENSION_ANCIEN] } }]
export const TYPES_BIBLIOTHEQUE = [{ description: 'Bibliothèque (MEM teachingtool)', accept: { 'application/octet-stream': [EXTENSION_BIBLIOTHEQUE] } }]
/** Un fichier qu'on peut lâcher : un classeur, une bibliothèque, un ancien
 *  tableau (ou un film élève, refusé avec sa phrase) */
export const FICHIER_OUVRABLE = /\.(mem[cb]?|prof)$/i
/** Un ancien tableau (voir ancien-tableau.ts) */
const ANCIEN = /\.prof$/i

/** L'aide de « Ouvrir un classeur… » (le menu ⋯) */
export const AIDE_OUVRIR = 'Ajoute un classeur enregistré (.memc) à la bibliothèque, ou remplace celui-ci. Reprend aussi un ancien tableau (.prof).'
export const AIDE_ENREGISTRER_TOUT = 'Un seul fichier .memb avec tous les classeurs (sans la corbeille) et les dossiers : pour changer d\'ordinateur, ou garder une copie de tout.'
const PAS_DE_PLACE = 'il n\'y a plus de place dans ce navigateur'
/** Le fichier de la clé, rouvert (après un conflit) : la clé reprend sur lui
 *  (« L'enregistrement dans « X.memc » reprend. ») */
const reprend = (nom: string) => repris({ nom })
/** La clé activée pour un classeur qui n'est pas ouvert ici : elle écrira
 *  quand il le sera (le navigateur demandera peut-être alors son accord) */
const activeePourLui = (fichier: string) => `Son enregistrement automatique dans « ${fichier} » est activé.`
const ID_VALABLE = /^[0-9a-f]{16}$/

/** iPad et iPhone grisent, dans le choix du fichier, un type qu'ils ne connaissent pas */
const IOS = typeof navigator !== 'undefined'
  && (/iPad|iPhone|iPod/.test(navigator.userAgent) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1))

const attendre = (ms: number) => new Promise<void>(ok => setTimeout(ok, ms))
/** Deux vecteurs d'état (Y.encodeStateVector) sont-ils les mêmes octets ? */
const memesOctets = (a: Uint8Array, b: Uint8Array) => a.length === b.length && a.every((x, i) => x === b[i])
/** Une image d'écran passe (le message se voit), sans attendre plus de 120 ms */
const uneImage = () => new Promise<void>(ok => { requestAnimationFrame(() => setTimeout(ok, 0)); setTimeout(ok, 120) })
const dateValable = (t: unknown): t is number => typeof t === 'number' && Number.isFinite(t) && t > 0
const estPlace = (e: unknown) => (e instanceof ErreurBase && e.raison === 'place') || (e instanceof ErreurEcrivain && e.raison === 'place')
  || (e as { name?: string } | null)?.name === 'QuotaExceededError'

/** Une image d'un ancien tableau, lue, rognée (la partie gardée) et
 *  réduite comme une image importée (1600 px au plus) ; telle quelle si
 *  rien de cela ne la change. null : elle ne se lit pas. */
async function preparerImage(donnees: string, r: Rognure | null): Promise<{ donnees: string; l: number; h: number } | null> {
  const img = await new Promise<HTMLImageElement | null>(ok => { const i = new Image(); i.onload = () => ok(i); i.onerror = () => ok(null); i.src = donnees })
  if (!img || !img.naturalWidth || !img.naturalHeight) return null
  const W = img.naturalWidth, H = img.naturalHeight
  const x = Math.min(Math.max(0, r?.x ?? 0), W - 1), y = Math.min(Math.max(0, r?.y ?? 0), H - 1)
  const gl = Math.min(r?.l ?? W, W - x), gh = Math.min(r?.h ?? H, H - y)
  if (gl < 1 || gh < 1) return null
  const k = Math.min(1, 1600 / Math.max(gl, gh))
  if (x < 1 && y < 1 && Math.abs(gl - W) < 1 && Math.abs(gh - H) < 1 && k === 1) return { donnees, l: W, h: H }
  const l = Math.max(1, Math.round(gl * k)), h = Math.max(1, Math.round(gh * k))
  const cv = Object.assign(document.createElement('canvas'), { width: l, height: h })
  cv.getContext('2d')!.drawImage(img, x, y, gl, gh, 0, 0, l, h)
  const png = /^data:image\/(png|gif)/.test(donnees)
  return { donnees: cv.toDataURL(png ? 'image/png' : 'image/jpeg', 0.86), l, h }
}

/** Ce qu'on dit d'un classeur qui n'a pas pu être lu, mis à jour… */
function raisonDe(e: unknown): string {
  if (estPlace(e)) return PAS_DE_PLACE
  if (e instanceof ErreurEcrivain) {
    if (e.raison === 'absente') return 'sa base n\'est plus dans ce navigateur'
    if (e.raison === 'abimee') return 'il semble abîmé dans ce navigateur'
  }
  return raison(e)
}

/** Le fichier commence-t-il comme un zip (une bibliothèque) ? */
async function commenceCommeUneArchive(f: Blob): Promise<boolean> {
  try { return estUneArchive(new Uint8Array(await f.slice(0, 4).arrayBuffer())) } catch { return false }
}

/** Un bouton d'une fenêtre ; faire : il ne ferme pas la fenêtre (« Enregistrer
 *  d'abord ») ; aide : ce que dit son survol */
interface Bouton { cle: string; libelle: string; classe: string; faire?: (b: HTMLButtonElement) => Promise<void>; aide?: string }

/** Une fenêtre de l'outil (pas de confirm(), que le navigateur bloque dans
 *  une page intégrée) : ses paragraphes, une liste (l'aperçu des séances,
 *  pour un ancien tableau), une case, ses boutons ; rend le bouton choisi et
 *  l'état de la case. Échap, ou un clic à côté : 'annuler'. */
function fenetre(o: { titre: string; textes: string[]; liste?: LigneApercu[]; caseACocher?: { texte: string; coche: boolean; nom?: string } | null; boutons: Bouton[]; focus: string }): Promise<{ cle: string; coche: boolean }> {
  return new Promise(fini => {
    const d = document.createElement('dialog')
    d.className = 'dialogue dialogue-ouvrir dialogue-fichiers'
    d.innerHTML = '<h2></h2><div class="corps"><div class="actions"></div></div>'
    d.querySelector('h2')!.textContent = o.titre
    const corps = d.querySelector('.corps')!, actions = d.querySelector('.actions')!
    for (const t of o.textes) corps.insertBefore(Object.assign(document.createElement('p'), { textContent: t }), actions)
    if (o.liste?.length) {
      const ul = Object.assign(document.createElement('ul'), { className: 'apercu-seances' })
      for (const l of o.liste) {
        const li = Object.assign(document.createElement('li'), { className: l.genre })
        li.append(Object.assign(document.createElement('span'), { className: 'quoi', textContent: l.texte }))
        if (l.sort) li.append(' ', Object.assign(document.createElement('span'), { className: 'sort', textContent: l.sort }))
        if (l.genre === 'ici') li.setAttribute('aria-current', 'true')
        ul.appendChild(li)
      }
      corps.insertBefore(ul, actions)
    }
    let caseEl: HTMLInputElement | null = null
    if (o.caseACocher) {
      const l = Object.assign(document.createElement('label'), { className: `case ${o.caseACocher.nom ?? 'case-cle'}` })
      caseEl = Object.assign(document.createElement('input'), { type: 'checkbox', checked: o.caseACocher.coche })
      l.append(caseEl, Object.assign(document.createElement('span'), { textContent: o.caseACocher.texte }))
      corps.insertBefore(l, actions)
    }
    let reponse = 'annuler'
    let occupe = false
    const fermer = (r: string) => { if (occupe) return; reponse = r; if (d.open) d.close() }
    d.addEventListener('cancel', e => { if (occupe) e.preventDefault() })
    d.addEventListener('close', () => { d.remove(); fini({ cle: reponse, coche: !!caseEl?.checked }) })
    fermerSurLeFond(d, () => fermer('annuler'))
    let focus: HTMLButtonElement | null = null
    for (const b of o.boutons) {
      const x = Object.assign(document.createElement('button'), { type: 'button', className: b.classe, textContent: b.libelle })
      x.dataset.a = b.cle
      if (b.aide) x.title = b.aide
      x.addEventListener('click', () => {
        if (!b.faire) { fermer(b.cle); return }
        occupe = true
        void b.faire(x).finally(() => { occupe = false })
      })
      actions.appendChild(x)
      if (b.cle === o.focus) focus = x
    }
    document.body.appendChild(d)
    d.showModal()
    focus?.focus()
  })
}

const ANNULER: Bouton = { cle: 'annuler', libelle: 'Annuler', classe: 'secondaire' }

/** Ce qu'on sait d'un fichier reconnu : son identité, et pour un classeur
 *  déjà là, la comparaison du fichier (a) et de la base (b) ; absente : la
 *  fiche n'a plus sa base (le fichier la recrée) */
interface Reconnu { identite: Identite; comparaison?: ComparaisonVecteurs; absente?: boolean }
/** Pendant un lot : les classeurs qu'on prévoit d'ajouter (pour qu'un même
 *  classeur deux fois ne s'ajoute qu'une fois) et les vecteurs qu'auront
 *  ceux qu'on prévoit de mettre à jour */
interface Prevision { fiches: FicheClasseur[]; vecteurs: Map<string, Uint8Array> }

export class Fichiers {
  private choix: HTMLInputElement
  /** Un fichier (ou un lot) à la fois */
  private enCours = false
  /** Le classeur de cet onglet a été coupé de sa base (une mise à jour
   *  depuis un fichier, lot 4 C9) : la page se rechargera sur lui */
  private coupe = false

  constructor(private hote: HoteFichiers, racine: HTMLElement) {
    this.choix = Object.assign(document.createElement('input'), { type: 'file', hidden: true, multiple: true })
    if (!IOS) this.choix.accept = `.memc,.memb,${EXTENSION_ANCIEN}`
    this.choix.className = 'choix-fichiers'
    this.choix.setAttribute('aria-hidden', 'true')
    this.choix.addEventListener('change', () => {
      const tous = [...(this.choix.files ?? [])]
      this.choix.value = ''
      if (tous.length) void this.ouvrir(tous.map(fichier => ({ fichier })))
    })
    racine.appendChild(this.choix)
  }

  private get registre() { return this.hote.registre }
  private get biblio() { return this.hote.bibliotheque }
  /** Le classeur de cet onglet, s'il est encore là (ni effacé, ni coupé) */
  private get ici(): InfosClasseur | null {
    const c = this.hote.classeur()
    return c && this.hote.app && !this.hote.sauvegarde?.estPerime ? c : null
  }
  private estIci(f: { id: string }) { return this.ici?.id === f.id }
  /** Le classeur de cet onglet, si l'on peut encore écrire dans sa mémoire
   *  (ni effacé, ni périmé, ni coupé de sa base) : « Vérifier les classeurs »
   *  (lot 17) y range les images retrouvées sans passer par sa base */
  classeurEnMemoire(): InfosClasseur | null { return this.coupe ? null : this.ici }
  /** La vérification des images (lot 17, verification.ts), branchée par main.ts */
  verification: Verification | null = null
  /** Où ranger les classeurs d'un niveau (lot 18, ranger.ts), branché par
   *  main.ts : un classeur ajouté dans un niveau rangé reçoit son fichier */
  ranger: Ranger | null = null

  // ---------- Choisir ----------
  /** Pourquoi on ne peut pas ouvrir de fichier maintenant (null : on peut) */
  private refus(): string | null {
    if (this.enCours) return 'Un fichier est déjà en train de s\'ouvrir.'
    return this.refusMaintenant()
  }
  /** fenetre : celle d'où l'on agit (« Vérifier les classeurs », lot 17) :
   *  elle ne compte pas comme une fenêtre ouverte qui empêcherait */
  private refusMaintenant(fenetre?: Element | null): string | null {
    if (this.hote.classeur() && this.hote.sauvegarde?.estPerime && !this.coupe) return 'Rechargez d\'abord la page.'
    if (this.hote.app?.enLecture) return 'Fermez d\'abord la revue.'
    if ([...document.querySelectorAll('dialog[open]')].some(d => d !== fenetre)) return 'Fermez d\'abord la fenêtre ouverte.'
    return null
  }

  /** Ctrl + O, « Ouvrir un classeur… », « Ouvrir… » : un ou plusieurs
   *  fichiers .memc ou .memb, par showOpenFilePicker quand il existe (Chrome,
   *  Edge, aussi en file:// : la poignée permet ensuite d'y enregistrer
   *  automatiquement ; le même dossier d'une fois sur l'autre) ; on a renoncé
   *  (AbortError) : rien ; une autre erreur, ou ailleurs (Firefox, Safari,
   *  l'iPad) : le choix de fichier d'avant, plusieurs à la fois */
  choisir() {
    const r = this.refus()
    if (r) { this.hote.message(r); return }
    const choisir = (window as unknown as { showOpenFilePicker?: (o: unknown) => Promise<PoigneeFichier[]> }).showOpenFilePicker
    if (typeof choisir !== 'function') { this.choisirAvecLeChamp(); return }
    void (async () => {
      let hs: PoigneeFichier[]
      try { hs = await choisir.call(window, { multiple: true, id: ID_CHOIX, types: TYPES_OUVRIR }) } catch (e) {
        if ((e as { name?: string } | null)?.name !== 'AbortError') this.choisirAvecLeChamp()
        return
      }
      const choisis: Choisi[] = []
      for (const h of hs ?? []) {
        try { choisis.push({ fichier: await h.getFile(), poignee: h }) } catch (e) { this.hote.message(`« ${h.name} » n'a pas pu être lu : ${raison(e)}.`); return }
      }
      await this.ouvrir(choisis)
    })()
  }

  /** Le choix de fichier d'avant (Firefox, Safari, l'iPad : sans accept, qui
   *  y grise les .memc) */
  choisirAvecLeChamp() {
    this.choix.value = ''
    this.choix.click()
  }

  /** Des fichiers lâchés (sur le tableau, sur la bibliothèque) : les
   *  classeurs et les bibliothèques ; rien d'autre n'est ouvert */
  lacher(fichiers: File[]) {
    const bons = fichiers.filter(f => FICHIER_OUVRABLE.test(f.name))
    if (!bons.length) { this.hote.message(fichiers.length > 1 ? 'Ces fichiers ne sont ni des classeurs (.memc) ni une bibliothèque (.memb).' : 'Ce fichier n\'est ni un classeur (.memc) ni une bibliothèque (.memb).'); return }
    void this.ouvrir(bons.map(fichier => ({ fichier })))
  }

  /** Ouvre des fichiers : un seul (sa question), plusieurs (une fenêtre
   *  qui dit tout), une bibliothèque (.memb). Lot 7 (la fenêtre « Ouvrir »,
   *  un dossier, le Drive) : dossier, le dossier de la bibliothèque où vont
   *  les classeurs ajoutés (sinon celui qu'on regarde) ; lot, la fenêtre de
   *  plusieurs fichiers même pour un seul (on reste dans la bibliothèque).
   *  Rend faux si l'on a renoncé (ou rien pu faire). */
  async ouvrir(choisis: Choisi[], o: { dossier?: string | null; lot?: boolean } = {}): Promise<boolean> {
    if (!choisis.length) return false
    const r = this.refus()
    if (r) { this.hote.message(r); return false }
    this.enCours = true
    this.dossierImpose = o.dossier
    try {
      const anciens = choisis.filter(c => ANCIEN.test(c.fichier.name))
      if (anciens.length) {
        if (anciens.length < choisis.length) { this.hote.message('Ouvrez les anciens tableaux (.prof) à part, sans classeur ni bibliothèque avec eux.'); return false }
        return await this.ouvrirAnciens(anciens)
      }
      if (choisis.length === 1 && !o.lot) { await this.ouvrirUn(choisis[0]); return true }
      return await this.ouvrirPlusieurs(choisis)
    } catch (e) {
      this.hote.message(`Le fichier n'a pas pu être ouvert : ${raisonDe(e)}.`)
      if (this.coupe) this.recharger(this.hote.classeur()?.id ?? '', null)
      return false
    } finally { this.enCours = false; this.dossierImpose = undefined }
  }

  // ---------- Lire, reconnaître ----------
  /** Un .memc lu et vérifié en entier dans le travailleur (sur le fil en
   *  repli, comme avant le lot 4) ; crc : la somme de sa tranche dans un
   *  .memb. ErreurFichier : ce n'est pas un classeur qu'on sait ouvrir (sa
   *  phrase dit quoi faire). */
  private async lire(f: Blob, crc?: number): Promise<FichierLu> {
    try { return await ecrivain.lireFichier(f, crc === undefined ? {} : { crc }) } catch (e) {
      if (e instanceof ErreurEcrivain && e.raison === 'illisible') throw new ErreurFichier(e.message)
      const o = new Uint8Array(await f.arrayBuffer())
      if (crc !== undefined && crc32(o) !== crc >>> 0) throw new ErreurFichier(ABIME_ENTREE)
      const x = lireTableau(o)
      return { ...x, vecteur: Y.encodeStateVectorFromUpdate(x.etat) }
    }
  }

  /** Ce qui attend dans le classeur de cet onglet (le point d'un simple
   *  toucher, la piste des instruments) s'écrit avant de comparer */
  private poserIci() {
    const app = this.hote.app
    if (!this.ici || !app) return
    app.poserCeQuiAttend()
    app.piste.vider()
  }

  /** Ce que contient ce classeur maintenant : sa base (lue par l'écrivain),
   *  et, ouvert ici, la mémoire de l'onglet, réunies. absente : la fiche n'a
   *  plus de base. */
  private async vecteurActuel(f: FicheClasseur): Promise<{ vecteur: Uint8Array; absente: boolean }> {
    let base: Uint8Array | null = null, absente = false
    try { base = (await ecrivain.vecteurDeLaBase(f.base)).vecteur } catch (e) {
      if (e instanceof ErreurEcrivain && e.raison === 'absente') absente = true
      else throw e
    }
    const app = this.hote.app
    if (this.estIci(f) && app) {
      const m = Y.encodeStateVector(app.tableau.doc)
      return { vecteur: base && !app.tableau.trou ? reunir(base, m) : m, absente: false }
    }
    return { vecteur: base ?? Y.encodeStateVector(new Map()), absente }
  }

  /** Reconnaît le classeur d'un fichier (voir reconnaitre.ts) : un id dont
   *  la base est là sans fiche est d'abord adopté (C8), puis traité comme
   *  le même ; les vecteurs manquants des fiches sont calculés par
   *  l'écrivain ; un classeur déjà là est comparé à sa base. prevision :
   *  dans un lot, ce qu'on prévoit déjà d'ajouter ou de mettre à jour. */
  private async reconnaitre(entete: { id?: string }, vecteur: Uint8Array, o: { lot?: boolean; prevision?: Prevision } = {}): Promise<Reconnu> {
    const reg = this.registre
    let [fiches, dossiers] = await Promise.all([reg.classeurs(), reg.dossiers()])
    if (entete.id && ID_VALABLE.test(entete.id) && !fiches.some(f => f.id === entete.id)) {
      const base = baseDe(entete.id)
      if (await compterEntrees(base).catch(() => 0) > 0) {
        const ids = new Set(fiches.map(f => f.id))
        const f = await adopterUneBase(reg, base, b => ecrivain.examinerBase(b), ids).catch(() => null)
        if (f && f !== 'vide') { void this.biblio.charger(); this.hote.message(`Un classeur retrouvé dans ce navigateur a été remis dans la bibliothèque : « ${f.nom} ».`) }
        fiches = await reg.classeurs()
      }
    }
    const prevues = o.prevision?.fiches ?? []
    const vecteurs = new Map<string, Uint8Array>(o.prevision?.vecteurs ?? [])
    for (const f of fiches) {
      if (f.vecteur || vecteurs.has(f.id) || !visible(f, dossiers)) continue
      const v = await ecrivain.vecteurDeLaBase(f.base).then(r => r.vecteur, () => null)
      if (v) vecteurs.set(f.id, v)
    }
    const identite = identiteDuFichier(entete, vecteur, [...fiches, ...prevues], { dossiers, vecteurs, lot: o.lot })
    if (identite.genre !== 'meme' && identite.genre !== 'ressemble') return { identite }
    const F = identite.fiche
    // Un classeur qu'on prévoit déjà d'ajouter ou de mettre à jour : ce qu'il aura
    const prevu = prevues.includes(F) ? F.vecteur : o.prevision?.vecteurs.get(F.id)
    if (prevu) return { identite, comparaison: comparerVecteurs(vecteur, prevu) }
    const a = await this.vecteurActuel(F)
    return { identite, comparaison: comparerVecteurs(vecteur, a.vecteur), absente: a.absente }
  }

  /** L'id est-il libre : aucune fiche, aucune base (une base vide qui existe
   *  fera échouer la création : on en prend un autre, voir ajouter) */
  private async idLibre(id: string): Promise<boolean> {
    if (!ID_VALABLE.test(id) || await this.registre.classeur(id)) return false
    return await compterEntrees(baseDe(id)).catch(() => 1) === 0
  }

  /** Le fichier ouvert est-il celui de la clé de ce classeur (isSameEntry) ? */
  private async estLaCle(f: FicheClasseur, poignee?: PoigneeFichier): Promise<boolean> {
    if (!poignee || !f.cle) return false
    const p = await this.registre.poignee(f.id).catch(() => undefined)
    return !!p && await memeFichier(poignee, p)
  }

  /** La case « Enregistrer automatiquement les changements dans ce fichier »
   *  peut-elle être offerte pour le classeur id ? Le navigateur sait écrire
   *  seul dans un fichier, le travailleur aussi ; ce fichier ne sert pas
   *  déjà à un autre classeur. (L'id du fichier doit être celui du classeur,
   *  ou absent : à l'appelant de le vérifier.) */
  private async caseOfferte(poignee: PoigneeFichier | undefined, id: string | null): Promise<boolean> {
    if (!poignee || !ecritDansUnFichier() || ecrivain.mode === 'fil') return false
    for (const a of await this.registre.poignees().catch(() => [])) {
      if (a.id !== id && await memeFichier(poignee, a.poignee)) return false
    }
    return true
  }

  // ---------- D'anciens tableaux (.prof) ----------
  /** Un ou plusieurs anciens tableaux (voir ancien-tableau.ts) : chacun
   *  devient une séance, avec son film, À SA DATE, dans un classeur neuf ou
   *  entre les séances du classeur ouvert. Convertir d'abord, demander
   *  ensuite, écrire enfin : chaque ancien tableau est rejoué dans un
   *  classeur brouillon en mémoire (reprendre), puis copié dans le classeur
   *  d'arrivée comme une séance déplacée (rangerDansLeClasseur, par
   *  copierSeance : le film reste dans l'ordre des heures, un chevauchement
   *  ou un doublon est refusé) ; la fenêtre montre où chacun ira ; puis le
   *  classeur ouvert reçoit la différence (ecrireUnClasseur, comme « Déplacer
   *  vers… » : sans rechargement, sa base, sa clé et son Drive suivent), ou
   *  le classeur neuf entre dans la bibliothèque comme un fichier .memc.
   *  Rien n'est écrit avant le choix, et jamais à moitié. */
  private async ouvrirAnciens(choisis: Choisi[]): Promise<boolean> {
    this.hote.message(choisis.length > 1 ? 'Lecture des anciens tableaux…' : 'Lecture de l\'ancien tableau…')
    await uneImage()
    const anciens: AncienTableau[] = []
    for (const { fichier } of choisis) {
      try { anciens.push(lireAncienTableau(await fichier.text(), fichier.name)) } catch (e) {
        this.hote.message(`« ${fichier.name} » : ${e instanceof ErreurAncien ? e.message : `ce fichier n'a pas pu être lu (${raisonDe(e)})`}`)
        return false
      }
    }
    anciens.sort((a, b) => a.debut - b.debut)
    // Chacun dans son classeur brouillon (les images se lisent ici)
    const brouillons: Brouillon[] = []
    try {
      for (const a of anciens) {
        if (anciens.length > 1) { this.hote.message(`Lecture de « ${a.nom} »…`); await uneImage() }
        const tab = new Tableau(null)
        brouillons.push({ a, tab, bilan: await reprendre(tab, a, preparerImage, imageDeCalculatrice) })
      }
    } catch (e) {
      this.hote.message(`L'ancien tableau n'a pas pu être repris : ${raisonDe(e)}. Rien n'a changé.`)
      return false
    }
    this.poserIci()
    const r = this.refusMaintenant()
    if (r) { this.hote.message(r); return false }
    const ici = this.ici && this.hote.sauvegarde && !this.coupe ? this.ici : null
    const app = this.hote.app
    // Le classeur ouvert, dans un document neuf, et chaque ancien tableau copié à sa date
    let dansIci: Rangement | null = null
    let pourLaFenetre: IciPourLaFenetre | null = null
    let vecteurAvant: Uint8Array | null = null
    if (ici && app) {
      const tab = await this.lireLeClasseurOuvert(app)
      vecteurAvant = Y.encodeStateVector(app.tableau.doc)
      dansIci = rangerDansLeClasseur(tab, brouillons)
      const verdicts = dansIci.verdicts
      const lignes = apercuDuRangement(seancesDApercu(tab), brouillons.map((b, k) => ({ debut: b.a.debut, nom: b.a.nom, pages: b.a.pages.length, verdict: verdicts[k].verdict })), ici.nom)
      pourLaFenetre = { nom: ici.nom, lignes, verdicts }
    }
    const { textes, lignes, ajoutable, aide } = textesAvantAnciens(anciens, pourLaFenetre)
    // Le bouton principal (Entrée) : « Ajouter à « … » » dès qu'un tableau s'y range, sinon « Nouveau classeur »
    const principal = ici && ajoutable ? 'ajouter-ici' : 'nouveau'
    const boutons: Bouton[] = [ANNULER, { cle: 'nouveau', libelle: 'Nouveau classeur', classe: principal === 'nouveau' ? 'principal' : 'secondaire' }]
    if (ici && ajoutable) boutons.push({ cle: 'ajouter-ici', libelle: `Ajouter à « ${ici.nom} »`, classe: 'principal', ...(aide ? { aide } : {}) })
    const choix = await fenetre({ titre: anciens.length > 1 ? 'Reprendre ces anciens tableaux ?' : 'Reprendre cet ancien tableau ?', textes, liste: lignes, boutons, focus: principal })
    if (choix.cle === 'ajouter-ici') {
      if (!ici || !app || !dansIci || !vecteurAvant) return false
      const F = await this.registre.classeur(ici.id).catch(() => null) ?? null
      if (!F) { this.hote.message(`« ${ici.nom} » n'est plus dans la bibliothèque.`); return false }
      // Un autre onglet a écrit pendant la fenêtre : la différence ne s'appliquerait plus au même classeur
      if (!memesOctets(Y.encodeStateVector(app.tableau.doc), vecteurAvant)) { this.hote.message(`« ${ici.nom} » a changé entre-temps : rien n'a été ajouté. Recommencez.`); return false }
      if (!(await this.ecrireUnClasseur(F, dansIci.cible))) return false
      this.hote.message(texteApresAjout(F.nom, dansIci.ajoutes.map(b => texteDuBilan(b.a, b.bilan)), dansIci.refuses))
      return true
    }
    if (choix.cle !== 'nouveau') return false
    // Un classeur neuf : la même chaîne, dans un classeur vide
    const nom = nomDeClasseur(anciens[0].nom) ?? 'Ancien tableau'
    const neuf = rangerDansLeClasseur(new Tableau(null), brouillons)
    const lu = await this.lire(ecrireTableau(neuf.cible.doc, Date.now(), { nom }))
    const apres = [neuf.ajoutes.map(b => texteDuBilan(b.a, b.bilan)).join(' '), texteDesRefus(nom, neuf.refuses)].filter(Boolean).join(' ')
    await this.ajouterEtOuvrir(`${nom}.memc`, lu, { apres })
    return true
  }

  // ---------- Les séances d'un classeur, depuis la bibliothèque ----------
  /** Un classeur de la bibliothèque, lu dans un document qui ne vit nulle
   *  part, pour y ranger ses séances (voir deplacer-seance.ts) : celui de
   *  cet onglet tel qu'il est en mémoire, un autre tel que sa base le garde.
   *  null : il n'a pas pu être lu (on le dit). o.fenetre : la fenêtre d'où
   *  l'on agit (elle n'empêche pas) ; o.dire : à qui le dire (le message du
   *  bas sinon) — « Vérifier les classeurs » (lot 17). */
  async lireUnClasseur(F: FicheClasseur, o: OptionsLecture = {}): Promise<Tableau | null> {
    const dire = o.dire ?? ((t: string) => this.hote.message(t))
    const r = this.refusMaintenant(o.fenetre) ?? (this.enCours ? 'Un fichier est en train de s\'ouvrir : attendez un instant.' : null)
    if (r) { dire(r); return null }
    const app = this.hote.app
    try {
      if (this.estIci(F) && app && this.hote.sauvegarde) return await this.lireLeClasseurOuvert(app)
      const tab = new Tableau(null)
      tab.seancesActives = true
      const f = await ecrivain.fabriquerFichier(F.base, { nom: F.nom, id: F.id })
      tab.lireEtat((await this.lire(f.fichier)).etat)
      return tab
    } catch (e) {
      dire(`« ${F.nom} » n'a pas pu être lu : ${raisonDe(e)}. Rien n'a changé.`)
      return null
    }
  }

  /** Le classeur de cet onglet, tel qu'il est en mémoire (ce qui attend est
   *  posé, les écritures finies), lu dans un document qui ne vit nulle part */
  private async lireLeClasseurOuvert(app: App): Promise<Tableau> {
    const tab = new Tableau(null)
    tab.seancesActives = true
    app.poserCeQuiAttend()
    app.piste.vider()
    await app.tableau.attendreEcritures()
    tab.lireEtat(Y.encodeStateAsUpdate(app.tableau.doc))
    return tab
  }

  /** Les images que le classeur de cet onglet montre sans leurs pixels
   *  (avant le 28 octobre 2026, une séance déplacée vers un autre classeur y
   *  arrivait sans ses images : elles étaient restées, sous le même nom,
   *  dans le classeur d'où elle venait), cherchées dans les autres classeurs
   *  de la bibliothèque (ceux de la corbeille compris) et rangées dans le
   *  sien : c'est la vérification des images qui s'en charge (lot 17,
   *  verification.ts), qui dit aussi ce qui reste introuvable. Vrai : il en
   *  a reçu (la page se redessine) ; null : pas maintenant (on réessaiera). */
  async retrouverImages(): Promise<boolean | null> {
    const ici = this.ici, app = this.hote.app
    if (!ici || !app || !this.hote.sauvegarde || this.refusMaintenant()) return null
    if (!this.verification) return false
    return this.verification.retrouverIci()
  }

  /** Ce qu'on a changé dans un classeur lu par lireUnClasseur s'y écrit :
   *  celui de cet onglet le reçoit tout de suite (sa base, sa clé, son Drive
   *  suivent comme pour tout changement) ; un autre, dans sa base, sans rien
   *  perdre (comme « Mettre à jour le classeur » : s'il a changé entre-temps,
   *  rien ne s'écrit), et les onglets qui l'ont ouvert sont prévenus. Sa
   *  fiche suit (ses pages, ses séances). Faux : rien n'a changé (on le dit ;
   *  o.dire : à qui, voir lireUnClasseur). */
  async ecrireUnClasseur(F: FicheClasseur, tab: Tableau, o: OptionsLecture = {}): Promise<boolean> {
    const app = this.hote.app
    const dire = o.dire ?? ((t: string) => this.hote.message(t))
    let vecteur: Uint8Array
    try {
      if (this.estIci(F) && app && this.hote.sauvegarde && !this.coupe) {
        app.tableau.lireEtat(Y.encodeStateAsUpdate(tab.doc, Y.encodeStateVector(app.tableau.doc)))
        vecteur = Y.encodeStateVector(app.tableau.doc)
      } else {
        const lu = await this.lire(ecrireTableau(tab.doc, Date.now(), { nom: F.nom, id: F.id }))
        this.prevenir(F, 'remplace')
        const r = await ecrivain.mettreAJour(F.base, lu.etat, lu.vecteur)
        if (!r.misAJour) {
          dire(`« ${F.nom} » a changé pendant ce temps : rien n'a été modifié. Recommencez.`)
          return false
        }
        vecteur = r.vecteur
      }
    } catch (e) {
      dire(`« ${F.nom} » n'a pas pu être modifié : ${raisonDe(e)}. Rien n'a changé.`)
      return false
    }
    const t = this.estIci(F) && app ? app.tableau : tab
    const rangees = t.seancesDuClasseur()
    const liste = resumeDesSeances(rangees)
    await this.registre.modifierClasseur(F.id, x => {
      x.modifie = Math.max(x.modifie || 0, Date.now())
      x.pages = t.ordre.length
      if (rangees.length) x.seances = rangees.length
      if (liste.length) x.listeSeances = liste; else delete x.listeSeances
      x.vecteur = vecteur
    }).catch(() => undefined)
    return true
  }

  // ---------- Un fichier ----------
  private async ouvrirUn(c: Choisi) {
    const { fichier, poignee } = c
    if (fichier.size > 2_000_000) { this.hote.message('Lecture du fichier…'); await uneImage() }
    if (await commenceCommeUneArchive(fichier)) return this.ouvrirLaBibliotheque(fichier)
    let lu: FichierLu
    try { lu = await this.lire(fichier) } catch (e) {
      this.hote.message(e instanceof ErreurFichier ? e.message : 'Ce fichier n\'a pas pu être lu.')
      return
    }
    this.poserIci()
    const rec = await this.reconnaitre(lu.entete, lu.vecteur)
    // La lecture a pris un moment : une fenêtre a pu s'ouvrir entre-temps
    const r = this.refusMaintenant()
    if (r) { this.hote.message(r); return }
    await this.decider(fichier.name, lu, rec, poignee)
  }

  /** La question d'un fichier, puis ce qu'on a choisi */
  private async decider(nomFichier: string, lu: FichierLu, rec: Reconnu, poignee?: PoigneeFichier): Promise<void> {
    const id = rec.identite, e = lu.entete
    const textes = [texteDuFichier(nomFichier, lu.pages, e.date)]
    const boutons: Bouton[] = [ANNULER]
    let focus: string
    let offrir = false
    const ici = this.ici
    if (id.genre === 'nouveau' || id.genre === 'corbeille') {
      if (id.genre === 'corbeille') textes.push(TEXTE_CORBEILLE)
      if (ici && this.hote.sauvegarde && !this.coupe) boutons.push({ cle: 'remplacer-ouvert', libelle: `Remplacer «\u00a0${ici.nom}\u00a0»…`, classe: 'secondaire' })
      boutons.push({ cle: 'ajouter', libelle: 'Ajouter à la bibliothèque', classe: 'principal' })
      focus = 'ajouter'
      // Il gardera l'id du fichier (s'il est libre), ou le fichier n'en a pas
      const garde = id.genre === 'nouveau' && (!e.id || await this.idLibre(e.id))
      offrir = garde && await this.caseOfferte(poignee, e.id ?? null)
    } else {
      const F = id.fiche, c = rec.comparaison ?? 'diverge'
      textes.push(texteDejaLa(id, Date.now()), texteComparaison(c))
      if (c === 'egal' || c === 'contenu') {
        boutons.push({ cle: 'copie', libelle: 'Ajouter quand même comme copie', classe: 'secondaire' }, { cle: 'ouvrir-biblio', libelle: 'Ouvrir celui de la bibliothèque', classe: 'principal' })
        focus = 'ouvrir-biblio'
      } else if (c === 'contient') {
        boutons.push({ cle: 'copie', libelle: 'Ajouter comme copie', classe: 'secondaire' }, { cle: 'mettre-a-jour', libelle: 'Mettre à jour le classeur', classe: 'principal' })
        focus = 'mettre-a-jour'
      } else {
        boutons.push({ cle: 'remplacer-biblio', libelle: 'Remplacer celui de la bibliothèque…', classe: 'secondaire' }, { cle: 'copie', libelle: 'Ajouter comme copie', classe: 'principal' })
        focus = 'copie'
      }
      // La case : pas pour une copie (le fichier porte l'id de l'original) ;
      // seulement si le classeur n'a pas déjà sa clé, et que le fichier est le sien
      offrir = c !== 'diverge' && !F.cle && (!e.id || e.id === F.id) && await this.caseOfferte(poignee, F.id)
    }
    const caseACocher = offrir ? { texte: 'Enregistrer automatiquement les changements dans ce fichier', coche: true } : null
    const choix = await fenetre({ titre: 'Ouvrir ce classeur ?', textes, caseACocher, boutons, focus })
    // L'accord pour écrire dans le fichier. Chrome l'oublie dès que la page
    // change (sauf « Autoriser à chaque visite ») : demandé dans ce clic avant
    // de partir vers le classeur, il serait perdu, et redemandé à l'arrivée.
    // On ne le demande ici, dans le geste, que si l'on reste sur cette page
    // (le fichier du classeur ouvert ici, qui le contient déjà) ; sinon,
    // l'arrivée dit ce qu'il en est et le demande en un clic (voir
    // EnregistrementCle.direALArrivee).
    const voulu = offrir && choix.coche && choix.cle !== 'copie' && choix.cle !== 'annuler' && choix.cle !== 'remplacer-ouvert'
    const resteIci = choix.cle === 'ouvrir-biblio' && (id.genre === 'meme' || id.genre === 'ressemble') && this.estIci(id.fiche)
    const accord = voulu && (resteIci ? await accordPour(poignee!) : true)
    const cle = voulu ? { poignee: poignee!, accord } : null
    switch (choix.cle) {
      case 'remplacer-ouvert':
        // Le fichier d'un classeur de la corbeille : le classeur ouvert, qui
        // prend un id neuf (l'original peut être remis), en devient une copie
        await this.hote.sauvegarde?.proposerRemplacement(nomFichier, lu, poignee, offrir ? choix.coche : true, { copie: id.genre === 'corbeille' })
        return
      case 'ajouter':
        await this.ajouterEtOuvrir(nomFichier, lu, { neuf: id.genre === 'corbeille', cle })
        return
      case 'copie':
        await this.ajouterEtOuvrir(nomFichier, lu, { copie: true, de: id.genre === 'meme' || id.genre === 'ressemble' ? id.fiche : undefined })
        return
      case 'ouvrir-biblio':
        if (id.genre === 'meme' || id.genre === 'ressemble') await this.ouvrirCeluiDeLaBibliotheque(id.fiche, lu, poignee, cle)
        return
      case 'mettre-a-jour': {
        if (id.genre !== 'meme' && id.genre !== 'ressemble') return
        const r = await this.mettreAJour(id.fiche, lu, { poignee, cle, absente: rec.absente })
        // Un autre onglet a écrit entre la comparaison et la mise à jour :
        // chacun a changé de son côté, rien n'a été écrit
        if (r === 'diverge') await this.decider(nomFichier, lu, { identite: id, comparaison: 'diverge' }, poignee)
        return
      }
      case 'remplacer-biblio':
        if (id.genre === 'meme' || id.genre === 'ressemble') await this.remplacerDansLaBibliotheque(id.fiche, nomFichier, lu, poignee)
        return
      default:
        if (this.coupe) this.recharger(this.hote.classeur()?.id ?? '', null)
    }
  }

  /** Le dossier où va un classeur ajouté : celui qu'on regarde dans la
   *  bibliothèque, ou la racine depuis le tableau */
  private dossierCible(): string | null { return this.dossierImpose !== undefined ? this.dossierImpose : this.biblio.dossierPourAjouter() }
  /** Le dossier imposé par la fenêtre « Ouvrir » (lot 7) le temps d'ouvrir */
  private dossierImpose: string | null | undefined = undefined

  /** Ajoute le classeur d'un fichier à la bibliothèque (Registre.creerClasseur :
   *  rien ne reste si cela échoue). Son id : celui du fichier s'il est libre,
   *  sinon (une copie, la corbeille, un id pris) un neuf ; son nom : celui de
   *  l'en-tête, sinon d'après le nom du fichier ; une copie : « … (copie) ».
   *  Il arrive d'un fichier : ce fichier le garde depuis la date de son
   *  en-tête (le dernier enregistrement).
   *  Quand il ne garde pas l'id de son fichier (une copie, un classeur de
   *  même origine dans la corbeille, qu'on peut remettre, ou un id déjà
   *  pris), c'est la copie d'un classeur qui reste ici : sa base se crée
   *  comme celle de « Dupliquer » (ecrivain-pur.preparerCopie), son registre
   *  des publications vidé, et marquée comme copie. Sans cela, republier
   *  depuis la copie une séance de l'original mettrait à jour le lien déjà
   *  donné à l'autre classe.
   *  Rend sa fiche, et combien de séances publiées la copie n'a pas
   *  gardées (0 : rien n'a été retiré). */
  private async ajouter(nomFichier: string, lu: FichierLu, o: { copie?: boolean; neuf?: boolean; nom?: string; de?: FicheClasseur; dossier: string | null; etiquettes?: string[]; cree?: number; modifie?: number }): Promise<{ fiche: FicheClasseur; publications: number }> {
    const e = lu.entete, reg = this.registre
    let id = !o.copie && !o.neuf && e.id && await this.idLibre(e.id) ? e.id : idClasseur()
    let nom = nomDeClasseur(o.nom ?? '') ?? e.nom ?? (o.de?.nom || nomDepuisFichier(nomFichier))
    if (o.copie) nom = nomLibre(e.nom ?? o.de?.nom ?? nom, (await reg.classeurs()).map(f => f.nom))
    const t = Date.now(), date = dateValable(e.date) ? e.date : t
    for (let essai = 0; ; essai++) {
      const copie = !!o.copie || !!o.neuf || (!!e.id && id !== e.id)
      const fiche: FicheClasseur = {
        id, base: baseDe(id), nom, dossier: o.dossier, etiquettes: o.etiquettes ?? [],
        cree: dateValable(o.cree) ? o.cree : t, modifie: dateValable(o.modifie) ? o.modifie : date, ouvert: 0, pages: lu.pages, vecteur: lu.vecteur, recu: date,
      }
      try {
        // La base se crée dans le travailleur : ranger 18 Mo gèlerait la page
        let faite: { publications: number; vecteur?: Uint8Array } = { publications: 0 }
        let f = await reg.creerClasseur(fiche, async base => { faite = await ecrivain.creerBase(base, lu.etat, { id, nom }, { copie }); return { creee: true } })
        // La copie a une petite mise à jour de plus que le fichier (le registre vidé, la marque)
        const v = faite.vecteur
        if (v) f = await reg.modifierClasseur(f.id, x => { x.vecteur = v }).catch(() => undefined) ?? f
        if (dateValable(e.date)) ecrireCle(cleDernierEnregistrement(f), String(e.date))
        return { fiche: f, publications: faite.publications }
      } catch (x) {
        // L'id vient d'être pris (un autre onglet), ou sa base existe vide : un autre
        const pris = ((x instanceof ErreurBase || x instanceof ErreurEcrivain) && x.raison === 'existante') || (x as { name?: string } | null)?.name === 'ConstraintError'
        if (pris && essai < 3) { id = idClasseur(); continue }
        throw x
      }
    }
  }

  /** Après « Ajouter » (un seul fichier) : on ouvre le classeur ajouté (en
   *  partant de celui-ci sans rien perdre, voir Bibliotheque.ouvrirClasseur) */
  private async ajouterEtOuvrir(nomFichier: string, lu: FichierLu, o: { copie?: boolean; neuf?: boolean; de?: FicheClasseur; cle?: { poignee: PoigneeFichier; accord: boolean } | null; apres?: string }) {
    let fiche: FicheClasseur, publications: number
    try { ({ fiche, publications } = await this.ajouter(nomFichier, lu, { ...o, dossier: this.dossierCible() })) } catch (e) {
      this.hote.message(`Le classeur n'a pas pu être ajouté : ${raisonDe(e)}.`)
      if (this.coupe) this.recharger(this.hote.classeur()?.id ?? '', null)
      return
    }
    let g: { texte: string; cle: CleALArrivee | null } = o.cle ? await this.garderCommeCle(fiche, o.cle.poignee, o.cle.accord, lu) : { texte: '', cle: null }
    // Sans la case, dans un niveau rangé (lot 18) : il reçoit son fichier à
    // sa place (un .memc ouvert depuis son propre dossier de chapitre est
    // adopté, pas copié) ; le clic sur « Ajouter » est le geste
    if (!o.cle && this.ranger) {
      let dit = ''
      const c = await this.ranger.donnerSonFichier(fiche, { geste: true, dire: t => { dit += ' ' + t } })
      g = { texte: dit, cle: c ?? null }
    }
    const texte = `Classeur ajouté à la bibliothèque : « ${fiche.nom} » (${pagesLisibles(lu.pages)}).${g.texte}${publications ? ` ${TEXTE_PUBLIEES_COPIE}` : ''}${o.apres ? ` ${o.apres}` : ''}`
    // La clé : ce qu'il en est se dira à l'arrivée, une fois vérifiée là-bas
    if (this.coupe) { this.recharger(fiche.id, texte, g.cle); return }
    await this.biblio.ouvrirClasseur(fiche, { arrivee: texte, ...(g.cle ? { cle: g.cle } : {}) })
    // On est resté (Annuler) : il attend dans la bibliothèque
    if (!this.biblio.enPartance) {
      this.hote.message(`${texte}${g.cle ? ` ${activeePourLui(g.cle.nom)}` : ''} Il est dans la bibliothèque.`)
      void this.biblio.charger()
    }
  }

  /** La case cochée : le fichier ouvert devient celui de la clé de ce
   *  classeur (sa poignée gardée, sa date et son vecteur dans la fiche : il
   *  a l'identité du classeur, le garde-fou passe). Rend ce qu'on dira tout
   *  de suite (texte : ce qui n'a pas marché), et, la clé gardée, ce qu'on
   *  dira d'elle une fois vérifiée (cle : jamais « Il s'enregistre
   *  automatiquement » d'avance, voir EnregistrementCle.direALArrivee). accord
   *  faux : le navigateur l'a refusé dans le geste. */
  private async garderCommeCle(f: FicheClasseur, poignee: PoigneeFichier, accord: boolean, lu: FichierLu): Promise<{ texte: string; cle: CleALArrivee | null }> {
    const pasActive = ' L\'enregistrement automatique n\'est pas activé.'
    if (!accord) return { texte: pasActive, cle: null }
    try { await this.registre.garderPoignee(f.id, poignee) } catch (e) {
      return { texte: (e as { name?: string } | null)?.name === 'DataCloneError' ? `${pasActive} Ce navigateur ne garde pas le fichier après un rechargement.` : pasActive, cle: null }
    }
    try {
      await this.registre.modifierClasseur(f.id, x => { x.cle = { nom: poignee.name, date: lu.entete.date, vecteur: lu.vecteur } })
    } catch {
      await this.registre.oublierPoignee(f.id).catch(() => {})
      return { texte: pasActive, cle: null }
    }
    return { texte: '', cle: { nom: poignee.name } }
  }

  /** « Ouvrir celui de la bibliothèque » : il contient déjà tout le fichier.
   *  Si ce fichier est celui de sa clé (rouvert après un conflit), la clé
   *  reprend : sa date et son vecteur sont ceux du fichier, et la prochaine
   *  écriture le remplacera par ce classeur, qui a tout et plus. */
  private async ouvrirCeluiDeLaBibliotheque(F: FicheClasseur, lu: FichierLu, poignee: PoigneeFichier | undefined, cle: { poignee: PoigneeFichier; accord: boolean } | null) {
    let g: { texte: string; cle: CleALArrivee | null } = { texte: '', cle: null }
    if (F.cle && await this.estLaCle(F, poignee)) {
      await this.registre.modifierClasseur(F.id, x => { if (x.cle) x.cle = { ...x.cle, date: lu.entete.date, vecteur: lu.vecteur } }).catch(() => undefined)
      g = { texte: '', cle: { nom: F.cle.nom, ok: reprend(F.cle.nom) } }
    } else if (cle) g = await this.garderCommeCle(F, cle.poignee, cle.accord, lu)
    const k = this.hote.cle
    if (this.estIci(F)) {
      await k?.resynchroniser()
      if (this.biblio.ouvert) this.biblio.fermer()
      const debut = `« ${F.nom} » est ouvert : il contient déjà tout ce fichier.${g.texte}`
      // La clé vérifiée ici : ce qu'il en est vraiment
      if (g.cle && k) await k.direALArrivee(debut, g.cle)
      else this.hote.message(debut)
      return
    }
    const debut = `« ${F.nom} » contient déjà tout ce fichier.${g.texte}`
    await this.biblio.ouvrirClasseur(F, g.texte || g.cle ? { arrivee: debut, ...(g.cle ? { cle: g.cle } : {}) } : {})
  }

  /** Prévient les onglets ouverts sur ce classeur qu'il change (ils cessent
   *  d'écrire, et le diront) : ouvert ici, par la sauvegarde de cet onglet
   *  (qui ne s'entend pas elle-même) ; sinon par les canaux, celui des
   *  classeurs et, pour le premier, celui d'avant (la version d'avant ne lit
   *  que type) */
  private prevenir(F: FicheClasseur, raisonAilleurs: 'remplace' | 'supprime') {
    if (this.estIci(F) && this.hote.sauvegarde) { this.hote.sauvegarde.prevenir(raisonAilleurs, F.id); return }
    const poster = (nom: string, m: unknown) => {
      try {
        const c = new BroadcastChannel(nom)
        c.postMessage(m)
        setTimeout(() => c.close(), 1000)
      } catch { /* pas de canal : seul onglet */ }
    }
    poster(CANAL_CLASSEUR, { type: raisonAilleurs, base: F.base, id: F.id })
    if (estPremier(F)) poster(CANAL_PREMIER, { type: 'remplace', raison: raisonAilleurs })
  }

  /** La page se recharge sur ce classeur (coupé de sa base, ou changé
   *  depuis un fichier), avec ce qu'on dira en arrivant */
  private recharger(id: string, texte: string | null, cle: CleALArrivee | null = null) {
    if (texte) { try { sessionStorage.setItem(CLE_ARRIVEE, JSON.stringify({ id, message: texte, ...(cle ? { cle } : {}) })) } catch { /* rien au retour */ } }
    this.hote.surveillance?.laisserPartir()
    passerLaConnexion()
    if (id) location.href = urlDuClasseur(location.href, id)
    else location.reload()
  }

  /** Ce classeur est dans un fichier depuis cette date (il en arrive) */
  private noterDepuis(f: FicheClasseur, date: number) {
    if (!dateValable(date)) return
    let avant: number | null = null
    try { avant = lireDernierEnregistrement(localStorage.getItem(cleDernierEnregistrement(f))) } catch { /* rien de gardé */ }
    if (avant === null || date > avant) ecrireCle(cleDernierEnregistrement(f), String(date))
  }

  /** « Mettre à jour le classeur » depuis un fichier plus récent, SANS RIEN
   *  PERDRE :
   *  1) les autres onglets ouverts sur lui cessent d'écrire (sinon le film
   *     ne serait plus dans l'ordre du temps), puis 300 ms ;
   *  2) ouvert ici : ce qui attend s'écrit, les écritures de la base se
   *     finissent, et l'onglet se coupe de sa base (une base trouée se répare
   *     d'abord ; sinon on refuse : la base n'a pas tout) ;
   *  3) le travailleur, en UNE transaction : la base relue, fusionnée, doit
   *     être encore contenue dans le fichier ; alors l'état du fichier y est
   *     ajouté, sans rien effacer ; sinon rien n'est écrit : 'diverge' ;
   *  4) la fiche (reçu, modifié, pages, vecteur ; la clé si ce fichier est
   *     le sien), puis la page se recharge si le classeur était ouvert ici.
   *  Rend 'fait', 'diverge' ou 'echec' (dit). silencieux : un lot (le bilan
   *  dira) ; recharger faux : la page se rechargera à la fin du lot. */
  private async mettreAJour(F: FicheClasseur, lu: FichierLu, o: { poignee?: PoigneeFichier; cle?: { poignee: PoigneeFichier; accord: boolean } | null; absente?: boolean; silencieux?: boolean; recharger?: boolean; texte?: string } = {}): Promise<'fait' | 'diverge' | 'echec'> {
    const app = this.hote.app, sauvegarde = this.hote.sauvegarde
    const ici = this.estIci(F) && !!app && !!sauvegarde
    if (ici && app!.tableau.trou) {
      await app!.tableau.reparer().catch(() => { /* le trou reste : on refuse */ })
      if (app!.tableau.trou) {
        this.hote.message(`« ${F.nom} » n'est pas entièrement enregistré dans ce navigateur : enregistrez-le d'abord dans un fichier (${POUR_ENREGISTRER}), puis ouvrez de nouveau celui-ci.`)
        return 'echec'
      }
    }
    const laCle = await this.estLaCle(F, o.poignee)
    if (!o.silencieux) this.hote.message(`Mise à jour de « ${F.nom} »…`)
    this.prevenir(F, 'remplace')
    await attendre(300)
    if (ici) {
      app!.poserCeQuiAttend()
      app!.piste.vider()
      await app!.tableau.attendreEcritures()
      this.hote.surveillance?.laisserPartir()
      sauvegarde!.couperPourUnFichier()
      this.coupe = true
    }
    let r: { misAJour: boolean; vecteur: Uint8Array }
    try {
      r = await ecrivain.mettreAJour(F.base, lu.etat, lu.vecteur)
    } catch (e) {
      if (e instanceof ErreurEcrivain && e.raison === 'absente') {
        // La fiche n'avait plus sa base : le fichier la recrée (rien n'est perdu, il n'y avait rien)
        try { await creerBase(F.base, lu.etat, { id: F.id, nom: F.nom }); r = { misAJour: true, vecteur: lu.vecteur } } catch (x) { return this.echecMiseAJour(F, x, ici, o) }
      } else return this.echecMiseAJour(F, e, ici, o)
    }
    if (!r.misAJour) return 'diverge'
    const date = dateValable(lu.entete.date) ? lu.entete.date : Date.now()
    await this.registre.modifierClasseur(F.id, x => {
      x.recu = date
      x.modifie = Math.max(x.modifie || 0, date)
      x.pages = lu.pages
      x.vecteur = r.vecteur
      // Le fichier de la clé, rouvert : la clé reprend sur lui (sa date, ce qu'il a)
      if (laCle && x.cle) x.cle = { ...x.cle, date: lu.entete.date, vecteur: lu.vecteur }
    }).catch(() => undefined)
    const g: { texte: string; cle: CleALArrivee | null } = o.cle && !laCle ? await this.garderCommeCle(F, o.cle.poignee, o.cle.accord, lu)
      : laCle && F.cle ? { texte: '', cle: { nom: F.cle.nom, ok: reprend(F.cle.nom) } } : { texte: '', cle: null }
    // Le classeur est maintenant celui du fichier, ni plus ni moins
    this.noterDepuis(F, date)
    const texte = o.texte ?? `« ${F.nom} » mis à jour depuis le fichier (${pagesLisibles(lu.pages)}).${g.texte}`
    if (ici) {
      // La clé : ce qu'il en est se dira à l'arrivée, une fois vérifiée
      if (o.recharger !== false) this.recharger(F.id, texte, g.cle)
      return 'fait'
    }
    if (!o.silencieux) {
      void this.biblio.charger()
      // Il n'est pas ouvert : sa clé est activée, elle écrira quand il le sera
      const suite = g.cle ? ` ${laCle ? `Son enregistrement dans « ${g.cle.nom} » reprendra à son ouverture.` : activeePourLui(g.cle.nom)}` : ''
      this.hote.message(texte + suite, { libelle: 'Ouvrir', faire: () => { void this.registre.classeur(F.id).then(f => { if (f) void this.biblio.ouvrirClasseur(f) }) } })
    }
    return 'fait'
  }

  private echecMiseAJour(F: FicheClasseur, e: unknown, ici: boolean, o: { silencieux?: boolean }): 'echec' {
    const texte = `« ${F.nom} » n'a pas pu être mis à jour : ${raisonDe(e)}. Il n'a pas changé.`
    if (ici) { this.recharger(F.id, texte); return 'echec' }
    if (!o.silencieux) this.hote.message(texte)
    return 'echec'
  }

  /** « Remplacer celui de la bibliothèque… » (chacun a changé de son côté) :
   *  la question du lot 1 (ce qui sera remplacé, « Enregistrer d'abord »),
   *  puis le contenu de sa base remplacé par le fichier d'un bloc (une
   *  transaction : s'il échoue, rien n'a changé). Il garde son identité. Sa
   *  clé : si ce fichier n'est pas le sien, elle est remplacée elle aussi à
   *  sa prochaine écriture (on le dit) ; sa copie sur le Drive aussi. */
  private async remplacerDansLaBibliotheque(F: FicheClasseur, nomFichier: string, lu: FichierLu, poignee?: PoigneeFichier) {
    const app = this.hote.app, sauvegarde = this.hote.sauvegarde
    const ici = this.estIci(F) && !!app && !!sauvegarde
    const laCle = await this.estLaCle(F, poignee)
    const pages = ici ? app!.pages.length : F.pages
    const textes = [`${texteDuFichier(nomFichier, lu.pages, lu.entete.date)} Il remplace le classeur « ${F.nom} » de ce navigateur${pages ? ` (${pagesLisibles(pages)})` : ''} et tout son historique. Pour garder celui-ci, enregistrez-le d'abord.`]
    if (F.cle && !laCle) textes.push(`Son fichier « ${F.cle.nom} » sera remplacé lui aussi.`)
    if (F.drive) textes.push('Sa copie sur le Drive aussi (le Drive garde les versions précédentes).')
    const avant: Bouton = {
      cle: 'enregistrer', libelle: 'Enregistrer d\'abord', classe: 'secondaire',
      faire: async b => {
        b.disabled = true
        const ok = ici ? await sauvegarde!.enregistrer() : await enregistrerDepuisLaBase(F, t => this.hote.message(t))
        if (ok) b.textContent = 'Enregistré ✓'
        else b.disabled = false
      },
    }
    const choix = await fenetre({ titre: 'Ouvrir ce classeur ?', textes, boutons: [ANNULER, avant, { cle: 'remplacer', libelle: 'Remplacer', classe: 'principal danger-plein' }], focus: 'annuler' })
    if (choix.cle !== 'remplacer') { if (this.coupe) this.recharger(F.id, null); return }
    this.hote.message(`Remplacement de « ${F.nom} »…`)
    this.prevenir(F, 'remplace')
    try {
      if (ici) {
        this.hote.cle?.suspendre()
        await attendre(300)
        this.hote.surveillance?.laisserPartir()
        await app!.tableau.remplacerPar(lu.etat)
        app!.oublierVues()
        app!.arreterSession()
        this.coupe = true
      } else {
        await attendre(300)
        await remplacerBase(F.base, lu.etat)
      }
    } catch (e) {
      const texte = `« ${F.nom} » n'a pas pu être remplacé : ${raisonDe(e)}. Il n'a pas changé.`
      if (ici || this.coupe) this.recharger(F.id, texte)
      else this.hote.message(texte)
      return
    }
    const date = dateValable(lu.entete.date) ? lu.entete.date : Date.now()
    await this.registre.modifierClasseur(F.id, x => {
      x.recu = date
      x.modifie = Math.max(x.modifie || 0, Date.now())
      x.pages = lu.pages
      x.vecteur = lu.vecteur
      // La clé et le Drive continuent sur ce contenu : le garde-fou de
      // l'histoire part de lui (et, pour le fichier de la clé lui-même, sa date)
      if (x.cle) x.cle = { ...x.cle, vecteur: lu.vecteur, ...(laCle ? { date: lu.entete.date } : {}) }
      if (x.drive) x.drive = { ...x.drive, vecteur: lu.vecteur }
    }).catch(() => undefined)
    if (dateValable(lu.entete.date)) ecrireCle(cleDernierEnregistrement(F), String(lu.entete.date))
    const texte = `« ${F.nom} » remplacé par le fichier (${pagesLisibles(lu.pages)}).`
    if (ici || this.coupe) { this.recharger(F.id, texte); return }
    void this.biblio.charger()
    this.hote.message(texte, { libelle: 'Ouvrir', faire: () => { void this.registre.classeur(F.id).then(f => { if (f) void this.biblio.ouvrirClasseur(f) }) } })
  }

  // ---------- Plusieurs fichiers ----------
  /** Plusieurs fichiers d'un coup : chacun est lu et reconnu (sans rien
   *  écrire), une fenêtre dit tout (« 4 fichiers : 2 classeurs à ajouter ;
   *  1 déjà dans la bibliothèque… »), puis on ajoute, on met à jour (sans
   *  perte), on ajoute comme copie ce qui a divergé, et un bilan le dit. Un
   *  .memb se laisse de côté : une bibliothèque s'ouvre seule. */
  private async ouvrirPlusieurs(choisis: Choisi[]): Promise<boolean> {
    this.hote.message(`Lecture de ${choisis.length} fichiers…`)
    this.poserIci()
    const prevision: Prevision = { fiches: [], vecteurs: new Map() }
    type Ligne = Prevu & { choisi?: Choisi; fiche?: string }
    const lignes: Ligne[] = []
    for (const c of choisis) {
      const nom = c.fichier.name
      if (await commenceCommeUneArchive(c.fichier)) { lignes.push({ nom, genre: 'bibliotheque' }); continue }
      let lu: FichierLu
      try { lu = await this.lire(c.fichier) } catch (e) {
        lignes.push({ nom, genre: 'illisible', raison: e instanceof ErreurFichier ? raisonCourte(e.message) : 'il ne se lit pas' })
        continue
      }
      const rec = await this.reconnaitre(lu.entete, lu.vecteur, { lot: true, prevision })
      const id = rec.identite
      if (id.genre === 'nouveau' || id.genre === 'corbeille') {
        // Un même classeur deux fois dans le lot : il ne s'ajoute qu'une fois
        prevision.fiches.push({ id: lu.entete.id ?? `prevu-${lignes.length}`, base: '', nom: lu.entete.nom ?? nom, dossier: null, etiquettes: [], cree: 0, modifie: 0, ouvert: 0, pages: lu.pages, vecteur: lu.vecteur })
        lignes.push({ nom, genre: 'ajouter', choisi: c })
        continue
      }
      const d = decisionDe(rec.comparaison ?? 'diverge')
      if (d === 'mettre-a-jour') prevision.vecteurs.set(id.fiche.id, lu.vecteur)
      lignes.push({ nom, genre: d, choisi: c, fiche: id.fiche.id })
    }
    const aFaire = lignes.filter(l => l.choisi && l.genre !== 'rien')
    const choix = await fenetre({
      titre: 'Ouvrir ces fichiers ?',
      textes: [texteAvantPlusieurs(lignes)],
      boutons: aFaire.length ? [ANNULER, { cle: 'ajouter', libelle: 'Ajouter', classe: 'principal' }] : [{ cle: 'annuler', libelle: 'Fermer', classe: 'principal' }],
      focus: aFaire.length ? 'ajouter' : 'annuler',
    })
    // Rien à faire (tout est déjà là) n'est pas renoncer
    if (choix.cle !== 'ajouter') return !aFaire.length
    const bilan = bilanVide()
    for (const l of lignes) if (l.genre === 'illisible') bilan.illisibles.push({ nom: l.nom, raison: l.raison })
    // Celui de cet onglet en dernier : sa mise à jour coupe l'onglet, qui se recharge
    const iciId = this.ici?.id
    aFaire.sort((a, b) => Number(a.fiche === iciId) - Number(b.fiche === iciId))
    const dossier = this.dossierCible()
    let recharger = false
    for (let k = 0; k < aFaire.length; k++) {
      const l = aFaire[k], c = l.choisi!
      this.hote.message(`Ajout des classeurs : ${k + 1} sur ${aFaire.length}…`)
      let lu: FichierLu
      try { lu = await this.lire(c.fichier) } catch (e) { bilan.illisibles.push({ nom: l.nom, raison: e instanceof ErreurFichier ? raisonCourte(e.message) : 'il ne se lit pas' }); continue }
      try {
        // Reconnu de nouveau, sur la bibliothèque telle qu'elle est maintenant
        const rec = await this.reconnaitre(lu.entete, lu.vecteur, { lot: true })
        const id = rec.identite
        if (id.genre === 'nouveau' || id.genre === 'corbeille') {
          const a = await this.ajouter(c.fichier.name, lu, { neuf: id.genre === 'corbeille', dossier })
          bilan.ajoutes++
          if (a.publications) bilan.publiees = (bilan.publiees ?? 0) + 1
          continue
        }
        const d = decisionDe(rec.comparaison ?? 'diverge')
        if (d === 'rien') continue
        if (d === 'mettre-a-jour') {
          const r = await this.mettreAJour(id.fiche, lu, { absente: rec.absente, silencieux: true, recharger: false })
          if (r === 'fait') { bilan.misAJour++; if (this.coupe) recharger = true; continue }
          if (r === 'echec') { bilan.illisibles.push({ nom: l.nom, raison: 'la mise à jour a échoué' }); continue }
        }
        const a = await this.ajouter(c.fichier.name, lu, { copie: true, de: id.fiche, dossier })
        bilan.copies++
        if (a.publications) bilan.publiees = (bilan.publiees ?? 0) + 1
      } catch (e) {
        if (estPlace(e)) { bilan.manques.push(...aFaire.slice(k).map(x => x.nom)); break }
        bilan.illisibles.push({ nom: l.nom, raison: raisonDe(e) })
      }
    }
    const texte = texteApresPlusieurs(bilan)
    if (recharger || this.coupe) { this.recharger(this.hote.classeur()?.id ?? '', texte); return true }
    void this.biblio.charger()
    this.hote.message(texte, this.biblio.ouvert || !this.hote.voirLaBibliotheque ? undefined : { libelle: 'Voir la bibliothèque', faire: () => this.hote.voirLaBibliotheque?.() })
    return true
  }

  // ---------- Toute la bibliothèque ----------
  /** « Enregistrer toute la bibliothèque… » : un seul fichier .memb (voir
   *  archive.ts), avec tous les classeurs visibles (sans la corbeille), les
   *  dossiers et les aperçus. Le choix du fichier s'ouvre dans le clic
   *  (showSaveFilePicker ; ailleurs, un téléchargement). Puis, au fil de
   *  l'eau (createWritable : un classeur à la fois en mémoire ; sinon un
   *  Blob) : l'index, chaque .memc fabriqué par l'écrivain depuis sa base,
   *  hors du fil principal (« Bibliothèque : classeur 3 sur 12… »), les
   *  aperçus, le répertoire. Un échec en route : abort, le fichier d'avant
   *  reste entier, et on le dit. Chaque classeur est ensuite dans un fichier
   *  depuis cette date.
   *  Lot 7 : classe, seulement les classeurs de ce dossier de niveau (et de
   *  ses sous-dossiers), le niveau à la racine du fichier (« 5ème 2026-10-17
   *  14h05.memb ») ; rendre, le fichier fini passe à rendre (l'envoi sur le
   *  Drive) au lieu d'être écrit ou téléchargé (ou : où il est allé). */
  async enregistrerLaBibliotheque(o: { classe?: string; rendre?: (fichier: Blob, nom: string) => Promise<string> } = {}): Promise<boolean> {
    if (this.enCours) { this.hote.message('Un fichier est déjà en cours.'); return false }
    const reg = this.registre
    const date = Date.now()
    const laClasse = o.classe ? await reg.dossier(o.classe).catch(() => undefined) : undefined
    if (o.classe && !laClasse) { this.hote.message('Ce dossier n\'est plus dans la bibliothèque.'); return false }
    const nom = laClasse ? nomBibliotheque(date).replace(/^Bibliothèque/, nomSur(laClasse.nom, { repli: 'Niveau' })) : nomBibliotheque(date)
    const quoi = laClasse ? `« ${laClasse.nom} »` : 'Bibliothèque'
    // Le choix du fichier d'abord : le geste ne le permet que quelques secondes
    interface Ecriture { write(d: Blob | Uint8Array): Promise<void>; close(): Promise<void>; abort?(): Promise<void> }
    let choisi: { name: string; createWritable(): Promise<Ecriture> } | null = null
    const choisir = (window as unknown as { showSaveFilePicker?: (o: unknown) => Promise<{ name: string; createWritable(): Promise<Ecriture> }> }).showSaveFilePicker
    if (typeof choisir === 'function' && !o.rendre) {
      try { choisi = await choisir.call(window, { suggestedName: nom, id: ID_CHOIX, types: TYPES_BIBLIOTHEQUE }) } catch (e) {
        if ((e as { name?: string } | null)?.name === 'AbortError') return false
        choisi = null
      }
    }
    this.enCours = true
    let sortie: Ecriture | null = null
    try {
      const [fiches, dossiers, apercus] = await Promise.all([reg.classeurs(), reg.dossiers(), reg.apercus().catch(() => new Map<string, Blob>())])
      // Les classeurs visibles qui ont encore leur base (le premier : toujours) ;
      // ceux du niveau seulement (lot 7)
      const dansLaClasse = laClasse ? new Set([laClasse.id, ...descendants(laClasse.id, dossiers).map(d => d.id)]) : null
      const tous = fiches.filter(f => visible(f, dossiers) && (!dansLaClasse || (f.dossier !== null && dansLaClasse.has(f.dossier))))
        .sort((a, b) => cleDe(a.nom) < cleDe(b.nom) ? -1 : 1)
      const classeurs: FicheClasseur[] = []
      for (const f of tous) if (estPremier(f) || this.estIci(f) || await compterEntrees(f.base).catch(() => 1) > 0) classeurs.push(f)
      if (!classeurs.length) { this.hote.message(laClasse ? `${quoi} n'a aucun classeur : il n'y a rien à enregistrer.` : 'La bibliothèque est vide : il n\'y a rien à enregistrer.'); return false }
      const gardes = dossiers.filter(d => dossierVisible(d, dossiers) && (!dansLaClasse || dansLaClasse.has(d.id)))
        .map(d => d.id === laClasse?.id ? { ...d, parent: null } : d)
      this.hote.message(`${quoi} : classeur 1 sur ${classeurs.length}…`)
      await uneImage()
      // Le classeur de cet onglet : ce qui attend s'écrit d'abord
      const app = this.hote.app
      if (app && this.ici && classeurs.some(f => this.estIci(f))) {
        app.poserCeQuiAttend()
        app.piste.vider()
        await app.tableau.attendreEcritures()
        if (app.tableau.trou) await app.tableau.reparer().catch(() => { /* depuis la mémoire, plus bas */ })
      }
      const z = new EcrivainArchive(date)
      const morceaux: (Blob | Uint8Array)[] = []
      sortie = choisi ? await choisi.createWritable() : null
      let total = 0
      const ecrire = async (m: Blob | Uint8Array) => {
        total += m instanceof Blob ? m.size : m.length
        if (sortie) await sortie.write(m); else morceaux.push(m)
      }
      const json = new TextEncoder().encode(JSON.stringify(indexDe(classeurs, gardes, date, id => apercus.has(id))))
      await ecrire(z.entree(NOM_INDEX, crc32(json), json.length))
      await ecrire(json)
      const manques: string[] = []
      const absents = new Set<string>()
      /** Ceux qui n'y sont qu'en partie : ce qui s'en relit (une base trouée relue) */
      const enPartie: string[] = []
      for (let k = 0; k < classeurs.length; k++) {
        const f = classeurs[k]
        if (k) this.hote.message(`${quoi} : classeur ${k + 1} sur ${classeurs.length}…`)
        let fab: { fichier: Blob; crc: number; incomplet?: boolean }
        try {
          if (this.estIci(f) && app?.tableau.trou) throw new ErreurEcrivain('abimee', 'trou')
          // Le classeur de cet onglet : ce qui se relit seulement si sa
          // mémoire n'a pas plus (Tableau.incomplet) ; un autre : sa base
          // seule le garde, ce qui s'en relit vaut mieux que rien (et se dit)
          fab = await fabriquerFichier(f.base, { nom: f.nom, id: f.id }, date, { lisible: this.estIci(f) && app ? app.tableau.incomplet : true })
        } catch (e) {
          if (this.estIci(f) && app) {
            // La base trouée : depuis la mémoire de l'onglet, qui a tout (ce
            // qui s'en relit : jamais un classeur qu'on ne pourrait pas rouvrir)
            try {
              const l = ecrireLisible(app.tableau.doc, date, { nom: f.nom, id: f.id })
              fab = { fichier: l.fichier, crc: crc32(new Uint8Array(await l.fichier.arrayBuffer())), incomplet: l.incomplet }
            } catch (x) { manques.push(`« ${f.nom} » (${raisonDe(x)})`); absents.add(f.id); continue }
          } else { manques.push(`« ${f.nom} » (${raisonDe(e)})`); absents.add(f.id); continue }
        }
        if (fab.incomplet) enPartie.push(`« ${f.nom} »`)
        await ecrire(z.entree(cheminClasseur(f.id), fab.crc, fab.fichier.size))
        await ecrire(fab.fichier)
      }
      for (const f of classeurs) {
        const image = apercus.get(f.id)
        if (!image) continue
        const o = new Uint8Array(await image.arrayBuffer())
        await ecrire(z.entree(cheminApercu(f.id), crc32(o), o.length))
        await ecrire(o)
      }
      await ecrire(z.fin())
      let ou = choisi?.name || nom
      if (sortie) { await sortie.close(); sortie = null }
      else if (o.rendre) ou = await o.rendre(new Blob(morceaux as BlobPart[], { type: 'application/octet-stream' }), nom)
      else telecharger(new Blob(morceaux as BlobPart[], { type: 'application/octet-stream' }), nom)
      // Chaque classeur est dans un fichier depuis cette date
      for (const f of classeurs) {
        if (absents.has(f.id)) continue
        if (this.estIci(f) && this.hote.sauvegarde) this.hote.sauvegarde.noterFichier(date)
        else ecrireCle(cleDernierEnregistrement(f), String(date))
      }
      const n = classeurs.length - manques.length
      const partie = enPartie.length ? ` ${enPartie.length > 1 ? `Ceux-ci n'y sont qu'en partie : ${enPartie.join(', ')} (une partie ne se relit plus dans ce navigateur).` : `${enPartie[0]} n'y est qu'en partie (une partie ne se relit plus dans ce navigateur).`}` : ''
      this.hote.message(`${laClasse ? `${quoi} enregistré` : 'Bibliothèque enregistrée'} : ${ou} (${n} classeur${n > 1 ? 's' : ''}, ${tailleLisible(total)}).${manques.length ? ` ${manques.length > 1 ? 'Ceux-ci n\'ont' : 'Celui-ci n\'a'} pas pu y être mis : ${manques.join(', ')}.` : ''}${partie}`)
      return true
    } catch (e) {
      try { await sortie?.abort?.() } catch { /* déjà fermé */ }
      this.hote.message(`${laClasse ? `${quoi} n'a pas pu être enregistré` : 'La bibliothèque n\'a pas pu être enregistrée'} : ${e instanceof ErreurArchive ? e.message.replace(/\.$/, '') : raisonDe(e)}.`)
      return false
    } finally { this.enCours = false }
  }

  /** Ouvrir une bibliothèque (.memb) : lue par son répertoire central (rien
   *  n'est balayé), son index d'abord ; chaque classeur lu et vérifié par le
   *  travailleur (sa tranche, sa somme) et comparé à ce qui est ici
   *  (« Comparaison… 2 sur 3 ») ; une fenêtre dit ce qui existe déjà (pas
   *  touché) et ce qui s'ajoute ; la case, décochée, met aussi à jour les
   *  classeurs plus récents dans le fichier (sans perte). Puis les dossiers
   *  (réunis à ceux d'ici), les classeurs dans leurs dossiers, avec leurs
   *  étiquettes et leurs aperçus ; ce qui a divergé, comme copie. Plus de
   *  place en route : ce qui est fait reste, ce qui manque est dit. */
  private async ouvrirLaBibliotheque(fichier: File) {
    const lire = (d: number, f: number) => fichier.slice(d, f).arrayBuffer().then(b => new Uint8Array(b))
    let entrees: EntreeArchive[], tronquee: boolean
    try { ({ entrees, tronquee } = await lireArchive(lire, fichier.size)) } catch (e) {
      this.hote.message(e instanceof ErreurArchive ? e.message : ABIMEE)
      return
    }
    const parNom = new Map(entrees.map(e => [e.nom, e]))
    const ei = parNom.get(NOM_INDEX)
    const oi = ei ? await lireEntree(lire, ei) : null
    if (!oi) { this.hote.message(ei || tronquee ? ABIMEE : PAS_UNE_BIBLIOTHEQUE); return }
    let index: ReturnType<typeof lireIndex>
    try { index = lireIndex(oi) } catch (e) { this.hote.message(e instanceof ErreurArchive ? e.message : ABIMEE); return }
    this.poserIci()
    type Ligne = { c: ClasseurArchive; nom: string; entree?: EntreeArchive; genre: 'ajouter' | 'rien' | 'mettre-a-jour' | 'copie' | 'illisible'; raison?: string; fiche?: string; neuf?: boolean }
    const lignes: Ligne[] = []
    const prevision: Prevision = { fiches: [], vecteurs: new Map() }
    const n = index.classeurs.length
    for (let k = 0; k < n; k++) {
      const c = index.classeurs[k]
      const nom = nomDeClasseur(c.nom) ?? 'Classeur'
      if (n > 1) this.hote.message(`Comparaison… ${k + 1} sur ${n}`)
      const e = parNom.get(c.fichier)
      if (!e) { lignes.push({ c, nom, genre: 'illisible', raison: tronquee ? 'il manque au fichier, qui est incomplet' : 'il manque au fichier' }); continue }
      if (e.methode !== 0) { lignes.push({ c, nom, genre: 'illisible', raison: 'il a été compressé par un autre logiciel' }); continue }
      let lu: FichierLu
      try { lu = await this.lire(fichier.slice(e.debut, e.debut + e.tailleArchive), e.crc) } catch (x) {
        lignes.push({ c, nom, genre: 'illisible', raison: x instanceof ErreurFichier ? raisonCourte(x.message) : 'il ne se lit pas' })
        continue
      }
      const entete = { ...lu.entete, ...(lu.entete.id ? {} : ID_VALABLE.test(c.id) ? { id: c.id } : {}) }
      const rec = await this.reconnaitre(entete, lu.vecteur, { lot: true, prevision })
      const id = rec.identite
      if (id.genre === 'nouveau' || id.genre === 'corbeille') {
        prevision.fiches.push({ id: entete.id ?? `prevu-${k}`, base: '', nom, dossier: null, etiquettes: [], cree: 0, modifie: 0, ouvert: 0, pages: lu.pages, vecteur: lu.vecteur })
        lignes.push({ c, nom, entree: e, genre: 'ajouter', neuf: id.genre === 'corbeille' })
        continue
      }
      const d = decisionDe(rec.comparaison ?? 'diverge')
      if (d === 'mettre-a-jour') prevision.vecteurs.set(id.fiche.id, lu.vecteur)
      lignes.push({ c, nom, entree: e, genre: d, fiche: id.fiche.id })
    }
    const plusRecents = lignes.filter(l => l.genre === 'mettre-a-jour')
    const copies = lignes.filter(l => l.genre === 'copie').map(l => l.nom)
    const illisibles = lignes.filter(l => l.genre === 'illisible').map(l => ({ nom: l.nom, raison: l.raison ?? '' }))
    const aAjouter = lignes.filter(l => l.genre === 'ajouter' || l.genre === 'copie').length
    const deja = lignes.filter(l => l.genre === 'rien' || l.genre === 'mettre-a-jour').length
    const texte = texteAvantBibliotheque({ nomFichier: fichier.name, classeurs: n, dossiers: index.dossiers.length, date: index.date, deja, aAjouter, copies, illisibles })
    const r = this.refusMaintenant()
    if (r) { this.hote.message(r); return }
    // Rien à ajouter, rien de plus récent, aucun dossier à créer : la fenêtre ne fait que le dire
    const dossiersNeufs = planDesDossiers(await this.registre.dossiers(), index.dossiers, { idNeuf: idClasseur, maintenant: Date.now() }).aCreer.length
    const utile = aAjouter > 0 || plusRecents.length > 0 || dossiersNeufs > 0
    const choix = await fenetre({
      titre: 'Ouvrir cette bibliothèque ?', textes: [texte],
      caseACocher: plusRecents.length ? { texte: texteCasePlusRecents(plusRecents.length), coche: false, nom: 'case-plus-recents' } : null,
      boutons: utile ? [ANNULER, { cle: 'ajouter', libelle: 'Ajouter', classe: 'principal' }] : [{ cle: 'annuler', libelle: 'Fermer', classe: 'principal' }],
      focus: utile ? 'ajouter' : 'annuler',
    })
    if (choix.cle !== 'ajouter') return
    const bilan: Bilan = bilanVide()
    bilan.illisibles.push(...illisibles)
    const reg = this.registre
    // Les dossiers d'abord (réunis à ceux d'ici), parents avant enfants
    const plan = planDesDossiers(await reg.dossiers(), index.dossiers, { idNeuf: idClasseur, maintenant: Date.now() })
    for (const d of plan.aCreer) {
      try { await reg.ajouterDossier(d) } catch (e) {
        // Un dossier qui manque : ses classeurs vont à la racine
        for (const [k, v] of plan.correspondance) if (v === d.id) plan.correspondance.delete(k)
        if (estPlace(e)) break
      }
    }
    const faire = lignes.filter(l => l.genre === 'ajouter' || l.genre === 'copie' || (l.genre === 'mettre-a-jour' && choix.coche))
    const iciId = this.ici?.id
    faire.sort((a, b) => Number(a.fiche === iciId) - Number(b.fiche === iciId))
    let recharger = false
    for (let k = 0; k < faire.length; k++) {
      const l = faire[k], e = l.entree!
      this.hote.message(`Bibliothèque : ajout ${k + 1} sur ${faire.length}…`)
      let lu: FichierLu
      try { lu = await this.lire(fichier.slice(e.debut, e.debut + e.tailleArchive), e.crc) } catch (x) {
        bilan.illisibles.push({ nom: l.nom, raison: x instanceof ErreurFichier ? raisonCourte(x.message) : 'il ne se lit pas' })
        continue
      }
      if (!lu.entete.id && ID_VALABLE.test(l.c.id)) lu = { ...lu, entete: { ...lu.entete, id: l.c.id } }
      const dossier = l.c.dossier ? plan.correspondance.get(l.c.dossier) ?? null : null
      const etiquettes: string[] = []
      for (const x of l.c.etiquettes) { const t = nomDEtiquette(x); if (t && etiquettes.length < ETIQUETTES_MAX && !etiquettes.some(y => cleDe(y) === cleDe(t))) etiquettes.push(t) }
      try {
        let fiche: FicheClasseur | null = null
        if (l.genre === 'mettre-a-jour') {
          const rec = await this.reconnaitre(lu.entete, lu.vecteur, { lot: true })
          const id = rec.identite
          if ((id.genre === 'meme' || id.genre === 'ressemble') && decisionDe(rec.comparaison ?? 'diverge') !== 'copie') {
            if (decisionDe(rec.comparaison ?? 'diverge') === 'rien') continue
            const r = await this.mettreAJour(id.fiche, lu, { absente: rec.absente, silencieux: true, recharger: false })
            if (r === 'fait') { bilan.misAJour++; if (this.coupe) recharger = true; continue }
            if (r === 'echec') { bilan.illisibles.push({ nom: l.nom, raison: 'la mise à jour a échoué' }); continue }
          }
          // Chacun a changé de son côté entre-temps : comme copie
          const a = await this.ajouter(l.nom, lu, { copie: true, nom: l.nom, dossier, etiquettes })
          fiche = a.fiche
          bilan.copies++
          if (a.publications) bilan.publiees = (bilan.publiees ?? 0) + 1
        } else {
          const a = await this.ajouter(l.nom, lu, { copie: l.genre === 'copie', neuf: l.neuf, nom: l.nom, dossier, etiquettes, cree: l.c.cree, modifie: l.c.modifie })
          fiche = a.fiche
          if (l.genre === 'copie') bilan.copies++
          else bilan.ajoutes++
          if (a.publications) bilan.publiees = (bilan.publiees ?? 0) + 1
        }
        // Son aperçu (vérifié par sa somme), s'il en a un
        const ea = l.c.apercu ? parNom.get(l.c.apercu) : undefined
        const image = ea ? await lireEntree(lire, ea).catch(() => null) : null
        if (fiche && image) await reg.ecrireApercu(fiche.id, new Blob([image as BlobPart], { type: 'image/png' }))
      } catch (x) {
        if (estPlace(x)) { bilan.manques.push(...faire.slice(k).map(y => y.nom)); break }
        bilan.illisibles.push({ nom: l.nom, raison: raisonDe(x) })
      }
    }
    const fin = texteApresBibliotheque(bilan)
    if (recharger || this.coupe) { this.recharger(this.hote.classeur()?.id ?? '', fin); return }
    void this.biblio.charger()
    this.hote.message(fin, this.biblio.ouvert || !this.hote.voirLaBibliotheque ? undefined : { libelle: 'Voir la bibliothèque', faire: () => this.hote.voirLaBibliotheque?.() })
  }

  // ---------- Le fichier de la clé ----------
  /** [Ouvrir le fichier de la clé] (un conflit de la clé, C4) : ce fichier,
   *  par le même chemin qu'« Ouvrir un classeur » (reconnu, comparé, mis à
   *  jour sans perte ; s'il est le même classeur, la clé reprend sur lui).
   *  L'accord pour le lire est demandé dans le clic s'il le faut. */
  async ouvrirLeFichierDeLaCle(): Promise<void> {
    const p = this.hote.cle?.fichierDeLaCle
    if (!p) return
    if (await permission(p, false) !== 'granted' && await permission(p, true) !== 'granted') {
      this.hote.message(`Le navigateur n'a pas permis de lire « ${p.name} ».`)
      return
    }
    let f: File
    try { f = await p.getFile() } catch (e) {
      const r = raisonCle(e)
      this.hote.message(`« ${p.name} » n'a pas pu être lu : ${r.genre === 'permission' ? 'le navigateur ne l\'a pas permis' : r.message}.`)
      return
    }
    await this.ouvrir([{ fichier: f, poignee: p }])
  }
}

