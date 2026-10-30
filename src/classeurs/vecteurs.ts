// =============================================================
// COMPARER DEUX VECTEURS D'ÉTAT YJS
// Le vecteur d'état d'un document dit, pour chaque appareil (clientID),
// combien de changements il en contient. Deux copies d'un même classeur
// (la base du navigateur, le fichier de la clé, la copie du Drive) se
// comparent ainsi sans rien rejouer :
// - 'egal' : elles ont les mêmes changements ;
// - 'contient' : a a tout ce qu'a b, et plus ;
// - 'contenu' : b a tout ce qu'a a, et plus ;
// - 'diverge' : chacune a des changements que l'autre n'a pas (deux
//   histoires qui se sont séparées : on ne les fusionne jamais).
// La clé s'en sert pour ne jamais écraser un fichier qui contient plus que
// le classeur (voir cle.ts), et pour voir qu'un classeur a perdu une partie
// de son histoire depuis la dernière écriture.
//
// La limite, connue : un effacement seul ne change pas le vecteur (Yjs le
// range à part, dans l'ensemble des effacements). Dans MEM, chaque geste
// note aussi une étape du film, qui, elle, le change ; seuls quelques
// changements hors des gestes (retirer le nom d'une page) n'y paraissent
// pas.
// Pur (yjs seulement) : se teste sous Node.
// =============================================================
import * as Y from 'yjs'

export type ComparaisonVecteurs = 'egal' | 'contient' | 'contenu' | 'diverge'

/** Un vecteur d'état, lu ; un appareil à 0 changement compte comme absent */
function lire(v: Uint8Array): Map<number, number> {
  const m = Y.decodeStateVector(v)
  for (const [c, n] of m) if (!(n > 0)) m.delete(c)
  return m
}

/** a a-t-il tout ce qu'a b ? */
function aTout(a: Map<number, number>, b: Map<number, number>): boolean {
  for (const [c, n] of b) if ((a.get(c) ?? 0) < n) return false
  return true
}

/** Compare deux vecteurs d'état (voir l'en-tête du fichier). Un vecteur
 *  illisible lève l'erreur de Yjs : à l'appelant de la rattraper. */
export function comparerVecteurs(a: Uint8Array, b: Uint8Array): ComparaisonVecteurs {
  const va = lire(a), vb = lire(b)
  const ab = aTout(va, vb), ba = aTout(vb, va)
  return ab && ba ? 'egal' : ab ? 'contient' : ba ? 'contenu' : 'diverge'
}

/** Le vecteur de tout ce qu'ont a et b ensemble (pour chaque appareil, le
 *  plus grand) : un classeur ouvert dans deux onglets, c'est sa base et ce
 *  que la mémoire de cet onglet n'y a pas encore écrit */
export function reunir(a: Uint8Array, b: Uint8Array): Uint8Array {
  const m = lire(a)
  for (const [c, n] of lire(b)) if ((m.get(c) ?? 0) < n) m.set(c, n)
  return Y.encodeStateVector(m)
}

/** a a tout ce qu'a b (égaux, ou a a plus) */
export function contient(a: Uint8Array, b: Uint8Array): boolean {
  const c = comparerVecteurs(a, b)
  return c === 'egal' || c === 'contient'
}

/** L'ancien fichier de la clé d'un classeur dont le niveau change de dossier
 *  (ordinateur.ts, lot 18), relu avant d'être laissé où il est : lu, son
 *  en-tête (l'id) et son vecteur ; id, celui du classeur ; base, le vecteur
 *  de sa base. 'pareil' : la base a tout ce qu'il a (ou il n'est pas à lui) :
 *  il peut rester où il est, intact, le classeur reçoit son fichier ailleurs ;
 *  'plus-riche' : il a des changements que la base n'a pas (modifié sur un
 *  autre poste, ou une base qui a perdu une partie) : il reste le fichier du
 *  classeur, à ouvrir d'abord. */
export function verdictAncienFichier(lu: { id?: string; vecteur: Uint8Array }, id: string, base: Uint8Array): 'pareil' | 'plus-riche' {
  if (lu.id && lu.id !== id) return 'pareil'
  const c = comparerVecteurs(base, lu.vecteur)
  return c === 'egal' || c === 'contient' ? 'pareil' : 'plus-riche'
}
