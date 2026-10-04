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

## Ce que fait la v0.1

Côté prof : stylo sensible à la pression, surligneur, gomme, segments (Maj pour
les angles de 15°, aimant au quadrillage), formules LaTeX avec aperçu et
raccourcis, sélection et déplacement, annuler/rétablir, pages, fonds (blanc,
petits carreaux, Seyès, repère gradué), zoom de 10 % à 2000 %.

Côté élève : le lien du prof, un prénom, et l'élève suit la page et le cadrage du
prof. S'il se déplace lui-même, un bouton le ramène. Le prof décide si les élèves
peuvent écrire ; leurs traits apparaissent en direct, avec leur prénom au curseur.

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
2. Instruments : règle, équerre, rapporteur, compas qui tracent.
3. Import d'un PDF ou d'une image comme fond de page (annoter un énoncé).
4. Formes mathématiques : courbe de fonction, tableau de variations, droite graduée.
5. Sécurité du serveur : jeton prof, durée de vie des salles.
6. Lecteur qui rejoue la construction du tableau.
