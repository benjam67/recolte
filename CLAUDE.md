# Ferme aux chats — instructions pour Claude

Jeu de ferme cosy en vue isométrique, joué en paysage sur téléphone. Un chat bipède cultive fruits,
légumes et fleurs, les vend, agrandit son terrain et améliore ses outils. La référence complète est
`docs/roadmap.md` : la relire avant toute décision de conception.

## Où on en est

- Phase 0 (mise en place) : faite.
- Phase 1 (boucle de base) : codée, en attente du test du joueur (« 5 journées sans bug et l'envie d'en
  jouer une sixième »). Une culture (radis), geste automatique selon l'état de la parcelle, vente et achat
  par boutons, nuit en fondu. Pas encore de sauvegarde (phase 3).
- Ensuite : corriger ce que le test révèle, puis phase 2 (style visuel).

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
   (`src/game/reglages.ts`), modifiable sans toucher au code.
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
