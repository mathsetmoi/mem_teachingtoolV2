// =============================================================
// OÙ RANGER LES CLASSEURS D'UN NIVEAU (lot 18)
// Un classeur = un fichier .memc à un seul endroit, écrit tout seul. La fenêtre
// « Où ranger les classeurs de « 2nde » ? » le demande une fois par niveau :
// - dans quel dossier : un ÉTABLISSEMENT déjà choisi (etablissements.ts :
//   « LFB classeurs », « MEM classeurs »…), « Choisir un dossier… » (la
//   première fois), ou « Un autre dossier, pour ce niveau seul… » (une clé
//   USB : le lot 7 tel quel, sans établissement) ;
// - le nom du dossier du niveau dans l'établissement (proposé : le nom du
//   dossier de la bibliothèque, « 2nde » ; le professeur tape « 2 »).
// « Ranger » crée le dossier du niveau, en fait l'emplacement du niveau
// (emplacements.ts, genre 'ordinateur', avec l'id de l'établissement), et y
// écrit chaque classeur du niveau dans son dossier (ordinateur.ts,
// relierLesClasseurs : « LFB classeurs › 2 › 2_13_Probas › 2_13_Probas.memc »),
// avec tous les garde-fous : jamais un fichier plus riche remplacé, jamais
// une permission demandée hors d'un geste. « Plus tard » : la fenêtre ne
// revient plus d'elle-même pour ce niveau (le réglage 'ranger-plus-tard').
// Elle paraît au premier « Nouveau classeur » dans un niveau pas encore rangé,
// depuis « Mes emplacements » (« Ranger… », « Changer… ») et, par le menu ⋯
// du classeur, « Ranger « 2nde » dans un dossier… » (morceau C). Jamais sur
// l'iPad, Firefox ou Safari (pas de showDirectoryPicker), ni quand
// l'écrivain tourne sur le fil principal.
// Ensuite, chaque classeur qui arrive dans un niveau rangé reçoit son fichier
// à sa place (donnerSonFichier) : créé, ajouté depuis un fichier, remis de
// la corbeille, « Séances isolées » ; et celui qui n'en a pas encore (rangé
// avant que son niveau le soit) le reçoit par « Lui donner son fichier »
// (le menu ⋯, le bandeau ; rangementPour dit à l'état où il irait).
// =============================================================
import type { ActionMessage } from '../app'
import type { Bibliotheque } from './bibliotheque'
import type { FicheClasseur, FicheDossier, InfosClasseur } from './demarrage'
import type { Registre } from './registre'
import type { CleALArrivee, PoigneeFichier } from './cle'
import { permission } from './cle'
import type { Rangement } from './etat'
import type { Emplacement } from './emplacements'
import { classeursDeLaClasse, emplacementDe, emplacements, garderEmplacement, reglagePoignee, sousDossiers } from './emplacements'
import type { BilanRelier, PoigneeDossier } from './ordinateur'
import { accordDeLire, accordDuDossier, choisirUnDossier, choisitUnDossier, relierLesClasseurs } from './ordinateur'
import type { Etablissement } from './etablissements'
import { cheminLisible, etablissements, nomDEtablissement, garderEtablissement, noterPlusTard, nouvelId, plusTard, reglagePoigneeEtablissement, texteDuRangement } from './etablissements'
import { ecrivain } from './ecrivain'
import { dossierVisible, remontee } from './arbre'
import { EXTENSION_TABLEAU, nomSur } from '../fichier'
import { fermerSurLeFond } from '../dialogue'
import { POUR_OUVRIR } from '../navigateur'

/** Ce que la fenêtre demande à qui l'ouvre (main.ts) */
export interface HoteRanger {
  registre: Registre
  bibliotheque: Bibliotheque
  message(texte: string, action?: ActionMessage | ActionMessage[]): void
  /** Avant de fabriquer le fichier d'un classeur depuis sa base : celui de
   *  cet onglet écrit d'abord ce qui attend */
  avantDEcrire?: (f: FicheClasseur) => Promise<void>
  /** Après que des classeurs (ids) ont reçu ou changé de fichier par ici,
   *  même si rien n'a marché : la clé du classeur de cet onglet, s'il en
   *  est, repart depuis sa fiche (EnregistrementCle.relacher) */
  apresRangement?: (ids: readonly string[]) => Promise<void>
  /** Le classeur ouvert dans cet onglet ; null : la bibliothèque seule */
  classeur(): InfosClasseur | null
}

/** D'où vient la fenêtre : « Nouveau classeur » (« Plus tard » s'en souvient),
 *  « Mes emplacements », le menu ⋯ */
export type OrigineRanger = 'nouveau' | 'emplacements' | 'menu'

/** L'endroit d'un niveau rangé : son emplacement, son établissement (s'il
 *  existe encore), les dossiers jusqu'au dossier du niveau compris
 *  (« LFB classeurs », « 2 », ou « Clé 4ème » seul) et les sous-dossiers
 *  entre le niveau et le dossier du classeur */
export interface Endroit { emplacement: Emplacement; etablissement: Etablissement | null; prefixe: string[]; sous: string[] }

/** Le conseil quand le navigateur vient de demander l'accord d'écrire dans
 *  le dossier de l'établissement (Chrome le propose) */
export const CONSEIL_ACCORD_DOSSIER = 'Dans la demande du navigateur, choisissez « Autoriser à chaque visite » s\'il le propose : il ne la refera plus chaque matin.'

const raisonDe = (e: unknown) => (e instanceof Error ? e.message.trim().replace(/\.$/, '') : '') || 'erreur inconnue'
const nomErreur = (e: unknown) => (e as { name?: string } | null)?.name

/** Le même dossier ? (isSameEntry ; sans lui, on ne sait pas : non) */
async function memeDossier(a: PoigneeDossier, b: unknown): Promise<boolean> {
  try { return typeof a.isSameEntry === 'function' && !!b && await a.isSameEntry(b) } catch { return false }
}

/** Une poignée de dossier relue de l'index, ou rien (un navigateur qui ne
 *  l'a pas gardée, un réglage d'une autre forme) */
const poigneeValable = (x: unknown): PoigneeDossier | null =>
  x && typeof (x as PoigneeDossier).getDirectoryHandle === 'function' ? x as PoigneeDossier : null

/** Relie le niveau `classe` au dossier `d` (l'accord d'écrire déjà demandé
 *  dans le clic) : l'emplacement noté (il remplace celui que le niveau avait
 *  sur l'ordinateur, dont la poignée s'en va ; les fichiers d'avant restent où
 *  ils sont), puis chaque classeur du niveau dans son fichier
 *  (relierLesClasseurs, avec ses garde-fous). L'implémentation unique du
 *  lien d'un niveau : la fenêtre « Où ranger… », « Enregistrer ce dossier… »
 *  du lot 7 et « Mettre à jour » passent par ici. prefixe : les dossiers
 *  au-dessus de `d` (« LFB classeurs », pour le chemin noté dans la fiche) ;
 *  etablissement : l'id de l'établissement du dossier. Rend le bilan ; null
 *  si rien n'a pu se faire (dit par message). */
export async function relierLeNiveau(h: { registre: Registre; message(texte: string): void; avantDEcrire?: (f: FicheClasseur) => Promise<void> },
  classe: FicheDossier, d: PoigneeDossier, o: { prefixe?: string[]; etablissement?: string; etablissementNom?: string; reprendre?: boolean; ancien?: PoigneeDossier } = {}): Promise<BilanRelier | null> {
  if (!await accordDuDossier(d, false).catch(() => false)) {
    h.message(`Le navigateur n'a pas permis d'écrire dans « ${d.name} ». Recommencez et cliquez « Autoriser ».`)
    return null
  }
  const deja = (await emplacements(h.registre)).find(e => e.dossier === classe.id && e.genre === 'ordinateur')
  // Rangé chez un établissement : son id et son nom (le nom reste à l'écran
  // et dans le chemin des fichiers si l'établissement est retiré de la liste)
  const etab = o.etablissement ? { etablissement: o.etablissement, ...(o.etablissementNom ? { etablissementNom: o.etablissementNom } : {}) } : {}
  const e: Emplacement = { id: deja?.id ?? nouvelId(), genre: 'ordinateur', dossier: classe.id, nom: d.name, cree: deja?.cree ?? Date.now(), ...etab }
  try { await h.registre.ecrireReglage(reglagePoignee(e.id), d) } catch {
    h.message('Ce navigateur ne peut pas garder le dossier : enregistrez plutôt le niveau dans un fichier.')
    return null
  }
  await garderEmplacement(h.registre, e)
  const prefixe = o.prefixe ?? [d.name]
  return relierLesClasseurs(h.registre, d, classe.id, {
    prefixe,
    reprendre: o.reprendre,
    ancien: o.ancien,
    avantDEcrire: h.avantDEcrire,
    progres: (n, total) => h.message(`« ${classe.nom} » : classeur ${n} sur ${total}…`),
  })
}

export class Ranger {
  /** Un rangement en cours (une seule fenêtre, un seul lien à la fois) */
  private occupe = false

  constructor(private h: HoteRanger) {}

  private get registre() { return this.h.registre }

  /** Ce navigateur sait ranger : il choisit un dossier et y écrit (Chrome,
   *  Edge), et l'écrivain ne tourne pas sur le fil principal (le même esprit
   *  que la case de la clé de « Nouveau classeur ») */
  peutRanger(): boolean { return choisitUnDossier() && ecrivain.mode !== 'fil' }

  /** Le niveau d'un dossier : son dossier le plus haut, s'il se montre
   *  encore (ni supprimé ni dans la corbeille) ; null sinon */
  async niveauDe(dossierId: string | null): Promise<FicheDossier | null> {
    if (dossierId === null) return null
    const dossiers = await this.registre.dossiers().catch(() => [] as FicheDossier[])
    const chaine = remontee(dossierId, dossiers)
    const haut = chaine[chaine.length - 1]
    return haut && dossierVisible(haut, dossiers) ? haut : null
  }

  /** Le niveau à proposer de ranger avant de créer un classeur dans ce
   *  dossier : il n'a pas d'emplacement sur l'ordinateur, on n'a pas dit
   *  « Plus tard » pour lui, et ce navigateur sait ranger ; null sinon (un
   *  classeur à la racine : jamais) */
  async aProposerPour(dossierId: string | null): Promise<FicheDossier | null> {
    if (!this.peutRanger()) return null
    const niveau = await this.niveauDe(dossierId)
    if (!niveau) return null
    const [liste, tard] = await Promise.all([emplacements(this.registre), plusTard(this.registre)])
    if (liste.some(e => e.genre === 'ordinateur' && e.dossier === niveau.id)) return null
    if (tard.includes(niveau.id)) return null
    return niveau
  }

  /** L'endroit où va le fichier d'un classeur rangé dans ce dossier : son
   *  niveau est-il rangé, et où (voir Endroit) ; null : il ne l'est pas (ou
   *  le classeur est à la racine). Sans relire la poignée du dossier : ce
   *  que l'index en sait suffit pour l'écran. */
  async endroitDe(dossierId: string | null): Promise<Endroit | null> {
    if (dossierId === null) return null
    const [liste, dossiers] = await Promise.all([emplacements(this.registre), this.registre.dossiers()])
    const e = emplacementDe(dossierId, 'ordinateur', liste, dossiers)
    if (!e) return null
    const liste2 = e.etablissement ? await etablissements(this.registre) : []
    const etab = liste2.find(x => x.id === e.etablissement) ?? null
    const nomEtab = nomDEtablissement(e, liste2)
    return { emplacement: e, etablissement: etab, prefixe: nomEtab ? [nomEtab, e.nom] : [e.nom], sous: sousDossiers(dossierId, e.dossier, dossiers) }
  }

  /** Le chemin, pour l'écran, du fichier d'un classeur nommé `nom` à cet
   *  endroit : « LFB classeurs › 2nde › Fractions » (le dossier du chapitre) */
  cheminDuChapitre(endroit: Endroit, nom: string): string {
    return cheminLisible([...endroit.prefixe, ...endroit.sous.map(n => nomSur(n, { repli: 'Dossier' })), nomSur(nom)])
  }

  /** Ce que l'état du classeur ouvert dit de son rangement (morceau C, voir
   *  EtatSauvegarde.cle.rangeDans et rangeable) : null quand il a son
   *  fichier, qu'il est à la racine, ou que ce navigateur ne range pas ;
   *  rangeDans quand son niveau est rangé (le dossier qui recevra le dossier
   *  du chapitre : « LFB classeurs › 2 ») ; rangeable (le nom du niveau)
   *  quand il reste à ranger, même après « Plus tard » (le menu ⋯ le
   *  propose, sans fenêtre d'elle-même). */
  async rangementPour(f: FicheClasseur): Promise<Rangement | null> {
    if (f.cle || !this.peutRanger()) return null
    const niveau = await this.niveauDe(f.dossier)
    if (!niveau) return null
    const endroit = await this.endroitDe(f.dossier).catch(() => null)
    if (endroit) return { rangeDans: cheminLisible([...endroit.prefixe, ...endroit.sous.map(n => nomSur(n, { repli: 'Dossier' }))]) }
    return { rangeable: { niveau: niveau.nom } }
  }

  /** « Lui donner son fichier » (le menu ⋯, le bandeau, morceau C) : le
   *  classeur de cet onglet reçoit son fichier dans le dossier de son niveau,
   *  déjà rangé (donnerSonFichier, dans le clic : l'accord du navigateur
   *  peut être demandé). Rend ce que l'arrivée en dirait (le fichier écrit,
   *  ou adopté), ou null (ce qui n'a pas marché est dit par message) ;
   *  main.ts fait alors démarrer la clé de l'onglet sur ce fichier. */
  async donnerSonFichierAuClasseurOuvert(): Promise<CleALArrivee | null> {
    const ici = this.h.classeur()
    if (!ici) return null
    const f = await this.registre.classeur(ici.id).catch(() => undefined)
    if (!f) { this.h.message('Ce classeur n\'est plus dans la bibliothèque.'); return null }
    if (f.cle) { this.h.message(`« ${f.nom} » a déjà son fichier.`); return null }
    if (!await this.endroitDe(f.dossier).catch(() => null)) { this.h.message(`Le niveau de « ${f.nom} » n'est pas rangé dans un dossier.`); return null }
    return (await this.donnerSonFichier(f, { geste: true })) ?? null
  }

  // =============================================================
  // CHAQUE CLASSEUR REÇOIT SON FICHIER À SA PLACE
  // =============================================================

  /** Un classeur qui arrive dans un niveau rangé (créé, ajouté depuis un
   *  fichier, remis de la corbeille) reçoit son fichier dans son dossier.
   *  Rien si le niveau n'est pas rangé, ou si le classeur a déjà le fichier
   *  de sa clé. geste : dans un clic (la permission peut être demandée) ;
   *  dire : à qui dire ce qui n'a pas marché (le message du bas sinon ; la
   *  bibliothèque l'ajoute au message d'arrivée quand la page va changer).
   *  Rend ce que l'arrivée dira de la clé : écrit (« Il s'enregistre
   *  automatiquement dans … »), ou adopté (son fichier était déjà là) ;
   *  undefined sinon (un fichier plus riche n'est jamais remplacé). */
  async donnerSonFichier(f: FicheClasseur, o: { geste: boolean; dire?: (texte: string) => void }): Promise<CleALArrivee | undefined> {
    const dire = o.dire ?? ((t: string) => this.h.message(t))
    if (f.cle) return undefined
    const endroit = await this.endroitDe(f.dossier).catch(() => null)
    if (!endroit) return undefined
    const e = endroit.emplacement
    const ou = cheminLisible(endroit.prefixe)
    const d = poigneeValable(await this.registre.reglage(reglagePoignee(e.id)).catch(() => undefined))
    if (!d) {
      dire(`« ${f.nom} » n'a pas encore son fichier dans « ${ou} » : ce navigateur ne retrouve plus le dossier (menu ⋯ → Mes emplacements).`)
      return undefined
    }
    if (!await accordDuDossier(d, o.geste).catch(() => false)) {
      dire(`« ${f.nom} » n'a pas encore son fichier dans « ${ou} » : le navigateur attend votre accord (menu ⋯ → Mes emplacements, « Mettre à jour »).`)
      return undefined
    }
    const prefixe = [...endroit.prefixe.slice(0, -1), d.name]
    const fichier = nomSur(f.nom) + EXTENSION_TABLEAU
    const chapitre = cheminLisible([...prefixe, ...endroit.sous.map(n => nomSur(n, { repli: 'Dossier' })), nomSur(f.nom)])
    let b: BilanRelier
    try {
      b = await relierLesClasseurs(this.registre, d, e.dossier, { seulement: [f.id], prefixe, avantDEcrire: this.h.avantDEcrire })
    } catch (x) {
      dire(`Le fichier de « ${f.nom} » n'a pas pu être écrit dans « ${ou} » : ${raisonDe(x)}. Rien n'est perdu : il est dans ce navigateur.`)
      return undefined
    } finally {
      await this.h.apresRangement?.([f.id]).catch(() => {})
    }
    const relu = await this.registre.classeur(f.id).catch(() => undefined)
    const nom = relu?.cle?.nom ?? fichier
    if (b.ecrits.length) return { nom }
    if (b.adoptes.length) return { nom, ok: `Son fichier « ${nom} » était déjà dans « ${relu?.cle?.chemin ? cheminLisible(relu.cle.chemin) : chapitre} » : il le garde.` }
    if (b.plusRiches.length) {
      dire(`Le fichier « ${fichier} » déjà dans « ${chapitre} » a des changements que ce classeur n'a pas : il n'est pas remplacé. Ouvrez-le d'abord (${POUR_OUVRIR}).`)
      return undefined
    }
    if (b.echecs.length) {
      dire(`Le fichier de « ${f.nom} » n'a pas pu être écrit dans « ${ou} » : ${b.raison ?? 'erreur inconnue'}. Rien n'est perdu : il est dans ce navigateur.`)
      return undefined
    }
    return undefined
  }

  // =============================================================
  // LA FENÊTRE « OÙ RANGER LES CLASSEURS DE « 2nde » ? »
  // =============================================================

  /** La fenêtre pour le niveau du classeur de cet onglet (« Ranger « 2nde »
   *  dans un dossier… » au menu ⋯, morceau C) ; null s'il n'en a pas, sinon
   *  ce que la fenêtre a donné ('range' : les fichiers sont écrits, la clé
   *  de l'onglet peut repartir sur le sien) */
  async proposerPourLeClasseurOuvert(): Promise<'range' | 'plus-tard' | null> {
    const ici = this.h.classeur()
    if (!ici) return null
    const f = await this.registre.classeur(ici.id).catch(() => undefined)
    const niveau = await this.niveauDe(f?.dossier ?? null)
    if (!niveau) { this.h.message('Ce classeur n\'est pas dans un dossier de niveau : rangez-le d\'abord dans un dossier, depuis la bibliothèque.'); return null }
    return this.proposer(niveau, { origine: 'menu' })
  }

  /** La fenêtre « Où ranger les classeurs de « 2nde » ? » pour ce niveau.
   *  Rend 'range' si le niveau a été rangé, 'plus-tard' sinon (« Plus
   *  tard », Échap, le fond : depuis « Nouveau classeur », c'est noté, elle
   *  ne reviendra plus d'elle-même pour ce niveau). Tout ce qui touche au
   *  navigateur (choisir un dossier, l'accord d'y écrire) se fait dans le
   *  clic. */
  async proposer(classe: FicheDossier, o: { origine: OrigineRanger }): Promise<'range' | 'plus-tard'> {
    if (document.querySelector('dialog[open]')) { this.h.message('Fermez d\'abord la fenêtre ouverte.'); return 'plus-tard' }
    if (this.occupe) { this.h.message('Un rangement est en cours : attendez qu\'il finisse.'); return 'plus-tard' }
    const [liste, fiches, dossiers, emplacementsDuNiveau] = await Promise.all([
      etablissements(this.registre), this.registre.classeurs().catch(() => [] as FicheClasseur[]), this.registre.dossiers().catch(() => [] as FicheDossier[]), emplacements(this.registre),
    ])
    const actuel = emplacementsDuNiveau.find(e => e.genre === 'ordinateur' && e.dossier === classe.id) ?? null
    const premier = classeursDeLaClasse(classe.id, fiches, dossiers)[0]
    // Le nom proposé : celui du dossier de la bibliothèque ; déjà rangé chez
    // un établissement (« Changer… ») : le nom qu'on lui avait donné
    const propose = actuel?.etablissement ? nomSur(actuel.nom, { repli: 'Niveau' }) : nomSur(classe.nom, { repli: 'Niveau' })
    // « Changer… » : le chemin d'avant, pour l'explication et le bilan
    const nomActuel = actuel ? nomDEtablissement(actuel, liste) : null
    const cheminActuel = actuel ? cheminLisible(nomActuel ? [nomActuel, actuel.nom] : ['Cet ordinateur', actuel.nom]) : null

    const d = document.createElement('dialog')
    d.className = 'dialogue dialogue-ranger'
    d.setAttribute('aria-labelledby', 'titre-ranger')
    d.innerHTML = `<h2 id="titre-ranger"></h2><div class="corps">
      <p class="r-explication"></p>
      <fieldset class="r-ou"><legend>Dans quel dossier ?</legend>
        <div class="r-etablissements"></div>
        <p class="r-choisir"><button type="button" class="secondaire r-choisir-dossier">Choisir un dossier…</button>
          <small>La première fois : le dossier de l'établissement dans Google Drive pour ordinateur, ou n'importe quel dossier ; il est proposé ensuite sous son nom.</small></p>
        <label class="case r-autre"><input type="radio" name="r-etab" value="autre"><span>Un autre dossier, pour ce niveau seul…<small>Une clé USB, un dossier précis : comme avant, sans établissement.</small></span></label>
      </fieldset>
      <label class="champ r-niveau"><span class="r-niveau-libelle"></span><input type="text" name="niveau" maxlength="80" autocomplete="off" spellcheck="false">
        <small>Proposé : le nom du niveau dans la bibliothèque ; tapez celui que vous voulez (« 2 »).</small></label>
      <p class="erreur" role="alert" hidden></p>
      <div class="actions"><button type="button" class="secondaire r-plus-tard">Plus tard</button><button type="button" class="principal r-ok"></button></div></div>`
    const q = <T extends HTMLElement>(s: string) => d.querySelector(s) as T
    q('h2').textContent = `Où ranger les classeurs de « ${classe.nom} » ?`
    const champ = q<HTMLInputElement>('input[name="niveau"]')
    champ.value = propose
    const erreur = q('.erreur'), ok = q<HTMLButtonElement>('.r-ok'), plusTardBtn = q<HTMLButtonElement>('.r-plus-tard'), choisirBtn = q<HTMLButtonElement>('.r-choisir-dossier')
    const dire = (t: string | null) => { erreur.textContent = t ?? ''; erreur.hidden = !t }
    const etabChoisi = () => liste.find(e => e.id === choix()) ?? null
    const choix = () => q<HTMLInputElement>('input[name="r-etab"]:checked')?.value ?? null
    const nomTape = () => champ.value.trim() ? nomSur(champ.value, { repli: 'Niveau' }) : ''
    /** L'explication, avec l'exemple : l'établissement coché (sinon le premier), le nom proposé, le premier classeur du niveau ; « Changer… » : les fichiers d'avant sont relus */
    const expliquer = () => {
      const etab = etabChoisi()?.nom ?? liste[0]?.nom ?? 'LFB classeurs', nomNiveau = nomTape() || propose, chapitre = nomSur(premier?.nom ?? 'Fractions')
      const exemple = choix() === 'autre' ? `le dossier choisi › ${chapitre} › ${chapitre}${EXTENSION_TABLEAU}` : `${etab} › ${nomNiveau} › ${chapitre} › ${chapitre}${EXTENSION_TABLEAU}`
      const relecture = actuel ? ` Les fichiers d'avant (« ${cheminActuel} ») sont relus avant d'être laissés où ils sont : le navigateur peut demander l'accord de les lire.` : ''
      q('.r-explication').textContent = `« ${classe.nom} » est le dossier de la bibliothèque (le niveau). Dites-le une fois : chaque classeur qu'il contient aura son dossier, au nom du classeur, avec son fichier et ses replays (« ${exemple} »), écrit tout seul peu après chaque changement. Vos classeurs restent aussi dans ce navigateur.${relecture}`
    }
    /** La liste des établissements (des radios), par nom */
    const dessiner = () => {
      const bloc = q('.r-etablissements')
      bloc.replaceChildren()
      for (const e of liste) {
        const l = Object.assign(document.createElement('label'), { className: 'case r-etab' })
        l.dataset.id = e.id
        l.append(Object.assign(document.createElement('input'), { type: 'radio', name: 'r-etab', value: e.id }), Object.assign(document.createElement('span'), { textContent: e.nom }))
        bloc.appendChild(l)
      }
    }
    const selectionner = (valeur: string) => {
      const r = d.querySelector<HTMLInputElement>(`input[name="r-etab"][value="${valeur}"]`)
      if (r) r.checked = true
      regler()
    }
    /** Le champ du niveau et le bouton suivent le choix et le nom tapé */
    const regler = () => {
      const c = choix(), etab = etabChoisi(), nom = nomTape()
      q('.r-niveau').hidden = c === 'autre'
      q('.r-niveau-libelle').textContent = etab ? `Dossier du niveau dans « ${etab.nom} » :` : 'Dossier du niveau :'
      if (c === 'autre') { ok.textContent = 'Choisir le dossier et ranger…'; ok.disabled = false }
      else if (etab && nom) { ok.textContent = `Ranger dans « ${cheminLisible([etab.nom, nom])} »`; ok.disabled = false }
      else { ok.textContent = 'Ranger'; ok.disabled = true }
      expliquer()
    }
    dessiner()
    // Le niveau déjà rangé chez un établissement (« Changer… ») : lui d'abord ; sinon le premier de la liste
    const premierChoix = (actuel?.etablissement && liste.some(e => e.id === actuel.etablissement)) ? actuel.etablissement : liste[0]?.id ?? null
    if (premierChoix) selectionner(premierChoix); else regler()
    d.addEventListener('change', () => { dire(null); regler() })
    champ.addEventListener('input', () => { dire(null); regler() })

    let enCours = false
    let resultat: 'range' | 'plus-tard' = 'plus-tard'
    // Rangé : on ne rend la main qu'une fois les fichiers écrits (la fenêtre
    // « Nouveau classeur » qui suit trouve le niveau rangé) ; « Plus tard » :
    // dès la fermeture
    let resoudre: (r: 'range' | 'plus-tard') => void = () => {}
    const fini = new Promise<'range' | 'plus-tard'>(r => { resoudre = r })
    d.addEventListener('close', () => {
      d.remove()
      if (resultat === 'plus-tard') {
        if (o.origine === 'nouveau') void noterPlusTard(this.registre, classe.id).catch(() => {})
        resoudre('plus-tard')
      }
    })
    const fermer = (r: 'range' | 'plus-tard') => { if (enCours && r === 'plus-tard') return; resultat = r; if (d.open) d.close() }
    d.addEventListener('cancel', e => { if (enCours) e.preventDefault() })
    fermerSurLeFond(d, () => fermer('plus-tard'))
    plusTardBtn.addEventListener('click', () => fermer('plus-tard'))
    const bloquer = (b: boolean) => { for (const x of d.querySelectorAll<HTMLInputElement | HTMLButtonElement>('input, button')) x.disabled = b; if (!b) regler() }

    // « Choisir un dossier… » : un établissement de plus (ou l'un de ceux
    // qu'on a déjà, si c'est le même dossier), choisi tout de suite
    choisirBtn.addEventListener('click', async () => {
      if (enCours) return
      dire(null)
      let h: PoigneeDossier | null
      try { h = await choisirUnDossier('mem-etablissements') } catch (e) { dire(`Ce dossier n'a pas pu être choisi : ${raisonDe(e)}.`); return }
      if (!h) return
      for (const e of liste) {
        const p = await this.registre.reglage(reglagePoigneeEtablissement(e.id)).catch(() => undefined)
        if (await memeDossier(h, p)) { selectionner(e.id); return }
      }
      const e: Etablissement = { id: nouvelId(), nom: h.name, cree: Date.now() }
      try { await garderEtablissement(this.registre, e, h) } catch (x) {
        dire(nomErreur(x) === 'DataCloneError' ? 'Ce navigateur ne peut pas garder le dossier : choisissez « Un autre dossier, pour ce niveau seul… ».' : `Le dossier n'a pas pu être gardé : ${raisonDe(x)}.`)
        return
      }
      liste.push(e)
      liste.sort((a, b) => a.nom.localeCompare(b.nom, 'fr', { numeric: true }) || (a.id < b.id ? -1 : 1))
      dessiner()
      selectionner(e.id)
    })

    // « Ranger dans « LFB classeurs › 2 » » / « Choisir le dossier et ranger… »
    ok.addEventListener('click', async () => {
      if (enCours || ok.disabled) return
      dire(null)
      const c = choix()
      if (!c) return
      enCours = true
      bloquer(true)
      try {
        if (c === 'autre') {
          // Le lot 7 tel quel : un dossier pour ce niveau seul, sans établissement
          let dossier: PoigneeDossier | null
          try { dossier = await choisirUnDossier('mem-classes') } catch (e) { dire(`Ce dossier n'a pas pu être choisi : ${raisonDe(e)}.`); return }
          if (!dossier) return
          if (!await accordDuDossier(dossier, true).catch(() => false)) { dire(`Le navigateur n'a pas permis d'écrire dans « ${dossier.name} ». Recommencez et cliquez « Autoriser ».`); return }
          const quitte = await this.dossierQuitte(actuel, dossier)
          enCours = false
          fermer('range')
          await this.ranger(classe, dossier, { prefixe: [dossier.name], ancien: quitte.change ? cheminActuel : null, quitte: quitte.d })
          resoudre('range')
          return
        }
        const etab = etabChoisi()
        const nom = nomTape()
        if (!etab || !nom) return
        const h = poigneeValable(await this.registre.reglage(reglagePoigneeEtablissement(etab.id)).catch(() => undefined))
        if (!h) { dire(`Ce navigateur ne retrouve plus le dossier « ${etab.nom} » : choisissez-le de nouveau (« Choisir un dossier… »).`); return }
        // L'accord, dans ce clic (Chrome le redemande d'un jour sur l'autre, sauf « Autoriser à chaque visite »)
        const avant = await permission(h as unknown as PoigneeFichier, false)
        if (!await accordDuDossier(h, true).catch(() => false)) { dire(`Le navigateur n'a pas permis d'écrire dans « ${etab.nom} ». Recommencez et cliquez « Autoriser ».`); return }
        let dossier: PoigneeDossier
        try { dossier = await h.getDirectoryHandle(nom, { create: true }) } catch (e) { dire(`Le dossier « ${nom} » n'a pas pu être créé dans « ${etab.nom} » : ${raisonDe(e)}.`); return }
        const quitte = await this.dossierQuitte(actuel, dossier)
        enCours = false
        fermer('range')
        await this.ranger(classe, dossier, { prefixe: [etab.nom, dossier.name], etablissement: etab, ancien: quitte.change ? cheminActuel : null, quitte: quitte.d, conseil: avant !== 'granted' })
        resoudre('range')
      } finally {
        enCours = false
        if (d.open) bloquer(false)
      }
    })

    document.body.appendChild(d)
    d.showModal()
    if (liste.length) ok.focus(); else choisirBtn.focus()
    return fini
  }

  /** « Changer… » : le niveau quitte-t-il son dossier d'avant (actuel) pour
   *  `d` ? Dans le clic : l'accord de LIRE le dossier quitté est demandé
   *  (ses fichiers sont relus avant d'être laissés ; un refus ne bloque
   *  rien : les classeurs concernés gardent leur fichier d'avant, le bilan le
   *  dit). d : le dossier quitté, s'il est encore là (relierLesClasseurs y
   *  reconnaît les fichiers rangés par le lot 7, sans chemin dans la fiche). */
  private async dossierQuitte(actuel: Emplacement | null, d: PoigneeDossier): Promise<{ change: boolean; d: PoigneeDossier | null }> {
    if (!actuel) return { change: false, d: null }
    const p = poigneeValable(await this.registre.reglage(reglagePoignee(actuel.id)).catch(() => undefined))
    if (await memeDossier(d, p)) return { change: false, d: null }
    if (p) await accordDeLire(p, true).catch(() => false)
    return { change: true, d: p }
  }

  /** Le niveau rangé dans ce dossier (l'accord déjà demandé dans le clic) :
   *  le lien (relierLeNiveau), puis la phrase du bilan. ancien : le chemin
   *  d'avant quand le niveau change de dossier (« Changer… ») : chaque
   *  classeur reçoit son fichier ici, une fois l'ancien relu, et le bilan dit
   *  que les fichiers d'avant y restent ; quitte : ce dossier d'avant.
   *  conseil : l'accord vient d'être demandé, on dit « Autoriser à chaque
   *  visite ». Puis la clé du classeur de cet onglet repart (apresRangement). */
  private async ranger(classe: FicheDossier, d: PoigneeDossier, o: { prefixe: string[]; etablissement?: Etablissement; ancien: string | null; quitte: PoigneeDossier | null; conseil?: boolean }): Promise<void> {
    if (this.occupe) return
    this.occupe = true
    let ids: string[] = []
    try {
      const [fiches, dossiers] = await Promise.all([this.registre.classeurs().catch(() => [] as FicheClasseur[]), this.registre.dossiers().catch(() => [] as FicheDossier[])])
      ids = classeursDeLaClasse(classe.id, fiches, dossiers).map(f => f.id)
      // Un autre dossier qu'avant : chaque classeur reçoit son fichier ici (les anciens restent)
      const b = await relierLeNiveau({ registre: this.registre, message: t => this.h.message(t), avantDEcrire: this.h.avantDEcrire }, classe, d,
        { prefixe: o.prefixe, etablissement: o.etablissement?.id, etablissementNom: o.etablissement?.nom, reprendre: o.ancien !== null, ancien: o.quitte ?? undefined })
      if (!b) return
      this.h.message(texteDuRangement({ niveau: classe.nom, chemin: o.prefixe, bilan: b, ancien: o.ancien }) + (o.conseil ? ' ' + CONSEIL_ACCORD_DOSSIER : ''))
    } catch (e) {
      this.h.message(`« ${classe.nom} » n'a pas pu être rangé : ${raisonDe(e)}.`)
    } finally {
      this.occupe = false
      await this.h.apresRangement?.(ids).catch(() => {})
      void this.h.bibliotheque.charger()
    }
  }
}
