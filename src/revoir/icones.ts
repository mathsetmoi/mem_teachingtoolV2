// =============================================================
// LES ICÔNES DES DEUX LECTEURS
// Le lecteur des élèves et la revue en classe parlent la même langue :
// mêmes flèches pour un pas, mêmes doubles flèches pour une partie,
// même triangle pour lire. Dessinées pour ce projet, sur une grille de
// 24 × 24, en traits arrondis (la feuille de style donne l'épaisseur ;
// le triangle de lecture, lui, se remplit).
// =============================================================

export const ICONES = {
  lire: 'M9 6.5v11l8.5-5.5z',
  pause: 'M9 6.5v11M15 6.5v11',
  pasAvant: 'M14.5 6.5L9 12l5.5 5.5',
  pasApres: 'M9.5 6.5L15 12l-5.5 5.5',
  partieAvant: 'M18 6.5L12.5 12l5.5 5.5M11.5 6.5L6 12l5.5 5.5',
  partieApres: 'M6 6.5l5.5 5.5L6 17.5M12.5 6.5L18 12l-5.5 5.5',
  liste: 'M9 7h10M9 12h10M9 17h10M5 7h.01M5 12h.01M5 17h.01',
  cadrer: 'M5 10V5h5M14 5h5v5M19 14v5h-5M10 19H5v-5',
  fermer: 'M7 7l10 10M17 7L7 17',
  revenir: 'M9.5 7.5L5 12l4.5 4.5M5 12h10a4 4 0 0 0 0-8h-2',
} as const

export type NomIcone = keyof typeof ICONES

/** Le dessin d'une icône, prêt à poser dans un bouton (la légende est sur le bouton) */
export function svg(nom: NomIcone): string {
  return `<svg viewBox="0 0 24 24" aria-hidden="true"><path d="${ICONES[nom]}"/></svg>`
}
