// =============================================================
// PUBLIER SUR LE DRIVE DU PROFESSEUR
// Le professeur se connecte à Google avec le droit le plus étroit qui
// soit (« drive.file » : MEM teachingtool ne voit que les fichiers qu'il a
// créés lui-même). La séance va, en copie, dans le dossier privé des
// replays de ce compte (« MEM - Replay séances »…) : son relais la sert.
// Rien n'est partagé, ni le fichier, ni le dossier. Le jeton de connexion
// reste en mémoire, et n'est jamais mis dans un lien. Il n'est écrit que le
// temps de passer d'un classeur à l'autre dans le même onglet (changer de
// classeur recharge la page) : dans la mémoire de l'onglet (sessionStorage,
// jamais localStorage), juste avant de partir, et effacé dès l'arrivée
// (passerLaConnexion, reprendreLaConnexion). Fermer l'onglet, recharger la
// page (F5) ou ouvrir un autre onglet demande toujours de se reconnecter.
//
// LES SAUVEGARDES (lot 4 C10) passent par la même connexion (le même
// jeton, le même droit drive.file) : la copie à sens unique d'un classeur
// (son .memc) va dans un AUTRE dossier privé de ce compte (« MEM -
// Sauvegardes »…), marqué autrement que celui des replays, et remplace
// toujours le même fichier (sauvegarder) ; le Drive en garde lui-même les
// versions précédentes, dont on ne retient que les dix dernières
// (elaguerVersions). listerSauvegardes et lireSauvegarde servent à
// « Récupérer une sauvegarde du Drive ». Rien de cela ne touche à publier()
// ni au dossier des replays.
// =============================================================
import { CLIENT_GOOGLE, COMPTES, EXTENSION, EXTENSION_SAUVEGARDE, compteDe } from './comptes'
import { nomSur } from '../fichier'

const API = 'https://www.googleapis.com/drive/v3/files'
const ENVOI = 'https://www.googleapis.com/upload/drive/v3/files'
const A_PROPOS = 'https://www.googleapis.com/drive/v3/about'
const DROIT = 'https://www.googleapis.com/auth/drive.file'
/** La marque d'un dossier privé : sa clé, sa valeur, et ce qu'il range (pour les messages) */
interface MarqueDossier { cle: string; valeur: string; quoi: string }
/** La marque du dossier des replays : le site le retrouve par elle, le relais par son nom */
const MARQUE_DOSSIER: MarqueDossier = { cle: 'memReplay', valeur: 'dossier-v1', quoi: 'des replays' }
/** La marque du dossier des sauvegardes (lot 4 C10) : à lui, jamais celle
 *  des replays ; le dossier des replays n'est donc jamais pris pour lui,
 *  ni lui pour celui des replays */
const MARQUE_SAUVEGARDES: MarqueDossier = { cle: 'memSauvegardes', valeur: 'dossier-v1', quoi: 'des sauvegardes' }
/** La marque d'une sauvegarde, et celle du classeur qu'elle copie */
const MARQUE_SAUVEGARDE = { cle: 'memSauvegarde', valeur: 'v1' }
const MARQUE_CLASSEUR = 'memClasseur'
/** L'appareil (le navigateur) qui l'a envoyée, et la date du contenu envoyé
 *  (le dernier changement qu'il contient, ms) : le garde-fou de deux ordinateurs */
const MARQUE_ORIGINE = 'memOrigine'
const MARQUE_T = 'memT'
/** Ce que dit une sauvegarde à qui la regarde dans Google Drive */
export const DESCRIPTION_SAUVEGARDE = 'Sauvegarde automatique de MEM teachingtool. Pour l\'ouvrir : Bibliothèque → ⋯ → Récupérer une sauvegarde du Drive.'
/** Jusqu'à cette taille, une seule requête (multipart) ; au-delà, l'envoi reprenable */
export const ENVOI_SIMPLE_MAX = 5 * 1024 * 1024
/** Le Drive garde les versions précédentes : on n'en retient que tant */
export const VERSIONS_GARDEES = 10
/** Et le compte (« mem », « lfb ») dont il est le dossier : celui qu'un essai
 *  avec le mauvais compte Google a créé n'est jamais repris par l'autre compte */
const MARQUE_COMPTE = 'memCompte'
/** La marque des séances publiées */
const MARQUE = { cle: 'memRevoir', valeur: 'v1' }
const CHAMPS = 'id,name,mimeType,parents,trashed,appProperties,permissions(id,type,role)'
/** Une sauvegarde : aussi sa taille et sa date */
const CHAMPS_SAUVEGARDE = 'id,name,mimeType,parents,trashed,appProperties,size,modifiedTime,permissions(id,type,role)'

interface Fiche { id: string; name: string; mimeType: string; parents?: string[]; trashed?: boolean; appProperties?: Record<string, string>; permissions?: { id: string; type: string; role: string }[]; size?: string; modifiedTime?: string }

declare global {
  interface Window { google?: { accounts?: { oauth2?: {
    initTokenClient(o: { client_id: string; scope: string; include_granted_scopes?: boolean; login_hint?: string; callback: (r: { access_token?: string; expires_in?: number; error?: string }) => void; error_callback?: (e: { type?: string }) => void }): { requestAccessToken(o?: { prompt?: string }): void }
    hasGrantedAllScopes(r: unknown, ...s: string[]): boolean
  } } } }
}

// Le jeton est celui d'UN compte : changer de compte demande de se reconnecter
let jeton = '', expiration = 0, compteDuJeton = '', courriel = ''
export const connecte = (compte: string) => !!jeton && compteDuJeton === compte && Date.now() < expiration
/** L'adresse du compte Google connecté pour `compte` ('' : pas connecté, ou inconnue) */
export const courrielDe = (compte: string) => connecte(compte) ? courriel : ''
export function deconnecter() { jeton = ''; expiration = 0; compteDuJeton = ''; courriel = ''; oublierLeRelais(); signalerConnexion() }

/** La clé de l'onglet (sessionStorage) où la connexion attend le temps d'un
 *  changement de classeur */
export const CLE_RELAIS_GOOGLE = 'mem-teachingtool-connexion-google'
/** Au-delà de cette durée de validité, ce n'est pas un jeton de Google
 *  (une heure) : on ne le reprend pas */
const VALIDITE_MAX = 2 * 3600_000
function oublierLeRelais() { try { sessionStorage.removeItem(CLE_RELAIS_GOOGLE) } catch { /* rien de gardé */ } }

/** Juste avant de partir vers un autre classeur dans cet onglet (la page se
 *  recharge) : la connexion valable attend la page suivante dans la mémoire
 *  de l'onglet, qui l'efface en arrivant. Sans connexion : rien. Le jeton
 *  dure environ une heure ; changer de classeur ne doit pas demander de se
 *  reconnecter (la copie sur le Drive continue sans un clic). */
export function passerLaConnexion() {
  if (!jeton || !compteDuJeton || Date.now() >= expiration) { oublierLeRelais(); return }
  try { sessionStorage.setItem(CLE_RELAIS_GOOGLE, JSON.stringify({ jeton, expiration, compte: compteDuJeton, courriel })) } catch { /* l'onglet se reconnectera d'un clic */ }
}

/** En arrivant : la connexion passée par la page d'avant (passerLaConnexion),
 *  effacée aussitôt de la mémoire de l'onglet ; reprise seulement si elle
 *  vaut encore, pour un compte connu. Rend le compte repris ('' : aucun). */
export function reprendreLaConnexion(): string {
  let o: { jeton?: unknown; expiration?: unknown; compte?: unknown; courriel?: unknown } | null = null
  try {
    const t = sessionStorage.getItem(CLE_RELAIS_GOOGLE)
    if (t === null) return ''
    sessionStorage.removeItem(CLE_RELAIS_GOOGLE)
    o = JSON.parse(t)
  } catch { oublierLeRelais(); return '' }
  const maintenant = Date.now()
  if (!o || typeof o.jeton !== 'string' || !o.jeton || typeof o.compte !== 'string' || !compteDe(o.compte)) return ''
  if (typeof o.expiration !== 'number' || !(o.expiration > maintenant) || o.expiration - maintenant > VALIDITE_MAX) return ''
  if (jeton) return ''   // déjà connecté dans cette page : on garde
  jeton = o.jeton; expiration = o.expiration; compteDuJeton = o.compte
  courriel = typeof o.courriel === 'string' ? o.courriel : ''
  return compteDuJeton
}
reprendreLaConnexion()

/** Ceux qui suivent la connexion (la copie sur le Drive, lot 4 C10 : Publier
 *  vient de se connecter, ou la connexion est tombée) ; rien d'autre ne change */
const suiveurs: (() => void)[] = []
export function surConnexion(f: () => void) { suiveurs.push(f) }
function signalerConnexion() { for (const f of suiveurs) { try { f() } catch { /* le suiveur se débrouille */ } } }

/** Une erreur de Google Drive, avec son code (404 : le fichier n'existe pas ;
 *  401 : pas ou plus connecté) et la raison que Google donne
 *  (« storageQuotaExceeded » : le Drive est plein) */
export class ErreurDrive extends Error {
  constructor(message: string, readonly statut: number, readonly raison = '') { super(message); this.name = 'ErreurDrive' }
}
let bibliotheque: 'attente' | 'prete' | 'echec' = 'attente'

/** Charger la bibliothèque de connexion Google à l'avance : au clic, il faut
 *  pouvoir ouvrir la fenêtre tout de suite (sinon le navigateur la bloque) */
export function preparerGoogle() {
  const deja = document.getElementById('google-identite')
  if (deja && bibliotheque !== 'echec') return
  deja?.remove()
  bibliotheque = 'attente'
  const s = document.createElement('script')
  s.id = 'google-identite'
  s.src = 'https://accounts.google.com/gsi/client'
  s.async = true
  s.onload = () => { bibliotheque = 'prete' }
  s.onerror = () => { bibliotheque = 'echec' }
  document.head.appendChild(s)
}

/** Se connecter au compte `compte` : à appeler directement depuis un clic.
 *  Google montre toujours la liste de ses comptes ; `indice` (l'adresse du
 *  dernier compte utilisé) le met en avant. prompt : 'select_account' (la
 *  liste, comme Publier) ; '' (la copie sur le Drive qui se reconnecte, lot
 *  4 C10, avec l'indice d'un compte déjà choisi) laisse Google reprendre ce
 *  compte sans redemander, s'il le peut. */
export function connecter(compte: string, indice = '', prompt = 'select_account'): Promise<void> {
  deconnecter()
  return new Promise((ok, ko) => {
    if (!CLIENT_GOOGLE) return ko(new Error('La connexion à Google n\'est pas encore réglée sur ce site (identifiant client à créer, voir le mode d\'emploi). En attendant, enregistrez le fichier séance.'))
    if (location.protocol === 'file:') return ko(new Error('La connexion à Google ne fonctionne pas depuis un fichier ouvert sur l\'ordinateur. Utilisez MEM teachingtool en ligne (mathsetmoi.github.io), ou enregistrez le fichier séance.'))
    const oauth = window.google?.accounts?.oauth2
    if (!oauth) {
      const echec = bibliotheque === 'echec'
      preparerGoogle()
      return ko(new Error(echec
        ? 'La connexion Google ne se charge pas (réseau filtré ou bloqueur de publicité ?). Vérifiez la connexion, puis réessayez.'
        : 'La connexion Google se charge : cliquez à nouveau dans quelques secondes.'))
    }
    const client = oauth.initTokenClient({
      client_id: CLIENT_GOOGLE, scope: DROIT, include_granted_scopes: false,
      ...(indice ? { login_hint: indice } : {}),
      error_callback: e => ko(new Error(e?.type === 'popup_failed_to_open'
        ? 'Le navigateur a bloqué la fenêtre de connexion Google : autorisez les fenêtres pour ce site, puis réessayez.'
        : 'La fenêtre de connexion Google a été fermée avant la fin. Si Google y affichait « Accès bloqué » ou « origin_mismatch », c\'est que ce site n\'est pas encore autorisé dans la console Google Cloud (voir le mode d\'emploi).')),
      callback: r => {
        if (r.error || !r.access_token || !oauth.hasGrantedAllScopes(r, DROIT)) return ko(new Error('Pour publier, autorisez MEM teachingtool à gérer les fichiers qu\'il crée sur votre Drive.'))
        jeton = r.access_token
        expiration = Date.now() + (Number(r.expires_in) || 3600) * 1000 - 60_000
        compteDuJeton = compte
        // Quel compte a-t-il choisi ? Pour le lui montrer : on publie sinon à l'aveugle
        appeler<{ user?: { emailAddress?: string } }>(`${A_PROPOS}?fields=user(emailAddress)`)
          .then(a => { if (compteDuJeton === compte) courriel = a?.user?.emailAddress ?? '' }, () => {})
          .finally(() => { ok(); signalerConnexion() })
      },
    })
    client.requestAccessToken({ prompt })
  })
}

// Google a des défaillances passagères : on réessaie en attendant de plus en plus
const PASSAGER = [429, 500, 502, 503, 504]
const patienter = (ms: number) => new Promise(r => setTimeout(r, ms))

/** Une requête à Google, avec le jeton ; la réponse quand elle est bonne.
 *  essais : combien de fois au plus (une défaillance passagère se réessaie,
 *  en attendant de plus en plus). Les erreurs sont des ErreurDrive (sauf
 *  la dernière défaillance passagère, et le réseau : TypeError). */
async function demander(url: string, options: RequestInit = {}, essais = 4): Promise<Response> {
  if (!jeton || Date.now() >= expiration) throw new ErreurDrive('Reconnectez votre compte Google pour publier.', 401)
  let derniere: ErreurDrive | null = null
  for (let essai = 0; essai < essais; essai++) {
    if (essai) await patienter(600 * 2 ** (essai - 1) + Math.random() * 400)
    const r = await fetch(url, { ...options, cache: 'no-store', credentials: 'omit', headers: { ...(options.headers as Record<string, string>), Authorization: 'Bearer ' + jeton } })
    if (r.ok) return r
    if (r.status === 401) { deconnecter(); throw new ErreurDrive('La connexion Google a expiré : reconnectez-vous, puis réessayez.', 401) }
    const corps = await r.json().catch(() => ({})) as { error?: { message?: string; errors?: { reason?: string }[] } }
    const raisons = (corps.error?.errors ?? []).map(e => e.reason ?? '')
    derniere = new ErreurDrive(corps.error?.message || `Google Drive refuse la demande (${r.status}).`, r.status, raisons[0] ?? '')
    // Une limite de débit (403) se passe aussi en attendant
    const debit = r.status === 403 && raisons.some(x => /rateLimitExceeded/.test(x))
    if (!PASSAGER.includes(r.status) && !debit) throw derniere
  }
  throw new Error(`Google Drive n'a pas répondu correctement, ${essais > 1 ? `${['', 'une', 'deux', 'trois', 'quatre'][essais] ?? essais} fois de suite` : 'cette fois'} (« ${derniere?.message} »). La panne est de son côté : réessayez dans un moment.`)
}

async function appeler<T = unknown>(url: string, options: RequestInit = {}): Promise<T> {
  const r = await demander(url, options)
  return (r.status === 204 ? null : await r.json()) as T
}
const enJson = (method: string, corps: unknown): RequestInit => ({ method, headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(corps) })
const fiche = (id: string) => appeler<Fiche>(`${API}/${encodeURIComponent(id)}?fields=${encodeURIComponent(CHAMPS)}`)

/** Un dossier privé : seul son propriétaire y a accès (ni « tout le monde », ni « le domaine ») */
const estPrive = (d: Fiche) => d.mimeType === 'application/vnd.google-apps.folder' && !d.trashed
  && Array.isArray(d.permissions) && d.permissions.length > 0 && d.permissions.every(p => p.type === 'user' && p.role === 'owner')
const partage = (f: Fiche) => (f.permissions ?? []).some(p => p.type === 'anyone' || p.type === 'domain')

/** Le compte (« mem », « lfb ») dont `nom` est le dossier des replays ou
 *  celui des sauvegardes */
const compteDuDossier = (nom: string) => COMPTES.find(c => c.dossier === nom || c.sauvegardes === nom)?.cle ?? nom

/** Le dossier privé `nom` de ce Drive, reconnu à sa marque (celle des
 *  replays d'abord, celle des sauvegardes pour le lot 4 C10) et à celle de
 *  son compte. Renommé à la main, il reprend son nom ; partagé, on refuse
 *  (et on n'en crée pas un de plus) ; null s'il n'existe pas. */
async function trouverDossier(nom: string, marque: MarqueDossier): Promise<Fiche | null> {
  const compte = compteDuDossier(nom)
  const q = `trashed=false and mimeType='application/vnd.google-apps.folder' and appProperties has { key='${marque.cle}' and value='${marque.valeur}' }`
    + ` and appProperties has { key='${MARQUE_COMPTE}' and value='${compte.replace(/'/g, "\\'")}' }`
  const r = await appeler<{ files?: Fiche[] }>(`${API}?${new URLSearchParams({ q, fields: `files(${CHAMPS})`, pageSize: '50' })}`)
  // (une marque à elle : celle de l'autre sorte de dossier ne compte jamais)
  const marques = (r.files ?? []).filter(f => f.appProperties?.[marque.cle] === marque.valeur)
  const prive = marques.find(estPrive)
  if (prive) {
    // Renommé à la main dans Drive : le relais ne le reconnaîtrait plus
    if (prive.name !== nom) {
      await appeler(`${API}/${encodeURIComponent(prive.id)}`, enJson('PATCH', { name: nom }))
      prive.name = nom
    }
    return prive
  }
  // Un dossier existe, mais il a été partagé : on ne met rien dedans, et
  // on n'en crée pas un de plus à chaque essai
  const ouvert = marques[0]
  if (ouvert) throw new Error(`Le dossier « ${ouvert.name} » de ce Drive est partagé. Dans Google Drive, remettez son accès sur « Limité » (seulement vous), puis réessayez.`)
  return null
}

/** Le dossier des replays (ou, avec sa marque, celui des sauvegardes) du
 *  compte dont `nom` est le dossier, dans ce Drive, créé au besoin (cree :
 *  il vient de l'être) */
async function dossierPrive(nom: string, marque: MarqueDossier = MARQUE_DOSSIER): Promise<{ dossier: Fiche; cree: boolean }> {
  const trouve = await trouverDossier(nom, marque)
  if (trouve) return { dossier: trouve, cree: false }
  // Créé privé, même dans un établissement dont les fichiers sont visibles par défaut de tout le domaine
  const cree = await appeler<{ id: string }>(`${API}?fields=id&ignoreDefaultVisibility=true`, enJson('POST', {
    name: nom, mimeType: 'application/vnd.google-apps.folder', appProperties: { [marque.cle]: marque.valeur, [MARQUE_COMPTE]: compteDuDossier(nom) },
  }))
  const d = await fiche(cree.id)
  if (!estPrive(d)) throw new Error(`Le dossier ${marque.quoi} doit rester privé : vérifiez ses autorisations dans Google Drive.`)
  return { dossier: d, cree: true }
}

/** Envoi du contenu avec ses métadonnées (une seule requête) */
function envoiMultipart(meta: unknown, texte: string) {
  const borne = 'mem_' + Math.random().toString(36).slice(2) + Date.now().toString(36)
  const corps = new Blob([
    `--${borne}\r\nContent-Type: application/json; charset=UTF-8\r\n\r\n`, JSON.stringify(meta),
    `\r\n--${borne}\r\nContent-Type: application/json\r\n\r\n`, texte,
    `\r\n--${borne}--`,
  ], { type: `multipart/related; boundary=${borne}` })
  return { headers: { 'Content-Type': corps.type }, body: corps }
}

/** Publie (ou met à jour) une séance dans le dossier des replays `nomDossier`.
 *  `cle` désigne la séance (compte et heure de début) : elle permet de
 *  retrouver sa publication depuis un autre onglet. `verifier` lit la séance
 *  comme l'élève la lira, avant de rendre le lien : un lien mort ne part pas. */
export async function publier(nomDossier: string, nom: string, texte: string, cle: string, idExistant: string | null, verifier: (id: string) => Promise<void>):
  Promise<{ id: string; miseAJour: boolean; restauree: boolean }> {
  if (texte.length > 4.5 * 1024 * 1024) throw new Error('La séance est trop lourde pour être publiée (plus de 4,5 Mo) : retirez des pages ou des images.')
  const { dossier, cree: dossierCree } = await dossierPrive(nomDossier)
  const infos = { name: nom.replace(/[\\/:*?"<>|]+/g, ' ').trim().slice(0, 120) + EXTENSION, appProperties: { [MARQUE.cle]: MARQUE.valeur, memSeance: cle.slice(0, 100) } }

  // Mettre à jour plutôt que refaire : le lien collé dans Pronote reste bon
  let existant: Fiche | null = null, restauree = false
  if (idExistant) {
    try {
      const f = await fiche(idExistant)
      if (f.appProperties?.[MARQUE.cle] === MARQUE.valeur && f.parents?.includes(dossier.id)) existant = f
    } catch (e) {
      // Seul « le fichier n'existe plus » autorise à en créer un autre (nouveau lien) ;
      // une panne ou un refus arrête tout, pour ne pas abandonner le lien déjà donné
      if (!(e instanceof ErreurDrive && e.statut === 404)) throw e
    }
  }
  // Publiée depuis un autre onglet ou un autre ordinateur : on la retrouve sur le Drive
  if (!existant) {
    const q = `trashed=false and '${dossier.id}' in parents and appProperties has { key='memSeance' and value='${cle.slice(0, 100).replace(/'/g, "\\'")}' }`
    const r = await appeler<{ files?: Fiche[] }>(`${API}?${new URLSearchParams({ q, fields: `files(${CHAMPS})`, pageSize: '5' })}`)
    existant = (r.files ?? []).find(f => f.appProperties?.[MARQUE.cle] === MARQUE.valeur) ?? null
  }
  if (existant && partage(existant)) throw new Error('Ce fichier est partagé sur Drive (« tout le monde » ou « le domaine ») : retirez ce partage, le relais suffit.')
  let id: string, cree = false
  if (existant) {
    // Mise à la corbeille entre-temps : on la restaure, et le lien déjà donné remarche
    if (existant.trashed) { await appeler(`${API}/${encodeURIComponent(existant.id)}`, enJson('PATCH', { trashed: false })); restauree = true }
    id = (await appeler<{ id: string }>(`${ENVOI}/${encodeURIComponent(existant.id)}?uploadType=multipart&fields=id`, { method: 'PATCH', ...envoiMultipart(infos, texte) })).id
  } else {
    id = (await appeler<{ id: string }>(`${ENVOI}?uploadType=multipart&fields=id&ignoreDefaultVisibility=true`, { method: 'POST', ...envoiMultipart({ ...infos, mimeType: 'application/json', parents: [dossier.id] }, texte) })).id
    cree = true
  }
  try {
    if (partage(await fiche(id))) throw new Error('Le fichier publié est partagé sur Drive : retirez ce partage, le relais suffit.')
    await verifier(id)
    return { id, miseAJour: !cree, restauree }
  } catch (e) {
    // On ne jette que ce qu'on vient de créer : une séance mise à jour a déjà un lien qui circule
    if (cree) {
      try {
        await appeler(`${API}/${encodeURIComponent(id)}`, enJson('PATCH', { trashed: true }))
        // Le dossier, créé pour cette séance, n'a plus rien : on ne le laisse pas
        // dans un Drive qui n'est peut-être pas celui du compte (mauvais compte Google)
        if (dossierCree) await appeler(`${API}/${encodeURIComponent(dossier.id)}`, enJson('PATCH', { trashed: true })).catch(() => {})
      }
      catch { if (e instanceof Error) e.message += ` (Une copie « ${infos.name} » est restée dans le dossier « ${dossier.name} » de votre Drive : supprimez-la.)` }
    }
    throw e
  }
}

// =============================================================
// LES SAUVEGARDES DES CLASSEURS (lot 4 C10)
// =============================================================

/** La version en ligne (ou celle de développement) peut se connecter à
 *  Google ; la version « un seul fichier » (clé USB, file://) non. C'est la
 *  règle de Publication.enLigne (fenetre.ts), reprise ici telle quelle pour
 *  la copie sur le Drive (Publier n'en change pas). */
export function versionEnLigne(): boolean {
  const servie = location.protocol === 'https:' || location.hostname === 'localhost' || location.hostname === '127.0.0.1'
  return servie && (import.meta.env.DEV || import.meta.env.VITE_EN_LIGNE === '1')
}

/** Le compte Google avec lequel on a publié la dernière fois dans `compte`
 *  (ce que retient Publier sur cet ordinateur, sous cette clé, voir
 *  fenetre.ts) : la copie sur le Drive le propose à Google ('' : aucun) */
export function dernierCompteGoogle(compte: string): string {
  try { return localStorage.getItem('tableau-mem:compte-google:' + compte) ?? '' } catch { return '' }
}

/** Le contenu d'un fichier binaire avec ses métadonnées (une seule requête) */
function envoiBinaire(meta: unknown, fichier: Blob) {
  const borne = 'mem_' + Math.random().toString(36).slice(2) + Date.now().toString(36)
  const corps = new Blob([
    `--${borne}\r\nContent-Type: application/json; charset=UTF-8\r\n\r\n`, JSON.stringify(meta),
    `\r\n--${borne}\r\nContent-Type: application/octet-stream\r\n\r\n`, fichier,
    `\r\n--${borne}--`,
  ], { type: `multipart/related; boundary=${borne}` })
  return { headers: { 'Content-Type': corps.type }, body: corps }
}

/** Envoie le fichier : un nouveau (POST, dans le dossier : parents est dans
 *  meta) ou le même mis à jour (PATCH id). Jusqu'à 5 Mo en une requête
 *  (multipart) ; au-delà, l'envoi reprenable : une requête ouvre la session
 *  (ses métadonnées, la taille), une autre envoie le fichier. La session est
 *  l'en-tête Location quand le navigateur le laisse lire, sinon elle se
 *  refait avec l'identifiant d'envoi de Google (X-GUploader-UploadID). Le
 *  fichier n'est envoyé qu'une fois : en cas de panne, la copie suivante
 *  recommence. Rend l'id du fichier. */
async function envoyer(id: string | null, meta: Record<string, unknown>, fichier: Blob, signal?: AbortSignal): Promise<string> {
  const methode = id ? 'PATCH' : 'POST'
  const cible = id ? `${ENVOI}/${encodeURIComponent(id)}` : ENVOI
  const prive = id ? '' : '&ignoreDefaultVisibility=true'
  if (fichier.size <= ENVOI_SIMPLE_MAX) {
    const r = await appeler<{ id: string }>(`${cible}?uploadType=multipart&fields=id${prive}`, { method: methode, signal, ...envoiBinaire(meta, fichier) })
    return r.id
  }
  const ouverte = await demander(`${cible}?uploadType=resumable&fields=id${prive}`, {
    method: methode, signal, body: JSON.stringify(meta),
    headers: { 'Content-Type': 'application/json; charset=UTF-8', 'X-Upload-Content-Type': 'application/octet-stream', 'X-Upload-Content-Length': String(fichier.size) },
  })
  let session = ouverte.headers.get('Location')
  if (!session) {
    const envoi = ouverte.headers.get('X-GUploader-UploadID')
    if (!envoi) throw new Error('Google Drive n\'a pas ouvert l\'envoi du fichier : réessayez dans un moment.')
    session = `${cible}?uploadType=resumable&upload_id=${encodeURIComponent(envoi)}`
  }
  const r = await demander(session, { method: 'PUT', signal, headers: { 'Content-Type': 'application/octet-stream' }, body: fichier }, 1)
  const fait = await r.json().catch(() => ({})) as { id?: string }
  if (!fait.id) throw new Error('Google Drive n\'a pas confirmé l\'envoi du fichier : réessayez dans un moment.')
  return fait.id
}

/** Une sauvegarde à faire : le compte (« mem », « lfb »), le classeur (son
 *  id, son nom), son fichier .memc ; idExistant : le fichier de la dernière
 *  copie (null : pas encore, ou sur un autre compte) ; origine : l'appareil
 *  qui l'envoie ; t : la date du contenu envoyé (son dernier changement) ;
 *  recu : quand ce classeur est arrivé d'un fichier ici (sinon sa création) ;
 *  forcer : « Remplacer quand même » (sans le garde-fou des deux ordinateurs) */
export interface SauvegardeAFaire {
  compte: string; classeur: string; nom: string; fichier: Blob; idExistant: string | null
  origine: string; t: number; recu: number; forcer?: boolean; signal?: AbortSignal
}
/** Ce qui s'est passé : l'id du fichier, s'il vient d'être créé ; conflit :
 *  il a été mis à jour depuis un autre ordinateur, avec un contenu plus
 *  récent que ce classeur ici (t : la date de son contenu) : il n'est pas
 *  remplacé */
export interface SauvegardeFaite { id: string; cree: boolean; conflit?: { t: number } }

/** La copie d'un classeur sur le Drive, dans le dossier privé des
 *  sauvegardes du compte (« MEM - Sauvegardes »…), créé au besoin.
 *  Toujours LE MÊME fichier : celui de la dernière copie (sauf s'il n'existe
 *  plus, est à la corbeille ou a quitté le dossier), sinon celui que le
 *  dossier a pour ce classeur (une copie faite depuis un autre onglet ou un
 *  autre ordinateur), sinon un nouveau. Le Drive garde lui-même les
 *  versions précédentes ; on ne supprime jamais le fichier.
 *  Le garde-fou des deux ordinateurs : un fichier mis à jour depuis un AUTRE
 *  appareil, avec un contenu plus récent que l'arrivée de ce classeur ici,
 *  n'est pas remplacé (le soir à la maison, le matin au lycée sur le
 *  classeur de la veille). Le poste remis à zéro qui rouvre le matin le
 *  fichier de la clé (recu : sa date) remplace la copie de la veille. */
export async function sauvegarder(o: SauvegardeAFaire): Promise<SauvegardeFaite> {
  const c = compteDe(o.compte)
  if (!c) throw new Error('Ce compte n\'existe pas.')
  const { dossier } = await dossierPrive(c.sauvegardes, MARQUE_SAUVEGARDES)
  const lireFiche = (id: string) => appeler<Fiche>(`${API}/${encodeURIComponent(id)}?fields=${encodeURIComponent(CHAMPS_SAUVEGARDE)}`, { signal: o.signal })
  const estLaSienne = (f: Fiche) => !f.trashed && !!f.parents?.includes(dossier.id)
    && f.appProperties?.[MARQUE_SAUVEGARDE.cle] === MARQUE_SAUVEGARDE.valeur && f.appProperties?.[MARQUE_CLASSEUR] === o.classeur
  let existant: Fiche | null = null
  if (o.idExistant) {
    try {
      const f = await lireFiche(o.idExistant)
      if (estLaSienne(f)) existant = f
    } catch (e) {
      // Seul « le fichier n'existe plus » permet d'en chercher ou d'en créer un autre
      if (!(e instanceof ErreurDrive && e.statut === 404)) throw e
    }
  }
  if (!existant) {
    const q = `trashed=false and '${dossier.id}' in parents and appProperties has { key='${MARQUE_CLASSEUR}' and value='${o.classeur.replace(/'/g, "\\'")}' }`
    const r = await appeler<{ files?: Fiche[] }>(`${API}?${new URLSearchParams({ q, fields: `files(${CHAMPS_SAUVEGARDE})`, pageSize: '10' })}`, { signal: o.signal })
    // Deux ordinateurs qui ont créé chacun le sien en même temps : le plus récent
    existant = (r.files ?? []).filter(estLaSienne).sort((a, b) => (Date.parse(b.modifiedTime ?? '') || 0) - (Date.parse(a.modifiedTime ?? '') || 0))[0] ?? null
  }
  if (existant && partage(existant)) throw new Error(`La sauvegarde « ${existant.name} » est partagée sur Drive : retirez ce partage (elle contient tout le classeur, même ce qui a été effacé).`)
  if (existant && !o.forcer) {
    const origine = existant.appProperties?.[MARQUE_ORIGINE] ?? ''
    const t = Number(existant.appProperties?.[MARQUE_T])
    // Une date illisible : on ne sait pas, on ne remplace pas
    if (origine !== o.origine && (!Number.isFinite(t) || t > o.recu)) return { id: existant.id, cree: false, conflit: { t: Number.isFinite(t) ? t : 0 } }
  }
  const meta: Record<string, unknown> = {
    name: nomDeSauvegarde(o.nom), mimeType: 'application/octet-stream', description: DESCRIPTION_SAUVEGARDE,
    appProperties: { [MARQUE_SAUVEGARDE.cle]: MARQUE_SAUVEGARDE.valeur, [MARQUE_CLASSEUR]: o.classeur, [MARQUE_ORIGINE]: o.origine.slice(0, 40), [MARQUE_T]: String(Math.round(o.t)) },
  }
  if (existant) return { id: await envoyer(existant.id, meta, o.fichier, o.signal), cree: false }
  const id = await envoyer(null, { ...meta, parents: [dossier.id] }, o.fichier, o.signal)
  // Créée privée (ignoreDefaultVisibility) ; un établissement qui la
  // partagerait quand même avec tout le domaine : on ne la laisse pas
  if (partage(await lireFiche(id))) {
    await appeler(`${API}/${encodeURIComponent(id)}`, enJson('PATCH', { trashed: true })).catch(() => {})
    throw new Error('La sauvegarde créée sur le Drive était visible de tout l\'établissement : elle a été mise à la corbeille. Vérifiez les réglages de partage de ce Drive.')
  }
  return { id, cree: true }
}

/** Le nom de la sauvegarde dans Google Drive : celui du classeur, rendu
 *  sûr comme tous les noms de fichiers (fichier.ts, nomSur), et .memc */
export const nomDeSauvegarde = (nom: string) => nomSur(nom) + EXTENSION_SAUVEGARDE

/** Le Drive garde les versions précédentes d'un fichier (et les compte dans
 *  la place du compte, pour un fichier binaire) : on n'en retient que les
 *  `garder` dernières (et jamais on n'efface la dernière, ni une version que
 *  le professeur a choisi de garder dans Google Drive). Chaque version a
 *  toute l'histoire du classeur d'avant elle : dix suffisent. Au mieux : ses
 *  erreurs sont ignorées. Rend le nombre de versions effacées. */
export async function elaguerVersions(id: string, garder = VERSIONS_GARDEES): Promise<number> {
  const versions: { id: string; modifiedTime?: string; keepForever?: boolean }[] = []
  try {
    let page = ''
    for (let n = 0; n < 10; n++) {
      const p = new URLSearchParams({ fields: 'nextPageToken,revisions(id,modifiedTime,keepForever)', pageSize: '200' })
      if (page) p.set('pageToken', page)
      const r = await appeler<{ revisions?: typeof versions; nextPageToken?: string }>(`${API}/${encodeURIComponent(id)}/revisions?${p}`)
      versions.push(...(r?.revisions ?? []))
      page = r?.nextPageToken ?? ''
      if (!page) break
    }
  } catch { return 0 }
  // Dans l'ordre du temps (Google les rend ainsi ; on ne s'y fie pas)
  const quand = (v: { modifiedTime?: string }) => Date.parse(v.modifiedTime ?? '') || 0
  versions.sort((a, b) => quand(a) - quand(b))
  const derniere = versions[versions.length - 1]
  const effacables = versions.filter(v => !v.keepForever && v !== derniere)
  const aGarder = Math.max(0, garder - 1)   // la dernière compte parmi les gardées
  let effacees = 0
  for (const v of effacables.slice(0, Math.max(0, effacables.length - aGarder))) {
    try { await appeler(`${API}/${encodeURIComponent(id)}/revisions/${encodeURIComponent(v.id)}`, { method: 'DELETE' }); effacees++ } catch { /* au mieux */ }
  }
  return effacees
}

/** Une sauvegarde du Drive, telle que « Récupérer une sauvegarde du Drive »
 *  la montre : son nom, sa date et sa taille, le classeur qu'elle copie */
export interface SauvegardeListee { id: string; nom: string; modifie: number; taille: number; classeur: string }

/** Les sauvegardes du dossier des sauvegardes de ce compte, la plus
 *  récente d'abord ; aucune s'il n'y a pas (encore) de dossier : on n'en
 *  crée pas pour regarder */
export async function listerSauvegardes(compte: string): Promise<SauvegardeListee[]> {
  const c = compteDe(compte)
  if (!c) return []
  const dossier = await trouverDossier(c.sauvegardes, MARQUE_SAUVEGARDES)
  if (!dossier) return []
  const q = `trashed=false and '${dossier.id}' in parents and appProperties has { key='${MARQUE_SAUVEGARDE.cle}' and value='${MARQUE_SAUVEGARDE.valeur}' }`
  const toutes: SauvegardeListee[] = []
  let page = ''
  for (let n = 0; n < 20; n++) {
    const p = new URLSearchParams({ q, fields: 'nextPageToken,files(id,name,size,modifiedTime,trashed,appProperties)', pageSize: '100', orderBy: 'modifiedTime desc' })
    if (page) p.set('pageToken', page)
    const r = await appeler<{ files?: Fiche[]; nextPageToken?: string }>(`${API}?${p}`)
    for (const f of r.files ?? []) {
      if (f.trashed || f.appProperties?.[MARQUE_SAUVEGARDE.cle] !== MARQUE_SAUVEGARDE.valeur) continue
      toutes.push({ id: f.id, nom: f.name, modifie: Date.parse(f.modifiedTime ?? '') || 0, taille: Number(f.size) || 0, classeur: f.appProperties?.[MARQUE_CLASSEUR] ?? '' })
    }
    page = r.nextPageToken ?? ''
    if (!page) break
  }
  return toutes.sort((a, b) => b.modifie - a.modifie)
}

/** Le contenu d'une sauvegarde (son .memc), tel quel */
export async function lireSauvegarde(id: string): Promise<Uint8Array> {
  const r = await demander(`${API}/${encodeURIComponent(id)}?alt=media`)
  return new Uint8Array(await r.arrayBuffer())
}
