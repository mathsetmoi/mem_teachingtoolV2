// =============================================================
// LES ÉTABLISSEMENTS : LE DOSSIER OÙ SE RANGENT LES CLASSEURS (lot 18)
// Un classeur = un fichier .memc à un seul endroit, écrit tout seul. L'endroit :
// le dossier de l'ÉTABLISSEMENT (le professeur en a trois, chacun un dossier de
// Google Drive pour ordinateur, choisi une fois) › le dossier du NIVEAU (au nom
// qu'il tape, par exemple « 2 ») › un dossier par CLASSEUR, au nom du classeur,
// avec « <classeur>.memc » et les .mem de ses séances :
//   Drive LFB / 2 / 2_13_Probas / 2_13_Probas.memc
// Ce fichier tient la liste des établissements (le réglage 'etablissements',
// une clé nouvelle ; la poignée de chaque dossier dans
// 'etablissement-poignee:<id>', à part), et les niveaux pour lesquels le
// professeur a dit « Plus tard » à la fenêtre « Où ranger… » (le réglage
// 'ranger-plus-tard' : elle ne revient plus d'elle-même pour eux).
// Le dossier du niveau, lui, est un emplacement ordinaire (emplacements.ts,
// genre 'ordinateur', avec en plus l'id de son établissement) : tout ce qui
// marchait avec un niveau relié (Publier, Mettre à jour, la clé de chaque
// classeur) marche sans changement.
//
// Le début de ce fichier est pur (sans IndexedDB) : il se teste sous Node.
// =============================================================
import type { Registre } from './registre'
import type { BilanRelier } from './ordinateur'

/** Un établissement : un dossier choisi une fois, proposé ensuite sous son
 *  nom (celui que donne le navigateur, « LFB classeurs ») */
export interface Etablissement {
  id: string
  nom: string
  cree: number
}

/** La liste dans l'index de la bibliothèque */
export const REGLAGE_ETABLISSEMENTS = 'etablissements'
/** La poignée du dossier d'un établissement */
export const reglagePoigneeEtablissement = (id: string) => 'etablissement-poignee:' + id
/** Les niveaux (ids de dossiers) pour lesquels on a dit « Plus tard » */
export const REGLAGE_RANGER_PLUS_TARD = 'ranger-plus-tard'

const ID = /^[0-9a-f]{16}$/

/** La liste relue de l'index : seulement ce qui est bien formé, sans doublon */
export function lireEtablissements(x: unknown): Etablissement[] {
  if (!Array.isArray(x)) return []
  const l: Etablissement[] = []
  for (const e of x as Partial<Etablissement>[]) {
    if (!e || typeof e !== 'object' || typeof e.id !== 'string' || !ID.test(e.id)) continue
    if (typeof e.nom !== 'string' || !e.nom.trim()) continue
    if (l.some(y => y.id === e.id)) continue
    l.push({ id: e.id, nom: e.nom, cree: typeof e.cree === 'number' ? e.cree : 0 })
  }
  return l.sort((a, b) => a.nom.localeCompare(b.nom, 'fr', { numeric: true }) || (a.id < b.id ? -1 : 1))
}

/** Les ids de dossiers relus du réglage « Plus tard » : des chaînes non
 *  vides, sans doublon */
export function lirePlusTard(x: unknown): string[] {
  if (!Array.isArray(x)) return []
  const l: string[] = []
  for (const id of x) if (typeof id === 'string' && id && !l.includes(id)) l.push(id)
  return l
}

/** Un id (16 chiffres hexadécimaux), comme celui d'un emplacement */
export function nouvelId(): string {
  const o = new Uint8Array(8)
  crypto.getRandomValues(o)
  return [...o].map(x => x.toString(16).padStart(2, '0')).join('')
}

/** Le nom de l'établissement d'un emplacement : celui de la liste, sinon
 *  celui que l'emplacement a gardé (l'établissement a été retiré de la liste :
 *  les niveaux rangés chez lui gardent son nom à l'écran et dans le chemin de
 *  leurs fichiers) ; null : un dossier pour ce niveau seul (lot 7) */
export function nomDEtablissement(e: { etablissement?: string; etablissementNom?: string }, liste: readonly Etablissement[]): string | null {
  if (!e.etablissement) return null
  return liste.find(x => x.id === e.etablissement)?.nom ?? e.etablissementNom ?? null
}

/** Un chemin pour l'écran : « LFB classeurs › 2 › 2_13_Probas » */
export const cheminLisible = (segments: readonly string[]) => segments.join(' › ')

/** Une liste de noms pour un message : « Fractions », « Symétrie » et 3 autres */
function noms(l: readonly string[]): string {
  const q = l.slice(0, 3).map(n => `« ${n} »`)
  return l.length > 3 ? `${q.join(', ')} et ${l.length - 3} autre${l.length > 4 ? 's' : ''}` : q.join(', ')
}

/** Ce qu'a fait le rangement d'un niveau, en une phrase :
 *  « Les classeurs de « 2nde » se rangent dans « LFB classeurs › 2nde » :
 *  6 écrits, 1 déjà là, 1 à ouvrir d'abord (« Fonctions » : son fichier a
 *  des changements que la bibliothèque n'a pas). » ; sans classeur : « … iront
 *  dans « … » (il n'y en a pas encore). » ; tous déjà à leur place : « Rien de
 *  nouveau : les 6 classeurs de « 2nde » sont dans « … ». » ; ancien : le
 *  chemin d'avant, quand on vient de changer de dossier (les fichiers y
 *  restent). */
export function texteDuRangement(o: { niveau: string; chemin: readonly string[]; bilan: BilanRelier; ancien?: string | null }): string {
  const b = o.bilan, ou = cheminLisible(o.chemin)
  const relies = b.relies.length
  const n = b.ecrits.length + b.adoptes.length + b.plusRiches.length + b.ailleurs.length + b.aRelire.length + b.echecs.length
  const t: string[] = []
  if (!n && !relies) t.push(`Les classeurs de « ${o.niveau} » iront dans « ${ou} » (il n'y en a pas encore).`)
  // Tous déjà à leur place (« Mettre à jour », le même dossier repris) : rien de nouveau
  else if (!n) t.push(`Rien de nouveau : ${relies > 1 ? `les ${relies} classeurs` : 'le classeur'} de « ${o.niveau} » ${relies > 1 ? 'sont' : 'est'} dans « ${ou} ».`)
  else {
    const parts: string[] = []
    if (b.ecrits.length) parts.push(`${b.ecrits.length} écrit${b.ecrits.length > 1 ? 's' : ''}`)
    if (b.adoptes.length) parts.push(`${b.adoptes.length} déjà là`)
    if (b.plusRiches.length) parts.push(`${b.plusRiches.length} à ouvrir d'abord (${noms(b.plusRiches)} : ${b.plusRiches.length > 1 ? 'leur' : 'son'} fichier a des changements que la bibliothèque n'a pas)`)
    if (b.ailleurs.length) parts.push(`${b.ailleurs.length} garde${b.ailleurs.length > 1 ? 'nt leur' : ' son'} fichier ailleurs (${noms(b.ailleurs)})`)
    if (relies) parts.push(`${relies} déjà à ${relies > 1 ? 'leur' : 'sa'} place`)
    if (b.aRelire.length) parts.push(`${b.aRelire.length} garde${b.aRelire.length > 1 ? 'nt leur' : ' son'} fichier d'avant (${noms(b.aRelire)} : ce navigateur n'a pas pu le relire ; ${b.aRelire.length > 1 ? 'ouvrez-les' : 'ouvrez-le'}, puis « Mettre à jour »)`)
    if (b.echecs.length) parts.push(`${b.echecs.length} n'${b.echecs.length > 1 ? 'ont' : 'a'} pas pu être écrit${b.echecs.length > 1 ? 's' : ''} (${noms(b.echecs)}${b.raison ? ` : ${b.raison}` : ''})`)
    t.push(`Les classeurs de « ${o.niveau} » se rangent dans « ${ou} » : ${parts.join(', ')}.`)
  }
  if (o.ancien) t.push(`Les fichiers d'avant restent dans « ${o.ancien} ».`)
  return t.join(' ')
}

// ---------- L'index de la bibliothèque ----------

/** Les établissements de cette bibliothèque, par nom */
export async function etablissements(registre: Registre): Promise<Etablissement[]> {
  return lireEtablissements(await registre.reglage(REGLAGE_ETABLISSEMENTS).catch(() => undefined))
}

/** Ajoute (ou remplace, au même id) un établissement, avec la poignée de son
 *  dossier. Un navigateur qui ne garde pas la poignée (DataCloneError) : rien
 *  n'est noté, l'erreur remonte. */
export async function garderEtablissement(registre: Registre, e: Etablissement, poignee: unknown): Promise<void> {
  await registre.ecrireReglage(reglagePoigneeEtablissement(e.id), poignee)
  const tous = (await etablissements(registre)).filter(x => x.id !== e.id)
  await registre.ecrireReglage(REGLAGE_ETABLISSEMENTS, [...tous, e])
}

/** Retire un établissement de la liste et sa poignée : jamais un fichier ;
 *  les niveaux rangés chez lui gardent leur propre poignée et marchent toujours */
export async function retirerEtablissement(registre: Registre, id: string): Promise<void> {
  const l = (await etablissements(registre)).filter(x => x.id !== id)
  await registre.ecrireReglage(REGLAGE_ETABLISSEMENTS, l)
  await registre.ecrireReglage(reglagePoigneeEtablissement(id), undefined).catch(() => {})
}

/** Les niveaux pour lesquels on a dit « Plus tard » */
export async function plusTard(registre: Registre): Promise<string[]> {
  return lirePlusTard(await registre.reglage(REGLAGE_RANGER_PLUS_TARD).catch(() => undefined))
}

/** « Plus tard » pour ce niveau : la fenêtre ne reviendra plus d'elle-même */
export async function noterPlusTard(registre: Registre, dossierId: string): Promise<void> {
  const l = await plusTard(registre)
  if (l.includes(dossierId)) return
  await registre.ecrireReglage(REGLAGE_RANGER_PLUS_TARD, [...l, dossierId])
}
