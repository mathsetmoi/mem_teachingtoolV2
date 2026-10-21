// =============================================================
// LA RECHERCHE DANS LA BIBLIOTHÈQUE
// Ce que la recherche (recherche-vue.ts, et le champ de la bibliothèque)
// sait des classeurs de ce navigateur : leur fiche (nom, classe, date), puis
// leur contenu (pages, séances, formules), lu dans leur base en lecture
// seule — une transaction readonly, le document refait en mémoire, lu,
// détruit ; rien n'est écrit. Le classeur ouvert est lu dans le tableau
// lui-même (ce qu'on vient d'écrire compte). Un contenu lu est gardé tant que
// la fiche du classeur n'a pas changé (sa date de modification).
// =============================================================
import * as Y from 'yjs'
import type { Registre } from './registre'
import type { FicheClasseur } from './demarrage'
import { cheminLisible, etiquetteHeritee } from './arbre'
import { lireMisesAJour } from './bases'
import type { ContenuClasseur } from '../recherche'
import { lireContenu } from '../recherche'
import type { ClasseurCherche } from '../recherche-vue'

const gardes = new Map<string, { modifie: number; contenu: ContenuClasseur | null }>()

/** Les classeurs (hors corbeille), avec leur classe et leur chemin ;
 *  courant : l'id du classeur ouvert dans cet onglet */
export async function classeursCherches(registre: Registre, courant: string | null): Promise<(ClasseurCherche & { fiche: FicheClasseur })[]> {
  const [fiches, dossiers] = await Promise.all([registre.classeurs(), registre.dossiers()])
  const carte = new Map(dossiers.filter(d => !d.corbeille).map(d => [d.id, d]))
  return fiches.filter(f => !f.corbeille).map(f => {
    const classe = f.dossier === null ? null : (etiquetteHeritee(f.dossier, carte)?.nom ?? carte.get(f.dossier)?.nom ?? null)
    return { id: f.id, nom: f.nom, classe, chemin: f.dossier === null ? '' : cheminLisible(f.dossier, carte), modifie: f.modifie,
      courant: f.id === courant, contenu: null, fiche: f }
  })
}

/** Le contenu d'un classeur fermé, lu dans sa base (null : illisible) */
export async function contenuDeLaBase(f: FicheClasseur): Promise<ContenuClasseur | null> {
  const g = gardes.get(f.id)
  if (g && g.modifie === f.modifie) return g.contenu
  let contenu: ContenuClasseur | null = null
  try {
    const { mises } = await lireMisesAJour(f.base)
    if (mises.length) {
      const doc = new Y.Doc({ gc: false })
      try {
        Y.applyUpdate(doc, Y.mergeUpdates(mises))
        contenu = lireContenu(doc)
      } finally { doc.destroy() }
    }
  } catch { contenu = null }
  gardes.set(f.id, { modifie: f.modifie, contenu })
  return contenu
}
