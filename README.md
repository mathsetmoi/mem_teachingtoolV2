# Tableau MEM — v0.1

Un tableau blanc pour les cours de maths, pensé pour la classe **et** le distanciel :
le même tableau marche hors connexion sur le poste de la salle, et se partage en
direct avec les élèves quand un serveur est disponible.

## Lancer en local

Il faut Node.js 20 ou plus récent.

```bash
npm install
cd serveur && npm install && cd ..

npm run serveur      # terminal 1 : synchronisation (port 1234)
npm run dev          # terminal 2 : le tableau (http://localhost:5173)
```

Les tablettes de la classe sur le même Wi-Fi ouvrent l'adresse « Network »
affichée par `npm run dev` (par exemple `http://192.168.1.20:5173`).
Le bouton **Partager** crée une salle et donne le lien élève.

Version hors ligne en un seul fichier (clé USB, pas de partage) :

```bash
npm run build        # → dist/index.html, autonome
```

## Figures géométriques

**Au stylo.** Une figure fermée tracée à main levée se redresse au lever du
stylo : carré, rectangle, losange, parallélogramme, triangle (équilatéral,
isocèle, rectangle), polygone régulier, cercle. Garder le stylo immobile un
instant (la plume ne s'éloigne pas d'un pixel et demi de l'endroit où elle
s'est arrêtée, quelle que soit la fréquence du stylet : une plume lente qui
avance n'est jamais coupée) la fait apparaître tout de suite, stylo encore
posé ; c'est aussi ainsi qu'on obtient un segment (sans cela, chaque « 1 » ou
« − » écrit au tableau deviendrait un segment). `Ctrl+Z` rend le tracé
d'origine.

Un tracé arrondi devient un cercle, même bosselé ou un peu ovale : il ne
devient un polygone que si tous ses coins sont francs. Un côté presque
horizontal ou vertical (à 12° près) le devient.
Les tracés trop petits (l'écriture) ne sont jamais touchés, et le bouton
« reconnaissance » de la barre du haut coupe tout.

**Avec l'outil Formes** (`R` rectangle, Maj pour un carré ; `C` cercle ; `G`
polygone, sommet par sommet, en revenant au premier pour fermer).

**Le panneau d'options** ne s'ouvre qu'à la demande : **double-clic** ou
**clic droit** sur l'objet (un simple clic le sélectionne seulement, pour le
déplacer). Il se ferme quand on choisit autre chose ou qu'on clique dans le
vide :

- *Sommets* : points et noms (A, B, C… libres sur la page), modifiables ;
- *Codage* : côtés de même longueur et angles droits, calculés ;
- *Contour* : couleur, épaisseur, pointillés ;
- *Fond* : remplissage en transparence ;
- *Transformer* : symétrie axiale (par un côté, une verticale, un axe du
  repère), symétrie centrale, rotation, translation (par un vecteur entre deux
  sommets ou en coordonnées), homothétie. L'image est une nouvelle figure, aux
  sommets nommés A', B', C'… ;
- *Main levée*, *Dupliquer*, supprimer.

Les transformations et le contour valent aussi pour un tracé à main levée.

Dans *Transformer*, les listes ne gardent que ce qui est au tableau : les
droites tracées sur la page et les côtés de la figure (axes), son centre, ses
sommets et les points nommés de la page (centres), le repère s'il y en a un.
**Désigner** fait cliquer l'axe ou le centre directement sur le tableau (ce qui
est visé s'éclaire) ; **Tracer** le crée tout de suite (deux clics pour un axe,
un clic pour un centre). **Pas à pas** construit l'image comme au tableau,
avec ou sans les instruments : pour chaque sommet, l'équerre et le compas
(symétrie axiale), la règle et le compas (symétrie centrale), le rapporteur et
le compas (rotation)… puis la figure image se trace à la règle. Une image
importée se construit par ses quatre coins.

**Chaque morceau se prend à la main.** Sur la figure sélectionnée (et sur
toutes, avec l'outil Sélection), on attrape un sommet ou une extrémité, le
centre ou le rayon d'un cercle, le nom d'un point :

- **glisser** le déplace (le codage se recalcule ; un nom tourne autour de son
  point sans s'en éloigner, et garde sa place quand on transforme la figure) ;
- **cliquer sans bouger, ou clic droit**, ouvre ses options :
  - un point : son nom, sa marque (aucune, point, croix ×, croix +, rond), le
    bout d'une extrémité (flèche, trait, crochet), sa couleur, sa taille ;
  - un nom : son texte, sa couleur, sa taille, italique ou droit, le replacer
    automatiquement, le masquer ;
  - le rayon d'un cercle : sa valeur en centimètres.

Le clic droit ailleurs sur une figure (ou un double-clic) la sélectionne et ouvre son panneau.
Un morceau choisi l'est seul : il est surligné, pas la figure entière.
`Suppr` retire un sommet choisi (ou masque un nom). Nommer un seul point d'une
figure sans noms donne des lettres libres aux autres.

## Images

Le bouton image de la barre du haut importe une photo ou une capture (on peut
aussi la coller avec Ctrl+V, ou glisser le fichier sur le tableau). Réduite à
1600 px, elle est rangée une seule fois dans le document. Comme une figure, elle
se déplace, se duplique et se **transforme** : symétrie par rapport à une droite
tracée sur la page, à une verticale ou à un axe du repère ; symétrie centrale,
rotation ou homothétie autour d'un point de la page. L'image est vraiment
retournée par une symétrie axiale, et un symétrique ne recopie pas les données.

**Les points d'une image** se placent à la main avec l'outil **Point** (X) :
posé sur l'image, un point y est lié (il la suit quand on la déplace ou la
transforme), et la construction pas à pas du symétrique part de ces points
(A', B', C'…).

## Instruments

Le bouton « Instruments » de la barre du haut pose ou range une **règle**
(20 cm, au millimètre), une **équerre**, un **rapporteur** (double échelle) et un
**compas**. Ils restent où on les a laissés, sans passer dans l'annulation.

- **Déplacer** : on prend le corps. L'origine (le zéro de la règle, le coin de
  l'équerre, le centre du rapporteur, la pointe du compas) s'accroche aux
  points de la figure, puisque c'est de là qu'on mesure.
- **Tourner** : la pastille ↻, autour de l'origine, au degré près, aimantée
  tous les 15°. L'angle s'affiche.
- **Tracer le long d'un bord** : au stylo ou à l'outil segment, posé contre un
  bord, le trait suit le bord en ligne droite, au millimètre sur un bord gradué
  (la longueur s'affiche). L'équerre donne ainsi perpendiculaires et parallèles.
- **Compas** : la pointe le déplace (l'écartement ne bouge pas) ; la mine
  l'écarte, au millimètre ou exactement jusqu'à un point de la figure (report
  de longueur) ; **Maj + mine** le tourne sur sa pointe sans tracer (on « lève »
  le compas pour l'amener où l'arc doit commencer) ; la tête ↻ le fait tourner
  et trace l'arc — un petit tour, un petit arc ; le tour complet, le cercle.
  Deux arcs qui se coupent : pointe en A, Maj + mine vers l'endroit visé, un
  petit tour de tête ; pointe en B (même écartement), et de même.

## Constructions pas à pas

Le bouton « Programme de construction » ouvre un panneau où l'on écrit le
programme comme dans un manuel, une consigne par ligne (ou un exemple tout
prêt) :

    Trace un segment [AB] de 6 cm.
    Trace la médiatrice de [AB].

La construction entière suit d'abord le pointeur en transparence : un clic la
pose là où on la veut (Échap annule). Un programme qui ne s'appuie que sur des
points déjà présents n'a rien à placer et démarre directement.

**Utiliser les objets existants** (case du panneau) : cochée, le programme se
sert des points nommés de la page (« Trace la médiatrice de [AB] » sur le
segment déjà tracé) ; décochée, la construction se fait à part, sans tenir
compte de ce qui est déjà au tableau.

Chaque consigne devient des étapes, chacune avec sa phrase, affichée en grand.
**Pas à pas** (→, Espace ou la télécommande de présentation ; ← pour revenir)
ou **Tout construire**. Avec la case « Avec les instruments », la règle se
couche (du côté opposé à la figure), le compas se pose, s'écarte en affichant
son rayon puis tourne, l'équerre se pose sur la droite, le rapporteur se centre
sur le sommet ; sans, les traits se dessinent seuls. Ce qui est construit
devient de vraies figures (les traits de construction en gris fin) ; revenir
d'une étape retire ce qu'elle avait posé.

Compris : placer des points ; segment [AB] de 5 cm ; droite (AB),
demi-droite [AB) ; cercle de centre O de
rayon 3 cm (ou passant par A) ; médiatrice et milieu de [AB] ; triangle ABC par
ses trois côtés ; triangle équilatéral ; carré, rectangle ; perpendiculaire et
parallèle à (AB) passant par C ; angle BAC de 50° (rapporteur) ; bissectrice ;
(médiatrice, perpendiculaire et parallèle sont tracées en droites, la
bissectrice en demi-droite)
hexagone régulier. Les points déjà nommés sur la page servent. Une phrase non
comprise est dite, pas devinée, avec une phrase modèle à recopier.

Les tournures d'un énoncé passent : « segment AB de longueur 6 cm », « le
segment [AB] mesurant 6cm », « tel que AB = 6 cm », « 6 cm de long », « de 4 cm
de côté », « de 2,5 cm de rayon », « la perpendiculaire à la droite (AB) passant
par le point C », « la médiatrice du segment AB », « 50 degrés »… Les crochets
et parenthèses sont facultatifs ; les majuscules désignent les points.

## Automatismes

Le bouton « Automatismes » (chronomètre) de la barre du haut ouvre une séance
plein écran. Les automatismes suivent la **liste officielle de 5e**, rangés
par thème : opérations, nombres relatifs, nombres rationnels (fractions,
pourcentages), puissances et calcul littéral, repérage, représentation de
l'espace, transformations, angles, triangles, parallélogrammes et polygones,
probabilités, proportionnalité — 42 automatismes, plus 10 « hors liste
officielle » (priorités, conversions, moyenne…). « tout cocher » prend un thème
entier, l'œil montre un exemple. On choisit aussi un **mode**
— réponse directe, QCM, vrai/faux, ou **au hasard** (un mode tiré pour chaque
question) — et un **affichage** : diaporama (une question à la fois, qui
change toutes les 30 s) ou les 10 questions d'un coup.

Une minuterie de 5 min tourne (Pause / Espace). La correction s'affiche à la
fin du temps, ou quand le professeur la demande (bouton ou touche C) ; en QCM,
la bonne proposition est mise en évidence, en vrai/faux la bonne réponse est
rappelée. « Nouveaux exemples » tire dix autres questions.

Chaque automatisme est un générateur (`src/automatismes.ts`) : les valeurs sont
tirées au hasard, et les trois réponses fausses d'un QCM sont de vraies erreurs
d'élèves (calcul de gauche à droite, signe oublié, numérateurs et dénominateurs
additionnés, virgule mal placée…). Écrits pour ce projet, ils ne reprennent le
contenu d'aucun autre site.

Les questions de géométrie et d'espace portent une **figure** tirée elle aussi
au hasard (`src/figures.ts`, en SVG) : droite graduée, repère, angles,
bissectrice, triangles et quadrilatères codés (tournés au hasard : seul le
codage permet de conclure), médiatrice, symétrique sur quadrillage,
empilements de cubes en perspective cavalière, patrons, pavés, motifs,
échelle de probabilité. En QCM, les propositions peuvent elles-mêmes être des
dessins (« Quelle est la vue de dessus ? », « Lequel est un patron de
cube ? »). Le patron se vérifie en faisant rouler un dé sur ses cases : sur
les 35 assemblages de six carrés, on retrouve bien les 11 patrons du cube.

## Revoir la construction (en classe)

Le bouton **Revoir** de la barre du haut (la flèche qui tourne autour d'un
petit triangle) montre comment le tableau s'est construit. Un calque couvre
l'écran, bordé de jaune et marqué **REVOIR** : la classe sait qu'elle ne
regarde pas le direct. Il s'ouvre en pause sur l'image finale de la page
affichée, telle qu'elle était à la fin de sa dernière séance (sur une page
toute neuve : la dernière séance qui montre quelque chose), avec la même
vue que le tableau : au vidéoprojecteur, rien ne bouge. Un bandeau dit ce
qu'on revoit ; **Espace** repart du début, **←** remonte pas à pas.

**Que revoir ?** Le tiroir du même nom propose la page affichée (« Sa
dernière séance », « Toute son histoire », de séance en séance), les séances
du tableau rangées par jour (douze à la fois, puis « Plus anciennes »), et
les pages jetées depuis, dont l'histoire reste lisible. Chaque ligne dit
combien de gestes elle montrera, comme le bandeau et le compteur ; une séance
qui n'a fait que créer ou jeter une page n'y figure pas. On y règle aussi
l'arrêt en fin de partie et le découpage des séances (une pause de 20, 10, 5
ou 2 minutes en sépare deux, comme dans la fenêtre Publier).

**Parties et pas.** Ce qu'on revoit est découpé en parties titrées avec
l'heure réelle : une par page où l'on s'est attardé pendant une séance, une
par séance dans l'histoire d'une page, et une nouvelle après trois minutes de
silence. Elles forment la frise, en bas : glisser montre l'image visée,
toucher une partie mène à son début. À l'intérieur, les gestes rapprochés
(moins de deux secondes stylo levé entre eux) forment un pas, une idée : c'est
ce que fait avancer la télécommande de présentation. Une figure reconnue au
stylo est un seul geste : le tracé à main levée s'écrit, puis la figure le
remplace d'un coup, comme au tableau (sur un tableau d'avant le rythme de la
main, seule la figure se dessine). Jeter une page n'est pas un geste pour la
page où l'on revient.

**Les commandes**, toutes au clavier et en grands boutons : Espace, K ou un
appui bref sur le tableau pour lire ou s'arrêter ; → ou Page↓ pour un pas,
← ou Page↑ pour revenir ; Maj+→ et Maj+← pour un seul geste visible ; [ et ]
pour la partie précédente ou suivante ; Origine et Fin ; 1 à 4, − et + pour
l'allure (Lent, Normal, Rapide, Très rapide ; Rapide au départ) ; C pour
revoir toute la page ; Échap pour revenir au tableau. La lecture suit le
rythme du cours : les intervalles courts sont gardés, les longs silences
tassés en douceur. L'écriture se reforme comme en direct (voir « Le rythme de
la main », plus bas) : à l'allure Normale, chaque lettre s'écrit au rythme
même du stylo ; les autres allures accélèrent ou ralentissent tout, écriture
comprise (Rapide, l'allure de départ, écrit trois fois plus vite). Les
figures se dessinent sous les yeux (le trait suit son chemin, le cercle
s'ouvre comme au compas, le polygone se construit côté après côté) ; formules
et images apparaissent d'un coup. La vue suit la page montrée ; après un
glisser ou un pincement, elle reste où on l'a mise jusqu'à C. Sous
« animations réduites », les figures ne se dessinent plus et rien ne
s'estompe ; l'écriture, elle, garde son rythme : c'est ce qu'on revoit.

**La revue ne fait que lire.** Le document Yjs garde ce qui a été effacé
(`gc: false`) et note un instantané à chaque geste (`film`). La revue lit
une seule page dans l'instantané de l'image qu'elle montre, au moment de la
montrer, sans rien préparer ni reconstruire : elle s'ouvre aussitôt sur un
tableau utilisé depuis des semaines. Elle a sa propre caméra et son propre
rendu, et n'écrit nulle part, ni dans le document ni dans le navigateur ;
crayon, doigt, collage et raccourcis du tableau sont sans effet tant qu'elle
est ouverte. Un test le vérifie sur toutes les portions d'un tableau
(`npm test`) : aucune transaction, le même vecteur d'état, le même film.

## Revoir la séance (les élèves, chez eux)

Le bouton **Publier le replay** (la flèche qui sort d'une boîte, à côté de Revoir)
donne aux élèves un lien à coller dans le cahier de textes Pronote. Ils
l'ouvrent sur leur téléphone, sans compte, et appuient sur ▶.

**Côté professeur.** La fenêtre propose la séance, repérée toute seule dans le
film (un silence de plus de 20 minutes, ou un autre jour, en commence une
autre ; deux cours séparés par un intercours de 5 minutes se séparent en
réglant le découpage à 5 ou 2 minutes), les pages où l'on a écrit pendant la
séance, un titre et le compte (Drive personnel ou du lycée). La fenêtre montre
le compte Google connecté ; **Choisir / Changer de compte Google** ouvre la
liste des comptes de Google. Elle retient, sur cet ordinateur, le compte avec
lequel chaque Drive a été publié, le propose en premier la fois suivante, et
prévient avant d'envoyer si l'on est connecté avec un autre. **Voir comme un élève** ouvre
le lecteur dans un onglet, sans rien publier. **Publier** se connecte à Google,
envoie la séance sur le Drive, la relit par le relais comme le fera l'élève, et
donne le lien, avec **Copier pour Pronote** (le titre, le lien et les
chapitres avec leur minute). Republier la même séance met à jour le même
fichier : le lien déjà collé montre la nouvelle version, même depuis un autre
onglet ou un autre ordinateur, et même si le fichier était passé à la
corbeille du Drive (il en revient). « Publier comme une nouvelle séance »
donne volontairement un autre lien. **Enregistrer le
fichier** donne un fichier `.mem` à déposer dans l'ENT ou sur une clé USB ; le
lecteur l'ouvre aussi.

**Côté élève** (`revoir.html`). L'affiche montre le tableau final, le titre, la
date et la durée. Le replay suit le rythme du cours (les longs silences sont
écourtés) aux allures Lent, Normal, Rapide ou Très rapide ; à l'allure Normale,
chaque lettre s'écrit comme au tableau, au rythme de la main (voir « Le rythme
de la main ») ; les figures se dessinent sous les yeux.
Pas à pas, frise, chapitres (un par page pour l'instant), pages qui changent
toutes seules, pincer ou la molette pour zoomer, glisser pour se déplacer,
double-clic pour revoir toute la page. **La lecture s'arrête à la fin de chaque
chapitre** : l'élève relance quand il a recopié (`&continu=1` dans le lien pour
un replay d'un seul tenant, `&c=2` pour ouvrir au chapitre 2). Clavier :
Espace, ← →, [ ], Origine, Fin.

**Ce qui part chez les élèves, et ce qui n'y part pas.** On ne publie jamais
le document du tableau : il garde tout ce qui a été effacé. On publie un « film
élève » (`src/revoir/format.ts`) : l'état des pages au début de la séance,
puis ce qui apparaît, change ou disparaît à chaque geste. Ce qui a été effacé
avant la séance n'y est pas, ni ce qu'efface le premier geste du cours
(« Effacer la page » à l'arrivée de la classe), ni les pages où rien ne s'est
passé pendant la séance (la page de la classe d'avant, quand on commence par
« Nouvelle page »), ni les pages non cochées, ni le nom de l'appareil, ni le
tracé brut d'une figure reconnue, ni les images inutilisées. Le rythme de la
main (le temps de chaque point d'un trait) ne part qu'avec le geste où la
classe a vu ce trait s'écrire. Tout ce qui a été
visible pendant la séance, en revanche, part, même effacé ensuite : l'aperçu
permet de le revoir. Un test
automatique le vérifie (`npm test`). Le lecteur n'écrit rien dans le navigateur
de l'élève (ni stockage, ni cookie), ne charge aucune police ni aucun service
extérieur, et sa politique de sécurité ne l'autorise à parler qu'aux relais.
Il reste au professeur à vérifier qu'aucun prénom n'a été écrit pendant la
séance, et qu'aucune image importée ne montre une copie ou un visage : la
fenêtre le rappelle.

**Le rythme de la main.** Au tableau, chaque point d'un trait arrive à son
heure : la main accélère dans les droites, ralentit dans les boucles, marque
un temps au rebroussement, puis se lève avant la lettre suivante. Le film le
note : l'étape qui pose un trait tracé au stylo (ou au doigt, à la souris)
garde, pour chacun de ses points, le temps que la plume y a passé, jusqu'au
lever (`src/revoir/main-levee.ts` : un petit entier par point, en ms, à partir
de l'heure de l'événement du stylet, sans erreur qui s'accumule). Le lecteur
des élèves et la revue s'en servent pour reformer chaque lettre comme elle
s'est formée : le trait s'écrit à l'heure de chacun de ses points, dessiné
comme le trait en cours sous le stylo (la couche « direct », avec le même
dessin), puis rejoint la page au lever ; l'attente qui le précède est le vrai
temps stylo levé, et non plus l'écart entre deux levers. Seuls les longs
arrêts (plus de 1,2 s, stylo levé ou posé) sont tassés, comme les silences.
L'image finale est la même au pixel près. Le temps est rangé dans l'étape du
film, pas dans le trait : un trait recopié (symétrie, dupliquer) ou déplacé
n'a pas été écrit à ce moment-là, il paraît comme avant. Ce qu'un Ctrl+Z ou
un Ctrl+Y rend (le tracé à main levée d'une figure reconnue, un trait effacé)
revient d'un coup, comme au tableau, sans se redessiner.
Les séances publiées avant ce rythme, et les tableaux qui ne l'ont pas noté,
se rejouent comme avant (le trait se dessine à vitesse de plume constante) ;
un lecteur plus ancien ignore ces temps. Ce que cela coûte, mesuré : le
fichier `.mem` grossit d'environ 5 % sur une séance de 560 traits (stylet à
120 ou 240 Hz ; 11 % sur un film de seize traits), le document du tableau de
7,5 % ; au stylet, rien (une heure notée par point : le gestionnaire de
mouvement prend toujours 0,18 ms en moyenne, le lever 0,1 ms de plus). Sur
un téléphone lent, le lecteur est plus fluide qu'avant : pendant qu'un trait
s'écrit, seule la couche « direct » se repeint (1 ms par image au lieu de 12
pour toute la page, processeur ralenti quatre fois, 960 traits à l'écran).

**Où vivent les séances.** Dans un dossier privé du Drive du professeur, un
par compte : « MEM - Replay séances » (compte mathsetmoi) et « LFB - Replay
séances » (compte du lycée). Rien n'est partagé. Le relais Apps Script de ce
compte (`relais/relais-seances.gs`, projet « MEM - Relais replay ») lit la
séance sous l'identité du professeur et la sert ; un relais par compte Google,
et le lien dit lequel (`?r=mem&id=…`). Il ne sert qu'un fichier `.mem` qui est
bien un replay, rangé dans l'un de ces deux dossiers, et ne liste jamais rien.
Chaque dossier porte aussi la marque de son compte : un essai avec le mauvais
compte Google ne laisse rien derrière lui, et le dossier d'un compte n'est
jamais repris par l'autre.
Les noms des dossiers sont à la fois dans `src/publication/comptes.ts` et dans
le relais : un test vérifie qu'ils concordent. Installer un relais prend cinq
minutes (instructions en tête du script) ; le mettre à jour (Gérer les
déploiements → Version : Nouvelle version) garde la même adresse. Un relais
pas à jour est signalé à la publication. La connexion Google demande le droit
le plus étroit (`drive.file` : Tableau MEM ne voit que les fichiers qu'il a
créés).

**Connexion Google : à régler une fois.** Tableau MEM a besoin de SON
identifiant client Google (`CLIENT_GOOGLE` dans `src/publication/comptes.ts`) :
tant qu'il est vide, la fenêtre ne propose que d'enregistrer le fichier. Une
erreur « origin_mismatch » veut dire que l'adresse du site n'est pas autorisée
pour l'identifiant utilisé. Pour le créer, avec le compte gmail personnel :
1. [console.cloud.google.com](https://console.cloud.google.com) → Nouveau
   projet (son nom, « Aucune organisation »).
2. API et services → Bibliothèque → **Google Drive API** → Activer.
3. Google Auth Platform → Commencer : nom de l'application (c'est lui que
   Google affiche à la connexion), adresse d'assistance, audience
   **Externe**.
4. Accès aux données → ajouter le champ `…/auth/drive.file`.
5. Clients → Créer un client → **Application Web** ; Origines JavaScript
   autorisées : `https://mathsetmoi.github.io` (sans chemin, sans `/` final) et
   `http://localhost:5173`. Pas d'URI de redirection.
6. Audience : « Publier l'application » (avec `drive.file` seul, Google ne
   demande pas de validation), ou rester « En test » en ajoutant les deux
   adresses (gmail et lycée) comme utilisateurs test.
7. Copier l'ID client dans `CLIENT_GOOGLE`. Une nouvelle origine peut mettre de
   cinq minutes à quelques heures à être prise en compte.
Si le lycée filtre les applications tierces, son administrateur Google
Workspace doit autoriser cet ID client (console d'administration → Sécurité →
Contrôle des accès et des données → Commandes des API).

**Mettre en ligne.** `npm run build:pages` construit le tableau et le lecteur
dans `dist-pages/`. Le fichier `.github/workflows/pages.yml` les met en ligne
sur GitHub Pages à chaque envoi sur `main`, après les tests (à activer une
fois : Settings → Pages → Source : GitHub Actions). On publie depuis cette
version en ligne : la connexion Google ne marche ni depuis le fichier unique,
ni depuis une adresse que la console Google n'autorise pas. Attention : le
tableau vit dans le navigateur, adresse par adresse ; celui de la version en
ligne n'est pas celui de la clé USB. La version clé USB peut seulement
enregistrer le fichier séance.

**Les téléphones des élèves.** Le lecteur vise les navigateurs depuis 2020
(Safari 14, Chrome 87, Firefox 78) ; sur les iPhone et iPad d'avant iOS 16.4,
qui ne savent pas décompresser seuls, un petit décompresseur (fflate, 8 Ko) se
charge à la place. Commandes de 44 px, zoom du navigateur jamais bloqué, la
frise annonce le temps aux lecteurs d'écran.

## Partage avec les élèves (mis de côté)

Le code est toujours là (`src/document.ts`, `serveur/`), mais l'outil ne le
propose plus : `PARTAGE_ELEVES = false` dans `src/main.ts`. Le passer à `true`
rend le bouton « Partager » et le mode élève décrits plus bas.

## Ce que fait la v0.1

Outil **Segment** (L) : un petit panneau à côté de l'outil choisit **segment
[AB]**, **droite (AB)** ou **demi-droite [AB)** ; une droite est dessinée jusqu'au
bord de l'écran, quel que soit le zoom, et se prend sur toute sa longueur. Le
panneau d'options d'un trait passe de l'un à l'autre d'un clic.

On trace un trait **en glissant**, ou **en deux clics** : un clic pour le
premier point, un clic pour le second (Échap annule). Près d'un point existant
(un point posé, le sommet d'une figure, le centre d'un cercle), l'extrémité s'y
accroche et le point s'éclaire ; ailleurs, elle se pose où l'on clique. Le
polygone, tracé clic par clic, s'accroche de la même façon.

Outil **Point** (X) : un clic pose un point marqué d'une croix et nommé (A, B,
C…), sur le tableau ou sur une image.

Côté prof : stylo sensible à la pression, surligneur, gomme, segments (Maj pour
les angles de 15°, aimant au quadrillage), formules LaTeX avec aperçu et
raccourcis, sélection et déplacement, annuler/rétablir, pages, fonds (blanc,
petits carreaux, Seyès, repère gradué), zoom de 10 % à 2000 % — le quadrillage
suit le zoom comme une carte : les carreaux trop petits s'estompent et laissent
place à de plus grands (1 cm, 5 cm, 10 cm…), la page n'est jamais blanche.

Côté élève : le lien du prof, un prénom, et l'élève suit la page et le cadrage du
prof. S'il se déplace lui-même, un bouton le ramène. Le prof décide si les élèves
peuvent écrire ; leurs traits apparaissent en direct, avec leur prénom au curseur.

Au pavé tactile : deux doigts qui glissent déplacent le tableau, pincer zoome ;
la molette d'une souris zoome. **Échap** annule ce qui est en cours (menu,
sélection, polygone) ; s'il n'y a rien, il passe à l'outil Sélection, et un
second Échap rend l'outil d'avant. Avec la Sélection, glisser un objet le
déplace, glisser dans le vide déplace le tableau, Maj + glisser encadre ; l'objet
survolé s'éclaire d'un halo bleu qui suit sa forme, avant le clic ; une droite
ou une demi-droite sélectionnée se surligne sur toute sa longueur visible ; les flèches poussent la sélection d'1 mm
(1 cm avec Maj).

Au doigt : deux doigts pour zoomer et déplacer. Dès qu'un stylet a servi, le doigt
ne dessine plus (la paume posée sur l'écran ne laisse pas de traces).

## Architecture

```
   ┌──────────── navigateur ────────────┐
   │  ui.ts       barres, dialogues     │
   │  app.ts      gestes → formes       │
   │  rendu.ts    3 couches d'affichage │
   │  document.ts document Yjs (CRDT) ──┼── IndexedDB (hors ligne)
   └────────────────────────────────────┘
                      │ WebSocket (seulement si on partage)
              serveur/server.js  ── dossier salles/ (sauvegarde)
```

Le choix qui fait tout : **ce qui est écrit vit dans un document Yjs**, un CRDT.
Une forme est un simple objet JSON rangé dans ce document. Trois choses en
découlent sans code supplémentaire :

1. **Hors ligne et en ligne, c'est le même code.** Le document s'enregistre dans
   le navigateur ; brancher un serveur ne fait que le synchroniser. Si le Wi-Fi
   tombe en plein cours, chacun continue, et tout se fusionne au retour.
2. **L'annulation est personnelle.** `Ctrl+Z` défait vos gestes, jamais ceux d'un
   élève qui écrivait au même moment.
3. **Le serveur est minuscule.** Il relaie et sauvegarde, sans rien savoir du
   dessin. Pas de base de données à concevoir.

Ce qui n'a pas à être enregistré (le trait en cours, les curseurs, la page que
regarde le prof) passe par la « présence » Yjs : diffusé en direct, oublié ensuite.

Le rendu est en trois couches : un canvas pour le fond et les formes posées,
redessiné seulement quand quelque chose change ; une couche HTML pour les
formules KaTeX, nettes à tout zoom ; un petit canvas « direct » pour le trait en
cours, qui fait la latence ressentie au stylet.

| Fichier | Rôle |
| --- | --- |
| `src/types.ts` | Les formes (trait, segment, formule), les fonds, la présence |
| `src/document.ts` | Document Yjs : pages, formes, annulation, connexion |
| `src/app.ts` | Gestes au stylet, au doigt et à la souris ; suivi du prof |
| `src/rendu.ts` | Les trois couches d'affichage |
| `src/fonds.ts` | Carreaux, Seyès, repère gradué |
| `src/geometrie.ts` | Ce que touche la gomme ou la sélection |
| `src/formes.ts` | Reconnaissance des figures, codage, transformations |
| `src/revue/` | La revue en classe : ce qu'on revoit, les images, la frise, le choix |
| `src/revoir/` | Le replay des élèves : format du film, rythme de la main, exporteur, bobine, lecteur (`revoir.html`), relais |
| `src/publication/` | Publier sur le Drive : comptes et relais, connexion Google, la fenêtre |
| `relais/relais-seances.gs` | Le relais Apps Script, à déployer dans chaque compte Google |
| `tests/` | Les tests (`npm test`) : ce qui part chez les élèves, la fidélité du replay |
| `src/instruments.ts` | Règle, équerre, rapporteur, compas |
| `src/construction.ts` | Programme de construction → étapes et gestes |
| `src/constructeur.ts` | Joue les étapes, avec ou sans instruments |
| `src/automatismes.ts` | Les automatismes de 5e (générateurs) |
| `src/seance.ts` | La séance d'automatismes : modes, diaporama, minuterie |
| `src/figures.ts` | Les figures SVG des automatismes |
| `src/ui.ts` | Barres d'outils, partage, éditeur de formules |
| `serveur/server.js` | Relais WebSocket et sauvegarde des salles |

Toutes les briques sont sous licence MIT (Yjs, y-websocket, y-indexeddb,
perfect-freehand, KaTeX, Vite) : aucune clé de licence, aucun filigrane, et rien
n'empêche un usage payant.

## Pour le distanciel

1. Héberger le site statique (`npm run build`, puis le dossier `dist/`) sur
   n'importe quel hébergement : GitHub Pages, Netlify, l'espace web de
   l'établissement.
2. Lancer `serveur/` sur une petite machine toujours allumée (un VPS à quelques
   euros par mois suffit), derrière un proxy qui fournit le HTTPS (Caddy le fait
   en deux lignes), pour obtenir une adresse `wss://`.
3. Copier `.env.exemple` en `.env`, y mettre cette adresse, reconstruire.

## Limites connues de la v0.1

- Les droits des élèves sont vérifiés dans le navigateur seulement. Un élève
  bricoleur pourrait écrire sans autorisation. À corriger côté serveur avant un
  usage réel (jeton prof, salles signées).
- Le nom de la salle sert de clé : quiconque a le lien entre.
- Tout est redessiné à chaque déplacement de la vue. Au-delà de quelques
  milliers de traits sur une page, il faudra un index spatial (quadtree).

## Feuille de route proposée

1. Export PDF des pages (pour l'ENT et les absents).
2. Instruments : règle et équerre qui s'alignent l'une sur l'autre, crayon qui
   suit l'arc du rapporteur pour reporter un angle.
3. Constructions : plus de phrases (triangle par deux côtés et un angle,
   cercle circonscrit, hauteurs, symétriques…), et l'équerre qui glisse le long
   de la règle pour les parallèles.
4. Figures liées : un point partagé par deux figures, une image qui suit sa
   figure quand on la déplace.
5. Import d'un PDF comme fond de page (annoter un énoncé) ; recadrer une image.
6. Formes mathématiques : courbe de fonction, tableau de variations, droite graduée.
7. Sécurité du serveur : jeton prof, durée de vie des salles.
8. Revue : export vidéo, et alléger les très longs films (le document ne
   jette plus rien).
