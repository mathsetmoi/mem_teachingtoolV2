// =============================================================
// LE PROGRAMME DU CYCLE 4 (5e, 4e, 3e), programme 2026
// Tout le programme, tel qu'il est écrit, rangé comme lui :
// thème › domaine › compétences. Les compétences d'un domaine sont ses
// automatismes (ceux du flash) et ses objectifs d'apprentissage ; les
// prolongements possibles (mises en perspective historiques et
// culturelles) suivent.
//
// Les maths sont entre $…$ (en LaTeX), comme dans les démonstrations du
// catalogue. Sous un objectif, « exemples » nomme les exercices
// d'application directe (src/automatismes.ts, par leur id) qui le
// travaillent : le bouton « Exemple » du catalogue en tire un.
//
// Le panneau qui le montre est dans catalogue-college.ts.
// =============================================================

export type NiveauCollege = '5e' | '4e' | '3e'
export const NIVEAUX_COLLEGE: readonly NiveauCollege[] = ['5e', '4e', '3e']

export interface Objectif {
  texte: string
  /** Les exercices d'application directe qui le travaillent (des id d'automatismes.ts) */
  exemples?: string[]
}
export interface Domaine {
  nom: string
  automatismes: string[]
  objectifs: Objectif[]
  prolongements?: string[]
}
export interface ThemeProgramme { nom: string; domaines: Domaine[] }

export const PROGRAMME_CYCLE4: Record<NiveauCollege, ThemeProgramme[]> = {
  '5e': [
    { nom: 'Nombres et calculs', domaines: [
      { nom: 'Opérations',
        automatismes: [
          'Mobiliser les critères de divisibilité par 2, 5 et 10 vus en CM1 et CM2.',
          'Déterminer le quotient et le reste dans une division euclidienne, par exemple, savoir que 17 = 3 × 5 + 2.',
          'Utiliser les tables de multiplication pour factoriser des nombres entiers décomposables en produit de deux nombres différents de 1, par exemple, 21 = 3 × 7.',
          'Savoir calculer des produits en lien avec les tables : 0,6 × 7 ; 40 × 0,03.',
          'Multiplier et diviser par 10, 100, 1 000.',
          'Additionner et soustraire des décimaux, par exemple, 2,7 + 1,4 ; 3,4 – 0,8.',
        ],
        objectifs: [
          { texte: 'Additionner, soustraire, multiplier et diviser pour résoudre des problèmes et contrôler la vraisemblance de son résultat.' },
          { texte: 'Connaitre le sens et les situations d’emploi de ces opérations.' },
          { texte: 'Diviser par un nombre décimal.', exemples: ['diviser-decimal'] },
          { texte: 'Enchainer des opérations.' },
          { texte: 'Traduire un problème, une succession donnée d’opérations, un programme de calcul, en une seule expression, en faisant appel ou non à des parenthèses.', exemples: ['programme-calcul'] },
          { texte: 'Nommer un calcul, distinguer sommes et produits, termes et facteurs.' },
          { texte: 'Connaitre et utiliser les priorités opératoires.', exemples: ['priorites'] },
          { texte: 'Connaitre et utiliser la distributivité simple sur des exemples numériques.', exemples: ['distributivite-numerique'] },
          { texte: 'Utiliser les notions de multiples et diviseurs.', exemples: ['multiples-diviseurs'] },
          { texte: 'Connaitre les critères de divisibilité par 3 et par 9.' },
          { texte: 'Mobiliser un algorithme dans le cadre du calcul numérique.' },
        ],
        prolongements: [
          'Notion de nombre premier et développements sur ce thème (existence d’un nombre infini de nombres premiers, crible d’Ératosthène, etc.).',
        ],
      },
      { nom: 'Nombres relatifs',
        automatismes: [
          'Additionner, soustraire, multiplier des nombres décimaux à une ou deux décimales.',
          'Savoir que pour compléter une addition à trou, on utilise une soustraction : 2 + ... = 7 se complète en calculant 7 – 2.',
        ],
        objectifs: [
          { texte: 'Définir les nombres relatifs.' },
          { texte: 'Définir l’opposé et la valeur absolue d’un nombre.' },
          { texte: 'Définir la notion de nombre positif, strictement positif, négatif, strictement négatif.' },
          { texte: 'Utiliser les nombres relatifs pour représenter des grandeurs observables qui peuvent prendre des valeurs inférieures à zéro (température, temps, altitude, etc.), en particulier dans le cadre de la résolution de problèmes.', exemples: ['relatifs-probleme'] },
          { texte: 'Lire l’abscisse d’un nombre relatif sur une droite graduée et placer un nombre relatif d’abscisse donnée.', exemples: ['relatifs-abscisse'] },
          { texte: 'Comparer et ranger dans l’ordre croissant et décroissant des nombres décimaux relatifs.', exemples: ['relatifs-comparer'] },
          { texte: 'Additionner deux nombres décimaux relatifs.', exemples: ['relatifs-addsub'] },
          { texte: 'Additionner plusieurs nombres décimaux relatifs.' },
          { texte: 'Soustraire deux nombres décimaux relatifs.', exemples: ['relatifs-addsub'] },
          { texte: 'Connaitre et justifier les situations dans lesquelles des parenthèses sont indispensables au sens des écritures.' },
          { texte: 'Simplifier l’écriture de sommes comportant des parenthèses.', exemples: ['relatifs-enchainer'] },
          { texte: 'Enchainer additions et soustractions de décimaux relatifs.', exemples: ['relatifs-enchainer'] },
          { texte: 'Résoudre des problèmes mobilisant addition et soustraction de nombres décimaux relatifs.', exemples: ['relatifs-probleme'] },
        ],
        prolongements: [
          'Premières apparitions des nombres négatifs avec Brahmagupta (600), dont l’existence était toujours niée au XVIIe siècle.',
        ],
      },
      { nom: 'Nombres rationnels',
        automatismes: [
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
          'Écrire un même nombre sous de multiples formes, par exemple dire que $1{,}2 = \\frac{12}{10} = \\frac{6}{5} = 1 + \\frac{1}{5} = 120\\,\\% = \\frac{120}{100}$ etc.',
        ],
        objectifs: [
          { texte: 'Comparer des fractions.' },
          { texte: 'Additionner et soustraire des fractions de dénominateurs quelconques.', exemples: ['fractions-quelconques'] },
          { texte: 'Résoudre des problèmes avec des additions et soustractions de fractions.', exemples: ['fractions-probleme'] },
        ],
      },
      { nom: 'Puissances',
        automatismes: [
          'Entretenir les tables de multiplications.',
          'Connaitre les unités d’aires et de volume.',
        ],
        objectifs: [
          { texte: 'Découvrir la notion de puissance d’un nombre et sa notation dans le cas du carré et du cube.', exemples: ['cubes'] },
          { texte: 'Connaitre les carrés des entiers de 0 à 12.', exemples: ['carres'] },
          { texte: 'Connaitre le cube de 10.', exemples: ['cubes'] },
          { texte: 'Savoir écrire un nombre sous la forme d’une puissance 2 ou 3.', exemples: ['ecrire-puissance'] },
          { texte: 'Calculer la valeur numérique d’expressions contenant des puissances simples, additions, soustractions et produits.', exemples: ['expression-puissances'] },
          { texte: 'Calculer la valeur d’une expression littérale contenant une puissance simple.' },
        ],
      },
      { nom: 'Calcul littéral et algébrique',
        automatismes: [
          'Identifier des régularités et poursuivre une suite de motifs évolutive.',
          'Trouver le nombre d’éléments pour une étape donnée dans une suite de motifs évolutive.',
          'Identifier la structure d’un motif évolutif en repérant une régularité.',
          'Nombre quotient.',
        ],
        objectifs: [
          { texte: 'Produire des formules (double, triple, carré, successeur, prédécesseur, aire, périmètre, etc.).', exemples: ['produire-formule'] },
          { texte: 'Calculer la valeur d’une expression littérale par substitution.', exemples: ['litteral-substituer'] },
          { texte: 'Tester si une égalité entre expressions algébriques comportant une variable est vraie ou fausse.', exemples: ['tester-egalite'] },
          { texte: 'Déterminer si une expression littérale est une somme ou un produit.' },
          { texte: 'Exploiter les relations k(a + b) = ka + kb ou k(a – b) = ka – kb pour factoriser, ou développer une expression littérale.', exemples: ['developper-factoriser'] },
          { texte: 'Réduire une expression littérale de la forme ax + b, où a et b sont des nombres décimaux.', exemples: ['litteral-reduire'] },
          { texte: 'Démontrer une propriété générale par le calcul littéral.' },
          { texte: 'Utiliser un contre-exemple pour démontrer qu’une assertion est fausse.' },
          { texte: 'Formuler des conjectures en s’appuyant sur un langage algorithmique ou un tableur.' },
          { texte: 'Donner à la lettre le statut d’inconnue.' },
          { texte: 'Modéliser des problèmes relevant des opérations à trous par des équations du type ax = c ou x + b = c .', exemples: ['equations'] },
          { texte: 'Résoudre des équations du type ax = c ou x + b = c par des méthodes arithmétiques s\'appuyant sur les opérations inverses.', exemples: ['equations'] },
        ],
        prolongements: [
          'Lien avec Al Khwarizmi pour qui la résolution des problèmes fait appel à la « chose » qu’on cherche.',
          'Spécificité de la résolution des équations du type x + b = c (« Al-jabr ») et du type ax = c (« Al-hatt ») chez Al Khwarizmi.',
        ],
      },
    ] },
    { nom: 'Espace et géométrie', domaines: [
      { nom: 'Repérage sur une droite et dans le plan',
        automatismes: [
          'Placer sur une demi-droite graduée un point dont l’abscisse est un nombre décimal.',
          'Repérer un nombre décimal sur une demi-droite graduée.',
        ],
        objectifs: [
          { texte: 'Sur une droite graduée : lire l’abscisse d’un point donné ; placer un point d’abscisse donnée.' },
          { texte: 'Dans le plan muni d’un repère orthogonal : lire les coordonnées d’un point donné ; placer un point de coordonnées données.', exemples: ['coordonnees', 'placer-point'] },
        ],
      },
      { nom: 'Représentation de l’espace',
        automatismes: [
          'Reconnaitre des vues (de dessus, dessous…) d’empilements de cubes.',
          'Dénombrer des cubes dans des empilements.',
          'Reconnaitre un cube, un pavé représenté en perspective cavalière.',
          'Reconnaitre un patron d’un cube.',
        ],
        objectifs: [
          { texte: 'Construire et mettre en relation différentes représentations en perspectives cavalières des solides suivants : pavé droit, cube, cylindre de révolution, prisme droit.' },
          { texte: 'Savoir mettre en relation une représentation en perspective cavalière et un patron d’un pavé, d’un prisme droit ou d’un cylindre de révolution.' },
          { texte: 'Calculer le volume du cube, du pavé droit, du prisme droit.', exemples: ['volumes'] },
          { texte: 'Connaitre et convertir des unités usuelles (volume et capacité).', exemples: ['volume-capacite'] },
          { texte: 'Calculer l’aire du disque, le volume du cylindre de révolution.', exemples: ['disque-cylindre'] },
        ],
        prolongements: [
          'Solides de Platon, formule d’Euler.',
          'Tableaux d’Escher pour jouer sur la perception de l’espace et des volumes.',
        ],
      },
      { nom: 'Transformations',
        automatismes: [
          'Reconnaitre et construire le symétrique d’une figure par symétrie axiale, dont l’axe est vertical, horizontal, ou en diagonale sur quadrillage.',
          'Construire le symétrique, par rapport à un axe, d’un point, d’une figure, sur feuille blanche.',
        ],
        objectifs: [
          { texte: 'Définir le demi-tour, ou symétrie centrale.', exemples: ['demi-tour'] },
          { texte: 'Connaitre les propriétés du demi-tour.', exemples: ['demi-tour-proprietes'] },
        ],
        prolongements: [
          'Rosaces et pavages dans l’art du Moyen Âge.',
          'Lien avec les formes vues dans la nature : flocon, alvéoles d’abeilles, fleurs.',
        ],
      },
      { nom: 'Angles',
        automatismes: [
          'Reconnaitre et citer sur une configuration géométrique des angles : angle plein, plat, nul, droit ; angles opposés par le sommet, adjacents, supplémentaires, aigus, obtus.',
          'Savoir qu’un angle droit mesure 90°, qu’un angle plat mesure 180°.',
          'Reconnaitre une bissectrice.',
          'Connaitre les mesures des angles de l’équerre dont dispose l’élève (30° 60° 90° ou 45° 45° 90°).',
        ],
        objectifs: [
          { texte: 'Caractériser le parallélisme par les angles : angles alternes internes, angles correspondants.', exemples: ['paralleles-angles'] },
        ],
        prolongements: [
          'Éléments d’Euclide (Livre I, proposition 27 ou 28).',
        ],
      },
      { nom: 'Triangles',
        automatismes: [
          'Reconnaitre un triangle isocèle, équilatéral ou rectangle à partir d’un schéma codé.',
          'Connaitre la somme des angles d’un triangle, calculer le 3e angle d’un triangle connaissant les mesures des deux autres.',
          'Connaitre la notion de médiatrice, de cercle circonscrit.',
        ],
        objectifs: [
          { texte: 'Connaitre la somme des angles d’un triangle et savoir la démontrer.' },
          { texte: 'Construire des triangles à partir de données partielles.' },
          { texte: 'Connaitre les propriétés des médiatrices et du cercle circonscrit dans le cas de triangles particuliers.' },
          { texte: 'Calculer l’aire d’un triangle.', exemples: ['aire-triangle'] },
          { texte: 'Définir et tracer les hauteurs dans un triangle.', exemples: ['hauteur-mediane'] },
          { texte: 'Savoir que les hauteurs d’un triangle sont concourantes.' },
          { texte: 'Définir et tracer les médianes dans un triangle.', exemples: ['hauteur-mediane'] },
          { texte: 'Démontrer qu’une médiane partage un triangle en deux triangles d’aires égales.' },
          { texte: 'Utiliser ces propriétés dans le cas de triangles particuliers.' },
        ],
        prolongements: [
          'Droite d’Euler, cercle des neufs points.',
          'En suivant un programme de construction donné, l’élève construit, à la règle et au compas, un pentagone régulier.',
          'Construction d’ogives en lien avec l’art gothique.',
          'Construction de rosaces trilobées, du triangle de Reuleaux.',
          'Différents instruments de mesure.',
        ],
      },
      { nom: 'Parallélogrammes',
        automatismes: [
          'Reconnaitre en justifiant un quadrilatère, un parallélogramme, un rectangle, un losange, un carré, un trapèze, un pentagone, un hexagone dans des figures complexes.',
          'Exploiter le codage d’une figure pour identifier des parallélogrammes particuliers.',
        ],
        objectifs: [
          { texte: 'Définir le parallélogramme.' },
          { texte: 'Construire des parallélogrammes.' },
          { texte: 'Connaitre les propriétés caractéristiques des côtés opposés et des diagonales.', exemples: ['proprietes-parallelogramme'] },
          { texte: 'Utiliser une propriété caractéristique sur les diagonales ou les côtés pour les construire ou donner la nature du quadrilatère.', exemples: ['diagonales-nature'] },
          { texte: 'Définir les parallélogrammes particuliers (rectangle, losange, carré).' },
          { texte: 'Connaitre les propriétés caractéristiques.' },
          { texte: 'Savoir calculer l’aire d’un parallélogramme et de figures complexes.', exemples: ['aire-parallelogramme'] },
          { texte: 'Résoudre des problèmes faisant appel à des conversions d’unités de longueur et d’unités d’aires.', exemples: ['conversions-aires'] },
        ],
      },
    ] },
    { nom: 'Organisation et gestion de données, probabilités', domaines: [
      { nom: 'Statistiques',
        automatismes: [],
        objectifs: [
          { texte: 'Recueillir et organiser des données.' },
          { texte: 'Calculer des effectifs et des fréquences (exprimées sous forme décimale, fractionnaire ou de pourcentage).', exemples: ['frequence'] },
          { texte: 'Lire et interpréter des informations présentées sous forme de tableaux, de diagrammes et de graphiques.', exemples: ['lire-tableau'] },
          { texte: 'Représenter, sur papier ou à l’aide d’un tableur-grapheur, des données sous la forme d’un tableau, d’un diagramme (diagramme en barres, diagramme circulaire) ou d’un graphique cartésien.' },
          { texte: 'Choisir une représentation adaptée à ce qu’il convient de mettre en avant.' },
          { texte: 'Calculer et interpréter la moyenne simple d’une série de données.', exemples: ['moyenne'] },
        ],
        prolongements: [
          'Étude des diagrammes de Florence Nightingale.',
        ],
      },
      { nom: 'Probabilités',
        automatismes: [
          'Positionner sur une échelle de probabilité les évènements du type : • évènement impossible ; • évènement certain ; • obtenir pile en lançant une pièce équilibrée ; • obtenir une valeur donnée en lançant un dé équilibré ; • obtenir une couleur d’une boule lors du tirage dans une urne ; • ne pas obtenir la bonne combinaison au loto ; • obtenir 10 fois de suite la valeur 1 en lançant un dé à six faces.',
          'Donner la probabilité sous diverses formes (fraction, décimale, pourcentage) pour les cinq premiers évènements ci-dessus.',
          'Lier l’expression « une chance sur quatre » (par exemple) et la probabilité $\\frac{1}{4}$.',
        ],
        objectifs: [
          { texte: 'Aborder les questions relatives au hasard à partir de problèmes simples.' },
          { texte: 'Utiliser le vocabulaire des probabilités dans des contextes concrets : expérience aléatoire, issue, évènement.' },
          { texte: 'Attribuer des probabilités dans des cas simples (équiprobabilité).', exemples: ['equiprobabilite'] },
          { texte: 'Répéter matériellement une expérience aléatoire simple. Enregistrer les résultats observés dans un tableau d’effectifs et de fréquences.' },
        ],
      },
    ] },
    { nom: 'Proportionnalité, fonctions', domaines: [
      { nom: 'Proportionnalité',
        automatismes: [
          'Reconnaitre si une situation donnée entre dans le cadre de la proportionnalité ou non.',
          'Dans des situations simples, mobiliser une procédure adaptée (propriété de linéarité pour la multiplication ou l’addition, retour à l’unité) pour résoudre un problème lié à la proportionnalité. Par exemple : • à partir d’une recette pour 4 personnes, on sait donner (ou verbaliser la procédure) les quantités lorsque l’on passe à 2, 8 ou 6 personnes ; • si l’on connait le prix d’un kilogramme de tomates, on sait comment calculer le prix de 3 kg ou de 4,3 kg de tomates ; • lors de l’élection des délégués de la classe, 4 élèves se présentent. Chaque élève a voté pour un seul candidat. Voici les résultats : Alexis 6, Chloé 12, Salma 3, Djibril 3, total 24. Calculer le pourcentage de voix de chaque candidat.',
        ],
        objectifs: [
          { texte: 'Utiliser des proportions, des pourcentages.' },
          { texte: 'Calculer, appliquer des proportions, des pourcentages.' },
          { texte: 'Identifier des situations de proportionnalité dans des contextes concrets (prix, recettes, distances, échelles).' },
          { texte: 'Utiliser un coefficient de proportionnalité dans des contextes concrets (prix unitaire, vitesse moyenne, échelle, etc.).', exemples: ['echelle', 'vitesse-moyenne'] },
          { texte: 'Représenter une situation de proportionnalité par un tableau ou un graphique.' },
          { texte: 'Reconnaitre une situation de proportionnalité à partir d’un tableau ou d’un graphique.' },
          { texte: 'Reconnaitre graphiquement qu’un nuage de points est ou n’est pas associé à une situation de proportionnalité entre données discrètes.' },
        ],
      },
      { nom: 'Fonctions',
        automatismes: [],
        objectifs: [
          { texte: 'Introduire l’expression : « en fonction de » dans des contextes concrets ou mathématiques.' },
          { texte: 'Produire un tableau de valeurs.' },
          { texte: 'Lire et interpréter un tableau de valeurs.' },
          { texte: 'Placer dans un repère orthogonal donné des points correspondant à un tableau de valeurs.' },
          { texte: 'Lire et interpréter un graphique cartésien donné par une courbe ou un nuage de points.' },
          { texte: 'Traduire la relation de dépendance entre deux grandeurs par un tableau de valeurs à partir d’une formule.' },
          { texte: 'Produire une formule simple représentant la dépendance de deux grandeurs.' },
          { texte: 'Caractériser graphiquement la proportionnalité.' },
        ],
      },
    ] },
    { nom: 'La pensée informatique', domaines: [
      { nom: 'Pensée informatique',
        automatismes: [],
        objectifs: [
          { texte: 'Manipuler des instructions simples et les séquencer.' },
          { texte: 'Identifier les entrées et sorties d’un programme.' },
          { texte: 'Représenter des formules sous la forme d’une expression informatique dans un langage de programmation par blocs.' },
          { texte: 'Calculer la valeur de formules à l’aide d’une suite d’instruction dans un langage de programmation par blocs.' },
          { texte: 'Prévoir la valeur d’une expression informatique avant son exécution.' },
          { texte: 'Analyser un programme simple donné et modifier ses paramètres.' },
          { texte: 'Effectuer une boucle inconditionnelle simple permettant de répéter une séquence linéaire d’instructions un nombre précis de fois.' },
        ],
      },
    ] },
  ],
  '4e': [
    { nom: 'Nombres et calculs', domaines: [
      { nom: 'Opérations sur les nombres relatifs',
        automatismes: [
          'Manipulation de sommes et différences de nombre relatifs.',
          'Opposé d’un nombre, somme des opposés.',
          'Entretien des tables de multiplication.',
          'Multiplier et diviser par 10, 100, 1 000.',
          'Compléter des multiplications à trou : 5 × ... = 3 ; faire le lien entre multiplication et division.',
          'Multiplication comme addition itérée : 3 + 3 + 3 + 3 = 4 × 3.',
        ],
        objectifs: [
          { texte: 'Multiplier deux nombres relatifs : d’abord dans le cas où un seul des facteurs est négatif, puis, grâce à la distributivité, dans le cas où les deux facteurs sont négatifs.', exemples: ['4e-produit-relatifs'] },
          { texte: 'Diviser deux nombres relatifs.', exemples: ['4e-produit-relatifs'] },
          { texte: 'Savoir calculer un enchainement d’opérations avec des nombres relatifs.', exemples: ['4e-enchainement-relatifs'] },
          { texte: 'Utiliser le vocabulaire (somme, quotient, etc.) à partir d’un enchainement d’opérations dans un programme de calcul et inversement.' },
        ],
      },
      { nom: 'Nombres rationnels',
        automatismes: [
          'Addition et soustraction de fractions de dénominateurs quelconques mais simples.',
          'Comparaison de fractions.',
          'Savoir qu’une fraction est aussi le quotient : $\\frac{3}{7}$ (le nombre, qui, multiplié par 7 donne 3, donc savoir que $7 \\times \\frac{3}{7} = 3$).',
          'Savoir que prendre la fraction d’un nombre revient à multiplier la fraction par ce nombre.',
        ],
        objectifs: [
          { texte: 'Simplifier une fraction.', exemples: ['4e-simplifier-fraction'] },
          { texte: 'Définir la notion de nombre rationnel : le quotient de deux nombres entiers relatifs.' },
          { texte: 'Exprimer l’opposé d’un nombre rationnel.' },
          { texte: 'Calculer le produit de nombres rationnels.', exemples: ['4e-produit-fractions'] },
          { texte: 'Calculer et représenter la fraction d’une fraction, d’un nombre, d’une quantité.' },
          { texte: 'Définir l’inverse d’un nombre et connaitre sa notation.', exemples: ['4e-inverse'] },
          { texte: 'Déterminer l’inverse d’une fraction.', exemples: ['4e-inverse'] },
          { texte: 'Diviser des fractions.', exemples: ['4e-diviser-fractions'] },
          { texte: 'Calculer la valeur d’expressions comportant plusieurs opérations avec des fractions.' },
          { texte: 'Résoudre des problèmes mobilisant les opérations sur les fractions : addition, soustraction, multiplication, division, inverse.' },
        ],
      },
      { nom: 'Puissances',
        automatismes: [
          'Connaitre et reconnaitre les carrés parfaits des entiers de 0 à 12.',
          'Multiplier et diviser par 10, 100, 1 000 ; savoir compléter 1 200 = 1,2 × …',
          'Puissances simples : $2^2 = 4$ ; $2^3 = 8$ ; $3^3 = 27$.',
          '$10^2 = 100$ ; $10^3 = 1\\,000$.',
        ],
        objectifs: [
          { texte: 'Définir les puissances d’exposant positif d’un nombre a.' },
          { texte: 'Multiplier des puissances d’exposant entier naturel d’un même nombre entre elles.', exemples: ['4e-produit-puissances'] },
          { texte: 'Multiplier des puissances d’un même exposant entier naturel de deux nombres entre elles.', exemples: ['4e-produit-puissances'] },
          { texte: 'Résoudre des problèmes faisant intervenir des puissances.' },
        ],
      },
      { nom: 'Racine carrée',
        automatismes: [
          'Donner les carrés des nombres entiers compris entre 0 et 12.',
        ],
        objectifs: [
          { texte: 'Comprendre et connaitre la définition de la racine carrée d’un nombre positif.' },
          { texte: 'Encadrer la racine carrée d’un entier par deux nombres entiers consécutifs.', exemples: ['4e-encadrer-racine'] },
        ],
        prolongements: [
          'Découverte de l’existence de nombres irrationnels (lien entre l’aire d’un carré et la longueur d’un de ses côtés).',
          '√2 n’est pas décimal (démonstration par l’absurde en considérant le chiffre des unités).',
        ],
      },
      { nom: 'Calcul littéral et algébrique',
        automatismes: [
          'Donner la valeur d’expressions numériques simples.',
          'Résoudre des équations du type ax = c et x + b = c, où a, b et c sont des nombres.',
          'Écrire 3 × x sous la forme 3x et savoir que 3x c’est 3 × x.',
          'Connaitre et utiliser : 1 × x = x ; x + x = 2x ; x × x = x² ; 3x + 2x = 5x ; 3x × 2x = 6x².',
          'Donner le double, le triple, la moitié, le prédécesseur, le successeur, le carré d’un nombre.',
          'Tester si un nombre vérifie une égalité.',
        ],
        objectifs: [
          { texte: 'Produire des formules et tester leur vraisemblance : aires de formes géométriques simples, nombres pairs/impairs, etc.' },
          { texte: 'Connaitre et utiliser la distributivité simple pour développer et factoriser une expression algébrique.', exemples: ['4e-developper', '4e-reduire-parentheses'] },
          { texte: 'Utiliser le calcul algébrique pour produire des démonstrations.' },
          { texte: 'Résoudre une équation du premier degré du type ax + b = c.', exemples: ['4e-equation-affine'] },
          { texte: 'Mettre en équation un problème et le résoudre à l’aide d’une équation du premier degré du type ax + b = cx + d.' },
          { texte: 'Formuler des conjectures à l’aide d’un algorithme ou d’un tableur pour résoudre de manière exacte ou approchée une équation.' },
        ],
      },
    ] },
    { nom: 'Espace et géométrie', domaines: [
      { nom: 'Transformations',
        automatismes: [
          'Construire le symétrique d’un point par demi-tour.',
        ],
        objectifs: [],
      },
      { nom: 'Repérage sur une droite et dans le plan',
        automatismes: [
          'Placer sur une droite graduée un point dont l’abscisse est un nombre relatif.',
          'Repérer un nombre relatif sur une droite graduée.',
          'Dans le plan muni d’un repère orthogonal : • lire les coordonnées d’un point donné ; • placer un point de coordonnées données.',
        ],
        objectifs: [],
      },
      { nom: 'Représentation de l’espace',
        automatismes: [
          'Reconnaitre les solides : cube, pavé, cylindre, prisme droit.',
          'Connaitre et utiliser les formules du volume d’un cube, d’un pavé, d’un prisme, d’un cylindre.',
          'Reconnaitre la base d’un prisme donné en perspective cavalière.',
          'Savoir calculer l’aire des figures planes usuelles : triangle, rectangle, disque.',
        ],
        objectifs: [
          { texte: 'Reconnaitre des solides (pyramide, cône de révolution).' },
          { texte: 'Construire et mettre en relation différentes représentations des solides (pavé droit, cube, cylindre de révolution, prisme droit, pyramides et cônes de révolution).' },
          { texte: 'Connaitre le volume de la pyramide et du cône de révolution.', exemples: ['4e-volume-pyramide-cone'] },
        ],
        prolongements: [
          'Lien avec la pyramide du Louvre, les pyramides égyptiennes.',
        ],
      },
      { nom: 'Parallélogrammes et translations',
        automatismes: [
          'Dire si des figures planes sont images l’une de l’autre par une symétrie axiale (dont on identifie l’axe) ou par un demi-tour (dont on identifie le centre).',
          'Dans une configuration donnée, déterminer les images de figures, de droites, de segments, de points par une symétrie axiale ou un demi-tour.',
          'Reconnaitre un parallélogramme à l’aide de sa définition ou d’une propriété caractéristique grâce aux codages.',
          'Reconnaitre un parallélogramme particulier à partir de ses propriétés caractéristiques, notamment à partir des propriétés de ses diagonales.',
        ],
        objectifs: [
          { texte: 'Comprendre l’effet d’une translation.', exemples: ['4e-image-triangle'] },
          { texte: 'Faire le lien avec les parallélogrammes, les angles.' },
          { texte: 'Connaitre et utiliser les propriétés de conservations des translations.' },
        ],
        prolongements: [
          'Pavage d’Escher ou de l’Alhambra.',
        ],
      },
      { nom: 'Triangles',
        automatismes: [
          'Reconnaitre des droites remarquables, y compris dans les triangles particuliers (médiatrices, médianes, hauteurs, bissectrices).',
        ],
        objectifs: [
          { texte: 'Connaitre les trois théorèmes relatifs à la droite des milieux dans un triangle.', exemples: ['4e-droite-milieux'] },
          { texte: 'Connaitre le théorème de Pythagore, sa réciproque, sa contraposée.', exemples: ['4e-pythagore', '4e-reciproque-pythagore'] },
          { texte: 'Mener un travail de logique sur la réciproque et la contraposée.' },
          { texte: 'Caractériser un triangle rectangle à l’aide de son cercle circonscrit, par son inscription dans un demi-cercle dont le diamètre est un côté du triangle.', exemples: ['4e-cercle-circonscrit'] },
          { texte: 'Déterminer le centre du cercle circonscrit d’un triangle rectangle.' },
          { texte: 'Construire des rectangles sans équerre.' },
        ],
        prolongements: [
          'Théorème de Varignon : l’élève étudie la démonstration historique d’Euclide basée sur les aires.',
          'Quelques repères historiques autour de Pythagore et son œuvre.',
        ],
      },
    ] },
    { nom: 'Organisation et gestion de données, probabilités', domaines: [
      { nom: 'Statistiques',
        automatismes: [
          'Calculer une moyenne pour un très petit nombre de valeurs.',
          'Calculer un effectif manquant dans un tableau pour un petit nombre de valeurs.',
          'Calculer une fréquence simple.',
        ],
        objectifs: [
          { texte: 'Calculer une moyenne pondérée dans le cas d’une série discrète de petits effectifs présentée sous forme de données brutes, d’un tableau ou d’un diagramme en barres.', exemples: ['4e-moyenne-ponderee'] },
          { texte: 'Déterminer une médiane et l’interpréter dans le cas d’une série de petit effectif présentée sous forme de données brutes.', exemples: ['4e-mediane-etendue'] },
          { texte: 'Calculer et interpréter l’étendue d’une série présentée sous forme de données brutes, d’un tableau, d’un diagramme en barres, d’un diagramme circulaire.', exemples: ['4e-mediane-etendue'] },
          { texte: 'Comprendre l’évolution de la médiane et de la moyenne quand on ajoute une valeur extrême.' },
          { texte: 'Résoudre des problèmes faisant intervenir les différents indicateurs.' },
          { texte: 'Résoudre des problèmes de comparaison de séries statistiques.' },
          { texte: 'Utiliser le tableur pour calculer une moyenne, une médiane et l’étendue d’une série statistique.' },
        ],
        prolongements: [
          'Le premier traité des Essais d’arithmétique politique de Willem Kersseboom (XVIIIe s.).',
        ],
      },
      { nom: 'Probabilités',
        automatismes: [],
        objectifs: [
          { texte: 'Utiliser le vocabulaire et les notations ensemblistes pour décrire une expérience aléatoire dans des cas simples et définir la notion d’évènement.' },
          { texte: 'Définir : complémentaire, réunion, intersection, ensemble vide (évènement impossible).' },
          { texte: 'Calculer la probabilité d’un évènement et de l’évènement contraire.', exemples: ['4e-probabilite'] },
          { texte: 'Exemples simples d’expériences aléatoires à deux épreuves (par exemple, lancer de deux pièces, d’une pièce et d’un dé, de deux dés, etc.).' },
          { texte: 'À partir de la répétition d’une expérience aléatoire, réalisée matériellement ou simulée, comparer des graphiques de distributions (fréquentielle et probabiliste).' },
          { texte: 'Observer la fluctuation des fréquences pour un nombre de répétitions fixé de l’expérience aléatoire.' },
        ],
      },
    ] },
    { nom: 'Proportionnalité, fonctions', domaines: [
      { nom: 'Proportionnalité',
        automatismes: [
          'Déterminer a % de c quand a vaut 100, 50, 25, 10, 1.',
          'Compléter : 20 % de 120 = … ; $30 = \\frac{\\ldots}{100} \\times 1\\,000$.',
        ],
        objectifs: [
          { texte: 'Utiliser des grandeurs quotients, avec ou sans unités.', exemples: ['4e-vitesse'] },
          { texte: 'Comparer deux nombres ou deux grandeurs à l’aide de leur rapport ou ratio.' },
          { texte: 'Exprimer la proportionnalité entre deux suites de nombres par des égalités de rapports ou sous forme de ratio.' },
          { texte: 'Déterminer une quatrième proportionnelle.', exemples: ['4e-quatrieme-proportionnelle'] },
          { texte: 'Calculer avec des pourcentages.' },
          { texte: 'Rendre compte d’une augmentation ou une diminution exprimée en pourcentages au moyen d’un coefficient multiplicateur.', exemples: ['4e-augmentation'] },
          { texte: 'Définir le coefficient multiplicateur.' },
          { texte: 'Résoudre des problèmes de partage proportionnel.', exemples: ['4e-partage-ratio'] },
        ],
      },
      { nom: 'Fonctions',
        automatismes: [],
        objectifs: [
          { texte: 'Savoir appliquer un programme de calcul à deux (plusieurs) étapes à un nombre simple puis à une variable.', exemples: ['4e-programme-calcul'] },
          { texte: 'Savoir retrouver le nombre de départ après avoir remonté un programme de calcul simple.', exemples: ['4e-remonter-programme'] },
          { texte: 'Produire une formule littérale représentant la dépendance d’une grandeur en fonction d’une autre.', exemples: ['4e-formule'] },
          { texte: 'Représenter l’expression d’une grandeur en fonction d’une autre par un graphique.' },
          { texte: 'Comprendre la dépendance d’une grandeur en fonction d’une autre.' },
        ],
      },
    ] },
    { nom: 'La pensée informatique', domaines: [
      { nom: 'Pensée informatique',
        automatismes: [],
        objectifs: [
          { texte: 'Représenter des conditions simples.' },
          { texte: 'Écrire des instructions conditionnelles.' },
          { texte: 'Manipuler une variable.' },
          { texte: 'Écrire un programme simple donné pour réaliser un objectif ou résoudre un problème.' },
          { texte: 'Modifier un programme donné pour changer son comportement.' },
        ],
      },
    ] },
  ],
  '3e': [
    { nom: 'Nombres et calculs', domaines: [
      { nom: 'Nombres rationnels',
        automatismes: [
          'Additionner, soustraire, multiplier et diviser des fractions.',
        ],
        objectifs: [
          { texte: 'Mettre une fraction sous forme irréductible.' },
          { texte: 'Rendre irréductible une fraction.' },
          { texte: 'Résoudre des problèmes faisant appel à des fractions.' },
        ],
        prolongements: [
          'Notation des ensembles des entiers naturels, des entiers relatifs, des décimaux, des rationnels.',
        ],
      },
      { nom: 'Puissances',
        automatismes: [
          'Puissance comme multiplication itérée : $3 \\times 3 \\times 3 \\times 3 = 3^4$.',
          'Multiplication de puissances d’exposant positif d’un nombre.',
          'Multiplication de puissances de même exposant positif de deux nombres.',
        ],
        objectifs: [
          { texte: 'Définir les puissances d’exposant négatif d’un nombre.' },
          { texte: 'Multiplier et diviser des puissances.' },
          { texte: 'Déterminer la notation scientifique d’un nombre.' },
          { texte: 'Résoudre des problèmes notamment en utilisant la notation scientifique.' },
        ],
        prolongements: [
          'L’échiquier de Sissa.',
          'Le papyrus de Rhind.',
        ],
      },
      { nom: 'Racine carrée',
        automatismes: [
          'Donner les carrés des nombres entiers compris entre 0 et 12.',
        ],
        objectifs: [
          { texte: 'Résoudre analytiquement et graphiquement des équations de la forme $x^2 = a$.' },
          { texte: 'Résoudre des problèmes utilisant la racine carrée.' },
        ],
        prolongements: [
          'Notion de parabole et de faisceaux convergents vers son foyer. Lien avec les paraboles pour capter les chaines de télévision.',
          'Algorithmes d’extraction de racines carrées.',
        ],
      },
      { nom: 'Multiples et diviseurs',
        automatismes: [
          'Factoriser un nombre entier positif : 60 = 2² × 3 × 5.',
          'Simplifier une fraction dont le numérateur et le dénominateur sont dans une même table de multiplication, par exemple $\\frac{15}{35}$ et $\\frac{63}{14}$.',
          'Trouver un dénominateur commun à deux fractions pour les additionner, les soustraire ou les comparer.',
          'Appliquer les critères de divisibilité par 2, 3, 5, 9.',
        ],
        objectifs: [],
      },
      { nom: 'Calcul littéral et algébrique',
        automatismes: [
          'Résoudre des équations du type ax = c, x + b = c, ax + b = c.',
          'Simplifier des expressions littérales.',
          'Calculer la valeur d’une expression algébrique avec des puissances ou non.',
          'Donner la nature d’une expression littérale : 3x + 2 est une somme, 5(x + 4) est un produit.',
          'Développer et factoriser une expression simple.',
          'Donner l’expression générique d’un nombre pair, d’un nombre impair.',
          'Prendre l’opposé d’une expression : savoir que – (5 – 4x) = –5 + 4x.',
        ],
        objectifs: [
          { texte: 'Simplifier des expressions produits ou des rapports comportant des facteurs communs.' },
          { texte: 'Utiliser la double distributivité pour développer et factoriser des expressions dont le facteur est apparent.' },
          { texte: 'Résoudre analytiquement et graphiquement une inéquation du premier degré du type ax ⩾ b.' },
          { texte: 'Résoudre une équation produit nul.' },
          { texte: 'Manipuler les trois identités remarquables pour développer et factoriser : $a^2 + 2ab + b^2 = (a + b)^2$ ; $a^2 - 2ab + b^2 = (a - b)^2$ ; $a^2 - b^2 = (a - b)(a + b)$.' },
          { texte: 'Pratiquer un raisonnement par analyse-synthèse dans le cadre d’une résolution d’équation.' },
        ],
        prolongements: [
          'Étude de l’identité de Sophie Germain.',
        ],
      },
    ] },
    { nom: 'Espace et géométrie', domaines: [
      { nom: 'Repérage sur une droite et dans le plan',
        automatismes: [
          'Placer sur une droite graduée un point dont l’abscisse est un nombre relatif.',
          'Repérer un nombre relatif sur une droite graduée.',
          'Dans le plan muni d’un repère orthogonal : • lire les coordonnées d’un point donné ; • placer un point de coordonnées données.',
        ],
        objectifs: [],
      },
      { nom: 'Représentation de l’espace',
        automatismes: [
          'Reconnaitre des solides (pavé droit, cube, prisme droit, cylindre, pyramide, cône).',
          'Connaitre et utiliser les formules du volume d’une pyramide ou d’un cône.',
          'Donner la nature d’une face d’une pyramide représentée en perspective cavalière.',
          'Identifier les patrons de pyramides données (par exemple inscrites dans un cube).',
        ],
        objectifs: [
          { texte: 'Définir la boule et la sphère.' },
          { texte: 'Définir les grands cercles, le diamètre.' },
          { texte: 'Visualiser et réaliser des sections de pavé parallèlement à une face, de cylindre parallèlement ou perpendiculairement à son axe, d’une boule.' },
          { texte: 'Connaitre et utiliser la formule du volume d’une boule de rayon donné.' },
        ],
        prolongements: [
          'La formule du volume, trouvée au IIIe siècle avant J.-C., d’après une intuition d’Archimède comme étant $\\frac{2}{3}$ du cylindre qui contient la boule. Elle a été démontrée plus formellement par Newton au XVIIe.',
          'Les cinq polyèdres réguliers de l’espace et les illustrations de Léonard de Vinci pour le traité mathématique De divina proportione de Luca Pacioli.',
        ],
      },
      { nom: 'Triangles',
        automatismes: [
          'Utiliser la propriété du triangle rectangle et de son cercle circonscrit.',
          'Écrire l’égalité de Pythagore dans un triangle rectangle.',
          'Utiliser la droite des milieux pour prouver que des droites sont parallèles, pour calculer une longueur, pour prouver qu’un point est le milieu d’un côté.',
        ],
        objectifs: [
          { texte: 'Connaitre et appliquer le théorème de Thalès, sa réciproque, sa contraposée (configurations des triangles emboités et configuration dite du papillon).' },
          { texte: 'Connaitre et utiliser les lignes trigonométriques dans le triangle rectangle : cosinus, sinus, tangente.' },
        ],
        prolongements: [
          'Repères historiques autour du théorème de Thalès, qui n’est pas appelé comme cela dans les autres pays.',
          'Construction des polygones réguliers à la règle et au compas.',
        ],
      },
      { nom: 'Translations et vecteurs',
        automatismes: [
          'Mobiliser les connaissances sur la symétrie axiale, le demi-tour, la translation.',
        ],
        objectifs: [
          { texte: 'Définir et utiliser la translation : définition ponctuelle avec parallélogramme.' },
          { texte: 'Définir et utiliser les notions de vecteur, de vecteurs égaux, de vecteur nul, d’opposé d’un vecteur.' },
          { texte: 'Définir et utiliser la somme de deux vecteurs par enchainement de deux translations.' },
          { texte: 'Découvrir et utiliser la relation de Chasles.' },
        ],
        prolongements: [
          'Savoir qu’un hexagone est obtenu à partir de triangles équilatéraux.',
          'Lien avec les fractales comme les flocons de Von Koch ou les triangles de Sierpinski.',
        ],
      },
    ] },
    { nom: 'Organisation et gestion de données, probabilités', domaines: [
      { nom: 'Statistiques',
        automatismes: [
          'Calculer une moyenne.',
          'Donner une médiane pour une série comportant un petit nombre de valeurs.',
          'Calculer l’étendue d’une série.',
        ],
        objectifs: [
          { texte: 'Calculer des effectifs cumulés croissants.' },
          { texte: 'Donner les quartiles et la médiane d’une série donnée sous forme de tableau d’effectifs ou de diagramme en barres.' },
          { texte: 'Construire et utiliser des boites à moustache pour représenter les valeurs de position d’une série statistique.' },
          { texte: 'Comprendre et interpréter des données statistiques.' },
          { texte: 'Utiliser le tableur pour calculer une moyenne, une médiane et l’étendue d’une série statistique.' },
        ],
      },
      { nom: 'Probabilités',
        automatismes: [],
        objectifs: [
          { texte: 'Connaitre et savoir appliquer la relation P(A ∪ B) + P(A ∩ B) = P(A) + P(B).' },
          { texte: 'Simuler des expériences aléatoires indépendantes.' },
          { texte: 'Observer la stabilisation des fréquences lorsqu’on augmente le nombre de répétitions de l’expérience aléatoire, faire le lien entre fréquence et probabilité selon le nombre de répétitions.' },
        ],
        prolongements: [
          'Problème de l’erreur de D’Alembert.',
        ],
      },
    ] },
    { nom: 'Proportionnalité, fonctions', domaines: [
      { nom: 'Proportionnalité',
        automatismes: [
          'Partager une somme en deux parts selon un certain ratio.',
          'Partager une masse en trois parts selon un certain ratio.',
          'Partager une somme entre deux personnes âgées de 20 et 30 ans proportionnellement à leur âge.',
          'Calculer le pourcentage d’une quantité.',
          'Calculer la distance réelle entre deux villes, connaissant la distance entre ces villes sur une carte routière dont l’échelle est connue.',
          'Appliquer, dans des cas simples, une augmentation ou une diminution exprimée en pourcentages, en utilisant ou non le coefficient multiplicateur.',
        ],
        objectifs: [
          { texte: 'Traduire une augmentation ou une diminution en pourcentages.' },
          { texte: 'Relier la représentation graphique d’une situation de proportionnalité avec le théorème de Thalès.' },
          { texte: 'Connaitre et utiliser les fonctions linéaires.' },
        ],
      },
      { nom: 'Fonctions',
        automatismes: [],
        objectifs: [
          { texte: 'Utiliser les différentes représentations d’une fonction.' },
          { texte: 'Définir et connaitre le vocabulaire : image, antécédents.' },
          { texte: 'Définir et utiliser les fonctions linéaires.' },
          { texte: 'Résoudre graphiquement des équations et des inéquations linéaires.' },
          { texte: 'Relier fonctions linéaires et proportionnalité.' },
          { texte: 'Définir et utiliser les fonctions affines.' },
          { texte: 'Déterminer graphiquement les coefficients d’une fonction affine.' },
          { texte: 'Représenter la fonction carré.' },
        ],
        prolongements: [
          'Méthode de simple fausse position (pour les problèmes du type y = ax).',
        ],
      },
    ] },
    { nom: 'La pensée informatique', domaines: [
      { nom: 'Pensée informatique',
        automatismes: [],
        objectifs: [
          { texte: 'Approfondir la notion de variables.' },
          { texte: 'Utiliser des conditions composées.' },
          { texte: 'Utiliser une boucle conditionnelle.' },
          { texte: 'Structurer des programmes.' },
          { texte: 'Écrire un programme donné pour réaliser un objectif ou résoudre un problème.' },
        ],
      },
    ] },
  ],
}
