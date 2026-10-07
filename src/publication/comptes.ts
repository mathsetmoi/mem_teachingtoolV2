// =============================================================
// LES COMPTES GOOGLE ET LEURS RELAIS
// Les séances publiées vivent dans le Drive du professeur, dans le dossier
// « Au Tableau — séances publiées », privé. Un petit script Apps Script
// déployé dans chaque compte (relais/relais-seances.gs, le même qu'en V1)
// les lit sous l'identité du professeur et les sert à l'élève : aucune clé,
// aucun partage. Un relais par compte ; le lien de la séance dit lequel
// (« ?r=mem&id=… »), et c'est ICI que le lecteur apprend son adresse.
//
// Ces adresses ne sont pas des secrets : un relais ne sert que les séances
// du dossier publié, une par une, et ne les liste jamais.
// =============================================================

export interface Compte {
  /** Le nom court qui figure dans les liens : ne jamais le changer */
  cle: string
  /** Comment le professeur le reconnaît */
  nom: string
  /** L'adresse « …/exec » du relais déployé dans ce compte (vide : pas encore déployé) */
  relais: string
}

export const COMPTES: Compte[] = [
  // Le compte personnel, déployé et vérifié le 6 octobre 2026 (repris de la V1)
  { cle: 'mem', nom: 'Drive personnel', relais: 'https://script.google.com/macros/s/AKfycbyjIhYog-9tM4G0VF0AhHHR3iQGvz-5lBjnYeLVGF8HwkmgEYib4-UCkgTjY3OiO6I1Zg/exec' },
  // Le compte du lycée : coller ici l'adresse de son relais une fois déployé
  { cle: 'lfb', nom: 'Drive du lycée', relais: '' },
]

/** L'identifiant client Google de la V1 (pas un secret). Le garder le même :
 *  avec le droit « drive.file », un client ne voit que les fichiers qu'il a
 *  créés — c'est ce qui permet de retrouver le dossier des séances de la V1.
 *  Ses origines autorisées, dans la console Google Cloud : mathsetmoi.github.io
 *  (et http://localhost:5173 pour essayer depuis son ordinateur). */
export const CLIENT_GOOGLE = '104179953661-2h0q8ada8m22j3d8uhe4ra3rbgfdp83p.apps.googleusercontent.com'

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
