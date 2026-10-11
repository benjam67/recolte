# Ferme aux chats — instructions pour Claude

Jeu de ferme cosy en vue isométrique, joué en paysage sur téléphone. Un chat bipède cultive fruits,
légumes et fleurs, les vend, agrandit son terrain et améliore ses outils. La référence complète est
`docs/roadmap.md` : la relire avant toute décision de conception.

## Où on en est

- Phase 0 (mise en place) : faite quand le cube s'affiche sur le téléphone via un lien.
- Phase suivante : 1, boucle de base, en formes grises (pas d'images définitives avant la fin de la phase 1).

Mettre cette section à jour à la fin de chaque session.

## Commandes

- `npm run dev` : lance le jeu (l'adresse « Network » s'ouvre sur un téléphone du même wifi)
- `npm run build` : vérifie les types puis construit dans `dist/`. Doit passer avant chaque commit.

## Règles d'architecture

1. **Un seul objet d'état.** Tout l'état de la partie (parcelles, inventaire, argent, jour, saison) vit
   dans `GameState` (`src/game/state.ts`). Données simples uniquement : jamais d'objet Three.js ni de DOM
   dedans. La sauvegarde = `JSON.stringify(state)`.
2. **Les règles du jeu ne connaissent pas l'affichage.** `src/game/` n'importe ni `three` ni le DOM.
   `src/render/` lit l'état et dessine ; il ne le modifie pas.
3. **Les réglages dans un fichier de données.** Prix, durées de pousse, coûts : un seul fichier
   (`src/game/reglages.ts`, à créer en phase 1), modifiable sans toucher au code.
4. **Menus en HTML/CSS** dans `#ui`, par-dessus le canvas. Pas de menus dessinés en 3D.
5. **La caméra ne tourne jamais.** Orthographique, fixe. Plantes et décorations sont des images debout.
6. **Téléphone d'abord.** Paysage, tactile (toucher l'endroit où aller), peu d'objets à l'écran,
   pixel ratio plafonné à 2.

## Règles de travail

- Une session = une fonctionnalité, petite et testable sur téléphone.
- Proposer le plan avant de coder ; attendre la validation.
- Rien n'est ajouté hors de la roadmap avant la fin de la phase 5.
- Pas de nouvelle fonctionnalité pendant une correction de bug.
- Commit Git dès que ça marche.
- Code et commentaires en français, simples : le propriétaire du projet n'est pas développeur.
- Clé fal.ai : uniquement dans `.env` (exclu de Git), jamais dans le code du jeu.
