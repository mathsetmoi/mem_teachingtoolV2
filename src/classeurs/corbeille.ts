// =============================================================
// LA CORBEILLE DE LA BIBLIOTHÈQUE, ET LES CLASSEURS RETROUVÉS (un modèle pur)
// Ce que montre la vue de la corbeille (les dossiers et les classeurs
// supprimés, le dernier d'abord), ce qu'effacent « Supprimer
// définitivement » et « Vider la corbeille » (un dossier : tous ses
// classeurs et tous ses sous-dossiers), et tous les textes : les messages,
// les questions, la place du navigateur.
//
// OÙ C'EST NOTÉ : un classeur ou un dossier est dans la corbeille quand sa
// fiche porte corbeille = { t } (voir demarrage.dansLaCorbeille : un
// classeur dans un dossier à la corbeille ne se montre plus non plus). Rien
// n'est effacé tant qu'on ne vide pas : remettre ôte la marque. Effacer un
// classeur pose d'abord effacement sur sa fiche (elle disparaît partout),
// puis efface sa base (voir effacer.ts).
//
// Les classeurs retrouvés : une base de classeur qu'aucune fiche ne désigne
// (un index perdu, ou la version d'avant qui recrée « mem-tableau-local »
// après qu'on a vidé le premier classeur) est adoptée si elle n'est pas
// vide (estVide), sous son nom et son id rangés à côté du document s'ils y
// sont (voir adoption.ts).
//
// Ce fichier est pur (sans DOM ni IndexedDB) : il se teste sous Node.
// =============================================================
import type { FicheClasseur, FicheDossier } from './demarrage'
import { BASE_PREMIER, parents } from './demarrage'
import type { Dossiers } from './arbre'
import { cheminLisible, descendants, dossierVisible } from './arbre'
import type { ExamenBase } from './ecrivain-pur'
import { quandCourt, nomDeClasseur } from './liste'
import { pagesLisibles, tailleLisible } from '../fichier'
import { nomsLisibles } from './verifier'

const enCarte = (d: Dossiers): ReadonlyMap<string, FicheDossier> =>
  d instanceof Map ? d : new Map((d as readonly FicheDossier[]).map(x => [x.id, x]))
const s = (n: number) => (n > 1 ? 's' : '')

// ---------- Ce qu'il y a dans la corbeille ----------
/** Un élément de la corbeille : un classeur ou un dossier, supprimé à t */
export type ElementCorbeille =
  | { genre: 'classeur'; fiche: FicheClasseur; t: number }
  | { genre: 'dossier'; dossier: FicheDossier; t: number }

/** La clé d'un élément (celle des cartes de la bibliothèque : l'id d'un
 *  classeur, « d: » et l'id d'un dossier) */
export const cleElement = (e: ElementCorbeille) => e.genre === 'classeur' ? e.fiche.id : 'd:' + e.dossier.id

/** Les dossiers et les classeurs marqués supprimés, le dernier supprimé
 *  d'abord. Un classeur supprimé dans un dossier qu'on a supprimé ensuite
 *  paraît aussi pour lui-même (on peut le remettre seul). Un classeur qui
 *  part (effacement) ou qui naît (creation) n'y est pas. */
export function elementsDeLaCorbeille(fiches: readonly FicheClasseur[], dossiers: Dossiers): ElementCorbeille[] {
  const l: ElementCorbeille[] = []
  for (const f of fiches) if (f.corbeille && f.effacement == null && f.creation == null) l.push({ genre: 'classeur', fiche: f, t: f.corbeille.t })
  for (const d of enCarte(dossiers).values()) if (d.corbeille) l.push({ genre: 'dossier', dossier: d, t: d.corbeille.t })
  return l.sort((a, b) => (b.t - a.t) || (cleElement(a) < cleElement(b) ? -1 : 1))
}

/** Libellé du bouton du bandeau : « Corbeille (3) », et son nom pour un
 *  lecteur d'écran : « Corbeille : 3 éléments », « Corbeille : vide » */
export function libelleCorbeille(n: number): { texte: string; nom: string } {
  return n ? { texte: `Corbeille (${n})`, nom: `Corbeille de la bibliothèque : ${n} élément${s(n)}` } : { texte: 'Corbeille', nom: 'Corbeille de la bibliothèque : vide' }
}

/** Tout ce qu'efface un dossier qu'on supprime définitivement : tous les
 *  classeurs de ses dossiers (lui et ses sous-dossiers, à toutes les
 *  profondeurs, qu'ils soient eux-mêmes à la corbeille ou non ; pas ceux
 *  qui partent déjà ou qui naissent), et tous ses sous-dossiers (le plus
 *  profond d'abord : on les efface dans cet ordre, puis lui) */
export function contenuDuDossier(dossierId: string, fiches: readonly FicheClasseur[], dossiers: Dossiers): { classeurs: FicheClasseur[]; dossiers: FicheDossier[] } {
  const carte = enCarte(dossiers)
  const sous = descendants(dossierId, carte)
  const dedans = new Set([dossierId, ...sous.map(d => d.id)])
  return {
    classeurs: fiches.filter(f => f.dossier !== null && dedans.has(f.dossier) && f.effacement == null && f.creation == null),
    // descendants() va de proche en proche : à l'envers, le plus profond d'abord
    dossiers: [...sous].reverse(),
  }
}

/** Ce que vide « Vider la corbeille » : les classeurs à la corbeille, ceux
 *  des dossiers à la corbeille (chacun une fois), et les dossiers (ceux de
 *  la corbeille et leurs sous-dossiers, le plus profond d'abord) */
export function contenuDeLaCorbeille(fiches: readonly FicheClasseur[], dossiers: Dossiers): { classeurs: FicheClasseur[]; dossiers: FicheDossier[] } {
  const carte = enCarte(dossiers)
  const classeurs = new Map<string, FicheClasseur>()
  const ds = new Map<string, FicheDossier>()
  for (const e of elementsDeLaCorbeille(fiches, carte)) {
    if (e.genre === 'classeur') { classeurs.set(e.fiche.id, e.fiche); continue }
    const c = contenuDuDossier(e.dossier.id, fiches, carte)
    for (const f of c.classeurs) classeurs.set(f.id, f)
    for (const d of c.dossiers) if (!ds.has(d.id)) ds.set(d.id, d)
    if (!ds.has(e.dossier.id)) ds.set(e.dossier.id, e.dossier)
  }
  // Un dossier à la corbeille dans un autre : les plus profonds d'abord
  const profondeur = (d: FicheDossier) => parents(d.id, carte).length
  return { classeurs: [...classeurs.values()], dossiers: [...ds.values()].sort((a, b) => profondeur(b) - profondeur(a)) }
}

/** Le nombre de pages de ces classeurs (ceux dont on ne sait pas encore le
 *  nombre ne comptent pas) */
export const pagesDe = (classeurs: readonly FicheClasseur[]) => classeurs.reduce((n, f) => n + (f.pages ?? 0), 0)

// ---------- Une carte de la corbeille ----------
/** « Supprimé aujourd'hui à 10 h 05 » ; pour un dossier, ce qu'il contient :
 *  « Supprimé hier à 9 h 12 · 4 classeurs » */
export function dateDeSuppression(t: number, maintenant: number, contenu?: { classeurs: number; dossiers: number }): string {
  const date = `Supprimé ${quandCourt(t, maintenant)}`
  if (!contenu) return date
  return `${date} · ${texteContenu(contenu) || 'vide'}`
}

/** « 4 classeurs », « 1 classeur · 2 dossiers », « 3 dossiers », '' */
export function texteContenu(c: { classeurs: number; dossiers: number }): string {
  const parts: string[] = []
  if (c.classeurs) parts.push(`${c.classeurs} classeur${s(c.classeurs)}`)
  if (c.dossiers) parts.push(`${c.dossiers} dossier${s(c.dossiers)}`)
  return parts.join(' · ')
}

/** « Était dans : 5e B › Géométrie » (« Bibliothèque » : la racine) */
export const etaitDans = (parent: string | null, dossiers: Dossiers) => `Était dans : ${cheminLisible(parent, dossiers)}`

// ---------- Supprimer (vers la corbeille), remettre ----------
/** Le message de Supprimer : « « Symétrie » est dans la corbeille de la
 *  bibliothèque. », « Dossier « 5e B » mis à la corbeille (4 classeurs) » */
export function texteMisALaCorbeille(o: { genre: 'classeur' | 'dossier'; nom: string; contenu?: { classeurs: number; dossiers: number } }): string {
  if (o.genre === 'classeur') return `« ${o.nom} » est dans la corbeille de la bibliothèque.`
  const c = o.contenu
  const detail = !c ? '' : c.classeurs ? ` (${c.classeurs} classeur${s(c.classeurs)})` : c.dossiers ? ` (${c.dossiers} dossier${s(c.dossiers)})` : ''
  return `Dossier « ${o.nom} » mis à la corbeille${detail}`
}

/** Où va ce qu'on remet : son dossier s'il se montre encore ; sinon la
 *  racine, et pourquoi (le dossier n'existe plus, ou il est lui-même dans la
 *  corbeille) */
export type OuRemettre = { dossier: string | null; raison?: 'absent' | 'corbeille' }
export function ouRemettre(parent: string | null, dossiers: Dossiers): OuRemettre {
  if (parent === null) return { dossier: null }
  const carte = enCarte(dossiers)
  const d = carte.get(parent)
  if (!d) return { dossier: null, raison: 'absent' }
  if (!dossierVisible(d, carte)) return { dossier: null, raison: 'corbeille' }
  return { dossier: parent }
}

/** « « Symétrie » remis dans « 5e B » », « … remis à la racine de la
 *  bibliothèque (son dossier n'existe plus) » */
export function texteRemis(o: { genre: 'classeur' | 'dossier'; nom: string; vers: string | null; raison?: 'absent' | 'corbeille' }): string {
  const qui = o.genre === 'classeur' ? `« ${o.nom} »` : `Dossier « ${o.nom} »`
  if (o.vers !== null) return `${qui} remis dans « ${o.vers} »`
  const pourquoi = o.raison === 'absent' ? (o.genre === 'classeur' ? ' (son dossier n\'existe plus)' : ' (le dossier où il était n\'existe plus)')
    : o.raison === 'corbeille' ? (o.genre === 'classeur' ? ' (son dossier est dans la corbeille)' : ' (le dossier où il était est dans la corbeille)') : ''
  return `${qui} remis à la racine de la bibliothèque${pourquoi}`
}

// ---------- Supprimer définitivement, vider ----------
/** Le classeur a-t-il été enregistré dans un fichier (la date de son
 *  dernier enregistrement, ou une écriture sur la clé) ou copié sur le
 *  Drive ? dernier : la date gardée sous sa clé de dernier enregistrement */
export function sauvegardesDe(f: FicheClasseur, dernier: number | null): { fichier: boolean; drive: boolean } {
  return { fichier: dernier !== null || !!f.cle?.t, drive: !!f.drive?.t }
}
export const jamaisEnregistre = (f: FicheClasseur, dernier: number | null) => { const x = sauvegardesDe(f, dernier); return !x.fichier && !x.drive }

export const titreDefinitifClasseur = (nom: string) => `Supprimer définitivement « ${nom} » ?`
export const titreDefinitifDossier = (nom: string) => `Supprimer définitivement le dossier « ${nom} » ?`
export const TITRE_VIDER = 'Vider la corbeille ?'
export const PAS_ANNULABLE = 'Ce n\'est pas annulable.'
export const JAMAIS_ENREGISTRE = 'Il n\'a jamais été enregistré dans un fichier ni copié sur le Drive : il n\'en restera rien.'

/** « Ses 12 pages et tout son historique (la revue, les séances à publier)
 *  seront effacés de ce navigateur. Ce n'est pas annulable. » */
export function texteDefinitifClasseur(pages: number | null): string {
  const ses = pages === null || pages <= 0 ? 'Ses pages' : pages === 1 ? 'Sa page' : `Ses ${pages} pages`
  return `${ses} et tout son historique (la revue, les séances à publier) seront effacés de ce navigateur. ${PAS_ANNULABLE}`
}

/** Ce qui reste ailleurs d'un classeur qu'on efface (ses fichiers, sa copie
 *  sur le Drive), ou qu'il n'en restera rien */
export function texteCeQuiReste(x: { fichier: boolean; drive: boolean }): string {
  if (x.fichier && x.drive) return 'Ses fichiers enregistrés et sa copie sur le Drive ne sont pas effacés.'
  if (x.fichier) return 'Ses fichiers enregistrés ne sont pas effacés.'
  if (x.drive) return 'Sa copie sur le Drive n\'est pas effacée.'
  return JAMAIS_ENREGISTRE
}

/** « Ses 4 classeurs (27 pages en tout) et ses 2 dossiers seront effacés de
 *  ce navigateur. Ce n'est pas annulable. » */
export function texteDefinitifDossier(c: { classeurs: number; pages: number; dossiers: number }): string {
  const sesDossiers = c.dossiers === 1 ? 'son dossier' : `ses ${c.dossiers} dossiers`
  if (!c.classeurs) {
    return c.dossiers ? `Il ne contient aucun classeur ; ${sesDossiers} seront effacés aussi. ${PAS_ANNULABLE}` : `Il ne contient aucun classeur. ${PAS_ANNULABLE}`
  }
  const pages = c.pages > 0 ? ` (${pagesLisibles(c.pages)}${c.classeurs > 1 ? ' en tout' : ''})` : ''
  const classeurs = c.classeurs === 1 ? `Son classeur${pages}` : `Ses ${c.classeurs} classeurs${pages}`
  const verbe = c.classeurs === 1 && !c.dossiers ? 'sera effacé' : 'seront effacés'
  return `${classeurs}${c.dossiers ? ` et ${sesDossiers}` : ''} ${verbe} de ce navigateur. ${PAS_ANNULABLE}`
}

/** « Vider la corbeille ? 3 classeurs (27 pages) et 1 dossier seront
 *  effacés de ce navigateur. Ce n'est pas annulable. » */
export function texteViderBibliotheque(c: { classeurs: number; pages: number; dossiers: number }): string {
  const parts: string[] = []
  if (c.classeurs) parts.push(`${c.classeurs} classeur${s(c.classeurs)}${c.pages > 0 ? ` (${pagesLisibles(c.pages)})` : ''}`)
  if (c.dossiers) parts.push(`${c.dossiers} dossier${s(c.dossiers)}`)
  const verbe = c.classeurs + c.dossiers > 1 ? 'seront effacés' : 'sera effacé'
  return `${parts.join(' et ')} ${verbe} de ce navigateur. ${PAS_ANNULABLE}`
}

/** « Dont 1 qui n'a jamais été enregistré dans un fichier. » ('' : aucun) */
export function texteJamais(n: number): string {
  if (!n) return ''
  return n === 1 ? 'Dont 1 qui n\'a jamais été enregistré dans un fichier.' : `Dont ${n} qui n'ont jamais été enregistrés dans un fichier.`
}

/** Les messages, une fois effacé */
export const texteEfface = (o: { genre: 'classeur' | 'dossier'; nom: string }) =>
  o.genre === 'classeur' ? `« ${o.nom} » supprimé définitivement.` : `Dossier « ${o.nom} » supprimé définitivement.`
export function texteVidee(c: { classeurs: number; dossiers: number }): string {
  const parts: string[] = []
  if (c.classeurs) parts.push(`${c.classeurs} classeur${s(c.classeurs)}`)
  if (c.dossiers) parts.push(`${c.dossiers} dossier${s(c.dossiers)}`)
  return parts.length ? `Corbeille vidée (${parts.join(', ')}).` : 'Corbeille vidée.'
}
export const BLOQUE = 'Le classeur sera effacé dès que l\'onglet où il est encore ouvert sera fermé.'
export const PAS_EFFACE = 'Le classeur n\'a pas pu être effacé de ce navigateur : il le sera au prochain démarrage.'

// ---------- Les images dont la corbeille tient la dernière copie (lot 17) ----------
/** Le message du bas quand la vérification des images dure (plus de 0,4 s) */
export const VERIFICATION_IMAGES = 'Vérification des images…'

/** Le paragraphe ajouté à la question quand des classeurs qui restent
 *  montrent des images dont la seule copie est dans ce qu'on efface : « 2
 *  images que « Fractions » et « Équations » montrent encore n'existent que
 *  dans la corbeille : elles seront d'abord recopiées dans ces classeurs. »
 *  ('' : aucune) */
export function texteAvantVider(images: number, noms: readonly string[]): string {
  if (!images || !noms.length) return ''
  const liste = nomsLisibles(noms)
  const montrent = noms.length > 1 ? 'montrent' : 'montre'
  const ces = noms.length > 1 ? 'ces classeurs' : 'ce classeur'
  return images > 1
    ? `${images} images que ${liste} ${montrent} encore n'existent que dans la corbeille : elles seront d'abord recopiées dans ${ces}.`
    : `1 image que ${liste} ${montrent} encore n'existe que dans la corbeille : elle sera d'abord recopiée dans ${ces}.`
}

/** « « Vieux chapitre » n'a pas pu être vérifié. » : sa base ne se lit pas ;
 *  on l'efface quand même ('' : tous vérifiés) */
export function texteNonVerifie(noms: readonly string[]): string {
  if (!noms.length) return ''
  return `${nomsLisibles(noms)} n'${noms.length > 1 ? 'ont' : 'a'} pas pu être vérifié${s(noms.length)}.`
}

/** Après l'effacement : « 2 images recopiées dans « Fractions ». » ('' : aucune) */
export function texteRecopiees(faites: readonly { nom: string; n: number }[]): string {
  const total = faites.reduce((a, x) => a + x.n, 0)
  if (!total) return ''
  return `${total} image${s(total)} recopiée${s(total)} dans ${nomsLisibles(faites.filter(x => x.n > 0).map(x => x.nom))}.`
}

/** Une recopie a échoué : ce classeur-là n'est pas effacé, et on le dit :
 *  « « Symétrie » n'a pas été effacé : ses images n'ont pas pu être
 *  recopiées dans « Fractions ». Recommencez. » */
export const textePasRecopiees = (nom: string, vers: readonly string[]) =>
  `« ${nom} » n'a pas été effacé : ses images n'ont pas pu être recopiées dans ${nomsLisibles(vers)}. Recommencez.`

// ---------- La place ----------
/** Au-delà de cette part du quota, on le dit en alerte */
export const PLACE_ALERTE = 0.8
/** « Ce navigateur garde 120 Mo pour ce site. » ; au-delà de 80 % du quota,
 *  l'alerte. null : on ne sait pas (navigator.storage.estimate manque). */
export function textePlace(e: { usage?: number; quota?: number } | null): { texte: string; alerte: boolean } | null {
  if (!e || typeof e.usage !== 'number' || !Number.isFinite(e.usage) || e.usage < 0) return null
  const q = e.quota
  if (typeof q === 'number' && Number.isFinite(q) && q > 0 && e.usage / q > PLACE_ALERTE) {
    const pct = Math.min(100, Math.round(e.usage / q * 100))
    return { texte: `Le navigateur manque de place (${pct} % utilisés) : enregistrez vos classeurs dans des fichiers, puis videz la corbeille.`, alerte: true }
  }
  return { texte: `Ce navigateur garde ${tailleLisible(e.usage)} pour ce site.`, alerte: false }
}

// ---------- Les classeurs retrouvés (l'adoption) ----------
export const NOM_RETROUVE_PREMIER = 'Tableau retrouvé (version d\'avant)'
export const NOM_RETROUVE = 'Classeur retrouvé'
const ID_VALABLE = /^[0-9a-f]{16}$/

/** Une base est vide au sens strict : aucune forme dans aucune page (celles
 *  de la corbeille des pages comprises), au plus une étape de film (la
 *  naissance de la première page), et ni piste des instruments, ni séance
 *  publiée, ni nom de page, ni corbeille des pages ; et un document entier.
 *  Une base vide n'est pas adoptée (elle ne montrerait qu'une page blanche). */
export function estVide(e: ExamenBase): boolean {
  return !e.incomplet && e.formes === 0 && e.film <= 1 && e.piste === 0 && e.publications === 0 && e.noms === 0 && e.corbeille === 0
}

/** La fiche d'une base adoptée : l'id et le nom rangés à côté du document
 *  s'ils y sont (l'id seulement s'il est valable et libre : pris, un id
 *  neuf) ; sinon « Tableau retrouvé (version d'avant) » pour la base du
 *  premier (la version d'avant l'a recréée), « Classeur retrouvé » pour les
 *  autres. À la racine, sans étiquette, jamais ouvert ; ses dates viennent
 *  du film. */
export function ficheRetrouvee(base: string, e: ExamenBase, infos: { id?: string; nom?: string } | undefined, o: { libre: (id: string) => boolean; idNeuf: () => string; maintenant: number }): FicheClasseur {
  const id = infos?.id && ID_VALABLE.test(infos.id) && o.libre(infos.id) ? infos.id : o.idNeuf()
  const nom = (infos?.nom && nomDeClasseur(infos.nom)) || (base === BASE_PREMIER ? NOM_RETROUVE_PREMIER : NOM_RETROUVE)
  const cree = e.cree || o.maintenant
  return { id, base, nom, dossier: null, etiquettes: [], cree, modifie: Math.max(e.modifie || 0, cree), ouvert: 0, pages: e.pages, vecteur: e.vecteur }
}

/** « Un classeur retrouvé dans ce navigateur a été remis dans la
 *  bibliothèque : « Tableau retrouvé (version d'avant) ». » */
export function texteRetrouves(noms: readonly string[]): string {
  const liste = noms.map(n => `« ${n} »`).join(', ')
  return noms.length === 1
    ? `Un classeur retrouvé dans ce navigateur a été remis dans la bibliothèque : ${liste}.`
    : `${noms.length} classeurs retrouvés dans ce navigateur ont été remis dans la bibliothèque : ${liste}.`
}
