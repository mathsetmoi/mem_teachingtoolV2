// =============================================================
// LA RÉDACTION AUTOMATIQUE (version en ligne)
// Le professeur a choisi que le texte du cahier de textes s'écrive tout seul,
// écriture à la main comprise : à l'ouverture de Publier, les pages de la
// séance (en images) partent à Claude (Anthropic), avec ce que l'outil sait
// déjà (fiche.consigneRedaction), et le texte rendu remplace celui de l'outil.
// (Jusqu'au 17 novembre 2026, c'était Gemini : trop lent et trop limité, le
// professeur a préféré une clé Anthropic.)
//
// Il faut une clé de l'API Anthropic (console.anthropic.com), que le
// professeur colle une fois dans « Rédaction automatique… ». Elle est rangée
// dans CE navigateur seulement (jamais dans le document, ni dans un fichier,
// ni dans le dépôt) et ne part qu'à api.anthropic.com. Sans clé, hors ligne,
// ou quand Claude ne répond pas, le texte de l'outil reste (le secours).
//
// Le modèle : Haiku 5.5 par défaut (le choix du professeur : rapide, moins
// d'un centime par séance) ; Sonnet 5.5 ou Opus 5.5 au choix dans la fenêtre.
//
// Rangé dans ce navigateur (voir reglages.ts) :
// 'mem-redaction-cle-anthropic' (la clé), 'mem-redaction-modele-claude' (le
// modèle choisi, '' : Haiku), 'mem-redaction-consignes' (les consignes du
// professeur pour le texte), 'mem-redaction-entete' ('non' : pas de date ni
// de chapitre en tête), 'mem-pronote' (l'adresse du Pronote de chaque
// établissement, par Drive des replays : mem, lfb, lyfel). Les anciennes
// clés 'mem-redaction-cle' et 'mem-redaction-modele' (Gemini) restent comme
// elles sont : l'outil ne s'en sert plus.
// =============================================================
import Anthropic from '@anthropic-ai/sdk'

const CLE = 'mem-redaction-cle-anthropic'
const CLE_MODELE = 'mem-redaction-modele-claude'
const CLE_PRONOTE = 'mem-pronote'
const CLE_CONSIGNES = 'mem-redaction-consignes'
const CLE_ENTETE = 'mem-redaction-entete'
/** Au plus tant de signes de consignes du professeur */
export const CONSIGNES_MAX = 1500
/** Au plus tant de pages envoyées (les premières) ; chacune au plus si
 *  large (Claude réduit lui-même au-delà de 1568 points) */
export const PAGES_MAX = 16
export const LARGEUR_MAX = 1568

/** Les modèles proposés, le premier par défaut */
export const MODELES: { id: string; nom: string; dit: string }[] = [
  { id: 'claude-haiku-5-5', nom: 'Haiku 5.5', dit: 'rapide, moins d\'un centime par séance' },
  { id: 'claude-sonnet-5-5', nom: 'Sonnet 5.5', dit: 'plus soigné, environ 8 centimes' },
  { id: 'claude-opus-5-5', nom: 'Opus 5.5', dit: 'le plus fin, environ 16 centimes' },
]

const lire = (k: string) => { try { return localStorage.getItem(k) ?? '' } catch { return '' } }
const ecrire = (k: string, v: string) => { try { if (v) localStorage.setItem(k, v); else localStorage.removeItem(k) } catch { /* navigation privée */ } }

/** La clé de l'API Anthropic de ce navigateur ('' : pas de rédaction automatique) */
export const cleRedaction = () => lire(CLE).trim()
export const retenirCleRedaction = (cle: string) => ecrire(CLE, nettoyerCle(cle))

/** Le modèle choisi (son identifiant) */
export function modeleChoisi(): string {
  const m = lire(CLE_MODELE)
  return MODELES.some(x => x.id === m) ? m : MODELES[0].id
}
export const retenirModele = (id: string) => ecrire(CLE_MODELE, id === MODELES[0].id || !MODELES.some(x => x.id === id) ? '' : id)
/** Le nom d'un modèle, à dire au professeur */
export const nomDuModele = (id: string) => MODELES.find(x => x.id === id)?.nom ?? id

/** La date et le chapitre en tête du texte rédigé (oui, sauf refus) */
export const enTeteRedaction = () => lire(CLE_ENTETE) !== 'non'
export const retenirEnTete = (oui: boolean) => ecrire(CLE_ENTETE, oui ? '' : 'non')

/** Les consignes du professeur pour le texte ('' : aucune) */
export const consignesDuProfesseur = () => lire(CLE_CONSIGNES).trim().slice(0, CONSIGNES_MAX)
export const retenirConsignes = (t: string) => ecrire(CLE_CONSIGNES, t.replace(/\r/g, '').trim().slice(0, CONSIGNES_MAX))

/** La clé telle qu'on l'a collée, sans espaces, retours à la ligne ni
 *  guillemets autour (une copie depuis un courriel ou un document en ajoute) */
export const nettoyerCle = (cle: string) => cle.replace(/\s+/g, '').replace(/^["'«»“”]+|["'«»“”]+$/g, '')
/** Une clé de l'API Anthropic commence par « sk-ant- » ; c'est « Essayer la
 *  clé » qui dit si elle marche */
export const cleValable = (cle: string) => /^sk-ant-[\x21-\x7e]{20,300}$/.test(nettoyerCle(cle))

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

// ---------- La demande ----------
/** Une erreur à dire au professeur, telle quelle */
export class ErreurRedaction extends Error {}

/** La raison d'un refus, d'après le code et le message rendus par Anthropic */
export function messageSelonLaRaison(statut: number, detail: string): string {
  if (/credit balance|billing|purchase credits/i.test(detail)) return 'Le crédit est épuisé chez Anthropic : ajoutez du crédit sur console.anthropic.com (Settings, Billing). Le texte de l\'outil reste.'
  if (/spend limit|usage limit|workspace.*limit/i.test(detail)) return 'La limite de dépense du mois est atteinte chez Anthropic : relevez-la sur console.anthropic.com (Settings, Limits), ou attendez le mois prochain. Le texte de l\'outil reste.'
  if (statut === 401) return 'Anthropic refuse la clé : vérifiez-la dans « Rédaction automatique… » (elle a pu être supprimée sur console.anthropic.com).'
  if (statut === 403) return 'La clé n\'a pas le droit d\'utiliser ce modèle : choisissez-en un autre dans « Rédaction automatique… ».'
  if (statut === 404) return 'Ce modèle n\'existe plus chez Anthropic : choisissez-en un autre dans « Rédaction automatique… ».'
  if (statut === 413) return 'Les pages de la séance sont trop lourdes pour être envoyées : le texte de l\'outil reste.'
  if (statut === 429) return 'Trop de demandes en peu de temps chez Anthropic : cliquez « Réessayer » dans une minute.'
  if (statut === 529 || statut >= 500) return 'Claude est très demandé en ce moment et n\'a pas pu rédiger le texte : cliquez « Réessayer » dans quelques minutes.'
  return `Claude n'a pas pu rédiger le texte (erreur ${statut}) : le texte de l'outil reste.`
}

/** Le texte rendu par Claude pour cette consigne et ces images (JPEG, en
 *  base 64). Lève ErreurRedaction avec un message à dire. Le SDK réessaie
 *  tout seul deux fois quand Claude est surchargé ou trop demandé. */
export async function demanderAClaude(cle: string, consigne: string, images: readonly string[], o: { signal?: AbortSignal; modele?: string; maxTokens?: number } = {}): Promise<string> {
  const client = new Anthropic({ apiKey: cle, dangerouslyAllowBrowser: true, maxRetries: 2, timeout: 120_000 })
  let r: Anthropic.Message
  try {
    r = await client.messages.create({
      model: o.modele ?? modeleChoisi(),
      max_tokens: o.maxTokens ?? 8000,
      // Peu de réflexion : il s'agit de lire des pages et d'en faire une
      // liste, et le professeur veut le texte vite
      output_config: { effort: 'low' },
      messages: [{
        role: 'user',
        content: [
          ...images.map(data => ({ type: 'image' as const, source: { type: 'base64' as const, media_type: 'image/jpeg' as const, data } })),
          { type: 'text' as const, text: consigne },
        ],
      }],
    }, { signal: o.signal })
  } catch (e) {
    if (e instanceof Anthropic.APIUserAbortError) throw new DOMException('Abandon', 'AbortError')
    if (e instanceof Anthropic.APIConnectionError) throw new ErreurRedaction('Claude ne répond pas (pas d\'internet ?) : le texte de l\'outil reste.')
    if (e instanceof Anthropic.APIError) {
      const corps = e.error as { error?: { message?: unknown } } | undefined
      const dit = typeof corps?.error?.message === 'string' ? corps.error.message : e.message
      throw new ErreurRedaction(messageSelonLaRaison(e.status ?? 0, dit ?? ''))
    }
    throw new ErreurRedaction('Claude n\'a pas pu rédiger le texte : le texte de l\'outil reste.')
  }
  // Seuls les blocs de texte comptent (la réponse peut commencer par une réflexion)
  return r.content.map(b => b.type === 'text' ? b.text : '').join('').trim()
}

/** Une image de page réduite pour Claude (au plus LARGEUR_MAX de large),
 *  en JPEG base 64, sur fond blanc */
export async function imagePourRedaction(png: Blob): Promise<string | null> {
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
