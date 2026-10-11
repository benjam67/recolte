# Roadmap — jeu de ferme aux chats

Oct 11, 2026 · @Benjam

## Le jeu en bref

Un jeu de ferme cosy en vue isométrique, joué en paysage sur téléphone. Un chat qui marche sur deux pattes cultive des fruits, des légumes et des fleurs, les vend au marché, puis agrandit son terrain et améliore ses outils.

| Sujet | Décision prise |
| --- | --- |
| Rythme | Journées de jeu sans limite d'énergie ; le temps n'avance que lorsque le chat va se coucher |
| Vue | Isométrique fixe, avec un avatar qui se déplace |
| Avatar | Chat bipède, masculin ou féminin au choix du joueur |
| Rendu | Hybride : sol, bâtiments et avatar en 3D simple ; plantes, objets et décorations en images posées debout |
| Vente | Depuis l'inventaire, à prix fixes ; le marché n'est pas un lieu du jeu |
| Au-delà de la boucle de base | Saisons et météo, transformation des récoltes, décoration |
| Orientation | Paysage |
| Plateformes | Web d'abord, puis app iOS et Android avec le même code |
| Modèle économique | Non décidé ; tranché après les tests de la phase 6 |

## Boucle de jeu

Une partie se joue journée par journée : le chat travaille autant qu'il veut, puis va se coucher. Les valeurs chiffrées ci-dessous sont des propositions de départ, à régler en jouant.

1. **Réveil.** La météo du jour s'affiche. Les cultures arrosées la veille ont avancé d'un stade pendant la nuit.
2. **Champs.** Bêcher, semer, arroser, récolter.
3. **Atelier.** Transformer une partie de la récolte pour la vendre plus cher.
4. **Inventaire.** Vendre la récolte et acheter graines, outils, terrain et décorations depuis le menu, sans se déplacer.
5. **Coucher.** Il n'y a pas d'horloge : le joueur fait avancer le temps en allant se coucher, quand il veut, même juste après avoir arrosé. Une courte animation montre le soleil laisser place à la lune, la nuit tomber, puis le soleil se lever et le chat se réveiller. La partie est sauvegardée et le jour suivant commence.

**Exemple.** Jour 1 : semer et arroser, puis dormir. Jour 2 : les graines ont germé ; arroser, puis dormir. Jour 3 : récolter et vendre.

**Saisons.** Quatre saisons de 7 jours, soit une année de 28 jours de jeu. Chaque culture ne pousse qu'à sa saison. Un jour de pluie arrose toutes les parcelles.

**Progression.** L'argent sert à trois choses utiles et une de plaisir :

- **Terrain** : plus de parcelles à cultiver.
- **Outils** : un outil amélioré traite plusieurs cases d'un seul geste.
- **Atelier** : de nouvelles recettes.
- **Décoration** : embellir la ferme, sans effet sur le jeu.

## Choix techniques

Le jeu est une application web dès le premier jour ; l'app mobile est ce même site emballé à la fin, sans réécriture.

| Besoin | Choix | Pourquoi |
| --- | --- | --- |
| Scène 3D | Three.js, caméra orthographique | La bibliothèque 3D web la plus répandue, donc celle sur laquelle Claude se trompe le moins |
| Langage | TypeScript | Beaucoup d'erreurs sont signalées avant même de lancer le jeu |
| Lancement et assemblage | Vite | Une commande pour lancer le jeu, rechargement immédiat à chaque modification |
| Menus, inventaire, boutique | HTML et CSS par-dessus la scène | Tu connais déjà ; bien plus simple que des menus dessinés en 3D |
| Sauvegarde | Locale, sur l'appareil | Aucun serveur à gérer ; une sauvegarde en ligne ne devient utile que si le jeu passe en gratuit avec achats |
| Historique du code | Git et GitHub | Revenir en arrière quand une session casse quelque chose |
| Lien de test | Hébergement statique gratuit (GitHub Pages, Netlify ou équivalent) | Un lien à ouvrir sur ton téléphone après chaque session |
| Passage en app | Capacitor | Emballe le site dans une app iOS et Android |

**Une règle d'architecture à imposer dès la phase 1.** Tout l'état de la partie (parcelles, inventaire, argent, jour, saison) vit dans un seul objet de données, séparé de l'affichage. La sauvegarde se résume alors à enregistrer cet objet, et changer le rendu ne casse pas les règles du jeu.

## Direction artistique

Le décor et le chat sont en vraie 3D très simple ; tout ce qui demande du détail est une image générée, posée debout face à la caméra. La caméra ne tourne jamais, sinon on verrait que les plantes sont plates.

| Élément | Technique |
| --- | --- |
| Sol, parcelles, chemins | 3D, formes simples, couleurs unies |
| Maison, atelier | 3D, formes simples arrondies |
| Chat | 3D, formes simples, animé par le code |
| Plantes à chaque stade de pousse | Image posée debout |
| Arbres, buissons, décorations | Image posée debout |
| Produits, outils, icônes des menus | Image à plat dans l'interface |
| Saisons, météo, passage de la nuit | Lumière et teintes changées par le code, soleil et lune animés pendant le sommeil ; particules pour la pluie et la neige |

### Les chats

Deux personnages proposés au début de la partie, un masculin et un féminin, sans différence de jeu entre eux. Chacun est fait de quelques volumes : grosse tête ronde, oreilles triangulaires, corps en capsule, queue. La marche est un balancement avec un petit rebond, ce qui évite les animations complexes. Le visage (yeux, museau, moustaches) est une image collée sur la tête.

### Règles pour les images générées

La cohérence entre images est le principal risque visuel du projet. Six règles la tiennent :

1. Une image de référence fixe le style (palette, contour, ombrage) et accompagne chaque génération.
2. Même angle pour tout : vue de trois quarts légèrement plongeante, accordée à la caméra du jeu.
3. Lumière toujours du même côté, en haut à gauche.
4. Pas d'ombre au sol dans l'image : c'est le jeu qui la dessine.
5. Fond transparent, sujet entier et centré, format carré.
6. Un seul modèle de prompt, dont seul le sujet change.

**Outil.** Les images sont générées avec fal.ai, que Claude appelle depuis un script du projet : même prompt de style, même image de référence, fichiers rangés au bon endroit. La clé d'accès reste dans un fichier local exclu de Git ; elle ne figure ni dans le code du jeu ni dans le dépôt GitHub.

La première version demande environ 80 images ; le décompte est dans la section Contenu.

## Roadmap

Huit phases, chacune terminée par un résultat que tu peux vérifier toi-même sur ton téléphone. On ne passe à la suivante que lorsque ce résultat est atteint.

&#91;embedded content: roadmap · 8 phases, 3 décisions\]

Les losanges marquent les trois moments où tu décides de continuer, de corriger ou de changer de cap. Les deux premiers arrivent tôt exprès : inutile de produire 78 images pour un jeu qui n'amuse pas.

| Phase | On construit | C'est fini quand | Charge |
| --- | --- | --- | --- |
| 0. Mise en place | Projet Three.js, TypeScript et Vite ; dépôt GitHub ; mise en ligne automatique ; fichier d'instructions | Un cube en vue isométrique s'affiche sur ton téléphone via un lien | Petite |
| 1. Boucle de base | Un chat en capsule qui se déplace ; une culture ; bêcher, semer, arroser, récolter ; dormir pour passer au jour suivant ; vente par un bouton | Tu enchaînes 5 journées sans bug et tu as envie d'en jouer une sixième | Moyenne |
| 2. Style visuel | Les deux chats définitifs ; 3 cultures avec leurs vraies images ; lumière, sol, maison ; animation de la nuit ; guide de style et modèle de prompt | Une capture d'écran que tu as envie de montrer | Moyenne |
| 3. Économie | Vente depuis l'inventaire et boutique dans le menu ; outils à 3 niveaux ; 4 tailles de terrain ; choix du personnage ; sauvegarde ; fichier de réglages | Du premier radis au deuxième terrain en une heure environ ; la partie survit à la fermeture du navigateur | Grosse |
| 4. Saisons, météo | Calendrier ; 4 saisons ; les 12 cultures ; pluie et neige ; teintes par saison | Une année complète se joue sans blocage | Moyenne |
| 5. Atelier et déco | Atelier et 6 recettes ; 15 décorations à placer | Chaque culture sert dans une recette ; une ferme décorée se sauvegarde | Moyenne |
| 6. Finition | Tutoriel ; sons et musique ; menus et réglages ; équilibrage ; performance | 5 personnes extérieures jouent 20 minutes sans aide | Grosse |
| 7. App et stores | Emballage avec Capacitor ; icône, captures, fiches des stores ; tests ; publication | Le jeu est téléchargeable sur les deux stores | Moyenne |

### Ce que demandent les stores

| Store | Coût du compte | Contrainte à anticiper |
| --- | --- | --- |
| App Store ([Apple](https://developer.apple.com/support/compare-memberships)) | 99 USD par an | Un Mac avec Xcode pour construire l'app |
| Google Play ([inscription](https://support.google.com/googleplay/android-developer/answer/6112435), [tests](https://support.google.com/googleplay/android-developer/answer/14151465)) | 25 USD, une seule fois | Compte personnel : test fermé avec 12 testeurs inscrits 14 jours d'affilée avant de publier, et vérification d'un appareil Android |

Recrute les 12 testeurs Android pendant la phase 6 : ce sont les mêmes personnes que pour les tests de jeu.

## Contenu de la première version

La première version contient 12 cultures, 6 recettes, 3 outils à 3 niveaux, 4 tailles de terrain et une quinzaine de décorations. Ce sont des propositions : change les noms et les quantités à ta guise.

### Cultures

Un fruit, un légume et une fleur par saison, pour que chaque saison offre les trois familles.

| Saison | Fruit | Légume | Fleur |
| --- | --- | --- | --- |
| Printemps | Fraise | Radis | Tulipe |
| Été | Melon | Tomate | Tournesol |
| Automne | Raisin | Citrouille | Dahlia |
| Hiver | Clémentine | Poireau | Perce-neige |

Les durées de pousse (de 2 à 5 jours) et les prix se règlent en phase 3, dans un seul fichier de données.

### Recettes de l'atelier

Les recettes portent sur une famille et non sur une culture précise : six recettes couvrent ainsi les douze cultures.

| Recette | Ingrédients |
| --- | --- |
| Jus | 2 fruits |
| Confiture | 3 fruits |
| Bocal de légumes | 2 légumes |
| Soupe | 3 légumes |
| Sachet de fleurs séchées | 2 fleurs |
| Bouquet | 3 fleurs |

### Outils et terrain

| Élément | Niveau 1 | Niveau 2 | Niveau 3 | Niveau 4 |
| --- | --- | --- | --- | --- |
| Bêche, arrosoir, panier | 1 case par action | 3 cases en ligne | 9 cases en carré |  |
| Terrain | 9 parcelles (3 × 3) | 16 parcelles (4 × 4) | 25 parcelles (5 × 5) | 36 parcelles (6 × 6) |

### Images à produire

| Lot | Calcul | Images |
| --- | --- | --- |
| Cultures | 12 cultures × (3 stades de pousse + 1 icône de produit) | 48 |
| Recettes | 6 icônes | 6 |
| Outils | 3 outils × 3 niveaux | 9 |
| Décorations | Clôtures, bancs, lanternes, pots, épouvantail… | 15 |
| Total |  | 78 |

## Méthode de travail avec Claude

Une session de travail produit une seule fonctionnalité, petite et testable sur ton téléphone. Sept habitudes évitent la plupart des impasses du vibecoding :

1. **Un fichier d'instructions à la racine du projet** (`CLAUDE.md` avec Claude Code). Il résume le jeu, les décisions de ce document et les règles de code. Claude le relit à chaque session.
2. **Le plan avant le code.** Demande d'abord à Claude ce qu'il compte faire, valide, puis laisse-le coder.
3. **Tester sur le téléphone à chaque fin de session**, pas seulement sur l'ordinateur.
4. **Enregistrer dans Git dès que ça marche.** C'est ton bouton « annuler » quand la session suivante casse quelque chose.
5. **Une chose à la fois.** Pas de nouvelle fonctionnalité pendant qu'on corrige un bug, pas d'images définitives avant la fin de la phase 1.
6. **Les réglages dans un fichier de données.** Prix, durées de pousse, coûts d'achat : tu les modifies toi-même, sans toucher au code.
7. **En cas d'erreur, copier le message exact** de la console du navigateur dans la conversation, plutôt que de décrire le problème.

## Risques et décisions ouvertes

Le risque le plus sérieux est visuel : des images générées qui ne vont pas ensemble. La phase 2 existe pour le lever avant de produire les 78 images.

| Risque | Parade |
| --- | --- |
| Les images générées manquent de cohérence | Guide de style et image de référence fixés en phase 2 ; solution de repli : packs low-poly gratuits |
| Le chat en formes simples n'est pas assez mignon | Jugé en phase 2 ; solution de repli : un modèle 3D de chat tout fait, avec ses animations |
| Le projet grossit sans fin | Rien n'est ajouté hors de ce document avant la fin de la phase 5 |
| Le jeu rame sur téléphone | Test sur un vrai téléphone dès la phase 0 ; images légères, peu d'objets à l'écran |
| Le code devient impossible à faire évoluer | État du jeu séparé de l'affichage, sessions courtes, enregistrement Git à chaque étape |
| Le jeu n'est pas amusant | Vérifié dès la phase 1, en formes grises, avant tout travail visuel |

### À décider

- [ ] Nom du jeu
- [ ] Ce qui distingue les deux chats (pelage, tenue) et ce que le joueur peut personnaliser
- [ ] Contrôles : toucher l'endroit où aller, ou joystick à l'écran. Recommandation : toucher, qui marche aussi à la souris pour les tests web
- [x] Outil de génération d'images : fal.ai
- [x] Durée d'une journée : pas d'horloge, la journée finit quand le chat se couche
- [ ] Hiver : trois cultures d'hiver comme proposé, ou saison de repos consacrée à l'atelier et à la décoration
- [ ] Langues : français seul, ou français et anglais
- [ ] Accès à un Mac pour la version iPhone, et à un téléphone Android pour la version Android
- [ ] Modèle économique, après les tests de la phase 6
