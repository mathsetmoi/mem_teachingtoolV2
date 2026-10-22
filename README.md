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

Version hors ligne (un seul fichier) :

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

## Les essais

```bash
npm test                      # les tests sous Node (tests/), quelques secondes
npm run essais:navigateur:1   # la batterie du navigateur, partie 1 (~1 h 40)
npm run essais:navigateur:2   # partie 2 (~1 h)
```

La batterie des essais du navigateur (environ 350 essais Playwright, dans
`essais/navigateur/`) pilote un vrai Chromium sur l'outil : elle construit
les deux versions, lance son propre serveur de développement et écrit son
résumé dans `essais/navigateur/sorties/RESUME.txt`. Elle est pour les gros
lots, pas pour une petite retouche ; ce qu'elle demande (Playwright et son
Chromium déjà installés) et comment la lire : voir
[`essais/navigateur/README.md`](essais/navigateur/README.md).

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
formule, une figure coloriée se prennent partout où elles sont ; une image et
une figure coloriée cachent ce qui est peint sous elles, et ce qu'on a écrit
par-dessus (un soulignement) se prend avant elles. **On prend ce qu'on voit**
(lot 5) : la prise suit l'ordre d'affichage (voir « L'ordre » plus bas), où
les images sont toujours sous l'écriture et les figures. Une image importée
après un trait est peinte sous lui : un clic sur le trait prend le trait,
ailleurs sur l'image l'image (avant le lot 5, la prise suivait l'ordre des
rangs et ce clic prenait l'image, peinte pourtant dessous) ; de même pour le
sommet d'un triangle tracé avant l'image. Une formule, au fond transparent,
ne cache rien de ce qu'on voit à travers elle : un soulignement, une flèche,
un entourage écrits sur elle se prennent à 2 px, même tracés avant elle, et
la formule se prend encore par son milieu ; au clic droit, le sommet qu'on
voit à travers une formule s'ouvre de même. Vu de très près, l'intérieur
d'une figure qui déborde tout l'écran ne prend rien. Sous un autre outil que
la Sélection, le doigt qui « déplace » prend de même d'un simple toucher,
mais n'emporte un objet sélectionné que
s'il le saisit à 10 px de son tracé (ou par une image, une formule, une figure
coloriée) : parti du milieu d'un grand cadre, il déplace la vue. Jamais sous
le Stylo : écrire dans un triangle ne le prend pas, et un clic droit dans son
vide ne le vise pas (il ouvre le menu de la page, comme à côté). Ce qui est
**verrouillé** ou **fixé en fond** (lot 5, voir « Verrouiller et fixer en
fond » plus bas) est transparent à toutes ces prises : un clic, un cadre, un
lasso, un double-clic, Ctrl + A, la gomme, les flèches, Suppr et les sommets
d'une figure verrouillée passent à travers, jusqu'à ce qui est dessous (ou
le vide). Un membre d'un **groupe** (lot 5, voir « Grouper » plus bas) prend
tout son groupe : au clic, au toucher, au cadre et au lasso (un seul membre
entouré suffit), au clic droit, à l'appui long, au double-clic ; un second
clic simple sur l'un d'eux, le groupe pris, ne prend que lui. Ce qui est pris
porte un **cadre de taille** (lot 5, voir « Changer de taille, tourner »
plus bas) : ses coins (et les côtés d'une image) agrandissent et réduisent,
la pastille ↻ au-dessus tourne ; ces poignées passent avant les sommets
d'une figure et avant l'objet (un instrument posé dessus, lui, passe
avant elles), à l'outil Sélection et au doigt qui déplace seulement.

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
l'écran, jamais sur la barre d'outils (au téléphone non plus depuis le lot
5 : au-dessus de la barre du bas en portrait, à droite de la barre des outils
couché, voir « Le téléphone »). Le cadre de taille et sa pastille ↻ (lot 5, voir « Changer
de taille, tourner ») comptent comme une part de l'objet : elle se pose
au-dessus de la pastille, et ne la couvre jamais (posée en haut de l'écran
pour un objet plus grand que lui, elle passe à côté d'elle). Elle suit la vue et l'objet (zoom, molette, flèches) ; elle
se cache pendant qu'on glisse l'objet, qu'on tire un cadre ou un lasso, qu'on
pince à deux doigts, et revient au lâcher ; elle s'efface quand l'objet sort
de la vue. Elle ne paraît **jamais sous le Stylo** (ni sous un autre outil de
dessin) à la souris ou au stylet : une copie, l'image d'une transformation
restent sélectionnées sans barre, et ce qu'on vient d'écrire n'est jamais
sélectionné (une image importée, elle, arrive à l'outil Sélection, avec sa
barre, son cadre de taille et sa pastille ↻ : retouches après le lot 5, voir
« Images ») ; au doigt qui déplace, elle ne prend
jamais le stylet (sur l'iPad, le crayon posé dessus écrit son trait, comme si
elle n'était pas là). Un clic droit, un double-clic ou un appui long ouvrent
directement le menu complet, qui contient tout : la barre lui laisse la place, comme au menu
d'un morceau, à un petit menu (celui de la page, au clic droit dans le vide,
celui du zoom… : un seul menu à la fois ; elle revient quand il se ferme), à
la revue, à l'éditeur d'une formule, à une
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
  autre page, voir « Envoyer vers une autre page »), puis, après un filet,
  la section **Ordre** (voir « L'ordre » plus bas), après un autre filet la
  section **Protéger** (*Verrouiller*, *Fixer en fond* pour une image : voir
  « Verrouiller et fixer en fond »), puis, pour ce qui tourne à la pastille ↻,
  la section **Position** (*Tourner d'un quart de tour à gauche* et *… à
  droite*, retouches après le lot 5 ; *Remettre droit* quand c'est tourné :
  voir « Changer de taille, tourner »), enfin supprimer.

La rangée de ces onglets tient sur une ligne au-dessus de la figure (le menu
d'un rectangle fait 770 px de large, 54 px de haut) : c'est pourquoi ce qui
sort de la page (une image, une autre page) est rangé derrière ⋯, qu'on ouvre
d'un clic, d'un toucher, au stylet ou au clavier (Entrée, puis ↓ ; Échap
referme ce petit menu seul et rend le focus à ⋯). Le menu complet se pose
au-dessus de ce qu'il règle ; s'il n'y tient pas, en dessous ; sinon à côté (à
droite, puis à gauche) ; jamais sur la figure ni ses poignées quand il a la
place ailleurs (sinon, là où il en couvre le moins), le cadre de taille et
sa pastille ↻ comptant comme la figure (lot 5 : un menu haut, qui ne tient
plus au-dessus d'elle à cause de la pastille, passe dessous) ; quand rien
ne tient hors de ce cadre, il ne couvre ni la figure ni la pastille s'il le
peut, sinon la pastille plutôt que la figure (le menu fermé, on la
retrouve). Pendant *Désigner* ou
*Tracer* (un axe, un centre), il reste ouvert, et la consigne (« Clique sur la
droite qui sert d'axe. ») passe au-dessus de lui.

**Une formule** se modifie au double-clic (comme un texte, partout) ; son clic
droit ouvre son menu : *Modifier* (son infobulle rappelle le double-clic, sauf
au doigt), *Couleur et taille* (les quatre couleurs ;
Petite, Normale, Grande), *Dupliquer*, *Copier*, ⋯ (*Copier en image*,
*Envoyer vers…*, l'ordre, *Protéger* ; *Position* : les quarts de tour, et
*Remettre droit* quand elle est tournée : voir « Changer de taille,
tourner »), supprimer. Pas de
*Transformer* : l'image d'une formule n'en déplacerait que le coin.

**Plusieurs objets** sélectionnés (Maj + clic, un cadre, un lasso, Ctrl + A) :
un clic droit ou un double-clic sur l'un d'eux, même près d'un sommet, ouvre
leur menu commun, et la sélection reste entière. « 3 objets », puis *Couleur,
épaisseur* (les quatre couleurs pour tout sauf les images ; les trois
épaisseurs pour les traits et les figures, un trait de surligneur gardant sa
largeur de surligneur ; les pointillés s'il y a une figure ; un choix est
marqué quand tous l'ont déjà), *Grouper* (lot 5 ; *Dégrouper* pour un
groupe : voir « Grouper » plus bas), *Dupliquer*, *Copier*, *Couper*, ⋯
(*Copier en image*, *Envoyer vers…*), supprimer. Ses boutons sont un peu
plus serrés que ceux du menu d'un objet : avec « Groupe · 3 objets » et
*Dégrouper*, la rangée tient encore sur une ligne de 820 px au plus (800 px
pour deux traits et un triangle, à 1024 px de large ; sur un téléphone, elle
passe à la ligne sur toute la largeur, comme avant).
Seulement ce qui vaut pour chacun : ni les sommets, ni le fond, ni les
transformations. Chaque choix fait une seule étape : un Ctrl+Z rend leur
couleur aux dix objets d'un coup. Le menu se pose au-dessus de toute la
sélection ; Maj + clic sur l'un d'eux l'en retire, et le menu se ferme quand
il ne reste qu'un objet.

**Grouper** (lot 5). Plusieurs objets sélectionnés se groupent par
**Ctrl + G** (⌘ + G sur Mac, comme tldraw, Excalidraw, Figma et PowerPoint)
ou par *Grouper*, dans leur menu commun, juste après *Couleur, épaisseur*.
On ne groupe qu'**à la main** (au lasso ou au cadre, puis *Grouper*) : les
groupes d'écriture automatiques — les traits écrits d'affilée qui forment
un mot, qu'un toucher prendrait en entier et un second réduirait à un
trait — sont remis à plus tard, au choix du professeur (choix c de
l'étude du lot 5 ; voir la feuille de route). Le message :
« Groupé : 3 objets » (la première fois de la séance, le message ajoute « —
un clic sur l'un d'eux, quand le groupe est pris, ne prend que lui » ; au
doigt, « un toucher »). Un groupe se prend d'un bloc : un clic, un toucher,
un cadre ou un lasso qui ne prend qu'un de ses membres, le clic droit, le
bouton du stylet, l'appui long, *Options* ou le double-clic sur l'un d'eux
prennent tous ses membres ; Maj + clic (Ctrl + clic, ⌘ + clic, le mode
*Ajouter* au doigt) l'ajoute ou le retire en entier ; glisser depuis un
membre déplace tout le groupe ; le survol l'éclaire en entier. Pris, il a,
en plus du cadre en tirets de chacun, un cadre plein fin autour de tous
(à l'outil Sélection, c'est le cadre de taille, avec ses coins et sa
pastille ↻ : le groupe change de taille et tourne d'un bloc, voir
« Changer de taille, tourner »). Il
se copie, se colle (ici et dans un autre onglet), se duplique et s'envoie
vers une autre page d'un bloc : ce qui arrive est un groupe neuf, distinct
de l'original (un seul membre copié n'est plus d'aucun groupe) ; Dupliquer
la page garde le même groupe sur la copie (un groupe ne vaut que sur sa
page). Suppr, la couleur et l'épaisseur du menu commun et l'ordre (voir
« L'ordre ») valent pour tous ses membres, en une étape. Son menu commun
s'appelle « Groupe · 3 objets » (« Options du groupe de 3 objets » pour un
lecteur d'écran) et a *Dégrouper* (Ctrl + Maj + G) à la place de *Grouper* :
« Dégroupé », et les mêmes objets restent pris, un par un.

**Un objet du groupe** se prend seul par un second clic **simple** sur lui
quand le groupe est pris (comme tldraw ; au doigt, un second toucher après
un tiers de seconde : plus tôt, c'est un double appui) ; la boîte du groupe
reste alors en pointillé très clair, et la première fois un message le dit :
« Un seul objet du groupe : ce que vous faites ne touche que lui. » (il
attend une demi-seconde : le second clic d'un double-clic ne le fait pas
paraître). Glissé, ce membre bouge seul ; son menu (clic droit, *Options*)
est le sien ; un clic sur un autre membre ne prend alors que celui-là ; un
clic à côté, dans le vide, ou Échap en sortent. Une sélection faite du
groupe et d'autres objets ne se réduit jamais par un clic sur un membre (un
clic dans une sélection de plusieurs la garde). Le **double-clic** (et le
double appui) garde un seul sens : sur une formule du groupe, son éditeur
(elle seule est prise), au Stylo aussi ; sur un autre membre, le menu du
groupe, qui reprend le groupe entier, quel qu'ait été l'effet du second clic
qui le précède. Grouper des groupes les fond en un (un seul niveau, et
depuis un membre pris seul tout son groupe rejoint le nouveau) ; Dégrouper
un membre pris seul le sort de son groupe (s'il n'y restait qu'un objet,
celui-ci n'est plus groupé non plus) : Ctrl + Maj + G sur lui, ou, sans
clavier (au TNI, sur l'iPad, au téléphone), le ⋯ de son menu, qui a pour
lui une section **Groupe** : *Sortir du groupe* (« Les autres restent
groupés », ou « L'autre n'est plus groupé non plus » dans un groupe de
deux ; le titre de ⋯ finit alors par « sortir du groupe ») — depuis la
vérification « conformité » du lot 5, qui l'avait trouvé seulement au
clavier. Le groupe pris entier, lui, a *Dégrouper* dans la rangée de son
menu commun. Ctrl + G sur un groupe déjà pris le
dit (« Ces objets sont déjà groupés. »), sans rien de choisi aussi
(« Sélectionnez au moins deux objets pour les grouper. », « Aucun groupe dans
la sélection. ») ; Ctrl + G et Ctrl + Maj + G sont toujours empêchés hors
des champs (sinon la recherche du navigateur s'ouvrirait, ou « suivant »
sur Mac), une fois par appui, et ne font rien en plein glisser ; la lettre
se lit par la touche tapée (en AZERTY comme en QWERTY). Un point libre
repéré sur une image groupée entre dans le groupe avec elle ; verrouillé, il
n'y entre pas, mais suit toujours son image. Un groupe est **libre en entier
ou verrouillé en entier** : Verrouiller, Déverrouiller, Maj + L et
*Déverrouiller tout* agissent sur tout le groupe, même depuis un membre pris
seul (« 3 objets verrouillés. … ») ; le clic droit sur un membre verrouillé
ouvre le menu court de tous (« Verrouillés · 3 objets ») ; Grouper et
Dégrouper ne touchent pas à ce qui est verrouillé (« Verrouillé :
déverrouillez-le d'abord. »). Fixer en fond sort l'image de son groupe ; une
image fixée n'est d'aucun groupe. L'image d'un membre par *Transformer* n'en
est pas (c'est un objet neuf) ; la gomme n'efface que le membre qu'elle
touche. Grouper et Dégrouper ne changent rien à l'image : chacun est une
étape d'annulation (un Ctrl + Z défait le groupement entier) et une étape du
film notée « réglage », que ni la revue, ni les séances, ni le film des
élèves ne comptent comme un geste ; le groupe survit au `.memc`, au
presse-papiers, à la copie de page, au film et à la revue.

**L'ordre** (lot 5). Ce qui est sur une page se peint en calques, toujours
dans le même ordre : les images fixées en fond, les images, l'écriture et
les figures, les formules (`src/ordre.ts`). Une image et son papier ne
recouvrent jamais un trait de construction, quel que soit le moment où on
l'a importée, et les formules restent en HTML au-dessus de tout, nettes à
tout zoom (c'est le modèle des carnets, GoodNotes ou Notability, plutôt
que l'ordre unique de tldraw ou d'Excalidraw, qui obligerait à peindre les
formules dans le canevas). Dans un calque, le plus récent est dessus. Le
menu ⋯ du menu complet (d'un objet ou de plusieurs) a une section *Ordre* :
*Mettre au premier plan* (Ctrl + Maj + ↑), *Avancer* (Ctrl + ↑), *Reculer*
(Ctrl + ↓), *Mettre à l'arrière-plan* (Ctrl + Maj + ↓) ; ⌘ sur Mac, où
Ctrl + ↑ est Mission Control. Elles n'agissent que dans le calque de l'objet,
et le menu le dit (`aidesOrdre`, `src/ordre.ts`) : pour des images seules,
l'aide de *Mettre au premier plan* est « Devant les autres images ;
l'écriture et les figures restent devant » ; pour des formules seules,
« Devant les autres formules ; les formules restent au-dessus de tout », et
celle de *Mettre à l'arrière-plan* « Derrière les autres formules, toujours
au-dessus de l'écriture et des figures » ; pour l'écriture et les figures
(depuis la vérification « conformité » du lot 5 : un trait mis au premier
plan restait sous une formule sans que rien ne l'explique), « Devant
l'écriture et les figures ; les formules restent au-dessus » et « Derrière
l'écriture et les figures ; les images restent dessous » ; pour une
sélection mêlée, « Chacun dans son calque : images, puis écriture et
figures, puis formules ». Une image et un trait choisis ensemble montent
chacun dans le sien. *Avancer* et *Reculer* passent l'objet devant
(derrière) le plus proche qui le **chevauche** (comme tldraw : sinon
« Avancer » ne ferait souvent rien de visible) ; sans voisin qui chevauche,
rien, et un message : « Rien à passer devant à cet endroit », « Rien à
passer derrière à cet endroit » ; déjà en haut ou en bas de son calque,
« Déjà au premier plan », « Déjà à l'arrière-plan ». Une entrée qui ne
ferait rien est grisée. Une image mise à l'arrière-plan ne passe jamais sous
une image fixée en fond : sur une page, toute image fixée reste sous toute
image libre (la version d'avant, son lecteur et son export PDF, qui rangent
les images par rang seulement, la peignent ainsi au même endroit). Un
changement d'ordre est un geste : une étape d'annulation (un Ctrl+Z rend
tous les rangs d'un coup) et une étape du film, que la revue et le lecteur
des élèves montrent comme les autres. La sélection reste ; un objet
verrouillé ne bouge pas (« Verrouillé : déverrouillez-le d'abord. » s'il
n'y a que lui). Le rang n'est qu'un ordre : entre deux voisins, l'objet
prend un rang fractionnaire ; quand l'écart s'épuise (après une douzaine
d'allers-retours entre les deux mêmes voisins), seules les une ou deux
formes juste au-dessus sont décalées, jamais toute la page (chaque forme
réécrite est recopiée entière dans le document).

**Changer de taille, tourner** (lot 5). À l'outil Sélection, ce qu'on a
pris porte un **cadre de taille** : une **image** a ses quatre coins et le
milieu de ses quatre côtés, un cadre qui tourne avec elle ; une **formule**,
ses quatre coins, tournés avec elle ; un **trait** à main levée, un
**groupe** et **plusieurs objets**, les quatre coins de la boîte de tout
(6 px autour), reliés par un trait plein fin (celui d'un groupe pris tient
lieu de son cadre plein : un seul dessin). Les coins sont des carrés
blancs cernés du bleu de la sélection, les côtés des barrettes ; le cadre
en tirets de chaque objet reste. Un **coin** tiré agrandit ou réduit en
gardant les proportions, autour du coin opposé, qui ne bouge pas (comme
Excalidraw et tldraw) ; un **côté** d'une image la déforme dans un seul
de ses axes (sans clavier : au TNI, sur l'iPad, à la tablette graphique
posée loin du clavier), et **Maj + coin** la déforme dans les deux à la
fois (Excalidraw et tldraw gardent aussi les proportions d'une image par
défaut, Maj les libère). La taille s'affiche près du pointeur (« 150 % »,
« 150 % × 100 % » pour une image déformée) ; × 1 attire à ±3 % (on revient
à la taille d'origine sans viser), sinon le facteur va au centième ; il ne
passe jamais de l'autre côté du coin opposé (pas de retournement : passé
lui, l'objet reste au plus petit) et s'arrête aux bornes (plus bas).
Au-dessus du cadre, au milieu, au bout d'un filet, la **pastille ↻**, le même
dessin que celle des instruments : tirée en rond, elle tourne ce qui est
pris autour du milieu du cadre ; l'angle **tourné** s'affiche (« ↺ 30° »
dans le sens direct, « ↻ 30° » dans l'autre), plus d'un tour se compte.
Elle est à 24 px du cadre à la souris, 28 au stylet, 36 au doigt
(l'étude : « détachée au-dessus du cadre », comme SMART, ActivInspire,
Excalidraw et PowerPoint ; une poignée qu'on voit, plutôt qu'une zone
invisible hors du coin comme tldraw ou Figma, introuvable au doigt et au
TNI) ; pour une image ou une formule tournée, au-dessus de SON bord du
haut ; dessous quand elle sortirait de ce qu'on voit entre les barres ; et
pour un objet plus grand que l'écran (à 2000 %), en bas de ce qu'on voit.
Les poignées sont plus grandes au doigt : elles se prennent à 10 px de leur
centre à la souris, 12 au stylet, 20 au doigt (tldraw a 12 et 20 ; les
8 px de l'étude étaient trop petits), et se dessinent en 8, 10 et 14 px,
d'après le dernier pointeur vu (le survol de la tablette graphique
compte) ; sur un objet trop petit à l'écran (vu de loin), les coins
sortent du cadre et restent prenables. Au survol, le curseur dit la
poignée : la double flèche de la diagonale d'un coin ou de l'axe d'un
côté (elle tourne avec le cadre), la main sur la pastille. **Une figure
géométrique seule n'a pas de coins** : ses sommets restent ses poignées
(lots 1 et 2), les coins d'un rectangle tomberaient sur eux, et
l'homothétie de *Transformer* garde son sens ; elle n'a que la pastille,
qui la tourne autour de son centre (une droite seule : autour du milieu de
[AB], la pastille au-dessus de [AB], jamais au bord de l'écran). Un point
seul, un cercle entier : rien. Avec un groupe ou plusieurs objets, les
figures changent de taille et tournent avec les autres. Les poignées ne
se prennent qu'à l'outil Sélection ou au doigt qui déplace : **jamais sous
un outil de dessin**, jamais sous la plume au Stylo (à la tablette
graphique, un trait commencé sur le coin d'une image écrit : une image
qu'on vient d'importer passe à l'outil Sélection, et P rend le Stylo ; sur
l'iPad, le doigt qui déplace a les poignées, jamais le crayon), jamais pendant qu'on glisse l'objet, jamais sur un objet
verrouillé ou fixé en fond, jamais dans la revue, le lecteur ni les
sorties. Un instrument posé au-dessus passe avant. Pendant le geste, rien
ne s'écrit : on voit l'objet changer (un trait agrandi s'épaissit déjà,
une figure garde son épaisseur, une formule tourne et grandit en HTML),
le cadre et la pastille le suivent, la barre d'actions et le menu complet
se cachent. Au lâcher, le geste s'écrit en une étape ; lâché sans avoir
glissé, rien ; Échap, un second doigt (on pince), le stylet qui se pose
pendant un geste du doigt ou un geste coupé par le système l'abandonnent,
et tout revient. Ni appui long ni double-clic sur une poignée (la
pastille, hors de l'objet, est souvent au-dessus d'un autre). Un menu
ouvert, l'appui sur une poignée le ferme et la tire aussitôt (comme sur un
objet qu'on prend : le premier appui n'est pas perdu). La barre
d'actions et le menu complet comptent le cadre, ses poignées et sa
pastille comme une part de l'objet : la barre se pose au-dessus de la
pastille (ou sous l'objet), et ni l'une ni l'autre ne la couvre jamais. La
première fois qu'on prend une image seule, un message le dit :
« Coins : agrandir ou réduire ; côtés ou Maj + coin : déformer ; ↻ :
tourner » (au doigt : « côtés : déformer ») ; une image qu'on importe a le
sien, qui en tient lieu (voir « Images »). **La pastille qu'on voit se
prend** (retouches après le lot 5) : les poignées prennent la taille du
dernier pointeur vu, et un pointeur qui se pose sans avoir survolé trouve
une pastille dessinée pour le pointeur d'avant — un doigt après la souris la voit à
24 px du cadre, où la sienne serait à 36 (un appui un peu sous son centre
tombait sur le côté du haut et **déformait l'image** au lieu de la
tourner) ; le crayon de l'iPad après le doigt la voit à 36 px, la sienne
est à 28. Un appui sur la pastille dessinée la prend donc, à la portée du
plus large des deux pointeurs (`poigneeDeLAppui`, `src/cadre.ts`), et
tourne autour du même centre ; hors de son disque, plus près du bord du
cadre, c'est le côté, comme avant.

Une transformation (agrandir, réduire,
tourner) réécrit chaque forme prise **entière**, en un seul geste : une
étape d'annulation (un Ctrl + Z la défait d'un coup, sur sa page seulement ;
à l'outil Sélection, **ce qui était pris le reste**, avec son cadre, sa
pastille et sa barre d'actions, après Ctrl + Z comme après Ctrl + Y, pour
un quart de tour et *Remettre droit* aussi : corrections des vérifications
des retouches, `App.reprendreTransformes` — la sélection se vidait comme
après tout geste défait, et le même coin tiré de nouveau pour agrandir un
peu moins emportait l'image au lieu de l'agrandir) et une étape du film, que la revue et le lecteur des élèves montrent d'un
coup, comme un déplacement (la forme garde son identifiant). Tout est
« cuit » dans ses coordonnées (les points d'un trait, les sommets d'une
figure, la matrice d'une image) : la version d'avant le voit tel quel. Un
**trait** agrandi s'épaissit avec lui, comme l'image d'une écriture
(agrandir un mot, c'est en faire une image plus grande, comme dans
GoodNotes ou OneNote ; l'étude proposait de garder l'épaisseur, avec une
case pour choisir : un choix propre à MEM, sans case, Ctrl + Z si l'on
voulait autre chose) ; réduit, il garde au moins 1 d'épaisseur, lisible au
vidéoprojecteur (un trait déjà plus fin garde la sienne). Une **figure**
garde l'épaisseur de son contour et la taille des noms de ses points, comme
l'homothétie de *Transformer* ; les noms tournent avec elle, à la même
distance de leur point, et son codage se recalcule (les mêmes côtés égaux,
les mêmes angles droits) ; son tracé à main levée d'origine suit (*Main
levée* rend le tracé tourné et agrandi). Une **image** tourne et s'agrandit
par sa matrice, et ne se déforme que dans ses propres axes ; les points
repérés sur elle la suivent, même verrouillés. Une **formule** change de
taille de caractères (KaTeX la remet en page : nette) et garde sa
**rotation** dans un champ (radians, autour de son coin) : elle tourne en
HTML, par CSS, et son texte reste vectoriel, net à tout zoom ; elle se
prend au clic, s'entoure au lasso et se gomme dans son **rectangle
tourné**, jamais dans le coin vide de la boîte droite qui la contient ; son
halo de survol et son cadre en tirets suivent ce rectangle ; l'image
copiée, le PDF, les vignettes, la revue et le lecteur des élèves la
montrent tournée (la version d'avant, droite). Les bornes : une formule
reste entre 6 et 1000 de taille, une image garde au moins 4 unités de
côté, et rien ne sort des bornes de la liste blanche du presse-papiers
(une forme transformée se copie toujours). Les **aimants de la pastille**
portent sur l'angle tourné : les multiples de 45° attirent à ±3°, **sauf
0°** (un énoncé photographié de travers doit pouvoir tourner de 2°, et
90° pile se trouve sans Maj, même au TNI) ; avec Maj, des pas de 15°
(comme tldraw, Excalidraw, Figma) ; sinon le degré entier. C'est un écart
voulu avec l'étude (un aimant à 0°) et avec les instruments, dont la même
pastille aimante l'**orientation** tous les 15° à ±2,5° et affiche
« 30° » : un instrument a une orientation qui compte en elle-même (la
règle horizontale), un objet tourne depuis là où il est. Pour revenir
exactement à 0, **Remettre droit** : le menu ⋯ d'une image ou d'une
formule seule tournée a une section *Position*, avec *Remettre droit*
(« Annule la rotation, garde la taille ») ; la rotation s'annule, la taille
et le centre restent, et une image retournée par une symétrie le reste
(elle est seulement remise le haut en haut). C'est un geste comme les
autres : Ctrl + Z rend la rotation. **Tourner d'un quart de tour**
(retouches après le lot 5) : la même section *Position*, dans le menu ⋯ de
tout ce qui a la pastille ↻ (une image, une formule, un trait, une figure,
un groupe, plusieurs objets libres), sous tous les outils, a *Tourner d'un
quart de tour à gauche* (« ↺ 90°, autour de son centre ») et *… à droite*
(« ↻ 90° ») : autour du centre de la pastille, exactement (des coefficients
0 et ±1, `quartDeTour`), en une étape d'annulation, comme elle. C'est le
chemin de la **tablette graphique** : au Stylo, son bouton latéral (un clic
droit) ouvre le menu complet de l'image, puis ⋯, sans viser la pastille ni
changer d'outil ; quatre quarts de tour la ramènent droite. **Un clic sur la pastille ↻**
(retouches après le lot 5, le souhait du professeur) tourne aussi d'un
quart de tour à droite, autour du même centre, en une étape : un énoncé
photographié couché se relève d'un clic. Le second clic d'un double-clic,
au même endroit juste après (la pastille a tourné avec l'objet), tourne
encore : un demi-tour, et aucun menu ne s'ouvre. La pastille elle-même est
redessinée : trois quarts de tour dans le sens des aiguilles d'une montre,
avec une pointe pleine bien visible au bout (la même sur les instruments).
Deuxième retouche, à la demande du professeur : **↺ à côté de ↻**, la même
pastille retournée, qui tourne aussi (un clic : un quart de tour à
gauche) ; et **les pastilles restent en haut** : le haut du cadre d'une
image ou d'une formule est son bord le plus haut à l'écran, plus le haut
de l'objet, si bien qu'après un quart de tour elles ne passent plus sur le
côté.

**Le cadre de la sélection au plus près de l'objet** (retouches après le
lot 5 : les grands rectangles en tirets prenaient trop de place). Une image
prise a ses tirets sur son propre bord, tournés avec elle, ses poignées
dessus ; un cercle entier, un cercle en tirets ; un trait, un segment, une
figure, le rectangle le plus serré autour de leur tracé (`rectangleAjuste`,
`src/geometrie.ts`), penché quand c'est nettement plus serré que la boîte
droite (moins de 60 %) : une droite oblique a une bande fine le long
d'elle. Une écriture garde sa boîte droite (un mot n'est pas penché de 4°).
Un trait oblique seul a aussi son cadre de taille penché avec lui
(`rectangleDe`, `src/cadre.ts`). Plusieurs objets gardent leur cadre commun,
droit, autour de tout. Deuxième retouche (« trop de traits ») : un objet
seul qui a un cadre de taille (une image, une formule, un trait) n'a plus
qu'un trait plein fin, celui du cadre, ses poignées dessus, sans tirets en
plus ; les points repérés sur une image prise n'ajoutent pas de tirets ;
un objet droit a ses tirets serrés autour de son tracé, sans la place des
noms ni le carré d'un cercle autour d'un arc.

**Rogner une image** (retouches après le lot 5). *Rogner* est dans la barre
d'actions d'une image seule (en tête), dans son menu court (le clic droit,
le bouton du stylet) et dans la section *Position* du menu ⋯. L'image paraît
entière, ce qu'on enlève assombri, la partie gardée claire avec huit
poignées (quatre coins, quatre côtés), tournées avec l'image ; on tire une
poignée, on glisse la partie gardée. Pour finir : un clic (un toucher) à
côté de l'image, Entrée ou *Terminer* ; Échap ou *Annuler* rend l'image
telle quelle. L'image rognée est une image neuve, faite des seuls pixels
gardés, posée exactement là où ils étaient (même matrice) : la version
d'avant, le replay et la copie la voient comme une image ordinaire, et
Ctrl + Z rend l'image entière. Le calcul est dans `src/rognage.ts`.

**Verrouiller et fixer en fond** (lot 5). Deux façons de protéger ce qui est
sur une page. **Verrouiller** (tout objet : le menu ⋯ du menu complet,
section *Protéger*, ou **Maj + L**, comme tldraw) : l'objet ne bouge plus et
ne se prend plus, ni au clic, ni au cadre, ni au lasso, ni au double-clic, ni
à Ctrl + A ; la gomme, les flèches et Suppr le laissent ; les sommets, les
noms, le centre et le rayon d'une figure verrouillée ne se tirent plus ; au
Stylo, un double-clic sur une formule verrouillée pose son point d'encre,
comme ailleurs. Seuls le **clic droit**, le **bouton du stylet** et
l'**appui long** sur lui ouvrent son **menu court** : un cadenas et
« Verrouillé », *Déverrouiller* (Maj + L), *Copier* (la copie reste
verrouillée), ⋯ (*Copier en image*, *Envoyer vers…*) ; ni Supprimer, ni
Dupliquer, ni Contour, ni Transformer. L'objet n'est sélectionné que le
temps de ce menu (jamais de barre d'actions sur lui) : le menu fermé, il ne
l'est plus. Un **cadenas** le dit, à son coin haut droit (un disque blanc,
le cadenas gris, discret au vidéoprojecteur ; une image ou une formule
tournée : le coin de son rectangle tourné le plus en haut à droite, sur
elle, et son cadre gris tourné avec elle, et non la boîte droite qui
l'englobe, où il flottait dans le vide : `coinsVus`, `coinHautDroit`,
`src/geometrie.ts`) : au survol de l'outil
Sélection (la souris, le stylet qui survole), pendant 1,5 s après un appui
ou un toucher sur lui qui n'a rien pris (la première fois de la séance, un
message dit comment le déverrouiller : « Objet verrouillé : clic droit
dessus pour le déverrouiller. », « … bouton du stylet… » à la tablette
graphique, « … appui long… » au doigt et au stylet posé sur l'écran), et
tant que son menu est ouvert, avec son cadre gris ; jamais au Stylo, ni
dans la revue, le lecteur des élèves ou les sorties. Verrouiller vide la
sélection (« Verrouillé : il ne bouge plus. Clic droit dessus pour le
déverrouiller. », ou « 3 objets verrouillés. … ») ; Déverrouiller le rend
à la sélection (« Déverrouillé »). Maj + L verrouille ce qui est
sélectionné, ou le déverrouille quand son menu court est ouvert ; sans rien
de sélectionné, la touche reste le Segment (L), comme avant, et en plein
glisser elle ne fait rien. Verrouiller et déverrouiller ne changent rien à
l'image : chacun est une étape d'annulation (un Ctrl+Z) et une étape du film
notée « réglage », que ni la revue, ni les séances, ni le film des élèves ne
comptent comme un geste (voir « Revoir la construction »). Un point repéré
sur une image (outil Point) la suit toujours, même verrouillé : on pousse ou
on glisse l'image, il vient avec elle.

**Fixer en fond** (une image seulement : l'énoncé photographié, une
capture ; le menu ⋯ de l'image, ou le bouton *Fixer en fond* du message qui
suit son import) : elle passe sous tout le reste et ne se prend plus du
tout, pas même au clic droit ; on écrit et on entoure par-dessus (un lasso
ou un cadre qui part sur elle entoure l'écriture, pas elle), la gomme ne
l'efface pas, et elle sort de son groupe. C'est un geste, qui se voit (une
étape d'annulation et du film). Pour la détacher, la copier ou l'envoyer,
c'est le **menu de la page** : le clic droit (le bouton du stylet, l'appui
long) dans le vide ou sur elle, sous n'importe quel outil, a *Détacher
l'image du fond*, *Copier l'image du fond* et *Envoyer l'image du fond
vers…* (pour la plus haute des images fixées sous le pointeur ; à côté
d'elles, *Détacher le fond*, *Copier le fond*, *Envoyer le fond vers…* pour
toutes, « 2 images fixées en fond sur cette page »). Détachée, elle reste
sous les autres images et devient la sélection, l'outil Sélection en main,
avec son cadre et sa pastille ↻ (corrections des vérifications des
retouches : le message le dit, comme à l'import, avec la touche de l'outil
d'avant, « Image détachée du fond : elle se déplace de nouveau, ses coins
l'agrandissent, ↻ la tourne. P : reprendre le Stylo. » ; Échap le rend
aussi). Cette Sélection n'est que prêtée : *Fixer en fond* de nouveau, une
fois l'image tournée, rend l'outil d'avant (voir « Images »). Sur une page, une image fixée reste
toujours sous toute image libre, même en en détachant une parmi plusieurs :
la version d'avant, son lecteur et son export PDF, qui rangent les images
par rang seulement, les peignent ainsi dans le même ordre. Le menu de la
page a aussi *Déverrouiller tout* quand la page a des objets verrouillés
(« 2 objets verrouillés sur cette page »).

Verrou et fond **survivent** à tout : au `.memc`, à Dupliquer la page, à
Envoyer vers…, au collage (ici, dans un autre onglet, dans l'autre
version), au film et au lecteur des élèves. Ce qu'on colle ou duplique de
verrouillé ou de fixé n'est pas sélectionné, et le message le dit :
« Collé, verrouillé. Clic droit dessus pour le déverrouiller. », « Image
collée dans le fond. Clic droit dans le vide pour la détacher. » (une image
fixée arrive sous tout ce qui est sur la page), ou pour un mélange « Collé ;
ce qui est verrouillé ou fixé en fond n'est pas sélectionné. » ; « Aller à la
page N », après un envoi, ne sélectionne que ce qui se prend. Ctrl + A ne
prend que ce qui est libre ; quand la page n'a que du verrouillé ou du fixé
en fond, il le dit : « Rien à sélectionner : ce qui est sur la page est
verrouillé ou fixé en fond. » (« Tout sélectionner » est alors grisé). Une formule, une
figure, un trait se verrouillent mais ne se fixent pas en fond : une formule
en HTML ne passerait pas sous l'encre sans perdre sa netteté, et une figure
fixée perdrait ses sommets.

**Dans le vide**, le clic droit (ou l'appui long) ouvre le menu de la page,
au point visé :
*Coller ici* (le dernier objet copié, posé là ; grisé quand il n'y a rien à
coller), *Tout sélectionner* (Ctrl + A ; grisé aussi quand tout ce qui est
sur la page est verrouillé ou fixé en fond), *Tout voir* (Maj + 1) ; s'il y a
sur la page une image fixée en fond ou un objet verrouillé (lot 5), un filet
puis *Détacher l'image du fond*, *Copier l'image du fond*, *Envoyer l'image
du fond vers…*, *Déverrouiller tout* (voir « Verrouiller et fixer en
fond ») ; puis, après un filet, ce qui touche la page elle-même : *Dupliquer la page* (Ctrl + Maj + D,
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
aussi la coller avec Ctrl+V, ou glisser le fichier sur le tableau) ; un PDF
aussi (voir « Importer un PDF »). Réduite à
1600 px, elle est rangée une seule fois dans le document. Comme une figure, elle
se déplace, se duplique et se **transforme** : symétrie par rapport à une droite
tracée sur la page, à une verticale ou à un axe du repère ; symétrie centrale,
rotation ou homothétie autour d'un point de la page. L'image est vraiment
retournée par une symétrie axiale, et un symétrique ne recopie pas les données.
Elle est toujours peinte sous l'écriture et les figures, même importée après
elles, comme une feuille posée sous le tableau : ce qu'on y a écrit se voit et
se prend (voir « Prendre un objet » et « L'ordre »).

**Une image importée arrive à l'outil Sélection** (retouches après le lot
5 : « la rotation sur une image ne fonctionne pas »). Avant, elle gardait
l'outil en main, le Stylo au démarrage : elle paraissait prise (son cadre en
tirets) mais n'avait ni coins ni pastille ↻ (les poignées ne vivent qu'à la
Sélection), et le geste en rond pour la tourner écrivait de l'encre. Posée
au milieu de ce qu'on voit, elle est prise, à l'outil Sélection, avec son
cadre de taille, sa pastille ↻ et sa barre d'actions, que l'import vienne
du bouton Image, de Ctrl+V ou d'un fichier déposé ; l'outil qu'on avait est
retenu, comme pour Ctrl + A et *Détacher l'image du fond* : **sa touche** le
rend — **P** le Stylo (le bouton Stylo aussi), **E** la Gomme, **H** le
Surligneur, **X** le Point, **L** le Segment, **F** la Formule, **R**, **C**
ou **G** les Formes (celle de la forme qu'on avait) —, que l'image soit
encore prise ou déjà lâchée ; Échap aussi (deux fois si elle est encore
prise : le premier la lâche). Le message le dit, dans les mots du pointeur
(`messageImagePosee` et `messageReprise`, `src/pointeurs.ts`) : « Image
posée : ses coins l'agrandissent, ↻ la tourne. P : reprendre le Stylo. » à
la souris, à la tablette graphique et après Ctrl+V ; depuis la Gomme,
« … E : reprendre la Gomme. » ; au doigt et au crayon posé sur l'écran,
« … Touchez le Stylo pour écrire de nouveau. » (« Touchez votre outil pour
le reprendre. » depuis un autre outil) ; rien de plus si l'on était déjà à
la Sélection. (Corrections des vérifications des retouches : il disait
« Échap deux fois : reprendre l'outil d'avant. » depuis un autre outil que
le Stylo, ce qui ramenait à la Sélection quand on avait déjà lâché l'image
d'un clic dans le vide : le premier Échap rendait l'outil, le second
repassait à la Sélection. La Vue, sans lettre, garde « Échap : reprendre
l'outil d'avant (deux fois si l'image est encore prise). ».) Une deuxième
image importée aussitôt, encore à cette Sélection prêtée, dit de même
comment reprendre l'outil de départ. Il dit aussi ce que fait le cadre : le
message du cadre, dit une fois par session, ne revient pas. Le pointeur
dont il parle est celui qui a touché le bouton Image ; pour un fichier
déposé, le dernier vu sur le tableau, et avant tout appui, **le doigt sur
un écran tactile sans souris** (un iPad : `pointeurDeDepart`, d'après
`(any-pointer: fine)` ; avant, toujours la souris, et un fichier déposé
sur l'iPad disait « P : reprendre le Stylo »), la souris ailleurs. Au
poste de la classe comme au téléphone, **le message ne couvre ni la barre
d'actions ni les poignées du cadre** (`UI.placerToast`, `App.poigneesAEviter`,
`zonesDesPoignees` dans `src/cadre.ts`) : ni la pastille ↻, ni les quatre
coins, ni les côtés, chacun à la portée du pointeur (10 px à la souris, 12 au
stylet, 20 au doigt). Quand la barre d'actions se pose sous l'image, là où
il était, il passe sous la barre du haut, ou, si la pastille ou un coin y
est, à côté d'eux, plus étroit ; zoomée (à 177 %, l'image dépasse l'écran
et sa pastille passe en bas de ce qu'on voit), de même ; tournée, il suit
ses poignées. (Corrections des vérifications des retouches : sous la barre
du haut, à côté de la pastille, il couvrait le coin en haut à droite d'un
énoncé en portrait dans une fenêtre de portable, 1366 × 657, et son bouton
*Fixer en fond*, posé sur ce coin, prenait le clic de la tablette graphique
qui devait l'agrandir.) Il peut passer sur l'image elle-même, jamais sur
ses poignées ; il ne reçoit les appuis que sur son bouton. Pour la tourner à la tablette graphique sans
viser la pastille : le bouton du stylet, puis ⋯, *Tourner d'un quart de
tour* (voir « Changer de taille, tourner »).

**Fixer en fond** (lot 5) : le message qui suit l'import porte un bouton
*Fixer en fond*, et le menu ⋯ de l'image la même entrée. Fixée, l'image
passe sous tout et ne se prend plus : on écrit, on entoure, on gomme
par-dessus sans l'abîmer ; le menu de la page (clic droit dans le vide ou
sur elle) la détache, la copie ou l'envoie sur une autre page (voir
« Verrouiller et fixer en fond »). Ses points repérés restent liés à elle.
Fixée, elle n'a ni cadre ni pastille : le message le dit (retouches après
le lot 5, `messageFixe`) — « Image fixée en fond : écrivez et entourez
par-dessus. Pour la tourner ou la déplacer : clic droit dessus, puis
« Détacher l'image du fond ». » (au stylet de la tablette graphique,
« bouton du stylet dessus » ; au doigt, « appui long dessus » ; pour
plusieurs, « … dans le vide, puis « Détacher le fond » ») ; détachée, elle
revient à l'outil Sélection, prise, et se tourne. Ces mots sont ceux du
pointeur qui touche le bouton *Fixer en fond* (du message, ou l'entrée du
menu : `pointeurDuClic`) ; avant les corrections des vérifications des
retouches, ceux du dernier appui sur le tableau, et le premier geste d'une
séance, au doigt sur l'iPad ou à la tablette graphique (le bouton Image,
puis *Fixer en fond*), disait « clic droit dessus ». **Fixer en fond rend
l'outil qu'on avait** quand l'image n'avait pris la Sélection que pour
elle (son import, *Détacher l'image du fond* : la Sélection est prêtée,
`App.preterSelection`) : importé au Stylo, l'énoncé fixé aussitôt, le
trait suivant écrit dessus, comme le dit le message (avant ces
corrections, l'outil restait la Sélection, le message de l'import qui
disait « P : reprendre le Stylo » était remplacé, et le trait par-dessus
traçait un cadre ou un lasso, sans encre). Le bouton du message ou
l'entrée du menu ⋯, c'est pareil. Une Sélection qu'on a choisie soi-même
(V, son bouton, même après l'import) reste en main : le message ajoute
alors « P : reprendre le Stylo. » (au doigt, « Touchez le Stylo pour écrire
de nouveau. »).

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
  tous les 15°. L'angle s'affiche (l'orientation de l'instrument, « 30° »).
  Même à petit zoom, le stylo posé sur la pastille tourne l'instrument (il
  ne trace pas le long du bord voisin). C'est la même pastille, du même
  dessin, que celle qui tourne un objet pris (lot 5, voir « Changer de
  taille, tourner ») : on reconnaît ce qui tourne ; mais l'objet affiche
  l'angle tourné (« ↻ 30° ») et ses aimants diffèrent (45° sauf 0°).
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

Le bouton « Automatismes » (chronomètre) de la barre du haut prépare un
**flash** : quelques questions courtes, posées **sur une page de la séance**.
Le flash est donc dans le replay, comme tout le reste. On peut aussi le
demander au démarrage : la fenêtre « Bonjour ! » a une case « Commencer par
des automatismes », **jamais cochée d'office** ; cochée, le réglage s'ouvre
dès que la séance commence, sur sa première page, vide.

**Le réglage** est une fenêtre. Pendant qu'on règle, les élèves ne voient
**aucune question** : rien n'est tiré, rien n'est montré, pas d'exemple, la
page derrière reste vide. On y choisit :
- un ou plusieurs **niveaux** (5e aujourd'hui ; 4e, 3e, 2nde et 1re sont
  marqués « bientôt ») ;
- un ou plusieurs **thèmes** de chaque niveau (« tout cocher » prend tout le
  niveau). Les automatismes de 5e suivent la **liste officielle**, rangés par
  thème : opérations, nombres relatifs, nombres rationnels (fractions,
  pourcentages), puissances et calcul littéral, repérage, représentation de
  l'espace, transformations, angles, triangles, parallélogrammes et
  polygones, probabilités, proportionnalité — 42 automatismes, plus 10
  « hors liste officielle » (priorités, conversions, moyenne…) ;
- combien de questions de chaque forme, avec − et + : par défaut **5
  questions, 2 QCM, 2 questions directes** (une seule réponse) **et 1
  question à trou** (à compléter). Elles viennent dans cet ordre. Un
  automatisme qui n'a pas de forme « à trou » n'en donne pas ; si aucun des
  thèmes choisis n'en a, une question directe la remplace, et un message le
  dit ;
- l'**affichage** : une question à la fois (30 s chacune par défaut), ou
  toutes d'un coup avec une minuterie (5 min par défaut).

Le dernier réglage est retenu sur l'appareil, et pour chaque classeur
(`mem-flash`, `mem-flash-<classeur>`). Les thèmes sont répartis le plus
également possible, et deux questions ne se répètent pas.

**« Lancer le flash »** tire les questions et les pose : sur la page où l'on
est si elle est vide, sinon sur une nouvelle page juste après. Chaque question
est faite d'objets ordinaires du tableau (une formule, une figure, les
propositions du QCM), groupés : on écrit dessus au stylet, on les déplace.
Le titre « Automatismes — » et la date est en haut de la page. Le temps et le
numéro de la question sont dans un bandeau, pas sur la page : Pause (ou
Espace), Suivante (ou →), Correction (ou C), Nouveaux exemples, et × pour
arrêter. Une question à la fois : la question en grand à droite, et quand son
temps est passé elle va se ranger dans sa case à gauche. Si l'on va sur une
autre page, le temps attend. **La correction** remet toutes les questions en
grille et écrit chaque réponse en vert dessous (en QCM, la lettre et la bonne
proposition). « Nouveaux exemples » pose un autre flash sur une nouvelle page
juste après. Il n'y a ni bilan, ni suivi de la classe.

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

## Le catalogue

Le bouton « Catalogue » de la barre du haut (au téléphone : Plus → Outils de
cours) ouvre, à droite, des éléments de cours tout prêts, rangés par niveau.
Ce qu'il pose est fait d'objets ordinaires du tableau (des figures, des
formules), **groupés** : on le déplace, on l'agrandit, on écrit dessus, on
le dégroupe ; un Ctrl + Z le retire d'un coup. Il passe dans le replay de la
séance comme le reste, et marche dans la version hors ligne. Le panneau prend
la place du programme de construction (l'un ferme l'autre).

Le panneau est rangé comme les programmes (BO 2026) : un onglet par niveau
(**2nde**, **1re spé**), puis les thèmes du niveau, et dans chaque thème ses
chapitres, qu'on déplie d'un clic (le nombre d'éléments est à droite). Un
thème où le programme ne demande pas de démonstration le dit. Le niveau
choisi et les chapitres dépliés sont retenus sur l'appareil
(`mem-catalogue-niveau`, `mem-catalogue-ouverts`).

La **recherche**, en haut, cherche dans tous les niveaux à la fois, sans se
soucier des majuscules ni des accents (« tangente », « derivee », « suite »,
« produit scalaire ») : tant qu'on tape, les onglets laissent la place à la
liste de ce qui correspond, avec son niveau et son chapitre ; Échap efface la
recherche. Le dessin des ensembles, trouvé ainsi, ouvre son chapitre.

- **Les ensembles ℕ ⊂ ℤ ⊂ 𝔻 ⊂ ℚ ⊂ ℝ** (2nde, Nombres réels) : cinq ovales emboîtés, chacun de sa
  couleur, avec son nom (22,5 cm sur 13 à 100 %). Il suit le pointeur en
  transparence ; un clic le pose, Échap annule. Les nombres tapés dans le
  champ, séparés par des points-virgules (la virgule est celle des
  décimaux), vont chacun dans **le plus petit ensemble qui le contient**.
  **Compléter** range de nouveaux nombres dans un dessin déjà posé : celui
  qui est pris, sinon le dernier posé sur la page, même déplacé ou agrandi
  (les nombres prennent sa taille). Un nombre déjà dans le dessin n'est pas
  remis ; une zone pleine le dit (on agrandit le dessin, puis on complète).
  On peut écrire `−5`, `2,7`, `1/3`, `−2/7`, `√16`, `√(1/4)`, `π`, `2π`,
  `1 + √2`, `10^-2`, `0,333…` (ou `0,333...` : la période est la plus courte
  qui se répète à la fin), et aussi `\frac{1}{3}`, `\sqrt{2}`, `sqrt(2)`.
  Le calcul est exact (`√2 × √8` va dans ℕ, `√8/√2` aussi) ; ce qu'il ne sait
  pas trancher (`π − π`) va dans ℝ avec un avertissement, et ce qu'il ne sait
  pas lire est dit, jamais deviné. Le texte du champ est retenu sur
  l'appareil (`mem-catalogue-nombres`).
- **Démonstrations** : toutes celles que les programmes demandent, chacune
  dans son chapitre.
  - 2nde, Nombres et calculs : la somme de deux multiples de 7 est un
    multiple de 7 ; le carré d'un impair est impair (Arithmétique) ; 1/3
    n'est pas décimal ; √2 est irrationnel (Nombres réels) ; √(ab) = √a × √b
    (Algèbre).
  - 2nde, Géométrie : colinéarité de deux vecteurs non nuls (Vecteurs) ;
    forme générale ax + by + c = 0 d'une équation de droite, par le
    déterminant (Droites du plan).
  - 2nde, Fonctions (Variations et extrémums) : fonctions affines ; position
    des courbes y = x et y = x² pour x ⩾ 0 ; fonction carré ; fonction
    inverse.
  - 1re spé, Algèbre : terme général d'une suite arithmétique, d'une suite
    géométrique ; 1 + 2 + … + n ; 1 + q + … + qⁿ (Suites) ; résolution de
    l'équation du second degré (Second degré).
  - 1re spé, Analyse : équation de la tangente ; la racine carrée n'est pas
    dérivable en 0 ; dérivées de la fonction carré, de la fonction inverse,
    d'un produit (Dérivation) ; cos et sin de π/4 et de π/3 (Trigonométrie).
  - 1re spé, Géométrie (Produit scalaire) : formule d'Al-Kashi ; ensemble des
    points M tels que MA→ · MB→ = 0.
  - Statistiques et probabilités : aucun des deux programmes n'en demande.

  Le titre se pose d'un clic, puis chaque ligne avec → (ou Espace, ou
  « Suivante »), ← la retire, ⏩ montre tout. Le bas du panneau montre la
  démonstration en cours, étape par étape ; son texte passe à la ligne pour
  tenir dans sa largeur.

Le calcul (lire un nombre, le classer, trouver sa place dans sa zone) est
dans `src/catalogue.ts`, sans rien toucher à l'écran ; le panneau dans
`src/catalogue-vue.ts`.

L'éditeur de formule a aussi les symboles du thème : ∉, ⊂, ⊄, ∩, ∪, ∅, ℕ,
ℤ, 𝔻, ℚ, ℝ*₊ et +∞ (∈ et ℝ y étaient déjà).

## Les outils de classe

Le bouton **Classe** de la barre du haut (entre Automatismes et Revoir ; sur
le téléphone, « Outils de classe… » dans Plus) ouvre un menu de petits
outils pour le cours, à l'écran :

- **Le rideau** couvre le tableau. On le fait glisser vers le bas (sa
  poignée, n'importe où sur lui, ou la molette) pour dévoiler une correction
  ligne après ligne. Il reste fixé à l'écran : la page défile dessous. On
  n'écrit pas sous lui ; les barres restent devant.
- **Le pointeur laser** : un point rouge qui suit la souris, le stylet de la
  tablette graphique (au survol, sans appuyer) ou le doigt, avec une courte
  traînée qui s'efface en une seconde. Il n'écrit rien sur la page. Échap
  ou un autre outil le range. Le point (sans sa traînée) **est dans le
  replay** des élèves et dans Revoir : il est noté comme un instrument.
- **Le minuteur** : 1, 3, 5 ou 10 minutes, ou une durée tapée (« 5 »,
  « 2:30 », « 90 s », « 1 min 30 », jusqu'à 3 h). À la fin il clignote en
  rouge et sonne trois notes, fabriquées par le navigateur : la version hors
  ligne sonne aussi. Le haut-parleur coupe le son ; ce choix reste sur cet
  appareil.
- **Le tirage au sort** : la liste des élèves de la classe (le dossier de
  classe du classeur ouvert), un prénom par ligne, qu'on peut coller depuis
  un tableur. Un élève tiré ne revient pas avant que toute la classe soit
  passée. La liste reste dans ce navigateur, jamais dans le classeur, le
  replay, le PDF ni le Drive.
- **Aide et raccourcis** (aussi la touche **?**) : les raccourcis du clavier,
  et les gestes à la souris, à la tablette graphique et au doigt.

Les panneaux du minuteur et du tirage se déplacent par leur titre. Au
premier lancement après leur arrivée, quelques bulles de conseil, une à la
fois, montrent ces nouveautés ; une fois vues (ou passées), elles ne
reviennent plus sur cet appareil.

Comment c'est fait : `src/outils-classe.ts` (le rideau, le minuteur, le
tirage, et leur calcul, testé dans `tests/outils-classe.test.ts`),
`src/aide.ts` (l'aide et les conseils). Le laser est un pseudo-instrument
`laser` peint dans le calque des instruments (`src/instruments.ts`,
`App.basculerLaser`) : la piste le note comme une règle ou un compas, et
le lecteur le relit (`src/revoir/instruments-film.ts`). Un lecteur resté
dans le cache d'un ancien navigateur, qui ne connaît pas encore ce nom,
montre le film sans les instruments ; il se met à jour au chargement
suivant. Ce qui reste sur l'appareil : `mem-minuteur-son` (le son coupé ou
non), `mem-tirage-<dossier>` (la liste et le tour en cours de chaque
classe), `mem-conseils` (les conseils déjà vus).

## La calculatrice NumWorks (lot 14)

### Le mode d'emploi

Le menu **Classe** a deux lignes de plus : **Calculatrice NumWorks lycée**
(la graphique : calculs, graphes, Python) et **Calculatrice NumWorks
collège** (la scientifique). Un clic pose la calculatrice au milieu de ce
qu'on voit, sur les trois quarts de la hauteur, prise à l'outil Sélection
comme une image importée : ses coins l'agrandissent. Chaque page peut avoir
la sienne (ou plusieurs).

- On tape au stylet de la tablette, à la souris, au doigt, ou au clavier
  une fois qu'on a cliqué dedans ; un clic sur le tableau rend le clavier
  au tableau (P, E, Ctrl+Z…).
- **La bande du nom**, en haut, la déplace, sous n'importe quel outil (au
  Stylo, elle ne laisse pas d'encre). **↺** la remet à zéro, **×** la
  range (Ctrl+Z la rend).
- Elle reste sur sa page : elle suit le défilement et le zoom, et l'on
  retrouve son calcul en revenant sur la page (les quatre dernières restent
  allumées). Sur une séance passée, dans la revue, les vignettes et le PDF,
  c'est son dessin, avec l'écran tel que la classe l'a vu en dernier.
- **Dans le replay**, l'élève la voit à sa place, et son écran change à
  chaque touche, au rythme du cours. Il ne tape pas dedans.

**L'installation, une fois par ordinateur.** NumWorks donne ses émulateurs
gratuitement, en un fichier qui marche sans internet, mais en garde les
droits : l'outil ne les contient pas (le dépôt est public). La première
fois, la fenêtre « Installer la calculatrice NumWorks » s'ouvre (elle a un
lien vers la page de téléchargement de chaque calculatrice) : on glisse le
fichier téléchargé dans la case de sa calculatrice, ou « Choisir le
fichier ». Un .zip est accepté aussi (sa page et les scripts à côté).
« Remplacer… » prend une nouvelle version, « Retirer » l'enlève. Le fichier
reste dans ce navigateur : la version hors ligne et la version en ligne
ont chacune le leur, et il ne part jamais dans un classeur, un replay, une
sauvegarde ni le Drive.

### Comment c'est fait

Une calculatrice est une **image** de la page (`ImageForme`) avec un champ
facultatif, `calculatrice: 'lycee' | 'college'` : son dessin (un boîtier
simple, son nom, l'écran, des touches esquissées : `src/calculatrice/dessin.ts`,
360 × 660 pixels). Tout ce qui sait montrer une image la montre déjà : le
replay, la revue, les vignettes, l'export en PDF, une version d'avant et le
lecteur resté dans le cache d'un ancien navigateur. Le format des fichiers
ne change pas. Elle ne se rogne pas ; copiée et collée, elle reste une
calculatrice.

À l’écran, sur une page qu'on écrit, `src/calculatrice/vivantes.ts` pose
par-dessus chaque image la vraie calculatrice : un cadre `<iframe srcdoc>`
avec la page de l'émulateur, dans une couche qui suit la vue comme celle
des formules (`Rendu.apresFormules`), avec le déplacement et le
changement de taille en cours ; sous la bande du nom, qui laisse l'appui au
tableau (`App.bandeDeCalculatrice`, dans `bas`). Après chaque appui dans la
calculatrice, son écran (son plus grand canevas) est copié 0,2 s, 0,8 s et
2,5 s plus tard ; s'il a changé, le dessin est refait avec lui, rangé une
fois dans la banque d'images (`calc-<modèle>-<empreinte>` : deux écrans
pareils n'en font qu'un), et l'image de la calculatrice prend ce nouveau
dessin par `Tableau.ecranDeCalculatrice` : une étape du film (origine
`calculatrice`), jamais une étape d'annulation. Sans appui, rien ne
s'écrit (le curseur qui clignote ne fait pas de séance le lendemain) ; une
calculatrice qu'on vient de poser note seulement son écran d'accueil. Pour
pouvoir copier l'écran, la page de l'émulateur reçoit en tête une ligne qui
demande aux canevas WebGL de garder leur image (`preserveDrawingBuffer`).

Les émulateurs sont dans une base à eux, `mem-teachingtool-calculatrices`
(nouvelle : aucune autre base ni clé ne change), lus par
`src/calculatrice/emulateurs.ts` ; la fenêtre est dans
`src/calculatrice/fenetre.ts`. Un ancien tableau (.prof) qui avait une
calculatrice peut la reprendre avec `imageDeCalculatrice(modele)` : sa place
et sa taille, sur son écran d'accueil (l'écran n'était pas gardé).

Limite : une fois qu'elle a noté un écran, Ctrl+Z ne la retire plus et ne
défait plus ce qu'on lui a fait avant (la pose, un déplacement) : l'image a
changé depuis, et ces Ctrl+Z-là ne font rien. Elle se range par ×, et un
déplacement se refait à la main. Essais :
`tests/calculatrice.test.ts` et `essais/navigateur/lot14/E1-calculatrice.mjs`,
avec une page d'essai qui se fait passer pour l'émulateur
(`emulateur-d-essai.html`), puisque celui de NumWorks n'est pas dans le dépôt ;
et, quand on lui donne les deux fichiers de NumWorks (`NUMWORKS_LYCEE`,
`NUMWORKS_COLLEGE`), `essais/navigateur/lot14/E2-vrais-emulateurs.mjs`
(essayé avec la calculatrice graphique 26.3.0 et la scientifique 4.1.0).

Dans son cadre, la page de l'émulateur ne garde que la calculatrice, aussi
grande que le cadre le permet : ni son fond gris, ni ses boutons du dessous
(plein écran, photo, partage). L'écran plus allongé de la calculatrice
collège est copié sur la couleur de son coin, pour remplir l'écran du dessin.

## La recherche

**Ctrl F** (⌘ F sur Mac), depuis le tableau, ou le champ **Rechercher** à
droite du nom du classeur (quand il a la place ; sinon sa loupe seule),
ouvre une fenêtre au milieu de l'écran. On tape quelques mots, sans
accent ni majuscule à respecter ; les résultats viennent en trois groupes :

- **Outils** : les boutons et réglages par leur nom ou ce qu'ils font.
  « rapporteur » pose le rapporteur, « Seyès » change le fond, « minuteur »
  le lance, « médiatrice » ouvre le programme de construction avec la
  phrase, « ensembles » pose le dessin du catalogue, « fraction » coche ce
  thème des automatismes. Entrée fait l'action.
- **Formules et textes écrits** : celles des pages de tous les classeurs de ce
  navigateur, avec des mots simples : « racine », « fraction », « pi »,
  « carré », « réels », « vecteur »… trouvent √, les fractions, π, x², ℝ,
  les vecteurs ; les textes tapés au clavier (l'outil Texte), par leurs
  mots, montrés à plat, les mots cherchés marqués. Un clic ouvre la page,
  la formule (ou le texte) prise et montrée (au zoom où l'on est) ; une
  page d'une séance passée s'ouvre en lecture.
- **Classeurs, pages et séances** : un classeur par son nom ou sa classe,
  une page par son nom, une séance par sa date (« 16 octobre », « mardi »,
  « 16/10 ») ou son nom.

↑ ↓ choisissent, Entrée ouvre, Échap efface le texte, puis ferme.
L'écriture au stylo ne se recherche pas.

Dans **la bibliothèque**, le même champ est sous le titre (Ctrl F y va) :
dès qu'on tape, les résultats prennent la place des cartes, en groupes
(classeurs, dossiers, séances, formules) ; Échap efface et les cartes
reviennent.

Comment c'est fait : `src/recherche.ts` (le calcul : le texte mis à plat,
les formules lues en mots, la comparaison, le contenu d'un classeur lu dans
son document ; testé dans `tests/recherche.test.ts`), `src/recherche-vue.ts`
(la fenêtre), `src/classeurs/recherche-bibliotheque.ts` (les classeurs de
ce navigateur, lus dans leur base en lecture seule : une transaction
readonly, le document refait en mémoire puis détruit, rien n'est écrit ; le
classeur ouvert est lu dans le tableau), `src/classeurs/recherche-biblio-vue.ts`
(le champ de la bibliothèque). Pour ouvrir un autre classeur sur une page,
l'adresse prend deux paramètres facultatifs, `&page=…&forme=…`, lus au
démarrage comme `&seance=…`. Un conseil de premier lancement présente la
recherche (`mem-conseils` passe à la série 2).

## Taper du texte au clavier (lot 12)

L'outil **Texte** (le T de la barre des outils, touche **T**) écrit sur la
page au clavier, comme un traitement de texte.

### Le mode d'emploi

- **Un clic** sur la page : on tape tout de suite, à cet endroit. Entrée
  passe à la ligne ; le texte s'allonge avec ce qu'on tape.
- **Un cadre glissé** : le texte prend cette largeur et passe à la ligne
  tout seul (pour un énoncé à côté d'une figure).
- **La petite barre**, au-dessus du texte pendant qu'on tape : **G**
  (gras), *I* (italique), S (souligné), les quatre couleurs (sur ce qui est
  choisi, ou pour la suite), trois tailles (Petite, Normale, Grande : tout
  le texte), **• Puces** (les lignes choisies), **$ Formule**, et
  **Terminé**. Au clavier : Ctrl + G (ou Ctrl + B), Ctrl + I, Ctrl + U.
- **Une formule au milieu d'une phrase** : on la tape entre deux $, en
  LaTeX, comme à l'outil Formule (`$\frac{1}{3}$`, `$x^2$`). Elle s'affiche
  dès le second $ ; un double-clic dessus la rend à son texte. « $ Formule »
  pose les deux $ (ou entoure ce qui est choisi).
- **Pour finir** : Échap, « Terminé », Ctrl + Entrée, ou un clic ailleurs
  (ce clic ne fait rien d'autre ; le suivant commence un autre texte). Un
  texte vidé s'en va. L'outil reste le Texte.
- **Ensuite**, le texte se manie comme une formule : il se prend, se
  déplace, tourne à la pastille ↻ ; ses **coins** l'agrandissent
  (caractères et largeur ensemble) ; ses **côtés**, à gauche et à droite,
  changent sa largeur sans toucher aux caractères (un texte qui
  s'allongeait prend ainsi une largeur et passe à la ligne). Pour le
  retoucher : double-clic, « Modifier » de son menu ou de la barre
  d'actions, ou un clic dessus à l'outil Texte. Son menu a aussi « Couleur
  et taille » (la couleur de tout ce qui n'en a pas reçu une), Dupliquer,
  Copier, ⋯ et la corbeille.
- **On écrit dessus** au stylo ; **la gomme ne l'efface pas** (elle gomme
  l'écriture posée dessus) : il part par Suppr ou la corbeille.
- **Partout** : la recherche (Ctrl F) le trouve par ses mots ; il est dans
  les vignettes, le PDF, « Copier en image », le replay des élèves et la
  revue ; copié vers un autre logiciel, il donne son texte à plat (ses
  formules entre $). Le coller dans le texte qu'on tape ne prend que le
  texte (pas les styles d'une page web) ; ce qui est entre $ y devient une
  formule.

### Comment c'est fait

Un texte est une **formule qui porte en plus ses lignes** (le champ
facultatif `texte` : des lignes, chacune de morceaux, gras, italique,
souligné, d'une couleur, ou une formule) et, s'il a une largeur choisie,
`largeur` (unités monde, sa marge comprise). Tout ce qui sait prendre,
déplacer, tourner, copier, ordonner et peindre une formule le sait donc
pour un texte, sans autre type d'objet. Son champ `latex` garde une version
KaTeX du même texte (`latexDuTexte` : une ligne par ligne, le gras,
l'italique, la couleur, les formules) : une version d'avant, qui ignore
`texte`, l'affiche comme une formule, et le classeur ne perd rien (les
formats `.memc`, `.memb` et `.mem` ne changent pas : deux champs
facultatifs). La police est Arial et ses jumelles (Helvetica, Liberation
Sans, Arimo) : un texte à largeur choisie passe à la ligne au même mot sur
le poste de la classe, dans la version hors ligne et chez les élèves.

- `src/texte.ts` : le modèle, pur et testé (`tests/texte.test.ts`) :
  `nettoyer` (les lignes vides de la fin s'en vont ; un texte vide n'est
  plus rien), `formulesDe` (les $ vont par deux, de gauche à droite, sur une
  ligne), `lireTexte` (relu d'ailleurs : tout ou rien, les couleurs en
  #rrggbb), `texteBrut` (à plat : la recherche, la copie), `latexDuTexte`,
  `cleDuContenu` (la clé de son rendu), `tailleEstimee` ; et son rendu HTML
  (`ecrireContenu`), le même à l'écran (`rendu.ts`) et dans le rendu caché
  des sorties (`sorties/formules.ts`, qui peint chaque mot à sa place et son
  souligné ; chaque mot est séparé de ses espaces, pour que la ligne de base
  se lise sur sa ligne).
- `src/texte-editeur.ts` : l'éditeur (un élément `contenteditable`, posé
  dans une couche qui suit la vue, `Rendu.coucheEdition`, à la place du
  texte, que le rendu cache : `Rendu.enEdition`), sa barre, les $ qui
  deviennent des formules (`convertirFormules`), et la relecture
  (`lireEditeur` : par les styles calculés, quoi que le navigateur ait
  écrit, `<b>`, `<font>` ou des styles).
- `src/app.ts` : l'outil (`ouvrirTexte`, `modifierTexte`, `finirTexte`,
  `texteFini` : posé, modifié ou supprimé en une étape d'annulation, rien
  si rien n'a changé) ; un appui sur la page pendant qu'on tape finit le
  texte et rien d'autre ; changer d'outil, de page ou ouvrir la revue le
  finit aussi ; la gomme saute les textes.
- `src/cadre.ts` : `transformerForme` (un côté change `largeur`, un coin
  la taille et la largeur), `cotesDe` (les poignées de côté d'un texte : à
  gauche et à droite) ; pendant le geste, un texte à largeur choisie se
  remet en page à chaque pas (`Rendu.placerFormules`).
- `src/presse-papiers.ts` : la liste blanche relit `texte` (`lireTexte`),
  refait `latex` d'après lui, borne `largeur`.
- `src/recherche.ts` : `lireContenu` lit les textes à plat
  (`FormuleLue.texte`), `motsDeFormule` ce qu'on y cherche.
- L'essai du navigateur : `essais/navigateur/lot12/E1-texte.mjs`.

## Le mode nuit d'une page (lot 13)

Chaque page peut passer en **mode nuit** : le papier devient presque noir,
l'écriture claire. Les autres pages ne changent pas.

### Le mode d'emploi

- **Le bouton lune** de la barre du haut, juste après le fond, ou la
  touche **N** : la page qu'on regarde passe en nuit, ou revient de jour. Le
  bouton reste allumé tant que la page est de nuit. Aussi : la case « Mode
  nuit » du menu d'une page dans la trieuse, « Plus → Mode nuit » au
  téléphone, et la recherche (Ctrl F, « Mode nuit »).
- **Sur une page de nuit**, les barres qui restent à l'écran (outils, haut,
  zoom, classeur, recherche, séance, barre d'actions) passent en gris très
  foncé : rien d'éblouissant autour d'une page noire, au vidéoprojecteur.
  Les menus et les fenêtres gardent leurs couleurs de jour.
- **Rien n'est réécrit** : seul l'affichage de la page change. Le Noir de
  la palette s'y écrit en blanc (sa pastille s'appelle alors « Blanc »), le
  bleu et le vert s'éclaircissent, le rouge et le jaune du surligneur ne
  bougent pas, et un cache blanc devient noir. Repasser de jour rend la page
  exactement comme avant. Les images et les PDF importés restent tels quels.
- **Tous les fonds** marchent de nuit, en lignes claires et discrètes (plus
  marquées en contraste renforcé).
- **Une page neuve** naît toujours de jour ; « Dupliquer » garde le mode de
  la page copiée.
- **Partout** : les vignettes (trieuse, bibliothèque, énoncé), la revue en
  classe et le **replay des élèves** montrent la page de nuit, à partir du
  moment où elle y est passée. **Le PDF et « Copier en image »** restent de
  jour (on imprime de jour).
- Comme un changement de fond, la bascule ne se défait pas par Ctrl + Z :
  on rappuie sur la lune (ou N). Dans la trieuse, son « Annuler » la défait.

### Comment c'est fait

- `src/nuit.ts` : `PAPIER_NUIT`, `nocturne` (une couleur telle qu'elle
  s'affiche de nuit : sa teinte et son opacité gardées, sa luminosité
  changée par `luminositeDeNuit` ; une encre sombre devient claire, une encre
  presque blanche le noir du papier, le milieu ne change pas), `formeDeNuit`
  (une copie d'une forme en couleurs de nuit, gardée par forme),
  `formulesDeNuit` (les formules d'une page de nuit peinte hors de l'écran).
  Testé dans `tests/nuit.test.ts`.
- Le document : un champ **facultatif** `nuit` dans la page (`true` de
  nuit ; écrit `false` quand on revient de jour ; absent sur toute page
  d'avant et toute page neuve). `Tableau.nuitDe`, `Tableau.changerNuit`
  (une étape du film notée sur la page, comme `changerFond` ; `rangement`
  depuis la trieuse). Les formats `.memc` et `.memb` ne changent pas ; une
  version d'avant ignore le champ et montre la page de jour.
- Le film élève (`.mem`, version 1) : `nuit: true` dans l'état de départ
  d'une page (`PageFilm`), et une cinquième valeur à l'opération du fond,
  `['f', fond, ox, oy, 1]` (nuit) ou `… 0` (de nouveau de jour), seulement
  quand il y a lieu : une page de jour s'écrit comme avant. Un lecteur
  d'avant ignore les deux et montre la page de jour, sans erreur.
- Le rendu (`Rendu.nuit`) : le papier et les tons du fond (`TONS_NUIT`,
  `TONS_NUIT_CONTRASTE` dans `fonds.ts`), chaque couleur des formes par
  `formeDeNuit` ou `nocturne`, les formules (leur couleur et celle de leurs
  morceaux). `peindreSur` garde la nuit, sauf sur la feuille d'un PDF.
- L'interface : `App.nuit`, `App.basculerNuit`, la touche N,
  `body.page-nuit` (les barres foncées, fin de `style.css`), le bouton lune
  et les pastilles en couleurs de nuit (`ui.ts`), la case de la trieuse
  (`pages/actions.ts`, `changerNuit` ; le journal de la trieuse garde le
  mode de chaque page).
- L'essai du navigateur : `essais/navigateur/lot13/N1-nuit.mjs`.

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
l'arrêt en fin de partie, et, pour un tableau sans séances seulement, le
découpage des séances (une pause de 20, 10, 5 ou 2 minutes en sépare deux) :
depuis le lot 6, les séances sont celles du classeur (voir « Les séances »).

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
avant le lot 3. **Les réglages** (lot 5 : verrouiller, déverrouiller,
grouper, dégrouper un objet) ne changent rien à ce qu'on voit : ce sont des
étapes de l'annulation de leur page (Ctrl + Z les défait) et du film, notées
`reglage` (un champ facultatif qu'une version d'avant ignore), mais ni un
geste de la revue, ni un geste d'une séance, ni une coupure entre deux
gestes : verrouiller l'énoncé le lendemain, en préparant, ne fait pas une
séance d'un geste que Publier choisirait d'office, verrouiller entre deux
cours ne les réunit pas, et une page verrouillée après le cours ne finit pas
sa revue par une image de plus (deux formes qui ne diffèrent que par leur
verrou ou leur groupe sont la même image). Ctrl + Z et Ctrl + Y d'un réglage
en sont un aussi : se raviser le lendemain (Maj + L puis Ctrl + Z, un
groupement défait puis refait) ne fait pas non plus de séance fantôme. La
note suit l'étape de la pile d'annulation (sa méta `reglage`, recopiée sur
celle que Yjs pousse dans l'autre pile, comme la méta d'un envoi) ; un geste
visible que la fenêtre de capture fondrait dans l'étape d'un réglage la lui
ôte, puisque la défaire se voit. Fixer une image en fond, la
détacher, changer l'ordre, la taille ou la rotation (« Remettre droit »
compris) se voient : ce sont des gestes, et la revue comme le lecteur des
élèves montrent la forme transformée d'un coup, comme un déplacement (elle
garde son identifiant ; on ne voit pas l'objet grandir ni tourner peu à peu).
**La gomme qui efface là où elle passe** (lot 5) fait une image par trait
touché (son étape du film, notée `coupe`) : on voit l'effacement trait par
trait, comme la gomme au trait entier fait partir les traits l'un après
l'autre, et chaque fois ce qui reste du trait paraît d'un coup. Ses morceaux
ne se dessinent pas sous les yeux : ils ont été écrits bien avant (le trait
s'est écrit, à son rythme, à son propre geste), on ne réinvente pas leur
écriture. Le plus long garde l'identifiant du trait.
Une copie de copie remonte toute la chaîne. Rien n'est recopié :
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

**Côté professeur.** Depuis le lot 6, la fenêtre propose les séances du
classeur (voir « Les séances »), celle du jour d'abord, avec exactement ses
pages. Avant, et encore pour un tableau sans séances, elle proposait la
séance repérée toute seule dans le film (un silence de plus de 20 minutes, ou un autre jour, en commence une
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
pages avec leur minute). Republier la même séance met à jour le même
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
Pas à pas, frise, liste des pages, pages qui changent toutes seules, pincer
ou la molette pour zoomer, glisser pour se déplacer, double-clic pour revoir
toute la page. Les traits bleus de la frise marquent chaque changement de
page : au survol, ils disent « Page 2 », « Page 3 »… et un clic y mène. Une
page neuve paraît avec son premier trait (des pages créées d'avance ne font
pas d'arrêt vide). **La lecture s'arrête à la fin de chaque page** : l'élève
relance quand il a recopié. Quand on revient sur une page déjà écrite, son
arrêt s'appelle « Page 1 (suite) ». `&continu=1` dans le lien donne un replay
d'un seul tenant, `&c=2` l'ouvre au deuxième arrêt. Clavier :
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
arrêts restent « Page 2 ».
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
Depuis le lot 5, les formes du film élève portent aussi leur verrou, leur
fixation en fond, leur groupe et la rotation d'une formule (des champs
facultatifs : le lecteur d'avant, déjà en cache chez un élève, les ignore et
rejoue le film sans planter ; il y peint l'image fixée sous les autres, par
son rang, et la formule tournée droite). Un geste qui coupe un trait à la
gomme qui efface là où elle passe porte `coupe` (facultatif aussi) : le
lecteur montre ses morceaux d'un coup ; celui d'avant, qui l'ignore, voit
changer le plus long (il garde l'identifiant du trait : il ne se redessine
pas) et apparaître les autres, qu'il dessine à vitesse de plume, sans planter.
Le fond d'une page voyage dans le film (au départ, et `['f', fond, ox, oy]`
quand il change) : les quatre fonds du lot 5 (grands carreaux, millimétré,
pointé, isométrique) sont des valeurs nouvelles de ce champ, que le lecteur
d'avant ne connaît pas ; il y peint la page blanche, sans erreur.
Un réglage (verrouiller, grouper)
n'y fait pas de geste : son temps passe dans l'attente du geste suivant, et
ce qu'il a changé part avec le prochain geste visible de sa page (pas avec
un geste d'une autre page, qui ferait sinon un geste de plus, vide, sur
celle-ci).
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
en ligne ne sont pas ceux de la version hors ligne. Pour passer de l'un à l'autre :
« Enregistrer le classeur » d'un côté, « Ouvrir un classeur » de l'autre (voir
plus bas). La version hors ligne enregistre aussi le fichier séance.

**Les téléphones des élèves.** Le lecteur vise les navigateurs depuis 2020
(Safari 14, Chrome 87, Firefox 78) ; sur les iPhone et iPad d'avant iOS 16.4,
qui ne savent pas décompresser seuls, un petit décompresseur (fflate, 8 Ko) se
charge à la place. Commandes de 44 px, zoom du navigateur jamais bloqué, la
frise annonce le temps aux lecteurs d'écran.

## Les pages

**La trieuse des pages** montre les pages de la séance du jour en vignettes
(depuis le lot 6 ; les séances passées sont dessous, repliées : voir « Les
séances »), en plein
écran : le rendu réel de chaque page en petit (son fond, tout son contenu
cadré), son numéro en gros dans un coin, son nom dessous s'il en a un, « Page
vide » sur une page sans rien ; la page qu'on regarde est encadrée de bleu.
On l'ouvre par le **compteur** « 3 / 7 » de la barre du haut (un bouton), par
**Maj + P** (la lettre écrite sur la touche, en AZERTY comme en QWERTY ; P seul
reste le Stylo), ou par **Toutes les pages…** dans le menu de la page (un clic
droit dans le vide). On la ferme par Échap, par le ×, par Maj + P, ou en
allant à une page ; ouverte au clavier, elle rend le focus au compteur. Elle
ne s'ouvre ni pendant la revue, ni
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
  une page après…**, le **Fond** (les huit : page blanche, petits carreaux,
  grands carreaux, Seyès, papier millimétré, papier pointé, réseau
  isométrique, repère ; sur deux colonnes depuis le lot 5, pour que le menu
  tienne sans défiler dans l'écran du poste de la classe),
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
  gauche) propose aussitôt les huit fonds (sur une colonne), la page blanche
  cochée (comme toute page neuve ; avant les retouches d'après le lot 5, le
  fond de la voisine), sous le focus (Entrée la prend) et, au pointeur, sous
  le pointeur (un second clic au même endroit la prend) ; le fond de la
  voisine le dit (« Celui de la page 4 »), pour qui veut le même ; une seule
  action, qu'un seul « Annuler »
  défait (pas de second temps par « Fond »). Le second clic d'un double-clic
  sur « Insérer… » (ou le second toucher d'un double toucher) ne fait rien :
  on reclique une fois le menu lu. Le bouton **Ajouter une page** du bandeau
  en met une à la fin, blanche (avant, au fond de la dernière). La nouvelle vignette prend le focus. Annulée, une page insérée
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
  « (copie) ». La copie s'ouvrira au centre de son original, à 100 % (comme toute page où l'on arrive). Plusieurs
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

## Les séances (lot 6)

Le rangement : **un dossier de la bibliothèque = une classe** (les dossiers
marqués « Dossier d'une classe », lot 4), **un classeur = un chapitre**, et
dans un classeur, **des séances**, chacune avec SES pages, numérotées à partir
de 1. Une séance commence quand on la crée : on n'a plus à la deviner dans le
film.

**Le compteur** « 1 / 2 » a sa séance juste dessous : une étiquette
« Séance du mar 14 oct 14h » (ou son nom, si on lui en a donné un), accrochée
sous la barre du haut au bord gauche du compteur, hors du flux de la barre
(ses boutons, et le bouton du classeur, ne bougent pas d'un pixel ; un clic
sur l'étiquette ouvre aussi la trieuse). Sur un téléphone, elle n'y est pas :
la séance se lit dans la trieuse et le menu « Plus ».
On ne feuillette (‹ ›, Page↑ Page↓, « Nouvelle page », la ligne des pages de
la trieuse, « Envoyer vers… ») que les pages de la séance du jour.

**Au lancement**, et à l'ouverture d'un classeur par la bibliothèque (la même
règle : c'est le même démarrage, avec la même fenêtre entière ; mais pas
quand on arrive sur un classeur qu'on vient d'ouvrir d'un fichier, d'ajouter
ou de créer : on l'a choisi, on le regarde, et sa dernière séance continue ;
« Séance … reprise » ne se dit pas non plus quand un autre message d'arrivée
se dit) :
- la dernière séance du classeur a servi il y a moins d'une heure : on y
  reste, sur la même page, et un message le dit (« Séance de 14 h reprise ») ;
- plus d'une heure : la fenêtre **« Bonjour ! »**, par-dessus la dernière
  page, grisée derrière. Le gros bouton, choisi d'office (Entrée suffit) :
  « Nouvelle séance avec la 5A » (le plus proche dossier de classe du
  classeur ; sans dossier de classe, « Nouvelle séance »). Dessous : « Fractions
  — changer de chapitre » (les classeurs du dossier de la classe, avec leur
  nombre de séances, le chapitre ouvert en tête, et « + Nouveau chapitre… » :
  le nom seulement, rangé dans le dossier, page blanche, et la case de la clé
  comme pour un nouveau classeur ; la copie sur le Drive suit comme pour tout
  classeur). « Continuer la séance de lundi 8 h ». « Une autre classe : 5B ·
  4C · 3A » (les autres dossiers de classe) : un clic ouvre le chapitre en
  cours de cette classe, le dernier classeur ouvert dans son dossier (ses
  sous-dossiers compris), et y commence une séance ; une classe sans classeur
  ouvre « Nouveau chapitre » dans son dossier. En bas, « Nouveau classeur
  vierge… » ouvre la fenêtre « Nouveau classeur » de la bibliothèque (page
  blanche cochée), rangé hors de toute classe, à enregistrer plus tard comme
  tout classeur. Sous le gros bouton, la case « Commencer par des
  automatismes », jamais cochée d'office : cochée, quel que soit le bouton
  choisi, la séance s'ouvre sur le réglage d'un flash (voir Automatismes).
  Échap ferme la fenêtre et
  laisse la dernière page telle quelle (la séance continue) ;
- un classeur où rien n'est encore écrit (un classeur neuf, un nouveau
  chapitre) commence sa séance sans question.
Le menu ⋯ a, après ce qui touche au classeur, **Nouvelle séance**, **Renommer
la séance…** (un nom facultatif, 60 caractères ; vide, elle reprend sa date),
**Séance précédente…** (au téléphone et sur un écran qu'on touche ; ailleurs,
son bouton est à côté de l'étiquette de la séance), et **Retour à
aujourd'hui** quand on regarde une séance passée (des entrées courtes, sans
aide : le menu tient encore sans défiler au poste de la classe). Une nouvelle séance s'ouvre sur une page 1 blanche, à 100 %.
Une séance du jour où rien n'est écrit (ni trait ni nom sur ses pages) ne se
double pas : « Nouvelle séance » la fait recommencer maintenant.

**Reprendre.** En début de séance, un bandeau (fermable ×) rappelle où la
précédente s'est arrêtée : « Lundi 8 h s'est arrêté page 3 · « Exercice 3 ».
[Reprendre la page] [Voir la séance] » (la page où l'on a écrit en dernier).
Il s'en va dès qu'on écrit sur une page de la séance, ou qu'on change de
séance. Le bouton **Séance précédente**, à côté de l'étiquette de la séance
sous le compteur (là seulement quand il y en a une ; au téléphone, dans le
menu « Plus »), ouvre en bas les vignettes de la séance précédente,
avec « Reprendre la page », « Voir la page » et « ‹ Séance d'avant ».
REPRENDRE fait une copie de la page (fond, nom, contenu) dans la séance du
jour, qui hérite son passé (voir `heritage.ts`) : si la page 1 du jour est
encore vide, la copie la remplace, sinon elle vient juste après la page du
jour où l'on était. Un message dit « Page reprise de lundi · Annuler ».
Dans le replay de la séance du jour, la page reprise démarre telle qu'elle
était à la fin de la séance d'origine (son passé n'est pas rejoué une
seconde fois), puis on voit les ajouts. La page d'origine ne change pas.

**Les séances passées se regardent sans s'écrire.** « Voir la page » (le
tiroir, la trieuse) montre une page d'une séance passée : le compteur
« Lun 13 oct 8h · page 3 » sur fond ambre, un bandeau « Séance de lundi :
vous la regardez sans la modifier » avec « Reprendre la page » et « Retour à
aujourd'hui ». On y feuillette ses pages (‹ ›), on y sélectionne et on y
copie ; le menu de la sélection (⋯) et celui de la page (clic droit, bouton
latéral de la plume de la tablette graphique) proposent **« Copier dans la
séance d'aujourd'hui »** (collé sur la page du jour où l'on était, à la même
place). Toute écriture sur une page d'une séance passée (un trait, la gomme,
déplacer, un fond, coller, Suppr, une construction, à la souris, au doigt ou
à la plume) ne se fait pas : le tableau la refuse (`Tableau.garde`), et une
fenêtre demande « Cette page est dans la séance de lundi… [Juste regarder]
[Reprendre et écrire] ». « Reprendre et écrire » reprend la page dans la
séance du jour et y refait ce qui avait été refusé (le trait part sur la
copie, qui a les mêmes identifiants de formes) ; on arrive dessus. Ctrl+Z,
Ctrl+Y et la poubelle n'y font rien (un message le dit).

**La trieuse** range par séance : en haut « Aujourd'hui · mar 14 oct 14h » et
la grille des pages du jour (toutes ses actions, comme avant) ; dessous, les
séances passées, repliées (« ▸ Lun 13 oct 8h · 3 pages »), de la plus récente
à la plus ancienne ; dépliée, une séance montre ses vignettes, et un clic
sur l'une ferme la trieuse et ouvre la page en lecture. Une page reprise est
bordée de bleu et marquée « Reprise de lundi ».

**Publier** propose les séances explicites, celle du jour d'abord (choisie
d'office), avec SA plage de temps et exactement SES pages cochées (« Page 1 ·
Exercice 3 (reprise de lundi) ») ; plus de réglage du découpage. « Copier pour
Pronote » ne change pas, ni le format du film élève (`.mem`). Republier une
séance d'avant le lot 6 la retrouve au même lien (sa clé est son début, qui
ne change pas à la migration). **La revue en classe** (« Que revoir ? ») montre
les séances explicites, leur nom s'il y en a un, les pages numérotées dans
leur séance ; le réglage « Nouvelle séance après une pause de… » n'y est plus.

**Le PDF.** « Exporter le classeur en PDF… » (le menu ⋯) exporte tout le
classeur, séance après séance (les numéros sont ceux de l'ordre du classeur).
Le menu de la page (Ctrl + P) et la trieuse exportent la séance qu'on regarde
(la trieuse : celle du jour, ou les pages choisies), numérotée dans la
séance : la fenêtre dit « Toute la séance : 3 pages » (« Tout le classeur »
quand le classeur n'a qu'une séance).

### Les décisions

- **Le modèle.** Deux cartes de premier niveau du document Yjs du classeur :
  `seances` (id → { debut, nom?, depuis?, ancienne? }) et `seanceDesPages`
  (page → id de sa séance). Hors des pages, comme les noms et la corbeille :
  ni étape du film, ni pile d'annulation ; un `.memc` (et un `.memb`, la clé,
  le Drive) les garde sans autre code. L'ordre des pages reste UN seul (la
  carte `ordre` d'avant) : les pages d'une séance sont celles de l'ordre qui
  sont à elle, dans cet ordre. Une séance neuve met sa page 1 au bout de
  l'ordre ; une page ajoutée se place à côté de celle qu'on regarde. Une
  version d'avant le lot 6 qui ouvre le fichier voit donc toutes les pages,
  séance après séance ; une page qu'elle ajoute n'a pas de séance : elle est
  de la séance de la page qui la précède dans l'ordre (à défaut de la
  suivante, à défaut de la dernière séance), sans que rien ne s'écrive. Le
  calcul est pur (`src/seances.ts`, essais dans `tests/seances.test.ts`).
- **La migration.** Un classeur qui n'a aucune séance écrite (d'avant le lot
  6, ou neuf) a des **séances en attente** (`Tableau.seancesActives`) :
  calculées, montrées, jamais écrites tant qu'on n'y change rien (l'ouvrir ne
  change pas un octet de sa base, de sa clé ni de son fichier : un fichier
  plus récent se met encore à jour sans conflit) ; elles s'écrivent, telles
  qu'on les voyait, juste avant le premier changement (une écriture sur une
  page, une page ajoutée, une séance neuve, un nom de séance :
  `ecrireLesSeances`). Les
  séances que repérait le découpage d'avant (20 min de silence, ou un autre
  jour) deviennent des séances nommées par leur date ; **chaque page va dans
  la séance où elle est née** (la première étape du film notée sur elle ; née
  avant toutes : la première). Une séance repérée où aucune page n'est née
  (on a continué les pages de la veille) ne devient pas une séance : sa
  plage du film va à la séance d'avant, et Publier propose, pour une séance
  migrée, aussi les pages où l'on a écrit pendant elle (une page née lundi et
  continuée mardi reste publiée avec mardi). Rien ne se perd, ni ne bouge :
  l'ordre des pages ne change pas. Un classeur sans aucun geste a une seule
  séance. Les identifiants sont tirés des heures (deux onglets écrivent la
  même chose).
- **L'annulation.** Créer une séance est hors annulation (comme nommer une
  page) : on change de séance par la fenêtre d'accueil ou le menu, jamais
  par Ctrl+Z. La reprise d'une page, elle, s'annule : « Annuler » de son
  message, ou Ctrl+Z sur la copie tant qu'on n'y a rien écrit (une marque,
  comme « Dupliquer la page ») retire la copie (sans la mettre dans la
  corbeille) et remet la page 1 vide qu'elle avait remplacée, dans la même
  transaction. Après un rechargement, Ctrl+Z ne la retire plus (les piles
  sont en mémoire) : la poubelle, si.
- **Pas de déplacement entre séances.** La trieuse ne montre et ne range
  que les pages du jour (déplacer, insérer, dupliquer, supprimer, la
  corbeille, « Envoyer vers… » : vers les pages du jour seulement). Une page
  d'une séance passée ne passe dans la séance du jour que reprise (une
  copie) : la séance passée reste telle que la classe l'a vue. Une page
  remise de la corbeille revient dans sa séance.
- **Le PDF** : le classeur entier par le menu ⋯, la séance par la page et la
  trieuse (voir plus haut).
- **L'ouverture par la bibliothèque** applique la même règle d'une heure,
  avec la fenêtre entière (la liste des classes comprise) : c'est le même
  démarrage. Arrivé par « Une autre classe » ou un autre chapitre, la séance
  commence sans question (une clé de l'onglet, `mem-teachingtool-nouvelle-seance`,
  valable une minute ; aucune clé existante ne change).
- **Une heure** : la dernière activité d'une séance est sa dernière étape du
  film notée sur l'une de ses pages (au plus tôt son début).

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
  piste des instruments, séances publiées). Une version d'avant (la version hors ligne
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
  la version d'avant (vérifié avec 94c518f : `lot4/migration/vt`), et le
  message le dit. Le travail de la séance, lui, se relit normalement.

## Enregistrer et ouvrir un classeur

Le classeur s'enregistre tout seul dans le navigateur, mais un navigateur
peut l'oublier : un poste de lycée remis à zéro chaque soir, un iPad sur
lequel on n'est pas revenu depuis des semaines, un historique effacé. Le
bouton **⋯**, au bout de la barre du haut (« Enregistrer, ouvrir ou exporter
en PDF ; réglages de cet appareil », Ctrl + S, Ctrl + O, Ctrl + P ; son nom
court, sous les outils, est « Fichier »), l'emporte dans un fichier. Chaque
entrée de son menu a un nom stable (`data-action` : `enregistrer`, `ouvrir`,
`exporter-pdf`, et pour la clé `activer-cle`, `enregistrer-cle`,
`arreter-cle`), que les essais retrouvent quel que soit le libellé.

- **Enregistrer le classeur…** (Ctrl + S, ⌘ + S sur Mac) écrit un fichier
  au nom du classeur, avec la date : `Symétrie centrale 2026-10-10
  14h05.memc` : toutes les pages, tout l'historique (la revue en classe et le
  replay marchent sur une autre machine comme sur celle-ci), les
  instruments, les images, la liste des séances publiées. Sur Chrome et Edge,
  on choisit où l'écrire (la clé USB, un dossier synchronisé avec le Drive) ;
  ailleurs, et depuis la version hors ligne, il se télécharge. Comme le
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
  intégré à la page : il marche aussi dans la version hors ligne (`file://`,
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
  celui-ci. ». Sur Chrome et Edge (aussi dans la version hors ligne), le choix
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
  (.memb). ». On n'ouvre pas de fichier pendant la revue ou une fenêtre
  ouverte. Sans l'index de la bibliothèque (le
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
et la version hors ligne, et d'une machine à l'autre. Le lecteur des élèves refuse un `.memc`
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
essai le vérifie avec 94c518f, dans les deux sens). L'en-tête tient dans les
4 096 premiers octets, même avec un nom de 60 caractères accentués ou de
guillemets ; `lireEntete` le lit seul, sur un début de fichier, sans rien
décompresser (`lireTableau`, qui vérifie tout, dirait « abîmé » sur un
début). Un nom ou un id qui ne sont pas valables sont ignorés à la lecture.
Le film élève commence lui aussi par `{"format":` ; chaque lecteur reconnaît
le sien à ses premiers octets. Le fichier garde aussi la corbeille des
pages, leurs noms et les copies de pages (qui savent de quelle page elles
héritent leur passé), et les notes du film qui disent ce qui n'est pas un
geste (`seulOrdre`, `naissance`, `rangement`, et depuis le lot 5 `reglage`) :
une version d'avant les ignore sans rien casser (une copie y paraît d'un coup
au replay, comme une page neuve ; un essai le vérifie avec la version d'avant
le lot 3 ; un réglage y compte pour un geste). Les champs que le lot 5 ajoute
aux formes (verrou, fixation en fond, groupe, rotation d'une formule, voir
`src/types.ts`) sont facultatifs : la version d'avant (6aee150) ouvre un
`.memc` du lot 5, le peint, le revoit et en publie le film sans erreur, en
les ignorant ; un `.memc` d'avant s'ouvre dans le lot 5 et s'y lit pareil
(un banc le vérifie dans les deux sens ; voir les Limites connues pour un
classeur repassé par la version d'avant).
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
  (fichier .memc). ») : vérifié avec 94c518f.

## L'enregistrement automatique sur la clé

Sur Chrome et Edge, le classeur peut s'écrire tout seul dans un fichier
`.memc` choisi une fois, sur la clé USB du professeur ou dans un dossier
synchronisé (`src/classeurs/cle.ts`). C'est surtout fait pour la version
hors ligne, sur le poste de lycée remis à zéro chaque soir : la clé
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
  remplace le premier classeur par son « Ouvrir » (vérifié avec 94c518f :
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
- **Dans la version hors ligne** (`file://`), Chromium a
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
ligne (la connexion Google ne marche pas dans la version hors ligne) »).

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
  les 10 dernières versions. ») ; dans la version hors ligne, elle est grisée
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
  ajouter une copie). Grisé dans la version hors ligne.

À essayer une fois pour de vrai, sur le vrai compte : un classeur de plus de
5 Mo (l'envoi reprenable), puis, dans Google Drive, le dossier « MEM -
Sauvegardes », les versions du fichier (Gérer les versions : dix au plus) et
la place qu'elles prennent ; laisser le jeton expirer (une heure), puis
« Se connecter à Google » ; « Récupérer une sauvegarde du Drive » sur un
autre poste.

## Ouvrir et enregistrer, sur l'ordinateur ou sur le Drive (lot 7)

Deux fenêtres, une liste (`src/classeurs/ailleurs.ts`, d'après les maquettes
validées par le professeur le 17 octobre 2026). Ses trois choix : **un
dossier de classe est un vrai dossier**, un `.memc` par chapitre, tenu à
jour tout seul (1B) ; sur le Drive, le dossier **« MEM - Classeurs »** (ou
« LFB - Classeurs »), avec un sous-dossier par classe (2A) ; la liste **« Mes
emplacements »** en haut de la bibliothèque (3A).

### Le mode d'emploi

- **Ouvrir un classeur.** Dans la bibliothèque, **Ouvrir…** : la fenêtre
  « Ouvrir » a deux onglets, **Cet ordinateur** et **Google Drive**.
  « Choisir des fichiers… » est le choix d'avant (Ctrl + O y mène toujours
  directement, et un fichier glissé sur la page s'ouvre comme avant).
- **Ouvrir toute une classe.** Cet ordinateur → **Choisir un dossier…**
  (Chrome et Edge) : tous les classeurs du dossier (et de ses sous-dossiers)
  arrivent dans le dossier du même nom de la bibliothèque, créé s'il
  n'existe pas. La case « Garder ce dossier relié », cochée d'avance, en
  fait l'emplacement de la classe : chaque classeur y garde son fichier.
  Google Drive → les classes de « MEM - Classeurs » sont listées, avec
  **Ouvrir toute la classe** (elle reste reliée au Drive), et chacun de
  leurs classeurs. Un classeur déposé ailleurs dans le Drive n'y est pas
  (voir plus bas) : le télécharger, puis « Cet ordinateur ».
- **Enregistrer.** Menu ⋯ du classeur → **Enregistrer sur le Drive ou
  ailleurs…**, ou le menu d'un dossier → **Enregistrer ce dossier…** :
  - **Quoi ?** Ce classeur, le dossier de la classe (son dossier le plus
    haut), ou toute la bibliothèque.
  - **Où ?** Cet ordinateur (une clé, un dossier, G:\Mon Drive…) ou Google
    Drive.
  - **Le garder à jour tout seul** (coché) : ce classeur sur l'ordinateur,
    c'est l'enregistrement automatique sur la clé d'avant ; le dossier de la
    classe sur l'ordinateur : on choisit un dossier, chaque classeur y prend
    son fichier (« Fractions.memc », dans les mêmes sous-dossiers que dans
    la bibliothèque) ; sur le Drive : « MEM - Classeurs › 5A », un fichier
    par classeur. Décoché : un seul fichier `.memb` de la classe,
    enregistré une fois. Toute la bibliothèque : toujours une fois (un
    `.memb`, à la racine de « MEM - Classeurs » pour le Drive). Ce classeur
    sur le Drive : une fois, à la racine de « MEM - Classeurs » (la fenêtre
    dit d'enregistrer plutôt le dossier de sa classe pour qu'il se tienne à
    jour).
- **Mes emplacements.** En haut de la bibliothèque : chaque classe reliée
  (« 5A → Drive personnel › MEM - Classeurs › 5A », « 4B → Cet ordinateur ›
  Cle 4B »), ce qui n'y est pas encore (« 2 classeurs pas encore dedans »),
  **Mettre à jour** (y met chaque classeur de la classe, l'accord du
  navigateur ou la connexion Google dans ce clic) et **Retirer** (ne plus
  tenir ce dossier à jour : rien n'y est effacé). À la racine : toutes les
  classes reliées ; dans un dossier : celles de sa classe.
- **Dans la version hors ligne**, le Drive est grisé dans les deux
  fenêtres, et elles le disent : « Le Drive marche seulement depuis la
  version en ligne (mathsetmoi.github.io). » Rien ne part vers Google.

### Comment c'est fait

- **Un dossier de l'ordinateur relié** (`src/classeurs/ordinateur.ts`) :
  `showDirectoryPicker` (Chrome, Edge), la poignée du dossier gardée dans
  l'index (le réglage `emplacement-poignee:<id>`, à part du magasin
  `poignees`, qui ne garde que les fichiers des classeurs). Chaque
  classeur de la classe y prend un fichier qui devient **le fichier de sa
  clé** (`cle.ts`) : il s'y écrit peu après chaque changement, quand le
  classeur est ouvert, avec tous les garde-fous de la clé. Jamais rien
  d'écrasé : le fichier du même classeur, sans rien de plus que la
  bibliothèque (le dossier rouvert le matin sur le poste remis à zéro), est
  adopté tel quel ; s'il a des changements que la bibliothèque n'a pas, il
  n'est pas touché (le message dit de l'ouvrir d'abord) ; un fichier qui
  n'est pas à lui laisse la place à « Fractions (2).memc ». Un classeur qui
  a déjà sa clé ailleurs la garde.
- **Une classe reliée au Drive** (`src/publication/drive.ts`) : un troisième
  dossier privé, « MEM - Classeurs » (marque `memClasses`), et dans lui le
  dossier de chaque classe, marqué par l'id du dossier de la bibliothèque
  (`memClasse` ; un renommage dans la bibliothèque le suit). La copie sur le
  Drive des classeurs de cette classe (`copie-drive.ts`, lot 4 C10) y va au
  lieu de « MEM - Sauvegardes » : la copie d'avant y est **déplacée**
  (`addParents`/`removeParents`), avec ses versions, jamais doublée. Relier
  la classe met la copie de chacun de ses classeurs sur ce Drive et les
  copie tout de suite (`copierDepuisLaBase`, sous le verrou de chaque
  classeur). Ces fichiers gardent la marque des sauvegardes :
  « Récupérer une sauvegarde du Drive » les voit aussi (seulement ceux du
  compte choisi).
- **Le droit Google reste `drive.file`** : MEM teachingtool ne voit du
  Drive que ce qu'il y a créé. Pas de fenêtre de Google pour choisir un
  fichier ailleurs dans le Drive (elle demande un réglage de plus dans la
  console Google, peut-être une clé d'API) : choix du professeur, le 17
  octobre 2026, pour ne rien ouvrir de plus côté Google pour l'instant.
- **L'index** : la liste des emplacements dans le réglage `emplacements`
  (une clé nouvelle) ; la fiche d'un classeur gagne un champ facultatif
  `drive.dossier`. Aucune base, aucune clé existante, aucun format de
  fichier ne change.
- **Les essais** : `tests/emplacements.test.ts` (sous Node) et
  `essais/navigateur/lot7/E1-ailleurs.mjs` (Google simulé, avec le
  déplacement ; les dossiers de l'ordinateur dans
  l'OPFS). Adapté : `lot4/C9-fichiers.mjs`, où « Ouvrir… » du bandeau montre
  maintenant la fenêtre « Ouvrir » avant le choix des fichiers.

### Limites, et ce qu'il faut faire une fois

- Rien à régler dans la console Google : le lot n'utilise que la
  connexion et l'API Drive de Publier et de la copie.
- Un classeur déposé à la main ailleurs dans le Drive ne se voit pas
  depuis l'onglet « Google Drive » : le télécharger (ou passer par
  G:\Mon Drive avec Google Drive pour ordinateur), puis « Cet ordinateur ».
- Un classeur ajouté plus tard dans une classe reliée y arrive avec
  **Mettre à jour** (la liste le signale) ; sur l'ordinateur, chaque fichier
  se met à jour quand son classeur est ouvert, comme la clé.
- Firefox, Safari et l'iPad ne savent pas écrire dans un dossier : sur
  l'ordinateur, le dossier de la classe y est un `.memb` enregistré une
  fois ; le Drive y marche.
- À essayer une fois pour de vrai, sur le vrai compte : relier une classe au
  Drive personnel, regarder « MEM - Classeurs » dans Google Drive, puis
  rouvrir la classe depuis l'onglet « Google Drive » sur un autre poste.

## Un dossier par chapitre, et toutes les séances au même endroit (lot 8)

Choix du professeur, le 19 octobre 2026 (maquettes validées) : **dossier =
la classe (« 5ème », « Auguste »), chapitre = un classeur**, et toutes les
séances du chapitre au même endroit. Pas de distinction 5A / 5B.

### Le mode d'emploi

- **Sur l'ordinateur et sur le Drive, un chapitre est un vrai dossier.** Un
  classeur relié à un dossier de classe s'écrit dans un dossier à son nom :
  `5ème/Fractions/Fractions.memc` ; sur le Drive, « MEM - Classeurs › 5ème ›
  Fractions › Fractions.memc ». Les sous-dossiers de la bibliothèque
  (« Géométrie ») se retrouvent sur l'ordinateur ; le Drive garde un seul
  niveau (classe › chapitre).
- **Ce qui existait déjà ne se perd pas.** Un `.memc` posé à plat dans le
  dossier de la classe est adopté tel quel s'il est le même classeur ; sur
  le Drive, la copie d'avant est **déplacée** dans le dossier du chapitre à
  la prochaine copie (jamais doublée).
- **Les séances sous la carte.** Une carte dit « 3 séances » : un clic la
  déplie, la plus récente d'abord, avec ses pages. Un clic sur une séance
  ouvre le classeur à la première page de cette séance (en lecture si elle
  est passée). Pour le clavier : le menu ⋯ de la carte, « Voir les séances ».
- **Le bouton « Séances ».** Dans le bandeau de la bibliothèque, à côté de
  « Corbeille » : toutes les séances, la plus récente d'abord, par mois.
  « Chapitre en cours » (le classeur ouvert) est le choix de départ ; « Tous
  les chapitres » montre toute la bibliothèque. Un clic ouvre la séance ;
  Échap revient aux cartes.
- **Les replays `.mem`** ne bougent pas : le lien des élèves passe toujours
  par « MEM - Replay séances » (les liens déjà envoyés restent bons). Les
  ranger aussi dans le dossier du chapitre n'est pas fait.

### Comment c'est fait

- `src/classeurs/ordinateur.ts` : `relierLesClasseurs` écrit chaque classeur
  dans `[sous-dossiers…, nom du chapitre]`.
- `src/publication/drive.ts` : `dossierDuChapitre` (marque `memChapitre` =
  id du classeur, comme `memClasse` pour la classe) ; `listerLesClasses` et
  `listerSauvegardes` regardent aussi ces sous-dossiers. `copie-drive.ts`
  y envoie la copie.
- La fiche d'un classeur gagne un champ **facultatif** `listeSeances`
  (`{ id, debut, nom?, pages }[]`, écrit avec `seances` par `suivi.ts` et
  `registre.noterOuverture`) ; l'adresse accepte `?classeur=ID&seance=SID`
  (`main.ts`, lue avant que le démarrage ne nettoie l'adresse).
- `src/classeurs/liste.ts` : `libelleSeances`, `lignesDesSeances`,
  `seancesParMois` ; `vue-seances.ts` : la vue du bouton « Séances ».
- Aucune base, aucune clé de stockage, aucun format de fichier ne change.
- Les essais : `tests/bibliotheque.test.ts`, `lot7/E1-ailleurs.mjs` (adapté :
  dossiers de chapitre), `lot8/E1-seances-carte.mjs`,
  `lot8/E2-onglet-seances.mjs`.

## Ranger les séances d'un classeur (lot 9)

Demande du professeur, le 20 octobre 2026 (maquette validée) : renommer une
séance, la supprimer, changer sa place dans le classeur, la déplacer vers un
autre classeur.

### Le mode d'emploi

Dans la bibliothèque, sous la carte dépliée d'un classeur, chaque séance a
une poignée ⠿ à gauche et un bouton … à droite (aussi : clic droit sur la
séance, ou la touche Menu).

- **Renommer…** (F2) : le nom s'écrit sous la date. Effacer le nom remet la
  date seule.
- **Monter / Descendre** (Alt + ↑ / Alt + ↓), ou glisser la poignée : l'ordre
  devient libre, la date reste affichée telle quelle, et la liste dit
  « Ordre choisi à la main ». « Remettre dans l'ordre des dates » revient à
  l'ordre habituel. Une nouvelle séance arrive toujours en haut. Échap
  pendant le glisser : rien ne bouge.
- **Supprimer** (Suppr) : les pages de la séance vont dans la corbeille du
  classeur ; « Annuler » dans le message remet tout, avec le nom. La seule
  séance d'un classeur : c'est le classeur entier qui va dans la corbeille.
- **Déplacer vers…**, ou glisser la séance sur la carte d'un autre
  classeur : la séance part avec ses pages, son nom, sa date et son film
  (Revoir et Publier marchent comme avant), et se range à sa date dans
  l'autre classeur. « Annuler » la ramène. Un classeur qui a déjà une séance
  à la même heure refuse, et rien ne bouge.
- **Les replays déjà publiés ne bougent pas** : le lien des élèves reste
  bon. Une séance déplacée garde ses publications : la republier depuis son
  nouveau classeur remplace le même replay (même lien).
- Le classeur ouvert dans l'onglet suit aussitôt ; si la séance qu'on
  regarde part, le tableau montre une autre page.
- Les pages restent numérotées à partir de 1 dans chaque séance.

### Comment c'est fait

- `src/seances.ts` : la fiche d'une séance gagne un champ **facultatif**
  `rang` (l'ordre choisi à la main) ; `seancesDansLOrdre`, `ordreALaMain`,
  `rangsDeLOrdre`, `ordreApres`. Les rangs partent de la date la plus
  récente et descendent : une séance nouvelle, sans rang, passe devant.
- `src/deplacer-seance.ts` : `supprimerSeance`, `copierSeance`,
  `retirerSeance`. La copie rejoue le film de la séance dans un tableau
  neuf (nouveaux identifiants de pages, images de la banque, héritages
  gardés seulement si la page mère part aussi), puis glisse ses étapes à
  leur heure dans le film de l'autre classeur, avec des instantanés
  recalculés : le film reste rangé par heure, comme le veut l'export. Une
  étape de dessin de l'autre classeur au milieu de la séance : refus.
- `src/document.ts` : `rangerLesSeances`, `rendrePages`, `marquerDefinitives`,
  `pagesA`, `ecrireSansFilm`.
- `src/classeurs/fichiers.ts` : `lireUnClasseur` et `ecrireUnClasseur`
  (le classeur ouvert dans l'onglet reçoit la différence, les autres sont
  réécrits dans leur base) ; `bibliotheque.ts` : le menu, le clavier, le
  glisser, la fenêtre « Déplacer vers… ».
- Aucune base, aucune clé de stockage ne change ; `.memc`, `.memb` et `.mem`
  gardent leur format (le seul champ nouveau, `rang`, est facultatif).
- Les essais : `tests/deplacer-seance.test.ts`,
  `essais/navigateur/lot9/E1-ranger-seances.mjs`.

## Reprendre un ancien tableau (.prof)

Les séances d'avant ce classeur sont des **anciens tableaux** : un fichier
`.prof` par séance. Ils s'ouvrent comme un classeur (`src/classeurs/ancien-tableau.ts`,
la fenêtre dans `src/classeurs/fichiers.ts`), et chacun devient **une séance**
d'un classeur, avec son film.

### Le mode d'emploi

- **Ouvrir…** (Cet ordinateur → Choisir des fichiers…), Ctrl + O, ou le
  fichier glissé sur la page : un ou plusieurs `.prof` à la fois (sans
  classeur ni bibliothèque avec eux : on le dit).
- La fenêtre « Reprendre cet ancien tableau ? » dit chaque séance (« « 2 -
  Mardi 29 septembre 2026 » : séance du mardi 29 septembre 2026, 1 page. »),
  du plus ancien au plus récent. Deux choix :
  - **Nouveau classeur** : un classeur neuf, au nom du premier fichier, dans
    le dossier qu'on regarde ; il s'ouvre ;
  - **Ajouter à « … »** : au bout du classeur ouvert, s'il n'a rien de plus
    récent que la séance (le film se lit dans l'ordre des heures). Sinon le
    bouton n'est pas là, et la fenêtre dit pourquoi : on ajoute les séances
    dans l'ordre des dates, la plus ancienne d'abord.
- Pour ranger les séances dans leurs chapitres : la première séance d'un
  chapitre en **Nouveau classeur**, puis, ce classeur ouvert, les suivantes
  en **Ajouter à « … »**.
- Le message de la fin fait le bilan : « « 2 - Mardi 29 septembre 2026 » :
  1 page, 97 traits, 4 images, avec son film. » ; ce qui n'a pas été repris
  y est compté.

### Ce qui est repris

- **Les traits**, avec leur pression ; le surligneur reste un surligneur
  (transparent).
- **Les images**, à leur place, à leur taille, tournées comme elles
  l'étaient ; une image rognée devient la partie gardée (comme « Rogner ») ;
  réduites comme une image importée (1600 px au plus) ; les mêmes pixels ne
  sont gardés qu'une fois dans le classeur. Une image posée en fond est
  fixée en fond.
- **Les textes** deviennent des formules (`\text{…}`), à leur place, de leur
  couleur et de leur taille ; ce qui était entre `$…$` reste une formule ;
  la mise en forme (gras, listes, bulles) se perd.
- **Le film** : chaque geste de l'ancien tableau (son état après chaque
  geste, avec son heure) devient une étape du film, à son heure, sur sa
  page. « Revoir la construction » et Publier rejouent la séance comme une
  séance écrite ici. La séance commence au premier geste ; une page sans
  film paraît avec lui ; si le film ne finit pas sur la page enregistrée,
  c'est elle qui fait foi.
- **Les figures** : un point devient un point marqué de sa croix (comme
  l'outil Point, sans nom) ; un segment ou une droite, une ligne entre ses
  deux points (prolongée pour une droite), qui suit ses points quand ils
  bougent dans le film ; un arc tracé au compas, un arc de cercle. Les
  pointillés restent en tirets, les flèches en flèches ; l'épaisseur ne
  dépasse pas celle d'une figure d'ici. Une figure posée sur une image lui
  reste liée (elle la suit), et les points de ses segments aussi.
- **Les rectangles** : des rectangles (remplis s'ils l'étaient), qui suivent
  leurs coins. Un **cache** (un rectangle plein posé pour masquer une partie
  d'une image) devient un aplat opaque de sa couleur (une image d'un pixel,
  étirée) : on l'efface pour découvrir ce qu'il cachait ; ses coins ne se
  voient pas.
- **Le mode nuit** : un ancien tableau enregistré en mode nuit (ou une page
  qui l'était) donne des pages en mode nuit, dès le début de la séance
  (l'ancien film ne dit pas quand il a basculé). Son encre blanche y devient
  le Noir, que le mode nuit montre presque blanc ; les autres couleurs ne
  changent pas.
- Le fond (le Seyès avec marge et la copie double perdent leur marge).
- Ce qui est écrit est décalé pour commencer en haut à gauche de la page.

Ne sont pas repris (et le bilan le compte) : les cercles et polygones
tracés comme figures, les courbes, les post-its. Une image effacée pendant
la séance dont le fichier n'a pas gardé les données manque au film (le
bilan le dit).

**Un film sans heures** (certains anciens tableaux l'ont enregistré sans
elles) : la séance prend la date écrite dans son nom (« Mardi 22 septembre
2026 », « 2026-10-13 »), à 8 h, et non celle de son dernier enregistrement,
qui peut venir bien plus tard ; ses gestes se suivent, 5 secondes l'un
après l'autre. Les outils posés comme des images restent des images.

### Comment c'est fait

Le fichier est lu en entier (`lireAncienTableau`), son film rejoué page
par page ; le classeur se fait **en mémoire** (un `Tableau` qui ne vit
nulle part : un classeur neuf, ou l'état du classeur ouvert, `lireEtat`),
chaque geste en une transaction, avec l'heure de son étape
(`Tableau.horloge`) ; puis il entre dans la bibliothèque **comme un fichier
`.memc`** : ajouté (Ajouter à la bibliothèque), ou le classeur ouvert mis à
jour sans rien perdre (le chemin de « Mettre à jour le classeur »). Rien
ne s'écrit si la reprise échoue. Essais : `tests/ancien-tableau.test.ts`,
`essais/navigateur/lot7/E2-ancien-tableau.mjs`.

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
  outils, avec le nom et l'état (1366 × 768 : 539 px ; 1280 × 720 : 453 ;
  un TNI en 1920 : 1093, et 875 avec les noms sous les outils, qu'il a
  d'office depuis le lot 5 ; l'iPad 11 pouces en paysage, 1194 × 834, et
  aussi, depuis le lot 5, 1180 × 820 : 353 et 1112 × 834) ;
  de 58 px à cette place, l'icône et le point (1024 × 768 : 197 ; 960 ×
  600 : 133 ; une fenêtre de moins de 1080 px environ, où « Seulement dans ce
  navig… » serait coupé) ; moins, quand la barre du haut est déjà sur
  plusieurs rangées (les tablettes, les téléphones), il devient son premier
  bouton, s'il n'y ajoute pas de rangée ; sinon il se cache, et le bouton ⋯
  porte le point, son titre nomme le classeur (« … · Classeur « Symétrie
  centrale » ») et son menu commence par l'état. C'est le cas à 1024 × 768
  dès qu'une page du classeur a un nom : le compteur du lot 3 prend alors la
  place (il en reste 25 px), et la barre du haut reste exactement celle du
  lot 3. Au téléphone (lot 5, K10, voir « Le téléphone »), la barre du haut
  est sur une rangée, et il en est toujours le premier bouton (l'icône et
  le point), s'il y tient sans en ajouter une (de 320 × 568 à 932 × 430,
  il y tient). (Les places ont gagné 115 px au
  lot 5 : la liste déroulante des fonds est devenue un bouton de 44 px ; elles
  étaient de 424, 338, 978, 238 et 82 px.) Il se place aux
  seuls moments où le compteur se règle (la fenêtre qui change, la police
  qui arrive, le premier nom de page, et depuis le lot 5 la barre des
  outils qui change de largeur : les noms sous les outils l'élargissent de
  22 px, voir « Cet appareil ») : jamais d'une page à l'autre. Avec les noms
  sous les outils, à 1024 × 768, la barre du haut passe sur deux rangées et
  il en devient le premier bouton.
- **Au téléphone en portrait**, jusqu'au lot 5, la barre du haut passait
  sur plusieurs rangées (trois sur un iPhone 12 ou un Pixel 5 : jusqu'à
  y = 162 ; quatre sur un iPhone SE), et la barre des outils, posée en bas
  en colonne, s'arrêtait 12 px sous son bas MESURÉ (`--bas-barre-haut`,
  suivi par un ResizeObserver et à chaque changement de taille de la
  fenêtre) : avant (depuis le lot 2, vu en C3), elle montait jusqu'à
  y = 128, sous la barre du haut, et un toucher au centre du bouton Stylo
  ne l'atteignait pas (contrôle final du lot 4 ; essai
  `lot4/CF3-telephone.mjs` : iPhone 12, Pixel 5, iPhone SE, Galaxy S8, en
  paysage, iPad, PC, TNI, et la fenêtre qui change de largeur). Depuis le
  lot 5 (K10), la barre du haut y tient sur une rangée et la barre des
  outils est une rangée de sept boutons en bas, sur toute la largeur (voir
  « Le téléphone ») ; `--bas-barre-haut` reste mesuré (le panneau du
  programme de construction et sa consigne, et au téléphone le message
  passé sous la barre du haut, s'y règlent).
- **Le menu ⋯** (au téléphone, *Plus* : ses sections Page, Outils de cours
  et Vue viennent d'abord, voir « Le téléphone ») commence par le bloc du classeur : son nom, puis une ligne
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
  Google ne marche pas dans la version hors ligne) », « Pas de copie sur le
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
  `src/navigateur.ts`). Tout à la fin du menu (lot 5), après un filet, le
  titre « Cet appareil » et ses deux cases : « Contraste renforcé » et « Noms
  sous les outils » (voir « Ce que fait la v0.1 »). Le menu s'ouvre toujours
  sous son bouton : plus long que la place qui reste en dessous (à 1366 ×
  768, quand il porte l'entrée de la clé), il défile, au lieu de remonter
  sur la barre du haut et de couvrir son bouton ; il se rouvre en haut. Les
  entrées d'un petit menu qui défile gardent toujours leur hauteur, partout
  (depuis la vérification « appareils » du lot 5 ; avant, hors du téléphone,
  elles se tassaient jusqu'à 44 px : dans une fenêtre de Chrome de 1366 ×
  657, l'aide d'« Enregistrer le classeur… » passait sous le titre de
  l'entrée suivante, et un clic au bout de cette aide lançait
  « Enregistrer automatiquement dans un fichier… ») : à 1366 × 657 ou
  1280 × 720, le menu ⋯ défile, ses deux cases de « Cet appareil » en bas ;
  le menu de la page aussi, quand ses entrées du lot 5 (l'image fixée en
  fond, *Déverrouiller tout*) l'allongent au-delà de l'écran.
- **Le bandeau discret**, une ligne sous le bouton du classeur (ou sous la
  barre du haut, à droite, quand le bouton y est ou qu'il est caché), 13 px,
  360 px au plus, jamais animé, jamais sous la barre des outils (quand la
  barre du haut va d'un bord à l'autre et que la barre des outils est à
  côté de lui, il s'arrête à 8 px à droite d'elle, qui en cachait le début
  du texte et des boutons ; au téléphone en portrait, depuis le lot 5, la
  barre des outils est en bas, loin de lui), caché pendant la revue, une séance et la
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
  enregistrement automatique, et surtout dans la version hors ligne,
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
garde dans ce qu'elle enregistre (vérifié avec 94c518f :
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
page » (Petits carreaux ; Page blanche, cochée d'office depuis les retouches
d'après le lot 5 — avant, les petits carreaux — ; Seyès ; Repère ; puis,
depuis le lot 5, Grands carreaux (1 cm) ; Papier millimétré ; Papier pointé ;
Réseau isométrique) et, sur
Chrome et Edge, la case **Enregistrer automatiquement sur la clé**, cochée
d'office dans la version hors ligne (`file://`, le poste remis à
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

## Importer un PDF

Une fiche, un énoncé, un sujet en PDF se pose sur le tableau pour écrire
dessus. Il arrive comme une image : le bouton image de la barre du haut
(« Importer une image ou un PDF »), un fichier glissé sur le tableau, ou
Ctrl+V. La fenêtre « Importer un PDF » montre ses pages en vignettes, toutes
cochées : un clic sur une page la prend ou la laisse (« Importer 3 pages »).
Puis où les mettre :

- **une page du tableau par page du PDF** (le choix de départ) : elles
  s'ajoutent à la séance juste après la page qu'on regarde (depuis une
  séance passée, à la séance du jour, comme Nouvelle page), la feuille en
  haut à gauche, assez large pour se lire à 100 % (la place entre les
  barres, au plus 1000), avec de la place en dessous pour la correction ; on
  arrive sur la première ;
- **toutes sur cette page**, l'une sous l'autre, en haut de ce qu'on voit
  (pas offert dans une séance passée, en lecture).

La case **Fixer en fond**, cochée au départ, les fixe comme « Fixer en
fond » (lot 5) : la feuille ne bouge plus quand on écrit dessus, et la gomme
n'efface que l'écriture ; on la détache par le menu de la page. Décochée,
elles arrivent sélectionnées, comme une image importée. Le choix des deux
réglages est retenu le temps de la session (aucune clé de stockage neuve).

Chaque page devient une image ordinaire (JPEG, 1600 px de large, au plus
2400 de haut) : le classeur, le replay, l'export en PDF et le Drive n'ont
rien de neuf à connaître, et les formats ne changent pas. La lecture se fait
sur l'ordinateur par pdf.js (`pdfjs-dist`, sa version « legacy », pour les
navigateurs de quelques années), chargé au premier PDF : son travailleur est
rangé dans l'outil comme un texte et lancé en travailleur classique (Chrome
refuse un travailleur « module » fait d'un texte en `file://`). La version
hors ligne lit donc les PDF sans internet ; son fichier passe d'environ 3,2 à
5 Mo. Un PDF protégé par un mot de passe ou abîmé : « Impossible de lire ce
PDF ». Code : `src/import-pdf.ts` ; essai : `essais/navigateur/lot11/E1-import-pdf.mjs`.

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

La fenêtre dit ce qu'on exporte, porte la case du fond imprimé (cochée au
départ ; le choix est gardé dans ce navigateur, le même que pour l'image
copiée : `mem-sortie-fond`), qui nomme le fond de ce qu'on exporte quand il
n'y en a qu'un — *Imprimer le fond de la page : Papier pointé*, *Imprimer le
fond des pages : Seyès* — et sinon ses sortes, *Imprimer le fond des pages
(carreaux, Seyès, millimétré, pointé, repère…)* (de même sur une page
blanche) ; elle suit le choix entre « La page 3 » et « Tout le classeur »
(depuis les corrections « affichage » du lot 5 : avant, elle disait pour tous
les fonds « (carreaux, Seyès, repère) », et l'on pouvait croire que le papier
pointé ou le réseau isométrique ne s'imprimaient pas). Puis une note,
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
le fichier unique de la version hors ligne : aucun service extérieur, aucune
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

**Le curseur montre l'outil en main.** À la souris et au survol de la
tablette graphique, il prend l'icône du bouton de l'outil : le stylo et le
surligneur écrivent par leur pointe, le Point se pose au centre de sa croix ;
le Segment (segment, droite ou demi-droite), les Formes (rectangle, cercle,
polygone) et la Formule visent avec une petite croix, leur icône à côté. La
Sélection garde la croix, la Main le curseur « main », la Gomme son cercle.
Au doigt, il n'y a pas de curseur : rien ne change (`src/curseurs.ts`).

Stylo sensible à la pression, surligneur, gomme (au trait entier, ou seulement là où elle passe), segments (Maj pour
les angles de 15°, aimant au quadrillage), formules LaTeX avec aperçu et
raccourcis, sélection et déplacement, copier, coller, dupliquer (d'une page et d'un onglet à l'autre), annuler/rétablir (page par page ; au doigt, toucher à deux ou trois doigts), pages (supprimées sans question, rendues par Annuler ou Ctrl+Z, ou remises de la corbeille), fonds (blanc,
petits carreaux, grands carreaux, Seyès, papier millimétré, papier pointé,
réseau isométrique, repère gradué), zoom de 10 % à 2000 % — le quadrillage
suit le zoom comme une carte : les carreaux trop petits s'estompent et laissent
place à de plus grands (1 cm, 5 cm, 10 cm…), la page n'est jamais blanche.

**Les réglages par défaut** (retouches après le lot 5, le choix du
professeur). Le trait est **Fin** au démarrage (le premier des trois, 2,5 ;
avant, Moyen) : rien ne garde l'épaisseur d'une session à l'autre. **Le
surligneur a son épaisseur à lui** (corrections des vérifications des
retouches) : son trait vaut cinq fois elle, et elle part **Moyen**, comme
avant (22,5 : il couvre une ligne écrite) ; commune au Stylo, elle serait
partie fine avec lui (12,5, un filet qui ne couvrait plus l'écriture), et
le professeur a demandé un trait fin, pas un surligneur fin. Les trois
boutons d'épaisseur montrent et règlent celle de l'outil en main
(`App.tailleEnMain`, `App.choisirTaille`) : celle du Surligneur quand on le
tient, celle du Stylo (et des segments, des formes) sinon ; « Fin » au
Surligneur le rend fin, sans toucher au Stylo. **Toute
page qui naît vide est une page blanche** (`FOND_NEUF`, `src/types.ts`) : le
bouton *Nouvelle page* (+), › sur la dernière page, la première page d'un
classeur neuf (la fenêtre « Nouveau classeur » coche *Page blanche* d'office ;
de même la première page d'un navigateur neuf ou d'une base vide), *Ajouter
une page* et *Insérer une page avant… / après…* dans la trieuse (le choix du
fond reste offert, *Page blanche* cochée d'office), *Envoyer vers… une
nouvelle page* — quel que soit le fond de la page qu'on regarde (avant, une
page neuve prenait le fond de la page d'où on la créait, un classeur neuf
les petits carreaux). Une page **dupliquée garde son fond** (c'est une
copie) ; les pages qui existent ne changent pas ; le fond se change ensuite
comme avant (le bouton du fond, le menu d'une vignette). **Le zoom est
toujours à 100 % quand on ouvre un classeur ou qu'on change de page**, à
l'endroit où l'on était dans cette page : la session de ce navigateur garde
le centre de chaque page, qu'on reprend à 100 % (elle note encore son zoom,
qui ne sert plus : le format de `mem-session` ne change pas). Une page jamais
regardée qui a déjà quelque chose (un classeur ouvert d'un fichier, le même
classeur sur un autre ordinateur) s'ouvre à 100 % **sur le début de son
contenu** (`vueAuDebut`, `src/camera.ts`) : dans chaque sens, le contenu
centré entre les barres s'il y tient avec 32 px de marge, sinon son bord
gauche et son haut à 32 px du coin de ce qu'on voit entre les barres. Un
petit contenu se voit donc entier et centré, comme avant ; un grand s'ouvre
sur son coin en haut à gauche, là où l'on commence à lire, et non plus
réduit pour tout montrer ; un exercice qui descend, centré en largeur, sur
son haut. Une page neuve s'ouvre en vue neutre, à 100 %. *Tout voir*
(Maj + 1) et le zoom à la main restent ; la revue en classe et le lecteur
élève ne changent pas (la revue s'ouvre sur la vue du tableau, zoom compris ; l'accueil
du lecteur garde ses petits carreaux).

**Le fond de la page** (lot 5). Dans la barre du haut, le bouton du fond
montre en petit le fond de la page (sa vignette, 30 × 22 px ; son titre et
son nom lu : « Fond de la page : Papier pointé ») ; il ouvre sous lui le
**menu des fonds en vignettes** : les huit fonds en 4 × 2 (deux colonnes sur
un écran de moins de 480 px), chacun dessiné comme sur la page, à un zoom où
son motif se lit, son nom dessous — *Page blanche*, *Petits carreaux*,
*Grands carreaux (1 cm)*, *Seyès*, *Papier millimétré*, *Papier pointé*,
*Réseau isométrique*, *Repère* ; celui de la page coché (cerné de bleu). Un
clic (un toucher) le choisit et ferme le menu ; le repère se pose, comme
avant, au milieu de ce qu'on regarde. Au clavier, Entrée sur le bouton
l'ouvre, le focus sur le fond de la page ; ← et → passent à la vignette
voisine, ↑ et ↓ à la rangée d'à côté (en tournant), Début et Fin à la
première et à la dernière ; Entrée choisit, Échap ferme sans rien changer, et
le focus revient au bouton. C'est un petit menu comme les autres : un seul
ouvert à la fois, un appui ailleurs le ferme sans rien poser. Ses vignettes
se peignent une fois, à la première ouverture. Les quatre nouveaux, calés
comme les autres sur l'origine du tableau et dessinés sur la seule zone
visible, suivent le zoom sans jamais tracer de lignes plus serrées que 6 à
9 px d'écran (sinon, au vidéoprojecteur, un écran gris) : le niveau le plus
fin paraît et s'efface en fondu, et le suivant, déjà là, prend le relais.
- **Grands carreaux (1 cm)** : une ligne par centimètre, sans renfort tant
  qu'elles sont à 18 px au moins ; plus loin, comme les petits carreaux,
  des carreaux de 5 cm, 10 cm…
- **Papier millimétré** : orangé, comme celui du commerce, en trois tons
  fixes — les millimètres fins, les 5 mm moyens, les centimètres (et au-delà)
  les plus marqués ; on trace la famille la plus fine qui fait au moins
  6 px (en fondu de 6 à 14 px) et les deux suivantes ; une ligne commune à
  deux familles n'est tracée qu'une fois, dans le ton de la plus grosse. À
  100 % (1 mm = 4 px) on voit les 5 mm et les centimètres ; les millimètres
  paraissent vers 150 %. Aucun ton ne saute d'un cran de zoom au suivant (un
  test le vérifie de 10 % à 2000 %) : chaque famille a son ton à elle, et
  son fondu se lit sur son propre écart (les centimètres, juste quand les
  5 mm s'effacent vers 30 %, sont à 12 px : leur fondu, le même avant et
  après, évite un saut que donnait « la plus fine en fondu, les autres
  pleines »).
- **Papier pointé** : un petit point (2 px d'écran) par centimètre ; plus
  serrés que 12 px (ou que ce qui ferait plus de 12 000 points sur un très
  grand écran), un point tous les 5 cm, 10 cm…, les fins s'effaçant en fondu.
  De près, c'est du papier : à 2000 %, un point tous les 800 px.
- **Réseau isométrique** : des triangles équilatéraux de 1 cm de côté (des
  horizontales tous les 1 cm × √3/2 et deux familles de droites à ±60°,
  d'un bord à l'autre de l'écran) ; sous 9 px de hauteur, des triangles de
  5 cm, 10 cm… (un sous-réseau du même réseau, rien ne saute).

Les vignettes de la trieuse et d'« Envoyer vers… », la copie en image et le
PDF (avec la case « imprimer le fond » : le motif ; sans : la feuille
blanche), la revue et le lecteur élève passent tous par le même dessin. Le
PDF seul le peint **pour le papier** et non pour un écran (depuis les
corrections « affichage » du lot 5) : ses lignes tombent sur les pixels de
l'image de la feuille (200 ppp, deux pour un px CSS), à leur place exacte à
un demi-pixel près — 1 cm et 5 mm y font 1 cm et 5 mm à 0,13 mm près (aux
pixels CSS, un écart des petits carreaux faisait parfois 4,7 mm) — et le
**papier millimétré y a ses millimètres** : à l'échelle réelle, une ligne
par millimètre (un trait fin d'un pixel de l'image, 0,13 mm, d'un orangé un
peu plus marqué qu'à l'écran), les 5 mm et les centimètres plus marqués, en
deux pixels, tous à plein ton ; une page réduite pour tenir sur la feuille
garde ses millimètres tant qu'ils y font 0,8 mm, puis n'a plus que les 5 mm
et les centimètres. Avant, la feuille était peinte avec les seuils de
l'écran (rien sous 6 px CSS : 1 mm n'en fait que 3,8 à l'échelle réelle) et
n'avait que les 5 mm et les centimètres ; ces seuils, pensés pour le
vidéoprojecteur, restent ceux de l'écran, de la revue, du lecteur, des
vignettes et de l'image copiée. Un
lecteur ou une version d'avant le lot 5 ne connaît pas ces quatre noms : il
peint alors le papier blanc, sans erreur (aucun fond n'y est vérifié à la
lecture) ; un fond qu'on ne connaît pas, venu d'une version plus récente,
est blanc de même ici.

**Cet appareil : le contraste renforcé et les noms sous les outils** (lot 5).
Tout à la fin du menu ⋯ de la barre du haut, sous le titre « Cet appareil »,
deux cases qui ne règlent que l'écran de CETTE machine, gardées dans ce
navigateur (les clés `mem-contraste` et `mem-noms-outils`) ; rien ne change
dans le classeur, ni pour les élèves. Le titre de ⋯ et son nom lu le disent
(« Enregistrer, ouvrir ou exporter en PDF ; réglages de cet appareil (Ctrl +
S, Ctrl + O, Ctrl + P) », son menu de même ; au téléphone, « Plus : la page,
les outils de cours, le classeur, cet appareil ») : depuis la vérification
« conformité » du lot 5, on y trouve le contraste du vidéoprojecteur sans
le chercher. Son nom court sous les outils reste *Fichier* : c'est là,
comme Fichier → Options d'un traitement de texte, qu'on cherche les
réglages.
- **Contraste renforcé** (« Pour le vidéoprojecteur : lignes du fond, barres
  et sélection plus marquées. Rien ne change dans le classeur. ») : pour le
  vidéoprojecteur de la classe, qui délave les couleurs claires (les
  carreaux à 28 % d'opacité, un filet gris clair, un triangle d'épaisseur 1
  ne se voient plus du fond de la salle). Coché : les lignes de tous les
  fonds plus opaques (× 1,8, au plus 0,9) et de 2 px, calées sur les pixels
  entiers, les points du papier pointé de 3 px, la marge du Seyès et les axes
  du repère plus épais — les mêmes niveaux et les mêmes fondus qu'à
  l'ordinaire, jamais un écran gris (au plus sombre, le millimétré à 30 %,
  une luminance moyenne de 224 sur 255) ; les figures et les anciens
  segments jamais affichés sous 2 px d'écran (un contour de 1 dézoomé à 50 %
  en fait 4 de large) ; les cadres de la sélection en deux tons (5 px blancs
  sous 3 px de bleu : ils se voient sur l'écriture comme sur une photo), les
  poignées, les ronds des sommets et la pastille ↻ du cadre au filet de
  2,5 px, le halo du survol plus large, le lasso, le cadre qu'on tire et le
  cercle de la gomme en 2,5 px ; dans les barres et les menus, les filets et
  les gris plus foncés, le filet des barres doublé, des icônes plus épaisses,
  l'outil en main d'un coup de surligneur plus franc, des messages plus
  foncés — sans qu'aucune taille ne change (rien ne bouge dans la mise en
  page : l'essai le vérifie au pixel près). L'écriture à main levée garde son
  trait (son contour, celui de perfect-freehand, serait à recalculer pour
  des milliers de traits à chaque cran de zoom). La revue en classe, qui
  passe au vidéoprojecteur, l'a aussi (relu à chaque ouverture). Jamais
  ailleurs : ni le document, ni le .memc, ni le film, ni le film élève, ni le
  PDF, ni l'image copiée, ni les vignettes (la trieuse ouverte en contraste
  montre celles d'un écran sans contraste) ne changent d'un octet ou d'un
  pixel (l'essai `lot5/K9-affichage.mjs` les compare) ; le lecteur des
  élèves, qui sur GitHub Pages partage pourtant le stockage du tableau, ne
  lit pas ce réglage (il n'en a pas le code). Message : « Contraste
  renforcé, sur cet appareil », ou « Contraste normal ».
- **Noms sous les outils** (« Un mot sous chaque bouton des barres ») : sous
  chaque icône de la barre des outils, de la barre du haut et de la barre
  du zoom, son nom court (11 px), comme dans la barre d'actions : *Stylo*,
  *Surligneur*, *Gomme*, *Point*, *Segment*, *Formes*, *Formule*,
  *Sélection*, *Vue*, *Doigt*, *Annuler*, *Rétablir*, *Supprimer* ;
  *Nouvelle*, *Supprimer* (la poubelle de la page, *Effacer* sur une page
  seule, comme son titre), *Fond*, *Aimant*, *Formes auto*, *Image*,
  *Instruments*, *Construire*, *Automatismes*, *Revoir*, *Publier*,
  *Fichier* (⋯) ; *Dézoomer*, *Zoomer*, *Tout voir* (depuis la vérification
  « conformité » du lot 5 : au TNI, sans survol, ⛶ n'avait aucun nom
  visible ; la barre du zoom, en bas à droite, y grandit à 54 px de haut) ;
  ni ‹, ni ›, ni le compteur, ni le pourcentage du zoom (ils se lisent
  déjà), ni le bouton du classeur. Les boutons font alors 54 px de haut
  et 52 au moins de large ; ceux de la barre des outils, tous à la largeur du
  plus large (80 px de barre au lieu de 58) ; ce qui se place à sa droite (le
  bouton du classeur, les choix des Formes et du Segment, les menus du doigt
  et de la Gomme) part de son bord droit MESURÉ (`--droite-barre-outils`,
  suivi comme `--bas-barre-haut`) ; elle défile sur un écran bas, ses boutons
  gardent leur taille (sur un écran qu'on touche, elle replie plutôt ses
  couleurs dans « Couleur » : au TNI de 1080 px, avec ses noms, c'est le
  cas, voir « La barre de gauche ») ; la barre du haut peut passer sur deux rangées (à
  1024 × 768), et un menu posé à droite de la barre des outils passe alors
  sous elle. Par défaut (« auto »), l'**écran** décide : allumés sur un écran
  qu'on touche (ou à pointeur grossier) dont la plus petite dimension fait au
  moins 900 px — un TNI, une grande tablette comme l'iPad Pro 12,9 pouces —,
  éteints au poste de la classe (souris et tablette graphique : l'infobulle
  y existe, et à 768 px de haut les noms feraient défiler la barre des
  outils), sur un iPad de 11 pouces (820 px de côté : en paysage, la barre
  défilerait) et au téléphone. L'écran, et non la fenêtre : la décision ne
  change pas quand on tourne la tablette. Dès qu'on coche ou décoche, le
  choix est retenu et l'écran ne décide plus. La mise en page du téléphone
  (une fenêtre de 640 px de large au plus, ou basse sous le doigt) les
  éteint toujours, l'entrée y est grisée (« … (pas sur un téléphone : la
  place manque) »), et ils reviennent en la quittant. Message : « Noms sous
  les outils » ; décochés, « Outils sans noms (leur nom paraît au survol) » à
  la souris et au stylet d'une tablette graphique, qui survolent,
  « Outils sans noms » au doigt et au stylet posé sur l'écran (le TNI,
  l'iPad), qui ne survolent pas. Le mot est écrit par la feuille de style
  (`data-libelle`) : le texte des boutons reste vide et leur nom lu, leur
  titre, ne changent pas.

**Le téléphone** (lot 5). Sur une fenêtre de 640 px de large au plus, ou
basse (500 px de haut au plus) sous le doigt — un téléphone, en portrait
comme couché —, la mise en page change (`TELEPHONE`, `src/navigateur.ts`, une
seule requête, que reprend la feuille de style ; `body.telephone`) ; rien
n'y sort de l'écran (essayé de 320 × 568 à 932 × 430), tout bouton y fait au
moins 44 × 44 px — ceux des fenêtres et de la bibliothèque aussi, depuis la
vérification « conformité » du lot 5 (*Annuler*, *Exporter*, *Mettre à
jour*, les raccourcis de l'éditeur de formule, les cases et les choix d'une
fenêtre, le tri, *Créer un dossier de classe*, *Plus tard*, les couleurs
d'un dossier : ils faisaient 38 à 43 px) —, et l'essentiel reste sous le
pouce :
- **La barre du haut sur une rangée** : le bouton du classeur (son icône et
  le point, en tête de la barre), ‹, le compteur (sans le nom de la page),
  ›, *Nouvelle page* (+ ; sous 360 px de large, elle passe dans *Plus*, et ›
  sur la dernière page en ajoute une) et ⋯, qui devient **Plus** (« Plus :
  la page, les outils de cours, le classeur »). Le reste de la barre (la
  poubelle de la page, le fond, l'aimant, les formes auto, l'image, les
  instruments, construire, les automatismes, revoir, publier) est dans
  *Plus*, qui commence par trois sections : **Page** (*Supprimer la page* —
  *Effacer la page* sur une page seule —, *Fond…*, qui ouvre le menu des
  fonds en vignettes, sur deux colonnes en portrait ; *Aimanter au
  quadrillage* et *Le stylo redresse les figures*, deux cases), **Outils de
  cours** (*Importer une image ou un PDF…*, *Instruments…* — leur liste, centrée sous
  la barre du haut —, *Programme de construction*, *Automatismes*, *Revoir
  la construction*, *Publier le replay*), **Vue** (*100 %*, *Tout voir*) ;
  puis, comme ailleurs, le bloc du classeur et ses entrées, et « Cet
  appareil ». Chaque entrée fait 44 px de haut au moins ; le menu s'ouvre
  sous son bouton et défile s'il dépasse la hauteur qu'on voit.
- **La barre des outils** : en bas, sur toute la largeur, en portrait (à
  12 px des bords, 4 sous 360 px de large : 7 × 44 = 308 px tiennent dans
  320) ; à gauche, en colonne, couché. Sept boutons : *Stylo*, *Gomme*,
  *Sélection*, **Couleur** (un rond de la couleur en main, « Couleur et
  épaisseur » : son menu a les quatre pastilles et les trois tailles, 44 ×
  44 chacune), *Annuler*, *Rétablir*, **Autres outils** (ses points ; quand
  on tient l'un de ces outils, il prend son icône et le coup de surligneur :
  sa grille de 60 × 56 a *Surligneur*, *Point*, *Segment*, *Formes*,
  *Formule*, *Vue*, *Doigt* — sur un appareil tactile : il ouvre le menu du
  doigt — et *Supprimer* la sélection). Un outil s'atteint en deux touchers
  au plus ; un type de forme ou de segment en trois (*Autres outils*,
  *Formes*, *Rectangle*) : leurs choix paraissent juste au-dessus de la
  barre du bas (à sa droite, couché), sans jamais sortir de l'écran. Le menu
  de la Gomme s'ouvre toujours en la retouchant ; ces petits menus se posent
  au-dessus de leur bouton (à droite de la barre, couché), entre les deux
  barres, sans couvrir ni l'une ni l'autre (sur 320 px de haut, celui de la
  Gomme défile).
- **Le zoom** : la barre du zoom est cachée (le pincement zoome ; *100 %* et
  *Tout voir* sont dans *Plus*). *Tout voir* cadre ce qu'on voit entre la
  barre du haut et celle du bas (`zoneEntreBarres` lit la barre des outils
  posée en bas comme celle du bas), et la pastille ↻ du cadre de taille y
  reste.
- **Ce qui flotte** ne couvre jamais les barres : la barre d'actions reste
  au-dessus de la barre du bas (`placeBarre`, son bord `bas`) et, couché, à
  droite de la barre des outils ; le menu complet aussi (`positionPanneau`,
  de même), sur toute la largeur en portrait, défilant s'il est plus haut
  que la place ; « Revenir au contenu » et le message se posent au-dessus
  de la barre du bas (`--haut-barre-bas`, mesuré comme `--bas-barre-haut`),
  couché, centrés sur ce qu'on voit du tableau ; le message ne couvre pas
  non plus ce qui est pris (son cadre, sa pastille, sa barre d'actions, son
  menu) : il passe alors sous la barre du haut, ou, s'il n'y a pas la place,
  dans une bande libre, plus étroit (`UI.placerToast` ; depuis les
  retouches après le lot 5, au poste de la classe aussi, où il ne contourne
  que la barre d'actions, le menu complet et la pastille, et peut passer sur
  l'objet) ; le bandeau de la sauvegarde reste sous la barre du haut.
- **On tourne le téléphone** : rien n'est perdu (les formes, la sélection,
  l'outil, la page, la couleur) ; la barre des outils passe de bas à gauche,
  et les petits menus ouverts se ferment, comme sur la tablette.
- **L'éditeur de formule** y est plus haut (ses raccourcis sur deux
  rangées) : il remonte pour que *Annuler* et *Placer* restent dans l'écran
  (à 320 × 568 et couché, ils sortaient par le bas jusqu'à la vérification
  « conformité » du lot 5), et défile sur un écran plus bas que lui
  (568 × 320).
Au poste de la classe (souris, tablette graphique), au TNI et sur l'iPad
(1180 × 820, 820 × 1180), rien de tout cela : les barres y sont, au
demi-pixel près, celles d'avant (l'essai `lot5/K10-telephone.mjs` les
compare à leur relevé de référence). Les deux boutons du téléphone sont au
bout de la barre des outils dans le document (cachés ailleurs) : l'ordre du
poste de la classe ne change pas, la feuille de style les range.

**Se déplacer, zoomer.** La molette de la souris fait défiler la page (Maj :
à l'horizontale) ; au pavé tactile, deux doigts qui glissent déplacent le
tableau. Ctrl (⌘ sur Mac) + molette, ou pincer le pavé, zoome autour du
pointeur, d'un cran à la fois (×1,1 par cran au plus : une molette libre ne
s'emballe pas). Qui préfère la molette qui zoome, comme dans GeoGebra, le règle
dans le menu du pourcentage (en bas à droite) : « Molette de la souris : fait
défiler / zoome », gardé sur cet ordinateur. Ce menu donne aussi **100 %**
(Ctrl + 0), **Tout voir** (Maj + 1, ou le bouton cadre à côté de « + » : toute
la page entre les barres, jamais au-delà de 100 %) et **Voir la sélection**
(Maj + 2, 200 % au plus) ; au téléphone, où la barre du zoom est cachée (lot
5), le pincement zoome, et *Plus* a *100 %* et *Tout voir* ; Ctrl + « + » et Ctrl + « − » zooment le tableau (au
clavier principal ou au pavé numérique, en AZERTY comme en QWERTY), autour du
pointeur, et non plus toute la page du navigateur. Sans sélection, les flèches
déplacent la vue d'un quart d'écran (trois quarts avec Maj, en continu si on
tient la touche). Quand plus rien de ce qui est écrit n'est à l'écran, une
pastille **Revenir au contenu** paraît en bas au centre. F5 (que les
télécommandes de présentation envoient) ne recharge plus la page en plein cours :
un message rappelle Ctrl + R. Le pincement sur iPad ne zoome plus la page
entière, et le balayage à deux doigts ne fait plus « page précédente ». Chaque
page garde l'endroit où l'on était, où l'on revient toujours à 100 % (voir
« Les réglages par défaut » ; une nouvelle page s'ouvre à 100 %, sur
l'origine ; une page jamais regardée, sur le début de son contenu) ; la page
courante et le centre de chaque page sont retrouvés au rechargement, à 100 % —
notés dans ce navigateur, hors du document : ni un fichier, ni un replay ne
les emportent.

**La vignette de l'énoncé.** L'énoncé (une image) reste à sa place en haut
de la page et la correction descend dessous. Quand on fait défiler le
tableau et que l'énoncé sort de l'écran par le haut (il en reste moins du
quart), une vignette de l'énoncé paraît en haut à droite, avec ce qui est
écrit dessus : plus besoin de remonter, ni de recoller l'image plus bas. Un
clic (souris, stylet, doigt) l'agrandit pour la lire, un autre la réduit ;
la croix la cache jusqu'à ce que l'énoncé revienne à l'écran. Quand la page
a plusieurs exercices, c'est le plus proche au-dessus qui se montre, et la
vignette part dès que l'image de l'exercice suivant est à l'écran (au moins
à moitié). Ce n'est que de l'affichage : rien ne change dans le classeur,
le PDF ni le replay (`src/enonce.ts`, tests/enonce.test.ts).

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
(une fenêtre de 910 px de large ou moins, où la barre tient juste sur une
rangée ; c'était le cas en 1024 × 768 avant que le lot 5 ne remplace la
liste déroulante des fonds par un bouton), le nom s'écrit plus petit dans la
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
ajoute une page blanche juste après (quel que soit le fond de la page qu'on
quitte ; avant les retouches d'après le lot 5, elle en prenait le fond),
ouverte à 100 % sur l'origine, comme le grand +. Le second clic d'un double-clic sur ›, ou un clic moins de
600 ms après un changement de page, n'en crée pas : le double-clic qui arrive
sur la dernière page n'en ajoute pas une de plus. Page↓, lui, ne crée jamais
de page (une télécommande n'en fabrique pas) : sur la dernière, un message le
dit, « Dernière page : le bouton Page suivante en ajoute une. » (au plus une
fois toutes les 5 s). À chaque changement de page, le numéro (et le nom)
s'affiche en grand un peu plus d'une seconde, en haut au centre de ce qu'on
voit du tableau, jamais au milieu, là où l'on écrit en arrivant ; le stylet
écrit à travers, et le premier appui sur le tableau l'efface. Ni au
démarrage, ni sous la revue ou la trieuse des
pages ; sans fondu sous « animations réduites ».

**Dupliquer la page** (le menu de la page, au clic droit dans le vide ou au
bouton du stylet ; Ctrl + Maj + D, ⌘ + Maj + D sur Mac) : une copie juste
après l'original, avec les mêmes objets, le même fond, le même nom suivi de
« (copie) », et toute son histoire (Revoir la montre se construire, voir
« Revoir la construction ») ; on arrive dessus, au même endroit que sur
l'original, à 100 % (comme sur toute page où l'on arrive), et un message
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
rien, il passe à l'outil Sélection, et un second Échap rend l'outil d'avant :
celui qu'on a quitté pour la Sélection, de quelque façon qu'on y soit venu
(Échap, V, son bouton, Ctrl + A, *Détacher* une image du fond) ; avant le
contrôle final du lot 5, seul Échap le retenait, et après V, Échap rendait
l'outil quitté par un Échap plus ancien (la Formule, dont le clic suivant
ouvrait « Nouvelle formule » au lieu d'écrire).
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
suit sa forme, avant le clic (une image, son seul tour : la repeindre
par-dessus cacherait ce qu'on a écrit sur elle) ; une droite ou une demi-droite sélectionnée se
surligne sur toute sa longueur visible ; les flèches poussent la sélection
d'1 mm (1 cm avec Maj), sauf quand son menu complet est ouvert : elles vont
alors dans le menu (voir « Au clavier »). Seules : avec Ctrl, ⌘ ou Alt,
elles ne poussent plus rien (lot 5). Ctrl + ↑ / ↓ avancent et reculent la
sélection, avec Maj premier plan et arrière-plan (⌘ sur Mac ; voir
« L'ordre »), une fois par appui, même le menu complet ouvert ; Maj + L
verrouille la sélection, ou la déverrouille son menu court ouvert (voir
« Verrouiller et fixer en fond » ; sans sélection, L reste le Segment) ;
Ctrl + G groupe la sélection, Ctrl + Maj + G la dégroupe (⌘ sur Mac ; voir
« Grouper »), toujours empêchés : la recherche du navigateur ne s'ouvre
plus ; Maj, tenue en tirant un coin du cadre de taille d'une image, la
déforme, et tenue en tournant la pastille ↻, tourne par pas de 15° (voir
« Changer de taille, tourner ») ; Échap abandonne le geste en cours du
cadre (tout revient) ; pas [ et ]
comme tldraw : en AZERTY, ils demandent AltGr, que Windows envoie comme
Ctrl + Alt. ⌘ + ← (Mac) et Alt + ← (Windows) reviennent à la page
précédente du navigateur, Alt + → à la suivante : hors d'un champ de saisie
et d'une fenêtre, avec ou sans sélection, elles ne font plus rien, comme
Ctrl + ← / → (qui poussaient l'objet), et l'on ne quitte plus le tableau en
plein cours. Ces touches, et Ctrl + G, Ctrl + Maj + G (⌘ sur Mac), sont
empêchées de même dans la revue en classe, la trieuse des pages, la
bibliothèque des classeurs (depuis la
vérification « appareils » du lot 5 : la revue, qui arrête en capture ce
qu'elle reçoit, laissait Alt + ← quitter MEM pendant qu'on avançait au
clavier) : une seule garde, posée au démarrage (`toucheQuitteLaPage`,
`installerGardes` dans `src/navigateur.ts`), avec les mêmes exceptions
qu'à l’écran ; chaque écran garde ce qu'il fait de la touche (la trieuse
déplace une page par Ctrl + Maj + ← / →).

**La gomme** efface en entier ce qu'elle touche (un trait, une figure, une
image, une formule), sauf ce qui est verrouillé ou fixé en fond (lot 5 : on
gomme l'écriture posée sur un énoncé fixé sans toucher à l'énoncé). C'est
son réglage de toujours, et son défaut (le choix du professeur). Un coup de
gomme, même lent et passant sur plusieurs traits, s'annule d'un seul Ctrl+Z
(le replay, lui, les montre partir l'un après l'autre). Le bout gomme du
stylet (le stylet retourné, sur une tablette graphique ou une Surface) efface
de même quel que soit l'outil en main, qu'on retrouve en reprenant la pointe.

**La gomme qui efface seulement là où elle passe** (lot 5). Le menu de la
Gomme s'ouvre en retouchant la Gomme quand elle est déjà en main (d'un clic
ou d'un toucher), par un clic droit sur son bouton (le bouton du stylet en
est un), par un appui long du doigt dessus, et par E quand elle est déjà en
main (le focus va alors sur l'entrée cochée), comme dans Apple Notes,
GoodNotes et OneNote ; à droite de la barre des outils, à la hauteur de la
Gomme (au téléphone, au-dessus d'elle en portrait, entre les deux barres).
Il propose **Effacer le trait entier** (« Ce qu'elle
touche part en entier : un trait, une figure, une formule (jamais une
image) ») et
**Effacer seulement là où elle passe** (« Coupe l'écriture et le
surligneur ; les figures, les images et les formules restent »), puis sa
**Taille (là où elle passe)** : Petite, Moyenne (le défaut), Grande, soit 6,
14 et 30 pixels d'écran de rayon (à tout zoom, elle couvre autant de
l'écran ; grisées au trait entier, qui garde ses 12 px). Choisir un mode
prend aussi la Gomme, et le dit : « La gomme efface seulement là où elle
passe. », « La gomme efface le trait entier. ». Le titre du bouton dit le
mode (« Gomme (E) — seulement là où elle passe ; retapez pour ses
options »), et le bouton porte alors la marque ◐, comme celui du doigt. Le
mode et la taille sont gardés sur l'appareil (`mem-gomme`,
`mem-gomme-taille`), hors du document ; le bout gomme du stylet suit le mode
choisi. Ce qu'elle coupe : les traits à main levée, au stylo et au
surligneur ; ce qui reste demeure en un, deux morceaux ou davantage, qui sont
des traits comme les autres (leur couleur, leur épaisseur, leur opacité, la
pression de chaque point, leur place dans l'ordre, leur groupe) ; une miette
part avec ce qui est effacé. Elle efface l'encre et non la ligne médiane (la
demi-épaisseur du trait compte), et tout le chemin parcouru entre deux
mouvements, même rapides : une gomme vive ne saute rien. Ce qui reste garde
ses points d'origine, tels quels (seul un point s'ajoute là où le trait
franchit le bord de la gomme) : un morceau se voit comme la partie du trait
qu'il était. Elle ne touche ni les figures, ni les images, ni les formules,
et la première fois de la session qu'elle passe sur l'une d'elles, elle le
dit : « Cette gomme ne coupe que l'écriture : pour une figure ou une
formule, prenez « Effacer le trait entier » (retapez la Gomme). Une image
s'enlève par Supprimer. ». C'est
un choix propre à MEM (l'étude proposait qu'elle efface une figure en
entier) : une gomme partielle passe surtout sur l'écriture autour d'une
figure, et le professeur ne doit pas perdre le triangle qu'il annote ; le
trait entier, lui, efface tout le reste. Aucune gomme n'efface une image :
on écrit dessus, et la gomme ne doit y enlever que l'écriture ; une image
s'enlève par Supprimer (le souhait du professeur, après le lot 10). Ce qui est verrouillé ou fixé en fond reste,
comme sous l'autre gomme. Un coup est une étape d'annulation (Ctrl+Z rend
tous les traits entiers d'un coup) ; le film garde une étape par trait
touché, notée `coupe`, écrite quand la gomme a quitté le trait (et ce qui
reste au lever, ou quand un second doigt ou le navigateur interrompt le coup :
ce qu'on a vu effacé le reste) : jamais une par mouvement, qui ferait
grossir le classeur de centaines de Ko par coup. Pendant le coup, rien ne
s'écrit : l'encre disparaît sous la gomme, et la scène ne se repeint que
dans son **rectangle sale** (là où la gomme est passée, et chaque morceau
neuf, que perfect-freehand lisse depuis son nouveau bout), coupé aux
pixels entiers du canevas : sur une page de 2000 mots, moins d'une
milliseconde par mouvement au lieu d'une peinture entière (42 ms sur un poste
sans carte graphique : la gomme ne suivrait plus la plume de la Wacom). Une
coupe qui s'écrit en plein coup ne repeint rien (la scène la montre déjà) ;
le lever repeint toute la scène. Un **long trait** d'un seul geste (une
spirale, des hachures, une écriture liée : plus de 150 points), ou un
morceau grand à l'écran (plus de 200 px), ne se repeint pendant le coup
qu'aux bouts que la gomme vient de changer, et ne se redessine dans le
rectangle sale que par fenêtres de ses points, sans recalculer son contour
entier à chaque mouvement (`src/gomme.ts` : `boutsDe`, `fenetresDe`,
`passePres`) ; son contour exact se peint quand la gomme le quitte, et au
lever. Repeindre à chaque mouvement toute la spirale et recalculer son
contour faisait traîner la gomme derrière la plume sur un poste lent (la
vérification du lot 5 : sur une spirale de 5000 points, processeur ralenti
quatre fois, la peinture du rectangle sale passe de 10 ms en moyenne, 36 au
95e centile, à 6 et 13 ; son aire, de 6 % de l'écran à 1 %).

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
puis → aussitôt, Ctrl+Z ne défait que la poussée. Pendant le réglage d'un
flash d'automatismes (une fenêtre), aucune touche ne change le tableau (ni
Ctrl+Z, ni Suppr, ni les flèches). Pendant qu'on glisse un objet, qu'on écrit, qu'on
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
dit « La page est déjà vide. ». Ce qui est verrouillé ou fixé en fond reste
(lot 5 : c'est pour cela qu'on l'a protégé), et le message le dit : « Page
effacée (ce qui est verrouillé ou fixé en fond reste) », toujours avec
*Annuler* ; s'il ne reste que cela, « Rien à effacer : ce qui reste est
verrouillé ou fixé en fond (menu de la page pour le détacher). ». Une page
supprimée parmi d'autres part entière, dans la corbeille, avec ce qu'elle a
de verrouillé.

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
page et se prend (ni le verrouillé ni le fixé en fond, lot 5) et passe à l'outil Sélection (Échap vide la sélection, un second Échap
rend l'outil d'avant) ; ⌘ sur Mac. Ce sont les lettres écrites sur les
touches, en AZERTY comme en QWERTY, et AltGr n'en fait pas un raccourci. Rien
de tout cela dans un champ de saisie (une formule qu'on tape, les noms des
sommets : on y copie du texte ; Ctrl+D n'y ouvre pas non plus le marque-page
du navigateur, il ne fait rien), pendant la revue,
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
la version hors ligne par le presse-papiers du système, images comprises (leurs
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
(carreaux, Seyès, millimétré, pointé, repère…) y est ou non : le bouton « Sans le fond » (ou
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
nouvelle page à la fin* (blanches, comme toute page neuve, et sur le centre
de la page qu'on regarde, à 100 %). Un
clic, un toucher ou Entrée sur une destination envoie et ferme ; au clavier,
Tab va des deux choix à la liste puis à *Annuler*, les flèches (Début, Fin)
parcourent la liste, Échap ferme ; sur un téléphone, elle prend toute la
largeur et la liste défile. On reste sur la page, et un message le dit :
« 3 objets envoyés vers la page 5 » (« 3 objets copiés sur la page 5 »), avec
**Aller à la page 5** (ce qui y est arrivé devient la sélection ; la vue s'y
porte si on ne le voit pas, à 100 % comme sur toute page où l'on arrive, sur
son début s'il ne tient pas ; le message garde son *Annuler*) et **Annuler**.
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

Sur un téléphone (lot 5, K10, voir « Le téléphone »), le menu complet prend
toute la largeur de l'écran en portrait, entre la barre du haut et celle du
bas, et passe à la ligne ; couché, il se pose à droite de la barre des outils
et passe à la ligne s'il est plus large que la place ; il ne couvre jamais les
barres, et défile s'il est plus haut que la place (avant le lot 5, il
couvrait le haut de la barre d'outils plutôt que de sortir de l'écran). Ses
boutons y font 44 × 44 px au moins.

**La barre de gauche** ne bouge pas : la poubelle y garde sa place, grisée
quand rien n'est choisi, comme ↶ et ↷ quand il n'y a rien à faire. Sur un écran bas (moins de 900 px de haut environ),
ses boutons gardent leurs 44 px et elle défile, avec une fine barre de
défilement ; les choix des Formes et du Segment suivent leur bouton.
**Sur un écran qu'on touche** (l'iPad, une tablette, le TNI, un portable à
écran tactile : là où le doigt a son bouton), depuis le contrôle final du
lot 5, les quatre pastilles de couleur et les trois tailles du trait font
44 × 44 (au poste de la classe, 44 × 34 et 44 × 30, à la souris et à la
tablette graphique) ; et quand la barre ne tient plus dans la hauteur de
l'écran (le TNI de 1080 px avec ses noms, l'iPad couché, un portable de
768 px), elles se **replient dans « Couleur »**, le bouton du téléphone (un
rond de la couleur en main, « Couleur » dessous avec les noms), posé à leur
place entre les deux filets : son menu, à droite de la barre, à la hauteur
du bouton, a les quatre pastilles et les trois tailles en 44 × 44 (au
clavier, Entrée l'ouvre sur la couleur cochée, Échap le referme). La barre
ne défile plus : Annuler, Rétablir et la poubelle restent dans l'écran (avant,
au TNI comme sur l'iPad couché, les derniers en sortaient, ou l'auraient fait
avec des pastilles plus hautes). C'est mesuré, la barre dépliée : sur l'iPad
debout, l'iPad Pro debout, le TNI sans les noms, elle tient, et les
pastilles restent dans la barre, à un toucher ; tourner la tablette replie
ou déplie (un menu « Couleur » ouvert se ferme alors). Au poste de la
classe, rien ne change : la barre garde ses couleurs à un clic et défile
sur un écran bas, comme depuis le lot 1 (voir les limites). Au
téléphone (lot 5), elle n'a que sept boutons, en bas ou à gauche : la
poubelle de la sélection y est dans *Autres outils* (*Supprimer*, grisée de
même), et dans la barre d'actions (voir « Le téléphone »).
Les **messages** en bas de l'écran passent sous les panneaux et les menus (ils
ne cachent jamais ce qu'on va toucher), sauf pendant la revue, le programme de construction et un placement (la consigne de
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
seulement ; sa marque dit le choix ; au téléphone, *Autres outils* → *Doigt*) :

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
| `src/types.ts` | Les formes (trait, segment, formule, polygone, cercle, image), les fonds (huit depuis le lot 5, dans l'ordre des menus : `FONDS`), le fond de toute page qui naît vide (`FOND_NEUF`, la page blanche : retouches après le lot 5) ; depuis le lot 5, des champs facultatifs, ignorés par la version d'avant : `verrou` (l'objet ne bouge plus et ne se prend plus), `fixe` (une image fixée en fond), `groupe` (les formes d'une page qui portent le même identifiant se prennent ensemble), la `rotation` d'une formule (radians, sens de `ctx.rotate`, autour de son coin) ; `libre` (ni verrouillé ni fixé) ; depuis le lot 12, le `texte` et la `largeur` d'un texte tapé au clavier (des champs facultatifs d'une formule) |
| `src/nuit.ts` | Le mode nuit d'une page (lot 13) : le papier de nuit, les couleurs telles qu'elles s'affichent de nuit (`nocturne`, `formeDeNuit`, `formulesDeNuit`) ; voir « Le mode nuit d'une page » |
| `src/texte.ts` | Le texte tapé au clavier (lot 12) : son modèle, pur (lignes, morceaux, `$…$`, sa version KaTeX, sa lecture prudente, à plat) et son rendu HTML, le même à l'écran et dans les sorties (voir « Taper du texte au clavier ») |
| `src/texte-editeur.ts` | L'éditeur d'un texte, posé sur la page pendant qu'on tape, sa petite barre, sa relecture en lignes du modèle (lot 12) |
| `src/document.ts` | Document Yjs : pages (jetées et rendues sans rien recopier), formes, annulation (une pile par page, et des marques pour une page jetée ou une copie toute neuve, en mémoire), film, enregistrement dans le navigateur (et remplacement par un fichier ouvert ; la base supprimée ou changée ailleurs, coupée net (`onCoupee`) ; une écriture refusée repérée, le trou (`trou`, `erreurBase`), et sa réparation (`reparer`) ; une base trouée relue, dont une partie ne se relit plus (`incomplet`) ; attendre la fin des écritures (`attendreEcritures`) ; l'identité du classeur rangée à côté du document). Aussi la corbeille des pages et leurs noms (deux cartes hors des pages, `corbeille` et `nomsPages` : ni étape du film, ni annulation), la copie d'une page avec son histoire (mêmes identifiants de formes, `herite: { de }` ; rien du film n'est recopié ; sa naissance notée `naissance` dans le film, comme celle d'une page vide ; un fond changé dans la trieuse noté `rangement` : ni l'une ni l'autre ne comptent dans le découpage en séances) et le déplacement des pages (le plus petit changement de l'ordre). Changer des formes : `modifier` fond un patch (une clé qui y vaut undefined quitte la forme : déverrouiller, dégrouper), `remplacer` écrit des formes entières (une clé absente n'existe plus : une rotation revenue à zéro) ; l'un et l'autre en une étape, et la note `reglage` (lot 5 : verrouiller, grouper, rien de visible) sur l'étape du film de cette transaction seulement ; elle suit aussi l'étape de la pile (méta `reglage`) : Ctrl + Z et Ctrl + Y d'un réglage sont notés de même. `couperTraits` (lot 5) écrit la coupe d'un trait par la gomme qui efface là où elle passe : le morceau qui garde l'identifiant remplace le trait, entier, les autres sont posés, en une transaction notée `coupe`. Envoyer des objets vers une autre page : l'arrivée (dans aucune pile), puis le retrait (une étape de la pile de départ, avec sa méta `envoi`, recopiée d'une pile à l'autre ; elle ne se défait pas tant que la pile de l'arrivée peut y ramener des objets qui en sont repartis, et ne se refait pas vers une page supprimée définitivement) ; la copie, une étape de la pile d'arrivée ; les noms que la pile d'une page peut y ramener (`formesQuiPeuventRevenir`) |
| `src/app.ts` | Gestes au stylet, au doigt et à la souris ; les outils (`choisirOutil` retient l'outil quitté pour la Sélection, `outilAvant`, que rend Échap : contrôle final du lot 5) ; les réglages du départ (retouches après le lot 5 : le trait fin, `taille` ; une page neuve blanche, `nouvellePage`, `envoyerSelection` ; la vue d'une page où l'on arrive toujours à 100 %, au centre gardé ou sur le début de son contenu, `appliquerVue`) ; le clavier du tableau (Ctrl + P ouvre « Exporter en PDF » ; Ctrl + ↑ / ↓ l'ordre ; Maj + L le verrou ; ⌘ + ←, Alt + ← ne quittent plus la page ; E, la Gomme en main, ouvre son menu) ; la gomme (au trait entier, `gommer` ; seulement là où elle passe, lot 5 : `gommerLa`, le coup en mémoire, `Coupe`, chaque trait écrit quand la gomme l'a quitté, `ecrireCoupe`, et le reste au lever ; le rectangle sale qu'elle demande au rendu ; une coupe écrite en plein coup ne repeint pas la scène) ; l'ordre de ce qui est choisi (`ordonner`, `peutOrdonner`) ; ce qui se prend (lot 5 : `cibleSous` saute le verrouillé et le fixé en fond, sauf `verrouilles` pour le clic droit et l'appui long ; la gomme, le cadre et le lasso, Ctrl + A, Suppr, les flèches et le glisser aussi) ; verrouiller (tout le groupe de chacun), fixer en fond, détacher (`verrouiller`, `fixerEnFond`, `detacherDuFond`, `fixesSous`, `copierFond`), le cadenas (au survol, après un appui), le collage qui ne sélectionne que le libre ; les groupes (`membres`, `grouper`, `degrouper`, Ctrl + G et Ctrl + Maj + G ; ce que prennent un clic, un toucher, un cadre, un lasso, le clic droit, le double-clic : `prendre`, `ouvrirAuDouble`) ; changer de taille et tourner (lot 5 : `transformerSelection`, une transaction par `Tableau.remplacer`, les points repérés sur une image avec elle ; « Remettre droit », `redresserSelection`, `redressable` ; retouches après le lot 5 : les quarts de tour du menu ⋯, `tournable`, `tournerQuart`, autour du centre de la pastille, `calculerCadre`) ; l'image importée (`importerImage` : à l'outil Sélection, l'outil quitté retenu, le message dans les mots du pointeur du bouton Image, de Ctrl+V ou du dernier vu ; retouches après le lot 5) ; le cadre de taille et la pastille ↻ à l'écran (lot 5 : `cadreDeLaSelection`, d'après le dernier pointeur vu, `pointeurPoignees`, gardé tant que la sélection (`SelectionSuivie`, un ensemble qui compte ses changements), la page, la vue, la zone libre, le pointeur et la taille des formules prises n'ont pas changé ; `poigneeVisee` dans l'appui, après les instruments et avant les sommets, avec le cadre tel qu'il était peint, `Rendu.cadre`, pour un autre pointeur peut-être : sa pastille se prend là où on la voit ; les gestes 'taille' et 'tourner', l'aperçu par `Rendu.transfo`, le lâcher par `transformerSelection` ; le curseur au survol ; `emprise` et `pastilleAEviter`, que la barre d'actions et le menu complet contournent) ; la boîte d'une formule pour geometrie.ts (locale) et pour cadrer (`boiteVue`, l'englobante) ; le calme (`calme`, `depuisLeDernierGeste`), qu'attendent les écritures automatiques |
| `src/verrou.ts` | Verrouiller et fixer en fond (lot 5), pur (testé) : ce que changent Verrouiller, Fixer en fond (sous tout, hors de tout groupe) et Détacher (l'invariant du fond : toute image fixée sous toute image libre, même avec plusieurs images fixées), ce qui bouge quand on pousse (le libre, et les points repérés sur une image qui bouge, même verrouillés : `quiBouge`), les images fixées sous un point, ce que dit un collage qui a posé de quoi ne pas se prendre (`texteCollage`), compter les objets |
| `src/groupes.ts` | Les groupes (lot 5), pur (testé) : les membres d'une forme (le même groupe et le même état, libres ou verrouillés ; au moins deux ; une image fixée n'en a pas : `membresDe`), chaque identifiant étendu à son groupe (`avecGroupes`), tous les porteurs d'un groupe pour Verrouiller (`porteurs`), ce qu'écrivent Grouper (des groupes fondus en un) et Dégrouper, la sélection qui est exactement un groupe (`groupeExact`) ou un membre pris seul (`membreSeul`), ce que prend un clic (`priseDuClic`), les groupes que le rendu encadre (`groupesTouches`) |
| `src/rendu.ts` | Les trois couches d'affichage ; les formes peintes dans l'ordre d'affichage (triées seulement s'il le faut, une fois par tableau donné), les formules HTML rangées par leur rang dans l'ordre des z ; le cadenas d'un objet verrouillé (lot 5 : `cadenas`, sur la couche directe, à taille d'écran constante ; ce qui est sélectionné et verrouillé a son cadre gris, sans poignées) ; le survol de tout un groupe (`survolAussi`), le cadre plein d'un groupe pris, le pointillé clair d'un membre pris seul ; la formule tournée (lot 5 : `rotate()` en CSS autour de son coin, sans repasser par KaTeX ; son halo et son cadre en tirets tournés ; `boiteFormule` sa boîte locale, `boite` son englobante) ; la clé du cache des tracés, qui voit un trait fermé tourné (ses nombres comparés tels quels, sans en faire une chaîne à chaque image) ; les cadres en tirets de tout ce qui est pris, en un seul chemin tracé une fois (deux en contraste renforcé), comme avant le lot 5 ; le cadre de taille et la pastille ↻ (lot 5 : `cadre`, que seule l'App pose par `avantDirect` ; ses coins, les barrettes des côtés d'une image, la pastille des instruments au bout de son filet) et ce qui change de taille ou tourne avant le lâcher (`transfo` : un trait et une image sous la matrice, une figure par `transformerForme`, une formule par un transform CSS) ; la gomme qui efface là où elle passe (lot 5 : `coupe`, les traits cachés et leurs morceaux du moment peints à leur place ; `repeindreZone`, le rectangle sale aux pixels entiers du canevas, où seules les formes qui le touchent se repeignent, sur leur fond ; un long morceau, par fenêtres de ses points, `dessinerPres` ; `derniereScene`, la durée de la dernière peinture, pour les essais) ; peindre une page sur un autre canevas (`peindreSur` : une vignette en esquisse, une image, une feuille du PDF), sans rien changer à l'écran ; le contraste renforcé (lot 5 : `contraste`, que posent seuls le tableau et la revue : le fond plus marqué, les figures jamais sous 2 px d'écran, les cadres de la sélection en deux tons, les poignées au filet de 2,5 px ; `peindreSur` l'éteint le temps de l'appel) |
| `src/ordre.ts` | L'ordre d'affichage (lot 5) : les calques (`couche` : images fixées, images, tracés et figures, formules), le tri stable par calque puis par z (`ordreDAffichage`, `enOrdreDAffichage`) ; les rangs neufs de premier plan, avancer (devant la voisine qui chevauche), reculer, arrière-plan, dans le calque de l'objet, jamais une image sous une image fixée, les verrouillées à leur place, et le repli local quand l'écart entre deux voisins s'épuise (`nouveauxRangs`) ; l'aide que le menu donne à ces commandes, d'après le calque de ce qui est pris (`aidesOrdre`). Pur, sans DOM |
| `src/gomme.ts` | La gomme qui efface seulement là où elle passe (lot 5), le calcul pur (testé) : la part d'un côté du trait dans la capsule que la gomme a balayée entre deux mouvements (`traverse`), la coupe d'un trait (`couperTrait` : null s'il n'est pas touché, [] s'il part en entier, sinon ses morceaux, les points d'origine gardés, un point neuf au bord, les miettes jetées, le plus long sous l'identifiant du trait ; les points et les côtés loin de la gomme écartés d'un coup d'œil par la boîte de la capsule), le plus long des morceaux (`lePlusLong`) ; les longs traits pendant le coup (vérification des régressions du lot 5 : `LONG_MORCEAU`, `GRAND_MORCEAU`, `BORD`, `boutsDe` les bouts qu'une coupe a changés, `fenetresDe` les fenêtres de points à redessiner près du rectangle sale, `passePres` l'encre d'un trait passe-t-elle près d'une boîte). Sans DOM |
| `src/cadre.ts` | Changer de taille et tourner (lot 5), le calcul pur : les matrices (`echelle`, `rotation`, `composer`, `inverser`), ce qu'une transformation fait à chaque forme (`transformerForme` : tout cuit dans les coordonnées, l'épaisseur d'un trait avec lui, au moins 1, celle d'une figure gardée, la rotation d'une formule dans son champ), les bornes (`bornesEchelle`, `dansLesBornes` : celles de la liste blanche du presse-papiers, une formule entre 6 et 1000, une image d'au moins 4 unités de côté), les aimants (`aimanterAngle` : 45° sauf 0 à ±3°, Maj tous les 15° ; `aimanterEchelle`), « Remettre droit » (`redresser`), le cadre et ses poignées (`cadreDe` : orienté pour une image ou une formule seule, droit pour un trait, un groupe ou plusieurs objets, la pastille seule pour une figure, la pastille gardée dans ce qu'on voit à 2000 % ; `poigneeSous` ; `poigneeDeLAppui`, la pastille dessinée pour un autre pointeur prise là où on la voit, retouches après le lot 5), le quart de tour du menu ⋯ (`quartDeTour`, exact), les gestes du cadre (K6 : `matriceTaille` pour un coin, un côté, Maj + coin, aimanté et borné, sans retournement ; `deroule`, l'angle tourné sur plus d'un tour ; les mesures « 150 % », « ↺ 30° » ; `curseurPoignee` ; `cadreTransforme`, le cadre pendant le geste ; `etendueDuCadre` et `zonePastille`, ce que la barre d'actions et le menu complet contournent ; `zonesDesPoignees`, ce que le message ne couvre pas, corrections des vérifications des retouches). Sans DOM |
| `src/sorties/formules.ts` | Les formules KaTeX sur un canevas : mises en page cachées comme à l'écran, puis repeintes (textes, bordures, fonds, SVG coupés), les polices attendues ; leurs images gardées par échelle dans un cache borné en pixels |
| `src/sorties/image.ts` | Copier en image (pour l'ENT et Pronote) : la taille de l'image (jamais plus fine que l'écran à 100 %, environ 4 millions de pixels et 4 096 px de côté au plus), le nom du fichier, l'image PNG cadrée sur le contenu (noms des points compris), la copie dans le presse-papiers du système dans le geste même, le repli « Enregistrer l'image (.png) » ; « Exporter en PDF » proposé pour une page très haute |
| `src/sorties/pdf.ts` | L'écrivain de PDF, pur (sans bibliothèque) : une image par feuille, en couleurs indexées (les couleurs des objets d'abord, puis les plus fréquentes ; l'écart borné : trop d'aplats faux, pas de palette ; compressées par Flate, par tranches de lignes pour rendre la main), en RVB sans perte (lignes prédites comme un PNG, prédicteur 15) ou en JPEG pour une photo ; la table des renvois exacte, le titre en UTF-16 |
| `src/sorties/mise-en-page.ts` | La mise en page du PDF, pure (testée) : le papier A4 (marges, 200 ppp, peint comme une page à 96 ppp), l'échelle et le sens (1 cm = 1 cm tant que le contenu tient sur la feuille ; une page qui n'est pas haute sur une seule feuille, dans le sens qui la montre le plus grand ; une page haute en portrait, à la largeur), la découpe d'une page haute (entre 60 et 100 % de la feuille, jusqu'à 25 % pour ne pas couper une figure qui tient sur une feuille, là où le moins de boîtes passent ; les grands vides sautés) ; le pied de page, le nom du fichier, le titre, les messages, le libellé de la case du fond (`texteCaseFond`) |
| `src/sorties/export-pdf.ts` | Exporter en PDF : la fenêtre (ce qu'on exporte, le fond imprimé, sa case qui nomme le fond des pages : `texteCaseFond`), puis l'export (les formes prises au lancement, dans l'ordre d'affichage de l'écran, chaque feuille peinte par tranches et coupée à sa bande, le fond peint dans la zone utile et pour le papier (`impression`), le pied de page ; les pixels palettisés avec les couleurs des objets, ou en RVB sans perte, ou en JPEG quand une photo couvre 15 % de la feuille, compressés par morceaux ; l'attente pendant un geste, la progression, un export à la fois) |
| `src/sorties/apercu.ts` | Peindre une page hors de l'écran (la boîte du contenu, noms des points compris, les polices, les formules et les images préparées, puis la peinture ; une formule tournée peinte dans son repère, lot 5) : la fondation des vignettes, de l'image copiée et du PDF ; le réglage du fond imprimé (`mem-sortie-fond`) |
| `src/pages/vignettes.ts` | Les vignettes des pages : un canevas par page et par taille, peint plus tard par une file paresseuse (seulement s'il est à l'écran, les pages prioritaires d'abord), repeint quand sa page change ; le cadrage d'une vignette |
| `src/fonds.ts` | Les fonds : petits carreaux, Seyès, repère gradué, et depuis le lot 5 grands carreaux (1 cm), papier millimétré (trois tons fixes), papier pointé, réseau isométrique ; tous calés sur l'origine, sur la seule zone visible, bornés, aucun niveau plus serré que 6 à 9 px d'écran, le plus fin en fondu ; un fond inconnu, le papier blanc seul (tests/fonds.test.ts : les écarts, les tons, rien ne saute d'un cran de zoom à l'autre) ; le contraste renforcé (lot 5 : le dernier paramètre de `dessinerFond`, `{ contraste }`, que seul l'écran du professeur demande ; `TONS_CONTRASTE`, `renforcer` : les couleurs × 1,8, des lignes de 2 px aux pixels entiers, des points de 3 px ; tests/affichage.test.ts) ; la feuille d'un PDF (`{ impression }`, que seul l'export en PDF demande : les lignes et les points sur les pixels de l'image de la feuille, le papier millimétré avec ses millimètres dès qu'ils font 0,8 mm sur la feuille, à plein ton ; tests/fonds.test.ts) |
| `src/menu-fonds.ts` | Le menu des fonds en vignettes (lot 5) : `vignetteDuFond` et `peindreVignette` (un fond sous la caméra où son motif se lit, à la densité de l'écran, au plus 2 ; celle du bouton de la barre du haut, 30 × 22 px, et celles du menu, 76 × 52 px), `construireMenuFonds` (la grille 4 × 2 des huit fonds en menuitemradio, peinte une fois, la coche refaite à chaque ouverture ; les flèches dans la grille, `naviguerDansLaGrille` de `src/menus.ts`) ; « Plus → Fond… » au téléphone la reprend (lot 5, K10 : sous « Plus », deux colonnes en portrait) |
| `src/geometrie.ts` | Ce que touche la gomme ; ce que vise la sélection (la distance au tracé, l'intérieur plein ou nu, l'aire, et le choix entre plusieurs objets dans l'ordre où on les voit, `cibleParmi` : une formule ne cache pas ce qui est écrit sur elle ; `cacheAuDessus` pour le clic droit) ; ce que prend un cadre ou un lasso (la part dedans, le lasso simplifié) ; la formule tournée par un seul chemin (lot 5 : chaque fonction reçoit sa boîte locale, non tournée, et ramène le point dans son repère ; `coinsFormule`, `englobante`, `rotationDe` — une rotation abîmée se lit droite) ; où se pose le cadenas d'un objet verrouillé et son cadre gris (lot 5 : `coinsVus`, le rectangle tourné d'une image ou d'une formule, `ecarterCoins`, `coinHautDroit`) |
| `src/formes.ts` | Reconnaissance des figures, codage, transformations (l'image d'une forme est un objet neuf : ni verrou, ni fixation, ni groupe) |
| `src/revue/` | La revue en classe : ce qu'on revoit, les images, la frise, le choix ; une étape « coupe » (lot 5) n'esquisse rien, ses morceaux paraissent d'un coup ; le contraste renforcé de l'écran du professeur, relu à chaque ouverture (lot 5) |
| `src/heritage.ts` | Le passé d'une copie de page : la page qu'on lit vraiment à chaque étape du film (l'original, avant la copie), pour la revue et le film élève |
| `src/revoir/` | Le replay des élèves : format du film, rythme de la main, instruments, exporteur, bobine (sa boîte d'une formule tournée : l'englobante, lot 5 ; une étape `coupe`, que l'exporteur garde, n'esquisse rien : `Bobine.coupe`), lecteur (`revoir.html`), relais |
| `src/piste.ts` | La piste des instruments : ce que la classe en a vu, noté pour le replay |
| `src/publication/` | Publier sur le Drive : comptes et relais (et les dossiers des sauvegardes), connexion Google (le jeton qui suit l'onglet d'un classeur à l'autre : `passerLaConnexion`, `reprendreLaConnexion`), la fenêtre (une copie de classeur, marquée, publie ses séances sous une clé à elle : un nouveau lien) ; les sauvegardes des classeurs (lot 4 C10, `drive.ts`) : le dossier privé marqué à part, le même fichier remplacé (multipart binaire ou envoi reprenable), le garde-fou des deux ordinateurs, l'élagage des versions, la liste et la lecture des sauvegardes |
| `relais/relais-seances.gs` | Le relais Apps Script, à déployer dans chaque compte Google |
| `tests/` | Les tests (`npm test`) : ce qui part chez les élèves, la fidélité du replay ; la mise en page du téléphone dans ce qu'elle a de pur (lot 5, `tests/telephone.test.ts` : `zoneEntreBarres` avec la barre des outils en bas, `placeBarre` et `positionPanneau` au-dessus d'elle, la requête) ; les réglages par défaut (retouches après le lot 5, `tests/defauts.test.ts` : la page blanche de toute page neuve, la copie qui garde son fond ; `tests/vue.test.ts` : `vueAuDebut`) ; la rotation d'une image importée (retouches après le lot 5, `tests/rotation.test.ts` : la pastille dessinée pour un autre pointeur, `poigneeDeLAppui` ; le quart de tour, exact et en une étape ; les messages de l'import et de « Fixer en fond ») ; les corrections de leurs vérifications (`tests/verifications.test.ts` : la touche de l'outil d'avant, `messageReprise` ; les messages de « Détacher l'image du fond » et de « Fixer en fond » à la Sélection choisie ; `pointeurDuClic`, `pointeurDeDepart` ; `zonesDesPoignees` ; l'étape à refaire, `prochainRetablissement`) |
| `src/enonce.ts` | La vignette de l'énoncé : quelle image montrer quand l'énoncé est sorti de l'écran par le haut (`enonceHorsVue`, pur), sa taille petite ou agrandie (`tailleVignette`), la vignette elle-même (sa place sous la barre du haut, le clic qui l'agrandit, la croix, la peinture de la zone de l'image par `Apercus`) |
| `src/camera.ts` | La caméra (le zoom, ses bornes, la vue d'une boîte, `vuePour` ; à 100 %, le début d'une boîte, `vueAuDebut` : une page jamais regardée s'ouvre ainsi, retouches après le lot 5, tests/vue.test.ts) et ce qu'on voit entre les barres (`zoneEntreBarres` : « Tout voir », la pastille ↻ ; depuis le lot 5, K10, la barre des outils posée en bas, au téléphone, en borne le bas) |
| `src/instruments.ts` | Règle, équerre, rapporteur, compas ; leur pastille ↻ (`dessinerPastille`), la même que celle du cadre de taille (lot 5 ; son filet, `filetPx`, de 2,5 px au cadre en contraste renforcé, de 1,6 toujours aux instruments) |
| `src/construction.ts` | Programme de construction → étapes et gestes |
| `src/constructeur.ts` | Joue les étapes, avec ou sans instruments |
| `src/automatismes.ts` | Les automatismes (générateurs, par niveau et par thème) et le tirage d'un flash (`tirerFlash`) |
| `src/flash.ts` | Le flash d'automatismes : le réglage, les questions posées sur une page de la séance, le bandeau, la correction |
| `src/seances.ts` | Les séances d'un classeur (lot 6) : le rangement des pages par séance (pur), la migration d'un classeur d'avant, les mots des dates (« Séance du mar 14 oct 14h », « de lundi ») ; dans `document.ts`, les deux cartes (`seances`, `seanceDesPages`), la séance neuve, la reprise d'une page (`reprendrePage`, `retirerReprise`) et la garde des séances passées (`garde`) ; dans `revoir/exporter.ts`, les séances lues dans le film (`seancesExplicitesDuFilm`, `pagesAPublier`) |
| `src/seances-vue.ts` | Les séances à l'écran (lot 6) : la fenêtre « Bonjour ! », la question « Cette page est dans la séance de lundi… », « Renommer la séance… », les bandeaux (la lecture, « Reprendre ») et le tiroir de la séance précédente |
| `src/figures.ts` | Les figures SVG des automatismes |
| `src/ui.ts` | Barres d'outils, le compteur des pages (il ouvre la trieuse), le bouton du fond (lot 5 : la vignette du fond de la page, qui ouvre le menu des fonds, voir `src/menu-fonds.ts`), le menu complet (un objet, une formule, plusieurs objets, un groupe : « Groupe · 3 objets », *Grouper* ou *Dégrouper* ; sa rangée sur une ligne, son bouton ⋯ et son petit menu en sections : *Copier en image* et *Envoyer vers…*, puis *Ordre* (les aides d'`aidesOrdre`), puis *Protéger*, puis *Groupe* (*Sortir du groupe*, pour un membre pris seul : `sectionGroupe`), puis *Position* (*Tourner d'un quart de tour à gauche* et *… à droite*, pour ce qui a la pastille ↻, retouches après le lot 5 ; *Remettre droit*, pour une image ou une formule seule tournée) ; placé dans l'écran, sur un téléphone aussi), le menu court d'un objet verrouillé (lot 5 : Déverrouiller, Copier, ⋯), le menu de la Gomme (lot 5 : retoucher la Gomme en main, le clic droit, l'appui long, E ; ce qu'elle efface et sa taille ; le titre et la marque ◐ de son bouton), le menu de la page (et ce qu'il fait de l'image fixée en fond : la détacher, la copier, l'envoyer ; Déverrouiller tout), « Copier la page en image » et « Copier en image », « Envoyer vers… », « Exporter en PDF » (ses entrées : le menu de la page, le menu ⋯ de la barre du haut, la trieuse), les messages (un ou deux boutons ; au-dessus des panneaux pendant un placement), éditeur de formules ; le bouton du classeur (sa place mesurée, à quatre formes), le bloc de l'état en tête du menu ⋯, le bandeau discret ; « Cet appareil » à la fin du menu ⋯ (lot 5 : « Contraste renforcé », body.contraste ; « Noms sous les outils », body.noms-outils, le nom court de chaque bouton dans son `span.libelle` (`nommer`, le mot dans data-libelle), `majNomsOutils` qui suit la mise en page du téléphone, `--droite-barre-outils` mesuré, les menus du doigt et de la Gomme qui passent sous la barre du haut sur deux rangées) ; la mise en page du téléphone (lot 5, K10 : `body.telephone`, `telephone`, `barreEnBas` ; ce qui ne s'y montre pas, `.seulement-large` ; « Couleur » et « Autres outils », au bout de la barre des outils, leurs menus `construireMenuCouleur` et `construireMenuAutres` (« Couleur » sert aussi, depuis le contrôle final du lot 5, à la barre d'un écran qu'on touche : body.tactile, ses pastilles et ses tailles en 44 × 44, repliées dans « Couleur » quand elle ne tient pas dans la hauteur, `majCouleursRepliees`), `placerPresDeLaBarre` qui les pose entre les deux barres ; les choix des Formes et du Segment au-dessus de la barre du bas, `placerChoixDuTelephone` ; ⋯ devenu « Plus », ses sections Page, Outils de cours et Vue, `sectionsDuTelephone`, et « Fond… », `ouvrirFondsDepuisPlus` ; le bouton du classeur en tête de la barre du haut ; `--haut-barre-bas` et `basUtile`, ce que prend la barre du bas ; `bordsFlottants`, les bords que la barre d'actions et le menu complet ne passent pas ; `placerToast`, le message qui ne couvre ni les barres ni ce qui est pris (depuis les retouches après le lot 5, au poste de la classe aussi : ni la barre d'actions ni la pastille ↻) ; la liste des instruments sous la barre du haut) |
| `src/pages/envoi.ts` | La fenêtre « Envoyer vers… » : déplacer ou copier, la liste des destinations (chaque page avec sa petite vignette, une nouvelle page juste après, à la fin), le clavier ; les textes des messages d'un envoi (pur, testé). L'envoi lui-même est `App.envoyerSelection`, son annulation `Tableau.envoyer` |
| `src/barre-actions.ts` | La barre d'actions au-dessus de ce qui est pris : quand elle paraît (jamais avec un autre menu, jamais sur ce qui est verrouillé), ce qu'elle montre (selon ce qui est pris et le pointeur), où elle se pose (au-dessus du cadre de taille et de sa pastille ↻, jamais sur elle : `App.emprise`, `placeBarre` ; au téléphone, au-dessus de la barre du bas : son bord `bas`, lot 5, K10), ce que devient un appui sur elle |
| `src/icones.ts` | Les icônes des barres, des menus et de la barre d'actions (le cadenas du menu court d'un verrouillé compris ; celles des lecteurs sont dans `src/revoir/icones.ts`) |
| `src/curseurs.ts` | Le curseur de chaque outil : son icône (celle de `src/icones.ts`) en SVG data:, liseré blanc, le point actif là où il agit ; une petite croix et l'icône pour le Segment, les Formes et la Formule (selon `data-trait` et `data-forme` de la zone, écrits par `App.choisirOutil`) ; les règles ajoutées à la page au lancement (`installerCurseurs`) |
| `src/habillage.ts` | Ce que règle le menu de plusieurs objets (couleur, épaisseur, pointillés), ce qui y est actif ; les tailles d'une formule ; le nom du menu complet d'un objet |
| `src/navigateur.ts` | Ce que le navigateur ne prend plus : Ctrl + « + », F5, pincer la page, le marque-page de Ctrl + D ; la molette ; la touche Menu ; Maj + L (`toucheVerrou`) ; Alt + ← / →, ⌘ + ← / → et Ctrl + G empêchés hors des champs dans tous les écrans, la revue, la trieuse et la bibliothèque comprises (`toucheQuitteLaPage`, dans `installerGardes`) ; les touches qui se taisent pendant un geste (Maj + L et Ctrl + G comprises) ; le tableau caché (la revue, la trieuse des pages : `tableauCache`), sous lequel tout ce qui écrirait sur la page qu'on ne voit pas se tait (le collage, les menus du clic droit, la barre d'actions, le zoom, Ctrl + O, l'annonce du numéro de page) ; la touche des raccourcis (⌘ sur Mac) et la façon de dire « enregistrer », « ouvrir » dans un texte (`POUR_ENREGISTRER`, `POUR_OUVRIR` : le raccourci, ou l'entrée du menu ⋯ sur un appareil qu'on ne fait que toucher) ; la requête de la mise en page du téléphone (lot 5 : `TELEPHONE`, écrite là une fois ; l'interface en tire `body.telephone`, et la feuille de style reprend ses bornes) |
| `src/dialogue.ts` | Le fond d'une fenêtre : un appui commencé et fini hors de son cadre la ferme, jamais un appui dans sa marge intérieure (testé) |
| `src/menus.ts` | Les petits menus flottants, sous leur bouton ou au point d'un clic droit (un seul ouvert, Échap, un appui ailleurs ; la barre d'actions prévenue quand l'un s'ouvre ou se ferme) ; le clavier qui va au menu ouvert (aussi pour le menu complet) ; d'où vient le focus (le clavier ou un appui, retenu quand il arrive, et le focus rendu à la fermeture d'un écran) ; le balisage de leurs entrées, de leurs filets et de leurs titres (l'interface et la trieuse s'en servent) ; la place du menu complet près de ce qu'il règle, jamais dessus quand il a la place ailleurs, jamais sur la pastille ↻ du cadre de taille (`positionPanneau`, pur, testé ; au téléphone, jamais sur la barre du bas : son bord `bas`, lot 5, K10) ; les flèches dans une grille d'entrées (`naviguerDansLaGrille` : le menu des fonds, et au téléphone « Couleur » et « Autres outils ») |
| `src/reglages.ts` | Les réglages de cet appareil (la molette, le rôle du doigt, les gestes à deux et trois doigts, et depuis le lot 5 ce qu'efface la gomme et sa taille : `mem-gomme`, `mem-gomme-taille`, `RAYON_GOMME` ; le contraste renforcé, `mem-contraste` ; les noms sous les outils, `mem-noms-outils`, écrite seulement quand on choisit, et `nomsOutilsVisibles` qui décide en « auto » d'après l'écran), hors du document ; ses fonctions lisent et écrivent aussi le fond imprimé (`mem-sortie-fond`, voir `src/sorties/apercu.ts`) |
| `src/pointeurs.ts` | Souris, stylet, doigt : le seuil du glisser, la portée de la prise, la paume, le stylet sur l'écran, le double appui, l'appui long, le toucher à deux ou trois doigts, les mots des messages (comment déverrouiller, comment détacher une image du fond : `messageVerrou`, `messageDetacher` ; retouches après le lot 5 : ce que dit l'import d'une image, `messageImagePosee`, et « Fixer en fond », `messageFixe`) ; la taille des poignées du cadre de taille et de la pastille ↻ selon le pointeur (lot 5 : `POIGNEE`, à la prise 10 / 12 / 20 px, au dessin 8 / 10 / 14, la pastille à 24 / 28 / 36 px du cadre) ; le message de la première image prise (`messageCadre`) ; celui des noms sous les outils (lot 5 : `messageNomsOutils`, le survol à la souris et au stylet qui survole, pas au doigt ni au TNI) ; corrections des vérifications des retouches : comment reprendre l'outil d'avant, par sa touche (`messageReprise`), ce que dit « Détacher l'image du fond » (`messageDetache`), le pointeur d'un clic hors du tableau (`pointeurDuClic`) et celui d'avant tout appui (`pointeurDeDepart` : le doigt sur un écran tactile sans souris) |
| `src/session.ts` | La page vue et la vue de chaque page (son centre, et son zoom, noté sans plus servir depuis les retouches d'après le lot 5 : on revient sur une page à 100 %), retrouvées au rechargement, hors du document ; une session par classeur (`mem-session` pour le premier, `mem-session:<id>` pour les autres) |
| `src/pages/trieuse.ts` | La trieuse des pages : toutes les pages en vignettes, plein écran ; l'ouvrir et la fermer (le tableau caché, le reste de l'écran inerte, le focus rendu), aller à une page (clic, toucher, Entrée, numéro tapé), le clavier, le glisser-déposer (souris et tablette graphique tout de suite, doigt par la poignée ou un appui long, défilement au bord), plusieurs pages à la fois (Maj ou Ctrl + clic, Espace, Ctrl + A, « Choisir plusieurs » au doigt), le menu d'une vignette (⋯, clic droit, bouton du stylet, touche Menu ; ses huit fonds sur deux colonnes ; « Insérer une page… » y choisit le fond en second temps, sur une colonne), le nom écrit dans la carte, les messages et leur « Annuler » ; « Exporter en PDF » (le bandeau, celui des pages choisies, le menu d'une vignette, Ctrl + P) ; le bouton « Corbeille (3) » du bandeau, qui ouvre la vue de la corbeille |
| `src/pages/corbeille.ts` | La corbeille des pages, une vue de la trieuse : les pages supprimées en vignettes, quand (« Supprimée aujourd'hui à 10 h 05 »), Remettre (par le journal de la trieuse : « Annuler »), Supprimer définitivement et Vider (après une question, dans une fenêtre de l'outil) ; où c'est noté dans le document (la carte `corbeille`) |
| `src/pages/actions.ts` | Ce que la trieuse fait aux pages, chaque action en une entrée de son journal : renommer, insérer une page vide avant ou après, en ajouter une à la fin (blanches par défaut : `FOND_NEUF`), dupliquer avec l'histoire, supprimer vers la corbeille (jamais toutes ; la page où aller quand on supprime celle qu'on regarde), changer un fond (l'origine du repère au centre du contenu), ranger d'une place (pur, testé) |
| `src/pages/glisser.ts` | Où arrive une page lâchée dans la grille (la ligne sous le point, avant la première carte dont le milieu est à droite), où se pose la barre qui le montre, la vitesse du défilement près du bord (pur, testé) |
| `src/pages/journal.ts` | Le journal de la trieuse des pages : chaque action sur les pages (déplacer, renommer, dupliquer, insérer, supprimer, changer un fond) entre avec l'état des pages d'avant et d'après ; annuler (ou rétablir) seulement si le tableau est exactement dans l'état laissé, sinon il le dit et se vide (jamais un changement invisible ni une page perdue) ; une page créée par une action défaite ne va pas dans la corbeille, et y reste hors quand on défait les actions d'avant ; aucune pile de page touchée |
| `src/presse-papiers.ts` | Copier, coller : la copie écrite pour le presse-papiers du système et relue sans passer par la page, chaque forme vérifiée par une liste blanche (depuis le lot 5 : verrou, fixation d'une image et groupe gardés, jetés s'ils sont abîmés ; la rotation d'une formule bornée), le collage (noms gardés ou changés, points liés ; verrou et fixation remis, un groupe neuf par groupe copié d'au moins deux membres, une image fixée sous tout ce qui est sur la page d'arrivée) |
| `src/fichier.ts` | Le classeur dans un fichier `.memc` : l'écrire (l'en-tête avec le nom et l'id du classeur, à la fin), le relire (et refuser ce qui n'en est pas un), vérifier un document entier (`verifierEtat`, ou `verifierDocument` sur un document déjà rejoué), ce qui se relit d'un document où des changements attendent une mise à jour qui manque (`etatLisible`, `ecrireLisible` : un fichier qui se rouvre toujours), lire l'en-tête seul (`lireEntete`) ; la marque d'une copie (`CARTE_COPIE`, `marqueDeCopie`, que Publier lit) ; le nom de tout fichier (`nomSur`, `nomClasseur`) |
| `src/sauvegarde.ts` | Enregistrer et ouvrir un classeur : Ctrl + S (sur la clé quand elle enregistre le classeur ; sinon le fichier par l'écrivain, ou depuis la mémoire quand la base a un trou), Ctrl + O (avec la bibliothèque, il passe la main à `classeurs/fichiers.ts` ; dans le repli, par showOpenFilePicker quand il existe, le fichier lu dans le travailleur, et il remplace le classeur), la question avant de remplacer (`proposerRemplacement`, et sa case « Enregistrer automatiquement les changements dans ce fichier »), « Remplacer » qui donne au classeur l'identité du fichier (ou en fait une copie, registre des publications vidé et marquée, pour le fichier d'un classeur de la corbeille), les autres onglets (le canal des classeurs, et `mem-tableau` pour le premier), le classeur coupé de sa base pour une mise à jour depuis un fichier, la date du dernier enregistrement de chaque classeur ; le téléchargement d'un fichier (`telecharger`, que l'image copiée et le PDF empruntent) |
| `src/main.ts` | Le démarrage : l'index de la bibliothèque et la reprise, le classeur à ouvrir (ou le repli, ou la bibliothèque seule), l'adresse, le titre de l'onglet, puis le classeur chargé et son ouverture notée, la bibliothèque par-dessus lui (ce qui s'écrit avant d'en partir), les fichiers (`classeurs/fichiers.ts`, branchés sur la sauvegarde, la bibliothèque et l'état ; aussi dans la bibliothèque seule), le message d'arrivée, l'annonce du premier lancement ; une page du cache du navigateur se recharge |
| `src/classeurs/demarrage.ts` | Les classeurs, pur (testé) : les noms des bases et des clés (`mem-tableau-local`, seul endroit qui l'écrit), les fiches des classeurs et des dossiers, le premier reconnu à sa base, la clé de stockage d'un classeur, la chaîne bornée des dossiers, ce qui est visible, le classeur qui s'ouvre au démarrage et ses messages, le dernier classeur retenu, l'adresse d'un classeur |
| `src/classeurs/bases.ts` | Les bases des classeurs en IndexedDB pure : ouvrir une base sans jamais la créer (`ouvrirBaseExistante`), lire ses mises à jour, créer la base d'un nouveau classeur (jamais sur une base existante ; une mise à jour ou plusieurs, dans l'ordre : une copie), remplacer son contenu d'un bloc, y ranger l'identité, compter ses entrées (sans `databases()` aussi), l'effacer (bloquée : la suite quand elle part enfin) ; les raisons d'un refus (`ErreurBase`) |
| `src/classeurs/registre.ts` | L'index de la bibliothèque (`mem-teachingtool-bibliotheque`) : l'ouvrir, la reprise du tableau d'avant (une transaction, rejouable) et le ménage des créations et des effacements interrompus (le garde-fou du premier), lire et écrire les fiches et les dossiers (une transaction par geste ; jamais deux fiches pour une base, jamais de cycle de dossiers), changer l'identité d'un classeur, remettre un classeur ou un dossier de la corbeille (son dossier relu dans la même transaction), retirer un classeur effacé (sa fiche, son aperçu, sa poignée), adopter une base sans fiche (une transaction : une seule fiche), les réglages, les aperçus (un, ou tous d'une lecture), les poignées des fichiers de la clé, créer un classeur sans toucher à une base pleine, noter l'ouverture (le premier repris retrouve le nom rangé à côté de son document) ; le canal des onglets |
| `src/classeurs/neuf.ts` | L'état d'un classeur neuf : une page vide au fond choisi (la fenêtre coche la page blanche), et sa naissance dans le film |
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
| `src/classeurs/ancien-tableau.ts` | Reprendre un ancien tableau (.prof) : le lire et rejouer son film, chaque geste à son heure, dans une séance neuve ; les traits, les images (rognées, tournées, fixées en fond), les textes en formules, les figures (points, segments, droites, arcs, rectangles, caches) ; le bilan, les textes de la fenêtre (pur, testé) |
| `src/classeurs/reconnaitre.ts` | Reconnaître le classeur d'un fichier, pur (testé) : le même (son id), la corbeille, « ressemble » (un appareil Yjs en commun ; dans un lot, seulement sans id), nouveau ; la décision d'après la comparaison ; le nom d'après le nom du fichier ; les phrases des fenêtres et des bilans ; la réunion des dossiers d'une bibliothèque qu'on ouvre |
| `src/classeurs/copie-drive.ts` | La copie à sens unique sur le Drive (lot 4 C10) : le compte du classeur, quand copier (2 min après le dernier changement, au plus tard 10 min, au plus une fois par max(10 min, 1 min par Mo, 20 fois la durée), au calme, en arrière-plan), depuis la base dans le travailleur, un onglet à la fois (Web Locks), une copie d'un autre onglet qui compte, les classeurs en retard (pas les vides), la connexion (jamais sans un clic ; arrivé connecté d'un autre classeur, les classeurs en retard se copient d'ici ; le jeton expiré, le bandeau ; le compte proposé à Google, retenu pour la copie), le compte Google où est vraiment la dernière copie, les échecs et leurs réessais, les garde-fous (récupérer, remplacer quand même), la question du navigateur en fermant l'onglet avant la copie quand rien d'autre ne protège le classeur (`beforeunload`, et la copie part aussitôt), la fenêtre « Copie sur le Drive… » |
| `src/classeurs/drive-pur.ts` | La copie sur le Drive, pur (testé) : le compte voulu, le rythme (`prochaineCopie`, l'intervalle), le compte Google proposé à la reconnexion (`indiceGoogle`) et la copie sur un autre compte (`copieAilleurs`), la question du navigateur en fermant l'onglet (`questionDuDrive`), ce qu'on dit d'un échec, les phrases des garde-fous, les classeurs en retard |
| `src/classeurs/recuperer.ts` | « Récupérer une sauvegarde du Drive » (le menu ⋯ du bandeau de la bibliothèque) : le Drive, la connexion dans le clic, la liste, le téléchargement, puis le chemin d'Ouvrir |
| `src/classeurs/archive.ts` | Toute la bibliothèque dans un fichier `.memb`, pur (testé) : le zip écrit à la main (entrées stockées, somme et taille dans chaque en-tête local, aucun descripteur ; 4 Go et 65 534 entrées au plus), relu par son répertoire central (`File.slice`), un fichier tronqué par ses en-têtes locaux ; l'index `bibliotheque.json` et son format ; le nom du fichier |

Toutes les briques sont sous licence MIT (Yjs, y-indexeddb,
perfect-freehand, KaTeX, Vite) : aucune clé de licence, aucun filigrane, et rien
n'empêche un usage payant.

## Limites connues de la v0.1

**Les séances (lot 6).** Une page d'une séance passée ne se supprime ni ne
se range : elle reste telle que la classe l'a vue (on la reprend dans la
séance du jour). On ne supprime pas une séance entière. Après un
rechargement, Ctrl+Z ne retire plus une page reprise (les piles d'annulation
sont en mémoire) : la poubelle, si. Sur un téléphone, l'étiquette de la
séance n'est pas sous le compteur (la séance se lit dans la trieuse et le
menu « Plus »). Le découpage d'avant (20, 10, 5 ou 2 minutes) ne sert plus
qu'au document sans séances (hors de l'application).

- Tout est redessiné à chaque déplacement de la vue. Au-delà de quelques
  milliers de traits sur une page, il faudra un index spatial (quadtree).
- Entre la version en ligne et la version hors ligne, la copie passe seulement
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
- Un classeur du lot 5 rouvert dans la version d'avant (6aee150 : la
  version hors ligne restée sur une clé USB sans être refaite, un
  onglet ouvert avant la mise à jour) s'y ouvre et
  s'y peint sans erreur, mais elle ne connaît ni le verrou, ni la fixation en
  fond, ni les groupes, ni la rotation d'une formule : elle laisse prendre,
  déplacer et effacer un objet verrouillé ou une image fixée, montre une
  formule tournée droite, et compte un réglage (verrouiller, grouper) pour un
  geste de sa revue. Ses doubles (Ctrl + D, Transformer, un collage dans le
  même onglet) d'un membre de groupe, d'un objet verrouillé ou d'une image
  fixée gardent ces champs : un classeur repassé par elle peut avoir, de
  retour dans le lot 5, un double dans le groupe de l'original, un double
  verrouillé, ou une seconde image fixée avec un rang au-dessus des autres
  images. Rien ne s'y perd et rien n'y plante (un banc le vérifie).
- Verrouiller et fixer en fond (lot 5) dans la version d'avant (6aee150) et
  dans un lecteur d'avant : ils ignorent le verrou et le fond fixé. La
  version d'avant laisse prendre, glisser, gommer et supprimer un objet
  verrouillé ou un énoncé fixé (Ctrl + A le prend, « Effacer la page »
  l'efface) ; l'image fixée y est peinte sous les autres images, comme ici,
  puisque Fixer en fond et Détacher gardent toute image fixée sous toute
  image libre (un banc le vérifie, étape par étape, et pour sa bobine). Un
  verrouillé déplacé ou effacé par elle revient dans le lot 5 déplacé ou
  effacé, toujours verrouillé s'il est encore là. Dans le lot 5, l'image
  fixée se détache, se copie et s'envoie par le menu de la page seulement ;
  le cadenas ne se voit qu'à l'écran du professeur (jamais dans la revue ni
  chez les élèves).
- Les groupes (lot 5) n'ont qu'un niveau : grouper des groupes les fond en
  un, et Dégrouper rend les objets un par un (on ne retrouve pas les groupes
  d'avant la fusion, sauf par Ctrl + Z). Un groupe ne vaut que sur sa page.
  Dans la version d'avant (6aee150), qui ignore le champ, les membres d'un
  groupe se prennent un par un. Un groupe verrouillé ne se dégroupe qu'une
  fois déverrouillé. Un groupe pris a le cadre droit de sa boîte (quatre
  coins) et la pastille ↻ (voir « Changer de taille, tourner ») ; après
  une rotation, ce cadre redevient la boîte droite de ce qui a tourné (voir
  plus bas).
- L'ordre (lot 5) dans la version d'avant et dans un lecteur d'avant resté
  en cache chez un élève : ils peignent les images par rang, sous
  l'écriture, comme le lot 5 (une image mise à l'arrière-plan y reste
  au-dessus de l'image fixée : un banc le vérifie), et les tracés par rang.
  Mais la version d'avant prend au clic par le rang (une image mise au
  premier plan y cache encore, à la prise, le trait peint sur elle), et elle
  range les formules HTML par la seconde de leur rang : l'ordre changé de
  deux formules qui se chevauchent peut ne pas s'y voir quand les rangs
  tombent dans la même seconde.
- Changer de taille et tourner (lot 5) : un menu complet très haut (la
  section *Transformer*, 300 px) sur un écran de 768 px, pour une figure
  placée bas, peut couvrir la pastille ↻ (jamais la figure s'il peut
  l'éviter) : on le ferme pour tourner. Pendant le geste, un trait réduit
  sous une épaisseur de 1 paraît plus fin qu'il ne le sera au lâcher (il
  garde au moins 1) ; le cadre d'un groupe ou de plusieurs objets reste
  droit : après une rotation, il est la boîte de ce qui a tourné (il ne
  garde pas l'angle, comme tldraw garde celui d'une sélection). Dans la
  version d'avant (6aee150) et dans un lecteur
  d'avant resté en cache chez un élève, une formule tournée paraît droite
  (et se prend dans sa boîte droite) ; tout le reste d'une transformation
  (un trait agrandi, une image tournée, une figure tournée) y paraît tel
  quel, puisqu'il est cuit dans les coordonnées (un banc le vérifie, et
  leur revue, leur exporteur et leur bobine rejouent ces gestes sans
  erreur). « Remettre droit » remet une image retournée par une symétrie le
  haut en haut : retournée de haut en bas, elle devient retournée de gauche
  à droite (Ctrl + Z si ce n'était pas voulu).
- La gomme qui efface seulement là où elle passe (lot 5) ne coupe que les
  traits à main levée : une figure, une formule ne se gomment qu'en entier
  (« Effacer le trait entier »), une image jamais (elle s'enlève par
  Supprimer), et un ancien segment (v0.1)
  non plus. Elle ne fusionne pas de nouveau deux morceaux qui se touchent :
  repasser une gomme le long d'un mot y laisse plus de morceaux qu'il n'y
  paraît (des traits ordinaires, qui se prennent et se copient un à un, ou
  au lasso). Pendant le coup, le contour d'un morceau peut différer d'une
  fraction de pixel, sur un pixel isolé, de celui que repeint le lever
  (l'anticrénelage d'une peinture bornée au rectangle sale) : le lever
  repeint toute la scène. Sur un long trait (plus de 150 points) coupé
  pendant le coup, ce qui est loin de la gomme garde jusqu'au lever (ou
  jusqu'à ce que la gomme le quitte) le contour d'avant la coupe, que
  perfect-freehand redessine un peu autrement depuis le nouveau bout : quelques
  dizaines de pixels de bord par coup, au plus, qui changent d'une nuance au
  lever (les essais comparent au lever : moins de 20 pixels par million) ;
  rien de ce qui est effacé ne reste. Dans la version d'avant (6aee150) et un lecteur
  d'avant resté en cache chez un élève, une coupe est un geste ordinaire :
  les morceaux neufs s'y dessinent à vitesse de plume (le plus long, qui
  garde l'identifiant du trait, ne se redessine pas), sans erreur (un banc
  le vérifie, avec leur revue, leur exporteur et leur bobine).
- Les quatre fonds du lot 5 (grands carreaux, papier millimétré, papier
  pointé, réseau isométrique) dans la version d'avant (6aee150) et dans un
  lecteur d'avant resté en cache chez un élève : ils ne les connaissent pas
  et peignent la page blanche, sans erreur (un banc le vérifie, avec leur
  revue, leur exporteur et leur bobine) ; le fond reste écrit dans le
  classeur, et revient dans le lot 5. Au plus loin, petits et grands
  carreaux se ressemblent (les mêmes lignes de 1 cm et de 5 cm, comme dans
  les vignettes de la trieuse) ; au plus près, le papier pointé n'a qu'un
  point par centimètre (tous les 800 px à 2000 %). Une feuille de PDF au
  réseau isométrique pèse plus que les autres (ses obliques se compressent
  mal : 260 Ko environ pour une feuille A4 contre 60 Ko au millimétré et
  20 Ko au pointé ; 60 pages au millimétré et au pointé, 2 Mo). Les lignes
  de 2 mm du Seyès
  s'effacent toujours en fondu de 10 à 4 px (depuis le lot 1) : elles
  restent le seul niveau tracé, un instant, sous 6 px.
- Le contraste renforcé (lot 5) n'épaissit pas l'écriture à main levée (son
  contour serait à recalculer à chaque cran de zoom) ni les instruments, et
  il ne vaut que pour l'écran du professeur : ce que les élèves revoient
  chez eux (le lecteur, le film élève) et ce qu'on imprime (le PDF) gardent
  les tons ordinaires, voulus ainsi. Les noms sous les outils ne viennent
  pas dans la mise en page du téléphone (la place manque) ; au poste de la
  classe (souris, tablette graphique), les pastilles de couleur et les
  tailles du trait, dans la barre des outils, gardent leurs 34 et 30 px de
  haut (44 de large), avec ou sans noms, comme avant (sur un écran qu'on
  touche, depuis le contrôle final du lot 5, elles font 44 × 44, ou sont
  dans le menu « Couleur » quand la barre ne tient pas ; au téléphone,
  depuis K10, dans ce menu). Les
  deux réglages ne sont essayés qu'au navigateur Chromium, piloté (l'écran
  du TNI et de l'iPad simulés) : le vrai vidéoprojecteur de la salle, un
  vrai TNI et l'iPad restent à voir en classe.
- Au poste de la classe, sur un écran de 768 px de haut (1366 × 768,
  1024 × 768), la barre des outils (828 px) défile : Rétablir et la poubelle
  ne se voient qu'en la faisant défiler (la molette sur la barre, ou sa
  fine barre de défilement) ; dans une fenêtre de Chrome sur un tel écran
  (1366 × 657), aussi Trait moyen, Trait épais et Annuler ; avec les noms
  sous les outils (948 px), aussi Vert et Trait fin. C'est la règle du lot 1
  (des boutons de 44 px qui défilent, plutôt que des boutons qui
  rétrécissent), et les couleurs y restent à un clic ; replier les couleurs
  dans « Couleur » là aussi, comme sur un écran qu'on touche, les ferait
  passer à deux clics : c'est au professeur de choisir (voir la feuille de
  route). Les raccourcis restent : Ctrl + Z, Ctrl + Y, Suppr.
- La mise en page du téléphone (lot 5, K10) n'a été essayée qu'au navigateur
  Chromium, piloté (iPhone et Android simulés, de 320 × 568 à 932 × 430) :
  un vrai téléphone, Safari sur iPhone (la barre d'adresse qui grandit et
  rapetisse, l'encoche couchée) restent à voir. Sur le plus petit téléphone
  couché (568 × 320), il n'y a pas toujours de place pour tout : un objet
  pris en bas de l'écran, grand, avec son menu complet ouvert, laisse ce
  menu couvrir la pastille ↻ plutôt que l'objet (la règle du lot 5, K6, voir
  « Le menu complet ») ; un long message, alors, n'a ni le bas ni le haut de
  libres et reste en bas, sur la pastille (on la touche à travers lui : il
  laisse passer les appuis, sauf sur ses boutons). Dans le document, les
  deux boutons du téléphone (« Couleur », « Autres outils ») sont au bout de
  la barre des outils : au clavier (un téléphone avec un clavier), Tab passe
  par Annuler et Rétablir avant « Couleur », que l'écran montre avant eux.
  La barre du zoom y est cachée : on zoome au pincement (« 100 % » et « Tout
  voir » dans « Plus ») ; « Voir la sélection » n'y est pas. Sur 568 × 320,
  l'éditeur de formule est plus haut que l'écran : il défile, et ses boutons
  sont au bout.
- L'éditeur de formule n'est pas une fenêtre modale (on voit la page à côté,
  depuis le lot 1) : Échap ne le ferme pas ; on le referme par *Annuler*
  (ou *Placer*, Entrée).
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
7. Écriture : les **groupes d'écriture automatiques** (les traits écrits
   d'affilée forment un mot ; un toucher prend le mot entier, un second
   n'en garde qu'un trait), remis à plus tard par le professeur au lot 5
   (choix c : seulement « Grouper » à la main pour l'instant).
8. Les autres sujets « plus tard » de l'étude du lot 5 (les séances
   explicites et la classe demandée au début de chaque séance sont faites
   au lot 6) : des classeurs « Préparation » copiés pour chaque classe ; des modèles de
   page ; la recherche ; le pointeur laser (l'import de PDF est au point 4).
9. Au poste de la classe, sur un écran bas : replier les couleurs et les
   tailles dans « Couleur » quand la barre des outils ne tient pas (comme
   sur un écran qu'on touche depuis le contrôle final du lot 5), pour que
   Annuler, Rétablir et la poubelle restent dans l'écran — au prix d'un
   clic de plus pour changer de couleur : au choix du professeur.
