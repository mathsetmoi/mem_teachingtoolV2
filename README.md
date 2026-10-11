# MEM teachingtool — v0.1

Un tableau blanc pour les cours de maths, utilisé par le professeur en classe :
il marche hors connexion sur le poste de la salle, et tout ce qui y est écrit
s'enregistre dans le navigateur ; le tableau entier se garde aussi dans un
fichier (`.memc`), sur une clé ou ailleurs. Le professeur peut publier le
replay d'une séance, que les élèves revoient chez eux.

## Lancer en local

Il faut Node.js 20 ou plus récent.

```bash
npm install
npm run dev          # l'outil (http://localhost:5173)
```

Version hors ligne en un seul fichier (clé USB) :

```bash
npm run build        # → dist/index.html, autonome
```

La police d'écriture (Atkinson Hyperlegible) vient de Google Fonts, sans
jamais retenir le démarrage : sa feuille se charge à côté (`media="print"`,
puis « all » à son arrivée, voir `index.html`). Hors connexion, ou derrière
un proxy d'établissement qui retient les requêtes sans jamais répondre,
l'outil s'ouvre aussitôt avec la police du système, en ligne comme en un
seul fichier ; quand la police arrive, la barre du haut se règle de nouveau
et le tableau se repeint avec elle. (Avant le contrôle final du lot 3, une
feuille de police qui ne répondait jamais empêchait l'outil de s'afficher.)

## Figures géométriques

**Au stylo.** Une figure fermée tracée à main levée se redresse au lever du
stylo : carré, rectangle, losange, parallélogramme, triangle (équilatéral,
isocèle, rectangle), polygone régulier, cercle. Garder le stylo immobile un
instant (la plume ne s'éloigne pas d'un pixel et demi de l'endroit où elle
s'est arrêtée, quelle que soit la fréquence du stylet : une plume lente qui
avance n'est jamais coupée) la fait apparaître tout de suite, stylo encore
posé ; c'est aussi ainsi qu'on obtient un segment (sans cela, chaque « 1 » ou
« − » écrit à l’écran deviendrait un segment). `Ctrl+Z` rend le tracé
d'origine.

Un tracé arrondi devient un cercle, même bosselé ou un peu ovale : il ne
devient un polygone que si tous ses coins sont francs. Un côté presque
horizontal ou vertical (à 12° près) le devient.
Les tracés trop petits (l'écriture) ne sont jamais touchés, et le bouton
« reconnaissance » de la barre du haut coupe tout.

**Avec l'outil Formes** (`R` rectangle, Maj pour un carré ; `C` cercle ; `G`
polygone, sommet par sommet, en revenant au premier pour fermer).

Une figure qu'on vient de tracer (au stylo, aux Formes, au Segment) n'est pas
sélectionnée : on continue d'écrire tout près sans attraper ses sommets. Une
copie, une image importée, l'image d'une transformation le sont.

**Prendre un objet.** Avec l'outil Sélection, un objet se prend sur son tracé,
à 6 px près à la souris, 10 au stylet, 20 au doigt (des pixels d'écran, quel
que soit le zoom). Une figure fermée sans fond (triangle, rectangle, polygone,
cercle entier ; pas un arc, ni une ligne ouverte, ni un tracé à main levée
refermé) se prend aussi par l'intérieur, mais le tracé le plus proche passe
avant elle : un trait écrit dans un grand cadre se prend avant le cadre, et
entre deux intérieurs, le plus petit l'emporte (un triangle tracé dans un
grand rectangle, même colorié, se prend par son milieu). Une image, une
formule, une figure coloriée se prennent partout où elles sont et cachent ce
qui est dessous ; ce qu'on a écrit par-dessus (un soulignement) se prend avant
elles. Vu de très près, l'intérieur d'une figure qui déborde tout l'écran ne
prend rien. Sous un autre outil que la Sélection, le doigt qui « déplace »
prend de même d'un simple toucher, mais n'emporte un objet sélectionné que
s'il le saisit à 10 px de son tracé (ou par une image, une formule, une figure
coloriée) : parti du milieu d'un grand cadre, il déplace la vue. Jamais sous
le Stylo : écrire dans un triangle ne le prend pas, et un clic droit dans son
vide ne le vise pas (il ouvre le menu de la page, comme à côté).

**Saisir ou entourer.** À l'outil Sélection, un appui tout près du tracé d'un
objet (6 px à la souris et au stylet, 10 au doigt), sur un morceau, sur une
image, une formule ou une figure coloriée, le **saisit** : glissé, il
l'emporte. Plus loin, mais dans la portée, un clic le prend, et un glisser
**entoure** : on entoure un mot écrit à la main en partant à 15 px de lui,
sans en emporter une lettre. Dans le vide d'une grande figure fermée sans fond
qui n'est pas sélectionnée, de même : un clic prend la figure, un glisser
entoure ce qu'on a écrit dedans (comme tldraw et Excalidraw ; la figure n'est
prise que si elle est elle-même à plus de moitié dans la zone). Sélectionnée,
elle se glisse depuis son milieu. Une image, une formule, une figure coloriée
se glissent toujours : pour entourer ce qu'on a écrit sur un énoncé importé,
on part d'à côté. Au survol de la souris ou de la tablette graphique, le
curseur le dit : la flèche en croix saisit, la main prend ou entoure, la
croix est dans le vide.

**La barre d'actions.** Dès qu'on prend quelque chose avec l'outil
Sélection (un clic, Maj + clic, un cadre, un lasso, Ctrl + A, ce qu'on vient
de coller ou de dupliquer), ou d'un toucher du doigt qui « déplace », une
petite barre paraît tout de suite juste au-dessus, sans le cacher : *Dupliquer*,
*Copier*, *Supprimer* et *Options* (le menu complet), avec *Modifier* en tête
pour une formule seule. Au doigt et au stylet posé sur l'écran (l'Apple
Pencil d'un iPad sans clavier) s'ajoute *Ajouter* : allumé, chaque objet
touché entre dans la sélection ou en sort (le Maj + clic d'une tablette, qui
n'a pas de touche Maj), et un toucher dans le vide l'éteint. Des boutons de
52 px, leur nom dessous ; l'infobulle donne le raccourci (Ctrl + D, Ctrl + C,
Suppr ; pour *Options*, le clic droit à la souris, le bouton du stylet à la
tablette graphique, l'appui long au stylet posé sur l'écran). Elle se pose
à 10 px de l'objet, à 30 px au doigt : un doigt n'est pas un point, et
celui qui retouche l'objet un peu haut (le second toucher d'un double appui)
ne doit pas toucher *Supprimer*. Un appui qui n'est pas pour elle passe au
tableau, comme si elle n'était pas là : un doigt dont le point tombe à côté
d'elle (le navigateur donne l'appui au bouton que la zone de contact du doigt
effleure). Un doigt qui la touche moins de 300 ms après qu'elle a paru (le
second toucher d'un double appui, ou un toucher trop rapide pour l'avoir vue)
ne déclenche aucun de ses boutons : s'il y a un objet sous le doigt (un trait,
une formule, une image), c'est lui qu'il prend ; sinon il ne fait rien, et ce
qui est pris le reste (*Options* touché juste après un lasso ne perd plus ce
qu'on vient d'entourer : le toucher suivant l'ouvre). Elle se pose
dessous quand il n'y a pas la place sous la barre du haut, en haut de l'écran pour un objet plus grand que lui, toujours dans
l'écran, jamais sur la barre d'outils (sauf sur un téléphone, où elle n'y
tiendrait pas). Elle suit la vue et l'objet (zoom, molette, flèches) ; elle
se cache pendant qu'on glisse l'objet, qu'on tire un cadre ou un lasso, qu'on
pince à deux doigts, et revient au lâcher ; elle s'efface quand l'objet sort
de la vue. Elle ne paraît **jamais sous le Stylo** (ni sous un autre outil de
dessin) à la souris ou au stylet : une copie, une image importée, l'image
d'une transformation restent sélectionnées sans barre, et ce qu'on vient
d'écrire n'est jamais sélectionné ; au doigt qui déplace, elle ne prend
jamais le stylet (sur l'iPad, le crayon posé dessus écrit son trait, comme si
elle n'était pas là). Un clic droit, un double-clic ou un appui long ouvrent
directement le menu complet, qui contient tout : la barre lui laisse la place, comme au menu
d'un morceau, à un petit menu (celui de la page, au clic droit dans le vide,
celui du zoom… : un seul menu à la fois ; elle revient quand il se ferme), à
la revue, à une séance d'automatismes, à l'éditeur d'une formule, à une
fenêtre ouverte. Discrète au vidéoprojecteur : le gris des
barres, des libellés gris, aucune couleur.

**Le menu complet** de ce qu'on a pris s'ouvre à la demande, de la même façon
partout : *Options* dans la barre d'actions ; **clic droit** sur l'objet (au
stylet, le bouton du stylet ; sur Mac, Ctrl + clic aussi) ou **double-clic**
(un simple clic le sélectionne seulement, pour le déplacer) ; **appui long**
au doigt et au stylet posé sur l'écran (voir plus bas) ; au doigt, avec
l'outil Sélection ou le doigt qui « déplace », **deux touchers** rapprochés
aussi (moins d'un tiers de seconde, à moins de 35 px, sur le même objet), même
sur iPad où Safari ne donne pas de double-clic au doigt (un toucher suivi d'un
glisser déplace toujours). La première fois qu'on prend un objet, un message
le rappelle dans les mots du pointeur : « Double-clic ou clic droit » à la
souris, « Double-clic ou bouton du stylet » à la tablette graphique, « Appui
long ou double-clic » au stylet posé sur l'écran, « Appui long » au doigt
(jamais « clic » au doigt). Au Stylo aussi, un double-clic sur une figure ou
une formule ouvre son menu (ou l'éditeur de la formule), sans y laisser de
point : le point d'un simple toucher sur un objet ne s'écrit qu'un tiers de
seconde plus tard, quand on sait qu'aucun second toucher ne suit (le film
garde l'heure où il a été écrit). Ce double-clic est serré comme celui du
système : le second toucher retombe à moins de 4 px à la souris, 5 au stylet,
14 au doigt, et se lève vite sans avoir glissé. Deux points qu'on écrit tout
près (un « : », un tréma, sur une figure coloriée ou une formule) restent deux
points.

**L'appui long** : un appui tenu une demi-seconde sans glisser (sans bouger de
plus de 8 px au doigt, 6 au stylet) ouvre le menu complet de ce qui est
dessous, ou le menu de la page dans le vide, comme un clic droit ; une petite
vibration le dit là où l'appareil en a une. Il n'existe qu'où l'on prend les
objets : au doigt, avec l'outil Sélection (quel que soit le rôle du doigt) et
au doigt qui « déplace », sous n'importe quel outil (la Main comprise) ; au
stylet posé sur l'écran lui-même (iPad, Surface, tablette Android), avec
l'outil Sélection. **Jamais pendant qu'on écrit** : au Stylo et au Surligneur,
un point qu'on tient ou une lettre qu'on commence restent de l'encre ; au
doigt qui dessine non plus. La tablette graphique de la classe n'en a pas :
elle a son bouton (le clic droit), et un stylet qui marque un temps sur un
objet avant de le glisser le déplace sans ouvrir de menu ; la souris a son
clic droit. Le lever de l'appui long ne fait rien d'autre (il ne désélectionne
pas, ne prend rien, ne trace pas de lasso). Sur **iPad**, l'Apple Pencil n'a
ni bouton ni bout gomme que le navigateur voie : son menu vient de l'appui
long à l'outil Sélection, d'*Options* dans la barre d'actions, du
double-clic ; ou du doigt, qui « déplace » dès que le crayon a touché l'écran
(réglage *Auto*) et dont l'appui long ouvre le menu sous n'importe quel
outil, Stylo compris. Sur iPad, un appui long ne fait paraître ni la loupe ni la bulle du
système.

Le menu s'ouvre à l'**appui** du bouton droit (ou du bouton du stylet), jamais
sur le « menu contextuel » que le navigateur envoie ensuite : sous Windows
Ink, le stylet d'une tablette graphique tenu immobile une seconde (une
hésitation, une figure qu'on fait reconnaître) envoie un clic droit au lever
du trait, qui ouvrirait un menu en plein cours. Android, la Surface et Windows
tactile en envoient un aussi à l'appui long du doigt : il n'ouvre rien, c'est
l'appui long de MEM qui ouvre le menu (jamais deux menus). Un bouton pressé
pendant un trait ou un glisser n'ouvre rien. La **touche Menu** du clavier (ou
Maj + F10) ouvre le menu complet de ce qui est sélectionné (le menu commun de
plusieurs objets), sinon le menu de la page au milieu de ce qu'on voit, le
focus sur sa première entrée ; jamais le menu du navigateur par-dessus. Dans
un champ de saisie, elle garde le menu du navigateur (coller un texte).
Rien ne s'ouvre sur un instrument posé : il recouvre ce qui est dessous.
Le menu se pose au-dessus de ce qu'il règle (dessous s'il n'y a pas la place),
et se ferme quand on choisit autre chose ou qu'on appuie ailleurs (il se cache
pendant qu'on déplace l'objet lui-même, et revient au lâcher). Il porte le nom
de ce qu'il règle, que dit un lecteur d'écran : « Options du trait », « de
l'image », « du segment » (de la droite, de la demi-droite), « du point »,
« de la ligne brisée », « du cercle », « de l'arc », « de la figure » pour un
polygone fermé, « de la formule », « des 3 objets ». Celui d'une
figure, d'un trait ou d'une image :

- *Sommets* : points et noms (A, B, C… libres sur la page), modifiables ;
- *Codage* : côtés de même longueur et angles droits, calculés ;
- *Contour* : couleur, épaisseur, pointillés ;
- *Fond* : remplissage en transparence ;
- *Transformer* : symétrie axiale (par un côté, une verticale, un axe du
  repère), symétrie centrale, rotation, translation (par un vecteur entre deux
  sommets ou en coordonnées), homothétie. L'image est une nouvelle figure, aux
  sommets nommés A', B', C'… ;
- *Main levée*, *Dupliquer*, *Copier*, puis **⋯** (*Plus*), dont le petit
  menu a *Copier en image* (voir « Copier en image ») et *Envoyer vers…* (une
  autre page, voir « Envoyer vers une autre page »), enfin supprimer.

La rangée de ces onglets tient sur une ligne au-dessus de la figure (le menu
d'un rectangle fait 770 px de large, 54 px de haut) : c'est pourquoi ce qui
sort de la page (une image, une autre page) est rangé derrière ⋯, qu'on ouvre
d'un clic, d'un toucher, au stylet ou au clavier (Entrée, puis ↓ ; Échap
referme ce petit menu seul et rend le focus à ⋯). Le menu complet se pose
au-dessus de ce qu'il règle ; s'il n'y tient pas, en dessous ; sinon à côté (à
droite, puis à gauche) ; jamais sur la figure ni ses poignées quand il a la
place ailleurs (sinon, là où il en couvre le moins). Pendant *Désigner* ou
*Tracer* (un axe, un centre), il reste ouvert, et la consigne (« Clique sur la
droite qui sert d'axe. ») passe au-dessus de lui.

**Une formule** se modifie au double-clic (comme un texte, partout) ; son clic
droit ouvre son menu : *Modifier* (son infobulle rappelle le double-clic, sauf
au doigt), *Couleur et taille* (les quatre couleurs ;
Petite, Normale, Grande), *Dupliquer*, *Copier*, ⋯ (*Copier en image*,
*Envoyer vers…*), supprimer. Pas de
*Transformer* : l'image d'une formule n'en déplacerait que le coin.

**Plusieurs objets** sélectionnés (Maj + clic, un cadre, un lasso, Ctrl + A) :
un clic droit ou un double-clic sur l'un d'eux, même près d'un sommet, ouvre
leur menu commun, et la sélection reste entière. « 3 objets », puis *Couleur,
épaisseur* (les quatre couleurs pour tout sauf les images ; les trois
épaisseurs pour les traits et les figures, un trait de surligneur gardant sa
largeur de surligneur ; les pointillés s'il y a une figure ; un choix est
marqué quand tous l'ont déjà), *Dupliquer*, *Copier*, *Couper*, ⋯ (*Copier
en image*, *Envoyer vers…*), supprimer.
Seulement ce qui vaut pour chacun : ni les sommets, ni le fond, ni les
transformations. Chaque choix fait une seule étape : un Ctrl+Z rend leur
couleur aux dix objets d'un coup. Le menu se pose au-dessus de toute la
sélection ; Maj + clic sur l'un d'eux l'en retire, et le menu se ferme quand
il ne reste qu'un objet.

**Dans le vide**, le clic droit (ou l'appui long) ouvre le menu de la page,
au point visé :
*Coller ici* (le dernier objet copié, posé là ; grisé quand il n'y a rien à
coller), *Tout sélectionner* (Ctrl + A), *Tout voir* (Maj + 1), puis, après un
filet, ce qui touche la page elle-même : *Dupliquer la page* (Ctrl + Maj + D,
voir « Changer de page »), *Toutes les pages…* (Maj + P, voir « Les pages ») ;
puis, après un second filet, ce qui en sort : *Copier la page en image* (voir
« Copier en image »), *Exporter la page en PDF…* (Ctrl + P, voir « Exporter
en PDF »), toutes deux grisées sur une page vide. Il se ferme
comme les autres menus : Échap, un choix, ou un appui ailleurs, qui ne laisse
pas d'encre.

**Au clavier**, un menu ouvert prend les touches, comme le menu du système,
même si le focus n'y est pas (après un clic droit, il reste sur la page) :
↓ ou Début mènent à sa première entrée, ↑ ou Fin à la dernière, Tab et
Maj + Tab aussi depuis la page ; dedans, les flèches passent d'une entrée à
l'autre, Entrée ou Espace la choisissent, Échap le ferme. Tant qu'il est
ouvert, les flèches ne font plus défiler le tableau derrière lui, et celles
du menu complet (ou du menu d'un sommet) ne poussent plus l'objet : ← et →
y vont aussi d'un bouton à l'autre (Tab atteint ses champs, où les flèches
gardent leur rôle). Un choix qui refait le menu (une
couleur, une section qui s'ouvre) y laisse le focus. *Options* de la barre
d'actions, pressé au clavier, met le focus dans le menu complet, comme la
touche Menu (ou Maj + F10) qui l'ouvre.

Le premier appui sur le tableau hors d'un menu ouvert (le menu complet, celui
de la page, du zoom ou d'un point, la liste des instruments) le ferme, et ne fait rien
d'autre : ni point d'encre, ni coup de gomme. Au Stylo, le trait commence quand
même (on ne perd pas la première lettre de ce qu'on écrit), mais un simple
appui ne laisse rien ; sur un instrument, ou à l'outil Sélection sur un autre
objet, l'appui le prend directement.

Les transformations et le contour valent aussi pour un tracé à main levée.

Dans *Transformer*, les listes ne gardent que ce qui est à l’écran : les
droites tracées sur la page et les côtés de la figure (axes), son centre, ses
sommets et les points nommés de la page (centres), le repère s'il y en a un.
**Désigner** fait cliquer l'axe ou le centre directement sur le tableau (ce qui
est visé s'éclaire) ; **Tracer** le crée tout de suite (deux clics pour un axe,
un clic pour un centre). **Pas à pas** construit l'image comme à l’écran,
avec ou sans les instruments : pour chaque sommet, l'équerre et le compas
(symétrie axiale), la règle et le compas (symétrie centrale), le rapporteur et
le compas (rotation)… puis la figure image se trace à la règle. Une image
importée se construit par ses quatre coins.

**Chaque morceau se prend à la main.** Sur la figure sélectionnée, avec
l'outil Sélection (ou au doigt qui « déplace », voir plus bas), on attrape un
sommet ou une extrémité, le centre ou le rayon d'un cercle, le nom d'un point ;
jamais sous un outil de dessin (écrire près d'un sommet laisse la figure
intacte). Un premier clic sur un morceau d'une figure non sélectionnée (un
sommet, le centre d'un cercle, le nom d'un point) prend la figure entière, et
la déplace si l'on glisse ; le suivant prend ce morceau. Le clic droit, lui,
vise directement le morceau de n'importe quelle figure. Le menu d'un morceau
reste collé à lui quand on zoome ou qu'on déplace la vue :

- **glisser** le déplace (le codage se recalcule ; un nom tourne autour de son
  point sans s'en éloigner, et garde sa place quand on transforme la figure) ;
- **cliquer sans bouger, ou clic droit**, ouvre ses options :
  - un point : son nom, sa marque (aucune, point, croix ×, croix +, rond), le
    bout d'une extrémité (flèche, trait, crochet), sa couleur, sa taille ;
  - un nom : son texte, sa couleur, sa taille, italique ou droit, le replacer
    automatiquement, le masquer ;
  - le rayon d'un cercle : sa valeur en centimètres.

Le clic droit ailleurs sur une figure (ou un double-clic) la sélectionne et ouvre son menu.
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
Le rapporteur est un demi-disque : **son bord du bas est la ligne 0°–180°**,
la seule, et son centre (le petit trait ⊥) est au milieu de ce bord ; rien ne
dépasse dessous. Les chiffres 0 et 180 sont couchés le long du bord, juste
au-dessus de lui. On le prend par le demi-disque ; le stylo posé contre son
bord trace le long du bord, comme le long d'une règle.

- **Déplacer** : on prend le corps. L'origine (le zéro de la règle, le coin de
  l'équerre, le centre du rapporteur, la pointe du compas) s'accroche aux
  points de la figure, puisque c'est de là qu'on mesure.
- **Tourner** : la pastille ↻, autour de l'origine, au degré près, aimantée
  tous les 15°. L'angle s'affiche. Même à petit zoom, le stylo posé sur la
  pastille tourne l'instrument (il ne trace pas le long du bord voisin).
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
- **Au replay**, les instruments font ce qu'ils ont fait en classe : ils
  paraissent, glissent, tournent, s'ouvrent, au rythme réel, et s'en vont
  quand on les range, même après le dernier geste d'une page ; le compas
  tourne pendant que l'arc pousse sous sa mine, le crayon avance le long de
  la règle, et l'arc ou le trait reste à l'écran jusqu'à ce que la figure le
  remplace (voir « Les instruments au replay », plus bas). Ce qui a été
  construit au programme de construction avec les instruments se rejoue de
  même.

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
compte de ce qui est déjà à l’écran.

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
remplace d'un coup, comme à l’écran (sur un tableau d'avant le rythme de la
main, seule la figure se dessine). Supprimer une page, ou la rendre
(« Annuler », Ctrl+Z), n'est un geste nulle part : ni pour la page où l'on
arrive, ni pour la page rendue, ni dans le compte d'une séance (une séance
qui n'a fait que cela n'existe pas, et « Sa dernière séance » finit à l'heure
du dernier vrai geste). Une page supprimée et jamais rendue est rangée dans
« Pages jetées », avec toute son histoire ; rendue, elle reprend sa place et
son histoire continue.

**Une copie de page** (« Dupliquer la page ») a pour histoire celle de son
original jusqu'au moment de la copie, puis la sienne : sa revue montre la
page se construire comme l'original (« Toute son histoire » compte ces
gestes, et la séance où l'on a construit l'original est aussi une séance de
la copie), puis ce qu'on a fait sur elle. La copie elle-même n'est pas un
geste, ni dans son histoire, ni dans le compte d'une séance, ni dans le
découpage en séances : la page continue celle d'où elle vient, rien ne
surgit ni ne se redessine. Une copie faite en rangeant après le cours ne
fait donc pas une séance de plus (que Publier choisirait d'office, sans rien
à montrer), et une copie faite entre deux cours ne les réunit pas : son
étape dans le film le note (`naissance`, un champ facultatif qu'une version
d'avant ignore, comme `seulOrdre`). Il en va de même de ce qu'on range dans
la trieuse sans écrire : une page vide qu'on crée (« Nouvelle page », › sur
la dernière page, Insérer, Ajouter une page : sa naissance aussi, que la
revue ne comptait déjà pas) et un fond changé depuis le menu d'une vignette
(`rangement`, même lorsque la trieuse le rend par « Annuler ») ne font ni une
séance, ni un pont entre deux cours : Publier ne choisit plus d'office une
séance « 22 h 04 → 22 h 04 · 1 geste » faite en rangeant. Le fond changé reste
une image de la revue de sa page (« Toute son histoire » le montre, une
séance pendant laquelle on l'a changé l'emporte). Une page créée juste avant
le premier geste d'un cours (moins de vingt minutes avant, le même jour) est
de ce cours, sans en être un geste : la revue la voit neuve, comme avant.
Le fond changé par la barre du haut, devant la classe, reste un geste, comme
avant le lot 3. Une copie de copie remonte toute la chaîne. Rien n'est recopié :
la revue lit l'original dans l'instantané de chaque image (`src/heritage.ts`),
et ce passé ne change plus, même si l'original est ensuite modifié, supprimé,
ou supprimé définitivement. Une page de la corbeille, ou supprimée
définitivement, reste dans « Pages jetées » avec toute son histoire ; une
copie retirée sans qu'on y ait rien écrit n'y figure pas (son histoire est
celle de l'original). Une page qui a un nom le montre partout où la revue la
nomme : « Page 3 · Exercice 12 p. 84 ».

**Les commandes**, toutes au clavier et en grands boutons : Espace, K ou un
appui bref sur le tableau pour lire ou s'arrêter ; → ou Page↓ pour un pas,
← ou Page↑ pour revenir ; Maj+→ et Maj+← pour un seul geste visible ; [ et ]
pour la partie précédente ou suivante ; Origine et Fin ; 1 à 4, − et + pour
l'allure (Lent, Normal, Rapide, Très rapide ; Rapide au départ) ; C pour
revoir toute la page ; Échap (ou le bouton **Revenir au direct**) pour
quitter la revue. La lecture suit le
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

**Les instruments** se rejouent dans la revue comme chez les élèves (voir
« Les instruments au replay », plus bas) : avant un geste, ce que la règle,
l'équerre, le rapporteur ou le compas ont fait sur la page passe à sa vitesse
réelle, puis le trait s'écrit. Un long silence pendant une manipulation
commence un nouveau pas, comme un long temps stylo levé. Ce qu'on fait des
instruments sur une page après son dernier geste (ranger l'équerre, pousser
la règle) est une image de plus, sans geste, à la fin de la page : la fin
d'une partie et l'affiche montrent les instruments tels que la classe les a
vus en quittant la page, et la page suivante s'ouvre sur eux.

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
réglant le découpage à 5 ou 2 minutes ; ranger ses pages, les jeter, les
remettre, les dupliquer, en créer une vide, changer leur fond dans la
trieuse n'est pas un geste : ni une séance, ni un pont entre deux ; une
séance dont le film n'aurait aucun geste, qui n'a fait qu'effacer, n'est pas
proposée : depuis le lot 3, elle n'est plus choisie d'office devant le
cours), les pages où l'on a écrit pendant la
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

**Côté élève** (`revoir.html`). L'affiche montre la fin de la séance (la page
du dernier geste), le titre, la date et la durée. Le replay suit le rythme du
cours (les longs silences sont écourtés) aux allures Lent, Normal, Rapide ou
Très rapide ; à l'allure Normale, chaque lettre s'écrit comme en direct, au
rythme de la main (voir « Le rythme de la main ») ; les figures se dessinent
sous les yeux.
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
permet de le revoir. Une page supprimée puis rendue (« Annuler », Ctrl+Z)
pendant la séance ne change rien au replay : les mêmes gestes, sans pas vide,
et rien ne s'y redessine ; de même pour plusieurs pages supprimées de suite
puis rendues. Une page supprimée pour de bon au milieu de la
séance : le replay suit le professeur sur la page où il est arrivé (après
plusieurs suppressions de suite, directement sur la dernière) ; supprimée
après le dernier geste, elle n'allonge pas la séance, qui finit sur ce geste.
Une **copie de page** publiée sans son original se construit sous les yeux
de l'élève comme l'original s'est construit en classe (ce que l'original a
reçu avant la copie, puis ce qu'on a fait sur elle), sans geste à la copie ;
publiée avec son original, l'élève voit l'original se construire, puis la
copie paraître d'un coup au moment de la copie, comme la classe l'a vue
(ses formes ne se redessinent pas), et chacune continue. Un passé ne se joue
jamais deux fois : deux copies d'une même page publiées sans elle, la
première se construit, la seconde paraît d'un coup au moment de sa copie.
Une copie partie du tableau sans avoir rien reçu à elle (retirée par Ctrl+Z
juste après « Dupliquer la page », ou supprimée) n'est pas proposée : son
histoire est celle de l'original. Le nom donné à une page n'y part pas : les
chapitres restent « Page 2 ».
Un test
automatique le vérifie (`npm test`). Le lecteur n'écrit rien dans le navigateur
de l'élève (ni stockage, ni cookie), ne charge aucune police ni aucun service
extérieur, et sa politique de sécurité ne l'autorise à parler qu'aux relais.
Il reste au professeur à vérifier qu'aucun prénom n'a été écrit pendant la
séance, et qu'aucune image importée ne montre une copie ou un visage : la
fenêtre le rappelle.

**Le rythme de la main.** À l’écran, chaque point d'un trait arrive à son
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
revient d'un coup, comme à l’écran, sans se redessiner.
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

**Les instruments au replay.** Les instruments ne sont pas des formes : les
poser, les tourner ou les ouvrir ne crée aucune étape du film, et Ctrl+Z ne les
voit pas. Pour que le replay les montre, le tableau note à part, dans une
**piste** rangée dans le document hors des pages (`src/piste.ts`), ce que la
couche des instruments a montré et quand : à chaque fois qu'elle se peint, une
pose par instrument (position, angle, écartement, partie tenue), au plus 60 par
seconde et seulement si quelque chose a changé, et le tracé en cours sous un
instrument (l'arc sous la mine, le trait le long d'un bord). Un geste d'un seul
tenant fait un morceau ; il est simplifié (une pose qu'une ligne droite entre
ses voisines retrouve à 0,12 mm et 0,1° près s'en va) puis écrit un peu plus
tard, hors du geste. Pendant un trait au stylo, la couche des instruments ne se
repeint pas : l'écriture ne paie rien ; quand un instrument bouge, noter coûte
moins d'une microseconde par image. Le format (`src/revoir/instruments-film.ts`)
tient en petits entiers, en écarts, comme les points du stylet : les positions
au dixième d'unité, les angles au millième de degré (un angle pris à la pastille
↻, toujours un nombre entier de degrés, se relit exactement : l'image finale du
replay est celle du direct au pixel près).
Le film élève emporte, avec chaque geste, ce que les instruments ont fait **sur
cette page** depuis le geste d'avant, et seulement cela : un instrument bougé
sur une page non publiée, ou ailleurs, n'y est pas ; s'il en revient changé, il
reparaît d'un coup à sa place, comme la classe l'a revu. Avant le premier geste,
au plus une minute de mise en place. Le replay montre la manipulation à sa
vitesse réelle, avec ses petits arrêts ; les longs silences sont tassés comme
partout ; puis le trait s'écrit. L'arc sous la mine, le trait le long d'un
bord restent à l'écran jusqu'au lever, même si le crayon s'est arrêté avant
(la piste note cet arrêt), et la figure posée les remplace dans la même image ;
un tracé abandonné (trop court pour poser une figure) s'efface à son arrêt. Une
figure qu'on a vue se tracer sous l'instrument ne se redessine pas ensuite. Le
dernier geste d'une page emporte aussi son **épilogue** (`apres`) : ce que les
instruments font encore sur cette page avant qu'on la quitte, jusqu'au geste
suivant (au bout du film, au plus une minute, et pas au-delà de l'étape
suivante du tableau). Il se joue après ce geste, à son rythme, sur sa page ;
l'arrêt en fin de chapitre montre les instruments comme la classe les a vus en
quittant la page, et le geste suivant n'attend pas une seconde fois ce temps-là.
Les allures accélèrent ou ralentissent tout, et la manipulation (épilogue
compris) va jusqu'au bout avant une pause ou un arrêt de chapitre, comme un
trait. Le format garde sa version 1 : les champs ajoutés (`inst` et `apres`
dans un geste, `instruments` et `avant` dans le film) sont facultatifs, un
lecteur plus ancien les ignore et rejoue le film comme avant, et un film, un
fichier `.mem` ou un tableau sans instruments se rejoue exactement comme avant.
Des instruments abîmés dans un fichier sont ignorés en entier. La piste garde
toute l'année ; l'export d'une séance et la revue n'en décodent que ce qui sert
à la séance (`morceauxEntre` : les morceaux de la séance, et pour chaque
instrument les un ou deux morceaux d'avant qui fixent son état), et cochent une
case de la fenêtre Publier en quelques millisecondes, même après un an. Ce que
cela coûte, mesuré : environ 65 octets par seconde de manipulation dans le
`.mem` (une séance de 55 minutes avec trois minutes d'instruments : +13 %),
240 octets par seconde dans le document du tableau. Limites : un instrument
bougé sur une autre page que celle du geste suivant reparaît d'un coup ; la
mesure lue pendant le geste (« 30° », « r = 4 cm ») n'est pas rejouée ; le
document du tableau garde toute la piste (`gc: false`) : son chargement au
démarrage grandit avec elle (environ 0,1 s pour 7 h 30 d'instruments
manipulés sans arrêt, sur un PC ordinaire).
L'essai de bout en bout (`instruments/e2e.mjs`) compare, à chaque image
d'écran du replay, la pose montrée à celles du direct juste avant et juste
après le même instant, à 0,8 unité près. Il manque parfois ce seuil d'un
rien, au début d'une manipulation du programme de construction (ses
instruments vont vite) : 0,9 à 1,1 unité, l'équivalent de 1 à 2 ms, le replay
un rien en retard. Le contrôle final du lot 4 l'a mesuré (`lot4/cf/instr`) :
dans le premier classeur comme dans un autre, 1 passage sur 4 et 1 sur 5,
avec la même signature ; ce n'est donc pas propre aux classeurs qui ne sont
pas le premier. C'est la mesure : l'essai relit l'heure dans le lecteur un
peu après celle que le lecteur a prise pour poser les instruments (le temps
de les poser, ou une pause du ramasse-miettes). Relevé à l'heure même du
lecteur, l'écart ne dépasse plus 0,35 unité (6 passages sur 6 : la
simplification et l'arrondi, rien d'autre). Rien ne se voit ; la batterie
d'essais rejoue une fois cet essai quand il échoue, et le note.

**Où vivent les séances.** Dans un dossier privé du Drive du professeur, un
par compte : « MEM - Replay séances » (compte mathsetmoi) et « LFB - Replay
séances » (compte du lycée). Rien n'est partagé. Le relais Apps Script de ce
compte (`relais/relais-seances.gs`, projet « MEM - Relais replay ») lit la
séance sous l'identité du professeur et la sert ; un relais par compte Google,
et le lien dit lequel (`?r=mem&id=…`). Il ne sert qu'un fichier `.mem` qui est
bien un replay, rangé dans l'un de ces deux dossiers, et ne liste jamais rien.
Chaque dossier porte aussi la marque de son compte : un essai avec le mauvais
compte Google ne laisse rien derrière lui, et le dossier d'un compte n'est
jamais repris par l'autre. Les copies des classeurs (lot 4, voir « La copie
sur le Drive ») vont dans un autre dossier privé du même Drive, « MEM -
Sauvegardes » ou « LFB - Sauvegardes », marqué autrement : le relais ne les
sert jamais.
Les noms des dossiers sont à la fois dans `src/publication/comptes.ts` et dans
le relais : un test vérifie qu'ils concordent. Installer un relais prend cinq
minutes (instructions en tête du script) ; le mettre à jour (Gérer les
déploiements → Version : Nouvelle version) garde la même adresse. Un relais
pas à jour est signalé à la publication. La connexion Google demande le droit
le plus étroit (`drive.file` : MEM teachingtool ne voit que les fichiers qu'il a
créés).

**Connexion Google : à régler une fois.** MEM teachingtool a besoin de SON
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
La copie des classeurs sur le Drive (lot 4) passe par le même identifiant et
le même droit `drive.file` : rien de plus à régler. Elle ne demande jamais la
connexion sans un clic, et partage le jeton de Publier (un seul compte
connecté à la fois, pour l'onglet ; il suit l'onglet d'un classeur à l'autre,
voir « La copie sur le Drive »).

**Mettre en ligne.** `npm run build:pages` construit le tableau et le lecteur
dans `dist-pages/`. Le fichier `.github/workflows/pages.yml` les met en ligne
sur GitHub Pages à chaque envoi sur `main`, après les tests (à activer une
fois : Settings → Pages → Source : GitHub Actions). On publie depuis cette
version en ligne : la connexion Google ne marche ni depuis le fichier unique,
ni depuis une adresse que la console Google n'autorise pas. Attention : les
classeurs vivent dans le navigateur, adresse par adresse ; ceux de la version
en ligne ne sont pas ceux de la clé USB. Pour passer de l'un à l'autre :
« Enregistrer le classeur » d'un côté, « Ouvrir un classeur » de l'autre (voir
plus bas). La version clé USB enregistre aussi le fichier séance.

**Les téléphones des élèves.** Le lecteur vise les navigateurs depuis 2020
(Safari 14, Chrome 87, Firefox 78) ; sur les iPhone et iPad d'avant iOS 16.4,
qui ne savent pas décompresser seuls, un petit décompresseur (fflate, 8 Ko) se
charge à la place. Commandes de 44 px, zoom du navigateur jamais bloqué, la
frise annonce le temps aux lecteurs d'écran.

## Les pages

**La trieuse des pages** montre toutes les pages en vignettes, en plein
écran : le rendu réel de chaque page en petit (son fond, tout son contenu
cadré), son numéro en gros dans un coin, son nom dessous s'il en a un, « Page
vide » sur une page sans rien ; la page qu'on regarde est encadrée de bleu.
On l'ouvre par le **compteur** « 3 / 7 » de la barre du haut (un bouton), par
**Maj + P** (la lettre écrite sur la touche, en AZERTY comme en QWERTY ; P seul
reste le Stylo), ou par **Toutes les pages…** dans le menu de la page (un clic
droit dans le vide). On la ferme par Échap, par le ×, par Maj + P, ou en
allant à une page ; ouverte au clavier, elle rend le focus au compteur. Elle
ne s'ouvre ni pendant la revue, ni pendant une séance d'automatismes, ni
quand une fenêtre est ouverte, ni au milieu d'un trait ou d'un objet qu'on
glisse. En s'ouvrant, elle pose ce qui attendait (le point d'un simple
toucher), annule un placement en attente (désigner un axe, poser une
construction), ferme le programme de construction et les menus, et retire du
bas de l'écran le message « … · Annuler » du tableau (il changerait une page
qu'on ne voit plus ; Ctrl+Z, une fois la trieuse fermée, rend toujours la
page supprimée). Tant qu'elle est ouverte, plus rien n'écrit sur la page
cachée : ni les lettres des outils, ni Ctrl+V, ni le programme de
construction ; Ctrl+Z, Suppr, Ctrl + D et Ctrl + A y agissent sur les pages
(voir plus bas), jamais sur ce qui est écrit.

Pourquoi plein écran plutôt qu'un panneau sur le côté (comme SMART ou
Xournal++) : la page est infinie et le vidéoprojecteur montre tout à la
classe ; un panneau prendrait en permanence un cinquième du tableau pour
quatre vignettes. La grille en montre une vingtaine d'un coup sur un
portable, une quarantaine sur un TNI en 1920 × 1080, toutes en défilant ;
elle laisse la place de glisser loin, sert telle quelle sur un téléphone
(deux colonnes), et fait un moment d'organisation clair pour la classe
(comme la grille de GoodNotes ou Notability).

- **Aller à une page** : un clic ou un toucher sur sa vignette, ou Entrée sur
  celle qui a le focus ; la trieuse se ferme et le numéro de la page
  s'annonce. Ce qui suit ce clic ne touche rien de ce qui était sous la
  vignette : ni le clic que le navigateur tire d'un toucher (au doigt, au
  TNI, sur un iPad, il viserait le bouton du tableau maintenant sous le
  doigt : un outil, une couleur, le rôle du doigt), ni le second clic d'un
  double-clic par habitude (à la souris, à la plume de la tablette
  graphique, au doigt), qui changerait l'outil (la Gomme) ou laisserait un
  point d'encre. Pendant une demi-seconde (le lever et le clic, 300 ms de
  plus), à moins de 40 px du premier appui, ils ne font rien ; un clic
  ailleurs passe aussitôt, au même endroit une seconde plus tard.
- **Taper son numéro** : des chiffres (au clavier principal, avec ou sans Maj
  comme en AZERTY, ou au pavé numérique) ; deux chiffres à moins de 0,8 s
  font un seul numéro (« 1 », « 2 » : la page 12). Le focus va à sa vignette,
  qu'Entrée ouvre. Utile au TNI avec soixante pages.
- **Au clavier** : les flèches passent d'une vignette à l'autre (↑ et ↓ dans
  la même colonne, selon la mise en page réelle), Début et Fin aux bouts ;
  Tab va du bandeau à la grille (un seul arrêt pour toute la grille).
- **Réordonner à la souris et à la tablette graphique** : on glisse la
  vignette, de n'importe où sur elle, dès 4 px (6 au stylet), sans appui
  long. La vignette s'estompe, son image suit le pointeur, une barre bleue
  marque la place d'arrivée, et la grille défile seule quand on approche de
  son bord haut ou bas. Un glisser parti du vide de la grille ne fait rien.
  Sur un ordinateur sans écran tactile, la grille ne défile pas au toucher
  (touch-action) : sous Windows Ink, le réglage des pilotes Wacom, le stylet
  suivrait la même règle que le doigt, et un glisser vertical de la tablette
  ferait défiler au lieu de tirer la page ; la grille défile à la molette, par
  sa barre, et seule près des bords pendant un glisser.
- **Réordonner au doigt** (et au stylet posé sur l'écran : iPad, Surface) :
  par la poignée ⋮⋮ de la vignette, ou par un appui long d'une demi-seconde
  (une petite vibration là où elle existe) ; sinon le doigt fait défiler la
  grille, et un toucher bref mène à la page. Deux doigts (ou la main
  entière, au TNI) la font défiler aussi, sans rien ouvrir : le navigateur
  ne le ferait pas (le touch-action de la grille interdit les gestes à
  plusieurs doigts, pour que le pincement n'agrandisse pas toute la page),
  la trieuse le fait elle-même. Un doigt posé sur le bandeau ne compte pas,
  et une page déjà tirée continue seule.
- **Réordonner au clavier** : Ctrl + Maj + ← ou → (⌘ + Maj sur Mac) avance ou
  recule d'une place la page qui a le focus (toutes les pages choisies, si
  elle en est, regroupées dans leur ordre).
- **Plusieurs pages à la fois** : Maj + clic ou Ctrl + clic (⌘ + clic sur Mac,
  où Ctrl + clic est un clic droit) choisit une page ou la retire, sans y
  aller ; Espace fait de même au clavier, Ctrl + A les choisit toutes. Au
  doigt et au stylet posé sur l'écran, le bouton **Choisir plusieurs** du
  bandeau (un interrupteur, comme « Ajouter » de la barre d'actions) fait de
  chaque toucher un choix ; il s'éteint quand plus rien n'est choisi. Il ne
  s'appelle pas « Ajouter » comme à l’écran : dans ce bandeau, à côté
  d'« Ajouter une page », un second « Ajouter » se lirait comme « ajouter
  une page » ; et il y est même quand rien n'est encore choisi, alors que
  celui de la barre d'actions accompagne une sélection. Une
  page choisie a une coche et un fond bleu pâle ; tant qu'il y en a, chaque
  vignette montre sa coche (vide ou pleine), et le bandeau dit « 3 pages
  choisies » avec **Dupliquer**, **Supprimer**, **Exporter en PDF** (les
  pages choisies) et **Tout désélectionner**.
  Glisser une page choisie emmène toutes les pages choisies, dans leur
  ordre (leur nombre sur l'image qui suit le pointeur). Échap ferme d'abord
  un menu ouvert, arrête un glisser, laisse le nom qu'on écrivait tel qu'il
  était, ramène de la corbeille aux pages, puis vide la sélection, et enfin
  ferme la trieuse. Sur un
  téléphone, le bandeau passe à la ligne (trois lignes au plus : ses
  boutons n'y montrent que leur icône).
- **Le menu d'une page** : son bouton ⋯ (dans le coin de la vignette, toujours
  là), le clic droit sur la vignette (ouvert à l'appui du bouton, comme sur
  le tableau), le bouton latéral du stylet de la tablette graphique, la
  touche Menu ou Maj + F10 sur la vignette qui a le focus (le focus va à sa
  première entrée ; ↓ passe à la suivante sans changer de vignette, Suppr n'y
  supprime rien, Échap le ferme sans fermer la trieuse). L'appui long au
  doigt ne l'ouvre pas : il sert à tirer la page. Il propose **Aller à cette
  page**, **Renommer…**, **Dupliquer**, **Insérer une page avant…**, **Insérer
  une page après…**, le **Fond** (page blanche, petits carreaux, Seyès, repère),
  **Copier en image** (la page en PNG pour l'ENT ou Pronote, voir « Copier en
  image » ; la trieuse reste ouverte), **Exporter en PDF…** (voir « Exporter
  en PDF ») et **Supprimer** ; sur une page choisie parmi d'autres,
  **Dupliquer**, **Exporter en PDF…** et **Supprimer** pour toutes. Sur une
  page vide, *Copier en image* et *Exporter en PDF…* sont grisés, comme au
  tableau (rien à copier ni à imprimer ; le bandeau exporte tout le
  tableau), et le lecteur d'écran dit la vignette « Page 5, vide ».
- **Renommer** (F2, « Renommer… », ou un double-clic sur le nom) : un champ
  dans la vignette, prérempli, 60 caractères au plus, le nom étant
  facultatif ; Entrée ou cliquer ailleurs le garde, Échap le laisse tel
  qu'il était, un nom vidé est retiré (« Nom de la page retiré »). Au doigt,
  la vignette reste visible au-dessus du clavier qui paraît. Le nom se lit
  ensuite dans le compteur (« 3 / 7 · Exercice 12 p. 84 », quand la barre
  en a la place : voir « Changer de page »), à l'annonce du numéro et dans
  la revue. Un simple clic sur le nom mène à la page, un
  instant après (le temps de savoir si c'est un double-clic).
- **Insérer, ajouter** : « Insérer une page avant… / après… » met une page
  vide à côté, au fond qu'on choisit : le même menu (même largeur, même bord
  gauche) propose aussitôt les quatre fonds, celui de la voisine coché, sous
  le focus (Entrée le prend) et, au pointeur, sous le pointeur (un second
  clic au même endroit le prend) ; une seule action, qu'un seul « Annuler »
  défait (pas de second temps par « Fond »). Le second clic d'un double-clic
  sur « Insérer… » (ou le second toucher d'un double toucher) ne fait rien :
  on reclique une fois le menu lu. Le bouton **Ajouter une page** du bandeau
  en met une à la fin, au fond de la dernière. La nouvelle vignette prend le focus. Annulée, une page insérée
  disparaît tout à fait (ni dans l'ordre, ni dans la corbeille).
- **Changer le fond** d'une page sans y aller : le repère prend son origine au
  centre de ce qui est écrit sur la page, calée sur le centimètre ((0, 0)
  sur une page vide). La vignette se repeint ; la revue voit le fond changer
  (une étape notée sur cette page). C'est du rangement : ni une séance de
  plus si on le fait après le cours, ni un pont entre deux cours (voir
  « Revoir la construction »).
- **Dupliquer** (Ctrl + D, ⌘ + D sur Mac, sans jamais ouvrir le marque-page du
  navigateur ; le menu ; le bandeau) : chaque page choisie, ou celle qui a
  le focus, est copiée juste après elle-même, avec toute son histoire (la
  revue et le film élève de la copie la montrent se construire, voir
  « Revoir la construction »), le même fond et le même nom suivi de
  « (copie) ». La copie s'ouvrira sur la vue de son original. Plusieurs
  pages se dupliquent en une seule action. Annulée, une copie disparaît sans
  aller dans la corbeille.
- **Supprimer** (Suppr ou Retour arrière, le menu, le bandeau) : les pages
  choisies, ou celle qui a le focus, vont dans la corbeille (une page vide
  n'y va pas : « Page 3 (vide) supprimée ») ; il reste toujours au moins une
  page. Si la page qu'on regarde en est, on passe d'abord sur la plus proche
  qui reste avant elle (la suivante pour la première) : après la fermeture
  de la trieuse, **Ctrl+Z** sur cette page rend celle qu'on regardait, à sa
  place, comme après la poubelle de la barre du haut.
- **Exporter en PDF** : le bouton du bandeau exporte tout le tableau (celui
  des pages choisies le remplace tant qu'il y en a) ; Ctrl + P exporte les
  pages choisies, sinon tout le tableau. La trieuse reste ouverte pendant
  l'export (voir « Exporter en PDF »).
- **La corbeille** : le bouton **Corbeille** du bandeau (« Corbeille (3) »,
  le nombre de pages qui y attendent) remplace la grille par les pages
  supprimées, qu'on y remet ou supprime définitivement (voir « Supprimer une
  page ») ; Échap ou **Pages** ramènent à la grille.
- **Annuler** : chaque action le dit (« Page déplacée : c'est maintenant la
  page 5 », « Page renommée », « Page vide insérée : c'est la page 4 », « Page
  ajoutée à la fin (page 8) », « Fond changé (page 3) », « Page 3 dupliquée :
  la copie est la page 4 », « 3 pages dupliquées », « Page 3 supprimée »,
  « 3 pages supprimées », « Page remise : c'est la page 4 ») avec
  **Annuler** ; dans la trieuse, Ctrl+Z annule et
  Ctrl+Y (ou Ctrl + Maj + Z) rétablit (« Annulé : page supprimée », « Rien à
  annuler dans les pages »). Défaire une suppression remet les pages
  exactement à leur place, et ramène sur la page qu'on regardait. La trieuse
  garde son propre journal, qui ne touche à aucune pile d'annulation de
  page : il ne défait que si les pages sont exactement telles qu'il les a
  laissées (sinon : « Les pages ont changé depuis : rien à annuler. »), et il
  se vide à la fermeture (son dernier « Annuler » s'en va avec lui ; la
  corbeille reste le filet). Un déplacement, un nom, une suppression ne sont
  un geste nulle part : ni la revue, ni les séances, ni le film élève n'y
  voient autre chose qu'un ordre changé.

Les vignettes se peignent à part (voir « Architecture ») : celles qu'on voit
d'abord, sans jamais bloquer l'écriture (60 pages de 300 traits : les
vignettes visibles prêtes en un tiers de seconde, toutes en moins d'une
seconde, aucune tâche de plus de 50 ms, mesuré), et se repeignent quand leur
page change ; fermée, la trieuse ne coûte rien.

## Les classeurs : où ils vivent

Depuis le lot 4, l'unité est le **classeur** (un par chapitre, rangés par
classe). La fondation range chaque classeur à part, sans rien perdre de ce
qui existait ; le nom du classeur est sur le bouton du classeur, à gauche
de la barre du haut (avec l'état de sa sauvegarde, voir « L'état de la
sauvegarde »), dans le titre de l'onglet (« Mon tableau — MEM
teachingtool »), dans le nom de ses fichiers et de ses PDF, et
tout ce qui suivait le tableau suit le classeur (voir « Enregistrer et
ouvrir un classeur »). Ce bouton ouvre la bibliothèque des classeurs, où
l'on passe d'un classeur à l'autre et où l'on en crée (voir « La
bibliothèque des classeurs »).

- **Une base par classeur.** Chaque classeur est un document Yjs dans sa
  propre base du navigateur (IndexedDB). Le premier est le tableau d'avant le
  lot 4 : sa base reste `mem-tableau-local`, jamais recopiée ni renommée, avec
  tout ce qu'elle avait (pages, film, corbeille et noms des pages, copies,
  piste des instruments, séances publiées). Une version d'avant (la clé USB
  du lot 3) ouverte ensuite sur la même machine retrouve ce même tableau,
  intact, et ce qu'elle y écrit se retrouve ici. Les autres classeurs ont
  `mem-teachingtool-classeur-<id>` (l'id : 16 caractères hexadécimaux).
  Ouvrir un classeur ne charge que lui ; deux onglets peuvent être sur deux
  classeurs, chacun écrit dans sa base.
- **L'index de la bibliothèque** vit à part, dans
  `mem-teachingtool-bibliotheque` (cinq magasins : les fiches des classeurs,
  les dossiers, l'état, les aperçus, les fichiers de la clé). Un index unique
  sur la base : deux fiches ne désignent jamais la même base. Il s'ouvre sans
  numéro de version, pour qu'une version suivante puisse en ajouter sans
  faire tomber celle-ci. Les onglets s'y disent leurs changements (canal
  `mem-teachingtool-bibliotheque`). Pendant qu'on travaille, la fiche du
  classeur ouvert retient, au plus toutes les 30 secondes et dès que l'onglet
  passe en arrière-plan, quand il a changé, son nombre de pages et son
  vecteur d'état (ce que la bibliothèque, la clé et le Drive compareront) ;
  ce n'est pas une sauvegarde : le document s'enregistre seul dans sa base.
  Elle s'écrit aussi tout de suite quand la bibliothèque s'ouvre (une
  seconde au plus avant de montrer les cartes), et chaque écriture refait
  la carte de ce classeur dans la bibliothèque de l'onglet (le canal ne
  revient pas à qui parle) : sa carte dit toujours son vrai nombre de pages
  et la date de son dernier changement, même la bibliothèque restée
  ouverte.
- **La reprise.** Au premier démarrage du lot 4, une seule transaction de
  l'index crée la fiche du premier classeur (« Mon tableau » ; « Premier
  classeur » sur un navigateur neuf, décidé à sa première ouverture, qui
  prend aussi ses dates dans le film) et la marque de la reprise. Elle
  n'ouvre jamais `mem-tableau-local`. Coupée au milieu (onglet fermé,
  navigateur tué, transaction abandonnée), elle n'a rien écrit et se rejoue ;
  deux onglets qui démarrent ensemble font une seule fiche. Un essai le
  vérifie octet à octet : la base du tableau n'a gagné que les entrées vides
  (`[0,0]`) que y-indexeddb ajoute à chaque ouverture. Une fois la marque
  posée, la fiche du premier n'est jamais recréée. Une création de classeur
  interrompue depuis plus de 2 minutes est reprise : adoptée si sa base a
  quelque chose, retirée sinon. Un effacement interrompu (voir « Effacer
  pour de bon » plus bas) commencé depuis plus de 30 secondes aussi.
- **Les clés.** Le premier se reconnaît à sa base, jamais à un champ
  enregistré (une fiche adoptée ou importée sur cette base l'est aussi), et
  garde les clés d'avant : `mem-session` (la page et les vues),
  `mem-dernier-enregistrement` (la date du dernier enregistrement dans un
  fichier), le canal `mem-tableau`. Un autre classeur a les mêmes, suivies
  de `:<id>` (`mem-session:<id>`, `mem-dernier-enregistrement:<id>`) ; le
  canal `mem-tableau` n'est écouté et parlé que par le premier. Le dernier classeur
  est retenu sous `mem-teachingtool-dernier-classeur` (son id, sa
  base, son nom), qui se relit même sans l'index : celui qu'on ouvre (sauf
  dans un onglet en arrière-plan, pas encore regardé), celui où l'on écrit
  (à chaque écriture de sa fiche, au plus toutes les 30 s) et celui qu'on
  regarde (l'onglet qui redevient visible ou prend le focus). L'identité d'un classeur
  (id, nom) est aussi rangée dans sa base, à côté du document (le magasin
  `custom` de y-indexeddb) : ni dans le document, ni dans un fichier. Les
  réglages de l'appareil et le presse-papiers restent communs. Le rangement
  de la bibliothèque n'ajoute que le tri, pour l'appareil
  (`mem-teachingtool-tri`), et, pour l'onglet, le dossier et le filtre qu'on
  regarde (`mem-teachingtool-dossier`, `mem-teachingtool-filtre`, dans
  sessionStorage) ; les dossiers, leurs couleurs et les étiquettes sont dans
  l'index. La copie sur le Drive (voir « La copie sur le Drive ») y ajoute
  deux réglages (`copieDrive`, le Drive par défaut ; `appareil`, ce
  navigateur, tiré une fois en une transaction) et, dans la fiche, son choix
  (`copieDrive`) et sa dernière copie (`drive`) ; son verrou des onglets est
  `mem-teachingtool-drive:<id>`.
- **L'adresse.** Le classeur ouvert est dans l'adresse (`?classeur=<id>`, en
  ligne comme en `file://`) : recharger la page le rouvre. Sans rien, c'est
  le dernier classeur qui revient, celui où l'on a écrit en dernier ou
  qu'on regardait (sinon celui ouvert le plus récemment, sinon le premier) :
  rien ne change au geste du professeur en classe. Un classeur regardé un
  instant dans un autre onglet (Ctrl + clic ou clic du milieu sur sa carte)
  ne prend pas la place de celui où l'on a continué d'écrire ; avec deux
  onglets sur deux classeurs, c'est celui où l'on a écrit ou regardé en
  dernier, et non le dernier ouvert. Une adresse venue d'une autre machine (un classeur inconnu ici), ou
  celle d'un classeur dans la corbeille, ouvre la bibliothèque seule, et un
  message dit quoi faire (voir « La bibliothèque des classeurs ») ; de même
  `?bibliotheque`. `revoir.html` et les liens publiés n'en dépendent pas.
- **Le repli.** Si l'index ne s'ouvre pas (stockage refusé, base abîmée),
  le dernier classeur ouvert s'ouvre quand même s'il a encore sa base (sinon
  le premier), avec « La bibliothèque des classeurs ne s'ouvre pas dans ce
  navigateur : seul « … » est disponible. Enregistrez-le dans un fichier. » ;
  rien n'est écrit dans l'index, l'adresse ne change pas. Une base qui ne
  s'ouvre pas du tout ne retient plus le démarrage : le document vit en
  mémoire, et il le sait (avant, l'outil restait sans page).
- **Des bases qu'on n'abîme jamais.** Une base ouverte sans version alors
  qu'elle n'existe pas est créée vide (version 1, aucun magasin), et
  y-indexeddb ne la charge plus jamais (mesuré). Hors de y-indexeddb, une
  seule fonction ouvre une base de classeur (`ouvrirBaseExistante`), qui
  abandonne cette création ; une base trouvée sans magasin est « abîmée »,
  jamais écrite. Créer la base d'un classeur refuse une base qui existe, sans
  rien y toucher ; une création qui échoue n'efface que ce qu'elle a créé.
  Une fiche dont la base a disparu n'est pas rouverte (y-indexeddb la
  recréerait vide) : un message le dit, et un autre classeur s'ouvre.
- **La base supprimée ailleurs.** Si un autre onglet supprime la base du
  classeur ouvert, le lien est coupé net : une fenêtre le dit (« Le classeur
  a été supprimé »), aucun geste ne lève d'erreur et la base n'est pas
  recréée. (Avant, la connexion se fermait seulement, et le geste suivant
  levait une erreur.)
- **Effacer pour de bon** (vider la corbeille de la bibliothèque, voir « La
  bibliothèque des classeurs » ; `src/classeurs/effacer.ts`), jamais avec
  une fiche menteuse : 1) la fiche reçoit `effacement` (le classeur
  disparaît partout) ; 2) les onglets ouverts sur lui sont prévenus et
  cessent d'écrire (canal `mem-teachingtool-classeur`, `{ type: 'supprime',
  base }` ; pour le premier, aussi le canal d'avant, `{ type: 'remplace',
  raison: 'supprime' }` : un onglet de la version d'avant ne lit que `type`,
  se coupe et demande un rechargement) ; 3) ouvert dans cet onglet, le
  Tableau coupe son lien avec la base (sa sauvegarde prévient les autres
  par ses propres canaux : elle ne s'entend pas elle-même) et l'onglet passe
  sans classeur ; 4) 300 ms ; 5) la base s'efface, puis la fiche, son
  aperçu, le fichier de sa clé et ses clés de stockage (`mem-session` et
  `mem-dernier-enregistrement`, avec `:<id>`, ou telles quelles pour le
  premier ; le dernier classeur retenu s'il le désignait). Une base qu'un
  onglet tient vraiment ouverte : « Le classeur sera effacé dès que l'onglet
  où il est encore ouvert sera fermé. », et le même ménage suit ; une
  connexion qui se ferme d'elle-même dans les 4 secondes (une lecture en
  cours) ne le fait pas dire. Les connexions de l'écrivain se ferment après
  lecture et dès qu'on veut effacer, et il ne calcule jamais pendant qu'une
  autre de ses demandes tient une base ouverte (mesuré : sans cela, une
  fusion de 30 pages retenait l'effacement le temps du calcul). Deux onglets
  qui vident ensemble : ce qui est déjà parti ne lève rien.
- **Les garde-fous du premier.** Il se supprime et se vide comme les
  autres ; mais la version d'avant, rouverte ensuite à la même origine,
  recrée `mem-tableau-local`, et ce qu'elle y écrit ne doit pas se perdre :
  la base n'est jamais effacée toute seule (ni par l'adoption, ni par le
  ménage), et une base sans fiche est adoptée (voir plus bas). Juste avant
  de l'effacer, son vecteur d'état va dans sa fiche : un effacement
  interrompu n'est relancé au démarrage que si la base n'a rien de plus ;
  sinon (la version d'avant y a écrit entre-temps), seule la fiche s'en va,
  et la base revient par l'adoption, avec tout.
- **Les classeurs retrouvés** (`src/classeurs/adoption.ts`) : une base de
  classeur qu'aucune fiche ne désigne (l'index perdu, la version d'avant qui
  a recréé `mem-tableau-local`) est cherchée une fois par chargement de la
  page, à la première ouverture de la bibliothèque, si le navigateur sait
  lister ses bases (`indexedDB.databases`). Les fiches de la corbeille, en
  effacement ou en création comptent toutes. Chaque base est lue par
  l'écrivain, hors du fil principal (une base de 27 Mo ne gèle rien), sans
  rien y écrire. Elle est adoptée si elle n'est pas vide au sens strict
  (une forme dans une page, celles de la corbeille des pages comprises, ou
  plus d'une étape de film, une piste, une séance publiée, un nom de page) :
  une transaction relit l'index et ajoute la fiche (deux onglets ensemble :
  une seule fiche), sous l'id et le nom rangés à côté du document (l'id s'il
  est libre), sinon « Tableau retrouvé (version d'avant) » pour
  `mem-tableau-local` et « Classeur retrouvé » pour les autres, à la racine ;
  « Un classeur retrouvé dans ce navigateur a été remis dans la
  bibliothèque : « … ». ». Une base vide qui a des entrées est laissée ;
  seule une base `mem-teachingtool-classeur-…` sans aucune entrée (une
  création avortée) est effacée. Après la perte de l'index, le premier
  revient par la reprise (un id neuf) et reprend, à sa première ouverture,
  le nom rangé à côté de son document.
- **Le trou, et sa réparation.** Une seule écriture refusée par la base (le
  disque plein un instant) cache au rechargement tout ce qui la suit (mesuré
  : 3 formes en mémoire, 1 relue), parce que Yjs attend la mise à jour qui
  manque. Le document le repère (`trou`, et `erreurBase` : `place`, `autre`,
  `fermee` pour une connexion fermée sans qu'on l'ait demandé,
  `indisponible`) ; l'état de la sauvegarde le dit (voir « L'état de la
  sauvegarde »). Le document en
  mémoire, lui, est entier : un fichier enregistré depuis l'onglet a tout.
  `reparer()` rouvre la base avec y-indexeddb, qui commence par y ajouter
  l'état complet du document : le trou est comblé, rien n'est effacé ; si la
  base refuse encore, le trou reste. Elle coûte environ une seconde de
  calcul pour 60 pages : on ne l'appelle qu'au calme (la surveillance de
  l'état s'en charge).
- **Une base trouée relue.** Si l'onglet est fermé (ou le poste éteint)
  avant la réparation, le classeur rouvert a, dans Yjs, des changements en
  attente de la mise à jour qui manque (`doc.store.pendingStructs`) : ils ne
  s'affichent plus, et ni la base ni la mémoire n'ont ce qui manque.
  `charger()` le repère (`incomplet`, distinct du trou de cette séance-ci :
  la base a tout ce que la mémoire a, il n'y a rien à réparer en la
  rouvrant). L'état le dit (« Une partie ne se relit pas », voir « L'état de
  la sauvegarde »), l'ouverture aussi, une fois. La base n'est jamais vidée :
  un fichier qui a la mise à jour manquante (un Ctrl + S de la séance du
  trou, ou le fichier de la clé qui refuse alors d'être écrasé) la complète
  encore par « Mettre à jour le classeur » (vérifié :
  `lot4/corrections-migration.mjs`, B6). Tout ce qui s'enregistre ensuite
  dans un fichier (Ctrl + S, la clé, le Drive, toute la bibliothèque) est
  ce qui se relit (`fichier.etatLisible` : l'état sans les changements en
  attente, que `encodeStateAsUpdate` emporterait, et le fichier serait
  refusé à l'ouverture) : un fichier qui se rouvre toujours, ici comme dans
  la version d'avant (vérifié avec 41d2739 : `lot4/migration/vt`), et le
  message le dit. Le travail de la séance, lui, se relit normalement.

## Enregistrer et ouvrir un classeur

Le classeur s'enregistre tout seul dans le navigateur, mais un navigateur
peut l'oublier : un poste de lycée remis à zéro chaque soir, un iPad sur
lequel on n'est pas revenu depuis des semaines, un historique effacé. Le
bouton **⋯**, au bout de la barre du haut (« Enregistrer, ouvrir ou exporter
en PDF », Ctrl + S, Ctrl + O, Ctrl + P), l'emporte dans un fichier. Chaque
entrée de son menu a un nom stable (`data-action` : `enregistrer`, `ouvrir`,
`exporter-pdf`, et pour la clé `activer-cle`, `enregistrer-cle`,
`arreter-cle`), que les essais retrouvent quel que soit le libellé.

- **Enregistrer le classeur…** (Ctrl + S, ⌘ + S sur Mac) écrit un fichier
  au nom du classeur, avec la date : `Symétrie centrale 2026-10-10
  14h05.memc` : toutes les pages, tout l'historique (la revue en classe et le
  replay marchent sur une autre machine comme sur celle-ci), les
  instruments, les images, la liste des séances publiées. Sur Chrome et Edge,
  on choisit où l'écrire (la clé USB, un dossier synchronisé avec le Drive) ;
  ailleurs, et depuis la version clé USB, il se télécharge. Comme le
  document, il garde ce qui a été effacé : il n'est pas pour les élèves (pour
  eux : Publier, qui donne un film aplati, `.mem`). Les messages :
  « Enregistrement du classeur… », puis « Classeur enregistré : Symétrie
  centrale 2026-10-10 14h05.memc (850 Ko). », ou « Le classeur n'a pas pu
  être enregistré : … » avec la raison (plus de place, clé retirée…). Quand
  le classeur s'enregistre tout seul sur la clé (voir « L'enregistrement
  automatique sur la clé »), Ctrl + S y écrit aussitôt (« Enregistrer
  maintenant sur la clé »), et cette entrée devient **Enregistrer une copie
  dans un fichier…**.
- **Rien ne gèle.** Le fichier se fabrique **depuis la base du classeur, dans
  un travailleur** (`src/classeurs/ecrivain.ts`), une fois écrit dans la base
  tout ce que l'onglet y a mis (le point d'un simple toucher qui attend, ce
  que les instruments viennent de faire) : le travailleur lit la base d'une
  traite (sans jamais la créer, et en la lâchant si un autre onglet veut
  l'effacer), fusionne ses mises à jour, rejoue le document dans un document
  d'essai pour vérifier qu'il est entier (comme à l'ouverture d'un fichier),
  compresse, et rend le fichier. Mesuré sur 60 pages de 300 traits (18 Mo) :
  aucune tâche de plus de 100 ms sur le fil principal pendant
  l'enregistrement (avant, la page gelait environ 1,7 s). Le travailleur est
  intégré à la page : il marche aussi dans la version clé USB (`file://`,
  vérifié dans Chromium). Si le navigateur n'a pas de travailleur, ou s'il ne
  démarre pas, le même code tourne sur le fil principal (la page gèle alors
  le temps de l'enregistrement) : Ctrl + S marche toujours, et l'écrivain le
  note (`mode = 'fil'`) pour les enregistrements automatiques à venir, qui
  ne tourneront pas ainsi.
- **Depuis la mémoire, quand la base a un trou.** Si la base du navigateur a
  refusé une écriture (le trou, voir « Les classeurs : où ils vivent »), ou
  ne s'ouvre pas, ou que le travailleur ne peut pas la lire (elle est
  abîmée, IndexedDB lui est refusé), Ctrl + S écrit le fichier depuis la
  mémoire de l'onglet, qui a tout ce qu'il a écrit, même ce que la base a
  refusé : « Enregistrement depuis la mémoire de cet onglet… » (la page gèle
  un instant, comme avant le lot 4, où c'était toujours ainsi). Une base
  trouée ne fait jamais de fichier qu'on ne pourrait pas rouvrir.
- **Jamais un fichier qu'on ne pourrait pas rouvrir.** Une base trouée
  relue (voir « Une base trouée relue ») : Ctrl + S écrit ce qui s'en relit,
  depuis la base par le travailleur (`lisible`), ou depuis la mémoire
  (`ecrireLisible`, qui ne garde que ce qui se relit et le vérifie), et dit
  « Classeur enregistré, sans la partie qui ne se relit plus dans ce
  navigateur : Symétrie 2026-10-10 14h05.memc (1 Ko). », jamais « Classeur
  enregistré : ». Même chose pour « Enregistrer d'abord » (un classeur non
  ouvert), la clé (« Classeur enregistré sur la clé, sans la partie… ») et
  toute la bibliothèque (« « Symétrie » n'y est qu'en partie (une partie ne
  se relit plus dans ce navigateur). »).
- **Ouvrir un classeur…** (Ctrl + O ; « Ouvrir… » dans le bandeau de la
  bibliothèque, ou son menu ⋯ au téléphone ; un fichier glissé sur la page ou sur la bibliothèque ;
  `src/classeurs/fichiers.ts`) **ajoute** le classeur d'un fichier `.memc` à
  la bibliothèque, comme un nouveau classeur, sans rien remplacer ; ou, au
  choix, remplace celui qui est ouvert (voir plus bas). L'aide de l'entrée :
  « Ajoute un classeur enregistré (.memc) à la bibliothèque, ou remplace
  celui-ci. ». Sur Chrome et Edge (aussi dans la version clé USB), le choix
  passe par `showOpenFilePicker` (plusieurs fichiers à la fois, des `.memc`
  et des `.memb` : « Classeur ou bibliothèque (MEM teachingtool) », le même
  dossier d'une fois sur l'autre) : le navigateur donne alors le fichier
  lui-même, où le classeur pourra s'enregistrer tout seul ; renoncer ne fait
  rien ; ailleurs (Firefox, Safari, l'iPad, une page intégrée qui le refuse),
  le choix de fichier d'avant, plusieurs à la fois aussi (sans filtre sur
  l'iPad, qui griserait les `.memc`). Le fichier est lu et vérifié en entier
  dans le travailleur de l'écrivain avant de toucher à quoi que ce soit (« Lecture
  du fichier… » au-delà de 2 Mo ; un fichier de 18 Mo s'ouvre sans geler la page,
  mesuré : aucune tâche de plus de 100 ms) : un fichier abîmé (tronqué, ou
  d'un seul bit changé : la somme CRC-32 et la taille de la fin du gzip sont
  vérifiées, et chaque page de l'ordre doit exister avec ses formes), un film
  élève (`.mem`), un fichier d'une version plus récente ou un fichier
  quelconque sont refusés avec une phrase qui dit quoi faire. Puis on le
  **reconnaît** (`src/classeurs/reconnaitre.ts`, pur et testé) :
  - **un nouveau** : « Ouvrir ce classeur ? » : « « Symétrie 2026-10-07
    14h05.memc » : 12 pages, enregistré le mardi 7 octobre 2026 à
    14 h 05. » [Annuler] [Remplacer « Mon tableau »…] [**Ajouter à la
    bibliothèque**] (le focus). Ajouté : sous l'id du fichier s'il est
    libre (aucune fiche, aucune base ; sinon un neuf), sous son nom (celui
    de l'en-tête ; un fichier d'avant le lot 4 : d'après le nom du fichier,
    sans sa date, et « tableau-2026-10-07-14h05 » devient « Tableau du 7
    octobre 2026 »), dans le dossier qu'on regarde dans la bibliothèque (la
    racine depuis le tableau), reçu et modifié à la date du fichier, qui le
    garde depuis (l'état de la sauvegarde le sait) ; puis on y va, sans rien
    perdre de celui-ci (voir « La bibliothèque des classeurs ») : « Classeur
    ajouté à la bibliothèque : « Symétrie » (12 pages). » ;
  - **déjà là** (le même id ; ou, sans id, ou un id inconnu ici, la même
    histoire : un appareil Yjs en commun dans les vecteurs d'état, un
    clientID tiré au hasard sur 32 bits) : « Ce classeur est déjà dans la
    bibliothèque : « Symétrie » (modifié aujourd'hui à 14 h 05). » (ou « Ce
    fichier ressemble au classeur « Symétrie » de la bibliothèque… : ils ont
    la même origine. »), puis la comparaison du fichier et de la base (et,
    s'il est ouvert ici, de ce que l'onglet n'y a pas encore écrit) :
    « Celui de la bibliothèque contient déjà tout ce fichier. » [Ajouter
    quand même comme copie] [**Ouvrir celui de la bibliothèque**] ; « Le
    fichier est plus récent : il contient tout ce que la bibliothèque a de ce
    classeur, et plus. » [Ajouter comme copie] [**Mettre à jour le
    classeur**] ; « Le fichier et celui de la bibliothèque ont changé chacun
    de leur côté. » [Remplacer celui de la bibliothèque…] [**Ajouter comme
    copie**] (un id neuf, « Symétrie (copie) ») : on ne fusionne jamais deux
    histoires qui ont divergé. Une base de cet id présente sans fiche (l'index
    perdu) est d'abord adoptée, puis comparée : rien n'est jamais créé ni
    effacé par-dessus ;
  - **dans la corbeille** : « (Un classeur de même origine est dans la
    corbeille.) », et il s'ajoute sous un id neuf.
  Une **copie** ajoutée ainsi (« Ajouter comme copie », « Ajouter quand même
  comme copie », un classeur de même origine dans la corbeille, un id déjà
  pris ; plusieurs fichiers, une bibliothèque, « Récupérer une sauvegarde du
  Drive » qui passe par le même chemin) se crée comme celle de « Dupliquer
  le classeur » : son registre des publications vidé, et marquée comme copie
  (voir « Dupliquer le classeur ») ; « Ses séances déjà publiées le restent
  depuis l'original : en publier une depuis la copie fait un nouveau lien. »
  (après plusieurs fichiers ou une bibliothèque : « Une copie ne garde pas
  les séances publiées de son original… ») ; de même pour « Remplacer
  « … »… » par le fichier d'un classeur de la corbeille (voir « Remplacer »).
  Un fichier « nouveau », lui (le
  même classeur sur un autre ordinateur), garde son id et son registre :
  republier met à jour le lien déjà donné, comme avant.
- **Mettre à jour le classeur, sans rien perdre** : les onglets ouverts sur
  lui (et, pour le premier, la version d'avant) cessent d'écrire, 300 ms ;
  ouvert ici, ce qui attend s'écrit (le point d'un simple toucher, la piste
  des instruments, les écritures de la base ; une base trouée se répare,
  sinon c'est refusé) et l'onglet se coupe de sa base ; puis le travailleur
  fait UNE transaction : la base relue, fusionnée, doit être encore contenue
  dans le fichier ; alors l'état du fichier y est **ajouté** (sans rien
  effacer : la fusion vaut le fichier, le film reste dans l'ordre du temps) ;
  sinon (un autre onglet a écrit entre la comparaison et le clic) rien n'est
  écrit, et la fenêtre revient sur « … ont changé chacun de leur côté ».
  « « Symétrie » mis à jour depuis le fichier (12 pages). » ; ouvert ici, la
  page se recharge sur lui. Si ce fichier est celui de sa clé (rouvert
  depuis un conflit, voir « L'enregistrement automatique sur la clé »), la
  clé reprend sur lui.
- **Remplacer**. « Remplacer « Mon tableau »… » (un nouveau) mène à la
  question d'avant : elle dit ce qui sera remplacé
  (« Ouvrir ce classeur ? » : « 12 pages, enregistré le mardi 7 octobre 2026
  à 14 h 05. Il remplace le classeur « Mon tableau » de ce navigateur (8
  pages) et tout son historique ») et propose **Enregistrer d'abord** ; si
  le classeur ouvert s'enregistrait sur la clé, elle ajoute
  « L'enregistrement automatique dans « Symétrie.memc » s'arrête : ce fichier
  garde le classeur d'avant. ». Le remplacement se fait d'un bloc dans la
  base du classeur (s'il échoue, faute de place, l'ancien contenu reste
  entier), puis la page se recharge : « Classeur ouvert : 12 pages. ».
  **Remplacer donne au classeur l'identité du fichier** : son id (s'il en a
  un qu'aucun autre classeur de la bibliothèque n'a) et son nom ; sinon (un
  fichier d'avant le lot 4, ou la copie d'un autre classeur d'ici) un id
  neuf, et le nom ne change pas. La base ne change pas (le premier garde
  `mem-tableau-local`) ; l'adresse suit (`?classeur=<id>`), les autres
  onglets rechargent sur la nouvelle identité. Le lien avec la clé et la
  copie du Drive de l'ancien contenu sont retirés : ces fichiers restent les
  sauvegardes du classeur d'avant, et rien de nouveau n'y est écrit (la
  question le dit : « Sa copie sur le Drive reste celle du classeur
  d'avant. » ; un fichier du même classeur, la même identité, garde le lien
  du Drive, dont le garde-fou de l'histoire ne remplace pas la copie d'avant
  par moins qu'elle, voir « La copie sur le Drive »).
  Le fichier d'un classeur **qui est dans la corbeille** (« (Un classeur de
  même origine est dans la corbeille.) ») : le classeur ouvert prend un id
  neuf, l'original pouvant être remis ; il en devient une **copie**, comme
  par « Ajouter » : l'état du fichier, puis, dans la même transaction, la
  petite mise à jour qui vide le registre des publications et le marque
  (`ecrivain-pur.preparerCopie`, préparée dans le travailleur : genre
  `preparer-copie`), et « Classeur ouvert : 12 pages. Ses séances déjà
  publiées le restent depuis l'original : en publier une depuis la copie
  fait un nouveau lien. » Sans cela, l'original remis, republier depuis lui
  une séance de l'original mettrait à jour le lien déjà donné à l'autre
  classe (trouvé en corrigeant « migration », vérifié :
  `lot4/corrections-migration.mjs`, C).
  « Remplacer celui de la bibliothèque… » (deux histoires qui ont divergé)
  pose la même question pour lui (« Enregistrer d'abord » l'écrit depuis sa
  base s'il n'est pas ouvert ici) ; il garde son identité, sa clé continue
  sur le nouveau contenu (« Le fichier « X.memc » de la clé sera remplacé lui
  aussi. », sauf si c'est ce fichier-là), sa copie du Drive aussi.
- **La case Enregistrer automatiquement les changements dans ce fichier**
  (Chrome, Edge ; le fichier vient de `showOpenFilePicker`), cochée : sur
  « Ajouter » (un nouveau, qui garde l'id du fichier), « Ouvrir celui de la
  bibliothèque » ou « Mettre à jour » (s'il n'a pas encore de clé), et dans
  la question de Remplacer, le fichier ouvert devient celui de la clé, et le
  classeur s'y enregistre ensuite tout seul. C'est le geste du poste remis à
  zéro : ouvrir le classeur de la clé. Mais Chrome oublie son accord d'écrire
  dans le fichier dès que la page change (vérifié dans le vrai Chromium, en
  `file://` comme en http : voir « L'enregistrement automatique sur la
  clé », « L'accord du navigateur ») ; ces gestes changent de page (le
  classeur ajouté s'ouvre, le remplacé se recharge) : l'accord n'est donc
  pas demandé dans ce clic (il serait perdu, puis redemandé), mais à
  l'arrivée, une fois la clé vérifiée, et le message dit la vérité : « … Il
  s'enregistre automatiquement dans « Symétrie.memc ». » seulement si le
  navigateur le permet déjà (« Autoriser à chaque visite », donné une autre
  fois) ; sinon « Classeur ajouté à la bibliothèque : « Symétrie » (1 page).
  Pour qu'il s'enregistre tout seul dans « Symétrie.memc », le navigateur
  demande votre accord. » [Autoriser] (avec « Clé en pause » et le bandeau),
  et le clic fait la demande du navigateur (refusée : « Le navigateur n'a pas
  permis d'écrire dans « Symétrie.memc » : l'enregistrement sur la clé reste
  en pause. »). Seul « Ouvrir celui de la bibliothèque » sur le classeur
  ouvert ici reste sur la page : l'accord y est demandé dans le clic. Jamais
  pour une copie (le fichier porte l'id de l'original), ni pour le fichier
  d'un autre classeur de la bibliothèque, ni pour un fichier lâché (pas de
  poignée).
- **Plusieurs fichiers** d'un coup (choisis, ou lâchés ensemble) : chacun est
  lu et reconnu sans rien écrire, puis une seule fenêtre dit tout : « Ouvrir
  ces fichiers ? » « 4 fichiers : 2 classeurs à ajouter ; 1 déjà dans la
  bibliothèque (rien à faire) ; 1 plus récent dans le fichier (mis à jour) ;
  1 illisible : « x.memc » : ce fichier .memc est abîmé. » [Annuler]
  [Ajouter] ; un classeur qui a divergé y est ajouté comme copie (« 1 qui a
  changé des deux côtés (ajouté comme copie) »), un même classeur deux fois
  ne s'ajoute qu'une fois, une bibliothèque (`.memb`) est laissée (elle
  s'ouvre seule). Puis « 3 classeurs ajoutés à la bibliothèque, 1 mis à
  jour. » [Voir la bibliothèque]. Dans un lot, sans question fichier par
  fichier, un fichier qui porte un id inconnu ici est ajouté sous cet id
  même s'il partage une histoire avec un classeur d'ici (c'est le plus
  souvent une copie faite ailleurs, un classeur à part, qu'on ne fusionne
  pas et qu'on n'écarte pas sans le demander) : « ressemble » n'y vaut que
  pour un fichier sans id.
- **Glisser des fichiers** sur la bibliothèque : un cadre pointillé
  « Lâchez pour ajouter à la bibliothèque » tant qu'ils la survolent, puis le
  même chemin ; sur le tableau, de même. Ce qui n'est ni un `.memc` ni un
  `.memb` : « Ce fichier n'est ni un classeur (.memc) ni une bibliothèque
  (.memb). ». On n'ouvre pas de fichier pendant la revue, une séance
  d'automatismes ou une fenêtre ouverte. Sans l'index de la bibliothèque (le
  repli), « Ouvrir un classeur… » remplace le classeur ouvert, comme avant.
- **Les autres onglets.** Un autre onglet ouvert sur le même classeur
  l'apprend aussitôt, cesse d'écrire et le dit : « Le classeur a changé »
  (« Le classeur « Mon tableau » a été remplacé dans un autre onglet… »,
  Recharger) ; si la base du classeur a été supprimée définitivement
  ailleurs : « Le classeur a été supprimé » (Ouvrir la bibliothèque : la
  bibliothèque seule). Un
  seul avis, même si plusieurs messages arrivent. Les onglets se parlent par
  le canal `mem-teachingtool-classeur` (`{ type, base, id }` : un onglet
  ouvert sur un autre classeur n'y voit rien). Le premier classeur parle et
  écoute aussi sur `mem-tableau`, le canal d'avant : un onglet de la version
  d'avant (la clé du lot 3) ouvert sur lui l'apprend, et réciproquement ; la
  version d'avant ne lit que `type: 'remplace'`, la nouvelle y ajoute
  `raison` (`remplace` ou `supprime`). La version d'avant n'est jamais
  prévenue pour un autre classeur (vérifié sur la même origine).
- **Exporter le classeur en PDF…** : toutes les pages, cadrées sur leur
  contenu, en feuilles A4 à imprimer ou à déposer dans l'ENT (voir
  « Exporter en PDF »). Ce n'est pas une sauvegarde : un PDF ne se rouvre pas
  dans MEM.

Le menu commence par l'état de la sauvegarde du classeur (voir « L'état de
la sauvegarde »), dont le dernier enregistrement dans un fichier
(« Dernier enregistrement dans un fichier : aujourd'hui à 14 h 05 », ou
« Jamais enregistré dans un fichier ») ; avant le lot 4 C3, une note au bas
du menu le disait. Le fichier est la passerelle entre la version en ligne
et la version clé USB, et d'une machine à l'autre. Le lecteur des élèves refuse un `.memc`
en disant où l'ouvrir (« Ce fichier est un classeur complet enregistré par
l'enseignant (.memc) : il s'ouvre dans MEM teachingtool, pas ici. … »). Au
démarrage, l'outil demande aussi au navigateur de ne pas vider sa base pour
faire de la place (`navigator.storage.persist()` : Chrome, Edge et Safari
décident seuls, sans rien demander ; Firefox pose la question) ; ce n'est
pas une sauvegarde.

Le fichier : une première ligne de texte,
`{"format":"mem-tableau","v":1,"app":"MEM teachingtool","date":…,"pages":…,"nom":"Symétrie centrale","id":"…"}`,
puis le document Yjs entier, compressé (gzip). Le nom (60 caractères au
plus, sans caractère de contrôle) et l'id (16 caractères hexadécimaux) du
classeur sont à la fin de l'en-tête depuis le lot 4 ; c'est toujours la
version 1 : le format reste en tête, et la version d'avant, qui ne lit que
`format`, `v`, `date` et `pages`, ouvre ces fichiers comme les siens (un
essai le vérifie avec 41d2739, dans les deux sens). L'en-tête tient dans les
4 096 premiers octets, même avec un nom de 60 caractères accentués ou de
guillemets ; `lireEntete` le lit seul, sur un début de fichier, sans rien
décompresser (`lireTableau`, qui vérifie tout, dirait « abîmé » sur un
début). Un nom ou un id qui ne sont pas valables sont ignorés à la lecture.
Le film élève commence lui aussi par `{"format":` ; chaque lecteur reconnaît
le sien à ses premiers octets. Le fichier garde aussi la corbeille des
pages, leurs noms et les copies de pages (qui savent de quelle page elles
héritent leur passé), et les notes du film qui disent ce qui n'est pas un
geste (`seulOrdre`, `naissance`, `rangement`) : une version d'avant les
ignore sans rien casser (une copie y paraît d'un coup au replay, comme une
page neuve ; un essai le vérifie avec la version d'avant le lot 3).
L'en-tête ne compte que les pages de l'ordre, pas celles de la corbeille.
Une copie de page coûte le poids de la page dans le document (environ 400 Ko
pour une page de 300 traits longs), jamais celui de son film : son passé se
relit dans celui de l'original.

Les noms de fichiers (le classeur, l'image copiée, le PDF) se font tous par
une seule fonction, `nomSur` (`src/fichier.ts`) : les blancs réunis,
`\ / : * ? < > |`, les guillemets et les caractères de contrôle remplacés par
« - », ni espace ni point au bout (Windows les refuse), une longueur bornée
(80 caractères pour un classeur, 60 pour une page), et les noms réservés de
Windows (CON, PRN, AUX, NUL, COM1 à COM9, LPT1 à LPT9, seuls ou avant un
point) suivis de « (classeur) » : « CON (classeur) 2026-10-10 14h05.memc ».

## Toute la bibliothèque dans un fichier

Pour changer d'ordinateur, ou garder une copie de tout : un seul fichier
`.memb` avec tous les classeurs (sans la corbeille) et l'arbre des dossiers
(`src/classeurs/archive.ts`, pur et testé ; le chemin :
`src/classeurs/fichiers.ts`).

- **Enregistrer toute la bibliothèque…** (le menu ⋯ du bandeau de la
  bibliothèque : « Un seul fichier .memb avec tous les classeurs (sans la
  corbeille) et les dossiers : pour changer d'ordinateur, ou garder une
  copie de tout. ») : le nom proposé, « Bibliothèque 2026-10-10 14h05.memb »
  (Chrome et Edge demandent où l'écrire, dans le clic ; ailleurs il se
  télécharge). Puis, au fil de l'eau (un classeur à la fois en mémoire) :
  l'index, chaque classeur fabriqué par l'écrivain depuis sa base, hors du
  fil principal (« Bibliothèque : classeur 3 sur 12… » ; le classeur ouvert
  dans l'onglet : ce qui attend s'écrit d'abord), leurs aperçus. Mesuré sur
  30 classeurs dont un de 60 pages de 300 traits : aucune tâche de plus de
  100 ms. « Bibliothèque enregistrée : Bibliothèque 2026-10-10 14h05.memb
  (12 classeurs, 48 Mo). » ; un classeur qui n'a pas pu y être mis est
  nommé. Un échec en route (la clé pleine) : l'écriture est abandonnée, le
  fichier d'avant reste entier, et on le dit. Chaque classeur est ensuite
  « dans un fichier » depuis cette date (l'état de la sauvegarde le sait).
- **Le fichier** est un zip écrit à la main : d'abord `bibliotheque.json`
  (`{ "format": "mem-bibliotheque", "v": 1, "app", "date", "dossiers",
  "classeurs": [{ id, nom, dossier, etiquettes, cree, modifie, pages,
  fichier: "classeurs/<id>.memc", apercu? }] }`, sans vecteurs : les
  comparaisons se calculent à l'ouverture), puis chaque `classeurs/<id>.memc`
  tel qu'« Enregistrer le classeur » l'écrit, puis `apercus/<id>.png`. Les
  entrées sont stockées (un `.memc` est déjà compressé), et chaque en-tête
  porte la somme CRC-32 et la taille de son entrée : aucun descripteur de
  données (celui que le zip en flux de fflate écrit toujours ; relu en flux,
  une entrée qui contient par hasard une signature « PK » y était coupée sans
  rien dire, environ 1,3 % des bibliothèques de 18 Mo, mesuré). Pas de
  ZIP64 : 4 Go et 65 534 fichiers au plus, sinon un refus clair avant
  d'écrire quoi que ce soit. **Renommé en `.zip`, il s'ouvre partout**
  (`unzip -t` le vérifie), et chaque `.memc` qu'on en sort s'ouvre seul
  dans MEM teachingtool.
- **Ouvrir une bibliothèque** : Ctrl + O, « Ouvrir… », ou le fichier glissé
  sur la bibliothèque (un fichier qui commence par `PK` est une
  bibliothèque, quel que soit son nom). Elle se lit par son répertoire
  central : la fin du fichier, puis chaque entrée à la place qu'il dit
  (`File.slice`), sa somme vérifiée ; rien n'est jamais balayé à la
  recherche d'une signature. Un fichier tronqué (sans sa fin) se relit en
  suivant les en-têtes locaux, qui ont leurs tailles : ce qui est entier
  avant la coupure se retrouve. Chaque classeur est lu et vérifié par le
  travailleur (sa tranche, sa somme) et comparé à ce qui est ici
  (« Comparaison… 2 sur 3 »), puis : « Ouvrir cette bibliothèque ? »
  « « …memb » : 12 classeurs et 4 dossiers, enregistrée le …. Déjà dans ce
  navigateur : 3 (ils ne sont pas touchés). À ajouter : 9 (dont 1 comme
  copie : « Symétrie », qui a changé des deux côtés). Illisible : 1 (« x » :
  …). » ; s'il y en a de plus récents dans le fichier, la case, décochée,
  **Mettre aussi à jour les 2 classeurs plus récents dans le fichier (ils
  contiennent tout ce que ce navigateur en a : rien n'est perdu)** (la mise
  à jour se fait comme pour un fichier, voir « Enregistrer et ouvrir un
  classeur ») ; jamais un classeur d'ici remplacé sans elle. [Annuler]
  [Ajouter] (rien à faire : [Fermer]). Les dossiers d'abord : le même id
  qu'un dossier d'ici, on garde celui d'ici ; le même nom sous le même
  parent, on les réunit ; sinon il est créé, avec sa couleur et son
  étiquette de classe. Puis les classeurs, dans leurs dossiers, avec leurs
  étiquettes et leurs aperçus (sous l'id du fichier s'il est libre) ; ce
  qui a divergé, comme copie, nommé « … (copie) ». « Bibliothèque ouverte :
  9 classeurs ajoutés, 2 mis à jour, 1 ajouté comme copie ; 1 illisible
  (« x » : …). » Plus de place en route : ce qui est fait reste, ce qui
  manque est dit (« plus de place dans ce navigateur : 3 classeurs n'ont pas
  été ajoutés (…) »). Dans une bibliothèque, un classeur qui porte un id
  inconnu ici s'ajoute sous cet id, même s'il partage une histoire avec un
  classeur d'ici (une copie faite par « Dupliquer le classeur » : un
  classeur à part).
- **La version d'avant** (la clé du lot 3) refuse un `.memb` avec sa phrase
  (« Ce fichier n'est pas un tableau enregistré par MEM teachingtool
  (fichier .memc). ») : vérifié avec 41d2739.

## L'enregistrement automatique sur la clé

Sur Chrome et Edge, le classeur peut s'écrire tout seul dans un fichier
`.memc` choisi une fois, sur la clé USB du professeur ou dans un dossier
synchronisé (`src/classeurs/cle.ts`). C'est surtout fait pour la version
d'un seul fichier, sur le poste de lycée remis à zéro chaque soir : la clé
garde le classeur, le navigateur peut tout oublier. Ailleurs (Firefox,
Safari, l'iPad), le navigateur ne sait pas écrire seul dans un fichier :
pas d'entrée, la ligne de la clé le dit, et le rappel d'enregistrer (voir
« L'état de la sauvegarde ») invite à Ctrl + S.

- **L'activer.** Menu ⋯ → **Enregistrer automatiquement dans un fichier…**
  (« Sur la clé USB ou dans un dossier : le classeur s'y enregistre tout
  seul, peu après chaque changement. ») ; le rappel d'enregistrer le propose
  aussi (« Enregistrer automatiquement sur la clé… »). Le navigateur demande
  où écrire (le nom proposé : celui du classeur, `Symétrie centrale.memc`) ;
  une première écriture part aussitôt : « Le classeur s'enregistre
  maintenant tout seul dans « Symétrie centrale.memc ». ». Un fichier qui
  existe déjà n'est pris que s'il ne perd rien : un fichier qui n'est pas un
  classeur (« Ce fichier n'est pas un classeur : choisissez un fichier
  .memc, ou un autre nom. »), un autre classeur (« Ce fichier contient un
  autre classeur (« Fractions ») : choisissez un autre nom. »), le même
  classeur avec des changements que celui-ci n'a pas (« … il n'est pas
  remplacé. Pour les retrouver, ouvrez-le (Ctrl + O). ») sont refusés ; le
  fichier d'un autre classeur de la bibliothèque aussi (« Ce fichier sert
  déjà à l'enregistrement automatique de « Fractions » : choisissez un autre
  nom. »). Le même classeur, qui a moins ou autant : accepté. Le fichier
  choisi (sa poignée) est gardé dans l'index de la bibliothèque (le magasin
  `poignees`) ; un navigateur qui ne sait pas l'y ranger le garde le temps de
  l'onglet (« Après un rechargement, il faudra choisir de nouveau le
  fichier. »). Une fois actif, le menu propose **Enregistrer maintenant sur
  la clé** (Ctrl + S), **Enregistrer une copie dans un fichier…** et
  **Arrêter l'enregistrement automatique sur la clé** (le fichier garde le
  classeur tel qu'il était à sa dernière écriture). On l'active aussi en
  ouvrant le fichier de la clé (la case de la fenêtre « Ouvrir ce
  classeur ? », voir « Enregistrer et ouvrir un classeur »).
- **Quand.** 20 secondes après le dernier changement, et au plus tard 2
  minutes après le premier changement pas encore écrit ; seulement au calme
  (aucun geste en cours, aucun point d'un simple toucher qui attend, 1,5 s
  depuis le dernier : jamais pendant un trait, même de 30 s, mesuré avec une
  horloge simulée) ; pas avant 20 fois la durée de l'écriture précédente ;
  tout de suite quand l'onglet passe en arrière-plan. Une écriture à la
  fois ; un changement arrivé pendant elle en appelle une autre. Une
  écriture automatique ne pose jamais le point qui attend (le double-clic au
  Stylo) ; Ctrl + S, lui, le pose, vide la piste des instruments, et écrit
  aussitôt. Tant que le dernier trait n'est pas sur la clé, le texte court
  dit **« Clé : pas encore à jour »** (et la ligne : « Sur la clé
  (Symétrie.memc) : pas encore à jour, les derniers changements partent
  bientôt (dernière écriture il y a 2 min) »), sans point ambre ni bandeau ;
  « Clé : à l'instant » n'est dit qu'une fois tout écrit. Un fichier choisi
  où rien ne s'est encore écrit (la première écriture refusée, puis un
  rechargement) n'est jamais « à jour » : « Sur la clé (Symétrie.memc) : pas
  encore écrit (la première écriture part bientôt) », et il ne compte pas
  comme une sauvegarde (le rappel d'enregistrer peut venir). Le classeur
  ouvert depuis le fichier de la clé, sans changement depuis, est « Clé : à
  jour ».
- **Fermer l'onglet avant l'écriture** (les 20 secondes après le dernier
  trait : la fin du cours). Tant que des changements attendent d'être écrits
  sur la clé par cet onglet, et qu'ils s'y écriront d'eux-mêmes (la clé à
  jour ou en train d'écrire : ni en pause, ni en conflit, ni en échec, ni
  écrite par l'autre onglet), fermer l'onglet ou le navigateur, ou
  recharger, pose la question du navigateur (`beforeunload` : « Quitter le
  site ? »), et l'écriture part aussitôt, sans attendre le calme. Rester
  (« Annuler ») : le trait est sur la clé en un instant (mesuré : moins d'une
  seconde après la question, au lieu de 20 s, aussi en `file://` avec un
  vrai fichier du disque), et fermer de nouveau ne demande plus rien.
  Quitter quand même : pendant la question, la page ne fait plus rien
  (mesuré : ni le fil principal, ni un travailleur qu'on y lancerait), rien
  ne peut donc s'écrire ; rien n'est perdu dans ce navigateur, et la
  prochaine ouverture du classeur l'écrit sur la clé (« Clé : pas encore à
  jour », puis l'écriture). Une déconnexion de la session Windows, elle, ne
  laisse pas poser de question : le texte court est là pour le voir avant.
  La question n'est posée que pendant ce temps-là (elle empêcherait sinon
  certains navigateurs de garder la page en mémoire), jamais quand on part
  par la bibliothèque (elle attend l'écriture, 10 s au plus, ou « Ouvrir
  sans attendre »), ni quand le classeur est remplacé ou supprimé. Le
  délai de 20 s ne change pas (essai : `lot4/corrections-sauvegardes.mjs`,
  A et F).
- **Comment.** Le fichier se fabrique dans le travailleur de l'écrivain,
  depuis la base du classeur, jamais sur le fil principal : 60 pages de 300
  traits (18 Mo), aucune tâche de plus de 100 ms (mesuré). Puis il s'écrit
  d'un bloc (`createWritable`, `write`, `close` : Chrome écrit à côté, puis
  remplace ; si l'écriture échoue en route, le fichier d'avant reste entier).
  Le classeur est dans un fichier depuis cette date (la date du dernier
  enregistrement le note). Si le travailleur manque, rien ne s'écrit seul :
  « ce navigateur ne permet pas d'écrire le fichier en arrière-plan :
  enregistrez le classeur (Ctrl + S) » ; Ctrl + S écrit quand même sur la
  clé. Pendant un trou de la base (voir « Les classeurs : où ils vivent »),
  rien ne s'écrit seul non plus (une base trouée ne fait pas de fichier) :
  Ctrl + S écrit sur la clé depuis la mémoire de l'onglet, et l'écriture
  automatique reprend quand la base est réparée.
- **Les garde-fous.** Avant chaque écriture, l'en-tête du fichier (ses 4 096
  premiers octets, rien d'autre) doit être celui de ce classeur à la date
  écrite d'ici ; sinon il n'est pas remplacé, et l'état le dit : « Le
  fichier « Symétrie.memc » contient un autre classeur (« Fractions ») : il
  n'est pas remplacé. », ou « Le fichier de la clé a été modifié ailleurs
  (le mardi 7 octobre 2026 à 21 h 30) depuis le dernier enregistrement d'ici :
  il n'est pas remplacé. » (le poste resté sur une version ancienne
  n'écrase pas le travail du soir). Un fichier d'avant le lot 4, sans id, est
  accepté s'il a la bonne date. Puis le fichier fabriqué doit contenir tout
  ce qui a été écrit la dernière fois (son vecteur d'état contient le
  précédent) : sinon « Ce classeur a perdu une partie de son histoire depuis
  le dernier enregistrement sur la clé (remplacé par une autre version de
  MEM teachingtool, ou une écriture refusée par le navigateur) : le fichier
  « Symétrie.memc » n'est pas remplacé. ». C'est ce qui protège la clé quand
  la version d'avant (la clé du lot 3), ouverte sur la même machine,
  remplace le premier classeur par son « Ouvrir » (vérifié avec 41d2739 :
  la nouvelle version, rechargée, le dit aussitôt et ne réécrit pas le
  fichier, même à Ctrl + S, qui enregistre alors une copie). Un conflit
  propose **Ouvrir le fichier de la clé** (lot 4 C9 ; sauf pour un fichier
  qui n'est plus un classeur : le même chemin qu'« Ouvrir un classeur »,
  le fichier comparé à ce classeur ; plus récent, « Mettre à jour le
  classeur » sans rien perdre, et la clé reprend sur lui, à sa date ; s'il
  n'a rien de plus, « Ouvrir celui de la bibliothèque » fait reprendre la
  clé, qui le remplacera par ce classeur, qui a tout et plus ; chacun a
  changé de son côté : « Ajouter comme copie », ou « Remplacer celui de la
  bibliothèque… »), **Choisir un autre fichier…** et **Remplacer quand même** (après
  une question : « … ce qu'il contient de plus sera perdu. Pour le garder,
  choisissez plutôt un autre fichier, ou ouvrez-le (Ctrl + O). »).
- **Les échecs.** Rien n'est perdu : la base du navigateur garde tout. La
  clé retirée ou le fichier déplacé (« la clé n'est plus là, ou le fichier a
  été déplacé »), la clé pleine (« la clé est pleine »), un fichier en lecture
  seule ou ouvert dans Word ou OneDrive (« le fichier est en lecture seule,
  ou ouvert dans un autre logiciel ») : le bandeau le dit (« L'enregistrement
  sur la clé a échoué (la clé est pleine). Rien n'est perdu. » [Choisir un
  autre fichier…] ×), l'état aussi (« Clé : pas à jour »), et l'écriture se
  réessaie seule après 30 s, 1 min, 2 min, puis toutes les 5 minutes ; à la
  reprise : « Enregistrement sur la clé repris. ».
- **L'accord du navigateur.** Vérifié dans le vrai Chromium (sous Xvfb, en
  `file://` comme en http, `lot4/CF1-vrai-chrome.mjs`) : Chrome oublie
  l'accord d'écrire dans le fichier dès que la page change, et chaque
  classeur est une page : un rechargement, un autre classeur ouvert depuis
  la bibliothèque, puis le retour, remettent la clé en pause, sauf si l'on
  a choisi **« Autoriser à chaque visite »** dans sa demande. Alors le
  rechargement, les changements de classeur, et même le navigateur relancé
  (le même profil) gardent l'accord. C'est le conseil, dit pendant que le
  navigateur pose sa question : « Dans la demande du navigateur, choisissez
  « Autoriser à chaque visite » s'il le propose : il ne la refera plus à
  chaque changement de classeur. » (sa demande d'après un changement de page
  le propose ; s'il n'avait que lu le fichier, une seconde demande suit,
  « Enregistrer les modifications apportées à « … » ? »). Sur le poste remis
  à zéro chaque soir, le profil est neuf chaque matin : une fois par jour.
- **Après un rechargement** (ou un changement de classeur) sans cet accord
  gardé : l'enregistrement se met en pause (« Clé en pause ») et un bandeau
  discret le dit : « L'enregistrement sur la clé attend votre accord. »
  [Reprendre l'enregistrement sur la clé]. Le clic (ou Ctrl + S) demande
  l'accord, puis l'écriture due part. Rien n'est jamais demandé sans un
  clic ; un accord gardé par Chrome (« Autoriser à chaque visite ») : tout
  repart seul. Un classeur ajouté, ouvert, remplacé ou créé avec la case de
  la clé le dit en arrivant, avec [Autoriser] (voir « Enregistrer et ouvrir
  un classeur » ; jamais « Il s'enregistre automatiquement » sans l'accord ;
  vérifié avec des permissions simulées comme celles de Chrome :
  `lot4/CF1-accord.mjs`).
- **Deux onglets** sur le même classeur : un seul écrit (Web Locks,
  `mem-teachingtool-cle:<id>`) ; l'autre dit « Clé : par l'autre onglet »,
  annonce ses changements à celui qui écrit (au plus toutes les 5 s), et
  prend la suite quand il se ferme : il compare alors la base (qui a tout ce
  que le premier a écrit) et sa mémoire, réunies, à ce qui est sur la clé.
  Si celui qui écrit est en pause, en conflit ou en échec, l'autre le dit
  (« Clé : pas à jour », « l'autre onglet ouvert sur ce classeur attend
  votre accord pour écrire sur la clé… ») au lieu de « par l'autre onglet ».
  Ils se parlent sur le canal des classeurs (`mem-teachingtool-classeur` :
  `{ type: 'change', base }`, `{ type: 'etat-cle', base, etat, message }`, et
  `{ type: 'etat-cle?', base }` pour le demander). Deux classeurs ont deux
  fichiers, chacun écrit par son onglet.
- **Dans la version d'un seul fichier** (`file://`), Chromium a
  `showSaveFilePicker`, `showOpenFilePicker`, les Web Locks et le travailleur
  intégré (vérifié) : tout marche de même. Avec un écran (Xvfb), les vraies
  fenêtres GTK et de vrais fichiers sur le disque (`lot4/CF1-vrai-chrome.mjs`) :
  il range la poignée d'un vrai fichier choisi en `file://`, et la retrouve
  après un rechargement ou un changement de classeur (l'accord, lui, comme
  plus haut). S'il ne la rangeait pas, le fichier serait à choisir de
  nouveau après un rechargement, et la ligne de la clé le dirait.

À essayer en classe : Chrome, puis Edge, sur le poste ; la vraie clé
(activer, écrire quelques traits, regarder l'heure de « Clé : … ») ; la
retirer pendant le cours (le bandeau, « Rien n'est perdu »), la remettre
(« Enregistrement sur la clé repris. » dans les 5 minutes) ; recharger la
page, puis « Reprendre l'enregistrement sur la clé », et dans la demande de
Chrome « Autoriser à chaque visite » (puis changer de classeur : la clé ne
se remet plus en pause) ; ouvrir le fichier de la clé sur le poste remis à
zéro, avec la case : à l'arrivée, [Autoriser].

## La copie sur le Drive

À côté de la clé, une copie de chaque classeur part sur le Drive du
professeur, à sens unique (lot 4 C10, choix b : la sauvegarde automatique
va aux deux endroits ; `src/classeurs/copie-drive.ts`, et
`src/classeurs/drive-pur.ts`, pur et testé, pour ce qui se décide sans
réseau ; l'envoi lui-même dans `src/publication/drive.ts`). Elle protège
le classeur d'un navigateur qui oublie tout, et marche aussi là où la clé
ne s'écrit pas seule (Firefox, Safari, l'iPad) ; mais seulement depuis la
version en ligne : la connexion Google ne marche pas dans la version clé
USB, et l'état le dit (« Sur le Drive : seulement depuis la version en
ligne (la connexion Google ne marche pas dans la version clé USB) »).

- **Où.** Dans le Drive choisi pour le classeur (menu ⋯ → **Copie sur le
  Drive…** : « Drive personnel », « Drive du lycée », « Pas de copie pour ce
  classeur », et la case « Utiliser ce choix pour tous les classeurs qui
  n'en ont pas » ; le Drive personnel au départ), dans un dossier **privé**
  à part : « MEM - Sauvegardes » ou « LFB - Sauvegardes ». Il porte sa
  propre marque (`memSauvegardes`, avec `memCompte`), jamais celle des
  replays (`memReplay`) : ni Publier ni la copie ne prennent le dossier de
  l'autre, même renommé à la main (il reprend son nom), et un dossier partagé
  est refusé, comme celui des replays. Le relais ne le sert jamais : ni ce
  dossier (pas dans sa liste `DOSSIERS`), ni l'extension `.memc`, ni ce
  contenu (il commence par `{"format":"mem-tableau"`) ; un test le vérifie
  dans le bac à sable du relais, même pour un `.memc` renommé `x.mem` et
  rangé dans « MEM - Replay séances ». La fenêtre « Copie sur le Drive… »
  montre aussi le compte connecté, [Se connecter à Google], la taille de la
  copie (« La copie fait 3,2 Mo (aujourd'hui à 14 h 05) ; le Drive en garde
  les 10 dernières versions. ») ; dans la version clé USB, elle est grisée
  (« Seulement depuis la version en ligne (mathsetmoi.github.io). »).
- **Le même fichier.** Chaque copie remplace le même fichier
  (« Symétrie centrale.memc », `application/octet-stream`, sa description
  « Sauvegarde automatique de MEM teachingtool. Pour l'ouvrir : Bibliothèque
  → ⋯ → Récupérer une sauvegarde du Drive. »), retrouvé par son id, sinon,
  dans le dossier, par la marque du classeur (`memClasseur`, une copie faite
  depuis un autre onglet ou un autre ordinateur) ; un nouveau seulement s'il
  n'existe plus, est à la corbeille du Drive, ou a quitté le dossier. Jamais
  de suppression du fichier. Jusqu'à 5 Mo, une seule requête (multipart, le
  contenu binaire tel quel) ; au-delà, l'envoi reprenable (la session, puis
  le fichier ; la session se lit dans `Location` ou se refait avec
  `X-GUploader-UploadID`). Ses marques : `memSauvegarde` (v1), `memClasseur`
  (l'id), `memOrigine` (cet appareil : ce navigateur, tiré une fois), `memT`
  (la date de son contenu).
- **Les versions.** Le Drive garde lui-même les versions précédentes d'un
  fichier ; on n'en retient que les **10 dernières** (`elaguerVersions`, au
  mieux : la dernière n'est jamais effacée, ni une version gardée à la main
  dans Google Drive, « Conserver indéfiniment »). Chaque version contient
  déjà toute l'histoire d'avant elle (le document garde tout) : dix
  suffisent. La raison : les versions d'un fichier binaire comptent dans la
  place du compte (à vérifier sur le vrai compte) ; cent versions de 18 Mo
  feraient 1,8 Go par gros classeur, sur un Drive personnel de 15 Go partagé
  avec Gmail, et un Drive plein arrêterait aussi Publier.
- **Quand.** 2 minutes après le dernier changement, au plus tard 10 minutes
  après le premier pas copié ; au plus une fois par max(10 min, 1 min par
  Mo, 20 fois la durée du dernier envoi) (un gros classeur sur un réseau
  lent ne prend pas toute la bande) ; seulement au calme (jamais pendant un
  trait) ; aussi quand l'onglet passe en arrière-plan. Le fichier se
  fabrique dans le travailleur, depuis la base (jamais sur le fil principal ;
  une base trouée ne se copie pas). On ne quitte jamais un classeur en
  attendant le Drive : les **classeurs en retard** (changés depuis leur
  dernière copie, ou jamais copiés, et dont la copie va sur le Drive
  connecté) se copient depuis leur base, un à la fois, quand rien d'autre
  n'est en cours, depuis n'importe quel classeur ouvert ; pas un classeur
  vide jamais copié (le « Premier classeur » d'un navigateur neuf, chaque
  matin sur le poste remis à zéro, ne fait pas un fichier de plus sur le
  Drive). Un seul onglet copie un classeur à la fois (Web Locks,
  `mem-teachingtool-drive:<id>` ; sans eux, Safari avant 15.4, Firefox avant
  96, sans verrou : c'est le même fichier) ; une copie faite dans un autre
  onglet compte dans celui-ci.
- **Fermer l'onglet avant la copie** (les 2 minutes après le dernier trait :
  la fin du cours), quand rien d'autre ne protège le classeur (pas de clé
  qui s'écrive, ici ou dans l'autre onglet : Firefox, l'iPad, Chrome sans
  clé). Avant le contrôle final du lot 4, rien ne le demandait : l'onglet
  fermé 30 s après le dernier trait, le Drive ne l'a jamais eu, et sur un
  poste remis à zéro chaque soir plus rien ne l'avait le lendemain. Comme
  pour la clé : fermer l'onglet ou le navigateur, ou recharger, pose la
  question du navigateur (`beforeunload`), seulement pendant qu'une copie
  attend et qu'elle partirait d'elle-même (connecté, en ligne), et la copie
  part aussitôt, sans attendre le calme ni le rythme. Rester : elle est sur
  le Drive en un instant (mesuré avec Google simulé : 0,3 s). Quitter quand
  même : la page ne peut plus rien envoyer ; rien n'est perdu dans ce
  navigateur, et la prochaine ouverture, connectée, fait la copie. Pas de
  question avec la clé à jour (elle protège le classeur ; écrite ou en
  attente, elle pose la sienne), sans connexion Google, ni en partant par la
  bibliothèque (les classeurs en retard se copient depuis le suivant) ou en
  connaissance de cause (`drive-pur.questionDuDrive` ; essai
  `lot4/CF2-drive-fermer.mjs`).
- **La connexion.** La même que Publier (le droit `drive.file`, le choix du
  compte) ; elle se charge à l'avance, peu après l'ouverture du classeur,
  pour que le clic sur « Se connecter à Google » ouvre la fenêtre du premier
  coup. **Jamais de fenêtre Google sans un clic.** Le jeton dure environ une
  heure : expiré, la copie attend (« Sur le Drive : en attente de la
  connexion Google », [Se connecter à Google] sur la ligne du Drive). Le
  bandeau « La copie sur le Drive attend la connexion Google. » [Se
  connecter à Google] ne paraît que si rien d'autre ne protège le classeur,
  qu'une copie attend, et après 2 minutes sans geste ; avec la clé à jour,
  ce n'est qu'une ligne d'information, ni bandeau ni point (le jeton expire
  en plein cours). Le clic : Google reprend le compte habituel sans
  redemander (`login_hint`, sans la liste des comptes : un seul clic), la
  copie qui attend part aussitôt (au calme). Ce compte est, dans l'ordre, le
  dernier connecté sur ce Drive depuis cet ordinateur (par la copie ou par
  Publier : c'est le même jeton ; retenu sous une clé à la copie,
  `mem-teachingtool-drive-compte:<compte>`, sans toucher à ce que retient
  Publier pour son avertissement de compte), celui de la dernière copie de
  ce classeur (sa fiche le garde : un poste dont on a vidé les réglages le
  retrouve), sinon celui de Publier ; sans aucun, la liste de Google
  (`select_account`), comme pour « Changer de compte Google ». Un seul jeton,
  celui d'un compte, partagé avec Publier : publier dans l'autre Drive met la
  copie en attente (voulu : une seule connexion à la fois) ; et il est à
  l'onglet. **Il suit l'onglet d'un classeur à l'autre** : changer de
  classeur recharge la page, et le jeton (valable environ une heure) la
  traverse par la mémoire de l'onglet (`sessionStorage`, clé
  `mem-teachingtool-connexion-google`, avec son expiration, son compte et le
  courriel), écrit juste avant de partir (la bibliothèque, « Ouvrir un
  classeur », « Remplacer », « Recharger » après un changement ailleurs, une
  page rendue par le cache du navigateur) et effacé dès que la page suivante
  l'a lu ; jamais dans `localStorage`, jamais dans l'adresse, jamais repris
  expiré ni pour un compte inconnu ; « Se déconnecter » (ou un refus 401)
  l'efface aussi. Arrivé connecté, la copie du nouveau classeur part sans un
  clic, et les classeurs en retard (dont celui qu'on vient de quitter, changé
  juste avant) se copient d'ici 30 s plus tard. C'est le seul endroit où le
  jeton est écrit (la règle du lot 2, « jamais écrit », est assouplie pour
  cela : à défaut, la copie s'arrêtait à chaque changement de classeur, et en
  silence quand la clé enregistrait) ; pendant ce rechargement, une autre
  page du même site ouverte dans ce même onglet pourrait le lire (le droit
  `drive.file` ne donne que les fichiers créés par MEM teachingtool). Pour
  revenir à la règle stricte, il suffit de ne plus appeler
  `passerLaConnexion` (`src/publication/drive.ts`). Un autre onglet, ou la
  page rechargée (F5), se reconnecte d'un clic, comme avant.
  Le mauvais compte Google : le courriel est montré (« Sur le Drive personnel
  (prof@lycee.fr) : … ») ; c'est celui où est vraiment la dernière copie.
  Connecté ensuite avec un autre compte (« Changer de compte Google », ou
  Publier), la ligne le dit : « Sur le Drive personnel : dernière copie sur
  prof@gmail.com (il y a 1 min) ; connecté avec autre@gmail.com : la
  prochaine ira là », et rien ne compte comme copié sur ce compte-là (ni la
  protection, ni le texte court) jusqu'à sa première copie ; « Copie sur le
  Drive… » le dit aussi (« La dernière copie, sur prof@gmail.com, fait … ;
  la prochaine ira sur autre@gmail.com. »).
- **Sans travailleur** (l'écrivain passé sur le fil principal, par exemple
  après un Ctrl + S quand le travailleur n'a pas démarré) : la copie ne se
  fait plus seule, et la ligne le dit dès qu'une copie attend (« Sur le
  Drive : ce navigateur ne permet pas de faire la copie en arrière-plan »),
  au lieu de « la première copie part bientôt ».
- **Les échecs.** Rien n'est perdu (la base du navigateur garde tout) ; la
  ligne du Drive le dit, sans jamais d'heure après un échec : hors connexion
  (« … la copie partira au retour du réseau », et elle part), un réseau qui
  filtre Google (« Google Drive ne répond pas (le réseau filtre peut-être
  Google) »), le Drive plein (« le Drive est plein : libérez de la place dans
  Google Drive »), trop long (« Google Drive met trop de temps à répondre
  (réseau lent ?) ») ; on réessaie seul après 1, 2, 5, puis toutes les 10
  minutes (« Copie sur le Drive reprise. »). La connexion refusée (401) :
  déconnecté, la copie attend un clic.
- **Les garde-fous**, sans rien remplacer : la copie du Drive mise à jour
  **depuis un autre ordinateur** (une autre `memOrigine`) avec un contenu
  plus récent que l'arrivée de ce classeur ici (`memT` après `recu`, ou sa
  création) : « La copie du Drive a été mise à jour depuis un autre
  ordinateur (le … à …) : elle n'est pas remplacée. » (le soir à la maison,
  le matin au lycée sur le classeur de la veille) ; ce classeur a **perdu
  une partie de son histoire** depuis la dernière copie (le fichier envoyé
  ne contient pas tout ce qu'elle avait) : « Ce classeur a perdu une partie
  de son histoire depuis la dernière copie sur le Drive : elle n'est pas
  remplacée. ». Les deux : un bandeau [Récupérer la copie du Drive] [Remplacer
  quand même] (et les mêmes boutons sur la ligne du Drive). **Récupérer** la
  télécharge et l'ouvre par le chemin d'« Ouvrir un classeur » : plus récente
  que celui-ci, « Mettre à jour le classeur », sans rien perdre ; chacun a
  changé de son côté, « Ajouter comme copie » ou « Remplacer celui de la
  bibliothèque… ». **Remplacer quand même** demande d'abord (« … Ce qu'elle a
  de plus ne restera que dans les versions précédentes que garde Google
  Drive (les 10 dernières). »). Le poste remis à zéro, en ligne, qui rouvre le
  matin le fichier de la clé : il arrive à la date de ce fichier, et la copie
  de la veille (pas plus récente que lui) se remplace sans conflit.
  « Remplacer » (la question du lot 1) dit « Sa copie sur le Drive reste
  celle du classeur d'avant. » : avec une autre identité, le lien du Drive
  s'en va (une nouvelle copie, un autre fichier) ; avec la même (un fichier
  du même classeur), il reste, et le garde-fou de l'histoire ne remplace pas
  la copie d'avant par moins qu'elle.
- **Récupérer une sauvegarde du Drive** (le menu ⋯ du bandeau de la
  bibliothèque ; `src/classeurs/recuperer.ts`) : la seule chose qui revient
  du Drive, sur demande. Le choix du Drive, [Se connecter et voir les
  sauvegardes] (la connexion dans ce clic), la liste du dossier des
  sauvegardes, la plus récente d'abord (« Symétrie centrale », « modifiée
  aujourd'hui à 14 h 05 · 3,2 Mo », « déjà dans la bibliothèque ») ; celle
  qu'on choisit se télécharge (« Téléchargement… »), puis s'ouvre par le
  chemin d'« Ouvrir un classeur » : un **nouveau** classeur, ou, déjà là,
  comparée (ouvrir celui de la bibliothèque, le mettre à jour sans perte,
  ajouter une copie). Grisé dans la version clé USB.

À essayer une fois pour de vrai, sur le vrai compte : un classeur de plus de
5 Mo (l'envoi reprenable), puis, dans Google Drive, le dossier « MEM -
Sauvegardes », les versions du fichier (Gérer les versions : dix au plus) et
la place qu'elles prennent ; laisser le jeton expirer (une heure), puis
« Se connecter à Google » ; « Récupérer une sauvegarde du Drive » sur un
autre poste.

## L'état de la sauvegarde

Où est enregistré le classeur qu'on regarde, et depuis quand : toujours
visible, lisible d'un coup d'œil, et jamais « enregistré » quand ce n'est
pas vrai (`src/classeurs/etat.ts`, pur et testé ; `src/classeurs/surveillance.ts`
le tient à jour).

- **Le bouton du classeur**, à gauche de la barre du haut : l'icône (deux
  classeurs), le nom du classeur en gras (coupé, entier dans son titre), et
  dessous, en petit et en gris, l'état en quelques mots : « Clé : il y a 2
  min », « Drive : il y a 10 min », « Fichier : il y a 25 min », « Seulement
  dans ce navigateur », « Clé en pause », « Clé : pas à jour », « Drive en
  attente », « Pas enregistré ! » (28 caractères au plus, le premier qui
  s'applique, dans cet ordre de gravité) ; « Clé : pas encore à jour » tant
  que le dernier trait n'est pas sur la clé (jamais l'heure de la dernière
  écriture à sa place), « Clé : à jour » pour un classeur ouvert depuis le
  fichier de la clé, sans changement depuis. Quand il faut y regarder, un
  **point ambre** de 8 px sur l'icône, immobile : ni animation, ni
  transition, au vidéoprojecteur toute l'heure. Le lecteur d'écran y lit
  « Classeur « Symétrie centrale » : ouvrir la bibliothèque », puis toutes
  les lignes de l'état (un texte caché, `aria-describedby`). Il est inerte,
  comme les autres barres, pendant la revue, une séance et la trieuse. Un
  clic (Entrée, Espace au clavier) ouvre la bibliothèque des classeurs (voir
  « La bibliothèque des classeurs ») ; « Bibliothèque des classeurs… », en
  tête du menu ⋯, aussi (c'est le seul chemin quand le bouton est caché).
  Espace ne l'ouvre que si le focus est venu au bouton par le clavier (Tab,
  ou la bibliothèque ouverte et fermée au clavier) et qu'aucun appui n'a
  suivi. Ouverte d'un clic, puis fermée par ×, par Échap ou par la carte du
  classeur ouvert, le focus revient au bouton, mais Espace + glisser (à la
  souris, à la plume, ou par une touche de la Wacom réglée sur Espace)
  déplace la vue, comme sur les autres boutons de la barre. D'où vient le
  focus se retient quand il arrive (`focusVenuDuClavier`, `src/menus.ts`),
  jamais à la touche : Chrome rend alors `:focus-visible` le bouton, même
  cliqué.
- **Sa place est mesurée**, entre la barre des outils et la barre du haut
  (place = bord gauche de la barre du haut − bord droit de la barre des
  outils − 24) : assez pour que le plus long des textes courts de l'état
  y tienne entier (« Seulement dans ce navigateur » : 184 px de texte, 252
  en tout, mesurés dans sa police), sa propre barre, à 12 px de la barre des
  outils, avec le nom et l'état (1366 × 768 : 424 px ; 1280 × 720 : 338 ;
  un TNI en 1920 : 978 ; l'iPad 11 pouces en paysage, 1194 × 834 : 252) ;
  de 58 px à cette place, l'icône et le point (1024 × 768 : 82 ; 1180 ×
  820 : 238 et 1112 × 834 : 170, où « Seulement dans ce navig… » était
  coupé ; une fenêtre de 1100 à 1190 px) ; moins, quand la barre du haut est déjà sur
  plusieurs rangées (les tablettes, les téléphones), il devient son premier
  bouton, s'il n'y ajoute pas de rangée ; sinon il se cache, et le bouton ⋯
  porte le point, son titre nomme le classeur (« … · Classeur « Symétrie
  centrale » ») et son menu commence par l'état. C'est le cas à 1024 × 768
  dès qu'une page du classeur a un nom : le compteur du lot 3 prend alors la
  place jusqu'au bord de la barre des outils (−5 px), et la barre du haut,
  avec le nom de la page plus petit, reste exactement celle du lot 3 ; de
  même à 960 × 600, où l'insérer ajouterait une rangée. Il se place aux
  seuls moments où le compteur se règle (la fenêtre qui change, la police
  qui arrive, le premier nom de page) : jamais d'une page à l'autre.
- **Au téléphone en portrait**, la barre du haut passe sur plusieurs
  rangées (trois sur un iPhone 12 ou un Pixel 5 : jusqu'à y = 162 ; quatre
  sur un iPhone SE). La barre des outils, posée en bas, s'arrête 12 px sous
  son bas MESURÉ (`--bas-barre-haut`, suivi par un ResizeObserver et à
  chaque changement de taille de la fenêtre), et défile s'il le faut : avant
  (depuis le lot 2, vu en C3), elle montait jusqu'à y = 128, sous la barre
  du haut, et un toucher au centre du bouton Stylo ne l'atteignait pas
  (contrôle final du lot 4 ; essai `lot4/CF3-telephone.mjs` : iPhone 12,
  Pixel 5, iPhone SE, Galaxy S8, en paysage, iPad, PC, TNI, et la fenêtre
  qui change de largeur).
- **Le menu ⋯** commence par le bloc du classeur : son nom, puis une ligne
  par endroit, dans l'ordre : « Enregistré dans ce navigateur » (ou « Ce
  navigateur n'enregistre plus ce classeur (plus de place ?) : enregistrez-le
  dans un fichier (Ctrl + S). ») ; la clé (« Sur la clé (Symétrie.memc) : il
  y a 2 min », « Sur la clé : en pause, le navigateur attend votre
  accord », « Sur la clé : » et ce qui a échoué, suivi de « Rien n'est perdu :
  le classeur est dans ce navigateur ; l'enregistrement reprendra dès que
  possible. » quand c'est vrai, « Pas d'enregistrement automatique sur une
  clé », « Ce navigateur ne sait pas enregistrer tout seul dans un fichier :
  enregistrez le classeur (Ctrl + S) de temps en temps. ») ; le Drive (« Sur
  le Drive personnel (prof@gmail.com) : il y a 10 min », « Sur le Drive : en
  attente de la connexion Google », « … hors connexion, la copie partira au
  retour du réseau », « … seulement depuis la version en ligne (la connexion
  Google ne marche pas dans la version clé USB) », « Pas de copie sur le
  Drive », « Sur le Drive personnel (prof@gmail.com) : la première copie part
  bientôt », « … rien à copier pour l'instant » : jamais « à jour » sans
  copie faite ; ce qui a échoué ; les garde-fous, voir « La copie sur le
  Drive ») ; le fichier (« Dernier enregistrement dans un fichier :
  aujourd'hui à 14 h 05 », ou « Jamais enregistré dans un fichier »). Une
  pastille verte dit ce qui est à jour, une ambre ce qu'il faut regarder ;
  une ligne qui demande quelque chose porte son bouton (une entrée du menu,
  que les flèches atteignent) : « Enregistrer le classeur » pour le
  navigateur en erreur ou le rappel ; pour la clé, « Reprendre
  l'enregistrement sur la clé », « Choisir un autre fichier… », « Remplacer
  quand même » (voir « L'enregistrement automatique sur la clé ») ; pour le
  Drive, « Se connecter à Google », « Récupérer la copie du Drive »,
  « Remplacer quand même » (voir « La copie sur le Drive »). Les dates : « à l'instant », « il y a 7 min » pendant une heure,
  puis « aujourd'hui à 14 h 05 » ; jamais « il y a » après un échec (l'heure
  d'une écriture réussie avant n'est plus celle du classeur). Le raccourci
  que donnent ces textes (et les messages du lot 4) est celui que montre le
  menu ⋯ : Ctrl + S, Ctrl + O sur le PC, ⌘ + S, ⌘ + O sur Mac et sur l'iPad
  à clavier ; sur un appareil qu'on ne fait que toucher (ni souris, ni pavé,
  ni stylet : l'iPad sans clavier, la tablette Android, le téléphone),
  l'entrée du menu à la place, « (menu ⋯ → Enregistrer le classeur) »,
  « (menu ⋯ → Ouvrir un classeur) » (`POUR_ENREGISTRER`, `POUR_OUVRIR`,
  `src/navigateur.ts`).
- **Le bandeau discret**, une ligne sous le bouton du classeur (ou sous la
  barre du haut, à droite, quand le bouton y est ou qu'il est caché), 13 px,
  360 px au plus, jamais animé, jamais sous la barre des outils (sur un
  téléphone en portrait, la barre du haut va d'un bord à l'autre : il
  s'arrête à 8 px à droite de la barre des outils, qui en cachait le début
  du texte et des boutons), caché pendant la revue, une séance et la
  trieuse. Il ne paraît que pour ce qui demande un clic : « Ce navigateur
  n'enregistre plus ce classeur. » [Enregistrer le classeur], sans × ; le
  rappel (plus bas) ; la clé en pause (« L'enregistrement sur la clé attend
  votre accord. » [Reprendre l'enregistrement sur la clé]), un fichier de la
  clé qui n'est pas remplacé (le conflit, ses deux boutons), une écriture sur
  la clé qui a échoué (« … Rien n'est perdu. » [Choisir un autre
  fichier…]), un fichier de la clé que le navigateur n'a pas gardé
  (« Choisissez de nouveau le fichier de la clé : ce navigateur ne l'a pas
  gardé. » [Enregistrer automatiquement sur la clé…], la ligne de la clé
  passe alors en attention, avec le point) ; la copie du Drive qui n'est pas
  remplacée (un autre ordinateur, l'histoire perdue : [Récupérer la copie du
  Drive] [Remplacer quand même]) ; la copie qui attend la connexion Google
  (« La copie sur le Drive attend la connexion Google. » [Se connecter à
  Google], seulement sans clé à jour, avec une copie qui attend, après 2
  minutes sans geste ; une fois paru, il reste quand on se remet à écrire).
  × le cache pour la session (le
  rappel : pour une heure). Le lecteur d'écran le lit à
  son apparition (`role="status"`).
- **Le rappel d'enregistrer**, partout où rien ne protège le classeur : ni
  une clé à jour, ni une copie du Drive de moins de 15 minutes. C'est le cas
  sous Firefox, Safari, sur l'iPad, mais aussi sous Chrome et Edge sans
  enregistrement automatique, et surtout dans la version d'un seul fichier,
  sur le poste remis à zéro, où le Drive est impossible. Après au moins 20
  minutes de travail non enregistré dans un fichier (du premier changement
  après le dernier fichier au dernier changement ; au démarrage, le film le
  dit), et seulement après 2 minutes sans geste ni touche, jamais en plein
  cours : « Pas encore enregistré dans un fichier depuis 25 min de travail. »
  [Enregistrer le classeur] ×. Le point ambre paraît avec lui. Une fois
  paru, il reste quand on se remet à écrire, jusqu'à ce qu'on enregistre ou
  qu'on le ferme ; au plus une fois par heure ; × le fait taire une heure.
  Sur Chrome et Edge, il propose aussi [Enregistrer automatiquement sur la
  clé…].
- **Le trou réparé.** Une écriture refusée par la base (voir « Les
  classeurs : où ils vivent ») passe l'état en « Pas enregistré ! », avec le
  bandeau ; une promesse de la base rejetée faute de place
  (`QuotaExceededError`, que lib0 enveloppe dans une `Error`) aussi. Ctrl + S
  écrit alors le fichier depuis la mémoire de l'onglet, qui a tout (et l'état
  note ce fichier). La réparation se fait au calme, 30 secondes après le
  trou, puis de plus en plus rarement tant que la base refuse (jusqu'à 5
  minutes : chaque essai coûte un instant au fil principal), et tout de
  suite quand l'onglet passe en arrière-plan : « Ce classeur est de nouveau
  enregistré dans ce navigateur. ». Tant que le trou n'est ni réparé ni
  rattrapé par un fichier, fermer ou recharger l'onglet demande la
  confirmation du navigateur (`beforeunload`, posé seulement à ce moment-là),
  et changer de classeur aussi (`peutQuitter`, voir « La bibliothèque des
  classeurs »).
- **Une partie qui ne se relit plus** (une base trouée relue, voir « Les
  classeurs : où ils vivent ») : jamais « Enregistré dans ce navigateur »,
  ni « n'enregistre plus » (la base enregistre le reste) : « Une partie de
  ce classeur ne se relit plus dans ce navigateur (une écriture refusée, une
  autre fois) : elle n'est plus à l'écran ; le reste y est enregistré. Un
  fichier enregistré avant peut la contenir : ouvrez-le (Ctrl + O). », en
  attention ; le texte court « Une partie ne se relit pas » (pas plus large
  que « Seulement dans ce navigateur ») ; dans la bibliothèque, « Une partie
  ne se relit plus dans ce navigateur · … ». Pas de bandeau (aucun clic ne
  la répare), pas de réparation (il n'y a rien à rouvrir), pas de question
  en partant (la base a tout ce que la mémoire a) ; « Rien n'est perdu »
  n'est pas dit. La clé et le Drive écrivent ce qui se relit (le garde-fou
  de l'histoire ne laisse pas écraser un fichier qui a la partie qui
  manque). Le message de l'ouverture le dit une fois.
- **Le calme.** Les écritures automatiques (la réparation, la clé, le
  Drive, les aperçus) attendent le calme (`App.calme`) : aucun
  geste en cours, aucun point d'un simple toucher du Stylo qui attend le
  second (le double-clic qui ouvre les options), et 1,5 s depuis le dernier
  appui, lever ou touche ; sinon elles réessaient une seconde plus tard.
  Elles ne posent jamais ce point qui attend : posé entre les deux appuis,
  il ferait d'un double-clic un point d'encre. Seuls Ctrl + S et
  « Enregistrer » le posent (un essai le vérifie, la réparation tombant
  entre les deux appuis).
- **Deux onglets** sur le même classeur : un fichier enregistré dans l'un se
  lit aussitôt dans l'autre (la date du dernier enregistrement, partagée par
  le navigateur).

## La bibliothèque des classeurs

L'écran d'accueil des classeurs (`src/classeurs/bibliotheque.ts`, et
`src/classeurs/liste.ts` et `src/classeurs/arbre.ts`, purs et testés, pour
ce qu'il montre et pour le rangement). Le bouton du
classeur, en haut à gauche (un clic, Entrée ou Espace), et « Bibliothèque
des classeurs… », en tête du menu ⋯, l'ouvrent par-dessus le classeur. Au
démarrage, c'est toujours le dernier classeur qui revient : la bibliothèque
n'est jamais imposée, rien ne change au geste du professeur en classe.

- **L'écran.** Plein écran, comme la trieuse des pages (`role="dialog"`,
  « Bibliothèque des classeurs ») : le reste de l'écran devient inerte (sauf
  le message et les fenêtres), plus rien n'écrit sur la page cachée
  (`body.en-bibliotheque`), la barre d'actions ne paraît pas dessous. Échap
  ferme d'abord un menu, puis l'écran ; × « Fermer la bibliothèque
  (Échap) » ; le focus revient au bouton du classeur (Espace n'y rouvre la
  bibliothèque que si elle a été ouverte et fermée au clavier : voir « Le
  bouton du classeur »). Elle ne s'ouvre ni
  pendant la revue, ni pendant une séance, ni sur la trieuse, ni en plein
  geste (le bouton est inerte) ; en s'ouvrant, comme la trieuse, elle pose
  le point d'un simple toucher qui attend, annule un placement, ferme le
  programme de construction et les menus.
- **Ses fenêtres** (Nouveau classeur, Nouveau dossier, les étiquettes, les
  questions, Déplacer vers…, Récupérer une sauvegarde du Drive…) se ferment
  par Échap, « Annuler », ou un appui sur le fond, hors de leur cadre :
  jamais par un appui dans leur marge intérieure (20 à 22 px, dans le
  cadre), que la plume imprécise de la Wacom ou le doigt au TNI touchent
  souvent, ni par un texte sélectionné en glissant du champ jusqu'au fond ;
  le nom tapé reste (`src/dialogue.ts`, qui sert aussi aux fenêtres
  d'avant : Remplacer, la formule, la corbeille des pages).
- **Le bandeau** : « Bibliothèque », le nombre de classeurs (« 12
  classeurs »), **Nouveau classeur**, **Nouveau dossier** (« Dossier » sur
  un téléphone, pour tenir sur la même ligne), **Ouvrir…** (« Ouvrir un
  classeur ou une bibliothèque (Ctrl + O) », voir « Enregistrer et ouvrir un
  classeur » ; Ctrl + O y fait de même ; jusqu'à 600 px de large, il passe
  en tête du menu ⋯, « Ouvrir un classeur ou une bibliothèque… »),
  **Corbeille (3)** (grisé
  « Corbeille » quand elle est vide ; au téléphone, l'icône et le nombre ;
  voir « La corbeille de la bibliothèque » plus bas), le menu **⋯**
  (« Enregistrer toute la bibliothèque… », voir « Toute la bibliothèque
  dans un fichier » ; « Récupérer une sauvegarde du Drive… », voir « La
  copie sur le Drive »), le ×,
  et, en bas, la place que ce navigateur garde pour le site. Tout tient sur
  une ligne dès 1024 px (jusqu'à 1100 px, le nombre de classeurs passe sous
  le titre) ; plus étroit, sur deux : le titre, la corbeille, le ⋯ et le ×,
  puis les actions (jusqu'à 1000 px). Dessous, la ligne du classeur ouvert :
  « « Symétrie » : Enregistré dans ce navigateur · sur la clé il y a 2 min »
  (ou ce qui manque : « jamais enregistré dans un fichier » ; ce qui est en
  pause : « clé en pause » ; ce qui a échoué : « clé : pas à jour », jamais
  « il y a » après un échec), un point vert, gris ou ambre, et les boutons
  de ce qui demande un clic (Enregistrer le classeur, Reprendre
  l'enregistrement sur la clé…).
- **Récents** : les six derniers classeurs ouverts (au téléphone, une
  rangée qui défile à l'horizontale), à la racine et sans filtre seulement ;
  puis la grille du dossier où l'on est (voir « Ranger » plus bas : ses
  dossiers, puis ses classeurs, le plus récemment modifié d'abord, ou par
  nom). Une grille de 200 px par colonne au moins (150
  sur un téléphone : deux colonnes à 390 px ; six à 1366 px, quatre à
  1024, huit au TNI en 1920), sans défilement de côté.
- **Une carte** : l'aperçu de sa première page (voir « Les aperçus » plus
  bas ; tant qu'il n'y en a pas, les petits carreaux et « Pas encore
  d'aperçu »), le nom (deux lignes au plus, entier dans son titre), « Modifié aujourd'hui à 14 h 05 · 12 pages », la pastille
  « Ouvert » sur celui de cet onglet, deux petites icônes grises, la clé et
  le nuage du Drive (« Sur la clé il y a 3 jours (Symétrie.memc) » : la date
  de la dernière écriture réussie), ses étiquettes de classe en petites
  puces grises (celle qui vient de son dossier plus claire), et un bouton ⋯ de 44 px (« Options de
  « Symétrie centrale » »). Le lecteur d'écran y lit « Symétrie centrale, 12
  pages, modifié aujourd'hui à 14 h 05 » (et « classe 5e B », « ouvert dans
  cet onglet », la clé, le Drive). Chaque carte est un lien (`?classeur=<id>`) : **le clic du
  milieu et Ctrl + clic ouvrent le classeur dans un autre onglet**, comme
  partout ; le clic simple l'ouvre ici.
- **Les pointeurs.** La souris et la plume de la tablette graphique : un
  clic ouvre ; le clic droit, et le bouton latéral du stylet (à l'appui),
  ouvrent le menu de la carte là où l'on a appuyé ; un glisser déplace la
  carte (voir « Déplacer » plus bas) et n'ouvre rien.
  Au doigt : un toucher bref ouvre, un glisser fait défiler (la grille en
  hauteur, Récents de côté au téléphone), un appui long soulève la carte
  pour la déplacer (voir « Déplacer » plus bas), deux doigts font défiler
  sans rien ouvrir. Sans écran tactile (la souris, la Wacom), rien n'y
  défile au toucher, comme dans la trieuse. L'appui qui ferme un menu ne
  fait rien d'autre ; le second clic d'un double-clic sur le classeur de
  l'onglet ne tombe pas sur la page.
- **Le clavier.** Un seul arrêt de Tab par rangée (Récents, puis la
  grille ; entre les deux, la rangée du filtre, le fil d'Ariane et
  « Trier ») ; les flèches d'une carte à l'autre selon la mise en page
  réelle (↓ : la carte en dessous), Début, Fin ; Entrée ouvre (un classeur)
  ou entre (un dossier) ; F2 renomme ; la touche Menu et Maj + F10 ouvrent
  le menu de la carte (le focus sur « Ouvrir ») ; Échap le ferme et rend le
  focus à la carte ; Retour arrière remonte d'un dossier (hors d'un champ) ;
  Échap enlève d'abord le filtre de classe, puis ferme l'écran. Ce sont les
  mêmes touches en AZERTY (elles se lisent par leur nom, pas leur place).
- **Le menu d'une carte** : « Ouvrir », puis « Renommer… » (F2) et
  « Étiquettes de classe… », puis « Déplacer vers… », « Dupliquer le
  classeur » et « Enregistrer dans un fichier… » (son `.memc`, fabriqué
  depuis sa base par l'écrivain ; celui de l'onglet, comme Ctrl + S),
  puis « Supprimer » (Suppr ; ⌘ ⌫ sur Mac). Des fichiers lâchés sur
  l'écran : un cadre pointillé « Lâchez pour ajouter à la bibliothèque »,
  puis « Ouvrir un classeur ». Celui d'un
  dossier : « Ouvrir », « Renommer… », sa couleur, « Dossier d'une classe »,
  « Déplacer vers… », « Supprimer ».
- **Les autres onglets.** Un changement fait ailleurs (un classeur créé,
  renommé, ouvert) ne refait que les cartes de ces classeurs-là, et le focus
  reste où il était ; rien n'est refait pendant qu'un menu est ouvert (à sa
  fermeture). Le classeur ouvert renommé ailleurs : son nom sur le bouton et
  dans le titre de l'onglet suivent.

**Ranger (par classe, d'abord).** Le rangement conseillé : un dossier par
classe (« 5e B »), puis un classeur par chapitre (« Symétrie centrale ») ;
l'autre rangement (un dossier « Symétrie », un classeur par classe) reste
possible, et les étiquettes de classe retrouvent alors d'un geste les
classeurs d'une classe. Le modèle est pur et testé (`src/classeurs/arbre.ts`).

- **Le conseil.** À la racine, tant qu'il n'y a aucun dossier, une carte
  large en tête : « Rangez par classe : un dossier par classe (« 5e B »),
  puis un classeur par chapitre (« Symétrie centrale »). Les classeurs d'un
  dossier de classe portent son étiquette : un geste les retrouve tous. »
  [Créer un dossier de classe] (« Nouveau dossier », la case cochée
  d'avance) [Plus tard] (il ne revient plus : le réglage `conseil` de
  l'index vaut `vu`). Il ne prend pas le focus.
- **Nouveau dossier** (le bandeau) : « Nom » (40 caractères, « 5e B » en
  exemple grisé), « Couleur » (huit pastilles, des boutons radio nommés :
  Gris, Bleu au départ, Vert, Jaune, Orange, Rouge, Violet, Rose), la case
  **Dossier d'une classe : ses classeurs portent l'étiquette « 5e B »**, cochée
  d'office quand le nom ressemble à une classe (au début du nom, sans tenir
  compte de la casse : 3e à 6e, « 5ème », « 2nde », « seconde », « 1re »,
  « première », « Tle », « Term », « terminale », CP à CM2, BTS, CAP ; pas
  « 3 exercices » ni « Capitales »), son libellé suivant le nom tapé ; une
  fois touchée, elle ne bouge plus. [Annuler] [Créer] ; un nom vide : « Un
  dossier a besoin d'un nom. ». Le dossier naît dans celui qu'on regarde
  (« Dans : 5e B »), avec son nom pour étiquette (20 caractères) si la case
  est cochée.
- **Les cartes des dossiers**, avant celles des classeurs, par nom (« Ch. 2 »
  avant « Ch. 10 », sans la casse ni les accents) : la grande icône dans sa
  couleur, le nom, ce qu'il contient (« 4 classeurs · 2 dossiers » : les
  classeurs de ses sous-dossiers comptent, les sous-dossiers sont ceux qu'on
  voit en l'ouvrant ; « Vide »), la puce de son étiquette de classe ; le
  lecteur d'écran lit « 5e B, dossier bleu, dossier d'une classe, 4
  classeurs, 2 dossiers ». Un clic, un toucher, la plume ou Entrée y
  entrent ; le clic droit, le bouton du stylet, ⋯, la touche Menu ouvrent
  son menu : « Ouvrir », « Renommer… » (F2), « Couleur » (les huit en
  pastilles, la sienne cochée), la case « Dossier d'une classe ». Chaque
  changement a son message avec « Annuler » (7 s).
- **Le fil d'Ariane** remplace « Tous les classeurs » : « Bibliothèque › 5e
  B › Géométrie », chaque dossier au-dessus un bouton (on y remonte, le
  focus sur la carte d'où l'on vient), celui où l'on est en gras (le titre
  de la grille, pour le lecteur d'écran). **Retour arrière** remonte d'un dossier (hors d'un champ). Le dossier
  qu'on regarde est retenu pour l'onglet (`mem-teachingtool-dossier`, dans
  sessionStorage : recharger le garde, un autre onglet commence à la
  racine). Un dossier vide : « Ce dossier est vide. Glissez-y un classeur, ou
  créez-en un. » [Nouveau classeur]. « Nouveau classeur » dit « Dans : 5e B ·
  étiquette de classe « 5e B » » : l'étiquette vient du dossier, pas de champ
  à remplir.
- **Les étiquettes de classe.** Un classeur a les siennes (au plus trois,
  posées à la main) et celle du plus proche dossier de classe qui le
  contient, **calculée, jamais écrite** : glissé dans « 5e B », il est
  aussitôt dans le filtre « 5e B », et en sort s'il en sort. « Étiquettes de
  classe… » (le menu d'un classeur) : ses étiquettes en puces, chacune avec
  son × ; l'héritée grisée, sans ×, « vient du dossier « 5e B » » ; « Ajouter
  une classe » (les étiquettes de la bibliothèque proposées ; Entrée
  ajoute ; 20 caractères ; un double, même de l'héritée, est ignoré : « « 5e
  B » y est déjà. ») ; à trois, le champ se ferme. Chaque changement
  s'écrit aussitôt ; à la fermeture, « Étiquettes de « Symétrie » : 5e B,
  Soutien » [Annuler] les rend toutes comme elles étaient.
- **Le filtre.** Sous Récents, dès qu'une étiquette existe : « Classes :
  [Toutes] [5e B · 4] [2nde 3 · 2] » (des boutons `aria-pressed`, dans
  l'ordre des classes, de la 6e à la terminale, puis les autres par nom).
  Une étiquette choisie montre, en liste plate, tous les classeurs visibles
  qui la portent, quel que soit leur dossier, avec leur chemin sous le nom
  (« 5e B › Géométrie ») ; le fil dit « Classe « 5e B » ». Le filtre est
  retenu pour l'onglet (`mem-teachingtool-filtre`) ; Échap l'enlève d'abord,
  puis ferme l'écran ; une étiquette que plus rien ne porte l'enlève aussi.
- **Renommer** : F2 sur la carte qui a le focus, « Renommer… », ou un
  double-clic sur le nom (un clic simple sur le nom attend un instant le
  second, comme dans la trieuse, puis ouvre). Un champ dans la carte, sur le
  nom, prérempli et tout choisi (60 caractères pour un classeur, 40 pour un
  dossier ; 16 px : l'iPad ne zoome pas) ; Entrée ou un clic ailleurs
  gardent, Échap rend l'ancien ; un nom vide est refusé (« Un classeur a
  besoin d'un nom. », le champ reste). « Classeur renommé » [Annuler]. Le
  nom va dans l'index et dans la base du classeur (son identité, pour
  qu'une adoption le retrouve) ; le classeur de l'onglet renommé : son
  bouton, le titre de l'onglet et la ligne du classeur ouvert suivent, dans
  tous les onglets. Un dossier de classe renommé garde son étiquette
  accordée à son nom (« 2nde 3 » devenu « 2nde 4 »). Au doigt, le champ
  reste au-dessus du clavier virtuel (la grille gagne en bas la place qu'il
  couvre). Pendant qu'on tape, rien ne se refait (un changement venu d'un
  autre onglet attend que le champ se ferme) ; avant de partir vers un autre
  classeur, ce qu'on vient d'écrire dans l'index s'écrit.
- **Trier** : « Trier : Modifiés récemment » ouvre un petit menu
  (« Modifiés récemment », « Nom (A → Z) ») ; le choix vaut pour les
  classeurs de la grille et du filtre (les dossiers vont toujours par nom,
  Récents par ouverture), retenu sur l'appareil (`mem-teachingtool-tri`).
- **Un cycle de dossiers** (deux onglets qui rangent chacun un dossier dans
  l'autre ; le registre le refuse dans sa transaction, mais pas des deux
  côtés à la fois) : chaque dossier du cycle se montre à la racine, toute
  remontée est bornée (64 niveaux, les dossiers déjà vus) ; la bibliothèque
  s'affiche et le démarrage marche. Rien de ce rangement n'est écrit dans
  le navigateur tant qu'on ne choisit ni dossier, ni filtre, ni tri.

**Déplacer (un classeur, un dossier).** Par « Déplacer vers… » ou en
glissant la carte (le modèle est pur et testé : `src/classeurs/deplacer.ts`,
`tests/glisser-biblio.test.ts`).

- **« Déplacer vers… »** (le menu d'un classeur ou d'un dossier) : la
  fenêtre « Déplacer « Symétrie » vers… » (« Déplacer le dossier
  « Géométrie » vers… ») montre l'arbre des dossiers, chacun dans sa
  couleur et en retrait sous son parent (par nom), « Bibliothèque (la
  racine) » en premier ; la corbeille n'y est pas. Le dossier où il est
  déjà est grisé, « (ici) » ; pour un dossier, lui-même et tous ses
  descendants aussi (un dossier ne va jamais dans lui-même ni dans l'un de
  ses sous-dossiers). Des lignes de 44 px ; le lecteur d'écran lit le
  chemin (« 5e B › Géométrie »). Au clavier : un seul arrêt de Tab dans la
  liste, ↑ ↓ (les grisés sont sautés), Début, Fin, Entrée choisit, Échap
  ferme sans rien faire (le focus revient à la carte), Tab mène à
  « Annuler ». Au téléphone, la fenêtre prend toute la largeur et la liste
  défile.
- **Glisser une carte** (classeur ou dossier, de la grille ou de Récents),
  comme une page dans la trieuse : à la souris dès 4 px, à la tablette
  graphique (la Wacom sans écran) dès 6 px, de n'importe où sur la carte,
  sans appui long ; le bouton latéral du stylet ouvre le menu, il ne tire
  rien. Au doigt (et au stylet posé sur l'écran : iPad, Surface), par la
  poignée ⋮⋮ (dans le coin bas gauche de l'aperçu, seulement avec un écran
  tactile ; « Pas encore d'aperçu » se range alors à sa droite, sous le
  bouton ⋯, sur deux lignes dans la petite carte de Récents) ou après un appui long d'une demi-seconde (une petite vibration
  là où elle existe) ; sinon le doigt fait défiler, et deux doigts (la
  main entière au TNI) aussi, sans rien ouvrir. Pendant le glisser, la
  carte s'estompe, son image (réduite, tenue là où on l'a prise : la cible
  reste visible) suit le pointeur, et les cibles possibles ont un cadre
  bleu pointillé : les cartes des dossiers, les éléments du fil d'Ariane
  (les dossiers au-dessus, « Bibliothèque », et celui où l'on est, pour une
  carte de Récents) ; jamais la carte elle-même, ni l'un de ses
  descendants, ni le dossier où elle est déjà. Celle sous le pointeur prend
  un fond bleu pâle. La grille défile seule près de son bord haut ou bas.
  Échap arrête tout ; lâchée hors d'une cible (ou sur son propre dossier),
  rien ne bouge ; le clic qui suit un glisser n'ouvre rien (la carte est
  un lien). Une paume posée sur le TNI pendant un glisser à la souris n'y
  change rien. Avec un filtre de classe (une liste plate), il n'y a pas de
  cible : on passe par « Déplacer vers… ».
- **Ce qui se passe** : un classeur, seule sa fiche change (son dossier) ;
  un dossier, par le registre, qui refuse dans sa transaction un dossier
  dans lui-même ou l'un de ses descendants : deux onglets qui rangent en
  même temps A dans B et B dans A, l'un passe, l'autre est refusé (« Ce
  dossier ne peut pas aller dans l'un de ses propres sous-dossiers. »),
  jamais de cycle. La cible est relue d'abord : supprimée ou mise à la
  corbeille entre-temps, « Ce dossier n'existe plus. », rien ne bouge. Les
  étiquettes propres ne bougent pas ; celles qu'il hérite suivent le
  dossier (calculées), et le message le dit : « « Symétrie » déplacé dans
  « 5e B » : il porte maintenant l'étiquette « 5e B » (et plus « 2nde 3 ») »,
  « Dossier « Géométrie » déplacé à la racine de la bibliothèque : ses
  classeurs ne portent plus l'étiquette « 5e B » », avec **Aller à
  « 5e B »** (le dossier, le focus sur la carte) et **Annuler** (7 s : il
  revient, s'il n'a pas bougé depuis, « « Symétrie » est revenu dans
  « 2nde 3 » »). Le focus reste sur la carte, ou sur sa voisine si elle
  quitte la grille.

**Dupliquer le classeur** (le menu d'un classeur) : une copie complète,
avec toute son histoire (la revue et le replay y marchent, le film est le
même), faite par l'écrivain hors du fil principal (60 pages : 4 s, aucune
tâche longue, mesuré) : il lit la base de l'original (sans y écrire : son
vecteur d'état ne change pas), fusionne, vérifie, rejoue le tout une fois,
vide le **registre des publications** de la copie et la **marque comme
copie** (la carte `copie` du document : l'id de la copie, l'heure) dans une
seule transaction (hors des pages : ni une étape du film, ni une
annulation), et crée la base de la copie (`mem-teachingtool-classeur-<id>`,
son identité à côté). Pourquoi : les séances de la copie ont la même heure
de début que celles de l'original, donc la même clé « compte:début de la
séance ». Avec le registre de l'original, republier depuis la copie mettrait
à jour son fichier Drive ; sans registre mais sans marque, Publier le
retrouverait quand même sur le Drive par cette clé (comme depuis un autre
onglet : mesuré, corrections « migration »). Les deux fois, le lien déjà
donné à l'autre classe montrerait la copie. Marquée, la copie publie ses
séances sous une clé à elle (`compte:début:copie-<id>`) : un nouveau lien,
et l'original garde le sien. Toujours, même sans séance publiée (l'original
peut publier après la copie) ; une copie de copie a sa propre marque. Un
classeur qui n'est pas une copie publie exactement comme avant ; la version
d'avant ouvre le fichier d'une copie comme un autre, ignore la marque et la
garde dans ce qu'elle enregistre (vérifié avec 41d2739 :
`lot4/migration/vt`). La fiche
de la copie : « Symétrie (copie) » (puis « (copie 2) »), le même dossier,
les mêmes étiquettes propres, créée maintenant, jamais ouverte, ses pages,
l'aperçu de l'original ; ni clé, ni Drive. « Copie du classeur… » au-delà
de 300 ms, puis « Classeur dupliqué : « Symétrie (copie) ». » [Ouvrir] (et,
s'il avait des séances publiées : « Ses séances déjà publiées le restent
depuis l'original : en publier une depuis la copie fait un nouveau lien. »).
Le classeur de l'onglet se duplique aussi : ce qui attend s'écrit d'abord
(le point d'un simple toucher, la piste des instruments, les écritures de
la base) ; une base trouée se répare d'abord, sinon « … : il n'est pas
entièrement enregistré dans ce navigateur. Enregistrez-le d'abord dans un
fichier. » (de même pour une base trouée relue, qui ne se répare pas). Plus de place : « Le classeur n'a pas pu être dupliqué : il n'y
a plus de place dans ce navigateur. », et rien ne reste (ni fiche, ni
base). La copie de l'état final seul (une leçon pour plusieurs classes, le
choix (c)) reste à discuter.

**Les aperçus** (`src/classeurs/apercu-classeur.ts`) : la **première page**
de chaque classeur, en petit (320 × 200, au dpr 1, en esquisse, avec son
fond), peinte par le même code que les vignettes de la trieuse, en PNG dans
l'index de la bibliothèque. Elle se refait, sans jamais gêner l'écriture :
au démarrage s'il n'y en a pas ; quand la première page a changé (ce qui y
est écrit, son fond, une autre page passée en tête), après 30 s sans
écrire, au calme, au plus une fois toutes les 2 minutes ; à l'ouverture de
la bibliothèque, si elle a changé ; avant de partir vers un autre classeur.
Toujours dans un moment libre du navigateur, et la peinture elle-même
attend encore le calme (une couverture commencée au calme attend que le
professeur ait fini d'écrire de nouveau) : 6 à 9 ms de fil principal pour
une page de 300 traits, mesuré. Les cartes l'affichent en adresse objet
(révoquée à la fermeture de la bibliothèque), l'image du glisser aussi ;
une autre bibliothèque ouverte (un autre onglet) la voit paraître. Un
classeur jamais ouvert depuis le lot 4 n'en a pas encore : « Pas encore
d'aperçu ». Un navigateur qui refuse de ranger l'image (Safari en
navigation privée) : rien n'est dit, la carte garde les petits carreaux.

**La corbeille de la bibliothèque** (`src/classeurs/corbeille.ts`, pur et
testé : `tests/corbeille-biblio.test.ts` ; la vue, `src/classeurs/vue-corbeille.ts`).

- **Supprimer** (le menu d'un classeur ou d'un dossier, ou Suppr sur la
  carte qui a le focus) : sans question, il va dans la corbeille (sa fiche
  porte `corbeille = { t }` ; rien n'est effacé) : « « Symétrie » est dans
  la corbeille de la bibliothèque. », « Dossier « 5e B » mis à la corbeille
  (4 classeurs) » [Annuler] (7 s : il revient tel quel). Les classeurs d'un
  dossier supprimé ne se montrent plus (ni dans Récents, ni dans un filtre)
  et leur adresse mène à la bibliothèque seule. Le classeur de l'onglet (ou
  son dossier) : la bibliothèque reste ouverte, sans × (Échap ne la ferme
  plus) ; le Tableau garde sa base (« Annuler » le rend, et le ×) ; au
  rechargement, la bibliothèque seule dit qu'il est dans la corbeille.
  Supprimé dans un autre onglet pendant qu'il est ouvert ici : rien ne
  change ici, on y écrit comme avant, jusqu'à ce qu'on le vide.
- **La vue** (le bouton « Corbeille (3) », à la place des cartes) : les
  dossiers et les classeurs supprimés, le dernier d'abord (un classeur
  supprimé avant son dossier paraît aussi pour lui-même) ; chacun : son
  aperçu (ou les petits carreaux ; un dossier, son icône dans sa couleur),
  son nom, « Supprimé aujourd'hui à 10 h 05 » (« · 4 classeurs » pour un
  dossier), « Était dans : 5e B », et deux boutons de 44 px, **Remettre** et
  **Supprimer définitivement**. En haut : « Bibliothèque » (le retour ; Échap
  aussi, le focus revient sur « Corbeille ») et **Vider la corbeille**. Tab
  va de bouton en bouton ; le focus d'une carte qui s'en va passe à la
  suivante.
- **Remettre** : dans son dossier, « « Symétrie » remis dans « 5e B » » ;
  son dossier supprimé depuis, « … remis à la racine de la bibliothèque
  (son dossier n'existe plus) » ; son dossier lui-même dans la corbeille, à
  la racine aussi (« (son dossier est dans la corbeille) ») ; [Annuler] le
  renvoie dans la corbeille. Un dossier remis revient avec ses classeurs.
  On reste dans la vue.
- **Supprimer définitivement, Vider** : une question dans une fenêtre de
  l'outil, « Annuler » a le focus, Échap ou un clic à côté la ferment.
  « Supprimer définitivement « Symétrie » ? Ses 12 pages et tout son
  historique (la revue, les séances à publier) seront effacés de ce
  navigateur. Ce n'est pas annulable. », puis ce qui en reste ailleurs
  (« Ses fichiers enregistrés et sa copie sur le Drive ne sont pas
  effacés. », ou seulement l'un des deux) ; jamais enregistré dans un
  fichier ni copié sur le Drive (ni date de dernier enregistrement, ni
  écriture sur la clé, ni copie) : « Il n'a jamais été enregistré dans un
  fichier ni copié sur le Drive : il n'en restera rien. » et **Enregistrer
  d'abord** (le choix du fichier s'ouvre dans le clic, le `.memc` se
  fabrique depuis sa base par l'écrivain, sa date est notée ; la fenêtre le
  dit). Un dossier : « Supprimer définitivement le dossier « 5e B » ? Ses 4
  classeurs (27 pages en tout) et ses 2 dossiers seront effacés de ce
  navigateur. Ce n'est pas annulable. » (ceux de ses sous-dossiers
  compris). Vider : « Vider la corbeille ? 3 classeurs (27 pages) et 1
  dossier seront effacés de ce navigateur. Ce n'est pas annulable. », et
  « Dont 1 qui n'a jamais été enregistré dans un fichier. » s'il le faut.
  Puis « « Symétrie » supprimé définitivement. », « Corbeille vidée (3
  classeurs, 1 dossier). » (l'effacement lui-même : voir « Effacer pour de
  bon » dans « Les classeurs : où ils vivent »). Le classeur de l'onglet
  vidé : l'onglet devient la bibliothèque seule (`?bibliotheque`, « Bibliothèque
  — MEM teachingtool », plus rien ne s'écrit, le navigateur ne demande rien
  en partant). Rien ne s'efface jamais tout seul : pas de purge après
  30 jours.
- **La place** : en bas du bandeau, « Ce navigateur garde 120 Mo pour ce
  site. » (`navigator.storage.estimate` : l'origine `mathsetmoi.github.io`
  est commune à tous les outils de l'organisation) ; au-delà de 80 % du
  quota, en alerte : « Le navigateur manque de place (85 % utilisés) :
  enregistrez vos classeurs dans des fichiers, puis videz la corbeille. » ;
  rien si le navigateur ne le dit pas.

**Ouvrir un autre classeur, sans rien perdre.** Le classeur de l'onglet :
l'écran se ferme. Un autre : « Ouverture de « Fractions »… », puis

1. si la base du navigateur a refusé une écriture (le trou, voir « Les
   classeurs : où ils vivent ») et que des changements la suivent, une
   question : « Ce classeur n'est pas entièrement enregistré »
   [Annuler] [Quitter sans enregistrer] [Enregistrer le classeur] (le focus
   sur ce dernier ; « Quitter sans enregistrer » retire la question du
   navigateur, `beforeunload`, déjà posée ici) ;
2. tout ce qui attend s'écrit : le point d'un simple toucher, la piste des
   instruments, les écritures de la base, la fiche du classeur (son nombre
   de pages), et la clé si une écriture est due (le fichier de la clé a
   donc tout, avant de partir) ; 10 secondes au plus, avec « Ouvrir sans
   attendre » au-delà de 5. Jamais le Drive, qui ne retient pas le départ ;
3. le rappel d'enregistrer, s'il est dû (20 minutes de travail que rien ne
   protège, sans attendre 2 minutes sans geste : on part, ce n'est pas le
   plein cours), une seule fois par période de travail non enregistré :
   « Enregistrer « Mon tableau » d'abord ? » [Annuler] [Ouvrir sans
   enregistrer] [Enregistrer le classeur] ;
4. la page se recharge sur l'adresse du classeur (`?classeur=<id>`) : un
   seul classeur est chargé à la fois. **Précédent** ramène au classeur
   d'avant ; une page rendue par le cache du navigateur (Précédent,
   Suivant) se recharge : on ne reprend jamais un onglet figé sur un
   classeur qui a pu changer.

**Nouveau classeur** : une fenêtre, « Nom » (« Nouveau classeur », tout
choisi, 60 caractères ; vide, il garde ce nom), « Fond de la première
page » (Petits carreaux, coché ; Page blanche ; Seyès ; Repère) et, sur
Chrome et Edge, la case **Enregistrer automatiquement sur la clé**, cochée
d'office dans la version d'un seul fichier (`file://`, le poste remis à
zéro) ; [Annuler] [Créer et ouvrir] (Entrée). La case cochée : le choix du
fichier s'ouvre dans ce clic (le nom du classeur, le même dossier que la
clé) ; y renoncer crée quand même le classeur, sans clé ; un fichier qui a
déjà quelque chose n'est pas écrasé (« Ce fichier contient un autre
classeur (« Fractions ») : choisissez un autre nom. », la fenêtre reste
ouverte). Le classeur naît dans l'index (marqué en création), sa base
reçoit une page au fond choisi et sa naissance dans le film, puis la marque
s'en va ; avec la case, **la première écriture sur la clé se fait avant de
partir** (le travailleur fabrique le fichier depuis la base neuve), puis la
poignée est gardée et la fiche note l'écriture : à l'arrivée, la clé est
déjà à jour (l'accord du choix du fichier vit encore dans cette page). Puis
on part vers lui (comme plus haut) ; à l'arrivée, Chrome a oublié cet
accord (voir « L'enregistrement automatique sur la clé », « L'accord du
navigateur ») : « Classeur « Fractions » créé. Pour qu'il s'enregistre tout
seul dans « Fractions.memc », le navigateur demande votre accord. »
[Autoriser] ; s'il l'a gardé (« Autoriser à chaque visite ») : « Classeur
« Fractions » créé. Il s'enregistre automatiquement dans « Fractions.memc ».
». Une poignée que le navigateur ne sait pas ranger
(`DataCloneError`) : à l'arrivée, le bandeau « Choisissez de nouveau le
fichier de la clé… » [Enregistrer automatiquement sur la clé…]. Plus de
place : « Le classeur n'a pas pu être créé : il n'y a plus de place dans ce
navigateur. », et rien ne reste (ni fiche, ni base).

**La bibliothèque seule.** `?bibliotheque`, l'adresse d'un classeur inconnu
ici ou dans la corbeille, une bibliothèque vide, le classeur de l'onglet
effacé depuis la corbeille : la bibliothèque s'ouvre
sans classeur (ni tableau, ni barres, ni ×), l'adresse devient
`?bibliotheque` (recharger la rouvre), le titre de l'onglet « Bibliothèque —
MEM teachingtool », et un message dit pourquoi (« Ce classeur n'est pas dans
la bibliothèque de ce navigateur. Pour l'y ajouter, ouvrez son fichier
(.memc). »). Une carte, ou Nouveau classeur, ouvre un classeur. Ctrl + O
(et « Ouvrir… ») y ajoute un classeur ou une bibliothèque, comme ailleurs
(voir « Enregistrer et ouvrir un classeur ») ; ni Ctrl + O ni Ctrl + S n'y
vont au navigateur. C'est aussi là que mène « Ouvrir la bibliothèque » quand un
classeur a été supprimé dans un autre onglet. Si l'index ne s'ouvre pas du
tout (le repli), le bouton du classeur le dit (« La bibliothèque des
classeurs ne s'ouvre pas dans ce navigateur : seul « … » est disponible. »).

**Le premier lancement après la mise à jour.** Si le premier classeur (le
tableau d'avant) a du contenu, un message le dit une fois : « Votre tableau
est maintenant le classeur « Mon tableau ». Son nom, en haut à gauche,
ouvre la bibliothèque de vos classeurs. » [Voir la bibliothèque] (« Son
bouton… » quand il n'a que son icône ; « Le menu ⋯, en haut à droite,
ouvre la bibliothèque de vos classeurs. » quand il est caché faute de
place). Puis `mem-teachingtool-annonce` est posée ; un navigateur neuf la
pose sans rien dire.

## Exporter en PDF

Un fichier PDF à imprimer, ou à déposer dans l'ENT pour les absents :

- *Exporter la page en PDF…* (le menu de la page, au clic droit dans le
  vide ; **Ctrl + P**, ⌘ + P sur Mac) : la page qu'on regarde ; sur un
  classeur de plusieurs pages, la fenêtre propose aussi *Tout le classeur :
  12 pages*.
- *Exporter le classeur en PDF…* (le menu ⋯) et *Exporter en PDF* du bandeau
  de la trieuse : toutes les pages, dans l'ordre.
- Dans la trieuse : *Exporter en PDF* du bandeau des pages choisies (« Les
  pages 2, 5 et 7 »), *Exporter en PDF…* du menu d'une vignette ; Ctrl + P y
  exporte les pages choisies, sinon tout le classeur. La trieuse reste ouverte
  et utilisable pendant l'export.

La fenêtre dit ce qu'on exporte, porte la case *Imprimer le fond de la page
(carreaux, Seyès, repère)* (cochée au départ ; le choix est gardé dans ce
navigateur, le même que pour l'image copiée : `mem-sortie-fond`), une note,
*Annuler* et *Exporter* (qui a le focus : Entrée exporte). Ctrl + P n'imprime
plus la page web (les barres, le tableau coupé au bord de l'écran) : il ouvre
cette fenêtre. Le menu Fichier › Imprimer du navigateur, lui, n'imprime
qu'une phrase : « Pour imprimer : ⋯ → Exporter le classeur en PDF. »

Chaque page est **cadrée sur son contenu** (2 mm d'air autour ; les noms des
points comptent, même déplacés loin de leur point), sur des feuilles A4 aux
marges de 12 mm (16 en bas, où tient le pied de page) :

- **À l'échelle réelle** quand le contenu tient sur la feuille (18,6 × 26,9
  cm en portrait, 27,3 × 18,2 cm en paysage) : 1 cm sur la page (40 unités,
  deux petits carreaux) = 1 cm sur le papier, les longueurs se mesurent à la
  règle sur la feuille. Sinon la page est réduite, et son pied de page le dit
  (« réduite à 72 % ») ; sous 30 %, le message final le signale (« La page 4
  est très large : réduite à 18 %. »). Ni plancher, ni découpe en colonnes :
  une page bien plus large que haute est rare.
- **Une page qui n'est pas haute tient sur une seule feuille**, dans le sens
  qui la montre le plus grand : une grande figure plus large que haute, ce
  qu'on a écrit sur un vidéoprojecteur 4:3 ou une photo 4:3 vont sur une
  feuille **paysage**, réduits juste assez pour y tenir en largeur et en
  hauteur (un triangle de 25 × 18,5 cm : 89 %), plutôt que d'être coupés sur
  deux feuilles ; sinon **portrait**. Les deux à l'échelle réelle : paysage
  pour un contenu nettement plus large que haut (plus de 1,25 fois),
  portrait sinon. Une page qui dépasse à peine une feuille est réduite (de
  15 % au plus) pour y tenir, plutôt que de laisser trois lignes seules sur
  une seconde feuille.
- **Une page haute est découpée en feuilles A4** (portrait, réduite
  seulement si elle est trop large) et continue sur les suivantes. La coupe
  tombe entre 60 et 100 % de la feuille, là où le moins d'objets passent :
  entre deux lignes d'écriture, au-dessus d'une figure plutôt qu'au travers.
  Une figure qui tient sur une feuille n'est jamais coupée quand on peut
  l'éviter : si elle commence vers le milieu de la feuille, la coupe remonte
  au-dessus d'elle (jusqu'à 25 % de la feuille) et la figure passe entière
  sur la suivante ; une figure plus haute qu'une feuille, elle, est bien
  coupée. Les droites prolongées ne comptent pas, elles traversent tout. Un
  objet à cheval sur la coupe paraît en partie sur les deux feuilles, et le
  quadrillage continue d'une feuille à l'autre.
- **Un grand vide de la page infinie est sauté** : l'énoncé en haut, la
  correction un mètre plus bas font deux feuilles, la seconde commençant
  juste au-dessus de la correction, jamais des feuilles blanches entre les
  deux.
- Le fond imprimé couvre la zone utile de chaque feuille, celles de suite
  comprises (les flèches des axes du repère au bout de cette zone) ; décoché,
  la feuille est blanche. Les **instruments posés ne sont jamais imprimés**.
- Un **pied de page** discret (8 points, gris) : à gauche la page, son nom
  s'il en a un, sa partie s'il y en a plusieurs (« Page 3 · Exercice 12
  p. 84 (2/3) ») ; à droite le nom du classeur (coupé à 40 caractères) et
  le numéro de la feuille dans le PDF (« Symétrie centrale · 4 / 12 »).
- **Une page vide n'est pas exportée**, et le message le dit (« La page 4 est
  vide : elle n'est pas dans le PDF. ») ; rien que des pages vides : « Rien à
  exporter : la page est vide. » (« … le classeur est vide. » pour tout le
  classeur), et pas de fichier.

Le fichier se télécharge : « Symétrie centrale 2026-10-09.pdf » (tout le
classeur, à son nom), le nom de la page (« Exercice 12 p. 84.pdf »),
« page-3-2026-10-09.pdf », « pages-2-5-7-2026-10-09.pdf » (au-delà de cinq
pages, « pages-2026-10-09.pdf »). Son titre, que montre le lecteur de PDF :
« Symétrie centrale · 9 octobre 2026 », « Page 3 · Exercice 12 p. 84 »,
« Pages 2, 5 et 7 » (au-delà de cinq, « 12 pages de « Symétrie centrale » »).

La qualité : une image par feuille, à 200 points par pouce (1654 × 2339
pixels), peinte par le même code que l'écran (comme une page imprimée : les
lignes du fond et les noms des points gardent leur épaisseur) ; les formules
y sont aussi nettes qu'à l'écran à la même échelle (moins de 8 d'écart moyen
sur 255, mesuré), chacune posée sur des pixels entiers : le trait d'une
fraction, le cadre de `\boxed` ne s'étalent pas en gris sur deux rangées,
où que la formule tombe sur la feuille. Une feuille d'écriture et de figures part en **256
couleurs** (compressées sans perte) : d'abord les couleurs des objets de la
feuille, si bien qu'une petite croix verte au milieu d'une page noire et
chargée garde son vert, puis les plus fréquentes ; si une seule surface
devait changer de couleur (plus de 0,01 % des pixels faux de plus de 24
niveaux et pareils à leur voisin), la feuille part en **couleurs exactes**
(RVB sans perte, environ deux fois plus lourde). Une feuille où paraît une
**image** (une photo, une capture) ne passe jamais par les 256 couleurs, qui
la postériseraient : en **JPEG** quand l'image couvre au moins 15 % de la
feuille (la photo d'un énoncé reste lisible), en RVB sans perte sinon (une
petite illustration reste au pixel près). Le poids : environ 0,35 Mo pour
une feuille de Seyès pleine d'écriture (400 traits), moins de 100 Ko pour
une page ordinaire, 0,2 à 0,5 Mo pour une feuille avec une image ; dix pages
pleines font 3,5 Mo.

Rien ne gèle : le message dit la progression (« Export en PDF : feuille 3 sur
12… »), puis « PDF prêt : Symétrie centrale 2026-10-09.pdf (12 feuilles A4, 2,4 Mo). » ;
l'export avance par petites tranches (dix pages pleines : environ 9 s, aucune
tâche de plus de 150 ms, mesuré) et attend tant qu'on écrit sur le tableau :
l'encre ne prend aucun retard. Ce qui est sur les pages est pris au
lancement : un trait écrit pendant l'export n'y est pas, pas même à moitié.
Un export à la fois (Ctrl + P pendant un export : « Un export en PDF est déjà
en cours. », qui reste deux secondes à l'écran avant que la progression
reprenne) ; ni pendant la revue, ni pendant une séance. Tout se
fait dans le navigateur, hors connexion, dans la version en ligne comme dans
le fichier unique de la clé USB : aucun service extérieur, aucune
bibliothèque de plus (la compression vient de fflate, déjà là pour le
`.memc`).

Pourquoi des images plutôt que du vectoriel : un PDF vectoriel demanderait un
second moteur de dessin (les traits de perfect-freehand, les formules, les
fonds) et d'y embarquer les polices, pour un fichier plus lourd (mesuré :
environ 976 Ko pour une feuille très chargée, contre 238 à 283 Ko en couleurs
indexées, 531 à 589 Ko en RVB sans perte, 384 à 687 Ko en JPEG).

## Ce que fait la v0.1

Outil **Segment** (L) : un petit panneau à côté de l'outil choisit **segment
[AB]**, **droite (AB)** ou **demi-droite [AB)** ; une droite est dessinée jusqu'au
bord de l'écran, quel que soit le zoom, et se prend sur toute sa longueur. Le
menu d'un trait passe de l'un à l'autre d'un clic.

On trace un trait **en glissant**, ou **en deux clics** : un clic pour le
premier point, un clic pour le second (Échap annule). Près d'un point existant
(un point posé, le sommet d'une figure, le centre d'un cercle), l'extrémité s'y
accroche et le point s'éclaire ; ailleurs, elle se pose où l'on clique. Le
polygone, tracé clic par clic, s'accroche de la même façon.

Outil **Point** (X) : un clic pose un point marqué d'une croix et nommé (A, B,
C…), sur le tableau ou sur une image.

Stylo sensible à la pression, surligneur, gomme, segments (Maj pour
les angles de 15°, aimant au quadrillage), formules LaTeX avec aperçu et
raccourcis, sélection et déplacement, copier, coller, dupliquer (d'une page et d'un onglet à l'autre), annuler/rétablir (page par page ; au doigt, toucher à deux ou trois doigts), pages (supprimées sans question, rendues par Annuler ou Ctrl+Z, ou remises de la corbeille), fonds (blanc,
petits carreaux, Seyès, repère gradué), zoom de 10 % à 2000 % — le quadrillage
suit le zoom comme une carte : les carreaux trop petits s'estompent et laissent
place à de plus grands (1 cm, 5 cm, 10 cm…), la page n'est jamais blanche.

**Se déplacer, zoomer.** La molette de la souris fait défiler la page (Maj :
à l'horizontale) ; au pavé tactile, deux doigts qui glissent déplacent le
tableau. Ctrl (⌘ sur Mac) + molette, ou pincer le pavé, zoome autour du
pointeur, d'un cran à la fois (×1,1 par cran au plus : une molette libre ne
s'emballe pas). Qui préfère la molette qui zoome, comme dans GeoGebra, le règle
dans le menu du pourcentage (en bas à droite) : « Molette de la souris : fait
défiler / zoome », gardé sur cet ordinateur. Ce menu donne aussi **100 %**
(Ctrl + 0), **Tout voir** (Maj + 1, ou le bouton cadre à côté de « + » : toute
la page entre les barres, jamais au-delà de 100 %) et **Voir la sélection**
(Maj + 2, 200 % au plus) ; Ctrl + « + » et Ctrl + « − » zooment le tableau (au
clavier principal ou au pavé numérique, en AZERTY comme en QWERTY), autour du
pointeur, et non plus toute la page du navigateur. Sans sélection, les flèches
déplacent la vue d'un quart d'écran (trois quarts avec Maj, en continu si on
tient la touche). Quand plus rien de ce qui est écrit n'est à l'écran, une
pastille **Revenir au contenu** paraît en bas au centre. F5 (que les
télécommandes de présentation envoient) ne recharge plus la page en plein cours :
un message rappelle Ctrl + R. Le pincement sur iPad ne zoome plus la page
entière, et le balayage à deux doigts ne fait plus « page précédente ». Chaque
page garde sa vue (une nouvelle page s'ouvre à 100 %, sur l'origine) ; la page
courante et la vue de chaque page sont retrouvées au rechargement — notées dans
ce navigateur, hors du document : ni un fichier, ni un replay ne les emportent.

**Changer de page.** ‹ et › (ou Page↑ et Page↓, que les télécommandes de
présentation envoient) passent d'une page à l'autre. Le compteur dit
« 3 / 7 », suivi du nom de la page si elle en a un (« 3 / 7 · Exercice 12
p. 84 » : coupé au-delà d'une vingtaine de caractères, entier dans son
infobulle, caché sur un téléphone) ; c'est un bouton, qui ouvre la trieuse
des pages (Maj + P, voir « Les pages »). Sa largeur ne dépend jamais de la
page qu'on regarde : le numéro prend la place du plus large du tableau
(« 10 / 12 » après « 9 / 12 » ne le fait pas grandir) et, dès qu'une page
du tableau a un nom, la place d'un nom est gardée sur toutes les pages
(vide sur une page sans nom). Cette place est d'une vingtaine de
caractères, moins si la barre n'a pas la place sur ses rangées : elle ne
lui en fait jamais prendre une de plus. Sans même dix caractères de place
(une tablette ou un vidéoprojecteur en 1024 × 768, où la barre tient juste
sur une rangée et laisse environ 90 px), le nom s'écrit plus petit dans la
place qui reste : on en lit une dizaine de caractères (« 2 / 3 · Exercice
… »), entier dans l'annonce, l'infobulle et la trieuse ; il ne disparaît
que sous 56 px de place. Ainsi ‹ et › restent à leur place : on avance en touchant toujours
au même endroit sans tomber sur le compteur. Seuls le premier nom donné, le
dernier retiré, le passage à dix pages, une fenêtre qui change de taille
(une tablette qu'on tourne) et la police d'écriture qui arrive après le
démarrage peuvent faire bouger la barre, une fois. Sur la dernière page, › devient un bouton
d'ajout, avec sa propre icône (le chevron et un petit +, à ne pas confondre
avec le grand + de « Nouvelle page », qui reste à sa place : aucun bouton de
la barre ne bouge d'une page à l'autre, la poubelle reste sous la main) : il
ajoute une page juste après, au fond de la page qu'on quitte, ouverte à 100 %
sur l'origine. Le second clic d'un double-clic sur ›, ou un clic moins de
600 ms après un changement de page, n'en crée pas : le double-clic qui arrive
sur la dernière page n'en ajoute pas une de plus. Page↓, lui, ne crée jamais
de page (une télécommande n'en fabrique pas) : sur la dernière, un message le
dit, « Dernière page : le bouton Page suivante en ajoute une. » (au plus une
fois toutes les 5 s). À chaque changement de page, le numéro (et le nom)
s'affiche en grand un peu plus d'une seconde, en haut au centre de ce qu'on
voit du tableau, jamais au milieu, là où l'on écrit en arrivant ; le stylet
écrit à travers, et le premier appui sur le tableau l'efface. Ni au
démarrage, ni sous la revue, une séance d'automatismes ou la trieuse des
pages ; sans fondu sous « animations réduites ».

**Dupliquer la page** (le menu de la page, au clic droit dans le vide ou au
bouton du stylet ; Ctrl + Maj + D, ⌘ + Maj + D sur Mac) : une copie juste
après l'original, avec les mêmes objets, le même fond, le même nom suivi de
« (copie) », et toute son histoire (Revoir la montre se construire, voir
« Revoir la construction ») ; on arrive dessus, sur la même vue, et un message
le dit : « Page 3 dupliquée : vous êtes sur la copie (page 4) », avec
**Annuler**. Ctrl+Z (ou ↶) sur la copie, tant qu'on n'y a rien fait, la
retire aussi et ramène à l'original (« Copie retirée ») ; si l'on y a écrit,
Ctrl+Z défait d'abord ce qu'on y a écrit, puis la retire ; « Annuler », lui,
le dit et ne défait rien. Une copie dont l'original a été
supprimé ne se retire plus ainsi (ce serait faire disparaître le seul
exemplaire) : on la supprime à la poubelle. L'original n'est jamais touché, et
chacune garde sa pile d'annulation (celle de la copie commence vide). Rien de
cela dans un champ de saisie, une fenêtre ouverte, la revue ou une séance, ni
pendant qu'on écrit ou qu'on glisse un objet.

**Échap** annule ce qui est en cours (menu, sélection, polygone) ; s'il n'y a
rien, il passe à l'outil Sélection, et un second Échap rend l'outil d'avant.
Une fenêtre ouverte (Publier, Exporter, une question) : Échap la ferme, et
c'est tout, même quand son focus est tombé sur la page (le bouton
« Publier », désactivé pendant l'envoi, le perdait ; il revient maintenant
dans la fenêtre) ; aucune touche du tableau ne change ce qu'elle couvre
(contrôle final du lot 4 : avant, Échap après « Publier » passait en
Sélection, et le trait suivant sélectionnait au lieu d'écrire ; essai
`lot4/CF4-echap-publier.mjs`).
Avec la Sélection, un objet se prend à 6 px de son tracé à la souris, 10 au
stylet, 20 au doigt ; une figure fermée sans fond se prend aussi par
l'intérieur, le trait le plus proche passant avant elle (jamais sous le Stylo,
voir « Prendre un objet »). **Glisser un objet le déplace, glisser dans le vide
sélectionne**, sans touche : un cadre à la souris (et au pavé tactile), un
lasso libre au stylet (tablette graphique comprise) et au doigt. Un lasso
qui fait plus d'un tour (on repasse pour être sûr) garde dedans ce qu'il
entoure deux fois (la règle de l'enroulement non nul). Un objet est
pris s'il est à plus de moitié dedans : plus de la moitié de la longueur de
son tracé, de la surface d'une image ou d'une formule ; une droite, si ses
deux points y sont. Un long trait en diagonale n'est donc plus pris par un
cadre posé dans un coin vide de sa boîte. Parti d'un peu loin d'un trait, ou
du vide d'une figure fermée, un glisser entoure plutôt qu'il n'emporte (voir
« Saisir ou entourer »). Un clic dans le vide désélectionne. Maj + glisser
(ou Ctrl, ⌘ sur Mac) ajoute ce qu'on entoure à la sélection, sans rien en
retirer ; Maj + clic (ou Ctrl + clic, ⌘ + clic sur Mac) ajoute un objet à la
sélection, ou l'en retire s'il y était (Maj + glisser un objet sélectionné
déplace toute la sélection) ; un clic droit dans une sélection de plusieurs
objets ouvre leur menu commun et la laisse entière. À la Sélection, la vue se déplace à deux doigts, au
bouton du milieu, avec Espace + glisser, à la molette ou avec l'outil Main.
L'objet survolé (par son tracé ou son intérieur) s'éclaire d'un halo bleu qui
suit sa forme, avant le clic ; une droite ou une demi-droite sélectionnée se
surligne sur toute sa longueur visible ; les flèches poussent la sélection
d'1 mm (1 cm avec Maj), sauf quand son menu complet est ouvert : elles vont
alors dans le menu (voir « Au clavier »).

**La gomme** efface en entier ce qu'elle touche (un trait, une figure). Un coup de gomme, même
lent et passant sur plusieurs traits, s'annule d'un seul Ctrl+Z (le replay,
lui, les montre partir l'un après l'autre). Le bout gomme du stylet (le stylet
retourné, sur une tablette graphique ou une Surface) efface de même quel que
soit l'outil en main, qu'on retrouve en reprenant la pointe.

**Annuler, rétablir.** Ctrl+Z (⌘Z sur Mac) et ↶ défont le dernier geste de la
page qu'on regarde, et d'elle seule ; Ctrl+Y, Ctrl+Maj+Z et ↷ le refont.
Chaque page garde sa pile : revenir sur une page, c'est retrouver ce qu'on y
peut défaire, et rien ne change jamais sur une page qu'on ne voit pas (seule
exception, dite par le message : Ctrl+Z sur la page d'où des objets ont été
envoyés les retire de la page d'arrivée, voir « Envoyer vers une autre
page »). ↶ et ↷
gardent leur place et se grisent quand la page n'a rien à défaire ou à refaire
(sans clavier, ils se touchent : ils se rallument dès qu'il y a de quoi). Au
clavier, un Ctrl+Z sans rien à défaire le dit : « Rien à annuler sur cette
page ». Un geste fait une étape : un coup de gomme, même lent, même sur une
page relue du disque ; une image transformée avec ses points ; une figure
reconnue en fait une seconde (Ctrl+Z rend le tracé). Une rafale de flèches
qui pousse la sélection fait une étape, séparée de ce qui la précède : Ctrl+D
puis → aussitôt, Ctrl+Z ne défait que la poussée. Pendant une séance
d'automatismes, le tableau est caché : aucune touche ne le change (ni Ctrl+Z,
ni Suppr, ni les flèches). Pendant qu'on glisse un objet, qu'on écrit, qu'on
tire un cadre ou un lasso, ou qu'on déplace la vue, les touches qui
changeraient la page ou la sélection ne font rien : Ctrl+Z, Ctrl+Y, Suppr,
Retour arrière, Page↑, Page↓, la touche Menu, les flèches qui pousseraient la
sélection (Suppr ôtait l'objet tenu, que le lâcher ne posait plus) ; elles
remarchent au lâcher. Les piles vivent le temps
de la séance : après un rechargement, on ne défait plus ce qui a été fait
avant (le replay, lui, a tout gardé).

**Deux doigts : annuler ; trois doigts : rétablir.** Sur une tablette ou un
TNI, un **toucher bref à deux doigts** défait le dernier geste de la page
qu'on regarde, comme Ctrl+Z (comme Procreate, FigJam, Notability, Freeform) ;
à **trois doigts**, il le refait. Un message bref le dit : « Annulé »,
« Rétabli », ou « Rien à annuler sur cette page » ; juste après « Supprimer
la page », c'est « Page 2 rétablie ». Il faut que les doigts se posent presque
ensemble (moins de 150 ms entre le premier et le dernier), que chacun se lève
moins de 300 ms après s'être posé, et qu'aucun ne bouge de 8 px : un
pincement, un déplacement de la vue à deux doigts, deux doigts qu'on laisse
posés, n'annulent jamais rien. La vue, elle, ne bouge qu'une fois ces 8 px
passés : un toucher qui tremble ne la décale pas avant d'annuler. Le premier
doigt d'un toucher à deux doigts ne laisse rien : au doigt qui dessine, son
encre est jetée quand le second se pose ; la Gomme, le Point, un sommet du
Polygone ou le second clic du Segment (qui écrivent dès l'appui) attendent un
instant (150 ms, ou qu'il glisse, ou qu'il se lève) avant d'agir, et rien ne
s'écrit si un second doigt arrive ; à l'outil Sélection, l'objet que le
premier doigt a pris est relâché. Allumés au départ sur un appareil à écran
tactile, éteints ailleurs ; le menu du doigt (le bouton en forme de main) les
coupe : *Gestes — Deux doigts : annuler*, gardé sur l'appareil. Ils n'agissent
jamais pour la souris, le pavé tactile ou un stylet (la tablette graphique de
la classe comprise).

**Supprimer une page.** La poubelle de la barre du haut ne pose plus de
question : la page part tout de suite, on arrive sur la page d'avant (la
suivante pour la première), et un message « Page 2 supprimée » porte un
bouton **Annuler** pendant 7 s. Ctrl+Z (ou ↶), juste après, sur la page où
l'on se retrouve, la ramène aussi ; si l'on a écrit entre-temps, Ctrl+Z défait
d'abord ce qu'on a écrit, puis la ramène. Elle revient à sa place (juste après
la page qui la précédait, même si l'on a ajouté des pages depuis), entière :
ses formes, son fond, son repère, la vue qu'on y avait, ce qu'on peut y
défaire. Rien n'est recopié : la page n'a jamais quitté le document, elle
avait seulement quitté la liste des pages ; la revue et le replay la voient
telle qu'elle était, sans rien redessiner. Ctrl+Y ne la supprime pas de
nouveau. Le second clic d'un double-clic sur la poubelle ne fait rien (on ne
jette pas deux pages d'un coup). Une page seule n'est jamais supprimée : la
poubelle (« Effacer la page ») l'efface, avec « Page effacée · Annuler », ou
dit « La page est déjà vide. ».

**La corbeille.** Une page supprimée (par la poubelle, ou dans la trieuse)
va dans la corbeille ; elle y reste après un rechargement, et un fichier
`.memc` l'emporte. On l'ouvre par le bouton **Corbeille** du bandeau de la
trieuse des pages (« Corbeille (3) » : il dit combien de pages y attendent).
Chaque page s'y montre en vignette (son état actuel), avec son nom (ou « Page
sans nom ») et l'heure de sa suppression : « Supprimée aujourd'hui à 10 h 05 »
(pour une page supprimée par une version d'avant, qui ne notait pas l'heure :
« Supprimée avant cette version · dernière écriture hier à 9 h 12 »), la
dernière supprimée d'abord.
- **Remettre** la rend à sa place d'avant : juste après la page qui la
  précédait si elle est encore là (deux pages voisines supprimées ensemble
  reviennent dans le bon ordre, quel que soit l'ordre des remises), sinon à
  la fin. On revient aux pages, sur sa vignette, et « Page remise : c'est la
  page 4 » porte **Annuler** (Ctrl+Z dans la trieuse aussi). Elle reprend son
  numéro, avec toute son histoire : la revue et le replay la voient comme si
  elle n'était jamais partie (la remettre n'est un geste nulle part).
- **Supprimer définitivement** (une page) et **Vider la corbeille** (toutes)
  posent d'abord la question, dans une fenêtre (« Annuler » a le focus ;
  Échap ou un clic à côté la ferment sans rien faire, la corbeille reste
  ouverte). C'est sans retour : ni « Annuler », ni Ctrl+Z ne la rendent plus,
  et le message « Page N supprimée · Annuler » encore à l'écran s'en va ;
  « Page supprimée définitivement », « Corbeille vidée (3 pages) ».
- Ctrl+Z juste après la poubelle rend toujours la page : elle quitte alors la
  corbeille. Une page vide supprimée n'y va pas (rien à reprendre).
- Échap (ou le bouton **Pages**) ramène à la grille des pages ; au doigt, tout
  s'y touche (boutons de 44 px) ; au clavier, Tab passe d'un bouton à
  l'autre, Entrée les choisit.

**Où c'est noté.** Une page est dans la corbeille quand sa Y.Map est encore
dans la carte `pages` du document, qu'elle n'est plus dans `ordre`, qu'elle a
quelque chose (une forme ou un nom) et que la carte `corbeille`, au premier
niveau du document (id → { t, apres, index, definitif }), ne la marque pas
définitive. Cette carte est hors des pages : y écrire n'est ni une étape du
film, ni une étape d'annulation, et elle voyage avec le document
(rechargement, fichier `.memc`, toujours en version 1). Le retrait de
l'ordre, lui, est une étape « seulOrdre » du film, jamais un geste. Une page
supprimée par la version d'avant (sans entrée) y figure aussi, et se remet à
la fin ; une page effacée par la toute première suppression (sa Y.Map
détruite, sur un tableau très ancien) n'y est pas.

**Supprimée définitivement**, une page n'est pas effacée : elle garde sa
Y.Map et son histoire, elle ne revient seulement plus parmi les pages. Dans
la revue, elle reste une « Page jetée » du tiroir « Que revoir ? », avec toute
son histoire, et une séance passée qui l'a vue s'exporte comme avant : le
classeur, comme son fichier `.memc`, garde tout ce qui a été écrit (la cacher
de la revue seule serait incohérent avec les séances qui la montrent). Une
copie de cette page garde son passé.

**Copier, coller.** Ctrl+C copie ce qui est sélectionné (la figure entière
quand un de ses sommets est choisi ; une image emporte les points qui lui sont
liés), Ctrl+X le coupe, Ctrl+V le colle, Ctrl+D le duplique (1 cm plus loin,
sans passer par le presse-papiers), Ctrl+A sélectionne tout ce qui est sur la
page et passe à l'outil Sélection (Échap vide la sélection, un second Échap
rend l'outil d'avant) ; ⌘ sur Mac. Ce sont les lettres écrites sur les
touches, en AZERTY comme en QWERTY, et AltGr n'en fait pas un raccourci. Rien
de tout cela dans un champ de saisie (une formule qu'on tape, les noms des
sommets : on y copie du texte ; Ctrl+D n'y ouvre pas non plus le marque-page
du navigateur, il ne fait rien), pendant la revue, une séance d'automatismes,
quand une fenêtre est ouverte, ni pendant qu'on glisse un objet ou qu'on
écrit (le lâcher déplacerait ce que la touche vient de prendre) ; sans rien
de choisi, un message le dit.
Ctrl+V colle sur la page qu'on regarde : sous le pointeur (souris, plume de la
tablette graphique) s'il est sur le tableau et a bougé depuis la copie ;
sinon 1 cm à côté de l'original, et trois Ctrl+V de suite font trois copies
étagées ; sur une autre page, à la même place si elle se voit ; une place
hors de ce qu'on voit devient le milieu de la vue. *Coller ici*, dans le menu
de la page (un clic droit dans le vide), colle au point visé. Ce qui est collé est
sélectionné, l'outil ne change pas. Copier ne change rien à la page ; couper,
coller, dupliquer font chacun une étape : un Ctrl+Z retire tout un collage
d'un coup, et rend ce qu'on a coupé. Les noms se choisissent pour tout ce
qu'on colle à la fois, point par point : un point que plusieurs figures
partagent (le sommet A du triangle ABC, de sa hauteur [AH] et le centre A d'un
cercle) garde un seul nom. Ce qu'on colle garde ses noms s'ils sont libres sur
la page (ABC reste ABC sur une page neuve), sinon chaque point reçoit une
lettre libre, la même dans toutes ses figures (DEF et la hauteur [DG] sur la
même page), jamais des primes (A' veut dire « l'image de A ») ; un point lié à
une image collée avec lui suit la nouvelle image. La copie passe d'une page à l'autre, d'un onglet à l'autre
(elle est gardée dans ce navigateur, 12 heures au plus : on ne colle pas le
lendemain ce qu'on avait oublié avoir copié), et entre la version en ligne et
la version clé USB par le presse-papiers du système, images comprises (leurs
pixels voyagent avec elles). Collées dans un autre logiciel, des formules
seules donnent leur LaTeX. Une image copiée ailleurs (une capture d'écran) se
colle toujours comme une image importée. Ce qui vient du presse-papiers du
système n'entre jamais dans la page telle quelle : seules les copies de MEM
teachingtool sont lues, chaque forme est refaite champ par champ (une forme
abîmée resterait pour toujours dans le document et casserait la revue), ses
grandeurs bornées (des places à moins de 10 millions d'unités, 2,5 km au
tableau ; des épaisseurs et des tailles de nom sous 1000 : un nombre démesuré
gèlerait le dessin de la page), et tout le reste est refusé : « Le presse-papiers ne contient ni objet ni image à
coller. »

**Copier en image (pour l'ENT et Pronote).** *Copier la page en image* (le
menu de la page, au clic droit dans le vide ; le menu d'une vignette de la
trieuse) et *Copier en image* (le menu complet de ce qui est pris : le petit
menu de son bouton ⋯, juste après *Copier* ; une image emporte les points qui
lui sont liés) mettent une image
PNG dans le presse-papiers de l'ordinateur : on la colle (Ctrl+V) dans le
cahier de textes de Pronote ou un message de l'ENT, et un message le dit :
« Image copiée : collez-la dans l'ENT ou Pronote (Ctrl+V) ». L'image est
cadrée sur ce qui est écrit (une petite marge ; les noms des points
comptent, même déplacés loin de leur point), aussi nette que l'écran à
100 % (deux pixels par unité, formules et images comprises), sans les
instruments posés ; une grande page est réduite pour tenir dans environ 4
millions de pixels et 4 096 pixels de côté (une page très haute reste
lisible : ses lettres gardent 25 px sur 1 900 × 10 000 unités ; pour une page
plus haute que trois fois sa largeur, le message propose aussi **Exporter en
PDF**, qui la découpe en feuilles A4). Le fond
(carreaux, Seyès, repère) y est ou non : le bouton « Sans le fond » (ou
« Avec le fond ») du message change ce choix et copie de nouveau ; il est
gardé dans ce navigateur (clé `mem-sortie-fond`, la seule nouvelle, partagée
avec le PDF). Quand le navigateur ne sait pas copier une image (Firefox avant
la version 127) ou refuse, le message le dit et propose **Enregistrer l'image
(.png)** : « page-3.png », le nom de la page, ou « objets-page-3.png » pour une
sélection. La copie part dans le clic même (Safari l'exige). Grisé sur une
page vide ; « Rien n'est sélectionné. » sans rien de pris. Pas de raccourci
(Ctrl + Maj + C ouvre l'inspecteur du navigateur). À ne pas confondre avec
*Copier pour Pronote* de la fenêtre Publier, qui copie le lien d'un replay.

**Envoyer vers une autre page.** *Envoyer vers…* (le menu complet d'un objet,
d'une formule ou de plusieurs objets : le petit menu de son bouton ⋯, après
*Copier en image* ; pas dans
la barre d'actions, qui garde les gestes de tous les jours : *Options* y mène,
au doigt comme au stylet) ouvre une fenêtre : « Envoyer les 3 objets vers… »,
deux choix, *Déplacer (ils quittent cette page)*, coché, ou *Copier (ils
restent aussi ici)*, puis la liste des destinations, de grands boutons :
chaque page avec sa petite vignette (« Page 2 · Exercice 12 p. 84 » ; celle
qu'on regarde grisée, « (cette page) »), *Une nouvelle page juste après*, *Une
nouvelle page à la fin* (au fond de la page qu'on regarde, sur sa vue). Un
clic, un toucher ou Entrée sur une destination envoie et ferme ; au clavier,
Tab va des deux choix à la liste puis à *Annuler*, les flèches (Début, Fin)
parcourent la liste, Échap ferme ; sur un téléphone, elle prend toute la
largeur et la liste défile. On reste sur la page, et un message le dit :
« 3 objets envoyés vers la page 5 » (« 3 objets copiés sur la page 5 »), avec
**Aller à la page 5** (ce qui y est arrivé devient la sélection ; la vue s'y
porte si on ne le voit pas ; le message garde son *Annuler*) et **Annuler**.
Ce qui arrive est un collage : identifiants neufs, à la même place, au-dessus
de tout, les noms gardés s'ils sont libres sur la page d'arrivée, sinon une
lettre libre par point (un triangle ABC envoyé sur une page qui a déjà ABC
devient DEF) ; une image emporte les points qui lui sont liés. Pour un
déplacement, « pris » compte aussi ce que Ctrl+Z ou Ctrl+Y peuvent ramener
sur la page d'arrivée (un triangle ABC qu'on y a effacé, renommé ou envoyé
ailleurs) : ce qui arrive n'entre dans aucune pile, et un Ctrl+Z là-bas
pourrait sinon faire cohabiter deux triangles ABC ; un triangle ABC envoyé
vers la page 2 puis renvoyé sur la page 1 y reste ABC. Déplacés, les
objets quittent la sélection ; copiés, elle reste.

L'annulation d'un envoi, sans perte ni doublon caché, avec une pile par page :

- **Ctrl+Z sur la page de départ** (après un déplacement) ramène les objets
  (les mêmes, sous les yeux) et les retire de la page d'arrivée s'ils n'y ont
  pas changé ; un objet modifié depuis là-bas y reste aussi, et le message le
  dit (« Envoi annulé : les 3 objets sont revenus de la page 5 ; 1 objet,
  modifié depuis sur la page 5, y reste aussi ») : rien de ce qu'on y a fait
  n'est perdu. Le message ne dit « revenus de la page 5 » que si quelque
  chose en est vraiment parti. Une nouvelle page créée pour l'envoi, redevenue
  vide, s'en va (pas dans la corbeille, où une page vide ne figure pas ; la
  revue la garde sous « Pages jetées », avec son court passage). Ctrl+Y les
  renvoie (« Envoi refait… »), et la nouvelle page revient à sa place ; vers
  une page supprimée définitivement, Ctrl+Y ne renvoie rien (« La page
  d'arrivée a été supprimée définitivement : l'envoi n'est pas refait. ») :
  les objets y partiraient pour toujours (vers une page seulement dans la
  corbeille, ils partent, et le message le dit).
- **Des objets repartis de la page d'arrivée** (renvoyés ailleurs : l'aller-
  retour page 1 → page 2 → page 1, ou la chaîne page 1 → 2 → 3 ; ou effacés
  là-bas) : Ctrl+Z sur la page de départ ne défait PAS encore l'envoi, rien
  ne change, et le message le dit (« Cet envoi ne s'annule pas encore : sur
  la page 2, l'objet a depuis été effacé ou renvoyé ailleurs. Annulez d'abord
  cela sur la page 2 (↶). », avec **Aller à la page 2**). Le défaire
  laisserait un doublon caché (pour un aller-retour, deux objets exactement
  superposés sur la page 1 ; pour une chaîne, un exemplaire oublié sur la
  page 3), ou en préparerait un (Ctrl+Z sur la page 2 y ramènerait l'objet
  effacé). Ctrl+Z sur la page 2 défait le renvoi (l'exemplaire renvoyé part,
  sous les yeux s'il est sur la page 1), puis Ctrl+Z sur la page 1 défait
  l'envoi : un seul objet au bout. Une page d'arrivée dans la corbeille
  bloque de même (on l'en remet d'abord) ; supprimée définitivement, elle ne
  bloque plus rien (sa pile ne servira plus) : l'objet revient, et le
  message dit que la page supprimée ne l'avait plus.
- **Sur la page d'arrivée, Ctrl+Z ne les retire jamais** (ce serait les
  perdre : ils ont quitté la page de départ) ; il y défait ce qu'on leur a fait
  depuis.
- **Une copie s'annule sur la page d'arrivée** : Ctrl+Z y retire les copies
  (« Copie annulée »), les originaux restent ; Ctrl+Z sur la page de départ
  n'y touche pas. *Annuler* du message d'une copie va d'abord sur la page
  d'arrivée, puis les copies partent sous les yeux.
- *Annuler* du message ne défait l'envoi que s'il est encore le dernier geste
  de sa page (sinon : « La page a changé depuis : ↶ défait les gestes un à
  un. »), en revenant sur la page de départ s'il le faut.

Pourquoi deux étapes : un déplacement est l'arrivée sur la page d'arrivée
(dans aucune pile), PUIS le retrait de la page de départ (une étape de sa
pile, qui retient ce qui est arrivé ; jamais un instant où l'objet n'est
nulle part) ; chacune est notée sur sa page dans le film. La revue de chaque
page et le film élève de chacune sont justes : ce qui part disparaît de la
page de départ, ce qui arrive se dessine sur la page d'arrivée comme un
collage (la revue d'une séance entière montre un court détour par la page
d'arrivée).

Sur un téléphone, le menu complet passe à la ligne sur toute la largeur de
l'écran (il couvre alors le haut de la barre d'outils plutôt que d'en sortir) ;
de même en paysage quand il est plus large que la place à droite de la barre.

**La barre de gauche** ne bouge pas : la poubelle y garde sa place, grisée
quand rien n'est choisi, comme ↶ et ↷ quand il n'y a rien à faire. Sur un écran bas (moins de 900 px de haut environ),
ses boutons gardent leurs 44 px et elle défile, avec une fine barre de
défilement ; les choix des Formes et du Segment suivent leur bouton.
Les **messages** en bas de l'écran passent sous les panneaux et les menus (ils
ne cachent jamais ce qu'on va toucher), sauf pendant la revue, la séance
d'automatismes, le programme de construction et un placement (la consigne de
*Désigner* ou *Tracer*, que le menu complet ouvert ne doit pas cacher ; aucun
appui ne s'arrête sur le texte d'un message) ; un message à bouton
(« Changer ») reste 7 s, et un autre message qui arrive entre-temps s'écrit
au-dessus de lui sans le chasser. Un message peut avoir deux boutons
(« Aller à la page 5 », « Annuler ») ; il prend la largeur de son texte et de
ses boutons, jusqu'à presque tout l'écran (sur un téléphone, ils ne s'y
écrasent pas). Pendant la revue, un message à bouton ne se
montre pas et son bouton ne fait rien (« Annuler » d'une page qu'on vient de
supprimer écrirait dans le tableau, que la revue ne change jamais) ; la
revue fermée, Ctrl+Z sur la page où l'on était arrivé rend la page. Au doigt, ils parlent du bouton Annuler,
pas de Ctrl + Z.

**Au doigt, au stylet.** Deux doigts zooment et déplacent la vue (dès qu'ils
ont bougé de 8 px ; un toucher bref à deux doigts annule, à trois rétablit,
voir « Annuler, rétablir ») ; si l'un se lève, celui qui reste continue de
déplacer la vue, sans jamais se mettre à dessiner (et, si la vue n'avait pas
encore bougé, seulement passé 8 px). L'appui long ouvre le menu, au doigt qui
« déplace » et à l'outil Sélection (voir « L'appui long »). À l'outil
Sélection, quel que soit le rôle du doigt, un doigt qui glisse dans le vide
trace un lasso (le second doigt qui se pose l'efface et déplace la vue), et un
doigt posé sur un objet le prend ou le glisse, comme la souris ; *Ajouter*,
dans la barre d'actions, fait de chaque toucher (du doigt ou du crayon) un
Maj + clic, jusqu'à un toucher dans le vide. Sous les autres outils, le rôle d'un seul doigt se règle
par le bouton en forme de main de la barre de gauche (sur un appareil tactile
seulement ; sa marque dit le choix) :

- *le doigt dessine*, avec l'outil choisi, comme le stylet ;
- *le doigt déplace et sélectionne* : le stylet écrit ; le doigt déplace la vue,
  même parti d'un objet (traverser une page chargée n'emporte rien), et un
  simple toucher choisit l'objet touché, qu'on glisse ensuite pour le déplacer ;
  il prend aussi les instruments et les sommets de la figure sélectionnée, et
  ne laisse jamais d'encre. Quand un clic est attendu sur la page (où commencer
  une construction, *Désigner*, *Tracer un axe* ou un centre), le doigt qui
  glisse déplace la vue pour chercher la place, et un toucher bref fait ce
  clic ;
- *Auto* (au départ) : le doigt dessine jusqu'au premier stylet posé sur
  l'écran lui-même (iPad, Surface, tablette Android), puis il déplace. Un
  message le dit, avec un bouton « Changer ». Une tablette graphique branchée à
  un ordinateur dont l'écran n'est pas tactile ne fait jamais basculer.

Le choix est gardé sur l'appareil. Le même menu coupe (ou rallume) les
gestes à deux et trois doigts. Quand le doigt déplace, la paume est
ignorée : un contact large, et tout contact pendant que le stylet touche
l'écran ; le stylet qui se pose arrête ce que faisait le doigt (la vue, la règle
restent où il les a laissées). Partout, un appui ne devient un glisser qu'à
8 px de son départ au doigt, 6 au stylet, 4 à la souris : un toucher qui tremble
ne déplace rien, ne pose ni rectangle, ni cercle, ni segment le long d'un
instrument, et n'ajoute rien à l'historique. L'encre (stylo, surligneur, l'arc
du compas) part tout de suite.

## Architecture

```
   ┌──────────── navigateur ────────────┐
   │  ui.ts       barres, dialogues     │
   │  app.ts      gestes → formes       │
   │  rendu.ts    3 couches d'affichage │
   │  document.ts document Yjs (CRDT) ──┼── IndexedDB (hors ligne)
   └────────────────────────────────────┘
```

Le choix qui fait tout : **ce qui est écrit vit dans un document Yjs**, un CRDT.
Une forme est un simple objet JSON rangé dans ce document. Trois choses en
découlent sans code supplémentaire :

1. **Tout s'enregistre tout seul.** Le document s'enregistre dans le navigateur
   (IndexedDB), sans bouton ni connexion : il marche hors ligne, et le tableau
   est là le lendemain. Pas de base de données à concevoir. Et le même
   document, tel quel, fait le fichier `.memc` qu'on emporte.
2. **L'annulation ne défait que les gestes, et seulement ceux de la page
   qu'on regarde.** `Ctrl+Z` ne touche ni au chargement depuis le disque, ni
   au film. Chaque page a sa propre pile (une `Y.UndoManager` dont la portée
   est la page), créée à la demande et gardée en mémoire seulement : ni le
   document, ni le fichier `.memc` ne changent. Un Ctrl+Z ne peut donc plus
   défaire, sans rien montrer, ce qu'on a fait sur une autre page. Un geste
   reste une étape, même long (le coup de gomme lent) ; le film, lui, garde
   une étape par changement. Supprimer une page ne fait que la retirer de
   l'ordre des pages : Ctrl+Z la remet, la même, sans rien recopier.
3. **Rien ne se perd.** Le document garde ce qui a été effacé : c'est ce qui
   permet la revue en classe et le replay des élèves.

Le rendu est en trois couches : un canvas pour le fond et les formes posées,
redessiné seulement quand quelque chose change ; une couche HTML pour les
formules KaTeX, nettes à tout zoom ; un petit canvas « direct » pour le trait en
cours, qui fait la latence ressentie au stylet.

Une page se peint aussi **hors de l'écran**, pour les vignettes des pages,
l'aperçu des classeurs (la bibliothèque), l'image copiée et le PDF : par le même code que l'écran (`Rendu.peindreSur`,
sur un rendu jamais attaché au document, avec sa propre caméra), sur
n'importe quel canevas, à n'importe quelle échelle. Les formules y sont
recopiées depuis leur rendu KaTeX : la formule est mise en page, cachée,
comme à l'écran, puis chaque texte, trait de fraction, cadre et SVG est
repeint à sa place sur un canevas (quelques millisecondes par formule, une par tâche ;
un SVG « foreignObject » coûtait 55 à 105 ms et 366 Ko de polices). Comparé
à une capture de l'écran à 100 %, l'écart moyen est de 0,01 sur 255 (0,02
au dpr 2), et l'écran lui-même ne change pas d'un pixel. Une vignette est une
esquisse : chaque trait y est la ligne brisée de ses points (1,6 ms au lieu
de 129 ms pour 346 traits), les petites formules des rectangles gris ; elle
se peint seulement quand elle est à l'écran, par tranches de 12 ms pendant
les moments libres du navigateur (60 pages de 300 traits : toutes prêtes en
moins d’une demi-seconde mesurée, sans jamais bloquer l’écriture), et se repeint
quand sa page change. Le fond imprimé ou non (l'image copiée, le PDF) est un
réglage de ce navigateur, sous la clé `mem-sortie-fond`. Le PDF s'écrit à la
main (`src/sorties/pdf.ts`, sans bibliothèque, quelques kilo-octets) : une
image par feuille A4, en couleurs indexées (les couleurs des objets de la
feuille d'abord, puis les plus fréquentes, compressées), deux fois plus
légère qu'un JPEG de même finesse et sans ses bavures autour des lettres ;
quand 256 couleurs ne la rendent pas fidèlement (une surface changerait de
couleur), ou qu'une petite image y paraît, en RVB sans perte (les lignes
prédites comme celles d'un PNG) ; en JPEG quand une photo couvre au moins
15 % de la feuille. La mise en page (`src/sorties/mise-en-page.ts`, pure) cadre chaque
page, choisit le sens et l'échelle, et découpe une page haute là où le moins
d'objets passent ; l'export (`src/sorties/export-pdf.ts`) prend les formes au
lancement, peint chaque feuille par tranches d'environ 30 ms, lit ses pixels
par bandes, les palettise par tranches de lignes et les compresse en flux, par
morceaux de 512 Ko, en attendant pendant un geste sur le tableau.

| Fichier | Rôle |
| --- | --- |
| `src/types.ts` | Les formes (trait, segment, formule), les fonds |
| `src/document.ts` | Document Yjs : pages (jetées et rendues sans rien recopier), formes, annulation (une pile par page, et des marques pour une page jetée ou une copie toute neuve, en mémoire), film, enregistrement dans le navigateur (et remplacement par un fichier ouvert ; la base supprimée ou changée ailleurs, coupée net (`onCoupee`) ; une écriture refusée repérée, le trou (`trou`, `erreurBase`), et sa réparation (`reparer`) ; une base trouée relue, dont une partie ne se relit plus (`incomplet`) ; attendre la fin des écritures (`attendreEcritures`) ; l'identité du classeur rangée à côté du document). Aussi la corbeille des pages et leurs noms (deux cartes hors des pages, `corbeille` et `nomsPages` : ni étape du film, ni annulation), la copie d'une page avec son histoire (mêmes identifiants de formes, `herite: { de }` ; rien du film n'est recopié ; sa naissance notée `naissance` dans le film, comme celle d'une page vide ; un fond changé dans la trieuse noté `rangement` : ni l'une ni l'autre ne comptent dans le découpage en séances) et le déplacement des pages (le plus petit changement de l'ordre). Envoyer des objets vers une autre page : l'arrivée (dans aucune pile), puis le retrait (une étape de la pile de départ, avec sa méta `envoi`, recopiée d'une pile à l'autre ; elle ne se défait pas tant que la pile de l'arrivée peut y ramener des objets qui en sont repartis, et ne se refait pas vers une page supprimée définitivement) ; la copie, une étape de la pile d'arrivée ; les noms que la pile d'une page peut y ramener (`formesQuiPeuventRevenir`) |
| `src/app.ts` | Gestes au stylet, au doigt et à la souris ; le clavier du tableau (Ctrl + P ouvre « Exporter en PDF ») ; le calme (`calme`, `depuisLeDernierGeste`), qu'attendent les écritures automatiques |
| `src/rendu.ts` | Les trois couches d'affichage ; peindre une page sur un autre canevas (`peindreSur` : une vignette en esquisse, une image, une feuille du PDF), sans rien changer à l'écran |
| `src/sorties/formules.ts` | Les formules KaTeX sur un canevas : mises en page cachées comme à l'écran, puis repeintes (textes, bordures, fonds, SVG coupés), les polices attendues ; leurs images gardées par échelle dans un cache borné en pixels |
| `src/sorties/image.ts` | Copier en image (pour l'ENT et Pronote) : la taille de l'image (jamais plus fine que l'écran à 100 %, environ 4 millions de pixels et 4 096 px de côté au plus), le nom du fichier, l'image PNG cadrée sur le contenu (noms des points compris), la copie dans le presse-papiers du système dans le geste même, le repli « Enregistrer l'image (.png) » ; « Exporter en PDF » proposé pour une page très haute |
| `src/sorties/pdf.ts` | L'écrivain de PDF, pur (sans bibliothèque) : une image par feuille, en couleurs indexées (les couleurs des objets d'abord, puis les plus fréquentes ; l'écart borné : trop d'aplats faux, pas de palette ; compressées par Flate, par tranches de lignes pour rendre la main), en RVB sans perte (lignes prédites comme un PNG, prédicteur 15) ou en JPEG pour une photo ; la table des renvois exacte, le titre en UTF-16 |
| `src/sorties/mise-en-page.ts` | La mise en page du PDF, pure (testée) : le papier A4 (marges, 200 ppp, peint comme une page à 96 ppp), l'échelle et le sens (1 cm = 1 cm tant que le contenu tient sur la feuille ; une page qui n'est pas haute sur une seule feuille, dans le sens qui la montre le plus grand ; une page haute en portrait, à la largeur), la découpe d'une page haute (entre 60 et 100 % de la feuille, jusqu'à 25 % pour ne pas couper une figure qui tient sur une feuille, là où le moins de boîtes passent ; les grands vides sautés) ; le pied de page, le nom du fichier, le titre, les messages |
| `src/sorties/export-pdf.ts` | Exporter en PDF : la fenêtre (ce qu'on exporte, le fond imprimé), puis l'export (les formes prises au lancement, chaque feuille peinte par tranches et coupée à sa bande, le fond peint dans la zone utile, le pied de page ; les pixels palettisés avec les couleurs des objets, ou en RVB sans perte, ou en JPEG quand une photo couvre 15 % de la feuille, compressés par morceaux ; l'attente pendant un geste, la progression, un export à la fois) |
| `src/sorties/apercu.ts` | Peindre une page hors de l'écran (la boîte du contenu, noms des points compris, les polices, les formules et les images préparées, puis la peinture) : la fondation des vignettes, de l'image copiée et du PDF ; le réglage du fond imprimé (`mem-sortie-fond`) |
| `src/pages/vignettes.ts` | Les vignettes des pages : un canevas par page et par taille, peint plus tard par une file paresseuse (seulement s'il est à l'écran, les pages prioritaires d'abord), repeint quand sa page change ; le cadrage d'une vignette |
| `src/fonds.ts` | Carreaux, Seyès, repère gradué |
| `src/geometrie.ts` | Ce que touche la gomme ; ce que vise la sélection (la distance au tracé, l'intérieur plein ou nu, l'aire) ; ce que prend un cadre ou un lasso (la part dedans, le lasso simplifié) |
| `src/formes.ts` | Reconnaissance des figures, codage, transformations |
| `src/revue/` | La revue en classe : ce qu'on revoit, les images, la frise, le choix |
| `src/heritage.ts` | Le passé d'une copie de page : la page qu'on lit vraiment à chaque étape du film (l'original, avant la copie), pour la revue et le film élève |
| `src/revoir/` | Le replay des élèves : format du film, rythme de la main, instruments, exporteur, bobine, lecteur (`revoir.html`), relais |
| `src/piste.ts` | La piste des instruments : ce que la classe en a vu, noté pour le replay |
| `src/publication/` | Publier sur le Drive : comptes et relais (et les dossiers des sauvegardes), connexion Google (le jeton qui suit l'onglet d'un classeur à l'autre : `passerLaConnexion`, `reprendreLaConnexion`), la fenêtre (une copie de classeur, marquée, publie ses séances sous une clé à elle : un nouveau lien) ; les sauvegardes des classeurs (lot 4 C10, `drive.ts`) : le dossier privé marqué à part, le même fichier remplacé (multipart binaire ou envoi reprenable), le garde-fou des deux ordinateurs, l'élagage des versions, la liste et la lecture des sauvegardes |
| `relais/relais-seances.gs` | Le relais Apps Script, à déployer dans chaque compte Google |
| `tests/` | Les tests (`npm test`) : ce qui part chez les élèves, la fidélité du replay |
| `src/instruments.ts` | Règle, équerre, rapporteur, compas |
| `src/construction.ts` | Programme de construction → étapes et gestes |
| `src/constructeur.ts` | Joue les étapes, avec ou sans instruments |
| `src/automatismes.ts` | Les automatismes de 5e (générateurs) |
| `src/seance.ts` | La séance d'automatismes : modes, diaporama, minuterie |
| `src/figures.ts` | Les figures SVG des automatismes |
| `src/ui.ts` | Barres d'outils, le compteur des pages (il ouvre la trieuse), le menu complet (un objet, une formule, plusieurs objets ; sa rangée sur une ligne, son bouton ⋯ et le petit menu de *Copier en image* et *Envoyer vers…* ; placé dans l'écran, sur un téléphone aussi), le menu de la page, « Copier la page en image » et « Copier en image », « Envoyer vers… », « Exporter en PDF » (ses entrées : le menu de la page, le menu ⋯ de la barre du haut, la trieuse), les messages (un ou deux boutons ; au-dessus des panneaux pendant un placement), éditeur de formules ; le bouton du classeur (sa place mesurée, à quatre formes), le bloc de l'état en tête du menu ⋯, le bandeau discret |
| `src/pages/envoi.ts` | La fenêtre « Envoyer vers… » : déplacer ou copier, la liste des destinations (chaque page avec sa petite vignette, une nouvelle page juste après, à la fin), le clavier ; les textes des messages d'un envoi (pur, testé). L'envoi lui-même est `App.envoyerSelection`, son annulation `Tableau.envoyer` |
| `src/barre-actions.ts` | La barre d'actions au-dessus de ce qui est pris : quand elle paraît (jamais avec un autre menu), ce qu'elle montre (selon ce qui est pris et le pointeur), où elle se pose, ce que devient un appui sur elle |
| `src/icones.ts` | Les icônes des barres, des menus et de la barre d'actions (celles des lecteurs sont dans `src/revoir/icones.ts`) |
| `src/habillage.ts` | Ce que règle le menu de plusieurs objets (couleur, épaisseur, pointillés), ce qui y est actif ; les tailles d'une formule ; le nom du menu complet d'un objet |
| `src/navigateur.ts` | Ce que le navigateur ne prend plus : Ctrl + « + », F5, pincer la page, le marque-page de Ctrl + D ; la molette ; la touche Menu ; les touches qui se taisent pendant un geste ; le tableau caché (la revue, une séance d'automatismes, la trieuse des pages : `tableauCache`), sous lequel tout ce qui écrirait sur la page qu'on ne voit pas se tait (le collage, les menus du clic droit, la barre d'actions, le zoom, Ctrl + O, l'annonce du numéro de page) ; la touche des raccourcis (⌘ sur Mac) et la façon de dire « enregistrer », « ouvrir » dans un texte (`POUR_ENREGISTRER`, `POUR_OUVRIR` : le raccourci, ou l'entrée du menu ⋯ sur un appareil qu'on ne fait que toucher) |
| `src/dialogue.ts` | Le fond d'une fenêtre : un appui commencé et fini hors de son cadre la ferme, jamais un appui dans sa marge intérieure (testé) |
| `src/menus.ts` | Les petits menus flottants, sous leur bouton ou au point d'un clic droit (un seul ouvert, Échap, un appui ailleurs ; la barre d'actions prévenue quand l'un s'ouvre ou se ferme) ; le clavier qui va au menu ouvert (aussi pour le menu complet) ; d'où vient le focus (le clavier ou un appui, retenu quand il arrive, et le focus rendu à la fermeture d'un écran) ; le balisage de leurs entrées, de leurs filets et de leurs titres (l'interface et la trieuse s'en servent) ; la place du menu complet près de ce qu'il règle, jamais dessus quand il a la place ailleurs (`positionPanneau`, pur, testé) |
| `src/reglages.ts` | Les réglages de cet appareil (la molette, le rôle du doigt, les gestes à deux et trois doigts), hors du document ; ses fonctions lisent et écrivent aussi le fond imprimé (`mem-sortie-fond`, voir `src/sorties/apercu.ts`) |
| `src/pointeurs.ts` | Souris, stylet, doigt : le seuil du glisser, la portée de la prise, la paume, le stylet sur l'écran, le double appui, l'appui long, le toucher à deux ou trois doigts, les mots des messages |
| `src/session.ts` | La page vue et la vue de chaque page, retrouvées au rechargement, hors du document ; une session par classeur (`mem-session` pour le premier, `mem-session:<id>` pour les autres) |
| `src/pages/trieuse.ts` | La trieuse des pages : toutes les pages en vignettes, plein écran ; l'ouvrir et la fermer (le tableau caché, le reste de l'écran inerte, le focus rendu), aller à une page (clic, toucher, Entrée, numéro tapé), le clavier, le glisser-déposer (souris et tablette graphique tout de suite, doigt par la poignée ou un appui long, défilement au bord), plusieurs pages à la fois (Maj ou Ctrl + clic, Espace, Ctrl + A, « Choisir plusieurs » au doigt), le menu d'une vignette (⋯, clic droit, bouton du stylet, touche Menu ; « Insérer une page… » y choisit le fond en second temps), le nom écrit dans la carte, les messages et leur « Annuler » ; « Exporter en PDF » (le bandeau, celui des pages choisies, le menu d'une vignette, Ctrl + P) ; le bouton « Corbeille (3) » du bandeau, qui ouvre la vue de la corbeille |
| `src/pages/corbeille.ts` | La corbeille des pages, une vue de la trieuse : les pages supprimées en vignettes, quand (« Supprimée aujourd'hui à 10 h 05 »), Remettre (par le journal de la trieuse : « Annuler »), Supprimer définitivement et Vider (après une question, dans une fenêtre de l'outil) ; où c'est noté dans le document (la carte `corbeille`) |
| `src/pages/actions.ts` | Ce que la trieuse fait aux pages, chaque action en une entrée de son journal : renommer, insérer une page vide avant ou après, en ajouter une à la fin, dupliquer avec l'histoire, supprimer vers la corbeille (jamais toutes ; la page où aller quand on supprime celle qu'on regarde), changer un fond (l'origine du repère au centre du contenu), ranger d'une place (pur, testé) |
| `src/pages/glisser.ts` | Où arrive une page lâchée dans la grille (la ligne sous le point, avant la première carte dont le milieu est à droite), où se pose la barre qui le montre, la vitesse du défilement près du bord (pur, testé) |
| `src/pages/journal.ts` | Le journal de la trieuse des pages : chaque action sur les pages (déplacer, renommer, dupliquer, insérer, supprimer, changer un fond) entre avec l'état des pages d'avant et d'après ; annuler (ou rétablir) seulement si le tableau est exactement dans l'état laissé, sinon il le dit et se vide (jamais un changement invisible ni une page perdue) ; une page créée par une action défaite ne va pas dans la corbeille, et y reste hors quand on défait les actions d'avant ; aucune pile de page touchée |
| `src/presse-papiers.ts` | Copier, coller : la copie écrite pour le presse-papiers du système et relue sans passer par la page, chaque forme vérifiée, le collage (noms gardés ou changés, points liés) |
| `src/fichier.ts` | Le classeur dans un fichier `.memc` : l'écrire (l'en-tête avec le nom et l'id du classeur, à la fin), le relire (et refuser ce qui n'en est pas un), vérifier un document entier (`verifierEtat`, ou `verifierDocument` sur un document déjà rejoué), ce qui se relit d'un document où des changements attendent une mise à jour qui manque (`etatLisible`, `ecrireLisible` : un fichier qui se rouvre toujours), lire l'en-tête seul (`lireEntete`) ; la marque d'une copie (`CARTE_COPIE`, `marqueDeCopie`, que Publier lit) ; le nom de tout fichier (`nomSur`, `nomClasseur`) |
| `src/sauvegarde.ts` | Enregistrer et ouvrir un classeur : Ctrl + S (sur la clé quand elle enregistre le classeur ; sinon le fichier par l'écrivain, ou depuis la mémoire quand la base a un trou), Ctrl + O (avec la bibliothèque, il passe la main à `classeurs/fichiers.ts` ; dans le repli, par showOpenFilePicker quand il existe, le fichier lu dans le travailleur, et il remplace le classeur), la question avant de remplacer (`proposerRemplacement`, et sa case « Enregistrer automatiquement les changements dans ce fichier »), « Remplacer » qui donne au classeur l'identité du fichier (ou en fait une copie, registre des publications vidé et marquée, pour le fichier d'un classeur de la corbeille), les autres onglets (le canal des classeurs, et `mem-tableau` pour le premier), le classeur coupé de sa base pour une mise à jour depuis un fichier, la date du dernier enregistrement de chaque classeur ; le téléchargement d'un fichier (`telecharger`, que l'image copiée et le PDF empruntent) |
| `src/main.ts` | Le démarrage : l'index de la bibliothèque et la reprise, le classeur à ouvrir (ou le repli, ou la bibliothèque seule), l'adresse, le titre de l'onglet, puis le classeur chargé et son ouverture notée, la bibliothèque par-dessus lui (ce qui s'écrit avant d'en partir), les fichiers (`classeurs/fichiers.ts`, branchés sur la sauvegarde, la bibliothèque et l'état ; aussi dans la bibliothèque seule), le message d'arrivée, l'annonce du premier lancement ; une page du cache du navigateur se recharge |
| `src/classeurs/demarrage.ts` | Les classeurs, pur (testé) : les noms des bases et des clés (`mem-tableau-local`, seul endroit qui l'écrit), les fiches des classeurs et des dossiers, le premier reconnu à sa base, la clé de stockage d'un classeur, la chaîne bornée des dossiers, ce qui est visible, le classeur qui s'ouvre au démarrage et ses messages, le dernier classeur retenu, l'adresse d'un classeur |
| `src/classeurs/bases.ts` | Les bases des classeurs en IndexedDB pure : ouvrir une base sans jamais la créer (`ouvrirBaseExistante`), lire ses mises à jour, créer la base d'un nouveau classeur (jamais sur une base existante ; une mise à jour ou plusieurs, dans l'ordre : une copie), remplacer son contenu d'un bloc, y ranger l'identité, compter ses entrées (sans `databases()` aussi), l'effacer (bloquée : la suite quand elle part enfin) ; les raisons d'un refus (`ErreurBase`) |
| `src/classeurs/registre.ts` | L'index de la bibliothèque (`mem-teachingtool-bibliotheque`) : l'ouvrir, la reprise du tableau d'avant (une transaction, rejouable) et le ménage des créations et des effacements interrompus (le garde-fou du premier), lire et écrire les fiches et les dossiers (une transaction par geste ; jamais deux fiches pour une base, jamais de cycle de dossiers), changer l'identité d'un classeur, remettre un classeur ou un dossier de la corbeille (son dossier relu dans la même transaction), retirer un classeur effacé (sa fiche, son aperçu, sa poignée), adopter une base sans fiche (une transaction : une seule fiche), les réglages, les aperçus (un, ou tous d'une lecture), les poignées des fichiers de la clé, créer un classeur sans toucher à une base pleine, noter l'ouverture (le premier repris retrouve le nom rangé à côté de son document) ; le canal des onglets |
| `src/classeurs/neuf.ts` | L'état d'un classeur neuf : une page vide au fond choisi, et sa naissance dans le film |
| `src/classeurs/suivi.ts` | Le suivi du classeur ouvert : sa fiche retient quand il a changé, ses pages et son vecteur d'état, au plus toutes les 30 s, dès que l'onglet passe en arrière-plan et à l'ouverture de la bibliothèque (`vider`) ; chaque écriture refait sa carte dans la bibliothèque de l'onglet (`onEcrit`) ; il s'arrête quand le classeur est effacé |
| `src/classeurs/etat.ts` | L'état de la sauvegarde, pur (testé) : ce qui protège le classeur (`protege`, `cleProtege` : pas une clé où rien ne s'est encore écrit), les lignes (navigateur, clé, Drive, fichier) et le texte court du bouton (« Clé : pas encore à jour » tant que le dernier trait n'y est pas ; la dernière copie du Drive sur un autre compte Google), le niveau (le point ambre), les dates (« il y a 7 min »), le rappel d'enregistrer et le bandeau (et ceux du Drive : la copie qui n'est pas remplacée, la connexion qui manque) ; le nom d'une erreur de la base, même enveloppée |
| `src/classeurs/surveillance.ts` | L'état de la sauvegarde en direct : la base (le trou, et sa réparation au calme), le dernier fichier (ici ou dans un autre onglet), le travail depuis ; `majCle` et `majDrive` pour la clé et le Drive (et `cleEnAttente` : le dernier trait pas encore sur la clé) ; `peutQuitter` et `beforeunload` ; `partirParLaBibliotheque` (la clé ne pose pas sa question quand on part par la bibliothèque) ; le bandeau (× : la session, ou une heure pour le rappel) |
| `src/classeurs/ecrivain.ts` | L'écrivain : un seul travailleur pour la page, des demandes numérotées ; le fichier `.memc` d'un classeur depuis sa base (`fabriquerFichier`), le vecteur d'état d'une base (`vecteurDeLaBase`), un fichier lu et vérifié (`lireFichier`, pour Ouvrir ; avec la somme d'une entrée d'un `.memb`), la copie complète d'un classeur dans une base neuve (`copierClasseur`, pour Dupliquer), ce que contient une base sans fiche (`examinerBase`, pour l'adoption), un classeur mis à jour depuis un fichier sans rien perdre (`mettreAJour`), la base d'un classeur ajouté depuis un fichier (`creerBase`), la copie préparée depuis l'état d'un fichier, sans rien écrire (`preparerCopie`, pour « Remplacer » par le fichier d'un classeur de la corbeille) ; le repli sur le fil principal (`mode = 'fil'`) si le travailleur manque ou ne démarre pas, sauf pour les demandes du travailleur seul (`travailleurSeul` : les écritures automatiques, erreur `fil`) ; les erreurs typées (`ErreurEcrivain`) |
| `src/classeurs/ecrivain.worker.ts` | Le travailleur de l'écrivain, intégré à la page (`?worker&inline` : il marche en `file://`) |
| `src/classeurs/ecrivain-taches.ts` | Ce que fait l'écrivain, dans le travailleur ou sur le fil : les demandes (genres `fichier`, `vecteur`, `lire` (avec ou sans somme CRC-32), `copier`, `examiner`, `mettre-a-jour` : une transaction, la base relue et fusionnée dans le rappel de son getAll, l'état du fichier ajouté sans rien effacer seulement si elle y est encore contenue ; `creer` : la base d'un classeur ajouté, hors du fil principal, où ranger 18 Mo prenait près de 100 ms ; `preparer-copie` : l'état d'un fichier et la mise à jour qui vide son registre des publications et le marque, rendus sans rien écrire) et leurs réponses (l'état d'un fichier lu est transféré, sans copie) ; aucun calcul tant qu'une autre demande tient une base ouverte (un effacement n'attend jamais un calcul) ; les erreurs (`absente`, `abimee`, `indisponible`, `illisible`, `fil`, `place`, `existante`, `autre` ; `creee` : la base demandée a été créée, vide, avant l'échec) |
| `src/classeurs/vecteurs.ts` | Comparer deux vecteurs d'état Yjs, pur (testé) : `egal`, `contient`, `contenu`, `diverge` (la clé ne remplace jamais un fichier qui contient plus que le classeur, et voit qu'un classeur a perdu une partie de son histoire) |
| `src/classeurs/cle.ts` | L'enregistrement automatique dans un fichier de la clé (Chrome, Edge, aussi en `file://`) : l'activer (le fichier choisi, vérifié, gardé), quand écrire (20 s après le dernier changement, au plus tard 2 min, au calme), écrire d'un bloc depuis le travailleur, les garde-fous (un autre classeur, un fichier modifié ailleurs, l'histoire perdue), la permission (un clic après un rechargement), les échecs et leurs réessais, un seul onglet qui écrit (Web Locks), la question du navigateur en fermant l'onglet avant l'écriture (`beforeunload`, posée seulement pendant ce temps-là, et l'écriture part aussitôt), Arrêter, la case de la fenêtre « Ouvrir ce classeur ? » ; un conflit propose d'ouvrir le fichier de la clé (`fichierDeLaCle`), et la fiche changée dans l'onglet se relit (`resynchroniser`) |
| `src/classeurs/bibliotheque.ts` | La bibliothèque des classeurs : l'écran (par-dessus le classeur, ou seule), le bandeau et la ligne du classeur ouvert, Récents et la grille du dossier affiché (seules les cartes changées se refont, le focus reste), les cartes des classeurs (des liens : le clic du milieu ouvre un onglet) et des dossiers, les pointeurs et le clavier, le menu d'une carte et celui d'un dossier, ouvrir un autre classeur sans rien perdre (le trou, ce qui attend, le rappel), Nouveau classeur (la case de la clé, la première écriture avant de partir) ; ranger : le conseil, Nouveau dossier, le fil d'Ariane, Retour arrière, la couleur et « Dossier d'une classe », les étiquettes de classe et leur filtre, renommer (F2, double-clic, au-dessus du clavier virtuel), trier ; déplacer (« Déplacer vers… », le glisser-déposer à la souris, à la tablette graphique et au doigt, deux doigts qui défilent), dupliquer, les aperçus en adresses objet ; la corbeille (Supprimer et Suppr, « Annuler », le bouton « Corbeille (3) », Remettre, les questions de Supprimer définitivement et de Vider, « Enregistrer d'abord », l'onglet qui passe sans classeur), l'adoption des bases sans fiche à la première ouverture, la place du navigateur ; `actionsDuBandeau`, `menuDuBandeau`, `blocsDuMenu`, `blocsDuMenuDossier` pour les morceaux suivants |
| `src/classeurs/arbre.ts` | L'arbre de la bibliothèque, pur (testé) : les huit couleurs, les noms (d'un dossier, d'une étiquette, d'une copie), ce qui ressemble à une classe et son rang, le cycle et la remontée bornée, le parent montré, le chemin et le fil d'Ariane, les enfants et les descendants, ce que contient un dossier, les étiquettes héritées et effectives (calculées), la rangée du filtre, le tri par nom |
| `src/classeurs/liste.ts` | Ce que montre la bibliothèque, pur (testé) : Récents (les six derniers ouverts), le tri par date, un classeur à la racine, la date et les pages d'une carte, le texte du lecteur d'écran (avec ses étiquettes et son chemin), les titres des icônes de la clé et du Drive, le nombre de classeurs, le nom d'un classeur neuf |
| `src/classeurs/ecrivain-pur.ts` | Le fichier d'un classeur depuis les mises à jour de sa base, pur (testé) : la fusion, la vérification (une base trouée ou abîmée ne fait aucun fichier ; avec `lisible`, une base trouée relue donne ce qui s'en relit, et le dit), l'en-tête, le gzip, le vecteur d'état, la somme CRC-32 ; la copie d'un classeur (`preparerCopie` : toute l'histoire, le registre des publications vidé et la marque de copie en une transaction) ; l'examen d'une base (`examinerMisesAJour` : ses pages, les formes de toutes ses pages, son film, sa piste, ses publications, ses noms, sa corbeille de pages, ses dates) |
| `src/classeurs/deplacer.ts` | Déplacer un classeur ou un dossier, pur (testé) : là où il est, les places interdites (ni dans soi-même ni dans un descendant, ni là où il est déjà), l'arbre de « Déplacer vers… » (borné), la cible sous le pointeur pendant un glisser (`cibleSous`), le message et ses étiquettes qui changent |
| `src/classeurs/vers.ts` | La fenêtre « Déplacer vers… » : l'arbre des dossiers, en retrait et en couleur, « (ici) » et les grisés, le clavier (flèches, Début, Fin, Entrée, Échap, Tab vers « Annuler ») |
| `src/classeurs/corbeille.ts` | La corbeille de la bibliothèque et les classeurs retrouvés, pur (testé) : ce qu'elle montre (le dernier supprimé d'abord), ce qu'efface un dossier ou « Vider » (tous les classeurs, les sous-dossiers du plus profond au moins profond), où va ce qu'on remet, les textes (messages, questions, ce qui reste ailleurs, jamais enregistré), la place du navigateur, ce qu'est une base vide au sens strict, la fiche d'une base retrouvée |
| `src/classeurs/vue-corbeille.ts` | La vue de la corbeille dans la bibliothèque : les cartes (aperçu ou icône, nom, date, « Était dans »), Remettre et Supprimer définitivement (44 px), « Bibliothèque » et « Vider la corbeille » ; le focus qui suit |
| `src/classeurs/effacer.ts` | Effacer un classeur pour de bon : la fiche marquée, les onglets prévenus (les deux canaux), celui-ci coupé, 300 ms, la base effacée (le vecteur du premier noté avant), puis la fiche, l'aperçu, la poignée et les clés de stockage ; une base bloquée par un onglet, plus tard |
| `src/classeurs/adoption.ts` | Les bases de classeur sans fiche : les trouver (`databases()`), les examiner par l'écrivain, adopter celles qui ne sont pas vides, effacer seulement celles sans aucune entrée (jamais `mem-tableau-local`) ; une seule base (`adopterUneBase`, quand un fichier ouvert porte l'id d'une base d'ici sans fiche) |
| `src/classeurs/enregistrer.ts` | Enregistrer un classeur depuis sa base, sans l'ouvrir (« Enregistrer d'abord », « Enregistrer dans un fichier… » du menu d'une carte) : le choix du fichier dans le clic, l'écrivain, la date notée |
| `src/classeurs/apercu-classeur.ts` | L'aperçu d'un classeur : sa première page en PNG (320 × 200, en esquisse, par `sorties/apercu.ts`), quand le refaire (au démarrage s'il manque, 30 s après le dernier changement de la première page, au calme, au plus toutes les 2 min ; à l'ouverture de la bibliothèque ; avant de partir), rangé dans l'index |
| `src/classeurs/fichiers.ts` | Ouvrir des fichiers (lot 4 C9) : le choix (showOpenFilePicker, plusieurs, `.memc` et `.memb` ; sinon le choix d'avant), les fichiers lâchés, la lecture dans le travailleur, la reconnaissance (une base de cet id sans fiche adoptée d'abord, les vecteurs comparés), la fenêtre d'un fichier et ses choix (Ajouter, Remplacer « … »…, Ouvrir celui de la bibliothèque, Mettre à jour sans rien perdre, Ajouter comme copie, Remplacer celui de la bibliothèque…, la case de la clé), plusieurs fichiers (la fenêtre qui dit tout, le bilan), Enregistrer et Ouvrir toute la bibliothèque (le `.memb` au fil de l'eau ; les dossiers réunis, la case des plus récents), le fichier de la clé en conflit |
| `src/classeurs/reconnaitre.ts` | Reconnaître le classeur d'un fichier, pur (testé) : le même (son id), la corbeille, « ressemble » (un appareil Yjs en commun ; dans un lot, seulement sans id), nouveau ; la décision d'après la comparaison ; le nom d'après le nom du fichier ; les phrases des fenêtres et des bilans ; la réunion des dossiers d'une bibliothèque qu'on ouvre |
| `src/classeurs/copie-drive.ts` | La copie à sens unique sur le Drive (lot 4 C10) : le compte du classeur, quand copier (2 min après le dernier changement, au plus tard 10 min, au plus une fois par max(10 min, 1 min par Mo, 20 fois la durée), au calme, en arrière-plan), depuis la base dans le travailleur, un onglet à la fois (Web Locks), une copie d'un autre onglet qui compte, les classeurs en retard (pas les vides), la connexion (jamais sans un clic ; arrivé connecté d'un autre classeur, les classeurs en retard se copient d'ici ; le jeton expiré, le bandeau ; le compte proposé à Google, retenu pour la copie), le compte Google où est vraiment la dernière copie, les échecs et leurs réessais, les garde-fous (récupérer, remplacer quand même), la question du navigateur en fermant l'onglet avant la copie quand rien d'autre ne protège le classeur (`beforeunload`, et la copie part aussitôt), la fenêtre « Copie sur le Drive… » |
| `src/classeurs/drive-pur.ts` | La copie sur le Drive, pur (testé) : le compte voulu, le rythme (`prochaineCopie`, l'intervalle), le compte Google proposé à la reconnexion (`indiceGoogle`) et la copie sur un autre compte (`copieAilleurs`), la question du navigateur en fermant l'onglet (`questionDuDrive`), ce qu'on dit d'un échec, les phrases des garde-fous, les classeurs en retard |
| `src/classeurs/recuperer.ts` | « Récupérer une sauvegarde du Drive » (le menu ⋯ du bandeau de la bibliothèque) : le Drive, la connexion dans le clic, la liste, le téléchargement, puis le chemin d'Ouvrir |
| `src/classeurs/archive.ts` | Toute la bibliothèque dans un fichier `.memb`, pur (testé) : le zip écrit à la main (entrées stockées, somme et taille dans chaque en-tête local, aucun descripteur ; 4 Go et 65 534 entrées au plus), relu par son répertoire central (`File.slice`), un fichier tronqué par ses en-têtes locaux ; l'index `bibliotheque.json` et son format ; le nom du fichier |

Toutes les briques sont sous licence MIT (Yjs, y-indexeddb,
perfect-freehand, KaTeX, Vite) : aucune clé de licence, aucun filigrane, et rien
n'empêche un usage payant.

## Limites connues de la v0.1

- Tout est redessiné à chaque déplacement de la vue. Au-delà de quelques
  milliers de traits sur une page, il faudra un index spatial (quadtree).
- Entre la version en ligne et la version clé USB, la copie passe seulement
  par Ctrl+V (le presse-papiers du système) : *Coller ici*, dans le menu de
  la page, ne colle que ce qui a été copié à la même adresse.
- Au replay, ce qu'on colle ou duplique se dessine en un peu plus d'une
  seconde au plus (comme Dupliquer jusqu'ici), au lieu de paraître d'un coup ;
  de même ce qu'on envoie sur une autre page (*Envoyer vers…*).
- Après *Envoyer vers…* (un déplacement), on modifie un objet arrivé, on
  défait cette modification puis tout l'envoi sur la page de départ : un
  Ctrl+Y sur la page d'arrivée y refait la modification, et l'objet y
  reparaît, sous les yeux, en plus de celui revenu sur la page de départ (un
  doublon visible, jamais caché).
- Un aller-retour (page 1 → page 2 → page 1) défait sur les deux pages ne se
  refait qu'à moitié : Ctrl+Y sur la page 1 refait l'aller, mais Ctrl+Y sur
  la page 2 ne refait plus le retour (« Rien à rétablir ») ; l'objet reste,
  seul, sur la page 2 (ni perdu, ni en double). On le renvoie à la main.
- Sur iPad (et toute tablette), à l'outil Sélection ou au doigt qui
  « déplace », un appui qui marque un temps (une demi-seconde) avant de
  glisser ouvre le menu au lieu de tracer le lasso, de déplacer l'objet ou la
  vue : on glisse sans s'arrêter, ou l'on referme le menu (un toucher
  ailleurs).
- Au TNI, une manche ou une paume qui effleure l'écran avec un doigt peut
  faire un toucher à deux doigts, qui annule : le message « Annulé » le dit,
  trois doigts ou Ctrl+Y le rattrapent, et le menu du doigt coupe ces gestes.
- Le lot 3 n'a été essayé qu'au navigateur Chromium (piloté par Playwright :
  souris, clavier, doigt, stylet simulé) ; ni la tablette graphique Wacom
  sous Windows Ink, ni un iPad, ni Firefox. À essayer en classe, en dix
  minutes : sur le poste à la Wacom, glisser une page de la trieuse vers la
  rangée du dessous, puis ouvrir le menu d'une vignette par le bouton
  latéral ; sur l'iPad, glisser une page par sa poignée, faire défiler la
  trieuse à un et deux doigts, *Copier la page en image* puis la coller dans
  Pronote, ⌘ + P ; sous Firefox (ESR et récent), *Copier la page en image*
  (sinon le message propose *Enregistrer l'image (.png)*) et Ctrl + P.
- Le menu complet d'une figure reconnue d'un trait à main levée (*Main
  levée*) ou d'un segment passe sur deux lignes, comme avant le lot 3 ; sur un
  écran bas (1024 × 768), avec *Transformer* ouvert, il peut n'avoir de place
  ni au-dessus, ni en dessous, ni à côté d'une figure au milieu de l'écran :
  il en couvre alors le moins possible (17 % au lieu de 82 %, mesuré).
- L'enregistrement automatique sur la clé (lot 4) compare les vecteurs
  d'état Yjs, qui ne voient pas un changement fait seulement
  d'effacements, sans étape du film (retirer le nom d'une page) : écrire sur
  un fichier qui n'a que ce changement-là de plus le défait. Tout geste
  ajoute une étape au film, et se voit. Il n'a été essayé qu'avec
  des fichiers simulés (l'espace privé du navigateur, sans écran) : la vraie
  clé, son retrait et la permission de Chrome restent à essayer en classe.

- Le glisser-déposer de la bibliothèque (lot 4) n'a été essayé qu'au
  navigateur Chromium, piloté (la souris, un stylet `pen` simulé sans écran
  tactile, le doigt, deux doigts, une paume au TNI) : à essayer en classe
  sur le poste à la Wacom (glisser une carte sur un dossier, puis ouvrir le
  menu d'une carte par le bouton latéral) et sur l'iPad (la poignée ⋮⋮,
  l'appui long, deux doigts qui défilent).
- L'aperçu d'un classeur ne se fait que dans l'onglet où il est ouvert : un
  classeur jamais rouvert depuis le lot 4 dit « Pas encore d'aperçu ».
- Les classeurs retrouvés (lot 4) ne se cherchent que là où le navigateur
  sait lister ses bases (`indexedDB.databases` : Chrome, Edge, Safari,
  Firefox récent) ; ailleurs, une base sans fiche reste dans le navigateur,
  intacte, sans paraître dans la bibliothèque. Après la perte de l'index, le
  premier classeur revient avec un id neuf (la reprise n'ouvre jamais sa
  base) : une adresse `?classeur=` notée avant mène à la bibliothèque. Un
  classeur neuf jamais écrit (une page blanche) est vide au sens strict : il
  ne revient pas, et sa base reste.
- Ouvrir un fichier (lot 4 C9) reconnaît un classeur à son id, ou à une
  histoire commune (un appareil Yjs en commun). Un fichier seul qui porte un
  id inconnu ici mais partage une histoire avec un classeur d'ici (une copie
  faite par « Dupliquer le classeur » sur une autre machine) est dit « Ce
  fichier ressemble au classeur… » : « Ajouter comme copie » le garde à part
  (sous un id neuf, nommé « … (copie) », à renommer). Dans un lot (plusieurs
  fichiers, une bibliothèque), un tel fichier est ajouté sous son propre id,
  sans question. Comme pour la clé, une mise à jour qui n'apporte que des
  effacements, sans étape du film, ne se voit pas dans les vecteurs : le
  fichier est alors dit « déjà contenu ».
- La copie sur le Drive (lot 4 C10) n'a été essayée qu'avec un Google
  simulé (la connexion et l'API Drive, au navigateur Chromium piloté) : le
  vrai compte, un classeur de plus de 5 Mo (l'envoi reprenable), les
  versions que garde Google Drive et la place qu'elles prennent restent à
  voir une fois pour de vrai. Comme pour la clé, elle compare les vecteurs
  d'état Yjs : une copie qui n'aurait de plus que des effacements sans étape
  du film serait remplacée sans le dire. Le jeton de Google est à l'onglet :
  il suit les changements de classeur, mais après un rechargement (F5), ou
  dans un autre onglet, la copie attend un clic sur « Se connecter à
  Google » (avec la clé à jour, en silence : une ligne du menu ⋯
  seulement).
- Une bibliothèque (`.memb`) n'a pas de ZIP64 : 4 Go et 65 534 fichiers au
  plus (un refus clair au-delà). Elle n'a été essayée qu'au navigateur
  Chromium, piloté, avec des fichiers simulés (l'espace privé du navigateur) ;
  la vraie clé, Firefox et l'iPad (le téléchargement, le choix de fichier
  d'avant) restent à essayer en classe : enregistrer toute la bibliothèque
  sur la clé, l'ouvrir sur un autre poste, renommer une copie en `.zip`.

## Feuille de route proposée

1. Instruments : règle et équerre qui s'alignent l'une sur l'autre, crayon qui
   suit l'arc du rapporteur pour reporter un angle.
2. Constructions : plus de phrases (triangle par deux côtés et un angle,
   cercle circonscrit, hauteurs, symétriques…), et l'équerre qui glisse le long
   de la règle pour les parallèles.
3. Figures liées : un point partagé par deux figures, une image qui suit sa
   figure quand on la déplace.
4. Import d'un PDF comme fond de page (annoter un énoncé) ; recadrer une image.
5. Formes mathématiques : courbe de fonction, tableau de variations, droite graduée.
6. Revue : export vidéo, et alléger les très longs films (le document ne
   jette plus rien).
