// =============================================================
// LES CAPACITÉS ATTENDUES DU PROGRAMME, AU LYCÉE (pour le flash)
// Au lycée, la fenêtre du flash range les automatismes comme au collège,
// en un seul arbre Thème › Domaine › lignes : dans chaque domaine du
// programme, les lignes OFFI (la liste « Automatismes » du programme) et
// les lignes CAP (les « Capacités attendues » du domaine, numérotées
// CAP1, CAP2… dans l'ordre du programme, avec leur intitulé exact).
//
// Ce fichier donne, niveau par niveau, les thèmes et les domaines du
// programme et la liste des capacités attendues de chaque domaine. Les
// lignes OFFI sont dans programme-automatismes.ts. Un niveau du lycée
// n'a l'arbre que s'il est ici.
// =============================================================

export interface DomaineLycee { nom: string; capacites: string[] }
export interface ThemeLycee { nom: string; domaines: DomaineLycee[] }

export const CAPACITES_LYCEE: Record<string, ThemeLycee[]> = {
  // Programme de mathématiques de seconde générale et technologique
  '2nde': [
    { nom: 'Nombres et calculs, algèbre', domaines: [
      { nom: 'Arithmétique', capacites: [
        'Modéliser et résoudre des problèmes mobilisant les notions de multiple, de diviseur, de nombre pair, de nombre impair.',
        'Présenter les fractions sous forme irréductible.',
      ] },
      { nom: 'Nombres réels', capacites: [
        'Lire l’abscisse d’un nombre réel sur une droite graduée et placer un nombre réel d’abscisse donnée.',
        'Représenter un intervalle de la droite numérique. Déterminer si un nombre réel appartient à un intervalle donné.',
        'Donner un encadrement, d’amplitude donnée, d’un nombre réel par des décimaux.',
        'Dans le cadre de la résolution de problèmes, arrondir en donnant le nombre de chiffres significatifs adapté à la situation étudiée.',
      ] },
      { nom: 'Algèbre', capacites: [
        'Effectuer des calculs numériques ou littéraux mettant en jeu des puissances, des racines carrées, des écritures fractionnaires.',
        'Sur des cas simples de relations entre variables (par exemple $U = RI$, $d = vt$, $S = \\pi r^2$, $V = abc$, $V = \\pi r^2 h$), exprimer une variable en fonction des autres. Cas d’une relation du premier degré $ax + by = c$.',
        'Choisir la forme la plus adaptée (factorisée, développée réduite) d’une expression en vue de la résolution d’un problème.',
        'Comparer deux quantités en utilisant leur différence, ou leur rapport (ratio) dans le cas de quantités positives. Interpréter, selon le contexte, cette comparaison en termes de variation additive ou multiplicative.',
        'Modéliser un problème par une inéquation.',
        'Donner l’ensemble des solutions d’une équation du premier degré du type $ax = b$, $a + x = b$, $ax + b = cx + d$, d’une inéquation du premier degré du type $ax \\geqslant b$, $a + x \\geqslant b$, $ax + b \\geqslant cx + d$, d’une équation du type $x^2 = a$.',
      ] },
    ] },
    { nom: 'Géométrie', domaines: [
      { nom: 'Vecteurs et problèmes de géométrie', capacites: [
        'Représenter la somme de deux vecteurs à partir de représentants de même origine.',
        'Représenter un vecteur dont on connait les coordonnées. Lire les coordonnées d’un vecteur.',
        'Calculer les coordonnées d’une somme de vecteurs, d’un produit d’un vecteur par un nombre réel.',
        'Calculer la distance entre deux points. Calculer les coordonnées du milieu d’un segment.',
        'Caractériser alignement et parallélisme par la colinéarité de vecteurs.',
        'Résoudre des problèmes en utilisant la représentation la plus adaptée des vecteurs.',
        'Résoudre des problèmes avec des méthodes diverses (méthodes vectorielles, repérées ou non, méthodes géométriques).',
      ] },
      { nom: 'Droites du plan', capacites: [
        'Déterminer une équation de droite à partir de deux points, un point et un vecteur directeur ou un point et la pente.',
        'Déterminer la pente ou un vecteur directeur d’une droite donnée par une équation ou une représentation graphique.',
        'Tracer une droite connaissant son équation cartésienne ou réduite.',
        'Établir que trois points sont alignés ou non.',
        'Déterminer si deux droites sont parallèles ou sécantes.',
        'Déterminer le point d’intersection de deux droites sécantes données par leur équation réduite.',
      ] },
    ] },
    { nom: 'Fonctions', domaines: [
      { nom: 'Représentation algébrique et graphique des fonctions', capacites: [
        'Exploiter l’équation $y = f(x)$ d’une courbe : appartenance, calcul de coordonnées.',
        'Modéliser par des fonctions des situations issues des mathématiques, des autres disciplines ou de la vie courante ou citoyenne.',
        'Fonctions valeur absolue, carré, inverse : définitions et courbes représentatives.',
        'Résoudre une équation ou une inéquation du type $f(x) = k$, $f(x) < k$, en choisissant une méthode adaptée : graphique, algébrique, logicielle.',
        'Résoudre une équation ou une inéquation de la forme $f(x) = 0$, $f(x) > 0$ à l’aide d’un tableau de signes, lorsque $f$ est un produit ou un quotient.',
        'Résoudre, graphiquement ou à l’aide d’un outil numérique, une équation ou inéquation du type $f(x) = g(x)$, $f(x) < g(x)$.',
        'Pour les fonctions affines, valeur absolue, carré, inverse, racine carrée et cube, résoudre graphiquement ou algébriquement une équation ou une inéquation du type $f(x) = k$, $f(x) < k$.',
      ] },
      { nom: 'Variations et extrémums d’une fonction', capacites: [
        'Relier représentation graphique et tableau de variations.',
        'Déterminer graphiquement les extrémums d’une fonction sur un intervalle.',
        'Exploiter un logiciel de géométrie dynamique ou de calcul formel, la calculatrice ou Python pour décrire les variations d’une fonction donnée par une formule.',
        'Pour une fonction affine, relier sens de variation, signe de la fonction et droite représentative.',
        'Traiter de problèmes d’optimisation.',
        'Fonctions valeur absolue, carré : signe et variations.',
        'Pour deux nombres $a$ et $b$ donnés et une fonction de référence $f$, comparer $f(a)$ et $f(b)$ numériquement ou graphiquement.',
      ] },
    ] },
    { nom: 'Statistiques et probabilités', domaines: [
      { nom: 'Information chiffrée et statistique descriptive', capacites: [
        'Exploiter la relation entre effectifs, proportions et pourcentages.',
        'Traiter des situations simples mettant en jeu des pourcentages de pourcentages.',
        'Exploiter la relation entre deux valeurs successives et leur taux d’évolution.',
        'Calculer le taux d’évolution global à partir des taux d’évolution successifs. Calculer un taux d’évolution réciproque.',
        'Pour une série statistique regroupée en classes : calculer la moyenne à partir de la moyenne et des effectifs de chaque classe (moyenne pondérée) ; cas particulier où la répartition est uniforme dans chaque classe (donc égale au centre de la classe) ; déterminer la classe médiane à partir des effectifs des classes ; estimation de la médiane dans le cas de répartition uniforme dans la classe médiane.',
        'Décrire les différences entre deux séries statistiques, en s’appuyant sur des indicateurs ou couples d’indicateurs (moyenne-écart type / médiane-écart interquartile), sur des représentations graphiques données.',
      ] },
      { nom: 'Croisement de deux variables qualitatives', capacites: [
        'Calculer des fréquences conditionnelles et des fréquences marginales.',
        'Compléter un tableau croisé par des raisonnements sur les effectifs ou en utilisant des fréquences conditionnelles.',
      ] },
      { nom: 'Probabilités', capacites: [
        'Observer la loi des grands nombres à l’aide d’une simulation sur Python ou tableur.',
        'Construire un arbre pondéré ou un tableau en lien avec une situation donnée. Passer du registre de la langue naturelle au registre symbolique et inversement.',
        'Calculer des probabilités conditionnelles lorsque les évènements sont présentés sous forme de tableau croisé d’effectifs (tirage au sort avec équiprobabilité d’un individu dans une population) ou d’un arbre de probabilité.',
        'Interpréter les pondérations de chaque branche d’un arbre en termes de probabilités, et notamment de probabilités conditionnelles.',
        'Faire le lien entre la définition des probabilités conditionnelles et la multiplication des probabilités des branches du chemin correspondant.',
        'Distinguer en situation $P_A(B)$ et $P_B(A)$, par exemple dans des situations de type « faux positifs ».',
      ] },
    ] },
  ],
  // Programme de spécialité de mathématiques de première générale
  '1re': [
    { nom: 'Algèbre', domaines: [
      { nom: 'Suites numériques, modèles discrets', capacites: [
        'Dans le cadre de l’étude d’une suite, utiliser le registre de la langue naturelle, le registre algébrique, le registre graphique, et passer de l’un à l’autre.',
        'Proposer, modéliser une situation permettant de générer une suite de nombres. Déterminer une relation explicite ou une relation de récurrence pour une suite définie par un motif géométrique, par une question de dénombrement.',
        'Calculer des termes d’une suite définie explicitement, par récurrence ou par un algorithme.',
        'Pour une suite arithmétique ou géométrique, calculer le terme général, la somme de termes consécutifs, déterminer le sens de variation.',
        'Modéliser un phénomène discret à croissance linéaire par une suite arithmétique, un phénomène discret à croissance exponentielle par une suite géométrique.',
        'Conjecturer, dans des cas simples, la limite éventuelle d’une suite.',
      ] },
      { nom: 'Équations, fonctions polynômes du second degré', capacites: [
        'Étudier le signe d’une fonction polynôme du second degré donnée sous forme factorisée.',
        'Déterminer les fonctions polynômes du second degré s’annulant en deux nombres réels distincts.',
        'Factoriser une fonction polynôme du second degré, en diversifiant les stratégies : racine évidente, détection des racines par leur somme et leur produit, identité remarquable, application des formules générales.',
        'Choisir une forme adaptée (développée réduite, canonique, factorisée) d’une fonction polynôme du second degré dans le cadre de la résolution d’un problème (équation, inéquation, optimisation, variations).',
      ] },
    ] },
    { nom: 'Analyse', domaines: [
      { nom: 'Dérivation', capacites: [
        'Calculer un taux de variation, la pente d’une sécante.',
        'Interpréter le nombre dérivé en contexte : pente d’une tangente, vitesse instantanée, cout marginal, etc.',
        'Déterminer graphiquement un nombre dérivé par la pente de la tangente. Construire la tangente en un point à une courbe représentative connaissant le nombre dérivé.',
        'Déterminer l’équation de la tangente en un point à la courbe représentative d’une fonction.',
        'Calculer une valeur approchée de $f(a + h)$.',
        'Dans des cas simples, calculer une fonction dérivée en utilisant les propriétés des opérations sur les fonctions dérivables.',
      ] },
      { nom: 'Variations et courbes représentatives des fonctions', capacites: [
        'Étudier les variations d’une fonction. Déterminer les extrémums.',
        'Résoudre un problème d’optimisation.',
        'Exploiter les variations d’une fonction pour établir une inégalité. Étudier la position relative de deux courbes représentatives.',
        'Étudier, en lien avec la dérivation, une fonction polynôme du second degré : variations, extrémum, allure selon le signe du coefficient de $x^2$.',
      ] },
      { nom: 'Fonction exponentielle', capacites: [
        'Transformer une expression en utilisant les propriétés algébriques de la fonction exponentielle.',
        'Pour a réel, dérivée de la fonction $t \\mapsto e^{at}$.',
        'Pour une valeur numérique strictement positive de $k$, représenter graphiquement les fonctions $t \\mapsto e^{-kt}$ et $t \\mapsto e^{kt}$.',
        'Modéliser une situation par une croissance, une décroissance exponentielle (par exemple évolution d’un capital à taux fixe, décroissance radioactive).',
      ] },
      { nom: 'Trigonométrie', capacites: [
        'Placer un point sur le cercle trigonométrique.',
        'Par lecture du cercle trigonométrique, déterminer, pour des valeurs remarquables de $x$, les cosinus et sinus d’angles associés à $x$.',
      ] },
    ] },
    { nom: 'Géométrie', domaines: [
      { nom: 'Calcul vectoriel et produit scalaire', capacites: [
        'Utiliser le produit scalaire pour démontrer une orthogonalité, pour calculer un angle, une longueur dans le plan.',
        'En vue de la résolution d’un problème, calculer le produit scalaire de deux vecteurs en choisissant une méthode adaptée (en utilisant la projection orthogonale, à l’aide des coordonnées, à l’aide des normes et d’un angle, à l’aide de normes).',
        'Utiliser le produit scalaire pour résoudre un problème géométrique.',
      ] },
      { nom: 'Géométrie repérée', capacites: [
        'Déterminer une équation cartésienne d’une droite connaissant un point et un vecteur normal.',
        'Déterminer les coordonnées du projeté orthogonal d’un point sur une droite.',
        'Déterminer et utiliser l’équation d’un cercle donné par son centre et son rayon.',
        'Reconnaître une équation de cercle, déterminer centre et rayon.',
        'Utiliser un repère pour étudier une configuration.',
      ] },
    ] },
    { nom: 'Probabilités et statistiques', domaines: [
      { nom: 'Probabilités conditionnelles et indépendance', capacites: [
        'Dans des cas simples, calculer une probabilité à l’aide de la formule des probabilités totales.',
        'Savoir utiliser ou justifier l’indépendance de deux évènements.',
        'Représenter la succession de deux épreuves indépendantes par un arbre ou un tableau.',
        'Pour $n \\leqslant 4$, représenter l’arbre associé à la répétition de $n$ épreuves de Bernoulli indépendantes et identiques afin de calculer des probabilités.',
      ] },
      { nom: 'Variables aléatoires réelles', capacites: [
        'Interpréter en situation et utiliser les notations $\\{X = a\\}$, $\\{X \\leqslant a\\}$, $P(X = a)$, $P(X \\leqslant a)$. Passer du registre de la langue naturelle au registre symbolique et inversement.',
        'Modéliser une situation à l’aide d’une variable aléatoire.',
        'Déterminer la loi de probabilité d’une variable aléatoire.',
        'Calculer une espérance, une variance, un écart type.',
        'Utiliser la notion d’espérance dans une résolution de problème (mise pour un jeu équitable, etc.).',
      ] },
      { nom: 'Expérimentations', capacites: [
        'Simuler une variable aléatoire avec Python ou un tableur.',
        'Lire, comprendre et écrire une fonction Python renvoyant la moyenne d’un échantillon de taille $n$ d’une variable aléatoire.',
        'Étudier sur des exemples la distance entre la moyenne d’un échantillon simulé de taille $n$ d’une variable aléatoire et l’espérance de cette variable aléatoire.',
        'Simuler, avec Python ou un tableur, $N$ échantillons de taille $n$ d’une variable aléatoire, d’espérance $\\mu$ et d’écart type $\\sigma$. Si $m$ désigne la moyenne d’un échantillon, calculer la proportion des cas où l’écart entre $m$ et $\\mu$ est inférieur ou égal à $\\frac{2\\sigma}{\\sqrt{n}}$.',
      ] },
    ] },
  ],
}
