# La batterie des essais du navigateur

Ces essais pilotent un vrai navigateur (Chromium, par Playwright) sur l'outil :
le serveur de développement, la version hors ligne (`dist/index.html`,
la version hors ligne, ouverte en `file://`) et la version en ligne (`dist-pages`). Ils
rejouent ce que fait le professeur (la souris, le doigt, le stylet, le
clavier, le téléphone, l'iPad, le TNI…), relisent ce qui est enregistré
(IndexedDB, les fichiers `.memc` et `.mem`, la clé, le Drive simulé) et
vérifient ce qui est peint. Ils ont été écrits au fil des lots 1 à 5 ; ils
complètent `npm test` (les tests sous Node, dans `tests/`), qu'ils ne
remplacent pas.

En tout, environ 350 essais (des fichiers `.mjs` lancés par Node, quelques
dossiers d'essais vitest, le banc d'écriture), rangés par lot :

| Dossier | Ce qu'il y a |
| --- | --- |
| `test42.mjs`, `test46-lecteur.mjs`, `test47-casse-lecteur.mjs`, `test50.mjs`, `instruments/`, `t47/` | les premiers essais (le lecteur des élèves, la revue, les instruments, Publier) |
| `lot1/` … `lot5/` | les essais de chaque lot (`lotN/*.mjs`), ceux de ses vérifications (`lotN/verif/`), de ses corrections et de son contrôle final |
| `lot7/` | ouvrir et enregistrer sur l'ordinateur ou sur le Drive, « Mes emplacements » (`E1-ailleurs.mjs`) ; reprendre un ancien tableau, `.prof`, à sa date dans le classeur ouvert (`E2-ancien-tableau.mjs`, adapté au lot 17) |
| `lot8/` | les séances sous la carte d'un classeur (`E1-seances-carte.mjs`) et le bouton « Séances » de la bibliothèque (`E2-onglet-seances.mjs`) |
| `lot9/` | ranger les séances depuis la bibliothèque : renommer, changer l'ordre, supprimer, déplacer vers un autre classeur (`E1-ranger-seances.mjs`) |
| `lot10/` | le flash d'automatismes sur une page de la séance : le réglage (rien de montré), une question à la fois, la correction, la case de « Bonjour ! », toutes d'un coup, « Nouveaux exemples » (`E1-flash.mjs`) |
| `lot11/` | importer un PDF : la fenêtre (les pages, où les mettre, « Fixer en fond »), une page du tableau par page du PDF, toutes sur cette page, Annuler, et la version hors ligne sans internet (`E1-import-pdf.mjs`) |
| `lot12/` | l'outil Texte : un clic, deux lignes, une formule entre $, le gras et la couleur, un cadre glissé (la largeur), le double-clic, la gomme qui ne l'efface pas, copier-coller, les puces, les côtés du cadre, la recherche (`E1-texte.mjs`) |
| `lot13/` | le mode nuit d'une page : la touche N et le bouton lune, le papier noir et l'encre claire, les barres foncées, une autre page de jour, la case de la trieuse et sa vignette, le replay des élèves qui bascule au même moment (`N1-nuit.mjs`) |
| `lot14/` | la calculatrice NumWorks : le menu Classe, l'installation (avec une page d'essai qui se fait passer pour l'émulateur), l'écran noté dans le film à chaque appui et jamais sans appui, la bande qui la déplace au Stylo, × et Ctrl+Z, le lecteur, la version hors ligne sans internet (`E1-calculatrice.mjs`) ; avec les vrais fichiers de NumWorks, s'ils sont donnés par `NUMWORKS_LYCEE` et `NUMWORKS_COLLEGE` (sinon il ne fait rien) : installer, calculer, l'écran noté (`E2-vrais-emulateurs.mjs`) |
| `lot15/` | Publier dans un dossier de l'ordinateur, sans connexion Google : le fichier « Titre [code].mem », le lien avec le code, l'attente puis « en ligne », republier sous un autre nom (même code, un seul fichier), un relais pas à jour signalé avant d'écrire ; puis Publier en un clic (lot 16) : la fenêtre en résumé quand tout est retenu, « Modifier… », l'accord du dossier refusé qui déplie sans rien écrire (`P1-publier-dossier.mjs`) |
| `lot17/` | le deuxième lot de l'audit : les séances isolées (le lien de « Bonjour ! », le classeur « Séances isolées » créé sans fenêtre puis retrouvé, en queue du niveau avec « Hors chapitre », une séance déplacée vers son chapitre, Publier avec le niveau relié, la version hors ligne : `E1-seances-isolees.mjs` ; `DEV=…` pour le port, `CAPTURES=…` pour les captures) ; l'ancien tableau (`.prof`) à sa date dans le classeur ouvert, l'aperçu de la fenêtre, plusieurs d'un coup dont un doublon, plus récent que tout, le téléphone, le fichier relié réécrit (sections C et F à J de `lot7/E2-ancien-tableau.mjs`, qui reste dans son lot) ; la corbeille du classeur rangée par séance : une séance supprimée depuis la bibliothèque fait un bloc (ses vignettes numérotées, « Remettre la séance », « Supprimer définitivement »), les pages seules disent leur séance (« Page 3 · séance du jour »), la poubelle refusée sur une séance passée, le rechargement et le `.memc`, la version hors ligne, l'iPad et le téléphone, le clavier, la case « Vider tout seul ce qui est ici depuis plus de 30 jours », la séance remise qui redevient la séance du jour (`F1-corbeille-seances.mjs`) ; « Vérifier les classeurs », plus jamais d'image grise : l'image retrouvée à l'ouverture d'un classeur et ses pixels, l'image introuvable et son bouton, la fenêtre du menu ⋯ (la ligne d'état, Réparer, Tout réparer, l'introuvable, l'illisible), la corbeille qui recopie les images avant d'effacer (et le classeur retenu si la recopie échoue), l'autre onglet qui se recharge, le téléphone et le clavier, la version hors ligne, une mesure sur dix classeurs avec des photos (`V1-verifier-classeurs.mjs`) |
| `lot18/` | un seul endroit pour chaque classeur : la fenêtre « Où ranger les classeurs de « 5eme » ? » au premier « Nouveau classeur » d'un niveau (les établissements, « Choisir un dossier… », le dossier du niveau au nom tapé, un dossier par classeur avec son `.memc`, le chemin dans la fiche, le bilan, aucune permission demandée hors d'un clic), la fenêtre « Nouveau classeur » sans case (« Son fichier ira dans … », le fichier écrit avant de partir), un deuxième établissement, « Mes emplacements » (la ligne des établissements, « Changer… », « Ranger… »), « Plus tard », « Séances isolées » et un `.memc` ajouté (adopté s'il est déjà à sa place) et un classeur remis de la corbeille qui reçoivent leur fichier, « Un autre dossier, pour ce niveau seul… », « Changer… » d'établissement (les anciens fichiers restent), le fichier séance de Publier dans le dossier du chapitre, la version hors ligne avec un faux système de fichiers (`E1-ranger.mjs` ; `DEV=…` pour le port, `CAPTURES=…` pour la capture de la fenêtre, `A`, `E` ou `K` en argument pour une partie) ; « Déplacer le classeur… », le fichier suit : la fenêtre et sa ligne « Son fichier ira dans … », le classeur ouvert déplacé (le nouveau fichier écrit et relu, l'ancien retiré, l'ancien dossier aussi, la clé qui écrit ensuite dans le nouveau), les `.mem` du chapitre qui suivent et « Annuler », un niveau pas rangé, un fichier choisi à la main et « Ne plus l'enregistrer dans un fichier », l'ancien fichier modifié ailleurs (il reste), un fichier plus riche (rien ne bouge), une carte, un glisser-déposer, un classeur ouvert dans un autre onglet, « Un autre dossier de l'ordinateur… » et Publier, un classeur sans fichier qui reçoit le sien, la version hors ligne ; aucune permission hors d'un clic (`E3-deplacer.mjs` ; `DEV=…` pour le port, `A` ou `J` en argument pour une partie) |
| `ecriture/` | le banc d'écriture (le trait en direct et au replay) |
| `commun/` | `racines.mjs` (les chemins, calculés depuis l'emplacement des fichiers), `playwright.mjs` (où trouver Playwright ; `lancerPersistant()` pour les essais de la clé) et `sonde-contexte-ephemere.mjs` (ce contournement est-il encore nécessaire ?) |
| `tout.sh` | le lanceur |
| `sorties/` | ce qu'écrit la batterie (ignoré par git) |

## La lancer

Depuis la racine du dépôt, en **deux parties** (environ 1 h 40 pour la
première, 1 h pour la seconde : ensemble, elles dépassent deux heures, la
limite d'une commande dans une session d'agent) :

```bash
npm run essais:navigateur:1   # ou : sh essais/navigateur/tout.sh 1
npm run essais:navigateur:2   # ou : sh essais/navigateur/tout.sh 2
npm run essais:navigateur     # les deux à la suite (environ 2 h 40)
```

La partie 1 construit les deux versions (`npm run build`, `npm run
build:pages`), puis passe les essais des lots 1 à 5 et le banc d'écriture.
La partie 2 passe les sondes des vérifications des lots 3, 4 et 5, les essais
vitest qui ne sont pas dans `npm test`, ceux du contrôle final du lot 5 et
les essais des lots 17 et 18 (`lot17/*.mjs`, `lot18/*.mjs`).

Chaque partie lance son propre serveur de développement, neuf, sur le port
5173 (celui qui y tournait est arrêté, puis relancé à la fin), sans
rechargement à chaud ni surveillance des fichiers
(`lot4/cf/vite-batterie.config.mjs`), et sert `dist-pages` sur le port 4180.
Quelques essais servent aussi les versions construites, le temps de
l'essai, sur un port libre ou sur le 4410 (`lot4/verif/migration`). Il ne
faut donc pas travailler sur le dépôt pendant un passage. `test46-lecteur` est
lancé dans un fuseau horaire où il est midi (ses séances « aujourd'hui » et
« hier » ne dépendent pas de l'heure du passage).

## Lire le résultat

À la fin de chaque partie, `essais/navigateur/sorties/RESUME.txt` donne une
ligne par essai, pour les deux parties (le dernier passage de chacune) :

```
partie1/lot2_M1-prise.mjs : exit 0 ; échecs : 0
```

La partie se termine en affichant `partie N finie : X lignes vertes sur Y`,
suivi des lignes qui ne sont pas vertes. La sortie complète de chaque essai
est dans `sorties/partie1/` ou `sorties/partie2/` (`<chemin de l'essai, avec
des _>.out`).

Trois essais qui mesurent des temps (`test46-lecteur`, `test47-casse-lecteur`,
`instruments/e2e`) sont rejoués une fois quand ils échouent : le premier
passage reste à côté (`.premier-passage`) et le résumé le dit. Un défaut
véritable échoue deux fois.

Un essai se relance seul depuis `essais/navigateur` (le serveur de
développement doit tourner sur 5173) : `node lot2/M1-prise.mjs`. Les sondes
des vérifications se lancent depuis leur dossier (`cd lot3/verif/conformite
&& node aria.mjs`), comme le fait `tout.sh`.

## Prérequis

- Node.js 20 ou plus récent, `npm install` fait (les essais n'ajoutent
  aucune dépendance au dépôt), `python3`, `curl`, `lsof`, `unzip`, les
  outils de poppler (`pdfinfo`, `pdfimages`, `pdftoppm`) ; pour les essais
  du « vrai Chrome » (`lot4/CF1-vrai-chrome`, `lot4/cf/ecran.mjs`) : `Xvfb`,
  ImageMagick (`import`, `convert`) et les bibliothèques X11/XTest.
- Playwright **et** son Chromium déjà installés. Playwright n'est pas une
  dépendance du dépôt : `commun/playwright.mjs` le cherche, dans l'ordre,
  1. par `import('playwright')` (installé là où Node le trouve depuis le
     dépôt, par exemple `npm install --no-save playwright`) ;
  2. dans la variable d'environnement `PLAYWRIGHT_MODULE`, le chemin du
     fichier d'entrée du paquet, par exemple
     `PLAYWRIGHT_MODULE=/usr/lib/node_modules/playwright/index.mjs` ;
  3. en dernier recours, `/opt/node22/lib/node_modules/playwright/index.mjs`
     (là où le met l'environnement des sessions en ligne).

  La batterie ne lance jamais `playwright install` : le navigateur doit être
  là (dans les sessions en ligne, il l'est).

  Le Chromium 153 livré avec Playwright 1.63 tombe (le navigateur entier,
  « Target page, context or browser has been closed ») quand une poignée de
  fichier rangée dans IndexedDB est relue dans un contexte éphémère, celui de
  `browser.newContext()`. Les essais qui simulent la clé USB (C4, C9, C10,
  CF1, corrections-*, lot7/E1, `lot4/verif/sauvegardes/t1 t2 t10 t11 t13`,
  `bandeau`, `bandeau-biblio`, `drive-cle-retour`) lancent donc leur
  navigateur par `lancerPersistant()` (`commun/playwright.mjs`) : un profil
  temporaire par contexte, effacé à la fermeture ; les aides `lancer()` des
  sondes prennent `{ persistant: true }`. L'outil n'est pas en cause : en
  classe, Chrome travaille dans un profil, où la poignée se relit.
  `node commun/sonde-contexte-ephemere.mjs` dit en quelques secondes si le
  contournement est encore nécessaire (sortie 3) ou peut être retiré (0).

## Quand la lancer

Pour les gros lots (un lot entier, une refonte, avant une version), pas pour
une petite retouche : `npm test`, `npx tsc --noEmit -p .` et les deux
constructions suffisent alors, avec, au besoin, l'essai du lot qui touche à
ce qu'on a changé, lancé seul.

Quand un comportement change volontairement, l'essai qui vérifiait l'ancien
doit être adapté dans le même lot (c'est noté dans l'essai, avec la raison).

## Ce qui a été laissé de côté en la rangeant ici

La batterie a d'abord vécu hors du dépôt. En la rangeant ici, les essais qui
comparaient l'outil à une version d'avant reconstruite à la volée ont été
retirés ou remplacés par une référence figée. Ce qui reste vérifie l'outil
tel qu'il est.

- Retirés : les essais de migration du lot 4 qui remplissaient la version
  d'avant avant d'en reprendre les données (`lot4/verif/migration/m1` à
  `m7`, `m9`, `m10`, `m11`, `m13`, `m15`), `lot4/verif/conformite/
  cle-avant-apres`, les mesures comparées à la version d'avant
  (`lot4/verif/regressions/captures`, `demarrage-60`, `mises-par-trait`,
  `trait-cout`), `lot5/verif/conformite/t14-ancien-tel`, `t21-memc-avant`,
  `lot5/cf/aller-retour`, et les essais vitest de compatibilité (lots 3, 4
  et 5) et différentiels (ancienne et nouvelle version tirées au hasard).
- Adaptés (la partie qui passait par la version d'avant est retirée, le
  reste est gardé) : `lot4/C1-fondation`, `C2-classeur`, `C4-cle`,
  `C8-corbeille`, `C9-fichiers`, `lot5/K1-modele`, `K2-ordre`,
  `K5-transformer`, `K7-gomme`, `K8-fonds`, `lot5/verif/donnees/d3`, `d2`
  et `d4` (vitest), `lot5/verif/conformite/t3-barre`,
  `lot5/verif/appareils/sonde-menu-fichier`, `lot3/P4-apercus` (sans la
  comparaison au pixel avec des captures de l'écran d'avant le morceau).
- Remplacés par une référence figée, petite, versionnée à côté de l'essai :
  `lot3/verif/donnees/ancien-*.memc` (deux classeurs écrits par la version
  d'avant le lot 3, que relit `anciens-memc.mjs`),
  `lot5/verif/regressions/vt/fonds-reference.json` (l'empreinte des appels
  au canevas des fonds d'avant le lot 5), `lot5/corrections-regressions/vt/
  gomme-reference.ts` (la coupe de la gomme avant son optimisation),
  `lot5/verif/regressions/vt/rendu-reference.json` (l'empreinte des appels
  du rendu d'une page sans rien du lot 5), `lot5/K10-telephone/
  reference-barres.json` (la géométrie des barres relevée avant le morceau
  K10 ; refaite avec `releverBarres` de `lot5/lib/geometrie-barres.mjs` aux
  gains rapides du lot 16, où les barres changent voulument : elle était
  déjà périmée depuis le bouton Texte du lot 12).
- Fabriqués au passage au lieu d'être versionnés (des images, un gros
  fichier) : le `.memc` de 53 Mo de `lot1/donnees/abime` (40 images de
  bruit, enregistrées par l'outil), la feuille JPEG de `lot3/P7/vt` (une page
  blanche rendue par `pdftoppm`), la photo d'essai de `lot3/verif/sorties`
  (une illustration en dégradés dessinée dans le navigateur, à la place de
  deux images d'une bibliothèque de tiers). Tout cela va dans `sorties/` ou
  dans des dossiers ignorés par git (voir `.gitignore`).

Les vérifications « aucun texte ne dit … » qui cherchaient l'ancien nom de
l'outil cherchent maintenant « undefined », « NaN » et « [object Object] »
dans les mêmes textes.
