// =============================================================
// PUBLIER SUR LE DRIVE DU PROFESSEUR
// Le professeur se connecte à Google avec le droit le plus étroit qui
// soit (« drive.file » : MEM teachingtool ne voit que les fichiers qu'il a
// créés lui-même). La séance va, en copie, dans le dossier privé des
// replays de ce compte (« MEM - Replay séances »…) : son relais la sert.
// Rien n'est partagé, ni le fichier, ni le dossier. Le jeton de connexion
// reste en mémoire, et n'est jamais écrit ni mis dans un lien.
// =============================================================
import { CLIENT_GOOGLE, COMPTES, EXTENSION } from './comptes'

const API = 'https://www.googleapis.com/drive/v3/files'
const ENVOI = 'https://www.googleapis.com/upload/drive/v3/files'
const A_PROPOS = 'https://www.googleapis.com/drive/v3/about'
const DROIT = 'https://www.googleapis.com/auth/drive.file'
/** La marque du dossier des replays : le site le retrouve par elle, le relais par son nom */
const MARQUE_DOSSIER = { cle: 'memReplay', valeur: 'dossier-v1' }
/** Et le compte (« mem », « lfb ») dont il est le dossier : celui qu'un essai
 *  avec le mauvais compte Google a créé n'est jamais repris par l'autre compte */
const MARQUE_COMPTE = 'memCompte'
/** La marque des séances publiées */
const MARQUE = { cle: 'memRevoir', valeur: 'v1' }
const CHAMPS = 'id,name,mimeType,parents,trashed,appProperties,permissions(id,type,role)'

interface Fiche { id: string; name: string; mimeType: string; parents?: string[]; trashed?: boolean; appProperties?: Record<string, string>; permissions?: { id: string; type: string; role: string }[] }

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
export function deconnecter() { jeton = ''; expiration = 0; compteDuJeton = ''; courriel = '' }

/** Une erreur de Google Drive, avec son code (404 : le fichier n'existe pas) */
class ErreurDrive extends Error { constructor(message: string, readonly statut: number) { super(message) } }
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
 *  dernier compte utilisé) le met en avant. */
export function connecter(compte: string, indice = ''): Promise<void> {
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
          .finally(ok)
      },
    })
    client.requestAccessToken({ prompt: 'select_account' })
  })
}

// Google a des défaillances passagères : on réessaie en attendant de plus en plus
const PASSAGER = [429, 500, 502, 503, 504]
const patienter = (ms: number) => new Promise(r => setTimeout(r, ms))

async function appeler<T = unknown>(url: string, options: RequestInit = {}): Promise<T> {
  if (!jeton || Date.now() >= expiration) throw new Error('Reconnectez votre compte Google pour publier.')
  let derniere: ErreurDrive | null = null
  for (let essai = 0; essai < 4; essai++) {
    if (essai) await patienter(600 * 2 ** (essai - 1) + Math.random() * 400)
    const r = await fetch(url, { ...options, cache: 'no-store', credentials: 'omit', headers: { ...(options.headers as Record<string, string>), Authorization: 'Bearer ' + jeton } })
    if (r.ok) return (r.status === 204 ? null : await r.json()) as T
    if (r.status === 401) { deconnecter(); throw new Error('La connexion Google a expiré : reconnectez-vous, puis réessayez.') }
    const corps = await r.json().catch(() => ({})) as { error?: { message?: string; errors?: { reason?: string }[] } }
    derniere = new ErreurDrive(corps.error?.message || `Google Drive refuse la demande (${r.status}).`, r.status)
    // Une limite de débit (403) se passe aussi en attendant
    const debit = r.status === 403 && (corps.error?.errors ?? []).some(e => /rateLimitExceeded/.test(e.reason ?? ''))
    if (!PASSAGER.includes(r.status) && !debit) throw derniere
  }
  throw new Error(`Google Drive n'a pas répondu correctement, quatre fois de suite (« ${derniere?.message} »). La panne est de son côté : réessayez dans un moment.`)
}
const enJson = (method: string, corps: unknown): RequestInit => ({ method, headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(corps) })
const fiche = (id: string) => appeler<Fiche>(`${API}/${encodeURIComponent(id)}?fields=${encodeURIComponent(CHAMPS)}`)

/** Un dossier privé : seul son propriétaire y a accès (ni « tout le monde », ni « le domaine ») */
const estPrive = (d: Fiche) => d.mimeType === 'application/vnd.google-apps.folder' && !d.trashed
  && Array.isArray(d.permissions) && d.permissions.length > 0 && d.permissions.every(p => p.type === 'user' && p.role === 'owner')
const partage = (f: Fiche) => (f.permissions ?? []).some(p => p.type === 'anyone' || p.type === 'domain')

/** Le dossier des replays du compte dont `nom` est le dossier, dans ce Drive,
 *  créé au besoin (cree : il vient de l'être) */
async function dossierPrive(nom: string): Promise<{ dossier: Fiche; cree: boolean }> {
  const compte = COMPTES.find(c => c.dossier === nom)?.cle ?? nom
  const q = `trashed=false and mimeType='application/vnd.google-apps.folder' and appProperties has { key='${MARQUE_DOSSIER.cle}' and value='${MARQUE_DOSSIER.valeur}' }`
    + ` and appProperties has { key='${MARQUE_COMPTE}' and value='${compte.replace(/'/g, "\\'")}' }`
  const r = await appeler<{ files?: Fiche[] }>(`${API}?${new URLSearchParams({ q, fields: `files(${CHAMPS})`, pageSize: '50' })}`)
  const prive = (r.files ?? []).find(estPrive)
  if (prive) {
    // Renommé à la main dans Drive : le relais ne le reconnaîtrait plus
    if (prive.name !== nom) {
      await appeler(`${API}/${encodeURIComponent(prive.id)}`, enJson('PATCH', { name: nom }))
      prive.name = nom
    }
    return { dossier: prive, cree: false }
  }
  // Un dossier des replays existe, mais il a été partagé : on ne publie pas
  // dedans, et on n'en crée pas un de plus à chaque essai
  const ouvert = r.files?.[0]
  if (ouvert) throw new Error(`Le dossier « ${ouvert.name} » de ce Drive est partagé. Dans Google Drive, remettez son accès sur « Limité » (seulement vous), puis réessayez.`)
  // Créé privé, même dans un établissement dont les fichiers sont visibles par défaut de tout le domaine
  const cree = await appeler<{ id: string }>(`${API}?fields=id&ignoreDefaultVisibility=true`, enJson('POST', {
    name: nom, mimeType: 'application/vnd.google-apps.folder', appProperties: { [MARQUE_DOSSIER.cle]: MARQUE_DOSSIER.valeur, [MARQUE_COMPTE]: compte },
  }))
  const d = await fiche(cree.id)
  if (!estPrive(d)) throw new Error('Le dossier des replays doit rester privé : vérifiez ses autorisations dans Google Drive.')
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
