// Tous les réglages du jeu sont ici. Tu peux changer ces valeurs sans toucher au reste du code.

export const REGLAGES = {
  /** Côté du terrain, en parcelles (3 = 9 parcelles). */
  tailleTerrain: 3,
  argentDepart: 0,
  grainesDepart: 5,

  cultures: {
    radis: {
      nom: 'Radis',
      /** Nombre de nuits arrosées avant de pouvoir récolter. */
      joursDePousse: 2,
      prixGraine: 5,
      prixVente: 12,
    },
  },
} as const;

export type CultureId = keyof typeof REGLAGES.cultures;
