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
d'avant ignore, comme `seulOrdre`). Une copie de copie remonte toute la chaîne. Rien n'est recopié :
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
remettre, les dupliquer n'est pas un geste : ni une séance, ni un pont entre
deux ; une séance dont le film n'aurait aucun geste, qui n'a fait
qu'effacer, n'est pas proposée), les pages où l'on a écrit pendant la
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

**Mettre en ligne.** `npm run build:pages` construit le tableau et le lecteur
dans `dist-pages/`. Le fichier `.github/workflows/pages.yml` les met en ligne
sur GitHub Pages à chaque envoi sur `main`, après les tests (à activer une
fois : Settings → Pages → Source : GitHub Actions). On publie depuis cette
version en ligne : la connexion Google ne marche ni depuis le fichier unique,
ni depuis une adresse que la console Google n'autorise pas. Attention : le
tableau vit dans le navigateur, adresse par adresse ; celui de la version en
ligne n'est pas celui de la clé USB. Pour passer de l'un à l'autre :
« Enregistrer le tableau » d'un côté, « Ouvrir un tableau » de l'autre (voir
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
  grille, et un toucher bref mène à la page.
- **Réordonner au clavier** : Ctrl + Maj + ← ou → (⌘ + Maj sur Mac) avance ou
  recule d'une place la page qui a le focus (toutes les pages choisies, si
  elle en est, regroupées dans leur ordre).
- **Plusieurs pages à la fois** : Maj + clic ou Ctrl + clic (⌘ + clic sur Mac,
  où Ctrl + clic est un clic droit) choisit une page ou la retire, sans y
  aller ; Espace fait de même au clavier, Ctrl + A les choisit toutes. Au
  doigt et au stylet posé sur l'écran, le bouton **Choisir plusieurs** du
  bandeau (un interrupteur, comme « Ajouter » de la barre d'actions) fait de
  chaque toucher un choix ; il s'éteint quand plus rien n'est choisi. Il ne
  s'appelle pas « Ajouter » comme au tableau : dans ce bandeau, à côté
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
  (une étape notée sur cette page).
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

## Enregistrer et ouvrir un tableau

Le tableau s'enregistre tout seul dans le navigateur, mais un navigateur peut
l'oublier : un poste de lycée remis à zéro chaque soir, un iPad sur lequel on
n'est pas revenu depuis des semaines, un historique effacé. Le bouton **⋯**, au
bout de la barre du haut (« Enregistrer, ouvrir ou exporter en PDF », Ctrl + S,
Ctrl + O, Ctrl + P), l'emporte dans un fichier :

- **Enregistrer le tableau…** (Ctrl + S, ⌘ + S sur Mac) écrit un fichier
  `tableau-2026-10-07-14h05.memc` : toutes les pages, tout l'historique (la
  revue en classe et le replay marchent sur une autre machine comme sur
  celle-ci), les instruments, les images, la liste des séances publiées. Sur
  Chrome et Edge, on choisit où l'écrire (la clé USB, un dossier synchronisé
  avec le Drive) ; ailleurs, et depuis la version clé USB, il se télécharge.
  Comme le document, il garde ce qui a été effacé : il n'est pas pour les
  élèves (pour eux : Publier, qui donne un film aplati, `.mem`).
- **Ouvrir un tableau…** (Ctrl + O) remplace le tableau de ce navigateur par
  celui d'un fichier `.memc`, après une question qui dit ce qui sera remplacé
  (« 12 pages, enregistré le mardi 7 octobre 2026 à 14 h 05. Il remplace le
  tableau de ce navigateur (8 pages) et tout son historique ») et propose
  **Enregistrer d'abord**. On peut aussi glisser le fichier sur la page. Le
  fichier est relu en entier avant de toucher à quoi que ce soit : un fichier
  abîmé (tronqué, ou d'un seul bit changé : la somme CRC-32 et la taille de la
  fin du gzip sont vérifiées, et chaque page de l'ordre doit exister avec ses
  formes), un film élève (`.mem`), un fichier d'une version plus récente ou un
  fichier quelconque sont refusés avec une phrase qui dit quoi faire, et le
  tableau n'a pas changé. Le remplacement se fait d'un bloc dans la base du
  navigateur (s'il échoue, faute de place, l'ancien tableau reste entier),
  puis la page se recharge : « Tableau ouvert : 12 pages ». Un autre onglet
  ouvert sur le même tableau l'apprend aussitôt, cesse d'écrire et demande à
  être rechargé. On n'ouvre pas de tableau pendant la revue, une séance
  d'automatismes ou une fenêtre ouverte.
- **Exporter le tableau en PDF…** : toutes les pages, cadrées sur leur
  contenu, en feuilles A4 à imprimer ou à déposer dans l'ENT (voir
  « Exporter en PDF »). Ce n'est pas une sauvegarde : un PDF ne se rouvre pas
  dans MEM.

Le menu rappelle le dernier enregistrement dans un fichier (« aujourd'hui à
14 h 05 »), ou qu'il n'y en a jamais eu. C'est la passerelle entre la version
en ligne et la version clé USB, et d'une machine à l'autre. Le lecteur des
élèves refuse un `.memc` en disant où l'ouvrir. Au démarrage, l'outil demande
aussi au navigateur de ne pas vider sa base pour faire de la place
(`navigator.storage.persist()` : Chrome, Edge et Safari décident seuls, sans
rien demander ; Firefox pose la question) ; ce n'est pas une sauvegarde.

Le fichier : une première ligne de texte,
`{"format":"mem-tableau","v":1,"app":"MEM teachingtool","date":…,"pages":…}`,
puis le document Yjs entier, compressé (gzip). Le film élève commence lui
aussi par `{"format":` ; chaque lecteur reconnaît le sien à ses premiers octets.
Le fichier garde aussi la corbeille des pages, leurs noms et les copies de
pages (qui savent de quelle page elles héritent leur passé) : c'est toujours
la version 1, et une version d'avant les ignore sans rien casser (une copie y
paraît d'un coup au replay, comme une page neuve). L'en-tête ne compte que les
pages de l'ordre, pas celles de la corbeille. Une copie de page coûte le poids
de la page dans le document (environ 400 Ko pour une page de 300 traits
longs), jamais celui de son film : son passé se relit dans celui de
l'original.

## Exporter en PDF

Un fichier PDF à imprimer, ou à déposer dans l'ENT pour les absents :

- *Exporter la page en PDF…* (le menu de la page, au clic droit dans le
  vide ; **Ctrl + P**, ⌘ + P sur Mac) : la page qu'on regarde ; sur un
  tableau de plusieurs pages, la fenêtre propose aussi *Tout le tableau : 12
  pages*.
- *Exporter le tableau en PDF…* (le menu ⋯) et *Exporter en PDF* du bandeau
  de la trieuse : toutes les pages, dans l'ordre.
- Dans la trieuse : *Exporter en PDF* du bandeau des pages choisies (« Les
  pages 2, 5 et 7 »), *Exporter en PDF…* du menu d'une vignette ; Ctrl + P y
  exporte les pages choisies, sinon tout le tableau. La trieuse reste ouverte
  et utilisable pendant l'export.

La fenêtre dit ce qu'on exporte, porte la case *Imprimer le fond de la page
(carreaux, Seyès, repère)* (cochée au départ ; le choix est gardé dans ce
navigateur, le même que pour l'image copiée : `mem-sortie-fond`), une note,
*Annuler* et *Exporter* (qui a le focus : Entrée exporte). Ctrl + P n'imprime
plus la page web (les barres, le tableau coupé au bord de l'écran) : il ouvre
cette fenêtre. Le menu Fichier › Imprimer du navigateur, lui, n'imprime
qu'une phrase : « Pour imprimer : ⋯ → Exporter le tableau en PDF. »

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
  p. 84 (2/3) ») ; à droite le numéro de la feuille dans le PDF (« 4 / 12 »).
- **Une page vide n'est pas exportée**, et le message le dit (« La page 4 est
  vide : elle n'est pas dans le PDF. ») ; rien que des pages vides : « Rien à
  exporter : la page est vide. », et pas de fichier.

Le fichier se télécharge : « tableau-2026-10-09.pdf » (tout le tableau), le
nom de la page (« Exercice 12 p. 84.pdf »), « page-3-2026-10-09.pdf »,
« pages-2-5-7-2026-10-09.pdf » (au-delà de cinq pages, « pages-2026-10-09.pdf »).
Son titre, que montre le lecteur de PDF : « Tableau du 9 octobre 2026 »,
« Page 3 · Exercice 12 p. 84 », « Pages 2, 5 et 7 ».

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
12… »), puis « PDF prêt : tableau-2026-10-09.pdf (12 feuilles A4, 2,4 Mo). » ;
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
(une tablette de 1024 px de large, où la barre tient juste sur une rangée),
le nom ne s'y montre pas et reste dans l'annonce, l'infobulle et la
trieuse. Ainsi ‹ et › restent à leur place : on avance en touchant toujours
au même endroit sans tomber sur le compteur. Seuls le premier nom donné, le
dernier retiré, le passage à dix pages et une fenêtre qui change de taille
(une tablette qu'on tourne) peuvent faire bouger la barre, une fois. Sur la dernière page, › devient un bouton
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
tableau, comme son fichier `.memc`, garde tout ce qui a été écrit (la cacher
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
l'image copiée et le PDF : par le même code que l'écran (`Rendu.peindreSur`,
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
| `src/document.ts` | Document Yjs : pages (jetées et rendues sans rien recopier), formes, annulation (une pile par page, et des marques pour une page jetée ou une copie toute neuve, en mémoire), film, enregistrement dans le navigateur (et remplacement par un fichier ouvert). Aussi la corbeille des pages et leurs noms (deux cartes hors des pages, `corbeille` et `nomsPages` : ni étape du film, ni annulation), la copie d'une page avec son histoire (mêmes identifiants de formes, `herite: { de }` ; rien du film n'est recopié ; sa naissance notée `naissance` dans le film) et le déplacement des pages (le plus petit changement de l'ordre). Envoyer des objets vers une autre page : l'arrivée (dans aucune pile), puis le retrait (une étape de la pile de départ, avec sa méta `envoi`, recopiée d'une pile à l'autre ; elle ne se défait pas tant que la pile de l'arrivée peut y ramener des objets qui en sont repartis, et ne se refait pas vers une page supprimée définitivement) ; la copie, une étape de la pile d'arrivée ; les noms que la pile d'une page peut y ramener (`formesQuiPeuventRevenir`) |
| `src/app.ts` | Gestes au stylet, au doigt et à la souris ; le clavier du tableau (Ctrl + P ouvre « Exporter en PDF ») |
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
| `src/publication/` | Publier sur le Drive : comptes et relais, connexion Google, la fenêtre |
| `relais/relais-seances.gs` | Le relais Apps Script, à déployer dans chaque compte Google |
| `tests/` | Les tests (`npm test`) : ce qui part chez les élèves, la fidélité du replay |
| `src/instruments.ts` | Règle, équerre, rapporteur, compas |
| `src/construction.ts` | Programme de construction → étapes et gestes |
| `src/constructeur.ts` | Joue les étapes, avec ou sans instruments |
| `src/automatismes.ts` | Les automatismes de 5e (générateurs) |
| `src/seance.ts` | La séance d'automatismes : modes, diaporama, minuterie |
| `src/figures.ts` | Les figures SVG des automatismes |
| `src/ui.ts` | Barres d'outils, le compteur des pages (il ouvre la trieuse), le menu complet (un objet, une formule, plusieurs objets ; sa rangée sur une ligne, son bouton ⋯ et le petit menu de *Copier en image* et *Envoyer vers…* ; placé dans l'écran, sur un téléphone aussi), le menu de la page, « Copier la page en image » et « Copier en image », « Envoyer vers… », « Exporter en PDF » (ses entrées : le menu de la page, le menu ⋯ de la barre du haut, la trieuse), les messages (un ou deux boutons ; au-dessus des panneaux pendant un placement), éditeur de formules |
| `src/pages/envoi.ts` | La fenêtre « Envoyer vers… » : déplacer ou copier, la liste des destinations (chaque page avec sa petite vignette, une nouvelle page juste après, à la fin), le clavier ; les textes des messages d'un envoi (pur, testé). L'envoi lui-même est `App.envoyerSelection`, son annulation `Tableau.envoyer` |
| `src/barre-actions.ts` | La barre d'actions au-dessus de ce qui est pris : quand elle paraît (jamais avec un autre menu), ce qu'elle montre (selon ce qui est pris et le pointeur), où elle se pose, ce que devient un appui sur elle |
| `src/icones.ts` | Les icônes des barres, des menus et de la barre d'actions (celles des lecteurs sont dans `src/revoir/icones.ts`) |
| `src/habillage.ts` | Ce que règle le menu de plusieurs objets (couleur, épaisseur, pointillés), ce qui y est actif ; les tailles d'une formule ; le nom du menu complet d'un objet |
| `src/navigateur.ts` | Ce que le navigateur ne prend plus : Ctrl + « + », F5, pincer la page, le marque-page de Ctrl + D ; la molette ; la touche Menu ; les touches qui se taisent pendant un geste ; le tableau caché (la revue, une séance d'automatismes, la trieuse des pages : `tableauCache`), sous lequel tout ce qui écrirait sur la page qu'on ne voit pas se tait (le collage, les menus du clic droit, la barre d'actions, le zoom, Ctrl + O, l'annonce du numéro de page) |
| `src/menus.ts` | Les petits menus flottants, sous leur bouton ou au point d'un clic droit (un seul ouvert, Échap, un appui ailleurs ; la barre d'actions prévenue quand l'un s'ouvre ou se ferme) ; le clavier qui va au menu ouvert (aussi pour le menu complet) ; le balisage de leurs entrées, de leurs filets et de leurs titres (l'interface et la trieuse s'en servent) ; la place du menu complet près de ce qu'il règle, jamais dessus quand il a la place ailleurs (`positionPanneau`, pur, testé) |
| `src/reglages.ts` | Les réglages de cet appareil (la molette, le rôle du doigt, les gestes à deux et trois doigts), hors du document ; ses fonctions lisent et écrivent aussi le fond imprimé (`mem-sortie-fond`, voir `src/sorties/apercu.ts`) |
| `src/pointeurs.ts` | Souris, stylet, doigt : le seuil du glisser, la portée de la prise, la paume, le stylet sur l'écran, le double appui, l'appui long, le toucher à deux ou trois doigts, les mots des messages |
| `src/session.ts` | La page vue et la vue de chaque page, retrouvées au rechargement, hors du document |
| `src/pages/trieuse.ts` | La trieuse des pages : toutes les pages en vignettes, plein écran ; l'ouvrir et la fermer (le tableau caché, le reste de l'écran inerte, le focus rendu), aller à une page (clic, toucher, Entrée, numéro tapé), le clavier, le glisser-déposer (souris et tablette graphique tout de suite, doigt par la poignée ou un appui long, défilement au bord), plusieurs pages à la fois (Maj ou Ctrl + clic, Espace, Ctrl + A, « Choisir plusieurs » au doigt), le menu d'une vignette (⋯, clic droit, bouton du stylet, touche Menu ; « Insérer une page… » y choisit le fond en second temps), le nom écrit dans la carte, les messages et leur « Annuler » ; « Exporter en PDF » (le bandeau, celui des pages choisies, le menu d'une vignette, Ctrl + P) ; le bouton « Corbeille (3) » du bandeau, qui ouvre la vue de la corbeille |
| `src/pages/corbeille.ts` | La corbeille des pages, une vue de la trieuse : les pages supprimées en vignettes, quand (« Supprimée aujourd'hui à 10 h 05 »), Remettre (par le journal de la trieuse : « Annuler »), Supprimer définitivement et Vider (après une question, dans une fenêtre de l'outil) ; où c'est noté dans le document (la carte `corbeille`) |
| `src/pages/actions.ts` | Ce que la trieuse fait aux pages, chaque action en une entrée de son journal : renommer, insérer une page vide avant ou après, en ajouter une à la fin, dupliquer avec l'histoire, supprimer vers la corbeille (jamais toutes ; la page où aller quand on supprime celle qu'on regarde), changer un fond (l'origine du repère au centre du contenu), ranger d'une place (pur, testé) |
| `src/pages/glisser.ts` | Où arrive une page lâchée dans la grille (la ligne sous le point, avant la première carte dont le milieu est à droite), où se pose la barre qui le montre, la vitesse du défilement près du bord (pur, testé) |
| `src/pages/journal.ts` | Le journal de la trieuse des pages : chaque action sur les pages (déplacer, renommer, dupliquer, insérer, supprimer, changer un fond) entre avec l'état des pages d'avant et d'après ; annuler (ou rétablir) seulement si le tableau est exactement dans l'état laissé, sinon il le dit et se vide (jamais un changement invisible ni une page perdue) ; une page créée par une action défaite ne va pas dans la corbeille, et y reste hors quand on défait les actions d'avant ; aucune pile de page touchée |
| `src/presse-papiers.ts` | Copier, coller : la copie écrite pour le presse-papiers du système et relue sans passer par la page, chaque forme vérifiée, le collage (noms gardés ou changés, points liés) |
| `src/fichier.ts` | Le tableau dans un fichier `.memc` : l'écrire, le relire (et refuser ce qui n'en est pas un) |
| `src/sauvegarde.ts` | Enregistrer et ouvrir un tableau : le menu ⋯, Ctrl + S, Ctrl + O, la question avant de remplacer, les autres onglets ; le téléchargement d'un fichier (`telecharger`, que l'image copiée et le PDF empruntent) |

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
- Le menu complet d'une figure reconnue d'un trait à main levée (*Main
  levée*) ou d'un segment passe sur deux lignes, comme avant le lot 3 ; sur un
  écran bas (1024 × 768), avec *Transformer* ouvert, il peut n'avoir de place
  ni au-dessus, ni en dessous, ni à côté d'une figure au milieu de l'écran :
  il en couvre alors le moins possible (17 % au lieu de 82 %, mesuré).

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
