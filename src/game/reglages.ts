// Tous les réglages du jeu sont ici : prix, durées, coûts.
// Tu peux changer ces valeurs toi-même sans toucher au reste du code.

export type Saison = 'printemps' | 'ete' | 'automne' | 'hiver';
export type Famille = 'fruit' | 'legume' | 'fleur';
export type Meteo = 'soleil' | 'pluie' | 'neige';

export const SAISONS: Saison[] = ['printemps', 'ete', 'automne', 'hiver'];
export const NOMS_SAISONS: Record<Saison, string> = {
  printemps: 'Printemps',
  ete: 'Été',
  automne: 'Automne',
  hiver: 'Hiver',
};
export const NOMS_FAMILLES: Record<Famille, string> = { fruit: 'fruit', legume: 'légume', fleur: 'fleur' };

/** Nombre de jours dans une saison (4 saisons = une année). */
export const JOURS_PAR_SAISON = 7;

/** Ce que le joueur possède au tout début. */
export const DEPART = {
  argent: 0,
  graines: { radis: 5 } as Record<string, number>,
};

// ---------------------------------------------------------------- Cultures

interface Culture {
  nom: string;
  famille: Famille;
  saison: Saison;
  /** Nombre de nuits arrosées avant de pouvoir récolter. */
  joursDePousse: number;
  prixGraine: number;
  prixVente: number;
}

export const CULTURES = {
  // Printemps
  radis: { nom: 'Radis', famille: 'legume', saison: 'printemps', joursDePousse: 2, prixGraine: 5, prixVente: 12 },
  tulipe: { nom: 'Tulipe', famille: 'fleur', saison: 'printemps', joursDePousse: 3, prixGraine: 12, prixVente: 30 },
  fraise: { nom: 'Fraise', famille: 'fruit', saison: 'printemps', joursDePousse: 4, prixGraine: 20, prixVente: 52 },
  // Été
  tomate: { nom: 'Tomate', famille: 'legume', saison: 'ete', joursDePousse: 3, prixGraine: 15, prixVente: 36 },
  tournesol: { nom: 'Tournesol', famille: 'fleur', saison: 'ete', joursDePousse: 4, prixGraine: 22, prixVente: 56 },
  melon: { nom: 'Melon', famille: 'fruit', saison: 'ete', joursDePousse: 5, prixGraine: 35, prixVente: 90 },
  // Automne
  dahlia: { nom: 'Dahlia', famille: 'fleur', saison: 'automne', joursDePousse: 3, prixGraine: 18, prixVente: 42 },
  raisin: { nom: 'Raisin', famille: 'fruit', saison: 'automne', joursDePousse: 4, prixGraine: 28, prixVente: 68 },
  citrouille: { nom: 'Citrouille', famille: 'legume', saison: 'automne', joursDePousse: 5, prixGraine: 40, prixVente: 100 },
  // Hiver
  perceneige: { nom: 'Perce-neige', famille: 'fleur', saison: 'hiver', joursDePousse: 2, prixGraine: 10, prixVente: 24 },
  poireau: { nom: 'Poireau', famille: 'legume', saison: 'hiver', joursDePousse: 3, prixGraine: 15, prixVente: 38 },
  clementine: { nom: 'Clémentine', famille: 'fruit', saison: 'hiver', joursDePousse: 5, prixGraine: 40, prixVente: 105 },
} as const satisfies Record<string, Culture>;

export type CultureId = keyof typeof CULTURES;
export const IDS_CULTURES = Object.keys(CULTURES) as CultureId[];

// ---------------------------------------------------------------- Météo

/** Chances de pluie et de neige au réveil, par saison (0.3 = 3 jours sur 10). */
export const CHANCES_METEO: Record<Saison, { pluie: number; neige: number }> = {
  printemps: { pluie: 0.3, neige: 0 },
  ete: { pluie: 0.15, neige: 0 },
  automne: { pluie: 0.35, neige: 0 },
  hiver: { pluie: 0.1, neige: 0.35 },
};

/** Quelle météo arrose toutes les parcelles bêchées au réveil. */
export const METEO_ARROSE: Record<Meteo, boolean> = { soleil: false, pluie: true, neige: false };

// ---------------------------------------------------------------- Outils et terrain

export const OUTILS = {
  beche: { nom: 'Bêche', verbe: 'bêche' },
  arrosoir: { nom: 'Arrosoir', verbe: 'arrose' },
  panier: { nom: 'Panier', verbe: 'récolte' },
} as const;
export type OutilId = keyof typeof OUTILS;
export const IDS_OUTILS = Object.keys(OUTILS) as OutilId[];

/** Prix pour passer au niveau 2, puis au niveau 3. */
export const PRIX_NIVEAUX_OUTIL = [150, 500];
export const EFFETS_NIVEAUX_OUTIL = ['1 case par geste', '3 cases en ligne', '9 cases en carré'];

/** Les tailles de terrain, de la première à la dernière. */
export const TERRAINS = [
  { taille: 3, prix: 0 },
  { taille: 4, prix: 250 },
  { taille: 5, prix: 800 },
  { taille: 6, prix: 2000 },
];

// ---------------------------------------------------------------- Atelier

export const PRIX_ATELIER = 300;

interface Recette {
  nom: string;
  famille: Famille;
  /** Nombre d'ingrédients de cette famille. */
  quantite: number;
  /** Le produit vaut la somme des prix des ingrédients, multipliée par ce nombre. */
  multiplicateur: number;
  /** 0 = recette fournie avec l'atelier. */
  prix: number;
}

export const RECETTES = {
  jus: { nom: 'Jus', famille: 'fruit', quantite: 2, multiplicateur: 1.4, prix: 0 },
  confiture: { nom: 'Confiture', famille: 'fruit', quantite: 3, multiplicateur: 1.8, prix: 250 },
  bocal: { nom: 'Bocal de légumes', famille: 'legume', quantite: 2, multiplicateur: 1.4, prix: 0 },
  soupe: { nom: 'Soupe', famille: 'legume', quantite: 3, multiplicateur: 1.8, prix: 250 },
  sachet: { nom: 'Sachet de fleurs séchées', famille: 'fleur', quantite: 2, multiplicateur: 1.4, prix: 0 },
  bouquet: { nom: 'Bouquet', famille: 'fleur', quantite: 3, multiplicateur: 1.8, prix: 250 },
} as const satisfies Record<string, Recette>;

export type RecetteId = keyof typeof RECETTES;
export const IDS_RECETTES = Object.keys(RECETTES) as RecetteId[];

// ---------------------------------------------------------------- Décorations

export const DECORATIONS = {
  cloture: { nom: 'Clôture', prix: 15 },
  pot_rouge: { nom: 'Pot de fleurs rouges', prix: 25 },
  pot_bleu: { nom: 'Pot de fleurs bleues', prix: 25 },
  rocher: { nom: 'Rocher', prix: 20 },
  buisson: { nom: 'Buisson fleuri', prix: 30 },
  panneau: { nom: 'Panneau', prix: 30 },
  tonneau: { nom: 'Tonneau', prix: 40 },
  foin: { nom: 'Botte de foin', prix: 40 },
  banc: { nom: 'Banc', prix: 60 },
  boite: { nom: 'Boîte aux lettres', prix: 60 },
  lanterne: { nom: 'Lanterne', prix: 80 },
  nichoir: { nom: 'Nichoir', prix: 80 },
  sapin: { nom: 'Petit sapin', prix: 90 },
  epouvantail: { nom: 'Épouvantail', prix: 120 },
  puits: { nom: 'Puits', prix: 200 },
} as const;

export type DecoId = keyof typeof DECORATIONS;
export const IDS_DECOS = Object.keys(DECORATIONS) as DecoId[];
