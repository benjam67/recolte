# Guide de style des images

Les images actuelles sont dessinées par le code (`src/render/dessins.ts`). Elles servent de maquette : elles
fixent la taille, le cadrage et la place de chaque image dans le jeu. Les images générées avec fal.ai les
remplaceront une par une.

## Ce que le jeu attend de chaque image

- PNG carré, fond transparent, 512 × 512 pixels (le jeu les affiche petites : inutile de faire plus grand).
- Sujet entier, centré, **le pied posé en bas de l'image** avec une petite marge (environ 6 % de la hauteur).
- Vue de trois quarts légèrement plongeante, la même que la caméra du jeu.
- Lumière en haut à gauche.
- Pas d'ombre au sol : le jeu dessine la sienne.
- Contour brun foncé, aplats de couleur, un seul reflet clair. Pas de texte.

## Modèle de prompt

Seule la partie entre crochets change d'une image à l'autre.

> [SUJET], cozy farming game asset, single object centered, three-quarter top-down view, soft flat colors,
> thick dark brown outline, one soft highlight, light from the top left, no ground shadow, no background,
> transparent background, no text

Exemples de sujet : « a ripe radish plant growing in soil, pink root showing » ; « a small tulip sprout with two
leaves » ; « a wooden garden bench ».

L'image de référence qui accompagne chaque génération reste à choisir : c'est la première décision de style.
Tant qu'elle n'est pas validée sur 3 cultures, on ne lance pas les 78 images.

## Les 78 images et leurs noms de fichier

À ranger dans `public/images/`.

| Lot | Fichiers | Nombre |
| --- | --- | --- |
| Plantes | `plantes/<culture>-1.png` (petite pousse), `-2.png` (plante moyenne), `-3.png` (mûre) | 36 |
| Produits | `produits/<culture>.png` | 12 |
| Recettes | `recettes/<recette>.png` | 6 |
| Outils | `outils/<outil>-<niveau>.png` | 9 |
| Décorations | `decos/<deco>.png` | 15 |

Cultures : radis, tulipe, fraise, tomate, tournesol, melon, dahlia, raisin, citrouille, perceneige, poireau,
clementine. Recettes : jus, confiture, bocal, soupe, sachet, bouquet. Outils : beche, arrosoir, panier.
Décorations : cloture, pot_rouge, pot_bleu, rocher, buisson, panneau, tonneau, foin, banc, boite, lanterne,
nichoir, sapin, epouvantail, puits.

Hors décompte, dessinés par le code pour l'instant : les graines tout juste semées (une seule image pour
toutes les cultures) et les arbres du décor (un par saison).

## Ce qui reste à faire pour brancher fal.ai

1. Créer la clé fal.ai et la mettre dans un fichier `.env` (déjà exclu de Git).
2. Écrire le script de génération (`scripts/generer-images.mjs`) : il n'existe pas encore, faute de clé pour le tester.
3. Dans `src/render/dessins.ts`, charger les fichiers PNG à la place des dessins.
