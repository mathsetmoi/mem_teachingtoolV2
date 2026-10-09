// =============================================================
// LES ICÔNES DU TABLEAU
// Les barres, les menus et la barre d'actions dessinent leurs boutons
// avec ces chemins, sur une grille de 24 × 24, en traits de 1,8 sans
// remplissage (la feuille de style donne l'épaisseur). Rangées à part :
// l'interface (ui.ts) et la barre d'actions (barre-actions.ts), qu'elle
// construit, s'en servent toutes deux sans s'importer l'une l'autre.
// Le lecteur des élèves et la revue ont les leurs (revoir/icones.ts).
// =============================================================

export const ICONES: Record<string, string> = {
  stylo: 'M4 20l4-1L19 8l-3-3L5 16l-1 4zM14 7l3 3',
  surligneur: 'M14 4l6 6-8 8H6v-6zM4 21h9',
  gomme: 'M8 20h12M4.5 15.5l9-9 6 6-7.5 7.5H8.5z',
  segment: 'M6 18L18 6M4 18a2 2 0 104 0 2 2 0 10-4 0M16 6a2 2 0 104 0 2 2 0 10-4 0',
  formule: 'M3 13h3l3 7 4-16h8',
  selection: 'M5 3l14 8-6.5 1.8L10.5 19z',
  main: 'M12 3v18M3 12h18M12 3l-3 3M12 3l3 3M12 21l-3-3M12 21l3-3M3 12l3-3M3 12l3 3M21 12l-3-3M21 12l-3 3',
  annuler: 'M9 14L4 9l5-5M4 9h10a6 6 0 010 12h-3',
  retablir: 'M15 14l5-5-5-5M20 9H10a6 6 0 000 12h3',
  poubelle: 'M4 7h16M10 11v6M14 11v6M6 7l1 13h10l1-13M9 7V4h6v3',
  plus: 'M12 5v14M5 12h14',
  moins: 'M5 12h14',
  avant: 'M15 6l-6 6 6 6',
  apres: 'M9 6l6 6-6 6',
  // « › » sur la dernière page : il en ajoute une. Le chevron et un petit +
  // accolé, pour ne pas le confondre avec le grand + de « Nouvelle page »
  // juste à côté (deux + pareils, au vidéoprojecteur, sembleraient un doublon)
  'page-suivante-plus': 'M5 6l6 6-6 6M18 9v6M15 12h6',
  aimant: 'M6 4v8a6 6 0 0012 0V4h-4v8a2 2 0 01-4 0V4zM6 8h4M14 8h4',
  forme: 'M3 11h8v8H3zM17 13a4 4 0 100-8 4 4 0 100 8z',
  point: 'M7 7l7 7M14 7l-7 7M16 17.5h4M16.5 21l1.75-6 1.75 6',
  'trait-segment': 'M6 18L18 6M4.5 16.5l3 3M16.5 4.5l3 3',
  'trait-droite': 'M3 21L21 3',
  'trait-demi': 'M6 18L21 3M4.5 16.5l3 3',
  rectangle: 'M4 6h16v12H4z',
  cercle: 'M12 20a8 8 0 100-16 8 8 0 100 16z',
  polygone: 'M12 3l8 6-3 10H7L4 9z',
  reconnaissance: 'M4 17c2-6 5-9 9-9M14 4h6v6M20 4l-7 7M4 20h6',
  revue: 'M4.5 12a7.5 7.5 0 1 0 2.2-5.3M4.5 4.5v4.2h4.2M10.5 9.5v5l4-2.5z',
  publier: 'M12 15V3M7.5 7.5L12 3l4.5 4.5M5 13v6a2 2 0 002 2h10a2 2 0 002-2v-6',
  image: 'M4 5h16v14H4zM4 16l5-5 4 4 3-3 4 4M15.5 9.5a1.5 1.5 0 100-.01',
  instruments: 'M3 17L17 3l4 4L7 21zM7 13l2 2M10 10l2 2M13 7l2 2',
  regle: 'M2 9h20v6H2zM6 9v3M10 9v2M14 9v3M18 9v2',
  equerre: 'M4 20V4l16 16zM4 15h5v5',
  rapporteur: 'M3 17a9 9 0 0118 0zM12 17V12M12 8V9M7 11l1 1M17 11l-1 1',
  compas: 'M12 3v2M12 5l-6 15M12 5l6 15M9.5 13h5',
  construction: 'M4 5h9M4 10h7M4 15h5M15 20l2-9 2 9M17 11V8M15.6 16h2.8',
  automatismes: 'M12 21a8 8 0 100-16 8 8 0 100 16zM12 9v4l2.5 2.5M10 2h4M12 2v3',
  cadre: 'M4 9V4h5M15 4h5v5M20 15v5h-5M9 20H4v-5',
  coche: 'M5 12.5l4.5 4.5L19 7.5',
  points: 'M5 12h.01M12 12h.01M19 12h.01',
  doigt: 'M10 15V4.5a1.5 1.5 0 0 1 3 0V11M13 10a1.5 1.5 0 0 1 3 0v2M16 11.5a1.5 1.5 0 0 1 3 0V16a5 5 0 0 1-5 5h-1.5a5 5 0 0 1-4-2l-3-4a1.5 1.5 0 0 1 2.3-1.9L10 15',
  // Copier : deux feuilles décalées, comme partout (le presse-papiers à pince
  // voudrait dire « Coller ») ; Dupliquer : les mêmes, et un +
  copier: 'M8 8h11v11H8zM5 16V5h11',
  dupliquer: 'M8 8h11v11H8zM5 16V5h11M13.5 11v5M11 13.5h5',
  // Fermer (la trieuse des pages) : une croix
  fermer: 'M6 6l12 12M18 6L6 18',
}

/** Le SVG d'une icône, caché aux lecteurs d'écran (le bouton porte son nom) */
export function icone(nom: string) {
  return `<svg viewBox="0 0 24 24" aria-hidden="true"><path d="${ICONES[nom]}"/></svg>`
}
