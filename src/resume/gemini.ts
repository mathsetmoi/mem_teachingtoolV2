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
// quand), 'mem-pronote' (l'adresse du Pronote de chaque établissement, par
// Drive des replays : mem, lfb, lyfel).
// =============================================================

const CLE = 'mem-redaction-cle'
const CLE_MODELE = 'mem-redaction-modele'
const CLE_PRONOTE = 'mem-pronote'
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
  ecrire(CLE, cle.trim())
  ecrire(CLE_MODELE, '')
}

/** Une clé de l'API Gemini ressemble à « AIza… » (39 signes) */
export const cleValable = (cle: string) => /^[A-Za-z0-9_-]{30,60}$/.test(cle.trim())

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
  try { detail = JSON.stringify(await r.json()) } catch { /* sans détail */ }
  if (/API_KEY_INVALID|API key not valid/i.test(detail)) return 'Gemini refuse la clé : vérifiez-la dans « Rédaction automatique… ».'
  if (r.status === 429) return 'Gemini a trop servi aujourd\'hui (le quota de la clé gratuite) : le texte de l\'outil reste, réessayez plus tard.'
  if (r.status === 403) return 'Gemini refuse la clé (elle n\'a pas accès à l\'API Gemini) : créez-en une dans Google AI Studio.'
  if (/location is not supported|User location/i.test(detail)) return 'Gemini n\'est pas ouvert dans ce pays : le texte de l\'outil reste.'
  return `Gemini n'a pas pu rédiger le texte (erreur ${r.status}) : le texte de l'outil reste.`
}

/** Le texte rendu par Gemini pour cette consigne et ces images (JPEG, en
 *  base 64). Lève ErreurGemini avec un message à dire. */
export async function demanderAGemini(cle: string, consigne: string, images: readonly string[], o: { signal?: AbortSignal } = {}): Promise<string> {
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
