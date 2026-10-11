// Tout l'état de la partie vit dans cet objet, et nulle part ailleurs.
// Règles : uniquement des données simples (pas d'objet Three.js, pas de DOM),
// pour que la sauvegarde se résume à JSON.stringify(state).

import { REGLAGES, type CultureId } from './reglages';

export type Saison = 'printemps' | 'ete' | 'automne' | 'hiver';

export interface Plante {
  culture: CultureId;
  /** 0 = graine semée ; augmente de 1 par nuit arrosée ; mûre à joursDePousse. */
  stade: number;
}

export interface Parcelle {
  bechee: boolean;
  arrosee: boolean;
  plante: Plante | null;
}

export interface GameState {
  version: number;
  jour: number;
  saison: Saison;
  argent: number;
  tailleTerrain: number;
  /** Parcelles rangées ligne par ligne. */
  parcelles: Parcelle[];
  graines: Record<CultureId, number>;
  recoltes: Record<CultureId, number>;
}

export function nouvellePartie(): GameState {
  const taille = REGLAGES.tailleTerrain;
  const parcelles: Parcelle[] = [];
  for (let i = 0; i < taille * taille; i++) {
    parcelles.push({ bechee: false, arrosee: false, plante: null });
  }
  return {
    version: 1,
    jour: 1,
    saison: 'printemps',
    argent: REGLAGES.argentDepart,
    tailleTerrain: taille,
    parcelles,
    graines: { radis: REGLAGES.grainesDepart },
    recoltes: { radis: 0 },
  };
}
