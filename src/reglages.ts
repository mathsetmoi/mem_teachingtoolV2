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
// 'tableau-mem:compte-google:…'. Ailleurs aussi, une clé qui n'est pas un
// réglage : 'mem-presse-papiers', la dernière copie d'objets (voir app.ts),
// qu'un autre onglet colle, oubliée au bout de 12 heures. Les clés de ce
// fichier : 'mem-molette', 'mem-doigt', 'mem-stylet-direct', et
// 'mem-gestes-doigts' (les gestes à deux et trois doigts), et depuis le
// lot 5 'mem-gomme' (ce qu'efface la gomme : le trait entier, ou seulement
// là où elle passe), 'mem-gomme-taille' (sa taille, là où elle passe),
// 'mem-contraste' (le contraste renforcé, pour le vidéoprojecteur : '1' ou
// '0') et 'mem-noms-outils' (les noms sous les outils : '1' ou '0', écrite
// seulement quand on choisit ; absente, l'écran décide). Ces deux-là ne
// touchent qu'à l'écran du professeur : ni le document, ni le film, ni les
// sorties, ni le lecteur des élèves (qui, sur GitHub Pages, partage
// pourtant ce stockage) ne les lisent.
// Lue et écrite par ses fonctions depuis src/sorties/apercu.ts :
// 'mem-sortie-fond', le fond imprimé ou non sur l'image copiée et dans le
// PDF (nouvelle clé).
// =============================================================
import { ecranTactile } from './pointeurs'
import { TELEPHONE } from './navigateur'

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

/** Un toucher bref à deux doigts annule, à trois rétablit (voir
 *  TOUCHER_DOIGTS) : '1' ou '0'. Allumé au départ sur un appareil dont
 *  l'écran se touche (tablette, TNI, Surface), éteint ailleurs : un
 *  ordinateur à souris et tablette graphique n'a pas de doigts sur l'écran. */
const CLE_GESTES = 'mem-gestes-doigts'

/** Ce qu'efface la gomme (lot 5) : 'trait', ce qu'elle touche part en
 *  entier (un trait, une figure, une formule, jamais une image : la gomme de
 *  toujours, le défaut, choisi par le professeur) ; 'zone', seulement là où
 *  elle passe : elle coupe l'écriture et le surligneur, et laisse le reste
 *  (voir gomme.ts). Le bout gomme du stylet suit le même choix. */
export type ModeGomme = 'trait' | 'zone'
const CLE_GOMME = 'mem-gomme'
/** La taille de la gomme qui efface là où elle passe (voir RAYON_GOMME) */
export type TailleGomme = 'petite' | 'moyenne' | 'grande'
const CLE_TAILLE_GOMME = 'mem-gomme-taille'
/** Le rayon de la gomme qui efface là où elle passe, en pixels d'écran (à
 *  tout zoom, elle couvre autant de l'écran : on gomme ce qu'on voit). La
 *  gomme au trait entier garde son rayon de toujours, 12 px (RAYON_TRAIT). */
export const RAYON_GOMME: Record<TailleGomme, number> = { petite: 6, moyenne: 14, grande: 30 }
export const RAYON_TRAIT = 12

/** Le contraste renforcé (lot 5), pour le vidéoprojecteur : les lignes du
 *  fond, les barres, la sélection et les poignées plus marquées, à l'écran
 *  du professeur seulement (voir rendu.ts, fonds.ts, style.css). Éteint au
 *  départ. */
const CLE_CONTRASTE = 'mem-contraste'
/** Les noms sous les outils (lot 5) : '1' oui, '0' non ; 'auto' tant qu'on
 *  n'a rien choisi (la clé est alors absente), et l'écran décide (voir
 *  nomsOutilsVisibles) */
export type NomsOutils = 'auto' | '1' | '0'
const CLE_NOMS_OUTILS = 'mem-noms-outils'

export const reglages = {
  molette: lire<Molette>(CLE_MOLETTE, ['defile', 'zoome'], 'defile'),
  doigt: lire<Doigt>(CLE_DOIGT, ['auto', 'dessine', 'deplace'], 'auto'),
  styletDirect: lire(CLE_STYLET_DIRECT, ['1', '0'], '0') === '1',
  gestes: lire(CLE_GESTES, ['1', '0'], ecranTactile() ? '1' : '0') === '1',
  gomme: lire<ModeGomme>(CLE_GOMME, ['trait', 'zone'], 'trait'),
  tailleGomme: lire<TailleGomme>(CLE_TAILLE_GOMME, ['petite', 'moyenne', 'grande'], 'moyenne'),
  contraste: lire(CLE_CONTRASTE, ['1', '0'], '0') === '1',
  nomsOutils: lire<NomsOutils>(CLE_NOMS_OUTILS, ['1', '0'], 'auto'),
}

/** Le contraste renforcé, sur cet appareil */
export function choisirContraste(oui: boolean) {
  reglages.contraste = oui
  ecrire(CLE_CONTRASTE, oui ? '1' : '0')
}

/** Les noms sous les outils, sur cet appareil : choisis, ils ne dépendent
 *  plus de l'écran */
export function choisirNomsOutils(oui: boolean) {
  reglages.nomsOutils = oui ? '1' : '0'
  ecrire(CLE_NOMS_OUTILS, reglages.nomsOutils)
}

/** Ce que voit l'appareil pour décider des noms sous les outils en 'auto'
 *  (les essais sous Node en donnent un) */
export interface Ecran {
  /** navigator.maxTouchPoints */
  points: number
  /** matchMedia('(any-pointer: coarse)') : un pointeur grossier (le doigt) */
  grossier: boolean
  /** screen.width et screen.height : l'écran, pas la fenêtre */
  largeur: number
  hauteur: number
  /** matchMedia(TELEPHONE) : la mise en page du téléphone */
  telephone: boolean
}

/** L'écran de cet appareil, lu maintenant */
export function ecranDeLAppareil(): Ecran {
  const m = (q: string) => typeof matchMedia === 'function' && matchMedia(q).matches
  const s = typeof screen === 'undefined' ? { width: 0, height: 0 } : screen
  return { points: typeof navigator === 'undefined' ? 0 : navigator.maxTouchPoints ?? 0, grossier: m('(any-pointer: coarse)'),
    largeur: s.width, hauteur: s.height, telephone: m(TELEPHONE) }
}

/** Les noms sous les outils se montrent-ils, d'après le réglage ? '1' oui,
 *  '0' non ; 'auto' (D15 du lot 5) : sur un écran qui se touche (ou à
 *  pointeur grossier) dont la PLUS PETITE dimension fait au moins 900 px —
 *  un TNI, une grande tablette comme l'iPad Pro 12,9 pouces —, et pas sur
 *  un téléphone. Éteints au poste de la classe (souris et tablette
 *  graphique : l'infobulle y existe, et à 768 px de haut les noms feraient
 *  défiler la barre des outils), sur un iPad de 11 pouces (820 px de côté :
 *  en paysage, la barre défilerait) et au téléphone. L'écran (screen), et
 *  non la fenêtre : la décision ne change pas quand on tourne la tablette.
 *  (La mise en page du téléphone les éteint de toute façon : voir
 *  UI.majNomsOutils.) */
export function nomsOutilsVisibles(r: { nomsOutils: NomsOutils } = reglages, e: Ecran = ecranDeLAppareil()): boolean {
  if (r.nomsOutils !== 'auto') return r.nomsOutils === '1'
  return (e.points > 0 || e.grossier) && Math.min(e.largeur, e.hauteur) >= 900 && !e.telephone
}

/** Ce qu'efface la gomme, sur cet appareil */
export function choisirGomme(m: ModeGomme) {
  reglages.gomme = m
  ecrire(CLE_GOMME, m)
}

/** La taille de la gomme qui efface là où elle passe, sur cet appareil */
export function choisirTailleGomme(t: TailleGomme) {
  reglages.tailleGomme = t
  ecrire(CLE_TAILLE_GOMME, t)
}

/** Le rayon de la gomme, en pixels d'écran, pour ce mode */
export function rayonGomme(mode: ModeGomme = reglages.gomme, taille: TailleGomme = reglages.tailleGomme): number {
  return mode === 'zone' ? RAYON_GOMME[taille] : RAYON_TRAIT
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

/** Les gestes à deux et trois doigts : allumés ou coupés, sur cet appareil */
export function choisirGestes(oui: boolean) {
  reglages.gestes = oui
  ecrire(CLE_GESTES, oui ? '1' : '0')
}

export function noterStyletDirect(oui: boolean) {
  reglages.styletDirect = oui
  ecrire(CLE_STYLET_DIRECT, oui ? '1' : '0')
}

/** Le doigt déplace-t-il la vue (au lieu de dessiner) ? */
export function leDoigtDeplace(r: { doigt: Doigt; styletDirect: boolean } = reglages): boolean {
  return r.doigt === 'deplace' || (r.doigt === 'auto' && r.styletDirect)
}
