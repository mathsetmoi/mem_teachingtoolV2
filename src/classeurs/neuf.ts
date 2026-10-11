// =============================================================
// L'ÉTAT D'UN CLASSEUR NEUF
// Ce qu'on range dans la base d'un nouveau classeur avant de l'ouvrir :
// une page vide, au fond choisi, et sa naissance dans le film. Le classeur
// s'ouvre ensuite sans page de plus (charger() n'ajoute une page qu'à un
// document vide).
// =============================================================
import * as Y from 'yjs'
import { Tableau } from '../document'
import type { Fond } from '../types'

export async function etatNeuf(fond: Fond): Promise<Uint8Array> {
  const t = new Tableau(null)
  try {
    t.ajouterPage(fond, 0)
    // Tableau pousse l'étape du film dans une micro-tâche, juste après la
    // transaction (mesuré : 0 étape tout de suite, 1 après)
    await Promise.resolve()
    if (t.film.length !== 1) throw new Error('La naissance de la première page manque au film.')
    return Y.encodeStateAsUpdate(t.doc)
  } finally {
    t.doc.destroy()
  }
}
