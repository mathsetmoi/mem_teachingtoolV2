#!/bin/sh
# Le banc d'écriture, de bout en bout. Le serveur de développement doit tourner :
#   npx vite --port 5173 --strictPort   (depuis la racine du dépôt ; tout.sh le lance)
set -e
cd "$(dirname "$0")"
node banc.mjs            # direct + film élève (.mem) + revoir.html + revue Normal/Rapide → mesures.json, banc.mem
node analyse.mjs         # chronologie des traits, retards, vitesses, pixels (→ resume.json)
node rendu-seul.mjs      # forme du trait partiel : direct / replay actuel / proposition (→ rendu-seul.json)
node taille.mjs          # poids des temps par point (.mem et document Yjs)
node perf.mjs            # coût d'une image du lecteur, « téléphone » ×1 et ×4 (→ perf.json)
node visuel.mjs          # planche.png, courbes.png
node lent.mjs            # trait lent coupé ; grand O reconnu en cercle
