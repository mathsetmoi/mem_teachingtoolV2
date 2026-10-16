#!/bin/sh
# Les sondes de la vérification du lot 5 (lot5/verif/**) et les essais du
# contrôle final du lot 5 (lot5/cf/*.mjs) : lancé par essais/navigateur/
# tout.sh, partie 2 (environ 15 minutes en tout). Chaque sonde depuis son
# dossier, comme elle a été écrite, avec sa durée. Il faut le serveur de
# développement sur :5173 (tout.sh le lance) et les deux versions du dépôt
# ($R/dist, $R/dist-pages), que tout.sh vient de construire.
# Laissées de côté, et pourquoi (contrôle final du lot 5) :
# - les sondes de mesure ou de diagnostic, sans vérification
#   (regressions/perf/*, regressions/sondes/*, regressions/b045/*) : elles ne
#   sont pas rangées dans le dépôt ;
# - conformite/t25-membre-clavier : elle reproduisait un défaut corrigé
#   depuis (corrections-conformite.mjs vérifie la correction) ;
# - affichage/formule-zoom : lot5/cf/formule-2000.mjs la remplace (le
#   milieu d'un glyphe, lu dans le DOM, à 100, 400 et 2000 %).
# Rangé dans le dépôt, sans les essais qui comparaient à la version d'avant le
# lot 5 (construite depuis un commit qui n'existe plus) : appareils/sonde-
# menu-fichier2, sonde-trieuse, conformite/t14-ancien-tel, t21-memc-avant,
# cf/aller-retour (voir essais/navigateur/README.md).
# Usage : sh lot5/cf/sondes-verif.sh <dossier des sorties>
E=$(cd "$(dirname "$0")/../.." && pwd)    # essais/navigateur
R=$(cd "$E/../.." && pwd)                 # la racine du dépôt
V=$E/lot5/verif
A=${1:-$E/sorties/lot5-verif}
mkdir -p $A
LISTE=$(cd $V && ls affichage/*.mjs appareils/*.mjs conformite/*.mjs donnees/*.mjs)
for t in $LISTE; do
  nom=verif5_$(echo $t | tr '/' '_')
  echo "=== lot5/verif/$t" > $A/$nom.out
  d0=$(date +%s)
  (cd $V/$(dirname $t) && timeout 900 node $(basename $t)) >> $A/$nom.out 2>&1
  e=$?
  echo "(durée : $(( $(date +%s) - d0 )) s)" >> $A/$nom.out
  echo "exit $e" >> $A/$nom.out
done
# d2 (les fichiers que d1 vient d'écrire) et les essais vitest de la vérification
for d in lot5/verif/donnees/vt lot5/verif/regressions/vt; do
  nom=vitest_$(echo $d | tr '/' '_')
  echo "=== vitest $d" > $A/$nom.out
  (cd "$R" && timeout 1800 npx vitest run --config "$E/$d/vitest.config.mjs") >> $A/$nom.out 2>&1
  echo "exit $?" >> $A/$nom.out
done
# Les essais du contrôle final du lot 5 : la formule nette à 2000 %, la
# pastille et le nom du sommet du haut, le premier trait du crayon
for t in formule-2000 nom-pastille crayon; do
  nom=cf_$t.mjs
  echo "=== lot5/cf/$t.mjs" > $A/$nom.out
  d0=$(date +%s)
  (cd "$E" && timeout 900 node lot5/cf/$t.mjs) >> $A/$nom.out 2>&1
  e=$?
  echo "(durée : $(( $(date +%s) - d0 )) s)" >> $A/$nom.out
  echo "exit $e" >> $A/$nom.out
done
exit 0
