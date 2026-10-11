// =============================================================
// ENREGISTRER UN CLASSEUR DEPUIS SA BASE (sans l'ouvrir)
// « Enregistrer d'abord », dans la question « Supprimer définitivement… » de
// la corbeille de la bibliothèque (lot 4 C8) ; l'enregistrement de toute la
// bibliothèque (C9) s'en sert aussi. Comme « Enregistrer le classeur » (voir
// sauvegarde.ts) : le choix du fichier s'ouvre dans le clic (Chrome, Edge ;
// ailleurs, ou s'il ne s'ouvre pas, le fichier se télécharge), le fichier
// se fabrique depuis la base du classeur par l'écrivain, hors du fil
// principal, sous le nom du classeur et la date (« Symétrie 2026-10-10
// 14h05.memc »), puis la date du dernier enregistrement de ce classeur est
// notée (l'état de la sauvegarde, et la question de la corbeille, la
// relisent). Le classeur ouvert dans l'onglet passe, lui, par la sauvegarde
// de l'onglet (ce qui attend encore s'y écrit d'abord). Une base trouée
// (des changements y attendent une mise à jour qui manque) : le fichier a
// ce qui s'en relit, et le message le dit ; sa base seule garde le classeur,
// ce qui s'en relit vaut mieux que rien (et le fichier se rouvrira).
// =============================================================
import type { FicheClasseur } from './demarrage'
import { nomClasseur, tailleLisible } from '../fichier'
import { ecrire } from '../reglages'
import { ENREGISTRE_SANS_LA_PARTIE, cleDernierEnregistrement, raison, telecharger } from '../sauvegarde'
import { ErreurEcrivain, fabriquerFichier } from './ecrivain'
import { ID_CHOIX, TYPES_CLASSEUR } from './cle'

interface FichierChoisi { name: string; createWritable(): Promise<{ write(b: Blob): Promise<void>; close(): Promise<void>; abort?(): Promise<void> }> }

/** Vrai si le fichier est écrit (ou son téléchargement lancé). dire : les
 *  messages (« Classeur enregistré : … ») */
export async function enregistrerDepuisLaBase(f: FicheClasseur, dire: (texte: string) => void): Promise<boolean> {
  const nom = nomClasseur(f.nom)
  let choisi: FichierChoisi | null = null
  const choisir = (window as unknown as { showSaveFilePicker?: (o: unknown) => Promise<FichierChoisi> }).showSaveFilePicker
  if (typeof choisir === 'function') {
    try { choisi = await choisir.call(window, { suggestedName: nom, id: ID_CHOIX, types: TYPES_CLASSEUR }) } catch (e) {
      if ((e as { name?: string } | null)?.name === 'AbortError') return false
      choisi = null
    }
  }
  dire(`Enregistrement de « ${f.nom} »…`)
  try {
    const date = Date.now()
    const { fichier, incomplet } = await fabriquerFichier(f.base, { nom: f.nom, id: f.id }, date, { lisible: true })
    if (choisi) {
      const w = await choisi.createWritable()
      try { await w.write(fichier); await w.close() } catch (e) { await w.abort?.().catch(() => {}); throw e }
    } else telecharger(fichier, nom)
    ecrire(cleDernierEnregistrement(f), String(date))
    dire(`${incomplet ? ENREGISTRE_SANS_LA_PARTIE : 'Classeur enregistré'} : ${choisi?.name || nom} (${tailleLisible(fichier.size)}).`)
    return true
  } catch (e) {
    const r = e instanceof ErreurEcrivain ? e.raison : null
    dire(`« ${f.nom} » n'a pas pu être enregistré : ${r === 'absente' ? 'sa base n\'est plus dans ce navigateur' : r === 'abimee' ? 'il semble abîmé dans ce navigateur' : raison(e)}.`)
    return false
  }
}
