#!/bin/sh
# Toute la batterie d'essais du navigateur (lots 1 à 5), EN DEUX PARTIES
# (environ 1 h 40 et 1 h : ensemble, elles dépassent les deux heures qu'un
# outil laisse à une commande) :
#   sh essais/navigateur/tout.sh 1   les deux versions construites, les essais
#                                    des lots 1 à 5 et le banc d'écriture ;
#   sh essais/navigateur/tout.sh 2   les sondes des vérifications des lots 3, 4
#                                    et 5, les essais vitest hors de npm test,
#                                    les essais du contrôle final du lot 5.
# Sans argument, les deux à la suite. (npm run essais:navigateur:1, :2, ou
# npm run essais:navigateur pour les deux.)
# Sorties dans essais/navigateur/sorties/partie1 et partie2 (ignoré par git) ;
# le résumé des DEUX parties (le dernier passage de chacune) dans
# essais/navigateur/sorties/RESUME.txt, refait à la fin de chaque partie.
#
# Elle construit d'abord les deux versions (la version hors ligne, dist/index.html, que
# lisent passeB-b12 et les essais en file:// ; la version en ligne,
# dist-pages, servie sur :4180 pour les essais aller-retour, deux-onglets et
# session-stockage), et lance SON PROPRE serveur de développement, neuf, sur
# :5173 (où les essais l'attendent) : celui qui y tournait est arrêté, puis
# relancé à la fin (un serveur resté ouvert depuis la veille rendait
# test46-lecteur instable sur ses seuils de temps). Il ne recharge rien à
# chaud et ne surveille pas les fichiers (lot4/cf/vite-batterie.config.mjs) :
# un fichier du dépôt changé pendant le passage ne recharge pas les pages des
# essais en cours. Voir README.md (à côté) pour les prérequis.
set -u
E=$(cd "$(dirname "$0")" && pwd)          # essais/navigateur
R=$(cd "$E/../.." && pwd)                 # la racine du dépôt
P=${1:-tout}
case $P in 1|2|tout) ;; *) echo "usage : sh essais/navigateur/tout.sh [1|2]"; exit 2 ;; esac
B=$E/sorties
if [ $P = tout ]; then sh "$0" 1; sh "$0" 2; exit 0; fi
A=$B/partie$P
mkdir -p "$A"
rm -f "${A:?}"/*.out "${A:?}"/*.premier-passage "${A:?}"/RESUME.txt
cd "$E"

# Les deux versions construites, à jour
echo "=== npm run build && npm run build:pages" > $A/0-build.out
(cd "$R" && npm run build && npm run build:pages) >> $A/0-build.out 2>&1
echo "exit $?" >> $A/0-build.out

# Le serveur de développement (:5173), neuf, à la batterie ; et la version en ligne (:4180)
AVANT=$(lsof -ti tcp:5173 -sTCP:LISTEN 2>/dev/null)
if [ -n "$AVANT" ]; then
  kill $AVANT
  for i in 1 2 3 4 5 6 7 8 9 10; do curl -s -o /dev/null http://localhost:5173/ || break; sleep 1; done
fi
(cd "$R" && exec node node_modules/vite/bin/vite.js --config "$E/lot4/cf/vite-batterie.config.mjs" --port 5173 --strictPort) > $A/vite-5173.log 2>&1 &
DEV=$!
for i in 1 2 3 4 5 6 7 8 9 10 11 12 13 14 15; do curl -s -o /dev/null http://localhost:5173/ && break; sleep 1; done
PAGES=""
if ! curl -s -o /dev/null http://127.0.0.1:4180/index.html; then
  python3 -m http.server 4180 --bind 127.0.0.1 --directory "$R/dist-pages" > $A/serveur-4180.log 2>&1 &
  PAGES=$!
  sleep 1
fi

UN=$R/dist/index.html
# test46 fabrique des séances « aujourd'hui » (−2 h) et « hier » (−27 h) : on le lance dans
# un fuseau où il est vers midi, pour que ses dates ne dépendent pas de l'heure du passage
H=$(date -u +%H | sed 's/^0//'); N=$(( (12 - H + 24) % 24 )); [ $N -gt 14 ] && N=$((N - 24))
if [ $N -ge 0 ]; then MIDI="Etc/GMT-$N"; else MIDI="Etc/GMT+$((-N))"; fi
if [ $P = 1 ]; then
LISTE="lot1/donnees/abime.mjs lot1/regr/regr.mjs test42.mjs test46-lecteur.mjs test47-casse-lecteur.mjs instruments/e2e.mjs test50.mjs lot1/passeA.mjs lot1/passeB-b045.mjs lot1/passeB-b69.mjs lot1/passeB-b10.mjs lot1/passeB-b12.mjs lot1/appareils/appareils.mjs"
# Les seize essais de vérification du lot 1 (données : la version hors ligne et la
# version en ligne, l'une après l'autre ; les appareils : le doigt, Android,
# le téléphone, le PC) et les sondes du lot 2 qu'a reprises le contrôle final
for v in aller-retour cas-limites deux-onglets session-stockage apres-ouverture android carre centre detection divers nom partie paysage pc telephone toucher; do
  LISTE="$LISTE lot1/verif/$v.mjs"
done
LISTE="$LISTE lot2/verif/r4-fichier-seul.mjs lot2/verif/r8-options-apres-lasso.mjs"
for v in c2-doigt c3-wacom c4-menus c5-clavier c7-superpose c8-clavier-menus c9-mac c11-tel-menus; do
  LISTE="$LISTE lot2/verif/conformite/$v.mjs"
done
for f in $(ls lot2/*.mjs lot3/*.mjs lot4/*.mjs lot5/*.mjs 2>/dev/null); do LISTE="$LISTE $f"; done
mkdir -p "$B/t42m"
passer() {  # passer <essai> <sortie>
  case $1 in
    test42.mjs) timeout 900 node $1 "$B/t42m" >> $2 2>&1 ;;
    test46-lecteur.mjs) TZ=$MIDI timeout 900 node $1 >> $2 2>&1 ;;
    lot2/verif/r4-fichier-seul.mjs) timeout 900 node $1 "$UN" >> $2 2>&1 ;;
    *) timeout 900 node $1 >> $2 2>&1 ;;
  esac
  echo "exit $?" >> $2
}
for t in $LISTE; do
  nom=$(echo $t | tr '/' '_')
  echo "=== $t" > $A/$nom.out
  passer $t $A/$nom.out
  # Un essai qui échoue sur ses seuils de temps (test46-lecteur : les tâches
  # longues et la fluidité du glissé ; instruments/e2e : la pose rejouée au
  # même instant que le direct, à la milliseconde près ; test47-casse-lecteur :
  # son seuil de 150 ms pour sauter au milieu d'un film de 3 000 gestes) est
  # rejoué une fois, et c'est noté : le premier passage reste à côté
  # (.premier-passage), et le résumé le dit. Un défaut véritable échoue deux fois.
  case $t in
    test46-lecteur.mjs|instruments/e2e.mjs|test47-casse-lecteur.mjs)
      if grep -q 'ÉCHEC' $A/$nom.out; then
        mv $A/$nom.out $A/$nom.premier-passage
        echo "=== $t (rejoué une fois : $(grep -c 'ÉCHEC' $A/$nom.premier-passage) échec(s) au premier passage, voir $nom.premier-passage)" > $A/$nom.out
        passer $t $A/$nom.out
      fi ;;
  esac
done
(cd "$E/ecriture" && timeout 1800 sh lancer.sh > $A/ecriture_lancer.sh.out 2>&1; echo "exit $?" >> $A/ecriture_lancer.sh.out)
fi
if [ $P = 2 ]; then
# Les sondes de la vérification du lot 3 (lot3/verif : appareils, conformité,
# données, sorties) ; chacune depuis son dossier, comme elle a été écrite
for t in $(ls lot3/verif/appareils/*.mjs lot3/verif/conformite/*.mjs lot3/verif/donnees/*.mjs lot3/verif/sorties/*.mjs | grep -v '/lib.mjs'); do
  nom=$(echo $t | tr '/' '_')
  echo "=== $t" > $A/$nom.out
  (cd "$E/$(dirname $t)" && timeout 900 node $(basename $t)) >> $A/$nom.out 2>&1
  echo "exit $?" >> $A/$nom.out
done
# Les essais vitest qui ne sont pas dans npm test (chaque dossier vt a sa
# configuration, qui ne prend que ses fichiers)
for d in lot3/verif/donnees/vt lot3/critique/vt lot3/spec/vt lot3/finale/vt lot3/P7/vt lot5/corrections-regressions/vt; do
  nom=vitest_$(echo $d | tr '/' '_')
  echo "=== vitest $d" > $A/$nom.out
  (cd "$R" && timeout 1800 npx vitest run --config "$E/$d/vitest.config.mjs") >> $A/$nom.out 2>&1
  echo "exit $?" >> $A/$nom.out
done
# Les sondes de la vérification du lot 4 (appareils, conformité, migration,
# régressions et np, sauvegardes)
sh "$E/lot4/verif/batterie.sh" $A > $A/verif_batterie.log 2>&1
# Les sondes de la vérification du lot 5 (lot5/verif : affichage, appareils,
# conformité, données, et ses essais vitest), et les essais du contrôle final
# du lot 5 (lot5/cf) : environ 15 minutes ; ce qui en est laissé de côté, et
# pourquoi, est dit en tête de lot5/cf/sondes-verif.sh
sh "$E/lot5/cf/sondes-verif.sh" $A > $A/verif5_batterie.log 2>&1
fi
[ -n "$PAGES" ] && kill $PAGES
kill $DEV
# Le serveur de développement d'avant revient (ordinaire : il recharge à chaud)
if [ -n "$AVANT" ]; then
  sleep 1
  (cd "$R" && nohup node node_modules/vite/bin/vite.js --port 5173 --strictPort > $A/vite-5173-apres.log 2>&1 &)
fi
# Un échec : « ÉCHEC », « ✗ », ou « DÉFAUT » en tête de ligne (ce qu'écrivent lot1/verif/lib.mjs et
# appareils.mjs ; le libellé « [DÉFAUT] » d'un essai réussi de test47 n'en est pas un) ; pour
# vitest, un essai raté (« × » en tête de ligne) ou un fichier raté (« FAIL »)
for f in $B/partie*/*.out; do echo "$(basename $(dirname $f))/$(basename $f .out) : $(tail -1 $f) ; échecs : $(grep -c 'ÉCHEC\|^DÉFAUT\|✗\|^ *× \|^ FAIL ' $f)"; done > $B/RESUME.txt
for f in $(ls $B/partie*/*.premier-passage 2>/dev/null); do echo "(rejoué une fois : $(basename $f .premier-passage), $(grep -c 'ÉCHEC' $f) échec(s) au premier passage : $(grep 'ÉCHEC' $f | head -2 | cut -c1-160 | tr '\n' ' '))"; done >> $B/RESUME.txt
echo "partie $P finie : $(grep -c 'exit 0 ; échecs : 0' $B/RESUME.txt) lignes vertes sur $(grep -c ' : ' $B/RESUME.txt)"
grep -v 'exit 0 ; échecs : 0' $B/RESUME.txt
