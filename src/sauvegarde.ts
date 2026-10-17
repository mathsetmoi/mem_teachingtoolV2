// =============================================================
// ENREGISTRER ET OUVRIR UN CLASSEUR
// Le classeur vit dans le navigateur (sa base, voir classeurs/) ;
// « Enregistrer le classeur » l'emporte tout entier dans un fichier .memc
// (voir fichier.ts), « Ouvrir un classeur » remplace celui qui est ouvert
// par celui d'un fichier. C'est la passerelle entre la version en ligne et
// la version hors ligne, et d'une machine à l'autre.
// - Chrome et Edge demandent où enregistrer (showSaveFilePicker) ; les
//   autres navigateurs, ou une page ouverte depuis la clé (file://),
//   téléchargent le fichier. Il s'appelle comme le classeur, avec la date :
//   « Symétrie centrale 2026-10-10 14h05.memc ».
// - Le fichier se fabrique depuis la base du classeur, dans un travailleur
//   (classeurs/ecrivain.ts) : rien ne gèle. Quand la base a un trou (une
//   écriture qu'elle a refusée, voir Tableau.trou), ou que l'écrivain ne
//   peut pas la lire, il s'écrit depuis la mémoire de l'onglet, qui a tout ce
//   qu'il a écrit (la page gèle alors un instant, comme avant le lot 4).
//   Une base relue en partie (Tableau.incomplet : des changements y
//   attendent une mise à jour qui manque, depuis une écriture refusée lors
//   d'une autre séance) : le fichier a ce qui s'en relit (ni la base ni la
//   mémoire n'ont le reste), et le message le dit. Jamais un fichier que
//   l'ouverture refuserait, jamais « Classeur enregistré » pour lui.
// - Ouvrir demande toujours confirmation, dans une fenêtre de l'outil (pas
//   de confirm(), que le navigateur bloque dans une page intégrée), et
//   propose d'enregistrer d'abord. Le nouveau contenu est rangé dans la base
//   du classeur, puis la page se recharge. Un autre onglet ouvert sur le
//   même classeur l'apprend et se met hors d'état d'écrire.
// - Les onglets se parlent par le canal 'mem-teachingtool-classeur'
//   ({ type, base, id? } : chacun ne retient que ce qui touche sa base) ;
//   le premier classeur (le tableau d'avant le lot 4) écoute et parle aussi
//   sur 'mem-tableau', le canal d'avant, pour qu'un onglet de la version
//   d'avant (la clé du lot 3) l'apprenne : elle ne lit que type ===
//   'remplace', et la nouvelle version y ajoute raison ('remplace' ou
//   'supprime'). Un message sans raison vaut 'remplace'. Un onglet prévenu
//   une fois ignore la suite.
// - La date du dernier enregistrement est celle du classeur
//   ('mem-dernier-enregistrement' pour le premier, comme avant ; suivie de
//   « :<id> » pour les autres).
// - Ctrl + S et Ctrl + O (⌘ sur Mac) ; un fichier glissé sur le tableau
//   s'ouvre comme par « Ouvrir un classeur ». Quand le classeur s'enregistre
//   tout seul sur la clé (classeurs/cle.ts), Ctrl + S y écrit aussitôt ;
//   « Enregistrer une copie dans un fichier… » est alors l'Enregistrer
//   d'avant.
// - Ouvrir passe par showOpenFilePicker quand il existe (Chrome, Edge) :
//   la poignée du fichier permet de cocher, dans la fenêtre, « Enregistrer
//   automatiquement les changements dans ce fichier » (le poste remis à
//   zéro : on ouvre le classeur de la clé, et c'est tout). Le fichier est lu
//   et vérifié dans le travailleur de l'écrivain : rien ne gèle.
// - « Remplacer » donne au classeur l'identité du fichier (son id, s'il en
//   a un qu'aucun autre classeur n'a, et son nom ; sinon un id neuf) et
//   retire le lien de la clé et la copie du Drive, qui restent les
//   sauvegardes de l'ancien contenu (voir registre.changerIdentite). Quand
//   l'id ne change pas (un fichier du même classeur), le lien du Drive
//   reste, avec ce que la dernière copie avait : la copie du Drive (lot 4
//   C10) n'est remplacée que si le fichier contient tout ce qu'elle avait,
//   sinon elle le dit (le garde-fou de l'histoire) ; elle reste ainsi celle
//   du classeur d'avant.
//   Le fichier d'un classeur qui reste dans la bibliothèque (dans sa
//   corbeille : on peut le remettre) donne un id neuf : le classeur ouvert
//   en devient une copie, son registre des publications vidé et marqué
//   (comme « Ajouter comme copie »), pour qu'il publie sous ses propres liens.
// =============================================================
import * as Y from 'yjs'
import type { App } from './app'
import { ErreurFichier, EXTENSION_TABLEAU, dateLisible, ecrireLisible, lireTableau, nomClasseur, pagesLisibles, tailleLisible } from './fichier'
import { ecrire } from './reglages'
import { tableauCache } from './navigateur'
import type { FicheClasseur } from './classeurs/demarrage'
import { CANAL_CLASSEUR, CANAL_PREMIER, CLE_DERNIER_ENREGISTREMENT, cleDuClasseur, ecrireDernier, estPremier, idClasseur, urlBibliotheque, urlDuClasseur } from './classeurs/demarrage'
import { passerLaConnexion } from './publication/drive'
import type { FichierLu } from './classeurs/ecrivain'
import { ErreurEcrivain, ecrivain, fabriquerFichier } from './classeurs/ecrivain'
import type { Registre } from './classeurs/registre'
import type { CleALArrivee, EnregistrementCle, PoigneeFichier } from './classeurs/cle'
import { ID_CHOIX, TYPES_CLASSEUR, lireCleALArrivee } from './classeurs/cle'
import type { Fichiers } from './classeurs/fichiers'
import { TEXTE_PUBLIEES_COPIE } from './classeurs/reconnaitre'
import { fermerSurLeFond } from './dialogue'

/** Le début du message d'un fichier écrit sans la partie du classeur qui ne
 *  se relit plus dans ce navigateur (voir Tableau.incomplet) */
export const ENREGISTRE_SANS_LA_PARTIE = 'Classeur enregistré, sans la partie qui ne se relit plus dans ce navigateur'

/** Quand le classeur a été enregistré dans un fichier pour la dernière fois
 *  (ms) : cette clé pour le premier classeur, suivie de « :<id> » pour les
 *  autres (voir cleDuClasseur) */
const CLE_DERNIER = CLE_DERNIER_ENREGISTREMENT
/** La clé de la date du dernier enregistrement d'un classeur */
export const cleDernierEnregistrement = (c: { id: string; base: string }) => cleDuClasseur(c, CLE_DERNIER)

/** Quand ce classeur a été enregistré dans un fichier pour la dernière fois
 *  (ms), lu dans la valeur de sa clé ; null : jamais (ou rien de lisible) */
export function lireDernierEnregistrement(valeur: string | null): number | null {
  const t = Number(valeur)
  return valeur !== null && Number.isFinite(t) && t > 0 ? t : null
}
/** Le temps d'un rechargement (sessionStorage) : un classeur vient d'être
 *  ouvert depuis un fichier, JSON { pages, nom, message?, cle? } (avant le
 *  lot 4 : le nombre de pages seul, qui se lit encore) ; message : ce qu'on
 *  dit au retour à la place de « Classeur ouvert : N pages. » ; cle : le
 *  fichier ouvert est devenu celui de la clé, et ce qu'il en est se dira au
 *  retour, une fois la clé vérifiée (voir EnregistrementCle.direALArrivee) */
const CLE_OUVERT = 'mem-ouvert'

/** Ce qui est arrivé au classeur ailleurs */
export type RaisonAilleurs = 'remplace' | 'supprime'
/** Un message du canal des classeurs ('change' : sa fiche a changé, pour la
 *  bibliothèque ; rien à faire ici) */
export interface MessageClasseur { type: RaisonAilleurs | 'change'; base: string; id?: string }

/** Ce que garde CLE_OUVERT */
interface Ouvert { pages: number; nom?: string; message?: string; cle?: CleALArrivee }

/** Relit CLE_OUVERT : JSON { pages, nom, message? }, ou le nombre seul (avant
 *  le lot 4) ; null si rien ne se lit */
export function lireOuvert(texte: string | null): Ouvert | null {
  if (!texte) return null
  const t = texte.trim()
  if (/^\d+$/.test(t)) return Number(t) > 0 ? { pages: Number(t) } : null
  try {
    const o = JSON.parse(t)
    if (!o || typeof o !== 'object' || typeof o.pages !== 'number' || !(o.pages > 0)) return null
    const r: Ouvert = { pages: o.pages }
    if (typeof o.nom === 'string') r.nom = o.nom
    if (typeof o.message === 'string' && o.message.trim()) r.message = o.message
    const cle = lireCleALArrivee(o.cle)
    if (cle) r.cle = cle
    return r
  } catch { return null }
}

/** iPad et iPhone grisent, dans le choix du fichier, un type qu'ils ne connaissent pas */
const IOS = typeof navigator !== 'undefined'
  && (/iPad|iPhone|iPod/.test(navigator.userAgent) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1))

/** Le fichier choisi par showSaveFilePicker (Chrome, Edge) */
interface FichierChoisi { name: string; createWritable(): Promise<{ write(b: Blob): Promise<void>; close(): Promise<void> }> }
type ChoisirOuEnregistrer = (o: unknown) => Promise<FichierChoisi>
/** Le choix d'un fichier à ouvrir, avec sa poignée (Chrome, Edge) */
type ChoisirPourOuvrir = (o: unknown) => Promise<PoigneeFichier[]>

/** Une image d'écran passe (le message « Enregistrement… » se voit), sans
 *  attendre plus de 120 ms si la page est cachée */
function uneImage(): Promise<void> {
  return new Promise(ok => { requestAnimationFrame(() => setTimeout(ok, 0)); setTimeout(ok, 120) })
}
const attendre = (ms: number) => new Promise(ok => setTimeout(ok, ms))

/** Ce que l'on dit d'une écriture (ou d'une lecture) qui a échoué ; pour
 *  la clé, voir aussi classeurs/cle.ts (raisonCle). La bibliothèque s'en
 *  sert aussi (classeurs/enregistrer.ts). */
export function raison(e: unknown): string {
  const nom = (e as { name?: string } | null)?.name
  if (e instanceof ErreurFichier && e.raison === 'abimee') return 'il semble abîmé dans ce navigateur'
  if (nom === 'QuotaExceededError') return 'il n\'y a plus de place sur le disque ou sur la clé'
  if (nom === 'NotAllowedError' || nom === 'SecurityError') return 'le navigateur n\'a pas permis d\'écrire ce fichier'
  if (nom === 'NotFoundError') return 'le dossier choisi n\'existe plus (la clé a-t-elle été retirée ?)'
  if (nom === 'NotReadableError') return 'le fichier ne peut plus être lu (la clé a-t-elle été retirée, le fichier déplacé ?)'
  if (nom === 'NoModificationAllowedError' || nom === 'InvalidStateError') return 'le fichier est en lecture seule, ou ouvert ailleurs'
  const m = e instanceof Error ? e.message.trim().replace(/\.$/, '') : ''
  return m || 'erreur inconnue'
}

/** Un téléchargement ; le lien va dans la fenêtre ouverte s'il y en a une
 *  (hors d'elle, la page est inerte). L'image copiée s'en sert aussi
 *  (« Enregistrer l'image (.png) », voir sorties/image.ts). */
export function telecharger(fichier: Blob, nom: string) {
  const a = document.createElement('a')
  a.href = URL.createObjectURL(fichier); a.download = nom; a.hidden = true
  ;(document.querySelector('dialog[open]') ?? document.body).appendChild(a)
  a.click()
  a.remove()
  setTimeout(() => URL.revokeObjectURL(a.href), 60_000)
}

export class Sauvegarde {
  /** Le canal d'avant le lot 4 (le premier classeur seulement) */
  private canal: BroadcastChannel | null = null
  /** Le canal des classeurs */
  private canalClasseur: BroadcastChannel | null = null
  private choix: HTMLInputElement
  /** Un enregistrement à la fois */
  private enCours = false
  /** Le classeur a été remplacé ou supprimé ailleurs : cet onglet attend
   *  d'être rechargé (et n'écoute plus rien : un seul avis) */
  private perime = false
  /** Un fichier vient d'être écrit (ou son téléchargement lancé) : sa date,
   *  celle de son en-tête (l'état de la sauvegarde s'en sert, voir
   *  classeurs/surveillance.ts) */
  onEnregistre?: (date: number) => void
  /** L'index de la bibliothèque et la fiche du classeur ouvert (null : le
   *  repli, l'index ne s'ouvre pas), l'enregistrement sur la clé (null :
   *  impossible ici) : posés par main.ts */
  registre: Registre | null = null
  fiche: FicheClasseur | null = null
  cle: EnregistrementCle | null = null
  /** La copie sur le Drive (lot 4 C10) : elle s'arrête quand le classeur est remplacé */
  drive: { suspendre(): void } | null = null
  /** Ouvrir des fichiers (lot 4 C9) : ajouter un classeur à la bibliothèque,
   *  le reconnaître, le mettre à jour, ou remplacer celui-ci ; plusieurs
   *  fichiers, une bibliothèque (.memb). Posé par main.ts quand l'index
   *  s'ouvre ; null (le repli) : Ouvrir remplace le classeur, comme avant. */
  fichiers: Fichiers | null = null

  constructor(private app: App, private dire: (texte: string) => void, racine: HTMLElement) {
    this.choix = Object.assign(document.createElement('input'), { type: 'file', hidden: true })
    if (!IOS) this.choix.accept = EXTENSION_TABLEAU
    this.choix.setAttribute('aria-hidden', 'true')
    this.choix.addEventListener('change', () => {
      const tous = [...(this.choix.files ?? [])]
      this.choix.value = ''
      if (this.fichiers && tous.length) void this.fichiers.ouvrir(tous.map(fichier => ({ fichier })))
      else if (tous[0]) void this.ouvrirFichier(tous[0])
    })
    racine.appendChild(this.choix)

    // Le premier classeur parle aussi par le canal d'avant : un onglet de la
    // version d'avant ouvert sur lui l'apprend, et il apprend ce qu'elle fait
    if (estPremier(app.classeur)) {
      try {
        this.canal = new BroadcastChannel(CANAL_PREMIER)
        this.canal.onmessage = e => {
          const d = e.data as { type?: string; raison?: string } | null
          if (d?.type === 'remplace') this.remplaceAilleurs(d.raison === 'supprime' ? 'supprime' : 'remplace')
        }
      } catch { /* pas de canal (vieux navigateur) : chaque onglet vit sa vie */ }
    }
    try {
      this.canalClasseur = new BroadcastChannel(CANAL_CLASSEUR)
      this.canalClasseur.onmessage = e => {
        const d = e.data as Partial<MessageClasseur> | null
        // Un autre classeur : rien à voir avec celui-ci
        if (!d || d.base !== app.classeur.base) return
        if (d.type === 'remplace' || d.type === 'supprime') this.remplaceAilleurs(d.type, typeof d.id === 'string' && d.id ? d.id : undefined)
      }
    } catch { /* pas de canal */ }

    // En capture sur window, posé au démarrage : avant le navigateur, qui
    // enregistrerait la page web ou ouvrirait un fichier, et avant la revue.
    // e.key : en AZERTY comme en QWERTY, la lettre S est « s ». Pendant la
    // revue et la trieuse des pages, Ctrl + O se tait (le tableau qu'on
    // remplacerait est caché) ; Ctrl + S, lui, enregistre toujours.
    window.addEventListener('keydown', e => {
      if (!(e.ctrlKey || e.metaKey) || e.altKey) return
      const k = e.key.toLowerCase()
      if (k !== 's' && k !== 'o') return
      e.preventDefault()
      if (e.repeat || document.querySelector('dialog[open]') || enSeance()) return
      if (k === 's') void this.ctrlS()
      else if (!tableauCache(this.app)) this.ouvrir()
    }, true)
  }

  /** La clé de la date du dernier enregistrement de ce classeur */
  private get cleDernier() { return cleDernierEnregistrement(this.app.classeur) }

  /** Quand ce classeur a été enregistré dans un fichier pour la dernière fois
   *  (ms) ; null : jamais (ou ce navigateur ne garde rien). L'état de la
   *  sauvegarde le dit (voir classeurs/etat.ts). */
  dernierEnregistrement(): number | null {
    try { return lireDernierEnregistrement(localStorage.getItem(this.cleDernier)) } catch { return null }
  }

  // ---------- Enregistrer ----------
  /** Ctrl + S : sur la clé, aussitôt, quand elle enregistre ce classeur
   *  depuis cet onglet (voir classeurs/cle.ts) ; sinon le fichier qu'on
   *  choisit (Enregistrer le classeur, ou une copie) */
  ctrlS(): Promise<boolean> {
    if (this.perime) return Promise.resolve(false)
    if (this.cle?.peutEnregistrer()) return this.cle.enregistrerMaintenant()
    return this.enregistrer()
  }

  /** Le classeur est dans un fichier depuis cette date (celle de son
   *  en-tête) : ici, la clé, un autre onglet le sauront */
  noterFichier(date: number) {
    ecrire(this.cleDernier, String(date))
    try { this.onEnregistre?.(date) } catch { /* l'état se remettra à jour */ }
  }

  /** Le fichier du classeur ouvert, tel qu'Enregistrer l'écrit (la clé
   *  aussi, pour Ctrl + S) : le point d'un simple toucher qui attend encore
   *  et ce que les instruments viennent de faire y entrent (Ctrl + S et
   *  Enregistrer seulement : jamais une écriture automatique, qui ferait
   *  d'un double-clic au Stylo un point d'encre) ; puis voir fichierDuClasseur */
  fabriquer(date: number): Promise<{ fichier: Blob; vecteur: Uint8Array; incomplet?: boolean }> {
    this.app.poserCeQuiAttend()
    this.app.piste.vider()
    return this.fichierDuClasseur(date)
  }

  /** Vrai si le fichier est écrit (ou son téléchargement lancé) */
  async enregistrer(): Promise<boolean> {
    if (this.enCours || this.perime) return false
    this.enCours = true
    try { return await this.ecrireLeFichier() } finally { this.enCours = false }
  }

  private async ecrireLeFichier(): Promise<boolean> {
    const nom = nomClasseur(this.app.classeur.nom)
    // L'emplacement d'abord : l'appui (ou Ctrl + S) ne permet d'ouvrir cette
    // fenêtre que pendant quelques secondes
    let choisi: FichierChoisi | null = null
    const choisir = (window as unknown as { showSaveFilePicker?: ChoisirOuEnregistrer }).showSaveFilePicker
    if (typeof choisir === 'function') {
      try {
        choisi = await choisir.call(window, {
          suggestedName: nom,
          types: [{ description: 'Classeur complet (MEM teachingtool)', accept: { 'application/octet-stream': [EXTENSION_TABLEAU] } }],
        })
      } catch (e) {
        if ((e as { name?: string } | null)?.name === 'AbortError') return false     // on a renoncé
        choisi = null           // page ouverte depuis la clé, page intégrée… : on télécharge
      }
    }
    this.dire('Enregistrement du classeur…')
    await uneImage()
    try {
      const date = Date.now()
      const { fichier, incomplet } = await this.fabriquer(date)
      if (choisi) {
        const w = await choisi.createWritable()
        await w.write(fichier)
        await w.close()
      } else telecharger(fichier, nom)
      this.noterFichier(date)
      this.dire(`${incomplet ? ENREGISTRE_SANS_LA_PARTIE : 'Classeur enregistré'} : ${choisi?.name || nom} (${tailleLisible(fichier.size)}).`)
      return true
    } catch (e) {
      this.dire(`Le classeur n'a pas pu être enregistré : ${raison(e)}.`)
      return false
    }
  }

  /** Le fichier du classeur ouvert. Depuis sa base, par l'écrivain, hors du
   *  fil principal, une fois écrit dans la base tout ce qui l'a été ici.
   *  Depuis la mémoire de cet onglet (ecrireLisible, la page gèle un
   *  instant) quand la base a un trou ou ne s'ouvre pas (Tableau.trou), ou
   *  que l'écrivain ne peut pas la lire : la mémoire a tout ce que cet
   *  onglet a écrit, même ce que la base a refusé (avant le lot 4, c'était
   *  toujours ainsi). Une base relue en partie (Tableau.incomplet) : ce qui
   *  s'en relit, de la base (lisible) ou de la mémoire, qui n'en a pas plus ;
   *  incomplet le dit. Avec le vecteur d'état de ce qui est écrit. Le
   *  fichier se rouvre toujours (sinon ErreurFichier, et rien n'est écrit). */
  private async fichierDuClasseur(date: number): Promise<{ fichier: Blob; vecteur: Uint8Array; incomplet?: boolean }> {
    const t = this.app.tableau, c = this.app.classeur
    const infos = { nom: c.nom, id: c.id }
    if (!t.trou && t.base) {
      await t.attendreEcritures()
      if (!t.trou) {
        try {
          const f = await fabriquerFichier(t.base, infos, date, { lisible: t.incomplet })
          return { fichier: f.fichier, vecteur: f.vecteur, incomplet: !!f.incomplet }
        } catch (e) {
          // 'abimee', 'indisponible', 'absente' (le travailleur ne voit pas
          // la base que voit la page), 'autre' : la mémoire, qui a tout
          if (!(e instanceof ErreurEcrivain)) throw e
        }
      }
    }
    this.dire('Enregistrement depuis la mémoire de cet onglet…')
    await uneImage()
    const l = ecrireLisible(t.doc, date, infos)
    return { fichier: l.fichier, vecteur: Y.encodeStateVector(t.doc), incomplet: l.incomplet }
  }

  // ---------- Ouvrir ----------
  /** Pourquoi on ne peut pas ouvrir un classeur maintenant (null : on peut) */
  private refus(): string | null {
    if (this.perime) return 'Rechargez d\'abord la page.'
    if (this.app.enLecture) return 'Fermez d\'abord la revue.'
    if (enSeance()) return 'Fermez d\'abord la séance d\'automatismes.'
    if (document.querySelector('dialog[open]')) return 'Fermez d\'abord la fenêtre ouverte.'
    return null
  }

  /** Le classeur a été remplacé, supprimé ou mis à jour ailleurs (ou coupé
   *  ici, voir couperPourUnFichier) : cet onglet attend d'être rechargé */
  get estPerime(): boolean { return this.perime }

  /** Choisir un fichier .memc : par showOpenFilePicker quand il existe
   *  (Chrome, Edge : la poignée du fichier permet d'y enregistrer ensuite
   *  automatiquement) ; on a renoncé (AbortError) : rien ; une autre erreur
   *  (une page intégrée…) : le choix de fichier d'avant. Avec la
   *  bibliothèque (lot 4 C9), c'est elle qui choisit : plusieurs fichiers,
   *  des .memc et des .memb (voir classeurs/fichiers.ts). */
  ouvrir() {
    const r = this.refus()
    if (r) return this.dire(r)
    if (this.fichiers) { this.fichiers.choisir(); return }
    const choisir = (window as unknown as { showOpenFilePicker?: ChoisirPourOuvrir }).showOpenFilePicker
    if (typeof choisir === 'function') {
      void (async () => {
        let h: PoigneeFichier | undefined
        try {
          [h] = await choisir.call(window, { id: ID_CHOIX, multiple: false, types: TYPES_CLASSEUR })
        } catch (e) {
          if ((e as { name?: string } | null)?.name !== 'AbortError') this.choisirAvecLeChamp()
          return
        }
        if (!h) return
        let f: File
        try { f = await h.getFile() } catch (e) { this.dire(`Ce fichier n'a pas pu être lu : ${raison(e)}.`); return }
        await this.ouvrirFichier(f, h)
      })()
      return
    }
    this.choisirAvecLeChamp()
  }

  /** Le choix de fichier d'avant (Firefox, Safari, l'iPad) */
  private choisirAvecLeChamp() {
    this.choix.value = ''
    this.choix.click()
  }

  /** Un fichier choisi ou glissé sur le tableau : avec la bibliothèque (lot
   *  4 C9), elle s'en charge (l'ajouter, le reconnaître… voir
   *  classeurs/fichiers.ts) ; sans elle (le repli), on le lit et le vérifie
   *  en entier, dans le travailleur (sans rien toucher, sans geler), puis
   *  on demande confirmation : il remplace le classeur ouvert. poignee : le
   *  fichier choisi par showOpenFilePicker, où l'on pourra enregistrer
   *  automatiquement. */
  async ouvrirFichier(f: File, poignee?: PoigneeFichier) {
    const r = this.refus()
    if (r) return this.dire(r)
    if (this.fichiers) return this.fichiers.ouvrir([{ fichier: f, ...(poignee ? { poignee } : {}) }])
    if (f.size > 2_000_000) { this.dire('Lecture du fichier…'); await uneImage() }
    let lu: FichierLu
    try { lu = await ecrivain.lireFichier(f) } catch (e) {
      if (e instanceof ErreurEcrivain && e.raison === 'illisible') return this.dire(e.message)
      // L'écrivain n'a pas pu (il est tombé, le fichier est énorme) : sur le
      // fil principal, comme avant le lot 4
      try {
        const x = lireTableau(new Uint8Array(await f.arrayBuffer()))
        lu = { ...x, vecteur: Y.encodeStateVectorFromUpdate(x.etat) }
      } catch (e2) {
        this.dire(e2 instanceof ErreurFichier ? e2.message : 'Ce fichier n\'a pas pu être lu.')
        return
      }
    }
    await this.proposerRemplacement(f.name, lu, poignee)
  }

  /** « Ouvrir ce classeur ? », la question du lot 1 : le fichier lu remplace
   *  le classeur ouvert (« Remplacer « Mon tableau »… » de la bibliothèque,
   *  lot 4 C9, y mène aussi). La case de l'enregistrement automatique, et la
   *  clé du classeur ouvert (elle s'arrêtera), sont relues avant ; coche :
   *  la case, si elle est offerte, cochée ou non au départ. copie : le
   *  fichier est celui d'un classeur qui reste dans la bibliothèque (dans sa
   *  corbeille, d'où on peut le remettre) ; le classeur ouvert, qui prend
   *  alors un id neuf, en devient une copie (voir confirmer). */
  async proposerRemplacement(nom: string, lu: FichierLu, poignee?: PoigneeFichier, coche = true, o: { copie?: boolean } = {}) {
    const offrir = !!poignee && !!this.cle && await this.cle.offrirPourOuverture(poignee, lu.entete).catch(() => false)
    const fiche = this.registre && this.fiche ? await this.registre.classeur(this.app.classeur.id).catch(() => undefined) : undefined
    // La lecture a pris un moment : une fenêtre a pu s'ouvrir entre-temps
    const r2 = this.refus()
    if (r2) return this.dire(r2)
    this.confirmer(nom, lu, offrir ? poignee! : null, fiche?.cle?.nom ?? null, coche, !!fiche?.drive, !!o.copie)
  }

  /** L'identité du classeur après « Remplacer » : celle du fichier (son id,
   *  s'il en a un qu'aucune autre fiche n'a, et son nom), sinon un id neuf
   *  (le nom ne change pas). Le repli (sans index) garde la sienne. */
  private async identiteApres(entete: FichierLu['entete']): Promise<{ id: string; nom: string }> {
    const c = this.app.classeur
    if (!this.registre || !this.fiche) return { id: c.id, nom: c.nom }
    if (entete.id && (entete.id === c.id || !await this.registre.classeur(entete.id).catch(() => true))) {
      return { id: entete.id, nom: entete.nom ?? c.nom }
    }
    return { id: idClasseur(), nom: c.nom }
  }

  /** « Ouvrir ce classeur ? ». poignee : la case « Enregistrer
   *  automatiquement les changements dans ce fichier » est offerte (cochée) ;
   *  nomCle : le fichier où ce classeur s'enregistre tout seul (cela
   *  s'arrête : il garde le classeur d'avant) ; avecDrive : il a une copie
   *  sur le Drive (elle reste celle du classeur d'avant). copie : le
   *  fichier est celui d'un classeur qui reste dans la bibliothèque (voir
   *  proposerRemplacement) ; s'il ne lui prend pas son id, le classeur
   *  ouvert en devient une copie, comme « Ajouter comme copie »
   *  (classeurs/fichiers.ts) : son registre des publications vidé, et marqué
   *  (ecrivain-pur.preparerCopie, dans le travailleur). Sans cela, republier
   *  depuis lui une séance de l'original, une fois l'original remis,
   *  mettrait à jour le lien déjà donné à l'autre classe. */
  private confirmer(nom: string, lu: FichierLu, poignee: PoigneeFichier | null, nomCle: string | null, coche = true, avecDrive = false, copie = false) {
    const { entete, etat, pages } = lu
    const d = document.createElement('dialog')
    d.className = 'dialogue dialogue-ouvrir'
    d.innerHTML = `<h2>Ouvrir ce classeur ?</h2><div class="corps"><p></p>${poignee ? `<label class="case case-cle"><input type="checkbox"${coche ? ' checked' : ''}><span>Enregistrer automatiquement les changements dans ce fichier</span></label>` : ''}<div class="actions">
      <button type="button" class="secondaire" data-a="annuler">Annuler</button>
      <button type="button" class="secondaire" data-a="enregistrer">Enregistrer d'abord</button>
      <button type="button" class="principal danger-plein" data-a="remplacer">Remplacer</button></div></div>`
    const texte = d.querySelector('p')!
    const caseCle = d.querySelector<HTMLInputElement>('.case-cle input')
    const quand = Number.isFinite(entete.date) && entete.date > 0 ? `, enregistré ${dateLisible(entete.date)}` : ''
    const arret = nomCle ? ` L'enregistrement automatique dans « ${nomCle} » s'arrête : ce fichier garde le classeur d'avant.` : ''
    const drive = avecDrive ? ' Sa copie sur le Drive reste celle du classeur d\'avant.' : ''
    texte.textContent = `« ${nom} » : ${pagesLisibles(pages)}${quand}. Il remplace le classeur « ${this.app.classeur.nom} » de ce navigateur (${pagesLisibles(this.app.pages.length)}) et tout son historique. Pour garder celui-ci, enregistrez-le d'abord.${arret}${drive}`
    const bouton = (a: string) => d.querySelector<HTMLButtonElement>(`[data-a="${a}"]`)!
    const annuler = bouton('annuler'), avant = bouton('enregistrer'), remplacer = bouton('remplacer')
    /** Pendant le remplacement, la fenêtre ne se ferme plus */
    let bloque = false
    const fermer = () => { if (bloque) return; if (d.open) d.close(); d.remove() }
    d.addEventListener('cancel', e => { if (bloque) e.preventDefault() })
    d.addEventListener('close', () => { if (bloque) d.showModal(); else d.remove() })
    fermerSurLeFond(d, fermer)
    annuler.addEventListener('click', fermer)
    avant.addEventListener('click', async () => {
      avant.disabled = true
      const ok = await this.enregistrer()
      if (ok) avant.textContent = 'Enregistré ✓'
      else avant.disabled = false
    })
    remplacer.addEventListener('click', async () => {
      // L'accord pour écrire dans le fichier ouvert n'est pas demandé ici :
      // la page se recharge, et Chrome l'oublie en changeant de page (sauf
      // « Autoriser à chaque visite ») ; demandé ici, il le serait deux fois.
      // Au retour, la clé vérifiée dit ce qu'il en est, et le demande en un
      // clic s'il le faut (voir EnregistrementCle.direALArrivee).
      const voulu = !!(poignee && caseCle?.checked)
      bloque = true
      for (const b of [annuler, avant, remplacer]) b.disabled = true
      if (caseCle) caseCle.disabled = true
      remplacer.textContent = 'Remplacement…'
      const ancien = { ...this.app.classeur }
      const ident = await this.identiteApres(entete)
      // Une copie d'un classeur qui reste ici (il garde l'id du fichier) :
      // le registre vidé et la marque, préparés hors du fil principal ;
      // l'état du fichier ne change pas
      let aRanger: Uint8Array | Uint8Array[] = etat, vecteur = lu.vecteur, publiees = 0
      if (copie && ident.id !== entete.id && ident.id !== ancien.id) {
        try {
          const c = await ecrivain.preparerCopie(etat, ident.id)
          aRanger = [c.etat, c.vidage]; vecteur = c.vecteur; publiees = c.publications
        } catch (e) {
          bloque = false
          for (const b of [annuler, avant, remplacer]) b.disabled = false
          if (caseCle) caseCle.disabled = false
          remplacer.textContent = 'Remplacer'
          texte.textContent = `Le classeur n'a pas pu être remplacé : ${e instanceof Error && e.message ? e.message : 'erreur inconnue'}. Le classeur actuel n'a pas changé.`
          return
        }
      }
      // La clé de ce classeur n'écrit plus rien, ni le Drive (la base va changer)
      this.cle?.suspendre()
      this.drive?.suspendre()
      // Les autres onglets ouverts sur ce classeur cessent d'écrire avant
      // qu'on vide la base (sinon ils y remettraient des bouts de l'ancien) ;
      // ils rechargeront sur sa nouvelle identité
      this.prevenir('remplace', ident.id)
      await attendre(300)
      try {
        await this.app.tableau.remplacerPar(aRanger)
      } catch {
        // La transaction n'a rien changé ; ce qui s'écrirait ici, en revanche,
        // ne s'enregistrerait plus : on recharge
        this.perime = true
        texte.textContent = 'Le classeur n\'a pas pu être remplacé (le navigateur manque peut-être de place). Le classeur actuel n\'a pas changé.'
        this.boutonRecharger(d)
        return
      }
      this.app.oublierVues()
      this.app.arreterSession()
      // L'identité du fichier ; la clé et le Drive de l'ancien contenu
      // s'en vont (ils en restent les sauvegardes) ; puis, si on l'a voulu,
      // ce fichier devient celui de la clé (l'accord du navigateur se
      // demandera au retour, s'il le faut)
      let id = ancien.id, nomFinal = ancien.nom
      let message: string | undefined
      let cle: CleALArrivee | undefined
      if (this.registre && this.fiche) {
        try {
          const vu = Number.isFinite(entete.date) && entete.date > 0 ? entete.date : Date.now()
          await this.registre.changerIdentite(ancien.id, ident.id, x => {
            // Le même id (un fichier du même classeur) : le lien du Drive reste,
            // et son garde-fou de l'histoire ne remplacera pas la copie du
            // classeur d'avant par moins qu'elle
            delete x.cle
            if (ident.id !== ancien.id) delete x.drive
            x.nom = ident.nom
            x.recu = vu
            x.vecteur = vecteur
            x.pages = pages
            x.modifie = Math.max(x.modifie || 0, Date.now())
          })
          id = ident.id; nomFinal = ident.nom
          ecrireDernier({ id, base: ancien.base, nom: nomFinal })
        } catch { /* l'index refuse : le contenu est remplacé, l'identité reste */ }
        if (voulu) ({ message, cle } = await this.garderLaCle(id, poignee!, lu, pages))
      }
      // Une copie qui n'a pas gardé les séances publiées de l'original : on le dit en arrivant
      if (publiees) message = `${message ?? `Classeur ouvert : ${pagesLisibles(pages)}.`} ${TEXTE_PUBLIEES_COPIE}`
      // Ce classeur-ci est dans un fichier depuis la date de celui-ci
      if (Number.isFinite(entete.date) && entete.date > 0) ecrire(cleDernierEnregistrement({ id, base: ancien.base }), String(entete.date))
      try { sessionStorage.setItem(CLE_OUVERT, JSON.stringify({ pages, nom: nomFinal, ...(message ? { message } : {}), ...(cle ? { cle } : {}) })) } catch { /* pas de message au retour */ }
      // La connexion Google suit l'onglet (voir publication/drive.ts)
      passerLaConnexion()
      if (id !== ancien.id) location.href = urlDuClasseur(location.href, id)
      else location.reload()
    })
    document.body.appendChild(d)
    d.showModal()
    annuler.focus()
  }

  /** Après « Remplacer », la case cochée : le fichier ouvert devient celui
   *  de la clé (sa poignée gardée avant le rechargement, sa date et son
   *  vecteur dans la fiche : il a l'identité du classeur, le garde-fou
   *  passe). Rend ce qu'on dira au retour, et, la clé gardée, ce qu'on y
   *  dira d'elle une fois vérifiée (jamais « Il s'enregistre
   *  automatiquement » d'avance). */
  private async garderLaCle(id: string, poignee: PoigneeFichier, lu: FichierLu, pages: number): Promise<{ message: string; cle?: CleALArrivee }> {
    const pasActive = 'Le classeur est ouvert ; l\'enregistrement automatique n\'est pas activé.'
    if (!this.registre) return { message: pasActive }
    try { await this.registre.garderPoignee(id, poignee) } catch (e) {
      return { message: (e as { name?: string } | null)?.name === 'DataCloneError'
        ? `${pasActive} Ce navigateur ne garde pas le fichier après un rechargement.` : pasActive }
    }
    try {
      await this.registre.modifierClasseur(id, x => { x.cle = { nom: poignee.name, date: lu.entete.date, vecteur: lu.vecteur } })
    } catch {
      await this.registre.oublierPoignee(id).catch(() => {})
      return { message: pasActive }
    }
    return { message: `Classeur ouvert : ${pagesLisibles(pages)}.`, cle: { nom: poignee.name } }
  }

  /** Prévient les autres onglets ouverts sur ce classeur : par le canal des
   *  classeurs, et, pour le premier, par celui d'avant (que lit la version
   *  d'avant : elle ne regarde que type). id : l'identité que le classeur
   *  aura (après « Remplacer »). Par les canaux de cette sauvegarde : cet
   *  onglet ne s'entend pas lui-même (classeurs/fichiers.ts s'en sert pour
   *  le classeur ouvert ici). */
  prevenir(raison: RaisonAilleurs, id?: string) {
    const c = this.app.classeur
    const m: MessageClasseur = { type: raison, base: c.base }
    if (id ?? c.id) m.id = id ?? c.id
    try { this.canalClasseur?.postMessage(m) } catch { /* seul onglet */ }
    try { this.canal?.postMessage({ type: 'remplace', raison }) } catch { /* seul onglet */ }
  }

  /** Le classeur ouvert est effacé depuis la bibliothèque de cet onglet (lot
   *  4 C8, voir classeurs/effacer.ts) : les autres onglets sont prévenus par
   *  les canaux de cette sauvegarde (elle ne s'entend pas elle-même : aucune
   *  fenêtre ici, la bibliothèque reste ouverte), la clé n'écrit plus, la
   *  session non plus, et le Tableau coupe son lien avec la base. Ni Ctrl + S
   *  ni Ctrl + O n'y feront plus rien. */
  effaceIci() {
    this.perime = true
    this.cle?.suspendre()
    this.prevenir('supprime')
    this.app.arreterSession()
    this.app.tableau.couper()
  }

  /** Le classeur de cet onglet va être mis à jour ou remplacé depuis un
   *  fichier, depuis sa base (lot 4 C9, voir classeurs/fichiers.ts) : tout ce
   *  que l'onglet y a mis y est déjà (l'appelant l'a attendu) ; plus rien ne
   *  s'y écrit (ni le document, ni la clé), Ctrl + S et Ctrl + O ne font plus
   *  rien, et la page se rechargera. La session (la page, les vues) reste. */
  couperPourUnFichier() {
    this.perime = true
    this.cle?.suspendre()
    this.app.tableau.couper()
  }

  /** Les boutons de la fenêtre laissent la place à un seul (« Recharger »
   *  par défaut) */
  private boutonRecharger(d: HTMLDialogElement, libelle = 'Recharger', aller: () => void = () => location.reload()) {
    const actions = d.querySelector('.actions')!
    const b = Object.assign(document.createElement('button'), { type: 'button', className: 'principal', textContent: libelle })
    b.addEventListener('click', () => { passerLaConnexion(); aller() })
    actions.replaceChildren(b)
    b.focus()
  }

  /** Un autre onglet vient de remplacer ce classeur par un fichier
   *  ('remplace'), ou sa base vient d'être supprimée définitivement
   *  ('supprime', voir Tableau.onCoupee) : ce qu'on écrirait ici ne serait
   *  plus enregistré. On cesse d'écrire, et une fenêtre qu'on ne peut que
   *  quitter (Recharger, vers nouvelId s'il est donné ; ou Ouvrir la
   *  bibliothèque) le dit. Un seul avis, même si les deux canaux parlent. */
  remplaceAilleurs(raison: RaisonAilleurs = 'remplace', nouvelId?: string) {
    if (this.perime) return
    this.perime = true
    this.cle?.suspendre()
    this.app.tableau.couper()
    this.app.arreterSession()
    const nom = this.app.classeur.nom
    const d = document.createElement('dialog')
    d.className = 'dialogue dialogue-ouvrir'
    d.innerHTML = '<h2></h2><div class="corps"><p></p><div class="actions"></div></div>'
    d.querySelector('h2')!.textContent = raison === 'supprime' ? 'Le classeur a été supprimé' : 'Le classeur a changé'
    d.querySelector('p')!.textContent = raison === 'supprime'
      ? `Le classeur « ${nom} » a été supprimé définitivement dans un autre onglet : ce qui serait écrit ici ne serait plus enregistré.`
      : `Le classeur « ${nom} » a été remplacé dans un autre onglet. Rechargez cette page pour le voir : ce qui serait écrit ici ne serait plus enregistré.`
    d.addEventListener('cancel', e => e.preventDefault())
    // Échap tenu ferme quand même une fenêtre dans certains navigateurs : elle revient
    d.addEventListener('close', () => d.showModal())
    document.body.appendChild(d)
    d.showModal()
    if (raison === 'supprime') this.boutonRecharger(d, 'Ouvrir la bibliothèque', () => { location.href = urlBibliotheque(location.href) })
    else if (nouvelId) this.boutonRecharger(d, 'Recharger', () => { location.href = urlDuClasseur(location.href, nouvelId) })
    else this.boutonRecharger(d)
  }

  /** Au démarrage : un classeur vient d'être ouvert depuis un fichier, on le dit */
  annoncerOuverture(): boolean {
    let texte: string | null = null
    try { texte = sessionStorage.getItem(CLE_OUVERT); sessionStorage.removeItem(CLE_OUVERT) } catch { return false }
    const o = lireOuvert(texte)
    if (!o) return false
    const t = o.message ?? `Classeur ouvert : ${pagesLisibles(o.pages)}.`
    // Le fichier ouvert est celui de la clé : ce qu'il en est, une fois vérifiée
    if (o.cle && this.cle) void this.cle.direALArrivee(t, o.cle)
    else this.dire(t)
    return true
  }
}

function enSeance(): boolean { return document.body.classList.contains('en-seance') }
