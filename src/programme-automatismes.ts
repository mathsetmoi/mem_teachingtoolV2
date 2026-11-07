// =============================================================
// LE RANGEMENT DES AUTOMATISMES DU COLLÈGE (programme 2026 du cycle 4)
// Thème › Domaine › Compétences, comme dans le programme : les cinq
// thèmes du collège, puis les domaines du niveau (les titres du
// programme), puis la liste « Automatismes » de chaque domaine. Les
// objectifs d'apprentissage n'y sont pas : le flash ne pose que des
// automatismes.
//
// La clé d'un domaine est le nom du « thème » de ses exercices dans
// automatismes.ts (le champ theme) : elle ne change pas, pour que les
// réglages déjà gardés (« 5e/Opérations ») restent bons. Le nom affiché
// peut être plus long (« Repérage sur une droite et dans le plan »).
// Un exercice dit quelle compétence il travaille par son champ
// competence : le rang de la phrase dans la liste de son domaine.
// =============================================================

export interface DomaineProgramme {
  /** Le nom du thème des exercices (automatismes.ts) */
  cle: string
  /** Le nom du domaine dans le programme, s'il est plus long que la clé */
  nom?: string
  /** La liste « Automatismes » du domaine ($…$ pour les maths) */
  competences: string[]
  /** Un domaine du professeur, hors programme officiel : il porte
   *  l'étiquette PERSO dans la fenêtre, comme ses compétences */
  perso?: boolean
}
export interface ThemeProgramme {
  nom: string
  /** Vide : le programme n'a aucun automatisme dans ce thème */
  domaines: DomaineProgramme[]
}

export const THEMES_COLLEGE = {
  nombres: 'Nombres et calculs',
  geometrie: 'Espace et géométrie',
  donnees: 'Organisation et gestion de données, probabilités',
  proportionnalite: 'Proportionnalité, fonctions',
  informatique: 'La pensée informatique',
} as const

const REPERAGE = 'Repérage sur une droite et dans le plan'
/** Lire et placer dans un repère : la même liste en 4e et en 3e */
const REPERAGE_RELATIFS = [
  'Placer sur une droite graduée un point dont l’abscisse est un nombre relatif.',
  'Repérer un nombre relatif sur une droite graduée.',
  'Dans le plan muni d’un repère orthogonal, lire les coordonnées d’un point donné.',
  'Dans le plan muni d’un repère orthogonal, placer un point de coordonnées données.',
]
const T = THEMES_COLLEGE
/** La pensée informatique : aucun automatisme au programme, à aucun niveau */
const INFORMATIQUE: ThemeProgramme = { nom: T.informatique, domaines: [] }

export const PROGRAMME_AUTOMATISMES: Record<string, ThemeProgramme[]> = {
  '5e': [
    { nom: T.nombres, domaines: [
      { cle: 'Opérations', competences: [
        'Mobiliser les critères de divisibilité par 2, 5 et 10 vus en CM1 et CM2.',
        'Déterminer le quotient et le reste dans une division euclidienne, par exemple, savoir que $17 = 3 \\times 5 + 2$.',
        'Utiliser les tables de multiplication pour factoriser des nombres entiers décomposables en produit de deux nombres différents de 1, par exemple, $21 = 3 \\times 7$.',
        'Savoir calculer des produits en lien avec les tables : $0{,}6 \\times 7$ ; $40 \\times 0{,}03$.',
        'Multiplier et diviser par 10, 100, 1 000.',
        'Additionner et soustraire des décimaux, par exemple, $2{,}7 + 1{,}4$ ; $3{,}4 - 0{,}8$.',
      ] },
      { cle: 'Nombres relatifs', competences: [
        'Additionner, soustraire, multiplier des nombres décimaux à une ou deux décimales.',
        'Savoir que pour compléter une addition à trou, on utilise une soustraction : $2 + \\ldots = 7$ se complète en calculant $7 - 2$.',
      ] },
      { cle: 'Nombres rationnels', competences: [
        'Entretenir la connaissance et l’utilisation des tables de multiplication.',
        'Entretenir l’écriture décimale des fractions simples comme $\\frac{1}{2}$ ; $\\frac{1}{4}$ ; $\\frac{3}{4}$ ; $\\frac{3}{2}$ ; $\\frac{4}{2}$ ; $\\frac{5}{2}$ ; $\\frac{1}{10}$ ; $\\frac{100}{100}$ ; $\\frac{7}{1}$.',
        'Faire vivre la notion de nombre quotient en complétant des multiplications à trou : $3 \\times \\ldots = 7$ puis $3 \\times \\frac{7}{3} = \\ldots$',
        'Lire l’abscisse d’un point sur une droite graduée en tiers, en quarts, en moitiés, en dixièmes.',
        'Reconnaitre des fractions égales : $\\frac{2}{3} = \\frac{\\ldots}{15}$ ; $\\frac{4}{7} = \\frac{\\ldots}{14}$.',
        'Comparer deux fractions : $\\frac{2}{7}$ et $\\frac{5}{7}$ ; $\\frac{8}{12}$ et $\\frac{8}{21}$ ; $\\frac{3}{4}$ et $\\frac{7}{18}$ ; $\\frac{8}{3}$ et $\\frac{6}{7}$.',
        'Écrire une fraction sous la forme d’une somme d’un nombre entier et d’une fraction inférieure à 1 : $\\frac{17}{5} = 3 + \\frac{2}{5}$.',
        'Addition et soustraction de fractions simples : $\\frac{3}{5} + \\frac{4}{5}$ ; $1 - \\frac{2}{3}$ ; $\\frac{4}{7} - \\frac{2}{21}$ ; $3 + \\frac{2}{5}$ ; $\\frac{2}{5} + \\frac{1}{4}$.',
        'Prendre une fraction simple d’un nombre : le $\\frac{1}{3}$ de 18 ; le $\\frac{1}{4}$ de 12.',
        'Prendre 1 %, 10 % ou 50 % d’un nombre, en lien avec la proportionnalité.',
        'Écrire un même nombre sous de multiples formes, par exemple dire que $1{,}2 = \\frac{12}{10} = \\frac{6}{5} = 1 + \\frac{1}{5} = 120\\,\\% = \\frac{120}{100}$.',
      ] },
      { cle: 'Puissances', competences: [
        'Entretenir les tables de multiplications.',
        'Connaitre les unités d’aires et de volume.',
      ] },
      { cle: 'Calcul littéral et algébrique', competences: [
        'Identifier des régularités et poursuivre une suite de motifs évolutive.',
        'Trouver le nombre d’éléments pour une étape donnée dans une suite de motifs évolutive.',
        'Identifier la structure d’un motif évolutif en repérant une régularité.',
        'Nombre quotient.',
      ] },
    ] },
    { nom: T.geometrie, domaines: [
      { cle: 'Repérage', nom: REPERAGE, competences: [
        'Placer sur une demi-droite graduée un point dont l’abscisse est un nombre décimal.',
        'Repérer un nombre décimal sur une demi-droite graduée.',
      ] },
      { cle: 'Représentation de l’espace', competences: [
        'Reconnaitre des vues (de dessus, dessous…) d’empilements de cubes.',
        'Dénombrer des cubes dans des empilements.',
        'Reconnaitre un cube, un pavé représenté en perspective cavalière.',
        'Reconnaitre un patron d’un cube.',
      ] },
      { cle: 'Transformations', competences: [
        'Reconnaitre et construire le symétrique d’une figure par symétrie axiale, dont l’axe est vertical, horizontal, ou en diagonale sur quadrillage.',
        'Construire le symétrique, par rapport à un axe, d’un point, d’une figure, sur feuille blanche.',
      ] },
      { cle: 'Angles', competences: [
        'Reconnaitre et citer sur une configuration géométrique des angles : angle plein, plat, nul, droit ; angles opposés par le sommet, adjacents, supplémentaires, aigus, obtus.',
        'Savoir qu’un angle droit mesure 90°, qu’un angle plat mesure 180°.',
        'Reconnaitre une bissectrice.',
        'Connaitre les mesures des angles de l’équerre dont dispose l’élève (30° 60° 90° ou 45° 45° 90°).',
      ] },
      { cle: 'Triangles', competences: [
        'Reconnaitre un triangle isocèle, équilatéral ou rectangle à partir d’un schéma codé.',
        'Connaitre la somme des angles d’un triangle, calculer le 3e angle d’un triangle connaissant les mesures des deux autres.',
        'Connaitre la notion de médiatrice, de cercle circonscrit.',
      ] },
      { cle: 'Parallélogrammes', competences: [
        'Reconnaitre en justifiant un quadrilatère, un parallélogramme, un rectangle, un losange, un carré, un trapèze, un pentagone, un hexagone dans des figures complexes.',
        'Exploiter le codage d’une figure pour identifier des parallélogrammes particuliers.',
      ] },
    ] },
    { nom: T.donnees, domaines: [
      { cle: 'Probabilités', competences: [
        'Positionner sur une échelle de probabilité des évènements : impossible ; certain ; obtenir pile avec une pièce équilibrée ; une valeur donnée avec un dé équilibré ; une couleur de boule dans une urne ; ne pas obtenir la bonne combinaison au loto ; 10 fois de suite la valeur 1 avec un dé à six faces.',
        'Donner la probabilité sous diverses formes (fraction, décimale, pourcentage) pour les cinq premiers évènements ci-dessus.',
        'Lier l’expression « une chance sur quatre » (par exemple) et la probabilité $\\frac{1}{4}$.',
      ] },
    ] },
    { nom: T.proportionnalite, domaines: [
      { cle: 'Proportionnalité', competences: [
        'Reconnaitre si une situation donnée entre dans le cadre de la proportionnalité ou non.',
        'Dans des situations simples, mobiliser une procédure adaptée (linéarité pour la multiplication ou l’addition, retour à l’unité) : une recette pour 4 personnes passée à 2, 8 ou 6 ; le prix de 3 kg ou de 4,3 kg de tomates ; le pourcentage de voix de chaque candidat.',
      ] },
    ] },
    INFORMATIQUE,
  ],
  '4e': [
    { nom: T.nombres, domaines: [
      { cle: 'Opérations sur les nombres relatifs', competences: [
        'Manipulation de sommes et différences de nombres relatifs.',
        'Opposé d’un nombre, somme des opposés.',
        'Entretien des tables de multiplication.',
        'Multiplier et diviser par 10, 100, 1 000.',
        'Compléter des multiplications à trou : $5 \\times \\ldots = 3$ ; faire le lien entre multiplication et division.',
        'Multiplication comme addition itérée : $3 + 3 + 3 + 3 = 4 \\times 3$.',
      ] },
      { cle: 'Nombres rationnels', competences: [
        'Addition et soustraction de fractions de dénominateurs quelconques mais simples.',
        'Comparaison de fractions.',
        'Savoir qu’une fraction est aussi le quotient : $\\frac{3}{7}$ est le nombre qui, multiplié par 7, donne 3, donc $7 \\times \\frac{3}{7} = 3$.',
        'Savoir que prendre la fraction d’un nombre revient à multiplier la fraction par ce nombre.',
      ] },
      { cle: 'Puissances', competences: [
        'Connaitre et reconnaitre les carrés parfaits des entiers de 0 à 12.',
        'Multiplier et diviser par 10, 100, 1 000 ; savoir compléter $1\\,200 = 1{,}2 \\times \\ldots$',
        'Puissances simples : $2^2 = 4$ ; $2^3 = 8$ ; $3^3 = 27$.',
        '$10^2 = 100$ ; $10^3 = 1\\,000$.',
      ] },
      { cle: 'Racine carrée', competences: [
        'Donner les carrés des nombres entiers compris entre 0 et 12.',
      ] },
      { cle: 'Calcul littéral et algébrique', competences: [
        'Donner la valeur d’expressions numériques simples.',
        'Résoudre des équations du type $ax = c$ et $x + b = c$, où $a$, $b$ et $c$ sont des nombres.',
        'Écrire $3 \\times x$ sous la forme $3x$ et savoir que $3x$ c’est $3 \\times x$.',
        'Connaitre et utiliser : $1 \\times x = x$ ; $x + x = 2x$ ; $x \\times x = x^2$ ; $3x + 2x = 5x$ ; $3x \\times 2x = 6x^2$.',
        'Donner le double, le triple, la moitié, le prédécesseur, le successeur, le carré d’un nombre.',
        'Tester si un nombre vérifie une égalité.',
      ] },
    ] },
    { nom: T.geometrie, domaines: [
      { cle: 'Transformations', competences: [
        'Construire le symétrique d’un point par demi-tour.',
      ] },
      { cle: 'Repérage', nom: REPERAGE, competences: REPERAGE_RELATIFS },
      { cle: 'Représentation de l’espace', competences: [
        'Reconnaitre les solides : cube, pavé, cylindre, prisme droit.',
        'Connaitre et utiliser les formules du volume d’un cube, d’un pavé, d’un prisme, d’un cylindre.',
        'Reconnaitre la base d’un prisme donné en perspective cavalière.',
        'Savoir calculer l’aire des figures planes usuelles : triangle, rectangle, disque.',
      ] },
      { cle: 'Parallélogrammes et translations', competences: [
        'Dire si des figures planes sont images l’une de l’autre par une symétrie axiale (dont on identifie l’axe) ou par un demi-tour (dont on identifie le centre).',
        'Dans une configuration donnée, déterminer les images de figures, de droites, de segments, de points par une symétrie axiale ou un demi-tour.',
        'Reconnaitre un parallélogramme à l’aide de sa définition ou d’une propriété caractéristique grâce aux codages.',
        'Reconnaitre un parallélogramme particulier à partir de ses propriétés caractéristiques, notamment à partir des propriétés de ses diagonales.',
      ] },
      { cle: 'Triangles', competences: [
        'Reconnaitre des droites remarquables, y compris dans les triangles particuliers (médiatrices, médianes, hauteurs, bissectrices).',
      ] },
      // Un domaine du professeur, hors programme officiel (étiquette PERSO)
      { cle: 'Pythagore', perso: true, competences: ['Connaître le cours'] },
    ] },
    { nom: T.donnees, domaines: [
      { cle: 'Statistiques', competences: [
        'Calculer une moyenne pour un très petit nombre de valeurs.',
        'Calculer un effectif manquant dans un tableau pour un petit nombre de valeurs.',
        'Calculer une fréquence simple.',
      ] },
    ] },
    { nom: T.proportionnalite, domaines: [
      { cle: 'Proportionnalité', competences: [
        'Déterminer $a$ % de $c$ quand $a$ vaut 100, 50, 25, 10, 1.',
        'Compléter : 20 % de 120 = … ; $30 = \\frac{\\ldots}{100} \\times 1\\,000$.',
      ] },
    ] },
    INFORMATIQUE,
  ],
  '3e': [
    { nom: T.nombres, domaines: [
      { cle: 'Nombres rationnels', competences: [
        'Additionner, soustraire, multiplier et diviser des fractions.',
      ] },
      { cle: 'Puissances', competences: [
        'Puissance comme multiplication itérée : $3 \\times 3 \\times 3 \\times 3 = 3^4$.',
        'Multiplication de puissances d’exposant positif d’un nombre.',
        'Multiplication de puissances de même exposant positif de deux nombres.',
      ] },
      { cle: 'Racine carrée', competences: [
        'Donner les carrés des nombres entiers compris entre 0 et 12.',
      ] },
      { cle: 'Multiples et diviseurs', competences: [
        'Factoriser un nombre entier positif : $60 = 2^2 \\times 3 \\times 5$.',
        'Simplifier une fraction dont le numérateur et le dénominateur sont dans une même table de multiplication, par exemple $\\frac{15}{35}$ et $\\frac{63}{14}$.',
        'Trouver un dénominateur commun à deux fractions pour les additionner, les soustraire ou les comparer.',
        'Appliquer les critères de divisibilité par 2, 3, 5, 9.',
      ] },
      { cle: 'Calcul littéral et algébrique', competences: [
        'Résoudre des équations du type $ax = c$, $x + b = c$, $ax + b = c$.',
        'Simplifier des expressions littérales.',
        'Calculer la valeur d’une expression algébrique avec des puissances ou non.',
        'Donner la nature d’une expression littérale : $3x + 2$ est une somme, $5(x + 4)$ est un produit.',
        'Développer et factoriser une expression simple.',
        'Donner l’expression générique d’un nombre pair, d’un nombre impair.',
        'Prendre l’opposé d’une expression : savoir que $-(5 - 4x) = -5 + 4x$.',
      ] },
    ] },
    { nom: T.geometrie, domaines: [
      { cle: 'Repérage', nom: REPERAGE, competences: REPERAGE_RELATIFS },
      { cle: 'Représentation de l’espace', competences: [
        'Reconnaitre des solides (pavé droit, cube, prisme droit, cylindre, pyramide, cône).',
        'Connaitre et utiliser les formules du volume d’une pyramide ou d’un cône.',
        'Donner la nature d’une face d’une pyramide représentée en perspective cavalière.',
        'Identifier les patrons de pyramides données (par exemple inscrites dans un cube).',
      ] },
      { cle: 'Triangles', competences: [
        'Utiliser la propriété du triangle rectangle et de son cercle circonscrit.',
        'Écrire l’égalité de Pythagore dans un triangle rectangle.',
        'Utiliser la droite des milieux pour prouver que des droites sont parallèles, pour calculer une longueur, pour prouver qu’un point est le milieu d’un côté.',
      ] },
      { cle: 'Translations et vecteurs', competences: [
        'Mobiliser les connaissances sur la symétrie axiale, le demi-tour, la translation.',
      ] },
    ] },
    { nom: T.donnees, domaines: [
      { cle: 'Statistiques', competences: [
        'Calculer une moyenne.',
        'Donner une médiane pour une série comportant un petit nombre de valeurs.',
        'Calculer l’étendue d’une série.',
      ] },
    ] },
    { nom: T.proportionnalite, domaines: [
      { cle: 'Proportionnalité', competences: [
        'Partager une somme en deux parts selon un certain ratio.',
        'Partager une masse en trois parts selon un certain ratio.',
        'Partager une somme entre deux personnes âgées de 20 et 30 ans proportionnellement à leur âge.',
        'Calculer le pourcentage d’une quantité.',
        'Calculer la distance réelle entre deux villes, connaissant la distance sur une carte routière dont l’échelle est connue.',
        'Appliquer, dans des cas simples, une augmentation ou une diminution exprimée en pourcentages, en utilisant ou non le coefficient multiplicateur.',
      ] },
    ] },
    INFORMATIQUE,
  ],
}
