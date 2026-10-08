// =============================================================
// LES RÉGLAGES DE CET APPAREIL
// Ce que le professeur règle pour SA machine (la molette de sa souris,
// le rôle de son doigt…) : rangé dans le navigateur, jamais dans le
// document. Un fichier enregistré, un film publié ou une autre machine
// ne les voient donc pas. Ils sont lus une fois, au chargement, et gardés
// en mémoire ; un navigateur qui refuse de les garder (navigation privée,
// stockage bloqué) les oublie à la fermeture, et c'est tout.
// Les clés déjà en service ailleurs ne changent pas : 'mem-automatismes',
// 'mem-construction-instruments', 'mem-construction-existants',
// 'tableau-mem:compte-google:…'.
// =============================================================

/** La valeur gardée sous cette clé, si elle fait partie des valeurs permises */
export function lire<T extends string>(cle: string, valides: readonly T[], defaut: T): T {
  try {
    const v = localStorage.getItem(cle)
    return v !== null && (valides as readonly string[]).includes(v) ? v as T : defaut
  } catch { return defaut }
}

export function ecrire(cle: string, v: string) {
  try { localStorage.setItem(cle, v) } catch { /* le réglage vaut pour cette fois */ }
}

/** Ce que fait la molette d'une souris : défiler (comme partout), ou zoomer
 *  (comme dans GeoGebra). Ctrl + molette et le pincement zooment toujours. */
export type Molette = 'defile' | 'zoome'
const CLE_MOLETTE = 'mem-molette'

export const reglages = {
  molette: lire<Molette>(CLE_MOLETTE, ['defile', 'zoome'], 'defile'),
}

export function choisirMolette(m: Molette) {
  reglages.molette = m
  ecrire(CLE_MOLETTE, m)
}
