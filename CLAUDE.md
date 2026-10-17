# MEM teachingtool — consignes de travail

Ce fichier est lu au début de chaque conversation sur ce dépôt. Il dit ce
qu'est l'outil, ce qu'il ne faut jamais faire, et comment travailler.

## L'outil

- Tableau blanc de maths, utilisé **seul par le professeur**, en classe.
  Aucun élève ne s'y connecte : les élèves ne reçoivent que des replays.
- Deux versions, construites depuis le même code :
  - **en ligne** (GitHub Pages), https://mathsetmoi.github.io/mem_teachingtoolV2/ ;
  - **hors ligne** : un seul fichier `dist/index.html`, ouvert en `file://`,
    sans internet (pas de connexion Google : ni Publier, ni copie sur le Drive).
  Toujours dire « version en ligne » et « version hors ligne ».
- Matériel en classe : souris, clavier, **tablette graphique Wacom sans
  écran** (pointeur « pen » indirect, survol, bouton latéral = clic droit,
  aucun écran tactile). Aussi : iPad, TNI, téléphone.
- Le seul nom de l'outil est **« MEM teachingtool »**.
- Le README décrit tout en détail, lot par lot : lis-le, et lis le code,
  plutôt que de supposer.

## Règles absolues

1. **Ne toucher à aucun autre dépôt** que `mathsetmoi/mem_teachingtoolV2`.
2. **Aucun autre nom** que « MEM teachingtool » dans le code, les textes,
   le README, les essais et les messages de version. Ne jamais parler d'une
   origine du projet ni d'un autre outil. Pour ce qui se passe pendant le
   cours, écrire « à l’écran » ou « en classe ».
3. **Aucun élève connecté**, aucun partage en direct, aucun serveur de
   synchronisation.
4. **Ne jamais changer les noms des bases IndexedDB** (`mem-tableau-local`,
   `mem-teachingtool-classeur-…`, `mem-teachingtool-bibliotheque`) **ni les
   clés de stockage existantes** : le professeur perdrait ses classeurs.
5. Les formats de fichier gardent leur compatibilité : `.memc` (un
   classeur), `.memb` (toute la bibliothèque), `.mem` (le replay d'une
   séance). Un champ nouveau doit être facultatif.
6. Le dépôt est **public** : aucune donnée personnelle, aucune adresse
   e-mail réelle, aucun secret. Dans les essais, des adresses d'exemple
   (`@example.com`).
7. **Ne jamais modifier ni supprimer les versions déjà enregistrées** sur
   `main` (ni force-push, ni rebase de ce qui est publié) : toute
   modification s'ajoute à la suite. Seul le professeur peut demander le
   contraire.

## Les choix du professeur (à respecter)

- Par défaut : trait **« Fin »**, toute nouvelle page en **page blanche**,
  zoom **toujours à 100 %** quand on ouvre un classeur ou qu'on change de
  page, à l'endroit où l'on était.
- Une image importée passe à l'outil **Sélection** (cadre, coins, pastille ↻).
- Rangement : **dossier = la classe**, **classeur = le chapitre**, et dans
  chaque classeur des **séances** explicites, chacune avec ses pages
  numérotées à partir de 1 (lot 6).
  - Fenêtre « Bonjour ! » au lancement si la dernière séance date de plus
    d'une heure ; séances passées en lecture seule ; « Reprendre la page »
    copie une page dans la séance du jour.
  - Publier envoie la séance avec exactement ses pages ; le `.mem` va dans
    le Drive du professeur (« MEM - Replay séances » ou « LFB - Replay
    séances »).
- Sauvegardes : navigateur, un fichier sur une clé ou dans un dossier
  (enregistrement automatique), copie
  privée sur le Drive (« MEM - Sauvegardes » / « LFB - Sauvegardes »).

## Méthode de travail

- **Petite modification** : faire la modification, `npx tsc --noEmit -p .`,
  `npm test`, un essai ciblé dans le navigateur, puis demande de fusion,
  fusion et vérification de la mise en ligne. **Ne pas lancer la grande
  batterie.**
- **Gros lot** : découper en morceaux, essais rapides à chaque morceau, puis
  **une seule fois** la batterie complète avant la mise en ligne :
  `npm run essais:navigateur:1` puis `npm run essais:navigateur:2`
  (environ 1 h 40 et 1 h ; voir `essais/navigateur/README.md`).
- Avant d'envoyer : `npm run build` et `npm run build:pages` doivent passer.
- Quand un comportement change volontairement, adapter l'essai qui
  vérifiait l'ancien, dans le même lot, en le disant.
- La mise en ligne se fait toute seule à chaque envoi sur `main`
  (`.github/workflows/pages.yml`) : vérifier qu'elle a réussi avant
  d'annoncer que c'est en ligne.
- Une conversation = une modification ou un lot.

## Style

- Code et commentaires **en français**, commentaires en prose, comme le
  reste du dépôt.
- Textes de l'interface : français clair, sans jargon, phrases courtes.
- Messages de version : courts, en français, qui disent ce qui change pour
  le professeur.

## Parler au professeur

- En français, simplement, sans jargon technique.
- Proposer des choix concrets (avec une recommandation) quand une décision
  lui revient ; des maquettes quand c'est visuel.
- Le prévenir quand c'est en ligne, et lui dire ce qui change pour lui.
