#!/bin/sh
# Les sondes de la vérification du lot 4 (lot4/verif/**) dans la batterie
# (lancé par essais/navigateur/tout.sh, partie 2). Chaque passage les branche
# sur ce que le dépôt est :
# - la version d'un seul fichier ($R/dist) et la version en ligne
#   ($R/dist-pages), que tout.sh vient de construire ;
# - la version en ligne AVEC window.__app (sorties/builds/nouveau-dev),
#   reconstruite ici (lot4/cf/vite-dev-pages.config.mjs).
# Les dossiers que lisent les sondes (appareils/dist, conformite/dist,
# sauvegardes/dist, dist-pages, migration/site/nouveau*, migration/build/
# nouveau-seul) sont des liens vers ces versions, refaits ici (ignorés par
# git). Puis chaque sonde, depuis son dossier (comme elle a été écrite), et
# np/lancer.sh (les essais des lots 1 à 3 dans un classeur qui n'est pas le
# premier).
# (Rangé dans le dépôt : les sondes qui comparaient à la version d'avant le
# lot 4, construite depuis un commit qui n'existe plus, sont retirées, et le
# serveur de cette version sur :5174 avec elles ; voir essais/navigateur/README.md.)
# Usage : sh lot4/verif/batterie.sh [dossier des sorties]
E=$(cd "$(dirname "$0")/../.." && pwd)    # essais/navigateur
R=$(cd "$E/../.." && pwd)                 # la racine du dépôt
V=$E/lot4/verif
CF=$E/lot4/cf
BUILDS=$E/sorties/builds
A=${1:-$E/sorties/lot4-verif}
mkdir -p $A $BUILDS

# 1. La version en ligne avec window.__app, depuis le dépôt
(cd "$R" && SORTIE=$BUILDS/nouveau-dev node node_modules/vite/bin/vite.js build --config "$CF/vite-dev-pages.config.mjs") > $A/verif_0-build-dev.out 2>&1
echo "exit $?" >> $A/verif_0-build-dev.out

# 2. Les liens vers ces versions
lier() {  # lier <cible> <lien>
  mkdir -p "$(dirname "$2")"
  rm -rf "$2"; ln -s "$1" "$2"
}
lier $R/dist-pages $V/migration/site/nouveau
lier $BUILDS/nouveau-dev $V/migration/site/nouveau-dev
lier $R/dist $V/migration/build/nouveau-seul
for d in appareils conformite sauvegardes; do lier $R/dist $V/$d/dist; done
for d in appareils sauvegardes; do lier $R/dist-pages $V/$d/dist-pages; done

# 3. Les sondes (pas les outils communs qu'elles importent)
for t in $(cd $V && ls appareils/*.mjs conformite/*.mjs migration/*.mjs regressions/*.mjs sauvegardes/*.mjs | grep -v '/commun\.mjs$\|/outils\.mjs$\|/faux-google\.mjs$\|/google\.mjs$'); do
  nom=verif_$(echo $t | tr '/' '_')
  echo "=== lot4/verif/$t" > $A/$nom.out
  # (les sondes du disque, sauvegardes/sonde-*, prennent leur dossier, comme lancées alors)
  case $t in sauvegardes/sonde-*) ARG=$V/sauvegardes ;; *) ARG= ;; esac
  (cd $V/$(dirname $t) && timeout 900 node $(basename $t) $ARG) >> $A/$nom.out 2>&1
  echo "exit $?" >> $A/$nom.out
done
(cd $V/regressions/np && timeout 7200 sh lancer.sh) > $A/verif_regressions_np_lancer.sh.out 2>&1
echo "exit $?" >> $A/verif_regressions_np_lancer.sh.out
# (les sorties de np, une par essai, dans sorties/np : leurs échecs comptent)
# (un essai rejoué une fois y laisse son premier passage : le résumé le dira)
for f in $E/sorties/np/sorties/*.out $E/sorties/np/sorties/*.premier-passage; do [ -f "$f" ] && cp $f $A/verif_np_$(basename $f); done
exit 0
