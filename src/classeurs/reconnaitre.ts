// =============================================================
// RECONNAÎTRE UN FICHIER QU'ON OUVRE (lot 4 C9)
// « Ouvrir un classeur » ajoute le classeur d'un fichier à la bibliothèque,
// sans rien remplacer. Encore faut-il savoir s'il y est déjà :
// - 'meme' : l'id de son en-tête est celui d'un classeur de la
//   bibliothèque (visible) ;
// - 'corbeille' : celui d'un classeur dans la corbeille (on l'ajoute alors
//   sous un id neuf, et on le dit) ;
// - 'ressemble' : sans id (un .memc d'avant le lot 4), ou un id inconnu ici,
//   mais son vecteur d'état partage au moins un appareil (clientID) avec
//   celui d'un classeur visible. Un clientID Yjs est tiré au hasard sur 32
//   bits à chaque ouverture : en partager un, c'est avoir la même histoire
//   (le même classeur, enregistré avant ou après, ou une copie). On prend
//   celui qui en partage le plus, puis le plus récemment modifié ;
// - 'nouveau' : sinon.
// Puis, pour un classeur déjà là, on compare (vecteurs.ts) le fichier et la
// base : le fichier n'a rien de plus (« Ouvrir celui de la bibliothèque »),
// il a tout et plus (« Mettre à jour le classeur », sans rien perdre), ou
// chacun a changé de son côté (« Ajouter comme copie » : on ne fusionne
// jamais deux histoires qui ont divergé).
// Aussi : le nom d'un classeur d'après le nom de son fichier, les phrases
// des fenêtres et des bilans, et la réunion des dossiers d'une bibliothèque
// qu'on ouvre avec ceux d'ici.
// Pur (yjs seulement) : se teste sous Node.
// =============================================================
import * as Y from 'yjs'
import type { FicheClasseur, FicheDossier } from './demarrage'
import { dansLaCorbeille, parents, visible } from './demarrage'
import type { ComparaisonVecteurs } from './vecteurs'
import type { DossierArchive } from './archive'
import { ABIME, PAS_UN_TABLEAU, PLUS_RECENT, UN_FILM, dateLisible, pagesLisibles } from '../fichier'
import { nomDeClasseur, quandCourt } from './liste'
import { COULEUR_DEFAUT, cleDe, couleurDe, dossierVisible, nomDEtiquette, nomDeDossier } from './arbre'

type Dossiers = ReadonlyMap<string, FicheDossier> | readonly FicheDossier[]

/** Ce qu'est le classeur d'un fichier pour cette bibliothèque */
export type Identite =
  | { genre: 'meme'; fiche: FicheClasseur }
  | { genre: 'corbeille'; fiche: FicheClasseur }
  | { genre: 'ressemble'; fiche: FicheClasseur; communs: number }
  | { genre: 'nouveau' }

/** Les appareils (clientID) qui ont écrit quelque chose dans ce vecteur */
export function appareils(v: Uint8Array): Set<number> {
  const s = new Set<number>()
  try { for (const [c, n] of Y.decodeStateVector(v)) if (n > 0) s.add(c) } catch { /* un vecteur illisible : aucun */ }
  return s
}

/** Reconnaît le classeur d'un fichier (voir l'en-tête). vecteurs : les
 *  vecteurs d'état des fiches qui n'en ont pas (calculés par l'écrivain),
 *  ou plus frais que le leur ; une fiche sans vecteur ne ressemble à rien.
 *  Les fiches qui naissent ou qui partent ne comptent pas.
 *  lot : plusieurs fichiers d'un coup, ou une bibliothèque (.memb), où l'on
 *  ne pose pas de question fichier par fichier. Un fichier qui porte un id
 *  inconnu ici y est alors 'nouveau', même s'il partage une histoire avec
 *  un classeur d'ici : c'est le plus souvent une copie faite ailleurs
 *  (« Dupliquer le classeur », « Ajouter comme copie ») — un classeur à part,
 *  avec son nom et son dossier, qu'on ne fusionne pas et qu'on n'écarte
 *  pas sans le demander. 'ressemble' n'y vaut que pour un fichier sans id
 *  (d'avant le lot 4). Seul, le fichier passe par une question qui le dit
 *  (« Ce fichier ressemble au classeur… »). */
export function identiteDuFichier(entete: { id?: string }, vecteurFichier: Uint8Array, fiches: readonly FicheClasseur[],
  o: { dossiers?: Dossiers; vecteurs?: ReadonlyMap<string, Uint8Array>; lot?: boolean } = {}): Identite {
  const dossiers = o.dossiers ?? []
  if (entete.id) {
    const f = fiches.find(x => x.id === entete.id)
    if (f && visible(f, dossiers)) return { genre: 'meme', fiche: f }
    if (f && f.effacement == null && f.creation == null && dansLaCorbeille(f, dossiers)) return { genre: 'corbeille', fiche: f }
    if (o.lot) return { genre: 'nouveau' }
  }
  const siens = appareils(vecteurFichier)
  let meilleur: { fiche: FicheClasseur; communs: number } | null = null
  for (const f of fiches) {
    if (!visible(f, dossiers)) continue
    const v = o.vecteurs?.get(f.id) ?? f.vecteur
    if (!v) continue
    let communs = 0
    for (const c of appareils(v)) if (siens.has(c)) communs++
    if (!communs) continue
    if (!meilleur || communs > meilleur.communs
      || (communs === meilleur.communs && (f.modifie || 0) > (meilleur.fiche.modifie || 0))) meilleur = { fiche: f, communs }
  }
  return meilleur ? { genre: 'ressemble', ...meilleur } : { genre: 'nouveau' }
}

/** Ce qu'on fait d'un classeur déjà là, d'après la comparaison du fichier
 *  (a) et de la base (b) : rien (« Ouvrir celui de la bibliothèque »), le
 *  mettre à jour, ou l'ajouter comme copie */
export type Decision = 'rien' | 'mettre-a-jour' | 'copie'
export function decisionDe(c: ComparaisonVecteurs): Decision {
  return c === 'egal' || c === 'contenu' ? 'rien' : c === 'contient' ? 'mettre-a-jour' : 'copie'
}

// ---------- Les noms ----------
const MOIS = ['janvier', 'février', 'mars', 'avril', 'mai', 'juin', 'juillet', 'août', 'septembre', 'octobre', 'novembre', 'décembre']

/** Le nom d'un classeur d'après le nom de son fichier (un fichier sans nom
 *  dans son en-tête : d'avant le lot 4) : sans l'extension, sans le « (1) »
 *  d'un second téléchargement ; « tableau-2026-10-07-14h05 » (le nom des
 *  lots 1 à 3) donne « Tableau du 7 octobre 2026 » ; la date que
 *  nomClasseur ajoute (« Symétrie 2026-10-10 14h05 ») s'en va. */
export function nomDepuisFichier(nomFichier: string): string {
  let n = String(nomFichier ?? '').replace(/^.*[\\/]/, '').replace(/\.(memc|memb|mem)$/i, '').trim()
  n = n.replace(/\s*\(\d{1,3}\)$/, '').trim()
  const t = /^tableau-(\d{4})-(\d{2})-(\d{2})(?:-(\d{2})h(\d{2}))?$/i.exec(n)
  if (t) {
    const mois = Number(t[2]), jour = Number(t[3])
    if (mois >= 1 && mois <= 12 && jour >= 1 && jour <= 31) return `Tableau du ${jour === 1 ? '1er' : jour} ${MOIS[mois - 1]} ${t[1]}`
  }
  n = n.replace(/[\s_-]+\d{4}-\d{2}-\d{2}[\s_-]+\d{1,2}h\d{2}$/i, '').replace(/[\s_-]+\d{4}-\d{2}-\d{2}$/, '')
  return nomDeClasseur(n) ?? 'Classeur'
}

// ---------- Les phrases ----------
/** « « f.memc » : 12 pages, enregistré le mardi 7 octobre 2026 à 14 h 05. » */
export function texteDuFichier(nomFichier: string, pages: number, date: number): string {
  const quand = Number.isFinite(date) && date > 0 ? `, enregistré ${dateLisible(date)}` : ''
  return `« ${nomFichier} » : ${pagesLisibles(pages)}${quand}.`
}

/** « Ce classeur est déjà dans la bibliothèque : « Symétrie » (modifié
 *  aujourd'hui à 14 h 05). », ou « Ce fichier ressemble au classeur… » */
export function texteDejaLa(i: { genre: 'meme' | 'ressemble'; fiche: FicheClasseur }, maintenant: number): string {
  const f = i.fiche
  const quand = f.modifie > 0 ? ` (modifié ${quandCourt(f.modifie, maintenant)})` : ''
  return i.genre === 'meme'
    ? `Ce classeur est déjà dans la bibliothèque : « ${f.nom} »${quand}.`
    : `Ce fichier ressemble au classeur « ${f.nom} » de la bibliothèque${quand} : ils ont la même origine.`
}

export const TEXTE_CORBEILLE = '(Un classeur de même origine est dans la corbeille.)'

/** Une copie (« Dupliquer le classeur », « Ajouter comme copie ») ne garde
 *  pas le registre des séances publiées de son original : republier depuis
 *  elle une séance de l'original mettrait à jour le lien déjà donné à
 *  l'autre classe. Ce qu'on en dit, après la copie d'un classeur qui avait
 *  des séances publiées ; et après un lot (plusieurs fichiers, une
 *  bibliothèque) où au moins une copie en avait. */
export const TEXTE_PUBLIEES_COPIE = 'Ses séances déjà publiées le restent depuis l\'original : en publier une depuis la copie fait un nouveau lien.'
export const TEXTE_PUBLIEES_COPIES = 'Une copie ne garde pas les séances publiées de son original : en publier une depuis la copie fait un nouveau lien.'

/** Ce que dit la comparaison du fichier et du classeur de la bibliothèque */
export function texteComparaison(c: ComparaisonVecteurs): string {
  if (c === 'egal' || c === 'contenu') return 'Celui de la bibliothèque contient déjà tout ce fichier.'
  if (c === 'contient') return 'Le fichier est plus récent : il contient tout ce que la bibliothèque a de ce classeur, et plus.'
  return 'Le fichier et celui de la bibliothèque ont changé chacun de leur côté.'
}

/** Pourquoi un fichier ne s'ouvre pas, en quelques mots (les bilans), d'après
 *  la phrase de lireTableau */
export function raisonCourte(message: string): string {
  if (message === ABIME) return 'ce fichier .memc est abîmé'
  if (message === UN_FILM) return 'c\'est un film pour les élèves (.mem), pas un classeur'
  if (message === PAS_UN_TABLEAU) return 'ce n\'est pas un classeur (.memc)'
  if (message === PLUS_RECENT) return 'il vient d\'une version plus récente de MEM teachingtool'
  const m = String(message ?? '').trim().replace(/[.\s]+$/, '')
  return m ? m[0].toLowerCase() + m.slice(1) : 'il ne se lit pas'
}

const pluriel = (n: number, un: string, des: string) => `${n} ${n > 1 ? des : un}`

/** Un fichier parmi plusieurs, et ce qu'on en fera */
export type Prevu =
  | { nom: string; genre: 'ajouter' | 'rien' | 'mettre-a-jour' | 'copie' }
  | { nom: string; genre: 'illisible'; raison: string }
  | { nom: string; genre: 'bibliotheque' }

/** Avant d'ouvrir plusieurs fichiers : « 4 fichiers : 2 classeurs à
 *  ajouter ; 1 déjà dans la bibliothèque (rien à faire) ; 1 plus récent dans
 *  le fichier (mis à jour) ; 1 illisible : « x.memc » : ce fichier .memc est
 *  abîmé. » */
export function texteAvantPlusieurs(prevus: readonly Prevu[]): string {
  const n = (g: Prevu['genre']) => prevus.filter(p => p.genre === g).length
  const morceaux: string[] = []
  if (n('ajouter')) morceaux.push(`${pluriel(n('ajouter'), 'classeur', 'classeurs')} à ajouter`)
  if (n('rien')) morceaux.push(`${n('rien')} déjà dans la bibliothèque (rien à faire)`)
  if (n('mettre-a-jour')) morceaux.push(`${n('mettre-a-jour')} plus récent${n('mettre-a-jour') > 1 ? 's' : ''} dans le fichier (mis à jour)`)
  if (n('copie')) morceaux.push(`${n('copie')} qui a changé des deux côtés (ajouté${n('copie') > 1 ? 's' : ''} comme copie)`)
  const illisibles = prevus.filter((p): p is Extract<Prevu, { genre: 'illisible' }> => p.genre === 'illisible')
  if (illisibles.length) morceaux.push(`${pluriel(illisibles.length, 'illisible', 'illisibles')} : ${illisibles.map(p => `« ${p.nom} » : ${p.raison}`).join(' ; ')}`)
  const biblios = prevus.filter(p => p.genre === 'bibliotheque')
  if (biblios.length) morceaux.push(`${pluriel(biblios.length, 'bibliothèque', 'bibliothèques')} (.memb) à ouvrir seule${biblios.length > 1 ? 's' : ''} : ${biblios.map(p => `« ${p.nom} »`).join(', ')}`)
  return `${pluriel(prevus.length, 'fichier', 'fichiers')} : ${morceaux.join(' ; ')}.`
}

/** Ce qui a été fait (plusieurs fichiers, ou une bibliothèque) */
export interface Bilan {
  ajoutes: number
  misAJour: number
  copies: number
  illisibles: { nom: string; raison: string }[]
  /** Pas ajoutés faute de place (leurs noms) */
  manques: string[]
  /** Les copies ajoutées dont le registre des publications a été vidé
   *  (l'original avait des séances publiées) : voir TEXTE_PUBLIEES_COPIES */
  publiees?: number
}
export const bilanVide = (): Bilan => ({ ajoutes: 0, misAJour: 0, copies: 0, illisibles: [], manques: [], publiees: 0 })

/** « 3 classeurs ajoutés à la bibliothèque, 1 mis à jour. » */
export function texteApresPlusieurs(b: Bilan): string {
  const faits: string[] = []
  if (b.ajoutes) faits.push(`${pluriel(b.ajoutes, 'classeur ajouté', 'classeurs ajoutés')} à la bibliothèque`)
  if (b.copies) faits.push(`${b.copies} ajouté${b.copies > 1 ? 's' : ''} comme copie`)
  if (b.misAJour) faits.push(`${b.misAJour} mis à jour`)
  let t = faits.length ? faits.join(', ') : 'Aucun classeur ajouté'
  t = t[0].toUpperCase() + t.slice(1)
  return t + finDuBilan(b) + '.' + apresLesCopies(b)
}

/** « Bibliothèque ouverte : 9 classeurs ajoutés, 2 mis à jour, 1 ajouté
 *  comme copie ; 1 illisible (« x » : …). » */
export function texteApresBibliotheque(b: Bilan): string {
  const faits: string[] = []
  faits.push(pluriel(b.ajoutes, 'classeur ajouté', 'classeurs ajoutés'))
  if (b.misAJour) faits.push(`${b.misAJour} mis à jour`)
  if (b.copies) faits.push(`${b.copies} ajouté${b.copies > 1 ? 's' : ''} comme copie`)
  return `Bibliothèque ouverte : ${faits.join(', ')}${finDuBilan(b)}.${apresLesCopies(b)}`
}

/** La phrase des séances publiées, après le bilan, s'il le faut */
const apresLesCopies = (b: Bilan) => b.publiees ? ` ${TEXTE_PUBLIEES_COPIES}` : ''

function finDuBilan(b: Bilan): string {
  let t = ''
  if (b.illisibles.length) t += ` ; ${pluriel(b.illisibles.length, 'illisible', 'illisibles')} (${b.illisibles.map(i => `« ${i.nom} » : ${i.raison}`).join(' ; ')})`
  if (b.manques.length) t += ` ; plus de place dans ce navigateur : ${pluriel(b.manques.length, 'classeur n\'a', 'classeurs n\'ont')} pas été ajouté${b.manques.length > 1 ? 's' : ''} (${b.manques.map(n => `« ${n} »`).join(', ')})`
  return t
}

/** « Ouvrir cette bibliothèque ? » : « « x.memb » : 12 classeurs et 4
 *  dossiers, enregistrée le …. Déjà dans ce navigateur : 3 (ils ne sont pas
 *  touchés). À ajouter : 9. », puis ce qui s'ajoute comme copie, ce qui ne
 *  se lit pas */
export function texteAvantBibliotheque(o: { nomFichier: string; classeurs: number; dossiers: number; date: number; deja: number; aAjouter: number; copies: readonly string[]; illisibles: readonly { nom: string; raison: string }[] }): string {
  const quand = Number.isFinite(o.date) && o.date > 0 ? `, enregistrée ${dateLisible(o.date)}` : ''
  const dossiers = o.dossiers ? ` et ${pluriel(o.dossiers, 'dossier', 'dossiers')}` : ''
  let t = `« ${o.nomFichier} » : ${pluriel(o.classeurs, 'classeur', 'classeurs')}${dossiers}${quand}.`
  if (o.deja) t += ` Déjà dans ce navigateur : ${o.deja} (${o.deja > 1 ? 'ils ne sont pas touchés' : 'il n\'est pas touché'}).`
  t += ` À ajouter : ${o.aAjouter}`
  if (o.copies.length) t += ` (dont ${o.copies.length} comme copie${o.copies.length > 1 ? 's' : ''} : ${o.copies.map(n => `« ${n} »`).join(', ')}, qui ${o.copies.length > 1 ? 'ont' : 'a'} changé des deux côtés)`
  t += '.'
  if (o.illisibles.length) t += ` Illisible${o.illisibles.length > 1 ? 's' : ''} : ${o.illisibles.length} (${o.illisibles.map(i => `« ${i.nom} » : ${i.raison}`).join(' ; ')}).`
  return t
}

/** La case de la bibliothèque : mettre aussi à jour les classeurs plus
 *  récents dans le fichier (jamais sans elle) */
export function texteCasePlusRecents(n: number): string {
  return n > 1
    ? `Mettre aussi à jour les ${n} classeurs plus récents dans le fichier (ils contiennent tout ce que ce navigateur en a : rien n'est perdu)`
    : 'Mettre aussi à jour le classeur plus récent dans le fichier (il contient tout ce que ce navigateur en a : rien n\'est perdu)'
}

// ---------- Les dossiers d'une bibliothèque qu'on ouvre ----------
/** Ce que deviennent les dossiers d'une bibliothèque qu'on ouvre :
 *  correspondance (l'id d'un dossier du fichier → l'id du dossier d'ici où
 *  vont ses classeurs), les dossiers à créer, parents d'abord, et combien
 *  ont été réunis avec un dossier d'ici. */
export interface PlanDossiers { correspondance: Map<string, string>; aCreer: FicheDossier[]; reunis: number }

/** Les règles : le même id qu'un dossier visible d'ici, on garde celui
 *  d'ici (tel qu'il est, où il est) ; le même nom (sans la casse) sous le
 *  même parent, on les réunit ; sinon on le crée, sous son parent, avec sa
 *  couleur et son étiquette (son id s'il est libre). Les parents passent
 *  avant leurs enfants ; un dossier pris dans un cycle (le fichier d'un
 *  navigateur où deux onglets en ont fait un) va à la racine. */
export function planDesDossiers(locaux: readonly FicheDossier[], importes: readonly DossierArchive[], o: { idNeuf: () => string; maintenant: number }): PlanDossiers {
  const ici = new Map(locaux.map(d => [d.id, d]))
  const pris = new Set(locaux.map(d => d.id))
  const carteImp = new Map<string, FicheDossier>()
  for (const d of importes) if (!carteImp.has(d.id)) carteImp.set(d.id, { id: d.id, nom: d.nom, parent: d.parent, couleur: d.couleur, cree: d.cree, ...(d.etiquette ? { etiquette: d.etiquette } : {}) })
  // La profondeur de chacun (bornée : un cycle s'arrête), pour créer les parents d'abord
  const profondeur = (id: string) => parents(id, carteImp).length
  const ordre = [...carteImp.values()].sort((a, b) => profondeur(a.id) - profondeur(b.id))
  const correspondance = new Map<string, string>()
  const aCreer: FicheDossier[] = []
  // Ce qu'on regarde pour réunir : les dossiers visibles d'ici, et ceux qu'on crée
  const visibles = locaux.filter(d => dossierVisible(d, ici))
  let reunis = 0
  for (const d of ordre) {
    const nom = nomDeDossier(d.nom)
    if (!nom) continue
    // Son parent, d'ici : déjà traité (les parents d'abord) ; sinon (un
    // cycle, un parent qui manque) la racine
    const parent = d.parent !== null && correspondance.has(d.parent) ? correspondance.get(d.parent)! : null
    const meme = ici.get(d.id)
    if (meme && dossierVisible(meme, ici)) { correspondance.set(d.id, meme.id); reunis++; continue }
    const k = cleDe(nom)
    const homonyme = [...visibles, ...aCreer].find(x => x.parent === parent && cleDe(x.nom) === k)
    if (homonyme) { correspondance.set(d.id, homonyme.id); reunis++; continue }
    const id = pris.has(d.id) || !/^[0-9a-f]{16}$/.test(d.id) ? o.idNeuf() : d.id
    pris.add(id)
    const etiquette = d.etiquette ? nomDEtiquette(d.etiquette) : null
    const neuf: FicheDossier = { id, nom, parent, couleur: d.couleur ? couleurDe(d.couleur).valeur : COULEUR_DEFAUT, cree: d.cree > 0 ? d.cree : o.maintenant, ...(etiquette ? { etiquette } : {}) }
    aCreer.push(neuf)
    correspondance.set(d.id, id)
  }
  return { correspondance, aCreer, reunis }
}
