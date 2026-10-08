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

/** Ce que fait un doigt posé sur l'écran : il dessine avec l'outil choisi,
 *  comme le stylet ; ou il déplace la vue, prend et déplace les objets, et le
 *  stylet seul écrit (la paume posée sur l'écran ne laisse plus de traces).
 *  « Auto » : il dessine jusqu'au premier stylet posé sur un écran tactile. */
export type Doigt = 'auto' | 'dessine' | 'deplace'
const CLE_DOIGT = 'mem-doigt'
/** Un stylet s'est posé sur l'écran lui-même (iPad, Surface, tablette Android) */
const CLE_STYLET_DIRECT = 'mem-stylet-direct'

export const reglages = {
  molette: lire<Molette>(CLE_MOLETTE, ['defile', 'zoome'], 'defile'),
  doigt: lire<Doigt>(CLE_DOIGT, ['auto', 'dessine', 'deplace'], 'auto'),
  styletDirect: lire(CLE_STYLET_DIRECT, ['1', '0'], '0') === '1',
}

export function choisirMolette(m: Molette) {
  reglages.molette = m
  ecrire(CLE_MOLETTE, m)
}

/** Choisir « Auto » oublie le stylet déjà vu : on réapprend */
export function choisirDoigt(d: Doigt) {
  reglages.doigt = d
  ecrire(CLE_DOIGT, d)
  if (d === 'auto') noterStyletDirect(false)
}

export function noterStyletDirect(oui: boolean) {
  reglages.styletDirect = oui
  ecrire(CLE_STYLET_DIRECT, oui ? '1' : '0')
}

/** Le doigt déplace-t-il la vue (au lieu de dessiner) ? */
export function leDoigtDeplace(r: { doigt: Doigt; styletDirect: boolean } = reglages): boolean {
  return r.doigt === 'deplace' || (r.doigt === 'auto' && r.styletDirect)
}
