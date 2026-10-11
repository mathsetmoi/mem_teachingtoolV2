// =============================================================
// LES CLASSEURS RETROUVÉS : L'ADOPTION DES BASES SANS FICHE
// Une base de classeur (« mem-tableau-local » ou « mem-teachingtool-
// classeur-<id> ») qu'aucune fiche de l'index ne désigne : l'index s'est
// perdu (supprimé à la main, effacé par le navigateur), ou la version
// d'avant (la clé du lot 3) a recréé « mem-tableau-local » après qu'on a
// vidé le premier classeur, et y a écrit. Rien de ce qu'elle garde ne doit
// se perdre : une fois par chargement de la page, à la première ouverture
// de la bibliothèque (si le navigateur sait lister ses bases :
// indexedDB.databases), on les cherche.
// - Les fiches comptent toutes, celles de la corbeille, celles qui partent
//   (effacement) et celles qui naissent (creation) aussi : leurs bases ne
//   sont pas orphelines. La liste des bases est lue AVANT les fiches : une
//   fiche est toujours écrite avant sa base (voir Registre.creerClasseur).
// - Chaque orpheline est lue par l'écrivain, hors du fil principal
//   (« examiner » : rejouée dans un Y.Doc nu, sans rien y écrire) : une base
//   de 27 Mo ne gèle rien.
// - Pas vide (voir corbeille.estVide) : elle est adoptée, dans UNE
//   transaction qui relit l'index (Registre.adopter : deux onglets qui
//   adoptent ensemble ne font qu'une fiche, l'index unique sur la base le
//   garantit). Son nom et son id viennent de ce qui est rangé à côté du
//   document (l'id s'il est libre) ; sinon « Tableau retrouvé (version
//   d'avant) » ou « Classeur retrouvé ». À la racine.
// - Vide : elle est laissée. On n'efface tout seul QU'UNE base
//   « mem-teachingtool-classeur-… » sans aucune entrée (une création
//   avortée) ; « mem-tableau-local » ne l'est jamais (la version d'avant
//   s'en sert).
// =============================================================
import type { FicheClasseur } from './demarrage'
import { BASE_PREMIER, PREFIXE_BASE, idClasseur } from './demarrage'
import type { Registre } from './registre'
import type { InfosBase } from './bases'
import { compterEntrees, ecrireInfos, effacerBase } from './bases'
import type { ExamenBase } from './ecrivain-pur'
import { estVide, ficheRetrouvee } from './corbeille'

/** Une base de classeur, à son nom */
export const estBaseDeClasseur = (nom: string | undefined): nom is string =>
  typeof nom === 'string' && (nom === BASE_PREMIER || (nom.startsWith(PREFIXE_BASE) && nom.length > PREFIXE_BASE.length))

export type Examiner = (base: string) => Promise<{ examen: ExamenBase; infos?: Partial<InfosBase> }>

export interface Adoption {
  /** Les fiches créées par cet onglet */
  adoptees: FicheClasseur[]
  /** Les bases vides (sans entrée) effacées */
  effacees: string[]
  /** Les bases laissées : vides au sens strict, ou illisibles */
  laissees: string[]
}

/** Cherche et adopte les bases sans fiche. Ne lève pas (une erreur : la
 *  base est laissée, on réessaiera au prochain chargement). */
export async function adopterLesOrphelines(registre: Registre, examiner: Examiner): Promise<Adoption> {
  const r: Adoption = { adoptees: [], effacees: [], laissees: [] }
  let noms: string[]
  try {
    const f = indexedDB as IDBFactory & { databases?: () => Promise<IDBDatabaseInfo[]> }
    if (typeof f.databases !== 'function') return r
    noms = (await f.databases()).map(d => d.name).filter(estBaseDeClasseur)
  } catch { return r }
  let fiches: FicheClasseur[]
  try { fiches = await registre.classeurs() } catch { return r }
  const connues = new Set(fiches.map(f => f.base))
  const ids = new Set(fiches.map(f => f.id))
  for (const base of noms) {
    if (connues.has(base)) continue
    try {
      // Une base sans aucune entrée : une création avortée (ou une base
      // ouverte sans version, qui n'a jamais rien eu)
      if (await compterEntrees(base) === 0) {
        if (base !== BASE_PREMIER && !(await registre.classeurParBase(base))) { await effacerBase(base); r.effacees.push(base) }
        else r.laissees.push(base)
        continue
      }
      const f = await adopterUneBase(registre, base, examiner, ids)
      if (f === 'vide') r.laissees.push(base)
      else if (f) r.adoptees.push(f)
    } catch { r.laissees.push(base) }
  }
  return r
}

/** Adopte une base sans fiche (une seule) : examinée, adoptée si elle n'est
 *  pas vide au sens strict (une transaction : deux onglets ne font qu'une
 *  fiche), son identité remise à côté du document si elle a changé. ids :
 *  les ids pris (celui de la fiche y est ajouté). 'vide' : laissée ; null :
 *  un autre onglet l'a adoptée. Ouvrir un fichier dont l'id désigne une
 *  base d'ici sans fiche s'en sert aussi (lot 4 C9) : on l'adopte d'abord,
 *  puis on la compare au fichier, sans jamais rien créer par-dessus. Lève
 *  ce que lèvent l'écrivain et l'index. */
export async function adopterUneBase(registre: Registre, base: string, examiner: Examiner, ids: Set<string>): Promise<FicheClasseur | 'vide' | null> {
  const { examen, infos } = await examiner(base)
  if (estVide(examen)) return 'vide'
  const fiche = ficheRetrouvee(base, examen, infos, { libre: id => !ids.has(id), idNeuf: idClasseur, maintenant: Date.now() })
  const f = await registre.adopter(fiche)
  if (!f) return null
  ids.add(f.id)
  // L'identité, de nouveau à côté du document (si l'id a changé)
  if (infos?.id !== f.id || infos?.nom !== f.nom) await ecrireInfos(base, { id: f.id, nom: f.nom }).catch(() => { /* l'index la garde */ })
  return f
}
