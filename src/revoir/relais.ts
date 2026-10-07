// Demander une séance au relais du compte qui l'a publiée.
// Le relais répond le fichier tel quel, ou { erreur } avec une phrase pour l'élève.
import { compteDe, relaisValable } from '../publication/comptes'
import { ErreurFilm } from './format'

/** Le texte du fichier séance, ou une ErreurFilm qu'on peut montrer telle quelle */
export async function lireParLeRelais(cle: string, id: string, adresse = compteDe(cle)?.relais ?? ''): Promise<unknown> {
  if (!/^[A-Za-z0-9_-]{10,}$/.test(id)) throw new ErreurFilm('Ce lien est incomplet : demandez-en un nouveau à votre enseignant.')
  if (!adresse) throw new ErreurFilm(`Ce lien désigne un compte que ce site ne connaît pas encore (« ${cle} »). Prévenez votre enseignant.`)
  if (!relaisValable(adresse)) throw new ErreurFilm('L\'adresse du relais de ce compte est mal réglée. Prévenez votre enseignant.')
  const u = new URL(adresse)
  u.searchParams.set('id', id)
  let r: Response
  try {
    r = await fetch(u.toString(), { cache: 'no-store', credentials: 'omit', redirect: 'follow' })
  } catch {
    throw new ErreurFilm('La séance ne se charge pas : vérifiez la connexion à Internet, puis réessayez.')
  }
  if (!r.ok) throw new ErreurFilm(`Le serveur de la séance a répondu « ${r.status} ». Réessayez dans un moment.`)
  const texte = await r.text()
  let objet: unknown
  try { objet = JSON.parse(texte) } catch {
    throw new ErreurFilm(/<html/i.test(texte)
      ? 'Cette séance demande une connexion Google : prévenez votre enseignant (le relais doit être ouvert à tous).'
      : 'La réponse du serveur est illisible. Réessayez dans un moment.')
  }
  const erreur = (objet as { erreur?: unknown } | null)?.erreur
  if (typeof erreur === 'string') throw new ErreurFilm(erreur)
  return objet
}

/** Vérifier un relais sans rien lire : il répond le compte qu'il sert */
export async function essayerRelais(adresse: string): Promise<{ compte?: string; pret?: boolean; dossier?: string | null }> {
  if (!relaisValable(adresse)) throw new Error('Cette adresse n\'est pas celle d\'un relais : elle doit être sur script.google.com et finir par « /exec ».')
  const u = new URL(adresse)
  u.searchParams.set('ping', '1')
  const r = await fetch(u.toString(), { cache: 'no-store', credentials: 'omit', redirect: 'follow' })
  if (!r.ok) throw new Error(`Le relais a répondu « ${r.status} ».`)
  const o = JSON.parse(await r.text())
  if (o?.erreur) throw new Error(o.erreur)
  return o
}
