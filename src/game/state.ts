// Tout l'état de la partie vit dans cet objet, et nulle part ailleurs.
// Règles : uniquement des données simples (pas d'objet Three.js, pas de DOM),
// pour que la sauvegarde se résume à JSON.stringify(state).

import {
  DEPART,
  IDS_CULTURES,
  IDS_DECOS,
  IDS_RECETTES,
  JOURS_PAR_SAISON,
  SAISONS,
  TERRAINS,
  type CultureId,
  type DecoId,
  type Meteo,
  type OutilId,
  type RecetteId,
  type Saison,
} from './reglages';
import { colonneLigne, TAILLE_MAX } from './terrain';

export const VERSION_SAUVEGARDE = 2;

export type Personnage = 'chat' | 'chatte';

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

export interface DecoPosee {
  id: DecoId;
  x: number;
  z: number;
}

export interface GameState {
  version: number;
  /** null tant que le joueur n'a pas choisi son chat. */
  personnage: Personnage | null;
  /** Le jour depuis le début de la partie (1, 2, 3…). La saison s'en déduit. */
  jour: number;
  meteo: Meteo;
  argent: number;
  /** 0 = terrain de départ (3 × 3), 3 = le plus grand (6 × 6). */
  niveauTerrain: number;
  /** Toujours 36 parcelles (grille 6 × 6) ; seules celles du terrain acheté servent. */
  parcelles: Parcelle[];
  graines: Record<CultureId, number>;
  graineChoisie: CultureId | null;
  recoltes: Record<CultureId, number>;
  /** Produits de l'atelier : combien, et ce qu'ils valent en tout. */
  produits: Record<RecetteId, { quantite: number; valeur: number }>;
  /** Niveau de chaque outil : 1, 2 ou 3. */
  outils: Record<OutilId, number>;
  atelier: boolean;
  recettes: RecetteId[];
  decoStock: Record<DecoId, number>;
  decoPosees: DecoPosee[];
}

function compteurs<K extends string>(ids: K[]): Record<K, number> {
  const r = {} as Record<K, number>;
  for (const id of ids) r[id] = 0;
  return r;
}

export function nouvellePartie(): GameState {
  const parcelles: Parcelle[] = [];
  for (let i = 0; i < TAILLE_MAX * TAILLE_MAX; i++) {
    parcelles.push({ bechee: false, arrosee: false, plante: null });
  }
  const graines = compteurs(IDS_CULTURES);
  for (const id of IDS_CULTURES) graines[id] = DEPART.graines[id] ?? 0;
  const produits = {} as GameState['produits'];
  for (const id of IDS_RECETTES) produits[id] = { quantite: 0, valeur: 0 };

  return {
    version: VERSION_SAUVEGARDE,
    personnage: null,
    jour: 1,
    meteo: 'soleil',
    argent: DEPART.argent,
    niveauTerrain: 0,
    parcelles,
    graines,
    graineChoisie: null,
    recoltes: compteurs(IDS_CULTURES),
    produits,
    outils: { beche: 1, arrosoir: 1, panier: 1 },
    atelier: false,
    recettes: [],
    decoStock: compteurs(IDS_DECOS),
    decoPosees: [],
  };
}

// --- Ce qui se déduit de l'état ---

export function saisonDuJour(jour: number): Saison {
  return SAISONS[Math.floor((jour - 1) / JOURS_PAR_SAISON) % SAISONS.length];
}

/** Le jour dans la saison : de 1 à 7. */
export function jourDeSaison(jour: number): number {
  return ((jour - 1) % JOURS_PAR_SAISON) + 1;
}

export function annee(jour: number): number {
  return Math.floor((jour - 1) / (JOURS_PAR_SAISON * SAISONS.length)) + 1;
}

export function tailleTerrain(state: GameState): number {
  return TERRAINS[state.niveauTerrain].taille;
}

/** Cette parcelle fait-elle partie du terrain acheté ? */
export function estActive(state: GameState, index: number): boolean {
  const taille = tailleTerrain(state);
  const { col, ligne } = colonneLigne(index);
  return col < taille && ligne < taille;
}

export function parcellesActives(state: GameState): number[] {
  const liste: number[] = [];
  for (let i = 0; i < state.parcelles.length; i++) if (estActive(state, i)) liste.push(i);
  return liste;
}
