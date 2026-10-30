// =============================================================
// LA RÉDACTION PAR GEMINI (version en ligne)
// Le professeur a choisi que le texte du cahier de textes s'écrive tout seul,
// écriture à la main comprise : à l'ouverture de Publier, les pages de la
// séance (en images) partent à Gemini, avec ce que l'outil sait déjà
// (fiche.consigneGemini), et le texte rendu remplace celui de l'outil.
//
// Il faut une clé de l'API Gemini (Google AI Studio), que le professeur colle
// une fois dans « Rédaction automatique… ». Elle est rangée dans CE
// navigateur seulement (jamais dans le document, ni dans un fichier, ni dans
// le dépôt). Sans clé, hors ligne, ou quand Gemini ne répond pas, le texte de
// l'outil reste (le secours).
//
// Le modèle : le plus récent des « gemini-X-flash » que la clé peut utiliser
// (la liste des modèles de Google), retenu une semaine ; Google en sort
// souvent de nouveaux, et retire les anciens : rien n'est écrit en dur.
//
// Rangé dans ce navigateur (nouvelles clés, voir reglages.ts) :
// 'mem-redaction-cle' (la clé), 'mem-redaction-modele' (le modèle retenu et
// quand), 'mem-redaction-consignes' (les consignes du professeur pour le
// texte, ajoutées à celle de l'outil), 'mem-pronote' (l'adresse du Pronote de chaque établissement, par
// Drive des replays : mem, lfb, lyfel).
// =============================================================

const CLE = 'mem-redaction-cle'
const CLE_MODELE = 'mem-redaction-modele'
const CLE_PRONOTE = 'mem-pronote'
const CLE_CONSIGNES = 'mem-redaction-consignes'
/** Au plus tant de signes de consignes du professeur */
export const CONSIGNES_MAX = 1500
const API = 'https://generativelanguage.googleapis.com/v1beta'
const UNE_SEMAINE = 7 * 24 * 3600 * 1000
/** Au plus tant de pages envoyées (les premières) ; chacune au plus si large */
export const PAGES_MAX = 16
export const LARGEUR_MAX = 1600
/** Le modèle quand la liste ne répond pas : l'alias que Google tient à jour */
export const MODELE_DE_SECOURS = 'gemini-flash-latest'

const lire = (k: string) => { try { return localStorage.getItem(k) ?? '' } catch { return '' } }
const ecrire = (k: string, v: string) => { try { if (v) localStorage.setItem(k, v); else localStorage.removeItem(k) } catch { /* navigation privée */ } }

/** La clé de l'API Gemini de ce navigateur ('' : pas de rédaction automatique) */
export const cleGemini = () => lire(CLE).trim()
export function retenirCleGemini(cle: string) {
  ecrire(CLE, nettoyerCle(cle))
  ecrire(CLE_MODELE, '')
}

/** Les consignes du professeur pour le texte ('' : aucune) */
export const consignesDuProfesseur = () => lire(CLE_CONSIGNES).trim().slice(0, CONSIGNES_MAX)
export const retenirConsignes = (t: string) => ecrire(CLE_CONSIGNES, t.replace(/\r/g, '').trim().slice(0, CONSIGNES_MAX))

/** La clé telle qu'on l'a collée, sans espaces, retours à la ligne ni
 *  guillemets autour (une copie depuis un courriel ou un document en ajoute) */
export const nettoyerCle = (cle: string) => cle.replace(/\s+/g, '').replace(/^["'«»“”]+|["'«»“”]+$/g, '')
/** Google change parfois la forme de ses clés (« AIza… », puis d'autres) :
 *  on accepte tout ce qui peut partir dans l'en-tête de la demande, et c'est
 *  « Essayer la clé » qui dit si elle marche */
export const cleValable = (cle: string) => /^[\x21-\x7e]{20,300}$/.test(nettoyerCle(cle))

/** Les établissements, par Drive des replays (voir publication/comptes.ts) */
export const ETABLISSEMENTS: { cle: string; nom: string }[] = [
  { cle: 'mem', nom: 'MEM' }, { cle: 'lfb', nom: 'LFB' }, { cle: 'lyfel', nom: 'LyFEL' },
]

/** L'adresse du Pronote d'un établissement ('' : pas encore donnée) */
export function pronoteDe(compte: string): string {
  try { const v = JSON.parse(lire(CLE_PRONOTE) || '{}')[compte]; return typeof v === 'string' ? v : '' } catch { return '' }
}
export function retenirPronote(compte: string, adresse: string) {
  let l: Record<string, string> = {}
  try { l = JSON.parse(lire(CLE_PRONOTE) || '{}') ?? {} } catch { l = {} }
  const a = adresseValable(adresse)
  if (a) l[compte] = a; else delete l[compte]
  ecrire(CLE_PRONOTE, Object.keys(l).length ? JSON.stringify(l) : '')
}

/** Une adresse de Pronote : https seulement ('' : elle ne va pas) */
export function adresseValable(adresse: string): string {
  const a = adresse.trim()
  if (!a) return ''
  try {
    const u = new URL(/^https?:\/\//i.test(a) ? a : 'https://' + a)
    return u.protocol === 'https:' && u.hostname.includes('.') ? u.toString() : ''
  } catch { return '' }
}

// ---------- Le modèle ----------
interface ModeleListe { name: string; supportedGenerationMethods?: string[] }

/** Le meilleur modèle d'une liste : le « gemini-X-flash » de plus grand
 *  numéro ; à défaut, un autre « flash » (ni lite, ni image, ni voix) ;
 *  null : aucun */
export function meilleurModele(l: readonly ModeleListe[]): string | null {
  const noms = l.filter(m => !m.supportedGenerationMethods || m.supportedGenerationMethods.includes('generateContent'))
    .map(m => m.name.replace(/^models\//, ''))
  const version = (n: string) => Number(/gemini-(\d+(?:\.\d+)?)/.exec(n)?.[1] ?? 0)
  const parVersion = (a: string, b: string) => version(b) - version(a) || a.length - b.length
  const nets = noms.filter(n => /^gemini-\d+(?:\.\d+)?-flash$/.test(n)).sort(parVersion)
  if (nets.length) return nets[0]
  const autres = noms.filter(n => /^gemini-.*flash/.test(n) && !/lite|image|tts|live|audio|embed|thinking-exp/.test(n)).sort(parVersion)
  return autres[0] ?? null
}

async function modele(cle: string, oublier = false): Promise<string> {
  if (!oublier) {
    try {
      const m = JSON.parse(lire(CLE_MODELE) || 'null') as { nom: string; t: number } | null
      if (m && typeof m.nom === 'string' && Date.now() - m.t < UNE_SEMAINE) return m.nom
    } catch { /* on redemande */ }
  }
  // La liste ne répond pas : l'alias, sans le retenir (on redemandera)
  let r: Response
  try { r = await fetch(`${API}/models?pageSize=200`, { headers: { 'x-goog-api-key': cle } }) } catch { return MODELE_DE_SECOURS }
  if (r.status === 400 || r.status === 401 || r.status === 403) throw new ErreurGemini(await messageDErreur(r))
  if (!r.ok) return MODELE_DE_SECOURS
  const nom = meilleurModele(((await r.json().catch(() => ({}))) as { models?: ModeleListe[] }).models ?? []) ?? MODELE_DE_SECOURS
  ecrire(CLE_MODELE, JSON.stringify({ nom, t: Date.now() }))
  return nom
}

// ---------- La demande ----------
/** Une erreur à dire au professeur, telle quelle */
export class ErreurGemini extends Error {}

async function messageDErreur(r: Response): Promise<string> {
  let detail = ''
  let dit = ''
  try {
    const j = await r.json() as { error?: { message?: unknown } }
    detail = JSON.stringify(j)
    if (typeof j.error?.message === 'string') dit = j.error.message.trim().slice(0, 300)
  } catch { /* sans détail */ }
  // Ce que Google en dit, tel quel : c'est souvent la seule façon de savoir
  // pourquoi une clé est refusée
  const google = dit ? ` (Google dit : « ${dit} »)` : ''
  return messageSelonLaRaison(r.status, detail) + google
}

/** La raison d'un refus, d'après le code et le détail rendus par Google */
export function messageSelonLaRaison(statut: number, detail: string): string {
  if (/API_KEY_INVALID|API key not valid/i.test(detail)) return 'Gemini refuse la clé : vérifiez-la dans « Rédaction automatique… ».'
  if (/API_KEY_HTTP_REFERRER_BLOCKED|referer/i.test(detail)) return 'La clé est limitée à certains sites. Dans Google Cloud, page « Identifiants », ouvrez la clé et choisissez « Aucune » sous « Restrictions relatives aux applications » (ou ajoutez https://mathsetmoi.github.io/*).'
  if (/API_KEY_SERVICE_BLOCKED|are blocked/i.test(detail)) return 'La clé est limitée à d\'autres services que Gemini. Dans Google Cloud, page « Identifiants », ouvrez la clé et choisissez « Ne pas restreindre la clé » (ou ajoutez « Generative Language API »).'
  if (/SERVICE_DISABLED|has not been used in project|is disabled/i.test(detail)) return 'L\'API Gemini n\'est pas activée pour le projet de cette clé : activez « Generative Language API » dans Google Cloud, attendez quelques minutes, puis réessayez.'
  if (statut === 429) return 'Gemini a trop servi aujourd\'hui (le quota de la clé gratuite) : le texte de l\'outil reste, réessayez plus tard.'
  if (/location is not supported|User location/i.test(detail)) return 'Gemini n\'est pas ouvert dans ce pays : le texte de l\'outil reste.'
  if (surcharge(statut)) return 'Gemini est très demandé en ce moment et n\'a pas pu rédiger le texte : cliquez « Réessayer » dans quelques minutes.'
  if (statut === 403) return 'Gemini refuse la clé (elle n\'a pas accès à l\'API Gemini).'
  return `Gemini n'a pas pu rédiger le texte (erreur ${statut}) : le texte de l'outil reste.`
}

/** Le texte rendu par Gemini pour cette consigne et ces images (JPEG, en
 *  base 64). Lève ErreurGemini avec un message à dire. */
/** Gemini surchargé (« high demand ») : on réessaie après ces attentes,
 *  puis avec les alias que Google tient à jour (souvent moins demandés) */
export const ATTENTES_SURCHARGE = [2000, 5000]
const MODELES_DE_RELAIS = [MODELE_DE_SECOURS, 'gemini-flash-lite-latest']
const surcharge = (statut: number) => statut === 500 || statut === 502 || statut === 503 || statut === 504
const patienter = (ms: number, signal?: AbortSignal) => new Promise<void>((ok, non) => {
  const h = setTimeout(ok, ms)
  signal?.addEventListener('abort', () => { clearTimeout(h); non(new DOMException('Abandon', 'AbortError')) }, { once: true })
})

export async function demanderAGemini(cle: string, consigne: string, images: readonly string[], o: { signal?: AbortSignal; nouvelEssai?: () => void } = {}): Promise<string> {
  const corps = JSON.stringify({
    contents: [{ role: 'user', parts: [{ text: consigne }, ...images.map(data => ({ inline_data: { mime_type: 'image/jpeg', data } }))] }],
    generationConfig: { temperature: 0.2, maxOutputTokens: 4096 },
  })
  const essayer = async (m: string) => fetch(`${API}/models/${encodeURIComponent(m)}:generateContent`, {
    method: 'POST', headers: { 'Content-Type': 'application/json', 'x-goog-api-key': cle }, body: corps, signal: o.signal,
  })
  let r: Response
  try {
    let m = await modele(cle)
    r = await essayer(m)
    // Un modèle retiré entre-temps : on redemande la liste, une fois
    if (r.status === 404) { m = await modele(cle, true); r = await essayer(m) }
    // Surchargé : le même modèle un peu plus tard, puis les alias
    for (const ms of ATTENTES_SURCHARGE) {
      if (!surcharge(r.status)) break
      o.nouvelEssai?.()
      await patienter(ms, o.signal)
      r = await essayer(m)
    }
    for (const autre of MODELES_DE_RELAIS) {
      if (!surcharge(r.status)) break
      if (autre !== m) { o.nouvelEssai?.(); r = await essayer(autre) }
    }
  } catch (e) {
    if (e instanceof ErreurGemini || (e as Error)?.name === 'AbortError') throw e
    throw new ErreurGemini('Gemini ne répond pas (pas d\'internet ?) : le texte de l\'outil reste.')
  }
  if (!r.ok) throw new ErreurGemini(await messageDErreur(r))
  const j = await r.json() as { candidates?: { content?: { parts?: { text?: string; thought?: boolean }[] } }[] }
  const texte = (j.candidates?.[0]?.content?.parts ?? []).filter(p => !p.thought).map(p => p.text ?? '').join('').trim()
  if (!texte) throw new ErreurGemini('Gemini n\'a rien rédigé pour cette séance : le texte de l\'outil reste.')
  return texte
}

/** Une image de page réduite pour Gemini (au plus LARGEUR_MAX de large),
 *  en JPEG base 64, sur fond blanc */
export async function imagePourGemini(png: Blob): Promise<string | null> {
  try {
    const b = await createImageBitmap(png)
    const e = Math.min(1, LARGEUR_MAX / b.width)
    const c = document.createElement('canvas')
    c.width = Math.max(1, Math.round(b.width * e)); c.height = Math.max(1, Math.round(b.height * e))
    const x = c.getContext('2d')
    if (!x) return null
    x.fillStyle = '#ffffff'; x.fillRect(0, 0, c.width, c.height)
    x.drawImage(b, 0, 0, c.width, c.height)
    b.close()
    return c.toDataURL('image/jpeg', 0.85).replace(/^data:image\/jpeg;base64,/, '')
  } catch { return null }
}
