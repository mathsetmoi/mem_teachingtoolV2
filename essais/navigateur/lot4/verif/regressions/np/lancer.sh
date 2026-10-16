#!/bin/sh
# Les essais des lots 1 à 3 dans un classeur qui n'est pas le premier (voir
# patcher.py) ; lancé par lot4/verif/batterie.sh (la batterie). Les copies
# modifiées et leurs sorties vont dans essais/navigateur/sorties/np (ignoré
# par git). Comme dans tout.sh, instruments/e2e, qui échoue parfois sur ses
# seuils de temps (la pose rejouée au même instant que le direct, à la
# milliseconde près), est rejoué une fois, et c'est noté (le premier passage
# reste à côté).
E=$(cd "$(dirname "$0")/../../../.." && pwd)    # essais/navigateur
H=$(cd "$(dirname "$0")" && pwd)
N=$E/sorties/np
mkdir -p $N/sorties
rm -f $N/sorties/*.out $N/sorties/*.premier-passage
for f in lot2/M1-prise lot2/M2-zone lot2/M4-page lot2/M5-presse-papiers lot2/M6-menus lot2/M7-barre lot2/M8-gestes lot3/P2-heritage lot3/P3-navigation lot3/P4-apercus lot3/P5-trieuse lot3/P6-trieuse-actions lot3/P7-corbeille-image lot3/P8-envoyer lot3/P9-pdf instruments/e2e lot1/passeA; do
  mkdir -p $N/$(dirname $f)
  python3 $H/patcher.py $E/$f.mjs $N/$f.mjs
  nom=$(echo $f | tr '/' '_')
  (cd $E/$(dirname $f) && timeout 900 node $N/$f.mjs) > $N/sorties/$nom.out 2>&1
  echo "exit $?" >> $N/sorties/$nom.out
  if [ "$f" = instruments/e2e ] && grep -q 'ÉCHEC' $N/sorties/$nom.out; then
    mv $N/sorties/$nom.out $N/sorties/$nom.premier-passage
    echo "=== np/$f (rejoué une fois : $(grep -c 'ÉCHEC' $N/sorties/$nom.premier-passage) échec(s) au premier passage, voir $nom.premier-passage)" > $N/sorties/$nom.out
    (cd $E/$(dirname $f) && timeout 900 node $N/$f.mjs) >> $N/sorties/$nom.out 2>&1
    echo "exit $?" >> $N/sorties/$nom.out
  fi
  echo "$f : $(tail -1 $N/sorties/$nom.out) ; échecs $(grep -c 'ÉCHEC\|✗' $N/sorties/$nom.out)"
done
