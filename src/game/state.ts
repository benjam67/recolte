// Tout l'état de la partie vit dans cet objet, et nulle part ailleurs.
// Règles : uniquement des données simples (pas d'objet Three.js, pas de DOM),
// pour que la sauvegarde se résume à JSON.stringify(state).

export type Saison = 'printemps' | 'ete' | 'automne' | 'hiver';

export interface GameState {
  version: number;
  jour: number;
  saison: Saison;
  argent: number;
}

export function nouvellePartie(): GameState {
  return {
    version: 1,
    jour: 1,
    saison: 'printemps',
    argent: 0,
  };
}
