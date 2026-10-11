// Les couleurs et la lumière selon la saison, la météo et la nuit.
// C'est ici qu'on règle l'atmosphère du jeu.

import * as THREE from 'three';
import type { Meteo, Saison } from '../game/reglages';

const PALETTES: Record<Saison, { sol: string; soleil: string }> = {
  printemps: { sol: '#a2d67e', soleil: '#fff4d6' },
  ete: { sol: '#8fcb62', soleil: '#fff0c2' },
  automne: { sol: '#bcc06a', soleil: '#ffd9a8' },
  hiver: { sol: '#d3e2d6', soleil: '#eef4ff' },
};

const SOL_NEIGE = new THREE.Color('#f2f7fa');
const SOL_NUIT = new THREE.Color('#3c4a78');
const LUMIERE_NUIT = new THREE.Color('#8fa3ff');
const TEINTE_NUIT = new THREE.Color('#6f7cba');
const TEINTE_PLUIE = new THREE.Color('#c4cfdb');
const BLANC = new THREE.Color('#ffffff');

export interface Ambiance {
  sol: THREE.Color;
  soleilCouleur: THREE.Color;
  soleilIntensite: number;
  cielIntensite: number;
  /** Couleur qui multiplie les images debout (plantes, décorations), qui ne reçoivent pas la lumière. */
  teinte: THREE.Color;
}

export function creerAmbiance(): Ambiance {
  return {
    sol: new THREE.Color(),
    soleilCouleur: new THREE.Color(),
    soleilIntensite: 1,
    cielIntensite: 1,
    teinte: new THREE.Color(),
  };
}

/** Calcule l'ambiance. `nuit` va de 0 (plein jour) à 1 (nuit noire). */
export function calculerAmbiance(a: Ambiance, saison: Saison, meteo: Meteo, nuit: number): void {
  const palette = PALETTES[saison];
  a.sol.set(palette.sol);
  if (meteo === 'neige') a.sol.copy(SOL_NEIGE);
  a.soleilCouleur.set(palette.soleil);
  a.soleilIntensite = 2.3;
  a.cielIntensite = 1.15;
  a.teinte.copy(BLANC);

  if (meteo === 'pluie') {
    a.sol.multiplyScalar(0.88);
    a.soleilIntensite = 1.2;
    a.teinte.copy(TEINTE_PLUIE);
  }
  if (meteo === 'neige') a.soleilIntensite = 1.7;

  a.sol.lerp(SOL_NUIT, nuit * 0.75);
  a.soleilCouleur.lerp(LUMIERE_NUIT, nuit);
  a.soleilIntensite = THREE.MathUtils.lerp(a.soleilIntensite, 0.35, nuit);
  a.cielIntensite = THREE.MathUtils.lerp(a.cielIntensite, 0.5, nuit);
  a.teinte.lerp(TEINTE_NUIT, nuit);
}
