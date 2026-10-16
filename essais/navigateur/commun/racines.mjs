// Les deux racines des essais du navigateur, calculées depuis l'emplacement de
// ce fichier (essais/navigateur/commun/racines.mjs) : aucun chemin absolu
// n'est écrit dans les essais.
// - RACINE_ESSAIS : essais/navigateur (les essais, leurs données) ;
// - RACINE_DEPOT : la racine du dépôt (src/, dist/, dist-pages/…) ;
// - SORTIES : essais/navigateur/sorties (ignoré par git) : ce que les essais
//   écrivent en passant.
import { fileURLToPath } from 'node:url'
import { dirname, resolve } from 'node:path'

export const RACINE_ESSAIS = resolve(dirname(fileURLToPath(import.meta.url)), '..')
export const RACINE_DEPOT = resolve(RACINE_ESSAIS, '../..')
export const SORTIES = resolve(RACINE_ESSAIS, 'sorties')
