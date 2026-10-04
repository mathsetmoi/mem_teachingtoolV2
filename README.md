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
instant la fait apparaître tout de suite, stylo encore posé ; c'est aussi ainsi
qu'on obtient un segment (sans cela, chaque « 1 » ou « − » écrit au tableau
deviendrait un segment). `Ctrl+Z` rend le tracé d'origine.

Un tracé arrondi devient un cercle, même bosselé ou un peu ovale : il ne
devient un polygone que si tous ses coins sont francs. Un côté presque
horizontal ou vertical (à 12° près) le devient.
Les tracés trop petits (l'écriture) ne sont jamais touchés, et le bouton
« reconnaissance » de la barre du haut coupe tout.

**Avec l'outil Formes** (`R` rectangle, Maj pour un carré ; `C` cercle ; `G`
polygone, sommet par sommet, en revenant au premier pour fermer).

**Le panneau d'options** s'ouvre sur la figure qu'on vient de tracer, ou sur
tout objet choisi avec l'outil de sélection :

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

Le clic droit ailleurs sur une figure la sélectionne et ouvre son panneau.
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
- **Compas** : la pointe le déplace ; la mine l'écarte, au millimètre ou
  exactement jusqu'à un point de la figure (report de longueur) ; la tête ↻ le
  fait tourner et trace l'arc, un cercle entier si l'on fait le tour.

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

Compris : placer des points ; segment [AB] de 5 cm ; cercle de centre O de
rayon 3 cm (ou passant par A) ; médiatrice et milieu de [AB] ; triangle ABC par
ses trois côtés ; triangle équilatéral ; carré, rectangle ; perpendiculaire et
parallèle à (AB) passant par C ; angle BAC de 50° (rapporteur) ; bissectrice ;
hexagone régulier. Les points déjà nommés sur la page servent. Une phrase non
comprise est dite, pas devinée, avec une phrase modèle à recopier.

Les tournures d'un énoncé passent : « segment AB de longueur 6 cm », « le
segment [AB] mesurant 6cm », « tel que AB = 6 cm », « 6 cm de long », « de 4 cm
de côté », « de 2,5 cm de rayon », « la perpendiculaire à la droite (AB) passant
par le point C », « la médiatrice du segment AB », « 50 degrés »… Les crochets
et parenthèses sont facultatifs ; les majuscules désignent les points.

## Rejouer le tableau

Le bouton ▶ de la barre du haut rejoue la construction, geste par geste, au
rythme où elle a été faite (une rafale reste visible, une longue pause est
écourtée). Les traits se redessinent sous les yeux. Vitesse de ×0,05 à ×8 ;
Espace, ← →, Origine, Fin ; Échap pour fermer. Le lecteur n'écrit rien :
le tableau revient tel quel. Le film est gardé avec le tableau.

Pour cela, le document Yjs garde ce qui a été effacé (`gc: false`) et note un
instantané à chaque geste (`film`) : rejouer, c'est reconstruire le document à
chacun de ces instants.

## Partage avec les élèves (mis de côté)

Le code est toujours là (`src/document.ts`, `serveur/`), mais l'outil ne le
propose plus : `PARTAGE_ELEVES = false` dans `src/main.ts`. Le passer à `true`
rend le bouton « Partager » et le mode élève décrits plus bas.

## Ce que fait la v0.1

Côté prof : stylo sensible à la pression, surligneur, gomme, segments (Maj pour
les angles de 15°, aimant au quadrillage), formules LaTeX avec aperçu et
raccourcis, sélection et déplacement, annuler/rétablir, pages, fonds (blanc,
petits carreaux, Seyès, repère gradué), zoom de 10 % à 2000 %.

Côté élève : le lien du prof, un prénom, et l'élève suit la page et le cadrage du
prof. S'il se déplace lui-même, un bouton le ramène. Le prof décide si les élèves
peuvent écrire ; leurs traits apparaissent en direct, avec leur prénom au curseur.

Au pavé tactile : deux doigts qui glissent déplacent le tableau, pincer zoome ;
la molette d'une souris zoome. **Échap** annule ce qui est en cours (menu,
sélection, polygone) ; s'il n'y a rien, il passe à l'outil Sélection, et un
second Échap rend l'outil d'avant. Avec la Sélection, glisser un objet le
déplace, glisser dans le vide déplace le tableau, Maj + glisser encadre ; l'objet
survolé s'éclaire avant le clic ; les flèches poussent la sélection d'1 mm
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
| `src/lecteur.ts` | Le lecteur qui rejoue la construction |
| `src/instruments.ts` | Règle, équerre, rapporteur, compas |
| `src/construction.ts` | Programme de construction → étapes et gestes |
| `src/constructeur.ts` | Joue les étapes, avec ou sans instruments |
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
8. Lecteur : export vidéo, et alléger les très longs films (le document ne
   jette plus rien).
