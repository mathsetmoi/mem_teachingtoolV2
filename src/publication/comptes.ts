// =============================================================
// LES COMPTES GOOGLE ET LEURS RELAIS
// Les séances publiées vivent dans le Drive du professeur, dans un dossier
// privé propre à chaque compte (« MEM - Replay séances », « LFB - Replay
// séances »). Un petit script Apps Script déployé dans chaque compte
// (relais/relais-seances.gs) les lit sous l'identité du professeur et les
// sert à l'élève : aucune clé, aucun partage. Un relais par compte ; le lien
// de la séance dit lequel (« ?r=mem&id=… »), et c'est ICI que le lecteur
// apprend son adresse.
//
// Ces adresses ne sont pas des secrets : un relais ne sert que les séances
// des dossiers des replays, une par une, et ne les liste jamais.
//
// Chaque compte a aussi son dossier privé des SAUVEGARDES (« MEM -
// Sauvegardes », « LFB - Sauvegardes », lot 4 C10) : la copie à sens
// unique des classeurs (.memc), que le relais ne sert jamais (ni ce
// dossier, ni cette extension, ni ce contenu ne sont les siens).
//
// Et son dossier privé des CLASSES (« MEM - Classeurs », « LFB -
// Classeurs », lot 7) : un sous-dossier par dossier de classe relié au
// Drive, où chaque chapitre de la classe a son .memc, tenu à jour par la
// même copie ; le relais ne le sert pas davantage.
// =============================================================

export interface Compte {
  /** Le nom court qui figure dans les liens : ne jamais le changer */
  cle: string
  /** Comment le professeur le reconnaît */
  nom: string
  /** Le dossier des replays dans ce Drive. Le relais ne sert que les
   *  dossiers de sa liste DOSSIERS : les deux doivent concorder (un test y veille). */
  dossier: string
  /** L'adresse « …/exec » du relais déployé dans ce compte (vide : pas encore déployé) */
  relais: string
  /** Le dossier des sauvegardes des classeurs dans ce Drive (lot 4 C10).
   *  Jamais dans la liste DOSSIERS du relais : un test y veille. */
  sauvegardes: string
  /** Le dossier des classes reliées au Drive (lot 7) : un sous-dossier par
   *  classe. Jamais dans la liste DOSSIERS du relais : un test y veille. */
  classeurs: string
}

export const COMPTES: Compte[] = [
  // Les relais « MEM - Relais replay » (version 3), déployés le 7 octobre 2026
  { cle: 'mem', nom: 'Drive personnel', dossier: 'MEM - Replay séances', relais: 'https://script.google.com/macros/s/AKfycbyEm-IdKOVzUPeZYlypnxXXUQZB_Ber8ttWyU2EIlgzVgZ1MFKvvtWRvXPlFAQ9F2fw/exec', sauvegardes: 'MEM - Sauvegardes', classeurs: 'MEM - Classeurs' },
  { cle: 'lfb', nom: 'Drive du lycée', dossier: 'LFB - Replay séances', relais: 'https://script.google.com/macros/s/AKfycbwtm8ylsrv-R9RJDdwnIf9CMlSP-B0WdAaV9SHtfHhhD7i5YcHnnViGUMHGlKRTPEKN4w/exec', sauvegardes: 'LFB - Sauvegardes', classeurs: 'LFB - Classeurs' },
]

/** L'extension des fichiers séance (le relais ne sert qu'elle) */
export const EXTENSION = '.mem'
/** L'extension des sauvegardes (celle d'un classeur enregistré, que le relais ne sert pas) */
export const EXTENSION_SAUVEGARDE = '.memc'

/** L'identifiant client Google de MEM teachingtool (pas un secret), créé dans le
 *  projet Google Cloud de l'organisation mathsetmoi : c'est le nom de son
 *  application que Google affiche quand le professeur se connecte. Origines
 *  JavaScript autorisées de ce client : https://mathsetmoi.github.io (et
 *  http://localhost:5173 pour essayer depuis son ordinateur). Vide : la
 *  publication serait désactivée, seul l'enregistrement du fichier séance
 *  resterait possible. Voir le README. */
export const CLIENT_GOOGLE = '41829434463-j9dekdpg6c9va9pd00fanof7h3lphkjm.apps.googleusercontent.com'

/** Le numéro du projet Google Cloud (le début de l'identifiant client) : le
 *  sélecteur de fichiers de Google (lot 7) le demande, pour que MEM
 *  teachingtool puisse lire les fichiers qu'on y choisit avec le seul droit
 *  drive.file */
export const PROJET_GOOGLE = CLIENT_GOOGLE.split('-')[0]
/** La clé d'API du sélecteur de fichiers de Google (pas un secret, limitée au
 *  site dans la console). Vide : le sélecteur s'ouvre sans elle. */
export const CLE_API_GOOGLE = ''

export const compteDe = (cle: string) => COMPTES.find(c => c.cle === cle) ?? null

const CHEMIN_EXEC = /^\/(?:a\/macros\/[^/]+|macros)\/s\/[^/]+\/exec$/

/** L'adresse d'un relais est-elle bien celle d'un déploiement Apps Script ? */
export function relaisValable(adresse: string) {
  try {
    const u = new URL(adresse)
    return u.protocol === 'https:' && u.hostname === 'script.google.com' && CHEMIN_EXEC.test(u.pathname)
  } catch { return false }
}

/** Le lien que l'élève ouvre : la page du lecteur, le relais et le fichier */
export function lienEleve(lecteur: string, cle: string, id: string, chapitre?: number) {
  const u = new URL(lecteur)
  u.search = ''; u.hash = ''
  u.searchParams.set('r', cle)
  u.searchParams.set('id', id)
  if (chapitre && chapitre > 1) u.searchParams.set('c', String(chapitre))
  return u.toString()
}
