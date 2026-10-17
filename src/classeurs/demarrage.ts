// =============================================================
// LES CLASSEURS : OÙ ILS VIVENT, LEQUEL S'OUVRE AU DÉMARRAGE
// Chaque classeur est un document Yjs dans SA base IndexedDB. Le premier
// est le tableau d'avant le lot 4 : sa base reste 'mem-tableau-local',
// jamais recopiée ni renommée (une version d'avant, la version hors ligne du lot 3,
// la retrouve intacte). Les autres ont 'mem-teachingtool-classeur-<id>'.
// L'index de la bibliothèque (les fiches des classeurs, les dossiers, les
// aperçus) vit dans une base à part, 'mem-teachingtool-bibliotheque' (voir
// registre.ts).
//
// Le premier se reconnaît à sa base, jamais à un champ stocké : une fiche
// adoptée ou importée sur 'mem-tableau-local' est aussi « le premier », et
// garde les clés d'avant ('mem-session', 'mem-dernier-enregistrement', le
// canal 'mem-tableau'). Les autres ont les mêmes clés suivies de « :<id> ».
//
// Ce fichier est pur (sans IndexedDB) : il se teste sous Node.
// =============================================================

/** La base du premier classeur, celle du tableau d'avant le lot 4. Ce nom ne
 *  change jamais, sinon le professeur ne retrouverait plus ses pages : c'est
 *  le seul endroit du code qui l'écrit. */
export const BASE_PREMIER = 'mem-tableau-local'
/** La base d'un autre classeur : ce préfixe, puis son id */
export const PREFIXE_BASE = 'mem-teachingtool-classeur-'
/** La base de l'index de la bibliothèque */
export const BASE_INDEX = 'mem-teachingtool-bibliotheque'
/** Le dernier classeur ouvert dans ce navigateur, JSON { id, base, nom } :
 *  il se relit même quand l'index ne s'ouvre pas */
export const CLE_DERNIER_CLASSEUR = 'mem-teachingtool-dernier-classeur'
/** Le canal d'avant le lot 4 ({ type: 'remplace', raison? }) : seulement
 *  pour le premier classeur ; la version d'avant ne lit que type */
export const CANAL_PREMIER = 'mem-tableau'
/** Le canal des classeurs, pour tous ({ type, base, id? } : chacun ne
 *  retient que ce qui touche sa base) */
export const CANAL_CLASSEUR = 'mem-teachingtool-classeur'
/** Les clés de stockage d'un classeur (voir cleDuClasseur) : la page et les
 *  vues, la date du dernier enregistrement dans un fichier */
export const CLE_SESSION = 'mem-session'
export const CLE_DERNIER_ENREGISTREMENT = 'mem-dernier-enregistrement'
/** Le nom du premier classeur quand il reprend un tableau d'avant */
export const NOM_PREMIER = 'Mon tableau'
/** … et quand il n'y avait rien (un navigateur neuf) */
export const NOM_PREMIER_VIDE = 'Premier classeur'
export const LONGUEUR_NOM_CLASSEUR = 60
export const LONGUEUR_NOM_DOSSIER = 40
/** Toute remontée vers la racine s'arrête là, même si deux onglets ont fait
 *  un cycle de dossiers */
export const PROFONDEUR_MAX = 64

/** Le compte Google d'une copie sur le Drive (voir publication/comptes.ts) */
export type CompteDrive = 'mem' | 'lfb'

/** Un classeur dans l'index de la bibliothèque. Tous les champs du lot sont
 *  là dès maintenant, même ceux que les morceaux suivants rempliront.
 *  - cree, modifie, ouvert : des dates (ms) ; 0 : on ne le sait pas encore.
 *  - pages : le nombre de pages de l'ordre à la dernière ouverture ; null :
 *    jamais ouvert depuis le lot 4 (le premier, juste repris).
 *  - vecteur : le vecteur d'état Yjs de la dernière ouverture.
 *  - corbeille : dans la corbeille de la bibliothèque, depuis t.
 *  - effacement : un effacement définitif en cours (sa base part).
 *  - creation : une création en cours (sa base se remplit) ; une fiche qui
 *    la garde plus de 2 minutes est reprise par Registre.reprendre.
 *  - recu : quand il est arrivé d'un fichier.
 *  - copieDrive, drive : la copie sur le Drive ; cle : le fichier de la clé.
 *  Pas de champ « premier » : voir estPremier. */
export interface FicheClasseur {
  id: string
  base: string
  nom: string
  dossier: string | null
  etiquettes: string[]
  cree: number
  modifie: number
  ouvert: number
  pages: number | null
  vecteur?: Uint8Array
  corbeille?: { t: number }
  effacement?: number
  creation?: number
  recu?: number
  copieDrive?: CompteDrive | 'aucune'
  drive?: { compte: CompteDrive; id: string; t: number; taille: number; courriel?: string; vecteur?: Uint8Array }
  cle?: { nom: string; t?: number; date?: number; taille?: number; vecteur?: Uint8Array }
  /** Le nombre de séances du chapitre (lot 6), à sa dernière écriture ;
   *  absent : on ne le sait pas (pas ouvert depuis le lot 6) */
  seances?: number
}

/** Un dossier de la bibliothèque (parent null : à la racine) */
export interface FicheDossier {
  id: string
  nom: string
  parent: string | null
  couleur: string
  etiquette?: string
  cree: number
  corbeille?: { t: number }
}

/** Ce que l'application sait du classeur ouvert (premier : estPremier) */
export interface InfosClasseur { id: string; base: string; nom: string; premier: boolean }

/** Le classeur tel qu'avant le lot 4 : le premier, sans fiche (les tests, et
 *  une application construite sans rien dire) */
export const CLASSEUR_SEUL: InfosClasseur = { id: '', base: BASE_PREMIER, nom: NOM_PREMIER, premier: true }

/** Le premier classeur, reconnu à sa base */
export const estPremier = (f: { base: string }) => f.base === BASE_PREMIER

/** Un id de classeur : 16 caractères hexadécimaux. crypto.randomUUID
 *  n'existe pas en http:// sur le réseau local de la classe ;
 *  crypto.getRandomValues, si. */
export function idClasseur(): string {
  const octets = new Uint8Array(8)
  crypto.getRandomValues(octets)
  return Array.from(octets, o => o.toString(16).padStart(2, '0')).join('')
}

export const baseDe = (id: string) => PREFIXE_BASE + id

/** La fiche du premier classeur, telle que la reprise la crée : rien n'est
 *  encore su de lui (pages null) ; sa première ouverture le dira */
export function ficheDuPremier(id: string): FicheClasseur {
  return { id, base: BASE_PREMIER, nom: NOM_PREMIER, dossier: null, etiquettes: [], cree: 0, modifie: 0, ouvert: 0, pages: null }
}

/** La clé de stockage d'un classeur : celle d'avant le lot 4, telle quelle,
 *  pour le premier ; suivie de « :<id> » pour les autres */
export function cleDuClasseur(c: { id: string; base: string }, cle: string): string {
  return estPremier(c) ? cle : cle + ':' + c.id
}

type Dossiers = ReadonlyMap<string, FicheDossier> | readonly FicheDossier[]
const enCarte = (d: Dossiers): ReadonlyMap<string, FicheDossier> =>
  d instanceof Map ? d : new Map((d as readonly FicheDossier[]).map(x => [x.id, x]))

/** La chaîne des dossiers d'un dossier jusqu'à la racine (lui d'abord).
 *  Bornée : elle s'arrête sur un dossier déjà vu (un cycle, que deux onglets
 *  peuvent faire en déplaçant chacun un dossier dans l'autre) ou après
 *  PROFONDEUR_MAX dossiers. Un parent introuvable vaut la racine. */
export function parents(dossierId: string | null, dossiers: Dossiers): FicheDossier[] {
  const carte = enCarte(dossiers)
  const chaine: FicheDossier[] = []
  const vus = new Set<string>()
  for (let id = dossierId; id !== null && chaine.length < PROFONDEUR_MAX; ) {
    if (vus.has(id)) break
    vus.add(id)
    const d = carte.get(id)
    if (!d) break
    chaine.push(d)
    id = d.parent
  }
  return chaine
}

/** Le classeur, ou l'un de ses dossiers, est dans la corbeille */
export function dansLaCorbeille(f: FicheClasseur, dossiers: Dossiers): boolean {
  return f.corbeille != null || parents(f.dossier, dossiers).some(d => d.corbeille != null)
}

/** Un classeur qu'on peut ouvrir et montrer : ni dans la corbeille (lui ou
 *  un dossier parent), ni en train de partir, ni en train de naître */
export function visible(f: FicheClasseur, dossiers: Dossiers): boolean {
  return f.effacement == null && f.creation == null && !dansLaCorbeille(f, dossiers)
}

export const MESSAGE_CORBEILLE = 'Ce classeur est dans la corbeille de la bibliothèque : remettez-le pour l\'ouvrir.'
export const MESSAGE_INCONNU = 'Ce classeur n\'est pas dans la bibliothèque de ce navigateur. Pour l\'y ajouter, ouvrez son fichier (.memc).'
export const MESSAGE_VIDE = 'La bibliothèque est vide : créez un classeur, ou ouvrez un fichier.'

/** Le dernier classeur ouvert, tel que CLE_DERNIER_CLASSEUR le garde */
export interface Dernier { id: string; base?: string; nom?: string }

export type ChoixDemarrage =
  | { genre: 'classeur'; fiche: FicheClasseur; message?: string }
  | { genre: 'bibliotheque'; message?: string }

/** Ce qui s'ouvre au démarrage.
 *  - ?bibliotheque : la bibliothèque.
 *  - ?classeur=X : X s'il est visible ; sinon la bibliothèque, avec ce qui
 *    l'empêche (la corbeille, ou un classeur inconnu ici : une adresse venue
 *    d'une autre machine).
 *  - Sans rien : le dernier classeur ouvert s'il est visible ; sinon le
 *    visible ouvert le plus récemment ; à égalité (jamais ouverts), le
 *    premier, puis le plus récemment modifié ; s'il n'y en a aucun, la
 *    bibliothèque, vide. On ne change rien au geste du professeur en classe :
 *    il retrouve son classeur. */
export function choisirAuDemarrage(o: { recherche: string; dernier: Dernier | null; fiches: readonly FicheClasseur[]; dossiers: Dossiers }): ChoixDemarrage {
  const dossiers = enCarte(o.dossiers)
  let params: URLSearchParams
  try { params = new URLSearchParams(o.recherche) } catch { params = new URLSearchParams() }
  if (params.has('bibliotheque')) return { genre: 'bibliotheque' }
  const voulu = params.get('classeur')
  if (voulu !== null) {
    const f = o.fiches.find(x => x.id === voulu)
    if (f && visible(f, dossiers)) return { genre: 'classeur', fiche: f }
    return { genre: 'bibliotheque', message: f && dansLaCorbeille(f, dossiers) ? MESSAGE_CORBEILLE : MESSAGE_INCONNU }
  }
  const visibles = o.fiches.filter(f => visible(f, dossiers))
  const dernier = o.dernier && visibles.find(f => f.id === o.dernier!.id)
  if (dernier) return { genre: 'classeur', fiche: dernier }
  const choisi = [...visibles].sort((a, b) => (b.ouvert - a.ouvert) || (Number(estPremier(b)) - Number(estPremier(a)))
    || (b.modifie - a.modifie) || (b.cree - a.cree) || (a.id < b.id ? -1 : 1))[0]
  return choisi ? { genre: 'classeur', fiche: choisi } : { genre: 'bibliotheque', message: MESSAGE_VIDE }
}

const ID_SEUL = /^[0-9a-f]{16}$/i
const baseValable = (b: unknown): b is string => typeof b === 'string' && (b === BASE_PREMIER || (b.startsWith(PREFIXE_BASE) && b.length > PREFIXE_BASE.length))

/** Relit CLE_DERNIER_CLASSEUR : JSON { id, base, nom }. L'ancienne forme,
 *  l'id seul, se lit encore ; ce qui ne se lit pas vaut null. Une base qui
 *  n'est pas celle d'un classeur est oubliée. */
export function lireDernier(texte: string | null | undefined): Dernier | null {
  if (typeof texte !== 'string') return null
  const t = texte.trim()
  if (ID_SEUL.test(t)) return { id: t }
  try {
    const o = JSON.parse(t)
    if (!o || typeof o !== 'object' || typeof o.id !== 'string' || !o.id || o.id.length > 64) return null
    const d: Dernier = { id: o.id }
    if (baseValable(o.base)) d.base = o.base
    if (typeof o.nom === 'string' && o.nom.trim()) d.nom = o.nom.trim().slice(0, LONGUEUR_NOM_CLASSEUR)
    return d
  } catch { return null }
}

/** Ce que CLE_DERNIER_CLASSEUR garde d'une fiche */
export const texteDernier = (f: { id: string; base: string; nom: string }) => JSON.stringify({ id: f.id, base: f.base, nom: f.nom })

/** Note le dernier classeur (un navigateur qui ne garde rien : tant pis).
 *  Rien n'est écrit s'il l'est déjà : on le note à chaque écriture de la
 *  fiche et chaque fois que l'onglet prend le focus (voir main.ts), et la
 *  revue, par exemple, n'écrit rien dans le stockage du navigateur. */
export function ecrireDernier(f: { id: string; base: string; nom: string }) {
  try {
    const texte = texteDernier(f)
    if (localStorage.getItem(CLE_DERNIER_CLASSEUR) !== texte) localStorage.setItem(CLE_DERNIER_CLASSEUR, texte)
  } catch { /* rien de gardé */ }
}

/** L'adresse d'un classeur : le même chemin, « ?classeur=<id> », sans # (en
 *  ligne comme en file://, depuis la clé). Recharger la page rouvre ce
 *  classeur. revoir.html et les liens publiés n'en dépendent pas : new
 *  URL('revoir.html', …) laisse tomber la requête, lienEleve la vide. */
export function urlDuClasseur(href: string, id: string): string {
  const u = new URL(href)
  u.search = ''; u.hash = ''
  u.searchParams.set('classeur', id)
  return u.toString()
}

/** L'adresse de la bibliothèque : « ?bibliotheque » */
export function urlBibliotheque(href: string): string {
  const u = new URL(href)
  u.hash = ''
  u.search = '?bibliotheque'
  return u.toString()
}
