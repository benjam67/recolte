// La géographie de la ferme : où sont le champ, la maison et l'atelier.
// Uniquement des calculs, pas d'affichage.

/** Distance entre deux parcelles voisines. */
export const PAS = 1.1;
/** Le terrain le plus grand fait 6 × 6 : les parcelles sont toujours rangées dans cette grille. */
export const TAILLE_MAX = 6;

// Le champ part du point (0, 0) et s'agrandit vers le bas de l'écran.
export const MAISON = { x: -2.4, z: 0.9, demiX: 1.0, demiZ: 1.1 };
export const PORTE_MAISON = { x: -0.95, z: 0.9 };
export const ATELIER = { x: 0.9, z: -2.4, demiX: 1.2, demiZ: 1.0 };
export const PORTE_ATELIER = { x: 0.9, z: -0.95 };

/** Le chat ne va pas plus loin que ces bords. */
export const BORD_MIN = -4.5;
export function bordMax(taille: number): number {
  return taille * PAS + 2.5;
}

export function indexParcelle(col: number, ligne: number): number {
  return ligne * TAILLE_MAX + col;
}

export function colonneLigne(index: number): { col: number; ligne: number } {
  return { col: index % TAILLE_MAX, ligne: Math.floor(index / TAILLE_MAX) };
}

export function positionParcelle(index: number): { x: number; z: number } {
  const { col, ligne } = colonneLigne(index);
  return { x: PAS / 2 + col * PAS, z: PAS / 2 + ligne * PAS };
}

/** Quelle parcelle se trouve à cet endroit du sol ? null s'il n'y en a pas. */
export function parcelleSous(x: number, z: number, taille: number): number | null {
  const col = Math.floor(x / PAS);
  const ligne = Math.floor(z / PAS);
  if (col < 0 || ligne < 0 || col >= taille || ligne >= taille) return null;
  return indexParcelle(col, ligne);
}

/** Les décorations se posent sur des cases de 1 × 1. Renvoie le centre de la case touchée. */
export function caseDeco(x: number, z: number): { x: number; z: number } {
  return { x: Math.floor(x) + 0.5, z: Math.floor(z) + 0.5 };
}

function dansRectangle(x: number, z: number, r: { x: number; z: number; demiX: number; demiZ: number }, marge: number) {
  return Math.abs(x - r.x) < r.demiX + marge && Math.abs(z - r.z) < r.demiZ + marge;
}

/** Peut-on poser une décoration sur cette case (hors champ, bâtiments et portes) ? */
export function caseConstructible(x: number, z: number, taille: number): boolean {
  const max = bordMax(taille);
  if (x < BORD_MIN || z < BORD_MIN || x > max || z > max) return false;
  const finChamp = taille * PAS + 0.4;
  if (x > -0.4 && z > -0.4 && x < finChamp && z < finChamp) return false;
  if (dansRectangle(x, z, MAISON, 0.4) || dansRectangle(x, z, ATELIER, 0.4)) return false;
  if (Math.hypot(x - PORTE_MAISON.x, z - PORTE_MAISON.z) < 0.9) return false;
  if (Math.hypot(x - PORTE_ATELIER.x, z - PORTE_ATELIER.z) < 0.9) return false;
  return true;
}
