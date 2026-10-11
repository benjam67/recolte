# Ferme aux chats — instructions pour Claude

Jeu de ferme cosy en vue isométrique, joué en paysage sur téléphone. Un chat bipède cultive fruits,
légumes et fleurs, les vend, agrandit son terrain et améliore ses outils. La référence complète est
`docs/roadmap.md` : la relire avant toute décision de conception.

## Où on en est

Les phases 0 à 5 sont codées. **Aucune n'a encore été testée par le joueur sur son téléphone** : les trois
points de décision de la roadmap (fin des phases 1, 2 et 6) restent à passer.

- Phase 1, boucle de base : faite.
- Phase 2, style visuel : faite sauf les images générées. Toutes les images (plantes, produits, recettes,
  décorations, arbres) sont dessinées par le code dans `src/render/dessins.ts`, en attendant fal.ai.
  Le guide de style et le modèle de prompt sont dans `docs/guide-de-style.md`.
- Phase 3, économie : faite. Les prix sont des propositions, à régler en jouant.
- Phase 4, saisons et météo : faite.
- Phase 5, atelier et décoration : faite.
- Phase 6 (tutoriel, sons, équilibrage) et phase 7 (stores) : pas commencées. Seuls quelques conseils
  s'affichent pendant les trois premiers jours.

Décisions prises par défaut, à confirmer par le joueur : contrôle au toucher ; hiver avec ses trois
cultures ; français seul ; chat gris à foulard rouge et chatte rousse à fleur rose ; une graine ne peut
pas être semée s'il reste trop peu de nuits pour qu'elle mûrisse ; la neige n'arrose pas.

Mettre cette section à jour à la fin de chaque session.

## Où sont les choses

- `src/game/reglages.ts` : tous les chiffres (prix, durées, chances de pluie, liste des cultures…).
- `src/game/state.ts` : l'objet d'état. `src/game/actions.ts` : les règles. `src/game/terrain.ts` : la carte.
- `src/render/` : scène, décor, chat, météo, ambiance (couleurs par saison), dessins provisoires.
- `src/ui/` : compteurs (`hud.ts`) et menus (`menus.ts`). `src/sauvegarde.ts` : sauvegarde locale.
- `src/main.ts` : relie le tout (touchers, déplacements du chat, nuit, mode décoration).

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
   Changer la forme de `GameState` impose d'augmenter `VERSION_SAUVEGARDE`.
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
