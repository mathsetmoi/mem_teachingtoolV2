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
}

export const COMPTES: Compte[] = [
  // Le compte mathsetmoi : son relais « MEM - Relais replay » reste à déployer
  { cle: 'mem', nom: 'Drive personnel', dossier: 'MEM - Replay séances', relais: '' },
  // Le compte du lycée, déployé le 7 octobre 2026 (à mettre à jour en version 3)
  { cle: 'lfb', nom: 'Drive du lycée', dossier: 'LFB - Replay séances', relais: 'https://script.google.com/macros/s/AKfycbwaP0-0Zlqn_IMLhUfc1LexNza9WITwyrtlgEHgHcS2p3lqPQaW14eh8PjoVYY3YfGwdQ/exec' },
]

/** L'extension des fichiers séance (le relais ne sert qu'elle) */
export const EXTENSION = '.mem'

/** L'identifiant client Google de Tableau MEM (pas un secret), créé dans SON
 *  projet Google Cloud : c'est le nom de ce projet que Google affiche quand le
 *  professeur se connecte. Origines JavaScript autorisées de ce client :
 *  https://mathsetmoi.github.io (et http://localhost:5173 pour essayer depuis
 *  son ordinateur). Vide : la publication attend cet identifiant, seul
 *  l'enregistrement du fichier séance est possible. Voir le README. */
export const CLIENT_GOOGLE = ''

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
